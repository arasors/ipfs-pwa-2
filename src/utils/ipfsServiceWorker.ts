/**
 * IPFS Service Worker Bridge
 * 
 * Bu sınıf, web uygulaması ile IPFS'i arka planda çalıştıran
 * Service Worker arasındaki iletişimi sağlar.
 */

// Event dinleyicileri için tipler
type MessageCallback = (message: any) => void;
type StatusCallback = (status: 'connected' | 'connecting' | 'disconnected') => void;

class IPFSServiceWorker {
  private sw: ServiceWorker | null = null;
  private ready = false;
  private peerId: string | null = null;
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private messageHandlers: Map<string, Set<MessageCallback>> = new Map();
  private statusHandlers: Set<StatusCallback> = new Set();
  private subscribedTopics: Set<string> = new Set();

  constructor() {
    this.init();
  }

  /**
   * Service Worker'ı başlatır
   */
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker desteklenmiyor');
      return;
    }

    try {
      // Service Worker'ı kaydet
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('Service Worker kaydedildi:', registration);

      // Service Worker aktifse, başlangıç mesajı gönder
      if (registration.active) {
        this.sw = registration.active;
        this.sendCommand('init');
      }

      // Aktivasyon durumunu izle
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              this.sw = newWorker;
              this.sendCommand('init');
            }
          });
        }
      });

      // Service Worker'dan gelen mesajları dinle
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);
      
      // Bağlantı durumunu kontrol et
      this.setConnectionStatus('connecting');
      
    } catch (error) {
      console.error('Service Worker kaydı başarısız:', error);
    }
  }

  /**
   * Service Worker'dan gelen mesajları işler
   */
  private handleServiceWorkerMessage = (event: MessageEvent) => {
    const data = event.data;
    
    if (!data || !data.type) return;
    
    console.log('SW mesajı alındı:', data.type);
    
    switch (data.type) {
      case 'ipfs_ready':
        this.ready = true;
        this.peerId = data.peerId;
        this.setConnectionStatus('connected');
        
        // Abone olmak istediğimiz topic'leri yeniden bildir
        this.refreshSubscriptions();
        break;
        
      case 'message':
        // Topic için kayıtlı dinleyicilere mesajı ilet
        if (data.topic) {
          this.notifyMessageHandlers(data.topic, data.message);
        }
        break;
        
      case 'subscription':
        if (data.topic) {
          if (data.subscribed) {
            this.subscribedTopics.add(data.topic);
          } else {
            this.subscribedTopics.delete(data.topic);
          }
        }
        break;
        
      case 'subscriptions':
        // Abone olunan topic'leri güncelle
        this.subscribedTopics = new Set(data.topics);
        break;
        
      case 'publish_result':
        // Yayın sonucu bildirimi geldi, burada özel işlem yapabilirsiniz
        console.log(`Mesaj yayını: ${data.success ? 'Başarılı' : 'Başarısız'}`);
        break;
        
      case 'peer_connection':
        // Peer bağlantı durumu değişti
        console.log(`Peer ${data.peerId} ${data.status}`);
        break;
    }
  }

  /**
   * Bağlantı durumunu günceller ve dinleyicilere bildirir
   */
  private setConnectionStatus(status: 'connected' | 'connecting' | 'disconnected') {
    this.connectionStatus = status;
    
    // Dinleyicilere bildir
    this.statusHandlers.forEach(handler => {
      handler(status);
    });
  }

  /**
   * SW'ye komut gönderir
   */
  private sendCommand(action: string, data?: any) {
    if (!this.sw) {
      console.warn('Service Worker henüz başlatılmadı');
      return;
    }
    
    this.sw.postMessage({
      action,
      ...data
    });
  }

  /**
   * Abone olunan tüm topic'leri yeniden kontrol eder
   */
  private refreshSubscriptions() {
    // SW'den mevcut abonelikleri iste
    this.sendCommand('getSubscriptions');
    
    // Abone olunmasını istediğimiz topic'lere tekrar abone ol
    this.subscribedTopics.forEach(topic => {
      this.subscribe(topic);
    });
  }

  /**
   * Bir topic'e abone olur
   */
  subscribe(topic: string): boolean {
    if (!this.ready) {
      console.warn(`${topic} topic'ine abone olunamadı: IPFS hazır değil`);
      return false;
    }
    
    this.sendCommand('subscribe', { topic });
    this.subscribedTopics.add(topic);
    return true;
  }

  /**
   * Bir topic'ten abone olmayı kaldırır
   */
  unsubscribe(topic: string): boolean {
    if (!this.ready) {
      console.warn(`${topic} topic'inden çıkılamadı: IPFS hazır değil`);
      return false;
    }
    
    this.sendCommand('unsubscribe', { topic });
    this.subscribedTopics.delete(topic);
    return true;
  }

  /**
   * Bir topic'e mesaj yayınlar
   */
  publish(topic: string, message: any): boolean {
    if (!this.ready) {
      console.warn(`${topic} topic'ine mesaj gönderilemedi: IPFS hazır değil`);
      return false;
    }
    
    this.sendCommand('publish', { topic, message });
    return true;
  }

  /**
   * Bir topic için mesaj dinleyicisi ekler
   */
  addMessageHandler(topic: string, callback: MessageCallback): void {
    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, new Set());
    }
    
    this.messageHandlers.get(topic)?.add(callback);
  }

  /**
   * Bir topic için mesaj dinleyicisini kaldırır
   */
  removeMessageHandler(topic: string, callback: MessageCallback): void {
    const handlers = this.messageHandlers.get(topic);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  /**
   * Bağlantı durumu değişikliği için dinleyici ekler
   */
  addStatusHandler(callback: StatusCallback): void {
    this.statusHandlers.add(callback);
  }

  /**
   * Bağlantı durumu değişikliği dinleyicisini kaldırır
   */
  removeStatusHandler(callback: StatusCallback): void {
    this.statusHandlers.delete(callback);
  }

  /**
   * Topic için tüm mesaj dinleyicilerini bilgilendirir
   */
  private notifyMessageHandlers(topic: string, message: any): void {
    const handlers = this.messageHandlers.get(topic);
    if (handlers) {
      handlers.forEach(handler => {
        handler(message);
      });
    }
  }

  /**
   * Peer listesini ister
   */
  requestPeerList(): void {
    this.sendCommand('getPeers');
  }

  /**
   * Bağlantı durumunu döndürür
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionStatus;
  }

  /**
   * PeerID'yi döndürür
   */
  getPeerId(): string | null {
    return this.peerId;
  }

  /**
   * IPFS'in hazır olup olmadığını döndürür
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Abone olunan topic'leri döndürür
   */
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }
}

// Singleton instance oluştur
const ipfsServiceWorker = new IPFSServiceWorker();

export default ipfsServiceWorker; 