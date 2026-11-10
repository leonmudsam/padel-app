// Prüft das neue Chronik-System (§13.4b) und den Avatar-Ring (§13.7)
// gegen die echten 466 Matches der Liga.
// Archiviert wird nur mit der Uhr der Liga [§C42]: die Suite rechnet als
// Gerät der Liga, mit Berliner Zeit, gleich wo sie läuft.
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const DIR = __dirname;
const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n,i)=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const packed = fs.readFileSync(DIR + '/fixtures/matches.txt', 'utf8').trim();
const realMatches = packed.split(';').map((row, i) => {
  const f = row.split(',').map(Number);
  const pos = k => f[4+k] === 0 ? 'drive' : 'reves';
  return { id:'m'+String(i).padStart(4,'0'),
    a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_side:pos(0), a2_side:pos(1), b1_side:pos(2), b2_side:pos(3),
    games_a:f[8], games_b:f[9], winner:f[10]===0?'A':'B',
    exp_a:f[11]/1000, created_at:new Date(f[12]*1000).toISOString(), deltas:{} };
});

const html = fs.readFileSync(require('./ziel.js'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = []; while ((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a,b)=>b.length-a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nglobalThis.__k={eval:c=>eval(c)};\n' + code.slice(lc);

// Fester Zeitpunkt: 27.08.2026, damit August die laufende Saison ist.
const FIXED = new Date('2026-08-27T12:00:00Z').getTime();
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...a){ if(a.length===0) super(FIXED); else super(...a); }
  static now(){ return FIXED; }
}
globalThis.Date = FakeDate;

const el = () => ({ style:{}, classList:{add(){},remove(){},contains(){return false}},
  addEventListener(){}, removeEventListener(){}, appendChild(){}, remove(){},
  querySelector(){return null}, querySelectorAll(){return []}, setAttribute(){}, getAttribute(){return null},
  insertAdjacentHTML(){}, focus(){}, click(){}, scrollIntoView(){}, dataset:{}, children:[], innerHTML:'', textContent:'' });
globalThis.window = { addEventListener(){}, removeEventListener(){}, location:{href:'',hash:'',reload(){}},
  matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}), navigator:{}, scrollTo(){}, setTimeout, clearTimeout,
  history:{pushState(){},replaceState(){},back(){}}, innerWidth:430, innerHeight:932 };
globalThis.document = { getElementById:()=>el(), querySelector:()=>null, querySelectorAll:()=>[],
  createElement:()=>el(), body:el(), documentElement:el(), addEventListener(){}, removeEventListener(){},
  head:el(), visibilityState:'visible', title:'' };
globalThis.localStorage = { _d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)},
  removeItem(k){delete this._d[k]}, clear(){this._d={}} };
globalThis.navigator = { onLine:true, userAgent:'node', serviceWorker:{ register(){return Promise.resolve()} }, clipboard:{writeText(){return Promise.resolve()}} };
globalThis.location = window.location;
globalThis.fetch = () => Promise.resolve({ ok:true, json:()=>Promise.resolve({}), text:()=>Promise.resolve('') });
const ch = () => new Proxy(function(){}, {get(_,p){return p==='then'?undefined:ch()}, apply(){return ch()}});
globalThis.__written = [];
globalThis.supabase = { createClient: () => ({
  from: (tbl) => ({
    upsert: async (row) => { globalThis.__written.push({tbl, row}); return {error:null}; },
    update: () => ({ eq: async () => ({error:null}) }),
    select: () => ({ order: async () => ({data:[], error:null}) }),
    delete: () => ({ lt: async () => ({error:null}) })
  }),
  channel:()=>ch(), removeChannel(){}, rpc:()=>ch() }) };
globalThis.alert = ()=>{}; globalThis.confirm = ()=>true; globalThis.prompt = ()=>null;
globalThis.requestAnimationFrame = (f)=>setTimeout(f,0);

eval(code);
const K = globalThis.__k;

K.eval(`
  players = ${JSON.stringify(NAMES.map((n,i)=>({id:IDS[i],name:n,hidden:false,elo:0,atk:0.5,avatar_id:null})))};
  matches = ${JSON.stringify(realMatches)};
  matches.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  seasons = [
    {id:'2026-05',label:'Mai 2026',start_date:'2026-04-30',end_date:'2026-05-31'},
    {id:'2026-06',label:'Juni 2026',start_date:'2026-05-31',end_date:'2026-06-30'},
    {id:'2026-07',label:'Juli 2026',start_date:'2026-06-30',end_date:'2026-07-31'}
  ];
  invalidateCache();
  // DB-First: die App aggregiert m.deltas. Der Export hat keine → einmal
  // mit den Slidern nachrechnen und in die Matches schreiben.
  const _rc = simulateEloWithSliders(matches);
  const _d = {}; _rc.history.forEach(h=>{_d[h.matchId]=h.deltas;});
  matches.forEach(m=>{ m.deltas=_d[m.id]||{}; });
  invalidateCache();
  const _g = getGlobalSim();
  seasons.forEach(s=>{
    const snap=_g.seasonEndElos[s.id]||{}, pl=_g.seasonPlayed[s.id]||{};
    const top=Object.keys(pl).filter(id=>pl[id]>0)
      .map(id=>({id,elo:Math.round(snap[id]??cfg.start_elo),wins:0,losses:0}))
      .sort((a,b)=>b.elo-a.elo);
    s.top_elo=JSON.stringify(top.slice(0,3)); s.player_id=top[0]?top[0].id:null;
  });
  invalidateCache();
  unlocked = true;
`);

let fails = 0, checks = 0;
const ok = (c,l,x)=>{checks++; if(!c){fails++; console.log('  ✗ '+l+(x?'  ['+x+']':''));} else console.log('  ok    '+l+(x?'  ('+x+')':''));};

// Supabase-Stub, der die geschriebenen Zeilen mitschneidet.
console.log('=== ARCHIVLAUF FRIERT DIE CHRONIK EIN ===');
(async () => {
  await K.eval('autoArchiveSeasons()');
  const written = JSON.stringify(globalThis.__written);
  const W = JSON.parse(written).filter(w => w.tbl === 'seasons');
  console.log('  geschriebene Saisons: ' + W.map(w=>w.row.id).join(', '));
  ok(W.length >= 1, 'mindestens eine Saison archiviert', W.length + '');
  const FV = K.eval('SEASON_TITLES_FREEZE_V');
  ok(W.every(w => w.row.titles && w.row.titles.v === FV), 'jede archivierte Saison bringt titles in der Fassung des Katalogs mit', 'v=' + FV);
  ok(W.every(w => Array.isArray(w.row.titles.awarded)), 'titles.awarded ist ein Array');
  const withEntries = W.filter(w => w.row.titles.awarded.length);
  ok(withEntries.length >= 1, 'mindestens eine Saison hat Eintraege', withEntries.length + '');
  ok(withEntries.every(w => w.row.titles.awarded.every(a => a.name && a.ev && a.ic)),
     'Anzeigefelder sind drin');
  ok(W.every(w => w.row.top_elo), 'top_elo bleibt unveraendert erhalten');

  // Zweiter Lauf: nichts mehr zu tun, weil jetzt eingefroren.
  globalThis.__written = []; K.eval('invalidateCache();');
  await K.eval('autoArchiveSeasons()');
  const W2 = globalThis.__written.filter(w => w.tbl === 'seasons');
  ok(W2.length === 0, 'zweiter Lauf schreibt nichts mehr', W2.map(w=>w.row.id).join(',') || '—');

  // Eine Saison, die mit einer älteren Fassung des Katalogs eingefroren
  // wurde, friert der nächste Lauf neu ein — genau sie und nur sie. Sonst
  // stellte eine alte Spalte der Matrix andere Fragen als die neuen [§C39].
  K.eval(`(function(){ const s = seasons.find(x => x.id === '2026-06');
    const t = typeof s.titles === 'string' ? JSON.parse(s.titles) : s.titles;
    s.titles = Object.assign({}, t, {v: SEASON_TITLES_FREEZE_V - 1}); invalidateCache(); })()`);
  globalThis.__written = [];
  await K.eval('autoArchiveSeasons()');
  const W3 = globalThis.__written.filter(w => w.tbl === 'seasons');
  ok(W3.length === 1 && W3[0].row.id === '2026-06' && W3[0].row.titles.v === FV,
     'eine Saison der alten Fassung wird neu eingefroren, sonst keine',
     W3.map(w => w.row.id + ' v' + (w.row.titles || {}).v).join(',') || '—');

  // Und die App liest ab jetzt die eingefrorene Fassung.
  const j = JSON.parse(K.eval("JSON.stringify(seasonTitles('2026-07'))"));
  ok(j.frozen === true, 'Juli kommt jetzt aus dem Einfrierer');

  // Und der Profileintrag eines abgeschlossenen Monats kommt aus derselben
  // Quelle. Wird er neu gerechnet, zeigt derselbe Monat eine andere Wertung,
  // sobald sich der Katalog bewegt — und das Prestige der Laufbahn mit ihm.
  // Gemessen wird das an einer Marke: die eingefrorene Zeile wird umbenannt,
  // und wer neu rechnet, kennt den Namen nicht.
  const g = JSON.parse(K.eval(`JSON.stringify((function(){
    const s = (seasons || []).find(x => x && x.id === '2026-07');
    const t = seasonTitles('2026-07');
    const erster = (t.awarded || [])[0];
    if(!s || !erster) return {leer:true};
    const sicher = JSON.stringify(s.titles);
    try {
      const kopie = JSON.parse(sicher);
      kopie.awarded[0].name = 'Eingefroren';
      s.titles = kopie;
      invalidateCache();
      const nach = seasonTitleOf(erster.pid, '2026-07');
      return {name:nach ? nach.name : '', pid:erster.pid === (nach || {}).pid};
    } finally {
      s.titles = JSON.parse(sicher);
      invalidateCache();
    }
  })())`));
  ok(g.name === 'Eingefroren' && g.pid,
     'der Profileintrag eines abgeschlossenen Monats kommt aus dem Einfrierer',
     JSON.stringify(g));

  console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
  process.exit(fails ? 1 : 0);
})();
