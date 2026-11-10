// ╔═══ §4.1 ─── AVATAR COLORS & EMOJIS ─────────────────────────────────╗
//     Hash-basierte Farbzuweisung pro Spieler-ID. Emoji-Avatar überschreibt.
// ╚═════════════════════════════════════════════════════════════════════════╝
const AV_COLORS=['#E4F24A','#ff7849','#56b4e8','#f7cf4a','#a78bfa','#4ade80','#f0566a','#22d3ee','#fb923c','#e879f9'];
function avColor(id){let h=0;for(let i=0;i<id.length;i++)h=id.charCodeAt(i)+((h<<5)-h);return AV_COLORS[Math.abs(h)%AV_COLORS.length];}

// 54 Avatar-Optionen (29 Originale + 25 Neue)
const AVATAR_OPTIONS = [
  // Originale 29
  {id:'wolf',     em:'🐺'}, {id:'smiletear', em:'🥲'}, {id:'cloud',   em:'😶‍🌫️'},
  {id:'cold',     em:'🥶'}, {id:'poop',      em:'💩'}, {id:'clown',   em:'🤡'},
  {id:'alien',    em:'👽'}, {id:'eye',       em:'👁'},  {id:'detective',em:'🕵'},
  {id:'ninja',    em:'🥷'}, {id:'wizard',    em:'🧙‍♂️'}, {id:'zombie',  em:'🧟'},
  {id:'monkey',   em:'🐵'}, {id:'raccoon',   em:'🦝'}, {id:'pig',     em:'🐷'},
  {id:'shrimp',   em:'🦐'}, {id:'eggplant',  em:'🍆'}, {id:'coconut', em:'🥥'},
  {id:'brick',    em:'🧱'}, {id:'pumpkin',   em:'🎃'}, {id:'heel',    em:'👠'},
  {id:'unicorn',  em:'🦄'}, {id:'shark',     em:'🦈'}, {id:'eagle',   em:'🦅'},
  {id:'tropicaldrink',    em:'🍹'}, {id:'xray',      em:'🩻'}, {id:'cigarette',em:'🚬'},
  {id:'moai',     em:'🗿'}, {id:'owl',       em:'🦉'},
  // 29 Neue Avatar-Optionen
  {id:'twoface',   em:'🎭'}, {id:'bat',     em:'🦇'}, {id:'champagne',   em:'🍾'},
  {id:'juggle',   em:'🤹🏼‍♂️'}, {id:'biohazard',     em:'☣️'}, {id:'devil',   em:'😈'},
  {id:'ogre',     em:'👹'}, {id:'goblin',    em:'👺'}, {id:'dragon',  em:'🐉'},
  {id:'nuclear',   em:'☢️'}, {id:'crab',    em:'🦀'},
  {id:'frog',     em:'🐸'}, {id:'panda',     em:'🐼'}, {id:'lion',    em:'🦁'},
  {id:'mosquito',      em:'🦟'}, {id:'beer',      em:'🍺'}, {id:'sloth',   em:'🦥'},
  {id:'hedgehog', em:'🦔'}, {id:'swan',      em:'🦢'}, {id:'butterfly',em:'🦋'},
  {id:'scorpion', em:'🦂'}, {id:'burner',    em:'👨🏼‍🏭'}, {id:'snake',   em:'🐍'},
  {id:'lizard',   em:'🦎'}, {id:'gorilla',   em:'🦍'}, 
];

function avatarEmoji(avId){const a=AVATAR_OPTIONS.find(x=>x.id===avId);return a?a.em:null;}
// Rendert das Avatar-Inner (Emoji wenn gesetzt, sonst Initialen)
function avatarInnerHtml(player){
  const em = player && player.avatar_id ? avatarEmoji(player.avatar_id) : null;
  if(em) return `<span class="em">${em}</span>`;
  return initials(player.name);
}
// Zentrale Avatar-Render-Funktion für Ranglisten etc.
// player: das player-Objekt; extraStyle: zusätzliche Inline-Styles;
// opts.ring: Status-Ring (§13.7) mitrendern — bewusst opt-in, damit nicht
// jede Award-Liste und jedes Team-Sheet plötzlich bunt umrandet ist.
function avHtml(player, extraStyle, opts){
  if(!player) return '';
  let cls = '', style = '', attr = '';
  if(opts && opts.ring){
    const r = _avRingAttrs(player.id);
    if(r){ cls = r.cls; style = r.style; attr = r.attr; }
  }
  const em = player.avatar_id ? avatarEmoji(player.avatar_id) : null;
  const inner = em
    ? `<span class="av av-emoji${cls}"${attr} style="${style}${extraStyle||''}"><span class="em">${em}</span></span>`
    : `<span class="av${cls}"${attr} style="${style}background:${avColor(player.id)};${extraStyle||''}">${initials(player.name)}</span>`;
  // Das Zeichen [§4.1b] ist opt-in — sonst trügen plötzlich auch die
  // Avatare in Award-Listen und Sheets Sterne und Feuer.
  // `ins` legt zusätzlich das Wappen um den Avatar [§C27]: die Rangliste
  // zeigt damit dieselbe Form wie das Podest der Ewigen Tafel.
  if(opts && opts.ins) return insAvWrap(player.id, inner, opts);
  if(opts && opts.zn) return znWrap(player.id, inner, opts);
  return inner;
}
function initials(n){return n.trim().slice(0,2).toUpperCase();}

// ╔═══ §4.2 ─── AWARD AVATAR HELPER (Hero/Mini/Li) ─────────────────────╗
//     awHeroAv, awLiAv etc. — einheitliche Avatar-Rendering-Funktionen für
//     Award-Details, Pair-Avatare für Team-Awards.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Neue Avatar-Hilfsfunktionen für Award-Listen
// aw-li-av ist 34px, in tied-rows ist sie 30px.
// Für ein Wappen ist das zu klein — bei 34px bliebe vom Gesicht ein Punkt
// von 15px, „Detail folgt der Größe" [§4.1b]. Die SERIE passt trotzdem
// hinein: sie liegt hinter dem Kreis und braucht keine Fläche, nur Rand.
// Damit brennt jemand, der brennt, auch in der Award-Liste.
function awLiAv(pid, isTiedRow = false, schande = false){
  const p=pmap()[pid];
  const px = isTiedRow ? 30 : 34;
  const sizeStyle = isTiedRow ? 'width:30px;height:30px;font-size:16px;' : '';
  if(!p) return `<div class="aw-li-av" style="background:var(--surface3);color:var(--muted);${sizeStyle}">?</div>`;
  const em=p.avatar_id?avatarEmoji(p.avatar_id):null;
  const kreis = em
    ? `<div class="aw-li-av has-emoji" style="background:var(--surface3);color:inherit;${sizeStyle}">${em}</div>`
    : `<div class="aw-li-av" style="background:${avColor(p.id)};${sizeStyle}">${esc(initials(p.name))}</div>`;
  // Auf der Schandtafel brennt nichts: dort ist alles rot, und eine
  // orange Flamme wäre in einer Liste der schlechtesten Quoten ein Lob.
  const f = !schande ? znFeuer(pid) : 0;
  if(!f || typeof znWrap !== 'function') return kreis;
  return znWrap(pid, kreis, {px:px, titel:0, klasse:'aw-li-zn'});
}
// Ein Duo hat keinen Rang und keine gemeinsame Serie — zwei Kreise [§C27].
function awLiPair(p1,p2, isTiedRow = false){
  return `<div class="aw-li-pair">${awLiAv(p1, isTiedRow, true)}${awLiAv(p2, isTiedRow, true)}</div>`;
}

// Großer Hero-Avatar (82px) für die Winner/Schandfleck-Box
// schande=true lässt das Wappen weg: eine Schandtafel-Karte ist absichtlich
// grau und rot, ein glänzender Reif mit brennender Serie wäre dort eine
// Auszeichnung. Sonst trägt der Held dasselbe Zeichen wie überall [§C27].
function awHeroAv(pid, schande){
  const p=pmap()[pid];
  if(!p) return '<div class="aw-winner-av" style="background:var(--surface3);color:var(--muted)">?</div>';
  if(!schande) return avHtml(p, '', {ins:true, px:96, klasse:'aw-winner-rav'});
  const em=p.avatar_id?avatarEmoji(p.avatar_id):null;
  if(em) return `<div class="aw-winner-av has-emoji">${em}</div>`;
  return `<div class="aw-winner-av" style="background:${avColor(p.id)}">${esc(initials(p.name))}</div>`;
}
// Ein Duo hat keinen Rang, also kein Wappen — zwei überlappende Kreise
// sagen „diese beiden zusammen" [§C27].
function awHeroPair(p1,p2){
  return `<div class="aw-winner-pair">${awHeroAv(p1,true)}${awHeroAv(p2,true)}</div>`;
}


// ╔═══ §4.3 ─── NAVIGATION (Tabs/Filter/Zurück-Taste) ─────────────────╗
//     tab, period, awView und die übrigen Ansichtsvariablen aus 01-update.js
//     steuern, was render() zeichnet; ein Reiterwechsel geht durch
//     _renderNachEingabe (docs/laufzeit.md).
// ╚═════════════════════════════════════════════════════════════════════════╝
// Dieselbe Zeichensprache wie der Katalog [§C27]: Linien mit Rand im
// 24er-Raster, keine gefüllten Kästen. Die Liga war drei Rechtecke, der
// Verlauf lief bis an den Rand der Fläche.
const NAV=[
  ['ranking','Liga',`<path d="M5 20V11M10 20V5M15 20v-7M20 20V8"/>`],
  ['positions','Seiten',`<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M3.5 12h17M5 7.5h14M5 16.5h14M12 7.5v9"/>`],
  ['awards','Awards',`<path d="M8 4h8v5.5a4 4 0 01-8 0z"/><path d="M8 6H5.5a.5.5 0 00-.5.5V8a3 3 0 003 3M16 6h2.5a.5.5 0 01.5.5V8a3 3 0 01-3 3"/><path d="M12 13.5V17M8.5 20h7M10 17h4"/>`],
  ['teams','Teams',`<circle cx="8.5" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14.5 14.2c.5-.1 1-.2 1.5-.2 2.3 0 4.2 1.6 4.8 4.5"/>`],
  ['history','Verlauf',`<path d="M4 12a8 8 0 102.3-5.6"/><path d="M4 5v3.5h3.5"/><path d="M12 8v4l2.5 2"/>`]
];
function renderNav(){
  const nav=document.getElementById('botnav');
  // Die fuenf Knoepfe bleiben stehen: Fokus, Listener und SVGs muessen bei
  // einem Filterwechsel nicht jedes Mal neu entstehen.
  if(!nav.firstElementChild || nav._navKnoop!==nav.firstElementChild){
  nav.innerHTML=NAV.map(([id,lb,ic])=>
    `<button data-nav="${id}" class="${tab===id?'on':''}">
      <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${ic}</svg></span>
      <span class="lb">${lb}</span></button>`).join('');
  // Beim Tabwechsel zurück auf heute: wer den Liga-Tab neu betritt, will den
  // aktuellen Stand sehen und nicht den Juni, den er vor zehn Minuten
  // nachgeschlagen hat. Dasselbe gilt für die Duo-Ansicht.
  // awPeriod muss hier mit zurück: 'all' ist kein Reiter mehr, kann aber
  // als Wert im Zustand stehen, wenn vorher ein Award-Blatt aus einem
  // Team-Profil offen war. Ohne das Zurücksetzen stünde der Awards-Tab auf
  // einem Zeitraum, für den es keinen Knopf gibt — und keiner der beiden
  // Reiter sähe eingeschaltet aus.
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{
    _reiterSetzen(b.dataset.nav);
    if(tab==='ranking'){ _ladeStart('daten'); _ligaAktualisieren(); }});
  nav._navKnoop=nav.firstElementChild;
  }
  document.querySelectorAll('[data-nav]').forEach(b=>{
    const aktiv=tab===b.dataset.nav;
    b.classList.toggle('on',aktiv);
    if(aktiv)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
  // FAB nur außerhalb des Match-Tabs sinnvoll: dort führt er auf die Seite,
  // auf der man schon ist, und lag über dem Knopf „Mischen".
  document.getElementById('fab').style.display = tab==='match' ? 'none' : 'grid';
  _navSchlitten();
  _zurueckAbgleichen();
}
function _reiterSetzen(id){
  tab=id;teamSearch='';ligaSeasonId=null;ligaSicht='spieler';
  awPeriod='season';awSeasonId=null;awWeekStart=null;rekKammer='';einblickOffen='';
  window.scrollTo(0,0);_renderNachEingabe();
}

// ── Die Zurück-Taste ─────────────────────────────────────────────────
// Die App ist eine einzige Seite, und der Verlauf des Browsers kannte nur
// sie: die Zurück-Taste des Telefons schloss nicht das offene Blatt,
// sondern die ganze App, auch aus einem Profil drei Blätter tief. Solange
// es etwas gibt, wohin „zurück" führt — ein Dialog, ein Popover, eine
// Story, ein Blatt, ein anderer Reiter als die Liga —, liegt deshalb genau
// EIN eigener Eintrag im Verlauf. Die Taste nimmt ihn weg, die App geht
// einen Schritt zurück und legt ihn wieder hin, wenn danach noch etwas
// offen ist. Ein Eintrag je Blatt wäre genauer, aber jeder Weg, der ohne
// die Taste schließt (Wischen, Knopf, Löschen), müsste dann mitzählen, und
// ein Fehler darin schickte die Taste aus der App.
let _zurueckEintrag = false;  // liegt der eigene Eintrag im Verlauf?
let _zurueckEigene = 0;       // so viele `popstate` hat die App selbst ausgelöst
let _zurueckPlan = 0;
function _zurueckZeigt(id){
  const e = document.getElementById(id);
  return !!(e && e.classList.contains('show'));
}
// Was gerade offen ist: ein Dialog, ein Popover, eine Story, ein Blatt
// oder ein Formular, in das jemand schreibt. Was sich von selbst öffnet —
// Monat, Woche, Abschied [§C31] —, deckt nichts davon zu. Der Monat prüfte
// es gar nicht und ging 600 ms nach einem Datenabruf über das Bearbeiten
// einer Partie auf, das Formular war weg; Woche und Abschied sahen nur nach
// dem Blatt.
function _etwasOffen(){
  return !!document.querySelector('.dlg-bg.show') || _zurueckZeigt('bpBg') || _zurueckZeigt('ndBg')
    || _zurueckZeigt('sheetBg') || _eingabeOffen();
}
function _zurueckOffen(){
  return _etwasOffen() || tab !== 'ranking';
}
// Abgeglichen wird nach der laufenden Aufgabe. Schließen und Öffnen folgen
// oft direkt aufeinander (eine Story schließt, das Profil daraus öffnet),
// und `history.back()` wirkt erst später: sofort abgeglichen, nähme es den
// Eintrag, den das neue Blatt im selben Zug hingelegt hat.
function _zurueckAbgleichen(){
  if(_zurueckPlan) return;
  _zurueckPlan = setTimeout(() => {
    _zurueckPlan = 0;
    try {
      const offen = _zurueckOffen();
      if(offen && !_zurueckEintrag){ history.pushState({kicker:'zurueck'}, ''); _zurueckEintrag = true; }
      else if(!offen && _zurueckEintrag){ _zurueckEintrag = false; _zurueckEigene++; history.back(); }
    } catch(e){}
  }, 0);
}
// Ein Schritt, von oben nach unten: was zuletzt aufging, schließt zuerst.
// Ein Blatt geht eine Ebene zurück wie sein Schließknopf, ein Dialog
// antwortet „nein", ein anderer Reiter führt zur Liga.
function _zurueckSchritt(){
  const nein = document.querySelector('.dlg-bg.show [data-dlg="0"]');
  if(nein){ nein.click(); return; }
  if(_zurueckZeigt('bpBg')){ closeBadgePopover(); return; }
  if(_zurueckZeigt('ndBg')){ closeNewsDetail(); return; }
  if(_zurueckZeigt('sheetBg')){ closeSheet(); return; }
  if(tab !== 'ranking') _reiterSetzen('ranking');
}
try {
  // Nach einem Neuladen kann die Seite auf dem alten Eintrag stehen; er
  // gehört dem vorigen Lauf und ist hier nichts, wohin zurück führt.
  if(history.state && history.state.kicker) history.replaceState(null, '');
  window.addEventListener('popstate', () => {
    if(_zurueckEigene > 0){ _zurueckEigene--; return; }
    if(!_zurueckEintrag) return;
    _zurueckEintrag = false;
    _zurueckSchritt();
    _zurueckAbgleichen();
  });
} catch(e){}

let _ligaRefreshAuftrag=null;
function _ligaAktualisieren(){
  // Auch der schon aktive Liga-Knopf aktualisiert. Erst nach der sichtbaren
  // Rückmeldung beginnen die bestehenden vier Abfragen, niemals ein Reload.
  // Ein Tap-Burst teilt genau EINEN Auftrag bis zum Ende seines Abrufs.
  // War vorher schon ein anderer Abruf offen, fordert loadAll einmal frisch
  // nach; weitere Liga-Taps können diesen Folgelauf nicht endlos erneuern.
  if(_ligaRefreshAuftrag) return;
  const a={frame:0,timer:0};_ligaRefreshAuftrag=a;
  a.frame=requestAnimationFrame(()=>{
    a.timer=setTimeout(()=>{
      Promise.resolve().then(()=>loadAll({leise:true})).catch(e=>{
        console.warn('Liga aktualisieren:',e);
      }).finally(()=>{if(_ligaRefreshAuftrag===a) _ligaRefreshAuftrag=null;});
    },0);
  });
}

function _eingabeOffen(){
  const root=document.getElementById('main');
  return (tab==='match' || tab==='settings') && root._renderTab===tab
    && !!root.firstElementChild && root._renderNode===root.firstElementChild;
}
let _renderAuftrag=null;
function _renderAuftragAbbrechen(){
  const a=_renderAuftrag;
  if(!a)return;
  _renderAuftrag=null;
  cancelAnimationFrame(a.frame);clearTimeout(a.timer);
  a.root.inert=a.inert;
  if(a.busy===null)a.root.removeAttribute('aria-busy');else a.root.setAttribute('aria-busy',a.busy);
}
function _renderNachEingabe(){
  // Ein kalter Reiter kann länger als ein Bild rechnen. Der gewählte Knopf
  // muss trotzdem sofort antworten. rAF ALLEIN liegt noch vor dem Malen:
  // erst die Aufgabe danach baut die Ansicht. Mehrere Taps teilen einen
  // Auftrag und zeichnen nur die letzte Absicht, nicht jede Zwischenstation.
  renderNav();
  const root=document.getElementById('main');
  if(_renderAuftrag && _renderAuftrag.root!==root)_renderAuftragAbbrechen();
  let a=_renderAuftrag;
  if(!a){
    a={root,inert:root.inert,busy:root.getAttribute('aria-busy'),frame:0,timer:0};
    _renderAuftrag=a;
    a.frame=requestAnimationFrame(()=>{
      if(_renderAuftrag!==a)return;
      a.timer=setTimeout(()=>{
        if(_renderAuftrag!==a)return;
        const aktuell=document.getElementById('main')===a.root;
        _renderAuftragAbbrechen();
        if(aktuell)render();
      },0);
    });
  }
  root.setAttribute('aria-busy','true');
  // Ein Reiter oder eine Ansicht darin, gewählt durch ein Tippen, baut sich
  // auf; rechnet sie länger, überbrücken Schleier und Ladelinie [§C43].
  if(root._renderTab) _wechselBeginnt(root._renderTab!==tab);
  // Nur beim Wechsel des Reiters: die alte Ergebnisliste darf kein Profil
  // oder Match mehr öffnen. Filter derselben Ansicht bleiben bedienbar,
  // damit ein zweiter schneller Tap seine erste Wahl ersetzen kann.
  root.inert=root._renderTab!==tab || a.inert;
}

function render(){
  // Direkte Aktualisierungen (z.B. Datenladen) besitzen Vorrang. Ein alter
  // Frame darf danach weder Formulare ersetzen noch Eingaben wieder sperren.
  _renderAuftragAbbrechen();
  renderNav();
  const v={ranking:vRanking,positions:vPositions,awards:vAwards,teams:vTeams,history:vHistory,match:vMatch,settings:vSettings}[tab];
  const root=document.getElementById('main');
  const html=`<section class="view active">${v()}</section>`;
  // Nur die letzte Anzeige, keine wachsende Sammlung von HTML je Filter.
  // Die Vorlage wird weiter ausgewertet (auch zeitabhaengige Werte). Nur
  // unveraendertes Markup UND dieselbe Datenversion duerfen Knoten/Bindings
  // behalten. Formulare werden absichtlich immer frisch gebunden.
  const behalten=tab!=='match' && tab!=='settings'
    && root._renderVersion===_cache.version && root._renderHtml===html
    && root._renderNode===root.firstElementChild && !!root.firstElementChild;
  const warTab=root._renderTab;
  // Das Gerüst des ersten Starts blendet über der Liga aus [§C43].
  const geruest=!warTab && root.firstElementChild && root.firstElementChild.classList.contains('geruest')
    ? root.firstElementChild : null;
  if(!behalten){
    // Das Licht an den Kanten läuft über neue Daten hinweg weiter [§C43] —
    // nicht über einen Wechsel: die Woche ist eine andere Liste als die
    // Saison, und ihr Platz 1 bekam sonst zum eigenen Licht das alte dazu.
    const licht=warTab===tab&&_wechselZiel!==tab?_lichtMerken(root):null;
    root.innerHTML=html;
    bind();
    root._renderHtml=html;
    root._renderVersion=_cache.version;
    root._renderNode=root.firstElementChild;
    if(licht&&licht.length)_lichtZurueck(root,licht);
  }
  root._renderTab=tab;
  schlittenFahren(root);
  _bewegungNachRender(root, warTab, geruest, behalten);
}

// ── Der Schlitten fährt [§C27] ──────────────────────────────────────
// Wo die Wahl eines Segmentwählers steht, rechnet das CSS aus Zahl und
// Lage der Knöpfe (:has). Nur fahren kann es nicht: jeder Wechsel zeichnet
// die Ansicht neu, und ein neues Element hat keine alte Lage, von der aus
// es gleiten könnte. Deshalb merkt sich der Druck auf einen Knopf, wo der
// Schlitten stand, und nach dem Neuzeichnen startet er dort — dann ändert
// sich `--i` einmal, und die Transition im CSS trägt ihn hinüber.
// Zugeordnet wird über die Beschriftung der Knöpfe: zwei Wähler mit
// denselben Wörtern sind derselbe Wähler.
let _schlittenVorher = null;
function _schlittenSig(w){ return [...w.children].map(b => b.textContent.trim()).join('|'); }
function _schlittenLage(w){ return [...w.children].findIndex(b => b.classList && b.classList.contains('on')); }
document.addEventListener('pointerdown', e => {
  const b = e.target && e.target.closest && e.target.closest('.ui-switch > button, .ui-tabs > button');
  _schlittenVorher = null;
  if(!b || b.parentElement.classList.contains('roll')) return;
  const w = b.parentElement, alt = _schlittenLage(w);
  if(alt >= 0) _schlittenVorher = {sig:_schlittenSig(w), alt};
}, true);
// Fuhr der Schlitten schon vor dem Neuzeichnen los (`_wahlSofort`, seit
// `t0`), fährt der neue dort weiter, wo der alte gerade war: die Transition
// beginnt um die vergangene Zeit später. Sonst sprang er mitten in der
// Fahrt ans Ziel, sobald die neue Ansicht stand.
function schlittenFahren(root){
  const v = _schlittenVorher; _schlittenVorher = null;
  if(!v || !root) return;
  const vergangen = v.t0 ? performance.now() - v.t0 : null;
  root.querySelectorAll('.ui-switch:not(.roll), .ui-tabs:not(.roll)').forEach(w => {
    if(_schlittenSig(w) !== v.sig) return;
    const neu = _schlittenLage(w);
    if(neu < 0 || neu === v.alt) return;
    w.style.setProperty('--i', v.alt);
    void w.offsetWidth;
    w.style.removeProperty('--i');
    if(vergangen != null && w.getAnimations) w.getAnimations({subtree:true}).forEach(a => {
      if(a.transitionProperty === 'transform') a.currentTime = vergangen;
    });
  });
}

// ╔═══ §4.4 ─── ZEITRÄUME (Saison/Woche/Gesamt) ────────────────────────╗
//     periodStart() liefert den Beginn des Zeitraums (Saison, Woche, Tag),
//     matchesInPeriod() die Partien darin.
// ╚═════════════════════════════════════════════════════════════════════════╝
function periodStart(period){
  const now=new Date();
  if(period==='season') return seasonStart();
  if(period==='week') return wochenBeginn(now);
  if(period==='day'){ const d=new Date(now); d.setHours(0,0,0,0); return d; }
  return null; // all
}
// seasonId ist optional und gilt nur für period==='season': damit kann der
// Liga-Tab eine ABGESCHLOSSENE Saison zeigen, ohne dass Awards, News oder
// Ambient etwas davon mitbekommen. Ohne Angabe bleibt alles wie bisher —
// die laufende Saison. Die Saison gehört in den Cache-Schlüssel, sonst
// liefert der zweite Aufruf die Matches der ersten Saison zurück.
function matchesInPeriod(period, seasonId){
  const sid=period==='season'?(seasonId||currentSeason().id):'';
  const start=period==='season'?null:periodStart(period);
  // Tag/Woche koennen wechseln, ohne dass eine Partie oder Version folgt.
  const key='mperiod_'+period+'_'+sid+'_'+(start?start.getTime():'')+'_'+matches.length+'_'+_cache.version;
  if(!_cache._mperiod) _cache._mperiod={};
  if(_cache._mperiod[key]) return _cache._mperiod[key];
  // Mit der Version im Schluessel waechst der Topf sonst ueber jede Version mit.
  _topfDeckel(_cache._mperiod, 40);
  let result;
  if(period==='season') result=matchesInSeason(sid);
  else{
    const ab=start?start.getTime():null;
    result=start?matches.filter(m=>mts(m)>=ab):matches;
  }
  _cache._mperiod[key]=result;
  return result;
}

function periodLabel(period, seasonId){
  const now=new Date();
  if(period==='season'){ return seasonLabel(seasonId||currentSeason().id); }
  if(period==='week'){ const s=periodStart('week');
    return 'KW '+isoWeek(now)+' · ab '+datumFmt(s, 'tm'); }
  if(period==='day'){ const s=periodStart('day');
    return s.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}); }
  return 'Gesamte Liga';
}
// ── Der Saisonwähler ──────────────────────────────────────────────────
// Ein Bauteil für Awards und Liga: dieselbe Liste, dieselbe Beschriftung,
// dieselbe Kennzeichnung der laufenden Saison. Gibt es nur eine Saison,
// gibt es auch nichts zu wählen und nichts anzuzeigen.
//
// Die Saisons stehen in einer Reihe, links die laufende, nach rechts zurück:
// die aktuelle interessiert am häufigsten, und links fängt das Lesen an.
// Ein <select> konnte das nie — es zeigte immer nur einen Eintrag, und wie
// viele Saisons es überhaupt gibt, erfuhr man erst nach dem Antippen.
//
// Die Reihe ist NICHT der Filterstreifen der App: sie wählt keine Ansicht und
// filtert auch nicht innerhalb einer, sie verschiebt den Zeitpunkt, von dem
// alles darunter handelt. Als .ui-tabs stand sie zwischen zwei echten
// Reiterstreifen und war von ihnen nicht zu unterscheiden — drei gleich
// aussehende Zeilen übereinander, und keine sagte mehr, wofür sie zuständig
// ist. Davor war sie eine Zeitleiste mit Knoten und Verbindungsstrich, die
// aussah wie ein Diagramm und nicht wie etwas, das man antippt.
//
// `id` bleibt erhalten, weil zwei Ansichten dasselbe Bauteil einsetzen und
// 20-bind.js die Auswahl je Einsatzort auf eine andere Zustandsvariable legt.
// opts.liste  — andere Auswahl als „alle Saisons" (der Rückblick kennt nur
//               abgeschlossene Monate; der laufende hat keinen).
// opts.attr   — anderer Datenname, damit die Bindung im Liga-Tab nicht auch
//               den Wähler in einem offenen Blatt umschaltet.
function saisonWaehlerHtml(id, gewaehlt, opts){
  opts=opts||{};
  const liste=opts.liste||availableSeasons();
  if(liste.length<2) return '';
  const attr=opts.attr||'saisonwahl';
  const cur=currentSeason().id;
  const sel=gewaehlt||cur;
  return `<div class="saisonwahl" id="${id}" role="tablist" aria-label="Saison wählen">${
    liste.map(sid=>{
      // „September 2026" → „Sep 26": in einem Segment ist Platz für einen
      // Monat, nicht für einen Satz. Der volle Name steht im title.
      const teil=String(seasonLabel(sid)).split(' ');
      const kurz=teil[0].slice(0,3)+' '+String(teil[1]||'').slice(-2);
      return `<button type="button" class="${sid===sel?'on':''}" role="tab"
        aria-selected="${sid===sel}" data-${attr}="${esc(sid)}"
        title="${esc(seasonLabel(sid))}${sid===cur?' · läuft':''}">${
        sid===cur?'<i class="sw-live"></i>':''}${esc(kurz)}</button>`;
    }).join('')}</div>`;
}

// Der Wochentag mit Montag als 0. `getDay()` zählt ab Sonntag; die Liga
// rechnet Wochen ab Montag, und `(getDay()+6)%7` stand dafür an sieben
// Stellen ausgeschrieben.
function wochentagMo(d){ return (d.getDay() + 6) % 7; }
// Montag 00:00 Ortszeit der Woche, in der `d` liegt. Dieselbe Grenze für
// den Zeitraum „Woche", den Wochenrückblick und die Wochen des Feeds.
function wochenBeginn(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  x.setDate(x.getDate() - wochentagMo(x));
  return x;
}
// Der Schlüssel eines Paars, ob Duo oder zwei Gegner: sortiert, damit A|B
// und B|A derselbe sind. Stand 34 Mal ausgeschrieben; alle Töpfe für Duos,
// Rivalitäten und Teamstatistik hängen an genau dieser Schreibweise.
function paarKey(a, b){ return [a, b].sort().join('|'); }
function isoWeek(d){
  const date=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum=(date.getUTCDay()+6)%7; date.setUTCDate(date.getUTCDate()-dayNum+3);
  const firstThu=new Date(Date.UTC(date.getUTCFullYear(),0,4));
  const fd=(firstThu.getUTCDay()+6)%7; firstThu.setUTCDate(firstThu.getUTCDate()-fd+3);
  return 1+Math.round((date-firstThu)/(7*24*3600*1000));
}

