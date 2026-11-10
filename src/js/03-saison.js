// ╔═══ §1.2 ─── SAISON-SYSTEM (monatlich) ──────────────────────────────╗
//     Saisons starten automatisch am Monatsersten. currentSeason() liefert
//     die laufende Saison; archivierte Saisons stehen in `seasons[]`.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Jeder Kalendermonat ist eine eigene Saison mit Elo-Reset.
// v9.15 PERF: seasonOf ist der heißeste Helper der App — er läuft in simulateElo,
// Badge-Cache, Story-Generator u.a. PRO MATCH. Das Intl-Label (toLocaleDateString)
// kostete dabei >60% der gesamten Rechenzeit, obwohl alle Hot-Loops nur `.id`
// lesen. Darum: (a) Label lazy per Getter, memoisiert pro Monat (es gibt nur
// wenige Monate), (b) das ganze Resultat memoisiert pro created_at-String —
// wiederholte Voll-Scans (Sim, Awards, Badges, News) treffen dann nur noch die Map.
const _seasonLabelMemo = {};
function _seasonLabelOf(y, m){
  const k = y + '-' + m;
  return _seasonLabelMemo[k] || (_seasonLabelMemo[k] =
    new Date(y, m).toLocaleDateString('de-DE', {month:'long', year:'numeric'}));
}
const _seasonOfMemo = new Map();
function seasonOf(date){
  const memoKey = (typeof date === 'string') ? date : null;
  if(memoKey !== null){
    const hit = _seasonOfMemo.get(memoKey);
    if(hit) return hit;
  }
  const d = new Date(date);
  const y = d.getFullYear(), m = d.getMonth();
  const res = {year:y, month:m, id:y+'-'+String(m+1).padStart(2,'0'),
    get label(){ return _seasonLabelOf(y, m); }};
  if(memoKey !== null){
    if(_seasonOfMemo.size > 50000) _seasonOfMemo.clear(); // Wachstums-Schutz
    _seasonOfMemo.set(memoKey, res);
  }
  return res;
}
let _currentSeasonMemo = null;
function currentSeason(){
  // Zehntausende warme Cache-Lookups lesen denselben Monat. Die Ortszeit
  // wird weiter bei jedem Aufruf geprüft, aber Ergebnis und Label-Getter
  // müssen nur bei einem echten Monatswechsel neu entstehen. Ein Eintrag,
  // kein Timer und keine zweite Regel für den Saisonwechsel.
  const d = new Date();
  if(_currentSeasonMemo && _currentSeasonMemo.year === d.getFullYear()
     && _currentSeasonMemo.month === d.getMonth()) return _currentSeasonMemo;
  return (_currentSeasonMemo = seasonOf(d));
}
// Die Saison, die der LIGA-TAB gerade zeigt. Überall sonst gilt weiter
// currentSeason() — Awards, News und Ambient sollen nicht mitwandern, nur
// weil jemand im Liga-Tab in den Juni geschaut hat.
function ligaSaisonId(){
  if(!ligaSeasonId) return currentSeason().id;
  return seasons.some(s => s.id === ligaSeasonId) || ligaSeasonId === currentSeason().id
    ? ligaSeasonId : currentSeason().id;
}
function ligaSaisonLaeuft(){ return ligaSaisonId() === currentSeason().id; }
// v9.15 PERF: Match-Zeitstempel. `new Date(m.created_at)` wurde app-weit ~90×
// in Loops/Sort-Komparatoren geparst (O(n·log n) Date-Parses pro Sort).
// Beide Helper memoisieren pro created_at-String — Wiederhol-Scans (Sim, Awards,
// Badges, News, Views) kosten danach nur noch einen Map-Lookup. Der String ist
// der Key: Match-Edits erzeugen neue Strings und treffen automatisch frisch.
const _mtsMemo = new Map();
function mts(m){
  const k = m.created_at;
  let t = _mtsMemo.get(k);
  if(t === undefined){
    t = new Date(k).getTime();
    if(_mtsMemo.size > 50000) _mtsMemo.clear(); // Wachstums-Schutz
    _mtsMemo.set(k, t);
  }
  return t;
}
// 'YYYY-MM-DD' (UTC) des Matches — identische Semantik wie das bisherige
// `mdayKey(m)`.
const _mdayMemo = new Map();
function mdayKey(m){
  const k = m.created_at;
  let d = _mdayMemo.get(k);
  if(d === undefined){
    d = new Date(k).toISOString().slice(0,10);
    if(_mdayMemo.size > 50000) _mdayMemo.clear();
    _mdayMemo.set(k, d);
  }
  return d;
}
// ─── Der Kalendertag in Ortszeit ─────────────────────────────────────
// „Welcher Tag ist das?" stand fuenfmal ausgeschrieben im Code, und in zwei
// verschiedenen Schreibweisen: einmal mit fuehrender Null („2026-08-06"),
// einmal ohne („2026-7-6"). Zwei Schreibweisen fuer denselben Tag sind eine
// Falle — ein Satz von Schluesseln, der mit der einen gebaut und mit der
// anderen abgefragt wird, trifft nie. Gekreuzt hat es sich noch nicht, aber
// die naechste Stelle, die einen Tagesschluessel braucht, waehlt sonst wieder
// selbst [§C27].
//
// Ortszeit, nicht UTC: der Feed gruppiert nach Kalendertagen, wie sie auf der
// Uhr des Lesers stehen. `matchesByDay` schluesselt bewusst nach UTC und ist
// deshalb etwas anderes.
function tagKey(when){
  const d = new Date(when);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}
// Der Kalendertag davor. Vierundzwanzig Stunden zurück ist er nicht immer:
// nach der Umstellung auf die Sommerzeit lag 00:30 minus einen Tag in
// Millisekunden noch im Vorvortag, und „Gestern" stand eine Stunde lang
// über dem falschen Tag.
function gesternKey(jetzt){
  const d = new Date(jetzt);
  d.setDate(d.getDate() - 1);
  return tagKey(d);
}

// ─── Ein Zeitschnitt, der nichts abschneidet ─────────────────────────
// Der Feed vergleicht „vor dem letzten Spieltag" mit „heute", und „heute"
// schrieb er als den Zeitstempel der letzten Partie. Fuer jede geschnittene
// Rechnung ist das aber ein eigener Schluessel: gemessen rechnete ein
// Generatorlauf `prestigeTabelle` damit zweimal, einmal ungeschnitten fuer
// 17 ms und einmal als Schnitt fuer 59 ms — dieselbe Tabelle, zwei Toepfe.
//
// Der Schnitt verhaelt sich ausserdem anders: `seasonTitles` liest einen
// abgeschlossenen Monat nur OHNE Schnitt aus dem eingefrorenen Datensatz und
// rechnet ihn mit Schnitt frisch nach. Derselbe Monat kann damit unter zwei
// Namen erscheinen, je nachdem ob ein Schnitt mitgegeben wurde — und
// eingefroren ist das, was die App ueberall sonst zeigt [§10.2].
//
// Ein Schnitt hinter der letzten Partie ist deshalb kein Schnitt. `matches`
// ist aufsteigend sortiert, also ist die letzte auch die neueste.
// Außer ein Abschluss liegt zwischen ihm und jetzt: mit ihm kommt etwas ohne
// Partie. Mit dem Monatswechsel Meister, Vize und Team der Saison [§C34] —
// ein Schnitt am letzten Abend eines Monats galt am Morgen danach, bevor
// jemand gespielt hatte, als „jetzt" und trug die Titel schon, nach der
// ersten Partie nicht mehr: gemessen nannte die Laufbahn der Woche bis zum
// 31.05. für Martin morgens 87 Prestige und abends 62. Mit dem Schluss des
// letzten Spieltags um 23:59 der Spieler des Tages, was den ganzen Tag
// beschreibt (`_tagZu`) und die Rekorde über volle Tage; mit dem Wechsel
// der Woche der Spieler der Woche. Ohne diese beiden war der Stand vor und
// nach dem Schluss derselbe „jetzt", und wer durch den Spieler der Woche
// eine Stufe aufstieg, stand in keinem Vergleich.
function _schnitt(bisMs){
  if(!bisMs || !matches.length) return undefined;
  const letzte = mts(matches[matches.length - 1]);
  if(bisMs < letzte) return bisMs;
  const jetzt = Date.now();
  const tagSchluss = new Date(letzte); tagSchluss.setHours(23, 59, 0, 0);
  if(bisMs < tagSchluss.getTime() && jetzt >= tagSchluss.getTime()) return bisMs;
  // Über den Kalender und nicht in Millisekunden: eine Woche mit der
  // Zeitumstellung hat 167 oder 169 Stunden.
  const w = wochenBeginn(letzte); w.setDate(w.getDate() + 7);
  const wocheSchluss = w.getTime();
  if(bisMs < wocheSchluss && jetzt >= wocheSchluss) return bisMs;
  return bisMs >= seasonStart().getTime() ? undefined : bisMs;
}

// Dasselbe je Monat: ein Schnitt hinter dem Monatsende schneidet von DIESEM
// Monat nichts ab. `prestigeTabelle(bisMs)` fragt die Chronik jedes Monats
// bis zum Schnitt, und gemessen rechnete ein Generatorlauf Juni und Juli in
// sechs Schnittfassungen nach, obwohl beide Monate laengst zu sind.
function _schnittSaison(seasonId, bisMs){
  const b = _schnitt(bisMs);
  if(!b || !seasonId) return b;
  return b >= seasonEnd(seasonId).getTime() ? undefined : b;
}

function seasonStart(seasonId){
  if(!seasonId) seasonId=currentSeason().id;
  const [y,m]=seasonId.split('-').map(Number);
  return new Date(y,m-1,1);
}
// Die letzte Millisekunde des Monats. Sie war 23:59:59,000: eine Partie in
// der letzten Sekunde gehörte nach `seasonOf` zum Monat und fiel aus jedem
// Filter, der bis `seasonEnd` zählt (`matchesInSeason`, der Schnitt eines
// abgeschlossenen Monats in Auszeichnungen und Rekorden). Wer den Ersten
// 00:00 braucht, rechnet `seasonEnd + 1`.
function seasonEnd(seasonId){
  if(!seasonId) seasonId=currentSeason().id;
  const [y,m]=seasonId.split('-').map(Number);
  return new Date(y,m,0,23,59,59,999); // letzter Tag des Monats
}
function seasonLabel(seasonId){
  if(!seasonId) return '';
  const [y,m]=seasonId.split('-').map(Number);
  return _seasonLabelOf(y, m - 1);
}
function seasonDaysLeft(){
  const end=seasonEnd();const now=new Date();
  return Math.max(0,Math.ceil((end-now)/(1000*60*60*24)));
}
function matchesInSeason(seasonId){
  if(!seasonId) seasonId=currentSeason().id;
  const key='mseason_'+seasonId+'_'+matches.length+'_'+_cache.version;
  if(!_cache._mseason) _cache._mseason={};
  if(_cache._mseason[key]) return _cache._mseason[key];
  // Mit der Version im Schluessel waechst der Topf sonst ueber jede Version mit.
  _topfDeckel(_cache._mseason, 40);
  const start=seasonStart(seasonId),end=seasonEnd(seasonId);
  const result=matches.filter(m=>{const d=new Date(m.created_at);return d>=start&&d<=end;});
  _cache._mseason[key]=result;
  return result;
}

function allPastSeasons(){
  const cur=currentSeason();
  const key='allPastSeasons_'+cur.id+'_'+matches.length+'_'+seasons.length+'_'+_cache.version;
  if(_cache._allPastSeasonsKey===key) return _cache._allPastSeasonsData.slice();

  if(!matches.length) {
    _cache._allPastSeasonsKey = key;
    _cache._allPastSeasonsData = [];
    return [];
  }
  const first=new Date(matches[0].created_at);
  const now=new Date();
  const ids=[];
  let y=first.getFullYear(), m=first.getMonth();
  while(true){
    const id=y+'-'+String(m+1).padStart(2,'0');
    if(id===cur.id) break;
    if(new Date(y,m,1)>now) break;
    ids.push(id);
    m++; if(m>11){m=0;y++;}
  }
  _cache._allPastSeasonsKey=key;
  _cache._allPastSeasonsData=ids;
  return ids.slice(); // Kopie — ein Aufrufer mit .reverse()/.sort() darf den Cache nicht kippen
}



let seasons=[];  // geladene Saison-Ergebnisse aus DB
let _histPage = 0; // Aktuelle Seite für den Verlaufs-Tab (Lazy Loading)

// Beschriftung und Auswahl der Zeiträume im Awards-Reiter. Sie standen in
// der Zeichen-Bibliothek, weil sie dort zuerst gebraucht wurden.
function awPeriodLabel(){
  if(awPeriod==='season') return seasonLabel(awSeasonId||currentSeason().id);
  if(awPeriod==='week'){
    if(awWeekStart){
      const start=new Date(awWeekStart); start.setHours(0,0,0,0);
      const end=new Date(start); end.setDate(end.getDate()+6);
      return 'KW '+isoWeek(start)+' · '+datumFmt(start, 'tm')+'–'+datumFmt(end, 'tm');
    }
    return periodLabel('week');
  }
  return 'Gesamte Liga';
}
// Alle verfügbaren Saisons (vergangene + aktuelle), neueste zuerst
function availableSeasons(){
  // .slice() ist Pflicht: allPastSeasons() liefert das gecachte Array; ein
  // .reverse() darauf hätte den Cache dauerhaft verdreht und damit jede
  // andere Ansicht, die auf die aufsteigende Reihenfolge baut (Chronik!).
  const past=allPastSeasons().slice().reverse(); // neueste zuerst
  const cur=currentSeason().id;
  return [cur,...past];
}
