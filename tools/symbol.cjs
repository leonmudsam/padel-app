#!/usr/bin/env node
/*
 *  Das Symbol der App aus seiner Quelle.
 *
 *    node tools/symbol.cjs     liest src/icon-quelle.png, schreibt icon.png
 *                              (512 px) und das Logo in src/css/01-shell.css
 *
 *  Die Quelle ist das Bild der Liga in voller Größe (über ein Megabyte). So
 *  ausgeliefert, lud jedes Telefon es als Favicon und Startbildschirm-Symbol,
 *  und als Data-URI im CSS hätte es jeden Start um anderthalb Megabyte
 *  schwerer gemacht. Das Logo oben links ist 38 px groß; als WebP mit 96 px
 *  ist es auch auf einem Bildschirm mit dreifacher Dichte scharf und wiegt
 *  wenige Kilobyte. Verkleinert wird mit Chromium, weil das Repository kein
 *  Bildwerkzeug voraussetzt.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const QUELLE = path.join(ROOT, 'src/icon-quelle.png');
const chromium = require(path.join(ROOT, 'tests/browser.js')).ladeChromium();
if (!chromium) { console.error('Kein Chromium gefunden (siehe tests/README.md).'); process.exit(2); }

(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    const daten = 'data:image/png;base64,' + fs.readFileSync(QUELLE).toString('base64');
    const bild = async (px, typ, qualitaet) => p.evaluate(async ([src, px, typ, q]) => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = px;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, px, px);
      return c.toDataURL(typ, q);
    }, [daten, px, typ, qualitaet]);
    const png = await bild(512, 'image/png');
    fs.writeFileSync(path.join(ROOT, 'icon.png'), Buffer.from(png.split(',')[1], 'base64'));
    const webp = await bild(96, 'image/webp', 0.9);
    const css = path.join(ROOT, 'src/css/01-shell.css');
    const alt = fs.readFileSync(css, 'utf8');
    const neu = alt.replace(/\.logo-mark\{background:[^;{}]*url\("data:[^"]+"\)[^;{}]*\}/,
      `.logo-mark{background:#000 url("${webp}") center/cover no-repeat}`);
    if (neu === alt && !alt.includes(webp)) { console.error('Logo-Regel in 01-shell.css nicht gefunden'); process.exit(1); }
    fs.writeFileSync(css, neu);
    console.log('icon.png', fs.statSync(path.join(ROOT, 'icon.png')).size, 'Bytes · Logo', webp.length, 'Zeichen');
  } finally { await b.close(); }
})();
