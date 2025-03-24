// IPFS Message Service Worker
// Bu service worker, IPFS ile bağlantıyı ve mesaj dinlemeyi arka planda yapar

// Önce standart service worker işlemlerini yapalım
const CACHE_NAME = 'ipfs-pwa-cache-v1';
let heliaNode = null;
let libp2pNode = null;
let jsonHelper = null;
const subscribedTopics = new Set();
const pendingMessages = [];

// Service Worker yükleme olayı
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Yükleniyor');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html'
      ]);
    })
  );
});

// Service Worker aktif olduğunda
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Aktif edildi');
  
  // Eski önbellekleri temizle
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Clientları kontrol et (var olan tüm sekmeler)
      return self.clients.claim();
    })
  );
});

// Main thread'den gelen mesajları dinle
self.addEventListener('message', (event) => {
  const data = event.data;
  
  if (!data || !data.action) return;
  
  console.log('[Service Worker] Main thread\'den mesaj alındı:', data.action);
  
  switch (data.action) {
    case 'init':
      // Main thread'e hazır olduğunu bildir
      broadcastIPFSReady("fake-peer-id-for-now");
      break;
      
    case 'subscribe':
      if (data.topic) {
        console.log(`[Service Worker] Topic'e abone olunuyor: ${data.topic}`);
        broadcastSubscription(data.topic, true);
      }
      break;
      
    case 'unsubscribe':
      if (data.topic) {
        console.log(`[Service Worker] Topic aboneliği kaldırılıyor: ${data.topic}`);
        broadcastSubscription(data.topic, false);
      }
      break;
      
    case 'publish':
      if (data.topic && data.message) {
        console.log(`[Service Worker] Mesaj yayınlanıyor: ${data.topic}`);
        
        // Şimdilik sadece geri bildirim olarak başarılı diyelim
        broadcastPublish(data.topic, data.message.id, true);
        
        // Mesajı da broadcast edelim (gerçek implementasyonda bu pubsub'dan gelecek)
        broadcastMessage(data.topic, data.message);
      }
      break;
      
    case 'getSubscriptions':
      broadcastSubscriptions(Array.from(subscribedTopics));
      break;
      
    case 'getPeers':
      sendPeerList();
      break;
  }
});

// Main thread'e IPFS hazır mesajı gönder
function broadcastIPFSReady(peerId) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'ipfs_ready',
        peerId: peerId
      });
    });
  });
}

// Main thread'e gelen mesajı ilet
function broadcastMessage(topic, message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'message',
        topic: topic,
        message: message
      });
    });
  });
}

// Main thread'e abone olma durumunu bildir
function broadcastSubscription(topic, subscribed) {
  // Abone olduğumuz topic'leri güncelle
  if (subscribed) {
    subscribedTopics.add(topic);
  } else {
    subscribedTopics.delete(topic);
  }
  
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'subscription',
        topic: topic,
        subscribed: subscribed
      });
    });
  });
}

// Main thread'e tüm abonelikleri bildir
function broadcastSubscriptions(topics) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'subscriptions',
        topics: topics
      });
    });
  });
}

// Main thread'e mesaj yayınlama durumunu bildir
function broadcastPublish(topic, messageId, success, error = null) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'publish_result',
        topic: topic,
        messageId: messageId,
        success: success,
        error: error
      });
    });
  });
}

// Main thread'e peer bağlantı durumunu bildir
function broadcastPeerConnection(peerId, status) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'peer_connection',
        peerId: peerId,
        status: status
      });
    });
  });
}

// Bağlı peer listesini gönder
function sendPeerList() {
  const fakePeers = ["peer1", "peer2", "peer3"];
  
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'peer_list',
        peers: fakePeers
      });
    });
  });
}

// Fetch olayında önbellekten yanıt verme
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
}); 