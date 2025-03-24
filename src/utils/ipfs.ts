import { createHelia } from 'helia';
import { strings } from '@helia/strings';
import { json } from '@helia/json';
import { unixfs } from '@helia/unixfs';
import { MemoryBlockstore } from 'blockstore-core/memory';
import { MemoryDatastore } from 'datastore-core/memory';
import { CID } from 'multiformats/cid';
import { createLibp2p } from 'libp2p';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { mplex } from '@libp2p/mplex';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { noise } from '@chainsafe/libp2p-noise';

// Types for our IPFS operations
export interface IPFSMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type?: 'chat' | 'heartbeat' | 'announcement' | 'topic_announcement';
}

// Global variable to hold the Helia node
let heliaNode: any = null;
let libp2pNode: any = null;

// List of bootstrap peers for the network
const bootstrapList = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
  // Add more bootstrap nodes for better connectivity
  '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
  '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
];

// Keep track of message handlers we've registered
const messageHandlers: { [topic: string]: EventListener } = {};

/**
 * Creates a libp2p node with pubsub support
 */
const createLibp2pNode = async () => {
  if (libp2pNode) return libp2pNode;
  
  try {
    libp2pNode = await createLibp2p({
      addresses: {
        listen: [
          '/webrtc'
        ]
      },
      transports: [
        webSockets(),
        webRTC({
          rtcConfiguration: {
            iceServers: [
              { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }
            ]
          }
        }),
        circuitRelayTransport()
      ],
      streamMuxers: [
        // @ts-ignore
        mplex()
      ],
      connectionEncrypters: [
        noise()
      ],
      peerDiscovery: [
        // @ts-ignore
        bootstrap({
          list: bootstrapList,
          timeout: 3000
        })
      ],
      services: {
        identify: identify(),
        pubsub: gossipsub({
          allowPublishToZeroTopicPeers: true,
          emitSelf: true,
          fallbackToFloodsub: true,
          canRelayMessage: true,
          directPeers: [], // Connect directly to known peers
          scoreParams: {
            // Make it easier to relay messages
            behaviourPenaltyWeight: 0,
            behaviourPenaltyDecay: 0
          }
        })
      },
      connectionManager: {
        maxConnections: 50
      }
    });
    
    // Ensure pubsub service is available and started
    if (!libp2pNode.services || !libp2pNode.services.pubsub) {
      console.error('Pubsub service not found after libp2p initialization');
      
      // Manually add pubsub service if missing
      if (!libp2pNode.services) {
        libp2pNode.services = {};
      }
      
      if (!libp2pNode.services.pubsub) {
        console.log('Manually adding pubsub service');
        libp2pNode.services.pubsub = gossipsub({
          allowPublishToZeroTopicPeers: true,
          emitSelf: true,
          fallbackToFloodsub: true,
          canRelayMessage: true,
          scoreParams: {
            // Make it easier to relay messages
            behaviourPenaltyWeight: 0,
            behaviourPenaltyDecay: 0
          }
        });
        
        // Start the manually added service
        await libp2pNode.services.pubsub.start();
      }
    } else {
      // Start pubsub service explicitly if it exists
      try {
        await libp2pNode.services.pubsub.start();
        console.log('Pubsub service started');
      } catch (err) {
        console.error('Error starting pubsub service:', err);
      }
    }
    
    // Log connection events for debugging
    libp2pNode.addEventListener('peer:connect', (evt: any) => {
      const peerId = evt.detail.toString();
      console.log('Connected to peer:', peerId);
      
      // Force refresh subscriptions with new peers
      refreshSubscriptionsWithPeer(peerId);
      
      // When we connect to a peer, refresh our subscriptions to make sure they're aware
      setTimeout(async () => {
        try {
          const pubsub = libp2pNode.services.pubsub;
          if (pubsub) {
            const topics = await pubsub.getTopics();
            console.log(`Refreshing ${topics.length} topic subscriptions after peer connection`);
            
            // For each topic, resubscribe to ensure the new peer knows about it
            for (const topic of topics) {
              try {
                // Don't unsubscribe first, just verify subscription
                if (!(await isSubscribed(topic))) {
                  await pubsub.subscribe(topic);
                  console.log(`Refreshed subscription to topic: ${topic}`);
                } else {
                  console.log(`Already subscribed to topic: ${topic}`);
                }
              } catch (err) {
                console.error(`Failed to refresh subscription to topic ${topic}:`, err);
              }
            }
          }
        } catch (err) {
          console.error('Error refreshing subscriptions after peer connection:', err);
        }
      }, 2000); // Wait a bit for the connection to stabilize
    });
    
    libp2pNode.addEventListener('peer:disconnect', (evt: any) => {
      console.log('Disconnected from peer:', evt.detail.toString());
    });
    
    await libp2pNode.start();
    console.log('Libp2p node created with PeerID:', libp2pNode.peerId.toString());
    
    // Regularly refresh subscriptions to maintain connectivity
    setInterval(async () => {
      try {
        await refreshAllSubscriptions();
      } catch (err) {
        console.error('Error in subscription refresh interval:', err);
      }
    }, 30000); // Every 30 seconds
    
    return libp2pNode;
  } catch (error) {
    console.error('Error creating libp2p node:', error);
    throw error;
  }
};

/**
 * Creates and returns a Helia IPFS node
 */
export const createHeliaNode = async () => {
  if (heliaNode) return heliaNode;
  
  try {
    const blockstore = new MemoryBlockstore();
    const datastore = new MemoryDatastore();
    
    // Create libp2p node first
    const libp2p = await createLibp2pNode();
    if (!libp2p) throw new Error('Failed to create libp2p node');

    heliaNode = await createHelia({
      blockstore,
      datastore,
      libp2p
    });
    
    console.log('Helia node created successfully');
    return heliaNode;
  } catch (error) {
    console.error('Failed to create Helia node:', error);
    return null;
  }
};

/**
 * Get the Helia string utility for working with string content
 */
export const getStringHelper = async () => {
  const helia = await createHeliaNode();
  if (!helia) return null;
  return strings(helia);
};

/**
 * Get the Helia JSON utility for working with JSON content
 */
export const getJsonHelper = async () => {
  const helia = await createHeliaNode();
  if (!helia) return null;
  return json(helia);
};

/**
 * Get the Helia UnixFS utility for working with files
 */
export const getUnixFsHelper = async () => {
  const helia = await createHeliaNode();
  if (!helia) return null;
  return unixfs(helia);
};

/**
 * Get the libp2p node for pubsub functionality
 */
export const getLibp2p = async () => {
  const helia = await createHeliaNode();
  if (!helia) return null;
  
  const libp2p = helia.libp2p;
  
  // Make sure pubsub is defined and initialized
  if (!libp2p.services || !libp2p.services.pubsub) {
    console.error('Pubsub service not available on libp2p node');
    
    // Try to create and add pubsub service if missing
    try {
      if (!libp2p.services) {
        libp2p.services = {};
      }
      
      if (!libp2p.services.pubsub) {
        console.log('Adding missing pubsub service');
        libp2p.services.pubsub = gossipsub({
          allowPublishToZeroTopicPeers: true,
          emitSelf: true,
          fallbackToFloodsub: true,
          canRelayMessage: true
        });
        
        // Start the service
        await libp2p.services.pubsub.start();
        console.log('Started missing pubsub service');
      }
    } catch (err) {
      console.error('Failed to add and start pubsub service:', err);
    }
  }
  
  return libp2p;
};

/**
 * Store a message in IPFS and pin it to ensure persistence
 * @param message The message to store
 * @returns The CID of the stored message
 */
export const storeMessage = async (message: IPFSMessage): Promise<string> => {
  try {
    const jsonHelp = await getJsonHelper();
    if (!jsonHelp) throw new Error('JSON helper not available');
    
    // Store the message in IPFS
    const cid = await jsonHelp.add(message);
    console.log(`Message stored with CID: ${cid.toString()}`);
    
    // Pin the message to ensure it persists
    try {
      const helia = await createHeliaNode();
      if (helia && helia.pins) {
        await helia.pins.add(cid);
        console.log(`Message with CID ${cid.toString()} has been pinned`);
      } else {
        console.warn('Pins API not available, message might not persist');
      }
    } catch (pinErr) {
      console.error('Error pinning message:', pinErr);
      // Continue even if pinning fails, the message is still stored
    }
    
    return cid.toString();
  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  }
};

/**
 * Retrieve a message from IPFS by its CID
 * @param cidString The CID of the message to retrieve
 * @returns The retrieved message
 */
export const retrieveMessage = async (cidString: string): Promise<IPFSMessage> => {
  try {
    // Wait for IPFS to be ready
    const jsonHelp = await getJsonHelper();
    if (!jsonHelp) throw new Error('JSON helper not available');
    
    // Try to parse the CID
    let cid;
    try {
      cid = CID.parse(cidString);
    } catch (err) {
      throw new Error(`Invalid CID format: ${cidString}`);
    }
    
    // Implement retry logic with exponential backoff
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Retrieving message attempt ${attempt + 1}/${maxRetries} for CID: ${cidString}`);
        
        // Try to get the message from IPFS
        const message = await jsonHelp.get(cid);
        
        if (!message) {
          throw new Error('Retrieved empty message');
        }
        
        console.log(`Successfully retrieved message for CID: ${cidString}`);
        
        // Verify that the message has the required fields
        const typedMessage = message as any;
        if (!typedMessage.id || !typedMessage.from || !typedMessage.to || !typedMessage.content) {
          console.warn('Retrieved message is missing required fields:', message);
          // Still return it, but log a warning
        }
        
        // If message retrieval is successful, try to pin it to ensure we keep it
        try {
          const helia = await createHeliaNode();
          if (helia && helia.pins) {
            await helia.pins.add(cid);
            console.log(`Retrieved message with CID ${cidString} has been pinned`);
          }
        } catch (pinErr) {
          console.warn('Failed to pin retrieved message:', pinErr);
          // Continue anyway, we already have the message
        }
        
        return message as IPFSMessage;
      } catch (err) {
        console.warn(`Error retrieving message on attempt ${attempt + 1}:`, err);
        lastError = err;
        
        if (attempt < maxRetries - 1) {
          // Wait with exponential backoff before retrying
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, etc.
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we've exhausted all retries, throw the last error
    throw lastError || new Error(`Failed to retrieve message after ${maxRetries} attempts`);
  } catch (error) {
    console.error('Error retrieving message:', error);
    throw error;
  }
};

/**
 * Subscribe to a topic for receiving messages
 * @param topic The topic to subscribe to (usually a simplified topic ID)
 * @param callback Function to call when a message is received
 */
export const subscribeToMessages = async (topic: string, callback: (message: IPFSMessage) => void) => {
  try {
    const libp2p = await getLibp2p();
    if (!libp2p) throw new Error('Libp2p not available');
    
    // Verify pubsub is available
    if (!libp2p.services || !libp2p.services.pubsub) {
      throw new Error('Pubsub not available on libp2p node');
    }
    
    // Reference to pubsub service
    const pubsub = libp2p.services.pubsub;
    
    // Make sure topic is a string
    const safeTopic = String(topic);
    
    console.log(`Attempting to subscribe to topic: ${safeTopic}`);
    
    // Remove any existing handler for this topic first to prevent duplicates
    if (messageHandlers[safeTopic]) {
      console.log(`Removing existing handler for topic: ${safeTopic}`);
      pubsub.removeEventListener('message', messageHandlers[safeTopic]);
      delete messageHandlers[safeTopic];
    }
    
    // Create new message handler function
    const messageHandler = (event: any) => {
      // Debug log all message events for troubleshooting
      console.log(`Message event received for topic: ${event.detail.topic}`);
      
      if (event.detail.topic === safeTopic) {
        try {
          // Decode and parse the message
          const messageText = new TextDecoder().decode(event.detail.data);
          console.log(`Message for topic ${safeTopic} received:`, messageText.substring(0, 100));
          
          try {
            const messageData = JSON.parse(messageText);
            console.log('Parsed message data:', messageData);
            
            // Check if message has required fields before passing to callback
            if (messageData && typeof messageData === 'object') {
              callback(messageData);
            } else {
              console.error('Invalid message format, not an object:', messageData);
            }
          } catch (parseErr) {
            console.error('JSON parse error for message:', parseErr);
            console.log('Raw message that failed to parse:', messageText);
          }
        } catch (err) {
          console.error('Error decoding message:', err);
        }
      }
    };
    
    // Store the handler for future removal
    messageHandlers[safeTopic] = messageHandler;
    
    // Add the listener before subscribing to ensure we don't miss messages
    pubsub.addEventListener('message', messageHandler);
    console.log(`Added message handler for topic: ${safeTopic}`);
    
    // Subscribe to the topic with retry logic
    let subscribed = false;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!subscribed && retryCount < maxRetries) {
      try {
        // Check if already subscribed first
        const topics = await pubsub.getTopics();
        
        if (topics.includes(safeTopic)) {
          console.log(`Already subscribed to topic: ${safeTopic}`);
          subscribed = true;
          break;
        }
        
        // Not subscribed yet, so subscribe
        await pubsub.subscribe(safeTopic);
        console.log(`Successfully subscribed to topic: ${safeTopic}`);
        subscribed = true;
        
        // Send a heartbeat message to make our subscription known to other peers
        try {
          const heartbeat = {
            id: `heartbeat-${Date.now()}`,
            from: libp2p.peerId.toString(),
            to: 'network',
            content: `Heartbeat for ${safeTopic}`,
            timestamp: Date.now(),
            type: 'heartbeat'
          };
          
          const heartbeatData = new TextEncoder().encode(JSON.stringify(heartbeat));
          await pubsub.publish(safeTopic, heartbeatData);
          console.log(`Published heartbeat to topic: ${safeTopic}`);
        } catch (heartbeatErr) {
          console.warn('Error publishing heartbeat, continuing anyway:', heartbeatErr);
        }
      } catch (err) {
        console.warn(`Failed to subscribe to topic (attempt ${retryCount + 1}/${maxRetries}):`, err);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error(`Failed to subscribe after ${maxRetries} attempts`);
          // Don't throw - we'll keep the event listener and retry subscription later
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Set up a periodic heartbeat to keep the connection alive
    const heartbeatInterval = setInterval(async () => {
      try {
        // Verify we're still subscribed
        const topics = await pubsub.getTopics();
        if (!topics.includes(safeTopic)) {
          console.log(`Lost subscription to ${safeTopic}, resubscribing...`);
          await pubsub.subscribe(safeTopic);
        }
        
        // Send heartbeat
        const heartbeat = {
          id: `heartbeat-${Date.now()}`,
          from: libp2p.peerId.toString(),
          to: 'network',
          content: `Heartbeat for ${safeTopic}`,
          timestamp: Date.now(),
          type: 'heartbeat'
        };
        
        const heartbeatData = new TextEncoder().encode(JSON.stringify(heartbeat));
        await pubsub.publish(safeTopic, heartbeatData);
        console.log(`Published heartbeat to topic: ${safeTopic}`);
      } catch (err) {
        console.warn('Heartbeat error:', err);
      }
    }, 30000); // Every 30 seconds
    
    // Store the interval ID to clear it if needed
    (messageHandlers[safeTopic] as any).heartbeatInterval = heartbeatInterval;
    
    console.log(`Subscription to topic ${safeTopic} complete`);
  } catch (error) {
    console.error('Error subscribing to messages:', error);
    throw error;
  }
};

/**
 * Publish a message to a topic
 * @param topic The topic to publish to (usually a simplified topic ID generated from participants)
 * @param message The message to send
 */
export const publishMessage = async (topic: string, message: IPFSMessage) => {
  try {
    const libp2p = await getLibp2p();
    if (!libp2p) throw new Error('Libp2p not available');
    
    // Verify pubsub is available
    if (!libp2p.services || !libp2p.services.pubsub) {
      throw new Error('Pubsub not available on libp2p node');
    }
    
    // Reference to pubsub service
    const pubsub = libp2p.services.pubsub;
    
    // Make sure topic is a string and correctly formatted
    let safeTopic = String(topic);
    
    // Log the topic we're publishing to
    console.log(`Publishing to topic: ${safeTopic}`);
    
    // Set message type to chat if not specified
    if (!message.type) {
      message.type = 'chat';
    }
    
    console.log(`Preparing to publish ${message.type} message to topic: ${safeTopic}`);
    
    // First ensure we're subscribed to this topic ourselves, as publishers must be subscribed
    let isSubscribed = false;
    try {
      const topics = await pubsub.getTopics();
      isSubscribed = topics.includes(safeTopic);
      
      if (!isSubscribed) {
        console.log(`Not subscribed to ${safeTopic} yet, subscribing now...`);
        await pubsub.subscribe(safeTopic);
        console.log(`Subscribed to topic before publishing: ${safeTopic}`);
        
        // Simple message handler just for receiving our own messages
        const messageHandler = (event: any) => {
          if (event.detail.topic === safeTopic) {
            console.log(`Received message on publisher topic ${safeTopic}`);
          }
        };
        
        // Add the listener only if we weren't subscribed before
        pubsub.addEventListener('message', messageHandler);
        messageHandlers[safeTopic] = messageHandler;
        
        // Give the network a moment to propagate our subscription
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.warn('Error checking topic subscription, will try to publish anyway:', err);
      try {
        await pubsub.subscribe(safeTopic);
      } catch (subscribeErr) {
        console.error('Failed to subscribe before publishing:', subscribeErr);
      }
    }
    
    // Get all connected peers
    const connectedPeers = libp2p.getPeers();
    console.log(`Currently connected to ${connectedPeers.length} peers`);
    
    // Encode message to Uint8Array
    const messageData = new TextEncoder().encode(JSON.stringify(message));
    
    // Try to get subscribers for this topic
    let topicPeers: any[] = [];
    try {
      topicPeers = await pubsub.getSubscribers(safeTopic);
      console.log(`Found ${topicPeers.length} peers subscribed to topic ${safeTopic}`);
    } catch (err) {
      console.warn(`Error getting subscribers for ${safeTopic}:`, err);
    }
    
    // If we have fewer than 3 connected peers, try to wait for more connections
    if (connectedPeers.length < 3) {
      console.log(`Only ${connectedPeers.length} peers connected, waiting for more...`);
      
      // Send a pre-announcement to all known peers about our topic
      try {
        const announcement = new TextEncoder().encode(JSON.stringify({
          id: `topic_announcement-${Date.now()}`,
          from: libp2p.peerId.toString(),
          to: 'everyone',
          content: `Topic announcement for ${safeTopic}`,
          timestamp: Date.now(),
          topic: safeTopic,
          type: 'topic_announcement'
        }));
        
        // If we know any peers, publish to global topic to bootstrap
        const globalTopic = 'ipfs-pwa-global';
        try {
          if (!isSubscribed) {
            await pubsub.subscribe(globalTopic);
          }
          await pubsub.publish(globalTopic, announcement);
          console.log(`Published topic announcement to global topic`);
        } catch (announceErr) {
          console.warn('Error publishing global announcement:', announceErr);
        }
      } catch (annErr) {
        console.warn('Error creating announcement:', annErr);
      }
      
      // Wait a moment to see if we get more peers
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check again after waiting
      try {
        topicPeers = await pubsub.getSubscribers(safeTopic);
        console.log(`After waiting, found ${topicPeers.length} peers for topic ${safeTopic}`);
      } catch (err) {
        console.warn(`Error getting subscribers after waiting:`, err);
      }
    }
    
    // Try multiple publish attempts with exponential backoff
    let publishSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!publishSuccess && retryCount < maxRetries) {
      try {
        // Publish message to the topic
        await pubsub.publish(safeTopic, messageData);
        console.log(`Published message #${retryCount + 1} to topic: ${safeTopic}`);
        publishSuccess = true;
      } catch (err) {
        console.error(`Error publishing to topic ${safeTopic} (attempt ${retryCount + 1}/${maxRetries}):`, err);
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Wait a bit before retrying
          const delay = 1000 * Math.pow(2, retryCount);
          console.log(`Waiting ${delay}ms before retry #${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!publishSuccess) {
      throw new Error(`Failed to publish message after ${maxRetries} attempts`);
    }
    
    // Also process the message locally for our own UI
    const localEvent = {
      detail: {
        topic: safeTopic, 
        data: messageData
      }
    };
    
    // Manually dispatch event to trigger our own handlers
    pubsub.dispatchEvent(new CustomEvent('message', localEvent));
    
    // Send the message directly to known topic subscribers as a backup
    if (topicPeers.length > 0) {
      try {
        // Create a direct message
        const directMessage = {
          ...message,
          directDelivery: true  // Mark as a direct delivery attempt
        };
        
        const directData = new TextEncoder().encode(JSON.stringify(directMessage));
        
        // Try to send to each known peer
        for (const peer of topicPeers) {
          try {
            if (peer.toString() !== libp2p.peerId.toString()) {
              // For now, just log that we would do this
              console.log(`Would send direct message to peer: ${peer.toString()}`);
              // Direct messaging would be implemented here with libp2p's direct send capabilities
            }
          } catch (peerErr) {
            console.warn(`Error with direct send to peer ${peer}:`, peerErr);
          }
        }
      } catch (directErr) {
        console.warn('Error attempting direct message sending:', directErr);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error publishing message:', error);
    throw error;
  }
};

/**
 * Get the peer ID of the current node
 */
export const getPeerId = async (): Promise<string> => {
  try {
    const libp2p = await getLibp2p();
    if (!libp2p) throw new Error('Libp2p not available');
    
    return libp2p.peerId.toString();
  } catch (error) {
    console.error('Error getting peer ID:', error);
    throw error;
  }
};

// Refresh all current topic subscriptions
const refreshAllSubscriptions = async () => {
  try {
    const libp2p = await getLibp2p();
    if (!libp2p || !libp2p.services || !libp2p.services.pubsub) return;
    
    const pubsub = libp2p.services.pubsub;
    const topics = await pubsub.getTopics();
    
    console.log(`Periodic refresh of ${topics.length} subscriptions`);
    
    // For each topic, ensure we're still subscribed and advertise to the network
    for (const topic of topics) {
      try {
        // Verify subscription
        if (!(await isSubscribed(topic))) {
          await pubsub.subscribe(topic);
          console.log(`Re-subscribed to topic: ${topic}`);
        }
        
        // Report our subscription to connected peers
        const peers = libp2p.getPeers();
        console.log(`Notifying ${peers.length} peers about topic: ${topic}`);
        
        // Publish a small heartbeat message to keep the topic active
        const heartbeat = new TextEncoder().encode(JSON.stringify({
          id: `heartbeat-${Date.now()}`,
          from: libp2p.peerId.toString(),
          to: 'everyone',
          content: 'heartbeat',
          timestamp: Date.now(),
          topic: topic,
          type: 'heartbeat'
        }));
        
        await pubsub.publish(topic, heartbeat);
        console.log(`Published heartbeat to topic: ${topic}`);
      } catch (err) {
        console.error(`Error refreshing topic ${topic}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in refreshAllSubscriptions:', err);
  }
};

// Helper to check if we're subscribed to a topic
const isSubscribed = async (topic: string): Promise<boolean> => {
  try {
    const libp2p = await getLibp2p();
    if (!libp2p || !libp2p.services || !libp2p.services.pubsub) return false;
    
    const topics = await libp2p.services.pubsub.getTopics();
    return topics.includes(topic);
  } catch (err) {
    console.error('Error checking subscription status:', err);
    return false;
  }
};

// Force synchronize topic subscriptions with a specific peer
const refreshSubscriptionsWithPeer = async (peerId: string) => {
  try {
    const libp2p = await getLibp2p();
    if (!libp2p || !libp2p.services || !libp2p.services.pubsub) return;
    
    const pubsub = libp2p.services.pubsub;
    const topics = await pubsub.getTopics();
    
    if (topics.length === 0) {
      console.log('No topics to refresh with peer');
      return;
    }
    
    console.log(`Refreshing ${topics.length} topics with peer ${peerId}`);
    
    // For each topic, ensure the peer knows about our subscription
    for (const topic of topics) {
      try {
        // Check if peer is subscribed to this topic
        const subscribers = await pubsub.getSubscribers(topic);
        const isPeerSubscribed = subscribers.some(
          (p: any) => p.toString() === peerId
        );
        
        console.log(`Topic ${topic} - peer subscribed: ${isPeerSubscribed}`);
        
        // If the peer isn't subscribed, publish a message to make our subscription known
        if (!isPeerSubscribed) {
          const announcement = new TextEncoder().encode(JSON.stringify({
            id: `announcement-${Date.now()}`,
            from: libp2p.peerId.toString(),
            to: peerId,
            content: 'subscription announcement',
            timestamp: Date.now(),
            topic: topic,
            type: 'announcement'
          }));
          
          await pubsub.publish(topic, announcement);
          console.log(`Published announcement to topic ${topic} for peer ${peerId}`);
        }
      } catch (err) {
        console.error(`Error refreshing topic ${topic} with peer ${peerId}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in refreshSubscriptionsWithPeer:', err);
  }
};
