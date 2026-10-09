// Speichert die App auf dem Gerät, damit sie auch offline startet.
const CACHE = 'rechner-v5';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Schriften: einmal laden, danach aus dem Speicher
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request);
      if(hit) return hit;
      try { const r = await fetch(e.request); c.put(e.request, r.clone()); return r; } catch(_) { return new Response('', {status:504}); }
    }));
    return;
  }
  if(url.origin !== location.origin) return;
  // App-Dateien: zuerst aus dem Speicher, im Hintergrund aktualisieren
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch:true}) || (e.request.mode === 'navigate' ? await c.match('./index.html') : null);
    const net = fetch(e.request).then(r => { if(r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || new Response('Offline', {status:503});
  }));
});
