// ─── §8.5 Eine Auszeichnung im Detail (Popover über dem Blatt) ──────────
// ═══════════════════════════════════════════════════════════════════════════
// BADGE-DETAIL-POPOVER
// ═══════════════════════════════════════════════════════════════════════════
// Layer ÜBER dem Auszeichnungen-Sheet (z-index 120+ > Sheet 100/101).
// Zwei Modi:
//   • Erreicht  → zeigt die Matches, in denen das Badge ausgelöst wurde
//                 (aus getBadgeEarnedCache). Jeder Match-Eintrag ist klickbar:
//                 schließt Popover UND Sheet, öffnet das Match-Detail.
//   • Locked    → zeigt Fortschritt für die wichtigsten quantifizierbaren
//                 Badges (Spiele, Streaks, Elo-Schwellen, Positions-Spiele).
//                 Für saison-/karriere-aggregierte Badges (POTD, POTW,
//                 award_collector, untouchable etc.) gibt's einen knappen
//                 "Noch nicht erreicht"-Hinweis statt Balken.
//
// Schließen: Backdrop-Click, ✕ Button, ESC. KEIN closeSheet — das darunter
// liegende Auszeichnungen-Sheet bleibt scrollbar und sucht-fähig.
//
// Geöffnet wird sie überall, wo eine Auszeichnung in einem Blatt steht
// (`_bpBinden`, `data-bp`): im Profil, im Blatt einer Story, in der
// Laufbahn und in den Rückblicken. Vorher nur aus dem Profil — wer in der
// Ehrung der Woche „Player of the Week" antippte, landete im Profil des
// Spielers und suchte die Auszeichnung dort zwischen sechzig anderen. Sie
// liegt deshalb über dem Blatt einer Story (`.bp-bg` über `.nd-bg`).
// ═══════════════════════════════════════════════════════════════════════════

// Helper: Matches, in denen das Badge für DIESEN Spieler gefeuert wurde.
// Nutzt den globalen Badge-Earned-Cache (chronologischer Walk in §7.4).
// Für saison-/karriere-aggregierte Badges (kein fire-Trigger) ist die Liste
// leer — wir zeigen dann den count ohne Match-Liste.
function _badgeFireMatches(playerId, badgeId){
  const map = getBadgeEarnedCache();
  const hits = [];
  for(const mid in map){
    if(map[mid].some(e => e.playerId === playerId && e.badge.id === badgeId)){
      const mObj = matches.find(m => m.id === mid);
      if(mObj) hits.push(mObj);
    }
  }
  return hits.sort((a,b) => mts(b)-mts(a));
}

// Wann eine Auszeichnung ohne Partie kam: mit dem Schluss eines Tages, einer
// Woche oder eines Monats (`EHRUNG_SCHLUSS`) [§11.6f], je Schluss gezählt
// wie in der Ehrung, eine Millisekunde davor gegen ihn
// (`_ehrungSchlussPosten`). Vorher stand dort „Diese Auszeichnung wird über
// Saison-/Karriere-Daten ermittelt", und für welche Woche jemand Spieler der
// Woche war, stand nirgends. Die jüngste zuerst, wie die Partien.
function _badgeSchluesse(badgeId, playerId){
  const def = BADGES.find(x => x.id === badgeId);
  const arten = ['tag', 'woche', 'monat'].filter(k => EHRUNG_SCHLUSS[k].includes(badgeId));
  if(!def || !arten.length) return [];
  const tage = new Set(), wochen = new Set(), monate = new Set();
  (matches || []).forEach(m => { const t = mts(m);
    tage.add(tagKey(t)); wochen.add(wochenBeginn(new Date(t)).getTime()); monate.add(seasonOf(t).id); });
  const zeiten = [];
  if(arten.includes('tag')) tage.forEach(k => { const d = new Date(k + 'T00:00:00'); d.setHours(23, 59, 0, 0);
    zeiten.push({art:'tag', T:d.getTime(), k}); });
  if(arten.includes('woche')) wochen.forEach(ab => { const e = new Date(ab); e.setDate(e.getDate() + 7);
    zeiten.push({art:'woche', T:e.getTime(), k:tagKey(ab), ab}); });
  if(arten.includes('monat')) monate.forEach(sid => zeiten.push({art:'monat', T:seasonEnd(sid).getTime(), k:sid}));
  const jetzt = Date.now(), out = [];
  zeiten.filter(z => z.T <= jetzt).sort((x, y) => y.T - x.T).forEach(z => {
    let a = 0, n = 0;
    try { a = def.count(playerId, _partienBis(z.T - 1), z.T - 1) || 0; n = def.count(playerId, _partienBis(z.T), z.T) || 0; }
    catch(e){ return; }
    if(n > a) out.push(Object.assign(z, {mal:n - a}));
  });
  return out;
}
const _BP_SCHLUSS_WORT = {tag:['an einem Tag', 'an # Tagen'], woche:['in einer Woche', 'in # Wochen'],
  monat:['in einem Monat', 'in # Monaten']};
function _badgeSchlussKopf(sl){
  const arten = [...new Set(sl.map(z => z.art))];
  if(arten.length !== 1) return `Geholt ${sl.reduce((n, z) => n + z.mal, 0)}-mal`;
  return 'Geholt ' + _BP_SCHLUSS_WORT[arten[0]][sl.length === 1 ? 0 : 1].replace('#', sl.length);
}
function _badgeSchlussZeile(z){
  const was = z.art === 'tag' ? datumFmt(new Date(z.k + 'T12:00:00'), 'tmj')
    : z.art === 'woche' ? `${datumFmt(z.ab, 'tm')} bis ${datumFmt(z.T - 1, 'tm')}`
    : seasonLabel(z.k);
  // Ein Monat ohne Eintrag in der Tafel der Saisons hat keinen Rückblick.
  const ziel = z.art !== 'monat' || (seasons || []).some(x => x.id === z.k);
  const wohin = z.art === 'tag' ? 'Rückblick auf den Tag' : z.art === 'woche' ? 'Rückblick auf die Woche' : 'Rückblick auf den Monat';
  return `<div class="bp-match"${ziel ? ` data-bp-zeit="${esc(z.art + '|' + z.k)}"` : ''}>
    <div class="bp-match-date">${esc(was)}${z.mal > 1 ? ` <span class="num">×${z.mal}</span>` : ''}</div>
    ${ziel ? `<div class="bp-match-score bp-schluss">${esc(wohin)}</div>
    <div class="bp-match-arr">›</div>` : ''}
  </div>`;
}
// Aus der Detailansicht weiter: sie schließt, und eine offene Story auch —
// das Ziel ist ein Blatt, und das liegt unter der Story (`sheetNav`).
function _bpWeiter(fn){
  closeBadgePopover();
  const ndBg = document.getElementById('ndBg');
  if(ndBg && ndBg.classList.contains('show')) closeNewsDetail();
  sheetNav(() => { try { fn(); } catch(e){} });
}
// Jede Auszeichnung in einem Blatt öffnet ihre Detailansicht: `data-bp` ist
// die Auszeichnung, `data-bp-pid` der Spieler, für den sie gilt. Sie steht
// oft in einer Zeile, die ins Profil führt; der Klick gehört dann ihr.
function _bpBinden(root){
  if(!root) return;
  root.querySelectorAll('[data-bp][data-bp-pid]').forEach(el => {
    el.onclick = e => {
      // Ein Gesicht darin führt weiter ins Profil.
      const innen = e.target && e.target.closest ? e.target.closest('[data-pid]') : null;
      if(innen && innen !== el && el.contains(innen)) return;
      e.stopPropagation();
      showBadgePopover(el.dataset.bp, el.dataset.bpPid);
    };
  });
}

// Helper: Fortschritt für quantifizierbare Locked-Badges. Returnt
// {cur, tgt, label} oder null wenn kein einfacher Fortschritt definierbar ist.
function _badgeProgress(badgeId, playerId){
  const playerMs = matches.filter(m => matchOf(playerId, m));
  // Die Ziele kommen aus BG [§7.0]: dieselben Zahlen wie Katalog und Auslöser.
  const marke = (n, tgt, label) => ({cur: Math.min(n, tgt), tgt, label});
  const seite = s => playerMs.filter(m => seiteVon(m, playerId) === s).length;
  switch(badgeId){
    case 'first_match': return marke(playerMs.length, 1, 'Sätze');
    case 'games25':     return marke(playerMs.length, BG.stammgast, 'Sätze');
    case 'games150':    return marke(playerMs.length, BG.dauerbrenner, 'Sätze');
    case 'games250':    return marke(playerMs.length, BG.urgestein, 'Sätze');
    case 'wins200':     return marke(playerMs.filter(m => won(playerId, m)).length, BG.siegermaschine, 'Siege');
    case 'reves50':     return marke(seite('reves'), BG.seite, 'Sätze links');
    case 'drive50':     return marke(seite('drive'), BG.seite, 'Sätze rechts');
    case 'streak5':
    case 'streak10':
    case 'streak15':
    case 'streak20': {
      const tgt = BG.serien[['streak5','streak10','streak15','streak20'].indexOf(badgeId)];
      return marke(longestPlayerStreak(playerId, matches), tgt, 'längste Serie');
    }
    case 'climber_100':
    case 'dominator_400':
    case 'dynasty_600': {
      // Die Marke ist jede Saison neu erreichbar — der Balken zeigt deshalb
      // den Höchststand der LAUFENDEN Saison, über dem Startwert.
      let curPeak = 0;
      try {
        const sp = seasonPeakElos()[currentSeason().id] || {};
        if(sp[playerId] != null) curPeak = Math.round(sp[playerId] - cfg.start_elo);
      } catch(e){}
      const tgt = BG.elo[['climber_100','dominator_400','dynasty_600'].indexOf(badgeId)];
      return {cur: Math.max(0, Math.min(curPeak, tgt)), tgt, label: 'Saison-Elo über Start'};
    }
    case 'allrounder': {
      // Siege rechts UND links — gezeigt wird der kleinere Wert.
      const stats = playerStats(playerId);
      return marke(Math.min(stats.drvW || 0, stats.revW || 0), BG.allrounder, 'Siege auf der schwächeren Seite');
    }
    case 'mr_perfect':
    case 'mr_disaster': {
      // Bagels der laufenden Saison, gewonnen oder kassiert.
      const feld = badgeId === 'mr_perfect' ? 'bagelsFor' : 'bagelsAgainst';
      const n = matchesInSeason(currentSeason().id).filter(m => matchOf(playerId, m))
        .reduce((a, m) => a + bgBagels(playerId, m)[feld], 0);
      return marke(n, BG.bagelSaison, badgeId === 'mr_perfect' ? 'Bagels in dieser Saison' : 'kassierte Bagels in dieser Saison');
    }
    // nemesis: siehe _badgeStreakState — dort als „Aktueller Lauf".
  }
  return null;
}

// Aktueller (laufender) Zähler für Serien-Badges, der sich je nach Verlauf
// wieder zurücksetzt (z. B. „Tiebreaks in Folge"). Anders als _badgeProgress
// (Bestwert) zeigt das den LEBENDEN Stand bis zur letzten Partie — wie nah
// der Spieler an der nächsten Auslösung ist. Dieselben Regeln wie die
// count*-Funktionen; zurück kommt der End-Wert des laufenden Zählers.
// Rückgabe: {cur, tgt, label, hint} · für Wochentag-Badges {weekdays:Set, tgt,
// label, kind:'weekday'} · sonst null.
function _badgeStreakState(badgeId, playerId){
  if(badgeId === 'award_collector'){
    // Laufender Stand der AKTUELLEN Saison; countDayWins/countPeriodWins
    // zählen nur abgeschlossene Tage und Wochen.
    const sid = currentSeason().id;
    const key = 'awColl_'+playerId+'_'+sid+'_'+matches.length+'_'+_cache.version;
    if(!_cache._awColl) _cache._awColl = {};
    let res = _cache._awColl[key];
    if(!res){
      _topfDeckel(_cache._awColl, 60);
      const seasonMs = matchesInSeason(sid);
      res = { potd: countDayWins(playerId, seasonMs), potw: countPeriodWins(playerId, seasonMs, 'week') };
      _cache._awColl[key] = res;
    }
    return {
      kind:'dual',
      metrics:[
        {cur:res.potd, tgt:PERIODE_SAMMLER.tag, label:'Tagessiege'},
        {cur:res.potw, tgt:PERIODE_SAMMLER.woche, label:'Wochensiege'}
      ],
      hint:'Zählt nur die laufende Saison, beide Ziele nötig, Reset zu Saisonbeginn.'
    };
  }
  if(badgeId === 'allwetter'){
    const weekdays = _allwetterTage(playerId);
    return {weekdays, tgt:4, label:'Wochentage als Tagessieger', kind:'weekday'};
  }

  const ordered = matches.filter(m => matchOf(playerId,m))
    .sort((a,b) => mts(a)-mts(b));

  switch(badgeId){
    case 'nerves_of_steel': {
      let cur = 0;
      ordered.forEach(m => bgTiebreaks(playerId, m).forEach(sieg => { cur = sieg ? cur + 1 : 0; }));
      return {cur, tgt:BG.tbSerie, label:'gewonnene Tiebreaks in Folge', hint:'Setzt bei einem verlorenen Tiebreak zurück'};
    }
    case 'krimi': {
      let cur = 0;
      ordered.forEach(m => { cur = bgKnapp(m) ? cur + 1 : 0; });
      return {cur, tgt:BG.krimi, label:'knappe Sätze in Folge', hint:'Setzt bei einem deutlichen Ergebnis zurück'};
    }
    case 'repeat_score': {
      let lastScore=null, cur=0;
      ordered.forEach(m => {
        if(!won(playerId,m)){cur=0;lastScore=null;return;}
        const score=standFuer(m);
        if(score===lastScore) cur++; else {cur=1;lastScore=score;}
      });
      return {cur, tgt:BG.wiederholung, label:'Siege mit gleichem Ergebnis in Folge', hint:'Setzt bei Niederlage oder anderem Ergebnis zurück'};
    }
    case 'losing5': {
      let cur=0;
      ordered.forEach(m => { cur = won(playerId,m) ? 0 : cur+1; });
      return {cur, tgt:BG.talfahrt, label:'Niederlagen in Folge', hint:'Setzt bei einem Sieg zurück'};
    }
    case 'streak5': case 'streak10': case 'streak15': case 'streak20': {
      const tgt = BG.serien[['streak5','streak10','streak15','streak20'].indexOf(badgeId)];
      let cur=0;
      ordered.forEach(m => { cur = won(playerId,m) ? cur+1 : 0; });
      return {cur, tgt, label:'Siege in Folge', hint:'Setzt bei einer Niederlage zurück'};
    }
    case 'nemesis': {
      // Eine Reihe gegen einen Ruheständler läuft nie weiter und reißt nie
      // [§C40]: für einen Aktiven zählen nur Gegner, die noch spielen.
      const vs = {}, zaehlt = imRuhestand(playerId) ? sichtbar : ligaAktiv;
      ordered.forEach(m => {
        const onA = (playerId===m.a1||playerId===m.a2);
        const w = (onA && m.winner==='A') || (!onA && m.winner==='B');
        const opps = (onA ? [m.b1,m.b2] : [m.a1,m.a2]).filter(o => zaehlt(o));
        if(w) opps.forEach(o => { vs[o] = 0; });
        else  opps.forEach(o => { vs[o] = (vs[o]||0) + 1; });
      });
      const cur = Object.values(vs).reduce((a,b) => a>b?a:b, 0);
      return {cur, tgt:BG.angstgegner, label:'Niederlagen gg. denselben Gegner in Folge', hint:'Setzt bei einem Sieg gegen diesen Gegner zurück'};
    }
  }
  return null;
}

// Rendert den „Aktueller Lauf"-Abschnitt für ein Kontext-/Serien-Badge.
// Gibt '' zurück, wenn das Badge keinen resettbaren Zähler hat.
const _WEEKDAY_ABBR = ['Mo','Di','Mi','Do','Fr','Sa','So']; // Index = (getDay()+6)%7
function _badgeStreakSectionHtml(badgeId, playerId, rarity){
  const st = _badgeStreakState(badgeId, playerId);
  if(!st) return '';
  if(st.kind === 'dual'){
    // Zwei parallele Ziele (z. B. Award-Sammler: Tagessiege + Wochensiege).
    const bars = st.metrics.map(mt => {
      const done = mt.cur >= mt.tgt;
      const pct = Math.round(Math.min(mt.cur / mt.tgt, 1) * 100);
      return `
      <div class="bp-prog">
        <div class="bp-prog-bar"><div class="bp-prog-fill ${rarity}" style="width:${pct}%"></div></div>
        <div class="bp-prog-label">
          <span>${mt.cur} / ${mt.tgt} <span class="bp-prog-target">${esc(mt.label)}</span></span>
          <span>${done?'✓':pct+'\u00A0%'}</span>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="bp-section">Aktuelle Saison</div>
      ${bars}
      <div class="bp-run-hint">${esc(st.hint)}</div>`;
  }
  if(st.kind === 'weekday'){
    const have = st.weekdays.size;
    const chips = _WEEKDAY_ABBR.map((abbr, i) => {
      // i = (getDay()+6)%7 → 0=Mo … 6=So; zurückrechnen auf getDay()
      const jsDay = (i + 1) % 7;
      const on = st.weekdays.has(jsDay);
      return `<div class="bp-wd ${on?'on':''}">${abbr}</div>`;
    }).join('');
    return `
      <div class="bp-section">Wochentage gesammelt</div>
      <div class="bp-weekdays">${chips}</div>
      <div class="bp-run-label"><span>${have} / ${st.tgt} <span class="bp-prog-target">${esc(st.label)}</span></span></div>`;
  }
  const cur = st.cur || 0;
  const pct = Math.round(Math.min(cur / st.tgt, 1) * 100);
  return `
    <div class="bp-section">Aktueller Lauf</div>
    <div class="bp-prog">
      <div class="bp-prog-bar"><div class="bp-prog-fill ${rarity}" style="width:${pct}%"></div></div>
      <div class="bp-prog-label">
        <span>${cur} / ${st.tgt} <span class="bp-prog-target">${esc(st.label)}</span></span>
        <span>${pct}\u00A0%</span>
      </div>
    </div>
    <div class="bp-run-hint">${esc(st.hint)}</div>`;
}

function showBadgePopover(badgeId, playerId){
  const b = BADGES.find(x => x.id === badgeId); if(!b) return;
  const r = rarityOf(b.id);
  const rarityLabel = (RARITY_META[r] && RARITY_META[r].label) || '';
  const earned = getCachedBadges(playerId);
  const cnt = (earned.find(e => e.id === badgeId)||{}).count || 0;
  const unlocked = cnt > 0;
  const ONCE_ONLY = new Set(['first_match','games25','games150','games250','wins200','allrounder','reves50','drive50',
    'allwetter']);
  const isRepeatable = !ONCE_ONLY.has(b.id);

  // ─── Body je nach Modus ───
  let bodyHtml;
  if(unlocked){
    // Match-Liste (für fire-basierte Badges)
    const hits = _badgeFireMatches(playerId, badgeId);
    if(hits.length){
      // Jede Partie, in der sie ausgelöst wurde. Nach acht stand „+ 12
      // weitere", und gerade die häufigen Auszeichnungen zeigten damit fast
      // nichts von dem, was die Zahl darüber zählt.
      const rowsHtml = hits.map(m => {
        const date = new Date(m.created_at);
        const dateStr = datumFmt(date, 'tmj');
        const onA = (playerId===m.a1||playerId===m.a2);
        const myGf = onA?m.games_a:m.games_b;
        const myGa = onA?m.games_b:m.games_a;
        const won = (onA&&m.winner==='A')||(!onA&&m.winner==='B');
        const col = won ? 'var(--acid)' : 'var(--red)';
        return `<div class="bp-match" data-mid="${esc(m.id)}">
          <div class="bp-match-date">${dateStr}</div>
          <div class="bp-match-score" style="color:${col}">${myGf} : ${myGa}</div>
          <div class="bp-match-arr">›</div>
        </div>`;
      }).join('');
      bodyHtml = `
        <div class="bp-section">Geholt in ${hits.length} ${hits.length===1?'Satz':'Sätze'}</div>
        ${rowsHtml}`;
    } else {
      // Ohne Partie: der Tag, die Woche oder der Monat, dessen Schluss sie
      // vergab, und ein Tippen öffnet dessen Rückblick.
      const sl = _badgeSchluesse(badgeId, playerId);
      bodyHtml = sl.length ? `
        <div class="bp-section">${esc(_badgeSchlussKopf(sl))}</div>
        ${sl.map(_badgeSchlussZeile).join('')}` : `
        <div class="bp-section">Status</div>
        <div class="bp-locked-hint">
          Sie hängt an keinem einzelnen Satz.
          ${isRepeatable
            ? `<br><br><span class="bp-locked-em">${cnt}×</span> bisher erreicht.`
            : `<br><br><span class="bp-locked-em">Freigeschaltet.</span>`}
        </div>`;
    }
  } else {
    // Locked — Fortschritt oder Hinweis
    const prog = _badgeProgress(badgeId, playerId);
    if(prog){
      const pct = Math.round(prog.cur / prog.tgt * 100);
      bodyHtml = `
        <div class="bp-section">Fortschritt</div>
        <div class="bp-prog">
          <div class="bp-prog-bar"><div class="bp-prog-fill ${r}" style="width:${Math.min(pct,100)}%"></div></div>
          <div class="bp-prog-label">
            <span>${prog.cur} / ${prog.tgt} <span class="bp-prog-target">${esc(prog.label)}</span></span>
            <span>${pct}\u00A0%</span>
          </div>
        </div>`;
    } else {
      // Kein Fortschritt definierbar — knapper Hinweis
      bodyHtml = `
        <div class="bp-section">Status</div>
        <div class="bp-locked-hint">
          Noch <span class="bp-locked-em">nicht erreicht</span>.<br>
          Möglich schon im nächsten Satz oder über die Saison hinweg.
        </div>`;
    }
  }

  // Kontext-/Serien-Badges: laufender Zähler (resettet je nach Spielverlauf).
  // Erscheint zusätzlich zur Match-Liste/zum Fortschritt — sowohl locked als
  // auch unlocked, damit man sieht, wie nah man an der nächsten Auslösung ist.
  bodyHtml += _badgeStreakSectionHtml(badgeId, playerId, r);

  // Status-Pill rechts oben in der Card (×N oder "Freigeschaltet")
  const statusHtml = unlocked
    ? (isRepeatable
        ? `<div class="bp-status"><div class="bp-status-count" style="color:${{legendary:'var(--gold)',rare:'var(--purple)',common:'var(--acid)',negative:'var(--red)'}[r]||'var(--ink)'}">×${cnt}</div><div class="bp-status-label">erreicht</div></div>`
        : `<div class="bp-status"><div class="bp-status-count" style="color:${{legendary:'var(--gold)',rare:'var(--purple)',common:'var(--acid)',negative:'var(--red)'}[r]||'var(--ink)'}">✓</div><div class="bp-status-label">freigeschaltet</div></div>`)
    : '';

  const bp = document.getElementById('bp');
  const bpBg = document.getElementById('bpBg');
  bp.innerHTML = `
    <div class="bp-head">
      <div class="bp-ic ${unlocked?r:'locked'}">${unlocked ? badgeIc(b, '24px') : svgI('lock')}</div>
      <div style="flex:1;min-width:0">
        <div class="bp-title">${esc(b.name)}</div>
        <div class="bp-desc">${esc(b.desc)}</div>
        <div class="bp-rarity">${esc(rarityLabel)}</div>
      </div>
      ${statusHtml}
    </div>
    ${bodyHtml}
    <button class="bp-close" id="bpCloseBtn">Schließen</button>
  `;
  bpBg.classList.add('show');
  _zurueckAbgleichen();
  bp.scrollTop = 0;
  _fensterLicht(bp, 'weiss');
  _verdecken('bp', true);
  // Eine Partie öffnet ihr Blatt, ein Tag, eine Woche, ein Monat seinen
  // Rückblick, über dem Blatt darunter gestapelt (`_bpWeiter`).
  bp.querySelectorAll('.bp-match[data-mid]').forEach(el => {
    el.onclick = () => { const mid = el.dataset.mid; _bpWeiter(() => showMatchDetail(mid)); };
  });
  bp.querySelectorAll('.bp-match[data-bp-zeit]').forEach(el => {
    el.onclick = () => {
      const [art, k] = String(el.dataset.bpZeit).split('|');
      const se = art === 'monat' ? (seasons || []).find(x => x.id === k) : null;
      _bpWeiter(() => art === 'tag' ? showPotdRecap({force:true, tag:k}) : art === 'woche' ? showPotwRecap({woche:k})
        : showSeasonRecap(se));
    };
  });
  document.getElementById('bpCloseBtn').onclick = closeBadgePopover;
}

function closeBadgePopover(){
  const bpBg = document.getElementById('bpBg');
  if(bpBg) bpBg.classList.remove('show');
  _fensterZu(bpBg, document.getElementById('bp'), 'bp');
  _zurueckAbgleichen();
}

