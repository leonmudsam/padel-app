// ─── Die Zeichen der Insignium-Leiter [§C30] ───────────────────────────
// Sieben Stufen, je drei Grade: 21 Zeichnungen als Vektor, nachgezeichnet
// nach der Vorlage (mockup/insignium-vorlage.webp, je Stufe die erste,
// dritte und fünfte Spalte, beim Reif die erste, zweite und vierte). Vorher
// waren es Bilder, aus der Vorlage ausgeschnitten: bei 320 Pixeln
// verwaschen, mit Resten des Vorlagengrunds an den Rändern, und in jeder
// Größe über 60 px weich. Eine Zeichnung ist in jeder Größe scharf und trägt
// die Rangfarbe als Farbe statt als Filter über einem Bild.
//
// Die Zeichenfläche misst 1000 × 1000 mit der Reifmitte bei (500, 500). Der
// Reif liegt bei jeder Stufe gleich: innen bei 220 (22 % der Kante — dort
// beginnt das Gesicht), außen bei 266. `_insStufe` stellt die Fläche so um
// die Mitte, dass der Innenrand auf dem Innenrand des Bands liegt.
//
// Licht fällt überall von oben links. Jedes Teil hat deshalb eine helle und
// eine dunkle Seite, eine Kante im Ton seines Werkstoffs und einen Glanz;
// wo eine Zierde hinter dem Reif verschwindet, liegt sein Schatten auf ihr.
// Flach gefüllte Formen sahen neben der gemalten Vorlage aus wie Scherenschnitt.
const IZ_RI = 220, IZ_RA = 266, IZ_RM = (IZ_RI + IZ_RA) / 2;
// Die Mitte des Steins am Fuß — muss INS_RAUTE_Y treffen (28 % der Kante).
const IZ_RAUTE = 780;

const _izN = x => Math.round(x * 10) / 10;
const _izPt = p => _izN(p[0]) + ' ' + _izN(p[1]);
// Ein Punkt auf dem Kreis um die Reifmitte, der Winkel von zwölf Uhr aus im
// Uhrzeigersinn — die linke Hälfte hat negative Winkel.
function _izPol(r, grad){
  const a = grad * Math.PI / 180;
  return [500 + r * Math.sin(a), 500 - r * Math.cos(a)];
}
// Ein Bogen auf dem Kreis um die Reifmitte, im Uhrzeigersinn von a0 nach a1.
function _izBogen(r, a0, a1){
  return `M${_izPt(_izPol(r, a0))}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${_izPt(_izPol(r, a1))}`;
}
// Ein Linienzug als glatte Kurve: jeder Punkt wird Kontrollpunkt, gezogen
// wird durch die Mitten. Ecken bleiben nur an Anfang und Ende.
function _izGlatt(p, zu){
  if(p.length < 3) return 'M' + p.map(_izPt).join('L') + (zu ? 'Z' : '');
  let d = 'M' + _izPt(p[0]);
  for(let i = 1; i < p.length - 1; i++)
    d += 'Q' + _izPt(p[i]) + ' ' + _izPt([(p[i][0] + p[i+1][0]) / 2, (p[i][1] + p[i+1][1]) / 2]);
  return d + 'L' + _izPt(p[p.length - 1]) + (zu ? 'Z' : '');
}
// Eine Bahn als Punktliste aus einer Funktion t → [x, y].
function _izBahn(f, n){
  const p = [];
  for(let i = 0; i <= n; i++) p.push(f(i / n));
  return p;
}
// Die beiden Ränder eines Bands, das einer Bahn folgt und die Breite w(t)
// hat (halbe Breite, je Seite). Aus ihnen sind Sicheln, Klingen, Blätter
// und Ranken gebaut — dieselbe Form in anderer Bahn.
function _izRaender(p, w){
  const n = p.length - 1, L = [], R = [];
  for(let i = 0; i <= n; i++){
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const h = w(i / n);
    L.push([p[i][0] - dy * h, p[i][1] + dx * h]);
    R.push([p[i][0] + dy * h, p[i][1] - dx * h]);
  }
  return {L, R};
}
function _izBand(p, w){
  const {L, R} = _izRaender(p, w);
  return _izGlatt(L.concat(R.reverse()), true);
}
// Die eine Hälfte eines Bands, von der Mittellinie bis zu einem Rand — das
// Licht eines Blatts liegt auf einer Seite der Rippe.
function _izHalb(p, w, seite){
  const {L, R} = _izRaender(p, w);
  return _izGlatt((seite < 0 ? L : R).concat(p.slice().reverse()), true);
}
// Eine Linie neben der Mittellinie, auf der Seite des Lichts: der Grat, auf
// dem der Glanz einer Klinge oder Ranke liegt.
function _izGrat(p, w, seite, von, bis){
  const {L, R} = _izRaender(p, w);
  const q = seite < 0 ? L : R, n = q.length - 1;
  return _izGlatt(q.slice(Math.round(von * n), Math.round(bis * n) + 1));
}
// Eine Ranke: die Krümmung nimmt nach außen zu, am Ansatz fast gerade, am
// Ende eine enge Schnecke. Richtung 0 zeigt nach rechts, 90 nach unten;
// ein positives `dreh` rollt im Uhrzeigersinn ein.
function _izSpirale(x, y, richtung, L, dreh, e){
  const n = 48, ds = L / n, gew = [];
  let sum = 0, th = richtung * Math.PI / 180;
  for(let i = 0; i < n; i++){ const v = .12 + Math.pow(i / n, e || 2.2); gew.push(v); sum += v; }
  const p = [[x, y]];
  for(let i = 0; i < n; i++){
    th += dreh * Math.PI / 180 * gew[i] / sum;
    x += Math.cos(th) * ds; y += Math.sin(th) * ds;
    p.push([x, y]);
  }
  return p;
}
// Spiegeln an der senkrechten Achse: die Zeichen sind spiegelgleich, jede
// Zierde wird einmal links gebaut.
function _izSpiegel(d){
  return d.replace(/([MLQCZA])([^MLQCZA]*)/g, (m, c, z) => {
    if(c === 'Z') return 'Z';
    const zahlen = z.trim().split(/[\s,]+/).map(Number);
    if(c === 'A'){
      // rx ry Drehung groß Richtung x y: die Richtung dreht sich um.
      zahlen[4] = 1 - zahlen[4]; zahlen[5] = _izN(1000 - zahlen[5]);
      return c + zahlen.join(' ');
    }
    for(let i = 0; i < zahlen.length; i += 2) zahlen[i] = _izN(1000 - zahlen[i]);
    return c + zahlen.join(' ');
  });
}
// Ein Teil zweimal, links und rechts, als zwei Elemente: ein Verlauf, der
// an der Box des Teils hängt, liefe über EIN Element über beide Seiten, und
// jede Seite wäre darin ein flacher Streifen.
function _izJe(d, bau){ return bau(d) + bau(_izSpiegel(d)); }
// Ein Kreis aus zwei absoluten Bögen: relative Bögen überstünden das
// Spiegeln nicht — der Knopf einer gespiegelten Ranke saß um seinen
// Durchmesser verschoben neben ihr.
function _izKreis(cx, cy, r){
  const R = _izN(r);
  return `M${_izN(cx - r)} ${_izN(cy)}A${R} ${R} 0 1 0 ${_izN(cx + r)} ${_izN(cy)}A${R} ${R} 0 1 0 ${_izN(cx - r)} ${_izN(cy)}Z`;
}
function _izRing(r1, r2){ return _izKreis(500, 500, r2) + _izKreis(500, 500, r1); }
function _izRaute(cx, cy, rx, ry){
  return `M${_izN(cx)} ${_izN(cy - ry)}L${_izN(cx + rx)} ${_izN(cy)}L${_izN(cx)} ${_izN(cy + ry)}L${_izN(cx - rx)} ${_izN(cy)}Z`;
}
// Ein Funkeln: ein vierstrahliger Stern aus Licht auf Stein und Kristall.
function _izFunkeln(x, y, r, op){
  const q = r * .16;
  return `<path d="M${_izN(x)} ${_izN(y - r)}Q${_izN(x + q)} ${_izN(y - q)} ${_izN(x + r)} ${_izN(y)}`
    + `Q${_izN(x + q)} ${_izN(y + q)} ${_izN(x)} ${_izN(y + r)}Q${_izN(x - q)} ${_izN(y + q)} ${_izN(x - r)} ${_izN(y)}`
    + `Q${_izN(x - q)} ${_izN(y - q)} ${_izN(x)} ${_izN(y - r)}Z" fill="#fff" opacity="${op || .9}"/>`;
}

// ── Werkstoffe ─────────────────────────────────────────────────────────
// Silber mit einem Stich Flieder wie in der Vorlage, Rotgold, dazwischen
// Champagner. Fünf Töne je Werkstoff: Glanz, Licht, Mitte, Tiefe, Kante.
const IZ_METALL = {
  silber:  ['#ffffff', '#e4e1ec', '#a9a3b7', '#5d5869', '#211d29'],
  flieder: ['#f1ecfa', '#c6bed8', '#8b829e', '#474053', '#1b1723'],
  rose:    ['#fff8f4', '#ead8d4', '#b69c9d', '#624e52', '#261b1e'],
  champ:   ['#fff4e3', '#edcea8', '#bb8f66', '#6a482d', '#28190d'],
  rotgold: ['#fff1de', '#f3c99c', '#c98c5c', '#733f22', '#2b170a'],
  // Heller und kühler als Silber: das Metall der oberen Stufen. Rotgold und
  // Champagner liefen dort nebeneinander, und neben Silber lasen sie sich
  // als Bronze — Zier- und Lorbeerkranz sahen weniger wert aus als der Reif.
  platin:  ['#ffffff', '#f2f4f9', '#c3c9d6', '#6c7486', '#1f2430'],
  gold:    ['#fff8dc', '#f6dc8e', '#cfa140', '#785212', '#2c1d03'],
};

// Die Rangfarbe als Satz aus fünf Tönen: dieselbe Farbe in Glanz, Licht,
// Mitte, Tiefe und Kante. Gemalt war die Vorlage in Violett; jeder Rang
// trägt an derselben Stelle seine eigene Farbe [§C30].
function _izHsl(hex){
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let H = 0, S = 0;
  if(mx !== mn){
    const d = mx - mn;
    S = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    H *= 60;
  }
  return [H, S];
}
function _izHex(H, S, L){
  const k = n => (n + H / 30) % 12, a = S * Math.min(L, 1 - L);
  const f = n => L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
// Gedämpft: in voller Sättigung standen Lilie, Steine, Beeren und Band als
// violette Flecken auf dem Metall und liefen dem Schmuck den Rang ab. Die
// Rangfarbe ist ein Schimmer und ein Akzent, nicht die Farbe des Zeichens.
function _izStein(farbe){
  const [H, S] = _izHsl(farbe || '#a78bfa');
  const s = Math.min(1, S) * .62;
  return [_izHex(H, s * .9, .9), _izHex(H, s, .7), _izHex(H, s * .85, .52),
          _izHex(H, s * .8, .28), _izHex(H, s * .7, .13)];
}

// Die Verläufe einer Zeichnung. Jede Zeichnung ist ein eigenes Dokument
// (ein Bild), also stören sich die Namen zweier Zeichnungen nicht.
function _izDefs(metalle, st){
  const stop = (o, c, op) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`;
  const lin = (id, a, b, stops, user) => `<linearGradient id="${id}"`
    + (user ? ` gradientUnits="userSpaceOnUse"` : '') + ` x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}">`
    + stops + '</linearGradient>';
  let s = '<defs>';
  metalle.forEach(m => {
    const [g, l, mi, t] = IZ_METALL[m];
    // Das Band: Licht oben links, ein zweiter Reflex unten links, Tiefe
    // unten rechts — wie gegossenes Metall unter einer Lampe.
    s += lin('b' + m, [300, 220], [700, 800],
      stop(0, g) + stop(.16, l) + stop(.38, mi) + stop(.55, l) + stop(.7, g) + stop(.84, mi) + stop(1, t), 1);
    // Die Fase außen: stärker als das Band, sie steht dem Licht zugewandt.
    s += lin('f' + m, [320, 240], [680, 760], stop(0, g) + stop(.35, l) + stop(.7, mi) + stop(1, t), 1);
    // Die Fase innen schaut vom Licht weg: oben dunkel, unten hell.
    s += lin('i' + m, [320, 240], [680, 760], stop(0, t) + stop(.4, mi) + stop(.75, l) + stop(1, g), 1);
    // Eine Zierde: von oben nach unten, damit sie gespiegelt dasselbe Licht hat.
    s += lin('o' + m, [0, 0], [.25, 1], stop(0, g) + stop(.28, l) + stop(.68, mi) + stop(1, t));
    // Die Schattenseite eines Blatts oder einer Klinge.
    s += lin('d' + m, [0, 0], [.25, 1], stop(0, mi) + stop(.55, t) + stop(1, t));
    // Die Lichtseite eines Blatts.
    s += lin('h' + m, [0, 0], [.3, 1], stop(0, g) + stop(.55, l) + stop(1, mi));
    // Ein Niet: ein Knopf mit Licht oben links.
    s += `<radialGradient id="n${m}" cx=".5" cy=".5" r=".6" fx=".32" fy=".28">`
      + stop(0, g) + stop(.3, l) + stop(.72, mi) + stop(1, t) + '</radialGradient>';
  });
  // Der Stein in der Rangfarbe: Schmelz für Lilie und Keile, ein tiefer
  // Kern für die geschliffenen Steine, ein Schein für ihr Leuchten.
  s += lin('sg', [0, 0], [.3, 1], stop(0, st[0]) + stop(.3, st[1]) + stop(.72, st[2]) + stop(1, st[3]));
  s += lin('sl', [0, 0], [0, 1], stop(0, st[1], 0) + stop(.5, st[1], .6) + stop(1, st[2]));
  s += lin('sd', [0, 0], [.3, 1], stop(0, st[2]) + stop(1, st[4]));
  s += `<radialGradient id="sk" cx=".5" cy=".45" r=".62">`
    + stop(0, st[1]) + stop(.45, st[2]) + stop(.8, st[3]) + stop(1, st[4]) + '</radialGradient>';
  // Der Schein um den Reif: erst außerhalb des Bands, das Loch bleibt frei
  // für das Gesicht.
  s += `<radialGradient id="sr" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="430">`
    + stop(0, st[1], 0) + stop(.6, st[1], 0) + stop(.66, st[1], .26) + stop(.8, st[1], .08) + stop(1, st[1], 0) + '</radialGradient>';
  s += `<radialGradient id="ss">` + stop(0, st[1], .45) + stop(.45, st[1], .14) + stop(1, st[1], 0) + '</radialGradient>';
  // Der Glanz auf dem Band: ein Streifen Licht oben, ein schwacher unten.
  s += lin('gl', [0, 500 - IZ_RA], [0, 500 + IZ_RA],
    stop(0, '#fff', .85) + stop(.3, '#fff', .12) + stop(.62, '#fff', 0) + stop(1, '#fff', .35), 1);
  // Ein weicher Schatten unter dem Ganzen hebt es vom Grund ab; der Reif
  // wirft einen eigenen auf das, was hinter ihm liegt.
  // Kein Filter in der Zeichnung. Safari rechnet ein gefiltertes Element in
  // CSS-Pixeln statt in Gerätepixeln, und die Zeichnung steht in jedem
  // Wappen einmal: auf dem Telefon waren die Insignien treppig wie
  // ausgeschnitten. Die Schatten sind deshalb weiche Radialverläufe — ein
  // Ring um das Band, einmal als Schlagschatten nach unten versetzt und
  // einmal als Schatten des Reifs auf dem Schmuck dahinter.
  const ring = (id, cy, r, innen, voll, bis, op) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="500" cy="${cy}" r="${r}">`
    + stop(0, '#000', 0) + stop(innen / r, '#000', 0) + stop(voll / r, '#000', op) + stop(bis / r, '#000', op * .75)
    + stop(1, '#000', 0) + '</radialGradient>';
  s += ring('ssh', 508, IZ_RA + 44, IZ_RI - 4, IZ_RM, IZ_RA + 6, .5);
  s += ring('sao', 506, IZ_RA + 30, IZ_RI - 10, IZ_RI + 6, IZ_RA + 4, .55);
  return s + '</defs>';
}

// ── Die Teile ──────────────────────────────────────────────────────────
// Eine Form mit Füllung und Kante im Ton ihres Werkstoffs.
function _izForm(d, fill, m, breit){
  return `<path d="${d}" fill="${fill}" stroke="${IZ_METALL[m][4]}" stroke-width="${breit || 2.4}"`
    + ` stroke-linejoin="round" stroke-opacity=".8"/>`;
}
// Ein Lichtstreif: weich, weiß, mit runden Enden.
// Zwei Striche statt eines Weichzeichners: ein breiter, leiser Hof und ein
// schmaler Kern. Mit Filter wurde jeder Lichtstreif auf dem Telefon in
// CSS-Pixeln gerechnet [§C30].
function _izLicht(d, breit, op){
  return `<path d="${d}" fill="none" stroke="#fff" stroke-width="${_izN(breit * 2.2)}" stroke-linecap="round"`
    + ` stroke-linejoin="round" stroke-opacity="${_izN(op * .22 * 100) / 100}"/>`
    + `<path d="${d}" fill="none" stroke="#fff" stroke-width="${_izN(breit * .8)}" stroke-linecap="round"`
    + ` stroke-linejoin="round" stroke-opacity="${_izN(op * .75 * 100) / 100}"/>`;
}
// Nieten: ein Knopf mit Schatten darunter und einem Lichtpunkt darauf.
function _izNieten(r, n, m, gr, frei){
  let d = '', sch = '', gl = '';
  for(let i = 0; i < n; i++){
    const w = i * 360 / n + (180 / n);
    const a = ((w + 180) % 360) - 180;
    if((frei || []).some(([v, b]) => a > v && a < b)) continue;
    const [x, y] = _izPol(r, a);
    d += _izKreis(x, y, gr);
    sch += _izKreis(x + gr * .25, y + gr * .4, gr * 1.1);
    gl += _izKreis(x - gr * .35, y - gr * .38, gr * .3);
  }
  if(!d) return '';
  return `<path d="${sch}" fill="#000" opacity=".45"/>`
    + `<path d="${d}" fill="url(#n${m})" stroke="${IZ_METALL[m][4]}" stroke-width="1.1" stroke-opacity=".8"/>`
    + `<path d="${gl}" fill="#fff" opacity=".8"/>`;
}

// Der Reif. `glatt` ist ein gegossenes Band mit einer Fase außen und innen,
// `rand` zwei Wülste mit einer Kehle dazwischen, in der die Nieten sitzen.
function _izReif(o){
  const m = o.metall, k = IZ_METALL[m][4];
  let s = `<path d="${_izRing(IZ_RI, IZ_RA)}" fill="url(#b${m})" fill-rule="evenodd"/>`;
  if(o.profil === 'rand'){
    const rw = o.wulst || 10, kanal = o.kanal || 'flieder';
    // Die Wülste sind gewölbt: außen und innen je eine Fase zum Licht.
    s += `<path d="${_izRing(IZ_RA - rw, IZ_RA)}" fill="url(#f${m})" fill-rule="evenodd"/>`;
    s += `<path d="${_izRing(IZ_RI, IZ_RI + rw)}" fill="url(#f${m})" fill-rule="evenodd"/>`;
    s += `<path d="${_izRing(IZ_RI + rw, IZ_RA - rw)}" fill="url(#b${kanal})" fill-rule="evenodd"/>`;
    // Die Kehle liegt tiefer: oben fällt Schatten hinein, unten Licht.
    s += `<path d="${_izRing(IZ_RI + rw, IZ_RA - rw)}" fill="url(#i${kanal})" fill-rule="evenodd" opacity=".35"/>`;
    s += `<circle cx="500" cy="500" r="${IZ_RI + rw + 1}" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="2.4"/>`;
    s += `<circle cx="500" cy="500" r="${IZ_RA - rw - 1}" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="2.4"/>`;
    s += `<circle cx="500" cy="500" r="${IZ_RA - rw * .45}" fill="none" stroke="url(#gl)" stroke-width="2.6"/>`;
    s += `<circle cx="500" cy="500" r="${IZ_RI + rw * .45}" fill="none" stroke="url(#gl)" stroke-width="2.4" opacity=".8"/>`;
    s += _izLicht(_izBogen(IZ_RA - rw * .5, -64, -22), 3.2, .9);
  } else {
    // Die Fasen: außen zum Licht, innen davon weg — so wölbt sich das Band.
    s += `<path d="${_izRing(IZ_RA - 11, IZ_RA)}" fill="url(#f${m})" fill-rule="evenodd" opacity=".85"/>`;
    s += `<path d="${_izRing(IZ_RI, IZ_RI + 9)}" fill="url(#i${m})" fill-rule="evenodd" opacity=".8"/>`;
    s += `<circle cx="500" cy="500" r="${IZ_RM + 4}" fill="none" stroke="url(#gl)" stroke-width="7" opacity=".6"/>`;
    s += _izLicht(_izBogen(IZ_RM + 5, -70, -16), 7, .85);
    s += _izLicht(_izBogen(IZ_RM, -158, -128), 4, .45);
    s += _izLicht(_izBogen(IZ_RI + 4, 110, 160), 2.5, .5);
  }
  s += `<circle cx="500" cy="500" r="${IZ_RA - .8}" fill="none" stroke="${k}" stroke-opacity=".85" stroke-width="2.4"/>`;
  s += `<circle cx="500" cy="500" r="${IZ_RI + .8}" fill="none" stroke="${k}" stroke-opacity=".85" stroke-width="2.4"/>`;
  if(o.nieten) s += _izNieten(o.nieten.r || IZ_RM, o.nieten.n, o.nieten.m || m, o.nieten.gr || 6,
    o.nieten.frei || [[-16, 16], [155, 180], [-180, -155]]);
  // Zwischen den Nieten kleine Steine in der Rangfarbe.
  if(o.steine){
    let d = '', gl = '';
    for(let i = 0; i < o.steine; i++){
      const a = -180 + i * 360 / o.steine;
      if(Math.abs(a) < 16 || Math.abs(a) > 160) continue;
      const [x, y] = _izPol(IZ_RM, a);
      d += _izRaute(x, y, 5.5, 7); gl += _izKreis(x - 1.4, y - 2.4, 1.5);
    }
    s += `<path d="${d}" fill="url(#sk)" stroke="#000" stroke-opacity=".6" stroke-width="1.2"/><path d="${gl}" fill="#fff" opacity=".8"/>`;
  }
  return s;
}
// Der Schatten des Reifs auf dem, was hinter ihm liegt: ohne ihn liefen
// Laub und Ranken flach in das Band hinein.
function _izReifSchatten(){
  return `<circle cx="500" cy="506" r="${IZ_RA + 30}" fill="url(#sao)"/>`;
}

// Die Lilie auf zwölf Uhr, in der Rangfarbe: ein Mittelblatt, zwei
// Seitenblätter, die sich weit nach außen schwingen und nach unten
// einrollen, ein Bund aus Metall und ein Fuß, der im Band steckt. Jedes
// Blatt hat eine Licht- und eine Schattenseite. Gezeichnet in Einheiten der
// Lilie: x in halben Breiten, y in Höhen über dem Bund. Schmal gezeichnet
// war sie ein Pfeiler mit einem Ring darum und keine Lilie.
function _izLilie(y, st, m){
  const w = 70, h = 118;
  const P = (x, yy) => _izN(500 + x * w) + ' ' + _izN(y - yy * h);
  const kante = `stroke="${IZ_METALL[m][4]}" stroke-opacity=".8" stroke-width="2" stroke-linejoin="round"`;
  const mitteL = `M${P(0, 1)}C${P(-.3, .74)} ${P(-.34, .36)} ${P(-.2, .06)}L${P(0, .06)}Z`;
  const mitteR = `M${P(0, 1)}C${P(.3, .74)} ${P(.34, .36)} ${P(.2, .06)}L${P(0, .06)}Z`;
  // Ein Seitenblatt: vom Fuß nach oben und außen, in weitem Bogen zurück
  // nach unten, dort eine eingerollte Spitze.
  const seite = sp => `M${P(sp * .16, .1)}C${P(sp * .3, .48)} ${P(sp * .64, .7)} ${P(sp * .9, .58)}`
    + `C${P(sp * 1.1, .47)} ${P(sp * 1.1, .16)} ${P(sp * .9, .02)}`
    + `C${P(sp * .8, -.06)} ${P(sp * .66, -.02)} ${P(sp * .7, .08)}`
    + `C${P(sp * .74, .18)} ${P(sp * .84, .16)} ${P(sp * .82, .1)}`
    + `C${P(sp * .66, .3)} ${P(sp * .4, .3)} ${P(sp * .2, .06)}Z`;
  const fuss = `M${P(-.24, -.14)}C${P(-.3, -.42)} ${P(-.14, -.62)} ${P(0, -.72)}`
    + `C${P(.14, -.62)} ${P(.3, -.42)} ${P(.24, -.14)}Z`;
  const bund = `M${P(-.5, .1)}C${P(-.2, .16)} ${P(.2, .16)} ${P(.5, .1)}L${P(.48, -.16)}C${P(.2, -.1)} ${P(-.2, -.1)} ${P(-.48, -.16)}Z`;
  // Die Blätter sind Metall; die Rangfarbe liegt als Schimmer darauf und
  // sitzt voll nur im Stein am Bund [§C30].
  const hell = `url(#o${m})`, dunkel = `url(#d${m})`, tint = `fill="url(#sl)" opacity=".28"`;
  return `<circle cx="500" cy="${_izN(y - h * .42)}" r="${_izN(h * .8)}" fill="url(#ss)" opacity=".4"/>`
    + `<path d="${fuss}" fill="${dunkel}" ${kante}/>`
    + `<path d="${seite(-1)}" fill="${hell}" ${kante}/><path d="${seite(-1)}" ${tint}/>`
    + `<path d="${seite(1)}" fill="${dunkel}" ${kante}/><path d="${seite(1)}" ${tint}/>`
    + `<path d="M${P(-.3, .38)}C${P(-.56, .6)} ${P(-.88, .56)} ${P(-.96, .3)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M${P(.34, .4)}C${P(.58, .58)} ${P(.86, .54)} ${P(.94, .34)}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>`
    + `<path d="${mitteL}" fill="${hell}" ${kante}/><path d="${mitteL}" ${tint}/>`
    + `<path d="${mitteR}" fill="${dunkel}" ${kante}/><path d="${mitteR}" ${tint}/>`
    + `<path d="M${P(-.05, .9)}C${P(-.2, .66)} ${P(-.22, .36)} ${P(-.13, .1)}" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="3.2" stroke-linecap="round"/>`
    + _izForm(bund, `url(#o${m})`, m, 2)
    + `<path d="M${P(-.44, .07)}C${P(-.2, .12)} ${P(.2, .12)} ${P(.44, .07)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round"/>`
    + `<path fill="url(#sk)" stroke="${st[4]}" stroke-width="1.2" d="${_izRaute(500, y + .02 * h, 9, 11)}"/>`
    + `<path fill="url(#sk)" stroke="${st[4]}" stroke-width="1.2" d="${_izRaute(500, y - .5 * h, 8, 11)}"/>`
    + _izFunkeln(500 - w * .08, y - h * .8, 13, .85);
}

// Die Raute am Fuß: ein Stein im Sternschliff in einer Fassung aus Rotgold.
// Die Fassung ist eine Fase auf vier Seiten, jede im eigenen Licht; der
// Stein trägt eine Tafel in der Mitte und acht Facetten darum.
function _izRauteStein(m){
  // Kleiner als der Reif breit ist: mit 86 Einheiten stand der Stein
  // größer da als die Ziffer der Platzierung, die auf ihm liegt, und zog
  // den Blick vom Gesicht weg nach unten.
  const cy = IZ_RAUTE, A = 64, I = 52, T = 22;
  const [g, l, mi, t, k] = IZ_METALL[m];
  const au = [[500, cy - A], [500 + A, cy], [500, cy + A], [500 - A, cy]];
  const in_ = [[500, cy - I], [500 + I, cy], [500, cy + I], [500 - I, cy]];
  // Der Schein um den Stein, in seiner Farbe.
  let s = `<circle cx="500" cy="${cy}" r="90" fill="url(#ss)" opacity=".3"/>`;
  // Die Fassung: oben rechts, unten rechts, unten links, oben links.
  const tonF = [l, t, mi, g];
  for(let i = 0; i < 4; i++){
    const j = (i + 1) % 4;
    s += `<path d="M${_izPt(au[i])}L${_izPt(au[j])}L${_izPt(in_[j])}L${_izPt(in_[i])}Z" fill="${tonF[i]}"/>`;
  }
  s += `<path d="M${au.map(_izPt).join('L')}Z" fill="none" stroke="${k}" stroke-width="2.6" stroke-linejoin="round"/>`;
  s += `<path d="M${_izPt(au[3])}L${_izPt(au[0])}L${_izPt(au[1])}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6"/>`;
  // Der Stein.
  s += `<path d="M${in_.map(_izPt).join('L')}Z" fill="url(#sk)" stroke="${k}" stroke-width="2" stroke-linejoin="round"/>`;
  const tf = [[500 - T * .7, cy - T * .7], [500 + T * .7, cy - T * .7], [500 + T * .7, cy + T * .7], [500 - T * .7, cy + T * .7]];
  // Acht Facetten: vier Spitzen und vier Kanten, gewichtet nach dem Licht.
  const licht = [.3, .1, -.3, -.2, -.35, -.1, .2, .4];
  const fac = [];
  for(let i = 0; i < 4; i++){
    fac.push([in_[i], tf[(i + 3) % 4], tf[i]]);
    fac.push([in_[i], tf[i], in_[(i + 1) % 4]]);
  }
  fac.forEach((f3, i) => {
    const v = licht[i];
    s += `<path d="M${f3.map(_izPt).join('L')}Z" fill="${v > 0 ? '#fff' : '#000'}" opacity="${Math.abs(v)}"/>`;
  });
  s += `<path d="M${tf.map(_izPt).join('L')}Z" fill="url(#sg)" opacity=".5" stroke="#fff" stroke-opacity=".25" stroke-width="1"/>`;
  s += _izFunkeln(500 - 15, cy - 19, 11, .9);
  return s;
}

// ── Stufe für Stufe ────────────────────────────────────────────────────
// Die drei Grade jeder Stufe, als Angaben. Gezeichnet werden sie von
// `_izTeile` weiter unten; die Liste ist der Katalog der Leiter.
const INS_ZEICHEN = {
  // ── Eine silberne Leiter mit goldenen Akzenten ─────────────────────
  // Die Stufen liefen von Silber über Rose, Champagner und Rotgold zu Gold,
  // und neben Silber las sich jedes warme Metall als Bronze: Zier- und
  // Lorbeerkranz sahen weniger wert aus als Reif und Schildring. Jetzt ist
  // der Bau durchgehend Silber und oben Platin, der Rang liegt als Schimmer
  // darauf, und Gold kommt nur als Akzent — Nieten, Lilie, Fassung der
  // Raute — ab dem Lorbeerreif und erst am Ordensstern in der Fläche.
  // Der dritte Grad einer Stufe trägt nie mehr Steine oder Gold als der
  // erste der nächsten [§C30].
  reif: [
    {reif:{metall:'silber'}},
    {reif:{metall:'silber', profil:'rand', kanal:'silber', wulst:9, nieten:{n:24, gr:4.4, m:'silber'}}},
    {reif:{metall:'silber', profil:'rand', kanal:'flieder', wulst:11, nieten:{n:18, gr:7.5, m:'platin'}}},
  ],
  schild: [
    {reif:{metall:'silber', nieten:{n:4, gr:5.5, m:'platin', frei:[[-80, 80], [100, 180], [-180, -100]]}},
     sichel:{m:'silber', von:-50, bis:-170, breit:64, abstand:4, los:80}},
    {reif:{metall:'silber', profil:'rand', kanal:'silber', wulst:9, nieten:{n:22, gr:4.4, m:'platin'}},
     sichel:{m:'silber', von:-36, bis:-122, breit:52, abstand:4, los:60}, klinge:{m:'silber', breit:52}},
    {reif:{metall:'platin', profil:'rand', kanal:'flieder', nieten:{n:20, gr:5.8, m:'platin'}},
     sichel:{m:'platin', von:-34, bis:-124, breit:66, abstand:4, los:66}, klinge:{m:'platin', breit:64, lang:1.08}},
  ],
  volute: [
    {reif:{metall:'silber', nieten:{n:4, gr:5.5, m:'platin', frei:[[-80, 80], [100, 180], [-180, -100]]}}, volute:{m:'silber', gr:1}},
    {reif:{metall:'platin', profil:'rand', kanal:'flieder', nieten:{n:16, gr:4.2, m:'platin'}}, volute:{m:'silber', gr:2}},
    {reif:{metall:'platin', profil:'rand', kanal:'flieder', nieten:{n:20, gr:4.6, m:'platin'}}, volute:{m:'platin', gr:3}},
  ],
  zier: [
    {reif:{metall:'platin', profil:'rand', kanal:'silber', nieten:{n:16, gr:4.2, m:'platin'}}, zier:{m:'silber', gr:1}},
    {reif:{metall:'platin', profil:'rand', kanal:'flieder', nieten:{n:18, gr:4.4, m:'platin'}}, zier:{m:'platin', gr:2}},
    {reif:{metall:'platin', profil:'rand', kanal:'flieder', nieten:{n:22, gr:4.6, m:'platin'}}, zier:{m:'platin', gr:3}},
  ],
  // Der Lorbeer steht zwischen Zier- und Kronenreif: Laub in Blattpaaren,
  // darüber je Grad eine Linie mehr, dazu das erste Gold als Akzent.
  lorbeer: [
    {reif:{metall:'platin', profil:'rand', kanal:'flieder', wulst:9, nieten:{n:24, gr:4.4, m:'gold'}},
     lorbeer:{m:'platin', gr:1, n:8}, lilie:'gold'},
    {reif:{metall:'platin', profil:'rand', kanal:'flieder', nieten:{n:26, gr:4.6, m:'gold'}, steine:8},
     lorbeer:{m:'platin', gr:2, n:9, gross:1.04}, lilie:'gold', raute:'gold'},
    {reif:{metall:'platin', profil:'rand', kanal:'gold', nieten:{n:24, gr:4.8, m:'gold'}, steine:8},
     lorbeer:{m:'platin', gr:3, n:10, gross:1.08}, krone:{m:'gold', klein:1}, raute:'gold'},
  ],
  krone: [
    {reif:{metall:'platin', profil:'rand', kanal:'gold', nieten:{n:22, gr:4.6, m:'gold'}, steine:8}, eiche:{m:'platin', gr:1}, krone:{m:'gold'}, raute:'gold'},
    {reif:{metall:'platin', profil:'rand', kanal:'gold', nieten:{n:22, gr:4.6, m:'gold'}, steine:12}, eiche:{m:'platin', gr:2}, krone:{m:'gold'}, raute:'gold'},
    {reif:{metall:'platin', profil:'rand', kanal:'gold', nieten:{n:24, gr:4.8, m:'gold'}, steine:16}, eiche:{m:'platin', gr:3}, krone:{m:'gold'}, raute:'gold'},
  ],
  // Der Ordensstern ist die Stufe, in der das Gold die Fläche trägt.
  stern: [
    {reif:{metall:'gold', profil:'rand', kanal:'platin', nieten:{n:16, gr:4.8, m:'gold', frei:[[-12, 12], [165, 180], [-180, -165]]}, steine:16},
     strahlen:{m:'gold', n:72, lang:120}, krone:{m:'gold', stern:1}, raute:'gold'},
    {reif:{metall:'gold', profil:'rand', kanal:'platin', nieten:{n:16, gr:4.8, m:'gold', frei:[[-12, 12], [165, 180], [-180, -165]]}, steine:16},
     strahlen:{m:'gold', n:88, lang:124}, krone:{m:'gold', stern:1}, raute:'gold'},
    {reif:{metall:'gold', profil:'rand', kanal:'gold', nieten:{n:16, gr:5, m:'gold', frei:[[-12, 12], [165, 180], [-180, -165]]}, steine:16},
     strahlen:{m:'gold', n:96, lang:118, gross:1}, krone:{m:'gold', stern:1}, raute:'gold'},
  ],
};

// Eine Klinge mit Grat: die Lichtseite hell, die Schattenseite dunkel, auf
// dem Grat ein Glanz. Aus ihr sind Sicheln und Flügel gebaut.
function _izKlingenForm(p, w, m, seite){
  return _izJe(_izBand(p, w), d => _izForm(d, `url(#o${m})`, m))
    + _izJe(_izHalb(p, w, -seite), d => `<path d="${d}" fill="#000" opacity=".22"/>`)
    + _izJe(_izHalb(p, t => w(t) * .8, seite), d => `<path d="${d}" fill="#fff" opacity=".22"/>`)
    + _izJe(_izGrat(p, t => w(t) * .35, seite, .12, .78), d => _izLicht(d, 3, .8));
}
// Die Sicheln des Schildrings: je Seite eine Klinge, die dem Reif außen
// folgt und oben und unten in eine Spitze ausläuft.
function _izSichel(o){
  const p = _izBahn(t => {
    const a = o.von + (o.bis - o.von) * t;
    // Oben löst sich die Spitze vom Reif, unten legt sie sich an.
    const r = IZ_RA + o.abstand + o.los * Math.pow(1 - t, 3.2) + 8 * Math.pow(t, 4);
    return _izPol(r + o.breit * Math.pow(Math.sin(Math.PI * t), .9) * .5, a);
  }, 60);
  const w = t => o.breit * .5 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), .9);
  return _izKlingenForm(p, w, o.m, -1);
}
// Die untere Klinge: vom Stein nach außen und oben, wie ein Flügel.
function _izKlinge(o){
  const s = o.lang || 1;
  const P0 = [452, 786], P1 = [330, 805], P2 = [500 - 360 * s, 560 - 20 * s];
  const p = _izBahn(t => [
    (1-t)*(1-t)*P0[0] + 2*(1-t)*t*P1[0] + t*t*P2[0],
    (1-t)*(1-t)*P0[1] + 2*(1-t)*t*P1[1] + t*t*P2[1]], 50);
  const w = t => o.breit * .5 * Math.pow(Math.sin(Math.PI * Math.pow(t, .62)), 1.1);
  return _izKlingenForm(p, w, o.m, 1);
}

// Eine Rolle: ein Stiel, der dem Reif in einem Bogen folgt und sich am
// Ende in einer Schnecke einrollt — EIN Zug vom Ansatz bis ins Auge, wie mit
// der Feder gezogen. Aus einzelnen Haken zusammengesetzt sah der
// Volutenkranz gestückelt aus; eine Linie, die durchläuft, ist geschmeidig.
// `a0` bis `a1` ist der Bogen auf dem Radius `r`, danach rollt sie mit der
// Länge `L` um `dreh` Grad ein.
function _izRollbahn(r, a0, a1, L, dreh, e, r1){
  const n = Math.max(8, Math.round(Math.abs(a1 - a0) / 3)), p = [];
  const rr = t => r + ((r1 === undefined ? r : r1) - r) * t;
  for(let i = 0; i <= n; i++) p.push(_izPol(rr(i / n), a0 + (a1 - a0) * i / n));
  const [x, y] = p[p.length - 1], [xv, yv] = p[p.length - 2];
  // Die Schnecke setzt in der Richtung an, in der der Bogen endet.
  const kurs = Math.atan2(y - yv, x - xv) * 180 / Math.PI;
  return p.concat(_izSpirale(x, y, kurs, L, dreh, e).slice(1));
}
// Gezeichnet wie eine Ranke: dünn am Ansatz, voll in der Mitte, das Auge
// als Knopf. `stein` setzt einen Stein in der Rangfarbe ins Auge.
function _izRolle(p, w0, wm, w1, m, stein, st){
  const w = t => {
    const b = t < .5 ? w0 + (wm - w0) * Math.sin(Math.PI * t) : wm + (w1 - wm) * (t - .5) * 2;
    return t > .97 ? b * (1 - (t - .97) * 8) : b;
  };
  const [ex, ey] = p[p.length - 1], kr = w1 * 1.35;
  const auge = stein
    ? _izJe(_izKreis(ex, ey, kr), d => `<path d="${d}" fill="url(#sk)" stroke="${st[4]}" stroke-width="1.6"/>`)
      + _izJe(_izKreis(ex - kr * .3, ey - kr * .32, kr * .3), d => `<path d="${d}" fill="#fff" opacity=".85"/>`)
    : _izJe(_izKreis(ex + kr * .2, ey + kr * .3, kr * 1.05), d => `<path d="${d}" fill="#000" opacity=".35"/>`)
      + _izJe(_izKreis(ex, ey, kr), d => _izForm(d, `url(#n${m})`, m, 1.8))
      + _izJe(_izKreis(ex - kr * .32, ey - kr * .34, kr * .3), d => `<path d="${d}" fill="#fff" opacity=".8"/>`);
  return _izJe(_izBand(p, w), d => _izForm(d, `url(#o${m})`, m, 2.2))
    + _izJe(_izHalb(p, w, 1), d => `<path d="${d}" fill="#000" opacity=".22"/>`)
    + _izJe(_izGrat(p, t => w(t) * .42, -1, .04, .88), d => _izLicht(d, Math.max(2.2, wm * .3), .8))
    + auge;
}

// Der Volutenkranz: je Seite ein Paar C-Schnecken Rücken an Rücken, die
// eine rollt oben, die andere unten nach außen ein; wo sie sich treffen,
// sitzt ein Knopf. Der zweite Grad bekommt ein zweites, kleineres Paar
// am Kopf und am Fuß, der dritte ein Akanthusblatt am Treffpunkt und
// Steine in den Augen.
function _izVolute(o, st){
  const g = o.gr, m = o.m, r = IZ_RA + 26;
  let s = '';
  // Oben: vom Treffpunkt auf neun Uhr nach oben, dann nach außen eingerollt.
  s += _izRolle(_izRollbahn(r, -100, -58, 200, -380, 2.2, r + 18), 8, 25, 21, m, g >= 3, st);
  // Unten: vom Treffpunkt nach unten, dann nach außen und unten eingerollt.
  s += _izRolle(_izRollbahn(r, -116, -146, 210, 370, 2.2, r + 20), 8, 27, 22, m, g >= 3, st);
  if(g >= 2){
    // Das kleinere Paar: oben neben dem Kopf, unten neben dem Stein, nach
    // innen eingerollt — die Gegenbewegung zur großen Schnecke.
    s += _izRolle(_izRollbahn(IZ_RA + 14, -44, -24, 110, 330, 2, IZ_RA + 26), 4, 13, 12, m, false, st);
    s += _izRolle(_izRollbahn(IZ_RA + 14, -150, -164, 110, -330, 2, IZ_RA + 28), 4, 14, 12, m, false, st);
  }
  if(g >= 3){
    // Das Akanthusblatt am Treffpunkt, nach außen gerichtet.
    const [x, y] = _izPol(r + 12, -108);
    s += _izBlaetter([[x, y, 196, 118, 30, .3], [x, y, 150, 96, 24, -.25]], m, .25);
  }
  // Der Knopf, der beide Schnecken hält.
  const [kx, ky] = _izPol(r, -108);
  s += _izJe(_izKreis(kx + 3, ky + 4, 17), d => `<path d="${d}" fill="#000" opacity=".35"/>`)
    + _izJe(_izKreis(kx, ky, 16), d => _izForm(d, `url(#n${m})`, m, 1.8))
    + _izJe(_izKreis(kx - 5, ky - 5.5, 4.6), d => `<path d="${d}" fill="#fff" opacity=".8"/>`);
  return s;
}

// Ein Blatt: lanzettlich, spitz am Ende und schmal am Ansatz, an der
// Mittelrippe in zwei Hälften geteilt — eine im Licht, eine im Schatten —
// und mit einem Glanz auf der Lichtseite. Die Form stammt aus dem Lorbeer
// der gerechneten Leiter: sie war dort sauberer als jedes Blatt aus einer
// Breitenfunktion, deren Ränder nie ganz glatt wurden.
function _izBlatt(x, y, winkel, L, B, krumm){
  const a = winkel * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const k = krumm || 0;
  // t läuft von 0 (Ansatz) bis 1 (Spitze), o quer dazu; die Biegung schiebt
  // die Spitze zur Seite.
  const P = (t, o) => {
    const q = k * L * t * t * .5;
    return _izPt([x + dx * L * t - dy * (o + q), y + dy * L * t + dx * (o + q)]);
  };
  const seite = sp => `M${P(1, 0)}C${P(.8, sp * B * .82)} ${P(.47, sp * B)} ${P(.29, sp * B * .56)}`
    + `C${P(.12, sp * B * .28)} ${P(.03, sp * B * .1)} ${P(0, 0)}Z`;
  const hell = k >= 0 ? -1 : 1;
  const glanz = `M${P(.93, 0)}C${P(.76, hell * B * .52)} ${P(.51, hell * B * .62)} ${P(.33, hell * B * .34)}`
    + `C${P(.48, hell * B * .14)} ${P(.72, hell * B * .1)} ${P(.93, 0)}Z`;
  return {h:seite(hell), d:seite(-hell), g:glanz, rippe:`M${P(0, 0)}L${P(.86, 0)}`};
}
// Jedes Blatt ist ein eigener Körper mit eigenem Licht: als EIN Pfad
// über alle Blätter lief der Verlauf über den ganzen Kranz, und jedes
// Blatt war darin ein flacher Streifen einer Farbe.
function _izBlaetter(liste, m, farbe){
  const k = IZ_METALL[m][4];
  let s = '';
  liste.forEach(b => {
    const z = _izBlatt.apply(null, b);
    [x => x, _izSpiegel].forEach(sp => {
      s += `<path d="${sp(z.d)}" fill="url(#d${m})" stroke="${k}" stroke-width="1.6" stroke-opacity=".75" stroke-linejoin="round"/>`
        + (farbe ? `<path d="${sp(z.d)}" fill="url(#sl)" opacity="${farbe}"/>` : '')
        + `<path d="${sp(z.h)}" fill="url(#h${m})" stroke="${k}" stroke-width="1.6" stroke-opacity=".75" stroke-linejoin="round"/>`
        + `<path d="${sp(z.g)}" fill="#fff" opacity=".4"/>`
        + `<path d="${sp(z.rippe)}" fill="none" stroke="${k}" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>`;
    });
  });
  return s;
}

// Ein Wedel: ein Stiel, der in einem Schwung dem Reif folgt und an der
// Spitze einrollt, besetzt mit spitzen Fiederblättern, die nach hinten und
// außen stehen und zur Spitze hin kleiner werden. Er ist die Form, die den
// Zierkranz trägt: der Volutenkranz darunter ist nur Linie, der Lorbeer
// darüber nur Laub an einem verborgenen Zweig — hier trägt die Linie das
// Laub. Als gelappte Fläche gezeichnet war er ein schweres Horn.
function _izWedel(p, n, B, m, farbe, st, stein){
  const N = p.length - 1, blaetter = [];
  for(let i = 0; i < n; i++){
    const t = .12 + .7 * (i / Math.max(1, n - 1));
    const j = Math.round(t * N);
    const [x, y] = p[j], [xv, yv] = p[Math.max(0, j - 1)];
    const kurs = Math.atan2(y - yv, x - xv) * 180 / Math.PI;
    const gr = 1 - .45 * (i / Math.max(1, n - 1));
    // Außen am Stiel, gegen die Wuchsrichtung um 150 Grad gedreht: die
    // Fieder weht nach hinten, wie Laub an einer Ranke.
    blaetter.push([x, y, kurs - 140, 104 * gr * B, 25 * gr * B, -.24]);
    if(i % 2 === 1) blaetter.push([x, y, kurs + 146, 84 * gr * B, 19 * gr * B, .22]);
  }
  return _izBlaetter(blaetter, m, farbe) + _izRolle(p, 5, 14, 13, m, stein, st);
}

// Der Zierkranz: Akanthuswedel, die vom Stein aus um den Reif fließen.
// Der erste Grad trägt einen Wedel je Seite und einen kleinen am Stein, der
// zweite einen zweiten Wedel und die Rangfarbe im Laub, der dritte einen
// dritten, Steine in den Augen und Ranken um den Kopf.
function _izZier(o, st){
  const g = o.gr, m = o.m, farbe = g === 1 ? 0 : g === 2 ? .18 : .26;
  const wedel = (r0, r1, a0, a1, L, dreh, n, B) =>
    _izWedel(_izRollbahn(r0, a0, a1, L, dreh, 1.8, r1), n, B, m, farbe, st, g >= 3);
  let s = '';
  // Der kleine Wedel am Stein, nach außen und unten.
  s += wedel(IZ_RA + 10, IZ_RA + 40, -166, -148, 80, 260, 3, 1);
  if(g >= 3) s += wedel(IZ_RA + 26, IZ_RA + 70, -104, -80, 96, -300, 3, 1);
  if(g >= 2) s += wedel(IZ_RA + 24, IZ_RA + 74, -146, -118, 106, -300, 4, 1.05);
  // Der große Wedel: vom Stein in weitem Schwung nach oben, unter dem Kopf
  // nach außen gerollt.
  s += wedel(IZ_RA + 12, IZ_RA + 44, -158, -64, 150, -330, g === 1 ? 7 : 8, 1.25);
  if(g >= 3) s += _izRolle(_izRollbahn(IZ_RA + 10, -40, -24, 90, -300, 1.8, IZ_RA + 22), 3.5, 10, 9, m, true, st);
  return s;
}

// Ein Eichenblatt: gebuchtet, mit runden Lappen, einer Rippe und Adern zu
// den Lappen hin. Es ist das Laub des Kronenreifs — breiter und schwerer
// als der Lorbeer darunter, damit die oberste Kranzstufe nicht wie ein
// voller Lorbeer aussieht.
function _izEiche(x, y, winkel, L, B, m, farbe){
  const a = winkel * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const pt = (t, o) => [x + dx * L * t - dy * o, y + dy * L * t + dx * o];
  const n = 48, lappen = 3.5;
  const breite = t => B * Math.pow(Math.sin(Math.PI * Math.min(1, t * .98 + .02)), .55)
    * (.58 + .42 * Math.pow(Math.abs(Math.sin(t * lappen * Math.PI + .25)), .45));
  const seite = sp => { const q = []; for(let i = 0; i <= n; i++){ const t = i / n; q.push(pt(t, sp * breite(t))); } return q; };
  const mitte = [], links = seite(-1), rechts = seite(1);
  for(let i = 0; i <= n; i++) mitte.push(pt(i / n, 0));
  const k = IZ_METALL[m][4];
  const hell = _izGlatt(links.concat(mitte.slice().reverse()), true);
  const dunkel = _izGlatt(rechts.concat(mitte.slice().reverse()), true);
  let adern = '';
  [.2, .45, .7].forEach(t => {
    const [ax, ay] = pt(t - .05, 0);
    [-1, 1].forEach(sp => { const [bx, by] = pt(t + .08, sp * breite(t + .08) * .8); adern += `M${_izPt([ax, ay])}L${_izPt([bx, by])}`; });
  });
  return _izJe(dunkel, d => `<path d="${d}" fill="url(#d${m})" stroke="${k}" stroke-width="1.6" stroke-opacity=".8" stroke-linejoin="round"/>`)
    + (farbe ? _izJe(dunkel, d => `<path d="${d}" fill="url(#sl)" opacity="${farbe}"/>`) : '')
    + _izJe(hell, d => `<path d="${d}" fill="url(#h${m})" stroke="${k}" stroke-width="1.6" stroke-opacity=".8" stroke-linejoin="round"/>`)
    + _izJe(adern, d => `<path d="${d}" fill="none" stroke="${k}" stroke-opacity=".3" stroke-width="1.3" stroke-linecap="round"/>`)
    + _izJe(`M${_izPt(pt(0, 0))}L${_izPt(pt(.9, 0))}`, d => `<path d="${d}" fill="none" stroke="${k}" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`);
}
// Eine Eichel: ein Hütchen mit Schuppen, darin die glatte Frucht mit einem
// Glanz. Im dritten Grad ist die Frucht ein Stein in der Rangfarbe.
function _izEichel(x, y, winkel, gr, m, stein, st){
  const a = winkel * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const pt = (t, o) => [x + dx * t * gr - dy * o * gr, y + dy * t * gr + dx * o * gr];
  // Die Frucht: eine Eiform von t = .3 bis 1.
  const frucht = `M${_izPt(pt(.32, -.3))}C${_izPt(pt(.7, -.36))} ${_izPt(pt(1.02, -.16))} ${_izPt(pt(1.02, 0))}`
    + `C${_izPt(pt(1.02, .16))} ${_izPt(pt(.7, .36))} ${_izPt(pt(.32, .3))}Z`;
  const huetchen = `M${_izPt(pt(.02, -.33))}C${_izPt(pt(.1, -.42))} ${_izPt(pt(.4, -.4))} ${_izPt(pt(.44, -.33))}`
    + `L${_izPt(pt(.44, .33))}C${_izPt(pt(.4, .4))} ${_izPt(pt(.1, .42))} ${_izPt(pt(.02, .33))}Z`;
  const stiel = `M${_izPt(pt(-.2, 0))}L${_izPt(pt(.04, 0))}`;
  let schuppen = '';
  for(let i = 0; i < 3; i++) for(let j = -2; j <= 2; j++){
    const [sx, sy] = pt(.1 + i * .12, j * .13 + (i % 2) * .065);
    if(Math.abs(j * .13 + (i % 2) * .065) < .32) schuppen += _izKreis(sx, sy, gr * .045);
  }
  const k = IZ_METALL[m][4];
  return _izJe(stiel, d => `<path d="${d}" fill="none" stroke="${IZ_METALL[m][3]}" stroke-width="${_izN(gr * .12)}" stroke-linecap="round"/>`)
    + _izJe(frucht, d => stein ? `<path d="${d}" fill="url(#sk)" stroke="${st[4]}" stroke-width="1.6"/>` : _izForm(d, `url(#o${m})`, m, 1.6))
    + _izJe(`M${_izPt(pt(.5, -.2))}C${_izPt(pt(.7, -.26))} ${_izPt(pt(.88, -.16))} ${_izPt(pt(.94, -.06))}`,
        d => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="${_izN(gr * .07)}" stroke-linecap="round"/>`)
    + _izJe(huetchen, d => _izForm(d, `url(#d${m})`, m, 1.6))
    + _izJe(schuppen, d => `<path d="${d}" fill="${IZ_METALL[m][1]}" stroke="${k}" stroke-width=".8" stroke-opacity=".6"/>`);
}
// Das Band unter dem Stein, wo die Zweige sich treffen: zwei Enden mit
// Schwalbenschwanz in der Rangfarbe, gold gesäumt. Es macht aus dem Laub
// einen gebundenen Kranz — das, was ein Lorbeer an einem Zweig nicht hat.
function _izSchleife(st, m, gr){
  const p = _izBahn(t => {
    const u = 1 - t;
    return [u * u * 470 + 2 * u * t * 430 + t * t * 372, u * u * 792 + 2 * u * t * 872 + t * t * 884];
  }, 24);
  const {L, R} = _izRaender(p, t => 17 + 5 * t);
  const n = p.length - 1, [ex, ey] = p[n], [vx, vy] = p[n - 2];
  const kerbe = [ex - (ex - vx) * 3.2, ey - (ey - vy) * 3.2];
  const umriss = _izGlatt(L, false) + 'L' + _izPt(kerbe) + 'L' + R.slice().reverse().map(_izPt).join('L') + 'Z';
  const licht = _izHalb(p, t => 17 + 5 * t, -1);
  const k = IZ_METALL[m];
  // Metall mit einem Schimmer der Rangfarbe: ganz in Violett war das Band
  // der lauteste Fleck des Kronenreifs.
  return _izJe(umriss, d => `<path d="${d}" fill="url(#d${m})" stroke="${k[2]}" stroke-width="3.2" stroke-linejoin="round"/>`)
    + _izJe(umriss, d => `<path d="${d}" fill="url(#sd)" opacity=".35"/>`)
    + _izJe(licht, d => `<path d="${d}" fill="url(#h${m})" opacity=".7"/>`)
    + (gr >= 3 ? _izJe(_izGlatt(p.slice(1, n - 1)), d => `<path d="${d}" fill="none" stroke="${k[1]}" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9"/>`) : '')
    + _izJe(_izGrat(p, t => 11, -1, .1, .8), d => _izLicht(d, 2.4, .6));
}
// Das Eichenlaub des Kronenreifs: je Seite ein Zweig in zwei Lagen —
// hinten größere Blätter im Schatten, vorn die im Licht —, dazwischen
// Eicheln, deren Frucht ein Stein in der Rangfarbe ist, und unten das Band.
// Mit einer Lage und Eicheln aus Metall stand er zu nah am Lorbeer
// darunter und sah nicht wertvoller aus. Mit jedem Grad mehr Blätter und
// aus einzelnen Eicheln Paare.
function _izEichenkranz(o, st){
  const g = o.gr, m = o.m, rz = IZ_RA + 12;
  const n = g === 1 ? 5 : g === 2 ? 6 : 7;
  let hinten = '', vorn = '', eicheln = '';
  const a0 = -160, a1 = -34;
  for(let i = 0; i < n; i++){
    const t = (i + .5) / n, a = a0 + (a1 - a0) * t;
    const gr = .82 + .3 * Math.sin(Math.PI * t);
    const [x, y] = _izPol(rz, a);
    vorn += _izEiche(x, y, a - 32, 128 * gr, 36 * gr, m, 0);
    if(i < n - 1){
      const ah = a + (a1 - a0) / n * .5, [xh, yh] = _izPol(rz + 6, ah);
      hinten += _izEiche(xh, yh, ah - 50, 132 * gr, 38 * gr, m, 0);
    }
  }
  const zahl = g === 1 ? 3 : g === 2 ? 3 : 4, paar = g >= 2;
  for(let i = 0; i < zahl; i++){
    const a = a0 + 18 + i * (a1 - a0 - 40) / Math.max(1, zahl - 1);
    const [x, y] = _izPol(rz + 22, a + 8);
    if(paar){
      eicheln += _izEichel(x, y, a - 122, 60, m, g >= 3 || i % 2 === 0, st) + _izEichel(x, y, a - 78, 60, m, g >= 3, st);
    } else eicheln += _izEichel(x, y, a - 100, 64, m, false, st);
  }
  const zweig = _izBogen(rz, a0 - 4, a1 + 2);
  return _izSchleife(st, m, g)
    + hinten + _izJe(zweig, d => `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="34" stroke-linecap="round"/>`
        + `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="18" stroke-linecap="round"/>`)
    + _izJe(zweig, d => `<path d="${d}" fill="none" stroke="${IZ_METALL[m][3]}" stroke-width="9" stroke-linecap="round"/>`)
    + vorn + eicheln;
}

// Der Lorbeer: vorn ein klassischer Zweig in Blattpaaren, darüber Linien,
// die am Reif entlang zum Kopf aufsteigen und einrollen. Die Linien stehen
// dort, wo kein Laub ist — über dem Kranz und nicht auf ihm. Lagen sie
// darauf, las sich der Lorbeer wie mehrere Schichten übereinander; und
// zwei Reihen Laub ohne Linien waren von Grad zu Grad kaum zu unterscheiden.
function _izLorbeer(o){
  const g = o.gr, m = o.m, st = o.st, G = o.gross || 1;
  const farbe = g === 1 ? .12 : g === 2 ? .18 : .24;
  const kurs = (p, j) => {
    const [x, y] = p[j], [xv, yv] = p[Math.max(0, j - 1)];
    return Math.atan2(y - yv, x - xv) * 180 / Math.PI;
  };
  // Der Zweig: vom Stein bis etwa zehn Uhr, außen am Reif. Die Blattpaare
  // legen sich ihm nach oben an — daran erkennt man einen Lorbeer und keinen
  // Igel —, außen ein langes, innen ein kürzeres, in der Mitte am größten.
  const rz = IZ_RA + 22, a0 = -168, aE = -72;
  const zweig = _izBahn(t => _izPol(rz + 6 * t, a0 + (aE - a0) * t), 40);
  const B = [], I = [];
  for(let i = 0; i < o.n; i++){
    const t = .03 + .94 * (i / (o.n - 1));
    const j = Math.max(1, Math.round(t * 40)), k = kurs(zweig, j);
    const gr = (.72 + .36 * Math.sin(Math.PI * Math.min(1, t * 1.05))) * G;
    B.push([zweig[j][0], zweig[j][1], k - 34, 130 * gr, 29 * gr, .12]);
    I.push([zweig[j][0], zweig[j][1], k + 30, 100 * gr, 23 * gr, -.1]);
  }
  // Das Endblatt: der Zweig schließt mit einem Blatt in seiner Richtung.
  const kE = kurs(zweig, 40);
  B.push([zweig[40][0], zweig[40][1], kE - 8, 104 * G, 24 * G, 0]);
  // Beeren in der Rangfarbe, paarweise in den Achseln außen: drei, vier und
  // fünf Gruppen.
  let beeren = '';
  const gruppen = g + 2;
  for(let q = 0; q < gruppen; q++){
    const t = .16 + .66 * (q / Math.max(1, gruppen - 1));
    const j = Math.round(t * 40), kr = (kurs(zweig, j) - 64) * Math.PI / 180;
    [[30, 0, 8], [24, 12, 6.5]].forEach(([d1, d2, r]) => {
      const bx = zweig[j][0] + Math.cos(kr) * d1 - Math.sin(kr) * d2 * .4;
      const by = zweig[j][1] + Math.sin(kr) * d1 + Math.cos(kr) * d2 * .4;
      beeren += _izJe(_izKreis(bx, by, r), d => `<path d="${d}" fill="url(#sk)" stroke="${st[4]}" stroke-width="1.3"/>`)
        + _izJe(_izKreis(bx - r * .3, by - r * .32, r * .3), d => `<path d="${d}" fill="#fff" opacity=".85"/>`);
    });
  }
  // Die Hauptlinie: vom Ende des Zweigs am Reif entlang bis neben den Kopf,
  // dort nach außen eingerollt. Ihr Auge trägt schon in Grad I einen Stein
  // in der Rangfarbe — der Zierkranz III davor hat ihn, und ohne ihn ginge
  // die Farbe beim Aufstieg einen Grad lang verloren.
  const hE = -34, haupt = _izRollbahn(rz + 2, aE + 2, hE, 150, -430, 1.9, IZ_RA + 44);
  let linien = _izRolle(haupt, 8, 11, 13, m, true, st);
  // Ab Grad II löst sich kurz vor der Schnecke eine Gegenlinie, die nach
  // innen zum Kopf einrollt und mit der anderen Seite Lilie oder Krone rahmt.
  if(g >= 2){
    const j = Math.round(haupt.length * .36);
    linien += _izRolle(_izSpirale(haupt[j][0], haupt[j][1], kurs(haupt, j) + 18, 110, 360, 2.2), 6, 8, 9, m, true, st);
  }
  // Grad III: ein S, das am Ende des Laubs nach außen schwingt.
  let aussen = '', s3 = null;
  if(g >= 3){
    const [sx, sy] = _izPol(rz + 8, aE + 4);
    s3 = _izSpirale(sx, sy, aE - 120, 128, 330, 2.2);
    aussen = _izRolle(s3, 7, 9, 10, m, true, st);
  }
  // Blätter an den Linien, nach außen und zum Kopf hin kleiner. Nur am
  // Bogen und nicht in der Schnecke: dort verdeckten sie Auge und Stein.
  // Nach innen wächst keins, dort lägen sie auf dem Band und vor der Lilie.
  const LB = [];
  const blattAn = (p, u, f, seite) => {
    const j = Math.max(1, Math.round((p.length - 1) * u)), k = kurs(p, j);
    LB.push([p[j][0], p[j][1], k + seite, 90 * f * G, 21 * f * G, seite < 0 ? .14 : -.14]);
  };
  const bogen = haupt.slice(0, Math.max(8, Math.round(Math.abs(hE - (aE + 2)) / 3)) + 1);
  const anBogen = g === 1 ? [.12, .34, .56, .76] : g === 2 ? [.1, .28, .46, .64, .8] : [.08, .24, .4, .56, .7, .84];
  anBogen.forEach((u, i) => blattAn(bogen, u, 1 - .45 * u, i % 2 ? -64 : -30));
  if(s3) [.12, .3].forEach(u => blattAn(s3, u, .66, 40));
  // Am Fuß endet der Zweig unter dem Stein in einer kleinen Rolle nach innen.
  const fuss = _izRollbahn(rz, -172, -178, 60, 300, 2, rz - 4);
  return linien + _izBlaetter(LB, m, farbe)
    + _izJe(_izGlatt(zweig), d => `<path d="${d}" fill="none" stroke="${IZ_METALL[m][3]}" stroke-width="8" stroke-linecap="round"/>`)
    + _izRolle(fuss, 6, 7, 8, m, false, st)
    + _izBlaetter(I, m, farbe * .8) + _izBlaetter(B, m, farbe) + aussen + beeren;
}

// Die Krone: fünf Zacken auf einem Reif, die mittlere trägt den Kristall in
// der Rangfarbe; darunter hängt ein Tropfen ins Band.
function _izKrone(o, st){
  const m = o.m, f = o.klein ? .84 : o.stern ? .8 : .98;
  const y0 = 500 - IZ_RA + 8;
  const T = (x, y) => [500 + x * f, y0 + y * f];
  const P = (...a) => a.map(p => _izPt(T(p[0], p[1]))).join(' ');
  const [g, l, mi, t, k] = IZ_METALL[m];
  // Der Schein hinter der Krone.
  let s = `<circle cx="500" cy="${_izN(y0 - 70 * f)}" r="${_izN(120 * f)}" fill="url(#ss)" opacity=".35"/>`;
  // Die Zacken, jede mit einer Lichtseite: außen zwei, die sich nach außen
  // neigen, innen zwei hohe, dazwischen niedrige Spitzen.
  const zacke = (b0, b1, sp, tal) =>
    `M${P(b0)}L${P(sp)}L${P(b1)}` + (tal ? `L${P(tal)}` : '') + 'Z';
  const zacken = [
    zacke([-100, -30], [-72, -30], [-120, -92]),
    zacke([-74, -30], [-38, -30], [-56, -104]),
    zacke([-40, -30], [-10, -30], [-26, -62]),
  ].join('');
  const zackenLicht = [
    `M${P([-100, -30])}L${P([-120, -92])}L${P([-88, -30])}Z`,
    `M${P([-74, -30])}L${P([-56, -104])}L${P([-58, -30])}Z`,
  ].join('');
  s += _izJe(zacken, d => _izForm(d, `url(#o${m})`, m));
  s += _izJe(zackenLicht, d => `<path d="${d}" fill="#fff" opacity=".3"/>`);
  // In den großen Zacken ein Keil in der Rangfarbe, wie in der Vorlage.
  const keile = `M${P([-106, -62])}L${P([-94, -34])}L${P([-82, -34])}Z M${P([-56, -76])}L${P([-63, -34])}L${P([-49, -34])}Z`;
  s += _izJe(keile, d => `<path d="${d}" fill="url(#sg)" opacity=".5"/>`);
  // Der Kronreif: leicht gewölbt, mit einem Grat oben und unten.
  const reif = `M${P([-102, -2])}C${P([-40, 8], [40, 8], [102, -2])}L${P([98, -34])}C${P([40, -28], [-40, -28], [-98, -34])}Z`;
  s += _izForm(reif, `url(#b${m})`, m);
  s += `<path d="M${P([-96, -29])}C${P([-40, -23], [40, -23], [96, -29])}" fill="none" stroke="${g}" stroke-opacity=".8" stroke-width="2"/>`;
  s += `<path d="M${P([-99, -6])}C${P([-40, 3], [40, 3], [99, -6])}" fill="none" stroke="${t}" stroke-opacity=".7" stroke-width="2"/>`;
  // Die Kugeln auf den Spitzen.
  [[-120, -92], [-56, -104], [-26, -62]].forEach(([x, y], i) => {
    const [a, b] = T(x, y), r = (i === 2 ? 6 : 9.5) * f;
    s += _izJe(_izKreis(a + r * .2, b + r * .3, r * 1.05), d => `<path d="${d}" fill="#000" opacity=".3"/>`)
      + _izJe(_izKreis(a, b, r), d => _izForm(d, `url(#n${m})`, m, 1.8))
      + _izJe(_izKreis(a - r * .3, b - r * .32, r * .3), d => `<path d="${d}" fill="#fff" opacity=".85"/>`);
  });
  // Die Steine im Reif: Rauten in der Rangfarbe, jede mit Lichtpunkt.
  [-72, -38].forEach(x => {
    const [a, b] = T(x, -16), r = 7.5 * f;
    s += _izJe(_izRaute(a, b, r, r), d => `<path d="${d}" fill="url(#sk)" stroke="${st[4]}" stroke-width="1.4"/>`)
      + _izJe(_izKreis(a - r * .25, b - r * .3, r * .28), d => `<path d="${d}" fill="#fff" opacity=".8"/>`);
  });
  // Der Kristall: eine vierseitige Spitze, oben lang, unten kurz; links im
  // Licht, rechts im Schatten, dazu ein Funkeln.
  const kh = o.stern ? 172 : 124, kb = 24;
  const kr = [T(0, -kh), T(kb, -56), T(0, -18), T(-kb, -56)];
  const km = T(0, -56);
  const tri = (a, b, c, fill, op) => `<path d="M${_izPt(a)}L${_izPt(b)}L${_izPt(c)}Z" fill="${fill}"${op ? ` opacity="${op}"` : ''}/>`;
  s += `<path d="M${kr.map(_izPt).join('L')}Z" fill="url(#sd)" stroke="${st[4]}" stroke-width="2.2" stroke-linejoin="round"/>`;
  s += tri(kr[0], kr[3], km, st[0], .95) + tri(kr[0], kr[1], km, st[2]) + tri(kr[3], kr[2], km, st[1])
    + tri(kr[1], kr[2], km, st[3]);
  s += `<path d="M${kr.map(_izPt).join('L')}Z" fill="none" stroke="${st[4]}" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<path d="M${_izPt(kr[0])}L${_izPt(km)}L${_izPt(kr[2])}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>`;
  s += _izFunkeln(T(-7, -kh * .62)[0], T(-7, -kh * .62)[1], 13 * f, .9);
  // Der Tropfen unter der Krone, im Band.
  const tr = [T(0, -4), T(17, 26), T(0, 70), T(-17, 26)];
  s += `<path d="M${tr.map(_izPt).join('L')}Z" fill="url(#sd)" stroke="${st[4]}" stroke-width="2" stroke-linejoin="round"/>`;
  s += tri(tr[0], tr[3], tr[2], st[1], .9);
  return s;
}

// Die Strahlen des Ordenssterns: eine Glorie aus Haarstrichen, dazu die
// großen Spitzen in die Himmelsrichtungen — im dritten Grad sechzehn, halb
// in der Rangfarbe. Ein Strahl ist ein Haarstrich ohne Kontur: eine Kontur
// fräße ein Drittel seiner Breite, und aus der Glorie würden Stecknadeln.
// Die Haarstriche stehen in vier Armen auf den Diagonalen, innen am
// längsten, zur Lücke hin kürzer, jeder zweite kürzer als sein Nachbar —
// so läuft ein Arm aus und hat eine Textur. Die großen Spitzen sind
// zweiseitig geschliffen, eine Seite im Licht, eine im Schatten.
function _izStrahlen(o){
  const m = o.m, k = IZ_METALL[m][4];
  const strahl = (a, r0, L, w) => {
    const A = _izPol(r0, a - w), B = _izPol(r0, a + w);
    const C = _izPol(r0 + L, a - w * .18), D = _izPol(r0 + L, a + w * .18);
    return `M${_izPt(A)}L${_izPt(C)}L${_izPt(D)}L${_izPt(B)}Z`;
  };
  const r0 = IZ_RA - 2, n = o.n;
  let glorie = '', hell = '';
  for(let i = 0; i < n; i++){
    const a = -180 + (i + .5) * 360 / n;
    const ab = Math.abs(((a + 405) % 90) - 45);     // Abstand zur Diagonale
    if(ab > 38) continue;
    const L = (o.lang || 132) * (1.25 - .5 * (ab / 38)) * (i % 2 ? .62 : 1);
    glorie += strahl(a, r0, L, 1.35);
  }
  // Auf jeder Diagonale ein Bündel aus langen, hellen Strahlen.
  [150, 118, 92, 70].forEach((L, j) => {
    [-135, -45, 45, 135].forEach(a0 => {
      if(j === 0) hell += strahl(a0, r0, L, 1.3);
      else [-1, 1].forEach(sp => hell += strahl(a0 + sp * j * 5.5, r0, L, 1.2));
    });
  });
  let gross = '', grossL = '', grossR = '';
  const spitze = (a, r1, b) => {
    const M0 = _izPol(r0 - 4, a), S = _izPol(r1, a), Lp = _izPol(r0 - 4, a - b), Rp = _izPol(r0 - 4, a + b);
    const links = `M${_izPt(Lp)}L${_izPt(S)}L${_izPt(M0)}Z`, rechts = `M${_izPt(Rp)}L${_izPt(S)}L${_izPt(M0)}Z`;
    gross += `M${_izPt(Lp)}L${_izPt(S)}L${_izPt(Rp)}Z`;
    // Die Lichtseite ist die, die nach oben links schaut.
    if(a < 0 || a === 180){ grossL += rechts; grossR += links; } else { grossL += links; grossR += rechts; }
  };
  if(o.gross) for(let i = 0; i < 16; i++){
    const a = -180 + i * 22.5;
    if(Math.abs(a) < 5) continue;
    spitze(a, i % 2 ? 372 : 414, i % 2 ? 7 : 8.5);
  } else [-90, 90, 180].forEach(a => spitze(a, 416, 5.5));
  return `<circle cx="500" cy="500" r="430" fill="url(#sr)" opacity="${o.gross ? .8 : .6}"/>`
    + `<path d="${glorie}" fill="url(#o${m})" opacity=".8"/>`
    + `<path d="${hell}" fill="url(#h${m})"/>`
    + `<path d="${grossR}" fill="url(#d${m})"/>`
    + (o.gross ? `<path d="${grossR}" fill="url(#sd)" opacity=".3"/>` : '')
    + `<path d="${grossL}" fill="url(#h${m})"/>`
    + `<path d="${gross}" fill="none" stroke="${k}" stroke-opacity=".6" stroke-width="1.4" stroke-linejoin="round"/>`
    // Der Kranzring, aus dem die Strahlen springen: ohne ihn säßen sie
    // einzeln auf dem Reif und sähen aufgesprüht aus statt gefasst.
    + `<circle cx="500" cy="500" r="${IZ_RA + 4}" fill="none" stroke="url(#b${m})" stroke-width="9"/>`
    + `<circle cx="500" cy="500" r="${IZ_RA + 8.5}" fill="none" stroke="${k}" stroke-opacity=".6" stroke-width="1.4"/>`;
}

// Eine Stufe als Zeichnung: hinten die Zierde, darauf der Schatten des
// Reifs, der Reif, oben Lilie oder Krone, unten der Stein.
function _izTeile(key, nr, farbe){
  const z = (INS_ZEICHEN[key] || INS_ZEICHEN.reif)[nr] || INS_ZEICHEN.reif[0];
  const st = _izStein(farbe);
  const metalle = new Set(['silber', 'flieder']);
  const merk = o => { if(o && o.m) metalle.add(o.m); if(o && o.metall) metalle.add(o.metall);
    if(o && o.kanal) metalle.add(o.kanal); if(o && o.nieten && o.nieten.m) metalle.add(o.nieten.m); };
  [z.reif, z.sichel, z.klinge, z.volute, z.zier, z.lorbeer, z.eiche, z.krone, z.strahlen].forEach(merk);
  const lilie = z.lilie || 'silber', raute = z.raute || 'silber';
  metalle.add(lilie); metalle.add(raute);
  let hinten = '';
  if(z.strahlen) hinten += _izStrahlen(z.strahlen);
  if(z.sichel) hinten += _izSichel(z.sichel);
  if(z.klinge) hinten += _izKlinge(z.klinge);
  if(z.volute) hinten += _izVolute(z.volute, st);
  if(z.zier) hinten += _izZier(z.zier, st);
  if(z.lorbeer) hinten += _izLorbeer(Object.assign({st}, z.lorbeer));
  if(z.eiche) hinten += _izEichenkranz(z.eiche, st);
  const kopf = z.krone ? _izKrone(z.krone, st) : _izLilie(500 - IZ_RA + 4, st, lilie);
  return {defs: _izDefs([...metalle], st),
          bild: `<circle cx="500" cy="508" r="${IZ_RA + 44}" fill="url(#ssh)"/>`
            + hinten + (hinten ? _izReifSchatten() : '') + _izReif(z.reif)
            + kopf + _izRauteStein(raute)};
}
// Die Zeichnung als Bild, für die kleinen Wappen in Listen und im Feed:
// dort stehen sie zu Dutzenden, und ein Bild rastert der Browser einmal,
// während jeder Verweis auf die Vektorgruppe die ganze Zeichnung klont —
// gemessen öffnete der Feed damit doppelt so langsam. Bis 64 px reicht das
// Bild: es wird in seinen 170 Einheiten gerastert und erscheint mit dem
// 1,18-Fachen der Wappengröße [§C30].
const _IZ_BILD = new Map();
function insBild(key, nr, rang){
  const schl = rang + '|' + key + '|' + nr;
  let u = _IZ_BILD.get(schl);
  if(!u){
    const t = _izTeile(key, nr, INS_RANGFARBE[rang] || INS_RANGFARBE.Solide);
    u = 'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">${t.defs}${t.bild}</svg>`);
    _IZ_BILD.set(schl, u);
  }
  return u;
}
// ── Im Dokument eine kurze Adresse statt der Datei ──────────────────
// `insBild` liefert die Zeichnung als Daten-URL, rund 190 Kilobyte je Bild.
// Im Wappen steht sie in einer Gruppe, auf die jedes Wappen mit `<use>`
// verweist, und ein `<use>` klont, was es verweist — samt dieser Adresse.
// Der Feed trägt rund 240 Verweise auf sieben Gruppen, und jede Kopie liess
// den Browser eine Adresse von 190 Kilobyte nachschlagen: gemessen fiel die
// Stilberechnung beim Öffnen des Feeds auf die Hälfte, als die Wappen fehlten.
// Eine Blob-Adresse ist sechzig Zeichen lang und zeigt auf dieselbe Datei.
// Ausserhalb eines Dokuments (Tests, Rastern als eigenes Bild) bleibt es bei
// der Daten-URL: ein Blob gilt nur in der Seite, die ihn angelegt hat.
const _IZ_BLOB = new Map();
function insBildHref(key, nr, rang){
  if(typeof Blob !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL)
    return insBild(key, nr, rang);
  const schl = rang + '|' + key + '|' + nr;
  let u = _IZ_BLOB.get(schl);
  if(!u){
    const t = _izTeile(key, nr, INS_RANGFARBE[rang] || INS_RANGFARBE.Solide);
    u = URL.createObjectURL(new Blob(
      [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">${t.defs}${t.bild}</svg>`],
      {type:'image/svg+xml'}));
    _IZ_BLOB.set(schl, u);
  }
  return u;
}
// Die Kennungen einer Zeichnung mit einem Präfix: im Dokument stehen viele
// Zeichnungen nebeneinander, und jede hat einen Verlauf namens „bsilber".
function _izPraefix(s, p){
  return s.replace(/id="([^"]+)"/g, 'id="' + p + '$1"')
    .replace(/url\(#([^)]+)\)/g, 'url(#' + p + '$1)')
    .replace(/href="#([^"]+)"/g, 'href="#' + p + '$1"');
}
