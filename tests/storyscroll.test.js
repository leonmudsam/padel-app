// Story-Blätter gehören nicht zum Blattstapel: jede Öffnung beginnt oben,
// der Feed darunter behält aber seine eigene Leseposition. Die echten
// Detailrenderer werden mit zwei Partien der Liga geprüft, ohne Backend.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  process.exit(2);
}
const {createHarness}=require('../tools/performance.cjs');
let checks=0,fails=0;
const ok=(c,s)=>{checks++;if(!c)fails++;console.log((c?'  ok  ':'  ✗   ')+s);};
(async()=>{
  const {browser,page,K,errors}=await createHarness();
  try{
    await K(`window.__storiesFn=getStoriesCache;
      window.__storiesScroll=matches.slice(-2).map((m,i)=>({
        id:'scroll-'+i,cat:'match',when:m.created_at,ic:'activity',
        title:'Die Partie '+i,desc:'Das Ergebnis dieser Partie steht fest.',
        dataRef:{type:'spiel',matchId:m.id}}));
      getStoriesCache=()=>window.__storiesScroll;
      openSheet('<div data-feed-leseposition style="height:3000px">Der Feed</div>');
      document.getElementById('sheet').scrollTop=321;
      openNewsDetail('scroll-0');0;`);
    ok(await K(`document.getElementById('nd').scrollHeight>document.getElementById('nd').clientHeight+100`),
      'Der echte Match-Detailrenderer liefert ein scrollbar langes Blatt');
    ok(await K(`document.getElementById('ndBg').classList.contains('show') && document.getElementById('nd').scrollTop===0`),
      'Die erste Story beginnt oben');

    // Die beiden Schreibstellen werden beobachtet: der Reset soll VOR dem
    // teuren Markup und vor Sichtbarkeit liegen, nicht im nächsten Bild.
    await page.evaluate(()=>{
      const nd=document.getElementById('nd'),bg=document.getElementById('ndBg');
      const scroll=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop');
      const html=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
      window.__resetMomente=[];window.__markupMomente=[];window.__showMomente=[];
      Object.defineProperty(nd,'scrollTop',{configurable:true,
        get(){return scroll.get.call(this)},set(v){
          window.__resetMomente.push({wert:v,html:this.innerHTML});
          return scroll.set.call(this,v);
        }});
      Object.defineProperty(nd,'innerHTML',{configurable:true,
        get(){return html.get.call(this)},set(v){
          window.__markupMomente.push({scroll:this.scrollTop,html:v});
          return html.set.call(this,v);
        }});
      const add=bg.classList.add.bind(bg.classList);
      bg.classList.add=(...a)=>{
        if(a.includes('show')) window.__showMomente.push(nd.scrollTop);
        return add(...a);
      };
    });
    const neu=await K(`(() => {
      const nd=document.getElementById('nd');nd.scrollTop=400;
      window.__resetMomente=[];window.__markupMomente=[];window.__showMomente=[];
      closeNewsDetail();openNewsDetail('scroll-1');
      return {null:nd.scrollTop===0,titel:nd.querySelector('.nd-title').textContent,
        reset:window.__resetMomente,markup:window.__markupMomente,show:window.__showMomente};})()`);
    ok(neu.null && neu.titel==='Die Partie 1','Eine andere Story erbt nicht die vorherige Leseposition');
    ok(neu.reset.length===1 && neu.reset[0].wert===0 && neu.reset[0].html.includes('Die Partie 0'),
      'Der Scrollreset erfolgt genau einmal, solange das alte Markup steht');
    ok(neu.markup.length===1 && neu.markup[0].scroll===0,'Neues Markup wird bereits bei Scrollposition null eingesetzt');
    ok(neu.show.length===1 && neu.show[0]===0,'Das Blatt ist beim Sichtbarmachen bereits oben');

    const gleich=await K(`(() => {const nd=document.getElementById('nd');nd.scrollTop=400;
      closeNewsDetail();openNewsDetail('scroll-1');return nd.scrollTop;})()`);
    ok(gleich===0,'Auch dieselbe erneut geöffnete Story beginnt oben');
    const sichtbar=await K(`(() => {const nd=document.getElementById('nd');nd.scrollTop=400;
      openNewsDetail('scroll-0');return nd.scrollTop;})()`);
    ok(sichtbar===0,'Der direkte Wechsel bei offenem Detail beginnt ebenfalls oben');
    ok(await K(`document.getElementById('sheet').scrollTop===321 && !!document.querySelector('#sheet [data-feed-leseposition]')`),
      'Der darunterliegende Feed behält Inhalt und Leseposition');

    await K(`document.getElementById('nd').scrollTop=200;0;`);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    ok(await K(`document.getElementById('nd').scrollTop===200`),
      'Kein verspäteter Reset überschreibt das anschließende Lesen');
    const ungültig=await K(`(() => {const nd=document.getElementById('nd'),html=nd.innerHTML;
      openNewsDetail('nicht-vorhanden');return nd.innerHTML===html && nd.scrollTop===200;})()`);
    ok(ungültig,'Ein unbekannter Verweis verändert die offene Story nicht');

    // Kein Timer des Schließens darf das unmittelbar folgende Detail
    // entfernen. Die reale Übergangszeit wird nur abgewartet, nicht gemessen.
    await K(`closeNewsDetail();openNewsDetail('scroll-1');0;`);
    await page.waitForTimeout(300);
    ok(await K(`document.getElementById('ndBg').classList.contains('show') && document.getElementById('nd').scrollTop===0 && document.querySelector('#nd .nd-title').textContent==='Die Partie 1'`),
      'Sofortiges Wiederöffnen überlebt den vorherigen Schließübergang');
    // Die Tafel zeichnet entweder Gruppen oder die flache Liste. Beide
    // vorbereiten verdoppelte zuvor Zeichen und Textarbeit ohne Nutzen.
    await K(`window.__neuFn=_ndNeu;window.__zeilenArbeit=[];
      _ndNeu=txt=>{if(String(txt).startsWith('Scrolltest-Zeile'))window.__zeilenArbeit.push(txt);return window.__neuFn(txt)};
      window.__tafelScroll={id:'scroll-tafel',title:'Die Tafel',desc:'',dataRef:{type:'sammel',quelle:'tafel',
        teile:Array.from({length:4},(_,i)=>({typ:i===0?'rekord_geholt':'rekord_gesteigert',
          titel:'Der Eintrag '+i,text:'Scrolltest-Zeile '+i,ic:'trophy'}))}};0;`);
    const gross=await K(`(() => {window.__zeilenArbeit=[];const html=_newsDetailMitte(window.__tafelScroll);
      const host=document.createElement('div');host.innerHTML=html;
      return {calls:window.__zeilenArbeit.length,rows:host.querySelectorAll('.nw-zeile').length,
        groups:host.querySelectorAll('.nw-liste').length};})()`);
    ok(gross.calls===4 && gross.rows===4 && gross.groups===2,
      'Eine große Tafel zeichnet jede ihrer vier Zeilen nur einmal in ihrer Gruppe');
    const klein=await K(`(() => {window.__zeilenArbeit=[];const s=structuredClone(window.__tafelScroll);s.dataRef.teile.pop();
      const html=_newsDetailMitte(s),host=document.createElement('div');host.innerHTML=html;
      return {calls:window.__zeilenArbeit.length,rows:host.querySelectorAll('.nw-zeile').length,
        groups:host.querySelectorAll('.nw-liste').length};})()`);
    ok(klein.calls===3 && klein.rows===3 && klein.groups===1,
      'Eine kleine Tafel baut keine verworfene Gruppierung neben ihrer sichtbaren Liste');
    await K(`_ndNeu=window.__neuFn;0;`);

    // Eine eigene Bühne ersetzt das schlichte Ergebnisband. Sein Aufbau
    // darf deshalb gar nicht stattfinden, statt bloß unsichtbar zu bleiben.
    await K(`window.__ergebnisFn=_newsBlattErgebnis;window.__ergebnisArbeit=0;
      _newsBlattErgebnis=mid=>{window.__ergebnisArbeit++;return window.__ergebnisFn(mid)};0;`);
    const buehne=await K(`(() => {window.__ergebnisArbeit=0;const s=window.__storiesScroll[0];
      return {gleich:_newsBlattKopf(s)===_ndBuehne(s),calls:window.__ergebnisArbeit};})()`);
    ok(buehne.gleich && buehne.calls===0,'Ein Matchkopf zeichnet nur seine sichtbare Bühne, kein verworfenes Ergebnisband');
    const runde=await K(`(() => {window.__ergebnisArbeit=0;
      const html=_newsBlattKopf({dataRef:{type:'runde',matchId:matches.at(-1).id}});
      return {html,calls:window.__ergebnisArbeit};})()`);
    ok(runde.html==='' && runde.calls===0,'Die Runde ohne Zusatzkopf baut auch kein unsichtbares Ergebnisband');
    const serie=await K(`(() => {window.__ergebnisArbeit=0;_ndBlattJetzt=null;
      const m=matches.at(-1),pid=m.winner==='A'?m.a1:m.b1;
      const s={title:'Eine Serie',dataRef:{type:'win_streak',pid,matchId:m.id,streak:1}};
      const html=_newsBlattKopf(s),x=_ndEigenesBlatt(s);
      return {gleich:!!x && html===x.kopf,calls:window.__ergebnisArbeit};})()`);
    ok(serie.gleich && serie.calls===0,'Die eigene Serienbühne ersetzt das Ergebnisband auch bei einem historischen Match');
    const rueckblick=await K(`(() => {window.__ergebnisArbeit=0;const mid=matches.at(-1).id;
      const html=_newsBlattKopf({dataRef:{type:'season_recap',matchId:mid}});
      return {gleich:html===window.__ergebnisFn(mid),calls:window.__ergebnisArbeit};})()`);
    ok(rueckblick.gleich && rueckblick.calls===1,'Der Saisonrückblick behält sein tatsächlich sichtbares Ergebnisband');
    const rueckfall=await K(`(() => {window.__ergebnisArbeit=0;const mid=matches.at(-1).id;
      const html=_newsBlattKopf({dataRef:{type:'unbekannter_typ',matchId:mid}});
      return {gleich:html===window.__ergebnisFn(mid),calls:window.__ergebnisArbeit};})()`);
    ok(rueckfall.gleich && rueckfall.calls===1,'Ein unbekannter Typ behält den echten Ergebnis-Rückfall');
    await K(`_newsBlattErgebnis=window.__ergebnisFn;0;`);
    await K(`getStoriesCache=window.__storiesFn;closeNewsDetail();closeSheet(true);0;`);
    ok(errors.length===0,'Keine Browserfehler bei Reset, Wechsel und Wiederöffnen');
  }finally{await browser.close();}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
