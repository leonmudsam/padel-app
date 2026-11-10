const SW_FASSUNG = '2026.11.10.6537bfcc';
const SEITE = 'kicker-seite-' + SW_FASSUNG;
const FREMD = 'kicker-fremd';
const FREMDE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SEITE)
    .then(t => t.addAll([self.registration.scope, 'icon.png']))
    .catch(() => {})
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen
      .filter(n => n.startsWith('kicker-seite-') && n !== SEITE)
      .map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

function ausTopfUndNachfuellen(e, topfName, schluessel){
  const holen = fetch(e.request).then(antwort => {
    if(antwort && (antwort.ok || antwort.type === 'opaque')){
      const kopie = antwort.clone();
      caches.open(topfName).then(t => t.put(schluessel, kopie));
    }
    return antwort;
  });
  e.waitUntil(holen.catch(() => {}));
  return caches.open(topfName)
    .then(t => t.match(schluessel))
    .then(treffer => treffer || holen);
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if(r.method !== 'GET') return;
  const url = new URL(r.url);
  if(url.origin === self.location.origin){
    if(url.searchParams.has('_cb')){
      if(r.mode === 'navigate') e.respondWith(fetch(r).then(antwort => {
        if(antwort.ok){ const kopie = antwort.clone(); caches.open(SEITE).then(t => t.put(self.registration.scope, kopie)); }
        return antwort;
      }));
      return;
    }
    if(r.mode === 'navigate') return e.respondWith(ausTopfUndNachfuellen(e, SEITE, self.registration.scope));
    if(url.pathname.endsWith('/icon.png')) return e.respondWith(ausTopfUndNachfuellen(e, SEITE, r));
    return;
  }
  if(FREMDE_HOSTS.includes(url.hostname)) e.respondWith(ausTopfUndNachfuellen(e, FREMD, r));
});
