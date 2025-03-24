import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// Event log entry types
export type LogEntryType = 
  | 'subscription' // Topic'e abone olma/ayrılma
  | 'message' // Mesaj alındı/gönderildi
  | 'connection' // Bağlantı olayları
  | 'peer' // Peer bağlantıları
  | 'error'; // Hatalar

// Log entry interface
export interface LogEntry {
  id: string;
  type: LogEntryType;
  message: string;
  timestamp: number;
  data?: any; // Topic ID, message ID gibi ekstra bilgiler
}

// Topic subscription info
export interface TopicInfo {
  id: string;
  name?: string;
  subscribedAt: number;
  isPublic?: boolean;
  messageCount: number;
  lastActivity?: number;
  participants: Set<string>;
}

// Event log store interface
interface EventLogState {
  // State
  entries: LogEntry[];
  topics: Record<string, TopicInfo>;
  activeTopics: string[];
  maxEntries: number;
  autoClean: boolean;
  
  // Actions
  addLogEntry: (type: LogEntryType, message: string, data?: any) => string;
  addMessageEvent: (topicId: string, from: string, to: string, messageId: string) => void;
  addSubscriptionEvent: (topicId: string, isSubscribed: boolean) => void;
  addConnectionEvent: (status: string, details?: string) => void;
  addPeerEvent: (peerId: string, action: 'connected' | 'disconnected') => void;
  addErrorEvent: (message: string, details?: any) => void;
  
  // Topic tracking
  trackTopic: (topicId: string, name?: string, isPublic?: boolean) => void;
  untrackTopic: (topicId: string) => void;
  addParticipantToTopic: (topicId: string, participantId: string) => void;
  setActiveTopics: (topicIds: string[]) => void;
  
  // Helpers
  clearLogs: () => void;
  getLogsByType: (type: LogEntryType) => LogEntry[];
  getLogsByTopic: (topicId: string) => LogEntry[];
  getTopicInfo: (topicId: string) => TopicInfo | undefined;
  getActiveTopicEntries: () => LogEntry[];
  setMaxEntries: (max: number) => void;
  setAutoClean: (autoClean: boolean) => void;
}

export const useEventLog = create<EventLogState>()(
  persist(
    (set, get) => ({
      entries: [],
      topics: {},
      activeTopics: [],
      maxEntries: 200, // Saklanacak maksimum log sayısı
      autoClean: true, // Otomatik temizleme açık/kapalı
      
      addLogEntry: (type, message, data) => {
        const id = uuidv4();
        const newEntry: LogEntry = {
          id,
          type,
          message,
          timestamp: Date.now(),
          data
        };
        
        set((state) => {
          let newEntries = [newEntry, ...state.entries];
          
          // Otomatik temizleme etkinse ve maksimum girdi sayısı aşıldıysa
          if (state.autoClean && newEntries.length > state.maxEntries) {
            newEntries = newEntries.slice(0, state.maxEntries);
          }
          
          return { entries: newEntries };
        });
        
        return id;
      },
      
      addMessageEvent: (topicId, from, to, messageId) => {
        // İlgili topic'i takip etmeye başla
        get().trackTopic(topicId);
        
        // Gönderen kişiyi topic'e ekle
        get().addParticipantToTopic(topicId, from);
        
        // Log mesajı oluştur
        const logMessage = `Message ${messageId.substring(0, 8)} | From: ${from.substring(0, 8)} | To Topic: ${topicId.substring(0, 8)}`;
        
        // Log'a ekle
        const entryId = get().addLogEntry('message', logMessage, {
          topicId,
          from,
          to,
          messageId
        });
        
        // Topic bilgisini güncelle
        set((state) => {
          const topic = state.topics[topicId] || {
            id: topicId,
            subscribedAt: Date.now(),
            messageCount: 0,
            participants: new Set<string>()
          };
          
          return {
            topics: {
              ...state.topics,
              [topicId]: {
                ...topic,
                messageCount: topic.messageCount + 1,
                lastActivity: Date.now()
              }
            }
          };
        });
        
        return entryId;
      },
      
      addSubscriptionEvent: (topicId, isSubscribed) => {
        // Topic'i takip et
        if (isSubscribed) {
          get().trackTopic(topicId);
        }
        
        const action = isSubscribed ? 'Subscribed to' : 'Unsubscribed from';
        const logMessage = `${action} topic ${topicId.substring(0, 12)}`;
        
        // Log'a ekle
        return get().addLogEntry('subscription', logMessage, {
          topicId,
          isSubscribed
        });
      },
      
      addConnectionEvent: (status, details) => {
        const logMessage = `Connection status: ${status}${details ? ` - ${details}` : ''}`;
        
        // Log'a ekle
        return get().addLogEntry('connection', logMessage, {
          status,
          details
        });
      },
      
      addPeerEvent: (peerId, action) => {
        const logMessage = `Peer ${peerId.substring(0, 8)} ${action}`;
        
        // Log'a ekle
        return get().addLogEntry('peer', logMessage, {
          peerId,
          action
        });
      },
      
      addErrorEvent: (message, details) => {
        // Log'a ekle
        return get().addLogEntry('error', message, details);
      },
      
      trackTopic: (topicId, name, isPublic) => {
        set((state) => {
          // Eğer topic zaten varsa, sadece güncelle
          if (state.topics[topicId]) {
            return {
              topics: {
                ...state.topics,
                [topicId]: {
                  ...state.topics[topicId],
                  name: name || state.topics[topicId].name,
                  isPublic: isPublic !== undefined ? isPublic : state.topics[topicId].isPublic
                }
              }
            };
          }
          
          // Yeni topic oluştur
          return {
            topics: {
              ...state.topics,
              [topicId]: {
                id: topicId,
                name,
                isPublic,
                subscribedAt: Date.now(),
                messageCount: 0,
                participants: new Set<string>()
              }
            }
          };
        });
      },
      
      untrackTopic: (topicId) => {
        set((state) => {
          const newTopics = { ...state.topics };
          delete newTopics[topicId];
          
          return { topics: newTopics };
        });
      },
      
      addParticipantToTopic: (topicId, participantId) => {
        set((state) => {
          // Eğer topic yoksa, oluştur
          const topic = state.topics[topicId] || {
            id: topicId,
            subscribedAt: Date.now(),
            messageCount: 0,
            participants: new Set<string>()
          };
          
          // Katılımcıyı ekle
          const updatedParticipants = new Set(topic.participants);
          updatedParticipants.add(participantId);
          
          return {
            topics: {
              ...state.topics,
              [topicId]: {
                ...topic,
                participants: updatedParticipants
              }
            }
          };
        });
      },
      
      setActiveTopics: (topicIds) => {
        set({ activeTopics: topicIds });
      },
      
      clearLogs: () => {
        set({ entries: [] });
      },
      
      getLogsByType: (type) => {
        return get().entries.filter(entry => entry.type === type);
      },
      
      getLogsByTopic: (topicId) => {
        return get().entries.filter(entry => 
          (entry.data?.topicId === topicId) || 
          (entry.type === 'subscription' && entry.data?.topicId === topicId)
        );
      },
      
      getTopicInfo: (topicId) => {
        return get().topics[topicId];
      },
      
      getActiveTopicEntries: () => {
        const { activeTopics, entries } = get();
        
        if (activeTopics.length === 0) {
          return entries;
        }
        
        return entries.filter(entry => 
          entry.data?.topicId && activeTopics.includes(entry.data.topicId)
        );
      },
      
      setMaxEntries: (max) => {
        set({ maxEntries: max });
        
        // Mevcut girişleri temizle
        if (get().autoClean) {
          set((state) => ({
            entries: state.entries.slice(0, max)
          }));
        }
      },
      
      setAutoClean: (autoClean) => {
        set({ autoClean });
      }
    }),
    {
      name: 'ipfs-event-log',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Sadece belirli alanları kalıcı olarak depola
        maxEntries: state.maxEntries,
        autoClean: state.autoClean,
        activeTopics: state.activeTopics
      })
    }
  )
); 