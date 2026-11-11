// ╔═══ §10.3 ─── HELPERS (Achievement-Toasts, Utils) ───────────────────╗
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
// v9.15 PERF: memoisiert + Intl.DateTimeFormat wiederverwendet — toLocaleString
// baute den Formatter bei JEDEM Aufruf neu (läuft pro History-Zeile/Story).
const _dateStrFmt=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const _dateStrMemo=new Map();
function dateStr(ts){
  const k=typeof ts==='string'?ts:+ts;
  let v=_dateStrMemo.get(k);
  if(v===undefined){
    v=_dateStrFmt.format(new Date(ts));
    if(_dateStrMemo.size>20000)_dateStrMemo.clear();
    _dateStrMemo.set(k,v);
  }
  return v;
}
// ── Ein Datum, ein Formatierer ──────────────────────────────────────
// `toLocaleDateString` mit Optionen baut bei jedem Aufruf einen neuen
// Formatierer. Im Feed läuft das je Karte mehrmals (Uhrzeit, Tageskopf,
// Datum im Satz): gemessen 16 ms für die Uhrzeit allein beim Öffnen. Dieselbe
// Ausgabe, einmal gebaut.
const _FMT_ARTEN = {uhr:{hour:'2-digit', minute:'2-digit'}, tm:{day:'2-digit', month:'2-digit'},
  tmj:{day:'2-digit', month:'2-digit', year:'2-digit'}, wt:{weekday:'long'}};
const _FMT = {};
// `tmx` ist ein Tag, den man in einem Satz nennt: ohne Jahr, wenn es das
// laufende ist, sonst mit. Mit den Jahren stand „Der letzte Sieg gegen Leon
// war am 15.03." da, und gemeint war ein März drei Jahre zuvor.
function datumFmt(when, art){
  const d = when instanceof Date ? when : new Date(when);
  if(art === 'tmx') art = d.getFullYear() === new Date().getFullYear() ? 'tm' : 'tmj';
  const f = _FMT[art] || (_FMT[art] = new Intl.DateTimeFormat('de-DE', _FMT_ARTEN[art]));
  return f.format(d);
}
// Ein Tag am Ende eines Satzes trägt dessen Punkt: „am 15.03." hat ihn
// schon, „am 15.03.27" nicht. Vorher stand „bis 21.06.." mit zweien da.
function tagImSatz(when){
  const t = datumFmt(when, 'tmx');
  return t.endsWith('.') ? t : t + '.';
}
// ── Eine Dezimalzahl trägt hier ein Komma ───────────────────────────
// Die Oberfläche schreibt „6,9 Gegentore", die Fun Facts schrieben „6.9" —
// acht Stellen mit `toFixed(1)` und ein Punkt mitten im deutschen Satz.
// Eine Stelle für alle, damit es nicht wieder auseinanderläuft [§C27].
function komma(v, n){
  const z = Number(v);
  return (isFinite(z) ? z : 0).toFixed(n == null ? 1 : n).replace('.', ',');
}
// ── Eine lange Zahl trägt Tausenderpunkte ───────────────────────────
// Die Fun Facts setzen ihre Zahlen roh in den Satz, und mit den Jahren
// wurden sie fünfstellig: „82820 Tore in 5152 Partien", „22673 Tore" im
// Jahresrückblick. Ab fünf Stellen gruppiert, wie die Norm es verlangt;
// vierstellige bleiben, wie sie sind, und eine Zahl hinter Komma, Punkt
// oder Buchstabe ist keine eigene.
function tausender(text){
  return String(text == null ? '' : text).replace(/(^|[^\d.,\w])(\d{5,})(?!\d)/g,
    (m, vor, z) => vor + _spZahl(Number(z)));
}
// Der Stand aus Sicht einer Seite, Satz für Satz („6:4 3:6 10:8"). Ohne
// zweites Argument die der Sieger. Gespeichert ist er aus Sicht von Team A;
// mehrere Stellen schrieben ihn so ab und drehten ihn nicht um [§C27].
function standFuer(m, gewonnen = true){ return saetzeText(m, gewonnen); }
function emptyState(e,t){
  // Wenn 'e' ein Icon-Name aus ICONS ist → SVG rendern; sonst als Text/Emoji belassen
  const inner = icPfad(e) ? `<div class="ee svg-ic">${svgI(e)}</div>` : `<div class="ee">${e}</div>`;
  return `<div class="leerstand">${inner}${t}</div>`;
}
// ── Die Vorschau [§C27] ──────────────────────────────────────────────
// Eine leere Ansicht sagt, was sie zeigen wird und wie es dahin kommt. Am
// ersten Tag stand in sechs von acht Reitern nur „noch keine Daten", und
// wer die App öffnete, erfuhr nicht, wozu Seiten, Chronik oder Tafel da
// sind — er sah eine leere Fläche und hielt sie für einen Fehler.
//   ic     Zeichen aus ICONS
//   titel  was die Ansicht ist
//   satz   was hier erscheint, sobald gespielt ist (Markup erlaubt)
//   punkte [[ic, name, text], …] wie es funktioniert, wahlweise
//   fuss   ein Knopf oder eine Zeile darunter, wahlweise
// Die Texte sind feste Sätze aus dem Code, keine Eingaben; nur der Titel
// und die Namen werden maskiert, weil sie auch aus Katalogen kommen.
function vorschauHtml(ic, titel, satz, punkte, fuss){
  const liste = punkte && punkte.length
    ? `<ol class="vs-punkte">${punkte.map(([pi, n, t]) =>
        `<li><span class="vs-pi">${svgI(pi)}</span><span><b>${esc(n)}</b>${t}</span></li>`).join('')}</ol>`
    : '';
  return `<div class="vorschau">
    <div class="vs-kopf"><span class="vs-ic">${svgI(ic)}</span><b>${esc(titel)}</b></div>
    ${satz ? `<p class="vs-satz">${satz}</p>` : ''}${liste}${fuss || ''}
  </div>`;
}
// ── Der Hinweis [§C27] ───────────────────────────────────────────────
// Ein Balken in voller Farbe mit einem Satz: grün hieß „gespeichert", rot
// „Fehler", und alles andere stand weiß da — auch „Berechne neu…", das
// gerade noch läuft. Jetzt trägt er seine Rolle als Zeichenkachel [§C25],
// eine zweite Zeile mit der Wirkung und, wo es eine gibt, eine Aktion.
//   kind   'ok' | true (Fehler) | 'info' | nichts (läuft noch)
//   o.sub  die zweite Zeile, o.aktion {label, fn}, o.ms die Standzeit
let tt;
const TOAST_ROLLE = {ok:['check','gruen'], err:['x','rot'], info:['info',''], lauf:['hourglass','']};
function toast(msg, kind, o){
  o = o || {};
  const rolle = kind === true ? 'err' : (TOAST_ROLLE[kind] ? kind : 'lauf');
  let t = document.querySelector('.toast');
  if(!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  const [ic, ton] = TOAST_ROLLE[rolle];
  t.innerHTML = zkHtml(ic, 'k', ton) + '<span class="toast-tx"><b></b><span></span></span>';
  t.querySelector('b').textContent = msg;
  const sub = t.querySelector('.toast-tx span');
  if(o.sub) sub.textContent = o.sub; else sub.remove();
  if(o.aktion){
    const k = document.createElement('button');
    k.className = 'toast-akt'; k.type = 'button'; k.textContent = o.aktion.label;
    k.onclick = () => { t.classList.remove('show'); clearTimeout(tt); o.aktion.fn(); };
    t.appendChild(k);
  }
  t.className = 'toast ' + rolle + (o.aktion ? ' mit-akt' : '');
  void t.offsetWidth; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), o.ms || (o.aktion ? 6000 : 2400));
}

// ── Die Bestätigung [§C27] ───────────────────────────────────────────
// Vier Stellen fragten mit `confirm()` — einem Fenster des Browsers, das
// die App nicht gestalten kann, das auf dem Telefon „Seite sagt" darüber
// schreibt und bei dem der zerstörende Knopf „OK" heißt. Der Dialog nennt,
// was verloren geht, der sichere Knopf steht links, der zerstörende rechts
// und rot. Er liegt über einem offenen Blatt und nicht darin.
function bestaetigen(o){
  return new Promise(fertig => {
    const bg = document.createElement('div');
    bg.className = 'dlg-bg';
    bg.innerHTML = `<div class="dlg" role="alertdialog" aria-modal="true">
      ${zkHtml(o.ic || 'alert', 'g', o.gefahr ? 'rot' : '')}
      <h4></h4><p></p>
      <div class="blatt-fuss"><button type="button" class="btn ghost" data-dlg="0"></button>
        <button type="button" class="btn ${o.gefahr ? 'gefahr' : ''}" data-dlg="1"></button></div></div>`;
    bg.querySelector('h4').textContent = o.titel;
    bg.querySelector('p').textContent = o.text || '';
    bg.querySelector('[data-dlg="0"]').textContent = o.nein || 'Abbrechen';
    bg.querySelector('[data-dlg="1"]').textContent = o.ja || 'Bestätigen';
    const zu = ja => { bg.classList.remove('show'); setTimeout(() => bg.remove(), 200); _zurueckAbgleichen(); fertig(ja); };
    bg.onclick = e => { if(e.target === bg) zu(false); };
    bg.querySelectorAll('[data-dlg]').forEach(b => b.onclick = () => zu(b.dataset.dlg === '1'));
    document.body.appendChild(bg);
    void bg.offsetWidth; bg.classList.add('show');
    _zurueckAbgleichen();
  });
}

// ─── Achievement-Toast: gestapelte Anzeige für neue Badges nach Match-Eingabe ───
// Sequenzielle Queue verhindert, dass mehrere Achievements einander überschreiben.
// Jeder Toast 2.6s sichtbar + 0.4s Pause zwischen den Slides.
let _achToastQueue=[], _achToastBusy=false, _achToastTimer=null;
function showAchievementToast(playerName, badge){
  _achToastQueue.push({playerName, badge});
  _processAchToastQueue();
}
function _processAchToastQueue(){
  if(_achToastBusy || !_achToastQueue.length) return;
  _achToastBusy=true;
  const {playerName, badge}=_achToastQueue.shift();
  let el=document.querySelector('.ach-toast');
  if(!el){el=document.createElement('div');el.className='ach-toast';document.body.appendChild(el);}
  // Badge-Icon: zentrale badgeIc()-Logik nutzen (SVG zuerst, Emoji als Fallback)
  // — konsistent mit Profil, Awards-Sheet und Match-Detail. Mein CSS-Selektor
  // .ach-toast-ic svg übernimmt Größe/Stroke; das umliegende <span> ist neutral.
  const icHtml = badgeIc(badge, '22px');
  const subParts=[esc(playerName)];
  if(badge.count && badge.count>1) subParts.push(badge.count+'×');
  el.innerHTML=`
    <div class="ach-toast-ic">${icHtml}</div>
    <div class="ach-toast-text">
      <div class="ach-toast-cat">Neue Auszeichnung</div>
      <div class="ach-toast-name">${esc(badge.name)}</div>
      <div class="ach-toast-sub">${subParts.join(' · ')}</div>
    </div>`;
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(_achToastTimer);
  _achToastTimer=setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=>{ _achToastBusy=false; _processAchToastQueue(); }, 400);
  }, 2600);
}

// ── Die Hilfe eines Reiters [§C27] ───────────────────────────────────
// Ein kleines „?" neben der Überschrift öffnet ein Blatt: wie der Reiter
// funktioniert und wie man vorgeht — nicht, was Padel ist; das weiß, wer
// die App öffnet. Die Erklärung steht hinter dem Knopf statt als Absatz
// über der Liste, die sonst jeder bei jedem Öffnen wegscrollen müsste.
const HILFE = {
  liga: {titel:'Liga', absaetze:[
    '<b>Saison</b> ist der laufende Monat; jeder beginnt ihn mit der Start-Elo. <b>Tag</b> zeigt den Spieltag, <b>Gesamt</b> die Laufbahn über alle Saisons.',
    'Die Reiter über der Liste sortieren um: Elo, Quote, Game-Bilanz und mehr. Ein Name öffnet das Profil.',
    'Neue Partie: das Plus unten rechts. Jeder Satz ist eine Partie; mehrere Sätze derselben Paare hintereinander zählen außerdem als Match.']},
  seiten: {titel:'Seiten', absaetze:[
    'Wer auf welcher Seite am stärksten ist. Die Seite kommt aus der Aufstellung jeder Partie.',
    'Der Wert verbindet die Siegquote dort, die Leistung gegen die Erwartung (Partner und Gegner), den Anteil der Games und wie oft jemand dort stand. <b>▲</b> heißt über, <b>▼</b> unter der Erwartung.',
    'Auf welcher Seite jemand selbst besser ist, zeigt das Seitenprofil im Profil; die Seiten-Landkarte stellt alle nebeneinander.']},
  awards: {titel:'Awards, Rekorde, Chronik', absaetze:[
    '<b>Awards</b> gelten der Saison: jede Kachel stellt eine Frage, getippt zeigt sie die ersten drei.',
    '<b>Rekorde</b> sind Bestwerte über alle Saisons. Wer einen übertrifft, nimmt ihn dem Halter ab.',
    () => `<b>Chronik</b>: jeder Monat schreibt Einträge für das, worin jemand besonders war, ab ${CHRONIK_MIN_SPIELE} Partien im Monat.`,
    'Alles zusammen ergibt das Prestige und damit das Insignium am Wappen.']},
  teams: {titel:'Teams', absaetze:[
    () => `Jedes Duo ab ${DUO_MIN} gemeinsamen Partien, sortiert nach Quote, Game-Bilanz oder Elo.`,
    'Ein Duo öffnet die gemeinsame Bilanz: Sätze, Tiebreaks und welche Aufstellung besser läuft.']},
  verlauf: {titel:'Verlauf', absaetze:[
    'Jede Partie, die neueste zuerst; oben lässt sich nach einem Spieler filtern.',
    'Eine Partie öffnet die Elo jedes Spielers und die Elo-Analyse. Dort lässt sie sich bearbeiten oder löschen; die Liga rechnet danach neu.']},
  eingabe: {titel:'Neue Partie', absaetze:[
    'Vier Spieler wählen. Links steht Revés, rechts Drive; ⇄ tauscht die Seiten eines Teams.',
    'Die Games je Satz eintragen. Jeder Satz wird eine eigene Partie, „+ Satz" trägt mehrere auf einmal ein. Ein Satz, der nicht zu Ende kam, zählt mit, wenn er einen Vorsprung hat.',
    'Spielen dieselben Paare weiter, gehört der nächste Satz zum selben Match; die Zeile über der Elo nennt den Stand.']},
};
function hilfeKnopf(key){
  const h = HILFE[key];
  return h ? `<button class="kopf-info" type="button" data-hilfe="${key}" aria-label="So funktioniert ${esc(h.titel)}">${svgI('frage')}</button>` : '';
}
function zeigeHilfe(key){
  const h = HILFE[key]; if(!h) return;
  openSheet(blattKopfHtml({ic:'frage', titel:h.titel, unter:'So funktioniert es'})
    + `<div class="pos-info">${h.absaetze.map(a => `<p>${typeof a === 'function' ? a() : a}</p>`).join('')}</div>`);
}
