// Der Service Worker der Liga [§C42]. Er hält die Seite, die Schriften und
// die Supabase-Bibliothek auf dem Gerät, damit ein Start nicht auf das Netz
// wartet: ohne ihn holte jedes Öffnen die index.html, das Skript von jsdelivr
// und die Schriften von Google, bevor überhaupt etwas zu sehen war.
//
// Was er NIE hält: die Antworten der Datenbank (die liegen im Stand der App,
// `06c-stand.js`, und gelten nur mit ihrem Fingerabdruck) und jede Anfrage
// mit `_cb` — damit fragt `checkForUpdate` die Seite ab und lädt
// `forceReload` neu. Beides muss das Netz sehen, sonst erführe kein Gerät je
// von einer neuen Fassung.
//
// Die Fassung setzt `tools/build.mjs`; sie ist die BUILD_VERSION der Seite.
// Ändert sie sich, ist dies ein neuer Service Worker, und die Töpfe der
// alten Fassung werden beim Aktivieren geräumt.
const SW_FASSUNG = 'x';
const SEITE = 'padel-seite-' + SW_FASSUNG;
const FREMD = 'padel-fremd';
// Fremde Quellen, die sich zwischen zwei Starts praktisch nie ändern.
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
      .filter(n => n.startsWith('padel-seite-') && n !== SEITE)
      .map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// Aus dem Topf, und im Hintergrund frisch nachgefüllt. Der nächste Start
// hat die neue Fassung; dieser wartet nicht auf das Netz.
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
      // `forceReload` lädt neu: die Seite aus dem Netz, und sie ersetzt die
      // gemerkte. Der Update-Check bleibt ganz beim Netz.
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
