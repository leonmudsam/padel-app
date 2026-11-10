// ╔═══ §3.5 ─── ZENTRALE ELO-ENGINE (simulateElo) ──────────────────────╗
//     Eine kanonische Engine, die aus den DB-Match-Deltas Saison-Elo, History
//     und peakElo rekonstruiert. Wird per Cache (globalSim) abgeschirmt.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Pro Saison isoliert: Bei jedem Monatswechsel werden Elo/Played auf start_elo zurückgesetzt.
// Positions-Tracker bleibt saison-übergreifend. Karriere-Elo = gewichteter Durchschnitt
// der Saison-End-Elos (gewichtet nach Spielanzahl pro Saison).
// ════════════════════════════════════════════════════════════════════════
// ELO-AGGREGATION (DB-First Architektur)
// ════════════════════════════════════════════════════════════════════════
// simulateElo()           → aggregiert m.deltas aus DB (KEINE Slider-Berechnung)
// simulateEloWithSliders()→ berechnet Deltas neu mit aktuellen Slidern
// computeMatch()          → berechnet Delta für EIN Match mit Slidern (Match-Eingabe, 05-rang-elo.js)
//
// Die DB ist die Wahrheit. simulateEloWithSliders wird nur aufgerufen bei:
//   • Match-Eingabe (für das frische Delta) → via computeMatch
//   • Komplett-Neuberechnung (Settings) → via recalcHistory → persistRecalc
//
// Slider-Änderungen wirken NUR auf neue Matches. Vergangene Saisons bleiben
// stabil, weil sie aus den persistierten m.deltas aggregiert werden.
// ════════════════════════════════════════════════════════════════════════

// ─── §3.5a DB-First Aggregation (default simulateElo) ────────────────
function simulateElo(matchSubset, opts={}){
  const st=_eloStand(opts);
  [...matchSubset].sort((a,b)=>mts(a)-mts(b)).forEach(m=>{
    if(!_eloPartieBeginnt(st,m)) return;
    // ★ DB-First: Deltas aus DB lesen, NICHT mit Slidern berechnen
    const dbDeltas=m.deltas||{}, res={};
    [m.a1,m.a2,m.b1,m.b2].forEach(id=>{ res[id]=dbDeltas[id]||0; });
    _eloBuchen(st,m,res,m.exp_a ?? 0.5,{});
  });
  return _eloErgebnis(st);
}

// ─── §3.5b Was beide Engines gleich buchen ───────────────────────────
// Beide Engines unterscheiden sich nur darin, woher das Delta einer Partie
// kommt: aus der Datenbank oder aus den Reglern. Alles andere — Elo,
// Spiele, Serien, Games, Team-Elo, Saisonschnitt, Karriere-Elo, der
// Positions-Zähler — stand zweimal im Code, Zeile für Zeile abgeschrieben,
// und lief schon auseinander (eine Fassung sortierte die Sieger-Liste an
// Ort und Stelle, die andere eine Kopie). Eine Korrektur an der einen
// erreichte die andere nicht, und die Vorschau einer Partie rechnete dann
// auf einem anderen Stand als die Rangliste.
function _eloStand(opts){
  const startElo=opts.startElo ?? cfg.start_elo;
  const st={startElo, elo:{}, played:{}, playedSeason:{}, wins:{}, losses:{}, curStreak:{}, bestStreak:{},
    eloGain:{}, eloLoss:{}, gd:{}, peakElo:{}, teamElo:{}, seasonTeamElo:{}, history:[], posTracker:{},
    seasonEndElos:{}, seasonPlayed:{}, curSeason:null};
  players.forEach(p=>{
    st.elo[p.id]=startElo; st.played[p.id]=0; st.playedSeason[p.id]=0;
    st.wins[p.id]=0; st.losses[p.id]=0; st.curStreak[p.id]=0; st.bestStreak[p.id]=0;
    st.eloGain[p.id]=0; st.eloLoss[p.id]=0; st.gd[p.id]=0; st.peakElo[p.id]=startElo;
    st.posTracker[p.id]=posZaehler();
  });
  // Ein Stand zum Weiterrechnen (Vorschau einer einzelnen Partie). Ohne
  // `initialCurSeason` griffe der Saisonwechsel vor der ersten Partie nicht.
  const s=opts.initialState;
  if(s){
    ['elo','played','playedSeason','wins','losses','curStreak','bestStreak','eloGain','eloLoss','gd','peakElo']
      .forEach(k=>Object.assign(st[k], s[k]||{}));
    // Der Zähler je Spieler ist ein eigenes Objekt: flach kopiert zählte
    // die Vorschau in den Stand der Rangliste hinein.
    if(s.posTracker) Object.keys(s.posTracker).forEach(id=>{ st.posTracker[id]={...s.posTracker[id]}; });
    st.curSeason=opts.initialCurSeason||null;
  }
  return st;
}
// Der Schnappschuss der laufenden Saison: Endstand und Spiele je Spieler,
// der gespielt hat. Daraus rechnen Karriere-Elo und jede Monatsansicht.
function _eloSaisonZu(st){
  const sid=st.curSeason, ende=st.seasonEndElos[sid]={}, n=st.seasonPlayed[sid]={};
  players.forEach(p=>{
    if((st.playedSeason[p.id]||0)>0){ ende[p.id]=st.elo[p.id]; n[p.id]=st.playedSeason[p.id]; }
  });
}
function _eloSaisonNeu(st){
  players.forEach(p=>{ st.elo[p.id]=st.startElo; st.playedSeason[p.id]=0; });
}
// Vor jeder Partie: ein neuer Monat schließt den alten und setzt Elo und
// Saisonspiele zurück; der Positions-Zähler läuft über die Saisons weiter.
// Eine Partie mit einem unbekannten Spieler steht in der Geschichte, aber
// ohne Delta, und zählt nirgends.
function _eloPartieBeginnt(st, m){
  const sid=seasonOf(m.created_at).id;
  if(st.curSeason && st.curSeason!==sid){ _eloSaisonZu(st); _eloSaisonNeu(st); }
  st.curSeason=sid;
  if([m.a1,m.a2,m.b1,m.b2].some(id=>st.elo[id]===undefined)){
    st.history.push({matchId:m.id,eloBefore:{},eloAfter:{},deltas:{},expA:0.5,breakdowns:{}});
    return false;
  }
  return true;
}
function _eloBuchen(st, m, res, expA, breakdowns){
  const ids=[m.a1,m.a2,m.b1,m.b2], aWon=m.winner==='A';
  const eloBefore={}; ids.forEach(id=>eloBefore[id]=st.elo[id]);
  ids.forEach(id=>{
    const d=res[id], onA=(id===m.a1||id===m.a2), won=onA===aWon;
    st.elo[id]+=d; st.played[id]++; st.playedSeason[id]++;
    if(d>=0) st.eloGain[id]=(st.eloGain[id]||0)+d; else st.eloLoss[id]=(st.eloLoss[id]||0)+d;
    // Peak Elo: höchster je erreichter Saison-Elo (überlebt Saison-Resets)
    if(st.elo[id] > (st.peakElo[id] ?? st.startElo)) st.peakElo[id]=st.elo[id];
    const gf=onA?m.games_a:m.games_b, ga=onA?m.games_b:m.games_a;
    st.gd[id]=(st.gd[id]||0)+(gf-ga);
    if(won){ st.wins[id]++; st.curStreak[id]=st.curStreak[id]>0?st.curStreak[id]+1:1; }
    else   { st.losses[id]++; st.curStreak[id]=st.curStreak[id]<0?st.curStreak[id]-1:-1; }
    if(st.curStreak[id]>st.bestStreak[id]) st.bestStreak[id]=st.curStreak[id];
  });
  // Team-Elo, über alle Zeit und je Saison
  const sieger=aWon?[m.a1,m.a2]:[m.b1,m.b2], verlierer=aWon?[m.b1,m.b2]:[m.a1,m.a2];
  const saison=st.seasonTeamElo[st.curSeason]||(st.seasonTeamElo[st.curSeason]={});
  [sieger,verlierer].forEach(team=>{
    const key=team.slice().sort().join('|'), d=team.reduce((x,id)=>x+(res[id]||0),0);
    st.teamElo[key]=(st.teamElo[key]||0)+d;
    saison[key]=(saison[key]||0)+d;
  });
  st.history.push({matchId:m.id,eloBefore,eloAfter:{...st.elo},deltas:res,expA,breakdowns});
  // Positions-Zähler [§C44], mit dem Stand VOR der Partie
  posZaehlenPartie(st.posTracker,m,aWon,expA,eloBefore);
}
// Nach der letzten Partie: ihre Saison schließen, und liegt der Kalender
// schon im nächsten Monat, beginnt der leer — sonst zeigte die Rangliste
// am Ersten noch die Werte des Vormonats. Karriere-Elo ist der Schnitt der
// Saison-Endstände, gewichtet nach Spielen: eine Saison mit 30 Partien
// zählt 30-mal so viel wie eine mit einer.
function _eloErgebnis(st){
  if(st.curSeason){
    _eloSaisonZu(st);
    try {
      const kalender=currentSeason().id;
      if(kalender!==st.curSeason){ _eloSaisonNeu(st); st.curSeason=kalender; }
    } catch(e){}
  }
  const careerElo={};
  players.forEach(p=>{
    let sumElo=0, sumGames=0;
    Object.keys(st.seasonEndElos).forEach(sid=>{
      if(st.seasonEndElos[sid][p.id]!==undefined){
        const g=st.seasonPlayed[sid][p.id]||0;
        sumElo+=st.seasonEndElos[sid][p.id]*g;
        sumGames+=g;
      }
    });
    careerElo[p.id]=sumGames>0?sumElo/sumGames:null;
  });
  const {elo,played,playedSeason,wins,losses,curStreak,bestStreak,eloGain,eloLoss,gd,
         teamElo,seasonTeamElo,history,seasonEndElos,seasonPlayed,posTracker,peakElo,curSeason}=st;
  return {elo,played,playedSeason,wins,losses,curStreak,bestStreak,eloGain,eloLoss,gd,
          teamElo,seasonTeamElo,history,seasonEndElos,seasonPlayed,careerElo,
          posTracker,peakElo,curSeason};
}

// ─── §3.6 Slider-basierte Berechnung (für Match-Eingabe + Recalc) ────
const NEULING_BIS = 4;
const EINGEWOEHNT_BIS = 10;
function simulateEloWithSliders(matchSubset, opts={}){
  const st=_eloStand(opts);
  const {elo,playedSeason,posTracker}=st;
  // Neulinge bewegen sich schneller, bis ihre Elo zu ihnen passt. Die
  // Grenzen sind auf das Padel-Volumen gesetzt (rund zwanzig Matches je
  // Spieler im Monat): beim Tischkicker galten 5 und 15, und ein Padel-
  // Spieler wäre damit die halbe Saison über „neu" gewesen.
  const localDynK=(id)=>{const g=playedSeason[id]||0,e=elo[id];
    if(g<NEULING_BIS)return cfg.k_factor*(cfg.new_player_mult ?? 1.5);
    if(g<EINGEWOEHNT_BIS)return cfg.k_factor*(cfg.new_player_mid_mult ?? 1.2);
    if(e>cfg.start_elo+400)return cfg.k_factor*(cfg.veteran_damp ?? 0.85);
    return cfg.k_factor;};

  [...matchSubset].sort((a,b)=>mts(a)-mts(b)).forEach(m=>{
    if(!_eloPartieBeginnt(st,m)) return;
    const ids=[m.a1,m.a2,m.b1,m.b2];
    const teamA=[{id:m.a1,pos:m.a1_side},{id:m.a2,pos:m.a2_side}];
    const teamB=[{id:m.b1,pos:m.b1_side},{id:m.b2,pos:m.b2_side}];
    const aAvg=(elo[m.a1]+elo[m.a2])/2,bAvg=(elo[m.b1]+elo[m.b2])/2;
    const expA=expected(aAvg,bAvg);
    const rawMov=movMult(m);
    // Die Länge des Matches [§1.3]: ein Satz bewegt weniger als drei.
    const gewicht=partieGewicht(m);
    const res={}, breakdowns={};

    // Durchschnittliche Spielanzahl aller 4 Spieler (für Underdog-Berechnung)
    const avgGames=ids.reduce((s,id)=>s+(playedSeason[id]||0),0)/4;
    const avgElo=ids.reduce((s,id)=>s+elo[id],0)/4;
    // Match-Ø-K: alle 4 Spieler eines Matches teilen denselben K-Faktor (Mittelwert
    // ihrer individuellen dyn. K-Werte). Innerhalb eines Matches gilt damit dieselbe
    // Bewegungs-Skala für alle — keine 18-vs-35-Diskrepanz mehr zwischen Teamkollegen.
    const matchK=ids.reduce((s,id)=>s+localDynK(id),0)/4;

    const applyTeam=(team,opp,won,exp)=>{
      const e0=elo[team[0].id],e1=elo[team[1].id];
      const high=e0>=e1?team[0]:team[1];
      const w=riskWeights(Math.max(e0,e1),Math.min(e0,e1),cfg.risk_split);
      const oppAvg=(elo[opp[0].id]+elo[opp[1].id])/2;
      team.forEach(slot=>{
        const bd={playerId:slot.id,won,startElo:elo[slot.id]};
        const k=matchK*gewicht; bd.kFactor=k; bd.gewicht=gewicht;
        bd.expected=exp;
        const rawBase=k*((won?1:0)-exp); bd.rawBase=rawBase;

        // MoV
        // Null ist ein gültiger Sliderwert: dann gibt es keinen MoV-Aufschlag
        // bei Niederlagen. Nur eine fehlende Einstellung nutzt den Standard.
        const mov=won?rawMov:(1+(rawMov-1)*(cfg.mov_loss_damp ?? 0.5));
        bd.movMult=mov; bd.movEffect=rawBase*mov-rawBase;

        // Win-Boost
        const boost=won?(cfg.win_boost||1.12):1.0;
        bd.winBoost=boost; bd.winBoostEffect=rawBase*mov*boost-rawBase*mov;

        // Erfahrungs-Schutz
        const g=playedSeason[slot.id]||0;
        const protectShare=Math.max(0,Math.min(1,(g-5)/25));
        const protectMax = cfg.exp_protect_max ?? 0.1;
        const expProtect=won?1:(1-protectMax*protectShare);
        bd.expProtect=expProtect; bd.expProtectEffect=won?0:rawBase*mov*boost*expProtect-rawBase*mov*boost;

        // Underdog-Boost
        const myElo=elo[slot.id];
        const eloDiff=oppAvg-myElo;
        const gamesDiff=avgGames-(playedSeason[slot.id]||0);
        const eloMax = cfg.underdog_elo_max ?? 0.15;
        const gamesMax = cfg.underdog_games_max ?? 0.05;
        // Jede Komponente einzeln auf >=0 begrenzt: der Bonus belohnt nur, die Faktoren
        // bestrafen sich nicht gegenseitig. Ein Veteran mit Elo-Rückstand bekommt den
        // Elo-Boost trotz vieler Spiele; ein Neuling mit hohem Elo bekommt den
        // Spiele-Boost trotz Top-Elo. Niemand wird durch eine zweite Komponente bestraft.
        const eloFactor=Math.max(0, Math.tanh(eloDiff/400)*eloMax);
        const gamesFactor=Math.max(0, Math.tanh(gamesDiff/30)*gamesMax);
        const underdogRaw=eloFactor+gamesFactor;
        // Favoriten-Malus entfernt: nur Underdog-Boost (Sieg als Schwächerer) wirkt.
        // Favoriten/Veteranen, die verlieren, nehmen den vollen Elo-Hit.
        const underdogMult=(won&&underdogRaw>0)?1+underdogRaw:1;
        bd.underdogMult=underdogMult;
        bd.underdogEloDiff=Math.round(eloDiff);
        bd.underdogGamesDiff=Math.round(gamesDiff);

        // ── Low-Elo Verlustschutz ──
        // Spieler unter dem Match-Durchschnitts-Elo werden bei Niederlagen gedämpft.
        // Symmetrisch zum Underdog-Boost (gleiche tanh-Skala auf 200 Elo), wirkt aber
        // nur bei Niederlagen. Slider 0..1 bestimmt die maximale Dämpfung.
        // Beispiel (Slider=70%, Spieler 80 Elo unter Match-Avg): tanh(80/200)≈0.38,
        //   Dämpfung = 1 - 0.7*0.38 = 0.733 → Verlust auf 73% reduziert.
        const lowEloMax = cfg.low_elo_loss_damp ?? 0;
        const eloBelowAvg = Math.max(0, avgElo - myElo);
        const lowEloShare = Math.tanh(eloBelowAvg/200);
        const lowEloDamp = won ? 1 : (1 - lowEloMax*lowEloShare);
        bd.lowEloDamp=lowEloDamp; bd.lowEloShare=lowEloShare;
        bd.lowEloEffect=won?0:rawBase*mov*boost*expProtect*underdogMult*lowEloDamp - rawBase*mov*boost*expProtect*underdogMult;

        const afterMods=rawBase*mov*boost*expProtect*underdogMult*lowEloDamp;
        bd.afterMods=afterMods;

        // Risiko-Split
        const share=slot.id===high.id?w.strong:w.weak;
        bd.riskShare=share; bd.riskEffect=afterMods*share-afterMods;

        // Positions-Bonus [§C44]: dieselbe Lage wie im Profil, aus den Partien
        // vor dieser. Hier stand eine eigene Kopie der Profilformel.
        const lage=positionsLage(posTracker[slot.id]);
        const pf=posFactor(lage,slot.pos,cfg.pos_swing);
        const posMult=won?pf:(2-pf);
        bd.posStrength=lage.wert; bd.posFactor=pf; bd.posMult=posMult; bd.posEffect=afterMods*share*posMult-afterMods*share;

        // Match-Bonus
        // Der Spielbonus lässt sich abschalten; `||` aktivierte bei 0 wieder 1,5.
        const mb=cfg.match_bonus ?? 1.5;
        bd.matchBonus=mb;

        const finalDelta=afterMods*share*posMult+mb;
        bd.finalDelta=finalDelta;
        bd.endElo=elo[slot.id]+finalDelta;
        // Verbucht wird jeder Spieler für sich in ganzen Elo. Eine Korrektur,
        // die die Summe eines Teams erhält, gibt es nicht und braucht es
        // nicht: mit dem Spielbonus ist keine Partie ein Nullsummenspiel,
        // und sie schöbe einen halben Punkt von einem Spieler zum anderen.
        // Hier stand ihr Name über einer Summe, die niemand las.
        res[slot.id]=Math.round(finalDelta);
        breakdowns[slot.id]=bd;
      });
    };

    const aWon=m.winner==='A';
    applyTeam(teamA,teamB,aWon,expA);
    applyTeam(teamB,teamA,!aWon,1-expA);
    _eloBuchen(st,m,res,expA,breakdowns);
  });
  return _eloErgebnis(st);
}

// recalcHistory nutzt simulateEloWithSliders — berechnet ALLE Deltas mit aktuellen
// Slidern neu. Wird nur bei "Komplett neu berechnen" aufgerufen.
function recalcHistory(matchList){
  const sim=simulateEloWithSliders(matchList);
  return {playerElos:sim.elo, matchPatches:sim.history.map(h=>({id:h.matchId,deltas:h.deltas,exp_a:h.expA}))};
}

// Berechnet Breakdown für ein einzelnes Match (für Match-Detail Anzeige)
function matchBreakdown(matchId){
  // DB-First: Breakdowns sind nicht persistiert. Bei Bedarf berechnen wir sie
  // on-demand mit den AKTUELLEN Slidern für die Visualisierung. Das tatsächliche
  // Match-Delta in der DB kann von der Slider-Berechnung abweichen wenn der User
  // die Slider seit Match-Eingabe geändert hat. Die Delta-Anzeige im UI nutzt
  // deshalb immer den DB-Wert, nur die analytischen Komponenten sind Slider-basiert.
  const key='breakdownSim_'+matches.length+'_'+_cache.version;
  if(_cache._breakdownSimKey !== key){
    const sim=simulateEloWithSliders(matches);
    _cache._breakdownSim=new Map();
    sim.history.forEach(h=>_cache._breakdownSim.set(h.matchId, h.breakdowns||{}));
    _cache._breakdownSimKey=key;
  }
  return _cache._breakdownSim.get(matchId) || {};
}

// seasonId wie in matchesInPeriod: nur für 'season', und ohne Angabe die
// laufende. Für eine abgeschlossene Saison ist „Elo" nicht der heutige
// Stand, sondern der Stand am Saisonende — sonst zeigte die Tabelle vom
// Juni die Werte von heute.
function periodPlayerStats(period, seasonId){
  const monat=currentSeason().id;
  const sid=period==='season'?(seasonId||monat):'';
  // Auch die absolute Elo neben einer unveränderten Allzeit-Bilanz folgt
  // dem Saisonreset. Deren Quellenliste allein ändert sich dabei nicht.
  const key='periodStats_'+period+'_'+sid+'_'+monat+'_'+matches.length+'_'+_cache.version;
  // Die kanonische Periodenliste kennt Tages-/Wochenwechsel. Ihre Identität
  // gehört zum Hit, sonst bleibt die Statistik ohne neue Partie im alten
  // Zeitraum stehen. Kein zweiter Kalenderfilter mit leicht anderen Grenzen.
  const quelle=matchesInPeriod(period, sid);
  if(_cache._periodStatsKey===key && _cache._periodStatsQuelle===quelle) return _cache._periodStatsData;
  // EINE Wahrheit: alle Werte aus globalSim ableiten. Vorher gab es einen separaten
  // Sim für die Periode mit LEEREM Positions-Tracker → andere posBonus-Multiplikatoren
  // → andere Deltas → Anzeige "+X -Y" passte nicht zu "Elo" und Wochen-Werte
  // wichen vom Saison-Tab ab.
  const ms=[...quelle].sort((a,b)=>mts(a)-mts(b));
  // Gecachter History-Lookup (Map) statt ad-hoc Object-Aufbau pro Aufruf
  const histById=getHistoryByMatchId();
  // Akkumulatoren initialisieren (nur für Spieler die in der Periode gespielt haben)
  const stats={};
  const ensure=(id)=>{
    if(!stats[id]) stats[id]={wins:0,losses:0,games:0,eloGain:0,eloLoss:0,gd:0,curStreak:0};
    return stats[id];
  };
  ms.forEach(m=>{
    const h=histById.get(m.id);
    const deltas=h&&h.deltas?h.deltas:{};
    // Wenn das Match keine Deltas hat (z.B. weil ein Spieler unbekannt ist und die
    // Sim-Engine es übersprungen hat), zählt es auch nicht als gespieltes Match —
    // konsistent mit dem Vorgänger-Code (simulateElo überspringt solche Matches).
    if(!Object.keys(deltas).length) return;
    const aWon=m.winner==='A';
    [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
      const s=ensure(id);
      const d=deltas[id]||0;
      s.games++;
      if(d>=0) s.eloGain+=d; else s.eloLoss+=d;
      const onA=(id===m.a1||id===m.a2);
      const won=(onA&&aWon)||(!onA&&!aWon);
      const gf=onA?m.games_a:m.games_b, ga=onA?m.games_b:m.games_a;
      s.gd+=(gf-ga);
      if(won){s.wins++; s.curStreak=s.curStreak>0?s.curStreak+1:1;}
      else  {s.losses++; s.curStreak=s.curStreak<0?s.curStreak-1:-1;}
    });
  });
  // Gesamt ist ein Laufbahn-Vergleich und ohne Ruheständler; Tag, Woche und
  // Monat sind Zeiträume, in denen steht, wer darin gespielt hat [§C40].
  const hidden=new Set(players.filter(p=>!(period==='all'?ligaAktiv(p):sichtbar(p))).map(p=>p.id));
  // Für 'season': absoluter Elo-Stand aus globalSim (deckt sich mit Profil & Recap).
  // Für 'week'/'all': eloNet = Summe der Deltas in der Periode (Net = Gain + Loss).
  const gSim=getGlobalSim();
  // Abgeschlossene Saison: der Endstand aus dem Saison-Schnappschuss.
  const laufend=!sid||sid===currentSeason().id;
  const endElos=laufend?null:(gSim.seasonEndElos&&gSim.seasonEndElos[sid])||{};
  const result=Object.keys(stats).filter(id=>stats[id].games>0&&!hidden.has(id)).map(id=>{
    const s=stats[id];
    const net=s.eloGain+s.eloLoss; // eloLoss ist negativ
    const absElo=laufend
      ? (gSim.elo[id]!==undefined?gSim.elo[id]:cfg.start_elo)
      : (endElos[id]!==undefined?endElos[id]:cfg.start_elo);
    return {
      id, wins:s.wins, losses:s.losses, games:s.games,
      elo: Math.round(absElo), // laufende Saison: aktueller Stand; sonst: Saisonende
      eloNet: Math.round(net),
      eloGain: Math.round(s.eloGain),
      eloLoss: Math.round(s.eloLoss),
      gd: s.gd,
      curStreak: s.curStreak
    };
  });
  _cache._periodStatsKey=key;
  _cache._periodStatsQuelle=quelle;
  _cache._periodStatsData=result;
  return result;
}

