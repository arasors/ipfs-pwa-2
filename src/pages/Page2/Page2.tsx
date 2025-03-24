import { useState, useEffect, useRef } from 'react';
import { 
  Typography, 
  Box, 
  TextField, 
  Button, 
  List, 
  Divider, 
  Grid, 
  IconButton, 
  CircularProgress,
  Chip,
  Drawer,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  InputAdornment
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import ForumIcon from '@mui/icons-material/Forum';
import CloseIcon from '@mui/icons-material/Close';
import { useIPFSServiceWorker } from '../../components/IPFSServiceWorkerProvider';
import { IPFSMessage } from '../../utils/ipfs';
import { v4 as uuidv4 } from 'uuid';

// Sidebar width
const SIDEBAR_WIDTH = 300;

// Ortak grup sohbeti için sabit topic ID
const SPACE_TOPIC_ID = "ipfs-pwa-space";
const SPACE_CHAT_ID = "space-public-chat";

interface Chat {
  id: string;
  participants: string[];
  isPublic?: boolean; // Genel sohbet mi?
  name?: string; // Sohbet adı (opsiyonel)
  lastMessage?: {
    content: string;
    timestamp: number;
  };
}

/**
 * Service Worker tabanlı IPFS mesajlaşma uygulaması
 * 
 * Service Worker'ı mesaj dinleme ve gönderme arayüzü olarak kullanmak:
 * 
 * 1. `public/sw.js` dosyasında Helia ve LibP2P tabanlı bir IPFS client çalışır
 * 2. `utils/ipfsServiceWorker.ts` içinde bu SW ile iletişimi sağlayan bir köprü vardır
 * 3. `components/IPFSServiceWorkerProvider.tsx` React context oluşturur
 * 4. Sayfa SW aracılığıyla mesajları dinler/gönderir
 * 
 * Avantajları:
 * - Arka planda sürekli çalışır, sekme kapalı olsa bile
 * - Daha az bağlantı problemi
 * - Daha stabil mesaj teslimi
 * - Tek bir IPFS node'u kullandığı için kaynak tasarrufu
 * 
 * Ana sayfada kullanımı:
 * - subscribe/unsubscribe: Topic abone olma/çıkma
 * - publish: Mesaj yayınlama
 * - addMessageHandler: Belirli bir topic için mesaj dinleyicisi ekleme
 * - removeMessageHandler: Dinleyiciyi kaldırma
 */

function Page2() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [message, setMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messageEndRef = useRef<null | HTMLDivElement>(null);
  const { isReady, peerId, connectionStatus, subscribe, unsubscribe, publish, addMessageHandler, removeMessageHandler } = useIPFSServiceWorker();
  const [messageIds, setMessageIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<IPFSMessage[]>([]);
  const [notification, setNotification] = useState({ open: false, message: '' });
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);
  
  // Get the current wallet address as our ID
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null;
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentChat]);

  // Her space mesajı geldiğinde otomatik olarak scroll yapalım
  useEffect(() => {
    const currentMessages = getCurrentMessages();
    const lastMessage = currentMessages[currentMessages.length - 1];
    
    // Son mesaj varsa ve Space mesajıysa, otomatik scroll
    if (lastMessage && lastMessage.to === SPACE_TOPIC_ID) {
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [currentChat?.id]);

  // Initialize IPFS and load messages
  useEffect(() => {
    if (isReady && peerId) {
      console.log('IPFS is ready in chat component');
      // When IPFS is ready, set connected to true
      setConnected(true);
      
      // Load chats from localStorage
      const savedChats = localStorage.getItem('ipfs_chats');
      let chatsFromStorage: Chat[] = [];
      
      if (savedChats) {
        chatsFromStorage = JSON.parse(savedChats);
        
        // Space sohbeti var mı kontrol et
        const spaceChat = chatsFromStorage.find(chat => chat.id === SPACE_CHAT_ID);
        
        // Yoksa ekle
        if (!spaceChat) {
          const newSpaceChat: Chat = {
            id: SPACE_CHAT_ID,
            participants: [currentUserId || 'unknown', SPACE_TOPIC_ID],
            isPublic: true,
            name: "Space"
          };
          
          chatsFromStorage.push(newSpaceChat);
          localStorage.setItem('ipfs_chats', JSON.stringify(chatsFromStorage));
        }
        
        setChats(chatsFromStorage);
      } else {
        // Hiç sohbet yoksa Space sohbetini oluştur
        const newSpaceChat: Chat = {
          id: SPACE_CHAT_ID,
          participants: [currentUserId || 'unknown', SPACE_TOPIC_ID],
          isPublic: true,
          name: "Space"
        };
        
        const initialChats = [newSpaceChat];
        setChats(initialChats);
        localStorage.setItem('ipfs_chats', JSON.stringify(initialChats));
      }
      
      // Check if we have saved message IDs in localStorage
      const savedIds = localStorage.getItem('ipfs_message_ids');
      if (savedIds) {
        const ids = JSON.parse(savedIds);
        setMessageIds(ids);
        
        // Load the messages
        loadMessages(ids);
      } else {
        // Make sure we're not in loading state if there are no messages
        setIsLoading(false);
      }
      
      // Subscribe to our personal topic to receive messages
      if (currentUserId) {
        console.log('Attempting to subscribe to personal topic:', currentUserId);
        subscribeToPersonalTopic();
        
        // Also subscribe to all existing chat topics
        if (chatsFromStorage.length > 0) {
          console.log(`Found ${chatsFromStorage.length} existing chats, subscribing to all participants' topics...`);
          
          chatsFromStorage.forEach(chat => {
            const otherParticipant = chat.participants.find(p => p !== currentUserId);
            if (otherParticipant) {
              console.log(`Found chat with participant: ${otherParticipant}, subscribing to their topic`);
              
              // Important fix: Subscribe to the other participant's topic so we can receive their messages
              if (!subscribedTopics.includes(otherParticipant)) {
                console.log(`Subscribing to chat participant topic: ${otherParticipant}`);
                subscribeToChatTopic(otherParticipant);
              }
            }
          });
        }
        
        // Space topic'e abone ol
        subscribeToSpaceTopic();
      } else {
        console.warn('No currentUserId available for subscription');
      }
    }
  }, [isReady, peerId, currentUserId]);

  // Subscribe to our personal topic
  const subscribeToPersonalTopic = async () => {
    if (!currentUserId) {
      console.error('Cannot subscribe: currentUserId is empty');
      return;
    }
    
    try {
      console.log('About to subscribe to personal topic:', currentUserId);
      // ServiceWorker API'sini kullanarak topic'e abone ol
      const success = subscribe(currentUserId);
      
      if (success) {
        console.log(`Subscribed to personal topic: ${currentUserId}`);
        setNotification({ 
          open: true, 
          message: 'Listening for messages on your personal topic' 
        });
        
        // Yeni topic'i dinlemek için mesaj handler'ı ekle
        addMessageHandler(currentUserId, handleIncomingMessage);
        
        // Add to subscribed topics
        setSubscribedTopics(prev => {
          if (prev.includes(currentUserId)) return prev;
          return [...prev, currentUserId];
        });
      } else {
        console.error('Failed to subscribe to personal topic.');
      }
    } catch (error) {
      console.error('Error subscribing to personal topic:', error);
      // Try to resubscribe after a delay
      setTimeout(() => {
        if (isReady && peerId) {
          console.log('Retrying personal topic subscription...');
          subscribeToPersonalTopic();
        }
      }, 5000);
    }
  };
  
  // Get chat topic name by combining participant IDs alphabetically
  const getChatTopic = (participant1: string, participant2: string): string => {
    if (!participant1 || !participant2) {
      console.error('Invalid participants for chat topic', { participant1, participant2 });
      return '';
    }
    
    // Generate a more simplified topic format: 'chat-' followed by first 6 chars of IDs
    const id1 = participant1.substring(0, 6);
    const id2 = participant2.substring(0, 6);
    const ids = [id1, id2].sort();
    const topic = `chat-${ids[0]}-${ids[1]}`;
    
    console.log(`Generated chat topic: ${topic} for participants:`, [participant1, participant2]);
    return topic;
  };
  
  // Subscribe to a chat participant's topic
  const subscribeToChatTopic = async (participantId: string) => {
    if (!currentUserId) {
      console.error('Cannot subscribe: currentUserId is empty');
      return;
    }
    
    // Make sure we're subscribed to our personal topic first
    if (!subscribedTopics.includes(currentUserId)) {
      await subscribeToPersonalTopic();
    }
    
    // Now also subscribe to the other participant's topic
    // This is critical: we need to subscribe to the sender's topic to receive their messages
    try {
      if (!subscribedTopics.includes(participantId)) {
        console.log(`Subscribing to ${participantId}'s topic to receive their messages`);
        
        // ServiceWorker API'sini kullanarak topic'e abone ol
        const success = subscribe(participantId);
        
        if (success) {
          // Add to subscribed topics
          setSubscribedTopics(prev => {
            if (prev.includes(participantId)) return prev;
            return [...prev, participantId];
          });
          
          // Mesaj handler'ı ekle
          addMessageHandler(participantId, handleIncomingMessage);
          
          console.log(`Successfully subscribed to ${participantId}'s topic`);
          setNotification({
            open: true,
            message: `Listening for messages from ${truncateAddress(participantId)}`
          });
        } else {
          console.error(`Failed to subscribe to ${participantId}'s topic`);
        }
      } else {
        console.log(`Already subscribed to ${participantId}'s topic`);
      }
    } catch (error) {
      console.error(`Failed to subscribe to ${participantId}'s topic:`, error);
      
      // Try again after a delay
      setTimeout(() => {
        if (isReady && peerId) {
          console.log(`Retrying subscription to ${participantId}'s topic...`);
          subscribeToChatTopic(participantId);
        }
      }, 5000);
    }
  };
  
  // Helper function to log debug information about the messaging system
  const debugMessage = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
    console.log(`[${timestamp}] ${message}`, data ? data : '');
  };

  // Subscribe to the space topic
  const subscribeToSpaceTopic = async () => {
    try {
      console.log('About to subscribe to space topic:', SPACE_TOPIC_ID);
      // ServiceWorker API'sini kullanarak topic'e abone ol
      const success = subscribe(SPACE_TOPIC_ID);
      
      if (success) {
        console.log(`Subscribed to space topic: ${SPACE_TOPIC_ID}`);
        
        // Mesaj handler'ı ekle
        addMessageHandler(SPACE_TOPIC_ID, handleIncomingMessage);
        
        // Add to subscribed topics
        setSubscribedTopics(prev => {
          if (prev.includes(SPACE_TOPIC_ID)) return prev;
          return [...prev, SPACE_TOPIC_ID];
        });
      } else {
        console.error('Failed to subscribe to space topic.');
      }
    } catch (error) {
      console.error('Error subscribing to space topic:', error);
      // Try to resubscribe after a delay
      setTimeout(() => {
        if (isReady && peerId) {
          console.log('Retrying space topic subscription...');
          subscribeToSpaceTopic();
        }
      }, 5000);
    }
  };

  // Handle incoming message from pubsub
  const handleIncomingMessage = (incomingMessage: IPFSMessage) => {
    debugMessage('Received message via pubsub:', incomingMessage);
    
    // Ignore heartbeat and announcement messages
    if (incomingMessage.type === 'heartbeat' || incomingMessage.type === 'announcement' || incomingMessage.type === 'topic_announcement') {
      console.log('Ignoring system message:', incomingMessage.type);
      return;
    }
    
    // Make sure the message has all required fields for a chat message
    if (!incomingMessage.id || !incomingMessage.from || !incomingMessage.to || !incomingMessage.content) {
      console.error('Received malformed message:', incomingMessage);
      return;
    }
    
    // Check if this is a Space message
    const isSpaceMessage = incomingMessage.to === SPACE_TOPIC_ID;
    
    // Process the message if:
    // 1. We are the sender (our own messages)
    // 2. We are the recipient (messages sent to us)
    // 3. It's a Space message (public)
    
    // Determine if this message is relevant to the current user
    const isFromCurrentUser = incomingMessage.from === currentUserId;
    const isToCurrentUser = incomingMessage.to === currentUserId;
    
    // Log message details for debugging
    debugMessage('Message details:', {
      from: incomingMessage.from,
      currentUserId,
      isFromCurrentUser,
      isToCurrentUser,
      isSpaceMessage,
      content: incomingMessage.content.substring(0, 30)
    });
    
    // If it's neither from us, to us, nor a Space message, ignore
    if (!isFromCurrentUser && !isToCurrentUser && !isSpaceMessage) {
      debugMessage('Message not related to current user or Space, ignoring');
      return;
    }
    
    debugMessage('Processing real chat message:', 
      isSpaceMessage ? 'Space message' : 
      isFromCurrentUser ? 'sent by us' : 'sent to us');
    
    // Add message to our messages array if it's not already there
    setMessages(prevMessages => {
      // Check if message already exists by ID
      const exists = prevMessages.some(msg => msg.id === incomingMessage.id);
      if (exists) {
        debugMessage('Message already exists in state, skipping');
        return prevMessages;
      }
      
      debugMessage('Adding new message to state:', incomingMessage);
      
      // Add the new message and sort by timestamp
      const updatedMessages = [...prevMessages, incomingMessage]
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // Store the message in IPFS, but don't wait for it to complete
      storeMessageAsync(incomingMessage);
      
      return updatedMessages;
    });
    
    // Space mesajı gelirse Space sohbet'i oluştur ve otomatik güncelle
    if (isSpaceMessage) {
      ensureSpaceChatExists();
      
      // Space mesajını Space chat'in son mesajı olarak kaydet
      const spaceChat = chats.find(chat => chat.id === SPACE_CHAT_ID);
      if (spaceChat) {
        const updatedSpaceChat = {
          ...spaceChat,
          lastMessage: {
            content: incomingMessage.content,
            timestamp: incomingMessage.timestamp
          }
        };
        
        const updatedChats = chats.map(chat => 
          chat.id === SPACE_CHAT_ID ? updatedSpaceChat : chat
        );
        
        setChats(updatedChats);
        localStorage.setItem('ipfs_chats', JSON.stringify(updatedChats));
        
        // Eğer şu anda Space sohbeti açıksa, sohbeti güncelle
        if (currentChat?.id === SPACE_CHAT_ID) {
          setCurrentChat(updatedSpaceChat);
        }
      }
    }
    
    // Show notification based on message type
    if (isSpaceMessage && !isFromCurrentUser) {
      setNotification({
        open: true,
        message: `New message in Space from: ${truncateAddress(incomingMessage.from)}`
      });
    } else if (isToCurrentUser && !isFromCurrentUser) {
      setNotification({
        open: true,
        message: `New message from: ${truncateAddress(incomingMessage.from)}`
      });
      
      // Also ensure we have a chat with this sender
      ensureChatExists(incomingMessage.from);
    }
  };
  
  // Mesajı IPFS'e asenkron olarak kaydetme (state güncellemelerini bloklamaz)
  const storeMessageAsync = async (incomingMessage: IPFSMessage) => {
    try {
      debugMessage('Saving message to IPFS storage:', incomingMessage);
      
      // ServiceWorker API üzerinden mesajı sakla
      // Not: SW API'de doğrudan CID dönüşü olmayabilir
      const messageString = JSON.stringify(incomingMessage);
      // Mesajı önbelleğe almak için publish'i kullanıyoruz
      // Bu, mesajın SW tarafından önbelleğe alınmasını sağlar
      publish('message-cache', messageString);
      
      // Mesajı ID ile tanımlayarak takip ediyoruz
      const messageId = incomingMessage.id;
      debugMessage(`Message cached with ID: ${messageId}`);
      
      // Message ID'yi listemize ekleyin
      setMessageIds(prev => {
        // Eğer bu ID zaten varsa eklemeyin
        if (prev.includes(messageId)) return prev;
        
        const updatedIds = [...prev, messageId];
        localStorage.setItem('ipfs_message_ids', JSON.stringify(updatedIds));
        debugMessage(`Added message ID to local storage: ${messageId}`);
        return updatedIds;
      });
      
      // Chat yoksa oluşturun
      ensureChatExists(incomingMessage.from);
      
      // Mesajı alan sohbeti güncelleyin
      const chatToUpdate = chats.find(chat => 
        chat.participants.includes(incomingMessage.from) && 
        chat.participants.includes(incomingMessage.to)
      );
      
      if (chatToUpdate) {
        const updatedChat = {
          ...chatToUpdate,
          lastMessage: {
            content: incomingMessage.content,
            timestamp: incomingMessage.timestamp
          }
        };
        
        // Sohbet listesini güncelleyin
        const updatedChats = chats.map(chat => 
          chat.id === chatToUpdate.id ? updatedChat : chat
        );
        setChats(updatedChats);
        
        // localStorage'a kaydedin
        localStorage.setItem('ipfs_chats', JSON.stringify(updatedChats));
        
        // Bu mesaj mevcut sohbete aitse, mevcut sohbeti güncelleyin
        if (currentChat && currentChat.id === chatToUpdate.id) {
          setCurrentChat(updatedChat);
        }
      }
    } catch (err) {
      console.error('Error storing incoming message in IPFS:', err);
    }
  };
  
  // Make sure we have a chat for this sender
  const ensureChatExists = (senderId: string) => {
    // Check if we already have a chat with this user
    const existingChat = chats.find(chat => 
      chat.participants.includes(senderId) && 
      chat.participants.includes(currentUserId || '')
    );
    
    if (!existingChat && senderId !== currentUserId) {
      // Create new chat
      const newChat: Chat = {
        id: uuidv4(),
        participants: [currentUserId || '', senderId],
      };
      
      const updatedChats = [...chats, newChat];
      setChats(updatedChats);
      localStorage.setItem('ipfs_chats', JSON.stringify(updatedChats));
    }
  };
  
  // Load messages from IPFS by their CIDs or IDs
  const loadMessages = async (ids: string[]) => {
    if (!ids.length) {
      // If no messages to load, make sure loading state is disabled
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // ServiceWorker kullanımında doğrudan messages'ı kullanıyoruz
      // SW, mesajları zaten önbelleğe aldı, bu nedenle
      // Sadece eşleşen ID'leri filtreleyerek alıyoruz
      
      // Hali hazırda önbellekteki tüm mesajları almanın
      // bir API'si olmadığından, buradaki messages state'inden
      // eşleşen ID'leri filtreliyoruz
      
      // Not: Gerçek bir uygulamada, SW ile mesajları almak için
      // bir API eklememiz gerekebilir
      
      const validMessages = messages
        .filter(msg => ids.includes(msg.id))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setMessages(validMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to a recipient
  const handleConnect = () => {
    if (!recipientId) return;
    
    // Create a new chat with the recipient
    const newChat: Chat = {
      id: uuidv4(),
      participants: [currentUserId || 'unknown', recipientId],
    };
    
    // Update chats
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    localStorage.setItem('ipfs_chats', JSON.stringify(updatedChats));
    
    // Set as current chat
    setCurrentChat(newChat);
    setConnected(true);
    
    // Subscribe to the chat topic
    subscribeToChatTopic(recipientId);
    
    // Close mobile sidebar if open
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  // Track sending state separate from general loading
  const [isSending, setIsSending] = useState(false);
  
  // Update combined loading state for send button
  useEffect(() => {
    if (isSending) {
      setIsLoading(true);
    }
  }, [isSending]);
  
  // Make sure we have the Space chat in the list
  const ensureSpaceChatExists = () => {
    // Check if we already have a Space chat
    const existingSpaceChat = chats.find(chat => chat.id === SPACE_CHAT_ID);
    
    if (!existingSpaceChat) {
      // Create new Space chat
      const newSpaceChat: Chat = {
        id: SPACE_CHAT_ID,
        participants: [currentUserId || 'unknown', SPACE_TOPIC_ID],
        isPublic: true,
        name: "Space"
      };
      
      const updatedChats = [...chats, newSpaceChat];
      setChats(updatedChats);
      localStorage.setItem('ipfs_chats', JSON.stringify(updatedChats));
    }
  };
  
  // Modified send message function
  const handleSendMessage = async (e?: React.FormEvent) => {
    // Form submit event'i varsa önle
    if (e) e.preventDefault();
    
    if (!message.trim() || !currentChat || !isReady) return;
    
    // Block sending if already sending a message
    if (isSending) return;
    
    setIsSending(true);
    
    try {
      // Check if this is a Space message
      const isSpaceMessage = currentChat.id === SPACE_CHAT_ID;
      
      // Get the other participant's ID (or Space topic ID for Space chat)
      const otherParticipant = isSpaceMessage 
        ? SPACE_TOPIC_ID 
        : currentChat.participants.find(p => p !== currentUserId);
        
      if (!otherParticipant) {
        throw new Error('Could not find recipient ID in current chat');
      }
      
      // Generate a unique message ID
      const messageId = uuidv4();
      
      // Create message object
      const ipfsMessage: IPFSMessage = {
        id: messageId,
        from: currentUserId || 'unknown',
        to: otherParticipant,
        content: message,
        timestamp: Date.now(),
        type: 'chat' // Explicitly set type as chat message
      };
      
      debugMessage(`Sending message to ${isSpaceMessage ? 'Space' : otherParticipant}`, ipfsMessage);
      
      // Check if we already have this message (by content) to prevent duplicates
      const isDuplicate = messages.some(msg => 
        msg.from === ipfsMessage.from && 
        msg.to === ipfsMessage.to && 
        msg.content === ipfsMessage.content &&
        // Allow duplicate content if more than 1 minute has passed
        Math.abs(msg.timestamp - ipfsMessage.timestamp) < 60000
      );
      
      if (isDuplicate) {
        debugMessage('Duplicate message detected, not sending again');
        setIsSending(false);
        return;
      }
      
      // Store message in IPFS (for persistence) BEFORE updating the local state
      // This is important as it ensures the message is stored and pinned first
      try {
        // ServiceWorker API üzerinden mesajı sakla
        const messageString = JSON.stringify(ipfsMessage);
        // Mesajı önbelleğe almak için publish'i kullanıyoruz
        publish('message-cache', messageString);
        debugMessage(`Message cached with ID: ${ipfsMessage.id}`);
        
        // Save ID to our list of messages
        setMessageIds(prev => {
          if (prev.includes(ipfsMessage.id)) return prev;
          
          const updatedIds = [...prev, ipfsMessage.id];
          localStorage.setItem('ipfs_message_ids', JSON.stringify(updatedIds));
          return updatedIds;
        });
      } catch (storeErr) {
        console.error('Error caching message:', storeErr);
        // Continue anyway to try publishing it
      }
      
      // For direct messages, make sure we're subscribed to the recipient's topic for replies
      if (!isSpaceMessage && !subscribedTopics.includes(otherParticipant)) {
        debugMessage(`Not subscribed to ${otherParticipant}'s topic yet, subscribing now...`);
        await subscribeToChatTopic(otherParticipant);
      }
      
      // Now update messages in the UI to provide instant feedback
      setMessages(prev => [...prev, ipfsMessage].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
      
      // Publish message to the appropriate topic
      let publishSuccess = false;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Send to recipient's topic using ServiceWorker publish API
          debugMessage(`Publishing message attempt ${attempt + 1}/3 to ${isSpaceMessage ? 'Space topic' : otherParticipant + "'s topic"}`);
          const messageString = JSON.stringify(ipfsMessage);
          
          // ServiceWorker API üzerinden yayınla
          if (isSpaceMessage) {
            publish(SPACE_TOPIC_ID, messageString);
          } else {
            publish(otherParticipant, messageString);
          }
          
          publishSuccess = true;
          debugMessage(`Message published successfully to ${isSpaceMessage ? 'Space topic' : otherParticipant + "'s topic"}`);
          break; // Exit the loop on success
        } catch (err) {
          console.error(`Failed to publish to ${isSpaceMessage ? 'Space topic' : 'recipient\'s topic ' + otherParticipant} (attempt ${attempt + 1}/3):`, err);
          
          if (attempt < 2) {
            // Wait with exponential backoff before retrying
            const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
            debugMessage(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!publishSuccess) {
        console.warn(`Message stored in IPFS but could not be published via pubsub to ${isSpaceMessage ? 'Space' : otherParticipant}`);
        setNotification({
          open: true,
          message: `Message saved but delivery to ${isSpaceMessage ? 'Space' : 'recipient'} not confirmed.`
        });
      } else {
        // If published successfully, show confirmation
        setNotification({
          open: true,
          message: `Message sent successfully to ${isSpaceMessage ? 'Space' : truncateAddress(otherParticipant)}`
        });
      }
      
      // Update current chat with last message
      if (currentChat) {
        const updatedChat = {
          ...currentChat,
          lastMessage: {
            content: message,
            timestamp: Date.now()
          }
        };
        
        // Update chats list
        const updatedChats = chats.map(chat => 
          chat.id === currentChat.id ? updatedChat : chat
        );
        setChats(updatedChats);
        
        // ÖNEMLİ: Space chat sohbeti resetlenmemesi için burayı düzeltiyoruz
        // Mevcut sohbeti doğrudan güncelleyelim ama değiştirmeyelim
        setCurrentChat(updatedChat);
        
        // Save to localStorage
        localStorage.setItem('ipfs_chats', JSON.stringify(updatedChats));
      }
      
      // Clear the input
      setMessage('');
      debugMessage('Message sending process completed');
    } catch (error) {
      console.error('Error sending message:', error);
      setNotification({
        open: true,
        message: 'Failed to send message. Please try again.'
      });
    } finally {
      // Always set sending to false, regardless of success or failure
      setIsSending(false);
    }
  };

  // Copy ID to clipboard
  const copyIdToClipboard = () => {
    if (!currentUserId) return;
    
    navigator.clipboard.writeText(currentUserId);
    setNotification({
      open: true,
      message: 'Your ID has been copied to clipboard!'
    });
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };
  
  // Helper to truncate long addresses
  const truncateAddress = (address: string) => {
    if (!address) return '';
    
    if (address.length <= 16) return address;
    
    const start = address.substring(0, 8);
    const end = address.substring(address.length - 8);
    
    return `${start}...${end}`;
  };
  
  // Get recipient address from chat
  const getRecipientAddress = (chat: Chat) => {
    if (!chat) return '';
    
    // Space sohbeti için özel görüntüleme
    if (chat.isPublic && chat.name) {
      return chat.name;
    }
    
    if (!chat.participants) return '';
    const recipient = chat.participants.find(p => p !== currentUserId);
    return truncateAddress(recipient || '');
  };
  
  // Format message time
  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format last message time
  const formatLastMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If the message is from today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If the message is from this week
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const options: Intl.DateTimeFormatOptions = { weekday: 'short' };
      return date.toLocaleDateString(undefined, options);
    }
    
    // Otherwise show the date
    return date.toLocaleDateString();
  };
  
  // Subscribe to a chat when selected, using a ref to prevent excessive subscribes
  const lastSubscribedChat = useRef<string | null>(null);
  
  useEffect(() => {
    if (currentChat && currentUserId) {
      const otherParticipant = currentChat.participants.find(p => p !== currentUserId);
      if (otherParticipant) {
        // Create a unique ID for this chat
        const chatId = getChatTopic(currentUserId, otherParticipant);
        
        // Only subscribe if we haven't already subscribed to this chat
        if (lastSubscribedChat.current !== chatId) {
          subscribeToChatTopic(otherParticipant);
          lastSubscribedChat.current = chatId;
        }
      }
    }
  }, [currentChat?.id, currentUserId]);
  
  // Get current messages for the selected chat
  const getCurrentMessages = () => {
    if (!currentChat) return [];
    
    // Space sohbeti için özel filtreleme
    if (currentChat.id === SPACE_CHAT_ID) {
      // Tüm Space mesajlarını göster
      const spaceMessages = messages.filter(msg => 
        msg.to === SPACE_TOPIC_ID
      ).sort((a, b) => a.timestamp - b.timestamp);
      
      debugMessage(`Space sohbeti için ${spaceMessages.length} mesaj bulundu`);
      return spaceMessages;
    }
    
    // Normal sohbetler için filtreleme
    // Find the other participant's ID
    const otherParticipant = currentChat.participants.find(p => p !== currentUserId);
    if (!otherParticipant) return [];
    
    // Ensure we're subscribed to our personal topic
    if (currentUserId && !subscribedTopics.includes(currentUserId)) {
      subscribeToPersonalTopic();
    }
    
    // Filter messages for the current conversation
    return messages.filter(msg => {
      // Include messages between the current user and the other participant
      return (
        (msg.from === currentUserId && msg.to === otherParticipant) ||
        (msg.from === otherParticipant && msg.to === currentUserId)
      );
    }).sort((a, b) => a.timestamp - b.timestamp);
  };
  
  // Sort chats by last message time
  const sortedChats = [...chats].sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime; // newest first
  });
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Render the sidebar
  const renderSidebar = () => (
    <Box sx={{ 
      width: isMobile ? '100%' : SIDEBAR_WIDTH, 
      height: '100%',
      borderRight: `1px solid ${theme.palette.divider}`,
      overflowY: 'auto',
      bgcolor: 'background.paper'
    }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6">Chat</Typography>
        {isMobile && (
          <IconButton 
            sx={{ position: 'absolute', right: 8, top: 8 }}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      
      <Box sx={{ p: 2 }}>
        <Button 
          variant="outlined" 
          color="primary" 
          fullWidth 
          sx={{ mb: 2 }}
          onClick={copyIdToClipboard}
          startIcon={<FileCopyIcon />}
        >
          Copy My ID
        </Button>
        
        <Box sx={{ display: 'flex', mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Enter recipient ID"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={!recipientId || isLoading}
          >
            Chat
          </Button>
        </Box>
      </Box>
      
      <Divider />
      
      <List sx={{ p: 0 }}>
        {sortedChats.map(chat => {
          const isSelected = currentChat?.id === chat.id;
          const isSpaceChat = chat.id === SPACE_CHAT_ID;
          
          return (
            <Box 
              key={chat.id}
              sx={{ 
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: isSelected ? 'action.selected' : 'inherit',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Button
                fullWidth
                onClick={() => {
                  setCurrentChat(chat);
                  // If we have a recipient in the chat, set it
                  const recipient = chat.participants.find(p => p !== currentUserId);
                  if (recipient) setRecipientId(recipient);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                sx={{ 
                  py: 2, 
                  px: 2, 
                  justifyContent: 'flex-start', 
                  textAlign: 'left', 
                  borderRadius: 0,
                  color: 'text.primary'
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography 
                      variant="subtitle2" 
                      noWrap 
                      sx={{ 
                        flex: 1,
                        // Space sohbeti için özel stil
                        color: isSpaceChat ? 'primary.main' : 'inherit',
                        fontWeight: isSpaceChat ? 'bold' : 'inherit'
                      }}
                    >
                      {getRecipientAddress(chat)}
                      {isSpaceChat && (
                        <Chip 
                          label="Public" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                          sx={{ ml: 1, height: '18px', fontSize: '0.6rem' }}
                        />
                      )}
                    </Typography>
                    {chat.lastMessage && (
                      <Typography variant="caption" color="text.secondary">
                        {formatLastMessageTime(chat.lastMessage.timestamp)}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {chat.lastMessage?.content || 'No messages yet'}
                  </Typography>
                </Box>
              </Button>
            </Box>
          );
        })}
      </List>
    </Box>
  );
  
  // Ensure that loading state is reset when component mounts
  useEffect(() => {
    // Reset loading state when component is mounted
    setIsLoading(false);
  }, []);
  
  // Ensure that loading state is reset when currentChat changes
  useEffect(() => {
    // Reset loading state when current chat changes
    setIsLoading(false);
  }, [currentChat]);
  
  // The current messages to display
  const currentMessages = getCurrentMessages();
  
  // Update connected state based on connectionStatus from IPFSProvider
  useEffect(() => {
    setConnected(connectionStatus === 'connected');
    
    // Show connection status changes to the user
    if (connectionStatus === 'connected') {
      setNotification({
        open: true,
        message: 'Connected to IPFS network'
      });
    } else if (connectionStatus === 'connecting') {
      setNotification({
        open: true,
        message: 'Connecting to IPFS network...'
      });
    } else if (connectionStatus === 'disconnected') {
      setNotification({
        open: true,
        message: 'Disconnected from IPFS network. Reconnecting...'
      });
    }
  }, [connectionStatus]);
  
  return (
    <Box sx={{ 
      display: 'flex', 
      height: 'calc(100vh - 64px)',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      {/* Mobile sidebar as drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          sx={{ zIndex: theme.zIndex.appBar - 1 }}
        >
          {renderSidebar()}
        </Drawer>
      )}
      
      {/* Desktop sidebar */}
      {!isMobile && renderSidebar()}
      
      {/* Main chat area */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column', 
        flex: 1,
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Chat header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {isMobile && (
            <IconButton sx={{ mr: 1 }} onClick={() => setMobileSidebarOpen(true)}>
              <ForumIcon />
            </IconButton>
          )}
          
          <Typography variant="h6">
            {currentChat ? getRecipientAddress(currentChat) : 'No Chat Selected'}
          </Typography>
          
          {currentChat && currentUserId && (
            <Chip 
              label={`My ID: ${truncateAddress(currentUserId)}`}
              size="small" 
              color="primary" 
              variant="outlined"
              sx={{ ml: 2 }} 
            />
          )}
          
          {!connected && (
            <Chip 
              label={connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'} 
              size="small" 
              color={connectionStatus === 'connecting' ? 'warning' : 'error'} 
              sx={{ ml: 2 }} 
            />
          )}
          
          {connected && (
            <Chip 
              label="Connected" 
              size="small" 
              color="success" 
              sx={{ ml: 2 }} 
            />
          )}
          
          {subscribedTopics.length > 0 && currentChat && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, width: '100%' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1, alignSelf: 'center' }}>
                Subscribed topics:
              </Typography>
              {subscribedTopics.map(topic => {
                const isOtherParticipant = currentChat.participants.includes(topic) && topic !== currentUserId;
                return (
                  <Chip 
                    key={topic}
                    label={isOtherParticipant ? `${truncateAddress(topic)} (recipient)` : truncateAddress(topic)}
                    size="small" 
                    color={isOtherParticipant ? 'success' : 'default'} 
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: '24px' }} 
                  />
                );
              })}
            </Box>
          )}
          
          {isSyncing && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption">Syncing</Typography>
            </Box>
          )}
        </Box>
        
        {/* Messages area */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {(!connected || !currentChat) ? (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center',
              color: 'text.secondary'
            }}>
              <ForumIcon sx={{ fontSize: 64, mb: 2, opacity: 0.6 }} />
              <Typography variant="h6">
                {!connected ? 'Not Connected to IPFS' : 'Select or Start a Chat'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', maxWidth: 400 }}>
                {!connected 
                  ? 'Waiting for IPFS connection...' 
                  : 'Enter a recipient ID and click "Chat" to start a conversation'}
              </Typography>
            </Box>
          ) : (
            <>
              {currentMessages.length === 0 ? (
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  color: 'text.secondary'
                }}>
                  <Typography variant="body1">No messages yet</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Send a message to start the conversation
                  </Typography>
                </Box>
              ) : (
                currentMessages.map((msg, index) => {
                  const isCurrentUser = msg.from === currentUserId;
                  
                  return (
                    <Box
                      key={msg.id || index}
                      sx={{
                        display: 'flex',
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                        mb: 2
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '75%',
                          minWidth: '100px',
                          bgcolor: isCurrentUser ? 'primary.main' : 'background.paper',
                          color: isCurrentUser ? 'primary.contrastText' : 'text.primary',
                          borderRadius: 2,
                          p: 2,
                          boxShadow: 1
                        }}
                      >
                        <Typography variant="body1">{msg.content}</Typography>
                        <Typography 
                          variant="caption" 
                          display="block" 
                          sx={{ 
                            mt: 1, 
                            textAlign: 'right',
                            opacity: 0.7
                          }}
                        >
                          {formatMessageTime(msg.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </>
          )}
        </Box>
        
        {/* Message input area */}
        <Box position="fixed" bottom={0} left={SIDEBAR_WIDTH} right={0} zIndex={1000} px={2} py={1} bgcolor="background.paper" borderTop={`1px solid ${theme.palette.divider}`}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {currentChat && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mr: 1 }}>
                  {currentChat.id === SPACE_CHAT_ID ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography color="primary" fontWeight="bold">
                        Space Chat
                      </Typography>
                      <Chip 
                        label="Public" 
                        size="small" 
                        color="success" 
                        variant="outlined"
                        sx={{ ml: 1, height: '18px', fontSize: '0.6rem' }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        (visible to all users)
                      </Typography>
                    </Box>
                  ) : (
                    <>To: {getRecipientAddress(currentChat)}</>
                  )}
                </Typography>
              </Box>
            )}
          </Box>
          <form onSubmit={handleSendMessage}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={currentChat?.id === SPACE_CHAT_ID ? "Send message to everyone..." : "Type a message..."}
                size="small"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!connected || !currentChat || isSending}
                multiline
                maxRows={4}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!message.trim() || !connected || !currentChat || isSending}
                sx={{ height: '100%' }}
              >
                {isSending ? <CircularProgress size={24} /> : <SendIcon />}
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
      
      {/* Notification snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity="info" 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Page2;
