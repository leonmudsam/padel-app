// ─── §5.9 — Der Einblick: eine Grafik über einer Rangliste [§C27] ────
// Seiten und Teams tragen je eine Grafik, die die Liste darunter nicht
// zeigen kann: die Seiten-Landkarte aus Drive und Revés und das Netz der
// Duos. Im Liga-Reiter gibt es keinen: das Titelrennen der Saison war
// dieselbe Frage wie der Positionsverlauf, der darunter schon als Kachel
// steht — zwei Bauteile für dieselbe Aussage sind eins zu viel [§C27]. Als volle Karte nahm jede davon den
// halben Bildschirm über der Rangliste weg, und die Rangliste ist der Grund,
// warum man den Reiter öffnet. Der Einblick ist deshalb eine schmale Zeile,
// die aufklappt — und gezeichnet wird erst beim Aufklappen: zu ist er eine
// Zeile Markup und kostet keine Rechnung.
//
// Offen bleibt er, bis der Reiter gewechselt wird (`einblickOffen`,
// 01-update.js): ein Neuzeichnen nach einer neuen Partie oder einem anderen
// Zeitraum klappt ihn nicht zu, ein neuer Reiter beginnt geschlossen.
//
// Die Ruheständler stehen in derselben Zeile [§C40]: unter Gesamt, unter den
// Seiten und unter den Teams, zu und am Ende. Sie gehören nicht in die
// Rangliste der aktiven Liga, aber ihre Laufbahn ist nicht weg. Weil ein
// Reiter damit zwei Einblicke tragen kann, merkt `einblickOffen` jeden
// offenen; mit einem einzigen Wert klappte der zweite den ersten im Zustand
// zu, und nach dem nächsten Neuzeichnen stand er geschlossen da.
const EINBLICK = {
  rollen:{titel:'Die Seiten-Landkarte', ic:'sideSwap', inhalt:() => _einblickRollen()},
  netz:{titel:'Das Netz der Duos', ic:'duo', inhalt:() => _einblickNetz()},
  ruhe_liga:{titel:'Karriere beendet', ic:'hourglass', ruhestand:true, inhalt:() => ruhestandTafelHtml()},
  ruhe_pos:{titel:'Karriere beendet', ic:'hourglass', ruhestand:true, inhalt:() => positionenRuheHtml()},
  ruhe_teams:{titel:'Duos mit Karriereende', ic:'hourglass', ruhestand:true, inhalt:() => vTeams(true).ruhe},
  // Die Chronik-Matrix trägt eigene Knöpfe (Monat, Spieler, Zelle), die erst
  // mit ihrem Inhalt entstehen — `nach` verdrahtet sie, wenn er aufgeht.
  ruhe_chronik:{titel:'Karriere beendet', ic:'hourglass', ruhestand:true, inhalt:() => ruhestandChronikHtml(),
    nach:i => { _bindChronikClicks(i); chronikMatrixScrollen(i); }}
};
function _einblickAuf(key){ return einblickOffen.split(' ').includes(key); }
function einblickHtml(key, rechts){
  const e = EINBLICK[key];
  if(!e) return '';
  const auf = _einblickAuf(key);
  let inhalt = '';
  if(auf){ try { inhalt = e.inhalt() || ''; } catch(err){ inhalt = ''; } }
  // `data-ruhestand` ist die eine Erlaubnis, in einer Ansicht der aktiven
  // Liga einen Ruheständler zu zeigen [§C40]; `tests/ruheliga` sucht ihn
  // überall sonst.
  return `<div class="einblick${auf ? ' auf' : ''}" data-einblick="${key}"${e.ruhestand ? ' data-ruhestand' : ''}>
    <button class="einblick-k" type="button" aria-expanded="${auf}">${svgI(e.ic)}<span>${esc(e.titel)}</span>`
    + `${rechts ? `<em>${esc(rechts)}</em>` : ''}<i class="einblick-pf">${svgI('chevron')}</i></button>
    <div class="einblick-i">${inhalt}</div></div>`;
}
// Aufklappen ohne die ganze Ansicht neu zu zeichnen: die Liste darunter
// bleibt stehen, nur der Inhalt des Einblicks entsteht.
function einblickBinden(wurzel){
  (wurzel || document).querySelectorAll('[data-einblick] > .einblick-k').forEach(k => {
    k.onclick = () => {
      const box = k.parentElement, key = box.dataset.einblick;
      const auf = !_einblickAuf(key);
      const offen = einblickOffen.split(' ').filter(k => k && k !== key);
      if(auf) offen.push(key);
      einblickOffen = offen.join(' ');
      const i = box.querySelector('.einblick-i');
      if(auf && !i.innerHTML.trim()){
        try { i.innerHTML = EINBLICK[key].inhalt() || ''; } catch(err){ i.innerHTML = ''; }
        bindDetailLinks(i);
        if(EINBLICK[key].nach) EINBLICK[key].nach(i);
      }
      box.classList.toggle('auf', auf);
      k.setAttribute('aria-expanded', String(auf));
    };
  });
}
function bindDetailLinks(el){
  el.querySelectorAll('[data-detail]').forEach(x => {
    x.onclick = () => sheetNav(() => showPlayer(x.dataset.detail));
  });
  // Die Duos eines Einblicks entstehen erst beim Aufklappen und waren damit
  // nach dem Binden der Ansicht gar nicht mehr erreichbar.
  el.querySelectorAll('[data-team]').forEach(x => {
    x.onclick = () => { const [a, b] = x.dataset.team.split('|'); if(a && b) showTeam(a, b); };
  });
}

// Die Seiten-Landkarte: jeder Spieler steht dort, wo sich sein Wert rechts
// (Drive) und links (Revés) kreuzen — derselbe Wert wie in der Liste darunter
// (`positionsListe`). Die Achsen laufen vom schwächsten zum stärksten Wert
// der Liga, die Linien teilen am Median. Zwei Gesichter, die auf denselben
// Punkt fielen, werden auseinandergeschoben: übereinander war eines davon
// nicht mehr zu sehen. Die Namen stehen darunter nach Feldern, weil
// Initialen allein nicht reichen (Leo und Leon).
function _einblickRollen(){
  const atk = {}, def = {};
  positionsListe('drive').forEach(x => { atk[x.p.id] = x.score; });
  positionsListe('reves').forEach(x => { def[x.p.id] = x.score; });
  const pkt = Object.keys(atk).filter(id => def[id] != null).map(id => ({id, a:atk[id], d:def[id]}));
  if(pkt.length < 3) return '';
  const W = 300, H = 230, R = 13;
  const span = (arr) => { const lo = Math.min(...arr), hi = Math.max(...arr); return {lo, hi, d:(hi - lo) || 1}; };
  const sa = span(pkt.map(x => x.a)), sd = span(pkt.map(x => x.d));
  const med = arr => { const s = arr.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
  const ma = med(pkt.map(x => x.a)), md = med(pkt.map(x => x.d));
  const X = v => 30 + (v - sa.lo) / sa.d * (W - 50), Y = v => H - 28 - (v - sd.lo) / sd.d * (H - 50);
  const lage = pkt.map(x => ({id:x.id, x:X(x.a), y:Y(x.d)}));
  for(let n = 0; n < 40; n++){
    for(let i = 0; i < lage.length; i++) for(let j = i + 1; j < lage.length; j++){
      const p = lage[i], q = lage[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || .01;
      if(d < 2 * R + 2){
        const k = (2 * R + 2 - d) / 2, ux = dx / d, uy = dy / d;
        p.x -= ux * k; p.y -= uy * k; q.x += ux * k; q.y += uy * k;
      }
    }
    lage.forEach(p => { p.x = Math.max(R + 2, Math.min(W - R - 2, p.x)); p.y = Math.max(R + 2, Math.min(H - R - 2, p.y)); });
  }
  const feld = (x) => (x.a >= ma ? 'v' : '') + (x.d >= md ? 'h' : '');
  const gruppen = {vh:[], v:[], h:[], '':[]};
  pkt.slice().sort((p, q) => (q.a + q.d) - (p.a + p.d)).forEach(x => gruppen[feld(x)].push(x.id));
  const NAME = {vh:'Auf beiden Seiten stark', v:'Stärker rechts (Drive)', h:'Stärker links (Revés)', '':'Auf beiden unter der Mitte'};
  const liste = ['vh', 'v', 'h', ''].filter(k => gruppen[k].length)
    .map(k => `<span><i class="f-${k || 'n'}"></i><b>${esc(NAME[k])}:</b> ${esc(_namenListe(gruppen[k].map(pname)))}</span>`).join('');
  return `<div class="rk"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <rect class="rk-q" x="${X(ma)}" y="0" width="${W - X(ma)}" height="${Y(md)}"/>
      <line class="rk-m" x1="${X(ma)}" x2="${X(ma)}" y1="0" y2="${H - 20}"/>
      <line class="rk-m" x1="20" x2="${W}" y1="${Y(md)}" y2="${Y(md)}"/>
      <line class="rk-a" x1="20" x2="${W}" y1="${H - 20}" y2="${H - 20}"/>
      <line class="rk-a" x1="20" x2="20" y1="0" y2="${H - 20}"/>
    </svg>${lage.map((p, i) => `<span class="rk-p" data-detail="${esc(p.id)}" style="left:${(p.x / W * 100).toFixed(1)}%;top:${(p.y / H * 100).toFixed(1)}%;--i:${i}">${rcpAvHtml(p.id, 26, {})}</span>`).join('')}</div>
    <div class="rk-ax"><span>↑ Revés</span><span>Drive →</span></div>
    <div class="rk-l">${liste}</div>`;
}

// Das Netz der Duos: jede Linie ein Duo ab DUO_MIN Partien, so dick, wie es
// oft gespielt hat, grün, wo es mehr gewinnt, rot, wo es mehr verliert
// [§C25]. Nur die achtzehn meistgespielten: alle Duos waren ein Knäuel, in
// dem keine Linie mehr zu verfolgen war. Dieselbe Schwelle wie die Liste
// darunter.
function _einblickNetz(){
  const ids = activePlayers().map(p => p.id);
  const n = ids.length;
  if(n < 3) return '';
  const W = 300, H = 280, R = 112, cx = 150, cy = 140;
  const lage = {};
  ids.forEach((id, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; lage[id] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
  const duo = {};
  matches.forEach(m => [[m.a1, m.a2, m.winner === 'A'], [m.b1, m.b2, m.winner === 'B']].forEach(([x, y, w]) => {
    if(!lage[x] || !lage[y]) return;
    const k = paarKey(x, y);
    duo[k] = duo[k] || {g:0, w:0}; duo[k].g++; if(w) duo[k].w++;
  }));
  const ks = Object.keys(duo).filter(k => duo[k].g >= DUO_MIN).sort((a, b) => duo[b].g - duo[a].g).slice(0, 18).reverse();
  if(!ks.length) return '';
  const gmax = Math.max(1, ...ks.map(k => duo[k].g));
  const linien = ks.map((k, i) => {
    const [x, y] = k.split('|'), q = duo[k].w / duo[k].g;
    const cls = q >= .6 ? 'w' : q <= .4 ? 'l' : 'm';
    return `<line class="netz-l ${cls}" style="--i:${i}" x1="${lage[x][0].toFixed(1)}" y1="${lage[x][1].toFixed(1)}" x2="${lage[y][0].toFixed(1)}" y2="${lage[y][1].toFixed(1)}" stroke-width="${(1 + duo[k].g / gmax * 7).toFixed(1)}"/>`;
  }).join('');
  const gesichter = ids.map(id => `<span class="netz-p" data-detail="${esc(id)}" style="left:${(lage[id][0] / W * 100).toFixed(1)}%;top:${(lage[id][1] / H * 100).toFixed(1)}%">${rcpAvHtml(id, 30, {})}</span>`).join('');
  // Die Namen im Uhrzeigersinn, oben beginnend: so sind die Gesichter zuzuordnen.
  return `<div class="netz"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${linien}</svg>${gesichter}</div>
    <div class="rk-l"><span>Im Uhrzeigersinn ab oben: ${esc(_namenListe(ids.map(pname)))}.</span></div>
    <div class="netz-leg"><span class="w">gewinnt öfter</span><span class="m">ausgeglichen</span><span class="l">verliert öfter</span><span class="d">Dicke: Zahl der Sätze</span></div>`;
}
