// ╔═══ §5.3 ─── VIEW: AWARDS ───────────────────────────────────────────╗
//     ⚑ HOTSPOT — neue Awards benötigen Updates an mehreren Stellen.
//     Siehe Maintenance-Block oben für die volle Checkliste.
//
//     Reihenfolge in dieser Sektion:
//       1. AWARD_META       — Titel, Klasse (Farbe), Erklärung
//       2. AW_IC            — Award-ID -> Icon-Name, für alle Ansichten
//       3. vAwards()        — baut Awards-Tab mit Story-Cards
// ╚═════════════════════════════════════════════════════════════════════════╝
// Cache-Wrapper für awardRankings.
// `sid` überschreibt die Saison, ohne den Zustand des Awards-Tabs anzufassen:
// das Profil zeigt IMMER den laufenden Monat, auch wenn im Awards-Tab gerade
// der Juli ausgewählt ist. Ohne diesen Weg müsste jemand awSeasonId setzen,
// rendern und zurücksetzen — und dabei die halbe Oberfläche mitverschieben.
// ── Die Mindestzahlen ────────────────────────────────────────────────
// Die Awards gibt es nur noch je Saison und je Woche. Die Schwellen stammen
// aus der Zeit, in der es auch „Gesamt" gab, und waren fuer eine Woche nie
// erreichbar: gemessen spielt ein Duo in einer Woche im Mittel DREI Partien
// (Bestwert sieben), und sieben von sechsunddreissig Kacheln standen selbst
// nach einer vollen Woche leer, weil sie zehn gemeinsame Spiele verlangten.
// Ein Duo kommt auch ueber einen ganzen Monat im Mittel nur auf drei.
// Sie stehen hier an EINER Stelle, damit sich das nicht wieder ueber die
// Datei verteilt.
const AW_MIN = {
  teamSpiele: 3,     // Team-Durchschnitte (Betonmauer, Kaeseteller)
  teamEnge: 2,       // enge Team-Partien (Gluueckspilze)
  teamUnter: 2,      // Underdog-Partien eines Duos (Giant Slayer)
  teamPleiten: 2,    // Pleiten eines Duos (Zirkus)
  duell: 2,          // direkte Duelle (Erzfeinde, Endgegner)
  spieler: 3,        // Partien eines Spielers, wenn ein Schnitt gebildet wird
  tiebreaks: 3,      // Tiebreaks eines Spielers (Tiebreak-Koenig, Tiebreak-Pech)
  spielerSaldo: 4,   // Game-Saldo je Partie — ein 6:0 6:0 verzerrt sonst zu stark
  enge: 2,           // enge Partien eines Spielers (Clutch, Pechvogel)
  favorit: 3,        // Partien als Favorit (Favoriten-Versager)
  unter: 2           // Partien als Aussenseiter (Underdog-Held)
};

function awardRankings(period, sid){return getCachedAwardRankings(period, sid);}
function _awardRankingsUncached(period, sid){
  let ms;
  // Wer in der Wertung steht [§C40]: über die ganze Laufbahn nur, wer noch
  // antritt; in einem Monat oder einer Woche jeder, der darin gespielt hat.
  const dabei = period==='all' ? ligaAktiv : sichtbar;
  if(period==='all') ms = matches;
  else if(period==='season'){
    const s = sid || awSeasonId || currentSeason().id;
    ms = matchesInSeason(s);
  }
  else if(period==='week' && awWeekStart){
    const start=new Date(awWeekStart); start.setHours(0,0,0,0);
    const end=new Date(start); end.setDate(end.getDate()+7);
    ms = matches.filter(m=>{
      const d=new Date(m.created_at);
      return d>=start && d<end;
    });
  } else ms = matchesInPeriod(period);
  
  // ═══ ALLE AGGREGATOREN IN EINEM OBJEKT ═══
  const agg = {
    pElo:{}, pWins:{}, pGoals:{}, pConceded:{}, pGames:{},
    tElo:{}, tWins:{}, tGames:{}, tGoalsFor:{}, tGoalsAgainst:{},
    tbW:{}, tbG:{}, bagelFor:{}, bagelAgainst:{},
    single:[], team:[], upsets:[], biggest:[],
    clutch:{}, iceWins:{}, snapMap:null,
    // ── NEUE AWARDS v3 ──
    underdogWins:{},  // playerId → Anzahl Underdog-Siege (unter CHANCE_UPSET & gewonnen)
    // ── NEUE NEGATIV-AWARDS v6 ──
    favLosses:{},     // playerId → Anzahl Niederlagen in Favoriten-Rolle (myExp ≥ 0.65 & verloren)
    favMatches:{},    // playerId → Anzahl Spiele in Favoriten-Rolle (myExp ≥ 0.65)
    // ── NEUE TEAM-AWARDS v4 ──
    tCloseWins:{},      // teamKey → gewonnene knappe Partien (Glückspilze, Zähler)
    tCloseGames:{},     // teamKey → knappe Partien (Glückspilze, Nenner)
    underdogMatches:{}, // pid → Partien als Außenseiter (Underdog-Held, Nenner)
    tGiantSlayer:{},    // teamKey → Anzahl Siege gegen stärkeres Team (Giant Slayer, Zähler)
    tFavoriteMatches:{},// teamKey → Anzahl Matches in denen das Team Underdog war (Giant Slayer Nenner)
    tFavoritenschreck:{},// teamKey → {best: maxOvercome, m: match, eloDiff} (höchster gewonnener Upset)
    rivalries:{}        // pairKey "teamA|teamB" sortiert → {idsA, idsB, g, wA, wB, gfA, gfB}
  };
  
  // Snapshot-Map: gecached, wird nur 1× pro Sim-Generation gebaut
  agg.snapMap = getSnapMap();
  
  // ═══ SINGLE-PASS DURCH ALLE MATCHES ═══
  for(let i=0; i<ms.length; i++){
    const m = ms[i];
    const deltas = m.deltas || {};
    const expA = m.exp_a ?? 0.5;
    const we = m.winner==='A' ? expA : (1-expA);
    
    // === ELOS & TEAMS ===
    Object.entries(deltas).forEach(([id,v])=>{
      agg.single.push({v,id,m});
    });
    
    const dA = (deltas[m.a1]||0) + (deltas[m.a2]||0);
    const dB = (deltas[m.b1]||0) + (deltas[m.b2]||0);
    agg.team.push({v:dA,ids:[m.a1,m.a2],m});
    agg.team.push({v:dB,ids:[m.b1,m.b2],m});
    
    // === UPSETS & BIGGEST ===
    agg.upsets.push({sp:1-we,m});
    agg.biggest.push({diff:Math.abs(m.games_a-m.games_b),m});
    
    // === SPIELER-STATS (4er Loop) ===
    const teams = [
      [m.a1,m.a2,m.games_a,m.games_b,m.a1_side,m.a2_side,true],
      [m.b1,m.b2,m.games_b,m.games_a,m.b1_side,m.b2_side,false]
    ];
    
    for(let t=0; t<2; t++){
      const [p1,p2,gf,ga,pos1,pos2,onA] = teams[t];
      const won = onA ? (m.winner==='A') : (m.winner==='B');
      // ── NEUE AWARDS v3 ──
      // myExp: Wahrscheinlichkeit dieses Teams zu gewinnen (vor dem Match)
      const myExp = onA ? expA : (1 - expA);

      for(let p=0; p<2; p++){
        const id = [p1,p2][p];

        if(!agg.pElo[id]) agg.pElo[id]=0;
        if(!agg.pWins[id]) agg.pWins[id]=0;
        if(!agg.pGoals[id]) agg.pGoals[id]=0;
        if(!agg.pConceded[id]) agg.pConceded[id]=0;
        if(!agg.pGames[id]) agg.pGames[id]=0;

        agg.pElo[id] += deltas[id]||0;
        agg.pGames[id]++;
        if(won) agg.pWins[id]++;
        agg.pGoals[id] += gf;
        agg.pConceded[id] += ga;

        // Tiebreaks und Bagels (Tiebreak-König, Bagel-Bäcker und ihre Spiegel)
        const fp = partieFuer(m, onA ? 'A' : 'B');
        agg.tbW[id] = (agg.tbW[id]||0) + fp.tbWon;
        agg.tbG[id] = (agg.tbG[id]||0) + fp.tbWon + fp.tbLost;
        agg.bagelFor[id] = (agg.bagelFor[id]||0) + fp.bagelsFor;
        agg.bagelAgainst[id] = (agg.bagelAgainst[id]||0) + fp.bagelsAgainst;

        // Underdog-Held: Partien als Aussenseiter (Siegchance unter 35 %) und
        // die davon gewonnenen. Der Nenner fehlte, und ohne ihn war der Award
        // eine Anwesenheitsliste.
        if(myExp < CHANCE_UPSET){
          if(!agg.underdogMatches[id]) agg.underdogMatches[id]=0;
          agg.underdogMatches[id]++;
          if(won){
            if(!agg.underdogWins[id]) agg.underdogWins[id]=0;
            agg.underdogWins[id]++;
          }
        }
        // ── NEUE NEGATIV-AWARDS v6 ──
        // Favoriten-Versager: Anteil Niederlagen, wenn die Sieg-Erwartung ≥ 65 % war.
        // Zählt sowohl Favoritenspiele (Nenner) als auch Niederlagen dort (Zähler).
        if(myExp >= 0.65){
          if(!agg.favMatches[id]) agg.favMatches[id]=0;
          agg.favMatches[id]++;
          if(!won){
            if(!agg.favLosses[id]) agg.favLosses[id]=0;
            agg.favLosses[id]++;
          }
        }
      }
    }
    
    // === TEAM-AGGREGATE ===
    const tA=paarKey(m.a1, m.a2);
    const tB=paarKey(m.b1, m.b2);
    if(!agg.tElo[tA]) agg.tElo[tA]=0;
    if(!agg.tElo[tB]) agg.tElo[tB]=0;
    if(!agg.tWins[tA]) agg.tWins[tA]=0;
    if(!agg.tWins[tB]) agg.tWins[tB]=0;
    if(!agg.tGames[tA]) agg.tGames[tA]=0;
    if(!agg.tGames[tB]) agg.tGames[tB]=0;
    if(!agg.tGoalsFor[tA]) agg.tGoalsFor[tA]=0;
    if(!agg.tGoalsFor[tB]) agg.tGoalsFor[tB]=0;
    if(!agg.tGoalsAgainst[tA]) agg.tGoalsAgainst[tA]=0;
    if(!agg.tGoalsAgainst[tB]) agg.tGoalsAgainst[tB]=0;
    
    agg.tElo[tA] += dA;
    agg.tElo[tB] += dB;
    if(m.winner==='A') agg.tWins[tA]++;
    if(m.winner==='B') agg.tWins[tB]++;
    agg.tGames[tA]++;
    agg.tGames[tB]++;
    agg.tGoalsFor[tA] += m.games_a;
    agg.tGoalsFor[tB] += m.games_b;
    agg.tGoalsAgainst[tA] += m.games_b;
    agg.tGoalsAgainst[tB] += m.games_a;

    // ── NEUE TEAM-AWARDS v4 ──
    const winnerKey = m.winner==='A' ? tA : tB;
    // Glückspilze: die knappen Partien eines Duos (§1.3) und die davon
    // gewonnenen. Geteilt wird durch die knappen, nicht durch ALLE Partien:
    // sonst gewann ihn, wer viel spielt, und nicht, wer die engen Partien
    // für sich entscheidet.
    if(partie(m).knapp){
      if(!agg.tCloseGames[tA]) agg.tCloseGames[tA]=0;
      if(!agg.tCloseGames[tB]) agg.tCloseGames[tB]=0;
      agg.tCloseGames[tA]++;
      agg.tCloseGames[tB]++;
      if(!agg.tCloseWins[winnerKey]) agg.tCloseWins[winnerKey]=0;
      agg.tCloseWins[winnerKey]++;
    }
    // Giant Slayer + Favoritenschreck: brauchen Pre-Match-Team-Elo aus snapMap.
    // snapMap[m.id] enthält eloBefore aller 4 Spieler (saison-isoliert via globalSim).
    // Fehlt der Snap (z.B. hidden Player), wird das Match übersprungen — sicher.
    const snapPre = agg.snapMap[m.id];
    if(snapPre && snapPre[m.a1]!==undefined && snapPre[m.a2]!==undefined
       && snapPre[m.b1]!==undefined && snapPre[m.b2]!==undefined){
      const eloA = snapPre[m.a1] + snapPre[m.a2];
      const eloB = snapPre[m.b1] + snapPre[m.b2];
      const winnerElo = m.winner==='A' ? eloA : eloB;
      const loserElo  = m.winner==='A' ? eloB : eloA;
      const loserKey  = m.winner==='A' ? tB : tA;
      // Underdog-Match-Counter (Nenner für Giant-Slayer-Rate):
      // pro Match das Team mit niedrigerer Pre-Match-Team-Elo zählt — egal ob Sieg
      // oder Niederlage. Bei Elo-Gleichstand zählt KEIN Team (kein Favorit definiert).
      if(eloA !== eloB){
        const underdogKey = eloA < eloB ? tA : tB;
        if(!agg.tFavoriteMatches[underdogKey]) agg.tFavoriteMatches[underdogKey]=0;
        agg.tFavoriteMatches[underdogKey]++;
      }
      // Giant Slayer: Sieger-Team hatte vor dem Spiel weniger Team-Elo
      if(winnerElo < loserElo){
        if(!agg.tGiantSlayer[winnerKey]) agg.tGiantSlayer[winnerKey]=0;
        agg.tGiantSlayer[winnerKey]++;
        // Favoritenschreck: höchster jemals überwundener Elo-Unterschied (pro Team)
        const overcome = loserElo - winnerElo;
        const cur = agg.tFavoritenschreck[winnerKey];
        if(!cur || overcome > cur.eloDiff){
          agg.tFavoritenschreck[winnerKey] = {
            eloDiff: overcome,
            m,
            winnerKey,
            loserKey
          };
        }
      }
    }
    // Erzfeinde: Begegnung Team-A vs Team-B (sortiert als Pair-Key)
    const sortedPair = [tA, tB].sort();
    const pairKey = sortedPair.join('::');
    if(tA !== tB){ // gleiches Team auf beiden Seiten unmöglich, aber defensiv
      if(!agg.rivalries[pairKey]){
        agg.rivalries[pairKey] = {
          idsA: sortedPair[0].split('|'),
          idsB: sortedPair[1].split('|'),
          g:0, wA:0, wB:0, gfA:0, gfB:0
        };
      }
      const r = agg.rivalries[pairKey];
      r.g++;
      // wA/gfA gehören zum SORTIERTEN ersten Team (idsA)
      if(tA === sortedPair[0]){
        r.gfA += m.games_a; r.gfB += m.games_b;
        if(m.winner==='A') r.wA++; else r.wB++;
      } else {
        r.gfA += m.games_b; r.gfB += m.games_a;
        if(m.winner==='B') r.wA++; else r.wB++;
      }
    }
    
    // === ZU NULL: alle Sätze gewonnen, mindestens zwei [§1.3] ===
    if(partie(m).zuNull){
      (m.winner==='A' ? [m.a1,m.a2] : [m.b1,m.b2]).forEach(id=>{ agg.iceWins[id]=(agg.iceWins[id]||0)+1; });
    }
    
    // === CLUTCH (KNAPPE PARTIEN) ===
    if(partie(m).knapp){
      [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
        const onA=(id===m.a1||id===m.a2);
        const w=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
        if(!agg.clutch[id]) agg.clutch[id]={g:0,w:0};
        agg.clutch[id].g++;
        if(w) agg.clutch[id].w++;
      });
    }
  }
  
  // ═══ SORTIERUNGEN (nach SINGLE-PASS) ═══
  agg.single.sort((a,b)=>b.v-a.v);
  agg.team.sort((a,b)=>b.v-a.v);
  agg.upsets.sort((a,b)=>b.sp-a.sp);
  agg.biggest.sort((a,b)=>b.diff-a.diff || new Date(b.m.created_at)-new Date(a.m.created_at));
  
  // ═══ ABGELEITETE AWARDS ═══
  const mvt=Object.entries(agg.tElo).map(([k,v])=>({ids:k.split('|'),v,g:agg.tGames[k]||0}))
    .filter(x=>x.g>=2).sort((a,b)=>b.v-a.v);
  
  // Die Schlüssel stammen aus der Kicker-Liga (Torjäger, Eiserne Abwehr,
  // Eiskalt, Zahnloser Stürmer, Löchrigste Abwehr, Showmaster). Sie stecken
  // in Kacheln, Rückblicken und Prestige-Zuordnungen und bleiben; was sie
  // messen, steht in AWARD_META: scorer = Tiebreak-König, wall = Bagel-
  // Bäcker, ice = Zu Null, worstAtk = Tiebreak-Pech, worstDef = Bagel-
  // Opfer, showmaster = Comeback-König.
  const tbListe=Object.keys(agg.tbG).filter(id=>agg.tbG[id]>=AW_MIN.tiebreaks)
    .map(id=>({id,v:agg.tbW[id],g:agg.tbG[id],avg:agg.tbW[id]/agg.tbG[id]}));
  const scorer=tbListe.slice().sort((a,b)=>b.avg-a.avg||b.v-a.v);
  const wall=Object.keys(agg.bagelFor).filter(id=>agg.bagelFor[id]>0)
    .map(id=>({id,v:agg.bagelFor[id],g:agg.pGames[id]})).sort((a,b)=>b.v-a.v||a.g-b.g);
  const iceList=Object.entries(agg.iceWins).map(([id,v])=>({id,v})).sort((a,b)=>b.v-a.v);
  
  const grinder=Object.entries(agg.pGames).map(([id,v])=>({id,v})).sort((a,b)=>b.v-a.v);
  const winsList=Object.entries(agg.pWins).map(([id,v])=>({id,v,g:agg.pGames[id]})).sort((a,b)=>b.v-a.v);
  const perfectMin=Math.min(6, Math.max(AW_MIN.spieler, Math.ceil((grinder[0]?.v||5)*0.15)));
  const perfect=Object.entries(agg.pWins).map(([id,w])=>({id,w,g:agg.pGames[id],wr:agg.pGames[id]?w/agg.pGames[id]:0}))
    .filter(x=>x.g>=perfectMin)
    .sort((a,b)=>b.wr-a.wr||b.g-a.g);
  
  const streaks=longestStreaks(ms);
  
  const worstWr=Object.entries(agg.pWins).map(([id,w])=>({id,w,g:agg.pGames[id],wr:agg.pGames[id]?w/agg.pGames[id]:0}))
    .filter(x=>x.g>=AW_MIN.spieler).sort((a,b)=>a.wr-b.wr||b.g-a.g);
  const worstAtk=tbListe.slice().sort((a,b)=>a.avg-b.avg||b.g-a.g);
  const worstDef=Object.keys(agg.bagelAgainst).filter(id=>agg.bagelAgainst[id]>0)
    .map(id=>({id,v:agg.bagelAgainst[id],g:agg.pGames[id]})).sort((a,b)=>b.v-a.v||a.g-b.g);
  const worstElo=Object.entries(agg.pElo).map(([id,v])=>({id,v})).sort((a,b)=>a.v-b.v);

  // ═══ NEUE AWARDS v3 ═══
  // Plus-Minus: Ø Game-Saldo je Partie (gewonnene minus abgegebene Games).
  // Etwas mehr Volumen als die anderen Durchschnitte, weil ein einzelnes
  // 6:0 6:0 den Saldo stark verzerrt.
  const plusMinusList = Object.entries(agg.pGames)
    .filter(([id,g]) => g >= AW_MIN.spielerSaldo)
    .map(([id,g]) => ({
      id,
      v: (agg.pGoals[id] - agg.pConceded[id]) / g,  // Saldo pro Spiel
      gf: agg.pGoals[id], ga: agg.pConceded[id], g
    }))
    .sort((a,b) => b.v - a.v);

  // Underdog-Held: Anteil gewonnener Aussenseiter-Partien an den Partien, in
  // die jemand als Aussenseiter ging (Siegchance unter 35 %). Gezaehlt wurde
  // hier die reine Anzahl, und damit gewann ihn, wer am meisten spielt — sein
  // Zwilling auf Team-Ebene, der Giant Slayer, rechnet seit jeher die Quote.
  const underdogList = Object.entries(agg.underdogMatches)
    .filter(([id,g]) => g >= AW_MIN.unter && (agg.underdogWins[id] || 0) > 0)
    .map(([id,g]) => ({id, v: agg.underdogWins[id] || 0, g,
                       pct: (agg.underdogWins[id] || 0) / g}))
    .sort((a,b) => b.pct - a.pct || b.v - a.v);

  // Pechvogel: Anteil knapper Niederlagen an den KNAPPEN Partien. Gemessen an
  // allen Partien gewann ihn, wer viele enge Spiele hatte, nicht wer sie
  // verlor: wer zwanzig Partien spielt, davon zwei enge und beide verliert,
  // stand bei 10 % — hinter jemandem mit acht knappen Niederlagen aus vierzig
  // Spielen, der die Haelfte seiner engen Partien gewonnen hat.
  // Der Pechvogel ist der Spiegel des Clutch-Players, also teilt er sich
  // dessen Zaehlung: `agg.clutch` haelt je Spieler die engen Partien und die
  // davon gewonnenen [§C27]. Zwei Rechnungen ueber dieselbe Frage nennen
  // irgendwann zwei verschiedene Namen.
  const pechvogelList = Object.entries(agg.clutch)
    .filter(([, c]) => c.g >= AW_MIN.enge && (c.g - c.w) > 0)
    .map(([id, c]) => ({
      id,
      v: c.g - c.w,                   // Anzahl knapper Niederlagen (für Anzeige)
      g: c.g,                         // enge Partien
      pct: (c.g - c.w) / c.g          // Sortier-Kriterium
    }))
    .sort((a,b) => b.pct - a.pct || b.v - a.v);

  // ── NEUE NEGATIV-AWARDS v6 ──
  // Favoriten-Versager: Quote = Niederlagen in Favoriten-Rolle / Favoriten-Spiele.
  // Spiegel zu Underdog-Held (Sieg trotz < 35% Erwartung) — hier: Niederlage trotz
  // ≥ 65% Erwartung. Schwelle: min. 5 Favoriten-Matches für stabile Quote.
  const favoriteLoserList = Object.keys(agg.favMatches)
    .filter(id => agg.favMatches[id] >= AW_MIN.favorit)
    .map(id => {
      const losses = agg.favLosses[id] || 0;
      const games = agg.favMatches[id];
      return {
        id,
        v: losses / games,              // Sortier-Kriterium (Quote)
        losses, games                   // Zähler/Nenner für Anzeige
      };
    })
    .filter(x => x.losses > 0)          // 0-Werte raus (kein "Versager")
    .sort((a,b) => b.v - a.v);
  
  // ═══ ENDGEGNER ═══
  // Anteil "wir treffen als Gegner aufeinander" an der gemeinsamen Match-Aktivität.
  // Genutzt: g / min(pGames[a], pGames[b]) — der dominantere Anteil (für den
  // Spieler mit weniger Spielen ist die Begegnung relativ wichtiger).
  // Schwellen: min. 3 Begegnungen UND beide Spieler min. 5 Spiele insgesamt.
  const egPairs={};
  for(let i=0; i<ms.length; i++){
    const m=ms[i];
    const ATeam=[m.a1,m.a2], BTeam=[m.b1,m.b2];
    const aWon=m.winner==='A';
    ATeam.forEach(aId=>BTeam.forEach(bId=>{
      const sorted=[aId,bId].sort();
      const k=sorted.join('|');
      if(!egPairs[k]) egPairs[k]={ids:sorted,g:0,w1:0,w2:0};
      egPairs[k].g++;
      const firstWon = (sorted[0]===aId && aWon) || (sorted[0]===bId && !aWon);
      if(firstWon) egPairs[k].w1++; else egPairs[k].w2++;
    }));
  }
  const endgegner=Object.values(egPairs)
    .filter(p => {
      const ga = agg.pGames[p.ids[0]] || 0;
      const gb = agg.pGames[p.ids[1]] || 0;
      return p.g >= AW_MIN.duell && ga >= AW_MIN.spieler && gb >= AW_MIN.spieler;
    })
    .map(p => {
      const ga = agg.pGames[p.ids[0]];
      const gb = agg.pGames[p.ids[1]];
      const denom = Math.min(ga, gb);
      return {
        ...p,
        gA: ga, gB: gb,
        pct: p.g / denom              // Sortier-Wert
      };
    })
    .sort((a,b) => b.pct - a.pct);
  
  // ═══ CLUTCH ═══
  const clutchList=Object.entries(agg.clutch).filter(([,v])=>v.g>=AW_MIN.enge)
    .map(([id,v])=>({id,wr:v.w/v.g,g:v.g,w:v.w})).sort((a,b)=>b.wr-a.wr||b.g-a.g);
  
  // ═══ CARRY, SOLO, FORMTIEF, etc. ═══
  const carryList=_computeCarry(ms, agg.snapMap);
  const soloList=_computeSolo(ms, agg.snapMap, dabei);
  const formtief=_computeFormtief(ms, dabei);
  const worstTeam=[...teamStatsFromMatches(ms)].filter(t=>t.g>=2).sort((a,b)=>(a.w/a.g)-(b.w/b.g));
  const bestDuo=[...teamStatsFromMatches(ms)].sort((a,b)=>b.g-a.g);
  const onFire=currentStreaks(ms,true);
  const coldStreak=currentStreaks(ms,false);
  const lossStreaks=longestLossStreaks(ms);
  const zirkusList=_computeZirkus(ms);
  const baustelleList=_computeBarstelle(ms);
  const showmasterList=_computeShowmaster(ms);

  // ═══ POTW-/POTD-KÖNIG: kumulierte Player-of-the-Week / Player-of-the-Day Auszeichnungen ═══
  // Beide Funktionen schließen den laufenden Zeitraum automatisch aus und sind identisch
  // mit dem Zähler der POTW-/POTD-Badges → konsistent zwischen Award und Badge.
  // Für period='week' bleibt die Liste leer (Zeitraum = 1 Woche, läuft noch).
  //
  // Gewertet wird der ANTEIL der eigenen Wochen und Spieltage, nicht die
  // Zahl der Titel: als Zahl gewann, wer am häufigsten spielt — zwölf
  // Tagessiege aus zwanzig Spieltagen standen hinter dreizehn aus hundert.
  // Gezählt werden die eigenen Tage und Wochen, die zu sind, wie die Titel
  // selbst (`_tagZu`, die laufende Woche nicht). Wer weniger als
  // `KOENIG_MIN` hat, steht hinter allen anderen: ein Titel aus einem
  // einzigen Spieltag ist kein Anteil.
  const visiblePlayers = players.filter(dabei);
  const eigene = {};
  const laufendeWoche = _wochenKey(Date.now());
  ms.forEach(m => {
    const d = mdayKey(m), w = _wochenKey(m.created_at), zu = _tagZu(d);
    [m.a1, m.a2, m.b1, m.b2].forEach(id => {
      if(!id) return;
      const e = eigene[id] || (eigene[id] = {tage:new Set(), wochen:new Set()});
      if(zu) e.tage.add(d);
      if(w !== laufendeWoche) e.wochen.add(w);
    });
  });
  const koenig = (id, v, n, ab) => ({id, v, n, q:n ? v / n : 0, gilt:n >= ab});
  const koenigFolge = (a, b) => (b.gilt - a.gilt) || (b.q - a.q) || (b.v - a.v);
  const weekKingList = visiblePlayers
    .map(p=>koenig(p.id, countPeriodWins(p.id, ms, 'week'), ((eigene[p.id] || {}).wochen || new Set()).size, KOENIG_MIN.woche))
    .filter(x=>x.v>0)
    .sort(koenigFolge);
  const dayKingList = visiblePlayers
    .map(p=>koenig(p.id, countDayWins(p.id, ms), ((eigene[p.id] || {}).tage || new Set()).size, KOENIG_MIN.tag))
    .filter(x=>x.v>0)
    .sort(koenigFolge);

  // ════════════════════════════════════════════════════════════════════
  // NEUE TEAM-AWARDS v4 — saison-übergreifend gemäß Anforderung
  // ════════════════════════════════════════════════════════════════════
  // unstoppable    — längste Team-Siegesserie (Sieg-Streak pro Team-Key)
  // concreteWall   — kleinster Anteil abgegebener Games
  // luckyCharm     — Quote gewonnener knapper Partien
  // giantSlayer    — meiste Siege gegen stärkeres Team (Pre-Match-Team-Elo)
  // favoritenschreck — höchster überwundener Team-Elo-Unterschied (Match-Award je Team)
  // rivalryList    — Team-Paar mit den meisten direkten Duellen
  // ════════════════════════════════════════════════════════════════════

  // Unstoppable: chronologisch durchwandern, pro Team-Key cur/best Streak
  const _orderedForStreak = [...ms].sort((a,b)=>mts(a)-mts(b));
  const _tStreak = {}; // teamKey → {cur, best, ids}
  for(let i=0;i<_orderedForStreak.length;i++){
    const m=_orderedForStreak[i];
    const wKey = m.winner==='A' ? paarKey(m.a1, m.a2) : paarKey(m.b1, m.b2);
    const lKey = m.winner==='A' ? paarKey(m.b1, m.b2) : paarKey(m.a1, m.a2);
    if(!_tStreak[wKey]) _tStreak[wKey]={cur:0,best:0,ids:wKey.split('|')};
    if(!_tStreak[lKey]) _tStreak[lKey]={cur:0,best:0,ids:lKey.split('|')};
    _tStreak[wKey].cur++;
    if(_tStreak[wKey].cur>_tStreak[wKey].best) _tStreak[wKey].best=_tStreak[wKey].cur;
    _tStreak[lKey].cur=0;
  }
  const unstoppableList = Object.values(_tStreak)
    .filter(x=>x.best>=2)
    .map(x=>({ids:x.ids, v:x.best}))
    .sort((a,b)=>b.v-a.v);

  // Betonmauer: Anteil der abgegebenen Games. Als Schnitt je Partie hinge er
  // an der Länge: wer drei Sätze spielt, gibt mehr Games ab als wer einen.
  const _gAnteil = k => agg.tGoalsAgainst[k] / ((agg.tGoalsFor[k] + agg.tGoalsAgainst[k]) || 1);
  const concreteWallList = Object.keys(agg.tGames)
    .filter(k=>agg.tGames[k]>=AW_MIN.teamSpiele)
    .map(k=>({
      ids:k.split('|'),
      v: _gAnteil(k),   // Sortierwert (niedriger=besser)
      ga: agg.tGoalsAgainst[k],
      g: agg.tGames[k]
    }))
    .sort((a,b)=>a.v-b.v);

  // ── NEUE NEGATIV-AWARDS v6 ──
  // Käseteller: Spiegel zur Betonmauer, größter Anteil abgegebener Games.
  // Sortierung absteigend (hoch = schlecht), dieselbe Schwelle.
  const cheesePlatterList = Object.keys(agg.tGames)
    .filter(k=>agg.tGames[k]>=AW_MIN.teamSpiele)
    .map(k=>({
      ids:k.split('|'),
      v: _gAnteil(k),   // Sortierwert (höher = schlechter)
      ga: agg.tGoalsAgainst[k],
      g: agg.tGames[k]
    }))
    .sort((a,b)=>b.v-a.v);

  // Glückspilze: Anteil gewonnener knapper Partien an den knappen Partien
  // des Duos.
  const luckyCharmList = Object.keys(agg.tCloseWins)
    .filter(k => (agg.tCloseGames[k]||0) >= AW_MIN.teamEnge)
    .map(k => {
      const wins = agg.tCloseWins[k];
      const games = agg.tCloseGames[k];
      return {
        ids: k.split('|'),
        v: wins / games,        // Sortier-Wert: Anteil
        wins, games             // für Anzeige "X/Y"
      };
    })
    .sort((a,b) => b.v - a.v);

  // Giant Slayer: Anteil der gewonnenen Underdog-Spiele an allen Underdog-Spielen
  // (=Spielen, in denen das Team vor Match-Beginn die niedrigere Team-Elo hatte).
  // Sicherstellt, dass die Wertung nicht von Vielspielern dominiert wird.
  // Schwelle: min. 5 Underdog-Matches für stabile Quote.
  const giantSlayerList = Object.keys(agg.tGiantSlayer)
    .filter(k => (agg.tFavoriteMatches[k]||0) >= AW_MIN.teamUnter)
    .map(k => {
      const wins = agg.tGiantSlayer[k];
      const games = agg.tFavoriteMatches[k]; // Nenner
      return {
        ids: k.split('|'),
        v: wins / games,        // Sortier-Wert: Quote
        wins, games
      };
    })
    .sort((a,b) => b.v - a.v);

  // Favoritenschreck: pro Team höchsten überwundenen Elo-Unterschied,
  // dann sortiert nach diesem maximalen Wert.
  const favoritenschreckList = Object.entries(agg.tFavoritenschreck)
    .map(([k,info])=>({
      ids:k.split('|'),
      v: Math.round(info.eloDiff),
      m: info.m,
      loserIds: info.loserKey.split('|')
    }))
    .sort((a,b)=>b.v-a.v);

  // Erzfeinde: Team-Paar mit höchstem Anteil "direkte Duelle" an der gemeinsamen
  // Match-Aktivität beider Teams. Genutzt: g / min(tGamesA, tGamesB) — gibt den
  // dominantesten Aspekt der Rivalität wieder (für das Team mit weniger Spielen
  // ist es der größere Anteil).
  // Schwellen: min. 3 direkte Duelle UND beide Teams min. 5 Spiele insgesamt.
  const rivalryList = Object.values(agg.rivalries)
    .filter(r => {
      const gA = agg.tGames[r.idsA.slice().sort().join('|')] || 0;
      const gB = agg.tGames[r.idsB.slice().sort().join('|')] || 0;
      return r.g >= AW_MIN.duell && gA >= AW_MIN.teamSpiele && gB >= AW_MIN.teamSpiele;
    })
    .map(r => {
      const gA = agg.tGames[r.idsA.slice().sort().join('|')];
      const gB = agg.tGames[r.idsB.slice().sort().join('|')];
      const denom = Math.min(gA, gB);
      return {
        idsA: r.idsA,
        idsB: r.idsB,
        ids:  [...r.idsA, ...r.idsB], // für Hidden-Filter
        g: r.g, wA: r.wA, wB: r.wB,
        gfA: r.gfA, gfB: r.gfB,
        gA, gB,                       // Team-Total-Spiele (für Anzeige im Detail)
        pct: r.g / denom              // Sortier-Wert: Quote der Rivalität
      };
    })
    .sort((a,b) => b.pct - a.pct);

  // ════════════════════════════════════════════════════════════════════
  // FILTER für ALLE Award-Listen (zentral, konsistent)
  // ════════════════════════════════════════════════════════════════════
  // Wer nicht in der Wertung steht (ausgeblendet, oder über die ganze
  // Laufbahn im Ruhestand [§C40]), fällt aus allen Single- und Team-Listen. Bei Team-Awards fliegt das
  // Team raus, sobald EIN Mitglied nicht antritt.
  // Sortierung bleibt erhalten, ranks/medals werden weiter korrekt vergeben.
  // ════════════════════════════════════════════════════════════════════
  const _pm = pmap();
  const _isHidden = id => !dabei(_pm[id]);
  const _fSingle = arr => arr.filter(x => !_isHidden(x.id));
  const _fTeam   = arr => arr.filter(x => !x.ids.some(_isHidden));

  return {
    single:_fSingle(agg.single),
    team:_fTeam(agg.team),
    upsets:agg.upsets, biggest:agg.biggest,
    mvt:_fTeam(mvt),
    scorer:_fSingle(scorer), wall:_fSingle(wall),
    grinder:_fSingle(grinder), winsList:_fSingle(winsList),
    perfect:_fSingle(perfect), streaks:_fSingle(streaks),
    worstWr:_fSingle(worstWr), worstAtk:_fSingle(worstAtk),
    worstDef:_fSingle(worstDef), worstElo:_fSingle(worstElo),
    endgegner:_fTeam(endgegner),
    clutchList:_fSingle(clutchList), iceList:_fSingle(iceList),
    worstTeam:_fTeam(worstTeam), bestDuo:_fTeam(bestDuo),
    onFire:_fSingle(onFire), coldStreak:_fSingle(coldStreak),
    carryList:_fSingle(carryList), lossStreaks:_fSingle(lossStreaks),
    soloList:_fSingle(soloList), formtief, // formtief filtert hidden bereits intern
    zirkusList:_fTeam(zirkusList), baustelleList:_fTeam(baustelleList),
    showmasterList:_fSingle(showmasterList),
    weekKingList, dayKingList, // weekKingList/dayKingList nutzen activePlayers() bereits
    // ── NEUE AWARDS v3 ──
    plusMinusList:_fSingle(plusMinusList),
    underdogList:_fSingle(underdogList),
    pechvogelList:_fSingle(pechvogelList),
    // ── NEUE NEGATIV-AWARDS v6 ──
    favoriteLoserList:_fSingle(favoriteLoserList),
    cheesePlatterList:_fTeam(cheesePlatterList),
    // ── NEUE TEAM-AWARDS v4 ──
    unstoppableList:_fTeam(unstoppableList),
    concreteWallList:_fTeam(concreteWallList),
    luckyCharmList:_fTeam(luckyCharmList),
    giantSlayerList:_fTeam(giantSlayerList),
    favoritenschreckList:_fTeam(favoritenschreckList),
    rivalryList:_fTeam(rivalryList), // _fTeam prüft x.ids → alle 4 Spieler müssen sichtbar sein
    counts:{matches:ms.length}
  };
}

// ─── §5.3a Award-Hilfsfunktionen (laufende und längste Serien) ──
function _computeCarry(ms, snapMap){
  const result={};
  for(let i=0; i<ms.length; i++){
    const m=ms[i];
    const snap=snapMap[m.id]; if(!snap)continue;
    const allFour=[m.a1,m.a2,m.b1,m.b2];
    if(allFour.some(x=>snap[x]===undefined))continue;
    const weakest=allFour.reduce((a,b)=>(snap[a]??cfg.start_elo)<=(snap[b]??cfg.start_elo)?a:b);
    const aWon=m.winner==='A';
    [[m.a1,m.a2,aWon],[m.b1,m.b2,!aWon]].forEach(([p1,p2,won])=>{
      if(!won)return;
      [p1,p2].forEach(pid=>{
        const mate=pid===p1?p2:p1;
        if(mate===weakest&&weakest!==pid){
          if(!result[pid])result[pid]=0;
          result[pid]++;
        }
      });
    });
  }
  return Object.entries(result).filter(([,v])=>v>0).map(([id,v])=>({id,v})).sort((a,b)=>b.v-a.v);
}

function _computeSolo(ms, snapMap, dabei){
  const result={};
  const allActivePlayers=players.filter(dabei);
  for(let i=0; i<ms.length; i++){
    const m=ms[i];
    const snap=snapMap[m.id]; if(!snap)continue;
    const allFour=[m.a1,m.a2,m.b1,m.b2];
    if(allFour.some(x=>snap[x]===undefined))continue;
    const sortedSnap=[...allFour].sort((a,b)=>(snap[a]??cfg.start_elo)-(snap[b]??cfg.start_elo));
    const bottom3=new Set(sortedSnap.slice(0,3).map(p=>p));
    const aWon=m.winner==='A';
    [[m.a1,m.a2,aWon],[m.b1,m.b2,!aWon]].forEach(([p1,p2,won])=>{
      [p1,p2].forEach(pid=>{
        const mate=pid===p1?p2:p1;
        if(bottom3.has(mate)&&!bottom3.has(pid)){
          if(!result[pid])result[pid]={g:0,w:0};
          result[pid].g++;
          if(won)result[pid].w++;
        }
      });
    });
  }
  return Object.entries(result).filter(([,v])=>v.g>=2)
    .map(([id,v])=>({id,wr:v.w/v.g,g:v.g,w:v.w})).sort((a,b)=>b.wr-a.wr||b.g-a.g);
}

function _computeFormtief(ms, dabei){
  // ════════════════════════════════════════════════════════════════════
  // FORMTIEF — saison-bewusste Peak-zu-Aktuell-Berechnung
  // ════════════════════════════════════════════════════════════════════
  // Liest die echten eloBefore/eloAfter Werte aus globalSim.history.
  // Diese Werte sind bereits saison-isoliert, weil simulateElo bei jedem
  // Monatswechsel `resetSeason()` auf start_elo durchführt — peak und
  // last werden daher PRO SAISON getrackt, nicht durchgängig kumuliert.
  //
  //   • 'season'      → Drop in der einen Saison (Peak − End)
  //   • 'week'/'day'  → bleibt korrekt auch wenn die Periode einen
  //                     Monatswechsel überspannt (Reset zerstört nicht
  //                     den Peak des Vormonats — beide Saisons werden
  //                     separat ausgewertet, max gewinnt)
  //   • 'all'         → max Saison-Drop über die gesamte Karriere
  //
  // Der initiale Peak einer Saison ist max(eloBefore, eloAfter) des
  // ersten Periode-Matches in jener Saison: ein Spieler kann VOR der
  // Periode in derselben Saison bereits höher gestanden haben — sein
  // Eingangs-Elo zählt als Periodenstart-Peak.
  //
  // Hidden-Spieler werden hier (anders als im alten Code) korrekt
  // herausgefiltert. Schwelle drop > 10 wie zuvor.
  // ════════════════════════════════════════════════════════════════════
  const gSim = getGlobalSim();
  const histById = {};
  (gSim.history||[]).forEach(h => { histById[h.matchId] = h; });
  const pm = pmap();
  const startElo = cfg.start_elo;

  const ordered = [...ms].sort((a,b)=>mts(a)-mts(b));

  // perPlayer[id] = { seasons: { sId: { peak, last } } }
  const perPlayer = {};
  for(let i=0; i<ordered.length; i++){
    const m = ordered[i];
    const h = histById[m.id];
    if(!h || !h.eloAfter) continue;
    const sId = seasonOf(m.created_at).id;
    const ids = [m.a1,m.a2,m.b1,m.b2];
    for(let j=0; j<ids.length; j++){
      const id = ids[j];
      const eloAfter = h.eloAfter[id];
      if(eloAfter === undefined) continue;
      if(!perPlayer[id]) perPlayer[id] = { seasons:{} };
      const slot = perPlayer[id].seasons[sId];
      if(!slot){
        const eloBefore = (h.eloBefore && h.eloBefore[id]!==undefined) ? h.eloBefore[id] : startElo;
        perPlayer[id].seasons[sId] = { peak: Math.max(eloBefore, eloAfter), last: eloAfter };
      } else {
        if(eloAfter > slot.peak) slot.peak = eloAfter;
        slot.last = eloAfter;
      }
    }
  }

  const result = [];
  Object.entries(perPlayer).forEach(([id, data])=>{
    const p = pm[id]; if(!dabei(p)) return;
    let bestDrop=0, bestPeak=0, bestLast=0;
    Object.values(data.seasons).forEach(s=>{
      const d = s.peak - s.last;
      if(d > bestDrop){ bestDrop=d; bestPeak=s.peak; bestLast=s.last; }
    });
    if(bestDrop > 10){
      result.push({ id, drop: bestDrop, peak: Math.round(bestPeak), cur: Math.round(bestLast) });
    }
  });
  return result.sort((a,b)=>b.drop-a.drop);
}

function _computeZirkus(ms){
  // Zirkus = Anteil deutlicher Niederlagen (kein Satz gewonnen, höchstens ein
  // Viertel der Games, §1.3) an den NIEDERLAGEN des Duos. Gefragt ist: wenn
  // es schiefgeht, wie schlimm wird es — nicht, wie oft ein Duo verliert.
  // Der Nenner sind deshalb die Pleiten und nicht alle Partien [§C37]. In der
  // Chronik stand dieselbe Frage einmal als „Der Schadensbegrenzer"; der misst
  // jetzt als „Der Widerstand" den mittleren Rueckstand jeder Niederlage und
  // nicht mehr den Anteil der hohen [§C35] — der Nenner bleibt derselbe, die
  // Frage ist nicht mehr dieselbe.
  const zirkus={};      // teamKey → {ids, v: # hohe Niederlagen}
  const tPleiten={};    // teamKey → # Niederlagen (Nenner; _computeZirkus sieht
                        //   den globalen agg nicht)
  for(let i=0; i<ms.length; i++){
    const m=ms[i];
    const teamA=paarKey(m.a1, m.a2);
    const teamB=paarKey(m.b1, m.b2);
    const loserTeam=m.winner==='A'?teamB:teamA;
    tPleiten[loserTeam] = (tPleiten[loserTeam]||0) + 1;
    if(!partie(m).deutlich) continue;
    if(!zirkus[loserTeam]) zirkus[loserTeam]={ids:loserTeam.split('|'), v:0};
    zirkus[loserTeam].v++;
  }
  return Object.values(zirkus)
    .map(z => {
      const key = z.ids.slice().sort().join('|');
      const g = tPleiten[key] || 0;
      return { ...z, g, pct: g>0 ? z.v / g : 0 };
    })
    .filter(z => z.g >= AW_MIN.teamPleiten && z.v >= 1)
    .sort((a,b) => b.pct - a.pct);
}

function _computeBarstelle(ms){
  const teamLossStreaks={};
  const ordered=[...ms].sort((a,b)=>mts(a)-mts(b));
  for(let i=0; i<ordered.length; i++){
    const m=ordered[i];
    const loserKey=m.winner==='A'?paarKey(m.b1, m.b2):paarKey(m.a1, m.a2);
    const winnerKey=m.winner==='A'?paarKey(m.a1, m.a2):paarKey(m.b1, m.b2);
    if(!teamLossStreaks[loserKey])teamLossStreaks[loserKey]={cur:0,best:0,ids:loserKey.split('|')};
    teamLossStreaks[loserKey].cur++;
    if(teamLossStreaks[loserKey].cur>teamLossStreaks[loserKey].best)teamLossStreaks[loserKey].best=teamLossStreaks[loserKey].cur;
    if(teamLossStreaks[winnerKey])teamLossStreaks[winnerKey].cur=0;
  }
  return Object.values(teamLossStreaks).filter(x=>x.best>=2).sort((a,b)=>b.best-a.best);
}

// Comeback-König (Schlüssel showmaster): Siege nach verlorenem ersten Satz.
function _computeShowmaster(ms){
  const result={};
  for(let i=0; i<ms.length; i++){
    const m=ms[i];
    if(!partie(m).wende) continue;
    (m.winner==='A' ? [m.a1,m.a2] : [m.b1,m.b2]).forEach(id=>{result[id]=(result[id]||0)+1;});
  }
  return Object.entries(result).filter(([,v])=>v>=1).map(([id,v])=>({id,v})).sort((a,b)=>b.v-a.v);
}


// Team-Stats aus einer gefilterten Match-Liste
function teamStatsFromMatches(ms){
  const T={};
  ms.forEach(m=>{
    [[m.a1,m.a2,m.winner==='A',m.games_a,m.games_b],[m.b1,m.b2,m.winner==='B',m.games_b,m.games_a]]
    .forEach(([x,y,won,gf,ga])=>{const k=paarKey(x, y);
      if(!T[k])T[k]={ids:[x,y].sort(),g:0,w:0,gf:0,ga:0};
      T[k].g++;if(won)T[k].w++;T[k].gf+=gf;T[k].ga+=ga;});
  });
  return Object.values(T);
}

// Aktuelle (noch laufende) Serie je Spieler
function currentStreaks(ms,forWins){
  const ordered=[...ms].sort((a,b)=>mts(a)-mts(b));
  const cur={};
  ordered.forEach(m=>{
    [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
      const onA=(id===m.a1||id===m.a2);
      const w=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
      if(forWins?w:!w) cur[id]=(cur[id]||0)+1; else cur[id]=0;
    });
  });
  // Eine Serie beginnt mit dem zweiten Ergebnis. Die Kachel verlangt das seit
  // jeher, das Blatt dahinter nicht: unter „On Fire" standen „1er Serie" und
  // unter „Eiskalt erwischt" sieben Spieler mit „1er Niederlagen".
  return Object.entries(cur).filter(([,v])=>v>=2).map(([id,v])=>({id,v})).sort((a,b)=>b.v-a.v);
}

// Längste Siegesserie je Spieler innerhalb der (zeitlich sortierten) Match-Liste
function longestStreaks(ms){
  const ordered=[...ms].sort((a,b)=>mts(a)-mts(b));
  const cur={}, best={};
  ordered.forEach(m=>{
    [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
      const onA=(id===m.a1||id===m.a2);
      const won=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
      if(won){cur[id]=(cur[id]||0)+1; if((cur[id])>(best[id]||0))best[id]=cur[id];}
      else cur[id]=0;
    });
  });
  return Object.entries(best).map(([id,v])=>({id,v})).filter(x=>x.v>=2).sort((a,b)=>b.v-a.v);
}

// Längste Niederlagenserie je Spieler (insgesamt, nicht nur aktuell laufend)
function longestLossStreaks(ms){
  const ordered=[...ms].sort((a,b)=>mts(a)-mts(b));
  const cur={}, best={};
  ordered.forEach(m=>{
    [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
      const onA=(id===m.a1||id===m.a2);
      const won=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
      if(!won){cur[id]=(cur[id]||0)+1; if((cur[id])>(best[id]||0))best[id]=cur[id];}
      else cur[id]=0;
    });
  });
  return Object.entries(best).map(([id,v])=>({id,v})).filter(x=>x.v>=2).sort((a,b)=>b.v-a.v);
}

function _vAwardsCore(){
  // Beim Tab-Rendern: stale awWeekStart vom POTW-Click zurücksetzen, damit der Awards-Tab
  // immer die aktuelle Woche zeigt (POTW-Detail wird per Sheet überlagert).
  awWeekStart=null;
  // Kein Zeitraumwähler: die Auszeichnungen gelten der Saison. Die Woche
  // stand hier als zweiter Reiter und zeigte bei einem Spieltag in der Woche
  // dieselben Kacheln wie der Tag; der Spieler der Woche bleibt als Blatt.
  awPeriod='season';
  // Saison-Picker: Dropdown mit allen verfügbaren Saisons
  const selSeason=awSeasonId||currentSeason().id;
  // Dasselbe Bauteil wie im Liga-Tab — ein Saisonwähler, eine Form.
  const seasonPicker=awPeriod==='season'?saisonWaehlerHtml('awSeasonPicker',selSeason):'';
  const periodBar=seasonPicker;
  const R=awardRankings(awPeriod);
  const pl=awPeriodLabel();
  // Ohne Partie steht die Vitrine trotzdem, jede Kachel noch niemandes:
  // „Keine Partien in diesem Zeitraum" auf leerer Fläche sagte nicht, was
  // es hier zu holen gibt. Getippt zeigt jede Kachel ihre Frage.
  const vorschau = R.counts.matches ? '' : vorschauHtml('trophy', 'Die Auszeichnungen der Saison',
    `In ${esc(pl)} ist noch keine Partie gespielt. Jede Kachel unten gehört dem, der ihre Frage in der Saison am besten beantwortet, und füllt sich mit den Partien. Tippen zeigt, wofür es sie gibt und ab wann sie zählt.`);
  // Wer eine Kachel trägt, wie viel und woraus, sagt AW_WERT [§5.3d];
  // gezeichnet wird sie von awKachelHtml. Hier steht nur noch, welche
  // Kacheln in welchem Abschnitt stehen.
  // Wochen- und Tageskönig zählen Wochen und Tage: in EINER Woche wäre die
  // Antwort immer eins.
  const zeigen = key => !(awPeriod === 'week' && (key === 'weekKing' || key === 'dayKing'));
  let html='';
  // ════════════════════════════════════════════════════════════════
  // AWARD-SAMMLER-PODIUM (Top-3 Spieler nach Anzahl gewonnener Awards)
  // ════════════════════════════════════════════════════════════════
  // Zählt jeden Platz-1-Award pro Spieler. Bei Team-Awards (mvt, bestDuo,
  // endgegner, biggest, upset, zirkus, baustelle, worstTeam) zählen beide
  // Teammitglieder. Schandtafel-Awards sind NICHT positiv und fließen daher
  // NICHT in den Sammler-Counter ein.
  // ════════════════════════════════════════════════════════════════
  const _coll = {}; // playerId → count
  // Gezählt wird jede positive Kachel, die gerade steht, und jeder, der sie
  // trägt — gleichauf heißt geteilt. Die Liste der Kacheln und ihre
  // Sortierung kommen aus AW_WERT: hier stand eine vierte Kopie der
  // Sortierfunktionen, und sie wich schon ab (die Eiserne Abwehr zählte
  // aufsteigend, das Profil absteigend).
  Object.keys(AW_WERT).forEach(key => {
    if(awNeg(key) || !zeigen(key)) return;
    awTop(key, R).forEach(x => awIds(key, x).forEach(id => { if(id) _coll[id] = (_coll[id] || 0) + 1; }));
  });

  const _collTop = Object.entries(_coll)
    .map(([id, count]) => ({id, count}))
    .sort((a, b) => b.count - a.count || pname(a.id).localeCompare(pname(b.id)))
    .slice(0, 3);

  if(_collTop.length){
    // Der Avatar trägt hier dasselbe Wappen wie in jeder Ranglistenzeile
    // und auf dem Podest der Ewigen Tafel [§C27] — mit Sternen für die
    // Titel und mit dem Feuer, wenn der Sammler gerade auf einer Serie
    // ist. Vorher stand hier ein nackter Kreis: derselbe Spieler sah in
    // drei Ansichten dreimal anders aus.
    // Mit Banner, wie auf dem Podest der Ewigen Tafel: wer hier steht, steht
    // ganz vorn, und dort trägt ein Spieler sein volles Zeichen [§C27].
    // Die Raute bleibt bei der LIGAPOSITION, nicht beim Podestplatz: dieses
    // Podest zählt Auszeichnungen, und „Zweiter" hieße hier etwas anderes
    // als überall sonst, wo die Raute steht.
    const _avTrophyHtml = (pid, px) => {
      const p = pmap()[pid];
      return p ? avHtml(p, '', {ins:true, band:true, px:px, klasse:'pod-av'}) : '';
    };
    // ────────────────────────────────────────────────────────────────
    // EFFEKTIVER RANG mit Standard Competition Ranking ("1224"-Stil):
    //   [10, 7, 7]  → ränge [1, 2, 2]
    //   [10, 10, 5] → ränge [1, 1, 3]
    //   [7, 7, 7]   → ränge [1, 1, 1]
    //   [10, 7, 5]  → ränge [1, 2, 3]
    // Tier folgt dem effektiven Rang: 1=gold, 2=silber, 3=bronze — dieselben
    // drei Metalle wie auf dem Podest der Ewigen Tafel.
    // Das Layout bleibt 3-spaltig (links|Mitte|rechts), aber die
    // Metallklasse je Karte kommt aus dem effektiven Rang: bei Gleichstand
    // tragen beide dasselbe Metall.
    // ────────────────────────────────────────────────────────────────
    const _eRank = _collTop.map((c,i,a) =>
      i === 0 ? 1 : (c.count === a[i-1].count ? null : i + 1)
    );
    // Zweiter Durchgang: null-Werte (Gleichstand) auf den vorigen Rang setzen
    for(let i = 1; i < _eRank.length; i++) if(_eRank[i] === null) _eRank[i] = _eRank[i-1];
    const _tierOf = r => r === 1 ? 'gold' : r === 2 ? 'silber' : 'bronze';

    // Dasselbe Podest wie in der Ewigen Tafel [§C6]: die Mitte gehört dem
    // Ersten, links steht Zwei, rechts Drei. Vorher war das hier ein
    // eigenes Bauteil mit eigenen Klassen — samt Balkendiagramm, das unten
    // aus der Karte lief.
    const _slot = (idx, mitte) => {
      const c = _collTop[idx];
      if(!c) return '<div class="pod-leer"></div>';
      const tier = _tierOf(_eRank[idx]);
      const px = mitte ? 84 : 70;
      return `<div class="pod-karte ${tier}${mitte ? ' erster' : ''}" data-detail="${esc(c.id)}">
        <div class="pod-platz num">${String(_eRank[idx]).padStart(2,'0')}</div>
        ${_avTrophyHtml(c.id, px)}
        <div class="pod-name">${esc(pname(c.id))}</div>
        <div class="pod-wert num">${c.count}</div>
        <div class="pod-sub">${c.count===1?'Award':'Awards'}</div>${mitte ? glanzBahn() : ''}
      </div>`;
    };
    html += `<div class="aw-sect gold">
      <span class="aw-sect-dot"></span>
      <span>Award-Sammler</span>
      <span class="aw-sect-line"></span>
    </div>
    <div class="podest">${_slot(1,false)}${_slot(0,true)}${_slot(2,false)}</div>`;
  }

  // Section header: kleiner farbiger Punkt + Caps-Label + verlaufende Linie.
  // Die Kacheln landen in der Vitrine darunter (awVitrineHtml).
  const sect = (iconKey, iconCol, title, cards) => {
    html += `<div class="aw-sect ${iconCol}">
      <span class="aw-sect-dot"></span>
      <span>${title}</span>
      <span class="aw-sect-line"></span>
    </div>` + awVitrineHtml(cards, iconCol);
  };
  // Eine Kachel je Award. OHNE_LEER: eine Serie, die gerade niemand hat,
  // ist kein Fehlen, sie ist vorbei — On Fire und Eiskalt erwischt stehen
  // nur, solange eine läuft.
  const OHNE_LEER = new Set(['onFire','coldStreak']);
  const kacheln = (keys, aufmacher) => keys.filter(zeigen).map((key, i) => {
    const top = awTop(key, R);
    if(!top.length && OHNE_LEER.has(key)) return '';
    return awKachelHtml(key, top, {gross: aufmacher && i === 0, liste: awListe(key, R)});
  }).filter(Boolean);

  sect('star','gold','Höhepunkte',
    kacheln(['wins','onFire','perfect','streaks','showmaster','weekKing','dayKing'], true));
  sect('handshake','blue','Teams',
    kacheln(['mvt','bestDuo','unstoppable','concreteWall','luckyCharm','giantSlayer','favoritenschreck','rivalry']));
  sect('shield','purple','Angriff & Verteidigung',
    kacheln(['scorer','wall','ice','plusMinus']));
  // Spezial trägt Metall: es ist die Gruppe für alles, was in keine der
  // anderen passt — eine eigene Buntfarbe würde ihr eine Bedeutung geben,
  // die sie nicht hat.
  sect('bolt','silber','Spezial',
    kacheln(['endgegner','clutch','carryKing','solo','upset','biggest','grinder','underdog']));
  const neg = kacheln(['worstWr','coldStreak','lossStreaks','formtief','worstAtk','worstDef',
    'zirkus','worstTeam','baustelle','pechvogel','cheesePlatter','favoriteLoser']);
  html+=`<div class="aw-shame-divider">
    <div class="line"></div>
    <div class="lbl">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01M9 16c.85-1 2-1.5 3-1.5s2.15.5 3 1.5"/></svg>
      Schandtafel
    </div>
    <div class="line r"></div>
  </div>` + awVitrineHtml(neg, 'red');

  return `${periodBar}${vorschau}${html}`;
}

// ── Der Awards-Tab hat drei Reiter ───────────────────────────────────
// Awards, Rekorde, Chronik gehören zusammen: alle drei beantworten „was hat
// sich hier jemand verdient", nur über verschiedene Zeiträume — dieser
// Zeitraum, alle Zeit, Monat für Monat. Vorher lag die Chronik hinter einer
// Zeile, die man erst als Knopf erkennen musste, und die Rekorde noch eine
// Ebene tiefer darin.
function vAwards(){
  const unter = {
    awards:  awPeriodLabel() + ' · tippen für Top 3 und Verlauf',
    rekorde: 'Bestwerte über alle Saisons · tippen zeigt die Bedingung',
    chronik: 'Saison für Saison · tippen öffnet den Monat'
  }[awView] || '';
  const schalter = `
    <div class="ui-switch">
      <button data-awview="awards"  class="${awView==='awards' ?'on':''}">Awards</button>
      <button data-awview="rekorde" class="${awView==='rekorde'?'on':''}">Rekorde</button>
      <button data-awview="chronik" class="${awView==='chronik'?'on':''}">Chronik</button>
    </div>`;
  const kopf = `<div class="view-head"><h2>Awards</h2><p>${unter}</p></div>${schalter}`;
  if(awView === 'rekorde'){
    // Keine eigene Überschrift mehr: die Liste bringt jetzt ihre drei
    // Gruppenüberschriften mit, und „LIGA-REKORDE" stand dadurch zweimal
    // direkt untereinander.
    return kopf + ligaRekordeHtml(true);
  }
  if(awView === 'chronik'){
    return kopf + (ligaChronikMatrixHtml() || chronikVorschauHtml());
  }
  // Ein abgeschlossener Monat oder eine vergangene Woche ist Geschichte [§C40].
  let bis = null;
  if(awPeriod==='season' && awSeasonId && awSeasonId !== currentSeason().id) bis = seasonEnd(awSeasonId).getTime();
  if(awPeriod==='week' && awWeekStart){
    const ende = new Date(awWeekStart); ende.setHours(0,0,0,0); ende.setDate(ende.getDate() + 7);
    if(ende.getTime() <= Date.now()) bis = ende.getTime() - 1;
  }
  return kopf + geschichteHtml(_vAwardsCore(), bis);
}

// Award-ID -> Icon-Name. Eine Tabelle für Awards-Reiter, Award-Blatt,
// Spieler-Awards, Saison-Rückblick und die Nebenwertungen der Liga [§C27].
// Sie stand dreimal wortgleich in drei Funktionen, und die beiden Stellen
// ohne eigene Kopie suchten sich ihr Zeichen selbst aus: im Rückblick trugen
// Wochen- und Tageskönig dieselbe Krone und der Pechvogel das Gespenst der
// schwächsten Bilanz, in der Liga die Überraschung einen Blitz.
const AW_IC = {
  wins:'trophyStar',     onFire:'flame',       perfect:'star',          streaks:'flameTriple',
  showmaster:'wende',    mvt:'handshake',      bestDuo:'duo',           scorer:'tiebreak',
  wall:'bagel',          ice:'zuNull',      endgegner:'skull',       clutch:'target',
  carryKing:'weight',    solo:'lonewolf',      upset:'surprise',        biggest:'explosion',
  grinder:'gamepad',     worstWr:'bilanzTief',      coldStreak:'dropTriple',    lossStreaks:'trendCrash',
  formtief:'meltDown',   worstAtk:'tiebreakPech',worstDef:'bagelOpfer',        worstTeam:'brokenHeart',
  zirkus:'circus',       baustelle:'cone',
  weekKing:'weekKing',   dayKing:'dayKing',
  plusMinus:'plusMinus', underdog:'underdog',  pechvogel:'rainCloud',
  // ── NEUE TEAM-AWARDS v4 ──
  unstoppable:'unstoppable', concreteWall:'betonmauer', luckyCharm:'clover',
  giantSlayer:'giantSlayer', favoritenschreck:'devilMask', rivalry:'crossedSwords',
  // ── NEUE NEGATIV-AWARDS v6 ──
  cheesePlatter:'cheese', favoriteLoser:'crownFallen'
};

// Ab wie vielen eigenen Spieltagen und Wochen ein Anteil zählt [§C28]. Vor
// `AWARD_META`, das sie in seinen Erklärungen nennt.
const KOENIG_MIN = {tag:5, woche:3};

// ⚑ HOTSPOT — Award-Metadaten (Titel, Klasse, Erklärung).
// Eine fehlende Erweiterung hier führt dazu, dass das Detail-Sheet im
// showAward() nicht öffnen kann (meta = undefined -> return).
// Reihenfolge der Felder pro Award:
//   title — Anzeigename
//   cls   — Farbklasse (acid|blue|gold|orange|purple|red)
//   why   — Knappe Erklärung (1 Satz, idealerweise inkl. Mindestschwellen)
const AWARD_META={
  wins:        {title:'Meiste Siege',          cls:'gold',  why:`Die meisten gewonnenen Partien im Zeitraum.`},
  mvt:         {title:'Bestes Team',           cls:'gold',  why:`Das Duo, das im Zeitraum zusammen die meisten Elo-Punkte geholt hat. Ab 2 gemeinsamen Partien.`},
  streaks:     {title:'Längste Siegesserie',   cls:'acid',  why:`Die meisten Siege in Folge im Zeitraum.`},
  onFire:      {title:'On Fire',               cls:'acid',  why:`Die längste Siegesserie, die gerade noch läuft.`},
  scorer:      {title:'Tiebreak-König',        cls:'orange',why:`Die höchste Quote gewonnener Tiebreaks, Match-Tiebreaks eingeschlossen. Ab ${AW_MIN.tiebreaks} Tiebreaks.`},
  wall:        {title:'Bagel-Bäcker',          cls:'blue',  why:`Die meisten gewonnenen Bagels, also Sätze 6:0.`},
  ice:         {title:'Zu Null',               cls:'blue',  why:`Die meisten Siege ohne Satzverlust, bei mindestens zwei Sätzen.`},
  endgegner:   {title:'Endgegner',             cls:'purple',why:`Zwei Spieler, die sich am häufigsten als Gegner begegnen, gemessen am Anteil an den Partien dessen, der weniger spielt. Ab ${AW_MIN.duell} Begegnungen, beide ab ${AW_MIN.spieler} Partien.`},
  clutch:      {title:'Clutch-Player',         cls:'acid',  why:`Die höchste Siegquote in knappen Partien — Tiebreak, ein Satz für jeden oder höchstens 2 Games Unterschied. Ab ${AW_MIN.enge} knappen Partien.`},
  carryKing:   {title:'Carry-King',            cls:'acid',  why:`Die meisten Siege mit einem Partner, der vor der Partie der Schwächste der vier war.`},
  bestDuo:     {title:'Unzertrennlich',        cls:'blue',  why:`Das Duo mit den meisten gemeinsamen Partien im Zeitraum.`},
  upset:       {title:'Größte Überraschung',   cls:'orange',why:`Die Partie mit der niedrigsten Siegchance für den späteren Sieger.`},
  biggest:     {title:'Höchster Sieg',         cls:'purple',why:`Die Partie mit dem größten Abstand in Games.`},
  perfect:     {title:'Beste Bilanz',          cls:'gold',  why:`Die höchste Siegquote im Zeitraum. Verlangt sind 15 % der Partien des fleißigsten Spielers, mindestens ${AW_MIN.spieler} und höchstens 6.`},
  grinder:     {title:'Vielspieler',           cls:'blue',  why:`Die meisten gespielten Partien im Zeitraum.`},
  worstWr:     {title:'Schwächste Bilanz', cls:'red',   why:`Die niedrigste Siegquote im Zeitraum. Ab ${AW_MIN.spieler} Partien.`},
  coldStreak:  {title:'Eiskalt erwischt',      cls:'red',   why:`Die längste Niederlagenserie, die gerade noch läuft.`},
  lossStreaks: {title:'Längste Pleitenserie',cls:'red', why:`Die meisten Niederlagen in Folge im Zeitraum.`},
  worstAtk:    {title:'Tiebreak-Pech',         cls:'red',   why:`Die niedrigste Quote gewonnener Tiebreaks. Ab ${AW_MIN.tiebreaks} Tiebreaks.`},
  worstDef:    {title:'Bagel-Opfer',           cls:'red',   why:`Die meisten kassierten Bagels, also Sätze 0:6.`},
  worstTeam:   {title:'Schlechtestes Team',    cls:'red',   why:`Das Duo mit der niedrigsten Siegquote. Ab 2 gemeinsamen Partien.`},
  showmaster:  {title:'Comeback-König',        cls:'gold',  why:`Die meisten Siege nach verlorenem ersten Satz.`},
  // Leitwolf und nicht Einzelkämpfer: so heißt der Liga-Rekord, der den
  // Rückgang der Partnerstärke misst. Eine andere Frage, und zwei
  // Einträge unter einem Namen waren nicht auseinanderzuhalten.
  solo:        {title:'Leitwolf',              cls:'acid',  why:`Die höchste Siegquote in Partien, in denen man vor der Partie der Stärkste der vier war. Ab 2 solchen Partien.`},
  formtief:    {title:'Formtief',              cls:'red',   why:`Der größte Abstand zwischen dem höchsten und dem aktuellen Elo-Stand innerhalb einer Saison.`},
  zirkus:      {title:'Zirkus',                cls:'red',   why:`Das Duo, bei dem die meisten Niederlagen deutlich ausfallen — kein Satz gewonnen und höchstens ein Viertel der Games —, gemessen an allen Niederlagen. Ab ${AW_MIN.teamPleiten} Niederlagen.`},
  baustelle:   {title:'Baustelle',             cls:'red',   why:`Das Duo mit der längsten gemeinsamen Niederlagenserie.`},
  weekKing:    {title:'Wochenkönig',           cls:'gold',  why:`Der größte Anteil der eigenen Wochen als Player of the Week, ab ${KOENIG_MIN.woche} Wochen. Die laufende Woche zählt noch nicht.`},
  dayKing:     {title:'Tageskönig',            cls:'gold',  why:`Der größte Anteil der eigenen Spieltage als Player of the Day, ab ${KOENIG_MIN.tag} Spieltagen. Der laufende Tag zählt noch nicht.`},
  // ── AWARDS v3 ──
  plusMinus:   {title:'Plus-Minus',            cls:'orange',why:`Der höchste Game-Saldo je Partie (gewonnene minus abgegebene Games). Ab ${AW_MIN.spielerSaldo} Partien.`},
  underdog:    {title:'Underdog-Held',         cls:'purple',why:`Die höchste Siegquote als Außenseiter (Siegchance unter 35 %). Ab ${AW_MIN.unter} solchen Partien.`},
  pechvogel:   {title:'Pechvogel',             cls:'red',   why:`Der höchste Anteil verlorener knapper Partien. Ab ${AW_MIN.enge} knappen Partien.`},
  // ── TEAM-AWARDS v4 ──
  unstoppable: {title:'Unaufhaltsam',          cls:'acid',  why:`Das Duo mit der längsten Siegesserie. Eine Niederlage beendet sie.`},
  concreteWall:{title:'Betonmauer',            cls:'blue',  why:`Das Duo, das den kleinsten Anteil der Games abgibt. Ab ${AW_MIN.teamSpiele} gemeinsamen Partien.`},
  luckyCharm:  {title:'Glückspilze',           cls:'acid',  why:`Das Duo, das die meisten knappen Partien gewinnt, gemessen an allen knappen Partien. Ab ${AW_MIN.teamEnge} davon.`},
  giantSlayer: {title:'Giant Slayer',          cls:'orange',why:`Die höchste Siegquote eines Duos gegen ein stärkeres Duo. Ab ${AW_MIN.teamUnter} solchen Partien.`},
  favoritenschreck:{title:'Favoritenschreck',  cls:'red',   why:`Der größte Elo-Unterschied, den ein Duo mit einem Sieg überwunden hat.`},
  rivalry:     {title:'Erzfeinde',             cls:'purple',why:`Zwei Duos, die sich am häufigsten gegenüberstehen, gemessen am Anteil an den Partien des Duos, das weniger spielt. Ab ${AW_MIN.duell} Duellen, beide ab ${AW_MIN.teamSpiele} Partien.`},
  // ── NEUE NEGATIV-AWARDS v6 ──
  cheesePlatter:{title:'Käseteller',           cls:'red',   why:`Das Duo, das den größten Anteil der Games abgibt. Ab ${AW_MIN.teamSpiele} gemeinsamen Partien.`},
  favoriteLoser:{title:'Favoriten-Versager',   cls:'red',   why:`Die höchste Niederlagenquote als Favorit (Siegchance ab 65 %). Ab ${AW_MIN.favorit} solchen Partien.`}
};

// ╔═══ §5.3d ─── EIN WERT JE AUSZEICHNUNG ────────────────────────────╗
//     Liste, Sortierung, Zahl, Einheit und Stichprobe jeder Auszeichnung
//     an EINER Stelle [§C27]. Sie standen viermal da — Kachel, Blatt,
//     Profil, Duo-Blatt —, jede Stelle mit eigener Sortierung und eigener
//     Schreibweise: dieselbe Serie hieß „8", „8er", „8er Serie" und
//     „8 Siege in Folge", die Betonmauer trug im Profil „4,00" ohne Einheit,
//     das Duo-Blatt zählte die Plätze mit einer dritten Kopie der
//     Sortierfunktionen und der Award-Sammler mit einer vierten.
// ╚═════════════════════════════════════════════════════════════════════╝
//   l(R)   die Liste aus awardRankings, schon sortiert
//   s(x)   der Wert, nach dem gleichauf entschieden wird
//   z(x)   die Zahl, e(x) ihre Einheit ausgeschrieben, b(x) die Stichprobe
//   f(x)   der rohe Wert für die Lage im Feld — nur, wo alle Einträge
//          dieselbe Größe auf derselben Skala messen (Quote, Schnitt)
//   lauf   eine Serie: gezeichnet als Lauf aus Feldern
//   gilt   was ein Eintrag mindestens braucht, um Halter zu sein
//   einzeln  eine einzelne Partie: der Platz ist die Reihenfolge der Liste
//   gegner   zwei Spieler, die sich gegenüberstehen — kein Duo
const _awPz = v => Math.round(v * 100) + '\u00A0%';
const _awN = (n, eins, viele) => n === 1 ? eins : viele;
const _awSieger = x => x.m.winner === 'A' ? [x.m.a1, x.m.a2] : [x.m.b1, x.m.b2];
const AW_WERT = {
  wins:        {l:R=>R.winsList, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Sieg','Siege'), b:x=>'aus '+x.g+' Partien'},
  onFire:      {l:R=>R.onFire, s:x=>x.v, z:x=>x.v, e:x=>'Siege in Folge', b:()=>'läuft noch', lauf:true, gilt:x=>x.v>=2},
  perfect:     {l:R=>R.perfect, s:x=>Math.round(x.wr*100), z:x=>_awPz(x.wr), e:()=>'Siegquote', b:x=>x.w+' von '+x.g+' Partien gewonnen', f:x=>x.wr},
  streaks:     {l:R=>R.streaks, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Sieg in Folge','Siege in Folge'), lauf:true},
  showmaster:  {l:R=>R.showmasterList, s:x=>x.v, z:x=>x.v+'×', e:()=>'nach Satzrückstand gewonnen'},
  weekKing:    {l:R=>R.weekKingList||[], s:x=>Math.round(x.q*1000), z:x=>_awPz(x.q), e:()=>'der eigenen Wochen',
                b:x=>x.v+' von '+x.n+' als Player of the Week', f:x=>x.q, gilt:x=>x.gilt},
  dayKing:     {l:R=>R.dayKingList||[], s:x=>Math.round(x.q*1000), z:x=>_awPz(x.q), e:()=>'der eigenen Spieltage',
                b:x=>x.v+' von '+x.n+' als Player of the Day', f:x=>x.q, gilt:x=>x.gilt},
  mvt:         {l:R=>R.mvt, s:x=>Math.round(x.v), z:x=>(x.v>=0?'+':'')+Math.round(x.v), e:()=>'Elo zusammen', b:x=>x.g+' Partien zusammen'},
  bestDuo:     {l:R=>R.bestDuo, s:x=>x.g, z:x=>x.g, e:()=>'Partien zusammen', b:x=>x.w+' davon gewonnen', gilt:x=>x.g>=2},
  unstoppable: {l:R=>R.unstoppableList, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Sieg in Folge','Siege in Folge'), lauf:true},
  concreteWall:{l:R=>R.concreteWallList, s:x=>-Math.round(x.v*1000), z:x=>_awPz(x.v), e:()=>'der Games abgegeben', b:x=>'aus '+x.g+' Partien zusammen', f:x=>x.v},
  luckyCharm:  {l:R=>R.luckyCharmList, s:x=>Math.round(x.v*1000), z:x=>_awPz(x.v), e:()=>'knappe Partien gewonnen', b:x=>x.wins+' von '+x.games+' Partien', f:x=>x.v},
  giantSlayer: {l:R=>R.giantSlayerList, s:x=>Math.round(x.v*1000), z:x=>_awPz(x.v), e:()=>'Siegquote gegen Stärkere', b:x=>x.wins+' von '+x.games+' Partien gewonnen', f:x=>x.v},
  favoritenschreck:{l:R=>R.favoritenschreckList, s:x=>x.v, z:x=>x.v, e:()=>'Elo überwunden', b:x=>standFuer(x.m)+' am '+dateStr(x.m.created_at)},
  rivalry:     {l:R=>R.rivalryList, ids:x=>[...x.idsA, ...x.idsB], s:x=>Math.round(x.pct*1000), z:x=>_awPz(x.pct), e:()=>'als Gegner', b:x=>x.g+' Duelle', f:x=>x.pct},
  scorer:      {l:R=>R.scorer, s:x=>Math.round(x.avg*1000), z:x=>_awPz(x.avg), e:()=>'Tiebreaks gewonnen', b:x=>x.v+' von '+x.g+' Tiebreaks', f:x=>x.avg},
  wall:        {l:R=>R.wall, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Bagel','Bagels'), b:x=>'in '+x.g+' Partien', gilt:x=>x.v>=1},
  ice:         {l:R=>R.iceList, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Sieg zu Null','Siege zu Null'), b:()=>'ohne Satzverlust', gilt:x=>x.v>=1},
  plusMinus:   {l:R=>R.plusMinusList, s:x=>Math.round(x.v*10), z:x=>{ const v=Math.round(x.v*10)/10; return 'Ø '+(v>=0?'+':'')+komma(v,1); }, e:()=>'Game-Bilanz je Partie', b:x=>x.gf+':'+x.ga+' aus '+x.g+' Partien', f:x=>x.v},
  endgegner:   {l:R=>R.endgegner, gegner:true, s:x=>Math.round(x.pct*1000), z:x=>_awPz(x.pct), e:()=>'als Gegner', b:x=>x.g+' Begegnungen', f:x=>x.pct},
  clutch:      {l:R=>R.clutchList, s:x=>Math.round(x.wr*100), z:x=>_awPz(x.wr), e:()=>'Siegquote in knappen Partien', b:x=>x.w+' von '+x.g+' knappen Partien gewonnen', f:x=>x.wr},
  carryKing:   {l:R=>R.carryList, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Sieg mit dem Schwächsten','Siege mit dem Schwächsten'), gilt:x=>x.v>=1},
  solo:        {l:R=>R.soloList, s:x=>Math.round(x.wr*100), z:x=>_awPz(x.wr), e:()=>'Siegquote als Stärkster', b:x=>x.w+' von '+x.g+' Partien gewonnen', f:x=>x.wr},
  upset:       {l:R=>R.upsets, ids:_awSieger, s:x=>Math.round(x.sp*100), z:x=>_awPz(1-x.sp), e:()=>'Siegchance', b:x=>standFuer(x.m)+' am '+dateStr(x.m.created_at), einzeln:true},
  biggest:     {l:R=>R.biggest, ids:_awSieger, s:x=>x.diff, z:x=>standFuer(x.m), e:x=>x.diff+' Games Unterschied', b:x=>'am '+dateStr(x.m.created_at), einzeln:true},
  grinder:     {l:R=>R.grinder, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Partie','Partien')},
  underdog:    {l:R=>R.underdogList, s:x=>Math.round(x.pct*1000), z:x=>_awPz(x.pct), e:()=>'Siegquote als Außenseiter', b:x=>x.v+' von '+x.g+' Partien gewonnen', f:x=>x.pct},
  worstWr:     {l:R=>R.worstWr, s:x=>-Math.round(x.wr*100), z:x=>_awPz(x.wr), e:()=>'Siegquote', b:x=>x.w+' von '+x.g+' Partien gewonnen', f:x=>x.wr},
  coldStreak:  {l:R=>R.coldStreak, s:x=>x.v, z:x=>x.v, e:()=>'Niederlagen in Folge', b:()=>'läuft noch', lauf:true, gilt:x=>x.v>=2},
  lossStreaks: {l:R=>R.lossStreaks, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Niederlage in Folge','Niederlagen in Folge'), lauf:true},
  formtief:    {l:R=>R.formtief, s:x=>Math.round(x.drop), z:x=>'−'+Math.round(x.drop), e:()=>'Elo unter dem Hoch', b:x=>'Hoch '+x.peak+', jetzt '+x.cur},
  worstAtk:    {l:R=>R.worstAtk, s:x=>-Math.round(x.avg*1000), z:x=>_awPz(x.avg), e:()=>'Tiebreaks gewonnen', b:x=>x.v+' von '+x.g+' Tiebreaks', f:x=>x.avg},
  worstDef:    {l:R=>R.worstDef, s:x=>x.v, z:x=>x.v, e:x=>_awN(x.v,'Bagel kassiert','Bagels kassiert'), b:x=>'in '+x.g+' Partien', gilt:x=>x.v>=1},
  zirkus:      {l:R=>R.zirkusList, s:x=>Math.round(x.pct*1000), z:x=>_awPz(x.pct), e:()=>'der Niederlagen deutlich', b:x=>x.v+' von '+x.g+' Niederlagen', f:x=>x.pct},
  worstTeam:   {l:R=>R.worstTeam, s:x=>-Math.round(x.w/x.g*100), z:x=>_awPz(x.w/x.g), e:()=>'Siegquote', b:x=>x.w+' von '+x.g+' Partien gewonnen', f:x=>x.w/x.g},
  baustelle:   {l:R=>R.baustelleList, s:x=>x.best, z:x=>x.best, e:x=>_awN(x.best,'Niederlage in Folge','Niederlagen in Folge'), b:x=>x.cur===x.best&&x.cur>0?'läuft noch':'', lauf:true},
  pechvogel:   {l:R=>R.pechvogelList, s:x=>Math.round(x.pct*1000), z:x=>_awPz(x.pct), e:()=>'knappe Partien verloren', b:x=>x.v+' von '+x.g+' knappen Partien', f:x=>x.pct},
  cheesePlatter:{l:R=>R.cheesePlatterList, s:x=>Math.round(x.v*1000), z:x=>_awPz(x.v), e:()=>'der Games abgegeben', b:x=>'aus '+x.g+' Partien zusammen', f:x=>x.v},
  favoriteLoser:{l:R=>R.favoriteLoserList, s:x=>Math.round(x.v*1000), z:x=>_awPz(x.v), e:()=>'als Favorit verloren', b:x=>x.losses+' von '+x.games+' Partien', f:x=>x.v}
};
// Die Liste eines Awards, ohne Einträge, die nicht als Halter gelten.
function awListe(key, R){
  const w = AW_WERT[key]; if(!w || !R) return [];
  const l = w.l(R) || [];
  return w.gilt ? l.filter(w.gilt) : l;
}
function awIds(key, x){
  const w = AW_WERT[key];
  return w && w.ids ? w.ids(x) : (x.ids || [x.id]);
}
// Alle, die den Award heute tragen: gleichauf heißt geteilt.
function awTop(key, R){
  const l = awListe(key, R); if(!l.length) return [];
  const w = AW_WERT[key];
  if(w.einzeln) return [l[0]];
  const t = w.s(l[0]);
  return l.filter(x => w.s(x) === t);
}
// Der Platz eines Eintrags (0-basiert, gleichauf teilt) unter den ersten
// drei — oder null. Dieselbe Zählung für Profil, Duo-Blatt und Award-Blatt.
function awRang(key, R, trifft){
  const l = awListe(key, R), w = AW_WERT[key];
  let rang = 1;
  for(let i = 0; i < Math.min(l.length, 10); i++){
    if(w.einzeln) rang = i + 1;
    else if(i > 0 && w.s(l[i]) !== w.s(l[i-1])) rang = i + 1;
    if(rang > 3) break;
    if(trifft(l[i])) return {rang:rang - 1, x:l[i]};
  }
  return null;
}
function awText(key, x){
  const w = AW_WERT[key];
  return {z:String(w.z(x)), e:w.e ? w.e(x) : '', b:w.b ? w.b(x) : ''};
}
// Negativ ist, was rot ist [§C25] — eine Liste, nicht vier Kopien.
function awNeg(key){ const m = AWARD_META[key]; return !!(m && m.cls === 'red'); }
// Was auf einer leeren Kachel steht. Ein Strich sagt nicht, ob es niemand
// geschafft hat oder ob etwas kaputt ist [§6 „Ein leeres Feld liest sich
// als Fehler"]; der Satz nennt, was noch fehlt.
const AW_LEER = {
  showmaster:'Noch kein Sieg nach Satzrückstand', ice:'Noch kein Sieg zu Null',
  scorer:'Noch zu wenige Tiebreaks', worstAtk:'Noch zu wenige Tiebreaks',
  wall:'Noch kein Bagel gewonnen', worstDef:'Noch kein Bagel kassiert',
  carryKing:'Noch kein Sieg mit dem Schwächsten', favoritenschreck:'Noch kein Sieg gegen ein stärkeres Duo',
  underdog:'Noch zu wenige Partien als Außenseiter', giantSlayer:'Noch zu wenige Partien gegen Stärkere',
  favoriteLoser:'Noch zu wenige Partien als Favorit', clutch:'Noch zu wenige knappe Partien',
  pechvogel:'Noch zu wenige knappe Partien', luckyCharm:'Noch zu wenige knappe Partien',
  weekKing:'Noch keine Woche abgeschlossen', dayKing:'Noch kein Spieltag abgeschlossen'
};
// Die Lage im Feld: jeder Eintrag der Liste als Punkt auf seiner Skala, die
// Halter hervorgehoben, die Mitte als Strich. „72 %" sagt allein nicht, ob
// das knapp vorn oder weit weg ist — die Liste steht erst im Blatt. Das
// Bauteil ist der Beleg (belegFeldHtml) [§C27].
function awFeldHtml(key, liste, top, mitSkala){
  const w = AW_WERT[key];
  if(!w || !w.f || !liste) return '';
  const halter = new Set(top);
  return belegFeldHtml(liste.map(x => ({v:w.f(x), t:w.z(x), er:halter.has(x)})), mitSkala);
}
// Eine Serie als Lauf aus Feldern, wie im Feed (_newsSerienBand): acht ist
// eine Zahl, die Reihe zeigt, wie lang acht sind. Ab zwölf Feldern trägt
// die Zahl allein, die Reihe würde nur schmaler.
function awLaufHtml(n){
  const k = Math.max(0, Math.min(12, n | 0));
  return k ? `<div class="aw-lauf">${'<i></i>'.repeat(k)}</div>` : '';
}
function _awNameVon(key, x){
  return key === 'rivalry'
    ? pname(x.idsA[0])+' & '+pname(x.idsA[1])+' vs '+pname(x.idsB[0])+' & '+pname(x.idsB[1])
    : awIds(key, x).map(pname).join(AW_WERT[key] && AW_WERT[key].gegner ? ' gegen ' : ' & ');
}
// ── Die Award-Kachel [§C27] ─────────────────────────────────────────
// EIN Bauteil für Awards-Reiter, Award-Blatt des Profils und Duo-Blatt.
// Reihenfolge der Fragen: wer hat es, wie viel, woraus. Vorher stand der
// Wert ohne Einheit („6,90", „+10", „8er") und ohne Stichprobe da, die
// Stichprobe (`detail`) wurde gebaut und nie gezeigt, und das Profil und
// das Duo-Blatt bauten je eine eigene Kachel mit eigenen Farben.
//   top     Einträge, die den Award tragen (gleichauf) — leer: unbesetzt
//   o.gross der Aufmacher eines Abschnitts: quer, mit Skala unter dem Feld
//   o.liste die ganze Liste für die Lage im Feld
//   o.rang  Platz 2 oder 3, wo die Kachel keinen Platz 1 zeigt (Duo-Blatt)
//   o.attr  was ein Tippen öffnet; ohne Angabe das Award-Blatt
//   o.metall Metall statt Gold für das Können — im Rückblick trägt Gold
//           der Sieger, sonst nichts [§C31]
// Ein langes Wort im Kachelnamen wird kleiner, nicht gebrochen [§C27].
// `overflow-wrap` hielt den Namen in der Kachel und brach ihn dafür mitten
// im Wort: „Unaufhaltsa|m", „Showmaste|r" — ohne Trennstrich, weil nicht
// jedes Telefon Deutsch trennt und die Schrift offline breiter fällt.
function _awLblLang(t){
  const n = Math.max(...String(t).split(/[\s-]/).map(w => w.length));
  return n >= 14 ? ' sehrlang' : n >= 10 ? ' lang' : '';
}
function awKachelHtml(key, top, o){
  o = o || {};
  const meta = AWARD_META[key] || {title:key};
  const w = AW_WERT[key];
  const leer = !top || !top.length || !w;
  const x = leer ? null : top[0];
  const ids = leer ? [] : awIds(key, x);
  const neg = awNeg(key);
  // Drei Rollen, nicht sechs Katalogtöne [§C25].
  const ton = neg ? 'ton-neg' : ids.length >= 2 ? 'ton-team' : o.metall ? 'ton-metall' : 'ton-pos';
  const zkTon = neg ? 'rot' : ids.length >= 2 ? 'blau' : o.metall ? '' : 'gold';
  const gross = !!o.gross && !leer;
  const attr = o.attr != null ? o.attr : `data-award="${esc(key)}"`;
  const kopf = `<div class="aw-t-kopf">${zkHtml(AW_IC[key] || 'trophy', 'k', leer ? '' : zkTon)}`
    + `<span class="aw-t-lbl${_awLblLang(meta.title)}">${esc(meta.title)}</span></div>`;
  if(leer) return `<div class="aw-trophy ${ton} empty" ${attr}>${kopf}
      <div class="aw-t-held"><span class="aw-t-leer">—</span>
        <div class="aw-t-wer"><span class="aw-t-beleg">${esc(AW_LEER[key] || 'Noch nicht vergeben')}</span></div></div>
    </div>`;

  let traeger;
  if(ids.length === 1){
    const p = pmap()[ids[0]];
    // Dasselbe Wappen wie in der Ranglistenzeile [§C27]; auf der
    // Schandtafel ohne Reif und Feuer, ein glänzendes Zeichen wäre dort ein
    // Lob [awHeroAv].
    traeger = !p ? '' : neg
      ? avHtml(p, `--av:${gross ? 48 : 40}px`, {})
      : avHtml(p, '', {ins:true, px:gross ? 64 : 52});
  } else if(ids.length === 4){
    traeger = `<span class="aw-t-vier">${svgI('crossedSwords')}</span>`;
  } else {
    traeger = `<span class="aw-t-paar">${ids.slice(0,2).map(id => {
      const p = pmap()[id];
      return p ? avHtml(p, '', {}) : '';
    }).join('')}</span>`;
  }
  const t = awText(key, x);
  const mehr = o.mehr != null ? o.mehr : top.length - 1;
  const marke = o.rang ? `<span class="aw-t-gleich">Platz ${o.rang + 1}</span>`
    : mehr > 0 ? `<span class="aw-t-gleich" title="gleichauf">+${mehr}</span>` : '';
  const held = `<div class="aw-t-held">${traeger}<div class="aw-t-wer">`
    + `<span class="aw-t-name">${esc(_awNameVon(key, x))}</span>`
    + (t.b ? `<span class="aw-t-beleg">${esc(t.b)}</span>` : '') + `</div></div>`;
  const val = `<div class="aw-t-val"><b>${esc(t.z)}</b>${t.e ? `<span>${esc(t.e)}</span>` : ''}</div>`;
  const bild = w.lauf ? awLaufHtml(w.s(x)) : awFeldHtml(key, o.liste, top, gross);
  return `<div class="aw-trophy ${ton}${gross ? ' gross' : ''}" ${attr}>${marke}${kopf}${
    gross ? `<div class="aw-t-zeile">${held}${val}</div>` : held + val}${bild}</div>`;
}

// Die Vitrine ist zweispaltig. Bei ungerader Kachelzahl blieb unten rechts
// ein Loch — und ein leeres Feld liest sich als Fehler, nicht als Ende. Die
// letzte Kachel nimmt dann die ganze Reihe. Der Aufmacher zählt nicht mit:
// er hat seine Reihe schon für sich. Ein Bauteil für Awards-Reiter,
// Profil- und Duo-Blatt [§C27] — dort blieb das Loch stehen.
function awVitrineHtml(kacheln, cls){
  const liste = kacheln.slice();
  const hero = liste.length > 0 && / gross"/.test(liste[0].slice(0, liste[0].indexOf('>')));
  if((liste.length - (hero ? 1 : 0)) % 2 === 1){
    const i = liste.length - 1;
    liste[i] = liste[i].replace('class="aw-trophy ', 'class="aw-trophy allein ');
  }
  return `<div class="aw-vitrine${cls ? ' '+cls : ''}">${liste.join('')}</div>`;
}
