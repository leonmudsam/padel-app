// ╔═══ §8 ─── SPIELERPROFIL ─────────────────────────────────────────────╗
//     playerAwards, showPlayer und die Blätter, die das Profil öffnet:
//     Auszeichnungen samt Popover, Saisonverlauf, Rangsystem.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Ermittelt alle Awards, die ein Spieler aktuell hält (Platz 1–3)
function playerAwards(id){
  // Cache pro Spieler — wird beim Profil-Öffnen UND von showPlayerAwards aufgerufen.
  // Key bindet an matches.length + cache.version → invalidiert automatisch bei
  // neuem Match oder Sim-Reset.
  // Der LAUFENDE MONAT, nicht die ganze Liga. „Gesamt" gibt es als Reiter
  // nicht mehr — es sagte dasselbe wie die Liga-Rekorde. Was ein Spieler
  // gerade hält, ist eine Monatsfrage; was er je gehalten hat, steht in
  // seiner Chronik und in den Rekorden.
  // Die Saison steht fest im Schlüssel UND im Aufruf: das Profil folgt nicht
  // der Saisonwahl des Awards-Tabs, sonst zeigte es Juli, weil man dort
  // gerade Juli angesehen hat.
  const _pawSid = currentSeason().id;
  const _pawKey = 'paw_'+id+'_'+_pawSid+'_'+matches.length+'_'+_cache.version;
  if(!_cache._playerAwards) _cache._playerAwards = {};
  if(_cache._playerAwards[_pawKey]) return _cache._playerAwards[_pawKey];
  // Mit der Version im Schlüssel wüchse der Topf sonst über jede Version mit.
  _topfDeckel(_cache._playerAwards, 40);
  const R=awardRankings('season', _pawSid);
  // Platz und Wert kommen aus AW_WERT [§5.3d]: dieselbe Sortierung wie
  // Kachel und Blatt, gleichauf heißt geteilt. Hier standen drei eigene
  // Tabellen (Einzel, Duo, Partie) mit eigenen Sortier- und Anzeigeregeln,
  // und dieselbe Serie hieß im Profil „8er" und im Blatt „8er Serie".
  // Ein Award einer Partie gilt nur für die Sieger (awIds), nicht für alle
  // vier auf dem Platz.
  const found=[];
  Object.keys(AW_WERT).forEach(key=>{
    const r=awRang(key, R, x=>awIds(key, x).includes(id));
    if(!r) return;
    const ids=awIds(key, r.x);
    const eintrag={key, rank:r.rang, x:r.x, val:awText(key, r.x).z,
      mehr:r.rang===0 ? awTop(key, R).length-1 : 0};
    if(key==='rivalry'){
      const gegner=r.x.idsA.includes(id) ? r.x.idsB : r.x.idsA;
      eintrag.partner=null;
      eintrag.partnerLabel='vs '+gegner.map(pname).join(' & ');
    } else if(ids.length===2 && !AW_WERT[key].einzeln && !AW_WERT[key].gegner){
      eintrag.partner=ids.find(x=>x!==id)||null;
    }
    found.push(eintrag);
  });

  _cache._playerAwards[_pawKey] = found;
  return found;
}

// Woraus die Einstufung im Positions-Profil entsteht [§C44], mit den
// Zahlen des Spielers, und was sie in der Elo bewirkt. Ohne das Blatt stand
// dort nur ein Prozentwert, und wer ihn nachrechnen wollte, fand Partien
// und Siegquoten, aber nicht die Leistung gegen die Erwartung, die ihn
// verschiebt, und nicht, wie stark Gegner und Partner waren.
//
// Die Einheit steht in der Zeile, nicht hinter jeder Zahl: mit „%-Punkte"
// in beiden Spalten lief die Tabelle bei 360 px über den Rand.
function zeigeProfilPosInfo(id){
  const t = posPerfFrom(id, matches), lage = positionsLage(t);
  const pp = v => v == null ? '–' : _ppZeichen(v);
  const elo = v => v == null ? '–' : v >= .5 ? '+' + Math.round(v) : v <= -.5 ? '−' + Math.round(-v) : '0';
  const quote = v => v == null ? '–' : pct(v) + ' %';
  const zeile = (lbl, a, d) => `<span class="l">${lbl}</span><span>${a}</span><span>${d}</span>`;
  // Die Wirkung in der Elo, für diesen Spieler ausgerechnet: die Seite mit
  // Bonus zuerst. Ein Ausschlag unter 0,05 % ist keiner.
  const fS = posFactor(lage, 'drive', cfg.pos_swing), fD = posFactor(lage, 'reves', cfg.pos_swing);
  const proz = f => { const q = Math.abs(f - 1) * 100; return q >= 9.95 ? String(Math.round(q)) : komma(q, 1); };
  const [plus, minus] = fS >= fD ? [['rechts', fS], ['links', fD]] : [['links', fD], ['rechts', fS]];
  const gross = w => w[0].toUpperCase() + w.slice(1);
  const grenze = Math.round(POS_GRENZE * 100), daempfer = Math.round(POS_DAEMPFER * 100);
  const wirkung = Math.abs(plus[1] - 1) < .0005
    ? 'In der Elo zählen beide Seiten gleich.'
    : `In der Elo bringt ein Sieg ${plus[0]} ${proz(plus[1])} % mehr, und eine Niederlage dort kostet ${proz(plus[1])} % weniger. `
      + `${gross(minus[0])} ist es umgekehrt, ${proz(minus[1])} %.`
      + ` Je klarer die Einstufung, desto mehr: auf der schwächeren Seite höchstens ${grenze} %, auf der stärkeren höchstens ${daempfer} %.`;
  openSheet(blattKopfHtml({ic:'info', titel:'So entsteht die Einstufung', unter:pname(id)})
    + `<div class="pos-info">
      <div class="pos-info-tab">${zeile('', '<b>Drive · rechts</b>', '<b>Revés · links</b>')}${
        zeile('Partien', t.aG, t.dG)}${zeile('Siegquote', quote(t.aWr), quote(t.dWr))}${
        zeile('Gegner, Elo-Abstand', elo(t.aGegAvg), elo(t.dGegAvg))}${
        zeile('Partner, Elo-Abstand', elo(t.aMitAvg), elo(t.dMitAvg))}${
        zeile('Siege gegen die Erwartung, %-Punkte', pp(t.aPerfAvg), pp(t.dPerfAvg))}${
        zeile('Games gegen die Erwartung, %-Punkte', pp(t.aGmAvg), pp(t.dGmAvg))}${
        zeile('Leistung gegen den eigenen Schnitt', pp(lage.rA), pp(lage.rD))}</div>
      <p>Die Erwartung jeder Partie kommt aus der Elo aller vier: gegen stärkere Gegner liegt sie niedriger, mit einem stärkeren Partner höher. Der Elo-Abstand zeigt, wie viel stärker (+) oder schwächer (−) Gegner und Partner im Schnitt waren. Gegen die Erwartung zählen Sieg und Anteil der Games je zur Hälfte.</p>
      <p>Die Einstufung rückt zu der Seite, auf der die Leistung besser ist. Wo jemand spielt, zählt vor allem, solange eine Seite wenige Partien hat; dort sagt die Leistung noch wenig.</p>
      <p>${wirkung}</p>
      <p><b>${pct(lage.wert)} % Drive</b> · eingestuft als <b>${esc(posClassify(lage.wert).label)}</b></p></div>`);
}

function showPlayer(id){
  const p=pmap()[id];if(!p)return;
  _sheetSetReopen(()=>showPlayer(id));
  const allStats = allPlayerStats(); // Hole den globalen Cache einmal
  const s = allStats[id] || playerStats(id); // Nutze Cache, Fallback für versteckte Spieler
  // Die Bestwerte der Beziehungen nennen im Profil eines Aktiven nur, wer
  // noch spielt [§C40]; das Profil eines Ruheständlers zeigt seine Laufbahn,
  // wie sie war.
  const _bezWer = imRuhestand(id) ? sichtbar : ligaAktiv;
  const {best,worst}=bestWorstMate(id, s, _bezWer);
  const {nemesis:nem,favorite:fav}=nemesis(id, s, _bezWer);
  const wr=Math.round(s.wr*100);
  const drvWr=s.drvWr!==null?Math.round(s.drvWr*100):null;
  const revWr=s.revWr!==null?Math.round(s.revWr*100):null;
  // Saison-Platzierung: nur Spieler mit Spielen IN DIESER SAISON werden gerankt.
  // Wer 0 Saison-Spiele hat, bekommt keinen #-Badge.
  // Sortierung: Saison-Elo (gSim.elo enthält nach Saison-Reset die aktuelle Saison-Elo).
  const gSim=getGlobalSim();
  // Der Monat ist ein Zeitraum [§C40]: derselbe Platz wie in der Liga.
  const rankedSeason=players.filter(x=>sichtbar(x))
    .filter(x=>(gSim.playedSeason[x.id]||0)>0)
    .sort((a,b)=>(gSim.elo[b.id]??cfg.start_elo)-(gSim.elo[a.id]??cfg.start_elo));
  const rank=rankedSeason.findIndex(x=>x.id===id)+1;
  const streak=s.curStreak;
  // Eine Lage für Profil, Rollen und Info-Blatt [§C44].
  const posLage=positionsLage(posPerfFrom(id,matches));
  const autoDrive=posLage.wert;
  const drvPct=Math.round(autoDrive*100);
  const revPct=100-drvPct;
  const _streakInfo=longestPlayerStreakInfo(id,matches);
  const longestStr=_streakInfo.best;
  // Peak-Datum als kompakter "Monat Jahr"-String (dezent), z.B. "Mai 2026"
  const longestPeakLabel = _streakInfo.peakDate
    ? new Date(_streakInfo.peakDate).toLocaleDateString('de-DE',{month:'long',year:'numeric'})
    : '';
  // Letzte 15 Spiele (chronologisch alt→neu) für die "Aktuelle Serie"-Card.
  // Ergänzt den bisherigen "letzte 5"-Form-Trail oben, der in der Header-Sektion bleibt.
  // Der Badge-/Statistik-Kontext hält diese chronologische Sicht bereits.
  // Nicht für 15 Punkte, fünf Punkte und das Peak-Datum die ganze Liga
  // dreimal filtern und sortieren. Die gemeinsamen Arrays bleiben lesbar.
  const playerMs = matchesOfPlayer(id, matches);
  // Die Gegenwart eines Ruheständlers ist sein Abschied [§C40]: „diese
  // Saison" heißt für ihn die Saison, in der er aufgehört hat. Mit der
  // laufenden stand dort zwei Monate später ein Strich, und die Kurve der
  // Saison war verschwunden — ohne dass er gespielt hatte.
  const _ruhe = imRuhestand(id);
  const _profilSid = _ruhe ? seasonOf(new Date(ruhestandMs(id))).id : currentSeason().id;
  const seasonMs = matchesOfPlayer(id, matchesInSeason(_profilSid));
  const _last15 = playerMs.slice(-15);
  const last15DotsHtml = _last15.map(m=>{
    const onA=(id===m.a1||id===m.a2);
    const w=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
    return `<i class="${w?'':'l'}"></i>`;
  }).join('');

  // Form: letzte 5 Matches
  const formMs=_last15.slice(-5);
  const formHtml=formMs.map(m=>{const onA=(id===m.a1||id===m.a2);
    const w=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
    return `<div class="pd ${w?'w':'l'}"></div>`;}).join('');

  // Elo-Sparkline für die aktuelle Saison (zeigt Saison-Verlauf)
  let sparkHtml='';
  {
    if(seasonMs.length>=2){
      // FIX: Spark-Trace aus der echten Sim-History bauen, NICHT aus m.deltas (DB).
      // m.deltas kann durch Algo-Tweaks vs. live-Sim divergieren → Anzeige zeigt 222 Elo,
      // Spark zeigt aber +221 weil die Summe der DB-Deltas leicht abweicht.
      // Mit sim.history.eloAfter[id] endet die Linie exakt auf dem angezeigten Elo-Wert.
      const histById = getHistoryByMatchId();
      let eloTrace = cfg.start_elo;
      const series = [eloTrace];
      for(const m of seasonMs){
        const h = histById.get(m.id);
        if(h && h.eloAfter && h.eloAfter[id] !== undefined){
          eloTrace = h.eloAfter[id];
        } else {
          // Fallback (z.B. Match liegt außerhalb der Sim wegen versteckter Spieler):
          // DB-Delta verwenden, damit die Linie weiterläuft
          eloTrace += (m.deltas||{})[id] || 0;
        }
        series.push(eloTrace);
      }
      const minE=Math.min(...series), maxE=Math.max(...series);
      const range=Math.max(20, maxE-minE); // mind. 20 Elo-Range für Sichtbarkeit
      const W=300, H=42, pad=4;
      const usableH=H-2*pad;
      const points=series.map((e,i)=>{
        const x=(i/(series.length-1))*W;
        const y=pad+(1-(e-minE)/range)*usableH;
        return [x,y];
      });
      const linePath='M'+points.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' L');
      const fillPath=linePath+` L${W},${H} L0,${H} Z`;
      const last=points[points.length-1];
      // Konsistenz mit der Elo-Anzeige: gerundete Endsumme minus gerundeter Start
      const net=Math.round(series[series.length-1])-Math.round(series[0]);
      const netCls=net>=0?'pos':'neg';
      const netTxt=(net>=0?'+':'')+net;
      // [§C25] Regel 1: Die eigene Elo-Kurve heißt „ich" — sie trägt die
      // Rangfarbe, nicht Grün oder Rot. Die Richtung steht als Vorzeichen
      // im Fuß darunter, wo Regel 3 gilt.
      const lineCol='var(--ak)';
      const gradId='ppspark-'+id;
      sparkHtml=`
        <div class="pp-spark">
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
            <defs>
              <linearGradient id="${esc(gradId)}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="${lineCol}" stop-opacity=".35"/>
                <stop offset="100%" stop-color="${lineCol}" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path d="${fillPath}" fill="url(#${esc(gradId)})"/>
            <path d="${linePath}" fill="none" stroke="${lineCol}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>
            <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.5" fill="${lineCol}"/>
            <circle class="pp-ping" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.5"/>
          </svg>
        </div>
        <div class="pp-spark-foot">
          <span>Elo · ${esc(seasonLabel(_profilSid))}</span>
          <span class="delta ${netCls}">${netTxt}</span>
        </div>`;
    }
  }

  const pleitenZeichen = lossStreakInline(streak);
  const _posCls = posClassify(autoDrive);
  const posIcon = svgI(_posCls.icon);
  const posLabel = _posCls.label;

  // ── Peak-Elo (Saison + Allzeit) für die Trinity-Box ──
  // Peak Saison: höchster Stand in der LAUFENDEN Saison — aus History rekonstruiert
  // Peak Allzeit: höchster je erreichter Saison-Elo (saison-übergreifend, aus globalSim)
  // Zusätzlich: Saison-Label des Allzeit-Peaks als Sub-Text ("Mai 2026")
  let peakSeason = null, peakAlltime = null, peakAlltimeSeason = '';
  {
    const histByMatch = getHistoryByMatchId();
    // Peak Saison: über alle Saison-Matches des Spielers in chronologischer Reihenfolge
    const seasonMsForPeak = seasonMs;
    if(seasonMsForPeak.length){
      let v = cfg.start_elo, mx = v;
      for(const m of seasonMsForPeak){
        const h = histByMatch.get(m.id);
        if(h && h.eloAfter && h.eloAfter[id]!==undefined) v = h.eloAfter[id];
        else v += (m.deltas||{})[id] || 0;
        if(v > mx) mx = v;
      }
      peakSeason = Math.round(mx);
    }
    // Peak Allzeit: bevorzugt aus globalSim.peakElo, sonst über alle Matches scannen
    const peakV = gSim.peakElo ? gSim.peakElo[id] : undefined;
    if(peakV !== undefined){
      peakAlltime = Math.round(peakV);
      // Saison-Label des Peak-Matches finden (höchster eloAfter[id] über alle Matches).
      // Einmaliger O(n)-Scan beim Öffnen des Profils — getHistoryByMatchId ist gecached.
      let bestMatch = null, bestVal = -Infinity;
      for(const m of playerMs){
        const h = histByMatch.get(m.id);
        if(!h || !h.eloAfter || h.eloAfter[id] === undefined) continue;
        if(h.eloAfter[id] > bestVal){
          bestVal = h.eloAfter[id];
          bestMatch = m;
        }
      }
      if(bestMatch){
        const sn = seasonOf(bestMatch.created_at);
        peakAlltimeSeason = sn.label;
      }
    }
  }

  // Awards: NUR Platz 1
  const awards=playerAwards(id).filter(a=>a.rank===0);
  const awardCount=awards.length;

  // Jede Auszeichnung gehört zu GENAU EINER von drei Gruppen, und die Gruppe
  // ist dieselbe Rolle, die ihre Kachel färbt [§C25]: rot ist die
  // Kehrseite, wer sie zu zweit oder zu viert trägt, gehört zum Team, der
  // Rest ist eigene Leistung. Hier standen drei feste Schlüssellisten, die
  // bei jeder neuen Auszeichnung von Hand nachgezogen werden mussten.
  const awArt = a => awNeg(a.key) ? 'neg' : awIds(a.key, a.x).length >= 2 ? 'team' : 'pos';
  const cnt = art => awards.filter(a => awArt(a) === art).length;
  const awCats = [
    {ic:'star',      nm:'Positive<br>Awards', n: cnt('pos')},
    {ic:'handshake', nm:'Team<br>Awards',     n: cnt('team')},
    {ic:'skull',     nm:'Negative<br>Awards', n: cnt('neg')},
  ];

  const badges=getCachedBadges(id);
  const badgeTotal=badges.reduce((sum,b)=>sum+b.count,0);

  const sa = playerSeasonAwards(id);
  // Jede Saison, in der gespielt wurde. Es waren die letzten fünf, und wer
  // länger dabei ist, fand seine ersten Monate nirgends im Profil.
  const seasonHistory = computeSeasonHistory(id);
  // Saison-Trend: vergleicht jüngste mit älteren Platzierungen, über die
  // letzten fünf. Über die ganze Laufbahn verglichen hieße „Form" das erste
  // halbe Jahr gegen das zweite.
  const seasonTrend = (() => {
    if(!seasonHistory || seasonHistory.length < 2) return null;
    const places = seasonHistory.slice(0, 5).map(h => h.place).filter(p => p > 0);
    if(places.length < 2) return null;
    const half = Math.ceil(places.length / 2);
    const recent = places.slice(0, half);
    const older = places.slice(half);
    if(!older.length) return null;
    const recentAvg = recent.reduce((a,b)=>a+b, 0) / recent.length;
    const olderAvg  = older.reduce((a,b)=>a+b, 0) / older.length;
    if(recentAvg < olderAvg - 0.5) return {arrow:'↗', cls:'', text:'Form steigend'};
    if(recentAvg > olderAvg + 0.5) return {arrow:'↘', cls:'neg', text:'Form fallend'};
    const avg = places.reduce((a,b)=>a+b, 0) / places.length;
    if(avg <= 3) return {arrow:'→', cls:'', text:'stabil top 3'};
    if(avg <= 5) return {arrow:'→', cls:'neutral', text:'stabil top 5'};
    return {arrow:'→', cls:'neutral', text:'Ø Platz '+Math.round(avg)};
  })();

  const rInfo = getPlayerRank(id);
  const tierClass = rInfo ? ('pp-tier-' + rInfo.label.toLowerCase()
    .replace('ä','a').replace('ö','o').replace('ü','u')) : '';

  // Perzentil-Berechnung
  let percentileTxt = '', percentilePct = 0;
  if(rInfo){
    const pct = rangPerzentil(id);
    if(pct > 0){
      percentileTxt = 'Top ' + Math.ceil(pct) + '\u00A0%';
      percentilePct = pct;
    }
  }

  // Avatar
  const avInner = avatarInnerHtml(p);
  const hasEmoji = !!(p.avatar_id && avatarEmoji(p.avatar_id));
  // Kein inline-Grund mehr: die Scheibe hinter dem Buchstaben war eine
  // aus der Spieler-ID gewürfelte Hashfarbe. Im Profil kommt sie jetzt
  // aus dem Rang [§C25] — überall sonst bleibt avColor() unberührt.
  const avBg = '';
  const avClass = hasEmoji ? 'pp-av-inner icon-av' : 'pp-av-inner';

  // Eine Karte pro Auszeichnung (chronologisch, neueste zuerst)
  // Wenn ein Spieler in einer Saison sowohl Player als auch Team-Champion war,
  // bekommt er beide Karten separat.
  const trophies = [];
  sa.forEach(s=>{
    if(s.player_id===id){
      trophies.push({type:'player', label:s.label||'', date:s.id||s.start_date||''});
    }
    if(s.team_p1===id||s.team_p2===id){
      const mate = s.team_p1===id ? s.team_p2 : s.team_p1;
      trophies.push({type:'team', label:s.label||'', date:s.id||s.start_date||'', mate});
    }
  });
  // Sortierung: neueste zuerst (Saison-ID ist 'YYYY-MM', String-Sort = chronologisch)
  trophies.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  // Jeder Titel trägt das Lauflicht des Goldes [§C27]; es wandert von Titel
  // zu Titel durch die Reihe.
  const trophyHtml = `
    <div class="pp-trophies">
      ${trophies.map((t, ti)=>{
        if(t.type==='player') return `
        <div class="pp-tr">
          <span class="ic svg-ic">${svgI('trophy')}</span>
          <div class="ti">Player of<br>the Season</div>
          <div class="su">${esc(t.label)}</div>${glanzBahn(.4 + ti * .6)}
        </div>`;
        const teamAttr = t.mate ? ` data-team="${esc(paarKey(id, t.mate))}"` : '';
        return `
        <div class="pp-tr team"${teamAttr}>
          <span class="ic svg-ic">${svgI('handshake')}</span>
          <div class="ti">Team of<br>the Season</div>
          <div class="su">${esc(t.label)}</div>${glanzBahn(.4 + ti * .6)}
        </div>`;
      }).join('')}
    </div>`;

  const seasonRailHtml = seasonHistory.length ? `
    <div class="pp-seasons" id="ppSeasonsRail">
      ${seasonHistory.map((sn, si)=>{
        const cls = sn.place===1?'gold':sn.place===2?'silver':sn.place===3?'bronze':'';
        const medal = sn.place>=1&&sn.place<=3 ? medalB(sn.place-1) : '';
        const eloCls = sn.eloDelta>=0?'pos':'neg';
        const eloTxt = (sn.eloDelta>=0?'+':'')+sn.eloDelta;
        return `<div class="pp-sn ${cls}">
          <div class="mo">${esc(sn.label)}</div>
          <div class="pl"><span class="n big">${sn.place?sn.place+'.':'–'}</span></div>
          <div class="el ${eloCls}">${eloTxt}</div>
          <div class="rc">${sn.wins}–${sn.losses}</div>${sn.place === 1 ? glanzBahn(3 + si * .5) : ''}
        </div>`;
      }).join('')}
    </div>` : '';

  // Karriere-Rang als Hero-Card: prominenter Tier-Name + Ø Saison-Elo + Journey-Bar.
  // Die Tier-Farbvariablen (--pp-tier-1/2/glow) werden vom Parent-Element (pp-sec.{tier})
  // vererbt — daher färben sich Icon, Label, Glow, Strahl automatisch nach Tier.
  const _activeIdxRaw = rInfo ? RANKS.findIndex(rank => rank.label === rInfo.label) : -1;
  const _activeIdx = _activeIdxRaw >= 0 ? (RANKS.length - 1 - _activeIdxRaw) : -1;
  const _ranksReversed = RANKS.slice().reverse();
  const _journeyTier = rInfo
    ? ('pp-tier-'+rInfo.label.toLowerCase().replace('ä','a').replace('ö','o').replace('ü','u'))
    : '';
  const _fillPct = _activeIdx >= 0 ? _activeIdx * 25 : 0;
  const _tierIcon = icPfad(rInfo && rInfo.icon ? rInfo.icon : 'chartBar');

const rankProgHtml = rInfo ? `
  <div class="pp-rank-card ${_journeyTier}" id="ppRanksBtn" style="cursor:pointer">
    <div class="pp-rank-hero">
      <div class="pp-rank-tier-block">
        <div class="pp-rank-icon">
          <svg viewBox="0 0 24 24">${_tierIcon||''}</svg>
        </div>
        <div class="pp-rank-tier-text">
          <div class="pp-rank-label">${esc(rInfo.label)}</div>
          <div class="pp-rank-sub">${percentileTxt||'—'}</div>
        </div>
      </div>
      <div class="pp-rank-elo-block">
        <div class="pp-rank-elo">${rInfo.avg}</div>
        <div class="pp-rank-elo-lbl">Ø Saison-Elo</div>
      </div>
    </div>
    <div class="pp-ranks-journey">
      <div class="pp-rj-track"></div>
      <div class="pp-rj-fill-track"><div class="pp-rj-fill" style="width:${_fillPct}%"></div></div>
      <div class="pp-rj-tiers">
        ${_ranksReversed.map((r, i) => {
          const state = _activeIdx < 0 ? '' : (i < _activeIdx ? 'done' : (i === _activeIdx ? 'active' : ''));
          return `<div class="pp-rj-tier ${state}">
            <div class="pp-rj-dot"></div>
            <div class="pp-rj-lbl">${esc(r.label)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>` : `
  <div class="pp-rank-card" id="ppRanksBtn" style="cursor:pointer">
    <div class="pp-rank-empty">Noch keine Saison-Daten</div>
  </div>`;

  // ── Das Farbgesetz [§C25] und die Stufe ──────────────────────────
  //     Die ganze Seite bekommt EINE Farbe — die des Rangs — und EIN
  //     Muster — das der Prestige-Stufe. Beides hängt am Wurzelelement,
  //     damit jede Karte darunter sich daran bedienen kann, statt ihre
  //     eigene Farbe mitzubringen.
  const _ton = rangTon(id);
  const _stufe = 'st-' + prestigeOf(id).insignie.key;
  // Das Profil eines Ruheständlers steht, wie es beim Abschied stand [§C40]:
  // Wappen, Rekorde und Rang kommen aus dem eingefrorenen Stand.
  const _hatPartien = matches.some(m => m.a1 === id || m.a2 === id || m.b1 === id || m.b2 === id);

  openSheet(`
   <div class="pp-root pp-player ${_stufe}" style="--ak:${_ton.c};--ak-rgb:${_ton.rgb}">
    <header class="pp-header ${tierClass}">
      <button class="pp-edit-btn" id="ppEditBtn" title="Profil bearbeiten">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </button>
      ${(()=>{
        // Der Fingerabdruck [§13.11] als Wasserzeichen: dieselbe Form,
        // die im Laufbahn-Sheet groß und beschriftet steht, hier nur als
        // Silhouette hinter dem Kopf. Sie erklärt nichts — sie ist da.
        const _wz = fingerWasserzeichenSvg(id);
        return _wz ? `<div class="pp-fa-wz">${_wz}</div>` : '';
      })()}
      ${(()=>{
        // Status-Ring (§13.7): derselbe Ring wie in der Rangliste, nur groß.
        // Er legt sich als zweiter Kreis um den Tier-Ring, statt ihn zu
        // ersetzen — Rang und Zustand sind zwei verschiedene Aussagen.
        // Der Serienring war grün, die Flamme ist rangfarben, die Chip-Zeile
        // sagt dieselbe Zahl noch einmal: dreimal dieselbe Nachricht in zwei
        // Farben. Wo die Flamme brennt, färbt sie den Ring nicht — sie IST
        // der Ring; ihr Zeichen steht trotzdem daran.
        // Ein Lob färbt den Ring, eine Niederlagenserie ebenso. Trägt jemand
        // beides, wechselt der Ring langsam zwischen den Farben: Gold allein
        // verschwiege die Serie, Rot allein die Auszeichnung.
        const _ringe = avRingeOf(id).filter(r => r.kind !== 'blaze' && r.kind !== 'hot');
        const _plus = _ringe.find(r => r.tone !== 'red'), _minus = _ringe.find(r => r.tone === 'red');
        const _r = _plus || _minus;
        const _rt = _r ? titleTone(_r.tone) : null;
        const _rt2 = (_plus && _minus) ? titleTone(_minus.tone) : null;
        // Das Insignium [§13.9] liegt HINTER dem Avatar: Stufe als Form,
        // Rang als Material, Meistertitel als Aura dahinter [§C36] — hier
        // bewegt, überall sonst als stilles Bild. Die Liga-Seite
        // steht im Schild — die alte Ecken-Zahl und die Legenden-Krone
        // sind damit doppelt und fallen weg.
        // Die Siegesserie brennt auch hier [§C26] — aber in der Rangfarbe
        // und ganz hinten, hinter dem Insignium. Sie soll die Seite wärmen,
        // nicht mit ihr streiten.
        const _fu = znFeuer(id);
        return `<div class="pp-av-wrap${_r ? ' has-ring' : ''}${_rt2 ? ' ring-zwei' : ''}${_fu ? ' zn-rang zn-l'+_fu : ''}"${_rt ? ` style="--tt:${_rt.c};--ttr:${_rt.rgb}${_rt2 ? `;--tt2:${_rt2.c};--ttr2:${_rt2.rgb}` : ''}"` : ''}
          data-prestige="${esc(id)}" title="${esc(prestigeOf(id).insignie.name + ' · ' + prestigeOf(id).punkte + ' Prestige')}">
        ${_fu ? ZN_FEUER_GROSS[_fu] : ''}
        ${auraLebendHtml(meisterTitel(id))}
        ${insigniumSvg(id, {lebendig:true})}
        <div class="pp-av-ring">
          <div class="${avClass}" ${avBg}>${avInner}</div>
        </div>
        ${_avRingMarkenHtml(id)}
      </div>`;
      })()}
      <h1 class="pp-name">${esc(p.name)}${pleitenZeichen?` ${pleitenZeichen}`:''}</h1>
      ${_titlePillHtml(id)}
      ${_avRingChipHtml(id)}

      <div class="pp-pills">
        ${rInfo?`<span class="pp-pill tier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icPfad(rInfo.icon)}</svg>
          ${esc(rInfo.label)}
        </span>`:''}
        <span class="pp-pill">${posIcon}${esc(posLabel)}</span>
        ${_ruhe ? `<button type="button" class="pp-pill ruhe" id="ppAbschied">${svgI('hourglass')}Karriereende ${esc(datumFmt(ruhestandMs(id), 'tmj'))}</button>` : ''}
      </div>

      ${(()=>{
        // ── SIGNATURE: Peak-Elo-Trinity ──
        // Drei zusammenhängende Werte: Aktuell (acid) | Peak Saison | Peak Allzeit (tier-getönt)
        const games=gSim.playedSeason[id]||0;
        // Ein Ruheständler hat keine laufende Saison [§C40]: vorn steht die
        // Karriere-Elo, mit der er aufgehört hat.
        const curElo = _ruhe ? Math.round(gSim.careerElo[id] ?? cfg.start_elo)
          : games>0 ? Math.round(gSim.elo[id]) : '—';
        const ps = peakSeason !== null ? peakSeason : '—';
        const pa = peakAlltime !== null ? peakAlltime : '—';
        const paSub = peakAlltimeSeason ? esc(peakAlltimeSeason) : 'saison-übergreifend';
        return `<div class="pp-elo-trinity">
          <div class="pp-et-col now">
            <div class="label">${_ruhe ? 'Abschied' : 'Aktuell'}</div>
            <div class="val">${curElo}</div>
            <div class="sub">${_ruhe ? 'Karriere-Elo' : 'Saison'}</div>
          </div>
          <div class="pp-et-col peak">
            <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icPfad('peak')}</svg> Spitze</div>
            <div class="val">${ps}</div>
            <div class="sub">${_ruhe ? esc(seasonLabel(_profilSid)) : 'diese Saison'}</div>
          </div>
          <div class="pp-et-col alltime">
            <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icPfad('rekord')}</svg> Allzeit</div>
            <div class="val">${pa}</div>
            <div class="sub">${paSub}</div>
          </div>
        </div>`;
      })()}

      ${(sparkHtml || formHtml) ? `<div class="pp-spark-row">
        ${sparkHtml}
        ${formHtml?`<div class="pp-form">${formHtml}</div>`:''}
      </div>` : ''}
      <span class="pp-rand" aria-hidden="true"><i></i></span>
    </header>

    ${(()=>{
      // Chronik (§13): Saisontitel als Streifen, direkt unter dem Kopf — sie
      // beschreibt, WER jemand ist, und gehört damit vor die Detail-Statistik.
      const strip = _chronStripHtml(id, 'chronik');
      return strip ? `<div class="pp-sec" style="animation-delay:.28s">${strip}</div>` : '';
    })()}

    <div class="pp-sec" style="animation-delay:.3s">
      ${(()=>{
        // Die beiden Seiten als Donuts, links Revés (blau), rechts Drive
        // (orange) — wie auf dem Platz. Der Ring zeigt die Siegquote, darunter
        // der Anteil der Games, den das Team auf dieser Seite holt.
        const tot = s.drvG + s.revG;
        if(tot === 0){
          return `<div class="pp-pos-combined">
            <div class="head"><div class="t">Revés und Drive</div></div>
            <div class="pp-roles-empty">Keine Partien</div>
          </div>`;
        }
        // Die staerkere Rolle traegt ihre Farbe, die schwaechere steht
        // zurueck. Beide gleich laut gezeichnet sagten sie nicht, worin
        // jemand besser ist — und genau das ist die Frage, die diese
        // Karte beantwortet. Welche stärker ist, sagt dieselbe Rechnung wie
        // das Seitenprofil darunter [§C44]: die Leistung gegen die
        // Erwartung je Seite, am eigenen Schnitt gemessen. Hier stand die
        // rohe Siegquote, die nichts von Partnern und Gegnern wusste und
        // nichts davon, dass fünf Partien wenig sagen — die Karte konnte
        // eine andere Rolle hell zeichnen, als das Profil einstufte. Bis
        // drei Prozentpunkte Abstand gelten beide als gleichauf.
        const _stark = posLage.staerker;
        const donut = (cls, lbl, icon, wr, w, g, valLbl, valNum, color) => {
          if(g === 0) return `
            <div class="pp-rd ${cls}">
              <div class="pp-rd-ring" style="background:var(--surface3)">
                <div class="pp-rd-inner"><div class="pp-rd-wr" style="color:var(--muted)">–</div></div>
              </div>
              <div class="pp-rd-lbl"><span class="ic">${svgI(icon)}</span>${lbl}</div>
              <div class="pp-rd-empty">noch keine Partien</div>
            </div>`;
          const matt = (_stark !== 'beide' && _stark !== cls);
          return `
            <div class="pp-rd ${cls}${_stark === 'beide' ? ' neutral' : (matt ? ' schwach' : ' stark')}">
              <div class="pp-rd-ring" style="background:conic-gradient(${
                matt ? 'var(--line2)' : color} ${wr}%, var(--surface3) 0)">
                <div class="pp-rd-inner"><div class="pp-rd-wr">${wr}<small>%</small></div></div>
              </div>
              <div class="pp-rd-lbl"><span class="ic">${svgI(icon)}</span>${lbl}</div>
              <div class="pp-rd-meta"><b>${w}</b> von <b>${g}</b> gewonnen<br><b>${valNum}</b> ${valLbl}</div>
            </div>`;
        };
        const anteil = a => a == null ? '–' : Math.round(a * 100) + '\u00A0%';
        return `<div class="pp-pos-combined">
          <div class="head"><div class="t">Revés und Drive</div></div>
          <div class="pp-roles-donuts">
            ${donut('reves','Revés · links','posReves',revWr,s.revW,s.revG,'der Games',anteil(s.revAnteil),'var(--blue)')}
            ${donut('drive','Drive · rechts','posDrive',drvWr,s.drvW,s.drvG,'der Games',anteil(s.drvAnteil),'var(--orange)')}
          </div>
        </div>`;
      })()}
    </div>

    <div class="pp-sec" style="animation-delay:.35s">
      <div class="pp-sec-title">
        <div class="l"><span class="ic svg-ic">${svgI('chartBar')}</span><h4>Gesamtbilanz</h4></div>
        <div class="m">${s.games} ${s.games === 1 ? 'Partie' : 'Partien'}</div>
      </div>
      <div class="pp-kpi">
        <div class="pp-k"><div class="v">${s.wins}</div><div class="l">Siege</div></div>
        <div class="pp-k f" style="--q:${(wr / 100).toFixed(2)}"><div class="v">${wr}\u00A0%</div><div class="l">Siegquote</div></div>
        <div class="pp-k ${s.gd>=0?'pos':'neg'}"><div class="v">${s.gd>=0?'+':''}${s.gd}</div><div class="l">Game-Bilanz</div></div>
      </div>
      <div class="pp-kpi pp-kpi-padel">
        <div class="pp-k"><div class="v">${s.sf}:${s.sa}</div><div class="l">Sätze</div></div>
        <div class="pp-k"><div class="v">${s.tbW}:${s.tbL}</div><div class="l">Tiebreaks</div></div>
        <div class="pp-k"><div class="v">${s.bagelsFor}</div><div class="l">Bagels</div></div>
      </div>
    </div>

    <div class="pp-sec" style="animation-delay:.4s">
      <div class="pp-sec-title">
        <div class="l"><span class="ic svg-ic">${svgI('flame')}</span><h4>Siegesserien</h4></div>
      </div>
      <div class="pp-streaks">
        <div class="pp-st${streak > 0 ? ' lauf-sieg' : streak < 0 ? ' lauf-pleite' : ''}">
          <div class="l">Aktuelle Serie</div>
          <div class="v ${streak===0?'empty':''}">${streak===1?'1 Sieg':streak>0?streak+' Siege':streak===-1?'1 Niederlage':streak<0?(-streak)+' Niederlagen':'–'}</div>
          ${_last15.length?`<div class="dots mixed">${last15DotsHtml}</div>`:''}
        </div>
        <div class="pp-st">
          <div class="l">Längste Serie</div>
          <div class="v ${longestStr<2?'empty':''}">${longestStr>=2?longestStr+' Siege':'–'}</div>
          ${longestStr>=2&&longestPeakLabel?`<div class="pp-st-sub">${esc(longestPeakLabel)}</div>`:''}
        </div>
      </div>
    </div>

    ${badgeTotal?(()=>{
      // ─── Auszeichnungen-Card (Variante 4): Strip aller Achievements + Tier-Bar ───
      // Strip: jede freigeschaltete Auszeichnung, sortiert nach Rarität
      // (Legendary→Common), innerhalb jeder Gruppe in BADGES-Reihenfolge; die
      // Reihe bricht um. Nach acht stand „+14", und welche das waren, sah man
      // erst ein Blatt weiter. Dünne Bar darunter zeigt segmentiert den
      // Gesamt-Fortschritt nach Tier.
      const _byRarity = {legendary:[], rare:[], common:[], negative:[]};
      const _kat = badgeKatalog(id), _rOf = new Map(_kat.map(x => [x.b.id, x.r]));
      badges.forEach(b => { const r = _rOf.get(b.id) || rarityOf(b.id); if(_byRarity[r]) _byRarity[r].push(b); });
      const _strip = [];
      RARITY_ORDER.forEach(r => _byRarity[r].forEach(b => _strip.push({b, r})));
      // Über die legendären läuft eine Welle aus Licht, Zeichen für Zeichen:
      // das Seltene trägt einen leisen Lauf [§C27].
      let _leg = 0;
      const _stripHtml = _strip.map(({b,r}) => {
        const ic = icPfad(b.ic) ? `<svg viewBox="0 0 24 24">${icPfad(b.ic)}</svg>` : '';
        return `<div class="pp-bmini ${r}">${ic}${r === 'legendary' ? glanzBahn(1 + (_leg++) * .12) : ''}</div>`;
      }).join('');
      // Bar-Segmente: ein Stück pro Tier-Count, Rest dunkel
      const _seg = (r) => _byRarity[r].length;
      const _have = _seg('legendary')+_seg('rare')+_seg('common')+_seg('negative');
      const _missing = _kat.length - _have;
      const _barHtml = `
        <div class="pp-bcard-bar">
          ${_seg('legendary')?`<div class="seg legendary" style="flex:${_seg('legendary')}"></div>`:''}
          ${_seg('rare')?`<div class="seg rare" style="flex:${_seg('rare')}"></div>`:''}
          ${_seg('common')?`<div class="seg common" style="flex:${_seg('common')}"></div>`:''}
          ${_seg('negative')?`<div class="seg negative" style="flex:${_seg('negative')}"></div>`:''}
          ${_missing?`<div class="seg" style="flex:${_missing};background:var(--surface3);opacity:.5"></div>`:''}
        </div>`;
      return `
    <div class="pp-sec" style="animation-delay:.425s">
      <div class="pp-sec-title">
        <div class="l">${svgI('abzeichen')}<h4>Auszeichnungen</h4></div>
        <div class="m">${_have} / ${_kat.length}</div>
      </div>
      <div class="pp-bcard" id="ppBadgesBtn">
        <div class="pp-bcard-row">
          <div class="pp-bcard-strip">${_stripHtml}</div>
          <span class="pp-bcard-chev">
            <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </span>
        </div>
        ${_barHtml}
      </div>
    </div>`;
    })():''}
    
    ${sa.length?`
    <div class="pp-sec" style="animation-delay:.435s">
      <div class="pp-sec-title">
        <div class="l">${svgI('trophy')}<h4>Liga Titel</h4></div>
        <div class="m">${(()=>{let n=0;sa.forEach(s=>{if(s.player_id===id)n++;if(s.team_p1===id||s.team_p2===id)n++;});return n;})()} Titel</div>
      </div>
      ${trophyHtml}
    </div>`:''}
    
    ${(()=>{
      // Die Liga-Rekorde stehen bei Auszeichnungen und Titeln, vor den
      // Beziehungen: auch sie sind, was jemand geholt hat.
      const rek = _chronStripHtml(id, 'rekorde');
      return rek ? `<div class="pp-sec" style="animation-delay:.44s">${rek}</div>` : '';
    })()}

    <div class="pp-sec" style="animation-delay:.45s">
      <div class="pp-sec-title">
        <div class="l"><span class="ic svg-ic">${svgI('users')}</span><h4>Beziehungen</h4></div>
      </div>
      <div class="pp-rel-grid">
  
        ${(()=>{
          // Hilfsfunktion: Mate-/Gegner-Avatar (34 px)
          const relAv=(pid)=>{
            const pp=pmap()[pid];
            if(!pp) return `<div class="av empty">?</div>`;
            const em=pp.avatar_id?avatarEmoji(pp.avatar_id):null;
            if(em) return `<div class="av" style="background:var(--surface3);color:inherit">${em}</div>`;
            return `<div class="av" style="background:${avColor(pid)}">${esc(initials(pp.name))}</div>`;
          };
          // Eine Karte mit Avatar links + Info rechts
          const card=(cls, attr, icKey, label, name, wr, w, g)=>{
            const empty = !name;
            // Die Quote steht auch als Balken unter der Karte (--q).
            return `<div class="pp-r-rich ${cls}"${attr}${empty ? '' : ` style="--q:${(+wr).toFixed(2)}"`}>
              ${empty?`<div class="av empty">–</div>`:relAv(name.id)}
              <div class="info">
                <div class="l">${svgI(icKey)}${label}</div>
                <div class="name">${empty?'–':esc(name.label)}</div>
                <div class="stat">${empty?'':`<span class="v">${Math.round(wr*100)}\u00A0%</span> <span class="g">(${Math.round(wr*g)}/${g})</span>`}</div>
              </div>
            </div>`;
          };
          // Bester Mate
          const bestAttr  = best?` data-team="${esc(paarKey(id, best.mid))}"`:'';
          const bestCard  = best
            ? card('good', bestAttr, 'handshake', 'Bester Partner', {id:best.mid,label:pname(best.mid)}, best.wr, Math.round(best.wr*best.g), best.g)
            : card('good', '', 'handshake', 'Bester Partner', null);
          // Schlechtester Mate (nur wenn ≠ Bester)
          const worstAttr = worst&&best&&worst.mid!==best.mid?` data-team="${esc(paarKey(id, worst.mid))}"`:'';
          const worstCard = worst&&best&&worst.mid!==best.mid
            ? card('bad', worstAttr, 'trendDown', 'Schwächster Partner', {id:worst.mid,label:pname(worst.mid)}, worst.wr, Math.round(worst.wr*worst.g), worst.g)
            : card('bad', '', 'trendDown', 'Schwächster Partner', null);
          // Lieblingsgegner → klickbar zum Gegnerprofil
          const favAttr  = fav?` data-detail="${esc(fav.oid)}"`:'';
          const favCard  = fav
            ? card('fav', favAttr, 'target', 'Lieblingsgegner', {id:fav.oid,label:pname(fav.oid)}, fav.wr, Math.round(fav.wr*fav.g), fav.g)
            : card('fav', '', 'target', 'Lieblingsgegner', null);
          // Angstgegner (nur wenn ≠ Liebling)
          const nemAttr  = nem&&fav&&nem.oid!==fav.oid?` data-detail="${esc(nem.oid)}"`:'';
          const nemCard  = nem&&fav&&nem.oid!==fav.oid
            ? card('nem', nemAttr, 'crown', 'Angstgegner', {id:nem.oid,label:pname(nem.oid)}, nem.wr, Math.round(nem.wr*nem.g), nem.g)
            : card('nem', '', 'crown', 'Angstgegner', null);
          return bestCard + worstCard + favCard + nemCard;
        })()}
      </div>
    </div>

    ${(()=>{
      // ─── BILANZEN-CARD (kompakt): Strip aus Partner-Avataren + Chevron ───
      // Komplette Card ist klickbar (id=ppH2HBtn → showPlayerH2HList). Die
      // Mini-Avatare zeigen jeden Partner nach gemeinsamer Häufigkeit;
      // im Sheet erscheint die volle, scrollbare Liste mit T/G-Bilanz pro Zeile.
      const h2hList = playerH2HList(id, 3);
      if(h2hList.length < 2) return '';
      const pmL = pmap();
      const mit = h2hList.filter(x => pmL[x.oid]);
      // Eine Zeile: so viele Gesichter, wie in die Breite passen, der Rest als
      // „+N weitere"; die ganze Liste steht ein Tippen weiter im Blatt. In
      // zwei Zeilen war die Karte so hoch wie zwei Beziehungen, für eine
      // Vorschau. Die Breite kommt aus dem Fenster und den festen Maßen von
      // Blatt und Karte (`.sheet`, `.pp-badges-card`: 98 px Rand, Knopf und
      // Abstand), nicht aus einer Messung, die das Profil beim Öffnen ein
      // zweites Mal hätte setzen lassen. Ein Gesicht braucht 33 px mit
      // Abstand, die Aufschrift 77; mit „2 Gesichtern" gerechnet lief sie bei
      // 360 px 3 px über den Rand. Wer ganz hineinpasst, steht ganz da.
      const breite = Math.min(window.innerWidth || 390, 520) - 98;
      const zeige = mit.length <= Math.floor((breite + 7) / 33) ? mit.length
        : Math.max(1, Math.floor((breite - 70) / 33));
      const stripItems = mit.slice(0, zeige).map(x=>{
        const pp = pmL[x.oid];
        const em = pp.avatar_id ? avatarEmoji(pp.avatar_id) : null;
        if(em) return `<div style="width:26px;height:26px;border-radius:50%;background:var(--surface3);display:grid;place-items:center;font-size:14px;border:1.5px solid var(--surface);flex-shrink:0">${em}</div>`;
        return `<div style="width:26px;height:26px;border-radius:50%;background:${avColor(pp.id)};display:grid;place-items:center;font-size:9px;font-family:'Archivo Black',sans-serif;color:#080b10;border:1.5px solid var(--surface);flex-shrink:0">${esc(initials(pp.name))}</div>`;
      }).join('') + (mit.length > zeige ? `<span class="pp-mit-mehr num">+${mit.length - zeige} weitere</span>` : '');
      return `
    <div class="pp-sec" style="animation-delay:.5s">
      <div class="pp-badges-card" id="ppH2HBtn">
        <div class="pp-badges-strip pp-mit" style="align-items:center">
          ${stripItems}
        </div>
        <span class="chev">
          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
        </span>
      </div>
    </div>`;
    })()}



    ${awardCount?`
    <div class="pp-sec" style="animation-delay:.65s">
      <div class="pp-sec-title">
        <div class="l">${svgI('medal')}<h4>Awards</h4></div>
        <div class="m">${esc(seasonLabel(currentSeason().id))}</div>
      </div>
      <div class="pp-awards" id="ppAwardsGrid">
        ${awCats.map(c=>`
          <div class="pp-aw ${c.n===0?'empty':''}">
            <span class="ic svg-ic">${svgI(c.ic)}</span>
            <div class="nm">${c.nm}</div>
            <div class="num">${c.n}</div>
          </div>`).join('')}
      </div>
    </div>`:''}

    ${seasonHistory.length?`
    <div class="pp-sec" style="animation-delay:.7s">
      <div class="pp-sec-title">
        <div class="l">${svgI('saisonKal')}<h4>Saisonverlauf <span style="color:var(--muted);font-weight:500;letter-spacing:.02em;text-transform:none">(${seasonHistory.length})</span></h4></div>
        <div class="m">${seasonTrend ? `<span class="trend ${seasonTrend.cls}">${seasonTrend.arrow} ${esc(seasonTrend.text)}</span>` : seasonHistory.length+' Saisons'}</div>
      </div>
      ${seasonRailHtml}
    </div>`:''}

    <div class="pp-sec ${tierClass}" style="animation-delay:.75s">
      <div class="pp-sec-title">
        <div class="l">${svgI('chartBar')}<h4>Karriere-Rang</h4></div>
      </div>
      ${rankProgHtml}
    </div>

    <div class="pp-sec" style="animation-delay:.8s">
      <div class="pp-sec-title">
        <div class="l">${svgI('posFlex')}<h4>Seitenprofil</h4><button class="kopf-info" id="ppPosInfo" type="button" aria-label="So entsteht die Einstufung">${svgI('info')}</button></div>
      </div>
      <!-- Die Einstufung steht einmal, unten in der Karte. Rechts in der
           Überschrift stand sie ein zweites Mal, und mit dem Knopf brach
           die Überschrift bei 360 px in zwei Zeilen. -->
      <div class="pp-posprof ${revPct > drvPct + 4 ? 'links-seite' : drvPct > revPct + 4 ? 'rechts-seite' : 'neutral'}" style="--atk:${revPct}%;--strahl:${Math.max(drvPct, revPct)}%">
        <div class="pph">
          <span class="lf">${svgI('posReves')}Revés</span>
          <span><span class="pct">${revPct}\u00A0%</span> / <span class="pct">${drvPct}\u00A0%</span></span>
          <span class="rt">Drive${svgI('posDrive')}</span>
        </div>
        <!-- Der Strahl beginnt an der staerkeren Seite und laeuft zur
             Mitte. Bei einem beidseitigen Profil sitzt er als eigener,
             kurzer Lichtkern in der Mitte. -->
        <div class="pp-slider">
          <div class="pp-fill"></div>
          <span class="pp-thumb" style="left:${revPct}%"></span>
        </div>
        <div class="ppf">Eingestuft als <span class="lab" style="display:inline-flex;align-items:center;gap:4px">${posIcon}${posLabel}</span></div>
      </div>
    </div>

    ${_hatPartien ? `<div class="pp-ruhe">
      <button id="ruhePlayer" type="button" data-ruhe="${_ruhe ? '0' : '1'}">${svgI('hourglass')}${_ruhe ? 'Karriere fortsetzen' : 'Karriere beenden'}</button>
    </div>` : ''}
    <div class="pp-del">
      <button id="delPlayer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
        </svg>
        ${_hatPartien ? 'Spieler entfernen' : 'Spieler löschen'}
      </button>
    </div>
   </div>
  `);

  // Click-Handler
  // Die Pille des Karriereendes öffnet den Abschied [§C40].
  const pab=document.getElementById('ppAbschied');
  if(pab) pab.onclick=()=>{ sheetNav(()=>zeigeAbschied(id)); };
  const eb=document.getElementById('ppEditBtn');
  if(eb) eb.onclick=()=>{ sheetNav(()=>showEditPlayer(id)); };
  const ppi=document.getElementById('ppPosInfo');
  if(ppi) ppi.onclick=()=>{ sheetNav(()=>zeigeProfilPosInfo(id)); };
  const ag=document.getElementById('ppAwardsGrid');
  if(ag) ag.onclick=()=>{ sheetNav(()=>showPlayerAwards(id,awards)); };
  const bb=document.getElementById('ppBadgesBtn');
  if(bb) bb.onclick=()=>{ sheetNav(()=>showPlayerBadges(id)); };
  const h2hb=document.getElementById('ppH2HBtn');
  if(h2hb) h2hb.onclick=()=>{ sheetNav(()=>showPlayerH2HList(id)); };
  const sr=document.getElementById('ppSeasonsRail');
  if(sr) sr.onclick=()=>{ sheetNav(()=>showPlayerSeasons(id)); };
  const rk=document.getElementById('ppRanksBtn');
  if(rk) rk.onclick=()=>{ sheetNav(()=>showRangSystem()); };
  const tp=document.getElementById('ppTrPlayer');
  if(tp) tp.onclick=()=>{ sheetNav(()=>showPlayerSeasons(id)); };
  const tt=document.getElementById('ppTrTeam');
  if(tt) tt.onclick=()=>{ sheetNav(()=>showPlayerSeasons(id)); };
  const profil = document.getElementById('sheet');
  _avRingBinden(profil);
  profil.querySelectorAll('.pp-trophies .pp-tr').forEach(el=>{
    el.onclick=()=>{ sheetNav(()=>showPlayerSeasons(id)); };
  });
  // Mate-Karten öffnen das Team-Profil (Spieler + Mate)
  profil.querySelectorAll('[data-team]').forEach(el=>{
    el.onclick=()=>{
      const [a,b]=el.dataset.team.split('|');
      if(!a||!b) return;
      sheetNav(()=>showTeam(a,b));
    };
  });
  // Bilanzen-Zeilen öffnen das H2H-Sheet (Reihenfolge bewahren — Profil-Spieler zuerst)
  profil.querySelectorAll('[data-h2h]').forEach(el=>{
    el.onclick=()=>{
      const [a,b]=el.dataset.h2h.split('|');
      if(!a||!b) return;
      sheetNav(()=>showH2H(a,b));
    };
  });
  // Lieblings-/Angstgegner-Karten öffnen das Gegner-Profil
  profil.querySelectorAll('.pp-r-rich[data-detail]').forEach(el=>{
    el.onclick=()=>{
      const oid=el.dataset.detail;
      if(!oid) return;
      sheetNav(()=>showPlayer(oid));
    };
  });
  // Chronik-Zellen öffnen die Saison-Tafel (§13)
  _bindChronikClicks(document.getElementById('sheet'));
  // Das Insignium im Kopf öffnet die Laufbahn: ihre Zeichen jetzt, im
  // Leerlauf, statt beim Start für jeden Rang [§2.1b].
  _insRangWaermen(id);

  // Karriere beenden und fortsetzen [§C40]. Gespeichert wird nur der
  // Zeitpunkt; was er bewirkt, rechnet die App aus den Partien.
  // Derselbe Weg aus dem Knopf und aus dem Blatt „Spieler entfernen".
  const rp=document.getElementById('ruhePlayer');
  const karriere=async(beenden)=>{
    const ja = await bestaetigen(beenden
      ? {ic:'hourglass', ja:'Karriere beenden', nein:'Abbrechen', titel:p.name + ' beendet die Karriere',
         text:'Jede Partie bleibt und mit ihr jeder Tag, jede Woche und jeder Monat, in dem ' + p.name + ' gespielt hat, samt Auszeichnungen und Titeln. Ewige Tafel und Rekorde vergleichen ab jetzt ohne ' + p.name + '. Das Profil bleibt stehen, sobald diese Woche und dieser Monat vorbei sind.'}
      : {ic:'hourglass', ja:'Karriere fortsetzen', nein:'Abbrechen', titel:p.name + ' kehrt zurück',
         text:p.name + ' steht danach wieder in Ewiger Tafel, Rekorden und Rangliste.'});
    if(!ja) return;
    if(rp) rp.disabled = true;
    const r = await karriereSetzen(id, beenden);
    if(!r.ok){
      if(rp) rp.disabled = false;
      toast('Nicht gespeichert', 'err', {sub: r.fehlt
        ? 'In der Datenbank fehlt die Spalte für das Karriereende (datenbank/karriereende.sql).'
        : 'Die Verbindung zur Datenbank ist fehlgeschlagen.'});
      return;
    }
    toast(beenden ? p.name + ' beendet die Karriere' : p.name + ' ist zurück', 'ok');
    closeSheet(true);
    await loadAll();
    // Wer gerade jemanden verabschiedet hat, sieht den Abschied sofort.
    if(beenden && imRuhestand(id)){ _recapMarkSeen(_abschiedSchluessel(id), 'abschied:' + id); zeigeAbschied(id); }
  };

  if(rp) rp.onclick=()=>karriere(rp.dataset.ruhe === '1');

  // Entfernen [§C40]: ohne Partie wird gelöscht, mit Partien nie. Dort
  // stand „Komplett löschen", und danach trug jede Partie des Spielers ein
  // Fragezeichen, während die Elo der drei anderen gegen niemanden lief.
  const dp=document.getElementById('delPlayer');
  if(dp) dp.onclick=async()=>{
    if(!_hatPartien){
      if(!(await bestaetigen({ic:'trash', gefahr:true, ja:'Löschen', nein:'Behalten',
        titel:p.name+' löschen?', text:'Ohne Partie bleibt nichts zurück: Name und Bild werden endgültig gelöscht.'}))) return;
      const r = await spielerLoeschen(id);
      if(!r.ok){
        toast('Nicht gelöscht', 'err', {sub: r.grund === 'partien'
          ? p.name + ' hat ' + r.zahl + (r.zahl === 1 ? ' Partie' : ' Partien') + ' in der Datenbank.'
          : 'Die Verbindung zur Datenbank ist fehlgeschlagen.'});
        return;
      }
      // textContent, nicht HTML: esc() stand hier und zeigte „&amp;".
      closeSheet(true); toast(p.name+' gelöscht','ok'); await loadAll();
      return;
    }
    _pushCurrentSheet(); // Spielerprofil stapeln → „Zurück" möglich
    const ruhe = imRuhestand(id);
    openSheet(`
      ${blattKopfHtml({ic:'trash', ton:'rot', titel:'Spieler entfernen', unter:p.name + ' · ' + gamesPlayed(id) + ' Partien'})}
      <div class="pp-weg">
        ${ruhe ? '' : `<button class="btn ghost" id="retirePlayerBtn" type="button">
          <b>Karriere beenden</b>
          <span>Profil, Titel und Auszeichnungen bleiben. Ewige Tafel, Rekorde und der laufende Monat vergleichen ohne ${esc(p.name)}.</span>
        </button>`}
        <button class="btn ghost" id="hidePlayerBtn" type="button">
          <b>Ausblenden</b>
          <span>Für einen versehentlich angelegten Spieler. Der Name fällt aus jeder Rechnung, auch aus abgeschlossenen Monaten; die Partien bleiben gespeichert.</span>
        </button>
        <p class="pp-weg-n">Löschen lässt sich nur ein Spieler ohne Partie: jede Partie von ${esc(p.name)} gehört auch drei anderen.</p>
        <button class="btn ghost sm" id="cancelDelBtn" type="button">Abbrechen</button>
      </div>
    `);
    const rb=document.getElementById('retirePlayerBtn');
    if(rb) rb.onclick=()=>karriere(true);
    document.getElementById('hidePlayerBtn').onclick=async()=>{
      const {error} = await sb.from('players').update({hidden:true}).eq('id',id);
      if(error){ toast('Nicht gespeichert', 'err', {sub:'Die Verbindung zur Datenbank ist fehlgeschlagen.'}); return; }
      closeSheet(true); toast(p.name+' ausgeblendet','ok'); await loadAll();
    };
    document.getElementById('cancelDelBtn').onclick=()=>{
      closeSheet(); // zurück zum Spielerprofil (Stack-Pop)
    };
  };
}

// ─── Spieler bearbeiten: Spitzname + Avatar wählen ───
function showEditPlayer(id){
  const p=pmap()[id]; if(!p) return;
  _sheetSetReopen(()=>showEditPlayer(id));
  let selectedAvatar = p.avatar_id || null;

  const avPickerHtml = `
    <div class="av-picker" id="avPicker">
      <div class="av-opt initials ${!selectedAvatar?'selected':''}" data-av="">
        <span class="em">${initials(p.name)}</span>
      </div>
      ${AVATAR_OPTIONS.map(o=>`
        <div class="av-opt ${selectedAvatar===o.id?'selected':''}" data-av="${o.id}">
          <span class="em">${o.em}</span>
        </div>`).join('')}
    </div>`;

  openSheet(`
    ${blattKopfHtml({ic:'edit', titel:'Profil bearbeiten', unter:p.name})}

    <div class="field-label">Profilbild</div>
    ${avPickerHtml}

    <div class="btn-row" style="margin-top:20px">
      <button class="btn ghost" id="editCancel">Abbrechen</button>
      <button class="btn" id="editSave">Speichern</button>
    </div>
  `);

  const picker = document.getElementById('avPicker');
  if(picker){
    picker.querySelectorAll('.av-opt').forEach(el=>{
      el.onclick=()=>{
        picker.querySelectorAll('.av-opt').forEach(x=>x.classList.remove('selected'));
        el.classList.add('selected');
        selectedAvatar = el.dataset.av || null;
      };
    });
  }

  document.getElementById('editCancel').onclick=()=>{
    closeSheet(); // zurück zum Spielerprofil (Stack-Pop)
  };

  document.getElementById('editSave').onclick=async()=>{
    const updates = { avatar_id: selectedAvatar || null };
    // Lokales Update sofort
    p.avatar_id = updates.avatar_id;
    // DB-Update versuchen
    const {error} = await sb.from('players').update(updates).eq('id',id);
    if(error){
      // Spalte existiert evtl. nicht in DB – lokaler Fallback via localStorage
      console.warn('DB-Update fehlgeschlagen, localStorage-Fallback:', error.message);
      try{
        localStorage.setItem('padel_playerEdit_'+id, JSON.stringify(updates));
        toast('Gespeichert (lokal)','ok');
      }catch(e){
        toast('Lokal gespeichert');
      }
    } else {
      toast('Gespeichert','ok');
    }
    closeSheet(); // zurück zum Spielerprofil (Stack-Pop, zeigt aktualisiertes Avatar)
  };
}

// ─── Saison-Verlauf berechnen ───
function computeSeasonHistory(playerId){
  // Reihenfolge EXPLIZIT statt implizit. Vorher wurde auf die aufsteigende
  // Reihenfolge von allPastSeasons() vertraut und am Ende reverse()'t — kam
  // die ID-Liste je Gerät/Cache-Zustand in anderer Reihenfolge, stand im
  // Rail plötzlich Juli, Mai, Juni. Jetzt wird absteigend nach Saison-ID
  // (YYYY-MM, lexikografisch = chronologisch) sortiert → links immer die
  // neueste, rechts die älteste. Es zählen die EIGENEN Saisons, alle, in
  // denen gespielt wurde: wer eine Pause machte oder aufgehört hat, verliert
  // keinen Monat, weil die anderen weiterspielten.
  const allSeasonIds = [...new Set([...allPastSeasons(), currentSeason().id])]
    .sort((a,b)=> a<b?1:a>b?-1:0);
  const eigene = allSeasonIds.map(sid => ({sid,
    sMatches: matchesInSeason(sid).filter(m=>[m.a1,m.a2,m.b1,m.b2].includes(playerId))}))
    .filter(x => x.sMatches.length);
  return eigene.map(({sid, sMatches})=>{
    let w=0, l=0;
    sMatches.forEach(m=>{
      const onA=(playerId===m.a1||playerId===m.a2);
      const won=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
      if(won) w++; else l++;
    });
    const gSim = getGlobalSim();
    const snapshot = gSim.seasonEndElos[sid] || {};
    const seasonPlayedMap = gSim.seasonPlayed[sid] || {};
    const startElo = cfg.start_elo;
    const endElo = snapshot[playerId] ?? startElo;
    const eloDelta = Math.round(endElo - startElo);
    // Ein Monat ist ein Zeitraum [§C40]: wer darin spielte, hat seinen Platz.
    const playersInSeason = players.filter(pp=>sichtbar(pp));
    const seasonRanking = playersInSeason.map(pp=>({
      id:pp.id, e: (snapshot[pp.id] ?? startElo), g: (seasonPlayedMap[pp.id]||0)
    })).filter(x=>x.g>0).sort((a,b)=>b.e-a.e);
    const place = seasonRanking.findIndex(x=>x.id===playerId)+1;
    return {
      id:sid, label:seasonLabel(sid),
      wins:w, losses:l, eloDelta,
      place: place>0?place:null,
    };
  }).filter(Boolean); // bereits absteigend sortiert (neueste zuerst)
}

// Awards-Sheet für einen Spieler: listet alle gehaltenen Awards auf, jeweils anklickbar
function showRangSystem(){
  _sheetSetReopen(()=>showRangSystem());
  const avgs=getSeasonAvgElos();
  const ranked=players.filter(p=>ligaAktiv(p)&&avgs[p.id]!==null)
    .sort((a,b)=>avgs[b.id]-avgs[a.id]);
  const rows=RANKS.map((r,i)=>{
    const prev=RANKS[i-1];
    const fromPct=prev?Math.round(prev.pct*100):0;
    const toPct=Math.round(r.pct*100);
    const label=i===0?'Top '+toPct+'\u00A0%':fromPct+'\u00A0% – '+toPct+'\u00A0%';
    const inRank=ranked.filter((_,idx)=>{
      const pct=(idx+1)/ranked.length;
      const prevR=RANKS[i-1];
      return pct<=(r.pct+0.001)&&(!prevR||pct>(prevR.pct+0.001));
    });
    return `<div style="background:var(--surface);border:1px solid var(--line);
      border-radius:var(--r-sm);padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${inRank.length?'8px':'0'}">
        <span style="font-weight:700;color:${r.color};display:inline-flex;align-items:center;gap:6px">
          <span class="ic svg-ic" style="font-size:14px;color:${r.color}"><svg viewBox="0 0 24 24">${icPfad(r.icon)}</svg></span>${r.label}
        </span>
        <span style="font-size:11px;color:var(--muted)">${label} der Spieler</span>
      </div>
      ${inRank.length?`<div style="display:flex;flex-direction:column;gap:4px">
        ${inRank.map(p=>`<div style="display:flex;justify-content:space-between;
          align-items:center;font-size:12px;padding:4px 0;border-top:1px solid var(--line)">
          <div style="display:flex;align-items:center;gap:8px">
            ${avHtml(p,'width:24px;height:24px;border-radius:7px;font-size:9px')}
            <span>${esc(p.name)}</span>
          </div>
          <span style="font-family:'Sometype Mono',monospace;font-size:11px;color:${r.color}">
            Ø ${avgs[p.id]}
          </span>
        </div>`).join('')}
      </div>`:''}    </div>`;
  }).join('');
  openSheet(`
    ${blattKopfHtml({ic:'crown', titel:'Rang-System', unter:'Nach Ø Saison-Elo'})}
    <div style="height:12px"></div>
    ${rows}
  `);
}
function showPlayerAwards(playerId, awards){
  const p=pmap()[playerId]; if(!p)return;
  _sheetSetReopen(()=>showPlayerAwards(playerId, awards));
  // Dieselbe Kachel wie im Awards-Reiter [§C27] — mit Wert, Einheit und
  // Stichprobe aus AW_WERT. Hier stand eine eigene Fassung: Wert ohne
  // Einheit, der Partner als Text auf einer Plakette, „Top-1" als Marke.
  // Die Lage im Feld braucht die Liste des Monats, aus der der Platz kommt.
  const R = awardRankings('season', currentSeason().id);
  const trophy = a => awKachelHtml(a.key, [a.x],
    {mehr:a.mehr, liste:awListe(a.key, R), attr:`data-paward2="${esc(a.key)}"`});

  const body = awards.length
    ? `<div style="margin-top:16px">${awVitrineHtml(awards.map(trophy))}</div>`
    : `<div class="leerstand" style="margin-top:24px;text-align:center;color:var(--muted)">
        <div class="ee svg-ic" style="color:var(--faint);margin-bottom:6px">${svgI('trophy')}</div>
        Noch kein Award auf Platz 1
       </div>`;

  openSheet(`
    ${blattKopfHtml({ic:'trophy', ton:'gold', titel:'Awards',
      unter:p.name + ' · ' + awards.length + (awards.length === 1 ? ' Award' : ' Awards') + ' auf Platz 1'})}
    ${body}
    ${blattFussHtml([{label:'Zurück zum Profil', ic:'user', attr:'id="backToPlayer"'}])}
  `);
  // Das Blatt zeigt den Zeitraum, aus dem der Platz kommt: den laufenden
  // Monat. Ohne das öffnete es, was der Awards-Reiter zuletzt eingestellt
  // hatte — eine Woche oder einen anderen Monat.
  document.querySelectorAll('[data-paward2]').forEach(el=>el.onclick=()=>{
    sheetNav(()=>{ awPeriod='season'; awSeasonId=null; showAward(el.dataset.paward2); });
  });
  const back=document.getElementById('backToPlayer');
  if(back) back.onclick=()=>closeSheet();
}

// Badges-Sheet: zeigt alle Badges (freigeschaltet vs. gesperrt)
function showPlayerBadges(playerId){
  const p = pmap()[playerId]; if(!p) return;
  _sheetSetReopen(()=>showPlayerBadges(playerId));
  const earned = getCachedBadges(playerId);
  const earnedIds = new Map(earned.map(b => [b.id, b.count]));
  // ONCE_ONLY: Badges, die man nur einmal erreicht (keine Wiederholung als ×N)
  // — werden in der Sortierung VOR den mehrfach-erreichbaren angezeigt.
  const ONCE_ONLY = new Set(['first_match','games25','games150','games250','wins200','allrounder','reves50','drive50',
    'allwetter']);

  // ─── Aggregation pro Tier ───
  // Pro Rarity: BADGES-Array in Buckets sortieren. Die goldene Vitrine folgt
  // der expliziten sportlichen Reihenfolge aus §7; danach bleibt die
  // Katalogreihenfolge stabil. Einmalige Badges springen nicht mehr vor
  // wichtigere Saison- und Serienleistungen (Allwetter stand dadurch ganz
  // vorne, obwohl es nur einmal freigeschaltet werden kann).
  // Der Katalog des Spielers: für einen Ruheständler der beim Abschied [§C40].
  const buckets = {legendary:[], rare:[], common:[], negative:[]};
  badgeKatalog(playerId).forEach(({b, r}) => {
    if(buckets[r]) buckets[r].push(b);
  });
  Object.keys(buckets).forEach(r => {
    buckets[r].sort((a,b) => badgeProfilRang(a.id) - badgeProfilRang(b.id));
  });
  const have = (r) => buckets[r].filter(b => earnedIds.has(b.id)).length;
  const haveTotal = have('legendary')+have('rare')+have('common')+have('negative');
  const trigCount = earned.reduce((s,b)=>s+b.count,0);

  // ─── Tier-Counter-Bar (oben im Sheet) ───
  const pill = (r) => {
    const h = have(r);
    const dim = h===0 ? 'dim' : '';
    return `<span class="tc-pill ${r} ${dim}"><span class="dot"></span><span class="n">${h} / ${buckets[r].length}</span></span>`;
  };
  const counterHtml = `
    <div class="bsh-counter">
      ${pill('legendary')}
      ${pill('rare')}
      ${pill('common')}
      <span class="tc-sep"></span>
      ${pill('negative')}
    </div>`;

  // ─── Card-Renderer (eine Badge → eine Card) ───
  // Ein Wort lässt sich nicht umbrechen, also wird ein langes kleiner:
  // „Wiederholungstäter" ist bei 360 px 146 px breit, die Karte innen 124 —
  // es endete als „Wiederholungstäte" am Rand. Gezählt wird das längste
  // Wort, wie in der Zahlenreihe der Rückblicke.
  const nameKl = n => Math.max(...String(n).split(/\s+/).map(w => w.length)) > 14 ? ' lang' : '';
  const renderCard = (b, r) => {
    const cnt = earnedIds.get(b.id) || 0;
    const unlocked = cnt > 0;
    const isRepeatable = !ONCE_ONLY.has(b.id);
    if(!unlocked){
      // Locked: neutral grau, Lock-Icon zentral, winziger Tier-Dot oben links
      return `<div class="bsh-card locked ${r}" data-bid="${esc(b.id)}">
        <span class="tier-dot"></span>
        <div class="bsh-card-ic">${svgI('lock')}</div>
        <div class="bsh-card-name${nameKl(b.name)}">${esc(b.name)}</div>
        <div class="bsh-card-desc">${esc(b.desc)}</div>
      </div>`;
    }
    // Unlocked: Tier-Farbe + Akzent-Strich oben (per CSS)
    const meta = isRepeatable
      ? `<div class="bsh-card-count">×${cnt}</div>`
      : `<div class="bsh-card-once">Freigeschaltet</div>`;
    return `<div class="bsh-card unlocked ${r}" data-bid="${esc(b.id)}">
      <div class="bsh-card-ic">${badgeIc(b,'30px')}</div>
      <div class="bsh-card-name${nameKl(b.name)}">${esc(b.name)}</div>
      <div class="bsh-card-desc">${esc(b.desc)}</div>
      ${meta}
    </div>`;
  };

  // Positive Tiers (Legendary → Rare → Common) zusammengefasst in einem Grid
  const positiveCards = ['legendary','rare','common']
    .flatMap(r => buckets[r].map(b => renderCard(b, r)))
    .join('');

  // Negative-Block separat mit Schande-Trennlinie
  const negativeCards = buckets.negative.map(b => renderCard(b, 'negative')).join('');
  const negativeBlock = negativeCards ? `
    <div class="bsh-neg-divider">
      <div class="bsh-neg-divider-line"></div>
      <div class="bsh-neg-divider-label"><span class="dot"></span>Schande</div>
      <div class="bsh-neg-divider-line"></div>
    </div>
    <div class="bsh-grid">${negativeCards}</div>` : '';

  openSheet(`
    ${blattKopfHtml({ic:'medal', ton:'viol', titel:'Auszeichnungen',
      unter:p.name + ' · ' + haveTotal + ' von ' + (buckets.legendary.length + buckets.rare.length + buckets.common.length + buckets.negative.length) + ' · ' + trigCount + '× geholt'})}
    <div style="height:12px"></div>
    ${counterHtml}
    <div class="bsh-grid">${positiveCards}</div>
    ${negativeBlock}
    ${blattFussHtml([{label:'Zurück zum Profil', ic:'user', attr:'id="backToPlayer2"'}])}
  `);
  const back = document.getElementById('backToPlayer2');
  if(back) back.onclick = () => closeSheet();
  // Badge-Card-Click → öffnet Detail-Popover ÜBER dem Sheet (Sheet bleibt offen!)
  document.querySelectorAll('.bsh-card[data-bid]').forEach(el => {
    el.onclick = () => showBadgePopover(el.dataset.bid, playerId);
  });
}

