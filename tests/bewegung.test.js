// Bewegung und Eingaben am echten Blatt: Arbeitsmenge und Gültigkeit statt
// geräteabhängiger FPS-Versprechen. Der gebaute Stand wird geprüft.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Gesten und transformbasierte Wähler brauchen einen Browser.');
  process.exit(2);
}
const {createHarness}=require('../tools/performance.cjs');
let checks=0,fails=0;
const ok=(c,msg)=>{checks++;if(!c)fails++;console.log((c?'  ok  ':'  ✗   ')+msg);};
(async()=>{
  const {browser,page,K,errors}=await createHarness();
  try{
    await page.evaluate(()=>{
      window.__echtesRaf=window.requestAnimationFrame;
      window.__echtesCancelRaf=window.cancelAnimationFrame;
      window.__echteZeit=performance.now.bind(performance);
      window.__zeit=0;window.__frames=new Map();window.__frameNr=0;
      window.requestAnimationFrame=fn=>{const id=++window.__frameNr;window.__frames.set(id,fn);return id};
      window.cancelAnimationFrame=id=>window.__frames.delete(id);
      Object.defineProperty(performance,'now',{configurable:true,value:()=>window.__zeit});
      window.__bild=()=>{const fs=[...window.__frames.values()];window.__frames.clear();fs.forEach(f=>f(window.__zeit));};
      window.__touch=(typ,x,y,ziel=document.getElementById('sheet'))=>{
        const t=new Touch({identifier:1,target:ziel,clientX:x,clientY:y});
        const ende=typ==='touchend'||typ==='touchcancel';
        const e=new TouchEvent(typ,{touches:ende?[]:[t],changedTouches:[t],
          targetTouches:ende?[]:[t],bubbles:true,cancelable:true});ziel.dispatchEvent(e);return e;
      };
    });
    const gebuendelt=await K(`(() => {
      openSheet('<div style="height:3000px">Gestenprobe</div>');
      const sh=document.getElementById('sheet');window.__zeit=0;
      window.__touch('touchstart',100,100);
      for(let i=1;i<=25;i++){window.__zeit=i*4;window.__touch('touchmove',100,100+i*4);}
      const vorher=sh.style.transform,auftraege=window.__frames.size;
      window.__bild();return {vorher,auftraege,nachher:sh.style.transform};
    })()`);
    ok(!gebuendelt.vorher && gebuendelt.auftraege===1,'25 Bewegungen werden vor dem Bild zu einem Zeichenauftrag gebündelt');
    ok(gebuendelt.nachher==='translateY(88px)','Das nächste Bild zeichnet die neueste Fingerposition');
    const langsam=await K(`(() => {
      window.__zeit=110;window.__touch('touchend',100,200);
      return document.getElementById('sheet').style.transform;
    })()`);
    ok(langsam==='translateY(0px)','Ein langsamer kurzer Zug schließt nicht durch eine falsche Gesamtweg-Geschwindigkeit');
    const cancel=await K(`(() => {
      openSheet('<p data-cancel>Abgebrochen</p>');window.__zeit=200;
      window.__touch('touchstart',100,100);window.__zeit=210;
      window.__touch('touchmove',100,360);window.__touch('touchcancel',100,360);
      window.__bild();return document.getElementById('sheet').style.transform;
    })()`);
    ok(cancel==='translateY(0px)','Touch-Abbruch stellt das Blatt zurück und schließt es nicht');
    const frisch=await K(`(() => {
      openSheet('<p>Alter Zug</p>');window.__touch('touchstart',100,100);
      window.__touch('touchmove',100,150);const vorher=window.__frames.size;
      openSheet('<p data-frisch>Frisch</p>');window.__bild();
      return vorher===1 && !document.getElementById('sheet').style.transform
        && !!document.querySelector('#sheet [data-frisch]');
    })()`);
    ok(frisch,'Ein geplanter alter Zug verändert kein neu geöffnetes Blatt');
    ok(await K(`!document.getElementById('sheet').classList.contains('is-dragging')`),
      'Ein frisch geöffnetes Blatt behält keine alte Sperre seiner Übergangsanimation');
    const eingabe=await K(`(() => {
      openSheet('<input id="gestenEingabe" type="range" min="0" max="100">');
      const el=document.getElementById('gestenEingabe');
      window.__touch('touchstart',100,100,el);
      const e=window.__touch('touchmove',100,140,el);window.__bild();
      return !e.defaultPrevented && !document.getElementById('sheet').classList.contains('is-dragging');
    })()`);
    ok(eingabe,'Eine Eingabe gehört dem Eingabefeld, nicht der Schließgeste');
    const quer=await K(`(() => {
      openSheet('<p>Quer</p>');window.__touch('touchstart',100,100);
      const a=window.__touch('touchmove',140,110);const b=window.__touch('touchmove',180,150);
      window.__bild();return !a.defaultPrevented&&!b.defaultPrevented
        && !document.getElementById('sheet').style.transform;
    })()`);
    ok(quer,'Ein waagerechter Zug mit vertikaler Drift bleibt waagerecht');
    const schwellen=await K(`(() => {
      const versuch=(weg,dauer,pause=0)=>{
        openSheet('<p>Schwelle</p>');window.__zeit=0;
        window.__touch('touchstart',100,100);
        for(let i=1;i<=10;i++){window.__zeit=dauer*i/10;window.__touch('touchmove',100,100+weg*i/10);}
        window.__zeit+=pause;window.__touch('touchend',100,100+weg);
        return document.getElementById('sheet').style.transform;
      };
      return {schnell:versuch(100,40),lang:versuch(240,800),pause:versuch(100,40,150),kurz:versuch(50,20)};
    })()`);
    ok(schwellen.schnell==='translateY(100%)','Ein echter schneller Wisch oberhalb des Mindestwegs schließt weiter');
    ok(schwellen.lang==='translateY(100%)','Ein langer langsamer Zug schließt über seinen Weg');
    ok(schwellen.pause==='translateY(0px)','Nach einer Haltepause gilt keine alte Wischgeschwindigkeit');
    ok(schwellen.kurz==='translateY(0px)','Auch ein schneller sehr kurzer Zug schließt nicht versehentlich');
    const innen=await K(`(() => {
      openSheet('<div id="innenZug" style="height:100px;overflow-y:auto"><div style="height:2000px">Innen</div></div>');
      const el=document.getElementById('innenZug');el.scrollTop=100;
      window.__touch('touchstart',100,100,el);const e=window.__touch('touchmove',100,170,el);
      return !e.defaultPrevented&&window.__frames.size===0
        &&!document.getElementById('sheet').classList.contains('is-dragging');
    })()`);
    ok(innen,'Eine gescrollte innere Liste löst keinen Zeichentakt für das Blatt aus');
    const geschlossen=await K(`(() => {
      openSheet('<p>Schließen im Zug</p>');window.__touch('touchstart',100,100);
      window.__touch('touchmove',100,170);closeSheet(true);window.__bild();
      const sh=document.getElementById('sheet');return !sh.classList.contains('show')
        &&!sh.style.transform&&!document.getElementById('sheetBg').style.opacity;
    })()`);
    ok(geschlossen,'Schließen entfernt noch geplante Zugbilder samt altem Vorhangstand');
    const maus=await K(`(() => {
      openSheet('<p>Maus</p>');document.getElementById('sheetGrab')
        .dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientY:100}));
      for(let i=1;i<=20;i++)window.dispatchEvent(new MouseEvent('mousemove',{clientY:100+i*2}));
      const vor=document.getElementById('sheet').style.transform,anz=window.__frames.size;
      window.__bild();const nach=document.getElementById('sheet').style.transform;
      window.dispatchEvent(new MouseEvent('mouseup',{clientY:140}));
      return !vor&&anz===1&&nach==='translateY(35.2px)';
    })()`);
    ok(maus,'Auch der Mausgriff zeichnet einen aktuellen Stand je Bild');
    const multi=await K(`(() => {
      openSheet('<p>Zwei Finger</p>');window.__touch('touchstart',100,100);
      window.__touch('touchmove',100,170);window.__bild();
      const sh=document.getElementById('sheet');
      const a=new Touch({identifier:1,target:sh,clientX:100,clientY:170});
      const b=new Touch({identifier:2,target:sh,clientX:140,clientY:170});
      sh.dispatchEvent(new TouchEvent('touchstart',{touches:[a,b],changedTouches:[b],
        targetTouches:[a,b],bubbles:true,cancelable:true}));
      window.__touch('touchend',100,170);window.__bild();
      return sh.style.transform==='translateY(0px)'&&!sh.classList.contains('is-dragging');
    })()`);
    ok(multi,'Ein zweiter Finger bricht den Zug ab und lässt kein versetztes Blatt zurück');
    const rueckzug=await K(`(() => {
      openSheet('<p>Zurückziehen</p>');window.__touch('touchstart',100,100);
      window.__touch('touchmove',100,170);window.__bild();
      const e=window.__touch('touchmove',100,105);window.__bild();
      const sh=document.getElementById('sheet');const r=e.defaultPrevented&&sh.style.transform==='translateY(4.4px)';
      window.__touch('touchcancel',100,105);return r;
    })()`);
    ok(rueckzug,'Ein begonnener Zug folgt auch beim Zurückziehen unter die Anfangsschwelle');
    await page.evaluate(()=>{
      window.requestAnimationFrame=window.__echtesRaf;
      window.cancelAnimationFrame=window.__echtesCancelRaf;
      Object.defineProperty(performance,'now',{configurable:true,value:window.__echteZeit});
    });
    const wartende=await K(`(() => {
      const el=document.createElement('div');let alt=0,neu=0,opacity=0;
      const ab=_afterTransition(el,'transform',1000,()=>alt++);
      _afterTransition(el,'opacity',1000,()=>opacity++);
      _afterTransition(el,'transform',1000,()=>neu++);
      el.dispatchEvent(new TransitionEvent('transitionend',{propertyName:'transform'}));
      el.dispatchEvent(new TransitionEvent('transitionend',{propertyName:'opacity'}));
      return {ab:typeof ab==='function',alt,neu,opacity};
    })()`);
    ok(wartende.ab && wartende.alt===0 && wartende.neu===1 && wartende.opacity===1,
      'Ein neuer Übergang ersetzt nur den wartenden Abschluss derselben Eigenschaft');
    const abbruch=await K(`(() => {
      const el=document.createElement('div');let n=0;
      const ab=_afterTransition(el,'transform',1000,()=>n++);
      if(typeof ab==='function'){ab();ab();}
      el.dispatchEvent(new TransitionEvent('transitionend',{propertyName:'transform'}));
      return n===0;
    })()`);
    ok(abbruch,'Ein abgebrochener Übergang ruft auch bei spätem transitionend keinen Abschluss auf');
    const neueBesitzer=await K(`(() => {
      openSheet('<p>Alt</p>');const sh=document.getElementById('sheet');let alt=0;
      _afterTransition(sh,'transform',1000,()=>alt++);
      sh.classList.add('sheet-nudge');openSheet('<p data-neuer-besitz>Neu</p>');
      sh.dispatchEvent(new TransitionEvent('transitionend',{propertyName:'transform'}));
      return alt===0 && !sh.classList.contains('sheet-nudge')
        && !!sh.querySelector('[data-neuer-besitz]');
    })()`);
    ok(neueBesitzer,'Neuöffnen entfernt den alten Übergangsabschluss und den alten Schutz-Bounce');
    const hartZu=await K(`(() => {
      openSheet('<p>Alt</p>');const sh=document.getElementById('sheet');
      const bg=document.getElementById('sheetBg');let alt=0;
      _afterTransition(sh,'transform',1000,()=>alt++);
      sh.style.transition='transform 2s linear';bg.style.transition='opacity 2s linear';
      sh.classList.add('sheet-nudge');closeSheet(true);
      sh.dispatchEvent(new TransitionEvent('transitionend',{propertyName:'transform'}));
      return alt===0 && !sh.style.transition && !bg.style.transition
        && !sh.classList.contains('sheet-nudge') && !sh.innerHTML;
    })()`);
    ok(hartZu,'Schließen übernimmt keine alte Snap-/Swap-Dauer und verwirft alte Abschlussarbeit');
    const einAbschluss=await K(`(() => {
      const original=_afterTransition;const fertig=[];
      try{
        _afterTransition=(el,p,ms,fn)=>fertig.push({ms,fn});
        openSheet('<div data-wisch-alt style="height:3000px">Abschließen</div>');
        document.getElementById('sheetGrab')
          .dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientY:0}));
        window.dispatchEvent(new MouseEvent('mousemove',{clientY:240}));
        window.dispatchEvent(new MouseEvent('mouseup',{clientY:240}));
        const wisch=fertig.shift();if(wisch)wisch.fn();
        const sh=document.getElementById('sheet');
        return !sh.classList.contains('show') && !sh.innerHTML && fertig.length===0;
      }finally{_afterTransition=original;}
    })()`);
    ok(einAbschluss,'Ein vollständig heruntergewischtes Blatt wird ohne zweite Schließwartephase geleert');
    const zweimalZu=await K(`(() => {
      const original=_afterTransition;const fertig=[];
      try{
        _afterTransition=(el,p,ms,fn)=>fertig.push(fn);
        openSheet('<p data-doppelt-zu>Doppelt schließen</p>');
        const sh=document.getElementById('sheet');closeSheet(true);const auf=sh._auf;
        closeSheet(true);const gleicherAuftrag=sh._auf===auf && fertig.length===1
          && !!sh.querySelector('[data-doppelt-zu]');
        fertig.forEach(fn=>fn());return gleicherAuftrag && !sh.innerHTML;
      }finally{_afterTransition=original;}
    })()`);
    ok(zweimalZu,'Doppeltes Schließen bewahrt den einzigen Leerschritt und den Inhalt bis zum Bewegungsende');
    ok(await K(`(() => {
      const bg=document.getElementById('bpBg');bg.classList.add('show');
      const orig=window._processDeferredNewsToast;let n=0;
      try{
        window._processDeferredNewsToast=()=>n++;closeSheet(true);
        return !bg.classList.contains('show') && n===1;
      }finally{window._processDeferredNewsToast=orig;}
    })()`),'Hartes Schließen räumt auch ohne offenes Blatt Popover auf und holt deferred News nach');
    await page.emulateMedia({reducedMotion:'reduce'});
    const ruhig=await K(`(() => {
      openSheet('<p>Alt</p>');_animateSheetSwap(()=>openSheet('<p data-ruhig>Neu</p>'));
      return {neu:!!document.querySelector('#sheet [data-ruhig]'),
        dauer:getComputedStyle(document.getElementById('sheet')).transitionDuration};
    })()`);
    ok(ruhig.neu && /^0s(, 0s)*$/.test(ruhig.dauer),'Bewegungsruhe tauscht Blätter sofort ohne versteckte Warteanimation');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await K(`closeSheet(true);document.getElementById('main').innerHTML=
      '<div class="ui-switch" id="probeSwitch"><button class="on">Links</button><button>Mitte</button><button>Rechts</button></div>'
      +'<div class="ui-tabs" id="probeTabs"><button class="on">Links</button><button>Mitte</button><button>Rechts</button></div>';0;`);
    const waehler=await page.evaluate(async()=>{
      const liste=[];
      for(const id of ['probeSwitch','probeTabs']){
        const w=document.getElementById(id),pseudo=id==='probeSwitch'?'::before':'::after';
        const cs=getComputedStyle(w,pseudo);const links=parseFloat(cs.left),breite=parseFloat(cs.width);
        const prop=cs.transitionProperty;
        w.children[0].classList.remove('on');w.children[2].classList.add('on');
        await new Promise(r=>setTimeout(r,380));
        const neu=getComputedStyle(w,pseudo),dx=new DOMMatrix(neu.transform).m41;
        const mitte=parseFloat(neu.left)+parseFloat(neu.width)/2+dx;
        const soll=w.children[2].offsetLeft+w.children[2].offsetWidth/2;
        liste.push({prop,fix:parseFloat(neu.left)===links&&parseFloat(neu.width)===breite,
          amZiel:Math.abs(mitte-soll)<=1.5,bewegt:dx>40});
      }return liste;
    });
    ok(waehler.every(w=>w.prop.includes('transform')&&!/left|width/.test(w.prop)),
      'Die Wähler animieren transform statt Layout-Eigenschaften');
    ok(waehler.every(w=>w.fix&&w.bewegt&&w.amZiel),'Die feste Wählergeometrie trifft nach dem Gleiten dieselbe Wahl');
    ok(await K(`getComputedStyle(document.getElementById('sheet')).overscrollBehaviorY==='contain'`),
      'Das Scrollen im Blatt wird nicht in die verdeckte Hauptseite weitergereicht');
    const bedienflaeche=await page.evaluate(()=>{
      const b=document.querySelector('#probeSwitch button');b.focus();
      return {geste:getComputedStyle(b).touchAction,seite:getComputedStyle(document.body).touchAction,
        fokus:getComputedStyle(b).outlineStyle!=='none'&&parseFloat(getComputedStyle(b).outlineWidth)>=2};
    });
    ok(bedienflaeche.geste==='manipulation'&&bedienflaeche.seite==='auto','Doppeltipp-Geste ist nur auf Knöpfen ausgenommen, Seitenzoom bleibt frei');
    ok(bedienflaeche.fokus,'Tastaturfokus ist an Bedienflächen deutlich sichtbar');
    ok(errors.length===0,'Keine Browserfehler beim Zeichentakt und bei Eingaben');
  }finally{await browser.close();}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
