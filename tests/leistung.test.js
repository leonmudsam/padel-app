// Keine Zeitlimits im CI: geprüft werden eingesparte Arbeit und Cache-Gültigkeit.
// Die Millisekunden misst tools/performance.cjs getrennt und reproduzierbar.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  DOM-Wiederverwendung und verzögertes Zeichnen brauchen einen Browser.');
  process.exit(2);
}
const {createHarness}=require('../tools/performance.cjs');
let checks=0,fails=0;
const ok=(c,msg)=>{checks++;if(!c)fails++;console.log((c?'  ok  ':'  ✗   ')+msg);};
(async()=>{
  const {browser,page,K,errors}=await createHarness();
  try{
    for(const zustand of ["tab='ranking';period='season'", "tab='positions'",
      "tab='awards';awView='rekorde'", "tab='awards';awView='chronik'", "tab='history'"]){
      const r=await K(`(() => {${zustand};render();const main=document.getElementById('main'),n=main.firstElementChild;
        render();return n===main.firstElementChild;})()`);
      ok(r,'Unveränderte Ansicht behält ihre DOM-Knoten: '+zustand);
    }
    const dom=await K(`(() => {
      tab='ranking';render();const main=document.getElementById('main'),nav=document.querySelector('[data-nav="history"]');
      nav.focus();render();const fokus=document.activeElement===nav;
      const n=main.firstElementChild;invalidateCache();render();const neu=n!==main.firstElementChild;
      const n2=main.firstElementChild;period='all';render();const filter=n2!==main.firstElementChild;
      main.innerHTML='<p>Fremder Zwischenstand</p>';render();const repariert=!!main.querySelector('.rlist');
      const weiter=nav===document.querySelector('[data-nav="history"]');nav.click();
      return {fokus,neu,filter,repariert,weiter,klick:tab==='history'};
    })()`);
    for(const [k,v] of Object.entries(dom))ok(v,'DOM-Cache/Navigationsleiste: '+k);
    ok(await K(`(() => {tab='settings';render();const n=document.getElementById('main').firstElementChild;
      render();return n!==document.getElementById('main').firstElementChild;})()`),'Eingabeansichten werden weiterhin frisch gebunden');

    const kalender=await K(`(() => {
      const jetzt=window.__perfJetzt,ver=_cache.version;
      const tag=matchesInPeriod('day'),woche=awardRankings('week'),ph=getSeasonPositionHistory('2026-08');
      allPastSeasons();window.__perfJetzt=new Date(2026,7,27,21).getTime();
      const tagNeu=matchesInPeriod('day'),phNeu=getSeasonPositionHistory('2026-08');
      window.__perfJetzt=new Date(2026,8,2,21).getTime();
      const weekNeu=awardRankings('week'),past=allPastSeasons(),alt=getSeasonPositionHistory('2026-08');
      const r={tag:tag.length>0 && tagNeu.length===0,position:ph.lastDay===26 && phNeu.lastDay===27,
        woche:woche!==weekNeu && JSON.stringify(weekNeu)===JSON.stringify(_awardRankingsUncached('week')),
        monat:past.includes('2026-08'),archiv:!alt.isCurrent,version:_cache.version===ver};
      window.__perfJetzt=jetzt;invalidateCache();return r;
    })()`);
    for(const [k,v] of Object.entries(kalender))ok(v,'Kalenderwechsel ohne Datenänderung: '+k);

    await K(`closeSheet(true);_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;
      window.__cardFn=_newsCardHtmlM2;window.__cards=0;
      _newsCardHtmlM2=function(...a){window.__cards++;return window.__cardFn(...a)};
      window.__gesamt=getStoriesCache().map(s=>s.id);`);
    const feed=await K(`(() => {openNewsFeed();const oben=window.__cards;
      const sichtbar=document.querySelectorAll('#sheet .nf-card').length;
      _newsFeedRest();const ids=[...document.querySelectorAll('#sheet .nf-card')].map(e=>e.dataset.sid);
      const tage=[...document.querySelectorAll('#sheet .nf-tag')].map(e=>e.dataset.tag);
      return {oben,sichtbar,alle:window.__cards,gleich:JSON.stringify(ids)===JSON.stringify(window.__gesamt),
        tage:tage.length===new Set(tage).size,zahl:ids.length};})()`);
    ok(feed.oben<=15 && feed.oben===feed.sichtbar,'Nur sichtbare obere Karten werden beim Öffnen wirklich gebaut');
    ok(feed.alle===feed.zahl && feed.zahl>24,'Nachreichen baut jede Karte genau einmal');
    ok(feed.gleich,'Nachreichen bewahrt alle Story-IDs und ihre Reihenfolge');
    ok(feed.tage,'Jeder Tageskopf steht genau einmal');
    // Ein großer einzelner Spieltag darf nicht die Begrenzung umgehen.
    const gross=await K(`(() => {
      window.__storiesFn=getStoriesCache;window.__tagFn=_newsTagKarte;
      const ss=window.__gesamt.map(id=>window.__storiesFn().find(s=>s.id===id)).slice(0,40)
        .map(s=>Object.assign({},s,{when:'2026-08-26T12:00:00Z'}));
      getStoriesCache=()=>ss;_newsTagKarte=()=>ss.find(_newsTagKarteWuerdig)?.id;window.__cards=0;
      openNewsFeed();const oben=window.__cards;_newsFeedRest();
      const alle=window.__cards,tage=document.querySelectorAll('#sheet .nf-tag').length;
      const marken=document.querySelectorAll('#sheet .nf-gross').length;
      getStoriesCache=window.__storiesFn;_newsTagKarte=window.__tagFn;
      return {oben,alle,tage,marken};})()`);
    ok(gross.oben<=15 && gross.alle===40,'Auch ein großer Spieltag wird portionsweise gezeichnet');
    ok(gross.tage===1 && gross.marken===1,'Geteilter Spieltag bewahrt Kopf und Karte des Tages');

    // Alte geplante Arbeit darf keinen neu geöffneten Feed anstoßen.
    const alt=await K(`(() => {
      window.__raf=requestAnimationFrame;window.__rafJobs=[];window.requestAnimationFrame=f=>{window.__rafJobs.push(f);return 0};
      window.__cards=0;openNewsFeed();const alt=window.__rafJobs.shift();
      _newsFeedFilter='tafel';openNewsFeed();const vorher=window.__cards;
      if(alt)alt();return {vorher,alt};})()`);
    await page.waitForTimeout(120);
    ok(await K('window.__cards')===alt.vorher,'Veralteter Nachreich-Auftrag verändert keinen neuen Filter');
    const zu=await K(`(() => {window.requestAnimationFrame=window.__raf;closeSheet(true);
      const n=window.__cards;_newsFeedRest();_newsFeedFilter='all';return window.__cards===n;})()`);
    ok(zu,'Ein geschlossener Feed baut keine weiteren Karten');
    await K('window.__cards=0;openNewsFeed()');
    // Gewartet wird auf den vollen Feed, höchstens sechs Sekunden. Fest
    // 1,8 s zu warten reichte auf einem frisch gestarteten Prüfrechner nicht:
    // dort standen nach dieser Zeit 79 bis 87 der 88 Karten, mit jedem Stand
    // der App, und der Lauf war rot, ohne dass das Nachreichen fehlte.
    const voll = () => K('document.querySelectorAll("#sheet .nf-card").length===window.__gesamt.length');
    for(let t = 0; t < 60 && !(await voll()); t++) await page.waitForTimeout(100);
    ok(await voll(),'Automatisches Nachreichen zeigt schließlich den vollständigen Feed');
    const portion=await K(`(() => {
      openNewsFeed();const n=window.__cards;_newsFeedRest(false);return window.__cards-n;
    })()`);
    ok(portion>0 && portion<=4,'Ein automatischer Nachreich-Takt baut höchstens vier Karten');
    const version=await K(`(() => {
      const alt=document.querySelector('#sheet .nf-liste');invalidateCache(['stats']);_newsFeedRest(false);
      const neu=document.querySelector('#sheet .nf-liste');_newsFeedRest();
      return {neu:alt!==neu,alle:neu.querySelectorAll('.nf-card').length===window.__gesamt.length};
    })()`);
    ok(version.neu && version.alle,'Datenversionswechsel verhindert Nachreichen aus dem alten Stand');
    await K('window.__idle=window.requestIdleCallback;window.requestIdleCallback=undefined;openNewsFeed()');
    await page.waitForTimeout(1800);
    ok(await K('document.querySelectorAll("#sheet .nf-card").length===window.__gesamt.length'),'Auch ohne Idle-API wird der Feed vollständig nachgereicht');
    await K('window.requestIdleCallback=window.__idle');
    await K('closeSheet(true);_newsCardHtmlM2=window.__cardFn');

    // Vier Backend-Leseabfragen pro Durchlauf, niemals parallele Durchläufe.
    // Der vorige DOM-Test stand in den Einstellungen. Hier wird bewusst
    // eine Anzeige geprüft; Formulare werden bei Datenantworten geschont.
    await K("tab='history';render()");
    await K(`window.__laden={q:[],aktiv:0,max:0,aufrufe:0,render:0,sync:0,p:[]};
      window.__from=sb.from;window.__render=render;window.__arch=autoArchiveSeasons;window.__sync=syncStoriesViaDb;
      render=()=>window.__laden.render++;autoArchiveSeasons=async()=>{};syncStoriesViaDb=async()=>{window.__laden.sync++};
      _lastLoadFingerprint=null;_lastLoadDay=null;
      sb.from=table=>{const q={select:()=>q,order:()=>q,eq:()=>q,single:()=>q,
        then:(resolve,reject)=>{const t=window.__laden;t.aufrufe++;t.aktiv++;t.max=Math.max(t.max,t.aktiv);
          t.q.push({table,fertig:data=>{t.aktiv--;resolve({data})},
            fehler:e=>{t.aktiv--;resolve({data:null,error:e})},scheitern:e=>{t.aktiv--;reject(e)}})}};return q;};
      for(let i=0;i<6;i++)window.__laden.p.push(loadAll());0;`);
    ok(await K('window.__laden.aktiv')===4,'Gleichzeitige Ladeanforderungen starten nur einen Lese-Durchlauf');
    // Der erste Stand ist schon überholt; nach Abschluss kommt EIN frischer Abruf.
    await K(`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='config'?cfg:[]));0;`);
    await page.waitForTimeout(20);
    ok(await K('window.__laden.aktiv')===4,'Lade-Burst fordert einen frischen Folgedurchlauf an');
    ok(await K('window.__laden.render')===0,'Überholter Stand wird nicht gerendert oder in die Caches eingebaut');
    await K(`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='players'?
      [{id:'neu',name:'Frischer Stand',elo:7}]:q.table==='config'?cfg:[]));0;`);
    await K('Promise.all(window.__laden.p)');
    const last=await K(`({max:window.__laden.max,aufrufe:window.__laden.aufrufe,render:window.__laden.render,
      sync:window.__laden.sync,frisch:players[0]?.id==='neu'})`);
    ok(last.max===4 && last.aufrufe===8,'Sechs gleichzeitige Anforderungen brauchen acht statt 24 Abfragen');
    ok(last.render===1 && last.sync===1,'Nur der aktuelle Stand wird einmal gerendert und synchronisiert');
    ok(last.frisch,'Alle Aufrufer erhalten den abschließend frischen Datenstand');
    // Der Fingerprint muss den neuen Stand erkennen und unverändert lassen.
    await K(`window.__laden.p=[loadAll()];0;`);
    await K(`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='players'?
      [{id:'neu',name:'Frischer Stand',elo:7}]:q.table==='config'?cfg:[]));0;`);
    await K('Promise.all(window.__laden.p)');
    ok(await K('window.__laden.render===1 && window.__laden.sync===1'),'Unveränderte Folgeabfrage lässt DOM und Rechencaches in Ruhe');
    // Ein Fehler darf die drei noch laufenden Abrufe nicht verwaisen lassen.
    await K('window.__laden.p=[loadAll()];0;');
    await K(`window.__laden.q.shift().scheitern(new Error('Absichtlicher Testfehler'));0;`);
    await page.waitForTimeout(20);
    await K('window.__laden.p.push(loadAll());0;');
    ok(await K('window.__laden.aktiv===3'),'Abgelehnter Einzelabruf lässt übrige Leseabfragen erst enden');
    await K(`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='config'?cfg:[]));0;`);
    await page.waitForTimeout(20);
    ok(await K('window.__laden.aktiv===4 && window.__laden.max===4'),'Fehlerhafter überholter Durchlauf startet danach genau einen frischen Abruf');
    await K(`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='players'?
      [{id:'neu',name:'Frischer Stand',elo:7}]:q.table==='config'?cfg:[]));0;`);
    await K('Promise.all(window.__laden.p)');
    ok(await K('window.__laden.render===1'),'Fehlerhafter Zwischenstand wird nicht eingebaut');
    // Config/Seasons-Fehler dürfen nicht als teilweise erfolgreiche Daten
    // die vorhandenen Arrays ersetzen; danach muss derselbe Stand wieder ladbar sein.
    await K('window.__vor={players,version:_cache.version};window.__laden.p=[loadAll()];0;');
    await K(`window.__laden.q.splice(0).forEach(q=>q.table==='seasons'
      ?q.fehler({message:'Absichtlicher Archivfehler'})
      :q.fertig(q.table==='players'?[{id:'falsch',name:'Nicht einbauen'}]:q.table==='config'?cfg:[]));0;`);
    await K('Promise.all(window.__laden.p)');
    ok(await K('players===window.__vor.players && _cache.version===window.__vor.version'),'Fehlerhafte Teilantwort verändert keine Daten oder Cache-Version');
    ok(await K('_lastLoadFingerprint===null && _loadAllPromise===null'),'Fehler gibt Ladesperre frei und verwirft den Fingerprint');
    await K('window.__laden.p=[loadAll()];0;');
    await K(`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='players'?
      [{id:'neu',name:'Frischer Stand',elo:7}]:q.table==='config'?cfg:[]));0;`);
    await K('Promise.all(window.__laden.p)');
    ok(await K('window.__laden.render===2 && players[0].id==="neu"'),'Wiederholen nach Fehler lädt den gültigen Stand erneut');
    // Kommt eine Anforderung erst während der Story-Synchronisierung, muss
    // auch sie nach Abschluss einen frischen Folgedurchlauf bekommen.
    await K(`syncStoriesViaDb=()=>new Promise(r=>window.__laden.loese=r);
      window.__laden.p=[loadAll()];0;`);
    await K(`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='players'?
      [{id:'neu',name:'Frischer Stand',elo:9}]:q.table==='config'?cfg:[]));0;`);
    await page.waitForTimeout(20);
    await K('window.__laden.p.push(loadAll());0;');
    ok(await K('window.__laden.aktiv===0'),'Während Synchronisierung startet kein paralleler Datenabruf');
    await K('syncStoriesViaDb=async()=>{window.__laden.sync++};window.__laden.loese();0;');
    await page.waitForTimeout(20);
    ok(await K('window.__laden.aktiv===4'),'Anforderung während Synchronisierung erhält anschließend ihren frischen Abruf');
    await K(`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='players'?
      [{id:'neu',name:'Frischer Stand',elo:11}]:q.table==='config'?cfg:[]));0;`);
    await K('Promise.all(window.__laden.p)');
    ok(await K('players[0].elo===11 && _loadAllPromise===null'),'Auch späte Aufrufer warten bis zum neuesten Stand');
    await K('window.__laden.vorher=window.__laden.aufrufe;window.__laden.p=[loadAll()];0;');
    await K('for(let i=0;i<6;i++)_tickDaten();0;');
    ok(await K('window.__laden.aktiv===4 && !_loadAllNochmals'),'Polling schließt sich einem langsamen Abruf an, ohne ihn ständig zu verwerfen');
    const fertig=`window.__laden.q.splice(0).forEach(q=>q.fertig(q.table==='players'?
      [{id:'neu',name:'Frischer Stand',elo:11}]:q.table==='config'?cfg:[]));0;`;
    await K(fertig);await page.waitForTimeout(20);
    // Auch gegen den alten Stand aufräumen, der noch einen Zusatzlauf startet.
    await K(fertig);await K('Promise.all(window.__laden.p)');
    ok(await K('window.__laden.aufrufe-window.__laden.vorher===4'),'Wiederholte Hintergrundticks erzeugen keinen unnötigen Folgedurchlauf');
    await K('sb.from=window.__from;render=window.__render;autoArchiveSeasons=window.__arch;syncStoriesViaDb=window.__sync');
    ok(errors.length===0,'Keine Browserfehler bei Wiederverwendung und Nachreichen');
  }finally{await browser.close();}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
