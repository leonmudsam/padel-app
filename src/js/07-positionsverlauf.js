// ╔═══ §3.7 ─── SAISON-POSITIONSVERLAUF (§C21 UI) ──────────────────────╗
//     Bottom-Sheet mit Liniendiagramm der Tabellenpositionen über die
//     Tage der aktuellen Saison. Hervorhebung per Tap auf Linie/Endpunkt-
//     Avatar — Detail-Karte zeigt selektierten Spieler. CSS-Toggle für
//     Highlight, kein Re-Render der SVG-Lines bei jedem Tap.
// ╚═════════════════════════════════════════════════════════════════════════╝

// Avatar-Helper für SVG: liefert ein <g>-Element mit Emoji ODER Initialen-Kreis.
// transform="translate(cx, cy)" wird vom Caller gesetzt; hier nur der innere Markup.
function _posvAvSvg(player, color, dataPid){
  const r = 11;
  if(!player){
    return `<g class="posv-end-av" data-pid="${esc(dataPid)}">
      <circle r="${r}" fill="var(--surface3)" stroke="${color}" stroke-width="1.5"/>
      <text text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-size="13" font-family="'Archivo Black',sans-serif">?</text>
    </g>`;
  }
  const em = player.avatar_id ? avatarEmoji(player.avatar_id) : null;
  if(em){
    return `<g class="posv-end-av" data-pid="${esc(dataPid)}">
      <circle r="${r}" fill="var(--surface3)" stroke="${color}" stroke-width="1.5"/>
      <text text-anchor="middle" dominant-baseline="central" font-size="14"
        font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla',sans-serif">${em}</text>
    </g>`;
  }
  return `<g class="posv-end-av" data-pid="${esc(dataPid)}">
    <circle r="${r}" fill="${avColor(player.id)}" stroke="${color}" stroke-width="1.5"/>
    <text text-anchor="middle" dominant-baseline="central" fill="#0a0c0b" font-size="10"
      font-family="'Archivo Black',sans-serif">${esc(initials(player.name))}</text>
  </g>`;
}

// Wie sich der Platz eines Spielers vom vorletzten zum letzten Spieltag
// bewegt hat: positiv heißt aufwärts. `null` vor seinem ersten Spieltag.
function _posvBewegung(data, pid){
  const st = data.spielTage || [];
  const arr = data.positionsByDay[pid] || [];
  const jetzt = st.length ? arr[st[st.length - 1] - 1] : null;
  const vorher = st.length > 1 ? arr[st[st.length - 2] - 1] : null;
  if(jetzt == null) return null;
  if(vorher == null) return {neu:true, d:0};
  return {neu:false, d:vorher - jetzt};
}
function _posvJetzt(data, pid){
  const arr = data.positionsByDay[pid] || [];
  for(let i = arr.length - 1; i >= 0; i--) if(arr[i] !== null) return arr[i];
  return null;
}

// Baut das komplette SVG für den Positionsverlauf. Eine Funktion, ein String —
// kein DOM-Build aus Performance-Gründen. Highlight wird via CSS-Klassen-Toggle
// nachträglich angewendet.
//
// Die Linien sind Kurven von Tag zu Tag, wie eine Tabelle über die Zeit
// gelesen wird: gerade Linien kreuzten sich in Spitzen, und bei acht
// Spielern war nicht zu sehen, wer wen überholt. Am Ende steht das Gesicht
// und die Bewegung seit dem letzten Spieltag; der Name stand dort mit „…"
// gekürzt und steht jetzt ganz in der Tabelle darunter [§C33]. Die Tage mit
// Partie tragen eine Marke auf der Achse: ohne sie sah ein Tag ohne Spiel
// aus wie einer, an dem sich nichts bewegt hat.
function _buildPositionChartSvg(data){
  const VB_W = 360, VB_H = 280;
  const ML = 24, MR = 62, MT = 12, MB = 34;
  const PW = VB_W - ML - MR;
  const PH = VB_H - MT - MB;
  const N = data.activeIds.length;
  const D = data.lastDay;
  const xOf = day => ML + (D <= 1 ? PW/2 : (day-1)/(D-1) * PW);
  const yOf = pos => MT + (N <= 1 ? PH/2 : (pos-1)/(N-1) * PH);

  let grid = '';
  for(let p=1; p<=N; p++){
    const y = yOf(p);
    grid += `<line x1="${ML}" y1="${y}" x2="${ML+PW}" y2="${y}"/>`;
  }
  let yTicks = '';
  for(let p=1; p<=N; p++){
    yTicks += `<text class="posv-y-tick${p === 1 ? ' eins' : ''}" x="${ML-7}" y="${yOf(p)}">${p}</text>`;
  }
  // ── X-Achse Ticks: bei ≤7 Tagen jeder Tag, sonst 1,5,10,15,…
  const tickDays = [];
  if(D <= 7){
    for(let d=1; d<=D; d++) tickDays.push(d);
  } else {
    tickDays.push(1);
    for(let d=5; d<=D; d+=5) tickDays.push(d);
    // Endpunkt immer — und der Fünferschritt davor fällt weg, wenn er zu
    // nah daran liegt: am 26. standen „25" und „26" als „2526" übereinander.
    if(tickDays[tickDays.length-1] !== D){
      if(D - tickDays[tickDays.length-1] < 3) tickDays.pop();
      tickDays.push(D);
    }
  }
  const seenTicks = new Set();
  let xTicks = '';
  tickDays.filter(d => !seenTicks.has(d) && seenTicks.add(d)).forEach(d => {
    xTicks += `<text class="posv-x-tick" x="${xOf(d)}" y="${MT+PH+24}">${d}</text>`;
  });
  const spieltage = (data.spielTage || []).map(d => `<circle class="posv-st" cx="${xOf(d).toFixed(1)}" cy="${MT+PH+10}" r="2.2"/>`).join('');

  const playersByEndPos = data.activeIds
    .map(id => ({id, lastPos:_posvJetzt(data, id)}))
    .filter(o => o.lastPos !== null)
    .sort((a,b)=> a.lastPos - b.lastPos);

  let lines = '', hits = '', dots = '', ends = '';
  const pm = pmap();
  playersByEndPos.forEach((o, k) => {
    const pid = o.id;
    const color = data.colorOf[pid] || '#888';
    const arr = data.positionsByDay[pid];
    const pts = [];
    for(let i=0; i<arr.length; i++){
      if(arr[i] !== null) pts.push({x: xOf(i+1), y: yOf(arr[i])});
    }
    if(pts.length === 0) return;
    const d = _posvPfad(pts);
    lines += `<path class="posv-line" data-pid="${esc(pid)}" d="${d}" stroke="${color}" pathLength="1" style="--k:${k}"/>`;
    hits  += `<path class="posv-line-hit" data-pid="${esc(pid)}" d="${d}"/>`;
    // Ein Punkt je Spieltag, nicht je Kalendertag: an einem Tag ohne Partie
    // gibt es nichts zu markieren.
    const st = new Set(data.spielTage || []);
    for(let i=0; i<arr.length; i++){
      if(arr[i] === null || (!st.has(i + 1) && i !== arr.length - 1)) continue;
      const last = i === arr.length - 1;
      dots += `<circle class="posv-dot" data-pid="${esc(pid)}" cx="${xOf(i+1).toFixed(1)}" cy="${yOf(arr[i]).toFixed(1)}" r="${last ? 3.2 : 2}" fill="${color}"/>`;
    }
    const xEnd = pts[pts.length-1].x, yEnd = pts[pts.length-1].y;
    const avX = Math.min(xEnd + 16, VB_W - 46);
    ends += `<g transform="translate(${avX.toFixed(1)},${yEnd.toFixed(1)})">${_posvAvSvg(pm[pid], color, pid)}</g>`;
    const bw = _posvBewegung(data, pid);
    const txt = !bw ? '' : bw.neu ? 'neu' : bw.d > 0 ? '▲' + bw.d : bw.d < 0 ? '▼' + Math.abs(bw.d) : '';
    if(txt) ends += `<text class="posv-end-d ${!bw || bw.neu ? '' : bw.d > 0 ? 'auf' : 'ab'}" data-pid="${esc(pid)}" x="${(avX + 15).toFixed(1)}" y="${yEnd.toFixed(1)}">${txt}</text>`;
  });

  return `<svg class="posv-svg" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">
    <g class="posv-grid">${grid}</g>
    ${yTicks}
    ${spieltage}
    ${xTicks}
    <g>${hits}</g>
    <g>${lines}</g>
    <g>${dots}</g>
    <g>${ends}</g>
  </svg>`;
}

// Die Kurve eines Spielers von Tag zu Tag. Sie steht an EINER Stelle, weil
// Blatt und Vorschau dieselbe Linie zeichnen [§C27]: zwei Formeln für die
// Kurve hätten in der Karte unter der Rangliste einen anderen Verlauf
// gezeigt als im Blatt, das sie öffnet.
function _posvPfad(pts){
  if(pts.length === 1){
    return `M ${(pts[0].x-2).toFixed(1)} ${pts[0].y.toFixed(1)} L ${(pts[0].x+2).toFixed(1)} ${pts[0].y.toFixed(1)}`;
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for(let i=1; i<pts.length; i++){
    const a = pts[i-1], b = pts[i], h = (b.x - a.x) / 2;
    d += ` C ${(a.x+h).toFixed(1)} ${a.y.toFixed(1)} ${(b.x-h).toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

// Die Vorschau unter der Rangliste: derselbe Verlauf wie im Blatt, nur
// vereinfacht — jede Linie, aber ohne Gesichter, ohne Achsen und ohne
// Bewegung am Ende. Sie zeigte vorher die Elo der ersten drei, also eine
// andere Grafik als das Blatt, das sie öffnet: wer tippte, sah etwas
// anderes, als die Karte versprochen hatte. Die ersten drei tragen ihre
// Linie voll, alle übrigen leise; darunter stehen sie mit Platz und Farbe,
// weil die Grafik keine Namen trägt.
function posvVorschauHtml(sid){
  const data = getSeasonPositionHistory(sid);
  if(data.empty || !data.activeIds.length || !data.lastDay) return '';
  const W = 320, H = 132, ML = 16, MR = 10, MT = 8, MB = 16;
  const PW = W - ML - MR, PH = H - MT - MB;
  const N = data.activeIds.length, D = data.lastDay;
  const xOf = day => ML + (D <= 1 ? PW / 2 : (day - 1) / (D - 1) * PW);
  const yOf = pos => MT + (N <= 1 ? PH / 2 : (pos - 1) / (N - 1) * PH);
  const ids = data.activeIds.filter(id => _posvJetzt(data, id) !== null)
    .sort((a, b) => _posvJetzt(data, a) - _posvJetzt(data, b));
  if(ids.length < 2) return '';
  let linien = '', punkte = '';
  // Von hinten nach vorn gezeichnet: die Linie des Ersten liegt oben.
  ids.slice().reverse().forEach(id => {
    const arr = data.positionsByDay[id] || [];
    const pts = [];
    arr.forEach((p, i) => { if(p !== null) pts.push({x:xOf(i + 1), y:yOf(p)}); });
    if(!pts.length) return;
    const vorn = _posvJetzt(data, id) <= 3;
    const c = data.colorOf[id] || '#888';
    linien += `<path class="posv-mini-l${vorn ? '' : ' leise'}" d="${_posvPfad(pts)}" stroke="${c}"/>`;
    const e = pts[pts.length - 1];
    punkte += `<circle class="posv-mini-p${vorn ? '' : ' leise'}" cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="${vorn ? 3.4 : 2.2}" fill="${c}"/>`;
  });
  const st = (data.spielTage || []).map(d => `<circle class="posv-st" cx="${xOf(d).toFixed(1)}" cy="${H - 5}" r="1.8"/>`).join('');
  const raster = Array.from({length:N}, (_, i) => `<line x1="${ML}" x2="${ML + PW}" y1="${yOf(i + 1).toFixed(1)}" y2="${yOf(i + 1).toFixed(1)}"/>`).join('');
  const pm = pmap();
  const legende = ids.slice(0, 3).map(id => `<span style="--c:${data.colorOf[id] || '#888'}"><i></i>`
    + `<b class="num">${_posvJetzt(data, id)}.</b>${esc((pm[id] || {}).name || '?')}</span>`).join('');
  return `<span class="posv-mini"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`
    + `<g class="posv-mini-r">${raster}</g>`
    + `<text class="posv-mini-y eins" x="${ML - 6}" y="${yOf(1).toFixed(1)}">1</text>`
    + `<text class="posv-mini-y" x="${ML - 6}" y="${yOf(N).toFixed(1)}">${N}</text>`
    + `${st}${linien}${punkte}</svg><span class="posv-mini-lg">${legende}</span></span>`;
}

// Der Verlauf eines Spielers in einer Zeile der Tabelle, so klein wie ein
// Wort: dieselbe Kurve wie oben, ohne Achsen.
function _posvSpark(data, pid){
  const arr = data.positionsByDay[pid] || [], N = Math.max(2, data.activeIds.length), D = data.lastDay;
  const pts = [];
  arr.forEach((p, i) => { if(p !== null) pts.push([D <= 1 ? 28 : 2 + i / (D - 1) * 52, 2 + (p - 1) / (N - 1) * 14]); });
  if(pts.length < 2) return `<svg class="posv-spark" viewBox="0 0 56 18" aria-hidden="true"></svg>`;
  return `<svg class="posv-spark" viewBox="0 0 56 18" aria-hidden="true"><polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" stroke="${data.colorOf[pid] || '#888'}"/>`
    + `<circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="2" fill="${data.colorOf[pid] || '#888'}"/></svg>`;
}

// Die Tabelle des letzten Stands: Platz, Gesicht, Name, Verlauf, Bewegung
// und Elo. Sie ist zugleich die Wahl des Spielers — ein Hinweis „Linie
// antippen" erklärte vorher, wie man die Grafik bedient.
function _posvTabelle(data){
  const pm = pmap();
  const ids = data.activeIds.filter(id => _posvJetzt(data, id) !== null)
    .sort((a, b) => _posvJetzt(data, a) - _posvJetzt(data, b));
  return `<div class="posv-tab">${ids.map((id, k) => {
    const bw = _posvBewegung(data, id);
    const bew = !bw ? '' : bw.neu ? '<span class="posv-bw neu">neu</span>'
      : bw.d > 0 ? `<span class="posv-bw auf num">▲${bw.d}</span>`
      : bw.d < 0 ? `<span class="posv-bw ab num">▼${Math.abs(bw.d)}</span>` : '<span class="posv-bw num">–</span>';
    const elo = data.finalElo[id];
    return `<div class="posv-row${_posvJetzt(data, id) === 1 ? ' eins' : ''}" data-pid="${esc(id)}" style="--k:${k};--c:${data.colorOf[id] || '#888'}">`
      + `<b class="posv-pl num">${_posvJetzt(data, id)}.</b>${pm[id] ? avHtml(pm[id], '', {px:26}) : ''}`
      + `<span class="posv-nm">${esc((pm[id] || {}).name || '?')}</span>${_posvSpark(data, id)}${bew}`
      + `<span class="posv-elo num">${elo === undefined ? '–' : Math.round(elo)}</span></div>`;
  }).join('')}</div>`;
}

// Der gewählte Spieler: Wappen und Name, die Zahlen der Saison als
// Zahlenreihe [§C31], sein Platz an jedem Tag als Zelle — Gold, wo er vorn
// lag — und seine Partien als Lauf [§C27]. Vorher stand hier ein leerer
// Kasten mit „Hier stehen die Einzelheiten, sobald ein Spieler gewählt ist".
function _renderPosvDetail(el, data, hlId){
  if(!hlId){ el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const p = pmap()[hlId];
  const s = getSeasonPlayerStats(data.seasonId)[hlId] || {wins:0, losses:0, games:0};
  const arr = data.positionsByDay[hlId] || [];
  const st = new Set(data.spielTage || []);
  const jetzt = _posvJetzt(data, hlId);
  const best = Math.min(...arr.filter(x => x !== null));
  const vorn = (data.spielTage || []).filter(d => arr[d - 1] === 1).length;
  const elo = data.finalElo[hlId];
  const zellen = arr.map((pos, i) => `<span class="${pos === null ? 'leer' : pos === 1 ? 'eins' : ''}${st.has(i + 1) ? ' gespielt' : ''}" style="--k:${i}">`
    + `${pos === null ? '' : `<b class="num">${pos}</b>`}<small class="num">${i + 1}</small></span>`).join('');
  el.innerHTML = `<div class="posv-dk">${p ? avHtml(p, '', {ins:true, px:48, feuer:0}) : ''}
      <div class="posv-dk-t"><b>${esc(p ? p.name : '?')}</b><small>Platz ${jetzt} von ${data.activeIds.length}</small></div>
      <i class="posv-dk-c" style="background:${data.colorOf[hlId] || '#888'}"></i></div>`
    + rcpZahlenHtml([
        {v:jetzt + '.', l:'Platz', ton:jetzt === 1 ? 'gold' : ''},
        {v:elo === undefined ? '–' : String(Math.round(elo)), l:'Elo'},
        {v:s.wins + '–' + s.losses, l:'Bilanz'},
        {v:s.games ? Math.round(s.wins / s.games * 100) + ' %' : '–', l:'Siegquote'},
        {v:best + '.', l:'Bester Platz'},
        {v:String(vorn), l:vorn === 1 ? 'Spieltag vorn' : 'Spieltage vorn'}
      ])
    + `<div class="nd-section">Platz an jedem Tag</div><div class="posv-tz">${zellen}</div>`
    + `<div class="nd-section">Die Partien der Saison</div>${saisonZellenHtml(data.seasonId, hlId)}`;
}

// Highlight-Logik: zentraler Click-Handler auf das Sheet-Root via Event-Delegation,
// damit wir keine pro-Element-Listener leaken müssen und SVG-Elemente innerhalb
// nachträglich gewechselt werden können. Die Zeilen der Tabelle wählen
// denselben Spieler wie Linie und Gesicht.
function _attachPosvHighlight(rootEl, data){
  const chartHost = rootEl.querySelector('.posv-chart-host');
  const detailEl  = rootEl.querySelector('#posvDetail');
  let curHl = null;

  function applyHl(pid){
    if(pid && pid === curHl) pid = null; // gleiche Linie nochmal → reset
    curHl = pid;
    chartHost.classList.toggle('posv-dim', !!pid);
    rootEl.querySelectorAll('.posv-chart-host .hl, .posv-row.hl').forEach(el => el.classList.remove('hl'));
    if(pid){
      rootEl.querySelectorAll(`.posv-chart-host [data-pid="${CSS.escape(pid)}"], .posv-row[data-pid="${CSS.escape(pid)}"]`)
        .forEach(el => el.classList.add('hl'));
    }
    _renderPosvDetail(detailEl, data, pid);
  }

  rootEl.addEventListener('click', (e) => {
    // Das Detail selbst führt nicht weiter: ein Wappen darin ist kein Wechsel.
    if(detailEl.contains(e.target)) return;
    let target = e.target;
    let pid = null;
    while(target && target !== rootEl){
      if(target.dataset && target.dataset.pid && (chartHost.contains(target) || target.classList.contains('posv-row'))){ pid = target.dataset.pid; break; }
      target = target.parentNode;
    }
    if(pid){
      e.stopPropagation();
      applyHl(pid);
      return;
    }
    if(curHl && chartHost.contains(e.target)) applyHl(null);
  });
}

// Hauptfunktion: öffnet das Sheet. Saison-Argument optional (default: aktuelle).
function showPositionHistory(seasonId){
  if(!seasonId) seasonId = currentSeason().id;
  _sheetSetReopen(()=>showPositionHistory(seasonId));
  const data = getSeasonPositionHistory(seasonId);
  const sLabel = seasonLabel(seasonId);

  if(data.empty || data.activeIds.length === 0 || data.lastDay === 0){
    openSheet(`
      <div class="posv-empty">
        <div class="posv-empty-title">Noch kein Verlauf</div>
        <div>Sobald in dieser Saison die ersten Partien gespielt sind,<br>steht hier die Entwicklung der Tabellenplätze.</div>
      </div>
    `);
    return;
  }

  const headerDate = new Date().toLocaleString('de-DE',{hour:'2-digit',minute:'2-digit'});
  const subInfo = data.isCurrent
    ? `${sLabel} · Tag ${data.lastDay} von ${data.totalDays}`
    : `${sLabel} · Saison abgeschlossen`;
  const n = (data.spielTage || []).length;
  // Die Tage an der Spitze als Balken — dasselbe Bauteil wie im
  // Saison-Rückblick und auf der Meisterbühne [§C27].
  const podium = data.activeIds.filter(id => _posvJetzt(data, id) !== null)
    .sort((a, b) => _posvJetzt(data, a) - _posvJetzt(data, b)).slice(0, 3);
  const spitze = saisonSpitzeHtml(seasonId, podium);

  openSheet(`
    <div style="padding:0 0 8px">
      ${blattKopfHtml({ic:'trendUp', titel:'Positionsverlauf', unter:'Tabellenplätze während der Saison'})}
      <div style="height:12px"></div>

      <div class="posv-info-pill">
        <div class="posv-info-ic">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </div>
        <div class="posv-info-text">
          <div class="posv-info-title">${data.isCurrent ? 'Aktuelle Saison' : 'Vergangene Saison'}</div>
          <div class="posv-info-sub">${esc(subInfo)}</div>
        </div>
        <div class="posv-info-n"><b class="num">${n}</b><small>${n === 1 ? 'Spieltag' : 'Spieltage'}</small></div>
      </div>

      <div class="posv-chart-host" id="posvChartHost">
        <div class="posv-chart-axislabel">Position</div>
        ${_buildPositionChartSvg(data)}
      </div>

      <div class="posv-detail" id="posvDetail" hidden></div>

      <div class="nd-section">Die Tabelle</div>
      ${_posvTabelle(data)}
      ${spitze ? `<div class="nd-section">Tage an der Spitze</div>${spitze}` : ''}

      <div class="posv-update">
        <span>Stand: heute, ${headerDate}</span>
        <button class="posv-refresh" id="posvRefreshBtn" title="Aktualisieren">
          <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/></svg>
        </button>
      </div>
    </div>
  `);

  const sheet = document.getElementById('sheet');
  _attachPosvHighlight(sheet, data);

  // Refresh: kurze Spin-Animation + Sheet neu rendern (Cache wird nicht hart
  // invalidiert — neuer Build via aktualisiertem Zeitstempel reicht, alle Daten
  // sind durch invalidateCache(['global', …]) nach jedem Match eh schon frisch).
  const refreshBtn = sheet.querySelector('#posvRefreshBtn');
  if(refreshBtn){
    refreshBtn.onclick = (e) => {
      e.stopPropagation();
      refreshBtn.classList.add('spin');
      setTimeout(()=>{
        refreshBtn.classList.remove('spin');
        showPositionHistory(seasonId);
      }, 380);
    };
  }
}


