// DAS BLATT — was ein Sheet mit einer Berührung macht, im echten Browser.
//
// Drei Dinge, die man einer Datei nicht ansieht und die alle schon falsch
// waren:
//
//   1. WEM GEHÖRT EINE GESTE. Das Blatt zieht bei einem Wisch nach unten
//      mit und schließt sich. Dafür ruft es preventDefault — und damit
//      steht jedes waagerechte Scrollen darin still, sobald das Blatt die
//      Geste an sich reißt. Genau so war es: geprüft wurde nur die
//      senkrechte Strecke, und ein Querwisch driftet fast immer ein Stück
//      nach unten. In der Laufbahn-Vitrine sah das aus, als spränge sie
//      zurück.
//
//   2. OB MAN JEDE STUFE ERREICHT. Die Vitrine zeigt fünf Insignien, eine
//      groß in der Mitte. Wischen allein hat die letzte nie erreicht;
//      jetzt ist jede Karte auch ein Ziel zum Antippen.
//
//   3. OB EIN WAPPEN SEINE VERLÄUFE FINDET. Die zwölf Verläufe eines
//      Zeichens hängen nur am Rang und am Glanz der Schwinge, nicht am
//      Spieler. Sie stehen deshalb einmal im Dokument, und jedes Wappen
//      verweist darauf. Ein Verweis auf einen Verlauf, den es nicht gibt,
//      wirft keinen Fehler und färbt nichts rot — die Fläche bleibt
//      einfach schwarz. Genau deshalb wird hier nachgesehen.
//
//   4. OB IM HINTERGRUND GELADEN WIRD. `loadAll` holt alle Spieler und alle
//      Partien, alle dreißig Sekunden — früher auch dann, wenn das Telefon
//      in der Tasche steckte.
//
// Alles vier lässt sich nur gerendert prüfen: es hängt an Ereignissen, an
// scrollLeft und an dem, was nach einem render() noch im Dokument steht.
const fs = require('fs');
const chromium = require('./browser.js').ladeChromium();
if(!chromium){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Eine Geste hat kein Markup; sie lässt sich nur gerendert messen.');
  console.log('  Lokal: npm install --no-save playwright-core');
  process.exit(2);
}

// ── Die echten Partien der Liga, wie in tafel ──
const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n,i) => '00000000-0000-4000-8000-' + String(i).padStart(12,'0'));
const packed = fs.readFileSync(__dirname + '/fixtures/matches.txt', 'utf8').trim();
const MATCHES = packed.split(';').map((row, i) => {
  const f = row.split(',').map(Number);
  const pos = k => f[4+k] === 0 ? 'drive' : 'reves';
  return {id:'m' + String(i).padStart(4,'0'),
    a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_side:pos(0), a2_side:pos(1), b1_side:pos(2), b2_side:pos(3),
    games_a:f[8], games_b:f[9], winner:f[10] === 0 ? 'A' : 'B',
    exp_a:f[11]/1000, created_at:new Date(f[12]*1000).toISOString(), deltas:{}};
});
const PLAYERS = NAMES.map((n,i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:.5,
  avatar_id:null, created_at:'2026-05-01T00:00:00Z'}));
const SEASONS = [
  {id:'2026-05', label:'Mai 2026',    start_date:'2026-04-30', end_date:'2026-05-31'},
  {id:'2026-06', label:'Juni 2026',   start_date:'2026-05-31', end_date:'2026-06-30'},
  {id:'2026-07', label:'Juli 2026',   start_date:'2026-06-30', end_date:'2026-07-31'},
  {id:'2026-08', label:'August 2026', start_date:'2026-07-31', end_date:'2026-08-31'},
];
const NOW = new Date(2026, 7, 26, 21, 0, 0).getTime();

const html = fs.readFileSync(require('./ziel.js'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nwindow.__k = {eval: c => eval(c)};\n' + code.slice(lc);
// Ohne die Stile der App misst man ein Dokument ohne Layout — und ein
// Karussell ohne overflow-x hat keinen Scrollbereich.
const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
const bodyStart = html.indexOf('<body', html.indexOf('</head>'));
const bodyHtml = html.slice(bodyStart, html.indexOf('<script', bodyStart))
  .replace(/<script[\s\S]*?<\/script>/gi, '');

const BOOT = `
(function(){
  const stub = () => new Proxy(function(){}, {get(_,p){return p==='then'?undefined:stub()}, apply(){return stub()}});
  window.supabase = {createClient: () => ({from: () => stub(), channel: () => stub(), removeChannel(){}, rpc: () => stub()})};
  window.fetch = () => new Promise(()=>{});
  window.setInterval = () => 0;
  const RD = Date, N = ${NOW};
  window.Date = class extends RD { constructor(...a){ a.length?super(...a):super(N); } static now(){ return N; } };
})();
`;

let fails = 0, checks = 0;
const ok = (c, msg, det) => {
  checks++; if(!c) fails++;
  console.log((c ? '  ok  ' : '  FAIL') + '  ' + msg + (!c && det ? ' → ' + det : ''));
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8">' + styles
    + '</head>' + bodyHtml + '</body></html>');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  const K = async src => page.evaluate(s => window.__k.eval(s), src);
  ok(errors.length === 0, 'Skript lädt ohne Fehler', errors[0]);
  // Karten außerhalb des Bildschirms legt der Feed erst, wenn sie hineinkommen
  // (`content-visibility:auto`) — ihr Inhalt hat bis dahin keine Geometrie.
  // Gemessen wird hier aber, wie eine Karte AUSSIEHT, also so, wie sie auf
  // dem Bildschirm liegt. Dass die Regel greift, prüft ein eigener Check.
  await page.addStyleTag({content: '.nf-card{content-visibility:visible!important}'})
    .then(h => h.evaluate(e => e.id = 'cv-aus'));

  await K(`
    players = ${JSON.stringify(PLAYERS)};
    matches = ${JSON.stringify(MATCHES)};
    seasons = ${JSON.stringify(SEASONS)};
    invalidateCache();
    const _rc = simulateEloWithSliders(matches);
    const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
    matches.forEach(m => { m.deltas = _d[m.id] || {}; });
    invalidateCache();
    const _g = getGlobalSim();
    seasons.forEach(s => {
      const snap = _g.seasonEndElos[s.id] || {}, pl = _g.seasonPlayed[s.id] || {};
      const top = Object.keys(pl).filter(id => pl[id] > 0)
        .map(id => ({id, elo:Math.round(snap[id] ?? cfg.start_elo), wins:0, losses:0}))
        .sort((a,b) => b.elo - a.elo);
      s.top_elo = JSON.stringify(top.slice(0,3));
      s.player_id = top[0] ? top[0].id : null;
    });
    invalidateCache();
    bindSheetSwipe();
    'bereit'`);

  // ── DER INHALTSTAUSCH HÄNGT AM ENDE DES ZUSCHIEBENS ─────────────────
  //    Beim Zurückgehen schiebt sich das Kind-Blatt nach unten, der Inhalt
  //    wird getauscht, das Eltern-Blatt kommt hoch. Der Tausch baut das
  //    Eltern-Blatt neu, und der Feed kostet dabei gemessen über 100 ms
  //    Hauptthread — 94 % seines Markups sind die SVG der Wappen.
  //    Geplant war er per `setTimeout(200)`, und ein Timer ist nicht das Ende
  //    einer Transition: er läuft ab dem Aufruf, die Transition erst ab dem
  //    nächsten Style-Flush. Der Block fiel damit in die letzten Bilder des
  //    Zuschiebens und riss sie ab.
  //    Gemessen wird der ABSTAND zwischen dem `transitionend` des Zuschiebens
  //    und dem Tausch. Die Position des Blatts taugt dafür nicht — sie steht
  //    in beiden Fassungen auf 100 %, weil der Umbau vor dem nächsten Bild
  //    fertig wird. Und bei den echten 200 ms liegen Timer und Transitionsende
  //    so dicht beieinander, dass der Vergleich zufällig ausfällt: die Dauer
  //    wird deshalb für die Messung heruntergesetzt, damit ein Timer
  //    überhaupt von einem Ende zu unterscheiden ist.
  //    Das Kind-Blatt muss dafür erst stehen: wird es im selben Durchlauf
  //    geöffnet und geschlossen, wechselt sein Transform nie und es gibt
  //    überhaupt keine Transition, die enden könnte.
  console.log('\n═══ DER TAUSCH HÄNGT AM ENDE DES ZUSCHIEBENS ═══');
  const stapel = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const st = document.createElement('style');
    st.id = 'messDauer';
    st.textContent = '#sheet{transition-duration:20ms !important}';
    document.head.appendChild(st);
    K('openSheet("<h3>Eltern</h3><div id=\'elternMark\'>da</div>")');
    window.__swapT = null;
    K('_sheetSetReopen(function(){ window.__swapT = performance.now() - window.__t0;'
      + ' openSheet("<h3>Eltern</h3><div id=\'elternMark\'>da</div>"); })');
    K('_pushCurrentSheet(); openSheet("<h3>Kind</h3>")');
    return K('_sheetStack.length');
  });
  await page.waitForTimeout(500);
  const swap = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const sheet = document.getElementById('sheet');
    // Der eigene Horcher wird VOR dem Schließen gesetzt und läuft damit vor
    // dem des Blatts: das erste Ende ist gemessen, bevor getauscht wird.
    window.__enden = [];
    const horch = (e) => {
      if(e.target === sheet && e.propertyName === 'transform')
        window.__enden.push(performance.now() - window.__t0);
    };
    sheet.addEventListener('transitionend', horch);
    return new Promise(res => {
      window.__t0 = performance.now();
      K('closeSheet()');
      setTimeout(() => {
        sheet.removeEventListener('transitionend', horch);
        const s = document.getElementById('messDauer');
        if(s) s.remove();
        res({tausch: window.__swapT, enden: window.__enden,
             elternDa: !!document.getElementById('elternMark')});
      }, 1200);
    });
  });
  ok(stapel === 1, 'ein Eltern-Blatt liegt auf dem Stapel', String(stapel));
  ok(swap.elternDa, 'nach dem Zurückgehen steht das Eltern-Blatt wieder da');
  ok(swap.tausch != null, 'der Tausch wurde gemessen', String(swap.tausch));
  ok(swap.enden.length >= 1, 'das Zuschieben läuft als Transition zu Ende',
     JSON.stringify(swap.enden));
  // Am Ende gemessen: 5 ms Abstand. Mit dem Timer waren es 180 ms, und in
  // dieser Zeit stand das Blatt unten und wartete.
  const zuEnde = swap.enden[0];
  const abstand = swap.tausch != null && zuEnde != null ? swap.tausch - zuEnde : null;
  ok(abstand != null && abstand >= -5 && abstand <= 100,
     'der Tausch hängt am Ende des Zuschiebens, nicht an einem Timer',
     abstand == null ? 'nicht gemessen' : Math.round(abstand) + ' ms Abstand');

  console.log('\n═══ 1. EINE GESTE GEHÖRT EINEM ═══');
  // Gewischt wird mit echten Touch-Ereignissen. Gemessen werden die beiden
  // Dinge, die der Blatt-Zug tut: preventDefault rufen (damit steht das
  // waagerechte Scrollen still) und das Blatt verschieben.
  await K(`showLaufbahn(${JSON.stringify(IDS[8])})`);
  await page.waitForTimeout(400);
  const gesten = await page.evaluate(async () => {
    const sheet = document.getElementById('sheet');
    const ziel = document.querySelector('.lb-k') || sheet;
    const feuern = (typ, x, y) => {
      const T = new Touch({identifier:1, target:ziel, clientX:x, clientY:y});
      const leer = typ === 'touchend';
      const ev = new TouchEvent(typ, {touches: leer ? [] : [T], changedTouches:[T],
        targetTouches: leer ? [] : [T], bubbles:true, cancelable:true});
      ziel.dispatchEvent(ev);
      return ev;
    };
    const wisch = async (dx, dy) => {
      sheet.style.transform = '';
      feuern('touchstart', 200, 300);
      let verhindert = false;
      for(let i = 1; i <= 10; i++)
        if(feuern('touchmove', 200 + dx*i/10, 300 + dy*i/10).defaultPrevented) verhindert = true;
      // Der Zug zeichnet nur den jüngsten Stand je Bild. Dieselbe Geste
      // wird am gezeichneten Bild gemessen, nicht innerhalb ihres Aufrufs.
      await new Promise(requestAnimationFrame);
      const zug = sheet.style.transform;
      feuern('touchend', 200 + dx, 300 + dy);
      sheet.style.transform = '';
      return {verhindert, gezogen: /translateY\([^0]/.test(zug)};
    };
    return {
      // Ein Querwisch driftet fast immer nach unten — 22 px auf 140 sind
      // eine ruhige Hand, 40 auf 160 eine normale.
      quer:      await wisch(-140, 22),
      querStark: await wisch(-160, 40),
      querZurueck: await wisch(150, 30),
      // Und das Blatt muss weiter zuziehen, sonst hat der Schutz zu viel
      // verboten.
      runter:    await wisch(8, 120),
      schraeg:   await wisch(60, 110)
    };
  });
  ['quer','querStark','querZurueck'].forEach(k => {
    ok(!gesten[k].verhindert && !gesten[k].gezogen,
       `waagerecht (${k}): das Blatt lässt die Geste in Ruhe`,
       JSON.stringify(gesten[k]));
  });
  ['runter','schraeg'].forEach(k => {
    ok(gesten[k].verhindert && gesten[k].gezogen,
       `senkrecht (${k}): das Blatt zieht mit`,
       JSON.stringify(gesten[k]));
  });

  // Die beiden senkrechten Wische haben das Blatt geschlossen, und ein
  // geschlossenes Blatt wird am Ende des Zuschiebens geleert. Vorher blieb
  // sein Inhalt stehen, und die Vitrine darunter wurde in einem Blatt
  // gemessen, das gar nicht mehr offen war.
  await K(`closeSheet(true);showLaufbahn(${JSON.stringify(IDS[8])})`);
  await page.waitForTimeout(400);
  console.log('\n═══ 2. DIE VITRINE IST EIN ZIEL ═══');
  // Fünf Stufen, und jede muss man ansehen können. Wischen allein hat die
  // letzte nicht erreicht — die Geste gehörte dem Blatt. Antippen ist der
  // zweite Weg, und der geht immer.
  const vitrine = await page.evaluate(async () => {
    const d = document.getElementById('lbLeiter');
    if(!d) return {fehlt:true};
    const k = [...d.querySelectorAll('.lb-k')];
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const out = {karten:k.length, schritte:[]};
    // Rückwärts, damit auch der Sprung über die ganze Breite dabei ist.
    for(const i of [6, 0, 3, 1, 5, 2, 4]){
      k[i].click();
      await warte(700);
      const mitte = d.scrollLeft + d.clientWidth / 2;
      out.schritte.push({i,
        fokus: k.findIndex(x => x.classList.contains('fokus')),
        // Wie weit die Karte von der Mitte des Fensters weg liegt.
        ab: Math.round(Math.abs(k[i].offsetLeft + k[i].offsetWidth/2 - mitte))});
    }
    return out;
  });
  ok(!vitrine.fehlt && vitrine.karten === 7,
     'die Vitrine steht mit allen sieben Stufen', JSON.stringify(vitrine));
  if(!vitrine.fehlt){
    const daneben = vitrine.schritte.filter(s => s.fokus !== s.i);
    ok(daneben.length === 0, 'jede angetippte Stufe wird die gewählte',
       daneben.map(s => s.i + '→' + s.fokus).join(' '));
    // Nicht nur „irgendwie hin", sondern MITTIG: die Karte in der Mitte ist
    // die große, und eine halb angeschobene Karte ist keine Auswahl.
    const schief = vitrine.schritte.filter(s => s.ab > 2);
    ok(schief.length === 0, 'und liegt danach in der Mitte',
       schief.map(s => s.i + ': ' + s.ab + ' px daneben').join(' '));
  }
  // Der Abstand vor der ersten und hinter der letzten Karte kam aus
  // Prozenten im padding eines Bands, das so breit ist wie sein Inhalt.
  // Safari rechnet sie dabei als null: am Telefon ließ sich der Ordensstern
  // nie in die Mitte schieben, und hier in Chromium war alles grün. Geprüft
  // wird deshalb die Ursache: kein padding, sondern zwei Glieder des Bands
  // mit der halben Restbreite — und Platz genug, die letzte Karte zu mitteln.
  const band = await page.evaluate(() => {
    const d = document.getElementById('lbLeiter'), b = d && d.querySelector('.lb-k-band');
    if(!b) return {fehlt:true};
    const cs = getComputedStyle(b), k = [...d.querySelectorAll('.lb-k')], letzte = k[k.length - 1];
    return {padL:cs.paddingLeft, padR:cs.paddingRight,
      vor:Math.round(parseFloat(getComputedStyle(b, '::before').width)),
      nach:Math.round(parseFloat(getComputedStyle(b, '::after').width)),
      soll:Math.round((d.clientWidth - 156) / 2),
      reicht:Math.round(d.scrollWidth - d.clientWidth - (letzte.offsetLeft + letzte.offsetWidth / 2 - d.clientWidth / 2))};
  });
  ok(!band.fehlt && band.padL === '0px' && band.padR === '0px'
     && Math.abs(band.vor - band.soll) <= 1 && Math.abs(band.nach - band.soll) <= 1 && band.reicht >= -1,
     'die Vitrine hält vor der ersten und hinter der letzten Karte die halbe Breite frei, ohne Prozente im padding',
     JSON.stringify(band));

  // ── Alle Stufen [§C30] ──────────────────────────────────────────────
  //    Jedes Feld der Leiter steht im Blatt, das eigene ist markiert, und ein
  //    Feld anzutippen legt genau dieses Bild in die Vitrine: seine Stufe in
  //    die Mitte, seinen Grad als gezeigten Knopf. Vorher gab es die Grade
  //    nur als Marken, und wie ein Grad aussieht, sah man nirgends.
  const alle = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const felder = [...document.querySelectorAll('#lbAlle [data-lbfeld]')];
    if(!felder.length) return {fehlt:true};
    const d = document.getElementById('lbLeiter'), k = [...d.querySelectorAll('.lb-k')];
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const jetzt = [...document.querySelectorAll('#lbAlle .lb-feld.jetzt')].map(b => b.getAttribute('data-lbfeld'));
    const bildVon = i => (k[i].querySelector('.lb-k-ins use') || {getAttribute:()=>''}).getAttribute('href');
    const out = {felder:felder.length, jetzt, schritte:[]};
    // Der Ordensstern zählt wie jede Stufe: drei Knöpfe I, II, III und
    // ihre Schwellen. Er stand mit „8 9 10“ und „je 500 eine Zacke“ da.
    out.sternKnoepfe = [...k[6].querySelectorAll('[data-lbgrad]')].map(b => b.textContent.trim()).join(' ');
    out.sternSchwellen = (k[6].querySelector('.lb-k-p') || {}).textContent || '';
    out.zacke = /Zacke/.test(document.querySelector('.lb-root').textContent);
    for(const f of ['5,2', '1,0', '3,1']){
      const [i, g] = f.split(',').map(Number);
      const vorher = bildVon(i);
      document.querySelector('#lbAlle [data-lbfeld="' + f + '"]').click();
      await warte(700);
      const zeigt = k[i].querySelector('[data-lbgrad].zeigt');
      out.schritte.push({f, fokus: k.findIndex(x => x.classList.contains('fokus')),
        zeigt: zeigt ? +zeigt.getAttribute('data-lbgrad') : null,
        bild: bildVon(i), soll: K('insigniumStufeSvg(INSIGNIEN[' + i + '].key, "Elite", ' + g + ')').match(/href="([^"]+)"/)[1],
        vorher});
    }
    return out;
  });
  ok(!alle.fehlt && alle.felder === 21, 'die Laufbahn zeigt alle einundzwanzig Felder',
     JSON.stringify({felder: alle.felder}));
  ok(!alle.fehlt && alle.jetzt.length === 1, 'genau ein Feld ist das eigene', JSON.stringify(alle.jetzt));
  ok(!alle.fehlt && alle.sternKnoepfe === 'I II III' && /II 6500 · III 7000/.test(alle.sternSchwellen) && !alle.zacke,
     'der Ordensstern steht in der Laufbahn mit den Graden I, II, III und ihren Schwellen',
     JSON.stringify({knoepfe:alle.sternKnoepfe, schwellen:alle.sternSchwellen, zacke:alle.zacke}));
  if(!alle.fehlt){
    const falsch = alle.schritte.filter(s => s.fokus !== +s.f[0] || s.zeigt !== +s.f[2]);
    ok(falsch.length === 0, 'ein angetipptes Feld liegt mit seinem Grad in der Vitrine',
       JSON.stringify(alle.schritte.map(s => ({f:s.f, fokus:s.fokus, zeigt:s.zeigt}))));
    const bild = alle.schritte.filter(s => !s.bild || s.bild.split('#').pop().split('"')[0] === '');
    ok(bild.length === 0 && alle.schritte.every(s => typeof s.bild === 'string' && s.bild.length > 1),
       'und die Vitrine zeigt dessen Bild', JSON.stringify(alle.schritte.map(s => s.bild)));
  }

  console.log('\n═══ 3. JEDES WAPPEN FINDET SEINE VERLÄUFE ═══');
  // Geprüft wird nach JEDEM Tabwechsel und jedem Blatt, denn genau daran
  // hängt es: render() ersetzt #app, openSheet ersetzt das Blatt — der Topf
  // mit den Verläufen steht außerhalb von beidem. Stünde er darin, wäre er
  // beim ersten Tabwechsel weg und jedes Metall danach schwarz.
  const verweise = [];
  for(const t of ['ranking', 'positions', 'awards', 'teams', 'history']){
    verweise.push(await page.evaluate(async (tab) => {
      const K = window.__k.eval.bind(window.__k);
      K('tab = ' + JSON.stringify(tab) + '; render()');
      await new Promise(r => requestAnimationFrame(r));
      const offen = new Set();
      document.querySelectorAll('svg *').forEach(e => {
        ['fill', 'stroke'].forEach(a => {
          const m = (e.getAttribute(a) || '').match(/^url\(#([^)]+)\)$/);
          if(m && !document.getElementById(m[1])) offen.add(m[1]);
        });
      });
      // Seit das Wappen in einer Liste ein `<use>` auf ein Symbol im selben
      // Topf ist [§C30], gilt dieselbe Frage fuer die Symbole: ein Verweis
      // auf eines, das es nicht gibt, wirft keinen Fehler und zeichnet
      // nichts — die Kachel bleibt leer. Gemessen wird deshalb beides.
      const verwaist = new Set();
      document.querySelectorAll('use').forEach(u => {
        const h = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
        const m = h.match(/^#(.+)$/);
        if(m && !document.getElementById(m[1])) verwaist.add(m[1]);
      });
      const t = document.getElementById('insDefs');
      return {tab, topf: !!t && !t.closest('#app') && !t.closest('.sheet'),
              wappen: document.querySelectorAll('svg.ins').length,
              // Gemessen wird das Bauteil der Liste (`.rav`, §C27), nicht
              // jede Zeichnung: die elf Stufen der Laufbahn tragen ihre
              // Verläufe absichtlich selbst und sind kein Verweis [§C30].
              rav: document.querySelectorAll('.rav > svg.ins').length,
              ravUse: document.querySelectorAll('.rav > svg.ins > use').length,
              // Nur die Wappen (`insy…`): im selben Topf stehen seit den
              // Bildern auch die Stufen der Leiter (`inst…`, §C30), und die
              // gehören nicht zu der Frage, wie viele Wappen sich eine
              // Zeichnung teilen.
              symbole: document.querySelectorAll('#insDefs defs > g[id^="insy"]').length,
              offen: [...offen].slice(0, 5), verwaist: [...verwaist].slice(0, 5)};
    }, t));
  }
  for(const ruf of ['showPlayer(players[8].id)', 'showLaufbahn(players[8].id)']){
    verweise.push(await page.evaluate(async (src) => {
      const K = window.__k.eval.bind(window.__k);
      K(src);
      await new Promise(r => requestAnimationFrame(r));
      const offen = new Set();
      document.querySelectorAll('svg *').forEach(e => {
        ['fill', 'stroke'].forEach(a => {
          const m = (e.getAttribute(a) || '').match(/^url\(#([^)]+)\)$/);
          if(m && !document.getElementById(m[1])) offen.add(m[1]);
        });
      });
      // Seit das Wappen in einer Liste ein `<use>` auf ein Symbol im selben
      // Topf ist [§C30], gilt dieselbe Frage fuer die Symbole: ein Verweis
      // auf eines, das es nicht gibt, wirft keinen Fehler und zeichnet
      // nichts — die Kachel bleibt leer. Gemessen wird deshalb beides.
      const verwaist = new Set();
      document.querySelectorAll('use').forEach(u => {
        const h = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
        const m = h.match(/^#(.+)$/);
        if(m && !document.getElementById(m[1])) verwaist.add(m[1]);
      });
      const t = document.getElementById('insDefs');
      return {tab: src.split('(')[0], topf: !!t && !t.closest('#app') && !t.closest('.sheet'),
              wappen: document.querySelectorAll('svg.ins').length,
              // Gemessen wird das Bauteil der Liste (`.rav`, §C27), nicht
              // jede Zeichnung: die elf Stufen der Laufbahn tragen ihre
              // Verläufe absichtlich selbst und sind kein Verweis [§C30].
              rav: document.querySelectorAll('.rav > svg.ins').length,
              ravUse: document.querySelectorAll('.rav > svg.ins > use').length,
              // Nur die Wappen (`insy…`): im selben Topf stehen seit den
              // Bildern auch die Stufen der Leiter (`inst…`, §C30), und die
              // gehören nicht zu der Frage, wie viele Wappen sich eine
              // Zeichnung teilen.
              symbole: document.querySelectorAll('#insDefs defs > g[id^="insy"]').length,
              offen: [...offen].slice(0, 5), verwaist: [...verwaist].slice(0, 5)};
    }, ruf));
  }
  console.log('  Wappen je Ansicht: '
    + verweise.map(v => v.tab + '→' + v.wappen).join('  '));
  const ohneTopf = verweise.filter(v => !v.topf);
  // Er muss AUSSERHALB von #app und dem Blatt stehen, nicht nur irgendwo:
  // darin nimmt ihn das nächste render() mit, und dann hängt jedes Metall
  // daran, dass ihn zufällig jemand neu anlegt.
  ok(ohneTopf.length === 0,
     'der Topf mit den Verläufen steht außerhalb von #app und dem Blatt',
     ohneTopf.map(v => v.tab).join(', '));
  const gezeigt = verweise.filter(v => v.wappen > 0);
  ok(gezeigt.length >= 4, 'es werden überhaupt Wappen gezeichnet',
     verweise.map(v => v.tab + ':' + v.wappen).join(' '));
  const kaputt = verweise.filter(v => v.offen.length);
  ok(kaputt.length === 0, 'kein Verweis zeigt auf einen Verlauf, den es nicht gibt',
     kaputt.map(v => v.tab + ': ' + v.offen.join(', ')).join(' | '));
  const leer = verweise.filter(v => v.verwaist.length);
  ok(leer.length === 0, 'kein Verweis zeigt auf ein Symbol, das es nicht gibt',
     leer.map(v => v.tab + ': ' + v.verwaist.join(', ')).join(' | '));
  // Und die Wappen einer Ansicht sind wirklich Verweise: sonst stehen in der
  // Liste wieder 76 Kopien derselben Zeichnung.
  const kopien = verweise.filter(v => v.rav > 0 && v.ravUse < v.rav);
  ok(kopien.length === 0, 'jedes Wappen des Listen-Bauteils ist ein Verweis',
     kopien.map(v => v.tab + ': ' + v.ravUse + ' von ' + v.rav).join(' | '));
  // Geteilt wird, wo mehr Wappen stehen als Spieler — in den Awards
  // dieselben Gesichter mehrmals. In der Rangliste steht jeder einmal, und
  // ob zwei dieselbe Zeichnung tragen, hängt an ihrem Prestige: seit den
  // Chroniken nach Stufe trug jeder der elf eine eigene, und „jede Ansicht
  // teilt" war eine Aussage über die Daten, nicht über den Topf.
  const viele = verweise.filter(v => v.rav >= 10);
  ok(viele.length > 0 && viele.every(v => v.symbole >= 1) && viele.some(v => v.symbole < v.rav),
     'viele Wappen teilen wenige Zeichnungen',
     verweise.map(v => v.tab + ':' + v.symbole + '/' + v.rav).join(' '));

  console.log('\n═══ 4. IM HINTERGRUND WIRD NICHT GELADEN ═══');
  // Der Takt ruft nicht mehr blind. Geprüft wird an der Stelle, an der es
  // zählt: wie oft `loadAll` wirklich gerufen wird.
  const takt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    K('globalThis.__ALT_LOAD = loadAll; globalThis.__RUFE = 0;'
      + ' loadAll = () => { globalThis.__RUFE++; };');
    const zeig = v => Object.defineProperty(document, 'hidden',
      {configurable:true, get:() => v});
    const zahl = () => K('globalThis.__RUFE');
    const blatt = document.getElementById('sheet');
    blatt.classList.remove('show');
    K('tab = "ranking"');

    zeig(true);  K('_tickDaten()');
    const versteckt = zahl();
    zeig(false); K('_tickDaten()');
    const sichtbar = zahl();
    // Zurück aus dem Hintergrund: sofort, nicht erst beim nächsten Takt.
    document.dispatchEvent(new Event('visibilitychange'));
    const zurueck = zahl();
    // Ein offenes Blatt wird nicht unter den Fingern neu gezeichnet —
    // diese Bedingung stand schon im alten Takt und muss bleiben.
    blatt.classList.add('show'); K('_tickDaten()');
    const mitBlatt = zahl();
    blatt.classList.remove('show');
    // Und der Eingabe-Tab auch nicht.
    K('tab = "match"'); K('_tickDaten()');
    const imMatch = zahl();

    K('tab = "ranking"; loadAll = globalThis.__ALT_LOAD;');
    delete document.hidden;
    return {versteckt, sichtbar, zurueck, mitBlatt, imMatch};
  });
  ok(takt.versteckt === 0, 'versteckt: kein Laden',
     takt.versteckt + ' Aufrufe');
  ok(takt.sichtbar === 1, 'sichtbar: der Takt lädt',
     takt.sichtbar + ' Aufrufe');
  ok(takt.zurueck === 2, 'zurück aus dem Hintergrund: sofort, nicht erst in 30 Sekunden',
     takt.zurueck + ' Aufrufe');
  ok(takt.mitBlatt === 2 && takt.imMatch === 2,
     'offenes Blatt und Eingabe-Tab bleiben in Ruhe',
     'Blatt ' + takt.mitBlatt + ', Match ' + takt.imMatch);

  console.log('\n═══ DER REKORDE-REITER ═══');
  // Gemessen statt behauptet — und zwar am gerenderten Reiter mit den
  // echten Partien: fuenf Kammern, eine Besitzleiste, die dieselben
  // Haltungen zählt wie die Karten, und ein Filter, der genau eine Kammer
  // stehen lässt.
  const CHRONICLES_N = await page.evaluate(() => window.__k.eval('CHRONICLES.length'));
  const rek = await page.evaluate(() => {
    window.__k.eval('tab = "awards"; awView = "rekorde"; rekKammer = ""; render()');
    return {
      karten: document.querySelectorAll('#app .rek').length,
      kammern: [...document.querySelectorAll('#app .rek-g-n')].map(e => e.textContent.trim()),
      saeulen: [...document.querySelectorAll('#app .rek-sl .z')].map(e => +e.textContent),
      offen: [...document.querySelectorAll('#app .rek.offen')].length,
      // Die Chips mit ihrer Zahl. „Alle" steht zuerst und nennt den ganzen
      // Katalog; ohne die Zahlen war nicht zu sehen, ob eine Kammer
      // ueberhaupt gefuellt ist, und wieviele Rekorde es gibt.
      chips: [...document.querySelectorAll('#app .rek-kammern button')].map(b => ({
        k: b.dataset.rekkammer,
        n: +(b.querySelector('.n') || {textContent:''}).textContent })),
      // Und jede Kammer muss anklickbar sein: eine Leiste, die auf 430
      // Pixeln nicht zu erreichen ist, versteckt ihre Rekorde.
      leiste: (() => { const e = document.querySelector('#app .rek-kammern');
        return e ? {scroll: e.scrollWidth, sicht: e.clientWidth,
          schrift: Math.min(...[...e.querySelectorAll('button')].map(b => parseFloat(getComputedStyle(b).fontSize))),
          hoehe: Math.min(...[...e.querySelectorAll('button')].map(b => b.getBoundingClientRect().height))} : null; })(),
      // Die Besitzleiste trägt Zahl, Säule und Gesicht — und das Gesicht lief
      // unten aus der Karte.
      besitz: (() => { const k = document.querySelector('#app .rek-besitz');
        if(!k) return null; const r = k.getBoundingClientRect();
        return [...k.querySelectorAll('.rek-sl > *')].filter(x => { const q = x.getBoundingClientRect();
          return q.bottom > r.bottom - 1 || q.top < r.top; }).length; })()
    };
  });
  ok(rek.kammern.length === 5, 'der Reiter zeigt fuenf Kammern', rek.kammern.join(' · '));
  // Jeder Chip nennt seine Zahl, und „Alle" nennt den ganzen Katalog.
  const chipSoll = await page.evaluate(() => window.__k.eval(
    `(function(){ const z = {}; CHRONICLES.forEach(c => z[c.kind] = (z[c.kind]||0)+1);
       return z; })()`));
  const chipFehler = rek.chips.filter(c => c.k
    ? c.n !== chipSoll[c.k] : c.n !== CHRONICLES_N);
  ok(rek.chips.length === 6 && chipFehler.length === 0,
     'jeder Kammer-Chip nennt seine Zahl, „Alle" den ganzen Katalog',
     rek.chips.map(c => (c.k || 'alle') + ':' + c.n).join(' · '));
  // Die Kammern stehen ohne Wischen da, in lesbarer Größe und als Ziel,
  // das man trifft: als scrollende Leiste standen sechs Wörter in 11,5 px
  // eng aneinander, und die letzten beiden lagen hinter dem Rand.
  ok(rek.leiste && rek.leiste.scroll <= rek.leiste.sicht + 1 && rek.leiste.schrift >= 12.5 && rek.leiste.hoehe >= 34,
     'die Kammerfelder stehen auf dem Telefon vollstaendig und gross genug da',
     JSON.stringify(rek.leiste));
  ok(rek.besitz === 0, 'die Besitzleiste traegt Zahl, Säule und Gesicht innerhalb ihrer Karte',
     rek.besitz + ' Teile ragen hinaus');
  ok(rek.karten === CHRONICLES_N, 'jeder Rekord des Katalogs hat eine Karte',
     rek.karten + ' von ' + CHRONICLES_N);
  // Die Besitzleiste zählt dieselben Haltungen, die die Karten zeigen — und
  // zwar die, die ein Rekord SIND: eine Schattenseite und eine negative
  // Fuegung zaehlen nicht mit [§C25].
  const haltungen = await page.evaluate(() => window.__k.eval(
    `Object.values(allChronicles().byId)
       .reduce((n, e) => n + (e.neg ? 0 : e.pids.length), 0)`));
  const summe = rek.saeulen.reduce((a, b) => a + b, 0);
  ok(summe === haltungen, 'die Besitzleiste zählt so viele Haltungen wie die Tafel',
     summe + ' vs ' + haltungen);
  // Und sie sagt dieselbe Zahl wie das Podest der Ewigen Tafel und das
  // Profil. Sie tat es nicht: Martins Saeule stand auf 13, seine
  // Podestkarte auf „10 Rek.", und beides war unter demselben Wort zu
  // lesen. Gemessen wird je Spieler, nicht als Summe — eine Summe stimmt
  // auch dann, wenn zwei Spieler ihre Zahlen tauschen.
  const einig = await page.evaluate(() => window.__k.eval(
    `(function(){
       return rekordZaehlung().map(z => ({
         n: pname(z.pid), leiste: z.n,
         podest: chroniclesOfPlayer(z.pid).filter(x => !x.neg).length
       })).filter(r => r.leiste !== r.podest);
     })()`));
  ok(einig.length === 0, 'die Besitzleiste sagt je Spieler dieselbe Zahl wie das Podest',
     einig.map(r => r.n + ': ' + r.leiste + ' vs ' + r.podest).join(' · '));
  // Ein Rekord, den niemand hält, steht gestrichelt da statt zu fehlen.
  const unbesetzt = await page.evaluate(() => window.__k.eval(
    `(function(){ const h = chronicleHolders();
       return CHRONICLES.filter(c => !h[c.id]).length; })()`));
  ok(rek.offen === unbesetzt, 'jeder unbesetzte Rekord steht gestrichelt in seiner Kammer',
     rek.offen + ' gezeigt, ' + unbesetzt + ' unbesetzt');
  // Der Kammerfilter zeigt genau eine Kammer.
  const gefiltert = await page.evaluate(() => {
    window.__k.eval('rekKammer = "fuegung"; render()');
    const n = document.querySelectorAll('#app .rek-g-n').length;
    // Gemessen wird die KAMMER, nicht die Farbe: eine Fuegung, die von einer
    // Niederlage erzaehlt, traegt Rot und bleibt trotzdem eine Fuegung.
    const nurFuegung = [...document.querySelectorAll('#app .rek')]
      .every(e => e.dataset.kammer === 'fuegung');
    window.__k.eval('rekKammer = ""; render()');
    return {n, nurFuegung};
  });
  ok(gefiltert.n === 1 && gefiltert.nurFuegung,
     'der Kammerfilter zeigt genau eine Kammer', JSON.stringify(gefiltert));
  // Und jede Kammer zeigt genau ihre Zahl, „Alle" den ganzen Katalog. Ein
  // Rekord, den ein Filter verschluckt, ist unsichtbar — und genau das
  // faellt sonst niemandem auf.
  const jeKammer = await page.evaluate(() => {
    const K = s => window.__k.eval(s);
    const soll = K(`(function(){ const z = {}; CHRONICLES.forEach(c =>
      z[c.kind] = (z[c.kind]||0)+1); return z; })()`);
    const out = {};
    Object.keys(soll).concat(['']).forEach(k => {
      K('rekKammer = ' + JSON.stringify(k) + '; render()');
      out[k || 'alle'] = {ist: document.querySelectorAll('#app .rek').length,
                          soll: k ? soll[k] : K('CHRONICLES.length')};
    });
    K('rekKammer = ""; render()');
    return out;
  });
  const kammerFehler = Object.keys(jeKammer)
    .filter(k => jeKammer[k].ist !== jeKammer[k].soll)
    .map(k => k + ': ' + jeKammer[k].ist + ' statt ' + jeKammer[k].soll);
  ok(kammerFehler.length === 0,
     'jede Kammer zeigt ihre Zahl und „Alle" den ganzen Katalog',
     kammerFehler.join(' · ')
     || Object.keys(jeKammer).map(k => k + ':' + jeKammer[k].ist).join(' · '));

  // ── Was negativ ist, traegt Rot und zaehlt nicht ──────────────────
  // „Die bitterste Pleite" stand im Profil golden zwischen den Titeln und
  // machte aus sechs Rekorden sieben. Rot ist die Richtung [§C25], und ein
  // Rekord ist etwas, das man geholt hat.
  const negRot = await page.evaluate(() => {
    const K = s => window.__k.eval(s);
    // Ein Spieler, der etwas Negatives haelt.
    const pid = K(`(function(){ const p = players.find(p => chroniclesOfPlayer(p.id)
      .some(x => x.neg) && chroniclesOfPlayer(p.id).some(x => !x.neg));
      return p ? p.id : ''; })()`);
    if(!pid) return {keiner:true};
    const alle = K(`chroniclesOfPlayer('${pid}').length`);
    const positiv = K(`chroniclesOfPlayer('${pid}').filter(x => !x.neg).length`);
    K(`tab = "ranking"; render(); showPlayer('${pid}')`);
    const wrap = document.querySelector('#sheet .pp-root') || document.querySelector('#sheet');
    const karten = [...wrap.querySelectorAll('.chron-one')];
    const rot = karten.filter(e => {
      const c = getComputedStyle(e).getPropertyValue('--tt').trim();
      return /f0566a/i.test(c);
    }).length;
    // Das Profil hat mehrere Abschnittsköpfe — gesucht ist der ueber den
    // Rekord-Karten, nicht der erste im Blatt.
    const kopf = [...wrap.querySelectorAll('.pp-sec-title')].find(e => {
      const h = e.querySelector('h4');
      return h && /^(Liga-Rekord|Schattenseite)/.test(h.textContent.trim());
    });
    const zahl = kopf ? kopf.querySelector('.m') : null;
    // Steht die Schattenseite hinten?
    const negIdx = karten.map((e, i) => e.classList.contains('schatten') ? i : -1)
      .filter(i => i >= 0);
    const erste = karten.length ? Math.min(...negIdx) : -1;
    K('closeSheet && closeSheet()');
    return {alle, positiv, karten: karten.length, rot,
            zahl: zahl ? +zahl.textContent.trim() : null,
            negZuerst: erste === 0 && positiv > 0};
  });
  ok(!negRot.keiner, 'es gibt ein Profil mit Rekord und Schattenseite',
     JSON.stringify(negRot));
  ok(negRot.rot === negRot.alle - negRot.positiv,
     'jede negative Karte im Profil ist rot, keine andere',
     negRot.rot + ' rot von ' + (negRot.alle - negRot.positiv) + ' negativen');
  ok(negRot.zahl === negRot.positiv,
     'die Zahl neben „Liga-Rekorde" zaehlt nur das Positive',
     negRot.zahl + ' statt ' + negRot.positiv);
  ok(negRot.negZuerst === false, 'und das Negative steht nicht an erster Stelle');

  // ── Der offene Feed frischt sich auf ──────────────────────────────
  // `_isNewsFeedOpen` fragte nach `.nv-list-flat` — einer Klasse aus dem
  // alten Mini-Popup, die der Feed seit dem Umbau nicht mehr setzt. Damit war
  // er nie „offen", und eine Story, die per Realtime hereinkam, erschien erst
  // beim naechsten Oeffnen.
  const feedOffen = await page.evaluate(() => {
    const K = s => window.__k.eval(s);
    K('_cache._stories = _buildStories(); _cache._consolFrom = null; _cache._frischVon = null;');
    K('openNewsFeed(); _newsFeedRest()');
    const offen = K('_isNewsFeedOpen()');
    const karten = document.querySelectorAll('#sheet .nf-card').length;
    // Und die Auffrischung zeichnet wirklich NEU. Gezaehlt reicht nicht:
    // dieselbe Zahl steht auch da, wenn gar nichts passiert ist. Eine Marke
    // an einer Karte ueberlebt nur, wenn niemand neu zeichnet.
    const erste = document.querySelector('#sheet .nf-card');
    if(erste) erste.dataset.marke = 'alt';
    K('_refreshOpenNewsViews(); _newsFeedRest()');
    const nachher = document.querySelectorAll('#sheet .nf-card').length;
    const markeWeg = !document.querySelector('#sheet .nf-card[data-marke="alt"]');
    K('closeSheet && closeSheet()');
    const zu = K('_isNewsFeedOpen()');
    return {offen, karten, nachher, zu, markeWeg};
  });
  // Zuerst, was man sieht: die ersten Tage sofort, der Rest nach dem ersten
  // Bild — und dann alle Karten. Ein Klick auf eine nachgereichte Karte
  // öffnet ihr Blatt.
  const feedTeil = await page.evaluate(async () => {
    const K = s => window.__k.eval(s), w = ms => new Promise(r => setTimeout(r, ms));
    K('closeSheet(true); openNewsFeed()');
    const sofort = document.querySelectorAll('#sheet .nf-card').length;
    const erwartet = sofort + K('_newsFeedOffen ? _newsFeedOffen.jobs.reduce((n,j)=>n+j.anzahl,0) : 0');
    // Idle-Takte richten sich nach der Browserlast, nicht nach einer festen
    // Zahl Millisekunden. Auf die vollständige Liste warten, ohne ihren
    // synchronen Prüf-Flush aufzurufen und damit die Zusicherung zu umgehen.
    await new Promise((resolve, reject) => {
      const liste = document.querySelector('#sheet .nf-liste');
      let timer;
      const horch = new MutationObserver(() => {
        if(!K('_newsFeedOffen === null')) return;
        clearTimeout(timer); horch.disconnect(); resolve();
      });
      if(K('_newsFeedOffen === null')){ resolve(); return; }
      horch.observe(liste, {childList:true, subtree:true});
      // Nur ein Sicherheitsende für einen wirklich steckengebliebenen
      // Auftrag, keine Zusicherung über die Geschwindigkeit eines Geräts.
      timer = setTimeout(() => { horch.disconnect(); reject(new Error('Der Feed-Auftrag wird nicht vollständig fertig.')); }, 8000);
    });
    const danach = document.querySelectorAll('#sheet .nf-card').length;
    const letzte = [...document.querySelectorAll('#sheet .nf-liste .nf-card')].pop();
    const titel = letzte ? (letzte.querySelector('.nf-h') || {}).textContent : '';
    if(letzte) letzte.click();
    await w(400);
    const blatt = !!titel && ((document.getElementById('nd') || {}).innerText || '').indexOf(titel.trim().slice(0, 20)) >= 0;
    K('closeNewsDetail(); closeSheet(true)');
    return {sofort, danach, erwartet, blatt};
  });
  ok(feedTeil.sofort >= 8 && feedTeil.sofort <= 15 && feedTeil.danach === feedTeil.erwartet
     && feedTeil.danach > feedTeil.sofort * 2 && feedTeil.blatt,
     'der Feed zeichnet zuerst die oberen Tage und reicht den Rest nach dem ersten Bild nach',
     JSON.stringify(feedTeil));
  ok(feedOffen.offen === true, 'der offene News-Feed wird als offen erkannt',
     JSON.stringify(feedOffen));
  ok(feedOffen.karten > 0 && feedOffen.nachher === feedOffen.karten
     && feedOffen.markeWeg === true,
     'und die Auffrischung zeichnet ihn wirklich neu',
     feedOffen.karten + ' → ' + feedOffen.nachher
     + (feedOffen.markeWeg ? ', neu gezeichnet' : ', die alte Karte steht noch'));
  ok(feedOffen.zu === false, 'geschlossen ist er nicht mehr offen');

  console.log('\n═══ DIE TAFEL ═══');
  // Gemessen am gerenderten Feed: ein Tageskopf je Kalendertag, jede Karte
  // unter ihrem eigenen Tag, Filterchips mit Anzahl und ein Gelesen-Knopf,
  // der die Zahl der offenen Karten nennt. Vorher trennte die Tage eine
  // duenne Zeile, die man beim Scrollen uebersah: zwei Spieltage lasen sich
  // als einer.
  const tafel = await page.evaluate(() => {
    // Der Cache wird sonst aus der DB gefuellt; im Harness gibt es keine.
    // Der Generator liefert dieselben Stories, die die App persistiert haette.
    window.__k.eval('_cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when)); openNewsFeed(); _newsFeedRest()');
    const sheet = document.getElementById('sheet');
    const koepfe = sheet ? [...sheet.querySelectorAll('.nf-tag')] : [];
    const gruppen = sheet ? [...sheet.querySelectorAll('.nf-feed')] : [];
    // Wie viele verschiedene Kalendertage tragen die Karten wirklich?
    const tage = window.__k.eval(`(function(){
      const s = getStoriesCache();
      return new Set(s.map(x => tagKey(x.when))).size;
    })()`);
    const chips = (sheet ? [...sheet.querySelectorAll('.nf-chip-f')] : []).map(e => ({
      text: e.textContent.trim(), zahl: e.querySelector('i') ? +e.querySelector('i').textContent : null
    }));
    const knopf = sheet ? sheet.querySelector('.nf-gelesen') : null;
    const offen = window.__k.eval(`getStoriesCache().filter(x => !_newsLoadSeen().has(x.id)).length`);
    // Steht jede Karte unter dem Kopf ihres eigenen Tages?
    let falscherTag = 0;
    koepfe.forEach((k, i) => {
      const datum = (k.querySelector('.nf-tag-dt') || {}).textContent || '';
      const feed = gruppen[i];
      if(!feed) return;
      [...feed.querySelectorAll('.nf-card')].forEach(c => {
        const sid = c.dataset.sid;
        const soll = window.__k.eval(`(function(){
          const s = getStoriesCache().find(x => x.id === ${JSON.stringify(sid)});
          return s ? _newsDayDate(s.when) : '';
        })()`);
        if(soll && soll !== datum.trim()) falscherTag++;
      });
    });
    const k0 = koepfe[0] || null;
    const wt = k0 ? k0.querySelector('.nf-tag-wt') : null;
    const dt = k0 ? k0.querySelector('.nf-tag-dt') : null;
    // Steht im Kopf eine Zeile, die eine Karte darunter wortgleich wiederholt?
    let kopfDoppelt = 0, kopfDoppeltBsp = '';
    koepfe.forEach((k, i) => {
      const zeilen = [...k.querySelectorAll('.nf-tag-b, .nf-tag-h')]
        .map(e => e.textContent.trim()).filter(Boolean);
      const feed = gruppen[i];
      if(!feed) return;
      const titel = [...feed.querySelectorAll('.nf-h')].map(e => e.textContent.trim());
      zeilen.forEach(z => { if(titel.indexOf(z) >= 0){ kopfDoppelt++; kopfDoppeltBsp = z; } });
    });
    // Die Karte des Tages: hoechstens eine je Tag, und sie bleibt an ihrer
    // Uhrzeit stehen. Sie nach oben zu ziehen waere genau die Umsortierung,
    // die der Feed nicht mehr macht.
    let tagesKarten = 0, mehrfach = 0, nichtBeste = 0, tagOhneSpiel = 0;
    gruppen.forEach((feed, i) => {
      // An einem Tag ohne Partie ist nichts passiert, was ihn von einem
      // anderen unterscheidet: dort stand sonst ein Fun Fact gross im Bild.
      const kopf = koepfe[i];
      // Gefragt wird die App, nicht das Markup: die Bilanz des Tages stand
      // frueher als Zeile im Kopf und diente hier als Ersatzsignal — sie ist
      // raus, der Tagesschluessel steht dafuer am Kopf.
      const gespielt = kopf && window.__k.eval('_newsTagMs')(kopf.dataset.tag).length;
      if(!gespielt && feed.querySelector('.nf-card.nf-gross')) tagOhneSpiel++;
    });
    gruppen.forEach(feed => {
      const gr = [...feed.querySelectorAll('.nf-card.nf-gross')];
      tagesKarten += gr.length;
      if(gr.length > 1) mehrfach++;
      if(gr.length !== 1) return;
      // Traegt sie wirklich den hoechsten Nachrichtenwert ihres Tages?
      const ids = [...feed.querySelectorAll('.nf-card')].map(c => c.dataset.sid);
      // Gewertet wird nur, wer das Band tragen darf: Breaking ist im Feed
      // schon die lauteste Karte, der Spieler des Tages steht an jedem
      // Spieltag da, und ein Rueckblick gehoert keinem Tag [§C33]. Die
      // Frage stellt `_newsTagKarteWuerdig` — hier stand vorher eine
      // zweite Liste dafuer [§C27].
      const beste = window.__k.eval(`(function(){
        const ids = ${JSON.stringify(ids)};
        const s = getStoriesCache().filter(x => ids.indexOf(x.id) >= 0)
          .filter(_newsTagKarteWuerdig);
        s.sort((a,b) => (_newsTagSpannung(b)-_newsTagSpannung(a))
          || ((b.prio||0)-(a.prio||0)) || String(a.id||'').localeCompare(String(b.id||'')));
        return s.length ? s[0].id : '';
      })()`);
      if(beste && beste !== gr[0].dataset.sid) nichtBeste++;
    });
    return {koepfe: koepfe.length, tage, chips, falscherTag,
            kopfDoppelt, kopfDoppeltBsp, tagesKarten, mehrfach, nichtBeste, tagOhneSpiel,
            knopfText: knopf ? knopf.textContent.trim() : '', offen,
            wochentag: wt ? wt.textContent.trim() : '',
            datum: dt ? dt.textContent.trim() : '',
            roh: k0 ? k0.innerHTML.slice(0, 160) : ('kein Kopf; sheet=' + (!!sheet) + ' html=' + (sheet ? sheet.innerHTML.length : 0))};
  });
  ok(tafel.koepfe === tafel.tage, 'jeder Kalendertag bekommt genau einen Kopf',
     tafel.koepfe + ' Koepfe, ' + tafel.tage + ' Tage');
  ok(tafel.falscherTag === 0, 'jede Karte steht unter dem Kopf ihres Tages',
     tafel.falscherTag + ' daneben');
  ok(/^[A-ZÄÖÜ]+$/.test(tafel.wochentag || '') && /\d{2}\.\d{2}\.\d{2}/.test(tafel.datum || ''),
     'der Kopf nennt Wochentag und Datum', (tafel.wochentag + ' ' + tafel.datum).trim() || tafel.roh);
  // Jede Karte steht auf genau einer Seite: die Zahlen der fünf Seiten
  // ergeben zusammen „Alle". Vorher gab es nur Tafel und Spieltag, und die
  // Ehrung, die Fun Facts und die Saison fand man nur unter „Alle".
  const seiten = tafel.chips.filter(c => !/^(Alle|Breaking)/.test(c.text));
  ok(tafel.chips.map(c => c.text.replace(/\d+$/, '')).join(',') === 'Alle,Breaking,Tafel,Spieltag,Zeichen,Ehrung,Liga'
     && seiten.reduce((n, c) => n + c.zahl, 0) === tafel.chips[0].zahl && seiten.every(c => c.zahl > 0),
     'sieben Filterchips, nicht elf Rubriken: Alle, Breaking und fünf Seiten, auf denen jede Karte genau einmal steht',
     tafel.chips.map(c => c.text).join(' · '));
  ok(tafel.chips.every(c => c.zahl !== null), 'jeder Chip traegt seine Anzahl',
     tafel.chips.map(c => c.zahl).join(', '));
  ok(!tafel.offen || tafel.knopfText.indexOf(String(tafel.offen)) >= 0,
     'der Gelesen-Knopf nennt die Zahl der offenen Karten',
     tafel.knopfText + ' / ' + tafel.offen);
  ok(tafel.kopfDoppelt === 0,
     'der Tageskopf wiederholt keine Schlagzeile aus seinem Tag',
     tafel.kopfDoppelt + ' doppelt: ' + tafel.kopfDoppeltBsp);
  ok(tafel.tagesKarten > 0 && tafel.mehrfach === 0,
     'hoechstens eine Karte des Tages je Tag',
     tafel.tagesKarten + ' Karten, ' + tafel.mehrfach + ' Tage mit mehreren');
  ok(tafel.nichtBeste === 0, 'die Karte des Tages traegt die spannendste Geschichte ihres Tages',
     tafel.nichtBeste + ' daneben');
  ok(tafel.tagOhneSpiel === 0, 'an einem Tag ohne Partie gibt es keine Karte des Tages',
     tafel.tagOhneSpiel + ' Tage');

  console.log('\n═══ DIE STORY-BLAETTER ═══');
  // Jedes Blatt hat denselben Bau: Kopf mit Wappen und Rang, dann die Mitte,
  // dann der Weg weiter. Vorher brachte jeder der einunddreissig Typen sein
  // eigenes mit, und wer zwei nacheinander oeffnete, fand nichts an derselben
  // Stelle.
  const blaetter = await page.evaluate(() => {
    const roh = window.__k.eval('JSON.stringify((function(){\n'
      + '  const roh = _buildStories();\n'
      + '  const alle = _consolidateStories(roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when)));\n'
      + '  const out = [], gesehen = {};\n'
      + '  alle.forEach(s => { const t = (s.dataRef||{}).type || "?";\n'
      + '    if(gesehen[t]) return; gesehen[t] = 1;\n'
      + '    let b = ""; try { b = _newsDetailBody(s); } catch(e){ b = "FEHLER:" + e.message; }\n'
      + '    out.push({typ:t, html:b, pids:(_newsPids(s)||[]).length, matchId:!!(s.dataRef||{}).matchId});\n'
      + '  });\n'
      + '  return out; })())');
    const arr = JSON.parse(roh);
    const box = document.createElement('div');
    let ohneKopf = 0, doppeltesSpiel = 0, fehler = 0, leer = 0;
    arr.forEach(x => {
      if(x.html.indexOf('FEHLER:') === 0){ fehler++; return; }
      if(!x.html.trim()){ leer++; return; }
      box.innerHTML = x.html;
      // Ein Blatt ueber einen Spieler traegt sein Wappen im Kopf.
      // Die Bühne einer Serie oder Partie ist der Kopf, wenn sie sein
      // Gesicht trägt [§C33].
      if(x.pids === 1 && !box.querySelector('.nd-held') && !box.querySelector('.nd-buehne .rav, .nd-buehne .av')) ohneKopf++;
      // Und die Partie steht hoechstens einmal darin.
      const erg = box.querySelectorAll('.nd-erg').length;
      const vs  = box.querySelectorAll('.nd-match').length;
      if(x.matchId && (erg + vs) > 1) doppeltesSpiel++;
    });
    return {n: arr.length, ohneKopf, doppeltesSpiel, fehler, leer,
            typen: arr.map(x => x.typ).join(', ')};
  });
  ok(blaetter.fehler === 0, 'kein Blatt wirft beim Bauen', blaetter.fehler + ' von ' + blaetter.n);
  ok(blaetter.leer === 0, 'kein Blatt bleibt leer', blaetter.leer + ' von ' + blaetter.n);
  ok(blaetter.ohneKopf === 0, 'jedes Blatt ueber einen Spieler traegt seinen Kopf',
     blaetter.ohneKopf + ' ohne');
  ok(blaetter.doppeltesSpiel === 0, 'die Partie steht hoechstens einmal im Blatt',
     blaetter.doppeltesSpiel + ' doppelt');

  console.log('\n═══ DAS RUBRIKBAND UND DER TAGESKOPF ═══');
  const design = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const karten = [...sheet.querySelectorAll('.nf-card')];
    const koepfe = [...sheet.querySelectorAll('.nf-tag')];
    // Der Tageskopf ist eine Marke auf dem Zeitstrahl, keine Karte: als
    // Kasten mit Rahmen und Fuellung sah er aus wie eine ungeoeffnete Story.
    const kopfStil = koepfe.length ? getComputedStyle(koepfe[0]) : null;
    // Jede Karte traegt genau eine Rubrik, und sie ist leiser als die
    // Schlagzeile darunter.
    let ohneRubrik = 0, zuLaut = 0, ohneKachel = 0;
    karten.forEach(c => {
      const r = c.querySelector('.nf-rub');
      const h = c.querySelector('.nf-h');
      if(!r){ if(!c.classList.contains('nf-brk')) ohneRubrik++; return; }
      // Das Zeichen sitzt in einer eigenen Kachel: frei stehend war es ein
      // Strich von elf Pixeln neben der Schrift.
      if(!r.querySelector('i svg')) ohneKachel++;
      if(!h) return;
      // Gemessen wird der TEXT der Rubrik, nicht ihr Behaelter: die
      // Schriftgroesse steht am inneren b, und am Behaelter zu messen liesse
      // die Zusicherung eine zu laute Rubrik durchgehen.
      const rt = r.querySelector('b') || r;
      const rs = parseFloat(getComputedStyle(rt).fontSize);
      const hs = parseFloat(getComputedStyle(h).fontSize);
      if(rs >= hs) zuLaut++;
    });
    // Die Tordifferenz steht nicht im Zahlenband, wenn das Ergebnis schon
    // darueber steht.
    let doppelteDiff = 0;
    karten.forEach(c => {
      if(!c.querySelector('.nf-erg')) return;
      [...c.querySelectorAll('.nf-zb span')].forEach(sp => {
        if(/Tore Unterschied/.test(sp.textContent)) doppelteDiff++;
      });
    });
    return {karten: karten.length, ohneRubrik, zuLaut, doppelteDiff, ohneKachel,
            kopfRahmen: kopfStil ? kopfStil.borderTopWidth + '|' + kopfStil.borderLeftWidth : '',
            kopfGrund: kopfStil ? kopfStil.backgroundImage : ''};
  });
  ok(design.ohneRubrik === 0, 'jede Karte traegt ihre Rubrik', design.ohneRubrik + ' ohne');
  ok(design.zuLaut === 0, 'die Rubrik ist leiser als die Schlagzeile', design.zuLaut + ' zu laut');
  ok(design.ohneKachel === 0, 'jede Rubrik traegt ihre Kachel', design.ohneKachel + ' ohne');
  ok(design.doppelteDiff === 0, 'die Tordifferenz steht nicht neben dem Ergebnis',
     design.doppelteDiff + ' doppelt');
  ok(design.kopfRahmen === '0px|0px' && design.kopfGrund === 'none',
     'der Tageskopf ist keine Karte', design.kopfRahmen + ' / ' + design.kopfGrund);

  console.log('\n═══ MOTIV, WINKEL UND FETTE AKZENTE ═══');
  const schmuck = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const karten = [...sheet.querySelectorAll('.nf-card')];
    let ohneMotiv = 0, ragtRaus = 0, ohneWinkel = 0, winkelUnten = 0, ohneAkzent = 0;
    karten.forEach(c => {
      const m = c.querySelector('.nf-motiv');
      if(!m){ ohneMotiv++; }
      else {
        // Halb angeschnitten sah das Wasserzeichen nach einem Fehler aus.
        const mb = m.getBoundingClientRect(), cb = c.getBoundingClientRect();
        if(mb.right > cb.right + 0.5 || mb.left < cb.left - 0.5) ragtRaus++;
      }
      const w = c.querySelector('.nf-chev');
      if(!w){ ohneWinkel++; }
      else {
        // Der Winkel steht NEBEN dem Satz, nicht darunter: als vierte Zeile
        // waere er eine eigene Zeile Text.
        const t = c.querySelector('.nf-gr-r');
        if(t){
          const wb = w.getBoundingClientRect(), tb = t.getBoundingClientRect();
          if(wb.left < tb.right - 1) winkelUnten++;
        }
      }
      // Steht eine Zahl im Satz, steht sie fett.
      const d = c.querySelector('.nf-d');
      if(d && /\d/.test(d.textContent) && !d.querySelector('b')) ohneAkzent++;
    });
    return {n: karten.length, ohneMotiv, ragtRaus, ohneWinkel, winkelUnten, ohneAkzent};
  });
  ok(schmuck.ohneMotiv === 0, 'jede Karte traegt ihr Motiv', schmuck.ohneMotiv + ' ohne');
  ok(schmuck.ragtRaus === 0, 'das Motiv steht ganz in der Karte', schmuck.ragtRaus + ' ragen raus');
  ok(schmuck.ohneWinkel === 0, 'jede Karte zeigt, dass sie sich oeffnet',
     schmuck.ohneWinkel + ' ohne Winkel');
  ok(schmuck.winkelUnten === 0, 'der Winkel steht neben dem Satz, nicht darunter',
     schmuck.winkelUnten + ' darunter');
  ok(schmuck.ohneAkzent === 0, 'jede Zahl im Kartentext steht fett',
     schmuck.ohneAkzent + ' ohne Akzent');

  console.log('\n═══ ZWÖLF SORTEN, RUHIGE FARBFAMILIEN ═══');
  const sorten = await page.evaluate(() => {
    const sorte = window.__k.eval('_newsSorte');
    const rubrik = window.__k.eval('_newsRubrik');
    const mach = t => ({dataRef:{type:t, a:'x', b:'y', streak:5, n:60}});
    // Drei Aussagen, drei Sorten: an einem Spieltag standen drei Karten
    // „ZU ZWEIT" untereinander, die von drei verschiedenen Dingen erzaehlten.
    const drei = ['rivalry', 'team_streak', 'team_woche'].map(t => sorte(mach(t)));
    const eindeutig = new Set(drei).size === 3;
    // Und die Rubrik unterscheidet Serie von Durststrecke.
    const sieg = rubrik('serie', mach('team_streak'));
    const pleite = rubrik('serie', mach('team_loss_streak'));
    // Jede Karte im Feed hat eine Sorte, die es im CSS auch gibt.
    const sheet = document.getElementById('sheet');
    const klassen = [...sheet.querySelectorAll('.nf-card')]
      .map(c => [...c.classList].find(k => k.indexOf('nf-s-') === 0) || '');
    return {drei, eindeutig, sieg, pleite, ohneSorte: klassen.filter(k => !k).length,
            verschieden: new Set(klassen).size};
  });
  ok(sorten.eindeutig, 'Rivalitaet, Serie und Duo sind drei verschiedene Sorten',
     sorten.drei.join(','));
  ok(sorten.sieg !== sorten.pleite, 'Siegesserie und Durststrecke tragen nicht dieselbe Rubrik',
     sorten.sieg + ' / ' + sorten.pleite);
  ok(sorten.ohneSorte === 0, 'jede Karte traegt ihre Sorte', sorten.ohneSorte + ' ohne');

  const zeichen = await page.evaluate(() => {
    const icon = window.__k.eval('_newsSorteIcon');
    const sorten = ['spiel','tafel','ins','held','woche','duell','serie','badge','marke',
                    'fakt','spieler','erfolg'];
    const namen = sorten.map(so => icon(so, {dataRef:{type:'x'}}));
    const doppelt = namen.filter((n, i) => namen.indexOf(n) !== i);
    return {namen, doppelt};
  });
  ok(zeichen.doppelt.length === 0,
     'keine zwei Rubriken tragen dasselbe Zeichen', zeichen.doppelt.join(', '));

  // Dieselbe Stufe für vier Spieler ist EINE Insignium-Karte: die erste
  // Bewegung als Bühne, die drei übrigen als Zeilen, jede mit Gesicht. Das
  // Markup wird aus vier synthetischen, ansonsten echten Story-Objekten
  // gebaut, damit der Test nicht an einer zufaelligen heutigen Schwelle haengt.
  const achse = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const ids=players.slice(0,4).map(p=>p.id), when=matches[matches.length-1].created_at;
      const teile=ids.map((pid,i)=>({id:'ui-ins-'+i,cat:'tafel',ic:'award',
        title:pname(pid)+' traegt den Schildring',desc:(640+i)+' Prestige zusammen.',
        when,prio:76,dataRef:{type:'insignium_stufe',pid,stufe:1,
          stufeName:'Schildring',punkte:640+i,oben:false}}));
      _cache._consolFrom=null;
      const s=_consolidateStories(teile).find(x=>(x.dataRef||{}).type==='insignium_tag');
      return s ? _newsCardHtmlM2(s,false,false) : '';
    })()`);
    const host = document.createElement('div'); host.innerHTML = markup;
    document.body.appendChild(host);
    const karte = host.querySelector('.nf-card.nf-s-ins');
    if(!karte) return {fehlt:true};
    const rub = karte.querySelector('.nf-rub b');
    const farbe = rub ? getComputedStyle(rub).color : '';
    const out = {fehlt:false, rubrik: rub ? rub.textContent.trim() : '',
      buehne: !!karte.querySelector('.ni-b .ni-av .av'),
      gesichter: new Set([...karte.querySelectorAll('[data-pid]')].map(x => x.getAttribute('data-pid'))).size,
      zeilen: karte.querySelectorAll('.ni-zs .ni-z').length,
      rest: /weitere</.test(karte.innerHTML),
      keinGold: farbe !== 'rgb(247, 207, 74)'};
    host.remove(); return out;
  });
  ok(!achse.fehlt, 'dieselbe Stufe für vier Spieler steht als EINE Insignium-Karte im Feed',
     JSON.stringify(achse));
  ok(achse.rubrik === 'DAS ZEICHEN', 'sie traegt die Rubrik des Zeichens', achse.rubrik);
  ok(achse.buehne && achse.gesichter === 4 && achse.zeilen === 3 && !achse.rest,
     'die besonderste Bewegung als Bühne mit Gesicht, jede übrige als Zeile, ohne Rest als Zahl',
     JSON.stringify(achse));
  ok(achse.keinGold, 'die Karte der Leiter trägt kein Gold, das gehört den Titeln',
     String(achse.keinGold));
  // Gemessen mit der längsten Stufe bei 288 und 360 px: weder die Bühne noch
  // eine Kachel läuft waagrecht aus der Karte, und die Kacheln halten Abstand
  // zum Rand. Beides ist am Live-Stand passiert — bei 288 px blieben neben
  // zwei Zeichen 35 px für „Lorbeerreif II", und das „P" der Prestige-Zahl
  // stand auf der Kante.
  const insBreite = {};
  for(const w of [288, 360]){
    await page.setViewportSize({width:w, height:844});
    insBreite[w] = await page.evaluate(() => {
      const K = window.__k.eval.bind(window.__k);
      const markup = K(`(function(){
        const ids=players.slice(0,4).map(p=>p.id), when=matches[matches.length-1].created_at;
        const teile=ids.map((pid,i)=>({id:'ui-insb-'+i,cat:'tafel',ic:'award',
          title:pname(pid)+' traegt den Lorbeerreif',desc:(3600+i)+' Prestige zusammen.',
          when,prio:76,dataRef:{type:'insignium_stufe',pid,stufe:4,
            stufeName:'Lorbeerreif',punkte:3600+i,oben:false}}));
        _cache._consolFrom=null;
        const s=_consolidateStories(teile).find(x=>(x.dataRef||{}).type==='insignium_tag');
        return s ? _newsCardHtmlM2(s,false,false) : '';
      })()`);
      const host = document.createElement('div'); host.className = 'nf-wrap';
      // So breit wie eine Karte im Feed: Bildschirm minus Zeitleiste und
      // Ränder, ohne den Innenabstand von `.nf-wrap`.
      host.style.cssText = 'position:absolute;left:0;top:0;padding:0;width:' + (innerWidth - 74) + 'px';
      host.innerHTML = markup; document.body.appendChild(host);
      const karte = host.querySelector('.nf-card'), b = host.querySelector('.ni-b');
      if(!karte || !b){ host.remove(); return {fehlt:true}; }
      const kr = karte.getBoundingClientRect();
      const k = [...host.querySelectorAll('.ni-zs .ni-z')];
      const rand = Math.min(...k.map(e => kr.right - e.getBoundingClientRect().right));
      // Die übrigen Bewegungen als Zeilen über die ganze Breite, alle
      // untereinander und ohne eigene Kästen: als Kästen las sich die Karte
      // wie mehrere Karten in einer.
      const vr = (host.querySelector('.ni-zs') || b).getBoundingClientRect();
      const out = {ueber:Math.max(b.scrollWidth - b.clientWidth, ...k.map(e => e.scrollWidth - e.clientWidth)),
        rand:Math.round(rand), zeilenZahl:k.length,
        hoch:Math.round(Math.max(...k.map(e => e.getBoundingClientRect().height))),
        kasten:k.some(e => getComputedStyle(e).boxShadow !== 'none' || getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'),
        zeilen:k.every((e, i) => !i || e.getBoundingClientRect().top >= k[i - 1].getBoundingClientRect().bottom - 0.5)
          && k.every(e => e.getBoundingClientRect().width >= vr.width - 30)};
      host.remove(); return out;
    });
  }
  await page.setViewportSize({width:390, height:844});
  ok(!insBreite[288].fehlt && insBreite[288].ueber <= 0 && insBreite[360].ueber <= 0,
     'die Bühne der Insignium-Karte läuft bei 288 und 360 px nicht über', JSON.stringify(insBreite));
  ok(!insBreite[288].fehlt && insBreite[288].zeilenZahl === 3 && insBreite[288].rand >= 6 && insBreite[360].rand >= 6,
     'und ihre Zeilen halten Abstand zum Kartenrand', JSON.stringify(insBreite));
  ok(insBreite[288].zeilen && insBreite[360].zeilen,
     'jede übrige Bewegung steht als Zeile über die ganze Breite, alle untereinander', JSON.stringify(insBreite));
  // Klein: keine Kästen, eine Zeile bei 360 px höchstens zwei Zeilen Text
  // hoch, bei 288 px drei — dort bricht „steigt auf Schildring III" um.
  ok(!insBreite[288].kasten && !insBreite[360].kasten && insBreite[360].hoch <= 48 && insBreite[288].hoch <= 64,
     'die übrigen Bewegungen stehen ohne eigene Kästen und klein', JSON.stringify(insBreite));

  // ── Die Karte zeigt das Zeichen, das Prestige steht im Blatt ──────
  // Gewinn und Verlust standen als „+285 P" auf der Insignium-Karte und auf
  // der Tafel-Karte desselben Tages, unter der Schlagzeile stand ein Absatz
  // über Schwelle und Träger der Stufe, und nur die erste Bewegung war ein
  // Bild. Jetzt trägt die besonderste Bewegung die Bühne mit der Spur: gefüllt,
  // was schon da war, Violett, was der Tag dazubringt, rot gestreift, was ein
  // Rückfall kostet. Die Verwandlung liest sich wie die Leiter: links die
  // tiefere Stufe, das Gesicht auf der von jetzt, der Pfeil vom alten zum
  // neuen Zeichen — beim Rückfall also „neu (Gesicht) ← alt".
  const insKarte = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const m = JSON.parse(K(`(function(){
      const p = players.slice(0, 3).map(x => x.id);
      const L = (stufe, grad, punkte) => ({stufe, grad, punkte});
      const lb = {}; lb[p[0]] = {vor:820, nach:2120}; lb[p[1]] = {vor:620, nach:560}; lb[p[2]] = {vor:3150, nach:3500};
      const zuege = [{pid:p[0], art:'auf', vor:L(1,1,820), nach:L(3,0,2120)},
                     {pid:p[1], art:'ab', vor:L(1,0,620), nach:L(0,2,560)},
                     {pid:p[2], art:'grad', vor:L(4,0,3150), nach:L(4,1,3500)}];
      const zs = {pid:p[2], art:'grad', vor:L(6,0,5900), nach:L(6,1,6150)};
      const t = _insTagTexte(zuege);
      const story = (id, z) => ({id, cat:'tafel', ic:'award', when:new Date(), prio:60,
        title:_insTagTexte(z).title, desc:_insTagTexte(z).desc,
        dataRef:{type:'insignium_tag', tag:'2026-10-12', zuege:z, playerIds:z.map(x => x.pid), laufbahn:lb}});
      return JSON.stringify({erster:zuege[0].pid, auf:_newsCardHtmlM2(story('ui-ins1', [zuege[0]]), false, false),
        viele:_newsCardHtmlM2(story('ui-insk', zuege), false, false),
        ab:_newsCardHtmlM2(story('ui-insab', [zuege[1]]), false, false), desc:t.desc,
        stern:_newsCardHtmlM2(story('ui-insst', [zs]), false, false), sternTitel:_insTagTexte([zs]).title,
        sternName:(players.find(x => x.id === p[2]) || {}).name,
        blattAb:(_ndInsTagBlatt(story('ui-insab', [zuege[1]])) || {}).kopf || ''});
    })()`));
    const host = document.createElement('div'); host.innerHTML = m.auf + m.viele + m.ab + m.stern; document.body.appendChild(host);
    const [k1, kv, k2, ks] = host.querySelectorAll('.nf-card');
    const text = k => k.textContent.replace(/\s+/g, ' ');
    const felder = e => [...e.querySelectorAll('.ni-spur .ni-sp-f i')].map(i => ' ' + i.className + ' ');
    const zahl = (l, w) => l.filter(c => c.indexOf(' ' + w + ' ') >= 0).length;
    const wo = (l, w) => l.findIndex(c => c.indexOf(' ' + w + ' ') >= 0);
    const w = k1.querySelector('.ni-wl');
    const zl = [...kv.querySelectorAll('.ni-zs .ni-z')];
    // In einer Zeile wie auf der Bühne: tiefer links, höher rechts, das
    // neue Zeichen ohne `alt`.
    const reihe = e => { const w = e.querySelector('.ni-z-w'); if(!w) return '';
      return [...w.children].map(c => c.classList.contains('alt') ? 'alt' : c.classList.contains('ni-z-z') ? 'neu'
        : c.classList.contains('zurueck') ? '<-' : '->').join(' '); };
    const out = {
      prestige: /Prestige|[0-9]+ P\b/.test(text(k1) + ' ' + text(kv) + ' ' + text(k2)),
      satz: [k1, kv, k2].some(k => !!k.querySelector('.nf-d')) || text(kv).indexOf(m.desc.slice(0, 24)) >= 0,
      felder: felder(k1).length, zeichen: k1.querySelectorAll('.ni-spur .ni-sp-z svg').length,
      neu: zahl(felder(k1), 'neu'), da: wo(felder(k1), 'da'), alt: wo(felder(k1), 'alt'),
      weg: zahl(felder(k2), 'weg'), daAb: wo(felder(k2), 'da'),
      wellen: !!w, wellenAb: !!k2.querySelector('.ni-wl'),
      unter: !!(w && w.nextElementSibling && w.nextElementSibling.tagName.toLowerCase() === 'svg'),
      runter: !!k2.querySelector('.ni-pf.zurueck') && !k2.querySelector('.ni-ru')
        && (k2.querySelector('.ni-sz') || {}).firstElementChild === k2.querySelector('.ni-neu')
        && (k2.querySelector('.ni-sz') || {}).lastElementChild === k2.querySelector('.ni-alt'),
      blattAb: (() => { const e = document.createElement('div'); e.innerHTML = m.blattAb;
        const w = e.querySelector('.nd-is-w');
        return !!(w && w.firstElementChild && w.firstElementChild.classList.contains('nd-is-neu')
          && w.lastElementChild.classList.contains('nd-is-alt') && w.querySelector('.nd-rk-pf.zurueck')); })(),
      runterAuf: !!k1.querySelector('.ni-pf.zurueck')
        || (k1.querySelector('.ni-sz') || {}).lastElementChild !== k1.querySelector('.ni-neu'),
      buehne: Math.round(k1.querySelector('.ni-b').getBoundingClientRect().height),
      kopfVon: (kv.querySelector('.ni-b') || {}).getAttribute ? kv.querySelector('.ni-b').getAttribute('data-pid') : '',
      erster: m.erster, zeilen: zl.length, reihen: zl.map(reihe).join(' | '),
      kopfSpuren: kv.querySelectorAll('.ni-spur').length,
      namen: zl.every(e => (e.querySelector('.ni-z-t b') || {}).textContent),
      sternTitel: m.sternTitel === m.sternName + ' steigt auf Ordensstern II',
      sternKopf: ((ks && ks.querySelector('.ni-t')) || {textContent:''}).textContent.replace(/\s+/g, ' ').trim(),
      sternDa: ks ? wo(felder(ks), 'da') : -1, sternZacke: !!ks && /Zacke/.test(text(ks))
    };
    host.remove(); return out;
  });
  ok(!insKarte.prestige && !insKarte.satz,
     'die Insignium-Karte trägt keine Prestige-Zahl und keinen Satz unter der Schlagzeile',
     JSON.stringify({prestige:insKarte.prestige, satz:insKarte.satz}));
  ok(insKarte.felder === 21 && insKarte.zeichen === 7,
     'ihre Spur zeigt die ganze Leiter: drei Felder je Stufe, darunter die sieben Zeichen',
     insKarte.felder + ' Felder, ' + insKarte.zeichen + ' Zeichen');
  ok(insKarte.alt === 4 && insKarte.neu === 4 && insKarte.da === 9 && insKarte.weg === 1 && insKarte.daAb === 2,
     'die Spur zeigt, was der Tag dazubringt, und was ein Rückfall kostet',
     JSON.stringify({alt:insKarte.alt, neu:insKarte.neu, da:insKarte.da, weg:insKarte.weg, daAb:insKarte.daAb}));
  ok(insKarte.wellen && insKarte.unter && !insKarte.wellenAb && insKarte.runter && !insKarte.runterAuf && insKarte.blattAb,
     'Ringe nur beim Aufstieg, die tiefere Stufe links, das Gesicht auf der von jetzt, beim Rückfall der Pfeil zurück',
     JSON.stringify({wellen:insKarte.wellen, unter:insKarte.unter, ab:insKarte.wellenAb, runter:insKarte.runter, blatt:insKarte.blattAb}));
  // Ein Grad am Ordensstern heißt wie jeder andere: „steigt auf Ordensstern
  // II“, nicht „erreicht die 9. Zacke“, und auf der Spur das zwanzigste Feld.
  ok(insKarte.sternTitel && insKarte.sternKopf === 'Neuer GradOrdensstern II' && insKarte.sternDa === 19 && !insKarte.sternZacke,
     'ein Grad am Ordensstern heißt Ordensstern II und steht im zwanzigsten Feld der Spur',
     JSON.stringify({titel:insKarte.sternTitel, kopf:insKarte.sternKopf, da:insKarte.sternDa, zacke:insKarte.sternZacke}));
  // Die Bühne bleibt im Maß eines Kartenkopfs: mit dem 96-px-Zeichen und
  // allen Abständen war sie 190 px hoch.
  ok(insKarte.buehne > 0 && insKarte.buehne <= 186,
     'die Bühne ist nicht höher als ein Kartenkopf', insKarte.buehne + ' px');
  // Mehrere Bewegungen: die besonderste groß, jede übrige als Zeile mit
  // ihrem Namen und den beiden Zeichen — beim Rückfall „neu ← alt".
  ok(insKarte.kopfVon === insKarte.erster && insKarte.kopfSpuren === 1 && insKarte.zeilen === 2
     && insKarte.reihen === 'alt -> neu | neu <- alt' && insKarte.namen,
     'die besonderste Bewegung trägt die Bühne, jede übrige steht als Zeile, der Grad vor dem Rückfall, dieser als neu ← alt',
     JSON.stringify({kopf:insKarte.kopfVon === insKarte.erster, spuren:insKarte.kopfSpuren, zeilen:insKarte.zeilen, reihen:insKarte.reihen}));


  // ── Das Blatt der Ewigen Tafel zeigt, was ausschlaggebend war ────
  //    Die Punktewirkung stand als Zeile „1205 → 1240 Prestige": zwei Zahlen,
  //    die man erst lesen und dann verrechnen muss, und bei neun Zeilen
  //    darueber weiss niemand mehr, was daran relevant ist. Jetzt tragen die
  //    Zahlenreihe davor und der Balken je Spieler die Aussage — beides ist
  //    gezeichnet, also wird es gemessen.
  const tafelBlatt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const tage=[...new Set(matches.map(m=>tagKey(mts(m))))].sort();
      const tg=tage[tage.length-1];
      const m=_newsTagMs(tg)[0];
      const wann=new Date(mts(m));
      const ck=_storyGruppeKey('table', tg);
      const lb={};
      lb[players[0].id]={vor:1150,nach:1240,delta:90,stufeVor:2,stufeNach:2};
      lb[players[1].id]={vor:470,nach:520,delta:50,stufeVor:0,stufeNach:1};
      const l=[
        {id:'tw-0',cat:'tafel',ic:'trophyStar',when:wann,prio:80,
         title:'Ein Wechsel',desc:'Ein Satz mit 1 Zahl.',
         dataRef:{type:'rekord_geholt',rekordId:'rw',matchId:m.id,causalKey:ck,
                  laufbahn:lb,playerIds:[players[0].id,players[1].id]}},
        {id:'tw-1',cat:'tafel',ic:'chartBar',when:wann,prio:70,
         title:'Ein Ausbau',desc:'Ein Satz mit 2 Zahlen.',
         dataRef:{type:'rekord_gesteigert',rekordId:'ra',matchId:m.id,causalKey:ck,
                  laufbahn:lb,playerIds:[players[0].id]}},
        {id:'tw-2',cat:'tafel',ic:'calendar',when:wann,prio:62,
         title:'Eine Chronik',desc:'Ein Satz mit 3 Zahlen.',
         dataRef:{type:'chronik_geholt',titleId:'tc',matchId:m.id,causalKey:ck,
                  laufbahn:lb,playerIds:[players[1].id]}}
      ];
      _cache._consolFrom=null;
      const k=_consolidateStories(l).find(x=>(x.dataRef||{}).quelle==='tafel');
      return k ? _newsDetailBody(k) : '';
    })()`);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const zellen = [...host.querySelectorAll('.rcp-z .rcp-z-s')]
      .map(z => (z.querySelector('.rcp-z-v')||{}).textContent + '|'
              + (z.querySelector('.rcp-z-l')||{}).textContent);
    const reihen = [...host.querySelectorAll('.nd-wk')];
    const raus = reihen.filter(r => {
      const b = r.querySelector('.nd-wk-b');
      if(!b) return true;
      const seg = [...b.children];
      if(seg.length !== 2) return true;
      const br = b.getBoundingClientRect();
      const sum = seg.reduce((n, x) => n + x.getBoundingClientRect().width, 0);
      return sum > br.width + 0.5;
    }).length;
    // Der Zuwachs des Tages ist sichtbar, nicht nur gerechnet: das hellere
    // Segment hat Breite.
    const ohneZuwachs = reihen.filter(r => {
      const seg = r.querySelectorAll('.nd-wk-b em');
      return !seg.length || seg[0].getBoundingClientRect().width <= 0;
    }).length;
    const out = {zellen, reihen: reihen.length, raus, ohneZuwachs,
      // Nur das Zeichen der Stufe, nicht der Pfeil eines Auf- oder Abstiegs.
      zeichen: host.querySelectorAll('.nd-wk-z > svg').length,
      werte: [...host.querySelectorAll('.nd-wk-d')].map(x => x.textContent.trim()).join(' ')};
    host.remove(); return out;
  });
  ok(tafelBlatt.zellen.length >= 4
     && tafelBlatt.zellen.some(z => /Bestmarke/.test(z))
     && tafelBlatt.zellen.some(z => /Ausbau/.test(z))
     && tafelBlatt.zellen.some(z => /Prestige/.test(z)),
     'das Blatt eines Tafel-Moments nennt Wechsel, Ausbauten und Prestige in Zahlen',
     tafelBlatt.zellen.join(' · '));
  ok(tafelBlatt.reihen === 2,
     'die Wirkung steht einmal je Spieler',
     tafelBlatt.reihen + ' Zeilen: ' + tafelBlatt.werte);
  ok(tafelBlatt.raus === 0,
     'ihr Balken bleibt in seiner Bahn',
     tafelBlatt.raus + ' laufen heraus');
  ok(tafelBlatt.ohneZuwachs === 0,
     'und der Zuwachs des Tages ist darin zu sehen',
     tafelBlatt.ohneZuwachs + ' ohne sichtbaren Zuwachs');
  ok(tafelBlatt.zeichen === 2,
     'jede Zeile zeigt das Zeichen ihrer Stufe',
     tafelBlatt.zeichen + ' Zeichen');

  // ── Ein Verlust ist zu sehen ───────────────────────────────────────
  //    Jane zog bei „Der Lauf" mit Leon gleich, und Leon stand im Blatt mit
  //    „±0": ein Minus wurde als Null gezeigt, und der Balken kannte nur den
  //    Zuwachs. Gemessen wird am gezeichneten Balken, ob das verlorene Stück
  //    Breite hat und in der Bahn bleibt, ob die Zahl rot ist und ob die
  //    Zeile den Grund und den Fall unter die Schwelle nennt.
  const verlust = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const a = players[0].id, b = players[1].id;
      const lo = INSIGNIEN[3].min;
      const je = {};
      je[a] = {vor:lo + 150, nach:lo + 300};
      je[b] = {vor:lo + 50, nach:lo - 60};
      return _ndWirkungBlock(je, _ndWirkungsGruende([
        {rname:'Der Lauf', halter:[a, b], vorher:[b]}]));
    })()`);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const r = host.querySelector('.nd-wk.neg');
    const out = {da: !!r};
    if(r){
      const bahn = r.querySelector('.nd-wk-b').getBoundingClientRect();
      const weg = r.querySelector('.nd-wk-b u');
      const wr = weg ? weg.getBoundingClientRect() : null;
      out.weg = wr ? wr.width : 0;
      out.drin = wr ? (wr.right <= bahn.right + 0.5) : false;
      out.zahl = r.querySelector('.nd-wk-d').textContent.trim();
      out.rot = getComputedStyle(r.querySelector('.nd-wk-d')).color;
      out.fall = (r.querySelector('.nd-wk-n em.r') || {}).textContent || '';
      out.grund = (r.querySelector('.nd-wk-g.r') || {}).textContent || '';
      out.pfeil = !!r.querySelector('.nd-wk-ab svg');
      out.rand = r.getBoundingClientRect().right <= host.getBoundingClientRect().right + 0.5;
    }
    host.remove(); return out;
  });
  ok(verlust.da && verlust.weg > 0 && verlust.drin && verlust.rand,
     'ein Verlust steht als eigenes Stück im Balken und bleibt in der Bahn',
     JSON.stringify(verlust));
  ok(/^−110$/.test(verlust.zahl || '') && /240, 86, 106/.test(verlust.rot || ''),
     'und die Zahl trägt ihr Minus in Rot', verlust.zahl + ' ' + verlust.rot);
  ok(/fällt auf/.test(verlust.fall) && verlust.pfeil && /teilt/.test(verlust.grund),
     'die Zeile nennt den Fall unter die Schwelle und den geteilten Rekord',
     verlust.fall + ' · ' + verlust.grund);

  // ── Und jede KARTE passt auch ────────────────────────────────────
  //    Dasselbe fuer den Feed selbst: eine Karte, die bei 360 px aus ihrem
  //    Rand laeuft, schiebt die ganze Tafel waagerecht. Gepruefte Karten sind
  //    die echten des Fensters, jede Sorte einmal.
  const kartenMobil = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const r = _buildStories();
      _cache._stories = r.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
      _cache._consolFrom = null; _cache._frischVon = null;
      const alle = getStoriesCache();
      const out = [], gesehen = {};
      alle.forEach(s => {
        const d = s.dataRef || {};
        const t = (d.type||'?') + (d.quelle ? '/' + d.quelle : '');
        if(gesehen[t]) return; gesehen[t] = 1;
        // Beide Fassungen: die gewoehnliche Karte und die des Tages, die
        // breiter baut und ein Band darueber traegt.
        out.push({typ:t, html:_newsCardHtmlM2(s, false, false)});
        out.push({typ:t + ' (gross)', html:_newsCardHtmlM2(s, false, true)});
      });
      return out;
    })())`);
    const arr = JSON.parse(roh);
    const host = document.createElement('div');
    host.style.width = '360px';
    document.body.appendChild(host);
    const raus = [], ohneBild = [];
    // Eine Karte ohne Bildzone ist eine Textzeile in einer Tafel voller
    // Zeichnungen. Gezaehlt wird jedes Bauteil, das §C27 dafuer nennt:
    // Ergebnisband, grosser Wert, Leiter, Bilanzbalken, Serienlauf,
    // Sammelband, Zahlenband, Wochenliste, Duellband, Auszeichnungsfuss oder
    // das Gesicht selbst.
    // Die Karte am Spieltag traegt ihren Kopf nach dem Anlass [§11.6c], die
    // Runde ihre Tabelle.
    const BILD = ['ff','nf-erg','nf-wert','nf-leiter','nf-bil','nf-ser','nf-sam',
                  'nf-zb','nf-wl','nf-duell-band','nf-bd','nf-gr-l','nf-face',
                  'sp-zeile','sp-feld','sp-at','sp-wp','sp-band','sp-rd-tafel','sp-tg','sp-rq',
                  // V2 waehlt auch Mosaik, Tacho, Streuung und Gefaelle. Ihr
                  // gemeinsamer Bildrahmen ist kein fehlender Textkarten-Kopf.
                  'sp-fk',
                  // Die Insignium-Karte des Tages: die Verwandlung als Bühne.
                  'ni-b',
                  // Die Ehrung: je Geehrtem eine Säule mit der Zeichenkachel;
                  // knapp (Tag, Woche, Monat) die Gesichter mit ihrem Prestige.
                  'eh-buehne', 'eh-kp'];
    arr.forEach(x => {
      host.innerHTML = x.html;
      const karte = host.querySelector('.nf-card');
      if(!karte) return;
      if(!BILD.some(c => karte.querySelector('.' + c))) ohneBild.push(x.typ);
      const kr = karte.getBoundingClientRect();
      karte.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if(r.width > 0 && (r.right > kr.right + 0.5 || r.left < kr.left - 0.5))
          raus.push(x.typ + ' ' + (el.className || el.tagName));
      });
    });
    host.remove();
    return {n: arr.length, raus: [...new Set(raus)],
            ohneBild: [...new Set(ohneBild)]};
  });
  ok(kartenMobil.n >= 20, 'jede Sorte baut ihre Karte', kartenMobil.n + ' Fassungen');
  ok(kartenMobil.ohneBild.length === 0,
     'und jede traegt eine Bildzone, nicht nur Text',
     kartenMobil.ohneBild.join(', ') || 'jede mit Bild');
  ok(kartenMobil.raus.length === 0, 'und keine laeuft bei 360 px aus ihrem Rand',
     kartenMobil.raus.slice(0, 4).join(' | ') || 'keine');

  // ── Die Ehrung bei 360 px ────────────────────────────────────────
  //    Je Geehrtem eine Säule auf seinem Wappen, höchstens fünf je Reihe,
  //    jede Reihe auf ihrer Grundlinie, keine über den Rand — gemessen in der
  //    Breite, die die Karte im Feed hat: 287 px bei 360, 247 px bei 320.
  //    Gerechnet mit 360 px Kartenbreite brachen fünf Wappen im Feed in zwei
  //    Reihen, die Karte wurde 130 px höher und schob die Breaking-Karte aus
  //    dem Bild. Im Blatt stehen vier mit Namen in einer Reihe — die vierte
  //    brach dort allein in eine zweite. Und der Name einer gewöhnlichen
  //    Auszeichnung steht über der ganzen Breite ihrer Kachel: neben Zeichen
  //    und Wert brach „Pflichterfüller" mitten im Wort.
  const ehrung = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      // Gespeicherte Ehrungen einer Runde stehen weiter im Feed; gezeichnet
      // aus der Ehrung jedes Tages, von seiner ersten bis zur letzten Partie.
      const alle = [];
      [...new Set(matches.map(m => tagKey(mts(m))))].forEach(tg => {
        const ms = matches.filter(m => tagKey(mts(m)) === tg), t = new Date(tg + 'T23:59:00').getTime();
        const s = _ehrungKarte(_ehrungDesTages(t), 'ehrung_' + ms[ms.length - 1].id, t, {ab:mts(ms[0]), bis:mts(ms[ms.length - 1])});
        if(s) alle.push(s);
      });
      alle.sort((a, b) => b.dataRef.spieler.length - a.dataRef.spieler.length);
      const mit = n => alle.find(s => s.dataRef.spieler.length === n);
      return [alle[0], mit(5), mit(4), alle[alle.length - 1]].filter(Boolean).map(s => ({n:s.dataRef.spieler.length,
        karte:_newsEhrungHtml(s, false, ''), mitte:_ndEhrungBlatt(s).mitte, kopf:_ndEhrungBlatt(s).kopf}));
    })())`);
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0';
    document.body.appendChild(host);
    const out = [];
    JSON.parse(roh).forEach(x => {
      const je = [287, 247].map(breite => {
        host.style.width = breite + 'px';
        host.innerHTML = x.karte;
        const karte = host.querySelector('.nf-card'), kr = karte.getBoundingClientRect();
        const s = [...karte.querySelectorAll('.eh-s')].map(e => e.getBoundingClientRect());
        const boden = [...karte.querySelectorAll('.eh-s-av')].map(e => Math.round(e.getBoundingClientRect().bottom));
        const groesse = [...karte.querySelectorAll('.eh-s-av > .rav')].map(e => Math.round(e.getBoundingClientRect().width));
        return {reihen:new Set(boden).size, wappen:groesse.length, klein:Math.min(...groesse),
          drin:s.every(r => r.left >= kr.left - .5 && r.right <= kr.right + .5)};
      });
      host.style.width = '360px';
      out.push({n:x.n, saeulen:(x.karte.match(/class="eh-s"/g) || []).length, soll:Math.ceil(x.n / 5),
        reihen:je.map(j => j.reihen), wappen:je.map(j => j.wappen), klein:je.map(j => j.klein), drin:je.every(j => j.drin)});
      // Die Bühne des Blatts in seiner Breite: bei 360 px ist sie im Blatt
      // 270 px breit, gemessen an einem offenen Blatt.
      host.innerHTML = `<div style="width:270px">${x.kopf}</div>`;
      const kb = [...host.querySelectorAll('.eh-s-av')].map(e => Math.round(e.getBoundingClientRect().bottom));
      out[out.length - 1].blattReihen = new Set(kb).size;
      out[out.length - 1].blattSoll = Math.ceil(x.n / 4);
      host.innerHTML = `<div style="padding:0 16px">${x.mitte}</div>`;
      const gebrochen = [];
      host.querySelectorAll('.eh-g-t > b').forEach(b => {
        const zeile = parseFloat(getComputedStyle(b).lineHeight) || 14;
        if(!/\s/.test(b.textContent.trim()) && b.getBoundingClientRect().height > zeile * 1.5) gebrochen.push(b.textContent);
      });
      out[out.length - 1].gebrochen = gebrochen;
      out[out.length - 1].kacheln = host.querySelectorAll('.eh-g-t').length;
    });
    host.remove();
    return out;
  });
  ok(ehrung.length === 4 && ehrung[0].n > 6 && ehrung.every(x => x.saeulen === x.n && x.wappen.every(w => w === x.n)
       && x.reihen.every(r => r === x.soll) && x.klein[0] === 48 && x.klein[1] >= 40 && x.blattReihen === x.blattSoll && x.drin),
     'die Ehrung stellt jeden Geehrten als Säule auf sein Wappen, höchstens fünf je Reihe in der Karte des Feeds und vier im Blatt, bei 360 px zu 48 px, und bleibt in der Karte',
     JSON.stringify(ehrung.map(x => ({n:x.n, s:x.saeulen, w:x.wappen, reihen:x.reihen.join(',') + '/' + x.soll, klein:x.klein,
       blatt:x.blattReihen + '/' + x.blattSoll, drin:x.drin}))));
  ok(ehrung.some(x => x.kacheln > 0) && ehrung.every(x => !x.gebrochen.length),
     'im Blatt der Ehrung bricht kein Name einer Kachel mitten im Wort',
     ehrung.flatMap(x => x.gebrochen).join(', ') || ehrung.map(x => x.kacheln).join('+') + ' Kacheln');
  // ── Die Ehrung einer Woche und eines Monats ist knapp ────────────
  //    Sie steht unter der Wochenkarte und dem Monatsabschluss und darf sie
  //    nicht überschatten: mit Säulen und Namen war die Ehrung der Woche
  //    höher als ein Bildschirm. Gemessen in der Breite der Karte im Feed:
  //    die Gesichter in einer Reihe, nichts über den Rand. Bei 360 px
  //    (287 px Karte) höchstens 190 px und zwei Drittel der Wochenkarte
  //    darüber; bei 320 px (247 px), wo Zeitraum und Legende umbrechen,
  //    höchstens 225 px und drei Viertel. Mit Säulen und Namen waren es 340
  //    und mehr, mit eigener Balkenzeile und Summe noch 233.
  const knapp = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = JSON.parse(K(`JSON.stringify((function(){
      const l = _buildStories();
      const e = l.filter(x => /^ehrung_der_woche_/.test(x.id)).sort((a, b) => b.dataRef.spieler.length - a.dataRef.spieler.length)[0];
      const w = e && l.find(x => (x.dataRef||{}).type === 'woche' && +new Date(x.when) === +new Date(e.when));
      const m = _newsZeitraumEhrungen(new Date(2026, 7, 5).getTime()).find(x => x.dataRef.periode === 'monat');
      return {e:e ? _newsCardHtmlM2(e, false, false, '') : '', ne:e ? e.dataRef.spieler.length : 0,
        w:w ? _newsCardHtmlM2(w, false, false, '') : '', m:m ? _newsCardHtmlM2(m, false, false, '') : '', nm:m ? m.dataRef.spieler.length : 0};
    })())`));
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0';
    document.body.appendChild(host);
    const miss = (html, breite) => {
      host.style.width = breite + 'px';
      host.innerHTML = '<div class="nf-feed">' + html + '</div>';
      const k = host.querySelector('.nf-card');
      if(!k) return null;
      const r = k.getBoundingClientRect();
      const s = [...k.querySelectorAll('.eh-kp-s')].map(x => x.getBoundingClientRect());
      return {h:Math.round(r.height), reihe:new Set(s.map(q => Math.round(q.top))).size, n:s.length,
        drin:[...k.querySelectorAll('.eh-kp-s, .eh-kp-l > *, .eh-kp-b')].every(x => { const q = x.getBoundingClientRect();
          return q.left >= r.left - .5 && q.right <= r.right + .5; })};
    };
    const out = [];
    [287, 247].forEach(b => { out.push({art:'woche', b, n:roh.ne, karte:miss(roh.e, b), ueber:miss(roh.w, b)});
      out.push({art:'monat', b, n:roh.nm, karte:miss(roh.m, b)}); });
    host.remove();
    return out;
  });
  ok(knapp.length === 4 && knapp.every(x => x.karte && x.karte.reihe === 1 && x.karte.drin && x.karte.h <= (x.b === 287 ? 190 : 225))
       && knapp.filter(x => x.art === 'woche').every(x => x.ueber && x.karte.h <= x.ueber.h * (x.b === 287 ? 2 / 3 : 3 / 4))
       && knapp.some(x => x.n > 5),
     'die Ehrung der Woche und des Monats steht knapp: Gesichter in einer Reihe, nichts über den Rand, bei 360 px höchstens 190 px und zwei Drittel der Wochenkarte, bei 320 px höchstens 225 px und drei Viertel',
     JSON.stringify(knapp.map(x => [x.art, x.b, x.n, x.karte && x.karte.h, x.karte && x.karte.reihe, x.ueber && x.ueber.h])));
  // ── Eine Auszeichnung im Blatt öffnet ihre Detailansicht [§8.5] ──────
  //    Wer in der Ehrung der Woche „Player of the Week" antippte, landete im
  //    Profil und suchte die Auszeichnung dort zwischen sechzig anderen. Jede
  //    Zeile und Kachel der Ehrung öffnet sie jetzt, über dem Blatt der Story
  //    und nicht dahinter (mit z-index 120 lag sie unter der Story auf 140);
  //    Escape schließt zuerst sie. Eine Auszeichnung ohne Partie nennt die
  //    Wochen, für die sie kam, und eine davon öffnet ihren Rückblick. Die
  //    Posten „Auszeichnungen" der Laufbahn öffnen sie ebenso, und die
  //    Klasse heißt auf Deutsch wie in den Stories.
  const bpBlatt = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const bestand = K('_cache._stories');
    K('_cache._stories = _buildStories()');
    try {
      const e = K('_cache._stories').filter(x => /^ehrung_der_woche_/.test(x.id))
        .find(x => x.dataRef.spieler.some(y => y.posten.some(q => q.id === 'potw')));
      K(`openNewsDetail(${JSON.stringify(e.id)})`); await warte(400);
      const nd = document.getElementById('nd'), bpBg = document.getElementById('bpBg'), bp = document.getElementById('bp');
      const alle = [...nd.querySelectorAll('.eh-g-t')];
      out.alle = alle.length; out.markiert = alle.filter(x => x.dataset.bp && x.dataset.bpPid).length;
      const zeile = nd.querySelector('.eh-g-t[data-bp="potw"]');
      out.pid = zeile && zeile.dataset.bpPid;
      zeile.scrollIntoView({block:'center'}); await warte(80);
      const r = zeile.getBoundingClientRect();
      document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).click(); await warte(400);
      const b = bp.getBoundingClientRect();
      const oben = document.elementFromPoint(b.left + b.width / 2, b.top + 12);
      out.offen = bpBg.classList.contains('show') && !!oben && bp.contains(oben);
      out.ndOffen = document.getElementById('ndBg').classList.contains('show');
      out.titel = (bp.querySelector('.bp-title') || {}).textContent;
      out.englisch = /\b(Legendary|Rare|Common)\b/.test(bp.textContent);
      out.kopf = [...bp.querySelectorAll('.bp-section')].map(x => x.textContent.trim()).join('|');
      out.wochen = bp.querySelectorAll('.bp-match[data-bp-zeit^="woche|"]').length;
      out.soll = (K(`getCachedBadges(${JSON.stringify(out.pid)})`).find(x => x.id === 'potw') || {}).count;
      document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})); await warte(300);
      out.escape = !bpBg.classList.contains('show') && document.getElementById('ndBg').classList.contains('show');
      zeile.click(); await warte(400);
      const w = bp.querySelector('.bp-match[data-bp-zeit^="woche|"]');
      out.woche = w ? w.dataset.bpZeit.split('|')[1] : '';
      if(w){ w.click(); await warte(700); }
      out.rueckblick = !bpBg.classList.contains('show') && !document.getElementById('ndBg').classList.contains('show')
        && document.getElementById('sheet').classList.contains('show');
      // Eine Ebene zurück, wie der Schließknopf: darunter liegt der Feed, den
      // die Prüfungen danach brauchen.
      K('closeSheet()'); await warte(450);
      // Die Laufbahn: jeder Posten einer Auszeichnung öffnet sie über dem Blatt.
      K(`sheetNav(() => showLaufbahn(${JSON.stringify(out.pid)}))`); await warte(500);
      const sheet = document.getElementById('sheet');
      const lb = [...sheet.querySelectorAll('.lb-grp')].find(g => /Auszeichnungen/.test(g.textContent));
      const posten = lb ? [...lb.querySelectorAll('.lb-q:not(.leer)')] : [];
      out.lb = posten.length; out.lbMarkiert = posten.filter(x => x.dataset.bp && x.dataset.bpPid === out.pid).length;
      if(posten[0]){ posten[0].click(); await warte(400); }
      const b2 = bp.getBoundingClientRect();
      const oben2 = document.elementFromPoint(b2.left + b2.width / 2, b2.top + 12);
      out.lbOffen = bpBg.classList.contains('show') && !!oben2 && bp.contains(oben2) && sheet.classList.contains('show');
      K('closeBadgePopover()'); await warte(300); K('closeSheet()'); await warte(450);
      out.feed = !!sheet.querySelector('.nf-card');
    } finally { K('(function(b){ _cache._stories = b; })')(bestand); }
    return out;
  });
  ok(bpBlatt.alle > 10 && bpBlatt.markiert === bpBlatt.alle && bpBlatt.offen && bpBlatt.ndOffen && bpBlatt.titel === 'Player of the Week' && !bpBlatt.englisch,
     'jede Auszeichnung im Blatt der Ehrung öffnet ihre Detailansicht über der Story, die offen bleibt, und ihre Klasse heißt deutsch', JSON.stringify(bpBlatt));
  ok(bpBlatt.escape, 'Escape schließt zuerst die Auszeichnung, die Story bleibt', JSON.stringify(bpBlatt));
  ok(/^Geholt in (einer|\d+) Wochen?$/.test(bpBlatt.kopf) && bpBlatt.wochen === bpBlatt.soll && bpBlatt.wochen > 0 && bpBlatt.woche && bpBlatt.rueckblick,
     'eine Auszeichnung ohne Partie nennt jede Woche, für die sie kam, und eine Woche öffnet ihren Rückblick', JSON.stringify(bpBlatt));
  ok(bpBlatt.lb > 0 && bpBlatt.lbMarkiert === bpBlatt.lb && bpBlatt.lbOffen && bpBlatt.feed,
     'jeder Posten einer Auszeichnung in der Laufbahn öffnet sie über dem Blatt, und zurück steht der Feed', JSON.stringify(bpBlatt));
  // ── Was ein Schluss vergibt, als Grund eines Zeichens [§11.0e] ────
  //    In der Zeichen-Karte des Wochenschlusses: Kachel, Gesicht, Satz und
  //    Wort der Klasse in einer Zeile, die in der Karte bleibt — gemessen in
  //    der Breite der Karte im Feed (287 px bei 360, 247 px bei 320) und im
  //    Blatt. Unter dem Spieler des Tages, der Woche und dem Meister steht
  //    sie nicht mehr: das trägt die Ehrung des Schlusses [§11.6f].
  //    Der Name der Auszeichnung bricht nicht: im Blatt stand „Award-" am
  //    Zeilenende und „Sammler" darunter.
  const abschluss = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const p = players.filter(x => !x.hidden).map(x => x.id);
      const liste = [{id:'award_collector', name:'Award-Sammler', ic:'medalTrio', klasse:'legendary',
          spieler:[{pid:p[6], mal:1, p:70}]},
        {id:'potw', name:'Player of the Week', ic:'weekKing', klasse:'rare', spieler:[{pid:p[3], mal:12, p:30}]},
        {id:'godly_streak', name:'Tag der Götter', ic:'godRay', klasse:'rare', spieler:[{pid:p[9], mal:2, p:25}]}];
      return {karte:'<div class="nf-card">' + _newsAbschlussHtml(liste) + '</div>', blatt:_newsAbschlussHtml(liste, true)};
    })())`);
    const x = JSON.parse(roh);
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0';
    document.body.appendChild(host);
    const miss = (wo, breite, html) => {
      host.style.width = breite + 'px';
      host.innerHTML = html;
      const rahmen = (host.querySelector('.nf-card') || host).getBoundingClientRect();
      const zeilen = [...host.querySelectorAll('.nf-abs')];
      const fehler = [];
      zeilen.forEach(z => {
        const r = z.getBoundingClientRect();
        if(r.left < rahmen.left - .5 || r.right > rahmen.right + .5) fehler.push(wo + ' ' + breite + ': Zeile ragt hinaus');
        [...z.children].forEach(k => { const q = k.getBoundingClientRect();
          if(q.right > r.right + .5 || q.left < r.left - .5) fehler.push(wo + ' ' + breite + ': ' + k.className + ' ragt hinaus'); });
        const em = z.querySelector('em');
        if(!em || [...em.getClientRects()].filter(q => q.width > 0).length !== 1) fehler.push(wo + ' ' + breite + ': ' + (em ? em.textContent : 'kein Name') + ' bricht');
        if(!z.querySelector('.zk') || !z.querySelector('.av') || !z.querySelector(':scope > i')) fehler.push(wo + ' ' + breite + ': Teil fehlt');
      });
      return {n:zeilen.length, fehler};
    };
    const out = [miss('Karte', 287, x.karte), miss('Karte', 247, x.karte),
      miss('Blatt', 328, '<div>' + x.blatt + '</div>'), miss('Blatt', 288, '<div>' + x.blatt + '</div>')];
    host.remove();
    return out;
  });
  ok(abschluss.every(a => a.n === 3) && abschluss.every(a => !a.fehler.length),
     'was ein Schluss vergibt, steht als Zeile in der Karte und im Blatt, bei 320 und 360 px, und kein Name einer Auszeichnung bricht',
     JSON.stringify(abschluss.map(a => a.n)) + ' ' + abschluss.flatMap(a => a.fehler).slice(0, 4).join(' | '));
  // Unter der Schlagzeile, aus welchen Partien die Auszeichnungen stammen:
  // oben in einer Zeile, was der Zeitraum bedeutet, darunter der Zeitraum —
  // in der Karte, vor dem Pfeil. Ein Tag steht bei 360 px in einer Zeile;
  // bei 320 px und über mehrere Tage höchstens zwei, auch im längsten Fall
  // („vom 06.10., 15:12 Uhr bis 08.10., 15:10 Uhr").
  const ehZeit = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const karten = JSON.parse(K(`JSON.stringify((function(){
      const ms = matches.filter(m => tagKey(mts(m)) === tagKey(mts(matches[0]))), t0 = new Date(tagKey(mts(ms[0])) + 'T23:59:00').getTime();
      const s = _ehrungKarte(_ehrungDesTages(t0), 'ehrung_' + ms[ms.length - 1].id, t0, {ab:mts(ms[0]), bis:mts(ms[ms.length - 1])});
      const um = (tage, h, m) => { const d = new Date(); d.setDate(d.getDate() - tage); d.setHours(h, m, 0, 0); return d.getTime(); };
      const mit = (ab, bis) => Object.assign({}, s, {dataRef:Object.assign({}, s.dataRef, {ab, bis})});
      return [[_newsEhrungHtml(s, false, ''), 0], [_newsEhrungHtml(mit(um(0, 13, 44), um(0, 15, 55)), false, ''), 1],
        [_newsEhrungHtml(mit(um(1, 23, 10), um(0, 0, 40)), false, ''), 0],
        [_newsEhrungHtml(mit(um(16, 15, 12), um(14, 15, 10)), false, ''), 0]];
    })())`));
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0';
    document.body.appendChild(host);
    const falsch = [];
    let lang = '';
    // Die Ausdehnung des TEXTS, nicht des Kastens: ein Kasten schrumpft
    // nicht mit, wenn der Text über ihn hinausläuft.
    const zeilen = el => { const rg = document.createRange(); rg.selectNodeContents(el);
      return {r:rg.getBoundingClientRect(), n:Math.round(rg.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))}; };
    karten.forEach(([h, einTag], i) => [287, 247].forEach(breite => {
      host.style.width = breite + 'px';
      host.innerHTML = h;
      const k = host.querySelector('.nf-card').getBoundingClientRect();
      const z = host.querySelector('.eh-zr'), c = host.querySelector('.nf-chev');
      const kv = z && z.querySelector('.eh-zr-k'), t = z && z.querySelector('.eh-zr-t');
      if(!kv || !t){ falsch.push(i + '/' + breite + ': keine Zeile'); return; }
      const r = z.getBoundingClientRect(), a = zeilen(kv), b = zeilen(t);
      if(r.left < k.left || r.right > k.right || a.r.right > r.right + .5 || b.r.right > r.right + .5) falsch.push(i + '/' + breite + ': ragt hinaus');
      if(c && r.right > c.getBoundingClientRect().left + .5) falsch.push(i + '/' + breite + ': unter dem Pfeil');
      if(a.n !== 1) falsch.push(i + '/' + breite + ': Bedeutung in ' + a.n + ' Zeilen');
      if(b.r.top < a.r.bottom - .5) falsch.push(i + '/' + breite + ': Zeitraum neben der Bedeutung');
      if(b.n > 2 || (einTag && breite === 287 && b.n !== 1)) falsch.push(i + '/' + breite + ': Zeitraum in ' + b.n + ' Zeilen');
      if(i === 3) lang = (kv.textContent + ' ' + t.textContent).replace(/\u00a0/g, ' ');
    }));
    host.remove();
    return {falsch, lang};
  });
  ok(!ehZeit.falsch.length && /^Geholt in den Partien vom \d\d\.\d\d\., 15:12 Uhr bis \d\d\.\d\d\., 15:10 Uhr$/.test(ehZeit.lang),
     'die Ehrung sagt unter der Schlagzeile, in welchen Partien die Auszeichnungen geholt sind: in der Karte, vor dem Pfeil, ein Tag bei 360 px in einer Zeile, sonst in höchstens zwei',
     ehZeit.falsch.join(' | ') || ehZeit.lang);

  // ── Jedes Blatt passt auf das Telefon ────────────────────────────
  //    Gemessen am Blatt eines Tafel-Moments: die Zahlenreihe trug fuenf
  //    Zellen, „BESTMARKEN" war 75 px breit und die Zelle 62 — `overflow:
  //    hidden` schnitt die Aufschrift ab. Daneben endete „noch 1615 bis zum
  //    Ordensstern" als „noch 1615 bis zum Ord…" und nannte die Stufe nicht.
  //    Gefragt ist deshalb bei JEDEM Story-Typ, ob etwas aus seinem Kasten
  //    laeuft oder abgeschnitten ist — bei 360 px, der Breite, mit der die
  //    uebrigen Messungen dieser Suite rechnen.
  const mobil = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const r = _buildStories();
      _cache._stories = r.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
      _cache._consolFrom = null; _cache._frischVon = null;
      const alle = getStoriesCache();
      const out = [], gesehen = {};
      alle.concat(r).forEach(s => {
        const d = s.dataRef || {};
        const t = (d.type||'?') + (d.quelle ? '/' + d.quelle : '');
        if(gesehen[t]) return; gesehen[t] = 1;
        let b = ''; try { b = _newsDetailBody(s); } catch(e){ b = ''; }
        if(b) out.push({typ:t, html:b});
      });
      return out;
    })())`);
    const arr = JSON.parse(roh);
    // Gemessen wird im Blatt selbst (`.nd`), nicht in einem nackten Kasten:
    // dort gilt `.nd .num{white-space:nowrap}`, und genau diese Regel hielt
    // „Maxi gewinnt an dieser Seite 100 %, sonst 31 %" in einer Zeile fest
    // und schnitt „176 Elo dazwischen" am Rand der Bühne ab. Im nackten
    // Kasten brach beides um, und die Prüfung sah nichts.
    // So breit wie das Blatt auf einem 360-px-Telefon: es steht mit Rand im
    // Bildschirm, gemessen 310 px. Bei 360 passte „176 Elo dazwischen"
    // gerade noch, auf dem Telefon nicht.
    const host = document.createElement('div');
    host.className = 'nd';
    host.style.width = '310px';
    host.style.maxHeight = 'none';
    host.style.overflow = 'hidden';
    document.body.appendChild(host);
    const raus = [], abgeschnitten = [];
    arr.forEach(x => {
      host.innerHTML = x.html;
      const hr = host.getBoundingClientRect();
      // Laeuft etwas ueber den Rand des Blatts hinaus?
      host.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if(r.width > 0 && r.right > hr.right + 0.5)
          raus.push(x.typ + ' ' + el.className);
      });
      // Und laeuft ein Text aus dem Kasten, der ihn abschneidet, ohne dass
      // er mit „…" endet? Gemessen wird die Schrift, nicht der Kasten: ein
      // Text, der nicht umbricht, ist breiter als sein Element.
      const tw = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      let tn;
      while((tn = tw.nextNode())){
        const el = tn.parentElement;
        if(!tn.textContent.trim() || !el || el.closest('svg')) continue;
        let kappe = null, ell = false, rollt = false;
        for(let p = el; p && p !== host.parentElement; p = p.parentElement){
          const cs = getComputedStyle(p);
          if(/(auto|scroll)/.test(cs.overflowX) && p !== host){ rollt = true; break; }
          if(cs.textOverflow === 'ellipsis') ell = true;
          if(/(hidden|clip)/.test(cs.overflowX)){ kappe = p; break; }
        }
        if(rollt || ell || !kappe) continue;
        const rg = document.createRange(); rg.selectNodeContents(tn);
        const rs = [...rg.getClientRects()].filter(r => r.width > 0.5);
        if(!rs.length) continue;
        // Breiter als sein eigenes Feld heißt: er reicht in das daneben
        // oder bis an den Rand, der ihn abschneidet.
        const eb = el.getBoundingClientRect();
        if(Math.max(...rs.map(r => r.right)) > kappe.getBoundingClientRect().right + 1
           || Math.max(...rs.map(r => r.right)) - Math.min(...rs.map(r => r.left)) > eb.width + 1)
          abgeschnitten.push(x.typ + ' „' + tn.textContent.trim().slice(0, 28) + '"');
      }
      // Und ist ein Text abgeschnitten, obwohl er nicht kuerzen darf? Die
      // Aufschriften der Zahlenreihe und die Zeile der Wirkung sind die
      // gemessenen Faelle; eine Schlagzeile DARF kuerzen.
      host.querySelectorAll('.rcp-z-l, .nd-wk-r, .nd-chance-z, .nw-ic').forEach(el => {
        if(el.scrollWidth > el.clientWidth + 1)
          abgeschnitten.push(x.typ + ' ' + el.className + ' '
            + el.scrollWidth + '>' + el.clientWidth);
      });
    });
    host.remove();
    return {n: arr.length, raus: [...new Set(raus)], ab: [...new Set(abgeschnitten)]};
  });
  ok(mobil.n >= 15, 'jeder Story-Typ baut ein Blatt', mobil.n + ' Typen');
  ok(mobil.raus.length === 0, 'und keines laeuft bei 360 px aus seinem Rand',
     mobil.raus.slice(0, 4).join(' | ') || 'keines');
  ok(mobil.ab.length === 0, 'keine Aufschrift und kein Text ist abgeschnitten, gemessen im Blatt selbst',
     mobil.ab.slice(0, 4).join(' | ') || 'keine');

  // ── Der Spieltag als Bahn ────────────────────────────────────────
  //    Das Blatt des Spielers des Tages zeigte jede Partie als vollen
  //    Vs-Block: an einem Tag mit zehn Partien vierzig Wappen und eine Wand.
  //    Die Bahn zeigt den Tag in einer Zeile, und die Farbe IST die Aussage —
  //    also wird sie gemessen.
  const bahn = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const r = _buildStories();
      const p = r.find(s => (s.dataRef||{}).type === 'potd');
      if(!p) return null;
      const d = p.dataRef || {};
      const pids = (Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId];
      const held = pids[0];
      const tag = _newsTagPartien(d.dayKey, pids)
        .filter(m => [m.a1,m.a2,m.b1,m.b2].indexOf(held) >= 0)
        .sort((a,b) => mts(a) - mts(b));
      const siege = tag.map(m => {
        const aSeite = (m.a1 === held || m.a2 === held);
        return aSeite ? m.winner === 'A' : m.winner === 'B';
      });
      return {html:_newsDetailBody(p), n:tag.length, siege};
    })())`);
    if(roh === 'null') return {fehlt:true};
    const x = JSON.parse(roh);
    if(!x) return {fehlt:true};
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = x.html;
    document.body.appendChild(host);
    const felder = [...host.querySelectorAll('.nd-bahn i')];
    const zeilen = [...host.querySelectorAll('.nd-tm')];
    // Die Farbe folgt dem Ausgang, und die Reihenfolge ist die Zeit.
    const falsch = felder.filter((f, i) =>
      f.classList.contains('w') !== !!x.siege[i]).length;
    const bahnBox = host.querySelector('.nd-bahn');
    const raus = bahnBox ? felder.filter(f =>
      f.getBoundingClientRect().right > bahnBox.getBoundingClientRect().right + 0.5).length : 0;
    const out = {fehlt:false, n:x.n, felder:felder.length, zeilen:zeilen.length,
                 falsch, raus,
                 bloecke: host.querySelectorAll('.nd-match').length};
    host.remove(); return out;
  });
  ok(!bahn.fehlt && bahn.felder === bahn.n && bahn.zeilen === bahn.n,
     'die Bahn zeigt jede eigene Partie des Tages',
     bahn.felder + ' Felder und ' + bahn.zeilen + ' Zeilen von ' + bahn.n);
  ok(!bahn.fehlt && bahn.falsch === 0,
     'und jedes Feld traegt die Farbe seines Ausgangs',
     bahn.falsch + ' verkehrt');
  ok(!bahn.fehlt && bahn.raus === 0 && bahn.bloecke === 0,
     'sie bleibt in ihrer Zeile und ersetzt die Vs-Bloecke',
     bahn.raus + ' heraus, ' + bahn.bloecke + ' Bloecke');

  // ── Wie weit dahinter, sieht man ─────────────────────────────────
  //    Die Verfolgerliste nannte Rang, Name und Wert. Ob der Zweite knapp
  //    dran ist oder weit weg, musste man daraus ausrechnen — und bei „84 %"
  //    gegen „81 %" gegen „62 %" ist gerade das die Aussage. Der Balken zeigt
  //    den Anteil am Bestwert, und nur dort, wo er etwas bedeutet.
  const verfolger = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const out = [];
      // Ein Rekord mit positivem Sortierwert traegt den Balken, einer mit
      // negativem nicht: „weniger Gegentore ist besser" hat keinen Anteil.
      // Ebenso keiner, unter dessen gezeigten Verfolgern ein Wert unter null
      // steht — „Der Allrounder" misst den Abstand zur Rechnung, und ein
      // negativer Anteil am Bestwert waere ein Balken, der nach links waechst.
      const byId = (allChronicles() || {}).byId || {};
      Object.keys(byId).forEach(id => {
        const r = byId[id];
        if(!r || !r.pids || !r.pids.length) return;
        const rang = chronicleRang(id) || [];
        if(rang.length < 3) return;
        // Das ganze Feld dahinter, wie im Blatt: es waren die ersten drei.
        const dahinter = rang.filter(x => r.pids.indexOf(x.pid) < 0 && x.wert <= r.val + 1e-9);
        out.push({id, wert:r.val, alle:dahinter.every(x => x.wert >= 0), html:_newsVerfolger(id, r.pids, r.val)});
      });
      return out.slice(0, 40);
    })())`);
    const arr = JSON.parse(roh);
    const host = document.createElement('div');
    host.style.width = '360px';
    document.body.appendChild(host);
    let mitBalken = 0, ohneBalken = 0, raus = 0, falschRum = 0;
    arr.forEach(x => {
      host.innerHTML = x.html;
      const zeilen = [...host.querySelectorAll('.nd-vf-z')];
      const balken = [...host.querySelectorAll('.nd-vf-b')];
      if(!zeilen.length) return;
      if(x.wert > 0 && x.alle){
        if(balken.length === zeilen.length) mitBalken++; else ohneBalken++;
        // Der Balken bleibt in seiner Bahn, und weiter hinten ist er kuerzer.
        let vor = Infinity;
        balken.forEach(b => {
          const i = b.querySelector('i');
          if(!i) { raus++; return; }
          const ir = i.getBoundingClientRect(), br = b.getBoundingClientRect();
          // Ein Wert von null hat einen leeren Balken; gezählt wird, was
          // über die Bahn hinausläuft oder nach links wächst.
          if(ir.right > br.right + 0.5 || ir.width < 0) raus++;
          if(ir.width > vor + 0.5) falschRum++;
          vor = ir.width;
        });
      } else if(balken.length){ ohneBalken++; }
    });
    host.remove();
    return {n: arr.length, mitBalken, ohneBalken, raus, falschRum};
  });
  ok(verfolger.mitBalken > 0 && verfolger.ohneBalken === 0,
     'jede Verfolgerzeile eines Rekords mit Anteil traegt ihren Balken',
     verfolger.mitBalken + ' Rekorde, ' + verfolger.ohneBalken + ' ohne');
  ok(verfolger.raus === 0, 'der Balken bleibt in seiner Bahn',
     verfolger.raus + ' laufen heraus');
  ok(verfolger.falschRum === 0, 'und wer weiter hinten liegt, hat den kuerzeren',
     verfolger.falschRum + ' verdreht');

  // ── Das Blatt einer Partie zeigt, was in ihr zu sehen war ────────
  //    Es hatte gar keinen Fall: wer eine Partie-Karte oeffnete, sah den
  //    Satz, den er auf der Karte schon gelesen hatte. Jetzt stehen die
  //    Siegchance auf ihrer Skala und die Elo-Wirkung je Spieler darin — und
  //    beides ist gezeichnet, also wird es gemessen und nicht behauptet.
  const spielBlatt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const tage=[...new Set(matches.map(m=>tagKey(mts(m))))].sort();
      const m=_newsTagMs(tage[tage.length-1])[0];
      const w=m.winner==='A'?[m.a1,m.a2]:[m.b1,m.b2];
      const v=m.winner==='A'?[m.b1,m.b2]:[m.a1,m.a2];
      const s={id:'spiel_'+m.id,cat:'highlight',ic:'thriller',
        when:new Date(mts(m)),prio:41,
        title:'Zwei entscheiden ein enges Spiel',
        desc:'Vor dem Anstoss lag die Siegchance bei 57 %.',
        dataRef:{type:'spiel',resultKind:'eng',matchId:m.id,winners:w,losers:v,
                 playerIds:w,margin:2,quote:57}};
      return _newsDetailBody(s);
    })()`);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const sk = host.querySelector('.nd-chance');
    const bahn = sk && sk.querySelector('.nd-chance-b');
    const fuell = bahn && bahn.querySelector('i');
    const striche = bahn ? [...bahn.querySelectorAll('u')] : [];
    const zeilen = [...host.querySelectorAll('.nd-elo')];
    const raus = zeilen.filter(z => {
      const b = z.querySelector('.nd-elo-b i'), zr = z.getBoundingClientRect();
      if(!b) return true;
      const br = b.getBoundingClientRect();
      return br.right > zr.right + 0.5 || br.width <= 0;
    }).length;
    const out = {
      skala: !!sk, zeilen: zeilen.length, raus,
      fuellDrin: !!(fuell && bahn
        && fuell.getBoundingClientRect().right <= bahn.getBoundingClientRect().right + 0.5
        && fuell.getBoundingClientRect().width > 0),
      striche: striche.length,
      stricheDrin: bahn ? striche.filter(u => {
        const ur = u.getBoundingClientRect(), br = bahn.getBoundingClientRect();
        return ur.left >= br.left - 0.5 && ur.right <= br.right + 0.5;
      }).length : 0,
      werte: [...host.querySelectorAll('.nd-elo-v')].map(x => x.textContent.trim()).join(' ')
    };
    host.remove(); return out;
  });
  // ── Das Blatt einer Partie aus dem Feed [§C33] ─────────────────────
  // Es zeigte einen nackten Stand und zwei Wappen mit „gewinnen diese
  // Partie", während die Karte darüber ihre Zeichnung trug. Jetzt steht die
  // Zeichnung der Karte als Bühne darüber, und darunter nur, was die Bühne
  // nicht schon zeigt: kein zweiter Stand, keine zweite Siegchance, keine
  // zweite Elo je Spieler, kein Satz, der eine Grafik erklärt. Die Bilanz
  // der direkten Duelle wird aus den rohen Partien nachgerechnet.
  const partieBlatt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    return JSON.parse(K(`JSON.stringify((function(){
      const pm = pmap(), name2id = {}; Object.keys(pm).forEach(id => { name2id[pm[id].name] = id; });
      const karten = getStoriesCache().filter(s => (s.dataRef||{}).matchId
        && ((s.dataRef||{}).type === 'spiel' || ((s.dataRef||{}).type === 'sammel' && _newsSorte(s) === 'spiel')));
      const falsch = []; let n = 0, duelle = 0, buendel = 0;
      const host = document.createElement('div'); host.style.width = '360px'; document.body.appendChild(host);
      karten.forEach(s => {
        const m = matches.find(x => x.id === s.dataRef.matchId); if(!m) return;
        const kopf = _spBild(s).kopf, html = _newsDetailBody(s);
        host.innerHTML = html; n++;
        const b = host.querySelector('.nd-buehne');
        if(!b || html.indexOf(kopf) < 0) falsch.push(s.id + ' ohne Bühne');
        if(host.querySelector('.nd-erg, .nd-held')) falsch.push(s.id + ' Stand oder Wappen doppelt');
        if(/besonders macht|gewinnen diese Partie|Siegchance lag|hängt daran|hängen daran/.test(host.textContent + ' ' + s.desc)) falsch.push(s.id + ' erklärt');
        if(s.dataRef.type === 'sammel'){ buendel++;
          // Steht der Hauptanlass mit Schlagzeile und Satz schon oben, hat er
          // keine eigene Zeile mehr: sie wiederholte beides [§C33].
          const oben = s.dataRef.teile.filter(t => (t.typ || t.type) !== 'spiel'
            && String(t.titel || '').trim() === String(s.title || '').trim() && String(t.text || '').trim()
            && String(t.text || '').trim() === String(s.desc || '').trim()).length;
          if(s.dataRef.teile.filter(t => (t.typ || t.type) !== 'spiel').length - oben !== host.querySelectorAll('.nw-zeile').length) falsch.push(s.id + ' Bündelzeilen'); }
        const chanceOben = /class="(sp-fk )?(sp-feld|sp-ta|sp-sd|sp-wp)/.test(kopf);
        if(chanceOben && host.querySelector('.nd-chance')) falsch.push(s.id + ' Siegchance doppelt');
        if(/class="(sp-fk )?sp-et/.test(kopf) && host.querySelector('.nd-elo')) falsch.push(s.id + ' Elo doppelt');
        if(/class="sp-feld/.test(kopf) && [...host.querySelectorAll('.nd-elo')].some(z => !z.querySelector('em'))) falsch.push(s.id + ' Elo neben dem Spielfeld');
        const fd = host.querySelector('.nd-feld');
        if(fd && (fd.querySelector('em.g, em.r') || getComputedStyle(fd.querySelector('.sp-f-sc')).display !== 'none')) falsch.push(s.id + ' Feld mit Stand oder Elo');
        const reihe = [...matches].sort((a, c) => mts(a) - mts(c)), vor = reihe.slice(0, reihe.indexOf(m) + 1);
        host.querySelectorAll('.nd-dd-z').forEach(z => {
          duelle++;
          const w = z.dataset.pid, l = name2id[z.querySelector('.nd-dd-n').lastChild.textContent];
          const geg = vor.filter(y => { const A = [y.a1, y.a2], B = [y.b1, y.b2];
            return (A.includes(w) && B.includes(l)) || (B.includes(w) && A.includes(l)); });
          const sw = geg.filter(y => (y.winner === 'A') === [y.a1, y.a2].includes(w)).length;
          if(z.querySelector('b').textContent !== sw + ':' + (geg.length - sw)) falsch.push(s.id + ' Duell ' + z.querySelector('b').textContent + ' statt ' + sw + ':' + (geg.length - sw));
        });
      });
      host.remove();
      return {n, duelle, falsch, buendel};
    })())`));
  });
  ok(partieBlatt.n > 20 && partieBlatt.buendel > 5 && partieBlatt.duelle > 40 && partieBlatt.falsch.length === 0,
     'das Blatt einer Partie und ihres Bündels trägt die Zeichnung der Karte als Bühne, darunter was daran hängt und nichts, was die Bühne schon zeigt, die Duelle aus den rohen Partien',
     partieBlatt.falsch.slice(0, 3).join(' | ') || partieBlatt.n + ' Blätter, davon ' + partieBlatt.buendel + ' Bündel, ' + partieBlatt.duelle + ' Duelle');
  ok(spielBlatt.skala, 'das Blatt einer Partie zeigt die Siegchance als Skala');
  ok(spielBlatt.fuellDrin,
     'ihr Balken bleibt in seiner Bahn',
     spielBlatt.fuellDrin ? 'innerhalb' : 'laeuft heraus');
  ok(spielBlatt.striche === 3 && spielBlatt.stricheDrin === 3,
     'und die drei Linien der Elo-Rechnung stehen darin',
     spielBlatt.stricheDrin + ' von ' + spielBlatt.striche);
  ok(spielBlatt.zeilen === 4,
     'die Elo-Wirkung steht je Spieler der Partie',
     spielBlatt.zeilen + ' Zeilen: ' + spielBlatt.werte);
  ok(spielBlatt.raus === 0,
     'und kein Ausschlag laeuft aus seiner Zeile',
     spielBlatt.raus + ' von ' + spielBlatt.zeilen);

  // ── Eine Sammelkarte bedeckt nicht den ganzen Bildschirm ─────────
  //    „Bündeln darf nichts verstecken" war fuer zwei bis vier Teile
  //    geschrieben. Gemessen trug ein Tafel-Moment neunzehn Zeilen — fuenf
  //    Bestmarken, dreizehn Monatschroniken und ein Insignium —, und die
  //    Karte war dreimal so hoch wie das Telefon: damit versteckte gerade
  //    die vollstaendige Liste alles andere. Auf der Karte stehen die
  //    staerksten, im Blatt jede Zeile.
  const flut = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const daten = K(`(function(){
      const when = matches[matches.length-1].created_at;
      const mk = (i) => ({id:'flut-'+i, cat:'tafel', ic:'trophyStar', when,
        prio: i < 5 ? 76 : i < 18 ? 62 : 40,
        title:(i < 5 ? 'Ein Rekord ' : i < 18 ? 'Eine Chronik ' : 'Ein Ausbau ') + i,
        desc:'Ein Satz mit ' + i + ' Zahlen.',
        dataRef:{type: i < 5 ? 'rekord_geholt' : i < 18 ? 'chronik_geholt' : 'rekord_gesteigert',
                 rekordId:'r'+i, titleId:'t'+i, playerIds:[players[i % 4].id]}});
      const l = []; for(let i = 0; i < 19; i++) l.push(mk(i));
      _cache._consolFrom = null;
      const s = _consolidateStories(l).find(x => (x.dataRef||{}).quelle === 'tafel');
      return s ? JSON.stringify({karte:_newsCardHtmlM2(s, false, false),
                                 blatt:_newsDetailMitte(s) || '',
                                 teile:(s.dataRef.teile||[]).length}) : '';
    })()`);
    if(!daten) return {fehlt:true};
    const d = JSON.parse(daten);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = d.karte;
    document.body.appendChild(host);
    const karte = host.querySelector('.nf-card');
    const zeilen = karte ? karte.querySelectorAll('.nf-sam-z').length : 0;
    const rest = karte ? karte.querySelector('.nf-sam-m') : null;
    const hoehe = karte ? karte.getBoundingClientRect().height : 0;
    // Gemessen wird die SCHRIFT, nicht der Kasten: mit 6 px Innenabstand
    // endete „und 13 weitere" einen Pixel ueber der Kartenkante, und die
    // Ecke von 14 px schnitt sie an.
    let luft = 0;
    if(rest && rest.firstChild){
      const r = document.createRange();
      r.selectNodeContents(rest);
      luft = Math.round(karte.getBoundingClientRect().bottom - r.getBoundingClientRect().bottom);
    }
    host.innerHTML = '<div class="nd">' + d.blatt + '</div>';
    const imBlatt = host.querySelectorAll('.nw-zeile').length;
    const out = {fehlt:false, teile:d.teile, zeilen, hoehe: Math.round(hoehe),
                 rest: rest ? rest.textContent.trim() : '', luft, imBlatt};
    host.remove(); return out;
  });
  ok(!flut.fehlt && flut.teile === 19,
     'ein Tafel-Moment kann neunzehn Spuren tragen', JSON.stringify(flut));
  ok(flut.zeilen === 4 && /15/.test(flut.rest),
     'die Karte zeigt die staerksten vier und zaehlt den Rest',
     flut.zeilen + ' Zeilen, „' + flut.rest + '"');
  ok(flut.hoehe < 640,
     'und bleibt damit kuerzer als ein Telefonbildschirm',
     flut.hoehe + ' px');
  // Die Ecke der Karte misst 14 px und `overflow:hidden` schneidet: was
  // darunter liegt, wird von der Rundung angeschnitten. Gemessen blieben
  // 10 px, und „und 13 weitere" sah aus wie ein Darstellungsfehler.
  ok(flut.luft >= 14,
     'und die Zahl der uebrigen Zeilen steht frei von der gerundeten Ecke',
     flut.luft + ' px Luft bei 14 px Radius');
  ok(flut.imBlatt === 19,
     'das Blatt zeigt trotzdem jede einzelne Zeile',
     flut.imBlatt + ' von ' + flut.teile);

  // ── Was oben steht, steht unten nicht noch einmal ────────────────
  //    `_breakingHeroText` hat nur fuer sieben Typen einen eigenen Satz und
  //    fiel sonst auf `s.desc` zurueck: gemessen stand der Teaser auf der
  //    gebuendelten Breaking-Karte zweimal untereinander.
  const brkKarte = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const p = matches[matches.length-1];
      const l = [
        {id:'bk-1', cat:'team', ic:'medal', when:new Date(mts(p)), prio:90,
         title:pname(p.a1)+' und '+pname(p.a2)+': Absoluter Sieger',
         desc:'Ein Spiel 10:0 gewonnen.',
         dataRef:{type:'badge_unlocked', badgeId:'perfect_win', rarity:'legendary',
                  badgeName:'Absoluter Sieger', matchId:p.id,
                  playerIds:[p.a1, p.a2]}},
        {id:'bk-2', cat:'liga', ic:'crown', when:new Date(mts(p)), prio:93,
         title:'Neuer Spitzenreiter: '+pname(p.a1),
         desc:pname(p.a1)+' steht nach 1 Spiel an der Spitze.',
         dataRef:{type:'lead_change', newLeader:p.a1, prevLeader:p.b1,
                  matchId:p.id}}
      ];
      _cache._consolFrom = null;
      const s = _consolidateStories(l).find(x => (x.dataRef||{}).type === 'sammel');
      return s ? _newsCardHtmlM2(s, false, false) : '';
    })()`);
    if(!markup) return {fehlt:true};
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const karte = host.querySelector('.nf-card');
    const d = karte ? karte.querySelector('.nf-d') : null;
    const sub = karte ? karte.querySelector('.nf-brk-sub') : null;
    // ── Der Anlass ist zu SEHEN, nicht nur zu lesen ────────────────
    //     Die Karte bricht die Spalte wegen EINER ihrer Zeilen, und die stand
    //     in derselben grauen Zeile wie die uebrigen — nur eine kleine Marke
    //     am rechten Rand sagte es. Gemessen wird deshalb die Zeile selbst:
    //     eine eigene Kante und eine eigene Flaeche.
    const zl = karte ? [].slice.call(karte.querySelectorAll('.nf-sam-z')) : [];
    const anl = zl.filter(x => x.classList.contains('brk'))[0] || null;
    const rest = zl.filter(x => !x.classList.contains('brk'))[0] || null;
    const out = {fehlt:false,
      brk: !!(karte && karte.classList.contains('nf-brk')),
      // Das Ergebnis steht im Kopf der Partie, der ihrem Anlass folgt [§11.6c].
      band: karte ? karte.querySelectorAll('.nf-erg, .sp-zeile, .sp-feld, .sp-at, .sp-wp, .sp-band, .sp-ag, .sp-pu, .sp-sm, .sp-hz, .sp-zn').length : 0,
      zeilen: zl.length,
      titel: karte ? (karte.querySelector('.nf-h') || {}).textContent || '' : '',
      zeilenText: zl.map(x => x.textContent.trim()).join(' | '),
      anlassKante: anl ? getComputedStyle(anl).boxShadow : '',
      // Eine eigene Flaeche heisst: nicht durchsichtig. Ein Vergleich mit der
      // Nachbarzeile taugt nicht — in diesem Buendel ist jede Zeile Breaking,
      // und dann gibt es keine Nachbarzeile ohne Marke.
      anlassBrk: zl.filter(x => x.classList.contains('brk')).length,
      anlassFlaeche: !!(anl
        && getComputedStyle(anl).backgroundColor !== 'rgba(0, 0, 0, 0)'
        && getComputedStyle(anl).backgroundColor !== 'transparent'),
      anlassZahl: karte ? karte.querySelectorAll('.nf-brk-n').length : 0,
      doppelt: !!(sub && d && sub.textContent.trim() === d.textContent.trim())};
    host.remove(); return out;
  });
  // Die stärkere Meldung ist die Schlagzeile, die andere ihre Zeile [§C33].
  ok(!brkKarte.fehlt && brkKarte.brk && brkKarte.band === 1 && brkKarte.zeilen === 1
     && /Spitzenreiter/.test(brkKarte.titel) && /Absoluter Sieger/.test(brkKarte.zeilenText),
     'der gemeinsame Breaking-Moment zeigt Ergebnis und beide Meldungen, eine als Schlagzeile',
     JSON.stringify(brkKarte));
  ok(brkKarte.anlassKante && brkKarte.anlassKante !== 'none' && brkKarte.anlassFlaeche,
     'und seine Anlass-Zeile traegt eine eigene Kante und eine eigene Flaeche',
     brkKarte.anlassKante + ' / Flaeche ' + brkKarte.anlassFlaeche);
  ok(brkKarte.anlassZahl === 1,
     'der Breaking-Balken einer gebuendelten Karte zeigt die Zahl der Meldungen',
     brkKarte.anlassZahl + ' Pille');
  ok(brkKarte.doppelt === false,
     'und seinen Teaser nur einmal, nicht als Nachsatz ein zweites Mal',
     String(brkKarte.doppelt));

  const palette = await page.evaluate(() => {
    const host = document.createElement('div');
    const sorten = ['spiel','tafel','ins','held','woche','duell','serie','badge','marke',
                    'fakt','spieler','erfolg'];
    const faktKeys = ['liga','persoenlich','form','duell','laufbahn','chronik','auszeichnung'];
    const tafelKeys = ['rekord','marke','chronik','fuegung','schatten','insignium'];
    const bau = window.__k.eval('_newsCardHtmlM2');
    host.innerHTML = sorten.map(s => `<div class="nf-card nf-s-${s}">
      <div class="nf-top"><span class="nf-rub"><i></i><b>${s}</b></span></div>
      <span class="nf-motiv"></span></div>`).join('')
      + '<div class="nf-card nf-s-tafel nf-gross"><div class="nf-gross-band"></div></div>'
      + '<div class="nf-card nf-s-held nf-gross"><div class="nf-gross-band"></div></div>'
      + '<div class="nd nd-s-tafel"><div class="nd-ic"></div><span class="nf-motiv"></span></div>'
      + '<div class="nd nd-s-serie nd-neg"><div class="nd-ic"></div></div>'
      + tafelKeys.map(k => `<div data-tafeltest="${k}" class="nf-card nf-s-tafel nf-tafel-${k}">
          <div class="nf-top"><span class="nf-rub"><b>${k}</b></span></div></div>`).join('')
      + faktKeys.map(k => `<div data-fakttest="${k}">${bau({
          id:'f_'+k, cat:'fun', ic:'chartBar', title:'Zahl der Liga',
          desc:'Ein echter Wert aus der Liga.', when:'2026-08-27T10:00:00Z',
          dataRef:{type:'ambient',ambientRubrik:k,vv:'12',vl:'Wert'}
        }, false, false)}</div>`).join('');
    document.body.appendChild(host);
    const farben = {};
    sorten.forEach(s => {
      const c = host.querySelector('.nf-s-' + s);
      farben[s] = {
        rubrik:getComputedStyle(c.querySelector('.nf-rub')).color,
        motiv:getComputedStyle(c.querySelector('.nf-motiv')).color,
        schimmer:getComputedStyle(c.querySelector('.nf-top')).backgroundImage
      };
    });
    const gross = [...host.querySelectorAll('.nf-gross-band')]
      .map(b => getComputedStyle(b, '::after').backgroundImage);
    const grossSchatten = [...host.querySelectorAll('.nf-gross')]
      .map(c => getComputedStyle(c).boxShadow);
    const fakten = {};
    faktKeys.forEach(k => {
      const c = host.querySelector(`[data-fakttest="${k}"] .nf-card`);
      fakten[k] = {
        rubrik:c.querySelector('.nf-rub b').textContent.trim(),
        farbe:getComputedStyle(c.querySelector('.nf-rub')).color,
        wert:getComputedStyle(c.querySelector('.nf-wert b')).color,
        grund:getComputedStyle(c).backgroundImage
      };
    });
    const tafelToene = {};
    tafelKeys.forEach(k => {
      const c = host.querySelector(`[data-tafeltest="${k}"] .nf-rub`);
      tafelToene[k] = getComputedStyle(c).color;
    });
    const detail = host.querySelector('.nd-s-tafel');
    const negativ = host.querySelector('.nd-neg');
    const out = {farben, gross, grossSchatten, fakten, tafelToene,
      detailIcon:getComputedStyle(detail.querySelector('.nd-ic')).color,
      detailMotiv:getComputedStyle(detail.querySelector('.nf-motiv')).color,
      detailLinie:getComputedStyle(detail, '::before').backgroundImage,
      negativ:getComputedStyle(negativ.querySelector('.nd-ic')).color};
    host.remove(); return out;
  });
  const farbe = s => palette.farben[s].rubrik;
  const kanalSpanne = c => {
    const n = (c.match(/\d+/g)||[]).slice(0,3).map(Number);
    return n.length === 3 ? Math.max(...n) - Math.min(...n) : 999;
  };
  const goldene = Object.keys(palette.farben).filter(s => farbe(s) === 'rgb(247, 207, 74)');
  ok(goldene.length === 2 && goldene.includes('held') && goldene.includes('woche'),
     'Gold bleibt allein Tages- und Wochensiegern', goldene.join(', ') || 'keine');
  ok(new Set(Object.values(palette.tafelToene)).size === 6
     && Object.values(palette.tafelToene).every(c => c !== farbe('held')),
     'jede Tafel-Kategorie traegt einen eigenen ruhigen Ton statt Gold',
     Object.values(palette.tafelToene).join(' / '));
  ok(farbe('ins') === farbe('badge') && farbe('badge') === farbe('spieler')
     && farbe('spieler') === farbe('erfolg') && farbe('ins') !== farbe('held'),
     'Laufbahn und Auszeichnungen bilden eine violette Familie', farbe('ins'));
  ok(farbe('spiel') === farbe('serie') && farbe('duell') !== farbe('spiel')
     && new Set(Object.values(palette.farben).map(x => x.rubrik)).size === 6
     && new Set(Object.values(palette.fakten).map(x => x.farbe)).size === 4
     && Object.values(palette.fakten).every(x => kanalSpanne(x.farbe) <= 30)
     && Object.values(palette.fakten).every(x => x.farbe === x.wert && x.grund !== 'none')
     && palette.fakten.liga.rubrik === 'LIGA IN ZAHLEN'
     && palette.fakten.form.rubrik === 'DIE FORMKURVE'
     && palette.fakten.duell.rubrik === 'DUELL IN ZAHLEN',
     'Spiel, Duell und Fakten bleiben in ruhigen, lesbaren Farbfamilien',
     new Set(Object.values(palette.fakten).map(x => x.farbe)).size + ' Fakten-Familien');
  ok(palette.gross[0] === palette.gross[1]
     && palette.gross[0].includes('247, 207, 74')
     && palette.grossSchatten.every(x => x.includes('247, 207, 74')),
     'die Karte des Tages traegt Band und aeusseren Schein immer in Gold',
     palette.grossSchatten.join(' / '));
  ok(palette.detailIcon === farbe('tafel') && palette.detailMotiv === farbe('tafel')
     && palette.detailLinie.includes('194, 201, 208'),
     'das Detailblatt setzt die Farbfamilie der Karte fort',
     palette.detailIcon + ' / ' + palette.detailLinie);
  ok(palette.negativ === 'rgb(240, 86, 106)',
     'eine negative Serie bleibt auch im Detailblatt rot', palette.negativ);

  console.log('\n═══ ROT BLEIBT DER RICHTUNG ═══');
  const richtung = await page.evaluate(() => {
    const bau = window.__k.eval('_newsCardHtmlM2');
    const roh = window.__k.eval('_buildStories()');
    const basis = roh[0];
    const huelle = document.createElement('div');
    document.getElementById('sheet').appendChild(huelle);
    const farbe = typ => {
      huelle.innerHTML = bau(Object.assign({}, basis, {dataRef:
        Object.assign({}, basis.dataRef || {}, {type: typ, a:'x', b:'y', streak:5})}), false, false);
      const r = huelle.querySelector('.nf-rub');
      return r ? getComputedStyle(r).color : '';
    };
    const pleite = farbe('team_loss_streak');
    const sieg = farbe('team_streak');
    huelle.remove();
    return {pleite, sieg, rot: /^rgb\(2[0-9]{2}, *[0-9]{1,3}, *[0-9]{1,3}\)/.test(pleite)};
  });
  ok(richtung.rot, 'die Durststrecke traegt Rot in der Rubrik', richtung.pleite);
  ok(richtung.pleite !== richtung.sieg, 'Serie und Durststrecke tragen nicht dieselbe Farbe',
     richtung.sieg + ' / ' + richtung.pleite);

  console.log('\n═══ KEINE LUECKEN IN DER KARTE ═══');
  const luecken = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    // Ein Duell steht im Feed nur noch mit seiner Partie; allein steht es nur
    // als gespeicherte Karte von früher. Fehlt eine, wird eine gestellt —
    // sonst prüfte die Zusicherung über das Band nichts.
    if(!sheet.querySelector('.nf-s-duell')){
      const html = window.__k.eval(`(function(){
        const m = matches[matches.length - 1];
        return _newsCardHtmlM2({id:'probe_duell', title:'100. Duell: ' + pname(m.a1) + ' vs ' + pname(m.b1),
          desc:'Nach 100 Duellen steht es 52:48.', when:new Date(mts(m)), cat:'rivalry', ic:'crossedSwords', prio:40,
          dataRef:{type:'rivalry_milestone', a:m.a1, b:m.b1, n:100, matchId:m.id}}, false, false, '');
      })()`);
      const ziel = sheet.querySelector('.nf-card');
      if(ziel) ziel.insertAdjacentHTML('beforebegin', html);
    }
    const karten = [...sheet.querySelectorAll('.nf-card')];
    let zuHoch = 0, aerger = '';
    karten.forEach(c => {
      const l = c.querySelector('.nf-gr-l'), r = c.querySelector('.nf-gr-r');
      if(!l || !r) return;
      // Gemessen wird der INHALT der Bildzone, nicht ihr gestreckter Kasten:
      // die Spalte steht auf `align-self:stretch` und meldete sonst immer
      // dieselbe Hoehe wie der Text daneben.
      const kinder = [...l.children];
      if(!kinder.length) return;
      const oben = Math.min.apply(null, kinder.map(k => k.getBoundingClientRect().top));
      const unten = Math.max.apply(null, kinder.map(k => k.getBoundingClientRect().bottom));
      const inhalt = unten - oben;
      const text = r.getBoundingClientRect().height;
      if(inhalt > text + 12){ zuHoch++;
        aerger = aerger || (c.className.split(' ')[1] + ' ' + Math.round(inhalt) + '>' + Math.round(text)); }
    });
    // Das Duell traegt seine Wappen im Band ueber dem Text — nicht noch
    // einmal daneben.
    // Ein Duell traegt ein Band ueber dem Text — entweder die Bilanz beider
    // Wappen, oder, wenn eine konkrete Partie die Marke gerissen hat, das
    // Ergebnis dieser Partie. Beide uebereinander waeren zwei Baender fuer
    // dieselbe Aussage: „50. Duell" steht schon in der Schlagzeile [§C33].
    const duelle = [...sheet.querySelectorAll('.nf-s-duell')];
    const duellDoppelt = duelle.filter(c => c.querySelector('.nf-gr-l')).length;
    const duellBand = duelle.filter(c =>
      c.querySelector('.nf-duell-band') || c.querySelector('.nf-erg')).length;
    // Das Serienband sagt, was seine Punkte zaehlen.
    const baender = [...sheet.querySelectorAll('.nf-ser')];
    const ohneLabel = baender.filter(b => !b.querySelector('span')).length;
    // Und sie nimmt der Schlagzeile nicht den Platz. Wert und Gesichter
    // standen NEBENeinander, und die Spalte war damit so breit wie beide
    // zusammen: gemessen 169 von 316 Pixeln, also 53 % der Karte, waehrend
    // die Schlagzeile auf 77 px zusammengedrueckt wurde und mitten im Satz
    // abbrach. Uebereinander ist die Spalte so breit wie das Breitere von
    // beiden. Gemessen in Prozent und nicht in Pixeln: die Karte ist auf
    // jedem Telefon anders breit.
    let breit = 0, breitAerger = '', maxA = 0;
    karten.forEach(c => {
      const l = c.querySelector('.nf-gr-l');
      if(!l) return;
      const a = l.getBoundingClientRect().width / c.getBoundingClientRect().width;
      if(a > maxA){ maxA = a; breitAerger = c.className.split(' ')[1] + ' '
        + Math.round(a * 100) + '%'; }
      if(a > .28) breit++;
    });
    // Eine abgeschnittene Schlagzeile ist der Befund, nicht die Ursache:
    // `-webkit-line-clamp` schneidet still ab, und im Feed stand
    // „Johannes, Julian und zwei weitere bewegen die Ewige…".
    const koepfeAb = [...sheet.querySelectorAll('.nf-card .nf-h')]
      .filter(h => h.scrollHeight > h.clientHeight + 1);
    return {karten: karten.length, zuHoch, aerger, duelle: duelle.length,
            duellDoppelt, duellBand, baender: baender.length, ohneLabel,
            breit, breitAerger, ab: koepfeAb.length,
            abAerger: koepfeAb.length ? koepfeAb[0].textContent.trim().slice(0, 48) : ''};
  });
  ok(luecken.zuHoch === 0, 'die Bildzone macht die Karte nicht hoeher als ihr Text',
     luecken.zuHoch + ' zu hoch' + (luecken.aerger ? ' (' + luecken.aerger + ')' : ''));
  ok(luecken.duelle > 0 && luecken.duellBand === luecken.duelle,
     'das Duell traegt sein Band', luecken.duellBand + ' von ' + luecken.duelle);
  ok(luecken.duellDoppelt === 0, 'das Duell zeigt seine Wappen nur einmal',
     luecken.duellDoppelt + ' doppelt');
  ok(luecken.baender === 0 || luecken.ohneLabel === 0,
     'das Serienband nennt, was es zaehlt', luecken.ohneLabel + ' ohne');
  ok(luecken.breit === 0,
     'die Bildzone nimmt der Schlagzeile nicht den Platz',
     luecken.breit + ' ueber 28 % (breiteste: ' + luecken.breitAerger + ')');
  // Der Feed eines Zeitschnitts traegt nicht jede Sorte: gemessen standen im
  // Vierzehn-Tage-Fenster fuenf der zwoelf, und gerade die Marke — ein Wappen
  // UND ein Wert nebeneinander — kam nicht vor. Eine Stichprobe genuegt hier
  // nicht, also wird jede Sorte einmal gestellt und in derselben Spalte
  // gemessen. Der laengste Aufschrift-Fall steht dabei ausdruecklich drin:
  // „AKTUELLE FORM" zog die Spalte allein achtzig Pixel breit.
  const alleSorten = await page.evaluate(() => {
    const bau = window.__k.eval('_newsCardHtmlM2');
    const sorte = window.__k.eval('_newsSorte');
    const p = window.__k.eval('players.map(x => x.id)');
    const mid = window.__k.eval('matches[matches.length-1].id');
    const feed = document.querySelector('#sheet .nf-feed') || document.getElementById('sheet');
    const huelle = document.createElement('div');
    feed.appendChild(huelle);
    // `cat` entscheidet in `_newsSorte` mit: alles mit `cat:'tafel'` ist eine
    // Tafel-Karte, egal welchen Typ die Zeile traegt. Ohne diese Unterscheidung
    // fielen acht der dreizehn Faelle auf dieselbe Sorte.
    const karte = (titel, text, ref, cat) => ({id:'x', cat: cat || 'match',
      ic:'medal2', prio:50, title:titel, desc:text,
      when:new Date().toISOString(), dataRef:ref});
    // Die laengste Schlagzeile, die der Generator ueber die Fixtures
    // ueberhaupt bildet — gemessen 58 Zeichen bei einem Median von 34. Eine
    // erfundene, laengere Zeile bricht in jeder Spaltenbreite ab und wuerde
    // damit die Spalte nicht mehr messen.
    const lang = 'Maxi, Julian, Jane und Johannes uebernehmen „Der Hoehenflug"';
    const faelle = [
      karte(lang, 'Ein Rekord der Kammer Aktuelle Form wechselt: 72 %.',
            {type:'sammel', quelle:'form', rekordId:'best_record',
             playerIds:[p[5], p[6], p[8], p[9]],
             teile:[{titel:'a', pids:[p[5]]}, {titel:'b', pids:[p[6]]},
                    {titel:'c', pids:[p[8]]}]}, 'tafel'),
      karte(lang, 'Neun Wechsel an einem Tag.',
            {type:'sammel', quelle:'tafel', playerIds:[p[5], p[6], p[8]],
             teile:new Array(9).fill(0).map((_, i) => ({titel:'t' + i, pids:[p[5]]}))},
            'tafel'),
      karte(lang, 'Die vierte Stufe steht.', {type:'insignium_stufe', pid:p[9], stufe:3}),
      karte(lang, '5 von 6 gewonnen.', {type:'potd', playerId:p[9], wr:.83, wins:5, games:6}),
      karte(lang, 'Eine Auszeichnung mehr.', {type:'badge_unlocked', pid:p[9], badgeId:'wall'}),
      karte(lang, '12 Siege in Folge.', {type:'win_streak', pid:p[9], streak:12}),
      karte(lang, '18 Elo gewonnen.', {type:'elo_swing', pid:p[9], delta:18}),
      karte(lang, '15 Siege in Folge erreicht.', {type:'milestone', pid:p[9], streak:15}),
      karte(lang, 'Das 50. Duell.', {type:'rivalry_milestone', a:p[8], b:p[9], milestone:50}),
      karte(lang, 'Vier Erfolge im selben Moment.',
            {type:'sammel', quelle:'spieler', playerIds:[p[9]],
             teile:[{titel:'a'}, {titel:'b'}, {titel:'c'}, {titel:'d'}]}),
      karte(lang, 'Drei tragen jetzt dieselbe Stufe.',
            {type:'sammel', quelle:'erfolg', art:'insignium_stufe', stufe:2,
             playerIds:[p[7], p[8], p[9]],
             teile:[{titel:'a', pids:[p[7]]}, {titel:'b', pids:[p[8]]},
                    {titel:'c', pids:[p[9]]}]}),
      karte(lang, 'Leon fuehrt mit 91 Elo Vorsprung.',
            {type:'ambient', pid:p[8], vv:'91', vl:'Elo Vorsprung'}),
      karte(lang, 'Ein Ergebnis des Tages.', {type:'match_result', matchId:mid})
    ];
    const gemessen = [];
    faelle.forEach(f => {
      huelle.innerHTML = bau(f, false, false);
      const c = huelle.querySelector('.nf-card'), l = huelle.querySelector('.nf-gr-l');
      if(!c) return;
      // Ein Deckel auf der Spalte schneidet ab, statt zu schrumpfen: die
      // Chipgruppe traegt `flex-shrink:0`, und bei 72 px stand der Deckel
      // mitten in ihr — das dritte Zeichen („+2") war weg. Gemessen wird
      // deshalb, ob ein Kind ueber den INHALT der Spalte hinausragt, und
      // nicht nur, wie breit sie ist.
      let ueber = 0;
      if(l){
        const lb = l.getBoundingClientRect(), cs = getComputedStyle(l);
        const li = lb.left + parseFloat(cs.paddingLeft);
        const re = lb.right - parseFloat(cs.paddingRight)
                 - parseFloat(cs.borderRightWidth);
        [...l.children].forEach(k => {
          const kb = k.getBoundingClientRect();
          ueber = Math.max(ueber, Math.round(Math.max(0, kb.right - re)
                                           + Math.max(0, li - kb.left)));
        });
      }
      gemessen.push({s: sorte(f), ueber,
        a: l ? Math.round(l.getBoundingClientRect().width
                          / c.getBoundingClientRect().width * 100) : 0});
    });
    huelle.remove();
    return gemessen;
  });
  const sortenBreit = alleSorten.filter(x => x.a > 28);
  ok(new Set(alleSorten.map(x => x.s)).size >= 11,
     'jede Kartensorte wird einmal gestellt',
     new Set(alleSorten.map(x => x.s)).size + ' Sorten');
  ok(sortenBreit.length === 0,
     'und keine von ihnen gibt der Bildzone mehr als 28 % der Karte',
     sortenBreit.map(x => x.s + ' ' + x.a + ' %').join(', ')
     || 'breiteste ' + Math.max.apply(null, alleSorten.map(x => x.a)) + ' %');
  const sortenKlemm = alleSorten.filter(x => x.ueber > 0);
  ok(sortenKlemm.length === 0, 'und keine schneidet ihr eigenes Bild ab',
     sortenKlemm.map(x => x.s + ' ' + x.ueber + ' px').join(', '));

  ok(luecken.ab === 0, 'und keine Schlagzeile bricht ab',
     luecken.ab + ' abgeschnitten' + (luecken.abAerger ? ' („' + luecken.abAerger + '")' : ''));

  console.log('\n═══ DER RAND SAGT, WAS WIEGT ═══');
  const raender = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    // Gemessen wird eine Regel des Stylesheets, nicht die Nachrichtenlage.
    // Der Fun Fact stand nur zufaellig im Feed: an einem vollen Spieltag
    // faellt er weg [§C33], und dann verglich die Zusicherung Gold gegen
    // nichts. Die fehlende Sorte wird deshalb einmal gerendert, gemessen und
    // wieder entfernt — die Sorte, nicht der Tag, traegt die Aussage.
    const hilf = document.createElement('div');
    sheet.appendChild(hilf);
    const leihen = (sorte, extra) => {
      hilf.innerHTML = `<div class="nf-card nf-s-${sorte}${extra || ''}"></div>`;
      return hilf.querySelector('.nf-card');
    };
    const mess = (klasse, sorte, extra) => {
      const c = sheet.querySelector('.' + klasse) || (sorte ? leihen(sorte, extra) : null);
      if(!c) return null;
      const cs = getComputedStyle(c);
      return {kante: parseFloat(cs.borderLeftWidth), farbe: cs.borderTopColor};
    };
    const raus = {gold: mess('nf-s-held', 'held'),
                  fakt: mess('nf-s-fakt', 'fakt'),
                  spiel: mess('nf-s-spiel', 'spiel'),
                  neg: mess('nf-neg', 'serie', ' nf-neg')};
    hilf.remove();
    return raus;
  });
  ok(raender.gold && raender.fakt && raender.gold.kante > raender.fakt.kante,
     'die Siegerkarte traegt die staerkere Kante als der Fun Fact',
     JSON.stringify(raender));
  ok(raender.gold && raender.spiel && raender.gold.farbe !== raender.spiel.farbe,
     'Gold und Spieltag tragen nicht denselben Rahmen',
     (raender.gold||{}).farbe + ' / ' + (raender.spiel||{}).farbe);
  ok(!raender.neg || !raender.spiel || raender.neg.farbe !== raender.spiel.farbe,
     'die Schattenseite traegt ihren eigenen Rahmen [§C25]',
     (raender.neg||{}).farbe);

  console.log('\n═══ WAS SICH BEWEGT, RUHT AUF WUNSCH ═══');
  const bewegt = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const band = sheet.querySelector('.nf-gross-band');
    const stern = band && band.querySelector('svg');
    return {
      band: band ? getComputedStyle(band, '::after').animationName : null,
      stern: stern ? getComputedStyle(stern).animationName : null
    };
  });
  ok(bewegt.band && bewegt.band !== 'none',
     'die Karte des Tages bewegt sich', String(bewegt.band));
  ok(bewegt.stern && bewegt.stern !== 'none',
     'und ihr Stern atmet', String(bewegt.stern));
  await page.emulateMedia({reducedMotion: 'reduce'});
  const ruhig = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const band = sheet.querySelector('.nf-gross-band');
    const stern = band && band.querySelector('svg');
    const punkt = sheet.querySelector('.nf-brk-punkt');
    return {
      band: band ? getComputedStyle(band, '::after').animationName : 'none',
      stern: stern ? getComputedStyle(stern).animationName : 'none',
      punkt: punkt ? getComputedStyle(punkt).animationName : 'none'
    };
  });
  ok(ruhig.band === 'none' && ruhig.stern === 'none' && ruhig.punkt === 'none',
     'bei prefers-reduced-motion steht alles still', JSON.stringify(ruhig));
  // Dieselbe Frage für die Zeichnungen im Blatt: ein Balken waechst auf, und
  // die Bahn laeuft in Spielreihenfolge auf. Beides ruht ebenso.
  const balkenRuhe = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="nd">'
      + '<div class="nd-chance"><div class="nd-chance-b"><i style="width:50%"></i></div></div>'
      + '<div class="nd-elo"><span class="nd-elo-b"><i class="p" style="width:30%"></i></span></div>'
      + '<div class="nd-bahn"><i class="w">10:4</i><i class="l">4:10</i></div></div>';
    document.body.appendChild(host);
    const n = el => el ? getComputedStyle(el).animationName : 'fehlt';
    const out = {chance:n(host.querySelector('.nd-chance-b i')),
                 elo:n(host.querySelector('.nd-elo-b i')),
                 bahn:n(host.querySelector('.nd-bahn i'))};
    host.remove(); return out;
  });
  ok(balkenRuhe.chance === 'none' && balkenRuhe.elo === 'none'
     && balkenRuhe.bahn === 'none',
     'und auch die Balken und die Bahn im Blatt', JSON.stringify(balkenRuhe));
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const balkenLebt = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="nd">'
      + '<div class="nd-chance"><div class="nd-chance-b"><i style="width:50%"></i></div></div>'
      + '<div class="nd-bahn"><i class="w">10:4</i><i class="l">4:10</i></div></div>';
    document.body.appendChild(host);
    const el = host.querySelector('.nd-chance-b i');
    const b2 = host.querySelectorAll('.nd-bahn i')[1];
    const out = {chance: el ? getComputedStyle(el).animationName : 'fehlt',
                 bahn: b2 ? getComputedStyle(b2).animationName : 'fehlt',
                 // Die Bahn laeuft nacheinander auf, nicht auf einmal.
                 verzug: b2 ? getComputedStyle(b2).animationDelay : '0s'};
    host.remove(); return out;
  });
  ok(balkenLebt.chance !== 'none' && balkenLebt.chance !== 'fehlt',
     'sonst waechst ein Balken auf', String(balkenLebt.chance));
  ok(balkenLebt.bahn !== 'none' && parseFloat(balkenLebt.verzug) > 0,
     'und die Bahn laeuft in Spielreihenfolge auf',
     balkenLebt.bahn + ' nach ' + balkenLebt.verzug);

  console.log('\n═══ DER GLANZ GEHOERT DEM TITEL ═══');
  // Breaking glimmt, die Karte des Tages traegt ein Lauflicht — und dasselbe
  // Licht liegt dort, wo Gold einen Titel bedeutet und EINER ihn traegt
  // [§C25]: der Erste des Podests, der Spieler des Tages und der Woche, der
  // Held eines Rueckblicks. Ein silberner Erster, eine gelesene Siegerkarte
  // und eine gewoehnliche Partie tragen es nicht.
  const glanz = async () => page.evaluate(() => {
    const host = document.createElement('div');
    // Podest, Rückblick und Blattkopf tragen ihre eigene Bahn (`glanzBahn`),
    // die Karten im Feed den Lauf selbst.
    const bahn = window.__k.eval('glanzBahn()');
    host.innerHTML = '<div class="podest"><div class="pod-karte gold erster" id="g1">' + bahn + '</div>'
      + '<div class="pod-karte silber erster" id="g2">' + bahn + '</div></div>'
      + '<div class="nf-card nf-s-held" id="g3"></div><div class="nf-card nf-s-held read" id="g4"></div>'
      + '<div class="nf-card nf-s-spiel" id="g5"></div><div class="rcp-held" id="g6">' + bahn + '</div>'
      + '<div class="nd nd-s-held"><div class="nd-head" id="g7">' + bahn + '</div></div>'
      + '<div class="nf-card nf-s-spiel nf-glanz" id="g8"></div>';
    document.body.appendChild(host);
    const a = id => { const e = host.querySelector('#' + id);
      return getComputedStyle(e.querySelector('.glanz-bahn') || e, '::after').animationName; };
    const out = {gold:a('g1'), silber:a('g2'), held:a('g3'), gelesen:a('g4'),
                 spiel:a('g5'), rueckblick:a('g6'), blatt:a('g7'), selten:a('g8')};
    host.remove(); return out;
  });
  const gl = await glanz();
  // Der Lauf fährt überall per `transform` (`glanzZug`): im Feed schneidet
  // die Karte ab, sonst seine eigene Bahn.
  const istGlanz = n => n === 'glanzZug';
  ok(gl.gold === 'glanzZug' && gl.held === 'glanzZug' && gl.rueckblick === 'glanzZug'
     && gl.blatt === 'glanzZug',
     'der Erste in Gold, der Spieler des Tages samt Blatt und der Held tragen den Glanz',
     JSON.stringify(gl));
  ok(!istGlanz(gl.silber) && !istGlanz(gl.gelesen) && !istGlanz(gl.spiel),
     'ein silberner Erster, eine gelesene und eine gewoehnliche Karte nicht',
     JSON.stringify(gl));
  // Das Seltene im Feed trägt einen leisen Lichtlauf in der Farbe seiner
  // Familie: nie in Gold, nie auf einer negativen Karte, nie doppelt auf
  // Breaking oder der Karte des Tages.
  const glFeed = await page.evaluate(() => {
    window.__k.eval('_cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when)); _cache._consolFrom = null; openNewsFeed(); _newsFeedRest()');
    const ks = [...document.querySelectorAll('#sheet .nf-card.nf-glanz')];
    return {n: ks.length, alle: document.querySelectorAll('#sheet .nf-card').length,
      falsch: ks.filter(k => k.matches('.nf-neg,.nf-brk,.nf-gross,.nf-s-held,.nf-s-woche')
        || /247,\s*207,\s*74/.test(getComputedStyle(k, '::after').backgroundImage)).map(k => k.dataset.sid)};
  });
  ok(gl.selten === 'glanzZug' && glFeed.n >= 3 && glFeed.n <= glFeed.alle / 3 && !glFeed.falsch.length,
     'das Seltene im Feed traegt einen Lichtlauf in seiner Familienfarbe, nicht in Gold und nicht auf einer negativen Karte',
     glFeed.n + ' von ' + glFeed.alle + ' Karten, falsch: ' + glFeed.falsch.slice(0, 3));
  // Der Hinweis „x neue Stories" hat zwei Zeilen [§C33]: die Zahl auf einer
  // Marke und „neue Stories", darunter die Schlagzeile der wichtigsten
  // ungelesenen Story — Breaking, wichtig, Priorität, die neueste — mit
  // einem Punkt in der Farbe ihrer Karte. Er hält auch bei 320 px links wie
  // rechts Abstand zum Rand. Beim Erscheinen fährt zweimal Licht um seine
  // Kante, und von der Pille geht ein Ring aus; nichts läuft endlos [§C43].
  // Der erste nach dem Öffnen steht länger. Kommt die Pille, gleitet sie
  // herein. Bei Bewegungsruhe nichts davon.
  await page.setViewportSize({width:320, height:780});
  const toastLauf = async () => page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const t = document.getElementById('newsToast'), x = document.getElementById('newsToastTxt'), btn = document.getElementById('newsBtn');
    const st = window.setTimeout, zeiten = [];
    window.setTimeout = (f, ms, ...a) => { zeiten.push(ms); return st(f, ms, ...a); };
    t.querySelectorAll('.kl, .kl-schein').forEach(e => e.remove());
    K('_newsToastSchonDa = false; _newsToastZeigen(59)');
    const zeile = x.querySelector('.nh-zeile'), top = K('_newsHinweisStory()');
    const erwartet = K(`(() => { const seen = _newsLoadSeen(), stand = _newsLesestand();
      const g = s => (_isBreaking(s) ? 4 : 0) + (_isImportant(s) ? 2 : 0);
      return getStoriesCache().filter(s => !_newsGelesen(s, seen, stand))
        .sort((a, b) => g(b) - g(a) || (b.prio | 0) - (a.prio | 0) || new Date(b.when) - new Date(a.when))[0]; })()`);
    const ton = top ? (K('_isBreaking')(top) || K('_newsIstNegativ')(top) ? 'nh-rot' : K('_newsTonKlassen')(top, 'nd')) : '';
    // Die Reihenfolge des Bestands entscheidet nichts.
    K('window.__bestand = _cache._stories; _cache._stories = _cache._stories.slice().reverse()');
    const umgekehrt = K('_newsHinweisStory()');
    K('_cache._stories = window.__bestand');
    // Die längste Schlagzeile macht ihn so breit, wie er werden darf.
    // Gemessen wird die Box, nicht das Bild: er wächst gerade noch heraus.
    if(zeile) zeile.querySelector('span').textContent += ' — und noch ein Anlass und noch einer, der die Zeile füllt';
    K('_positionNewsToast()');
    const links = t.offsetLeft + t.offsetParent.getBoundingClientRect().left;
    const out = {n:(x.querySelector('.nh-wort .num') || {}).textContent, wort:(x.querySelector('.nh-wort') || {}).textContent,
      zeile:zeile ? zeile.querySelector('span').textContent.startsWith(top.title || '') : false,
      wichtigste:!!top && !!erwartet && top.id === erwartet.id && !!umgekehrt && umgekehrt.id === erwartet.id,
      ton:!!zeile && ton.split(' ').every(c => zeile.classList.contains(c)),
      punkt:zeile ? getComputedStyle(zeile.querySelector('i')).backgroundColor.replace(/\s/g, '') === 'rgb(' + getComputedStyle(zeile).getPropertyValue('--story-rgb').replace(/\s/g, '') + ')' : false,
      rand:[Math.round(links), Math.round(innerWidth - links - t.offsetWidth)],
      licht:t.querySelectorAll(':scope > .kl.kl-hinweis').length, ruf:getComputedStyle(btn, '::after').animationName,
      zahl:x.querySelector('.nh-ic') ? getComputedStyle(x.querySelector('.nh-ic')).animationName : '',
      zeichen:!!x.querySelector('.nh-ic svg') && !!x.querySelector('.nh-funke') && !x.querySelector('.nh-zahl')
        && getComputedStyle(x.querySelector('.nh-funke')).animationName === 'nhFunke',
      endlos:t.getAnimations({subtree:true}).filter(a => a.effect.getTiming().iterations === Infinity).length,
      zeitStart:zeiten.includes(K('NEWS_TOAST_START_MS'))};
    zeiten.length = 0;
    K('_newsToastZeigen(60)');
    out.zeitDann = zeiten.includes(K('NEWS_TOAST_MS')) && !zeiten.includes(K('NEWS_TOAST_START_MS'));
    out.lichtDann = t.querySelectorAll(':scope > .kl').length;
    window.setTimeout = st;
    K('_hideNewsToast()');
    // Aus dem Gerüst kommt die Pille: Zeichen und Wort gleiten herein.
    btn.classList.add('wartet'); K('newsBadgeRefresh(); _hideNewsToast()');
    out.pille = !btn.classList.contains('wartet') && btn.classList.contains('kommt')
      && getComputedStyle(btn.querySelector('.news-pill-lbl')).animationName === 'pilleInhalt';
    btn.classList.remove('kommt');
    return out;
  });
  const ntLebt = await toastLauf();
  ok(ntLebt.n === '59' && ntLebt.wort === '59 neue Stories' && ntLebt.zeichen && ntLebt.zeile && ntLebt.wichtigste && ntLebt.ton && ntLebt.punkt,
     'der Hinweis auf neue Stories trägt ein bewegtes Zeichen statt der Zahl, sagt „59 neue Stories" und darunter die wichtigste ungelesene Story mit dem Punkt in ihrer Farbe', JSON.stringify(ntLebt));
  ok(ntLebt.rand[0] >= 12 && ntLebt.rand[1] >= 8, 'der Hinweis hält bei 320 px Abstand zu beiden Rändern', JSON.stringify(ntLebt.rand));
  ok(ntLebt.licht === 1 && ntLebt.lichtDann === 1 && ntLebt.ruf === 'hinweisRuf' && ntLebt.zahl === 'nhPop' && ntLebt.endlos === 0 && ntLebt.pille,
     'beim Erscheinen fährt Licht um den Hinweis und ein Ring von der Pille, nichts läuft endlos, und aus dem Gerüst der Pille gleitet ihr Inhalt herein', JSON.stringify(ntLebt));
  ok(ntLebt.zeitStart && ntLebt.zeitDann, 'der erste Hinweis nach dem Öffnen steht länger als die folgenden', JSON.stringify([ntLebt.zeitStart, ntLebt.zeitDann]));
  await page.emulateMedia({reducedMotion: 'reduce'});
  const ntRuhig = await toastLauf();
  ok(ntRuhig.licht === 0 && ntRuhig.ruf === 'none' && ntRuhig.zahl === 'none' && !ntRuhig.pille, 'und bei Bewegungsruhe steht er still', JSON.stringify(ntRuhig));
  await page.setViewportSize({width:390, height:844});
  const glRuhig = await glanz();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(Object.values(glRuhig).every(v => v !== 'glanzZug'),
     'bei prefers-reduced-motion ruht der Glanz', JSON.stringify(glRuhig));

  // Im Verlauf steht der Sieger hell und der Verlierer leise, der Stand
  // ist nicht kursiv, die Partien stehen unter ihrem Tag; ein Duo zeigt
  // seine Bilanz als Balken.
  const listen = await page.evaluate(() => {
    // In einem eigenen Behälter gezeichnet: das offene Blatt gehört den
    // Prüfungen danach.
    const K = window.__k.eval, host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0;width:360px';
    document.body.appendChild(host);
    host.innerHTML = K('vHistory()');
    const won = host.querySelector('.mteam.won'), lost = host.querySelector('.mteam.lost');
    const em = host.querySelector('.mscore em.w');
    const out = {farbe: won && lost ? getComputedStyle(won).color !== getComputedStyle(lost).color : false,
      kursiv: em ? getComputedStyle(em).fontStyle : 'fehlt', tage: host.querySelectorAll('.mtag').length,
      gesichter: host.querySelectorAll('.mrow .mteam-av .av').length};
    host.innerHTML = K('vTeams()');
    const r = host.querySelector('.tm-row'), bar = r && r.querySelector('.tm-bar i');
    const wl = r ? (r.querySelector('.tm-bil').textContent.match(/(\d+)–(\d+)/) || []) : [];
    out.balken = bar && wl.length ? Math.abs(bar.getBoundingClientRect().width / bar.parentElement.getBoundingClientRect().width
      - (+wl[1]) / ((+wl[1]) + (+wl[2]))) < 0.02 : false;
    host.remove();
    return out;
  });
  ok(listen.farbe && listen.kursiv === 'normal' && listen.tage >= 2 && listen.gesichter >= 40 && listen.balken,
     'im Verlauf steht der Sieger hell unter seinem Tag mit Gesichtern, und ein Duo zeigt seine Bilanz als Balken',
     JSON.stringify(listen));

  console.log('\n═══ DIE KARTEN AM SPIELTAG ═══');
  // Kopf und Fuß einer Partie folgen ihrem Anlass, und dieselben vier am
  // Tisch sind eine Runde [§11.6c]. Drei Dinge dürfen dabei nie passieren:
  // ein Text liegt auf einem anderen Text oder auf einem Gesicht, ein Text
  // ragt aus der Karte, und ein Text wird abgeschnitten — auch nicht mit
  // „…". Und nichts wird unter 8 px geschrumpft. Gemessen wird je
  // Zeilenkasten: ein umbrechender Satz ist als ein Rechteck so breit wie
  // die Karte und läge damit über jedem Wort neben ihm. Erst im Feed, dann
  // mit Grenzwerten, die die Liga in Jahren haben kann — und mit Namen, die
  // keiner hat.
  const PRUEFEN = function(wurzel){
    const fehler = [];
    const box = wurzel.getBoundingClientRect();
    const clip = el => {
      let r = null;
      for(let p = el.parentElement; p && p !== wurzel.parentElement; p = p.parentElement){
        const cs = getComputedStyle(p);
        if(cs.overflowX !== 'visible' || cs.overflowY !== 'visible'){
          const q = p.getBoundingClientRect();
          r = r ? {l:Math.max(r.l, q.left), t:Math.max(r.t, q.top), r:Math.min(r.r, q.right), b:Math.min(r.b, q.bottom)}
                : {l:q.left, t:q.top, r:q.right, b:q.bottom};
        }
      }
      return r;
    };
    const teile = [];
    let kleinste = 99;
    const tw = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
    for(let n = tw.nextNode(); n; n = tw.nextNode()){
      if(!n.textContent.trim()) continue;
      const el = n.parentElement;
      // Die Initialen im Gesicht gehören zum Gesicht; das Motiv ist Zierde.
      if(el.closest('[hidden],svg,.av,.rav,.nf-motiv')) continue;
      const cs = getComputedStyle(el);
      if(cs.visibility === 'hidden' || !el.getClientRects().length) continue;
      const txt = n.textContent.trim().slice(0, 28);
      if(n.textContent.includes('…') && !el.closest('.nf-d,.nf-h')) fehler.push('gekürzt: „' + txt + '"');
      if(cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) fehler.push('mit „…" abgeschnitten: „' + txt + '"');
      kleinste = Math.min(kleinste, parseFloat(cs.fontSize));
      const rg = document.createRange(); rg.selectNodeContents(n);
      const c = clip(n);
      [...rg.getClientRects()].forEach(roh => {
        if(roh.width < 1) return;
        if(c && (roh.right > c.r + 1 || roh.left < c.l - 1 || roh.bottom > c.b + 1 || roh.top < c.t - 1)) fehler.push('abgeschnitten: „' + txt + '"');
        const sicht = c ? {l:Math.max(roh.left, c.l), t:Math.max(roh.top, c.t), r:Math.min(roh.right, c.r), b:Math.min(roh.bottom, c.b)}
                        : {l:roh.left, t:roh.top, r:roh.right, b:roh.bottom};
        teile.push({art:'text', txt, r:sicht, n});
      });
    }
    wurzel.querySelectorAll('svg text').forEach(t => {
      if(t.closest('.rav,.av')) return;
      const q = t.getBoundingClientRect();
      kleinste = Math.min(kleinste, parseFloat(getComputedStyle(t).fontSize));
      teile.push({art:'text', txt:t.textContent.slice(0, 28), r:{l:q.left, t:q.top, r:q.right, b:q.bottom}, n:t});
    });
    wurzel.querySelectorAll('.av, .rav').forEach(a => {
      if(a.closest('.rav') && !a.classList.contains('rav')) return;
      const q = a.getBoundingClientRect(), c = clip(a);
      const r = {l:q.left, t:q.top, r:q.right, b:q.bottom};
      if(c){ r.l = Math.max(r.l, c.l); r.t = Math.max(r.t, c.t); r.r = Math.min(r.r, c.r); r.b = Math.min(r.b, c.b); }
      if(r.r > r.l && r.b > r.t) teile.push({art:'gesicht', txt:'Gesicht', r});
    });
    teile.forEach(t => {
      if(t.r.r - t.r.l < 1) return;
      if(t.r.l < box.left - 1 || t.r.r > box.right + 1) fehler.push('ragt aus der Karte: „' + t.txt + '"');
    });
    for(let i = 0; i < teile.length; i++) for(let j = i + 1; j < teile.length; j++){
      const u = teile[i], v = teile[j];
      if(u.art === 'gesicht' && v.art === 'gesicht') continue;
      if(u.n && u.n === v.n) continue;
      const w = Math.min(u.r.r, v.r.r) - Math.max(u.r.l, v.r.l), h = Math.min(u.r.b, v.r.b) - Math.max(u.r.t, v.r.t);
      if(w > 1.5 && h > 1.5) fehler.push('liegt übereinander: „' + u.txt + '" und „' + v.txt + '"');
    }
    if(kleinste < 8) fehler.push('Schrift unter 8 px: ' + kleinste);
    return {fehler:[...new Set(fehler)], kleinste};
  };
  const spieltag = await page.evaluate((pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const sheet = document.getElementById('sheet');
    sheet.querySelectorAll('.nf-card').forEach(c => { c.style.contentVisibility = 'visible'; });
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    const karten = [...sheet.querySelectorAll('.nf-card.nf-s-spiel')];
    const fehler = [], formen = {};
    let kleinste = 99;
    const FORM = ['sp-feld','sp-at','sp-wp','sp-band','sp-zeile','sp-vt','sp-nv','sp-tk','sp-zm','sp-sl','sp-rk','sp-duo','sp-ku','sp-bg','sp-md','sp-rd-tafel','sp-pm','sp-ro','sp-rq'];
    karten.forEach(k => {
      const r = pruefen(k);
      r.fehler.forEach(f => fehler.push(k.dataset.sid + ': ' + f));
      kleinste = Math.min(kleinste, r.kleinste);
      FORM.forEach(c => { if(k.querySelector('.' + c)) formen[c] = (formen[c] || 0) + 1; });
    });
    const fd = [...sheet.querySelectorAll('.nf-faden')];
    fd.forEach(f => { const k = f.closest('.nf-card').getBoundingClientRect(), r = f.getBoundingClientRect();
      if(r.left < k.left - .5 || r.right > k.right + .5) fehler.push('Faden ragt aus der Karte'); });
    return {karten:karten.length, runden:sheet.querySelectorAll('.nf-runde').length, fehler, formen, kleinste, faeden:fd.length};
  }, PRUEFEN.toString());
  // Keine Karte am Spieltag trägt einen Faden: was eine Partie beendet oder
  // fortsetzt, sagt ihre eigene Zeile [§C33].
  ok(spieltag.karten > 20 && spieltag.runden > 0 && Object.keys(spieltag.formen).length >= 8 && spieltag.faeden === 0
     && spieltag.fehler.length === 0,
     'im Feed liegt auf keiner Karte am Spieltag ein Text auf einem anderen oder einem Gesicht, keiner ragt hinaus oder ist abgeschnitten',
     spieltag.fehler.slice(0, 3).join(' | ') || spieltag.karten + ' Karten, ' + spieltag.runden + ' Runden, '
       + Object.keys(spieltag.formen).length + ' Formen, kleinste Schrift ' + spieltag.kleinste + ' px');
  // Ein Paar steht nebeneinander, nie übereinander: in Tacho, Münzwurf,
  // Tauziehen, Wippe und den Füßen deckte das zweite Gesicht die
  // Buchstaben des ersten zu (`.sp-chips .av+.av{margin-left:-6px}`).
  const paare = await page.evaluate(() => {
    const sheet = document.getElementById('sheet'), zu = [];
    let n = 0;
    sheet.querySelectorAll('.nf-card.nf-s-spiel .sp-chips, .nf-card.nf-s-spiel .sp-wp-t').forEach(c => {
      const av = [...c.querySelectorAll(':scope > .av')];
      for(let i = 1; i < av.length; i++){
        n++;
        const a = av[i - 1].getBoundingClientRect(), b = av[i].getBoundingClientRect();
        if(Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5) zu.push(c.closest('.nf-card').dataset.sid + ' ' + c.className);
      }
    });
    return {n, zu};
  });
  ok(paare.n > 20 && !paare.zu.length, 'kein Gesicht eines Paars liegt auf dem anderen, in Kopf und Fuß',
     paare.zu.slice(0, 3).join(' | ') || paare.n + ' Paare');
  // Die Grenzwerte: 45.495 Partien, eine Bilanz von 12.345:9.876, 98.765
  // Begegnungen, eine Elo von −12.345, eine Serie von 57 gegen einen
  // Bestwert von 120, eine Runde aus 23 Partien, Platz 118 bis 126 der
  // Tabelle — und Namen wie „Jean-Baptiste von Hohenstein". Die Spieler
  // bleiben echte Spieler, ihre Wappen hängen an ihrer Laufbahn; nur die
  // Namen werden für die Probe ersetzt und danach zurückgestellt. Gemessen
  // in der Breite einer Karte auf dem schmalsten Telefon und auf einem
  // gewöhnlichen.
  const grenz = await page.evaluate((pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    const html = K(`(function(){
      const LANG = ['Maximilian-Alexander', 'Bartholomäus', 'Jean-Baptiste von Hohenstein', 'Konstantinopel',
        'Anneliese-Charlotte', 'Wolfgang Amadeus', 'Christophorus', 'Friederike-Sophie', 'Leopoldine', 'Ottokar', 'Kunigunde', 'Ferdinand'];
      const alt = players.map(p => [p, p.name]);
      players.forEach((p, i) => { p.name = LANG[i % LANG.length]; });
      try {
        const alle = players.map(p => p.id);
        const [a, b, c, e] = alle;
        const [k1, k2, k3, k4] = [alle[5], alle[9], alle[10], alle[11]];
        const d0 = Date.now();
        const zellen = Array.from({length:8}, (_, i) => i % 3 ? 'w' : 'l'); zellen[7] = 'W';
        const spiele = Array.from({length:30}, (_, i) => ({a:i % 2 === 0, diff:(i * 7) % 10 + 1, jetzt:i === 29}));
        const ms = matches.slice(-23);
        const teile = [
          _spBandBild({A:[a, b], B:[c, e], sa:10, sb:2, aw:true}),
          _spZeileBild({A:[a, b], B:[c, e], sa:9, sb:10, aw:false}),
          _spFeldBild({slots:[{id:k1, r:'Abwehr', w:true, d:1234}, {id:k2, r:'Sturm', w:false, d:-1234}, {id:k3, r:'Sturm', w:true, d:999}, {id:k4, r:'Abwehr', w:false, d:-9999}], sa:10, sb:9, aw:true, c:.5}),
          _spFeldBild({slots:[{id:a, r:'Abwehr', w:true, d:1234}, {id:b, r:'Sturm', w:false, d:-1234}, {id:c, r:'Sturm', w:true, d:999}, {id:e, r:'Abwehr', w:false, d:-99999}], sa:10, sb:9, aw:true, c:.03}),
          _spTafelBild({A:[a, b], B:[c, e], sa:10, sb:9, aw:true, c:.5}) + _spNervenBild({zeilen:[{id:a, w:12345, l:9876, zellen}, {id:b, w:999, l:1000, zellen}]}),
          _spVerteilungBild({n:[0, 9000, 8500, 8000, 7000, 6000, 4000, 2000, 900, 90, 9], diff:8, gesamt:45495, so:999, zuletzt:d0}),
          _spWippeBild({fav:[a, b], dog:[c, e], eloFav:12345, eloDog:-9876, pct:1, sa:10, sb:9, aw:true}),
          _spTabelleBild({von:1, bis:9, spitze:true, zeilen:[{id:k2, p:2, q:1, k:'g'}, {id:k3, p:1, q:2, k:'r'}, {id:alle[8], p:3, q:3, k:'m'}, {id:k4, p:9, q:9, k:'m'}]}),
          _spTabelleBild({von:118, bis:126, spitze:false, zeilen:[{id:a, p:118, q:126, k:'r'}, {id:b, p:126, q:118, k:'g'}, {id:c, p:121, q:121, k:'m'}, {id:e, p:122, q:123, k:'m'}]}),
          _spSerieBild({pid:a, laenge:57, eig:120, liga:340, ligaWer:b}),
          _spSerieBild({pid:a, laenge:15, eig:15, liga:16, ligaWer:b}),
          _spRissBild({opfer:a, laenge:240, brecher:[c, e], eig:999}) + _spRissBild({opfer:b, laenge:19, brecher:[a, c], eig:19}),
          _spPremiereBild({A:a, B:b, versuch:1}) + _spPremiereBild({A:c, B:e, versuch:12345}) + _spPremiereBild({A:a, B:c, versuch:14}),
          _spRolleBild({pid:a, r:'drive', anteil:.0012, dort:12, alle:9876, w:12345}) + _spRolleBild({pid:b, r:'reves', anteil:.249, dort:2490, alle:9999, w:1}),
          _spDuoBild({A:a, B:c, laenge:44, w:12345, l:9876}),
          _spKurveBild({pid:a, n:999, d:12345, werte:Array.from({length:12}, (_, i) => ({v:i < 11 ? -i * 900 : 4000, w:i === 11, jetzt:i === 11}))}),
          _spDuellBild({A:a, B:b, gesamt:98765, aw:45678, spiele}),
          _spMedailleBild({name:'Unüberwindliche Betonmauer der Liga', ic:'shield', klasse:'legendary', wer:a, rang:1234, ids:alle, traeger:alle.slice(0, 7)})
            + _spMedailleBild({name:'Mauer', ic:'shield', klasse:'rare', wer:a, rang:2, ids:Array.from({length:40}, (_, i) => alle[i % alle.length]), traeger:[]}),
          // Vier, die sie in einer Partie holten, und runde Zahlen mit
          // sechs Stellen: der Name bricht um, die Zahl rückt darunter.
          _spMedailleBild({name:'Unüberwindliche Betonmauer der Liga', ic:'shield', klasse:'rare', wer:a, rang:12345, ids:alle, traeger:alle.slice(0, 4),
            alle:[{pid:a, rang:12345, naechste:12350}, {pid:b, rang:1}, {pid:c, rang:999}, {pid:e, rang:2}]}),
          _spMarkenBild({liste:[{pid:a, wert:12345, label:'Sieg'}, {pid:b, wert:99999, label:'Elo'}, {pid:c, wert:100000, label:'Partie'}, {pid:e, wert:5000, label:'Tor'}]}),
          // Die Füße der sieben Fakten mit Grenzwerten [§C33].
          _spKipptBild({w:a, l:b, s:12345, n:24689, ab:24628, verlauf:Array.from({length:61}, (_, i) => (i % 7) - 3)}),
          _spWocheBild({pid:a, liste:[a, b, c, e, alle[4]].map((id, i) => ({id, s:999 - i, n:1200, q:83 - i * 9}))}),
          _spTagEloBild({pid:a, ref:0, verlauf:[0, -1234, -2345, -999, 12345]}) + _spTagEloBild({pid:b, ref:75, verlauf:[0, 20, 60, 999]}),
          _spMonatEloBild({pid:a, sid:'2026-09', verlauf:Array.from({length:80}, (_, i) => -1200 + i * 37)}),
          _spMonatQuoteBild({pid:a, sid:'2026-09', verlauf:Array.from({length:120}, (_, i) => 40 + (i % 20))}),
          _spPartnerBild({pid:a, mit:b, allg:43, liste:[b, c, e, alle[4], alle[5]].map((id, i) => ({id, s:900 - i, n:12345, q:73 - i * 7}))}),
          _spTagBild({pid:a, elo:-12345, partien:Array.from({length:31}, (_, i) => ({w:i % 3 > 0, e:(i % 5 - 2) * 1000}))}),
          // Die Formen der gewöhnlichen Partie [§C33], jede mit ihren Grenzwerten.
          _spMosaikBild({W:[a, b], L:[c, e], hoch:10, tief:8, diff:2, n:[0, 9000, 45495, 8000, 7000, 6000, 4000, 2000, 900, 90, 9], mal:45495}),
          _spTachoBild({W:[a, b], L:[c, e], hoch:10, tief:9, pct:99, klar:false}),
          _spStreuBild({W:[a, b], L:[c, e], hoch:10, tief:9, c:.99, diff:1, knapp:true, so:45495, gesamt:45495,
            bins:[{c:.5, d:3, n:9999}, {c:.97, d:10, n:1}, {c:.02, d:0, n:5}], erw:[[.05, 9], [.95, 1]]}),
          _spTransferBild({W:[a, b], L:[c, e], hoch:10, tief:0, delta:{[a]:12345, [b]:999, [c]:-12345, [e]:-999}, gewinn:13344}),
          _spChemieBild({A:a, B:b, L:[c, e], hoch:10, tief:9, s:12345, p:45495, folge:Array.from({length:30}, (_, i) => i % 4 > 0)}),
          _spGegnerBild({w:a, l:c, W:[a, b], L:[c, e], s:12345, n:45495, fluch:999, hoch:10, tief:9, folge:Array.from({length:24}, (_, i) => i > 22)}),
          _spRevancheBild({W:[a, b], L:[c, e], hoch:10, tief:9, vHoch:10, vTief:9, seit:{n:999, e:'Wochen'}}),
          _spGipfelBild({hoch:10, tief:9, zeilen:[{id:a, pre:1, post:126, w:true}, {id:b, pre:2, post:1, w:true}, {id:c, pre:118, post:2, w:false}, {id:e, pre:null, post:null, w:false}]}),
          _spRueckkehrBild({id:a, mit:b, tage:12345, L:[c, e], hoch:10, tief:9}),
          _spGefaelleBild({W:[a, b], L:[c, e], hoch:10, tief:9, elo:{[a]:12345, [b]:-12345, [c]:999, [e]:-999}}),
          _spTagesringBild({id:a, mit:b, L:[c, e], hoch:10, tief:9, folge:Array.from({length:24}, (_, i) => i % 5 > 0)}),
          _spZaehlwerkBild({wer:a, wert:45000, sieg:true, W:[a, b], L:[c, e], hoch:10, tief:9})
            + _spZaehlwerkBild({wer:null, wert:45400, sieg:false, W:[a, b], L:[c, e], hoch:10, tief:0}),
          // Die Formen neuer Karten, jede mit ihren Grenzwerten.
          _spTauziehenBild({A:[a, b], B:[c, e], aw:true, W:[a, b], L:[c, e], hoch:10, tief:5,
            delta:{[a]:12345, [b]:999, [c]:-12345, [e]:-999}})
            + _spTauziehenBild({A:[a, b], B:[c, e], aw:false, W:[c, e], L:[a, b], hoch:10, tief:8, delta:{[a]:-1, [b]:-1, [c]:1, [e]:1}}),
          _spMuenzeBild({W:[a, b], L:[c, e], hoch:10, tief:9, pct:53}),
          _spWesteBild({W:[a, b], L:[c, e], hoch:10, tief:0, n:45495, zuletzt:d0}),
          _spUhrBild({n:99, W:[a, b], L:[c, e], hoch:10, tief:9, zeiten:Array.from({length:99}, (_, i) => 300 + i * 9)}),
          _spUeberholtBild({w:a, l:c, wPre:118, wPost:1, lPre:2, lPost:126, W:[a, b], L:[c, e], hoch:10, tief:9}),
          _spDuoserieBild({W:[a, b], L:[c, e], k:999, n:45495, s:12345, hoch:10, tief:9, folge:Array.from({length:16}, (_, i) => i > 2)}),
          _spHochBild({pid:a, kurve:Array.from({length:40}, (_, i) => 900 + (i * 37) % 300).concat([12345]), elo:12345, alt:1199, seit:999}),
          // Die Köpfe des Katalogs, jeder mit Grenzwerten.
          _spAnzeigeBild({W:[a, b], L:[c, e], hoch:10, tief:9, pct:99, delta:{[a]:12345, [b]:999, [c]:-12345, [e]:-999}}),
          _spPucksBild({W:[a, b], L:[c, e], hoch:10, tief:9, delta:{}}) + _spPucksBild({W:[a, b], L:[c, e], hoch:12, tief:11, delta:{}}),
          _spStromBild({W:[a, b], L:[c, e], hoch:10, tief:0, delta:{[a]:12345, [b]:999, [c]:-12345, [e]:-999}}),
          _spHerzBild({W:[a, b], L:[c, e], hoch:10, tief:9, pct:1, nr:999, delta:{[a]:12345, [b]:999, [c]:-12345, [e]:-999}}),
          _spZunullBild({W:[a, b], L:[c, e], hoch:10, tief:0, nr:999, monat:'September', delta:{[a]:12345, [b]:999, [c]:-12345, [e]:-999}})
        ].map(h => '<div class="nf-card nf-s-spiel">' + h + '</div>');
        const runde = {id:'probe', when:new Date(d0).toISOString(), cat:'highlight',
          title:'Jean-Baptiste von Hohenstein gewinnt die Runde mit 12 von 23 Partien',
          desc:'23 Partien zwischen 10:00 und 13:40 Uhr, jede Paarung mindestens einmal.',
          dataRef:{type:'runde', matchIds:ms.map(m => m.id),
            spieler:[{id:a, w:12, l:11, e:12345}, {id:b, w:11, l:12, e:-9999}, {id:c, w:10, l:13, e:0}, {id:e, w:9, l:14, e:-12345}]}};
        teile.push(_newsRundeHtml(runde, false, ''));
        teile.push('<div class="nf-card">' + _newsRundeBlatt(runde) + '</div>');
        return teile.join('');
      } finally { alt.forEach(([p, n]) => { p.name = n; }); }
    })()`);
    const out = {};
    [288, 360].forEach(breite => {
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;left:0;top:0;width:' + breite + 'px';
      host.innerHTML = html;
      document.body.appendChild(host);
      document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
      const fehler = [];
      let kleinste = 99;
      host.querySelectorAll(':scope > .nf-card').forEach((k, i) => {
        const r = pruefen(k);
        r.fehler.forEach(f => fehler.push('Teil ' + i + ': ' + f));
        kleinste = Math.min(kleinste, r.kleinste);
      });
      const feldScores = [...host.querySelectorAll('.sp-f-sc b')]
        .map(el => parseFloat(getComputedStyle(el).fontSize));
      out[breite] = {n:host.children.length, fehler:[...new Set(fehler)], kleinste,
        feldScores, scoreMin:Math.min(...feldScores)};
      host.remove();
    });
    return out;
  }, PRUEFEN.toString());
  ok(grenz[288].n >= 30 && grenz[288].fehler.length === 0 && grenz[360].fehler.length === 0
     && [288,360].every(b => grenz[b].feldScores.length >= 2 && grenz[b].scoreMin >= 24),
     'und mit Grenzwerten und langen Namen auch nicht, mit grossem Spielfeld-Score auf schmalen und gewöhnlichen Telefonen',
     grenz[288].fehler.concat(grenz[360].fehler).slice(0, 3).join(' | ')
       || grenz[288].n + ' Teile, kleinste Schrift ' + Math.min(grenz[288].kleinste, grenz[360].kleinste) + ' px');
  // Den Faden tragen nur noch Tafel-Karten: zwei gestellte Karten zum
  // selben Rekord, die zweite holt ihn zurück [§C33].
  const fadenAuf = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    K(`(function(){ const [A, B] = players.map(p => p.id), jetzt = Date.now();
      const mk = (id, ms, halter, vorher) => ({id, cat:'tafel', ic:'trophy', prio:80, title:id === 'tf_alt' ? 'Rekord geholt' : 'Rekord zurückgeholt',
        desc:'Ein Rekord wechselt.', when:new Date(ms), dataRef:{type:'rekord_geholt', rekordId:'peak', halter, vorher, playerIds:halter}});
      _cache._stories = [mk('tf_neu', jetzt - 864e5, [A], [B]), mk('tf_alt', jetzt - 3 * 864e5, [B], [A])]
        .concat(_cache._stories || []).sort((a, b) => new Date(b.when) - new Date(a.when));
      _cache._consolFrom = null; _cache._frischVon = null; openNewsFeed(); _newsFeedRest(); })()`);
    const sheet = document.getElementById('sheet');
    const f = sheet.querySelector('.nf-faden');
    if(!f) return {ok:false};
    const ziel = sheet.querySelector('.nf-card[data-sid="' + CSS.escape(f.dataset.ziel) + '"] .nf-h');
    const vorher = document.getElementById('nd').innerHTML;
    f.click();
    const nd = document.getElementById('nd');
    const titel = (nd.querySelector('.nd-title') || {}).textContent || '';
    const weiter = [...nd.querySelectorAll('.nd-faeden .nf-faden')].map(x => x.textContent);
    try { window.__k.eval('closeNewsDetail()'); } catch(e){}
    return {ok: true, soll: ziel ? ziel.textContent : '(nicht im Feed)', titel,
            weiter: weiter.some(x => /Geht weiter/.test(x)), neu: nd.innerHTML !== vorher};
  });
  ok(fadenAuf.ok && fadenAuf.titel === fadenAuf.soll && fadenAuf.weiter,
     'der Faden oeffnet die fruehere Karte, und deren Blatt zeigt, wo es weitergeht',
     fadenAuf.titel + ' / ' + fadenAuf.soll);

  console.log('\n═══ BREAKING BRICHT DIE SPALTE ═══');
  const brk = await page.evaluate(() => {
    // Kein Breaking im Fenster: eines nachbauen und in denselben Feed haengen.
    const sheet = document.getElementById('sheet');
    const feed = sheet.querySelector('.nf-feed');
    if(!feed) return {ok:false};
    const roh = window.__k.eval('_buildStories()');
    const basis = roh[0];
    const fake = Object.assign({}, basis, {dataRef: Object.assign({}, basis.dataRef || {},
      {type:'lead_change'})});
    const html = window.__k.eval('_newsCardHtmlM2')(fake, false, false);
    const huelle = document.createElement('div');
    huelle.innerHTML = html;
    // Breaking steht in einer Hülle, die seinen Schein trägt.
    const aussen = huelle.firstElementChild;
    const karte = aussen.matches('.nf-card') ? aussen : aussen.querySelector('.nf-card');
    feed.appendChild(aussen);
    const bb = karte.getBoundingClientRect();
    const andere = [...feed.querySelectorAll('.nf-card:not(.nf-brk)')]
      .map(c => c.getBoundingClientRect().width);
    const band = karte.querySelector('.nf-brk-band');
    const res = {istBrk: karte.classList.contains('nf-brk'), breite: bb.width,
                 maxAndere: Math.max.apply(null, andere), band: !!band,
                 rahmen: getComputedStyle(karte).borderTopStyle,
                 schein: aussen.classList.contains('nf-brk-hof') ? getComputedStyle(aussen, '::before').animationName : 'keine Hülle'};
    aussen.remove();
    return res;
  });
  ok(brk.istBrk, 'ein Breaking-Anlass macht die Karte zur Breaking-Karte');
  ok(brk.breite > brk.maxAndere, 'Breaking steht breiter als jede andere Karte',
     brk.breite + ' gegen ' + brk.maxAndere);
  ok(brk.band, 'Breaking traegt seinen Balken');
  ok(brk.rahmen === 'solid', 'Breaking traegt immer den vollen Rahmen', brk.rahmen);
  ok(brk.schein === 'nfBrkGlut', 'der Schein von Breaking glimmt auf der Hülle hinter der Karte', brk.schein);

  // Was im Feed endlos läuft, rechnet die Grafikkarte: nur `transform` und
  // `opacity`. Ein wechselnder `box-shadow` oder eine wandernde
  // `background-position` verlangten jedes Bild einen Takt des
  // Hauptthreads über den ganzen Feed — gemessen rund 490 ms je Sekunde bei
  // vierfach gedrosselter CPU, solange der Feed offen stand, statt 3.
  const endlos = await page.evaluate(() => {
    const falsch = [];
    for(const a of document.getAnimations()){
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
      if(t.iterations !== Infinity || !a.effect.target || !a.effect.target.closest('#sheet')) continue;
      const props = new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k))
        .filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)));
      const fremd = [...props].filter(k => k !== 'transform' && k !== 'opacity');
      if(fremd.length) falsch.push((a.animationName || '?') + ':' + fremd.join('+'));
    }
    return [...new Set(falsch)];
  });
  ok(!endlos.length, 'was im Feed endlos läuft, bewegt nur transform und opacity', endlos.join(', '));

  // Eine Karte im Feed bewegt sich nur im Bild [§C43]. Erzwang das Öffnen
  // das Layout — direkt nach einem anderen Blatt —, legte Chromium die
  // Bewegungen auch der Karten weit unter dem Bildrand an, bevor
  // `content-visibility` sie übersprang; danach erreichte sie kein `.steht`
  // mehr, und ein einziger Glanz 3000 px tiefer rechnete jedes Bild im
  // Hauptthread — gemessen 130 statt 7 ms je Sekunde. Geprüft wird genau
  // dieser Augenblick: im selben Takt wie das Öffnen, Layout erzwungen, noch
  // vor jeder Antwort eines Beobachters.
  const fern = await page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const karten = () => [...document.querySelectorAll('#sheet .nf-liste .nf-card:not(.nf-brk):not(.nf-gross)')];
    const endlos = c => c.getAnimations({subtree:true}).filter(a => a.effect.getComputedTiming().iterations === Infinity);
    window.__k.eval('closeSheet(true); _cache._consolFrom = null; openNewsFeed(); _newsFeedRest(true)');
    const hoch = innerHeight, laufend = [];
    let unten = 0;
    karten().forEach(c => {
      const r = c.getBoundingClientRect();
      if(r.top < hoch + 80) return;
      unten += endlos(c).length;
      endlos(c).forEach(a => { if(a.playState === 'running') laufend.push(a.animationName + ' ' + Math.round(r.top) + ' px'); });
    });
    await warte(1200);
    // Stehen oben nur Breaking und große Karten, wird bis zur ersten
    // gewöhnlichen gescrollt: geprüft wird, dass sie im Bild läuft, nicht,
    // welche Karte zuoberst steht.
    const sicht = () => karten().filter(c => { const r = c.getBoundingClientRect(); return r.bottom > -80 && r.top < hoch + 80; });
    if(!sicht().length && karten()[0]){ karten()[0].scrollIntoView({block:'center'}); await warte(1200); }
    const imBild = sicht().map(c => c.classList.contains('im-bild'));
    window.__k.eval('closeSheet(true)');
    return {laufend, unten, imBild};
  });
  ok(fern.unten > 0 && !fern.laufend.length && fern.imBild.length > 0 && fern.imBild.every(Boolean),
     'im Feed läuft endlos nur, was im Bild steht, auch wenn das Öffnen das Layout erzwingt',
     fern.laufend.length ? fern.laufend.slice(0, 4).join(', ') : fern.unten + ' Bewegungen unter dem Bildrand, ' + fern.imBild.length + ' Karten im Bild');

  console.log('\n═══ JEDES BLATT ZEIGT SEINE STORY ═══');
  const inhalt = await page.evaluate(() => {
    const roh = window.__k.eval('_buildStories()');
    const mitte = window.__k.eval('_newsDetailMitte');
    const body = window.__k.eval('_newsDetailBody');
    const box = document.createElement('div');
    document.body.appendChild(box);
    const seen = {};
    let typen = 0, leer = 0, leerName = '';
    let insBlaetter = 0, mitZeichen = 0, mitLeiter = 0;
    let kopfDoppelt = 0;
    roh.forEach(s => {
      const d = s.dataRef || {};
      const k = (d.type || '?') + (d.sub ? ':' + d.sub : '');
      if(seen[k]) return; seen[k] = 1;
      typen++;
      let m = ''; try { m = mitte(s) || ''; } catch(e){ m = ''; }
      // Die Karte „X traegt den Schildring" oeffnete ein Blatt mit NULL
      // Zeichen Inhalt: ausgerechnet die Story, die von der Stufe handelt,
      // zeigte sie nicht.
      if(!m.trim()){ leer++; leerName = leerName || k; }
      const brauchtZeichen = d.type === 'insignium_stufe' || d.type === 'insignium_tag' || (d.type === 'ambient' && d.prestige);
      if(brauchtZeichen){
        insBlaetter++;
        // Die Stufe steht seit ihrem eigenen Blatt groß auf der Bühne, also
        // im Kopf; die Prestige-Karte trägt sie weiter als Block in der Mitte.
        let ganz = ''; try { ganz = body(s) || ''; } catch(e){}
        box.innerHTML = ganz;
        if(box.querySelector('.nd-ins svg, .nd-is-z svg')) mitZeichen++;
        if(box.querySelector('.nf-leiter')) mitLeiter++;
        // Und der Kopf nennt Stufe und Prestige dann nicht noch einmal als Text.
        let h = ''; try { h = body(s) || ''; } catch(e){}
        box.innerHTML = h;
        const un = box.querySelector('.nd-held-un');
        if(un && /Prestige/.test(un.textContent)) kopfDoppelt++;
      }
    });
    box.remove();
    return {typen, leer, leerName, insBlaetter, mitZeichen, mitLeiter, kopfDoppelt};
  });
  ok(inhalt.leer === 0, 'kein Blatt bleibt ohne Inhalt',
     inhalt.leer + ' von ' + inhalt.typen + ' (' + inhalt.leerName + ')');
  ok(inhalt.insBlaetter === 0 || inhalt.mitZeichen === inhalt.insBlaetter,
     'jedes Insignium-Blatt traegt sein Zeichen',
     inhalt.mitZeichen + ' von ' + inhalt.insBlaetter);
  ok(inhalt.insBlaetter === 0 || inhalt.mitLeiter === inhalt.insBlaetter,
     'und die Leiter dazu', inhalt.mitLeiter + ' von ' + inhalt.insBlaetter);
  ok(inhalt.kopfDoppelt === 0, 'der Kopf nennt das Prestige nicht ein zweites Mal',
     inhalt.kopfDoppelt + ' doppelt');

  console.log('\n═══ NICHTS SAGT ZWEIMAL DASSELBE ═══');
  const doppelt = await page.evaluate(() => {
    const roh = window.__k.eval('_buildStories()');
    const body = window.__k.eval('_newsDetailBody');
    const box = document.createElement('div');
    document.body.appendChild(box);
    const norm = t => String(t || '').replace(/[„""»«.,;:!?()]/g, ' ')
      .replace(/\s+/g, ' ').trim().toLowerCase();
    const seen = {};
    let typen = 0, treffer = 0, bsp = '';
    roh.forEach(s => {
      const d = s.dataRef || {};
      const k = (d.type || '?') + (d.sub ? ':' + d.sub : '');
      if(seen[k]) return; seen[k] = 1;
      typen++;
      let h = ''; try { h = body(s) || ''; } catch(e){ return; }
      box.innerHTML = h;
      // Der KOPF darf den Spieler und die Partie nennen — das ist seine
      // Aufgabe. Gemessen wird, was darunter steht.
      box.querySelectorAll('.nd-held, .nd-erg').forEach(e => e.remove());
      // Und die BESCHRIFTUNG einer Zeichnung ist keine Wiederholung: der Name
      // des Zeichens steht neben dem Zeichen, weil er dazugehoert — genau wie
      // der Name einer Auszeichnung neben ihrem Medaillon [§C27].
      // Ebenso die Namen unter den Wappen der Rekord-Bühne (`.nd-rk-h`): bei
      // vier neuen Haltern ist die Aufzählung länger als ein Wort und stand
      // als Satz der Schlagzeile da, sie beschriftet aber nur die Wappen.
      box.querySelectorAll('.nd-med-n, .nd-ins-n, .nd-rk-h').forEach(e => e.remove());
      const oben = norm((s.title || '') + ' ' + (s.desc || ''));
      // Ein SATZ, nicht ein Wort: der Name eines Zeichens neben seiner
      // Zeichnung ist eine Beschriftung, keine Wiederholung.
      const lauf = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      let n;
      while((n = lauf.nextNode())){
        const t = norm(n.nodeValue);
        if(t.length < 20 || t.indexOf(' ') < 0) continue;
        if(oben.indexOf(t) >= 0){ treffer++; bsp = bsp || (k + ': ' + t.slice(0, 44)); }
      }
    });
    box.remove();
    return {typen, treffer, bsp};
  });
  ok(doppelt.treffer === 0, 'kein Satz aus der Karte steht im Blatt noch einmal',
     doppelt.treffer + ' in ' + doppelt.typen + ' Arten (' + doppelt.bsp + ')');

  console.log('\n═══ DER KOPF DES BLATTS ═══');
  const kopf = await page.evaluate(() => {
    const roh = window.__k.eval('_buildStories()');
    const body = window.__k.eval('_newsDetailBody');
    const box = document.createElement('div');
    document.body.appendChild(box);
    let einzel = 0, mitAbzeichen = 0, mitRangText = 0;
    roh.forEach(s => {
      let h = ''; try { h = body(s) || ''; } catch(e){ return; }
      box.innerHTML = h;
      const held = box.querySelector('.nd-held:not(.nd-held-duo)');
      if(!held) return;
      einzel++;
      // Das Rangabzeichen ist ein Bauteil, das die App schon hat [§C27]; im
      // Blatt stand statt seiner die Zeile „Rang 6" als nackter Text.
      if(held.querySelector('.rangab')) mitAbzeichen++;
      // Kein \b vor „Rang": im textContent klebt das Abzeichen davor
      // („SolideRang 10"), und die Wortgrenze fiel damit weg.
      if(/Rang \d/.test(held.textContent)) mitRangText++;
    });
    box.remove();
    return {einzel, mitAbzeichen, mitRangText};
  });
  ok(kopf.einzel === 0 || kopf.mitAbzeichen === kopf.einzel,
     'jeder Blattkopf traegt sein Rangabzeichen',
     kopf.mitAbzeichen + ' von ' + kopf.einzel);
  ok(kopf.mitRangText === 0, 'und nennt den Rang nicht noch einmal als Text',
     kopf.mitRangText + ' doppelt');

  console.log('\n═══ DAS BLATT SCHMUECKT AUS ═══');
  const schmuckBlatt = await page.evaluate(() => {
    const roh = window.__k.eval('_buildStories()');
    const body = window.__k.eval('_newsDetailBody');
    const sorte = window.__k.eval('_newsSorte');
    const rang = window.__k.eval('chronicleRang');
    const dahinter = d => { const h = (d.halter && d.halter.length) ? d.halter : (d.playerIds || []);
      try { return (rang(d.rekordId) || []).some(r => h.indexOf(r.pid || r.id) < 0); } catch(e){ return false; } };
    const box = document.createElement('div');
    document.body.appendChild(box);
    let medaille = 0, badges = 0, namenDoppelt = 0, rekorde = 0, mitVerfolger = 0,
        serien = 0, mitLauf = 0;
    roh.forEach(s => {
      const t = (s.dataRef || {}).type;
      let h = ''; try { h = body(s) || ''; } catch(e){ return; }
      box.innerHTML = h;
      if(t === 'badge_unlocked'){
        badges++;
        if(box.querySelector('.nd-med')) medaille++;
        // Der Name der Auszeichnung steht in der Schlagzeile; im Blatt stand
        // er darunter ein zweites Mal.
        const nm = (s.dataRef || {}).badgeName || '';
        if(nm){
          const treffer = (box.textContent.match(new RegExp(nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          if(treffer > 1) namenDoppelt++;
        }
      }
      // Verlangt nur, wo jemand dahinter liegt: halten alle im Rennen den
      // Rekord, füllte vorher der vierte Halter die Liste unter sich selbst.
      if(t === 'rekord_geholt' && dahinter(s.dataRef || {})){
        rekorde++;
        if(box.querySelector('.nd-vf')) mitVerfolger++;
      }
      if(t === 'loss_streak' || t === 'win_streak' || t === 'team_streak' || t === 'team_loss_streak'){
        serien++;
        if(box.querySelector('.nf-ser')) mitLauf++;
      }
      if(sorte(s)) { /* jede Sorte hat eine */ }
    });
    box.remove();
    return {medaille, badges, namenDoppelt, rekorde, mitVerfolger, serien, mitLauf};
  });
  ok(schmuckBlatt.badges === 0 || schmuckBlatt.medaille === schmuckBlatt.badges,
     'jedes Auszeichnungs-Blatt traegt sein Medaillon',
     schmuckBlatt.medaille + ' von ' + schmuckBlatt.badges);
  ok(schmuckBlatt.namenDoppelt === 0, 'der Name der Auszeichnung steht nur einmal im Blatt',
     schmuckBlatt.namenDoppelt + ' doppelt');
  ok(schmuckBlatt.rekorde === 0 || schmuckBlatt.mitVerfolger === schmuckBlatt.rekorde,
     'jedes Rekord-Blatt nennt die Verfolger',
     schmuckBlatt.mitVerfolger + ' von ' + schmuckBlatt.rekorde);
  ok(schmuckBlatt.serien === 0 || schmuckBlatt.mitLauf === schmuckBlatt.serien,
     'jedes Serien-Blatt zeigt den Lauf',
     schmuckBlatt.mitLauf + ' von ' + schmuckBlatt.serien);

  // ── Die Chronik-Matrix: kein Kuerzel wird abgeschnitten ─────────────
  //    Die Zelle ist 60 px breit und laesst dem Kuerzel 54. Drei Kuerzel
  //    liefen darueber und standen als „Ohne Lüc…" in der Tafel, zwei weitere
  //    waren im Katalog schon mitten im Wort abgeschnitten („Nervenkitz").
  //    Gezaehlt wird nicht in Zeichen — „Umschwung" ist kuerzer als
  //    „Nachzügler" und breiter —, sondern die gerenderte Breite des Textes
  //    gegen die des Kastens. scrollWidth taugt dafuer nicht: er rundet auf
  //    ganze Pixel, und „Augenhöhe" ragte um ein Viertel Pixel heraus.
  // ── Die Zahlenreihe im Chronik-Blatt laeuft nicht ueber ─────────────
  //    Vier gleich breite Zellen, und in einer steht „Schattenseite": als
  //    18-px-Archivo lief das Wort ueber seine Zelle hinaus in die daneben,
  //    in der der Ausschlag steht. Gemessen wird die gerenderte Breite des
  //    Textes gegen die des Kastens — in Zeichen gezaehlt sagte es nichts:
  //    „legendär" ist neun Zeichen und passt, „Konstanz" acht und passt
  //    knapper.
  console.log('\n═══ DIE ZAHLENREIHE DER CHRONIK ═══');
  const ZAHLEN = (breite) => {
    const box = document.createElement('div');
    box.style.width = breite + 'px';
    document.body.appendChild(box);
    const K = window.__k.eval.bind(window.__k);
    // Jede Chronik des Katalogs, nicht nur die, die heute jemand haelt —
    // ohne Halter und mit einem, der die Schwelle um 2,37 σ ueberbietet:
    // dann stehen unter Ausschlag und Prestige die beiden laengsten Zeilen
    // („+2,37 σ", „100 + 59").
    const ids = K('SEASON_TITLES.map(t => t.id)');
    box.innerHTML = ids.map(id => {
      const d = 'SEASON_TITLE_BY_ID[' + JSON.stringify(id) + ']', m = '_chronikMonat(' + JSON.stringify(id) + ')';
      return K('_chronFaktenHtml(' + d + ')')
        + K('_chronFaktenHtml(' + d + ', ' + m + '.streu ? ' + m + '.ab + 2.37 * ' + m + '.streu : undefined)');
    }).join('');
    const zu = [];
    box.querySelectorAll('.rcp-z-v, .rcp-z-d').forEach(e => {
      const r = document.createRange(); r.selectNodeContents(e);
      const tw = r.getBoundingClientRect().width;
      const cw = e.getBoundingClientRect().width;
      if(tw > cw + 0.01) zu.push(e.textContent.trim() + ' (' + tw.toFixed(1) + '>' + cw.toFixed(1) + ')');
    });
    const n = box.querySelectorAll('.rcp-z-v').length, nd = box.querySelectorAll('.rcp-z-d').length;
    box.remove();
    // Das Blatt einer gehaltenen Chronik rechnet mit dem Wert ihres Halters
    // in der Tafel [§C39]: unter dem Prestige stehen Grundwert und Bonus, und
    // die Summe ist, was die Laufbahn zählt.
    const a = JSON.parse(K(`JSON.stringify((function(){
      for(const sid of ['2026-08','2026-07','2026-06']){
        const x = seasonTitles(sid).awarded.find(a => chronikBonus(a.titleId, a.wert) > 0);
        if(x) return {sid, id:x.titleId, p:chronikPunkte(x.titleId, x.wert), b:chronikBonus(x.titleId, x.wert)};
      }
      return null;
    })())`));
    let blatt = null;
    if(a){
      K('showDisziplin(' + JSON.stringify(a.id) + ',' + JSON.stringify(a.sid) + ')');
      const zellen = [...document.querySelectorAll('#sheet .rcp-z-s')];
      const pr = zellen.find(z => /Prestige/.test((z.querySelector('.rcp-z-l') || {}).textContent || ''));
      const aus = zellen.find(z => /Ausschlag/.test((z.querySelector('.rcp-z-l') || {}).textContent || ''));
      blatt = {soll:a, v:pr && pr.querySelector('.rcp-z-v').textContent.trim(),
               d:pr && pr.querySelector('.rcp-z-d') ? pr.querySelector('.rcp-z-d').textContent.trim() : '',
               ueber:aus && aus.querySelector('.rcp-z-d') ? aus.querySelector('.rcp-z-d').textContent.trim() : ''};
      K('closeSheet()');
    }
    return {zu, n, nd, blatt};
  };
  // Bei 430 und bei 320 px Blattbreite, so schmal wie das Blatt auf einem
  // Telefon mit 360 px: „Schattenseite" passte bei 430 und lief bei 390 aus
  // seiner Kachel.
  const zahlen = await page.evaluate(ZAHLEN, 430);
  zahlen.zu = zahlen.zu.concat((await page.evaluate(ZAHLEN, 320)).zu.map(z => '320 px: ' + z));
  ok(zahlen.n > 0 && zahlen.nd > 0, 'die Zahlenreihe der Chronik wird gebaut', zahlen.n + ' Zellen, ' + zahlen.nd + ' Zeilen darunter');
  ok(zahlen.zu.length === 0, 'kein Wert und keine Zeile darunter laeuft ueber ihre Zelle',
     zahlen.zu.slice(0, 3).join(', ') || 'keiner');
  ok(zahlen.blatt && zahlen.blatt.v === '+' + zahlen.blatt.soll.p
       && zahlen.blatt.d === '100 + ' + zahlen.blatt.soll.b && /^\+\d+,?\d* σ$/.test(zahlen.blatt.ueber),
     'das Blatt einer gehaltenen Chronik zeigt Grundwert, Bonus und den Abstand zur Schwelle',
     JSON.stringify(zahlen.blatt));

  // ── Die Schattenseite zeigt ihren Abstand zur Schwelle ─────────────
  //    Nach ihm entscheidet sich, ob sie eine besondere Chronik desselben
  //    Monats überschattet [§C39]. „Der Pechvogel" zeigte nur „1,54 σ",
  //    den Ausschlag der Schwelle, und nicht, wie weit Leon darüber lag.
  //    Überschattet sie etwas, nennt ihr Blatt es.
  const schattenBlatt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const fall = JSON.parse(K(`JSON.stringify((function(){
      let ab = null, ue = null;
      for(const sid of availableSeasons()){
        const T = seasonTitles(sid);
        for(const a of T.awarded){
          const g = chronikSchattenGewicht(a.titleId, a.wert);
          const allein = T.awarded.filter(x => x.titleId === a.titleId).length === 1;
          if(!ab && g > 0 && allein) ab = {sid, id:a.titleId, soll:'+' + chronikSigma(g)};
          const s = chronikUeberschattet(T, a);
          if(!ue && s && T.awarded.filter(x => x.titleId === s.titleId).length === 1) ue = {sid, id:s.titleId, name:a.name};
        }
        if(ab && ue) break;
      }
      return {ab, ue};
    })())`));
    const lies = f => {
      if(!f) return null;
      K('showDisziplin(' + JSON.stringify(f.id) + ',' + JSON.stringify(f.sid) + ')');
      const zellen = [...document.querySelectorAll('#sheet .rcp-z-s')];
      const aus = zellen.find(z => /Ausschlag/.test((z.querySelector('.rcp-z-l') || {}).textContent || ''));
      const r = {ueber:aus && aus.querySelector('.rcp-z-d') ? aus.querySelector('.rcp-z-d').textContent.trim() : '',
                 noten:[...document.querySelectorAll('#sheet .tnote')].map(n => n.textContent.trim())};
      K('closeSheet()');
      return r;
    };
    return {fall, ab:lies(fall.ab), ue:lies(fall.ue)};
  });
  ok(schattenBlatt.fall.ab && schattenBlatt.ab && schattenBlatt.ab.ueber === schattenBlatt.fall.ab.soll,
     'das Blatt einer Schattenseite zeigt, wie weit ihr Halter über der Schwelle liegt',
     JSON.stringify({fall:schattenBlatt.fall.ab, blatt:schattenBlatt.ab && schattenBlatt.ab.ueber}));
  ok(!schattenBlatt.fall.ue || (schattenBlatt.ue && schattenBlatt.ue.noten.some(t => t.includes('„' + schattenBlatt.fall.ue.name + '“') && /kein Prestige/.test(t))),
     'das Blatt einer Schattenseite nennt die Chronik, die sie im selben Monat überschattet',
     JSON.stringify({fall:schattenBlatt.fall.ue, noten:schattenBlatt.ue && schattenBlatt.ue.noten}));

  console.log('\n═══ DIE CHRONIK-MATRIX ═══');
  const matrix = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const box = document.createElement('div');
    box.style.width = '430px';
    document.body.appendChild(box);
    box.innerHTML = K('ligaChronikMatrixHtml()');
    const breit = e => { const r = document.createRange(); r.selectNodeContents(e);
      return r.getBoundingClientRect().width > e.getBoundingClientRect().width + 0.01; };
    const zu = [];
    box.querySelectorAll('.lc-cell .n').forEach(e => {
      if(breit(e)) zu.push(e.textContent.trim()); });
    // Jedes Kürzel des Katalogs, nicht nur die, die heute in der Matrix
    // stehen: ein neues Kürzel fiele sonst erst auf, wenn es jemand hält.
    const probe = document.createElement('div');
    probe.className = 'lchron'; box.appendChild(probe);
    probe.innerHTML = JSON.parse(K("JSON.stringify(SEASON_TITLES.map(t => t.short || t.name))"))
      .map(n => `<span class="lc-cell" style="--tt:#fff;--ttr:255,255,255"><span class="i"></span><span class="n">${n}</span></span>`).join('');
    probe.querySelectorAll('.n').forEach(e => { if(breit(e)) zu.push(e.textContent.trim()); });
    probe.remove();
    // Die Farbe ist die Stufe [§C39]: jede Zelle gegen die Farbe ihrer
    // Stufe, gemessen am gezeichneten Zeichen.
    const ton = JSON.parse(K("JSON.stringify(Object.fromEntries(Object.entries(CHRONIK_STUFE_TON).map(([k, v]) => [k, titleTone(v).c])))"));
    const farbe = c => { const e = document.createElement('i'); e.style.color = c; box.appendChild(e);
      const f = getComputedStyle(e).color; e.remove(); return f; };
    const soll = Object.fromEntries(Object.entries(ton).map(([k, c]) => [k, farbe(c)]));
    const zellen = [...box.querySelectorAll('.lc-cell')];
    const stufen = {}, falschFarbe = [], glanzFalsch = [], verz = new Set();
    let ohneKlasse = 0;
    zellen.forEach(z => {
      const kl = z.dataset.kl;
      if(!kl){ ohneKlasse++; return; }
      stufen[kl] = (stufen[kl] || 0) + 1;
      const f = getComputedStyle(z.querySelector('.i')).color;
      if(f !== soll[kl]) falschFarbe.push(kl + ' ' + z.textContent.trim() + ' ' + f);
      // Gold glänzt, sonst nichts — und der Glanz bleibt in seiner Zelle.
      const nach = getComputedStyle(z, '::after');
      const laeuft = nach.content !== 'none' && nach.animationName === 'lcGlanz';
      if(laeuft !== (kl === 'legendaer') || (laeuft && getComputedStyle(z).overflow !== 'hidden'))
        glanzFalsch.push(kl + ' ' + z.textContent.trim());
      if(laeuft) verz.add(nach.animationDelay);
    });
    // Die Zelle zeigt den wertvollsten Eintrag, die Ecke, wie viele es
    // daneben noch gibt, und die Zeile zählt ihre Zellen je Stufe.
    const falschZelle = [], falschZahl = [], falschKl = [];
    let hoeher = 0;
    box.querySelectorAll('.lchron tbody tr').forEach(tr => {
      const pid = tr.querySelector('[data-tplayer]').dataset.tplayer;
      const je = {};
      tr.querySelectorAll('.lc-cell').forEach(z => {
        const sid = z.dataset.seasonTable;
        const ist = JSON.parse(K(`JSON.stringify((() => { const T = seasonTitles(${JSON.stringify(sid)});
          const a = chronikEintragVon(T, ${JSON.stringify(pid)});
          // Die Farbe der Zelle ist die höchste Klasse, die der Spieler im
          // Monat hält, nicht die des Eintrags, der zählt [§C39] — ohne eine
          // überschattete Chronik: sie bringt nichts.
          const R = {legendaer:3, selten:2, besonders:1};
          const kl = T.awarded.filter(x => x.pid === ${JSON.stringify(pid)} && !chronikUeberschattet(T, x)).map(x => chronikStufe(x.titleId))
            .filter(st => R[st]).sort((x, y) => R[y] - R[x])[0] || chronikStufe(a.titleId);
          return {n:a && (a.short || a.name), kl, eigen:chronikStufe(a.titleId),
                  mehr:T.awarded.filter(x => x.pid === ${JSON.stringify(pid)}).length - 1}; })())`));
        if(z.dataset.kl !== ist.kl) falschKl.push(pid + ' ' + sid + ' ' + z.dataset.kl + ' statt ' + ist.kl);
        if(ist.kl !== ist.eigen) hoeher++;
        const mehr = z.querySelector('.lc-mehr');
        if(z.querySelector('.n').textContent.trim() !== ist.n
           || (mehr ? mehr.textContent.trim() : '') !== (ist.mehr > 0 ? '+' + ist.mehr : ''))
          falschZelle.push(pid + ' ' + sid + ' ' + z.textContent.trim().replace(/\s+/g, ' ') + ' statt ' + ist.n + ' +' + ist.mehr);
        je[z.dataset.kl] = (je[z.dataset.kl] || 0) + 1;
      });
      const zahl = {};
      tr.querySelectorAll('.lc-zahl b').forEach(b => { zahl[b.dataset.kl] = +b.textContent; });
      if(JSON.stringify(Object.entries(zahl).sort()) !== JSON.stringify(Object.entries(je).sort()))
        falschZahl.push(pid + ' ' + JSON.stringify(zahl) + ' statt ' + JSON.stringify(je));
    });
    // Das Band im Kopf verteilt die Einträge des Monats auf die Stufen.
    const falschBand = [];
    box.querySelectorAll('.lchron thead th[data-season-table]').forEach(th => {
      const sid = th.dataset.seasonTable;
      const je = JSON.parse(K(`JSON.stringify(seasonTitles(${JSON.stringify(sid)}).awarded.reduce((o, a) => {
        const st = chronikStufe(a.titleId); if(st) o[st] = (o[st] || 0) + 1; return o; }, {}))`));
      const n = Object.values(je).reduce((x, y) => x + y, 0);
      const band = th.querySelector('.lc-st');
      if(!band){ if(n) falschBand.push(sid + ' ohne Band'); return; }
      const b = band.getBoundingClientRect().width;
      band.querySelectorAll('i').forEach(i => {
        const w = i.getBoundingClientRect().width / b, s = (je[i.dataset.kl] || 0) / n;
        if(Math.abs(w - s) > 0.02) falschBand.push(sid + ' ' + i.dataset.kl + ' ' + w.toFixed(2) + ' statt ' + s.toFixed(2));
      });
    });
    // Jeder Monat trägt sein Jahr, und der Kopf passt in seine Spalte.
    const falschJahr = [];
    box.querySelectorAll('.lchron thead th[data-season-table]').forEach(th => {
      const sid = th.dataset.seasonTable, m = th.querySelector('.lc-m'), j = th.querySelector('.lc-j');
      if(!j || j.textContent.trim() !== '’' + sid.slice(2, 4)) falschJahr.push(sid + ' ' + (m ? m.textContent.trim() : '—'));
      else if(m.scrollWidth > th.clientWidth + 0.5) falschJahr.push(sid + ' breiter als die Spalte');
    });
    const legende = [...box.querySelectorAll('.lchron-lg [data-kl]')].map(e => e.dataset.kl + ' ' + e.textContent.trim());
    const r = {zu, zellen:zellen.length, ohneKlasse, stufen, falschFarbe, glanzFalsch, verz:verz.size,
               falschZelle, falschZahl, falschKl, hoeher, falschBand, falschJahr, legende};
    box.remove();
    return r;
  });
  ok(matrix.zellen > 0, 'die Matrix zeigt Zellen', matrix.zellen + ' Zellen · ' + JSON.stringify(matrix.stufen));
  // Nach dem zweiten Oktober stünden sonst zwei Spalten „OKT" nebeneinander.
  ok(matrix.falschJahr.length === 0, 'jeder Monat im Kopf der Matrix trägt sein Jahr und passt in die Spalte',
     matrix.falschJahr.join(' | '));
  ok(matrix.zu.length === 0, 'kein Kuerzel des Katalogs wird in einer Zelle abgeschnitten',
     matrix.zu.join(' | '));
  ok(matrix.ohneKlasse === 0, 'jede Zelle traegt die Stufe ihrer Chronik',
     matrix.ohneKlasse + ' ohne');
  // Alle drei Stufen der Plusseite, nicht nur die Enden: mit nur zwei blieb
  // eine Zusicherung gruen, als die Regel einer Stufe ganz fehlte.
  ok(matrix.stufen.legendaer && matrix.stufen.selten && matrix.stufen.besonders,
     'Gold, Lila und Metall stehen in der Matrix', JSON.stringify(matrix.stufen));
  ok(matrix.falschFarbe.length === 0, 'jede Zelle leuchtet in der Farbe ihrer Stufe, nicht ihrer Disziplin',
     matrix.falschFarbe.slice(0, 4).join(' | '));
  ok(matrix.glanzFalsch.length === 0 && matrix.verz > 1,
     'nur goldene Zellen glaenzen, in ihrer Zelle und jede in eigenem Takt',
     matrix.glanzFalsch.slice(0, 4).join(' | ') + ' · ' + matrix.verz + ' Takte');
  ok(matrix.falschZelle.length === 0, 'jede Zelle zeigt den wertvollsten Eintrag und wie viele daneben',
     matrix.falschZelle.slice(0, 3).join(' | '));
  ok(matrix.falschZahl.length === 0, 'unter dem Namen steht je Stufe, wie viele Zellen der Zeile sie tragen',
     matrix.falschZahl.slice(0, 3).join(' | '));
  // Gemessen auch an einem Monat, in dem der wertvollste Eintrag eine
  // niedrigere Klasse trägt als eine andere Chronik desselben Spielers:
  // ohne ihn bliebe die Regel in den Fixtures ungeprüft.
  ok(matrix.falschKl.length === 0 && matrix.hoeher > 0,
     'jede Zelle trägt die höchste Klasse, die der Spieler im Monat hält, auch über einem Eintrag niedrigerer Klasse',
     matrix.falschKl.slice(0, 3).join(' | ') || matrix.hoeher + ' solche Zellen');
  ok(matrix.falschBand.length === 0, 'das Band im Kopf teilt den Monat nach Stufen',
     matrix.falschBand.slice(0, 3).join(' | '));
  // Ohne Wert: seit jede Chronik denselben Grundwert bringt [§C39], stünde
  // dreimal dieselbe Zahl neben drei Farben.
  ok(matrix.legende.join() === 'legendaer legendär,selten selten,besonders besonders,schatten Schattenseite',
     'die Legende nennt die Stufen und keinen Wert je Stufe', matrix.legende.join(' · '));

  console.log('\n═══ CHRONIK-PRESTIGE IST NACHVOLLZIEHBAR ═══');
  const chronRechnung = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const daten = JSON.parse(K(`JSON.stringify((function(){
      const T=prestigeTabelle();
      for(const pid of T.rang){
        const qs=(prestigeOf(pid).quellen||[]).filter(q=>q.q==='monat');
        const q=qs.find(x=>x.staffel>1&&x.bonus>0)||qs.find(x=>x.bonus>0)||qs[0];
        if(q) return {pid,id:q.id,basis:q.grundwert,bonus:q.bonus,beitrag:q.p,rang:q.rang,staffel:q.staffel};
      }
      return null;
    })())`));
    if(!daten) return {fehlt:true,text:''};
    K('showLaufbahn(' + JSON.stringify(daten.pid) + ')');
    await new Promise(r => requestAnimationFrame(r));
    const gruppen=[...document.querySelectorAll('#sheet .lb-grp')];
    const grp=gruppen.find(e => /Monatschroniken/.test(e.textContent||''));
    const regelKnopf=document.querySelector('#sheet [data-prestige-regeln]');
    const regelHinweis=regelKnopf ? (regelKnopf.textContent||'').replace(/\s+/g,' ').trim() : '';
    const sport=/Sportliche Leistung/.test((document.querySelector('#sheet')||{}).textContent||'');
    if(regelKnopf){ regelKnopf.click(); await new Promise(r=>setTimeout(r,560)); }
    const regeln=[...document.querySelectorAll('#sheet .lb-regeln span')]
      .map(e=>(e.textContent||'').replace(/\s+/g,' ').trim());
    const regelHoehen=[...document.querySelectorAll('#sheet .lb-regeln span')]
      .map(e=>Math.round(e.getBoundingClientRect().height));
    return Object.assign({},daten,{
      text:grp ? grp.textContent.replace(/\s+/g,' ').trim() : '',
      regeln, regelHinweis, regelHoehen,
      regelTitel:(document.querySelector('#sheet h3')||{}).textContent||'',
      sport
    });
  });
  // Grundwert und Bonus mit seinem Grund: „+16" allein sagt nicht, wofuer.
  ok(!chronRechnung.fehlt && chronRechnung.bonus > 0
     && new RegExp('Grundwert 100 \\+ ' + chronRechnung.bonus + ' für [\\d,]+ σ weiter als verlangt').test(chronRechnung.text),
     'das Laufbahnblatt nennt Grundwert und Bonus einer Chronik',
     chronRechnung.text.slice(0,220));
  ok(chronRechnung.rang === 1 || new RegExp(chronRechnung.rang + '\\. Chronik.*√' + chronRechnung.staffel).test(chronRechnung.text),
     'eine Wiederholung zeigt knapp ihre Herunterrechnung',
     chronRechnung.text.slice(0,220));
  ok(chronRechnung.regeln.length === 3
     && chronRechnung.regeln.every(x=>/\d+.*%/.test(x) && /nie 0/.test(x))
     && chronRechnung.regeln.every(x=>!/min\./.test(x)),
     'das Regel-Popup zeigt Legendary, Rare und Common nebeneinander',
     chronRechnung.regeln.join(' · '));
  ok(/Wie die Punkte entstehen/.test(chronRechnung.regelHinweis)
     && /Wert der Auszeichnungen/.test(chronRechnung.regelTitel),
     'die cleaner gehaltene Aufschlüsselung öffnet ihre Erklärung im Popup',
     chronRechnung.regelHinweis + ' → ' + chronRechnung.regelTitel);
  ok(chronRechnung.regelHoehen.length === 3
     && chronRechnung.regelHoehen.every(h=>h >= 140),
     'die drei Regelkarten haben genug vertikalen Leseraum',
     chronRechnung.regelHoehen.join(' / ') + ' px');
  ok(!chronRechnung.sport,
     'das Laufbahnblatt enthält keinen separaten Block für sportliche Leistung');

  console.log('\n═══ ROLLEN UND POSITIONSSTRAHL ═══');
  await page.setViewportSize({width:360, height:820});
  const rollen = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const ids = K('players.filter(p=>!p.hidden).map(p=>p.id)');
    const out = [];
    const miss = async pid => {
      K('showPlayer(' + JSON.stringify(pid) + ')');
      await new Promise(r => requestAnimationFrame(r));
      const root = document.querySelector('#sheet .pp-root');
      const cards = root ? [...root.querySelectorAll('.pp-rd')].filter(e => e.querySelector('.pp-rd-meta')) : [];
      const wr = cards.map(e => +(e.querySelector('.pp-rd-wr')||{}).childNodes[0]?.textContent || 0);
      const pos = root && root.querySelector('.pp-posprof');
      const slider = pos && pos.querySelector('.pp-slider');
      const fill = pos && pos.querySelector('.pp-fill');
      const sb = slider && slider.getBoundingClientRect(), fb = fill && fill.getBoundingClientRect();
      let ursprung = true;
      if(pos && sb && fb){
        if(pos.classList.contains('atk-seite')) ursprung = Math.abs(fb.left-sb.left) <= 1.5;
        else if(pos.classList.contains('def-seite')) ursprung = Math.abs(fb.right-sb.right) <= 1.5;
        else ursprung = Math.abs((fb.left+fb.right)/2-(sb.left+sb.right)/2) <= 1.5;
      }
      const rr = root && root.getBoundingClientRect();
      const pruef = root ? [...root.querySelectorAll('.pp-pos-combined,.pp-posprof')] : [];
      const spill = rr ? pruef.reduce((mx,e) => { const b=e.getBoundingClientRect();
        return Math.max(mx, b.right-rr.right, rr.left-b.left); }, 0) : 999;
      const def = cards.find(e=>e.classList.contains('reves'));
      const probe = document.createElement('i');
      if(root){ probe.style.color='var(--ak)'; root.appendChild(probe); }
      out.push({pid, wr, st:K('positionsLage(posPerfFrom(' + JSON.stringify(pid) + ',matches)).staerker'),
        cls:cards.map(e=>e.className), seite:pos ?
        (pos.classList.contains('atk-seite')?'drive':pos.classList.contains('def-seite')?'reves':'neutral') : '',
        ursprung, overflow:spill,
        op:cards.map(e=>+getComputedStyle(e).opacity),
        schatten:cards.map(e=>getComputedStyle(e.querySelector('.pp-rd-ring')).boxShadow),
        textSchatten:cards.map(e=>getComputedStyle(e.querySelector('.pp-rd-wr')).textShadow),
        defFarbe:def ? getComputedStyle(def.querySelector('.pp-rd-lbl')).color : '',
        rangFarbe:root ? getComputedStyle(probe).color : ''});
      probe.remove();
    };
    for(const pid of ids) await miss(pid);
    // In den echten Partien steht niemand mehr bei 50:50 [§C44]. Der
    // Flex-Strahl wird an einem gebauten Spieler gemessen, der vorne und
    // hinten gleich oft und gleich gut spielt; danach steht die Liga wieder.
    K(`window.__vorFlex={players,matches,stories:_cache._stories};
      const mit=players.filter(p=>!p.hidden).map(p=>p.id).slice(0,3);
      const t0=new Date(matches[0].created_at).getTime()-3*864e5, neu=[];
      for(let i=0;i<20;i++){ const sieg=i%4<2;
        neu.push({id:'flex'+i,a1:'flex',a2:mit[0],b1:mit[1],b2:mit[2],a1_side:i%2?'drive':'reves',a2_side:i%2?'reves':'drive',
          b1_side:'drive',b2_side:'reves',games_a:sieg?10:5,games_b:sieg?5:10,winner:sieg?'A':'B',exp_a:.5,
          created_at:new Date(t0+i*6e4).toISOString(),deltas:{}}); }
      players=players.concat({id:'flex',name:'Flex',hidden:false,elo:0,atk:.5});
      matches=neu.concat(matches);invalidateCache();`);
    await miss('flex');
    // invalidateCache leert auch den Story-Bestand; ohne ihn stand der Feed
    // für alle späteren Prüfungen leer und ohne ungelesene Karten.
    K('players=window.__vorFlex.players;matches=window.__vorFlex.matches;invalidateCache();'
      + '_cache._stories=window.__vorFlex.stories;');
    K('closeSheet && closeSheet()');
    return out;
  });
  // Hell gezeichnet ist die Rolle, die `positionsLage` stärker nennt
  // [§C44], nicht die mit der höheren Siegquote: die kannte weder Partner
  // noch Gegner und zeichnete Anton nach zwei Sturmpartien ohne Sieg die
  // Abwehr hell.
  const beide = rollen.filter(r => r.wr.length === 2);
  const rollenFalsch = beide.filter(r => {
    if(r.st === 'beide') return !r.cls.every(c => / neutral/.test(c));
    const hi = r.st === 'drive' ? 0 : 1, lo = 1-hi;
    return !/ stark/.test(r.cls[hi]) || !/ schwach/.test(r.cls[lo])
      || !(r.op[hi] > r.op[lo]) || r.schatten[hi] === 'none';
  });
  ok(beide.length > 0 && rollenFalsch.length === 0,
     'starke, schwache und nahezu gleiche Rollen sind eindeutig gewichtet',
     rollenFalsch.map(r=>r.pid).join(', ') || beide.length + ' Profile');
  ok(beide.every(r => r.op.every((op,i) => !/ schwach/.test(r.cls[i]) || op >= .7)
       && r.textSchatten.every((sh,i) => !/ stark/.test(r.cls[i]) || sh === 'none')),
     'die Nebenrolle bleibt lesbar und die starke Rolle leuchtet nicht weiss aus');
  ok(beide.every(r => !r.defFarbe || r.defFarbe === r.rangFarbe),
     'auch Abwehrdominanz behaelt die Rangfarbe',
     beide.filter(r=>r.defFarbe!==r.rangFarbe).map(r=>r.pid).join(', ') || beide.length + ' Profile');
  ok(['drive','reves','neutral'].every(s => rollen.some(r => r.seite === s)),
     'der Positionsstrahl deckt Sturm, Abwehr und Flex ab',
     [...new Set(rollen.map(r=>r.seite))].join(', '));
  ok(rollen.every(r => r.ursprung),
     'jeder Strahl startet an der inhaltlich richtigen Seite');
  ok(rollen.every(r => r.overflow <= 1),
     'das Profil bleibt bei 360 px ohne horizontalen Ueberlauf',
     Math.max(...rollen.map(r=>r.overflow)).toFixed(1) + ' px');

  // Woraus die Einstufung entsteht [§C44]: der Knopf in der Überschrift
  // öffnet ein Blatt mit Partien, Siegquote, Elo-Abstand zu Gegnern und
  // Mitspieler und der Leistung gegen die Erwartung je Position — dieselben
  // Zahlen, aus denen `positionsLage` rechnet —, dazu die Wirkung in der
  // Elo, ohne die Überschrift höher zu machen als die übrigen. Henry spielt
  // fast nur hinten und ist vorne schwächer: ein Sieg im Sturm bringt ihm
  // klar mehr, ein Sieg hinten halb so viel weniger.
  const einstufung = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const pid = K('(players.find(p=>p.name==="Henry")||{}).id');
    K('showPlayer(' + JSON.stringify(pid) + ')');
    await new Promise(r => requestAnimationFrame(r));
    const knopf = document.querySelector('#sheet #ppPosInfo');
    const titel = [...document.querySelectorAll('#sheet .pp-sec-title')];
    const hoehe = e => e.getBoundingClientRect().height;
    const mitKnopf = knopf ? hoehe(knopf.closest('.pp-sec-title')) : 0;
    const ohne = Math.max(...titel.filter(e => !e.querySelector('#ppPosInfo')).map(hoehe));
    if(knopf) knopf.click();
    await new Promise(r => setTimeout(r, 500));
    const blatt = document.querySelector('#sheet');
    const tab = blatt.querySelector('.pos-info-tab');
    const zellen = tab ? [...tab.children].map(e => e.textContent.trim()) : [];
    const rb = blatt.getBoundingClientRect();
    const raus = tab ? [...blatt.querySelectorAll('.pos-info *')].filter(e => {
      const b = e.getBoundingClientRect();
      return b.right > rb.right + .5 || b.left < rb.left - .5 || e.scrollWidth > e.clientWidth + 1;
    }).map(e => e.className || e.tagName) : ['keine Tabelle'];
    const t = K('posPerfFrom(' + JSON.stringify(pid) + ',matches)');
    const kl = K('posClassify(driveStrength(' + JSON.stringify(pid) + ')).label');
    const f = K('(()=>{const l=positionsLage(posPerfFrom(' + JSON.stringify(pid) + ',matches));'
      + 'return [posFactor(l,"drive",cfg.pos_swing),posFactor(l,"reves",cfg.pos_swing)]})()');
    const elo = v => v >= .5 ? '+' + Math.round(v) : v <= -.5 ? '−' + Math.round(-v) : '0';
    const proz = x => { const q = Math.abs(x - 1) * 100; return q >= 9.95 ? String(Math.round(q)) : q.toFixed(1).replace('.', ','); };
    const text = blatt.textContent;
    K('closeSheet && closeSheet()');
    return {mitKnopf, ohne, offen:/So entsteht die Einstufung/.test(text), zellen, raus, kl, f,
      // je Zeile die Beschriftung, dann Sturm, dann Abwehr: dieselben Zahlen
      // in vertauschten Spalten sagten das Gegenteil
      soll:[['Partien', String(t.aG), String(t.dG)], ['Siegquote', Math.round(t.aWr * 100) + ' %', Math.round(t.dWr * 100) + ' %'],
        ['Gegner, Elo-Abstand', elo(t.aGegAvg), elo(t.dGegAvg)], ['Mitspieler, Elo-Abstand', elo(t.aMitAvg), elo(t.dMitAvg)],
        ['Siege gegen die Erwartung, %-Punkte'], ['Tore gegen die Erwartung, %-Punkte'], ['Leistung gegen den eigenen Schnitt']],
      wirkung:'Sieg im Sturm ' + proz(f[0]) + ' % mehr', wirkungDa:text.includes('Sieg im Sturm ' + proz(f[0]) + ' % mehr')
        && text.includes('In der Abwehr ist es umgekehrt, ' + proz(f[1]) + ' %'),
      klImBlatt:text.includes(kl)};
  });
  const _reiheDa = r => { const i = einstufung.zellen.indexOf(r[0]); return i >= 0 && r.every((z, k) => einstufung.zellen[i + k] === z); };
  ok(einstufung.offen && einstufung.soll.every(_reiheDa) && einstufung.klImBlatt,
     'der Knopf im Positions-Profil öffnet die Einstufung mit Partien, Siegquote, Elo-Abstand zu Gegnern und Mitspieler und der Leistung gegen die Erwartung je Position, Sturm links, Abwehr rechts',
     einstufung.soll.filter(r => !_reiheDa(r)).map(r => r.join(' ')).join(' | ') + ' fehlt · ' + einstufung.zellen.join(' | ') + ' · ' + einstufung.kl);
  ok(einstufung.wirkungDa && einstufung.f[0] > 1.05 && Math.abs((1 - einstufung.f[1]) - (einstufung.f[0] - 1) / 2) < 1e-12,
     'das Blatt nennt die Wirkung in der Elo: für Henry bringt ein Sieg im Sturm klar mehr, die Abwehr dämpft halb so viel',
     einstufung.wirkung + ' · ' + JSON.stringify(einstufung.f));
  ok(einstufung.raus.length === 0 && einstufung.mitKnopf <= einstufung.ohne + .5,
     'das Blatt der Einstufung läuft bei 360 px nicht über, und der Knopf macht die Überschrift nicht höher',
     (einstufung.raus.join(', ') || 'kein Überlauf') + ' · ' + einstufung.mitKnopf + ' gegen ' + einstufung.ohne + ' px');
  await page.setViewportSize({width:430, height:932});

  // ── Die Leiter im Blatt traegt die echten Zeichen ──────────────────
  //    Sie zeigte fuenf CSS-Kreise (`repeating-conic-gradient`) — fuenf
  //    Rosetten in fuenf Farben, wo Reif, Schildring, Volutenkranz,
  //    Lorbeerreif und Ordensstern stehen muessten. Ein Platzhalter, der mit
  //    dem Zeichen, das ein Spieler traegt, nichts zu tun hatte.
  console.log('\n═══ DIE LEITER IM BLATT ═══');
  const leiter = await page.evaluate(() => {
    const pids = window.__k.eval('players.filter(p=>!p.hidden).map(p=>p.id)');
    const box = document.createElement('div');
    box.style.width = '430px';
    document.body.appendChild(box);
    let mit = 0, ohne = 0, kleinste = 999, stufen = 0;
    pids.forEach(pid => {
      const h = window.__k.eval('_newsLeiter(' + JSON.stringify(pid) + ')');
      if(!h) return;
      box.innerHTML = h;
      const felder = box.querySelectorAll('.nf-lt-p');
      if(!felder.length) return;
      stufen = felder.length;
      felder.forEach(f => {
        if(f.querySelector('svg.ins')) mit++; else ohne++;
        const r = f.getBoundingClientRect();
        if(r.width < kleinste) kleinste = r.width;
      });
    });
    box.remove();
    return {mit, ohne, kleinste, stufen};
  });
  ok(leiter.mit > 0, 'die Leiter zeichnet ueberhaupt etwas', leiter.mit + ' Felder');
  ok(leiter.ohne === 0, 'jedes Feld der Leiter traegt sein echtes Zeichen',
     leiter.ohne + ' Felder ohne Zeichen');
  ok(leiter.stufen === 7, 'die Leiter zeigt alle sieben Stufen', leiter.stufen + ' Felder');
  // Unter 40 px bleibt vom Schildring ein Ring. Bei 28 px war er von der
  // blanken Stufe nicht zu unterscheiden, gemessen an der Zeichnung.
  ok(leiter.kleinste >= 40, 'ein Feld der Leiter ist mindestens 40 px breit',
     leiter.kleinste + ' px');

  // ── Der Schlitten deckt die Wahl, und er fährt [§C27] ────────────
  // Die Wahl eines Segmentwählers war ein Knopf, der die Farbe wechselt,
  // und zwischen zwei Wahlen sprang sie. Jetzt gleitet eine Fläche (außen)
  // oder ein Strich (innen) zum gewählten Segment. Lage und Breite rechnet
  // das CSS aus :has(); stimmt die Rechnung nicht, steht der Schlitten
  // neben dem Wort, und das sieht niemand an einem einzelnen Bild.
  console.log('\n═══ SCHLITTEN ═══');
  await page.setViewportSize({width:360, height:780});
  const schlitten = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const f = [];
    let gemessen = 0;
    const warte = () => new Promise(r => setTimeout(r, 420));
    for(const setz of ["tab='ranking';period='season';ligaSicht='duos'", "ligaSicht='spieler'", "period='week'",
        "period='all';rankMetric='winrate'", "tab='awards';awView='rekorde'", "awView='awards';awPeriod='week'",
        "awPeriod='season';tab='teams'", "tab='positions';rankMetric='reves'"]){
      K(setz + ';render()');
      await warte();
      document.querySelectorAll('#main .ui-switch:not(.roll), #main .ui-tabs:not(.roll)').forEach(w => {
        const on = w.querySelector(':scope > button.on'); if(!on) return;
        const aussen = w.classList.contains('ui-switch');
        const cs = getComputedStyle(w, aussen ? '::before' : '::after');
        const links = parseFloat(cs.left) + new DOMMatrix(cs.transform).m41, breite = parseFloat(cs.width);
        const mitte = links + breite / 2, soll = on.offsetLeft + on.offsetWidth / 2;
        gemessen++;
        if(Math.abs(mitte - soll) > 1.5 || (aussen && Math.abs(breite - on.offsetWidth) > 1.5))
          f.push(setz + ': „' + on.textContent.trim() + '" ' + Math.round(mitte) + ' statt ' + Math.round(soll));
      });
    }
    // Nach dem Tipp zeichnet die Ansicht neu — der Schlitten muss trotzdem
    // dort anfangen, wo er stand, sonst springt er.
    K("tab='ranking';period='season';render()");
    await warte();
    const ziel = document.querySelector('#main .ui-switch [data-period="all"]');
    ziel.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
    ziel.click();
    // Die Bedienung zeigt zuerst ihre Rückmeldung und zeichnet dann die
    // neue Ansicht. Der Beobachter wartet genau auf deren Fertigmeldung,
    // nicht eine feste Zeit, die schon das Gleiten verstreichen ließe.
    await new Promise(resolve => {
      const main = document.getElementById('main');
      if(main.getAttribute('aria-busy') !== 'true'){ resolve(); return; }
      const horch = new MutationObserver(() => {
        if(main.getAttribute('aria-busy') === 'true') return;
        horch.disconnect(); resolve();
      });
      horch.observe(main, {childList:true, attributes:true, attributeFilter:['aria-busy']});
    });
    const w2 = document.querySelector('#main .ui-switch');
    const anfang = getComputedStyle(w2, '::before');
    const start = parseFloat(anfang.left) + new DOMMatrix(anfang.transform).m41;
    await warte();
    const fertig = getComputedStyle(w2, '::before');
    const ende = parseFloat(fertig.left) + new DOMMatrix(fertig.transform).m41;
    // Die Tage des Monats als Zellen: so viele, wie der Monat hat, und der
    // heutige gerahmt.
    K("period='season';render()");
    const t = (document.querySelector('#main .lauf-t') || {}).textContent || '';
    const [, jetzt, gesamt] = (t.match(/(\d+)\s*von\s*(\d+)/) || []).map(Number);
    const zellen = [...document.querySelectorAll('#main .lauf-z i')];
    const heute = zellen.findIndex(z => z.classList.contains('h')) + 1;
    const gespielt = zellen.filter(z => z.classList.contains('s')).length;
    const tage = new Set(K("matchesInPeriod('season').map(m=>tagKey(m.created_at))")).size;
    return {f, gemessen, start, ende, zellen:zellen.length, gesamt, jetzt, heute, gespielt, tage};
  });
  ok(schlitten.f.length === 0 && schlitten.gemessen >= 12, 'der Schlitten jedes Wählers steht unter der Wahl',
     schlitten.f.slice(0, 4).join(' · ') || schlitten.gemessen + ' Wähler');
  ok(schlitten.ende - schlitten.start > 40, 'der Schlitten gleitet nach dem Neuzeichnen, statt zu springen',
     Math.round(schlitten.start) + ' → ' + Math.round(schlitten.ende) + ' px');
  ok(schlitten.zellen === schlitten.gesamt && schlitten.heute === schlitten.jetzt && schlitten.gespielt === schlitten.tage,
     'der Monat steht als Zellen: jeder Tag eine, der heutige gerahmt, jeder Spieltag hell',
     schlitten.zellen + ' Zellen · ' + schlitten.gesamt + ' Tage · heute ' + schlitten.heute + '/' + schlitten.jetzt
     + ' · ' + schlitten.gespielt + ' von ' + schlitten.tage + ' Spieltagen');
  await page.emulateMedia({reducedMotion: 'reduce'});
  const schlittenRuhig = await page.evaluate(() => {
    const w = document.querySelector('#main .ui-switch');
    return getComputedStyle(w, '::before').transitionDuration;
  });
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(/^0s(, 0s)*$/.test(schlittenRuhig), 'bei prefers-reduced-motion springt der Schlitten', schlittenRuhig);

  // ── Jeder Reiter bei 360 px ──────────────────────────────────────
  // Gemessen wurde bisher je Bauteil, und damit fiel durch, was zwischen
  // zwei Bauteilen liegt: der Knopf „Neu laden" trug die volle Breite von
  // `.btn` und lief 112 px aus den Einstellungen, eine Pille der Rekorde lief
  // aus der Karte, und ein Gesicht ohne eigenen Behälter hatte seine
  // Initialen oben links. Hier wird jeder Reiter einmal ganz gezeichnet.
  console.log('\n═══ METALL STATT BEWEGUNG ═══');
  // Platz 1 bis 3 tragen ihr Metall als feste Veredelung [§C27]: ein Rahmen
  // im Verlauf, ein Schein darunter, die Ziffer mit Glanz — kein Strich an
  // der Kante und kein Licht, das über die Karte fährt. Ein Lichtband stand
  // auf dem Telefon beim Scrollen mitten auf der Karte still und sah kaputt
  // aus. Bewegung gibt es nur auf eine Handlung hin und kurz: der Reiter
  // federt beim Wechsel, ein Blatt blendet beim Öffnen ein.
  const metallMess = () => page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const out = {};
    K("closeSheet(true);tab='ranking';period='season';render()"); await bild();
    const tops = [...document.querySelectorAll('#main .rlist > .rrow.top1, #main .rlist > .rrow.top2, #main .rlist > .rrow.top3')];
    out.tops = tops.length;
    out.rahmen = tops.filter(r => /border-box/.test(getComputedStyle(r).backgroundClip) && getComputedStyle(r).borderTopColor === 'rgba(0, 0, 0, 0)').length;
    out.schein = tops.filter(r => /rgba\(/.test(getComputedStyle(r).boxShadow)).length;
    out.striche = tops.map(r => getComputedStyle(r, '::before').content).filter(c => c && c !== 'none' && c !== 'normal').length;
    out.zifferGlanz = tops.filter(r => getComputedStyle(r.querySelector('.pos')).backgroundClip === 'text').length;
    // In der Liste bewegt sich nichts von selbst.
    out.bewegtInListe = document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest
      && a.effect.target.closest('#main .rlist')).map(a => a.animationName);
    document.querySelector('[data-nav="awards"]').click(); await bild();
    const on = document.querySelector('.botnav button.on .ic');
    out.stoss = getComputedStyle(on.querySelector('svg')).animationName;
    await new Promise(r => setTimeout(r, 450));
    // Die Pille ist EIN Schlitten, der unter den gewählten Knopf gleitet
    // [§C43]; er leuchtet fest in Acid.
    const sl = document.querySelector('.botnav .nav-schlitten');
    const mitte = e => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; };
    out.reiterSchein = !!sl && /rgba\(190, 242, 100, 0\.38\) 0px 0px 16px/.test(getComputedStyle(sl, '::before').boxShadow)
      && Math.abs(mitte(sl) - mitte(on)) < 1.5;
    K("tab='ranking';render();showPlayer(players[0].id)"); await bild();
    const kind = document.querySelector('#sheet > :not(.sheet-leiste)');
    out.blatt = kind ? getComputedStyle(kind).animationName + '/' + getComputedStyle(kind).animationFillMode : 'fehlt';
    await new Promise(r => setTimeout(r, 500));
    out.blattDanach = kind ? getComputedStyle(kind).transform : 'fehlt';
    K('closeSheet(true)'); await bild();
    return out;
  });
  const me = await metallMess();
  ok(me.tops === 3 && me.rahmen === 3 && me.schein === 3,
     'Platz 1 bis 3 tragen einen Rahmen im Metall und einen Schein darunter', JSON.stringify(me));
  ok(me.striche === 0, 'Platz 1 bis 3 tragen keinen Strich an der Kante', me.striche + ' Striche');
  ok(me.zifferGlanz === 3, 'die Platzziffer von 1 bis 3 ist Metall mit Glanz', me.zifferGlanz + ' von 3');
  ok(me.bewegtInListe.length === 0, 'in der Rangliste bewegt sich nichts von selbst', me.bewegtInListe.join(', '));
  ok(me.stoss === 'reiterStoss' && me.reiterSchein, 'der gewählte Reiter federt beim Wechsel, und der leuchtende Schlitten steht unter ihm',
     JSON.stringify([me.stoss, me.reiterSchein]));
  ok(me.blatt === 'blattEin/backwards' && me.blattDanach === 'none',
     'ein Blatt blendet beim Öffnen ein und behält danach keine Verschiebung', me.blatt + ' · ' + me.blattDanach);
  // Betritt man einen Reiter über die Leiste, baut er sich auf, und um
  // Platz 1 bis 3 fährt Licht in ihrem Metall [§C43] — nur über transform
  // und opacity; dieselbe Ansicht glänzt erst nach einer Pause wieder.
  // Neue Daten im selben Reiter nehmen das Licht nicht mit: es läuft an
  // derselben Stelle weiter. Nach seiner Zeit ist nichts davon übrig.
  const betreten = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const metall = () => [...document.querySelectorAll('#main .rlist > .rrow > .kl')]
      .map(k => (k.className.match(/kl-(gold|silber|bronze)/) || [, '?'])[1]).join(' ');
    const out = {};
    K("closeSheet(true);tab='ranking';period='season';render()"); await bild();
    document.querySelector('[data-nav="positions"]').click(); await warte(80); await bild();
    out.teile = document.querySelectorAll('#main .bau').length;
    out.metall = metall();
    // Der Kegel jedes Lichts reicht über die ganze Kante seiner Karte.
    out.gedeckt = [...document.querySelectorAll('#main .kl')].every(k =>
      parseFloat(k.style.getPropertyValue('--kd')) >= Math.hypot(k.parentElement.offsetWidth, k.parentElement.offsetHeight));
    const fremd = new Set();
    document.getAnimations().forEach(a => {
      const t = a.effect && a.effect.target;
      if(!t || !t.closest || !t.closest('.bau, .kl, .kl-schein, .glanz-einmal')) return;
      a.effect.getKeyframes().flatMap(k => Object.keys(k))
        .filter(k => !['offset', 'computedOffset', 'easing', 'composite', 'transform', 'opacity'].includes(k))
        .forEach(k => fremd.add((a.animationName || '?') + ':' + k));
    });
    out.fremd = [...fremd];
    await warte(700);
    // Wie ein Datenabruf: dieselben Töpfe, eine neue Version.
    K('invalidateCache(LADEN_TOEPFE); render()');
    out.nachNeuzeichnen = metall();
    out.weiter = [...document.querySelectorAll('#main .rlist > .rrow > .kl')].every(k => parseFloat(k.style.getPropertyValue('--kv')) < 0);
    await warte(5200);
    out.rest = document.querySelectorAll('#main .bau, #main .kl, #main .kl-schein, #main .glanz-einmal').length;
    document.querySelector('[data-nav="history"]').click(); await warte(80); await bild();
    document.querySelector('[data-nav="positions"]').click(); await warte(80); await bild();
    out.zweitesMal = metall();
    K("tab='ranking';render()"); await bild();
    return out;
  });
  ok(betreten.teile >= 5 && betreten.metall === 'gold silber bronze' && betreten.gedeckt,
     'wer einen Reiter über die Leiste betritt, sieht ihn sich aufbauen und Licht im Metall um Platz 1 bis 3', JSON.stringify(betreten));
  ok(betreten.fremd.length === 0, 'Aufbau und Licht bewegen nur transform und opacity', betreten.fremd.join(', '));
  ok(betreten.nachNeuzeichnen === 'gold silber bronze' && betreten.weiter,
     'neue Daten im selben Reiter nehmen das Licht nicht mit, es läuft an seiner Stelle weiter', JSON.stringify(betreten));
  ok(betreten.rest === 0 && betreten.zweitesMal === '', 'nach seiner Zeit ist nichts übrig, und gleich zurück glänzt der Reiter nicht noch einmal',
     JSON.stringify([betreten.rest, betreten.zweitesMal]));
  // Platz 1 kommt mit Platz 2 [§C43]. Licht und Band lagen vom ersten Bild an
  // in ihrer Karte und warteten über `animation-delay`; wartend waren sie für
  // Safari schon eigene Ebenen, und Gold trug mit dem Band eine mehr als
  // Silber und Bronze — auf dem iPhone kam Platz 1 sichtbar nach Platz 2. Im
  // ersten Bild trägt jetzt jede Karte nur ihr eigenes Einblenden, Licht und
  // Band warten ohne Kasten und laufen zu ihrer Zeit.
  const erstesBild = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(r));
    const out = {};
    for(const [ziel, sel] of [['ranking', '.rlist > .rrow'], ['positions', '.rlist > .rrow'], ['teams', '.rlist > .rrow'], ['awards', '.podest > .pod-karte']]){
      K("closeSheet(true); tab='history'; render(); _aufbauFertig(); _podestZuletzt.clear()");
      await new Promise(r => setTimeout(r, 150));
      document.querySelector(`[data-nav="${ziel}"]`).click();
      for(let i = 0; i < 60 && !document.querySelector('#main ' + sel + '.bau'); i++) await bild();
      await bild();
      const karten = [...document.querySelectorAll('#main ' + sel)].slice(0, 3);
      const darin = k => document.getAnimations().filter(a => { const t = a.effect && a.effect.target; return t && t !== k && k.contains(t); })
        .map(a => a.animationName);
      const licht = k => [...k.querySelectorAll(':scope > .kl, :scope > .kl-schein, :scope > .glanz-einmal')];
      out[ziel] = {darin:karten.map(darin), wartet:karten.map(k => licht(k).length > 0 && licht(k).every(e => getComputedStyle(e).display === 'none'))};
      await new Promise(r => setTimeout(r, 1700));
      out[ziel].danach = karten.map(k => licht(k).filter(e => getComputedStyle(e).display !== 'none').length);
    }
    K("tab='ranking'; render()");
    return out;
  });
  ok(Object.values(erstesBild).every(r => r.darin.every(d => d.length === 0) && r.wartet.every(Boolean) && r.danach.every(n => n >= 2)),
     'im ersten Bild trägt jede der ersten drei Karten nur ihr eigenes Einblenden; Licht und Band warten ohne Kasten und laufen danach — in Liga, Positionen, Duos und Awards',
     JSON.stringify(erstesBild));
  // Der leere Zustand einer Ansicht behält seine Form, während sie sich
  // aufbaut: als `[class="empty"]` galt die Regel nur ohne weitere Klasse,
  // und mit `bau` stand „Keine Matches in diesem Zeitraum" eine halbe
  // Sekunde groß, weiß und links da [§C43].
  const leerAufbau = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const v = document.createElement('section');
    v.className = 'view active';
    v.innerHTML = K("emptyState('calendar', 'Keine Matches in diesem Zeitraum')");
    document.getElementById('main').appendChild(v);
    const form = el => { const c = getComputedStyle(el); return [c.textAlign, c.fontSize, c.paddingTop].join(' '); };
    const leer = v.firstElementChild, ruhig = form(leer);
    K('_aufbauen')(v, 0, 45, 10, true);
    const imAufbau = {bau:leer.classList.contains('bau'), form:form(leer)};
    K('_aufbauFertig()'); v.remove();
    return {ruhig, imAufbau};
  });
  ok(leerAufbau.imAufbau.bau && leerAufbau.ruhig === 'center 13px 48px' && leerAufbau.imAufbau.form === leerAufbau.ruhig,
     'der leere Zustand einer Ansicht steht auch während des Aufbaus mittig und in seiner Größe', JSON.stringify(leerAufbau));
  // Kein Teil mit eigener Ebene in einem runden Ausschnitt ohne eigenen
  // Stapel [§C43]. Das Emoji eines Gesichts lag mit z-index 2 und `filter`
  // im Kreis, der Kreis war kein eigener Stapel: lief irgendwo in Karte oder
  // Fenster eine Bewegung, legte Safari das Emoji auf eine eigene Ebene, die
  // der runde Rand von außen schneiden muss, und zeichnete sie manchmal gar
  // nicht — auf dem iPhone standen Gesichter als leere graue Kreise da.
  // Gesucht wird jedes Teil mit z-index oder `filter`, dessen nächster
  // runder Ausschnitt kein eigener Stapel ist, in jedem Reiter, im Feed, in
  // Stories jeder Art und den Blättern, mit Emoji als Gesichtern — die
  // Spieler hier tragen sonst Initialen.
  const ebenen = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const stapel = el => { const c = getComputedStyle(el);
      if(c.position === 'fixed' || c.position === 'sticky' || (c.position !== 'static' && c.zIndex !== 'auto')) return true;
      if(parseFloat(c.opacity) < 1 || c.transform !== 'none' || c.filter !== 'none' || c.isolation === 'isolate'
        || c.mixBlendMode !== 'normal' || c.clipPath !== 'none' || (c.webkitMaskImage && c.webkitMaskImage !== 'none')
        || /paint|strict|content/.test(c.contain) || /transform|opacity|filter/.test(c.willChange)) return true;
      const p = el.parentElement;
      return !!(p && c.zIndex !== 'auto' && /flex|grid/.test(getComputedStyle(p).display)); };
    const name = el => el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
    const funde = new Map(), schein = new Map();
    const suche = (wo, wurzel) => {
      for(const el of document.querySelectorAll(wurzel + ' *')){
        const c = getComputedStyle(el);
        // Ein Schein über `filter` auf einem Teil, das nicht in einer
        // Zeichnung liegt: Symbole der goldenen Auszeichnungen fehlten auf
        // dem iPhone oder kamen spät, die Sterne unter jedem Wappen ebenso.
        if(!(el instanceof SVGElement && el.ownerSVGElement) && /drop-shadow/.test(c.filter)){
          const k = name(el); schein.set(k, (schein.get(k) || []).concat(wo)); }
        if(c.display === 'none' || c.position === 'fixed') continue;
        const art = c.position !== 'static' && c.zIndex !== 'auto' && c.zIndex !== '0' ? 'z-index ' + c.zIndex
          : c.filter !== 'none' ? 'filter' : '';
        if(!art) continue;
        // Ein absolut gesetztes Teil schneidet erst sein umgebender Block.
        let block = c.position !== 'absolute', a = el.parentElement;
        while(a && a !== document.body){
          const ac = getComputedStyle(a);
          const hier = !block && (ac.position !== 'static' || ac.transform !== 'none');
          if(hier) block = true;
          const rund = ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].some(k => parseFloat(ac['border' + k + 'Radius']) > 0);
          if(block && (ac.overflowX !== 'visible' || ac.overflowY !== 'visible') && rund){
            if(!stapel(a)){ const k = art + ' ' + name(el) + ' in ' + name(a); funde.set(k, (funde.get(k) || []).concat(wo)); }
            break;
          }
          if(stapel(a)) break;
          a = a.parentElement;
        }
      }
    };
    // `invalidateCache` leert auch die Stories, und hier legt sie niemand neu
    // an: ohne sie stünde der Feed für die Prüfungen weiter unten leer.
    K('window.__stories = [_cache._stories, _cache._consolFrom, _cache._frischVon]');
    const pl = K('players'), vorher = pl.map(p => p.avatar_id);
    const EM = ['twoface', 'sloth', 'shark', 'unicorn', 'eagle', 'beer', 'eggplant', 'hedgehog', 'moai', 'wolf', 'wizard', 'panda'];
    pl.forEach((p, i) => { p.avatar_id = EM[i % EM.length]; });
    K('invalidateCache()');
    const zahl = {emoji:0, ansichten:0};
    const zaehle = w => { zahl.emoji += document.querySelectorAll(w + ' .av-emoji .em').length; zahl.ansichten++; };
    for(const [t, sub] of [['ranking'], ['positions'], ['awards', 'awards'], ['awards', 'rekorde'], ['awards', 'chronik'], ['teams'], ['history']]){
      K(`closeSheet(true); tab=${JSON.stringify(t)}; ${sub ? `awView=${JSON.stringify(sub)};` : ''} render()`); await bild();
      suche('Reiter ' + t + (sub ? ' ' + sub : ''), '#main'); zaehle('#main');
    }
    K(`_cache._stories=_buildStories().sort((a,b)=>new Date(b.when)-new Date(a.when));_cache._consolFrom=null;_cache._frischVon=null;'x'`);
    K('closeSheet(true); openNewsFeed(); _newsFeedRest()'); await bild();
    suche('Feed', '#sheet'); zaehle('#sheet');
    const je = {};
    const ids = JSON.parse(K(`JSON.stringify(getStoriesCache().map(s=>[s.id,(s.dataRef||{}).type]))`))
      .filter(([, typ]) => (je[typ] = (je[typ] || 0) + 1) <= 2).map(([id]) => id);
    for(const id of ids){
      K(`closeSheet(true); openNewsFeed(); openNewsDetail(${JSON.stringify(id)})`); await bild();
      suche('Story ' + id, '#nd'); zaehle('#nd');
      K('closeNewsDetail()');
    }
    await new Promise(r => setTimeout(r, 320));
    const P = n => JSON.stringify(pl.find(p => p.name === n).id);
    for(const [wo, auf] of [['Profil', 'showPlayer(' + P('Leon') + ')'], ['Duo', 'showTeam(' + P('Leon') + ',' + P('Maxi') + ')'],
        ['Partie', 'showMatchDetail(matches[matches.length-1].id)'], ['Vergleich', 'showH2H(' + P('Leon') + ',' + P('Martin') + ')'],
        ['Torjäger', "showAward('scorer')"], ['Woche', 'showPotwRecap({force:true})'], ['Saison', 'showSeasonRecap(seasons[2])'],
        ['Laufbahn', 'showLaufbahn(' + P('Maxi') + ')'], ['Positionsverlauf', 'showPositionHistory(seasons[3].id)'],
        ['Liga-Chronik', 'showLigaChronik()'], ['Rangsystem', 'showRangSystem()'], ['Bilanzen', 'showPlayerH2HList(' + P('Leon') + ')'],
        ['Auszeichnungen', 'showPlayerBadges(' + P('Jane') + ')'], ['Monatstafel', "showSeasonTable('2026-08')"],
        ['Rekord', 'showChronicle(CHRONICLES[0].id)'], ['Tag', 'showPotdRecap({force:true})'],
        ['Spieler bearbeiten', 'showEditPlayer(' + P('Leon') + ')']]){
      K('closeSheet(true); ' + auf); await bild();
      suche('Blatt ' + wo, '#sheet'); zaehle('#sheet');
    }
    K('closeSheet(true)');
    pl.forEach((p, i) => { p.avatar_id = vorher[i]; });
    K("invalidateCache(); [_cache._stories, _cache._consolFrom, _cache._frischVon] = window.__stories; delete window.__stories;"
      + " tab='ranking'; awView='awards'; render()");
    return {zahl, stories:ids.length, funde:[...funde].map(([k, w]) => k + ' (' + w.length + '×, ' + w.slice(0, 2).join(', ') + ')'),
      schein:[...schein].map(([k, w]) => k + ' (' + w.slice(0, 2).join(', ') + ')')};
  });
  ok(ebenen.funde.length === 0 && ebenen.zahl.emoji > 300 && ebenen.stories >= 12,
     'kein Teil mit z-index oder Filter liegt in einem runden Ausschnitt ohne eigenen Stapel — in jedem Reiter, im Feed, in Stories jeder Art und den Blättern, mit Emoji als Gesichtern',
     JSON.stringify(ebenen.zahl) + ' ' + ebenen.stories + ' Stories | ' + ebenen.funde.slice(0, 6).join(' | '));
  ok(ebenen.schein.length === 0 && ebenen.zahl.ansichten > 30,
     'kein Symbol, Emoji oder Zeichen trägt seinen Schein über filter — ein Lichthof, ein Text- oder Kastenschatten statt dessen',
     ebenen.schein.slice(0, 6).join(' | '));
  // Der Verlauf bleibt ruhig [§C43]: über die Leiste betreten und beim
  // Wählen eines Spielers baut sich nichts auf, und kein Licht fährt. Die
  // Liga danach baut sich wie immer auf — so zählt die Prüfung überhaupt.
  const verlaufRuhig = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const zaehl = () => document.querySelectorAll('#main .bau, #main .kl, #main .kl-schein, #main .glanz-einmal').length;
    K("closeSheet(true);tab='ranking';period='season';histFilter='all';_histPage=0;render()"); await bild(); await warte(300);
    K('_podestZuletzt.clear()');
    document.querySelector('[data-nav="history"]').click(); await warte(80); await bild();
    const out = {tab:K('tab'), betreten:zaehl(), zeilen:document.querySelectorAll('#main .mlist > .mrow').length};
    const wahl = document.getElementById('histSel');
    if(wahl){ wahl.value = wahl.options[1].value; wahl.dispatchEvent(new Event('change')); await warte(80); await bild(); }
    out.gewaehlt = !!wahl && K('histFilter') !== 'all' && document.getElementById('main')._renderTab === 'history';
    out.filter = zaehl();
    K("histFilter='all';_histPage=0"); K('_podestZuletzt.clear()');
    document.querySelector('[data-nav="ranking"]').click(); await warte(80); await bild();
    out.liga = zaehl();
    await warte(5200);
    return out;
  });
  ok(verlaufRuhig.tab === 'history' && verlaufRuhig.zeilen > 0 && verlaufRuhig.betreten === 0 && verlaufRuhig.gewaehlt
     && verlaufRuhig.filter === 0 && verlaufRuhig.liga > 0,
     'der Verlauf baut sich nicht auf und trägt kein Licht, auch nicht beim Wählen eines Spielers', JSON.stringify(verlaufRuhig));
  // Rechnet ein Reiter lange, antwortet die Leiste trotzdem sofort: der
  // Schlitten fährt, bevor gerechnet ist; nach 90 ms dunkelt der Schleier
  // den alten Reiter ab, nach 120 ms läuft die Ladelinie. Steht der neue,
  // ist von beidem nichts mehr zu sehen [§C43].
  const bruecke = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const warte = ms => new Promise(r => setTimeout(r, ms));
    K("closeSheet(true);tab='ranking';period='season';render()"); await bild(); await warte(400);
    K("window.__r0 = render; render = function(){ const t = performance.now(); while(performance.now() - t < 300){} return window.__r0.apply(this, arguments); }; 0");
    const sl = document.querySelector('.botnav .nav-schlitten') || document.createElement('i'), vor = sl.style.transform;
    document.querySelector('[data-nav="teams"]').click();
    const verzug = sel => { const e = document.querySelector(sel); return e ? e.getAnimations().map(a => a.effect.getTiming().delay) : []; };
    const sofort = {schlitten:sl.style.transform !== vor && sl.getAnimations().length > 0,
      schleier:verzug('.reiter-schleier'), linie:verzug('.lade-linie'), alt:document.getElementById('main')._renderTab};
    await warte(800); await bild();
    const danach = {neu:document.getElementById('main')._renderTab,
      schleier:(e => e ? getComputedStyle(e).opacity : 'fehlt')(document.querySelector('.reiter-schleier')),
      linie:(e => e ? e.getAnimations().length : -1)(document.querySelector('.lade-linie'))};
    K('render = window.__r0; 0');
    K("tab='ranking';render()"); await bild();
    return {sofort, danach};
  });
  ok(bruecke.sofort.schlitten && bruecke.sofort.alt === 'ranking' && bruecke.sofort.schleier.join() === '90' && bruecke.sofort.linie.join() === '120',
     'rechnet ein Reiter lange, fährt der Schlitten sofort, und Schleier und Ladelinie überbrücken', JSON.stringify(bruecke.sofort));
  ok(bruecke.danach.neu === 'teams' && bruecke.danach.schleier === '0' && bruecke.danach.linie === 0,
     'steht der neue Reiter, sind Schleier und Ladelinie fort', JSON.stringify(bruecke.danach));
  // Der Schlitten des Wählers fährt los, bevor gerechnet ist; nach dem
  // Neuzeichnen fährt der neue dort weiter, wo der alte war — nicht von
  // vorn und nicht gleich am Ziel.
  const weiter = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const warte = ms => new Promise(r => setTimeout(r, ms));
    K("closeSheet(true);tab='ranking';period='season';ligaSeasonId=null;render()"); await warte(400);
    K("window.__r0 = render; render = function(){ const t = performance.now(); while(performance.now() - t < 100){} const r = window.__r0.apply(this, arguments);"
      + " window.__fahrt = document.querySelector('#main .ui-switch').getAnimations({subtree:true}).filter(a => a.transitionProperty === 'transform').map(a => Math.round(a.currentTime)); return r; }; 0");
    const t0 = performance.now();
    document.querySelector('#main [data-period="all"]').click();
    await warte(400);
    K('render = window.__r0; 0');
    const fahrt = window.__fahrt || [];
    K("period='season';render()");
    return {fahrt, bis:Math.round(performance.now() - t0)};
  });
  // Ein Wechsel im Reiter — Zeitraum, Saison, Spieler oder Duos, Awards,
  // Rekorde oder Chronik — antwortet wie die Leiste [§C43]: der getippte
  // Knopf ist gewählt, bevor gerechnet ist, und der Schleier beginnt unter
  // dem Wähler. Überschrift und Wähler stehen, was darunter neu ist, baut
  // sich auf — auch in einer vergangenen Saison, deren Rahmen keinen Kasten
  // hat, und in den Rekorden Karte für Karte. Licht im Metall der neuen
  // Liste, eines je Platz: das alte wandert nicht mit. Dieselbe Wahl noch
  // einmal und neue Daten bauen nichts auf; dieselbe Ansicht glänzt erst
  // nach der Pause wieder.
  const innen = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const tippe = async sel => { const b = document.querySelector('#main ' + sel); b.click(); await warte(80); await bild(); return b; };
    const bau = () => document.querySelectorAll('#main .bau').length;
    const wahlBau = () => document.querySelectorAll('#main :is(.view-head, .ui-switch, .ui-tabs, .saisonwahl):is(.bau, .bau *)').length;
    const metall = () => [...document.querySelectorAll('#main .rlist > .rrow > .kl')]
      .map(k => (k.className.match(/kl-(gold|silber|bronze)/) || [, '?'])[1]).join(' ');
    const out = {};
    K("closeSheet(true);tab='ranking';period='week';ligaSicht='spieler';ligaSeasonId=null;render();_podestZuletzt.clear()");
    await bild(); await warte(300);
    // Die Saison leuchtet noch, wenn die Woche kommt.
    await tippe('[data-period="season"]'); await warte(500);
    const woche = document.querySelector('#main [data-period="week"]'), unten = woche.parentElement.getBoundingClientRect().bottom;
    woche.click();
    out.sofort = woche.isConnected && woche.classList.contains('on')
      && woche.parentElement.querySelectorAll(':scope > .on').length === 1;
    out.schleier = parseFloat((document.querySelector('.reiter-schleier') || {style:{}}).style.top) - unten;
    await warte(80); await bild();
    out.woche = {teile:bau(), wahl:wahlBau(), metall:metall(),
      je:[...document.querySelectorAll('#main .rlist > .rrow')].slice(0, 3).map(z => z.querySelectorAll(':scope > .kl').length).join(),
      alle:document.querySelectorAll('#main .kl').length};
    await warte(1700);
    await tippe('[data-period="week"]');
    out.nochmal = bau();
    K('invalidateCache(LADEN_TOEPFE); render()');
    out.daten = bau();
    // Ein Klick auf einen Wählerknopf gilt nur für diesen Klick: ein späterer
    // Wechsel ohne Klick schaltet ihn nicht um.
    const tag = document.querySelector('#main [data-period="day"]'), h = tag.onclick;
    tag.onclick = null; tag.click(); tag.onclick = h; await warte(10);
    K('_renderNachEingabe()');
    out.alterKnopf = tag.classList.contains('on');
    await warte(80); await bild(); await warte(1700);
    await tippe('[data-period="season"]'); await warte(1700);
    await tippe('#ligaSeasonPicker [data-saisonwahl]:not(.on)');
    out.geschichte = {teile:document.querySelectorAll('#main .geschichte > .bau, #main .geschichte .rlist > .bau').length, wahl:wahlBau()};
    await warte(1700);
    K("tab='awards';awView='awards';rekKammer='';render()"); await bild();
    await tippe('[data-awview="rekorde"]');
    out.rekorde = document.querySelectorAll('#main .rek-liste > .bau').length;
    await warte(1700);
    K("tab='ranking';period='season';ligaSeasonId=null;render()"); await bild();
    await tippe('[data-period="week"]');
    out.gleich = metall();
    await warte(1700);
    K('for(const [k, t] of _podestZuletzt) _podestZuletzt.set(k, t - 60000)');
    await tippe('[data-period="season"]'); await warte(300);
    await tippe('[data-period="week"]');
    out.spaeter = metall();
    await warte(5800);
    out.rest = document.querySelectorAll('#main .bau, #main .kl, #main .kl-schein, #main .glanz-einmal').length;
    K("period='season';render()"); await bild();
    return out;
  });
  ok(weiter.fahrt.length > 0 && weiter.fahrt.every(t => t >= 80 && t < 300),
     'der Schlitten fährt über das Neuzeichnen hinweg weiter, statt neu anzufangen oder zu springen', JSON.stringify(weiter));
  ok(innen.sofort && innen.schleier >= 0 && innen.schleier < 12,
     'ein Wechsel im Reiter wählt den Knopf, bevor gerechnet ist, und der Schleier beginnt unter dem Wähler', JSON.stringify([innen.sofort, innen.schleier]));
  ok(innen.woche.teile >= 5 && innen.woche.wahl === 0 && innen.woche.metall === 'gold silber bronze' && innen.woche.je === '1,1,1' && innen.woche.alle === 3,
     'die neue Liste baut sich unter dem stehenden Wähler auf, mit einem Licht je Platz im Metall', JSON.stringify(innen.woche));
  ok(innen.geschichte.teile >= 5 && innen.geschichte.wahl === 0 && innen.rekorde >= 3,
     'auch eine vergangene Saison und die Rekorde bauen sich Teil für Teil auf', JSON.stringify([innen.geschichte, innen.rekorde]));
  ok(innen.nochmal === 0 && innen.daten === 0, 'dieselbe Wahl noch einmal und neue Daten bauen nichts auf', JSON.stringify([innen.nochmal, innen.daten]));
  ok(innen.alterKnopf === false, 'ein Wechsel ohne Klick schaltet keinen früher geklickten Knopf um', String(innen.alterKnopf));
  ok(innen.gleich === '' && innen.spaeter === 'gold silber bronze' && innen.rest === 0,
     'dieselbe Ansicht glänzt erst nach der Pause wieder, und danach ist nichts übrig', JSON.stringify([innen.gleich, innen.spaeter, innen.rest]));
  // Blätter und Fenster [§C43]: ein Blatt kommt gestaffelt; im Feed fährt
  // beim Öffnen Licht um die ungelesenen Stories im Bild — innen, ohne die
  // Karte höher zu machen —, beim Filtern nicht noch einmal. Was ein Blatt
  // verdeckt, steht still und läuft danach weiter. Story und Auszeichnung
  // öffnen mit Licht an ihrer Kante, das genau auf ihr liegt, ihnen nichts
  // zu scrollen gibt und beim Scrollen endet; geschlossen sind sie leer.
  const fenster = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const endlos = sel => document.getAnimations().filter(a => { const t = a.effect && a.effect.target;
      return t && t.closest && t.closest(sel) && a.effect.getTiming().iterations === Infinity; }).map(a => a.playState);
    const out = {};
    K("closeSheet(true); tab='awards'; awView='awards'; render()");
    await bild(); await warte(200);
    out.vorher = endlos('#main');
    K('openNewsFeed()'); await bild();
    out.staffel = [...document.querySelectorAll('#sheet .staffel-k')].map(e => e.style.animationDelay).join();
    await warte(450);
    out.verdeckt = endlos('#main');
    const karten = [...document.querySelectorAll('#sheet .nf-card')].filter(k => k.querySelector(':scope > .kl'));
    out.feed = {licht:karten.length, story:karten.every(k => k.querySelector(':scope > .kl').matches('.kl-story.kl-innen') && !k.matches('.read')),
      imBild:karten.every(k => { const r = k.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }),
      hoehe:karten.every(k => { const h = k.offsetHeight, w = [...k.querySelectorAll(':scope > .kl, :scope > .kl-schein')];
        w.forEach(e => e.remove()); const ohne = k.offsetHeight; w.forEach(e => k.appendChild(e)); return h === ohne; })};
    const chip = document.querySelector('#sheet .nf-chips button[data-f]:not(.on)');
    if(chip){ chip.click(); await warte(450); }
    out.filter = document.querySelectorAll('#sheet .kl').length;
    K("_newsFeedFilter = 'all'");
    const sid = (document.querySelector('#sheet [data-sid]') || {dataset:{}}).dataset.sid;
    K(`openNewsDetail(${JSON.stringify(sid)})`); await warte(300);
    const nd = document.getElementById('nd'), ring = nd.querySelector(':scope > .kl');
    const r = nd.getBoundingClientRect(), kr = ring ? ring.getBoundingClientRect() : {left:0, top:0, width:0, height:0};
    out.story = {licht:!!ring && ring.matches('.kl-story.kl-innen'), deckt:Math.abs(kr.left - r.left) <= 1.5 && Math.abs(kr.width - r.width) <= 3
      && Math.abs(kr.height - r.height) <= 3,
      scroll:(() => { const mit = nd.scrollHeight, w = [...nd.querySelectorAll(':scope > .kl, :scope > .kl-schein')];
        w.forEach(e => e.remove()); const ohne = nd.scrollHeight; w.forEach(e => nd.appendChild(e)); return mit === ohne; })(),
      feedLicht:document.querySelectorAll('#sheet .kl').length};
    nd.dispatchEvent(new Event('scroll'));
    out.story.nachScroll = nd.querySelectorAll(':scope > .kl').length;
    K('closeNewsDetail()'); await warte(320);
    out.story.leer = nd.innerHTML === '';
    K('closeSheet(true)'); await bild();
    out.nachher = endlos('#main');
    // Wechselt unter dem Blatt eine Klasse, läuft danach die neue Bewegung,
    // nicht die alte daneben.
    const puls = () => document.getAnimations().filter(a => a.effect.target.id === 'connDot' && a.animationName === 'pulse').map(a => a.playState);
    const punkt = document.getElementById('connDot'), klasse = punkt.className;
    punkt.className = 'dot load'; K('showPlayer(players[0].id)'); await warte(350);
    punkt.className = 'dot ok'; await bild(); punkt.className = 'dot load'; await bild();
    K('closeSheet(true)'); await bild();
    out.puls = puls();
    punkt.className = 'dot ok'; await bild();
    out.pulsOk = puls();
    punkt.className = klasse;
    const bid = K('BADGES[0].id');
    K(`showBadgePopover(${JSON.stringify(bid)}, players[0].id)`); await warte(300);
    const bp = document.getElementById('bp');
    out.bp = {licht:!!bp.querySelector(':scope > .kl.kl-weiss.kl-innen')};
    K('closeBadgePopover()'); await warte(320);
    out.bp.leer = bp.innerHTML === '';
    K("tab='ranking'; render()"); await bild();
    return out;
  });
  ok(fenster.staffel === '0ms,45ms' && fenster.feed.licht >= 1 && fenster.feed.licht <= 6 && fenster.feed.story && fenster.feed.imBild && fenster.feed.hoehe,
     'der Feed kommt gestaffelt, mit Licht in ihrer Farbe um die ungelesenen Stories im Bild, ohne eine Karte höher zu machen', JSON.stringify(fenster));
  ok(fenster.filter === 0, 'beim Filtern im offenen Feed fährt kein Licht noch einmal', String(fenster.filter));
  ok(fenster.vorher.includes('running') && fenster.verdeckt.length && fenster.verdeckt.every(x => x === 'paused') && fenster.nachher.every(x => x === 'running'),
     'was das Blatt verdeckt, steht still, und danach läuft es weiter', JSON.stringify([fenster.vorher, fenster.verdeckt, fenster.nachher]));
  ok(fenster.puls.join() === 'running' && fenster.pulsOk.length === 0,
     'wechselt darunter eine Klasse, läuft danach die neue Bewegung allein, und ohne ihre Regel keine', JSON.stringify([fenster.puls, fenster.pulsOk]));
  ok(fenster.story.licht && fenster.story.deckt && fenster.story.scroll && fenster.story.feedLicht === 0 && fenster.story.nachScroll === 0
     && fenster.story.leer && fenster.bp.licht && fenster.bp.leer,
     'Story und Auszeichnung öffnen mit Licht genau an ihrer Kante, das beim Scrollen endet, und sind geschlossen leer', JSON.stringify([fenster.story, fenster.bp]));
  // Im laufenden Betrieb zieht alle 7 bis 12 s eine leise, langsame Linie
  // um etwas, das zählt [§C43]: eine Runde in 6,5 s, ohne Rahmen, reihum
  // die Karten des offenen Reiters, die Pille „News“ (nur mit Ungelesenem),
  // „Match eintragen“ und das Zeichen der Liga — nie zweimal dasselbe
  // hintereinander, eine Karte nur ganz im Bild, und verlässt sie es, endet
  // ihr Licht. Auch gleich nach einer Berührung; nicht, solange anderes
  // Licht läuft, nicht unter einem Blatt, nicht bei Bewegungsruhe.
  const leiseLauf = async () => page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const weg = () => document.querySelectorAll('.kl, .kl-schein, .glanz-einmal').forEach(e => e.remove());
    const KARTEN = '.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3';
    const name = el => el.matches(KARTEN) ? 'top' + (el.matches('.top1') ? 1 : el.matches('.top2') ? 2 : 3)
      : el.id === 'newsBtn' ? 'news' : el.id === 'fab' ? 'knopf' : el.matches('.logo-mark') ? 'zeichen' : el.className;
    K("closeSheet(true); tab='ranking'; ligaSicht='spieler'; period='season'; ligaSeasonId=null; render(); _aufbauFertig()"); await bild();
    const btn = document.getElementById('newsBtn'), zahl = document.getElementById('newsBtnBadge'), fab = document.getElementById('fab');
    const vorher = [btn.className, zahl.getAttribute('style'), fab.getAttribute('style')];
    btn.classList.remove('wartet'); zahl.style.display = ''; fab.style.display = '';
    weg(); K('_leiseSchritt = 0; _leiseKarte = 0; _leiseZuletzt = null');
    const st = window.setTimeout, ende = [];
    window.setTimeout = (f, ms) => { ende.push(ms); return st(f, ms); };
    const ring = K('_leisesLicht()'), out = {};
    window.setTimeout = st;
    if(ring){
      const r = ring.parentElement.getBoundingClientRect(), i = getComputedStyle(ring.querySelector('i'));
      out.ziel = name(ring.parentElement);
      out.imBild = r.top >= 0 && r.bottom <= innerHeight - 90;
      out.leise = ring.matches('.kl-leise') && i.animationName === 'klLeise' && i.animationDuration === '6.5s'
        && getComputedStyle(ring, '::after').animationName === 'none' && ende.includes(6620);
    }
    out.licht = !!ring;
    out.zweites = !!K('_leisesLicht()');
    // Verlässt die Karte das Bild, endet ihr Licht.
    if(ring){
      const karte = ring.parentElement;
      window.scrollTo(0, scrollY + karte.getBoundingClientRect().bottom + 40); await bild(); await bild();
      out.ausDemBild = karte.getBoundingClientRect().bottom < 0 && !karte.querySelector(':scope > .kl, :scope > .kl-schein');
      window.scrollTo(0, 0); await bild();
    }
    // Reihum: jedes Ziel kommt vor, keines zweimal hintereinander.
    const folge = n => { const f = []; for(let i = 0; i < n; i++){ weg(); const k = K('_leisesLicht()'); f.push(k ? name(k.parentElement) : null); } return f; };
    out.folge = folge(14);
    zahl.style.display = 'none';
    out.ohneNeues = folge(14);
    zahl.style.display = '';
    // Ist Platz 1 oben angeschnitten, nimmt es ihn nie.
    const eins = document.querySelector('#main .rlist > .rrow.top1');
    window.scrollTo(0, scrollY + eins.getBoundingClientRect().top + 20); await bild();
    out.angeschnitten = [];
    for(let i = 0; i < 14; i++){
      weg(); const k = K('_leisesLicht()');
      if(k && k.parentElement.matches(KARTEN)){ const r = k.parentElement.getBoundingClientRect(); out.angeschnitten.push(r.top >= 0 && r.bottom <= innerHeight - 90); }
    }
    window.scrollTo(0, 0); await bild();
    // Gleich nach einer Berührung und beim Scrollen: es wartet nicht.
    weg();
    document.dispatchEvent(new Event('pointerdown')); document.dispatchEvent(new Event('scroll'));
    out.bedient = !!K('_leisesLicht()');
    // Die Karte kommt aus dem offenen Reiter und seiner Ansicht.
    out.ansichten = {};
    for(const [n, code] of [['duos', "tab='ranking'; ligaSicht='duos'"], ['positionen', "ligaSicht='spieler'; tab='positions'"],
        ['teams', "tab='teams'"], ['awards', "tab='awards'; awView='awards'"], ['rekorde', "tab='awards'; awView='rekorde'"],
        ['chronik', "tab='awards'; awView='chronik'"], ['verlauf', "tab='history'"]]){
      K(code + '; render(); _aufbauFertig()'); await bild();
      weg(); K('_leiseSchritt = 0; _leiseKarte = 0; _leiseZuletzt = null');
      const k = K('_leisesLicht()'), z = k && k.parentElement;
      out.ansichten[n] = !z ? null : z.closest('#main > .view') ? z.className.split(' ').slice(0, 3).join('.') : name(z);
    }
    K("tab='awards'; awView='awards'; tab='ranking'; render(); _aufbauFertig()"); await bild();
    weg();
    K("showPlayer(players[0].id)"); await bild();
    out.blatt = !!K('_leisesLicht()');
    K('closeSheet(true)'); await bild();
    const zeiten = [];
    window.setTimeout = (f, ms) => { zeiten.push(ms); return 0; };
    for(let i = 0; i < 20; i++) K('_leisePlanen()');
    K('_leisePlanen(true)');
    window.setTimeout = st;
    out.plan = [Math.min(...zeiten.slice(0, 20)), Math.max(...zeiten.slice(0, 20)), zeiten[20]];
    weg();
    btn.className = vorher[0];
    [[zahl, vorher[1]], [fab, vorher[2]]].forEach(([el, v]) => v === null ? el.removeAttribute('style') : el.setAttribute('style', v));
    return out;
  });
  const leise = await leiseLauf();
  const nachbar = f => f.every((x, i) => !i || x !== f[i - 1]);
  ok(leise.licht && /^top[123]$/.test(leise.ziel) && leise.imBild && leise.leise,
     'im laufenden Betrieb zieht eine leise, langsame Linie um eine Karte, die zählt und ganz im Bild steht', JSON.stringify(leise));
  ok(leise.ausDemBild, 'verlässt die Karte das Bild, endet ihr Licht', JSON.stringify(leise));
  ok(leise.folge.every(Boolean) && ['top1', 'top2', 'top3', 'news', 'knopf', 'zeichen'].every(z => leise.folge.includes(z)) && nachbar(leise.folge)
     && leise.ohneNeues.every(Boolean) && !leise.ohneNeues.includes('news') && nachbar(leise.ohneNeues),
     'die Linie wechselt reihum zwischen den Plätzen, der Pille mit Neuem, dem Knopf und dem Zeichen, nie zweimal dasselbe hintereinander', JSON.stringify([leise.folge, leise.ohneNeues]));
  ok(leise.angeschnitten.length >= 4 && leise.angeschnitten.every(Boolean),
     'eine Karte, die angeschnitten ist, bekommt kein leises Licht', JSON.stringify(leise.angeschnitten));
  const an = leise.ansichten || {};
  ok(/^rrow\.duo\.top1$/.test(an.duos) && /^rrow\.top1/.test(an.positionen) && /tm-top/.test(an.teams) && /^pod-karte/.test(an.awards)
     && /^rek(-besitz)?\b/.test(an.rekorde) && ['news', 'knopf', 'zeichen'].includes(an.chronik) && an.verlauf === null,
     'die Karte des leisen Lichts kommt aus dem offenen Reiter und seiner Ansicht', JSON.stringify(an));
  ok(!leise.zweites && leise.bedient && !leise.blatt && leise.plan[0] >= 7000 && leise.plan[1] <= 12000 && leise.plan[2] === 2000,
     'auch gleich nach einer Berührung, nicht neben anderem Licht, nicht unter einem Blatt, alle 7 bis 12 s und nach einem ausgesetzten Versuch nach 2 s', JSON.stringify(leise));
  // Was endlos läuft und nicht im Bild steht, hält an [§C43], und läuft
  // weiter, wenn es hereinkommt: im Feed ganz unten stehen die Bewegungen
  // der Karten oben, wieder oben laufen sie; im Profil ebenso der Kopf.
  // Geschlossen bleibt nichts angehalten zurück.
  const sicht = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const lage = sh => {
      const sc = [sh, ...sh.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
      const q = sc.getBoundingClientRect(), oben = Math.max(0, q.top), unten = Math.min(innerHeight, q.bottom);
      const liste = document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.getTiming().iterations === Infinity && sh.contains(a.effect.target))
        .map(a => { const t = a.effect.target, r = t.getBoundingClientRect();
          // Was in einer Karte mit `content-visibility:auto` außerhalb des
          // Bilds liegt, rechnet der Browser selbst nicht, und was noch in
          // seiner Verzögerung steht, bewegt noch nichts: beides steht.
          const lauf = a.playState === 'running' && (!t.checkVisibility({contentVisibilityAuto:true})
            || a.effect.getComputedTiming().progress === null) ? 'paused' : a.playState;
          return {im:r.bottom > oben && r.top < unten && a.effect.getComputedTiming().progress !== null,
            weit:r.bottom < oben - 100 || r.top > unten + 100, lauf, name:a.animationName}; });
      return {sc, liste, im:liste.filter(x => x.im).map(x => x.lauf), weit:liste.filter(x => x.weit).map(x => x.lauf)};
    };
    // Der Beobachter meldet nach dem nächsten Bild, unter Last später:
    // gewartet wird, bis seine Meldungen da sind, höchstens 2 s.
    const rollen = async (sc, wo, sh) => {
      sc.scrollTop = wo === 'unten' ? sc.scrollHeight : 0; await warte(500); sc.scrollTop = wo === 'unten' ? sc.scrollHeight : 0;
      for(let i = 0; i < 20; i++){ await bild(); await warte(100); const l = lage(sh); if(l.weit.every(x => x === 'paused') && l.im.every(x => x === 'running')) break; }
    };
    const out = {};
    K("closeSheet(true); tab='ranking'; render(); _aufbauFertig(); openNewsFeed()"); await warte(900);
    let sh = document.querySelector('.sheet.show'), l = lage(sh);
    await rollen(l.sc, 'unten', sh); l = lage(sh);
    out.feedUnten = {im:l.im, weit:l.weit};
    await rollen(l.sc, 'oben', sh); l = lage(sh);
    out.feedOben = {im:l.im, weit:l.weit};
    K('closeSheet(true)'); await warte(500);
    out.feedZu = [...document.querySelectorAll('.steht')].filter(e => e.isConnected).length;
    K('showPlayer(players[0].id)'); await warte(700);
    sh = document.querySelector('.sheet.show'); l = lage(sh);
    await rollen(l.sc, 'unten', sh); l = lage(sh);
    out.profilUnten = {im:l.im, weit:l.weit, namen:l.liste.filter(x => x.weit).map(x => x.name)};
    await rollen(l.sc, 'oben', sh); l = lage(sh);
    out.profilOben = {im:l.im, weit:l.weit};
    K('closeSheet(true)'); await warte(500);
    out.profilZu = [...document.querySelectorAll('.steht')].filter(e => e.isConnected).length;
    return out;
  });
  const nurSo = (x, w) => x.length > 0 && x.every(y => y === w);
  ok(nurSo(sicht.feedUnten.weit, 'paused') && sicht.feedUnten.weit.length >= 3 && sicht.feedUnten.im.every(y => y === 'running')
     && nurSo(sicht.feedOben.im, 'running') && sicht.feedOben.weit.every(y => y === 'paused') && sicht.feedZu === 0,
     'im Feed steht, was endlos läuft und nicht im Bild ist, und läuft wieder, wenn es hereinkommt', JSON.stringify(sicht));
  ok(nurSo(sicht.profilUnten.weit, 'paused') && nurSo(sicht.profilOben.im, 'running') && sicht.profilZu === 0,
     'im Profil ebenso: der Kopf steht, wenn er aus dem Bild ist', JSON.stringify(sicht));
  // Safari meldet SVG-Inhalt dem IntersectionObserver nie als sichtbar. Ein
  // Beobachter an den Pfaden des Feuers hielt es dort für immer an, im
  // Profilkopf wie in der Rangliste [§C43]. Nachgestellt in einer zweiten
  // Seite, deren Beobachter sich so verhält: das Feuer läuft trotzdem, und
  // beobachtet wird nie ein Element in einem SVG.
  {
    const safari = await browser.newPage({viewport: {width: 390, height: 844}});
    await safari.setContent('<!doctype html><html><head><meta charset="utf-8">' + styles + '</head>' + bodyHtml + '</body></html>');
    await safari.addScriptTag({content: BOOT});
    await safari.addScriptTag({content: `(() => {
      const IO = window.IntersectionObserver;
      window.IntersectionObserver = class extends IO {
        constructor(cb, o){ super((es, ob) => cb(es.map(e => e.target instanceof SVGElement && e.target.ownerSVGElement
          ? {target:e.target, isIntersecting:false, intersectionRatio:0, boundingClientRect:e.boundingClientRect, time:e.time} : e), ob), o); }
      };
    })();`});
    await safari.addScriptTag({content: code});
    const feuer = await safari.evaluate(async ([P, M]) => {
      const K = window.__k.eval.bind(window.__k), warte = ms => new Promise(r => setTimeout(r, ms));
      K('players = ' + JSON.stringify(P) + '; matches = ' + JSON.stringify(M) + '; invalidateCache();'
        + 'const L = players[8], a = players.filter(p => p !== L).slice(0, 3), t0 = Date.now() - 3600e3;'
        + 'for(let i = 0; i < 8; i++) matches.push({id:"sx" + i, a1:L.id, a2:a[0].id, b1:a[1].id, b2:a[2].id,'
        + ' a1_side:"drive", a2_side:"reves", b1_side:"drive", b2_side:"reves", games_a:10, games_b:3, winner:"A", exp_a:.5,'
        + ' created_at:new Date(t0 + i * 60e3).toISOString(), deltas:{}});'
        + 'invalidateCache(); tab = "ranking"; render(); showPlayer(L.id); 0');
      await warte(1500);
      const sh = document.querySelector('.sheet.show');
      const bilder = sh ? [...sh.querySelectorAll('.zn-fx .zf')] : [];
      return {serie:K('playerStats(players[8].id).curStreak'), bilder:bilder.length,
        laufen:bilder.map(b => b.getAnimations().map(x => x.playState).join()),
        svgBeobachtet:[...K('_sichtGruppen').keys()].filter(w => w instanceof SVGElement).length};
    }, [PLAYERS, MATCHES]);
    ok(feuer.serie >= 3 && feuer.bilder >= 2 && feuer.laufen.every(x => x === 'running') && feuer.svgBeobachtet === 0,
       'auch mit dem Beobachter von Safari läuft das Feuer im Profilkopf, und kein SVG-Inhalt wird beobachtet', JSON.stringify(feuer));
    await safari.close();
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  const leiseRuhig = await leiseLauf();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(!leiseRuhig.licht, 'bei Bewegungsruhe kein leises Licht', JSON.stringify(leiseRuhig));
  {
    await K("closeSheet(true);tab='ranking';period='season';render()");
    await page.waitForTimeout(1200);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const metrik = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    const a = await metrik(); await page.waitForTimeout(2500); const b = await metrik();
    const stil = b.RecalcStyleCount - a.RecalcStyleCount, lay = b.LayoutCount - a.LayoutCount;
    ok(stil === 0 && lay === 0, 'die offene Liga rechnet weder Stil noch Layout neu', stil + ' Stil, ' + lay + ' Layout in 2,5 s');
    await cdp.detach();
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  const meRuhig = await metallMess();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(meRuhig.stoss === 'none' && meRuhig.blatt === 'none/none' && meRuhig.rahmen === 3,
     'bei prefers-reduced-motion bewegt sich nichts, das Metall bleibt', JSON.stringify([meRuhig.stoss, meRuhig.blatt, meRuhig.rahmen]));

  console.log('\n═══ JEDER REITER BEI 360 PX ═══');
  await page.setViewportSize({width:360, height:780});
  // Gemessen bei 360 px, der schmalsten verbreiteten Breite: bei 390 passte
  // „Unaufhaltsam" gerade noch, bei 360 brach es mitten im Wort.
  await page.setViewportSize({width: 360, height: 780});
  const reiter = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const sichten = [
      ['Liga', "tab='ranking';period='season'"], ['Liga gesamt', "period='all'"],
      ['Liga gesamt Torbilanz', "rankMetric='goaldiff'"], ['Liga gesamt Siegquote', "rankMetric='winrate'"],
      ['Liga Woche', "rankMetric='elo';period='week'"], ['Liga Tag', "period='day'"],
      ['Positionen Sturm', "period='season';tab='positions';rankMetric='drive'"],
      ['Positionen Abwehr', "rankMetric='reves'"],
      ['Awards', "tab='awards';awView='awards';awPeriod='season'"], ['Awards Woche', "awPeriod='week'"],
      ['Rekorde', "awPeriod='season';awView='rekorde'"], ['Chronik', "awView='chronik'"],
      ['Teams', "awView='awards';tab='teams'"], ['Teams Torbilanz', "teamSort='gd'"],
      ['Verlauf', "teamSort='wr';tab='history'"],
      ['Match', "tab='match'"], ['Einstellungen', "tab='settings'"]];
    const W = document.documentElement.clientWidth, out = [];
    for(const [name, setz] of sichten){
      K(setz + ';render()');
      await new Promise(r => requestAnimationFrame(r));
      const raus = [], schief = [];
      document.querySelectorAll('#main *').forEach(el => {
        const r = el.getBoundingClientRect();
        if(!r.width || !r.height) return;
        let p = el.parentElement, scroller = false;
        while(p && p.id !== 'main'){ const cs = getComputedStyle(p);
          if(/(auto|scroll|hidden|clip)/.test(cs.overflowX)){ scroller = true; break; } p = p.parentElement; }
        if(!scroller && (r.right > W + 1 || r.left < -1))
          raus.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' bis ' + Math.round(r.right));
      });
      document.querySelectorAll('#main .av').forEach(av => {
        const t = [...av.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        if(!t) return;
        const rg = document.createRange(); rg.selectNodeContents(t);
        const a = av.getBoundingClientRect(), b = rg.getBoundingClientRect();
        if(Math.abs((a.left+a.right)/2 - (b.left+b.right)/2) > 2.5
          || Math.abs((a.top+a.bottom)/2 - (b.top+b.bottom)/2) > 3)
          schief.push(t.textContent.trim());
      });
      const fab = document.getElementById('fab');
      // Eine Dezimalzahl trägt ein Komma [§C27] — „4.00 Gegentore" stand in
      // der Betonmauer, „Ø 8.8" in der Positionsliste. Ein Datum („26.08.")
      // und die Version fallen durch den Ausschluss nach der Zahl heraus.
      const punkt = (document.getElementById('main').innerText
        .match(/(^|[^\d.,])\d{1,3}\.\d{1,2}(?![\d.])/g) || []).map(x => x.trim());
      // Eine Bilanz bricht nicht um, und die Torzeile der Positionen wird
      // nicht abgeschnitten: gemessen stand „81–" über „40", und „Ø 8.8 T…"
      // endete mitten im Wort.
      const bruch = [...document.querySelectorAll('#main .rmeta > span:first-child')]
        .filter(e => { const rg = document.createRange(); rg.selectNodeContents(e);
          return new Set([...rg.getClientRects()].map(r => Math.round(r.top))).size > 1; })
        .map(e => e.textContent);
      [...document.querySelectorAll('#main .rmeta-tore')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).forEach(e => bruch.push(e.textContent));
      // Ein Reiter, dessen Wort abgeschnitten ist, sagt nicht, wonach er
      // sortiert: in der Ewigen Tafel standen „Siegq…" und „Torbil…".
      [...document.querySelectorAll('#main .ui-tabs button, #main .ui-switch button')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).forEach(e => bruch.push('Reiter ' + e.textContent.trim()));
      // Ebenso der Name einer Award-Kachel: „Längste Siegesser…".
      [...document.querySelectorAll('#main .aw-t-lbl')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).forEach(e => bruch.push('Kachel ' + e.textContent.trim()));
      // Und kein Wort darin bricht mitten durch: `overflow-wrap` verhindert
      // den Überlauf, den die Zeile darüber misst, und brach dafür
      // „Unaufhaltsa|m" und „Unzertren|nlich" — ohne Trennstrich, weil das
      // Telefon nicht jede Sprache trennen kann.
      [...document.querySelectorAll('#main .aw-t-lbl')].forEach(e => {
        const t = e.firstChild; if(!t || t.nodeType !== 3) return;
        // Nach einem Bindestrich darf die Zeile umbrechen: „Underdog-|Held".
        let i = 0;
        t.textContent.split(/[ -]/).forEach(w => {
          const rg = document.createRange(); rg.setStart(t, i); rg.setEnd(t, i + w.length); i += w.length + 1;
          if(w && new Set([...rg.getClientRects()].map(r => Math.round(r.top))).size > 1) bruch.push('Kachel ' + w + ' bricht');
        });
      });
      // Und die Nebenwertungen der Liga: „Längste Siege…", „4× Player of t…".
      [...document.querySelectorAll('#main .wk-hl-label, #main .wk-hl-detail')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).forEach(e => bruch.push('Nebenwertung ' + e.textContent.trim()));
      // Die Zahl rechts einer Ranglistenzeile liegt neben der Zeile, nicht
      // über ihr: „Torbilanz je Partie" lag bei 360 px über der Siegquote.
      const deckt = [];
      document.querySelectorAll('#main .rrow').forEach(z => {
        const wert = z.querySelector('.rval, .tm-wert'), mitte = z.querySelector('.rmid, .tm-mitte');
        if(!wert || !mitte) return;
        const w = wert.getBoundingClientRect();
        [...mitte.querySelectorAll('*')].forEach(e => {
          const r = e.getBoundingClientRect();
          if(r.width && r.height && r.right > w.left + .5 && r.bottom > w.top && r.top < w.bottom)
            deckt.push((z.querySelector('.rname, .tm-name') || {}).textContent.trim() + ': ' + e.textContent.trim().slice(0, 12));
        });
      });
      out.push({name, bruch:bruch.slice(0,3), punkt:punkt.slice(0,3), raus:[...new Set(raus)].slice(0,4), schief:schief.slice(0,4), deckt:deckt.slice(0,3),
        fab: fab ? getComputedStyle(fab).display : ''});
    }
    K("tab='ranking';period='season';rankMetric='elo';awView='awards';render()");
    return out;
  });
  await page.setViewportSize({width: 390, height: 844});
  const reiterRaus = reiter.filter(r => r.raus.length);
  ok(reiterRaus.length === 0, 'kein Reiter läuft bei 360 px aus dem Bildschirm',
     reiterRaus.map(r => r.name + ': ' + r.raus.join(', ')).join(' | ') || reiter.length + ' Reiter');
  const reiterSchief = reiter.filter(r => r.schief.length);
  ok(reiterSchief.length === 0, 'jedes Gesicht trägt seine Initialen in der Mitte',
     reiterSchief.map(r => r.name + ': ' + r.schief.join(', ')).join(' | ') || 'alle mittig');
  const reiterDeckt = reiter.filter(r => r.deckt.length);
  ok(reiterDeckt.length === 0 && reiter.some(r => r.name === 'Liga gesamt Torbilanz'),
     'in keiner Ranglistenzeile liegt die Zahl rechts über der Zeile, auch nicht unter Torbilanz und Siegquote',
     reiterDeckt.map(r => r.name + ': ' + r.deckt.join(', ')).join(' | ') || reiter.length + ' Reiter');
  const reiterBruch = reiter.filter(r => r.bruch.length);
  ok(reiterBruch.length === 0 && reiter.some(r => r.name === 'Positionen Sturm'),
     'Bilanz, Torzeile, Reiter und Kachelnamen stehen ungekürzt auf einer Zeile',
     reiterBruch.map(r => r.name + ': ' + r.bruch.join(', ')).join(' | ') || 'alle einzeilig');
  // Dieselbe Frage für die Blätter, die Zahlen mit Nachkommastelle zeigen.
  let blattPunkt = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const P = n => JSON.stringify(K('(players.find(p=>p.name===' + JSON.stringify(n) + ')||{}).id'));
    const blaetter = [['Profil', 'showPlayer(' + P('Leon') + ')'],
      ['Duo', 'showTeam(' + P('Leon') + ',' + P('Maxi') + ')'],
      // Leo und Maxi haben zwei Aufstellungen, die nebeneinander stehen.
      ['Duo mit zwei Aufstellungen', 'showTeam(' + P('Leo') + ',' + P('Maxi') + ')'],
      ['Partie', 'showMatchDetail(matches[matches.length-1].id)'],
      ['Vergleich', 'showH2H(' + P('Leon') + ',' + P('Martin') + ')'],
      ['Torjäger', "showAward('scorer')"], ['Betonmauer', "showAward('concreteWall')"],
      ['Wochenkönig', "period='week';openTopList('periodKing')"],
      ['Woche', 'showPotwRecap({force:true})'], ['Saison', 'showSeasonRecap(seasons[2])'],
      ['Laufbahn', 'showLaufbahn(' + P('Maxi') + ')'], ['Feed', 'openNewsFeed(); _newsFeedRest()'],
      ['Positionsverlauf', 'showPositionHistory(seasons[3].id)'],
      ['Liga-Chronik', 'showLigaChronik()'], ['Rangsystem', 'showRangSystem()'],
      ['Bilanzen', 'showPlayerH2HList(' + P('Leon') + ')'],
      ['Saisons', 'showPlayerSeasons(' + P('Leon') + ')'],
      ['Regeln', 'showPrestigeRegeln(' + P('Leon') + ')'],
      ['Auszeichnungen', 'showPlayerBadges(' + P('Jane') + ')'],
      ['Monatstafel', "showSeasonTable('2026-08')"], ['Rekord', 'showChronicle(CHRONICLES[0].id)'],
      ['Tag', 'showPotdRecap({force:true})'],
      ['Spieler bearbeiten', 'showEditPlayer(' + P('Leon') + ')'],
      ['Partie bearbeiten', 'showEditMatch(matches[matches.length-1].id)'],
      ['Neuer Spieler', 'showAddPlayer()']];
    const gesicht = [];
    const rand = [];
    const out = [], woerter = [];
    // Dieselbe Sache heißt überall gleich, und niemand wird angesprochen:
    // „Siegrate" neben „Siegquote", „Mate" neben „Partner", „Winrate",
    // „Tordiff", „Head-to-Head", „Team-Sheet", ein „du" in den Einstellungen
    // und „zu 3. gehalten".
    // Groß und klein: `innerText` liefert die Schreibweise nach
    // `text-transform`, und „Bester Mate" steht dort als „BESTER MATE".
    // „Match" neben „Partie": der Liga-Kopf zählte „19 Matches", der Feed
    // erzählte von Partien. Ebenso „Spiele": das Profil zählte „431 Spiele",
    // der Vergleich „1 Spiele", die Positionen „Tore je Spiel".
    // Prozent steht mit Leerzeichen, wie im Feed und in der Chronik: Liga,
    // Awards, Profil und Duo schrieben „75%". Gelesen wird je Textknoten —
    // der Ring der Rollen setzt sein kleines Zeichen selbst daneben.
    // Das Hauptwort, nicht das Verb („spielen zu null"), und nicht die
    // Redensart „im Spiel bleiben": deshalb ohne das `i` von WORT.
    const SPIEL = /\b(Spiele|Spielen|SPIELE|SPIELEN|SPIEL)\b|(?<!im )\bSpiel\b/g;
    const prozentOhne = (wurzel, name) => {
      const tw = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
      for(let n = tw.nextNode(); n; n = tw.nextNode()){
        const m = n.nodeValue.match(/\d%/);
        if(m && n.parentElement && n.parentElement.closest('svg') == null) woerter.push(name + ': ' + n.nodeValue.trim().slice(0, 24));
      }
    };
    const WORT = /\b(Mate|Siegrate|Winrate|Tordiff|Head-to-Head|Sheet|Upset|All-Time|Tippe|Tap|Update|Highlights|Stats|Win-Rate|Performance|Peak|Savepoint|Backup|Match|Matches)\b|\bSp\.|(?<![A-Za-zÄÖÜäöüß])[TG] = als|(?<![\d,])1 (?:Niederlagen|Siege|Partien)\b|(?<![A-Za-zÄÖÜäöüß])(min|mind|max)\.\s|zu \d+\. gehalten|\b(?:du|dein\w*)\b(?=\s[a-zäöü])/gi;
    for(const [name, auf] of blaetter){
      try{ K('closeSheet(true)'); K(auf); }catch(e){ out.push(name + ': ' + e.message); continue; }
      await new Promise(r => requestAnimationFrame(r));
      const txt = document.getElementById('sheet').innerText;
      const m = (txt.match(/(^|[^\d.,])\d{1,3}\.\d{1,2}(?![\d.])/g) || []).map(x => x.trim());
      if(m.length) out.push(name + ': ' + m.slice(0,3).join(' '));
      (txt.match(WORT) || []).forEach(w => woerter.push(name + ': ' + w));
      (txt.match(SPIEL) || []).forEach(w => woerter.push(name + ': ' + w));
      prozentOhne(document.getElementById('sheet'), name);
      // Der Name in einer Award-Liste bricht um, statt zu enden: mit der
      // Schrift der App blieben einem Duo bei 360 px 125 px, und „Johannes &
      // Julian" stand als „Johannes & Jul…" da. Gefragt wird die Regel, nicht
      // die Breite — die Ersatzschrift des Prüflaufs ist schmaler.
      const nm = document.querySelector('#sheet .aw-li-name');
      if(nm && getComputedStyle(nm).textOverflow === 'ellipsis' && getComputedStyle(nm).whiteSpace === 'nowrap')
        rand.push(name + ': der Name der Liste kann mit „…" enden');
      // Keine zwei Beschriftungen einer Achse übereinander: am 26. standen
      // im Positionsverlauf „25" und „26" als „2526".
      const ticks = [...document.querySelectorAll('#sheet .posv-x-tick')].map(t => t.getBoundingClientRect());
      for(let i = 1; i < ticks.length; i++)
        if(ticks[i].left < ticks[i-1].right) rand.push(name + ': Achse überlappt');
      // Und nichts läuft über den Rand des Blatts: die Beziehungskarten im
      // Profil standen mit „Schwächster Partner" 19 px darüber hinaus, die
      // Kachel „Monatschroniken" der Laufbahn zog ihre Spalte auf.
      // Gemessen wird am Innenrand: das Blatt hat 20 px Rand, und eine Karte,
      // die in ihn hineinläuft, steht sichtbar schief neben den anderen.
      // Ein Gesicht hat eine Größe, auch ohne Wappen: unter 48 px kam es
      // nackt zurück, und das Duo einer Durststrecke stand als „LMA" da.
      document.querySelectorAll('#sheet .av').forEach(a => {
        if(!a.textContent.trim()) return;
        const r = a.getBoundingClientRect();
        if(r.width && (r.width < 16 || Math.abs(r.width - r.height) > 1))
          gesicht.push(name + ': ' + a.textContent.trim() + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      });
      const sh = document.getElementById('sheet'), sb = sh.getBoundingClientRect();
      const sr = {right: sb.right - parseFloat(getComputedStyle(sh).paddingRight)};
      sh.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if(!r.width || !r.height) return;
        let q = el.parentElement, scroller = false;
        // Ausgenommen ist, was ein Vorfahr abschneidet oder waagerecht
        // scrollt (Titelreihe, Karussell). Der senkrechte Scroller des
        // Blatts selbst zählt nicht, sonst wäre alles ausgenommen.
        while(q && q !== sh){ const ox = getComputedStyle(q).overflowX;
          if(/(hidden|clip)/.test(ox) || (/(auto|scroll)/.test(ox) && q.scrollHeight <= q.clientHeight + 1)){ scroller = true; break; }
          q = q.parentElement; }
        if(!scroller && r.right > sr.right + 1) rand.push(name + ': ' + String(el.className).split(' ')[0] + ' +' + Math.round(r.right - sr.right));
      });
      // Und keine Schrift ist breiter als ihr Feld, wo ein Kasten sie
      // abschneidet: ein Wort bricht nicht um, und „Wiederholungstäter"
      // endete in seiner Karte als „Wiederholungstäte". Wer kürzen darf,
      // trägt „…".
      const tw = document.createTreeWalker(sh, NodeFilter.SHOW_TEXT);
      let tn;
      while((tn = tw.nextNode())){
        const el = tn.parentElement;
        if(!tn.textContent.trim() || !el || el.closest('svg')) continue;
        let kappe = null, frei = false;
        for(let q = el; q && q !== sh; q = q.parentElement){
          const cs = getComputedStyle(q);
          if(cs.textOverflow === 'ellipsis' || (/(auto|scroll)/.test(cs.overflowX) && q.scrollWidth > q.clientWidth + 1)){ frei = true; break; }
          if(/(hidden|clip)/.test(cs.overflowX)){ kappe = q; break; }
        }
        if(frei || !kappe) continue;
        const rg = document.createRange(); rg.selectNodeContents(tn);
        const rs = [...rg.getClientRects()].filter(r => r.width > 0.5);
        if(!rs.length) continue;
        const re = Math.max(...rs.map(r => r.right)), kr = kappe.getBoundingClientRect();
        if(re > kr.right + 1) rand.push(name + ': „' + tn.textContent.trim().slice(0, 24) + '" abgeschnitten');
      }
    }
    K('closeSheet(true)');
    for(const [name, setz] of [['Liga', "tab='ranking'"], ['Teams', "tab='teams'"],
        ['Awards', "tab='awards';awView='awards'"], ['Einstellungen', "tab='settings'"],
        ['Positionen', "tab='positions'"], ['Liga gesamt', "tab='ranking';period='all'"]]){
      K(setz + ';render()');
      (document.getElementById('main').innerText.match(WORT) || []).forEach(w => woerter.push(name + ': ' + w));
      (document.getElementById('main').innerText.match(SPIEL) || []).forEach(w => woerter.push(name + ': ' + w));
      prozentOhne(document.getElementById('main'), name);
    }
    K("tab='ranking';period='season';render()");
    return {out, woerter, rand:[...new Set(rand)].slice(0, 8), gesicht:[...new Set(gesicht)].slice(0, 6)};
  });
  ok(blattPunkt.gesicht.length === 0, 'jedes Gesicht in einem Blatt hat eine Größe und ist rund',
     blattPunkt.gesicht.join(' | ') || 'alle');
  ok(blattPunkt.rand.length === 0, 'kein Blatt läuft bei 360 px über seinen Rand',
     blattPunkt.rand.join(' | ') || 'alle innerhalb');
  const blattWort = blattPunkt.woerter;
  blattPunkt = blattPunkt.out;
  ok(blattWort.length === 0, 'dieselbe Sache heißt überall gleich, und niemand wird geduzt',
     [...new Set(blattWort)].join(' | ') || 'keine Abweichung');
  // ── Ein Kopf, ein Fuß [§C27] ──────────────────────────────────────
  // Blätter hatten fünf Köpfe, und geschlossen wurde nur durch Wischen oder
  // einen Knopf, den jedes Blatt selbst baute. Jedes Blatt mit Titel trägt
  // jetzt denselben Kopf aus Zeichenkachel, Titel und Unterzeile, jedes
  // Blatt den Knopf zum Schließen, und ein Fuß höchstens einen gefüllten
  // Knopf. Der Hinweis trägt seine Rolle, die Bestätigung nennt, was
  // verloren geht, und der zerstörende Knopf steht rechts.
  const kopfFuss = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const P = n => JSON.stringify(K('(players.find(p=>p.name===' + JSON.stringify(n) + ')||{}).id'));
    const mitKopf = [['Partie', 'showMatchDetail(matches[matches.length-1].id)'],
      ['Torjäger', "tab='awards';awPeriod='season';awSeasonId=null;showAward('scorer')"], ['Höchster Sieg', "showAward('biggest')"],
      ['Erzfeinde', "showAward('rivalry')"], ['Wochenkönig', "period='week';openTopList('periodKing')"],
      ['Rekord', 'showChronicle(CHRONICLES[0].id)'], ['Chronik', 'showDisziplin(SEASON_TITLES[0].id)'],
      ['Monatstafel', "showSeasonTable('2026-08')"], ['Liga-Chronik', 'showLigaChronik()'],
      ['Rangsystem', 'showRangSystem()'], ['Bilanzen', 'showPlayerH2HList(' + P('Leon') + ')'],
      ['Saisons', 'showPlayerSeasons(' + P('Leon') + ')'], ['Regeln', 'showPrestigeRegeln(' + P('Leon') + ')'],
      ['Auszeichnungen', 'showPlayerBadges(' + P('Jane') + ')'], ['Positionsverlauf', 'showPositionHistory(seasons[3].id)'],
      ['Spieler bearbeiten', 'showEditPlayer(' + P('Leon') + ')'], ['Partie bearbeiten', 'showEditMatch(matches[matches.length-1].id)'],
      ['Neuer Spieler', 'showAddPlayer()'],
      ['Awards im Profil', 'showPlayerAwards(' + P('Leon') + ',playerAwards(' + P('Leon') + ').filter(a=>a.rank===0))']];
    const f = [];
    for(const [name, auf] of mitKopf){
      try{ K('closeSheet(true)'); K(auf); }catch(e){ f.push(name + ': ' + e.message); continue; }
      const sh = document.getElementById('sheet');
      const kopf = sh.querySelector('.blatt-kopf');
      if(!kopf || !kopf.querySelector('.zk.g svg') || !kopf.querySelector('h3')) f.push(name + ': ohne Kopf');
      if(!sh.querySelector('#sheetZu')) f.push(name + ': ohne Schließen');
      sh.querySelectorAll('.blatt-fuss').forEach(fu => {
        const voll = [...fu.querySelectorAll('.btn')].filter(b => !b.classList.contains('ghost') && !b.classList.contains('gefahr'));
        if(voll.length > 1) f.push(name + ': ' + voll.length + ' gefüllte Knöpfe im Fuß');
      });
    }
    // Die Bühne im Award-Blatt einer Partie: Gesichter mit Größe, nicht als
    // Farbbalken über die ganze Breite.
    K("closeSheet(true);showAward('biggest')");
    const av = [...document.querySelectorAll('#sheet .buehne .av')];
    if(av.length !== 4 || av.some(a => a.getBoundingClientRect().width > 44)) f.push('Bühne: ' + av.map(a => Math.round(a.getBoundingClientRect().width)).join(','));
    // Schließen schließt.
    document.getElementById('sheetZu').click();
    await new Promise(r => setTimeout(r, 380));
    if(document.getElementById('sheet').classList.contains('show')) f.push('Schließen lässt das Blatt offen');
    // Der Hinweis und die Bestätigung.
    K("toast('Match gespeichert','ok',{sub:'Leon und Martin gewinnen 10:7',aktion:{label:'Rückgängig',fn:()=>{window.__rg=1}}})");
    const t = document.querySelector('.toast');
    if(!t.querySelector('.zk.gruen') || !/gewinnen/.test(t.textContent)) f.push('Hinweis ohne Rolle oder zweite Zeile');
    t.querySelector('.toast-akt').click();
    if(!window.__rg) f.push('Rückgängig führt nichts aus');
    const frage = K("bestaetigen({titel:'Partie löschen?',text:'Eine Partie',ja:'Löschen',gefahr:true,ic:'trash'})");
    await new Promise(r => setTimeout(r, 50));
    const d = document.querySelector('.dlg');
    const kn = d ? [...d.querySelectorAll('.btn')] : [];
    if(kn.length !== 2 || !kn[1].classList.contains('gefahr') || kn[0].textContent !== 'Abbrechen') f.push('Bestätigung: Knöpfe ' + kn.map(b => b.textContent).join('/'));
    if(kn[0]) kn[0].click();
    const antwort = await frage;
    if(antwort !== false) f.push('Abbrechen bestätigt');
    return f;
  });
  ok(kopfFuss.length === 0, 'jedes Blatt trägt denselben Kopf, Schließen und höchstens einen gefüllten Knopf',
     kopfFuss.slice(0, 5).join(' | ') || 'alle');

  // Jedes Award-Blatt, beide Zeiträume: ein Wert trägt seine Einheit
  // ausgeschrieben („6,5 /Sp.", „9,7 Gegen/Sp.", „4× POTD", „0 S · 3 Sp."),
  // eine Serie beginnt beim zweiten Ergebnis („1er Serie", „1er
  // Niederlagen"), eins steht in der Einzahl („1 Carries"), und die Spitze
  // heißt nicht „Best". Dazu dieselbe Zahl für dieselbe Überraschung: die
  // Kachel zeigte 71 %, die Chance der Gegenseite, Blatt und Liga 30 %. Und
  // die Liste des Underdog-Helden war nach Quote sortiert und zeigte die
  // Anzahl: Platz 5 stand mit 2× hinter Platz 2 mit 1×.
  const awBlatt = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const fehler = [];
    const KURZ = /\/Sp\.|Gegen\/|\bPOT[WD]\b|(^|\s)1 Carries\b|(^|\s)1er\b|\d S · |\bSp\.|\bBest ·/i;
    for(const p of ['season', 'week']){
      K("tab='awards';awView='awards';awPeriod='" + p + "';render()");
      for(const k of K('Object.keys(AWARD_META)')){
        K('closeSheet(true)'); K('showAward(' + JSON.stringify(k) + ')');
        const zeilen = document.getElementById('sheet').innerText.split('\n');
        zeilen.filter(z => KURZ.test(z)).forEach(z => fehler.push(p + ' ' + k + ': ' + z.trim()));
      }
      K('closeSheet(true)');
      const kachel = (document.querySelector('[data-award="upset"] .aw-t-val b') || {}).textContent;
      K("showAward('upset')");
      // Die Bühne nennt die Siegchance der Sieger [§C27].
      const blatt = (document.getElementById('sheet').innerText.match(/Siegchance (\d+)\s?%/) || [])[1];
      if(kachel && !(/^\d+\s%$/.test(kachel) && parseInt(kachel, 10) === +blatt)) fehler.push(p + ' Überraschung: Kachel ' + kachel + ', Blatt ' + blatt + ' %');
      K('closeSheet(true)');
      const ud = K("(awardRankings(awPeriod, awSeasonId).underdogList||[]).map(x=>x.pct)");
      if(ud.some((v, i) => i && v > ud[i-1])) fehler.push(p + ' Underdog-Held nicht nach Quote');
      K("showAward('underdog')");
      const udW = [...document.querySelectorAll('#sheet .aw-winner-val, #sheet .aw-li-val')].map(e => e.textContent.trim());
      if(ud.length && !udW.every(w => /^\d+\s%/.test(w))) fehler.push(p + ' Underdog-Held zeigt ' + udW.slice(0, 3).join(', '));
      K('closeSheet(true)');
    }
    // Neben den Siegern steht ihr Stand zuerst: „Stefan & Martin 8:10".
    K("period='season'; openTopList('periodUpset')");
    [...document.querySelectorAll('#sheet .aw-li-detail')].forEach(d => {
      const m = d.textContent.match(/^(\d+):(\d+)/);
      if(m && +m[1] < +m[2]) fehler.push('Überraschung: ' + d.textContent.trim());
    });
    // Wer im Profil einen Award auf Platz 1 trägt, steht auch im Blatt oben:
    // der Underdog-Held wertete im Profil die Anzahl, im Blatt die Quote,
    // und die Erzfeinde nannten im Blatt eine Rivalität, im Profil neun
    // Spieler aus vier gleichauf liegenden.
    K("awPeriod='season';awSeasonId=null;tab='awards';awView='awards';render()");
    const prof = K("(function(){ const o={}; activePlayers().forEach(p=>playerAwards(p.id).filter(a=>a.rank===0).forEach(a=>{ (o[a.key]=o[a.key]||[]).push(p.name); })); return o; })()");
    for(const k of K('Object.keys(AWARD_META)')){
      K('closeSheet(true)'); K('showAward(' + JSON.stringify(k) + ')');
      const sh = document.getElementById('sheet');
      // Die Namen einer Bühne stehen je Zeile einzeln [§C27].
      const buehne = t => [...t.querySelector('.buehne-n').childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' & ');
      let namen = [...sh.querySelectorAll('.aw-winner-name, .aw-winner-tied-name')].map(e => e.textContent.trim())
        .concat([...sh.querySelectorAll('.buehne-s')].map(buehne));
      if(k === 'rivalry') [...sh.querySelectorAll('.aw-li')].filter(r => r.querySelector('.aw-li-rank').textContent.trim() === '1.')
        .forEach(r => r.querySelectorAll('.aw-li-name').forEach(n => namen.push(n.textContent.replace(/^vs /i, '').trim())));
      if(k === 'upset' || k === 'biggest' || k === 'favoritenschreck')
        namen = [...sh.querySelectorAll('.buehne-s.sieg')].map(buehne);
      const blatt = [...new Set(namen.flatMap(n => n.split(' & ')).map(n => n.trim().toLowerCase()))].sort().join(',');
      const profil = [...new Set((prof[k] || []).map(n => n.toLowerCase()))].sort().join(',');
      if(blatt !== profil) fehler.push(k + ': Blatt ' + blatt + ' · Profil ' + profil);
    }
    K('closeSheet(true)');
    // Und in den letzten Spielen eines Duos und im Direkten Vergleich steht
    // der eigene Stand zuerst: neben dem roten Kreuz stand „10 : 8".
    const P = n => JSON.stringify(K('(players.find(p=>p.name===' + JSON.stringify(n) + ')||{}).id'));
    for(const auf of ['showTeam(' + P('Leo') + ',' + P('Maxi') + ')', 'showH2H(' + P('Leon') + ',' + P('Martin') + ')']){
      K('closeSheet(true)'); K(auf);
      document.querySelectorAll('#sheet .rrow[data-match]').forEach(r => {
        const m = r.textContent.match(/(\d+)\s*:\s*(\d+)\s*$/);
        // Nur die Zeilen mit Haken oder Kreuz; die Höhepunkte darüber tragen
        // ein eigenes Zeichen und ihren Stand ohnehin aus eigener Sicht.
        if(!m || !r.querySelector('polyline, path[d^="M6 6L18"]')) return;
        const sieg = !!r.querySelector('polyline');
        if(sieg !== (+m[1] > +m[2])) fehler.push(auf.slice(0, 8) + ': ' + (sieg ? 'Sieg ' : 'Niederlage ') + m[1] + ':' + m[2]);
      });
    }
    K("closeSheet(true); tab='ranking'; render()");
    return fehler;
  });
  ok(awBlatt.length === 0, 'jedes Award-Blatt nennt seine Einheit ganz, die Überraschung mit einer Zahl, den eigenen Stand zuerst und dieselbe Spitze wie das Profil',
     [...new Set(awBlatt)].slice(0, 6).join(' | ') || 'alle');
  // Der Feed legt nur, was zu sehen ist: rund siebzig Karten und 4600
  // Knoten kosteten beim Öffnen und bei jedem Zurück aus einem Story-Blatt
  // 110 bis 140 ms Layout. Breaking und die Karte des Tages sind
  // ausgenommen — ihr Schein liegt außerhalb der Fläche.
  const cv = await page.evaluate(async () => {
    const aus = document.getElementById('cv-aus'); if(aus) aus.disabled = true;
    window.__k.eval('closeSheet(true); openNewsFeed(); _newsFeedRest()');
    await new Promise(r => requestAnimationFrame(r));
    const karten = [...document.querySelectorAll('#sheet .nf-card')];
    const falsch = karten.filter(k => {
      const soll = (k.classList.contains('nf-brk') || k.classList.contains('nf-gross')) ? 'visible' : 'auto';
      return getComputedStyle(k).contentVisibility !== soll;
    }).map(k => k.className.split(' ').slice(0, 2).join('.'));
    window.__k.eval('closeSheet(true)');
    if(aus) aus.disabled = false;
    return {n: karten.length, falsch};
  });
  ok(cv.n > 20 && cv.falsch.length === 0,
     'der Feed legt Karten außerhalb des Bildschirms erst beim Hineinscrollen',
     cv.falsch.slice(0, 4).join(', ') || cv.n + ' Karten');
  // Die Beziehung unter den Wappen eines Story-Blatts sagt etwas: auf dem
  // Blatt einer Partie stand „in derselben Partie", auf der Karte einer
  // Partie „im selben Moment". Und die Wochenkarte nannte „20 an 4 Tagen"
  // direkt unter ihrem eigenen Satz „20 Spiele an 4 Tagen".
  const beziehung = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const fehler = [];
    const alle = K('getStoriesCache().map(s => ({id:s.id, t:(s.dataRef||{}).type, q:(s.dataRef||{}).quelle, m:!!(s.dataRef||{}).matchId}))');
    const ziel = alle.filter(x => x.t === 'spiel' || (x.t === 'sammel' && x.q === 'spiel' && x.m)).slice(0, 10)
      .concat(alle.filter(x => x.t === 'woche'));
    for(const x of ziel){
      K('closeSheet(true); openNewsDetail(' + JSON.stringify(x.id) + ')');
      // Ein Story-Blatt steht in #nd, nicht im Blatt-Stapel.
      const txt = (document.getElementById('nd') || {}).innerText || '';
      if(/in derselben Partie|im selben Moment/.test(txt)) fehler.push(x.id);
      if(x.t === 'woche' && /(Spiele|Partien) an \d+ Tag/.test(txt) && /Partien in dieser Woche/i.test(txt)) fehler.push(x.id + ' doppelt');
    }
    K('closeSheet(true); typeof closeNewsDetail === "function" && closeNewsDetail()');
    return {n: ziel.length, fehler};
  });
  ok(beziehung.n >= 3 && beziehung.fehler.length === 0,
     'ein Story-Blatt nennt eine Beziehung, die etwas sagt, und seine Zahl einmal',
     beziehung.fehler.join(', ') || beziehung.n + ' Blätter');
  // Das Blatt einer Serie zeigt den Stand ihrer Partie, nicht den von heute.
  // Unter „10 Pleiten nacheinander" stand „Letzte 10 Matches" mit dem Sieg,
  // der die Serie Stunden später beendet hat — und dieselbe Zahl als Band,
  // als Punktreihe und als Zeile.
  const serie = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const fehler = [];
    // Matchserien stehen jetzt in der gemeinsamen Partie-Karte. Ihre
    // Einzelblaetter bleiben als Legacy-Pfad pruefbar: die Roh-Snapshots
    // zeichnen, statt wegen korrekter Buendelung null Beispiele zu messen.
    const beispiele = K(`_cache._stories.filter(s => /^(loss_streak|win_streak|top_form)$/.test((s.dataRef||{}).type))
      .map(s => ({id:s.id, t:s.dataRef.type, mid:s.dataRef.matchId, html:_newsDetailBody(s)}))`);
    const nd = document.createElement('div');
    nd.style.width = '360px'; document.body.appendChild(nd);
    for(const {id,t,mid,html} of beispiele){
      nd.innerHTML = html;
      const punkte = [...nd.querySelectorAll('.nd-form-strip .nd-form-dot')];
      const letzter = punkte.length ? punkte[punkte.length - 1].classList.contains('w') : null;
      if(t === 'loss_streak' && letzter === true) fehler.push(id + ': Reihe endet mit Sieg');
      if(t === 'top_form' && letzter === false) fehler.push(id + ': Formkarte endet mit Pleite');
      if(/^(loss_streak|win_streak)$/.test(t)){
        const zeilen = nd.querySelector('.nd-pzl');
        const ende = zeilen && zeilen.lastElementChild;
        if(!ende || ende.dataset.mid !== mid) fehler.push(id + ': falsches Endspiel');
        if(ende && (ende.classList.contains('w') !== (t === 'win_streak')))
          fehler.push(id + ': falsche Richtung am Ende');
      }
      if(/in Folge<\/div>/.test(nd.innerHTML) && /× (Niederlage|Sieg) in Folge/.test(nd.innerText)) fehler.push(id + ': Zahl dreimal');
    }
    nd.remove();
    return {n: beispiele.length, fehler};
  });
  ok(serie.n > 0 && serie.fehler.length === 0,
     'das Blatt einer Serie zeigt den Stand ihrer Partie und die Zahl einmal',
     serie.fehler.slice(0, 3).join(' | ') || serie.n + ' Blätter');
  // Das Blatt einer Partie nennt ihre Sieger und die Siegchance aus der
  // Elo-Bahn, und jeder Spieler steht bei den Auszeichnungen einmal. Es
  // stand „Team A gewinnt", und fünf Marken zweier Spieler als fünf Karten.
  const partie = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const ids = K('matches.slice(-40).map(m=>m.id)');
    const fehler = [];
    let mitMarken = 0, eloAnalysen = 0;
    for(const mid of ids){
      K('closeSheet(true);showMatchDetail(' + JSON.stringify(mid) + ')');
      const soll = K(`(function(){ const m=matches.find(x=>x.id===${JSON.stringify(mid)});
        const h=getHistoryByMatchId().get(m.id); const e=h&&h.expA!=null?h.expA:m.exp_a;
        return {namen:(m.winner==='A'?[m.a1,m.a2]:[m.b1,m.b2]).map(pname),
          pct:Math.max(1,Math.round((m.winner==='A'?e:1-e)*100))}; })()`);
      // Sieger und Siegchance stehen unter dem Stand auf der Bühne [§C27].
      const sub = (document.querySelector('#sheet .buehne-zeile') || {}).textContent || '';
      if(/Team [AB]/.test(sub) || !soll.namen.every(n => sub.includes(n)) || !sub.includes(soll.pct + ' %'))
        fehler.push(sub + ' / ' + soll.pct);
      const zeilen = [...document.querySelectorAll('#sheet .rrow .rname')].map(e => e.textContent.trim());
      if(zeilen.length) mitMarken++;
      if(new Set(zeilen).size !== zeilen.length) fehler.push('doppelt: ' + zeilen.join(','));
      // Die Elo-Analyse zeigt die genaue Rechnung: oben der ungerundete Wert,
      // die Zeilen darunter ergeben ihn, und gerundet ist er, was verbucht
      // wurde. Posten unter 0,1 fehlten, und eine Zeile „Rundung" glich die
      // große Zahl an den verbuchten Wert an und versteckte die Rechnung.
      const knopf = document.getElementById('showBreakdownBtn');
      if(knopf){
        knopf.click();
        const verbucht = K(`(getHistoryByMatchId().get(${JSON.stringify(mid)})||{}).deltas||{}`);
        const genau = K(`(()=>{const b=matchBreakdown(${JSON.stringify(mid)}),o={};Object.keys(b).forEach(k=>o[k]=b[k].finalDelta);return o;})()`);
        const zahl = t => Number(t.replace(',', '.').replace('\u2212', '-'));
        [...document.querySelectorAll('#sheet .ea-spieler')].forEach((el, i) => {
          const oben = Number(el.querySelector('.ea-summe').dataset.elo);
          const posten = [...el.querySelectorAll('.ea-wert')].map(w => zahl(w.textContent));
          const summe = posten.reduce((x, y) => x + y, 0);
          const pid = K(`(()=>{const m=matches.find(x=>x.id===${JSON.stringify(mid)});return [m.a1,m.a2,m.b1,m.b2][${i}]})()`);
          if(Math.abs(oben - genau[pid]) > 1e-9) fehler.push(mid + ': oben ' + oben + ', gerechnet ' + genau[pid]);
          if(/Rundung/.test(el.textContent)) fehler.push(mid + ': Zeile Rundung');
          if(!el.querySelector('.ea-heute') && verbucht[pid] !== undefined && Math.round(oben) !== verbucht[pid])
            fehler.push(mid + ': gerundet ' + Math.round(oben) + ', verbucht ' + verbucht[pid]);
          if(Math.abs(summe - oben) > .005 * posten.length + 1e-9)
            fehler.push(mid + ': Zeilen ' + summe.toFixed(2) + ', oben ' + oben);
          eloAnalysen++;
        });
      }
    }
    // Und ein Name in der Elo-Liste führt ins Profil.
    K('closeSheet(true);showMatchDetail(matches[matches.length-1].id)');
    const zeile = document.querySelector('#sheet [data-md-spieler]');
    let profil = false;
    if(zeile){ zeile.click(); await new Promise(r => setTimeout(r, 700));
      profil = !!document.querySelector('#sheet .pp-root'); }
    K('closeSheet(true)');
    return {fehler, mitMarken, profil, eloAnalysen};
  });
  ok(partie.profil, 'ein Name im Blatt einer Partie führt ins Profil');
  ok(partie.fehler.length === 0 && partie.mitMarken > 0 && partie.eloAnalysen === 4 * 40,
     'das Blatt einer Partie nennt Sieger und Siegchance und jeden Spieler einmal; die Elo-Analyse zeigt oben den genauen Wert, ihre Zeilen ergeben ihn, und gerundet ist er das verbuchte Delta',
     partie.fehler.slice(0,3).join(' | ') || partie.mitMarken + ' Partien mit Auszeichnungen, ' + partie.eloAnalysen + ' Analysen');
  const reiterPunkt = reiter.filter(r => r.punkt.length).map(r => r.name + ': ' + r.punkt.join(' '));
  ok(reiterPunkt.length + blattPunkt.length === 0,
     'keine Dezimalzahl mit Punkt in einem Reiter oder Blatt',
     reiterPunkt.concat(blattPunkt).join(' | ') || 'alle mit Komma');
  ok(reiter.find(r => r.name === 'Match').fab === 'none'
     && reiter.find(r => r.name === 'Liga').fab !== 'none',
     'der Knopf „Match eintragen" fehlt nur auf der Match-Seite',
     reiter.map(r => r.name + ':' + r.fab).join(' '));
  // ── Die Meisterbühne [§C31] bei 360 px ─────────────────────────────
  // Podest, Titelrennen, Team der Saison, Chronik und die Zeichen der Titel
  // stehen auf der Karte des Monatsabschlusses; Titelrennen, Tage vorn und
  // die Saison des Meisters im Saison-Rückblick, den ein Tippen auf die
  // Karte öffnet. Gemessen wird, dass nichts davon über den Innenrand läuft,
  // dass der Strahlenkranz hinter dem Podest liegt und nicht davor, und dass
  // Kranz und Linien bei Bewegungsruhe stillstehen.
  await page.setViewportSize({width:360, height:780});
  const meisterMess = async () => page.evaluate(() => window.__k.eval(`(()=>{
    const sid = '2026-07', se = seasons.find(x => x.id === sid), top = JSON.parse(se.top_elo);
    const drei = top.slice(0, 3).map(x => x.id), t = seasonTeamOf(sid), aw = seasonTitles(sid).awarded;
    const ende = seasonEnd(sid).getTime();
    const s = {id:'season_recap_' + sid, cat:'season', ic:'crown', title:'x', desc:'x',
      when:ende + 1000, prio:92,
      dataRef:{type:'season_recap', sid, championId:top[0].id, championElo:top[0].elo, topElo:top, fakten:{},
        team:{pids:[t[0], t[1]], elo:120, w:9, l:4},
        chronik:{eintraege:aw.length, traeger:3, spitze:drei.map(pid => ({pid, n:2})), erstlinge:[]},
        zeichen:rcpZeichenZuege(rcpLaufbahnDaten(ende, ende + 1000))}};
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0;width:328px';
    host.innerHTML = '<div class="nf-wrap">' + _newsCardHtmlM2(s, false, false, '') + '</div>'
      + '<div data-probe="rueckblick" style="width:328px"><div class="rcp-block">' + saisonRennenHtml(sid, drei) + '</div>'
      + '<div class="rcp-block">' + saisonSpitzeHtml(sid, drei) + '</div>'
      + '<div class="rcp-block">' + saisonZellenHtml(sid, drei[0]) + '</div></div>';
    document.body.appendChild(host);
    const raus = [];
    [host.querySelector('.nf-card'), host.querySelector('[data-probe]')].forEach(box => {
      if(!box) { raus.push('fehlt'); return; }
      const b = box.getBoundingClientRect();
      box.querySelectorAll('.pod-karte, .srn-svg, .srn-band, .srn-leg, .srn-t, .srn-z, .nf-zb, .nf-mb-f, .ni-z').forEach(e => {
        const r = e.getBoundingClientRect();
        if(r.left < b.left - 0.5 || r.right > b.right + 0.5) raus.push(e.className.baseVal || e.className);
      });
    });
    const kranz = host.querySelector('.nf-ms-strahl'), linie = host.querySelector('.srn-l.gold');
    const tage = host.querySelector('.srn-t .b i');
    const out = {raus, kranz:kranz ? getComputedStyle(kranz).animationName : 'fehlt',
      hinten:kranz ? getComputedStyle(kranz).zIndex : 'fehlt',
      linie:linie ? getComputedStyle(linie).animationName : 'fehlt',
      tage:tage ? getComputedStyle(tage).animationName : 'fehlt',
      felder:host.querySelectorAll('.nf-mb-f').length};
    host.remove(); return out;
  })()`));
  const mb = await meisterMess();
  ok(mb.raus.length === 0, 'die Meisterbühne bleibt bei 360 px in Karte und Blatt', mb.raus.join(', '));
  ok(mb.felder === 2, 'die Karte trägt Team der Saison und Chronik', mb.felder);
  ok(mb.hinten === '-1' && mb.kranz !== 'none' && mb.linie !== 'none' && mb.tage !== 'none'
     && mb.kranz !== 'fehlt' && mb.linie !== 'fehlt' && mb.tage !== 'fehlt',
     'der Strahlenkranz liegt hinter dem Podest, Kranz und Linien bewegen sich', JSON.stringify(mb));
  await page.emulateMedia({reducedMotion: 'reduce'});
  const mbRuhig = await meisterMess();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(mbRuhig.kranz === 'none' && mbRuhig.linie === 'none' && mbRuhig.tage === 'none',
     'bei prefers-reduced-motion steht die Meisterbühne still', JSON.stringify(mbRuhig));
  // Ein Tippen auf die Karte öffnet den Saison-Rückblick, kein eigenes
  // Blatt: das zeigte Podest, Titelrennen und Tage vorn ein zweites Mal, und
  // vom Blatt führte kein Weg zum Rückblick [§C31].
  const tipp = JSON.parse(await K(`(async()=>{
    closeSheet(true);
    const sid = '2026-07', top = JSON.parse(seasons.find(x => x.id === sid).top_elo);
    const s = {id:'season_recap_' + sid, cat:'season', ic:'crown', title:'x', desc:'x',
      when:new Date(2026, 7, 1).getTime(), prio:92,
      dataRef:{type:'season_recap', sid, championId:top[0].id, championElo:top[0].elo, topElo:top, fakten:{}}};
    _cache._stories = [s].concat((_cache._stories || []).filter(x => x.id !== s.id));
    _cache._consolFrom = null;
    openNewsDetail(s.id);
    await new Promise(r => setTimeout(r, 450));
    const sheet = document.getElementById('sheet'), nd = document.getElementById('ndBg');
    const out = {offen:sheet.classList.contains('show'), rueckblick:!!sheet.querySelector('#closeRecapBtn'),
      titel:(sheet.querySelector('.rcp-kopf, h2, .rcp-titel') || {}).textContent || '',
      blatt:!!(nd && nd.classList.contains('show'))};
    // Erst weiter, wenn das Blatt zugeschoben und leer ist: die Suche nach
    // Filtern darunter liest das ganze Dokument.
    closeSheet(true);
    for(let i = 0; i < 20 && sheet.innerHTML; i++) await new Promise(r => setTimeout(r, 50));
    return JSON.stringify(out);
  })()`));
  ok(tipp.offen && tipp.rueckblick && !tipp.blatt,
     'ein Tippen auf den Monatsabschluss öffnet den Saison-Rückblick und kein Blatt', JSON.stringify(tipp));

  // ── Kein Filter über dem Zeichen [§C30] ─────────────────────────────
  // Jedes Wappen trug `filter: drop-shadow(…)` am ganzen `svg.ins`, und
  // Safari rechnet ein SVG unter einem CSS-Filter in CSS-Pixeln und zieht
  // es hoch: auf dem Telefon standen alle Insignien mit Treppenkanten da,
  // wie ausgeschnitten. Dasselbe gilt für eine Ebene, die skaliert. Gesucht
  // wird über Liga, Positionen, Awards, Rekorde, Profil, Laufbahn und Feed;
  // ausgenommen ist nur das Entfärben einer Stufe, die niemand trägt.
  const _filterFunde = JSON.parse(await K(`(async()=>{
const warte=ms=>new Promise(r=>setTimeout(r,ms));
const funde={};
const pruef=(wo)=>{
  // Bilder direkt und über <use> verwiesene Gruppen: gezählt wird das Element, das sichtbar zeichnet
  const ziele=[...document.querySelectorAll('image, use')].filter(e=>{const h=e.getAttribute('href')||'';return e.tagName==='image'?(h.startsWith('data:image/svg')||h.startsWith('blob:')):/^#ins/.test(h);});
  ziele.forEach(im=>{let e=im.parentElement;const k=[];while(e&&e!==document.documentElement){const cs=getComputedStyle(e);
    const f=e.getAttribute&&e.getAttribute('filter');
    if(cs.filter&&cs.filter!=='none'&&!/grayscale/.test(cs.filter))k.push((e.className.baseVal??e.className)+':'+cs.filter.slice(0,30));
    if(f)k.push((e.className.baseVal??e.className)+':attr '+f);
    const m=cs.transform; if(m&&m.startsWith('matrix(')){const a=parseFloat(m.slice(7)); if(Math.abs(a-1)>.01&&!/nd-bg|nd |sheet/.test(e.className))k.push((e.className.baseVal??e.className)+':scale '+a);}
    e=e.parentElement;}
    if(k.length){const key=wo+' | '+k.join(' < ');funde[key]=(funde[key]||0)+1;}});
};
tab='ranking'; render(); await warte(50); pruef('liga'); tab='positions'; render(); await warte(50); pruef('positionen');
tab='awards'; awView='awards'; render(); await warte(50); pruef('awards');
awView='rekorde'; render(); await warte(50); pruef('rekorde');
const pid=players.find(p=>p.name==='Martin').id;
showPlayer(pid); await warte(900); pruef('profil');
try{ showLaufbahn&&showLaufbahn(pid);}catch(e){}
await warte(600); pruef('laufbahn');
closeSheet(true); openNewsFeed(); _newsFeedRest(); await warte(600); pruef('feed');
return JSON.stringify(funde,null,1);
})()
`));
  ok(Object.keys(_filterFunde).length === 0,
     'kein Insignium liegt unter einem Filter oder einer Skalierung',
     Object.keys(_filterFunde).slice(0, 4).join(' · '));
  await page.evaluate(() => { try { window.__k.eval('closeSheet(true)'); } catch(e){} });
  // Und groß ist die Zeichnung Vektor, kein Bild: ein `<image>` mit einer
  // SVG-Datei rastert Safari in seinen 170 Einheiten, und im Profilkopf
  // wurden sie auf 270 px gezogen [§C30]. Klein bleibt sie Bild — ein
  // Verweis klont die ganze Zeichnung, und der Feed öffnete damit doppelt
  // so langsam. Gemessen wird beides: der Profilkopf und die Laufbahn ohne
  // Bild, die Ranglistenzeile mit.
  const _vektor = await page.evaluate(async () => {
    const K = window.__k.eval;
    const w = ms => new Promise(r => setTimeout(r, ms));
    K("tab='ranking'; render()");
    const bildIn = el => { let n = 0; el.querySelectorAll('use').forEach(u => {
      const z = document.querySelector(u.getAttribute('href'));
      if(z && z.querySelector('image[href^="data:image/svg"], image[href^="blob:"]')) n++; });
      return n + el.querySelectorAll('image[href^="data:image/svg"], image[href^="blob:"]').length; };
    const zeile = bildIn(document.querySelector('#app .rrow') || document.body);
    const pid = K("players.find(p=>p.name==='Martin').id");
    K('showPlayer(' + JSON.stringify(pid) + ')'); await w(300);
    const kopf = document.querySelector('#sheet .pp-av-wrap');
    const profil = kopf ? bildIn(kopf) : -1;
    const vektor = kopf ? kopf.querySelectorAll('use[href^="#izg"]').length : 0;
    K('closeSheet(true)'); K('showLaufbahn(' + JSON.stringify(pid) + ')'); await w(300);
    // Die Karte in der Mitte der Vitrine ist groß und Vektor, die am Rand
    // stehen klein und als Bild; die Felder der ganzen Leiter sind rund 40 px
    // und Bild — dieselbe Grenze wie beim Wappen.
    const fk = document.querySelector('#lbLeiter .lb-k.fokus');
    const lb = fk ? bildIn(fk) : -1;
    const lbRand = bildIn(document.getElementById('lbLeiter'));
    const lbFelder = bildIn(document.getElementById('lbAlle'));
    K('closeSheet(true)');
    return {zeile, profil, vektor, lb, lbRand, lbFelder};
  });
  ok(_vektor.profil === 0 && _vektor.vektor > 0 && _vektor.lb === 0,
     'groß ist jedes Insignium eine Vektorzeichnung, kein eingebettetes Bild',
     JSON.stringify(_vektor));
  ok(_vektor.zeile > 0 && _vektor.lbFelder === 21 && _vektor.lbRand >= 5, 'klein bleibt es ein Bild, damit Liste, Feed, der Rand der Vitrine und die ganze Leiter schnell bleiben',
     JSON.stringify(_vektor));
  // Die Aura [§C36]: im Profilkopf bewegt, und zwar so, dass nur die
  // Grafikkarte arbeitet — höchstens drei Ebenen, jede ein Bild, und ihre
  // Bewegung ändert nur `transform` und Deckkraft. Ein Filter oder eine
  // Bewegung INNERHALB des SVG hiesse, die Unschärfe der Strahlen in jedem
  // Bild neu zu rechnen. Und sie steht dort genau einmal: nicht noch ein
  // zweites Mal still im Zeichen dahinter.
  const _aura = await page.evaluate(async () => {
    const K = window.__k.eval;
    const w = ms => new Promise(r => setTimeout(r, ms));
    const pid = K("(players.slice().sort((a,b)=>meisterTitel(b.id)-meisterTitel(a.id))[0]||{}).id");
    K('closeSheet(true); showPlayer(' + JSON.stringify(pid) + ')'); await w(300);
    const kopf = document.querySelector('#sheet .pp-av-wrap');
    const aura = kopf ? kopf.querySelectorAll('.aura') : [];
    const ebenen = aura[0] ? [...aura[0].children] : [];
    const imZeichen = kopf ? kopf.querySelectorAll('svg.ins image.aura-b').length : -1;
    const namen = ebenen.map(e => getComputedStyle(e).animationName).filter(n => n && n !== 'none');
    const fremd = [];
    for(const sh of document.styleSheets){ let r; try { r = sh.cssRules; } catch(e){ continue; }
      for(const k of r) if(k.type === CSSRule.KEYFRAMES_RULE && namen.includes(k.name))
        for(const f of k.cssRules) for(const prop of f.style)
          if(!/^(transform|opacity)$/.test(prop)) fremd.push(k.name + ':' + prop); }
    const filter = ebenen.filter(e => getComputedStyle(e).filter !== 'none').length;
    K('closeSheet(true)');
    return {titel:K('meisterTitel(' + JSON.stringify(pid) + ')'), auren:aura.length, ebenen:ebenen.length,
            bilder:ebenen.every(e => e.tagName === 'IMG'), imZeichen, namen, fremd, filter};
  });
  ok(_aura.titel > 0 && _aura.auren === 1 && _aura.ebenen >= 2 && _aura.ebenen <= 3 && _aura.bilder
     && _aura.imZeichen === 0 && _aura.namen.length >= 2 && _aura.fremd.length === 0 && _aura.filter === 0,
     'die Aura im Profilkopf steht einmal, in höchstens drei Bildebenen, und bewegt nur transform und Deckkraft',
     JSON.stringify(_aura));
  // Und das Bild steht im Dokument unter einer kurzen Adresse. Als Daten-URL
  // trug jedes Bild rund 190 Kilobyte, und jedes der rund 240 `<use>` im
  // Feed klonte sie mit: gemessen brauchte das Öffnen des Feeds im Median
  // 150 ms statt 46. Geprüft wird jedes Bild im Topf nach dem Öffnen.
  const _bildAdr = await page.evaluate(async () => {
    const K = window.__k.eval;
    K('closeSheet(true); openNewsFeed(); _newsFeedRest()');
    await new Promise(r => setTimeout(r, 300));
    const l = [...document.querySelectorAll('#insDefs image, #sheet image, #app image')]
      .map(b => (b.getAttribute('href') || '').length);
    K('closeSheet(true)');
    return {n: l.length, lang: l.filter(x => x > 300).length, max: Math.max(0, ...l)};
  });
  ok(_bildAdr.n > 0 && _bildAdr.lang === 0,
     'jedes Wappenbild im Dokument steht unter einer kurzen Adresse',
     _bildAdr.n + ' Bilder, ' + _bildAdr.lang + ' lang, längste ' + _bildAdr.max + ' Zeichen');

  console.log('\n═══ EINBLICKE, SIEGCHANCE, VERGLEICH UND RÜCKBLICKE ═══');
  await page.setViewportSize({width:360, height:780});
  // ── Der Einblick ist eine Zeile, die aufklappt ────────────────────
  //    Rollen-Landkarte und Netz der Duos nahmen als volle
  //    Karte den halben Bildschirm über der Rangliste. Zu ist der Einblick
  //    eine Zeile ohne Inhalt — gezeichnet wird erst beim Aufklappen —, auf
  //    bleibt er beim Neuzeichnen im selben Reiter, und ein neuer Reiter
  //    beginnt geschlossen. Offen liegt kein Text auf einem anderen.
  const einblick = await page.evaluate(async (pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    const out = {};
    const gezeichnet = () => new Promise((resolve, reject) => {
      const main = document.getElementById('main');
      if(main.getAttribute('aria-busy') !== 'true'){ resolve(); return; }
      let timer;
      const horch = new MutationObserver(() => {
        if(main.getAttribute('aria-busy') === 'true') return;
        clearTimeout(timer); horch.disconnect(); resolve();
      });
      horch.observe(main, {childList:true, attributes:true, attributeFilter:['aria-busy']});
      timer = setTimeout(() => { horch.disconnect(); reject(new Error('Der Reiterwechsel wird nicht fertig.')); }, 8000);
    });
    // Im Liga-Reiter gibt es keinen: das Titelrennen war dieselbe Frage wie
    // der Positionsverlauf darunter.
    K(`closeSheet(true); tab='ranking'; period='season'; render(); 'x'`);
    out.liga = document.querySelectorAll('#main [data-einblick]').length;
    for(const [t, key] of [['positions', 'rollen'], ['teams', 'netz']]){
      K(`closeSheet(true); tab='${t}'; period='season'; einblickOffen=''; render(); 'x'`);
      const box = document.querySelector('#main [data-einblick="' + key + '"]');
      if(!box){ out[key] = {fehlt:true}; continue; }
      const zu = {h: box.getBoundingClientRect().height, leer: !box.querySelector('.einblick-i').innerHTML.trim()};
      box.querySelector('.einblick-k').click();
      document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
      const i = box.querySelector('.einblick-i');
      const auf = {h: i.getBoundingClientRect().height, bild: !!i.querySelector('svg'),
                   aria: box.querySelector('.einblick-k').getAttribute('aria-expanded'), fehler: pruefen(box).fehler};
      K('render(); "x"');
      const nachRender = !!document.querySelector('#main [data-einblick="' + key + '"].auf svg');
      document.querySelector('.bnav [data-nav="history"], [data-nav="history"]').click();
      await gezeichnet();
      document.querySelector('[data-nav="' + t + '"]').click();
      await gezeichnet();
      const nachTab = !document.querySelector('#main [data-einblick="' + key + '"].auf');
      out[key] = {zu, auf, nachRender, nachTab};
    }
    return out;
  }, PRUEFEN.toString());
  const _eb = [einblick.rollen, einblick.netz];
  ok(einblick.liga === 0 && _eb.every(x => x && !x.fehlt && x.zu.h <= 46 && x.zu.leer),
     'Rollen-Landkarte und Netz der Duos stehen zu als schmale Zeile ohne Inhalt, der Liga-Reiter trägt keinen',
     JSON.stringify(Object.fromEntries(Object.entries(einblick).map(([k, v]) => [k, v.zu]))));
  ok(_eb.every(x => x.auf && x.auf.bild && x.auf.h > 120 && x.auf.aria === 'true' && x.auf.fehler.length === 0),
     'aufgeklappt zeigen sie ihre Grafik, und kein Text liegt auf einem anderen oder ragt hinaus',
     _eb.map(x => x.auf ? x.auf.fehler.slice(0, 2).join(' | ') || Math.round(x.auf.h) + ' px' : 'fehlt').join(' · '));
  ok(_eb.every(x => x.nachRender && x.nachTab),
     'ein Neuzeichnen im selben Reiter klappt sie nicht zu, ein Reiterwechsel schon',
     JSON.stringify(_eb.map(x => [x.nachRender, x.nachTab])));

  // ── Die Ruheständler stehen am Ende, zu [§C40] ─────────────────────
  //    Unter Gesamt, unter den Positionen und unter den Teams eine Zeile,
  //    die aufklappt. Darüber steht er nicht mehr: die Liste ist die der
  //    aktiven Liga. Aufgeklappt läuft keine Zeile über den Rand, und ein
  //    zweiter Einblick im selben Reiter klappt den ersten nicht zu — mit
  //    EINEM gemerkten Wert stand die Rollen-Landkarte nach dem nächsten
  //    Neuzeichnen geschlossen da.
  const ruhe = await page.evaluate(async (pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    const M = K("players.find(p => p.name === 'Martin').id");
    // Wie der Knopf: der Karriere-Teil wird vor dem Setzen gerechnet [§C40].
    K(`(() => { const p = pmap()['${M}'], t = Date.parse('2026-08-26T19:30:00Z'), k = _ruheKarriereBauen(p.id);
      p.retired_at = new Date(t).toISOString(); p.retired_stand = {v:RUHE_STAND_FASSUNG, t, karriere:k, abschluss:null};
      invalidateCache(); })(); 'x'`);
    const W = document.documentElement.clientWidth, out = {};
    for(const [name, setz, key] of [['gesamt', "tab='ranking';period='all'", 'ruhe_liga'],
        ['positionen', "tab='positions';period='season';rankMetric='drive'", 'ruhe_pos'],
        ['teams', "tab='teams';period='season'", 'ruhe_teams']]){
      K(`closeSheet(true); ${setz}; einblickOffen=''; render(); 'x'`);
      const box = document.querySelector('#main [data-einblick="' + key + '"]');
      if(!box){ out[name] = {fehlt:true}; continue; }
      const ausserhalb = [...document.querySelectorAll('#main [data-detail="' + M + '"], #main [data-team*="' + M + '"]')]
        .filter(e => !box.contains(e)).length;
      const leer = !box.querySelector('.einblick-i').innerHTML.trim();
      box.querySelector('.einblick-k').click();
      const i = box.querySelector('.einblick-i');
      const drin = i.querySelectorAll('[data-detail="' + M + '"], [data-team*="' + M + '"]').length;
      const raus = [...i.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect();
        return r.width && (r.right > W + 1 || r.left < -1); }).length;
      const ohneRang = !i.querySelector('.rrow .pos') && !i.querySelector('.tm-top');
      out[name] = {ausserhalb, leer, drin, raus, ohneRang, fehler: pruefen(box).fehler.slice(0, 2)};
    }
    K(`closeSheet(true); tab='positions'; einblickOffen='rollen ruhe_pos'; render(); 'x'`);
    out.beide = document.querySelectorAll('#main .einblick.auf').length;
    // Der Abschied: ein langes Blatt aus dem Baukasten der Rückblicke. Kein
    // Teil läuft über den Rand, kein Text endet mit „…", und die Karte im
    // Feed trägt dieselbe Bühne.
    K(`closeSheet(true); zeigeAbschied('${M}'); 'x'`);
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    const sh = document.getElementById('sheet');
    out.abschied = {
      abschnitte: [...sh.querySelectorAll('.rcp-section')].map(e => e.textContent.trim().replace(/\d+$/, '').trim()),
      raus: [...sh.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1); }).length,
      kurz: [...sh.querySelectorAll('.rcp-zeile-s, .rcp-aw-name, .rcp-aw-val, .ab-duo-t b')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent).slice(0, 3),
      gold: !!sh.querySelector('.rcp-label:not(.metall)'),
      fehler: pruefen(sh.querySelector('.ab-buehne')).fehler.slice(0, 2)};
    K(`closeSheet(true); _cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when)); openNewsFeed(); _newsFeedRest(); 'x'`);
    const karte = document.querySelector('.nf-card .nf-abschied');
    const kc = karte && karte.closest('.nf-card');
    out.karte = kc ? {brk: kc.classList.contains('nf-brk') || !!kc.querySelector('.nf-brk-band'),
      raus: [...kc.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(), k = kc.getBoundingClientRect();
        return r.width && (r.right > k.right + 1 || r.left < k.left - 1); }).length} : null;
    K('closeSheet(true); "x"');
    K(`pmap()['${M}'].retired_at = null; pmap()['${M}'].retired_stand = null; einblickOffen=''; invalidateCache(); tab='ranking'; period='season'; render(); 'x'`);
    return out;
  }, PRUEFEN.toString());
  const _ru = [ruhe.gesamt, ruhe.positionen, ruhe.teams];
  ok(_ru.every(x => x && !x.fehlt && x.ausserhalb === 0 && x.leer && x.drin > 0),
     'Gesamt, Positionen und Teams zeigen den Ruheständler nur in der Zeile am Ende, zu und ohne Inhalt',
     JSON.stringify(ruhe));
  ok(_ru.every(x => x && x.raus === 0 && x.ohneRang && !(x.fehler || []).length),
     'aufgeklappt läuft keine Zeile bei 360 px über den Rand, und keine trägt einen Platz',
     JSON.stringify(_ru.map(x => x && [x.raus, x.ohneRang, x.fehler])));
  ok(ruhe.beide === 2, 'zwei Einblicke im selben Reiter bleiben beide offen', String(ruhe.beide));
  const _ab = ruhe.abschied || {};
  ok(['Saison für Saison', 'Besondere Momente', 'Die besten Partner', 'Gegenüber', 'Die Stärken',
      'Rekorde beim Abschied', 'Auszeichnungen'].every(t => (_ab.abschnitte || []).includes(t)),
     'der Abschied erzählt die Laufbahn: Saisons, Momente, Partner, Gegner, Stärken, Rekorde, Auszeichnungen',
     (_ab.abschnitte || []).join(' · '));
  ok(_ab.raus === 0 && !(_ab.kurz || []).length && !(_ab.fehler || []).length && !_ab.gold,
     'bei 360 px läuft im Abschied nichts über den Rand, nichts wird gekürzt, und die Marke ist Metall statt Gold',
     JSON.stringify({raus:_ab.raus, kurz:_ab.kurz, fehler:_ab.fehler, gold:_ab.gold}));
  ok(ruhe.karte && ruhe.karte.brk && ruhe.karte.raus === 0,
     'im Feed steht das Karriereende als Breaking-Karte mit seiner Bühne, nichts ragt hinaus', JSON.stringify(ruhe.karte));

  // ── Entfernen heißt bei Partien nicht Löschen [§C40] ──────────────
  //    „Komplett löschen" ließ in jeder Partie ein Fragezeichen zurück. Mit
  //    Partien bietet das Blatt das Karriereende und das Ausblenden an, und
  //    wer schon aufgehört hat, bekommt das Karriereende nicht ein zweites Mal.
  const weg = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const sh = document.getElementById('sheet');
    const blick = async (pid) => {
      K(`closeSheet(true); showPlayer('${pid}'); 'x'`);
      for(let t = 0; t < 40 && !document.getElementById('delPlayer'); t++) await new Promise(r => setTimeout(r, 50));
      document.getElementById('delPlayer').click();
      for(let t = 0; t < 20 && !sh.querySelector('.pp-weg'); t++) await new Promise(r => setTimeout(r, 50));
      document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
      const W = window.innerWidth;
      return {weg: !!sh.querySelector('.pp-weg'), loeschen: !!sh.querySelector('#deletePlayerBtn'),
        ende: !!sh.querySelector('#retirePlayerBtn'), aus: !!sh.querySelector('#hidePlayerBtn'),
        raus: [...sh.querySelectorAll('.pp-weg *')].filter(e => { const r = e.getBoundingClientRect();
          return r.width && (r.right > W + 1 || r.left < -1); }).length};
    };
    const pid = K('players.find(p => matches.some(m => [m.a1,m.a2,m.b1,m.b2].includes(p.id))).id');
    const aktiv = await blick(pid);
    // Wie der Knopf: der Karriere-Teil wird vor dem Setzen gerechnet [§C40].
    K(`(() => { const p = pmap()['${pid}'], t = Date.now() - 864e5, k = _ruheKarriereBauen(p.id);
      p.retired_at = new Date(t).toISOString(); p.retired_stand = {v:RUHE_STAND_FASSUNG, t, karriere:k, abschluss:null};
      invalidateCache(); })(); 'x'`);
    const ruhend = await blick(pid);
    K(`closeSheet(true); pmap()['${pid}'].retired_at = null; pmap()['${pid}'].retired_stand = null; invalidateCache(); 'x'`);
    return {aktiv, ruhend};
  });
  ok(weg.aktiv.weg && !weg.aktiv.loeschen && weg.aktiv.ende && weg.aktiv.aus && weg.aktiv.raus === 0
     && weg.ruhend.weg && !weg.ruhend.loeschen && !weg.ruhend.ende && weg.ruhend.aus,
     'wer Partien hat, wird nicht gelöscht: das Blatt bietet Karriereende und Ausblenden, ein Ruheständler nur das Ausblenden',
     JSON.stringify(weg));

  // ── Keine Partie nach dem Karriereende [§C40] ─────────────────────
  //    Das Bearbeiten einer Partie bot jeden Spieler an. Wer vor ihr
  //    aufgehört hat, steht nicht zur Wahl; wer schon in ihr steht, bleibt
  //    wählbar, und vor dem Karriereende gehört er dazu.
  const bearb = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const r = JSON.parse(K(`(() => {
      const ms = matches.slice().sort((a,b) => mts(a) - mts(b));
      const mitte = mts(ms[Math.floor(ms.length / 2)]);
      const p = players.find(x => ms.some(m => mts(m) > mitte && [m.a1,m.a2,m.b1,m.b2].includes(x.id)));
      p.retired_at = new Date(mitte).toISOString(); invalidateCache();
      const ohne = ms.find(m => mts(m) > mitte && ![m.a1,m.a2,m.b1,m.b2].includes(p.id));
      const mit = ms.find(m => mts(m) > mitte && [m.a1,m.a2,m.b1,m.b2].includes(p.id));
      const frueh = ms.find(m => mts(m) < mitte && ![m.a1,m.a2,m.b1,m.b2].includes(p.id));
      const angeboten = m => { closeSheet(true); showEditMatch(m.id);
        return !!document.querySelector('#sheet select[data-ep="A1"] option[value="' + p.id + '"]'); };
      const out = {nachher: angeboten(ohne), drin: angeboten(mit), vorher: angeboten(frueh)};
      // Auch gesetzt, etwa über ein altes Formular, speichert es nicht.
      closeSheet(true); showEditMatch(ohne.id);
      E.A1 = p.id; document.querySelector('#sheet [data-ep="A1"]').dispatchEvent(new Event('change'));
      const sel = document.querySelector('#sheet select[data-ep="A1"]');
      const o = document.createElement('option'); o.value = p.id; sel.appendChild(o); sel.value = p.id;
      sel.dispatchEvent(new Event('change'));
      out.gesperrt = document.getElementById('saveEdit').disabled;
      out.hinweis = document.getElementById('editWarn').textContent;
      closeSheet(true); p.retired_at = null; invalidateCache();
      return JSON.stringify(out);
    })()`));
    return r;
  });
  ok(!bearb.nachher && bearb.drin && bearb.vorher && bearb.gesperrt && /Karriere/.test(bearb.hinweis),
     'eine Partie nach dem Karriereende bietet den Ruheständler nicht an und speichert ihn nicht, eine davor schon',
     JSON.stringify(bearb));

  // ── Der Positionsverlauf zeigt sich selbst ───────────────────────
  //    Die Karte unter „Mehr zur Saison" trug die Elo der ersten drei —
  //    eine andere Grafik als das Blatt, das sie öffnet. Jetzt trägt sie
  //    denselben Verlauf vereinfacht: eine Linie je Spieler, der im Blatt
  //    eine Kurve hat, und die ersten drei darunter. Sie steht UNTER der
  //    Rangliste, ganz im Bild, und kein Text liegt auf einem anderen.
  const posKarte = await page.evaluate((pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    K(`closeSheet(true); tab='ranking'; period='season'; ligaSeasonId=''; render(); 'x'`);
    const karte = document.querySelector('#main .seasontools .st-card.pos');
    const liste = document.querySelector('#main .rlist');
    if(!karte || !liste) return {fehlt:true};
    const r = karte.getBoundingClientRect();
    const out = {
      gross: karte.classList.contains('gross'),
      linien: karte.querySelectorAll('.posv-mini-l').length,
      soll: K(`getSeasonPositionHistory(ligaSaisonId()).activeIds.filter(id => getSeasonPositionHistory(ligaSaisonId()).positionsByDay[id].some(p => p !== null)).length`),
      legende: karte.querySelectorAll('.posv-mini-lg span').length,
      unterListe: r.top >= liste.getBoundingClientRect().bottom - 1,
      erste: karte === document.querySelector('#main .seasontools .st-card'),
      imBild: r.left >= 0 && r.right <= window.innerWidth + .5,
      fehler: pruefen(karte).fehler
    };
    karte.click();
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    out.oeffnet = document.getElementById('sheetBg').classList.contains('show') && !!document.querySelector('#sheet svg');
    K(`closeSheet(true); 'x'`);
    return out;
  }, PRUEFEN.toString());
  ok(!posKarte.fehlt && posKarte.gross && posKarte.linien >= 2 && posKarte.linien === posKarte.soll
     && posKarte.legende === Math.min(3, posKarte.soll) && posKarte.unterListe && posKarte.erste
     && posKarte.imBild && posKarte.fehler.length === 0 && posKarte.oeffnet,
     'der Positionsverlauf steht unter der Rangliste als erste Karte, zeigt jede Linie des Verlaufs und öffnet ihn',
     JSON.stringify(Object.assign({}, posKarte, {fehler: (posKarte.fehler || []).slice(0, 2)})));

  // ── Der Positionsverlauf liest sich als Tabelle über die Zeit ─────
  //    Er zeigte gerade Linien, die Namen mit „…" gekürzt neben dem
  //    Gesicht, einen Hinweis „Linie oder Gesicht antippen" und darunter
  //    einen leeren Kasten „Hier stehen die Einzelheiten". Jetzt: Kurven,
  //    die Tabelle des letzten Stands mit der Bewegung seit dem vorletzten
  //    Spieltag, und ein Detail erst, wenn jemand gewählt ist — mit seinem
  //    Platz an jedem Tag. Die Bewegung wird hier aus `positionsByDay`
  //    nachgerechnet, nicht aus dem Markup abgelesen.
  const posv = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    K(`closeSheet(true); showPositionHistory(seasons[3].id); 'x'`);
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    const d = K(`getSeasonPositionHistory(seasons[3].id)`);
    const jetzt = id => { const a = d.positionsByDay[id]; for(let i = a.length - 1; i >= 0; i--) if(a[i] !== null) return a[i]; return null; };
    const st = d.spielTage, out = {fehler: []};
    const sh = document.getElementById('sheet');
    const txt = sh.innerText;
    if(/…|antippen|Einzelheiten/.test(txt)) out.fehler.push('Hinweis oder Kürzung: ' + (txt.match(/.{0,20}(…|antippen|Einzelheiten).{0,10}/) || [''])[0]);
    const kurven = [...sh.querySelectorAll('.posv-line')].filter(p => / C /.test(p.getAttribute('d'))).length;
    if(kurven < d.activeIds.length - 1) out.fehler.push('Kurven ' + kurven);
    const ids = d.activeIds.filter(id => jetzt(id) !== null).sort((a, b) => jetzt(a) - jetzt(b));
    const rows = [...sh.querySelectorAll('.posv-row')];
    if(rows.map(r => r.dataset.pid).join() !== ids.join()) out.fehler.push('Reihenfolge der Tabelle');
    rows.forEach(r => {
      const a = d.positionsByDay[r.dataset.pid];
      const n = a[st[st.length - 1] - 1], v = st.length > 1 ? a[st[st.length - 2] - 1] : null;
      const soll = n == null ? '' : v == null ? 'neu' : v > n ? '▲' + (v - n) : v < n ? '▼' + (n - v) : '–';
      const ist = (r.querySelector('.posv-bw') || {}).textContent || '';
      if(ist !== soll) out.fehler.push(r.querySelector('.posv-nm').textContent + ': ' + ist + ' statt ' + soll);
      if(r.querySelector('.posv-nm').scrollWidth > r.querySelector('.posv-nm').clientWidth + 1) out.fehler.push('Name abgeschnitten');
    });
    const det = document.getElementById('posvDetail');
    out.vorher = det.hidden;
    const wahl = rows[2];
    wahl.click();
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    const a = d.positionsByDay[wahl.dataset.pid];
    out.nachher = !det.hidden;
    out.zellen = det.querySelectorAll('.posv-tz span').length === d.lastDay;
    out.gold = det.querySelectorAll('.posv-tz span.eins').length === a.filter(x => x === 1).length;
    out.hl = wahl.classList.contains('hl') && !!sh.querySelector('.posv-line.hl[data-pid="' + wahl.dataset.pid + '"]');
    K(`closeSheet(true); 'x'`);
    return out;
  });
  ok(posv.fehler.length === 0 && posv.vorher && posv.nachher && posv.zellen && posv.gold && posv.hl,
     'der Positionsverlauf zeigt Kurven, die Tabelle mit ihrer Bewegung und erst nach der Wahl den Platz an jedem Tag',
     JSON.stringify(Object.assign({}, posv, {fehler: posv.fehler.slice(0, 3)})));

  // ── Jeder Fun Fact zeichnet seinen Anlass ─────────────────────────
  //    Alle Fun Facts standen als große Zahl links neben ihrem Satz. Jetzt
  //    trägt jede Vorlage ihr Bild — Rennen, Podest, Tauziehen, Pause,
  //    Vitrine … —, und das muss bei 288 und 360 px in seiner Karte bleiben:
  //    kein Text auf einem anderen, keiner abgeschnitten oder mit „…".
  const fakt = await page.evaluate(async (pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    K(`closeSheet(true); 'x'`);
    const html = K(`(function(){
      const pm = pmap(), nameOf = pid => (pm[pid]||{}).name || '?', seen = new Set(), out = [];
      [new Date(2026, 7, 26, 15, 5), new Date(2026, 6, 20, 15, 5)].forEach(now => {
        const T = _ambientTemplatePool(now, pm, nameOf);
        for(let seed = 1; seed <= 4; seed++) T.forEach(t => {
          let r = null; try { r = t.make(_ambientRng(seed)); } catch(e){ return; }
          const b = r && r.dataRef && r.dataRef.bild;
          if(!b || seen.has(b.f + (b.ins ? 'i' : ''))) return; seen.add(b.f + (b.ins ? 'i' : ''));
          out.push(_newsCardHtmlM2({id:'ffb_' + t.key, title:r.title, desc:r.desc, when:now, cat:r.cat, ic:r.ic,
            dataRef:Object.assign({type:'ambient', sub:t.key}, r.dataRef)}, false, false, ''));
        });
      });
      out.push(_newsCardHtmlM2({id:'ffb_pause', title:'5 Tage ohne Spiel', desc:'Die längste Pause der Liga waren 9 Tage.',
        when:new Date(2026, 7, 26), cat:'fun', ic:'clock', dataRef:{type:'dry_spell', daysSince:5, maxGapDays:9}}, false, false, ''));
      return out.join('');
    })()`);
    const w = document.createElement('div');
    w.className = 'nf-wrap';
    document.body.appendChild(w);
    const out = {formen:0, fehler:[], podeste:0, sockel:[]};
    for(const breite of [288, 360]){
      w.style.cssText = 'position:absolute;left:0;top:0;width:' + breite + 'px;z-index:99999';
      w.innerHTML = html;
      w.querySelectorAll('.nf-card').forEach(c => { c.style.contentVisibility = 'visible'; });
      document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
      await new Promise(r => requestAnimationFrame(r));
      const ffs = [...w.querySelectorAll('.ff')];
      out.formen = Math.max(out.formen, ffs.length);
      ffs.forEach(ff => {
        const k = ff.closest('.nf-card').dataset.sid + ' ' + breite + ': ';
        const r = ff.getBoundingClientRect();
        ff.querySelectorAll('*').forEach(e => {
          const b = e.getBoundingClientRect();
          if(b.width && (b.right > r.right + .5 || b.left < r.left - .5)) out.fehler.push(k + 'läuft hinaus ' + (e.className.baseVal ?? e.className));
        });
        pruefen(ff).fehler.forEach(f => out.fehler.push(k + f));
        // Der Sockel trägt seinen Inhalt: Wert und Ziffer liegen in ihm, und
        // die Stufen fallen von Platz 1 nach 3. Platz 3 war 30 px hoch für
        // 43 px Inhalt, und seine Ziffer hing unter dem Podium heraus.
        ff.querySelectorAll('.ff-pd').forEach(pd => {
          out.podeste++;
          const hoehe = {};
          pd.querySelectorAll('.ff-pd-s').forEach(s => {
            const em = s.querySelector('em'), r = em.getBoundingClientRect();
            const p = (s.className.match(/\bp(\d)\b/) || [])[1];
            hoehe[p] = r.height;
            [...em.children].forEach(e => {
              const b = e.getBoundingClientRect();
              if(b.bottom > r.bottom + .5 || b.top < r.top - .5)
                out.sockel.push(k + 'Platz ' + p + ': ' + e.tagName + ' ragt ' + (b.bottom - r.bottom).toFixed(1) + ' px aus dem Sockel');
            });
            if(em.scrollHeight > em.clientHeight) out.sockel.push(k + 'Platz ' + p + ' läuft über: ' + em.scrollHeight + ' > ' + em.clientHeight);
          });
          const st = ['1', '2', '3'].filter(x => x in hoehe).map(x => hoehe[x]);
          if(st.some((h, i) => i && h >= st[i - 1])) out.sockel.push(k + 'die Stufen fallen nicht: ' + st.join(' / '));
        });
      });
    }
    w.remove();
    return out;
  }, PRUEFEN.toString());
  ok(fakt.podeste >= 2 && fakt.sockel.length === 0,
     'im Fun-Fact-Podest trägt jeder Sockel seinen Wert und seine Ziffer, und die Stufen fallen von Platz 1 nach 3',
     fakt.podeste + ' Podeste · ' + fakt.sockel.slice(0, 4).join(' | '));
  ok(fakt.formen >= 12 && fakt.fehler.length === 0,
     'jedes Fun-Fact-Bild bleibt bei 288 und 360 px in seiner Karte, ohne Text auf Text und ohne Kürzung',
     fakt.formen + ' Bilder · ' + fakt.fehler.slice(0, 4).join(' | '));

  // ── Die Siegchance steht beim Aufstellen unter der Score-Karte ────
  //    Ohne Erklärsatz, aus derselben Rechnung, mit der die Partie danach
  //    gewertet wird, und in der Vorschau nach dem Stand nicht noch einmal.
  const chance = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    K(`tab='match'; M={A1:'',A2:'',B1:'',B2:'',pA1:'drive',pA2:'reves',pB1:'drive',pB2:'reves',sa:0,sb:0}; render(); updatePreview(); 'x'`);
    const leer = !document.querySelector('#chanceSlot .prob');
    K(`M.A1=players[8].id; M.A2=players[10].id; M.B1=players[3].id; M.B2=players[1].id; updatePreview(); 'x'`);
    const box = document.querySelector('#chanceSlot .m-chance');
    const soll = Math.round(K('computeMatch(teamsFromM().teamA, teamsFromM().teamB, "A", 10, 0).expA') * 100);
    const pa = box ? parseInt(box.querySelector('.pa').textContent, 10) : null;
    const pb = box ? parseInt(box.querySelector('.pb').textContent, 10) : null;
    const unter = box ? box.getBoundingClientRect().top >= document.querySelector('.score-board').getBoundingClientRect().bottom - 1 : false;
    const text = box ? box.textContent : '';
    K(`M.sa=10; M.sb=7; updatePreview(); 'x'`);
    const doppelt = document.querySelectorAll('#main .prob').length;
    K(`M={A1:'',A2:'',B1:'',B2:'',pA1:'drive',pA2:'reves',pB1:'drive',pB2:'reves',sa:0,sb:0}; tab='ranking'; render(); 'x'`);
    return {leer, da:!!box, pa, pb, soll, unter, erklaert:/Elo beider|Rechnung|aus der Elo/i.test(text), doppelt};
  });
  ok(chance.leer && chance.da && chance.pa === chance.soll && chance.pa + chance.pb === 100 && chance.unter
     && !chance.erklaert && chance.doppelt === 1,
     'die Siegchance steht beim Aufstellen unter der Score-Karte, ohne Erklärsatz und nur einmal',
     JSON.stringify(chance));

  // ── Jede Begegnung im Direkten Vergleich ──────────────────────────
  //    Ein Balken je Begegnung als Gegner, höchstens die letzten vierzig,
  //    und die Zahlen daneben zählen die gezeigten Siege — nachgerechnet
  //    an den rohen Partien.
  const vergleich = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const a = K('players.find(p=>p.name==="Leon").id'), b = K('players.find(p=>p.name==="Martin").id');
    K(`showH2H(${JSON.stringify(a)}, ${JSON.stringify(b)}); 'x'`);
    const ms = K(`matches.filter(m => [m.a1,m.a2,m.b1,m.b2].includes(${JSON.stringify(a)}) && [m.a1,m.a2,m.b1,m.b2].includes(${JSON.stringify(b)})
      && ((m.a1===${JSON.stringify(a)}||m.a2===${JSON.stringify(a)}) !== (m.a1===${JSON.stringify(b)}||m.a2===${JSON.stringify(b)})))
      .sort((x,y)=>mts(x)-mts(y)).slice(-40).map(m => (m.a1===${JSON.stringify(a)}||m.a2===${JSON.stringify(a)}) ? m.winner==='A' : m.winner==='B')`);
    const box = document.querySelector('#sheet .h2h-bg');
    const res = {n: box ? box.querySelectorAll('rect').length : 0, soll: ms.length,
      aw: box ? +box.querySelectorAll('.h2h-bg-n b')[0].textContent : null, aSoll: ms.filter(Boolean).length,
      gruen: box ? box.querySelectorAll('rect.w').length : 0};
    K('closeSheet(true)');
    return res;
  });
  ok(vergleich.n === vergleich.soll && vergleich.n > 10 && vergleich.aw === vergleich.aSoll && vergleich.gruen === vergleich.aSoll,
     'der Direkte Vergleich zeigt jede der letzten Begegnungen als Balken und zählt die Siege wie die Partien',
     JSON.stringify(vergleich));

  // ── Die Rückblicke zeigen, wie es dazu kam ───────────────────────
  //    Woche: sieben Tage des Helden und das Feld; Tag: Bahn, Elo und
  //    Feld; Saison: Rangliste zuerst, darunter Titelrennen, Tage an der
  //    Spitze und die Saison des Meisters.
  const rueck = await page.evaluate(async (pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    const warte = () => new Promise(r => setTimeout(r, 450));
    const fehler = h => { document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} }); return pruefen(h).fehler; };
    // Die Laufbahn, die Auszeichnungen und die Rekorde einer Woche kommen
    // nach, wenn das Blatt steht (`rcpSpaetLaden`).
    const spaet = async () => { for(let t = 0; t < 40 && document.querySelector('#sheet [data-rcp-spaet]'); t++) await new Promise(r => setTimeout(r, 100)); };
    // Die Grafiken bei 360 px: nichts ragt seitlich heraus, der Platzhalter
    // ist ersetzt, die neuen Zeichen stehen zu dritt, kein Rekordname bricht
    // mitten im Wort, jedes Stück einer Laufbahn-Bahn liegt in ihr, kein Text
    // liegt auf einem anderen — und ohne Ende bewegt sich nur der Sieger:
    // sein Strahlenkranz und das Licht auf seiner Karte [§C43].
    const grafik = (sh, sieger) => {
      document.getAnimations().forEach(a => { try { if(a.effect.getTiming().iterations !== Infinity) a.finish(); } catch(e){} });
      const endlos = document.getAnimations().filter(a => a.effect && a.effect.target && sh.contains(a.effect.target)
          && a.effect.getTiming().iterations === Infinity)
        .map(a => a.effect.target).filter(t => !t.matches('.nf-ms-strahl') && !(t.matches('.glanz-bahn') && t.parentElement.matches(sieger)))
        .map(t => String(t.className && t.className.baseVal != null ? t.className.baseVal : t.className));
      const zeichen = [...sh.querySelectorAll('.rcp-is .nd-is-sp')].slice(0, 3).map(e => Math.round(e.getBoundingClientRect().top));
      const gebrochen = [];
      sh.querySelectorAll('.rcp-rw-r b').forEach(b => {
        const n = b.firstChild; if(!n) return;
        let i = 0;
        n.textContent.split(' ').forEach(w => {
          const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + w.length);
          if([...rg.getClientRects()].filter(r => r.width > 0).length > 1) gebrochen.push(w);
          i += w.length + 1;
        });
      });
      const ausBahn = [...sh.querySelectorAll('.rcp-lb-b i')].filter(i => {
        const r = i.getBoundingClientRect(), b = i.parentElement.getBoundingClientRect();
        return r.left < b.left - .6 || r.right > b.right + .6;
      }).length;
      return {breit:sh.scrollWidth - sh.clientWidth, offen:sh.querySelectorAll('[data-rcp-spaet]').length,
        bahnen:sh.querySelectorAll('.rcp-lb-z').length, ausBahn, zeichen, gebrochen, endlos,
        fehler:[...sh.querySelectorAll('.rcp-team, .rcp-kal, .rcp-tab, .rcp-lb, .rcp-rw, .rcp-bns, .rcp-is')].flatMap(fehler)};
    };
    const out = {};
    K(`closeSheet(true); showPotwRecap({woche:'2026-08-17'}); 'x'`); await warte(); await spaet();
    let sh = document.getElementById('sheet');
    const wochenMs = K(`matches.filter(m => tagKey(mts(m)) >= '2026-08-17' && tagKey(mts(m)) <= '2026-08-23')`);
    const imFeld = new Set(); wochenMs.forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(x => imFeld.add(x)));
    out.woche = {titel: /KW 34/.test(sh.textContent) ? 'KW 34' : '', tage: sh.querySelectorAll('.rcp-wo-t').length,
      feld: sh.querySelectorAll('.rcp-feld-z').length, soll: imFeld.size, held: sh.querySelectorAll('.rcp-feld-z.held').length,
      fehler: [...sh.querySelectorAll('.rcp-feld, .rcp-woche')].flatMap(fehler)};
    // Die Auszeichnungen der Woche nennen, wen die Rechnung des
    // Awards-Reiters für DIESE Woche nennt; die Zahlen der Woche zählen
    // nach; der Held steht auf seiner Bühne, die vier Zahlen zwei mal zwei.
    const soll = JSON.parse(K(`(function(){ const v = awWeekStart; awWeekStart = new Date(2026, 7, 17);
      const R = awardRankings('week'); awWeekStart = v;
      const o = {}; Object.keys(AW_WERT).forEach(k => { const t = awTop(k, R);
        if(t.length) o[k] = _awNameVon(k, t[0]) + (t.length > 1 ? ' +' + (t.length - 1) : ''); });
      return JSON.stringify(o); })()`));
    // Die Kachel des Awards-Reiters: der Name im Namen, „+N" als Marke auf
    // der Kante.
    const kacheln = [...sh.querySelectorAll('[data-potw-award]')].map(e => ({k:e.dataset.potwAward,
      name:e.querySelector('.aw-t-name').textContent.trim()
        + (e.querySelector('.aw-t-gleich') ? ' ' + e.querySelector('.aw-t-gleich').textContent.trim() : '')}));
    const zahlenAb = [...sh.querySelectorAll('.rcp-section')].find(x => /Woche in Zahlen/.test(x.textContent));
    const nach = (el, cls) => { for(let e = el && el.nextElementSibling; e; e = e.nextElementSibling) if(e.classList.contains(cls)) return e; return null; };
    const zahlenZ = nach(zahlenAb, 'rcp-z'), kal = nach(zahlenAb, 'rcp-kal');
    const zellen = zahlenZ ? [...zahlenZ.querySelectorAll('.rcp-z-s')].map(z => z.textContent.replace(/\s+/g, ' ').trim()) : [];
    const tageSoll = new Set(wochenMs.map(m => K(`tagKey(mts(${JSON.stringify(m)}))`))).size;
    const heldZ = [...sh.querySelectorAll('.rcp-held .rcp-z-s')].map(z => Math.round(z.getBoundingClientRect().top));
    const held = sh.querySelector('.rcp-held');
    out.wocheAw = {kacheln:kacheln.length, falsch:kacheln.filter(k => soll[k.k] !== k.name),
      zahlen:zellen, tageSoll, reihen:new Set(heldZ).size, zellenHeld:heldZ.length,
      kalTage:kal ? kal.querySelectorAll('.rcp-kal-t').length : 0,
      kalPartien:kal ? [...kal.querySelectorAll('.rcp-kal-t b')].reduce((n, b) => n + +b.textContent, 0) : 0, partien:wochenMs.length,
      strahl:!!(held && held.querySelector('.rcp-held-av > .nf-ms-strahl')), stapel:held ? getComputedStyle(held).isolation : ''};
    out.wocheGrafik = grafik(sh, '.rcp-held');
    K(`closeSheet(true); showPotdRecap({force:true, tag:'2026-08-24'}); 'x'`); await warte();
    sh = document.getElementById('sheet');
    const tagMs = K(`matches.filter(m => tagKey(mts(m)) === '2026-08-24').length`);
    out.tag = {bahn: !!sh.querySelector('.nd-bahn'), zeilen: sh.querySelectorAll('.nd-tml').length, elo: !!sh.querySelector('.rcp-elo svg'),
      feld: sh.querySelectorAll('.rcp-feld-z').length, partien: tagMs, datum: /24\. August/.test(sh.textContent),
      // Der Spieler des Tages steht vor dem Strahlenkranz, und jede Partie
      // setzt ihren Punkt, wenn die Linie bei ihr ankommt: der Anteil am Weg
      // steigt und endet bei eins.
      strahl: !!sh.querySelector('.rcp-held.mit-strahl .rcp-held-av > .nf-ms-strahl'),
      punkte: [...sh.querySelectorAll('.rcp-elo circle')].map(c => +c.style.getPropertyValue('--i')),
      punktAnim: [...new Set([...sh.querySelectorAll('.rcp-elo circle')].map(c => getComputedStyle(c).animationName))],
      fehler: [...sh.querySelectorAll('.rcp-feld, .rcp-elo')].flatMap(fehler)};
    K(`closeSheet(true); showSeasonRecap(seasons.find(s=>s.id==='2026-07')); 'x'`); await warte(); await spaet();
    sh = document.getElementById('sheet');
    const kopf = [...sh.querySelectorAll('.rcp-section')].map(x => x.textContent.replace(/\d+/g, '').trim());
    // Gegenüber dem Vormonat: die Unterschiede der Eckdaten und die
    // Plätze, nachgerechnet aus den Ranglisten beider Monate.
    const vgl = JSON.parse(K(`(function(){ const a = saisonRang('2026-07'), b = saisonRang('2026-06');
      const vor = {}; b.forEach((e, i) => { vor[e.id] = i + 1; });
      const w = a.map((e, i) => ({n:pname(e.id), d:vor[e.id] ? vor[e.id] - (i + 1) : null})).filter(x => x.d != null);
      const max = Math.max(...w.map(x => x.d)), min = Math.min(...w.map(x => x.d));
      return JSON.stringify({ms:matchesInSeason('2026-07').length - matchesInSeason('2026-06').length,
        auf:w.filter(x => x.d === max).map(x => x.n), ab:w.filter(x => x.d === min).map(x => x.n), max, min}); })()`));
    // Die Eckdaten unter dem Kalender tragen den Unterschied zum Vormonat;
    // der größte Sprung und der tiefste Fall stehen hervorgehoben in ihren
    // Zeilen der Tabelle — bei Gleichstand jeder.
    const monatAb = [...sh.querySelectorAll('.rcp-section')].find(x => /Monat in Zahlen/.test(x.textContent));
    const zelle0 = (nach(monatAb, 'rcp-z') || sh).querySelector('.rcp-z-s .rcp-z-d');
    const markiert = cls => [...sh.querySelectorAll('.rcp-tab-r')].filter(r => r.querySelector('.rcp-tab-z.' + cls + '.max'))
      .map(r => r.querySelector('.rcp-tab-n').textContent.trim()).sort();
    const sektion = sh.querySelector('.rcp-section');
    out.saisonVgl = {d:zelle0 ? zelle0.textContent.trim() : '', soll:(vgl.ms > 0 ? '+' : vgl.ms < 0 ? '−' : '±') + Math.abs(vgl.ms),
      auf:markiert('auf'), aufSoll:vgl.auf.sort(), ab:markiert('ab'), abSoll:vgl.ab.sort(),
      buehne:!!sh.querySelector('.nf-meister.rcp-buehne > .nf-ms-strahl + .podest'),
      // Wer gewonnen hat, ist die erste Frage: das Podest steht vor jeder Überschrift.
      zuerst:!!(sektion && sh.querySelector('.rcp-buehne') && (sh.querySelector('.rcp-buehne').compareDocumentPosition(sektion) & Node.DOCUMENT_POSITION_FOLLOWING)),
      awards:sh.querySelectorAll('[data-award]').length};
    out.saison = {rang: kopf.indexOf('Die Tabelle'), rennen: kopf.indexOf('Das Titelrennen'),
      spitze: kopf.indexOf('Tage an der Spitze'), meister: kopf.findIndex(x => /^Die Saison des Meisters/.test(x)),
      fehler: [...sh.querySelectorAll('.rcp-block')].flatMap(fehler)};
    out.saisonGrafik = grafik(sh, '.pod-karte.gold');
    K('closeSheet(true)');
    return out;
  }, PRUEFEN.toString());
  ok(rueck.woche.tage === 7 && rueck.woche.feld === rueck.woche.soll && rueck.woche.held === 1 && /KW 34/.test(rueck.woche.titel)
     && rueck.woche.fehler.length === 0,
     'der Wochenrückblick zeigt die gewählte Woche, die sieben Tage des Helden und jeden Spieler im Feld',
     JSON.stringify(rueck.woche).slice(0, 200));
  ok(rueck.wocheAw.kacheln >= 6 && rueck.wocheAw.falsch.length === 0,
     'die Auszeichnungen der Woche nennen, wen der Awards-Reiter für diese Woche nennt',
     JSON.stringify(rueck.wocheAw.falsch).slice(0, 240) + ' · ' + rueck.wocheAw.kacheln + ' Kacheln');
  ok(rueck.wocheAw.zahlen.length === 4 && rueck.wocheAw.zahlen[0] === rueck.wocheAw.tageSoll + 'Spieltage'
       && rueck.wocheAw.kalTage === 7 && rueck.wocheAw.kalPartien === rueck.wocheAw.partien,
     'die Woche in Zahlen: ein Kalender der sieben Tage und Spieltage, Tore je Partie, enge Partien und Duos, gezählt aus den Partien der Woche',
     JSON.stringify(rueck.wocheAw.zahlen) + ' · Spieltage ' + rueck.wocheAw.tageSoll + ' · Kalender ' + rueck.wocheAw.kalTage + ' Tage, '
     + rueck.wocheAw.kalPartien + '/' + rueck.wocheAw.partien + ' Partien');
  for(const [n, g] of [['Woche', rueck.wocheGrafik], ['Saison', rueck.saisonGrafik]]){
    ok(g.breit <= 0 && g.offen === 0 && g.bahnen > 0 && g.ausBahn === 0,
       n + ': die Grafiken bleiben in der Breite des Blatts, die Laufbahn kommt nach und jede Bahn hält ihre Stücke',
       JSON.stringify({breit:g.breit, offen:g.offen, bahnen:g.bahnen, ausBahn:g.ausBahn}));
    ok(g.zeichen.length < 3 || new Set(g.zeichen).size === 1,
       n + ': die neuen Zeichen stehen bei 360 px zu dritt in einer Reihe', JSON.stringify(g.zeichen));
    ok(g.gebrochen.length === 0 && g.fehler.length === 0,
       n + ': kein Rekordname bricht mitten im Wort, kein Text liegt auf einem anderen oder wird abgeschnitten',
       JSON.stringify(g.gebrochen.concat(g.fehler)).slice(0, 240));
    ok(g.endlos.length === 0,
       n + ': ohne Ende bewegt sich nur der Sieger, sein Kranz und das Licht auf seiner Karte',
       JSON.stringify(g.endlos).slice(0, 240));
  }
  ok(rueck.wocheAw.strahl && rueck.wocheAw.stapel === 'isolate' && rueck.wocheAw.zellenHeld === 4 && rueck.wocheAw.reihen === 2,
     'der Spieler der Woche steht vor dem Strahlenkranz, seine vier Zahlen bei 360 px zwei mal zwei',
     JSON.stringify({strahl:rueck.wocheAw.strahl, stapel:rueck.wocheAw.stapel, zellen:rueck.wocheAw.zellenHeld, reihen:rueck.wocheAw.reihen}));
  ok(rueck.tag.strahl && rueck.tag.punkte.length >= 2 && rueck.tag.punkte.every((v, i, a) => !i || v > a[i - 1])
       && rueck.tag.punkte[rueck.tag.punkte.length - 1] === 1 && rueck.tag.punktAnim.join() === 'rcpPunkt',
     'der Tagesrückblick stellt den Helden vor den Strahlenkranz, die Punkte der Elo-Linie kommen mit der Linie',
     JSON.stringify({strahl:rueck.tag.strahl, punkte:rueck.tag.punkte, anim:rueck.tag.punktAnim}));
  ok(rueck.tag.bahn && rueck.tag.zeilen === 0 && rueck.tag.elo && rueck.tag.feld > 3 && rueck.tag.datum && rueck.tag.fehler.length === 0,
     'der Tagesrückblick zeigt den gewählten Tag als Bahn, die Elo über den Tag und das Feld',
     JSON.stringify(rueck.tag).slice(0, 200));
  // Die Kachel eines Höhepunkts kürzt keinen Namen: die größte Überraschung
  // eines Tages gehört einem Duo, und „Leon & Johannes" stand als „Leon &
  // Joha…" da. Gemessen mit zwei langen Namen in zwei Spalten bei 360 px.
  const kachel = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const box = document.createElement('div');
    box.style.cssText = 'width:320px;position:absolute;left:0;top:0';
    box.innerHTML = '<div class="rcp-awards">' + K(`rcpKachelHtml({ic:'ball', label:'Torjäger', name:'Julian', wert:'10,0 Tore', ton:'metall'})
      + rcpKachelHtml({ic:'bolt', label:'Größte Überraschung', name:'Johannes & Maximilian', wert:'44 % Chance', ton:'metall'})`) + '</div>';
    document.body.appendChild(box);
    const n = [...box.querySelectorAll('.rcp-aw-name')].map(e => ({t:e.textContent, zu:e.scrollWidth > e.clientWidth + 1, kappe:getComputedStyle(e).textOverflow,
      raus:e.getBoundingClientRect().right > e.closest('.rcp-aw').getBoundingClientRect().right + 0.5}));
    box.remove();
    return n;
  });
  ok(kachel.length === 2 && kachel.every(k => !k.zu && !k.raus && k.kappe !== 'ellipsis'),
     'die Kachel eines Höhepunkts im Rückblick kürzt keinen Namen und hält ihn in ihrer Karte', JSON.stringify(kachel));
  // Der Regler „Zuschlag je Partie" zählt in Zehnteln und stand als „15"
  // da, wo 1,5 Elo gemeint sind; auch beim Ziehen.
  const regler = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    K("closeSheet(true); tab='settings'; render()");
    const v = document.getElementById('cfgBonusv'), sl = document.getElementById('cfgBonus');
    const out = {start:v && v.textContent, soll:K('komma(cfg.match_bonus ?? 1.5, 1)'), einheit:v ? v.parentElement.textContent.replace(v.textContent, '').trim() : ''};
    if(sl){ const alt = sl.value; sl.value = '20'; sl.dispatchEvent(new Event('input')); out.gezogen = v.textContent; sl.value = alt; sl.dispatchEvent(new Event('input')); }
    K("tab='ranking'; render()");
    return out;
  });
  ok(regler.start === regler.soll && regler.gezogen === '2,0' && regler.einheit === 'Elo',
     'der Regler „Zuschlag je Partie" zeigt Elo mit Komma, auch beim Ziehen', JSON.stringify(regler));
  ok(rueck.saisonVgl.d === rueck.saisonVgl.soll && rueck.saisonVgl.auf.length > 0
       && rueck.saisonVgl.auf.join() === rueck.saisonVgl.aufSoll.join() && rueck.saisonVgl.ab.join() === rueck.saisonVgl.abSoll.join()
       && rueck.saisonVgl.buehne && rueck.saisonVgl.zuerst && rueck.saisonVgl.awards >= 10,
     'der Saison-Rückblick beginnt mit dem Podest auf der Bühne, nennt den Unterschied zum Vormonat und hebt den größten Sprung und den tiefsten Fall in der Tabelle hervor',
     JSON.stringify(rueck.saisonVgl));
  ok(rueck.saison.rang >= 0 && rueck.saison.rennen > rueck.saison.rang && rueck.saison.spitze > rueck.saison.rennen
     && rueck.saison.meister > rueck.saison.spitze && rueck.saison.fehler.length === 0,
     'der Saison-Rückblick zeigt die Tabelle vor Titelrennen, Tagen an der Spitze und der Saison des Meisters',
     JSON.stringify(rueck.saison).slice(0, 200));

  // ── Die Vorstellung eines Rückblicks [§C43] ──────────────────────
  //    Der Meister kommt groß in die Mitte und setzt sich auf seinen Platz,
  //    dann Platz 2 und 3, der Kranz, das Team der Saison, dann der Rest —
  //    gemessen Bild für Bild, wann jedes Teil sichtbar wird und wie groß
  //    der Meister ist. Vorher kam das Blatt in acht Teilen 45 ms
  //    auseinander, der Meister als eine Karte unter vielen. Eine
  //    Berührung beendet die Vorstellung; was darunter steht, wartet still
  //    und kommt beim Hereinscrollen; was nachkommt, rechnet erst nach ihr.
  //    Die Woche stellt leiser vor, der Wechsel des Monats ohne Auftritt und
  //    mit stehendem Kopf, zurück aus einem Blatt darüber gar nicht.
  const vorst = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const bild = () => new Promise(r => requestAnimationFrame(r));
    const sh = document.getElementById('sheet'), q = s => sh.querySelector(s);
    const sicht = el => !!el && el.isConnected && getComputedStyle(el).display !== 'none' && parseFloat(getComputedStyle(el).opacity) > .05;
    const unten = () => sh.getBoundingClientRect().bottom;
    // Was zugeklappt ist (die weiteren Einträge der Chronik), hat keine
    // Fläche und steht nirgends; es kommt, wenn es aufgeklappt hereinkommt.
    const imBild = () => [...sh.querySelectorAll('.vs-w')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().top < unten())
      .map(e => String(e.className).split(' ')[0] + ' ' + Math.round(e.getBoundingClientRect().top) + '/' + Math.round(unten()));
    const out = {};
    const juli = `showSeasonRecap(seasons.find(s => s.id === '2026-07'))`;
    K(`closeSheet(true); 'x'`); await warte(350);
    K(juli + `; 'x'`);
    const t0 = performance.now();
    const gold = q('.rcp-buehne .pod-karte.gold'), breite = gold.offsetWidth;
    const teile = {gold, silber:q('.rcp-buehne .pod-karte.silber'), bronze:q('.rcp-buehne .pod-karte.bronze'),
      kranz:q('.rcp-buehne > .nf-ms-strahl'), team:q('.rcp-team'), rest:q(':scope > .rcp-section')};
    const erst = {};
    let gross = 0, mitte = 99, goldBeimTeam = null, spaetWaehrend = null;
    while(performance.now() - t0 < 3200){
      const t = performance.now() - t0;
      Object.entries(teile).forEach(([n, el]) => { if(erst[n] == null && sicht(el)) erst[n] = Math.round(t); });
      if(sicht(gold)){
        const r = gold.getBoundingClientRect(), s = sh.getBoundingClientRect(), f = r.width / breite;
        if(f > gross){ gross = f; mitte = Math.abs((r.left + r.right) / 2 - (s.left + s.right) / 2); }
      }
      if(erst.team != null && goldBeimTeam == null) goldBeimTeam = gold.getBoundingClientRect().width / breite;
      if(t > 1900 && spaetWaehrend == null) spaetWaehrend = !!q('[data-rcp-spaet]');
      await bild();
    }
    await warte(300);
    out.saison = {erst, gross:+gross.toFixed(2), mitte:Math.round(mitte), goldBeimTeam:goldBeimTeam && +goldBeimTeam.toFixed(3),
      spaetWaehrend, spaetDanach:!!q('[data-rcp-spaet]'), groessBleibt:!!q('.vs-gross'),
      wartetImBild:imBild()};
    // Unter dem Rand wartet die Tabelle, und was in ihr wächst, steht still;
    // hereingescrollt kommt sie, mit Licht um Platz 1 bis 3.
    const tab = q('.rcp-tab');
    const lauf = () => [...new Set(tab.getAnimations({subtree:true}).map(a => a.playState))].sort().join();
    out.hinein = {wartet:tab.matches('.vs-w'), still:lauf()};
    tab.scrollIntoView({block:'center'}); await warte(800);
    out.hinein.da = tab.matches('.vs-da') && !tab.matches('.vs-w');
    out.hinein.lauf = lauf();
    out.hinein.licht = [...tab.children].slice(0, 3).filter(z => z.querySelector(':scope > .kl.kl-zeichnen')).length;
    // Eine Berührung mitten im Auftritt: der Meister steht auf seinem Platz,
    // alles im Bild steht sofort, nur darunter wartet noch etwas.
    K(`closeSheet(true); 'x'`); await warte(350);
    K(juli + `; 'x'`); await warte(450);
    const g2 = q('.rcp-buehne .pod-karte.gold');
    document.dispatchEvent(new Event('pointerdown'));
    await bild();
    out.abbruch = {gross:!!q('.vs-gross'), faktor:+(g2.getBoundingClientRect().width / g2.offsetWidth).toFixed(3),
      stehen:['.rcp-buehne .pod-karte.silber', '.rcp-buehne .pod-karte.bronze', '.rcp-team'].every(s => sicht(q(s)) && parseFloat(getComputedStyle(q(s)).opacity) > .99),
      wartetImBild:imBild(), wartetUnten:sh.querySelectorAll('.vs-w').length};
    // Die Woche: kein großer Auftritt, Licht innen an der Kante des Helden,
    // ein Ring um sein Gesicht, der Rest danach.
    K(`closeSheet(true); 'x'`); await warte(350);
    K(`showPotwRecap({woche:'2026-08-17'}); 'x'`);
    const w0 = performance.now(), held = q('.rcp-held'), hb = held.offsetWidth, we = {};
    let heldMax = 0;
    while(performance.now() - w0 < 1400){
      const t = performance.now() - w0;
      [['held', held], ['rest', q(':scope > .rcp-section')]].forEach(([n, el]) => { if(we[n] == null && sicht(el)) we[n] = Math.round(t); });
      heldMax = Math.max(heldMax, held.getBoundingClientRect().width / hb);
      await bild();
    }
    out.woche = {erst:we, heldMax:+heldMax.toFixed(3), gross:!!q('.vs-gross, .vs-spot'),
      licht:!!held.querySelector(':scope > .kl.kl-gold.kl-innen'), ring:held.matches('.vs-ring')};
    // Ein anderer Monat aus dem Wähler im Blatt: der Kopf steht, der Meister
    // kommt zuerst, ohne Auftritt.
    K(`closeSheet(true); ${juli}; 'x'`); await warte(3200);
    K(`showSeasonRecap(seasons.find(s => s.id === '2026-06'), {wechsel:true}); 'x'`); await warte(60);
    const kopfAn = q('.rcp-head').getAnimations({subtree:true}).filter(a => a instanceof CSSAnimation).map(a => a.animationName);
    out.wechsel = {kopf:kopfAn, gross:!!q('.vs-gross, .vs-spot'), gold:q('.rcp-buehne .pod-karte.gold').matches('.vs-da'),
      silberWartet:q('.rcp-buehne .pod-karte.silber').matches('.vs-w')};
    // Zurück aus einem Blatt darüber stellt nichts vor.
    K(`closeSheet(true); ${juli}; 'x'`); await warte(500);
    K(`sheetNav(() => showPlayer(players[0].id)); 'x'`); await warte(500);
    K(`closeSheet(); 'x'`); await warte(700);
    out.zurueck = {buehne:!!q('.rcp-buehne'), vs:sh.querySelectorAll('.vs').length, vor:!!sh._vs};
    K(`closeSheet(true); 'x'`);
    return out;
  });
  const vs = vorst.saison.erst;
  ok(vs.gold != null && vs.gold < vs.silber && vs.silber < vs.bronze && vs.bronze < vs.team && vs.team < vs.rest
       && vs.kranz >= vs.silber && vorst.saison.gross >= 1.4 && vorst.saison.mitte <= 2 && Math.abs(vorst.saison.goldBeimTeam - 1) < 0.01,
     'der Saison-Rückblick stellt vor: der Meister groß in der Mitte, dann auf seinem Platz, Platz 2 und 3, der Kranz, das Team, dann der Rest',
     JSON.stringify(vorst.saison));
  ok(vs.rest <= 2400 && !vorst.saison.groessBleibt && vorst.saison.wartetImBild.length === 0,
     'die Vorstellung ist nach weniger als zweieinhalb Sekunden beim Rest, und danach wartet nichts im Bild',
     JSON.stringify({rest:vs.rest, gross:vorst.saison.groessBleibt, wartet:vorst.saison.wartetImBild}));
  ok(vorst.saison.spaetWaehrend === true && vorst.saison.spaetDanach === false,
     'was nachkommt, rechnet erst nach dem ersten Bildschirm der Vorstellung',
     JSON.stringify({waehrend:vorst.saison.spaetWaehrend, danach:vorst.saison.spaetDanach}));
  ok(vorst.hinein.wartet && vorst.hinein.still === 'paused' && vorst.hinein.da && !/paused/.test(vorst.hinein.lauf) && vorst.hinein.licht === 3,
     'unter dem Rand wartet die Tabelle still und kommt beim Hereinscrollen, mit Licht um Platz 1 bis 3',
     JSON.stringify(vorst.hinein));
  ok(!vorst.abbruch.gross && Math.abs(vorst.abbruch.faktor - 1) < 0.01 && vorst.abbruch.stehen
       && vorst.abbruch.wartetImBild.length === 0 && vorst.abbruch.wartetUnten > 0,
     'eine Berührung beendet die Vorstellung: alles im Bild steht sofort, was darunter steht, wartet aufs Hereinscrollen',
     JSON.stringify(vorst.abbruch));
  ok(vorst.woche.erst.held != null && vorst.woche.erst.held < vorst.woche.erst.rest && vorst.woche.heldMax <= 1.001
       && !vorst.woche.gross && vorst.woche.licht && vorst.woche.ring,
     'der Wochenrückblick stellt leiser vor: der Held ohne großen Auftritt, mit Licht an der Kante und einem Ring, dann der Rest',
     JSON.stringify(vorst.woche));
  ok(vorst.wechsel.kopf.length === 0 && !vorst.wechsel.gross && vorst.wechsel.gold && vorst.wechsel.silberWartet,
     'ein anderer Monat im Blatt: der Kopf steht, der Meister kommt zuerst, ohne Auftritt',
     JSON.stringify(vorst.wechsel));
  ok(vorst.zurueck.buehne && vorst.zurueck.vs === 0 && !vorst.zurueck.vor,
     'zurück aus einem Blatt darüber stellt der Rückblick nichts vor', JSON.stringify(vorst.zurueck));
  await page.emulateMedia({reducedMotion: 'reduce'});
  const vorstRuhig = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    K(`closeSheet(true); showSeasonRecap(seasons.find(s => s.id === '2026-07')); 'x'`);
    await new Promise(r => setTimeout(r, 200));
    const sh = document.getElementById('sheet');
    const n = {vs:sh.querySelectorAll('.vs, .vs-w, .vs-gross').length, vor:!!sh._vs};
    K(`closeSheet(true); 'x'`);
    return n;
  });
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(vorstRuhig.vs === 0 && !vorstRuhig.vor, 'bei Bewegungsruhe stellt der Rückblick nichts vor', JSON.stringify(vorstRuhig));

  // ── Aus der Story in ihren Rückblick ──────────────────────────────
  //    Spieler des Tages und die Woche öffnen den Rückblick IHRES Tages und
  //    IHRER Woche, nicht den letzten.
  const knopf = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    K(`_cache._stories=_buildStories().sort((a,b)=>new Date(b.when)-new Date(a.when));_cache._consolFrom=null;_cache._frischVon=null;'x'`);
    const potd = K(`JSON.stringify(getStoriesCache().filter(s=>(s.dataRef||{}).type==='potd').map(s=>({id:s.id, tag:s.dataRef.dayKey})))`);
    const woche = K(`JSON.stringify(getStoriesCache().filter(s=>(s.dataRef||{}).type==='woche').map(s=>({id:s.id, woche:s.dataRef.woche})))`);
    const res = [];
    for(const x of JSON.parse(potd).slice(-2).concat(JSON.parse(woche).slice(-1))){
      K(`closeSheet(true); openNewsFeed(); openNewsDetail(${JSON.stringify(x.id)}); 'x'`);
      const b = document.querySelector('#nd [data-rueckblick]');
      if(!b){ res.push({id:x.id, knopf:false}); continue; }
      b.click();
      const sh = document.getElementById('sheet');
      const k = x.tag || x.woche;
      const [y, m, d] = k.split('-').map(Number);
      // Die Wochenkarte trägt ihre ISO-Woche („2026-W34"), der Rückblick nennt sie „KW 34".
      const soll = x.tag ? new Date(y, m - 1, d).toLocaleDateString('de-DE', {weekday:'long', day:'numeric', month:'long'})
                         : 'KW ' + Number(k.split('-W')[1]);
      // Das Blatt kommt nach dem Zuschieben des vorigen. Fest 500 ms zu warten
      // war unter Last im Gesamtlauf zu kurz; gewartet wird auf den Inhalt.
      for(let t = 0; t < 30 && sh.textContent.indexOf(soll) < 0; t++) await new Promise(r => setTimeout(r, 100));
      res.push({id:x.id, knopf:true, auf: sh.textContent.indexOf(soll) >= 0, soll});
    }
    K('closeSheet(true)');
    return res;
  });
  ok(knopf.length >= 2 && knopf.every(x => x.knopf && x.auf),
     'die Story des Spielers des Tages und der Woche öffnet per Knopf den Rückblick ihres Tages und ihrer Woche',
     JSON.stringify(knopf).slice(0, 240));

  // ── Der Tafel-Moment: der Tag als Achse, die Zeile als Weg ──────────
  //    Oben stand je Spieler eine Zeile mit seinen Bewegungen — dieselbe
  //    Aussage wie die Liste darunter. Jetzt steht dort der Spieltag als
  //    Achse, und keine Säule ragt bei 360 px aus ihr heraus. Eine Zeile der
  //    Liste führte ins Profil; sie öffnet jetzt das Blatt ihres Eintrags.
  await page.setViewportSize({width:360, height:780});
  const moment = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    K(`_cache._stories=_buildStories().sort((a,b)=>new Date(b.when)-new Date(a.when));_cache._consolFrom=null;_cache._frischVon=null;'x'`);
    const id = K(`(getStoriesCache().find(s=>(s.dataRef||{}).type==='sammel'&&s.dataRef.quelle==='tafel')||{}).id||''`);
    if(!id) return null;
    const auf = () => K(`closeSheet(true); openNewsFeed(); openNewsDetail(${JSON.stringify(id)}); 'x'`);
    auf();
    const nd = document.getElementById('nd');
    const f = nd.querySelector('.nd-ta-f');
    const fr = f ? f.getBoundingClientRect() : null;
    const raus = f ? [...f.querySelectorAll('.nd-ta-s')].filter(x => {
      const r = x.getBoundingClientRect();
      return r.left < fr.left - 0.5 || r.right > fr.right + 0.5 || r.top < fr.top - 0.5;
    }).length : -1;
    const out = {achse:!!f, saeulen:f ? f.querySelectorAll('.nd-ta-s').length : 0, raus,
      gesichter:nd.querySelectorAll('.nd-ta .av').length, wege:[]};
    const sh = document.getElementById('sheet');
    for(const art of ['chron', 'disz', 'laufbahn']){
      auf();
      const z = document.querySelector(`#nd .nw-tz[data-${art}]`);
      if(!z) continue;
      const wert = z.getAttribute('data-' + art);
      const soll = art === 'chron' ? K(`CHRONICLE_BY_ID[${JSON.stringify(wert)}].name`)
        : art === 'disz' ? K(`SEASON_TITLE_BY_ID[${JSON.stringify(wert.split('|')[0])}].name`)
        : 'Laufbahn';
      z.click();
      for(let t = 0; t < 30 && sh.textContent.indexOf(soll) < 0; t++) await new Promise(r => setTimeout(r, 100));
      out.wege.push({art, soll, auf:sh.textContent.indexOf(soll) >= 0, profil:!!sh.querySelector('.pp-header')});
    }
    K('closeSheet(true)');
    return out;
  });
  ok(moment && moment.achse && moment.saeulen > 0 && moment.raus === 0 && moment.gesichter === 0,
     'der Tafel-Moment zeigt oben den Spieltag als Achse ohne Gesichter, und keine Säule ragt bei 360 px hinaus',
     JSON.stringify(moment));
  ok(moment && moment.wege.some(w => w.art === 'chron') && moment.wege.every(w => w.auf && !w.profil),
     'eine Zeile des Tafel-Moments öffnet das Blatt ihres Rekords, ihrer Chronik oder die Laufbahn statt des Profils',
     JSON.stringify(moment && moment.wege));

  // ── Der Tafel-Moment eines vollen Spieltags ──────────────────────────
  //    Am 19.10. trug er neunzehn Bewegungen aus zwei Partien, siebzehn
  //    davon nach der letzten. Die Säule war 230 px hoch über einer leeren
  //    Fläche; „Maxi gewinnt an dieser Seite 100 %, sonst 31 %" stand rechts
  //    in einer Zeile und drückte Eintrag und Satz links Wort für Wort
  //    untereinander („Der / Schattenmann", „Leon / holt"), bis die Zeile
  //    über den Rand lief; jede der zehn Chroniken trug „· 17:17 · 10:4";
  //    der Satz oben nannte den Zuwachs, den die Zahlenreihe darunter
  //    ebenfalls nannte, und „verloren" stand als fünfte Zelle allein in
  //    einer zweiten Reihe. Nachgestellt aus dem Moment der Test-Partien.
  const voll = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const id = K(`(function(){
      _cache._stories=_buildStories().sort((a,b)=>new Date(b.when)-new Date(a.when));_cache._consolFrom=null;_cache._frischVon=null;
      const s = getStoriesCache().filter(s => (s.dataRef||{}).type === 'sammel' && s.dataRef.quelle === 'tafel')
        .sort((a, b) => b.dataRef.teile.length - a.dataRef.teile.length)[0];
      if(!s) return '';
      const t0 = s.dataRef.teile, ms = t0.map(t => t.ms).filter(Number.isFinite);
      const spaet = Math.max(...ms), frueh = spaet - 3 * 3600e3;
      const lang = ['Maxi gewinnt an dieser Seite 100 %, sonst 31 %', 'gegen 7 von 7 regelmäßigen Gegnern im Plus'];
      const teile = [];
      for(let i = 0; i < 19; i++){
        const t = JSON.parse(JSON.stringify(t0[i % t0.length]));
        t.ms = i < 2 ? frueh : spaet;
        if(i === 5 || i === 9) t.ref = Object.assign({}, t.ref, {ev: lang[i === 5 ? 0 : 1]});
        teile.push(t);
      }
      const k = Object.assign({}, s, {id: s.id + '-voll', dataRef: Object.assign({}, s.dataRef, {teile})});
      const orig = getStoriesCache;
      globalThis.__vollZurueck = () => { getStoriesCache = orig; };
      getStoriesCache = function(){ const l = orig.apply(this, arguments); return l.some(x => x.id === k.id) ? l : l.concat([k]); };
      return k.id;
    })()`);
    if(!id) return null;
    K(`closeSheet(true); openNewsFeed(); openNewsDetail(${JSON.stringify(id)}); 'x'`);
    const nd = document.getElementById('nd');
    const zeilen = [...nd.querySelectorAll('.nw-tz')];
    const wortweise = [], raus = [];
    zeilen.forEach(z => {
      const zr = z.getBoundingClientRect();
      z.querySelectorAll('.nw-label, .nw-tz-t small').forEach(e => {
        const rg = document.createRange(); rg.selectNodeContents(e);
        const zl = new Set([...rg.getClientRects()].filter(r => r.width > .5).map(r => Math.round(r.top))).size;
        const w = e.textContent.trim().split(/\s+/).length;
        if(w >= 2 && zl >= w) wortweise.push(e.textContent.trim());
      });
      const tw = document.createTreeWalker(z, NodeFilter.SHOW_TEXT);
      let tn;
      while((tn = tw.nextNode())){
        if(!tn.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(tn);
        if([...rg.getClientRects()].some(r => r.right > zr.right + .5)) raus.push(tn.textContent.trim().slice(0, 30));
      }
    });
    const f = nd.querySelector('.nd-ta-f');
    const zellen = [...nd.querySelectorAll('.rcp-z-s')];
    const reihen = new Set(zellen.map(c => Math.round(c.getBoundingClientRect().top))).size;
    const out = {zeilen:zeilen.length, wortweise, raus,
      achse: f ? Math.round(f.getBoundingClientRect().height) : 0,
      uhrInZeile: zeilen.filter(z => /\d\d:\d\d/.test((z.querySelector('.nw-tz-t small') || {}).textContent || '')).length,
      partien: nd.querySelectorAll('.nw-zk').length,
      satz: !!nd.querySelector('.nd-desc') && /Laufbahn bleiben/.test(nd.querySelector('.nd-desc').textContent),
      zellen: zellen.map(c => c.textContent.trim()), reihen,
      verloren: (nd.querySelector('.nd-sec-r') || {}).textContent || '',
      // Ein Blatt zeigt alles: bei 360 px stand „Johan…" und „übernimmt Der
      // Höhe…" in der Wirkung auf die Laufbahn.
      gekappt: [...nd.querySelectorAll('.nd-wk-n b, .nd-wk-n em, .nd-wk-g, .nd-wk-g b')]
        .filter(e => e.scrollWidth > e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis')
        .map(e => e.textContent.trim().slice(0, 30)),
      wirkungen: nd.querySelectorAll('.nd-wk').length,
      hinweise: [...nd.querySelectorAll('.nw-hinweis')].map(e => e.textContent.trim())};
    K(`__vollZurueck(); closeNewsDetail(); closeSheet(true); 'x'`);
    return out;
  });
  ok(voll && voll.zeilen === 19 && !voll.wortweise.length && !voll.raus.length,
     'ein voller Tafel-Moment: kein Wert drückt Eintrag oder Satz Wort für Wort zusammen, und kein Text läuft aus seiner Zeile',
     JSON.stringify(voll && {wortweise: voll.wortweise.slice(0, 3), raus: voll.raus.slice(0, 3)}));
  ok(voll && voll.achse > 0 && voll.achse <= 100 && voll.uhrInZeile === 0 && voll.partien >= 2,
     'die Säule über einer Partie bleibt flach, und Uhrzeit und Stand stehen einmal über ihren Zeilen statt in jeder',
     JSON.stringify(voll && {achse: voll.achse, uhrInZeile: voll.uhrInZeile, partien: voll.partien}));
  ok(voll && !voll.satz && voll.zellen.length === 4 && voll.reihen === 2 && !voll.zellen.some(z => /verloren/.test(z))
     && /verloren/.test(voll.verloren),
     'der Zuwachs steht einmal, die vier Zahlen zwei mal zwei, und was verloren ging, über der Wirkung',
     JSON.stringify(voll && {satz: voll.satz, zellen: voll.zellen, reihen: voll.reihen, verloren: voll.verloren}));
  // ── Offen steht, was zählt ───────────────────────────────────────
  // In der Chronik der Saison standen alle Einträge untereinander, bei einem
  // Spieler zwölf, von denen elf nichts zählten. Offen steht je Spieler der
  // eine Eintrag des Monats [§C32]; die übrigen klappen darunter auf — im
  // Blatt der Monatstafel und im Saison-Rückblick.
  const zaehltOffen = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const zahl = sid => { const T = K("seasonTitles('" + sid + "')");
      return {gesamt:T.awarded.length, spieler:new Set(T.awarded.map(a => a.pid)).size}; };
    const sh = document.getElementById('sheet');
    const pruefe = (offen, rest, alle) => {
      const knopf = rest && rest.nextElementSibling && rest.nextElementSibling.matches('[data-chron-more]')
        ? rest.nextElementSibling : null;
      const zu = !rest || getComputedStyle(rest).display === 'none';
      if(knopf) knopf.click();
      return {offen, zu, auf: !!rest && getComputedStyle(rest).display !== 'none', knopf: !!knopf, alle: alle()};
    };
    K("closeSheet(true); showSeasonTable('2026-08')");
    const tafel = Object.assign(zahl('2026-08'), pruefe(sh.querySelectorAll('.tplates:not(.chron-rest) .tplate').length,
      sh.querySelector('.tplates.chron-rest'), () => sh.querySelectorAll('.tplate').length));
    // Im Saison-Rückblick steht der Eintrag, der zählt, auf dem Band des
    // Beinamens; die Schattenseiten tragen kein Band [§C39] und stehen rot
    // darunter, alle offen. Was jemand darüber hinaus anführte, klappt auf.
    K("closeSheet(true); showSeasonRecap(seasons.find(s => s.id === '2026-07'))");
    const kopf = [...sh.querySelectorAll('.rcp-section')].find(e => /Chronik der Saison/.test(e.textContent));
    const baender = kopf && kopf.nextElementSibling && kopf.nextElementSibling.classList.contains('rcp-bns') ? kopf.nextElementSibling : null;
    let e = baender && baender.nextElementSibling;
    const neg = e && e.classList.contains('rcp-bn-neg') ? e : null;
    if(neg) e = e.nextElementSibling;
    const rest = e && e.classList.contains('chron-rest') ? e : null;
    const zaehle = el => el ? el.querySelectorAll('[data-tplayer]').length : 0;
    const schatten = K("seasonTitles('2026-07').awarded.filter(a => (_chronikMonat(a.titleId) || {}).art === 'schatten').length");
    // Ein Band traegt, wessen zaehlender Eintrag positiv ist: wessen einzige
    // positive Chronik ueberschattet ist, steht nur rot darunter [§C39].
    const positiv = K("(T => new Set(T.awarded.map(a => a.pid).filter(pid => { const e = chronikEintragVon(T, pid); return e && (_chronikMonat(e.titleId) || {}).art !== 'schatten'; })).size)(seasonTitles('2026-07'))");
    const rueck = Object.assign(zahl('2026-07'), {spieler:positiv, schatten, rot:zaehle(neg)},
      pruefe(zaehle(baender), rest, () => zaehle(baender) + zaehle(neg) + zaehle(rest)));
    // Eine ueberschattete Chronik nennt auf ihrer Plakette, wovon.
    const fall = K("(() => { for(const sid of ['2026-06','2026-07','2026-08']){ const T = seasonTitles(sid);"
      + " const a = T.awarded.find(x => chronikUeberschattet(T, x)); if(a) return {sid, name:chronikUeberschattet(T, a).name}; } return null; })()");
    let schattenZeile = null;
    if(fall){
      K("closeSheet(true); showSeasonTable('" + fall.sid + "')");
      schattenZeile = [...sh.querySelectorAll('.tplate-e')].some(e => e.textContent === 'überschattet von „' + fall.name + '“');
    }
    K('closeSheet(true)');
    return {tafel, rueck, fall, schattenZeile};
  });
  const _offenRecht = x => x && x.offen === x.spieler && x.alle === x.gesamt && (x.rot == null || x.rot === x.schatten)
    && (x.gesamt === x.spieler + (x.schatten || 0) || (x.knopf && x.zu && x.auf));
  ok(_offenRecht(zaehltOffen.tafel) && _offenRecht(zaehltOffen.rueck)
     && (zaehltOffen.tafel.gesamt > zaehltOffen.tafel.spieler || zaehltOffen.rueck.gesamt > zaehltOffen.rueck.spieler),
     'Chronik der Saison: offen steht je Spieler der eine Eintrag, der zählt, die übrigen klappen darunter auf',
     JSON.stringify(zaehltOffen));
  // Eine überschattete Chronik bleibt in der Tafel und sagt, wovon [§C39];
  // ohne die Zeile sähe sie aus wie eine, die zählt.
  ok(zaehltOffen.fall && zaehltOffen.schattenZeile,
     'eine überschattete Chronik nennt auf ihrer Plakette die Schattenseite, die sie überschattet',
     JSON.stringify(zaehltOffen.fall));
  ok(voll && voll.wirkungen > 0 && !voll.gekappt.length && voll.hinweise.some(h => /Prestige/.test(h)),
     'in der Wirkung steht jeder Name und jeder Grund ganz, und die Gruppen sagen in einem Satz, was sie fürs Prestige heißen',
     JSON.stringify(voll && {gekappt: voll.gekappt.slice(0, 3), hinweise: voll.hinweise}));

  // ── Ein Blatt zeigt alles ─────────────────────────────────────────
  // Die Blätter schnitten an zwölf Stellen ab: die Gründe der Wirkung nach
  // drei („+1"), die Halter eines Rekords nach vier, die Gesichter eines
  // Felds der Leiter nach drei, die Wappen im Kopf nach drei, die Partien
  // einer Auszeichnung nach acht, und Profil und Laufbahn hielten den Rest
  // hinter „Mehr anzeigen". Das Blatt ist die Stelle, an der man nachsieht.
  // Steht am Ende des Laufs: Profil, Laufbahn und Popover werden geöffnet und
  // geschlossen, und weiter vorn schloss das den Feed, den spätere Prüfungen
  // noch lesen.
  const alles = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    return JSON.parse(K(`JSON.stringify((function(){
      const ids = players.filter(p => sichtbar(p)).map(p => p.id);
      const pm = pmap(), nm = id => pm[id].name;
      const tmp = h => { const e = document.createElement('div'); e.innerHTML = h; return e; };
      const je = {}; je[ids[0]] = {vor:3000, nach:3285};
      const gr = {}; gr[ids[0]] = ['Der Lauf', 'Der Höhenflug', 'Der Einzelkämpfer', 'Die Wand', 'Der Krimi']
        .map(n => ({verb:'übernimmt', name:n, neg:false}));
      const wk = tmp(_ndWirkungBlock(je, gr, Date.now()));
      const wb = tmp(_ndWechselBuehne({neu:ids.slice(0, 6), weg:ids.slice(6, 10), name:'Der Lauf', wert:'12'}));
      const ll = tmp(_ndLigaLeiter({felder:ids.slice(0, 6).map(id => [id, 0, 0])}));
      const kopf = tmp(_newsBlattKopf({id:'ui-alle', cat:'tafel', title:'x', desc:'y', when:new Date(),
        dataRef:{type:'rivalry', playerIds:ids.slice(0, 5)}}));
      // Wer die meisten Auszeichnungen hat, und welche am häufigsten fiel.
      const bpid = ids.slice().sort((a, b) => (getCachedBadges(b) || []).length - (getCachedBadges(a) || []).length)[0];
      showPlayer(bpid);
      const prof = document.querySelector('.sheet') || document.body;
      const minis = prof.querySelectorAll('.pp-bcard-strip .pp-bmini').length;
      const mehrProfil = prof.querySelectorAll('[data-chron-more], .chron-more').length;
      closeSheet(true);
      showLaufbahn(bpid);
      const lb = document.querySelector('.sheet') || document.body;
      const lbZeilen = lb.querySelectorAll('.lb-q:not(.leer)').length;
      const P = prestigeOf(bpid), posten = (P.quellen || []).length;
      const mehrLb = lb.querySelectorAll('[data-chron-more], .chron-more').length;
      // Je Gruppe fünf offen, der Rest klappt in seiner Gruppe auf.
      const lbGruppen = [...lb.querySelectorAll('.lb-grp')].map(g => ({
        offen: g.querySelectorAll(':scope > .lb-q:not(.leer)').length,
        rest: g.querySelectorAll('.lb-rest .lb-q').length,
        knopf: g.querySelectorAll(':scope > .chron-more').length}));
      closeSheet(true);
      let bp = {id:'', n:0, zeilen:0};
      (getCachedBadges(bpid) || []).forEach(b => { const n = _badgeFireMatches(bpid, b.id).length; if(n > bp.n) bp = {id:b.id, n}; });
      if(bp.id){ showBadgePopover(bp.id, bpid); bp.zeilen = document.querySelectorAll('.bp-match').length; closeBadgePopover(); closeSheet(true); }
      return {
        gruende: wk.querySelectorAll('.nd-wk-g').length, plus: [...wk.querySelectorAll('.nd-wk-g')].some(e => /^\\+[0-9]+$/.test(e.textContent.trim())),
        wechsel: wb.querySelectorAll('.nd-rk-neu [data-pid]').length + '+' + wb.querySelectorAll('.nd-rk-alt [data-pid]').length,
        leiter: ll.querySelectorAll('.nd-ll-av').length,
        kopf: kopf.querySelectorAll('.nd-held-av .av').length,
        kopfNamen: ids.slice(0, 5).every(id => kopf.textContent.indexOf(nm(id)) >= 0) && !/weitere/.test(kopf.textContent),
        minis, badges:(getCachedBadges(bpid) || []).length, mehr: mehrLb,
        lbZeilen, posten, bp, lbGruppen
      };
    })())`));
  });
  ok(alles.gruende === 5 && !alles.plus, 'die Wirkung nennt jeden Grund, ohne „+1"', alles.gruende + ' Gründe');
  ok(alles.wechsel === '6+4' && alles.leiter === 6,
     'die Bühne eines Wechsels zeigt jeden Halter vorher und jetzt, die Leiter jedes Gesicht eines Felds',
     'Wechsel ' + alles.wechsel + ', Leiter ' + alles.leiter);
  ok(alles.kopf === 5 && alles.kopfNamen, 'der Kopf eines Blatts zeigt jedes Wappen und jeden Namen',
     alles.kopf + ' Wappen');
  // Die Laufbahn zeigt je Gruppe fünf Posten offen; der Rest steht im Blatt
  // und klappt in seiner Gruppe auf, der Knopf nennt die Zahl.
  ok(alles.minis === alles.badges && alles.badges > 8
     && alles.lbZeilen === alles.posten && alles.posten > 4
     && alles.lbGruppen.every(g => g.offen <= 5 && (g.rest ? g.offen === 5 && g.knopf === 1 : g.knopf === 0))
     && alles.lbGruppen.some(g => g.rest > 0)
     && alles.mehr === alles.lbGruppen.filter(g => g.rest > 0).length,
     'Profil zeigt jede Auszeichnung, die Laufbahn je Gruppe fünf Posten offen und jeden weiteren aufklappbar in ihrer Gruppe',
     JSON.stringify({minis:alles.minis, badges:alles.badges, mehr:alles.mehr, zeilen:alles.lbZeilen, posten:alles.posten, gruppen:alles.lbGruppen}));
  ok(alles.bp.n > 8 && alles.bp.zeilen === alles.bp.n,
     'das Blatt einer Auszeichnung zeigt jede Partie, in der sie fiel', JSON.stringify(alles.bp));

  // ── Das Profil: Rekorde, Farben, Kanten, Verlauf, Mitspieler ──────
  //    Die Liga-Rekorde standen alle offen direkt unter der Chronik und
  //    schoben zehn Karten vor Statistik und Titel; jetzt stehen zwei offen,
  //    der Rest klappt mit seiner Zahl auf, und der Block steht vor den
  //    Beziehungen. „Selten" stand in der Rangfarbe und war bei goldenem Rang
  //    nicht von „legendär" zu trennen. Die Abschnittskante hing an Schlüsseln
  //    einer alten Leiter und fehlte an vier Stufen. Der Saisonverlauf zeigte
  //    die letzten fünf, die Mitspieler brachen in eine zweite Zeile um.
  const profil = {};
  for(const breite of [288, 360, 430]){
    await page.setViewportSize({width:breite, height:900});
    profil[breite] = await page.evaluate(() => {
      const K = window.__k.eval.bind(window.__k);
      return JSON.parse(K(`JSON.stringify((function(){
        const ids = players.filter(p => sichtbar(p)).map(p => p.id);
        const rpid = ids.slice().sort((a, b) => chroniclesOfPlayer(b).length - chroniclesOfPlayer(a).length)[0];
        const nRek = chroniclesOfPlayer(rpid).length;
        showPlayer(rpid);
        const sh = document.querySelector('.sheet');
        const zuSehen = e => !!(e && e.offsetParent !== null);
        const karten = [...sh.querySelectorAll('.chron-alle .chron-one')];
        const knopf = sh.querySelector('.chron-more');
        const vorher = karten.filter(zuSehen).length, textVor = knopf ? knopf.textContent.trim() : '';
        if(knopf) knopf.click();
        const nachher = karten.filter(zuSehen).length, textNach = knopf ? knopf.textContent.trim() : '';
        const titel = [...sh.querySelectorAll('.pp-sec-title h4')].map(h => h.textContent.trim());
        const wo = re => titel.findIndex(x => re.test(x));
        // Die Farben je Klasse am Bauteil selbst: nicht jeder Spieler hält
        // eine Auszeichnung jeder Klasse.
        const farbe = {};
        const fr = document.createElement('div'); fr.className = 'pp-root';
        fr.innerHTML = '<div class="pp-bcard-strip">' + ['legendary', 'rare', 'common', 'negative']
          .map(k => '<div class="pp-bmini ' + k + '"></div>').join('') + '</div>';
        document.body.appendChild(fr);
        fr.querySelectorAll('.pp-bmini').forEach(b => { farbe[b.classList[1]] = getComputedStyle(b).color; });
        fr.remove();
        const kanten = [...sh.querySelectorAll('.pp-sec-title')].filter(e => { const c = getComputedStyle(e, '::after');
          return !/repeating-linear-gradient/.test(c.backgroundImage) || parseFloat(c.height) < 2; })
          .map(e => e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 24));
        const stufen = INSIGNIEN.map(x => { const r = document.createElement('div');
          r.className = 'pp-root st-' + x.key; r.style.cssText = '--ak:#fff;--ak-rgb:255,255,255';
          r.innerHTML = '<div class="pp-sec-title"><div class="l"><h4>x</h4></div></div>';
          document.body.appendChild(r);
          const c = getComputedStyle(r.firstChild, '::after');
          const ok = /repeating-linear-gradient/.test(c.backgroundImage) && parseFloat(c.height) >= 2;
          r.remove(); return ok ? '' : x.key; }).filter(Boolean);
        const leiste = sh.querySelector('#ppH2HBtn .pp-mit');
        const kinder = leiste ? [...leiste.children] : [];
        const mehr = leiste && leiste.querySelector('.pp-mit-mehr');
        const rest = mehr ? +(mehr.textContent.match(/\\+(\\d+)/) || [])[1] : 0;
        const pm = pmap(), mit = playerH2HList(rpid, 3).filter(x => pm[x.oid]).length;
        const out = {nRek, vorher, nachher, alle:karten.length, textVor, textNach,
          rek:wo(/^Liga-Rekord/), titel:wo(/^Liga Titel/), ausz:wo(/^Auszeichnungen/),
          bez:wo(/^Beziehungen/), chronik:wo(/^Chronik/), farbe, kanten, stufen,
          // Eine Zeile: jedes Kind beginnt, bevor das höchste endet. Die
          // Oberkanten allein unterscheiden sich schon, weil die Aufschrift
          // niedriger ist als ein Gesicht und mittig steht.
          zeilen:kinder.length && Math.max(...kinder.map(e => e.getBoundingClientRect().top))
            < Math.min(...kinder.map(e => e.getBoundingClientRect().bottom)) ? 1 : 2,
          ueber:leiste ? leiste.scrollWidth - leiste.clientWidth : -1,
          gesichter:kinder.length - (mehr ? 1 : 0), rest, mit};
        closeSheet(true);
        return out;
      })())`));
    });
  }
  const p3 = profil[360];
  ok(p3.nRek > 2 && p3.alle === p3.nRek && p3.vorher === 2 && p3.nachher === p3.nRek
     && p3.textVor === (p3.nRek - 2 === 1 ? '1 weiteren anzeigen' : (p3.nRek - 2) + ' weitere anzeigen')
     && p3.textNach === 'Weniger anzeigen',
     'im Profil stehen zwei Liga-Rekorde offen, der Rest klappt mit seiner Zahl auf',
     JSON.stringify({n:p3.nRek, vorher:p3.vorher, nachher:p3.nachher, knopf:p3.textVor}));
  ok(p3.rek > Math.max(p3.titel, p3.ausz) && p3.rek < p3.bez && p3.chronik >= 0 && p3.chronik < p3.ausz,
     'die Liga-Rekorde stehen nach Auszeichnungen und Titeln vor den Beziehungen, die Chronik bleibt oben',
     JSON.stringify({chronik:p3.chronik, ausz:p3.ausz, titel:p3.titel, rek:p3.rek, bez:p3.bez}));
  ok(p3.farbe.legendary === 'rgb(247, 207, 74)' && p3.farbe.rare === 'rgb(167, 139, 250)'
     && p3.farbe.common === 'rgb(154, 162, 170)' && p3.farbe.negative === 'rgb(240, 86, 106)',
     'die Auszeichnungen im Profil stehen in Gold, Lila, Grau und Rot nach ihrer Klasse',
     JSON.stringify(p3.farbe));
  ok(p3.kanten.length === 0 && p3.stufen.length === 0,
     'unter jeder Überschrift des Profils liegt die gestrichelte Kante, auf jeder Stufe',
     JSON.stringify({ohne:p3.kanten, stufen:p3.stufen}));
  // Die echten Partien reichen über weniger als sechs Monate; drei Monate
  // davor stehen deshalb je eine Kopie einer Partie des Spielers, nur für
  // diese Prüfung, danach ist der Bestand wieder der alte.
  const verlauf = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    return JSON.parse(K(`JSON.stringify((function(){
      const pid = players.filter(p => sichtbar(p))[0].id;
      const seine = matches.find(m => [m.a1, m.a2, m.b1, m.b2].includes(pid));
      const erste = new Date(matches[0].created_at);
      const vorn = [3, 2, 1].map(k => Object.assign({}, seine, {id:'vorlauf' + k,
        created_at:new Date(erste.getFullYear(), erste.getMonth() - k, 15, 18).toISOString()}));
      const bestand = matches;
      matches = vorn.concat(bestand); invalidateCache();
      try {
        showPlayer(pid);
        const rail = document.querySelectorAll('#ppSeasonsRail .pp-sn').length;
        const saisons = [...new Set([...allPastSeasons(), currentSeason().id])]
          .filter(sid => matchesInSeason(sid).some(m => [m.a1, m.a2, m.b1, m.b2].includes(pid))).length;
        closeSheet(true);
        return {rail, saisons};
      } finally { matches = bestand; invalidateCache(); }
    })())`));
  });
  ok(verlauf.saisons > 5 && verlauf.rail === verlauf.saisons,
     'der Saisonverlauf zeigt jede Saison, in der gespielt wurde, auch mehr als fünf',
     verlauf.rail + ' von ' + verlauf.saisons);
  const leisten = [288, 360, 430].map(b => Object.assign({b}, profil[b]));
  ok(leisten.every(x => x.zeilen === 1 && x.ueber <= 0 && x.gesichter + x.rest === x.mit && (x.rest === 0 || x.rest >= 3)),
     'die Mitspieler unter den Beziehungen stehen bei 288, 360 und 430 px in einer Zeile, der Rest als „+N weitere"',
     leisten.map(x => x.b + ': ' + x.gesichter + (x.rest ? ' +' + x.rest : '') + ' in ' + x.zeilen + ' Zeile(n), über ' + x.ueber).join(' · '));

  // ── Das Profil lebt [§C27] ────────────────────────────────────────
  //    Bewegt wird nur, was gewonnen ist oder gerade läuft: das Licht am Rand
  //    des Kopfs, die Elo-Kurve, die sich zeichnet, der laufende Monat und der
  //    eigene Rang, die atmen, und das Lauflicht des Goldes über jedem Titel,
  //    jedem gehaltenen Rekord, Platz 1 einer Saison und den legendären
  //    Auszeichnungen. Vorher stand das Profil ganz still. Endlos läuft nur
  //    transform und opacity, bei Bewegungsruhe gar nichts.
  await page.setViewportSize({width:360, height:900});
  const lebt = async () => page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    return JSON.parse(K(`JSON.stringify((function(){
      // Jedes Profil der Liga: nicht jeder hält einen Titel, eine legendäre
      // Auszeichnung oder einen geteilten Rekord.
      const ids = players.filter(p => sichtbar(p)).map(p => p.id);
      const sammeln = {};
      const dazu = o => Object.keys(o).forEach(k => {
        if(Array.isArray(o[k])) sammeln[k] = (sammeln[k] || []).concat(o[k]);
        else if(typeof o[k] === 'number') sammeln[k] = (sammeln[k] || 0) + o[k];
        else if(typeof o[k] === 'boolean') sammeln[k] = (sammeln[k] === undefined ? true : sammeln[k]) && o[k];
        else if(sammeln[k] === undefined || o[k] !== 'fehlt') sammeln[k] = o[k]; });
      ids.forEach(pid => {
      showPlayer(pid);
      const sh = document.querySelector('#sheet');
      const anim = (e, pseudo) => e ? getComputedStyle(e, pseudo).animationName : 'fehlt';
      const bahn = e => { const b = e.querySelector(':scope > .glanz-bahn'); return b ? anim(b, '::after') : 'ohne'; };
      const alle = sel => [...sh.querySelectorAll(sel)];
      const endlosFremd = [];
      document.getAnimations().forEach(a => {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
        if(t.iterations !== Infinity || !a.effect.target || !a.effect.target.closest('#sheet')) return;
        const props = new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k))
          .filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)));
        [...props].filter(k => k !== 'transform' && k !== 'opacity').forEach(k => endlosFremd.push((a.animationName || '?') + ':' + k));
      });
      const quote = sh.querySelector('.pp-k.f'), quoteV = quote ? parseFloat(quote.textContent) / 100 : -1;
      const rel = alle('.pp-r-rich').filter(r => r.querySelector('.stat .v'));
      const geteilt = alle('.chron-one .shared');
      const out = {
        rand:anim(sh.querySelector('.pp-header .pp-rand i')),
        randDa:getComputedStyle(sh.querySelector('.pp-header .pp-rand') || document.body).display,
        kurve:anim(sh.querySelector('.pp-spark path[stroke]')),
        laenge:(sh.querySelector('.pp-spark path[stroke]') || {getAttribute:()=>''}).getAttribute('pathLength'),
        ping:anim(sh.querySelector('.pp-spark .pp-ping')),
        form:alle('.pp-form .pd').map(e => anim(e)).filter(n => n === 'ppAuf').length + '/' + alle('.pp-form .pd').length,
        monat:anim(sh.querySelector('.chron-cell.live'), '::before'),
        rang:anim(sh.querySelector('.pp-rj-tier.active .pp-rj-dot'), '::after'),
        titel:alle('.pp-tr').map(bahn), rekorde:alle('.chron-one:not(.schatten):not(.next)').map(bahn),
        schatten:alle('.chron-one.schatten').map(bahn), platz1:alle('.pp-sn.gold').map(bahn),
        andereSaison:alle('.pp-sn:not(.gold)').map(bahn).filter(n => n !== 'ohne').length,
        legendaer:alle('.pp-bmini.legendary').map(bahn),
        andereAuszeichnung:alle('.pp-bmini:not(.legendary)').map(bahn).filter(n => n !== 'ohne').length,
        quote:quote ? Math.abs(parseFloat(quote.style.getPropertyValue('--q')) - quoteV) : 0,
        beziehungen:rel.length && rel.every(r => { const v = parseFloat(r.querySelector('.stat .v').textContent) / 100;
          return Math.abs(parseFloat(r.style.getPropertyValue('--q')) - v) < .006; }),
        geteilt:geteilt.length, geteiltGanz:geteilt.every(e => e.scrollWidth <= e.clientWidth + 1
          && e.closest('.n').scrollWidth <= e.closest('.n').clientWidth + 1),
        endlosFremd:[...new Set(endlosFremd)],
        imBlatt:document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest
          && a.effect.target.closest('#sheet .pp-root') && a.playState === 'running').length
      };
      // Eine Beziehung ohne Quote und ein Monat ohne laufenden Eintrag
      // sind kein Befund; gezählt wird, was da ist.
      if(!rel.length) delete out.beziehungen;
      if(out.monat === 'fehlt') delete out.monat;
      if(out.ping === 'fehlt') { delete out.ping; delete out.kurve; delete out.laenge; }
      closeSheet(true);
      dazu(out);
      });
      return sammeln;
    })())`));
  });
  const pl = await lebt();
  ok(pl.rand === 'ppRandLauf' && pl.kurve === 'ppKurve' && pl.laenge === '1' && pl.ping === 'ppPing'
     && /^(\d+)\/\1$/.test(pl.form) && pl.monat === 'ppAtem' && pl.rang === 'ppRangRing',
     'im Profil läuft das Licht am Rand, die Kurve zeichnet sich, die Form springt auf, Monat und Rang atmen',
     JSON.stringify({rand:pl.rand, kurve:pl.kurve, laenge:pl.laenge, ping:pl.ping, form:pl.form, monat:pl.monat, rang:pl.rang}));
  ok(pl.titel.length > 0 && pl.titel.every(n => n === 'glanzZug') && pl.rekorde.length > 0 && pl.rekorde.every(n => n === 'glanzZug')
     && pl.schatten.every(n => n === 'ohne') && pl.platz1.every(n => n === 'glanzZug') && pl.andereSaison === 0
     && pl.legendaer.length > 0 && pl.legendaer.every(n => n === 'glanzZug') && pl.andereAuszeichnung === 0,
     'das Lauflicht liegt über jedem Titel, gehaltenen Rekord, Platz 1 und jeder legendären Auszeichnung, sonst nirgends',
     JSON.stringify({titel:pl.titel.length, rekorde:pl.rekorde.length, schatten:pl.schatten, platz1:pl.platz1.length,
       andere:pl.andereSaison + pl.andereAuszeichnung, legendaer:pl.legendaer.length}));
  ok(pl.quote < .006 && pl.beziehungen,
     'die Siegquote und jede Beziehung tragen ihre Quote als Balken', JSON.stringify({quote:pl.quote, bez:pl.beziehungen}));
  ok(pl.geteilt > 0 && pl.geteiltGanz,
     '„zu zweit gehalten" steht ganz da und schneidet den Namen des Rekords nicht ab', pl.geteilt + ' Marken');
  ok(!pl.endlosFremd.length, 'was im Profil endlos läuft, bewegt nur transform und opacity', pl.endlosFremd.join(', '));
  await page.emulateMedia({reducedMotion: 'reduce'});
  const plRuhig = await lebt();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(plRuhig.imBlatt === 0 && plRuhig.randDa === 'none' && plRuhig.titel.every(n => n === 'none'),
     'bei Bewegungsruhe steht im Profil alles still', JSON.stringify({laufen:plRuhig.imBlatt, rand:plRuhig.randDa}));

  // ── Der Ring trägt jedes Zeichen [§13.7] ────────────────────────────
  // Am Avatar stand nur der Zustand mit der höchsten Priorität: wer Player
  // of the Week, Team of the Season und Player of the Day zugleich war,
  // zeigte eins davon. Gemessen mit zwei bis fünf gesetzten Zuständen: jedes
  // Zeichen sitzt auf dem Ring, keins auf einem anderen, keins oben mittig
  // auf der Krone oder unten auf dem Schild; die Zeile darunter nennt einen
  // und klappt zu allen auf; Lob und Niederlagenserie zugleich lassen den
  // Ring zwischen beiden Farben wechseln, nur über die Deckkraft.
  await page.setViewportSize({width:360, height:800});
  const ringFaelle = JSON.parse(await K(`(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms)), R = avatarRings(), out = [];
    const faelle = [['potw','abyss'], ['potw','potd','tots'], ['champ','potw','potd','tots'], ['champ','blaze','potw','potd','tots']];
    for(let f = 0; f < faelle.length; f++){
      const id = players[f + 1].id;
      R[id] = faelle[f].map(k => ({kind:k, prio:AV_RINGS[k].prio, tone:AV_RINGS[k].tone, ic:AV_RINGS[k].ic,
        label:AV_RINGS[k].label, sub:'Probe'})).sort((a, b) => b.prio - a.prio);
      closeSheet(true); showPlayer(id); await warte(1500);
      const sh = document.querySelector('#sheet .pp-root'), w = sh.querySelector('.pp-av-wrap');
      const rb = w.querySelector('.pp-av-ring').getBoundingClientRect();
      const cx = rb.x + rb.width / 2, cy = rb.y + rb.height / 2;
      const m = [...w.querySelectorAll('.pp-av-mark')].map(e => { const b = e.getBoundingClientRect();
        const x = b.x + b.width / 2 - cx, y = b.y + b.height / 2 - cy;
        return {w:Math.atan2(x, -y) * 180 / Math.PI, r:Math.hypot(x, y), d:b.width, x, y}; });
      let ueber = 0;
      m.forEach((a, i) => m.slice(i + 1).forEach(b => { if(Math.hypot(a.x - b.x, a.y - b.y) < (a.d + b.d) / 2) ueber++; }));
      const zeilen = () => [...sh.querySelectorAll('.pp-ring-rest .pp-ring-chip')].filter(e => e.getClientRects().length).length;
      const knopf = sh.querySelector('[data-ringe]'), vor = zeilen();
      if(knopf) knopf.click();
      await warte(500);
      const nach = zeilen(), cs = getComputedStyle(w.querySelector('.pp-av-ring'), '::after');
      // Zwei Animationen auf \`transform\` an einem Element rechnet Chromium
      // jedes Bild im Hauptthread, auch wenn eine davon längst steht und nur
      // ihren Endwert hält: Kommen und Atmen der Zeichen kosteten so 110
      // statt 10 ms je Sekunde, solange das Profil offen war.
      const proZiel = new Map();
      document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest
          && a.effect.target.closest('#sheet .pp-root') && a.effect.getKeyframes().some(k => 'transform' in k))
        .forEach(a => { const z = a.effect.target, ps = a.effect.pseudoElement || '';
          if(!proZiel.has(z)) proZiel.set(z, {});
          const e = proZiel.get(z); (e[ps] = e[ps] || []).push(a.animationName); });
      const doppelt = [];
      proZiel.forEach((e, z) => Object.entries(e).forEach(([ps, l]) => { if(l.length > 1) doppelt.push(z.className + ps + ':' + l.join('+')); }));
      out.push({n:faelle[f].length, marken:m.length, ringR:rb.width / 2, doppelt,
        aufRing:m.every(x => Math.abs(x.r - rb.width / 2) <= 6),
        frei:m.every(x => Math.abs(x.w) >= 25 && 180 - Math.abs(x.w) >= 25), ueber,
        plus:knopf ? knopf.querySelector('.pp-ring-mehr').textContent.trim() : '', vor, nach,
        offen:knopf && knopf.getAttribute('aria-expanded'), zwei:w.classList.contains('ring-zwei'),
        wechsel:cs.animationName });
    }
    closeSheet(true); invalidateCache();
    return JSON.stringify(out);
  })()`));
  ok(ringFaelle.every(f => f.marken === f.n && f.aufRing && f.frei && f.ueber === 0),
     'jedes Zeichen steht auf dem Ring, keins auf einem anderen, oben und unten mittig bleibt frei',
     JSON.stringify(ringFaelle.map(f => ({n:f.n, marken:f.marken, aufRing:f.aufRing, frei:f.frei, ueber:f.ueber}))));
  ok(ringFaelle.every(f => f.plus === '+' + (f.n - 1) && f.vor === 0 && f.nach === f.n - 1 && f.offen === 'true'),
     'die Zeile unter dem Namen nennt einen Zustand und klappt zu allen auf',
     JSON.stringify(ringFaelle.map(f => ({plus:f.plus, vor:f.vor, nach:f.nach, offen:f.offen}))));
  ok(ringFaelle.every(f => !f.doppelt.length),
     'kein Element im Profil trägt zwei Animationen auf transform zugleich',
     JSON.stringify([...new Set(ringFaelle.flatMap(f => f.doppelt))]));
  ok(ringFaelle[0].zwei && ringFaelle[0].wechsel === 'ppRingWechsel' && ringFaelle.slice(1).every(f => !f.zwei),
     'Lob und Niederlagenserie zugleich: der Ring wechselt zwischen beiden Farben, sonst nicht',
     JSON.stringify(ringFaelle.map(f => ({zwei:f.zwei, wechsel:f.wechsel}))));

  // ── Der Beiname als Banner [§C39] ──────────────────────────────────
  // Die laufende Chronik stand als gestrichelte Pille unter dem Namen und
  // sah aus wie ein Knopf, der noch lädt. Jetzt ein Band mit gefalteten
  // Enden, so hoch wie die Pille davor, ohne Strich, mit einem Glanz, der
  // nur `transform` bewegt.
  const banner = JSON.parse(await K(`(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms)), out = [];
    for(const p of players.filter(p => playerTitleBadge(p.id)).slice(0, 4)){
      closeSheet(true); showPlayer(p.id); await warte(900);
      const b = document.querySelector('#sheet .pp-banner'), pill = b && b.querySelector('.pp-title-pill');
      if(!pill){ out.push({fehlt:p.name}); continue; }
      const cs = getComputedStyle(pill), ende = w => getComputedStyle(b, w);
      out.push({live:b.classList.contains('live'), strich:cs.borderTopStyle, hoehe:+pill.getBoundingClientRect().height.toFixed(1),
        enden:[ende('::before'), ende('::after')].every(e => e.content !== 'none' && /polygon/.test(e.clipPath)),
        // Die Falte: zum Band hin fällt jedes Ende in den Schatten.
        falte:[ende('::before'), ende('::after')].every(e => (e.backgroundImage.match(/gradient/g) || []).length === 2
          && e.backgroundImage.indexOf('rgba(0, 0, 0') >= 0),
        // Deckend: unter der Tönung liegt ein Grund ohne Durchsicht, am Band
        // und an beiden Enden — durch das Band sah man den Profilkopf.
        deckend:[cs, ende('::before'), ende('::after')].every(e => { const c = e.backgroundColor;
          return c !== 'transparent' && c.indexOf('rgba(') !== 0 && c.indexOf('/') < 0; }),
        naht:getComputedStyle(pill, '::before').borderTopStyle === 'solid' && getComputedStyle(pill, '::before').borderBottomStyle === 'solid',
        glanz:getComputedStyle(pill, '::after').animationName,
        auf:[cs.animationName, ende('::before').animationName, ende('::after').animationName].join(','),
        schein:/rgba/.test(cs.textShadow) && (cs.boxShadow.match(/rgba/g) || []).length >= 4,
        striche:['::before', '::after'].every(w => getComputedStyle(b.parentNode.querySelector('.pp-title-sub'), w).content !== 'none')});
    }
    closeSheet(true);
    return JSON.stringify(out);
  })()`));
  ok(banner.length > 0 && banner.some(x => x.live) && banner.every(x => !x.fehlt && x.strich !== 'dashed' && x.enden
       && x.hoehe >= 24 && x.hoehe <= 32 && x.glanz === 'ppBannerGlanz'),
     'der Beiname steht als Banner mit gefalteten Enden unter dem Namen, ohne Strich, so hoch wie die Pille davor, mit Glanz',
     JSON.stringify(banner));
  // Und es ist ein Titel, kein Schild: die Enden fallen zum Band hin in den
  // Schatten, das Band trägt einen Lichthof und die Schrift einen Schein,
  // der Monat steht zwischen zwei Strichen. Beim Öffnen entrollt es sich,
  // danach schieben sich die Enden heraus — jede Bewegung an ihrem eigenen
  // Element [§C43].
  ok(banner.every(x => x.falte && x.schein && x.striche && x.auf === 'ppBannerAuf,ppBannerEndeL,ppBannerEndeR'),
     'das Band hat gefaltete Enden im Schatten, Lichthof, Schein und Striche um den Monat und entrollt sich beim Öffnen',
     JSON.stringify(banner.map(x => ({falte:x.falte, schein:x.schein, striche:x.striche, auf:x.auf}))));
  ok(banner.every(x => x.deckend && x.naht),
     'das Band ist deckend, an beiden Enden auch, und trägt innen eine durchgezogene Naht',
     JSON.stringify(banner.map(x => ({deckend:x.deckend, naht:x.naht}))));

  await page.setViewportSize({width:430, height:932});

  console.log('\n' + '═'.repeat(60));
  console.log(fails === 0 ? `ALLE ${checks} CHECKS BESTANDEN` : `${fails} von ${checks} CHECKS FEHLGESCHLAGEN`);
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
