// Bausteine der Story-Blätter, die mehrere Typen teilen. Lag am Ende von
// 31-news-detail.js.
// ─── §11.7b — Detail-Body Helper (v8.1) ──────────────────────────────
// Wiederverwendbare Sub-Renderer und Stats-Funktionen für die einzelnen
// Detail-Body-Cases. Alle nutzen bestehende Caches; keine eigenen Walks.

// Wann begann die Serie, die hier endet? Steht nirgends sonst: die Karte
// nennt nur ihre Laenge, und das Blatt wiederholte das bisher.
function _newsSerienLauf(pid, matchId, laenge){
  try {
    const idx = matches.findIndex(m => m.id === matchId);
    if(idx < 0 || !laenge) return {};
    const eigene = [];
    for(let i = idx - 1; i >= 0 && eigene.length < laenge; i--){
      const m = matches[i];
      if([m.a1, m.a2, m.b1, m.b2].indexOf(pid) < 0) continue;
      eigene.push(m);
    }
    if(!eigene.length) return {};
    const erste = eigene[eigene.length - 1];
    const fmt = m => datumFmt(m.created_at, 'tm');
    const tage = Math.max(1, Math.round(
      (new Date(matches[idx].created_at) - new Date(erste.created_at)) / 86400000));
    return {von: fmt(erste), bis: fmt(matches[idx]), tage};
  } catch(e){ return {}; }
}

// Match-VS-Block: 2v2 Layout mit Spieler-Avataren, Namen, Score und Datum.
// Klickbar (data-mid) → springt zum Match-Detail über den existierenden
// Click-Handler in openNewsDetail.
function _newsMatchVsBlock(matchId){
  try {
    // Steht diese Partie schon als Ergebnis im Kopf des Blatts, entfaellt sie
    // hier. Sonst stuende dieselbe Begegnung zweimal untereinander.
    if(matchId && matchId === _ndKopfMatch) return '';
    const m = matches.find(x => x.id === matchId);
    if(!m) return '';
    const pm = pmap();
    const av = pid => pm[pid]
      ? avHtml(pm[pid], '')
      : '<span class="av" style="background:var(--surface)"></span>';
    const nm = pid => (pm[pid] && pm[pid].name) || '?';
    const aWon = m.winner === 'A';
    const dt = new Date(m.created_at);
    const dStr = datumFmt(dt, 'tmj');
    return `<div class="nd-match" data-mid="${esc(m.id)}">
      <div class="nd-match-side ${aWon?'won':'lost'}">
        <div class="nd-match-avs">${av(m.a1)}${av(m.a2)}</div>
        <div class="nd-match-names">${esc(nm(m.a1))} & ${esc(nm(m.a2))}</div>
      </div>
      <div class="nd-match-score">
        <div class="nd-match-score-val">${m.games_a}:${m.games_b}</div>
        <div class="nd-match-score-date">${dStr}</div>
      </div>
      <div class="nd-match-side ${!aWon?'won':'lost'}">
        <div class="nd-match-avs">${av(m.b1)}${av(m.b2)}</div>
        <div class="nd-match-names">${esc(nm(m.b1))} & ${esc(nm(m.b2))}</div>
      </div>
    </div>`;
  } catch(e){ return ''; }
}

// Elo-Delta für einen Spieler in einem bestimmten Match. Nutzt bestehenden
// getHistoryByMatchId-Cache (Map<matchId, {deltas, eloBefore, eloAfter}>).
function _newsEloDelta(pid, matchId){
  try {
    const hist = getHistoryByMatchId();
    const entry = hist.get(matchId);
    if(!entry || !entry.deltas) return null;
    const d = entry.deltas[pid];
    if(d === undefined || d === null) return null;
    return Math.round(d);
  } catch(e){ return null; }
}

// Pre/Post-Rank für einen Spieler an einem Match. Nutzt getRankSnapshots-Cache.
function _newsRankChange(pid, matchId){
  try {
    const snaps = getRankSnapshots();
    const snap = snaps[matchId];
    if(!snap || !snap.preRank || !snap.postRank) return null;
    const pre = snap.preRank[pid];
    const post = snap.postRank[pid];
    if(!pre || !post) return null;
    return {pre, post};
  } catch(e){ return null; }
}

// Form-Strip + Win-Streak der letzten N Matches. Walks die filter()-Variante
// nur über matches (gesamt) — wird im Detail aufgerufen, also einmalig.
// `bis` ist die Story, deren Blatt die Reihe zeigt: gezählt wird bis zu IHRER
// Partie, nicht bis heute. Das Blatt der 10er-Pleitenserie von 14:20 zeigte
// unter „10 Pleiten nacheinander" die letzten zehn Partien von JETZT — mit dem
// Sieg von 14:32 am Ende, der die Serie beendet hat und von dem die Karte gar
// nicht erzählt.
function _newsRecentForm(pid, n, bis){
  const arr = [];
  const d = (bis && bis.dataRef) || {};
  let start = matches.length - 1;
  if(d.matchId){
    const k = matches.findIndex(m => m.id === d.matchId);
    if(k >= 0) start = k;
  } else if(bis && bis.when){
    const t = new Date(bis.when).getTime();
    while(start >= 0 && new Date(matches[start].created_at).getTime() > t) start--;
  }
  for(let i = start; i >= 0 && arr.length < n; i--){
    if(matchOf(pid, matches[i])) arr.unshift(matches[i]);
  }
  if(!arr.length) return {strip:'', currentStreak:0};
  const strip = arr.map(m => {
    const w = won(pid, m);
    return `<div class="nd-form-dot ${w?'w':'l'}" title="${w?'Sieg':'Niederlage'}"></div>`;
  }).join('');
  // Aktuelle Sieges-Streak (von hinten zählen)
  let curStreak = 0;
  for(let i = arr.length - 1; i >= 0; i--){
    if(won(pid, arr[i])) curStreak++;
    else break;
  }
  return {strip, currentStreak: curStreak};
}

// H2H-Bilanz Spieler A vs Spieler B (egal welche Teamkonstellation).
// Iteriert einmal über matches; bei großen Datensätzen kann das auf
// getPairsCache umgestellt werden — derzeit aber günstig genug.
// H2H-Lazy-Cache (v8.4): Statt für jedes Detail ALLE matches zu walken
// (O(N) pro Lookup → bei 100k Matches teuer), wird beim ersten H2H-Lookup
// EINE Map über alle Spieler-Paarungen gebaut und gecached. Danach ist jeder
// _newsH2HRecord-Lookup O(1). Build-Kosten: einmalig O(N × 4) (4 Kreuz-Paare
// pro Match), amortisiert über alle Detail-Aufrufe.
// Key bindet an matches.length + _cache.version → invalidateCache(['news'])
// (§3) löscht _h2hMap/_h2hKey, der Version-Tick bricht den Key zusätzlich.
function _ensureH2HMap(){
  const key = 'h2h_' + matches.length + '_' + _cache.version;
  if(_cache._h2hKey === key && _cache._h2hMap) return _cache._h2hMap;
  const map = new Map();
  for(let i = 0; i < matches.length; i++){
    const m = matches[i];
    const sideA = [m.a1, m.a2], sideB = [m.b1, m.b2];
    const ts = mts(m);
    const aWon = m.winner === 'A';
    // Alle 4 Kreuz-Paare (je 1 Spieler aus A gegen 1 aus B) sind H2H-Gegner.
    for(let x = 0; x < 2; x++){
      for(let y = 0; y < 2; y++){
        const pa = sideA[x], pb = sideB[y];
        if(!pa || !pb) continue;
        const k = pa < pb ? pa + '|' + pb : pb + '|' + pa;
        let e = map.get(k);
        if(!e){ e = {wins:{}, lastMatchId:null, lastTs:0}; map.set(k, e); }
        const winnerPid = aWon ? pa : pb;
        e.wins[winnerPid] = (e.wins[winnerPid] || 0) + 1;
        if(ts > e.lastTs){ e.lastTs = ts; e.lastMatchId = m.id; }
      }
    }
  }
  _cache._h2hKey = key;
  _cache._h2hMap = map;
  return map;
}
function _newsH2HRecord(aPid, bPid){
  const map = _ensureH2HMap();
  const k = aPid < bPid ? aPid + '|' + bPid : bPid + '|' + aPid;
  const e = map.get(k);
  if(!e) return {aWins:0, bWins:0, lastMatchId:null};
  // aWins/bWins richten sich nach der Aufruf-Reihenfolge (nicht nach dem
  // kanonischen Map-Key) → korrekt unabhängig von der Argument-Sortierung.
  return {aWins: e.wins[aPid] || 0, bWins: e.wins[bPid] || 0, lastMatchId: e.lastMatchId};
}

// Die Partien bis zu der, von der eine Story erzählt. Ein Blatt, das neben
// „100 Spiele" die Bilanz von HEUTE nennt („221 / 134"), widerspricht sich
// selbst; dasselbe bei der gemeinsamen Bilanz unter einer Duo-Serie.
function _ndBisPartie(s){
  const d = (s && s.dataRef) || {};
  if(d.matchId){
    const k = matches.findIndex(m => m.id === d.matchId);
    if(k >= 0) return matches.slice(0, k + 1);
  }
  if(s && s.when){
    const t = new Date(s.when).getTime();
    return matches.filter(m => new Date(m.created_at).getTime() <= t);
  }
  return matches;
}
function _ndBilanzBis(pid, s){
  let wins = 0, losses = 0;
  _ndBisPartie(s).forEach(m => { if(!matchOf(pid, m)) return; if(won(pid, m)) wins++; else losses++; });
  const total = wins + losses;
  return total ? {wins, losses, winRate: Math.round(wins / total * 100)} : null;
}

// ─── Hookup: News-Button-Click + Backdrop-Close ──────────────────────
(function attachNewsHandlers(){
  const ready = () => {
    const btn = document.getElementById('newsBtn');
    if(btn && !btn._newsBound){
      btn._newsBound = true;
      // Der Knopf öffnet direkt den vollen Feed; eine zweite, einfachere
      // Kartenform davor wäre ein zweites Bauteil für dieselbe Aussage [§C27].
      btn.onclick = openNewsFeed;
    }
    // ndBg (Story-Detail): KEIN Backdrop-Close (User-Wunsch v8.1): Stories
    // sollen bewusst konsumiert werden → nur X-Button oder der
    // „Schließen"-Knopf unten beenden den Detail-View.
    const ndBg = document.getElementById('ndBg');
    if(ndBg && !ndBg._newsBound){
      ndBg._newsBound = true;
      // Backdrop-Click schließt das Detail NICHT mehr — bewusstes Schließen
      // erfolgt nur via X-Button oder Schließen-Button.
    }
  };
  if(document.readyState !== 'loading') ready();
  else document.addEventListener('DOMContentLoaded', ready);
})();

