// DIE AKTIVE LIGA OHNE RUHESTÄNDLER [§C40] — im echten Browser, über alles,
// was ein Reiter zeigt.
//
// Die anderen Suiten prüfen die Rechnungen, aus denen die Ansichten lesen.
// Diese prüft, was auf dem Bildschirm steht: jeder Reiter der Navigation,
// jeder Wähler darin und jeder Einblick, in jeder Kombination bis zur Tiefe
// drei, und die Spielerwahl der Eingabe. Sie kennt keine einzelne Ansicht —
// ein Reiter, ein Wähler oder eine Liste, die es heute noch nicht gibt,
// wird genauso abgesucht. Gesucht wird der Ruheständler mit Name und ID.
//
// Abgesucht wird nach seinem Abschluss [§C40]: jeder Zeitraum, in dem er
// gespielt hat, ist dann zu, und die anderen haben seitdem weitergespielt.
// Er darf nur dort stehen, wo eine Ansicht es ausdrücklich erlaubt:
// innerhalb von `[data-ruhestand]` (die Liste der Ruheständler) und in
// `[data-bis]`, einem Stück Geschichte, das spätestens mit seinem Abschluss
// endet. Und in den Reitern, die Geschichte sind (`GESCHICHTE`): der Verlauf
// zeigt jede Partie, auch seine.
const fs = require('fs');
const chromium = require('./browser.js').ladeChromium();
if(!chromium){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Was ein Reiter zeigt, lässt sich nur gerendert absuchen.');
  console.log('  Lokal: npm install --no-save playwright-core');
  process.exit(2);
}

// Reiter, die Geschichte sind und ihn deshalb zeigen dürfen. Ein neuer
// Reiter steht NICHT hier und wird damit abgesucht, bis jemand entscheidet,
// dass er Geschichte ist.
const GESCHICHTE = ['history'];
const TIEFE = 3;

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
// Er hört eine Minute nach der letzten Partie der Liga auf. Danach spielen
// die anderen drei Wochen lang weiter, nach seinem Abschluss: die laufende
// Woche und der laufende Monat sind dann ohne ihn gespielt.
const RUHE = 'Martin', RUHE_ID = IDS[NAMES.indexOf(RUHE)];
const LETZTE = Math.max(...MATCHES.map(m => Date.parse(m.created_at)));
const ENDE = new Date(LETZTE + 60000).toISOString();
const ANDERE = IDS.filter(id => id !== RUHE_ID);
for(let i = 0; i < 40; i++) MATCHES.push({id:'w' + i,
  a1:ANDERE[i % 11], a2:ANDERE[(i + 3) % 11], b1:ANDERE[(i + 5) % 11], b2:ANDERE[(i + 8) % 11],
  a1_side:'drive', a2_side:'reves', b1_side:'drive', b2_side:'reves', games_a:10, games_b:i % 9, winner:'A', exp_a:.5,
  created_at:new Date(LETZTE + 9 * 864e5 + i * 7 * 3600e3).toISOString(), deltas:{}});
const PLAYERS = NAMES.map((n,i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:.5,
  avatar_id:null, created_at:'2026-05-01T00:00:00Z', retired_at: n === RUHE ? ENDE : null}));
const SEASONS = [
  {id:'2026-05', label:'Mai 2026',    start_date:'2026-04-30', end_date:'2026-05-31'},
  {id:'2026-06', label:'Juni 2026',   start_date:'2026-05-31', end_date:'2026-06-30'},
  {id:'2026-07', label:'Juli 2026',   start_date:'2026-06-30', end_date:'2026-07-31'},
];
const NOW = LETZTE + 9 * 864e5 + 40 * 7 * 3600e3;

const html = fs.readFileSync(require('./ziel.js'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nwindow.__k = {eval: c => eval(c)};\n' + code.slice(lc);
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
  console.log((c ? '  ok  ' : '  ✗   ') + '  ' + msg + (det ? (c ? '  (' + det + ')' : '  [' + det + ']') : ''));
};

// Die Zustände, mit denen ein Reiter beginnt. Vor jedem Pfad wird auf sie
// zurückgesetzt, damit ein Pfad nicht vom vorigen abhängt.
const ZUSTAND = ['period','ligaSeasonId','ligaSicht','awView','awPeriod','awSeasonId','awWeekStart',
  'rekKammer','rankMetric','teamView','teamSort','posSort','einblickOffen','teamSearch','histFilter'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8">' + styles
    + '</head>' + bodyHtml + '</body></html>');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  const K = async src => page.evaluate(s => window.__k.eval(s), src);
  await K(`
    players = ${JSON.stringify(PLAYERS)};
    matches = ${JSON.stringify(MATCHES)};
    seasons = ${JSON.stringify(SEASONS)};
    invalidateCache();
    const _rc = simulateEloWithSliders(matches);
    const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
    matches.forEach(m => { m.deltas = _d[m.id] || {}; });
    invalidateCache();
    globalThis.__start = {${ZUSTAND.map(z => z + ':' + z).join(',')}};
    'bereit'`);
  ok(errors.length === 0, 'Skript lädt ohne Fehler', errors[0]);
  const ABSCHLUSS = await K(`ruhestandAbschlussMs('${RUHE_ID}')`);
  ok(await K(`imRuhestand('${RUHE_ID}') && !ligaAktiv('${RUHE_ID}')`) && NOW > ABSCHLUSS && LETZTE + 9 * 864e5 > ABSCHLUSS,
     RUHE + ' ist im Ruhestand, sein Abschluss liegt hinter ihm, und die anderen spielen danach', new Date(ABSCHLUSS).toISOString());

  // Die Reiter kommen aus der Navigation selbst, die Eingabe dazu.
  const reiter = (await K('NAV.map(n => n[0])')).concat(['match']);
  const warte = () => page.waitForTimeout(60);
  const wurzel = async t => {
    await K(`${ZUSTAND.map(z => z + ' = __start.' + z).join('; ')}; tab = ${JSON.stringify(t)}; render();`);
    await warte();
  };
  // Jeder Knopf eines Reiters ist eine mögliche Wahl: Wähler, Kammern,
  // Einblicke und alles, was künftig dazukommt. Ein Knopf, der ein Blatt
  // öffnet, ändert den Reiter nicht und wird über den Abdruck des Reiters
  // als schon gesehen erkannt. Was nur zeigt, wer ein Ruheständler ist, wird
  // nicht aufgeklappt. Die Eingabe wird nur abgesucht, nicht gedrückt: ihre
  // Knöpfe zählen Tore und speichern.
  const WAHL = 'button, [role=tab]';
  const knoepfe = () => page.evaluate(sel => [...document.querySelectorAll('#main ' + sel.split(', ').join(', #main '))]
    .filter(b => !b.closest('[data-ruhestand]')).map(b => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)), WAHL);
  const druecke = i => page.evaluate(([sel, i]) => {
    const b = [...document.querySelectorAll('#main ' + sel.split(', ').join(', #main '))].filter(b => !b.closest('[data-ruhestand]'))[i];
    if(b) b.click();
  }, [WAHL, i]);
  const absuchen = () => page.evaluate(([id, name, ende]) => {
    const main = document.getElementById('main').cloneNode(true);
    main.querySelectorAll('[data-ruhestand]').forEach(e => e.remove());
    main.querySelectorAll('[data-bis]').forEach(e => { if(+e.dataset.bis <= ende) e.remove(); });
    const t = main.textContent.replace(/\s+/g, ' ');
    const i = t.search(new RegExp('\\b' + name + '\\b'));
    return {id: main.outerHTML.includes(id), name: i >= 0 ? t.slice(Math.max(0, i - 50), i + 30) : '',
            sig: main.innerHTML.length + ':' + main.textContent.length, leer: !main.textContent.trim()};
  }, [RUHE_ID, RUHE, ABSCHLUSS]);

  for(const t of reiter){
    console.log('\n═══ REITER ' + t + (GESCHICHTE.includes(t) ? ' — Geschichte, nicht abgesucht' : '') + ' ═══');
    if(GESCHICHTE.includes(t)) continue;
    const gesehen = new Set(), funde = [];
    let ansichten = 0;
    // Breitensuche über Pfade aus Knopfnummern, jeder ab dem Anfangszustand.
    let reihe = [[]];
    for(let tiefe = 0; tiefe <= TIEFE && reihe.length; tiefe++){
      const naechste = [];
      for(const pfad of reihe){
        await wurzel(t);
        for(const i of pfad){ await druecke(i); await warte(); }
        const s = await absuchen();
        if(gesehen.has(s.sig)) continue;
        gesehen.add(s.sig);
        ansichten++;
        if(s.id || s.name){
          const namen = await knoepfe();
          funde.push(pfad.map(i => namen[i] || i).join(' › ') + ': ' + (s.name || 'nur die ID'));
        }
        if(tiefe < TIEFE && t !== 'match'){
          const n = (await knoepfe()).length;
          for(let i = 0; i < n; i++) naechste.push(pfad.concat(i));
        }
      }
      reihe = naechste;
    }
    ok(ansichten > 0 && !funde.length, t + ': ' + RUHE + ' steht in keiner Ansicht der aktiven Liga',
       funde.length ? funde.slice(0, 3).join(' | ') : ansichten + ' Ansichten');
  }

  // Die Spielerwahl der Eingabe zeigt ihre Liste erst beim Tippen.
  console.log('\n═══ DIE SPIELERWAHL ═══');
  await wurzel('match');
  const felder = await page.evaluate(() => document.querySelectorAll('#main [data-combo]').length);
  const angeboten = [];
  for(let i = 0; i < felder; i++){
    const f = page.locator('#main [data-combo]').nth(i);
    await f.focus();
    await f.fill(RUHE.slice(0, 3));
    await warte();
    const s = await absuchen();
    if(s.id || s.name) angeboten.push(i);
    await f.press('Escape');
    await f.fill('');
  }
  ok(felder >= 4 && !angeboten.length, 'kein Feld der Eingabe bietet ' + RUHE + ' an',
     angeboten.length ? 'Feld ' + angeboten.join(', ') : felder + ' Felder');
  // Wer seinen Namen tippt, liest, warum er nicht zur Wahl steht — dort stand
  // „Kein Treffer", als gäbe es ihn nicht.
  {
    const f = page.locator('#main [data-combo]').first();
    await f.focus();
    await f.fill(RUHE);
    await warte();
    const hinweis = await page.evaluate(() => {
      const e = document.querySelector('#main [data-combolist] [data-ruhestand]');
      return e ? e.textContent.trim() : '';
    });
    await f.press('Escape');
    await f.fill('');
    ok(hinweis === RUHE + ' hat die Karriere beendet', 'die Spielerwahl sagt, dass ' + RUHE + ' die Karriere beendet hat', hinweis || 'kein Hinweis');
  }

  // Die Profile der Aktiven sind Blätter und liegen außerhalb von `#main`.
  // Ein Bestwert darin ist ein Vergleich über die Laufbahn [§C40]: bester
  // und schwächster Partner, Lieblings- und Angstgegner, die Gegner eines
  // Duos, der Platz im Feld des Fingerabdrucks, die Reihe gegen denselben
  // Gegner. Die Bilanz mit jedem („alle Beziehungen") nennt ihn weiter.
  console.log('\n═══ DIE PROFILE DER AKTIVEN ═══');
  const aktive = await K(`players.filter(p => ligaAktiv(p)).map(p => p.id)`);
  const beziehungen = async () => {
    const out = [];
    for(const id of aktive){
      await K(`showPlayer('${id}')`);
      const t = await page.evaluate(() => (document.querySelector('#sheet .pp-rel-grid') || {}).textContent || '');
      if(t) out.push({id, t});
    }
    return out;
  };
  const bez = await beziehungen();
  const mitIhm = bez.filter(b => new RegExp('\\b' + RUHE + '\\b').test(b.t)).map(b => NAMES[IDS.indexOf(b.id)]);
  ok(bez.length === aktive.length && !mitIhm.length,
     'in keinem Profil der Aktiven ist ' + RUHE + ' bester oder schwächster Partner, Lieblings- oder Angstgegner',
     mitIhm.length ? mitIhm.join(', ') : bez.length + ' Profile');
  const bilanzen = [];
  for(const id of aktive){
    await K(`showPlayerH2HList('${id}')`);
    if(await page.evaluate(n => new RegExp('\\b' + n + '\\b').test(document.getElementById('sheet').textContent), RUHE)) bilanzen.push(id);
  }
  ok(bilanzen.length >= aktive.length - 2, 'in „alle Beziehungen" steht er weiter, mit seiner Bilanz',
     bilanzen.length + ' von ' + aktive.length + ' Profilen');
  const duoGegner = await K(`(() => { const ids = ${JSON.stringify(aktive)}, f = []; let n = 0;
    ids.forEach((a, i) => ids.slice(i + 1).forEach(b => { const d = teamDetail(a, b); if(!d.games) return; n++;
      [d.nemesis, d.favorite].forEach(x => { if(x && x.oid === '${RUHE_ID}') f.push(pname(a) + ' & ' + pname(b)); }); }));
    return {n, f}; })()`);
  ok(duoGegner.n > 20 && !duoGegner.f.length, 'kein Duo zweier Aktiver hat ihn als Erz- oder Lieblingsgegner',
     duoGegner.f.length ? duoGegner.f.slice(0, 3).join(', ') : duoGegner.n + ' Duos');
  // Das Feld des Fingerabdrucks ist die aktive Liga; ein Ruheständler steht
  // nur für seinen eigenen Abdruck darin.
  const feld = await K(`(() => { const n = players.filter(p => ligaAktiv(p) && playerStats(p.id).games >= FINGER_MIN_SPIELE).length;
    const von = players.filter(p => ligaAktiv(p)).map(p => fingerabdruck(p.id)).filter(Boolean).map(A => A[0].von);
    const er = fingerabdruck('${RUHE_ID}');
    return {n, von, er: er ? er[0].von : 0}; })()`);
  ok(feld.von.length >= 8 && feld.von.every(v => v === feld.n),
     'der Fingerabdruck eines Aktiven misst ihn nur an der aktiven Liga', 'Feld ' + feld.n + ', gemessen: ' + [...new Set(feld.von)].join('/'));
  ok(feld.er === feld.n + 1, 'sein eigener Abdruck misst ihn an der aktiven Liga und an ihm selbst', feld.er + ' im Feld');
  // Die Reihe gegen denselben Gegner (Auszeichnung „Angstgegner"): gegen
  // einen Ruheständler läuft sie nie weiter und reißt nie.
  const reihe = await K(`players.filter(p => ligaAktiv(p)).map(p => {
    const vs = {};
    matches.filter(m => matchOf(p.id, m)).sort((a, b) => mts(a) - mts(b)).forEach(m => {
      const onA = m.a1 === p.id || m.a2 === p.id, w = (m.winner === 'A') === onA;
      (onA ? [m.b1, m.b2] : [m.a1, m.a2]).filter(o => ligaAktiv(o)).forEach(o => { vs[o] = w ? 0 : (vs[o] || 0) + 1; });
    });
    return [p.name, Math.max(0, ...Object.values(vs)), (_badgeStreakState('nemesis', p.id) || {}).cur];
  }).filter(r => r[1] !== r[2])`);
  ok(!reihe.length, 'die laufende Reihe gegen denselben Gegner zählt nur Gegner, die noch spielen',
     reihe.length ? reihe.map(r => r[0] + ' ' + r[2] + ' statt ' + r[1]).join(', ') : aktive.length + ' Spieler');
  await K(`closeSheet(true)`);

  // Gegenprobe: ohne Karriereende steht er in derselben Suche überall da.
  // Ohne sie wäre eine Suche, die gar nichts findet, immer grün.
  console.log('\n═══ GEGENPROBE ═══');
  await K(`pmap()['${RUHE_ID}'].retired_at = null; invalidateCache();`);
  // In „Gesamt“: im laufenden Monat hat er auch ohne Karriereende nicht gespielt.
  await wurzel('ranking');
  await K(`period = 'all'; render();`); await warte();
  const da = await absuchen();
  const bezDa = (await beziehungen()).filter(b => new RegExp('\\b' + RUHE + '\\b').test(b.t)).length;
  await K(`closeSheet(true)`);
  await K(`pmap()['${RUHE_ID}'].retired_at = ${JSON.stringify(ENDE)}; invalidateCache();`);
  ok(da.id && !!da.name, 'ohne Karriereende findet dieselbe Suche ihn in der Liga unter Gesamt', da.name);
  ok(bezDa >= 3, 'ohne Karriereende steht er in den Beziehungen der Aktiven', bezDa + ' Profile');
  ok(errors.length === 0, 'kein Fehler beim Durchklicken', errors[0]);

  await browser.close();
  console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('ABBRUCH ' + (e.stack || e)); process.exit(1); });
