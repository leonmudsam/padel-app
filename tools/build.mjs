#!/usr/bin/env node
/*
 *  Baut aus src/ die eine Datei, die ausgeliefert wird.
 *
 *  Kein Bundler, keine Module: die App ist eine einzige IIFE mit tausenden
 *  impliziten Bezügen zwischen ihren Teilen. Die Teile werden deshalb in
 *  alphabetischer Reihenfolge wieder aneinandergehängt — genau die
 *  Reihenfolge, in der sie vorher in index.html standen. Darum die
 *  Nummern-Präfixe der Dateinamen: sie SIND die Reihenfolge.
 *
 *    node tools/build.mjs            → dist/index.html, dist/sw.js
 *    BUILD_STAMP=2026.09.01.1 node … → dieselben mit fester Version
 *
 *  DIE VERSION IST EIN FINGERABDRUCK DES AUSGELIEFERTEN INHALTS, keine von
 *  Hand gepflegte Nummer. Von Hand gepflegt stand sie sechs Veröffentlichungen
 *  lang still, und `checkForUpdate` verglich die Version einer Seite mit sich
 *  selbst: auf jedem Gerät, das die App offen hatte, kam nie ein Hinweis auf
 *  eine neue Fassung. Der Fingerabdruck kann das nicht — er ändert sich genau
 *  dann, wenn sich die Auslieferung ändert.
 *
 *  Das Datum davor ist Lesbarkeit, nicht Inhalt: es kommt aus dem Tag, an dem
 *  sich der Inhalt zuletzt geändert hat. Bleibt der Fingerabdruck gleich,
 *  bleibt auch das Datum stehen — sonst bekäme ein Bauen ohne Änderung am
 *  nächsten Tag eine neue Nummer und alle Geräte ein Update, das keines ist.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync,
         existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

// Der Fingerabdruck zählt den Inhalt OHNE die Versionszeile — sonst hängt er
// von sich selbst ab — und OHNE die Zeilenenden. Der Arbeitsbaum unter Windows
// trägt CRLF, das Repository und der Prüf-Job unter Linux tragen LF: derselbe
// Inhalt ergab zwei Fingerabdrücke, und Wächter 5 war auf dem Rechner grün und
// im Job rot. Zeilenenden gehören dem Checkout, nicht der Auslieferung.
// Dieselbe Normalisierung benutzen Wächter 1 und 5.
const OHNE_VERSION = /const BUILD_VERSION=['"][^'"]*['"]/;
const gleichgemacht = t => t.replace(/\r\n/g, '\n')
  .replace(OHNE_VERSION, "const BUILD_VERSION='x'");
const fingerabdruck = t => createHash('sha256')
  .update(gleichgemacht(t)).digest('hex').slice(0, 8);

// ── Kommentare bleiben in src/ ──────────────────────────────────────────────
// Sie sind das Gedächtnis des Codes [§7] und wurden bisher mit ausgeliefert:
// gemessen 38 % des JavaScripts und ein gutes Drittel der Datei, die jedes
// Telefon bei jedem Start lädt, parst und im Speicher hält, ohne je eine Zeile
// davon auszuführen. Entfernt wird mit einem kleinen Lexer und nicht mit einem
// regulären Ausdruck: `//` steht auch in Adressen, `/*` in regulären
// Ausdrücken, und beides in Template-Literalen. Ein Fehlgriff darin bricht
// die Syntax — deshalb parst der Bau das Ergebnis, bevor er es schreibt.
const REGEX_NACH = new Set('(,=:[!&|?{};+-*%<>~^}'.split(''));
const REGEX_WORT = /^(return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await|instanceof)$/;
const WORTZEICHEN = /[A-Za-z0-9_$\u00c0-\uffff]/;

function ohneKommentare(s, css) {
  let o = '', i = 0, vor = '';
  const n = s.length, tpl = [];
  let tiefe = 0;
  // Ein Kommentar auf eigener Zeile nimmt die Zeile mit; einer hinter Code
  // nur sich selbst. Ein mehrzeiliger Block mitten in einer Zeile wird zum
  // Zeilenumbruch: `return /*…\n…*/ x` hängt an der automatischen Semikolon-
  // setzung, und ohne den Umbruch gäbe die Funktion x zurück statt nichts.
  const weg = (ende, mehrzeilig) => {
    const zeilenAnfang = o.lastIndexOf('\n') + 1;
    const eigeneZeile = /^[ \t]*$/.test(o.slice(zeilenAnfang));
    let j = ende; while (j < n && (s[j] === ' ' || s[j] === '\t')) j++;
    if (eigeneZeile && (j >= n || s[j] === '\n' || s[j] === '\r')) {
      o = o.slice(0, zeilenAnfang);
      if (s[j] === '\r') j++;
      i = j < n ? j + 1 : j;
      return;
    }
    i = ende;
    if (mehrzeilig) { o = o.replace(/[ \t]+$/, '') + '\n'; return; }
    if (s[i] === '\n' || s[i] === '\r' || i >= n) { o = o.replace(/[ \t]+$/, ''); return; }
    if (WORTZEICHEN.test(o.slice(-1)) && WORTZEICHEN.test(s[i])) o += ' ';
  };
  const zeichenkette = q => {
    let j = i + 1;
    while (j < n && s[j] !== q) { if (s[j] === '\\') j++; j++; }
    o += s.slice(i, j + 1); i = j + 1; vor = 'a';
  };
  // Liest ein Template-Literal bis zum schließenden Backtick oder bis `${`.
  const template = () => {
    let j = i;
    while (j < n) {
      if (s[j] === '\\') { j += 2; continue; }
      if (s[j] === '`') { o += s.slice(i, j + 1); i = j + 1; vor = 'a'; return; }
      if (s[j] === '$' && s[j + 1] === '{') {
        o += s.slice(i, j + 2); i = j + 2; tpl.push(tiefe); tiefe = 0; vor = '{'; return;
      }
      j++;
    }
    throw new Error('Template-Literal ohne Ende');
  };
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '*') {
      const e = s.indexOf('*/', i + 2);
      if (e < 0) throw new Error('Blockkommentar ohne Ende');
      weg(e + 2, s.slice(i, e).includes('\n'));
      continue;
    }
    if (!css && c === '/' && d === '/') {
      let e = s.indexOf('\n', i); if (e < 0) e = n;
      if (s[e - 1] === '\r') e--;
      weg(e, false);
      continue;
    }
    if (c === '"' || c === "'") { zeichenkette(c); continue; }
    if (css) { o += c; i++; continue; }
    if (c === '`') { o += c; i++; template(); continue; }
    if (c === '/') {
      if (vor === '' || REGEX_NACH.has(vor) || REGEX_WORT.test(vor)) {
        let j = i + 1, klasse = false;
        while (j < n && (klasse || s[j] !== '/')) {
          if (s[j] === '\\') j++;
          else if (s[j] === '[') klasse = true;
          else if (s[j] === ']') klasse = false;
          else if (s[j] === '\n') throw new Error('Regulärer Ausdruck über das Zeilenende');
          j++;
        }
        j++; while (j < n && /[a-z]/.test(s[j])) j++;
        o += s.slice(i, j); i = j; vor = 'a';
      } else { o += c; i++; vor = c; }
      continue;
    }
    if (c === '{') { tiefe++; }
    else if (c === '}') {
      if (tiefe === 0 && tpl.length) { tiefe = tpl.pop(); o += c; i++; template(); continue; }
      tiefe--;
    }
    if (WORTZEICHEN.test(c)) {
      let j = i + 1; while (j < n && WORTZEICHEN.test(s[j])) j++;
      vor = s.slice(i, j); o += vor; i = j; continue;
    }
    if (!/\s/.test(c)) vor = c;
    o += c; i++;
  }
  return o;
}

const join = (dir, css) => readdirSync(`src/${dir}`)
  .filter(f => !f.startsWith('.'))
  .sort()
  .map(f => {
    let s = readFileSync(`src/${dir}/${f}`, 'utf8');
    try { s = ohneKommentare(s, css); }
    catch (e) { throw new Error(`src/${dir}/${f}: ${e.message}`); }
    return s.endsWith('\n') ? s : s + '\n';   // fehlende Schlusszeile verklebt sonst zwei Dateien
  })
  .join('');

const css = join('css', true), js = join('js', false);
// Ein Fehlgriff des Lexers zeigt sich als Syntaxfehler — hier und nicht erst
// im Browser. Geparst wird nur, ausgeführt nichts.
try { new vm.Script(js); }
catch (e) { throw new Error('Nach dem Entfernen der Kommentare ist das JavaScript kaputt: ' + e.message); }

let html = readFileSync('src/index.html', 'utf8')
  // Die HTML-Kommentare des Gerüsts gehören ebenfalls in die Quelle.
  .replace(/^[ \t]*<!--[\s\S]*?-->[ \t]*\r?\n/gm, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*@@CSS\*\/\r?\n/, () => css)
  .replace(/\/\*@@JS\*\/\r?\n/,  () => js);

if (html.includes('/*@@')) throw new Error('Platzhalter in src/index.html nicht ersetzt');

if (!OHNE_VERSION.test(html)) throw new Error('BUILD_VERSION nicht gefunden');
const fp = fingerabdruck(html);
let version = process.env.BUILD_STAMP;
if (!version) {
  // Trägt die letzte Auslieferung denselben Inhalt, behält sie ihre Nummer.
  const alt = existsSync('index.html') ? readFileSync('index.html', 'utf8') : '';
  const alteV = (alt.match(/const BUILD_VERSION=['"]([^'"]*)['"]/) || [])[1];
  // Geprüft wird, ob die alte Nummer DIESEN Inhalt behauptet — nicht, ob der
  // Inhalt derselbe ist. Sonst hätte eine von Hand vergebene Nummer den
  // Fingerabdruck überlebt, und sie ist genau das, was ersetzt werden soll.
  version = (alteV && alteV.endsWith('.' + fp))
    ? alteV
    : new Date().toISOString().slice(0, 10).replace(/-/g, '.') + '.' + fp;
}
html = html.replace(OHNE_VERSION, `const BUILD_VERSION='${version}'`);

// Der Service Worker [§C42] trägt dieselbe Fassung wie die Seite: ändert
// sich die Auslieferung, ist er ein neuer Worker und räumt die Töpfe der
// alten. Ohne Kommentare und geparst wie das Skript der Seite.
const SW_FASSUNG = /const SW_FASSUNG = '[^']*';/;
let sw = ohneKommentare(readFileSync('src/sw.js', 'utf8'), false);
if (!SW_FASSUNG.test(sw)) throw new Error('src/sw.js: SW_FASSUNG nicht gefunden');
sw = sw.replace(SW_FASSUNG, `const SW_FASSUNG = '${version}';`);
try { new vm.Script(sw); }
catch (e) { throw new Error('src/sw.js ist nach dem Entfernen der Kommentare kaputt: ' + e.message); }

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
writeFileSync('dist/sw.js', sw);
copyFileSync('icon.png', 'dist/icon.png');

console.log(`dist/index.html — ${(html.length/1024).toFixed(0)} kB, Version ${version}`);
