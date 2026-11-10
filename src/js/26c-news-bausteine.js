// ─── §11.0i — Bausteine des Generators ──────────────────────────────────
// Rekorde aller Zeiten, Meilensteinleitern, Aufzählungen und kleine Sätze,
// die _buildStories (27-news-generator.js) und andere Story-Dateien teilen.
// v9.4: All-Time-Ligarekorde für Breaking News (Elo-Höchststand & längste
// Siegesserie), plus der Zeitpunkt (Match), an dem der aktuelle Rekord
// aufgestellt wurde. Ein O(N_matches)-Lauf, gecacht per matches.length+version.
//   • Elo: aus globalSim.history (season-isoliertes eloAfter) — der höchste je
//     erreichte Wert und das Match, das ihn zuletzt neu setzte.
//   • Serie: eigener Karriere-Walk (kein Saison-Reset — „jemals").
function _allTimeRecords(){
  const key = 'allTimeRec_'+matches.length+'_'+_cache.version;
  if(_cache._allTimeRecKey === key) return _cache._allTimeRec;
  const startElo = cfg.start_elo ?? 0;
  let eloRec = null;    // {val, pid, matchId}
  let streakRec = null; // {val, pid, matchId}
  try {
    const sim = getGlobalSim();
    let runMax = startElo;
    for(const h of (sim.history || [])){
      const after = h.eloAfter;
      if(!after) continue;
      for(const pid in after){
        if(after[pid] > runMax + 1e-6){
          runMax = after[pid];
          eloRec = { val: Math.round(after[pid]), pid, matchId: h.matchId };
        }
      }
    }
  } catch(e){}
  try {
    const cur = {};
    let maxStreak = 0;
    for(const m of matches){
      const aWon = m.winner === 'A';
      const sides = [[m.a1, m.a2, aWon], [m.b1, m.b2, !aWon]];
      for(const [x, y, won] of sides){
        for(const id of [x, y]){
          if(!id) continue;
          cur[id] = won ? (cur[id] || 0) + 1 : 0;
          if(cur[id] > maxStreak){ maxStreak = cur[id]; streakRec = { val: cur[id], pid: id, matchId: m.id }; }
        }
      }
    }
  } catch(e){}
  // Zeitstempel des Rekord-Matches nachtragen.
  const mm = {};
  for(const m of matches) mm[m.id] = m;
  if(eloRec && mm[eloRec.matchId]) eloRec.when = mm[eloRec.matchId].created_at;
  if(streakRec && mm[streakRec.matchId]) streakRec.when = mm[streakRec.matchId].created_at;
  const result = { eloRec, streakRec };
  _cache._allTimeRecKey = key;
  _cache._allTimeRec = result;
  return result;
}

// ─── §11.0f — Unbegrenzte Meilenstein-Leiter (v9.5) ──────────────────
// Ersetzt feste Schwellen-Arrays (…, 500, 1000 → ENDE) durch eine Leiter
// nach dem 1–2.5–5 ×10^k-Muster: 10, 25, 50, 100, 250, 500, 1000, 2500,
// 5000, 10000, 25000, 50000, … So laufen Meilensteine bei hohen Zahlen
// sinnvoll weiter, statt an einer Obergrenze zu enden.
//   `_ladderCrossing(before, after, min)` = die höchste Leiter-Marke, die
//   zwischen `before` (exkl.) und `after` (inkl.) NEU überschritten wurde,
//   sonst null. So feuert eine Meilenstein-News genau auf dem Match, das die
//   Marke reißt — idempotent (ID enthält die Marke) und ohne Verlaufs-Backfill.
function _ladderCrossing(before, after, min){
  min = min || 1;
  if(!Number.isFinite(after) || after < min) return null;
  let hit = null, p = 1;
  while(p <= after){
    for(const r of [1, 2.5, 5]){
      const v = r * p;
      if(Number.isInteger(v) && v >= min && v > before && v <= after){
        if(hit === null || v > hit) hit = v;
      }
    }
    p *= 10;
  }
  return hit;
}

// Eine runde Zahl: die Leiter ab `min` (10, 25, 50, 100, 250 …) und jede
// fünfzigste ab 50. Die 150. und 450. Partie zählte vorher nur das Zählwerk
// eines Fußes, ohne eigene Meldung.
function _rundeMarke(n, min){
  return n >= min && (n % 50 === 0 || _ladderCrossing(n - 1, n, min) === n);
}

// Ambient-Tag (v9.6): Fun Facts erscheinen TÄGLICH (um 19:00). Früher (v9.5)
// nur alle 2 Tage über einen geraden Epoch-Tagesindex — jetzt ist jeder Tag ein
// Ambient-Tag, damit jeden Abend genau 1 Fun Fact kommt. Die Story-ID bleibt
// tages-deterministisch (`ambient_<datum>_19`) → geräteübergreifend identisch.
function _isAmbientDay(d){
  return true;
}

// ─── §11.0g — Persönliche Elo-Meilensteine (v9.5) ────────────────────
// Allzeit-Höchst-Elo eines Spielers überschreitet eine runde 100er-Marke
// (ab Start-Elo + 200, danach unbegrenzt: 1200, 1300, 1400, …). Ein
// O(N)-Walk über die (saison-isolierte) Elo-Historie, gecacht per
// matches.length + _cache.version. Liefert pro (Spieler, Marke) das Match,
// das die Marke erstmals riss — der Generator filtert danach auf „kürzlich".
function _eloMilestones(){
  const key = 'eloMile_'+matches.length+'_'+_cache.version;
  if(_cache._eloMileKey === key) return _cache._eloMile;
  const startElo = cfg.start_elo ?? 1000;
  const floor0 = startElo + 200;          // erste Marke
  const markOf = v => { const m = Math.floor(v/100)*100; return m >= floor0 ? m : null; };
  const out = [];
  try {
    const sim = getGlobalSim();
    const mm = {};
    for(const m of matches) mm[m.id] = m;
    const runMax = {};    // pid → laufendes Allzeit-Peak
    const firedFor = {};  // pid → höchste bereits erfasste Marke
    for(const h of (sim.history || [])){
      const after = h.eloAfter;
      if(!after) continue;
      for(const pid in after){
        const v = after[pid];
        if(v <= (runMax[pid] ?? startElo)) continue;
        runMax[pid] = v;
        const mark = markOf(v);
        if(mark != null && mark > (firedFor[pid] || 0)){
          firedFor[pid] = mark;
          out.push({ pid, mark, matchId: h.matchId, when: mm[h.matchId] ? mm[h.matchId].created_at : null, val: Math.round(v) });
        }
      }
    }
  } catch(e){}
  _cache._eloMileKey = key;
  _cache._eloMile = out;
  return out;
}

// Iteriert genau einmal über bestehende Caches. Gibt ein Array von
// Story-Objekten {id, cat, ic, title, desc, when, prio, dataRef} zurück.
// Performance: O(N_matches) — dominante Kosten durch top-form-Filterung,
// die aber auf die letzten 10 Matches pro Spieler eingeschränkt ist.
// ── Was ist an einem Rekord passiert? ────────────────────────────────
// Drei Aussagen, und die dritte war richtungsblind: „ausgebaut" feuerte,
// sobald sich die ANGEZEIGTE Zahl änderte — egal wohin. „Der Fels" ging von
// 6,9 auf 7,0 Gegentore und „Der Platzhirsch" von 44 auf 42 Prozent, beides
// eine Verschlechterung, und beides stand als „baut seinen Rekord aus" im
// Feed. Wer den Rekord weiter hält, ihn aber verschlechtert, ist keine
// Nachricht: er hat nichts getan, die anderen sind nur nicht vorbeigezogen.
//
// `val` ist der Sortierwert der Bestenliste, groß heißt besser — daran
// entscheidet sich die Richtung. Dass die Zahl SICHTBAR anders sein muss,
// bleibt: ein Anteil rückt an fast jedem Spieltag um ein Tausendstel weiter,
// und das ergab neun Karten an einem Morgen, auf denen dieselbe Zahl stand.
// ── Was ist mit einem Halterfeld passiert? ───────────────────────────
// Vier Faelle, und sie gelten fuer den Liga-Rekord wie fuer die Monatschronik
// [§C27]: beide Felder werden im Lauf eines Tages enger und weiter. Der Rekord
// kannte nur „uebernommen", und damit stand „Leon uebernimmt ‚Der Aufschwung'.
// Vorher hielt Leon, Jannik und Stefan den Rekord mit +8 %" im Feed — Leon
// uebernahm von sich selbst, und aus drei Namen wurde ein „hielt". Beim
// Dazukommen war es noch schiefer: „Martin und Leo uebernehmen ‚Das
// Sonntagskind'. Vorher hielt Leo den Rekord mit 70 %" — Leo haelt ihn
// weiterhin, sein Wert ist nur auf 67 % gefallen und Martin gleichgezogen.
// Gemessen taten das vier Karten der Ligageschichte.
function _halterFall(alt, neu){
  const a = (alt || []).filter(Boolean), n = (neu || []).filter(Boolean);
  if(!a.length) return 'erstmals';
  const neuLeute = n.filter(id => a.indexOf(id) < 0);
  if(!neuLeute.length) return 'allein';        // das Feld ist enger geworden
  return a.every(id => n.indexOf(id) >= 0) ? 'dazu' : 'uebernommen';
}

function _rekordArt(alt, neu){
  if(!neu) return '';
  if(!alt) return 'erstmals';
  // SORTIERT vergleichen. Die beiden Listen kommen aus zwei getrennten
  // Durchläufen, und ihre Reihenfolge muss nicht dieselbe sein: „Maxi, Leo
  // und Julian übernehmen" stand im Feed, und darunter „Vorher gehörte er
  // Maxi, Julian und Leo" — dieselben drei, nur anders sortiert.
  const k = a => (a || []).slice().sort().join(',');
  if(k(alt.pids) !== k(neu.pids)) return 'geholt';
  if(_chronKurz(alt.ev) === _chronKurz(neu.ev)) return '';
  return (neu.val > alt.val) ? 'gesteigert' : '';
}

// Namen als Aufzählung: „Maxi, Julian und Leo". Mit `&` zwischen jedem Paar
// las sich eine Dreiergruppe wie eine Formel.
function _namenListe(namen){
  const a = (namen || []).filter(Boolean);
  if(a.length <= 1) return a[0] || '';
  return a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1];
}

// Zahlwörter bis vier, darüber die Ziffer. Große Tafel-Momente dürfen mehr
// Zeilen tragen; ab fünf ist die Ziffer im kurzen Fließtext besser lesbar.
// Der erste Satz eines Textes. Auf einer Sammelkarte gehoert nur er dem
// Kopf; alles danach ist ein Detail zu einer von vier Meldungen.
// Abkuerzungen mit Punkt gibt es in diesen Texten nicht, ein Datum wie
// „29.07." aber schon — deshalb wird nur an einem Punkt getrennt, auf den
// ein Leerzeichen und ein Grossbuchstabe folgt.
function _ersterSatz(txt){
  const s = String(txt || '').trim();
  const m = s.match(/^([\s\S]*?[.!?])\s+[A-ZÄÖÜ]/);
  return m ? m[1] : s;
}
// `gross` für den Satzanfang: „drei Siege in Folge." stand klein am Anfang
// der Beschreibung.
function _zahlwortDe(n, gross){
  const w = ['', 'ein', 'zwei', 'drei', 'vier'][n] || String(n);
  return gross ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

// Dieselbe Aufzählung, aber für eine Schlagzeile gedeckelt. Über einer Karte,
// die von drei Leuten handelte, stand „Leon und Martin bewegen die Ewige
// Tafel": die Überschrift nannte zwei der drei, und der dritte kam nur in der
// Liste darunter vor. Genannt werden jetzt alle, und ab dem vierten zählt die
// Zeile den Rest — sonst sprengt eine Sammelkarte mit sechs Beteiligten jede
// Schlagzeile.
function _namenKurz(namen, max){
  const a = (namen || []).filter(Boolean);
  const m = max || 3;
  if(a.length <= m) return _namenListe(a);
  return a.slice(0, m - 1).join(', ') + ' und ' + _zahlwortDe(a.length - (m - 1)) + ' weitere';
}

// Ein Beleg wie „20 % aller 25 Siege endeten 10:9 · 5" ist für eine Liste
// gebaut: der Mittelpunkt trennt dort zwei Spalten. Im Fließtext einer
// Nachricht steht er mitten im Satz und liest sich wie ein Tippfehler.
// ─── Welche Chronik steht wirklich in der Tafel ────────────────
// Ein Spieler zeigt je Monat nur EINEN Chronik-Eintrag [§C32]:
// `seasonTitleOf` liefert den ersten in Katalogreihenfolge, und die ist die
// Wertigkeit. Wer im selben Monat mehrere holt, sah auf der Karte nicht,
// welcher davon in der Tafel landet — „Martin holt zwei Monatschroniken"
// zählte beide auf und ließ offen, welche ihn im Profil beschreibt.
// Beantwortet wird die Frage nur für einen ALLEIN stehenden Halter: bei
// mehreren wäre „steht in der Chronik" eine Behauptung über alle [§C33].
// Und nur, wenn es überhaupt etwas zu unterscheiden gibt — bei einer
// einzigen Chronik im Monat ist die Antwort offensichtlich.
// Derselbe Zeitschnitt wie beim Prestige-Satz: die Funktion las den Stand von
// HEUTE, der Satz darunter den vom letzten Spieltag. Zwei Rechnungen ueber
// dieselbe Frage nennen irgendwann zwei verschiedene Eintraege, und dann stand
// „Steht jetzt in der Chronik" neben „In der Chronik bleibt ‚X' staerker" —
// beides ueber denselben Spieler, denselben Monat, auf einer Karte.
function _chronikZeigtSich(pids, sid, titleId, bisMs){
  if(!Array.isArray(pids) || pids.length !== 1) return null;
  try {
    const alle = (seasonTitles(sid, bisMs).awarded || []).filter(a => a.pid === pids[0]);
    if(alle.length < 2) return null;
    const gezeigt = seasonTitleOf(pids[0], sid, bisMs);
    if(!gezeigt) return null;
    return {zeigt: gezeigt.titleId === titleId, welche: gezeigt.name,
            andere: alle.filter(a => a.titleId !== gezeigt.titleId).map(a => a.name)};
  } catch(e){ return null; }
}

// `gross` am Satzanfang: „auf 15 Partien 1,2 %-Punkte neben 31,0 %." begann
// die Beschreibung einer Chronik klein.
function _evSatz(ev, gross){
  const s = String(ev || '').replace(/\s*·\s*/g, ', ').trim();
  return gross ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

