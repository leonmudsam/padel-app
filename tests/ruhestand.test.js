// Das Karriereende [§C40]: die Legacy bleibt, die aktive Liga vergleicht ohne
// den Ruheständler, und sein Profil steht, wie es beim Abschied stand.
// Gemessen an den echten 466 Partien, Martin hört nach dem letzten Spieltag
// auf. Der Ruhestand kommt nicht aus einer zweiten Engine, also prüft diese
// Suite dieselben Funktionen, aus denen die Ansichten lesen.
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
let FIXED = new Date('2026-08-27T12:00:00Z').getTime();
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
    // Jedes Schreiben wird mitgeschrieben; `__updFehler` kann eine Antwort
    // der Datenbank vorgeben (eine fehlende Spalte etwa).
    update: (row) => {
      globalThis.__written.push({tbl, upd:row});
      const antwort = Promise.resolve({error: (globalThis.__updFehler && globalThis.__updFehler(row)) || null});
      antwort.eq = () => antwort;
      return {eq: () => antwort};
    },
    select: () => ({ order: async () => ({data:[], error:null}),
      // Die Zählung der Partien eines Spielers fragt die Datenbank, nicht
      // die geladene Liste; hier steht dafür ein eigener Bestand.
      or: async (f) => {
        const id = (String(f).match(/\.eq\.([^,]+)/) || [])[1];
        if(globalThis.__dbFehler) return {count:null, error:{message:'netz'}};
        const n = (globalThis.__dbPartien || []).filter(m => [m.a1, m.a2, m.b1, m.b2].includes(id)).length;
        return {count:n, error:null};
      } }),
    delete: () => ({ lt: async () => ({error:null}),
      eq: async (k, v) => { globalThis.__written.push({tbl, geloescht:v}); return {error:null}; } })
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
const J = s => JSON.parse(K.eval('JSON.stringify(' + s + ')'));
const nm = id => NAMES[IDS.indexOf(id)] || id;
const MARTIN = IDS[NAMES.indexOf('Martin')];
const ENDE = '2026-08-26T22:00:00Z';
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── Keine rohe hidden-Abfrage ─────────────────────────────────────────────
// Jede Abfrage wählt zwischen `sichtbar` (Geschichte) und `ligaAktiv`
// (tritt im Zeitraum an). Eine rohe `.hidden`-Abfrage ist genau die Stelle,
// an der ein Ruheständler mit dem nächsten Feature wieder auftaucht.
console.log('=== KEINE ROHE HIDDEN-ABFRAGE ===');
{
  // Die Regel selbst, die Liste zum Wiedereinblenden und die Sicherung, die
  // das Feld speichert, dürfen es lesen.
  const ERLAUBT = ['06b-ruhestand.js', '15-views-rest.js', '36-backup.js'];
  const SRC = DIR + '/../src/js/';
  const roh = [];
  for(const f of fs.readdirSync(SRC)){
    if(ERLAUBT.includes(f)) continue;
    fs.readFileSync(SRC + f, 'utf8').split('\n').forEach((z, i) => {
      const ohne = z.replace(/document\.hidden/g, '').replace(/\w+\.hidden\s*=(?!=)/g, '');
      if(/\.hidden\b/.test(ohne)) roh.push(f + ':' + (i + 1));
    });
  }
  ok(!roh.length, 'keine Datei fragt hidden selbst ab', roh.join(', ') || '—');
}

const stand = () => ({
  rang: J(`getPlayerRank('${MARTIN}')`),
  prestige: J(`(p=>({punkte:p.punkte,stufe:p.stufe,grad:p.grad,platz:p.platz,von:p.von,teile:p.teile,
    az:(p.quellen||[]).filter(q=>q.q==='auszeichnung').reduce((a,q)=>a+q.p,0)}))(prestigeOf('${MARTIN}'))`),
  rekorde: J(`chroniclesOfPlayer('${MARTIN}').map(r=>r.id)`),
  juli: J("seasonTitles('2026-07')"),
  juliRang: J("saisonRang('2026-07')"),
  juliStats: J("periodPlayerStats('season','2026-07')"),
  juliAwards: J("(a=>({single:a.single,team:a.team}))(getCachedAwardRankings('season','2026-07'))"),
  juliVerlauf: J("getSeasonPositionHistory('2026-07').activeIds"),
  meister: J("allPastSeasons().map(s => seasonChampion(s))"),
});
// Alles, was ein Zeitraum ist, in dem er gespielt hat: der laufende Monat,
// die laufende Woche, jeder Tag und jede Woche als Sieger.
const zeitraeume = () => J(`({
  monat: periodPlayerStats('season'), woche: periodPlayerStats('week'),
  rang: saisonRang('2026-08'), verlauf: getSeasonPositionHistory('2026-08').activeIds,
  chronik: seasonTitles('2026-08'),
  awards: (a=>({single:a.single,team:a.team}))(getCachedAwardRankings('season','2026-08')),
  awardsWoche: (a=>({single:a.single,team:a.team}))(getCachedAwardRankings('week')),
  tage: _periodWinnerMap(matches, 'day'), wochen: _periodWinnerMap(matches, 'week'),
  position: ligaPosition('${MARTIN}')
})`);
// Wie der Knopf: der Karriere-Teil wird gerechnet, solange er noch ein
// Spieler wie jeder ist, und kommt mit dem Zeitpunkt in den Stand.
const setzeRuhestand = iso => K.eval(`(() => { const p = pmap()['${MARTIN}'], t = Date.parse('${iso}');
  const k = _ruheKarriereBauen(p.id); p.retired_at = '${iso}';
  p.retired_stand = JSON.stringify({v:RUHE_STAND_FASSUNG, t, karriere:k, abschluss:null}); invalidateCache(); })()`);
// ── Eine Monatschronik bleibt dem, der sie geholt hat ──────────────
// Wer im Juni Chroniken holt und im Juni aufhört, behält sie: sie sind ein
// Teil seiner Laufbahn, und der Nächstbeste hat sie in diesem Monat nicht
// verdient. Geprüft wird jeder Monat — die Tafel, jede Wertung samt
// Halterfeld, der Stand für den Feed und der eingefrorene Juni — vor und
// nach dem Karriereende, an dem Spieler mit den meisten Juni-Einträgen.
{
  const monate = ['2026-05','2026-06','2026-07','2026-08'];
  const tafel = () => J(`(${JSON.stringify(monate)}).reduce((o, sid) => {
    const C = _seasonTitleCtx(sid);
    o[sid] = {aw:(seasonTitles(sid).awarded || []).map(a => a.titleId + ':' + a.pid).sort(),
      halter:seasonTitleHalter(sid),
      wertung:SEASON_TITLES.map(t => { const r = t.pick(C, new Set());
        return t.id + ':' + (r && r.halter ? r.halter.slice().sort().join('/') : ''); })};
    return o; }, {})`);
  const eingefroren = () => J(`(_freezeSeasonTitles('2026-06').awarded || []).map(a => a.titleId + ':' + a.pid).sort()`);
  const vor = tafel(), vorFrost = eingefroren();
  const zahl = {}; vor['2026-06'].aw.forEach(x => { const p = x.split(':')[1]; zahl[p] = (zahl[p] || 0) + 1; });
  const wer = Object.keys(zahl).sort((a, b) => zahl[b] - zahl[a])[0];
  K.eval(`pmap()['${wer}'].retired_at = '2026-06-20T12:00:00Z'; invalidateCache();`);
  const nach = tafel(), nachFrost = eingefroren();
  const ab = monate.filter(sid => JSON.stringify(vor[sid]) !== JSON.stringify(nach[sid]));
  ok(!J(`ligaAktiv('${wer}')`) && zahl[wer] > 0 && ab.length === 0 && gleich(vorFrost, nachFrost)
     && nach['2026-06'].aw.filter(x => x.endsWith(':' + wer)).length === zahl[wer],
     'wer im Juni aufhört, behält jede Juni-Chronik, und kein Monat vergibt sie an den Nächstbesten',
     nm(wer) + ' ' + zahl[wer] + ' Einträge · abweichend: ' + (ab.join(', ') || '—'));
  K.eval(`pmap()['${wer}'].retired_at = null; invalidateCache();`);
}
const VOR = stand();
const VOR_Z = zeitraeume();
const auszeichnungen = () => J("Object.fromEntries(players.map(p => [p.id, (getCachedBadges(p.id) || []).map(b => b.id + ':' + (b.count || 1)).sort()]))");
const VOR_BADGES = auszeichnungen();
const vorPerz = J(`rangPerzentil('${MARTIN}')`);

setzeRuhestand(ENDE);
ok(J(`imRuhestand('${MARTIN}')`) && !J(`ligaAktiv('${MARTIN}')`), 'Martin ist im Ruhestand und tritt heute nicht an');

console.log('\n=== REGEL 1: EIN ZEITRAUM KENNT KEINEN RUHESTAND ===');
// Wer in einem Tag, einer Woche oder einem Monat gespielt hat, steht darin —
// auch wenn er danach aufhört. Er kann ihn gewinnen. Keine Abfrage, also
// ändert das Karriereende an keinem Zeitraum etwas.
{
  const Z = zeitraeume();
  for(const k of Object.keys(VOR_Z)){
    ok(gleich(VOR_Z[k], Z[k]), 'das Karriereende ändert nichts an ' + k);
  }
  ok(Z.monat.some(r => r.id === MARTIN) && Z.position > 0,
     'er steht in der Tabelle des Monats, in dem er gespielt hat', 'Platz ' + Z.position);
}

console.log('\n=== REGEL 2: LAUFBAHN-VERGLEICHE OHNE IHN ===');
ok(!J('Object.keys(getAllPlayerRanks())').includes(MARTIN), 'die Ewige Tafel rankt ihn nicht mehr',
   J('Object.keys(getAllPlayerRanks()).length') + ' im Rang');
ok(!J("periodPlayerStats('all').map(r=>r.id)").includes(MARTIN), 'Gesamt ohne ihn');
const halter = J("Object.values(allChronicles().byId).filter(r=>r.pids&&r.pids.length).map(r=>r.pids)").flat();
ok(!halter.includes(MARTIN) && halter.length > 0, 'kein Liga-Rekord nennt ihn als Halter, die Rekorde gehören anderen', halter.length + ' Haltungen');
ok(!J("prestigeTabelle().rang").includes(MARTIN) && !J("Object.keys(prestigeTabelle().byPid)").includes(MARTIN),
   'der Prestige-Rang ohne ihn');
ok(!J(`Object.values(allChronicles(ruhestandMs('${MARTIN}') - 1).byId).some(r => (r.pids||[]).includes('${MARTIN}'))`),
   'auch ein Zeitschnitt vor dem Karriereende vergleicht mit der Liga von heute');
ok(!J('activePlayers().map(p => p.id)').includes(MARTIN), 'die Spielerwahl ohne ihn');
{
  const all = J("(a => Object.values(a).filter(Array.isArray).flat().map(x => x.id || (x.ids || []).join('|')))(getCachedAwardRankings('all'))");
  ok(!all.some(x => String(x).includes(MARTIN)), 'die Wertungen über die ganze Laufbahn ohne ihn');
}
const teams = J('vTeams(true)');
ok(!teams.html.includes(MARTIN) && teams.ruhe.includes(MARTIN) && teams.ruheZahl > 0,
   'die Duos mit ihm stehen nicht in der Teamliste, sondern am Ende', teams.ruheZahl + ' Duos');
// Die Chronik-Matrix: seine Zeile steht nicht zwischen denen, die um die
// nächste Chronik spielen, sondern in der Karte der Ruheständler am Ende.
{
  const mx = J('ligaChronikMatrixHtml()'), cut = mx.indexOf('data-einblick="ruhe_chronik"');
  const ruheMx = J('ruhestandChronikHtml()');
  ok(cut > 0 && !mx.slice(0, cut).includes(MARTIN) && ruheMx.includes('data-tplayer="' + MARTIN + '"')
     && !J(`_lchronZeilen(allSeasonTitles().slice(0, 8).reverse()).filter(p => ligaAktiv(p))`).includes(MARTIN),
     'die Chronik-Matrix zeigt ihn nur in der Karte der Ruheständler am Ende');
}
// Eine Serie, die nicht mehr läuft, brennt nicht.
K.eval(`getGlobalSim().curStreak['${MARTIN}'] = 9;`);
ok(J(`znFeuer('${MARTIN}')`) === 0 && J(`avRingOf('${MARTIN}')`) === null, 'kein Feuer und kein Serienring am Wappen');
K.eval('invalidateCache();');

console.log('\n=== DIE LEGACY BLEIBT ===');
const NACH = stand();
ok(gleich(VOR.juli, NACH.juli), 'die Monatschronik des Juli unverändert');
ok(gleich(VOR.juliRang, NACH.juliRang) && NACH.juliRang.some(r => r.id === MARTIN), 'die Juli-Rangliste mit ihm, unverändert',
   'Platz ' + (NACH.juliRang.findIndex(r => r.id === MARTIN) + 1));
ok(gleich(VOR.juliStats, NACH.juliStats), 'die Juli-Statistik unverändert');
ok(gleich(VOR.juliAwards, NACH.juliAwards), 'die Juli-Awards unverändert');
ok(gleich(VOR.juliVerlauf, NACH.juliVerlauf), 'der Juli-Positionsverlauf unverändert');
ok(gleich(VOR_BADGES, auszeichnungen()), 'keine Auszeichnung ändert sich, weder seine noch die der anderen',
   Object.values(VOR_BADGES).reduce((s, l) => s + l.length, 0) + ' Auszeichnungen');
ok(gleich(VOR.meister, NACH.meister), 'die Meister abgeschlossener Monate bleiben', NACH.meister.map(nm).join(', '));

console.log('\n=== REGEL 3: DAS PROFIL ===');
// Der Karriere-Teil hält Rekorde, Rang und Platz vom Klick. Das Karriereende
// selbst ändert an seinem Profil nichts: dieselbe Rechnung, nur mit den
// Rekorden aus dem Stand statt aus der Liga.
ok(gleich(VOR.rang, NACH.rang), 'der Rang wie beim Abschied', NACH.rang && NACH.rang.label);
ok(Math.abs(J(`rangPerzentil('${MARTIN}')`) - vorPerz) < 1e-9, 'das Perzentil wie beim Abschied');
ok(gleich(VOR.rekorde, NACH.rekorde) && NACH.rekorde.length > 0, 'die Rekorde wie beim Abschied', NACH.rekorde.length + ' Rekorde');
ok(gleich(VOR.prestige, NACH.prestige), 'das Karriereende selbst ändert sein Prestige nicht', NACH.prestige.punkte + ' P');
ok(J(`ruhestandStand('${MARTIN}') === ruhestandStand('${MARTIN}')`), 'der Stand wird gelesen, nicht gerechnet');

console.log('\n=== DIE NACHRICHT ===');
{
  const st = J(`_buildStories().filter(s => (s.dataRef||{}).type === 'karriereende')`);
  ok(st.length === 1 && st[0].id === 'karriereende_' + MARTIN + '_2026-08-26' && J('_isBreaking(' + JSON.stringify(st[0]) + ')'),
     'das Karriereende ist eine Breaking-Story mit dem Tag in der ID', st.map(x => x.id).join(', '));
  const d = J(`abschiedDaten('${MARTIN}')`);
  ok(st[0] && st[0].dataRef.spiele === d.spiele && d.spiele === J(`matches.filter(m => [m.a1,m.a2,m.b1,m.b2].includes('${MARTIN}')).length`),
     'Story und Abschied zählen dieselben Partien', d.spiele + ' Partien');
  ok(d.partner.length > 0 && d.saisons.length > 0 && d.rekorde.length === J(`ruhestandStand('${MARTIN}').rekorde.filter(r=>!r.neg).length`),
     'der Abschied kennt Partner, Saisons und die Rekorde beim Abschied', d.rekorde.length + ' Rekorde');
  K.eval(`globalThis.__st = ${JSON.stringify(st[0] || {})};`);
  ok(J('_consolidateStories([__st]).length') === 1, 'solange das Karriereende gilt, steht die Karte im Feed');
  K.eval(`globalThis.__ra = pmap()['${MARTIN}'].retired_at; pmap()['${MARTIN}'].retired_at = '2026-08-25T10:00:00Z'; invalidateCache();`);
  ok(J('_consolidateStories([__st]).length') === 0, 'ein anderes oder zurückgenommenes Karriereende nimmt die Karte aus dem Feed');
  K.eval(`pmap()['${MARTIN}'].retired_at = __ra; invalidateCache();`);
}

console.log('\n=== DIE ANDEREN SPIELEN WEITER ===');
K.eval(`
  // Die zwei, die hinter ihm liegen, gewinnen sechzig Mal: ihre
  // Karriere-Elo zieht an ihm vorbei.
  const _av = getSeasonAvgElos();
  const _o = players.filter(p => p.id !== '${MARTIN}').map(p => p.id).sort((a, b) => (_av[b] ?? 0) - (_av[a] ?? 0));
  const _neu = [];
  for(let i = 0; i < 60; i++) _neu.push({id:'neu' + i, a1:_o[1], a2:_o[2], b1:_o[3 + i % 4], b2:_o[7 + i % 4], a1_side:'drive', a2_side:'reves',
    b1_side:'drive', b2_side:'reves', games_a:10, games_b:0, winner:'A', exp_a:0.5,
    created_at:new Date(Date.parse('2026-08-27T08:00:00Z') + i * 60000).toISOString(), deltas:{}});
  matches = matches.concat(_neu);
  const _rc = simulateEloWithSliders(matches);
  const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
  matches.forEach(m => { m.deltas = _d[m.id] || {}; });
  invalidateCache();
`);
{
  const NEU = stand();
  ok(gleich(VOR.rang, NEU.rang) && Math.abs(J(`rangPerzentil('${MARTIN}')`) - vorPerz) < 1e-9,
     'Rang und Perzentil unverändert nach Partien anderer', J(`rangPerzentil('${MARTIN}')`).toFixed(1) + ' %');
  ok(gleich(VOR.rekorde, NEU.rekorde) && NEU.prestige.teile.rekord === NACH.prestige.teile.rekord
     && NEU.prestige.platz === NACH.prestige.platz, 'Rekorde, ihr Prestige und der Platz unverändert nach Partien anderer');
  ok(J("periodPlayerStats('season').map(r=>r.id)").includes(MARTIN), 'im laufenden Monat bleibt er stehen, er hat darin gespielt');
}

console.log('\n=== REGEL 4: DAS TOR DES FEEDS ===');
// Bis zum Abschluss erzählt der Feed von den Zeiträumen, in denen er noch
// gespielt hat; danach nennt ihn keine Story mehr, außer der vom Abschied.
{
  const ab = J(`ruhestandAbschlussMs('${MARTIN}')`);
  ok(ab === J("seasonEnd('2026-08').getTime()") + 864e5,
     'der Abschluss ist ein Tag nach dem Ende von Woche und Monat des Karriereendes', new Date(ab).toISOString());
  FIXED = ab + 5 * 864e5;
  K.eval('invalidateCache();');
  const spaeter = J(`_buildStories().filter(s => +new Date(s.when) > ${ab}
    && (s.dataRef||{}).type !== 'karriereende' && JSON.stringify(s).includes('${MARTIN}')).map(s => s.id)`);
  ok(spaeter.length === 0, 'nach dem Abschluss nennt ihn keine Story', spaeter.join(', ') || 'keine');
  const zwischen = new Date(Date.parse(ENDE) + 3600e3), nach = new Date(ab + 3600e3);
  const ANDERER = IDS[NAMES.indexOf('Leon')];
  K.eval(`globalThis.__neu = [
    {id:'neu_nach', cat:'tafel', title:'a', desc:'a', prio:40, when:new Date(${+nach}), dataRef:{type:'neu_typ', verfolger:[{pid:'${MARTIN}', wert:3}]}},
    {id:'neu_zwischen', cat:'tafel', title:'b', desc:'b', prio:40, when:new Date(${+zwischen}), dataRef:{type:'neu_typ', playerIds:['${MARTIN}']}},
    {id:'neu_anderer', cat:'tafel', title:'c', desc:'c', prio:40, when:new Date(${+nach}), dataRef:{type:'neu_typ', playerIds:['${ANDERER}']}},
    {id:'neu_bild', cat:'highlight', title:'d', desc:'d', prio:40, when:new Date(${+nach}), dataRef:{type:'spiel', playerIds:['${ANDERER}'],
      visual:{version:2, occasion:{key:'medaille', data:{alle:['${MARTIN}']}}}}}];`);
  const ids = J('ohneStoriesNachAbschied(__neu).map(s => s.id)');
  ok(gleich(ids, ['neu_zwischen', 'neu_anderer', 'neu_bild']),
     'ein neuer Story-Typ ohne eigene Abfrage nennt ihn nach dem Abschluss nicht, auch nicht in einer Liste; davor schon', ids.join(', '));
  // Die Karte einer Partie anderer fällt nicht weg, weil ihre Zeichnung ihn
  // in einer Rangliste trug: nach Janes Abschied fehlten so zwei Partien.
  ok(ids.includes('neu_bild'), 'eine Partie anderer bleibt, auch wenn ihre Zeichnung ihn früher in einer Rangliste trug');
  const alt = J(`_buildStories().find(s => +new Date(s.when) < Date.parse('${ENDE}') && (s.dataRef||{}).type === 'spiel'
    && JSON.stringify(s.dataRef).includes('${MARTIN}'))`);
  K.eval(`globalThis.__db = Object.assign({}, ${JSON.stringify(alt)}, {id:'db_nach_abschluss', when:new Date(${+nach})});
    globalThis.__db0 = Object.assign({}, ${JSON.stringify(alt)}, {when:new Date(${JSON.stringify(alt && alt.when)})});`);
  ok(!!alt && !J(`JSON.stringify(_consolidateStories([__db])).includes('${MARTIN}')`)
     && J(`JSON.stringify(_consolidateStories([__db0])).includes('${MARTIN}')`),
     'im Feed fällt eine Zeile nach dem Abschluss, die von vorher bleibt', alt && alt.id);
  FIXED = new RealDate('2026-08-27T12:00:00Z').getTime();
  K.eval('invalidateCache();');
}

console.log('\n=== DIE RÜCKKEHR ===');
// Wer zurückkehrt, steht in der Liga von HEUTE: die Rekorde haben sich in der
// Pause weiterbewegt. Was er selbst geholt hat, bleibt.
K.eval(`pmap()['${MARTIN}'].retired_at = null; pmap()['${MARTIN}'].retired_stand = null; invalidateCache();`);
ok(J('Object.keys(getAllPlayerRanks())').includes(MARTIN), 'zurück in der Ewigen Tafel');
{
  const Z = stand();
  const live = J(`Object.values(allChronicles().byId).filter(r => (r.pids||[]).includes('${MARTIN}')).map(r => r.id)`);
  const weg = VOR.rekorde.filter(x => !Z.rekorde.includes(x));
  ok(weg.length > 0 && gleich(Z.rekorde.slice().sort(), live.slice().sort()),
     'nach der Rückkehr hält er die Rekorde, die ihm heute gehören, nicht die vom Abschied',
     'weg: ' + weg.join(', ') + ' · neu: ' + Z.rekorde.filter(x => !VOR.rekorde.includes(x)).join(', '));
  // Verglichen wird die ungerundete Summe: die drei angezeigten Teile werden
  // mit Restverteilung gerundet, damit sie zusammen die Gesamtzahl ergeben,
  // und ein halber Punkt wandert dabei mit den Rekorden zwischen den Teilen.
  ok(Math.abs(Z.prestige.az - VOR.prestige.az) < 1e-6 && Z.prestige.az > 0 && Z.prestige.teile.rekord !== VOR.prestige.teile.rekord
     && Z.prestige.punkte === Z.prestige.teile.auszeichnung + Z.prestige.teile.monat + Z.prestige.teile.rekord,
     'sein Prestige rechnet die Rekorde neu, Auszeichnungen bleiben', VOR.prestige.punkte + ' beim Abschied, ' + Z.prestige.punkte + ' zurück');
}
K.eval(`matches = matches.filter(m => !/^neu/.test(m.id)); invalidateCache();`);
ok(gleich(VOR.prestige, stand().prestige), 'ohne Partien in der Pause steht er mit genau dem Prestige von vorher da');

console.log('\n=== DER GESPEICHERTE STAND ===');
(async () => {
  const schreibe = () => globalThis.__written.filter(w => w.upd);
  const vorSchreiben = schreibe().length;
  const r = await K.eval(`karriereSetzen('${MARTIN}', true)`);
  const neu = schreibe().slice(vorSchreiben);
  const zeile = (neu[0] || {}).upd || {};
  const st = zeile.retired_stand;
  ok(r.ok && neu.length === 1 && st && st.v === K.eval('RUHE_STAND_FASSUNG') && st.t === Date.parse(zeile.retired_at)
     && st.karriere && st.karriere.rekorde.length > 0 && st.abschluss === null,
     'der Knopf schreibt Zeitpunkt und Karriere-Teil in EINEM Schreiben', JSON.stringify({ok:r.ok, rekorde:st && st.karriere.rekorde.length}));
  K.eval(`pmap()['${MARTIN}'].retired_at = ${JSON.stringify(zeile.retired_at)};
          pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(st))}; invalidateCache();`);
  // Ein Rekord, den der Katalog nicht mehr führt, zeigt sich nicht mehr und
  // zählt kein Prestige [§C35]: er stand sonst im Profil als einziger Ort der
  // App, sein Blatt öffnete nicht, und das Prestige gab ihm einen Ersatzwert.
  {
    const mitAlt = JSON.parse(JSON.stringify(st));
    mitAlt.karriere.rekorde.push({id:'sniper', name:'Der Torjäger', kind:'koennen', ic:'ball', tone:'orange',
      ev:'9,1 Tore je Sturmspiel', pid:MARTIN, pids:[MARTIN], shared:false});
    const vorher = J(`prestigeOf('${MARTIN}').punkte`);
    K.eval(`pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(mitAlt))}; invalidateCache(); _ruheGespeichertMemo.clear();`);
    const ids = J(`chroniclesOfPlayer('${MARTIN}').map(r => r.id)`);
    const nachher = J(`prestigeOf('${MARTIN}').punkte`);
    K.eval(`pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(st))}; invalidateCache(); _ruheGespeichertMemo.clear();`);
    ok(ids.indexOf('sniper') < 0 && ids.length === st.karriere.rekorde.length && nachher === vorher,
       'ein gestrichener Rekord im gespeicherten Stand zeigt sich nicht und zählt nichts',
       ids.length + ' Rekorde, Prestige ' + vorher + ' → ' + nachher);
  }
  // Vor dem Abschluss läuft seine letzte Woche noch: geschrieben wird nichts.
  const vorAb = schreibe().length;
  K.eval('_ruheAbschliessen();');
  ok(schreibe().length === vorAb, 'vor dem Abschluss wird nichts nachgeschrieben');
  // Nach dem Abschluss: einmal, mit demselben Zeitpunkt.
  FIXED = K.eval(`ruhestandAbschlussMs('${MARTIN}')`) + 864e5;
  K.eval('_ruheAbschliessen(); _ruheAbschliessen();');
  await new Promise(res => setTimeout(res, 10));
  const ab = schreibe().slice(vorAb);
  const sa = ab[0] && ab[0].upd.retired_stand;
  ok(ab.length === 1 && sa && sa.t === st.t && gleich(sa.karriere, st.karriere) && sa.abschluss
     && Array.isArray(sa.abschluss.badges) && sa.abschluss.badges.length > 5 && sa.abschluss.prestige && Array.isArray(sa.abschluss.finger),
     'nach dem Abschluss wird der Abschluss-Teil einmal geschrieben, der Karriere-Teil bleibt', String(ab.length));
  K.eval(`pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(sa))}; invalidateCache();`);
  const gespeichert = J(`(p=>({punkte:p.punkte,stufe:p.stufe,grad:p.grad,teile:p.teile}))(prestigeOf('${MARTIN}'))`);
  // Das Prestige zählt die Chroniken, die das Profil zeigt [§C32] — auch die
  // des Monats, in dem er aufhörte: er hat darin gespielt.
  const matrix = J(`(seasonTitleHistory('${MARTIN}') || []).filter(r => r.title).map(r => r.sid)`);
  ok(sa.abschluss.prestige.zahlen.monat === matrix.length && matrix.includes('2026-08'),
     'der Abschluss zählt genau die Monatschroniken, die das Profil zeigt, den letzten Monat eingeschlossen',
     sa.abschluss.prestige.zahlen.monat + ' gezählt, ' + matrix.length + ' in der Matrix (' + matrix.join(', ') + ')');
  // Eine neue Fassung der App: eine Auszeichnung, die jeder hat, der je
  // gespielt hat, ein höherer Startwert für die seltenen und ein anderer
  // Grundwert für die Rekorde des Könnens [§C34]. Der Startwert hieß hier
  // `start`, das Feld heißt `basis`: die seltenen blieben unverändert, und
  // geprüft war nur die neue Auszeichnung.
  K.eval(`BADGES.push({id:'zz_neu', ic:'star', name:'Neu im Katalog', desc:'Eine Partie', count:(id, q) => q.some(m => [m.a1,m.a2,m.b1,m.b2].includes(id)) ? 1 : 0});
          globalThis.__rareAlt = PRESTIGE_AUSZEICHNUNG.rare.basis; PRESTIGE_AUSZEICHNUNG.rare.basis += 40;
          CHRONICLES.forEach(c => { if(c.basis === REKORD_GRUNDWERT.koennen) c.basis += 50; });
          invalidateCache(); _ruheGespeichertMemo.clear();`);
  const andere = IDS.find(id => id !== MARTIN && J("getCachedBadges('" + id + "').length") > 0);
  const nachher = J(`(p=>({punkte:p.punkte,stufe:p.stufe,grad:p.grad,teile:p.teile}))(prestigeOf('${MARTIN}'))`);
  ok(J(`getCachedBadges('${andere}').some(b => b.id === 'zz_neu')`) && !J(`getCachedBadges('${MARTIN}').some(b => b.id === 'zz_neu')`)
     && gleich(nachher, gespeichert) && gleich(J(`getCachedBadges('${MARTIN}').map(b=>b.id+b.count)`), sa.abschluss.badges.map(b => b.id + b.count)),
     'nach dem Abschluss ändert eine neue Fassung der App sein Profil nicht', JSON.stringify({nachher:nachher.punkte, vorher:gespeichert.punkte}));
  // Gegenprobe: ohne Abschluss-Teil folgt das Profil der neuen Fassung.
  K.eval(`globalThis.__sa = pmap()['${MARTIN}'].retired_stand;
          pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(st))}; invalidateCache(); _ruheGespeichertMemo.clear();`);
  const gerechnet = J(`prestigeOf('${MARTIN}').punkte`);
  ok(gerechnet !== gespeichert.punkte, 'ohne Abschluss-Teil hätte die neue Fassung das Prestige verschoben',
     gespeichert.punkte + ' gespeichert, ' + gerechnet + ' gerechnet');
  // Bis zum Abschluss rechnen seine Rekorde vom Karriereende mit dem
  // Grundwert von heute, wie die jedes anderen.
  const rekQ = J(`(prestigeOf('${MARTIN}').quellen || []).filter(q => q.q === 'rekord')
    .map(q => ({id:q.id, basis:q.basis, soll:CHRONICLE_BY_ID[q.id].basis}))`);
  ok(rekQ.length > 0 && rekQ.every(q => q.basis === q.soll) && rekQ.some(q => q.basis === K.eval('REKORD_GRUNDWERT.koennen') + 50),
     'vor dem Abschluss rechnen seine Rekorde mit dem Grundwert von heute',
     rekQ.map(q => q.id + ' ' + q.basis + '/' + q.soll).slice(0, 4).join(', '));
  K.eval(`pmap()['${MARTIN}'].retired_stand = __sa; BADGES.pop(); PRESTIGE_AUSZEICHNUNG.rare.basis = globalThis.__rareAlt;
          CHRONICLES.forEach(c => { if(c.basis === REKORD_GRUNDWERT.koennen + 50) c.basis -= 50; });
          invalidateCache(); _ruheGespeichertMemo.clear();`);
  // Eine Stufe mehr in der Leiter: der Schlüssel gilt, die Zahl folgt ihm.
  {
    const key = sa.abschluss.prestige.insignie.key;
    K.eval(`INSIGNIEN.splice(1, 0, {key:'zz_zwischen', name:'Zwischenreif', min:300}); _ruheGespeichertMemo.clear(); invalidateCache();`);
    const p = J(`(p=>({key:p.insignie.key, stufe:p.stufe}))(prestigeOf('${MARTIN}'))`);
    K.eval(`INSIGNIEN.splice(1, 1); _ruheGespeichertMemo.clear(); invalidateCache();`);
    ok(p.key === key && p.stufe === sa.abschluss.prestige.stufe + 1 && J(`prestigeOf('${MARTIN}').stufe`) === sa.abschluss.prestige.stufe,
       'eine neue Stufe in der Leiter verschiebt sein Zeichen nicht', key + ': Stufe ' + sa.abschluss.prestige.stufe + ' → ' + p.stufe);
  }
  // Das Feld spielt weiter, sein Fingerabdruck bleibt der vom Abschluss.
  {
    K.eval(`globalThis.__mAlt = matches;
      const _o = players.filter(p => p.id !== '${MARTIN}').map(p => p.id);
      matches = matches.concat(Array.from({length:30}, (_, i) => ({id:'fa' + i, a1:_o[i % 3], a2:_o[3 + i % 3], b1:_o[6 + i % 3], b2:_o[9 + i % 2],
        a1_side:'drive', a2_side:'reves', b1_side:'drive', b2_side:'reves', games_a:10, games_b:0, winner:'A', exp_a:0.5,
        created_at:new Date(Date.parse('2026-09-03T09:00:00Z') + i * 60000).toISOString(), deltas:{}})));
      invalidateCache();`);
    const jetzt = J(`fingerabdruck('${MARTIN}')`);
    K.eval(`pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(st))}; invalidateCache(); _ruheGespeichertMemo.clear();`);
    const live = J(`fingerabdruck('${MARTIN}')`);
    K.eval(`pmap()['${MARTIN}'].retired_stand = __sa; matches = __mAlt; invalidateCache(); _ruheGespeichertMemo.clear();`);
    ok(gleich(jetzt, sa.abschluss.finger) && !gleich(live, sa.abschluss.finger),
       'der Fingerabdruck bleibt der vom Abschluss, auch wenn das Feld weiterspielt');
  }
  // Ein Stand gehört zu genau einem Karriereende.
  K.eval(`pmap()['${MARTIN}'].retired_at = '2026-08-20T12:00:00Z'; invalidateCache();`);
  ok(J(`ruhestandAuszeichnungen('${MARTIN}')`) === null && J(`ruhestandStand('${MARTIN}').rekorde.length`) === 0,
     'ein geändertes Karriereende verwirft den gespeicherten Stand');
  K.eval(`pmap()['${MARTIN}'].retired_at = ${JSON.stringify(zeile.retired_at)}; invalidateCache();`);
  // Ohne die Spalte wird nichts gesetzt: ein Karriereende ohne seine Rekorde
  // gibt es nicht.
  globalThis.__updFehler = row => ('retired_stand' in row) ? {message:'column "retired_stand" does not exist', code:'42703'} : null;
  const vorFehlt = schreibe().length;
  const r2 = await K.eval(`karriereSetzen('${IDS[NAMES.indexOf('Leon')]}', true)`);
  globalThis.__updFehler = null;
  ok(!r2.ok && r2.fehlt && schreibe().length === vorFehlt + 1,
     'ohne die Spalte wird nichts gesetzt, und der Hinweis nennt die fehlende Spalte', JSON.stringify({ok:r2.ok, fehlt:r2.fehlt}));
  // Die Rückkehr leert beides.
  const vorZur = schreibe().length;
  const r3 = await K.eval(`karriereSetzen('${MARTIN}', false)`);
  const w3 = schreibe().slice(vorZur)[0] || {};
  ok(r3.ok && w3.upd && w3.upd.retired_at === null && w3.upd.retired_stand === null,
     'die Rückkehr leert Zeitpunkt und Stand', JSON.stringify(w3.upd));
  K.eval(`pmap()['${MARTIN}'].retired_at = null; pmap()['${MARTIN}'].retired_stand = null; invalidateCache();`);
  FIXED = new RealDate('2026-08-27T12:00:00Z').getTime();
  K.eval('invalidateCache();');
})().then(() => {

console.log('\n=== LÖSCHEN NUR OHNE PARTIE ===');
// Wer gespielt hat, trägt die Geschichte von drei anderen mit: gelöscht
// stand in jeder Partie ein Fragezeichen. Gefragt wird die Datenbank, nicht
// die geladene Liste — die ist leer, solange der erste Abruf läuft.
(async () => {
  globalThis.__dbPartien = realMatches;
  const geloescht = () => globalThis.__written.filter(w => w.geloescht).map(w => w.geloescht);
  const r1 = await K.eval(`spielerLoeschen('${MARTIN}')`);
  ok(!r1.ok && r1.grund === 'partien' && r1.zahl > 0 && !geloescht().includes(MARTIN),
     'ein Spieler mit Partien wird nicht gelöscht', JSON.stringify(r1));
  const vorher = K.eval('matches.length');
  K.eval('globalThis.__alle = matches; matches = []');
  const r2 = await K.eval(`spielerLoeschen('${MARTIN}')`);
  K.eval('matches = globalThis.__alle');
  ok(!r2.ok && r2.grund === 'partien' && !geloescht().includes(MARTIN) && K.eval('matches.length') === vorher,
     'auch wenn die geladene Liste leer ist, zählt die Datenbank seine Partien', JSON.stringify(r2));
  globalThis.__dbFehler = true;
  const r3 = await K.eval(`spielerLoeschen('neu-ohne-partie')`);
  globalThis.__dbFehler = false;
  ok(!r3.ok && r3.grund === 'netz' && !geloescht().includes('neu-ohne-partie'),
     'ohne Antwort der Datenbank wird nichts gelöscht', JSON.stringify(r3));
  const r4 = await K.eval(`spielerLoeschen('neu-ohne-partie')`);
  ok(r4.ok && geloescht().includes('neu-ohne-partie'), 'ein Spieler ohne Partie wird gelöscht', JSON.stringify(r4));

  console.log('\n=== ZWEI MONATE SPÄTER, MIT EINER NEUEN FASSUNG DER APP ===');
  // Verglichen wird, was zu LESEN ist: das Profil und jedes Blatt, das von
  // ihm ausgeht, als Text. Nicht einzelne Funktionen — ein Teil des Profils,
  // den es heute noch nicht gibt, fällt damit genauso auf, sobald er etwas
  // zeigt, das sich nach dem Karriereende bewegt.
  {
    const text = h => String(h).replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
    const BLAETTER = [['Profil', 'showPlayer'], ['Laufbahn', 'showLaufbahn'], ['Auszeichnungen', 'showPlayerBadges'],
      ['Bilanzen', 'showPlayerH2HList'], ['Abschied', 'zeigeAbschied']];
    K.eval(`globalThis.__openSheet = openSheet; openSheet = function(h){ globalThis.__blatt.push(h); };`);
    const bild = () => Object.fromEntries(BLAETTER.map(([n, f]) => {
      K.eval(`globalThis.__blatt = []; try { ${f}('${MARTIN}'); } catch(e){ globalThis.__blatt.push('FEHLER ' + e.message); }`);
      return [n, text(K.eval('globalThis.__blatt.join(" | ")'))];
    }));
    const vorDiff = (a, b) => { const x = a.split(' '), y = b.split(' '); let i = 0; while(i < x.length && x[i] === y[i]) i++;
      return x.slice(Math.max(0, i - 6), i + 8).join(' ') + '  →  ' + y.slice(Math.max(0, i - 6), i + 8).join(' '); };
    // Verglichen wird ab dem Abschluss: bis dahin laufen seine letzten
    // Zeiträume noch, und sein Profil folgt ihnen.
    // Ein eigener Zeitpunkt: dasselbe Karriereende schreibt seinen Abschluss
    // nur einmal je Sitzung, und das vom gespeicherten Stand oben ist schon
    // geschrieben.
    FIXED = new RealDate('2026-08-27T12:05:00Z').getTime();
    const r = await K.eval(`karriereSetzen('${MARTIN}', true)`);
    const zeile = globalThis.__written.filter(w => w.upd).pop().upd;
    K.eval(`pmap()['${MARTIN}'].retired_at = ${JSON.stringify(zeile.retired_at)};
            pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(zeile.retired_stand))}; invalidateCache();`);
    FIXED = K.eval(`ruhestandAbschlussMs('${MARTIN}')`) + 864e5;
    K.eval('invalidateCache(); _ruheAbschliessen();');
    await new Promise(res => setTimeout(res, 10));
    const ab = globalThis.__written.filter(w => w.upd).pop().upd;
    K.eval(`pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(ab.retired_stand))}; invalidateCache();`);
    const A = bild();
    // Zwei Monate weiter: die anderen spielen 120 Partien, ein Monat schließt,
    // und die App hat eine neue Auszeichnung, einen neuen Liga-Rekord und
    // einen höheren Startwert der seltenen Auszeichnungen.
    FIXED = new RealDate('2026-10-20T12:00:00Z').getTime();
    K.eval(`
      const _o = players.filter(p => p.id !== '${MARTIN}').map(p => p.id);
      const _neu = [];
      for(let i = 0; i < 120; i++) _neu.push({id:'sp' + i, a1:_o[i % 11], a2:_o[(i + 3) % 11], b1:_o[(i + 5) % 11], b2:_o[(i + 8) % 11],
        a1_side:'drive', a2_side:'reves', b1_side:'drive', b2_side:'reves', games_a:10, games_b:i % 9, winner:'A', exp_a:0.5,
        created_at:new Date(Date.parse('2026-09-02T10:00:00Z') + i * 11 * 3600e3).toISOString(), deltas:{}});
      matches = matches.concat(_neu);
      const _rc = simulateEloWithSliders(matches);
      const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
      matches.forEach(m => { m.deltas = _d[m.id] || {}; });
      BADGES.push({id:'zz_spaeter', ic:'star', name:'Neu im Katalog', desc:'Eine Partie',
        count:(id, q) => q.some(m => [m.a1,m.a2,m.b1,m.b2].includes(id)) ? 1 : 0});
      CHRONICLES.push(Object.assign({}, CHRONICLES[0], {id:'zz_rekord', name:'Der Neue', val:P => P.games || 0}));
      PRESTIGE_AUSZEICHNUNG.rare.start += 40;
      invalidateCache(); _ruheGespeichertMemo.clear();`);
    const B = bild();
    for(const [n] of BLAETTER){
      ok(A[n].length > 200 && A[n] === B[n] && !/FEHLER/.test(A[n]),
         n + ' eines Ruheständlers liest sich zwei Monate und eine Fassung später wie beim Abschied',
         A[n] === B[n] ? A[n].length + ' Zeichen' : vorDiff(A[n], B[n]));
    }
    // Die Woche, in der er aufhörte, hat er mitgespielt: sie nennt denselben
    // Sieger, ob er nun aufgehört hat oder nicht — auch wenn das er ist.
    const woche = () => J(`(() => { const d = new Date(ruhestandMs('${MARTIN}') || ${Date.parse('2026-08-27T12:00:00Z')});
      return _periodWinnerMap(matches, 'week')[d.getFullYear() + '-W' + isoWeek(d)] || null; })()`);
    const mitRuhe = woche();
    K.eval(`globalThis.__ra = pmap()['${MARTIN}'].retired_at; pmap()['${MARTIN}'].retired_at = null; invalidateCache();`);
    const ohneRuhe = woche();
    K.eval(`pmap()['${MARTIN}'].retired_at = __ra; invalidateCache();`);
    ok(mitRuhe === ohneRuhe && mitRuhe, 'die Woche, in der er aufhörte, gewinnt, wer darin vorn lag — mit oder ohne Karriereende',
       'Sieger ' + (mitRuhe ? nm(mitRuhe) : 'keiner'));
    K.eval(`openSheet = globalThis.__openSheet; BADGES.pop(); CHRONICLES.pop();`);
  }
  console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
  process.exit(fails ? 1 : 0);
})();
});
