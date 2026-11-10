// ─── §3.1b Der letzte Stand des Geräts ─────────────────────────────────
// Ohne ihn zeigte die App beim Start nichts, bis Supabase alle Spieler und
// alle Partien geschickt hatte — auf dem Telefon eine leere Seite mit
// „verbinde…", jedes Mal. Nach jedem Live-Abruf liegt der Stand jetzt in
// IndexedDB: die vier Antworten, wie sie aus der Datenbank kamen, der
// Story-Bestand und ein Fingerabdruck. Beim nächsten Start zeichnet die App
// zuerst daraus, und der Live-Abruf ersetzt ihn, sobald er da ist — hat sich
// nichts geändert, bleibt die Ansicht einfach stehen [§C42].
//
// Der Stand ZEIGT nur. Er schreibt nichts: kein Archiv, keine Stories, kein
// Karriereende, kein Rückblick, der von selbst aufgeht — das alles hängt am
// Live-Abruf, denn es veröffentlicht, und veröffentlicht wird nur, was die
// Datenbank gerade sagt. `tests/start` liest das Schreibprotokoll mit.
// Ein Stand einer anderen Fassung der App gilt nicht: er wurde mit anderem
// Code eingebaut und gespeichert.
const STAND_DB = 'padel-stand', STAND_TOPF = 'stand', STAND_SCHLUESSEL = 'liga';
// Öffnet IndexedDB nicht in dieser Zeit, wartet der Start nicht weiter
// (privater Modus in manchen Browsern antwortet nie).
const STAND_WARTEN_MS = 400;
let _standOffen = true;        // nur der erste Durchlauf darf ihn zeigen
let _standGezeigt = null;      // Fingerabdruck des gezeigten Stands, bis der Live-Abruf kommt

// Ein kurzer Fingerabdruck über den Text der vier Antworten (cyrb53, 53 Bit).
// Der ganze Text stünde sonst ein zweites Mal im Speicher des Geräts.
function _standHash(text){
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for(let i = 0; i < text.length; i++){
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return text.length + ':' + (4294967296 * (2097151 & h2) + (h1 >>> 0));
}

function _standDb(){
  return new Promise((ja, nein) => {
    if(typeof indexedDB === 'undefined' || !indexedDB) return nein(new Error('kein IndexedDB'));
    const r = indexedDB.open(STAND_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STAND_TOPF);
    r.onsuccess = () => ja(r.result);
    r.onerror = () => nein(r.error);
    r.onblocked = () => nein(new Error('blockiert'));
  });
}

async function _standLesen(){
  try {
    const lesen = (async () => {
      const db = await _standDb();
      try {
        return await new Promise((ja, nein) => {
          const q = db.transaction(STAND_TOPF, 'readonly').objectStore(STAND_TOPF).get(STAND_SCHLUESSEL);
          q.onsuccess = () => ja(q.result || null);
          q.onerror = () => nein(q.error);
        });
      } finally { db.close(); }
    })();
    const rec = await Promise.race([lesen, new Promise(ja => setTimeout(() => ja(null), STAND_WARTEN_MS))]);
    if(!rec || rec.version !== BUILD_VERSION || !rec.roh || !Array.isArray(rec.roh.p) || !Array.isArray(rec.roh.m)) return null;
    return rec;
  } catch(e){ return null; }
}

async function _standSchreiben(roh, fp){
  try {
    const db = await _standDb();
    try {
      await new Promise((ja, nein) => {
        const tx = db.transaction(STAND_TOPF, 'readwrite');
        tx.objectStore(STAND_TOPF).put({version:BUILD_VERSION, fp, roh,
          stories:Array.isArray(_cache._stories) ? _cache._stories : null, zeit:Date.now()}, STAND_SCHLUESSEL);
        tx.oncomplete = () => ja();
        tx.onerror = () => nein(tx.error);
        tx.onabort = () => nein(tx.error);
      });
    } finally { db.close(); }
  } catch(e){ /* kein Speicher, voll oder nicht klonbar: der nächste Start lädt wie früher */ }
}

// Zeichnet den gespeicherten Stand, solange der Live-Abruf noch läuft.
// `abrufFertig` sagt, ob er schon da ist — dann ist der Stand überflüssig.
// Gibt zurück, ob gezeichnet wurde.
async function _standZeigen(abrufFertig){
  const rec = await _standLesen();
  // Kein Stand: bis die Datenbank antwortet, steht das Gerüst [§C43].
  if(!rec && !abrufFertig() && !_lastLoadFingerprint) _startGeruest();
  if(!rec || abrufFertig() || _lastLoadFingerprint) return false;
  _datenEinbauen(rec.roh);
  invalidateCache(LADEN_TOEPFE);
  if(Array.isArray(rec.stories)) _cache._stories = rec.stories;
  _standGezeigt = rec.fp;
  if(!_eingabeOffen()) render();
  // Die Pille „News" steht mit der Liga, nicht erst nach dem Abgleich mit
  // der Datenbank: ihre Stories hat der Stand schon [§C43]. Geschrieben wird
  // dabei nichts; der Hinweis wartet ohnehin die Schonfrist ab.
  if(Array.isArray(rec.stories) && window.newsBadgeRefresh) window.newsBadgeRefresh();
  _vorwaermen();
  return true;
}
