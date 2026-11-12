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
  } finally { await browser.close(); }
  console.log(fails ? `\n${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `\nALLE ${checks} CHECKS BESTANDEN`);
  process.exit(fails ? 1 : 0);
})();
