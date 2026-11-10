// Lokale Bedienungsdiagnose auf dem gebauten Artefakt, ohne Backend-Schreibzugriff.
// node tools/interaktion.cjs [--cpu=4] [--runden=3] [--waehler-only] [--ausgabe=dist/interaktion.json]
// Timer stellen Eingaben in die Warteschlange. Das ist KEIN INP-/GPU-/Handy-FPS-Test:
// gemessen werden Handler, Rückstau, rAF-Abstände und Präsentationsgelegenheiten.
const fs = require('node:fs');
const path = require('node:path');
const {createHarness} = require('./performance.cjs');
const root = path.resolve(__dirname, '..');
const cpu = Number((process.argv.find(a => a.startsWith('--cpu=')) || '--cpu=4').slice(6));
const rounds = Number((process.argv.find(a => a.startsWith('--runden=')) || '--runden=3').slice(9));
if(!Number.isInteger(rounds) || rounds < 1 || rounds > 20) throw new Error('Runden müssen zwischen 1 und 20 liegen.');
const median = a => a.slice().sort((x,y) => x-y)[Math.floor(a.length/2)] || 0;
const rounded = n => +n.toFixed(2);
const matchPrep = `closeSheet(true);tab='match';M={A1:players[8].id,A2:players[9].id,B1:players[6].id,B2:players[4].id,pA1:'atk',pA2:'def',pB1:'atk',pB2:'def',sa:0,sb:0};render();`;
const cases = [
  {name:'Score: 10 schnelle Plus-Tipps', prep:matchPrep, interval:45, count:10,
    action:`document.querySelector('[data-step="sa,1"]').click();`,
    final:`({score:M.sa,angezeigt:document.getElementById('svA').textContent,vorschau:document.getElementById('previewSlot').textContent.trim().slice(0,110),speichern:!document.getElementById('saveM').disabled})`},
  {name:'Score: Plus/Minus-Eingabeburst', prep:matchPrep, interval:8, count:20,
    action:`document.querySelector(i%2?'[data-step="sa,-1"]':'[data-step="sa,1"]').click();`,
    final:`({score:M.sa,angezeigt:document.getElementById('svA').textContent,speichern:!document.getElementById('saveM').disabled})`},
  {name:'Spielersuche: schnelle Buchstaben', prep:matchPrep+`document.querySelector('[data-combo="A1"]').focus();`, interval:25, count:6,
    action:`const inp=document.querySelector('[data-combo="A1"]');inp.value='Julian'.slice(0,i+1);inp.dispatchEvent(new Event('input',{bubbles:true}));`,
    final:`({text:document.querySelector('[data-combo="A1"]').value,spieler:M.A1,treffer:document.querySelector('[data-combolist="A1"]').textContent.trim(),fokus:document.activeElement.dataset.combo})`},
  {name:'Teamsuche: schnelle Buchstaben', prep:`closeSheet(true);tab='teams';teamSearch='';teamView='teams';render();document.getElementById('teamSearch').focus();`, interval:25, count:6,
    action:`const inp=document.getElementById('teamSearch');inp.value='Julian'.slice(0,i+1);inp.dispatchEvent(new Event('input',{bubbles:true}));`,
    final:`({text:document.getElementById('teamSearch').value,zustand:teamSearch,fokus:document.activeElement.id})`},
  {name:'Tabwechsel: kalte Positionen', prep:`closeSheet(true);tab='ranking';render();invalidateCache();`, interval:0, count:1,
    action:`document.querySelector('[data-nav="positions"]').click();`,
    final:`({tab,aktiv:document.querySelector('[data-nav].on').dataset.nav,titel:document.querySelector('#main h2').textContent})`},
  {name:'Tabwechsel: fünf schnelle Absichten', prep:`closeSheet(true);tab='ranking';render();invalidateCache();`, interval:20, count:5,
    action:`document.querySelector('[data-nav="'+['positions','history','teams','awards','ranking'][i]+'"]').click();`,
    final:`({tab,aktiv:document.querySelector('[data-nav].on').dataset.nav,titel:document.querySelector('#main h2').textContent})`},
  {name:'Blatt: Zug zurückschnappen', prep:`closeSheet(true);showPlayer(players[8].id);document.getElementById('sheet').scrollTop=0;`, interval:8, count:80,
    start:`const grab=document.getElementById('sheetGrab');grab.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,clientY:100}));`,
    action:`window.dispatchEvent(new MouseEvent('mousemove',{clientY:100+(i<40?i:79-i)}));`,
    finish:`window.dispatchEvent(new MouseEvent('mouseup',{clientY:100}));`,
    final:`({offen:document.getElementById('sheet').classList.contains('show'),transform:document.getElementById('sheet').style.transform})`}
];
async function measure(K, spec){
  await K(spec.prep);
  // Vorbereitende Übergänge gehören nicht zum Input-Messfenster.
  await K(`new Promise(r=>setTimeout(r,500))`);
  return K(`(async()=>{
    const frames=[],tasks=[],events=[];let done=false,last=await new Promise(requestAnimationFrame);
    const observer=new PerformanceObserver(list=>list.getEntries().forEach(e=>tasks.push(e.duration)));
    observer.observe({type:'longtask',buffered:false});
    const frame=t=>{if(done)return;frames.push(t-last);last=t;requestAnimationFrame(frame)};
    requestAnimationFrame(frame);await new Promise(requestAnimationFrame);
    window.__interaktionAnzahl={};
    const restore=[];
    for(const name of ['computeMatch','simulateElo','render','updatePreview']){
      const fn=eval(name), wrapper=function(...a){window.__interaktionAnzahl[name]=(window.__interaktionAnzahl[name]||0)+1;return fn.apply(this,a)};
      eval(name+'=wrapper');restore.push(()=>eval(name+'=fn'));
    }
    ${spec.start || ''}
    const base=performance.now();
    await Promise.all(Array.from({length:${spec.count}},(_,i)=>new Promise(resolve=>{
      const expected=base+i*${spec.interval};
      setTimeout(()=>{
        const start=performance.now();${spec.action}
        const end=performance.now();
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          events.push({rueckstau:start-expected,handler:end-start,praesentation:performance.now()-expected});resolve();
        }));
      },i*${spec.interval});
    })));
    ${spec.finish || ''}
    await new Promise(r=>setTimeout(r,650));done=true;observer.disconnect();restore.forEach(fn=>fn());
    return {ereignisse:events.length,rueckstauMedian:(${median.toString()})(events.map(e=>e.rueckstau)),rueckstauMax:Math.max(0,...events.map(e=>e.rueckstau)),
      handlerMedian:(${median.toString()})(events.map(e=>e.handler)),handlerMax:Math.max(0,...events.map(e=>e.handler)),
      praesentationMedian:(${median.toString()})(events.map(e=>e.praesentation)),praesentationMax:Math.max(0,...events.map(e=>e.praesentation)),
      bildabstandMax:Math.max(0,...frames),bilderUeber34ms:frames.filter(n=>n>34).length,
      longTasks:tasks.length,longTaskMax:Math.max(0,...tasks),aufrufe:window.__interaktionAnzahl,final:${spec.final}};
  })()`);
}
async function measureSwitch(page,K){
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const values=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const runs=[];
  try{
    for(let round=0;round<rounds;round++){
      await K(`closeSheet(true);document.getElementById('main').innerHTML=
        '<div class="ui-switch" id="interaktionSwitch"><button class="on">Links</button><button>Mitte</button><button>Rechts</button></div>';
        void document.getElementById('interaktionSwitch').offsetWidth;0;`);
      // DOM-Einbau und das Schließen eines alten Blatts liegen vor der Messung.
      await page.waitForTimeout(550);
      const transitions=[];
      for(const target of [2,0,1,2,0,2]){
        const before=await values();
        await page.evaluate(i=>{
          const w=document.getElementById('interaktionSwitch');
          [...w.children].forEach((b,n)=>b.classList.toggle('on',n===i));
        },target);
        await page.waitForTimeout(380);
        // Keine DOM-Geometrieabfrage während der Animation: die Diagnose soll
        // selbst keine Layouts pro Bild erzwingen.
        const after=await values();
        const geometry=await page.evaluate(i=>{
          const w=document.getElementById('interaktionSwitch'),cs=getComputedStyle(w,'::before');
          const dx=cs.transform==='none'?0:new DOMMatrix(cs.transform).m41;
          const center=parseFloat(cs.left)+parseFloat(cs.width)/2+dx;
          const targetCenter=w.children[i].offsetLeft+w.children[i].offsetWidth/2;
          return {ziel:i,links:parseFloat(cs.left),breite:parseFloat(cs.width),versatz:dx,
            mitte:center,zielMitte:targetCenter,abweichung:Math.abs(center-targetCenter)};
        },target);
        transitions.push({layoutAnzahl:after.LayoutCount-before.LayoutCount,
          layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,geometrie:geometry});
      }
      if(transitions.some(t=>t.geometrie.abweichung>1.5))throw new Error('Der Schlitten trifft sein Segment nicht.');
      runs.push({layoutAnzahl:transitions.reduce((n,t)=>n+t.layoutAnzahl,0),
        layoutMs:transitions.reduce((n,t)=>n+t.layoutMs,0),uebergaenge:transitions});
    }
    return {aktion:'Wähler: sechs 300-ms-Schlittenübergänge',layoutAnzahlMedian:median(runs.map(r=>r.layoutAnzahl)),
      layoutMsMedian:rounded(median(runs.map(r=>r.layoutMs))),alleZieleGetroffen:true,laeufe:runs};
  }finally{await cdp.detach()}
}
(async()=>{
  const {browser,page,K,errors}=await createHarness({cpu});
  try{
    const result={browser:browser.version(),viewport:'390 × 844',cpuFaktor:cpu,runden:rounds,
      methode:'Synthetische, timer-gequeue-te Eingaben; ms. Präsentation = zweite rAF-Gelegenheit ab Sollzeit. Kein Hardware-FPS, kein INP, kein Netzwerk.',messungen:[]};
    if(process.argv.includes('--waehler-only')){
      result.methode='Isolierter Drei-Segment-Wähler im echten App-Shell; sechs .3-s-Übergänge. CDP LayoutCount/LayoutDuration-Differenzen, Geometrie erst nach dem Übergang. Kein Hardware-FPS-Test.';
      const entry=await measureSwitch(page,K);result.messungen.push(entry);
      console.log(entry.aktion,JSON.stringify({...entry,laeufe:undefined}));
    }
    for(const spec of process.argv.includes('--waehler-only')?[]:cases){
      const runs=[];for(let i=0;i<rounds;i++)runs.push(await measure(K,spec));
      const numeric=Object.keys(runs[0]).filter(k=>typeof runs[0][k]==='number');
      const entry={aktion:spec.name,...Object.fromEntries(numeric.map(k=>[k,rounded(median(runs.map(r=>r[k])))])),
        aufrufe:runs[Math.floor(rounds/2)].aufrufe,final:runs[Math.floor(rounds/2)].final,laeufe:runs};
      result.messungen.push(entry);console.log(spec.name,JSON.stringify({...entry,laeufe:undefined}));
    }
    if(errors.length)throw new Error(errors.join('\n'));
    const output=process.argv.find(a=>a.startsWith('--ausgabe='));
    if(output)fs.writeFileSync(path.resolve(root,output.slice(10)),JSON.stringify(result,null,2)+'\n');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
