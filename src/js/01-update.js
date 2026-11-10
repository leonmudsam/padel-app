// ╔═══ §0.2 ─── BUILD-VERSION & UPDATE-CHECK ───────────────────────────╗
//     Die Version vergibt `tools/build.mjs` als Datum und Hash über den
//     ausgelieferten Inhalt. Der Hintergrund-Check holt die index.html mit
//     Cache-Bust; trägt sie eine andere Version, lädt die App von selbst neu,
//     sobald niemand etwas offen hat oder sie in den Hintergrund geht, und
//     sagt es danach kurz.
// ╚═════════════════════════════════════════════════════════════════════════╝
const BUILD_VERSION='2026.08.28.1';
// Neu laden mit Cache-Bust: das Update und der Knopf in den Einstellungen
// brechen damit den Seitencache von iOS-PWA und Browser. `nach` ist die
// Fassung, die das Update erwartet; sie reist in der Adresse mit und nicht
// im Speicher des Geräts, weil der in einem privaten Fenster fehlen kann —
// und ohne sie sähe die neue Seite weder, dass sie kurz Bescheid sagen soll,
// noch, dass das Neuladen die alte Fassung zurückbrachte.
function forceReload(nach){
  const u=new URL(location.href);
  u.searchParams.set('_cb',Date.now());
  if(typeof nach==='string') u.searchParams.set('_upd',nach);
  else u.searchParams.delete('_upd');
  // replace statt assign damit der alte Eintrag nicht in der History bleibt
  location.replace(u.toString());
}
// Update-Check per Conditional Request: mit If-None-Match antwortet GitHub
// Pages bei unveränderter Datei mit 304 ohne Body. Ohne ETag degradiert das
// zum vollen Abruf.
//
// Der ETag lebte nur im Speicher. Jeder Start begann deshalb ohne und lud die
// ganze Seite (1,7 MB, ohne Kompression gerechnet) erneut herunter — genau in
// dem Moment, in dem auch die vier Datenabfragen laufen. Er steht jetzt mit
// der Version, zu der er gehört, im Speicher des Geräts: nur wenn diese
// Version die laufende ist, gilt er. Sonst hätte ein Gerät, das die neue
// Fassung gefunden und vor dem Neuladen geschlossen wurde, beim nächsten
// Start ein 304 auf sie bekommen und nie wieder von ihr erfahren.
const UPD_LS = 'padel_upd_v1';
let _updEtag=(()=>{
  try{
    const s=JSON.parse(localStorage.getItem(UPD_LS)||'null');
    return s && s.version===BUILD_VERSION && s.etag ? s.etag : null;
  }catch(e){ return null; }
})();

// ── Das Update lädt von selbst [§C42] ─────────────────────────────────
// Vorher stand oben ein Banner „Neue Version — Neu laden", und die App blieb
// auf der alten Fassung, bis jemand ihn antippte. Ein PWA-Symbol bleibt
// tagelang offen, und wer den Banner übersah oder wegwischte, spielte mit
// einer Fassung weiter, deren Fehler schon behoben waren.
// Neu geladen wird aber nie unter den Fingern: nicht über einem Blatt, einem
// Dialog oder einer Story, nicht im Eingabe- und Einstellungsreiter, nicht
// mit fokussiertem Feld, nicht während die Kette im Hintergrund schreibt
// (eine Partie stünde dann ohne ihre Elo), nicht während ein Abruf oder der
// News-Takt Stories veröffentlicht, nicht neben einem Hinweis mit Knopf
// („Rückgängig" ginge verloren). Und nur in Ruhe: entweder hat seit dem
// Öffnen oder Zurückkommen niemand etwas berührt — dann sieht man den Start
// ohnehin gerade —, oder die letzte Berührung liegt eine Minute zurück. Eine
// kürzere Ruhe ließe die App jemandem, der die Rangliste liest, unter den
// Augen an den Anfang springen: wer liest, berührt nichts.
const UPD_RUHE_MS = 60*1000;
// Brachte das Neuladen die alte Fassung zurück (ein Zwischenspeicher, der
// noch die alte Seite ausliefert), versucht es die App erst nach dieser Zeit
// wieder — sonst lüde sie im Takt des Checks immer wieder neu.
const UPD_SPERRE_MS = 10*60*1000;
let _updNeu=null;            // gefundene Fassung, die noch nicht läuft
let _updSperre=null;         // {nach, bis}: Neuladen kam nicht an
// Gemessen mit `performance.now()`: Ruhe ist eine Dauer, und die Uhr des
// Geräts darf dazwischen springen (Zeitumstellung, Abgleich mit dem Netz).
let _updBeruehrt=-1;         // letzte Berührung (Zeiger, Taste, Rad)
let _updSichtbar=0;          // Start oder letztes Zurückkommen
let _updWarten=0;
function _updBelegt(){
  const fokus=document.activeElement;
  return _etwasOffen() || tab==='match' || tab==='settings'
    || (fokus && /^(INPUT|TEXTAREA|SELECT)$/.test(fokus.tagName))
    || _schreibOffen>0 || !!_loadAllPromise || _newsAutoSyncRunning
    || !!document.querySelector('.toast.show.mit-akt');
}
function _updRuhig(){
  return _updBeruehrt<_updSichtbar || performance.now()-_updBeruehrt>=UPD_RUHE_MS;
}
function _updVersuchen(){
  clearTimeout(_updWarten); _updWarten=0;
  if(!_updNeu) return;
  if(document.hidden){ _updImHintergrund(); return; }
  if(_updSperre && _updSperre.nach===_updNeu && performance.now()<_updSperre.bis) return;
  if(_updBelegt() || !_updRuhig()){
    const rest=_updRuhig() ? 0 : _updBeruehrt+UPD_RUHE_MS-performance.now();
    _updWarten=setTimeout(_updVersuchen, Math.max(2000, rest));
    return;
  }
  forceReload(_updNeu);
}
// ── Wer die App verlässt, sieht das Neuladen nicht ────────────────────
// In Ruhe kam es kaum: wer die App öffnet, liest im Feed — einem Blatt —
// oder tippt, und wer sie verlässt, ließ die gefundene Fassung bis zum
// nächsten Mal liegen; dort begann dasselbe von vorn. Geht die Seite in
// den Hintergrund, lädt sie deshalb gleich, auch über einem Blatt oder
// einer Story: die liest niemand mehr. Nicht aber über einer Eingabe, einem
// Dialog oder einem fokussierten Feld (dort steht etwas, das noch nicht
// gespeichert ist), nicht neben einem Hinweis mit Knopf („Rückgängig") und
// nicht, solange geschrieben, abgerufen oder veröffentlicht wird — dann,
// sobald das fertig ist und die Seite noch im Hintergrund liegt.
function _updImHintergrund(){
  clearTimeout(_updWarten); _updWarten=0;
  if(!_updNeu || !document.hidden) return;
  if(_updSperre && _updSperre.nach===_updNeu && performance.now()<_updSperre.bis) return;
  const fokus=document.activeElement;
  if(_eingabeOffen() || !!document.querySelector('.dlg-bg.show')
     || (fokus && /^(INPUT|TEXTAREA|SELECT)$/.test(fokus.tagName))
     || !!document.querySelector('.toast.show.mit-akt')) return;
  if(_schreibOffen>0 || !!_loadAllPromise || _newsAutoSyncRunning){
    _updWarten=setTimeout(_updImHintergrund, 1000);
    return;
  }
  forceReload(_updNeu);
}
// Beim Start nach dem Update: die Adresse sagt, welche Fassung erwartet war.
// Läuft sie, kommt der Hinweis; läuft noch die alte, gilt die Sperre. Danach
// verschwindet das Merkmal aus der Adresse, sonst meldete ein späteres
// Neuladen von Hand ein zweites Update.
function _updMelden(){
  try{
    const u=new URL(location.href), nach=u.searchParams.get('_upd');
    if(!nach) return;
    u.searchParams.delete('_upd');
    history.replaceState(history.state, '', u.toString());
    if(nach!==BUILD_VERSION){ _updSperre={nach, bis:performance.now()+UPD_SPERRE_MS}; return; }
    // Lud sie im Hintergrund, sagt sie es beim Zurückkommen: vorher stünde
    // der Hinweis auf einer Seite, die niemand sieht.
    const sagen=()=>setTimeout(()=>toast('App aktualisiert', 'ok'), 700);
    if(!document.hidden){ sagen(); return; }
    const zurueck=()=>{ if(document.hidden) return; document.removeEventListener('visibilitychange', zurueck); sagen(); };
    document.addEventListener('visibilitychange', zurueck);
  }catch(e){}
}
// Der erste Check wartet, bis der erste Datenlauf gezeichnet hat und die
// Seite ruht: er ist nie eilig, die Rangliste schon.
let _updErster=true;
async function checkForUpdate(){
  try{
    if(_updErster){
      _updErster=false;
      _updMelden();
      ['pointerdown','keydown','wheel'].forEach(t=>
        window.addEventListener(t, ()=>{ _updBeruehrt=performance.now(); }, {capture:true, passive:true}));
      document.addEventListener('visibilitychange', ()=>{
        if(document.hidden){ _updImHintergrund(); return; }
        _updSichtbar=performance.now();
        _updVersuchen();
      });
      try{ if(_loadAllPromise) await _loadAllPromise; }catch(e){}
      await _leerlauf(3000);
    }
    // Schon gefunden: nur noch auf den ruhigen Moment warten, nicht noch
    // einmal fragen — der ETag der neuen Fassung bekäme ohnehin ein 304.
    if(_updNeu){ _updVersuchen(); return; }
    const url=location.pathname+'?_cb='+Date.now();
    const r=await fetch(url,{cache:'no-store',headers:_updEtag?{'If-None-Match':_updEtag}:{}});
    if(r.status===304)return; // unverändert — kein Body übertragen
    if(!r.ok)return;
    const etag=r.headers.get('ETag');
    const text=await r.text();
    const m=text.match(/const BUILD_VERSION=['"]([^'"]+)['"]/);
    if(!m||!m[1])return;
    // In dieser Sitzung gilt jeder ETag: auch während das Update wartet,
    // soll der Fünf-Minuten-Takt nicht jedes Mal die ganze Seite holen. Für
    // den nächsten Start gemerkt wird aber nur der eigene — der einer neuen
    // Fassung gilt erst, wenn sie läuft.
    _updEtag=etag;
    if(m[1]===BUILD_VERSION){
      try{ if(etag) localStorage.setItem(UPD_LS, JSON.stringify({etag, version:BUILD_VERSION})); }catch(e){}
      return;
    }
    _updNeu=m[1];
    _updVersuchen();
  }catch(e){/* offline / CORS — still ignorieren */}
}

// ---- STATE ----
let players=[], matches=[], cfg={k_factor:32,risk_split:0.6,pos_swing:0.45,start_elo:0,
  win_boost:1.12,mov_loss_damp:0.5,match_bonus:1.5,low_elo_loss_damp:0};
let tab='ranking', unlocked=true;
let rankMetric='elo';      // elo | drive | reves | winrate | goaldiff | prestige
                           // atk/def kommen aus dem Positionen-Tab, der
                           // sich dieselbe Variable teilt [§5.2]
let teamSearch='';         // Suchfilter im Teams-Tab (Spieler- oder Team-Name)
let histFilter='all';      // all | <playerId>
let teamView='best';       // best | worst (Teams-Tab)
let teamSort='wr';         // wr | gd | elo (Teams-Sortierung) ← NEUE ZEILE
let posSort='wr';          // wr | wins (Positionen-Filter)
let period='season';          // all | season | week | month (Liga-Zeitraum)
// Welche Saison der Liga-Tab zeigt. null = die laufende. Beim Tabwechsel
// wird das zurückgesetzt: wer den Tab neu betritt, will den Stand von
// heute sehen, nicht den, den er vor zehn Minuten nachgeschlagen hat.
let ligaSeasonId=null;
// Was der Liga-Tab unter „Saison" zeigt: Rangliste der Spieler oder der
// Duos. Zwei Ranglisten über denselben Zeitraum, deshalb ein Reiter und
// keine zweite Seite.
let ligaSicht='spieler';   // spieler | duos
let awView='awards';       // awards | rekorde | chronik (Reiter im Awards-Tab)
// Welcher Einblick über der Rangliste aufgeklappt ist (15b-einblick.js).
// Er gehört zum Reiter: ein neuer Reiter beginnt geschlossen, ein
// Neuzeichnen im selben Reiter klappt ihn nicht zu.
let einblickOffen='';      // offene Einblicke, durch Leerzeichen getrennt: rollen netz ruhe_liga ruhe_pos ruhe_teams ruhe_chronik
// Welche Kammer der Rekorde-Reiter zeigt. Leer heißt alle vier. Sie gehört
// zum Reiter und nicht zur App: wer den Tab wechselt, will beim Zurückkommen
// die ganze Tafel sehen und nicht den Ausschnitt von vorhin.
let rekKammer='';          // '' | record | mark | fuegung | shame
// Der Awards-Tab kennt nur noch Saison und Woche. „Gesamt" war per
// Definition allzeit und sagte damit dasselbe wie der Rekorde-Reiter
// daneben — sechs Kacheln standen dort wörtlich doppelt. Als WERT gibt
// es 'all' weiterhin: das Award-Blatt aus einem Team-Profil zeigt die
// ganze Liga, und dafür ist es der richtige Zeitraum. Nur als Reiter
// gibt es ihn nicht mehr, und der Tabwechsel setzt ihn zurück.
let awPeriod='season';   // season | week ('all' nur im Blatt, ohne Reiter)
let awSeasonId=null;        // konkrete Saison für Award-Filter (null = aktuelle)
let awWeekStart=null;       // konkrete Woche (Date für Montag, lokale Zeit) für Award-Filter (null = aktuelle KW)

