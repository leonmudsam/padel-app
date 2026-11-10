// ╔═══ §6.1 ─── DETAIL-SHEET-INFRASTRUKTUR ─────────────────────────────╗
//     Bottom-Sheet-System mit Swipe-to-close. openSheet()/closeSheet().
// ╚═════════════════════════════════════════════════════════════════════════╝
// ── Sheet-Navigations-Stack (v9.2) ──────────────────────────────────
// Ermöglicht ÜBERLAPPENDE Sheets: ein Kind-Sheet (z.B. Spielerprofil aus dem
// Recap) legt sich „über" das aktuelle. closeSheet() — egal ob Button, Swipe
// oder Backdrop — geht dann Schritt für Schritt EINE Ebene zurück, statt alles
// zu schließen. Kein zweites DOM-Sheet nötig: pro Ebene merken wir uns eine
// reopen-Funktion und bauen das Eltern-Sheet frisch auf (Handler werden korrekt
// neu gebunden). Das einzelne #sheet + die Swipe-Geste bleiben unverändert.
let _sheetStack = [];      // {fn, scroll} der darunterliegenden Sheets (unten→oben)
let _sheetReopen = null;   // wie das AKTUELL sichtbare Sheet neu gebaut wird
let _sheetPopping = false; // true, während closeSheet ein Eltern-Sheet wiederherstellt
// Jeder stapelbare Sheet-Builder meldet zu Beginn, wie er sich neu öffnen lässt.
function _sheetSetReopen(fn){ _sheetReopen = (typeof fn === 'function') ? fn : null; }
// Aktuelles Sheet (samt Scroll-Position) auf den Stack legen.
function _pushCurrentSheet(){
  if(!_sheetReopen) return;
  const sheet = document.getElementById('sheet');
  _sheetStack.push({ fn: _sheetReopen, scroll: sheet ? sheet.scrollTop : 0 });
}
// Sauberer Übergang beim Stapeln/Zurückgehen: aktuelles Sheet nach unten
// „schließen", Inhalt tauschen, neues Sheet hochschieben — genau wie beim
// normalen Öffnen/Schließen (kein hartes Aufpoppen). swapFn ersetzt den Inhalt
// (ruft intern openSheet + ggf. Scroll-Restore).
let _sheetAnimating = false;
// Einmal auf das ENDE einer Transition warten, mit Timer als Rückfall.
// Ein reiner `setTimeout(200)` ist nicht dasselbe wie „die Animation ist
// fertig": der Timer läuft ab dem Aufruf, die CSS-Transition erst ab dem
// nächsten Style-Flush. Der Rückstand ist klein, aber er reicht — der
// Inhaltstausch fiel damit zuverlässig in die letzten Bilder des
// Zuschiebens und fror sie ein. Gemessen kostet der Umbau des Feeds 86 ms
// Hauptthread; mitten in einer laufenden Transition sind das rund fünf
// verlorene Bilder, und genau das sieht man als Hänger.
// Der Timer bleibt als Rückfall: `transitionend` kommt nicht, wenn die
// Transition gar nicht startet (gleicher Wert, `prefers-reduced-motion`,
// Element im Hintergrund-Tab), und dann dürfte das Sheet nie mehr zurück.
function _afterTransition(el, prop, ms, fn){
  // Derselbe Knoten wird für jedes Blatt und jeden Snap wiederverwendet.
  // Ein neuer Übergang besitzt daher nur EINEN Abschluss je Eigenschaft:
  // alte Listener und Rückfall-Timer dürfen nicht bis zum nächsten Öffnen
  // mitlaufen und dessen transitionend als ihren eigenen Abschluss nehmen.
  const wartend = el._transitionAb || (el._transitionAb = {});
  if(wartend[prop]) wartend[prop]();
  let fertig = false;
  let rueckfall;
  const ab = () => {
    if(fertig) return;
    fertig = true;
    el.removeEventListener('transitionend', los);
    clearTimeout(rueckfall);
    if(wartend[prop] === ab) delete wartend[prop];
  };
  const los = (e) => {
    if(e && e.target !== el) return;              // Kinder animieren mit
    if(e && e.propertyName && e.propertyName !== prop) return;
    if(fertig) return;
    ab();
    fn();
  };
  wartend[prop] = ab;
  el.addEventListener('transitionend', los);
  rueckfall = setTimeout(los, ms + 60);
  return ab;
}
function _animateSheetSwap(swapFn){
  const sheet = document.getElementById('sheet');
  const bg = document.getElementById('sheetBg');
  // Kein sichtbares Sheet oder schon eine Animation aktiv → sofort tauschen.
  if(!sheet || !bg || !bg.classList.contains('show') || _sheetAnimating
    || window.matchMedia('(prefers-reduced-motion:reduce)').matches){ swapFn(); return; }
  const auf = sheet._auf;
  _sheetAnimating = true;
  if(sheet._swipeCleanup){ sheet._swipeCleanup(); sheet._swipeCleanup=null; }
  sheet.classList.remove('is-dragging');
  // 1) aktuelles Sheet nach unten (schließen)
  sheet.style.transition = 'transform .2s cubic-bezier(.4,0,1,1)';
  sheet.style.transform = 'translateY(100%)';
  _afterTransition(sheet, 'transform', 200, () => {
    // Ein direkt geöffnetes oder geschlossenes Blatt gehört nicht mehr zu
    // diesem Übergang. Auch das nächste Bild muss den Besitzer nachsehen.
    if(sheet._auf !== auf) return;
    // 2) Der geparkte Zustand wird ZUERST gezeichnet, dann getauscht. Ohne
    //    das eigene Bild liegt der Block des Umbaus noch im Bild, in dem das
    //    Sheet unten ankommt, und der Sprung nach unten ruckelt am Ende.
    sheet.style.transition = 'none';
    requestAnimationFrame(() => {
      if(sheet._auf !== auf) return;
      try { swapFn(); } catch(e){}
      const neuAuf = sheet._auf;
      _sheetAnimating = true;
      sheet.style.transform = 'translateY(100%)';
      void sheet.offsetWidth; // Reflow, damit die Aufwärts-Transition greift
      // 3) hochschieben (öffnen)
      sheet.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
      sheet.style.transform = 'translateY(0)';
      _afterTransition(sheet, 'transform', 300, () => {
        if(sheet._auf !== neuAuf) return;
        sheet.style.transition=''; sheet.style.transform=''; _sheetAnimating=false;
      });
    });
  });
}
// Vorwärts-Navigation: aktuelles Sheet stapeln, dann Kind sauber „öffnen".
// Ersetzt das frühere Schließen-und-neu-öffnen-Muster bei Navigationen.
function sheetNav(openChild){
  const sheet = document.getElementById('sheet');
  const stacking = sheet && sheet.classList.contains('show') && _sheetReopen && !_sheetPopping;
  if(stacking){
    _pushCurrentSheet();
    _animateSheetSwap(() => { try { openChild(); } catch(e){ _sheetStack.pop(); } });
  } else {
    try { openChild(); } catch(e){ _sheetStack.pop(); }
  }
}
window.sheetNav = sheetNav;

// Der Kopf eines Abschnitts im Blatt [§C27]: ein leises Zeichen, der Name
// in Großbuchstaben, rechts worauf er sich bezieht. Jedes Blatt baute ihn
// selbst — als Inline-Style im Duo-Blatt, als `.pp-sec-title` im
// Rekord-Blatt, als `.aw-list-label` im Award-Blatt — und kein zweites sah
// aus wie das erste.
function blattAbschnittHtml(ic, titel, rechts){
  return `<div class="blatt-abschn">${ic ? svgI(ic) : ''}<span>${esc(titel)}</span>${
    rechts ? `<em class="num">${esc(String(rechts))}</em>` : ''}</div>`;
}

// Der Kopf eines Blatts [§C27]: die Zeichenkachel in der Farbe der Rolle,
// der Titel, darunter Zeitraum und Art. Blätter hatten fünf Köpfe — ein
// leuchtender Kreis über der Mitte im Award-Blatt, ein nackter Titel im
// Rekord-Blatt, ein Kasten mit Zeichen darunter im Chronik-Blatt, ein
// 48-px-Gesicht neben „Awards" im Profil, und im Partie-Blatt der Stand als
// Überschrift. Wer zwei nacheinander öffnete, fand nichts an derselben
// Stelle. Ein Blatt über einen Menschen (Profil, Duo, Rückblick, Story)
// behält seinen Heldenkopf: dort ist das Gesicht die Überschrift.
function blattKopfHtml(o){
  return `<div class="blatt-kopf">${o.ic ? zkHtml(o.ic, 'g', o.ton || '') : ''}
    <div class="blatt-kopf-t"><h3>${esc(o.titel)}</h3>${
      o.unter ? `<div class="sheet-sub">${esc(o.unter)}</div>` : ''}</div></div>`;
}
// Der Fuß: der Weg weiter, höchstens zwei Knöpfe, der wichtigere gefüllt.
// Vorher führten Namen irgendwo im Blatt weiter, und nicht jedes Blatt
// hatte einen Weg in die Partie oder das Profil, von dem es handelt.
//   knoepfe  [{label, ic, attr, prim}]
function blattFussHtml(knoepfe){
  const k = (knoepfe || []).filter(Boolean).slice(0, 2);
  if(!k.length) return '';
  return `<div class="blatt-fuss${k.length === 1 ? ' eins' : ''}">${k.map(b =>
    `<button type="button" class="btn${b.prim ? '' : ' ghost'}" ${b.attr || ''}>${
      b.ic ? svgI(b.ic) : ''}${esc(b.label)}</button>`).join('')}</div>`;
}
// Die Partie als Bühne [§C27]: die Sieger links und hell, die Verlierer
// rechts und leiser, der Stand groß in der Mitte, darunter Zeit, Abstand
// und Siegchance. Ein Bauteil für das Award-Blatt einer Partie und das
// Blatt der Partie selbst. Im Award-Blatt standen die Teams als volle
// Farbbalken mit Initialen — `.aw-mini-av` hatte keine einzige Regel —,
// im Partie-Blatt als zwei graue Kästen neben einem Stand als Überschrift.
//   m        die Partie, o.zeile der Satz darunter, o.marke das Wort über den
//            Siegern (Standard „Sieger"), o.gleich keiner liegt vorn
function buehneHtml(m, o){
  o = o || {};
  // `gleich`: keiner liegt vorn (Erzfeinde mit gleich vielen Siegen) — dann
  // steht keine Seite zurück und keine trägt eine Marke.
  const siegA = m.winner === 'A';
  const marke = o.gleich ? '' : (o.marke != null ? o.marke : 'Sieger');
  const seite = (ids, sieg) => `<div class="buehne-s${sieg || o.gleich ? ' sieg' : ' nied'}" data-team="${esc(ids.slice().sort().join('|'))}">
      <span class="buehne-marke">${sieg ? esc(marke) : ''}</span>
      <span class="buehne-paar">${ids.map(id => { const p = pmap()[id]; return p ? avHtml(p, '', {}) : ''; }).join('')}</span>
      <span class="buehne-n">${ids.map(id => esc(pname(id))).join('<br>')}</span></div>`;
  const a = seite([m.a1, m.a2], siegA), b = seite([m.b1, m.b2], !siegA);
  // Der Stand steht in der Reihenfolge der Seiten: links A, rechts B. Groß
  // stehen die Sätze, darunter jeder Satz in Games; bei einem einzigen
  // Satz steht er selbst groß, „1:0" sagte nichts. Ein Objekt ohne Sätze
  // (die Bilanz zweier Duos) zeigt seine Zahlen, wie sie sind.
  const p = Array.isArray(m.sets) && m.sets.length ? partie(m) : null;
  const einSatz = p && p.saetze.length === 1;
  const gross = p && !einSatz ? [p.setsA, p.setsB] : p ? [p.saetze[0].a, p.saetze[0].b] : [m.games_a, m.games_b];
  const klein = p && !einSatz ? `<small class="buehne-saetze">${p.saetze.map(x => x.art === 'open' ? '(' + x.a + ':' + x.b + ')' : x.a + ':' + x.b).join(' ')}</small>` : '';
  return `<div class="buehne">${a}<div class="buehne-stand num">${gross[0]}<i>:</i>${gross[1]}${klein}</div>${b}${
    o.zeile ? `<div class="buehne-zeile num">${esc(o.zeile)}</div>` : ''}</div>`;
}

function openSheet(html, opts){
  opts = opts || {};
  const sheet=document.getElementById('sheet');
  const bg=document.getElementById('sheetBg');
  // Frischer Root-Open (kein Sheet war offen, kein Pop läuft) → Stack leeren.
  // Bei Navigation/Pop bleibt das Sheet sichtbar → Stack unangetastet.
  if(!bg.classList.contains('show') && !_sheetPopping){ _sheetStack.length = 0; }
  // Falls bereits ein Sheet offen war (openSheet direkt nach openSheet, ohne
  // closeSheet dazwischen), zuerst dessen Swipe-Listener aufräumen — sonst
  // stapeln sich window-mousemove/mouseup-Listener und lecken.
  if(sheet._swipeCleanup){ sheet._swipeCleanup(); sheet._swipeCleanup=null; }
  if(sheet._transitionAb) Object.values(sheet._transitionAb).forEach(ab => ab());
  sheet.classList.remove('sheet-nudge');
  // Zurücksetzen, solange der bisherige Inhalt noch gültig gezeichnet ist.
  // Nach innerHTML erzwingt selbst scrollTop=0 das komplette neue Layout,
  // bevor das Blatt überhaupt sichtbar ist. Das neue Blatt übernimmt null;
  // beim Zurückgehen setzt closeSheet anschließend ausdrücklich den alten
  // Stand. Keine spätere Aufgabe darf einen vom Nutzer gesetzten Stand nullen.
  sheet.scrollTop = 0;
  _vorstellungAus(sheet);
  // Griff und Schließen stehen in einer Leiste, die beim Scrollen oben
  // bleibt. Geschlossen wurde bisher nur durch Wischen, einen Tipp neben
  // das Blatt oder einen Knopf, den jedes Blatt selbst baute oder nicht —
  // am Ende eines langen Blatts war kein Weg hinaus zu sehen [§C27].
  // Jedes Öffnen bekommt eine Nummer. Was beim Schließen später erledigt
  // wird — das Leeren, das Zuziehen per Wisch —, prüft sie und lässt ein
  // Blatt in Ruhe, das inzwischen neu aufgegangen ist.
  sheet._auf = (sheet._auf || 0) + 1;
  _sheetAnimating = false;
  sheet.style.transition=''; sheet.style.transform='';
  bg.style.transition=''; bg.style.opacity='';
  sheet.innerHTML=`<div class="sheet-leiste"><div class="sheet-grab" id="sheetGrab"></div>`
    + `<button type="button" class="sheet-zu" id="sheetZu" aria-label="Schließen">${svgI('x')}</button></div>${html}`;
  document.getElementById('sheetZu').onclick = () => closeSheet(true);
  schlittenFahren(sheet);
  bg.classList.add('show');
  sheet.classList.add('show');
  _zurueckAbgleichen();
  // Der Inhalt kommt gestaffelt, ein Rückblick als Vorstellung, und was das
  // Blatt verdeckt, steht still [§C43]. Zurück aus einem Blatt darüber
  // stellt nichts vor: wer ein Profil angesehen hat, will nicht noch einmal
  // zwei Sekunden auf den Meister warten.
  if(opts.vorstellung && !_sheetPopping) _vorstellung(sheet, opts.vorstellung);
  else _blattStaffeln(sheet);
  _verdecken('blatt', true);
  // ⚠ Schutz-Phase: für auto-getriggerte Pop-Ups (Saison-/POTW-/POTD-Recap)
  // wird der Backdrop-Click für protectMs ms unterdrückt — verhindert
  // versehentliches Schließen bei direkt-nach-App-Start-Scroll-Aktionen.
  // Swipe-down und der "Verstanden"-Button bleiben jederzeit aktiv.
  if(opts.protectMs && opts.protectMs > 0){
    sheet._protectedUntil = Date.now() + opts.protectMs;
  } else {
    sheet._protectedUntil = 0;
  }
  bindSheetSwipe();
}

// closeSheet(force):
//   • Standard: EINE Ebene zurück, falls der Stack noch Eltern-Sheets enthält
//     (Button/Swipe/Backdrop wirken so als „Zurück").
//   • force=true: hart komplett schließen + Stack leeren (für terminale Aktionen
//     wie Löschen/Anlegen/Neuberechnen/Home, nach denen render() ohnehin greift).
function closeSheet(force){
  const sheet=document.getElementById('sheet');
  const bg=document.getElementById('sheetBg');
  if(!force && _sheetStack.length){
    // Zurück zum Eltern-Sheet — mit sauberer Schließen/Öffnen-Animation.
    bg.style.transition=''; bg.style.opacity='';
    const entry = _sheetStack.pop();
    _animateSheetSwap(() => {
      _sheetPopping = true;
      try {
        entry.fn();
        // Scroll-Position des Eltern-Sheets wiederherstellen (openSheet setzt 0).
        try { if(entry.scroll) sheet.scrollTop = entry.scroll; } catch(e){}
      }
      catch(e){ _sheetForceClose(sheet,bg); }
      _sheetPopping = false;
    });
    return;
  }
  _sheetForceClose(sheet,bg);
}
function _sheetForceClose(sheet,bg,schonUnten){
  _sheetStack.length = 0; _sheetReopen = null;
  // Das Popover kann auch allein über der Hauptansicht stehen. Home soll
  // es weiterhin schließen, selbst wenn für das Blatt nichts mehr zu tun ist.
  const bpBg = document.getElementById('bpBg');
  if(bpBg && bpBg.classList.contains('show')) closeBadgePopover();
  _verdecken('blatt', false);
  _vorstellungAus(sheet);
  // Ein zweiter Schließknopf während des Zuschiebens darf dessen einzigen
  // Abschluss nicht ersetzen und den Inhalt mitten in der Bewegung leeren.
  const warOffen = sheet.classList.contains('show');
  if(warOffen || bg.classList.contains('show')){
    // Schließen entzieht auch noch wartenden Navigations-/Wischabschlüssen
    // den Besitz. Sie dürfen das zugeschobene Blatt nicht wieder öffnen.
    sheet._auf = (sheet._auf || 0) + 1;
    _sheetAnimating = false;
    // Swipe-Listener aufräumen
    if(sheet._swipeCleanup){ sheet._swipeCleanup(); sheet._swipeCleanup=null; }
    if(sheet._transitionAb) Object.values(sheet._transitionAb).forEach(ab => ab());
    // Ein Knopf kann während eines Snap/Swap schließen. Er übernimmt nicht
    // dessen Inline-Dauer; insbesondere ein alter Bounce darf die Bewegung
    // nach unten nicht noch einmal mit translateY(0) überlagern.
    sheet.style.transition='';
    bg.style.transition='';
    sheet.classList.remove('show','is-dragging','sheet-nudge');
    // Ist es unten, wird es geleert. Ein geschlossenes Blatt liegt nur unter
    // dem Bildschirmrand, in einer eigenen Schicht — und behielt seinen
    // Inhalt: nach dem Feed 5400 Knoten, die jede Stilberechnung der Seite
    // mitlief, bis das nächste Blatt sie ersetzte. Geleert wird erst am Ende
    // des Zuschiebens, sonst führe es leer hinunter, und nur, wenn in der
    // Zwischenzeit kein neues Blatt aufgegangen ist.
    const auf = sheet._auf;
    if(warOffen){
      const leeren = () => {
        if(sheet._auf === auf && !sheet.classList.contains('show')) sheet.innerHTML = '';
      };
      // Der root-Wisch wartet bereits bis ganz unten. Noch einmal auf die
      // unveränderte Zielposition zu warten erzeugte keine Transition, nur
      // einen weiteren 400-ms-Rückfall mit allen unsichtbaren Blattknoten.
      if(schonUnten || window.matchMedia('(prefers-reduced-motion:reduce)').matches) leeren();
      else _afterTransition(sheet, 'transform', 340, leeren);
    }
    sheet.style.transform='';
    bg.style.opacity='';
    bg.classList.remove('show');
  }
  // v8.2: gequeuten News-Toast nachholen, falls beim Boot ein Recap
  // ihn blockiert hat. Verzögerung kommt aus _processDeferredNewsToast.
  try { if(window._processDeferredNewsToast) window._processDeferredNewsToast(); } catch(e){}
  _zurueckAbgleichen();
}

function bindSheetSwipe(){
  const sheet=document.getElementById('sheet');
  const bg=document.getElementById('sheetBg');
  let startY=0, startX=0, startScrollTop=0, dragging=false;
  // Waagerecht oder senkrecht? Einmal je Berührung entschieden.
  let richtung='';
  // Ein Zug kann schneller eintreffen als der Bildschirm zeichnet. Sein
  // jüngster Stand wird nur einmal je Bild angewendet, niemals nach einem
  // neuen Öffnen. Eingabe/Schließentscheidung bleiben sofort synchron.
  const auf = sheet._auf;
  let bild=0, zugWeg=0, proben=[], geste=0;
  const bildAb = () => { if(bild){ cancelAnimationFrame(bild); bild=0; } };
  const zugBild = (dy) => {
    zugWeg=Math.max(0,dy)*0.88;
    if(bild) return;
    bild=requestAnimationFrame(()=>{
      bild=0;
      if(sheet._auf!==auf || !dragging) return;
      sheet.style.transform=`translateY(${zugWeg}px)`;
      bg.style.opacity=1-Math.min(zugWeg/300,1)*0.6;
    });
  };
  const probe = (y) => {
    const t=performance.now();
    proben.push({y,t});
    while(proben.length>2 && proben[1].t<t-100) proben.shift();
    if(proben.length>32) proben.shift();
  };
  const tempo = (y) => {
    const t=performance.now();
    // Nur die letzte kurze Strecke zählt, nicht der Gesamtweg geteilt durch
    // die Millisekunden seit touchmove. Letzteres schloss selbst langsame
    // kurze Züge als angeblich schnellen Wisch; ein Abbruch schließt nie.
    const p=proben.find(p=>p.t>=t-100);
    return p ? Math.max(0,(y-p.y)/Math.max(1,t-p.t)) : 0;
  };
  // Sheet-Close-Schwellen (kalibriert für versehentliche Touches vs echte Geste):
  // - CLOSE_THRESHOLD: lange, langsame Geste schließt erst nach 200 px Wegstrecke
  // - VELOCITY_THRESHOLD: 1.2 px/ms = echter Wisch (≈1200 px/s)
  // - MIN_DY_FOR_VEL_CLOSE: ein schneller Wisch braucht zusätzlich min. 60 px Strecke,
  //   damit kurze Flicks nicht ungewollt schließen
  // - DRAG_INTENT_THRESHOLD: ab dieser Strecke wird das Sheet visuell mitgezogen
  const CLOSE_THRESHOLD=200;
  const VELOCITY_THRESHOLD=1.2;
  const MIN_DY_FOR_VEL_CLOSE=60;
  const DRAG_INTENT_THRESHOLD=12;

  // ── TOUCH (Smartphone) ──
  const onTouchStart=(e)=>{
    onTouchCancel();geste++;
    if(e.touches.length!==1 || (e.target.closest
      && e.target.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]'))) return;
    const touch=e.touches[0];
    startY=touch.clientY;
    startX=touch.clientX;
    richtung='';
    // ── Inner-Scroll-Tracking (Bugfix v8.1) ──────────────────────────
    // Häufige UX-Falle: Sheet enthält INNERE Scroll-Container (eine Liste
    // mit max-height + overflow-y:auto). Wenn der User
    // dort scrollt, bleibt sheet.scrollTop=0, und ein Hochziehen aus
    // einer Liste, die unten gescrollt war, wird fälschlich als Sheet-
    // Schließen interpretiert.
    //
    // Lösung: beim touchstart innersten scrollbaren Vorfahr finden und
    // dessen scrollTop tracken. Der Sheet-Swipe darf NUR greifen, wenn
    // sowohl Sheet als auch innerer Container am Top sind.
    let scrollEl = e.target;
    while(scrollEl && scrollEl !== sheet && scrollEl !== document.body){
      const cs = window.getComputedStyle(scrollEl);
      if((cs.overflowY === 'auto' || cs.overflowY === 'scroll')
         && scrollEl.scrollHeight > scrollEl.clientHeight){
        break;
      }
      scrollEl = scrollEl.parentElement;
    }
    if(!scrollEl || scrollEl === document.body) scrollEl = sheet;
    sheet._innerScrollEl = scrollEl;
    sheet._innerScrollTopStart = scrollEl.scrollTop;
    startScrollTop = sheet.scrollTop;
    proben=[];probe(startY);
    // Der Zug-Lauscher kommt nur, wenn diese Geste das Blatt überhaupt
    // schließen kann: oben, ohne gescrollten Inhalt. Er ist nicht passiv,
    // weil er beim Ziehen `preventDefault` ruft, und ein nicht passiver
    // `touchmove` lässt den Browser vor JEDEM Scrollbild auf JavaScript
    // warten. Er hing dauerhaft am Blatt — auch wer weit unten in einem
    // langen Blatt scrollte, scrollte damit über den Hauptthread, und wenn
    // dort gerade ein Verlauf nachgerechnet wurde, stand das Blatt still.
    if(startScrollTop <= 0 && sheet._innerScrollTopStart <= 0) zugAn();
  };
  let zugHaengt = false;
  const zugAn = () => { if(!zugHaengt){ sheet.addEventListener('touchmove',onTouchMove,{passive:false}); zugHaengt = true; } };
  const zugAb = () => { if(zugHaengt){ sheet.removeEventListener('touchmove',onTouchMove); zugHaengt = false; } };

  const onTouchMove=(e)=>{
    if(e.touches.length!==1){ onTouchCancel(); return; }
    const touch=e.touches[0];
    const dy=touch.clientY-startY;
    const dx=touch.clientX-startX;
    probe(touch.clientY);
    // (0) Wer quer wischt, meint nicht das Blatt. Ohne diese Sperre riss der
    //     Blatt-Zug jede waagerechte Bewegung an sich, sobald sie zwölf
    //     Pixel nach unten driftete — und weil er dabei preventDefault ruft,
    //     kam das waagerechte Scrollen gar nicht erst zustande. In der
    //     Laufbahn-Vitrine sah das aus, als spränge sie zurück: je weiter die
    //     Karte, desto länger der Wisch und desto sicherer die zwölf Pixel
    //     Drift — die letzte Stufe war so gar nicht zu erreichen.
    //     Entschieden wird bei der ersten wirklichen Bewegung, nicht beim
    //     ersten Pixel: die ersten paar Pixel einer Geste zeigen in jede
    //     Richtung.
    if(!dragging && !richtung && (Math.abs(dx)>6 || Math.abs(dy)>6))
      richtung = Math.abs(dx) > Math.abs(dy) ? 'quer' : 'hoch';
    if(richtung==='quer'){ zugAb(); return; }
    // (1) Wenn das äußere Sheet bereits gescrollt war → kein Swipe
    if(startScrollTop>0) return;
    // (2) Wenn ein INNERER Scroll-Container bereits gescrollt war → kein Swipe
    if(sheet._innerScrollTopStart > 0) return;
    // (3) Wenn der innere Container WÄHREND der Geste runterscrollt (= User
    //     hat innen hochgezogen, Browser scrollt die Liste runter) → auch
    //     kein Sheet-Swipe. Verhindert "Scroll-Ende → Sheet zieht mit".
    if(sheet._innerScrollEl && sheet._innerScrollEl !== sheet
       && sheet._innerScrollEl.scrollTop > 0){ zugAb(); return; }
    if(dy<0 && !dragging){ zugAb(); return; }
    if(dy<DRAG_INTENT_THRESHOLD && !dragging) return;
    if(!dragging){ dragging=true; sheet.classList.add('is-dragging'); bg.style.transition='none'; }
    if(e.cancelable) e.preventDefault();
    zugBild(dy);
  };

  const onTouchEnd=(e)=>{
    bildAb();
    zugAb();
    if(!dragging){ sheet.classList.remove('is-dragging'); return; }
    dragging=false;
    sheet.classList.remove('is-dragging');
    const touch=e.changedTouches[0];
    if(!touch){ snapOrClose(0,0); return; }
    const dy=touch.clientY-startY;
    snapOrClose(dy,tempo(touch.clientY));
  };
  const onTouchCancel=()=>{
    bildAb();zugAb();
    const gezogen=dragging;
    dragging=false;sheet.classList.remove('is-dragging');
    if(gezogen) snapOrClose(0,0);
  };

  // ── MOUSE (Desktop) ──
  const onMouseDown=(e)=>{
    // Nur auf dem Grab-Handle reagieren, nicht auf das gesamte Sheet
    const grab=document.getElementById('sheetGrab');
    if(!grab||!grab.contains(e.target)) return;
    onTouchCancel();geste++;
    startY=e.clientY;
    startScrollTop=sheet.scrollTop;
    bildAb();proben=[];probe(startY);
    dragging=true;
    sheet.classList.add('is-dragging');
    bg.style.transition='none';
    e.preventDefault();
  };

  const onMouseMove=(e)=>{
    if(!dragging) return;
    const dy=e.clientY-startY;
    probe(e.clientY);zugBild(dy);
  };

  const onMouseUp=(e)=>{
    if(!dragging) return;
    bildAb();
    dragging=false;
    sheet.classList.remove('is-dragging');
    const dy=e.clientY-startY;
    snapOrClose(dy,tempo(e.clientY));
  };

  // ── GEMEINSAME SNAP/CLOSE LOGIK ──
  function snapOrClose(dy,velocity){
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){
      sheet.style.transform='';bg.style.opacity='';
      if(dy>CLOSE_THRESHOLD || (velocity>VELOCITY_THRESHOLD && dy>=MIN_DY_FOR_VEL_CLOSE)) closeSheet();
      return;
    }
    if(dy>CLOSE_THRESHOLD || (velocity>VELOCITY_THRESHOLD && dy>=MIN_DY_FOR_VEL_CLOSE)){
      // Gibt es ein Eltern-Sheet? → NICHT hart schließen, sondern animiert eine
      // Ebene zurück (closeSheet → _animateSheetSwap übernimmt den Übergang).
      if(_sheetStack.length){ closeSheet(); return; }
      sheet.style.transition='transform .28s cubic-bezier(.4,0,1,1)';
      sheet.style.transform='translateY(100%)';
      bg.style.transition='opacity .28s';
      bg.style.opacity='0';
      // Am Ende der Transition, nicht auf Zuruf eines Timers: `closeSheet`
      // räumt auf und kann dabei einen Umbau auslösen [§C27]. Ist in der
      // Zwischenzeit ein neues Blatt aufgegangen, gehört es nicht dazu.
      const auf = sheet._auf;
      const eigeneGeste = geste;
      _afterTransition(sheet,'transform',280,()=>{
        if(sheet._auf !== auf || geste !== eigeneGeste) return;
        _sheetForceClose(sheet,bg,true);
        sheet.style.transition='';
        bg.style.transition='';
      });
    } else {
      sheet.style.transition='transform .32s cubic-bezier(.2,.8,.2,1)';
      sheet.style.transform='translateY(0)';
      bg.style.transition='opacity .32s';
      bg.style.opacity='1';
      const auf = sheet._auf;
      const eigeneGeste = geste;
      _afterTransition(sheet,'transform',320,()=>{
        if(sheet._auf !== auf || geste !== eigeneGeste) return;
        sheet.style.transition='';
        bg.style.transition='';
      });
    }
  }

  // Events registrieren
  sheet.addEventListener('touchstart',onTouchStart,{passive:true});
  sheet.addEventListener('touchend',onTouchEnd,{passive:true});
  sheet.addEventListener('touchcancel',onTouchCancel,{passive:true});

  // Mouse nur auf dem Grab-Handle
  sheet.addEventListener('mousedown',onMouseDown);
  window.addEventListener('mousemove',onMouseMove);
  window.addEventListener('mouseup',onMouseUp);

  // Cleanup wenn Sheet geschlossen wird
  const cleanup=()=>{
    bildAb();dragging=false;geste++;
    sheet.classList.remove('is-dragging');
    sheet.removeEventListener('touchstart',onTouchStart);
    zugAb();
    sheet.removeEventListener('touchend',onTouchEnd);
    sheet.removeEventListener('touchcancel',onTouchCancel);
    sheet.removeEventListener('mousedown',onMouseDown);
    window.removeEventListener('mousemove',onMouseMove);
    window.removeEventListener('mouseup',onMouseUp);
  };
  sheet._swipeCleanup=cleanup;
}

// Hintergrund-Klick schließt Sheet
document.getElementById('sheetBg').onclick=()=>{
  // Schutz-Phase respektieren (auto-getriggerte Recap-Pop-Ups).
  // Während der Schutz-Phase gibt es leichtes haptisches Feedback via
  // CSS-Klassen-Toggle, damit der User merkt: "hier passiert was, aber
  // ich muss bewusst schließen".
  const sheet=document.getElementById('sheet');
  if(sheet && sheet._protectedUntil && Date.now() < sheet._protectedUntil){
    // Optisches Mini-Bounce-Feedback statt schließen
    sheet.classList.remove('sheet-nudge');
    void sheet.offsetWidth; // Re-trigger Animation
    sheet.classList.add('sheet-nudge');
    return;
  }
  closeSheet();
};

// Badge-Popover: Backdrop-Click (außerhalb der Karte) schließt Popover.
// ESC schließt ebenfalls. Sheet darunter bleibt offen.
document.getElementById('bpBg').addEventListener('click', (e) => {
  // Nur schließen, wenn direkt der Backdrop geklickt wurde — nicht die Karte
  if(e.target.id === 'bpBg') closeBadgePopover();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    // Was oben liegt, schließt zuerst: die Auszeichnung liegt über der
    // Story, aus deren Blatt sie aufging [§8.5].
    const bpBg = document.getElementById('bpBg');
    if(bpBg && bpBg.classList.contains('show')){
      closeBadgePopover();
      return;
    }
    const ndBg = document.getElementById('ndBg');
    if(ndBg && ndBg.classList.contains('show')) closeNewsDetail();
  }
});

