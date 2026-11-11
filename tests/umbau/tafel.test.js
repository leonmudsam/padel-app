// §13-Verifikation der Saison-Titel & Chronik mit den ECHTEN Liga-Daten.
//  1. Vergabe: deterministisch, ein Titel je Spieler, jeder Titel höchstens 1×
//  2. Belege stimmen mit unabhängig nachgerechneten Werten überein
//  3. Saisontitel-Historie
//  4. Kein zusätzliches Breaking: Saisonabschluss bleibt EINE Karte
//  5. Regression: alle Views + News-Feed rendern weiterhin
const fs = require('fs');
const DIR = __dirname;

// ── Echte Matches aus der gepackten Form rekonstruieren ──
const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n,i)=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const packed = fs.readFileSync(DIR + '/fixtures/matches.txt', 'utf8').trim();
const realMatches = packed.split(';').map((row, i) => {
  const f = row.split(',').map(Number);
  const pos = k => f[4+k] === 0 ? 'drive' : 'reves';
  return {
    id: 'm' + String(i).padStart(4,'0'),
    a1: IDS[f[0]], a2: IDS[f[1]], b1: IDS[f[2]], b2: IDS[f[3]],
    a1_side: pos(0), a2_side: pos(1), b1_side: pos(2), b2_side: pos(3),
    games_a: f[8], games_b: f[9], winner: f[10] === 0 ? 'A' : 'B',
    exp_a: f[11] / 1000,
    created_at: new Date(f[12] * 1000).toISOString(),
    deltas: {}
  };
});

const html = fs.readFileSync(require('./ziel.js'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nglobalThis.__k={eval:c=>eval(c)};\n' + code.slice(lc);

const RealDate = Date;
// Fixe Uhr: 26.08.2026, 21:00 — mitten in der laufenden August-Saison.
let NOW = new RealDate(2026, 7, 26, 21, 0, 0).getTime();
class FD extends RealDate { constructor(...a){ a.length?super(...a):super(NOW); } static now(){ return NOW; } }
global.Date = FD;

function el(id){return{id,innerHTML:'',textContent:'',value:'',style:{},dataset:{},attributes:{},
 classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],
 setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]??null},
 appendChild(c){this.children.push(c);return c},removeChild(){},remove(){},insertBefore(c){this.children.push(c);return c},
 addEventListener(){},removeEventListener(){},querySelector(){return null},querySelectorAll(){return[]},
 closest(){return null},focus(){},blur(){},click(){},scrollIntoView(){},
 getBoundingClientRect(){return{top:0,left:0,width:0,height:0}},contains(){return false}};}
const els=new Map();
global.document={readyState:'complete',getElementById(i){if(!els.has(i))els.set(i,el(i));return els.get(i)},
 createElement(t){return el('_'+t)},createTextNode(t){return{textContent:t}},
 querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},removeEventListener(){},
 body:el('body'),documentElement:el('html'),visibilityState:'visible',hidden:false};
const ls=new Map();
global.localStorage={getItem:k=>ls.has(k)?ls.get(k):null,setItem:(k,v)=>ls.set(k,String(v)),
 removeItem:k=>ls.delete(k),key:i=>[...ls.keys()][i]??null,get length(){return ls.size}};
global.window=global; global.addEventListener=()=>{}; global.removeEventListener=()=>{}; global.dispatchEvent=()=>true;
global.navigator={onLine:true,userAgent:'t',vibrate(){}};
global.location={href:'http://l/',search:'',hash:'',reload(){},replace(){},origin:'http://l',pathname:'/'};
global.history={pushState(){},replaceState(){},back(){},state:null};
global.fetch=()=>new Promise(()=>{}); global.setInterval=()=>0; global.clearInterval=()=>{};
global.setTimeout=()=>0; global.requestAnimationFrame=f=>{f();return 0};
global.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
global.alert=()=>{}; global.confirm=()=>true; global.prompt=()=>null;
const ch=()=>new Proxy(function(){},{get(_,p){return p==='then'?undefined:ch()},apply(){return ch()}});
global.supabase={createClient:()=>({from:()=>ch(),channel:()=>ch(),removeChannel(){},rpc:()=>ch()})};
(0,eval)(code);
const K = global.__k;

global.__D = {
  players: NAMES.map((n,i)=>({id:IDS[i], name:n, hidden:false, elo:0, atk:0.5})),
  matches: realMatches
};
// Archivierte Saisons — top_elo wird unten aus dem Sim befüllt.
global.__S = [
  {id:'2026-05', label:'Mai 2026',  start_date:'2026-04-30', end_date:'2026-05-31'},
  {id:'2026-06', label:'Juni 2026', start_date:'2026-05-31', end_date:'2026-06-30'},
  {id:'2026-07', label:'Juli 2026', start_date:'2026-06-30', end_date:'2026-07-31'},
];
K.eval(`
  players = globalThis.__D.players;
  matches = globalThis.__D.matches.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  seasons = globalThis.__S;
  invalidateCache();
  // Die App ist DB-First: simulateElo aggregiert m.deltas. Der Export liefert
  // keine Deltas, also einmal wie „Neuberechnen" in den Einstellungen fahren
  // und die Deltas an die Matches schreiben — danach ist die Welt konsistent.
  const _rc = simulateEloWithSliders(matches);
  const _dmap = {}; _rc.history.forEach(h => { _dmap[h.matchId] = h.deltas; });
  matches.forEach(m => { m.deltas = _dmap[m.id] || {}; });
  invalidateCache();
  const _g = getGlobalSim();
  seasons.forEach(s=>{
    const snap=_g.seasonEndElos[s.id]||{}, pl=_g.seasonPlayed[s.id]||{};
    const top=Object.keys(pl).filter(id=>pl[id]>0)
      .map(id=>({id,elo:Math.round(snap[id]??cfg.start_elo),wins:0,losses:0}))
      .sort((a,b)=>b.elo-a.elo);
    s.top_elo=JSON.stringify(top.slice(0,3));
    s.player_id=top[0]?top[0].id:null;
  });
  invalidateCache();
`);

let fails = 0, checks = 0;
const ok = (cond, label, extra) => {
  checks++;
  if(cond){ console.log('  ✓ ' + label); }
  else { fails++; console.log('  ✗ ' + label + (extra ? '\n      → ' + extra : '')); }
};
const nameOf = id => { const i = IDS.indexOf(id); return i >= 0 ? NAMES[i] : '?'; };

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ 1. VERGABE — die echten Tafeln ═══');
const SIDS = ['2026-05','2026-06','2026-07','2026-08'];
const tafeln = {};
SIDS.forEach(sid => {
  const T = K.eval(`JSON.stringify(seasonTitles(${JSON.stringify(sid)}))`);
  tafeln[sid] = JSON.parse(T);
});
SIDS.forEach(sid => {
  const T = tafeln[sid];
  console.log(`\n  ── ${T.label}${T.live ? ' (läuft)' : ''} · ${T.matches} Matches, ${T.days} Spieltage`);
  T.awarded.forEach(a => {
    console.log(`     ${a.name.padEnd(22)} ${nameOf(a.pid).padEnd(9)} ${a.ev}`);
  });
  if(T.empty.length) console.log(`     ohne Titel: ${T.empty.map(nameOf).join(', ')}`);
});

console.log('\n═══ 2. INVARIANTEN ═══');
SIDS.forEach(sid => {
  const T = tafeln[sid];
  const pids = T.awarded.map(a => a.pid);
  const tids = T.awarded.map(a => a.titleId);
  // Seit [§C32] geht jeder Eintrag an seinen echten Bestwert-Halter. Ein
  // Spieler darf deshalb mehrere halten, und ein Eintrag mehrere Halter —
  // aber nur, wenn sie punktgleich sind. Dass in der Matrix trotzdem nur
  // EIN Eintrag je Spieler und Monat steht, ist eine Anzeige-Regel
  // (seasonTitleOf nimmt den ersten in Katalogreihenfolge).
  const paare = T.awarded.map(a => a.titleId + '|' + a.pid);
  ok(new Set(paare).size === paare.length, `${sid}: kein Eintrag geht zweimal an denselben Spieler`);
  const fremd = K.eval(`(function(){
    const C=_seasonTitleCtx(${JSON.stringify(sid)}), T=seasonTitles(${JSON.stringify(sid)});
    const raus=[];
    SEASON_TITLES.forEach(def=>{
      const traeger=T.awarded.filter(a=>a.titleId===def.id).map(a=>a.pid);
      if(!traeger.length) return;
      const r=def.pick(C,new Set());
      traeger.forEach(p=>{ if(!r || r.halter.indexOf(p)<0) raus.push(def.id+'/'+pname(p)); });
    });
    return raus.join(', ');
  })()`);
  ok(!fremd, `${sid}: jeder Traeger haelt den Bestwert seines Eintrags`, fremd || 'alle');
  ok(T.awarded.every(a => a.ev && a.ev.length > 3), `${sid}: jeder Titel hat einen Beleg`);
  ok(T.awarded.every(a => a.short && a.short.length <= 10), `${sid}: Kurz-Label passt in eine Zeile`,
     (T.awarded.find(a => !a.short || a.short.length > 13)||{}).short);
});
// Determinismus: zweimal rechnen ergibt exakt dasselbe (auch nach Cache-Reset)
const before = JSON.stringify(tafeln);
K.eval('invalidateCache();');
const after = JSON.stringify(Object.fromEntries(SIDS.map(sid =>
  [sid, JSON.parse(K.eval(`JSON.stringify(seasonTitles(${JSON.stringify(sid)}))`))])));
ok(before === after, 'Vergabe ist deterministisch (identisch nach Cache-Reset)');

console.log('\n═══ 3. BELEGE GEGEN UNABHÄNGIGE RECHNUNG ═══');
// Unabhängige Nachrechnung direkt auf realMatches — bewusst NICHT über die
// App-Funktionen, damit ein Fehler in §13 hier auffliegt.
function refSeason(sid){
  const [y,mo] = sid.split('-').map(Number);
  const from = new Date(y, mo-1, 1).getTime(), to = new Date(y, mo, 0, 23,59,59).getTime();
  const ms = realMatches.filter(m => { const t = new Date(m.created_at).getTime(); return t >= from && t <= to; });
  const P = {}, run = {}, days = {};
  const ensure = id => P[id] || (P[id] = {g:0,w:0,l:0,gd:0,revG:0,drvG:0,atkGoals:0,defConc:0,
    nail:0,bitter:0,perfect:0,debacle:0,ups:0,best:0,days:new Set(),maxDay:0,dayN:{}});
  ms.forEach(m => {
    const d = m.created_at.slice(0,10);
    [m.a1,m.a2,m.b1,m.b2].forEach(id => {
      const p = ensure(id);
      const onA = (id===m.a1||id===m.a2);
      const w = (onA && m.winner==='A') || (!onA && m.winner==='B');
      const gf = onA ? m.games_a : m.games_b, ga = onA ? m.games_b : m.games_a;
      const pos = id===m.a1?m.a1_side:id===m.a2?m.a2_side:id===m.b1?m.b1_side:m.b2_side;
      const exp = onA ? m.exp_a : 1 - m.exp_a;
      p.g++; if(w) p.w++; else p.l++; p.gd += gf - ga;
      if(pos==='drive'){ p.drvG++; p.atkGoals += gf; } else { p.revG++; p.defConc += ga; }
      if(w && gf===10 && ga===9) p.nail++;
      if(!w && gf===9 && ga===10) p.bitter++;
      if(w && gf===10 && ga===0) p.perfect++;
      if(!w && gf===0 && ga===10) p.debacle++;
      if(w && exp < 0.35) p.ups++;
      p.days.add(d);
      p.dayN[d] = (p.dayN[d]||0)+1; if(p.dayN[d] > p.maxDay) p.maxDay = p.dayN[d];
      if(w){ run[id] = (run[id]||0)+1; if(run[id] > p.best) p.best = run[id]; } else run[id] = 0;
    });
  });
  return {P, days: new Set(ms.map(x=>x.created_at.slice(0,10))).size, n: ms.length};
}
const REF = {}; SIDS.forEach(sid => REF[sid] = refSeason(sid));
SIDS.forEach(sid => {
  const T = tafeln[sid], R = REF[sid];
  ok(T.matches === R.n, `${sid}: Match-Anzahl stimmt (${T.matches})`, `ref ${R.n}`);
  ok(T.days === R.days, `${sid}: Spieltage stimmen (${T.days})`, `ref ${R.days}`);
  T.awarded.forEach(a => {
    const p = R.P[a.pid]; if(!p) return;
    const num = (a.ev.match(/\d+/) || [])[0];
    let expect = null;
    switch(a.titleId){
      case 'unstoppable':  expect = p.best; break;
      case 'executioner':  expect = p.perfect; break;
      case 'tireless':     expect = p.g; break;
      case 'thriller':     expect = p.nail; break;
      case 'giant_slayer': expect = p.ups; break;
      case 'marathon':     expect = p.maxDay; break;
      case 'omnipresent':  expect = p.days.size; break;
      // Diese beiden tragen seit dem Umbau eine MONATSACHSE, und die
      // sortiert nach dem Anteil an den eigenen Pleiten, nicht nach der
      // Anzahl [§C35]. Der Beleg beginnt deshalb mit dem Anteil, und die
      // Gegenrechnung rechnet denselben Anteil nach: Zaehler UND Nenner
      // kommen dafuer aus den Rohpartien, ein Fehler in §13 fliegt also
      // weiter auf.
      case 'abyss':        expect = p.l ? Math.round(p.debacle / p.l * 100) : 0; break;
      case 'hardluck':     expect = p.l ? Math.round(p.bitter / p.l * 100) : 0; break;
      case 'wall':         expect = p.revG; break;
    }
    if(expect !== null){
      ok(String(expect) === num, `${sid}/${a.titleId}: Beleg „${num}" == unabhängig gerechnet`, `ref ${expect}`);
    }
  });
  // Der Meister muss der Elo-Führende der Saison sein
  const champ = T.awarded.find(a => a.titleId === 'champion');
  if(champ){
    const eloRank = K.eval(`(()=>{const g=getGlobalSim();
      const map=${sid==='2026-08'?'g.elo':`(g.seasonEndElos[${JSON.stringify(sid)}]||{})`};
      const pl=g.seasonPlayed[${JSON.stringify(sid)}]||{};
      return JSON.stringify(Object.keys(pl).filter(id=>pl[id]>0)
        .map(id=>({id,e:Math.round(map[id]??cfg.start_elo)})).sort((a,b)=>b.e-a.e).slice(0,2));})()`);
    const top = JSON.parse(eloRank);
    ok(top[0] && top[0].id === champ.pid, `${sid}: Meister == Elo-Platz 1 (${nameOf(champ.pid)})`,
       top[0] ? 'Sim sagt ' + nameOf(top[0].id) : 'kein Sim-Rang');
    const prince = T.awarded.find(a => a.titleId === 'crown_prince');
    if(prince && top[1]) ok(top[1].id === prince.pid, `${sid}: Kronprinz == Elo-Platz 2 (${nameOf(prince.pid)})`,
       'Sim sagt ' + nameOf(top[1].id));
  }
});

console.log('\n═══ 3b. SORTIERUNG ═══');
K.eval('invalidateCache(); availableSeasons(); availableSeasons();');
const order = JSON.parse(K.eval(`JSON.stringify(allSeasonTitles().map(x=>x.sid))`));
console.log('  allSeasonTitles (neueste zuerst):', order.join(' , '));
const desc = order.slice().sort().reverse();
ok(JSON.stringify(order) === JSON.stringify(desc), 'Saisons kommen chronologisch zurück');
ok(JSON.stringify(K.eval('JSON.stringify(allPastSeasons())')) === JSON.stringify(K.eval('JSON.stringify(allPastSeasons())')),
   'allPastSeasons bleibt nach mehrfachem Aufruf stabil');
const past1 = JSON.parse(K.eval('JSON.stringify(allPastSeasons())'));
K.eval('availableSeasons();');
const past2 = JSON.parse(K.eval('JSON.stringify(allPastSeasons())'));
ok(JSON.stringify(past1) === JSON.stringify(past2), 'availableSeasons() dreht den Cache nicht mehr um', past1+' vs '+past2);
const chron = JSON.parse(K.eval(`JSON.stringify(seasonTitleHistory(${JSON.stringify(IDS[9])}).map(r=>r.sid))`));
ok(JSON.stringify(chron) === JSON.stringify(chron.slice().sort()), 'Chronik-Streifen ist chronologisch', chron.join(','));

console.log('\n\u2550\u2550\u2550 4. SAISONTITEL-HISTORIE \u2550\u2550\u2550');
// Ehrentitel gibt es nicht mehr (§13.4b) — die Laufbahn-Chroniken pruefen
// _chron2_test.js. Hier bleibt nur die Titel-Historie pro Spieler.
NAMES.forEach((n, i) => {
  const rows = JSON.parse(K.eval(`JSON.stringify(seasonTitleHistory(${JSON.stringify(IDS[i])}))`));
  if(!rows.length) return;
  const line = rows.map(r => `${r.label.split(' ')[0].slice(0,3)}:${r.title ? r.title.name.replace(/^(Der|Die|Das) /,'') : '\u2014'}`).join('  ');
  console.log(`  ${n.padEnd(9)} ${line}`);
  // Chronologisch und ohne Luecken in der Sortierung
  const sids = rows.map(r => r.sid);
  ok(sids.join() === sids.slice().sort().join(), `${n}: Historie ist chronologisch`);
  ok(rows.filter(r => r.live).length <= 1, `${n}: hoechstens eine laufende Saison`);
});

console.log('\n═══ 5. TITEL-ABZEICHEN ═══');
NAMES.forEach((n, i) => {
  const b = JSON.parse(K.eval(`JSON.stringify(playerTitleBadge(${JSON.stringify(IDS[i])})||null)`));
  console.log(`  ${n.padEnd(9)} ${b ? (b.name + '  [' + b.kind + ' · ' + b.sub + ']') : '—'}`);
});

console.log('\n═══ 5b. RANGLISTEN-MARKE ═══');
const marks = NAMES.map((n,i)=>({n, m: JSON.parse(K.eval(`JSON.stringify(_playerRankMarks(${JSON.stringify(IDS[i])})[0]||null)`))}))
  .filter(x=>x.m);
marks.forEach(x => console.log(`  ${x.n.padEnd(9)} ${x.m.kind.padEnd(6)} ${x.m.label}  (${x.m.sub})`));
// Seit §13.6 traegt jede Zeile bis zu zwei Marken: Meistertitel + der
// Chronik-Eintrag der laufenden Saison. Wie viele Zeilen eine Marke tragen,
// haengt davon ab, wie viele Spieler diesen Monat eine Bedingung erfuellen —
// eine harte Obergrenze waere hier eine Luege. Geprueft wird deshalb nur,
// dass nicht JEDE Zeile markiert ist (dann unterscheidet die Marke nichts).
ok(marks.length < NAMES.length, `nicht jede Zeile markiert (${marks.length} von ${NAMES.length})`);
ok(marks.every(x => x.m.kind === 'champ' || x.m.kind === 'season'), 'Marke ist Meistertitel oder laufender Chronik-Eintrag');

console.log('\n═══ 6. NEWS — KEIN BREAKING-SPAM ═══');
const feed = JSON.parse(K.eval(`(()=>{const s=_consolidateStories(_buildStories());
  return JSON.stringify(s.map(x=>({id:x.id,t:x.title,brk:_isBreaking(x),type:(x.dataRef||{}).type})));})()`));
const brk = feed.filter(f => f.brk);
console.log(`  Feed: ${feed.length} Karten, davon ${brk.length} Breaking`);
brk.forEach(b => console.log(`     ! ${b.type}  ${b.t}`));
ok(feed.filter(f => f.type === 'season_recap').length <= 1, 'höchstens EINE Saison-Abschluss-Karte');
ok(!feed.some(f => f.type === 'season_titles'), 'kein eigener Story-Typ für Titel (kein Extra-Breaking)');
ok(!brk.some(f => /Ehrentitel/i.test(f.t)), 'keine Ehrentitel-Karte mehr im Feed');
// Die Titel-Fun-Fact-Vorlage baut und ist NICHT breaking
const amb = K.eval(`(()=>{const pm2=pmap();const T=_ambientTemplatePool(new Date(),pm2,id=>(pm2[id]&&pm2[id].name)||'?');
  const t=T.find(x=>x.key==='season_title_race'); if(!t) return 'MISSING';
  const r=t.make(); return r?JSON.stringify(r):'NULL';})()`);
ok(amb !== 'MISSING', 'Fun-Fact-Vorlage season_title_race existiert');
ok(amb !== 'NULL', 'Fun-Fact-Vorlage liefert Daten');
if(amb !== 'MISSING' && amb !== 'NULL'){
  const a = JSON.parse(amb);
  console.log(`     Fun Fact: „${a.title}" — ${a.desc}`);
  ok(a.cat !== 'breaking', 'Titelrennen ist Fun Fact, nicht Breaking');
}

console.log('\n═══ 7. RENDERING ═══');
const render = (label, expr) => {
  try { const h = K.eval(expr); ok(typeof h === 'string' && h.length > 0, label + ' rendert (' + h.length + ' Zeichen)'); }
  catch(e){ ok(false, label + ' rendert', e.message); }
};
render('Chronik-Streifen', `_chronStripHtml(${JSON.stringify(IDS[9])})`);
render('Titel-Pille',      `_titlePillHtml(${JSON.stringify(IDS[9])})`);
render('Rekord-Liste',     `ligaRekordeHtml(true)`);
render('Chronik-Matrix',   `ligaChronikMatrixHtml()`);
render('Titel-Plakette',   `_titlePlateHtml(seasonTitles('2026-07').awarded[0])`);
K.eval(`period='season'; tab='ranking';`);
render('Liga-Tab',   `vRanking()`);
// Die Ewige Tafel ist die RANGLISTE, nicht die Bestenliste: Podest, dann
// Tabelle. Peak-Elo, Meiste Siege und Beste Siegrate standen hier als drei
// Karten darüber — und dieselben drei Zahlen noch einmal als Kacheln im
// Awards-Tab. Zweimal dieselbe Zahl auf zwei Seiten heißt, dass eine davon
// überflüssig ist.
try {
  const g = K.eval(`period='all'; vRanking()`);
  const iRek = g.indexOf('records-grid'), iPod = g.indexOf('podest');
  ok(iPod > -1, 'Gesamt-Tafel zeigt das Podest', 'pod ' + iPod);
  ok(iRek === -1, 'keine Rekordkarten mehr — die stehen im Awards-Tab',
     'rek ' + iRek);
} catch(e){ ok(false, 'Gesamt-Tafel rendert', e.message); }
K.eval(`period='season'`);

// ── Ein Gerüst für alle vier Zeiträume [§C28] ────────────────────────
// Der Liga-Tab hatte in jedem Reiter eine andere Abfolge: die Saison ohne
// Metrikleiste und mit dem Team der Saison ganz unten, Woche und Tag mit
// einer goldenen Heldenkarte und zwei Sortierknöpfen eigener Aufschrift,
// die Ewige Tafel mit fünf. Jetzt steht überall dasselbe in derselben
// Reihenfolge — Kontext, Nebenwertungen, Tabelle.
// Sortiert wird nur in der EWIGEN TAFEL. Saison, Woche und Tag sind die
// Liga-Rangliste, und die ist die Elo-Rangliste; wer dort nach Siegrate
// sortieren kann, sucht in Wahrheit eine Bestenliste, und die steht im
// Awards-Tab.
console.log('\n═══ 7b. DER LIGA-TAB: EIN GERÜST ═══');
const _ligaSicht = {};
['season','week','day','all'].forEach(per => {
  try { _ligaSicht[per] = K.eval(`period=${JSON.stringify(per)}; rankMetric='elo'; vRanking()`); }
  catch(e){ _ligaSicht[per] = ''; ok(false, per + ' rendert', e.message); }
});
Object.entries(_ligaSicht).forEach(([per, h]) => {
  if(!h) return;
  const iMetrik = h.indexOf('data-metric='), iListe = h.indexOf('class="rlist"');
  ok(iListe > -1, `${per}: hat eine Tabelle`);
  if(per === 'all'){
    ok(iMetrik > -1, 'Gesamt: hat eine Metrikleiste');
    ok(iMetrik < iListe, 'Gesamt: die Metrikleiste steht über der Tabelle',
       `metrik ${iMetrik} liste ${iListe}`);
  } else {
    ok(iMetrik === -1,
       `${per}: keine Metrikleiste — die Liga-Rangliste ist die Elo-Rangliste`,
       'metrik ' + iMetrik);
  }
  // Kein Reiter trägt mehr eine eigene Sortierbedienung.
  ok(h.indexOf('data-periodsort') === -1, `${per}: keine eigene Sortierbedienung mehr`);
  // Jede Zeile trägt das Wappen [§C27].
  const zeilen = (h.match(/class="rrow/g) || []).length;
  const wappen = (h.match(/class="rav zn/g) || []).length;
  ok(zeilen > 0 && wappen >= zeilen,
     `${per}: jede Ranglistenzeile trägt ein Wappen`, `zeilen ${zeilen} wappen ${wappen}`);
});
// Woche und Tag tragen eine Nebenwertung über der Tabelle: der Spieler des
// Zeitraums ist dort kein Tabellenerster, sondern ein Titel mit eigener Regel
// (Mindestzahl Siege, beste Quote) und gehört deshalb NEBEN die Tabelle.
// Die Saison hat keine: ihr Erster IST die erste Zeile, und die Duos haben
// einen eigenen Reiter mit vollständiger Rangliste.
['week','day'].forEach(per => {
  const h = _ligaSicht[per]; if(!h) return;
  const iNeben = h.indexOf('class="nw-hero'), iListe = h.indexOf('class="rlist"');
  ok(iNeben > -1, `${per}: hat eine Nebenwertungs-Karte`);
  ok(iNeben > -1 && iNeben < iListe,
     `${per}: die Nebenwertung steht über der Tabelle`, `neben ${iNeben} liste ${iListe}`);
});
ok(_ligaSicht.season && _ligaSicht.season.indexOf('class="nw-hero') === -1,
   'season: keine Team-Karte mehr über der Spielertabelle — das sagt der Duo-Reiter',
   'nw-hero bei ' + (_ligaSicht.season || '').indexOf('class="nw-hero'));
// Die Ewige Tafel zeigt jeden Spieler, auch bei der Elo-Sortierung. Vorher
// fehlten dort die ersten drei, weil sie schon auf dem Podest standen —
// die Tabelle begann bei 4 und war damit eine andere als unter „Siegrate".
const _aktive = K.eval(`activePlayers().length`);
['elo','winrate'].forEach(m => {
  const h = K.eval(`period='all'; rankMetric=${JSON.stringify(m)}; vRanking()`);
  const zeilen = (h.match(/class="rrow/g) || []).length;
  ok(zeilen === _aktive,
     `Ewige Tafel nach ${m}: alle ${_aktive} Spieler stehen in der Tabelle`, 'gezählt: ' + zeilen);
});
// Die Torbilanz ist ein Schnitt je Partie, wie Plus-Minus. Als Summe stand
// vorn, wer am meisten gespielt hatte — in Gesamt und unter den Teams.
{
  const MIN = K.eval(`AW_MIN.spielerSaldo`);
  const ziffer = v => { const r = Math.round(v * 10) / 10; return 'Ø ' + (r >= 0 ? '+' : '') + (r === 0 ? 0 : r).toFixed(1).replace('.', ','); };
  const h = K.eval(`period='all'; rankMetric='goaldiff'; vRanking()`);
  const tafel = h.slice(h.indexOf('class="rlist"'));
  const ids = [...tafel.matchAll(/class="rrow[^"]*" data-detail="([^"]+)"/g)].map(m => m[1]);
  const werte = [...tafel.matchAll(/<div class="big[^"]*">([^<]*)<\/div>/g)].map(m => m[1].trim());
  const st = JSON.parse(K.eval(`JSON.stringify(activePlayers().map(p => { const s = allPlayerStats()[p.id] || playerStats(p.id); return {id:p.id, gd:s.gd, g:s.games}; }))`));
  const je = x => x.g ? x.gd / x.g : 0;
  const soll = st.slice().sort((a, b) => (b.g >= MIN) - (a.g >= MIN) || je(b) - je(a) || b.g - a.g);
  const summe = st.slice().sort((a, b) => b.gd - a.gd);
  ok(ids.length === st.length && ids.join() === soll.map(x => x.id).join() && soll.map(x => x.id).join() !== summe.map(x => x.id).join(),
     'Ewige Tafel nach Torbilanz: geordnet nach dem Schnitt je Partie, nicht nach der Summe',
     'Erster ' + K.eval(`pname(${JSON.stringify(ids[0])})`) + ' mit ' + (werte[0] || '?') + ', nach Summe wäre es ' + K.eval(`pname(${JSON.stringify(summe[0].id)})`));
  ok(werte.length === ids.length && werte.every((w, i) => w === ziffer(je(soll[i]))),
     'jede Zeile zeigt den Schnitt wie Plus-Minus („Ø +1,4")', werte.slice(0, 3).join(' · '));
  const t = K.eval(`teamSort='gd'; teamView='best'; vTeams()`);
  const duos = [...t.matchAll(/data-team="([^"]+)"/g)].map(m => m[1]);
  const tw = [...t.matchAll(/<div class="tm-wert"[^>]*>([^<]*)<\/div>/g)].map(m => m[1].trim());
  const ts = JSON.parse(K.eval(`JSON.stringify(teamStats().filter(t => t.g >= 4 && t.ids.every(id => ligaAktiv(id))).map(t => ({k:t.ids.join('|'), gd:t.gf - t.ga, g:t.g, q:t.w / t.g})))`));
  const tsoll = ts.slice().sort((a, b) => b.gd / b.g - a.gd / a.g || b.q - a.q || b.g - a.g);
  const tsumme = ts.slice().sort((a, b) => b.gd - a.gd);
  ok(duos.length === ts.length && duos.join() === tsoll.map(x => x.k).join() && tsoll.map(x => x.k).join() !== tsumme.map(x => x.k).join(),
     'Teams nach Torbilanz: geordnet nach dem Schnitt je Partie, nicht nach der Summe', 'erste Zeile ' + (tw[0] || '?'));
  ok(tw.length === duos.length && tw.every((w, i) => w === ziffer(tsoll[i].gd / tsoll[i].g)),
     'jede Duo-Zeile zeigt den Schnitt wie Plus-Minus', tw.slice(0, 3).join(' · '));
  K.eval(`teamSort='wr'`);
}
K.eval(`period='season'; rankMetric='elo'`);
render('Awards-Tab', `awView='awards'; vAwards()`);
render('Rekorde-Reiter', `awView='rekorde'; vAwards()`);
render('Chronik-Reiter', `awView='chronik'; vAwards()`);
K.eval(`awView='awards'`);
render('Teams-Tab',  `vTeams()`);
render('Verlauf',    `vHistory()`);
try { K.eval(`showSeasonTable('2026-07')`); ok(true, 'Saison-Tafel-Sheet öffnet ohne Fehler'); }
catch(e){ ok(false, 'Saison-Tafel-Sheet öffnet', e.message); }
try { K.eval(`showLigaChronik()`); ok(true, 'Liga-Chronik-Sheet öffnet ohne Fehler'); }
catch(e){ ok(false, 'Liga-Chronik-Sheet öffnet', e.message); }
try { K.eval(`showPlayer(${JSON.stringify(IDS[9])})`); ok(true, 'Spielerprofil öffnet ohne Fehler'); }
catch(e){ ok(false, 'Spielerprofil öffnet', e.message); }

// Die Laufbahn verspricht eine Rechnung, keine Behauptung: jede Zeile muss
// zur Kopfzeile darueber passen und jede Kopfzeile zur Gesamtzahl darunter.
// Ohne Restverteilung driftet eine Liste aus 21 Posten um bis zu einen Punkt
// gegen ihre eigene Summe — und das sieht man nur, wenn man nachrechnet.
K.eval(`globalThis.__ALT_SHEET = openSheet; globalThis.__ALT_REOPEN = _sheetSetReopen;
  globalThis.__ALT_BIND = _bindChronikClicks;
  openSheet = h => { globalThis.__SHEET = h; };
  _sheetSetReopen = () => {}; _bindChronikClicks = () => {};`);
{
  const num = t => Number(String(t).replace(',', '.'));
  let schief = [];
  IDS.forEach((pid, i) => {
    let h;
    try { K.eval(`showLaufbahn(${JSON.stringify(pid)})`); h = K.eval('globalThis.__SHEET'); }
    catch(e){ schief.push(NAMES[i] + ': ' + e.message); return; }
    if(!h){ schief.push(NAMES[i] + ': kein Sheet'); return; }
    const grp = [...h.matchAll(/<div class="lb-grp">([\s\S]*?)(?=<div class="lb-grp">|<div class="lb-summe">)/g)];
    const mg = h.match(/lb-summe[\s\S]*?class="num">(\d+)</);
    if(!mg || grp.length !== 3){ schief.push(NAMES[i] + ': Aufbau unerwartet'); return; }
    const gesamt = num(mg[1]);
    let koepfe = 0;
    grp.forEach(g => {
      const kopf = num(g[1].match(/lb-grp-k[\s\S]*?class="num">([\d,]+)</)[1]);
      const zeilen = [...g[1].matchAll(/class="p num">([\d,]+)</g)].map(m => num(m[1]));
      const summe = Math.round(zeilen.reduce((a, b) => a + b, 0) * 10) / 10;
      koepfe += kopf;
      if(Math.abs(summe - kopf) > 1e-9) schief.push(NAMES[i] + ': Posten ' + summe + ' vs Kopf ' + kopf);
    });
    if(Math.abs(koepfe - gesamt) > 1e-9) schief.push(NAMES[i] + ': Koepfe ' + koepfe + ' vs Gesamt ' + gesamt);
  });
  ok(schief.length === 0, 'jede Laufbahn-Aufschluesselung geht exakt auf', schief.join(' | '));
}
K.eval(`openSheet = globalThis.__ALT_SHEET; _sheetSetReopen = globalThis.__ALT_REOPEN;
  _bindChronikClicks = globalThis.__ALT_BIND;`);
// Der Monatsrückblick erzählt Spielgeschehen und Rangspitze. Die Chronik hat
// ihre eigene Karte und darf hier nicht ein zweites Mal stehen.
try {
  const body = K.eval(`(()=>{const s=_consolidateStories(_buildStories()).find(x=>(x.dataRef||{}).type==='season_recap');
    return s ? _newsDetailBody(s) : 'KEINE';})()`);
  ok(body === 'KEINE' || (!body.includes('tplate') && body.includes('Der Monat in Zahlen')),
     'Saison-Abschluss und Chronik erzählen verschiedene Inhalte',
     body === 'KEINE' ? 'keine Recap-Story im Feed (ok außerhalb der ersten Monatstage)' : 'Spielgeschehen fehlt oder Chronik doppelt');
} catch(e){ ok(false, 'Saison-Abschluss-Detail', e.message); }

console.log('\n═══ 7c. DER LIGA-TAB ZEIGT EINE GEWÄHLTE SAISON ═══');
// Der Liga-Tab konnte nur „jetzt". Wer den Juni sehen wollte, fand ihn
// nirgends. Jetzt wählt ein Saisonwähler die Saison — und zwar NUR für den
// Liga-Tab: Awards, News und Ambient rechnen weiter mit der laufenden.
// Das ist die eigentliche Gefahr an dieser Änderung, deshalb steht sie hier.
{
  const cur = K.eval(`currentSeason().id`);
  const alt = '2026-06';
  const jetzt = K.eval(`period='season'; ligaSicht='spieler'; ligaSeasonId=null; vRanking()`);
  const juni  = K.eval(`period='season'; ligaSicht='spieler'; ligaSeasonId=${JSON.stringify(alt)}; vRanking()`);

  // Der Fortschritt ist keine Karte mehr, sondern eine Zeile (.lauf) — die
  // Aussage bleibt: laufende Saison zeigt ihn, abgeschlossene nicht.
  ok(jetzt.includes('class="lauf"'),
     'laufende Saison: der Fortschritt steht da');
  ok(!juni.includes('class="lauf"'),
     'abgeschlossene Saison: kein Fortschritt — es geht nichts mehr weiter');
  ok(juni.includes('saison-abgeschlossen'),
     'abgeschlossene Saison: sie sagt, dass sie abgeschlossen ist');
  ok(juni.includes(K.eval(`seasonLabel(${JSON.stringify(alt)})`)),
     'abgeschlossene Saison: ihr Name steht im Kopf');

  // Die Zahlen müssen andere sein — sonst wandert nur die Beschriftung.
  const eloVon = h => (h.match(/<div class="big num">(-?\d+)<\/div>/g)||[]).slice(0,5).join(',');
  ok(eloVon(jetzt) !== eloVon(juni),
     'die Tabelle zeigt wirklich andere Werte, nicht nur eine andere Aufschrift',
     'jetzt ' + eloVon(jetzt) + ' | juni ' + eloVon(juni));

  // In einer abgeschlossenen Saison brennt niemand mehr: „on fire" ist
  // Gegenwart. Der Wappenrahmen bleibt, die Flamme nicht.
  ok(juni.includes('class="rav zn"') && !/class="rav zn zn-l\d/.test(juni),
     'abgeschlossene Saison: Wappen ja, Flamme nein',
     (juni.match(/class="rav zn[^"]*"/g)||[]).slice(0,3).join(' | '));

  // Der Awards-Tab darf NICHT mitwandern.
  // Die Verlaufs-ids im Wappen sind ein Zähler, der bei jedem Zeichnen
  // hochläuft ('i17_'). Sie gehören nicht zum Inhalt — sonst wäre kein
  // zweiter Aufruf je gleich. Vor dem Vergleich also wegnormieren.
  const ohneIds = h => h.replace(/\b(i|ize)\d+_/g, 'i_');
  const awJetzt = ohneIds(K.eval(`ligaSeasonId=null;  awView='awards'; awPeriod='season'; awSeasonId=null; vAwards()`));
  const awJuni  = ohneIds(K.eval(`ligaSeasonId=${JSON.stringify(alt)}; awView='awards'; awPeriod='season'; awSeasonId=null; vAwards()`));
  ok(awJetzt === awJuni,
     'die Awards folgen der Liga-Saisonwahl NICHT — sie haben ihre eigene',
     'Länge ' + awJetzt.length + ' vs ' + awJuni.length);

  // Der Award-Sammler benutzt dasselbe Podest wie die Ewige Tafel [§C6] —
  // und seine Avatare tragen dasselbe Wappen wie jede Ranglistenzeile.
  const awAll = K.eval(`awView='awards'; awPeriod='all'; vAwards()`);
  ok((awAll.match(/class="podest"/g) || []).length === 1,
     'Awards: ein Podest, dasselbe Bauteil wie in der Ewigen Tafel',
     (awAll.match(/class="podest"/g) || []).length + '×');
  ok((awAll.match(/class="pod-karte/g) || []).length === 3,
     'Awards: drei Podestkarten',
     (awAll.match(/class="pod-karte/g) || []).length + '×');
  ok(awAll.indexOf('aw-collector') === -1,
     'Awards: das alte Sammler-Podest ist weg — zwei Podeste waren eines zu viel');
  ok((awAll.match(/class="rav zn[^"]*pod-av/g) || []).length === 3,
     'Awards: jeder Sammler trägt sein Wappen',
     (awAll.match(/class="rav zn[^"]*pod-av/g) || []).length + '×');
  ok(awJuni.includes(K.eval(`seasonLabel(${JSON.stringify(cur)})`)),
     'die Awards zeigen weiter die laufende Saison');
  K.eval(`ligaSeasonId=null; awPeriod='all';`);
}

console.log('\n═══ 7d. DIE DUOS SIND EINE ZWEITE RANGLISTE ═══');
// Das Team der Saison stand nur als Karte über der Tabelle: man sah den
// Ersten, nie den Rest. Jetzt sind es zwei Ranglisten über denselben
// Zeitraum, gewechselt über einen Reiter.
{
  const sp = K.eval(`period='season'; ligaSeasonId=null; ligaSicht='spieler'; vRanking()`);
  const du = K.eval(`period='season'; ligaSeasonId=null; ligaSicht='duos';    vRanking()`);
  ok(sp.includes('data-ligasicht="duos"') && du.includes('data-ligasicht="spieler"'),
     'beide Sichten tragen den Umschalter');
  const duoZeilen = (du.match(/class="rrow duo/g)||[]).length;
  ok(duoZeilen >= 3, 'die Duo-Sicht listet alle Duos, nicht nur die Spitze',
     duoZeilen + ' Zeilen');
  ok(du.indexOf('Team der Saison') > -1 && !du.includes('class="nw-hero'),
     'der Erste steht IN der Tabelle, nicht als Karte darüber');
  // 31 Duos wären 62 Wappen — eine Viertelmillion Zeichen für eine Tabelle.
  ok(!/class="rrow duo[\s\S]{0,400}class="rav zn/.test(du),
     'die Duo-Zeile trägt Chips, kein Wappen — ein Duo hat keinen Rang');
  ok(du.length < sp.length,
     'die Duo-Sicht ist nicht schwerer als die Spielersicht',
     'duo ' + du.length + ' spieler ' + sp.length);
  K.eval(`ligaSicht='spieler';`);
}

console.log('\n═══ 7e. DIE REKORDE SIND SORTIERT, DIE VITRINE HAT KEINE LÖCHER ═══');
// Neunundzwanzig gleich aussehende Karten in einer Spalte waren eine Liste,
// in der man nichts wiederfand. Die drei Arten stehen längst im Katalog —
// sie wurden nur nie gezeigt.
{
  const rek = K.eval(`ligaRekordeHtml(true)`);
  const koepfe = (rek.match(/class="rek-g-n">([^<]+)</g)||[])
    .map(x => x.replace(/.*>/, ''));
  ok(koepfe.length >= 2, 'die Rekorde stehen in Gruppen', koepfe.join(' · '));
  // Fuenf Kammern, die Bestmarken vorn: mit dem Koennen zuerst begann der
  // Reiter mit siebzehn Karten aus Schnitten und Erwartungsabstaenden. Die
  // Leiste darueber steht in derselben Reihenfolge wie die Liste.
  const erwartet = ['Bestmarken', 'Können', 'Aktuelle Form', 'Fügungen', 'Schattenseiten'];
  const rang = koepfe.map(k => erwartet.findIndex(e => k.indexOf(e) === 0));
  const leiste = (rek.match(/data-rekkammer="([^"]*)"/g) || []).map(x => x.replace(/.*="|"/g, ''));
  ok(rang.every((r, i) => r > -1 && (i === 0 || r > rang[i-1]))
     && leiste.join(',') === ',mark,koennen,form,fuegung,shame',
     'Alle, Bestmarken, Können, Form, Fügungen, Schatten — in der Leiste wie in der Liste',
     koepfe.join(' · ') + ' | ' + leiste.join(','));
  // Keine Karte steht vor der ersten Überschrift.
  ok(rek.indexOf('class="rek-gruppe') < rek.indexOf('class="rek"'),
     'keine Karte steht vor ihrer Überschrift');
  // Ein Zeitpunkt steht nur dort, wo der Katalog einen liefert — und dort
  // wirklich. Eine erfundene Jahreszahl unter jedem Rekord wäre schlechter
  // als keine, eine nirgends sichtbare aber auch.
  const mitZeit = (rek.match(/class="rek-p zeit"/g)||[]).length;
  const kannZeit = K.eval(`CHRONICLES.filter(c=>c.zeit).length`);
  ok(kannZeit > 0 && mitZeit > 0 && mitZeit <= kannZeit,
     'der Zeitpunkt steht dort, wo es einen gibt — und nur dort',
     'gezeigt ' + mitZeit + ' von ' + kannZeit + ' möglichen');
  ok(!rek.includes('rek-kopf'),
     'keine zweite Überschrift über der ersten Gruppe');
  // Der Feldstreifen jeder Karte liest dieselbe Reihenfolge wie Podest und
  // Verfolger des Blatts: der Halter steht am rechten Ende, daneben der
  // Erste, der ihn nicht hält, mit seinem Wert.
  const feldFehler = JSON.parse(K.eval(`(()=>{
    const H = chronicleHolders(), f = [];
    let n = 0;
    CHRONICLES.forEach(d => {
      const h = H[d.id]; if(!h) return;
      const html = _rekFeldHtml(d, h), rang = chronicleRang(d.id);
      if(rang.length < 3 || !(rang[0].wert > rang[rang.length-1].wert)){ if(html) f.push(d.id + ': Streifen ohne Feld'); return; }
      n++;
      const halter = new Set(h.pids || [h.pid]);
      const z = rang.find(r => !halter.has(r.pid));
      const er = (html.match(/class="er" style="left:([0-9.]+)%/) || [])[1];
      if(!html || +er < 95) f.push(d.id + ': Halter nicht am Ende ' + er);
      if(z && html.indexOf('vor ' + pname(z.pid) + ' ') < 0) f.push(d.id + ': Zweiter fehlt');
    });
    return JSON.stringify({f, n});
  })()`));
  ok(feldFehler.n > 40 && feldFehler.f.length === 0,
     'jede Rekordkarte zeigt den Halter vorn im Feld und den Ersten dahinter',
     feldFehler.f.slice(0, 3).join(' | ') || feldFehler.n + ' Karten');

  // Ein Tipp auf einen Rekord öffnet den REKORD, nicht das Spielerprofil —
  // und zeigt dort ein Podest, weil ein Rekord ein Wettstreit ist [§C27].
  const blatt = K.eval(`(function(){
    let h = ''; const _os = openSheet; openSheet = x => { h = x; };
    try { showChronicle('hardnight'); } finally { openSheet = _os; }
    return h;
  })()`);
  ok(blatt.includes('class="podest"'), 'das Rekord-Blatt zeigt ein Podest');
  ok((blatt.match(/class="pod-karte /g)||[]).length === 3,
     'das Podest hat drei Plätze',
     (blatt.match(/class="pod-karte /g)||[]).length + ' Karten');
  // Der Halter steht in der Mitte und ist der Erste der Reihenfolge.
  const ersterImBlatt = (blatt.match(/data-tplayer="([^"]+)"/)||[])[1];
  const halter = K.eval(`(chronicleHolders()['hardnight']||{}).pid`);
  const zweiter = K.eval(`chronicleRang('hardnight')[1].pid`);
  ok(ersterImBlatt === zweiter,
     'links steht Platz zwei, der Halter in der Mitte',
     ersterImBlatt === zweiter ? 'ok' : ersterImBlatt + ' vs ' + zweiter);
  ok(blatt.includes(halter), 'der Halter steht im Blatt');
  // Und darunter die Verfolger mit ihrem EIGENEN Wert.
  const vf = (blatt.match(/class="rvf"/g)||[]).length;
  const feld = K.eval(`chronicleRang('hardnight').length`);
  ok(vf === Math.max(0, feld - 3), 'jeder Verfolger jenseits des Podests steht darunter',
     vf + ' von ' + Math.max(0, feld - 3));
  // Was die Zahl bedeutet, steht dabei — sonst liest sich „27 %" wie eine
  // Siegquote.
  const wie = K.eval(`CHRONICLE_BY_ID['hardnight'].wie`);
  ok(wie.length > 40 && blatt.includes(wie.slice(0, 60)),
     'das Blatt erklärt, was der Wert ist');
  // Und es nennt Mindestbasis, Zeitraum und Grundwert — die Angaben, die
  // vorher nur im Bedingungssatz steckten.
  ok(blatt.includes('Mindestbasis') && blatt.includes('Zeitraum')
     && blatt.includes('Grundwert'),
     'das Blatt nennt Mindestbasis, Zeitraum und Grundwert');
}
// Die Vitrine ist zweispaltig. Bei ungerader Kachelzahl blieb unten rechts
// ein Loch, und ein leeres Feld liest sich als Fehler, nicht als Ende.
['all','season','week'].forEach(per => {
  let h;
  try { h = K.eval(`awView='awards'; awPeriod=${JSON.stringify(per)}; awSeasonId=null; vAwards()`); }
  catch(e){ ok(false, per + ': Awards rendern', e.message); return; }
  // Die Marken der Reihe nach ablaufen statt zu splitten: bei split() ist
  // jeder Teil der REST des Strings, nicht das Segment — die letzte Vitrine
  // zählte dadurch die Kacheln aller folgenden mit.
  const marken = [];
  const re = /class="aw-(vitrine|trophy)([ "])/g;
  let m; while((m = re.exec(h))) marken.push(m[1] === 'vitrine'
    ? {t:'v'} : {t:'k', gross:h.substr(m.index, 40).indexOf('gross') > -1,
                        allein:h.substr(m.index, 40).indexOf('allein') > -1});
  const vitrinen = [];
  marken.forEach(x => { if(x.t === 'v') vitrinen.push([]); else if(vitrinen.length) vitrinen[vitrinen.length-1].push(x); });
  const loecher = [];
  vitrinen.forEach((k, i) => {
    const hero   = k.some(x => x.gross) ? 1 : 0;
    const allein = k.some(x => x.allein);
    if((k.length - hero) % 2 === 1 && !allein)
      loecher.push('Vitrine ' + (i+1) + ': ' + k.length + ' Kacheln');
  });
  ok(vitrinen.length > 0 && loecher.length === 0,
     per + ': keine Vitrine lässt ein leeres Feld stehen', loecher.join(' | '));
});
K.eval(`awPeriod='all';`);

console.log('\n═══ 8. PERFORMANCE ═══');
K.eval('invalidateCache();');
let t0 = Date.now();
K.eval(`['2026-05','2026-06','2026-07','2026-08'].forEach(s=>seasonTitles(s));`);
const cold = Date.now() - t0;
t0 = Date.now();
K.eval(`for(let i=0;i<200;i++) ['2026-05','2026-06','2026-07','2026-08'].forEach(s=>seasonTitles(s));`);
const warm = Date.now() - t0;
console.log(`  kalt: ${cold} ms für 4 Saisons · 200× warm: ${warm} ms`);
ok(cold < 2000, 'Kalt-Berechnung unter 2 s');
ok(warm < 200, '200 Cache-Treffer unter 200 ms (Memoisierung greift)');


console.log('\n═══ 9. DIE DREI RÜCKBLICKE [§C31] ═══');
// Saison, Woche und Tag benutzen denselben Baukasten. Vorher trugen die
// beiden kleinen ihre Gestaltung als Inline-Style im JS — derselbe Spieler
// sah in drei Rückblicken dreimal anders aus, und in keinem trug er sein
// Wappen. Diese sechs Zusicherungen halten das zusammen.
const _rb = JSON.parse(K.eval(`JSON.stringify((function(){
  const holen = (fn) => {
    document.getElementById('sheet').innerHTML = '';
    try { fn(); } catch(e){ return {fehler:String(e)}; }
    const h = document.getElementById('sheet').innerHTML;
    const z = (re) => (h.match(re) || []).length;
    return {
      laenge: h.length,
      kopf: z(/class="rcp-head"/g), held: z(/class="rcp-held[" ]/g),
      podest: z(/class="podest /g), sieger: z(/class="pod-karte gold/g),
      zahlen: z(/class="rcp-z-s"/g), kacheln: z(/class="rcp-aw /g),
      trophaeen: z(/class="aw-trophy /g),
      liste: z(/class="rcp-zeile/g), beinamen: z(/class="rcp-bn"/g), wand: z(/class="rcp-rw-r /g),
      wappen: z(/class="ins"/g), inline: z(/ style="/g),
      // Nicht die ZAHL der Inline-Styles zählt — ein berechneter Wert
      // (Avatarfarbe, --rav) gehört ins Markup. Es zählt, ob einer davon
      // GESTALTUNG trägt: acht Angaben in einem Attribut sind ein Bauteil,
      // das nie ins CSS gewandert ist.
      breitester: (h.match(/ style="[^"]*"/g)||[]).reduce((n,x) =>
        Math.max(n, x.split(':').length - 1), 0),
      // Nur die Schwinge der SIEGERKARTE: die beiden daneben tragen ihre
      // eigenen Titel, und die zählten sonst mit. Gezählt werden die
      // Zeichenzüge (M im Pfad): mit jedem Rang kommen Ranken dazu, mit
      // jedem Titel ein Stern. Eine Farbe zu zählen ginge nicht mehr — die
      // Ranke hat keine, die es nur einmal je Feder gäbe.
      federn: ((h.match(/class="pod-karte gold[^]*?class="pod-name"/) || [''])[0]
               .match(/M/g) || []).length,
      chronik: z(/data-tplayer=/g), rekorde: z(/data-chron=/g)
    };
  };
  const mai = seasons.find(s => s.id === '2026-05');
  const jul = seasons.find(s => s.id === '2026-07');
  const leon = seasonChampion('2026-05');
  return {
    saison: holen(() => showSeasonRecap(jul)),
    saisonMai: holen(() => showSeasonRecap(mai)),
    woche: holen(() => showPotwRecap({force:true})),
    tag: holen(() => showPotdRecap({force:true})),
    // Wieviele Zeichenzüge braucht das Banner bei einem bzw. drei Titeln?
    federn1: (insigniumSvg(leon, {band:true, titel:1}).match(/M/g)||[]).length,
    federn3: (insigniumSvg(leon, {band:true, titel:3}).match(/M/g)||[]).length,
    titelHeute: meisterTitel(leon)
  };
})())`));
console.log('  Saison ' + _rb.saison.laenge + ' Zeichen · Woche ' + _rb.woche.laenge
  + ' · Tag ' + _rb.tag.laenge);
console.log('  Breitester Inline-Style: Saison ' + _rb.saison.breitester
  + ' · Woche ' + _rb.woche.breitester + ' · Tag ' + _rb.tag.breitester + ' Angaben');

// 1. Alle drei rendern überhaupt.
const _drei = [['Saison',_rb.saison],['Woche',_rb.woche],['Tag',_rb.tag]];
const _kaputt = _drei.filter(([,r]) => r.fehler);
ok(_kaputt.length === 0, 'alle drei Rückblicke rendern',
   _kaputt.map(([n,r]) => n + ': ' + r.fehler).join(' | ') || 'ohne Fehler');

// 2. Alle drei benutzen denselben Baukasten: Kopf, Zahlenleiste, Kacheln.
//    Wer eins davon neu baut, fällt hier auf. Saison und Woche zeigen ihre
//    Awards in der Kachel des Awards-Reiters (`awKachelHtml`) [§C27] und
//    keine eigene mehr: dieselbe Torjäger-Wertung sah im Reiter wie eine
//    Trophäe aus und im Rückblick wie ein Formularfeld.
// Der Tag hat zwei Kacheln: „Größter Aufwind" steht als Elo im Feld des
// Tages, eine dritte Kachel sagte dieselbe Zahl ein zweites Mal.
const _ohne = _drei.filter(([,r]) => !(r.kopf === 1 && r.zahlen >= 3 && r.kacheln + r.trophaeen >= 2));
ok(_ohne.length === 0, 'alle drei benutzen Kopf, Zahlenleiste und Kacheln',
   _drei.map(([n,r]) => n + ' ' + r.kopf + '/' + r.zahlen + '/' + (r.kacheln + r.trophaeen)).join(' · '));
ok(_rb.saison.trophaeen >= 10 && _rb.saison.kacheln === 0 && _rb.woche.trophaeen >= 6 && _rb.woche.kacheln === 0,
   'Saison und Woche zeigen ihre Awards in der Kachel des Awards-Reiters',
   'Saison ' + _rb.saison.trophaeen + '/' + _rb.saison.kacheln + ' · Woche ' + _rb.woche.trophaeen + '/' + _rb.woche.kacheln);

// 2b. Der Saison-Rückblick zeigt das Podest der Ewigen Tafel und KEINE
//     eigene Heldenkarte — die sagte dasselbe ein zweites Mal. Woche und Tag
//     haben umgekehrt einen Helden und kein Podest: drei Karten für einen
//     Sieger sind kein Podest.
ok(_rb.saison.podest === 1 && _rb.saison.sieger === 1 && _rb.saison.held === 0
   && _rb.woche.held === 1 && _rb.woche.podest === 0
   && _rb.tag.held === 1 && _rb.tag.podest === 0,
   'Saison zeigt das Podest, Woche und Tag den Helden',
   'Saison ' + _rb.saison.podest + '/' + _rb.saison.held
   + ' · Woche ' + _rb.woche.podest + '/' + _rb.woche.held
   + ' · Tag ' + _rb.tag.podest + '/' + _rb.tag.held);

// 3. Der Held trägt in allen dreien sein Wappen. Genau das fehlte in Woche
//    und Tag — dort stand ein nackter Kreis.
const _ohneWappen = _drei.filter(([,r]) => !r.wappen);
ok(_ohneWappen.length === 0, 'in allen drei Rückblicken trägt der Held sein Wappen',
   _drei.map(([n,r]) => n + ' ' + r.wappen).join(' · '));

// 4. Die Gestaltung steht im CSS, nicht im JS. Ein einzelner berechneter
//    Wert im Markup ist richtig (Avatarfarbe, --rav, der Farbton einer
//    Plakette). Ein Attribut mit acht Angaben ist ein Bauteil, das nie ins
//    CSS gewandert ist — genau so sahen Wochen- und Tages-Rückblick vorher
//    aus, mit Avataren aus neun Angaben.
const _viel = _drei.filter(([,r]) => r.breitester > 4);
ok(_viel.length === 0, 'kein Rückblick trägt ein ganzes Bauteil im style-Attribut',
   _drei.map(([n,r]) => n + ' ' + r.breitester).join(' · '));

// 5. Der Saison-Rückblick zeigt, was in DIESEM Monat passiert ist: die
//    Chronik und die Rekorde, die gefallen sind. Beides stand vorher nur
//    woanders.
ok(_rb.saison.chronik > 0 && _rb.saison.rekorde > 0 && _rb.saison.beinamen > 0 && _rb.saison.wand > 0,
   'der Saison-Rückblick zeigt Chronik und Rekorde des Monats',
   _rb.saison.chronik + ' Chronik-Einträge, ' + _rb.saison.beinamen + ' Bänder, ' + _rb.saison.wand + ' Rekorde an der Wand');

// 6. Das Banner zählt die Titel BIS ZU dieser Saison. Leon war in allen drei
//    Monaten Meister; im Mai-Rückblick muss sein Banner einen Titel zeigen,
//    nicht die drei von heute. Sonst trägt eine alte Saison die Zukunft.
ok(_rb.federn1 !== _rb.federn3 && _rb.saisonMai.federn === _rb.federn1
   && _rb.saison.federn === _rb.federn3,
   'das Banner im Rückblick zählt die Titel bis zu dieser Saison',
   'Mai ' + _rb.saisonMai.federn + ' (1 Titel = ' + _rb.federn1 + ') · '
   + 'Juli ' + _rb.saison.federn + ' (3 Titel = ' + _rb.federn3 + ') · heute '
   + _rb.titelHeute + ' Titel');
K.eval(`closeSheet(true); awPeriod='all'; awSeasonId=null;`);

// ─── Die Grafiken der Rückblicke rechnen nach [§C31] ─────────────────
// Kalender, Tabelle, Laufbahn, Zeichen, Auszeichnungen und Rekorde zeigen
// Zahlen, die anderswo schon gerechnet werden. Hier wird jede gegen ihre
// Quelle gehalten: die Partien, die Rangliste, zwei Prestige-Stände.
const _gr = JSON.parse(K.eval(`JSON.stringify((function(){
  const sid = '2026-07', vor = _prevSeasonId(sid);
  const von = seasonStart(sid).getTime(), bis = seasonEnd(sid).getTime();
  const ms = matchesInSeason(sid);
  // Der Kalender: ein Feld je Tag, davor die leeren bis zum Wochentag des
  // Ersten, und die Zahlen darin ergeben die Partien des Monats.
  const kal = rcpKalenderHtml(ms, seasonStart(sid), seasonEnd(sid).getDate());
  const kalZahlen = [...kal.matchAll(/<b class="num">(\\d+)<\\/b>/g)].reduce((n, m) => n + +m[1], 0);
  // Die Tabelle: eine Zeile je Spieler, Pfeile aus den Plätzen des Vormonats.
  const rang = saisonRang(sid), pv = {};
  saisonRang(vor).forEach((e, i) => { pv[e.id] = i + 1; });
  const tab = rcpTabelleHtml(rang, pv);
  const zug = rang.map((e, i) => pv[e.id] ? pv[e.id] - (i + 1) : null).filter(x => x != null);
  const maxAuf = Math.max(...zug), maxAb = Math.min(...zug);
  const istAuf = [...tab.matchAll(/data-detail="([^"]+)"[^>]*>\\s*<span class="rcp-tab-p num">\\d+<\\/span><span class="rcp-tab-z auf max"/g)].map(m => m[1]).sort();
  const sollAuf = rang.filter((e, i) => pv[e.id] && pv[e.id] - (i + 1) === maxAuf).map(e => e.id).sort();
  // Die Laufbahn: je Spieler der Unterschied zweier Stände, nach Quellen;
  // die Auszeichnungen darin sind die Säulen darunter.
  const daten = rcpLaufbahnDaten(von, bis);
  const falsch = [], quelle = [], posten = [];
  daten.forEach(x => {
    const a = prestigeOf(x.pid, von - 1).punkte, b = prestigeOf(x.pid, bis).punkte;
    if(Math.round(b - a) !== x.delta) falsch.push(pname(x.pid) + ' ' + x.delta + '≠' + (b - a));
    const t = x.teile.auszeichnung + x.teile.monat + x.teile.rekord;
    if(t !== x.delta) quelle.push(pname(x.pid));
    const p = x.posten.reduce((n, q) => n + q.p, 0);
    if(Math.abs(p - x.teile.auszeichnung) > 1.5) posten.push(pname(x.pid) + ' ' + Math.round(p) + '/' + x.teile.auszeichnung);
  });
  const eh = rcpEhrungHtml(daten).html;
  const saeulen = [...eh.matchAll(/class="eh-s" data-pid="([^"]+)"[\\s\\S]*?class="eh-s-w num">\\+([\\d,]+)</g)]
    .map(m => ({pid:m[1], w:parseFloat(m[2].replace(',', '.'))}));
  const saeuleFalsch = saeulen.filter(s => Math.abs(s.w - daten.find(x => x.pid === s.pid).teile.auszeichnung) > 1.5).length;
  // Die neuen Zeichen: genau wer zwischen den Ständen Stufe oder Grad wechselte.
  const zuege = rcpZeichenZuege(daten).map(z => z.pid).sort();
  const zSoll = players.filter(p => sichtbar(p)).filter(p => insigniumPos(prestigeOf(p.id, von - 1)) !== insigniumPos(prestigeOf(p.id, bis)))
    .map(p => p.id).sort();
  // Ein Rekord, dessen Wert beim selben Halter fiel, ist kein Rekord des
  // Zeitraums; „verbessert" heißt gestiegen.
  const w = _potwWocheVon('2026-08-17');
  const rek = saisonRekorde(sid).concat(rekordeImZeitraum(w.start.getTime(), w.end.getTime()));
  const gefallen = rek.filter(r => r.art === 'gesteigert' && !(r.val > r.vorwert)).map(r => r.name);
  return {kalFelder:(kal.match(/class="rcp-kal-t /g) || []).length, tage:seasonEnd(sid).getDate(),
    kalLeer:(kal.match(/class="rcp-kal-x"/g) || []).length, wt:wochentagMo(seasonStart(sid)),
    kalZahlen, partien:ms.length,
    zeilen:(tab.match(/class="rcp-tab-r/g) || []).length, rang:rang.length, istAuf, sollAuf,
    abMax:(tab.match(/rcp-tab-z ab max/g) || []).length, abSoll:rang.filter((e, i) => pv[e.id] && pv[e.id] - (i + 1) === maxAb).length,
    spieler:daten.length, bewegt:daten.filter(x => x.delta).length, falsch, quelle, posten,
    saeulen:saeulen.length, saeuleFalsch, zuege, zSoll, rek:rek.length, gefallen};
})())`));
ok(_gr.kalFelder === _gr.tage && _gr.kalLeer === _gr.wt && _gr.kalZahlen === _gr.partien,
   'der Kalender hat ein Feld je Tag ab dem Wochentag des Ersten, und seine Zahlen ergeben die Partien',
   `${_gr.kalFelder}/${_gr.tage} Felder, ${_gr.kalLeer} leer vor dem Ersten, ${_gr.kalZahlen}/${_gr.partien} Partien`);
ok(_gr.zeilen === _gr.rang && _gr.istAuf.join() === _gr.sollAuf.join() && _gr.istAuf.length > 0 && _gr.abMax === _gr.abSoll,
   'die Tabelle zeigt jeden Spieler, und der größte Sprung und der tiefste Fall stehen hervorgehoben in ihren Zeilen',
   `${_gr.zeilen}/${_gr.rang} Zeilen · Sprung ${_gr.istAuf.length}/${_gr.sollAuf.length} · Fall ${_gr.abMax}/${_gr.abSoll}`);
ok(_gr.bewegt > 3 && !_gr.falsch.length && !_gr.quelle.length,
   'die Wirkung auf die Laufbahn ist der Unterschied zweier Prestige-Stände, aufgeteilt in die drei Quellen',
   `${_gr.bewegt} bewegt · ${_gr.falsch.join(', ') || 'Summe stimmt'} · ${_gr.quelle.join(', ') || 'Quellen stimmen'}`);
ok(_gr.saeulen > 3 && !_gr.posten.length && _gr.saeuleFalsch === 0,
   'die Säulen der Auszeichnungen sind genau der Teil der Laufbahn, der aus Auszeichnungen kommt',
   `${_gr.saeulen} Säulen · ${_gr.posten.join(', ') || 'Posten stimmen'} · ${_gr.saeuleFalsch} abweichend`);
ok(_gr.zuege.length > 0 && _gr.zuege.join() === _gr.zSoll.join(),
   'neue Zeichen zeigt genau, wer im Zeitraum Stufe oder Grad gewechselt hat',
   _gr.zuege.length + ' von ' + _gr.zSoll.length);
ok(_gr.rek > 0 && !_gr.gefallen.length,
   '„verbessert" heißt bei einem Rekord, dass sein Wert gestiegen ist',
   _gr.gefallen.join(', ') || _gr.rek + ' Rekorde');

// ─── Ein Klick auf eine Chronik-Karte fuehrt zur Disziplin ───────────
// Vorher landete man im Spielerprofil: dort steht alles ueber den Spieler
// und nichts ueber die Wertung, an der er haengt.
ok(K.eval(`(function(){
  const T=seasonTitles('2026-08');
  const h=_titlePlateHtml(T.awarded[0], {sid:'2026-08'});
  return h.indexOf('data-tdisz=')>=0 && h.indexOf('data-tplayer=')<0;
})()`), 'die Chronik-Karte zeigt auf die Disziplin, nicht auf den Spieler');

[['spezialisiert','2026-07'],['punktgenau2','2026-08'],['spotless','2026-08']].forEach(([tid, msid]) => {
  const r = K.eval(`(function(){
    let out=''; const echt=openSheet; openSheet=(h)=>{out=h;};
    try { showDisziplin(${JSON.stringify(tid)}, ${JSON.stringify(msid)}); } finally { openSheet=echt; }
    const karten=(out.match(/pod-karte/g)||[]).length;
    const leer=(out.match(/pod-leer/g)||[]).length;
    const hero=out.indexOf('chron-hero')>=0;
    return karten+'/'+leer+'/'+(hero?1:0)+'/'+out.length;
  })()`).split('/').map(Number);
  // Erfuellt in diesem Monat niemand die Bedingung, gibt es kein Podest —
  // dann steht dort der leere Zustand, und das ist richtig so.
  ok(r[0] === 0 || (r[0] >= 1 && r[0] <= 3),
     tid + ': das Podest hat hoechstens drei Plaetze', r[0] + ' Karten');
  ok(r[0] === 0 || r[0] + r[1] === 3,
     tid + ': unbesetzte Plaetze bleiben als Luecke stehen', r[0] + '+' + r[1]);
  ok(r[2] === 1, tid + ': die Bedingung steht im Blatt');
});
// Der Beiname stand nur im Profilkopf. Wer ein Chronik-Blatt oeffnete, sah
// die Bedingung, die Zahlen und das Podest — aber nicht, wie ihr Halter im
// Profil heisst. Gemessen wird der Wortlaut aus dem Katalog, nicht nur das
// Vorhandensein der Klasse: ein leeres Feld ist so gut wie keins.
const _kose = JSON.parse(K.eval(`JSON.stringify((function(){
  const fehlt = [];
  SEASON_TITLES.forEach(t => {
    let out=''; const echt=openSheet; openSheet=(h)=>{out=h;};
    try { showDisziplin(t.id, '2026-08'); } catch(e){ out=''; } finally { openSheet=echt; }
    // Der Beiname heisst nie wie die Wertung [§C39], also steht er in jedem
    // Blatt: vorher fiel er dort weg, wo beide gleich hiessen.
    if(out.indexOf('chron-kose') < 0 || out.indexOf(t.beiname) < 0) fehlt.push(t.id);
  });
  return {fehlt, n: SEASON_TITLES.length};
})())`));
ok(_kose.fehlt.length === 0,
   'jedes Chronik-Blatt nennt den Beinamen seines Halters',
   _kose.fehlt.join(', ') || _kose.n + ' Blaetter');
K.eval('closeSheet(true)');
// Wer einen Rekord punktgleich haelt, steht auf dem Podest auf Platz 1:
// „Der Unaufhaltsame" gehoert Martin und Julian mit 13, das Blatt sagte es
// in einer Notiz, und das Podest zeigte Julian als 02.
const _podGleich = JSON.parse(K.eval(`JSON.stringify((function(){
  const falsch = []; const H = chronicleHolders(); let geteilt = 0;
  CHRONICLES.forEach(c => {
    const h = H[c.id]; if(!h) return;
    const n = Math.min(3, (h.pids || [h.pid]).length);
    if(n > 1) geteilt++;
    let out=''; const echt=openSheet; openSheet=(x)=>{out=x;};
    try { showChronicle(c.id); } catch(e){ out=''; } finally { openSheet=echt; }
    const erste = (out.match(/pod-platz num">01</g) || []).length;
    if(erste !== n) falsch.push(c.id + ': ' + erste + ' statt ' + n);
  });
  return {falsch, geteilt};
})())`));
ok(_podGleich.falsch.length === 0 && _podGleich.geteilt > 0,
   'wer einen Rekord punktgleich haelt, steht auf dem Podest auf Platz 1',
   _podGleich.falsch.slice(0, 4).join(', ') || _podGleich.geteilt + ' geteilte Rekorde');

// Die Erklaerung sagt, was die Zahl daneben bedeutet — „+15 Punkte" las sich
// wie Elo. Wo eine Groesse nicht selbsterklaerend ist, steht sie im Blatt.
ok(K.eval(`(function(){
  let out=''; const echt=openSheet; openSheet=(h)=>{out=h;};
  try { showDisziplin('punktgenau2','2026-08'); } finally { openSheet=echt; }
  return out.indexOf('Prozentpunkt')>=0;
})()`), 'die Erklaerung nennt die Einheit der Zahl');
ok(K.eval("SEASON_TITLES.filter(t=>/Prozentpunkte|%-Punkte/.test(t.cond)).every(t=>!!t.wie)"),
   'jede Wertung in Prozentpunkten erklaert ihre Einheit');

// Der Monats-Durchlauf wird gemerkt. Er geht jede Partie der Saison an; ihn
// je Blatt neu zu rechnen war der teuerste Weg zu demselben Ergebnis.
ok(K.eval("_seasonTitleCtx('2026-08') === _seasonTitleCtx('2026-08')"),
   'der Monats-Kontext wird gecacht, nicht neu gerechnet');

// ─── Die Monatstafel zeigt zuerst nur das, was auch die Matrix zeigt ───
// Ein starker Monat brachte ueber zwanzig Karten, von denen sieben demselben
// Namen gehoerten — waehrend der Reiter dahinter je Spieler eine zeigte.
['2026-06','2026-07','2026-08'].forEach(sid => {
  const r = K.eval(`(function(){
    const T=seasonTitles('${sid}');
    const g=new Set(); let s=0,w=0;
    T.awarded.forEach(a=>{ if(g.has(a.pid)) w++; else { g.add(a.pid); s++; } });
    return s+'/'+w+'/'+g.size;
  })()`).split('/').map(Number);
  ok(r[0] === r[2], sid + ': offen steht genau ein Eintrag je Spieler',
     r[0] + ' Karten fuer ' + r[2] + ' Spieler');
  ok(r[1] > 0, sid + ': der Rest liegt hinter „Alle anzeigen"', r[1] + ' weitere');
});

// ─── Kein Topf überlebt eine neue Partie ─────────────────────────────
// Zwei Caches trugen die Cache-Version nicht im Schlüssel: das Duo-Detail und
// die Bilanz zweier Spieler. Geleert wurden sie nur über einen Tag, den der
// Eingabe-Tab beim Speichern gar nicht mitreicht — wer ein Blatt offen hatte
// und danach eine Partie eintrug, las gemessen weiter die alten Zahlen.
const _topf = JSON.parse(K.eval(`JSON.stringify((function(){
  const a = players[8].id, b = players[9].id;
  const lies = () => ({duo: teamDetail(a,b).wins + ':' + teamDetail(a,b).losses,
                       bilanz: h2hDetail(a,b).asOppForA.g});
  const vorher = lies();
  const letzte = matches[matches.length-1];
  // Zwei neue Partien: eine gemeinsam (Duo-Bilanz), eine gegeneinander.
  const zusammen = Object.assign({}, letzte, {id:'topf_a',
    a1:a, a2:b, b1:players[0].id, b2:players[1].id,
    games_a:10, games_b:0, winner:'A', deltas:{},
    created_at:new Date(new Date(letzte.created_at).getTime() + 3600000).toISOString()});
  const gegen = Object.assign({}, letzte, {id:'topf_b',
    a1:a, a2:players[0].id, b1:b, b2:players[1].id,
    games_a:10, games_b:0, winner:'A', deltas:{},
    created_at:new Date(new Date(letzte.created_at).getTime() + 7200000).toISOString()});
  const alt = matches;
  matches = [...matches, zusammen, gegen];
  invalidateCache(LADEN_TOEPFE);   // genau wie doSaveMatch
  const nachher = lies();
  matches = alt; invalidateCache();
  return {vorher, nachher};
})())`));
ok(_topf.nachher.duo !== _topf.vorher.duo,
   'das Duo-Detail sieht eine neue gemeinsame Partie',
   _topf.vorher.duo + ' → ' + _topf.nachher.duo);
ok(_topf.nachher.bilanz === _topf.vorher.bilanz + 1,
   'die Bilanz zweier Spieler sieht ein neues Duell',
   _topf.vorher.bilanz + ' → ' + _topf.nachher.bilanz);

// Und die Regel dahinter, statt Stichproben: JEDER Cache-Schlüssel trägt die
// Version. Geprüft wird die ausgelieferte Datei — dort steht, was wirklich
// läuft. Ein Topf ohne Version hängt allein an der Tag-Liste des Aufrufers,
// und die kennt der Autor eines neuen Topfes nicht.
const _schluessel = (function(){
  const quelle = fs.readFileSync(require('./ziel.js'), 'utf8');
  const zeilen = quelle.split('\n');
  const ohne = [];
  zeilen.forEach((z, i) => {
    const m = z.match(/_cache\.(_[A-Za-z0-9_]*Key)\s*=(?!=)\s*([^;]+);/);
    if(!m) return;
    const rechts = m[2].trim();
    // Steht der Ausdruck direkt da, wird er direkt geprüft.
    if(!/^[A-Za-z0-9_]+$/.test(rechts)){
      if(!/_cache\.version/.test(rechts)) ohne.push(m[1] + ' ← ' + rechts.slice(0, 80));
      return;
    }
    const v = rechts;
    // Die Zuweisung dieser Variablen steht im selben Funktionsrumpf davor —
    // gesucht wird bis zu dessen Anfang, nicht ein paar Zeilen weit.
    let anfang = 0;
    for(let j = i; j >= 0; j--){ if(/^function\s/.test(zeilen[j])){ anfang = j; break; } }
    for(let j = i; j >= anfang; j--){
      const d = zeilen[j].match(new RegExp('(?:const|let|var)\\s+' + v + '\\s*='));
      if(!d) continue;
      let def = zeilen[j];
      let k = j;
      while(!/;\s*$/.test(def) && k + 1 < zeilen.length && k - j < 6) def += ' ' + zeilen[++k];
      if(!/_cache\.version/.test(def)) ohne.push(m[1] + ' ← ' + def.trim().slice(0, 80));
      return;
    }
    ohne.push(m[1] + ' (Zuweisung nicht gefunden)');
  });
  return ohne;
})();
ok(_schluessel.length === 0, 'jeder Cache-Schluessel traegt die Version',
   _schluessel.slice(0, 3).join(' · ') || 'alle');

// Ein Topf, dessen Schluessel die Version traegt, bekommt zu jeder Version
// einen neuen Eintrag — und behaelt jeden alten. Zwanzig Partien in einer
// Sitzung heissen dann zwanzig Generationen Auszeichnungslisten im
// Speicher, von denen neunzehn niemand mehr liest. Jeder solche Topf
// braucht deshalb einen Deckel.
const _deckel = (function(){
  const quelle = fs.readFileSync(require('./ziel.js'), 'utf8');
  const toepfe = new Set();
  const mit = new Set();
  const re = /_cache\.(_[A-Za-z0-9_]+)\s*\[\s*key\s*\]\s*=(?!=)/g;
  let m;
  while((m = re.exec(quelle))) toepfe.add(m[1]);
  const re2 = /_topfDeckel\(\s*_cache\.(_[A-Za-z0-9_]+)\s*,/g;
  while((m = re2.exec(quelle))) mit.add(m[1]);
  return [...toepfe].filter(t => !mit.has(t));
})();
ok(_deckel.length === 0, 'jeder Topf mit Schluesseln hat einen Deckel',
   _deckel.join(' · ') || 'alle');

// ─── Ein voller Topf verliert den aeltesten, nicht alle ──────────────
// Jeder Topf leerte sich beim Ueberlauf VOLLSTAENDIG, und oberhalb des
// Deckels ist das Memo damit nicht beschnitten, es ist AUS. Gemessen an
// `_seasonTitleCtx`: bei sechs und acht Zeitschnitten kostete ein zweiter
// Blick null Rechnungen, bei zwoelf und zwanzig jeweils ALLE noch einmal.
// Ein Deckel steht nie weit ueber der Arbeitsmenge — der News-Generator
// allein fragt sieben verschiedene Schnitte ab.
const _raeumen = JSON.parse(K.eval(`JSON.stringify((function(){
  const f = _seasonTitleCtxRechnen;
  let n = 0;
  _seasonTitleCtxRechnen = function(){ n++; return f.apply(this, arguments); };
  const sid = currentSeason().id;
  const basis = mts(matches[0]);
  const lauf = k => {
    invalidateCache(); n = 0;
    const s = []; for(let i = 1; i <= k; i++) s.push(basis + i * 1000);
    s.forEach(b => _seasonTitleCtx(sid, b));
    const erst = n;
    s.forEach(b => _seasonTitleCtx(sid, b));
    return {k, erst, nochmal: n - erst};
  };
  // Und der entscheidende Fall: der Topf ist voll, EIN Eintrag kommt dazu.
  // Vollstaendiges Leeren kostet dabei alle sechzehn, aelteste-zuerst genau
  // einen — und danach ist der zweite Blick auf die jungen wieder gratis.
  // Der Deckel wird VOR dem Einfuegen geprueft, also loest erst der Eintrag
  // nach dem Ueberschreiten das Raeumen aus.
  const DECKEL = 16;
  invalidateCache(); n = 0;
  const s = []; for(let i = 1; i <= DECKEL + 2; i++) s.push(basis + i * 1000);
  s.slice(0, DECKEL + 1).forEach(b => _seasonTitleCtx(sid, b));  // einer drueber
  _seasonTitleCtx(sid, s[DECKEL + 1]);                           // loest das Raeumen aus
  n = 0;
  s.slice(2, DECKEL + 2).forEach(b => _seasonTitleCtx(sid, b));  // die jungen
  const nachUeberlauf = n;
  const r = [lauf(6), {k:DECKEL, nachUeberlauf}];
  _seasonTitleCtxRechnen = f;
  invalidateCache();
  return r;
})())`));
ok(_raeumen[0].erst === 6 && _raeumen[0].nochmal === 0,
   'unter dem Deckel kostet der zweite Blick nichts',
   _raeumen[0].erst + ' + ' + _raeumen[0].nochmal + ' Rechnungen');
ok(_raeumen[1].nachUeberlauf === 0,
   'ein Eintrag zu viel kostet einen Eintrag, nicht den ganzen Topf',
   _raeumen[1].nachUeberlauf + ' von ' + _raeumen[1].k + ' noch einmal');

// ─── Ein Schnitt, der nichts abschneidet, ist kein Schnitt ───────────
// Der Feed vergleicht „vor dem letzten Spieltag" mit „heute" und schrieb
// „heute" als den Zeitstempel der letzten Partie. Fuer jede geschnittene
// Rechnung ist das aber ein eigener Schluessel: gemessen rechnete ein
// Generatorlauf `prestigeTabelle` zweimal, einmal ungeschnitten fuer 17 ms
// und einmal als Schnitt fuer 59 ms. Und der Schnitt verhaelt sich anders —
// `seasonTitles` liest einen abgeschlossenen Monat nur OHNE Schnitt aus dem
// eingefrorenen Datensatz [§10.2]. Gemessen sank der Generator dadurch von
// 253 auf 149 ms kalt.
//
// Geprueft wird die IDENTITAET, nicht die Gleichheit: nur dieselbe Referenz
// beweist, dass beide Fragen denselben Topf treffen.
const _schnitte = JSON.parse(K.eval(`JSON.stringify((function(){
  const letzte = mts(matches[matches.length - 1]);
  const sid = currentSeason().id;
  const alt = allPastSeasons()[0];
  const nachMonat = seasonEnd(alt).getTime() + 1;
  const gleich = [];
  const pruef = (name, a, b) => { if(a !== b) gleich.push(name); };
  pruef('prestigeTabelle', prestigeTabelle(letzte), prestigeTabelle());
  pruef('prestigeTabelle(spaeter)', prestigeTabelle(letzte + 86400000), prestigeTabelle());
  pruef('allChronicles', allChronicles(letzte), allChronicles());
  pruef('_chronicleCtx', _chronicleCtx(letzte), _chronicleCtx());
  pruef('seasonTitles', seasonTitles(sid, letzte), seasonTitles(sid));
  pruef('_seasonTitleCtx', _seasonTitleCtx(sid, letzte), _seasonTitleCtx(sid));
  pruef('seasonTitleHistory', seasonTitleHistory(players[0].id, letzte),
        seasonTitleHistory(players[0].id));
  // Und je Monat: ein Schnitt hinter dem Monatsende schneidet von DIESEM
  // Monat nichts ab, auch wenn danach noch gespielt wurde.
  pruef('_seasonTitleCtx (Monatsende)', _seasonTitleCtx(alt, nachMonat), _seasonTitleCtx(alt));
  pruef('seasonTitles (Monatsende)', seasonTitles(alt, nachMonat), seasonTitles(alt));
  // Ein Schnitt MITTEN in der Historie muss dagegen schneiden, sonst haette
  // die Zusicherung nur das Memo geprueft.
  const mitte = mts(matches[Math.floor(matches.length / 2)]);
  const schneidet = _chronicleCtx(mitte) !== _chronicleCtx()
    && prestigeTabelle(mitte) !== prestigeTabelle();
  return {gleich, schneidet, alt, monate: allPastSeasons().length};
})())`));
ok(_schnitte.monate > 0, 'es gibt einen abgeschlossenen Monat zum Vergleichen',
   _schnitte.alt);
ok(_schnitte.schneidet, 'ein Schnitt mitten in der Historie schneidet wirklich');
ok(_schnitte.gleich.length === 0,
   'ein Schnitt hinter der letzten Partie trifft denselben Topf',
   _schnitte.gleich.join(' · ') || 'alle neun');

// ─── Ein Kalendertag hat eine Schreibweise ───────────────────────────
// „Welcher Tag ist das?" stand neunmal ausgeschrieben in der Auslieferung,
// und in zwei Schreibweisen: mit fuehrender Null („2026-08-06") und ohne
// („2026-7-6"). Einmal hat sich das schon gekreuzt — ein Deckel-Schluessel
// wurde mit der kurzen Fassung gebaut und mit der langen abgefragt, fand nie
// eine Partie, und die Regel „kein Spieltag bleibt ohne Karte" griff nie.
// Der Ausweg war damals ein zweiter Aufruf daneben statt einer Schreibweise
// [§C27]. Gezaehlt wird im GEBAUTEN Stand, weil sich jede neue Stelle sonst
// wieder selbst eine aussucht.
const _tagSchreib = (function(){
  const quelle = fs.readFileSync(require('./ziel.js'), 'utf8');
  // Beide Formen, mit und ohne Auffuellen, mit und ohne Leerzeichen.
  const re = /getMonth\(\)\s*\+\s*1\s*\)\s*\.padStart\(\s*2[^)]*\)\s*\+\s*['"]-['"]|['"]-['"]\s*\+\s*[A-Za-z_$][\w$]*\.getMonth\(\)\s*\+\s*['"]-['"]/g;
  return (quelle.match(re) || []).length;
})();
ok(_tagSchreib === 1, 'der Kalendertag wird an genau einer Stelle gebildet',
   _tagSchreib + ' Stellen');

// ─── Ein Datum, ein Formatierer ─────────────────────────────────────
// `toLocaleDateString` mit Optionen baut bei jedem Aufruf einen neuen
// Formatierer, und im Feed lief das je Karte mehrmals: gemessen 16 ms fuer
// die Uhrzeit allein beim Oeffnen. Uhrzeit, Tag und Monat und das kurze
// Datum gehen deshalb durch `datumFmt`; gezaehlt wird im gebauten Stand.
const _fmtStellen = (function(){
  const quelle = fs.readFileSync(require('./ziel.js'), 'utf8');
  const re = /toLocale(Date|Time)String\('de-DE',\s*\{(hour:'2-digit',\s*minute:'2-digit'|day:'2-digit',\s*month:'2-digit'(,\s*year:'2-digit')?)\}\)/g;
  return (quelle.match(re) || []).length;
})();
ok(_fmtStellen === 0, 'Uhrzeit und kurzes Datum gehen durch einen gemerkten Formatierer',
   _fmtStellen + ' Stellen bauen ihn selbst');

// ─── Kein Gestaltungswert ohne Leser ────────────────────────────────
// Der Bau haengt sechzehn Stylesheets aneinander, und eine Variable, die
// niemand mehr liest, faellt danach niemandem auf: `--r-lg` stand als
// dritter Radius neben `--r` und `--r-sm` in den Tokens und wurde nirgends
// abgefragt. Dieselbe Regel wie bei den toten Klassen, eine Ebene tiefer.
const _totVar = (function(){
  const quelle = fs.readFileSync(require('./ziel.js'), 'utf8');
  const def = new Set(), gelesen = new Set();
  (quelle.match(/--[a-zA-Z0-9-]+\s*:/g) || [])
    .forEach(x => def.add(x.replace(/\s*:$/, '')));
  (quelle.match(/var\(\s*--[a-zA-Z0-9-]+/g) || [])
    .forEach(x => gelesen.add(x.replace(/var\(\s*/, '')));
  return {n: def.size, tot: [...def].filter(d => !gelesen.has(d))};
})();
ok(_totVar.n > 40, 'die Tokens werden gefunden', _totVar.n + ' Variablen');
ok(_totVar.tot.length === 0, 'jede CSS-Variable wird auch gelesen',
   _totVar.tot.join(', ') || 'alle ' + _totVar.n);

// ─── Eine Schrift hat einen Rückfall ────────────────────────────────
// Die Schriften kommen aus dem Netz, und eine App, die offline startet, hat
// sie nicht. Drei Angaben nannten nur „'Space Grotesk'" ohne Familie
// dahinter, und dort fiel der Browser auf eine Serifenschrift zurück: im
// Positions-Profil stand „Verteidiger" in Times neben lauter Grotesk.
const _schriftOhne = (function(){
  const quelle = fs.readFileSync(require('./ziel.js'), 'utf8');
  return (quelle.match(/font-family:\s*[^;}"`]*/g) || [])
    .map(x => x.trim())
    .filter(x => !/(monospace|sans-serif|serif|inherit|system-ui)\s*$/.test(x));
})();
ok(_schriftOhne.length === 0, 'jede Schriftangabe endet auf einer Schriftfamilie',
   [...new Set(_schriftOhne)].join(' | ') || 'alle');

// ─── Und die Elo-Rechnung zieht ihre Grenzen an einer Stelle ─────────
// Die Erwartungsformel stand zweimal in der Auslieferung: `expected` und ein
// wortgleiches `localExp` in der Elo-Engine. Die drei Chancen-Linien standen
// als blanke Zahl an acht Stellen, und die 0,35 in der Auszeichnung „Upset
// King" wie in BEIDEN Chronik-Durchlaeufen — drei Stellen, die dasselbe
// Ereignis zaehlen [§10.2]. Eine zweite Rechnung ueber dieselbe Frage nennt
// irgendwann einen anderen Besten.
const _eloEinmal = (function(){
  const quelle = fs.readFileSync(require('./ziel.js'), 'utf8');
  const formel = (quelle.match(/1\s*\/\s*\(\s*1\s*\+\s*Math\.pow\(\s*10\s*,/g) || []).length;
  // Eine blanke Chancen-Zahl im Vergleich mit einer Erwartung.
  const roh = (quelle.match(/\b(?:exp|myExp|chance|winSp|winnerChance)\s*[<>]=?\s*0\.(?:35|45|55)\b/g) || []).length;
  return {formel, roh};
})();
ok(_eloEinmal.formel === 1, 'die Erwartungsformel steht genau einmal da',
   _eloEinmal.formel + ' Stellen');
ok(_eloEinmal.roh === 0, 'die Chancen-Linien stehen als Begriff, nicht als Zahl',
   _eloEinmal.roh + ' blanke Zahlen');

// ─── Zwei Rechnungen ueber die laengste Serie zaehlen gleich ─────────
// `longestStreaks` traegt die Bestenliste des Awards-Tabs, `longestPlayerStreak`
// den Wert einer Auszeichnung — zwei Durchlaeufe ueber dieselbe Frage. Sie
// zusammenzulegen kostet mehr, als es bringt: die Liste rechnet alle Spieler
// auf einmal, das Badge fragt je Spieler, und das waere in der Badge-Schleife
// quadratisch. Also bleiben beide, und der Test haelt sie aneinander [§C27].
const _serien = JSON.parse(K.eval(`JSON.stringify((function(){
  const liste = {};
  longestStreaks(matches).forEach(x => { liste[x.id] = x.v; });
  const ab = [];
  let gemessen = 0;
  players.forEach(p => {
    const a = liste[p.id] || 0;
    const b = longestPlayerStreak(p.id, matches);
    // Die Liste schneidet bei zwei ab, das Badge nicht.
    if(b >= 2){ gemessen++; if(a !== b) ab.push(pname(p.id) + ': ' + a + ' gegen ' + b); }
  });
  return {gemessen, ab};
})())`));
ok(_serien.gemessen >= 10, 'genug Spieler haben eine Serie zum Vergleichen',
   _serien.gemessen + ' Spieler');
ok(_serien.ab.length === 0, 'Awards und Auszeichnung zaehlen dieselbe laengste Serie',
   _serien.ab.join(' · ') || 'alle gleich');

// Der Bau haengt sechzehn Stylesheets aneinander, und eine Regel fuer eine
// Ansicht, die es nicht mehr gibt, faellt danach niemandem mehr auf: die
// Hall of Fame, die alten Award-Karten, das Champion-Banner und die
// Perzentil-Balken standen mit 157 Regeln in der Auslieferung, ohne dass
// ein einziges Element sie je getragen haette.
// Eine Klasse gilt als benutzt, wenn ihr Name im Code steht ODER wenn
// irgendein Stueck Zeichenkette ein Praefix von ihr ist — das faengt auch
// `' zn-l' + stufe`. Eine Regel gilt nur dann als tot, wenn JEDER Teil
// ihres Selektors eine Klasse nennt und alle diese Klassen tot sind:
// `select,.fld{…}` traegt eine tote Klasse und trotzdem ein lebendes
// Element.
const _toteRegeln = (function(){
  const html = fs.readFileSync(require('./ziel.js'), 'utf8');
  const css = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [])
    .join('\n').replace(/<\/?style[^>]*>/gi, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Ohne die HTML-Kommentare: der Kopf der Datei erklaert den Aufbau und
  // nennt dabei <script>. Von dort bis zum ersten </script> lag das ganze
  // CSS im „Skript" — und jede Klasse galt damit als benutzt.
  const ohneKomm = html.replace(/<!--[\s\S]*?-->/g, ' ');
  const skripte = (ohneKomm.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || []);
  // Ohne die Kommentare: sie sind auf Deutsch, und ein Wort wie „Karte"
  // machte jede Klasse, die mit ihm anfaengt, still zu einer benutzten.
  const js = (skripte.join('\n') + ohneKomm.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')
    // Ohne eingebettete Bilder: ihr Base64 ist Buchstabensalat, und darin
    // stand zufaellig „rg" als eigenes Stueck — die tote Regel `.pp-rk .rg`
    // galt damit als benutzt, bis ein neues Bild das Stueck nicht mehr trug.
    .replace(/data:[a-z]+\/[-+.\w]+;base64,[A-Za-z0-9+\/=]+/g, ' ');
  const stuecke = new Set(js.match(/[-A-Za-z0-9_]+/g) || []);
  const benutzt = n => {
    if(stuecke.has(n)) return true;
    for(const st of stuecke) if(st.length >= 4 && n.length > st.length && n.startsWith(st)) return true;
    return false;
  };
  const tot = new Map();
  const istTot = n => { if(!tot.has(n)) tot.set(n, !benutzt(n)); return tot.get(n); };
  const raus = [];
  let tiefe = 0, start = 0, sel = '';
  for(let i = 0; i < css.length; i++){
    if(css[i] === '{'){ if(tiefe === 0) sel = css.slice(start, i); tiefe++; }
    else if(css[i] === '}'){ tiefe--; if(tiefe === 0){
      const teile = sel.split(',').map(x => x.trim()).filter(Boolean);
      const weg = teile.length && teile.every(t => {
        const kl = (t.match(/\.[-A-Za-z_][-\w]*/g) || []).map(x => x.slice(1));
        return kl.length && kl.every(istTot);
      });
      if(weg && !/@/.test(sel)) raus.push(sel.trim().replace(/\s+/g, ' ').slice(0, 50));
      start = i + 1;
    }}
  }
  return raus;
})();
ok(_toteRegeln.length === 0, 'keine CSS-Regel fuer eine Ansicht, die es nicht gibt',
   _toteRegeln.length + ': ' + _toteRegeln.slice(0, 4).join(' · '));

// Die Kommentare bleiben in src/ und gehen nicht mit aus. Sie waren 38 % des
// JavaScripts, und jedes Telefon lud und parste sie bei jedem Start. Gezaehlt
// werden Zeilen, die mit einem Kommentar BEGINNEN, und jedes `/*` im CSS —
// ein `//` mitten in einer Zeile steht auch in jeder Adresse.
{
  const skript = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const stil = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
  const geruest = html.slice(0, html.indexOf('<style>')) + html.slice(html.indexOf('</style>'), html.lastIndexOf('<script>'));
  const reste = (skript.match(/^[ \t]*(\/\/|\/\*).*$/gm) || []).length
    + (stil.match(/\/\*/g) || []).length + (geruest.match(/<!--/g) || []).length;
  ok(reste === 0, 'die Auslieferung traegt keine Kommentare', reste + ' Kommentare');
}

// Dasselbe fuer den Zeichen-Katalog. Der Kommentar ueber `ICONS` warnt seit
// jeher vor der toten Definition; nachgezaehlt hat es nie jemand, und zwei
// Zeichnungen standen ohne einen einzigen Aufrufer in der Auslieferung.
const _toteIcons = (function(){
  const html = fs.readFileSync(require('./ziel.js'), 'utf8');
  const i = html.indexOf('const ICONS = {');
  if(i < 0) return ['ICONS nicht gefunden'];
  const ende = html.indexOf('\n};', i);
  const block = html.slice(i, ende);
  const namen = [...block.matchAll(/^\s{2}([A-Za-z][\w]*):\s/gm)].map(m => m[1]);
  const rest = html.slice(0, i) + html.slice(ende);
  const wort = new Set(rest.match(/[A-Za-z_$][\w$]*/g) || []);
  return namen.filter(n => !wort.has(n));
})();
ok(_toteIcons.length === 0, 'kein Zeichen im Katalog ohne Aufrufer',
   _toteIcons.join(' · ') || 'alle');

// Und jedes Award-Zeichen steht im Katalog. Die Tabelle stand viermal da,
// und die Kopie im Duo-Blatt nannte zwei Namen, die es nicht gibt: dort
// standen „Schlechtestes Team" und „Baustelle" ohne Zeichen. Ein fehlendes
// Zeichen wirft keinen Fehler, die Kachel bleibt einfach leer.
const _awZeichen = JSON.parse(K.eval(`JSON.stringify({
  fehlt: Object.entries(AW_IC).filter(([k, v]) => !ICONS[v]).map(([k, v]) => k + '→' + v),
  ohne: Object.keys(AWARD_META).filter(k => !AW_IC[k])})`));
ok(_awZeichen.fehlt.length === 0 && _awZeichen.ohne.length === 0,
   'jede Auszeichnung hat ein Zeichen, und jedes steht im Katalog',
   [..._awZeichen.fehlt, ..._awZeichen.ohne.map(k => k + ' ohne Zeichen')].join(' · ') || 'alle');

// Und ein Name gehoert einer Frage. Der Award „Einzelkaempfer" wertete die
// Siegquote als Staerkster der vier, der Liga-Rekord „Der Einzelkaempfer"
// den Rueckgang der Mitspielerstaerke — zwei Fragen unter einem Namen.
// Erlaubt sind nur die drei Paare, die dieselbe Idee auf zwei Zeitachsen
// messen: Torjaeger, Pechvogel und Favoritenschreck.
const _awNamen = JSON.parse(K.eval(`JSON.stringify((function(){
  const n = s => String(s).replace(/^(Der|Die|Das) /, '').toLowerCase();
  const ch = new Map(DISZIPLINEN.map(d => [n(d.name), d.id]));
  const erlaubt = new Set(['scorer|sniper', 'pechvogel|hardluck', 'favoritenschreck|favschreck']);
  return Object.entries(AWARD_META).filter(([k, m]) => ch.has(n(m.title)) && !erlaubt.has(k + '|' + ch.get(n(m.title))))
    .map(([k, m]) => k + ' und ' + ch.get(n(m.title)) + ': ' + m.title);
})())`));
ok(_awNamen.length === 0, 'kein Award heisst wie eine Chronik, die etwas anderes misst',
   _awNamen.join(' · ') || 'keiner');

// ── Die Awards: jede Kachel muss in einer Woche erreichbar sein ─────
// Die Schwellen stammen aus der Zeit, in der es den Zeitraum „Gesamt" gab.
// Gemessen spielt ein Duo in einer Woche im Mittel DREI Partien, und sieben
// von sechsunddreissig Kacheln verlangten zehn gemeinsame Spiele: sie
// standen jede Woche leer, egal wie viel gespielt wurde.
const _awSchwelle = JSON.parse(K.eval(`JSON.stringify((function(){
  const zu_hoch = [];
  Object.keys(AW_MIN).forEach(k => { if(AW_MIN[k] > 5) zu_hoch.push(k + '=' + AW_MIN[k]); });
  // Und die Gegenprobe an den echten Partien: was bleibt nach einer vollen
  // Woche noch leer?
  awPeriod = 'week'; awView = 'awards';
  invalidateCache();
  const h = _vAwardsCore();
  const teile = String(h).split('data-award="');
  const leer = [];
  for(let i = 1; i < teile.length; i++){
    const key = teile[i].slice(0, teile[i].indexOf('"'));
    const nx = teile[i].indexOf('data-award="');
    const block = nx < 0 ? teile[i] : teile[i].slice(0, nx);
    if(/aw-t-leer/.test(block)) leer.push(key);
  }
  return {zu_hoch, leer, partien: matchesInPeriod('week').length};
})())`));
ok(_awSchwelle.zu_hoch.length === 0, 'keine Mindestzahl ueber fuenf',
   _awSchwelle.zu_hoch.join(', ') || 'keine');
// Was leer bleibt, sind Ereignisse, die es in dieser Woche nicht gab — kein
// 10:0 heisst kein Showmaster. Eine Schwelle darf nicht der Grund sein.
ok(_awSchwelle.leer.length <= 2,
   'nach einer vollen Woche steht fast jede Award-Kachel',
   _awSchwelle.leer.length + ' leer: ' + _awSchwelle.leer.join(' '));

// ── Ein Wert je Auszeichnung [§5.3d] ────────────────────────────────
// Kachel, Blatt, Profil und Duo-Blatt formatierten jeden Award selbst:
// dieselbe Serie hieß „8", „8er", „8er Serie" und „8 Siege in Folge", die
// Kachel trug ihre Zahl ohne Einheit („6,90", „+10"), und die Stichprobe
// wurde gebaut und nie gezeigt. Jetzt liest jede Stelle aus AW_WERT — und
// jede Kachel trägt die Zahl MIT ihrer Sache.
const _awEin = JSON.parse(K.eval(`JSON.stringify((function(){
  const f = [];
  Object.keys(AWARD_META).forEach(k => { if(!AW_WERT[k]) f.push('ohne Wert: ' + k); });
  Object.keys(AW_WERT).forEach(k => {
    if(!AWARD_META[k]) f.push('ohne Titel: ' + k);
    if(!AW_IC[k]) f.push('ohne Zeichen: ' + k);
  });
  let kacheln = 0;
  for(const per of ['season', 'week']){
    awPeriod = per; awSeasonId = null; awView = 'awards';
    const R = awardRankings(per);
    const teile = String(_vAwardsCore()).split('data-award="');
    for(let i = 1; i < teile.length; i++){
      const key = teile[i].slice(0, teile[i].indexOf('"'));
      const nx = teile[i].indexOf('data-award="');
      const block = nx < 0 ? teile[i] : teile[i].slice(0, nx);
      if(/aw-t-leer/.test(block)) continue;
      kacheln++;
      const t = awText(key, awTop(key, R)[0]);
      const b = block.match(/class="aw-t-val"><b>([^<]*)<\\/b>(?:<span>([^<]*)<\\/span>)?/) || [];
      if(b[1] !== esc(t.z)) f.push(per + ' ' + key + ': Kachel ' + b[1] + ' statt ' + t.z);
      if(!b[2]) f.push(per + ' ' + key + ': Zahl ohne Einheit (' + b[1] + ')');
      const text = block.replace(/<[^>]+>/g, ' ');
      if(/\\d+er\\b|\\/Sp\\.|Niederl\\.|\\bSp\\./.test(text)) f.push(per + ' ' + key + ': Kürzel in „' + text.replace(/\\s+/g, ' ').trim().slice(0, 60) + '"');
    }
  }
  // Profil und Duo-Blatt nennen dieselbe Zahl wie die Kachel desselben
  // Eintrags — gleicher Platz aus derselben Zählung.
  awPeriod = 'season'; awSeasonId = null;
  activePlayers().forEach(p => playerAwards(p.id).forEach(a => {
    if(a.val !== awText(a.key, a.x).z) f.push('Profil ' + p.name + ' ' + a.key + ': ' + a.val);
    if(a.rank === 0 && !awTop(a.key, awardRankings('season', currentSeason().id)).includes(a.x))
      f.push('Profil ' + p.name + ' ' + a.key + ': Platz 1, aber nicht an der Spitze');
  }));
  return {f, kacheln};
})())`));
ok(_awEin.f.length === 0 && _awEin.kacheln > 50,
   'jede Award-Kachel nennt Zahl und Einheit aus derselben Quelle wie Blatt und Profil',
   _awEin.f.slice(0, 6).join(' · ') || _awEin.kacheln + ' Kacheln');

// ── Die Erklärung einer Kachel nennt die Schwelle, die gilt ─────────
// „So wird gewertet" stand als fester Text da und war den Schwellen nicht
// gefolgt: die Betonmauer verlangte laut Text zehn gemeinsame Spiele und
// in der Rechnung drei, der Carry-King nannte „einen der drei schwächsten"
// Mitspieler und zählte den schwächsten der vier. Wo eine Schwelle aus
// AW_MIN kommt, steht ihre Zahl im Text — und die Liste hält sie ein.
const _awWhy = JSON.parse(K.eval(`JSON.stringify((function(){
  const soll = {scorer:'position', wall:'position', worstAtk:'position', worstDef:'position',
    worstWr:'spieler', clutch:'enge', pechvogel:'enge', concreteWall:'teamSpiele',
    cheesePlatter:'teamSpiele', luckyCharm:'teamEnge', giantSlayer:'teamUnter',
    zirkus:'teamPleiten', plusMinus:'spielerSaldo', underdog:'unter', favoriteLoser:'favorit'};
  const falsch = [];
  Object.keys(soll).forEach(k => {
    const w = (AWARD_META[k] || {}).why || '';
    const zahlen = (w.match(/\\d+/g) || []).map(Number);
    const n = AW_MIN[soll[k]];
    const fremd = zahlen.filter(z => z > 1 && z < 30 && z !== n && z !== 2 && z !== 5);
    if(!zahlen.includes(n) || fremd.length) falsch.push(k + ': ' + w);
  });
  Object.keys(AWARD_META).forEach(k => {
    if(/\\bMin\\./.test(AWARD_META[k].why)) falsch.push(k + ' kürzt ab');
  });
  // Eine Woche, weil dort Spieler mit einer einzigen Sturmpartie vorkommen.
  const R = awardRankings('week');
  const unter = [];
  [['scorer','position'],['wall','position'],['worstAtk','position'],['worstDef','position'],['worstWr','spieler']]
    .forEach(([k, f]) => (R[k] || []).forEach(x => { if(x.g < AW_MIN[f]) unter.push(k + ' ' + x.g); }));
  return {falsch, unter};
})())`));
ok(_awWhy.falsch.length === 0, 'jede Erklärung einer Kachel nennt die Schwelle, die gilt',
   _awWhy.falsch.join(' | ') || 'alle');
ok(_awWhy.unter.length === 0, 'und jede Liste hält diese Schwelle ein',
   _awWhy.unter.join(', ') || 'alle');

// ── Der Nenner ist die Teilmenge, um die es geht ────────────────────
// „Pechvogel" zaehlte knappe Niederlagen gegen ALLE Partien und kuerte
// damit den Vielspieler statt den Pechvogel. Er ist der Spiegel des
// Clutch-Players und teilt sich seither dessen Zaehlung: enge Partien und
// die davon gewonnenen. Dieselbe Verwechslung steckte in drei weiteren
// Kacheln.
const _awNenner = JSON.parse(K.eval(`JSON.stringify((function(){
  awPeriod = 'season'; invalidateCache();
  const R = awardRankings('season');
  const pv = R.pechvogelList[0], cl = R.clutchList.find(c => c.id === (pv||{}).id);
  const lc = R.luckyCharmList[0], zk = R.zirkusList[0], ud = R.underdogList[0];
  return {
    // Pechvogel und Clutch rechnen ueber dieselbe Menge: verloren + gewonnen
    // ergibt die engen Partien.
    spiegel: (pv && cl) ? (pv.g === cl.g && pv.v + cl.w === cl.g) : null,
    // Kein Anteil darf ueber eins liegen — der Nenner muss die Obermenge sein.
    ueberEins: [].concat(
      R.pechvogelList.filter(x => x.pct > 1).map(() => 'pechvogel'),
      R.luckyCharmList.filter(x => x.v > 1).map(() => 'luckyCharm'),
      R.zirkusList.filter(x => x.pct > 1).map(() => 'zirkus'),
      R.underdogList.filter(x => x.pct > 1).map(() => 'underdog')),
    // Und jede dieser Kacheln traegt jetzt eine Quote, keine blanke Anzahl.
    quoten: {pv: pv ? pv.pct != null : false, lc: lc ? lc.v != null : false,
             zk: zk ? zk.pct != null : false, ud: ud ? ud.pct != null : false},
    // Die Quote muss die angezeigten Zahlen sein: Zaehler durch Nenner. Wird
    // durch etwas anderes geteilt, steht auf der Kachel „5 von 5" und daneben
    // eine Prozentzahl, die nicht dazu passt.
    stimmig: [].concat(
      R.pechvogelList.filter(x => Math.abs(x.pct - x.v / x.g) > 1e-9).map(() => 'pechvogel'),
      R.zirkusList.filter(x => Math.abs(x.pct - x.v / x.g) > 1e-9).map(() => 'zirkus'),
      R.underdogList.filter(x => Math.abs(x.pct - x.v / x.g) > 1e-9).map(() => 'underdog'),
      R.luckyCharmList.filter(x => Math.abs(x.v - x.wins / x.games) > 1e-9).map(() => 'luckyCharm')),
    // Der Underdog-Held zaehlte die Siege ohne Nenner: dann waeren Zaehler und
    // Nenner ueberall gleich und jeder staende bei hundert Prozent.
    udEcht: R.underdogList.some(x => x.g > x.v),
    // Der Zirkus zaehlte die Debakel gegen ALLE gemeinsamen Spiele und sagte
    // damit zwei Dinge auf einmal: wie oft ein Duo verliert und wie deutlich.
    // Gefragt ist das Zweite, also ist der Nenner die Zahl der Pleiten. Sie
    // wird hier unabhaengig nachgezaehlt.
    zkNenner: (function(){
      if(!zk) return null;
      const key = zk.ids.slice().sort().join('|');
      let pleiten = 0;
      matchesInPeriod('season').forEach(m => {
        const verlierer = m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2];
        if(verlierer.slice().sort().join('|') === key) pleiten++;
      });
      return {gemeldet: zk.g, gezaehlt: pleiten};
    })()
  };
})())`));
ok(_awNenner.spiegel === true,
   'Pechvogel und Clutch teilen sich die engen Partien', String(_awNenner.spiegel));
ok(_awNenner.ueberEins.length === 0, 'kein Anteil liegt ueber hundert Prozent',
   _awNenner.ueberEins.join(', ') || 'keiner');
ok(Object.keys(_awNenner.quoten).every(k => _awNenner.quoten[k]),
   'Pechvogel, Gluecklspilze, Zirkus und Underdog rechnen eine Quote',
   JSON.stringify(_awNenner.quoten));
ok(_awNenner.stimmig.length === 0, 'die Quote passt zu den Zahlen daneben',
   _awNenner.stimmig.join(', ') || 'alle');
ok(_awNenner.udEcht === true,
   'der Underdog-Held zaehlt auch die verlorenen Aussenseiter-Partien',
   String(_awNenner.udEcht));
ok(_awNenner.zkNenner && _awNenner.zkNenner.gemeldet === _awNenner.zkNenner.gezaehlt,
   'der Zirkus misst an den Pleiten des Duos, nicht an allen Partien',
   JSON.stringify(_awNenner.zkNenner));

// ── Der Beleg [§C27] ────────────────────────────────────────────────
// Ein Rekord belegte seinen Bestwert mit einem Satz. „72 %" aus fünfzig und
// aus fünfhundert Partien sind zwei Aussagen, und ob der Zweite knapp
// dahinter liegt, stand nur in der Liste. Der Beleg zeigt die Stichprobe als
// Zellen, die Halter im Feld, den Vorsprung in Ergebnissen und den Verlauf —
// und jede dieser Zahlen muss stimmen, sonst ist die Zeichnung eine
// Behauptung mehr.
const _beleg = JSON.parse(K.eval(`JSON.stringify((function(){
  const f = []; let zellen = 0, felder = 0, spannen = 0, verlaeufe = 0, dreier = 0;
  const H = chronicleHolders();
  const st = globalThis.setTimeout;
  globalThis.setTimeout = fn => fn();
  try {
    CHRONICLES.forEach(c => {
      const h = H[c.id]; if(!h) return;
      let out = ''; const echt = openSheet; openSheet = x => { out = x; };
      try { showChronicle(c.id); } catch(e){ f.push(c.id + ': ' + e.message); } finally { openSheet = echt; }
      const a = belegAnteil(h.ev);
      const z = out.match(/<div class="bl-zellen">([\\s\\S]*?)<\\/div>/);
      if(a){
        if(!z) f.push(c.id + ': ohne Zellen');
        else {
          zellen++;
          const je = Math.max(1, Math.ceil(a.n / 100));
          const n = (z[1].match(/<i/g) || []).length, k = (z[1].match(/class="j"/g) || []).length;
          if(n !== Math.ceil(a.n / je) || k !== Math.round(a.k / je))
            f.push(c.id + ': ' + k + '/' + n + ' Zellen statt ' + a.k + '/' + a.n);
        }
      } else if(z) f.push(c.id + ': Zellen ohne Stichprobe');
      const feld = out.match(/<div class="bl-feld"[\\s\\S]*?<\\/div>/);
      if(feld){
        felder++;
        const er = (feld[0].match(/class="er"/g) || []).length, soll = (h.pids || [h.pid]).length;
        if(er !== soll) f.push(c.id + ': ' + er + ' Halter im Feld statt ' + soll);
      }
      // Der Knopf sagt, wohin er führt: ins Profil des Halters, mit Namen.
      // Dort stand „Direkter Vergleich" ohne zu sagen, wer mit wem — und
      // die Bilanz von Halter und Zweitem hat mit dem Rekord nichts zu tun.
      if(/data-vergleich/.test(out)) f.push(c.id + ': Knopf ohne Bezug zum Rekord');
      const nm = (pmap()[h.pid] || {}).name;
      if(nm && out.indexOf('Profil von ' + esc(nm)) < 0) f.push(c.id + ': Knopf ohne den Namen des Halters');
      // Wie knapp: so viele der eigenen Gelegenheiten hätten anders
      // ausgehen müssen, damit der Zweite gleichauf läge — unabhängig
      // nachgerechnet aus dem Beleg des Zweiten. Die Spanne davor war
      // richtig gerechnet und nicht zu lesen.
      if(/Zufall|Wahrscheinlichkeit|irgendwo zwischen/.test(out)) f.push(c.id + ': Statistiksprache');
      const lz = out.match(/data-luft="(\\d+)"/);
      if(lz){
        spannen++;
        const halter = new Set(h.pids || [h.pid]);
        const zw = chronicleRang(c.id).find(r => !halter.has(r.pid));
        const za = zw && belegAnteil(zw.ev);
        const soll = za ? Math.max(0, Math.ceil(a.k - za.k / za.n * a.n - 1e-9)) : null;
        if(soll !== +lz[1]) f.push(c.id + ': ' + lz[1] + ' Ergebnisse Vorsprung statt ' + soll);
        if(!_belegIstQuote(h.ev, a)) f.push(c.id + ': Vorsprung um etwas, das kein Anteil ist');
      }
      // Der Verlauf endet heute beim Bestwert, und „vorn seit" zeigt auf
      // einen Monat, in dem der Halter wirklich vorn lag. Er zeichnet die
      // drei des Podests in dessen Reihenfolge, jeden mit seinem Wert von
      // heute, und die Legende nennt alle drei: vorher fehlte der Dritte.
      rekordVerlauf(c.id, v => {
        if(!v) return;
        verlaeufe++;
        const r = chronicleRang(c.id), a = v.reihen[0].werte;
        if(Math.abs(a[a.length - 1] - r[0].wert) > 1e-9) f.push(c.id + ': Verlauf endet bei ' + a[a.length - 1] + ' statt ' + r[0].wert);
        if(v.seit == null || a[v.seit] == null) f.push(c.id + ': vorn seit einem Monat ohne Wert');
        const soll = r.slice(0, 3);
        if(v.reihen.length !== soll.length || v.reihen.some((x, k) => x.pid !== soll[k].pid
             || Math.abs(x.werte[x.werte.length - 1] - soll[k].wert) > 1e-9))
          f.push(c.id + ': Verlauf zeichnet ' + v.reihen.map(x => x.name).join('/') + ' statt des Podests');
        const html = belegVerlaufHtml(v);
        const leg = (html.match(/<div class="bl-legende">([\\s\\S]*?)<\\/div>/) || [])[1] || '';
        if(soll.length === 3){
          dreier++;
          if(!/class="p3"/.test(leg) || !/bl-v-p3/.test(html)) f.push(c.id + ': der Dritte fehlt im Verlauf');
        }
      });
    });
  } finally { globalThis.setTimeout = st; }
  return {f, zellen, felder, spannen, verlaeufe, dreier};
})())`));
// Die Zahlen dahinter sagen nur, dass die Pruefung ueberhaupt greift. Seit
// die Anteile gewonnener Spieltage, Wochen und Partien als Rekorde
// gestrichen sind [§C35], tragen vier Rekorde einen Anteil als Beleg und
// drei davon einen Zweiten, gegen den ein Vorsprung zaehlt.
ok(_beleg.f.length === 0 && _beleg.zellen >= 4 && _beleg.felder > 30 && _beleg.spannen >= 3 && _beleg.verlaeufe > 30
   && _beleg.dreier > 30,
   'der Beleg zählt seine Stichprobe, zeigt die Halter im Feld, zählt den Vorsprung, endet beim Bestwert und zeichnet das Podest',
   _beleg.f.slice(0, 5).join(' · ') || _beleg.zellen + ' Zellenreihen · ' + _beleg.felder + ' Felder · '
     + _beleg.spannen + ' Vorsprünge · ' + _beleg.verlaeufe + ' Verläufe · ' + _beleg.dreier + ' mit drei Linien');

// ── Die Meisterbühne [§C31] ─────────────────────────────────────────
// Der Meister stand im Feed als Karte ohne ein einziges Bild, und sein Blatt
// nannte drei Elo-Zahlen und die Saison-ID. Jetzt zeichnen Karte und Blatt
// Podest, Titelrennen und Tage vorn — und jede dieser Zahlen muss zu der
// Rechnung passen, aus der Liga-Tab und Rückblick sie auch nehmen.
console.log('\n═══ 6b. DIE MEISTERBÜHNE ═══');
['2026-05', '2026-06', '2026-07'].forEach(sid => {
  const r = JSON.parse(K.eval(`(()=>{
    const sid = ${JSON.stringify(sid)};
    const ph = getSeasonPositionHistory(sid), sp = saisonSpitze(sid), rang = saisonRang(sid);
    // Unabhängig nachgerechnet: die Saison-Elo aus den Deltas der Partien,
    // Tag für Tag, und wer am Ende jedes Spieltags vorn lag.
    const ms = matchesInSeason(sid).slice().sort((a,b)=>mts(a)-mts(b));
    const elo = {}, vorn = {};
    let tag = null;
    const zu = () => { if(tag == null) return;
      const b = Object.keys(elo).sort((a,c)=>elo[c]-elo[a] || a.localeCompare(c))[0];
      if(b) vorn[b] = (vorn[b]||0) + 1; };
    ms.forEach(m => {
      const d = new Date(m.created_at).getDate();
      if(d !== tag){ zu(); tag = d; }
      [m.a1,m.a2,m.b1,m.b2].forEach(id => { if(elo[id] == null) elo[id] = cfg.start_elo ?? 0; });
      Object.keys(m.deltas||{}).forEach(id => { if(elo[id] != null) elo[id] += m.deltas[id]; });
    });
    zu();
    const tage = new Set(ms.map(m => new Date(m.created_at).getDate())).size;
    const abw = rang.map(e => Math.abs((ph.eloByDay[e.id]||[])[ph.lastDay-1] - e.elo)).reduce((a,b)=>Math.max(a,b),0);
    return JSON.stringify({sp, vorn, tage, abw, champ:rang[0] && rang[0].id,
      summe:Object.values(sp.tage).reduce((a,b)=>a+b,0)});
  })()`));
  ok(r.sp.spieltage === r.tage && r.summe === r.tage,
     `${sid}: jeder Spieltag hat genau einen, der vorn lag (${r.tage})`, JSON.stringify([r.sp.spieltage, r.summe, r.tage]));
  ok(JSON.stringify(Object.entries(r.sp.tage).sort()) === JSON.stringify(Object.entries(r.vorn).sort()),
     `${sid}: die Tage an der Spitze stimmen mit den Partien überein`, JSON.stringify([r.sp.tage, r.vorn]));
  ok(r.abw <= 1, `${sid}: das Titelrennen endet auf der Elo der Rangliste`, 'Abweichung ' + r.abw);
});
// Die echte Karte, so wie der Generator sie am 1. August bildet.
NOW = new RealDate(2026, 7, 1, 9, 0, 0).getTime();
const mst = JSON.parse(K.eval(`(()=>{ invalidateCache();
  const s = _buildStories().find(x => (x.dataRef||{}).type === 'season_recap');
  if(!s) return 'null';
  // Ein Tippen auf die Karte öffnet den Saison-Rückblick [§C31]; dessen
  // „Wie es zum Titel kam" ist das Blatt der Meister-Story.
  const d = s.dataRef, karte = _newsCardHtmlM2(s, false, false, '');
  const drei = (d.topElo || []).slice(0, 3).map(x => x.id);
  const blatt = saisonRennenHtml(d.sid, drei) + saisonSpitzeHtml(d.sid, drei) + saisonZellenHtml(d.sid, d.championId);
  const ph = getSeasonPositionHistory(d.sid);
  return JSON.stringify({sorte:_newsSorte(s), held:_breakingHeroText(s), karte, blatt,
    champ:d.championId, label:seasonLabel(d.sid), tage:ph.lastDay});
})()`));
NOW = new RealDate(2026, 7, 26, 21, 0, 0).getTime();
K.eval('invalidateCache()');
ok(mst && mst.sorte === 'held', 'der Meister trägt die Form des Helden, nicht die eines Fun Facts', mst && mst.sorte);
if(mst){
  console.log(`     Nachsatz: ${mst.held}`);
  // Die Schlagzeile nennt Meister und Monat; der Nachsatz erzählt nur noch,
  // wie der Titel entschieden wurde. „Juli 2026 ist entschieden: Leon holt
  // den Titel" sagte unter „Leon ist Meister im Juli 2026" dasselbe noch einmal.
  ok(!/\d{4}-\d{2}/.test(mst.held) && !/holt den Titel|ist entschieden/.test(mst.held)
     && mst.held.indexOf(mst.label) < 0 && /(vom \d\d\.\d\d\. an|vom ersten Spieltag an)/.test(mst.held),
     'der Nachsatz erzählt den Verlauf und wiederholt die Schlagzeile nicht', mst.held);
  ok(!/(^|\.\s)Vor \S+\.(\s|$)/.test(mst.held), 'der Nachsatz hat kein Satzfragment', mst.held);
  const erster = (mst.karte.match(/pod-karte gold erster" data-mpid="([^"]+)"/) || [])[1];
  ok(erster === mst.champ, 'die Karte zeigt das Podest mit dem Meister in der Mitte', erster);
  ok(/class="srn klein"/.test(mst.karte) && /srn-l gold/.test(mst.karte),
     'die Karte zeigt das Titelrennen, der Meister golden');
  const felder = ((mst.blatt.match(/<div class="srn-band"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '').match(/<i /g) || [];
  ok(felder.length === mst.tage, 'das Band der Spitze hat ein Feld je Tag', felder.length + ' von ' + mst.tage);
  ok(new RegExp('srn-t gold" data-pid="' + mst.champ).test(mst.blatt),
     'bei den Tagen vorn steht der Meister golden');
  ok(/class="srn-z"/.test(mst.blatt) && !/2026-\d\d/.test(mst.blatt.replace(/data-[a-z]+="[^"]*"/g, '')),
     'das Blatt zeigt die Saison des Meisters als Zellen und keine Saison-ID');
}

// ── Ein Rückblick von selbst je Tag [§C31] ──────────────────────────
// Endet ein Monat am Sonntag, öffneten sich am Montag zwei: der Saison-
// Rückblick beim Start und der Wochenrückblick 300 ms später. Der Monat geht
// vor, die Woche kommt am nächsten Tag — und bekommt den Mittwoch dazu, wenn
// sie erst am Dienstag an der Reihe wäre. Gestellt am 1. Juni 2026, einem
// Montag, und an einer gewöhnlichen Woche im August.
const _autoTag = (tag, std) => {
  NOW = new RealDate(2026, tag[0], tag[1], std || 10, 0, 0).getTime();
  return JSON.parse(K.eval(`(()=>{
    _autoRecapSeen.clear();
    const auf = [];
    const alt = showPotwRecap;
    showPotwRecap = () => { auf.push('woche'); };
    try {
      const vorher = localStorage.getItem('padel_auto_rueckblick_tag');
      autoShowSeasonRecap();
      const monat = localStorage.getItem('padel_auto_rueckblick_tag') !== vorher;
      if(monat) auf.push('monat');
      autoShowPotwRecap();
      return JSON.stringify(auf);
    } finally { showPotwRecap = alt; }
  })()`));
};
{
  const seasAlt = K.eval('JSON.stringify(seasons.map(s => s.id))');
  K.eval(`globalThis.__seasAlt = seasons; seasons = seasons.filter(s => s.id === '2026-05')`);
  ls.clear();
  const mo = _autoTag([5, 1]);
  ls.set('recap_shown_2026-05', '1');            // gesehen, auch weggewischt
  const di = _autoTag([5, 2]);
  ls.clear();
  const diErst = _autoTag([5, 2]);
  ls.set('recap_shown_2026-05', '1');
  const mi = _autoTag([5, 3]);
  const doTag = _autoTag([5, 4]);
  K.eval('seasons = globalThis.__seasAlt');
  ls.clear();
  const aug = [_autoTag([7, 17]), _autoTag([7, 19])];
  ls.clear();
  NOW = new RealDate(2026, 7, 26, 21, 0, 0).getTime();
  ok(JSON.stringify(mo) === '["monat"]' && JSON.stringify(di) === '["woche"]',
     'am Montag nach dem Monatsende öffnet sich nur der Monat, die Woche am Dienstag', JSON.stringify([mo, di]));
  ok(JSON.stringify(diErst) === '["monat"]' && JSON.stringify(mi) === '["woche"]' && JSON.stringify(doTag) === '[]',
     'wer erst am Dienstag öffnet, bekommt den Monat und am Mittwoch die Woche', JSON.stringify([diErst, mi, doTag]));
  ok(JSON.stringify(aug[0]) === '["woche"]' && JSON.stringify(aug[1]) === '[]',
     'ohne Monatswechsel bleibt die Woche bei Montag und Dienstag', JSON.stringify(aug) + ' ' + seasAlt);
}

// ── Die Titel des Monats stehen im Monat [§C31] ─────────────────────
// Endet die Woche mit dem Monat, kommen in derselben Sekunde Meister, Vize
// und Team der Saison [§C34]. In der Woche bis zum 31.05. standen sie unter
// „Wirkung auf die Laufbahn" ein zweites Mal, als Gewinn einer Woche. Und am
// Morgen nach dem Monatswechsel galt der Schnitt am Monatsende als „jetzt"
// und trug die Titel schon, abends nach der ersten Partie nicht mehr.
{
  // Die Woche vom 25. bis 31. Mai 2026, morgens am 1. Juni vor der ersten
  // Partie und abends danach.
  const woche = (morgens) => {
    NOW = new RealDate(2026, 5, 1, morgens ? 9 : 21, 0, 0).getTime();
    // Die Tabelle der Saisons trägt nur abgeschlossene Monate. Die Welt
    // dieser Suite trägt für ihre Uhr im August auch Juni und Juli; am 1.
    // Juni morgens, ohne spätere Partie, gilt der Schluss der Woche als
    // „jetzt", und dann zählte der Vize-Titel des Juli schon mit.
    return JSON.parse(K.eval(`(()=>{
      const echt = matches, archiv = seasons;
      if(${morgens ? 'true' : 'false'}) matches = echt.filter(m => mts(m) < seasonStart().getTime());
      seasons = archiv.filter(s => seasonEnd(s.id).getTime() < Date.now());
      invalidateCache();
      try {
        const von = new Date(2026, 4, 25).getTime(), bis = new Date(2026, 4, 31, 23, 59, 59, 999).getTime();
        const je = l => { const o = {}; l.forEach(x => { o[pname(x.pid)] = Math.round(x.delta * 10) / 10; }); return o; };
        return JSON.stringify({woche:je(rcpWocheLaufbahn(von, bis)), mitTiteln:je(rcpLaufbahnDaten(von, bis)),
          meister:pname(JSON.parse(seasons.find(s => s.id === '2026-05').top_elo)[0].id)});
      } finally { matches = echt; seasons = archiv; invalidateCache(); }
    })()`));
  };
  const morgens = woche(true), abends = woche(false);
  NOW = new RealDate(2026, 7, 26, 21, 0, 0).getTime();
  K.eval('invalidateCache()');
  ok(JSON.stringify(morgens.woche) === JSON.stringify(abends.woche),
     'die Woche bis zum Monatsende zeigt morgens dieselbe Wirkung wie abends',
     JSON.stringify([morgens.woche, abends.woche]));
  ok(abends.mitTiteln[abends.meister] - abends.woche[abends.meister] >= 150,
     'und ohne den Titel des Meisters, der erst mit dem Monat kommt',
     abends.meister + ': ' + abends.woche[abends.meister] + ' statt ' + abends.mitTiteln[abends.meister]);
}

// ── Ein Strich für jedes Zeichen [§C27] ─────────────────────────────
// Die Strichstärke stand an 78 Stellen in 13 Werten: dieselbe Krone war in
// der Liga dünner als im Blatt, und ein stroke-width am <svg> im Markup
// setzte 2,5 neben 2. Jetzt gibt es EINE Regel; ein Behälter setzt
// höchstens --strich, und davon gibt es drei Werte.
const _strich = (function(){
  const html = fs.readFileSync(require('./ziel.js'), 'utf8');
  const css = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [])
    .join('\n').replace(/<\/?style[^>]*>/gi, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const eigene = [], werte = new Set();
  let global = 0;
  for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const sel = m[1].trim(), body = m[2];
    if(/url\(/.test(body)) continue;
    if(sel === 'svg[viewBox="0 0 24 24"]' && /stroke-width:var\(--strich\)/.test(body)) global++;
    else if(/\bsvg\b/.test(sel) && /(^|;)\s*stroke-width:/.test(body)) eigene.push(sel.replace(/\s+/g, ' ').slice(-40));
    (body.match(/--strich:([\d.]+)/g) || []).forEach(v => werte.add(v.split(':')[1]));
  }
  return {eigene, global, werte:[...werte].sort()};
})();
ok(_strich.global === 1 && _strich.eigene.length === 0,
   'jedes Zeichen zieht seinen Strich aus einer Regel',
   _strich.eigene.join(' · ') || 'eine Regel');
ok(_strich.werte.every(v => ['1.4', '1.75', '2'].includes(v)),
   'die Strichstärke kennt drei Werte', _strich.werte.join(', '));

console.log('\n' + '═'.repeat(60));
console.log(fails === 0 ? `ALLE ${checks} CHECKS BESTANDEN` : `${fails} von ${checks} CHECKS FEHLGESCHLAGEN`);
process.exit(fails === 0 ? 0 : 1);
