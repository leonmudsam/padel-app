// ─── §11.3 — LocalStorage (Read-State) ───────────────────────────────
// Ring-Buffer-Pattern: max 200 IDs werden gespeichert, älteste fallen raus.
// Lesen ist O(N), Schreiben ist O(N) (Array-Operations). Bei N=200 vernachlässigbar.
function _newsLoadSeen(){
  try {
    const raw = localStorage.getItem(NEWS_LS_SEEN);
    if(!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch(e){ return new Set(); }
}
function _newsSaveSeen(set){
  try {
    // Ring-Buffer: bei Überlauf älteste IDs verwerfen (chronologische Reihenfolge
    // = Einfüge-Reihenfolge → Set-Iteration garantiert das in JS).
    let arr = [...set];
    if(arr.length > NEWS_LS_MAX_SEEN) arr = arr.slice(-NEWS_LS_MAX_SEEN);
    localStorage.setItem(NEWS_LS_SEEN, JSON.stringify(arr));
  } catch(e){}
}
// Die Ewige Tafel ist die einzige Karte, deren Tages-ID stabil bleibt,
// waehrend sie im Lauf des Tages neue Wechsel aufnimmt. Fuer sie ist deshalb
// nicht nur die ID, sondern die sichtbare Fassung der Lesebeleg. Sonst blieb
// eine um weitere Rekorde ergaenzte Karte "gelesen", nur weil ihre fruehere
// Fassung schon geoeffnet worden war.
function _newsIstRollendeTafel(s){
  const d = (s && s.dataRef) || {};
  return d.type === 'sammel' && d.quelle === 'tafel' && Array.isArray(d.teile);
}
function _newsSeenKey(s){
  if(!s || typeof s !== 'object') return String(s || '');
  if(!_newsIstRollendeTafel(s)) return String(s.id || '');
  const d = s.dataRef || {};
  const letzter = d.teile.reduce((mx, t) => Math.max(mx, Number(t && t.ms) || 0),
    new Date(s.when).getTime() || 0);
  return `${s.id}@${letzter}@${d.teile.length}`;
}
function _newsMarkSeen(items){
  const seen = _newsLoadSeen();
  const list = Array.isArray(items) ? items : [items];
  list.forEach(item => {
    const key = _newsSeenKey(item);
    if(key) seen.add(key);
  });
  _newsSaveSeen(seen);
}
// Der Lesestand: der Zeitpunkt der neuesten Karte, die beim letzten
// „Alles gelesen" im Feed stand [§11.3].
function _newsLesestand(){
  try { return Number(localStorage.getItem(NEWS_LS_STAND)) || 0; } catch(e){ return 0; }
}
// Eine Karte gilt als gelesen, wenn ihre ID in der Liste steht ODER ihr
// Zeitpunkt vor dem Lesestand liegt. Beides ist noetig: die Liste kennt nur,
// was auf dem Bildschirm stand, und der Feed zeigt nicht jeden Tag dieselbe
// Auswahl — ein Deckel, eine gleichlautende Schlagzeile oder eine ablaufende
// Sperrfrist schieben eine Karte spaeter doch noch herein. Sie stand dann
// unter einem Tag, den der Leser schon gelesen hat, und war trotzdem als neu
// markiert.
function _newsGelesen(s, seen, stand){
  if(!s) return true;
  // Bei der rollenden Tages-Tafel darf eine gelesene alte Fassung die neue
  // nicht verschlucken. Alle unveraenderlichen Stories behalten den billigen
  // ID-Lookup und damit ihren bisherigen Lesestand.
  const key = _newsSeenKey(s);
  if(seen && seen.has(key)) return true;
  if(!_newsIstRollendeTafel(s) && seen && seen.has(s.id)) return true;
  return !!stand && new Date(s.when).getTime() <= stand;
}
function _newsMarkAllSeen(){
  const stories = getStoriesCache();
  _newsMarkSeen(stories);
  // Der Lesestand wandert auf die neueste Karte des Feeds. Alles, was
  // danach kommt, ist neu; alles davor ist gelesen, auch wenn es erst
  // spaeter im Feed erscheint.
  const neuste = stories.reduce((mx, s) =>
    Math.max(mx, new Date(s.when).getTime() || 0), 0);
  if(neuste) try { localStorage.setItem(NEWS_LS_STAND, String(neuste)); } catch(e){}
}
function newsUnreadCount(){
  const stories = getStoriesCache();
  const seen = _newsLoadSeen();
  const stand = _newsLesestand();
  return stories.filter(s => !_newsGelesen(s, seen, stand)).length;
}

// ─── §11.4 — Header-Badge-Refresh ────────────────────────────────────
// Wird nach loadAll() und nach gezielten UI-Aktionen aufgerufen.
// Stellt die News-Pille und ihre Zahl der ungelesenen Stories ein.
// Zusätzlich (v8.1): zeigt einmalig den "X neue Stories"-Toast, wenn neue
// Stories vorliegen und der Cooldown abgelaufen ist.
function newsBadgeRefresh(){
  const btn = document.getElementById('newsBtn');
  const badge = document.getElementById('newsBtnBadge');
  if(!btn || !badge) return;
  // Bis hierher stand die Pille als Gerüst da [§C43]; jetzt kommt ihr Inhalt.
  const pilleNeu = btn.classList.contains('wartet');
  btn.classList.remove('wartet');
  // v8.2: erste Aufruf nach Page-Load → Boot-Grace setzen, damit der
  // Toast den Auto-Recaps Vorrang gibt.
  if(!_newsBootGuardSet){
    _newsBootGuardSet = true;
    _newsBootGuardUntil = Date.now() + NEWS_BOOT_GRACE_MS;
    // Nach Ablauf der Grace einmal nachversuchen
    setTimeout(() => { try { _processDeferredNewsToast(); } catch(e){} }, NEWS_BOOT_GRACE_MS + 100);
  }
  let n = 0;
  try { n = newsUnreadCount(); } catch(e){ n = 0; }
  if(pilleNeu) _pilleKommt(btn, n > 0);
  if(n > 0){
    // Ohne leeres style-Attribut: das Markup bleibt dasselbe wie ohne Zahl.
    badge.style.display = '';
    if(badge.getAttribute('style') === '') badge.removeAttribute('style');
    badge.textContent = n > 9 ? '9+' : String(n);
    // Toast nur bei "echten" Neuigkeiten (nicht bei jedem Refresh)
    _maybeShowNewsToast(n);
  } else {
    badge.style.display = 'none';
    // Falls alles gelesen → Toast sofort ausblenden (Zustände konsistent) UND
    // einen evtl. für den Sheet-Close gequeuten Toast verwerfen (v9.5-Fix),
    // damit nach „alle gelesen" + schnellem Schließen kein „X neue Stories"
    // mehr aufpoppt.
    _newsToastDeferredCount = 0;
    try { _hideNewsToast(); } catch(e){}
  }
}
// Global verfügbar machen, damit loadAll und onclick-Handler dranzukommen
window.newsBadgeRefresh = newsBadgeRefresh;

// ─── §11.4b — Toast-Logik (v8.1, erweitert v8.2) ─────────────────────
// Cooldown-basierter Hinweis "X neue Stories" unter dem News-Icon.
//
// Defer-Logik (v8.2): Toast darf NICHT erscheinen, solange ein Sheet
// (Saison-/POTW-/POTD-Recap, Profil etc.) offen ist — sonst überdeckt
// das Recap den Toast und der User sieht ihn nie. Stattdessen wird die
// Anzeige gequeued und beim closeSheet() erneut versucht.
//
// Cooldown gegen Spam (zweistufig):
//   1. unread > zuletzt gezeigte Anzahl  → es gibt WIRKLICH mehr Stories
//   2. ODER seit letztem Toast > 6h verstrichen → erneut sanft erinnern
// Auto-hide nach 4s. Tap → Mini-Popup.
let _newsToastHideTimer = null;
let _newsToastDeferredCount = 0; // wartet auf Sheet-Close
// v8.2: Boot-Grace gegen Race-Condition mit Auto-Recaps.
//   Saison-Recap   → 600ms nach loadAll
//   POTW-Recap     → 900ms
//   POTD-Recap     → 1200ms
// → Für 2500ms nach erstem newsBadgeRefresh wird Toast ZURÜCKGESTELLT,
//   damit Recaps Vorrang haben. _processDeferredNewsToast (closeSheet-Hook)
//   holt ihn nach. Das macht Recaps + Toast nacheinander statt überlappend.
let _newsBootGuardSet = false;
let _newsBootGuardUntil = 0;
const NEWS_BOOT_GRACE_MS = 2500;
function _newsLoadToastState(){
  try {
    const raw = localStorage.getItem(NEWS_LS_TOAST);
    if(!raw) return {lastCount: 0, lastTs: 0};
    const o = JSON.parse(raw);
    return {lastCount: o.lastCount|0, lastTs: o.lastTs|0};
  } catch(e){ return {lastCount: 0, lastTs: 0}; }
}
function _newsSaveToastState(state){
  try { localStorage.setItem(NEWS_LS_TOAST, JSON.stringify(state)); } catch(e){}
}
// True, wenn aktuell ein Sheet offen ODER ein Recap in Schutz-Phase
// ODER die Boot-Grace-Period noch läuft. Während Boot-Grace warten wir,
// damit Auto-Recaps (Saison/POTW/POTD) ihre 600-1200ms-Verzögerung sicher
// nutzen können, BEVOR der Toast erscheint.
function _isSheetActive(){
  try {
    // Boot-Grace: Toast erst nach Recap-Trigger-Fenster zulassen
    if(_newsBootGuardUntil && Date.now() < _newsBootGuardUntil) return true;
    const sheet = document.getElementById('sheet');
    if(sheet && sheet.classList.contains('show')) return true;
    // Auch wenn das Sheet gleich auftaucht (Schutz-Phase aktiv) → warten
    if(sheet && sheet._protectedUntil && Date.now() < sheet._protectedUntil) return true;
  } catch(e){}
  return false;
}
// ── Der Hinweis „x neue Stories" [§C33] ─────────────────────────────
// Zwei Zeilen: „15 neue Stories" neben einem Zeichen in Acid, das beim
// Erscheinen aufspringt, zweimal kippt und funkelt und dann still steht
// [§C43] — die Zahl stand vorher allein auf der Marke, und „neue Stories"
// daneben las sich als zweiter Satz.
// darunter leise die Schlagzeile der wichtigsten ungelesenen Story mit einem
// Punkt in der Farbe ihrer Karte. Vorher stand er in einer Zeile mit
// Zeichen und Lichtlauf alle vier Sekunden; ein Entwurf danach trug einen
// Strich je Story, Gesichter, Rubrik und eine ablaufende Linie — zu viel für
// wenige Sekunden. Die wichtigste wählt die Ordnung des Feeds: Breaking,
// dann wichtig, dann Priorität, dann die neueste — nie ein Name. Breaking
// und die negative Richtung sind rot [§C25].
function _newsHinweisStory(){
  const seen = _newsLoadSeen(), stand = _newsLesestand();
  const gewicht = s => (_isBreaking(s) ? 4 : 0) + (_isImportant(s) ? 2 : 0);
  const vor = (a, b) => gewicht(a) - gewicht(b) || (a.prio | 0) - (b.prio | 0) || new Date(a.when) - new Date(b.when);
  let top = null;
  for(const s of getStoriesCache()) if(!_newsGelesen(s, seen, stand) && (!top || vor(s, top) > 0)) top = s;
  return top;
}
function _newsToastFuellen(txt, n){
  const top = _newsHinweisStory();
  const ton = top ? (_isBreaking(top) || _newsIstNegativ(top) ? 'nh-rot' : _newsTonKlassen(top, 'nd')) : '';
  txt.innerHTML = `<span class="nh"><span class="nh-ic" aria-hidden="true">`
    + `<svg class="nh-blatt" viewBox="0 0 24 24">${icPfad('newspaper')}</svg>`
    + `<svg class="nh-funke" viewBox="0 0 24 24">${icPfad('funkeln')}</svg></span><span class="nh-text">`
    + `<b class="nh-wort"><span class="num">${n > 99 ? '99+' : n}</span> ${n === 1 ? 'neue Story' : 'neue Stories'}</b>`
    + (top ? `<span class="nh-zeile ${ton}"><i></i><span>${esc(top.title || '')}</span></span>` : '')
    + '</span></span>';
}
// Zeigen, von wo auch immer: aus `_maybeShowNewsToast` oder nachgeholt nach
// einem Blatt. Der erste Hinweis nach dem Öffnen steht länger.
let _newsToastSchonDa = false;
function _newsToastZeigen(n){
  const toast = document.getElementById('newsToast');
  const txt = document.getElementById('newsToastTxt');
  if(!toast || !txt) return;
  _newsToastFuellen(txt, n);
  _positionNewsToast();
  toast.classList.add('visible');
  // Reflow erzwingen, damit die Transition anläuft.
  void toast.offsetWidth;
  toast.classList.add('show');
  _newsSaveToastState({lastCount: n, lastTs: Date.now()});
  _newsToastDeferredCount = 0;
  if(_newsToastHideTimer) clearTimeout(_newsToastHideTimer);
  _newsToastHideTimer = setTimeout(() => _hideNewsToast(), _newsToastSchonDa ? NEWS_TOAST_MS : NEWS_TOAST_START_MS);
  _newsToastSchonDa = true;
  // Tippen → volles Blatt, wie die Pille.
  toast.onclick = () => {
    _hideNewsToast();
    try { openNewsFeed(); } catch(e){}
  };
  _hinweisBewegung(toast);
}
function _maybeShowNewsToast(unreadCount){
  const toast = document.getElementById('newsToast');
  const txt = document.getElementById('newsToastTxt');
  if(!toast || !txt || unreadCount <= 0) return;
  const state = _newsLoadToastState();
  const now = Date.now();
  const moreThanBefore = unreadCount > state.lastCount;
  const cooledDown = (now - state.lastTs) > NEWS_TOAST_COOLDOWN_MS;
  if(!moreThanBefore && !cooledDown) return;
  // ── Defer wenn Recap/Sheet aktiv ─────────────────────────────────
  if(_isSheetActive()){
    _newsToastDeferredCount = unreadCount;
    return;
  }
  _newsToastZeigen(unreadCount);
}
function _hideNewsToast(){
  const toast = document.getElementById('newsToast');
  if(!toast) return;
  if(_newsToastHideTimer){ clearTimeout(_newsToastHideTimer); _newsToastHideTimer = null; }
  toast.classList.remove('show');
  setTimeout(() => toast.classList.remove('visible'), 300);
}
// Der Hinweis steht unter der Pille, sein Pfeil zeigt auf ihre Mitte. Er ist
// höchstens 264 px breit und hält links wie rechts mindestens 12 px Abstand
// zum Rand: bei 360 px lief er sonst links aus dem Bild. Nur beim Anzeigen
// gerechnet (zwei getBoundingClientRect).
function _positionNewsToast(){
  const toast = document.getElementById('newsToast');
  const btn = document.getElementById('newsBtn');
  const leiste = btn && btn.closest('.appbar');
  if(!toast || !leiste) return;
  const pr = leiste.getBoundingClientRect(), br = btn.getBoundingClientRect();
  if(!br.width) return; // Pille (noch) unsichtbar
  const mitte = pr.right - (br.left + br.width / 2), breite = Math.min(264, innerWidth - 24);
  const rechts = Math.max(8, Math.min(mitte - 23, pr.width - breite - 12));
  toast.style.right = rechts + 'px';
  toast.style.setProperty('--nt-arrow', Math.max(14, mitte - rechts - 5) + 'px');
}
// Wird in closeSheet() aufgerufen — versucht gequeuten Toast nach
// kurzem Delay (User soll Sheet-Close-Animation sehen, bevor der nächste
// Hinweis aufpoppt).
function _processDeferredNewsToast(){
  if(!_newsToastDeferredCount) return;
  setTimeout(() => {
    // erneut prüfen: vielleicht hat sich währenddessen ein neues Sheet geöffnet
    if(_isSheetActive()) return;
    // v9.5-Fix: den Unread-Stand HIER NEU berechnen statt den gemerkten Count
    // zu verwenden. Der gemerkte Count wurde beim Öffnen des Sheets eingefroren;
    // hat der User danach im Sheet Stories (oder „alle") als gelesen markiert
    // und das Sheet schnell geschlossen, war der gemerkte Count veraltet und
    // der Toast poppte mit „X neue Stories" auf, obwohl keine mehr offen sind.
    // Jetzt zeigt der Toast nur, wenn WIRKLICH noch ungelesene Stories da sind.
    let n = 0;
    try { n = newsUnreadCount(); } catch(e){ n = 0; }
    _newsToastDeferredCount = 0;
    if(n <= 0) return;
    // Direkt anzeigen — Cooldown-Check schon im _maybeShowNewsToast wurde
    // bereits beim ersten Aufruf erfüllt; hier zwingen wir die Anzeige.
    _newsToastZeigen(n);
  }, 500);
}
window._processDeferredNewsToast = _processDeferredNewsToast;


// Datumsformatierung: "Heute, 16:07" / "Gestern, 21:11" / "12.06., 14:30"
function _newsWhenLabel(when){
  const d = new Date(when);
  const now = new Date();
  // Datumskeys in LOKALER Zeit bilden (nicht via toISOString → UTC): sonst zeigt
  // eine Story mit when=heute 00:00 Lokalzeit in Zonen mit positivem UTC-Offset
  // fälschlich „Gestern", obwohl die Uhrzeit lokal (toLocaleTimeString) heute ist.
  const todayKey = tagKey(now);
  const yest = gesternKey(now);
  const dKey = tagKey(d);
  const hhmm = datumFmt(d, 'uhr');
  if(dKey === todayKey) return 'Heute, '+hhmm;
  if(dKey === yest) return 'Gestern, '+hhmm;
  return datumFmt(d, 'tm')+', '+hhmm;
}

// Der Kalendertag einer Story, als Überschrift für eine Feed-Gruppe.
// Gleiche Zeitrechnung wie _newsWhenLabel: lokale Datumskeys, kein UTC.
// Der Tageskopf trägt den Wochentag ausgeschrieben und das Datum daneben.
// Vorher stand dort „Mi, 26. August" in einer Zeile mit der Anzahl; wer scrollte,
// übersah den Tageswechsel und las zwei Spieltage als einen. Heute und gestern
// behalten ihr Wort, weil man an ihnen kein Datum nachschlagen will.
function _newsDayLabel(when){
  const d = new Date(when), now = new Date();
  if(tagKey(d) === tagKey(now)) return 'HEUTE';
  if(tagKey(d) === gesternKey(now)) return 'GESTERN';
  return datumFmt(d, 'wt').toUpperCase();
}
// Das Datum unter dem Wochentag. Bei „Heute" und „Gestern" steht es trotzdem
// da: sonst weiß man beim Zurückblättern nicht, wo man ist.
function _newsDayDate(when){
  const d = new Date(when);
  return datumFmt(d, 'tmj');
}

// ─── §11.6 — Voller Feed (im Sheet) mit Filter-Pills ─────────────────
let _newsFeedFilter = 'all'; // 'all' | 'breaking' | eine Seite aus NEWS_SEITEN
function openNewsFeed(){
  _newsFeedFilter = 'all';
  _renderNewsFeed();
}
// ─── §11.6b — Breaking-Erkennung + M2-Karten (v9) ────────────────────
// „Breaking" ist eine ANZEIGE-Kategorie, kein Generator-Typ: ultra-seltene,
// liga-relevante Ereignisse werden display-seitig hierher promotet (wirkt auf
// bestehende UND neue persistierte Rows, ohne Regenerierung).
function _isBreaking(s){
  const d = (s && s.dataRef) || {};
  // Eine Tafel-Sammelkarte behält die höchste Dringlichkeit ihrer Teile.
  // Sonst würde ein erstmals vergebener Liga-Rekord beim vorgeschriebenen
  // Bündeln plötzlich seinen Breaking-Charakter verlieren.
  if(d.type === 'sammel') return d.breaking === true;
  // Breaking heißt: das passiert vielleicht einmal im Monat. Erlaubt sind
  // ausschließlich extrem seltene Auszeichnungen und echte EREIGNISSE —
  // etwas, das vorher noch nie da war oder die Spitze der Liga verschiebt.
  // Gefallen sind `top_clash` (Platz 1 schlägt Platz 2 — kam allein in einem
  // Fenster von 33 Stories vor) und `giant_slayer` (dafür gibt es die
  // Highlight-Karte).
  switch(d.type){
    case 'lead_change':      // der Tabellenführer eines belastbaren Spieltags
    case 'streak_record':    // längste Siegesserie aller Zeiten
    case 'season_recap':     // der Meister steht fest
    case 'season_endgame':   // der Schlusssprint, und nur bei offener Lage
    case 'karriereende':     // ein Spieler beendet die Karriere [§C40]
      return true;
    case 'badge_unlocked':   // nur legendäre Auszeichnungen
      return d.rarity === 'legendary';
    // Eine legendäre Auszeichnung ist Breaking, wo sie auch steht: der
    // Award-Sammler und Tag der Götter haben keine eigene Karte und stehen
    // in der Ehrung des Schlusses, der sie brachte — der des Tages unter dem
    // Spieler des Tages, der der Woche unter ihrer Karte [§11.6f]. Was die
    // Karte des Schlusses selbst trägt (`EHRUNG_KOPF`), zählt nicht. Die
    // Ehrung einer Runde bleibt still, ihre legendären Auszeichnungen haben
    // ihre eigene Karte, und der Monat ist es mit seinem Rückblick schon.
    // Gefragt wird nur, was der Schluss vergab (`ehrungBrk`, `breaking`,
    // `_ehrungBrkGrund`), nicht jede legendäre der Partien: die Ehrung trägt
    // den ganzen Tag, die ganze Woche, und eine legendäre aus einer Partie
    // ist an ihrer Partie-Karte schon Breaking. Ein gespeicherter Spieler des
    // Tages von vorher trägt die Antwort nicht; seine Ehrung bekommt beim
    // Anzeigen die Ehrungen des Tages dazu (`_consolidateStories`), und an
    // ihr gemessen war der 28.10. ein zweites Mal Breaking, für „Absoluter
    // Sieger" aus der Partie um 16:11. Er fragt deshalb den Schluss selbst.
    case 'potd': {
      if(typeof d.ehrungBrk === 'boolean') return d.ehrungBrk;
      const sch = _ehrungSchlussVon(s);
      return !!sch && !_ehrungGroessere(sch.ms) && _ehrungBrkGrund('tag', sch.ms).length > 0;
    }
    case 'ehrung':
      if(typeof d.breaking === 'boolean') return d.breaking;
      return d.periode === 'tag' && _ehrungBrichtVor(d.spieler);
    // ── Nur der ERSTE Aufstieg in die oberen zwei Stufen ────────────
    // Prestige aus Liga-Rekorden wird geteilt und fällt mit einem verlorenen
    // Bestwert wieder [§C34]: dieselbe Stufe kann mehrmals erreicht werden,
    // und beim zweiten Mal ist sie keine Nachricht mehr, die die Spalte
    // bricht. Ob es das erste Mal ist, sagt `wieder` [§C33].
    case 'insignium_stufe':  // nur Kronenreif und Ordensstern [§C30]
      return !!d.oben && !d.wieder;
    // Die Karte des Tages trägt dieselbe Regel für jede ihrer Bewegungen.
    case 'insignium_tag':
      return (d.zuege || []).some(z => z && z.art === 'auf' && !z.wieder
        && ((z.nach || {}).stufe | 0) >= INSIGNIUM_OBEN);
    // ── Ein erstmals vergebener Liga-Rekord ist kein Breaking ───────
    // Er stand auf der Liste, und in der Füllphase der Ewigen Tafel wird
    // JEDER Rekord zum ersten Mal vergeben: gemessen über die 18 Spieltage
    // des Juni 2026 trugen elf von ihnen eine Breaking-Karte, immer dieselbe
    // — der Tafel-Moment des Tages, der es von einer seiner Zeilen erbte.
    // Damit war Breaking in dieser Phase die Regel und nicht die Ausnahme.
    // Dasselbe gilt für `elo_record`: die Karte bildet der Generator nicht
    // mehr (der Bestwert steht als „Der höchste Gipfel" in der Tafel), aber
    // persistierte Zeilen aus älteren Läufen tragen den Typ weiter und waren
    // damit dieselbe Meldung zweimal, einmal laut.
    default:
      return false;
  }
}
// Anzeige-Kategorie: Breaking überschreibt die echte cat NUR fürs Styling.
function _displayCat(s){ return _isBreaking(s) ? 'breaking' : ((s && s.cat) || 'fun'); }
// Wichtige Karten bekommen den farbigen Glow-Rahmen (nur solange ungelesen).
function _isImportant(s){
  const d = (s && s.dataRef) || {};
  return _isBreaking(s) || (s && s.cat === 'highlight') || d.rarity === 'legendary' || d.rarity === 'rare';
}

// ─── Wer kommt in der Geschichte vor? ────────────────────────────────
// Die Spieler-IDs liegen je nach Typ in verschiedenen Feldern — historisch
// gewachsen, und persistierte Rows aus alten Versionen tragen die alten
// Namen. Deshalb wird gesucht statt vorausgesetzt. Höchstens drei: mehr
// Gesichter nebeneinander erkennt auf einer Karte niemand mehr.
function _newsPids(s){
  const d = (s && s.dataRef) || {};
  const raus = [];
  const dazu = v => {
    (Array.isArray(v) ? v : [v]).forEach(id => {
      if(typeof id === 'string' && id.length > 8 && raus.indexOf(id) < 0 && pmap()[id]) raus.push(id);
    });
  };
  ['playerId','ambientPid','pid','championId','a','b','playerIds','ambientPids',
   'breakerIds','victimPid'].forEach(k => { if(d[k] != null) dazu(d[k]); });
  // Nicht hier kürzen: Große Tafel-Bundles brauchen die vollständige Zahl,
  // damit „+3" auch wirklich drei weitere Beteiligte meint. Wie viele
  // Gesichter stehen und wie viele zusammengefasst werden, entscheidet
  // `_newsGesichtHtml`.
  return raus;
}

// Das Gesicht links auf der Karte. Vorher stand dort nichts: die News waren
// die einzige Ansicht der App, in der ein Spieler nur ein Name war. Ein
// Spieler bekommt sein Wappen [§C27], ein Duo zwei überlappende Chips —
// ein Duo hat keinen Rang und also auch kein Wappen. Steht niemand in der
// Geschichte (Saisonstart, spielfreie Tage), bleibt die Spalte weg.
function _newsGesichtHtml(s){
  const ids = _newsPids(s);
  if(!ids.length) return '';
  if(ids.length === 1){
    const p = pmap()[ids[0]];
    // Kein Feuer: eine Meldung von vorgestern hat keine laufende Serie [§C26].
    return `<div class="nf-face">${avHtml(p, '', {ins:true, px:48, feuer:0})}</div>`;
  }
  // Bis drei stehen alle Gesichter, ab vier zwei und die Zahl der übrigen.
  // Bei drei stand „+1" an der Stelle eines Gesichts: genauso breit wie das
  // Gesicht, das gefehlt hat, und ohne zu sagen, wer es ist.
  const zeige = ids.length <= 3 ? ids.length : 2;
  return `<div class="nf-face nf-face-paar">${
    ids.slice(0, zeige).map(id => avHtml(pmap()[id], '', {})).join('')}${
    ids.length > zeige ? `<span class="av nf-face-mehr">+${ids.length - zeige}</span>` : ''}</div>`;
}

// Das Mini-Visual rechts auf der Karte ist entfallen. Es zeigte je Typ ein
// Symbol oder eine Zahl an derselben Stelle, egal worum es ging — die Sorte
// war daran nicht zu erkennen. Diese Aufgabe tragen jetzt die acht
// Bauformen: das Ergebnisband, der große Wert, die Leiter, das Zahlenband.

function _newsUhrzeit(when){
  return datumFmt(when, 'uhr');
}

// Rot ist eine Richtung, keine Rubrik [§C25]. Karte und Detailblatt nutzen
// dieselbe Ableitung, damit eine Durststrecke beim Öffnen nicht wieder den
// grünen Schimmer einer positiven Serie annimmt.
function _newsIstNegativ(s){
  const d = (s && s.dataRef) || {};
  // ── Eine Gruppe ist so negativ wie ihre Mitglieder ─────────────────
  // Mehrere Pleitenserien derselben Partie werden EINE Zeile („2 Pechvögel:
  // Anton & Maxi"), und die trägt `type:'group'` mit `loss_streak` in `sub`.
  // Geprüft wurde nur `type`, also galt die Gruppe als positiv: gemessen
  // stand sie als Zeile auf der Karte „Teamserie in einer Partie", die
  // Johannes und Martins Sieg feiert — Rot ist die Richtung, und eine Karte
  // hat eine [§C25].
  const typ = (d.type === 'group' ? (d.sub || '') : (d.type || ''));
  // Eine Insignium-Karte, die nur Rückfälle meldet, hat die Richtung nach
  // unten — sie wird nie Karte des Tages und trägt kein Gold [§C25].
  if(typ === 'insignium_tag') return (d.zuege || []).length > 0 && d.zuege.every(z => z && z.art === 'ab');
  return /loss|dry_spell/.test(typ) || d.rarity === 'negative';
}

// Die Farbe einer Story ist die ihrer Karte [§C25]: Sorte, Ton der Tafel,
// Stil eines Fun Facts. Karte (`nf`), Blatt und Hinweis (`nd`) setzen
// dieselben Klassen [§C27] — der Punkt im Hinweis stand im Entwurf sonst in
// einer eigenen, nachgebauten Farbe. Die Präfixe stehen ausgeschrieben da:
// aus Teilen zusammengesetzt, fände niemand die Klasse im Code, und
// `tests/tafel` hielte ihre Regeln für tot.
function _newsTonKlassen(s, wo){
  const sorte = _newsSorte(s), d = s.dataRef || {};
  const tafel = sorte === 'tafel' ? _newsTafelTon(s) : '';
  const fakt = sorte === 'fakt' && d.type === 'ambient' ? (NEWS_AMBIENT_STIL[d.ambientRubrik] || NEWS_AMBIENT_STIL.liga).ton : '';
  return wo === 'nf'
    ? `nf-s-${sorte}${tafel ? ' nf-tafel-' + tafel : ''}${fakt ? ' nf-fakt-' + fakt : ''}`
    : `nd-s-${sorte}${tafel ? ' nd-tafel-' + tafel : ''}${fakt ? ' nd-fakt-' + fakt : ''}`;
}
// Die Ewige Tafel hat mehrere Kammern. Ein einziger silberner Ton machte
// Rekorde, Monatschroniken und Fügungen beim Scrollen ununterscheidbar. Die
// Familie wird ausschließlich aus den bereits gespeicherten Fachdaten
// abgeleitet; alte Stories und zusammengeführte Karten profitieren damit
// ohne Migration. Bei einem Bundle aus mehreren Familien bleibt ein ruhiger
// Mischton, statt eine einzelne Zeile optisch zum Sieger zu erklären.
function _newsTafelTon(s){
  const d = (s && s.dataRef) || {};
  const familie = x => {
    const typ = String((x && (x.type || x.typ)) || '');
    if(typ === 'insignium_stufe') return 'insignium';
    if(typ.indexOf('chronik_') === 0) return 'chronik';
    if(typ.indexOf('rekord_') === 0){
      const kammer = (x && x.kammer) || d.kammer || '';
      if(kammer === 'mark') return 'marke';
      if(kammer === 'fuegung') return 'fuegung';
      if(kammer === 'shame') return 'schatten';
      return 'rekord';
    }
    return '';
  };
  const teile = d.type === 'sammel' && Array.isArray(d.teile) ? d.teile : [d];
  const arten = [...new Set(teile.map(familie).filter(Boolean))];
  return arten.length === 1 ? arten[0] : (arten.length > 1 ? 'mix' : 'rekord');
}

// ── Ein Schimmer für das, was selten ist [§C25] ───────────────────────
// Bewegung hatten im Feed nur drei Karten: Breaking, die Karte des Tages und
// der Spieler des Tages und der Woche, die beiden letzten in Gold. Alles
// dazwischen stand still, auch ein Spitzenwechsel, eine seltene
// Auszeichnung oder eine Fünfer-Serie, und man scrollte darüber hinweg wie
// über ein gewöhnliches 10:7. Diese Karten tragen jetzt einen leisen
// Lichtlauf in der Farbe IHRER Familie (`--story-rgb`), nicht in Gold — Gold
// gehört dem Titel. Was ohnehin leuchtet, bekommt keinen zweiten, und eine
// negative Richtung auch nicht. Der Versatz kommt aus der ID, damit nicht
// alle Lichter im selben Takt laufen.
const NEWS_GLANZ_TYP = new Set(['lead_change', 'rekord_geholt', 'insignium_stufe', 'streak_record', 'season_champion']);
// Die seltenen Formen der gewöhnlichen Partie (`glanz` aus `_spBild`):
// Zählwerk, Rückkehr, Elo-Transfer und der gebrochene Fluch [§C33].
const NEWS_GLANZ_ANLASS = new Set(['spitze', 'medaille', 'aussenseiter', 'premiere', 'riss', 'form']);
function _newsGlanz(s, sorte, anlass){
  const d = s.dataRef || {};
  if(sorte === 'held' || sorte === 'woche') return false;
  if(NEWS_GLANZ_TYP.has(d.type) || NEWS_GLANZ_ANLASS.has(anlass)) return true;
  if(d.type === 'badge_unlocked' && (d.rarity === 'rare' || d.rarity === 'legendary')) return true;
  if((d.type === 'win_streak' || d.type === 'team_streak') && Number(d.streak) >= 5) return true;
  if(anlass === 'serie' || anlass === 'teamserie'){
    const f = _newsSpielFakten(s)
      .find(x => x.type === 'win_streak' || x.type === 'team_streak');
    if(f && Number(f.streak) >= 5) return true;
  }
  return (d.teile || []).some(t => t.klasse || NEWS_GLANZ_TYP.has(t.typ));
}
function _newsGlanzVersatz(id){
  let h = 0; const t = String(id || '');
  for(let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return -(h % 110) / 10;
}
function _newsCardHtmlM2(s, isRead, istTagesKarte, fadenHtml){
  if(((s && s.dataRef) || {}).type === 'runde') return _newsRundeHtml(s, isRead, fadenHtml);
  if(((s && s.dataRef) || {}).type === 'ehrung') return _newsEhrungHtml(s, isRead, fadenHtml);
  const dcat = _displayCat(s);
  const meta = NEWS_CATEGORIES[dcat] || NEWS_CATEGORIES.fun;
  const d = s.dataRef || {};
  const sorte = _newsSorte(s);
  const brk = _isBreaking(s);
  const imp = (_isImportant(s) && !isRead) ? ' important' : '';
  // Die Karte des Tages steht groß, mit einem Streifen darüber. Vorher stand
  // ihre Schlagzeile im Tageskopf und gleich darunter noch einmal auf der
  // Karte selbst.
  const gross = istTagesKarte && !brk;
  // Breaking sprang bisher als Hero an den Kopf des Feeds und damit aus der
  // Chronologie. Es bleibt jetzt an seinem Platz und trägt stattdessen einen
  // roten Kopfbalken mit Punkt und Zeitstempel [§11.6b].
  // ── Eine gebuendelte Breaking-Karte sagt, wie viel sie traegt ────
  // Sie sah aus wie jede andere Breaking-Karte: derselbe Balken, dasselbe
  // Wort. Dass unter der Schlagzeile noch fuenf weitere Meldungen desselben
  // Moments stehen, stand nur im Sammelband darunter — und wer die Karte
  // ueberflog, las „BREAKING" und hielt sie fuer eine einzelne Nachricht.
  // Die Zahl steht deshalb im Balken, neben dem Wort, das sie erklaert.
  const brkTeile = (brk && d.type === 'sammel' && Array.isArray(d.teile))
    ? d.teile.length : 0;
  const balken = brk
    ? `<div class="nf-brk-band"><span class="nf-brk-punkt"></span>BREAKING`
      + (brkTeile > 1
          ? `<span class="nf-brk-n">${brkTeile} Meldungen</span>` : '')
      + `<span class="nf-brk-zeit">${esc(_newsWhenLabel(s.when))}</span></div>`
    : '';
  // Eine Sammelkarte hat einen eigenen Gruppenkopf. Darunter stehen ALLE
  // verbundenen Einzelereignisse im Band; keines wird zum heimlichen Kopf
  // und keines hinter „weitere" versteckt [§C33].
  // ── Das Ergebnis steht nicht als Zeile unter seinem eigenen Band ──
  // Die Zeile hiess „Leon und Maxi setzen sich gegen Leo und Anton durch" und
  // stand unmittelbar unter dem Ergebnisband, das dieselben vier Namen mit
  // Wappen und Stand zeigt — gemessen brach sie dabei mit Auslassungspunkten
  // ab. Ihr Anlass steht ausserdem in der Schlagzeile („… in einer Partie")
  // und ihre beiden Zahlen im Satz darunter. Sie bleibt Teil des Buendels,
  // damit die Karte ihr Band und ihre Siegchance behaelt [§C33], und
  // verschwindet nur aus dem Band, wo sie nichts hinzufuegt.
  // Nur auf der Achse der PARTIE: eine Karte über zwei Ergebnisse desselben
  // Tages (`quelle:'ergebnis'`) besteht aus lauter Ergebnis-Zeilen, und die
  // sind dort die Aussage — gemessen blieben sonst elf Karten ohne Band.
  const partieBuendel = d.type === 'sammel' && d.quelle === 'spiel' && d.matchId && !d.bandFremd;
  // Auf der Karte einer Partie wählt `_spZeilen`, was als Zeile steht:
  // höchstens drei, ohne das, was der Fuß zeichnet, und ohne Nebensache.
  // Auch die Karte einer Partie ohne weitere Meldung: ihr Fuß hat eine Zeile.
  const spZeilen = partieBuendel || (d.type === 'spiel' && d.matchId && !d.bandFremd)
    ? _spZeilen(d.teile || [], s.title, _spBild(s).occ) : null;
  const sammelTeile = spZeilen ? spZeilen.zeilen : d.teile;
  // Die Zeile des Fußes steht als letzte der Liste über ihm, nur wenn es
  // einen Fuß gibt, den sie erklärt.
  const fz = spZeilen && spZeilen.unter && _spBild(s).fuss ? spZeilen.unter : null;
  const sammelBand = (d.type === 'sammel' || fz)
    ? _newsSammelBand(d.type === 'sammel' ? sammelTeile : [], [s.title], !spZeilen, fz) : '';

  // ── Je Sorte ein eigener Kopf und ein eigener Fuß ──────────────────
  // Vorher unterschied die Sorten nur eine Randfarbe, und zehn Karten
  // untereinander sahen alle gleich aus.
  let kopf = '', fuss = '', gesicht = '', faktBild = '';
  // Der Satz unter der Schlagzeile. Nur die Partie-Karte kürzt ihn: was ihr
  // Fuß als Bogen und Chips zeigt, sagt er nicht noch einmal (_newsSpielSatz).
  let satz = s.desc;
  const pm = pmap();
  // 48 px ist die Untergrenze fuer ein Wappen [§6]; darunter gibt `insAvWrap`
  // nur den Avatar zurueck, und die Karte verloere ihr Gesicht [§C33].
  const av = (pid, px) => (pm[pid] ? avHtml(pm[pid], '', {ins:true, px:px||48, feuer:0}) : '');

  if(sorte === 'spiel'){
    // Kopf und Fuß folgen dem Anlass der Partie [§C33, §11.6c].
    const bild = _spBild(s);
    kopf = d.bandFremd ? '' : bild.kopf;
    satz = _newsSpielSatz(s.desc, bild.zeigt);
    fuss = bild.fuss + _newsZahlband(_newsSpielZahlen(s, bild.key));
    // Die Ergebnis-Sammelkarte hat ZWEI Partien und deshalb keine, die sie
    // als Band zeigen könnte: acht Wappen übereinander machten sie höher als
    // ihr Text [§C27]. Die Stände stehen im Sammelband, die Sieger als Chips
    // — im Feed hat jeder ein Gesicht [§C33].
    if(!kopf) gesicht = _newsGesichtHtml(s);
  } else if(sorte === 'tafel'){
    const w = _newsTafelWert(s);
    // Ein Tafel-Bundle zeigt Wert UND Beteiligte. Der große Zähler erklärte
    // bisher zwar, wie viele Spuren zusammenlaufen, ließ aber alle genannten
    // Spieler bildlich verschwinden. Die kompakte Chipgruppe bleibt neben
    // dem Wert und macht keinen einzelnen Halter zum Hauptdarsteller.
    gesicht = `<div class="nf-gr-l">${w ? _newsWertBlock(w.v, w.l, 'ton') : ''}${_newsGesichtHtml(s)}</div>`;
  } else if(sorte === 'ins' && d.type === 'insignium_tag'){
    // Die Leiter des Tages [§C30]: das Besonderste als Bühne, jede übrige
    // Bewegung als kleine Zeile unter der Schlagzeile (30d-news-insignium.js).
    kopf = _newsInsTagKopf(s);
    // Die Karte eines Schlusses sagt darunter, was er vergab — die Bewegung
    // hat sonst keinen sichtbaren Grund, keine Partie steht dabei [§11.0e].
    fuss = _newsInsTagZeilen(s) + (d.schluss ? _newsAbschlussHtml(d.grund) : '');
    // Nur die Schlagzeile: der Satz erklärte Schwelle und Träger der Stufe,
    // und das zeigt die Spur in der Bühne. Er steht weiter im Blatt.
    satz = '';
  } else if(sorte === 'ins'){
    gesicht = `<div class="nf-gr-l">${av(d.pid, 48)}</div>`;
    fuss = _newsLeiter(d.pid);
  } else if(sorte === 'held' && d.type === 'season_recap'){
    // ── Die Meisterbühne [§C31] ────────────────────────────────────
    // Zwei Sätze und kein Bild: so stand der Meister im Feed, die seltenste
    // Karte des Monats. Jetzt steht das Podest über dem Satz — dasselbe
    // Bauteil wie im Saison-Rückblick [§C27] —, und im Fuß das Rennen um die
    // Spitze, klein, samt der Tage vorn und dem Vorsprung.
    kopf = _newsMeisterKopf(d);
    fuss = _newsMeisterFuss(d);
  } else if(sorte === 'held' && d.type === 'karriereende'){
    // Die Bühne des Abschieds und darunter die Zahlen, die die Karte bei
    // ihrer Entstehung trug — der Stand von damals, nicht von heute.
    kopf = _newsAbschiedKopf(d);
    fuss = _newsZahlband([
      {v: d.spiele != null ? _spZahl(d.spiele) : null, l:'Partien'},
      {v: d.quote != null ? Math.round(d.quote * 100) + ' %' : null, l:'Siegquote'},
      {v: d.rekorde ? d.rekorde : (d.elo != null ? d.elo : null), l: d.rekorde ? (d.rekorde === 1 ? 'Rekord' : 'Rekorde') : 'Karriere-Elo', f: d.rekorde ? 'g' : ''}
    ]);
  } else if(sorte === 'held'){
    const pid = d.playerId || (Array.isArray(d.playerIds) ? d.playerIds[0] : null);
    gesicht = `<div class="nf-gr-l">${av(pid, 52)}</div>`;
    // Der Spieler des Tages zeigt seinen Tag als Bahn und die Elo darüber:
    // dass er mit zwei Pleiten anfing und mit fünf Siegen endete, sagten
    // drei Zahlen nicht [§11.6c].
    if(d.type === 'potd') fuss = _spTagBild(_spTagDaten(s));
    // Das Gegenstück: wer an diesem Tag am meisten verloren hat. Eine rote
    // Zeile unter der Bahn, statt einer eigenen Karte darunter.
    const g = d.type === 'potd' && d.gegenstueck;
    if(g && pmap()[g.pid]) fuss += _spGegenHtml(g);
    // Und was der Tag an Auszeichnungen brachte: die Ehrung des Tages als
    // Teil seiner Karte [§11.6f].
    if(d.type === 'potd') fuss += _ehrungTagHtml(d.ehrung);
    if(!fuss) fuss = _newsZahlband([
      {v: d.wr != null ? Math.round(d.wr * 100) + ' %' : null, l:'Siegquote', f:'g'},
      {v: (d.wins != null && d.games != null) ? d.wins + ' : ' + (d.games - d.wins) : null,
       l:'Siege zu Niederlagen'},
      {v: _newsRangKurz(pid), l:'in der Gesamtliga'}
    ]);
  } else if(sorte === 'spieler'){
    // Ein Gesicht, gross: die Karte handelt von genau einem Spieler. Dazu
    // die Zahl der Erfolge und sein Platz in der Gesamtliga — die Zahl steht
    // nicht im Satz, der gehoert dem staerksten Erfolg.
    const pid = (Array.isArray(d.playerIds) ? d.playerIds[0] : null) || d.pid;
    gesicht = `<div class="nf-gr-l">${av(pid, 52)}</div>`;
    fuss = _newsZahlband([
      {v: (Array.isArray(d.teile) ? d.teile.length : 0) || null, l:'Erfolge im selben Moment', f:'g'},
      {v: _newsRangKurz(pid), l:'in der Gesamtliga'}
    ]);
  } else if(sorte === 'erfolg'){
    // Hier ist der Erfolg das Subjekt, also stehen die Gesichter als Chips
    // nebeneinander [§C33] — keins von ihnen ist wichtiger als das andere.
    // Und wo der Erfolg ein ZEICHEN ist, steht das Zeichen dabei. „Vier
    // Spieler tragen jetzt den Schildring" zeigte den Schildring kein
    // einziges Mal: daneben stand ein Pokal aus dem Icon-Katalog, und die
    // Karte handelte von einer Zeichnung, die sie nicht zeigt. Die App hat
    // das Bauteil [§C27] — `insigniumStufeSvg` traegt seine Verlaeufe selbst
    // und funktioniert deshalb auch hier [§C30].
    gesicht = `<div class="nf-gr-l">${_newsErfolgZeichen(s)}${_newsGesichtHtml(s)}</div>`;
    fuss = _newsZahlband([
      {v: (Array.isArray(d.teile) ? d.teile.length : 0) || null, l:'Spieler zugleich', f:'g'}
    ]);
  } else if(sorte === 'woche'){
    // Alle sechs Wertungen, nicht drei und eine Zeile „und 3 weitere". Die
    // Wochenkarte gibt es einmal je Woche, und sie IST die Uebersicht: wer
    // sie ueberflog, sah die Ueberraschung, den Krimi und das Team der Woche
    // gar nicht, obwohl die Karte fuer nichts anderes da ist.
    const teile = Array.isArray(d.teile) ? d.teile : [];
    // Der Sieger der Woche steht mit seinem Wappen da. Die Karte trug sechs
    // Zeilen Text und kein einziges Gesicht — im Feed hat jeder eins [§C33],
    // und diese Karte gibt es einmal je Woche.
    const held = (teile.find(t => t.held) || teile[0] || {});
    const hpid = (held.pids || [])[0];
    if(hpid) gesicht = `<div class="nf-gr-l">${av(hpid, 48)}</div>`;
    // Und jede Wertung trägt ihr Zeichen: sechs Zeilen Text untereinander
    // sagen vor dem Lesen nicht, welche davon der Spieler der Woche ist.
    fuss = `<div class="nf-wl">${teile.map(t =>
      `<div class="nf-wl-z${t.held ? ' held' : ''}">`
      + (t.ic ? `<em class="nf-wl-i">${svgI(t.ic)}</em>` : '')
      + `<span>${esc(t.label || '')}</span>`
      + `<i>${esc(_namenKurz((t.pids || []).map(p => (pm[p] || {}).name || '').filter(Boolean), 2))}</i>`
      + `<b>${esc(t.wert || '')}</b></div>`).join('')}</div>`;
  } else if(sorte === 'duell'){
    // Eine Rivalitaet lebt vom Verhaeltnis. Die beiden Wappen standen
    // uebereinander in der linken Spalte und machten die Karte 56 Pixel
    // hoeher als ihr einzeiliger Satz — daneben war nichts. Sie stehen
    // jetzt als BAND ueber dem Text, einander gegenueber wie im
    // Ergebnisband des Spieltags [§C27].
    kopf = `<div class="nf-duell-band">${av(d.a, 34)}`
      + `<span class="nf-duell-vs"><b>${esc(String(d.n || ''))}</b><i>Duelle</i></span>`
      + `${av(d.b, 34)}</div>`;
    let h = null; try { h = _newsH2HRecord(d.a, d.b); } catch(e){}
    fuss = (h && (h.aWins + h.bWins))
      ? _newsBilanzBalken(d.a, d.b, h.aWins, h.bWins) : '';
  } else if(sorte === 'serie'){
    // Eine Serie lebt von der Laenge. Der Lauf steht im Fuss, das Gesicht
    // links — einer oder zwei, je nachdem wem die Serie gehoert.
    const verloren = String(d.type || '').indexOf('loss') >= 0;
    gesicht = d.a && d.b
      ? `<div class="nf-gr-l nf-duo">${av(d.a, 38)}${av(d.b, 38)}</div>`
      : `<div class="nf-gr-l">${av(d.pid || d.playerId, 48)}</div>`;
    fuss = _newsSerienBand(d.streak, verloren, true);
  } else if(sorte === 'badge'){
    gesicht = `<div class="nf-gr-l">${av(d.playerId, 48)}</div>`;
    // Der Name der Auszeichnung steht schon in der Schlagzeile. Im Fuss stand
    // er ein zweites Mal darunter — jetzt steht dort, was die Schlagzeile
    // nicht sagt: wie selten sie ist und wie viele sie tragen.
    fuss = `<div class="nf-bd"><span class="nf-bd-ic nf-bd-${esc(d.rarity || 'common')}">${svgI(s.ic || 'trophyStar')}</span>`
         + `<span class="nf-bd-t"><b>${esc(_newsRarityLabel(d.rarity))}</b>`
         + `<i>${esc(_newsBadgeHalterText(d.badgeId))}</i></span></div>`;
  } else if(sorte === 'marke'){
    // Ein einzelner Wert stand als eigener Streifen im Fuss und fuellte dort
    // eine ganze Zeile mit zwei Woertern. Er gehoert neben das Wappen: dort
    // fuellt er die Bildzone, statt die Karte um einen leeren Streifen
    // hoeher zu machen.
    const wert = d.delta != null ? (d.delta > 0 ? '+' + d.delta : String(d.delta))
               : (d.streak != null ? String(d.streak) : (d.milestone || null));
    const label = d.delta != null ? 'Elo' : (d.streak != null ? 'in Folge' : 'erreicht');
    gesicht = `<div class="nf-gr-l">${av(d.pid, 48)}`
      + (wert ? _newsWertBlock(wert, label, d.delta < 0 ? 'rot' : 'metall') : '') + `</div>`;
  } else if(sorte === 'fakt' && (faktBild = _faktBild(s))){
    // Ein Fun Fact mit Bild trägt es als Kopf [30c-news-fakt]; Zahl und
    // Gesichter stehen darin, links stünden sie ein zweites Mal [§C27].
    kopf = faktBild;
  } else {
    // Fun Fact ohne Bild — eine Karte aus der Zeit davor: die Zahl links,
    // der Satz rechts.
    if(d.vv != null && d.vv !== '') gesicht = `<div class="nf-gr-l">${_newsWertBlock(d.vv, d.vl, 'metall')}</div>`;
    else gesicht = `<div class="nf-gr-l">${_newsGesichtHtml(s)}</div>`;
    // Die Leiter der Liga zeigt ihre Stufen, darunter die Zahl der Träger.
    if(d.leiter) fuss = _newsLigaLeiter(d.leiter);
  }
  // Jede Geschichte, die durch eine konkrete Partie ausgeloest wurde,
  // zeigt diese Partie. Das gilt auch fuer Auszeichnungen, Serien und
  // Tafelwechsel: Der Typ bestimmt weiter Farbe und Aufbau, aber Ergebnis,
  // Teams und Ausloeser verschwinden nicht mehr hinter der Rubrik.
  // Das Band gehoert der Partie, nicht jeder Karte, die sie nennt: steht schon
  // eine andere Karte derselben Partie im Feed, zeigt sie es [§C33].
  if(d.matchId && !d.bandFremd && (sorte === 'duell' || !kopf)){
    kopf = _newsErgebnisBand(d.matchId) || kopf;
  }
  // Das Duell traegt seine Wappen im Band ueber dem Text; die Ersatzgesichter
  // haetten sie ein zweites Mal daneben gestellt. Die Insignium-Karte zeigt
  // jedes Gesicht in Bühne und Zeilen.
  if(!gesicht && !faktBild && sorte !== 'spiel' && sorte !== 'woche' && sorte !== 'duell'
     && d.type !== 'season_recap' && d.type !== 'karriereende' && d.type !== 'insignium_tag'){
    const g = _newsGesichtHtml(s);
    if(g) gesicht = `<div class="nf-gr-l">${g}</div>`;
  }

  // Das Motiv liegt hinter allem, der Chevron sagt, dass die Karte sich
  // oeffnet. Ohne ihn sah eine Karte wie ein Aushang aus, und der halbe Feed
  // wurde nie angetippt.
  // Rot ist die Richtung [§C25]: eine Karte, die von einer Pleitenserie oder
  // einer Schande erzaehlt, traegt es in Rubrik und Motiv. Die Durststrecke
  // stand vorher im selben Gruen wie die Siegesserie.
  const negativ = _newsIstNegativ(s);
  // ── Was oben steht, steht unten nicht noch einmal ──────────────────
  // `_breakingHeroText` hat nur fuer sieben Typen einen eigenen Satz und
  // faellt sonst auf `s.desc` zurueck. Gemessen stand der Teaser damit auf
  // jeder anderen Breaking-Karte zweimal untereinander — auf der
  // gebuendelten „Neue Tabellenspitze und Auszeichnung in einer Partie" und
  // auf jeder legendaeren Auszeichnung [§C33].
  // Die Karte einer Partie trägt keinen: ihr Satz erklärt schon den
  // Hauptanlass, und unter „Johannes übernimmt die Tabellenspitze" stand die
  // Spitze danach dreimal — Schlagzeile, Tabelle im Fuß und dieser Satz.
  let brkSub = '';
  if(brk && sorte !== 'spiel'){
    const h = _breakingHeroText(s);
    if(String(h || '').trim() !== String(s.desc || '').trim()) brkSub = h;
  }
  const glanz = !negativ && !brk && !gross && _newsGlanz(s, sorte, sorte === 'spiel' && d.matchId ? (_spBild(s).glanz ? 'form' : _spBild(s).key) : '');
  // Breaking steht in einer Hülle, die seinen Schein trägt: die Karte
  // schneidet ab, was über ihren Rand ragt, und ein Schein, der per
  // `box-shadow` atmete, kostete jedes Bild einen Takt über den ganzen Feed.
  return (brk ? '<div class="nf-brk-hof">' : '') + `<div class="nf-card ${_newsTonKlassen(s, 'nf')} nfc-${dcat}${negativ?' nf-neg':''}${brk?' nf-brk':''}${gross?' nf-gross':''}${glanz?' nf-glanz':''}${isRead?' read':''}${imp}" data-sid="${esc(s.id)}"${glanz ? ` style="--gv:${_newsGlanzVersatz(s.id)}s"` : ''}>
    ${_newsMotiv(sorte, s)}
    ${gross ? '<div class="nf-gross-band">' + svgI('funkeln') + 'DIE KARTE DES TAGES</div>' : ''}
    ${balken}
    <div class="nf-top">
      <span class="nf-rub"><i>${svgI(_newsSorteIcon(sorte, s))}</i><b>${esc(_newsRubrik(sorte, s))}</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead?'':'<span class="nf-dot"></span>'}</span>
    </div>
    ${kopf}
    <div class="nf-gr${gesicht?' mit-l':''}">
      ${gesicht}
      <div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div>${satz ? `<div class="nf-d">${_newsBetont(satz)}</div>` : ''}</div>
      <span class="nf-chev">${svgI('chevron')}</span>
    </div>
    ${sammelBand}
    ${sorte === 'tafel' ? _newsPrestigeBand(s) : ''}
    ${fuss}
    ${brkSub ? `<div class="nf-brk-sub">${esc(brkSub)}</div>` : ''}
    ${fadenHtml || ''}
  </div>` + (brk ? '</div>' : '');
}

