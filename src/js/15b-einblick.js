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


// Die Seiten-Landkarte [§C44]: jeder Spieler steht nach dem Seitenprofil,
// derselben Rechnung wie im Profil (`positionsLage`). Waagerecht, wo jemand
// meist steht (Anteil der Sätze rechts; Revés links wie auf dem Platz und im
// Umschalter darunter), senkrecht, auf welcher Seite jemand besser spielt:
// die Leistung je Satz rechts gegen links, beide am eigenen Schnitt gemessen
// und mit POS_SCHRUMPF Sätzen zu ihm gezogen.
// Vorher kreuzten sich hier die Werte der Seiten-Rangliste (`positionsListe`).
// Die fragen, wer auf einer Seite der Beste der Liga ist, und das Bild wurde
// eine Diagonale der Gesamtstärke: die Starken oben rechts, die Schwächeren
// unten links „auf beiden unter der Mitte" — über die Seite sagte es nichts,
// und wer weniger gewann, stand immer schlecht da. Jetzt misst jeder gegen
// sich selbst, und ein schwächerer Spieler, der rechts besser spielt als
// links, steht genauso oben wie ein starker.
// Das Band um die Mitte ist `staerker` 'beide' (bis drei Prozentpunkte,
// oder ohne Satz auf einer Seite) — dieselbe Grenze wie die hell gezeichnete
// Rolle im Profil. Die Skala ist symmetrisch, mindestens zehn
// Prozentpunkte: sonst bliese eine Liga, in der alle fast gleich spielen,
// zwei Prozentpunkte über die ganze Höhe auf.
// Keine Mindestzahl: wenige Sätze zieht die Rechnung schon zum Schnitt. Wer
// noch weniger als POS_SCHRUMPF Sätze hat, steht blass, weil der Punkt dann
// mehr vom Ziehen als vom Spielen kommt. Nur wer gar keinen Satz hat, fehlt:
// der Punkt stünde in der Mitte, ohne dass dort etwas gemessen wäre.
// Unter jedem Gesicht steht der Name, wie im Netz daneben [§C27]: nur
// Initialen und die Namen in einer Liste darunter verlangten, Kürzel
// abzugleichen, und zwei mit denselben Initialen waren nicht zu trennen.
// Auseinandergeschoben wird deshalb nach Kästen aus Gesicht und Name, nicht
// nach Kreisen: mit Kreisen lag der Name des einen unter dem Gesicht des
// anderen. Geschoben wird nur innerhalb des eigenen Felds — die Mitte eines
// Gesichts bleibt auf ihrer Seite der Mitte und über, in oder unter dem
// Band, sonst stünde jemand im Bild in einem anderen Feld als in der Liste.
// Das Band ist deshalb mindestens zwei Reihen hoch gezeichnet (`BAND`), auch
// wenn ein einzelner Spieler die Skala weit aufzieht: in ihm stehen meist
// die meisten, und eine Reihe ließ ihnen nur das Nebeneinander.
function _einblickRollen(){
  const MIN = 3;
  const pkt = activePlayers().map(p => ({id:p.id, l:positionsLage(posPerfFrom(p.id, matches))}))
    .filter(x => x.l.aG + x.l.dG > 0)
    .map(x => ({id:x.id, n:x.l.aG + x.l.dG, anteil:x.l.anteil, v:x.l.rA - x.l.rD, st:x.l.staerker}));
  if(pkt.length < MIN) return `<p class="einblick-leer">Die Seiten-Landkarte steht ab ${MIN} Spielern mit Sätzen.</p>`;
  // Gerechnet wird in Einheiten der Zeichnung, ein Pixel je Einheit: so
  // breit ist die Karte ab 360 px Bildschirm (302 px), breiter wird alles
  // nur luftiger. Oben und unten bleibt je ein Streifen für die Namen der
  // Felder frei: ganz am Rand der Skala stand sonst ein Gesicht darauf.
  const W = 300, H = 262, P = 16, R = 13, RAND = 15, NAME_H = 15, BAND = 24, GLEICH = .03;
  const S = Math.max(.10, ...pkt.map(x => Math.abs(x.v)));
  const yo0 = RAND + R + 2, yu0 = H - RAND - R - NAME_H, mitte = (yo0 + yu0) / 2, halb = (yu0 - yo0) / 2;
  const X = a => P + a * (W - 2 * P);
  const Y = v => Math.abs(v) <= GLEICH ? mitte - v / GLEICH * BAND
    : mitte - Math.sign(v) * (BAND + (Math.abs(v) - GLEICH) / (S - GLEICH) * (halb - BAND));
  // Die Breite des Namens aus der Schrift, die ihn zeichnet; ohne Leinwand
  // (Rechentests ohne Browser) geschätzt.
  let ctx = null;
  try { ctx = document.createElement('canvas').getContext('2d'); ctx.font = `600 10px ${getComputedStyle(document.body).fontFamily}`; } catch(e){ ctx = null; }
  const breite = t => Math.ceil((ctx ? ctx.measureText(t).width : t.length * 6.2) * 1.08) + 6;
  // Ein Gesicht hält Abstand zur Kante des Bands: genau auf ihr geschoben
  // stand es im Bild halb im Nachbarfeld.
  const yo = Y(GLEICH), yu = Y(-GLEICH), m = W / 2, KANTE = 5;
  const lage = pkt.map(x => {
    const hw = Math.max(R, breite(pname(x.id)) / 2) + 1;
    const rechts = x.anteil >= .5, f = x.st === 'beide' ? 0 : x.v > 0 ? 1 : -1;
    return {id:x.id, x:X(x.anteil), y:Y(x.v), hw, wenig:x.n < POS_SCHRUMPF,
      x0:rechts ? Math.max(m + .5, hw + 2) : hw + 2, x1:rechts ? W - hw - 2 : Math.min(m - .5, W - hw - 2),
      y0:f > 0 ? yo0 : f < 0 ? yu + KANTE : yo + KANTE, y1:f > 0 ? yo - KANTE : f < 0 ? yu0 : yu - KANTE};
  });
  const halten = p => { p.x = Math.max(p.x0, Math.min(p.x1, p.x)); p.y = Math.max(p.y0, Math.min(p.y1, p.y)); };
  lage.forEach(halten);
  const ueber = (p, q) => ({ox:Math.min(p.x + p.hw, q.x + q.hw) - Math.max(p.x - p.hw, q.x - q.hw) + 2,
    oy:Math.min(p.y + R + NAME_H, q.y + R + NAME_H) - Math.max(p.y - R, q.y - R) + 2});
  for(let n = 0; n < 160; n++){
    let bewegt = false;
    for(let i = 0; i < lage.length; i++) for(let j = i + 1; j < lage.length; j++){
      const p = lage[i], q = lage[j];
      let {ox, oy} = ueber(p, q);
      if(ox <= 0 || oy <= 0) continue;
      bewegt = true;
      // Zuerst die kürzere Richtung; hält das eigene Feld dort dagegen,
      // dann die andere. Auf genau demselben Punkt entscheidet die
      // Reihenfolge, sonst gab es keine Richtung.
      const schieben = (achse, um) => {
        const d = achse === 'x' ? (q.x - p.x || (j - i)) : (q.y - p.y || (j - i)), s = d > 0 ? 1 : -1;
        p[achse] -= s * um / 2; q[achse] += s * um / 2; halten(p); halten(q);
      };
      schieben(oy < ox ? 'y' : 'x', Math.min(ox, oy));
      ({ox, oy} = ueber(p, q));
      if(ox > 0 && oy > 0) schieben(oy < ox ? 'x' : 'y', oy < ox ? ox : oy);
    }
    if(!bewegt) break;
  }
  // Der Name des Bands steht dort, wo kein Gesicht und kein Name ist, am
  // liebsten rechts: fest am rechten Rand lag er unter einem Gesicht. Ist
  // das Band voll, fehlt er im Bild; die Liste darunter nennt das Feld mit
  // demselben Zeichen.
  const BAND_B = 96, ym = Y(0);
  let bandX = null;
  for(let x0 = W - BAND_B - 6; x0 >= 6 && bandX == null; x0 -= 6)
    if(!lage.some(p => p.x + p.hw > x0 && p.x - p.hw < x0 + BAND_B && p.y - R < ym + 7 && p.y + R + NAME_H > ym - 7)) bandX = x0;
  // Besser heißt: die Seite, auf der jemand meist steht, ist die, auf der
  // jemand besser spielt. Bei genau halb und halb zählt rechts.
  const feld = x => x.st === 'beide' ? 'g' : (x.st === 'drive') === (x.anteil >= .5) ? 'b' : 's';
  const NAME = {b:'Auf der besseren Seite', s:'Auf der schwächeren Seite', g:'Auf beiden gleich'};
  const gruppen = {b:[], s:[], g:[]};
  pkt.slice().sort((p, q) => Math.abs(q.v) - Math.abs(p.v)).forEach(x => gruppen[feld(x)].push(x.id));
  const liste = ['b', 's', 'g'].filter(k => gruppen[k].length)
    .map(k => `<div class="rk-g-${k}"><i></i><b>${NAME[k]}</b><span>${esc(_namenListe(gruppen[k].map(pname)))}</span></div>`).join('');
  const blass = lage.some(p => p.wenig)
    ? `<p class="rk-n">Blass steht, wer weniger als ${POS_SCHRUMPF} Sätze hat.</p>` : '';
  const r = 8, f1 = v => v.toFixed(1);
  const pc = v => (v * 100).toFixed(1) + '%';
  return `<div class="rk-ax rk-ax-o"><span>↑ Drive besser</span></div>
    <div class="rk"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path class="rk-q" d="M${m} 0H${W - r}A${r} ${r} 0 0 1 ${W} ${r}V${f1(yo)}H${m}Z"/>
      <path class="rk-q" d="M0 ${f1(yu)}H${m}V${H}H${r}A${r} ${r} 0 0 1 0 ${H - r}Z"/>
      <rect class="rk-b" x="0" y="${f1(yo)}" width="${W}" height="${f1(yu - yo)}"/>
      <line class="rk-m" x1="${m}" x2="${m}" y1="0" y2="${H}"/>
      <line class="rk-m" x1="0" x2="${W}" y1="${f1(ym)}" y2="${f1(ym)}"/>
      <rect class="rk-r" x="0" y="0" width="${W}" height="${H}" rx="${r}"/>
    </svg>
    <span class="rk-f rk-f-ol">${NAME.s}</span><span class="rk-f rk-f-or b">${NAME.b}</span>
    <span class="rk-f rk-f-ul b">${NAME.b}</span><span class="rk-f rk-f-ur">${NAME.s}</span>
    ${bandX == null ? '' : `<span class="rk-f rk-f-g" style="left:${pc(bandX / W)};top:${pc(ym / H)}">${NAME.g}</span>`}
    ${lage.map((p, i) => `<span class="rk-p${p.wenig ? ' wenig' : ''}" data-detail="${esc(p.id)}" style="left:${pc(p.x / W)};top:${pc(p.y / H)};--i:${i}">${rcpAvHtml(p.id, 26, {})}<b>${esc(pname(p.id))}</b></span>`).join('')}</div>
    <div class="rk-ax"><span>← meist Revés</span><span>↓ Revés besser</span><span>meist Drive →</span></div>
    <div class="rk-l">${liste}</div>${blass}`;
}

// Das Netz der Duos: jede Linie ein Duo ab DUO_MIN gemeinsamen Sätzen, so
// dick, wie oft es zusammen gespielt hat; die Farbe sagt, ob es zusammen
// besser oder schlechter spielt, als die Elo der vier erwarten lässt [§C25].
// Gemessen wird wie im Seitenprofil [§C44]: je Satz Sieg und Games gegen die
// Erwartung, je zur Hälfte (`posGameLeistung`), aufsummiert und mit
// POS_SCHRUMPF Sätzen zu null gezogen, damit fünf Sätze wenig sagen.
// Vorher färbte die rohe Siegquote (ab 60 % grün, bis 40 % rot): zwei
// schwächere Spieler standen zusammen immer rot da, auch wenn sie zusammen
// weit besser spielten, als ihre Elo erwarten ließ, und zwei starke immer
// grün. Bis drei Prozentpunkte ist ein Duo „wie erwartet", dieselbe Grenze
// wie `staerker` im Profil.
// Ein Satz zählt hier einmal, gleich wie lang er war, und nicht nach
// `partieGewicht`: die Landkarte daneben misst mit demselben Profil, und
// das wiegt jeden Satz gleich. Zwei Rechnungen für „besser als erwartet"
// färbten ein Duo grün, dessen beide Spieler im Profil auf keiner Seite
// über ihrem Schnitt stehen.
// Nur die achtzehn meistgespielten: alle Duos waren ein Knäuel, in dem keine
// Linie mehr zu verfolgen war.
// Die Reihenfolge auf dem Kreis setzt häufige Partner nebeneinander (gierig,
// ab dem Spieler mit den meisten Sätzen, dann je der mit den meisten
// gemeinsamen Sätzen mit dem zuletzt gesetzten), und die Linien biegen sich
// zur Mitte: in der Reihenfolge der Spielerliste kreuzten sich die Linien
// quer über den Kreis, und gerade Linien zwischen Nachbarn liefen unter den
// Gesichtern entlang. Der Name steht an jedem Gesicht; die Liste „Im
// Uhrzeigersinn ab oben" darunter verlangte, Gesichter abzuzählen.
function _einblickNetz(){
  const ids = activePlayers().map(p => p.id), da = new Set(ids);
  const duo = {}, gesamt = {};
  matches.forEach(m => {
    const p = partie(m);
    if(p.winner !== 'A' && p.winner !== 'B') return;
    const e = m.exp_a != null ? m.exp_a : .5;
    [[m.a1, m.a2, p.winner === 'A', e, p.gamesA, p.gamesB], [m.b1, m.b2, p.winner === 'B', 1 - e, p.gamesB, p.gamesA]]
      .forEach(([x, y, w, exp, gf, ga]) => {
        if(!da.has(x) || !da.has(y)) return;
        const k = paarKey(x, y), d = duo[k] = duo[k] || {g:0, s:0};
        d.g++; d.s += ((w ? 1 : 0) - exp + posGameLeistung(gf, ga, exp)) / 2;
        gesamt[x] = (gesamt[x] || 0) + 1; gesamt[y] = (gesamt[y] || 0) + 1;
      });
  });
  const ks = Object.keys(duo).filter(k => duo[k].g >= DUO_MIN).sort((a, b) => duo[b].g - duo[a].g).slice(0, 18);
  if(ids.length < 2 || !ks.length) return `<p class="einblick-leer">Noch kein Duo mit ${DUO_MIN} gemeinsamen Sätzen.</p>`;
  const gem = (a, b) => (duo[paarKey(a, b)] || {g:0}).g;
  const rest = ids.slice().sort((a, b) => (gesamt[b] || 0) - (gesamt[a] || 0));
  const kreis = [rest.shift()];
  while(rest.length){
    const z = kreis[kreis.length - 1];
    let best = 0;
    rest.forEach((id, i) => { if(gem(z, id) > gem(z, rest[best])) best = i; });
    kreis.push(rest.splice(best, 1)[0]);
  }
  const W = 300, H = 304, R = 112, cx = 150, cy = 152, n = kreis.length, GLEICH = .03;
  const lage = {};
  kreis.forEach((id, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; lage[id] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
  const gmax = Math.max(1, ...ks.map(k => duo[k].g));
  const mitLinie = new Set();
  // Die meistgespielten zuletzt: sie liegen oben und nehmen das Tippen.
  const bahnen = ks.slice().reverse().map((k, i) => {
    const [x, y] = k.split('|'), [x1, y1] = lage[x], [x2, y2] = lage[y];
    mitLinie.add(x); mitLinie.add(y);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${(mx + (cx - mx) * .4).toFixed(1)} ${(my + (cy - my) * .4).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const v = duo[k].s / (duo[k].g + POS_SCHRUMPF), b = Math.abs(v);
    const cls = v > GLEICH ? 'w' : v < -GLEICH ? 'l' : 'm';
    const deck = cls === 'm' ? .4 : .45 + .5 * Math.min(1, (b - GLEICH) / .12);
    return {x, y, d, linie:`<path class="netz-l ${cls}" style="--i:${i};--o:${deck.toFixed(2)}" d="${d}" stroke-width="${(1.5 + duo[k].g / gmax * 6).toFixed(1)}"/>`};
  });
  // Der Name steht unter dem Gesicht, in der oberen Hälfte des Kreises
  // darüber: dort liefen die Linien zur Mitte mitten durch ihn.
  const oben = id => lage[id][1] < cy - R * .5;
  const gesichter = kreis.map((id, i) => `<span class="netz-p${mitLinie.has(id) ? '' : ' still'}${oben(id) ? ' oben' : ''}" data-detail="${esc(id)}" style="left:${(lage[id][0] / W * 100).toFixed(1)}%;top:${(lage[id][1] / H * 100).toFixed(1)}%;--i:${i}">${rcpAvHtml(id, 28, {})}<b>${esc(pname(id))}</b></span>`).join('');
  return `<div class="netz"><svg viewBox="0 0 ${W} ${H}"><g aria-hidden="true">${bahnen.map(b => b.linie).join('')}</g>${
      bahnen.map(b => `<path class="netz-t" d="${b.d}" data-team="${esc(b.x)}|${esc(b.y)}" role="button" aria-label="${esc(pname(b.x))} und ${esc(pname(b.y))}"/>`).join('')}</svg>${gesichter}</div>
    <div class="netz-leg"><span class="w">besser als erwartet</span><span class="m">wie erwartet</span><span class="l">schlechter als erwartet</span><span class="d">Dicke nach gemeinsamen Sätzen</span></div>`;
}
