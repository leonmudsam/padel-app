// Mobile Blattnavigation: keine unnötigen Layout-Zwischenstände und keine
// verspätete Animation, die ein inzwischen neu geöffnetes Blatt verändert.
// Geprüft werden Arbeit und Verhalten, keine geräteabhängigen Zeitgrenzen.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Scrollposition und Blattnavigation brauchen einen Browser.');
  process.exit(2);
}
const {createHarness}=require('../tools/performance.cjs');
let checks=0,fails=0;
const ok=(c,msg)=>{checks++;if(!c)fails++;console.log((c?'  ok  ':'  ✗   ')+msg);};
(async()=>{
  const {browser,page,K,errors}=await createHarness();
  try{
    // Den echten Setter beobachten statt eine künstliche Zeitgrenze setzen:
    // das neue Markup darf beim Scrollreset noch nicht im DOM stehen.
    await page.evaluate(()=>{
      const d=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop');
      window.__scrollReset=[];
      Object.defineProperty(Element.prototype,'scrollTop',{...d,set(v){
        if(this.id==='sheet') window.__scrollReset.push(this.innerHTML);
        return d.set.call(this,v);
      }});
    });
    const reset=await K(`(() => {
      openSheet('<div data-alt style="height:3000px">Altes Blatt</div>');
      const sh=document.getElementById('sheet');sh.scrollTop=400;
      const n=window.__scrollReset.length;
      openSheet('<div data-neu style="height:3000px">Neues Blatt</div>');
      return {vor:window.__scrollReset.slice(n).every(x=>!x.includes('data-neu')),
        null:sh.scrollTop===0,neu:!!sh.querySelector('[data-neu]')};
    })()`);
    ok(reset.vor,'Scrollreset erfolgt vor dem Einsetzen des neuen Markups');
    ok(reset.null && reset.neu,'Gleich langes neues Blatt beginnt oben');
    for(const [vorher,nachher] of [[3000,80],[80,3000],[5000,5000]]){
      const r=await K(`(() => {
        openSheet('<div style="height:${vorher}px">Vorher</div>');
        const sh=document.getElementById('sheet');sh.scrollTop=600;
        openSheet('<div data-laenge="${nachher}" style="height:${nachher}px">Nachher</div>');
        return sh.scrollTop===0 && !!sh.querySelector('[data-laenge="${nachher}"]');
      })()`);
      ok(r,'Neuer Inhalt startet bei null: '+vorher+' → '+nachher+' px');
    }
    // Übergänge deterministisch auslösen: separate Prüfung von Ende, nächstem
    // Bild und Abschluss. Kein Browser-Timing entscheidet über das Ergebnis.
    await K(`window.__afterTransition=_afterTransition;window.__raf=requestAnimationFrame;
      window.__uebergaenge=[];window.__bilder=[];
      _afterTransition=(el,p,ms,fn)=>window.__uebergaenge.push(fn);
      window.requestAnimationFrame=fn=>{window.__bilder.push(fn);return 0};
      closeSheet(true);window.__uebergaenge=[];
      window.__eltern=()=>{_sheetSetReopen(window.__eltern);openSheet('<div data-eltern style="height:3000px">Eltern</div>')};
      window.__kind=()=>{_sheetSetReopen(window.__kind);openSheet('<div data-kind style="height:3000px">Kind</div>')};
      window.__eltern();document.getElementById('sheet').scrollTop=288;
      sheetNav(window.__kind);0;`);
    ok(await K('_sheetStack.length===1 && _sheetStack[0].scroll===288'),'Vorwärtsnavigation merkt die Eltern-Scrollposition');
    await K('window.__uebergaenge.shift()();window.__bilder.shift()();0;');
    ok(await K('!!document.querySelector("#sheet [data-kind]") && document.getElementById("sheet").scrollTop===0'),'Kindblatt beginnt oben');
    await K('window.__uebergaenge.shift()();closeSheet();window.__uebergaenge.shift()();window.__bilder.shift()();0;');
    ok(await K('!!document.querySelector("#sheet [data-eltern]") && document.getElementById("sheet").scrollTop===288 && _sheetStack.length===0'),'Zurück stellt Elterninhalt und Scrollposition wieder her');
    await K('window.__uebergaenge.shift()();0;');

    const spaet=await K(`(() => {
      _animateSheetSwap(()=>openSheet('<p data-veraltet>Veralteter Übergang</p>'));
      const fertig=window.__uebergaenge.shift();
      openSheet('<p data-frisch>Frisch geöffnet</p>');fertig();
      while(window.__bilder.length) window.__bilder.shift()();
      while(window.__uebergaenge.length) window.__uebergaenge.shift()();
      return !!document.querySelector('#sheet [data-frisch]');
    })()`);
    ok(spaet,'Veraltetes Übergangsende ersetzt kein frisch geöffnetes Blatt');
    const bild=await K(`(() => {
      _animateSheetSwap(()=>openSheet('<p data-veraltet>Veraltetes Bild</p>'));
      window.__uebergaenge.shift()();
      openSheet('<p data-frisch>Frisch vor dem nächsten Bild</p>');
      while(window.__bilder.length) window.__bilder.shift()();
      while(window.__uebergaenge.length) window.__uebergaenge.shift()();
      return !!document.querySelector('#sheet [data-frisch]');
    })()`);
    ok(bild,'Veraltetes geplantes Bild ersetzt kein frisch geöffnetes Blatt');
    const zu=await K(`(() => {
      _animateSheetSwap(()=>openSheet('<p data-veraltet>Nach dem Schließen</p>'));
      const fertig=window.__uebergaenge.shift();closeSheet(true);fertig();
      while(window.__bilder.length) window.__bilder.shift()();
      while(window.__uebergaenge.length) window.__uebergaenge.shift()();
      return !document.getElementById('sheet').classList.contains('show');
    })()`);
    ok(zu,'Ein geschlossenes Blatt wird von einem alten Übergang nicht wieder geöffnet');
    const ende=await K(`(() => {
      openSheet('<p>Start</p>');_animateSheetSwap(()=>openSheet('<p>Gewechseltes Blatt</p>'));
      window.__uebergaenge.shift()();window.__bilder.shift()();
      const fertig=window.__uebergaenge.shift();openSheet('<p data-frisch>Neuer Zustand</p>');
      const sh=document.getElementById('sheet');sh.style.transition='transform 1s linear';
      sh.style.transform='translateY(11px)';fertig();
      return sh.style.transition==='transform 1s linear' && sh.style.transform==='translateY(11px)';
    })()`);
    ok(ende,'Alter Aufwärtsabschluss verändert keine neue Animation');
    const wisch=await K(`(() => {
      openSheet('<p>Wischstart</p>');
      document.getElementById('sheetGrab').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientY:0}));
      window.dispatchEvent(new MouseEvent('mousemove',{clientY:240}));
      window.dispatchEvent(new MouseEvent('mouseup',{clientY:240}));
      const fertig=window.__uebergaenge.shift();openSheet('<p data-frisch>Nach altem Wisch</p>');
      const sh=document.getElementById('sheet');sh.style.transition='transform 1s linear';
      document.getElementById('sheetBg').style.transition='opacity 1s linear';fertig();
      return !!sh.querySelector('[data-frisch]') && sh.style.transition==='transform 1s linear'
        && document.getElementById('sheetBg').style.transition==='opacity 1s linear';
    })()`);
    ok(wisch,'Alter Wischabschluss schließt oder verändert kein neu geöffnetes Blatt');
    await K(`_afterTransition=window.__afterTransition;window.requestAnimationFrame=window.__raf;
      openSheet('<p>Vor dem echten Schließen</p>');closeSheet(true);
      openSheet('<p data-frisch>Während des echten Schließens</p>');0;`);
    await page.waitForTimeout(450);
    ok(await K('!!document.querySelector("#sheet [data-frisch]")'),'Auch ein echtes verzögertes Leeren lässt frischen Inhalt bestehen');
    await K(`window.__hauptKlick=()=>{};
      document.getElementById('main').innerHTML='<button data-team="a|b" id="hauptTeam">Hauptansicht</button>';
      document.getElementById('hauptTeam').onclick=window.__hauptKlick;
      showPlayer(players.find(p=>p.name==='Leon').id);0;`);
    ok(await K('document.getElementById("hauptTeam").onclick===window.__hauptKlick'),'Profil bindet keine Knöpfe in der Hauptansicht neu');
    ok(await K(`!!document.querySelector('#sheet .pp-player')`),'Nur das Spielerprofil trägt die Layout-Optimierung');
    const cv=await page.evaluate(()=>{
      const sections=[...document.querySelectorAll('#sheet .pp-player>.pp-sec')];
      const cs=sections.map(s=>getComputedStyle(s));
      return {da:sections.length>5,auto:cs.every(s=>s.contentVisibility==='auto'),
        rand:cs.every(s=>parseFloat(s.overflowClipMargin)>=20),
        kopf:getComputedStyle(document.querySelector('#sheet .pp-header')).contentVisibility==='visible'};
    });
    ok(cv.da && cv.auto && cv.rand,'Profilabschnitte werden bedarfsweise mit Platz für grafische Überhänge gezeichnet');
    ok(cv.kopf,'Großes Wappen und Profilkopf werden nicht enthalten oder abgeschnitten');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForTimeout(800);
    const sections=page.locator('#sheet .pp-player>.pp-sec');
    let sichtbar=true,breite=true;
    for(let i=0;i<await sections.count();i++){
      await sections.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(40);
      const r=await sections.nth(i).evaluate(el=>{
        const sh=document.getElementById('sheet'),r=el.getBoundingClientRect(),s=sh.getBoundingClientRect();
        return {sichtbar:!!el.innerText.trim() && r.height>20 && r.bottom>s.top && r.top<s.bottom,
          breite:r.left>=s.left && r.right<=s.right};
      });
      sichtbar=sichtbar&&r.sichtbar;breite=breite&&r.breite;
    }
    ok(sichtbar,'Alle Profilabschnitte werden beim Scrollen vollständig erreichbar');
    ok(breite,'Profilabschnitte bleiben innerhalb der Handybreite');
    ok(errors.length===0,'Keine Browserfehler beim Scrollreset und beim Wechseln');
  }finally{await browser.close();}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
