#!/usr/bin/env node
/*
 *  Die Doku, die sich selbst nachzieht.
 *
 *    node tools/doku.mjs      schreibt docs/README.md und docs/anker.md neu
 *
 *  Zwei Verzeichnisse veralten bei jeder Änderung, wenn sie jemand von Hand
 *  pflegt: das Inhaltsverzeichnis der Doku und die Liste der Abschnitte im
 *  Code. Der Kopf von 00-prolog.js kannte zuletzt elf von fünfzig Dateien
 *  nicht, der von 00-tokens.css eine von siebzehn — niemand hatte es
 *  bemerkt, weil eine Prosa-Zeile nicht rot wird. Beide entstehen deshalb
 *  hier aus den Dateien selbst, und Wächter 8 in tools/check.mjs vergleicht
 *  das Erzeugte mit dem Eingecheckten, wie Wächter 1 den Bau.
 *
 *  Außerdem liegt hier, was check.mjs und tests/run.mjs gemeinsam brauchen:
 *  ein Abschnitt einer Markdown-Datei endet an der nächsten Überschrift
 *  derselben oder einer höheren Ebene. Vorher las die Prüfung der
 *  Suitentabelle bis zum Dateiende, und jede spätere Tabellenzeile der Form
 *  | `wort` | hätte als Suite gegolten.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Der Abschnitt ab der Überschrift `kopf` (ganze Zeile, mit Rauten) bis zur
// nächsten Überschrift gleicher oder höherer Ebene. Codeblöcke zählen nicht:
// darin kann eine Zeile mit # stehen, die keine Überschrift ist.
export function abschnitt(text, kopf){
  const zeilen = text.split('\n');
  const start = zeilen.findIndex(z => z.trimEnd() === kopf || z.startsWith(kopf + ' '));
  if(start < 0) return null;
  const ebene = kopf.match(/^#+/)[0].length;
  let imCode = false, ende = zeilen.length;
  for(let i = start + 1; i < zeilen.length; i++){
    if(zeilen[i].startsWith('```')) imCode = !imCode;
    if(imCode) continue;
    const m = zeilen[i].match(/^(#+) /);
    if(m && m[1].length <= ebene){ ende = i; break; }
  }
  return zeilen.slice(start + 1, ende).join('\n');
}

const lies = p => readFileSync(join(ROOT, p), 'utf8');

// Alle Markdown-Dateien, die zur Doku gehören. mockup/ trägt eigene
// READMEs je Entwurf; ins Verzeichnis kommt nur seine Übersicht.
export function dokuDateien(){
  const liste = ['README.md', 'CLAUDE.md'];
  const ordner = d => existsSync(join(ROOT, d))
    ? readdirSync(join(ROOT, d)).filter(f => f.endsWith('.md')).sort().map(f => d + '/' + f) : [];
  liste.push(...ordner('docs').filter(f => f !== 'docs/README.md'), ...ordner('docs/gesetze'));
  for(const f of ['tests/README.md', 'tools/README.md', 'mockup/README.md', 'datenbank/README.md'])
    if(existsSync(join(ROOT, f))) liste.push(f);
  return liste.filter(f => existsSync(join(ROOT, f)));
}

// Titel und erster Satz einer Datei. Der erste Satz ist die Zusage, die die
// Datei dem Leser macht; steht sie nicht in einem Satz, fehlt ihr ein Kopf.
export function kopfVon(text){
  const titel = (text.match(/^# (.+)$/m) || [, ''])[1].trim();
  const nachTitel = text.slice(text.indexOf(titel) + titel.length);
  const absatz = nachTitel.split(/\n\s*\n/).map(a => a.trim())
    .find(a => a && !a.startsWith('#') && !a.startsWith('>') && !a.startsWith('|') && !a.startsWith('```') && !a.startsWith('---')) || '';
  const flach = absatz.replace(/^[-*] /, '').replace(/\s+/g, ' ');
  // Ein Satz endet am Punkt; ein Doppelpunkt kündigt nur eine Liste an.
  // Nach einer Ziffer ist der Punkt eine Ordnungszahl („3. Oktober").
  const satz = (flach.match(/^.+?[^\d]\.(?=\s+[A-ZÄÖÜ„"(]|$)/) || [flach])[0];
  return {titel, satz: satz.length > 220 ? satz.slice(0, 217) + '…' : satz};
}

export function inhaltsverzeichnis(){
  const z = [
    '# Inhaltsverzeichnis der Dokumentation',
    '',
    'Erzeugt von `node tools/doku.mjs` aus den Dateien selbst — nicht von Hand',
    'bearbeiten. Wächter 8 vergleicht es mit dem Erzeugten; ist es rot, hat',
    'sich eine Datei geändert, und der Aufruf zieht es nach.',
    '',
    '| Datei | worum es geht |',
    '|---|---|',
  ];
  const gesetze = [];
  for(const f of dokuDateien()){
    const {titel, satz} = kopfVon(lies(f));
    const link = relative(join(ROOT, 'docs'), join(ROOT, f));
    if(f.startsWith('docs/gesetze/')) gesetze.push(`| [${titel}](${link}) | ${satz} |`);
    else z.push(`| [${f}](${link}) — ${titel} | ${satz} |`);
  }
  z.push('', '## Gestaltungsgesetze', '',
    'Ein Kürzel `§Cnn` im Code verweist auf eine dieser Dateien (ab 25) oder',
    'auf einen Abschnitt des CSS (bis 24, siehe `anker.md`).', '',
    '| Gesetz | Regel in einem Satz |', '|---|---|', ...gesetze, '');
  return z.join('\n');
}

// Die Abschnitte im Code. Ein Banner ist eine Kommentarzeile mit Kürzel und
// Namen; die Datei sagt, WO ein Block liegt, das Kürzel, WOZU er da ist.
const BANNER_JS = /^\s*\/\/ *(?:╔═+|─+) *§(\d+\.\d+[a-z]?)\b\s*(?:─+\s*)?(.*?)\s*[─═╗]*\s*$/;
const BANNER_CSS = /\[§C(\d+)\]\s*(?:=+|─+)?\s*(.*?)\s*(?:=+|─+)?\s*\*\//;
export function ankerVon(datei){
  const text = lies(datei), out = [];
  for(const zeile of text.split('\n')){
    if(datei.endsWith('.js')){
      const m = zeile.match(BANNER_JS);
      if(m) out.push(['§' + m[1], m[2].replace(/[─═╗]+$/, '').trim()]);
    } else {
      const m = zeile.match(/^\s*\/\*.*?\[§C(\d+)\]/) && zeile.match(BANNER_CSS);
      if(m) out.push(['§C' + m[1], m[2].trim()]);
    }
  }
  return out;
}

export function ankerverzeichnis(){
  const z = [
    '# Abschnitte im Code',
    '',
    'Jede Datei in `src/` mit den Bannern, die sie trägt, in der Reihenfolge',
    'des Baus. Erzeugt von `node tools/doku.mjs` — nicht von Hand bearbeiten;',
    'Wächter 8 vergleicht. Ein Kürzel `§n.m` ist ein Abschnitt des Codes,',
    '`§Cnn` bis 24 einer des CSS und ab 25 ein Gesetz in `gesetze/`.',
    '',
  ];
  for(const ordner of ['src/js', 'src/css']){
    z.push(`## ${ordner}`, '');
    for(const f of readdirSync(join(ROOT, ordner)).sort()){
      const a = ankerVon(ordner + '/' + f);
      z.push(`- **${f}**` + (a.length ? '' : ' — ohne Banner'));
      for(const [k, n] of a) z.push(`  - ${k}${n ? ' ' + n : ''}`);
    }
    z.push('');
  }
  return z.join('\n');
}

// Die Liste der Abschnitte zuerst: das Inhaltsverzeichnis liest ihren Kopf.
export const ERZEUGT = {
  'docs/anker.md': ankerverzeichnis,
  'docs/README.md': inhaltsverzeichnis,
};

if(process.argv[1] === fileURLToPath(import.meta.url)){
  for(const [f, bau] of Object.entries(ERZEUGT)){
    const neu = bau();
    const alt = existsSync(join(ROOT, f)) ? lies(f) : '';
    if(neu !== alt){ writeFileSync(join(ROOT, f), neu); console.log('geschrieben: ' + f); }
    else console.log('unverändert: ' + f);
  }
}
