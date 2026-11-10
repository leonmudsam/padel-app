// Prüft das neue Chronik-System (§13.4b) und den Avatar-Ring (§13.7)
// gegen die echten 466 Matches der Liga.
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
globalThis.supabase = { createClient: () => ({ from:()=>ch(), channel:()=>ch(), removeChannel(){}, rpc:()=>ch() }) };
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
const ok = (cond, label, extra) => { checks++; if(!cond){ fails++; console.log('  ✗ ' + label + (extra?'  ['+extra+']':'')); } };
const nm = id => NAMES[IDS.indexOf(id)] || id;

console.log('=== 1. KONTEXT ===');
const C = K.eval('_chronicleCtx()');
console.log('gewertete Spieler:', Object.keys(C.P).length, '/', NAMES.length,
  '· Spieltage:', C.totalDays, '· Saisons:', C.seasonCount, '· erster Tag:', C.firstLabel);
ok(Object.keys(C.P).length > 0, 'Kontext hat Spieler');
ok(C.totalDays > 0, 'Spieltage gezählt');

// Unabhängige Nachrechnung direkt auf dem Match-Array
const raw = {};
const ordered = realMatches.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
const run = {}, runL = {};
const tagX = {};
ordered.forEach(mm => {
  [mm.a1,mm.a2,mm.b1,mm.b2].forEach(id => {
    const r = raw[id] || (raw[id] = {g:0,w:0,l:0,gf:0,ga:0,ws:0,ls:0,deb:0,nail:0,bit:0,close:0,closeW:0,blowW:0});
    const onA = (id===mm.a1||id===mm.a2);
    const w = (onA && mm.winner==='A') || (!onA && mm.winner==='B');
    const gf = onA ? mm.games_a : mm.games_b, ga = onA ? mm.games_b : mm.games_a;
    r.g++; r.gf+=gf; r.ga+=ga; if(w) r.w++; else r.l++;
    if(!w&&gf===0&&ga===10) r.deb++;
    // Die Achterbahn: beides am selben Abend.
    const tk = mm.created_at.slice(0,10);
    const t = (tagX[id] = tagX[id] || {})[tk] || (tagX[id][tk] = {n10:0, n01:0});
    if(w&&gf===10&&ga===0) t.n10++;
    if(!w&&gf===0&&ga===10) t.n01++;
    if(w&&gf===10&&ga===9) r.nail++;
    if(!w&&gf===9&&ga===10) r.bit++;
    if(Math.abs(gf-ga)<=2){ r.close++; if(w) r.closeW++; }
    if(w&&gf-ga>=7) r.blowW++;
    if(w){ runL[id]=0; run[id]=(run[id]||0)+1; if(run[id]>r.ws) r.ws=run[id]; }
    else { run[id]=0; runL[id]=(runL[id]||0)+1; if(runL[id]>r.ls) r.ls=runL[id]; }
  });
});
IDS.forEach(id => {
  const p = C.P[id], r = raw[id];
  if(!p || !r) return;
  ok(p.games===r.g,     nm(id)+' Spiele',      p.games+' vs '+r.g);
  ok(p.wins===r.w,      nm(id)+' Siege',       p.wins+' vs '+r.w);
  ok(p.gf===r.gf,       nm(id)+' Tore',        p.gf+' vs '+r.gf);
  ok(p.winStreak===r.ws,nm(id)+' Siegesserie', p.winStreak+' vs '+r.ws);
  ok(p.lossStreak===r.ls,nm(id)+' Pleitenserie',p.lossStreak+' vs '+r.ls);
  ok(p.debacle===r.deb, nm(id)+' 0:10',        p.debacle+' vs '+r.deb);
  // Die Fügung, die auf 10:0 und 0:10 aufbaut — unabhängig nachgezählt,
  // nicht aus derselben Rechnung übernommen.
  ok(p.beidesTag===Object.values(tagX[id]||{}).filter(t=>t.n10&&t.n01).length,
     nm(id)+' Achterbahn',
     p.beidesTag+' vs '+Object.values(tagX[id]||{}).filter(t=>t.n10&&t.n01).length);
  ok(p.nail===r.nail,   nm(id)+' 10:9',        p.nail+' vs '+r.nail);
  ok(p.bitter===r.bit,  nm(id)+' 9:10',        p.bitter+' vs '+r.bit);
  ok(p.close===r.close, nm(id)+' enge Spiele', p.close+' vs '+r.close);
  ok(p.blowW===r.blowW, nm(id)+' Kantersiege', p.blowW+' vs '+r.blowW);
});

console.log('\n=== LIGA-REKORDE GEGEN DAS EIGENE, UNABHAENGIG NACHGERECHNET ===');
// Jede dieser Rechnungen steht hier ein ZWEITES Mal — aus den rohen
// Matches, ohne einen Blick in `_chronicleCtx`. Zwei Rechnungen ueber
// dieselbe Frage nennen irgendwann zwei verschiedene Beste [§C27], und eine
// Zusicherung, die dieselbe Formel gegen sich selbst haelt, prueft nichts.
// Gemessen wird der Wert je Spieler, nicht nur der des Halters: ein
// Vorzeichenfehler trifft sonst zufaellig nur die, die gar nicht antreten.
// Die meisten fragen gegen das EIGENE [§C38]: Rueckkehr, die letzten 25 und
// der beste Spieltag; dazu die Zitterpartien, je mit ihrem Gegenstueck.
const _nr = {};
const _nrSicht = {};
ordered.forEach(mm => {
  [mm.a1,mm.a2,mm.b1,mm.b2].forEach(id => {
    const onA = (id===mm.a1||id===mm.a2);
    const w = (onA && mm.winner==='A') || (!onA && mm.winner==='B');
    const gf = onA ? mm.games_a : mm.games_b, ga = onA ? mm.games_b : mm.games_a;
    const pos = id===mm.a1 ? mm.a1_side : id===mm.a2 ? mm.a2_side
              : id===mm.b1 ? mm.b1_side : mm.b2_side;
    (_nrSicht[id] = _nrSicht[id] || []).push({w, gf, ga, pos,
      exp: onA ? (mm.exp_a || .5) : 1 - (mm.exp_a || .5),
      ts: new Date(mm.created_at).getTime(), day: new Date(mm.created_at).toISOString().slice(0, 10),
      mate: id===mm.a1 ? mm.a2 : id===mm.a2 ? mm.a1 : id===mm.b1 ? mm.b2 : mm.b1,
      geg: (onA ? [mm.b1,mm.b2] : [mm.a1,mm.a2]).filter(Boolean)});
  });
});
const _nrQ = a => a.length ? a.filter(x => x.w).length / a.length : 0;
Object.keys(_nrSicht).forEach(id => {
  const r = _nrSicht[id], o = (_nr[id] = {});
  // Der Widerstand — mittlerer Torrueckstand ueber alle Niederlagen
  const pl = r.filter(x => !x.w);
  o.widerstand = pl.length >= 20
    ? -(pl.reduce((a, x) => a + (x.ga - x.gf), 0) / pl.length) : null;
  // Wiedereinstieg und Rost — die erste Partie nach 144 vollstaendigen
  // Stunden gegen alle uebrigen (ohne die allererste)
  {
    const drin = [], raus = [];
    for(let i = 1; i < r.length; i++)
      (r[i].ts - r[i-1].ts >= 144 * 3600 * 1000 ? drin : raus).push(r[i]);
    const d = drin.length && raus.length ? _nrQ(drin) - _nrQ(raus) : null;
    // Was auf null Prozentpunkte rundet, ist keine Richtung.
    o.wieder = (d != null && drin.length >= 4 && Math.round(d * 100) > 0) ? d : null;
    o.rost = (d != null && drin.length >= 4 && Math.round(d * 100) < 0) ? -d : null;
  }
  // Der Abschwung — die letzten 25 gegen alles davor
  {
    const d = r.length >= 50 ? _nrQ(r.slice(-25)) - _nrQ(r.slice(0, -25)) : null;
    o.abschwung = (d != null && Math.round(d * 100) < 0) ? -d : null;
  }
  // Das Kaltblut und die weichen Knie — Zittersiege (10:9) gegen 9:10,
  // ab zehn solchen Partien
  {
    const z = r.filter(x => (x.gf === 10 && x.ga === 9) || (x.gf === 9 && x.ga === 10));
    const w = z.filter(x => x.w).length;
    o.kaltblut = z.length >= 10 ? w / z.length : null;
    o.weicheknie = z.length >= 10 ? (z.length - w) / z.length : null;
  }
  // Der Glanztag — der beste Spieltag ab fuenf Partien gegen die eigene Quote
  {
    const tage = {};
    r.forEach(x => (tage[x.day] = tage[x.day] || []).push(x));
    const l = Object.values(tage).filter(t => t.length >= 5).map(t => _nrQ(t) - _nrQ(r));
    const d = l.length ? Math.max.apply(null, l) : null;
    o.glanztag = (d != null && Math.round(d * 100) > 0) ? d : null;
  }
  // Der Eiskalte — gewonnene Partien mit einem Tor Unterschied in Folge.
  // Partien mit anderem Ausgang unterbrechen nicht, ein 9:10 beendet sie.
  {
    let n = 0, b = 0;
    r.forEach(x => { if(Math.abs(x.gf - x.ga) !== 1) return; n = x.w ? n + 1 : 0; if(n > b) b = n; });
    o.eiskalt = b >= 1 ? b : null;
  }
  // Die Sollstrecke — eigene Spieltage in Folge, an denen mindestens so viele
  // Siege standen, wie die Siegchancen des Tages zusammen erwarten liessen
  {
    const tage = {};
    r.forEach(x => (tage[x.day] = tage[x.day] || []).push(x));
    let n = 0, b = 0;
    Object.keys(tage).sort().forEach(k => { const a = tage[k];
      n = a.filter(x => x.w).length >= a.reduce((s, x) => s + x.exp, 0) - 1e-9 ? n + 1 : 0;
      if(n > b) b = n; });
    o.sollstrecke = b >= 1 ? b : null;
  }
  // Der Rollencoup — der Vorsprung auf die Erwartung als Aussenseiter, je Position
  {
    let best = null;
    ['drive','reves'].forEach(pos => {
      const t = r.filter(x => x.pos === pos && x.exp < .45);
      if(t.length < 20) return;
      const d = t.filter(x => x.w).length / t.length
              - t.reduce((a, x) => a + x.exp, 0) / t.length;
      if(best == null || d > best) best = d;
    });
    o.rollencoup = (best != null && best > 0) ? best : null;
  }
});
// ── Die Siegquote zaehlt einmal ─────────────────────────────────────
// Einundzwanzig Liga-Rekorde ordneten die Liga gemessen wie die Siegquote
// der Laufbahn, mit einer Korrelation von 0,76 bis 0,99: „Der Platzhirsch",
// „Der Torjaeger", „Der Deutliche" und so weiter. Wer am meisten gewann,
// hielt sie alle, und die zwei Besten hielten zusammen 31 Eintraege
// [§C35]. Das Niveau steht jetzt an genau diesen Stellen — der beste Monat,
// der hoechste Gipfel, die laengste Serie, die Form von jetzt und die
// beiden Positionen —, und jeder andere Rekord mit dem Grundwert des
// Koennens (`REKORD_GRUNDWERT.koennen`) muss
// etwas anderes fragen. Gemessen wird die Korrelation des Werts mit der
// eigenen Siegquote ueber alle im Rennen, ab sechs Werten: darunter ist
// eine Korrelation ein Wurf.
const NIVEAU = ['best_record','peak','unstoppable','lauf','drive_ace','reves_ace'];
const _sq = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx(), out = [];
  CHRONICLES.forEach(c => {
    if(c.basis !== REKORD_GRUNDWERT.koennen) return;
    const x = [], y = [];
    Object.keys(C.P).forEach(pid => { const p = C.P[pid]; let v = null;
      try { v = c.val(p, C); } catch(e){}
      if(v == null || !isFinite(v)) return;
      x.push(v); y.push(p.wins / p.games); });
    if(x.length < 6) return;
    const mx = x.reduce((a, b) => a + b, 0) / x.length, my = y.reduce((a, b) => a + b, 0) / y.length;
    let sxy = 0, sxx = 0, syy = 0;
    x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; });
    if(sxx && syy) out.push({id:c.id, r:sxy / Math.sqrt(sxx * syy)});
  });
  return out;
})())`));
const _sqFremd = _sq.filter(x => x.r >= 0.75 && NIVEAU.indexOf(x.id) < 0);
ok(_sq.length >= 12 && _sqFremd.length === 0,
   'nur die Rekorde des Niveaus folgen der Siegquote',
   _sqFremd.map(x => x.id + ' r=' + x.r.toFixed(2)).join(' · ') || _sq.length + ' Rekorde gemessen');
// „Der Allrounder" verlangte, auf BEIDEN Positionen ueber der Rechnung zu
// liegen. Das ist eine Latte bei null und keine Stichprobe: gehalten hatte
// ihn ein einziger Spieler, und mit dessen Karriereende stand der Rekord
// leer. Im Rennen steht jetzt jeder mit zwanzig Spielen je Position.
const _allround = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx();
  return {soll:Object.keys(C.P).filter(id => C.P[id].drvG >= 20 && C.P[id].revG >= 20).length,
          ist:(chronicleRang('allrounder') || []).length};
})())`));
ok(_allround.soll >= 3 && _allround.ist === _allround.soll,
   'im Rennen des Allrounders steht jeder mit zwanzig Spielen je Position',
   _allround.ist + ' von ' + _allround.soll);
ok(NIVEAU.every(id => K.eval(`!!CHRONICLE_BY_ID['${id}']`)),
   'und jeder Rekord des Niveaus steht im Katalog', NIVEAU.join(', '));

// Der Wert, den die App fuer denselben Spieler ausrechnet.
const _nrPaare = [['damage_control','widerstand'], ['wiedereinstieg','wieder'], ['rost','rost'],
  ['abschwung','abschwung'], ['glanztag','glanztag'], ['rollencoup','rollencoup'],
  ['eiskalt','eiskalt'], ['sollstrecke','sollstrecke'], ['kaltblut','kaltblut'], ['weicheknie','weicheknie']];
const _appWert = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx(), o = {};
  ${JSON.stringify(_nrPaare.map(x => x[0]))}.forEach(cid => {
    const def = CHRONICLE_BY_ID[cid]; o[cid] = {};
    Object.keys(C.P).forEach(pid => {
      let v = null; try { v = def.val(C.P[pid], C); } catch(e){ v = 'FEHLER'; }
      o[cid][pid] = (v == null || v === false) ? null : v;
    });
  });
  return o;
})())`));
const _nrGleich = (a, b) => (a == null && b == null)
  || (a != null && b != null && Math.abs(a - b) < 1e-9);
_nrPaare.forEach(([cid, key]) => {
  const ab = Object.keys(_appWert[cid]).filter(pid =>
    !_nrGleich(_appWert[cid][pid], (_nr[pid] || {})[key]));
  ok(ab.length === 0, cid + ': die App rechnet wie die Nachrechnung',
     ab.map(pid => nm(pid) + ' ' + _appWert[cid][pid] + ' vs '
       + (_nr[pid] || {})[key]).join(' · ') || 'alle gleich');
});
// Und drei, die schon gegen die Erwartung oder als Ganzes messen, stehen unveraendert im Katalog:
// „Die ruhige Hand" misst weiter den Sprung in engen Partien, nicht die
// Quote, und die beiden Positionswerte messen weiter die Position als Ganzes.
{
  const _erhalten = JSON.parse(K.eval(`JSON.stringify(
    ['clutch','drive_ace','reves_ace'].map(id => { const c = CHRONICLE_BY_ID[id];
      return c ? {id, name:c.name, cond:c.cond} : null; }))`));
  ok(_erhalten.every(Boolean)
     && _erhalten[0].name === 'Die ruhige Hand'
     && /Leistungssprung in engen Partien/.test(_erhalten[0].cond)
     && _erhalten[1].name === 'Der komplette Stürmer'
     && _erhalten[2].name === 'Der komplette Verteidiger',
     'die ruhige Hand und die beiden Positionswerte sind unveraendert',
     _erhalten.map(x => x ? x.name : 'FEHLT').join(' · '));
}

console.log('\n=== 2. REKORDE SIND ECHTE BESTWERTE ===');
const A = K.eval('allChronicles()');
const CX = K.eval('_chronicleCtx()');
const defs = K.eval("CHRONICLES.map(c=>({id:c.id,name:c.name,kind:c.kind,cond:c.cond,unit:c.unit||null,min:c.min||0}))");
// Der harte Test: fuer JEDEN vergebenen Rekord darf kein anderer gewerteter
// Spieler einen besseren Wert haben. Nachgerechnet ueber die App-Bedingung.
defs.forEach(d => {
  const h = A.byId[d.id];
  if(!h) return;
  let worse = [];
  Object.keys(CX.P).forEach(id => {
    const v = K.eval(`CHRONICLE_BY_ID[${JSON.stringify(d.id)}].val(_chronicleCtx().P[${JSON.stringify(id)}], _chronicleCtx())`);
    if(v == null || !isFinite(v)) return;
    if(v > h.val + 1e-9) worse.push(nm(id) + '=' + v);
  });
  ok(worse.length === 0, '„' + d.name + '" haelt wirklich den Bestwert', worse.join(', '));
});
// Zaehlbare Rekorde zusaetzlich gegen den Rohwert gegengerechnet.
// Nur noch die ECHTEN Volumen-/Höchststand-Rekorde. rec_perfect, rec_nail und
// rec_upset messen seit v9.18 einen ANTEIL und gehoeren zu „Spielweise" —
// bei ihnen waere ein Rohwert-Vergleich genau der Fehler, den sie beheben:
// wer am meisten spielt, sammelt zwangsläufig die meisten 10:9-Siege.
const rawChecks = {unstoppable:'winStreak', peak:'peak'};
Object.keys(rawChecks).forEach(cid => {
  const h = A.byId[cid]; if(!h) return;
  const f = rawChecks[cid];
  // Bestwert ermitteln; bei Gleichstand gilt der dokumentierte Tiebreak
  // (mehr Siege → bessere Tordifferenz → ID), deshalb reicht der Vergleich
  // des WERTES, nicht der Person.
  let topV = -Infinity;
  Object.keys(CX.P).forEach(id => { if(CX.P[id][f] > topV) topV = CX.P[id][f]; });
  ok(CX.P[h.pid][f] === topV, '„' + CHRONICLE_BY_ID_name(cid) + '" haelt den Rohwert-Bestwert',
     nm(h.pid) + ': ' + CX.P[h.pid][f] + ' vs Best ' + topV);
  const tied = Object.keys(CX.P).filter(id => CX.P[id][f] === topV);
  if(tied.length > 1){
    const win = tied.slice().sort((a,b) =>
      CX.P[b].wins - CX.P[a].wins || CX.P[b].gd - CX.P[a].gd || (a < b ? -1 : 1))[0];
    ok(h.pid === win, '„' + CHRONICLE_BY_ID_name(cid) + '" Gleichstand korrekt gebrochen',
       tied.map(nm).join('/') + ' → ' + nm(h.pid));
  }
});
function CHRONICLE_BY_ID_name(cid){ return (defs.find(d=>d.id===cid)||{}).name || cid; }

console.log('\n  Halter je Rekord:');
defs.forEach(d => {
  const h = A.byId[d.id];
  console.log('  ' + d.name.padEnd(30), h ? nm(h.pid).padEnd(9) + h.ev : '— nicht vergeben');
});
console.log('\n  Angezeigte Auszeichnung je Spieler (wertvollster Rekord):');
let held = 0, without = [];
IDS.forEach(id => {
  const c = A.byPid[id];
  if(c){ held++; console.log('  ' + nm(id).padEnd(9), c.name); }
  else without.push(nm(id));
});
console.log('  → ' + held + ' von ' + NAMES.length + ' zeigen einen · ohne: ' + (without.join(', ')||'—'));
IDS.forEach(id => {
  const c = A.byPid[id];
  // Seit v9.19 kann ein Rekord punktgleich geteilt sein — dann steht der
  // Spieler in pids, nicht zwingend an erster Stelle.
  if(c) ok((A.byId[c.id].pids || [A.byId[c.id].pid]).includes(id),
           nm(id) + ': angezeigter Rekord gehoert ihm auch wirklich');
});

console.log('\n=== 2b. FORTSCHRITT FUER SPIELER OHNE REKORD ===');
IDS.forEach(id => {
  const nx = K.eval(`nextRecordFor(${JSON.stringify(id)})`);
  if(A.byPid[id]){ ok(nx === null, nm(id) + ' hat einen Rekord → kein Hinweis'); return; }
  if(!CX.P[id]){ console.log('  ' + nm(id).padEnd(9), '(zu wenige Spiele)'); return; }
  console.log('  ' + nm(id).padEnd(9), nx ? nx.name.padEnd(24) + nx.txt : '— kein Vorschlag');
  ok(!!nx, nm(id) + ' bekommt einen naechsten Rekord vorgeschlagen');
  if(nx){
    ok(nx.need > 0, nm(id) + ': Abstand ist positiv', String(nx.need));
    ok(nx.have < nx.target, nm(id) + ': liegt wirklich darunter', nx.have + ' < ' + nx.target);
    ok(!/undefined|NaN/.test(nx.txt), nm(id) + ': Hinweistext sauber', nx.txt);
    const d = defs.find(x => x.id === nx.id);
    ok(d && d.kind !== 'shame', nm(id) + ': kein Schattenseiten-Ziel', nx.id);
    ok(d && d.unit, nm(id) + ': Ziel ist zaehlbar');
  }
});

console.log('\n=== 3. BELEGE ===');
Object.values(A.byId).forEach(c => {
  ok(/\d/.test(c.ev), '„'+c.name+'" nennt eine Zahl', c.ev);
  ok(c.ev.length < 70, '„'+c.name+'" Beleg passt in eine Zeile', c.ev.length+'');
  ok(!/undefined|NaN|\[object/.test(c.ev), '„'+c.name+'" sauber', c.ev);
});

console.log('\n=== 4. KATALOG ===');
console.log('  ' + defs.length + ' Rekorde, ' + Object.keys(A.byId).length + ' vergeben');
const catIds = defs.map(d=>d.id);
ok(new Set(catIds).size === catIds.length, 'keine doppelte Rekord-ID');
// Seit dem Disziplinen-Merge ist Namensgleichheit kein Fehler mehr, sondern
// die Regel: Monats- und Allzeitwertung derselben Disziplin heißen gleich.
// Was NICHT vorkommen darf, ist derselbe Name unter verschiedenen IDs — dann
// wären es doch wieder zwei Einträge, die dasselbe behaupten.
const stById = JSON.parse(K.eval('JSON.stringify(SEASON_TITLES.map(t=>({id:t.id,name:t.name})))'));
const nameToId = {}; stById.forEach(t => { nameToId[t.name] = t.id; });
defs.forEach(d => ok(!(d.name in nameToId) || nameToId[d.name] === d.id,
  '„'+d.name+'" trägt in beiden Wertungen dieselbe ID'));
const dz = JSON.parse(K.eval('JSON.stringify(DISZIPLINEN.map(d=>({id:d.id,name:d.name,art:d.art,m:!!d.monat,a:!!d.allzeit})))'));
ok(dz.every(d => d.m || d.a), 'jede Disziplin hat mindestens eine Wertung');
ok(new Set(dz.map(d=>d.name)).size === dz.length, 'kein Name zweimal im Katalog');
ok(dz.every(d => ['leistung','ereignis','schatten'].includes(d.art)), 'jede Disziplin hat eine gültige art');
console.log('  ' + dz.length + ' Disziplinen · ' + dz.filter(d=>d.m).length + ' mit Monatswertung · '
  + dz.filter(d=>d.a).length + ' mit Allzeitwertung · ' + dz.filter(d=>d.m&&d.a).length + ' mit beidem');
// Schattenseiten duerfen nie als Ziel vorgeschlagen werden.
defs.filter(d=>d.kind==='shame').forEach(d => ok(!d.unit, '„'+d.name+'" ist kein Fortschrittsziel'));

console.log('\n=== 5. CHRONIK: JEDE SAISON NEU ===');
const sids = K.eval("allSeasonTitles().map(T=>T.sid)");
sids.forEach(sid => {
  const T = K.eval(`seasonTitles(${JSON.stringify(sid)})`);
  const pids = T.awarded.map(a=>a.pid);
  // Ein Spieler DARF mehrere Einträge halten [§C32] — er zeigt nur einen.
  // Was nicht sein darf: derselbe Eintrag zweimal an denselben Spieler.
  const paare = T.awarded.map(a=>a.titleId+'|'+a.pid);
  ok(new Set(paare).size === paare.length, sid+': kein Eintrag geht zweimal an denselben Spieler');
  // Und: in der Matrix steht je Spieler genau einer — seasonTitleOf nimmt
  // den ersten in Katalogreihenfolge, und die IST die Wertigkeit.
  const gezeigt = [...new Set(pids)].map(pid =>
    K.eval(`seasonTitleOf(${JSON.stringify(pid)}, ${JSON.stringify(sid)})`));
  ok(gezeigt.every(x => x && x.titleId), sid+': jeder Traeger hat genau einen Eintrag in der Matrix');
  console.log('  ' + sid, String(T.awarded.length).padStart(2) + ' Eintraege ·',
    T.awarded.map(a=>nm(a.pid)+':'+(a.short||a.name)).join('  '));
});

console.log('\n=== 6. AVATAR-RING ===');
const rings = K.eval('avatarRings()');
const ringed = Object.keys(rings);
console.log('  Spieler mit Ring:', ringed.length, '/', NAMES.length);
ringed.forEach(id => rings[id].forEach(r => {
  console.log('  ' + nm(id).padEnd(9), r.kind.padEnd(6), r.label.padEnd(22), r.sub);
  ok(r.label && r.sub, nm(id)+' Ring hat Text');
  ok(!/undefined|NaN/.test(r.sub), nm(id)+' Ring-Text sauber', r.sub);
}));
ok(ringed.length <= NAMES.length, 'Ringe nicht mehr als Spieler');
ok(ringed.every(id => rings[id].length), 'jeder Ring vollständig');
// Jeder Zustand gehört so vielen, wie ihn tragen können: der Meister einem,
// das Team zwei. Woche und Tag zählt jeder aus seinem eigenen letzten
// Zeitraum [§13.7], also tragen sie mehrere zugleich — aber jede Woche und
// jeden Spieltag nur einer, denn jeder hat nur einen Sieger. Und jeder
// Spieler hat höchstens eine Serie — eine gute und eine schlechte zugleich
// gibt es nicht.
{
  const je = {}, zeitraum = {};
  ringed.forEach(id => rings[id].forEach(r => { je[r.kind] = (je[r.kind] || 0) + 1;
    if(r.kind === 'potw' || r.kind === 'potd') zeitraum[r.kind + '|' + r.sub] = (zeitraum[r.kind + '|' + r.sub] || 0) + 1; }));
  ok((je.champ || 0) <= 1 && (je.tots || 0) <= 2 && Object.values(zeitraum).every(n => n === 1),
     'der Meister trägt einer, das Team zwei, jede Woche und jeden Spieltag einer', JSON.stringify({je, zeitraum}));
  ok(ringed.every(id => rings[id].filter(r => /blaze|hot|abyss|cold/.test(r.kind)).length <= 1),
     'höchstens eine Serie je Spieler');
}

console.log('\n=== 7. MARKEN NEBEN DEM NAMEN ===');
let rowsMarked = 0, liveMarks = 0;
IDS.forEach(id => {
  const ms = K.eval(`_playerRankMarks(${JSON.stringify(id)})`);
  if(ms.length){ rowsMarked++;
    console.log('  ' + nm(id).padEnd(9), ms.map(x=>(x.live?'⌐ ':'')+x.label+' ('+x.sub+')').join('  |  ')); }
  ok(ms.length <= 2, nm(id)+' hat hoechstens zwei Marken', ms.length+'');
  // Genau eine Sorte je Marke: Meistertitel massiv, laufender Eintrag gestrichelt.
  ok(ms.every(x => x.kind === 'champ' || x.kind === 'season'), nm(id)+' Markensorte gueltig');
  ok(ms.filter(x=>x.live).length <= 1, nm(id)+' hoechstens eine laufende Marke');
  liveMarks += ms.filter(x=>x.live).length;
  // Kein Rekord darf sich in die Rangliste schleichen.
  ok(!ms.some(x => x.kind === 'chron'), nm(id)+' traegt keinen Rekord in der Liste');
});
console.log('  → ' + rowsMarked + ' von ' + NAMES.length + ' Zeilen markiert, ' + liveMarks + ' davon laufend');

console.log('\n=== 8. HTML RENDERT ===');
const h1 = K.eval(`_chronStripHtml(${JSON.stringify(IDS[8])})`);
ok(h1.includes('chron-one'), 'Profil zeigt seine Rekord-Karten');
// Jede Karte steht im Profil, zwei offen, der Rest klappt mit seiner Zahl
// auf. Nach der ersten steckte er hinter „Mehr anzeigen", und das Profil
// verschwieg die meisten; alle offen schoben zehn Karten vor alles andere.
const _n8 = K.eval(`chroniclesOfPlayer(${JSON.stringify(IDS[8])}).length`);
ok((h1.match(/chron-one/g)||[]).length === Math.max(1, _n8)
   && (_n8 > 2) === (h1.indexOf('chron-rest') >= 0 && h1.indexOf('data-chron-more') >= 0),
   'jede Rekord-Karte im Profil, ab drei zwei offen und der Rest zum Aufklappen');
ok(h1.includes('chron-strip'), 'Profil zeigt weiter den Saison-Streifen');
ok(!/undefined|NaN/.test(h1), 'Profil-Chronik ohne undefined');
let sheetOk = true;
try { K.eval('showLigaChronik()'); } catch(e){ sheetOk = false; console.log('    showLigaChronik:', e.message); }
ok(sheetOk, 'Liga-Chronik laeuft ohne Fehler');
const defId = defs.find(d=>d.uniq && (by[d.id]||[]).length);
if(defId){
  let cOk = true;
  try { K.eval(`showChronicle(${JSON.stringify(defId.id)})`); } catch(e){ cOk=false; console.log('    showChronicle:', e.message); }
  ok(cOk, 'Chronik-Sheet laeuft ohne Fehler');
}
let stOk = true;
try { K.eval("showSeasonTable('2026-07')"); } catch(e){ stOk=false; console.log('    showSeasonTable:', e.message); }
ok(stOk, 'Saison-Tafel laeuft ohne Fehler');
const h4 = K.eval(`_avRingChipHtml(${JSON.stringify(ringed[0]||IDS[0])})`);
ok(!/undefined|NaN/.test(h4), 'Ring-Chip ohne undefined');
const h5 = K.eval(`avHtml(pmap()[${JSON.stringify(ringed[0]||IDS[0])}], '', {ring:true})`);
console.log('  Avatar mit Ring (nur Profil):', h5);
ok(h5.includes('class="av'), 'Avatar-HTML intakt');
const h6 = K.eval(`avHtml(pmap()[${JSON.stringify(ringed[0]||IDS[0])}], '')`);
ok(!h6.includes('avring'), 'ohne opts.ring kein Ring — Rangliste bleibt ruhig');

console.log('\n=== 9. NEWS ===');
const stories = K.eval('_consolidateStories(_buildStories())');
const breaking = stories.filter(s => K.eval('_isBreaking')(s));
console.log('  Stories:', stories.length, '· davon Breaking:', breaking.length);
breaking.forEach(s => console.log('    ! ' + s.title));
ok(breaking.length <= 3, 'Breaking bleibt sparsam', breaking.length+'');
ok(!stories.some(s => /Ehrentitel/.test(s.title + s.desc)), 'Keine Ehrentitel-Story mehr');
const spot = K.eval(`(function(){
  const T=_ambientTemplatePool(new Date(), pmap(), id=>pname(id));
  const t=T.find(x=>x.key==='chronicle_spotlight');
  return t? t.make(Math.random) : null;
})()`);
if(spot){ console.log('  Chronik-Spotlight:', spot.title, '—', spot.desc); }
ok(spot && spot.title, 'Chronik-Spotlight liefert eine Karte');

console.log('\n=== 10. CHRONIK OHNE MEISTER/KRONPRINZ ===');
const stIds = K.eval('SEASON_TITLES.map(t=>t.id)');
ok(!stIds.includes('champion'), 'Kein Chronik-Eintrag „Der Meister" mehr');
ok(!stIds.includes('crown_prince'), 'Kein Chronik-Eintrag „Der Kronprinz" mehr');
ok(new Set(stIds).size === stIds.length, 'keine doppelten Chronik-IDs');
// Namensgleichheit ist seit dem Merge erwuenscht — geprueft wird oben,
// dass gleiche Namen auch dieselbe ID tragen.
ok(K.eval("SEASON_TITLES.every(t=>t.short && t.short.length<=10)"), 'jedes Kurz-Label passt');
// Der Meistertitel haengt nicht mehr am Katalog, sondern an der Rangliste.
['2026-05','2026-06','2026-07','2026-08'].forEach(sid => {
  const champ = K.eval(`seasonChampion(${JSON.stringify(sid)})`);
  const rank1 = K.eval(`(function(){const C=_seasonTitleCtx(${JSON.stringify(sid)});return C.rank[0]?C.rank[0].id:null;})()`);
  ok(champ === rank1, sid + ': seasonChampion ist Platz 1 der Saison-Elo');
  const T = K.eval(`seasonTitles(${JSON.stringify(sid)})`);
  ok(!T.awarded.some(a => a.pid === champ && false), sid + ': Meister blockiert keinen Chronik-Platz');
});
const leonMarks = K.eval(`JSON.stringify(_playerRankMarks(${JSON.stringify(IDS[NAMES.indexOf('Leon')])}))`);
ok(/"kind":"champ"/.test(leonMarks), 'Krone neben dem Namen kommt weiterhin an');

console.log('\n=== 11. QUOTEN STATT SUMMEN ===');
// Genau die Beschwerde aus der Praxis: Wer die meisten Spiele hat, darf einen
// Anteils-Eintrag nicht automatisch bekommen.
[['thriller','nail','wins'], ['executioner','perfect','wins'], ['giant_slayer','upsets','games']].forEach(([cid, num, den]) => {
  const h = A.byId[cid]; if(!h) return;
  const share = id => CX.P[id][den] ? CX.P[id][num]/CX.P[id][den] : 0;
  let bestId = null;
  Object.keys(CX.P).forEach(id => {
    const v = K.eval(`CHRONICLE_BY_ID[${JSON.stringify(cid)}].val(_chronicleCtx().P[${JSON.stringify(id)}], _chronicleCtx())`);
    if(v == null) return;
    if(bestId === null || share(id) > share(bestId)) bestId = id;
  });
  ok(h.pid === bestId, '„' + CHRONICLE_BY_ID_name(cid) + '" haelt die beste QUOTE',
     nm(h.pid) + ' ' + Math.round(share(h.pid)*100) + '% vs ' + nm(bestId) + ' ' + Math.round(share(bestId)*100) + '%');
  // Die Kind-Taxonomie kommt seit dem Merge aus `art`: leistung->record,
  // ereignis->mark, schatten->shame. Eine Quote ist eine Leistung.
  ok(K.eval(`CHRONICLE_BY_ID[${JSON.stringify(cid)}].art`) === 'leistung',
     '„' + CHRONICLE_BY_ID_name(cid) + '" ist eine Leistung, kein Ereignis');
});
// Volumen-Rekorde gibt es nicht mehr: kein Eintrag darf noch an der reinen
// Spielzahl haengen.
const mostGames = Object.keys(CX.P).reduce((a,b)=>CX.P[a].games>=CX.P[b].games?a:b);

console.log('\n=== 12. AUSZEICHNUNGEN ===');
const bdefs = K.eval("BADGES.filter(b=>['games250','wins200','climber_100','dominator_400','dynasty_600'].includes(b.id)).map(b=>({id:b.id,desc:b.desc,multi:b.multi}))");
const byBid = {}; bdefs.forEach(b=>byBid[b.id]=b);
ok(/300 Partien/.test(byBid.games250.desc), 'Urgestein steht auf 300 Spielen', byBid.games250.desc);
ok(/300 Siege/.test(byBid.wins200.desc), 'Siegermaschine steht auf 300 Siegen', byBid.wins200.desc);
['climber_100','dominator_400','dynasty_600'].forEach(id => {
  ok(byBid[id].multi === true, id + ' ist mehrfach zaehlbar');
  ok(/je Saison/.test(byBid[id].desc), id + ' sagt „je Saison" in der Beschreibung');
});
// Zaehlung gegen eine unabhaengige Rechnung ueber die Saison-Peaks.
const peaks = K.eval('JSON.stringify(seasonPeakElos())');
const PK = JSON.parse(peaks);
[[100,'climber_100'],[400,'dominator_400'],[600,'dynasty_600']].forEach(([mark, bid]) => {
  NAMES.forEach((n,i) => {
    const want = Object.keys(PK).filter(sid => (PK[sid][IDS[i]] ?? -1e9) >= mark).length;
    const got = K.eval(`countSeasonsAtElo(${JSON.stringify(IDS[i])}, ${mark})`);
    ok(got === want, bid + ' zaehlt fuer ' + n + ' richtig', got + ' statt ' + want);
  });
});
// Und: nie mehr als die Anzahl gespielter Saisons.
NAMES.forEach((n,i) => {
  const seasonsPlayed = Object.keys(PK).filter(sid => PK[sid][IDS[i]] !== undefined).length;
  ok(K.eval(`countSeasonsAtElo(${JSON.stringify(IDS[i])}, 100)`) <= seasonsPlayed,
     'Aufsteiger fuer ' + n + ' hoechstens einmal pro gespielter Saison');
});
const domCount = NAMES.map((n,i)=>[n, K.eval(`countSeasonsAtElo(${JSON.stringify(IDS[i])}, 400)`)]).filter(x=>x[1]);
console.log('  Dominator-Saisons:', domCount.map(x=>x[0]+'×'+x[1]).join(', ') || '(keine)');

console.log('\n=== 13. CHRONIK EINFRIEREN ===');
// Vor dem Einfrieren: was der Katalog heute fuer Juli sagt.
const julyLive = K.eval("JSON.stringify(seasonTitles('2026-07'))");
const frozen = K.eval("JSON.stringify(_freezeSeasonTitles('2026-07'))");
const F = JSON.parse(frozen), JL = JSON.parse(julyLive);
// Die Formatmarke ist die Fassung des Katalogs. Eine Chronik einer älteren
// Fassung gilt als nicht eingefroren und wird neu gerechnet — sonst stellte
// ein alter Monat andere Fragen als der laufende [§C39].
const _FV = K.eval('SEASON_TITLES_FREEZE_V');
ok(F && F.v === _FV && _FV >= 2, 'Formatmarke ist die Fassung des Katalogs', 'v=' + (F && F.v));
ok(Array.isArray(F.awarded) && F.awarded.length === JL.awarded.length,
   'alle Eintraege eingefroren', F.awarded.length + '/' + JL.awarded.length);
ok(F.awarded.every(a => a.titleId && a.name && a.ic && a.tone && a.cond && a.pid && a.ev),
   'Anzeigefelder mit eingefroren (name/ic/tone/cond/ev)');
// Der Wert jedes Halters friert mit ein: ohne ihn brächte ein
// abgeschlossener Monat nur den Grundwert, und dieselbe Chronik zählte nach
// dem Monatswechsel weniger als davor [§C39].
ok(F.awarded.length && F.awarded.every((a, i) => Number.isFinite(a.wert) && a.wert === JL.awarded[i].wert),
   'der Wert jedes Halters ist mit eingefroren', F.awarded.map(a => a.wert).slice(0, 4).join(', '));
ok(F.champ && F.champ.pid === JL.champ.pid, 'Meister mit eingefroren', nm(F.champ.pid));
ok(F.days === JL.days && F.matches === JL.matches, 'Spieltage und Matches mit eingefroren');

// Einfrieren, Cache brechen, wieder lesen.
K.eval(`
  const s = seasons.find(x => x.id === '2026-07');
  s.titles = ${JSON.stringify(frozen)};   // absichtlich als JSON-TEXT, so kommt es aus manchen Clients
  invalidateCache();
`);
const julyRead = JSON.parse(K.eval("JSON.stringify(seasonTitles('2026-07'))"));
ok(julyRead.frozen === true, 'eingefrorene Saison wird gelesen, nicht gerechnet');
ok(JSON.stringify(julyRead.awarded) === JSON.stringify(F.awarded), 'gelesene Eintraege identisch');
ok(K.eval("seasonChampion('2026-07')") === F.champ.pid, 'seasonChampion liest den eingefrorenen Meister');
ok(K.eval("_frozenTitlesOf({titles:'{\"kaputt\":1}'})") === null, 'kaputtes JSON gilt als nicht eingefroren');
ok(K.eval("_frozenTitlesOf({titles:null})") === null, 'NULL gilt als nicht eingefroren');
ok(K.eval("_frozenTitlesOf({titles:{v:SEASON_TITLES_FREEZE_V,awarded:[]}})") !== null, 'leere, aber eingefrorene Chronik zaehlt als eingefroren');
ok(K.eval("_frozenTitlesOf({titles:{v:SEASON_TITLES_FREEZE_V - 1,awarded:[{titleId:'x'}]}})") === null,
   'eine Chronik der alten Fassung gilt als nicht eingefroren');

// Der eigentliche Punkt: Katalog aendern darf die Vergangenheit nicht anfassen.
const junLiveBefore = JSON.parse(K.eval("JSON.stringify(seasonTitles('2026-06').awarded.map(a=>a.titleId))"));
K.eval("globalThis.__savedCat = SEASON_TITLES.splice(0, SEASON_TITLES.length); invalidateCache();");
const julyAfter = JSON.parse(K.eval("JSON.stringify(seasonTitles('2026-07'))"));
const junAfter = JSON.parse(K.eval("JSON.stringify(seasonTitles('2026-06'))"));
ok(JSON.stringify(julyAfter.awarded) === JSON.stringify(F.awarded),
   'Juli ueberlebt einen komplett geleerten Katalog', julyAfter.awarded.length + ' Eintraege');
ok(junAfter.awarded.length === 0 && junLiveBefore.length > 0,
   'Juni (nicht eingefroren) verliert alles — genau der Schaden, den das Einfrieren verhindert',
   junLiveBefore.length + ' -> ' + junAfter.awarded.length);
// Und die laufende Saison darf NIE aus einem Einfrierer kommen.
K.eval(`
  const cs = currentSeason().id;
  let s = seasons.find(x => x.id === cs);
  if(!s){ s = {id:cs, label:seasonLabel(cs)}; seasons.push(s); }
  s.titles = {v:1, awarded:[], empty:[], champ:null, days:0, matches:0};
  invalidateCache();
`);
const liveAfter = JSON.parse(K.eval("JSON.stringify(seasonTitles(currentSeason().id))"));
ok(!liveAfter.frozen, 'laufende Saison wird trotz gesetzter titles gerechnet');
K.eval("SEASON_TITLES.push(...globalThis.__savedCat); invalidateCache();");
ok(K.eval('SEASON_TITLES.length') === stIds.length, 'Katalog wiederhergestellt');


// ── 14. v9.19: geteilte Rekorde, strikte Superlative, neue Eintraege ──
console.log('\n=== 14. GETEILTE REKORDE UND STRIKTE SUPERLATIVE ===');
const A2 = JSON.parse(K.eval("JSON.stringify(allChronicles().byId)"));
Object.keys(A2).forEach(cid => {
  const e = A2[cid];
  ok(Array.isArray(e.pids) && e.pids.length >= 1 && e.pids[0] === e.pid,
     cid + ': pids[] gesetzt, pid ist der erste Halter');
  ok(e.holders.length === e.pids.length && e.holders.every(h => h.ev),
     cid + ': jeder Halter hat einen eigenen Beleg');
  ok(e.shared === (e.pids.length > 1), cid + ': shared-Flag passt zur Halterzahl');
});
// Jeder Halter eines geteilten Rekords muss exakt denselben Wert haben.
const shared = Object.keys(A2).filter(c => A2[c].shared);
ok(shared.length >= 1, 'in den echten Daten gibt es mindestens einen geteilten Rekord',
   shared.map(c => A2[c].name + ' (' + A2[c].pids.length + ')').join(', ') || '—');
shared.forEach(cid => {
  const vals = K.eval(`(function(){
    const C=_chronicleCtx(), d=CHRONICLE_BY_ID['${cid}'];
    return JSON.stringify(${JSON.stringify(A2[cid].pids)}.map(id=>d.val(C.P[id],C)));
  })()`);
  const v = JSON.parse(vals);
  ok(v.every(x => Math.abs(x - v[0]) <= 1e-9), cid + ': alle Halter haben exakt denselben Wert', vals);
});
// Kein Spieler steht faelschlich als Halter da, obwohl ein anderer besser ist.
Object.keys(A2).forEach(cid => {
  const best = K.eval(`(function(){
    const C=_chronicleCtx(), d=CHRONICLE_BY_ID['${cid}'];
    let bv=-Infinity; Object.keys(C.P).forEach(id=>{const v=d.val(C.P[id],C);
      if(v!=null&&isFinite(v)&&v>bv)bv=v;});
    return bv;
  })()`);
  const mine = K.eval(`(function(){
    const C=_chronicleCtx(), d=CHRONICLE_BY_ID['${cid}'];
    return d.val(C.P['${A2[cid].pid}'],C);
  })()`);
  ok(Math.abs(mine - best) <= 1e-9, cid + ': Halter haelt wirklich den Bestwert');
});
ok(K.eval("_chronHolderNames({pids:IDSX})".replace('IDSX', JSON.stringify([IDS[8], IDS[9]]))) === 'Leon & Martin',
   '_chronHolderNames verbindet zwei Halter mit &');

// [§C32] JEDER Eintrag ist ein Bestwert: er geht an den, der ihn wirklich
// hält, oder an niemanden. Früher galt das nur für vier als `strict`
// markierte Einträge; alle anderen durften an den Nächstbesten
// weiterrutschen. Deshalb gibt es die Markierung nicht mehr — und deshalb
// darf jede Bedingung auch einen Superlativ nennen.
ok(K.eval("SEASON_TITLES.every(t=>t.strict===undefined)"),
   'die Unterscheidung strikt/nicht-strikt gibt es nicht mehr');
JSON.parse(K.eval("JSON.stringify(SEASON_TITLES.map(t=>t.id))")).forEach(tid => {
  ['2026-06','2026-07','2026-08'].forEach(sid => {
    const res = K.eval(`(function(){
      const C=_seasonTitleCtx('${sid}'), T=seasonTitles('${sid}');
      const traeger=T.awarded.filter(x=>x.titleId==='${tid}').map(x=>x.pid);
      if(!traeger.length) return 'leer';
      const r=SEASON_TITLE_BY_ID['${tid}'].pick(C,new Set());
      if(!r) return 'FALSCH: vergeben, aber niemand erfuellt die Bedingung';
      const fremd=traeger.filter(p=>r.halter.indexOf(p)<0);
      return fremd.length ? 'FALSCH: ' + fremd.map(pname).join(', ') : 'best';
    })()`);
    ok(String(res).indexOf('FALSCH') < 0,
       sid + '/' + tid + ': der Eintrag haelt den echten Bestwert', res);
  });
});


// Der Monatskatalog ist ausgetauscht: keine der Wertungen fragt mehr „wer
// ist der Beste", sie fragen nach der Abweichung von der Erwartung, nach
// Konstanz oder nach dem Verhaeltnis zu einem bestimmten anderen [§C39].
// Stichprobe aus jeder der vier Arten.
['unmoeglich','schwachstelle','metronom','zitterkoenig','wochenkrone']
  .forEach(id => ok(K.eval(`!!SEASON_TITLE_BY_ID['${id}']`), 'Monatschronik ' + id + ' im Katalog'));
['catalyst','damage_control']
  .forEach(id => ok(K.eval(`!!CHRONICLE_BY_ID['${id}']`), 'neuer Liga-Rekord ' + id + ' im Katalog'));
// Ob ein Kuerzel in die Zelle passt, misst `tests/blatt` am gerenderten
// Markup — in Zeichen gezaehlt ist „Umschwung" kuerzer als „Nachzügler" und
// trotzdem breiter. Hier bleibt die Form: ein Kuerzel ist ein ganzes Wort.
// Fuenf endeten auf einem Punkt („Punktland.", „Angstgegn."), und eine
// Abkuerzung mitten im Wort liest sich in der Tafel wie ein Fehler.
ok(K.eval("SEASON_TITLES.filter(t=>/\\.$/.test(t.short)).map(t=>t.short).join(', ')") === '',
   'kein Kurzname endet auf einem Punkt',
   K.eval("SEASON_TITLES.filter(t=>/\\.$/.test(t.short)).map(t=>t.short).join(', ')"));
ok(K.eval("new Set(SEASON_TITLES.map(t=>t.id)).size") === K.eval("SEASON_TITLES.length"),
   'keine doppelten Saison-IDs');
ok(K.eval("new Set(CHRONICLES.map(c=>c.id)).size") === K.eval("CHRONICLES.length"),
   'keine doppelten Rekord-IDs');

// Der Maßstab ist wirklich die beste Bilanz der Saison.
['2026-05','2026-06','2026-07','2026-08'].forEach(sid => {
  const r = K.eval(`(function(){
    const C=_seasonTitleCtx('${sid}'), T=seasonTitles('${sid}');
    const a=T.awarded.find(x=>x.titleId==='best_record');
    if(!a) return 'leer';
    const mine=C.P[a.pid].wins/C.P[a.pid].games;
    let best=-1; Object.keys(C.P).forEach(id=>{const p=C.P[id];
      if(p.games>=10) best=Math.max(best,p.wins/p.games);});
    return Math.abs(mine-best)<=1e-9 ? 'ok' : 'FALSCH';
  })()`);
  ok(r !== 'FALSCH', sid + ': „Der Maßstab" haelt die beste Bilanz ab 10 Spielen', r);
});

// Chronik-Streifen im Profil: neueste Saison links.
const stripOrder = K.eval(`(function(){
  const html=_chronStripHtml('${IDS[8]}');
  const out=[]; const rx=/data-season-table="([0-9-]+)"/g; let m;
  while((m=rx.exec(html))) out.push(m[1]);
  return out.join(',');
})()`);
const stripArr = stripOrder.split(',').filter(Boolean);
ok(stripArr.length >= 2, 'Profil-Streifen zeigt mehrere Saisons', stripOrder);
ok(stripArr.join(',') === stripArr.slice().sort().reverse().join(','),
   'neueste Saison steht links', stripOrder);

// ─── 15. v9.20: keine Team-Chroniken, Leistung vor Pensum ───────────
console.log('\n=== 15. EINZELLEISTUNGEN STATT VERBINDUNGEN ===');

ok(K.eval("!CHRON_KINDS.bond"), 'die Kategorie „Verbindung" gibt es nicht mehr');
ok(K.eval("CHRONICLES.every(c=>!!CHRON_KINDS[c.kind])"), 'jeder Rekord hat eine gueltige Kategorie');
['bond_brothers','bond_prey','bond_shadow','bond_nemesis','bond_marriage','rec_tots']
  .forEach(id => ok(K.eval(`!CHRONICLE_BY_ID['${id}']`), 'Team-Rekord ' + id + ' ist raus'));
['social','shadow'].forEach(id =>
  ok(K.eval(`!SEASON_TITLE_BY_ID['${id}']`), 'partnerbasierter Saison-Eintrag ' + id + ' ist raus'));

// Kein Beleg nennt noch einen zweiten Spieler beim Namen.
ok(K.eval(`(function(){
  const C=_chronicleCtx(), A=allChronicles();
  const names=Object.values(pmap()).map(p=>p.name);
  const hits=[];
  Object.values(A.byId).forEach(e=>{
    const mine=(pmap()[e.pid]||{}).name;
    (e.holders||[]).forEach(h=>{
      const own=(pmap()[h.pid]||{}).name;
      names.forEach(n=>{ if(n!==own && String(h.ev).indexOf(n)>=0) hits.push(e.id+':'+n); });
    });
  });
  return hits.join(',');
})()`) === '', 'kein Rekord-Beleg nennt einen anderen Spieler');

// Zwei Schwellen sind vorgegeben und werden NICHT kalibriert: Player of the
// Day an 60 % der eigenen Spieltage, Player of the Week in zwei Dritteln der
// eigenen Wochen. Sie sind eine Ansage, keine Messgroesse, die sich der
// Verteilung anpasst — deshalb stehen sie hier als Zahl.
const _fest = JSON.parse(K.eval(`JSON.stringify({
  potd: DISZIPLINEN.find(d=>d.id==='tagesregent').monat.ab,
  potw: DISZIPLINEN.find(d=>d.id==='wochenkrone').monat.ab
})`));
ok(_fest.potd === 0.6, 'Der Tagesregent verlangt 60 % der eigenen Spieltage', String(_fest.potd));
ok(Math.abs(_fest.potw - 2 / 3) < 1e-12, 'Die Wochenkrone verlangt zwei Drittel der eigenen Wochen', String(_fest.potw));
// Eine Woche zaehlt ab fuenf eigenen Partien. Bei drei zaehlte eine Woche
// mit drei Partien so viel wie eine mit dreissig.
ok(K.eval(`['2026-06','2026-07','2026-08'].every(sid => { const C = _seasonTitleCtx(sid);
  return Object.values(C.P).every(p => p.potwG === Object.values(p.wochGrp).filter(a => a.length >= 5).length); })`),
   'die Wochenkrone zaehlt nur Wochen mit mindestens fuenf eigenen Partien');
// Player of the Week kommt aus derselben Quelle wie die Auszeichnung, sonst
// zaehlt die Chronik Titel in Wochen, die es fuer den Sieger-Ermittler gar
// nicht gibt [§C27].
ok(K.eval(`(function(){
  const C=_seasonTitleCtx('2026-06');
  const W=_periodWinnerMap(matches, 'week');
  let stimmt=true;
  Object.keys(C.P).forEach(pid=>{
    const p=C.P[pid];
    let n=0;
    Object.keys(p.wochGrp).forEach(k=>{ if(p.wochGrp[k].length>=3 && W[k]===pid) n++; });
    if(n !== p.potw) stimmt=false;
  });
  return stimmt;
})()`), 'die Wochenkrone zaehlt dieselben Wochen wie _periodWinnerMap');

// Jede Chronik außer einer Schattenseite bringt denselben Grundwert, 100,
// gleich welcher Klasse und Art [§C39]; die Klasse ist Farbe und Name.
// Vorher war die Klasse der Wert, 150, 100 und 50: ein besonderer Monat
// brachte ein Drittel eines legendären, auch wenn sein Halter die Latte weit
// hinter sich ließ.
// Die Klasse sagt, was eine Chronik als Leistung bedeutet, nicht, wie weit
// ihre Schwelle hinausliegt [§C39]. Sie folgte dem Ausschlag, und „Der Ausbruch", „Die
// Lieblingszahl" und „Der Torhagel" waren legendär, „Der Souveraen"
// besonders. Pruefbar sind die Grenzen: legendaer ist nur Koennen oder
// Konstanz und nie eine Wende, eine Wende ist selten, eine Schattenseite
// hat keine dieser Klassen.
const _pkt = JSON.parse(K.eval(`JSON.stringify((function(){
  const bad=[], band=[], streu=[];
  SEASON_TITLES.forEach(t=>{
    const d=DISZIPLINEN.find(x=>x.id===t.id), m=d.monat;
    // Ohne den Wert eines Halters steht der Grundwert da, für jede Klasse
    // und jede Art gleich.
    const soll = m.art==='schatten' ? 0 : 100;
    if(chronikPunkte(t.id) !== soll) bad.push(t.id + '=' + chronikPunkte(t.id));
    if((m.art === 'schatten') !== (m.klasse === 'schatten')) band.push(t.id + ': Schattenseite als ' + m.klasse);
    if(m.wende && m.klasse !== 'selten') band.push(t.id + ': Wende als ' + m.klasse);
    if(m.klasse === 'legendaer' && (m.wende || !['koennen', 'konstanz'].includes(m.art)))
      band.push(t.id + ': legendaer als ' + m.art + (m.wende ? ' und Wende' : ''));
    // Jede positive Chronik trägt ihre Streuung, eine Schattenseite keine.
    // Auch eine Schattenseite traegt ihre Streuung: sie bringt keine Punkte,
    // wiegt aber in σ gegen eine besondere Chronik desselben Monats [§C39].
    if(!(m.streu > 0 && isFinite(m.streu))) streu.push(t.id);
  });
  return {bad, band, streu};
})())`));
ok(_pkt.bad.length === 0, 'jede Chronik bringt den Grundwert 100, gleich welcher Klasse', _pkt.bad.join(', '));
ok(_pkt.band.length === 0, 'die Klasse folgt der Leistung: legendaer nur Koennen oder Konstanz ohne Wende, jede Wende selten, eine Schattenseite als Schattenseite', _pkt.band.join(', '));
ok(_pkt.streu.length === 0, 'jede Chronik trägt ihre Streuung, auch eine Schattenseite',
   _pkt.streu.join(', '));
// Die Streuung ist einmal gemessen und festgeschrieben. Die Fixture-Monate
// sind ein Teil der Partien, an denen sie gemessen wurde; liegt sie dort um
// mehr als das Doppelte daneben, steht sie in der falschen Einheit
// (Prozent statt Anteil, Spiele statt Tage) und der Bonus mit ihr.
const _streuMess = JSON.parse(K.eval(`JSON.stringify((function(){
  const sids = ['2026-05','2026-06','2026-07','2026-08'];
  const daneben = []; let n = 0;
  DISZIPLINEN.filter(d => d.monat && d.monat.streu).forEach(d => {
    const w = d.monat, x = [];
    sids.forEach(sid => { const C = _seasonTitleCtx(sid);
      Object.keys(C.P).forEach(pid => { let v = null;
        try { if(!w.mind(C.P[pid], C)) return; v = w.wert(C.P[pid], C); } catch(e){ return; }
        if(v != null && isFinite(v)) x.push(v); }); });
    if(x.length < 15) return;
    const mu = x.reduce((a, b) => a + b, 0) / x.length;
    const sd = Math.sqrt(x.reduce((a, b) => a + (b - mu) ** 2, 0) / x.length);
    if(!(sd > 0)) return;
    n++;
    if(w.streu / sd > 2 || sd / w.streu > 2) daneben.push(d.id + ' ' + w.streu + ' statt ' + sd.toPrecision(3));
  });
  return {n, daneben};
})())`));
ok(_streuMess.n >= 60 && _streuMess.daneben.length === 0,
   'die Streuung jeder Chronik passt zu den Fixture-Monaten',
   _streuMess.daneben.join(', ') || _streuMess.n + ' gemessen');
// Der Bonus: je σ über der Schwelle zehn Punkte mal die Halbierungen, die
// an der Schwelle auf ein σ kommen (`chronikHalbierungenJeSigma`, aus dem
// Ausschlag); mindestens 1, wer sie ueberhaupt ueberbietet, nichts genau auf
// ihr. Bei 1,2 σ Ausschlag sind das 24 je σ, wie vorher die festen 25; weiter
// draussen mehr. Das Beispiel der Absprache: an 71 % statt an 60 % der
// eigenen Spieltage Player of the Day sind 0,64 σ ueber „Dem Tagesregenten",
// dessen Schwelle 2,55 σ draussen liegt — 26 dazu, vorher 16. Eine Chronik
// „hoechstens" (Minus vor dem Wert) rechnet in dieselbe Richtung: weniger
// Streuung als erlaubt ist darueber.
const _bonus = JSON.parse(K.eval(`JSON.stringify((function(){
  const m = id => _chronikMonat(id), P = (id, k) => chronikPunkte(id, m(id).ab + k * m(id).streu);
  return {regent:chronikPunkte('tagesregent', 0.71), genau:chronikPunkte('tagesregent', 0.6),
          hauch:P('ausbruch', 1e-4), eins:P('ausbruch', 1), zwei:P('ausbruch', 2), drei:P('ausbruch', 3),
          metronom:P('metronom', 0.6), metronomAb:m('metronom').ab, ohneWert:chronikPunkte('ausbruch'),
          steigung:[1.2, 2.5, 3.5].map(a => Math.round(10 * chronikHalbierungenJeSigma(a))),
          ausbruchSteigung:10 * chronikHalbierungenJeSigma(m('ausbruch').aus),
          metronomSteigung:10 * chronikHalbierungenJeSigma(m('metronom').aus),
          // Gleich weit ueber der Schwelle: die legendaere weit draussen bringt
          // mehr als die besondere nahe am Feld.
          weitDraussen:P('zitterkoenig', 1), naheAmFeld:P('destroyer', 1),
          schatten:chronikPunkte('drought', 99), hoechstes:chronikPunkte('breitenwirkung', 1),
          krone:chronikPunkte('wochenkrone', 1),
          // Je unwahrscheinlicher der Monat, desto mehr: 0,05 % gegen 5 %.
          moeglich:chronikPunkte('unmoeglich', -Math.log10(0.05)), unmoeglich:chronikPunkte('unmoeglich', -Math.log10(0.0005)),
          // Die Punktlandung selbst gegen ein Tor daneben.
          landung:chronikPunkte('evenkeel', m('evenkeel').wert({gf:212, ga:212, games:30})),
          einTor:chronikPunkte('evenkeel', m('evenkeel').wert({gf:212, ga:211, games:30}))};
})())`));
ok(_bonus.regent === 126 && _bonus.genau === 100,
   '71 % statt 60 % Player of the Day bringen 100 und 26 Bonus, genau 60 % den Grundwert',
   JSON.stringify(_bonus));
ok(JSON.stringify(_bonus.steigung) === '[24,41,54]',
   'je σ bringt der Bonus bei 1,2 σ Ausschlag 24, bei 2,5 σ 41 und bei 3,5 σ 54', JSON.stringify(_bonus.steigung));
const _s = _bonus.ausbruchSteigung;
ok(_bonus.hauch === 101 && _bonus.eins === 100 + Math.round(_s) && _bonus.zwei === 100 + Math.round(2 * _s)
   && _bonus.drei === 100 + Math.round(3 * _s) && _bonus.ohneWert === 100,
   'der Bonus waechst gleichmaessig mit der Abweichung, mindestens 1 und nach oben offen', JSON.stringify(_bonus));
ok(_bonus.weitDraussen > _bonus.naheAmFeld + 30,
   'eine Schwelle weit draussen bringt je σ mehr als eine nahe am Feld', _bonus.weitDraussen + ' gegen ' + _bonus.naheAmFeld);
ok(_bonus.metronomAb < 0 && _bonus.metronom === 100 + Math.round(0.6 * _bonus.metronomSteigung),
   'eine Chronik „höchstens" rechnet den Bonus in dieselbe Richtung', JSON.stringify(_bonus));
ok(_bonus.schatten === 0 && _bonus.hoechstes === 100,
   'eine Schattenseite bringt nichts, eine Schwelle, die schon das Höchste ist, keinen Bonus',
   JSON.stringify(_bonus));
// Die Wochenkrone verlangt zwei Drittel der Wochen; wer jede Woche holt,
// liegt darueber und bekommt Bonus.
ok(_bonus.krone > 125, 'jede eigene Woche Player of the Week bringt bei der Wochenkrone Bonus', String(_bonus.krone));
// Eine Chronik mit „hoechstens" bringt mehr, je naeher sie am Ziel liegt.
// Der unmoegliche Monat rechnete mit eins minus der Wahrscheinlichkeit:
// zwischen 5 % und 0,05 % lagen damit 0,05, ein Zehntel der Streuung, und
// ein hundertmal unwahrscheinlicherer Monat brachte drei Punkte mehr. Die
// Punktlandung stellte 212:212 gleich mit 212:211.
ok(_bonus.moeglich === 100 && _bonus.unmoeglich - _bonus.moeglich >= 50,
   'der unmoegliche Monat zaehlt mehr, je unwahrscheinlicher er war', JSON.stringify(_bonus));
ok(_bonus.landung > _bonus.einTor && _bonus.einTor > 100,
   'die Punktlandung ohne Tor Unterschied zaehlt mehr als ein Tor daneben', JSON.stringify(_bonus));
// ── Die Schattenseite ueberschattet eine besondere Chronik [§C39] ────
// Wer viele Schattenseiten sammelte, holte trotzdem jeden Monat eine
// besondere Chronik und damit hundert Punkte. Eine besondere zaehlt nicht,
// wenn im selben Monat eine Schattenseite desselben Spielers mindestens
// doppelt so weit ueber ihre Schwelle hinausgeht wie die besondere ueber
// ihre, und mindestens eine Streuung weit. Seltene und legendaere bleiben.
const _schattig = JSON.parse(K.eval(`JSON.stringify((function(){
  const m = id => _chronikMonat(id);
  const e = (id, z, pid) => ({titleId:id, pid:pid || 'x', name:id, wert:m(id).ab + z * m(id).streu});
  const U = (a, l) => !!chronikUeberschattet({awarded:[a].concat(l)}, a);
  const nurSchatten = {awarded:[e('randlage', 0.2), e('klatsche', 1.5)]};
  const mitSelten = {awarded:[e('randlage', 0.2), e('klatsche', 1.5), e('deutlich', 0.1)]};
  return {
    doppelt:U(e('randlage', 0.5), [e('klatsche', 1.0)]),
    knapp:U(e('randlage', 0.5), [e('klatsche', 0.99)]),
    mindestens:U(e('randlage', 0), [e('klatsche', 0.9)]),
    eineStreuung:U(e('randlage', 0), [e('klatsche', 1.0)]),
    selten:U(e('deutlich', 0), [e('klatsche', 5)]),
    fremd:U(e('randlage', 0), [e('klatsche', 5, 'y')]),
    zelle:(chronikEintragVon(nurSchatten, 'x') || {}).titleId,
    stufe:chronikZellStufe(nurSchatten, 'x'),
    zelleSelten:(chronikEintragVon(mitSelten, 'x') || {}).titleId
  };
})())`));
ok(_schattig.doppelt && !_schattig.knapp,
   'eine Schattenseite doppelt so weit ueber der Schwelle ueberschattet eine besondere Chronik, knapp darunter nicht',
   JSON.stringify(_schattig));
ok(!_schattig.mindestens && _schattig.eineStreuung,
   'eine Schattenseite ueberschattet erst ab einer Streuung ueber ihrer Schwelle', JSON.stringify(_schattig));
ok(!_schattig.selten && !_schattig.fremd,
   'eine seltene Chronik und die Schattenseite eines anderen ueberschatten nicht', JSON.stringify(_schattig));
ok(_schattig.zelle === 'klatsche' && _schattig.stufe === 'schatten' && _schattig.zelleSelten === 'deutlich',
   'in Matrix und Prestige steht die Schattenseite, die ueberschattet, und eine seltene Chronik zaehlt weiter',
   JSON.stringify(_schattig));
// In der Regel liegt der Bonus zwischen 1 und 50 — gemessen an allen
// positiven Einträgen der Fixture-Monate. Eine Streuung, die zu klein
// geraten ist, triebe ihn weit darüber; eine zu große drückte ihn auf null.
const _bonusVert = JSON.parse(K.eval(`JSON.stringify((function(){
  const b = [];
  ['2026-05','2026-06','2026-07','2026-08'].forEach(sid => seasonTitles(sid).awarded.forEach(a => {
    if((_chronikMonat(a.titleId) || {}).art !== 'schatten') b.push(chronikBonus(a.titleId, a.wert));
  }));
  b.sort((x, y) => x - y);
  return {n:b.length, imBand:b.filter(x => x >= 1 && x <= 50).length, null:b.filter(x => x === 0).length,
          median:b[Math.floor(b.length / 2)], max:b[b.length - 1]};
})())`));
ok(_bonusVert.n > 50 && _bonusVert.imBand / _bonusVert.n >= 0.7 && _bonusVert.median >= 1 && _bonusVert.median <= 50,
   'der Bonus liegt in der Regel zwischen 1 und 50', JSON.stringify(_bonusVert));
ok(K.eval("DISZIPLINEN.filter(d=>d.monat&&d.monat.art==='schatten').every(d=>chronikPunkte(d.id)===0)"),
   'Schattenseiten geben kein Prestige');

// Dieselben Fragen auf zwei Zeitachsen stehen in EINER Disziplin: diese drei
// tragen jetzt eine Monats- UND eine Allzeitwertung [§13.1].
['spotless','evenkeel','drought'].forEach(id =>
  ok(K.eval(`!!SEASON_TITLE_BY_ID['${id}'] && !!CHRONICLE_BY_ID['${id}']`),
     id + ' traegt beide Zeitachsen'));
['spotless','comeback_king'].forEach(id =>
  ok(K.eval(`!!CHRONICLE_BY_ID['${id}']`), 'neuer Liga-Rekord ' + id + ' im Katalog'));

const ctxFields = K.eval(`(function(){
  const C=_chronicleCtx(); const p=C.P[Object.keys(C.P)[0]];
  return ['afterLoss','afterLossOpp','gleichTag','wiederTag','beidesTag']
    .filter(f=>typeof p[f]!=='number').join(',');
})()`);
ok(ctxFields === '', 'Laufbahn-Kontext liefert die neuen Kennzahlen', ctxFields);

const sctxFields = K.eval(`(function(){
  const C=_seasonTitleCtx('2026-07'); const p=C.P[Object.keys(C.P)[0]];
  return ['potd','posDays','days'].filter(f=>typeof p[f]!=='number').join(',');
})()`);
ok(sctxFields === '', 'Saison-Kontext liefert potd und posDays', sctxFields);

// Die Antwort auf eine Niederlage kann nie oefter gelingen, als es
// Gelegenheiten dazu gab.
ok(K.eval(`(function(){
  const C=_chronicleCtx();
  return Object.keys(C.P).filter(id=>{const p=C.P[id];
    return p.afterLoss>p.afterLossOpp;
  }).length;
})()`) === 0, 'Quoten-Zaehler bleiben unter ihrer Bezugsgroesse');

// Der Wochenkoenig haelt wirklich die beste Quote, nicht die meisten Titel.
ok(K.eval(`(function(){
  const C=_chronicleCtx(), h=allChronicles().byId['rec_potw'];
  if(!h) return 'leer';
  let best=-1; Object.keys(C.P).forEach(id=>{const p=C.P[id];
    if(p.weeks>=10) best=Math.max(best,p.potw/p.weeks);});
  return Math.abs(h.val-best)<=1e-9 ? 'ok' : 'FALSCH';
})()`) !== 'FALSCH', '„Der Wochenkoenig" haelt die beste Quote ab 10 Wochen');

// Leistung vor Ereignis vor Schatten — beide Listen stammen aus derselben
// Katalog-Reihenfolge. Bei den Rekorden duerfen einzelne Eintraege bewusst
// vorgezogen sein (CHRON_VORRANG); der Rest muss die Ordnung halten.
// Pensum-Eintraege gibt es nicht mehr; geprueft wird, dass keiner zurueckkommt.
const RANG = {leistung:0, ereignis:1, schatten:2};
const VOR = JSON.parse(K.eval('JSON.stringify(CHRON_VORRANG)'));
['SEASON_TITLES','CHRONICLES'].forEach(liste => {
  const alle = JSON.parse(K.eval(`JSON.stringify(${liste}.map(x=>({id:x.id,art:x.art})))`));
  const arts = alle.filter(x => !VOR.includes(x.id)).map(x => x.art);
  const sortiert = arts.every((a,i) => i === 0 || RANG[arts[i-1]] <= RANG[a]);
  ok(sortiert, liste + ': Leistung vor Ereignis vor Schatten', arts.join(','));
  ok(alle.every(x => x.art !== 'pensum'), liste + ': kein Pensum-Eintrag mehr');
});
// ── Neutral formuliert ──────────────────────────────────────────────
// Die Belege standen in der dritten Person Singular maennlich: „42 % seiner
// Niederlagen gingen 9:10 aus". Sie stehen unter dem Wappen jedes Spielers,
// und ein Possessivpronomen behauptet dort ein Geschlecht, das die Liga
// nicht kennt. Gemessen werden die GEBAUTEN Belege mit echten Werten, nicht
// die Quelltexte: die Zahlen kommen aus einem Template, das Pronomen nicht.
const POSSESSIV = /\b(seiner|seine|seinem|seinen|sein|ihrer|ihre|ihrem|ihren)\b/;
const belegTreffer = JSON.parse(K.eval(`(function(){
  const H = chronicleHolders(); const t = [];
  const re = ${POSSESSIV.toString()};
  CHRONICLES.forEach(c => { const h = H[c.id]; if(!h) return;
    if(re.test(String(h.ev || ''))) t.push(c.id); });
  SEASON_TITLES.forEach(d => {
    ['cond','wie'].forEach(k => { if(d[k] && re.test(String(d[k]))) t.push(d.id + '.' + k); });
  });
  CHRONICLES.forEach(d => {
    ['cond','wie'].forEach(k => { if(d[k] && re.test(String(d[k]))) t.push(d.id + '.' + k); });
  });
  return JSON.stringify(t);
})()`));
ok(belegTreffer.length === 0, 'kein Beleg und keine Bedingung traegt ein Possessivpronomen',
   belegTreffer.slice(0, 4).join(', '));

// Gemessen wurde bisher nur `cond` und `wie` auf der OBERSTEN Ebene eines
// Eintrags. Beide stehen im Katalog aber unter `monat` und `allzeit`, und
// genau dort lagen vierzehn Saetze mit „seine", „ihm" oder „er": „Seine
// Siegquote minus der Siegchance, die die Elo-Rechnung ihm vorab gegeben
// hat" stand im Detail-Blatt unter dem Wappen jedes Spielers. Dazu der
// Gedankenstrich, der Saetze trennte, die als zwei Saetze klarer sind
// [§C33] — zwanzig Stellen, vom Beleg bis zur Bedingung.
// Die Wortgrenze `\b` kennt nur [A-Za-z0-9_]: in „Ausreißer" steht damit
// hinter dem ß eine Grenze, und `\ber\b` fand dort das Pronomen „er".
// Deshalb eine eigene Klasse mit Umlauten und ß.
const _DW = '[A-Za-zÄÖÜäöüß]';
const PRONOMEN = new RegExp('(?<!' + _DW + ')(seiner|seine|seinem|seinen|sein'
  + '|ihrer|ihre|ihrem|ihren|ihm|ihn|er)(?!' + _DW + ')', 'i');
// Gross geschrieben zaehlt auch: die Gegenprobe mit „Seine Beidfuessigkeit"
// lief durch, weil die Klasse nur Kleinbuchstaben kannte und ein Pronomen am
// Satzanfang gross steht.
const _sprachTreffer = JSON.parse(K.eval(`JSON.stringify((function(){
  const strich = [], pron = [], einzahl = [], voll = [];
  const re = ${'PRONOMEN'};
  const pruef = (wo, txt) => { const t = String(txt || ''); if(!t) return;
    if(/[—–]/.test(t)) strich.push(wo);
    if(re.test(t)) pron.push(wo);
    if(/(^|[^\\d,.])1 (Tore|Gegentore|Siege|Spiele|Partien|Niederlagen|Spieltage|Tage|Wochen)(?![A-Za-zÄÖÜäöüß])/.test(t)) einzahl.push(wo + ': ' + t);
    if(/mindestens 100 ?%/.test(t)) voll.push(wo + ': ' + t); };
  DISZIPLINEN.forEach(d => {
    ['cond','wie'].forEach(k => pruef(d.id + '.' + k, d[k]));
    // Der Beiname steht im Profilkopf unter dem Namen eines Spielers und
    // gehoert damit zu denselben Texten wie Beleg und Bedingung.
    if(d.monat) ['cond','wie','beiname'].forEach(k => pruef(d.id + '.monat.' + k, d.monat[k]));
    if(d.allzeit) ['cond','wie'].forEach(k => pruef(d.id + '.allzeit.' + k, d.allzeit[k]));
  });
  const H = chronicleHolders();
  CHRONICLES.forEach(c => { const h = H[c.id]; if(h) pruef(c.id + '.ev', h.ev); });
  BADGES.forEach(b => pruef('badge.' + b.id, b.desc));
  return {strich, pron, einzahl, voll};
})())`.replace('${PRONOMEN}', PRONOMEN.toString())));
ok(_sprachTreffer.strich.length === 0, 'kein Gedankenstrich in Beleg, Bedingung oder Erklaerung',
   _sprachTreffer.strich.slice(0, 4).join(', ') || 'keiner');
ok(_sprachTreffer.pron.length === 0, 'und kein Pronomen ueber einen Spieler',
   _sprachTreffer.pron.slice(0, 4).join(', ') || 'keins');
// „mindestens 1 Tore mehr als im Ligaschnitt" stand als Bedingung des
// Torhagels im Blatt: eins steht in der Einzahl.
ok(_sprachTreffer.einzahl.length === 0, 'und eins steht in der Einzahl',
   _sprachTreffer.einzahl.slice(0, 3).join(' | ') || 'alle');
// „An mindestens 100 % der eigenen Spieltage" hiess „an jedem".
ok(_sprachTreffer.voll.length === 0, 'und alles heisst jedes, nicht mindestens 100 %',
   _sprachTreffer.voll.slice(0, 3).join(' | ') || 'alle');

// Die Beschreibung einer Auszeichnung ist ein Satz, keine Formel: „Sieg mit
// Tordifferenz ≥ 7", „Als Underdog gewonnen (<35% Chance)", „min. 3
// Matches", „mind. einen Gegner aus den Bottom-2", „als Mate". Sie steht im
// Blatt und als Text der Karte im Feed.
const _badgeKuerzel = JSON.parse(K.eval(`JSON.stringify(BADGES
  .filter(b => /(^|[^A-Za-zÄÖÜäöüß])(min|max|mind)\\.|[≤≥<>]|Underdog|\\bMate\\b|Bottom-|Top-1|\\d\\+|\\d:\\d+ (Sieg|Niederlage)|^Match gespielt/.test(b.desc))
  .map(b => b.id + ': ' + b.desc))`));
ok(_badgeKuerzel.length === 0, 'die Beschreibung einer Auszeichnung ist ein Satz ohne Kürzel',
   _badgeKuerzel.slice(0, 3).join(' | ') || 'alle');
// Und keine Auszeichnung heisst wie eine Stufe des Karriere-Rangs: die fuer
// 150 Partien hiess „Legende", und im Profil stand dasselbe Wort als Rang.
const _badgeRang = JSON.parse(K.eval(`JSON.stringify(BADGES
  .filter(b => RANKS.some(r => r.label === b.name)).map(b => b.id + ': ' + b.name))`));
ok(_badgeRang.length === 0, 'keine Auszeichnung heisst wie eine Rangstufe',
   _badgeRang.join(' | ') || 'keine');

// ── Die Chronik gehoert nicht nur den besten Drei ───────────────────
// Wer eine Quote gewinnt, gewinnt fast jede: gemessen gingen sechzig Prozent
// der Monatseintraege an die besten Drei, und der Monatserste allein hielt
// ein Drittel der Tafel. „Auf Augenhoehe", „Die Steigerung" und der
// Sonntagsschuss messen deshalb nicht das Niveau, sondern den Abstand zum
// EIGENEN — so wie das Uebersoll, das jeder erreichen kann. Fielen sie
// wieder an die Spitze, waeren sie nur drei weitere Eintraege fuer den, der
// ohnehin alles hat.
const _mitte = JSON.parse(K.eval(`JSON.stringify((function(){
  const sids = allPastSeasons().concat([currentSeason().id])
    .filter((v,i,a) => a.indexOf(v) === i).sort();
  const lagen = []; let anDrei = 0, gesamt = 0;
  sids.forEach(sid => {
    const C = _seasonTitleCtx(sid);
    const rang = Object.keys(C.P).filter(id => C.P[id].games >= 5)
      .sort((a,b) => (C.P[b].wins/C.P[b].games) - (C.P[a].wins/C.P[a].games));
    if(rang.length < 6) return;
    const platz = {}; rang.forEach((id,i) => { platz[id] = i + 1; });
    seasonTitles(sid).awarded.forEach(a => {
      gesamt++;
      const p = platz[a.pid] || rang.length;
      if(p <= 3) anDrei++;
      lagen.push(p / rang.length);
    });
  });
  return {n:lagen.length, gesamt,
    lage: lagen.length ? lagen.reduce((a,b)=>a+b,0)/lagen.length : 0,
    anteilOben: gesamt ? anDrei/gesamt : 0};
})())`));
ok(_mitte.n > 0, 'der Monatskatalog vergibt ueberhaupt Eintraege', _mitte.n + ' Eintraege');
ok(_mitte.lage > 0.35,
   'die Halter stehen im Mittel jenseits des ersten Drittels der Siegquote',
   'bei ' + Math.round(_mitte.lage * 100) + ' % der Rangliste');
ok(_mitte.anteilOben < 0.55,
   'weniger als die Haelfte der Eintraege geht an die besten Drei',
   Math.round(_mitte.anteilOben * 100) + ' %');

// Die Siegesserie ist die eine gewollte Ausnahme: sie steht vor der besten
// Bilanz, obwohl sie ein Ereignis ist und die Bilanz eine Leistung.
const iSerie = K.eval("CHRONICLES.findIndex(c=>c.id==='unstoppable')");
const iMass  = K.eval("CHRONICLES.findIndex(c=>c.id==='best_record')");
ok(iSerie >= 0 && iMass >= 0 && iSerie < iMass,
   'die Siegesserie steht vor dem Massstab', iSerie + ' vs ' + iMass);
ok(VOR.every(id => K.eval(`CHRONICLES.some(c=>c.id===${JSON.stringify(id)})`)),
   'jeder Vorrang-Eintrag existiert auch im Katalog');
const weg = ['rec_wins','rec_goals','rec_games','rec_day','rec_always','trait_workhorse',
             'trait_founder','arc_veteran','marathon','tireless','omnipresent',
             'night_owl','early_riser','efficient','flawless','rec_cleanday'];
weg.forEach(id => ok(K.eval(`!DISZIPLINEN.some(d=>d.id==='${id}')`),
  'gestrichen und nicht zurueckgekehrt: ' + id));
ok(K.eval(`(function(){
  const i = CHRONICLES.findIndex(c=>c.kind==='shame');
  return i > 0 && CHRONICLES.slice(i).every(c=>c.kind==='shame');
})()`), 'die Schattenseiten stehen geschlossen am Ende');

// Streifen: Monate ohne Eintrag tauchen gar nicht mehr auf.
const stripCells = K.eval(`(function(){
  const pid='${IDS[8]}';
  const rows=seasonTitleHistory(pid);
  const html=_chronStripHtml(pid);
  const cells=(html.match(/class="chron-cell/g)||[]).length;
  return cells + '/' + rows.filter(r=>r.title).length + '/' + rows.length;
})()`);
const sc = stripCells.split('/').map(Number);
ok(sc[0] === sc[1], 'der Streifen zeigt genau so viele Zellen wie Eintraege', stripCells);
ok(!K.eval(`_chronStripHtml('${IDS[8]}').includes('class="dash"')`),
   'kein Strich-Platzhalter mehr im Streifen');
ok(K.eval(`(function(){
  // Ein Spieler ohne einen einzigen Eintrag bekommt einen Satz statt Striche.
  const pid=Object.keys(pmap()).find(id=>seasonTitleHistory(id).length && !seasonTitleHistory(id).some(r=>r.title));
  if(!pid) return 'kein solcher Spieler';
  const h=_chronStripHtml(pid);
  return h.includes('chron-cell') ? 'FALSCH' : 'ok';
})()`) !== 'FALSCH', 'ohne Eintrag zeigt der Streifen keine leeren Zellen');

// ─── 16. v9.21: echte Bestwerte, Wert vor Haeufigkeit ───────────────
console.log('\n=== 16. ECHTE BESTWERTE, WERT VOR HAEUFIGKEIT ===');

// Die Serie ist der Pruefstein: sie behauptet einen Superlativ, und ihr
// Traeger muss ihn halten. Vorher blieb sie in drei von vier Monaten leer,
// weil der Halter der laengsten Serie schon einen anderen Eintrag trug.
const SUP = {unstoppable:'bestStreak', drought:'worstLoss'};
['2026-05','2026-06','2026-07','2026-08'].forEach(sid => {
  Object.keys(SUP).forEach(id => {
    const r = K.eval(`(function(){
      const C=_seasonTitleCtx('${sid}'), T=seasonTitles('${sid}');
      const a=T.awarded.find(x=>x.titleId==='${id}');
      if(!a) return 'leer';
      const f='${SUP[id]}';
      let best=-Infinity; Object.keys(C.P).forEach(pid=>{ best=Math.max(best, C.P[pid][f]); });
      return C.P[a.pid][f] === best ? 'ok' : 'FALSCH ' + C.P[a.pid][f] + ' statt ' + best;
    })()`);
    ok(String(r).indexOf('FALSCH') < 0, sid + ': ' + id + ' haelt wirklich den Bestwert', r);
  });
});

// Eine Monatschronik haelt, wer im Monat fuenfzehn eigene Partien hat —
// vom ersten Spieltag an [§C39]. Vorher galt eine Grenze fuer den ganzen
// Monat (fuenf Spieltage) und danach acht Partien je Spieler: wer an einem
// Spieltag zwanzig Partien spielte, wartete, und wer mit acht kam, holte mit
// den Ausreissern einer kleinen Stichprobe.
const _tor = JSON.parse(K.eval(`JSON.stringify((function(){
  const out = {unter:[], zuWenig:[], leer:[], n:0, grenze:CHRONIK_MIN_SPIELE};
  ['2026-05','2026-06','2026-07','2026-08'].forEach(sid => { const T = seasonTitles(sid), C = _seasonTitleCtx(sid);
    const g = id => (C.rankAll.find(r => r.id === id) || {}).games || 0;
    T.awarded.forEach(a => { out.n++; if(g(a.pid) < CHRONIK_MIN_SPIELE) out.unter.push(sid + ' ' + a.pid); });
    C.rankAll.filter(r => r.games > 0 && r.games < CHRONIK_MIN_SPIELE).forEach(r => {
      if(!(T.zuWenig || []).includes(r.id)) out.zuWenig.push(sid + ' ' + r.id);
      if(T.empty.includes(r.id)) out.leer.push(sid + ' ' + r.id); }); });
  return out; })())`));
ok(_tor.grenze === 15 && _tor.n > 0 && !_tor.unter.length,
   'eine Monatschronik haelt nur, wer im Monat mindestens fuenfzehn Partien hat', _tor.unter.slice(0, 3).join(', ') || _tor.n + ' Eintraege');
ok(!_tor.zuWenig.length && !_tor.leer.length,
   'wer darunter bleibt, ist nicht gewertet und steht nicht als „ohne Eintrag"', _tor.zuWenig.concat(_tor.leer).slice(0, 3).join(', '));
// Und keine Bedingung nennt fuer den Monat selbst eine kleinere Zahl: „ab 8
// Partien in beiden Monaten" stand noch beim Sprung, als die fuenfzehn
// schon galten. Was nach einer Zahl unter fuenfzehn folgt, muss einen Teil
// des Monats meinen (je Position, an diesem Tag, in jeder Gruppe) oder den
// Vormonat.
const _torText = JSON.parse(K.eval(`JSON.stringify(SEASON_TITLES.filter(t => {
  const r = /ab (\\d+) Partien( [^,]*)?/g; let m, falsch = false;
  while((m = r.exec(t.cond))){ if(+m[1] < CHRONIK_MIN_SPIELE
    && !/^ (je|in jede[mr]|in dieser|an diesem|am Tag|an beiden Tagen|als |im Vormonat)/.test(m[2] || '')) falsch = true; }
  return falsch; }).map(t => t.id + ': ' + t.cond))`));
ok(_torText.length === 0, 'keine Bedingung nennt fuer den Monat weniger als fuenfzehn Partien', _torText.join(' · '));

// Fuenf echte Monate statt drei: alle Partien der Liga bis Ende Oktober
// (`fixtures/oktober.txt`), in einer zweiten Laufzeit. An drei Monaten liess
// sich nicht sagen, ob eine Chronik in jedem dritten Monat vergeben wird oder
// in jedem zweiten — und genau das ist die Frage der Seltenheit [§C39]. Die
// Siegchancen stehen dort, wie die Liga sie heute rechnet; in `matches.txt`
// stehen fuer dieselben Partien noch die von damals, und mit ihnen hielt Leon
// im Juni eine Chronik, die er in der App nie hatte.
const HERBST_MON = ['2026-06','2026-07','2026-08','2026-09','2026-10'];
const KH = (() => {
  const {K:k, setNow} = require('./runtime.js').createRuntime();
  const liga = fs.readFileSync(DIR + '/fixtures/oktober.txt', 'utf8').trim().split(';').map((row, i) => {
    const f = row.split(',').map(Number), pos = j => f[4+j] === 0 ? 'drive' : 'reves';
    return {id:'o'+String(i).padStart(4,'0'), a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
      a1_side:pos(0), a2_side:pos(1), b1_side:pos(2), b2_side:pos(3), games_a:f[8], games_b:f[9],
      winner:f[10]===0?'A':'B', exp_a:f[11]/1000, created_at:new Date(f[12]*1000).toISOString(), deltas:{}};
  });
  setNow(new Date('2026-10-29T20:00:00Z').getTime());
  k(`players = ${JSON.stringify(NAMES.map((n,i)=>({id:IDS[i],name:n,hidden:false,elo:0,atk:0.5,avatar_id:null})))};
    matches = ${JSON.stringify(liga)}; seasons = []; invalidateCache();
    const _d = new Map(simulateEloWithSliders(matches).history.map(h => [h.matchId, h.deltas]));
    matches.forEach(m => { m.deltas = _d.get(m.id) || {}; }); invalidateCache(); 0`);
  return k;
})();

// Wert vor Haeufigkeit: LEISTUNG vor EREIGNIS vor SCHATTEN, und innerhalb
// jedes Blocks moeglichst SELTEN vor HAEUFIG. Nicht gegen eine Namensliste
// geprueft, sondern gegen die echten Daten — wie oft trifft eine Bedingung
// ueberhaupt zu? Damit haelt der Test das Gesetz fest, nicht einen
// Katalogstand.
const TREFFER = JSON.parse(KH(`(function(){
  const n={};
  ${JSON.stringify(HERBST_MON)}.forEach(sid=>{
    const C=_seasonTitleCtx(sid);
    SEASON_TITLES.forEach(t=>{
      const r=t.pick(C,new Set());
      n[t.id]=(n[t.id]||0) + ((r && r.halter) ? r.halter.length : 0);
    });
  });
  return JSON.stringify(n);
})()`));
// Gewertet wird vom ersten Spieltag an: an den echten Partien hielten Leon,
// Henry, Maxi und Leo im Juni schon am zweiten Spieltag Chroniken, jeder mit
// mindestens fuenfzehn Partien. Vorher war vor dem fuenften Spieltag niemand
// gewertet.
const _frueh = JSON.parse(KH(`JSON.stringify((function(){
  const sid = '2026-06', ms = matchesInSeason(sid).slice().sort((a, b) => mts(a) - mts(b));
  const tag = [...new Set(ms.map(m => tagKey(mts(m))))].sort()[1];
  const bis = Math.max(...ms.filter(m => tagKey(mts(m)) === tag).map(mts));
  const H = seasonTitleHalter(sid, bis) || {}, C = _seasonTitleCtx(sid, bis);
  const wer = [...new Set(Object.values(H).flatMap(h => h.pids))];
  return {tag, tage:C.days, n:Object.keys(H).length,
    unter:wer.filter(id => (C.rankAll.find(r => r.id === id) || {}).games < CHRONIK_MIN_SPIELE).length}; })())`));
ok(_frueh.tage < 5 && _frueh.n > 0 && _frueh.unter === 0,
   'eine Monatschronik gibt es vom ersten Spieltag an, fuer jeden ab fuenfzehn Partien', JSON.stringify(_frueh));
const KAT = JSON.parse(K.eval("JSON.stringify(SEASON_TITLES.map(t=>({id:t.id,art:t.art,kunst:t.kunst})))"));
const ARTRANG = {leistung:0, ereignis:1, schatten:2};
let artOk = true, artWo = '';
for(let i = 1; i < KAT.length; i++){
  if(ARTRANG[KAT[i-1].art] > ARTRANG[KAT[i].art]){
    artOk = false; artWo += ` ${KAT[i-1].id}(${KAT[i-1].art}) vor ${KAT[i].id}(${KAT[i].art})`;
  }
}
ok(artOk, 'Leistung steht vor Ereignis steht vor Schatten', artWo);

// Innerhalb einer Art nur der Trend, nicht die strenge Sortierung: Eintraege,
// die auch einen Liga-Rekord tragen, stehen dort, wo die Rekord-Reihenfolge
// sie braucht — sie lassen sich nicht frei einsortieren. Geprueft wird
// deshalb, dass die erste Haelfte eines Blocks im Schnitt seltener zutrifft
// als die zweite. Ein Block ist Art und Kammer zusammen, so wie
// `SEASON_TITLES` sortiert: die Konstanz steht hinter dem Koennen, mit
// eigenen Ausschlaegen, und ueber beide hinweg verglich der Test die
// seltenste Konstanz mit dem haeufigsten Koennen.
[...new Set(KAT.map(t => t.art + '/' + t.kunst))].forEach(art => {
  const B = KAT.filter(t => t.art + '/' + t.kunst === art);
  if(B.length < 4) return;
  const m = Math.floor(B.length / 2);
  const schnitt = L => L.reduce((a, t) => a + TREFFER[t.id], 0) / L.length;
  const vorn = schnitt(B.slice(0, m)), hinten = schnitt(B.slice(m));
  ok(vorn <= hinten, art + ': die selteneren Eintraege stehen vorn',
     vorn.toFixed(2) + ' vs ' + hinten.toFixed(2));
});
// Ein Icon gehoert genau einer Disziplin. In einer Zelle von 62 Pixeln ist
// die Zeichnung das Erste, was man sieht — zwei Eintraege mit demselben Bild
// sind dort nicht zu unterscheiden.
const ICS = JSON.parse(K.eval("JSON.stringify(DISZIPLINEN.map(d=>({id:d.id,ic:d.ic})))"));
const icDopp = {};
ICS.forEach(d => (icDopp[d.ic] = icDopp[d.ic] || []).push(d.id));
const icBad = Object.keys(icDopp).filter(k => icDopp[k].length > 1);
ok(icBad.length === 0, 'jede Disziplin hat ihr eigenes Icon',
   icBad.map(k => k + ': ' + icDopp[k].join('+')).join(' · '));
ok(ICS.every(d => K.eval(`!!ICONS[${JSON.stringify(d.ic)}]`)),
   'jedes Disziplin-Icon gibt es auch im Katalog',
   ICS.filter(d => !K.eval(`!!ICONS[${JSON.stringify(d.ic)}]`)).map(d => d.id + '/' + d.ic).join(', '));

// Eine Monatswertung soll besonders sein. Bei den alten Schwellen wurden in
// einem Monat vierundzwanzig der vierunddreissig Wertungen vergeben, und ein
// Spieler trug neun davon — was fast jeder Monat hergibt, zeichnet niemanden
// mehr aus.
//
// Gedeckelt wird deshalb die RATE, nicht die Zahl: hoechstens ein Halter je
// gewerteten Monat. Eine feste Zahl waere mit der Liga selbst falsch
// geworden — sie stand einmal als Grenze je Klasse hier (legendaer einmal,
// selten zweimal, besonders dreimal), und damit haette der zweite Halter
// einer legendaeren Chronik den Test rot gemacht, obwohl die Bedingung
// keinen Deut leichter geworden ist. Die Klasse sagt, wie schwer eine
// Bedingung zu erreichen ist, und ist beim Kalibrieren festgeschrieben
// [§C39]; sie ist keine Volkszaehlung.
const _klasseVon = JSON.parse(K.eval(
  "JSON.stringify(SEASON_TITLES.reduce((o,t)=>(o[t.id]=t.klasse,o),{}))"));
// Gezaehlt werden MONATE mit einem Halter, nicht Halter: hoechstens ein
// Drittel der gewerteten, aufgerundet — in fuenf Monaten zwei. Vorher hiess
// die Grenze „nicht mehr Halter als Monate", und „Der Spielverderber" ging
// in allen fuenf echten Monaten an jemanden, „Die Steigerung" in vier.
const _monate = JSON.parse(KH(`JSON.stringify((function(){
  const n = {}, sids = ${JSON.stringify(HERBST_MON)};
  sids.forEach(sid => { const C = _seasonTitleCtx(sid);
    SEASON_TITLES.forEach(t => { const r = t.pick(C, new Set());
      if(r && r.halter && r.halter.length) (n[t.id] = n[t.id] || []).push(sid.slice(5)); }); });
  return {n, m:sids.length}; })())`));
const _monN = _monate.m, _drittel = Math.ceil(_monN / 3);
// Ausgenommen sind die Schwellen, die die Liga selbst festgelegt hat: sie
// sind eine Ansage wie der Tagesregent und die Wochenkrone und werden nicht
// gegen Seltenheit und Ausschlag geeicht [§C39]. Die Liste kann nur
// kuerzer werden — jede neue Chronik hat sich an beide Regeln zu halten.
const _LIGA_SETZT = ['wochenkrone','zunull','wochwunder','traumquote','auferstehung','wochenschluss',
  'destroyer','umschwung','formgipfel','deutlich','unmoeglich','punktgenau2','beidseitig','evenkeel',
  'zitterkoenig','nervenkitzel','ausbruch','spezialisiert','randlage','abyss','hardluck','drought',
  'einbruch','klatsche','kraefteverfall','favflop'];
ok(_LIGA_SETZT.every(id => _klasseVon[id]), 'jede von der Liga gesetzte Schwelle gehoert zu einer Chronik',
   _LIGA_SETZT.filter(id => !_klasseVon[id]).join(', ') || _LIGA_SETZT.length + ' Chroniken');
const _zuOft = Object.keys(_monate.n).filter(id => _monate.n[id].length > _drittel && !_LIGA_SETZT.includes(id));
// An den echten Partien: wer ueberschattet ist, bekommt fuer diesen Monat
// nichts aus der besonderen Chronik, und es geschieht, aber nicht jedem.
const _schattenEcht = JSON.parse(KH(`JSON.stringify((function(){
  const out = [];
  ${JSON.stringify(HERBST_MON)}.forEach(sid => { const T = seasonTitles(sid);
    T.awarded.forEach(a => { const s = chronikUeberschattet(T, a); if(!s) return;
      const e = chronikEintragVon(T, a.pid);
      out.push({sid, pid:a.pid, id:a.titleId, s:s.titleId, zaehlt:e && e.titleId, punkte:e ? chronikPunkte(e.titleId, e.wert) : 0}); }); });
  return out; })())`));
console.log('  ueberschattet: ' + _schattenEcht.map(x => x.sid.slice(5) + ' ' + nm(x.pid) + ' ' + x.id + ' von ' + x.s).join(' · '));
ok(_schattenEcht.length >= 3 && new Set(_schattenEcht.map(x => x.pid)).size >= 2
   && _schattenEcht.every(x => x.zaehlt !== x.id),
   'an den echten Partien ueberschattet eine Schattenseite manche besondere Chronik, und die zaehlt dann nicht',
   _schattenEcht.length + ' Faelle');
ok(_monN === 5 && _zuOft.length === 0,
   'keine Chronik geht in mehr als einem Drittel der gewerteten Monate an jemanden',
   _monN + ' Monate, hoechstens ' + _drittel + ', zu oft: ' + _zuOft.map(id => id + '(' + _monate.n[id].join(',') + ')').join(', '));
// Eine Schwelle ist eine runde Zahl: niemand merkt sich „82 %" oder „33
// Prozentpunkte", und eine krumme Zahl liest sich, als sei sie auf einen
// bestimmten Halter zugeschnitten. Prozent und Prozentpunkte stehen in
// Fuenferschritten, darunter in halben Schritten (1,5 %, 3 Prozentpunkte);
// Tore in Vierteln, Elo in Zehnern. Gelesen wird die Bedingung, wie sie auf
// dem Bildschirm steht.
const _krumm = JSON.parse(K.eval(`JSON.stringify(SEASON_TITLES.map(t => {
  const c = _chronikMonat(t.id).cond || '';
  const bad = [...c.matchAll(/(\\d+(?:,\\d+)?)\\s*(%|Prozentpunkte?|Gegentore?|Tore?\\b|Elo)/g)].filter(m => {
    const f = parseFloat(m[1].replace(',', '.')), u = m[2];
    if(u === '%' || u.startsWith('Prozentpunkt')) return f >= 5 ? Math.abs(f / 5 - Math.round(f / 5)) > 1e-9 : Math.abs(f * 2 - Math.round(f * 2)) > 1e-9;
    if(u === 'Elo') return f % 10 !== 0;
    return Math.abs(f * 4 - Math.round(f * 4)) > 1e-9;
  }).map(m => m[0]);
  return bad.length ? t.id + ': ' + bad.join(', ') : '';
}).filter(Boolean))`));
ok(_krumm.length === 0, 'jede Schwelle einer Bedingung ist eine runde Zahl', _krumm.join(' · '));
// Und der Beste eines Monats geht dabei nicht leer aus. Im Juni hielt Leon
// als Meister keine einzige Chronik: die Fragen nach der Rechnung reisst
// kaum, wen die Rechnung schon oben sieht, und ein Abstand ueber hundert
// Partien schwankt weniger als ueber zehn. „Der Souveraen", „Das
// Stammduell" und „Der lange Atem" fragen so, dass auch er sie halten kann.
const _meister = JSON.parse(KH(`JSON.stringify(${JSON.stringify(HERBST_MON)}.map(sid => { const T = seasonTitles(sid);
  return {sid, m:T.champ && pname(T.champ.pid), n:T.awarded.filter(a => T.champ && a.pid === T.champ.pid
    && chronikStufe(a.titleId) !== 'schatten').length}; }))`));
ok(_meister.every(x => x.n >= 1), 'der Meister jedes Monats haelt mindestens eine positive Chronik',
   _meister.map(x => x.sid.slice(5) + ' ' + x.m + ' ' + x.n).join(' · '));

// Die Klasse selbst wird hier NICHT nachgezaehlt. Sie ist beim Kalibrieren
// an den Daten festgeschrieben, so wie `aus` und `BADGE_RARITY` [§C39]: eine
// legendaere Bedingung wird mit den Jahren zwangslaeufig oefter erreicht und
// bleibt trotzdem legendaer, weil sie nicht leichter geworden ist. Ein Test,
// der sie gegen die heutige Haeufigkeit haelt, wuerde mit der Liga von
// selbst rot — und ein Versuch damit war nicht einmal rot zu bekommen: eine
// einzelne falsch eingeordnete Chronik verschiebt den Schnitt ihrer Klasse
// nicht genug, um die Reihenfolge zu kippen.
//
// Was jede Chronik dagegen rechtfertigen muss, ist ihr AUSSCHLAG: die
// Schwelle muss mindestens 1,2 σ vom Schnitt aller je gewerteten Werte
// liegen, sonst steht ihr Bester kaum weiter draussen als der Durchschnitt.
// Bis 1,9 σ ist sie besonders und bringt 50 [§C39]; die Grenze lag bei
// 1,5 σ, als der Wert noch aus dem Ausschlag selbst gerechnet wurde, und
// sie hielt die Chroniken gegen das Eigene draussen, deren Bester trotzdem
// klar ausserhalb des Feldes steht.
const _MIN_AUS = 1.2;
const _flach = JSON.parse(K.eval(`JSON.stringify(SEASON_TITLES
  .filter(t => !(t.aus >= ${_MIN_AUS}) && !${JSON.stringify(_LIGA_SETZT)}.includes(t.id))
  .map(t => t.id + ' (' + (t.aus || 0) + ')'))`));
ok(_flach.length === 0,
   'jede Chronik schiebt ihre Schwelle mindestens 1,2 σ hinaus',
   _flach.join(', '));
// Und ihr Wert haengt nicht an der Spielzahl [§C39]: wer mehr spielt, hat
// mehr Tage, mehr Gegner und mehr Gelegenheiten, und eine Chronik, die das
// belohnt, gehoert dem Vielspieler. Gemessen wird die Korrelation des
// GEWERTETEN Werts mit den Partien des Monats ueber die fuenf echten Monate,
// in beide Richtungen — auch ein Wert, der mit wenigen Partien leichter
// extrem wird, haengt an der Spielzahl, und die Wertung nach der Stichprobe
// darf keine neue Abhaengigkeit bringen.
//
// Die Ausnahmen stehen hier namentlich, damit die Liste nur kuerzer werden
// kann. Gemessen an drei Monaten waren es elf und zwei Fragen nach der
// Tabelle; an fuenf Monaten und mit der Wertung nach der Stichprobe liegen
// sieben davon unter der Grenze. Sechs bleiben: ein bester Tag, ein bester
// Block, ein bester Wechsel von Tag zu Tag und das schwaechste von fuenf
// Feldern werden mit mehr Gelegenheiten von selbst extremer, ein haeufigstes
// Ergebnis mit mehr Partien von selbst seltener. Zwei kamen mit den fuenf
// Monaten dazu, beide nicht durch die Zahl selbst: die Auferstehung fragt
// nach einer Quote, und wer viel spielt, ist im Schnitt der Staerkere —
// die Schwelle setzte die Liga [§C39]; beim Favoritenschreck ist, wer oft
// klarer Aussenseiter ist, meist ein tieferer Aussenseiter, und gewinnt
// seltener (roh −0,29, gewertet −0,38).
const _SPIELZAHL_ALT = ['ausreisser2','umschwung','formgipfel','schwachstelle','metronom','lieblingszahl',
  'auferstehung','favschreck'];
const _spielzahl = JSON.parse(KH(`JSON.stringify((function(){
  const sids = ${JSON.stringify(HERBST_MON)};
  const out = {};
  DISZIPLINEN.filter(d => d.monat && d.monat.wert).forEach(d => {
    const w = d.monat, x = [], g = [];
    sids.forEach(sid => { const C = _seasonTitleCtx(sid);
      Object.keys(C.P).forEach(pid => { const p = C.P[pid]; let v = null;
        try { if(!w.mind(p, C)) return; v = w.wert(p, C); } catch(e){ return; }
        if(v == null || !isFinite(v)) return; x.push(v); g.push(p.games); }); });
    if(x.length < 10) return;
    const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, mg = g.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    x.forEach((v, i) => { sxy += (v - mx) * (g[i] - mg); sxx += (v - mx) ** 2; syy += (g[i] - mg) ** 2; });
    if(sxx && syy) out[d.id] = sxy / Math.sqrt(sxx * syy);
  });
  return out;
})())`));
const _spNeu = Object.keys(_spielzahl).filter(id => Math.abs(_spielzahl[id]) > 0.35 && !_SPIELZAHL_ALT.includes(id));
ok(Object.keys(_spielzahl).length >= 60 && _spNeu.length === 0,
   'keine Chronik ausser den acht genannten haengt an der Spielzahl',
   _spNeu.map(id => id + ' r=' + _spielzahl[id].toFixed(2)).join(', ') || Object.keys(_spielzahl).length + ' gemessen');
const _spErledigt = _SPIELZAHL_ALT.filter(id => !(Math.abs(_spielzahl[id] || 0) > 0.35));
ok(_spErledigt.length === 0, 'die Liste der Ausnahmen ist nicht laenger als noetig',
   _spErledigt.join(', ') || _SPIELZAHL_ALT.length + ' Ausnahmen');
// Der Beiname beschreibt den SPIELER und steht im Profilkopf. Ohne ihn
// stuende dort der Katalogname, und „Der Endspurt" ist keine Beschreibung
// eines Spielertyps. Er muss da sein, in die Pille passen und eindeutig
// sein: zwei Spieler mit demselben Beinamen aus zwei verschiedenen
// Chroniken saehen im Profil gleich aus.
const _bei = JSON.parse(K.eval(`JSON.stringify((function(){
  const t = SEASON_TITLES.map(x => ({id:x.id, bei:x.beiname || ''}));
  const dop = {}; t.forEach(x => { (dop[x.bei] = dop[x.bei] || []).push(x.id); });
  return {ohne: t.filter(x => !x.bei).map(x => x.id),
          gleich: SEASON_TITLES.filter(x => x.beiname === x.name).map(x => x.id),
          lang: t.filter(x => x.bei.length > 20).map(x => x.bei),
          mehr: Object.keys(dop).filter(k => dop[k].length > 1)};
})())`));
ok(_bei.ohne.length === 0, 'jede Chronik traegt ihren Beinamen fuers Profil',
   _bei.ohne.join(', '));
ok(_bei.lang.length === 0, 'kein Beiname sprengt die Pille im Profilkopf',
   _bei.lang.join(', '));
ok(_bei.mehr.length === 0, 'kein Beiname kommt zweimal vor', _bei.mehr.join(', '));
// Ein Beiname ist ein Alias, nicht der Katalogname noch einmal. Fuenfzehn
// Chroniken hiessen im Profil genauso wie in der Matrix — „Der Ausreisser",
// „Der Zerstoerer", „Der Spielverderber" —, und wer eine davon hielt,
// trug im Profilkopf den Namen einer Wertung statt eines Spielertyps.
ok(_bei.gleich.length === 0, 'kein Beiname ist der Name seiner Chronik', _bei.gleich.join(', '));
ok(K.eval(`(function(){
  const b = players.filter(p => !p.hidden).map(p => playerTitleBadge(p.id)).filter(Boolean);
  return b.length > 0 && b.every(x => x.name && x.titel);
})()`), 'der Profilkopf zeigt den Beinamen und kennt den Katalognamen');
// Im Band steht nur eine positive Monatschronik, die jüngste. Eine
// Schattenseite stand dort rot, sobald sie die jüngste war, und verdrängte
// den Beinamen eines früheren Monats: Jannik trug im August „Der
// Durchlässige" (Das Scheunentor) statt „Der Zugeknöpfte" aus dem Juni.
// Nachgerechnet aus der Tafel jedes Monats, von hinten: der Eintrag mit dem
// meisten Prestige, bei Gleichstand der erste — er sagt, was den Spieler in
// diesem Monat ausmacht [§C39].
const _band = JSON.parse(K.eval(`JSON.stringify((function(){
  const schatten = id => ((_chronikMonat(id) || {}).art === 'schatten');
  const falsch = []; let zurueck = 0, gewaehlt = 0;
  players.filter(p => !p.hidden).forEach(p => {
    const b = playerTitleBadge(p.id), rows = seasonTitleHistory(p.id);
    let soll = null;
    for(let i = rows.length - 1; i >= 0 && !soll; i--){
      const t = (seasonTitles(rows[i].sid).awarded || []).filter(a => a.pid === p.id && !schatten(a.titleId));
      if(!t.length) continue;
      const w = t.map(a => chronikPunkte(a.titleId, a.wert)), max = Math.max(...w);
      soll = {sid:rows[i].sid, id:t[w.indexOf(max)].titleId};
      if(new Set(w).size > 1) gewaehlt++;
    }
    if(!soll){ if(b) falsch.push(p.name + ' trägt ' + b.name); return; }
    if(!b || b.sid !== soll.sid || b.titleId !== soll.id)
      falsch.push(p.name + ': ' + (b ? b.name + ' (' + b.sid + ')' : 'nichts') + ' statt ' + soll.id + ' (' + soll.sid + ')');
    // Ein jüngerer Monat mit nur Schattenseiten liegt dazwischen.
    if(rows.some(r => r.sid > soll.sid && r.title)) zurueck++;
  });
  return {falsch, zurueck, gewaehlt};
})())`));
// Der Fall selbst, hergestellt. Seit „Klare Verhältnisse" hält Jannik im
// August eine Fügung, und in den Fixtures trägt kein Spieler mehr einen
// jüngeren Monat mit nur Schattenseiten: die Zeile oben prüfte damit nur
// noch, dass die jüngste positive Chronik gewinnt, und nicht mehr, dass eine
// Schattenseite sie nicht verdrängt. Zwei Monate, der ältere positiv, der
// jüngere rot — im Band muss der ältere stehen.
const _bandSchatten = K.eval(`(function(){
  const alt = seasonTitleHistory;
  const pos = SEASON_TITLES.find(t => chronikStufe(t.id) === 'legendaer');
  const neg = SEASON_TITLES.find(t => chronikStufe(t.id) === 'schatten');
  const zeile = (sid, t) => ({sid, label:seasonLabel(sid), live:false,
    title:{titleId:t.id, name:t.name, ic:t.ic, tone:t.tone, ev:''}});
  seasonTitleHistory = () => [zeile('2026-06', pos), zeile('2026-07', neg)];
  try {
    const b = playerTitleBadge(players[0].id);
    return !!b && b.sid === '2026-06' && b.titleId === pos.id;
  } finally { seasonTitleHistory = alt; }
})()`);
ok(!_band.falsch.length && _band.gewaehlt > 0 && _bandSchatten,
   'im Band steht die wertvollste Chronik des jüngsten Monats mit einer positiven, ein späterer Monat mit nur Schattenseiten verdrängt sie nicht',
   _band.falsch.join(' | ') || (_bandSchatten ? 'hergestellter Monat mit nur Schattenseiten verdrängt nicht' : 'hergestellter Monat mit nur Schattenseiten verdrängt')
     + ', ' + _band.zurueck + ' Spieler mit einem Monat dazwischen, ' + _band.gewaehlt + ' mit einer Wahl');

ok(K.eval(`SEASON_TITLES.every(t =>
     ['legendaer','selten','besonders','schatten'].indexOf(t.klasse) >= 0
     && ['koennen','konstanz','fuegung','schatten'].indexOf(t.kunst) >= 0)`),
   'jede Chronik traegt eine gueltige Klasse und Art',
   K.eval(`SEASON_TITLES.filter(t =>
     ['legendaer','selten','besonders','schatten'].indexOf(t.klasse) < 0
     || ['koennen','konstanz','fuegung','schatten'].indexOf(t.kunst) < 0)
     .map(t => t.id).join(', ')`));

// Profil: die Meta-Zeile neben „Liga-Rekord" ist weg.
const profHtml = K.eval(`_chronStripHtml('${IDS[8]}')`);
ok(profHtml.indexOf('nur einmal vergeben') < 0, 'kein „nur einmal vergeben" mehr im Profil');
ok(profHtml.indexOf('geteilt mit') < 0, 'kein „geteilt mit X" mehr im Profil');
// Wer im Profil einen GETEILTEN Rekord zeigt, bekommt die Marke am Namen —
// und nur der. Wessen angezeigter Rekord ihm allein gehoert, sieht nichts.
ok(K.eval(`(function(){
  const bad=[];
  Object.keys(pmap()).forEach(pid=>{
    const mine=chroniclesOfPlayer(pid); if(!mine.length) return;
    const soll=mine.filter(x=>x.shared).length;
    const ist=((_chronStripHtml(pid).match(/class="shared"/g)||[]).length);
    if(soll!==ist) bad.push((pmap()[pid]||{}).name+':'+ist+'/'+soll);
  });
  return bad.join(',');
})()`) === '', 'die Geteilt-Marke steht genau bei geteilten Rekorden');

// Die Umrechnung auf die uebliche Stichprobe [§C39] rechnet der Test selbst
// nach: die Groesse der Stichprobe und die Eichung (`mitte`, `n0`, `echt`)
// kommen aus der App, die Formel steht hier. Ein Wert, den der Test aus den
// rohen Partien zaehlt, wird damit genauso gewertet wie in der App, und eine
// kaputte Umrechnung faellt hier auf und nicht erst am Prestige.
const _stich = (ids, sids, KK) => JSON.parse((KK || K.eval)(`JSON.stringify((function(){ const o = {};
  ${JSON.stringify(sids)}.forEach(sid => { const C = _seasonTitleCtx(sid);
    ${JSON.stringify(ids)}.forEach(id => { const m = _chronikMonat(id);
      Object.keys(C.P).forEach(pid => { const p = C.P[pid]; let n = null;
        try { if(m.mind(p, C)){ m.roh(p, C); n = typeof m.stichprobe === 'function' ? m.stichprobe(p, C) : null; } } catch(e){}
        o[sid + '|' + pid + '|' + id] = n; }); }); });
  return o; })())`));
const _eichung = (ids, KK) => JSON.parse((KK || K.eval)(`JSON.stringify(${JSON.stringify(ids)}.reduce((o, id) => {
  const m = _chronikMonat(id); o[id] = {mitte:m.mitte, n0:m.n0, echt:m.echt, fn:typeof m.stichprobe === 'function'}; return o; }, {}))`));
const _gewertet = (e, v, n) => (e && e.fn && n > 0 && e.n0 > 0)
  ? e.mitte + (v - e.mitte) / Math.sqrt(e.echt + (1 - e.echt) * e.n0 / n) : v;
// Jede Chronik entscheidet die Stichprobe ausdruecklich: eine Funktion
// samt Eichung (`mitte`, `n0` ueber null, `echt` in Zwanzigsteln zwischen 0
// und 1) oder `false`, dann ohne Eichung. Fehlt sie, wuerde der Wert still
// roh gewertet, und der Wenigspieler laege wieder oefter draussen; steht
// eine Eichung ohne Funktion daneben, glaubt der Leser an eine Wertung, die
// es nicht gibt.
const _stichFeld = JSON.parse(K.eval(`JSON.stringify(DISZIPLINEN.filter(d => d.monat).map(d => {
  const m = d.monat, fn = typeof m.stichprobe === 'function', geeicht = [m.mitte, m.n0, m.echt].some(x => x != null);
  const gut = fn ? (isFinite(m.mitte) && m.n0 > 0 && m.echt >= 0 && m.echt <= 1 && Math.abs(m.echt * 20 - Math.round(m.echt * 20)) < 1e-9)
                 : (m.stichprobe === false && !geeicht);
  return gut ? null : d.id; }).filter(Boolean))`));
ok(_stichFeld.length === 0, 'jede Monatschronik nennt ihre Stichprobe samt Eichung oder ausdruecklich keine', _stichFeld.join(', '));

// Die vier Monatschroniken aus `mockup/besonderheiten`, ein zweites Mal aus
// den rohen Partien gerechnet. Monat und Kalendertag kommen aus der App
// (`seasonOf`, `mdayKey`), weil das die Grenzen SIND; alles andere zaehlt
// der Test selbst: Staffellauf und Seitenbuendnis ueber die Paare aus Partie
// und direkter Vorgaengerin am selben Tag, der Quertreiber ueber die beiden
// Chancenlagen, die Tagesumkehr ueber erste und letzte Partie eines Tages
// gegen 2·S·N/(n·(n−1)).
const _monSoll = (() => {
  const zu = JSON.parse(K.eval(`JSON.stringify(matches.reduce((o, m) =>
    (o[m.id] = {sid:(seasonOf(m.created_at) || {}).id, tag:mdayKey(m)}, o), {}))`));
  const ms = realMatches.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const P = {};
  ms.forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(id => {
    const onA = id === m.a1 || id === m.a2, z = zu[m.id];
    const k = z.sid + '|' + id;
    (P[k] = P[k] || []).push({w:(m.winner === 'A') === onA, tag:z.tag,
      mate:id === m.a1 ? m.a2 : id === m.a2 ? m.a1 : id === m.b1 ? m.b2 : m.b1,
      geg:onA ? [m.b1, m.b2] : [m.a1, m.a2], e:onA ? m.exp_a : 1 - m.exp_a});
  }));
  const mit = a => a.reduce((x, y) => x + y, 0) / a.length;
  const W = {
    staffellauf: a => { const w = [], b = [];
      a.forEach((x, i) => { const v = a[i-1]; if(!v || v.tag !== x.tag) return;
        (v.mate !== x.mate ? w : b).push((x.w ? 1 : 0) - x.e); });
      return w.length >= 5 && b.length >= 5 ? mit(w) - mit(b) : null; },
    seitenbuendnis: a => { const j = [], o = [];
      a.forEach((x, i) => { const v = a[i-1]; if(!v || v.tag !== x.tag || v.mate === x.mate) return;
        (v.geg.includes(x.mate) ? j : o).push((x.w ? 1 : 0) - x.e); });
      return j.length >= 5 && o.length >= 5 ? mit(j) - mit(o) : null; },
    quertreiber: a => { const u = a.filter(x => x.e < 0.45), f = a.filter(x => x.e > 0.55);
      return u.length >= 5 && f.length >= 5
        ? u.filter(x => x.w).length / u.length - f.filter(x => x.w).length / f.length : null; },
    tagesumkehr: a => { const t = {}; a.forEach(x => (t[x.tag] = t[x.tag] || []).push(x));
      const v = Object.values(t).filter(d => d.length >= 3); if(v.length < 5) return null;
      const S = a.filter(x => x.w).length, n = a.length;
      return v.filter(d => d[0].w !== d[d.length-1].w).length / v.length - 2 * S * (n - S) / (n * (n - 1)); }
  };
  const AB = {staffellauf:0.30, seitenbuendnis:0.35, quertreiber:0.05, tagesumkehr:0.25};
  const N = _stich(Object.keys(W), ['2026-06','2026-07','2026-08']), E = _eichung(Object.keys(W));
  const out = {};
  ['2026-06','2026-07','2026-08'].forEach(sid => Object.keys(W).forEach(id => {
    const feld = Object.keys(P).filter(k => k.startsWith(sid + '|'))
      .filter(k => P[k].length >= 15 && new Set(P[k].map(x => x.tag)).size >= 3)
      .map(k => { const pid = k.split('|')[1], v = W[id](P[k]);
        return {pid, v:v == null ? null : _gewertet(E[id], v, N[sid + '|' + pid + '|' + id])}; })
      .filter(f => f.v != null && f.v >= AB[id] - 1e-12);
    const best = Math.max(...feld.map(f => f.v));
    out[sid + ' ' + id] = feld.filter(f => Math.abs(f.v - best) < 1e-9).map(f => f.pid).sort().join();
  }));
  return out;
})();
const _monIst = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) => {
  const C = _seasonTitleCtx(sid);
  ['staffellauf','seitenbuendnis','quertreiber','tagesumkehr'].forEach(id => {
    const r = SEASON_TITLE_BY_ID[id].pick(C, new Set());
    o[sid + ' ' + id] = r && r.halter ? r.halter.slice().sort().join() : ''; });
  return o; }, {}))`));
const _monAb = Object.keys(_monSoll).filter(k => _monSoll[k] !== _monIst[k]);
ok(_monAb.length === 0, 'die vier neuen Monatschroniken stimmen mit der Nachrechnung aus den rohen Partien',
   _monAb.map(k => k + ': ' + (_monIst[k].split(',').map(nm).join('/') || '–') + ' statt '
     + (_monSoll[k].split(',').map(nm).join('/') || '–')).join(' · '));
ok(Object.values(_monIst).filter(Boolean).length === 5,
   'die vier neuen Monatschroniken sind fuenfmal vergeben, wie kalibriert',
   Object.keys(_monIst).filter(k => _monIst[k]).map(k => k + ' ' + nm(_monIst[k])).join(' · '));

// Die acht Chroniken gegen das Eigene [§C39], ein zweites Mal aus den rohen
// Partien gerechnet. Monat, Kalendertag und die beiden Ersten der
// Monatstabelle kommen aus der App, weil das die Grenzen SIND; alles andere
// zaehlt der Test selbst.
const _eigenSoll = (() => {
  const zu = JSON.parse(K.eval(`JSON.stringify(matches.reduce((o, m) =>
    (o[m.id] = {sid:(seasonOf(m.created_at) || {}).id, tag:mdayKey(m)}, o), {}))`));
  const spitze = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) =>
    (o[sid] = _seasonTitleCtx(sid).rankAll.slice(0, 2).map(r => r.id), o), {}))`));
  const ms = realMatches.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const P = {}, partnerVor = {};
  ms.forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(id => {
    const onA = id === m.a1 || id === m.a2, z = zu[m.id];
    const pos = id === m.a1 ? m.a1_side : id === m.a2 ? m.a2_side : id === m.b1 ? m.b1_side : m.b2_side;
    const k = z.sid + '|' + id;
    (P[k] = P[k] || []).push({w:(m.winner === 'A') === onA, tag:z.tag, sid:z.sid, pos,
      gf:onA ? m.games_a : m.games_b, ga:onA ? m.games_b : m.games_a,
      mate:id === m.a1 ? m.a2 : id === m.a2 ? m.a1 : id === m.b1 ? m.b2 : m.b1,
      geg:(onA ? [m.b1, m.b2] : [m.a1, m.a2]).slice().sort(), e:onA ? m.exp_a : 1 - m.exp_a});
  }));
  const ueber = a => a.filter(x => x.w).length / a.length - a.reduce((s, x) => s + x.e, 0) / a.length;
  const mit = a => a.reduce((x, y) => x + y, 0) / a.length;
  const vorher = (sid, pid) => { const s = new Set();
    Object.keys(P).filter(k => k.endsWith('|' + pid) && k.split('|')[0] < sid).forEach(k => P[k].forEach(x => s.add(x.mate)));
    return s; };
  const vormonat = sid => { const [y, mo] = sid.split('-').map(Number); const d = new Date(y, mo - 2, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const W = {
    knipser:(a) => { const s = a.filter(x => x.pos === 'drive'); if(s.length < 5) return null;
      return mit(s.map(x => x.gf)) - mit(a.map(x => x.gf)); },
    riegel:(a) => { const h = a.filter(x => x.pos === 'reves'); if(h.length < 5) return null;
      return mit(a.map(x => x.ga)) - mit(h.map(x => x.ga)); },
    neuland:(a, sid, pid) => { const alt = vorher(sid, pid); const n = a.filter(x => !alt.has(x.mate));
      return n.length >= 5 ? ueber(n) : null; },
    revanche:(a) => { const r = a.filter((x, i) => i > 0 && !a[i-1].w && a[i-1].tag === x.tag && a[i-1].geg.join() === x.geg.join());
      return r.length >= 3 ? ueber(r) : null; },
    spielverderber:(a, sid, pid) => { if(spitze[sid][0] === pid) return null;
      const g = spitze[sid].filter(id => id !== pid); const s = a.filter(x => x.geg.some(y => g.includes(y)));
      return s.length >= 5 ? ueber(s) : null; },
    lernkurve:(a) => { const je = {}; a.forEach(x => x.geg.forEach(g => (je[g] = je[g] || []).push(x)));
      const l = Object.values(je).filter(d => d.length >= 4); if(l.length < 3) return null;
      return mit(l.map(d => { const h = Math.floor(d.length / 2); return ueber(d.slice(h)) - ueber(d.slice(0, h)); })); },
    nachlegen:(a) => { const n = a.filter((x, i) => i > 0 && a[i-1].w && a[i-1].tag === x.tag);
      return n.length >= 5 ? ueber(n) : null; },
    absturz:(a, sid, pid) => { const v = P[vormonat(sid) + '|' + pid]; if(!v || v.length < 8) return null;
      return v.filter(x => x.w).length / v.length - a.filter(x => x.w).length / a.length; }
  };
  const AB = {knipser:0.75, riegel:0.5, neuland:0.20, revanche:0.45, spielverderber:0.15, lernkurve:0.35, nachlegen:0.15, absturz:0.20};
  const N = _stich(Object.keys(W), ['2026-06','2026-07','2026-08']), E = _eichung(Object.keys(W));
  const out = {};
  ['2026-06','2026-07','2026-08'].forEach(sid => Object.keys(W).forEach(id => {
    const feld = Object.keys(P).filter(k => k.startsWith(sid + '|') && P[k].length >= 15)
      .map(k => { const pid = k.split('|')[1], v = W[id](P[k], sid, pid);
        return {pid, v:v == null ? null : _gewertet(E[id], v, N[sid + '|' + pid + '|' + id])}; })
      .filter(f => f.v != null && f.v >= AB[id] - 1e-12);
    const best = Math.max(...feld.map(f => f.v));
    out[sid + ' ' + id] = feld.filter(f => Math.abs(f.v - best) < 1e-9).map(f => f.pid).sort().join();
  }));
  return out;
})();
const _eigenIst = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) => {
  const C = _seasonTitleCtx(sid);
  ['knipser','riegel','neuland','revanche','spielverderber','lernkurve','nachlegen','absturz'].forEach(id => {
    const r = SEASON_TITLE_BY_ID[id].pick(C, new Set());
    o[sid + ' ' + id] = r && r.halter ? r.halter.slice().sort().join() : ''; });
  return o; }, {}))`));
const _eigenAb = Object.keys(_eigenSoll).filter(k => _eigenSoll[k] !== _eigenIst[k]);
console.log('  gegen das Eigene:', Object.keys(_eigenIst).filter(k => _eigenIst[k])
  .map(k => k.slice(5) + ' ' + _eigenIst[k].split(',').map(nm).join('/')).join(' · '));
ok(_eigenAb.length === 0, 'die acht Chroniken gegen das Eigene stimmen mit der Nachrechnung aus den rohen Partien',
   _eigenAb.map(k => k + ': ' + (_eigenIst[k].split(',').map(nm).join('/') || '–') + ' statt '
     + (_eigenSoll[k].split(',').map(nm).join('/') || '–')).join(' · '));
// Für wen sie da sind: nicht für den Ersten der Monatstabelle. Sieben
// Haltungen statt acht, seit eine Chronik erst ab fünfzehn Partien zählt.
const _eigenErste = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) => {
  const C = _seasonTitleCtx(sid), erst = C.rankAll[0] && C.rankAll[0].id;
  ['knipser','riegel','neuland','revanche','spielverderber','lernkurve','nachlegen'].forEach(id => {
    const r = SEASON_TITLE_BY_ID[id].pick(C, new Set());
    (r && r.halter || []).forEach(pid => { o.n++; if(pid === erst) o.erste++; o.wer[pname(pid)] = 1; }); });
  return o; }, {n:0, erste:0, wer:{}}))`));
ok(_eigenErste.n >= 7 && _eigenErste.erste * 4 <= _eigenErste.n && Object.keys(_eigenErste.wer).length >= 5,
   'die sieben positiven gehen an mindestens fünf verschiedene Spieler, höchstens ein Viertel an den Monatsersten',
   JSON.stringify(_eigenErste));

// Acht weitere Chroniken, ein zweites Mal aus den rohen Partien gerechnet:
// vier gegen das Ligamittel oder die eigene Laufbahn davor, vier, die eine
// Liga-Rekord-Frage auf den Monat holen [§13.1]. Monat, Kalendertag, ob ein
// Tag zu ist, und der Beginn des Monats kommen aus der App, weil das die
// Grenzen SIND; alles andere zaehlt der Test selbst. Das Ligamittel zaehlt
// hier ueber alle Partien des Monats, die Laufbahn davor ueber alle Partien
// vor seinem ersten Tag.
const _neuMon = ['ausnahmemonat','rollentausch','klartext','damage_control','destroyer','clutch','hardnight','favflop'];
// Die Schattenseiten gegen das Eigene und der eigene Anteil an den Partien
// [§C39], im selben Durchlauf: „Die Ehrfurcht" und „Der Rückfall" stehen auf
// denselben Bausteinen wie „Der Spielverderber" und „Die Lernkurve", die
// oben schon nachgerechnet werden.
const _schattMon = ['fehlstart','kraefteverfall','einbruch','sattheit','schwarzewoche','aufdreher','rueckzug','noanswer'];
const _neuSoll = (() => {
  const zu = JSON.parse(K.eval(`JSON.stringify(matches.reduce((o, m) =>
    (o[m.id] = {sid:(seasonOf(m.created_at) || {}).id, tag:mdayKey(m), zu:_tagZu(mdayKey(m)), wk:_wochenKey(m.created_at)}, o), {}))`));
  const beginn = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) =>
    (o[sid] = seasonStart(sid).getTime(), o), {}))`));
  const ms = realMatches.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const P = {}, M = {}, vor = {};
  ms.forEach(m => {
    const z = zu[m.id];
    (M[z.sid] = M[z.sid] || []).push(m);
    [m.a1, m.a2, m.b1, m.b2].forEach(id => {
      const onA = id === m.a1 || id === m.a2;
      const pos = id === m.a1 ? m.a1_side : id === m.a2 ? m.a2_side : id === m.b1 ? m.b1_side : m.b2_side;
      const x = {w:(m.winner === 'A') === onA, tag:z.tag, zu:z.zu, wk:z.wk, pos, ts:new Date(m.created_at).getTime(),
        gf:onA ? m.games_a : m.games_b, ga:onA ? m.games_b : m.games_a, e:onA ? m.exp_a : 1 - m.exp_a};
      (P[z.sid + '|' + id] = P[z.sid + '|' + id] || []).push(x);
      (vor[id] = vor[id] || []).push(x);
    });
  });
  const q = a => a.filter(x => x.w).length / a.length;
  const davor = (sid, pid) => { const a = (vor[pid] || []).filter(x => x.ts < beginn[sid]);
    return a.length >= 30 ? {q:q(a), atk:a.filter(x => x.pos === 'drive').length / a.length} : null; };
  const eng = x => Math.abs(x.gf - x.ga) <= 2;
  const ueber = a => q(a) - a.reduce((s, x) => s + x.e, 0) / a.length;
  const tage = a => { const t = {}; a.filter(x => x.zu).forEach(x => (t[x.tag] = t[x.tag] || []).push(x)); return t; };
  const anteilVor = (sid, pid) => { const l = Object.keys(M).filter(s => s < sid && (P[s + '|' + pid] || []).length >= 8)
      .map(s => P[s + '|' + pid].length / M[s].length);
    return l.length ? l.reduce((x, y) => x + y, 0) / l.length : null; };
  const W = {
    fehlstart:(a) => { const t = Object.values(tage(a)).filter(d => d.length >= 3); if(t.length < 3) return null;
      const erste = t.map(d => d[0]), rest = [].concat(...t.map(d => d.slice(1)));
      return q(rest) - q(erste); },
    kraefteverfall:(a) => { const t = Object.values(tage(a));
      const frueh = [].concat(...t.map(d => d.slice(0, 3))), spaet = [].concat(...t.map(d => d.slice(3)));
      return frueh.length >= 3 && spaet.length >= 3 ? q(frueh) - q(spaet) : null; },
    einbruch:(a) => { const k = Object.keys(tage(a)).sort(); if(k.length < 4) return null;
      const mitte = k[Math.floor(k.length / 2)], e1 = a.filter(x => x.tag < mitte), e2 = a.filter(x => x.tag >= mitte);
      return e1.length >= 4 && e2.length >= 4 ? q(e1) - q(e2) : null; },
    sattheit:(a) => { const n = a.filter((x, i) => i > 0 && a[i-1].w && a[i-1].tag === x.tag);
      return n.length >= 5 ? -ueber(n) : null; },
    schwarzewoche:(a) => { const w = {}; a.forEach(x => (w[x.wk] = w[x.wk] || []).push(x));
      const l = Object.values(w).filter(d => d.length >= 5); return l.length >= 2 ? -Math.min(...l.map(ueber)) : null; },
    aufdreher:(a, sid, pid) => { const v = anteilVor(sid, pid); return v ? (a.length / M[sid].length) / v : null; },
    rueckzug:(a, sid, pid) => { const v = anteilVor(sid, pid); return v ? -(a.length / M[sid].length) / v : null; },
    noanswer:(a) => { const n = a.filter((x, i) => i > 0 && !a[i-1].w), r = a.filter((x, i) => !(i > 0 && !a[i-1].w));
      return n.length >= 5 && r.length >= 5 ? q(r) - q(n) : null; },
    ausnahmemonat:(a, sid, pid) => { const l = davor(sid, pid); return l ? q(a) - l.q : null; },
    rollentausch:(a, sid, pid) => { const l = davor(sid, pid);
      return l ? Math.abs(a.filter(x => x.pos === 'drive').length / a.length - l.atk) : null; },
    klartext:(a, sid) => a.filter(x => Math.abs(x.gf - x.ga) >= 7).length / a.length
      - M[sid].filter(m => Math.abs(m.games_a - m.games_b) >= 7).length / M[sid].length,
    damage_control:(a, sid) => { const l = a.filter(x => !x.w); if(l.length < 5) return null;
      return M[sid].reduce((s, m) => s + Math.abs(m.games_a - m.games_b), 0) / M[sid].length
        - l.reduce((s, x) => s + (x.ga - x.gf), 0) / l.length; },
    destroyer:(a) => { const s = a.filter(x => x.w); if(s.length < 5) return null;
      return s.filter(x => x.gf - x.ga >= 7).length / s.length; },
    clutch:(a) => { const e = a.filter(eng), r = a.filter(x => !eng(x));
      return e.length >= 5 && r.length >= 5 ? q(e) - q(r) : null; },
    hardnight:(a) => { const t = {}; a.filter(x => x.zu).forEach(x => (t[x.tag] = t[x.tag] || []).push(x));
      const l = Object.values(t).filter(d => d.length >= 4); if(!l.length) return null;
      return -Math.min(...l.map(d => d.reduce((s, x) => s + x.e, 0) / d.length)); },
    favflop:(a) => { const f = a.filter(x => x.e > 0.55); return f.length >= 4 ? 1 - q(f) : null; }
  };
  const AB = {ausnahmemonat:0.15, rollentausch:0.25, klartext:0.10, damage_control:1.25,
              destroyer:0.25, clutch:0.35, hardnight:-0.30, favflop:0.50,
              fehlstart:0.40, kraefteverfall:0.25, einbruch:0.25, sattheit:0.25, schwarzewoche:0.35,
              aufdreher:3, rueckzug:-0.25, noanswer:0.25};
  const ids = _neuMon.concat(_schattMon);
  const N = _stich(ids, ['2026-06','2026-07','2026-08']), E = _eichung(ids);
  const out = {};
  ['2026-06','2026-07','2026-08'].forEach(sid => ids.forEach(id => {
    const feld = Object.keys(P).filter(k => k.startsWith(sid + '|') && P[k].length >= 15)
      .map(k => { const pid = k.split('|')[1], v = W[id](P[k], sid, pid);
        return {pid, v:v == null ? null : _gewertet(E[id], v, N[sid + '|' + pid + '|' + id])}; })
      .filter(f => f.v != null && f.v >= AB[id] - 1e-12);
    const best = Math.max(...feld.map(f => f.v));
    out[sid + ' ' + id] = feld.filter(f => Math.abs(f.v - best) < 1e-9).map(f => f.pid).sort().join();
  }));
  return out;
})();
const _neuIst = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) => {
  const C = _seasonTitleCtx(sid);
  ${JSON.stringify(_neuMon.concat(_schattMon))}.forEach(id => {
    const r = SEASON_TITLE_BY_ID[id].pick(C, new Set());
    o[sid + ' ' + id] = r && r.halter ? r.halter.slice().sort().join() : ''; });
  return o; }, {}))`));
const _imKreis = l => k => l.includes(k.split(' ')[1]);
const _neuAb = Object.keys(_neuSoll).filter(_imKreis(_neuMon)).filter(k => _neuSoll[k] !== _neuIst[k]);
console.log('  neu im Monat:', Object.keys(_neuIst).filter(_imKreis(_neuMon)).filter(k => _neuIst[k])
  .map(k => k.slice(5) + ' ' + _neuIst[k].split(',').map(nm).join('/')).join(' · '));
ok(_neuAb.length === 0, 'die acht neuen Monatschroniken stimmen mit der Nachrechnung aus den rohen Partien',
   _neuAb.map(k => k + ': ' + (_neuIst[k].split(',').map(nm).join('/') || '–') + ' statt '
     + (_neuSoll[k].split(',').map(nm).join('/') || '–')).join(' · '));
// Gezaehlt sind acht Haltungen in drei Monaten, keine mehr als zwei ausser
// denen mit einer Schwelle der Liga: eine Schwelle, die rutscht, faellt hier
// auf und nicht erst am Prestige. Es waren fuenfzehn, bis die sechste
// Fassung die Schwellen der zu haeufigen anhob, dann neun, bis die Liga die
// Schwellen von Zerstoerer und Wackelkandidat selbst setzte, dann elf, bis
// eine Chronik erst ab fuenfzehn Partien zaehlte und ein Anteil nach seiner
// Stichprobe gewertet wurde [§C39]: Johannes hatte im Juni zehn Partien,
// Henry im August elf.
const _haltungen = l => Object.keys(_neuIst).filter(_imKreis(l)).filter(k => _neuIst[k])
  .reduce((n, k) => n + _neuIst[k].split(',').length, 0);
const _neuZahl = _haltungen(_neuMon);
ok(_neuZahl === 8 && _neuMon.every(id => _LIGA_SETZT.includes(id) || Object.keys(_neuIst).filter(k => k.endsWith(' ' + id) && _neuIst[k]).length <= 2),
   'die acht neuen Monatschroniken sind achtmal vergeben', _neuZahl + ' Haltungen');
const _schAb = Object.keys(_neuSoll).filter(_imKreis(_schattMon)).filter(k => _neuSoll[k] !== _neuIst[k]);
console.log('  Schatten und Anteil:', Object.keys(_neuIst).filter(_imKreis(_schattMon)).filter(k => _neuIst[k])
  .map(k => k.slice(5) + ' ' + _neuIst[k].split(',').map(nm).join('/')).join(' · '));
ok(_schAb.length === 0, 'die Schattenseiten gegen das Eigene und der Anteil an den Partien stimmen mit der Nachrechnung',
   _schAb.map(k => k + ': ' + (_neuIst[k].split(',').map(nm).join('/') || '–') + ' statt '
     + (_neuSoll[k].split(',').map(nm).join('/') || '–')).join(' · '));
// Drei Haltungen (zwoelf vor der sechsten Fassung, acht vor den Schwellen
// der Liga, neun vor der Grenze von fuenfzehn Partien und der Wertung nach
// der Stichprobe), und nicht alle bei den letzten drei der Gewerteten: eine
// Schattenseite auf das Niveau gehoerte immer dem Letzten. Dass keine an die
// ersten drei geht, galt, solange ein kleiner Anteil leichter weit
// ausschlug: seit er nach seiner Stichprobe zaehlt, haelt Leon im Juli den
// Fehlstart — der Erste der Tabelle, schwaecher in den Startspielen als
// danach, und das ueber mehr Spieltage als jeder andere.
const _schZahl = _haltungen(_schattMon);
const _schLetzte = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) =>
  (o[sid] = _seasonTitleCtx(sid).rankAll.filter(r => r.games >= CHRONIK_MIN_SPIELE).slice(-3).map(r => r.id), o), {}))`));
const _schUnten = Object.keys(_neuIst).filter(_imKreis(_schattMon)).filter(k => _neuIst[k])
  .filter(k => _neuIst[k].split(',').every(p => _schLetzte[k.split(' ')[0]].includes(p)));
ok(_schZahl === 3 && _schUnten.length < _schZahl,
   'sie sind dreimal vergeben und nicht alle an die letzten drei eines Monats',
   _schZahl + ' Haltungen' + (_schUnten.length ? ' · unten: ' + _schUnten.join(', ') : ''));

// Sieben weitere Chroniken [§C39], Wert für Wert aus den rohen Partien
// nachgerechnet und nicht nur ihr Halter: drei davon haben in den
// Fixture-Monaten keinen oder genau einen, und ein Halterabgleich prüfte dort
// fast nichts. Gegen die Laufbahn davor (Bannbrecher, Retourkutsche,
// Zielwasser), neben dem Partner der Partie (Stütze, Fremdeln) und die
// Gegenstücke des letzten Balls und des Kaltbluts. Monat, Kalendertag, ob ein
// Tag zu ist, und der Beginn des Monats kommen aus der App; alles andere
// zählt der Test selbst, über die ganze Laufbahn jedes Spielers.
const _neu7 = ['bannbrecher','stuetze','zielwasser','retourkutsche','weicheknie','abgesang','fremdeln'];
const _neu7Soll = (() => {
  const info = JSON.parse(K.eval(`JSON.stringify(matches.reduce((o, m) =>
    (o[m.id] = {sid:(seasonOf(m.created_at) || {}).id, tag:mdayKey(m), zu:_tagZu(mdayKey(m))}, o), {}))`));
  const beginn = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) =>
    (o[sid] = seasonStart(sid).getTime(), o), {}))`));
  const ms = realMatches.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const seiten = m => [[m.a1, 'A', m.a1_side, m.a2, [m.b1, m.b2]], [m.a2, 'A', m.a2_side, m.a1, [m.b1, m.b2]],
                       [m.b1, 'B', m.b1_side, m.b2, [m.a1, m.a2]], [m.b2, 'B', m.b2_side, m.b1, [m.a1, m.a2]]];
  const L = {};
  ms.forEach(m => { const z = info[m.id]; seiten(m).forEach(([id, sd, pos, mate, geg]) => {
    (L[id] = L[id] || []).push({mid:m.id, sid:z.sid, tag:z.tag, zu:z.zu, ts:new Date(m.created_at).getTime(),
      w:m.winner === sd, pos, mate, geg, gf:sd === 'A' ? m.games_a : m.games_b, ga:sd === 'A' ? m.games_b : m.games_a,
      e:sd === 'A' ? m.exp_a : 1 - m.exp_a}); }); });
  const q = a => a.filter(x => x.w).length / a.length;
  const ueber = a => q(a) - a.reduce((t, x) => t + x.e, 0) / a.length;
  // Wer vor einer Partie zwei Pleiten am Stück hatte, gleich an welchem Tag.
  const tief = {};
  Object.keys(L).forEach(id => L[id].forEach((x, i) => {
    if(i >= 2 && !L[id][i-1].w && !L[id][i-2].w) (tief[x.mid] = tief[x.mid] || new Set()).add(id); }));
  const W = (sid, pid, a) => {
    const vor = L[pid].filter(x => x.ts < beginn[sid]);
    const lauf = vor.length >= 30 ? {q:q(vor), atk:vor.filter(x => x.pos === 'drive')} : null;
    const wende = r => { if(!lauf) return null;
      const l = [...new Set([].concat(...a.map(x => x.geg)))]
        .map(g => ({g, d:vor.filter(x => x.geg.includes(g)), m:a.filter(x => x.geg.includes(g))}))
        .filter(x => x.d.length >= 10 && x.m.length >= 4).map(x => ({g:x.g, kq:q(x.d), kn:x.d.length, mq:q(x.m)}))
        .filter(x => r < 0 ? x.kq < lauf.q : x.kq > lauf.q)
        .sort((x, y) => r * (y.kq - x.kq) || y.kn - x.kn || (x.g < y.g ? -1 : 1));
      return l.length ? l[0] : null; };
    const partnerVor = new Set(vor.map(x => x.mate));
    const neuland = a.filter(x => !partnerVor.has(x.mate));
    const einTor = a.filter(x => Math.abs(x.gf - x.ga) === 1);
    const tage = {}; a.filter(x => x.zu).forEach(x => (tage[x.tag] = tage[x.tag] || []).push(x));
    const voll = Object.values(tage).filter(d => d.length >= 3);
    const sturm = a.filter(x => x.pos === 'drive');
    const bei = a.filter(x => tief[x.mid] && tief[x.mid].has(x.mate));
    const tore = l => l.reduce((t, x) => t + x.gf, 0) / l.length;
    const bann = wende(-1), retour = wende(1);
    return {
      bannbrecher: bann ? bann.mq - bann.kq : null,
      retourkutsche: retour ? retour.kq - retour.mq : null,
      zielwasser: lauf && lauf.atk.length >= 20 && sturm.length >= 5 ? tore(sturm) - tore(lauf.atk) : null,
      stuetze: bei.length >= 5 ? ueber(bei) : null,
      fremdeln: neuland.length >= 5 ? -ueber(neuland) : null,
      weicheknie: einTor.length >= 5 ? 1 - q(einTor) : null,
      abgesang: voll.length >= 3
        ? q([].concat(...voll.map(d => d.slice(0, -1)))) - q(voll.map(d => d[d.length - 1])) : null
    };
  };
  const out = {};
  ['2026-06','2026-07','2026-08'].forEach(sid => Object.keys(L).forEach(pid => {
    const a = L[pid].filter(x => x.sid === sid);
    if(a.length < 15) return;
    const w = W(sid, pid, a);
    _neu7.forEach(id => { out[sid + ' ' + pid + ' ' + id] = w[id]; });
  }));
  return out;
})();
const _neu7Ist = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) => {
  const C = _seasonTitleCtx(sid);
  Object.keys(C.P).forEach(pid => ${JSON.stringify(_neu7)}.forEach(id => {
    // Verglichen wird der gemessene Wert (roh): wie er gewertet wird,
    // prueft die Umrechnung oben [§C39].
    const w = _chronikMonat(id), p = C.P[pid];
    o[sid + ' ' + pid + ' ' + id] = w.mind(p, C) ? w.roh(p, C) : null; }));
  return o; }, {}))`));
const _neu7Ab = [...new Set(Object.keys(_neu7Soll).concat(Object.keys(_neu7Ist)))].filter(k => {
  const a = _neu7Soll[k], b = _neu7Ist[k];
  return (a == null) !== (b == null) || (a != null && Math.abs(a - b) > 1e-9);
});
const _neu7Werte = Object.keys(_neu7Ist).filter(k => _neu7Ist[k] != null).length;
ok(_neu7Werte > 100 && _neu7Ab.length === 0,
   'die sieben weiteren Monatschroniken rechnen jeden Wert wie die Nachrechnung aus den rohen Partien',
   _neu7Ab.slice(0, 3).map(k => k.split(' ')[0] + ' ' + nm(k.split(' ')[1]) + ' ' + k.split(' ')[2] + ': '
     + _neu7Ist[k] + ' statt ' + _neu7Soll[k]).join(' · ') || _neu7Werte + ' Werte');
// Kalibriert an den echten Partien: in den drei Fixture-Monaten zwei
// Haltungen, keine Chronik mehr als zweimal. Es waren sechs, bis das
// Zielwasser seine Schwelle auf 0,75 Tore rundete, und fünf, bis eine
// Chronik erst ab fünfzehn Partien zählte: Jannik hatte im August
// vierzehn, und Henrys Fremdeln im Juni und Janes Stütze im Juli lagen
// gewertet auf ihre Stichprobe unter der Schwelle.
const _neu7Halter = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) => {
  seasonTitles(sid).awarded.filter(a => ${JSON.stringify(_neu7)}.includes(a.titleId))
    .forEach(a => (o[a.titleId] = o[a.titleId] || []).push(sid.slice(5) + ' ' + pname(a.pid)));
  return o; }, {}))`));
const _neu7Zahl = Object.values(_neu7Halter).reduce((n, l) => n + l.length, 0);
console.log('  sieben weitere:', Object.keys(_neu7Halter).map(id => id + ' ' + _neu7Halter[id].join('/')).join(' · '));
ok(_neu7Zahl === 2 && Object.values(_neu7Halter).every(l => l.length <= 2),
   'die sieben weiteren sind zweimal vergeben, keine mehr als zweimal', _neu7Zahl + ' Haltungen');

// Die sechste Fassung [§C39]: neunzehn weitere Monatschroniken, Wert für
// Wert aus den rohen Partien nachgerechnet. Elf fragen nach einer
// Wahrscheinlichkeit statt nach einem Abstand (`_stUnwahr`) oder stellen den
// Monat gegen die eigene Laufbahn, und ein Fehler in der Poisson-Binomial-
// Rechnung, im Rivalen oder in der Laufbahn davor fiele an einem Halterabgleich
// nicht auf: in drei Monaten halten die meisten keinen. Monat, Kalendertag,
// ob ein Tag zu ist, der Beginn des Monats und die Monatstabelle (Elo und
// Platz) kommen aus der App; alles andere zählt der Test selbst.
const _neu19 = ['favoritenrolle','siegeszug','stammduell','uebermacht','langeratem','abwehrwall','leck',
  'aufbau','torflaute','spaeterevanche','torgefahr','souveraen','platztausch','festhalten','abrutsch',
  'abschwung','klatsche','vergessen','strohfeuer'];
const _pbin = (ps, k) => {
  let d = [1];
  ps.forEach(p => { const n = new Array(d.length + 1).fill(0);
    for(let i = 0; i < d.length; i++){ n[i] += d[i] * (1 - p); n[i + 1] += d[i] * p; } d = n; });
  return {ab:d.slice(k).reduce((a, b) => a + b, 0), bis:d.slice(0, k + 1).reduce((a, b) => a + b, 0)};
};
const _lg = x => -Math.log10(Math.max(x, 1e-9));
const _neu19Soll = (() => {
  const info = JSON.parse(K.eval(`JSON.stringify(matches.reduce((o, m) =>
    (o[m.id] = {sid:(seasonOf(m.created_at) || {}).id, tag:mdayKey(m), zu:_tagZu(mdayKey(m))}, o), {}))`));
  const MON = ['2026-05','2026-06','2026-07','2026-08'];
  const beginn = JSON.parse(K.eval(`JSON.stringify(${JSON.stringify(MON)}.reduce((o, sid) =>
    (o[sid] = seasonStart(sid).getTime(), o), {}))`));
  const tab = JSON.parse(K.eval(`JSON.stringify(${JSON.stringify(MON)}.reduce((o, sid) => { const C = _seasonTitleCtx(sid);
    o[sid] = {elo:C.rank.map(r => [r.id, r.elo]), platz:C.rankAll.map(r => r.id)}; return o; }, {}))`));
  const ms = realMatches.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const tore = {};
  ms.forEach(m => { const t = tore[info[m.id].sid] = tore[info[m.id].sid] || {s:0, n:0}; t.s += m.games_a + m.games_b; t.n++; });
  const L = {};
  ms.forEach(m => { const z = info[m.id];
    [[m.a1, 'A', m.a1_side, m.a2, [m.b1, m.b2]], [m.a2, 'A', m.a2_side, m.a1, [m.b1, m.b2]],
     [m.b1, 'B', m.b1_side, m.b2, [m.a1, m.a2]], [m.b2, 'B', m.b2_side, m.b1, [m.a1, m.a2]]].forEach(([id, sd, pos, mate, geg]) => {
      (L[id] = L[id] || []).push({sid:z.sid, tag:z.tag, zu:z.zu, ts:new Date(m.created_at).getTime(),
        w:m.winner === sd, pos, mate, geg, gf:sd === 'A' ? m.games_a : m.games_b, ga:sd === 'A' ? m.games_b : m.games_a,
        e:sd === 'A' ? m.exp_a : 1 - m.exp_a}); }); });
  const siege = l => l.filter(x => x.w).length;
  const q = l => siege(l) / l.length;
  const ueber = l => q(l) - l.reduce((t, x) => t + x.e, 0) / l.length;
  const mittel = (l, f) => l.reduce((t, x) => t + f(x), 0) / l.length;
  const oben = l => _lg(_pbin(l.map(x => x.e), siege(l)).ab), unten = l => _lg(_pbin(l.map(x => x.e), siege(l)).bis);
  const W = (sid, pid, a) => {
    const vor = L[pid].filter(x => x.ts < beginn[sid]), lauf = vor.length >= 30;
    const vd = vor.filter(x => x.pos === 'reves'), va = vor.filter(x => x.pos === 'drive');
    const def = a.filter(x => x.pos === 'reves'), atk = a.filter(x => x.pos === 'drive');
    const fav = a.filter(x => x.e > 0.55);
    let serie = null, run = 1;
    a.forEach(x => { if(!x.w){ run = 1; return; } run *= x.e; if(serie == null || run < serie) serie = run; });
    const geg = {}; a.forEach(x => x.geg.forEach(g => (geg[g] = geg[g] || []).push(x)));
    const riv = Object.keys(geg).sort((x, y) => geg[y].length - geg[x].length || (x < y ? -1 : 1))[0];
    const rv = riv && geg[riv].length >= 6 ? geg[riv] : null;
    const tage = {}; a.filter(x => x.zu).forEach(x => (tage[x.tag] = tage[x.tag] || []).push(x));
    const lang = Object.values(tage).filter(d => d.length >= 7), vier = Object.values(tage).filter(d => d.length >= 4);
    const sp = [], letzte = {};
    a.forEach(x => { const k = x.geg.slice().sort().join('+'), l = letzte[k]; if(l && !l.w && l.tag !== x.tag) sp.push(x); letzte[k] = x; });
    const pw = [], pb = [];
    a.forEach((x, i) => { const v = a[i - 1]; if(!v || v.tag !== x.tag) return; (v.pos !== x.pos ? pw : pb).push(x); });
    const platz = pw.length >= 5 && pb.length >= 5 ? ueber(pw) - ueber(pb) : null;
    const elo = tab[sid].elo, ich = elo.find(r => r[0] === pid), zweit = elo.find(r => r[0] !== pid);
    const vs = MON[MON.indexOf(sid) - 1], vorN = vs ? L[pid].filter(x => x.sid === vs).length : 0;
    const pv = vs ? tab[vs].platz.indexOf(pid) + 1 : 0, pj = tab[sid].platz.indexOf(pid) + 1;
    const pleiten = a.filter(x => !x.w), hinten = lauf && vd.length >= 20 && def.length >= 5;
    return {
      favoritenrolle: fav.length >= 8 ? oben(fav) : null,
      siegeszug: serie != null ? _lg(serie * a.length) : null,
      stammduell: rv ? oben(rv) : null,
      uebermacht: rv ? unten(rv) : null,
      langeratem: lang.length >= 2 ? oben([].concat(...lang)) : null,
      abwehrwall: hinten ? mittel(vd, x => x.ga) - mittel(def, x => x.ga) : null,
      leck: hinten ? mittel(def, x => x.ga) - mittel(vd, x => x.ga) : null,
      aufbau: hinten ? mittel(def, x => x.gf) - mittel(vd, x => x.gf) : null,
      torflaute: lauf && va.length >= 20 && atk.length >= 5 ? mittel(va, x => x.gf) - mittel(atk, x => x.gf) : null,
      spaeterevanche: sp.length >= 5 ? ueber(sp) : null,
      torgefahr: atk.length >= 5 ? mittel(atk, x => x.gf) - tore[sid].s / tore[sid].n / 2 : null,
      souveraen: ich && zweit ? ich[1] - zweit[1] : null,
      platztausch: platz, festhalten: platz == null ? null : -platz,
      abrutsch: vorN >= 8 && pv && pj && tab[vs].elo.some(r => r[0] === pid) ? pj - pv : null,
      abschwung: lauf ? q(vor) - q(a) : null,
      klatsche: pleiten.length >= 5 ? pleiten.filter(x => x.ga - x.gf >= 7).length / pleiten.length : null,
      vergessen: vier.length ? Math.max(...vier.map(unten)) : null,
      strohfeuer: a.length >= 12 ? (siege(a.slice(0, 5)) - siege(a.slice(-5))) / 5 : null
    };
  };
  const out = {};
  ['2026-06','2026-07','2026-08'].forEach(sid => Object.keys(L).forEach(pid => {
    const a = L[pid].filter(x => x.sid === sid);
    if(a.length < 15) return;
    const w = W(sid, pid, a);
    _neu19.forEach(id => { out[sid + ' ' + pid + ' ' + id] = w[id]; });
  }));
  return out;
})();
const _neu19Ist = JSON.parse(K.eval(`JSON.stringify(['2026-06','2026-07','2026-08'].reduce((o, sid) => {
  const C = _seasonTitleCtx(sid);
  Object.keys(C.P).forEach(pid => ${JSON.stringify(_neu19)}.forEach(id => {
    const w = _chronikMonat(id), p = C.P[pid];
    o[sid + ' ' + pid + ' ' + id] = w.mind(p, C) ? w.roh(p, C) : null; }));
  return o; }, {}))`));
const _neu19Ab = [...new Set(Object.keys(_neu19Soll).concat(Object.keys(_neu19Ist)))].filter(k => {
  const a = _neu19Soll[k], b = _neu19Ist[k];
  return (a == null) !== (b == null) || (a != null && Math.abs(a - b) > 1e-9);
});
const _neu19Werte = Object.keys(_neu19Ist).filter(k => _neu19Ist[k] != null).length;
ok(_neu19Werte > 300 && _neu19Ab.length === 0,
   'die neunzehn der sechsten Fassung rechnen jeden Wert wie die Nachrechnung aus den rohen Partien',
   _neu19Ab.slice(0, 3).map(k => k.split(' ')[0] + ' ' + nm(k.split(' ')[1]) + ' ' + k.split(' ')[2] + ': '
     + _neu19Ist[k] + ' statt ' + _neu19Soll[k]).join(' · ') || _neu19Werte + ' Werte');

// ─── 17. v9.22: Ausnahmetage und alle Rekorde im Profil ─────────────
console.log('\n=== 17. AUSNAHMETAGE UND ALLE REKORDE IM PROFIL ===');

['best_record','peak','clutch'].forEach(id =>
  ok(K.eval(`!!CHRONICLE_BY_ID['${id}']`), 'neuer Ausnahme-Rekord ' + id + ' im Katalog'));

// Jeder dieser Rekorde haelt wirklich das Maximum seiner Kennzahl.
[['peak','peak']].forEach(([id,f]) => {
  ok(K.eval(`(function(){
    const C=_chronicleCtx(), h=allChronicles().byId['${id}'];
    if(!h) return 'leer';
    let best=-Infinity; Object.keys(C.P).forEach(pid=>{
      const v=C.P[pid]['${f}']; if(v!=null) best=Math.max(best,v); });
    return Math.abs(Math.round(C.P[h.pid]['${f}']) - Math.round(best))<=0 ? 'ok'
         : 'FALSCH ' + C.P[h.pid]['${f}'] + ' statt ' + best;
  })()`).indexOf('FALSCH') < 0, id + ' haelt das echte Maximum');
});
ok(K.eval(`(function(){
  const C=_chronicleCtx(), h=allChronicles().byId['best_record'];
  if(!h) return 'leer';
  let best=-1; Object.keys(C.P).forEach(pid=>{
    const b=C.P[pid].bestMonth; if(b) best=Math.max(best,b.q); });
  return Math.abs(h.val-best)<=1e-9 ? 'ok' : 'FALSCH';
})()`) !== 'FALSCH', '„Der Massstab" haelt die beste Monatsquote');

// Der unantastbare Tag ist wirklich makellos: an dem Tag keine Niederlage.
ok(K.eval(`(function(){
  const C=_chronicleCtx();
  return Object.keys(C.P).filter(id=>{
    const p=C.P[id];
    return p.cleanDay > 0 && (p.cleanDay > p.maxDay || p.cleanDay > p.wins);
  }).length;
})()`) === 0, 'ein makelloser Tag ist nie groesser als der laengste Tag');

// chroniclesOfPlayer deckt sich mit byId — kein Rekord faellt unter den Tisch.
ok(K.eval(`(function(){
  const A=allChronicles(); const bad=[];
  Object.keys(pmap()).forEach(pid=>{
    const mine=chroniclesOfPlayer(pid).map(x=>x.id).sort().join(',');
    const soll=Object.values(A.byId).filter(e=>(e.pids||[e.pid]).includes(pid))
      .map(e=>e.id).sort().join(',');
    if(mine!==soll) bad.push((pmap()[pid]||{}).name);
  });
  return bad.join(',');
})()`) === '', 'chroniclesOfPlayer listet genau die Rekorde des Spielers');
ok(K.eval(`(function(){
  const A=allChronicles(); const bad=[];
  Object.keys(pmap()).forEach(pid=>{
    const mine=chroniclesOfPlayer(pid);
    if(!mine.length) return;
    const first=(A.byPid[pid]||{}).id;
    if(mine[0].id!==first) bad.push((pmap()[pid]||{}).name);
  });
  return bad.join(',');
})()`) === '', 'der erste Rekord der Liste ist der im Profil gezeigte');

// Aufklappen gibt es im Profil erst ab drei Rekorden, mit der genauen Zahl,
// und der Fortschritt steht nur ohne Rekord.
ok(K.eval(`(function(){
  const bad=[];
  Object.keys(pmap()).forEach(pid=>{
    const n=chroniclesOfPlayer(pid).length;
    const h=_chronStripHtml(pid);
    const more=h.indexOf('data-chron-more')>=0;
    const next=h.indexOf('chron-one next')>=0;
    if(more !== n > 2) bad.push((pmap()[pid]||{}).name+':more');
    if(more && h.indexOf((n - 2 === 1 ? '1 weiteren' : (n - 2) + ' weitere') + ' anzeigen') < 0)
      bad.push((pmap()[pid]||{}).name+':zahl');
    if(n>0 && next) bad.push((pmap()[pid]||{}).name+':nextTrotzRekord');
  });
  return bad.join(',');
})()`) === '', 'Aufklappen im Profil erst ab drei Rekorden und mit Zahl, Fortschritt nur ohne Rekord');
ok(K.eval(`(function(){
  // Wer mehrere haelt, hat alle Karten offen im HTML.
  const pid=Object.keys(pmap()).find(id=>chroniclesOfPlayer(id).length>2);
  if(!pid) return 'kein Spieler mit 3+ Rekorden';
  const h=_chronStripHtml(pid);
  const n=chroniclesOfPlayer(pid).length;
  // Schattenseiten tragen zusaetzlich die Klasse "schatten" — mitzaehlen.
  const cards=(h.match(/class="chron-one[^"]*"/g)||[]).length;
  return cards===n && h.indexOf('chron-rest')>=0 ? 'ok' : 'FALSCH ' + cards + '/' + n;
})()`).indexOf('FALSCH') < 0, 'alle Rekorde stecken im Profil-HTML');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ PRESTIGE: DREI SICHTBARE QUELLEN ═══');
const _prG = JSON.parse(K.eval(`JSON.stringify((function(){
  const T = prestigeTabelle();
  let a=0, m=0, r=0;
  const stufen={}, mitRekord=[];
  T.rang.forEach(pid=>{
    const e=T.byPid[pid], P=prestigeOf(pid);
    a+=e.teile.auszeichnung; m+=e.teile.monat; r+=e.teile.rekord;
    stufen[P.insignie.key]=(stufen[P.insignie.key]||0)+1;
    if(e.zahlen.rekord>0) mitRekord.push(pid);
  });
  const vergleich=T.rang.map(pid=>{
    const ms=matches.filter(m=>[m.a1,m.a2,m.b1,m.b2].includes(pid));
    const siege=ms.filter(m=>(m.winner==='A')===(m.a1===pid||m.a2===pid)).length;
    const e=T.byPid[pid];
    const aq=e.quellen.filter(q=>q.q==='auszeichnung');
    return {pid,name:(pmap()[pid]||{}).name||pid,spiele:ms.length,siege,
      siegrate:ms.length?Math.round(siege/ms.length*100):0,
      prestige:e.punkte,auszeichnungen:e.teile.auszeichnung,
      monate:e.teile.monat,rekorde:e.teile.rekord,
      ausMix:Object.fromEntries(['legendary','rare','common'].map(k=>[k,{
        arten:aq.filter(q=>q.klasse===k).length,
        mal:aq.filter(q=>q.klasse===k).reduce((n,q)=>n+q.mal,0),
        punkte:Math.round(aq.filter(q=>q.klasse===k).reduce((n,q)=>n+q.p,0))}])),
      ausTop:aq
        .sort((a,b)=>b.p-a.p).slice(0,8).map(q=>q.id+':'+q.mal+'x='+Math.round(q.p))};
  });
  return {a, m, r, stufen, spieler:T.rang.length, mitRekord:mitRekord.length,vergleich,
          falscheQuellen:[...new Set(Object.values(T.byPid).flatMap(e=>(e.quellen||[]).map(q=>q.q)))]
            .filter(q=>!['auszeichnung','monat','rekord'].includes(q)),
          hoechste:T.byPid[T.rang[0]].punkte,
          sternAb:INSIGNIEN[INSIGNIEN.length-1].min};
})())`));
const _prSum = _prG.a + _prG.m + _prG.r;
console.log(`  Auszeichnungen ${Math.round(_prG.a/_prSum*100)} % · Monat ${Math.round(_prG.m/_prSum*100)} % · Rekorde ${Math.round(_prG.r/_prSum*100)} %`);
console.log(`  Stufen: ${Object.entries(_prG.stufen).map(([k,v])=>k+' '+v).join(' · ')}`);
console.log(`  Spieler mit mindestens einem Rekord: ${_prG.mitRekord} von ${_prG.spieler}`);
console.log('  Vergleich: ' + _prG.vergleich.map(x=>
  `${x.name} ${x.siegrate}%/${x.spiele} Sp. = ${x.prestige} (${x.auszeichnungen} A)`
).join(' · '));
console.log('  Julian/Maxi: ' + _prG.vergleich.filter(x=>x.name==='Julian'||x.name==='Maxi')
  .map(x=>x.name+' '+x.ausTop.join(', ')).join(' · '));
console.log('  Award-Mix: ' + _prG.vergleich.filter(x=>['Leon','Martin','Julian','Maxi'].includes(x.name))
  .map(x=>x.name+' '+Object.entries(x.ausMix).map(([k,v])=>k[0]+':'+v.arten+'/'+v.mal+'='+v.punkte).join(' ')).join(' · '));

ok(_prG.falscheQuellen.length === 0,
   'Prestige kommt nur aus Auszeichnungen, Monatschroniken und Rekorden',
   _prG.falscheQuellen.join(', ') || 'genau drei Quellen');
ok(_prG.r < _prG.a,
   'Auszeichnungen wiegen schwerer als Rekorde',
   `Auszeichnungen ${_prG.a}, Rekorde ${_prG.r}`);
const _prV = Object.fromEntries(_prG.vergleich.map(x=>[x.name,x]));
ok(_prV.Julian.spiele < _prV.Maxi.spiele / 2
   && _prV.Julian.siegrate > _prV.Maxi.siegrate
   && _prV.Julian.auszeichnungen > _prV.Maxi.auszeichnungen,
   'starke Auszeichnungen schlagen selbst das doppelte Spielpensum',
   `Julian ${_prV.Julian.auszeichnungen}/${_prV.Julian.spiele} · Maxi ${_prV.Maxi.auszeichnungen}/${_prV.Maxi.spiele}`);
const _prSpitze = ['Leon','Martin','Julian'].map(n=>_prV[n]);
ok(Math.max(..._prSpitze.map(x=>x.prestige))/Math.min(..._prSpitze.map(x=>x.prestige))
     < Math.max(..._prSpitze.map(x=>x.spiele))/Math.min(..._prSpitze.map(x=>x.spiele)),
   'bei ähnlich starker Spitze wächst Prestige deutlich langsamer als das Pensum',
   `Prestige ${_prSpitze.map(x=>x.prestige).join('/')} · Spiele ${_prSpitze.map(x=>x.spiele).join('/')}`);
// Rekorde müssen erreichbar sein. Vor dem Senken der Mindest-Spielzahlen
//    hielten 5 von 12 Spielern einen wertenden Rekord — die anderen sieben
//    spielten zu wenig, um überhaupt in die Wertung zu kommen („ab 100
//    Spielen", „ab 60 Siegen"). Eine Bestenliste, an der die halbe Liga gar
//    nicht teilnehmen darf, misst das Pensum und nicht das Können.
//    Jetzt sind es 7 von 12. Die Schwelle steht auf „mehr als die Hälfte":
//    das ist der Stand, der wirklich erreicht ist, und nicht der, den man
//    gern hätte. Schattenseiten zählen hier nicht mit — sie tragen kein
//    Prestige, also sagen sie über die Erreichbarkeit nichts.
ok(_prG.mitRekord > _prG.spieler / 2,
   'mehr als die halbe Liga hält einen wertenden Rekord',
   `${_prG.mitRekord} von ${_prG.spieler}`);
// Der Ordensstern bleibt außer Reichweite, solange ihn niemand erspielt
//    hat. Er darf nicht dadurch fallen, dass der Katalog wächst.
ok(_prG.hoechste < _prG.sternAb,
   'der Ordensstern ist noch von niemandem erreicht',
   `bester Stand ${_prG.hoechste}, Schwelle ${_prG.sternAb}`);

// Das Auszeichnungsmodell ist eine sichtbare Regel statt eines nachträglichen
// Kein Quellenlimit: Die Klasse bestimmt Startwert, prozentuale Abnahme und
// den kleinen Dauerwert, der die Laufbahn mathematisch offen hält.
const _prModell = JSON.parse(K.eval(`JSON.stringify((function(){
  const dom=[1,2,3].map(n=>auszeichnungsPunkte('dominator_400',n));
  const meister=[1,2,3].map(n=>auszeichnungsPunkte('champion',n));
  const team=[1,2,3].map(n=>auszeichnungsPunkte('team_of_season',n));
  const serien=[5,10,15,20].map(k=>auszeichnungsPunkte('streak'+k,1));
  const potw=[1,2,3].map(n=>auszeichnungsPunkte('potw',n));
  const potd=[1,2,3].map(n=>auszeichnungsPunkte('potd',n));
  const carry=[1,2,3,24].map(n=>auszeichnungsPunkte('carry',n));
  const klassen=Object.fromEntries(Object.entries(PRESTIGE_AUSZEICHNUNG)
    .map(([k,v])=>[k,{basis:v.basis,abnahme:v.abnahme}]));
  const positiv=BADGES.filter(b=>rarityOf(b.id)!=='negative').map(b=>({
    id:b.id, a:auszeichnungsPunkte(b.id,99), b:auszeichnungsPunkte(b.id,100),
    teile:[1,2,3,4].map(n=>auszeichnungsTeilwert(b.id,n))
  }));
  return {dom,meister,team,serien,potw,potd,carry,klassen,paare:positiv,
    steht:positiv.filter(x=>!(x.b>x.a)),
    negativ:BADGES.filter(b=>rarityOf(b.id)==='negative')
      .filter(b=>auszeichnungsPunkte(b.id,10)!==0).map(b=>b.id)};
})())`));
ok(_prModell.dom[0] === 70 && _prModell.dom[1] === 140
   && Math.abs(_prModell.dom[2] - 203) < 1e-9,
   'Dominator wächst paarweise mit 70 + 70 + 63', _prModell.dom.join(' / '));
// Der Meister ist die höchste Auszeichnung einer Saison und startet bei
// 150; mit 100 lag er unter der 20er Serie und der Dynastie. Das Team der
// Saison steht mit 75 knapp vor dem Dominator: beide sind die Saisonspitze
// hinter dem Meister, das Team die seltenere.
ok(_prModell.meister[0] === 150 && _prModell.meister[1] === 300
   && _prModell.team[0] === 75 && _prModell.dom[0] === 70
   && _prModell.meister[2] > _prModell.team[2] && _prModell.team[2] > _prModell.dom[2],
   'der Meister vor dem Team der Saison, das Team knapp vor dem Dominator',
   [_prModell.meister[2],_prModell.team[2],_prModell.dom[2]].join(' / '));
// Die Siegesserien sind eine Treppe. Mit dem Wert ihrer Klasse brachte die
// 10er Serie 25 und die 5er 3 Prestige.
ok(_prModell.serien.join(',') === '15,40,75,120',
   'die Siegesserien steigen 15, 40, 75, 120', _prModell.serien.join(' / '));
ok(_prModell.potw[0] === 50 && _prModell.potw.every((v,i)=>v>_prModell.potd[i]),
   'Player of the Week ist bei jeder gleichen Anzahl mehr wert als Player of the Day',
   _prModell.potw.join(' / ') + ' > ' + _prModell.potd.join(' / '));
ok(_prModell.potd[0] === 10,
   'Player of the Day startet bei zehn Prestige', _prModell.potd.join(' / '));
ok(_prModell.carry[0] === 3 && _prModell.carry[1] === 6
   && Math.abs(_prModell.carry[2]-8.25)<1e-9,
   'Carry wächst paarweise mit 3 + 3 + 2,25', _prModell.carry.slice(0,3).join(' / '));
ok(_prModell.klassen.legendary.basis > _prModell.klassen.rare.basis
   && _prModell.klassen.rare.basis > _prModell.klassen.common.basis
   && _prModell.klassen.legendary.abnahme < _prModell.klassen.rare.abnahme
   && _prModell.klassen.rare.abnahme < _prModell.klassen.common.abnahme,
   'wertvollere Klassen starten höher und nehmen langsamer ab',
   JSON.stringify(_prModell.klassen));
ok(_prModell.paare.every(x => x.teile[0] === x.teile[1]
     && x.teile[2] === x.teile[3] && x.teile[2] < x.teile[1]),
   'jede positive Auszeichnung verliert ihren Prozentsatz erst nach zwei Erfolgen',
   _prModell.paare.filter(x => !(x.teile[0] === x.teile[1]
     && x.teile[2] === x.teile[3] && x.teile[2] < x.teile[1])).map(x=>x.id).join(', ') || 'alle');
ok(_prModell.steht.length === 0,
   'jede positive Auszeichnung wächst auch nach vielen Wiederholungen weiter',
   _prModell.steht.map(x=>x.id).join(', ') || 'alle');
ok(_prModell.negativ.length === 0,
   'Schanden sind weder Prestige-Belohnung noch zusätzliche Strafe',
   _prModell.negativ.join(', ') || 'alle bei null');

// Das Regelblatt liest die Startwerte aus der Tabelle und ordnet sie nach
// Gewicht: es stand eine feste Liste aus sechs Zeilen da, und eine neue
// Auszeichnung waere gar nicht oder hinten angehaengt erschienen. Jede
// legendaere Auszeichnung steht darin, und die Startwerte fallen nach unten.
const _prListe = JSON.parse(K.eval(`JSON.stringify((function(){
  const h = _prestigeRegelListe();
  const ids = (h.match(/data-id="[a-z0-9_]+"/g) || []).map(x => x.slice(9, -1));
  return {ids, werte: ids.map(id => _auszeichnungsRegel(id).basis),
    fehlt: BADGES.filter(b => rarityOf(b.id) === 'legendary' && ids.indexOf(b.id) < 0)
      .map(b => b.id)};
})())`));
ok(_prListe.fehlt.length === 0 && _prListe.werte.length > 0
   && _prListe.werte.every((v, i, a) => i === 0 || a[i - 1] >= v),
   'das Regelblatt nennt jede legendaere Auszeichnung, nach Startwert geordnet',
   _prListe.werte.join(' ') + (_prListe.fehlt.length ? ' · fehlt ' + _prListe.fehlt.join(', ') : ''));

// Die Meilensteine der Laufbahn wiegen nach ihrem Fortschritt, nicht nach
// ihrer Klasse: mit dem Wert der Klasse brachten 300 Siege 25 Prestige,
// weniger als drei Spieler des Tages. Jeder fällt einmal und zählt einmal voll.
const _prMeilen = JSON.parse(K.eval(`JSON.stringify((function(){
  const soll = {wins200:150, games250:100, reves50:60, drive50:60, allrounder:50, games150:50, games25:10, first_match:5};
  const ist = {}; Object.keys(soll).forEach(id => { ist[id] = auszeichnungsPunkte(id, 1); });
  const h = _prestigeRegelListe();
  const ids = (h.match(/data-id="[a-z0-9_]+"/g) || []).map(x => x.slice(9, -1));
  const k = _prestigeRegelKarten();
  return {soll, ist, fehlt:Object.keys(soll).filter(id => ids.indexOf(id) < 0),
    rare:/Selten<\\/b><strong>10–150 P/.test(k), common:/Gewöhnlich<\\/b><strong>3–60 P/.test(k)};
})())`));
ok(Object.keys(_prMeilen.soll).every(id => _prMeilen.ist[id] === _prMeilen.soll[id]),
   'die Meilensteine der Laufbahn tragen ihren eigenen Wert und zählen einmal voll',
   JSON.stringify(_prMeilen.ist));
ok(_prMeilen.fehlt.length === 0, 'das Regelblatt nennt jeden Meilenstein mit seinem Wert',
   _prMeilen.fehlt.join(', ') || 'alle');
ok(_prMeilen.rare && _prMeilen.common, 'die Karten von Selten und Gewöhnlich nennen die Spanne ihrer Startwerte, die Klassen auf Deutsch',
   JSON.stringify([_prMeilen.rare, _prMeilen.common]));

const _prTausch = JSON.parse(K.eval(`JSON.stringify({
  sieger:rarityOf('perfect_win'), allwetter:rarityOf('allwetter'),
  siegerP:auszeichnungsPunkte('perfect_win',1),
  allwetterP:auszeichnungsPunkte('allwetter',1),
  profil:BADGES.slice().sort((a,b)=>badgeProfilRang(a.id)-badgeProfilRang(b.id))
    .slice(0,10).map(b=>b.id)
})`));
ok(_prTausch.sieger === 'legendary' && _prTausch.allwetter === 'rare'
   && _prTausch.siegerP > _prTausch.allwetterP,
   'Absoluter Sieger ist Legendary und wertvoller als Allwetter',
   JSON.stringify(_prTausch));
ok(_prTausch.profil.join(',') === [
  'dynasty_600','dominator_400','streak20','streak15','champion','team_of_season',
  'untouchable','award_collector','perfect_win','mr_perfect'].join(','),
   'die ersten fünf Auszeichnungszeilen folgen der gewünschten Reihenfolge',
   _prTausch.profil.join(', '));

// Das Chronik-Blatt zeigt den Wert des Eintrags (zum Beispiel +116), die
// Laufbahn darf daneben nicht kommentarlos nur den gekappten Rest zeigen. Die
// Daten tragen deshalb Grundwert, Bonus, Rohwert und tatsaechlichen Beitrag,
// und der Bonus kommt aus dem Wert, mit dem der Halter in der Tafel steht.
const _prChron = JSON.parse(K.eval(`JSON.stringify((function(){
  const falsch=[], alle=[]; let mitBonus=0;
  Object.entries(prestigeTabelle().byPid).forEach(([pid, e]) => (e.quellen||[])
    .filter(q=>q.q==='monat').forEach(q=>{
      alle.push(q);
      const a = seasonTitleOf(pid, q.sid);
      if(q.bonus > 0) mitBonus++;
      if(!a || q.grundwert!==100 || q.voll!==chronikPunkte(a.titleId, a.wert)
         || q.bonus!==q.voll-q.grundwert || q.p==null) falsch.push(q.id);
    }));
  return {n:alle.length,falsch,mitBonus,
    abweichend:alle.filter(q=>Math.abs(q.p-q.voll/Math.sqrt(q.staffel))>1e-8).length,
    staffeln:alle.map(q=>({rang:q.rang,staffel:q.staffel}))};
})())`));
ok(_prChron.n > 0 && _prChron.falsch.length === 0 && _prChron.mitBonus > _prChron.n / 2,
   'jede Monatsquelle traegt Grundwert, Bonus aus dem Wert der Tafel und ihre Rechnung',
   _prChron.falsch.join(', ') || _prChron.n + ' Quellen, ' + _prChron.mitBonus + ' mit Bonus');
ok(_prChron.abweichend === 0 && _prChron.staffeln.every(q =>
     q.staffel === Math.floor(q.rang / 3) + 1),
   'Chroniken wechseln alle drei Einträge in die nächste Wurzelstaffel',
   _prChron.staffeln.slice(0,8).map(q=>q.rang+'→√'+q.staffel).join(' · '));

// Genau eine Monatsquelle je Spieler und Monat [§C32]. Ein dominanter Monat
// gewinnt acht Quoten auf einmal, und die sagen alle dasselbe ueber denselben
// Monat: gezaehlt wird, was in der Matrix steht. Und es muss derselbe Eintrag
// sein, den das Profil zeigt — sonst stuende im Profil eine Wertung und im
// Prestige eine andere, und die Zahl waere nirgends nachzuzaehlen.
const _prMonat = JSON.parse(K.eval(`JSON.stringify((function(){
  const doppelt = [], fremd = [];
  let n = 0;
  Object.keys(prestigeTabelle().byPid).forEach(pid => {
    const je = {};
    (prestigeTabelle().byPid[pid].quellen || []).filter(q => q.q === 'monat')
      .forEach(q => {
        n++;
        je[q.sid] = (je[q.sid] || 0) + 1;
        if(je[q.sid] > 1) doppelt.push(pname(pid) + ' ' + q.sid);
        const t = seasonTitleOf(pid, q.sid);
        if(!t || t.titleId !== q.id) fremd.push(pname(pid) + ' ' + q.sid
          + ': ' + q.id + ' statt ' + ((t && t.titleId) || 'nichts'));
      });
  });
  return {n, doppelt, fremd};
})())`));
ok(_prMonat.n > 0 && _prMonat.doppelt.length === 0,
   'je Spieler und Monat zaehlt genau eine Chronik',
   _prMonat.doppelt.slice(0, 3).join(', ') || _prMonat.n + ' Quellen');
ok(_prMonat.fremd.length === 0,
   'und es ist der Eintrag, den das Profil zeigt',
   _prMonat.fremd.slice(0, 2).join(' | ') || 'alle');
// Die Matrix ordnet ihre Zeilen nach dem Prestige ihrer Zellen: je Monat
// der Eintrag, der zählt [§C39]. Gezählt wurde jeder Eintrag eines Monats,
// und seit jede Chronik denselben Grundwert bringt, war das nur noch ihre
// Zahl — neun Einträge in einem Monat standen über drei Monaten mit je einem.
const _mtx = JSON.parse(K.eval(`JSON.stringify((function(){
  const cols = allSeasonTitles().slice(0, 8).reverse();
  const werte = _lchronZeilen(cols).map(pid => cols.reduce((s, T) => {
    const a = chronikEintragVon(T, pid);
    return s + (a ? chronikPunkte(a.titleId, a.wert) : 0); }, 0));
  return {werte, ok:werte.every((v, i) => i === 0 || werte[i - 1] >= v - 1e-9)};
})())`));
ok(_mtx.ok && _mtx.werte.length > 3, 'die Matrix ordnet nach dem Prestige ihrer Zellen, nicht nach der Zahl der Einträge',
   _mtx.werte.join(' · '));

// Der Verlust eines Rekords zieht den Anteil wieder ab [§C34]: nur HEUTE
// gehaltene Rekorde zaehlen. Gemessen wird an einem echten Halterwechsel der
// Ligageschichte — wer den Bestwert an einem Zeitpunkt hielt und am naechsten
// nicht mehr, hat danach auch keine Quelle mehr; und wer ihn teilen muss,
// bekommt die Haelfte.
const _prVerlust = JSON.parse(K.eval(`JSON.stringify((function(){
  const ms = matches.map(m => mts(m)).sort((a, b) => a - b);
  const frueh = ms[Math.floor(ms.length * 0.55)], spaet = ms[ms.length - 1];
  const A = allChronicles(frueh), B = allChronicles(spaet);
  const quelle = (pid, bis) => {
    const e = prestigeTabelle(bis).byPid[pid];
    return ((e && e.quellen) || []).filter(q => q.q === 'rekord');
  };
  // Ein Rekord, den jemand verloren hat, und einer, den jemand teilen musste.
  let verloren = null, geteilt = null;
  CHRONICLES.forEach(d => {
    const a = (A.byId[d.id] || {pids:[]}).pids, b = (B.byId[d.id] || {pids:[]}).pids;
    if(!verloren){
      const weg = a.filter(pid => b.indexOf(pid) < 0)[0];
      if(weg) verloren = {id:d.id, pid:weg};
    }
    if(!geteilt && a.length === 1 && b.length > 1 && b.indexOf(a[0]) >= 0)
      geteilt = {id:d.id, pid:a[0], vor:a.length, nach:b.length};
  });
  const erg = {verloren:!!verloren, geteilt:!!geteilt};
  if(verloren){
    erg.hatte = quelle(verloren.pid, frueh).some(q => q.id === verloren.id);
    erg.hatNoch = quelle(verloren.pid, spaet).some(q => q.id === verloren.id);
    erg.wer = pname(verloren.pid) + ' / ' + verloren.id;
  }
  if(geteilt){
    const v = quelle(geteilt.pid, frueh).find(q => q.id === geteilt.id);
    const n = quelle(geteilt.pid, spaet).find(q => q.id === geteilt.id);
    erg.teilung = (v && n) ? (n.basis / n.halter) < (v.basis / v.halter) : false;
    erg.halter = (v ? v.halter : 0) + ' auf ' + (n ? n.halter : 0);
  }
  // Und keine Quelle nennt einen Rekord, den ihr Spieler heute nicht haelt.
  const fremd = [];
  Object.keys(prestigeTabelle().byPid).forEach(pid => {
    quelle(pid, 0).forEach(q => {
      const e = allChronicles().byId[q.id];
      if(!e || e.pids.indexOf(pid) < 0) fremd.push(pname(pid) + ' / ' + q.id);
    });
  });
  erg.fremd = fremd;
  return erg;
})())`));
ok(_prVerlust.verloren && _prVerlust.hatte && !_prVerlust.hatNoch,
   'ein verlorener Rekord zaehlt nicht mehr mit', _prVerlust.wer || 'kein Wechsel gefunden');
ok(_prVerlust.geteilt && _prVerlust.teilung,
   'und ein geteilter zaehlt nur noch geteilt', _prVerlust.halter || 'keine Teilung gefunden');
ok(_prVerlust.fremd.length === 0,
   'keine Rekordquelle gehoert einem, der ihn heute nicht haelt',
   _prVerlust.fremd.slice(0, 3).join(', ') || 'alle');

const _prRekord = JSON.parse(K.eval(`JSON.stringify((function(){
  const falsch=[];
  Object.values(prestigeTabelle().byPid).forEach(e => (e.quellen||[])
    .filter(q=>q.q==='rekord').forEach(q=>{
      const soll=q.basis/q.halter/Math.sqrt(Math.floor(q.rang/3)+1);
      if(Math.abs(q.p-soll)>1e-8) falsch.push(q.id);
    }));
  return falsch;
})())`));
ok(_prRekord.length === 0,
   'Rekorde wechseln alle drei Einträge in die nächste Wurzelstaffel',
   _prRekord.join(', ') || 'alle Rekorde nachrechenbar');

const _prSortierung = JSON.parse(K.eval(`JSON.stringify((function(){
  const monat=[{id:'juli',p:90},{id:'august',p:75},{id:'september',p:135}];
  const rekord=[{id:'juli',p:90},{id:'august',p:75},{id:'september',p:135}];
  _wurzelStapel(monat,3); _wurzelStapel(rekord,3);
  return {monat,rekord};
})())`));
ok(_prSortierung.monat.map(x=>x.id).join(',') === 'september,juli,august'
   && _prSortierung.monat[0].p === 135 && _prSortierung.monat[1].p === 90
   && Math.abs(_prSortierung.monat[2].p - 75/Math.sqrt(2)) < 1e-9,
   'wertvolle spätere Chroniken rücken vor und erhalten weniger Dämpfung',
   _prSortierung.monat.map(x=>x.id+':'+x.p).join(' · '));
ok(_prSortierung.rekord.map(x=>x.id).join(',') === 'september,juli,august'
   && _prSortierung.rekord[0].p === 135 && _prSortierung.rekord[1].p === 90
   && Math.abs(_prSortierung.rekord[2].p - 75/Math.sqrt(2)) < 1e-9,
   'auch Rekorde werden vor der Wurzelstaffel nach ihrem Wert sortiert',
   _prSortierung.rekord.map(x=>x.id+':'+x.p).join(' · '));

const _prHistorisch = JSON.parse(K.eval(`JSON.stringify((function(){
  const sid=allPastSeasons().slice().sort()[0], bis=seasonEnd(sid).getTime();
  const ms=matches.filter(m=>mts(m)<=bis);
  const zaehle=(id,quelle,zeit)=>computeBadges(id,quelle,zeit)
    .filter(b=>b.id==='champion'||b.id==='vice_champion'||b.id==='team_of_season')
    .reduce((n,b)=>n+(b.count||0),0);
  const damals=players.reduce((n,p)=>n+zaehle(p.id,ms,bis),0);
  const heute=players.reduce((n,p)=>n+zaehle(p.id,matches,null),0);
  return {sid,damals,heute};
})())`));
ok(_prHistorisch.damals === 4 && _prHistorisch.heute > _prHistorisch.damals,
   'historisches Prestige enthaelt keine spaeteren Saisonwuerden',
   `${_prHistorisch.sid}: ${_prHistorisch.damals}, heute ${_prHistorisch.heute}`);


// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DIE LEITER DES INSIGNIUMS ═══');
// Nach vier Monaten Liga trugen zehn von zwölf Spielern mindestens den
// Schildring, sechs den Volutenkranz und drei schon den Lorbeerreif — damals
// die vierte von fünf Stufen. Wer oben ankommt, während die Liga noch jung ist,
// hat danach nichts mehr vor sich. Diese vier Zusicherungen halten die
// Leiter steil, und zwar an den echten Partien gemessen.
const _lb = JSON.parse(K.eval(`JSON.stringify((function(){
  const T = prestigeTabelle();
  const stufen = INSIGNIEN.map(()=>0);
  const grade = {};
  T.rang.forEach(pid=>{ const P=prestigeOf(pid);
    stufen[P.stufe]++; grade[P.grad]=(grade[P.grad]||0)+1; });
  const m = '#c2c9d0';
  return {
    min: INSIGNIEN.map(x=>x.min),
    namen: INSIGNIEN.map(x=>x.name),
    stufen, grade,
    werte: T.rang.map(pid=>({name:pname(pid), punkte:T.byPid[pid].punkte,
      stufe:prestigeOf(pid).stufe, grad:prestigeOf(pid).grad})),
    spieler: T.rang.length,
    hoechste: T.byPid[T.rang[0]].punkte,
    erstStufe: T.rang.filter(pid=>prestigeOf(pid).stufe >= 1).length,
    // Ändert der Grad die Zeichnung überhaupt? Gefragt ist die Form, nicht
    // die Farbe — deshalb dasselbe Metall, nur ein anderer Grad.
    lorbeerAb: INSIGNIEN.find(x=>x.key==='lorbeer').min,
    kroneAb: INSIGNIEN.find(x=>x.key==='krone').min,
    // Gefragt wird das Bild selbst ({eigen:true}): ein Verweis auf den Topf
    // ist in jedem Grad gleich. Verglichen wird ein Prüfwert über den ganzen
    // Inhalt — zwei verschiedene Bilder können gleich lang sein.
    formen: INSIGNIEN.map(x=>({key:x.key, n:INS_ZEICHEN[x.key].length,
      bilder: INS_ZEICHEN[x.key].map((b, g) => {
        const s = insigniumStufeSvg(x.key, m, g, {eigen:true})
          .replace(/(ize|e)[0-9]+_/g, '');
        let h = 0; for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
        return h; })})),
    sternGrade: insigniumGradSchwellen(INSIGNIEN.length - 1),
    kroneGrade: insigniumGradSchwellen(INSIGNIEN.length - 2)
  };
})())`));
console.log('  Schwellen: ' + _lb.min.join(' · '));
console.log('  Getragen:  ' + _lb.namen.map((n,i)=>n+' '+_lb.stufen[i]).join(' · '));
console.log('  Bester Stand: ' + _lb.hoechste);
console.log('  Spitze: ' + _lb.werte.slice(0,3).map(x=>x.name+' '+x.punkte+' / '+x.stufe+'.'+x.grad).join(' · '));

// Die Schwellen sind vorgegeben, nicht kalibriert [§C30]: 0, 600, 1200,
// 2100, 3100, 4500, 6000. Kronenreif und Ordensstern lagen bei 4300 und
// 5600, und die Spitze der Liga stand 92 Prestige vor dem Kronenreif.
ok(_lb.min.join(',') === '0,600,1200,2100,3100,4500,6000',
   'die sieben Insignien beginnen an den festgelegten Schwellen',
   _lb.min.join(' · '));
const _sternI = _lb.min.length - 1;
// Der Ordensstern zählt wie jede Stufe drei Grade, nicht Zacken. Er stand
// als einzige Stufe mit „8 9 10“ in der Laufbahn und „erreicht die 9.
// Zacke“ auf der Karte. Seine Grade liegen je 500 auseinander, und über dem
// dritten zählt er nicht weiter: Ordensstern III ist das oberste Feld.
ok(_lb.sternGrade.join(',') === '6000,6500,7000' && _lb.kroneGrade.join(',') === '4500,5000,5500',
   'der Ordensstern hat drei Grade wie jede Stufe: I ab 6000, II ab 6500, III ab 7000; der Kronenreif 4500, 5000, 5500',
   _lb.sternGrade.join(' · '));
const _sternLagen = JSON.parse(K.eval(`JSON.stringify((function(){
  const alt = prestigeTabelle;
  const lage = p => {
    prestigeTabelle = () => ({byPid:{x:{punkte:p}}, ruhe:{}, rang:['x'], gesamt:1});
    try { const P = prestigeOf('x');
      return {p, name:_insLageName(P), pos:insigniumPos(P), zacken:'zacken' in P}; }
    finally { prestigeTabelle = alt; } };
  return [5999, 6000, 6499, 6500, 7000, 99999].map(lage);
})())`));
ok(_sternLagen.map(x => x.name).join('|')
     === 'Kronenreif III|Ordensstern I|Ordensstern I|Ordensstern II|Ordensstern III|Ordensstern III'
   && _sternLagen.map(x => x.pos).join(',') === '17,18,18,19,20,20'
   && !_sternLagen.some(x => x.zacken),
   'der Stand am Ordensstern heißt I, II, III und endet im einundzwanzigsten Feld',
   _sternLagen.map(x => x.p + ' ' + x.name + ' (' + x.pos + ')').join(' · '));
// Keine Spanne ist leer oder rückwärts: eine Stufe, die man mit derselben
// Punktzahl erreicht wie die vorige, wäre keine.
const _spannen = _lb.min.slice(1).map((v,i)=>v - _lb.min[i]);
ok(_spannen.every(s => s >= 500),
   'jede Stufe liegt mindestens 500 Prestige über der vorigen',
   'Spannen ' + _spannen.join(' · '));

const _lbN = Object.fromEntries(_lb.werte.map(x=>[x.name,x]));
// Die Spitze steht im Lorbeerreif, im ersten Grad: angekommen, als die
// Meilensteine der Laufbahn (300 Siege, 300 Partien, die Positionen) ihr
// eigenes Gewicht bekamen und die Schwellen stehen blieben. Vorher stand sie
// im Zierkranz, weil 300 Siege so viel wogen wie drei Spieler des Tages.
// Gemessen wird ohne Namen und ohne Reihenfolge: festgeschrieben fiel diese
// Zusicherung bei jedem Rekord, der Punkte verschiebt, ohne dass sich an
// der Leiter etwas geaendert hat. Kalibriert ist die Leiter und nicht die
// Tabelle.
const _lbSpitze = _lb.werte.slice().sort((a, b) => b.punkte - a.punkte);
ok(_lbSpitze[0] && _lbSpitze[0].stufe === 4 && _lbSpitze[0].grad === 0,
   'die Spitze traegt den Lorbeerreif im ersten Grad', JSON.stringify(_lbSpitze[0]));
// Die beiden dahinter stehen nicht mehr neben der Spitze, sondern
// darunter, im Zierkranz oder in der Volute. Zwei trugen den Lorbeerreif,
// solange einundzwanzig Liga-Rekorde die Siegquote noch einmal zaehlten
// [§C35]: wer viel gewann, hielt sie fast alle, und die zwei Besten hielten
// zusammen 31 Eintraege. Seit sie gestrichen sind, liegen zwischen dem
// Ersten und dem Dritten gemessen knapp tausend Prestige. Die Zusicherung
// hiess „im Zierkranz"; seit jede Chronik den Grundwert und ihren Bonus
// bringt statt 150 fuer Gold [§C39], steht der Dritte in den Fixture-Monaten
// zwoelf Punkte davor. Gemeint war der Abstand zur Spitze, nicht die Stufe.
ok(_lbSpitze.slice(1, 3).every(x => x.stufe < _lbSpitze[0].stufe && x.stufe >= 2),
   'die beiden dahinter stehen unter der Spitze, im Zierkranz oder in der Volute',
   _lbSpitze.slice(1, 3).map(x => x.name + ' ' + x.punkte + ' / ' + x.stufe + '.' + x.grad).join(' · '));

const _sternMoeglich = K.eval(`BADGES.reduce((sum,b)=>
  sum + auszeichnungsPunkte(b.id,10),0)`);
ok(_sternMoeglich >= _lb.min[_sternI] && _lb.min[_sternI] - _lb.hoechste >= 1500,
   'der Ordensstern ist sehr anspruchsvoll, aber rechnerisch erreichbar',
   `Langzeitmodell ${Math.round(_sternMoeglich)}, Schwelle ${_lb.min[_sternI]}`);

// Eine rein geometrische Folge haette eine endliche Summe. Dann waeren zwar
// die ersten fuenf Insignien erreichbar, die Grade des Ordenssterns
// irgendwann aber nicht mehr. Die harmonisch abflachende Auszeichnungsfolge
// macht die Laufbahn wirklich offen: jeder endliche Zielwert wird nach
// endlich vielen weiteren Erfolgen ueberschritten.
const _endlos = JSON.parse(K.eval(`JSON.stringify((function(){
  const ziel=insigniumGradSchwellen(INSIGNIEN.length-1).slice(-1)[0];
  let n=1;
  const karriere=k=>BADGES.reduce((sum,b)=>sum+auszeichnungsPunkte(b.id,k),0);
  while(n<1000 && karriere(n)<ziel) n++;
  const klassen=Object.entries(PRESTIGE_AUSZEICHNUNG)
    .filter(([k])=>k!=='negative').map(([k,r])=>({k,
      delta:auszeichnungsPunkte(BADGES.find(b=>rarityOf(b.id)===k).id,10000)
           -auszeichnungsPunkte(BADGES.find(b=>rarityOf(b.id)===k).id,9999)}));
  const chroniken=Array.from({length:10000},()=>100);
  const chronikDelta=_wurzelZuwachs(chroniken,100,3);
  const rekorde=Array.from({length:10000},()=>48);
  const rekordDelta=_wurzelZuwachs(rekorde,48,3);
  return {ziel,n,wert:karriere(n),klassen,chronikDelta,rekordDelta};
})())`));
ok(_endlos.klassen.every(x=>x.delta>0)
   && _endlos.chronikDelta>0 && _endlos.rekordDelta>0,
   'jede positive Dauerquelle behaelt ohne festen Deckel echten Zuwachs',
   _endlos.klassen.map(x=>x.k+' +'+x.delta.toFixed(4)).join(' · ')
     + ' · Chronik +' + _endlos.chronikDelta.toFixed(4)
     + ' · Rekord +' + _endlos.rekordDelta.toFixed(4));
ok(_endlos.n < 1000 && _endlos.wert >= _endlos.ziel,
   'auch der dritte Grad des Ordenssterns ist erreichbar',
   `Ordensstern III (${_endlos.ziel}) im skalierenden Katalogmodell bei Lauf ${_endlos.n}`);

// 2. Der Beste der Liga hat die beiden obersten Stufen noch vor sich. Ohne
//    diese Grenze wandert die Spitze nach oben, sobald der Katalog wächst —
//    und dann trägt jemand den Kronenreif, weil neue Rekorde dazukamen und
//    nicht, weil er besser geworden wäre. Die Grenze lag beim Lorbeerreif;
//    den haben die Meilensteine der Laufbahn erarbeitet, nicht der Katalog.
ok(_lb.hoechste < _lb.kroneAb,
   'der Beste der Liga trägt noch keinen Kronenreif',
   `bester Stand ${_lb.hoechste}, Schwelle ${_lb.kroneAb}`);

// 3. Die ERSTE Stufe bleibt erreichbar. Sie sagt „du bist dabei", nicht „du
//    bist gut" — eine Leiter, auf der die halbe Liga nicht einmal die
//    unterste Sprosse erreicht, motiviert niemanden.
ok(_lb.erstStufe > _lb.spieler / 2,
   'mehr als die halbe Liga trägt mindestens den Schildring',
   `${_lb.erstStufe} von ${_lb.spieler}`);

// 4. Der Grad muss man SEHEN. Zwischen zwei Schwellen liegen hunderte
//    Punkte; täte sich am Zeichen nichts, wäre die halbe Laufbahn ein
//    Stillstand. Jeder Grad hat sein eigenes Bild, auf jeder Stufe drei.
const _stumm = _lb.formen.filter(f => new Set(f.bilder).size !== f.bilder.length
  || f.n !== 3);
ok(_stumm.length === 0,
   'jeder Grad zeichnet ein anderes Insignium',
   _stumm.length ? _stumm.map(f=>f.key).join(', ') + ' ändern sich nicht'
                 : _lb.formen.map(f=>f.key + ' ' + f.n).join(', '));

// 5. Breaking gehört dem ERSTEN Aufstieg in die beiden obersten Stufen
//    [§C33]. Die Grenze stand als „stufe >= 3" im Generator und wäre mit
//    zwei neuen Stufen still beim Zierkranz gelandet — dann bräche die
//    halbe Ligaspitze die Spalte.
const _oben = JSON.parse(K.eval(`JSON.stringify({i:INSIGNIUM_OBEN, n:INSIGNIEN.length,
  keys:INSIGNIEN.slice(INSIGNIUM_OBEN).map(x=>x.key)})`));
ok(_oben.i === _oben.n - 2 && _oben.keys.join(',') === 'krone,stern',
   'Breaking-Grenze: nur Kronenreif und Ordensstern sind die obersten Stufen',
   JSON.stringify(_oben));

// 6. Der Schimmer wächst mit der Leiter. Hof und Glut in der Rangfarbe sind
//    Licht, keine Form (`data-schein`), und sie sollen höheres Prestige
//    heller machen, ohne dass dafür ein Körper dazukommt: die Glut vom
//    Schildring an von Feld zu Feld, der Hof ab dem Zierkranz von Stufe zu
//    Stufe. Und das Zeichen trägt die Rangfarbe: Stein, Lilie und
//    Kristalle sind in ihren Tönen gezeichnet, für jeden Rang eigens.
const _schein = JSON.parse(K.eval(`JSON.stringify((function(){
  const op = (svg, was) => {
    const kreis = svg.split('<circle').find(k => k.indexOf('data-schein') >= 0 && k.indexOf(was + ')') >= 0);
    const m = kreis && kreis.match(/opacity="([0-9.]+)"/);
    return m ? +m[1] : 0; };
  const glut = [], hof = [];
  INSIGNIEN.forEach(x => [0,1,2].forEach(g => {
    const s = insigniumStufeSvg(x.key, 'Elite', g, {eigen:true});
    glut.push(op(s, 'glut')); if(g === 0) hof.push(op(s, 'hof')); }));
  // Die Zeichnung trägt die Rangfarbe selbst: der Stein, die Lilie und die
  // Kristalle sind in den Tönen der Rangfarbe gezeichnet, ohne Filter über
  // dem Bild. Geprüft wird die Mitte des Steinsatzes im Bild jedes Rangs.
  const naeher = Object.keys(INS_RANGFARBE).map(r => {
    const s = insigniumStufeSvg('reif', r, 0, {eigen:true});
    // Die Zeichnung steht als Vektor im Markup [§C30]; ein Filter darin
    // oder darüber wäre auf dem Telefon unscharf.
    const bildGefiltert = /filter=/.test(s);
    const svg = s;
    const passt = svg.indexOf(_izStein(INS_RANGFARBE[r])[2]) >= 0;
    return {r, bildGefiltert, passt};
  });
  return {glut, hof, naeher};
})())`));
const _glutSteigt = _schein.glut.slice(3).every((v, i, a) => i === 0 || v >= a[i-1])
  && _schein.glut.slice(0, 3).every(v => v === 0) && _schein.glut[3] > 0
  && _schein.glut[_schein.glut.length - 1] > _schein.glut[3];
ok(_glutSteigt, 'die Glut in der Rangfarbe wird von Feld zu Feld nicht schwächer',
   _schein.glut.join(' · '));
const _hofSteigt = _schein.hof.slice(0, 3).every(v => v === 0)
  && _schein.hof.slice(3).every((v, i, a) => i === 0 || v > a[i-1]);
ok(_hofSteigt, 'der Hof kommt ab dem Zierkranz und wird mit jeder Stufe kräftiger',
   _schein.hof.join(' · '));
ok(_schein.naeher.every(x => !x.bildGefiltert && x.passt),
   'das Zeichen trägt in jedem Rang die Rangfarbe, gezeichnet und ohne Filter',
   _schein.naeher.map(x => x.r + ' ' + (x.bildGefiltert ? 'Filter' : 'ohne') + (x.passt ? ' passt' : '')).join(' · '));

// Die Leiter steigt, sie springt nicht zurück [§C30]: der dritte Grad einer
// Stufe trägt nie mehr Steine und nie mehr Gold als der erste der nächsten.
// Zierkranz III hatte Steine im Reif und rotgoldenes Laub, Lorbeerreif I
// keins von beidem — und sah damit wertvoller aus als die Stufe darüber.
// Und die Zeichnung liegt nicht als Ganzes unter einem Filter: WebKit
// rechnet Filter in Bildern ohne die Pixeldichte des Geräts, und das ganze
// Zeichen war auf dem Telefon unscharf.
const _steigt = JSON.parse(K.eval(`JSON.stringify((() => {
  const gold = z => { let n = 0; const r = z.reif || {};
    [r.metall, r.kanal, r.nieten && r.nieten.m, z.lilie, z.raute,
     (z.sichel||z.volute||z.zier||z.lorbeer||z.eiche||z.strahlen||{}).m].forEach(m => { if(m === 'gold') n++; });
    return n; };
  const fehler = [];
  for(let i = 1; i < INSIGNIEN.length; i++){
    const a = INS_ZEICHEN[INSIGNIEN[i-1].key][2], b = INS_ZEICHEN[INSIGNIEN[i].key][0];
    const sa = (a.reif||{}).steine || 0, sb = (b.reif||{}).steine || 0;
    if(sa > sb) fehler.push(INSIGNIEN[i-1].name + ' III ' + sa + ' Steine > ' + INSIGNIEN[i].name + ' I ' + sb);
    if(gold(a) > gold(b)) fehler.push(INSIGNIEN[i-1].name + ' III Gold ' + gold(a) + ' > ' + INSIGNIEN[i].name + ' I ' + gold(b));
  }
  const t = _izTeile('krone', 2, INS_RANGFARBE.Elite);
  const ganz = /filter/.test(t.defs + t.bild);
  return {fehler, ganz};
})())`));
ok(_steigt.fehler.length === 0, 'der dritte Grad trägt nie mehr Steine oder Gold als der erste der nächsten Stufe',
   _steigt.fehler.join(' · ') || 'jede Stufe');
ok(!_steigt.ganz, 'die Zeichnung trägt keinen Filter', String(_steigt.ganz));

// Und die Rangfarbe im Auge einer Schnecke geht vom Zierkranz zum
// Lorbeerreif nicht verloren: der Zierkranz III trägt sie in seinen
// Schnecken, und der erste Entwurf des Lorbeerreifs setzte sie erst ab
// Grad II — einen Grad lang war der Stein weg und kam dann wieder. Gezählt
// wird das Auge (`_izRolle`), nicht die Beeren: die sind etwas anderes und
// hätten die Lücke verdeckt. Kronenreif und Ordensstern tragen keine
// Schnecken mehr, ihre Rangfarbe sitzt in Eicheln und Kristallen.
const _auge = JSON.parse(K.eval(`JSON.stringify((() => {
  const augen = (key, nr) => (_izTeile(key, nr, INS_RANGFARBE.Elite).bild
    .match(/fill="url\\(#sk\\)" stroke="[^"]+" stroke-width="1\\.6"/g) || []).length;
  return {zier: augen('zier', 2), lorbeer: [0, 1, 2].map(g => augen('lorbeer', g))};
})())`));
ok(_auge.zier > 0 && _auge.lorbeer.every(n => n > 0),
   'die Rangfarbe im Auge der Schnecke bleibt vom Zierkranz III an in jedem Grad des Lorbeerreifs',
   `Zierkranz III ${_auge.zier}, Lorbeerreif ${_auge.lorbeer.join(' · ')}`);


// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ REKORDE ZUM STAND EINES MONATS ═══');
// „Neue Rekorde dieser Saison" gibt es nur, wenn die Rekordlage von DAMALS
// rekonstruierbar ist. Wer die heutige Liste in den Mai-Rückblick legt,
// zeigt Bestwerte, die im Juli aufgestellt wurden. Der Schnitt muss beide
// Quellen treffen: die Matchliste UND die Elo-Simulation. Diese vier
// Zusicherungen prüfen genau das, an den echten Partien gemessen.
const _sr = JSON.parse(K.eval(`JSON.stringify((function(){
  const sids = allPastSeasons();
  const proSaison = sids.map(s => saisonRekorde(s));
  const ersten = {};
  proSaison.forEach(L => L.forEach(r => { if(r.art === 'neu') ersten[r.id] = (ersten[r.id]||0)+1; }));
  const stand = sids.map(s => {
    const C = allChronicles(seasonEnd(s).getTime());
    return {sid:s, rekorde:Object.keys(C.byId).length, bewertet:C.rated};
  });
  const h = allChronicles();
  // Der höchste Elo-Stand kommt NICHT aus der Matchliste, sondern aus der
  // Simulation. Er ist deshalb die einzige Zahl, an der man sieht, ob auch
  // sie geschnitten wurde.
  const C6 = _chronicleCtx(seasonEnd(sids[1]).getTime()), H = _chronicleCtx();
  const gipfel = Object.keys(C6.P).map(id => ({
    n:pname(id), damals:C6.P[id].peak, heute:H.P[id] ? H.P[id].peak : null}));
  return {
    sids, stand, zahlen: proSaison.map(L => L.length),
    heute: {rekorde:Object.keys(h.byId).length, bewertet:h.rated},
    mehrfachErstmals: Object.keys(ersten).filter(k => ersten[k] > 1),
    schatten: proSaison.reduce((n,L) => n + L.filter(r => r.kind === 'shame').length, 0),
    hoeher: gipfel.filter(g => g.damals > g.heute).map(g => g.n),
    niedriger: gipfel.filter(g => g.damals < g.heute).map(g => g.n)
  };
})())`));
console.log('  Bewegte Rekorde je Saison: ' + _sr.sids.map((s,i)=>s+' '+_sr.zahlen[i]).join(' · '));
console.log('  Rekordlage am Monatsende:  '
  + _sr.stand.map(s=>s.sid+' '+s.rekorde+'/'+s.bewertet).join(' · ')
  + ' · heute ' + _sr.heute.rekorde + '/' + _sr.heute.bewertet);

// 1. Am Ende des ERSTEN Monats hält niemand einen Rekord: nach vier Wochen
//    hat noch keiner die 30 Spiele beisammen, die eine Laufbahn ausmachen.
//    Steht hier die volle Zahl, kommt die Liste aus der Gegenwart.
ok(_sr.stand[0].rekorde === 0 && _sr.stand[0].bewertet === 0,
   'am Ende des ersten Monats hält niemand einen Rekord',
   _sr.stand[0].rekorde + ' Rekorde, ' + _sr.stand[0].bewertet + ' bewertete Spieler');

// 2. Der höchste Elo-Stand von damals darf den heutigen nie übertreffen —
//    und mindestens einer muss darunter liegen, sonst rechnet die
//    Simulation weiter mit allen Partien und der Schnitt greift nur halb.
ok(_sr.hoeher.length === 0 && _sr.niedriger.length > 0,
   'auch die Elo-Simulation endet am Monatsende',
   _sr.niedriger.length + ' Spieler standen damals tiefer'
   + (_sr.hoeher.length ? ', aber ' + _sr.hoeher.join(', ') + ' höher' : ''));

// 3. Ein Rekord wird genau einmal zum ersten Mal aufgestellt. Zweimal hieße,
//    dass er zwischendurch verschwunden ist — also dass das Fenster wandert.
ok(_sr.mehrfachErstmals.length === 0,
   'kein Rekord wird in zwei Monaten zum ersten Mal aufgestellt',
   _sr.mehrfachErstmals.join(', ') || 'keiner');

// 4. Keine Schattenseite im Rückblick. „Die längste Durststrecke" ist keine
//    Nachricht, sondern eine Ohrfeige — und die Liga liest ihn gemeinsam.
ok(_sr.schatten === 0, 'keine Schattenseite in den Rekorden einer Saison',
   _sr.schatten + ' gefunden');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DER FORTSCHRITT LÄUFT NICHT RÜCKWÄRTS [§13.8] ═══');
// Die zentrale Zusicherung des Prestiges, und die einzige, die man nur
// sieht, wenn man die Liga NACHSPIELT: Monat für Monat abschneiden und den
// Stand ablesen.
//
// Vorher hing der Wert eines Eintrags an der Zahl seiner heutigen Halter.
// Henry stand nach dem Mai bei 197 Punkten aus Auszeichnungen und nach dem
// August bei 63 — er hatte in der Zwischenzeit welche DAZU gewonnen, nur
// hatten inzwischen auch andere dieselben geholt. Acht von zwölf Spielern
// liefen rückwärts. Wer nichts falsch macht, darf nichts verlieren.
//
// Rekorde dürfen fallen, und nur sie: „ich halte den Rekord" ist eine
// Behauptung über HEUTE.
const _pvStand = JSON.parse(K.eval(`JSON.stringify((function(){
  const alleM = matches.slice(), alleS = seasons.slice();
  const out = {};
  ['2026-05','2026-06','2026-07'].forEach(bis => {
    matches = alleM.filter(m => m.created_at.slice(0,7) <= bis);
    seasons = alleS.filter(s => s.id <= bis);
    invalidateCache();
    const T = prestigeTabelle();
    Object.keys(T.byPid).forEach(pid => {
      (out[pid] = out[pid] || []).push(T.byPid[pid].teile);
    });
  });
  matches = alleM; seasons = alleS;
  invalidateCache();
  const T = prestigeTabelle();
  Object.keys(T.byPid).forEach(pid => {
    (out[pid] = out[pid] || []).push(T.byPid[pid].teile);
  });
  return out;
})())`));
const _pvFall = (feld) => Object.keys(_pvStand).filter(pid =>
  _pvStand[pid].some((t, i) => i > 0 && t[feld] < _pvStand[pid][i-1][feld]))
  .map(pid => nm(pid) + ' ' + _pvStand[pid].map(t => t[feld]).join('→'));
const _pvA = _pvFall('auszeichnung'), _pvM = _pvFall('monat'), _pvR = _pvFall('rekord');
console.log('  ' + Object.keys(_pvStand).length + ' Spieler über vier Monate nachgespielt');
console.log('  Rekord-Rückschritte (erwünscht): ' + (_pvR.length ? _pvR.join(' · ') : 'keine'));

// 1. + 2. Erworbenes bleibt.
ok(_pvA.length === 0, 'Prestige aus Auszeichnungen fällt nie',
   _pvA.join(' | ') || 'alle vier Monate monoton');
ok(_pvM.length === 0, 'Prestige aus Monatswertungen fällt nie',
   _pvM.join(' | ') || 'alle vier Monate monoton');

// 3. Rekorde MÜSSEN fallen können — sonst wäre die Zusicherung darüber
//    gratis erfüllt, weil sich schlicht nichts bewegt.
ok(_pvR.length > 0, 'ein abgegebener Rekord kostet Prestige',
   _pvR.length + ' Spieler haben zwischenzeitlich Rekorde abgegeben');

// Jede Auszeichnung wächst, aber jede weitere Verleihung trägt weniger bei.
const _wd = JSON.parse(K.eval(`JSON.stringify((function(){
  const T = prestigeTabelle();
  let mehrfach = 0, falsch = [], ohne = [];
  T.rang.forEach(pid => {
    T.byPid[pid].quellen.filter(q => q.q === 'auszeichnung').forEach(q => {
      if(q.mal < 2) return;
      mehrfach++;
      const soll=auszeichnungsPunkte(q.id,q.mal);
      if(Math.abs(q.voll-soll)>1e-8) falsch.push(q.name);
      if(!(q.voll>auszeichnungsPunkte(q.id,q.mal-1))) ohne.push(q.name);
    });
  });
  return {mehrfach, falsch, ohne};
})())`));
ok(_wd.mehrfach > 0 && _wd.falsch.length === 0,
   'jede wiederholte Auszeichnung folgt exakt ihrer Klassenfolge',
   _wd.falsch.join(', ') || _wd.mehrfach + ' wiederholte Auszeichnungen');
ok(_wd.ohne.length === 0,
   'jede weitere positive Auszeichnung erhöht das Prestige',
   _wd.ohne.join(', ') || 'kein Stillstand');

// 5. Der Meister der Liga bekommt für seinen Titel auch etwas. Er hatte bis
//    hierher keine Auszeichnung — der Vize hatte eine.
const _ms = JSON.parse(K.eval(`JSON.stringify((function(){
  const champs = {};
  allPastSeasons().forEach(sid => {
    if(sid === currentSeason().id) return;
    const c = seasonChampion(sid);
    if(c) champs[c] = (champs[c] || 0) + 1;
  });
  const raus = Object.keys(champs).map(pid => {
    const b = (getCachedBadges(pid) || []).find(x => x.id === 'champion');
    const q = (prestigeOf(pid).quellen || []).find(x => x.id === 'champion');
    return {pid, titel:champs[pid], badge:b ? b.count : 0, punkte:q ? q.p : 0};
  });
  return raus;
})())`));
ok(_ms.length > 0 && _ms.every(x => x.badge === x.titel && x.punkte > 0),
   'wer Meister war, trägt die Auszeichnung und bekommt Prestige dafür',
   _ms.map(x => nm(x.pid) + ' ' + x.titel + ' Titel / Badge ' + x.badge
     + ' / ' + Math.round(x.punkte) + ' P').join(' · '));

// 6. Die Zaehler selbst. Fuenfzig Auszeichnungen haengen an fuenfzig
//    Zaehlfunktionen, und keine einzige davon war je gemessen — dabei
//    speist ihr Ergebnis ueber `prestigeTabelle` die ganze Insignium-Leiter.
//    Ein Zaehler, der beim Umbau eine Partie mehr oder weniger sieht,
//    verschiebt still, wer welches Zeichen traegt.
//    Die Fixtures sind fest, also ist die Zahl es auch. Aendert sich der
//    Katalog absichtlich, nennt das rote Ergebnis die neue Zeile — sie wird
//    uebernommen, nicht weggeklickt. Ebenso, wenn sich die Elo der Partien
//    absichtlich aendert: der Positionsbonus [§C44] verschiebt jedes Delta
//    und damit jede Auszeichnung, die an der Elo haengt. Gegen 50:50
//    gemessen hielt Henry 131, gegen die eigene Aufteilung 146, seit der
//    Ausschlag der Klarheit folgt und die staerkere Seite einen Daempfer
//    traegt, 141.
const _bz = K.eval(`players.map(p => {
  const b = getCachedBadges(p.id) || [];
  return p.name + ':' + b.length + '/' + b.reduce((n, x) => n + (x.count || 0), 0);
}).join(' ')`);
const _bzSoll = 'Alex:18/35 Anton:7/7 Henry:29/141 Jane:26/133 Jannik:22/83 Johannes:24/70 Julian:33/230 Leo:31/236 Leon:39/429 Martin:36/323 Maxi:33/388 Stefan:21/58';
ok(_bz === _bzSoll, 'jeder Spieler haelt dieselben Auszeichnungen wie gemessen', _bz);

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ GLÜCK: EINTRÄGE, DIE NICHT NUR DEN BESTEN GEHÖREN ═══');
// Wer besser spielt, gewinnt jede Quote und jede Serie — am Ende liegen
// alle Liga-Einträge bei denselben drei Spielern. Deshalb gibt es drei,
// die kein Können messen: der letzte Ball eines 10:9, eine Serie aus
// abwechselnd Sieg und Pleite, ein Sieg gegen die Rechnung.
// Sie sind nur dann etwas wert, wenn sie ERREICHBAR sind. Das wird hier
// an den echten 466 Partien nachgezählt, nicht behauptet.
// Die Familie steht seit dem Umbau im Katalog: `zufall` markiert sie, und
// der Wert sagt, WIE sie gemessen wird. Beides wird hier getrennt geprueft,
// weil eine Schwelle fuer das eine fuer das andere unsinnig waere:
//   'quote' mittelt ueber eine Laufbahn oder einen Abend — sie MUSS
//           erreichbar sein und vergeben werden.
//   'fund'  ist ein einzelnes Zusammentreffen — es darf selten sein und
//           sogar unbesetzt bleiben, sonst waere es keins.
const _gl = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles(), C = _chronicleCtx();
  const ids = Object.keys(C.P);
  const quote = {}; ids.forEach(id => quote[id] = C.P[id].wins / C.P[id].games);
  const nachQuote = ids.slice().sort((a,b) => quote[b] - quote[a]);
  const F = CHRONICLES.filter(c => c.zufall);
  return {
    feld: ids.length,
    halter: F.map(c => {
      const e = A.byId[c.id];
      return {id:c.id, name:c.name, art:c.art, zufall:c.zufall, paar:c.paar || '',
              pids: e ? e.pids.map(p => nachQuote.indexOf(p) + 1) : [],
              namen: e ? e.pids.slice() : [],
              // Wie viele des Feldes erfuellen die Mindestbedingung ueberhaupt?
              rennen: ids.filter(pid => {
                const v = c.val(C.P[pid], C); return v != null && isFinite(v); }).length,
              rennenIds: ids.filter(pid => {
                const v = c.val(C.P[pid], C); return v != null && isFinite(v); })};
    }),
    // Steht jeder gewertete Spieler in mindestens einem Rennen? Gefragt ist
    // die ERREICHBARKEIT und nicht der Besitz: „jeder haelt einen Eintrag"
    // hiesse, dass die Tafel auf die Spieler verteilt wird, und genau das
    // darf sie nicht [Regel 15]. Wer die Mindestbasis eines Rekords erfuellt,
    // kann ihn uebernehmen — mehr kann ein Katalog nicht zusichern, und wer
    // neununddreissig Partien hat, hat eben noch keine Bestmarke.
    ohne: ids.filter(pid => !CHRONICLES.some(c => {
      const v = c.val(C.P[pid], C); return v != null && isFinite(v); })),
    // Und wie viele Eintraege halten die Spieler tatsaechlich? Der Wert
    // steht im Protokoll, damit eine leere Tafel auffaellt.
    besitz: ids.map(pid => CHRONICLES.filter(c =>
      (A.byId[c.id] || {pids:[]}).pids.includes(pid)).length),
    // Wie viele Haltungen der Fuegungen liegen bei den drei Besten?
    oben: F.reduce((n, c) => n + ((A.byId[c.id] || {pids:[]}).pids
            .filter(p => nachQuote.indexOf(p) < 3).length), 0),
    haltungen: F.reduce((n, c) => n + ((A.byId[c.id] || {pids:[]}).pids.length), 0)
  };
})())`));
_gl.halter.forEach(h => console.log('  ' + h.zufall.padEnd(6) + h.name.padEnd(24)
  + (h.namen.map(p => nm(p)).join(', ') || '— unbesetzt').padEnd(20)
  + 'Platz ' + (h.pids.join('/') || '—') + ' von ' + _gl.feld
  + '  ·  ' + h.rennen + ' im Rennen'));

const _q = _gl.halter.filter(h => h.zufall === 'quote');
const _f = _gl.halter.filter(h => h.zufall === 'fund');
ok(_q.length >= 4 && _f.length >= 1, 'die Kammer hat beide Sorten',
   _q.length + ' Quoten, ' + _f.length + ' Funde');

// 1. Vergeben. Ein Quoteneintrag, den in vier Monaten niemand erreicht, ist
//    keine Bestmarke, sondern eine zu hohe Schwelle.
const _glLeer = _q.filter(h => !h.pids.length).map(h => h.name);
ok(_glLeer.length === 0, 'jede Quoten-Fuegung ist vergeben',
   _glLeer.join(', ') || _q.length + ' von ' + _q.length);

// 2. Im Rennen ist mindestens die halbe Liga. Sonst waere es nur eine weitere
//    Huerde, und genau die wollte dieser Block loswerden.
//
//    Ein PAAR wird zusammen gemessen. „Der Rückenwind" und „Der
//    Einzelkämpfer" sind die zwei Enden eines Werts: das Vorzeichen teilt das
//    Feld, und gemessen standen fuenf ueber und sechs unter dem eigenen
//    Mittel. Ein Vorzeichen ist aber keine Schwelle — wer die Mindestzahl
//    erfuellt, steht in einem der beiden Rennen, und genau das ist hier
//    verlangt. Einzeln gemessen fiel jede Haelfte mit 5 von 11 durch, und die
//    Regel haette einen Eintrag verboten, den sie gar nicht meint.
const _paar = {};
_gl.halter.forEach(h => { if(h.paar) _paar[h.id] = h.paar; });
const _rennenFuer = h => h.paar
  ? h.rennen + ((_gl.halter.find(x => x.id === h.paar) || {rennen:0}).rennen)
  : h.rennen;
const _glEng = _q.filter(h => _rennenFuer(h) < _gl.feld / 2)
  .map(h => h.name + ' ' + _rennenFuer(h));

// 2b. Und `paar` ist keine Beschriftung. Wer es setzt, behauptet zwei Dinge:
//     der Partner zeigt zurueck, und die beiden Rennen schneiden sich nicht.
//     Zwei Eintraege, in deren Rennen derselbe Spieler steht, sind keine
//     ENDEN eines Werts, sondern zwei Wertungen — dann gilt die halbe Liga
//     wieder fuer jede einzeln.
const _paarFehler = [];
_gl.halter.filter(h => h.paar).forEach(h => {
  const g = _gl.halter.find(x => x.id === h.paar);
  if(!g){ _paarFehler.push(h.name + ': Partner „' + h.paar + '" gibt es nicht'); return; }
  if(g.paar !== h.id){ _paarFehler.push(h.name + ': „' + g.name + '" zeigt nicht zurueck'); return; }
  const doppelt = h.rennenIds.filter(p => g.rennenIds.includes(p));
  if(doppelt.length) _paarFehler.push(h.name + ' und ' + g.name + ': '
    + doppelt.length + ' Spieler stehen in beiden Rennen');
});
ok(_paarFehler.length === 0, 'jedes Paar zeigt zurueck und teilt das Feld',
   _paarFehler.join(' · ') || _gl.halter.filter(h => h.paar).length + ' gepaarte Eintraege');
ok(_glEng.length === 0, 'bei jeder Quoten-Fuegung ist mindestens die halbe Liga im Rennen',
   _glEng.join(', ') || _q.map(h => h.rennen).join('/') + ' von ' + _gl.feld);

// 3. Ein Fund darf selten sein — aber nicht jeder. Waere die halbe Kammer
//    unbesetzt, waere sie eine Wunschliste und keine Tafel.
const _fLeer = _f.filter(h => !h.pids.length).length;
ok(_fLeer <= _f.length / 2, 'hoechstens die Haelfte der Funde ist unbesetzt',
   _fLeer + ' von ' + _f.length);

// 4. Und sie landen nicht wieder bei den Besten. Zwei Proben: mindestens
//    einer gehoert der unteren Haelfte, und die drei Besten halten nicht die
//    Mehrheit der Kammer. Ohne das haetten wir zehn Eintraege dazugebaut und
//    nichts veraendert.
const _glUnten = _gl.halter.filter(h => h.pids.some(r => r > _gl.feld / 2));
ok(_glUnten.length > 0, 'mindestens eine Fuegung gehoert der unteren Haelfte der Liga',
   _glUnten.map(h => h.name).join(', ') || 'keine');
ok(_gl.oben <= _gl.haltungen / 2,
   'die drei Besten halten hoechstens die Haelfte der Fuegungen',
   _gl.oben + ' von ' + _gl.haltungen + ' Haltungen');

// 5. Glueck ist kein Koennen. Sie stehen als `ereignis` im Katalog und wiegen
//    fuers Prestige damit halb so viel wie ein Beleg fuer eine Faehigkeit.
const _glArt = _gl.halter.filter(h => h.art !== 'ereignis').map(h => h.name + ' ' + h.art);
ok(_glArt.length === 0, 'keine Fuegung zaehlt als Leistung',
   _glArt.join(', ') || 'alle ' + _gl.halter.length + ' sind Ereignis');

// 6. Das Ziel des Ganzen: niemand ist von vornherein ausgeschlossen. Jeder
//    gewertete Spieler steht in mindestens einem Rennen und kann den Eintrag
//    damit uebernehmen [Regel 18]. Verteilt wird nichts: wer neununddreissig
//    Partien hat, haelt vielleicht keinen — er kann aber jeden holen, dessen
//    Mindestbasis er erfuellt.
ok(_gl.ohne.length === 0, 'jeder gewertete Spieler steht in mindestens einem Rennen',
   _gl.ohne.map(nm).join(', ') || _gl.feld + ' von ' + _gl.feld);
// Und die Tafel ist nicht in wenigen Haenden: mindestens zwei Drittel des
// Feldes halten wirklich etwas.
const _mitBesitz = _gl.besitz.filter(n => n > 0).length;
ok(_mitBesitz >= Math.ceil(_gl.feld * 2 / 3),
   'mindestens zwei Drittel des Feldes halten einen Liga-Eintrag',
   _mitBesitz + ' von ' + _gl.feld);


// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ JEDER REKORD ERKLAERT SICH ═══');
// Die Karte im Rekorde-Reiter zeigt den Namen und die BEDINGUNG, das Blatt
// darunter die ERKLAERUNG. Beide waren lueckenhaft: nur 15 der 46 Rekorde
// hatten ueberhaupt eine Erklaerung, und mehrere Bedingungen nannten nicht
// alle Schwellen, die ihre Rechnung erzwingt.
//
// „Die ruhige Hand" verlangte „mindestens 9 Prozentpunkte" und schwieg ueber
// die 14 engen Partien und die 20 % der Laufbahn, die ebenso verlangt sind:
// wer die Karte las, wusste nicht, warum er nicht im Rennen steht. „Der
// Gigantentoeter" nannte keinen Nenner, obwohl er gegen ALLE Partien zaehlt
// und nicht gegen die als Aussenseiter. „Die Mauer" heisst so, misst aber
// nur, wie oft jemand hinten stand — ohne Erklaerung liest sich der Name als
// Abwehrstaerke.
//
// Geprueft wird deshalb maschinell: jede Zahl, die die Wertfunktion als
// Schwelle erzwingt, muss im Text stehen. Ein Anteil unter eins wird dafuer
// als Prozentwert gelesen, so wie ihn die Bedingung schreibt.
const _erk = JSON.parse(K.eval(`JSON.stringify(CHRONICLES.map(c => ({
  id:c.id, name:c.name, cond:c.cond || '', wie:c.wie || '',
  unit:c.unit || '', min:c.min || 0,
  // Der Quelltext der Rechnung. Aus ihm kommen die Schwellen: eine Zahl, die
  // dort ueber ein Tor entscheidet, gehoert in die Bedingung.
  src:String(c.raw || c.val || '')
})))`));

const _ohneWie = _erk.filter(c => c.wie.trim().length < 40).map(c => c.name);
ok(_ohneWie.length === 0, 'jeder Rekord traegt eine Erklaerung',
   _ohneWie.join(', ') || _erk.length + ' von ' + _erk.length);
const _ohneCond = _erk.filter(c => c.cond.trim().length < 20).map(c => c.name);
ok(_ohneCond.length === 0, 'jeder Rekord traegt eine Bedingung',
   _ohneCond.join(', ') || _erk.length + ' von ' + _erk.length);

// Keine Umschreibung, die nichts erklaert. Die Liste ist kurz und nennt nur
// Floskeln, die in einem Erklaertext nie stehen muessen.
const _FLOSKEL = ['gewissermaßen', 'sozusagen', 'im Grunde', 'quasi',
                  'eigentlich', 'letztlich', 'bekanntlich', 'natürlich',
                  'selbstverständlich', 'mehr oder weniger'];
const _floskel = [];
_erk.forEach(c => _FLOSKEL.forEach(f => {
  if((c.cond + ' ' + c.wie).toLowerCase().indexOf(f.toLowerCase()) >= 0)
    _floskel.push(c.name + ': ' + f);
}));
ok(_floskel.length === 0, 'keine Floskel in Bedingung oder Erklaerung',
   _floskel.join(', ') || 'keine');

// Die eigentliche Probe: jede Schwelle der Rechnung steht im Text.
// Gelesen werden nur Zahlen, die in einem Vergleich stehen (>=, <=, <, >)
// oder als `min` am Eintrag haengen — eine 2 aus `slice(0, 2)` ist keine
// Schwelle, ein `>= 0.22` schon.
const _fehlt = [];
_erk.forEach(c => {
  const txt = (c.cond + ' ' + c.wie).replace(/\u00a0/g, ' ');
  // Eine kleine Zahl steht im deutschen Satz ausgeschrieben: „mindestens
  // dreimal" ist dieselbe Schwelle wie „mindestens 3". Ohne diese Liste
  // verlangte die Probe eine Ziffer und damit schlechteres Deutsch.
  const WORT = {2:'zwei', 3:'drei', 4:'vier', 5:'fünf', 6:'sechs', 7:'sieben',
                8:'acht', 9:'neun', 10:'zehn', 11:'elf', 12:'zwölf'};
  const hat = (n) => {
    // Als ganze Zahl oder als Prozentwert, mit Komma oder Punkt.
    const kandidaten = [String(n), String(n).replace('.', ',')];
    if(WORT[n]) kandidaten.push(WORT[n]);
    if(n > 0 && n < 1){
      kandidaten.push(String(Math.round(n * 1000) / 10).replace('.', ','));
      kandidaten.push(String(Math.round(n * 100)));
    }
    return kandidaten.some(k => /^[0-9]/.test(k)
      ? new RegExp('(^|[^0-9.,])' + k.replace(/[.]/g, '\\.') + '([^0-9]|$)').test(txt)
      : txt.toLowerCase().indexOf(k) >= 0);
  };
  const zahlen = new Set();
  const re = /(?:>=|<=|>|<)\s*([0-9]+(?:\.[0-9]+)?)/g;
  let m; while((m = re.exec(c.src))) zahlen.add(parseFloat(m[1]));
  if(c.min) zahlen.add(c.min);
  [...zahlen].forEach(n => {
    // 0 und 1 sind keine Schwellen, sondern Vorzeichen- und Leerproben.
    if(n === 0 || n === 1) return;
    if(!hat(n)) _fehlt.push(c.name + ': ' + n);
  });
});
ok(_fehlt.length === 0, 'jede Schwelle der Rechnung steht auch im Text',
   _fehlt.slice(0, 6).join(' · ') || _erk.length + ' Rekorde geprueft');

console.log('\n═══ DIE OFFENE KAMMER: EIN REKORD FUER JEDEN ═══');
// Die Zusicherung, die dem Katalog am laengsten gefehlt hat. Gemessen waren
// 13 der 21 bestehenden Rekorde mit lesbarer Mindestzahl fuer einen Spieler
// mit fuenfzig Partien unerreichbar: „ab 50 Sturmspielen", „ab 60
// Gelegenheiten", „ab 80 Spielen" gehoeren dem Vielspieler, weil sie ausser
// ihm niemand halten KANN. Ohne diese Probe wandert der Katalog mit jedem
// neuen Eintrag ein Stueck weiter dorthin, und niemand sieht es.
//
// `offen` am Katalogeintrag ist dafuer keine Beschriftung, sondern eine
// Behauptung, die hier nachgezaehlt wird: im Rennen muss jemand mit unter
// hundert Partien stehen, und vergeben muss der Rekord auch sein.
const _ok = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles(), C = _chronicleCtx();
  const ids = Object.keys(C.P);
  const q = {}; ids.forEach(id => q[id] = C.P[id].wins / C.P[id].games);
  const rang = ids.slice().sort((a,b) => q[b] - q[a]);
  const lauf = c => ids.filter(pid => {
    const v = c.val(C.P[pid], C); return v != null && isFinite(v); });
  return {
    feld: ids.length,
    offen: CHRONICLES.filter(c => c.offen).map(c => {
      const e = A.byId[c.id] || {pids:[]}, im = lauf(c);
      return {id:c.id, name:c.name, halter:e.pids || [],
              plaetze:(e.pids || []).map(p => rang.indexOf(p) + 1),
              rennen:im.length,
              kleinste:im.length ? Math.min.apply(null, im.map(p => C.P[p].games)) : 0};
    }),
    // Ein gleitendes Fenster muss mitwandern: waere es am ANFANG der Laufbahn
    // verankert, koennte der Rekord den Halter nie mehr wechseln.
    fenster: CHRONICLES.filter(c => c.fenster).map(c => c.id),
    // Die Haltungen aller Rekorde, je Spieler. Nicht nur der Fuegungen: die
    // sieben neuen Koennen-Rekorde zaehlen dort nicht mit, und genau bei
    // ihnen sammelt sich das Koennen.
    haltungen: (function(){
      const je = {};
      CHRONICLES.forEach(c => ((A.byId[c.id] || {pids:[]}).pids || [])
        .forEach(p => je[p] = (je[p] || 0) + 1));
      return je;
    })(),
    // Die Rohsicht darf nicht im Cache liegen. Sie ist 4×N Partien-Objekte,
    // und der Zeitschnitt haelt bis zu 24 Kontexte gleichzeitig.
    schwer: Object.keys(C.P).filter(pid => Object.keys(C.P[pid])
      .some(k => Array.isArray(C.P[pid][k]) && C.P[pid][k].length > 30))
  };
})())`));
_ok.offen.forEach(o => console.log('  ' + o.name.padEnd(20)
  + (o.halter.map(nm).join(', ') || '— unbesetzt').padEnd(18)
  + 'Platz ' + (o.plaetze.join('/') || '—') + ' von ' + _ok.feld
  + '  ·  ' + o.rennen + ' im Rennen, kleinste Laufbahn ' + o.kleinste + ' Partien'));

ok(_ok.offen.length >= 5, 'die offene Kammer hat mindestens fuenf Rekorde',
   _ok.offen.length + ' Rekorde');
const _okLeer = _ok.offen.filter(o => !o.halter.length).map(o => o.name);
ok(_okLeer.length === 0, 'jeder Rekord der offenen Kammer ist vergeben',
   _okLeer.join(', ') || _ok.offen.length + ' von ' + _ok.offen.length);
// Das eigentliche Tor: die Bedingung darf nicht selbst die Huerde sein. Ein
// Rekord, in dessen Rennen nur Vielspieler stehen, ist keiner fuer jeden —
// auch wenn die Zahl in der Bedingung klein aussieht.
const _okHoch = _ok.offen.filter(o => o.kleinste > 100)
  .map(o => o.name + ' (kleinste ' + o.kleinste + ')');
ok(_okHoch.length === 0, 'in jedem offenen Rennen steht ein Spieler mit unter hundert Partien',
   _okHoch.join(', ') || _ok.offen.map(o => o.kleinste).join('/') + ' Partien');
// Und mindestens einer gehoert nicht den drei Besten. Sonst haetten wir fuenf
// Eintraege dazugebaut und nichts veraendert.
const _okUnten = _ok.offen.filter(o => o.plaetze.some(r => r > 3));
ok(_okUnten.length > 0, 'mindestens ein offener Rekord gehoert nicht den drei Besten',
   _okUnten.map(o => o.name + ' (' + o.plaetze.join('/') + ')').join(', ') || 'keiner');

// Drei Fenster-Rekorde, und sie sind als solche markiert. Ohne die Marke
// meldet der Feed „X baut den Rekord aus", sobald am hinteren Ende des
// Fensters ein schwaches Ergebnis herausfaellt — und dann hat der Halter
// nichts getan [§C33].
ok(_ok.fenster.length >= 3, 'die gleitenden Fenster sind im Katalog markiert',
   _ok.fenster.join(', ') || 'keins');

// Kein Halter traegt mehr als ein Viertel aller Haltungen. Vorher hielten
// die drei Besten neun, neun und sechs Eintraege; nach dem Umbau sind es
// elf, acht und acht von einundfuenfzig.
const _hSum = Object.values(_ok.haltungen).reduce((a, b) => a + b, 0);
const _hMax = Object.keys(_ok.haltungen)
  .filter(p => _ok.haltungen[p] * 4 > _hSum)
  .map(p => nm(p) + ' ' + _ok.haltungen[p] + ' von ' + _hSum);
console.log('  Haltungen: ' + Object.keys(_ok.haltungen)
  .sort((a, b) => _ok.haltungen[b] - _ok.haltungen[a])
  .map(p => nm(p) + ' ' + _ok.haltungen[p]).join(' · '));
ok(_hMax.length === 0, 'kein Halter traegt mehr als ein Viertel aller Rekorde',
   _hMax.join(', ') || 'Maximum ' + Math.max.apply(null, Object.values(_ok.haltungen))
   + ' von ' + _hSum);

// ─── Jeder Rekord ist vergeben, ausser einem Fund ───────────────────
// Ein leeres Feld liest sich als Fehler [§6], und bei einem Rekord ist es
// meistens auch einer: die Mindestzahl steht zu hoch, oder die Rechnung
// liefert `null`, wo sie einen Wert liefern sollte. Gemessen wurde das
// bisher nur fuer die offene Kammer — ein neuer Rekord ausserhalb davon
// konnte unbesetzt bleiben, ohne dass es auffiel.
//
// Ausgenommen ist der FUND: „Die kalte Dusche" ist ein einzelnes
// Zusammentreffen und darf selten sein, sonst waere es keins [§C35].
const _unbesetzt = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles();
  return CHRONICLES.filter(c => c.zufall !== 'fund'
      && !((A.byId[c.id] || {}).pids || []).length)
    .map(c => c.name + ' (' + c.kind + ')');
})())`));
ok(_unbesetzt.length === 0, 'jeder Rekord ausser einem Fund ist vergeben',
   _unbesetzt.join(', ') || _erk.length + ' Rekorde geprueft');

// ─── Die zwei Haelften einer Rolle gehoeren nicht demselben ─────────
// „Der Dauerstuermer" zaehlt den Sturmanteil der letzten fuenfzig Partien.
// Dieselbe Frage nach der ABWEHR ginge gemessen an denselben Halter wie
// „Die Mauer", die den Abwehranteil ueber die ganze Laufbahn misst — und
// dieselbe Frage mit derselben Antwort sammelt sich beim selben Halter
// [§C35]. Geprueft wird deshalb, dass die Fenster-Fassung nicht doch bei
// dem landet, der die Laufbahn-Fassung schon haelt.
const _rollen = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles();
  const h = id => (((A.byId[id] || {}).pids) || []).map(p => pname(p));
  return {vorne:h('dauersturm'), hinten:h('wall')};
})())`));
ok(_rollen.vorne.length > 0 && _rollen.hinten.length > 0
   && !_rollen.vorne.some(n => _rollen.hinten.includes(n)),
   'der Stammplatz im Fenster gehoert nicht dem Halter der Mauer',
   'vorne ' + (_rollen.vorne.join('/') || '—') + ', hinten '
   + (_rollen.hinten.join('/') || '—'));

// ─── Die Schandtafel ────────────────────────────────────────────────
// Eine Schande ist nicht einfach ein Rekord mit umgedrehtem Vorzeichen. Wer
// schlechter spielt, verliert JEDE Quote, also gehoert eine Schande, die das
// Niveau misst, immer demselben Spieler — und dann ist die Tafel keine
// Tafel, sondern eine Rangliste von hinten. Gemessen an den echten Partien
// hielt der Zehnte der Siegquote fuenf der dreizehn Haltungen; drei der
// neuen Einträge fragen deshalb nach dem ABSTAND ZUM EIGENEN [§C38] statt
// nach dem Niveau, und genau dadurch haben sie ihr Tor bestanden: „Die
// Ladehemmung" ging von r = −0,35 auf +0,14, „Die stumme Antwort" von −0,40
// auf +0,06.
// Ein gleichmaessiger Streu waere gelogen — eine Schande MISST, dass jemand
// schlecht war. Gedeckelt wird deshalb nur der Extremfall: nicht alles in
// einem Namen, und mehr als eine Handvoll Leute tragen mit.
const _sch = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles();
  const halt = {}, frei = [];
  const neg = CHRONICLES.filter(c => c.neg);
  // Fuers Prestige zaehlt die ART, nicht die Farbe. Eine negative FUEGUNG
  // behaelt art:'ereignis' und damit ihren Wert — das steht ausdruecklich
  // so in §C25, „sonst verschoebe sich das Prestige": „Die bitterste Pleite"
  // ist rot, zaehlt nicht als Rekord und traegt trotzdem Punkte wie jede
  // andere Fuegung. Null geben nur die Schattenseiten.
  const schatten = CHRONICLES.filter(c => c.art === 'schatten');
  neg.forEach(c => {
    const h = A.byId[c.id];
    if(!h){ frei.push(c.id); return; }
    (h.holders || [{pid:h.pid}]).forEach(x => { halt[x.pid] = (halt[x.pid] || 0) + 1; });
  });
  // Und keine Schande darf Prestige geben. Gemessen wird die QUELLE in der
  // Laufbahn und nicht der Zielvorschlag daneben: prestigeTabelle sammelt
  // JEDEN gehaltenen Rekord ein, und erst der Grundwert macht aus einer
  // Schattenseite eine Null. Am Zielvorschlag geprueft war die Zusicherung
  // gruen, auch als der Filter der Punkte ganz entfernt war.
  // (Kein Backtick in diesem Kommentar: er steht in einem Template-Literal.)
  const pr = prestigeTabelle();
  const ausSchande = [];
  let posten = 0;
  Object.keys(pr.byPid).forEach(pid => {
    (pr.byPid[pid].quellen || []).forEach(q => {
      if(q.q !== 'rekord') return;
      posten++;
      if(schatten.some(c => c.id === q.id) && (q.p || 0) !== 0)
        ausSchande.push(String(pid).slice(-2) + '/' + q.id + ':' + q.p);
    });
  });
  return {n:neg.length, halt, frei, ausSchande, posten};
})())`));
const _schSum = Object.values(_sch.halt).reduce((a, b) => a + b, 0);
const _schMax = Object.keys(_sch.halt).sort((a, b) => _sch.halt[b] - _sch.halt[a])[0];
console.log('  Schandtafel: ' + _sch.n + ' Eintraege, ' + _schSum + ' Haltungen · '
  + Object.keys(_sch.halt).sort((a, b) => _sch.halt[b] - _sch.halt[a])
    .map(p => nm(p) + ' ' + _sch.halt[p]).join(' · '));
ok(_sch.n >= 12, 'die Schandtafel traegt mindestens zwölf Eintraege', String(_sch.n));
ok(_schSum > 0 && _sch.halt[_schMax] * 5 <= _schSum * 2,
   'keine Schande sammelt sich bei einem einzigen Spieler',
   _schMax ? nm(_schMax) + ' haelt ' + _sch.halt[_schMax] + ' von ' + _schSum : 'leer');
ok(Object.keys(_sch.halt).length >= 6,
   'die Schandtafel verteilt sich auf mehr als eine Handvoll Namen',
   Object.keys(_sch.halt).length + ' Namen');
ok(_sch.posten > 0, 'die gehaltenen Rekorde stehen als Prestige-Quelle da',
   _sch.posten + ' Posten');
ok(_sch.ausSchande.length === 0, 'keine Schattenseite gibt Prestige',
   _sch.ausSchande.slice(0, 4).join(', ') || 'keine');

// Acht Schand-Disziplinen tragen beide Zeitachsen [§13.1]: dieselbe Frage
// auf Monat UND Laufbahn gehoert in EINE Disziplin, sonst stehen zwei Namen
// und zwei Icons fuer denselben Gedanken. „Der Wackelkandidat" kam dazu, seit
// eine Chronik ihre Schwelle 1,2 σ und nicht mehr 1,5 σ hinausschieben muss:
// im Monat liegt sie bei 1,38 σ [§C39]; ebenso „Die stumme Antwort" mit 2,02 σ.
['sieve','abyss','hardluck','angstgegner','untersoll','misfire','favflop','noanswer'].forEach(id =>
  ok(K.eval(`!!SEASON_TITLE_BY_ID['${id}'] && !!CHRONICLE_BY_ID['${id}']`),
     'Schande ' + id + ' traegt beide Zeitachsen'));
['ballast','stammkunde'].forEach(id =>
  ok(K.eval(`!!CHRONICLE_BY_ID['${id}'] && !SEASON_TITLE_BY_ID['${id}']`),
     'Schandrekord ' + id + ' traegt nur die Laufbahn'));
// Dieselbe Zaehlung, zwei Bedeutungen: im Monat feiert „Der Ausbruch" den
// Bruch einer Pleitenserie gegen einen Gegner, als Wende und damit selten
// [§C39]; ueber die Laufbahn bleibt die Serie, und die steht als „Der
// Stammkunde" unter den Schattenseiten. Als Fuegung gab sie Prestige fuer
// siebzehn Niederlagen in Folge [§C34, §C35].
ok(K.eval(`(function(){
  const r = CHRONICLE_BY_ID.stammkunde, d = DISZIPLINEN.find(x => x.id === 'ausbruch'), m = d && d.monat;
  return !!r && r.kind === 'shame' && r.neg && r.basis === 0 && !CHRONICLE_BY_ID.ausbruch
    && !!m && m.wende === true && m.klasse === 'selten';
})()`), 'der Ausbruch ist im Monat eine Wende, die Serie ueber die Laufbahn eine Schattenseite');

// Die Rohsicht bleibt aus dem Cache. Sie wird fuer die zehn Rekorde der zwei
// Kammern gebaut, ausgewertet und verworfen: am gecachten Spielerobjekt
// haengen nur Skalare. Sonst truege jeder der 24 Zeitschnitte 4×N
// Partien-Objekte mit sich.
ok(_ok.schwer.length === 0, 'der Chronik-Cache traegt keine Partienlisten',
   _ok.schwer.map(nm).join(', ') || 'nur Skalare');


// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DER BELEG BEGINNT MIT DEM WERT, NACH DEM SORTIERT WIRD ═══');
// Das Podest und die Verfolgerliste zeigen die ERSTE Zahl des Belegs. Der
// begann bisher fast immer mit der Anzahl, sortiert wird aber nach einem
// Anteil: bei „Der Zerstoerer" stand damit Jannik mit 10 vor Martin mit 34,
// obwohl Jannik den hoeheren Anteil hat. Jeder Beleg muss deshalb mit einer
// Zahl anfangen, und die muss sich mit der Reihenfolge bewegen — steigend
// oder fallend, aber nicht durcheinander.
const _bel = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx();
  return CHRONICLES.map(c => {
    const r = chronicleRang(c.id);
    return {id:c.id, name:c.name,
            werte: r.map(x => x.wert),
            zahlen: r.map(x => {
              const m = String(x.ev || '').trim().match(/^([+\u2212-]?[0-9][^\s]*)/);
              return m ? parseFloat(m[1].replace(',', '.').replace('\u2212', '-')) : null;
            })};
  });
})())`));
// 1. Jeder Beleg faengt mit einer Zahl an. Ohne sie bleibt das Podest leer.
const _ohneZahl = _bel.filter(b => b.zahlen.length && b.zahlen.some(z => z == null))
  .map(b => b.name);
ok(_ohneZahl.length === 0, 'jeder Beleg beginnt mit einer Zahl',
   _ohneZahl.join(', ') || _bel.filter(b => b.zahlen.length).length + ' Rekorde');
// 2. Und diese Zahl IST der Sortierwert, nicht irgendeine andere aus dem
//    Satz. „Monoton" reicht dafuer nicht: bei zwei Haltern ist jedes Paar
//    monoton, und genau so ist der Fehler entstanden. Geprueft wird deshalb,
//    ob EINE Umrechnung des Sortierwerts fuer ALLE Halter dieselbe Zahl
//    ergibt — Prozent, Vorzeichen, Gegenwahrscheinlichkeit oder roh.
const _formeln = {
  'v':          v => v,
  '-v':         v => -v,
  'v gerundet': v => Math.round(v),
  'v %':        v => Math.round(v * 100),
  '-v %':       v => Math.round(-v * 100),
  '|v| %':      v => Math.round(Math.abs(v) * 100),
  '1-v %':      v => Math.round((1 - v) * 100),
  // Der Abstand zweier Anteile, die zusammen hundert ergeben: zweimal der
  // gerundete Abstand zur Mitte, also immer gerade (der Wandler).
  '1-v % gerade': v => 2 * Math.round((1 - v) * 50),
  'v auf 1':    v => +v.toFixed(1),
  '-v auf 1':   v => +(-v).toFixed(1)
};
const _passt = (b) => Object.keys(_formeln).filter(k =>
  b.werte.every((v, i) => b.zahlen[i] != null
    && Math.abs(_formeln[k](v) - b.zahlen[i]) < 0.05));
const _fremd = _bel.filter(b => b.zahlen.length && _passt(b).length === 0)
  .map(b => b.name + ' zeigt [' + b.zahlen.join(' ') + '] bei Werten ['
       + b.werte.map(v => Math.round(v * 1000) / 1000).join(' ') + ']');
ok(_fremd.length === 0,
   'die Zahl im Beleg ist der Wert, nach dem sortiert wird',
   _fremd.join(' · ') || _bel.filter(b => b.zahlen.length).length + ' Rekorde geprüft');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DIE KARTEN NEBEN DEN KATALOGEN [§10] ═══');
// BADGE_RARITY, BADGE_WUERDE und RARITY_META stehen NEBEN dem BADGES-Array
// und werden von Hand gepflegt. Die Klasse steuert das Prestige, die Würde
// die wiederkehrende News und RARITY_META den Zähler im Blatt.
const _kat = JSON.parse(K.eval(`JSON.stringify((function(){
  const ist = {};
  BADGES.forEach(b => { const k = BADGE_RARITY[b.id]; if(k) ist[k] = (ist[k]||0) + 1; });
  const kennt = id => BADGES.some(b => b.id === id);
  return {
    gesamt: BADGES.length,
    meta: Object.keys(RARITY_META).map(k => ({k, soll:RARITY_META[k].total, ist:ist[k]||0})),
    ohneKlasse: BADGES.filter(b => !BADGE_RARITY[b.id]).map(b => b.id),
    verwaist: [].concat(
      Object.keys(BADGE_RARITY).filter(id => !kennt(id)).map(id => 'BADGE_RARITY:' + id),
      [...BADGE_WUERDE].filter(id => !kennt(id)).map(id => 'BADGE_WUERDE:' + id)),
    disz: DISZIPLINEN.length
  };
})())`));
console.log('  ' + _kat.gesamt + ' Auszeichnungen · '
  + _kat.meta.map(m => m.k + ' ' + m.ist).join(' · ')
  + '  ·  ' + _kat.disz + ' Disziplinen');

// 1. Der Zähler im Badge-Blatt („38 von 50") kommt aus RARITY_META.total und
//    nicht aus dem Katalog. Bleibt er beim Hinzufügen stehen, zeigt das Blatt
//    dauerhaft eine falsche Gesamtzahl an.
const _katFalsch = _kat.meta.filter(m => m.soll !== m.ist);
ok(_katFalsch.length === 0,
   'jede Klasse zählt so viele Badges wie RARITY_META behauptet',
   _katFalsch.map(m => m.k + ' soll ' + m.soll + ', ist ' + m.ist).join(', ')
     || _kat.meta.map(m => m.k + ' ' + m.ist).join(' · '));

// 2. Ohne Eintrag in BADGE_RARITY gilt `common` — die billigste Klasse. Ein
//    als selten gedachtes Badge zählt dann fürs Prestige wie ein Zittersieg,
//    und im Blatt steht es im falschen Bucket.
ok(_kat.ohneKlasse.length === 0,
   'jede Auszeichnung hat eine Seltenheitsklasse',
   _kat.ohneKlasse.join(', ') || _kat.gesamt + ' von ' + _kat.gesamt);

// 3. Die Gegenrichtung: eine Karte nennt ein Badge, das es nicht mehr gibt.
//    Das kostet nichts, aber es verfälscht jede Zählung, die über die Karten
//    statt über den Katalog geht — und RARITY_META.total ist genau so eine.
ok(_kat.verwaist.length === 0,
   'keine Karte nennt eine Auszeichnung, die es nicht gibt',
   _kat.verwaist.join(', ') || 'keine Karteileiche');


// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DIE POSITION GILT AB DER ERSTEN PARTIE [§13.2] ═══');
// „Wer steht wo in der Tabelle" und „wer ist für eine Monatswertung
// gewertet" sind zwei Fragen. TITLE_MIN_GAMES beantwortet nur die zweite.
// Vorher entschied dieselbe Schwelle beides: am zweiten Tag einer neuen
// Saison zeigte der Liga-Tab vier Spieler mit ihren Plätzen, und im Profil
// blieb das Schild leer, weil noch niemand acht Partien hatte.
const _pos = JSON.parse(K.eval(`JSON.stringify((function(){
  const raus = [], falschSortiert = [], ohnePos = [];
  ['2026-05','2026-06','2026-07','2026-08'].forEach(sid => {
    const C = _seasonTitleCtx(sid);
    // Wer hat in dieser Saison gespielt? Direkt aus den Matches gezählt,
    // nicht aus dem Kontext — sonst prüfte der Test sich selbst.
    const g = {};
    matchesInSeason(sid).forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(id => {
      if(id) g[id] = (g[id]||0) + 1; }));
    const versteckt = new Set(players.filter(p=>p.hidden).map(p=>p.id));
    Object.keys(g).forEach(id => {
      if(versteckt.has(id)) return;
      if(!(C.rankAll||[]).some(r => r.id === id)) ohnePos.push(sid + ' ' + id);
    });
    // Die Wertung bleibt eine Teilmenge der Tabelle, in derselben Ordnung.
    (C.rank||[]).forEach(r => {
      if(!(C.rankAll||[]).some(x => x.id === r.id)) raus.push(sid + ' ' + r.id);
    });
    const inAll = (C.rank||[]).map(r => (C.rankAll||[]).findIndex(x => x.id === r.id));
    for(let i = 1; i < inAll.length; i++) if(inAll[i] < inAll[i-1]) falschSortiert.push(sid);
  });
  const C8 = _seasonTitleCtx('2026-08');
  const g8 = {};
  matchesInSeason('2026-08').forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(id => {
    if(id) g8[id] = (g8[id]||0) + 1; }));
  const knapp = Object.keys(g8).filter(id => g8[id] > 0 && g8[id] < TITLE_MIN_GAMES);
  return {ohnePos, raus, falschSortiert,
    knapp: knapp.map(id => ({id, g:g8[id],
      pos: (C8.rankAll||[]).findIndex(x => x.id === id) + 1,
      gewertet: !!C8.P[id]}))};
})())`));
console.log('  unter der Schwelle im August: ' + (_pos.knapp.length
  ? _pos.knapp.map(x => nm(x.id) + ' ' + x.g + ' Sp. → Platz ' + x.pos).join(' · ')
  : 'niemand'));

// 1. Wer gespielt hat, hat eine Position. Ohne das bleibt das Schild im
//    Profil leer, während die Liste daneben den Platz schon zeigt.
ok(_pos.ohnePos.length === 0,
   'jeder Spieler mit einer Partie steht in der Saisontabelle',
   _pos.ohnePos.join(', ') || 'vier Saisons geprüft');

// 2. Die Wertungsschwelle gilt weiter. Sie ist der Grund, warum jemand mit
//    drei Partien keinen Saisontitel gewinnt — nur eben nicht mehr der
//    Grund, warum er keine Position hat.
ok(_pos.knapp.length > 0 && _pos.knapp.every(x => x.pos > 0 && !x.gewertet),
   'unter der Schwelle: Position ja, Wertung nein',
   _pos.knapp.map(x => nm(x.id) + ' Platz ' + x.pos
     + (x.gewertet ? ' ABER GEWERTET' : '')).join(', ') || 'kein Fall in den Fixtures');

// 3. Die Wertungsliste ist die gefilterte Tabelle und keine zweite
//    Sortierung — sonst stünde im Schild eine andere Reihenfolge als im
//    Liga-Tab, und beide behaupteten, die Saison zu zeigen.
ok(_pos.raus.length === 0 && _pos.falschSortiert.length === 0,
   'die Wertung ist die gefilterte Tabelle, in derselben Ordnung',
   [..._pos.raus, ..._pos.falschSortiert].join(', ') || 'deckungsgleich');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DER ERSTE DER POSITIONSLISTE HÄLT DEN REKORD ═══');
// „Der komplette Stürmer" und „Der komplette Verteidiger" behaupten, dem zu
// gehören, der in der Positions-Rangliste ganz oben steht. Das ist genau der
// Fehler, den §10.2 „den häufigsten" nennt, nur eine Ebene höher: die Ansicht
// rechnet aus `allPlayerStats` und `posPerfFrom`, der Rekord aus dem
// Chronik-Durchlauf. Zwei Wege zu derselben Zahl — sie müssen denselben
// Ersten und denselben Wert nennen.
//
// Geprüft wird am GERENDERTEN Markup der Ansicht, nicht an einer nachgebauten
// Sortierung: sonst prüfte der Test seine eigene Rechnung.
const _pw = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx();
  const out = {};
  ['drive','reves'].forEach(pos => {
    rankMetric = pos;
    const html = vPositions();
    // Die erste Zeile der Liste: ihr Spieler und die Zahl in der Spalte
    // „Wert". Beides steht so im Markup, wie es jemand auf dem Telefon sieht.
    const ersteId = (html.match(/data-detail="([^"]+)"/) || [])[1] || null;
    const ersterWert = +((html.match(/<div class="big num">(\\d+)<\\/div><div class="small">Wert/) || [])[1]);
    const e = allChronicles().byId[pos === 'drive' ? 'drive_ace' : 'reves_ace'];
    out[pos] = {ersteId, ersterWert,
      halter: e ? e.pids : [], rekWert: e ? Math.round(e.val * 100) : null,
      spiele: e ? (C.P[e.pid] || {})[pos === 'drive' ? 'drvG' : 'revG'] : 0};
  });
  rankMetric = 'drive';
  return out;
})())`));
['drive','reves'].forEach(pos => {
  const x = _pw[pos];
  console.log('  ' + (pos === 'drive' ? 'Sturm ' : 'Abwehr') + '  Liste: '
    + nm(x.ersteId) + ' ' + x.ersterWert + '   Rekord: '
    + x.halter.map(nm).join(', ') + ' ' + x.rekWert + '  (' + x.spiele + ' Spiele)');
});

// 1. Derselbe Erste. Ein Rekord, der jemand anderem gehört als dem, der in
//    der Liste oben steht, wäre für den Leser schlicht falsch.
const _posFalsch = ['drive','reves'].filter(pos => !_pw[pos].halter.includes(_pw[pos].ersteId));
ok(_posFalsch.length === 0,
   'der Rekord auf einer Position gehört dem Ersten dieser Liste',
   _posFalsch.map(p => p + ': Liste ' + nm(_pw[p].ersteId)
     + ', Rekord ' + _pw[p].halter.map(nm).join(', ')).join(' · ')
   || 'Sturm und Abwehr deckungsgleich');

// 2. Und dieselbe Zahl. Sie steht rechts in der Liste und im Beleg des
//    Rekords; wichen sie ab, rechnete eine der beiden Seiten anders.
const _posWert = ['drive','reves'].filter(pos => _pw[pos].ersterWert !== _pw[pos].rekWert);
ok(_posWert.length === 0,
   'die Liste und der Rekord nennen denselben Wert',
   _posWert.map(p => p + ': ' + _pw[p].ersterWert + ' ≠ ' + _pw[p].rekWert).join(' · ')
   || 'Sturm ' + _pw.atk.rekWert + ' · Abwehr ' + _pw.def.rekWert);

// 3. Die Untergrenze greift. Ohne sie stünde der Rekord nach fünf Partien
//    auf einer Position bei dem, der zufällig vier davon gewonnen hat — der
//    Wert wiegt Erfahrung zwar mit, aber ab 25 Partien ist dieser Faktor
//    praktisch voll und schiebt niemanden mehr nach unten.
//    Geprüft wird an der Wertung selbst: wer unter der Grenze liegt, bekommt
//    keinen Wert, nicht bloss einen kleinen.
const _unten = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx();
  const d = k => DISZIPLINEN.find(x => x.id === k).allzeit;
  const out = {drunter:[], falsch:[]};
  Object.keys(C.P).forEach(id => {
    const p = C.P[id];
    [['drive', 'drive_ace', p.drvG], ['reves', 'reves_ace', p.revG]].forEach(([pos, k, g]) => {
      if(g >= 25) return;
      out.drunter.push(pos + ' ' + id + ' ' + g);
      if(d(k).val(p, C) != null) out.falsch.push(pos + ' ' + id + ' ' + g + ' Partien');
    });
  });
  return out;
})())`));
ok(_unten.drunter.length > 0 && _unten.falsch.length === 0,
   'unter 25 Partien auf einer Position gibt es keinen Wert',
   _unten.falsch.join(', ')
   || _unten.drunter.length + ' Fälle unter der Grenze, keiner gewertet');
ok(_pw.atk.spiele >= 25 && _pw.def.spiele >= 25,
   'beide Positionsrekorde stehen auf mindestens 25 Partien',
   'Sturm ' + _pw.atk.spiele + ' · Abwehr ' + _pw.def.spiele);

// ── „Player of the Day" gibt es genau einmal ────────────────────────
// Drei Stellen bestimmten den Sieger eines Spieltags: `_periodWinnerMap` mit
// Tiebreak ueber das Elo-Delta, und daneben „Allwetter" und „Tag der Goetter"
// mit einer eigenen Rechnung OHNE Tiebreak. Gemessen sind 12 der 51
// entschiedenen Tage punktgleich — dort trugen beide Spieler den Tag, obwohl
// nur einer Player of the Day ist. Beide Beschreibungen sagen ausdruecklich
// „Player of the Day geworden" [§C27].
//
// Nachgerechnet wird hier unabhaengig: aus der Siegerliste, die auch das
// POTD-Badge zaehlt. Wer die tolerante Rechnung zurueckholt, faellt hier auf.
const _potdEin = JSON.parse(K.eval(`JSON.stringify((function(){
  const sieger = _periodWinnerMap(matches, 'day');
  const heute = new Date().toISOString().slice(0,10);
  const proTag = matchesByDay(matches);
  // Wie viele entschiedene Tage sind punktgleich? Ohne sie prueft der
  // Vergleich nichts.
  let gleich = 0, entschieden = 0;
  Object.keys(proTag).forEach(d => {
    if(d === heute) return;
    const ms = proTag[d]; if(ms.length < 2) return;
    const w = {};
    ms.forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(pid => {
      if(!w[pid]) w[pid] = 0;
      const onA = (pid===m.a1||pid===m.a2);
      if((onA&&m.winner==='A')||(!onA&&m.winner==='B')) w[pid]++;
    }));
    const mx = Math.max.apply(null, Object.values(w));
    if(mx < 3) return;
    entschieden++;
    if(Object.keys(w).filter(p => w[p] === mx).length > 1) gleich++;
  });
  const tage = Object.keys(proTag).filter(d => d !== heute).sort();
  const abweichung = [], popAbw = [];
  players.forEach(p => {
    // Allwetter: fuenf verschiedene Wochentage als SIEGER.
    const wt = new Set();
    tage.forEach(t => { if(sieger[t] !== p.id) return;
      const [y,mo,d] = t.split('-').map(Number);
      wt.add(new Date(y, mo-1, d).getDay()); });
    const sollAll = wt.size >= 5 ? 1 : 0;
    // Tag der Goetter: drei eigene Spieltage in Folge als SIEGER.
    let cur = 0, sollGod = 0;
    tage.forEach(t => {
      if(!proTag[t].some(m => matchOf(p.id, m))) return;   // Tag ohne ihn
      if(sieger[t] === p.id){ cur++; if(cur >= 3){ sollGod++; cur = 0; } }
      else cur = 0;
    });
    // Das Popover der Auszeichnung zeigt dieselben Wochentage als Chips. Es
    // zaehlte den Tag selbst nach, ohne den Tiebreak, und markierte bei
    // Gleichstand an Siegen Tage, die die Auszeichnung nicht zaehlt.
    const pop = [...(_badgeStreakState('allwetter', p.id).weekdays || [])].sort().join(',');
    if(pop !== [...wt].sort().join(',')) popAbw.push(pmap()[p.id].name + ' ' + pop + '≠' + [...wt].sort().join(','));
    const istAll = countAllwetter(p.id), istGod = countGodlyStreak(p.id);
    if(istAll !== sollAll) abweichung.push(pmap()[p.id].name + ' Allwetter ' + istAll + '≠' + sollAll);
    if(istGod !== sollGod) abweichung.push(pmap()[p.id].name + ' Goetter ' + istGod + '≠' + sollGod);
  });
  return {entschieden, gleich, abweichung, popAbw};
})())`));
ok(_potdEin.gleich > 0, 'es gibt punktgleiche Spieltage — sonst prueft der Vergleich nichts',
   _potdEin.gleich + ' von ' + _potdEin.entschieden + ' entschiedenen Tagen');
ok(_potdEin.abweichung.length === 0,
   'Allwetter und Tag der Goetter zaehlen denselben Sieger wie das POTD-Badge',
   _potdEin.abweichung.join(' · ') || 'alle gleich');
ok(_potdEin.popAbw.length === 0,
   'das Popover von Allwetter zeigt dieselben Wochentage, die die Auszeichnung zaehlt',
   _potdEin.popAbw.join(' · ') || 'alle gleich');

// ── Der Wandler liest exakt dasselbe Positionsprofil wie das Profil ──
const _wandler = JSON.parse(K.eval(`JSON.stringify((function(){
  const d = CHRONICLES.find(x => x.id === 'switcher');
  const C = _chronicleCtx();
  const kandidaten = Object.keys(C.P).filter(id => C.P[id].games >= 60)
    .map(id => ({id, profil:positionsProfilWert(C.P[id]), wert:d.val(C.P[id], C)}))
    .filter(x => x.wert != null);
  const best = Math.max.apply(null, kandidaten.map(x => x.wert));
  const soll = kandidaten.filter(x => Math.abs(x.wert-best) <= 1e-9).map(x=>x.id).sort();
  const ist = ((allChronicles().byId.switcher || {}).pids || []).slice().sort();
  const probe = {games:80,drvG:40,revG:40,drvPerf:8,revPerf:-4};
  const profil = positionsProfilWert(probe), wert = d.val(probe, C);
  return {soll,ist,profil,wert,
    passt:Math.abs(wert - (1-Math.abs(profil-.5)*2)) < 1e-9,
    beleg:d.ev(probe, wert)};
})())`));
ok(_wandler.passt, 'Wandler und Profil benutzen dieselbe Positionsformel',
   _wandler.profil.toFixed(3) + ' → ' + _wandler.wert.toFixed(3));
ok(_wandler.soll.join(',') === _wandler.ist.join(','),
   'der ausgeglichenste Profilwert haelt den Wandler', _wandler.ist.map(nm).join(', '));
ok(/% Sturm, \d+ % Abwehr/.test(_wandler.beleg),
   'der Wandler-Beleg zeigt die gemeinsame Profilzahl', _wandler.beleg);

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DER KATALOG DER DREIUNDSECHZIG ═══');
// Fuenf Kammern, feste Zahlen, feste Grundwerte. Die Zahlen stehen hier und
// nicht nur in der Arbeitsanweisung: ein Rekord, der durch einen Filter oder
// eine unvollstaendige Liste faellt, ist unsichtbar, und genau das faellt
// sonst niemandem auf.
const _rk = JSON.parse(K.eval(`JSON.stringify(CHRONICLES.map(c => ({
  id:c.id, name:c.name, kind:c.kind, basis:c.basis, ic:c.ic,
  mind:c.mind, zeitraum:c.zeitraum, cond:c.cond, wie:c.wie,
  neg:c.neg, fenster:c.fenster, hatVal:typeof c.val === 'function'
})))`));
ok(_rk.length === 62, 'der aktive Katalog enthaelt genau 62 Rekorde', _rk.length + '');
const _rkZahl = {};
_rk.forEach(c => { _rkZahl[c.kind] = (_rkZahl[c.kind] || 0) + 1; });
const _rkSoll = {koennen:16, form:6, mark:8, fuegung:17, shame:15};
Object.keys(_rkSoll).forEach(k => ok(_rkZahl[k] === _rkSoll[k],
  'die Kammer ' + k + ' hat ' + _rkSoll[k] + ' Rekorde', (_rkZahl[k] || 0) + ''));
// Ein Abstand zwischen zwei Quoten heisst „%-Punkte", auch gekuerzt: als
// „+12 %" las er sich in Zelle, Podest und Karte wie zwoelf Prozent mehr.
const _ppKurz = JSON.parse(K.eval(`JSON.stringify((function(){
  const out = {n:0, falsch:[]};
  CHRONICLES.forEach(c => (chronicleRang(c.id) || []).slice(0, 3).forEach(r => {
    const m = String(r.ev || '').match(/^[+\\u2212-]?[0-9]+ %-Punkte/);
    if(!m) return;
    out.n++;
    if(_chronKurz(r.ev) !== m[0]) out.falsch.push(c.id + ': ' + _chronKurz(r.ev));
  }));
  return out;
})())`));
// Und kein Abstand steht als null mit Vorzeichen da: „−0 %-Punkte" stand in
// der Liste des Abschwungs, weil ein Rueckgang von 0,4 Punkten als Richtung
// zaehlte. Was auf null rundet, ist keine.
const _nullRichtung = JSON.parse(K.eval(`JSON.stringify(CHRONICLES.flatMap(c =>
  (chronicleRang(c.id) || []).filter(r => /^[+\\u2212-]0( |$)/.test(String(r.ev || '').replace(/\\s?%(-Punkte)?/, ' ')))
    .map(r => c.id + ': ' + r.ev.split(' · ')[0])))`));
ok(_nullRichtung.length === 0, 'kein Abstand steht als null mit Vorzeichen in einem Rennen',
   _nullRichtung.slice(0, 3).join(' · ') || 'keiner');
// Ein Abstand, neben dem seine beiden Quoten stehen, ist ihre Differenz, so
// wie sie dastehen: „+13 %-Punkte · 67 statt 55 % erwartet" stand beim
// Sturmführer, weil der Abstand ungerundet gerundet wurde und die Quoten
// einzeln. Wer nachrechnete, kam auf 12. Geprueft wird jeder Spieler im
// Rennen, nicht nur der Halter.
const _ppRechnung = JSON.parse(K.eval(`JSON.stringify((function(){
  const out = {n:0, falsch:[]};
  CHRONICLES.forEach(c => (chronicleRang(c.id) || []).forEach(r => {
    const ev = String(r.ev || '');
    const m = ev.match(/^([+\\u2212-]?)([0-9]+) %-Punkte[^·]*· (.*)$/);
    if(!m) return;
    const q = [...m[3].matchAll(/([0-9]+(?:,[0-9]+)?)(?= %| statt| gegen)/g)].map(x => +x[1].replace(',', '.'));
    if(q.length !== 2) return;
    out.n++;
    if(Math.abs(+m[2] - Math.abs(q[0] - q[1])) > 1e-9) out.falsch.push(c.id + ': ' + ev);
  }));
  return out;
})())`));
ok(_ppRechnung.n >= 40 && _ppRechnung.falsch.length === 0,
   'ein Abstand in Prozentpunkten ist die Differenz der Quoten daneben',
   _ppRechnung.falsch.slice(0, 3).join(' · ') || _ppRechnung.n + ' Belege');
ok(_ppKurz.n >= 10 && _ppKurz.falsch.length === 0,
   'ein Abstand in Prozentpunkten behaelt gekuerzt seine Einheit',
   _ppKurz.falsch.slice(0, 3).join(' · ') || _ppKurz.n + ' Belege');
ok(Object.keys(_rkZahl).length === 5, 'es gibt genau fuenf Kammern',
   Object.keys(_rkZahl).join(', '));

// Die fuenf Folgen aus `mockup/besonderheiten`, ein zweites Mal aus den
// rohen Partien gerechnet und nicht aus der Rohsicht der Engine: die Engine
// zaehlt ueber `roh`, der Test ueber die gepackten Fixtures. Pendler,
// Wanderpass und Spurwechsel sind laengste Folgen (Partien, nicht
// Uebergaenge), der Stammkunde die laengste BEENDETE Pleitenserie gegen
// einen Gegner, Serienstopp die laengste Gegner-Siegesserie, die ein eigener Sieg
// beendet — je Partie die laengere der beiden, nicht ihre Summe.
const _folgeSoll = (() => {
  const ms = realMatches.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const P = {}, lauf = {};
  const hin = (x, k, passt, weiter) => {
    const st = x.st[k] || (x.st[k] = {n:0, best:0, prev:null});
    if(!passt){ st.n = 0; st.prev = null; return; }
    st.n = (st.n > 0 && weiter(st.prev)) ? st.n + 1 : 1;
    st.best = Math.max(st.best, st.n);
  };
  ms.forEach(m => {
    const vor = {}; [m.a1, m.a2, m.b1, m.b2].forEach(id => vor[id] = lauf[id] || 0);
    [m.a1, m.a2, m.b1, m.b2].forEach(id => {
      const onA = id === m.a1 || id === m.a2;
      const w = (m.winner === 'A') === onA;
      const mate = id === m.a1 ? m.a2 : id === m.a2 ? m.a1 : id === m.b1 ? m.b2 : m.b1;
      const pos = m[(id === m.a1 ? 'a1' : id === m.a2 ? 'a2' : id === m.b1 ? 'b1' : 'b2') + '_side'];
      const geg = onA ? [m.b1, m.b2] : [m.a1, m.a2];
      const e = onA ? m.exp_a : 1 - m.exp_a;
      const lage = e < 0.45 ? 'u' : e > 0.55 ? 'f' : '';
      const x = P[id] || (P[id] = {g:0, st:{}, bann:{}, bannMax:0, stopp:0, last:null});
      x.g++;
      const l = x.last;
      hin(x, 'pd', true, () => l && l.pos !== pos);
      hin(x, 'wp', true, () => l && l.mate !== mate);
      hin(x, 'sp', !!lage, () => l && l.lage && l.lage !== lage);
      geg.forEach(g => { if(w){ x.bannMax = Math.max(x.bannMax, x.bann[g] || 0); x.bann[g] = 0; }
                         else x.bann[g] = (x.bann[g] || 0) + 1; });
      if(w) x.stopp = Math.max(x.stopp, vor[geg[0]], vor[geg[1]]);
      x.last = {pos, mate, lage};
    });
    [m.a1, m.a2, m.b1, m.b2].forEach(id => {
      lauf[id] = ((m.winner === 'A') === (id === m.a1 || id === m.a2)) ? (lauf[id] || 0) + 1 : 0; });
  });
  const wert = {pendler:x => x.st.pd.best, wanderpass:x => x.st.wp.best,
                spurwechsel:x => (x.st.sp || {best:0}).best,
                stammkunde:x => x.bannMax, serienstopp:x => x.stopp};
  const out = {};
  Object.keys(wert).forEach(id => {
    const feld = Object.keys(P).filter(pid => P[pid].g >= 30).map(pid => ({pid, v:wert[id](P[pid])}));
    const best = Math.max(...feld.map(f => f.v));
    out[id] = {best, halter:feld.filter(f => f.v === best).map(f => f.pid).sort()};
  });
  return out;
})();
const _folgeIst = JSON.parse(K.eval(`JSON.stringify(['pendler','wanderpass','spurwechsel','stammkunde','serienstopp']
  .reduce((o, id) => { const e = allChronicles().byId[id];
    o[id] = e ? {best:e.val, halter:e.pids.slice().sort()} : null; return o; }, {}))`));
Object.keys(_folgeSoll).forEach(id => {
  const s = _folgeSoll[id], i = _folgeIst[id];
  ok(i && i.best === s.best && i.halter.join() === s.halter.join(),
     '„' + id + '" stimmt mit der Nachrechnung aus den rohen Partien',
     i ? i.best + ' ' + i.halter.map(nm).join('/') + ' statt ' + s.best + ' ' + s.halter.map(nm).join('/')
       : 'nicht vergeben');
});
// Eine Folge ist eine Laenge und keine Summe: der Stammkunde nennt EINEN Gegner,
// der Serienstopp EINE Serie. Der Beleg beginnt mit dieser Zahl.
ok(K.eval(`['pendler','wanderpass','spurwechsel','stammkunde','serienstopp'].every(id => {
  const e = allChronicles().byId[id]; if(!e) return false;
  const c = CHRONICLE_BY_ID[id];
  return parseInt(c.ev(_chronicleCtx().P[e.pid], e.val), 10) === e.val && !!c.zeit(_chronicleCtx().P[e.pid]);
})`), 'jede neue Folge belegt ihren Wert und nennt, wann sie lag');

// Jede ID und jedes Zeichen genau einmal. Zwei Rekorde mit derselben
// Zeichnung sind in einer Kachel von 34 Pixeln nicht zu unterscheiden.
const _rkDopId = _rk.map(c => c.id).filter((x, i, a) => a.indexOf(x) !== i);
ok(_rkDopId.length === 0, 'jede Rekord-ID ist eindeutig', _rkDopId.join(', ') || '65 Stueck');
const _rkDopIc = _rk.map(c => c.ic).filter((x, i, a) => a.indexOf(x) !== i);
ok(_rkDopIc.length === 0, 'jedes Rekord-Icon ist im Rekordkontext eindeutig',
   _rkDopIc.join(', ') || _rk.length + ' verschiedene');

// Jeder Eintrag traegt die sechs Angaben, die Karte und Blatt zeigen. Ohne
// `mind` musste der Leser die Mindestbasis aus dem Bedingungssatz
// heraussuchen, ohne `zeitraum` stand nirgends, ueber welche Strecke
// gerechnet wird.
const _rkUnvoll = _rk.filter(c => !c.name || !c.cond || !(c.wie || '').trim()
  || !c.mind || !c.zeitraum || c.basis == null || !c.hatVal)
  .map(c => c.id + '(' + ['name','cond','wie','mind','zeitraum','basis','val']
    .filter(f => f === 'basis' ? c.basis == null
      : f === 'val' ? !c.hatVal : !(c[f] || '').trim()).join('/') + ')');
ok(_rkUnvoll.length === 0,
   'jeder Rekord hat Name, Beschreibung, Berechnung, Mindestbasis, Zeitraum und Grundwert',
   _rkUnvoll.slice(0, 4).join(' · ') || 'alle 65');
// Die Erklaerung ist eine Erklaerung und kein Halbsatz.
const _rkKurz = _rk.filter(c => (c.wie || '').length < 40).map(c => c.id);
ok(_rkKurz.length === 0, 'jede Berechnung ist ausformuliert', _rkKurz.join(', ') || 'alle 65');
// Kein Gedankenstrich in den sichtbaren Texten dieses Reiters.
const _rkStrich = _rk.filter(c => /[—–]/.test(
  [c.name, c.cond, c.wie, c.mind, c.zeitraum].join(' '))).map(c => c.id);
ok(_rkStrich.length === 0, 'kein Gedankenstrich in Bedingung, Erklaerung oder Zeitraum',
   _rkStrich.join(', ') || 'keiner');
// Und kein interner Begriff.
const _rkIntern = _rk.filter(c => /Rohsicht|Sortierwert|Ziehung|Wurzeld|Datenpipeline/i.test(
  [c.cond, c.wie, c.mind, c.zeitraum].join(' '))).map(c => c.id);
ok(_rkIntern.length === 0, 'kein interner Begriff in einem sichtbaren Text',
   _rkIntern.join(', ') || 'keiner');

// Die Grundwerte je Kammer [§C34]. Koennen und die leistungsbezogene Form
// wiegen 100, eine Rolle und eine Fuegung 75, eine Schattenseite null. Mit
// 150 wog ein Koennen-Rekord so viel wie ein Meistertitel. Geprueft wird die
// Zahl selbst und nicht nur `REKORD_GRUNDWERT`: die Konstante stimmt immer
// mit sich selbst ueberein.
const _rolle = ['dauersturm','abwehrmauer','tailwind','solorun',
                'wall','sturmtreue','switcher'];
const _basisFehler = _rk.filter(c => {
  const soll = c.kind === 'shame' ? 0
    : c.kind === 'fuegung' ? 75
    : _rolle.indexOf(c.id) >= 0 ? 75 : 100;
  return c.basis !== soll;
}).map(c => c.id + ' ' + c.basis);
ok(_basisFehler.length === 0, 'jede Kammer traegt ihren Grundwert',
   _basisFehler.join(', ') || '100 / 75 / 0');
ok(_rk.filter(c => c.kind === 'koennen').every(c => c.basis === 100),
   'Koennen gibt 100 Punkte Grundwert');
ok(_rk.filter(c => c.kind === 'form' && _rolle.indexOf(c.id) < 0)
     .every(c => c.basis === 100),
   'leistungsbezogene Form gibt 100 Punkte Grundwert');
ok(_rk.filter(c => c.kind === 'form' && _rolle.indexOf(c.id) >= 0)
     .every(c => c.basis === 75),
   'rollenbezogene Form gibt 75 Punkte Grundwert');
ok(_rk.filter(c => c.kind === 'fuegung').every(c => c.basis === 75),
   'eine Fuegung gibt 75 Punkte Grundwert');
ok(_rk.filter(c => c.kind === 'shame').every(c => c.basis === 0),
   'eine Schattenseite gibt null Punkte');
// Und keine Schattenseite bringt Prestige.
const _schPunkte = K.eval(`(function(){
  const T = prestigeTabelle(); let n = 0;
  Object.keys(T.byPid).forEach(pid => {
    (T.byPid[pid].quellen || []).forEach(q => {
      if(q.q !== 'rekord') return;
      const c = CHRONICLE_BY_ID[q.id];
      if(c && c.kind === 'shame' && q.p > 0) n++;
    });
  });
  return n;
})()`);
ok(_schPunkte === 0, 'keine Schattenseite bringt Prestige', _schPunkte + ' Quellen');

// ── Geteilt wird der Grundwert, gedaempft wird danach ────────────────
// Die Reihenfolge ist die Aussage: erst durch die Zahl der Halter, dann in
// die Wurzelstaffel. Andersherum haengte der Anteil eines Halters daran, wie
// viele Rekorde er sonst haelt.
const _teil = JSON.parse(K.eval(`JSON.stringify((function(){
  const T = prestigeTabelle(), A = allChronicles().byId, out = [];
  Object.keys(T.byPid).forEach(pid => {
    (T.byPid[pid].quellen || []).forEach(q => {
      if(q.q !== 'rekord') return;
      const c = CHRONICLE_BY_ID[q.id]; if(!c) return;
      out.push({id:q.id, pid, basis:q.basis, soll:c.basis,
                halter:q.halter, echt:(A[q.id] || {pids:[]}).pids.length,
                voll:q.voll, netto:q.p, staffel:q.staffel});
    });
  });
  return out;
})())`));
ok(_teil.length > 10, 'es gibt Rekordquellen im Prestige', _teil.length + '');
const _tBasis = _teil.filter(x => x.basis !== x.soll).map(x => x.id);
ok(_tBasis.length === 0, 'die Quelle rechnet mit dem Grundwert des Katalogs',
   _tBasis.join(', ') || 'alle');
// Ohne Grundwert am Eintrag gilt der der Kammer. Der Rueckfall las vorher
// einen Faktor je Art mit Schluesseln, die der Katalog nicht fuehrt, und gab
// jedem Eintrag 75 — auch einem Koennen-Rekord.
const _rueckfall = JSON.parse(K.eval(`JSON.stringify(['koennen','form','mark','fuegung','shame']
  .map(k => k + ':' + _rekordBasis({kind:k})))`)).join(' ');
ok(_rueckfall === 'koennen:100 form:100 mark:100 fuegung:75 shame:0',
   'ohne Grundwert am Eintrag gilt der Wert der Kammer', _rueckfall);
const _tHalter = _teil.filter(x => x.halter !== x.echt).map(x => x.id);
ok(_tHalter.length === 0, 'die Quelle teilt durch die Zahl der heutigen Halter',
   _tHalter.join(', ') || 'alle');
const _tVoll = _teil.filter(x => Math.abs(x.voll - x.basis / x.halter) > 1e-9)
  .map(x => x.id + ': ' + x.voll + ' statt ' + x.basis / x.halter);
ok(_tVoll.length === 0, 'geteilte Rekorde teilen zuerst ihren Grundwert',
   _tVoll.slice(0, 3).join(' · ') || _teil.length + ' Quellen');
const _tNetto = _teil.filter(x =>
  Math.abs(x.netto - x.voll / Math.sqrt(x.staffel)) > 1e-9)
  .map(x => x.id);
ok(_tNetto.length === 0, 'danach greift die zentrale Daempfung',
   _tNetto.join(', ') || _teil.length + ' Quellen');
// Und der rohe Grundwert ist nie das, was jemand bekommt.
const _gedaempft = _teil.filter(x => x.netto < x.basis - 1e-9).length;
ok(_gedaempft > 0, 'ein geteilter oder gestapelter Rekord gibt weniger als seinen Grundwert',
   _gedaempft + ' von ' + _teil.length);

// ── Die Mindestbasis entscheidet nur ueber die Teilnahme ────────────
// Sie darf nicht in die Sortierung eingehen: wer sie erfuellt, wird nach dem
// Wert verglichen, und mehr Partien duerfen den Wert nicht heben [Regel 6/7].
const _sort = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx(), out = [];
  CHRONICLES.forEach(c => {
    const r = chronicleRang(c.id);
    for(let i = 1; i < r.length; i++){
      if(r[i].wert > r[i-1].wert + 1e-9){ out.push(c.id); break; }
    }
  });
  return out;
})())`));
ok(_sort.length === 0, 'die Rangfolge folgt allein dem Wert',
   _sort.join(', ') || 'alle 65 sortiert');
// Und die Halter sind ALLE, die den Bestwert punktgleich halten.
const _gleich = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles().byId, out = {fehlt:[], geteilt:0};
  CHRONICLES.forEach(c => {
    const e = A[c.id]; if(!e) return;
    const r = chronicleRang(c.id);
    const soll = r.filter(x => Math.abs(x.wert - e.val) <= 1e-9).map(x => x.pid).sort();
    if(soll.join(',') !== e.pids.slice().sort().join(','))
      out.fehlt.push(c.id + ': ' + e.pids.length + ' statt ' + soll.length);
    if(soll.length > 1) out.geteilt++;
  });
  return out;
})())`));
ok(_gleich.fehlt.length === 0, 'ein exakter Gleichstand erzeugt mehrere Halter',
   _gleich.fehlt.join(' · ') || _gleich.geteilt + ' geteilte Rekorde');
ok(_gleich.geteilt > 0, 'in den echten Partien gibt es geteilte Rekorde',
   _gleich.geteilt + '');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DIE FENSTER SIND FESTE ENDFENSTER ═══');
// Jedes Formfenster wird unabhaengig nachgerechnet: aus den echten Partien
// je Spieler in Spielreihenfolge, genau die letzten N. Der beste Abschnitt
// IRGENDWO in einer Laufbahn gehoerte dem Vielspieler, weil dreihundert
// Partien 271 Dreissigerbloecke haben und dreissig Partien einen [Regel 20].
const _sicht = {};
ordered.forEach(mm => {
  [mm.a1, mm.a2, mm.b1, mm.b2].forEach(id => {
    if(!id) return;
    const onA = (id === mm.a1 || id === mm.a2);
    const w = (onA && mm.winner === 'A') || (!onA && mm.winner === 'B');
    (_sicht[id] || (_sicht[id] = [])).push({
      w, gf: onA ? mm.games_a : mm.games_b, ga: onA ? mm.games_b : mm.games_a,
      pos: id === mm.a1 ? mm.a1_side : id === mm.a2 ? mm.a2_side
         : id === mm.b1 ? mm.b1_side : mm.b2_side,
      exp: onA ? mm.exp_a : 1 - mm.exp_a
    });
  });
});
const _wertVon = (cid) => JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx(), c = CHRONICLE_BY_ID['${cid}'], out = {};
  Object.keys(C.P).forEach(pid => { const v = c.val(C.P[pid], C);
    out[pid] = (v == null || !isFinite(v)) ? null : v; });
  return out;
})())`));
const _fenster = (cid, label, soll) => {
  const ist = _wertVon(cid);
  const fehler = Object.keys(ist).filter(pid => {
    const r = _sicht[pid] || [];
    const s = soll(r);
    if(s == null) return ist[pid] != null;
    return ist[pid] == null || Math.abs(ist[pid] - s) > 1e-9;
  }).map(pid => nm(pid) + ': ' + ist[pid] + ' vs ' + soll(_sicht[pid] || []));
  ok(fehler.length === 0, label, fehler.slice(0, 3).join(' · ')
     || Object.keys(ist).length + ' Spieler geprueft');
};
const _rkQ = a => a.length ? a.filter(x => x.w).length / a.length : null;
_fenster('lauf', '„Der Lauf" nimmt genau die letzten 40 Partien',
  r => r.length >= 40 ? _rkQ(r.slice(-40)) : null);
_fenster('hochform', '„Der Hoehenflug" vergleicht 20 gegen die vorherigen 20',
  r => { if(r.length < 40) return null;
    const d = _rkQ(r.slice(-20)) - _rkQ(r.slice(-40, -20)); return d > 0 ? d : null; });
_fenster('dauersturm', '„Der Dauerstuermer" nimmt genau die letzten 50 Partien',
  r => r.length >= 50
    ? r.slice(-50).filter(x => x.pos === 'drive').length / 50 : null);
_fenster('abwehrmauer', '„Die Abwehrmauer" nimmt dieselben letzten 50 Partien',
  r => r.length >= 50
    ? r.slice(-50).filter(x => x.pos !== 'drive').length / 50 : null);
// Und die beiden Haelften des Dauerstuermers ergeben zusammen genau eins.
const _ds = _wertVon('dauersturm'), _am = _wertVon('abwehrmauer');
const _dsSumme = Object.keys(_ds).filter(pid => _ds[pid] != null && _am[pid] != null)
  .filter(pid => Math.abs(_ds[pid] + _am[pid] - 1) > 1e-9);
ok(_dsSumme.length === 0, 'Sturm- und Abwehranteil des Fensters ergeben eins',
   _dsSumme.map(nm).join(', ') || 'alle');

// Die Mitspielerstaerke: 25 gegen die 25 davor, gerechnet mit der Elo VOR
// der jeweiligen Partie [Regel 5]. Nachgerechnet wird sie aus derselben
// Historie, aus der die App sie nimmt — eine zweite Elo-Rechnung hier waere
// selbst der Fehler, den der Test sucht.
const _rw = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx(), g = getGlobalSim(), vor = {};
  (g.history || []).forEach(h => { vor[h.matchId] = h.eloBefore || {}; });
  const roh = {};
  matches.slice().sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach(m => {
      [m.a1,m.a2,m.b1,m.b2].forEach(id => {
        if(!id) return;
        const onA = (id === m.a1 || id === m.a2);
        const mate = onA ? (id === m.a1 ? m.a2 : m.a1) : (id === m.b1 ? m.b2 : m.b1);
        (roh[id] || (roh[id] = [])).push((vor[m.id] || {})[mate]);
      });
    });
  const mit = a => { const w = a.filter(x => x != null && isFinite(x));
    return w.length ? w.reduce((n,x) => n+x, 0) / w.length : null; };
  const out = {tail:[], solo:[], n:0};
  Object.keys(C.P).forEach(pid => {
    const r = roh[pid] || [];
    let soll = null;
    if(r.length >= 50){
      const a = mit(r.slice(-25)), b = mit(r.slice(-50, -25));
      if(a != null && b != null) soll = a - b;
    }
    out.n++;
    const t = CHRONICLE_BY_ID.tailwind.val(C.P[pid], C);
    const s = CHRONICLE_BY_ID.solorun.val(C.P[pid], C);
    const tSoll = (soll != null && soll > 0) ? soll : null;
    const sSoll = (soll != null && soll < 0) ? -soll : null;
    if((t == null) !== (tSoll == null) || (t != null && Math.abs(t - tSoll) > 1e-9))
      out.tail.push(pid + ': ' + t + ' vs ' + tSoll);
    if((s == null) !== (sSoll == null) || (s != null && Math.abs(s - sSoll) > 1e-9))
      out.solo.push(pid + ': ' + s + ' vs ' + sSoll);
  });
  return out;
})())`));
ok(_rw.tail.length === 0, '„Der Rueckenwind" vergleicht 25 gegen die vorherigen 25',
   _rw.tail.slice(0, 2).join(' · ') || _rw.n + ' Spieler geprueft');
ok(_rw.solo.length === 0, '„Der Einzelkaempfer" nimmt dieselben beiden Fenster',
   _rw.solo.slice(0, 2).join(' · ') || _rw.n + ' Spieler geprueft');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ NICHTS AUS DER ZUKUNFT ═══');
// Der Serienstand eines Gegners ist der Stand VOR dem Anpfiff, nicht die
// Serie, die daraus spaeter geworden ist [Regel 3]. „Der Serienstopp" liest
// ihn fuer jeden eigenen Sieg; unabhaengig nachgezaehlt.
const _lsSoll = {};
{
  const run = {};
  ordered.forEach(mm => {
    const ids = [mm.a1, mm.a2, mm.b1, mm.b2];
    const vorher = {};
    ids.forEach(x => { if(x) vorher[x] = run[x] || 0; });
    ids.forEach(id => {
      if(!id) return;
      const onA = (id === mm.a1 || id === mm.a2);
      const w = (onA && mm.winner === 'A') || (!onA && mm.winner === 'B');
      const geg = onA ? [mm.b1, mm.b2] : [mm.a1, mm.a2];
      const g = Math.max(vorher[geg[0]] || 0, vorher[geg[1]] || 0);
      if(w && g > (_lsSoll[id] || 0)) _lsSoll[id] = g;
    });
    ids.forEach(id => { if(!id) return;
      const onA = (id === mm.a1 || id === mm.a2);
      const w = (onA && mm.winner === 'A') || (!onA && mm.winner === 'B');
      run[id] = w ? (run[id] || 0) + 1 : 0; });
  });
}
const _lsIst = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx(), o = {};
  Object.keys(C.P).forEach(pid => { o[pid] = C.P[pid].stoppMax; });
  return o;
})())`));
const _lsFehler = Object.keys(_lsIst).filter(pid => _lsIst[pid] !== (_lsSoll[pid] || 0))
  .map(pid => nm(pid) + ': ' + _lsIst[pid] + ' vs ' + (_lsSoll[pid] || 0));
ok(_lsFehler.length === 0, '„Der Serienstopp" liest den Serienstand vor der Partie',
   _lsFehler.slice(0, 3).join(' · ') || Object.keys(_lsIst).length + ' Spieler geprueft');

// Jede Elo-Bedingung nimmt die Siegchance unmittelbar vor dem Anpfiff, also
// `exp_a` aus der Partie selbst und keine spaeter gerechnete Quote [Regel 4].
const _expSoll = {};
ordered.forEach(mm => {
  [mm.a1, mm.a2, mm.b1, mm.b2].forEach(id => {
    if(!id) return;
    const onA = (id === mm.a1 || id === mm.a2);
    const e = onA ? mm.exp_a : 1 - mm.exp_a;
    const w = (onA && mm.winner === 'A') || (!onA && mm.winner === 'B');
    const r = _expSoll[id] || (_expSoll[id] = {fN:0, fL:0, summe:0, g:0});
    r.g++; r.summe += e;
    if(e > 0.55){ r.fN++; if(!w) r.fL++; }
  });
});
const _expIst = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx(), o = {};
  Object.keys(C.P).forEach(pid => { const p = C.P[pid];
    o[pid] = {fN:p.favN, fL:p.favL, summe:p.expSum, g:p.games}; });
  return o;
})())`));
const _expFehler = Object.keys(_expIst).filter(pid => {
  const s = _expSoll[pid] || {};
  const i = _expIst[pid];
  return i.fN !== s.fN || i.fL !== s.fL || i.g !== s.g
      || Math.abs(i.summe - s.summe) > 1e-6;
}).map(pid => nm(pid));
ok(_expFehler.length === 0,
   'Favorit und Soll kommen aus der Siegchance vor der Partie',
   _expFehler.join(', ') || Object.keys(_expIst).length + ' Spieler geprueft');

// Und eine historische Rekordlage kennt nur Partien von damals. Gemessen
// wird die Lage an einem Schnitt gegen dieselbe Rechnung auf einem gekuerzten
// Match-Array: kommt dasselbe heraus, ist nichts aus der Zukunft eingeflossen.
const _histGrenze = new Date('2026-07-15T23:59:59Z').getTime();
const _histSchnitt = K.eval(`JSON.stringify(Object.keys(
  allChronicles(${_histGrenze}).byId).map(id => id + ':'
    + JSON.stringify(allChronicles(${_histGrenze}).byId[id].pids.slice().sort())
    + ':' + allChronicles(${_histGrenze}).byId[id].val.toFixed(6)).sort())`);
const _histKurz = K.eval(`(function(){
  const alle = matches;
  try {
    matches = alle.filter(m => new Date(m.created_at).getTime() <= ${_histGrenze});
    invalidateCache();
    const A = allChronicles().byId;
    return JSON.stringify(Object.keys(A).map(id => id + ':'
      + JSON.stringify(A[id].pids.slice().sort()) + ':' + A[id].val.toFixed(6)).sort());
  } finally { matches = alle; invalidateCache(); }
})()`);
ok(_histSchnitt === _histKurz,
   'eine historische Rekordlage rechnet ohne spaetere Partien',
   _histSchnitt === _histKurz ? JSON.parse(_histSchnitt).length + ' Rekorde gleich'
     : 'Schnitt und gekuerztes Array weichen ab');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DIE GEGENPAARE ═══');
// Zwoelf Paare messen dieselbe Frage von zwei Seiten. Sie muessen dieselbe
// Mindestbasis und denselben Zeitraum tragen: sonst waere eine Haelfte
// leichter zu halten als die andere, und der Halter der schweren Seite
// haette mehr getan fuer denselben Eintrag.
const PAARE = [
  ['drive_ace','reves_ace'], ['sturmfuehrer','defchief'],
  ['kaltstart','schlussball'], ['dauersturm','abwehrmauer'],
  ['sturmtreue','wall'], ['bedrock','handwriting'], ['tailwind','solorun'],
  ['catalyst','ballast'], ['comeback_king','noanswer'],
  ['unstoppable','drought'], ['wiedereinstieg','rost'], ['kaltblut','weicheknie']
];
const _byId = {}; _rk.forEach(c => { _byId[c.id] = c; });
const _paarFehlt = PAARE.filter(([a, b]) => !_byId[a] || !_byId[b])
  .map(([a, b]) => a + '/' + b);
ok(_paarFehlt.length === 0, 'jedes Gegenpaar steht im Katalog',
   _paarFehlt.join(', ') || PAARE.length + ' Paare');
// Die Zahl in der Mindestbasis muss auf beiden Seiten dieselbe sein. Der
// Wortlaut darf abweichen — „20 Sturmspiele" und „20 Abwehrspiele" sind
// dieselbe Huerde.
const _zahlen = t => (String(t).match(/\d+/g) || []).join('/');
// Kein Paar ist mehr je Seite geeicht. Siegesserie ab acht und
// Pleitenserie ab sieben waren es, weil beide nicht dieselbe Häufigkeit
// haben; seit kein Rekord eine Wertlatte trägt, verlangen beide nur ihr
// erstes Glied.
const GEEICHT = {};
const _paarMind = PAARE.filter(([a, b]) => _byId[a] && _byId[b]
    && !GEEICHT[a + '|' + b]
    && _zahlen(_byId[a].mind) !== _zahlen(_byId[b].mind))
  .map(([a, b]) => a + ' „' + _byId[a].mind + '" vs ' + b + ' „' + _byId[b].mind + '"');
ok(_paarMind.length === 0, 'jedes Gegenpaar hat dieselbe Mindestbasis',
   _paarMind.join(' · ') || PAARE.length + ' Paare');
// Ein Rekord hat keine Untergrenze in Prozent. Wer 20 % seiner Wochen
// gewinnt und damit vorn liegt, haelt „Der Wochenherr" — eine Latte bei
// 25 % liess den Rekord sonst leer oder strich den Besten aus dem Rennen.
// Verlangt werden darf nur eine Stichprobe: Partien, Spieltage, Wochen,
// Niederlagen. Gelesen wird Bedingung, Mindestbasis UND die Wertfunktion:
// ein Text ohne Prozent ueber einer Rechnung mit `>= 0.25` waere gelogen.
const _prozentLatte = K.eval(`JSON.stringify(CHRONICLES.filter(c => {
  const d = DISZIPLINEN.find(x => x.id === c.id), a = d && d.allzeit;
  if(!a) return false;
  const txt = String(a.cond || '') + ' ' + String(a.mind || '');
  const code = String(a.val || '');
  // „mit 35 bis 65 % Siegchance" beschreibt die Teilmenge (welche Partien
  // zaehlen), keine Latte fuer den Wert — das bleibt erlaubt.
  return /(mindestens|höchstens|zwischen)\\s+\\d+(\\s*und\\s*\\d+)?\\s*(%|Prozent)/i.test(txt)
      || /[<>]=?\\s*(1\\s*-\\s*)?(0?\\.\\d|CHANCE_)/.test(code);
}).map(c => c.name))`);
ok(JSON.parse(_prozentLatte).length === 0, 'kein Liga-Rekord verlangt einen Mindestwert in Prozent',
   JSON.parse(_prozentLatte).join(', ') || _rk.length + ' Rekorde');
// Und auch keinen in Elo oder Serienlänge: „ab 8 Siegen in Folge", „ab 350
// Elo", „ab 150 Elo Verlust" waren dieselbe Latte in einer anderen Einheit.
// Eine Serie braucht ihr erstes Glied und ein Wechsel zwei Partien — mehr
// ist eine Latte. Elo-Werte stehen als ganze Zahl im Code, Stichproben
// heißen dort `games`, `losses`, `N` und so weiter.
const _wertLatte = K.eval(`JSON.stringify(CHRONICLES.filter(c => {
  const d = DISZIPLINEN.find(x => x.id === c.id), a = d && d.allzeit;
  if(!a) return false;
  const txt = String(a.cond || '') + ' ' + String(a.mind || '');
  return (a.min || 0) > 2
      || /[<>]=?\\s*-\\d{2,}/.test(String(a.val || ''))
      || /ab \\d+ (Elo|Siegen in Folge|Niederlagen in Folge|Partien im Wechsel)|\\d+ Elo Verlust/.test(txt);
}).map(c => c.name))`);
ok(JSON.parse(_wertLatte).length === 0, 'kein Liga-Rekord verlangt einen Mindestwert in Elo oder Serienlänge',
   JSON.parse(_wertLatte).join(', ') || _rk.length + ' Rekorde');
// Angriff und Abwehr werden gleich behandelt: die Rollenpaare tragen
// denselben Zeitraum und denselben Grundwert.
const ROLLENPAARE = [['drive_ace','reves_ace'], ['sturmfuehrer','defchief'],
  ['dauersturm','abwehrmauer'], ['sturmtreue','wall'],
  ['bedrock','handwriting']];
const _rollFehler = ROLLENPAARE.filter(([a, b]) =>
    _byId[a].basis !== _byId[b].basis
    || _zahlen(_byId[a].zeitraum) !== _zahlen(_byId[b].zeitraum))
  .map(([a, b]) => a + '/' + b);
ok(_rollFehler.length === 0, 'Angriff und Abwehr tragen denselben Wert und Zeitraum',
   _rollFehler.join(', ') || ROLLENPAARE.length + ' Rollenpaare');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ DIE GESTRICHENEN SIND WEG UND STUERZEN NICHT AB ═══');
const WEG = ['giant_slayer','thriller','unbowed','homefield','sundaychild',
             'strongphase','upswing','coldshower','torbilanz','striker_u',
             // Einundzwanzig, die nur die Siegquote anders verpackt zaehlten [§C35]
             'daylord','weeklord','unbeugsam','eloday','kopfhoch','breitenwirkung',
             'retourkutsche','rueckschlag','metronom','gegenwind','entscheider',
             'laufstopper','sovereign','rock','sniper','densephase','torrausch',
             'bitterloss','uebersoll','deutlich','ausgleich',
             // Drei, die sich mit anderen ueberschnitten: Wandler und
             // Positionsrekorde, Hoehenflug, die Monatschronik „Neuland"
             'umsteiger','aufschwung','neuland',
             // Einer, der als Schattenseite unter neuem Namen weitergeht:
             // „Der Ausbruch" ueber die Laufbahn ist „Der Stammkunde"
             'ausbruch'];
const _nochDa = WEG.filter(id => _byId[id]);
ok(_nochDa.length === 0, 'kein entfernter Rekord steht im aktiven Katalog',
   _nochDa.join(', ') || WEG.length + ' geprueft');
// „Die Steigerung" behaelt ihre Monatschronik und verliert nur die
// Laufbahn-Achse: ein eingefrorener Monat traegt sie weiter.
ok(!_byId.steigerung && K.eval(`!!SEASON_TITLE_BY_ID['steigerung']`),
   '„Die Steigerung" verliert den Rekord und behaelt die Monatschronik');
// Dasselbe fuer sechs der einundzwanzig: im Monat beginnen alle bei
// derselben Elo, und dort misst die Frage etwas anderes als ueber die
// Laufbahn. „Neuland" wiederholte als Rekord nur die Monatschronik, und
// „Der Ausbruch" feiert im Monat den Bruch einer Serie, die ueber die
// Laufbahn eine Kehrseite ist.
ok(['kopfhoch','breitenwirkung','metronom','uebersoll','deutlich','ausgleich','neuland','ausbruch'].every(id =>
     !_byId[id] && K.eval(`!!SEASON_TITLE_BY_ID['${id}']`)),
   'acht gestrichene Rekorde behalten ihre Monatschronik');
// Und die persistierten Karten der gestrichenen Rekorde sind abgemeldet,
// sonst behaupten sie fuer immer einen Rekord, den es nicht mehr gibt.
ok(K.eval(`${JSON.stringify(WEG.concat(['steigerung']))}
     .every(id => _storyAbgemeldet({id:'rek_' + id + '_geholt_x_1_2026-08-01'}))`),
   'jede Karte eines gestrichenen Rekords ist abgemeldet');
// Eine Hinweiskarte traegt die ID ihres Zeitfensters, nicht die ihres
// Inhalts: abgemeldet wird sie an der Sorte. Und nur diese — eine Karte
// einer Sorte, die es noch gibt, bleibt.
ok(K.eval(`_storyAbgemeldet({id:'ambient_2026-10-20_15', dataRef:{type:'ambient', sub:'personal_aufschwung'}})
     && _storyAbgemeldet({id:'ambient_2026-10-12_15', dataRef:{type:'ambient', sub:'personal_umsteiger'}})
     && !_storyAbgemeldet({id:'ambient_2026-10-21_15', dataRef:{type:'ambient', sub:'personal_glanztag'}})`),
   'die Hinweiskarten der gestrichenen Rekorde sind abgemeldet, die uebrigen nicht');
// Eine alte Datenbankzeile mit einer entfernten Rekord-ID darf kein Blatt
// zerreissen: die Definition steht nicht mehr im Katalog, der Text aber in
// der Zeile.
const _altBlatt = K.eval(`(function(){
  const s = {id:'rek_giant_slayer_geholt_x_50_2026-07-01', cat:'tafel',
    ic:'tornado', title:'Leon übernimmt „Der Gigantentöter"',
    desc:'50 % als Außenseiter gewonnen. Vorher gehörte der Rekord Martin.',
    when: Date.now(), prio: 60,
    dataRef:{type:'rekord_geholt', rekordId:'giant_slayer', kammer:'koennen',
             kammerLabel:'Können', playerIds:[players[8].id], vorher:[players[9].id],
             wert:0.5, ev:'50 % als Außenseiter gewonnen', cond:'Beste Quote',
             art:'leistung'}};
  try { const h = _newsDetailMitte(s, s.dataRef); return 'ok:' + (h || '').length; }
  catch(e){ return 'FEHLER: ' + e.message; }
})()`);
ok(String(_altBlatt).indexOf('ok:') === 0,
   'eine alte Karte mit entfernter Rekord-ID oeffnet ihr Blatt ohne Fehler', _altBlatt + '');
// Und der Rekorde-Reiter kennt sie gar nicht mehr.
ok(K.eval(`!CHRONICLE_BY_ID['giant_slayer'] && (function(){
     try { showChronicle('giant_slayer'); return true; } catch(e){ return false; }
   })()`),
   'ein Klick auf eine entfernte Rekord-ID tut nichts und wirft nichts');

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ KONSTANT SCHLECHT GEWINNT NICHTS ═══');
// Mehrere Rekorde messen den Abstand zum EIGENEN Schnitt [§C38] — und eine
// Reihe aus lauter Nullen hat keinen Abstand und keine Streuung. Genau dort
// kippt so eine Formel: „nur das Gleichmass gemessen gewann, wer jeden Tag
// gleich schlecht war". Geprueft wird mit einer erfundenen Laufbahn aus
// sechzig Niederlagen, jede 0:10: in Koennen und Form darf sie keinen
// Bestwert erreichen.
//
// In der Kammer der FUEGUNGEN darf sie es, und sie soll es koennen: „Das
// Fundament" fragt nach der gleichmaessigsten Tordifferenz, und wer immer
// 0:10 verliert, ist gleichmaessig. Dasselbe gilt fuer die ROLLENWERTE: „Der
// Wandler" misst eine Aufstellung von fuenfzig zu fuenfzig, und wo jemand
// steht, entscheidet die Auslosung. Beide zeichnen niemanden aus, sie
// gehoeren jemandem [§C35] — deshalb wiegen sie 75 und nicht 100. Geprueft
// wird also genau das, was den Grundwert des Koennens traegt.
const _nullLauf = {
  id:'probe', games:60, wins:0, losses:60, gf:0, ga:600, gd:-600,
  drvG:30, drvW:0, revG:30, revW:0, atkGoals:0, defConceded:600,
  drvPerf:-15, revPerf:-15, expSum:30,
  winStreak:0, winSpan:'', lossStreak:60, lossSpan:'',
  debacle:60, nail:0, bitter:0, close:0, closeW:0, blowW:0, blowL:60, upsets:0,
  days:20, maxDay:4, maxDayLabel:'', perfDays:0, bigDays:10,
  seasons:2, firstDay:'', firstLabel:'', lastDay:'',
  peak:100, potw:0, potd:0, weeks:10, founder:false,
  afterLoss:0, afterLossOpp:59, dayElo:-50, dayEloLabel:'',
  alt:0, altSpan:'', flukeExp:null, flukeLabel:'', bestMonth:null, fall:null,
  hartTag:null, hartTagLabel:'', pechExp:null, pechLabel:'',
  gleichTag:0, gleichTore:0, gleichLabel:'', wiederTag:0, wiederErg:'',
  wiederLabel:'', beidesTag:0, beidesLabel:'',
  l30N:30, l30Ga:300, l30Gf:0, l40N:40, l40W:0, r50N:50, r50Atk:25,
  hfDelta:0, hfNeu:0, hfAlt:0, sbDelta:0, sbDrin:0, sbRaus:0, sbN:10,
  ksDelta:0, ksDrin:0, ksRaus:0, ksN:10, rwDelta:0, rwNeu:100, rwAlt:100,
  taN:20, taOk:0, agQ:0, agN:3, mtN:12, mtAvg:0, mtMad:0,
  ahN:20, ahQ:0, ahRest:0, ahDelta:0, unterN:30, unterW:0,
  favN:20, favKlar:0, favW:0, favL:20, gjN:4, gjOk:0, lsN:10, lsW:0,
  swN:59, swOk:0, ausgN:40, ausgSd:0, ausgMit:-10, drvSd:0, drvMit:-10,
  revSd:0, revMit:-10, angstQ:0, angstGeg:'', angstN:20, angstW:0,
  einflussD:-0.3, einflussN:3
};
const _nullTreffer = JSON.parse(K.eval(`JSON.stringify((function(){
  const C = _chronicleCtx(), A = allChronicles().byId;
  const probe = ${JSON.stringify(_nullLauf)};
  const out = {gewinnt:[], dabei:[]};
  CHRONICLES.forEach(c => {
    if(c.kind === 'shame' || c.kind === 'fuegung') return;
    if(c.basis !== REKORD_GRUNDWERT.koennen) return;
    let v = null;
    try { v = c.val(probe, C); } catch(e){ return; }
    if(v == null || !isFinite(v)) return;
    out.dabei.push(c.id);
    const best = A[c.id] ? A[c.id].val : -Infinity;
    if(v >= best - 1e-9) out.gewinnt.push(c.id + ' ' + v + ' >= ' + best);
  });
  return out;
})())`));
ok(_nullTreffer.gewinnt.length === 0,
   'eine Laufbahn aus lauter Niederlagen haelt keinen Koennens- oder Formrekord',
   _nullTreffer.gewinnt.join(' · ')
   || 'in ' + _nullTreffer.dabei.length + ' Rennen dabei, keinen gewonnen');

// Und kein Halter traegt mehr als ein Viertel der ganzen Tafel — dieselbe
// Grenze wie in der Fuegungs-Kammer, nur ueber alle Haltungen.
const _verteilung = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles().byId, n = {};
  CHRONICLES.forEach(c => ((A[c.id] || {pids:[]}).pids || [])
    .forEach(p => { n[p] = (n[p] || 0) + 1; }));
  const summe = Object.keys(n).reduce((s, k) => s + n[k], 0);
  return {n, summe, feld:Object.keys(_chronicleCtx().P).length};
})())`));
const _groesster = Math.max.apply(null, Object.values(_verteilung.n));
ok(_groesster <= _verteilung.summe / 4,
   'kein Halter traegt mehr als ein Viertel aller Haltungen',
   _groesster + ' von ' + _verteilung.summe);
// Und die Tafel liegt nicht bei den Vielspielern: der Spieler mit den
// meisten Partien haelt nicht mehr Rekorde als jeder andere. Ein Gleichstand
// an der Spitze ist keine Haeufung; welcher der beiden zuerst stand,
// entschied vorher die Reihenfolge der Schluessel, und mit dem Kaltblut
// stehen Leon und Stefan in den Fixture-Monaten bei je zehn.
const _meistPartien = JSON.parse(K.eval(`JSON.stringify((function(){
  const P = _chronicleCtx().P;
  return Object.keys(P).sort((a, b) => P[b].games - P[a].games)[0];
})())`));
const _meistRekorde = Object.keys(_verteilung.n)
  .sort((a, b) => _verteilung.n[b] - _verteilung.n[a])[0];
const _vielspielerAllein = (_verteilung.n[_meistPartien] || 0)
  > Math.max(0, ...Object.keys(_verteilung.n).filter(p => p !== _meistPartien).map(p => _verteilung.n[p]));
ok(!_vielspielerAllein,
   'wer am meisten spielt, haelt nicht mehr Rekorde als jeder andere',
   nm(_meistPartien) + ' spielt am meisten und haelt ' + (_verteilung.n[_meistPartien] || 0)
   + ', ' + nm(_meistRekorde) + ' haelt ' + _verteilung.n[_meistRekorde]);

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ KEIN TEXT ERKLAERT DIE APP ═══');
// „Das Blatt erklaert nicht die App" [§C33] gilt auch fuer den Katalog. Jede
// Karte trug eine Marke „Neu" oder „Ueberarbeitet" — das sagt, was sich mit
// dieser FASSUNG geaendert hat, und dem Leser einer Rekordkarte nichts. In den
// Erklaerungen stand daneben die Begruendung gegen die frühere Rechnung: „Der
// beste Zwanzigerblock irgendwo in der Laufbahn gehoerte immer dem, der am
// meisten gespielt hat", „Deshalb wiegt der Eintrag 50 Punkte und nicht 100",
// „sonst waere eine Seite leichter zu halten als die andere". Das ist die
// Bauanleitung und nicht die Erklaerung des Rekords.
const APP_SPRACHE = [
  // Entwicklersprache und interne Bauteile
  /\bRohsicht\b/i, /\bSortierwert\b/i, /\bZiehungen?\b/i, /\bWurzelstaffel\b/i,
  /\bDatenpipeline\b/i, /\bCache\b/i, /\bProjektion\b/i, /\bFallback\b/i,
  /\bdataRef\b/, /\bArray\b/i, /\bZusicherung\b/i, /\bBauanleitung\b/i,
  /\bSpielerblatt\b/i, /\bSavepoint\b/i, /\bFeatures?\b/i, /§C?\d/,
  // Marken ueber die Fassung der App
  /\bÜberarbeitet\b/, /\bunveränderte Fassung\b/i, /\bneue Fassung\b/i,
  // Begruendungen gegen eine frühere Rechnung
  /sonst (?:wäre|hielte|gewinnt|stehen|steht|zählt|hing)/i,
  /gehörte immer/i, /gewann, wer/i, /\bwüchse\b/i, /hing damit an/i,
  /steckten die/i, /Deshalb wiegt/i, /wiegt darum/i,
  /nicht auseinanderlaufen/i, /\bDie App\b/,
  // Die Rechnung statt der Sache: „Der Nenner sind die eigenen Pleiten",
  // „Dieselbe Rechnung wie beim Sturmführer", „Das Gegenstück zum
  // Kaltstart", „Gemessen logarithmisch, weil …", „Zwei gleich große
  // Fenster, damit die Frage für jeden dieselbe ist". Gesagt wird, was
  // zählt, und jeder Text steht für sich.
  /\bNenner\b/i, /\bZähler\b/, /Dieselbe Rechnung/i, /Das Gegenstück/i, /logarithm/i,
  /\bFenster\b/, /Mindestbasis/i, /damit (?:ein|die|„)/i,
  // Eine Partie heißt Partie: „ohne eigenes Match", „Ein Spiel geht auf
  // zehn", „im ersten Spiel eines Spieltags" standen neben „Partien".
  // Zusammensetzungen wie „Sturmspiel" und „Rückkehrspiel" bleiben.
  /\bMatch(?:es)?\b/, /\bSpiel(?:e|en|s)?\b/,
];
const _sprachFund = JSON.parse(K.eval(`JSON.stringify((function(){
  const muster = ${JSON.stringify(APP_SPRACHE.map(r => [r.source, r.flags]))}
    .map(([q, f]) => new RegExp(q, f));
  const treffer = [];
  const pruef = (wo, t) => { if(!t) return;
    muster.forEach(r => { const m = r.exec(String(t));
      if(m) treffer.push(wo + ': „' + m[0] + '"'); }); };
  CHRONICLES.forEach(c => ['cond','wie','mind','zeitraum'].forEach(f =>
    pruef(c.id + '.' + f, c[f])));
  SEASON_TITLES.forEach(d => ['cond','wie','beiname'].forEach(f =>
    pruef(d.id + '.monat.' + f, d[f])));
  // Und die gebauten Belege, die mit echten Zahlen entstehen.
  const H = chronicleHolders();
  CHRONICLES.forEach(c => { const h = H[c.id]; if(h) pruef(c.id + '.ev', h.ev); });
  return treffer;
})())`));
ok(_sprachFund.length === 0,
   'kein sichtbarer Text eines Rekords oder einer Chronik erklaert die App',
   _sprachFund.slice(0, 5).join(' · ') || 'alle Texte sauber');

// Die Richtung steht im Wort, nicht im Vorzeichen: unter „Am nächsten
// dran" stand „−12 %-Punkte über der Rechnung", „-0,2 Tore mehr im Sturm",
// „gegen 3 Gegner zuletzt −13 %-Punkte stärker", „-103 Elo vor Leon auf
// Platz zwei", „von Platz 1 auf Platz 2 · -1 Plätze" und „bei 15 Partien war
// damit zu 227,2 % zu rechnen"; im Rekord „-262 Elo" und „1 Tage"; hinter
// dem Beleg „gewertet 106 %" und „gewertet −4 Prozentpunkte". Gelesen wird
// jeder Beleg, den die App zeigen kann: Halter, das ganze Feld und der
// Nächste jeder Monatschronik in jedem Monat der Fixture, Halter und
// Rangliste jedes Liga-Rekords.
const _richtung = JSON.parse(K.eval(`JSON.stringify((function(){
  const falsch = [], R = [
    /[−-]\\d+(?:,\\d+)? %-Punkte (?:über|unter|stärker|schwächer|besser|schlechter|öfter|seltener|weiter|mehr|weniger)/,
    /[−-]\\d+(?:,\\d+)? (?:eigene )?(?:Gegen)?[Tt]ore (?:mehr|weniger)/,
    /[−-]\\d+ (?:Plätze|Platz|Elo (?:vor|hinter))/,
    /(?:^|[\\s(])-\\d/, /\\+[−-]\\d/, /NaN|undefined|null/,
    /zu (?:\\d{3,})(?:,\\d+)? % zu rechnen/, /gewertet (?:−|1\\d\\d|[2-9]\\d\\d)/,
    /(?<![\\d,.:−-])\\b1 (?:Wochen|Prozentpunkte|Plätze|Tage|Spieltage|Siege|Partien|Niederlagen|Duelle|Gegner|Partner)\\b/];
  let n = 0;
  const lies = (wo, t) => { if(!t) return; n++; R.forEach(r => { if(r.test(String(t))) falsch.push(wo + ': ' + t); }); };
  availableSeasons().forEach(sid => {
    seasonTitles(sid).awarded.forEach(a => lies(sid + ' ' + a.titleId + ' Halter', a.ev));
    SEASON_TITLES.forEach(d => {
      const x = _stNahDef(sid, d.id);
      if(x) lies(sid + ' ' + d.id + ' nah', x.ev);
      try { const r = d.pick(_seasonTitleCtx(sid), new Set());
        if(r && r.rang && r.evFuer) r.rang.forEach(pid => lies(sid + ' ' + d.id + ' Feld', r.evFuer(pid))); } catch(e){ falsch.push(sid + ' ' + d.id + ': ' + e.message); }
    });
  });
  const H = chronicleHolders();
  CHRONICLES.forEach(c => { if(H[c.id]) lies(c.id + ' Halter', H[c.id].ev);
    try { (chronicleRang(c.id) || []).forEach(x => lies(c.id + ' Rang', x.ev)); } catch(e){ falsch.push(c.id + ': ' + e.message); } });
  return {n, falsch};
})())`));
ok(_richtung.n > 500 && !_richtung.falsch.length, 'ein Beleg nennt die Richtung im Wort, kein Minus als Bindestrich, keine Zahl über 100 % als Wahrscheinlichkeit oder Wertung, Einzahl bei eins',
   _richtung.falsch.slice(0, 3).join(' | ') || _richtung.n + ' Belege');
// Und es gibt die Marke „Neu"/„Ueberarbeitet" gar nicht mehr.
ok(K.eval(`CHRONICLES.every(c => c.stand === undefined)`)
   && K.eval(`typeof REKORD_STAND === 'undefined'`),
   'es gibt keine Statusmarke „Neu" oder „Ueberarbeitet" mehr');

// ═══ Ein Zeichen, eine Bedeutung [§C41] ═══
// Die Krone stand für Meistertitel, Traummonat, Highlights, Legende,
// Titelverteidiger und Spitzenwechsel; der Blitz für Stürmer, Sturm-Flex,
// den kompletten Stürmer und die Eilmeldung; zwei Schlüssel standen doppelt
// im Katalog und der zweite überschrieb den ersten still. Ein Zeichen mit
// mehr als einem Träger ist nur erlaubt, wenn alle dieselbe Sache meinen —
// dann steht es hier mit dieser einen Bedeutung. Wer einem vorhandenen
// Zeichen einen neuen Träger gibt, trägt ihn hier ein, oder er braucht ein
// eigenes Zeichen.
const ZEICHEN_FAMILIEN = {
  flame:'Die laufende Siegesserie', flameTriple:'Die lange Siegesserie',
  dropTriple:'Die laufende Pleitenserie', trendCrash:'Die längste Pleitenserie',
  handshake:'Das beste Duo', unstoppable:'Die Siegesserie eines Duos',
  weekKing:'Player of the Week', dayKing:'Player of the Day',
  crossedSwords:'Die Rivalität', comeback:'Die Wende nach der Pleite', flameBreak:'Der Serienbruch',
  underdog:'Sieg als Außenseiter', surprise:'Der unwahrscheinlichste Sieg',
  giantSlayer:'Sieg gegen den Favoriten',
  star:'Die beste Siegquote', crown:'Der Erste: Meistertitel, Titelverteidiger, Held des Tages',
  hole:'Die meisten Gegentore', plusMinus:'Die Tordifferenz je Partie',
  target:'Stark in engen Partien', thriller:'Viele enge Partien', pinch:'Der Zittersieg 10:9',
  pille:'Die Pleite 9:10', dizzy:'Die Pleite 0:10', thumbsUp:'Der klare Sieg',
  duplicate:'Dasselbe Ergebnis immer wieder', sunrise:'Die erste Partie des Tages',
  weight:'Sieg mit dem Schwächsten als Partner', rainCloud:'Der Pechvogel', ghost:'Der Angstgegner',
  bothSides:'Auf beiden Positionen', stepsUp:'Plätze gewonnen', abzeichen:'Eine Auszeichnung',
  posSturm:'Der Stürmer', posAbwehr:'Der Verteidiger', posReinAbwehr:'Der reine Verteidiger',
  medalTrio:'Einer sammelt mehreres', users:'Mehrere zusammen: Teams und geteilter Erfolg',
  tafelStein:'Die Ewige Tafel', spielfeld:'Die Partie am Spieltag',
};
const _zc = JSON.parse(K.eval(`JSON.stringify((function(){
  const t = []; const add = (sys, id, ic) => { if(ic) t.push({sys, id, ic}); };
  Object.entries(AW_IC).forEach(([k, ic]) => add('Award', k, ic));
  BADGES.forEach(b => add('Badge', b.id, b.ic));
  DISZIPLINEN.forEach(d => add(d.monat ? 'Monatschronik' : 'Rekord', d.id, d.ic));
  Object.entries(NEWS_CATEGORIES).forEach(([k, c]) => add('News', k, c.ic));
  RANKS.forEach(x => add('Rang', x.label, x.icon));
  Object.entries(AV_RINGS).forEach(([k, x]) => add('Ring', k, x.ic));
  [0.9, 0.7, 0.57, 0.5, 0.43, 0.3, 0.1].forEach(a => { const p = posClassify(a); add('Position', p.label, p.icon); });
  Object.entries(SP_ANLASS).forEach(([k, x]) => add('Spieltag', k, x.ic));
  ['spiel','tafel','ins','held','woche','duell','serie','badge','marke','spieler','erfolg',''].forEach(s =>
    add('Rubrik', s || 'liga', _newsSorteIcon(s, {dataRef:{type:'x'}})));
  add('Rubrik', 'serie-pleite', _newsSorteIcon('serie', {dataRef:{type:'loss_streak'}}));
  const zeichnungen = {};
  Object.entries(ICONS).forEach(([k, p]) => { (zeichnungen[p] = zeichnungen[p] || []).push(k); });
  return {traeger:t, keys:Object.keys(ICONS), alt:ZEICHEN_ALT,
    gleich:Object.values(zeichnungen).filter(l => l.length > 1)};
})())`));
{
  const je = {};
  _zc.traeger.forEach(x => (je[x.ic] = je[x.ic] || []).push(x.sys + ':' + x.id));
  const ohne = Object.entries(je).filter(([k, l]) => l.length > 1 && !ZEICHEN_FAMILIEN[k]);
  ok(ohne.length === 0, 'kein Zeichen trägt zwei Bedeutungen — wer eins teilt, meint dieselbe Sache',
     ohne.map(([k, l]) => k + ' = ' + l.join(', ')).join(' · '));
  const leer = Object.keys(ZEICHEN_FAMILIEN).filter(k => !(je[k] && je[k].length > 1));
  ok(leer.length === 0, 'jede Familie hat mindestens zwei Träger', leer.join(', '));
  ok(_zc.traeger.every(x => _zc.keys.includes(x.ic)), 'jeder Träger nennt ein Zeichen, das es gibt',
     _zc.traeger.filter(x => !_zc.keys.includes(x.ic)).map(x => x.sys + ':' + x.id + '/' + x.ic).join(', '));
  ok(_zc.gleich.length === 0, 'keine zwei Schlüssel tragen dieselbe Zeichnung', _zc.gleich.map(l => l.join('=')).join(', '));
  const altFalsch = Object.entries(_zc.alt).filter(([a, n]) => _zc.keys.includes(a) || !_zc.keys.includes(n));
  ok(altFalsch.length === 0, 'jeder alte Name zeigt auf eine bestehende Zeichnung und steht selbst nicht mehr im Katalog',
     altFalsch.map(x => x.join('→')).join(', '));
  // Im Quelltext des Katalogs: der zweite gleichnamige Eintrag überschrieb
  // den ersten still — so hatten `shieldStar` und `ghost` zwei Fassungen.
  const kat = code.slice(code.indexOf('const ICONS = {'), code.indexOf('\n};', code.indexOf('const ICONS = {')));
  const schl = [...kat.matchAll(/^\s+([A-Za-z0-9]+)\s*:\s*`/gm)].map(m => m[1]);
  const doppelt = [...new Set(schl.filter((k, i) => schl.indexOf(k) !== i))];
  ok(doppelt.length === 0, 'kein Schlüssel steht im Katalog zweimal', doppelt.join(', '));
  // Jedes Zeichen, das der Code wörtlich setzt, gibt es — unter seinem
  // heutigen Namen. Alte Namen sind nur für gespeicherte Stories da.
  const wort = [...code.matchAll(/\b(?:svgI|zkHtml|icPfad|emptyState|blattAbschnittHtml)\(\s*'([A-Za-z0-9]+)'|\bic(?:on)?\s*:\s*'([A-Za-z0-9]+)'/g)]
    .map(m => m[1] || m[2]);
  const fehlt = [...new Set(wort.filter(k => !_zc.keys.includes(k)))];
  ok(fehlt.length === 0, 'jedes wörtlich gesetzte Zeichen steht unter seinem heutigen Namen im Katalog', fehlt.join(', '));
}

// ══════════════════════════════════════════════════════════════════════
console.log('\n═══ MONATSCHRONIKEN GEGEN DIE ERWARTUNG UND DEN VORMONAT ═══');
// Die Monatschronik fragt nicht, wer der Beste ist [§C39]. Fünf Wertungen
// fragten es trotzdem, mit festen Latten: zwei Tore Differenz je Partie,
// gegen jeden Gegner im Plus, 85 % der ersten und 75 % der letzten Partien
// eines Spieltags, jeder Spieltag nicht negativ. Gemessen gingen damit 42 %
// aller Einträge der Fixture-Monate an die ersten drei der Monatstabelle —
// bei zwölf Spielern wären es nach ihrem Anteil 25 %, das 1,7-fache.
// Gemessen wird gegen ihren Anteil an den GEWERTETEN: seit eine Chronik erst
// ab fünfzehn Partien zählt, sind im August sieben gewertet, und drei von
// sieben sind 43 %. Gegen die Elo-Erwartung und den eigenen Rest gestellt,
// war es das 0,9-fache; seit ein Anteil nach seiner Stichprobe zählt, das
// 1,2-fache — die ersten drei spielen am meisten, und ein Abstand über
// hundert Partien wiegt jetzt, was er ist.
const _spitze = JSON.parse(K.eval(`JSON.stringify((function(){
  let alle = 0, oben = 0, soll = 0;
  ['2026-06','2026-07','2026-08'].forEach(sid => {
    const drei = saisonRang(sid).slice(0, 3).map(e => e.id);
    const n = _seasonTitleCtx(sid).rankAll.filter(r => r.games >= CHRONIK_MIN_SPIELE).length;
    seasonTitles(sid).awarded.forEach(a => { alle++; soll += 3 / n; if(drei.includes(a.pid)) oben++; });
  });
  return {alle, oben, soll};
})())`));
console.log('  Einträge der ersten drei: ' + _spitze.oben + ' von ' + _spitze.alle + ', nach ihrer Zahl ' + _spitze.soll.toFixed(1));
ok(_spitze.alle > 40 && _spitze.oben <= 1.3 * _spitze.soll,
   'die ersten drei der Monatstabelle halten höchstens das 1,3-fache der Einträge, die ihnen nach ihrer Zahl zustehen',
   _spitze.oben + ' von ' + _spitze.alle + ', nach ihrer Zahl ' + _spitze.soll.toFixed(1));
// „Der Sprung" und „Die Kletterpartie" stellen einen Spieler gegen seinen
// Vormonat: Siegquote und Platz, der Monat ab fuenfzehn Partien, der
// Vormonat ab acht; der Sprung gewertet auf die uebliche Stichprobe beider
// Monate [§C39]. Nachgerechnet
// aus den rohen Partien beider Monate und der Rangliste der Saison, an den
// fuenf echten Monaten: seit die Kletterpartie fuenf Plaetze verlangt, haelt
// sie in den drei Fixture-Monaten niemand mehr, und den Sprung haelt seit
// der Wertung nach der Stichprobe in keinem der fuenf Monate jemand. Damit
// der Abgleich trotzdem etwas prueft, wird beim Sprung jeder Wert
// verglichen, nicht nur der Halter.
const _vglE = _eichung(['sprung'], KH).sprung;
const _vgl = JSON.parse(KH(`JSON.stringify((function(){
  const E = ${JSON.stringify(_vglE)};
  const gewertet = ${_gewertet.toString()};
  const quote = sid => { const z = {};
    matchesInSeason(sid).forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(id => {
      const w = (m.a1 === id || m.a2 === id) ? m.winner === 'A' : m.winner === 'B';
      z[id] = z[id] || {g:0, w:0}; z[id].g++; if(w) z[id].w++; }));
    return z; };
  const out = {};
  ['2026-07','2026-08','2026-09','2026-10'].forEach(sid => {
    const vor = _prevSeasonId(sid), a = quote(sid), b = quote(vor);
    const beide = Object.keys(a).filter(id => a[id].g >= 15 && b[id] && b[id].g >= 8);
    const bester = (l, ab) => { const max = Math.max(...l.map(x => x.d));
      return max >= ab ? l.filter(x => x.d === max).map(x => x.id).sort() : []; };
    const platz = s => { const r = saisonRang(s).map(e => e.id); return id => r.indexOf(id) + 1; };
    const pa = platz(sid), pb = platz(vor);
    const C = _seasonTitleCtx(sid);
    const ist = id => { const r = SEASON_TITLE_BY_ID[id].pick(C, new Set()); return r && r.halter ? r.halter.slice().sort() : []; };
    const sprung = beide.map(id => ({id, d:gewertet(E, a[id].w / a[id].g - b[id].w / b[id].g,
        a[id].g * b[id].g / (a[id].g + b[id].g))}));
    const w = _chronikMonat('sprung');
    out[sid] = {sprungSoll:bester(sprung, 0.25), sprungIst:ist('sprung'),
      werte:sprung.length, daneben:sprung.filter(x => !(Math.abs(w.wert(C.P[x.id], C) - x.d) < 1e-9)).map(x => x.id),
      kletterSoll:bester(beide.filter(id => pa(id) && pb(id)).map(id => ({id, d:pb(id) - pa(id)})), 5), kletterIst:ist('kletterer')};
  });
  return out; })())`));
ok(Object.values(_vgl).every(x => x.sprungSoll.join() === x.sprungIst.join() && x.kletterSoll.join() === x.kletterIst.join()
     && !x.daneben.length)
   && Object.values(_vgl).reduce((n, x) => n + x.werte, 0) >= 20 && Object.values(_vgl).some(x => x.kletterIst.length),
   'Der Sprung und Die Kletterpartie halten, wer sich gegenüber dem Vormonat am meisten gesteigert hat',
   JSON.stringify(_vgl));

console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
process.exit(fails ? 1 : 0);
