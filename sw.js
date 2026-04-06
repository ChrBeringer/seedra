/**
 * Seedra v1.0 - Service Worker
 * Ermöglicht Offline-Funktionalität und Caching
 */

const CACHE_NAME = 'seedra-v1-cache';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './seedra_algorithms_v1.js',
    'https://cdn.tailwindcss.com'
];

// 1. Install-Event: Ressourcen in den Cache laden
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Seedra: Caching Assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Activate-Event: Alte Caches aufräumen
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Seedra: Clearing old Cache...');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. Fetch-Event: Ressourcen vom Cache oder Netzwerk laden
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Cache-Hit: Resource zurückgeben, ansonsten Netzwerk-Request
            return response || fetch(event.request);
        })
    );
});