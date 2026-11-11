// Rauchtest: jede Ansicht und die wichtigsten Blätter einmal mit der
// Testliga zeichnen, Fehler sammeln und auf Wunsch Bildschirmfotos ablegen.
//
//   node tools/rauchtest.cjs                  nur Fehler
//   node tools/rauchtest.cjs --fotos=<Ordner> dazu je Ansicht ein PNG (390 px)
//
// Kein Ersatz für die Suiten: er sagt nur, ob etwas beim Zeichnen bricht,
// und zeigt, wie es aussieht. Genau das braucht ein Umbau zuerst.
const path = require('node:path');
const fs = require('node:fs');
const {createHarness, fixtures} = require('./performance.cjs');

const fotoArg = process.argv.find(a => a.startsWith('--fotos='));
const fotos = fotoArg ? path.resolve(fotoArg.slice(8)) : null;
if (fotos) fs.mkdirSync(fotos, {recursive: true});
const nur = (process.argv.find(a => a.startsWith('--nur=')) || '').slice(6);

const id = fixtures.ids[4], id2 = fixtures.ids[6];
const m0 = fixtures.matches[fixtures.matches.length - 1].id;
const FAELLE = [
  ['liga', `closeSheet(true);tab='ranking';period='season';render()`],
  ['liga-tafel', `closeSheet(true);tab='ranking';period='all';render()`],
  ['liga-woche', `closeSheet(true);tab='ranking';period='week';render()`],
  ['seiten', `closeSheet(true);tab='positions';rankMetric='drive';render()`],
  ['awards', `closeSheet(true);tab='awards';awView='awards';render()`],
  ['rekorde', `closeSheet(true);tab='awards';awView='rekorde';rekKammer='';render()`],
  ['chronik', `closeSheet(true);tab='awards';awView='chronik';render()`],
  ['teams', `closeSheet(true);tab='teams';render()`],
  ['verlauf', `closeSheet(true);tab='history';histFilter='all';_histPage=0;render()`],
  ['eingabe', `closeSheet(true);tab='match';M=matchLeer();render()`],
  ['eingabe-voll', `closeSheet(true);tab='match';M={...matchLeer(),A1:'${fixtures.ids[0]}',A2:'${fixtures.ids[1]}',B1:'${fixtures.ids[2]}',B2:'${fixtures.ids[3]}',saetze:[{a:6,b:4},{a:3,b:6},{a:10,b:8}]};render()`],
  ['einstellungen', `closeSheet(true);tab='settings';render()`],
  ['profil', `closeSheet(true);tab='ranking';render();showPlayer('${id}')`],
  ['duo', `closeSheet(true);showTeam('${id}','${id2}')`],
  ['h2h', `closeSheet(true);showH2H('${id}','${id2}')`],
  ['match', `closeSheet(true);showMatchDetail('${m0}')`],
  ['match-bearbeiten', `closeSheet(true);showEditMatch('${m0}')`],
  ['news', `closeSheet(true);_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;openNewsFeed()`],
];

(async () => {
  const {browser, page, K, errors} = await createHarness();
  let rot = 0;
  try {
    for (const [name, code] of FAELLE) {
      if (nur && !name.includes(nur)) continue;
      const vorher = errors.length;
      let fehler = null;
      try { await K(code); await page.waitForTimeout(fotos ? 1400 : 250); }
      catch (e) { fehler = e.message.split('\n')[0]; }
      const neu = errors.slice(vorher);
      if (fehler || neu.length) { rot++; console.log('✗', name, fehler || '', neu.join(' | ').slice(0, 400)); }
      else console.log('✓', name);
      if (fotos) await page.screenshot({path: path.join(fotos, name + '.png'), fullPage: true});
    }
  } finally { await browser.close(); }
  console.log(rot ? `${rot} Ansichten mit Fehlern` : 'alle Ansichten ohne Fehler');
  process.exit(rot ? 1 : 0);
})();
