// Eingaben bleiben synchron; teure Vorschau-/Sucharbeit wird je Bild gebündelt.
// Verhaltens- und Arbeitszusicherungen statt geräteabhängiger Zeitgrenzen.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Fokus, Tastatur und Eingabe-Bündelung brauchen einen Browser.');
  process.exit(2);
}
const {createHarness}=require('../tools/performance.cjs');
let checks=0,fails=0;
const ok=(c,msg)=>{checks++;if(!c)fails++;console.log((c?'  ok  ':'  ✗   ')+msg);};
(async()=>{
  // Die Seite des Gerüsts darf keinen echten Speicher öffnen; die Marke des
  // Nachschreibens [§3.1c] braucht einen, also einen im Speicher der Seite.
  const {browser,page,K,errors}=await createHarness({vorApp:`(()=>{const d={};
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>k in d?d[k]:null,
      setItem:(k,v)=>{d[k]=String(v)},removeItem:k=>{delete d[k]},clear:()=>{for(const k in d)delete d[k]}}});})();`});
  try{
    await K(`window.__computeMatch=computeMatch;window.__inputCalls=0;
      computeMatch=(...a)=>{window.__inputCalls++;return window.__computeMatch(...a)};
      window.__draft=()=>{M={A1:players[0].id,A2:players[1].id,B1:players[2].id,B2:players[3].id,pA1:'drive',pA2:'reves',pB1:'drive',pB2:'reves',sa:10,sb:4};tab='match';render()};
      window.__draft();window.__inputCalls=0;invalidateCache();updatePreview();0;`);
    ok(await K('__inputCalls===1'),'Gültige Vorschau nutzt eine kanonische Match-Rechnung für Chance und Deltas');
    await K('window.__inputCalls=0;window.__chance=document.querySelector(".m-chance");updatePreview();0;');
    ok(await K('__inputCalls===0'),'Unveränderte Vorschau rechnet nicht erneut');
    await K('M.sb=5;updatePreview();0;');
    ok(await K('__inputCalls===1 && document.querySelector(".m-chance")===window.__chance'),'Scorewechsel rechnet nur den Stand und behält das unveränderte Chancen-DOM');
    ok(await K(`typeof _matchInputResult==='function' && JSON.stringify(_matchInputResult())===JSON.stringify(window.__computeMatch(...Object.values(teamsFromM()),'A',10,5))`),'Memo-Ergebnis entspricht exakt der kanonischen Engine');
    await K('window.__inputCalls=0;invalidateCache();updatePreview();0;');
    ok(await K('__inputCalls===1'),'Datenversion invalidiert die letzte Eingabe-Rechnung');
    await K('window.__inputCalls=0;cfg={...cfg,k_factor:cfg.k_factor+1};updatePreview();0;');
    ok(await K('__inputCalls===1'),'Konfigurationsreferenz invalidiert die letzte Eingabe-Rechnung');
    await K('window.__inputCalls=0;players=[...players];updatePreview();0;');
    ok(await K('__inputCalls===1'),'Spielerreferenz invalidiert die letzte Eingabe-Rechnung');
    await K('window.__inputCalls=0;matches=[...matches];updatePreview();0;');
    ok(await K('__inputCalls===1'),'Matchreferenz invalidiert die letzte Eingabe-Rechnung');
    await K('window.__inputCalls=0;window.__perfJetzt=new Date(2026,8,1,12).getTime();updatePreview();0;');
    ok(await K('__inputCalls===1'),'Monatswechsel invalidiert die letzte Eingabe-Rechnung');

    await K(`window.__raf=requestAnimationFrame;window.__frames=[];
      window.requestAnimationFrame=fn=>{window.__frames.push(fn);return window.__frames.length};
      window.cancelAnimationFrame=()=>{};window.__draft();window.__inputCalls=0;
      document.querySelector('[data-step="sb,1"]').click();
      document.querySelector('[data-step="sb,1"]').click();
      document.querySelector('[data-step="sb,1"]').click();0;`);
    ok(await K('M.sb===7 && document.getElementById("svB").textContent==="7"'),'Drei schnelle Score-Tipps sind sofort im Zustand und im sichtbaren Stand');
    ok(await K('__inputCalls===0 && window.__frames.length===1'),'Schnelle Score-Tipps planen genau eine Vorschau statt drei Rechnungen');
    await K('window.__frames.shift()?.();0;');
    ok(await K('__inputCalls===1 && document.getElementById("previewSlot").textContent.includes("10:7")'),'Das nächste Bild zeigt den letzten Stand mit einer Rechnung');
    await K(`document.querySelector('[data-step="sb,1"]').click();window.__alt=window.__frames.shift();
      document.getElementById('clearM').click();window.__inputCalls=0;window.__alt?.();0;`);
    ok(await K('__inputCalls===0 && document.getElementById("previewSlot").textContent===""'),'Alte Vorschau verändert kein nach Leeren neu gebautes Formular');

    await K(`window.__draft();document.getElementById('svB').click();
      window.__score=document.querySelector('.sval-input');window.__score.value='8';
      window.__score.dispatchEvent(new Event('input',{bubbles:true}));0;`);
    ok(await K('M.sb===8 && !document.getElementById("saveM").disabled'),'Direkte Toreingabe aktualisiert Zustand und Speichern ohne Blur');
    await K(`window.__score.value='10';window.__score.dispatchEvent(new Event('input',{bubbles:true}));0;`);
    ok(await K('M.sb===10 && document.getElementById("saveM").disabled'),'Unentschieden sperrt Speichern bereits während der Eingabe');
    await K(`window.__score.value='99';window.__score.dispatchEvent(new Event('input',{bubbles:true}));0;`);
    ok(await K('M.sb===10 && window.__score.value==="10"'),'Direkte Toreingabe bleibt innerhalb derselben 0-bis-10-Grenze');
    await K(`window.__score.value='';window.__score.dispatchEvent(new Event('input',{bubbles:true}));0;`);
    ok(await K('M.sb===0 && window.__score.value===""'),'Leere Zahl ist im Zustand null ohne den laufenden Tipp zu überschreiben');
    await K('window.__score.blur();window.__frames=[];0;');

    await K(`M.A1='';render();window.__combo=document.querySelector('[data-combo="A1"]');
      window.__combo.focus();window.__combo.dispatchEvent(new CompositionEvent('compositionstart'));
      window.__combo.value='Al';window.__combo.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
      window.__combo.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,isComposing:true}));0;`);
    ok(await K('M.A1==="" && document.activeElement===window.__combo'),'IME-Enter wählt keinen Spieler und verliert keinen Fokus');
    await K(`window.__combo.dispatchEvent(new CompositionEvent('compositionend'));
      window.__down=new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});
      window.__combo.dispatchEvent(window.__down);0;`);
    ok(await K(`window.__down.defaultPrevented && !!window.__combo.getAttribute('aria-activedescendant')`),'Pfeiltaste wählt eine erreichbare Option ohne den Cursor zu verschieben');
    await K(`window.__enter=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});window.__combo.dispatchEvent(window.__enter);0;`);
    ok(await K('M.A1===players[0].id && window.__enter.defaultPrevented'),'Enter übernimmt den fokussierten Spieler genau einmal');
    await K(`window.__combo.onfocus();window.__combo.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));0;`);
    ok(await K(`window.__combo.getAttribute('aria-expanded')==='false' && !document.querySelector('[data-combolist="A1"]').classList.contains('show')`),'Escape schließt die Vorschläge mit korrektem ARIA-Zustand');
    await K(`window.__combo.blur();window.__combo.focus();0;`);
    await page.waitForTimeout(210);
    ok(await K(`document.querySelector('[data-combolist="A1"]').classList.contains('show')`),'Alter Blur-Timer schließt keine sofort wieder fokussierte Vorschlagsliste');
    await K(`window.__combo.onfocus();window.__pick=document.querySelector('[data-combolist="A1"] [data-pick]').dataset.pick;0;`);
    await page.locator('[data-combolist="A1"] [data-pick]').first().click();
    ok(await K('M.A1===window.__pick && document.activeElement===window.__combo'),'Pointer-Auswahl übernimmt den Spieler ohne die Eingabetastatur durch Fokusverlust zu schließen');
    // Wer schon in der Partie steht, ist kein Tippfehler: dort stand
    // „Kein Treffer", als gäbe es den Namen nicht.
    const vergeben=await K(`(()=>{const b2=document.querySelector('[data-combo="B2"]'),n=pname(M.A1);
      b2.focus();b2.value=n;b2.dispatchEvent(new InputEvent('input',{bubbles:true}));
      const t=document.querySelector('[data-combolist="B2"]').textContent.trim();
      b2.value='Zzz';b2.dispatchEvent(new InputEvent('input',{bubbles:true}));
      const u=document.querySelector('[data-combolist="B2"]').textContent.trim();
      b2.value='';b2.dispatchEvent(new InputEvent('input',{bubbles:true}));b2.blur();
      return {t,u,n};})()`);
    ok(vergeben.t===vergeben.n+' steht schon in dieser Partie' && vergeben.u==='Kein Treffer',
      'Die Spielersuche sagt, wenn ein Name schon in der Partie steht, und nur sonst „Kein Treffer": '+JSON.stringify(vergeben));

    await K(`window.requestAnimationFrame=window.__raf;tab='teams';teamSearch='';render();
      window.__search=document.getElementById('teamSearch');window.__search.focus();
      window.__search.value='Leon';window.__search.setSelectionRange(2,2);
      window.__search.dispatchEvent(new Event('input',{bubbles:true}));0;`);
    await page.waitForTimeout(360);
    ok(await K('document.getElementById("teamSearch")===window.__search && document.activeElement===window.__search && window.__search.selectionStart===2'),'Teamsuche behält Eingabeknoten, Fokus und Cursor beim Aktualisieren');
    ok(await K(`[...document.querySelectorAll('.tm-name')].every(x=>x.textContent.includes('Leon')) && document.querySelectorAll('.tm-name').length>0`),'Teamsuche aktualisiert passende Duos aus der gemeinsamen Vorlage');
    await K(`window.requestAnimationFrame=fn=>{window.__frames.push(fn);return window.__frames.length};window.__frames=[];
      window.__search.dispatchEvent(new CompositionEvent('compositionstart'));window.__search.value='Martin';
      window.__search.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));0;`);
    ok(await K('window.__frames.length===0'),'Laufende IME-Komposition wird nicht durch Ergebnisarbeit unterbrochen');
    await K(`window.__search.dispatchEvent(new CompositionEvent('compositionend'));0;`);
    ok(await K('window.__frames.length===1'),'Kompositionsende plant die letzte Suche einmal');
    await K(`tab='match';render();window.__frames.shift()?.();0;`);
    ok(await K('document.getElementById("saveM") && !document.getElementById("teamSearch")'),'Veraltete Suche überschreibt nach Tabwechsel keine andere Ansicht');

    await K(`window.requestAnimationFrame=window.__raf;window.__draft();window.__insertions=0;
      window.__from=sb.from;sb.from=table=>table==='matches'?{insert(row){window.__insertions++;window.__row=row;
        return {select(){return {single(){return new Promise(resolve=>window.__saveResolve=resolve)}}}}}}:window.__from(table);
      window.__saveFirst=doSaveMatch();window.__saveSecond=doSaveMatch();0;`);
    ok(await K('window.__insertions===1 && document.getElementById("saveM").disabled'),'Doppeltes Speichern schreibt nur eine Partie und sperrt den Knopf sofort');
    ok(await K('document.getElementById("saveM").getAttribute("aria-busy")==="true"'),'Speichern zeigt den laufenden Vorgang unmittelbar an');
    await K(`window.__saveResolve({error:{message:'Testfehler'}});0;`);
    await page.waitForTimeout(10);
    ok(await K('!document.getElementById("saveM").disabled && M.sa===10 && M.sb===4 && !doSaveMatch._busy'),'Fehlgeschlagenes Speichern erhält die Eingabe und gibt einen neuen Versuch frei');
    await K(`window.__persist=persistNewMatch;window.__earned=badgesEarnedInMatch;window.__load=loadAll;
      persistNewMatch=async()=>{};badgesEarnedInMatch=()=>[];loadAll=async()=>{};
      window.__saveFirst=doSaveMatch();M.sb=6;tab='teams';render();
      window.__saveResolve({data:{...window.__row,id:'gespeicherter-test',created_at:new Date().toISOString()}});0;`);
    await K('window.__saveFirst.catch(()=>null)');
    ok(await K(`matches.find(m=>m.id==='gespeicherter-test').games_b===4 && M.sb===6`),'Späte Speicherantwort behält den neuen Entwurf und speichert den ursprünglichen Stand');
    ok(await K('tab==="teams" && !!document.getElementById("teamSearch")'),'Späte Speicherantwort holt den Nutzer nicht in einen verlassenen Reiter zurück');
    // Nach dem Insert steht die Partie; scheitert danach das Nachschreiben,
    // bleibt sie stehen, der Entwurf ist leer, und ein Hinweis sagt es [§3.1c].
    await K(`window.__draft();persistNewMatch=async()=>{throw new Error('erwarteter Folgefehler')};
      window.__saveFirst=doSaveMatch();window.__saveResolve({data:{...window.__row,id:'folgefehler-test',created_at:new Date().toISOString()}});0;`);
    await K('window.__saveFirst.catch(()=>null)');
    await K('_schreibKette');
    ok(await K(`matches.some(m=>m.id==='folgefehler-test') && M.A1==='' && tab==='ranking' && !doSaveMatch._busy
      && /Nicht alles gespeichert/.test(document.querySelector('.toast b').textContent)`),'Ein Fehler beim Nachschreiben lässt die Partie stehen, leert den Entwurf und sagt es');
    await K(`persistNewMatch=window.__persist;badgesEarnedInMatch=window.__earned;loadAll=window.__load;_schreibFehler=false;0;`);

    // ── Nach dem Insert wartet nichts mehr auf das Netz [§3.1c] ──────────
    // Eine Attrappe, deren Insert und Delete sofort antworten und deren
    // übrige Anfragen hängen, bis der Test sie freigibt. Vorher stand der
    // Knopf, bis Elo, Positionsstärke und das Neuladen der Liga durch waren,
    // und Löschen und Bearbeiten schrieben die Deltas aller Partien.
    // Wie in der Datenbank: exp_a aus derselben Rechnung, als real gespeichert.
    await K(`(()=>{const h=new Map(simulateEloWithSliders(matches).history.map(x=>[x.matchId,x]));
      matches.forEach(m=>{const e=h.get(m.id);if(e){m.exp_a=Math.fround(e.expA);m.deltas={...e.deltas};}});invalidateCache();
      try{localStorage.removeItem(NACHRECHNEN_MARKE)}catch(e){}
      window.__haengt=[];window.__anfr=[];window.__frei=false;
      const tabelle=t=>({players,matches,seasons,config:cfg})[t];
      sb.from=table=>{const st={table,op:'select',single:false};const b=new Proxy({},{get(_,p){
        if(p==='then') return (ok,no)=>{window.__anfr.push(st.table+':'+st.op);
          if(st.op==='update'&&st.table==='matches') window.__ids.push(st.id);
          const antwort=()=>{let data=null;
            if(st.op==='insert') data={...st.row,id:'sofort-'+window.__anfr.length,created_at:new Date().toISOString()};
            else if(st.op==='select'){const t=tabelle(st.table);data=t?JSON.parse(JSON.stringify(t)):[];if(st.single&&Array.isArray(data))data=data[0]||null;}
            return {data,error:null};};
          if(st.op==='insert'||st.op==='delete'||window.__frei) return Promise.resolve(antwort()).then(ok,no);
          return new Promise(r=>window.__haengt.push(()=>r(antwort()))).then(ok,no);};
        if(['insert','update','delete','upsert'].includes(p)) return row=>{st.op=p;st.row=row;return b};
        if(p==='single'||p==='maybeSingle') return ()=>{st.single=true;return b};
        if(p==='eq') return (k,v)=>{st.id=v;return b};
        return ()=>b;}});return b;};
      window.__ids=[];
      window.__frist=p=>Promise.race([p.then(()=>'fertig'),new Promise(r=>setTimeout(()=>r('wartet'),3000))]);
      window.__loslassen=()=>{window.__frei=true;window.__haengt.splice(0).forEach(f=>f());};
      window.__draft();window.__save=doSaveMatch();})();0;`);
    ok(await K(`window.__frist(window.__save)`)==='fertig' && await K(`tab==='ranking' && !doSaveMatch._busy
      && matches.some(m=>String(m.id).startsWith('sofort-')) && window.__haengt.length>0`),
      'Speichern ist fertig und zeigt die Rangliste, während das Nachschreiben noch läuft');
    ok(await K(`!window.__anfr.some(a=>/^(players|matches):select$/.test(a))`),'Der Abruf der Liga wartet, bis geschrieben ist, was eben gespeichert wurde');
    await K(`window.__loslassen();_schreibKette`);
    await K(`window.__frei=false;window.__anfr=[];window.__del=matches[matches.length-1].id;
      window.__p=partieLoeschen(window.__del);0;`);
    ok(await K(`window.__frist(window.__p)`)==='fertig' && await K(`!matches.some(m=>m.id===window.__del)
      && /Gelöscht/.test(document.querySelector('.toast b').textContent) && localStorage.getItem(NACHRECHNEN_MARKE)==='1'`),
      'Rückgängig zeigt die Liga ohne die Partie, bevor nachgeschrieben ist, und merkt sich das Nachschreiben');
    await K(`window.__loslassen();_schreibKette`);
    ok(await K(`window.__anfr.filter(a=>a==='matches:update').length===0 && localStorage.getItem(NACHRECHNEN_MARKE)===null`),
      'Löschen der letzten Partie schreibt keine Delta einer anderen Partie, danach ist nichts mehr nachzuholen');
    await K(`window.__frei=false;window.__anfr=[];window.__ids=[];window.__mid=matches[matches.length-40].id;showEditMatch(window.__mid);
      E.sa=E.sa===10?9:10;if(E.sa===E.sb)E.sb=E.sa-2;window.__neuSa=E.sa;
      window.__p=document.getElementById('saveEdit').onclick();0;`);
    await K(`(async()=>{for(let i=0;i<100&&window.__haengt.length===0;i++) await new Promise(r=>setTimeout(r,10));
      const erste=window.__haengt.shift(); window.__frei=false; erste&&erste();})()`);
    ok(await K(`window.__frist(window.__p)`)==='fertig' && await K(`matches.find(m=>m.id===window.__mid).games_a===window.__neuSa
      && /Gespeichert/.test(document.querySelector('.toast b').textContent)`),'Bearbeiten zeigt die geänderte Partie, bevor nachgeschrieben ist');
    await K(`window.__loslassen();_schreibKette`);
    // Eine geänderte Partie verschiebt die Elo jeder späteren desselben
    // Monats; geschrieben wird genau das, keine Partie davor und keine eines
    // anderen Monats. Vorher waren es die Deltas aller Partien der Liga.
    ok(await K(`(()=>{const e=matches.find(m=>m.id===window.__mid),sid=seasonOf(e.created_at).id;
      const ok=new Set(matches.filter(m=>m.created_at>=e.created_at&&seasonOf(m.created_at).id===sid).map(m=>m.id));
      const ids=new Set(window.__ids);
      return ids.size>1 && [...ids].every(id=>ok.has(id));})()`),
      'Bearbeiten schreibt nur die Deltas der Partie und der späteren desselben Monats');
    // Das Nachholen: eine Delta, die nie in der Datenbank ankam, wird beim
    // nächsten Laden geschrieben, und nur sie — mit der Uhr der Liga [§C42].
    await K(`window.__frei=true;window.__anfr=[];window.__lsa=ligaSchreibtAbgeleitet;ligaSchreibtAbgeleitet=()=>true;
      const m=matches[matches.length-5];m.deltas={...m.deltas};const k=Object.keys(m.deltas)[0];m.deltas[k]+=3;
      localStorage.setItem(NACHRECHNEN_MARKE,'1');_nachholen();0;`);
    await K('_schreibKette');
    ok(await K(`window.__anfr.filter(a=>a==='matches:update').length===1 && localStorage.getItem(NACHRECHNEN_MARKE)===null`),
      'Das Nachholen schreibt genau die Partie, die abweicht, und löscht die Marke');
    await K(`ligaSchreibtAbgeleitet=window.__lsa;0;`);

    await K(`window.__lnr=ligaNeuRechnen;window.__rs=rechnungSchreiben;ligaNeuRechnen=()=>({geaendert:[]});rechnungSchreiben=async()=>{};loadAll=async()=>{};
      sb.from=window.__from;showEditMatch(matches[matches.length-1].id);
      E.sa=10;document.getElementById('esvA').textContent='10';document.querySelector('[data-estep="sa,1"]').click();0;`);
    ok(await K('E.sa===10 && document.getElementById("esvA").textContent==="10"'),'Bearbeitungs-Score nutzt dieselbe obere Grenze wie die neue Eingabe');
    await K(`window.__editWrites=0;window.__editResolves=[];sb.from=table=>table==='matches'?{update(row){window.__editWrites++;window.__editRow=row;
      return {eq(){return new Promise(resolve=>{window.__editResolve=resolve;window.__editResolves.push(resolve)})}}}}:window.__from(table);
      window.__editClick=document.getElementById('saveEdit').onclick;window.__editFirst=window.__editClick();window.__editClick();0;`);
    ok(await K('window.__editWrites===1 && document.getElementById("saveEdit").disabled'),'Doppeltipp auf Bearbeitung schreibt nur einmal und sperrt sofort');
    await K(`while(window.__editResolves.length) window.__editResolves.shift()({error:{message:'erwarteter Editfehler'}});0;`);
    await K('window.__editFirst');
    ok(await K('!document.getElementById("saveEdit").disabled && document.getElementById("sheet").classList.contains("show")'),'Fehlgeschlagene Bearbeitung bleibt offen und kann erneut gespeichert werden');
    await K(`ligaNeuRechnen=list=>{window.__editUpdated=list.find(m=>m.id===E.id);return {geaendert:[]}};
      window.__editFirst=window.__editClick();document.querySelector('[data-estep="sb,1"]').click();0;`);
    ok(await K('document.getElementById("saveEdit").disabled'),'Bearbeitung bleibt auch bei weiteren Eingaben während des Speicherns gesperrt');
    await K('window.__editResolve({});0;');
    await K('window.__editFirst');
    ok(await K('window.__editUpdated.games_b===4 && E.sb===5 && document.getElementById("sheet").classList.contains("show")'),'Späte Editantwort berechnet den ursprünglichen Stand und erhält einen inzwischen geänderten Entwurf');
    await K('ligaNeuRechnen=window.__lnr;rechnungSchreiben=window.__rs;loadAll=window.__load;0;');
    await K('sb.from=window.__from;0;');
    await K(`window.__draft();openSheet('<select data-pos="A1"><option value="reves" selected>Andere Rolle im Blatt</option></select>');readM();0;`);
    ok(await K('M.pA1==="drive"'),'Match-Eingabe liest nur ihr eigenes Formular und keine gleich benannten Blattfelder');
    await K(`openSheet('<button data-detail="'+players[0].id+'" id="sheetOwnClick">Eigener Blatt-Link</button>');
      window.__sheetHandler=()=>{};document.getElementById('sheetOwnClick').onclick=window.__sheetHandler;
      tab='ranking';render();0;`);
    ok(await K('document.getElementById("sheetOwnClick").onclick===window.__sheetHandler'),'Neuzeichnen der Hauptansicht bindet keine Links eines offenen Blatts um');
    ok(errors.length===0,'Keine Browserfehler während der Eingabefolge');
  }finally{await browser.close()}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
