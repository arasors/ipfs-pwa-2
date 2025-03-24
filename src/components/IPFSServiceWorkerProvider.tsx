import React, { createContext, useContext, useEffect, useState } from 'react';
import ipfsServiceWorker from '../utils/ipfsServiceWorker';

// Context type tanımı
interface IPFSServiceWorkerContextType {
  isReady: boolean;
  peerId: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  subscribe: (topic: string) => boolean;
  unsubscribe: (topic: string) => boolean;
  publish: (topic: string, message: any) => boolean;
  addMessageHandler: (topic: string, callback: (message: any) => void) => void;
  removeMessageHandler: (topic: string, callback: (message: any) => void) => void;
  subscribedTopics: string[];
}

// Context oluştur
const IPFSServiceWorkerContext = createContext<IPFSServiceWorkerContextType | null>(null);

// Provider component props
interface IPFSServiceWorkerProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Provider component
export const IPFSServiceWorkerProvider: React.FC<IPFSServiceWorkerProviderProps> = ({ 
  children, 
  fallback = <div>IPFS yükleniyor...</div> 
}) => {
  const [isReady, setIsReady] = useState<boolean>(ipfsServiceWorker.isReady());
  const [peerId, setPeerId] = useState<string | null>(ipfsServiceWorker.getPeerId());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    ipfsServiceWorker.getConnectionStatus()
  );
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>(
    ipfsServiceWorker.getSubscribedTopics()
  );

  // Status değişikliklerini dinle
  useEffect(() => {
    const statusHandler = (status: 'connected' | 'connecting' | 'disconnected') => {
      setConnectionStatus(status);
      
      // Bağlantı kurulduğunda
      if (status === 'connected') {
        setIsReady(true);
        setPeerId(ipfsServiceWorker.getPeerId());
      } else {
        setIsReady(false);
      }
    };
    
    // Status handler ekle
    ipfsServiceWorker.addStatusHandler(statusHandler);
    
    // Temizlik
    return () => {
      ipfsServiceWorker.removeStatusHandler(statusHandler);
    };
  }, []);
  
  // Abone olunan topic'leri düzenli olarak güncelle
  useEffect(() => {
    const updateSubscriptions = () => {
      setSubscribedTopics(ipfsServiceWorker.getSubscribedTopics());
    };
    
    // Başlangıçta ve her 5 saniyede bir güncelle
    updateSubscriptions();
    const interval = setInterval(updateSubscriptions, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Context değeri
  const contextValue: IPFSServiceWorkerContextType = {
    isReady,
    peerId,
    connectionStatus,
    subscribe: ipfsServiceWorker.subscribe.bind(ipfsServiceWorker),
    unsubscribe: ipfsServiceWorker.unsubscribe.bind(ipfsServiceWorker),
    publish: ipfsServiceWorker.publish.bind(ipfsServiceWorker),
    addMessageHandler: ipfsServiceWorker.addMessageHandler.bind(ipfsServiceWorker),
    removeMessageHandler: ipfsServiceWorker.removeMessageHandler.bind(ipfsServiceWorker),
    subscribedTopics
  };

  // IPFS hazır değilse fallback göster
  if (!isReady && connectionStatus !== 'connected') {
    return <>{fallback}</>;
  }

  return (
    <IPFSServiceWorkerContext.Provider value={contextValue}>
      {children}
    </IPFSServiceWorkerContext.Provider>
  );
};

// Custom hook
export const useIPFSServiceWorker = () => {
  const context = useContext(IPFSServiceWorkerContext);
  
  if (!context) {
    throw new Error('useIPFSServiceWorker hook must be used within IPFSServiceWorkerProvider');
  }
  
  return context;
}; 