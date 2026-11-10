// Stilles Aktualisieren beim Liga-Tap, ohne Dokumentreload oder Lade-Stürme.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');process.exit(2);
}
const {createHarness}=require('../tools/performance.cjs');
let checks=0,fails=0;
const ok=(c,s)=>{checks++;if(!c)fails++;console.log((c?'  ok  ':'  ✗   ')+s);};
(async()=>{
  const {browser,page,K,errors}=await createHarness();
  try{
    // Auf tatsächlich bearbeitete Bild-/Taskphasen warten, nicht auf eine
    // empfindliche feste Millisekundengrenze für CI oder langsame Rechner.
    const schritt=()=>K('new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)))');
    await K(`window.__original={from:sb.from,arch:autoArchiveSeasons,sync:syncStoriesViaDb};
      window.__antwort={players,matches,config:cfg,seasons};window.__abfragen=[];
      window.__syncs=0;autoArchiveSeasons=async()=>{};syncStoriesViaDb=async()=>{window.__syncs++};
      sb.from=table=>{const q={select:()=>q,order:()=>q,eq:()=>q,single:()=>q,
        then:resolve=>{window.__abfragen.push({table,resolve})}};return q;};
      window.__beenden=(fehler=false)=>{const q=window.__abfragen.splice(0);q.forEach(a=>a.resolve(fehler?{error:new Error('Testfehler')}:{data:window.__antwort[a.table]}));};
      _lastLoadFingerprint=JSON.stringify([players,matches,cfg,seasons]);_lastLoadDay=new Date().toDateString();
      tab='awards';awView='awards';render();setConn('Bisheriger Stand','ok');
      window.__version=_cache.version;document.querySelector('[data-nav="ranking"]').click();
      window.__node=document.getElementById('main').firstElementChild;0;`);
    ok(await K('tab==="ranking" && document.querySelector("[data-nav=ranking]").classList.contains("on")'),'Liga-Tap quittiert die Auswahl sofort');
    await schritt();
    const first=await K('window.__abfragen.length');
    ok(first===4,'Awards → Liga startet genau einen Datenabruf mit vier bestehenden Quellen');
    ok(await K('document.getElementById("main")._renderTab==="ranking" && document.getElementById("main").getAttribute("aria-busy")!=="true"'),'Liga bleibt während des Abrufs vollständig bedienbar');
    ok(await K('document.querySelector(".conn-pill").textContent.includes("Bisheriger Stand")'),'Stiller Abruf ersetzt den Stand nicht durch einen Ladehinweis');
    await K('window.__ligaNode=document.getElementById("main").firstElementChild;window.__beenden();0;');
    await schritt();
    ok(await K('_cache.version===window.__version && document.getElementById("main").firstElementChild===window.__ligaNode && window.__syncs===0'),'Unveränderte Antwort behält DOM, Cache und Story-Sync in Ruhe');
    // Um 23:59 geht der Tag zu, auch ohne neue Partie: dieselbe Antwort
    // rechnet dann neu. Nur mit Mitternacht stand „Unschlagbar" erst am
    // nächsten Morgen im Profil.
    await K(`window.__tagZu=_tagZu;_tagZu=()=>true;window.__vZu=_cache.version;
      document.querySelector('[data-nav="ranking"]').click();0;`);
    await schritt();
    await K('window.__beenden();0;');
    await schritt();
    ok(await K('_cache.version>window.__vZu && !_loadAllPromise'),'Um 23:59 rechnet dieselbe Antwort neu, weil der Tag zu ist');
    await K('_tagZu=window.__tagZu;_lastLoadDay=new Date().toDateString();window.__syncs=0;window.__version=_cache.version;0;');

    await K(`for(let i=0;i<5;i++)document.querySelector('[data-nav="ranking"]').click();0;`);
    await schritt();
    ok(await K('window.__abfragen.length===4'),'Erneuter Liga-Tap aktualisiert; ein Doppeltipp-Burst holt nur einmal');
    await K(`document.querySelector('[data-nav="ranking"]').click();0;`);
    await schritt();
    await K('window.__beenden();0;');
    await schritt();
    ok(await K('window.__abfragen.length===0 && ! _loadAllPromise'),'Weitere Liga-Taps während desselben Abrufs erzeugen keinen Nachlade-Sturm');

    await K(`window.__alteZahl=matches.length;window.__antwort.matches=matches.concat({...matches.at(-1),id:'neues-liga-match',created_at:new Date(Date.now()+1000).toISOString()});
      document.querySelector('[data-nav="ranking"]').click();0;`);
    await schritt();
    await K('window.__beenden();0;');
    await schritt();
    ok(await K('matches.length===window.__alteZahl+1 && _cache.version>window.__version'),'Neue fremde Partie wird ohne Dokumentreload eingebaut');
    ok(await K('document.getElementById("main")._renderVersion===_cache.version && window.__syncs===1'),'Ansicht und Story-Sync sehen denselben frischen Datenstand');

    await K(`document.querySelector('[data-nav="ranking"]').click();0;`);
    await schritt();
    await K('loadAll({nachladen:false});0;');
    ok(await K('_loadAllLeise===true'),'Ein Hintergrundtick macht den stillen Liga-Abruf nicht zur Vordergrund-Ladeansicht');
    await K('window.__fehlerNode=document.getElementById("main").firstElementChild;window.__beenden(true);0;');
    await schritt();
    ok(await K('document.getElementById("main").firstElementChild===window.__fehlerNode && matches.length===window.__alteZahl+1 && !_loadAllPromise'),'Stiller Abruffehler erhält letzte Ansicht und Daten und gibt die Sperre frei');

    // Eine Navigation, die während einer vorher begonnenen Abfrage passiert,
    // braucht einen frischen Folgelauf; weitere Navigationstaps teilen ihn.
    await K('loadAll({nachladen:false,leise:true});0;');
    await schritt();
    await K(`document.querySelector('[data-nav="ranking"]').click();0;`);
    await schritt();
    await K('window.__beenden();0;');
    await schritt();
    ok(await K('window.__abfragen.length===4'),'Ein vor dem Liga-Tap gestarteter Abruf wird einmal frisch nachgeholt');
    await K('window.__beenden();0;');
    await schritt();

    await K(`document.querySelector('[data-nav="ranking"]').click();0;`);
    await schritt();
    await K(`tab='match';M={A1:'',A2:players[1].id,B1:players[2].id,B2:players[3].id,pA1:'drive',pA2:'reves',pB1:'drive',pB2:'reves',sa:10,sb:5};render();
      window.__feld=document.querySelector('[data-combo="A1"]');window.__feld.focus();window.__feld.value='Freier Entwurf';
      window.__feld.setSelectionRange(6,6);window.__antwort.matches=window.__antwort.matches.slice();
      window.__antwort.matches.push({...matches.at(-1),id:'spaetes-liga-match'});window.__beenden();0;`);
    await schritt();
    ok(await K('tab==="match" && document.querySelector("[data-combo=A1]")===window.__feld && document.activeElement===window.__feld && window.__feld.value==="Freier Entwurf" && window.__feld.selectionStart===6'),'Späte Liga-Antwort behält einen inzwischen geöffneten Eingabeentwurf');
    await K("tab='history';render()");
    ok(await page.locator('#main > .view').evaluate(el=>getComputedStyle(el).animationName==='none'),'Ein Reiterwechsel schiebt und verblasst nicht mehr die gesamte lange Ansicht');
    await K('_histPage=1;render()');
    ok(await page.locator('#main > .view').evaluate(el=>getComputedStyle(el).animationName==='none'),'Auch Filter- und Datenaktualisierungen starten keine globale Eintrittsanimation');
    await K('sb.from=window.__original.from;autoArchiveSeasons=window.__original.arch;syncStoriesViaDb=window.__original.sync');
    ok(errors.length===0,'Keine Browserfehler bei stiller Aktualisierung');
  }finally{await browser.close();}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
