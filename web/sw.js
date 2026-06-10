/* ============================================
   Service Worker — 离线缓存
   ============================================ */

const CACHE_NAME = 'price-calc-v5';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/storage.js',
    './js/brands.js',
    './js/calculator.js',
    './js/app.js',
    './manifest.json',
];

// 安装：预缓存静态资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cached =>
            cached || fetch(event.request).then(response => {
                // 缓存成功的网络请求
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
        )
    );
});
