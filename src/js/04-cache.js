// ╔═══ §2.1 ─── PERFORMANCE CACHES & INVALIDIERUNG ─────────────────────╗
//     Alle Caches hängen am globalen `_cache`-Objekt und werden per
//     `_cache.version`-Tick oder selektivem `invalidateCache([tags])`
//     ungültig gemacht. Cache-Keys sind ENTITY_LENGTH_VERSION — der
//     Version-Tick ist die universelle Bust-Strategie.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Invalidiert bei: loadAll, Match-Add/Edit/Delete, Recalc, Config-Änderung
let _cache={version:0};

// ─── Ein voller Topf verliert seinen aeltesten Eintrag, nicht alle ───
// Jeder Topf leerte sich beim Ueberlauf VOLLSTAENDIG. Oberhalb des Deckels
// ist das Memo damit nicht beschnitten, es ist AUS: gemessen an
// `_seasonTitleCtx` mit Deckel 8 rechnete ein zweiter Blick auf zwoelf
// Zeitschnitte alle zwoelf noch einmal, bei sechs und acht keinen einzigen.
// Und ein Deckel steht nie weit ueber der Arbeitsmenge — der News-Generator
// allein braucht sieben der acht Plaetze, ein Monat mehr in der Liga kippt
// ihn also. Ein Objekt behaelt seine Einfuegereihenfolge, der erste
// Schluessel ist deshalb der aelteste.
function _topfDeckel(topf, max){
  const k = Object.keys(topf);
  for(let i = 0; k.length - i > max; i++) delete topf[k[i]];
}

function invalidateCache(keys=null){
  _cache.version++;
  // Nur spezifische Caches löschen, nicht alles
  if(!keys){
    // Kompletter Reset (z.B. nach Recalc)
    _cache={version:_cache.version};
  } else if(Array.isArray(keys)){
    // Selektiv. Die abgeleiteten Caches (history/snap/rankSnap/matchesBySeason/
    // seasonRankings) sind alle version-gebunden — _cache.version++ oben reicht,
    // beim nächsten Lookup wird der Key-Mismatch erkannt und neu berechnet.
    keys.forEach(k=>{
      if(k==='awards') {
        delete _cache._awards;
        delete _cache._playerAwards;  // playerAwards baut auf awardRankings auf
      }
      if(k==='stats') delete _cache._allStatsKey;
      if(k==='global') delete _cache._globalKey;
      if(k==='teams') delete _cache._teamDetail;
      if(k==='allTeamStats') delete _cache._allTeamStatsKey;
      if(k==='period'){ delete _cache._periodStatsKey; delete _cache._mperiod; } // v9.3: _mperiod-Dict nicht über Versionen anwachsen lassen
      if(k==='badges') delete _cache._badgeEarnedKey;
      if(k==='playerSeasonAwards') delete _cache._playerSeasonAwards;
      if(k==='allPastSeasons') delete _cache._allPastSeasonsKey;
      if(k==='news') {
        // v8.4: News-Generator-Memo (_buildStories) + H2H-Lookup-Map.
        // _cache.version++ oben bricht die Keys ohnehin — dies ist der
        // explizite, selbst-dokumentierende Reset-Pfad.
        delete _cache._buildStoriesKey;
        delete _cache._buildStoriesResult;
        delete _cache._h2hMap;
        delete _cache._h2hKey;
      }
    });
  }
}




function getGlobalSim(){
  const key='global_'+matches.length+'_'+_cache.version+'_'+currentSeason().id;
  if(_cache._globalKey===key && _cache._globalQuelle===matches
     && _cache._globalSpieler===players && _cache._globalConfig===cfg) return _cache._globalSim;
  // Ein normaler Match-Add invalidiert sowieso die Version. Der seltene
  // inkrementelle Weg ohne Invalidierung hielt aber nur den neuesten
  // History-Block und verlor Saison-/Team-Maps. Ein kompletter, gecachter
  // DB-First-Lauf ist deshalb die einzige globale Quelle.
  const sim = simulateElo(matches);
  _merkeSim(sim);
  return sim;
}
// Der neue Lauf und alles, was aus ihm abgeleitet ist. Die Liste stand zweimal
// im selben Ablauf; eine Map, die nur in einem der beiden Zweige vergessen
// wird, ist ein Fehler, den niemand sieht.
function _merkeSim(sim){
  _cache._globalKey = 'global_' + matches.length + '_' + _cache.version + '_' + currentSeason().id;
  _cache._globalQuelle = matches;
  _cache._globalSpieler = players;
  _cache._globalConfig = cfg;
  _cache._globalSim = sim;
  _cache._historyByMatchId = null;
  _cache._snapMap = null;
  _cache._seasonRankings = null;
  _cache._matchesBySeason = null;
  _cache._rankSnapshots = null;
  _cache._streakSnap = null;
  // Ein Monatswechsel kann den Sim ohne Versionswechsel erneuern. Ein
  // alter abgeleiteter Key mit inzwischen leerem Wert ist dann kein Hit.
  ['_historyByMatchIdKey','_historyByMatchIdSim','_snapMapKey',
   '_seasonRankingsKey','_matchesBySeasonKey','_rankSnapshotsKey',
   '_streakSnapKey'].forEach(k => { delete _cache[k]; });
}

// Historische Staende teilen dieselbe DB-First-Engine. Rekord-Kontext und
// Saison-Peaks fragten denselben Prefix mit zwei frisch gebauten Arrays ab
// und simulierten ihn deshalb zweimal. Die Anzahl der eingeschlossenen
// Partien ist der kanonische Schluessel: zwischen zwei Partien ist jeder
// Zeitschnitt derselbe Stand. Es entstehen keine neuen Formeln/Rundungen.
// Die Simulationen sind nur lesbar; ein Aufrufer darf sie nicht veraendern.
function _prefixSim(anzahl){
  if(anzahl === matches.length) return getGlobalSim();
  const key = anzahl + '_' + matches.length + '_' + _cache.version + '_' + currentSeason().id;
  if(!_cache._prefixSim) _cache._prefixSim = {};
  const hit = _cache._prefixSim[key];
  if(hit && hit.quelle === matches && hit.spieler === players && hit.config === cfg) return hit.sim;
  const sim = simulateElo(matches.slice(0, anzahl));
  _cache._prefixSim[key] = {quelle:matches, spieler:players, config:cfg, sim};
  _topfDeckel(_cache._prefixSim, 24);
  return sim;
}
function getSimAt(bisMs){
  const bis = _schnitt(bisMs);
  if(!bis) return getGlobalSim();
  // matches ist aus der DB aufsteigend sortiert. Die obere Grenze nimmt
  // ALLE Partien am selben Zeitstempel mit, genau wie der bisherige Filter.
  let lo = 0, hi = matches.length;
  while(lo < hi){
    const mitte = (lo + hi) >>> 1;
    if(mts(matches[mitte]) <= bis) lo = mitte + 1;
    else hi = mitte;
  }
  return _prefixSim(lo);
}
// Die Partien bis zu einem Zeitschnitt, als EIN Array je Stand. Prestige,
// Monatstitel und Badges schnitten sich denselben Stand jedes Mal frisch
// zurecht (`matches.filter(m => mts(m) <= bisMs)`): `prestigeTabelle(bis)`
// tat es einmal und `seasonTitleHistory` für jeden Spieler noch einmal —
// zwölf gleiche Kopien der Liga je Schnitt, und die Memos, die an der
// Identität ihres Arrays hängen (`matchesOfPlayer`, `matchesByDay`,
// `getSimForMatches` …), trafen über diese Grenzen nie. Der Schlüssel ist
// wie bei `getSimAt` die Zahl der eingeschlossenen Partien; alle Partien am
// selben Zeitstempel gehören dazu. Das Array ist nur zu lesen.
// Eine Liga, die nicht aufsteigend vorliegt, bekommt den alten Filter: die
// Binärsuche setzt die Reihenfolge der Datenbank voraus.
const _partienBisMemo = new WeakMap();
function _partienBis(bisMs){
  let topf = _partienBisMemo.get(matches);
  if(!topf){
    let sortiert = true;
    for(let i = 1; i < matches.length && sortiert; i++) if(mts(matches[i]) < mts(matches[i-1])) sortiert = false;
    topf = {sortiert, je:new Map()};
    _partienBisMemo.set(matches, topf);
  }
  if(!topf.sortiert) return matches.filter(m => mts(m) <= bisMs);
  let lo = 0, hi = matches.length;
  while(lo < hi){
    const mitte = (lo + hi) >>> 1;
    if(mts(matches[mitte]) <= bisMs) lo = mitte + 1;
    else hi = mitte;
  }
  let a = topf.je.get(lo);
  if(!a){
    a = matches.slice(0, lo);
    topf.je.set(lo, a);
    // Älteste zuerst geräumt, wie `_topfDeckel`; der Generator fragt je Lauf
    // eine Handvoll Schnitte.
    if(topf.je.size > 24) topf.je.delete(topf.je.keys().next().value);
  }
  return a;
}
const _subsetSimMemo = new WeakMap();
function getSimForMatches(quelle){
  if(quelle === matches) return getGlobalSim();
  const monat = currentSeason().id;
  const hit = _subsetSimMemo.get(quelle);
  if(hit && hit.version === _cache.version && hit.liga === matches
     && hit.spieler === players && hit.config === cfg && hit.monat === monat) return hit.sim;
  // Nur eine EXAKTE Anfangsfolge teilt den Prefix-Topf. Eine Saison, ein
  // einzelner Spieler oder kopierte/edierte Match-Objekte sind eigene
  // Daten. Ein Prefix, der mitten in gleichen Zeitstempeln endet, darf
  // ebenfalls nicht ueber seinen letzten Index hinaus erweitert werden.
  const prefix = quelle.length <= matches.length
    && quelle.every((m, i) => m === matches[i]);
  const sim = prefix ? _prefixSim(quelle.length) : simulateElo(quelle);
  _subsetSimMemo.set(quelle, {version:_cache.version, liga:matches,
    spieler:players, config:cfg, monat, sim});
  return sim;
}

// ─── §2.2 Abgeleitete Sim-Maps (snapMap, historyByMatchId) ───────────
// Vermeidet wiederholte O(n) Loops in showPlayer, vAwards, _awardRankingsUncached etc.
// WICHTIG: Cache-Key bindet an matches.length + _cache.version, damit selektives
// invalidateCache(['global', ...]) korrekt invalidiert. Sonst stale nach Match-Add/Edit.
function getHistoryByMatchId(){
  const sim=getGlobalSim();
  const key='hist_'+matches.length+'_'+_cache.version;
  if(_cache._historyByMatchIdKey===key && _cache._historyByMatchIdSim===sim)
    return _cache._historyByMatchId;
  const map=new Map();
  // Einige Vorschauen (und bewusst schlanke Tests) brauchen nur Elo und
  // Saisonstaende und liefern deshalb keinen History-Block. Eine kalte
  // Cache-Reihenfolge darf daraus keinen Absturz machen: ohne History gibt
  // es schlicht keine per-Partie-Snapshots. Auf einem warmen Cache war der
  // Fehler bisher zufaellig verdeckt.
  const history=sim && Array.isArray(sim.history) ? sim.history : [];
  for(let i=0; i<history.length; i++){
    map.set(history[i].matchId, history[i]);
  }
  _cache._historyByMatchIdKey = key;
  _cache._historyByMatchIdSim = sim;
  _cache._historyByMatchId = map;
  return map;
}
// ─── §2.3 Streak-Snapshots (für "Serienbrecher"-Badge) ───────────────
// Für jedes Match: die aktuelle Win-Siegesserie aller 4 beteiligten Spieler
// VOR diesem Match. Berechnet per O(n) Walk durch alle Matches chronologisch;
// pro Match werden die Streaks der 4 Spieler vorher gesnapshottet, dann
// aktualisiert (Sieg → +1, Niederlage → 0).
// Ergebnis: { matchId: { pid: cur_streak_before_match (sparse, nur 4 pids) } }
// Genutzt vom Badge "Serienbrecher" — beendet eine ≥4er Serie eines Gegners
// durch direkten Sieg. Saison-Resets beeinflussen Streaks NICHT (analog zu
// longestPlayerStreak), da Serien semantisch durchgehend laufen.
function getStreakSnapshots(){
  const key='streakSnap_'+matches.length+'_'+_cache.version;
  if(_cache._streakSnapKey===key) return _cache._streakSnap;
  const ordered=[...matches].sort((a,b)=>mts(a)-mts(b));
  const cur={}; // pid → laufende Siegesserie (live)
  const out={}; // matchId → snapshot
  for(let i=0;i<ordered.length;i++){
    const m=ordered[i];
    const ids=[m.a1,m.a2,m.b1,m.b2];
    // Pre-Snapshot: nur die 4 beteiligten Spieler tracken
    const snap={};
    ids.forEach(pid=>{ snap[pid]=cur[pid]||0; });
    out[m.id]=snap;
    // Apply: update cur für die 4 Spieler
    ids.forEach(pid=>{
      const onA=(pid===m.a1||pid===m.a2);
      const w=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
      if(w) cur[pid]=(cur[pid]||0)+1;
      else cur[pid]=0;
    });
  }
  _cache._streakSnapKey=key;
  _cache._streakSnap=out;
  return out;
}

function getSnapMap(){
  const sim=getGlobalSim();
  const key='snap_'+matches.length+'_'+_cache.version;
  if(_cache._snapMapKey===key) return _cache._snapMap;
  const map={};
  for(let i=0; i<sim.history.length; i++){
    map[sim.history[i].matchId] = sim.history[i].eloBefore;
  }
  _cache._snapMapKey = key;
  _cache._snapMap = map;
  return map;
}

// ─── §2.4 Saison-Rank-Snapshots (preRank/postRank pro Match) ─────────
// Für jedes Match: die laufende Saison-Rangliste VOR und NACH dem Match.
// Berechnet wird das per O(n) Walk durch alle Matches; pro Match werden
// die Deltas aus globalSim.history auf einen seasonElo-Akkumulator addiert.
// Ergebnis: { matchId: { preRank: {pid: rank}, postRank: {pid: rank} } }
// wobei rank = 1 für höchstes Saison-Elo zum jeweiligen Zeitpunkt.
// Genutzt von den Badges "Thronfäller" (kingslayer) und "Überholmanöver".
// Tie-Break bei gleichem Elo: alphabetisch nach playerId — deterministisch.
function getRankSnapshots(){
  const key='ranksnap_'+matches.length+'_'+_cache.version;
  if(_cache._rankSnapshotsKey===key) return _cache._rankSnapshots;
  getGlobalSim(); // garantiert Sim ist aktuell
  const histMap = getHistoryByMatchId();
  const out = {};
  const seasonElo = {}; // sid → {pid: elo}
  for(let i=0; i<matches.length; i++){
    const m = matches[i];
    const sid = seasonOf(m.created_at).id;
    if(!seasonElo[sid]) seasonElo[sid] = {};
    const elos = seasonElo[sid];
    // Pre-Rank: aktueller Stand VOR diesem Match. Die Monatstabelle ist ein
    // Zeitraum [§C40]: wer im Monat gespielt hat, steht darin, auch nach
    // seinem Karriereende — sonst gab er mit dem Abschied die Spitze ab, und
    // der Feed meldete einen Wechsel, den niemand gespielt hat.
    const preEntries = Object.entries(elos);
    preEntries.sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const preRank = {};
    preEntries.forEach(([pid], idx) => preRank[pid] = idx + 1);
    // Wer vor dem Match Erster war, steht hier schon sortiert an erster
    // Stelle. „Thronfäller" suchte ihn stattdessen je Spieler und je Match
    // durch die ganze Rangtabelle — dieselbe Antwort, zwölfmal gesucht.
    const preTop1 = preEntries.length ? preEntries[0][0] : null;
    // Apply this match's deltas (vom globalSim)
    const histEntry = histMap.get(m.id);
    if(histEntry && histEntry.deltas){
      Object.entries(histEntry.deltas).forEach(([pid, d]) => {
        elos[pid] = (elos[pid] || 0) + d;
      });
    }
    // Post-Rank: Stand NACH diesem Match
    const postEntries = Object.entries(elos);
    postEntries.sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const postRank = {};
    postEntries.forEach(([pid], idx) => postRank[pid] = idx + 1);
    out[m.id] = {preRank, postRank, preTop1};
  }
  _cache._rankSnapshotsKey = key;
  _cache._rankSnapshots = out;
  return out;
}

// ─── §2.4b Saison-Positionsverlauf (für §C21 Position-History-Sheet) ──
// Berechnet pro Tag der Saison die Tabellenposition jedes aktiven Saison-
// Spielers, basierend auf saison-isoliertem Elo. Eintritts-Tag eines Spielers
// = Tag des ersten Saison-Matches; vor diesem Tag bleibt der Datenpunkt null
// (→ Linie startet erst am Eintrittstag, wie im Mockup "Neue Spieler ab
// Eintrittsdatum" gefordert).
//
// Tie-Break bei identischem Saison-Elo: alphabetisch nach Spieler-ID —
// deterministisch und konsistent zu getRankSnapshots (Zeile 3060/3072).
//
// Performance: O(Matches × 4) für Delta-Apply, O(Spieler × log Spieler) pro
// Tag für die Sortierung. Bei 12 Spielern × 30 Tagen × 200 Matches ≈ 1500 Ops.
// Cache-Key bindet an matches.length + _cache.version → invalidiert automatisch
// nach jedem Match (doSaveMatch ruft invalidateCache(['global', ...])).
const POSV_COLORS = [
  '#E4F24A', '#ff7849', '#56b4e8', '#f7cf4a',
  '#a78bfa', '#4ade80', '#f0566a', '#22d3ee',
  '#fb923c', '#e879f9', '#fde047', '#94a3b8'
];

function getSeasonPositionHistory(seasonId){
  if(!seasonId) seasonId = currentSeason().id;
  const isCurrent = (seasonId === currentSeason().id);
  const key = 'posHist_'+seasonId+'_'+(isCurrent?tagKey(Date.now()):'fertig')+'_'+matches.length+'_'+_cache.version;
  if(_cache._posHistKey===key) return _cache._posHist;

  const sEnd = seasonEnd(seasonId);
  const sMatches = matchesInSeason(seasonId);
  const totalDays = sEnd.getDate(); // letzter Tag des Monats

  // Letzter zu rendernder Tag:
  //   laufende Saison → heutiger Tag im Monat (capped auf totalDays)
  //   vergangene Saison → letzter Tag mit ≥1 Match (mind. 1)
  let lastDay;
  if(isCurrent){
    lastDay = Math.min(new Date().getDate(), totalDays);
  } else {
    let mx = 0;
    for(const m of sMatches){ const d=new Date(m.created_at).getDate(); if(d>mx) mx=d; }
    lastDay = Math.max(1, mx);
  }

  // Aktive Spieler in dieser Saison = wer ≥1 Saison-Match hat. Ein Monat
  // ist ein Zeitraum [§C40]: wer darin gespielt hat, steht im Verlauf.
  const activeSet = new Set();
  sMatches.forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(id => { if(sichtbar(id)) activeSet.add(id); }));
  const activeIds = [...activeSet];

  // Empty-State: 0 oder 1 aktive Spieler → kein sinnvolles Diagramm
  if(activeIds.length < 1){
    const result = {seasonId, isCurrent, totalDays, lastDay:0, activeIds:[], entryDay:{},
      positionsByDay:{}, eloByDay:{}, spielTage:[], finalElo:{}, colorOf:{}, days:[], builtAt:Date.now(), empty:true};
    _cache._posHistKey = key;
    _cache._posHist = result;
    return result;
  }

  // Eintritts-Tag pro Spieler (Tag des ersten Saison-Matches)
  const entryDay = {};
  for(const m of sMatches){
    const d = new Date(m.created_at).getDate();
    [m.a1,m.a2,m.b1,m.b2].forEach(id => {
      if(entryDay[id]===undefined) entryDay[id]=d;
    });
  }

  // Saison-Elo-Akkumulator. Delta-Quelle: globalSim.history via getHistoryByMatchId,
  // damit wir saison-isoliert dieselben Zahlen wie der Rest der App haben.
  const histMap = getHistoryByMatchId();
  const startElo = cfg.start_elo ?? 0;
  const seasonElo = {};
  activeIds.forEach(id => seasonElo[id] = startElo);

  // positionsByDay[pid][dayIdx] = Position (1..N) ODER null wenn vor Eintritt
  const positionsByDay = {};
  activeIds.forEach(id => positionsByDay[id] = new Array(lastDay).fill(null));
  // Die Saison-Elo am Ende jedes Tages steht daneben, aus DERSELBEN Schleife:
  // das Titelrennen des Meister-Blatts zeichnet sie, und eine zweite Rechnung
  // über dieselben Deltas nennte irgendwann einen anderen Ersten als die
  // Linien des Positionsverlaufs [§C27]. `spielTage` sind die Tage mit einer
  // Partie — „an der Spitze" zählt nur, wo auch gespielt wurde.
  const eloByDay = {};
  activeIds.forEach(id => eloByDay[id] = new Array(lastDay).fill(null));
  const spielTage = [];

  let mIdx = 0;
  for(let day=1; day<=lastDay; day++){
    // Alle Matches dieses Tages anwenden
    let gespielt = false;
    while(mIdx < sMatches.length){
      const m = sMatches[mIdx];
      const mDay = new Date(m.created_at).getDate();
      if(mDay > day) break;
      if(mDay === day){
        gespielt = true;
        const histEntry = histMap.get(m.id);
        if(histEntry && histEntry.deltas){
          const ds = histEntry.deltas;
          for(const pid in ds){
            if(seasonElo[pid] !== undefined) seasonElo[pid] += ds[pid];
          }
        }
      }
      mIdx++;
    }
    // Ranking-Snapshot (nur Spieler, die schon eingestiegen sind, werden gezählt;
    // andere bleiben null für diesen Tag — Linie startet erst beim Eintrittstag)
    const ranked = activeIds
      .filter(id => entryDay[id] !== undefined && day >= entryDay[id])
      .map(id => [id, seasonElo[id]])
      .sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0]));
    ranked.forEach(([pid, elo], idx) => {
      positionsByDay[pid][day-1] = idx + 1;
      eloByDay[pid][day-1] = Math.round(elo);
    });
    if(gespielt) spielTage.push(day);
  }

  // Eindeutiges Farb-Mapping: über alphabetisch sortierte ID-Liste → 12 Farben
  // (bei ≤12 Spielern garantiert eindeutig; bei >12 wiederholt sich die Palette).
  const sortedIds = [...activeIds].sort();
  const colorOf = {};
  sortedIds.forEach((id, i) => colorOf[id] = POSV_COLORS[i % POSV_COLORS.length]);

  const result = {
    seasonId, isCurrent, totalDays, lastDay,
    activeIds, entryDay, positionsByDay, eloByDay, spielTage,
    finalElo: {...seasonElo},
    colorOf,
    days: Array.from({length:lastDay}, (_,i)=>i+1),
    builtAt: Date.now(),
    empty: false
  };
  _cache._posHistKey = key;
  _cache._posHist = result;
  return result;
}

// Saison-Stats pro Spieler (für Detail-Karte im Positionsverlauf-Sheet).
// Liefert Siege/Niederlagen/Quote/Bilanz für eine Saison. Cached.
function getSeasonPlayerStats(seasonId){
  if(!seasonId) seasonId = currentSeason().id;
  const key = 'posStats_'+seasonId+'_'+matches.length+'_'+_cache.version;
  if(_cache._posStatsKey===key) return _cache._posStats;
  const sMatches = matchesInSeason(seasonId);
  const stats = {};
  const ensure = id => { if(!stats[id]) stats[id]={wins:0,losses:0,games:0}; return stats[id]; };
  for(const m of sMatches){
    const aWin = m.winner==='A';
    [m.a1,m.a2].forEach(id => { const s=ensure(id); s.games++; if(aWin) s.wins++; else s.losses++; });
    [m.b1,m.b2].forEach(id => { const s=ensure(id); s.games++; if(aWin) s.losses++; else s.wins++; });
  }
  _cache._posStatsKey = key;
  _cache._posStats = stats;
  return stats;
}

// ─── §2.5 Matches-pro-Saison Cache ───────────────────────────────────
// Gruppiert alle Matches nach ihrer Saison-ID. Wird vom Award-Sammler-Badge
// und potentiell weiteren Saison-aggregierenden Funktionen genutzt.
const _matchesBySeasonMemo = new WeakMap();
function getMatchesBySeason(matchSubset){
  const quelle = Array.isArray(matchSubset) ? matchSubset : matches;
  if(quelle !== matches){
    const hit = _matchesBySeasonMemo.get(quelle);
    if(hit && hit.version === _cache.version && hit.liga === matches) return hit.wert;
    const map={};
    for(const m of quelle){
      const sid=seasonOf(m.created_at).id;
      (map[sid] || (map[sid]=[])).push(m);
    }
    _matchesBySeasonMemo.set(quelle, {version:_cache.version, liga:matches, wert:map});
    return map;
  }
  const key='msBySeason_'+matches.length+'_'+_cache.version;
  if(_cache._matchesBySeasonKey===key && _cache._matchesBySeasonQuelle===matches) return _cache._matchesBySeason;
  const map={};
  for(let i=0; i<matches.length; i++){
    const sid=seasonOf(matches[i].created_at).id;
    if(!map[sid]) map[sid]=[];
    map[sid].push(matches[i]);
  }
  _cache._matchesBySeasonKey=key;
  _cache._matchesBySeasonQuelle=matches;
  _cache._matchesBySeason=map;
  return map;
}

// ─── §2.6 Saison-Rangliste Cache (Saison-End-Stand) ──────────────────
// Pro Saison: Top-3 und Bottom-3 Spieler nach Saison-End-Elo.
// Bottom-3 nur definiert wenn mindestens 6 Saison-Teilnehmer (sonst überlappt es mit Top-3).
// Genutzt von Königsklasse + Pflichtaufgabe Badges.
function getSeasonRankingsCache(){
  const _srcKey='seasonRk_'+matches.length+'_'+_cache.version;
  if(_cache._seasonRankingsKey===_srcKey) return _cache._seasonRankings;
  const gSim=getGlobalSim();
  const out={};
  const pm=pmap();
  Object.keys(gSim.seasonEndElos||{}).forEach(sid=>{
    const endElos=gSim.seasonEndElos[sid]||{};
    const playedMap=gSim.seasonPlayed[sid]||{};
    const list=Object.keys(endElos)
      .filter(pid=>{
        const p=pm[pid];
        // Ein Monat ist ein Zeitraum [§C40]: wer darin spielte, steht darin.
        if(!p||!sichtbar(p)) return false;
        return (playedMap[pid]||0)>0;
      })
      .map(pid=>({pid,elo:endElos[pid]}))
      .sort((a,b)=>b.elo-a.elo);
    const top3=new Set(list.slice(0,3).map(x=>x.pid));
    const bottom3 = list.length>=6
      ? new Set(list.slice(-3).map(x=>x.pid))
      : new Set();
    out[sid]={top3,bottom3};
  });
  _cache._seasonRankingsKey=_srcKey;
  _cache._seasonRankings=out;
  return out;
}

// `sid` überschreibt die Saison für EINEN Aufruf (siehe awardRankings). Sie
// gehört zwingend in den Schlüssel: sonst gibt der zweite Aufruf die Liste
// der ersten Saison zurück, und das Profil zeigt die Awards eines Monats,
// den man vor zehn Minuten im Awards-Tab angesehen hat.
function getCachedAwardRankings(period, sid){
  let cacheSuffix='';
  if(period==='season') cacheSuffix=sid||awSeasonId||currentSeason().id;
  else if(period==='week') cacheSuffix=awWeekStart?('w'+new Date(awWeekStart).getTime()):('cur'+periodStart('week').getTime());
  else if(period==='day') cacheSuffix=periodStart('day').getTime();
  const key=period+'_'+cacheSuffix+'_'+matches.length+'_'+_cache.version;
  if(!_cache._awards) _cache._awards={};
  if(_cache._awards[key]) return _cache._awards[key];
  // Mit der Version im Schluessel waechst der Topf sonst ueber jede Version mit.
  _topfDeckel(_cache._awards, 40);
  const r=_awardRankingsUncached(period, sid);
  _cache._awards[key]=r;
  return r;
}

function getSeasonEloMap(){
  try{
    // Aus getGlobalSim lesen — der Saison-Reset im Hauptdurchlauf garantiert,
    // dass sim.elo die aktuelle Saison-Elo enthält. Positions-Tracker
    // ist konsistent saison-übergreifend (s. simulateElo).
    const sim=getGlobalSim();
    const map={};
    players.forEach(p=>{
      map[p.id]=sim.elo[p.id]!==undefined ? sim.elo[p.id] : cfg.start_elo;
    });
    return map;
  } catch(e){
    console.error('getSeasonEloMap Fehler:',e);
    const map={};
    players.forEach(p=>{ map[p.id]=cfg.start_elo; });
    return map;
  }
}



// ─── §2.1b Vorwärmen im Leerlauf ─────────────────────────────────────
// Ein Reiter, der zum ersten Mal aufgeht, rechnet seine Töpfe kalt: gemessen
// mit vierfach gedrosselter CPU stand der erste Wechsel auf Positionen eine
// halbe Sekunde, der längste Task 413 ms. Früher wärmte der Story-Generator
// nebenbei einen Teil davor; seit er im Worker rechnet [§11.8b], tut das
// niemand mehr auf dem Hauptthread. Nach jedem Zeichnen mit neuen Daten
// rechnet `_vorwaermen` deshalb die Töpfe der übrigen Reiter vor, EINEN je
// ruhigem Moment, in der Reihenfolge, in der man sie am ehesten öffnet.
// Gerechnet wird genau das, was die Ansicht beim Betreten fragt — dieselben
// Funktionen mit denselben Argumenten, sonst träfe der Schlüssel nicht.
// Die Zeichen der Laufbahn gehören nicht dazu: sie kosteten zehnmal so viel
// wie alle Töpfe zusammen und werden gezeichnet, wenn ihr Blatt einen Tipp
// entfernt ist (`_insRangWaermen`).
// Abgebrochen wird bei neuen Daten (eine andere Version), bei einem neueren
// Auftrag und solange die Seite versteckt ist.
let _vorwaermAuftrag = null;
const VORWAERMEN = [
  () => { allPlayerStats(); positionsListe('drive'); positionsListe('reves'); },   // Positionen
  () => getCachedAwardRankings('season', currentSeason().id),                  // Awards
  () => allChronicles(),                                                       // Rekorde
  () => allSeasonTitles(),                                                     // Chronik
  () => teamStats(),                                                           // Teams
  () => prestigeTabelle(),                                                     // Prestige, Profil
];
function _vorwaermen(){
  const auftrag = {version:_cache.version, schritt:0};
  _vorwaermAuftrag = auftrag;
  const weiter = () => {
    if(_vorwaermAuftrag !== auftrag || _cache.version !== auftrag.version) return;
    if(auftrag.schritt >= VORWAERMEN.length){ _vorwaermAuftrag = null; return; }
    if(document.hidden){ _leerlauf(1000).then(weiter); return; }
    try { VORWAERMEN[auftrag.schritt](); } catch(e){}
    auftrag.schritt++;
    _leerlauf(1000).then(weiter);
  };
  _leerlauf(1000).then(weiter);
}
