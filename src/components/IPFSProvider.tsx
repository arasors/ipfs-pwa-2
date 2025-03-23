import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createHeliaNode, getJsonHelper, getStringHelper, getUnixFsHelper } from '@/utils/ipfs';

// Create context for IPFS
interface IPFSContextType {
  ipfs: any;
  isReady: boolean;
  stringHelper: any;
  jsonHelper: any;
  unixFsHelper: any;
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

  useEffect(() => {
    let isMounted = true;

    const initIPFS = async () => {
      try {
        // Initialize IPFS node
        const node = await createHeliaNode();
        if (!node || !isMounted) return;
        
        setIpfs(node);
        
        // Initialize helpers
        const strHelper = await getStringHelper();
        const jsonHelp = await getJsonHelper();
        const fsHelper = await getUnixFsHelper();
        
        if (!isMounted) return;
        
        setStringHelper(strHelper);
        setJsonHelper(jsonHelp);
        setUnixFsHelper(fsHelper);
        setIsReady(true);
        
        console.log('IPFS initialized successfully');
      } catch (error) {
        console.error('Failed to initialize IPFS:', error);
      }
    };

    initIPFS();

    return () => {
      isMounted = false;
    };
  }, []);

  // If IPFS is not ready yet, show fallback
  if (!isReady) {
    return <>{fallback}</>;
  }

  return (
    <IPFSContext.Provider value={{ ipfs, isReady, stringHelper, jsonHelper, unixFsHelper }}>
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