// Seltene Verleihungen besitzen ihren historischen Rang, nicht den Stand von heute.
// Die kanonischen Badge-Events liefern Zähler und Träger; V2 speichert die Grafik.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Die Verleihungsgrafik wird in Handybreite gemessen.');
  process.exit(2);
}
const {createHarness}=require('../tools/performance.cjs');
let checks=0,fails=0;
const ok=(c,msg)=>{checks++;if(!c)fails++;console.log((c?'  ok  ':'  ✗   ')+msg);};
(async()=>{
  const {browser,page,K,errors}=await createHarness();
  try{
    const ladder=[1,5,10,20,25,50,75,100,125,150,175,200,500,1000];
    for(const n of ladder) ok(await K(`_badgeTakt('rare',${n})`),`Seltene Verleihung ${n} bleibt eine Nachricht`);
    ok(await K(`[2,4,6,19,21,26,49,51,74,76,101,126,151].every(n=>!_badgeTakt('rare',n))`),'Zwischen seltenen Marken entsteht keine zusätzliche Badge-Nachricht');
    ok(await K(`[1,2,3,6,19,151].every(n=>_badgeTakt('legendary',n))`),'Legendäre Vergaben bleiben bei jedem Erreichen eine Nachricht');
    ok(await K(`[5,10,25,50,100].every(n=>_badgeTakt('common',n)) && [1,20,75,125,150].every(n=>!_badgeTakt('common',n))`),'Der bestehende Takt gewöhnlicher Auszeichnungen bleibt unverändert');
    ok(await K(`[1,5,10,25,50,100].every(n=>_badgeTakt('negative',n)) && [20,75,125,150].every(n=>!_badgeTakt('negative',n))`),'Negative Auszeichnungen werden nicht durch die neue Leiter häufiger');
    ok(await K(`typeof _badgeNaechsteMarke==='function' && [0,1,5,10,20,25,50,75,100,125,150,151,1000].map(_badgeNaechsteMarke).join(',')==='1,5,10,20,25,50,75,100,125,150,175,175,1025'`),'Nachrichtentakt und Grafik teilen dieselbe unbegrenzte nächste Marke');

    await K(`window.__fixturePlayers=players;window.__fixtureMatches=matches;
      matches=Array.from({length:160},(_,i)=>({id:'vergabe-'+String(i+1).padStart(3,'0'),
        a1:players[0].id,a2:players[1].id,b1:players[2].id,b2:players[3].id,
        a1_side:'reves',a2_side:'drive',b1_side:'drive',b2_side:'reves',games_a:10,games_b:2,winner:'A',exp_a:.5,
        created_at:new Date(Date.now()-6*86400000+i*120000).toISOString(),deltas:{}}));
      seasons=[];_cache._stories=[];invalidateCache();
      window.__badgeStories=_buildStories();
      window.__wallStories=window.__badgeStories.filter(s=>s.dataRef?.badgeId==='wall_badge'&&s.dataRef.playerId===players[0].id);0;`);
    ok(await K(`window.__wallStories.map(s=>s.dataRef.rang).sort((a,b)=>a-b).join(',')==='1,5,10,20,25,50,75,100,125,150'`),'Der echte Generator speichert alle seltenen Marken und ihren kanonischen Verleihungsrang');
    const first=await K(`_spMedailleDaten({m:matches[0],x:{pid:players[0].id,badgeId:'wall_badge'}})`);
    ok(first.rang===1 && first.traeger.length===1 && !first.wiederholung,'Erste Vergabe behält das historische Trägerfeld');
    const fallback=await K(`_spMedailleDaten({m:matches[4],x:{pid:players[0].id,badgeId:'wall_badge'}})`);
    ok(fallback.rang===5 && fallback.wiederholung && fallback.marken?.join(',')==='1,5,10','Legacy-Ereignis ohne gespeicherten Rang nutzt den historischen Event-Index');
    await K(`window.__w5=window.__wallStories.find(s=>s.dataRef.rang===5);
      window.__v5=_spVisualSnapshot(matches[4],[window.__w5?.dataRef||{type:'badge_unlocked',rarity:'rare',badgeId:'wall_badge',playerId:players[0].id,rang:5}]);
      window.__v5Json=JSON.stringify(window.__v5);
      window.__medalIndex=_spBasis().medaillen;0;`);
    ok(await K(`window.__v5.occasion?.key==='medaille'&&window.__v5.occasion.data.rang===5&&window.__v5.occasion.data.wiederholung===true`),'Neue Match-Snapshots tragen die eigene Wiederholungsgrafik');
    ok(await K(`_spMedailleDaten({m:matches[9],x:{pid:players[0].id,badgeId:'wall_badge',rang:10}});!!window.__medalIndex&&window.__medalIndex===_spBasis().medaillen`),'Historischer Vergabeindex wird je Datenstand wiederverwendet');
    await K(`window.__published={id:'spiel_'+matches[4].id,cat:'highlight',ic:'ball',when:new Date(matches[4].created_at),
      title:'Fünfte Mauer',desc:'In dieser Partie.',prio:62,dataRef:{type:'spiel',matchId:matches[4].id,visual:window.__v5}};
      window.__legacy={name:'Mauer',ic:'brick',klasse:'rare',wer:players[0].id,rang:0,ids:players.map(p=>p.id),traeger:[players[0].id]};
      window.__legacyBefore=_spOccasionBild({key:'medaille',data:window.__legacy});
      window.__renderBefore=_spOccasionBild(window.__v5.occasion);
      window.__future={...matches[159],id:'vergabe-neuer-traeger',a1:players[4].id,created_at:new Date(Date.now()-1000).toISOString()};
      matches=[...matches,window.__future];invalidateCache();_cache._stories=[window.__published];0;`);
    ok(await K(`JSON.stringify(_spVisualSnapshot(matches[4],[]))===window.__v5Json`),'Spätere Vergaben verändern den publizierten Score-/Anlass-Snapshot nicht');
    ok(await K(`_spOccasionBild(window.__v5.occasion)===window.__renderBefore`),'Die Wiederholungszeichnung bleibt nach späteren Matches identisch');
    ok(await K(`_spOccasionBild({key:'medaille',data:window.__legacy})===window.__legacyBefore && !/sp-md-wieder/.test(window.__legacyBefore)`),'Alte V2-Medaillendaten ohne Wiederholungsfeld bleiben in ihrer bisherigen Darstellung');
    ok(await K(`_spMedailleDaten({m:matches[4],x:{pid:players[0].id,badgeId:'wall_badge'}}).traeger.length===1
      && _spMedailleDaten({m:window.__future,x:{pid:players[4].id,badgeId:'wall_badge'}}).traeger.length===2`),'Historischer Trägerstand nimmt keinen späteren neuen Träger vorweg');
    await K(`_spBasisMemo.delete(matches);_spFormBasisMemo.delete(matches);0;`);
    ok(await K(`JSON.stringify(_spVisualSnapshot(matches[4],[]))===window.__v5Json`),'Kalter Neuaufbau liefert denselben publizierten Snapshot');
    ok(await K(`_spAnlassSnapshot(matches[4],[{type:'badge_unlocked',rarity:'rare',playerId:players[0].id,badgeId:'nerves_of_steel',rang:5}],'feld')?.key==='medaille'`),'Auch eine runde Wiederholung einer Ergebnis-Auszeichnung bekommt eine unabhängige Medaille');
    ok(await K(`_spAnlassSnapshot(matches[4],[{type:'badge_unlocked',rarity:'rare',playerId:players[0].id,badgeId:'nerves_of_steel',rang:1}],'feld')?.key!=='medaille'`),'Erste reine Ergebnis-Auszeichnung dupliziert die Ergebnisgrafik weiterhin nicht');
    await K(`window.__bundle=_consolidateStories([window.__published,window.__w5||{id:'badge_test',when:window.__published.when,cat:'badge',ic:'brick',prio:62,
      title:'Alex: Mauer',desc:'Mauer zum fünften Mal.',dataRef:{type:'badge_unlocked',matchId:matches[4].id,badgeId:'wall_badge',playerId:players[0].id,rarity:'rare',rang:5}}]);0;`);
    ok(await K(`window.__bundle.length===1 && /sp-md-wieder/.test(_spBild(window.__bundle[0]).fuss)`),'Seltene Marke bleibt im gemeinsamen Match-Bündel mit genau einer Anlassgrafik');
    ok(await K(`!!_spBild(window.__bundle[0]).fuss && /sp-md-wieder/.test(_ndBuehne(window.__bundle[0])) && _ndBuehne(window.__bundle[0]).includes(_spBild(window.__bundle[0]).fuss)`),'Das Story-Detailsheet benutzt dieselbe eingefrorene Wiederholungszeichnung');

    await page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [288,360]){
      await page.setViewportSize({width,height:844});
      for(const n of [5,20,75,150,10000]){
        await K(`window.__drawData=_spMedailleDaten({m:matches[4],x:{pid:players[0].id,badgeId:'wall_badge',rang:${n}}});
          document.getElementById('main').innerHTML='<div class="nf-card" style="content-visibility:visible">'+_spMedailleBild({...window.__drawData,
            name:'Nerven aus Stahl',wiederholung:true})+'</div>';0;`);
        const layout=await page.evaluate(()=>{
          const box=document.querySelector('.sp-md'), r=box.getBoundingClientRect();
          return {overflow:box.scrollWidth>box.clientWidth+1||r.right>innerWidth,
            next:box.querySelector('.sp-md-r > small')?.textContent||'',
            count:box.querySelector('.sp-md-zahl')?.textContent,
            fresh:box.textContent.includes('neu dabei'),negative:box.textContent.includes('NaN')};
        });
        const naechste=await K(`_badgeNaechsteMarke(${n})`);
        ok(!layout.overflow && layout.next.includes('bis zur '+naechste.toLocaleString('de-DE')+'.') && layout.count?.includes(n.toLocaleString('de-DE')) && !layout.fresh && !layout.negative,
          `${n}. Vergabe bei ${width} px: Zahl und nächste Marke sichtbar, keine falsche Erstvergabe und kein Überlauf`);
      }
    }
    ok(errors.length===0,'Keine Browserfehler bei Verleihung, Snapshot und gemeinsamer Matchkarte');
  }finally{await browser.close();}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  process.exitCode=fails?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
