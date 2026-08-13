// Deri Sevkiyat — güncellemeleri hemen alan service worker
// index.html DAİMA ağdan çekilir (network-first), böylece GitHub'daki değişiklik
// uygulamada anında görünür. Ağ yoksa önbellekteki son sürüm açılır.
const CACHE = 'deri-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting(); // yeni sürümü beklemeden devreye al
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./index.html'])).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase/CDN → doğrudan ağ

  // Sayfa/HTML istekleri: ÖNCE AĞ, olmazsa önbellek (güncelleme hemen görünür)
  const htmlIstegi = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (htmlIstegi) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const kopya = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', kopya)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Diğer kendi dosyalarımız (ikon vb.): önbellek → ağ
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const kopya = res.clone();
      caches.open(CACHE).then(c => c.put(req, kopya)).catch(() => {});
      return res;
    }))
  );
});
