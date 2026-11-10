// Reproduzierbare lokale Messung mit den echten Liga-Fixtures, ohne Backend.
// node tools/performance.cjs [--ausgabe=<Pfad.json>] [--profil] [--cpu=4] [--mobil] [--ruhe]
// Gemessen wird synchrones JavaScript samt erstem Layout, kein Netzwerk.
const fs=require('node:fs');
const path=require('node:path');
const chromium=require('../tests/browser.js').ladeChromium();
if(!chromium) throw new Error('Die Messung benötigt den vorhandenen Chromium-Testbrowser.');
const root=path.resolve(__dirname,'..');
// Die App-Datei zerlegen: der größte Inline-Script-Block ist die IIFE, ohne
// die Boot-Abfragen und mit einem Einstieg zum Auswerten. tools/golden.mjs
// zerlegt damit zwei Fassungen nebeneinander, deshalb eine Funktion.
function zerlegen(html){
  const blocks=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).sort((a,b)=>b.length-a.length);
  let code=blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/,'/* Messstand ohne Boot-Abfragen */');
  const end=code.lastIndexOf('})();');
  code=code.slice(0,end)+'\nwindow.__perfEval=s=>eval(s);\n'+code.slice(end);
  const head=html.slice(0,html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g,'');
  const styles=(head.match(/<style[^>]*>[\s\S]*?<\/style>/gi)||[]).join('\n');
  const body=html.slice(html.indexOf('<body'),html.indexOf('<script',html.indexOf('<body')));
  return {code,styles,body};
}
const {code,styles,body}=zerlegen(fs.readFileSync(require('../tests/ziel.js'),'utf8'));
// Die Testliga (tests/fixture.js), als Vorlage für jeden Messstand.
const LIGA=require("../tests/fixture.js").ladeLiga();
const names=LIGA.names, ids=LIGA.ids, data=LIGA.matches, players=LIGA.players, seasons=LIGA.seasons;
const bootFuer=jetzt=>`(() => {
  const stub=()=>new Proxy(function(){},{get(_,p){return p==='then'?undefined:stub()},apply(){return stub()}});
  window.supabase={createClient:()=>({from:()=>stub(),channel:()=>stub(),rpc:()=>stub(),removeChannel(){}})};
  window.fetch=()=>new Promise(()=>{}); window.setInterval=()=>0;
  const RD=Date;window.__perfJetzt=${jetzt};
  window.Date=class extends RD{constructor(...a){a.length?super(...a):super(window.__perfJetzt)}static now(){return window.__perfJetzt}};
})();`;
const JETZT=new Date(2026,7,26,21).getTime();
const setupFuer=(players,data,seasons)=>`
  players=${JSON.stringify(players)}; matches=${JSON.stringify(data)}; seasons=${JSON.stringify(seasons)};
  invalidateCache();
  const hist=new Map(simulateEloWithSliders(matches).history.map(h=>[h.matchId,h]));
  matches.forEach(m=>{const h=hist.get(m.id);m.deltas=h?h.deltas:{};m.exp_a=h?h.expA:.5;}); invalidateCache();
  const sim=getGlobalSim();
  seasons.forEach(s=>{
    const pl=sim.seasonPlayed[s.id]||{},e=sim.seasonEndElos[s.id]||{};
    s.top_elo=JSON.stringify(Object.keys(pl).filter(id=>pl[id]>0).map(id=>({id,elo:Math.round(e[id]||0),wins:0,losses:0})).sort((a,b)=>b.elo-a.elo).slice(0,3));
  });
  invalidateCache();
`;
const setup=setupFuer(players,data,seasons);
const cases=[
  ['Liga',`tab='ranking';period='season';rankMetric='elo';`,'render()'],
  ['Positionen',`tab='positions';rankMetric='drive';`,'render()'],
  ['Rekorde',`tab='awards';awView='rekorde';rekKammer='';`,'render()'],
  ['Chronik',`tab='awards';awView='chronik';`,'render()'],
  ['Verlauf',`tab='history';histFilter='all';_histPage=0;`,'render()'],
  ['Profil',`tab='ranking';` ,`showPlayer('${ids[8]}')`],
  ['News',`_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;`,'openNewsFeed()']
];
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
// Ohne Optionen ist das der Messstand von jeher. tools/golden.mjs setzt
// Datei, Zeitpunkt, Zeitzone, Daten und einen Vorspann (die Attrappe mit
// Schreibprotokoll), damit zwei Fassungen unter gleichen Bedingungen laufen.
async function createHarness({cpu=1,html=null,jetzt=JETZT,kontext={},vorApp='',daten=null}={}){
  if(!Number.isFinite(cpu) || cpu<1 || cpu>20) throw new Error('CPU-Faktor muss zwischen 1 und 20 liegen.');
  const teile=html?zerlegen(html):{code,styles,body};
  const browser=await chromium.launch();
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:844},...kontext});
    const page=await ctx.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<!doctype html><html><head><meta charset="utf-8">'+teile.styles+'</head>'+teile.body+'</html>');
    await page.addScriptTag({content:bootFuer(jetzt)});
    if(vorApp) await page.addScriptTag({content:vorApp});
    await page.addScriptTag({content:teile.code});
    const K=s=>page.evaluate(s=>window.__perfEval(s),s);
    await K(daten?setupFuer(daten.players,daten.matches,daten.seasons):setup);
    if(cpu!==1){
      const cdp=await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    }
    return {browser,page,K,errors};
  }catch(e){await browser.close();throw e;}
}
module.exports={createHarness,fixtures:{players,matches:data,seasons,ids,names}};
if(require.main===module) (async()=>{
  const cpu=Number((process.argv.find(a=>a.startsWith('--cpu='))||'--cpu=1').slice(6));
  const {browser,page,K,errors}=await createHarness({cpu});
  try{
    const profiling=process.argv.includes('--profil');
    if(profiling) await K(`(() => {
      window.__perfZaehler={};
      const names=['playerStats','simulateElo','getGlobalSim','seasonPeakElos','_periodWinnerMap','getBadgeEarnedCache','prestigeTabelle','allChronicles','_chronicleCtx','_seasonTitleCtx','seasonTitles','getAllPlayerRanks','_spWappen','_newsCardHtmlM2','_newsFaeden','getCachedAwardRankings','_buildStories','getStoriesCache','openSheet','showPlayer'];
      for(const name of names){
        try{const fn=eval(name);if(typeof fn!=='function')continue;
          const wrapped=function(...args){const t=performance.now();try{return fn.apply(this,args)}finally{const z=window.__perfZaehler[name]||(window.__perfZaehler[name]={aufrufe:0,ms:0});z.aufrufe++;z.ms+=performance.now()-t;}};
          eval(name+'=wrapped');
        }catch(e){}
      }
    })()`);
    const result={partien:data.length,viewport:390,cpuFaktor:cpu,browser:browser.version(),einheit:'ms · synchrones JS + erstes Layout · Median',messungen:[]};
    // `--ruhe` misst allein: die Messungen unten hinterlassen einmalige
    // Arbeit (etwa den Rekordverlauf, der Monat für Monat nachrechnet), und
    // die gehört nicht zur Ruhe einer Ansicht — gemessen stand der
    // Awards-Reiter danach bei 100 statt 2 ms je Sekunde.
    const nurRuhe=process.argv.includes('--ruhe');
    for(const [label,prepare,action] of nurRuhe?[]:cases){
      const cold=[],warm=[];let last;
      for(let i=0;i<3;i++){
        await K(`closeSheet(true);players=players.slice();matches=matches.slice();invalidateCache();${prepare}`);
        last=await K(`(() => {const t=performance.now();${action};void document.getElementById('sheet').offsetHeight;void document.getElementById('main').offsetHeight;return performance.now()-t;})()`);
        cold.push(last);
        for(let j=0;j<3;j++) warm.push(await K(`(() => {const t=performance.now();${action};void document.getElementById('sheet').offsetHeight;void document.getElementById('main').offsetHeight;return performance.now()-t;})()`));
      }
      result.messungen.push({ansicht:label,kalt:+median(cold).toFixed(2),warm:+median(warm).toFixed(2)});
      console.log(label,JSON.stringify(result.messungen.at(-1)));
    }
    if(process.argv.includes('--mobil') && !nurRuhe){
      result.interaktionen=[];
      const actions=[
        ['Tabwechsel',`closeSheet(true);tab='ranking';period='season';render();` ,`document.querySelector('[data-nav="history"]').click()`],
        ['Profil erstmals',`closeSheet(true);tab='ranking';render();`, `showPlayer('${ids[8]}')`],
        ['News öffnen',`closeSheet(true);_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;`, 'openNewsFeed()'],
        ['Generator kalt',`closeSheet(true);invalidateCache();`, '_buildStories()']
      ];
      for(const [ansicht,prepare,action] of actions){
        await K(prepare);
        const r=await K(`(async()=>{
          const frames=[],tasks=[];let ende=false,last=performance.now();
          const obs=new PerformanceObserver(list=>list.getEntries().forEach(e=>tasks.push(e.duration)));
          obs.observe({type:'longtask',buffered:false});
          const frame=t=>{frames.push(t-last);last=t;if(!ende)requestAnimationFrame(frame)};
          last=await new Promise(requestAnimationFrame);requestAnimationFrame(frame);
          await new Promise(requestAnimationFrame);
          const t=performance.now();${action};void document.getElementById('sheet').offsetHeight;
          void document.getElementById('main').offsetHeight;const synchron=performance.now()-t;
          await new Promise(r=>setTimeout(r,900));ende=true;obs.disconnect();
          return {synchron:+synchron.toFixed(2),laengstesBild:+Math.max(0,...frames).toFixed(2),
            longTasks:tasks.length,laengsterTask:+Math.max(0,...tasks).toFixed(2)};
        })()`);
        result.interaktionen.push({ansicht,...r});console.log(ansicht,JSON.stringify(r));
      }
    }
    // Was eine Ansicht kostet, während sie nur offen steht: Arbeit des
    // Hauptthreads je Sekunde, nachdem alles Einmalige gelaufen ist. Eine
    // Endlos-Animation, die nicht die Grafikkarte rechnet, verlangt jedes
    // Bild einen Takt über die ganze Ansicht — gemessen kostete der offene
    // Feed so 490 ms je Sekunde bei vierfach gedrosselter CPU [§C27].
    if(nurRuhe){
      result.ruhe=[];
      const cdp=await page.context().newCDPSession(page);
      await cdp.send('Performance.enable');
      const takt=async()=>(await cdp.send('Performance.getMetrics')).metrics.find(x=>x.name==='TaskDuration').value;
      const ansichten=[
        ['Liga',"tab='ranking';period='season';render()"],['Positionen',"tab='positions';render()"],
        ['Awards',"tab='awards';awView='awards';awPeriod='season';awSeasonId=null;render()"],
        ['Rekorde',"tab='awards';awView='rekorde';render()"],['Chronik',"tab='awards';awView='chronik';render()"],
        ['Teams',"tab='teams';render()"],['Verlauf',"tab='history';render()"],
        ['Profil',`showPlayer('${ids[6]}')`],['Laufbahn',`showLaufbahn('${ids[6]}')`],
        ['Feed',"_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;openNewsFeed();_newsFeedRest(true)"],
        ['Wochenrückblick','showPotwRecap()'],['Saisonrückblick','showSeasonRecap(seasons[0])'],
      ];
      for(const [ansicht,js] of ansichten){
        await K('closeSheet(true);'+js);
        await page.waitForTimeout(4000);
        const a=await takt();await page.waitForTimeout(3000);const b=await takt();
        const r={ansicht,msJeSekunde:+((b-a)/3*1000).toFixed(1)};
        result.ruhe.push(r);console.log('Ruhe',JSON.stringify(r));
      }
    }
    if(profiling) result.profil=await page.evaluate(()=>window.__perfZaehler);
    if(errors.length) throw new Error(errors.join('\n'));
    console.log(JSON.stringify(result,null,2));
    const output=process.argv.find(a=>a.startsWith('--ausgabe='));
    if(output) fs.writeFileSync(path.resolve(root,output.slice(10)),JSON.stringify(result,null,2)+'\n');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
