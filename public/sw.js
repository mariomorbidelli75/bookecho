// Service worker minimo: rende Librò installabile come app sul telefono.
// Non salva nulla in cache: ogni richiesta va in rete come sempre.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
