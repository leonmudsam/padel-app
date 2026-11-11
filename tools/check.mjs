#!/usr/bin/env node
/*
 *  Prüft, was beim Zerlegen in viele Dateien schiefgehen kann — und nur das.
 *
 *    1  Baut das Ergebnis nach und vergleicht es mit dem ausgelieferten
 *       index.html (Versionszeile ausgenommen). Schlägt an, wenn jemand
 *       index.html direkt bearbeitet hat statt src/.
 *    2  Lässt node die zusammengesetzte Logik parsen — ein Syntaxfehler an
 *       einer Dateigrenze fällt sonst erst im Browser auf.
 *    3  Zählt geschweifte Klammern im CSS: eine offene Klammer am Dateiende
 *       frisst sonst still die nächste Datei.
 *    4  Nimmt sich die Bezeichner auf oberster Ebene vor — zweimal
 *       deklariert oder nirgends benutzt. Getrennte Dateien sehen
 *       unabhängig aus, sind es aber nicht: nach dem Zusammensetzen liegen
 *       sie im selben Gültigkeitsbereich. Und was niemand mehr ruft, fällt
 *       in einer IIFE ohne Importe von selbst niemandem auf.
 *    5  Prüft, dass die ausgelieferte Datei die Version trägt, die zu ihrem
 *       Inhalt gehört. Von Hand gepflegt stand sie sechs Veröffentlichungen
 *       lang still — und `checkForUpdate` verglich damit die Version einer
 *       Seite mit sich selbst: kein Gerät erfuhr je von einer neuen Fassung.
 *    6  Vergleicht CLAUDE.md mit der Wirklichkeit: jede Datei in der
 *       Landkarte (JS und CSS) und im Baum, jede Zahl im Text, jede Suite
 *       in tests/README.md. Eine veraltete Arbeitsanweisung ist schlimmer
 *       als keine — sie wird geglaubt.
 *    7  Folgt jedem Verweis der Doku: ein Kürzel §Cnn, ein Link, ein Pfad
 *       muss auf etwas zeigen, das es gibt, jedes Gesetz muss im Code
 *       zitiert sein und mit Regel, Stellen und Prüfung beginnen. Ein Verweis ins Leere wird nicht rot, er wird
 *       geglaubt.
 *    8  Erzeugt docs/README.md und docs/anker.md im Speicher neu und
 *       vergleicht sie mit dem Eingecheckten, wie Wächter 1 den Bau.
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join as pjoin } from 'node:path';
import { existsSync } from 'node:fs';
import { abschnitt, ERZEUGT, dokuDateien, ankerVon } from './doku.mjs';

let fehler = 0;
const rot = s => { console.error('  ✗ ' + s); fehler++; };
const ok  = s => console.log('  ✓ ' + s);

// Versionszeile und Zeilenenden bleiben außen vor. Der Arbeitsbaum unter
// Windows trägt CRLF, das Repository und der Prüf-Job unter Linux tragen LF —
// derselbe Inhalt ergab damit zwei Fingerabdrücke, und Wächter 5 schlug nur im
// Job an. Dieselbe Normalisierung steht in build.mjs.
const strip = s => s.replace(/\r\n/g, '\n')
  .replace(/const BUILD_VERSION=['"][^'"]*['"]/, "const BUILD_VERSION='x'");

// ── 1 ─ kein Drift zwischen src/ und index.html ───────────────────────────
// Erst bauen, dann vergleichen. Wer nur dist/index.html liest, prüft im
// Zweifel zwei alte Dateien gegeneinander und bekommt einen grünen Haken
// dafür, dass sich seit dem letzten Build nichts geändert hat — auch wenn
// src/ inzwischen etwas ganz anderes sagt.
execFileSync(process.execPath, ['tools/build.mjs'], { stdio: 'pipe' });
const gebaut  = readFileSync('dist/index.html', 'utf8');
const geliefert = readFileSync('index.html', 'utf8');
if (strip(gebaut) !== strip(geliefert)) {
  rot('index.html weicht von src/ ab — wurde index.html direkt bearbeitet?');
} else ok('index.html entspricht src/');
// Der Service Worker ist die zweite ausgelieferte Datei [§C42]. Er trägt die
// Fassung der Seite; verglichen wird ohne sie, wie bei der Seite.
const swStrip = s => s.replace(/\r\n/g, '\n').replace(/const SW_FASSUNG = '[^']*';/, "const SW_FASSUNG = 'x';");
const swGebaut = readFileSync('dist/sw.js', 'utf8');
const swGeliefert = existsSync('sw.js') ? readFileSync('sw.js', 'utf8') : '';
if (swStrip(swGebaut) !== swStrip(swGeliefert))
  rot('sw.js weicht von src/sw.js ab — cp dist/sw.js sw.js');
else ok('sw.js entspricht src/sw.js');

// ── 2 ─ die Logik parst ───────────────────────────────────────────────────
const scriptMatch = gebaut.match(/<script>\r?\n([\s\S]*)\r?\n<\/script>/);
const skript = scriptMatch ? scriptMatch[1] : '';
const tmp = pjoin(mkdtempSync(pjoin(tmpdir(), 'padel-')), 'app.js');
writeFileSync(tmp, skript);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); ok('JavaScript parst'); }
catch (e) { rot('Syntaxfehler:\n' + String(e.stderr || e.message).trim()); }

// ── 3 ─ CSS-Klammern gehen auf ────────────────────────────────────────────
// Eigener Zähler: vorher hing die Meldung an `fehler`, also verschwand sie,
// sobald irgendein anderer Wächter angeschlagen hatte — dann sah es aus, als
// wäre die Prüfung gar nicht gelaufen.
let cssSchief = 0;
for (const f of readdirSync('src/css').sort()) {
  const s = readFileSync(`src/css/${f}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const auf = (s.match(/\{/g) || []).length, zu = (s.match(/\}/g) || []).length;
  if (auf !== zu) { rot(`src/css/${f}: ${auf} × { gegen ${zu} × }`); cssSchief++; }
}
if (!cssSchief) ok('CSS-Klammern ausgeglichen');

// ── 4 ─ keine doppelten Deklarationen auf oberster Ebene ──────────────────
const DEKL = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/;
const wo = new Map();
let jsGanz = '';
for (const f of readdirSync('src/js').sort()) {
  const txt = readFileSync(`src/js/${f}`, 'utf8');
  jsGanz += '\n' + txt;
  txt.split('\n').forEach((z, i) => {
    const m = DEKL.exec(z);
    if (!m) return;
    const name = m[1];
    if (!wo.has(name)) wo.set(name, []);
    wo.get(name).push(`${f}:${i + 1}`);
  });
}
const doppelt = [...wo].filter(([, v]) => v.length > 1);
if (doppelt.length) {
  for (const [name, v] of doppelt) rot(`${name} zweimal deklariert — ${v.join(', ')}`);
} else ok(`${wo.size} Bezeichner auf oberster Ebene, alle eindeutig`);

// Und keiner davon ist tot. In einer IIFE ohne Importe sagt nichts, dass eine
// Funktion niemanden mehr hat — sie steht einfach weiter da. `METRICS` tat das
// und führte dabei eine Metrik auf, die es seit zwei Veröffentlichungen nicht
// mehr gab: wer sie liest, glaubt sie.
// Kommentare fallen vorher weg, sonst zählt eine Erwähnung im Fließtext als
// Benutzung. Was nur aus HTML oder CSS gerufen wird, gilt als benutzt.
// Die Tests zählen bewusst NICHT mit: was nur eine Suite ruft, ist im
// Bundle auf jedem Telefon totes Gewicht. Wer hier rot wird, weil ein Test
// den einzigen Aufrufer stellt, ändert den Test — er soll ohnehin den Weg
// prüfen, den die App wirklich nimmt.
const ohneKommentar = jsGanz
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const gerueste = readFileSync('src/index.html', 'utf8')
  + readdirSync('src/css').map(f => readFileSync(`src/css/${f}`, 'utf8')).join('\n');
const tot = [];
for (const [name, v] of wo) {
  const wort = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b', 'g');
  if ((ohneKommentar.match(wort) || []).length <= 1 && !wort.test(gerueste))
    tot.push(`${name} (${v[0]})`);
}
if (tot.length) rot('nur an ihrer Deklaration erwähnt: ' + tot.join(', '));
else ok('kein Bezeichner ohne Verwendung');

// ── 5 ─ die Auslieferung trägt ihren Fingerabdruck ────────────────────
// BUILD_VERSION endet auf einem Hash über genau den Inhalt, der ausgeliefert
// wird (build.mjs vergibt ihn). Eine Version, die nicht zu ihrem Inhalt
// passt, heißt: irgendwo steht eine Nummer von Hand — und dann erfährt kein
// Gerät mehr von einer neuen Fassung.
const fp = createHash('sha256').update(strip(geliefert)).digest('hex').slice(0, 8);
const gelieferteV = (geliefert.match(/const BUILD_VERSION=['"]([^'"]*)['"]/) || [])[1];
if (!gelieferteV) rot('index.html hat keine BUILD_VERSION');
else if (!gelieferteV.endsWith('.' + fp))
  rot(`index.html trägt Version ${gelieferteV}, der Inhalt ergibt ….${fp}`
    + ' — neu bauen und kopieren');
else ok(`Version ${gelieferteV} passt zum ausgelieferten Inhalt`);
// Ein Service Worker mit einer anderen Fassung als die Seite räumte die
// Töpfe der Seite nie oder zur falschen Zeit.
const swFassung = (swGeliefert.match(/const SW_FASSUNG = '([^']*)';/) || [])[1];
if (gelieferteV && swFassung !== gelieferteV)
  rot(`sw.js trägt Fassung ${swFassung}, die Seite ${gelieferteV} — neu bauen und beide kopieren`);
else if (gelieferteV) ok('sw.js trägt die Fassung der Seite');

// ── 6 ─ die Arbeitsanweisung stimmt ───────────────────────────────
// CLAUDE.md ist die erste Datei, die eine neue Sitzung liest. Was hier falsch
// steht, wird geglaubt — und niemand merkt es, weil eine Prosa-Zeile nicht
// rot wird. Also wird sie hier rot.
const anweisung = readFileSync('CLAUDE.md', 'utf8');
const jsDateien  = readdirSync('src/js').filter(f => f.endsWith('.js')).sort();
const cssDateien = readdirSync('src/css').filter(f => f.endsWith('.css')).sort();
const suiten = readdirSync('tests').filter(f => f.endsWith('.test.js')).sort();
let anwSchief = 0;
const schief = m => { rot('CLAUDE.md: ' + m); anwSchief++; };

// (a) Die Landkarte nennt jede Datei aus src/js und src/css — und keine,
// die es nicht gibt. JS steht ohne Endung, CSS mit: `00-prolog` und
// `00-tokens` sähen sonst gleich aus.
const karte = abschnitt(anweisung, '## 3. Landkarte');
if (karte === null) schief('§3 Landkarte nicht gefunden');
else {
  const vergleiche = (genannt, echt, was) => {
    const fehlend = echt.filter(n => !genannt.has(n));
    const zuviel  = [...genannt].filter(n => !echt.includes(n));
    if (fehlend.length) schief(`§3 nennt diese ${was}-Dateien nicht: ` + fehlend.join(', '));
    if (zuviel.length)  schief(`§3 nennt ${was}-Dateien, die es nicht gibt: ` + zuviel.join(', '));
  };
  vergleiche(new Set((karte.match(/`(\d\d[a-z]?-[a-z0-9-]+)`/g) || []).map(x => x.slice(1, -1))),
    jsDateien.map(f => f.replace(/\.js$/, '')), 'JS');
  vergleiche(new Set((karte.match(/`(\d\d[a-z]?-[a-z0-9-]+\.css)`/g) || []).map(x => x.slice(1, -1))),
    cssDateien, 'CSS');
}

// (b) Die Zahlen. Jede steht an genau einer Stelle und wird hier nachgezählt.
const zahl = (re, was, ist) => {
  const m = anweisung.match(re);
  if (!m) return schief(`${was} steht nicht mehr im Text (Muster geändert?)`);
  if (+m[1] !== ist) schief(`${was}: dort steht ${m[1]}, gezählt sind ${ist}`);
};
zahl(/Wächter 4 zählt sie \(aktuell \*\*(\d+)\*\*\)/, '§2 Bezeichnerzahl', wo.size);
zahl(/^src\/css\/\s+(\d+) Dateien$/m, '§2 Zahl der CSS-Dateien', cssDateien.length);
zahl(/^src\/js\/\s+(\d+) Dateien$/m,  '§2 Zahl der JS-Dateien',  jsDateien.length);

// (c) Die Suiten: jede Datei eine Zeile in der Tabelle, keine Zeile zuviel.
// Gelesen wird nur der Abschnitt der Tabelle, nicht bis zum Dateiende.
const suitenDoku = existsSync('tests/README.md') ? readFileSync('tests/README.md', 'utf8') : '';
const tabelle = abschnitt(suitenDoku, '## Die Suiten');
if (tabelle === null) schief('tests/README.md: Abschnitt „## Die Suiten" fehlt');
const genannteSuiten = new Set(((tabelle || '').match(/^\| `([a-z]+)` \|/gm) || [])
  .map(x => x.split('`')[1]));
const echteSuiten = suiten.map(f => f.replace('.test.js', ''));
const suiteFehlt = echteSuiten.filter(n => !genannteSuiten.has(n));
const suiteZuviel = [...genannteSuiten].filter(n => !echteSuiten.includes(n));
if (suiteFehlt.length)  schief('tests/README.md nennt diese Suiten nicht: ' + suiteFehlt.join(', '));
if (suiteZuviel.length) schief('tests/README.md nennt Suiten, die es nicht gibt: ' + suiteZuviel.join(', '));

// (d) Der Baum in §2 nennt jeden Eintrag der Wurzel, jede Datei in tools/
// und jede Hilfsdatei in tests/. Dort fehlten zuletzt tests/runtime.js,
// tests/browser.js und beide Messwerkzeuge — wer sie suchte, fand sie nicht.
const baum = (abschnitt(anweisung, '## 2. Aufbau des Repositories') || '').split('```')[1] || '';
const imBaum = new Set(baum.split('\n').map(z => z.split(/\s+/)[0]).filter(Boolean));
const wurzel = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  .map(f => f.includes('/') ? f.split('/')[0] + '/' : f).filter(f => !f.startsWith('.') || f === '.github/');
const sollImBaum = [...new Set(wurzel.map(f => f === '.github/' ? '.github/workflows/' : f)),
  ...readdirSync('tools').filter(f => f !== 'README.md').map(f => 'tools/' + f),
  ...readdirSync('tests').filter(f => /\.(m?js|cjs)$/.test(f) && !f.endsWith('.test.js')).map(f => 'tests/' + f)];
const nichtImBaum = sollImBaum.filter(f => !imBaum.has(f) && !(f.endsWith('/') && [...imBaum].some(x => x.startsWith(f))));
if (!imBaum.has('src/js/') || !imBaum.has('src/css/')) schief('§2 Baum: src/js/ und src/css/ fehlen');
if (nichtImBaum.length) schief('§2 Baum nennt nicht: ' + nichtImBaum.join(', '));

if (!anwSchief) ok('CLAUDE.md nennt jede Datei und jede Zahl richtig');

// ── 7 ─ jeder Verweis der Doku trägt ──────────────────────────────
let verweisSchief = 0;
const vs = m => { rot('Verweis: ' + m); verweisSchief++; };
const lesen = f => readFileSync(f, 'utf8');
const codeDateien = [...jsDateien.map(f => 'src/js/' + f), ...cssDateien.map(f => 'src/css/' + f),
  ...suiten.map(f => 'tests/' + f), 'src/index.html'];
const doku = dokuDateien();

// (a) Ein Kürzel §Cnn ist bis 24 ein Abschnitt des CSS (CSS-Landkarte in
// CLAUDE.md §3, Bereiche wie „§C4–C6"), ab 25 ein Gesetz mit eigener Datei.
const cssKarte = abschnitt(anweisung, '### CSS') || '';
const cssKuerzel = new Set();
for (const m of cssKarte.matchAll(/^\| `[^`]+\.css` \| §C(\d+)(?:–C(\d+))?/gm))
  for (let n = +m[1]; n <= +(m[2] || m[1]); n++) cssKuerzel.add(n);
const gesetzDateien = existsSync('docs/gesetze') ? readdirSync('docs/gesetze').filter(f => /^C\d+-/.test(f)) : [];
const gesetzNr = new Map(gesetzDateien.map(f => [+f.match(/^C(\d+)-/)[1], f]));
const zitiert = new Map();
for (const f of [...codeDateien, ...doku])
  for (const m of lesen(f).matchAll(/§C(\d+)\b/g)){
    const n = +m[1];
    if (!zitiert.has(n)) zitiert.set(n, new Set());
    zitiert.get(n).add(f);
  }
for (const [n, wo] of [...zitiert].sort((a, b) => a[0] - b[0])){
  if (n < 25 ? !cssKuerzel.has(n) : !gesetzNr.has(n))
    vs(`§C${n} ist nirgends erklärt (zitiert in ${[...wo].slice(0, 3).join(', ')})`
      + (n < 25 ? ' — CSS-Landkarte in CLAUDE.md §3' : ' — docs/gesetze/C' + n + '-….md anlegen'));
}
// (b) Jedes Gesetz wird im Code zitiert: sonst gilt es nirgends.
for (const [n, f] of gesetzNr)
  if (![...(zitiert.get(n) || [])].some(x => x.startsWith('src/')))
    vs(`docs/gesetze/${f}: §C${n} steht an keiner Stelle in src/`);

// (c) Links und Pfade in der Doku zeigen auf etwas, das es gibt.
for (const f of doku){
  const text = lesen(f).replace(/```[\s\S]*?```/g, '');
  const ordner = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '.';
  for (const m of text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)){
    if (/^[a-z]+:/.test(m[1])) continue;
    if (!existsSync(pjoin(ordner, m[1]))) vs(`${f}: Link ${m[1]} führt ins Leere`);
  }
  for (const m of text.matchAll(/`((?:docs|tests|tools|src|datenbank|mockup)\/[^`\s*<>…]+)`/g)){
    const pfad = m[1].replace(/[.,:;]$/, '');
    if (!existsSync(pfad) && !existsSync(pfad + '.js') && !existsSync(pfad + '.test.js'))
      vs(`${f}: Pfad ${pfad} gibt es nicht`);
  }
}
// (d) Ein Abschnitt im Code hat eine Nummer, die es nur einmal gibt, und
// jedes Zitat [§n.m] in Code und Tests zeigt auf einen Abschnitt. Sieben
// Nummern standen doppelt (§3.4 war Positionsverlauf UND Statistik), und
// [§9.6] zeigte auf nichts — der Autosync heißt §11.9. Ein Zitat hinter
// „….md" meint den Abschnitt eines Dokuments, nicht des Codes.
const anker = new Map();
for (const f of jsDateien)
  for (const [k] of ankerVon('src/js/' + f)) anker.set(k, [...(anker.get(k) || []), f]);
for (const [k, wo] of anker) if (wo.length > 1) vs(`${k} steht als Abschnitt mehrfach: ${wo.join(', ')}`);
for (const f of [...jsDateien.map(f => 'src/js/' + f), ...suiten.map(f => 'tests/' + f)])
  for (const m of lesen(f).matchAll(/(\.md )?§(\d+\.\d+[a-z]?)\b/g))
    if (!m[1] && !anker.has('§' + m[2])) vs(`${f}: §${m[2]} zeigt auf keinen Abschnitt (docs/anker.md)`);

// (e) Jedes Gesetz beginnt mit seiner Regel, seinen Stellen und seiner
// Prüfung, und die Prüfung nennt eine Suite, die es gibt. Vorher stand
// die Regel irgendwo im Verlauf, und wer sie suchte, las den ganzen
// Hergang; ein Gesetz ohne Suite ist eine Bitte (CLAUDE.md, Pflege).
// Ein Kürzel wie „§30c" ist weder Gesetz noch Abschnitt — gemeint war die
// Datei, und so ein Verweis zeigte ins Leere, ohne dass (a) oder (d) ihn sahen.
// Suiten in tests/umbau/ sind aus der Kicker-Liga übernommen und noch nicht
// auf Padel umgestellt; run.mjs führt sie nicht aus. Ein Gesetz darf auf sie
// zeigen — der Verweis bleibt sichtbar offen, statt still zu verschwinden.
const umbau = existsSync('tests/umbau') ? readdirSync('tests/umbau').filter(f => f.endsWith('.test.js')).map(f => f.replace(/\.test\.js$/, '')) : [];
const suitenNamen = new Set([...suiten.map(f => f.replace(/\.test\.js$/, '')), ...umbau]);
for (const f of [...gesetzDateien, 'allgemein.md']){
  const pfad = 'docs/gesetze/' + f;
  if (!existsSync(pfad)) continue;
  const text = lesen(pfad);
  for (const k of ['## Regel', '## Stellen', '## Prüfung'])
    if (!abschnitt(text, k)) vs(`${pfad}: Abschnitt „${k}" fehlt`);
  const pruef = abschnitt(text, '## Prüfung') || '';
  const genannt = [...pruef.matchAll(/`tests\/(?:umbau\/)?([a-z]+)`/g)].map(m => m[1]);
  if (!genannt.length) vs(`${pfad}: die Prüfung nennt keine Suite (\`tests/<name>\`)`);
  for (const s of genannt) if (!suitenNamen.has(s)) vs(`${pfad}: Suite tests/${s} gibt es nicht`);
}
for (const f of doku)
  for (const m of lesen(f).matchAll(/§\d+[a-z]\b/g))
    vs(`${f}: ${m[0]} ist weder Gesetz (§Cnn) noch Abschnitt (§n.m)`);

if (!verweisSchief) ok(`jeder Verweis der Doku trägt (${zitiert.size} Kürzel, ${doku.length} Dateien)`);

// ── 8 ─ die erzeugten Verzeichnisse sind aktuell ──────────────────
let erzeugtSchief = 0;
for (const [f, bau] of Object.entries(ERZEUGT)){
  const ist = existsSync(f) ? lesen(f) : '';
  if (ist !== bau()){ rot(`${f} ist nicht mehr das Erzeugte — node tools/doku.mjs`); erzeugtSchief++; }
}
if (!erzeugtSchief) ok('docs/README.md und docs/anker.md sind aktuell');

process.exit(fehler ? 1 : 0);
