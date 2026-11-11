// ╔═══ §3.4 ─── STATS ENGINE ───────────────────────────────────────────╗
//     Siegquote, Sätze, Games, Tiebreaks, Bagels, Seiten (Drive/Revés),
//     Partner und Gegner je Spieler.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Die leere Bilanz eines Spielers. gf/ga sind Games (dafür und dagegen),
// sf/sa Sätze; je Seite zählen Matches, Siege und Games, damit die Seiten-
// Ansicht den Game-Anteil rechts und links zeigen kann.
function _statLeer(){
  return {games:0,wins:0,losses:0,gf:0,ga:0,sf:0,sa:0,
    drvG:0,drvW:0,revG:0,revW:0,drvGf:0,drvGa:0,revGf:0,revGa:0,
    tbW:0,tbL:0,bagelsFor:0,bagelsAgainst:0,zuNullW:0,zuNullL:0,
    umkG:0,umkW:0,wenden:0,
    mates:{},opps:{},best:-1e9,worst:1e9,curStreak:0};
}
// Ein Match in die Bilanz eines Spielers zählen. Eine Stelle für den
// einzelnen Spieler und den Durchlauf über alle [§C27]; vorher stand die
// Zählung dreimal da, für Team A, Team B und den Einzelfall.
function _statZaehlen(s, m, id, run){
  const team = teamVon(m, id); if(!team) return run;
  const f = partieFuer(m, team), p = partie(m), won = f.won;
  const pos = seiteVon(m, id);
  s.games++; s.gf += f.gamesFor; s.ga += f.gamesAgainst; s.sf += f.setsFor; s.sa += f.setsAgainst;
  s.tbW += f.tbWon; s.tbL += f.tbLost; s.bagelsFor += f.bagelsFor; s.bagelsAgainst += f.bagelsAgainst;
  // Zu Null ist ein Satz 6:0 [§1.3]. Umkämpft und die Wende reichen über
  // mehrere Sätze: nur am letzten Satz einer Begegnung, aus Sicht der
  // Begegnung — ihr Sieger ist nicht immer der des letzten Satzes.
  if(p.zuNull){ if(won) s.zuNullW++; else s.zuNullL++; }
  const bg = begegnungAm(m), bgW = bg.winner === team;
  if(bg.umkaempft){ s.umkG++; if(bgW) s.umkW++; }
  if(bg.wende && bgW) s.wenden++;
  if(won){ s.wins++; run = run >= 0 ? run + 1 : 1; } else { s.losses++; run = run <= 0 ? run - 1 : -1; }
  if(pos === 'drive'){ s.drvG++; if(won) s.drvW++; s.drvGf += f.gamesFor; s.drvGa += f.gamesAgainst; }
  else               { s.revG++; if(won) s.revW++; s.revGf += f.gamesFor; s.revGa += f.gamesAgainst; }
  const mate = team === 'A' ? (id === m.a1 ? m.a2 : m.a1) : (id === m.b1 ? m.b2 : m.b1);
  if(!s.mates[mate]) s.mates[mate] = {g:0,w:0};
  s.mates[mate].g++; if(won) s.mates[mate].w++;
  (team === 'A' ? [m.b1, m.b2] : [m.a1, m.a2]).forEach(o => {
    if(!s.opps[o]) s.opps[o] = {g:0,w:0};
    s.opps[o].g++; if(won) s.opps[o].w++;
  });
  const d = (m.deltas && m.deltas[id]) || 0;
  if(d > s.best) s.best = d; if(d < s.worst) s.worst = d;
  return run;
}
function _statAbschluss(s, run){
  s.curStreak = run;
  s.wr = s.games ? s.wins / s.games : 0;
  s.drvWr = s.drvG ? s.drvW / s.drvG : null;
  s.revWr = s.revG ? s.revW / s.revG : null;
  // Game-Anteil je Seite: welcher Teil der Games auf dieser Seite an das
  // eigene Team ging. Die Seiten-Ansicht wiegt ihn neben der Siegquote.
  s.drvAnteil = s.drvGf + s.drvGa ? s.drvGf / (s.drvGf + s.drvGa) : null;
  s.revAnteil = s.revGf + s.revGa ? s.revGf / (s.revGf + s.revGa) : null;
  s.gd = s.gf - s.ga;
  s.satzQuote = s.sf + s.sa ? s.sf / (s.sf + s.sa) : null;
  s.tbQuote = s.tbW + s.tbL ? s.tbW / (s.tbW + s.tbL) : null;
  return s;
}

// matchSubset optional — ohne Angabe alle Matches, dann aus dem Topf.
function playerStats(id, matchSubset){
  const ms = matchSubset || matches;
  if (ms === matches) {
    const allStats = allPlayerStats();
    // Eine Kopie: `bestWorstMate` und `nemesis` lesen nur, aber ein Aufrufer,
    // der schreibt, verdürbe sonst den Topf.
    if (allStats[id]) return { ...allStats[id] };
  }
  const s = _statLeer();
  let run = 0;
  ms.forEach(m => { run = _statZaehlen(s, m, id, run); });
  return _statAbschluss(s, run);
}

// Alle Spieler auf einmal, in einem Durchlauf über die Matches und gemerkt;
// playerStats(id) liest daraus, wenn nach allen Matches gefragt wird.
function allPlayerStats(){
  const key='allStats_'+matches.length+'_'+_cache.version;
  if(_cache._allStatsKey===key) return _cache._allStatsData;
  // Die Laufbahn ist Geschichte: auch ein Ruheständler behält seine Zahlen
  // fürs Profil [§C40]. Wer im Seiten-Reiter mitvergleicht, filtert dort.
  const stats={}, run={};
  players.filter(p=>sichtbar(p)).forEach(p=>{ stats[p.id]=_statLeer(); run[p.id]=0; });
  const ordered=[...matches].sort((a,b)=>mts(a)-mts(b));
  for(const m of ordered){
    for(const id of [m.a1,m.a2,m.b1,m.b2]){
      if(stats[id]) run[id] = _statZaehlen(stats[id], m, id, run[id]);
    }
  }
  Object.keys(stats).forEach(id => _statAbschluss(stats[id], run[id]));
  _cache._allStatsKey=key;
  _cache._allStatsData=stats;
  return stats;
}

// Bester und schwächster Partner, Lieblings- und Angstgegner sind ein
// Vergleich über die Laufbahn [§C40]: `wer` sagt, wer darin mitzählt. Im
// Profil eines Aktiven ist das die Liga von heute (`ligaAktiv`) — dort stand
// sonst ein Ruheständler als bester Partner, mit dem niemand mehr spielt,
// und verdrängte den besten, mit dem man noch spielt. Die Bilanz mit jedem
// steht weiter in „alle Beziehungen" (`playerH2HList`), die fragt nicht.
function bestWorstMate(id, s_param, wer){
  const s= s_param || playerStats(id); // Nutzt übergebene Stats oder berechnet neu (was jetzt gecacht ist)
  let best=null,worst=null;
  Object.entries(s.mates).forEach(([mid,v])=>{ if(v.g<2)return; if(wer&&!wer(mid))return; const wr=v.w/v.g;
    if(!best||wr>best.wr)best={mid,wr,g:v.g}; if(!worst||wr<worst.wr)worst={mid,wr,g:v.g}; });
  return {best,worst};
}
function nemesis(id, s_param, wer){
  const s= s_param || playerStats(id); // Nutzt übergebene Stats oder berechnet neu (was jetzt gecacht ist)
  let n=null,f=null;
  Object.entries(s.opps).forEach(([oid,v])=>{ if(v.g<2)return; if(wer&&!wer(oid))return; const wr=v.w/v.g;
    if(!n||wr<n.wr)n={oid,wr,g:v.g}; if(!f||wr>f.wr)f={oid,wr,g:v.g}; });
  return {nemesis:n,favorite:f};
}


function teamStats(){
  const key='allTeamStats_'+matches.length+'_'+_cache.version;
  if(_cache._allTeamStatsKey===key) return _cache._allTeamStatsData;

  // Dieselbe Zählung wie für jeden Ausschnitt (`teamStatsFromMatches`), hier
  // über alle Partien und gemerkt. Sie stand zweimal Wort für Wort da.
  const result = teamStatsFromMatches(matches);
  _cache._allTeamStatsKey = key;
  _cache._allTeamStatsData = result;
  return result;
}


// Detaillierte Team-Stats für das Team-Profil-Sheet.
// Ein Walk durch alle Matches → komplettes Detail.
//
// Der Schlüssel trägt die Cache-Version, wie überall sonst. Er tat es nicht,
// obwohl der Kommentar darüber es behauptete: geleert wurde der Topf nur über
// den Tag 'teams', und den reicht der Eingabe-Tab beim Speichern nicht mit.
// Wer ein Duo-Profil offen hatte und danach eine Partie eintrug, sah gemessen
// weiter 26:4 statt 27:4. Mit der Version im Schlüssel kann keine Tag-Liste
// das mehr vergessen.
function teamDetail(p1,p2){
  const ids=[p1,p2].sort();
  const key=ids.join('|')+'_'+matches.length+'_'+_cache.version;
  if(!_cache._teamDetail) _cache._teamDetail={};
  if(_cache._teamDetail[key]) return _cache._teamDetail[key];
  // Mit der Version im Schlüssel wächst der Topf sonst über jede Version mit.
  _topfDeckel(_cache._teamDetail, 80);

  let wins=0,losses=0,gf=0,ga=0,eloDelta=0;
  const oppStats={}; // einzelner Gegnerspieler → {g,w}
  const teamMatches=[]; // Matches in denen das Duo zusammen gespielt hat
  let biggestWin=null, biggestLoss=null, biggestUpset=null;
  // Seiten-Tracking für ids[0]; ids[1] steht immer auf der anderen Seite.
  let p0Atk=0, p0Def=0;
  // Aufstellungs-Quote pro Variante (für "Beste Aufstellung")
  let p0AtkWins=0, p0DefWins=0;
  // Fun-Facts: Zu Null (alle Sätze gewonnen, mindestens zwei), Doppel-
  // Bagel, Tiebreaks und das häufigste Satzergebnis.
  let shutouts=0, shutoutsAgainst=0, perfectWins=0, tbW=0, tbL=0, sf=0, sa=0;
  let scoreCounts={};   // Satzergebnis aus Sicht des Duos → Anzahl

  for(const m of matches){
    const onA=(m.a1===ids[0]&&m.a2===ids[1])||(m.a1===ids[1]&&m.a2===ids[0]);
    const onB=(m.b1===ids[0]&&m.b2===ids[1])||(m.b1===ids[1]&&m.b2===ids[0]);
    if(!onA&&!onB) continue;
    const won=(onA&&m.winner==='A')||(onB&&m.winner==='B');
    const fd=partieFuer(m, onA?'A':'B'), pd=partie(m);
    const myGf=fd.gamesFor, myGa=fd.gamesAgainst;
    const diff=myGf-myGa;
    const expected=myExp(ids[0],m);
    const t=mts(m);

    // Position von ids[0] in diesem Match bestimmen
    const slot = onA
      ? (m.a1===ids[0] ? 'a1' : 'a2')
      : (m.b1===ids[0] ? 'b1' : 'b2');
    const p0Pos = m[slot+'_side'] || 'drive';
    if(p0Pos==='drive'){ p0Atk++; if(won) p0AtkWins++; }
    else             { p0Def++; if(won) p0DefWins++; }

    gf+=myGf; ga+=myGa;
    if(won) wins++; else losses++;
    const opps=onA?[m.b1,m.b2]:[m.a1,m.a2];
    opps.forEach(oid=>{
      if(!oppStats[oid]) oppStats[oid]={g:0,w:0};
      oppStats[oid].g++; if(won) oppStats[oid].w++;
    });

    teamMatches.push({m,onA,won,myGf,myGa,diff,expected,t});

    // Fun-Facts-Tracking
    // Zu Null je Satz [§1.3]; der Doppel-Bagel ist ein Match mit zwei davon.
    if(pd.zuNull){ if(won) shutouts++; else shutoutsAgainst++; }
    const bg=begegnungAm(m);
    if(bg.doppelBagel && bg.winner===(onA?'A':'B')) perfectWins++;
    tbW+=fd.tbWon; tbL+=fd.tbLost; sf+=fd.setsFor; sa+=fd.setsAgainst;
    const umdrehen = (pd.winner==='A') !== onA;
    satzErgebnisse(m).forEach(x => {
      const k = umdrehen ? x.split(':').reverse().join(':') : x;
      scoreCounts[k] = (scoreCounts[k]||0) + 1;
    });

    if(won){
      if(!biggestWin || diff>biggestWin.diff || (diff===biggestWin.diff && t>biggestWin.t)){
        biggestWin={m,diff,t,score:standFuer(m, won)};
      }
      if(!biggestUpset || expected<biggestUpset.expected || (expected===biggestUpset.expected && t>biggestUpset.t)){
        biggestUpset={m,expected,t,score:standFuer(m, won)};
      }
    } else {
      const lossDiff=-diff;
      if(!biggestLoss || lossDiff>biggestLoss.lossDiff || (lossDiff===biggestLoss.lossDiff && t>biggestLoss.t)){
        biggestLoss={m,lossDiff,t,score:standFuer(m, won)};
      }
    }
  }

  // Erz-/Lieblingsgegner: einzelne Spieler, min. 2 Begegnungen. Spielen
  // beide noch, ist es ein Vergleich mit der Liga von heute [§C40] und nennt
  // keinen Ruheständler; ein Duo mit einem Ruheständler ist Geschichte und
  // behält seine Gegner, wie sie waren.
  const gegnerZaehlt = imRuhestand(p1) || imRuhestand(p2) ? sichtbar : ligaAktiv;
  let nemesis=null, favorite=null;
  Object.entries(oppStats).forEach(([oid,s])=>{
    if(s.g<2 || !gegnerZaehlt(oid)) return;
    const wr=s.w/s.g;
    if(!nemesis || wr<nemesis.wr || (wr===nemesis.wr && s.g>nemesis.g)) nemesis={oid,wr,g:s.g,w:s.w};
    if(!favorite || wr>favorite.wr || (wr===favorite.wr && s.g>favorite.g)) favorite={oid,wr,g:s.g,w:s.w};
  });
  if(nemesis && favorite && nemesis.oid===favorite.oid){ favorite=null; }

  // Upset nur zeigen wenn tatsächlich ein Underdog-Sieg (Erwartung < 45%)
  if(biggestUpset && biggestUpset.expected>=0.45) biggestUpset=null;

  // ═══ STREAKS (chronologisch) ═══
  const chronoMatches=[...teamMatches].sort((a,b)=>a.t-b.t);
  let currentStreak=0; // positiv=Sieges-, negativ=Niederlagen-Serie
  let longestWinStreak=0, longestLossStreak=0;
  let curWin=0, curLoss=0;
  chronoMatches.forEach(tm=>{
    if(tm.won){
      curWin++; if(curWin>longestWinStreak) longestWinStreak=curWin;
      curLoss=0;
    } else {
      curLoss++; if(curLoss>longestLossStreak) longestLossStreak=curLoss;
      curWin=0;
    }
  });
  // Aktuell-Streak: laufender Wert nach dem letzten Spiel
  if(chronoMatches.length){
    const last=chronoMatches[chronoMatches.length-1];
    currentStreak = last.won ? curWin : -curLoss;
  }

  // Letzte 10 Matches (neueste zuerst) — vorher waren es 5
  const recent=[...teamMatches].sort((a,b)=>b.t-a.t).slice(0,10);

  // ═══ KONSISTENTE ELO-BERECHNUNG ═══
  const globalSim=getGlobalSim();
  const teamKey=paarKey(ids[0], ids[1]);
  const consistentEloDelta=Math.round(globalSim.teamElo[teamKey]||0);

  const games=teamMatches.length;
  // ═══ AUFSTELLUNGS-ANALYSE ═══
  // Typische Aufstellung = häufigere; Beste Aufstellung = höhere Siegrate.
  // "Beste" wird nur angezeigt, wenn (a) beide Aufstellungen je ≥2× vorkamen
  // (Mindestschwelle für stabile Quote) und (b) die "Beste" tatsächlich
  // VON DER TYPISCHEN ABWEICHT (= seltenere Aufstellung mit besserer Quote).
  const p0Dom = p0Atk>=p0Def ? 'drive' : 'reves';
  const dominantCount = Math.max(p0Atk, p0Def);
  const swapped = Math.min(p0Atk, p0Def);
  const posStats = {
    [ids[0]]: {drive:p0Atk, reves:p0Def, dom:p0Dom},
    [ids[1]]: {drive:p0Def, reves:p0Atk, dom:p0Dom==='drive'?'reves':'drive'}
  };
  // Aufstellungs-Siegraten (nur wenn jede Variante ≥2× vorkam)
  let bestLineup = null;
  if(p0Atk>=2 && p0Def>=2){
    const drvWr = p0AtkWins/p0Atk;
    const revWr = p0DefWins/p0Def;
    const bestP0Pos = drvWr >= revWr ? 'drive' : 'reves';
    if(bestP0Pos !== p0Dom){ // nur wenn anders als typische
      bestLineup = {
        p0: bestP0Pos,
        wr: bestP0Pos==='drive' ? drvWr : revWr,
        wins: bestP0Pos==='drive' ? p0AtkWins : p0DefWins,
        games: bestP0Pos==='drive' ? p0Atk : p0Def,
        // Vergleichswert: wie viel besser als typische?
        typicalWr: p0Dom==='drive' ? drvWr : revWr
      };
    }
  }

  // Chronologisch sortierte Match-IDs für den Form-Spark (älteste zuerst)
  const matchIdsChrono = chronoMatches.map(tm=>tm.m.id);

  // ═══ GEMEINSAME SAISON-TITEL ═══
  // Team of the Season aus seasons[]: team_p1/team_p2 sind die archivierten Sieger-Duo-IDs
  const seasonTitles = seasons.filter(srow => {
    if(!srow.team_p1 || !srow.team_p2) return false;
    const t1 = srow.team_p1, t2 = srow.team_p2;
    return (t1===ids[0] && t2===ids[1]) || (t1===ids[1] && t2===ids[0]);
  }).map(srow => {
    let label = srow.id || '';
    if(srow.id){
      const [y, mo] = srow.id.split('-').map(Number);
      if(y && mo) label = new Date(y, mo-1, 1).toLocaleDateString('de-DE', {month:'long', year:'numeric'});
    }
    return { id: srow.id, label };
  });

  // ═══ HÄUFIGSTES SATZERGEBNIS ═══
  let topScore = null, topScoreCount = 0;
  Object.entries(scoreCounts).forEach(([s, c]) => {
    if(c > topScoreCount){ topScoreCount = c; topScore = s; }
  });
  // Nur als "Lieblings-Score" anzeigen, wenn er ≥2× vorkam
  if(topScoreCount < 2) topScore = null;

  // Erstes/letztes gemeinsames Match-Datum (für "aktiv seit")
  const firstMatchDate = chronoMatches.length ? chronoMatches[0].m.created_at : null;
  const lastMatchDate  = chronoMatches.length ? chronoMatches[chronoMatches.length-1].m.created_at : null;

  const result={
    ids, games, wins, losses, gf, ga,
    gd: gf-ga,
    wr: games?wins/games:0,
    eloDelta: consistentEloDelta,
    nemesis, favorite,
    biggestWin, biggestLoss, biggestUpset,
    recent,
    posStats, dominantCount, swapped, bestLineup,
    matchIdsChrono,
    // Streaks
    currentStreak, longestWinStreak, longestLossStreak,
    // Fun Facts
    shutouts, shutoutsAgainst, perfectWins, tbW, tbL, sf, sa,
    topScore, topScoreCount,
    firstMatchDate, lastMatchDate,
    // Karriere
    seasonTitles
  };
  _cache._teamDetail[key]=result;
  return result;
}

// ════════════════════════════════════════════════════════════════════
// TEAM-ACHIEVEMENTS: alle Team-Awards (Lifetime), in denen dieses
// konkrete Duo Top-3 erreicht hat. Genutzt vom Team-Profil-Sheet, um
// die Auszeichnungen des Duos prominent zu zeigen.
// ════════════════════════════════════════════════════════════════════
// Nutzt den globalen awardRankings('all')-Cache. Pro Award-Key prüfen
// wir, ob die Liste einen Eintrag enthält dessen ids === Duo-IDs (sortiert).
// Sonderbehandlung für Rivalry (4-Spieler-Award): das Duo kann entweder
// in idsA oder idsB sein.
function teamAchievements(p1Id, p2Id){
  const R = awardRankings('all');
  const sortKey = paarKey(p1Id, p2Id);
  const duo = ids => ids.slice().sort().join('|') === sortKey;
  // Platz und Wert aus AW_WERT [§5.3d], wie Kachel, Blatt und Profil. Hier
  // stand die dritte Kopie der Sortier- und Anzeigeregeln (VAL_FNS,
  // DISP_FNS), und sie schrieb die Baustelle als „8er".
  // Nicht dabei: ein Award einer einzelnen Partie (er gehört dem Spiel, nicht
  // dem Duo) und der Endgegner, der zwei Gegner zählt und kein Duo.
  const found = [];
  Object.keys(AW_WERT).forEach(key => {
    const w = AW_WERT[key];
    if(w.einzeln || w.gegner) return;
    const trifft = key === 'rivalry'
      ? x => duo(x.idsA) || duo(x.idsB)
      : x => { const ids = awIds(key, x); return ids.length === 2 && duo(ids); };
    const r = awRang(key, R, trifft);
    if(r) found.push({key, rank:r.rang, x:r.x, val:awText(key, r.x).z});
  });
  return found;
}

// ════════════════════════════════════════════════════════════════════
// H2H-DETAIL: Bilanz zweier Spieler in zwei Dimensionen
// ════════════════════════════════════════════════════════════════════
// Liefert für Spieler-Paar (idA, idB) ALLES, was das H2H-Sheet braucht:
//   • asTeam     — gemeinsame Matches als Teamkollegen
//   • asOppForA  — Matches als Gegner, ALLES AUS SICHT VON idA
//                  (Wins zählen idA-Siege gegen idB; eloDelta = Σ idA-Deltas;
//                   gf/ga = idA-Team's Score)
//   • lastEncounters — die jüngsten 6 gemeinsamen Matches (Team ∪ Gegner)
//
// Achtung: Cache-Key behält die Reihenfolge (idA + '|' + idB), weil asOppForA
// asymmetrisch ist — h2hDetail(X,Y).asOppForA ≠ h2hDetail(Y,X).asOppForA.
// ════════════════════════════════════════════════════════════════════
function h2hDetail(idA, idB){
  // Dieselbe Regel wie überall: die Cache-Version gehört in den Schlüssel.
  // Ohne sie kam der Topf durch KEINE Invalidierung — gemessen zeigte das
  // Bilanz-Blatt nach einer neuen Partie weiter 110 Duelle statt 111.
  const key = idA + '|' + idB + '_' + matches.length + '_' + _cache.version;
  if(!_cache._h2hDetail) _cache._h2hDetail = {};
  if(_cache._h2hDetail[key]) return _cache._h2hDetail[key];
  // Ein Topf, der nur wächst, ist ein Leck: bei jedem Versionswechsel kämen
  // alle Paare noch einmal dazu.
  _topfDeckel(_cache._h2hDetail, 80);

  const asTeam = {g:0, w:0, gf:0, ga:0, eloDelta:0};
  const asOppForA = {g:0, w:0, gf:0, ga:0, eloDelta:0};
  const encounters = [];

  for(const m of matches){
    const aInA = m.a1===idA || m.a2===idA;
    const bInA = m.a1===idB || m.a2===idB;
    const aInB = m.b1===idA || m.b2===idA;
    const bInB = m.b1===idB || m.b2===idB;

    const dA = (m.deltas||{})[idA] || 0;
    const dB = (m.deltas||{})[idB] || 0;

    if(aInA && bInA){
      // Beide im Team A
      asTeam.g++;
      if(m.winner==='A') asTeam.w++;
      asTeam.gf += m.games_a;
      asTeam.ga += m.games_b;
      asTeam.eloDelta += (dA + dB);
      encounters.push({m, type:'team', wonForA: m.winner==='A'});
    } else if(aInB && bInB){
      // Beide im Team B
      asTeam.g++;
      if(m.winner==='B') asTeam.w++;
      asTeam.gf += m.games_b;
      asTeam.ga += m.games_a;
      asTeam.eloDelta += (dA + dB);
      encounters.push({m, type:'team', wonForA: m.winner==='B'});
    } else if((aInA && bInB) || (aInB && bInA)){
      // Gegeneinander — aus Sicht von idA aggregieren
      asOppForA.g++;
      const aSideWon = aInA ? (m.winner==='A') : (m.winner==='B');
      if(aSideWon) asOppForA.w++;
      asOppForA.gf += aInA ? m.games_a : m.games_b;
      asOppForA.ga += aInA ? m.games_b : m.games_a;
      asOppForA.eloDelta += dA;
      encounters.push({m, type:'opp', wonForA: aSideWon});
    }
  }

  encounters.sort((a,b)=> new Date(b.m.created_at) - new Date(a.m.created_at));

  const result = {
    asTeam,
    asOppForA,
    total: asTeam.g + asOppForA.g,
    lastEncounters: encounters.slice(0, 6)
  };
  _cache._h2hDetail[key] = result;
  return result;
}

// Aggregierte Liste aller Mitspieler-Bilanzen für einen Spieler.
// Pro Mitspieler: Anzahl Team-Matches + Anzahl Gegner-Matches.
// Sortiert nach Gesamt-Häufigkeit, gefiltert ≥ min Spiele.
function playerH2HList(id, minTotal=3){
  if(!_cache._h2hList) _cache._h2hList = {};
  // Auch Edit, Löschen und ausgeblendete Spieler verändern diese Liste,
  // ohne zwingend ihre Matchanzahl zu ändern. Die Version gehört deshalb
  // wie beim Einzelduell in den Schlüssel; sonst blieb sie dauerhaft alt.
  const ckey = id+'|'+minTotal+'_'+matches.length+'_'+_cache.version;
  if(_cache._h2hList[ckey]) return _cache._h2hList[ckey];

  const stats = {}; // otherId → {teamG, teamW, oppG, oppW}
  for(const m of matches){
    const ids = [m.a1, m.a2, m.b1, m.b2];
    if(!ids.includes(id)) continue;
    const inA = m.a1===id || m.a2===id;
    const sameTeam = inA ? [m.a1, m.a2] : [m.b1, m.b2];
    const oppTeam  = inA ? [m.b1, m.b2] : [m.a1, m.a2];
    const won = (inA && m.winner==='A') || (!inA && m.winner==='B');

    sameTeam.forEach(other=>{
      if(other===id) return;
      if(!stats[other]) stats[other]={teamG:0,teamW:0,oppG:0,oppW:0};
      stats[other].teamG++;
      if(won) stats[other].teamW++;
    });
    oppTeam.forEach(other=>{
      if(!stats[other]) stats[other]={teamG:0,teamW:0,oppG:0,oppW:0};
      stats[other].oppG++;
      if(won) stats[other].oppW++;
    });
  }
  const pm = pmap();
  const out = Object.entries(stats)
    .filter(([oid, s]) => {
      const p = pm[oid];
      return sichtbar(p) && (s.teamG + s.oppG) >= minTotal;
    })
    .map(([oid, s]) => ({oid, ...s, total: s.teamG + s.oppG}))
    .sort((a,b)=> b.total - a.total);
  _cache._h2hList[ckey] = out;
  // Alte Versionsstände dürfen sich auf einem lange geöffneten Handy
  // nicht unbegrenzt sammeln. Erst nach dem Einfügen deckeln: maximal 80.
  _topfDeckel(_cache._h2hList, 80);
  return out;
}


