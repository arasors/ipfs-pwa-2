import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createHeliaNode, getJsonHelper, getStringHelper, getUnixFsHelper, getPeerId } from '@/utils/ipfs';

// Create context for IPFS
interface IPFSContextType {
  ipfs: any;
  isReady: boolean;
  stringHelper: any;
  jsonHelper: any;
  unixFsHelper: any;
  peerId: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

const IPFSContext = createContext<IPFSContextType | null>(null);

interface IPFSProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const IPFSProvider = ({ children, fallback = null }: IPFSProviderProps) => {
  const [ipfs, setIpfs] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [stringHelper, setStringHelper] = useState<any>(null);
  const [jsonHelper, setJsonHelper] = useState<any>(null);
  const [unixFsHelper, setUnixFsHelper] = useState<any>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [connectionCheckInterval, setConnectionCheckInterval] = useState<any>(null);

  // Initialize IPFS node
  useEffect(() => {
    let isMounted = true;

    const initIPFS = async () => {
      try {
        console.log('Initializing IPFS node...');
        setConnectionStatus('connecting');
        
        // Initialize IPFS node
        const node = await createHeliaNode();
        if (!node || !isMounted) return;
        
        setIpfs(node);
        
        // Initialize helpers
        const strHelper = await getStringHelper();
        const jsonHelp = await getJsonHelper();
        const fsHelper = await getUnixFsHelper();
        
        // Get peer ID
        const id = await getPeerId();
        
        if (!isMounted) return;
        
        setStringHelper(strHelper);
        setJsonHelper(jsonHelp);
        setUnixFsHelper(fsHelper);
        setPeerId(id);
        setIsReady(true);
        setConnectionStatus('connected');
        
        console.log('IPFS initialized successfully with peer ID:', id);
        
        // Store the peer ID in localStorage for easy access
        localStorage.setItem('peerId', id);
        
        // If we don't have a wallet address yet, use the peer ID as a fallback
        if (!localStorage.getItem('walletAddress')) {
          localStorage.setItem('walletAddress', id);
        }
        
        // Set up connection health check
        const interval = setInterval(checkConnectionHealth, 30000); // Check every 30 seconds
        setConnectionCheckInterval(interval);
      } catch (error) {
        console.error('Failed to initialize IPFS:', error);
        if (isMounted) {
          setConnectionStatus('disconnected');
          
          // Try to reconnect after a delay
          setTimeout(initIPFS, 5000);
        }
      }
    };
    
    // Function to check IPFS node connection health
    const checkConnectionHealth = async () => {
      if (!ipfs || !ipfs.libp2p) return;
      
      try {
        // Check if we have any connected peers
        const peers = ipfs.libp2p.getPeers();
        console.log(`Connection health check: ${peers.length} peers connected`);
        
        if (peers.length === 0) {
          console.warn('No peers connected, connection may be unstable');
          
          // Try to trigger some network activity to reconnect
          const id = await getPeerId();
          console.log('Refreshed peer ID:', id);
          
          // If still no peers after a check, mark as potentially disconnected
          setTimeout(async () => {
            const currentPeers = ipfs.libp2p.getPeers();
            if (currentPeers.length === 0) {
              console.warn('Still no peers connected after refresh attempt');
              setConnectionStatus('disconnected');
              
              // Try to reinitialize the connection
              try {
                console.log('Attempting to restart IPFS connection...');
                await ipfs.libp2p.start();
                setConnectionStatus('connected');
              } catch (err) {
                console.error('Failed to restart IPFS connection:', err);
              }
            } else {
              setConnectionStatus('connected');
            }
          }, 5000);
        } else {
          // We have peers, mark as connected
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('Error checking connection health:', err);
        setConnectionStatus('disconnected');
      }
    };

    initIPFS();

    return () => {
      isMounted = false;
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
    };
  }, []);

  // If IPFS is not ready yet, show fallback
  if (!isReady) {
    return <>{fallback}</>;
  }

  return (
    <IPFSContext.Provider value={{ 
      ipfs, 
      isReady, 
      stringHelper, 
      jsonHelper, 
      unixFsHelper, 
      peerId,
      connectionStatus 
    }}>
      {children}
    </IPFSContext.Provider>
  );
};

// Custom hook to use IPFS context
export const useIPFS = () => {
  const context = useContext(IPFSContext);
  
  if (!context) {
    throw new Error('useIPFS must be used within an IPFSProvider');
  }
  
  return context;
}; 