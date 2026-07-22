const CACHE = 'lyffin-ops-v1784710390';
const FILES = [
  '/lyffin-ops/login.html',
  '/lyffin-ops/dashboard.html',
  '/lyffin-ops/production.html',
  '/lyffin-ops/qc.html',
  '/lyffin-ops/admin.html',
  '/lyffin-ops/capacity.html',
  '/lyffin-ops/project.html',
  '/lyffin-ops/account.html',
  '/lyffin-ops/share.html',
  '/lyffin-ops/manifest.json',
  '/lyffin-ops/icon-192.png',
  '/lyffin-ops/icon-512.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });