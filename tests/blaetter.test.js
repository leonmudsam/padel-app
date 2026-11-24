// Jede Ansicht, jedes Blatt und jede Story einmal öffnen und den sichtbaren
// Text lesen: steht dort „undefined", „NaN", „[object" oder ein
// Zahlwert, der in einem Attribut der Grafik zu NaN wurde, ist eine Zahl
// oder ein Text unterwegs verloren gegangen. Die Elo-Analyse eines Satzes
// zeigte so unter jedem Spieler „undefined" statt ihrer Posten, und der
// Saison-Rückblick einer Saison ohne gespeicherten Titel „undefined" als
// Überschrift — beides rechnete fehlerfrei und warf nichts, also fing es
// keine andere Suite.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  process.exit(2);
}
const {createHarness} = require('../tools/performance.cjs');
let checks = 0, fails = 0;
const ok = (c, s) => { checks++; if(!c) fails++; console.log((c ? '  ok  ' : '  ✗   ') + s); };
// „null" ist auch ein deutsches Wort („setzt die Zählung auf null").
const KAPUTT = /\bundefined\b|\bNaN\b|(?<!(?:bei|auf|an|gegen|von) )\bnull\b(?! an)|\[object|Infinity|\$\{/;
const ATTR = /(?:style|d|width|height|x|y|cx|cy|r|points|transform|viewBox)="[^"]*(?:NaN|undefined|Infinity)[^"]*"/;

(async () => {
  const {browser, page, K, errors} = await createHarness();
  try {
    const lesen = async (code, nach) => {
      const vorher = errors.length;
      try { await K(code); if(nach) await K(nach); }
      catch(e){ return 'wirft: ' + e.message.split('\n')[0]; }
      const r = await page.evaluate(() => {
        const s = document.getElementById('sheet'), bg = document.getElementById('sheetBg');
        const nd = document.getElementById('nd'), ndBg = document.getElementById('ndBg');
        const main = document.getElementById('main');
        const teile = [main];
        if(bg && bg.classList.contains('show')) teile.push(s);
        if(ndBg && ndBg.classList.contains('show')) teile.push(nd);
        return {t:teile.map(e => e ? e.innerText : '').join('\n'), h:teile.map(e => e ? e.innerHTML : '').join('')};
      });
      const zeile = r.t.split('\n').find(z => KAPUTT.test(z));
      if(zeile) return zeile.trim().slice(0, 160);
      const a = r.h.match(ATTR);
      if(a) return a[0].slice(0, 160);
      if(errors.length > vorher) return 'Fehler: ' + errors.slice(vorher).join(' | ').slice(0, 160);
      return null;
    };
    // Eine Gruppe gilt als sauber, wenn keiner ihrer Fälle etwas zeigt; der
    // Text nennt den ersten Fund.
    const gruppe = async (name, faelle) => {
      let fund = null, n = 0;
      for(const [was, code, nach] of faelle){
        n++;
        const f = await lesen(`closeSheet(true);` + code, nach);
        if(f && !fund) fund = was + ': ' + f;
      }
      ok(!fund, `${name} (${n}) ${fund ? '— ' + fund : 'ohne kaputten Wert'}`);
    };
    const L = JSON.parse(await K(`JSON.stringify({p:activePlayers().map(p=>p.id), m:matches.map(m=>m.id),
      aw:Object.keys(AWARD_META), ch:CHRONICLES.map(c=>c.id), di:DISZIPLINEN.filter(d=>d.monat).map(d=>d.id),
      b:BADGES.map(b=>b.id), s:allPastSeasons()})`));

    const reiter = [['ranking', `period='season';rankMetric='elo'`], ['ranking', `period='all'`], ['ranking', `period='day'`],
      ['ranking', `period='season';rankMetric='winrate'`], ['ranking', `rankMetric='goaldiff'`], ['ranking', `rankMetric='prestige'`],
      ['positions', `rankMetric='drive'`], ['positions', `rankMetric='reves'`], ['awards', `awView='awards'`],
      ['awards', `awView='rekorde';rekKammer=''`], ['awards', `awView='chronik'`], ['teams', ''], ['history', `histFilter='all'`],
      ['match', `M=matchLeer()`], ['settings', '']];
    await gruppe('Reiter', reiter.map(([t, x]) => [t + ' ' + x, `${x};tab='${t}';render()`]));
    await K(`rankMetric='elo';period='season'`);
    await gruppe('Spielerprofile und ihre Blätter', L.p.flatMap(id => ['showPlayer', 'showPlayerBadges', 'showPlayerSeasons',
      'showLaufbahn', 'showPrestigeRegeln', 'showEditPlayer'].map(f => [f, `${f}('${id}')`])));
    const paare = [];
    for(let i = 0; i < L.p.length; i++) for(let j = i + 1; j < L.p.length; j += 3) paare.push([L.p[i], L.p[j]]);
    await gruppe('Duos und Duelle', paare.flatMap(([a, b]) => [['Duo', `showTeam('${a}','${b}')`], ['Duell', `showH2H('${a}','${b}')`]]));
    const saetze = L.m.filter((_, i) => i % Math.ceil(L.m.length / 25) === 0);
    await gruppe('Sätze mit Elo-Analyse', saetze.map(id => ['Satz ' + id.slice(0, 8), `showMatchDetail('${id}')`,
      `document.getElementById('showBreakdownBtn').click()`]));
    await gruppe('Sätze bearbeiten', saetze.slice(0, 8).map(id => ['Bearbeiten ' + id.slice(0, 8), `showEditMatch('${id}')`]));
    await gruppe('Awards', L.aw.map(k => [k, `showAward('${k}')`]));
    await gruppe('Rekorde', L.ch.map(c => [c, `showChronicle('${c}')`]));
    await gruppe('Monatschroniken', L.di.map(d => [d, `showDisziplin('${d}')`]));
    await gruppe('Auszeichnungen', L.b.map(b => [b, `showBadgePopover('${b}','${L.p[0]}')`]));
    // Saisons so, wie die Testliga sie hat: ohne gespeicherten Titel.
    await gruppe('Saison-Rückblicke', L.s.map(s => [s, `showSeasonRecap(seasons.find(x=>x.id==='${s}')||{id:'${s}'})`]));
    await gruppe('Rückblicke und Übersichten', ['showRangSystem()', 'showLigaChronik()', 'showPositionHistory()',
      'showPotdRecap({force:true})', 'showPotwRecap({force:true})', 'showAddPlayer()'].map(x => [x, x]));
    await K(`_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;0`);
    const sids = JSON.parse(await K(`JSON.stringify((_cache._stories||[]).map(s=>s.id))`));
    await gruppe('Feed und jede Story', [['Feed', 'openNewsFeed()'], ...sids.map(s => [s.slice(0, 30), `openNewsDetail(${JSON.stringify(s)})`])]);

    // ── Der Elo-Pegel, gemessen ───────────────────────────────────────
    // Der Kopf, der den Elo-Strom ersetzt: je Spieler eine Säule an einer
    // Nulllinie. Gezeichnet so breit wie auf dem schmalsten Telefon (320 px,
    // Kopf 223 px), mit Grenzwerten: ±999 und 12:10, ±12.345 und 13:11 —
    // ein langer Wert wird dort kleiner, nicht breiter [§C27]. Der
    // Strom stellte die Partner übereinander und ließ Bänder in der Mitte
    // breiter werden, als die Verlierer abgaben.
    const pegel = await K(`(async()=>{
      const p=activePlayers().map(x=>x.id), [a,b,c,e]=p;
      const st=document.createElement('style');st.textContent='.pegel-test *{animation:none!important;transition:none!important}';document.head.appendChild(st);
      const faelle=[
        {n:'6:4, A gewinnt, 320 px',w:243,d:{W:[a,b],L:[c,e],hoch:6,tief:4,aw:true,delta:{[a]:23,[b]:21,[c]:-17,[e]:-17}}},
        {n:'2:6, B gewinnt, ein Verlierer im Plus, 320 px',w:243,d:{W:[c,e],L:[a,b],hoch:6,tief:2,aw:false,delta:{[a]:-19,[b]:3,[c]:27,[e]:17}}},
        {n:'12:10 mit ±999, 320 px',w:243,d:{W:[a,b],L:[c,e],hoch:12,tief:10,aw:true,delta:{[a]:999,[b]:998,[c]:-999,[e]:-997}}},
        {n:'13:11 mit ±12.345, 320 px',w:243,d:{W:[a,b],L:[c,e],hoch:13,tief:11,aw:false,delta:{[a]:12345,[b]:12344,[c]:-12345,[e]:-12343}}}];
      const fehler=[];
      for(const f of faelle){
        const box=document.createElement('div');box.className='pegel-test';box.style.width=f.w+'px';
        box.innerHTML=_spStromBild(f.d);document.body.appendChild(box);
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const fk=box.querySelector('.sp-fk').getBoundingClientRect(), R=el=>el.getBoundingClientRect();
        const chips=[...box.querySelectorAll('.sp-sm-c')], saeulen=[...box.querySelectorAll('.sp-sm-s')];
        const m=R(box.querySelector('.sp-sm-m')), nl=R(box.querySelector('.sp-sm-null')).top;
        const teile=[['Stand',m]].concat(chips.map((x,i)=>['Gesicht '+i,R(x)]),
          saeulen.map((x,i)=>['Zahl '+i,R(x.querySelector('b'))]),saeulen.map((x,i)=>['Säule '+i,R(x.querySelector('i'))]));
        for(let i=0;i<teile.length;i++)for(let j=i+1;j<teile.length;j++){const [n1,r1]=teile[i],[n2,r2]=teile[j];
          if(Math.min(r1.right,r2.right)-Math.max(r1.left,r2.left)>.5&&Math.min(r1.bottom,r2.bottom)-Math.max(r1.top,r2.top)>.5)fehler.push(f.n+': '+n1+' über '+n2);}
        teile.forEach(([n,r])=>{if(r.left<fk.left-.5||r.right>fk.right+.5)fehler.push(f.n+': '+n+' ragt aus dem Kopf');});
        const cr=chips.map(R);
        if(Math.abs(cr[0].top-cr[1].top)>.5||Math.abs(cr[2].top-cr[3].top)>.5)fehler.push(f.n+': ein Paar steht nicht nebeneinander');
        if(!(cr[1].right<=m.left&&cr[2].left>=m.right))fehler.push(f.n+': die Teams stehen nicht links und rechts vom Stand');
        const ids=f.d.aw?f.d.W.concat(f.d.L):f.d.L.concat(f.d.W);
        const hoechste=Math.max(...saeulen.map(x=>R(x.querySelector('i')).height));
        saeulen.forEach((x,i)=>{const r=R(x.querySelector('i')),v=f.d.delta[ids[i]];
          if(v>=0?Math.abs(r.bottom-nl)>1.5:Math.abs(r.top-nl)>1.5)fehler.push(f.n+': Säule '+i+' beginnt nicht an der Nulllinie');
          if((v>=0)!==(r.bottom<=nl+1.5))fehler.push(f.n+': Säule '+i+' zeigt in die falsche Richtung');});
        if(Math.abs(hoechste-SP_PEGEL_MAX)>1)fehler.push(f.n+': die längste Säule ist '+hoechste+' px hoch');
        box.remove();
      }
      st.remove();
      return fehler;})()`);
    ok(pegel.length === 0, `Der Elo-Pegel: Paare nebeneinander, Team A links, jede Säule an der Nulllinie in ihrer Richtung, nichts übereinander, auch mit ±12.345${pegel.length ? ' — ' + pegel.slice(0, 4).join(' · ') : ''}`);

    // Die Teamzeile trägt ihre Kante als Rand. Als `box-shadow:inset` zog
    // Safari auf dem Telefon Haarlinien über und unter die Namen; Chromium
    // zeichnet sie nicht, gemessen wird deshalb, woraus die Kante besteht.
    const kante = await K(`(()=>{const h=document.createElement('div');h.innerHTML=_spTeamZeile(matches[matches.length-1]);document.body.appendChild(h);
      const [l,,r]=h.querySelectorAll('.sp-nz > span'), sl=getComputedStyle(l), sr=getComputedStyle(r);
      const x={schatten:sl.boxShadow+' / '+sr.boxShadow, links:sl.borderLeftWidth, rechts:sr.borderRightWidth};h.remove();return x;})()`);
    ok(kante.schatten === 'none / none' && kante.links === '2px' && kante.rechts === '2px',
      `Die Kanten der Teamzeile sind Ränder, kein Schatten (${kante.schatten}, ${kante.links}, ${kante.rechts})`);

    // ── Die Erklärkarten in einer laufenden Liga ──────────────────────
    // Wer neu dazukommt, findet die Liga voller Sätze vor: die Karten
    // standen nur in leeren Ansichten und erklärten dann niemandem etwas.
    // Geschlossen bleibt eine Karte in jedem Reiter zu, auch nach dem
    // nächsten Zeichnen.
    const ansichten = [['Liga', `tab='ranking';period='season';rankMetric='elo'`], ['Gesamt', `tab='ranking';period='all'`],
      ['Seiten', `tab='positions';rankMetric='reves'`], ['Awards', `tab='awards';awView='awards'`],
      ['Rekorde', `tab='awards';awView='rekorde';rekKammer=''`], ['Chronik', `tab='awards';awView='chronik'`],
      ['Teams', `tab='teams'`], ['Verlauf', `tab='history';histFilter='all'`]];
    const titel = async code => K(`(()=>{closeSheet(true);${code};render();
      return [...document.querySelectorAll('#main .vorschau[data-hinweis]')].map(k=>k.dataset.hinweis).join('|');})()`);
    const ohne = [];
    for(const [n, c] of ansichten) if(!(await titel(c))) ohne.push(n);
    await K(`closeSheet(true);_cache._stories=_buildStories();openNewsFeed();0`);
    if(!(await K(`!!document.querySelector('#sheet .vorschau[data-hinweis="Die Liga-News"]')`))) ohne.push('News');
    ok(ohne.length === 0, `Mit Sätzen trägt jeder Reiter seine Erklärkarte${ohne.length ? ' — fehlt: ' + ohne.join(', ') : ''}`);
    ok(await K(`(()=>{const z=document.querySelector('#sheet .vorschau .vs-zu');if(!z)return false;const s=getComputedStyle(z);
      const r=z.getBoundingClientRect();return r.width>=32&&r.height>=32&&s.color!==getComputedStyle(z.closest('.vorschau')).color;})()`),
      'Das Kreuz ist groß genug für den Daumen und hebt sich in der Farbe ab');
    // Schließen: die Liga-Karte unter „Saison", dann alle Reiter neu zeichnen.
    await titel(`tab='ranking';period='season'`);
    const zu = await K(`(()=>{const k=document.querySelector('#main .vorschau[data-hinweis]');if(!k)return '';
      const t=k.dataset.hinweis;k.querySelector('[data-hinweis-zu]').click();return t;})()`);
    await page.waitForTimeout(300);
    const wieder = [];
    for(const [n, c] of ansichten) if((await titel(c)).split('|').includes(zu)) wieder.push(n);
    await K(`invalidateCache();0`);
    for(const [n, c] of ansichten) if((await titel(c)).split('|').includes(zu)) wieder.push(n + ' (kalt)');
    const gemerkt = await K(`JSON.parse(localStorage.getItem('padel_hinweise_weg_v1')||'[]')`).catch(() => null);
    ok(!!zu && wieder.length === 0 && (gemerkt === null || gemerkt.includes(zu)),
      `Eine geschlossene Karte („${zu}") kommt in keinem Reiter wieder, auch nicht nach frischem Rechnen${wieder.length ? ' — wieder in: ' + wieder.join(', ') : ''}`);
    // ── Die Knöpfe eines Formulars im Blatt schweben unten [§C27] ──────
    // Im Profil standen Abbrechen und Speichern unter 100 Bildern; wer eines
    // gewählt hatte, musste ans Ende scrollen. Gemessen bei 844 px Höhe: oben
    // und am Ende liegt „Speichern" frei über dem unteren Rand des Blatts,
    // und am Ende steht die letzte Reihe über den Knöpfen.
    await page.setViewportSize({width:390, height:844});
    await K(`closeNewsDetail();closeSheet(true);showEditPlayer(players[0].id)`); await page.waitForTimeout(900);
    const fuss = () => page.evaluate(() => {
      const sh = document.getElementById('sheet'), k = document.getElementById('editSave');
      if(!sh || !k) return null;
      const b = k.getBoundingClientRect(), o = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      const f = document.querySelector('.sheet-fuss'), l = [...document.querySelectorAll('.av-opt')].pop();
      return {lang:sh.scrollHeight - sh.clientHeight > 100, sicht:b.bottom <= sh.getBoundingClientRect().bottom && b.top >= 0,
        frei:!!o && !!o.closest("#editSave"), auf:o ? (o.id || o.className || o.tagName) + "/" + ((o.parentElement || {}).className || "") : "", ueber:!!f && !!l && l.getBoundingClientRect().bottom <= f.getBoundingClientRect().top + 1};
    });
    const fOben = await fuss();
    await page.evaluate(() => { const sh = document.getElementById('sheet'); sh.scrollTop = sh.scrollHeight; }); await page.waitForTimeout(300);
    const fUnten = await fuss();
    ok(!!fOben && !!fUnten && fOben.lang && fOben.sicht && fOben.frei && fUnten.sicht && fUnten.frei && fUnten.ueber,
      `Im Profil stehen Abbrechen und Speichern ohne Scrollen frei am unteren Rand, und am Ende bleibt die letzte Reihe darüber (${JSON.stringify({fOben, fUnten})})`);
    await K(`closeSheet(true);0`);
    // ── Was zusammengehört, sieht gleich aus ──────────────────────────
    // Auf dem iPhone stand eine Erklärkarte größer als ihre Nachbarin, obwohl
    // beide 12,5 px trugen: iOS vergrößert lange Absätze von selbst. Dazu
    // nannte die eine ihre Schwelle fett, die andere nicht, und sieben
    // Formulierungen sagten, was ein Tippen tut. Gemessen wird jede Karte
    // eines Reiters mit Liste.
    const karten = await K(`(() => {
      _hinweiseWeg = new Set();
      const faelle = [['Seiten', "tab='positions';rankMetric='drive'"], ['Awards', "tab='awards';awView='awards'"],
        ['Rekorde', "tab='awards';awView='rekorde';rekKammer=''"], ['Chronik', "tab='awards';awView='chronik'"],
        ['Teams', "tab='teams'"], ['Verlauf', "tab='history';histFilter='all'"]];
      const out = [];
      for(const [n, c] of faelle){
        eval(c); render();
        document.querySelectorAll('#main .vorschau .vs-satz').forEach(p => {
          const ohneFett = p.innerHTML.replace(/<b>[^<]*<[/]b>/g, '');
          out.push({n, px: getComputedStyle(p).fontSize,
            tippen: (p.textContent.match(/(^|[.;] )Ein Tippen (zeigt|öffnet)/g) || []).length,
            fett: /<b>[^<]*[0-9]/.test(p.innerHTML), ziffer: /[0-9]/.test(ohneFett)});
        });
        document.querySelectorAll('#main .view-head p').forEach(p => { if(/tippen/i.test(p.textContent)) out.push({n, kopf: p.textContent}); });
      }
      return JSON.stringify({karten: out, anpassen: getComputedStyle(document.documentElement).webkitTextSizeAdjust});
    })()`).then(JSON.parse);
    const kk = karten.karten.filter(x => x.px);
    ok(karten.anpassen === '100%', `Die Schriftgröße bestimmt das CSS, nicht der Browser (text-size-adjust ${karten.anpassen})`);
    ok(kk.length >= 6 && kk.every(x => x.px === '14px'), `Jede Erklärkarte eines Reiters steht in 14 px (${kk.map(x => x.n + ':' + x.px).join(' ')})`);
    ok(kk.every(x => x.tippen === 1), `Jede Erklärkarte sagt in genau einem Satz „Ein Tippen zeigt/öffnet …" (${kk.map(x => x.n + ':' + x.tippen).join(' ')})`);
    ok(kk.every(x => !x.ziffer) && ['Awards','Rekorde','Chronik','Teams'].every(n => kk.some(x => x.n === n && x.fett)), `Jede Schwelle einer Erklärkarte steht fett, und Awards, Rekorde, Chronik und Teams nennen ihre${' (' + kk.filter(x => x.fett).map(x => x.n).join(', ') + ')'}${kk.some(x => x.ziffer) ? ' — nicht in ' + kk.filter(x => x.ziffer).map(x => x.n).join(', ') : ''}`);
    ok(!karten.karten.some(x => x.kopf), `Die Kopfzeile einer Ansicht sagt nicht, was ein Tippen tut${karten.karten.some(x => x.kopf) ? ' — ' + JSON.stringify(karten.karten.filter(x => x.kopf)) : ''}`);
    const hilfePx = await K(`(() => { closeSheet(true); zeigeHilfe('awards'); const p = document.querySelector('#sheet .pos-info p');
      const px = p ? getComputedStyle(p).fontSize : null; closeSheet(true); return px; })()`);
    ok(hilfePx === '14px', `Das Hilfe-Blatt steht in derselben Größe wie die Erklärkarte (${hilfePx})`);
    // ── Die Einblicke messen jeden gegen sich selbst [§C44] ───────────
    // Die Seiten-Landkarte trug den Wert der Seiten-Rangliste Drive gegen
    // Revés auf und war eine Diagonale der Stärke; das Netz der Duos färbte
    // nach der rohen Siegquote. Jetzt steht jeder rechts, wenn er meist Drive
    // spielt, und über der Nulllinie, wenn er dort gegen den eigenen Schnitt
    // besser ist; jede Linie trägt die Farbe aus Sieg und Games gegen die
    // Erwartung, zum Schnitt gezogen. Gerechnet wird hier unabhängig.
    const einblick = await K(`(() => {
      const html = _einblickRollen();
      const vb = (html.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/) || []).slice(1).map(Number);
      const null_ = [...html.matchAll(/class="rk-m" x1="0" x2="[0-9.]+" y1="([0-9.]+)"/g)].map(m => +m[1])[0];
      const faces = [...html.matchAll(/class="rk-p[^"]*" data-detail="([^"]+)" style="left:([0-9.]+)%;top:([0-9.]+)%/g)].map(m => ({id:m[1], x:+m[2], y:+m[3] / 100 * vb[1]}));
      const falsch = faces.filter(f => { const l = positionsLage(posPerfFrom(f.id, matches));
        return (f.x >= 50) !== (l.anteil >= .5) || (l.staerker === 'atk' && f.y >= null_) || (l.staerker === 'def' && f.y <= null_); }).map(f => pname(f.id));
      const net = _einblickNetz();
      const cls = [...net.matchAll(/class="netz-l ([a-z])"/g)].map(m => m[1]);
      const teams = [...net.matchAll(/class="netz-t" d="[^"]*" data-team="([^"]+)"/g)].map(m => m[1]);
      const soll = teams.map(k => { const [x, y] = k.split('|'); let s = 0, g = 0;
        matches.forEach(m => { const p = partie(m); if(p.winner !== 'A' && p.winner !== 'B') return;
          const onA = [m.a1, m.a2].includes(x) && [m.a1, m.a2].includes(y), onB = [m.b1, m.b2].includes(x) && [m.b1, m.b2].includes(y);
          if(!onA && !onB) return; const e = m.exp_a != null ? m.exp_a : .5, exp = onA ? e : 1 - e, won = p.winner === (onA ? 'A' : 'B');
          s += ((won ? 1 : 0) - exp + posGameLeistung(onA ? p.gamesA : p.gamesB, onA ? p.gamesB : p.gamesA, exp)) / 2; g++; });
        const v = s / (g + POS_SCHRUMPF); return v > .03 ? 'w' : v < -.03 ? 'l' : 'm'; });
      return JSON.stringify({gesichter:faces.length, falsch, netz:cls.join(''), soll:soll.join(''), uhr:/Uhrzeigersinn/.test(net)});
    })()`).then(JSON.parse);
    ok(einblick.gesichter >= 8 && einblick.falsch.length === 0,
      `Die Seiten-Landkarte setzt jeden nach dem Positionsprofil: rechts, wer meist Drive spielt, oben, wer dort besser ist (${einblick.gesichter} Gesichter${einblick.falsch.length ? ' — falsch: ' + einblick.falsch.join(', ') : ''})`);
    ok(einblick.netz.length > 0 && einblick.netz === einblick.soll && !einblick.uhr,
      `Das Netz der Duos färbt nach Sieg und Games gegen die Erwartung, nicht nach der Siegquote (${einblick.netz} / ${einblick.soll})`);
    // ── Das Award-Blatt ohne Träger und mit Feuer ─────────────────────
    // Kein Filter im Filter am Feuer: in den Top-5-Listen der Awards lag ein
    // Weichzeichner auf dem ganzen Feuer, und jede Flamme trug schon ihren
    // Schein — jede Flamme eine eigene Ebene.
    const filterImFilter = await K(`(() => {
      const _f = znFeuer; znFeuer = () => 3;
      try {
        tab='ranking';period='season';rankMetric='elo';render();
        const zaehle = wo => [...document.querySelectorAll(wo + ' .zn-fx')].map(fx => {
          const zn = fx.closest('.zn'); let n = 0;
          for(let e = fx; e && e !== zn.parentElement; e = e.parentElement) if(getComputedStyle(e).filter !== 'none') n++;
          fx.querySelectorAll('*').forEach(e => { if(getComputedStyle(e).filter !== 'none') n++; });
          return n;
        });
        const liste = zaehle('#main');
        showAward('wins');
        const blatt = zaehle('#sheet');
        return JSON.stringify({flammen: liste.length + blatt.length, out: liste.concat(blatt).filter(n => n > 1).map(n => n + ' Filter')});
      } finally { znFeuer = _f; closeSheet(true); }
    })()`).then(JSON.parse);
    ok(filterImFilter.flammen > 0 && filterImFilter.out.length === 0,
      `Feuer in Rangliste und Top-5-Liste: höchstens ein Filter je Feuer, kein Filter im Filter (${JSON.stringify(filterImFilter)})`);
    // Das Gesicht liegt vor seinem Feuer [§C26]. In den Top-5-Listen trug es
    // `.aw-li-av` statt `.av`, blieb ohne Position, und das Feuer lag samt
    // Maske und Unschärfe über dem Emoji; Safari zeichnete daraus einen
    // violetten Strich neben dem Kreis, bei jedem mit einer Serie.
    const vorn = await K(`(() => { const _f = znFeuer; znFeuer = () => 3;
      try { showAward('wins'); return JSON.stringify([...document.querySelectorAll('#sheet .aw-li-zn')].map(z => {
        const a = getComputedStyle(z.querySelector('.aw-li-av')), f = getComputedStyle(z.querySelector('.zn-fx'));
        return a.position !== 'static' && (parseInt(a.zIndex) || 0) > (parseInt(f.zIndex) || 0); })); }
      finally { znFeuer = _f; closeSheet(true); } })()`).then(JSON.parse);
    ok(vorn.length > 0 && vorn.every(Boolean), `In der Top-5-Liste liegt jedes Gesicht vor seinem Feuer (${vorn.filter(Boolean).length} von ${vorn.length})`);
    // Ein Award ohne Träger sagt im Blatt, was noch fehlt, wie seine Kachel
    // (AW_LEER) [§C27] — dort stand „Keine Daten".
    const leerBlatt = await K(`(() => {
      const _m = matches;
      try {
        matches = []; invalidateCache();
        return JSON.stringify(Object.keys(AWARD_META).map(k => {
          showAward(k);
          const l = document.querySelector('#sheet .leerstand');
          return {k, text: l ? l.textContent.trim() : null, kachel: AW_LEER[k] || 'Noch nicht vergeben'};
        }).filter(x => x.text !== null));
      } finally { matches = _m; invalidateCache(); closeSheet(true); }
    })()`).then(JSON.parse);
    const falsch = leerBlatt.filter(x => x.text !== x.kachel);
    ok(leerBlatt.length > 0 && falsch.length === 0,
      `Ein leeres Award-Blatt sagt dasselbe wie seine Kachel, nie „Keine Daten" (${leerBlatt.length} Blätter${falsch.length ? ' — ' + JSON.stringify(falsch.slice(0, 3)) : ''})`);
  } finally { await browser.close(); }
  console.log(fails ? `\n${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `\nALLE ${checks} CHECKS BESTANDEN`);
  process.exit(fails ? 1 : 0);
})();
