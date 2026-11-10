/* ── Die Titel-Aura [§C36] ───────────────────────────────────────────
   Die Meistertitel stehen als Licht hinter Avatar und Insignium: die Korona
   aus dem Entwurf `mockup/titel-aura`, ein weicher Goldschein mit
   ungleich langen Strahlen, ab der vierten Stufe Goldstaub, ab der neunten
   einzelne Lichtsterne. Zehn Stufen, je Titel eine; danach wächst sie nicht
   weiter, und die Sterne über dem Zeichen zählen [§C26].
   Sie ersetzt die Rankenschwinge. Die Schwinge stand golden NEBEN dem
   Zeichen und griff zweieinhalb Reifradien weit aus; in einer Zeile musste
   sie auf 78 % zurückgenommen werden, und ein dritter goldener Kranz neben
   dem silbernen war einer zu viel. Licht nimmt keine Form weg und liegt
   hinter allem.

   Gezeichnet wird auf 1000 × 1000 um (500,500); die Mitte ist bis Radius 184
   ausgespart, damit kein Licht durch den Avatar fällt. Das Insignium nimmt
   darin 70 % der Fläche ein — sein Innenrand (220 von 1000) liegt dann bei
   154, und genau dort beginnt der Schein. Daraus folgt die Seite der Aura in
   Insignium-Einheiten: `AURA_SEITE`.

   Leistung: jede Stufe wird EINMAL gerechnet und als Datei unter einer
   kurzen Adresse gemerkt (`auraHref`), wie die Zeichnungen der Leiter
   [§C30]. Im Wappen steht sie als `<image>` — die weiche Unschärfe der
   Strahlen rastert der Browser einmal und nicht je Bild. Bewegt wird sie nur
   im Profilkopf (`auraLebendHtml`), und dort nur in drei eigenen Ebenen,
   die sich ausschließlich über `transform` und Deckkraft bewegen: das läuft
   auf der Grafikkarte. Im Entwurf drehten sich Gruppen INNERHALB des SVG,
   und dann rechnet der Browser die Unschärfe in jedem Bild neu. */
const AURA_STUFEN = ['Funke', 'Glut', 'Schimmer', 'Lichthof', 'Resonanz',
  'Strahlkraft', 'Glorie', 'Sonnenwind', 'Zenit', 'Unvergänglich'];
const AURA_SEITE = INS_BILD_KANTE / .7;
function auraStufe(titel){ return Math.max(0, Math.min(AURA_STUFEN.length, titel | 0)); }

// Die Zeichnung in ihren Ebenen. Zufall ist keiner darin: dieselbe Stufe
// ergibt auf jedem Gerät dieselben Strahlen.
const _AURA_TEILE = new Map();
function _auraTeile(stufe){
  let T = _AURA_TEILE.get(stufe);
  if(T) return T;
  const n = x => +x.toFixed(2);
  const pt = (r, a) => [500 + Math.cos(a) * r, 500 + Math.sin(a) * r];
  const p = x => x.map(n).join(' ');
  const zuf = i => { const x = Math.sin(i * 91.127 + 36.11) * 43758.5453; return x - Math.floor(x); };
  const t = (stufe - 1) / 9, radius = 345 + 95 * t;
  const radial = (name, stops, r) => `<radialGradient id="a${name}" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="${n(r)}">`
    + stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${n(a)}"/>`).join('') + `</radialGradient>`;
  const defs = `<defs>`
    + radial('bloom', [[0,'#ffd69a',0],[.3,'#ffd69a',0],[.4,'#ffd486',.04],[.6,'#f5bc57',.20+.14*t],[.73,'#f3c570',.14+.12*t],[.88,'#cfa14e',.04+.045*t],[1,'#d4aa62',0]], radius + 32)
    + radial('hot', [[0,'#fff3d3',0],[.37,'#fff0c7',0],[.5,'#fff0ce',.1+.13*t],[.57,'#f7d997',.22+.16*t],[.65,'#efc275',.08],[.83,'#d7ae67',0]], radius + 5)
    + radial('beam', [[0,'#fff1ca',0],[.36,'#fff2d4',0],[.49,'#ffedc0',.23+.18*t],[.65,'#eaca85',.28+.22*t],[.84,'#d7b072',.07+.07*t],[1,'#be924d',0]], radius + 12)
    + radial('thread', [[.25,'#fff4d6',0],[.49,'#fff3d4',.12],[.65,'#ffe4a6',.28+.2*t],[.88,'#dbba7a',.08],[1,'#cab181',0]], radius + 25)
    + `<linearGradient id="aarc" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#f8dd9e" stop-opacity="0"/><stop offset=".22" stop-color="#fce8b7" stop-opacity=".15"/><stop offset=".5" stop-color="#fff4d3" stop-opacity=".7"/><stop offset=".72" stop-color="#dfb771" stop-opacity=".22"/><stop offset="1" stop-color="#dcb875" stop-opacity="0"/></linearGradient>`
    + `<radialGradient id="apoint"><stop stop-color="#fffae5"/><stop offset=".14" stop-color="#ffe7ae" stop-opacity=".8"/><stop offset=".4" stop-color="#f4cd83" stop-opacity=".3"/><stop offset="1" stop-color="#edc079" stop-opacity="0"/></radialGradient>`
    + `<filter id="asoft" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="8"/></filter>`
    + `<filter id="aedge" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.2"/></filter>`
    + `<mask id="aaussen" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><rect width="1000" height="1000" fill="white"/><circle cx="500" cy="500" r="184" fill="black"/></mask>`
    + `</defs>`;
  // Der Schein: ein weiter Hof und ein heller Saum dicht am Reif.
  let schein = `<circle cx="500" cy="500" r="${n(radius + 32)}" fill="url(#abloom)"/>`
    + `<circle cx="500" cy="500" r="${n(radius + 5)}" fill="url(#ahot)"/>`;
  // Ab der siebten Stufe ein Lichtring, der im Profil langsam ausläuft.
  if(stufe >= 7) schein += `<circle cx="500" cy="500" r="${n(radius * .77)}" fill="none" stroke="url(#aarc)" stroke-width="2.5" filter="url(#aedge)" opacity=".19"/>`;
  // Die Strahlen: mit jeder Stufe sieben mehr, ab der dritten feine Fäden.
  let beams = '', threads = '';
  const count = 30 + stufe * 7;
  for(let i = 0; i < count; i++){
    const a = i / count * Math.PI * 2 + zuf(i + 8) * .07;
    const inner = 202 + zuf(i + 14) * 40, outer = radius * (.76 + zuf(i + 23) * .25);
    const w = .013 + zuf(i + 31) * (.018 + t * .023);
    beams += `<path d="M${p(pt(inner, a - w * .35))}Q${p(pt((inner + outer) * .5, a - w * .8))} ${p(pt(outer, a - w))}Q${p(pt(outer + 5, a))} ${p(pt(outer, a + w))}Q${p(pt((inner + outer) * .5, a + w * .7))} ${p(pt(inner, a + w * .35))}Z" fill="url(#abeam)" opacity="${n(.25 + zuf(i + 17) * .61)}"/>`;
    if(stufe >= 3 && i % 3 === 0)
      threads += `<path d="M${p(pt(235, a))}L${p(pt(outer * .97, a))}" fill="none" stroke="url(#athread)" stroke-width="${n(.65 + zuf(i + 1) * .9)}" opacity=".65"/>`;
  }
  const strahl = `<g filter="url(#asoft)">${beams}</g>${threads}`;
  // Die Gegenstrahlen ab der fünften Stufe, dazu der Goldstaub ab der
  // vierten und die Lichtsterne ab der neunten. Sie liegen in EINER Ebene:
  // im Profil dreht sie sich gegenläufig, und der Staub zieht mit.
  let gegen = '';
  if(stufe >= 5){
    let sub = '';
    const k = 14 + stufe * 2;
    for(let i = 0; i < k; i++){
      const a = i / k * Math.PI * 2 + .1, r = radius * (.84 + zuf(i + 221) * .09);
      sub += `<path d="M${p(pt(220, a))}L${p(pt(r, a - .014))}L${p(pt(r, a + .014))}Z" fill="url(#abeam)" opacity=".45"/>`;
    }
    gegen += `<g filter="url(#asoft)">${sub}</g>`;
  }
  if(stufe >= 4){
    const k = 5 + (stufe - 4) * 5;
    for(let i = 0; i < k; i++){
      const a = zuf(i + 112) * Math.PI * 2, r = 267 + zuf(i + 517) * (radius - 245);
      const [x, y] = pt(r, a), gr = 1.1 + zuf(i + 346) * 1.5;
      gegen += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(gr * 4.4)}" fill="url(#apoint)" opacity=".35"/>`
        + `<circle cx="${n(x)}" cy="${n(y)}" r="${n(gr * .55)}" fill="#f5dda4" opacity="${n(.23 + zuf(i + 14) * .5)}"/>`;
    }
  }
  if(stufe >= 9){
    for(let i = 0; i < stufe - 6; i++){
      const [x, y] = pt(radius * .81, .37 + i * 2.2), s = stufe === 10 ? 8 : 5;
      gegen += `<circle cx="${n(x)}" cy="${n(y)}" r="17" fill="url(#apoint)" opacity=".5"/>`
        + `<path d="M${n(x)} ${n(y - s)}Q${n(x + 1)} ${n(y - 1)} ${n(x + s)} ${n(y)}Q${n(x + 1)} ${n(y + 1)} ${n(x)} ${n(y + s)}Q${n(x - 1)} ${n(y + 1)} ${n(x - s)} ${n(y)}Q${n(x - 1)} ${n(y - 1)} ${n(x)} ${n(y - s)}Z" fill="#fff2cf" opacity=".68"/>`;
    }
  }
  T = {defs, schein, strahl, gegen};
  _AURA_TEILE.set(stufe, T);
  return T;
}

// Eine Ebene (oder die ganze Aura) als eigene Datei. Ein Blob trägt eine
// Adresse von sechzig Zeichen; als Daten-URL stünde die Datei in jedem
// Verweis darauf, und das kostete beim Wappen die halbe Stilberechnung
// [§C30]. Ohne Blob (Tests ohne Browser) bleibt die Daten-URL.
const _AURA_HREF = new Map();
function auraHref(stufe, teil){
  stufe = auraStufe(stufe);
  if(!stufe) return '';
  teil = teil || 'ganz';
  const schl = stufe + '|' + teil;
  let u = _AURA_HREF.get(schl);
  if(u) return u;
  const T = _auraTeile(stufe);
  const inhalt = teil === 'ganz' ? T.schein + T.strahl + T.gegen : T[teil];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">${T.defs}<g mask="url(#aaussen)">${inhalt}</g></svg>`;
  u = (typeof Blob === 'function' && typeof URL !== 'undefined' && URL.createObjectURL)
    ? URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}))
    : 'data:image/svg+xml;base64,' + btoa(svg);
  _AURA_HREF.set(schl, u);
  return u;
}

// Die Aura im Wappen, in Insignium-Einheiten um die Reifmitte (50,50). Sie
// ist größer als die Bandbox und darf über sie hinausleuchten: das SVG
// trägt dafür `overflow:visible` (12-insignium.css). Die Box selbst bleibt,
// wie sie ist — sonst rückte jede Stelle, an der das Banner steht.
function auraBildIns(stufe){
  const u = auraHref(stufe);
  if(!u) return '';
  const o = 50 - AURA_SEITE / 2;
  return `<image class="aura-b" href="${u}" x="${(+o.toFixed(2))}" y="${(+o.toFixed(2))}"`
    + ` width="${(+AURA_SEITE.toFixed(2))}" height="${(+AURA_SEITE.toFixed(2))}"/>`;
}

// Die bewegte Aura im Profilkopf: drei Ebenen übereinander, jede ein Bild.
// Der Schein atmet, die Strahlen drehen sich in achtzig Sekunden einmal, die
// Gegenstrahlen samt Staub gegenläufig. Nur `transform` und Deckkraft —
// beides rechnet die Grafikkarte, ohne das Bild neu zu malen.
function auraLebendHtml(stufe){
  stufe = auraStufe(stufe);
  if(!stufe) return '';
  const T = _auraTeile(stufe);
  return `<div class="aura" data-aura="${stufe}" aria-hidden="true">`
    + `<img class="a-schein" src="${auraHref(stufe, 'schein')}" alt="">`
    + `<img class="a-strahl" src="${auraHref(stufe, 'strahl')}" alt="">`
    + (T.gegen ? `<img class="a-gegen" src="${auraHref(stufe, 'gegen')}" alt="">` : '')
    + `</div>`;
}
