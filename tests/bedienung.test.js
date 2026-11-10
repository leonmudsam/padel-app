// Eingaben werden sofort quittiert, teure Ansichten erst nach dem ersten
// Bild gebaut. Geprüft werden Reihenfolge und Arbeit, keine CI-Zeitgrenze.
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
    const start=await K(`(() => {
      tab='ranking';render();window.__renderFn=render;window.__renderZahl=0;
      render=function(){window.__renderZahl++;return window.__renderFn()};
      const main=document.getElementById('main'),alt=main.firstElementChild;
      document.querySelector('[data-nav="positions"]').click();
      return {markiert:document.querySelector('[data-nav="positions"]').classList.contains('on'),
        wartend:main.getAttribute('aria-busy')==='true',alt:alt===main.firstElementChild,
        ruht:main.inert,zahl:window.__renderZahl};})()`);
    ok(start.markiert,'Die gewählte Navigation antwortet im Eingabe-Aufruf');
    ok(start.wartend && start.alt && start.zahl===0,'Die teure Ansicht wartet auf das erste Rückmeldungsbild');
    ok(start.ruht,'Der alte Reiter ist während eines Tabwechsels nicht versehentlich bedienbar');
    await page.waitForFunction(()=>document.getElementById('main').getAttribute('aria-busy')!=='true');
    ok(await K('window.__renderZahl===1 && !document.getElementById("main").inert'),'Der Reiter wird einmal gebaut und wieder freigegeben');

    const burst=await K(`(() => {
      window.__renderZahl=0;
      for(const id of ['teams','awards','history','positions','history'])
        document.querySelector('[data-nav="'+id+'"]').click();
      return {zahl:window.__renderZahl,tab,aktiv:document.querySelector('[data-nav="history"]').classList.contains('on')};})()`);
    ok(burst.zahl===0 && burst.tab==='history' && burst.aktiv,'Schnelle Taps bewahren sofort die letzte Absicht');
    await page.waitForFunction(()=>document.getElementById('main').getAttribute('aria-busy')!=='true');
    ok(await K('window.__renderZahl===1 && !!document.getElementById("histSel")'),'Ein Tap-Burst baut nur die zuletzt gewählte Ansicht');

    // „Gesamt" und gleich danach ein Monat der noch stehenden Zeitleiste:
    // die Wahl des Monats kam mit dem Zeitraum „Gesamt" an, und unter der
    // Gesamttabelle standen die Werkzeuge jenes Monats, ohne als Geschichte
    // gekennzeichnet zu sein [§C40].
    const wahl=await K(`(() => {
      tab='ranking';period='season';ligaSeasonId=null;render();
      const b=[...document.querySelectorAll('#ligaSeasonPicker [data-saisonwahl]')]
        .find(b=>b.dataset.saisonwahl!==currentSeason().id && matchesInSeason(b.dataset.saisonwahl).length);
      document.querySelector('#main [data-period="all"]').click();
      if(b) b.click();
      return b ? b.dataset.saisonwahl : '';})()`);
    await page.waitForFunction(()=>document.getElementById('main').getAttribute('aria-busy')!=='true');
    const gewaehlt=await K(`({period,liga:ligaSeasonId,
      lose:[...document.querySelectorAll('#main [data-seasontool]')].filter(e=>!e.closest('[data-bis]')).map(e=>e.dataset.sid)})`);
    ok(wahl && gewaehlt.period==='season' && gewaehlt.liga===wahl && !gewaehlt.lose.length,
      'Ein Monat, gewählt auf der Leiste, die nach „Gesamt" noch stand, zeigt diesen Monat als Geschichte: '+JSON.stringify({wahl,gewaehlt}));

    await K(`tab='ranking';render();window.__renderZahl=0;
      document.querySelector('[data-nav="teams"]').click();tab='history';render();`);
    await page.waitForTimeout(100);
    ok(await K('window.__renderZahl===1 && !!document.getElementById("histSel")'),'Ein unmittelbarer Render entzieht alter geplanter Arbeit den Besitz');
    ok(await K('!document.getElementById("main").inert && document.getElementById("main").getAttribute("aria-busy")!=="true"'),'Abbrechen hinterlässt keine Eingabesperre');

    // Ein schon ausgelieferter Callback muss selbst dann still bleiben,
    // wenn cancelAnimationFrame ihn nicht mehr erreichen kann.
    const stale=await K(`(() => {
      window.__rafFn=requestAnimationFrame;window.__cancelFn=cancelAnimationFrame;window.__jobs=[];
      window.requestAnimationFrame=fn=>{window.__jobs.push(fn);return 999};window.cancelAnimationFrame=()=>{};
      tab='ranking';render();window.__renderZahl=0;
      document.querySelector('[data-nav="teams"]').click();const alt=window.__jobs.shift();
      tab='history';render();if(alt)alt();
      window.requestAnimationFrame=window.__rafFn;window.cancelAnimationFrame=window.__cancelFn;
      return !!alt;})()`);
    await page.waitForTimeout(100);
    ok(stale && await K('window.__renderZahl===1'),'Auch ein verspäteter Frame-Callback zeichnet keinen überholten Reiter');

    const frisch=await K(`(() => {
      tab='ranking';render();document.querySelector('[data-nav="history"]').click();
      invalidateCache();return _cache.version;})()`);
    await page.waitForFunction(()=>document.getElementById('main').getAttribute('aria-busy')!=='true');
    ok(await K('document.getElementById("main")._renderVersion')===frisch,'Ein geplanter Wechsel zeichnet den aktuellen Datenstand');
    ok(await K('document.querySelector("[data-nav=history]").getAttribute("aria-current")==="page"'),'Die aktive Navigation ist auch ohne Farbe erkennbar');

    // Hintergrundabrufe dürfen einen Regler unter dem Finger nicht ersetzen.
    const tick=await K(`(() => {window.__loadFn=loadAll;window.__ticks=0;loadAll=()=>{window.__ticks++};
      tab='settings';_tickDaten();const ruht=window.__ticks===0;
      tab='history';_tickDaten();loadAll=window.__loadFn;return {ruht,weiter:window.__ticks===1};})()`);
    ok(tick.ruht && tick.weiter,'Einstellungen ruhen unter Eingabe, Anzeige-Reiter behalten ihren Hintergrundtakt');
    await K(`window.__dbFn=sb.from;window.__archFn=autoArchiveSeasons;window.__syncFn=syncStoriesViaDb;
      window.__antwort={players,matches,config:cfg,seasons};window.__datenFehler=false;
      sb.from=table=>{const q={select:()=>q,order:()=>q,eq:()=>q,single:()=>q,
        then:resolve=>resolve(window.__datenFehler?{error:new Error('Eingabe-Testfehler')}:{data:window.__antwort[table]})};return q;};
      autoArchiveSeasons=async()=>{};syncStoriesViaDb=async()=>{};
      tab='match';M={A1:'',A2:players[1].id,B1:players[2].id,B2:players[3].id,pA1:'drive',pA2:'reves',pB1:'drive',pB2:'reves',sa:10,sb:5};
      render();window.__feld=document.querySelector('[data-combo="A1"]');window.__feld.focus();
      window.__feld.value='Noch nicht ausgewählt';window.__feld.setSelectionRange(7,7);
      _lastLoadFingerprint=null;0;`);
    await K('loadAll()');
    ok(await K('document.querySelector("[data-combo=A1]")===window.__feld && document.activeElement===window.__feld && window.__feld.value==="Noch nicht ausgewählt" && window.__feld.selectionStart===7'),
      'Auch ein bereits laufender Datenabruf bewahrt freien Eingabetext, Fokus und Cursor');
    await K('window.__datenFehler=true;loadAll()');
    ok(await K('document.querySelector("[data-combo=A1]")===window.__feld && window.__feld.value==="Noch nicht ausgewählt"'),
      'Ein fehlgeschlagener Datenabruf ersetzt kein laufendes Matchformular');
    await K(`window.__datenFehler=false;tab='settings';render();window.__regler=document.getElementById('cfgK');
      window.__regler.value='17';window.__regler.focus();_lastLoadFingerprint=null;loadAll();`);
    await K('loadAll()');
    ok(await K('document.getElementById("cfgK")===window.__regler && window.__regler.value==="17" && document.activeElement===window.__regler'),
      'Eine späte Datenantwort ersetzt keinen Regler unter dem Finger');
    await K('sb.from=window.__dbFn;autoArchiveSeasons=window.__archFn;syncStoriesViaDb=window.__syncFn');
    await K('render=window.__renderFn');

    // Die Zurück-Taste [§4.3]: sie schloss die ganze App, auch aus einem
    // Profil drei Blätter tief. Jetzt geht sie einen Schritt zurück —
    // Dialog, Blatt Ebene für Ebene, dann der Reiter zur Liga —, und es
    // liegt genau dann ein eigener Eintrag im Verlauf, wenn es etwas gibt,
    // wohin sie führt.
    const warte=ms=>page.waitForTimeout(ms);
    const zurueck=async()=>{await page.evaluate(()=>history.back());await warte(700);};
    const eintrag=()=>K('!!(history.state&&history.state.kicker)');
    const blattName=()=>K('(document.querySelector("#sheet.show .pp-name")||{}).textContent||""');
    await K(`closeSheet(true);tab='ranking';render();`);await warte(150);
    const leer=!(await eintrag());
    await K('showPlayer(players[0].id)');await warte(150);
    const offen=await eintrag();
    await K('sheetNav(()=>showPlayer(players[1].id))');await warte(700);
    const kind=await blattName();
    await zurueck();
    const eltern=await blattName(), wieder=await eintrag();
    await zurueck();
    const zu=await K('!document.getElementById("sheetBg").classList.contains("show") && tab==="ranking" && !!document.getElementById("main")');
    const nachZu=!(await eintrag());
    const namen=await K('[pname(players[0].id),pname(players[1].id)]');
    ok(leer && offen && kind.includes(namen[1]) && eltern.includes(namen[0]) && wieder && zu && nachZu,
      'Die Zurück-Taste schließt ein Blatt Ebene für Ebene und verlässt die App nicht: '
      +JSON.stringify({leer,offen,kind,eltern,wieder,zu,nachZu}));
    // Schließen per Knopf nimmt den Eintrag wieder weg; Schließen und
    // Öffnen im selben Zug (eine Story schließt, ihr Profil öffnet) lässt
    // ihn stehen, sonst führte die nächste Taste aus der App.
    await K('showPlayer(players[0].id)');await warte(150);
    await K('document.getElementById("sheetZu").click()');await warte(400);
    const knopf=!(await eintrag());
    await K('showPlayer(players[0].id)');await warte(150);
    await K('closeSheet(true);showPlayer(players[1].id)');await warte(400);
    const zug=await eintrag();
    await zurueck();
    const zugZu=await K('!document.getElementById("sheetBg").classList.contains("show")');
    ok(knopf && zug && zugZu,'Der Schließknopf nimmt den Eintrag weg, ein Wechsel im selben Zug lässt ihn stehen: '
      +JSON.stringify({knopf,zug,zugZu}));
    await K('document.querySelector(\'[data-nav="awards"]\').click()');await warte(300);
    const reiterEintrag=await eintrag();
    await zurueck();
    const liga=await K('tab');
    await K('window.__antwortDlg=null;bestaetigen({titel:"Frage"}).then(v=>window.__antwortDlg=v);0');await warte(150);
    await zurueck();
    const dlg=await K('window.__antwortDlg===false && !document.querySelector(".dlg-bg.show")');
    ok(reiterEintrag && liga==='ranking' && dlg && !(await eintrag()),
      'Aus einem anderen Reiter führt die Zurück-Taste zur Liga, ein Dialog antwortet „nein": '
      +JSON.stringify({reiterEintrag,liga,dlg}));
    // Was sich von selbst öffnet, deckt nichts Offenes zu [§C31]. Der
    // Saison-Rückblick ging 600 ms nach einem Datenabruf auf, ohne zu
    // fragen, und nahm das Bearbeiten einer Partie mit, das in der
    // Zwischenzeit aufgegangen war. Gestellt am 1. September, der August
    // noch nicht gesehen.
    await K(`window.__jetztVorher=window.__perfJetzt;window.__seasVorher=seasons;window.__ssr=showSeasonRecap;
      window.__perfJetzt=new Date(2026,8,1,12).getTime();seasons=[{id:'2026-08',label:'August 2026'}];
      window.__auf=[];showSeasonRecap=s=>window.__auf.push(s.id);_autoRecapSeen.clear();
      try{localStorage.removeItem('padel_auto_rueckblick_tag')}catch(e){}
      closeSheet(true);tab='ranking';render();0`);await warte(200);
    await K('autoShowSeasonRecap();showEditMatch(matches[matches.length-1].id);0');await warte(900);
    const zwischen=await K(`({auf:window.__auf.length,formular:!!document.getElementById('saveEdit'),
      offen:!_autoRecapSeen.has('season:2026-08')})`);
    await K(`closeSheet(true);tab='match';render();autoShowSeasonRecap();0`);await warte(900);
    const eingabe=await K('window.__auf.length');
    await K(`tab='ranking';render();0`);await warte(400);
    await K('autoShowSeasonRecap();0');await warte(900);
    const spaeter=await K('window.__auf.join()');
    await K(`showSeasonRecap=window.__ssr;seasons=window.__seasVorher;window.__perfJetzt=window.__jetztVorher;
      _autoRecapSeen.clear();closeSheet(true);0`);
    ok(zwischen.auf===0 && zwischen.formular && zwischen.offen && eingabe===0 && spaeter==='2026-08',
      'Der Monatsrückblick öffnet sich nicht über ein Blatt, das in der Zwischenzeit aufging, und nicht über ein Formular, sondern danach: '
      +JSON.stringify({zwischen,eingabe,spaeter}));
    ok(errors.length===0,'Keine Browserfehler beim Zusammenfassen und Abbrechen');
  }finally{await browser.close();}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
