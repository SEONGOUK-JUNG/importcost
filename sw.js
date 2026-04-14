const CACHE_NAME = 'importcost-v1.0.0';
const RATE_CACHE = 'importcost-rates-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 설치
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 활성화 - 구버전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== RATE_CACHE)
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 환율 API 프록시 URL (Cloudflare Worker)
const RATE_API = 'https://importcost-rates.YOUR_WORKER.workers.dev/rates';

// fetch 전략
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 환율 API — Network First, 실패 시 캐시
  if (url.pathname.includes('/rates') || url.hostname.includes('er-api')) {
    e.respondWith(networkFirstRate(e.request));
    return;
  }

  // 정적 파일 — Cache First
  if (e.request.method === 'GET') {
    e.respondWith(cacheFirst(e.request));
  }
});

async function networkFirstRate(req) {
  try {
    const res = await fetch(req, { timeout: 5000 });
    const cache = await caches.open(RATE_CACHE);
    cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response(JSON.stringify({
      error: 'offline',
      rates: { KRW: 1374, CNY: 7.23, EUR: 0.917, JPY: 151.2 }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('오프라인 상태입니다.', { status: 503 });
  }
}

// 백그라운드 환율 갱신 (하루 1회)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'rate-update') {
    e.waitUntil(updateRates());
  }
});

async function updateRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    const cache = await caches.open(RATE_CACHE);
    cache.put('rates', new Response(JSON.stringify(data)));
    // 클라이언트에 갱신 알림
    const clients = await self.clients.matchAll();
    clients.forEach(c => c.postMessage({ type: 'RATE_UPDATED', data }));
  } catch(e) {
    console.warn('환율 갱신 실패:', e);
  }
}
