// Churys PC (celular): guarda la app para que abra rápido y sin conexión. Los datos de la cuenta nunca se guardan acá.
const VERSION = 'churys-movil-1';
const ARCHIVOS = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'logo.png', 'icono-180.png', 'icono-192.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// la app: primero la red (así llegan las actualizaciones) y si no hay conexión, lo guardado. Los pedidos a la planilla no pasan por acá.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
