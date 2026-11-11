// ╔═══ §3.1 ─── DATENBANK-LAYER ────────────────────────────────────────╗
//     loadAll() lädt Spieler/Matches/Config/Seasons, persistRecalc()
//     schreibt Elos/Deltas atomar zurück. Saison-Archivierung am
//     Monatswechsel via autoArchiveSeasons().
// ╚═════════════════════════════════════════════════════════════════════════╝
function pmap(){
  const key='pmap_'+players.length+'_'+_cache.version;
  if(_cache._pmapKey===key) return _cache._pmapData;
  const m={};
  players.forEach(p=>m[p.id]=p);
  _cache._pmapKey=key;
  _cache._pmapData=m;
  return m;
}

// Wer heute in der Liga antritt: nicht ausgeblendet und nicht im Ruhestand
// [§C40]. Die Ranglisten, die Eingabe und der Feed lesen von hier; wer die
// Geschichte zeigt, fragt `sichtbar`.
function activePlayers(){ return players.filter(p=>ligaAktiv(p)); }
function pname(id){const p=pmap()[id];return p?p.name:'?';}
function gamesPlayed(id){return matches.filter(m=>[m.a1,m.a2,m.b1,m.b2].includes(id)).length;}

// v9.15 PERF: Fingerprint des letzten loadAll-Payloads. Der 30s-Auto-Refresh
// (Boot-Intervall) hat bisher bei JEDEM Tick alle Caches invalidiert und die
// komplette View per innerHTML ersetzt — auch wenn sich in der DB nichts
// geändert hatte (99% der Ticks). Das kostete nicht nur Rechenzeit, sondern
// zerstörte alle 30s Scroll-Position/Fokus. Jetzt: unveränderte Daten →
// Early-Return, Globals/Caches/DOM bleiben unangetastet. Der Tagesschluss
// um 23:59 und Mitternacht erzwingen trotzdem einen vollen Durchlauf
// (Saison-/POTD-/Recap-Logik, was den ganzen Tag beschreibt).
let _lastLoadFingerprint = null;
let _lastLoadDay = null;
let _loadAllPromise = null;
let _loadAllNochmals = false;
let _loadAllLeise = false;
// Sichtbarkeit, Polling und Speichern koennen gleichzeitig laden wollen.
// Nur ein Durchlauf darf Daten einbauen; explizite Anforderungen verlangen
// EINEN frischen Folgedurchlauf. Reines Polling schliesst sich dagegen an:
// dauert ein Abruf laenger als der Takt, darf er nicht endlos veralten.
function loadAll(opts){
  if(_loadAllPromise){
    // Ein expliziter Vordergrundaufruf (z.B. Speichern) behält seine normale
    // Fehleranzeige, auch wenn er sich an eine stille Navigation anschließt.
    // Reines Polling schließt sich dagegen still an. Ein langsamer
    // Liga-Abruf darf durch einen 30s-Tick nicht plötzlich den Fehlerpfad
    // wechseln und bei Netzverlust die zuvor bedienbare Ansicht ersetzen.
    if((!opts || opts.leise !== true) && (!opts || opts.nachladen !== false)) _loadAllLeise = false;
    if(!opts || opts.nachladen !== false) _loadAllNochmals = true;
    return _loadAllPromise;
  }
  _loadAllLeise = !!opts && opts.leise === true;
  _loadAllPromise = (async()=>{
    try {
      do {
        _loadAllNochmals = false;
        await _loadAllDurchlauf();
      } while(_loadAllNochmals);
    } finally {
      // Vor dem Erfuellen freigeben, ohne weitere finally-Microtask: eine
      // neue Anforderung darf nicht an einen schon beendeten Lauf geraten.
      _loadAllPromise = null;
      _loadAllLeise = false;
    }
  })();
  return _loadAllPromise;
}
// Die Töpfe, die ein neuer Datenstand leert. Der Live-Abruf und der
// Schnellstart [§3.1b] leeren dieselben — zwei Listen liefen auseinander.
const LADEN_TOEPFE = ['global', 'stats', 'awards', 'teams', 'allTeamStats', 'period', 'badges', 'playerSeasonAwards', 'allPastSeasons'];

// Die vier Antworten in den Zustand einbauen, so wie sie aus der Datenbank
// kommen. Rein lokal: der Schnellstart baut damit den gespeicherten Stand
// ein, und der darf nichts schreiben [§3.1b]. Was schreibt, steht in
// `_overridesVerwerfen` und `_avatareNachziehen` und läuft nur nach einem
// Live-Abruf.
function _datenEinbauen(roh){
  // Alle Spieler laden (auch hidden) → für Match-Berechnungen nötig
  players=roh.p||[];
  // Ein Profilbild, das noch nur auf diesem Gerät liegt (aus der Zeit, als
  // die Spalte ein Zahlwert war, siehe `_avatareNachziehen`), gilt hier,
  // bis es in der Liga steht — sonst verschwände es mit dem ersten Abruf.
  players.forEach(pp=>{
    if(pp.avatar_id!=null) return;
    const lokal=_avatarLokal(pp.id);
    if(lokal) pp.avatar_id=lokal;
  });
  matches=roh.m||[];
  if(roh.c)cfg=roh.c;
  seasons=roh.se||[];
}
// Profilbilder, die nur auf einem Gerät stehen. Die erste Fassung des Schemas
// legte `avatar_id` als integer an, die App speichert aber Schlüssel wie
// 'wolf': jedes Speichern scheiterte, und die App legte das Bild still in
// localStorage — sichtbar nur auf dem Gerät, das es gewählt hatte. Neue
// Bilder gehen nur noch in die Datenbank; die alten schreibt jedes Gerät
// nach, sobald die Spalte Text ist, und vergisst sie dann. Hat die Liga
// inzwischen ein anderes Bild, gewinnt die Liga.
const AVATAR_LOKAL_LS = 'padel_playerEdit_';
function _avatarLokal(id){
  try{
    const raw=localStorage.getItem(AVATAR_LOKAL_LS+id);
    const e=raw?JSON.parse(raw):null;
    return e && typeof e.avatar_id==='string' ? e.avatar_id : null;
  }catch(err){ return null; }
}
function _avatareNachziehen(roh){
  (roh||[]).forEach(pp=>{
    const lokal=_avatarLokal(pp.id);
    if(!lokal) return;
    const weg=()=>{ try{ localStorage.removeItem(AVATAR_LOKAL_LS+pp.id); }catch(e){} };
    if(pp.avatar_id!=null){ weg(); return; }
    Promise.resolve(sb.from('players').update({avatar_id:lokal}).eq('id',pp.id).is('avatar_id',null))
      .then(r=>{ if(r && !r.error) weg(); }).catch(()=>{});
  });
}
// Regler gelten für die ganze Liga. Ältere Fassungen legten einen
// Wert, den die Datenbank ablehnte, in localStorage ab und rechneten auf
// diesem Gerät damit — mit anderen Gewichten als alle anderen Geräte, deren
// Elo aber in dieselbe Liga ging. Solche Gerätewerte werden verworfen, nicht
// nachgeschrieben: ein alter Wert vom Ausprobieren überschriebe sonst den
// der Liga, sobald die Spalte da ist.
function _overridesVerwerfen(){
  try{ localStorage.removeItem('padel_cfg_overrides'); }catch(e){}
}

async function _loadAllDurchlauf(){
  if(!_loadAllLeise) setConn('verbinde…','load');
  // Ob die Ansicht schon aus dem gespeicherten Stand steht [§3.1b]: dann
  // ersetzt ein Abruffehler sie nicht durch die Fehlerkarte.
  let ausStand = false;
  try{
    let abrufFertig = false;
    // Erst holen, wenn geschrieben ist, was eben gespeichert wurde [§3.1c].
    if(_schreibOffen) await _schreibKette;
    // Der Stand, den die Antwort zeigt, ist der beim Absenden.
    const abrufBeginn = Date.now();
    const abruf=Promise.allSettled([
      sb.from('players').select('*').order('elo',{ascending:false}),
      sb.from('matches').select('*').order('created_at',{ascending:true}),
      sb.from('config').select('*').eq('id',1).single(),
      sb.from('seasons').select('*').order('start_date',{ascending:false})
    ]).then(a=>{ abrufFertig=true; return a; });
    // Der erste Durchlauf zeichnet, während das Netz noch antwortet, den
    // letzten Stand des Geräts. Der Abruf läuft schon; gewartet wird nicht.
    if(_standOffen){ _standOffen=false; ausStand=await _standZeigen(()=>abrufFertig); }
    const antworten=await abruf;
    // Waerend des Abrufs kam etwa eine Speicheranforderung hinzu. Dieser
    // Zwischenstand ist ueberholt: keine Cache-Leerung, kein DOM-Umbau und
    // keine Story-Publikation aus einer potentiell alten Antwort.
    if(_loadAllNochmals) return;
    // Auch bei einem abgelehnten Abruf erst alle vier beenden: sonst
    // koennte ein Folgedurchlauf neben noch laufenden Restabfragen starten.
    for(const a of antworten){
      if(a.status === 'rejected') throw a.reason;
      if(a.value.error) throw a.value.error;
    }
    // Auch eine unveränderte Antwort sagt: die Partien im Speicher sind die
    // von jetzt [§C42].
    _partienGeholt = abrufBeginn;
    const [p,m,c,se]=antworten.map(a=>a.value);
    // Vor dem Einbauen: `_datenEinbauen` setzt ein lokales Bild in dieselben
    // Objekte, und danach sähe es aus, als stünde es schon in der Liga.
    _avatareNachziehen(p.data);
    const _fp = JSON.stringify([p.data, m.data, c.data, se.data]);
    // Zweimal am Tag ändert sich etwas ohne neue Partie: um 23:59 geht der
    // Tag zu (`_tagZu`), um Mitternacht beginnt der nächste. Nur mit
    // Mitternacht stand „Unschlagbar" erst am nächsten Morgen im Profil.
    const _today = new Date().toDateString() + (_tagZu(tagKey(Date.now())) ? '|zu' : '');
    if(_fp === _lastLoadFingerprint && _today === _lastLoadDay){
      // Nichts geändert seit dem letzten Tick → UI in Ruhe lassen.
      setConn(activePlayers().length+' Spieler · '+matches.length+' Sätze','ok');
      return;
    }
    _lastLoadFingerprint = _fp;
    _lastLoadDay = _today;
    const roh={p:p.data, m:m.data, c:c.data, se:se.data};
    const fp=_standHash(_fp);
    // Ist der Live-Stand derselbe, den der Schnellstart gezeichnet hat,
    // bleiben Daten, Töpfe und DOM, wie sie sind: dieselbe Antwort ergäbe
    // dieselbe Ansicht noch einmal, nur nach einer zweiten kalten Rechnung.
    const bestaetigt = !!_standGezeigt && _standGezeigt === fp;
    _standGezeigt = null;
    if(!bestaetigt){
      _datenEinbauen(roh);
      invalidateCache(LADEN_TOEPFE);
    }
    _overridesVerwerfen();
    // Nur aktive Spieler zählen für Anzeige
    const active=activePlayers();
    setConn(active.length+' Spieler · '+matches.length+' Sätze','ok');
    // Erst zeichnen, dann archivieren: `autoArchiveSeasons` wartet je
    // abgeschlossenem Monat auf einen Upsert, und am ersten Tag eines Monats
    // stand die Rangliste so lange leer. Ändert das Archiv etwas, wird neu
    // gezeichnet.
    // Ein Abruf kann schon vor dem Öffnen der Eingabe begonnen haben: die
    // Daten werden frisch, das Formular bleibt (`neuZeichnen`).
    if(!bestaetigt) neuZeichnen();
    const vorArchiv=_cache.version;
    await autoArchiveSeasons();
    if(_cache.version!==vorArchiv) neuZeichnen();
    // Ein abgebrochenes Nachschreiben holt der Live-Abruf nach [§3.1c].
    _nachholen();
    if(window._updateRecapBtn) window._updateRecapBtn();
    if(window._updatePosHistBtn) window._updatePosHistBtn();
    // Die übrigen Reiter rechnen im Leerlauf vor [§2.1b].
    if(!bestaetigt || _cache.version!==vorArchiv) _vorwaermen();
    // News-System v8.3: Stories aus DB synchronisieren.
    //   1. Generator erzeugt Story-Objekte aus Live-Daten
    //   2. INSERT ON CONFLICT DO NOTHING in Supabase
    //   3. SELECT der letzten 100 → memory cache
    //   4. Badge refresht aus memory cache
    // Bei DB-Fehler (Tabelle fehlt, Netz down): in-memory Fallback.
    // await blockiert loadAll, aber der vorherige render() ist schon durch
    // — User sieht UI, News-Badge folgt 100-500ms später.
    try {
      await syncStoriesViaDb();
    } catch(e){ console.warn('[news] sync failed', e); }
    try { if(window.newsBadgeRefresh) window.newsBadgeRefresh(); } catch(e){}
    // Der Stand für den nächsten Start [§3.1b], mit den Stories von eben.
    _standSchreiben(roh, fp);
    // Automatisch aufpoppen dürfen nur zwei Dinge: der Wochen-Recap (POTW)
    // und der Saison-Abschluss. Der Tages-Recap (POTD) kam an jedem Spieltag
    // hoch — das war schlicht zu oft. Er ist weiterhin über den Button in
    // der Wochenliga erreichbar (showPotdRecap({force:true})).
    // Ein Karriereende geht vor: es gibt es seltener als jede Woche, und der
    // Wochenrückblick wartet, solange ein Blatt offen ist [§C40].
    setTimeout(autoZeigeAbschied, 900);
    // Ein Karriereende aus der Zeit vor dem gespeicherten Stand bekommt ihn
    // jetzt [§C40] — nach dem Zeichnen, damit die Rechnung niemanden warten
    // lässt, und je Karriereende einmal.
    setTimeout(_ruheAbschliessen, 2500);
    setTimeout(autoShowPotwRecap, 900);
  }catch(e){
    _lastLoadFingerprint=null; _lastLoadDay=null; _standGezeigt=null;
    console.error(e); setConn('Verbindung fehlgeschlagen','bad');
    if(_loadAllLeise || ausStand || _eingabeOffen()) toast('Konnte nicht laden.',true);
    else document.getElementById('main').innerHTML=`<div class="card"><div class="leerstand" style="color:var(--red)">
      <div class="ee"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.5" r=".6" fill="currentColor"/></svg></div>Konnte nicht laden.<br><span class="num" style="font-size:11px">${esc(e.message||e)}</span></div></div>`;
  }
}

// ── Wer abgeleitete Daten in die Liga schreibt [§C42] ─────────────────
// Saison-Archiv und Stories rechnet jedes Gerät selbst und schreibt sie in
// die gemeinsame Datenbank — in Tagen und Monaten seiner eigenen Uhr. Am
// 13.10. öffnete ein automatisierter Browser mit Tokioter Uhr die Liga: für
// ihn war schon Mittwoch, sein „gestern" reichte von Montag 17 Uhr bis
// Dienstag 17 Uhr deutscher Zeit, und aus den beiden letzten Partien des
// Montags schrieb er „Harter Tag für Maxi" in die Liga, datiert auf Dienstag
// 16:58, einen Tag ohne Spiel. Dazu archivierte er vier Saisons mit
// Monatsgrenzen sieben Stunden neben denen der Liga. Schreiben darf deshalb
// nur ein Gerät, dessen Uhr dieselbe Wanduhr zeigt wie die Liga — jetzt und
// ein halbes Jahr davor und danach, also auch mit derselben Sommerzeit —, und
// kein automatisierter Browser. Lesen, rechnen und anzeigen darf jedes; was
// ein Spieler selbst einträgt, gilt immer.
const LIGA_ZEITZONE = 'Europe/Berlin';
function ligaSchreibtAbgeleitet(){
  if(typeof navigator !== 'undefined' && navigator.webdriver === true) return false;
  const jetzt = Date.now(), halb = 183 * 86400000;
  try {
    const f = new Intl.DateTimeFormat('en-GB', {timeZone:LIGA_ZEITZONE, year:'numeric', month:'numeric',
      day:'numeric', hour:'numeric', minute:'numeric', hourCycle:'h23'});
    return [jetzt - halb, jetzt, jetzt + halb].every(t => {
      const p = {}, d = new Date(t);
      f.formatToParts(d).forEach(x => { p[x.type] = Number(x.value); });
      return p.year === d.getFullYear() && p.month === d.getMonth() + 1 && p.day === d.getDate()
        && p.hour === d.getHours() && p.minute === d.getMinutes();
    });
  } catch(e){
    // Ohne Zeitzonen im Browser bleibt der Abstand zur Weltzeit: MEZ oder MESZ.
    return [-60, -120].includes(new Date(jetzt).getTimezoneOffset());
  }
}

// ── Stories nur aus den Partien von eben [§C42] ──────────────────────
// Am 19.10. stand um 15 Uhr ein Fun Fact im Feed, obwohl ab 13:54 vier
// Partien gespielt waren. Angelegt hatte ihn um 17:39 ein Telefon, das seit
// dem Mittag im Hintergrund lag: beim Zurückkommen rechnete der Takt der News
// sofort, mit den Partien, die noch im Speicher lagen — `loadAll` holte
// nichts, weil ein Blatt offen war, oder kam erst danach an. Für dieses
// Telefon war der Tag bis 15 Uhr ohne Spiel, und es schrieb den Fun Fact in
// die Liga. Stories rechnet und veröffentlicht der Takt deshalb nur aus
// Partien, die höchstens eine Minute vorher geholt wurden — zwei Takte von
// `_tickDaten`. Wer aus dem Hintergrund kommt, hat einen älteren Stand.
const DATEN_FRISCH_MS = 60 * 1000;
let _partienGeholt = 0;   // Beginn des letzten vollständigen Abrufs
function _datenFrisch(){ return _partienGeholt > 0 && Date.now() - _partienGeholt <= DATEN_FRISCH_MS; }

// ─── §3.1c Erst zeigen, dann nachschreiben ─────────────────────────────
// Eine neue Partie stand 3,3 Sekunden auf „Speichere…", eine gelöschte oder
// bearbeitete 6 Sekunden, bis sie zu sehen war (gemessen mit vierfach
// gedrosselter CPU und 250 ms je Anfrage): nach dem einen Aufruf, der die
// Partie schreibt, wartete die Ansicht auf die Elo jedes Spielers, die
// Deltas aller Partien, das Neuladen der ganzen Liga und die Stories.
// Gebraucht wird davon für die Ansicht nichts — die App rechnet aus den
// Partien, und die hat sie in der Hand. Sie zeigt den neuen Stand deshalb
// sofort, und was die Datenbank daraus ableitet, schreibt `imHintergrund`
// danach, Auftrag für Auftrag in EINER Kette: zwei schnelle Änderungen
// schreiben nicht durcheinander, und `loadAll` holt erst, wenn alles
// geschrieben ist — ein Abruf mittendrin brächte halb nachgerechnete
// Deltas zurück und archivierte aus ihnen.
// Ein Auftrag, der die Deltas der Liga schreibt (`nachholen`), lässt eine
// Marke auf dem Gerät, bis er durch ist: wird die App mittendrin
// geschlossen oder reißt das Netz ab, rechnet der nächste Live-Abruf die
// Liga nach und schreibt, was abweicht — mit der Uhr der Liga, wie jedes
// Abgeleitete [§C42].
let _schreibKette = Promise.resolve();
let _schreibOffen = 0;
let _schreibFehler = false;
const NACHRECHNEN_MARKE = 'padel_nachrechnen';
// Ein Auftrag beginnt nach dem nächsten Bild: auch sein Rechnen vor der
// ersten Anfrage (Positionsstärke aller Spieler) lief sonst noch vor dem
// Zeichnen, im selben Augenblick wie die neue Ansicht. Eine versteckte
// Seite zeichnet nicht; dort beginnt er gleich, sonst stünde die Kette, bis
// das Telefon wieder entsperrt ist.
function nachDemBild(){
  return new Promise(fertig => {
    if(document.hidden) setTimeout(fertig, 0);
    else requestAnimationFrame(() => setTimeout(fertig, 0));
  });
}
function imHintergrund(auftrag, nachholen){
  _schreibOffen++;
  if(nachholen) try { localStorage.setItem(NACHRECHNEN_MARKE, '1'); } catch(e){}
  _schreibKette = _schreibKette.then(nachDemBild).then(auftrag).then(() => {
    if(nachholen && !_schreibFehler) try { localStorage.removeItem(NACHRECHNEN_MARKE); } catch(e){}
  }, e => {
    _schreibFehler = true;
    console.warn('Nachschreiben:', e);
    toast('Nicht alles gespeichert', 'err', {sub:'Der Satz steht. Die Elo der Liga wird beim nächsten Laden nachgetragen.'});
  }).finally(() => { _schreibOffen--; });
  return _schreibKette;
}
function _nachholen(){
  let offen = false;
  try { offen = !!localStorage.getItem(NACHRECHNEN_MARKE); } catch(e){}
  if(!offen || _schreibOffen || !ligaSchreibtAbgeleitet()) return;
  _schreibFehler = false;
  imHintergrund(async () => {
    const r = await persistRecalc(matches);
    if(r.geaendert.length) neuZeichnen();
  }, true);
}
// Neue Daten zeigen, ohne ein offenes Formular zu ersetzen: freier
// Suchtext steht nicht in M, und ein neuer DOM-Knoten verlöre Cursor,
// Bildschirmtastatur und den Regler unter dem Finger. Eine Stelle für den
// Live-Abruf und für das, was gerade gespeichert wurde.
function neuZeichnen(){
  if(_eingabeOffen()){
    if(tab==='match') requestMatchPreview();
  }else render();
}

// Automatischer Saison-Abschluss: archiviert vergangene Monate
async function autoArchiveSeasons(){
  // Archiviert wird nur mit der Uhr der Liga; der Rückblick unten gilt jedem.
  const past=ligaSchreibtAbgeleitet()?allPastSeasons():[]; // alle vergangenen Saison-IDs
  // gSim einmal pro Aufruf für isStale + Archive nutzen → konsistent
  const gSim=getGlobalSim();
  // Erkennt veraltete Archive in drei Fällen:
  //   1. Alle top_elo-Werte == 0 (alter Bug)
  //   2. Archivierte Top-Elo weicht von DB-aggregierter Sim ab → vor Slider-Recalc geschrieben
  //   3. Bestes Team weicht von DB-aggregierter Sim ab
  // → re-archivieren mit aktuellen DB-Werten (= gSim, da DB-First).
  const isStale=(s)=>{
    try{
      const t=typeof s.top_elo==='string'?JSON.parse(s.top_elo):(s.top_elo||[]);
      if(!t.length) return true; // noch nie archiviert
      if(t.every(x=>!x.elo)) return true; // alter Bug
      // Konsistenz-Check: archivierte Top-Elo vs aggregierte gSim
      const snap=gSim.seasonEndElos[s.id]||{};
      for(const entry of t){
        const live=Math.round(snap[entry.id] ?? cfg.start_elo);
        if(live !== entry.elo) return true; // Inkonsistenz → re-archive
      }
      return false;
    }catch{return false;}
  };
  // v9.18: Eine Saison ist erst dann fertig archiviert, wenn auch ihre Chronik
  // eingefroren ist. Saisons, die vor dieser Version archiviert wurden, laufen
  // dadurch genau einmal erneut durch die Schleife und bekommen `titles`.
  const validStored=new Set(seasons.filter(s=>!isStale(s)&&_frozenTitlesOf(s)).map(s=>s.id));
  for(const sid of past){
    if(validStored.has(sid))continue; // schon (korrekt) archiviert
    const ms=matchesInSeason(sid);
    if(!ms.length)continue; // keine Matches → nichts zu archivieren
    const snap=gSim.seasonEndElos[sid]||{};
    const seasonPlayedMap=gSim.seasonPlayed[sid]||{};
    // Wins/Losses pro Spieler in dieser Saison zählen (saison-isoliert)
    const sw={}, sl={};
    ms.forEach(m=>{
      [[m.a1,m.a2,m.winner==='A'],[m.b1,m.b2,m.winner==='B']].forEach(([x,y,won])=>{
        [x,y].forEach(id=>{
          if(won){ sw[id]=(sw[id]||0)+1; }
          else { sl[id]=(sl[id]||0)+1; }
        });
      });
    });
    const top=Object.keys(seasonPlayedMap).filter(id=>seasonPlayedMap[id]>0)
      .map(id=>({id,elo:Math.round(snap[id] ?? cfg.start_elo),wins:sw[id]||0,losses:sl[id]||0}))
      .sort((a,b)=>b.elo-a.elo);
    if(!top.length)continue;
    // Bestes Team: höchster gemeinsamer Elo-Zuwachs, mind. 2 gemeinsame Spiele
    // Spielanzahl pro Duo zählen
    if(!top.length)continue;
    // Bestes Team: höchster gemeinsamer Elo-Zuwachs, mind. 2 gemeinsame Spiele
    // Spielanzahl pro Duo zählen
    const teamGames={};
    ms.forEach(m=>{
      [[m.a1,m.a2],[m.b1,m.b2]].forEach(([x,y])=>{
        const k=paarKey(x, y);
        teamGames[k]=(teamGames[k]||0)+1;
      });
    });
    const seasonTeamMap = gSim.seasonTeamElo[sid] || {};
    const teamEntries=Object.entries(seasonTeamMap)
      .filter(([k,v])=>v>0 && (teamGames[k]||0)>=2)
      .sort((a,b)=>b[1]-a[1]);
    const bestTeam=teamEntries[0]?teamEntries[0][0].split('|'):null;
    const entry={
      id:sid,
      label:seasonLabel(sid),
      // Der Kalendertag in Ortszeit: `toISOString` machte aus Mitternacht
      // am Ersten 22 Uhr am Vortag, und der Mai begann am 30. April.
      start_date:tagKey(seasonStart(sid)),
      end_date:tagKey(seasonEnd(sid)),
      player_id:top[0].id,
      team_p1:bestTeam?bestTeam[0]:null,
      team_p2:bestTeam?bestTeam[1]:null,
      top_elo:JSON.stringify(top.slice(0,3)),
      // v9.18: Die fertige Monats-Chronik wird hier EINGEFROREN. Bis dahin wurde
      // jede vergangene Saison bei jedem Laden neu berechnet — eine Aenderung am
      // Katalog (neue Bedingung, andere Schwelle, geloeschter Eintrag) hat damit
      // rueckwirkend die Geschichte umgeschrieben. Ab jetzt gilt: Was im Mai
      // vergeben wurde, bleibt vergeben. Eingefroren werden auch die
      // Anzeigefelder (name, ic, tone, cond, ev), damit eine alte Saison sich
      // rendern laesst, ohne dass ihr Eintrag im heutigen Katalog noch existiert.
      titles:_freezeSeasonTitles(sid)
    };
    const{error}=await sb.from('seasons').upsert(entry,{onConflict:'id'});
    if(!error){
      const existIdx=seasons.findIndex(s=>s.id===sid);
      if(existIdx>=0) seasons[existIdx]=entry; else seasons.unshift(entry);
      console.log('Saison archiviert:',sid);
      // NEU: playerSeasonAwards und allPastSeasons invalidieren
      invalidateCache(['playerSeasonAwards', 'allPastSeasons']);
    }
    else console.error('Saison archivieren fehlgeschlagen:',sid,error);
  }
  autoShowSeasonRecap();
}

// ─── Auto-Recap „schon gezeigt?"-Guard (v9.6) ────────────────────────
// Kombiniert den persistenten localStorage-Marker mit einem In-Memory-Set.
// Grund für den Bug: loadAll() läuft alle 30 s und re-armt die Auto-Show-
// Timeouts (POTW/POTD/Saison). Auf manchen Browsern (Privatmodus, Storage-
// Partitionierung/ITP) persistiert localStorage NICHT — dann greift der
// „_shown"-Check nie und das Recap poppt bei jedem Tick erneut auf. Das Set
// überlebt die loadAll-Ticks der laufenden Session und verhindert die
// Wiederholung auch ohne funktionierendes localStorage. localStorage-Zugriffe
// sind zusätzlich gekapselt, damit ein throwendes setItem den Ablauf nicht bricht.
const _autoRecapSeen = new Set();
function _recapSeen(lsKey, sessKey){
  if(_autoRecapSeen.has(sessKey)) return true;
  try { if(localStorage.getItem('padel_'+lsKey)) return true; } catch(e){}
  return false;
}
function _recapMarkSeen(lsKey, sessKey){
  _autoRecapSeen.add(sessKey);
  try { localStorage.setItem('padel_'+lsKey, '1'); } catch(e){}
}
// ── Ein Rückblick von selbst je Tag ──────────────────────────────────
// Endet ein Monat am Sonntag, warteten am Montag zwei: der Saison-Rückblick
// beim Öffnen und der Wochenrückblick danach, beim nächsten Öffnen oder
// sobald neue Daten kamen — gleich nach dem Speichern der ersten Partie des
// Tages, mitten im Spielbetrieb. Von selbst öffnet sich deshalb höchstens
// einer am Tag; der Monat geht vor, die Woche kommt am Dienstag. Gemerkt
// wird der Tag auf dem Gerät.
function _autoRueckblickHeute(){
  try { return localStorage.getItem('padel_auto_rueckblick_tag') === tagKey(Date.now()); } catch(e){ return false; }
}
function _autoRueckblickMerken(){
  try { localStorage.setItem('padel_auto_rueckblick_tag', tagKey(Date.now())); } catch(e){}
}
// Der Saison-Rückblick in den ersten drei Tagen des neuen Monats, einmal je
// Gerät. Der Tag wird gemerkt, sobald er geplant ist, nicht erst, wenn er
// offen ist: die Woche fragt 300 ms vor seinem Öffnen, und sonst gingen
// beide auf.
// Ist beim Öffnen etwas offen [§C31], wartet er: die Merker werden
// zurückgenommen, und der nächste Abruf fragt wieder.
function autoShowSeasonRecap(){
  if(!seasons.length || new Date().getDate() > 3) return;
  const last = seasons[0];
  if(!last || last.id === currentSeason().id || _recapSeen('recap_shown_'+last.id, 'season:'+last.id)) return;
  if(_autoRueckblickHeute() || _etwasOffen()) return;
  let vorher = null;
  try { vorher = localStorage.getItem('padel_auto_rueckblick_tag'); } catch(e){}
  _autoRecapSeen.add('season:'+last.id); // Session-Guard: kein Re-Trigger durch 30s-loadAll
  _autoRueckblickMerken();
  setTimeout(() => {
    if(!_etwasOffen()){ showSeasonRecap(last, {auto:true}); return; }
    _autoRecapSeen.delete('season:'+last.id);
    try {
      if(vorher === null) localStorage.removeItem('padel_auto_rueckblick_tag');
      else localStorage.setItem('padel_auto_rueckblick_tag', vorher);
    } catch(e){}
  }, 600);
}

// v9: Kompakte Kurven-Vorschau des Saison-Positionsverlaufs für den Recap.
// Baut ein kleines Multi-Line-SVG (Rang 1 oben) aus getSeasonPositionHistory.
// Gecacht per Saison + matches.length + _cache.version → einmal pro Saison
// gebaut, danach reiner String-Return. Leerer String, wenn zu wenig Daten.
function _recapPosMiniSVG(ph){
  if(!ph || ph.empty) return '';
  const key = 'recapPosMini_'+ph.seasonId+'_'+ph.lastDay+'_'+matches.length+'_'+_cache.version;
  if(_cache._recapPosMiniKey === key) return _cache._recapPosMini;
  const W=78, H=38, padX=3, padY=4;
  const N = ph.activeIds.length, days = ph.lastDay;
  let svg = '';
  if(days >= 2 && N >= 1){
    const xOf = d => padX + (d/(days-1))*(W-2*padX);
    const yOf = rank => padY + ((rank-1)/Math.max(1,N-1))*(H-2*padY); // Rang 1 = oben
    let lines = '';
    for(const pid of ph.activeIds){
      const arr = ph.positionsByDay[pid] || [];
      const pts = [];
      for(let d=0; d<arr.length; d++){ if(arr[d]!=null) pts.push(xOf(d).toFixed(1)+','+yOf(arr[d]).toFixed(1)); }
      if(pts.length < 2) continue;
      const col = (ph.colorOf && ph.colorOf[pid]) || '#94a3b8';
      lines += `<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>`;
      const last = pts[pts.length-1].split(',');
      lines += `<circle cx="${last[0]}" cy="${last[1]}" r="1.7" fill="${col}"/>`;
    }
    if(lines) svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${lines}</svg>`;
  }
  _cache._recapPosMiniKey = key;
  _cache._recapPosMini = svg;
  return svg;
}

// Saison-Rückblick. Der ausführlichste der drei: er erzählt einen ganzen
// Monat, und die Reihenfolge ist die Erzählung — wer gewonnen hat, mit wem,
// wie der Monat lief und wie die Tabelle am Ende stand, wie es zum Titel
// kam, was das für die Laufbahnen bedeutete, und woraus: Awards,
// Auszeichnungen, Chroniken, Rekorde.
//
// Er baut aus den Bauteilen, die es in der App schon gibt [§C27]: das Podest
// der Ewigen Tafel auf der Meisterbühne, die Award-Kachel des Reiters, die
// Säulen der Ehrung, die Bewegungen der Insignium-Karte, das Band des
// Beinamens. Vorher erzählte er mit Zeilen: zwölf große Ranglistenkarten,
// eine Kachel für den größten Sprung, neununddreißig Rekordzeilen — und was
// der Monat für die Laufbahnen bedeutete, stand nirgends [§C31].
//
// opts.auto=true  → Schutz-Phase (protectMs) gegen versehentliches Schließen,
//                   nur beim automatischen Auftauchen am Monatsanfang.
// opts.wechsel    → ein anderer Monat aus dem Wähler im Blatt: der Meister
//                   steigt zuerst auf, ohne großen Auftritt (`_vorstellung`).
function showSeasonRecap(season, opts){
  opts = opts || {};
  _sheetSetReopen(()=>showSeasonRecap(season));
  const sid = season.id;
  const ms = matchesInSeason(sid);
  const spielerImMonat = new Set();
  ms.forEach(m=>[m.a1,m.a2,m.b1,m.b2].forEach(id=>spielerImMonat.add(id)));
  const tore = ms.reduce((s,m)=>s+(m.games_a||0)+(m.games_b||0),0);
  const tage = new Set(ms.map(mdayKey)).size;
  const vonMs = seasonStart(sid).getTime(), bisMs = seasonEnd(sid).getTime();

  // ─── Die Rangliste der Saison — EINE Quelle für alles darunter ──────
  // Podest, Tabelle und der Schild im Wappen ziehen ihren Platz von hier
  // [§C31].
  const rang = saisonRang(sid);
  const podestHtml = saisonPodestHtml(sid, rang);

  // ─── Gegenüber dem Vormonat [§C31] ─────────────────────────────────
  // Ein Monat für sich sagt nicht, ob die Liga mehr gespielt hat oder wer
  // vorangekommen ist. Die Eckdaten tragen den Unterschied zum Vormonat, und
  // jede Zeile der Tabelle ihre Bewegung — nur, wer in beiden Monaten darin
  // steht.
  const vorSid = _prevSeasonId(sid);
  const vorMs = vorSid ? matchesInSeason(vorSid) : [];
  const unterschied = (jetzt, vor) => vorMs.length
    ? (jetzt > vor ? '+' : jetzt < vor ? '−' : '±') + Math.abs(jetzt - vor) : null;
  let platzVor = null;
  if(vorMs.length){
    platzVor = {};
    saisonRang(vorSid).forEach((e, i) => { platzVor[e.id] = i + 1; });
  }
  const vorTore = vorMs.reduce((s, m) => s + (m.games_a || 0) + (m.games_b || 0), 0);
  const vorSpieler = new Set(vorMs.flatMap(m => [m.a1, m.a2, m.b1, m.b2])).size;

  // ─── Der Monat in Zahlen ───────────────────────────────────────────
  // Der Kalender zeigt, wann gespielt wurde, die Zahlen darunter, wie viel —
  // mit dem Unterschied zum Vormonat.
  const zahlenHtml = rcpAbschnitt('Der Monat in Zahlen')
    + rcpKalenderHtml(ms, seasonStart(sid), seasonEnd(sid).getDate())
    + rcpZahlenHtml([
        {v:ms.length, l:'Sätze', d:unterschied(ms.length, vorMs.length)},
        {v:tage, l:'Spieltage', d:unterschied(tage, new Set(vorMs.map(mdayKey)).size)},
        {v:spielerImMonat.size, l:'Spieler', d:unterschied(spielerImMonat.size, vorSpieler)},
        {v:tore, l:'Games', d:unterschied(tore, vorTore)}])
    + (vorMs.length ? `<div class="rcp-z-bezug">Unterschied zum ${esc(seasonLabel(vorSid))}</div>` : '');

  // ─── Die Tabelle ───────────────────────────────────────────────────
  const tabelleHtml = rang.length
    ? rcpAbschnitt('Die Tabelle', rang.length) + rcpTabelleHtml(rang, platzVor)
      + (platzVor ? `<div class="rcp-z-bezug rcp-tab-bezug">Bewegung gegenüber ${esc(seasonLabel(vorSid))}</div>` : '')
    : '';

  // ─── Wie es zum Titel kam [§C31] ───────────────────────────────────
  // Die Tabelle sagt, wer am Ende wo stand, nicht wie es dazu kam: das
  // Titelrennen der ersten drei, die Tage an der Spitze und die Saison des
  // Meisters als Zellen [§C27]. Die Karte des Monatsabschlusses öffnet
  // diesen Rückblick und hat kein eigenes Blatt mehr. Darunter der
  // Positionsverlauf für alle.
  let rennenHtml='';
  try {
    const drei = rang.slice(0, 3).map(e => e.id);
    if(drei.length >= 2){
      const rn = saisonRennenHtml(sid, drei), sp = saisonSpitzeHtml(sid, drei), zl = saisonZellenHtml(sid, drei[0]);
      rennenHtml = (rn ? rcpAbschnitt('Das Titelrennen') + `<div class="rcp-block">${rn}</div>` : '')
        + (sp ? rcpAbschnitt('Tage an der Spitze') + `<div class="rcp-block">${sp}</div>` : '')
        + (zl ? rcpAbschnitt('Die Saison des Meisters', pname(drei[0])) + `<div class="rcp-block">${zl}</div>` : '');
    }
  } catch(err){}
  try {
    const mini = _recapPosMiniSVG(getSeasonPositionHistory(sid));
    if(mini){
      rennenHtml += `<button type="button" class="rcp-posmini" data-poshist="${esc(sid)}">
        <span class="rcp-posmini-chart">${mini}</span>
        <span class="rcp-posmini-tx"><span class="rcp-posmini-tt">Positionsverlauf</span><span class="rcp-posmini-su">Wer wann wo stand</span></span>
      </button>`;
    }
  } catch(err){}

  // ─── Die Wirkung auf die Laufbahn ──────────────────────────────────
  // Zwei Stände: das Ende des Vormonats und das Ende dieses Monats, an den
  // Grenzen, die auch seine Ehrung liest (`rcpMonatGrenzen`). Was
  // dazwischen an Prestige kam oder ging, je Spieler nach Quelle, wer
  // dadurch ein neues Zeichen trägt, und die Auszeichnungen darin. Der Teil
  // kommt nach, wenn das Blatt steht (`rcpSpaetLaden`).
  const spaet = () => {
    const mg = rcpMonatGrenzen(sid);
    const daten = rcpLaufbahnDaten(mg.von, mg.bis);
    const zuege = rcpZeichenZuege(daten);
    const lb = rcpLaufbahnHtml(daten);
    const eh = rcpEhrungHtml(daten);
    return (zuege.length ? rcpAbschnitt('Neue Zeichen', zuege.length)
        + `<div class="rcp-is nd-is nd-is-viele">${_insBewegungenHtml(zuege)}</div>` : '')
      + (lb ? rcpAbschnitt('Wirkung auf die Laufbahn') + lb : '')
      + (eh.html ? rcpAbschnitt('Auszeichnungen', eh.zahl) + eh.html : '');
  };

  // ─── Awards der Saison ─────────────────────────────────────────────
  // Aus der Rechnung des Awards-Reiters für genau diesen Monat und in seiner
  // Kachel [§C27]. „Awards" und nicht „Auszeichnungen": so heißen sie im
  // Reiter, und Auszeichnungen sind das, was im Profil gesammelt wird —
  // beides stand hier unter einem Namen [§6 „Dieselbe Sache hat einen Namen"].
  const vorherAw = awSeasonId;
  awSeasonId = sid;
  const R = awardRankings('season');
  awSeasonId = vorherAw;
  const kacheln = rcpAwardKacheln(R,
    ['scorer','wall','streaks','perfect','clutch','plusMinus','underdog','biggest','weekKing','dayKing','grinder','upset'],
    ['worstWr','lossStreaks','pechvogel'],
    key => `data-award="${key}"`);
  const awardsHtml = kacheln.length
    ? rcpAbschnitt('Awards der Saison', kacheln.length) + awVitrineHtml(kacheln, '') : '';

  // ─── Chronik, Rekorde ──────────────────────────────────────────────
  let chronikHtml='';
  try {
    const bn = rcpBeinamenHtml(seasonTitles(sid));
    if(bn.html) chronikHtml = rcpAbschnitt('Chronik der Saison', bn.zahl) + bn.html
      + `<div class="rcp-mehr klick" data-stafel="${esc(sid)}">Die ganze Tafel</div>`;
  } catch(err){}

  // Nicht die Rekordliste von heute, sondern der Unterschied zwischen dem
  // Stand am Monatsende und dem am Ende des Vormonats — siehe saisonRekorde.
  let rekordHtml='';
  try {
    const REK = saisonRekorde(sid);
    if(REK.length) rekordHtml = rcpAbschnitt('Rekorde dieser Saison', REK.length)
      + rcpRekordArtenHtml(REK) + rcpRekordWandHtml(REK);
  } catch(err){}

  // ─── Saison-Wähler im Kopf ─────────────────────────────────────────
  // Dasselbe Bauteil wie im Liga-Tab [§C27]. Der laufende Monat fehlt, er
  // hat keinen Rückblick.
  const vergangene = seasons.filter(s => s.id !== currentSeason().id)
    .map(s => s.id).sort().reverse();

  openSheet(
    rcpKopfHtml({ic:'trophy', marke:'Saison beendet', titel:season.label,
      extra:saisonWaehlerHtml('rcpSaisonwahl', sid, {liste:vergangene, attr:'rcpsaison'})})
    // Gleich unter dem Kopf das Podest auf der Bühne der Meister-Story
    // [§C27]: wer gewonnen hat, ist die erste Frage. Der Meister kommt
    // zuerst, groß, und setzt sich auf seinen Platz, dann Platz 2 und 3, und
    // sein Kranz kommt, wenn er steht (`_vorstellung`). Vorher standen die
    // Eckdaten darüber und schoben den Meister unter den Rand des ersten
    // Bildschirms.
    + (podestHtml ? `<div class="nf-meister rcp-buehne"><span class="nf-ms-strahl" aria-hidden="true"></span>${podestHtml}</div>` : '')
    + rcpTeamHtml(sid, ms)
    // Erst der Sport des Monats — Zahlen, Tabelle, Titelrennen, Awards —,
    // dann die Laufbahnen: was sich bewegt hat, und darunter die drei
    // Quellen in der Reihenfolge und Farbe ihrer Legende.
    + zahlenHtml + tabelleHtml + rennenHtml + awardsHtml
    + rcpSpaetHtml() + chronikHtml + rekordHtml
    + `<button class="recap-done-btn" id="closeRecapBtn">Verstanden</button>`,
    // Eine Vorstellung [§C43]: der Meister groß, dann auf seinem Platz,
    // dann das Team, dann der Rest.
    {protectMs: opts.auto ? 2500 : 0, vorstellung: opts.wechsel ? 'wechsel' : 'saison'});

  // Grab-Hint: kurz pulsieren, signalisiert „wegziehen geht auch"
  const _grab = document.getElementById('sheetGrab');
  if(_grab) _grab.classList.add('grab-pulse');

  // Gesehen ist er, sobald er offen ist — wie der Wochenrückblick. Gemerkt
  // wurde er nur über „Verstanden" oder ein Tippen darin; wer ihn wegwischte,
  // bekam ihn bis zum dritten Tag bei jedem Öffnen der App wieder.
  _recapMarkSeen('recap_shown_'+sid, 'season:'+sid);
  document.getElementById('closeRecapBtn').onclick = () => closeSheet();
  const wurzel = document.getElementById('sheet');
  wurzel.querySelectorAll('[data-rcpsaison]').forEach(b => b.onclick = () => {
    const s = seasons.find(x => x.id === b.dataset.rcpsaison);
    if(s) showSeasonRecap(s, {wechsel:true});
  });
  // Einmal für das Blatt, einmal für das, was nachkommt.
  const bindeIn = root => {
    const binden = (sel, fn) => root.querySelectorAll(sel).forEach(el => {
      el.onclick = () => fn(el);
    });
    binden('[data-detail],[data-tplayer]', el =>
      sheetNav(()=>showPlayer(el.dataset.detail || el.dataset.tplayer)));
    binden('.rcp-team[data-team]', el => {
      const paar = el.dataset.team.split('|');
      if(paar[0]&&paar[1]) sheetNav(()=>showTeam(paar[0],paar[1]));
    });
    binden('[data-award]', el => {
      awPeriod='season'; awSeasonId=sid;
      sheetNav(()=>showAward(el.dataset.award));
    });
    // Ein Wappen der neuen Zeichen und jede Zeile der Laufbahn öffnen die
    // Laufbahn des Spielers — dort steht die Rechnung Posten für Posten.
    binden('.rcp-is [data-pid],[data-laufbahn]', el =>
      sheetNav(()=>showLaufbahn(el.dataset.laufbahn || el.dataset.pid)));
    binden('.rcp-eh [data-pid]', el => sheetNav(()=>showPlayer(el.dataset.pid)));
    binden('[data-poshist]', el => sheetNav(()=>showPositionHistory(el.dataset.poshist)));
    binden('[data-stafel]', el => sheetNav(()=>showSeasonTable(el.dataset.stafel)));
    binden('[data-chron]', el => sheetNav(()=>showChronicle(el.dataset.chron)));
    _bpBinden(root);
  };
  bindeIn(wurzel);
  _chronMehrBinden(wurzel);
  rcpSpaetLaden(wurzel, spaet, bindeIn);
}

// Player-of-the-Day Recap: zeigt einmal pro Tag pro Gerät den Sieger des letzten Spieltags.
// ─── §3.3 Player-of-the-Week / Player-of-the-Day Recap ───────────────
// Helfer: Bereich der zuletzt abgeschlossenen Woche (Mo 00:00 – So 23:59:59.999)
function _potwLastWeekRange(){
  const now=new Date();
  const monday=wochenBeginn(now);        // Montag DIESER Woche
  // Eine Woche gilt ab Sonntag 23:59 als abgeschlossen, wenn der Tag zu ist
  // (`_tagZu`), nicht erst ab Montag 00:00. Der Wochenrückblick stand vorher
  // über den Montag verteilt in sechs Karten und verdeckte damit den Spieltag,
  // um den es gerade ging. Danach schloss sie um 23:00, und ihre Karte stand
  // damit vor dem Spieler des Sonntags, der um 23:59 kommt: der Abschluss
  // eines Tages unter dem der ganzen Woche. Die letzte Minute kostet nichts:
  // keine der 466 Partien hat nach 18 Uhr angefangen.
  const abschluss=new Date(monday); abschluss.setDate(abschluss.getDate()+6); abschluss.setHours(23,59,0,0);
  if(now.getTime() < abschluss.getTime()) monday.setDate(monday.getDate()-7);
  const end=new Date(monday); end.setDate(end.getDate()+7); end.setMilliseconds(-1);
  return {start:monday, end};
}
// Eine bestimmte Woche: nach ihrem Montag (`_potwKeyOf`, „2026-08-17") oder
// als ISO-Woche, wie die Wochenkarte sie trägt („2026-W34"). Der Montag der
// ISO-Woche 1 ist der Montag der Woche, in der der 4. Januar liegt.
function _potwWocheVon(key){
  const k = String(key);
  let start;
  const iso = k.match(/^(\d{4})-W(\d{1,2})$/);
  if(iso){
    const jan4 = new Date(+iso[1], 0, 4);
    start = new Date(+iso[1], 0, 4 - wochentagMo(jan4) + (+iso[2] - 1) * 7);
  } else {
    const [y, m, d] = k.split('-').map(Number);
    start = new Date(y, m - 1, d);
  }
  const end = new Date(start); end.setDate(end.getDate() + 7); end.setMilliseconds(-1);
  return {start, end};
}
// Der Montag benennt die Woche. Die Schreibweise des Tages steht an EINER
// Stelle [§C27]; hier stand sie ausgeschrieben ein zweites Mal.
function _potwKeyOf(monday){
  return tagKey(monday);
}
function _potwMatchesInRange(start,end){
  return matches.filter(m=>{const d=new Date(m.created_at); return d>=start && d<=end;});
}
// True wenn die Vorwoche mindestens 1 Match hatte (für Button-Sichtbarkeit)
function potwHasData(){
  const {start,end}=_potwLastWeekRange();
  return _potwMatchesInRange(start,end).length>0;
}

// Der Verbindungspunkt oben rechts: Text und Farbe des Ladezustands.
function setConn(t,c){document.getElementById('connText').textContent=t;document.getElementById('connDot').className='dot '+c;
  // Ladelinie und der Ring beim ersten „verbunden" [§C43].
  _connBewegung(c);}
