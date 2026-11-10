// ─── §4.5 ─── BEWEGUNG (Öffnen, Gerüst, Kantenlicht, Aufbau) ─────────────
// Wie die App sich öffnet [§C43]. Die Oberfläche steht im ersten Bild:
// Kopfleiste und Zeichen sind festes Markup in src/index.html, sichtbar,
// bevor dieses Skript übersetzt ist. Sobald die Liga gezeichnet ist, baut
// sie sich auf — bei jedem Öffnen. Ein Startbild mit dem Zeichen in der Mitte
// gab es einmal; es stand zwischen dem Öffnen und der Liga und wurde wieder
// entfernt, ebenso eine Sperre, die nach kurzer Pause keine Vorführung
// zeigte: wer die App öffnet, soll sie jedes Mal ankommen sehen. Hat das
// Gerät keinen Stand (erster Start, neue Fassung), steht bis zur Antwort der
// Datenbank das Gerüst der Liga.
//
// Bewegung gibt es nur, wo ein Browser sie zeichnet: der Generator im Worker
// und die Rechentests führen diesen Code mit einem Schein-DOM aus, ohne
// `Element` und ohne `animate`.
function _bewegungDa(){
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
}
const _ruheAbfrage = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
function _bewegungRuhig(){ return !_bewegungDa() || !_ruheAbfrage || _ruheAbfrage.matches; }

// Aus 37-boot.js, vor dem ersten `loadAll`. Kommt nach 2,5 s kein Bild —
// etwa weil der Speicher des Geräts hängt —, steht das Gerüst da, und die
// Liga kommt, wenn sie kommt.
let _startAuftrag = 0;
function _startBereit(){
  if(_bewegungDa()) _startAuftrag = setTimeout(_startGeruest, 2500);
}
// Kein Stand auf dem Gerät (aus `_standZeigen`) oder kein Bild nach 2,5 s.
function _startGeruest(){
  clearTimeout(_startAuftrag); _startAuftrag = 0;
  const main = document.getElementById('main');
  if(main && !main.firstElementChild && main.innerHTML !== undefined) main.innerHTML = _geruestHtml();
}
function _geruestHtml(){
  const k = c => '<i class="gk' + (c ? ' ' + c : '') + '"></i>';
  const zeile = erste => '<div class="g-zeile' + (erste ? ' g-erste' : '') + '">' + k('g-pos') + k('g-av')
    + '<span class="g-mid">' + k('g-m1') + k('g-m2') + k('g-m3') + '</span>' + k('g-wert') + '</div>';
  return '<section class="view active geruest" aria-busy="true" aria-label="Die Liga lädt">'
    + '<div class="g-kopf">' + k('g-h') + k('g-s') + '</div>'
    + '<div class="g-switch">' + k('g-sw') + '</div><div class="g-lauf"></div>'
    + '<div class="g-wahl">' + k('g-w1') + k('g-w') + k('g-w') + '</div>'
    + '<div class="g-tabs">' + k('g-t') + k('g-t') + '</div>'
    + '<div class="g-liste">' + zeile(true) + zeile() + zeile() + zeile() + zeile() + zeile() + '</div></section>';
}
// ── Das Kantenlicht [§C27] ─────────────────────────────────────────────
// Ein Ring aus einer Maske, darin ein Kegel aus Licht, der sich dreht: die
// Linie fährt die Kante ab. Zwei Bedeutungen und keine dritte [§C41]:
//   zeichnen  einmal herum, dann steht der Rahmen einige Sekunden: eine
//             Karte, die zählt, ist angekommen;
//   hinweis   zweimal herum, ohne Rahmen: hier ist etwas neu.
// (Das Licht, das im Profilkopf kreist, solange der Monat läuft, ist
// dieselbe Zeichnung mit eigener Bedeutung: es läuft.)
// Zeichnen und Hinweis enden nicht mit der Runde: das Licht läuft langsamer
// weiter, ein Schein liegt um die Karte, und nach gut vier Sekunden verlischt
// beides. Nach gut einer Sekunde war es vorbei, bevor man die Karte angesehen
// hatte. `d` ist die Diagonale der Karte in px: so groß wird der Kegel, nicht
// größer — eine gedrehte Ebene kostet bei dreifacher Pixeldichte Speicher im
// Quadrat ihrer Kante. Gemessen wird nichts; die Größe kennt der Aufrufer.
const KANTE_MS = {zeichnen:4600, hinweis:4200};
// Das leise Licht (`_leisesLicht`) dauert länger als jede Art: nach deren
// Zeit entfernt, risse es mitten in seiner Runde ab.
const KANTE_LEISE_MS = 6500;
// Die Farben des Lichts: das Metall der Plätze, Acid fürs Bedienen, Weiß
// für den Knopf „Match eintragen", die Farbe einer Story, Blau für das Team
// der Saison — was zu zweit geholt wurde [§C25]. Eine feste Tabelle statt
// `'kl-' + ton`: ein Ton, den es nicht gibt, fällt so auf, statt als
// farbloses Licht.
const KANTE_TON = {gold:'kl-gold', silber:'kl-silber', bronze:'kl-bronze', acid:'kl-acid', weiss:'kl-weiss', story:'kl-story', blau:'kl-blau'};
const KANTE_ART = {zeichnen:'kl-zeichnen', hinweis:'kl-hinweis'};
function kantenlicht(ziel, ton, art, verzug, d, innen, leise){
  if(!ziel || _bewegungRuhig() || !KANTE_TON[ton] || !KANTE_ART[art]) return null;
  const teile = [], t0 = performance.now();
  const klassen = ' ' + KANTE_ART[art] + ' ' + KANTE_TON[ton] + (innen ? ' kl-innen' : '') + (leise ? ' kl-leise' : '');
  const schein = document.createElement('span');
  schein.className = 'kl-schein' + klassen;
  schein.style.setProperty('--kv', verzug + 'ms');
  teile.push(schein);
  const ring = document.createElement('span');
  ring.className = 'kl' + klassen;
  ring.style.cssText = '--kd:' + Math.ceil(d) + 'px;--kv:' + verzug + 'ms';
  ring.innerHTML = '<i></i>';
  teile.push(ring);
  teile.forEach(t => { t.setAttribute('aria-hidden', 'true'); t.dataset.t0 = t0; t.dataset.kv = verzug; ziel.appendChild(t); });
  _lichtWartet(teile, verzug, '--kv');
  _lichtBeobachten(ziel);
  setTimeout(() => {
    const wo = new Set(teile.map(t => t.parentElement));
    teile.forEach(t => t.remove());
    wo.forEach(_lichtLoesen);
  }, verzug + (leise ? KANTE_LEISE_MS : KANTE_MS[art]) + 120);
  return ring;
}

// ── Der Aufbau ─────────────────────────────────────────────────────────
// Eine Ansicht kommt in Teilen: Überschrift, Wähler, dann Karten und Zeilen,
// 45 bis 55 ms auseinander, jedes über eine gute halbe Sekunde. Schneller
// (30 ms, 0,42 s) wirkte es auf dem Telefon hektisch, als ruckelte die Liste;
// langsamer sähe es nach Warten aus — der erste Teil beginnt sofort.
// Höchstens vierzehn Teile, und die Verzögerung steht an jedem Teil selbst —
// eine vererbte Variable ließe jeden Knoten darunter seinen Stil neu
// rechnen, samt Wappen. Gemessen wird nichts: welche Teile im Bild stehen,
// sagt die Reihenfolge. Bei einem Wechsel stehen Überschrift, Wähler und
// Suche sofort da; kamen auch sie aus dem Nichts, stand zwischen alter und
// neuer Ansicht ein leeres Bild, und der Wähler, auf den man eben getippt
// hatte, verschwand unter dem Finger. Danach trägt kein Teil mehr eine Spur
// davon: Klasse und Verzögerung gehen wieder.
const AUFBAU_LISTE = '.rlist, .mlist, .podest, .aw-vitrine, .rek-liste';
const AUFBAU_KOPF = '.view-head, .ui-switch, .ui-tabs, .saisonwahl, .lauf, .search, .einblick, .mini-label';
// Eine vergangene Saison steht in `.geschichte` (display:contents, 06b):
// ein Rahmen ohne eigenen Kasten. Als Teil bewegte er nichts, und die
// Wähler darin kamen mit — es zählen seine Kinder.
const AUFBAU_RAHMEN = '.geschichte';
// Der Verlauf ist ein ruhiger Blick auf vergangene Partien, zum
// Nachschlagen: dort baut sich nichts auf, und kein Licht fährt — weder beim
// Ankommen noch leise im laufenden Betrieb. Er trug zuerst Aufbau und Licht
// um die letzte Partie wie die Rangliste; für eine Liste, die man durchsieht,
// war das Unruhe ohne Aussage.
const RUHIGE_REITER = new Set(['history']);
let _aufbauTeile = [];
let _aufbauAuftrag = 0;
function _aufbauen(view, start, schritt, hoechstens, ohneKopf){
  if(!view || _bewegungRuhig()) return;
  _aufbauFertig();
  const teile = [];
  const kinder = [...view.children].flatMap(k => k.matches(AUFBAU_RAHMEN) ? [...k.children] : [k]);
  for(const kind of kinder){
    if(teile.length >= hoechstens) break;
    if(ohneKopf && kind.matches(AUFBAU_KOPF)) continue;
    const liste = kind.matches(AUFBAU_LISTE) ? kind
      : (kind.children.length === 1 && kind.firstElementChild.matches(AUFBAU_LISTE) ? kind.firstElementChild : null);
    if(liste) teile.push(...[...liste.children].slice(0, 7));
    else teile.push(kind);
  }
  _aufbauTeile = teile.slice(0, hoechstens);
  _aufbauTeile.forEach((t, i) => { t.classList.add('bau'); t.style.animationDelay = (start + i * schritt) + 'ms'; });
  _aufbauAuftrag = setTimeout(_aufbauFertig, start + _aufbauTeile.length * schritt + 700);
}
function _aufbauFertig(){
  clearTimeout(_aufbauAuftrag); _aufbauAuftrag = 0;
  // Kein leeres style-Attribut bleibt zurück: das Markup ist danach dasselbe
  // wie ohne Aufbau.
  _aufbauTeile.forEach(t => { t.classList.remove('bau'); t.style.animationDelay = '';
    if(t.getAttribute('style') === '') t.removeAttribute('style'); });
  _aufbauTeile = [];
}

// ── Das Podest glänzt ──────────────────────────────────────────────────
// Kommt eine Ansicht an, fährt das Kantenlicht in ihrem Metall um Platz 1, 2
// und 3, nacheinander [§C25]: in Liga und Seiten um die ersten drei
// Zeilen, bei den Duos ebenso, bei den Awards um das Podest; über Gold zieht
// danach das Band, das den Titel trägt; der Verlauf bleibt ruhig
// (`RUHIGE_REITER`). Je Ansicht (Reiter mit seiner Wahl: Zeitraum, Saison, Sicht)
// höchstens einmal in 45 s: wer zwischen zwei Ansichten hin- und herwechselt,
// sieht es nicht jedes Mal, wer später zurückkommt, wieder.
const PODEST_KARTEN = {
  ranking:'.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3',
  positions:'.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3',
  teams:'.rlist > .rrow.tm-top',
  awards:'.podest > .pod-karte'
};
const PODEST_VERSATZ = {gold:0, silber:220, bronze:440};
const PODEST_PAUSE_MS = 45000;
const _podestZuletzt = new Map();
function _ansichtSchluessel(reiter){
  const wahl = {ranking:[period, ligaSicht, ligaSeasonId], positions:[rankMetric, posSort],
    awards:[awView, awPeriod, awSeasonId, awWeekStart, rekKammer], teams:[teamView, teamSort]}[reiter];
  return reiter + '|' + (wahl || []).join('|');
}
// Die Diagonale einer Karte, für den Kegel — geschätzt aus der Breite des
// Fensters (die Spalte ist höchstens 520 px breit, 16 px Rand) und einer
// Höhe, die die Karte nie überschreitet. Gemessen wird nicht: ein
// `offsetWidth` direkt nach dem Zeichnen erzwänge das Layout mitten im
// ersten Bild, und genau das kostete im Entwurf Zeit.
function _diagonale(art){
  const b = Math.min(innerWidth, 520) - 32;
  return art === 'podest' ? Math.hypot(b / 3 + 12, 215) + 8 : Math.hypot(b, 112) + 8;
}
function _podestLicht(view, reiter, start){
  if(!view || _bewegungRuhig()) return;
  const schluessel = _ansichtSchluessel(reiter), jetzt = performance.now();
  if(jetzt - (_podestZuletzt.get(schluessel) ?? -Infinity) < PODEST_PAUSE_MS) return;
  const karten = PODEST_KARTEN[reiter] ? [...view.querySelectorAll(PODEST_KARTEN[reiter])].slice(0, 3) : [];
  if(!karten.length) return;
  _podestZuletzt.set(schluessel, jetzt);
  karten.forEach((z, i) => {
    const ton = _metallTon(z, i);
    const v = start + PODEST_VERSATZ[ton];
    kantenlicht(z, ton, 'zeichnen', v, _diagonale(reiter === 'awards' ? 'podest' : 'zeile'));
    // Gold mit eigener Lichtbahn (das Podest der Awards) braucht keine zweite.
    if(ton === 'gold' && !z.querySelector(':scope > .glanz-bahn')) _glanzEinmal(z, v + 1150);
  });
}
// Das Metall sagt die Klasse (top1, gold …); die Duos tragen nur „tm-top",
// dort sagt es die Reihenfolge.
function _metallTon(z, i){
  const k = ' ' + z.className + ' ';
  return /\s(top1|gold)\s/.test(k) ? 'gold' : /\s(top2|silber)\s/.test(k) ? 'silber'
    : /\s(top3|bronze)\s/.test(k) ? 'bronze' : ['gold', 'silber', 'bronze'][i] || 'gold';
}
// Das Band über Gold: dieselbe Bahn wie das Licht über einem Titel
// (`.glanz-bahn`, 06-misc.css) [§C27], einmal statt im Takt. `ton` 'blau'
// gibt es für das Team der Saison: Gold auf ihm wäre ein zweiter Titel im
// Blatt [§C25].
function _glanzEinmal(ziel, verzug, ton){
  const b = document.createElement('span');
  b.className = 'glanz-bahn glanz-einmal' + (ton === 'blau' ? ' glanz-blau' : ''); b.setAttribute('aria-hidden', 'true');
  b.style.setProperty('--gv', verzug + 'ms');
  b.dataset.t0 = performance.now(); b.dataset.kv = verzug;
  ziel.appendChild(b);
  _lichtWartet([b], verzug, '--gv');
  setTimeout(() => b.remove(), verzug + 1500);
}
// Was noch nicht leuchtet, trägt keine Bewegung. Licht und Band kamen beim
// Ankommen sofort in ihre Karte und warteten über `animation-delay` auf
// ihren Einsatz — eine wartende Animation ist für Safari schon eine laufende,
// und es legte jedes Teil vom ersten Bild an auf eine eigene, rund
// geschnittene Grafikebene: den Kegel, den Schein, den Rahmen und über Gold
// das Band, zweieinhalb Karten breit. Platz 1 trug damit eine Ebene mehr als
// Platz 2 und 3, in Liga, Seiten, Duos und Awards, und kam auf dem iPhone
// sichtbar nach ihnen. Bis zu seinem Einsatz steht ein Teil jetzt mit
// `display:none` (`.kl-wartet`) in seiner Karte und beginnt dann ohne
// Verzögerung. Es bleibt dasselbe Element: `_lichtZurueck` nimmt es beim
// Neuzeichnen mit, und dieser Zeitgeber findet es dort.
function _lichtWartet(teile, verzug, wert){
  if(!(verzug > 0)) return;
  teile.forEach(t => t.classList.add('kl-wartet'));
  setTimeout(() => teile.forEach(t => { t.style.setProperty(wert, '0ms'); t.classList.remove('kl-wartet'); }), verzug);
}

// ── Licht über das Neuzeichnen hinweg ──────────────────────────────────
// Kommen neue Daten, zeichnet die App den Reiter neu, und mit den alten
// Zeilen verschwand ihr Licht — nach gut einer Sekunde, mitten im Leuchten,
// weil die Datenbank eben dann antwortet. Das Licht wechselt deshalb an
// dieselbe Stelle der neuen Ansicht (Platz 1 bleibt Platz 1) und läuft dort
// weiter, wo es war: seine Verzögerung wird um die vergangene Zeit kleiner,
// auch kleiner als null. Sein Zeitgeber räumt es zur alten Zeit ab.
function _lichtMerken(root){
  const jetzt = performance.now();
  return [...root.querySelectorAll('.kl, .kl-schein, .glanz-einmal')].map(e => {
    const pfad = [];
    for(let n = e.parentNode; n && n !== root && n.parentNode; n = n.parentNode)
      pfad.unshift([].indexOf.call(n.parentNode.children, n));
    return {e, pfad, v:(+e.dataset.kv || 0) - (jetzt - (+e.dataset.t0 || jetzt))};
  });
}
function _lichtZurueck(root, liste){
  const jetzt = performance.now();
  liste.forEach(x => {
    if(x.e.isConnected) return;
    let n = root;
    for(let i = 0; i < x.pfad.length && n; i++) n = n.children[x.pfad[i]];
    if(!n) return;
    x.e.dataset.t0 = jetzt; x.e.dataset.kv = x.v;
    x.e.style.setProperty(x.e.classList.contains('glanz-einmal') ? '--gv' : '--kv', x.v + 'ms');
    n.appendChild(x.e);
    _lichtBeobachten(n);
  });
}

// ── Die Vorführung ─────────────────────────────────────────────────────
// Sie gehört dem, was ein Mensch wählt: dem Öffnen — jedem, dem ersten Bild,
// das der Start zeichnet, während `loadAll` läuft — und jedem Wechsel, den
// ein Tippen auslöst (`_wechselZiel`, aus `_renderNachEingabe`): einem
// Reiter, einem Zeitraum, einer Saison, Spieler oder Teams, Awards, Rekorde
// oder Chronik. Neue Daten im selben Reiter (`render` aus `loadAll`) bauen
// nichts auf: das Verblassen der ganzen Liste bei jedem Abruf wirkte schon
// einmal wie ein Neustart (01-shell.css).
let _wechselZiel = '';
let _vorfuehrungAuftrag = 0;
function _bewegungNachRender(root, warTab, geruest, behalten){
  if(!_bewegungDa()) return;
  const view = root.firstElementChild;
  if(!warTab){
    clearTimeout(_startAuftrag); _startAuftrag = 0;
    if(geruest && !_bewegungRuhig()){
      // Das Gerüst liegt noch einen Augenblick über der Liga und blendet aus.
      geruest.classList.add('g-weg'); root.appendChild(geruest);
      geruest.animate([{opacity:1}, {opacity:0}], {duration:320, easing:'ease-out', fill:'forwards'})
        .finished.then(() => geruest.remove(), () => geruest.remove());
    }
    if(!_loadAllPromise || _bewegungRuhig()) return;
    // Die untere Leiste baut sich auf, einmal, über eine Klasse am
    // Wurzelknoten — beim Öffnen, nicht bei jedem Wechsel. Um das Zeichen in
    // der Kopfleiste fährt einmal Licht; zuletzt dreht sich „Match
    // eintragen" herein, und Licht fährt um ihn: bereit.
    document.documentElement.classList.add('aufbau');
    _vorfuehrungAuftrag = setTimeout(() => document.documentElement.classList.remove('aufbau'), 1700);
    kantenlicht(document.querySelector('.logo-mark'), 'acid', 'zeichnen', 120, 60, true);
    const fab = document.getElementById('fab');
    if(fab && fab.style.display !== 'none') kantenlicht(fab, 'weiss', 'zeichnen', 1150, 90);
    if(!RUHIGE_REITER.has(tab)){ _aufbauen(view, 40, 55, 14); _podestLicht(view, tab, 700); }
    _leisePlanen();
    return;
  }
  _wechselSteht();
  if(_wechselZiel !== tab) return;
  _wechselZiel = '';
  // Hat sich nichts geändert (dieselbe Wahl noch einmal), baut sich nichts auf.
  if((behalten && warTab === tab) || RUHIGE_REITER.has(tab)) return;
  // Überschrift, Wähler und Suche stehen; nur was darunter neu ist, kommt.
  _aufbauen(view, 0, 45, 10, true);
  _podestLicht(view, tab, 380);
}
// Wer tippt, wischt oder scrollt, will etwas Bestimmtes: der Aufbau endet
// sofort, und alles steht, wo es hingehört. Das Licht an den Kanten läuft
// zu Ende — es verdeckt nichts und hält nichts auf; wer gleich
// weiterscrollte, sah es sonst nie.
function _vorfuehrungEnde(){
  if(_vorfuehrungAuftrag){ clearTimeout(_vorfuehrungAuftrag); _vorfuehrungAuftrag = 0; document.documentElement.classList.remove('aufbau'); }
  if(_aufbauTeile.length) _aufbauFertig();
  _vorstellungEnde();
}
['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(ev =>
  document.addEventListener(ev, _vorfuehrungEnde, {passive:true, capture:true}));

// ── Der Reiterwechsel ──────────────────────────────────────────────────
// Die Pille in der unteren Leiste fährt zum gewählten Reiter, wie der
// Schlitten im Segmentwähler [§C27], und antwortet damit sofort — auch
// während der neue Reiter noch rechnet: sie wird nur verschoben, das kann
// der Compositor ohne den Hauptthread. Vorher trug jeder Knopf seine eigene
// Pille, und auf einem langsamen Telefon blieb die alte gemessen 640 ms
// stehen, weil auch ihr Umfärben auf das Ende der Rechnung wartete.
// Die Lage steht in Pixeln am Schlitten selbst, gerechnet aus der Breite
// des Fensters (die Leiste ist höchstens 520 px breit, 10 px Rand, fünf
// Knöpfe, 2 px Abstand). Eine vererbte Variable an der Leiste, `offsetLeft`,
// `clientWidth` und Prozente kosteten im Entwurf gemessen bei jedem Wechsel.
let _schlitten = null;
function _navSchlitten(sofort){
  const nav = document.getElementById('botnav');
  if(!nav || !nav.firstElementChild || !nav.appendChild) return;
  if(!_schlitten){
    _schlitten = document.createElement('i');
    _schlitten.className = 'nav-schlitten'; _schlitten.setAttribute('aria-hidden', 'true');
  }
  if(_schlitten.parentNode !== nav) nav.appendChild(_schlitten);
  const i = NAV.findIndex(n => n[0] === tab);
  _schlitten.style.opacity = i < 0 ? '0' : '';
  if(i < 0) return;
  const ziel = 'translateX(' + (i * ((Math.min(innerWidth, 520) - 28) / 5 + 2)).toFixed(1) + 'px)';
  const alt = _schlitten.style.transform;
  if(alt === ziel) return;
  _schlitten.style.transform = ziel;
  if(alt && !sofort && !_bewegungRuhig() && _schlitten.animate)
    _schlitten.animate([{transform:alt}, {transform:ziel}], {duration:360, easing:'cubic-bezier(.3,1.25,.5,1)'});
}
// Dreht sich das Telefon, ändert sich der Schritt; der Schlitten springt an
// seine neue Stelle, ohne zu fahren.
if(typeof addEventListener === 'function') addEventListener('resize', () => _navSchlitten(true));

// Die Ladelinie unter der Kopfleiste: solange Daten kommen oder ein Reiter
// rechnet, erst nach 120 ms — was schneller ist, braucht keine Linie —, auf
// dem Compositor. Sie endet, wenn kein Grund mehr gilt; das Ende der Daten
// meldet `setConn`. Gilt ein Grund nach 15 s noch, endet sie trotzdem: eine
// Linie, die nie ankommt, sagt nur, dass etwas hängt.
let _ladeLinie = null, _ladeLauf = null, _ladeNot = 0;
const _ladeGruende = new Set();
function _ladeStart(grund){
  if(!_bewegungDa()) return;
  _ladeGruende.add(grund);
  if(_ladeLauf || _bewegungRuhig()) return;
  const leiste = document.querySelector('.appbar');
  if(!leiste) return;
  if(!_ladeLinie){
    _ladeLinie = document.createElement('i');
    _ladeLinie.className = 'lade-linie'; _ladeLinie.setAttribute('aria-hidden', 'true');
  }
  if(_ladeLinie.parentNode !== leiste) leiste.appendChild(_ladeLinie);
  _ladeLauf = _ladeLinie.animate([{transform:'scaleX(0)', opacity:1}, {transform:'scaleX(.88)', opacity:1}],
    {duration:2400, delay:120, easing:'cubic-bezier(.08,.7,.2,1)', fill:'both'});
  clearTimeout(_ladeNot);
  _ladeNot = setTimeout(() => { _ladeGruende.clear(); _ladeEnde(''); }, 15000);
}
function _ladeEnde(grund){
  _ladeGruende.delete(grund);
  if(!_ladeLauf || _ladeGruende.size) return;
  clearTimeout(_ladeNot); _ladeNot = 0;
  const lauf = _ladeLauf; _ladeLauf = null;
  const sichtbar = (lauf.currentTime || 0) > 120;
  lauf.cancel();
  // Nur wenn sie zu sehen war, läuft sie zu Ende und verlischt.
  if(sichtbar && !_bewegungRuhig())
    _ladeLinie.animate([{transform:'scaleX(.88)', opacity:1}, {transform:'scaleX(1)', opacity:1, offset:.5},
      {transform:'scaleX(1)', opacity:0}], {duration:320, easing:'ease-out'});
}

// Der Schleier: eine feste, einfarbige Fläche über dem Inhalt, die immer
// da ist und unsichtbar wartet. Rechnet eine Ansicht länger als 90 ms,
// dunkelt er die alte ab; die neue baut sich darunter auf, und er hebt
// sich. Eine einfarbige Ebene muss der Browser nicht rastern. Bei einem
// Wechsel im Reiter beginnt er unter dem Wähler: der Wähler hat schon
// geantwortet und soll nicht mit abdunkeln.
let _schleier = null, _schleierLauf = null;
// Aus `_renderNachEingabe`: ein Tippen hat einen Reiter oder eine Ansicht
// darin gewählt.
function _wechselBeginnt(neuerReiter){
  if(!_bewegungDa()) return;
  _wechselZiel = tab;
  const knopf = neuerReiter ? null : _wahlSofort();
  _ladeStart('wechsel');
  if(_schleierLauf || _bewegungRuhig()) return;
  const app = document.getElementById('app');
  if(!app) return;
  if(!_schleier){
    _schleier = document.createElement('i');
    _schleier.className = 'reiter-schleier'; _schleier.setAttribute('aria-hidden', 'true');
  }
  if(_schleier.parentNode !== app) app.appendChild(_schleier);
  // Die Lage des Wählers ist eine Messung im ruhenden Layout, vor jeder
  // Änderung: sie kostet nichts.
  const wahl = knopf && knopf.parentElement;
  _schleier.style.top = wahl ? Math.max(0, Math.round(wahl.getBoundingClientRect().bottom + 4)) + 'px' : '';
  _schleierLauf = _schleier.animate([{opacity:0}, {opacity:.6}], {duration:180, delay:90, easing:'ease', fill:'forwards'});
}
// Ein Wähler antwortet sofort: der gedrückte Knopf ist gewählt, und der
// Schlitten fährt (CSS), bevor die neue Ansicht gerechnet ist. Vorher wartete
// auch das auf das Ende der Rechnung — bei „Gesamt" oder der Chronik auf
// einem langsamen Telefon eine spürbare Pause, in der nichts geschah.
// Welcher Knopf es war, sagt der Klick selbst, im Einfangen vor dem Knopf:
// ein Drücken ohne Klick (der Finger scrollte weg) hinterließe einen Knopf,
// den niemand gewählt hat, und Enter auf der Tastatur drückt nicht. Er gilt
// nur für diesen Klick: zeichnete sein Knopf direkt mit `render`, schaltete
// sonst ein späterer Wechsel ohne Klick — die Auswahl im Verlauf — ihn um.
let _wahlKnopf = null;
document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('.ui-switch > button, .ui-tabs > button, .saisonwahl > button');
  _wahlKnopf = b && b.closest('#main') ? b : null;
  if(_wahlKnopf) setTimeout(() => { _wahlKnopf = null; }, 0);
}, {passive:true, capture:true});
function _wahlSofort(){
  const b = _wahlKnopf; _wahlKnopf = null;
  if(!b || !b.isConnected) return null;
  const w = b.parentElement;
  if(!b.classList.contains('on')){
    const alt = _schlittenLage(w);
    [...w.children].forEach(k => k.classList.toggle('on', k === b));
    // Nach dem Neuzeichnen fährt der Schlitten an derselben Stelle weiter
    // (`schlittenFahren`) — auch nach einem Enter, das kein Drücken kennt.
    // Die Fahrt beginnt mit dem nächsten Bild, auf dem Compositor; dessen
    // Zeit ist ihr Anfang. An der Transition selbst ist das nicht abzulesen:
    // rechnet der Hauptthread, steht sie für ihn noch am Start, während sie
    // längst fährt.
    if(alt >= 0 && w.matches('.ui-switch:not(.roll), .ui-tabs:not(.roll)')){
      const v = _schlittenVorher = {sig:_schlittenSig(w), alt, t0:performance.now()};
      requestAnimationFrame(t => { v.t0 = t; });
    }
  }
  return b;
}
// Aus `_bewegungNachRender`: die neue Ansicht steht. Wie dunkel der Schleier
// schon ist, sagt die Animation selbst — getComputedStyle erzwänge hier,
// direkt nach dem Zeichnen, eine Stilberechnung.
function _wechselSteht(){
  _ladeEnde('wechsel');
  if(!_schleierLauf) return;
  const von = .6 * (_schleierLauf.effect.getComputedTiming().progress || 0);
  _schleierLauf.cancel(); _schleierLauf = null;
  if(von > .04) _schleier.animate([{opacity:von}, {opacity:0}], {duration:200, easing:'ease-out'});
}

// ── Leises Licht im laufenden Betrieb ──────────────────────────────────
// Steht die App offen, zieht alle 7 bis 12 s eine einzelne, langsame Linie
// einmal um etwas, das zählt — dieselben Bedeutungen wie beim Ankommen
// [§C41], nur leiser: eine Runde in 6,5 s, halb so hell, ohne Rahmen
// (`.kl-leise`). Die Ziele wechseln reihum (`LEISE_FOLGE`) und kommen aus
// dem offenen Reiter und seiner Ansicht (`LEISE_KARTEN`): Platz 1 bis 3, die
// Duos oben, das Podest der Awards, die Rekorde oben;
// dazwischen die Pille „News", wenn etwas ungelesen ist, „Match eintragen"
// und das Zeichen der Liga — nie zweimal dasselbe hintereinander, nie zwei
// Lichter zugleich, eine Karte nur, wenn sie ganz im Bild und nicht hinter
// der unteren Leiste steht, und verlässt sie das Bild, endet ihr Licht
// (`_lichtBeobachten`). Es beginnt auch, während man scrollt oder sich
// umsieht; zuerst wartete es 4 s nach jeder Berührung, und wer sich durch
// die App bewegte, sah es nie. Ausgesetzt wird unter einem Blatt oder
// Fenster — dort ist es nicht zu sehen —, im Verlauf, auf einer versteckten
// Seite und solange eine Ansicht sich aufbaut; dann kommt der nächste Versuch nach
// 2 s statt nach der vollen Pause. Zuerst kam alle 30 bis 55 s ein Licht
// wie beim Ankommen, nur halb so hell: zu selten, um die Liga lebendig
// wirken zu lassen, und zu schnell, um ruhig zu sein. Geplant vom ersten
// Bild des Öffnens an.
const LEISE_MS = [7000, 12000];
const LEISE_NOCHMAL_MS = 2000;
const LEISE_FOLGE = ['karte', 'karte', 'news', 'karte', 'knopf', 'karte', 'zeichen'];
// Je Ansicht, was dort zählt, und in welcher Farbe: das Metall der Plätze,
// Acid, wo es keine Plätze gibt. Chronik, Eingabe und Einstellungen haben
// keine Karte dieser Art; dort wechseln Pille, Knopf und Zeichen. Im Verlauf
// ruht es ganz (`RUHIGE_REITER`).
const LEISE_KARTEN = {
  ranking:{sel:'.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3', metall:true},
  positions:{sel:'.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3', metall:true},
  teams:{sel:'.rlist > .rrow.tm-top', metall:true},
  'awards:awards':{sel:'.podest > .pod-karte', metall:true},
  'awards:rekorde':{sel:'.rek-besitz, .rek'},
};
let _leiseAuftrag = 0, _leiseSchritt = 0, _leiseKarte = 0, _leiseZuletzt = null;
function _leisePlanen(kurz){
  clearTimeout(_leiseAuftrag);
  _leiseAuftrag = setTimeout(() => _leisePlanen(!_leisesLicht()),
    kurz ? LEISE_NOCHMAL_MS : LEISE_MS[0] + Math.random() * (LEISE_MS[1] - LEISE_MS[0]));
}
function _leisesLicht(){
  if(_bewegungRuhig() || document.hidden || _aufbauTeile.length || RUHIGE_REITER.has(tab)) return null;
  if(document.querySelector('.sheet.show, .nd-bg.show, .bp-bg.show, #main .kl, .appbar .kl, #fab .kl')) return null;
  for(let n = 0; n < LEISE_FOLGE.length; n++){
    const z = _leiseZiel(LEISE_FOLGE[_leiseSchritt++ % LEISE_FOLGE.length]);
    if(!z) continue;
    _leiseZuletzt = z.el;
    return kantenlicht(z.el, z.ton, z.art, 0, z.d, z.innen, true);
  }
  return null;
}
function _leiseZiel(was){
  if(was === 'karte'){
    const view = document.querySelector('#main > .view');
    const art = LEISE_KARTEN[tab === 'awards' ? 'awards:' + awView : tab];
    if(!view || !art) return null;
    const alle = [...view.querySelectorAll(art.sel)].slice(0, art.n || 3), unten = innerHeight - 90;
    for(let i = 0; i < alle.length; i++){
      const k = (_leiseKarte + i) % alle.length, z = alle[k], r = z.getBoundingClientRect();
      if(z === _leiseZuletzt || r.top < 0 || r.bottom > unten) continue;
      _leiseKarte = k + 1;
      return {el:z, ton:art.metall ? _metallTon(z, k) : 'acid', art:'zeichnen', d:Math.hypot(r.width, r.height) + 8};
    }
    return null;
  }
  if(was === 'news'){
    const b = document.getElementById('newsBtn'), zahl = document.getElementById('newsBtnBadge'), t = document.getElementById('newsToast');
    if(!b || b === _leiseZuletzt || b.classList.contains('wartet') || !zahl || zahl.style.display === 'none'
      || (t && t.classList.contains('show'))) return null;
    return {el:b, ton:'acid', art:'hinweis', d:120};
  }
  if(was === 'knopf'){
    const f = document.getElementById('fab');
    if(!f || f === _leiseZuletzt || f.style.display === 'none' || !f.offsetWidth) return null;
    return {el:f, ton:'weiss', art:'zeichnen', d:90};
  }
  const l = document.querySelector('.logo-mark');
  return l && l !== _leiseZuletzt ? {el:l, ton:'acid', art:'zeichnen', d:60, innen:true} : null;
}

// ── Neuigkeiten ────────────────────────────────────────────────────────
// Die Pille „News" steht vom ersten Bild an als Gerüst an ihrem Platz
// (`.wartet`, festes Markup); ihre Stories kommen nach der Liga — aus dem
// Stand des Geräts oder nach dem Abgleich mit der Datenbank. Vorher war dort
// nichts, und sie stand plötzlich da, sichtbar später als alles andere. Sind
// die Stories da, färbt sie sich ein, Zeichen und Wort gleiten herein, die
// Zahl springt auf (`.kommt`); gibt es Ungelesenes, fährt zweimal Licht um
// sie — hier ist etwas neu [§C41]. Aus `newsBadgeRefresh`, einmal.
function _pilleKommt(btn, ungelesen){
  if(_bewegungRuhig()) return;
  btn.classList.add('kommt');
  setTimeout(() => btn.classList.remove('kommt'), 1100);
  if(ungelesen) kantenlicht(btn, 'acid', 'hinweis', 350, 120);
}
// Kommt der Hinweis „x neue Stories" (`_newsToastZeigen`), fährt zweimal
// Licht um seine Kante, von der Pille geht zweimal ein Ring aus, und ihre
// Zahl springt auf. Danach steht alles still: der Lichtlauf, der vorher
// alle vier Sekunden über den Hinweis zog, entfällt.
let _rufAuftrag = 0;
function _hinweisBewegung(toast){
  if(_bewegungRuhig()) return;
  toast.querySelectorAll(':scope > .kl, :scope > .kl-schein').forEach(e => e.remove());
  kantenlicht(toast, 'acid', 'hinweis', 120, 300);
  const teile = [document.getElementById('newsBtn'), document.getElementById('newsBtnBadge')].filter(Boolean);
  clearTimeout(_rufAuftrag);
  // Ein Hinweis kurz nach dem letzten startet den Ring neu.
  teile.forEach(e => e.classList.remove('ruf'));
  if(teile[0]) void teile[0].offsetWidth;
  teile.forEach(e => e.classList.add('ruf'));
  _rufAuftrag = setTimeout(() => teile.forEach(e => e.classList.remove('ruf')), 2400);
}

// ── Blätter und Fenster ────────────────────────────────────────────────
// Ein Blatt kommt gestaffelt: die ersten acht Teile 45 ms auseinander, wie
// eine Ansicht. Trägt ein Rahmen den ganzen Inhalt, zählen seine Kinder; das
// Profil hat seine eigene Folge. Vorher blendete der Inhalt als ein Block
// ein. Aus `openSheet`.
const BLATT_TEILE = 8;
function _blattStaffeln(sheet){
  if(!sheet || _bewegungRuhig()) return;
  let teile = [...sheet.children].filter(k => !k.classList.contains('sheet-leiste'));
  if(teile.length === 1){
    if(teile[0].classList.contains('pp-root')) return;
    teile[0].classList.add('staffel');
    teile = [...teile[0].children];
  }
  teile.slice(0, BLATT_TEILE).forEach((k, i) => { k.classList.add('staffel-k'); k.style.animationDelay = i * 45 + 'ms'; });
}

// ── Die Vorstellung eines Rückblicks ───────────────────────────────────
// Der Saison-Rückblick stellt vor, statt aufzuzählen [§C31]: zuerst der
// Meister, groß in der Mitte, Licht hinter ihm; dann setzt er sich auf
// seinen Platz, ein Ring geht von ihm aus, Platz 2 und 3 steigen dazu, um
// alle drei fährt Licht in ihrem Metall, und der Kranz geht auf; dann das
// Team der Saison mit Licht in Blau; dann der Rest. Vorher kam das Blatt wie
// jedes andere, acht Teile 45 ms auseinander, und der Meister war eine Karte
// unter vielen. Der Wochenrückblick stellt leiser vor: der Spieler der Woche
// kommt mit Licht an der Kante und einem Ring um sein Gesicht, dann der Rest
// — eine Woche ist kein Monat [§C25]. Wechselt der Monat im Blatt, steigt
// der Meister nur zuerst auf (`wechsel`): wer durch die Monate blättert,
// sähe sonst jedes Mal zwei Sekunden Auftritt. Zurück aus einem Blatt
// darüber stellt nichts vor (`openSheet`).
//
// Was unter dem Rand steht, kommt erst, wenn es hereingescrollt wird
// (`.vs-w` → `.vs-da`, gemeldet von einem IntersectionObserver), und alles
// darin steht bis dahin still: Balken, Linien, Zellen und Säulen wuchsen
// vorher beim Öffnen, weit unter dem Rand, und wer hinkam, sah sie fertig.
//
// Gezeitet wird mit Klassen zu ihrer Zeit, nicht mit `animation-delay`:
// eine wartende Animation ist für Safari schon eine laufende, mit eigener
// Ebene [§C43]. Jede Berührung beendet die Vorstellung (`_vorstellungEnde`):
// was im Bild steht, steht sofort, was darunter wartet, kommt beim
// Hereinscrollen. Die Zeiten in ms ab dem Öffnen; `spaet` ist der früheste
// Zeitpunkt für das, was nachkommt (`rcpSpaetLaden`): es kostet beim ersten
// Öffnen gemessen 790 ms Hauptthread (vierfach gedrosselt), und so lange
// stünden die Zeitgeber der Vorstellung still.
const VORSTELLUNG = {
  saison:{gross:true, meister:0, silber:1000, bronze:1120, kranz:1150, landung:1200, licht:1250,
          team:1450, rest:1850, schritt:70, spaet:2500, ende:3000},
  wechsel:{meister:0, silber:120, bronze:240, kranz:300, landung:520, licht:280,
          team:420, rest:640, schritt:55, spaet:1100, ende:1500},
  woche:{held:0, licht:380, ring:420, rest:560, schritt:55, spaet:1150, ende:1500}
};
function _vorstellung(sheet, art){
  const Z = VORSTELLUNG[art];
  if(!Z || _bewegungRuhig() || typeof IntersectionObserver !== 'function') return _blattStaffeln(sheet);
  const vs = sheet._vs = {Z, t0:performance.now(), laeuft:true, wartet:new Set(), auftraege:[], zuletzt:0, io:null};
  vs.zu = (ms, fn) => vs.auftraege.push(setTimeout(() => { if(sheet._vs === vs) fn(); }, ms));
  // 40 px unter dem unteren Rand: was hereinkommt, hat sein Einblenden
  // schon begonnen. Gemeldet erst an der Kante, stand beim Scrollen eine
  // halbe Sekunde lang eine leere Fläche, wo die Tabelle hingehörte.
  vs.io = new IntersectionObserver(eintraege => eintraege.forEach(e => {
    const el = e.target;
    if(sheet._vs !== vs || !vs.wartet.has(el)) return vs.io.unobserve(el);
    el._vsSicht = e.isIntersecting;
    el._vsMass = e.boundingClientRect;
    if(e.isIntersecting) _vsPlanen(vs, el);
  }), {rootMargin:'0px 0px 40px 0px'});
  const teile = [...sheet.children].filter(k => !k.classList.contains('sheet-leiste'));
  const finde = sel => teile.find(k => k.matches(sel));
  const kopf = finde('.rcp-head'), buehne = finde('.rcp-buehne'), held = finde('.rcp-held'), team = finde('.rcp-team');
  // Beim Wechsel des Monats steht der Kopf mit seinem Wähler, wie bei jedem
  // Wechsel im Reiter: kam er neu herein, verschwand der Monat, auf den man
  // eben getippt hatte, unter dem Finger.
  if(kopf && art === 'wechsel') kopf.classList.add('vs');
  else if(kopf){
    kopf.classList.add('vs-kopf');
    const marke = kopf.querySelector('.rcp-label');
    if(marke) _glanzEinmal(marke, 380);
  }
  if(buehne) _vsBuehne(vs, buehne);
  if(held) _vsHeld(vs, held);
  if(team) _vsWarten(vs, team, vs.t0 + Z.team);
  let k = 0;
  teile.forEach(t => {
    if(t !== kopf && t !== buehne && t !== held && t !== team) _vsWarten(vs, t, vs.t0 + Z.rest + Math.min(k++, 8) * Z.schritt);
  });
  vs.zu(Z.ende, () => { vs.laeuft = false; });
}
// Die Bühne: der Meister groß (`.vs-gross`) oder, beim Wechsel des Monats,
// zuerst; Platz 2 und 3 zu ihrer Zeit, das Licht um alle drei im Takt jedes
// anderen Podests (`PODEST_VERSATZ`), wartend ohne Kasten (`kantenlicht`).
function _vsBuehne(vs, buehne){
  const Z = vs.Z, karte = m => buehne.querySelector('.pod-karte.' + m);
  const gold = karte('gold'), silber = karte('silber'), bronze = karte('bronze');
  buehne.classList.add('vs', 'vs-buehne');
  if(gold){
    if(Z.gross){
      gold.classList.add('vs', 'vs-gross'); buehne.classList.add('vs-spot');
      vs.zu(Z.landung + 120, () => gold.classList.remove('vs-gross'));
    } else _vsDirekt(vs, gold, Z.meister);
    vs.zu(Z.landung, () => gold.classList.add('vs-ring'));
  }
  if(silber) _vsDirekt(vs, silber, Z.silber);
  if(bronze) _vsDirekt(vs, bronze, Z.bronze);
  vs.zu(Z.kranz, () => buehne.classList.add('vs-kranz'));
  [gold, silber, bronze].forEach(z => {
    if(!z) return;
    const ton = _metallTon(z, 0);
    kantenlicht(z, ton, 'zeichnen', Z.licht + PODEST_VERSATZ[ton], _diagonale('podest'));
  });
}
// Der Held der Woche: er kommt sofort, mit Licht innen an seiner Kante —
// die Karte schneidet ab, was über ihren Rand ragt — und einem Ring um sein
// Gesicht. Die Größe der Karte ist geschätzt: die Spalte und die Höhe, die
// sie mit zwei Reihen Zahlen nicht überschreitet.
function _vsHeld(vs, held){
  const Z = vs.Z;
  held.classList.add('vs', 'vs-da');
  vs.zu(Z.ring, () => held.classList.add('vs-ring'));
  kantenlicht(held, 'gold', 'zeichnen', Z.licht, Math.hypot(Math.min(innerWidth, 520) - 40, 340) + 8, true);
}
function _vsWarten(vs, el, ab){
  el.classList.add('vs', 'vs-w');
  el._vsAb = ab; el._vsGeplant = false; el._vsSicht = false;
  vs.wartet.add(el);
  vs.io.observe(el);
}
// Was im ersten Bild sicher steht, kommt zu seiner Zeit, ohne Beobachter.
function _vsDirekt(vs, el, ms){
  el.classList.add('vs', 'vs-w');
  el._vsDirekt = true;
  vs.wartet.add(el);
  vs.zu(ms, () => _vsKommt(vs, el));
}
// Was hereinkommt, kommt zu seiner Zeit in der Vorstellung, danach sofort;
// mehrere zugleich — schnell gescrollt — nacheinander.
function _vsPlanen(vs, el){
  if(el._vsGeplant) return;
  el._vsGeplant = true;
  const jetzt = performance.now();
  const ab = Math.max(jetzt, vs.laeuft ? el._vsAb : 0, vs.zuletzt + (vs.laeuft ? vs.Z.schritt : 45));
  vs.zuletzt = ab;
  vs.zu(ab - jetzt, () => _vsKommt(vs, el));
}
function _vsKommt(vs, el){
  if(!vs.wartet.delete(el)) return;
  vs.io.unobserve(el);
  el.classList.remove('vs-w');
  el.classList.add('vs-da');
  _vsLicht(el);
}
// Licht, wo eine Karte ankommt, die zählt [§C41]: um das Team der Saison in
// Blau, dazu einmal sein Glanz; in der Tabelle um Platz 1 bis 3 in ihrem
// Metall. Die Größe meldet der Beobachter mit dem Hereinkommen.
function _vsLicht(el){
  const m = el._vsMass, b = m && m.width ? m.width : Math.min(innerWidth, 520) - 40;
  if(el.matches('.rcp-team')){
    kantenlicht(el, 'blau', 'zeichnen', 160, Math.hypot(b, m && m.height ? m.height : 130) + 8);
    _glanzEinmal(el, 520, 'blau');
  } else if(el.matches('.rcp-tab')){
    [...el.children].slice(0, 3).forEach((z, i) => {
      const ton = _metallTon(z, i);
      kantenlicht(z, ton, 'zeichnen', 300 + PODEST_VERSATZ[ton], Math.hypot(b, 44) + 8);
    });
  }
}
// Was nachkommt (`rcpSpaetLaden`), kommt wie alles darunter beim
// Hereinscrollen; sein Platzhalter wartet nicht mehr.
function _vorstellungNach(da, alt){
  const sheet = _bewegungDa() && da && da.closest ? da.closest('.sheet') : null, vs = sheet && sheet._vs;
  if(!vs) return;
  if(alt && vs.wartet.delete(alt)) vs.io.unobserve(alt);
  [...da.children].forEach(k => _vsWarten(vs, k, 0));
}
function _vorstellungRest(sheet){
  const vs = sheet && sheet._vs;
  return vs ? Math.max(0, vs.t0 + vs.Z.spaet - performance.now()) : 0;
}
// Eine Berührung: was im Bild steht oder schon an der Reihe war, steht
// sofort, auch was darin wachsen sollte; was darunter wartet, kommt beim
// Hereinscrollen. Das Licht läuft zu Ende.
function _vorstellungEnde(){
  const sheet = typeof document !== 'undefined' && document.getElementById ? document.getElementById('sheet') : null;
  const vs = sheet && sheet._vs;
  if(!vs || !vs.laeuft) return;
  vs.laeuft = false;
  vs.auftraege.forEach(clearTimeout); vs.auftraege = [];
  sheet.querySelectorAll('.vs-gross, .vs-spot').forEach(e => e.classList.remove('vs-gross', 'vs-spot'));
  sheet.querySelectorAll('.vs-buehne').forEach(e => e.classList.add('vs-kranz'));
  vs.wartet.forEach(el => {
    if(!el._vsDirekt && !el._vsSicht){ el._vsGeplant = false; return; }
    vs.wartet.delete(el); vs.io.unobserve(el);
    el.classList.remove('vs-w');
    el.getAnimations({subtree:true}).forEach(a => {
      if(a.effect && a.effect.getTiming().iterations !== Infinity) try { a.finish(); } catch(e){}
    });
  });
}
// Ein neues Blatt: die alte Vorstellung hört auf, ihr Beobachter auch.
function _vorstellungAus(sheet){
  const vs = sheet && sheet._vs;
  if(!vs) return;
  sheet._vs = null;
  vs.auftraege.forEach(clearTimeout);
  vs.io.disconnect();
}
// Im Feed fährt um jede ungelesene Story im Bild ein Licht in ihrer Farbe,
// eine nach der anderen: das kam seit dem letzten Öffnen dazu. Höchstens
// sechs. Welche im Bild stehen und wie groß sie sind, sagt ein Beobachter
// mit dem nächsten Bild, sobald das Blatt eingefahren ist — vorher stünden
// alle Karten noch unter dem Bildrand. Gemessen mit `getBoundingClientRect`,
// erzwang das mitten im Nachreichen des Feeds ein Layout aller Karten, und
// das Öffnen kostete gemessen 200 ms Hauptthread mehr. Die Karte schneidet
// ab, was über ihren Rand ragt: das Licht liegt innen. Aus `openNewsFeed`.
function _feedLicht(sheet){
  if(!sheet || _bewegungRuhig() || typeof IntersectionObserver !== 'function') return;
  const auf = sheet._auf;
  setTimeout(() => {
    if(sheet._auf !== auf || !sheet.classList.contains('show')) return;
    const karten = [...sheet.querySelectorAll('.nf-card:not(.read)')].slice(0, 12);
    if(!karten.length) return;
    const io = new IntersectionObserver(eintraege => {
      io.disconnect();
      if(sheet._auf !== auf || !sheet.classList.contains('show')) return;
      eintraege.filter(e => e.isIntersecting).slice(0, 6).forEach((e, i) =>
        kantenlicht(e.target, 'story', 'zeichnen', i * 200, Math.hypot(e.boundingClientRect.width, e.boundingClientRect.height) + 8, true));
    });
    karten.forEach(k => io.observe(k));
  }, 280);
}
// Öffnet eine Story oder eine Auszeichnung, fährt das Licht einmal ihre
// Kante ab, in der Farbe der Story, Weiß für die Auszeichnung. Beide Fenster
// scrollen selbst: das Licht liegt innen — sein Rand gäbe sonst einen Pixel
// zu scrollen —, und wer scrollt, beendet es; es liefe sonst mit dem Inhalt
// davon. Gemessen wird nach dem Öffnen, wenn das Layout steht.
function _fensterLicht(el, ton){
  if(!el || _bewegungRuhig()) return;
  const auf = el._auf = (el._auf || 0) + 1;
  const weg = () => el.querySelectorAll(':scope > .kl, :scope > .kl-schein').forEach(e => e.remove());
  setTimeout(() => {
    if(el._auf !== auf || !el.parentElement.classList.contains('show')) return;
    weg();
    kantenlicht(el, ton, 'zeichnen', 0, Math.hypot(el.offsetWidth, el.offsetHeight) + 8, true);
    el.addEventListener('scroll', weg, {once:true, passive:true});
  }, 120);
}
// Was ein Blatt oder Fenster verdeckt, steht still: der Vorhang davor trägt
// eine Unschärfe, und jedes Bild einer Bewegung darunter rechnet sie neu.
// Was dort endlos läuft, trägt `.steht`, und das CSS hält es an; das Licht
// darunter verlischt — es endet ohnehin bald. Angehalten wird über CSS,
// nicht mit `pause()`: eine CSS-Animation, die einmal über die Schnittstelle
// angehalten und fortgesetzt wurde, löst Chrome von ihrer Regel. Der Punkt
// oben links pulsierte danach auch nach „verbunden" weiter, und wechselte
// unter dem Blatt seine Klasse, lief der alte Puls neben dem neuen. Und nur,
// was läuft: eine Klasse am ganzen Bereich rechnete den Stil jedes Knotens
// neu, in den Awards gemessen 65 ms beim Anhalten und 45 ms beim Fortsetzen
// (vierfach gedrosselt) — mitten im Zuschieben des Blatts. Fenster liegen
// über Blättern: jedes Element zählt, wie oft es angehalten ist.
const VERDECKT = {blatt:'#main, .appbar, #botnav, #fab', nd:'#sheet, #bp, #main, .appbar, #botnav, #fab',
  bp:'#sheet, #main, .appbar, #botnav, #fab'};
const _verdeckt = {};
function _verdecken(wer, an){
  if(!_bewegungDa()) return;
  const war = _verdeckt[wer];
  if(!an){
    _verdeckt[wer] = null;
    if(Array.isArray(war)) war.forEach(e => { e._steht = Math.max(0, (e._steht || 0) - 1); if(!e._steht) e.classList.remove('steht'); });
    return;
  }
  if(war) return;
  // Erst, wenn das Blatt eingefahren ist: dann ist der Stil gerechnet, und
  // die Bilder des Hereinfahrens gehören dem Blatt. Ein Zeitgeber, kein
  // Bildauftrag — die Bilder des Blatts zählen seine Prüfungen einzeln.
  _verdeckt[wer] = 'bald';
  setTimeout(() => {
    if(_verdeckt[wer] !== 'bald') return;
    const bereich = VERDECKT[wer], ziele = new Set();
    document.querySelectorAll(bereich.split(', ').map(b => b + ' :is(.kl, .kl-schein, .glanz-einmal)').join(', '))
      .forEach(e => e.remove());
    document.getAnimations().forEach(a => {
      const t = a.effect && a.effect.target;
      if(t && t.closest && a.playState === 'running' && a.effect.getTiming().iterations === Infinity && t.closest(bereich)) ziele.add(t);
    });
    ziele.forEach(e => { e._steht = (e._steht || 0) + 1; e.classList.add('steht'); });
    _verdeckt[wer] = [...ziele];
  }, 300);
}
// Ein geschlossenes Fenster behielt seinen Inhalt — unsichtbar, mit allem,
// was darin endlos läuft. Nach dem Ausblenden (0,2 s) wird es geleert, wie
// das Blatt es schon tut, außer es ist inzwischen wieder offen.
function _fensterZu(bg, el, wer){
  _verdecken(wer, false);
  if(!bg || !el) return;
  setTimeout(() => { if(!bg.classList.contains('show')) el.innerHTML = ''; }, 260);
}

// ── Nur, was man sieht, bewegt sich ────────────────────────────────────
// Was endlos läuft, hält an, solange es nicht im Bild steht, und läuft
// weiter, wenn es hineinkommt — dieselbe Klasse `.steht`, gezählt wie beim
// Verdecken. Im Feed liefen 24 bis 27 endlose Bewegungen — Glanz, Atmen,
// Puls der Karten —, die meisten auf Karten weit außerhalb des Bilds, und
// kosteten den Hauptthread gemessen 220 ms je Sekunde (vierfach gedrosselt),
// auch ganz unten gescrollt, wo keine davon zu sehen war: Chrome hält
// Bewegung außerhalb des Bilds nicht von selbst an. Bemerkt wird jede
// endlose Bewegung an ihrem Beginn (`animationstart`), wo immer sie
// entsteht, auch auf Karten, die der Feed erst beim Scrollen anlegt; ob sie
// im Bild steht, sagt ein IntersectionObserver, ohne Layout zu erzwingen —
// 80 px vor dem Rand, damit sie schon läuft, wenn sie hereinkommt.
// Beobachtet wird das nächste HTML-Element, nie ein Pfad oder eine Gruppe in
// einem SVG, und sein Befund gilt für alles, was darin läuft: Safari meldet
// SVG-Inhalt dem Beobachter nie als sichtbar, und die Bilder des Feuers —
// Pfade im SVG des Avatars — standen dort im Profil wie in der Rangliste
// still.
let _bewegSicht = null;
const _sichtGruppen = new Map();   // beobachtetes Element → was darin endlos läuft
function _sichtSetzen(el, aus){
  if(aus === !!el._ausSicht) return;
  el._ausSicht = aus;
  el._steht = Math.max(0, (el._steht || 0) + (aus ? 1 : -1));
  el.classList.toggle('steht', el._steht > 0);
}
function _sichtLoesen(wache){
  _bewegSicht.unobserve(wache);
  (_sichtGruppen.get(wache) || []).forEach(el => { el._sicht = null; _sichtSetzen(el, false); });
  _sichtGruppen.delete(wache);
}
function _bewegungBeobachten(el){
  let wache = el;
  while(wache && typeof SVGElement === 'function' && wache instanceof SVGElement) wache = wache.parentElement;
  if(!wache) return;
  if(!_bewegSicht) _bewegSicht = new IntersectionObserver(eintraege => eintraege.forEach(e => {
    const gruppe = _sichtGruppen.get(e.target);
    if(!gruppe) return;
    if(!e.target.isConnected) return _sichtLoesen(e.target);
    gruppe.forEach(x => x.isConnected ? _sichtSetzen(x, !e.isIntersecting) : gruppe.delete(x));
  }), {rootMargin:'80px'});
  // Was nicht mehr im Dokument steht, wird nicht weiter beobachtet.
  _sichtGruppen.forEach((g, w) => { if(!w.isConnected) _sichtLoesen(w); });
  el._sicht = wache;
  const gruppe = _sichtGruppen.get(wache);
  if(gruppe){ gruppe.add(el); _bewegSicht.unobserve(wache); }
  else _sichtGruppen.set(wache, new Set([el]));
  // Neu beobachtet meldet der Beobachter die Lage sofort — auch für das
  // neue Mitglied einer Gruppe, die schon außerhalb steht.
  _bewegSicht.observe(wache);
}
if(_bewegungDa() && typeof IntersectionObserver === 'function')
  document.addEventListener('animationstart', e => {
    const el = e.target;
    if(!(el instanceof Element) || (el._sicht && el._sicht.isConnected)) return;
    const cs = getComputedStyle(el, e.pseudoElement || null);
    const namen = cs.animationName.split(', '), zahl = cs.animationIterationCount.split(', ');
    const i = namen.indexOf(e.animationName);
    if(i >= 0 && zahl[i % zahl.length] === 'infinite') _bewegungBeobachten(el);
  }, true);
// Eine Karte im Feed bewegt sich nur, solange sie im Bild steht
// (`.im-bild`); bis der Beobachter das sagt, steht alles in ihr still. Die
// Karten tragen `content-visibility`, und Chromium legt die Bewegungen einer
// Karte schon an, wenn das Öffnen des Blatts das Layout erzwingt — bevor es
// die Karte zum Überspringen vorsieht. Danach erreicht sie weder
// `animationstart` noch `.steht`: Stil rechnet Chromium im Übersprungenen
// nicht mehr, die Bewegung aber lief weiter, ohne sichtbare Wirkung und
// deshalb nicht auf der Grafikkarte, sondern jedes Bild im Hauptthread über
// den ganzen Feed. Gemessen kostete ein einziger Glanz 3000 px unter dem
// Bildrand so 130 statt 7 ms je Sekunde. Angehalten von Anfang an, braucht
// es keine Stiländerung im Übersprungenen: die Karte läuft an, wenn sie
// hereinkommt — dann wird sie gezeichnet —, und hält an, wenn sie das Bild
// verlässt, 80 px vor dem Rand und damit früher, als Chromium sie
// überspringt. Aus `_renderNewsFeed` und `_newsFeedRest`.
let _kartenSicht = null;
const _kartenBeobachtet = new Set();
const FEED_SICHT = typeof IntersectionObserver === 'function';
function _feedKartenSicht(liste){
  if(!FEED_SICHT || !liste) return;
  if(!_kartenSicht) _kartenSicht = new IntersectionObserver(eintraege => eintraege.forEach(e => {
    if(!e.target.isConnected){ _kartenSicht.unobserve(e.target); _kartenBeobachtet.delete(e.target); return; }
    e.target.classList.toggle('im-bild', e.isIntersecting);
  }), {rootMargin:'80px'});
  _kartenBeobachtet.forEach(k => { if(!k.isConnected){ _kartenSicht.unobserve(k); _kartenBeobachtet.delete(k); } });
  liste.querySelectorAll('.nf-card:not(.nf-brk):not(.nf-gross)').forEach(k => {
    if(_kartenBeobachtet.has(k)) return;
    _kartenBeobachtet.add(k); _kartenSicht.observe(k);
  });
}
// Ein Licht endet, wenn seine Karte das Bild verlässt — etwa weil das leise
// Licht beim Scrollen begann. Was in einem Blatt, einem Fenster oder dem
// Hinweis eben erst hereinfährt, steht in seiner ersten halben Sekunde noch
// außerhalb und behält sein Licht.
let _lichtSicht = null;
const LICHT_TEILE = ':scope > .kl, :scope > .kl-schein, :scope > .glanz-einmal';
function _lichtLoesen(el){
  if(_lichtSicht && el && !el.querySelector(LICHT_TEILE)) _lichtSicht.unobserve(el);
}
function _lichtBeobachten(ziel){
  if(typeof IntersectionObserver !== 'function') return;
  if(!_lichtSicht) _lichtSicht = new IntersectionObserver(eintraege => eintraege.forEach(e => {
    const el = e.target, teile = el.isConnected ? [...el.querySelectorAll(LICHT_TEILE)] : [];
    if(!teile.length) return _lichtSicht.unobserve(el);
    if(e.isIntersecting) return;
    const jung = performance.now() - Math.max(...teile.map(t => +t.dataset.t0 || 0)) < 500;
    if(jung && el.closest('.sheet, .nd, .bp, #newsToast')) return;
    teile.forEach(t => t.remove());
    _lichtSicht.unobserve(el);
  }));
  _lichtSicht.observe(ziel);
}

// Der Punkt oben links: ist die Verbindung zum ersten Mal da, geht zweimal
// ein Ring von ihm aus — jetzt ist es der Stand von jetzt. Aus `setConn`.
let _verbunden = false;
function _connBewegung(c){
  if(!_bewegungDa()) return;
  if(c === 'load') return _ladeStart('daten');
  _ladeEnde('daten');
  if(c !== 'ok' || _verbunden) return;
  _verbunden = true;
  const punkt = document.getElementById('connDot');
  if(!punkt || _bewegungRuhig()) return;
  punkt.classList.add('ping');
  setTimeout(() => punkt.classList.remove('ping'), 2000);
}
