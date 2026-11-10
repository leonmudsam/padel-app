// Der Start der App, so wie ein Telefon ihn erlebt: die gebaute Seite von
// einem echten Server (eigener Ursprung, also mit localStorage, IndexedDB,
// Worker und Service Worker), Supabase als Attrappe mit Schreibprotokoll und
// den echten Partien. Die übrigen Suiten laden die App ohne Boot (sie
// entfernen `loadAll(); checkForUpdate();`) — was beim Start geschieht,
// prüft nur diese.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Start, Speicher des Geräts und Worker brauchen einen Browser.');
  process.exit(2);
}
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const chromium = require('./browser.js').ladeChromium();
const ZIEL = require('./ziel.js');
const {fixtures} = require('../tools/performance.cjs');

let checks = 0, fails = 0;
const ok = (c, msg) => { checks++; if(!c) fails++; console.log((c ? '  ok  ' : '  ✗   ') + msg); };

// ── Der Server: die gebaute Seite mit ETag, wie GitHub Pages ────────────
// Mit einem Zugang in den Gültigkeitsbereich der App, gesetzt VOR dem Boot:
// `window.__vorStart` (aus dem Init-Skript) bekommt `eval` der IIFE und kann
// so mitzählen, was der Start tut. Ohne `__vorStart` ändert er nichts.
const SEITE = (() => {
  const html = fs.readFileSync(ZIEL, 'utf8');
  const boot = html.search(/loadAll\(\);\s*\ncheckForUpdate\(\);/);
  if(boot < 0) throw new Error('Boot-Zeile nicht gefunden');
  // Keine Anfrage verlässt den Rechner: die Supabase-Bibliothek und die
  // Schriften kommen vom eigenen Server. Ein Service Worker holt fremde
  // Quellen selbst, an jeder Umleitung des Browsers vorbei — mit der echten
  // Bibliothek spräche der Test sonst mit der echten Datenbank.
  return (html.slice(0, boot) + 'if(window.__vorStart) window.__vorStart(s => eval(s));\n' + html.slice(boot))
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/g, '/attrappe.js')
    .replace(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]*/g, '/schrift.css');
})();
if(/cdn\.jsdelivr\.net|fonts\.googleapis\.com\/css2/.test(SEITE)) throw new Error('Eine fremde Adresse ist übrig');
// Der Service Worker neben der Seite. `swFassung` gibt ihm eine andere
// Fassung (eine neue Auslieferung), `seiteAus` lässt die Seite scheitern
// (kein Netz).
const SW_DATEI = path.join(path.dirname(ZIEL), 'sw.js');
let swFassung = null, seiteAus = false;
const ETAG = '"seite-1"';
// `neueFassung` liefert eine Seite mit anderer BUILD_VERSION aus (eine neue
// Auslieferung); `nurAbfrage` nur an den Update-Check, die Navigation bekommt
// weiter die alte — ein Zwischenspeicher, der beim Neuladen die alte Seite
// zurückgibt.
let neueFassung = null, nurAbfrage = false;
const neuSeite = () => SEITE.replace(/const BUILD_VERSION='[^']*'/, `const BUILD_VERSION='${neueFassung}'`);
const anfragen = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  anfragen.push({pfad:url.pathname, cb:url.searchParams.has('_cb'), inm:req.headers['if-none-match'] || null, t:Date.now(),
    modus:req.headers['sec-fetch-mode'] || ''});
  if(url.pathname === '/attrappe.js'){ res.writeHead(200, {'Content-Type':'text/javascript'}); return res.end(ATTRAPPE); }
  if(url.pathname === '/schrift.css'){ res.writeHead(200, {'Content-Type':'text/css'}); return res.end(''); }
  if(url.pathname === '/sw.js'){
    if(!fs.existsSync(SW_DATEI)){ res.writeHead(404); return res.end(); }
    let sw = fs.readFileSync(SW_DATEI, 'utf8');
    if(swFassung) sw = sw.replace(/const SW_FASSUNG = '[^']*';/, `const SW_FASSUNG = '${swFassung}';`);
    res.writeHead(200, {'Content-Type':'text/javascript', 'Cache-Control':'no-cache'}); return res.end(sw);
  }
  if((url.pathname === '/' || url.pathname === '/index.html') && seiteAus){ res.writeHead(503); return res.end(); }
  if((url.pathname === '/' || url.pathname === '/index.html') && neueFassung
     && !(nurAbfrage && req.headers['sec-fetch-mode'] === 'navigate')){
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', ETag:'"seite-2"', 'Cache-Control':'no-cache'});
    return res.end(neuSeite());
  }
  if(url.pathname === '/' || url.pathname === '/index.html'){
    if(req.headers['if-none-match'] === ETAG){ res.writeHead(304, {ETag:ETAG}); return res.end(); }
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', ETag:ETAG, 'Cache-Control':'no-cache'});
    return res.end(SEITE);
  }
  if(url.pathname === '/icon.png'){ res.writeHead(204); return res.end(); }
  res.writeHead(404); res.end();
});

// ── Die Attrappe von Supabase: liest die Fixtures, schreibt mit ─────────
// Jede Abfrage ist eine Kette, die beim `await` ihre Tabelle beantwortet.
// Schreibende Methoden landen in `window.__schreib`.
const ATTRAPPE = `(() => {
  const D = window.__startDaten;
  window.__schreib = []; window.__lesen = []; window.__storyIds = [];
  window.__storyAb = []; window.__storyAblauf = [];
  const antwort = (t, ops) => {
    if(ops.some(o => ['insert','update','upsert','delete'].includes(o))) return {data:null, error:null};
    // Archivierte Monate bleiben wie in der echten Datenbank liegen:
    // sonst archivierte jeder Start neu und zeichnete danach noch einmal.
    let archiv = {}; try { archiv = JSON.parse(localStorage.getItem('attrappe_seasons') || '{}'); } catch(e){}
    const saisons = D.seasons.filter(x => !archiv[x.id]).concat(Object.values(archiv))
      .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
    const tab = {players:D.players, matches:D.matches, seasons:saisons, stories:D.stories || [],
      config:{id:1, k_factor:32, risk_split:.6, pos_swing:.45, start_elo:0, win_boost:1.12,
        mov_loss_damp:.5, match_bonus:1.5, low_elo_loss_damp:0}}[t];
    return {data: tab === undefined ? [] : JSON.parse(JSON.stringify(tab)), error:null};
  };
  const kette = (t, ops) => new Proxy(function(){}, {
    get(_, p){
      if(p === 'then'){
        if(!ops.some(o => ['insert','update','upsert','delete'].includes(o))) window.__lesen.push(t);
        // __langsam hält jede Leseabfrage zurück (ein langsames Netz),
        // __fehler lässt sie scheitern (kein Netz).
        const r = (window.__fehler && !ops.some(o => ['insert','update','upsert','delete'].includes(o)))
          ? {data:null, error:{message:'kein Netz'}} : antwort(t, ops);
        // __langsamTab hält eine einzelne Tabelle zurück: die Partien sind
        // die größte Antwort und kommen auf dem Telefon zuletzt.
        const ms = (window.__langsamTab && window.__langsamTab[t]) || window.__langsam || 0;
        return (ja) => new Promise(f => setTimeout(() => f(r), ms)).then(ja);
      }
      return kette(t, ops.concat(String(p)));
    },
    apply(_, __, args){
      const o = ops[ops.length-1];
      if(['insert','update','upsert','delete'].includes(o)) window.__schreib.push(t + '.' + o);
      if(t === 'stories' && o === 'upsert' && args[0])
        (Array.isArray(args[0]) ? args[0] : [args[0]]).forEach(z => { window.__storyIds.push(z && z.id);
          if(z) window.__storyAblauf.push([z.event_at, z.expires_at]); });
      if(t === 'stories' && o === 'gte' && args[0] === 'event_at') window.__storyAb.push(args[1]);
      if(t === 'seasons' && o === 'upsert' && args[0]) try {
        const archiv = JSON.parse(localStorage.getItem('attrappe_seasons') || '{}');
        archiv[args[0].id] = args[0]; localStorage.setItem('attrappe_seasons', JSON.stringify(archiv));
      } catch(e){}
      return kette(t, ops);
    }
  });
  const kanal = () => new Proxy(function(){}, {get(_, p){ return p === 'then' ? undefined : kanal(); }, apply(){ return kanal(); }});
  window.supabase = {createClient: () => ({
    from: t => kette(t, []), channel: kanal, removeChannel(){},
    rpc: (...a) => { window.__schreib.push('rpc'); return kette('rpc', []); } })};
})();`;

// Die Fixtures tragen keine gespeicherten Deltas. Die Datenbank tut es, und
// ohne sie stünde jede Elo auf null — das Saisonarchiv hielte jeden Monat für
// unfertig („alter Bug") und schriebe ihn bei jedem Start neu. Gerechnet
// werden sie mit der App selbst, wie in tools/performance.cjs.
const DATEN = (() => {
  const {K, setNow} = require('./runtime.js').createRuntime();
  setNow(new Date(2026, 7, 26, 21).getTime());
  K(`players=${JSON.stringify(fixtures.players)};matches=${JSON.stringify(fixtures.matches)};seasons=[];invalidateCache();
    const d=new Map(simulateEloWithSliders(matches).history.map(h=>[h.matchId,h.deltas]));
    matches.forEach(m=>m.deltas=d.get(m.id)||{});invalidateCache();`);
  return {players:fixtures.players, matches:K('matches'), seasons:fixtures.seasons};
})();
const JETZT = new Date(2026, 7, 26, 21).getTime();
const LIGA_GERAET = {timezoneId:'Europe/Berlin'};

async function neueSeite(ctx){
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**', r => r.fulfill({contentType:'text/javascript', body:ATTRAPPE}));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({contentType:'text/css', body:''}));
  await page.route('https://fonts.gstatic.com/**', r => r.fulfill({status:404, body:''}));
  return {page, fehler};
}

(async () => {
  await new Promise(fertig => server.listen(0, '127.0.0.1', fertig));
  const BASIS = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  try{
    // Der Service Worker bekommt einen eigenen Kontext (unten): hier stünde
    // er zwischen der Seite und jeder Zusicherung über den Start ohne ihn.
    // Ein Telefon der Liga: Berliner Uhr und kein automatisierter Browser —
    // nur ein solches Gerät schreibt Stories und Archiv [§C42].
    const ctx = await browser.newContext({viewport:{width:390, height:844}, serviceWorkers:'block', ...LIGA_GERAET});
    await ctx.addInitScript(({daten, jetzt}) => {
      Object.defineProperty(Navigator.prototype, 'webdriver', {get:() => false});
      window.__startDaten = daten;
      const RD = Date;
      window.Date = class extends RD{ constructor(...a){ a.length ? super(...a) : super(jetzt); } static now(){ return jetzt; } };
      window.setInterval = () => 0;
    }, {daten:DATEN, jetzt:JETZT});

    // ── Der Update-Check ──────────────────────────────────────────────
    // Erster Start: noch kein ETag. Der Check kommt erst, wenn die Liga
    // gezeichnet ist, und merkt sich den ETag seiner eigenen Version.
    const a = await neueSeite(ctx);
    await a.page.goto(BASIS);
    await a.page.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    const gezeichnet = Date.now();
    for(let i = 0; i < 80 && !anfragen.some(x => x.cb); i++) await a.page.waitForTimeout(100);
    await a.page.waitForTimeout(200);
    ok(await a.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('padel_upd_v1')).etag === '"seite-1"'; } catch(e){ return false; } }),
      'Der ETag der eigenen Version wird auf dem Gerät gemerkt');
    const erster = anfragen.filter(x => x.cb);
    ok(erster.length === 1 && erster[0].inm === null, 'Erster Start: ein Update-Check, noch ohne ETag');
    ok(erster.length && erster[0].t >= gezeichnet - 50, 'Der Update-Check läuft erst, wenn die Liga steht');
    ok(a.fehler.length === 0, 'Erster Start ohne Seitenfehler' + (a.fehler.length ? ': ' + a.fehler[0] : ''));
    await a.page.close();

    // Zweiter Start: derselbe ETag geht mit, der Server antwortet ohne Body.
    anfragen.length = 0;
    const b = await neueSeite(ctx);
    await b.page.goto(BASIS);
    await b.page.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    await b.page.waitForTimeout(400);
    for(let i = 0; i < 50 && !anfragen.some(x => x.cb); i++) await b.page.waitForTimeout(100);
    const zweiter = anfragen.filter(x => x.cb);
    ok(zweiter.length === 1 && zweiter[0].inm === ETAG, 'Zweiter Start: der Update-Check sendet den gemerkten ETag');
    // Ein ETag, der einer anderen Version gehört, wird nicht gesendet: sonst
    // bekäme ein Gerät mit altem Stand ein 304 auf die neue Fassung.
    await b.page.evaluate(() => localStorage.setItem('padel_upd_v1', JSON.stringify({etag:'"seite-1"', version:'1999.01.01.x'})));
    await b.page.close();
    anfragen.length = 0;
    const c = await neueSeite(ctx);
    await c.page.goto(BASIS);
    await c.page.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    for(let i = 0; i < 60 && !anfragen.some(x => x.cb); i++) await c.page.waitForTimeout(100);
    const dritter = anfragen.filter(x => x.cb);
    ok(dritter.length === 1 && dritter[0].inm === null, 'Ein ETag einer anderen Version wird nicht gesendet');
    await c.page.close();

    // ── Das Update lädt von selbst [§C42] ─────────────────────────────
    // Der Banner „Neu laden" wartete auf einen Finger, und ein offenes Symbol
    // blieb auf der alten Fassung. Jetzt lädt die App selbst, sobald nichts
    // offen ist und niemand gerade etwas berührt, und sagt es danach kurz.
    const u = await neueSeite(ctx);
    await u.page.addInitScript(() => { window.__vorStart = K => { window.__K = K; }; });
    const updBereit = async () => {
      await u.page.waitForFunction(() => document.querySelector('#main .rlist') && window.__K, null, {timeout:20000});
      // Der erste Check des Starts ist durch, kein Abruf läuft mehr.
      await u.page.waitForFunction(() => window.__K('!_updErster && !_loadAllPromise && !_schreibOffen && !_newsAutoSyncRunning'), null, {timeout:30000});
      await u.page.waitForTimeout(3600);
    };
    // Gezählt wird ein neues Dokument, nicht jede Navigation: der Zurück-
    // Eintrag der App (`history.back()` beim Schließen eines Blatts) ist
    // auch eine, und mit ihr stand ein Neuladen fest, das noch nicht war.
    const navigiert = async (fn, ms) => {
      let nav = false;
      const hoeren = () => { nav = true; };
      u.page.on('domcontentloaded', hoeren);
      await fn();
      for(let i = 0; i < ms / 100 && !nav; i++) await u.page.waitForTimeout(100);
      u.page.off('domcontentloaded', hoeren);
      return nav;
    };
    await u.page.goto(BASIS);
    await updBereit();
    const alteFassung = await u.page.evaluate(() => window.__K('BUILD_VERSION'));
    // Über einem offenen Blatt lädt nichts, auch wenn niemand etwas berührt.
    neueFassung = '2099.01.01.neu1';
    await u.page.evaluate(() => window.__K('showPlayer(players[0].id)'));
    await u.page.waitForFunction(() => document.getElementById('sheetBg').classList.contains('show'), null, {timeout:5000});
    ok(!await navigiert(() => u.page.evaluate(() => window.__K('checkForUpdate()')), 3500),
      'Über einem offenen Blatt lädt das Update nicht');
    ok(await u.page.evaluate(() => window.__K('_updNeu')) === neueFassung, 'Die gefundene Fassung wartet');
    // Ist das Blatt zu, lädt sie ohne weiteren Check.
    const nachBlatt = await navigiert(() => u.page.evaluate(() => window.__K('closeSheet()')), 6000);
    ok(nachBlatt, 'Ist das Blatt zu, lädt die App die neue Fassung von selbst');
    await u.page.waitForFunction(() => document.querySelector('#main .rlist') && window.__K, null, {timeout:20000});
    ok(await u.page.evaluate(() => window.__K('BUILD_VERSION')) === neueFassung, 'Danach läuft die neue Fassung');
    const hinweis = await u.page.waitForFunction(() => {
      const t = document.querySelector('.toast.show'); return t && t.textContent;
    }, null, {timeout:4000}).then(h => h.jsonValue()).catch(() => '');
    ok(hinweis === 'App aktualisiert', 'Danach steht kurz „App aktualisiert" (' + (hinweis || 'nichts') + ')');
    ok(await u.page.evaluate(() => !document.querySelector('.toast.mit-akt') && !document.getElementById('updateBanner')),
      'Der Hinweis trägt keinen Knopf, und es gibt keinen Banner');
    ok(await u.page.evaluate(() => !new URL(location.href).searchParams.has('_upd')),
      'Die Adresse trägt danach kein Merkmal des Updates mehr');
    await u.page.waitForTimeout(3000);
    ok(await u.page.evaluate(() => !document.querySelector('.toast.show')), 'Der Hinweis geht von selbst');
    // Wer gerade etwas berührt hat, wird nicht unterbrochen; das Zurückkommen
    // aus dem Hintergrund ist der ruhige Moment.
    await updBereit();
    neueFassung = '2099.01.01.neu2';
    await u.page.mouse.click(5, 300);
    ok(!await navigiert(() => u.page.evaluate(() => window.__K('checkForUpdate()')), 3500),
      'Nach einer Berührung lädt das Update nicht sofort');
    ok(await navigiert(() => u.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))), 6000),
      'Beim Zurückkommen lädt die wartende Fassung');
    await u.page.waitForFunction(() => document.querySelector('#main .rlist') && window.__K, null, {timeout:20000});
    ok(await u.page.evaluate(() => window.__K('BUILD_VERSION')) === neueFassung, 'Auch dann läuft danach die neue Fassung');
    // Wer die App verlässt, bekommt die wartende Fassung im Hintergrund —
    // auch über einem Blatt, dort liest niemand mehr. In Ruhe kam sie kaum:
    // wer die App offen hat, liest im Feed oder tippt. Über einer Eingabe
    // wartet sie weiter, dort steht etwas, das noch nicht gespeichert ist.
    const versteckt = () => u.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable:true, get:() => !!window.__weg});
      window.__weg = true; document.dispatchEvent(new Event('visibilitychange')); });
    const wieder = () => u.page.evaluate(() => { window.__weg = false; });
    await updBereit();
    neueFassung = '2099.01.01.neu3';
    await u.page.evaluate(() => window.__K("tab='match';render()"));
    ok(!await navigiert(() => u.page.evaluate(() => window.__K('checkForUpdate()')), 3000), 'In der Eingabe wartet die neue Fassung');
    ok(!await navigiert(versteckt, 3000), 'Geht die App über einer Eingabe in den Hintergrund, wartet sie weiter');
    await wieder();
    await u.page.evaluate(() => window.__K("tab='ranking';render()"));
    await u.page.evaluate(() => window.__K('showPlayer(players[0].id)'));
    await u.page.waitForFunction(() => document.getElementById('sheetBg').classList.contains('show'), null, {timeout:5000});
    ok(!await navigiert(() => u.page.evaluate(() => window.__K('_updVersuchen()')), 3000), 'Über einem Blatt wartet sie, solange jemand hinsieht');
    ok(await navigiert(versteckt, 6000), 'Geht die App in den Hintergrund, lädt die wartende Fassung, auch über einem Blatt');
    await u.page.waitForFunction(() => document.querySelector('#main .rlist') && window.__K, null, {timeout:20000});
    ok(await u.page.evaluate(() => window.__K('BUILD_VERSION')) === neueFassung, 'Danach läuft die neue Fassung');
    // Bringt das Neuladen die alte Seite zurück, lädt die App nicht im Kreis.
    await updBereit();
    neueFassung = '2099.01.01.neu4'; nurAbfrage = true;
    ok(await navigiert(() => u.page.evaluate(() => window.__K('checkForUpdate()')), 6000), 'Das nächste Update lädt');
    await u.page.waitForFunction(() => document.querySelector('#main .rlist') && window.__K, null, {timeout:20000});
    ok(await u.page.evaluate(() => window.__K('BUILD_VERSION')) === alteFassung, 'Der Zwischenspeicher bringt eine alte Fassung zurück');
    // Gleich nach dem Start nachgesehen: der Hinweis stünde 700 ms nach dem
    // Start und wäre nach seiner Standzeit wieder fort.
    let falscherHinweis = false;
    for(let i = 0; i < 32 && !falscherHinweis; i++){
      falscherHinweis = await u.page.evaluate(() => /aktualisiert/.test((document.querySelector('.toast.show') || {}).textContent || ''));
      await u.page.waitForTimeout(100);
    }
    ok(!falscherHinweis, 'Kam die Fassung nicht an, steht kein Hinweis');
    await u.page.waitForFunction(() => window.__K('!_updErster && !_loadAllPromise'), null, {timeout:30000});
    ok(!await navigiert(async () => { await u.page.waitForTimeout(3600); await u.page.evaluate(() => window.__K('checkForUpdate()')); }, 4000),
      'Kam die Fassung nicht an, lädt die App nicht gleich noch einmal');
    ok(u.fehler.length === 0, 'Update ohne Seitenfehler' + (u.fehler.length ? ': ' + u.fehler[0] : ''));
    neueFassung = null; nurAbfrage = false;
    await u.page.close();
    // Und die Fassung muss überhaupt ins Netz kommen: mit einer Gruppe für
    // alle Zweige verdrängte ein Push auf einen Arbeitszweig den wartenden
    // Lauf von main, und der Merge von PR #212 wurde nie veröffentlicht.
    const ablauf = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'pages.yml'), 'utf8');
    ok(/\nconcurrency:\s*\n\s*group:\s*pages-\$\{\{ github\.ref \}\}\s*\n\s*cancel-in-progress:\s*false/.test(ablauf),
      'Die Läufe stehen je Zweig in einer eigenen Reihe, und ein Veröffentlichen bricht nie ab');

    // ── Der Generator im Worker ───────────────────────────────────────
    // Der Start rechnet die Stories nicht auf dem Hauptthread, und der Worker
    // kommt zu denselben Stories wie der Hauptthread mit demselben Code.
    const w = await neueSeite(ctx);
    // Zwei Karten, die die Datenbank schon trägt: eine vom 6. August, zwanzig
    // Tage zurück, und eine vom 17. Juli, vor dem Monat.
    await w.page.addInitScript(() => {
      const zeile = (id, ms) => ({id, type:'ambient', category:'fun', icon:null, title:'Eine Karte von damals',
        description:'Sie stand schon im Feed.', data_ref:{type:'ambient'}, priority:20,
        event_at:new Date(ms).toISOString(), expires_at:'2026-12-31T00:00:00.000Z'});
      window.__startDaten = Object.assign({}, window.__startDaten,
        {stories:[zeile('monat_drin', Date.UTC(2026, 7, 6, 13)), zeile('monat_raus', Date.UTC(2026, 6, 17, 13))]});
    });
    await w.page.addInitScript(() => {
      window.__vorStart = K => { window.__K = K; window.__haupt = 0;
        K('const __bs=_buildStories; _buildStories=function(){ window.__haupt++; return __bs.apply(this, arguments); }'); };
    });
    await w.page.goto(BASIS);
    await w.page.waitForFunction(() => window.__K && window.__K('Array.isArray(_cache._stories) && _cache._stories.length > 20'), null, {timeout:60000});
    ok(await w.page.evaluate(() => window.__haupt === 0), 'Beim Start rechnet der Hauptthread keine Story');
    ok(await w.page.evaluate(() => window.__K('window.__schreib.some(x => x.startsWith("stories."))')), 'Die Stories aus dem Worker werden veröffentlicht wie bisher');
    const gleich = await w.page.evaluate(async () => {
      const K = window.__K;
      const ausWorker = await K('_storiesImWorker()');
      const haupt = K('_buildStories()');
      const text = x => JSON.stringify(x);
      return {n:haupt.length, gleich:!!ausWorker && text(ausWorker) === text(haupt),
        // JSON macht aus Datum und Zahl dasselbe; der Typ jedes Zeitpunkts
        // muss eigens gleich sein. Gefragt wird nach dem Typ, nicht nach
        // `instanceof`: die feste Uhr der Suite ersetzt `Date`.
        when:!!ausWorker && ausWorker.length === haupt.length && ausWorker.every((s, i) =>
          Object.prototype.toString.call(s.when) === Object.prototype.toString.call(haupt[i].when))};
    });
    ok(gleich.n > 20 && gleich.gleich, `Worker und Hauptthread ergeben dieselben ${gleich.n} Stories (IDs, Texte, dataRef, Zeit)`);
    ok(gleich.when, 'Jeder Zeitpunkt kommt mit seinem Typ zurück (Datum bleibt Datum, Zahl bleibt Zahl)');
    // Ein zweiter Lauf ohne neue Daten schickt den Stand nicht noch einmal.
    ok(await w.page.evaluate(async () => { const K = window.__K; const v = K('_storyWorkerStand');
      await K('_storiesImWorker()'); return K('_storyWorkerStand') === v; }), 'Unveränderter Stand wird nicht erneut übertragen');
    // ── Der Feed reicht einen Monat zurück [§C33] ─────────────────────
    // Gelesen wurden vierzehn Tage, das Fenster des Generators; was älter
    // war, stand nicht mehr im Feed, obwohl die Datenbank es trug. Jetzt
    // liest der Feed bis zum selben Tag des Vormonats, und jede Zeile hält
    // ab ihrem Ereignis, nicht ab dem Einfügen.
    const monat = await w.page.evaluate(() => {
      const K = window.__K, ab = window.__storyAb[0];
      const d = ab ? new Date(ab) : null;
      return {ab, soll:K('new Date(newsAnzeigeAb(Date.now())).toISOString()'),
        tag:d ? [d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()].join('.') : '',
        drin:K('_cache._stories.some(x => x.id === "monat_drin")'),
        raus:K('_cache._stories.some(x => x.id === "monat_raus")'),
        halten:window.__storyAblauf.length > 0 && window.__storyAblauf.every(([e, x]) =>
          new Date(x).getTime() - new Date(e).getTime() === 40 * 864e5),
        zeilen:window.__storyAblauf.length};
    });
    ok(monat.ab === monat.soll && monat.tag === '7.26.0.0',
       'Der Feed liest bis zum selben Tag des Vormonats, 00:00 ' + JSON.stringify([monat.ab, monat.tag]));
    ok(monat.drin && !monat.raus, 'Eine Karte von vor zwanzig Tagen steht im Feed, eine von vor dem Monat nicht '
       + JSON.stringify([monat.drin, monat.raus]));
    ok(monat.halten, `Jede veröffentlichte Zeile hält vierzig Tage ab ihrem Ereignis (${monat.zeilen} Zeilen)`);
    // ── Nur die Uhr der Liga schreibt [§C42] ──────────────────────────
    // Stories und Archiv rechnet jedes Gerät in Tagen seiner eigenen Uhr. Am
    // 13.10. schrieb ein automatisierter Browser mit Tokioter Uhr eine
    // Tagesbilanz für einen Tag ohne Spiel in die Liga. Ein Gerät mit fremder
    // Uhr oder ein automatisierter Browser rechnet und zeigt wie jedes andere,
    // schreibt aber weder Stories noch Archiv; das Telefon der Liga schreibt.
    const ligaSchreib = await w.page.evaluate(() => ({darf:window.__K('ligaSchreibtAbgeleitet()'),
      schreib:[...new Set(window.__schreib.filter(x => /^(stories|seasons)\./.test(x)))]}));
    ok(ligaSchreib.darf && ligaSchreib.schreib.includes('stories.upsert'),
      'Ein Telefon der Liga (Berliner Uhr) veröffentlicht ' + JSON.stringify(ligaSchreib));
    for(const [name, opt, automat] of [['Gerät mit Tokioter Uhr', {timezoneId:'Asia/Tokyo'}, false],
                                       ['automatisierter Browser', LIGA_GERAET, true],
                                       ['Gerät mit Londoner Uhr', {timezoneId:'Europe/London'}, false]]){
      const fc = await browser.newContext({viewport:{width:390, height:844}, serviceWorkers:'block', ...opt});
      await fc.addInitScript(({daten, jetzt, automat}) => {
        if(!automat) Object.defineProperty(Navigator.prototype, 'webdriver', {get:() => false});
        window.__startDaten = daten;
        const RD = Date;
        window.Date = class extends RD{ constructor(...a){ a.length ? super(...a) : super(jetzt); } static now(){ return jetzt; } };
        window.setInterval = () => 0;
        window.__vorStart = K => { window.__K = K; };
      }, {daten:DATEN, jetzt:JETZT, automat});
      const f = await neueSeite(fc);
      await f.page.goto(BASIS);
      await f.page.waitForFunction(() => window.__K && window.__K('Array.isArray(_cache._stories) && _cache._stories.length > 20'), null, {timeout:60000});
      await f.page.waitForTimeout(500);
      const r = await f.page.evaluate(() => ({darf:window.__K('ligaSchreibtAbgeleitet()'),
        schreib:window.__schreib.filter(x => /^(stories|seasons)\./.test(x)), stories:window.__K('_cache._stories.length')}));
      ok(!r.darf && r.schreib.length === 0 && r.stories > 20,
        'Ein ' + name + ' zeigt die Stories, schreibt aber weder Stories noch Archiv ' + JSON.stringify(r));
      await fc.close();
    }
    // ── Stories nur aus den Partien von eben [§C42] ───────────────────
    // Am 19.10. schrieb ein Telefon, das seit dem Mittag im Hintergrund lag,
    // um 17:39 den Fun Fact von 15 Uhr in die Liga, obwohl ab 13:54 gespielt
    // worden war: beim Zurückkommen rechnete der Takt der News sofort, mit
    // den Partien von vorher. Hier lädt ein Telefon der Liga am 27.08. um
    // 12 Uhr und geht in den Hintergrund; um 13:30 und 13:45 wird gespielt;
    // um 17:30 kommt es zurück — mit offenem Feed (dann holt `loadAll`
    // nichts) und ohne, bei langsamem Netz. Und an einem Tag ohne Partie kommt
    // der Fun Fact nach dem Zurückkommen weiterhin.
    for(const [name, feedOffen, spielen] of [['mit offenem Feed', true, true], ['bei langsamem Netz', false, true],
                                             ['an einem Tag ohne Partie', false, false]]){
      const hc = await browser.newContext({viewport:{width:390, height:844}, serviceWorkers:'block', ...LIGA_GERAET});
      await hc.addInitScript(({daten, mittag}) => {
        Object.defineProperty(Navigator.prototype, 'webdriver', {get:() => false});
        window.__startDaten = daten;
        window.__uhr = mittag;
        const RD = Date;
        window.Date = class extends RD{ constructor(...a){ a.length ? super(...a) : super(window.__uhr); } static now(){ return window.__uhr; } };
        window.setInterval = () => 0;
        Object.defineProperty(document, 'hidden', {configurable:true, get:() => !!window.__versteckt});
        Object.defineProperty(document, 'visibilityState', {configurable:true, get:() => window.__versteckt ? 'hidden' : 'visible'});
        window.__vorStart = K => { window.__K = K; };
      }, {daten:DATEN, mittag:new Date(2026, 7, 27, 12).getTime()});
      const h = await neueSeite(hc);
      await h.page.goto(BASIS);
      // `typeof`: im Stand vor der Regel gibt es `_datenFrisch` nicht, und die
      // Gegenprobe soll an der Zusicherung scheitern, nicht am Warten.
      await h.page.waitForFunction(() => window.__K && window.__K('Array.isArray(_cache._stories) && _cache._stories.length > 20'
        + ' && (typeof _datenFrisch !== "function" || _datenFrisch())'), null, {timeout:60000});
      await h.page.waitForTimeout(400);
      const r = await h.page.evaluate(async ({feedOffen, spielen}) => {
        const K = window.__K, warte = ms => new Promise(f => setTimeout(f, ms));
        const vorher = window.__storyIds.includes('ambient_2026-08-27_15');
        if(feedOffen){ K('openNewsFeed()'); await warte(300); }
        window.__versteckt = true; document.dispatchEvent(new Event('visibilitychange'));
        const neu = [];
        if(spielen){
          const d = window.__startDaten.matches, letzte = d[d.length - 1];
          for(const [id, min] of [['heute-1', 30], ['heute-2', 45]]){
            const m = Object.assign({}, letzte, {id, created_at:new Date(2026, 7, 27, 13, min).toISOString(), deltas:{}});
            d.push(m); neu.push(id);
          }
        }
        window.__uhr = new Date(2026, 7, 27, 17, 30).getTime();
        window.__langsamTab = {matches:1500};
        window.__versteckt = false; document.dispatchEvent(new Event('visibilitychange'));
        await warte(4000);
        return {vorher, funFact:window.__storyIds.includes('ambient_2026-08-27_15'),
          partien:K('matches.filter(m => m.id.startsWith("heute-")).length'),
          spielStory:neu.length ? neu.some(id => window.__storyIds.includes('spiel_' + id)) : null};
      }, {feedOffen, spielen});
      if(spielen) ok(!r.vorher && !r.funFact && (feedOffen || (r.partien === 2 && r.spielStory)),
        'Zurück aus dem Hintergrund ' + name + ': kein Fun Fact für einen Tag, an dem vor 15 Uhr gespielt wurde'
          + (feedOffen ? '' : ', die Partien des Tages sind da und ihre Stories veröffentlicht') + ' ' + JSON.stringify(r));
      else ok(!r.vorher && r.funFact, 'Zurück aus dem Hintergrund ' + name + ': der Fun Fact von 15 Uhr wird veröffentlicht ' + JSON.stringify(r));
      await hc.close();
    }
    // ── Vorwärmen im Leerlauf ─────────────────────────────────────────
    // Nach dem Start rechnet niemand mehr kalt, wenn ein Reiter aufgeht.
    await w.page.waitForFunction(() => window.__K('_vorwaermAuftrag === null'), null, {timeout:60000});
    const lbStart = await w.page.evaluate(() => window.__K('_insStufeDrin.size'));
    const kalt = await w.page.evaluate(() => {
      const K = window.__K;
      K(`window.__kalt = 0;
        for(const f of ['simulateElo','_awardRankingsUncached','_seasonTitleCtxRechnen','teamStatsFromMatches']){
          const alt = eval(f); eval(f + ' = function(){ window.__kalt++; return alt.apply(this, arguments); }');
        }`);
      const je = {};
      for(const z of ["tab='positions';rankMetric='drive'", "tab='awards';awView='awards';awPeriod='season';awSeasonId=null",
                      "tab='awards';awView='rekorde'", "tab='awards';awView='chronik'", "tab='teams'"]){
        // Der Kontext der Rekorde ist ein Memo, das auch bei jedem Treffer
        // gerufen wird; gezählt wird, ob sein Topf wächst.
        const ctx = () => Object.keys(_cache._chronCtxBis || {}).length + (_cache._chronCtxKey ? 1 : 0);
        const vor = window.__kalt, c0 = K('(' + ctx + ')()'); K(z + ';render()');
        je[z] = window.__kalt - vor + (K('(' + ctx + ')()') - c0);
      }
      return je;
    });
    for(const [z, n] of Object.entries(kalt)) ok(n === 0, 'Nach dem Vorwärmen rechnet der erste Aufruf nichts kalt: ' + z + (n ? ' (' + n + ' kalte Rechnungen)' : ''));
    // Die Zeichen der Laufbahn tragen die Rangfarbe. Der Start zeichnet
    // keines davon vor — die Laufbahn ist dort weit weg —, das Profil eines
    // Spielers die seines Rangs, im Leerlauf, solange es offen steht. Danach
    // bleibt beim Öffnen der Laufbahn höchstens das eine der eigenen Stufe
    // mitten im Grad.
    const lb = await w.page.evaluate(async () => {
      const K = window.__K, ruhig = () => new Promise(r => setTimeout(r, 50));
      const out = {neu:[], zu:null};
      for(const p of K('players.filter(p => sichtbar(p))')){
        K('closeSheet(true)'); K(`showPlayer(${JSON.stringify(p.id)})`);
        for(let i = 0; i < 400 && K('!!(_insWarmPlan && _insWarmPlan.plan.length)'); i++) await ruhig();
        const vor = K('_insStufeDrin.size');
        K(`showLaufbahn(${JSON.stringify(p.id)})`);
        out.neu.push(K('_insStufeDrin.size') - vor);
      }
      // Geschlossen zeichnet es nicht weiter.
      K('closeSheet(true); _insWarmPlan = null; _insStufeDrin.clear()');
      const p = K('players.filter(p => sichtbar(p))')[0];
      K(`showPlayer(${JSON.stringify(p.id)})`); await ruhig(); K('closeSheet(true)');
      await new Promise(r => setTimeout(r, 1500));
      const n = K('_insStufeDrin.size'); await new Promise(r => setTimeout(r, 1500));
      out.zu = [n, K('_insStufeDrin.size'), K('_insWarmPlan')];
      return out;
    });
    ok(lbStart === 0, 'Der Start zeichnet keine Zeichen der Laufbahn vor (' + lbStart + ')');
    ok(lb.neu.length > 3 && lb.neu.every(n => n <= 1),
       'Aus dem Profil zeichnet keine Laufbahn ihre Vitrine neu (' + lb.neu.join(' ') + ')');
    ok(lb.zu[0] === lb.zu[1] && lb.zu[2] === null, 'Ist das Profil zu, zeichnet niemand weiter ' + JSON.stringify(lb.zu));
    // Neue Daten brechen einen laufenden Auftrag ab; er rechnet nicht für
    // einen Stand weiter, den es nicht mehr gibt.
    ok(await w.page.evaluate(async () => {
      const K = window.__K; K('_vorwaermen(); window.__auftrag = _vorwaermAuftrag; invalidateCache();');
      await new Promise(r => setTimeout(r, 1500));
      return K('window.__auftrag.schritt === 0');
    }), 'Ein neuer Datenstand bricht das Vorwärmen ab');
    // Ein Worker, der rechnet, ist nicht hängengeblieben. Mit zwanzig
    // Sekunden für alles übernahm der Hauptthread, sobald die Liga groß
    // genug war, und hielt das Telefon so lange fest, wie der Worker
    // gebraucht hätte. Die Fristen sind hier kurz und der Worker eine
    // Attrappe: einer nimmt an und schweigt, einer nimmt nie an.
    const frist = await w.page.evaluate(async () => {
      const K = window.__K, warte = ms => new Promise(r => setTimeout(r, ms));
      K('STORY_WORKER_FRIST.annahme = 150; STORY_WORKER_FRIST.rechnen = 1200; 0');
      const haupt = window.__haupt;
      window.__beendet = 0;
      K(`_storyWorker = {postMessage(d){ setTimeout(() => _storyWorkerPost({data:{nr:d.nr, angenommen:true}}), 20); },
        terminate(){ window.__beendet++; }}; _storyWorkerLebt = false; _storyWorkerStand = null; 0`);
      let erg = 'offen';
      K('_storiesImWorker()').then(x => { erg = x; });
      await warte(600);
      const zwischen = {erg, aus:K('_storyWorker === false'), haupt:window.__haupt - haupt};
      await warte(1200);
      const nach = {leer:Array.isArray(erg) && erg.length === 0, beendet:window.__beendet,
        neu:K('_storyWorker === null'), haupt:window.__haupt - haupt};
      K(`_storyWorker = {postMessage(){}, terminate(){ window.__beendet++; }}; _storyWorkerLebt = false; 0`);
      let still = 'offen';
      K('_storiesImWorker()').then(x => { still = x; });
      await warte(600);
      const tot = {erg:still, aus:K('_storyWorker === false')};
      K('STORY_WORKER_FRIST.annahme = 20000; STORY_WORKER_FRIST.rechnen = 300000; _storyWorker = null; 0');
      return {zwischen, nach, tot};
    });
    ok(frist.zwischen.erg === 'offen' && !frist.zwischen.aus && frist.zwischen.haupt === 0,
       'Ein Worker, der den Lauf angenommen hat, rechnet über die Frist der Annahme hinaus, ohne dass der Hauptthread übernimmt ' + JSON.stringify(frist.zwischen));
    ok(frist.nach.leer && frist.nach.beendet === 1 && frist.nach.neu && frist.nach.haupt === 0,
       'Nach der Frist des Rechnens wird er beendet, der Lauf bringt nichts Neues, und der nächste startet einen neuen Worker ' + JSON.stringify(frist.nach));
    ok(frist.tot.erg === null && frist.tot.aus,
       'Ein Worker, der nie annimmt, gilt als ausgefallen, und der Hauptthread übernimmt ' + JSON.stringify(frist.tot));
    ok(w.fehler.length === 0, 'Worker-Start ohne Seitenfehler' + (w.fehler.length ? ': ' + w.fehler[0] : ''));
    await w.page.close();

    // ── Der Schnellstart aus dem letzten Stand ────────────────────────
    // Die Starts oben haben ihn gespeichert. Das Netz antwortet jetzt erst
    // nach drei Sekunden: bis dahin steht die Liga aus dem Stand da, und
    // nichts wird geschrieben.
    const q = await neueSeite(ctx);
    await q.page.addInitScript(() => {
      window.__langsam = 3000;
      window.__vorStart = K => { window.__K = K; };
      // Verglichen wird das Markup der Liga, nicht ihr Ankommen: das Licht
      // und der Aufbau [§C43] laufen über die Zeit und gehen von selbst.
      window.__ohneVorfuehrung = el => { const c = el.cloneNode(true);
        c.querySelectorAll('.kl, .kl-schein, .glanz-einmal').forEach(e => e.remove());
        c.querySelectorAll('.bau').forEach(e => { e.classList.remove('bau'); e.style.animationDelay = '';
          if(e.getAttribute('style') === '') e.removeAttribute('style'); });
        return c.innerHTML; };
    });
    const t0 = Date.now();
    await q.page.goto(BASIS);
    await q.page.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:10000});
    const schnell = Date.now() - t0;
    const vorLive = await q.page.evaluate(() => ({
      schreib:window.__K('window.__schreib.length'), html:window.__ohneVorfuehrung(document.getElementById('main')),
      conn:(document.getElementById('connText')||{}).textContent || '', knoten:!!(window.__knoten = document.getElementById('main').firstElementChild),
      stories:window.__K('Array.isArray(_cache._stories) ? _cache._stories.length : 0'),
      pille:!document.getElementById('newsBtn').classList.contains('wartet')}));
    ok(schnell < 2500, `Die Liga steht aus dem Stand, bevor das Netz antwortet (${schnell} ms bei 3000 ms Netz)`);
    ok(vorLive.schreib === 0, 'Der Schnellstart schreibt nichts in die Datenbank');
    ok(vorLive.conn === 'verbinde…', 'Bis der Live-Abruf da ist, steht „verbinde…“');
    ok(vorLive.stories > 20, 'Der Feed hat seine Stories schon aus dem Stand');
    ok(vorLive.pille, 'Die Pille „News“ steht mit dem Stand, bevor das Netz antwortet');
    await q.page.waitForFunction(() => window.__K('_lastLoadFingerprint !== null && window.__schreib.some(x => x.startsWith("stories."))'), null, {timeout:60000});
    const nachLive = await q.page.evaluate(() => ({html:window.__ohneVorfuehrung(document.getElementById('main')),
      gleicherKnoten:document.getElementById('main').firstElementChild === window.__knoten}));
    ok(nachLive.html === vorLive.html, 'Der Live-Abruf mit denselben Daten zeigt dasselbe Markup wie der Stand');
    ok(nachLive.gleicherKnoten, 'Derselbe Stand wird nicht ein zweites Mal gezeichnet');
    ok(q.fehler.length === 0, 'Schnellstart ohne Seitenfehler' + (q.fehler.length ? ': ' + q.fehler[0] : ''));
    // Ohne Netz bleibt der Stand stehen; die Fehlerkarte ersetzt ihn nicht.
    await q.page.close();
    const o = await neueSeite(ctx);
    await o.page.addInitScript(() => { window.__fehler = true; window.__langsam = 300; window.__vorStart = K => { window.__K = K; }; });
    await o.page.goto(BASIS);
    await o.page.waitForFunction(() => window.__K && window.__K('_loadAllPromise === null'), null, {timeout:20000});
    ok(await o.page.evaluate(() => !!document.querySelector('#main .rlist') && !document.querySelector('#main .leerstand')),
      'Ohne Netz bleibt der letzte Stand stehen, statt einer Fehlerkarte');
    // Ein Stand einer anderen Fassung der App gilt nicht.
    await o.page.evaluate(() => new Promise(ja => { const r = indexedDB.open('padel-stand', 1);
      r.onsuccess = () => { const tx = r.result.transaction('stand', 'readwrite'); const st = tx.objectStore('stand');
        const g = st.get('liga'); g.onsuccess = () => { const x = g.result; x.version = '1999.01.01.x'; st.put(x, 'liga'); };
        tx.oncomplete = () => { r.result.close(); ja(); }; }; }));
    await o.page.close();
    const f = await neueSeite(ctx);
    await f.page.addInitScript(() => { window.__langsam = 2500; window.__vorStart = K => { window.__K = K; }; });
    await f.page.goto(BASIS);
    await f.page.waitForTimeout(1200);
    ok(await f.page.evaluate(() => !document.querySelector('#main .rlist')), 'Ein Stand einer anderen Fassung wird nicht gezeichnet');
    await f.page.close();

    // Ohne Worker rechnet der Hauptthread, und der Feed hat seine Stories.
    const r = await neueSeite(ctx);
    await r.page.addInitScript(() => {
      window.Worker = undefined;
      window.__vorStart = K => { window.__K = K; window.__haupt = 0;
        K('const __bs=_buildStories; _buildStories=function(){ window.__haupt++; return __bs.apply(this, arguments); }'); };
    });
    await r.page.goto(BASIS);
    await r.page.waitForFunction(() => window.__K && window.__K('Array.isArray(_cache._stories) && _cache._stories.length > 20'), null, {timeout:60000});
    ok(await r.page.evaluate(() => window.__haupt >= 1), 'Ohne Worker rechnet der Hauptthread wie bisher');
    await r.page.close();

    // ── Das Öffnen [§C43] ─────────────────────────────────────────────
    // Ein eigener Kontext ohne Stand: die Starts oben haben einen hinterlassen.
    const bctx = await browser.newContext({viewport:{width:390, height:844}, serviceWorkers:'block'});
    await bctx.addInitScript(({daten, jetzt}) => {
      window.__startDaten = daten;
      const RD = Date;
      window.Date = class extends RD{ constructor(...a){ a.length ? super(...a) : super(jetzt); } static now(){ return jetzt; } };
      window.setInterval = () => 0;
      window.__vorStart = K => { window.__K = K; };
    }, {daten:DATEN, jetzt:JETZT});
    anfragen.length = 0;
    // Erster Start: die Bibliothek kommt erst nach 1,2 s, und so lange wird
    // kein Skript der App übersetzt. Die Kopfleiste steht trotzdem, mit dem
    // Zeichen, ohne eigene Anfrage — und kein Bild davor in der Mitte.
    const e1 = await neueSeite(bctx);
    await e1.page.route('**/attrappe.js', async r => { await new Promise(f => setTimeout(f, 1200)); await r.continue(); });
    await e1.page.addInitScript(() => { window.__langsam = 1500; });
    await e1.page.goto(BASIS, {waitUntil:'commit'});
    await e1.page.waitForTimeout(500);
    const vorSkript = await e1.page.evaluate(() => {
      const leiste = document.querySelector('.appbar'), z = document.querySelector('.logo-mark');
      const r = leiste ? leiste.getBoundingClientRect() : {height:0};
      const mitte = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const pille = document.getElementById('newsBtn');
      return {skript:!!window.__K, leiste:r.height > 40 && getComputedStyle(document.getElementById('app')).display !== 'none',
        pille:pille.classList.contains('wartet') && getComputedStyle(pille).visibility === 'visible' && pille.getBoundingClientRect().width > 40
          && getComputedStyle(pille).pointerEvents === 'none',
        // Im Gerüst läuft nichts: ein Schimmer begann links neben der Pille,
        // und Safari auf dem iPhone schnitt ihn am runden Rand nicht ab.
        pilleStill:getComputedStyle(pille, '::before').content === 'none' && pille.getAnimations({subtree:true}).length === 0,
        bild:z ? getComputedStyle(z).backgroundImage.slice(0, 27) : '',
        mitte:mitte ? (mitte.closest('#app') || mitte === document.body || mitte === document.documentElement ? 'frei' : mitte.className) : 'frei'};
    });
    ok(!vorSkript.skript && vorSkript.leiste && vorSkript.bild === 'url("data:image/webp;base64' && vorSkript.mitte === 'frei',
      'Die Kopfleiste steht mit dem Zeichen, bevor ein Skript der App läuft, ohne ein Bild davor ' + JSON.stringify(vorSkript));
    ok(vorSkript.pille, 'Die Pille „News“ steht dort schon an ihrem Platz, als Gerüst, das keinen Tipp annimmt [§C43]');
    ok(vorSkript.pilleStill, 'Ihr Gerüst steht still, ohne Ebene neben sich, die ein Rand abschneiden müsste');
    // Ohne Stand steht das Gerüst, bis die Datenbank antwortet.
    await e1.page.waitForFunction(() => !!window.__K, null, {timeout:10000});
    await e1.page.waitForTimeout(400);
    const geruest = await e1.page.evaluate(() => ({geruest:!!document.querySelector('#main .geruest'), liga:!!document.querySelector('#main .rlist')}));
    ok(geruest.geruest && !geruest.liga, 'Ohne Stand auf dem Gerät steht das Gerüst der Liga, bis die Datenbank antwortet ' + JSON.stringify(geruest));
    await e1.page.waitForSelector('#main .rlist', {timeout:20000});
    await e1.page.waitForTimeout(600);
    ok(await e1.page.evaluate(() => !document.querySelector('.geruest')), 'Kommt die Liga, ist das Gerüst fort');
    for(let i = 0; i < 150 && !(await e1.page.evaluate(() => window.__K('_standLesen()').then(r => !!r))); i++) await e1.page.waitForTimeout(200);
    ok(e1.fehler.length === 0, 'Erster Start ohne Seitenfehler' + (e1.fehler.length ? ': ' + e1.fehler[0] : ''));
    await e1.page.close();
    // Mit Stand baut sich die Liga auf: Teile nacheinander, Licht im Metall
    // um Platz 1 bis 3, um das Zeichen und um „Match eintragen". Nach ihrer
    // Zeit ist nichts davon übrig, auch nicht im Markup.
    const aufbauJetzt = p => p.evaluate(() => ({aufbau:document.documentElement.classList.contains('aufbau'),
      teile:document.querySelectorAll('#main .bau').length,
      metall:[...document.querySelectorAll('#main .rlist > .rrow > .kl')].map(k => (k.className.match(/kl-(gold|silber|bronze)/) || [, '?'])[1]).join(' '),
      zeichen:document.querySelectorAll('.logo-mark > .kl').length, knopf:document.querySelectorAll('#fab > .kl').length}));
    const e2 = await neueSeite(bctx);
    await e2.page.addInitScript(() => { window.__langsam = 1500; });
    await e2.page.goto(BASIS);
    await e2.page.waitForSelector('#main .rlist', {timeout:20000});
    const a1 = await aufbauJetzt(e2.page);
    ok(a1.aufbau && a1.teile >= 8 && a1.metall === 'gold silber bronze' && a1.zeichen === 1 && a1.knopf === 1,
      'Beim Öffnen baut sich die Liga auf, mit Licht im Metall um Platz 1 bis 3 ' + JSON.stringify(a1));
    // Steht die Verbindung zum ersten Mal, geht vom Punkt ein Ring aus.
    await e2.page.waitForFunction(() => document.getElementById('connDot').classList.contains('ok'), null, {timeout:20000});
    ok(await e2.page.evaluate(() => document.getElementById('connDot').classList.contains('ping')),
      'Steht die Verbindung zum ersten Mal, geht vom Punkt oben links ein Ring aus');
    await e2.page.waitForTimeout(6200);
    // Das leise Licht im laufenden Betrieb (`.kl-leise`) zählt nicht als
    // Rest: es beginnt 7 bis 12 s nach dem Öffnen, und bis hierher sind es
    // mit Laden und Verbindung oft mehr — der Test war dann rot, ohne dass
    // vom Aufbau etwas übrig war.
    const rest = await e2.page.evaluate(() => ({aufbau:document.documentElement.classList.contains('aufbau'),
      reste:document.querySelectorAll('.bau, .kl:not(.kl-leise), .kl-schein:not(.kl-leise), .glanz-einmal, [style=""]').length}));
    ok(!rest.aufbau && rest.reste === 0, 'Nach seiner Zeit ist vom Aufbau und vom Licht nichts übrig ' + JSON.stringify(rest));
    // Ab dem Öffnen ist das leise Licht im laufenden Betrieb geplant [§C43].
    ok(await e2.page.evaluate(() => window.__K('!!_leiseAuftrag')), 'Das Öffnen plant das leise Licht im laufenden Betrieb');
    await e2.page.close();
    // Direkt wieder geöffnet: dieselbe Vorführung, jedes Mal.
    const e3 = await neueSeite(bctx);
    await e3.page.goto(BASIS);
    await e3.page.waitForSelector('#main .rlist', {timeout:20000});
    const a3 = await aufbauJetzt(e3.page);
    ok(a3.aufbau && a3.teile >= 8 && a3.metall === 'gold silber bronze', 'Auch direkt nach dem Schließen baut sich die Liga beim Öffnen wieder auf ' + JSON.stringify(a3));
    await e3.page.close();
    // Bei Bewegungsruhe steht alles sofort, ohne Licht.
    const e4 = await neueSeite(bctx);
    await e4.page.emulateMedia({reducedMotion:'reduce'});
    await e4.page.goto(BASIS);
    await e4.page.waitForSelector('#main .rlist', {timeout:20000});
    const a4 = await aufbauJetzt(e4.page);
    ok(!a4.aufbau && a4.teile === 0 && !a4.metall && !a4.zeichen && !(await e4.page.evaluate(() => window.__K('!!_leiseAuftrag'))),
      'Bei Bewegungsruhe steht die Liga sofort, ohne Aufbau, ohne Licht und ohne leises Licht später ' + JSON.stringify(a4));
    await e4.page.close();
    ok(!anfragen.some(x => x.pfad === '/icon.png'), 'Der Start lädt das große Symbol nicht: das Zeichen steht in der Seite');
    await bctx.close();

    // ── Der Service Worker ────────────────────────────────────────────
    const swCtx = await browser.newContext({viewport:{width:390, height:844}});
    await swCtx.addInitScript(({daten, jetzt}) => {
      window.__startDaten = daten;
      const RD = Date;
      window.Date = class extends RD{ constructor(...a){ a.length ? super(...a) : super(jetzt); } static now(){ return jetzt; } };
      window.setInterval = () => 0;
      window.__vorStart = K => { window.__K = K; };
    }, {daten:DATEN, jetzt:JETZT});
    // Jede Anfrage dieses Kontexts, die nicht an den eigenen Server geht.
    const fremd = [];
    swCtx.on('request', r => { if(!r.url().startsWith(BASIS) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) fremd.push(r.url()); });
    const s1 = await swCtx.newPage();
    const swFehler = []; s1.on('pageerror', e => swFehler.push(e.message));
    await s1.goto(BASIS);
    await s1.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    const fassung = await s1.evaluate(() => window.__K('BUILD_VERSION'));
    const topf = await s1.evaluate(async () => {
      await navigator.serviceWorker.ready;
      for(let i = 0; i < 50; i++){
        const namen = await caches.keys();
        const seite = namen.find(n => n.startsWith('padel-seite-'));
        if(seite && await (await caches.open(seite)).match(navigator.serviceWorker.controller ? location.origin + '/' : location.href)) return namen;
        await new Promise(r => setTimeout(r, 100));
      }
      return caches.keys();
    });
    ok(topf.includes('padel-seite-' + fassung), 'Der Service Worker hält die Seite unter ihrer Fassung (' + topf.join(', ') + ')');
    await s1.close();
    // Ohne Netz kommt die Seite aus dem Topf, die Liga aus dem Stand.
    seiteAus = true; anfragen.length = 0;
    const s2 = await swCtx.newPage(); s2.on('pageerror', e => swFehler.push(e.message));
    await s2.goto(BASIS);
    await s2.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    ok(await s2.evaluate(() => !!navigator.serviceWorker.controller), 'Ohne Netz öffnet die App aus dem Service Worker');
    // Der Update-Check geht trotzdem ans Netz, nicht an den Topf.
    for(let i = 0; i < 80 && !anfragen.some(x => x.cb); i++) await s2.waitForTimeout(100);
    ok(anfragen.some(x => x.cb && x.modus !== 'navigate'), 'Der Update-Check fragt das Netz, nicht den Service Worker');
    // `forceReload` lädt die Seite aus dem Netz, nicht aus dem Topf.
    seiteAus = false; anfragen.length = 0;
    await Promise.all([s2.waitForNavigation({timeout:20000}), s2.evaluate(() => window.__K('forceReload()'))]);
    await s2.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    ok(anfragen.some(x => x.cb && x.modus === 'navigate'), 'Neu laden holt die Seite aus dem Netz');
    // Eine neue Fassung räumt den Topf der alten.
    swFassung = 'neu-1';
    const nachher = await s2.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
      for(let i = 0; i < 80; i++){
        const namen = await caches.keys();
        if(namen.includes('padel-seite-neu-1') && namen.filter(n => n.startsWith('padel-seite-')).length === 1) return namen;
        await new Promise(r => setTimeout(r, 100));
      }
      return caches.keys();
    });
    ok(nachher.includes('padel-seite-neu-1') && !nachher.includes('padel-seite-' + fassung),
      'Eine neue Fassung räumt den Topf der alten (' + nachher.join(', ') + ')');
    ok(fremd.length === 0, 'Keine Anfrage geht an eine fremde Adresse' + (fremd.length ? ': ' + fremd[0] : ''));
    ok(swFehler.length === 0, 'Service Worker ohne Seitenfehler' + (swFehler.length ? ': ' + swFehler[0] : ''));
    await swCtx.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log(fails ? `${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `ALLE ${checks} CHECKS BESTANDEN`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
