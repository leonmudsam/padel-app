// §4.1b — DAS ZEICHEN, im echten Browser nachgemessen.
//
// Die beiden Aussagen am Avatar sind Geometrie, und Geometrie kann man nicht
// durch Lesen prüfen: ob die Flamme in ihrer Zeile bleibt, hängt an der Box
// in 15-zeichen.css, am Deckel ZN_SPITZE in 09c-zeichen.js UND am
// Innenabstand von .rrow in 02-ranking.css. Drei Dateien, eine Zusage —
// deshalb wird hier gerendert und gemessen, nicht behauptet.
//
// Was geprüft wird:
//   1. Alle drei Stufen entstehen und sind als Stop-Motion aufgebaut
//   2. Die Flamme bleibt in ihrer Ranglistenzeile — oben, unten, seitlich
//   3. Die Stufen sind der Größe nach getrennt (sonst sagen sie nichts)
//   4. Das Titelband bleibt in der Zeile
//   5. Die drei Metalle stehen an Platz 1, 2, 3
const fs = require('fs');
const chromium = require('./browser.js').ladeChromium();
if(!chromium){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Das Zeichen ist Geometrie; sie lässt sich nur gerendert messen.');
  console.log('  Lokal: npm install --no-save playwright-core');
  process.exit(2);
}

const html = fs.readFileSync(require('./ziel.js'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nwindow.__k = {eval: c => eval(c)};\n' + code.slice(lc);

// Die Maße hängen am CSS der App — ohne die <style>-Blöcke misst man ein
// Dokument ohne Layout und bekommt grüne Haken für nichts.
// Nur aus dem Kopf: weiter unten steht <styleSheet> in einer JS-Zeichenkette
// (der XLSX-Export), und ein gieriges <style[^>]*> greift auch das ab.
// UND: erst die HTML-Kommentare weg. Ganz oben steht ein Banner, das die
// Dateistruktur beschreibt und dabei den Text „<style>(CSS)" enthält. Wer
// darauf greift, bekommt ein CSS, das mit Banner-Müll beginnt — der Parser
// sucht dann die erste { und findet die von :root, verwirft deren Rumpf als
// kaputte Regel und damit sämtliche Design-Tokens. Alles rendert farblos,
// aber der Test wird grün, weil Maße davon nicht abhängen.
const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');

const BOOT = `
(function(){
  const stub = () => new Proxy(function(){}, {get(_,p){return p==='then'?undefined:stub()}, apply(){return stub()}});
  window.supabase = {createClient: () => ({from: () => stub(), channel: () => stub(), removeChannel(){}, rpc: () => stub()})};
  window.fetch = () => new Promise(()=>{});
  window.setInterval = () => 0;
})();
`;

let fails = 0, checks = 0;
const ok = (c, msg, det) => {
  checks++; if(!c) fails++;
  console.log((c ? '  ok  ' : '  FAIL') + '  ' + msg + (!c && det ? ' → ' + det : ''));
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 360, height: 1200}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  // Der Rumpf beginnt beim ERSTEN <body> nach dem Kopf; weiter unten steht
  // '<body' noch einmal in einer JS-Zeichenkette.
  const bodyStart = html.indexOf('<body', html.indexOf('</head>'));
  const bodyHtml = html.slice(bodyStart, html.indexOf('<script', bodyStart))
    .replace(/<script[\s\S]*?<\/script>/gi, '');
  await page.setContent('<!doctype html><html><head><meta charset="utf-8">' + styles
    + '</head>' + bodyHtml + '</body></html>');
  ok(styles.length > 10000, 'die Stile der App sind geladen', styles.length + ' Zeichen');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  ok(errors.length === 0, 'Skript lädt ohne Fehler', errors[0]);

  // ── Der Reif wird gerechnet, nicht gesucht ──────────────────────────
  // Das Wappen steht in einer Liste vielfach und ist deshalb ein `<use>`
  // auf ein Symbol im Topf [§C30]: 648 der 713 Kilobyte des News-Feeds
  // waren 76 Kopien derselben Zeichnung. Der Inhalt liegt damit im Symbol,
  // und `querySelectorAll` erreicht ihn aus der Instanz nicht mehr — der
  // Reif (`circle r=40`), an dem hier jede Geometrie hängt, war so nicht
  // mehr zu finden. Er ist aber vollständig bestimmt: die Instanz trägt ihre
  // echte Box und ihre viewBox, und `xMidYMid meet` sagt, wie das eine ins
  // andere fällt. Gemessen bleibt damit die GERENDERTE Lage.
  await page.evaluate(() => {
    window._reifBox = (wrap) => {
      const svg = wrap.querySelector('svg.ins');
      if(!svg) return null;
      const b = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      if(!vb || !vb.width || !b.width) return null;
      const s = Math.min(b.width / vb.width, b.height / vb.height);
      const ox = b.left + (b.width - vb.width * s) / 2 - vb.x * s;
      const oy = b.top + (b.height - vb.height * s) / 2 - vb.y * s;
      const R = 40, C = 50;                       // INS_R, Mitte der Zeichnung
      return {left: ox + (C - R) * s, top: oy + (C - R) * s,
              right: ox + (C + R) * s, bottom: oy + (C + R) * s,
              width: 2 * R * s, height: 2 * R * s};
    };
    // Der Topf mit Verläufen und Symbolen steht in der App AUSSERHALB von
    // `#app` und des Blatts und wird von keinem `render()` mitgenommen
    // [§C30]. Diese Suite baut ihre Seiten dagegen mit `body.innerHTML =`
    // und riss ihn damit heraus: das Wappen blieb als Verweis auf ein
    // Symbol zurück, das es nicht mehr gab, und zeichnete nichts.
    window.__topf = document.getElementById('insDefs');
    window._topfRetten = () => {
      const t = window.__topf;
      if(!t) return;
      document.querySelectorAll('#insDefs').forEach(x => { if(x !== t) x.remove(); });
      if(!t.isConnected) document.body.appendChild(t);
    };
  });
  // Die Gegenprobe zum Helfer: dasselbe Wappen einmal als Verweis und einmal
  // mit vollem Markup. Der gerechnete Reif muss den gezeichneten treffen.
  const reifProbe = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const av = '<span class="av">AB</span>';
    document.body.innerHTML = '<div id="app"><main style="padding:14px 15px">'
      + '<div class="rlist"><div class="rrow" id="rA">'
      + K('insAvWrap("zn-test", ' + JSON.stringify(av) + ', {px:52, feuer:0, titel:0})')
      + '</div><div class="rrow" id="rB"><span class="rav zn" style="--rav:52px">'
      + K('insigniumSvg("zn-test", {band:false})') + av + '</span></div></div></main></div>';
    window._topfRetten();
    const a = window._reifBox(document.getElementById('rA'));
    const voll = document.getElementById('rB');
    // Das Zeichen ist eine Zeichnung als Bild [§C30]: der Reif liegt in ihr,
    // mittig, und misst 2 · INS_R von INS_BILD_KANTE seiner Kante. Daraus folgt, wo er
    // gezeichnet ist — gemessen am gerenderten <image>.
    let echt = null;
    // Die Zeichnung ist eine Vektorgruppe auf 1000 × 1000, verschoben und
    // verkleinert [§C30]. Ihre Bildschirmmatrix sagt, wo der Reif landet.
    const g = voll.querySelector('svg.ins g[transform]');
    if(g){
      const m = g.getScreenCTM(), k = K('INS_BILD_KANTE'), halb = 40 * 1000 / k;
      echt = {left: m.a * (500 - halb) + m.e, top: m.d * (500 - halb) + m.f, width: m.a * 2 * halb};
    }
    const b = window._reifBox(voll);
    return {a, echt: echt && {left:echt.left, top:echt.top, width:echt.width}, b,
            verweis: !!document.querySelector('#rA use'),
            symbole: document.querySelectorAll('#insDefs defs > g[id]').length};
  });
  ok(reifProbe.verweis, 'das Wappen in der Liste ist ein Verweis',
     JSON.stringify(reifProbe).slice(0, 160));
  ok(reifProbe.symbole >= 1, 'die Zeichnung steht als Gruppe im Topf',
     String(reifProbe.symbole));
  ok(reifProbe.echt && reifProbe.b
     && Math.abs(reifProbe.b.left - reifProbe.echt.left) < 1.5
     && Math.abs(reifProbe.b.top - reifProbe.echt.top) < 1.5
     && Math.abs(reifProbe.b.width - reifProbe.echt.width) < 1.5,
     'der gerechnete Reif trifft den gezeichneten',
     JSON.stringify({gerechnet: reifProbe.b, gezeichnet: reifProbe.echt}));

  // ── Der Verweis zeichnet dort, wo das volle Markup zeichnet ─────────
  //    Die BOX des `<svg class="ins">` ist in beiden Fassungen dieselbe, die
  //    Zeichnung darin war es nicht: als `<symbol>` eröffnete der Verweis ein
  //    ZWEITES Koordinatensystem — das äussere `<svg>` trägt
  //    `viewBox="-22 -22 144 144"`, das `<use>` setzte darin einen Viewport
  //    bei (0,0), und der ganze Reif sass 22 von 144 Einheiten weiter unten
  //    rechts. Auf einer 52-px-Kachel sind das 8 px: das Gesicht stand oben
  //    links, der Reif unten rechts, und zwar auf JEDER Seite der App.
  //    Gemessen wird deshalb die Lage des INHALTS, nicht die der Hülle.
  const lage = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const av = '<span class="av">AB</span>';
    document.body.innerHTML = '<div id="app"><main><div class="rlist">'
      + '<div class="rrow"><span class="rav zn" id="lA" style="--rav:52px">'
      +   K('insigniumRef("zn-test", {band:false})') + av + '</span></div>'
      + '<div class="rrow"><span class="rav zn" id="lB" style="--rav:52px">'
      +   K('insigniumSvg("zn-test", {band:false})') + av + '</span></div>'
      + '</div></main></div>';
    window._topfRetten();
    const box = (sel) => {
      const el = document.querySelector(sel + ' > svg.ins');
      if(!el) return null;
      let b = null;
      el.querySelectorAll('circle,path,ellipse,rect,use,image').forEach(n => {
        let x; try { x = n.getBoundingClientRect(); } catch(e){ return; }
        if(!x || !x.width) return;
        b = b ? {l:Math.min(b.l, x.left), t:Math.min(b.t, x.top),
                 r:Math.max(b.r, x.right), u:Math.max(b.u, x.bottom)}
              : {l:x.left, t:x.top, r:x.right, u:x.bottom};
      });
      const s = el.getBoundingClientRect();
      return b ? {l:+(b.l - s.left).toFixed(1), t:+(b.t - s.top).toFixed(1),
                  w:+(b.r - b.l).toFixed(1), h:+(b.u - b.t).toFixed(1)} : null;
    };
    return {verweis: box('#lA'), voll: box('#lB'),
            use: !!document.querySelector('#lA use')};
  });
  ok(lage.use, 'die Probe zeichnet wirklich einen Verweis');
  ok(lage.verweis && lage.voll
     && Math.abs(lage.verweis.l - lage.voll.l) < 0.6
     && Math.abs(lage.verweis.t - lage.voll.t) < 0.6
     && Math.abs(lage.verweis.w - lage.voll.w) < 0.6
     && Math.abs(lage.verweis.h - lage.voll.h) < 0.6,
     'der Verweis zeichnet an derselben Stelle wie das volle Markup',
     JSON.stringify(lage));

  const K = async src => page.evaluate(s => window.__k.eval(s), src);

  console.log('\n═══ 1. DIE DREI STUFEN ═══');
  const bau = await K(`ZN_FEUER.map(s => s ? {
    bilder: s.split('class="zf ').length - 1,
    kerne:  s.split('class="zf zk ').length - 1,
    box:    s.indexOf('class="zn-fx"') >= 0
  } : null)`);
  ok(bau.length === 4 && bau[0] === null, 'Stufe 0 zeichnet nichts');
  // bilder zählt Hüllen UND Kerne, kerne nur die Kerne — je Bild eines von beiden.
  ok(bau[1] && bau[1].bilder === 4 && bau[1].kerne === 2, 'Stufe 1: zwei Bilder, je Hülle und Kern',
     JSON.stringify(bau[1]));
  ok(bau[2] && bau[2].bilder === 4 && bau[2].kerne === 2, 'Stufe 2: zwei Bilder, je Hülle und Kern',
     JSON.stringify(bau[2]));
  ok(bau[3] && bau[3].bilder === 6 && bau[3].kerne === 3, 'Stufe 3: drei Bilder, je Hülle und Kern',
     JSON.stringify(bau[3]));

  // Dieselbe Stufe muss bei jedem Aufruf dasselbe Bild liefern — sonst
  // flackert eine Zeile bei jedem Neuzeichnen anders.
  const gleich = await K(`_znBild(ZN_GEO_ZEILE,3,1,0) === _znBild(ZN_GEO_ZEILE,3,1,0)
    && _znBild(ZN_GEO_PROFIL,2,0,0) === _znBild(ZN_GEO_PROFIL,2,0,0)`);
  ok(gleich, 'die Bilder sind deterministisch (kein Math.random)');
  const verschieden = await K(`_znBild(ZN_GEO_ZEILE,3,0,0) !== _znBild(ZN_GEO_ZEILE,3,1,0)`);
  ok(verschieden, 'aufeinanderfolgende Bilder unterscheiden sich');

  console.log('\n═══ 2. DIE FLAMME BLEIBT IN IHRER ZEILE ═══');
  // Eine echte Ranglistenzeile aus dem echten CSS, je Stufe eine — und
  // zwar mit dem echten Bauteil: seit [§C27] sitzt in jeder Zeile der
  // Avatar im Wappen, und die runde Form, an der die Glut ansetzt, ist
  // nicht mehr der Avatar, sondern der Metallreif.
  await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const av = '<span class="av" style="background:#56b4e8">AB</span>';
    document.body.innerHTML = '<div id="app"><main style="padding:14px 15px">'
      + '<div class="rlist">' + [1,2,3].map(st =>
        '<div class="rrow"><span class="pos num">' + st + '</span>'
        + K('insAvWrap("zn-test", ' + JSON.stringify(av)
            + ', {px:52, feuer:' + st + ', titel:' + st + '})')
        + '<div class="rmid"><div class="rname">Stufe ' + st + '</div></div>'
        + '<div class="rval"><div class="big num">100</div></div></div>').join('')
      + '</div></main></div>';
    window._topfRetten();
  });
  await page.waitForTimeout(120);

  const mass = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.rav').forEach((zn, i) => {
      const zeile = zn.closest('.rrow').getBoundingClientRect();
      const ring = window._reifBox(zn);
      let bb = null;
      zn.querySelectorAll('.zn-fx path').forEach(p => {
        const r = p.getBoundingClientRect();
        if(r.width === 0) return;
        bb = bb ? {t: Math.min(bb.t, r.top), b: Math.max(bb.b, r.bottom),
                   l: Math.min(bb.l, r.left), r: Math.max(bb.r, r.right)}
                : {t: r.top, b: r.bottom, l: r.left, r: r.right};
      });
      const ti = zn.querySelector('.zn-ti');
      const tr = ti ? ti.getBoundingClientRect() : null;
      out.push({
        stufe: i + 1,
        ueberZeile:  +(zeile.top - bb.t).toFixed(1),   // > 0 heißt: läuft oben raus
        unterZeile:  +(bb.b - zeile.bottom).toFixed(1),
        linksRaus:   +(zeile.left - bb.l).toFixed(1),
        rechtsRaus:  +(bb.r - zeile.right).toFixed(1),
        ueberReif:   +(ring.top - bb.t).toFixed(1),    // wie hoch sie schlägt
        // > 0 hieße: die Flamme steht seitlich über den Reif hinaus.
        linksNebenReif:  +(ring.left - bb.l).toFixed(2),
        rechtsNebenReif: +(bb.r - ring.right).toFixed(2),
        griff:       +((ring.left - bb.l) + (bb.r - ring.right)).toFixed(1),
        bandRaus:    tr ? +(tr.bottom - zeile.bottom).toFixed(1) : null,
        // Alle Sterne stecken in EINEM Pfad; je Stern ein M-Befehl.
        sterne:      (((zn.querySelector('.zn-ti .zs')||{}).getAttribute
                       ? zn.querySelector('.zn-ti .zs').getAttribute('d') : '')
                      .match(/M/g) || []).length
      });
    });
    return out;
  });

  ok(mass.length === 3, 'drei Zeilen mit Wappen gerendert', 'gefunden: ' + mass.length);
  mass.forEach(x => {
    ok(x.ueberZeile < 0 && x.unterZeile < 0 && x.linksRaus < 0 && x.rechtsRaus < 0,
       `Stufe ${x.stufe}: Flamme bleibt in der Zeile`,
       `oben ${x.ueberZeile} unten ${x.unterZeile} links ${x.linksRaus} rechts ${x.rechtsRaus}`);
    ok(x.bandRaus !== null && x.bandRaus < 0,
       `Stufe ${x.stufe}: Titelband bleibt in der Zeile`, 'unten ' + x.bandRaus);
    // Das Feuer kommt oben heraus und sonst nirgends. Vorher stand das
    // Glutbett an den Bogenenden waagerecht neben der runden Form — zwei
    // kurze Hörner, die aussahen, als gehörten sie nicht dazu.
    ok(x.linksNebenReif <= 0 && x.rechtsNebenReif <= 0,
       `Stufe ${x.stufe}: Flamme steht seitlich nicht über den Reif hinaus`,
       `links ${x.linksNebenReif} rechts ${x.rechtsNebenReif}`);
    ok(x.ueberReif > 2,
       `Stufe ${x.stufe}: Flamme kommt oben heraus`, 'oben ' + x.ueberReif);
  });

  console.log('\n═══ 3. DIE STUFEN SIND UNTERSCHEIDBAR ═══');
  console.log(`  Höhe über der Reifkante: ${mass.map(x => x.stufe + '→' + x.ueberReif + 'px').join('  ')}`);
  ok(mass[0].ueberReif < mass[1].ueberReif && mass[1].ueberReif < mass[2].ueberReif,
     'jede Stufe schlägt höher als die davor',
     JSON.stringify(mass.map(x => x.ueberReif)));
  ok(mass[2].ueberReif - mass[0].ueberReif >= 4,
     'zwischen kleinster und größter Stufe liegen mind. 4 px',
     (mass[2].ueberReif - mass[0].ueberReif) + ' px');
  // Auch die KLEINSTE muss man sehen. Sie war einmal ein Kranz aus elf
  // kurzen Zungen und kam in einer 52-px-Zeile keine sechs Pixel über den
  // Reif — auf dem Telefon ein warmer Hauch, kein Feuer. Drei Siege in
  // Folge sind das, was die meisten überhaupt erreichen; zeigt die Stufe
  // dafür nichts, zeigt das Feuer für die meisten nichts.
  ok(mass[0].ueberReif >= 7,
     'auch die kleinste Stufe kommt sichtbar über den Reif',
     mass[0].ueberReif + ' px');
  // Der Bogen ist der eigentliche Unterschied: Stufe 3 umschließt die
  // runde Form, Stufe 1 sitzt ihr nur oben auf.
  console.log(`  seitlicher Griff um den Reif: ${mass.map(x => x.stufe + '→' + x.griff + 'px').join('  ')}`);
  ok(mass[0].griff <= mass[1].griff && mass[1].griff <= mass[2].griff,
     'jede Stufe greift mindestens so weit um den Reif wie die davor',
     JSON.stringify(mass.map(x => x.griff)));

  // Das Feuer in der Zeile ist das des Profils: dieselbe Rangfarbe, derselbe
  // helle Kern. Es brannte in der Rangliste orange mit warmem Kern und im
  // Profilkopf desselben Spielers in seiner Rangfarbe — zwei Bildsprachen
  // für dieselbe Serie [§C27]. Verglichen wird die gerechnete Füllung am
  // Knoten, nicht die Klasse.
  const feuerFarbe = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const box = document.createElement('div');
    // Ohne Partien hat niemand einen Rang: je Rangstufe ein Spieler, dessen
    // Rang die Stufe selbst ist, und danach wieder die echte Funktion.
    const pids = ['Legende', 'Elite', 'Stark', 'Solide', 'Einsteiger'];
    K('window.__gprAlt = getPlayerRank; getPlayerRank = pid => ({label: pid}); 0');
    const av = '<span class="av" style="background:#56b4e8">AB</span>';
    box.innerHTML = pids.map(pid => {
      const t = JSON.parse(K('JSON.stringify(rangTon(' + JSON.stringify(pid) + '))'));
      return '<div class="rrow" data-pid="' + pid + '">'
        + K('insAvWrap(' + JSON.stringify(pid) + ', ' + JSON.stringify(av) + ', {px:52, feuer:2})')
        + '</div><div class="pp-root" data-pid="' + pid + '" style="--ak:' + t.c + ';--ak-rgb:' + t.rgb + '">'
        + '<div class="pp-av-wrap zn-rang zn-l2">' + K('ZN_FEUER_GROSS[2]') + '</div></div>';
    }).join('');
    document.body.appendChild(box);
    const out = pids.map(pid => {
      const zeile = box.querySelector('.rrow[data-pid="' + pid + '"] .zn-fx .zf:not(.zk)');
      const kopf = box.querySelector('.pp-root[data-pid="' + pid + '"] .zn-fx .zf:not(.zk)');
      const kern = box.querySelector('.rrow[data-pid="' + pid + '"] .zn-fx .zk');
      return {pid, zeile: zeile && getComputedStyle(zeile).fill,
              kopf: kopf && getComputedStyle(kopf).fill,
              kern: kern && getComputedStyle(kern).fill};
    });
    box.remove();
    K('getPlayerRank = window.__gprAlt; 0');
    return out;
  });
  const anders = feuerFarbe.filter(x => !x.zeile || x.zeile !== x.kopf);
  ok(feuerFarbe.length > 0 && anders.length === 0,
     'das Feuer der Ranglistenzeile trägt dieselbe Rangfarbe wie im Profil',
     JSON.stringify(anders.length ? anders.slice(0, 3) : feuerFarbe.map(x => x.zeile)));
  ok(feuerFarbe.every(x => x.zeile !== 'rgb(255, 143, 74)' && x.kern === 'rgb(255, 255, 255)'),
     'kein oranges Feuer und ein heller Kern wie im Profil',
     JSON.stringify(feuerFarbe.slice(0, 2)));

  console.log('\n═══ 4. DAS TITELBAND ═══');
  ok(mass[0].sterne === 1 && mass[1].sterne === 2 && mass[2].sterne === 3,
     'ein Stern je Titel', JSON.stringify(mass.map(x => x.sterne)));
  const viele = await K(`[6,9].map(n => ({
    sterne: (_znSterneSvg(n).split('class="zs" d="')[1]||'').split('M').length - 1,
    ziffer: _znSterneSvg(n).indexOf('zn-ti-n') >= 0
  }))`);
  ok(viele.every(v => v.sterne === 5 && v.ziffer),
     'ab sechs Titeln fünf Sterne plus Ziffer', JSON.stringify(viele));
  ok(await K(`_znSterneSvg(0) === ''`), 'ohne Titel kein Band');

  console.log('\n═══ 5. DIE DREI METALLE ═══');
  // Erst am gerenderten Knoten — genau dieser Check war lange nicht möglich,
  // weil das Banner-Kommentar die :root-Regel gefressen hat (siehe oben).
  const geleseneToken = await page.evaluate(() => {
    const c = getComputedStyle(document.documentElement);
    return {gold: c.getPropertyValue('--gold').trim(),
            silber: c.getPropertyValue('--silber').trim(),
            bronze: c.getPropertyValue('--bronze').trim(),
            ink: c.getPropertyValue('--ink').trim()};
  });
  ok(geleseneToken.gold && geleseneToken.silber
     && geleseneToken.bronze && geleseneToken.ink,
     'die Tokens kommen im Browser an', JSON.stringify(geleseneToken));
  // Und dann am Quelltext, damit die Werte selbst festgenagelt sind.
  const cssText = styles;
  const metalle = {gold: /--gold:\s*#f7cf4a/i.test(cssText),
                   silber: /--silber:\s*#C2C9D0/i.test(cssText),
                   bronze: /--bronze:\s*#C08457/i.test(cssText)};
  ok(metalle.gold && metalle.silber && metalle.bronze,
     'alle drei Metalle sind Tokens', JSON.stringify(metalle));
  // Das Metall steht an der Platzziffer. Ein Strich links an der Kante kam
  // dazu und wieder weg: auf dem Telefon wirkte er wie ein Fehler.
  const raeder = {
    top1: /\.rrow\.top1 \.pos\{color:var\(--gold\)\}/.test(cssText),
    top2: /\.rrow\.top2 \.pos\{color:var\(--silber\)\}/.test(cssText),
    top3: /\.rrow\.top3 \.pos\{color:var\(--bronze\)\}/.test(cssText),
    strich: /\.rrow\.top[123]::before/.test(cssText)
  };
  ok(raeder.top1 && raeder.top2 && raeder.top3 && !raeder.strich,
     'Platz 1, 2, 3 tragen Gold, Silber, Bronze an der Ziffer, ohne Strich an der Kante', JSON.stringify(raeder));
  // Kein Nachzügler: Silber und Bronze dürfen nirgends mehr als Rohwert stehen.
  const alteToene = (cssText.match(/#c8d0cb|#cd7f32|#c0c0c0|#cdd5d0|#d49158/gi) || []);
  ok(alteToene.length === 0, 'keine alten Silber-/Bronzetöne mehr im CSS',
     alteToene.join(' '));

  console.log('\n═══ 6. DIE MASKE LEBT ═══');
  // Der Ausblender ist das, was den Unterschied zwischen „Flamme" und
  // „abgeschnittener Zackenkranz" macht. Er stand lange als
  // radial-gradient(circle 52% ...) im CSS — ein circle darf laut Spec keinen
  // Prozentradius tragen, Chromium verwirft die ganze Deklaration, und
  // mask-image wird none. Malflächen ändern sich davon nicht, also lief der
  // Fehler unter allen bisherigen Checks durch. Darum hier direkt gemessen.
  const maske = await page.evaluate(() => {
    const fx = document.querySelector('.zn-fx');
    if(!fx) return {fehlt: true};
    const c = getComputedStyle(fx);
    return {wert: c.maskImage || c.webkitMaskImage};
  });
  ok(!maske.fehlt, 'im Dokument steht ein Feuer', JSON.stringify(maske));
  ok(maske.wert && maske.wert !== 'none',
     'die Maske ist gültiges CSS und wird angewandt', JSON.stringify(maske));
  ok(!/\bcircle\s+[\d.]+%/.test(cssText),
     'kein circle mit Prozentradius mehr im CSS',
     (cssText.match(/circle\s+[\d.]+%/g) || []).join(' '));

  console.log('\n═══ 7. DAS FEUER AM INSIGNIUM ═══');
  // Die runde Form, an der die Glut ansetzt, ist NICHT der Avatar, sobald
  // ein Wappen um ihn liegt. Welche es ist, hängt von der Größe ab — und
  // beide Antworten sind hier festgenagelt, weil jede von ihnen schon
  // einmal falsch war:
  //
  //   PODEST (92 px)   — der Metallreif. Der Kranz ist bei dieser Größe nur
  //                      ein Blätterrand; setzt die Glut an ihm an, steht
  //                      sie als gezackter Kragen um das ganze Wappen und
  //                      stößt oben an den Kartenrand. Sie gehört auf den
  //                      Reif, und nur die Zungen steigen darüber hinaus.
  //
  //   PROFILKOPF (242 px) — der Kranz. Am Reif liegt das ganze Feuer unter
  //                      Blättern und Schwingen; sichtbar bleibt ein
  //                      Streifen von neun Einheiten, und nach dem
  //                      Weichzeichnen ist davon nichts mehr übrig. Genau
  //                      so war die Serie im Profil unsichtbar.
  //                      Am Kranz muss dafür das Bett weggeschnitten sein —
  //                      der Kranz ist keine Scheibe, er hat Lücken, und
  //                      durch die stand das Bett früher als Kragen.
  //
  // Gemeinsam bleibt: seitlich steht nichts über die Bezugsform hinaus,
  // oben kommen die Zungen sichtbar heraus.
  // Der Kranz misst 51 der 144 Einheiten, der Reif 40 — der Kranzradius ist
  // also das 1,275-fache des Reifradius.
  const insMass = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const F = K('ZN_FEUER');
    // Der Profilkopf nimmt den zweiten Satz: dieselben Zungen ohne Glutbett.
    const G = K('ZN_FEUER_GROSS');
    const av = '<span class="av" style="background:#56b4e8">AB</span>';
    const mit = K('insigniumSvg("zn-test")');
    document.body.innerHTML = '<div id="app"><main style="padding:14px 15px">'
      + '<div class="podest"><div class="pod-karte gold erster">'
      +   '<div class="pod-platz num">01</div>'
      +   K('insAvWrap("zn-test", ' + JSON.stringify(av)
            + ', {px:92, band:true, pos:1, feuer:1, titel:1, klasse:"pod-av"})')
      +   '<div class="pod-name">Test</div><div class="pod-wert num">400</div>'
      + '</div></div>'
      + '<div class="pp-av-wrap zn-rang zn-l1">'
      +   G[1] + mit
      +   '<div class="pp-av-ring"><div class="av" style="width:108px;height:108px">AB</div></div>'
      + '</div></main></div>';
    window._topfRetten();
    const messen = (wrapSel) => {
      const wrap = document.querySelector(wrapSel);
      if(!wrap) return null;
      const ring = window._reifBox(wrap);
      let bb = null;
      wrap.querySelectorAll('.zn-fx path').forEach(p => {
        const r = p.getBoundingClientRect();
        if(r.width === 0) return;
        bb = bb ? {t: Math.min(bb.t, r.top), l: Math.min(bb.l, r.left), r: Math.max(bb.r, r.right)}
                : {t: r.top, l: r.left, r: r.right};
      });
      if(!ring || !bb) return null;
      const karte = wrap.closest('.pod-karte');
      const rr = ring.width / 2, cx = ring.left + rr, kr = rr * 1.275;
      const fx = wrap.querySelector('.zn-fx');
      const st = getComputedStyle(fx);
      // Wie viele Pixel eine Zeichen-Einheit misst, sagt die GERENDERTE Box:
      // 100 Einheiten sind ihre Breite. Damit lassen sich die Konstanten aus
      // 09c-zeichen.js gegen echte Maße im Dokument halten — genau das ist
      // die Verbindung, die vorher niemand geprüft hat.
      const proEinheit = fx.getBoundingClientRect().width / 100;
      const avRing = wrap.querySelector('.pp-av-ring');
      return {
        // > 0 hieße: die Glut steht seitlich über den Reif hinaus.
        linksNebenReif:  +(ring.left - bb.l).toFixed(2),
        rechtsNebenReif: +(bb.r - ring.right).toFixed(2),
        ueberReif:       +(ring.top - bb.t).toFixed(1),
        // Dasselbe gegen den Lorbeerkranz — die Bezugsform im Profilkopf.
        linksNebenKranz:  +((cx - kr) - bb.l).toFixed(2),
        rechtsNebenKranz: +(bb.r - (cx + kr)).toFixed(2),
        ueberKranz:       +(((ring.top + rr) - kr) - bb.t).toFixed(1),
        // > 0 hieße: sie läuft oben aus der Karte heraus.
        ausKarte: karte ? +(karte.getBoundingClientRect().top - bb.t).toFixed(1) : null,
        weich: (st.filter || '').includes('blur'),
        // Das Glutbett ist der EINZIGE Bogen in der Zeichnung (_znBett zieht
        // zwei A-Kommandos, die Zungen nur Q-Kurven). Steht kein A im d, gibt
        // es kein Bett — und ohne Bett braucht es keine Maske, die es
        // wegschneidet, und ohne diese Maske keine kreisrunde Kante.
        bogen: [...wrap.querySelectorAll('.zn-fx path')]
          .some(p => /A\s*\d/.test(p.getAttribute('d') || '')),
        maskeAus: (st.maskImage || st.webkitMaskImage || 'none') === 'none',
        proEinheit: +proEinheit.toFixed(3),
        avatarR: avRing ? +(avRing.getBoundingClientRect().width / 2).toFixed(1) : null,
        kranzR: +kr.toFixed(1)
      };
    };
    return {podest: messen('.pod-av'), profil: messen('.pp-av-wrap')};
  });
  await page.waitForTimeout(60);

  const P = insMass.podest, Q = insMass.profil;
  ok(P !== null, 'Podest: Reif und Flamme sind messbar', JSON.stringify(P));
  ok(Q !== null, 'Profilkopf: Reif und Flamme sind messbar', JSON.stringify(Q));

  if(P){
    ok(P.linksNebenReif <= 0 && P.rechtsNebenReif <= 0,
       'Podest: die Glut liegt auf dem Reif, nicht als Kragen darum',
       `links ${P.linksNebenReif} rechts ${P.rechtsNebenReif}`);
    ok(P.ueberReif > 2, 'Podest: die Zungen steigen oben aus dem Reif heraus',
       'oben ' + P.ueberReif);
    ok(P.weich, 'Podest: die Zungen sind weichgezeichnet (sonst harte Dreiecke)');
    ok(P.bogen,
       'Podest: das Glutbett verbindet die Füße der Zungen — ohne es stehen sie als Stacheln da',
       'Bogen im Pfad: ' + P.bogen);
  }
  if(Q){
    // Zwei Pixel Zugabe: der Weichzeichner trägt die Kante ein Stück nach außen.
    ok(Q.linksNebenKranz <= 2 && Q.rechtsNebenKranz <= 2,
       'Profilkopf: die Glut steht seitlich nicht über den Kranz hinaus',
       `links ${Q.linksNebenKranz} rechts ${Q.rechtsNebenKranz}`);
    ok(Q.ueberKranz > 8,
       'Profilkopf: die Zungen steigen deutlich über den Kranz — sonst ist die Serie unsichtbar',
       'oben ' + Q.ueberKranz);
    ok(!Q.bogen,
       'Profilkopf: kein Glutbett gezeichnet — es stand als Scheibe hinter dem Kranz',
       'Bogen im Pfad: ' + Q.bogen);
    ok(Q.maskeAus,
       'Profilkopf: keine Maske — eine radiale Maske hinterlässt genau die runde Kante um den Kopf',
       'maskImage gesetzt');
    ok(Q.weich, 'Profilkopf: die Zungen sind weichgezeichnet (sonst harte Dreiecke)');
  }

  // ── Die drei Zahlen von ZN_GEO_PROFIL gegen echte Pixel ──────────────
  // Alle drei standen einmal falsch, und alle drei sieht man erst gerendert.
  // Sie hängen an ZWEI Dateien: die Konstante in 09c-zeichen.js und die
  // Boxgröße in 15-zeichen.css. Wer eine von beiden anfasst, verschiebt das
  // Verhältnis — deshalb wird hier die Konstante mit dem gemessenen Maßstab
  // in Pixel umgerechnet und gegen gemessene Formen gehalten.
  const GEO = await K(`JSON.stringify({fuss:ZN_GEO_PROFIL.fuss, lim:ZN_GEO_PROFIL.lim,
    spitze:ZN_GEO_PROFIL.spitze, bett:!!ZN_GEO_PROFIL.bett})`);
  const G = JSON.parse(GEO);
  if(Q && Q.avatarR){
    // 1. Der FUSS gehört unter eine deckende Fläche. Lag er darüber, zeichnete
    //    das Feuer seinen eigenen Kreis, und man sah ihn als hellen Bogen um
    //    den Kopf — das Hufeisen. Der Avatarring ist die einzige deckende
    //    Form im Profilkopf; der Kranz hat Lücken.
    const fussPx = G.fuss * Q.proEinheit;
    ok(fussPx < Q.avatarR,
       'Profilkopf: der Fuß der Zungen liegt unter dem Avatar — sonst zeichnet das Feuer einen eigenen Rand',
       `Fuß ${fussPx.toFixed(1)} px, Avatar ${Q.avatarR} px`);
    // 2. Seitlich ist am Kranz Schluss. Das ist der Umriss, an dem sich das
    //    Feuer auszurichten hat.
    const limPx = G.lim * Q.proEinheit;
    ok(limPx <= Q.kranzR,
       'Profilkopf: der seitliche Deckel bleibt im Lorbeerkranz',
       `Deckel ${limPx.toFixed(1)} px, Kranz ${Q.kranzR} px`);
    // 3. Und es muss sich lohnen: die längste Spitze reicht mindestens das
    //    1,8-fache des Kranzradius. Vorher war es das 1,6-fache — und davon
    //    blieb hinter Kranz und Schwingen fast nichts sichtbar.
    const spitzePx = G.spitze * Q.proEinheit;
    ok(spitzePx / Q.kranzR >= 1.8,
       'Profilkopf: die Spitze reicht mindestens das 1,8-fache des Kranzradius',
       `${(spitzePx / Q.kranzR).toFixed(2)}-fach`);
    ok(!G.bett,
       'Profilkopf: die Geometrie zeichnet kein Glutbett');
  }
  // Nicht nur „drin", sondern mit Luft: bei der alten Größe endete die
  // Spitze exakt auf der Kartenkante, und der Rahmen lief quer durch sie.
  ok(insMass.podest && insMass.podest.ausKarte !== null && insMass.podest.ausKarte < -4,
     'Podest: zwischen Flammenspitze und Kartenrand bleibt Luft',
     insMass.podest ? 'oben ' + insMass.podest.ausKarte : 'nicht gemessen');


  console.log('\n═══ 6. DIE SERIE IN DEN FORMPUNKTEN ═══');
  // Die Punkte einer laufenden Serie brennen mit. Das ist eine geometrische
  // Behauptung: die Flamme darf über dem Punkt stehen, aber nicht in die
  // Zeile darüber ragen — dort steht die Bilanz.
  await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    document.body.innerHTML = '<div id="app"><main style="padding:14px 15px">'
      + '<div class="rlist"><div class="rrow"><span class="pos num">1</span>'
      + '<div class="rmid"><div class="rname">Test</div>'
      + '<div class="rmeta"><span>9–2</span></div>'
      + '<div class="form-dots">' + K('formDotsHtml([true,false,true,true,true], 3)')
      + '</div></div>'
      + '<div class="rval"><div class="big num">100</div></div></div></div>'
      + '</main></div>';
    window._topfRetten();
  });
  await page.waitForTimeout(120);

  const glut = await page.evaluate(() => {
    const zeile = document.querySelector('.form-dots');
    const dots = [...zeile.querySelectorAll('.dot')];
    const d = dots[dots.length - 1];
    const db = d.getBoundingClientRect();
    const a = getComputedStyle(d, '::before'), b = getComputedStyle(d, '::after');
    const spitze = s => parseFloat(s.bottom) + parseFloat(s.height) - db.height;
    const oben = zeile.previousElementSibling;
    return {
      brennend: dots.filter(x => x.classList.contains('glut')).length,
      ersterBrennt: dots[0].classList.contains('glut'),
      ueber1: Math.round(spitze(a) * 100) / 100,
      ueber2: Math.round(spitze(b) * 100) / 100,
      luft: Math.round((zeile.getBoundingClientRect().top - oben.getBoundingClientRect().bottom) * 100) / 100,
      punktFarbe: getComputedStyle(d).backgroundColor,
      acid: getComputedStyle(document.documentElement).getPropertyValue('--acid').trim()
    };
  });

  // 1. Nur die Punkte der Serie brennen — der verlorene ganz links nicht.
  // Der erste Punkt ist ein SIEG, gehört aber nicht zur laufenden Serie —
  // dazwischen liegt eine Niederlage. Brennte er mit, hieße das Feuer nur
  // noch „gewonnen" und nicht mehr „gerade am Stück".
  ok(glut.brennend === 3 && !glut.ersterBrennt,
     'Formpunkte: es brennen genau die Punkte der laufenden Serie',
     glut.brennend + ' von 5, erster Sieg ' + (glut.ersterBrennt ? 'brennt' : 'kalt'));
  // 2. Die Flamme bleibt in der Lücke über der Punktzeile. Ohne diese Grenze
  //    läge ihre Spitze auf der Bilanz „9–2" darüber.
  ok(glut.ueber1 <= glut.luft && glut.ueber2 <= glut.luft,
     'Formpunkte: die Flamme ragt nicht in die Zeile darüber',
     'über dem Punkt ' + glut.ueber1 + '/' + glut.ueber2 + ' px, Luft ' + glut.luft + ' px');
  // 3. Beide Bilder sind gleich hoch. Geflackert wird über die Form —
  //    wechselnde Längen hießen, dass die Grenze nur für ein Bild gilt.
  ok(glut.ueber1 === glut.ueber2,
     'Formpunkte: beide Bilder der Stop-Motion sind gleich hoch',
     glut.ueber1 + ' und ' + glut.ueber2);
  // 4. Der Punkt bleibt grün. Grün und Rot sagen in dieser App die Richtung
  //    [§C25]; die Flamme liegt darüber und färbt ihn nicht um.
  ok(/^rgb\(190, *242, *100\)$/.test(glut.punktFarbe),
     'Formpunkte: der brennende Punkt bleibt grün',
     glut.punktFarbe);


  console.log('\n═══ 7. DIE LEITER DES INSIGNIUMS ═══');
  // Sieben Stufen, einundzwanzig Zeichnungen nach der Vorlage [§C30]. Was
  // hier gemessen wird, ist, ob jede Zeichnung so in der App steht, wie das
  // Zeichen es braucht — mittig, gespiegelt,
  // das Loch frei für das Gesicht, der Reif auf INS_R, nichts am Rand
  // abgeschnitten, jeder Grad sichtbar anders und die Rangfarbe da.
  const leiter = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const stufen = K('INSIGNIEN.map(x => x.key)');
    const bild = async (src, G) => {
      const b = new Image(); b.src = src; await b.decode();
      const c = document.createElement('canvas'); c.width = c.height = G;
      const x = c.getContext('2d', {willReadFrequently:true});
      x.drawImage(b, 0, 0, G, G);
      return x.getImageData(0, 0, G, G).data;
    };
    // Die Zeichnung als eigenständige Datei, zum Rastern: die App stellt sie
    // als Vektor ins Dokument [§C30], gemessen wird sie für sich.
    K("window.izDatei = (k, g) => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent("
      + "'<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\">' + (t => t.defs + t.bild)(_izTeile(k, g, INS_RANGFARBE[INS_BILD_RANG])) + '</svg>')))");
    const svgBild = (k, g, rang) => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(
      K('insigniumStufeSvg(' + JSON.stringify(k) + ', ' + JSON.stringify(rang || 'Elite') + ', '
        + g + ', {eigen:true})')
      .replace(/<circle data-schein[^>]*\/>/g, '')
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" '))));
    const G = 160, out = [], urls = new Set();
    let n = 0;
    for(const k of stufen){
      const liste = K('INS_ZEICHEN[' + JSON.stringify(k) + '].map((_, g) => izDatei(' + JSON.stringify(k) + ', g))');
      for(let g = 0; g < liste.length; g++){
        n++; urls.add(liste[g]);
        const d = await bild(liste[g], G);
        const A = (x, y) => d[(y*G + x)*4 + 3];
        let sx = 0, sa = 0, spiegel = 0, loch = 0, lochN = 0;
        for(let y = 0; y < G; y++) for(let x = 0; x < G; x++){
          const a = A(x, y); sx += a * x; sa += a;
          spiegel += Math.abs(a - A(G - 1 - x, y));
          const r = Math.hypot(x - G/2 + .5, y - G/2 + .5) / G;
          if(r < .19){ lochN++; if(a > 40) loch++; }
        }
        // Der Reif: um 23,5 % der Kante (22 bis 25 %) muss rundum Metall liegen.
        let ring = 0;
        for(let w = 0; w < 72; w++){
          const ang = w / 72 * Math.PI * 2;
          let m = 0;
          for(let rr = .22; rr <= .25; rr += .005)
            m = Math.max(m, A(Math.round(G/2 - .5 + Math.cos(ang) * G * rr), Math.round(G/2 - .5 + Math.sin(ang) * G * rr)));
          if(m > 100) ring++;
        }
        // Und im fertigen Zeichen: am Rand der Zeichenfläche nichts, das
        // abgeschnitten würde.
        const z = await bild(svgBild(k, g), 144);
        let rand = 0;
        for(let i = 0; i < 144; i++) for(const [x, y] of [[i,0],[i,143],[0,i],[143,i]])
          if(z[(y*144 + x)*4 + 3] > 60) rand++;
        out.push({k, g, versatz: +((sx / sa + .5) / G - .5).toFixed(3),
                  spiegel: +(spiegel / 2 / sa).toFixed(3),
                  loch: +(loch / lochN).toFixed(3), ring: +(ring / 72).toFixed(2), rand});
      }
    }
    // Jeder Grad ist bei 52 px sichtbar anders als der vorige.
    const klein = {};
    for(const k of stufen){
      klein[k] = [];
      for(const u of K('INS_ZEICHEN[' + JSON.stringify(k) + '].map((_, g) => izDatei(' + JSON.stringify(k) + ', g))')) klein[k].push(await bild(u, 52));
    }
    const unterschied = (a, b) => {
      let d = 0, n = 0;
      for(let i = 0; i < a.length; i += 4){
        const ab = Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]) + Math.abs(a[i+3]-b[i+3]);
        if(ab > 30) d++;
        if(a[i+3] > 40 || b[i+3] > 40) n++;
      }
      return n ? Math.round(d / n * 1000) / 10 : 0;
    };
    const grade = stufen.map(k => ({k, d: klein[k].slice(1).map((b, i) => unterschied(klein[k][i], b))}));
    // Die Rangfarbe ist ein Akzent: sie sitzt im Stein der Raute und muss
    // dort für die Elite violett und für die Legende golden sein. Die Lilie
    // ist Metall mit einem Schimmer — in voller Rangfarbe war sie der
    // lauteste Fleck des Zeichens.
    const farbe = async (rang, y0, y1) => {
      const z = await bild(svgBild('reif', 0, rang), 144);
      let r = 0, g = 0, b = 0, n = 0, alle = 0;
      for(let y = y0; y < y1; y++) for(let x = 64; x < 80; x++){
        const o = (y*144 + x)*4; if(z[o+3] < 160) continue;
        alle++;
        const s = Math.max(z[o], z[o+1], z[o+2]) - Math.min(z[o], z[o+1], z[o+2]);
        if(s < 60) continue;                 // nur die Farbe, nicht das Metall
        r += z[o]; g += z[o+1]; b += z[o+2]; n++;
      }
      return n ? {r: r/n, g: g/n, b: b/n, n, alle} : (alle ? {r:0, g:0, b:0, n:0, alle} : null);
    };
    return {out, n, verschieden: urls.size, grade,
            elite: await farbe('Elite', 104, 120), legende: await farbe('Legende', 104, 120),
            lilie: await farbe('Elite', 4, 30)};
  });
  const NAMEN = {reif:'Reif', schild:'Schildring', volute:'Volutenkranz',
                 zier:'Zierkranz', lorbeer:'Lorbeerreif', krone:'Kronenreif',
                 stern:'Ordensstern'};
  leiter.out.forEach(x => console.log('  ' + (NAMEN[x.k] + '            ').slice(0,13)
    + (x.g+1) + '   Versatz ' + x.versatz + '  Spiegel ' + x.spiegel + '  Loch ' + x.loch
    + '  Reif ' + x.ring + '  Rand ' + x.rand));

  ok(leiter.n === 21 && leiter.verschieden === 21,
     'Insignium: sieben Stufen mit je drei eigenen Bildern',
     leiter.n + ' Felder, ' + leiter.verschieden + ' verschiedene Bilder');
  const _schief = leiter.out.filter(x => Math.abs(x.versatz) > .01);
  ok(_schief.length === 0, 'Insignium: jedes Zeichen sitzt waagerecht mittig',
     _schief.map(x => NAMEN[x.k] + ' ' + (x.g+1) + ': ' + x.versatz).join(', ') || 'alle innerhalb 1 %');
  const _krumm = leiter.out.filter(x => x.spiegel > .06);
  ok(_krumm.length === 0, 'Insignium: jedes Zeichen ist spiegelgleich',
     _krumm.map(x => NAMEN[x.k] + ' ' + (x.g+1) + ': ' + x.spiegel).join(', ') || 'Abweichung höchstens 6 %');
  const _zu = leiter.out.filter(x => x.loch > .02);
  ok(_zu.length === 0, 'Insignium: das Loch des Reifs ist frei für das Gesicht',
     _zu.map(x => NAMEN[x.k] + ' ' + (x.g+1) + ': ' + x.loch).join(', ') || 'innerhalb 19 % der Kante nichts');
  const _ringlos = leiter.out.filter(x => x.ring < .8);
  ok(_ringlos.length === 0, 'Insignium: der Reif jedes Bildes liegt auf INS_R',
     _ringlos.map(x => NAMEN[x.k] + ' ' + (x.g+1) + ': ' + x.ring).join(', ') || 'rundum Metall bei 22 bis 25 %');
  const _raus = leiter.out.filter(x => x.rand > 0);
  ok(_raus.length === 0, 'Insignium: nichts wird am Rand der Zeichenfläche abgeschnitten',
     _raus.map(x => NAMEN[x.k] + ' ' + (x.g+1) + ': ' + x.rand + ' px').join(', ') || 'alle einundzwanzig');
  const _stumm = leiter.grade.filter(x => x.d.some(v => v < 5));
  ok(_stumm.length === 0, 'Insignium: jeder Grad ist bei 52 px sichtbar anders',
     _stumm.map(x => x.k + ' ' + x.d.join('/') + ' %').join(', ')
     || leiter.grade.map(x => x.k + ' ' + x.d.join('/')).join(' · ') + ' %');
  const E = leiter.elite, L = leiter.legende;
  ok(E && L && E.b > E.g + 25 && L.r > L.b + 25 && L.g > L.b,
     'Insignium: der Stein ist für die Elite violett und für die Legende golden',
     JSON.stringify({elite: E && [E.r, E.g, E.b].map(Math.round), legende: L && [L.r, L.g, L.b].map(Math.round)}));
  const Li = leiter.lilie;
  // Gezählt wird der Anteil farbiger Punkte an der ganzen Lilie: die Steine
  // in ihr tragen die Rangfarbe voll und sollen das auch, die Blätter nicht.
  ok(Li && Li.alle > 20 && Li.n / Li.alle < .3,
     'Insignium: die Lilie ist Metall und nicht in voller Rangfarbe',
     Li && (Li.n + ' von ' + Li.alle + ' Punkten farbig'));

  // 5. Die AURA im vollen Zeichen [§C36]. Sie ersetzt die Schwinge und liegt
  //    ganz hinten, als ein Bild um die Reifmitte. Ihre Mitte ist bis Radius
  //    184 von 1000 ausgespart, und das Insignium nimmt 70 % ihrer Fläche
  //    ein: nur dann beginnt das Licht am Reif und fällt nicht durch das
  //    Gesicht. Gemessen am gerenderten Bild, in Zeichen-Einheiten, und
  //    dazu, dass die Aura mit jedem Titel bis zehn heller wird.
  const _aura = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const h = document.createElement('div');
    h.style.cssText = 'position:absolute;left:0;top:0;width:300px';
    const out = {};
    for(const t of [0, 1, 3, 10, 14]){
      h.innerHTML = K('insigniumSvg("zn-test", {band:true, pos:1, titel:' + t + '})');
      document.body.appendChild(h);
      const im = h.querySelector('svg.ins image.aura-b');
      out[t] = im ? {x:+im.getAttribute('x'), y:+im.getAttribute('y'), w:+im.getAttribute('width'),
                     erstes:h.querySelector('svg.ins').firstElementChild === im || null,
                     href:im.getAttribute('href')} : null;
    }
    h.remove();
    // Die Helligkeit: mittlere Deckkraft des Lichts außerhalb des Lochs.
    const hell = async st => {
      const b = new Image(); b.src = K('auraHref(' + st + ')'); await b.decode();
      const c = document.createElement('canvas'); c.width = c.height = 200;
      const x = c.getContext('2d', {willReadFrequently:true}); x.drawImage(b, 0, 0, 200, 200);
      const d = x.getImageData(0, 0, 200, 200).data;
      let s = 0, loch = 0;
      for(let i = 0; i < 200 * 200; i++){
        const px = i % 200 - 100, py = Math.floor(i / 200) - 100;
        if(px * px + py * py < 34 * 34){ loch = Math.max(loch, d[i * 4 + 3]); continue; }
        s += d[i * 4 + 3];
      }
      return {mittel:+(s / (200 * 200)).toFixed(2), loch};
    };
    out.hell = [];
    for(const st of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) out.hell.push(await hell(st));
    out.seite = K('AURA_SEITE'); out.kante = K('INS_BILD_KANTE');
    return out;
  });
  const _au = _aura[3];
  ok(!_aura[0] && _au && Math.abs(_au.w - _aura.kante / .7) < .05
     && Math.abs(_au.x + _au.w / 2 - 50) < .05 && Math.abs(_au.y + _au.w / 2 - 50) < .05 && _au.erstes,
     'Aura: kein Titel, keine Aura; sonst ganz hinten, mittig und 1/0,7 so groß wie das Zeichen',
     JSON.stringify({ohne:_aura[0], drei:_au, seite:_aura.seite}));
  ok(_aura[10] && _aura[14] && _aura[10].href === _aura[14].href && _aura[1].href !== _aura[3].href,
     'Aura: zehn Stufen, je Titel eine, danach bleibt sie stehen',
     JSON.stringify({eins:!!_aura[1], zehn:!!_aura[10], vierzehn:!!_aura[14]}));
  const _steigt = _aura.hell.every((h, i, a) => i === 0 || h.mittel > a[i - 1].mittel);
  ok(_steigt && _aura.hell.every(h => h.loch === 0),
     'Aura: mit jedem Titel heller, und durch das Gesicht fällt kein Licht',
     _aura.hell.map((h, i) => (i + 1) + ':' + h.mittel + (h.loch ? ' Loch ' + h.loch : '')).join(' · '));

  // ════════════════════════════════════════════════════════════════════
  console.log('\n═══ 8. DIE TITELSTERNE STEHEN FREI ═══');
  // Die Sterne zählen die Ligatitel, und man muss sie zählen können. Sie
  // lagen mit der Schwinge im selben verkleinerten Kasten und landeten damit
  // auf dem KOPF des Insigniums — Gold auf Gold, bei neun von fünfzehn
  // Zeichnungen. Jetzt haben sie einen eigenen Streifen über dem Zeichen.
  //
  // Geprüft wird am Bild, nicht am Umriss: zwei Rechtecke, die sich schneiden,
  // sagen nichts darüber, ob sich zwei Zeichnungen überdecken — der Bogen der
  // Sterne ist breit und flach, der Kopf schmal und hoch, ihre Kästen über-
  // schneiden sich zwangsläufig. Gezählt werden Bildpunkte, an denen beide
  // etwas gezeichnet haben.
  const sternMess = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const id = 'st_';
    K('window.__c = _insSatz("Elite");');
    const vb = K('INS_BAND_BOX').split(/\s+/).map(Number);
    const B = 300, H = Math.round(B * vb[3] / vb[2]);
    const defs = K('_insDefs("' + id + '", __c, 1)');
    const raster = async (inhalt) => {
      const txt = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(' ')
        + '" width="' + B + '" height="' + H + '">' + defs + inhalt + '</svg>';
      const bild = new Image();
      bild.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt)));
      await bild.decode();
      const c = document.createElement('canvas');
      c.width = B; c.height = H;
      const ctx = c.getContext('2d', {willReadFrequently:true});
      ctx.drawImage(bild, 0, 0, B, H);
      const d = ctx.getImageData(0, 0, B, H).data;
      const a = new Uint8Array(B*H);
      for(let i = 0; i < B*H; i++) a[i] = d[i*4+3] > 40 ? 1 : 0;
      return a;
    };
    // Das Zeichen: die Stufe und die Raute. Die Aura zählt nicht dazu — sie
    // ist Licht hinter dem Zeichen, und die Sterne dürfen darauf stehen.
    const stufen = K('INSIGNIEN.map(x => x.key)');
    const sterne = {};
    for(const t of [1, 3, 5, 8, 12, 20])
      sterne[t] = await raster(K('_insSterne(' + t + ', "' + id + '")'));
    const treffer = [], leer = [];
    for(const k of stufen) for(const g of [0,1,2]){
      const z = await raster(
        K('_insStufe("' + k + '", __c, "' + id + '", ' + g + ', true)')
            .replace(/<circle data-schein[^>]*\/>/g, '')
        + K('_insFuss(3)'));
      for(const t of [1, 3, 5, 8, 12, 20]){
        let n = 0, sn = 0;
        for(let i = 0; i < z.length; i++){ if(sterne[t][i]){ sn++; if(z[i]) n++; } }
        if(!sn) leer.push(k + ' ' + (g+1) + ' / ' + t);
        if(n > 0) treffer.push(k + ' ' + (g+1) + ' / ' + t + ' Titel: ' + n);
      }
    }
    // Und der Kasten: was über die viewBox hinausragt, schneidet der Browser
    // lautlos ab — ein halber Stern sieht aus wie ein Fehler, nicht wie ein Titel.
    const h = document.createElement('div');
    h.style.cssText = 'position:absolute;left:0;top:0;width:400px';
    document.body.appendChild(h);
    const raus = [];
    let luft = 99;
    [1, 3, 5, 8, 12, 20].forEach(t => {
      h.innerHTML = '<svg viewBox="' + vb.join(' ') + '" width="400">' + defs
        + '<g id="S">' + K('_insSterne(' + t + ', "' + id + '")') + '</g></svg>';
      const b = h.querySelector('#S').getBBox();
      luft = Math.min(luft, +(b.y - vb[1]).toFixed(1));
      if(b.y < vb[1] || b.x < vb[0] || b.x + b.width > vb[0] + vb[2]) raus.push(String(t));
    });
    // Und zuletzt: sitzen sie im ZUSAMMENGESETZTEN Zeichen dort, wo sie
    // einzeln sitzen? Genau hier lag der Fehler — die Sterne standen im
    // Kasten der Schwinge und wurden mit ihr auf 78 % geschrumpft, also auf
    // den Kopf des Insigniums gezogen. Einzeln gemessen war davon nichts
    // zu sehen.
    // Gemessen wird am BILDSCHIRM, nicht mit getBBox: der Kästchenmaßstab
    // eines <g> ist sein eigener, die Verkleinerung seiner Gruppe steckt
    // nicht darin. Genau die soll hier auffallen.
    document.body.appendChild(h);
    const platz = (svgTxt, sel) => {
      h.innerHTML = svgTxt;
      const sv = h.querySelector('svg');
      sv.setAttribute('width', '400');
      sv.removeAttribute('height');
      const a = sv.getBoundingClientRect(), b = h.querySelector(sel).getBoundingClientRect();
      return {oben:+(b.top - a.top).toFixed(2), hoch:+b.height.toFixed(2)};
    };
    const allein = platz('<svg viewBox="' + vb.join(' ') + '" width="400">' + defs
      + '<g id="S">' + K('_insSterne(3, "' + id + '")') + '</g></svg>', '#S');
    const drin = platz(K('insigniumSvg("zn-test", {band:true, pos:1, titel:3})'), 'svg.ins > *:last-child');
    const versatz = +Math.max(Math.abs(drin.oben - allein.oben),
                              Math.abs(drin.hoch - allein.hoch)).toFixed(2);
    h.remove();
    return {treffer, leer, raus, luft, versatz};
  });
  console.log('  Luft über dem obersten Stern: ' + sternMess.luft + ' Einheiten');

  // 1. Kein Bildpunkt der Sterne liegt auf dem Zeichen — in keinem der
  //    einundzwanzig Bilder und bei keiner Titelzahl.
  ok(sternMess.treffer.length === 0,
     'Sterne: kein Zeichen liegt unter ihnen',
     sternMess.treffer.slice(0, 4).join(' · ')
     || '21 Zeichnungen × 6 Titelstände, keine Überdeckung');

  // 2. Und gezeichnet werden sie überhaupt. Ohne diese Zeile wäre die erste
  //    Zusicherung auch dann grün, wenn gar keine Sterne mehr kämen.
  ok(sternMess.leer.length === 0, 'Sterne: jede Titelzahl zeichnet welche',
     sternMess.leer.slice(0, 4).join(' · ') || 'von 1 bis 20 Titeln');

  // 3. Sie bleiben in der Zeichenfläche. Der Streifen über dem Zeichen ist
  //    genau dafür da; wird er zu knapp, fällt es hier auf und nicht erst
  //    auf dem Telefon.
  ok(sternMess.raus.length === 0 && sternMess.luft >= 1,
     'Sterne: der Bogen bleibt in der Bandbox',
     sternMess.raus.length ? 'ragen heraus bei ' + sternMess.raus.join(', ') + ' Titeln'
                           : sternMess.luft + ' Einheiten Luft nach oben');

  // 4. Im fertigen Zeichen stehen sie unverändert da. Sie lagen einmal im
  //    verkleinerten Kasten der Schwinge und standen damit auf dem Kopf des
  //    Insigniums; wer sie wieder in eine skalierte Gruppe legt, zieht sie
  //    dorthin, und die drei Messungen oben sähen davon nichts.
  ok(sternMess.versatz < 1,
     'Sterne: im ganzen Zeichen sitzen sie, wo sie einzeln sitzen',
     sternMess.versatz + ' px Versatz bei 400 px Zeichenbreite');

  // ══════════════════════════════════════════════════════════════════
  console.log('\n═══ 9. DAS FEUER BLEIBT IM PROFILKOPF ═══');
  // .pp-header hat overflow:hidden — es muss, denn es trägt das
  // Wasserzeichen des Fingerabdrucks und einen Verlauf auf 24 px Radius.
  // Sein Innenabstand oben ist 32 px, und die Bandbox des Zeichens füllt
  // ihn per Rechnung genau aus (12-insignium.css). Was darüber hinausragt,
  // ist allein das Feuer — und die Kartenkante schnitt es waagerecht ab.
  //
  // Deshalb rückt der Kopf für die brennenden Stufen nach unten
  // (--feuerluft in 15-zeichen.css). Ob das reicht, ist eine Frage an das
  // gerenderte Dokument: die Antwort hängt an der Zungenlänge in
  // 09c-zeichen.js, am Innenabstand in 06-misc.css und an --ins-w in
  // 12-insignium.css. Drei Dateien, eine Zusage.
  // Die drei Köpfe stehen übereinander im Dokument, und danach wird
  // GEWARTET: .pp-header und .pp-av-wrap blenden sich mit einer
  // Skalierung ein (ppFadeUp, 06-misc.css). Wer sofort mißt, mißt ein
  // Zeichen auf 93 % — und bekommt sieben Prozent Luft geschenkt, die es
  // im fertigen Bild nicht gibt.
  await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const G = K('ZN_FEUER_GROSS'), mit = K('insigniumSvg("zn-test")');
    document.body.innerHTML = '<div id="app"><main style="padding:14px 15px">'
      + [1, 2, 3].map(st =>
        '<div class="pp-root st-volute"><header class="pp-header pp-tier-elite">'
        + '<div class="pp-av-wrap zn-rang zn-l' + st + '">' + G[st] + mit
        + '<div class="pp-av-ring"><div class="av" style="width:108px;height:108px">AB</div></div>'
        + '</div><h1 class="pp-name">Stufe ' + st + '</h1></header></div>').join('')
      + '</main></div>';
    window._topfRetten();
  });
  await page.waitForTimeout(800);

  const kopfMass = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.pp-av-wrap').forEach((wrap, i) => {
      const kopf = wrap.closest('.pp-header').getBoundingClientRect();
      let bb = null;
      wrap.querySelectorAll('.zn-fx path').forEach(p => {
        const r = p.getBoundingClientRect();
        if(r.width === 0) return;
        bb = bb ? {t:Math.min(bb.t, r.top)} : {t:r.top};
      });
      const ring = window._reifBox(wrap);
      out.push({stufe:i + 1,
        // > 0 heißt: zwischen Flammenspitze und Kartenkante bleibt Luft.
        luft: +(bb.t - kopf.top).toFixed(1),
        // Die Gegenprobe: ein Feuer, das gar nicht mehr herauskommt, hätte
        // reichlich Luft nach oben und bestünde die erste Zusicherung.
        ueberReif: +(ring.top - bb.t).toFixed(1),
        // Und das Zeichen selbst darf die Skalierung nicht mehr tragen —
        // sonst ist alles darunter um sieben Prozent geschenkt.
        skala: +(wrap.querySelector('svg.ins').getBoundingClientRect().width
                 / parseFloat(getComputedStyle(wrap.querySelector('svg.ins')).width)).toFixed(3)});
    });
    return out;
  });
  ok(kopfMass.every(x => x.skala > .999),
     'Profilkopf: das Einblenden ist durch, gemessen wird das fertige Bild',
     kopfMass.map(x => x.skala).join(' '));
  console.log('  Luft zur Kartenkante: '
    + kopfMass.map(x => x.stufe + '→' + x.luft + 'px').join('  '));
  kopfMass.forEach(x => {
    ok(x.luft > 2, `Profilkopf Stufe ${x.stufe}: die Flamme wird nicht abgeschnitten`,
       'Luft ' + x.luft + ' px');
    ok(x.ueberReif > 20, `Profilkopf Stufe ${x.stufe}: die Flamme kommt über den Reif`,
       'oben ' + x.ueberReif + ' px');
  });

  console.log('\n═══ 10. DIE SIEGESSERIE STEHT NUR AM AVATAR ═══');
  // Neben dem Namen stand dieselbe laufende Serie ein zweites Mal, als
  // Flammensymbol — seit sie am Avatar brennt [§C26], sagte die Seite
  // dieselbe Zahl zweimal in zwei Bildsprachen. Für NIEDERLAGEN gibt es am
  // Avatar kein Zeichen, also behalten sie ihres.
  const inline = JSON.parse(await K(`JSON.stringify([20,9,7,5,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-9]
    .map(cs => [cs, lossStreakInline(cs)]))`));
  const siege = inline.filter(([cs]) => cs > -3);
  ok(siege.every(([, h]) => h === ''),
     'kein Zeichen neben dem Namen, solange nichts verloren ist',
     siege.filter(([, h]) => h !== '').map(([cs]) => cs).join(', '));
  const pleiten = inline.filter(([cs]) => cs <= -3);
  ok(pleiten.every(([, h]) => h.indexOf('streak-badge fire') >= 0),
     'ab drei Niederlagen steht das Zeichen da',
     pleiten.filter(([, h]) => !h).map(([cs]) => cs).join(', '));
  // Dieselben Schwellen wie beim Feuer: 3, 5, 7. Zwei Leitern mit
  // verschiedenen Stufen wären zwei Aussagen über dieselbe Sache.
  // Der Name des Symbols steht nicht im Ergebnis — geprüft wird deshalb,
  // WO es wechselt: innerhalb einer Stufe gleich, an der Schwelle anders.
  const zn = cs => inline.find(x => x[0] === cs)[1].replace(/ title="[^"]*"/, '');
  const stufig = zn(-3) === zn(-4) && zn(-5) === zn(-6) && zn(-7) === zn(-9)
              && zn(-3) !== zn(-5) && zn(-5) !== zn(-7);
  ok(stufig, 'die Tropfen steigen bei 3, 5 und 7 — wie das Feuer',
     [[-3,-4],[-5,-6],[-7,-9]].map(([a,b]) => a + '=' + b + ':' + (zn(a)===zn(b)))
       .join(' ') + ' · 3→5:' + (zn(-3)!==zn(-5)) + ' 5→7:' + (zn(-5)!==zn(-7)));
  // Und es gibt nur EIN Bauteil dafür [§C27]. Wer ein zweites baut,
  // schreibt fast sicher wieder class="streak-badge" ohne `fire`.
  const zweitZeichen = (code.match(/class="streak-badge(?! fire)/g) || []).length;
  ok(zweitZeichen === 0, 'kein zweites Zeichen neben dem Namen',
     zweitZeichen + ' Fundstellen');

  // ── Alles steht in der Mitte ───────────────────────────────────────
  // Gemessen wird die Tinte, nicht die Box: bei einem Zeichen die Geometrie
  // (getBBox, über getScreenCTM auf den Bildschirm), bei Initialen und
  // Ziffern die Glyphen (Canvas, in 200 px gemessen und zurückgerechnet —
  // Chromium rundet die Maße auf ganze Pixel). Vorher saß das Zeichen in
  // den Kacheln des Monatsrückblicks 6,5 px über der Mitte, die Initialen in
  // der Tabelle einer Partie 5,6 px, das Gesicht im Wappen des Vergleichs
  // 3,5 px über dem Reif — jedes Mal, weil eine Regel für die `span` daneben
  // auch die Kachel oder das Gesicht traf —, und 141 der 272 Zeichen des
  // Katalogs lagen schon in ihrem eigenen Feld daneben.
  {
    const {createHarness} = require('../tools/performance.cjs');
    const h = await createHarness({kontext:{reducedMotion:'reduce'}});
    try {
      await h.page.addStyleTag({url:'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap'}).catch(() => {});
      // Jedes Zeichen des Katalogs in seinem 24er-Feld.
      const katalog = await h.page.evaluate(() => {
        const ICONS = window.__perfEval('ICONS'), out = [];
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '240'); svg.setAttribute('height', '240');
        svg.style.cssText = 'position:absolute;left:0;top:0'; document.body.appendChild(svg);
        Object.keys(ICONS).forEach(k => { svg.innerHTML = ICONS[k]; const b = svg.getBBox();
          out.push({k, dx:b.x + b.width / 2 - 12, dy:b.y + b.height / 2 - 12, raus:b.x < -.01 || b.y < -.01 || b.x + b.width > 24.01 || b.y + b.height > 24.01}); });
        svg.remove(); return out;
      });
      const schief = katalog.filter(x => Math.abs(x.dx) > .5 || Math.abs(x.dy) > .5 || x.raus)
        .sort((a, b) => Math.max(Math.abs(b.dx), Math.abs(b.dy)) - Math.max(Math.abs(a.dx), Math.abs(a.dy)));
      ok(katalog.length > 200 && schief.length === 0,
        'jedes Zeichen des Katalogs steht in der Mitte seines Felds, auf eine halbe Einheit, und ragt nicht hinaus',
        schief.length + ' von ' + katalog.length + ': ' + schief.slice(0, 5).map(x => x.k + ' ' + x.dx.toFixed(1) + '/' + x.dy.toFixed(1) + (x.raus ? ' ragt hinaus' : '')).join(', '));

      const MESS = () => {
        const out = {kachel:[], wappen:[], schrift:[]};
        const sicht = e => { const r = e.getBoundingClientRect(); if(r.width < 3 || r.height < 3) return false;
          for(let x = e; x && x.nodeType === 1; x = x.parentElement){ const s = getComputedStyle(x);
            if(s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; }
          return true; };
        const rahmen = e => { if(!e || e.nodeType !== 1 || e.tagName === 'svg') return false; const s = getComputedStyle(e);
          const bg = (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none';
          const bd = ['Top', 'Right', 'Bottom', 'Left'].every(k => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none');
          return bg || bd || s.boxShadow !== 'none'; };
        const rahmenVon = (e, gr) => { for(let x = e, i = 0; x && i < 4; x = x.parentElement, i++){
            if(!rahmen(x)) continue; const r = x.getBoundingClientRect();
            return r.width <= gr * 3.2 + 8 && r.height <= gr * 3.2 + 8 && r.width <= 120 && r.height <= 120 ? x : null; } return null; };
        const name = e => { const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
          const p = e.parentElement, pc = p && typeof p.className === 'string' ? p.className.trim().split(/\s+/)[0] : '';
          return (pc ? '.' + pc + ' > ' : '') + e.tagName.toLowerCase() + (c ? '.' + c : ''); };
        const mitte = r => ({x:(r.left + r.right) / 2, y:(r.top + r.bottom) / 2});
        const abw = (a, b) => { const p = mitte(a), q = mitte(b); return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)); };
        document.querySelectorAll('svg').forEach(svg => {
          if(svg.parentElement && svg.parentElement.closest('svg')) return;
          if(!sicht(svg)) return; const r = svg.getBoundingClientRect(); if(r.width > 110 || r.height > 110) return;
          let bb; try { bb = svg.getBBox(); } catch(e){ return; } if(!bb || (bb.width < .5 && bb.height < .5)) return;
          const m = svg.getScreenCTM(); if(!m) return;
          const p = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
          const ink = {left:Math.min(...p.map(q => q.x)), right:Math.max(...p.map(q => q.x)), top:Math.min(...p.map(q => q.y)), bottom:Math.max(...p.map(q => q.y))};
          // Eine Kachel, ein Kreis, ein Chip, der nur dieses Zeichen trägt.
          const f = rahmenVon(svg.parentElement, Math.max(ink.right - ink.left, ink.bottom - ink.top));
          if(f && !f.textContent.trim() && [...f.querySelectorAll('svg')].filter(x => !x.parentElement.closest('svg') && sicht(x)).length === 1)
            out.kachel.push({n:name(f), d:abw(ink, f.getBoundingClientRect())});
        });
        document.querySelectorAll('svg.ins').forEach(svg => {
          if(!sicht(svg)) return; const av = [...svg.parentElement.children].find(c => c !== svg && (c.classList.contains('av') || c.classList.contains('rav-av')));
          if(!av || !sicht(av)) return; const m = svg.getScreenCTM(); if(!m) return;
          const p = new DOMPoint(50, 50).matrixTransform(m);
          out.wappen.push({n:name(svg.parentElement.parentElement || svg.parentElement), d:abw({left:p.x, right:p.x, top:p.y, bottom:p.y}, av.getBoundingClientRect())});
        });
        const cv = document.createElement('canvas').getContext('2d');
        document.querySelectorAll('body *').forEach(e => {
          if(e.closest('svg')) return;
          const tn = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
          if(tn.length !== 1 || [...e.children].some(c => c.textContent.trim())) return;
          let t = tn[0].textContent.trim(); if(t.length > 3 || !sicht(e)) return;
          const s = getComputedStyle(e); if(s.textTransform === 'uppercase') t = t.toUpperCase();
          const range = document.createRange(); range.selectNodeContents(tn[0]); const lr = range.getBoundingClientRect();
          const k = parseFloat(s.fontSize) / 200;
          cv.font = s.fontStyle + ' ' + s.fontWeight + ' 200px ' + s.fontFamily;
          try { cv.letterSpacing = s.letterSpacing === 'normal' ? '0px' : (parseFloat(s.letterSpacing) / k) + 'px'; } catch(x){}
          const mt = cv.measureText(t), q = v => v * k;
          const fh = q(mt.fontBoundingBoxAscent) + q(mt.fontBoundingBoxDescent);
          const y0 = lr.top + (lr.height - fh) / 2 + q(mt.fontBoundingBoxAscent);
          const ink = {left:lr.left - q(mt.actualBoundingBoxLeft), right:lr.left + q(mt.actualBoundingBoxRight), top:y0 - q(mt.actualBoundingBoxAscent), bottom:y0 + q(mt.actualBoundingBoxDescent)};
          const f = rahmen(e) ? e : rahmenVon(e.parentElement, Math.max(ink.right - ink.left, ink.bottom - ink.top));
          // Nur ein Rahmen, der allein diese Schrift trägt: ein Gesicht, ein Abzeichen.
          if(f && f.textContent.replace(/\s+/g, '').toLowerCase() === tn[0].textContent.replace(/\s+/g, '').toLowerCase()
             && ![...f.querySelectorAll('svg')].some(x => sicht(x) && x.getBoundingClientRect().width > 4))
            out.schrift.push({n:name(f) + ' «' + t + '»', d:abw(ink, f.getBoundingClientRect())});
        });
        return out;
      };
      const ZU = `try { closeBadgePopover(); } catch(e){} try { closeNewsDetail(); } catch(e){} for(let i = 0; i < 6; i++){ try { closeSheet(true); } catch(e){} } 0`;
      const ids = require('../tools/performance.cjs').fixtures.ids;
      const ANSICHTEN = [
        `tab='ranking';period='season';render()`, `tab='ranking';period='all';render()`, `tab='positions';render()`,
        `tab='awards';awView='awards';render()`, `tab='awards';awView='rekorde';rekKammer='';render()`, `tab='awards';awView='chronik';render()`,
        `tab='teams';render()`, `tab='history';histFilter='all';_histPage=0;render()`, `tab='match';render()`, `tab='settings';render()`,
        `tab='ranking';render();showPlayer('${ids[8]}')`, `showPlayer('${ids[3]}')`, `showPlayerBadges('${ids[8]}')`, `showPlayerH2HList('${ids[8]}')`,
        `showPlayerSeasons('${ids[8]}')`, `showLaufbahn('${ids[8]}')`, `showRangSystem()`, `showH2H('${ids[8]}','${ids[9]}')`,
        `showTeam('${ids[8]}','${ids[9]}')`, `showMatchDetail(matches[matches.length-1].id)`, `showPotwRecap()`, `showPotdRecap()`,
        `showSeasonRecap(seasons[seasons.length-1])`, `showPositionHistory()`, `showAward('upset')`, `openTopList('upset')`,
        `showLigaChronik()`, `showSeasonTable(seasons[seasons.length-1].id)`, `showChronicle(CHRONICLES[0].id)`,
        `showBadgePopover(getCachedBadges('${ids[8]}')[0].id,'${ids[8]}')`,
        `_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;openNewsFeed()`
      ];
      const alle = {kachel:[], wappen:[], schrift:[]}, fehlerAnsicht = [];
      const messe = async code => {
        try { await h.K(ZU); await h.K(code); } catch(e){ fehlerAnsicht.push(code.slice(0, 40) + ': ' + String(e).slice(0, 80)); return; }
        await h.page.waitForTimeout(80);
        await h.page.evaluate(() => { document.querySelectorAll('.nf-card').forEach(c => { c.style.contentVisibility = 'visible'; });
          document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} }); });
        const r = await h.page.evaluate(MESS);
        Object.keys(alle).forEach(k => alle[k].push(...r[k]));
      };
      await h.K(`tab='ranking';render();0`); await h.page.waitForTimeout(1500);
      await h.page.evaluate(() => document.fonts.ready);
      for(const c of ANSICHTEN) await messe(c);
      // Je Art eine Story im Blatt.
      const blaetter = JSON.parse(await h.K(`JSON.stringify((() => { const je = {};
        getStoriesCache().forEach(s => { const d = s.dataRef || {}, k = (d.type || '-') + ':' + (d.sub || d.quelle || d.periode || ''); if(!je[k]) je[k] = s.id; });
        return Object.values(je); })())`));
      for(const id of blaetter) await messe(`openNewsFeed(); openNewsDetail(${JSON.stringify(id)})`);
      const schlimm = (l, g) => { const je = new Map(); l.filter(x => x.d > g).forEach(x => { if(!je.has(x.n) || je.get(x.n) < x.d) je.set(x.n, x.d); });
        return [...je].sort((a, b) => b[1] - a[1]).map(([n, d]) => n + ' ' + d.toFixed(1) + ' px'); };
      const k1 = schlimm(alle.kachel, .75), k2 = schlimm(alle.wappen, .5), k3 = schlimm(alle.schrift, 1.5);
      ok(fehlerAnsicht.length === 0 && alle.kachel.length > 500 && k1.length === 0,
        'in jeder Ansicht, jedem Blatt und jeder Karte steht das Zeichen in der Mitte seiner Kachel, seines Kreises oder Chips',
        fehlerAnsicht[0] || (k1.slice(0, 4).join(' | ') || alle.kachel.length + ' gemessen'));
      ok(alle.wappen.length > 100 && k2.length === 0,
        'jedes Gesicht im Wappen sitzt auf der Mitte des Reifs',
        k2.slice(0, 4).join(' | ') || alle.wappen.length + ' gemessen');
      ok(alle.schrift.length > 300 && k3.length === 0,
        'Initialen und Ziffern stehen in der Mitte ihres Gesichts oder Abzeichens',
        k3.slice(0, 4).join(' | ') || alle.schrift.length + ' gemessen');
    } finally { await h.browser.close(); }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(fails === 0 ? `ALLE ${checks} CHECKS BESTANDEN` : `${fails} von ${checks} CHECKS FEHLGESCHLAGEN`);
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
