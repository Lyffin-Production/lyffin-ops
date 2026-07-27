const CACHE = 'lyffin-ops-v1785165307';
const FILES = [
  '/login.html',
  '/dashboard.html',
  '/production.html',
  '/qc.html',
  '/admin.html',
  '/capacity.html',
  '/project.html',
  '/account.html',
  '/share.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });