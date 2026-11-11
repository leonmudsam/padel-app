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
const ok = (c, l, x) => { checks++; if(!c){ fails++; console.log('  ✗ ' + l + (x?'  ['+x+']':'')); } else console.log('  ok    ' + l + (x?'  ('+x+')':'')); };
const nm = id => NAMES[IDS.indexOf(id)] || id;

// Hilfsfunktion: Ambient-Stories fuer einen gegebenen Zeitpunkt bauen, mit
// einem vorgegebenen Bestand an schon persistierten Stories.
function build(iso, existing){
  return K.eval(`(function(){
    _cache._stories = ${JSON.stringify(existing || [])}.map(s => Object.assign({}, s, {when:new Date(s.when)}));
    return _buildAmbientStories(new Date(${JSON.stringify(iso)}), pmap(), id=>pname(id))
      .map(s => ({id:s.id, when:s.when.toISOString(), sub:s.dataRef.sub, title:s.title,
                  rubrik:s.dataRef.ambientRubrik,
                  pids:(s.dataRef.ambientPids||(s.dataRef.ambientPid?[s.dataRef.ambientPid]:[]))}));
  })()`);
}

console.log('=== 1. EIN SLOT ENTSTEHT HEUTE ODER GAR NICHT ===');
//    Einmal wurden die letzten drei Tage nachgetragen, mit `when` auf der
//    damaligen Slot-Zeit. Eine Karte, die JETZT entsteht und ein Datum von
//    vorgestern traegt, steht unter einem Tageskopf, den der Leser schon
//    gelesen hat, und der Lesestand zaehlt sie als gelesen [§C33] — sie wird
//    nie gesehen. Und ihr Inhalt entstand aus den HEUTIGEN Zahlen fuer einen
//    Tag, der vorbei ist.
const NOW = '2026-08-27T20:30:00Z';   // nach beiden Slots des Tages (lokal)
const NOW_MS = new Date(NOW).getTime();
const tagKeyJS = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')
  +'-'+String(d.getDate()).padStart(2,'0');
const HEUTE = tagKeyJS(new Date(NOW));
const fresh = build(NOW, []);
console.log('  Slots aus leerem Bestand: ' + fresh.length);
fresh.forEach(s => console.log('    ' + s.id + '  ' + s.when.slice(0,16) + '  ' + s.sub));
const _spieltage = new Set(K.eval('matches.map(m=>tagKey(m.created_at))'));
// Der 10-Uhr-Slot steht an jedem Tag, der 19-Uhr-Slot nur an Tagen ohne
// Partie: keine der 466 Partien hat vor 10 Uhr angefangen, die letzte um
// 18 Uhr. Am Abend eines Spieltags ist alles vom Tag interessanter als eine
// Zahl, die seit Wochen gilt.
const _erwarteteTage = fresh.map(s => /^ambient_(\d{4}-\d{2}-\d{2})_15$/.exec(s.id)?.[1]);
ok(fresh.length > 1 && _erwarteteTage.every(Boolean),
   'verpasste stille Tage werden beim naechsten Oeffnen nachgetragen',
   fresh.map(s => s.id).join(', '));
ok(fresh.every(s => {
     const tag = /^ambient_(\d{4}-\d{2}-\d{2})_15$/.exec(s.id)[1];
     return tag === HEUTE || !_spieltage.has(tag);
   }), 'vergangene Spieltage bekommen keinen nachtraeglichen Fun Fact',
   fresh.map(s => s.id).join(', ') || 'keiner');
ok(new Set(fresh.map(s=>s.id)).size === fresh.length, 'keine doppelten IDs');
ok(fresh.every(s => /^ambient_\d{4}-\d{2}-\d{2}_15$/.test(s.id)), 'genau ein 15-Uhr-Slot je Tag');

console.log('\n=== 2. EINE KARTE TRAEGT IHRE SLOT-STUNDE ===');
//    `when` stand auf `now`, und damit nannte der Fun Fact die Uhrzeit seines
//    LESERS: ueber dem 19-Uhr-Slot stand „20:17", wenn die App um 20:17
//    geoeffnet wurde, und ueber dem 10-Uhr-Slot „10:30". Und weil `event_at`
//    beim ersten Insert gewinnt, hing die Stelle der Karte im Feed daran, wer
//    die App zuerst geoeffnet hat. Die Slot-Stunde steht in der ID und ist auf
//    jedem Geraet dieselbe.
fresh.forEach(s => {
  const d = new Date(s.when);
  const stunde = Number(/_(\d+)$/.exec(s.id)[1]);
  ok(d.getHours() === stunde && d.getMinutes() === 0 && d.getSeconds() === 0,
     s.id + ': traegt seine Slot-Stunde, nicht die Uhrzeit des Lesers',
     d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'));
  ok(tagKeyJS(d) === /^ambient_(\d{4}-\d{2}-\d{2})_/.exec(s.id)[1],
     s.id + ': liegt am Tag seiner ID', tagKeyJS(d));
  ok(d.getTime() <= NOW_MS + 5000, s.id + ': liegt nicht in der Zukunft');
});

console.log('\n=== 3. IDEMPOTENZ ===');
// Was schon persistiert ist, wird nicht noch einmal erzeugt.
const asStored = fresh.map(s => ({id:s.id, when:s.when, title:s.title,
  desc:'Der gespeicherte Satz von damals.', prio:20, cat:'season', ic:'sparkle',
  dataRef:{type:'ambient', sub:s.sub, ambientRubrik:s.rubrik, ambientPids:s.pids}}));
const second = build(NOW, asStored);
ok(second.length === 0, 'zweiter Lauf erzeugt nichts mehr', second.length + '');
if(fresh.length > 1){
  const gapId = fresh[fresh.length-1].id;
  const filled = build(NOW, asStored.filter(s => s.id !== gapId));
  ok(filled.length === 1 && filled[0].id === gapId, 'eine einzelne Luecke wird gezielt gefuellt',
     filled.map(s=>s.id).join(','));
}

console.log('\n=== 4. WAS GEZOGEN WURDE, WIRD NICHT NEU GEZOGEN ===');
//    Der eigentliche Befund: `_buildAmbientStories` liest die Rotation aus
//    `_cache._stories`, und der steht beim Kaltstart leer — `loadAll` zeichnet,
//    BEVOR `syncStoriesViaDb` gelaufen ist. Derselbe Slot zog damit zwei
//    verschiedene Karten, und `_newsTexteAuffrischen` schrieb die kalte Fassung
//    ueber die gespeicherte: wer gestern einen Fun Fact gelesen hatte, fand
//    heute an derselben Stelle einen anderen.
// Nachgestellt wird die echte Reihenfolge: `loadAll` zeichnet mit leerem
// Bestand (der Generator zieht blind und merkt sich das Ergebnis), danach
// landet der Sync. Der Memo-Schluessel muss den Bestand kennen, sonst bleibt
// die blinde Ziehung die ganze Sitzung stehen und die Auffrischung schreibt
// sie ueber die gespeicherte Karte.
const _frost = JSON.parse(K.eval(`JSON.stringify((function(){
  const bestand = ${JSON.stringify(asStored)}.map(s => Object.assign({}, s, {when:new Date(s.when)}));
  // 1. Kaltstart: kein Bestand, der Generator zieht und merkt sich das.
  _cache._stories = [];
  delete _cache._buildStoriesKey; delete _cache._frischVon;
  const kalt = _buildStories().filter(s => String(s.id).indexOf('ambient_') === 0);
  // 2. Der Sync landet.
  _cache._stories = bestand;
  const aus = _newsTexteAuffrischen(bestand);
  const ambi = aus.filter(s => String(s.id).indexOf('ambient_') === 0);
  return {n:ambi.length, kalt:kalt.map(s => s.id + ': ' + s.title),
          geaendert: ambi.filter(s => {
            const alt = bestand.find(b => b.id === s.id);
            return !alt || alt.title !== s.title || alt.desc !== s.desc
              || JSON.stringify(alt.dataRef) !== JSON.stringify(s.dataRef);
          }).map(s => s.id)};
})())`));
ok(_frost.kalt.length > 0, 'der Kaltstart zieht ueberhaupt einen Fun Fact',
   _frost.kalt.join(' | '));
ok(_frost.n === asStored.length, 'die gespeicherten Fun Facts stehen im Feed',
   _frost.n + ' von ' + asStored.length);
ok(_frost.geaendert.length === 0, 'die Auffrischung schreibt keinen Fun Fact um',
   _frost.geaendert.join(', ') || 'keiner');

console.log('\n=== 4b. ALTE FUNFACTS STEHEN AM FESTEN 15-UHR-SLOT ===');
// Alte Generatorfassungen speicherten bei korrekter 15-Uhr-ID teilweise den
// Moment des naechsten Oeffnens. Der Inhalt bleibt ein Snapshot, die sichtbare
// Zeit und Feed-Position werden aus der festen Slot-ID repariert.
const _uhr = JSON.parse(K.eval(`JSON.stringify((function(){
  const alt = ${JSON.stringify(asStored)}.map(s => Object.assign({}, s, {
    // So stand es in der Datenbank: der Moment des ersten Oeffnens.
    when: new Date(`+NOW_MS+`)}));
  _cache._stories = alt;
  delete _cache._buildStoriesKey; delete _cache._frischVon;
  const aus = _newsTexteAuffrischen(alt)
    .filter(s => String(s.id).indexOf('ambient_') === 0);
  // Eine Karte, die KEIN Fun Fact ist, behaelt ihren Zeitpunkt.
  const fremd = {id:'potd_2026-08-27', cat:'highlight', ic:'crown', prio:70,
    title:'X ist Spieler des Tages', desc:'Alter Satz.',
    when:new Date(`+NOW_MS+`), dataRef:{type:'potd', playerId:null}};
  _cache._stories = alt.concat([fremd]);
  delete _cache._buildStoriesKey; delete _cache._frischVon;
  const mitFremd = _newsTexteAuffrischen(alt.concat([fremd]))
    .find(s => s.id === 'potd_2026-08-27');
  return {n:aus.length,
    stunden:aus.map(s => s.id + ' -> ' + new Date(s.when).getHours()
      + ':' + String(new Date(s.when).getMinutes()).padStart(2, '0')),
    korrekt:aus.every(s => {
      const d = new Date(s.when);
      return d.getHours() === Number(/_(\\d+)$/.exec(s.id)[1]) && d.getMinutes() === 0;
    }),
    fremdUnberuehrt: !mitFremd
      || new Date(mitFremd.when).getTime() === `+NOW_MS+`};
})())`));
ok(_uhr.n === asStored.length && _uhr.korrekt,
   'ein gespeicherter 15-Uhr-Fun-Fact wird am festen Slot einsortiert',
   _uhr.stunden.join(' | '));
ok(_uhr.fremdUnberuehrt,
   'jede andere Karte behaelt den Zeitpunkt der Datenbank');

console.log('\n=== 4c. NUR DIE HEUTIGE TAFEL DARF WACHSEN ===');
const _snapshotWege = JSON.parse(K.eval(`JSON.stringify((function(){
  const jetzt = new Date(), gestern = new Date(jetzt);
  gestern.setDate(gestern.getDate() - 1);
  const heute = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate(), 12, 0, 0);
  gestern.setHours(12, 0, 0, 0);
  const alt = [
    {id:'snap-normal',cat:'highlight',ic:'ball',title:'Normal alt',desc:'1.',prio:20,when:heute,
      dataRef:{type:'spiel',matchId:'x'}},
    {id:'snap-tafel-alt',cat:'tafel',ic:'trophy',title:'Tafel gestern alt',desc:'2.',prio:40,when:gestern,
      dataRef:{type:'rekord_geholt',rekordId:'r1'}},
    {id:'snap-tafel-heute',cat:'tafel',ic:'trophy',title:'Tafel heute alt',desc:'3.',prio:40,when:heute,
      dataRef:{type:'rekord_geholt',rekordId:'r2'}}
  ];
  const neu = alt.map(s => Object.assign({}, s, {title:s.title.replace('alt','neu')}));
  const gemischt = _mergeStorySnapshots(alt, neu, jetzt);
  const titel = id => (gemischt.find(s => s.id === id) || {}).title;
  _cache._stories = alt.slice();
  _onStoryRealtimeUpdate(_storyToRow(neu[0]));
  const realtimeNormal = (_cache._stories.find(s => s.id === 'snap-normal') || {}).title;
  _onStoryRealtimeUpdate(_storyToRow(neu[2]));
  const realtimeTafel = (_cache._stories.find(s => s.id === 'snap-tafel-heute') || {}).title;
  return {normal:titel('snap-normal'), gestern:titel('snap-tafel-alt'),
    heute:titel('snap-tafel-heute'), realtimeNormal, realtimeTafel};
})())`));
ok(_snapshotWege.normal === 'Normal alt' && _snapshotWege.gestern === 'Tafel gestern alt',
   'normale und historische Stories bleiben beim Zusammenfuehren unveraendert',
   JSON.stringify(_snapshotWege));
ok(_snapshotWege.heute === 'Tafel heute neu',
   'nur die heutige Ewige Tafel nimmt ihre neuere Fassung an', _snapshotWege.heute);
ok(_snapshotWege.realtimeNormal === 'Normal alt' && _snapshotWege.realtimeTafel === 'Tafel heute neu',
   'Realtime ignoriert normale Updates und uebernimmt die heutige Tafel',
   _snapshotWege.realtimeNormal + ' / ' + _snapshotWege.realtimeTafel);

console.log('\n=== 5. ROTATION BLEIBT ===');
const again = build(NOW, []);
ok(JSON.stringify(again.map(s=>s.sub)) === JSON.stringify(fresh.map(s=>s.sub)),
   'zwei identische Laeufe, identische Ziehung');
const subs = fresh.map(s=>s.sub);
ok(new Set(subs).size === subs.length, 'aufeinanderfolgende 15-Uhr-Karten zeigen verschiedene Typen',
   subs.join(', '));
const rubriken = fresh.map(s => s.rubrik);
ok(rubriken.every(Boolean), 'jede ambiente Karte speichert ihre Rubrik', rubriken.join(', '));
ok(rubriken.every((r,i) => i === 0 || r !== rubriken[i-1]),
   'aufeinanderfolgende Slots wechseln die Erzaehlrubrik', rubriken.join(' -> '));
const _kleinerPool = JSON.parse(K.eval(`JSON.stringify((function(){
  const alt = _ambientTemplatePool;
  try {
    _ambientTemplatePool = () => [{key:'nur_eine_rubrik', make:() => ({
      cat:'season', ic:'sparkle', title:'Ein belastbarer Fakt',
      desc:'1 belegter Wert aus dem kleinen Datenbestand.', dataRef:{}})}];
    _cache._stories = [];
    const r = _buildAmbientStories(new Date(${JSON.stringify(NOW)}), pmap(), id=>pname(id));
    return {n:r.length, sauber:r.every(s => s && s.dataRef && s.dataRef.ambientRubrik)};
  } finally { _ambientTemplatePool = alt; }
})())`));
ok(_kleinerPool.n >= 1 && _kleinerPool.sauber,
   'ein kleiner Template-Pool bleibt funktionsfaehig', _kleinerPool.n + ' Karten');

// ── Dieselbe These nicht vor dreissig Tagen ───────────────────────────
// Der Typ-Cooldown sperrt sieben Tage, der Spieler-Cooldown zwei. Beides
// verhindert die KOMBINATION nicht: die Fuehrungs-Typen zeigen strukturell
// immer auf denselben Kopf, und „kurz vor dem Schildring: Johannes" stand
// gemessen fuenfmal in vierzig Tagen. Eine These ist der Typ UND die Person
// (`AMBIENT_PAAR_COOLDOWN_DAYS`) — derselbe Typ ueber jemand anderen ist eine
// neue Aussage. Nachgespielt werden vierzig Tage, Slot fuer Slot, mit dem
// Bestand, der dabei entsteht.
// Ausgenommen sind die Rueckblicke mit festem Termin (`pflicht`): die
// Monatshalbzeit gehoert dem 15. und der Jahresblick dem 1. Januar, sie
// haengen nicht am Losverfahren. Gemessen stand `rueckblick_halbzeit`
// nach 23 Tagen wieder da — einmal gezogen, einmal als Pflicht am 15.
const _pflichtKeys = new Set(K.eval(
  `_ambientTemplatePool(new Date(), pmap(), id=>pname(id))`
  + `.filter(t => typeof t.pflicht === 'function').map(t => t.key)`));
const _thesen = (function(){
  const start = new Date('2026-08-20T00:00:00').getTime();
  const bestand = [];
  const wann = {};   // These -> letzter Tag
  let verstoesse = [], thesen = 0;
  for(let d = 0; d < 40; d++){
    [10, 19].forEach(std => {
      const t = new Date(start + d * 864e5);
      t.setHours(std, 0, 0, 0);
      let neu = [];
      try { neu = build(t.toISOString(), bestand) || []; } catch(e){ return; }
      neu.forEach(x => {
        bestand.push({id:x.id, when:x.when, title:x.title, desc:'gespeichert',
          prio:20, cat:'season', ic:'sparkle',
          dataRef:{type:'ambient', sub:x.sub, ambientRubrik:x.rubrik, ambientPids:x.pids}});
        // Der Abstand zaehlt am Datum der KARTE, nicht am Tag des Nachlaufs:
        // der erste Durchgang traegt das ganze Feed-Fenster auf einmal nach,
        // und alle diese Karten standen als Tag 0 da. „personal_glanztag"
        // vom 8. August und vom 8. September galt damit als Wiederholung
        // nach 19 Tagen, obwohl 31 dazwischen liegen — die Sperre der App
        // rechnet ebenso am Zeitpunkt der Karte.
        const tag = Math.round(new Date(x.when).getTime() / 864e5);
        (x.pids && x.pids.length ? x.pids : ['']).forEach(pid => {
          const k = x.sub + '|' + pid;
          thesen++;
          if(wann[k] != null && tag - wann[k] < 30 && !_pflichtKeys.has(x.sub))
            verstoesse.push(k + ' nach ' + (tag - wann[k]) + ' Tagen');
          wann[k] = tag;
        });
      });
    });
  }
  return {thesen, karten:bestand.length, verstoesse:[...new Set(verstoesse)]};
})();
console.log('  Vierzig Tage Rotation: ' + _thesen.karten + ' Karten, '
  + _thesen.thesen + ' Thesen');
ok(_thesen.karten >= 40, 'der Nachlauf fuellt ueberhaupt Slots',
   _thesen.karten + ' Karten');
ok(_thesen.verstoesse.length <= 2,
   'die Nachholung bleibt trotz grosser Luecke abwechslungsreich',
   _thesen.verstoesse.slice(0, 3).join(' | ') || 'keine Wiederholung');

// ── Eine abgemeldete Karte gibt ihren Slot frei ───────────────────────
// Am 28.10. schrieb ein Gerät mit der Fassung vor dem Streichen des
// Umsteigers dessen Karte in den 15-Uhr-Slot. Die neue Fassung blendete sie
// aus (`AMBIENT_ABGEMELDET`) und fand den Slot belegt: der Tag blieb ohne Fun
// Fact. Der Ersatz bekommt die nächste freie ID, weil die Datenbank keine
// Zeile ändert.
const _abSlot = fresh[0];
const _abKarte = (id, sub) => ({id, when:_abSlot.when, title:'gespeichert', desc:'gespeichert', prio:12,
  cat:'personal', ic:'sparkle', dataRef:{type:'ambient', sub, ambientRubrik:'persoenlich'}});
const _abErsatz = build(NOW, [_abKarte(_abSlot.id, 'personal_umsteiger')]);
ok(_abErsatz.some(x => x.id === _abSlot.id + '_2') && !_abErsatz.some(x => x.id === _abSlot.id),
   'eine abgemeldete Karte gibt ihren Slot frei, der Ersatz trägt die nächste ID',
   _abErsatz.filter(x => x.id.indexOf(_abSlot.id) === 0).map(x => x.id + ' ' + x.sub).join(', ') || 'kein Ersatz');
const _abGilt = build(NOW, [_abKarte(_abSlot.id, 'personal_glanztag')]);
ok(!_abGilt.some(x => x.id.indexOf(_abSlot.id) === 0),
   'eine gültige Karte hält ihren Slot', _abGilt.filter(x => x.id.indexOf(_abSlot.id) === 0).map(x => x.id).join(', ') || 'frei');
const _abBeide = build(NOW, [_abKarte(_abSlot.id, 'personal_umsteiger'), _abKarte(_abSlot.id + '_2', 'personal_glanztag')]);
ok(!_abBeide.some(x => x.id.indexOf(_abSlot.id) === 0),
   'steht der Ersatz schon, entsteht kein zweiter', _abBeide.filter(x => x.id.indexOf(_abSlot.id) === 0).map(x => x.id).join(', ') || 'keiner');

console.log('\n=== 6. ZUKUENFTIGE SLOTS BLEIBEN ZU ===');
const morning = build('2026-08-27T11:30:00Z', []);   // vor 15:00 lokal
ok(!morning.some(s => s.id === 'ambient_2026-08-27_15'), 'der heutige 15-Uhr-Slot wartet noch');
ok(morning.some(s => s.id.indexOf('ambient_2026-08-27_') !== 0),
   'verpasste stille Tage werden trotzdem nachgetragen', morning.map(s=>s.id).join(', '));

const _slotNachMatch = JSON.parse(K.eval(`JSON.stringify((function(){
  const vorher = _cache._stories, pm = pmap(), nameOf = id => pname(id);
  const basis = Object.assign({}, matches[0]);
  const id = 'ambient_2026-09-03_15';
  let spaet = null, sichtbar = false, vorzeitig = false, nachSaisonende = false;
  try {
    const mSpaet = Object.assign({}, basis, {id:'slot-spaet', created_at:'2026-09-03T15:20:00'});
    matches.push(mSpaet); _cache._stories = [];
    spaet = _buildAmbientStories(new Date('2026-09-03T15:05:00'), pm, nameOf, []).find(s => s.id === id);
    _cache._stories = spaet ? [spaet] : [];
    _buildAmbientStories(new Date('2026-09-03T15:30:00'), pm, nameOf, []);
    _cache._snapshotConsolFrom = null;
    sichtbar = getStoriesCache().some(s => s.id === id);
    matches.pop();
    const mFrueh = Object.assign({}, basis, {id:'slot-frueh', created_at:'2026-09-03T14:50:00'});
    matches.push(mFrueh); _cache._stories = [];
    vorzeitig = _buildAmbientStories(new Date('2026-09-03T15:05:00'), pm, nameOf, [])
      .some(s => s.id === id);
    matches.pop();
    _cache._stories = [];
    nachSaisonende = _buildAmbientStories(new Date('2026-09-04T15:05:00'), pm, nameOf, [{
      when:new Date('2026-09-04T14:55:00'), dataRef:{type:'season_recap'}
    }]).some(s => s.id === 'ambient_2026-09-04_15');
  } finally {
    if(matches[matches.length - 1] && /^slot-/.test(matches[matches.length - 1].id || '')) matches.pop();
    _cache._stories = vorher; _cache._snapshotConsolFrom = null;
  }
  return {erzeugt:!!spaet, sichtbar, vorzeitig, nachSaisonende};
})())`));
ok(_slotNachMatch.erzeugt && _slotNachMatch.sichtbar,
   'der 15-Uhr-Funfact bleibt nach der ersten Partie um 15:20 bestehen',
   JSON.stringify(_slotNachMatch));
ok(!_slotNachMatch.vorzeitig,
   'eine Partie vor 15 Uhr verhindert den Funfact dieses Tages');
ok(!_slotNachMatch.nachSaisonende,
   'ein Saisonabschluss vor 15 Uhr verhindert den Funfact dieses Tages');

console.log('\n=== 6. BLICKRICHTUNG DES SLOTS ===');
// Der einzelne Slot mischt Stand und Rueckblick.
const rolle = k => K.eval(`_ambientRolleVon(${JSON.stringify(k)}) || 'beides'`);
let verkehrt = [];
fresh.forEach(s => {
  const h = +/_(\d+)$/.exec(s.id)[1];
  const r = rolle(s.sub);
  if(K.eval('_ambientRolleFuerSlot(15)') !== 'mix') verkehrt.push(s.id + ':' + s.sub);
});
ok(verkehrt.length === 0, 'kein Slot bekommt die falsche Blickrichtung', verkehrt.join(' '));

console.log('\n=== 7. RUECKBLICKE MIT FESTEM TERMIN ===');
// Der Halbzeit-Rueckblick haengt nicht am Losverfahren: am 15. um 15:00
// belegt er den Slot, egal was sonst gezogen haette.
const halb = build('2026-08-15T15:30:00', []).find(s => s.id === 'ambient_2026-08-15_15');
ok(!!halb && halb.sub === 'rueckblick_halbzeit',
   'der 15. um 15:00 gehoert dem Halbzeit-Rueckblick', halb ? halb.sub : 'kein Slot');
ok(!!halb && /Halbzeit im/.test(halb.title), 'und traegt die passende Ueberschrift',
   halb ? halb.title : '');
// Am 14. darf er nicht kommen.
const vorher = build('2026-08-14T15:30:00', []).find(s => s.id === 'ambient_2026-08-14_15');
ok(!vorher || vorher.sub !== 'rueckblick_halbzeit', 'am 14. nicht',
   vorher ? vorher.sub : '—');

console.log('\n=== 8. DIE NEUEN PRESTIGE-KARTEN ===');
const neuKeys = ['prestige_fuehrung','prestige_schwelle','prestige_schritt',
                 'insignium_stand','titelband_stand','rueckblick_halbzeit','rueckblick_jahr'];
const gebaut = JSON.parse(K.eval(`(function(){
  const pm = pmap(), nameOf = pid => (pm[pid]||{}).name || '?';
  const T = _ambientTemplatePool(new Date(), pm, nameOf);
  const rng = _ambientRng(_ambientHash('test'));
  const out = {};
  ${JSON.stringify(neuKeys)}.forEach(k => {
    const t = T.find(x => x.key === k);
    if(!t){ out[k] = {fehlt:true}; return; }
    let r = null, err = null;
    try { r = t.make(rng); } catch(e){ err = e.message; }
    out[k] = r ? {title:r.title, desc:r.desc, ref:r.dataRef||{}} : {leer:true, err};
  });
  return JSON.stringify(out);
})()`));
neuKeys.forEach(k => ok(!gebaut[k].fehlt, 'Template ' + k + ' ist im Pool'));
neuKeys.forEach(k => ok(!gebaut[k].err, 'Template ' + k + ' laeuft ohne Fehler', gebaut[k].err || ''));
// Alle ausser dem Jahresrueckblick muessen auf den echten Daten etwas liefern:
// 2025 hat die Liga noch nicht gespielt, also ist `null` dort das richtige.
neuKeys.filter(k => k !== 'rueckblick_jahr')
  .forEach(k => ok(!gebaut[k].leer, 'Template ' + k + ' liefert eine Karte'));
ok(gebaut.rueckblick_jahr.leer, 'der Jahresrueckblick schweigt ohne Vorjahr');
['prestige_fuehrung','prestige_schwelle','prestige_schritt','titelband_stand']
  .forEach(k => ok(gebaut[k].ref && gebaut[k].ref.prestige === true,
    k + ' zeigt das Insignium als Bild'));
neuKeys.filter(k => !gebaut[k].leer).forEach(k =>
  ok(!/undefined|NaN|\[object/.test(gebaut[k].title + gebaut[k].desc),
     k + ' sauber formuliert', gebaut[k].desc));
// Die Leiter der Liga [§C30]: die Karte trägt ihren Stand mit — je Stufe die
// Zahl der Träger und je Spieler sein Feld —, und beides muss zur Tabelle
// passen, sonst zeigt das Blatt Gesichter auf Feldern, die sie nicht tragen.
const _leiter = JSON.parse(K.eval(`(function(){
  const pm = pmap(), nameOf = pid => (pm[pid]||{}).name || '?';
  const t = _ambientTemplatePool(new Date(), pm, nameOf).find(x => x.key === 'insignium_stand');
  const r = t && t.make(_ambientRng(1));
  const L = r && r.dataRef && r.dataRef.leiter;
  if(!L) return JSON.stringify({fehlt:true});
  const falsch = L.felder.filter(([pid, si, nr]) => {
    const P = prestigeOf(pid);
    return P.stufe !== si || _insBildNr(P.insignie.key, P.grad) !== nr;
  }).length;
  return JSON.stringify({je:L.je, felder:L.felder.length, falsch, n:+r.vv, title:r.title});
})()`));
ok(!_leiter.fehlt && _leiter.je.length === 7
   && _leiter.je.reduce((a, b) => a + b, 0) === _leiter.n && _leiter.felder === _leiter.n,
   'die Leiter der Liga zaehlt jeden Spieler genau einmal', JSON.stringify(_leiter));
ok(!_leiter.fehlt && _leiter.falsch === 0,
   'und jeder steht auf dem Feld, das er traegt', JSON.stringify(_leiter));

console.log('\n=== 8b. JEDER FUN FACT HAT SEIN BILD ===');
// Jeder Fun Fact trug dieselbe Form: eine große Zahl links, der Satz rechts —
// „3 Tage ohne Spiel" sah aus wie „41 Awards" und „7:2 Duelle". Jede Vorlage
// legt jetzt die Daten ihres Bilds in `dataRef.bild`, und die Karte zeichnet
// daraus den Kopf ihres Anlasses. Geprüft wird, dass jede Vorlage eins trägt,
// dass es gezeichnet wird und jeden Namen nennt, und dass seine Zahlen zu
// ihrer Quelle passen: das Tauziehen zur Bilanz der beiden, der Erste eines
// Rennens zum Helden der Karte, das Zählwerk zur großen Zahl.
const _ffB = JSON.parse(K.eval(`(function(){
  const pm = pmap(), nameOf = pid => (pm[pid]||{}).name || '?';
  const out = [], seen = new Set(), h2h = _ensureH2HMap();
  [new Date(2026, 7, 26, 15, 5), new Date(2026, 6, 20, 15, 5), new Date(2026, 5, 18, 15, 5)].forEach(now => {
    const T = _ambientTemplatePool(now, pm, nameOf);
    for(let seed = 1; seed <= 6; seed++) T.forEach(t => {
      let r = null; try { r = t.make(_ambientRng(seed)); } catch(e){ out.push({k:t.key, err:e.message}); return; }
      if(!r) return;
      const d = r.dataRef || {}, b = d.bild || null;
      const sig = t.key + JSON.stringify(b);
      if(seen.has(sig)) return; seen.add(sig);
      const s = {id:'t_' + t.key, title:r.title, desc:r.desc, when:now, cat:r.cat, ic:r.ic,
        dataRef:Object.assign({type:'ambient', sub:t.key}, d, r.vv != null ? {vv:String(r.vv), vl:r.vl || ''} : {})};
      const html = _faktBild(s), karte = _newsCardHtmlM2(s, false, false, '');
      const pids = !b ? [] : [b.p, b.a, b.b].concat((b.r || []).map(x => x.p), b.halter || [], b.sieger || [],
        (b.traeger || []).map(x => x[0]), b.zweiter ? [b.zweiter.p] : []).filter(x => x && pm[x]);
      const f = [];
      if(b && b.f === 'duell'){
        const e = h2h.get([b.a, b.b].sort().join('|'));
        if(!e || (e.wins[b.a] || 0) !== b.wa || (e.wins[b.b] || 0) !== b.wb) f.push('Bilanz ' + b.wa + ':' + b.wb);
      }
      if(b && b.r){
        const held = [d.ambientPid].concat(d.ambientPids || []).filter(Boolean);
        if(held.length && !held.includes(b.r[0].p)) f.push('der Erste ist nicht der Held');
        if(b.r[0].w !== 1 || b.r.some((x, i) => i && x.w > b.r[i - 1].w + 1e-9)) f.push('Balken nicht absteigend');
      }
      if(b && b.f === 'zahl' && String(b.n) !== String(r.vv)) f.push('Zählwerk ' + b.n + ' statt ' + r.vv);
      if(b && b.f === 'vitrine' && (b.gesamt != null ? b.gesamt : b.hat.length) !== +r.vv) f.push('Vitrine ' + (b.gesamt != null ? b.gesamt : b.hat.length) + ' statt ' + r.vv);
      if(b && b.f === 'tafel' && b.alle - b.voll !== +r.vv) f.push('Tafel ' + (b.alle - b.voll) + ' statt ' + r.vv);
      if(b && b.f === 'platz' && 'Platz ' + b.platz !== r.vv) f.push('Platz ' + b.platz + ' statt ' + r.vv);
      out.push({k:t.key, f:b ? b.f : null, leiter:!!d.leiter, gezeichnet:!!html && karte.indexOf('class="ff ff-' + (b && b.f)) >= 0,
        namen:pids.filter(id => html.indexOf('>' + esc(pm[id].name) + '<') < 0).map(id => pm[id].name), fehler:f});
    });
  });
  return JSON.stringify(out);
})()`));
const _ffOhne = _ffB.filter(x => !x.err && !x.leiter && !x.f).map(x => x.k);
ok(_ffB.length > 30 && !_ffB.some(x => x.err) && _ffOhne.length === 0,
   'jede Fun-Fact-Vorlage trägt die Daten ihres Bilds', [...new Set(_ffOhne)].join(' ') || _ffB.filter(x => x.err).map(x => x.k + ': ' + x.err).join(' '));
ok(new Set(_ffB.map(x => x.f).filter(Boolean)).size >= 12,
   'und es sind mindestens zwölf verschiedene Bilder', [...new Set(_ffB.map(x => x.f))].join(' '));
const _ffFalsch = _ffB.filter(x => x.f && (!x.gezeichnet || x.namen.length || x.fehler.length));
ok(_ffFalsch.length === 0,
   'jedes Bild steht auf der Karte, nennt jeden Namen und passt zu seiner Quelle',
   _ffFalsch.slice(0, 4).map(x => x.k + ':' + x.f + (x.gezeichnet ? '' : ' nicht gezeichnet') + (x.namen.length ? ' ohne ' + x.namen.join(',') : '') + ' ' + x.fehler.join(',')).join(' | '));
// Die Pause trägt ihre Zahlen schon und zeichnet je Tag ein Feld.
const _ffPz = K.eval(`_faktBild({dataRef:{type:'dry_spell', daysSince:5, maxGapDays:9}})`);
ok((_ffPz.match(/class="still/g) || []).length === 5 && /pz-max/.test(_ffPz),
   'die Pause zeigt je stillen Tag ein Feld und die Marke der längsten Pause', _ffPz.slice(0, 200));
// Die Pause meldet sich erst nach fünf Tagen: ab drei stand an jedem
// Wochenende „3 Tage ohne Spiel" im Feed, weil werktags gespielt wird.
const _pause = JSON.parse(K.eval(`JSON.stringify((function(){
  const alt = matches, jetzt = Date.now();
  const mit = tage => { const l = alt.slice(-40), d = jetzt - tage * 864e5 - 3600e3 - mts(l[l.length - 1]);
    matches = l.map(m => Object.assign({}, m, {created_at:new Date(mts(m) + d).toISOString()}));
    invalidateCache(); const r = _buildStories().filter(s => (s.dataRef || {}).type === 'dry_spell').length;
    return r; };
  const r = {vier:mit(4), fuenf:mit(5)};
  matches = alt; invalidateCache();
  return r;
})())`));
ok(_pause.vier === 0 && _pause.fuenf === 1, 'die Pause meldet sich ab fünf Tagen, nicht schon nach einem Wochenende',
   JSON.stringify(_pause));
// Die Vitrine zählt jedes Mal: nach einigen Jahren hat jeder alle
// Auszeichnungen, und „41 verschiedene" hätte niemanden mehr getrennt.
const _vitrine = JSON.parse(K.eval(`JSON.stringify((function(){
  const t = _ambientTemplatePool(new Date(), pmap(), id => pname(id)).find(x => x.key === 'award_total_leader');
  const r = t && t.make();
  if(!r) return {fehlt:true};
  const b = r.dataRef.bild, summe = getCachedBadges(b.p).reduce((n, x) => n + x.count, 0);
  return {titel:r.title, gesamt:b.gesamt, summe, verschieden:getCachedBadges(b.p).length,
    html:_faktBild({dataRef:{type:'ambient', bild:b}})};
})())`));
ok(!_vitrine.fehlt && _vitrine.gesamt === _vitrine.summe && _vitrine.summe > _vitrine.verschieden
   && /die meisten Auszeichnungen/.test(_vitrine.titel) && _vitrine.html.indexOf('>' + _vitrine.summe + '<small> geholt') >= 0,
   'die Vitrine zählt jedes geholte Mal, auch wenn alle alles haben', _vitrine.titel + ' · ' + _vitrine.gesamt + '/' + _vitrine.summe);

console.log('\n=== 9. BREAKING: NUR DAS SELTENSTE ===');
// Breaking heisst: extrem seltene Auszeichnung oder echtes Ereignis. Ein
// Countdown gehoert nicht dazu — `season_endgame` („Noch 5 Tage") war zeitweise
// die EINZIGE Breaking-Karte im Feed und meldete dabei nichts, was passiert war.
const br = t => K.eval(`_isBreaking({dataRef:${JSON.stringify(t)}})`);
[['lead_change'],['streak_record'],['season_recap'],['season_endgame']]
  .forEach(([t]) => ok(br({type:t}) === true, 'Breaking: ' + t));
ok(br({type:'badge_unlocked', rarity:'legendary'}) === true, 'Breaking: legendaeres Badge');
ok(br({type:'insignium_stufe', oben:true}) === true, 'Breaking: Lorbeerreif und Ordensstern');
ok(br({type:'insignium_stufe', oben:false}) === false, 'die unteren Stufen sind kein Breaking');
// Dieselbe Stufe kann zweimal erreicht werden [§C34]; beim zweiten Mal
// bricht sie die Spalte nicht mehr.
ok(br({type:'insignium_stufe', oben:true, wieder:'2026-08-12'}) === false,
   'eine wieder getragene Stufe ist kein Breaking');
ok(br({type:'badge_unlocked', rarity:'rare'}) === false, 'ein seltenes Badge reicht nicht');
// In der Fuellphase der Ewigen Tafel wird JEDER Rekord zum ersten Mal
// vergeben: gemessen trugen elf der 18 Juni-Spieltage deshalb eine
// Breaking-Karte, immer den Tafel-Moment des Tages.
ok(br({type:'rekord_erstmals'}) === false,
   'ein erstmals vergebener Liga-Rekord ist kein Breaking');
// Die Karte bildet der Generator nicht mehr — der Bestwert steht als „Der
// hoechste Gipfel" in der Tafel. Persistierte Zeilen tragen den Typ weiter.
ok(br({type:'elo_record'}) === false, 'der Elo-Bestwert ist kein Breaking');
ok(br({type:'rekord_geholt'}) === false, 'ein Halterwechsel allein ist kein Breaking');

// ── Der Schlusssprint kommt nur bei offener Lage ──────────────────────
// „Noch 5 Tage" entstand an jedem der letzten sieben Tage einer Saison, egal
// wie klar die Sache war: gemessen stand die Karte auch bei 91 Elo Vorsprung
// da, und ihr Text erklaerte dann selbst, dass nichts mehr dazwischenkommt.
// Drei Bedingungen machen sie zum Ereignis — Frist, Abstand und eine
// belastbare Rangliste. Und ihr Zeitstempel ist die letzte Partie, nicht der
// Moment des Generatorlaufs.
const _sprint = JSON.parse(K.eval(`JSON.stringify((function(){
  const orig = getGlobalSim, ids = players.map(p => p.id);
  const sid = currentSeason().id;
  const bau = abstand => {
    const elo = {}, gespielt = {};
    ids.forEach((id, i) => { elo[id] = 1000 - (i === 0 ? 0 : abstand + i * 5);
      gespielt[id] = 20; });
    return {elo, seasonPlayed:{[sid]: gespielt}};
  };
  const hol = () => {
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    // CI startet diese Ableitung kalt. Ein schlanker Simulationsstand ohne
    // history muss deshalb genauso funktionieren wie ein warmer Cache.
    _cache._historyByMatchIdKey = null; _cache._historyByMatchId = null;
    return _buildStories().filter(s => (s.dataRef||{}).type === 'season_endgame');
  };
  try {
    getGlobalSim = () => bau(12);       const eng = hol();
    getGlobalSim = () => bau(60);       const weit = hol();
    const letzte = mts(matches[matches.length - 1]);
    return {eng: eng.length, weit: weit.length,
      tage: eng.length ? eng[0].dataRef.daysLeft : 0,
      abstand: eng.length ? eng[0].dataRef.gap : 0,
      breaking: eng.length ? _isBreaking(eng[0]) : false,
      amSpieltag: eng.length ? +new Date(eng[0].when) === letzte : false,
      grenze: SAISON_ENDSPURT_ELO, frei: _storyRangFrei(sid).frei};
  } finally {
    getGlobalSim = orig;
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(_sprint.frei && _sprint.eng === 1 && _sprint.tage <= 7,
   'bei offener Lage in den letzten sieben Tagen steht der Schlusssprint',
   JSON.stringify(_sprint));
ok(_sprint.weit === 0, 'bei klarem Vorsprung gar nicht',
   _sprint.weit + ' Karten bei 60 Elo Abstand, Grenze ' + _sprint.grenze);
ok(_sprint.breaking, 'und dann ist er Breaking');
ok(_sprint.amSpieltag,
   'sein Zeitstempel ist die letzte Partie, nicht der Moment des Laufs');

// ── Der Spitzenwechsel faellt nicht dem Anti-Spam-Deckel zum Opfer ────
// Der Deckel zaehlt Karten je Spieler, und die Sortierung davor ist die
// Zeit: wer am Nachmittag noch drei Karten bekommt, hat sein Budget
// aufgebraucht, bevor der Deckel die Karte vom Mittag ansieht. Gemessen
// kostete das den EINZIGEN Spitzenwechsel des Augusts — am 11.08. gab Leon
// die Tabelle an Martin ab, und die Titelrennen-Karte fiel aus, weil Martin
// an diesem Tag schon auf drei Karten stand. Was es je Tag genau einmal
// gibt, ist nicht das Rauschen, gegen das der Deckel geschrieben ist.
const _titelrennen = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice(), AlteDate = Date;
  const bis = new Date('2026-08-11T23:59:00').getTime();
  try {
    // Die Uhr steht mit: ohne sie laege der 11.08. ausserhalb des Fensters,
    // seine Partien haetten keine Karte und alles an ihnen fiele weg.
    Date = class extends AlteDate {
      constructor(...a){ if(a.length) super(...a); else super(bis); }
      static now(){ return bis; }
    };
    matches = alle.filter(m => mts(m) <= bis);
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const roh = _buildStories();
    const k = roh.filter(s => (s.dataRef||{}).type === 'lead_change');
    // Der Wechsel selbst steht in den Snapshots: vor der ersten Partie des
    // Tages fuehrte ein anderer als danach.
    const snaps = getRankSnapshots();
    const tg = _storyTagGrenzen(bis);
    const desTages = matchesInSeason(currentSeason().id)
      .filter(m => mts(m) >= tg.vonMs && mts(m) <= tg.letzte)
      .sort((a, b) => mts(a) - mts(b));
    const tops = [...new Set(desTages.map(m => (snaps[m.id]||{}).preTop1).filter(Boolean))];
    return {karten:k.length, tops:tops.length,
      breaking: k.length ? _isBreaking(k[0]) : false,
      wechsel: k.length ? k[0].dataRef.wechsel : 0,
      tag: k.length ? k[0].dataRef.dayKey : '',
      ereignisse: k.length ? (k[0].dataRef.events || []).length : 0,
      titel: k.length ? k[0].title : ''};
  } finally {
    Date = AlteDate; matches = alle; invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(_titelrennen.tops > 1, 'am 11.08. wechselt die Tabellenspitze wirklich',
   _titelrennen.tops + ' verschiedene Erste an diesem Tag');
ok(_titelrennen.karten === 1 && _titelrennen.tag === '2026-08-11',
   'und der Tag traegt genau eine Titelrennen-Karte',
   _titelrennen.karten + ' Karten: ' + _titelrennen.titel);
ok(_titelrennen.breaking, 'sie ist Breaking');
ok(_titelrennen.ereignisse === _titelrennen.wechsel && _titelrennen.ereignisse > 0,
   'und traegt jeden Wechsel des Tages als Ereignis',
   _titelrennen.ereignisse + ' von ' + _titelrennen.wechsel);

// ── Das Blatt zeigt jeden Wechsel, nicht nur den letzten ──────────────
// Der Kopf nennt den Stand am Ende des Tages. Wechselte die Spitze
// zwischendurch schon einmal, erfuhr das niemand: das Blatt zeigte genau
// dasselbe Paar noch einmal. Gebaut wird es deshalb aus denselben
// Ereignissen, aus denen die Karte entsteht. Bei genau einem Wechsel bleiben
// die Zeilen weg, sonst stuende er zweimal untereinander [§C33].
const _ldBlatt = JSON.parse(K.eval(`JSON.stringify((function(){
  const a = players[0].id, b = players[1].id, c = players[2].id;
  const ev = (nach, vor, iso, erg) => _storyEreignis({
    type:'lead_change', occurredAt:iso, actorIds:[nach, vor],
    subjectKey:'rang1', evidence:erg, detail:{vor:vor, nach:nach}});
  const mk = l => _newsDetailMitte({dataRef:{type:'lead_change', sid:currentSeason().id,
    newLeader:l[l.length - 1].detail.nach, prevLeader:l[0].detail.vor,
    matchId:null, events:l}});
  const eins = mk([ev(b, a, '2026-08-11T11:20:00', '10:6')]);
  const zwei = mk([ev(b, a, '2026-08-11T11:20:00', '10:6'),
                   ev(c, b, '2026-08-11T15:40:00', '10:8')]);
  const zaehl = h => (String(h).match(/rcp-zeile-n/g) || []).length;
  return {eins:zaehl(eins), zwei:zaehl(zwei),
    namen:[a, b, c].map(id => zwei.indexOf(pname(id)) >= 0),
    uhr:['11:20', '15:40'].map(u => zwei.indexOf(u) >= 0),
    ergebnis:['10:6', '10:8'].map(e => zwei.indexOf(e) >= 0)};
})())`));
ok(_ldBlatt.zwei === 2, 'das Blatt zeigt beide Wechsel eines Tages',
   _ldBlatt.zwei + ' Zeilen');
ok(_ldBlatt.eins === 0, 'bei einem Wechsel bleibt die Zeile weg',
   _ldBlatt.eins + ' Zeilen');
ok(_ldBlatt.namen.every(Boolean) && _ldBlatt.uhr.every(Boolean)
   && _ldBlatt.ergebnis.every(Boolean),
   'jede Zeile nennt Uhrzeit, Ergebnis, Nachfolger und Vorgaenger',
   JSON.stringify(_ldBlatt));

// Und dieselbe Strecke gebaut statt behauptet: in den echten 466 Partien
// wechselt die Spitze an keinem Spieltag zweimal. Der Tag wird deshalb
// gebaut — es gewinnt abwechselnd, bis die Tabelle zweimal gekippt ist —
// und dann muss die EINE Karte des Tages beide Wechsel tragen: als
// Ereignis im `dataRef` und als Zeile im Blatt.
const _ldZwei = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  try {
    const basis = mts(alle[alle.length - 1]);
    const sim0 = getGlobalSim();
    const rang = Object.keys(sim0.elo || {})
      .filter(pid => pmap()[pid] && !pmap()[pid].hidden)
      .map(pid => ({pid, elo:sim0.elo[pid]})).sort((a, b) => b.elo - a.elo);
    const erster = rang[0].pid, zweiter = rang[1].pid;
    const rest = rang.slice(2, 4).map(x => x.pid);
    // Die Elo kommt aus den persistierten Deltas: ohne sie bewegt sich die
    // Tabelle nicht, und das Szenario waere immer gruen.
    const partie = (i, sieger) => {
      const d = {};
      d[sieger] = 14; d[rest[0]] = 14;
      d[sieger === zweiter ? erster : zweiter] = -14; d[rest[1]] = -14;
      return {id:'ld' + i, a1:sieger, a2:rest[0],
        b1:(sieger === zweiter ? erster : zweiter), b2:rest[1],
        a1_side:'drive', a2_side:'reves', b1_side:'drive', b2_side:'reves',
        games_a:10, games_b:3, winner:'A', exp_a:0.5,
        created_at:new Date(basis + (i + 1) * 300000).toISOString(),
        deltas:d};
    };
    const dazu = [];
    let k = null;
    for(let i = 0; i < 80; i++){
      const sim = getGlobalSim();
      const oben = Object.keys(sim.elo || {})
        .filter(pid => pmap()[pid] && !pmap()[pid].hidden)
        .sort((x, y) => sim.elo[y] - sim.elo[x])[0];
      dazu.push(partie(i, oben === zweiter ? erster : zweiter));
      matches = alle.concat(dazu);
      invalidateCache();
      _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
      let l = []; try { l = _buildStories(); } catch(e){ l = []; }
      k = l.filter(x => (x.dataRef || {}).type === 'lead_change')[0] || null;
      if(k && (k.dataRef.wechsel || 0) >= 2) break;
    }
    if(!k) return {karten:0};
    const blatt = String(_newsDetailMitte(k) || '');
    const ev = k.dataRef.events || [];
    return {karten:1, wechsel:k.dataRef.wechsel || 0, ereignisse:ev.length,
      zeilen:(blatt.match(/rcp-zeile-n/g) || []).length,
      // Jedes Ereignis muss mit seiner eigenen Uhrzeit im Blatt stehen.
      uhren:ev.filter(e => blatt.indexOf(new Date(e.occurredAt)
        .toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})) >= 0).length,
      letzter:k.dataRef.newLeader === (ev.length
        ? ev[ev.length - 1].detail.nach : null)};
  } finally {
    matches = alle; invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(_ldZwei.karten === 1 && _ldZwei.wechsel >= 2,
   'ein Tag mit zwei Wechseln traegt eine Karte', JSON.stringify(_ldZwei));
ok(_ldZwei.ereignisse === _ldZwei.wechsel,
   'und darin jeden Wechsel als eigenes Ereignis',
   _ldZwei.ereignisse + ' von ' + _ldZwei.wechsel);
ok(_ldZwei.zeilen === _ldZwei.wechsel && _ldZwei.uhren === _ldZwei.ereignisse,
   'das Blatt zeigt jeden davon mit seiner Uhrzeit',
   _ldZwei.zeilen + ' Zeilen, ' + _ldZwei.uhren + ' Uhrzeiten');
ok(_ldZwei.letzter, 'der Kopf nennt den Ersten am Ende des Tages');
ok(br({type:'top_clash'}) === false, 'top_clash ist kein Breaking mehr');
ok(br({type:'giant_slayer'}) === false, 'giant_slayer ist kein Breaking mehr');
ok(br({type:'potd'}) === false, 'Alltag bleibt Alltag');

// Und die Liste ist geschlossen: gemessen ueber die 19 Spieltage vom 28.07.
// bis 26.08. traegt keine Karte des fertigen Feeds Breaking, deren Anlass
// nicht darauf steht. Eine Sammelkarte erbt es von ihren Teilen — Breaking
// wird also NACH dem Buendeln entschieden, sonst verloere ein erstmals
// vergebener Liga-Rekord seinen Rang, sobald er mit seinem Moment reist.
const _brkZu = JSON.parse(K.eval(`JSON.stringify((function(){
  const erlaubt = new Set(['lead_change','streak_record','season_recap',
    'season_endgame']);
  const anlass = d => erlaubt.has(d.type)
    || (d.type === 'badge_unlocked' && d.rarity === 'legendary')
    || (d.type === 'insignium_stufe' && !!d.oben && !d.wieder);
  const alle = matches.slice();
  const tage = [...new Set(alle.map(m => tagKey(mts(m))))].sort()
    .filter(t => t >= '2026-07-28' && t <= '2026-08-26');
  let brk = 0, fremd = [], geerbt = 0;
  tage.forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let r = []; try { r = _buildStories() || []; } catch(e){ return; }
    let f = []; try { f = _consolidateStories(r) || []; } catch(e){}
    f.filter(_isBreaking).forEach(x => {
      brk++;
      const d = x.dataRef || {};
      if(d.type === 'sammel'){
        const teile = d.teile || [];
        // Jede Zeile einer Sammelkarte traegt den dataRef ihrer Meldung in
        // „ref“. Ueber den Titel allein fand der Test die legendaere
        // Auszeichnung nicht, deren Zeile anders heisst als ihre Meldung
        // („Martin holt die legendaere Auszeichnung" gegen „Martin: Dominator").
        const titel = new Set(teile.map(z => z.titel));
        if(teile.some(z => anlass(z.ref || {}))
           || r.filter(y => titel.has(y.title)).some(y => anlass(y.dataRef || {}))) geerbt++;
        else fremd.push(x.title);
      } else if(!anlass(d)) fremd.push(x.title);
    });
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {brk, geerbt, fremd:[...new Set(fremd)]};
})())`));
ok(_brkZu.brk > 0, 'der Durchlauf trifft ueberhaupt Breaking-Karten',
   _brkZu.brk + ' Karten, ' + _brkZu.geerbt + ' davon gebuendelt');
ok(_brkZu.fremd.length === 0, 'keine Karte traegt Breaking ohne einen Anlass von der Liste',
   _brkZu.fremd.slice(0, 2).join(' | ') || 'keine');

// ── Der Takt einer Auszeichnung haengt an ihrer Klasse [§11.0c] ───────
// Eine Liste fuer alle drei Klassen war zu grob in beide Richtungen: sie
// liess legendaere Erfolge zwischen der zehnten und der fuenfundzwanzigsten
// Verleihung wegfallen, und eine gewoehnliche Auszeichnung war beim ersten
// Mal eine eigene Karte, obwohl sie in der Liga jeder holt, der lange genug
// dabei ist. Die kleinen Marken eines Tages stehen jetzt zusammen.
const _takt = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const einzel = roh.filter(s => (s.dataRef||{}).type === 'badge_unlocked');
  const sam = roh.filter(s => (s.dataRef||{}).type === 'badge_marken');
  const jeMatch = {};
  sam.forEach(s => { const mid = s.dataRef.matchId;
    if(mid) jeMatch[mid] = (jeMatch[mid]||0) + 1; });
  const marken = [].concat.apply([], sam.map(s => s.dataRef.marken || []));
  return {
    legendaerImmer: [1,2,3,7,13,26].every(n => _badgeTakt('legendary', n) === true),
    seltenMarken: [1,5,10,25,50,100].every(n => _badgeTakt('rare', n))
      && ![2,3,7,11].some(n => _badgeTakt('rare', n)),
    kleinOhneErstes: _badgeTakt('common', 1) === false
      && [5,10,25,50,100].every(n => _badgeTakt('common', n)),
    // Eine gewoehnliche Auszeichnung bekommt keine eigene Karte mehr; die
    // gewhitelisteten Sonderfaelle sind davon ausgenommen.
    einzelGewoehnlich: einzel.filter(s => rarityOf(s.dataRef.badgeId) === 'common'
      && !NEWS_BADGE_WHITELIST.has(s.dataRef.badgeId)).length,
    sammelKarten: sam.length,
    proMatchHoechstens1: Object.keys(jeMatch).every(k => jeMatch[k] === 1),
    // Ohne Partie nur am Tagesende und nur, was den Tag beschreibt.
    alleMitMatch: sam.every(s => !!s.dataRef.matchId
      || ((s.dataRef.causalKey||'').indexOf('awards') === 0
          && (s.dataRef.marken||[]).every(m => ['unbeatable','black_day','comeback_day','crash_day'].includes(m.badgeId)))),
    markenAufMarke: marken.every(m => NEWS_BADGE_MARKEN_KLEIN.indexOf(m.rang) >= 0),
    markenGewoehnlich: marken.every(m => rarityOf(m.badgeId) === 'common'),
    gruende: [...new Set(sam.map(s => (s.dataRef.causalKey||'').split(':')[0]))]
  };
})())`));
// Im Vierzehn-Tage-Fenster traegt jede dieser Karten gerade eine Marke, und
// damit waere die naechste Zusicherung vakuant. Gemessen wird sie deshalb
// ueber die Spieltage der Liga: dort fallen an einem Tag bis zu vier.
const _taktLauf = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const tage = [...new Set(alle.map(m => tagKey(mts(m))))].sort()
    .filter(t => t >= '2026-07-28' && t <= '2026-08-26');
  let karten = 0, mehrere = 0, falsch = 0, mehrfachMatch = 0;
  tage.forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let roh = []; try { roh = _buildStories() || []; } catch(e){ return; }
    const sam = roh.filter(s => (s.dataRef||{}).type === 'badge_marken');
    const jeMatch = {};
    sam.forEach(s => {
      karten++;
      const mid = s.dataRef.matchId;
      if(mid) jeMatch[mid] = (jeMatch[mid]||0) + 1;
      const m = s.dataRef.marken || [];
      if(m.length > 1) mehrere++;
      const soll = [...new Set(m.map(x => x.pid))].sort().join(',');
      // Ohne Partie nur, was den ganzen Tag beschreibt: es entsteht, wenn
      // der Tag zu ist, nicht in einer Partie.
      const tagesMarke = x => ['unbeatable','black_day','comeback_day','crash_day'].includes(x.badgeId);
      if((mid ? m.some(x => x.matchId !== mid) : !m.every(x => tagesMarke(x) && !x.matchId))
         || (s.dataRef.playerIds||[]).slice().sort().join(',') !== soll) falsch++;
    });
    mehrfachMatch += Object.keys(jeMatch).filter(k => jeMatch[k] > 1).length;
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {karten, mehrere, falsch, mehrfachMatch};
})())`));
ok(_taktLauf.karten > 0, 'der Durchlauf trifft kleine Marken aus konkreten Partien',
   _taktLauf.mehrere + ' von ' + _taktLauf.karten);
ok(_taktLauf.falsch === 0, 'und jede nennt jeden, von dem sie erzaehlt',
   _taktLauf.falsch + ' unvollstaendig');
ok(_taktLauf.mehrfachMatch === 0, 'nie zwei solche Karten an derselben Partie',
   _taktLauf.mehrfachMatch + ' Partien doppelt');
ok(_takt.legendaerImmer, 'eine legendaere Auszeichnung ist jedes Mal eine Nachricht');
ok(_takt.seltenMarken, 'eine seltene beim ersten Mal und an den runden Marken');
ok(_takt.kleinOhneErstes, 'eine gewoehnliche erst ab der fuenften Verleihung');
ok(_takt.einzelGewoehnlich === 0,
   'keine gewoehnliche Auszeichnung bekommt eine eigene Karte',
   _takt.einzelGewoehnlich + ' eigene Karten');
ok(_takt.sammelKarten > 0, 'die kleinen Marken eines Tages werden ueberhaupt gemeldet',
   _takt.sammelKarten + ' Karten');
ok(_takt.proMatchHoechstens1 && _takt.alleMitMatch
   && _takt.gruende.every(g => g === 'match' || g === 'awards') && _takt.gruende.indexOf('match') >= 0,
   'je Partie hoechstens EINE kleine Markenmeldung, fest an dieses Match gebunden — was den Tag beschreibt, an den Tag',
   JSON.stringify(_takt.gruende));
ok(_takt.markenAufMarke && _takt.markenGewoehnlich,
   'darin steht nur eine gewoehnliche Auszeichnung auf einer runden Marke');

const _alleVerleihungen = JSON.parse(K.eval(`JSON.stringify((function(){
  const earned=getBadgeEarnedCache(), ordinal={}, erwartet=[];
  const ab=Date.now()-7*86400000;
  const chron=[...matches].sort((a,b)=>mts(a)-mts(b));
  chron.forEach(m => (earned[m.id]||[]).forEach(e => {
    const k=e.playerId+'|'+e.badge.id, n=ordinal[k]=(ordinal[k]||0)+1;
    const rar=rarityOf(e.badge.id), wuerde=BADGE_WUERDE.has(e.badge.id);
    if(mts(m)<ab || !pmap()[e.playerId]) return;
    if((wuerde || _badgeTakt(rar,n))
       && (rar==='legendary' || rar==='rare' || NEWS_BADGE_WHITELIST.has(e.badge.id)))
      erwartet.push('badge_'+e.playerId+'_'+e.badge.id+'_'+m.id);
  }));
  const roh=_buildStories(), hat=new Set(roh.map(s=>s.id));
  return {n:erwartet.length, fehlen:erwartet.filter(id=>!hat.has(id))};
})())`));
ok(_alleVerleihungen.n>0 && _alleVerleihungen.fehlen.length===0,
   'der Generator behaelt alle newswuerdigen Auszeichnungsthemen jeder Partie',
   _alleVerleihungen.fehlen.join(', ') || _alleVerleihungen.n+' Verleihungen');

const _alteMarken = JSON.parse(K.eval(`JSON.stringify((function(){
  const p=matches.slice(-2), tag=tagKey(mts(p[1]));
  const ms=p.map((m,i)=>({pid:m.a1,badgeId:'nail_biter',name:'Zittersieg',rang:5+i*5,matchId:m.id}));
  const alt={id:'badgemarken_'+tag,title:'Zwei runde Marken',desc:'Zwei Auszeichnungen.',
    cat:'badge',prio:39,when:new Date(mts(p[1])),dataRef:{type:'badge_marken',tag,marken:ms}};
  const neu={id:'badgemarken_match_'+p[0].id,title:'Runde Marke',desc:'Eine Auszeichnung.',
    cat:'badge',prio:39,when:new Date(mts(p[0])),
    dataRef:{type:'badge_marken',matchId:p[0].id,marken:[ms[0]]}};
  const erg=m=>({id:'spiel_'+m.id,title:'Ergebnis',desc:'10:5.',cat:'highlight',prio:41,
    when:new Date(mts(m)),dataRef:{type:'spiel',matchId:m.id}});
  const vorher=_storyStableJson(alt), out=_consolidateStories([alt,neu].concat(p.map(erg)));
  const zeilen=out.flatMap(s=>(s.dataRef.teile||[]).filter(t=>t.typ==='badge_marken'));
  return {karten:out.length, zeilen:zeilen.length,
    richtig:zeilen.every(t=>t.ref.marken.every(m=>m.matchId===t.matchId)),
    quellen:zeilen.flatMap(t=>t.sourceIds||[]),altId:alt.id,neuId:neu.id,
    unveraendert:_storyStableJson(alt)===vorher};
})())`));
ok(_alteMarken.karten===2 && _alteMarken.zeilen===2 && _alteMarken.richtig
   && _alteMarken.quellen.includes(_alteMarken.altId)
   && _alteMarken.quellen.includes(_alteMarken.neuId) && _alteMarken.unveraendert,
   'alte Tagesmarken gehen verlustfrei in ihre Partien auf, identische neue Marken erscheinen nur einmal',
   JSON.stringify(_alteMarken));

console.log('\n=== 9b. DIE EWIGE TAFEL MELDET SICH ===');
// Der ganze Awards-Reiter kam im Feed nicht vor: wer einen Liga-Rekord
// uebernahm, eine Monatschronik holte oder eine Insignium-Stufe erreichte,
// erfuhr es nur, wenn er selbst nachsah.
const _tafel = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const typ = t => roh.filter(s => (s.dataRef||{}).type === t);
  const rek = roh.filter(s => ((s.dataRef||{}).type || '').indexOf('rekord_') === 0);
  const letzte = matches.length ? mts(matches[matches.length-1]) : 0;
  const tag0 = new Date(letzte); tag0.setHours(0,0,0,0);
  const vor = tag0.getTime() - 1;
  // Jede Stufe, die sich am letzten Spieltag bewegt hat, nach oben wie nach
  // unten, steht als Bewegung auf der Insignium-Karte dieses Tages.
  const insErwartet = players.filter(p => ligaAktiv(p))
    .filter(p => prestigeOf(p.id).stufe !== prestigeOf(p.id, vor).stufe).length;
  const insKarte = typ('insignium_tag').filter(s => !s.dataRef.schluss)[0] || null;
  return {
    rekorde: rek.length,
    ausbau: typ('rekord_gesteigert').length,
    // Ein Rekord ist nur dann eine Meldung, wenn sich die ANGEZEIGTE Zahl
    // aendert. Sonst stand neunmal „X baut seinen Rekord aus" mit derselben
    // Zahl wie vorher.
    ausbauStumm: typ('rekord_gesteigert').filter(s => {
      const d = s.dataRef || {}; return !d.ev; }).length,
    kammer: rek.every(s => (s.dataRef||{}).kammer !== 'shame'),
    kat: rek.every(s => s.cat === 'tafel'),
    gesichter: rek.every(s => _newsPids(s).length > 0),
    insignium: insKarte ? insKarte.dataRef.zuege.filter(z => z.art !== 'grad').length : 0, insErwartet,
    insGesicht: typ('insignium_tag').every(s => _newsPids(s).length > 0),
    // Die Karte eines Wochenschlusses (schluss) gehoert keinem Spieltag.
    insEine: typ('insignium_tag').filter(s => !s.dataRef.schluss).length <= 1 && typ('insignium_stufe').length === 0,
    // Jede neue Karte nennt eine Zahl und bleibt ohne Platzhalter.
    sauber: roh.filter(s => s.cat === 'tafel').every(s => {
      const txt = (s.title || '') + ' ' + (s.desc || '');
      const hatZahl = txt.split('').some(c => c >= '0' && c <= '9');
      return hatZahl && txt.indexOf('undefined') < 0 && txt.indexOf('NaN') < 0
          && txt.indexOf('[object') < 0;
    })
  };
})())`));
ok(_tafel.rekorde > 0, 'ein Halterwechsel wird gemeldet', _tafel.rekorde + ' Rekord-Karten');
ok(_tafel.ausbauStumm === 0, 'nur sichtbar verbesserte Rekorde werden als „ausgebaut" gemeldet',
   _tafel.ausbauStumm + ' ohne sichtbare Aenderung');

// ── Ein Spieltag, ein Paar von Staenden [§11.0e] ──────────────────────
// Rekord, Monatschronik und Insignium rechneten sich ihre Tagesgrenze und
// ihren Zeitschnitt jeder selbst aus. Drei Rechnungen ueber dieselbe
// Aenderung nennen irgendwann drei Zahlen, und die stehen dann auf drei
// Karten derselben Minute. `_storyTagGrenzen` und `_storyStand` sind die
// eine Wahrheit dazwischen, `_prestigeWirkung` ihr Unterschied.
const _tagRahmen = JSON.parse(K.eval(`JSON.stringify((function(){
  const letzte = matches.length ? mts(matches[matches.length-1]) : 0;
  const tg = _storyTagGrenzen(letzte);
  const vor = _storyStand(tg.vorMs), nach = _storyStand(tg.nachMs);
  const tagPartien = matches.filter(m => mts(m) >= tg.vonMs && mts(m) <= tg.vonMs + 864e5 - 1).length;
  const aktive = players.filter(p => p && !p.hidden);
  const w = {};
  aktive.forEach(p => { w[p.id] = _prestigeWirkung(p.id, vor, nach); });
  return {
    // Der juengste Spieltag reicht bis zum Ende seines Tages. Solange danach
    // nichts zugegangen ist — keine Woche, kein Monat —, ist das „jetzt": ein
    // Schnitt dort schneidet nichts ab und kostet nur eine kalte Rechnung [§3].
    // Bis eine Sekunde vor Mitternacht: um 23:59:59 schliesst der Monat.
    nachOhneSchnitt: tg.nachMs === tg.vonMs + 864e5 - 1001 && _schnitt(tg.nachMs) === undefined
      && tg.istHeute === true,
    // Ab Mitternacht selbst: dort schliesst die Woche.
    grenze: tg.vorMs === tg.vonMs && tg.tag === tagKey(tg.vonMs),
    partien: tg.partien === tagPartien,
    // Die Wirkung erfindet keine Punkte. Dass die Insignium-Karten eines
    // Laufs genau die gekreuzten Stufen sind, misst die Probe insErwartet
    // weiter oben schon — ein zweites Mass fuer dieselbe Aussage waere eins
    // zu viel [§C27]. (Kein Backtick in diesem Kommentar: er steht in einer
    // Template-Zeichenkette und wuerde sie beenden.)
    summe: aktive.every(p => w[p.id].vor + w[p.id].delta === w[p.id].nach)
  };
})())`));
ok(_tagRahmen.nachOhneSchnitt, 'der juengste Spieltag vergleicht bis zum Ende seines Tages, und das ist „jetzt", solange danach nichts zugegangen ist');
ok(_tagRahmen.grenze, 'Vorher ist Mitternacht, nach dem Schluss der Woche, und der Tagesschluessel gehoert dazu');
ok(_tagRahmen.partien, 'der Rahmen zaehlt die Partien seines Tages');
ok(_tagRahmen.summe, 'die Punktewirkung erfindet keine Punkte');

// ── Eine Tafel-Karte je Spieltag, und ihr Grund steht darin ───────────
// Gebuendelt wurde nach Partie ODER Minute. Das ist ein Stellvertreter, und
// er traf daneben: gemessen ueber die 19 Spieltage vom 28.07. bis 26.08.
// stand am 29.07. eine zweite Tafel-Karte neben der ersten, weil eine
// Insignium-Stufe eine andere Minute trug als die Rekorde desselben Tages.
// Zwei Karten „X bewegen die Ewige Tafel" an einem Tag sind eine Nachricht
// und eine Wiederholung [§C33]. Der Grund gehoert deshalb in die Karte.
const _tafelGrund = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const arten = ['rekord_erstmals','rekord_geholt','rekord_gesteigert',
                 'insignium_stufe','chronik_geholt'];
  const tage = [...new Set(alle.map(m => tagKey(mts(m))))].sort()
    .filter(t => t >= '2026-07-28' && t <= '2026-08-26');
  let ohneGrund = 0, meldungen = 0, mehrfach = [], gemessen = 0;
  let mitForm = 0, beide = 0, falscheAchse = 0;
  tage.forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let roh = []; try { roh = _buildStories() || []; } catch(e){ return; }
    const tafel = roh.filter(s => arten.indexOf((s.dataRef||{}).type) >= 0);
    if(!tafel.length) return;
    gemessen++;
    meldungen += tafel.length;
    ohneGrund += tafel.filter(s => !(s.dataRef||{}).causalKey).length;
    let fertig = []; try { fertig = _consolidateStories(roh) || []; } catch(e){}
    const karten = fertig.filter(s => s.cat === 'tafel' && tagKey(s.when) === t);
    // Zwei Achsen, zwei Karten: die dauerhafte Tafel und die kurze Strecke
    // erzaehlen etwas anderes [§C35]. Je Achse aber nur eine, und ihre
    // Schlagzeilen muessen sich unterscheiden — gemessen trugen 13 von 19
    // Spieltagen sonst zweimal „... bewegen die Ewige Tafel".
    // Der Schluss einer Woche ist eine eigene Achse: seine Zeichen-Karte
    // steht um Mitternacht vor dem ersten Spieltag der neuen Woche und
    // erzaehlt, was der Schluss vergab, nicht was an diesem Tag gespielt
    // wurde [§11.0e]. Gemessen hob er am 24.08. Jane auf den Volutenkranz,
    // waehrend Stefan am Nachmittag selbst aufstieg — zwei Ereignisse.
    const jeAchse = {};
    karten.forEach(s => {
      const d = s.dataRef || {};
      const q = (d.quelle || d.type) + (d.schluss ? ':' + d.schluss : '');
      jeAchse[q] = (jeAchse[q] || 0) + 1;
    });
    const doppelt = Object.keys(jeAchse).filter(q => jeAchse[q] > 1);
    const titel = karten.map(s => s.title);
    if(doppelt.length || new Set(titel).size !== titel.length)
      mehrfach.push(t + ': ' + titel.join(' | '));
    if(jeAchse.form) mitForm++;
    if(jeAchse.form && jeAchse.tafel) beide++;
    // Auf der Form-Achse steht nur, was auf einem gleitenden Fenster liegt.
    tafel.filter(s => String((s.dataRef||{}).causalKey || '').indexOf('form:') === 0)
      .forEach(s => {
        const def = CHRONICLE_BY_ID[(s.dataRef||{}).rekordId];
        if(!def || !def.fenster) falscheAchse++;
      });
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {tage:tage.length, gemessen, meldungen, ohneGrund, mehrfach,
          mitForm, beide, falscheAchse};
})())`));
console.log('  Spieltage 28.07.-26.08.: ' + _tafelGrund.tage + ' · mit Tafel-Meldung: '
  + _tafelGrund.gemessen + ' · Meldungen: ' + _tafelGrund.meldungen);
// Ohne diese Probe waere die naechste vakuant.
ok(_tafelGrund.meldungen >= 100, 'der Durchlauf trifft ueberhaupt Tafel-Meldungen',
   _tafelGrund.meldungen + ' Meldungen an ' + _tafelGrund.gemessen + ' Spieltagen');
ok(_tafelGrund.ohneGrund === 0, 'jede Tafel-Meldung nennt ihren Grund',
   _tafelGrund.ohneGrund + ' ohne causalKey');
ok(_tafelGrund.mehrfach.length === 0,
   'je Achse eine Tafel-Karte, und keine zwei mit derselben Schlagzeile',
   _tafelGrund.mehrfach.slice(0, 2).join(' || ') || 'keine Doppelung');
ok(_tafelGrund.beide === 0 && _tafelGrund.mitForm === 0,
   'dauerhafte und kurze Rekorde stehen in genau einer Tafel-Karte des Tages',
   _tafelGrund.gemessen + ' Spieltage geprueft');
ok(_tafelGrund.falscheAchse === 0,
   'und auf ihr steht nur, was auf einem gleitenden Fenster liegt',
   _tafelGrund.falscheAchse + ' daneben');

// ── Ein gleitendes Fenster wird nicht „ausgebaut" [§C33] ──────────────
// Der Wert einer Laufbahn steigt, weil jemand besser gespielt hat; der Wert
// eines Fensters steigt auch dann, wenn am hinteren Ende ein schwaches
// Ergebnis herausfaellt. Dieselbe Begruendung wie beim Verschlechtern: wer
// nichts getan hat, hat nichts getan.
// Gemessen wird ueber jeden vierten Spieltag der Ligageschichte und nicht am
// festen Zeitpunkt: dort faellt zufaellig gerade keine Ausbau-Karte, und die
// Zusicherung war damit gruen, auch als die Regel ganz fehlte.
const _fenAus = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const tage = [...new Set(alle.map(m => mdayKey(m)))].sort();
  const ausbau = [], fenster = [], sprache = [];
  // Derselbe Durchlauf liest jede Schlagzeile und jeden Satz: Einzahl bei
  // eins („Aus 10 Partien sind 1 Siege geworden"), ein Minus als
  // Bindestrich („-2 statt 178 Elo") und Platzhalter.
  const SPR = [/(?<![\\d.,:−-])\\b1 (?:Siege|Partien|Niederlagen|Tore|Duelle|Tage|Wochen|Spieltage|Plätze|Auszeichnungen|Spiele)\\b/,
    /(?:^|[\\s(])-\\d/, /undefined|NaN|\\bnull\\b/,
    // Eine Partie heißt Partie („feiert das 100. Spiel", „Tage ohne Spiel"),
    // die Redensart „im Spiel bleiben" ausgenommen, und Prozent steht mit
    // Leerzeichen.
    /(?<!im )\\bSpiel(?:e|en|s)?\\b/, /\\d%/];
  tage.filter((t, i) => i % 4 === 0 || i % 4 === 2).forEach((tag, nr) => {
    matches = alle.filter(m => mdayKey(m) <= tag);
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let roh = []; try { roh = _buildStories() || []; } catch(e){ return; }
    roh.forEach(s => [s.title, s.desc].forEach(t => { if(t && SPR.some(r => r.test(String(t)))) sprache.push(tag + ' ' + s.id + ': ' + t); }));
    if(nr % 2) return;
    roh.forEach(s => {
      const d = s.dataRef || {};
      if(d.type !== 'rekord_gesteigert') return;
      ausbau.push(d.rekordId);
      if((CHRONICLE_BY_ID[d.rekordId] || {}).fenster) fenster.push(s.title);
    });
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {ausbau:ausbau.length, arten:[...new Set(ausbau)].length,
          fenster:[...new Set(fenster)], sprache:[...new Set(sprache.map(x => x.replace(/^\\S+ /, '')))],
          katalog:CHRONICLES.filter(c => c.fenster).map(c => c.id)};
})())`));
console.log('  Ausbau-Karten im Durchlauf: ' + _fenAus.ausbau + ' aus ' + _fenAus.arten + ' Rekorden'
  + ' · Fenster im Katalog: ' + _fenAus.katalog.join(', '));
ok(_fenAus.katalog.length >= 3, 'die gleitenden Fenster stehen im Katalog',
   _fenAus.katalog.join(', ') || 'keins');
// Ohne diese Probe waere die naechste vakuant: sie prueft eine Teilmenge.
ok(_fenAus.ausbau >= 10, 'der Durchlauf trifft ueberhaupt Ausbau-Karten',
   _fenAus.ausbau + ' Karten');
ok(_fenAus.fenster.length === 0, 'kein gleitendes Fenster meldet ein Ausbauen',
   _fenAus.fenster.slice(0, 3).join(' | ') || _fenAus.ausbau + ' Ausbau-Karten, keine davon');
ok(_fenAus.sprache.length === 0, 'über jeden zweiten Spieltag der Ligageschichte: Einzahl bei eins, kein Bindestrich als Minus, kein Platzhalter, Partie statt Spiel, Prozent mit Leerzeichen',
   _fenAus.sprache.slice(0, 3).join(' | ') || 'jede Meldung sauber');
ok(_tafel.kammer, 'Schattenseiten meldet der Feed nicht');
ok(_tafel.kat, 'Rekorde stehen in der Kammer „Ewige Tafel"');
ok(_tafel.gesichter, 'jede Rekordkarte zeigt ihren Halter [§C33]');
ok(_tafel.insignium === _tafel.insErwartet,
   'genau jeder echte Insignium-Uebergang wird gemeldet',
   _tafel.insignium + ' von ' + _tafel.insErwartet);
ok(_tafel.insGesicht, 'die Insignium-Karte zeigt den Traeger');
ok(_tafel.insEine, 'die Leiter hat eine Karte je Spieltag und keine Einzelzeilen mehr');
ok(_tafel.sauber, 'jede Tafel-Karte nennt eine Zahl und traegt keinen Platzhalter');

// Ein grosser Sprung darf keine Stufe ueberspringen. Der fachliche Zeitpunkt
// ist die erste Partie, deren historischer Prestige-Stand die Schwelle traegt;
// derselbe Lauf muss danach dieselben stabilen IDs und Zeiten liefern.
const _insHistorisch = JSON.parse(K.eval(`JSON.stringify((function(){
  const original = prestigeOf;
  const pid = players[0].id;
  const letzte = mts(matches[matches.length-1]);
  const t0 = new Date(letzte); t0.setHours(0,0,0,0);
  const tag = matches.filter(m => mts(m) >= t0.getTime()).sort((a,b)=>mts(a)-mts(b));
  const kreuz = mts(tag[Math.min(1, tag.length-1)] || matches[matches.length-1]);
  const stand = stufe => ({pid, punkte:stufe >= 2 ? 760 : stufe ? 260 : 100, stufe,
    insignie:INSIGNIEN[stufe], naechste:INSIGNIEN[stufe+1] || null,
    fehlt:stufe >= 2 ? 920 : stufe ? 460 : 140,
    teile:{leistung:120,auszeichnung:80,monat:40,rekord:20},
    zahlen:{leistung:1,auszeichnung:1,monat:1,rekord:1}, quellen:[], platz:1, von:players.length});
  try {
    prestigeOf = (id, bisMs) => id !== pid ? original(id, bisMs)
      : stand((bisMs != null && bisMs < kreuz) ? 0 : 2);
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const lauf = () => { _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
      return _buildStories().filter(s => (s.dataRef||{}).type === 'insignium_tag' && !s.dataRef.schluss); };
    const a = lauf(), b = lauf();
    const z = a.length ? (a[0].dataRef.zuege || []).find(x => x.pid === pid) : null;
    return {n:a.length, art:z && z.art, von:z && z.vor.stufe, nach:z && z.nach.stufe, zeit:z && z.ms,
      ids:a.map(s => s.id), gleich:JSON.stringify(a.map(s => [s.id, +new Date(s.when), s.title]))
        === JSON.stringify(b.map(s => [s.id, +new Date(s.when), s.title])), kreuz};
  } finally { prestigeOf = original; _cache._buildStoriesKey = null; _cache._buildStoriesResult = null; }
})())`));
ok(_insHistorisch.n === 1 && _insHistorisch.art === 'auf' && _insHistorisch.von === 0 && _insHistorisch.nach === 2,
   'ein Sprung über zwei Stufen ist EINE Bewegung von der alten zur neuen Stufe', JSON.stringify(_insHistorisch));
ok(_insHistorisch.zeit === _insHistorisch.kreuz,
   'die Bewegung trägt die Partie, an der die neue Stufe zuerst stand');
ok(_insHistorisch.gleich && new Set(_insHistorisch.ids).size === _insHistorisch.ids.length,
   'erneute Generatorlaeufe bleiben idempotent', _insHistorisch.ids.join(', '));

// ── Erstmals erreicht oder wieder getragen ────────────────────────────
// Prestige aus Liga-Rekorden wird unter den Haltern geteilt und faellt mit
// einem verlorenen Bestwert wieder [§C34]: dieselbe Stufe kann zweimal
// erreicht werden, und beide Male stand „X traegt den Volutenkranz" da, als
// waere es das erste Mal. Der Beleg ist der hoechste Platz davor aus dem
// Bestand (das best der letzten Insignium-Karte); ohne Beleg heisst es
// „erreicht", nie „zum ersten Mal".
//
// Dazu die Regel gegen das Hin und Her: ein Grad steht nur da, wenn er so
// hoch noch nie stand. Gemessen pendelte ein Spieler drei Spieltage in Folge
// zwischen Zierkranz III und Lorbeerreif I, und an fast jedem Spieltag
// gingen zwei bis sechs Grade hin und her.
const _insLeiter = JSON.parse(K.eval(`JSON.stringify((function(){
  const original = prestigeOf, bestand = _cache._stories;
  const pid = players[0].id;
  const letzte = mts(matches[matches.length-1]);
  const t0 = new Date(letzte); t0.setHours(0,0,0,0);
  const tag = matches.filter(m => mts(m) >= t0.getTime()).sort((a,b)=>mts(a)-mts(b));
  const kreuz = mts(tag[Math.min(1, tag.length-1)] || matches[matches.length-1]);
  const stand = (stufe, grad) => ({pid, punkte:insigniumGradSchwellen(stufe)[grad || 0] + 10, stufe, grad:grad || 0,
    insignie:INSIGNIEN[stufe], naechste:INSIGNIEN[stufe+1] || null, fehlt:100,
    teile:{auszeichnung:80, monat:40, rekord:20}, zahlen:{auszeichnung:1, monat:1, rekord:1},
    quellen:[], platz:1, von:players.length});
  const reihe = (vor, nach) => (id, bisMs) => id !== pid ? original(id, bisMs)
    : (bisMs != null && bisMs < kreuz) ? stand(vor[0], vor[1]) : stand(nach[0], nach[1]);
  const alt = best => { const b = {}; b[pid] = best;
    return [{id:'instag_2026-08-12', when:new Date(2026, 7, 12, 20),
      dataRef:{type:'insignium_tag', tag:'2026-08-12', best:b, zuege:[]}}]; };
  const lauf = (f, bst) => {
    prestigeOf = f; _cache._stories = bst;
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const k = _buildStories().find(s => (s.dataRef||{}).type === 'insignium_tag');
    return (k && (k.dataRef.zuege || []).find(z => z.pid === pid)) || null;
  };
  try {
    const erst = lauf(reihe([0, 0], [2, 0]), []);
    const wieder = lauf(reihe([0, 0], [2, 0]), alt(2 * INSIGNIUM_GRADE + 1));
    // Derselbe Grad, schon einmal erreicht: keine Bewegung. Ein neuer: eine.
    const gradAlt = lauf(reihe([1, 0], [1, 2]), alt(1 * INSIGNIUM_GRADE + 2));
    const gradNeu = lauf(reihe([1, 0], [1, 2]), alt(1 * INSIGNIUM_GRADE + 1));
    // Ein Grad nach unten in derselben Stufe ist das Hin und Her; eine Stufe
    // nach unten ist ein Rückfall und steht da.
    const gradAb = lauf(reihe([1, 2], [1, 0]), alt(1 * INSIGNIUM_GRADE + 2));
    const ab = lauf(reihe([2, 0], [1, 2]), alt(2 * INSIGNIUM_GRADE));
    return {
      erst: !!erst && erst.art === 'auf' && !erst.wieder,
      erstTitel: erst ? _insTagTexte([erst]).title : '',
      wieder: !!wieder && wieder.wieder,
      wiederTitel: wieder ? _insTagTexte([wieder]).title : '',
      gradAlt: gradAlt ? gradAlt.art : null, gradNeu: gradNeu ? gradNeu.art : null,
      gradNeuTitel: gradNeu ? _insTagTexte([gradNeu]).title : '',
      gradAb: gradAb ? gradAb.art : null,
      ab: ab ? ab.art : null, abTitel: ab ? _insTagTexte([ab]).title : '',
      abNeg: _newsIstNegativ({dataRef:{type:'insignium_tag', zuege:[{art:'ab'}]}}),
      mischNeg: _newsIstNegativ({dataRef:{type:'insignium_tag', zuege:[{art:'auf'}, {art:'ab'}]}})
    };
  } finally {
    prestigeOf = original; _cache._stories = bestand;
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(_insLeiter.erst && / erreicht den Volutenkranz$/.test(_insLeiter.erstTitel),
   'ohne Beleg für einen früheren Platz so hoch heißt es „erreicht", ohne „wieder" und ohne „zum ersten Mal"', _insLeiter.erstTitel);
ok(_insLeiter.wieder && / trägt wieder den Volutenkranz$/.test(_insLeiter.wiederTitel),
   'stand der Spieler schon einmal so hoch, trägt er die Stufe wieder', _insLeiter.wiederTitel);
ok(_insLeiter.gradAlt === null && _insLeiter.gradNeu === 'grad'
   && / steigt auf Schildring III$/.test(_insLeiter.gradNeuTitel),
   'ein Grad steht nur da, wenn der Spieler so hoch noch nie stand',
   JSON.stringify({alt:_insLeiter.gradAlt, neu:_insLeiter.gradNeu, titel:_insLeiter.gradNeuTitel}));
ok(_insLeiter.gradAb === null && _insLeiter.ab === 'ab'
   && / fällt auf den Schildring zurück$/.test(_insLeiter.abTitel),
   'ein Grad nach unten bleibt still, eine verlorene Stufe steht als Rückfall da',
   JSON.stringify({gradAb:_insLeiter.gradAb, ab:_insLeiter.ab, titel:_insLeiter.abTitel}));
ok(_insLeiter.abNeg && !_insLeiter.mischNeg,
   'eine Karte nur aus Rückfällen hat die Richtung nach unten, eine gemischte nicht');

// ── Ein Ruheständler steht nicht auf der Leiter des Tages [§C40] ────────
// Die Leiter ist ein Laufbahn-Vergleich (`ligaAktiv`). Und auch nicht im
// gespeicherten höchsten Platz: stuende er dort, naehme das Tor nach dem
// Abschied jede spaetere Insignium-Karte aus dem Feed, weil sie seinen
// Namen traegt.
const _insRuhe = JSON.parse(K.eval(`JSON.stringify((function(){
  const p = players[1], vorher = p.retired_at;
  try {
    p.retired_at = new Date(mts(matches[0]) - 1000).toISOString();
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const k = _buildStories().find(s => (s.dataRef||{}).type === 'insignium_tag');
    const text = k ? JSON.stringify(k.dataRef) : '';
    // Auch nicht aus einer älteren Karte, die ihn noch trug.
    const alt = {}; alt[p.id] = 5; alt[players[0].id] = 4;
    const kette = _insBestVor(Date.now(), [{id:'instag_2000-01-01', when:new Date(2000, 0, 1),
      dataRef:{type:'insignium_tag', tag:'2000-01-01', best:alt, zuege:[]}}]);
    return {karte:!!k, drin:text.indexOf(p.id) >= 0,
      best:_insBestVor(Date.now(), []).hasOwnProperty(p.id) || kette.hasOwnProperty(p.id),
      andere:kette[players[0].id] === 4};
  } finally {
    p.retired_at = vorher; invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(!_insRuhe.drin && !_insRuhe.best && _insRuhe.andere,
   'ein Ruheständler steht weder als Bewegung noch im höchsten Platz auf der Insignium-Karte',
   JSON.stringify(_insRuhe));

console.log('\n=== 9c. STORY-BLAETTER BLEIBEN BEI IHRER GESCHICHTE ===');
// Story-Blätter zeigen ihren gesamten Beleg direkt. Zusätzliche Wege in
// Rückblicke und Spielerprofile verdoppeln nur die Navigation und sind dort
// bewusst entfernt. Gerade POTD darf dabei keine Partie abschneiden.
const _rueck = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const einer = t => roh.find(s => (s.dataRef||{}).type === t) || null;
  const body = s => { try { return s ? _newsDetailBody(s) : ''; } catch(e){ return 'FEHLER ' + e.message; } };
  // Der Wochenrueckblick steht als EINE Karte am Sonntag um 23:59:05, fuenf
  // Sekunden nach dem Spieler des Tages. Spieler der Woche, Team der Woche
  // und die vier Superlative sind ihre Zeilen, keine eigenen Karten mehr.
  const wo = einer('woche');
  const teile = wo ? ((wo.dataRef||{}).teile || []) : [];
  const tw = teile.find(t => t.art === 'team') || null;
  const potd = einer('potd');
  const pd = potd ? (potd.dataRef||{}) : {};
  const pids = (Array.isArray(pd.playerIds) && pd.playerIds.length) ? pd.playerIds : [pd.playerId];
  const potdBody = body(potd);
  const alleBodies = roh.map(body).join('');
  return {
    keineProfile: alleBodies.indexOf('Profil von ') < 0,
    keineRueckblicke: alleBodies.indexOf('data-recap=') < 0 && alleBodies.indexOf('Rückblick öffnen') < 0,
    hatPotd: !!potd,
    potdErwartet: potd ? _newsTagPartien(pd.dayKey, pids).length : 0,
    // Die Partien stehen als BAHN und als kurze Zeile, nicht als voller
    // Vs-Block: zehn Bloecke sind vierzig Wappen und eine Wand [§6].
    potdGezeigt: (potdBody.match(/class="nd-tm /g)||[]).length,
    potdBahn: (potdBody.match(/class="nd-bahn"/g)||[]).length,
    hatWoche: !!wo,
    wocheStunde: wo ? new Date(wo.when).getHours() : -1,
    wocheZeit: wo ? new Date(wo.when).toTimeString().slice(0, 8) : '',
    wocheTag: wo ? new Date(wo.when).getDay() : -1,
    wocheTeile: teile.length,
    wocheArten: teile.map(t => t.art),
    wocheGesicht: wo ? _newsPids(wo).length : 0,
    teamWoche: !!tw,
    // Das Duo kommt aus derselben Rechnung wie der Teams-Tab.
    teamWocheGesicht: tw ? (tw.pids||[]).length : 0
  };
})())`));
ok(_rueck.keineProfile, 'kein Story-Blatt trägt einen Profil-Button');
ok(_rueck.keineRueckblicke, 'kein Story-Blatt trägt einen Rückblick-Button');
ok(!_rueck.hatPotd || _rueck.potdGezeigt === _rueck.potdErwartet,
   'Spieler des Tages zeigt ausnahmslos alle Partien', _rueck.potdGezeigt + ' von ' + _rueck.potdErwartet);
ok(!_rueck.hatPotd || _rueck.potdBahn === 1,
   'und den Tag als Bahn darueber', String(_rueck.potdBahn));
ok(_rueck.hatWoche, 'der Wochenrueckblick steht als eine Karte');
ok(!_rueck.hatWoche || _rueck.wocheTag === 0, 'die Wochenkarte steht am Sonntag', _rueck.wocheTag);
// Um 23:00 stand sie vor dem Spieler des Sonntags (23:59): der Abschluss
// eines Tages ueber dem der ganzen Woche.
ok(!_rueck.hatWoche || _rueck.wocheZeit === '23:59:05', 'die Wochenkarte steht um 23:59:05, nach dem Spieler des Tages', _rueck.wocheZeit);
ok(!_rueck.hatWoche || _rueck.wocheTeile >= 2, 'sie traegt mehrere Wertungen',
   _rueck.wocheTeile + ': ' + _rueck.wocheArten.join(', '));
ok(!_rueck.hatWoche || _rueck.wocheGesicht > 0, 'die Wochenkarte zeigt ein Gesicht [§C33]', _rueck.wocheGesicht);
ok(_rueck.teamWoche, 'das Team der Woche ist eine ihrer Zeilen');
ok(!_rueck.teamWoche || _rueck.teamWocheGesicht === 2, 'das Team der Woche zeigt beide Gesichter [§C33]',
   _rueck.teamWocheGesicht + '');

console.log('\n=== 10. DER FEED [§C33] ===');
// Der Feed war die einzige Ansicht der App, in der ein Spieler nur ein Name
// war — kein Gesicht, kein Wappen. Und er trug elf Kategoriefarben, in denen
// Gold nichts Besonderes mehr hiess. Diese vier Zusicherungen halten beides.
const _feed = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null;
  const sichtbar = getStoriesCache();
  // Eine Partie-Karte ist keine Wiederholung: jede Partie bekommt ihre Karte,
  // und neun Partien an einem Tag sind neun Ereignisse. Die Regeln gegen
  // Wiederholung fragen nach dem Gegenteil und lassen sie deshalb in Ruhe.
  const _prt = s => { const d=(s&&s.dataRef)||{};
    return d.type==='spiel' || (d.type==='sammel' && d.quelle==='spiel' && !!d.matchId); };
  const ohnePartie = sichtbar.filter(s => !_prt(s));
  const zaehl = {}, proTag = {};
  // Die Ehrung einer Woche oder eines Monats zaehlt fuer sich: es gibt sie
  // je Zeitraum genau einmal, neben den Ehrungen der Runden [§11.6f].
  sichtbar.forEach(s => { const t=(s.dataRef&&s.dataRef.type)==='ehrung'&&s.dataRef.periode
      ? 'ehrung_'+s.dataRef.periode : (s.dataRef&&s.dataRef.type)||'-';
    zaehl[t]=(zaehl[t]||0)+1;
    const k=t+'|'+tagKey(s.when); proTag[k]=(proTag[k]||0)+1; });
  return {
    roh: roh.length, sichtbar: sichtbar.length,
    // Gemessen wird die Verteilung ueber die EREIGNISSE, nicht ueber die
    // Karten: eine Sammelkarte buendelt bis zu vier davon, und wer sie als
    // eine zaehlt, bestraft genau die Buendelung.
    // Ohne die Ehrungen, aus demselben Grund wie bei den Gesichtern.
    ereignisse: ohnePartie.filter(s => (s.dataRef||{}).type !== 'ehrung').reduce((n, s) => {
      const t = ((s.dataRef||{}).teile||[]); return n + (t.length > 1 ? t.length : 1); }, 0),
    // Wer in der Geschichte vorkommt, bekommt sein Gesicht.
    mitSpieler: sichtbar.filter(s => _newsPids(s).length > 0).length,
    ohneGesicht: sichtbar.filter(s => _newsPids(s).length > 0 && !_newsGesichtHtml(s)).length,
    wappen: sichtbar.filter(s => _newsGesichtHtml(s).indexOf('class="ins"') >= 0).length,
    matchKarten: sichtbar.filter(s => (s.dataRef||{}).matchId).length,
    matchResult: sichtbar.filter(s => (s.dataRef||{}).type === 'spiel').length,
    // ── Jede Partie bekommt ihre Karte ──────────────────────────────
    // Gebildet wurde nur ein auffaelliges Muster, und der Deckel nahm den
    // Rest: von 52 Partien des Fensters kamen 18 in einer sichtbaren Karte
    // vor. Wer am Abend nachliest, erfuhr von zwei Dritteln nichts.
    partienOhneKarte: (function(){
      const seit = Date.now() - NEWS_FENSTER_TAGE * 86400000;
      const genannt = new Set();
      sichtbar.forEach(s => { const d = s.dataRef || {};
        if(d.matchId) genannt.add(d.matchId);
        (d.teile || []).forEach(t => { if(t.matchId) genannt.add(t.matchId); }); });
      return matches.filter(m => mts(m) >= seit && !genannt.has(m.id)).length;
    })(),
    partienImFenster: (function(){
      const seit = Date.now() - NEWS_FENSTER_TAGE * 86400000;
      return matches.filter(m => mts(m) >= seit).length;
    })(),
    matchOhneBand: sichtbar.filter(s => {
      const d=s.dataRef||{}; if(!d.matchId) return false;
      // Das Band gehoert der Partie, nicht jeder Karte, die sie nennt: steht
      // schon eine andere Karte derselben Partie im Feed, zeigt sie es. Sonst
      // stand dasselbe 10:4 zweimal untereinander, mit denselben vier Wappen
      // und demselben Stand [§C33].
      if(d.bandFremd) return false;
      const m=matches.find(x=>x.id===d.matchId);
      const html=_newsCardHtmlM2(s, false, false);
      const ids=m ? [m.a1,m.a2,m.b1,m.b2].filter(Boolean) : [];
      const pm=pmap();
      if(!m || ids.some(id=>!pm[id] || html.indexOf(esc(pm[id].name))<0)) return true;
      // Die Partie-Karte traegt einen Kopf nach ihrem Anlass [§11.6c]:
      // Spielfeld, Anzeigetafel, Wippe, Band oder Ergebniszeile. Jeder davon
      // zeigt alle vier mit Gesicht und den Stand.
      if(_newsSorte(s) === 'spiel'){
        // Die Köpfe der gewöhnlichen Partie (.sp-fk) zeigen nicht immer vier
        // Gesichter, die Namen stehen dann darunter (oben geprüft). Der Stand
        // gehört aber in JEDE Grafik, als Paar aus Sieger- und Verlierertoren.
        // Gefragt wird der KOPF: auch der Fuß zeichnet in Formen (.sp-fk), aber
        // ohne Stand, und eine Ergebniszeile mit Fuß „Überholt" galt sonst als
        // Kopf ohne Tore.
        // Team A steht links (sp-b spiegelt einen Kopf, wenn B gewann), der
        // Stand liest sich A:B, der Sieger hell.
        const kopf = _spBild(s).kopf;
        if(/class="(sp-b )?sp-fk /.test(kopf)){
          const hoch = Math.max(m.games_a, m.games_b), tief = Math.min(m.games_a, m.games_b);
          if(kopf.indexOf('<em>' + hoch + '</em>:' + tief + '</b>') >= 0) return false;
          if(kopf.indexOf('>' + tief + ':<em>' + hoch + '</em></b>') >= 0) return false;
          // Klapptafel, Pucks und Tor zeichnen den Stand selbst: dann steht
          // unter den Zahlen ohne Vorzeichen (die Elo der vier trägt eins)
          // die Siegerzahl, und direkt danach die der Verlierer.
          const z = (kopf.replace(/<[^>]+>/g, ' ').match(/(^|\\s)\\d+(?=\\s|$)/g) || []).map(t => +t);
          return !z.some((v, i) => v === hoch && z[i + 1] === tief);
        }
        const gesichter = (html.match(/class="(rav zn|av)[ "]/g)||[]).length;
        const stand = html.indexOf('>' + m.games_a + '</em>') >= 0 && html.indexOf('>' + m.games_b + '</em>') >= 0
          || html.indexOf('>' + m.games_a + '</b>') >= 0 && html.indexOf('>' + m.games_b + '</b>') >= 0;
        return gesichter < 4 || !stand;
      }
      return html.indexOf('class="nf-erg"') < 0
        || (html.match(/class="nf-erg-team/g)||[]).length < 2
        || (html.match(/class="rav zn/g)||[]).length < 4;
    }).map(s => (s.dataRef||{}).type),
    // Keine Ausrufezeichen [CLAUDE.md §7].
    rufe: roh.filter(s => /!/.test(s.title||'') || /!/.test(s.desc||''))
             .map(s => s.title).slice(0, 5),
    // Kein Typ haeuft sich.
    // Die Typen sammel und woche sind ausgenommen: jede Sammelkarte gehoert zu einer
    // anderen Partie oder einem anderen Tag, und die Wochenkarte gibt es je
    // Woche genau einmal. Sie zu deckeln hiesse, eine Buendelung zu bestrafen.
    // potd steht dabei: was es je Tag genau einmal gibt, ist keine
    // Wiederholung, sondern die Schlagzeile eines eigenen Tages.
    haeufung: Object.keys(proTag).filter(k => proTag[k] > 2 &&
      ['ambient','group','lead_change','elo_record','streak_record',
       'season_recap','season_endgame','sammel','woche','spiel',
       'potd','ehrung_woche','ehrung_monat'].indexOf(k.split('|')[0]) < 0)
      .map(k => k + '×' + proTag[k]),
    // Doppelte Schlagzeilen: zweimal dieselbe Zeile ist eine Zeile zu viel.
    doppelt: (function(){
      // Was es je Tag genau einmal gibt, darf dieselbe Schlagzeile zweimal
      // tragen: zwei Spieltage, zwei Sieger, und jede Karte nennt im Text ihr
      // eigenes Datum. Dieselbe Ausnahme gilt fuer die Partie.
      const PFL = ['potd','woche','season_recap','chronik_frei'];
      const g = {}; sichtbar.filter(s => !_prt(s)
        && PFL.indexOf((s.dataRef||{}).type) < 0)
        .forEach(s => { g[s.title]=(g[s.title]||0)+1; });
      return Object.keys(g).filter(t => g[t] > 1);
    })(),
    // Und zweimal derselbe Text erst recht nicht — „Eine grosse Rivalitaet —
    // die Liga liebt's" stand wortgleich unter zwei Karten untereinander.
    doppelText: (function(){
      const PFL = ['potd','woche','season_recap','chronik_frei'];
      const g = {}; sichtbar.filter(s => !_prt(s)
        && PFL.indexOf((s.dataRef||{}).type) < 0)
        .forEach(s => { g[s.desc]=(g[s.desc]||0)+1; });
      return Object.keys(g).filter(t => t && g[t] > 1);
    })(),
    // Nichts steht zweimal DIREKT untereinander: zwei gleiche Sorten in Folge
    // lesen sich als eine Karte mit einem Tippfehler.
    // Zwei gleiche Sorten direkt untereinander lesen sich als eine Karte mit
    // einem Tippfehler. Ueber einen TAGESWECHSEL hinweg gilt das nicht: dort
    // steht ein Tageskopf dazwischen, und die Chronologie hat Vorrang vor der
    // Auflockerung — eine Karte, die den Tag wechselt, stuende unter dem
    // falschen Kopf.
    // Und die Gegenrechnung: der Feed ist chronologisch. Eine Karte bleibt da,
    // wo sie entstanden ist — am Anfang eines Tages, zwischen zwei Partien
    // oder an seinem Ende. EINE Ausnahme, und nur diese: zwei Karten
    // derselben Sorte tauschen einen Platz, damit sie nicht untereinander
    // stehen. Gemessen wird deshalb dreierlei: jeder Tag steht als ein
    // Block, die Tage stehen von neu nach alt, und keine Karte steht mehr
    // als einen Platz von ihrer Uhrzeit entfernt.
    ausDerReihe: (function(){
      let n = 0;
      const jeTag = {}, folge = [];
      sichtbar.forEach((s, i) => { const k = tagKey(s.when);
        if(!jeTag[k]){ jeTag[k] = []; folge.push(k); }
        jeTag[k].push({s, i}); });
      Object.keys(jeTag).forEach(k => {
        const l = jeTag[k];
        for(let i = 1; i < l.length; i++) if(l[i].i !== l[i-1].i + 1) n++;
        l.slice().sort((a, b) => new Date(b.s.when) - new Date(a.s.when))
          .forEach((x, rang) => { if(Math.abs(rang - l.indexOf(x)) > 1) n++; });
      });
      for(let i = 1; i < folge.length; i++) if(folge[i] > folge[i-1]) n++;
      return n;
    })(),
    // Wie ungleich sind die Gesichter verteilt? Vorher stand ein Spieler auf
    // neun von einunddreissig Karten und ein anderer auf einer.
    gesichter: (function(){
      // Gezaehlt wird ueber die Karten, die eine AUSWAHL sind. Eine
      // Partie-Karte ist keine: wer oft spielt, steht oft darauf, und das ist
      // kein Uebergewicht im Feed, sondern der Spielplan.
      // Dasselbe gilt fuer die Ehrung einer Runde: sie nennt jeden, der darin
      // eine Auszeichnung bekam, vollstaendig und ohne Auswahl [§C33].
      // Gemessen stand Leon auf 15 von 42 Ereignissen, 10 davon Ehrungen;
      // ohne sie steht niemand auf mehr als 6 von 31.
      const g = {}; ohnePartie.filter(s => (s.dataRef||{}).type !== 'ehrung')
        .forEach(s => _newsPids(s).forEach(id => { g[id]=(g[id]||0)+1; }));
      const w = Object.keys(g).map(k => g[k]).sort((x,y) => y-x);
      // Wer gewertet ist, muss auch vorkommen. Das ist die staerkere Frage als
      // die nach dem Spitzenreiter: der Feed darf jemanden feiern, aber er
      // darf niemanden uebergehen.
      // Und gefragt ist, wer im FENSTER gespielt hat. Wer vier Wochen nicht
      // angetreten ist, hat keine Nachricht: seine Karte war eine Behauptung
      // ueber eine Serie von damals, und genau die ist gefallen.
      const seit = Date.now() - NEWS_FENSTER_TAGE * 86400000;
      const zahl = {};
      matches.filter(m => mts(m) >= seit)
        .forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(id => { if(id) zahl[id]=(zahl[id]||0)+1; }));
      const alleG = {};
      sichtbar.forEach(s => _newsPids(s).forEach(id => { alleG[id]=(alleG[id]||0)+1; }));
      const gewertet = Object.keys(zahl).filter(id => pmap()[id] && !pmap()[id].hidden && zahl[id] >= 4);
      return {koepfe: Object.keys(g).length, max: w[0] || 0,
              gewertet: gewertet.length, ohne: gewertet.filter(id => !alleG[id]).map(id => pmap()[id].name)};
    })(),
    // Kann ein Spieler mit wenigen Partien ueberhaupt vorkommen? Gefragt ist
    // die MOEGLICHKEIT, nicht der Treffer an diesem Tag.
    kleinsteMoeglich: (function(){
      const zahl = {};
      matches.forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(id => { if(id) zahl[id]=(zahl[id]||0)+1; }));
      const wenig = Object.keys(zahl).filter(id => pmap()[id] && zahl[id] >= 5 && zahl[id] < 30);
      // Der Fun-Fact-Topf verlangt fuenf Partien — mehr nicht.
      return wenig.length ? wenig.every(id => zahl[id] >= 5) : true;
    })()
  };
})())`));

ok(_feed.doppelText.length === 0, 'keine zwei Karten tragen denselben Text',
   _feed.doppelText.slice(0, 2).join(' | ') || 'keine');
ok(_feed.ausDerReihe === 0, 'der Feed steht chronologisch, von neu nach alt',
   _feed.ausDerReihe + ' Karten aus der Reihe');

// ── Was einmal dasteht, bleibt stehen ────────────────────────────────
// Ein Spieltag lief so ab: nach der ersten Partie standen vier Karten im
// Feed, nach der zweiten war eine davon weg, nach der vierten die naechste.
// Der Grund war dreifach — die ID einer Tafel-Karte trug den Stand des
// Augenblicks (Halter und Wert) und wurde nach der naechsten Partie eine
// andere; die beiden Deckel vergaben ihre Plaetze nach `prio` und damit nach
// dem, was am Ende des Tages am staerksten war; und die drei Sperren liefen
// von neu nach alt, sodass eine spaetere Wiederholung die aeltere Karte
// verdraengte. Wer mittags gelesen hatte, fand abends etwas anderes vor.
// Gemessen wird der echte Weg: der letzte Spieltag Partie fuer Partie, mit
// einem Bestand, der sich verhaelt wie die Datenbank — eine ID wird genau
// einmal eingefuegt und behaelt ihren Zeitpunkt. Eine Karte darf danach in
// einer Sammelkarte aufgehen, aber nicht verschwinden.
const _stabil = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches;
  try {
    const tage = {};
    alle.forEach(m => { (tage[tagKey(mts(m))] = tage[tagKey(mts(m))] || []).push(m); });
    const ziel = Object.keys(tage).sort().pop();
    const bis = alle.length - tage[ziel].length;
    const db = new Map();
    const schritte = [];
    for(let k = 1; k <= tage[ziel].length; k++){
      matches = alle.slice(0, bis + k);
      invalidateCache();
      _cache._stories = null; _cache._consolFrom = null; _cache._frischVon = null;
      _buildStories().forEach(s => { if(!db.has(s.id)) db.set(s.id, s); });
      _cache._stories = [...db.values()].sort((a,b) => new Date(b.when) - new Date(a.when));
      _cache._consolFrom = null; _cache._frischVon = null;
      const sicht = getStoriesCache().filter(s => tagKey(s.when) === ziel);
      // Vertreten ist eine Karte, wenn sie selbst dasteht — oder als Zeile
      // einer Sammelkarte desselben Tages, oder als Mitglied einer Karte,
      // die sie trägt (der härteste Tag auf dem Spieler des Tages).
      const drin = new Set();
      sicht.forEach(s => { drin.add(s.id);
        ((s.dataRef||{}).teile||[]).forEach(t => { if(t.id) drin.add(t.id); });
        ((s.dataRef||{}).memberIds||[]).forEach(id => drin.add(id)); });
      // Die Aussage einer Karte: was fuer ein Ereignis und worum es geht. Die
      // Beteiligten stehen NICHT darin — wechselt der groesste Ausschlag des
      // Tages von einem Spieler zum naechsten, ist das dieselbe Aussage mit
      // einem neuen Stand.
      const aus = {};
      [...db.values()].forEach(s => { const d = s.dataRef || {};
        aus[s.id] = (d.type || '') + '|'
          + (d.rekordId || d.badgeId || d.disziplinId || d.titleId || d.titel || '')
          + '@' + new Date(s.when).getTime(); });
      schritte.push({drin:[...drin], aus,
                     zeit:sicht.map(s => s.id + '@' + new Date(s.when).getTime())});
    }
    const weg = [], gewandert = [];
    for(let i = 1; i < schritte.length; i++){
      const jetzt = new Set(schritte[i].drin);
      // Dieselbe Aussage ein zweites Mal ist die Nachricht von JETZT: „Der
      // groesste Ausschlag des Tages" gehoerte um 13:56 Leo und um 14:20
      // jemand anderem, und die zweite Karte traegt den Stand, der gilt.
      // Dann faellt die erste, und die spaetere Wiederholung steht mit ihrem
      // eigenen Zeitpunkt da. Alles andere bleibt.
      const spaeter = new Set();
      Object.keys(schritte[i].aus).forEach(id => {
        if(!jetzt.has(id)) return;
        const p = schritte[i].aus[id].lastIndexOf('@');
        spaeter.add(schritte[i].aus[id].slice(0, p) + '|' + schritte[i].aus[id].slice(p + 1));
      });
      // Eine Fassung der Tafel weicht der jüngeren desselben Tages: sie ist
      // der ganze Stand nach der späteren Partie [§C33].
      const fassungJetzt = [...jetzt].reduce((mx, x) => {
        const f = String(x).split('~')[1] || ''; return f > mx ? f : mx; }, '');
      const ersetzt = id => {
        const f = String(id).split('~')[1];
        if(f && fassungJetzt > f) return true;
        const v = schritte[i-1].aus[id]; if(!v) return false;
        const p = v.lastIndexOf('@');
        const sache = v.slice(0, p), ms = Number(v.slice(p + 1));
        return [...spaeter].some(x => {
          const q = x.lastIndexOf('|');
          return x.slice(0, q) === sache && Number(x.slice(q + 1)) > ms;
        });
      };
      schritte[i-1].drin.forEach(id => {
        if(jetzt.has(id) || ersetzt(id)) return;
        weg.push('P' + i + ' ' + id);
      });
      const vorZeit = {}; schritte[i-1].zeit.forEach(x => {
        const p = x.lastIndexOf('@'); vorZeit[x.slice(0,p)] = x.slice(p+1); });
      schritte[i].zeit.forEach(x => { const p = x.lastIndexOf('@');
        const id = x.slice(0,p), ms = x.slice(p+1);
        if(vorZeit[id] && vorZeit[id] !== ms) gewandert.push('P' + i + ' ' + id); });
    }
    // ── Ein Rekord, ein Spieltag, eine Karte ───────────────────────
    // Die ID trug Halter und Wert, und beides bewegt sich im Lauf eines
    // Tages: der Bestand hielt danach drei Karten ueber denselben Rekord —
    // „Maxi uebernimmt", „Maxi und Johannes uebernehmen", „Maxi, Julian,
    // Jane und Johannes uebernehmen" —, und keine widersprach der anderen
    // so deutlich, dass ein Filter sie weggenommen haette. Der Rekord
    // wechselt an diesem Spieltag einmal, also ist es eine Karte.
    const jeSache = {};
    [...db.values()].forEach(s => {
      const d = s.dataRef || {};
      if(tagKey(s.when) !== ziel) return;
      const k = String(d.type || '').indexOf('rekord_') === 0 ? 'rek|' + d.rekordId
              : d.type === 'chronik_geholt' ? 'chr|' + d.titleId : null;
      if(!k) return;
      // Gezählt wird die Karte, nicht ihre Fassung: jede Partie des Tages
      // schreibt eine neue Fassung derselben Zeile (mit ~).
      (jeSache[k] = jeSache[k] || new Set()).add(String(s.id).split('~')[0]);
    });
    const mehrfach = Object.keys(jeSache).filter(k => jeSache[k].size > 1)
      .map(k => k + ' \u00d7' + jeSache[k].size);
    return {tag: ziel, partien: tage[ziel].length, weg, gewandert, mehrfach,
            sachen: Object.keys(jeSache).length,
            karten: schritte[schritte.length-1].zeit.length};
  } finally {
    matches = alle; invalidateCache();
    _cache._stories = null; _cache._consolFrom = null; _cache._frischVon = null;
  }
})())`));
ok(_stabil.partien >= 5, 'der Spieltag der Messung hat genug Partien',
   _stabil.tag + ' mit ' + _stabil.partien);
ok(_stabil.weg.length === 0,
   'keine Karte verlaesst den Feed, ausser fuer ihre eigene spaetere Fassung',
   _stabil.weg.slice(0, 5).join(' | ') || _stabil.karten + ' Karten am Ende');
ok(_stabil.gewandert.length > 0
   && _stabil.gewandert.every(x => String(x).indexOf('sammel_tafel_') >= 0),
   'nur die heutige Ewige Tafel wandert zum neuesten Wechsel',
   _stabil.gewandert.slice(0, 5).join(' | ') || 'keine');
ok(_stabil.sachen > 0 && _stabil.mehrfach.length === 0,
   'ein Rekord und eine Chronik tragen je Spieltag genau eine Karte',
   _stabil.mehrfach.join(' | ') || _stabil.sachen + ' Eintraege');

// ── Jede Fassung der Tafel ist eine eigene Zeile ────────────────────
// Die Datenbank erlaubt nur Einfügen. Am 19.10. stand dort die Tafel von
// 13:54, und jeder Versuch, sie nach der Partie um 17:17 zu ändern,
// scheiterte: der Feed zeigte bis zum Ende des Generators die alte Karte und
// danach die neue, die Zeichen-Karte ebenso. Nachgestellt wird ein Bestand
// mit der frühen Fassung und ein Gerät mit der späten — in beiden
// Reihenfolgen muss genau die späte gelten.
const _fassung = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches;
  try {
    const tage = {};
    alle.forEach(m => { (tage[tagKey(mts(m))] = tage[tagKey(mts(m))] || []).push(m); });
    const ziel = Object.keys(tage).sort().pop();
    const bis = alle.length - tage[ziel].length;
    const lauf = n => { matches = alle.slice(0, bis + n); invalidateCache();
      _cache._stories = null; _cache._consolFrom = null; _cache._frischVon = null;
      return _buildStories().slice(); };
    const frueh = lauf(2), vorletzt = lauf(tage[ziel].length - 1), spaet = lauf(tage[ziel].length);
    const wachsend = l => l.filter(s => STORY_TAFEL_UPDATE.has((s.dataRef||{}).type) && tagKey(s.when) === ziel);
    const fs = (wachsend(spaet)[0] || {dataRef:{}}).dataRef.fassung || '';
    const sicht = (bestand, neu) => {
      _cache._stories = _mergeStorySnapshots(bestand, neu, new Date());
      _cache._consolFrom = null; _cache._snapshotConsolFrom = null;
      const l = _consolidateStories(_cache._stories).filter(s => tagKey(s.when) === ziel);
      const ids = [];
      l.forEach(s => { const d = s.dataRef || {};
        if(d.quelle === 'tafel') (d.teile || []).forEach(t => ids.push(String(t.id || '')));
        else if(STORY_TAFEL_UPDATE.has(d.type)) ids.push(String(s.id)); });
      return {tafel:l.filter(s => (s.dataRef||{}).quelle === 'tafel').length,
              zeichen:l.filter(s => (s.dataRef||{}).type === 'insignium_tag').length, ids};
    };
    const a = sicht(frueh, spaet), b = sicht(spaet, frueh);
    // Hochgeladen wird nur eingefügt: ein Upsert, der eine Zeile ändern
    // müsste, scheitert an der Datenbank und nahm die neuen Zeilen mit.
    // Dafür darf eine spätere Fassung keine ID einer früheren tragen.
    const idsVor = new Set(wachsend(vorletzt).map(x => x.id));
    const gleicheIds = wachsend(spaet).filter(x => idsVor.has(x.id)).map(x => x.id);
    return {vorN:wachsend(vorletzt).length, fruehN:wachsend(frueh).length, spaetN:wachsend(spaet).length, fs,
            verschieden:fs !== ((wachsend(frueh)[0] || {dataRef:{}}).dataRef.fassung || ''),
            a, b, gleicheIds};
  } finally {
    matches = alle; invalidateCache();
    _cache._stories = null; _cache._consolFrom = null; _cache._frischVon = null;
  }
})())`));
ok(_fassung.fruehN > 0 && _fassung.spaetN > 0 && _fassung.verschieden,
   'die Tafel eines Spieltags hat nach der zweiten und nach der letzten Partie je eine eigene Fassung',
   _fassung.fruehN + ' / ' + _fassung.spaetN + ' Zeilen, ' + _fassung.fs);
ok([_fassung.a, _fassung.b].every(x => x.tafel === 1 && x.zeichen <= 1 && x.ids.length > 0
     && x.ids.every(id => id.endsWith('~' + _fassung.fs))),
   'aus früher und später Fassung zeigt der Feed genau eine Tafel, die späte, in jeder Reihenfolge',
   JSON.stringify([_fassung.a, _fassung.b]).slice(0, 300));
ok(_fassung.vorN > 0 && _fassung.gleicheIds.length === 0,
   'eine spätere Fassung trägt nur neue IDs, hochgeladen wird nur eingefügt', _fassung.gleicheIds.slice(0, 4).join(', ') || 'keine gleiche');

// ── Jede Zeile der Tafel steht bei der Partie, ab der sie galt ───────
// Alle Zeilen trugen die Uhrzeit der letzten Partie des Tages: „Leon holt
// ‚Die Steigerung'" stand unter 17:17, obwohl es seit 13:54 so war. Geprüft
// wird am letzten Spieltag der Liga, dass der Stand zur Uhrzeit jeder Zeile
// schon der des Abends ist, und dass nicht alle bei der letzten stehen.
const _moment = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches;
  try {
    const tage = {};
    alle.forEach(m => { (tage[tagKey(mts(m))] = tage[tagKey(mts(m))] || []).push(m); });
    const ziel = Object.keys(tage).sort().pop();
    const letzte = Math.max(...tage[ziel].map(mts));
    invalidateCache(); _cache._stories = null; _cache._consolFrom = null; _cache._frischVon = null;
    const l = _buildStories().filter(s => tagKey(s.when) === ziel
      && /^(rekord_|chronik_geholt$)/.test((s.dataRef || {}).type || ''));
    const gleich = (x, y) => (x || []).slice().sort().join(',') === (y || []).slice().sort().join(',');
    const schon = s => {
      const d = s.dataRef, t = new Date(s.when).getTime();
      const st = _storyStand(t >= letzte ? 0 : t);
      if(d.type === 'chronik_geholt'){
        const h = st.chronik(d.sid) || {};
        return !!h[d.titleId] && gleich(h[d.titleId].pids, d.alle);
      }
      const x = st.rekorde()[d.rekordId];
      return !!x && gleich(x.pids, d.halter) && (d.type !== 'rekord_gesteigert' || x.val === d.wert);
    };
    // Und die Wirkung nennt eine Chronik nur bei dem, dem sie etwas gibt
    // oder nimmt: im Monat zählt je Spieler eine.
    const chr = l.filter(s => s.dataRef.type === 'chronik_geholt');
    const ohne = chr.filter(s => Array.isArray(s.dataRef.zaehlt)
      && s.dataRef.alle.some(p => s.dataRef.zaehlt.indexOf(p) < 0)).length;
    const leer = _ndWirkungsGruende([{halter:['a'], vorher:['b'], rname:'X', zaehlt:[]}]);
    const eins = _ndWirkungsGruende([{halter:['a'], vorher:['b'], rname:'X', zaehlt:['a']}]);
    // Was erst mit dem Ende des Tages gilt — eine Chronik über den ganzen
    // Spieltag —, steht bei der letzten eigenen Partie der Genannten.
    const eigeneLetzte = pids => Math.max(0, ...tage[ziel]
      .filter(m => (pids || []).some(p => [m.a1, m.a2, m.b1, m.b2].indexOf(p) >= 0)).map(mts));
    const falsch = l.filter(s => !schon(s)
      && new Date(s.when).getTime() !== eigeneLetzte(s.dataRef.playerIds));
    return {n:l.length, frueher:l.filter(s => new Date(s.when).getTime() < letzte).length,
            falsch:falsch.map(s => s.title + ' @ ' + new Date(s.when).toISOString().slice(11, 16)),
            chr:chr.length, mitZaehlt:chr.filter(s => Array.isArray(s.dataRef.zaehlt)).length, ohne,
            filter:Object.keys(leer).length === 0 && Object.keys(eins).join() === 'a'};
  } finally {
    matches = alle; invalidateCache();
    _cache._stories = null; _cache._consolFrom = null; _cache._frischVon = null;
  }
})())`));
ok(_moment.n > 0 && _moment.frueher > 0 && _moment.falsch.length === 0,
   'jede Zeile der Tafel steht bei der Partie, ab der ihr Stand galt, nicht alle bei der letzten',
   _moment.frueher + ' von ' + _moment.n + ' früher' + (_moment.falsch.length ? ', falsch: ' + _moment.falsch.slice(0, 3).join(' | ') : ''));
ok(_moment.chr > 0 && _moment.mitZaehlt === _moment.chr && _moment.filter,
   'jede Chronik-Zeile sagt, wem sie Prestige gibt oder nimmt, und die Wirkung nennt nur diese',
   _moment.mitZaehlt + ' von ' + _moment.chr + ', ' + _moment.ohne + ' mit Haltern ohne Wirkung');

// ── Der Tafel-Moment sagt ueberall dieselbe Zahl ─────────────────────
// Im Blatt stand „+2 PRESTIGE" in der Zahlenreihe und drei Zeilen darunter
// „Johannes +9 Prestige fuer die Laufbahn" — eines von beidem liest sich als
// Fehler. Zwei Ursachen: nur die REKORD-Zeile trug die Laufbahn-Angabe, also
// fehlte im Bereich „Wirkung auf die Laufbahn" jeder, der nur eine Chronik
// geholt hat (gemessen fehlte Leo ganz, und die Summe stand auf dem Zuwachs
// eines einzigen Spielers); und die Zeile nannte ihre Zahl „fuer die
// Laufbahn", also mit derselben Aufschrift wie die Reihe, obwohl dort der
// Zuwachs des ganzen Spieltags steht.
const _tmoment = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const s = getStoriesCache().find(x => (x.dataRef||{}).quelle === 'tafel');
  if(!s) return {fehlt:true};
  const d = s.dataRef || {};
  const teile = d.teile || [];
  const html = _newsDetailBody(s);
  // Wer auf der Karte steht, kommt in der Wirkung vor. Gefragt wird nach den
  // Beteiligten der KARTE und nicht nach den Laufbahn-Angaben der Zeilen:
  // sonst prueft der Test die Implementierung gegen sich selbst und bleibt
  // gruen, gerade wenn eine Zeile ihre Angabe nicht mitbringt.
  const genannt = (d.playerIds || []).filter(x => pmap()[x]);
  const inWirkung = (html.match(/class="nd-wk[^"]*" data-pid="([0-9a-f-]+)"/g) || [])
    .map(x => x.slice(x.indexOf('data-pid="') + 10, -1));
  // Und die Prestige-Zelle wird gegen das gezaehlt, was der Bereich darunter
  // ZEIGT — zwei Stellen im Markup, nicht zweimal dieselbe Rechnung.
  const zelle = (html.match(/>\\+(\\d+)<\\/div><div class="rcp-z-l">Prestige</) || [])[1];
  const summe = (html.match(/class="nd-wk-d g">\\+(\\d+)</g) || [])
    .reduce((a, x) => a + Number((x.match(/\\+(\\d+)/) || [0, 0])[1]), 0);
  return {fehlt:false, n:teile.length,
    ohneWirkung: genannt.filter(p => inWirkung.indexOf(p) < 0).map(p => pmap()[p].name),
    zelle: zelle == null ? null : Number(zelle), summe,
    // Die Zeile nennt den Beitrag DIESES Eintrags und ihren Halter einmal.
    zeilen: teile.filter(t => String(t.typ||'').indexOf('chronik_') === 0)
      .map(t => t.text || ''),
    dopName: teile.filter(t => {
      const nm = (String(t.titel||'').match(/^(\\S+) /) || [])[1];
      return nm && String(t.text||'').indexOf(nm) >= 0;
    }).map(t => t.titel)};
})())`));
ok(!_tmoment.fehlt && _tmoment.n >= 3, 'der Tafel-Moment der Messung hat genug Zeilen',
   _tmoment.n + ' Zeilen');
ok(_tmoment.ohneWirkung.length === 0,
   'jeder, von dem eine Tafel-Zeile erzaehlt, steht in der Wirkung auf die Laufbahn',
   _tmoment.ohneWirkung.join(', ') || 'keiner fehlt');
ok(_tmoment.zelle != null && _tmoment.zelle === _tmoment.summe,
   'und die Prestige-Zelle ist die Summe aller, nicht der Zuwachs eines',
   _tmoment.zelle + ' gegen ' + _tmoment.summe);
// ── Der Zeitpunkt gehoert einer Zeile, die die Karte ZEIGT ───────────
// Gestellt wird der gemessene Fall: der Ausbau um 15:19 ist die aelteste
// Zeile, die beiden Wechsel liegen um 15:37 — und ein Ausbau steht gar nicht
// auf der Karte [§C33]. Ueber den echten Partien trifft das nicht zu, dort
// ist die aelteste Zeile zufaellig ein Wechsel.
const _tzeit = JSON.parse(K.eval(`JSON.stringify((function(){
  const p = players.map(x => x.id);
  const tag = tagKey(mts(matches[matches.length - 1]));
  const t0 = new Date(tag + 'T15:19:00').getTime();
  const z = (id, typ, min, titel, ref) => ({id, cat:'tafel', ic:'medal2', prio:70,
    when:new Date(t0 + min * 60000).toISOString(), title:titel,
    desc:'Ein Satz mit 5 Zahlen.',
    dataRef:Object.assign({type:typ, causalKey:'table:' + tag,
                           playerIds:[ref], zeileText:'Kurz, 5 Zahlen.'}, {})});
  _cache._consolFrom = null;
  const aus = _consolidateStories([
    z('tz-aus', 'rekord_gesteigert', 0, 'A baut „Der Fels" aus', p[0]),
    z('tz-rek', 'rekord_geholt', 18, 'B uebernimmt „Der Massstab"', p[1]),
    z('tz-chr', 'chronik_geholt', 18, 'C holt „Der Nachzuegler"', p[2])
  ]);
  const sam = aus.find(x => (x.dataRef||{}).type === 'sammel');
  if(!sam) return {fehlt:true};
  const teile = sam.dataRef.teile || [];
  const ms = new Date(sam.when).getTime();
  return {fehlt:false, uhr:new Date(ms).toISOString().slice(11,16),
    passt: teile.some(t => t.typ !== 'rekord_gesteigert' && t.ms === ms)};
})())`));
ok(!_tzeit.fehlt && _tzeit.passt,
   'die Karte traegt den Zeitpunkt einer Zeile, die sie auch zeigt',
   'Karte steht auf ' + _tzeit.uhr);
ok(_tmoment.zeilen.length > 0
   && _tmoment.zeilen.every(t => /aus diesem Eintrag/.test(t) || !/Prestige/.test(t)),
   'eine Chronik-Zeile sagt, dass ihre Zahl aus diesem Eintrag kommt',
   _tmoment.zeilen.join(' | ').slice(0, 140));
ok(_tmoment.dopName.length === 0,
   'und keine Zeile nennt den Namen aus ihrer eigenen Schlagzeile noch einmal',
   _tmoment.dopName.join(' | ') || 'keine');

// ── Eine negative Gruppe reist nicht mit ─────────────────────────────
// Mehrere Pleitenserien derselben Partie werden EINE Zeile („2 Pechvögel"),
// und die traegt `type:'group'` mit `loss_streak` in `sub`. Geprueft wurde
// nur `type`, also galt sie als positiv: gemessen stand sie als Zeile auf
// „Teamserie in einer Partie", der Karte ueber den SIEG der beiden anderen
// [§C25]. Und eine Gruppe traegt den Anlass ihrer Mitglieder: ohne das hiess
// ein Buendel aus fuenf Zeilen nur „Teamserie in einer Partie".
const _grp = JSON.parse(K.eval(`JSON.stringify((function(){
  const p = players.map(x => x.id);
  const m = matches[matches.length - 1];
  const t0 = mts(m);
  _cache._consolFrom = null;
  const liste = [
    {id:'g-spiel', cat:'highlight', ic:'ball', prio:41, when:new Date(t0).toISOString(),
     title:'Sieg', desc:'Ein Satz mit 1 Zahl.',
     dataRef:{type:'spiel', matchId:m.id, resultKind:'kanter', playerIds:[p[0], p[1]],
              quote:'70', elo:9}},
    {id:'g-ws', cat:'personal', ic:'flame', prio:70, when:new Date(t0).toISOString(),
     title:'Serien im Gleichschritt', desc:'Zwei Serien, 2 Marken.',
     dataRef:{type:'group', sub:'win_streak', matchId:m.id, playerIds:[p[0], p[1]]}},
    {id:'g-ls', cat:'misfortune', ic:'dropDouble', prio:52, when:new Date(t0).toISOString(),
     title:'2 Pechvögel', desc:'Zwei Pleitenserien, 2 Marken.',
     dataRef:{type:'group', sub:'loss_streak', matchId:m.id, playerIds:[p[2], p[3]]}}
  ];
  const aus = _consolidateStories(liste);
  const sam = aus.find(x => (x.dataRef||{}).type === 'sammel');
  return {karten:aus.map(x => x.id), neg:sam ? (sam.dataRef.teile||[]).filter(t => t.neg).length : 0,
    titel: sam ? sam.title : '',
    zeilen: sam ? (sam.dataRef.teile||[]).map(t => t.id) : []};
})())`));
ok(_grp.zeilen.indexOf('g-ls') >= 0 && _grp.karten.length === 1 && _grp.neg === 1,
   'eine Gruppe von Pleitenserien bleibt als negative Zeile derselben Matchkarte erhalten',
   _grp.zeilen.join(', ') + ' · Karten: ' + _grp.karten.join(', '));
// Die Schlagzeile ist der Hauptanlass in seinem eigenen Satz [§C33]: die
// Siegesserien der beiden, nicht die Pleiten der anderen, und ohne
// „ihre": „ziehen ihre Serien gemeinsam weiter" stand als Zeile da.
ok(/Siegesserie/.test(_grp.titel) && !/ ihre /.test(_grp.titel) && !/Durststrecke|Pech/.test(_grp.titel),
   'und die Schlagzeile ist die Gruppe der Siegesserien, ohne Possessiv', _grp.titel);

// Mehrere positive Meilensteine derselben Partie gehoeren an ihr Ergebnis.
// Sie duerfen weder von der persoenlichen Erfolgsachse vorher herausgezogen
// noch wegen einer festen Zeilenzahl verworfen werden.
const _matchErfolge = JSON.parse(K.eval(`JSON.stringify((function(){
  const m = matches[matches.length - 1], p = [m.a1, m.a2, m.b1, m.b2], t = mts(m);
  const mk = (id, type, ref) => ({id, cat:'highlight', ic:'medal', prio:60,
    when:new Date(t), title:id, desc:'Ein Ereignis mit 1 Zahl.',
    dataRef:Object.assign({type, matchId:m.id, playerIds:[ref.pid]}, ref)});
  const liste = [
    {id:'me-spiel', cat:'highlight', ic:'ball', prio:41, when:new Date(t),
      title:'Partie', desc:'Das Ergebnis lautet 10:5.',
      dataRef:{type:'spiel', matchId:m.id, playerIds:p.slice(0,2)}},
    mk('me-jubi','jubilee',{pid:p[0], total:100}),
    mk('me-siege','milestone_wins',{pid:p[0], milestone:'50'}),
    mk('me-tore','milestone_goals',{pid:p[1], milestone:'500'})
  ];
  _cache._consolFrom = null;
  const aus = _consolidateStories(liste), sam = aus.find(s => (s.dataRef||{}).type === 'sammel');
  const ids = sam ? (sam.dataRef.teile||[]).map(x => x.id) : [];
  return {karten:aus.length, ids, matchId:sam && sam.dataRef.matchId, soll:m.id};
})())`));
ok(_matchErfolge.karten === 1 && _matchErfolge.ids.length === 4
   && _matchErfolge.ids.every(id => ['me-spiel','me-jubi','me-siege','me-tore'].includes(id)),
   'alle Meldungen derselben Partie werden auf ihrer Ergebniskarte zusammengefuehrt und keine verworfen',
   _matchErfolge.karten + ' Karte, Zeilen: ' + _matchErfolge.ids.join(', '));
ok(_matchErfolge.matchId === _matchErfolge.soll,
   'das zusammengefuehrte Buendel behaelt die konkrete Partie fuer seine Scoregrafik',
   String(_matchErfolge.matchId));

// ── Ein gleitendes Fenster nennt den alten Wert nicht ────────────────
// „Maxi, Julian, Jane und Johannes uebernehmen ‚Der Hoehenflug'. +10
// %-Punkte … Vorher hielt Leon den Rekord mit +20 %" — eine Uebernahme mit
// dem SCHLECHTEREN Wert. Bei einem Fenster gilt der Wert des Vorgaengers
// nicht mehr, sein Fenster ist weitergerutscht [§C35].
const _fenst = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const rek = roh.filter(s => String((s.dataRef||{}).type||'').indexOf('rekord_') === 0);
  return {n:rek.length,
    falsch: rek.filter(s => (s.dataRef||{}).fenster
                         && /den Rekord mit /.test(String(s.desc||'')))
      .map(s => s.title)};
})())`));
ok(_fenst.n > 0 && _fenst.falsch.length === 0,
   'keine Fenster-Bestmarke vergleicht sich mit dem Wert ihres Vorgaengers',
   _fenst.falsch.join(' | ') || _fenst.n + ' Rekord-Karten');

// ── Der grosse Wert kommt aus dem Beleg, mit Vorzeichen ──────────────
// Gelesen wurde die erste Zahl des FLIESSTEXTS: unter einer Uebernahme von
// „Der Hoehenflug" stand „10 %", waehrend der Satz „+10 %-Punkte" nennt —
// ein Unterschied als Anteil gelesen, und das Plus fehlt. Der Beleg beginnt
// garantiert mit dem Sortierwert [§C35], also steht der Wert dort.
const _gwert = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const rek = roh.filter(s => String((s.dataRef||{}).type||'').indexOf('rekord_') === 0
                           && (s.dataRef||{}).ev);
  const falsch = [];
  rek.forEach(s => {
    const w = _newsTafelWert(s);
    const soll = (String(s.dataRef.ev).match(/^\\s*([+−-]?\\d+(?:[.,]\\d+)?\\s?(?:%|Elo|Tore)?)/)||[])[1];
    if(!w || !soll || w.v !== soll) falsch.push(s.title + ' → ' + (w && w.v) + ' statt ' + soll);
  });
  return {n:rek.length, falsch:falsch.slice(0, 4)};
})())`));
ok(_gwert.n > 0 && _gwert.falsch.length === 0,
   'der grosse Wert einer Bestmarke ist der Sortierwert ihres Belegs',
   _gwert.falsch.join(' | ') || _gwert.n + ' Rekord-Karten');

// ── Die Zeile der Partie steht nicht unter ihrer eigenen Karte ───────
// Jede Partie hat eine Karte, und ihr Buendel traegt das Ergebnisband schon
// [§C33]. Die Zeile „Sieg ohne Gegentor" stand darunter im Sammelband noch
// einmal und sagte, was das Band zwei Zeilen hoeher zeigt.
const _spBand = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const alle = getStoriesCache();
  const sam = alle.filter(x => (x.dataRef||{}).type === 'sammel'
                            && (x.dataRef||{}).quelle === 'spiel');
  const leer = [], doppelt = [];
  // Gemessen wird an der fertigen KARTE und nicht am selbst gefilterten
  // Band: sonst prueft der Test seine eigene Kopie der Regel. Gesucht wird
  // die Zeile an ihrem Titel — das Band traegt keine ID.
  sam.forEach(s => {
    const html = _newsCardHtmlM2(s, false, false);
    const i0 = html.indexOf('class="nf-sam"');
    // Ohne Band ist eine Partie-Karte nur, wenn jeder Anlass Schlagzeile,
    // Fuß oder Nebensache ist [§C33].
    if(i0 < 0){ if(_spZeilen(s.dataRef.teile, s.title, _spBild(s).occ).zeilen.length) leer.push(s.id); return; }
    // Ohne Tags: der Titel steht im Band mit den fetten Namen darin
    // (_newsBetont), ein roher Vergleich findet ihn deshalb nie.
    const band = html.slice(i0).replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ');
    (s.dataRef.teile||[]).forEach(t => {
      const tt = String(t.titel || '');
      if(String((t && (t.typ || t.type)) || '') === 'spiel'
         && html.indexOf('data-story-id="' + esc(t.id) + '"') >= 0) doppelt.push(s.id + ' :: ' + tt);
    });
  });
  // Und der Filter gilt NUR fuer die Achse der Partie. Der Ergebnis-Strom
  // besteht ausschliesslich aus Partie-Zeilen, breiter gefiltert stand dort
  // gar nichts mehr — in den echten Partien kommt diese Achse nicht vor,
  // also wird sie gestellt.
  const m = matches[matches.length - 1];
  const p = players.map(x => x.id);
  const e = (id, pid) => ({id, cat:'highlight', ic:'ball', prio:41,
    when:new Date(mts(m)).toISOString(), title:'Ergebnis ' + id,
    desc:'Ein Satz mit 3 Zahlen.',
    dataRef:{type:'spiel', matchId:m.id, playerIds:[pid], zeileText:'Kurz, 3 Zahlen.'}});
  const ergKarte = {id:'sam-erg', cat:'highlight', ic:'ball', prio:45,
    when:new Date(mts(m)).toISOString(), title:'Zwei Ergebnisse an diesem Tag',
    desc:'Ein Satz mit 2 Zahlen.',
    dataRef:{type:'sammel', quelle:'ergebnis', playerIds:[p[0], p[1]],
      teile:[{id:'e1', typ:'spiel', titel:'A und B gewinnen ohne Gegentor', ic:'ball', wert:'10:0'},
             {id:'e2', typ:'spiel', titel:'C und D retten ein 10:9 ins Ziel', ic:'ball', wert:'10:9'}]}};
  const ergBand = _newsCardHtmlM2(ergKarte, false, false).indexOf('class="nf-sam"') >= 0;
  return {n:sam.length, leer:leer.slice(0, 4), doppelt:doppelt.slice(0, 4), ergBand};
})())`));
ok(_spBand.n > 0 && _spBand.doppelt.length === 0 && _spBand.leer.length === 0,
   'das Band einer Partie-Karte nennt die Partie nicht, die darueber steht',
   _spBand.doppelt.join(' | ') || _spBand.leer.join(', ')
     || _spBand.n + ' Partie-Sammelkarten');
ok(_spBand.ergBand,
   'und die Karte zweier Ergebnisse behaelt ihr Band', String(_spBand.ergBand));

// ── Eine Pleitenserie sagt, wie lange der letzte Sieg her ist ────────
// „Fuenf Niederlagen am Stueck." nannte die Zahl und sonst nichts: ob das
// vor zwei Wochen oder gestern anfing, stand nirgends, und genau das ist die
// Frage, die eine Durststrecke aufwirft.
const _lstr = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const ls = roh.filter(s => (s.dataRef||{}).type === 'loss_streak');
  return {n:ls.length,
    ohne: ls.filter(s => !/\\d{2}\\.\\d{2}\\./.test(String(s.desc||'')))
      .map(s => s.desc).slice(0, 3)};
})())`));
ok(_lstr.n === 0 || _lstr.ohne.length === 0,
   'jede Pleitenserie nennt den Tag, vor dem der letzte Sieg liegt',
   _lstr.ohne.join(' | ') || _lstr.n + ' Pleitenserien');

// ── Der Elo-Gewinn gehoert einem, nicht der Partie ──────────────────
// „Der Sieg bringt +19 Elo" stand da, und die Zahl ist die des STAERKEREN
// von zwei Siegern: gemessen tragen nur 24 der 466 Partien fuer beide
// dieselbe Zahl, und der Abstand geht bis 38 Elo. Gemessen wird gegen die
// rohen Deltas der Partie, nicht gegen den Wert, den die Karte selbst
// mitbringt — sonst prueft der Test seine eigene Quelle.
const _eloSatz = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const falsch = [], ohneNm = [];
  let n = 0;
  roh.forEach(s => {
    const d = s.dataRef || {};
    if(d.type !== 'spiel' || !d.elo) return;
    n++;
    const nm = d.eloPid && pmap()[d.eloPid] ? pmap()[d.eloPid].name : '';
    if(!nm){ ohneNm.push(s.id); return; }
    // Wo der Satz die Zahl NENNT, nennt er auch den Traeger. Eine Partie mit
    // Muster erzaehlt ihr eigenes Motiv und traegt den Wert nur im dataRef,
    // damit die Sammelkarte ihn hat.
    const nenntElo = String(s.desc || '').indexOf(d.elo + ' Elo') >= 0;
    if(nenntElo && String(s.desc || '').indexOf(nm) < 0){ falsch.push(s.desc); return; }
    // Und die Zahl ist wirklich sein Delta, und das groesste der Sieger.
    const m = (matches || []).find(x => x.id === d.matchId);
    const dl = (m && m.deltas) || {};
    const eigen = Math.round(dl[d.eloPid] || 0);
    const best = (d.winners || []).map(id => Math.round(dl[id] || 0))
      .reduce((a, x) => (x > a ? x : a), 0);
    if(eigen !== d.elo || eigen !== best)
      falsch.push(s.id + ': ' + d.elo + ' gegen ' + eigen + ' / best ' + best);
  });
  return {n, falsch:falsch.slice(0, 3), ohneNm:ohneNm.slice(0, 3)};
})())`));
ok(_eloSatz.n > 0 && _eloSatz.falsch.length === 0 && _eloSatz.ohneNm.length === 0,
   'der Elo-Gewinn einer Partie nennt den Spieler, dem er gehoert',
   _eloSatz.falsch.concat(_eloSatz.ohneNm).join(' | ')
     || _eloSatz.n + ' Partien mit Elo-Gewinn');

// ── Das Blatt sagt die Aufzaehlung nicht vor ihrer eigenen Reihe ─────
// Ueber den Zellen „1 BESTMARKE / 1 AUSBAU / 2 CHRONIKEN" stand „Eine
// Bestmarke, ein Ausbau, zwei Monatschroniken und ein neues Insignium: fuer
// die Laufbahn bleiben 279 Prestige." — dieselbe Angabe zweimal in sechs
// Zeilen. Die Zahlenreihe zaehlt, der Satz sagt, was bleibt.
const _blead = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const s = getStoriesCache().find(x => (x.dataRef||{}).quelle === 'tafel');
  if(!s) return {fehlt:true};
  const html = _newsDetailBody(s);
  return {fehlt:false, lead:_ndLead(s.desc, html),
    zahlen: html.indexOf('rcp-z') >= 0, voll: s.desc};
})())`));
ok(!_blead.fehlt && _blead.zahlen && !/^[^:]{6,}:\s/.test(_blead.lead),
   'das Blatt eines Tafel-Moments zeigt die Aufzaehlung nur in seiner Zahlenreihe',
   _blead.lead.slice(0, 90));

// ── So viele Wappen wie Namen ────────────────────────────────────────
// Der Kopf zeigte immer die ersten ZWEI, waehrend die Zeile daneben bis zu
// drei Namen nennt: „Johannes, Leo und Leon bewegen die Ewige Tafel" stand
// ueber zwei Gesichtern, und welcher der drei fehlt, sagte nichts.
const _kopfN = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const falsch = [];
  let n = 0;
  getStoriesCache().forEach(s => {
    let ids = [];
    try { ids = (_newsPids(s)||[]).filter(x => pmap()[x]); } catch(e){}
    if(ids.length < 3) return;
    n++;
    // Die Runde hat ihre Tabelle als Kopf: eine Zeile je Spieler mit Gesicht.
    if((s.dataRef||{}).type === 'runde'){
      const z = (_newsRundeBlatt(s).match(/class="sp-rd-sp/g) || []).length;
      if(z !== ids.length) falsch.push(s.title + ' → ' + z + ' Zeilen von ' + ids.length);
      return;
    }
    const kopf = _newsBlattKopf(s);
    // Der Tafel-Moment zeigt oben nur den Tag als Achse; wer was bewegt
    // hat, nennt die Liste darunter, und dort steht dann jeder Genannte.
    if(kopf.indexOf('nd-ta') >= 0){
      const mitte = _newsDetailMitte(s) || '';
      const fehlt = ids.filter(x => mitte.indexOf(esc(pmap()[x].name)) < 0);
      if(fehlt.length) falsch.push(s.title + ' → Liste ohne ' + fehlt.map(x => pmap()[x].name).join(', '));
      return;
    }
    // Eine Partie trägt ihre Bühne als Kopf [§C33]: dort steht jeder
    // Genannte mit Namen, in der Zeichnung oder darunter.
    if(kopf.indexOf('nd-buehne') >= 0){
      const fehlt = ids.filter(x => kopf.indexOf(esc(pmap()[x].name)) < 0);
      if(fehlt.length) falsch.push(s.title + ' → Bühne ohne ' + fehlt.map(x => pmap()[x].name).join(', '));
      return;
    }
    // Gezaehlt wird am Markup: das Blatt zeigt jedes Wappen und keinen
    // Chip mit einem Rest — „ein Blatt zeigt alles". Die Erwartung stand auf
    // drei Wappen und „+2", galt aber nur, solange keine Story mit vier
    // Genannten diesen Kopf erreichte; die Ehrung tut es.
    const nAv = (kopf.match(/class="rav zn"/g) || []).length;
    const mehr = (kopf.match(/nd-held-mehr">\\+(\\d+)</) || [])[1];
    if(nAv !== ids.length || mehr != null)
      falsch.push(s.title + ' → ' + nAv + ' von ' + ids.length + (mehr ? ' +' + mehr : ''));
  });
  return {n, falsch:falsch.slice(0, 4)};
})())`));
ok(_kopfN.n > 0 && _kopfN.falsch.length === 0,
   'der Blattkopf zeigt so viele Wappen, wie seine Zeile Namen nennt',
   _kopfN.falsch.join(' | ') || _kopfN.n + ' Koepfe mit drei und mehr');

// ── Der Nachsatz ist ein Satz, kein Etikett ─────────────────────────
// Unter dem Schlusssprint stand „Machtwechsel an der Tabellenspitze: … Das
// Titelrennen ist wieder voellig offen" — ein Etikett mit Doppelpunkt am
// Satzanfang, ohne jede Zahl, und die offene Lage stimmt bei 91 Elo
// Vorsprung nicht [§C33]. Wo es keinen eigenen langen Satz gibt, bleibt der
// Nachsatz weg; `desc` steht schon eine Zeile hoeher. Gestellt, weil die
// echte Liga den Schlusssprint gerade nicht traegt — der Sweep ueber den
// fertigen Feed prueft den Wortlaut schon, findet dort aber nur die eine
// Breaking-Karte, die es gibt.
const _nachsatz = JSON.parse(K.eval(`JSON.stringify((function(){
  const ohne = {id:'bs-1', cat:'liga', ic:'clock', prio:91,
    when:new Date(mts(matches[matches.length-1])).toISOString(),
    title:'Noch 5 Tage', desc:'Ein Satz mit 5 Zahlen.',
    dataRef:{type:'season_endgame', sid:currentSeason(), playerIds:[]}};
  let h = '';
  try { h = _breakingHeroText(ohne) || ''; } catch(e){ h = 'FEHLER ' + e.message; }
  return {eigen: !h || String(h).trim() === String(ohne.desc).trim(),
    hat: String(h).slice(0, 70)};
})())`));
ok(_nachsatz.eigen,
   'der Schlusssprint bekommt keinen Nachsatz, weil er keinen eigenen hat',
   _nachsatz.hat || 'keiner');

// ── Eine gewoehnliche Auszeichnung deckt das Ergebnis genauso ───────
// „Zittersieg" heisst im Katalog `nail_biter` und ist auf „10:9 Sieg"
// definiert — dasselbe wie der Ein-Tor-Krimi. Er fehlte in `BADGE_DECKT`,
// und gesammelt wurde ausserdem nur aus `badge_unlocked`: eine gewoehnliche
// Auszeichnung bekommt gar keine eigene Karte, sie steht in der gemeinsamen
// Tageskarte `badge_marken`. Gemessen hiess die Karte des 25.08. damit
// „Ein-Tor-Krimi und Auszeichnung in einer Partie", waehrend ihre Zeile
// „Johannes holt ‚Zittersieg' zum 5. Mal || 10:9 Sieg" trug.
const _deckt = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  // Welche Partien tragen eine Marke, die ihr Ergebnis schon erzaehlt?
  const deckt = {zu_null:['perfect_win'], upset:['upset_king'],
                 krimi:['krimi', 'nerves_of_steel', 'nail_biter'],
                 eng:['krimi', 'nerves_of_steel']};
  const jeMatch = {};
  roh.forEach(s => {
    const d = s.dataRef || {};
    if(d.type === 'badge_unlocked' && d.matchId && d.badgeId)
      (jeMatch[d.matchId] = jeMatch[d.matchId] || []).push(d.badgeId);
    if(d.type === 'badge_marken')
      (d.marken || []).forEach(m => {
        const mid = d.matchId || (m && m.matchId);
        if(mid && m && m.badgeId) (jeMatch[mid] = jeMatch[mid] || []).push(m.badgeId);
      });
  });
  const motiv = {zu_null:'Sieg ohne Gegentor', upset:'Favoritensturz',
                 krimi:'Ein-Tor-Krimi', kanter:'klarer Sieg', eng:'enges Spiel'};
  const falsch = [];
  let n = 0;
  getStoriesCache().forEach(s => {
    const d = s.dataRef || {};
    if(d.type !== 'sammel' || d.quelle !== 'spiel' || !d.matchId) return;
    // Die Zeile traegt kein resultKind — das steht an der Story, aus der
    // sie kommt. Gesucht wird sie an ihrer ID.
    const erg = (d.teile || []).find(t => String((t && (t.typ || t.type)) || '') === 'spiel');
    const src = erg && roh.find(x => x.id === erg.id);
    const kind = src && (src.dataRef || {}).resultKind;
    const liste = deckt[String(kind || '')] || [];
    const hat = jeMatch[d.matchId] || [];
    if(!liste.length || !liste.some(b => hat.indexOf(b) >= 0)) return;
    n++;
    // Gedeckt: das Motiv des Ergebnisses darf in der Schlagzeile nicht stehen.
    if(String(s.title || '').indexOf(motiv[kind]) >= 0)
      falsch.push(s.title + ' → ' + motiv[kind] + ' + ' + hat.join(','));
  });
  return {n, falsch:falsch.slice(0, 3)};
})())`));
ok(_deckt.n > 0 && _deckt.falsch.length === 0,
   'was eine Auszeichnung derselben Partie erzaehlt, nennt die Schlagzeile nicht',
   _deckt.falsch.join(' | ') || _deckt.n + ' gedeckte Partien');

// ── Dieselbe Aussage zweimal: die spaetere gilt ──────────────────────
// Die Sperrfrist laesst eine Aussage drei Tage lang nur einmal durch, und
// welche der beiden das ist, ist die Frage: die zweite traegt den Stand, der
// jetzt gilt („Der groesste Ausschlag des Tages" gehoerte gestern jemand
// anderem). Also faellt die erste, und die spaetere Wiederholung steht mit
// ihrem eigenen Zeitpunkt da. Gestellt wird ein Paar mit derselben Aussage,
// zwei Tage auseinander und mit verschiedenen Schlagzeilen, damit nicht der
// Vergleich der Schlagzeilen misst.
const _sperrRichtung = JSON.parse(K.eval(`JSON.stringify((function(){
  const a = players[0].id, b = players[1].id;
  const t0 = new Date(mts(matches[matches.length - 1])).getTime();
  const mach = (id, ms, titel) => ({id, cat:'personal', ic:'swords', prio:32,
    when:new Date(ms).toISOString(), title:titel,
    desc:'Ein Satz mit 5 Zahlen.',
    dataRef:{type:'rivalry', a, b, playerIds:[a, b]}});
  _cache._consolFrom = null;
  const raus = _consolidateStories([
    mach('rv-neu', t0, 'Das Duell steht bei 12'),
    mach('rv-alt', t0 - 2 * 86400000, 'Das Duell steht bei 11')
  ]).map(x => x.id);
  return {raus};
})())`));
ok(_sperrRichtung.raus.indexOf('rv-neu') >= 0 && _sperrRichtung.raus.indexOf('rv-alt') >= 0,
   'zwei publizierte Ereignisse bleiben trotz aehnlicher Aussage erhalten',
   _sperrRichtung.raus.join(', '));

// ── Ein Deckel vergibt seine Plaetze in der Reihenfolge der Zeit ─────
// Beide Deckel — der je Sorte und der je Tag — waehlten nach `prio` aus, und
// damit hing die Auswahl eines Tages an seinem Ende: die Karte vom Vormittag
// fiel heraus, sobald am Nachmittag eine staerkere derselben Sorte dazukam.
// Gestellt wird genau dieser Fall: zwei schwache Karten am Morgen, eine
// starke am Mittag.
const _deckelZeit = JSON.parse(K.eval(`JSON.stringify((function(){
  const p = players.map(x => x.id);
  const tag = tagKey(mts(matches[matches.length - 1]));
  const t0 = new Date(tag + 'T09:00:00').getTime();
  const k = (id, typ, prio, min, pid) => ({id, cat:'team', ic:'flame', prio,
    when:new Date(t0 + min * 60000).toISOString(),
    title:'Karte ' + id, desc:'Ein Satz mit ' + prio + ' Zahlen.',
    dataRef:{type:typ, playerIds:[pid], pid}});
  // Fuenf deckelbare Karten verschiedener Sorten: der Tagesdeckel laesst die
  // ersten proTag-Plaetze stehen.
  _cache._consolFrom = null;
  const sorten = ['rivalry','jubilee','milestone_wins','milestone_goals','top_form'];
  const tagD = _consolidateStories(sorten.map((t, i) =>
    k('d-' + i, t, i === sorten.length - 1 ? 89 : 20 + i, i * 60, p[i]))).map(s => s.id);
  return {tagD, deckel: NEWS_LIMITS.proTag};
})())`));
ok(_deckelZeit.tagD.length === 5,
   'ein Tageskontingent verwirft keine publizierte Karte',
   _deckelZeit.tagD.join(', '));
// Gefragt ist, ob jemand den Feed BEHERRSCHT. Gezaehlt wird deshalb gegen die
// Zahl der EREIGNISSE, nicht gegen die der Karten: eine Sammelkarte fasst bis
// zu vier Meldungen zusammen, und wer auf ihr steht, steht auf einer Karte,
// die vier Dinge erzaehlt. Gemessen an den Karten kam der Spitzenwert auf
// 9 von 23 (39 %), an den Ereignissen auf 9 von 35 (26 %) — dieselbe Person,
// dieselbe Woche, zwei Nenner. Der Nenner, der die Frage beantwortet, ist der
// zweite.
ok(_feed.gesichter.max <= Math.max(4, Math.ceil(_feed.ereignisse / 3)),
   'kein Spieler steht auf einem Drittel aller Ereignisse',
   _feed.gesichter.max + ' von ' + _feed.ereignisse);
// Die Gegenrechnung, damit die Buendelung keine Beherrschung verstecken kann:
// die HAELFTE der Karten bleibt in jedem Fall die Grenze.
ok(_feed.gesichter.max <= Math.ceil(_feed.sichtbar / 2),
   'und auf keiner Haelfte der Karten',
   _feed.gesichter.max + ' von ' + _feed.sichtbar);
// Der Deckel je Sorte darf niemanden ganz verschwinden lassen: die dritte
// Duo-Pleitenserie fiel weg, und mit ihr die einzige Karte, auf der die
// beiden Beteiligten in dieser Woche ueberhaupt standen. Gemessen fehlten
// danach drei von zwoelf Spielern.
const _nachhol = JSON.parse(K.eval(`JSON.stringify((function(){
  const jetzt = Date.now();
  const l = [];
  // Vier gleichartige Karten: der Deckel laesst zwei stehen. Die vierte
  // gehoert zwei Leuten, die sonst nirgends vorkommen.
  for(let i = 0; i < 4; i++) l.push({
    id:'ts_' + i, title:'Serie ' + i, desc:'Text ' + i, cat:'team', ic:'flame',
    prio:7, when:new Date(jetzt - i * 86400000 * 5).toISOString(),
    dataRef:{type:'team_streak', a:players[i*2].id, b:players[i*2+1].id,
             playerIds:[players[i*2].id, players[i*2+1].id], streak:0}});
  const raus = _consolidateStories(l);
  const drin = new Set();
  raus.forEach(s => { try { (_newsPids(s)||[]).forEach(p => drin.add(p)); } catch(e){} });
  return {karten:raus.length, spieler:drin.size};
})())`));
ok(_nachhol.karten > 2, 'der Deckel holt zurueck, was sonst ganz fehlte',
   _nachhol.karten + ' Karten');
ok(_nachhol.spieler === 8, 'und damit steht jeder Beteiligte wieder im Feed',
   _nachhol.spieler + ' von 8');

ok(_feed.gesichter.ohne.length === 0,
   'jeder gewertete Spieler kommt im Feed vor',
   _feed.gesichter.ohne.join(', ') || (_feed.gesichter.gewertet + ' gewertet, alle dabei'));
ok(_feed.gesichter.koepfe >= 8, 'der Feed zeigt viele verschiedene Gesichter',
   _feed.gesichter.koepfe + ' Köpfe');
ok(_feed.kleinsteMoeglich === true,
   'auch ein Spieler mit wenigen Partien kann eine Story bekommen');
ok(_feed.partienImFenster > 20 && _feed.partienOhneKarte === 0,
   'jede Partie des Fensters steht in einer sichtbaren Karte',
   _feed.partienImFenster + ' Partien, ' + _feed.partienOhneKarte + ' ohne Karte');
// Und auch dann, wenn ihre Karte mit einer Meldung OHNE Partie bündelt. Eine
// Rivalität oder der Countdown traegt keine `matchId`, das Bündel nach Minute
// damit auch nicht, und es zaehlte gegen den Deckel je Sorte, der je Tag nur
// die ersten zwei behaelt. Gemessen am 01.10.: die fuenfte Partie des Tages
// um 15:08 lag in der Datenbank und stand nirgends im Feed. Gestellt an fuenf
// echten Partien eines Tages, jede mit einer solchen Begleitmeldung.
const _buendelPartie = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories().filter(s => (s.dataRef||{}).type === 'spiel');
  const tage = {}; roh.forEach(s => { (tage[tagKey(s.when)] = tage[tagKey(s.when)] || []).push(s); });
  const tag = Object.keys(tage).filter(k => tage[k].length >= 5).sort().pop();
  const spiele = tage[tag].slice(0, 5);
  const begleit = spiele.map((s, i) => ({id:'rv_' + i, cat:'highlight', ic:'swords', prio:45,
    title:'Begleitung ' + i, desc:'Eine Meldung mit ' + (i + 2) + ' Zahlen.', when:s.when,
    dataRef:{type:'rivalry', playerIds:s.dataRef.winners.slice()}}));
  _cache._consolFrom = null;
  const feed = _consolidateStories(spiele.concat(begleit)
    .sort((a, b) => new Date(b.when) - new Date(a.when)));
  const drin = new Set();
  feed.forEach(s => { drin.add(s.id); ((s.dataRef||{}).teile||[]).forEach(t => t.id && drin.add(t.id)); });
  return {n:spiele.length, fehlt:spiele.filter(s => !drin.has(s.id)).map(s => datumFmt(s.when, 'uhr'))};
})())`));
ok(_buendelPartie.n === 5 && _buendelPartie.fehlt.length === 0,
   'auch eine Partie, die mit einer Meldung ohne Partie buendelt, steht im Feed',
   _buendelPartie.fehlt.join(', ') || _buendelPartie.n + ' Partien');
// Den Zeitpunkt einer Partie setzt der Server, `now` das Telefon. Geht dessen
// Uhr zwei Sekunden nach, gilt die gerade gespeicherte Partie im ersten Lauf
// als kuenftig — und der Memo des Generators hielt genau dieses Ergebnis
// fest, bis die naechste Partie kam. Gestellt: die Uhr zwei Sekunden vor der
// letzten Partie, dann eine Minute danach, ohne neue Partie dazwischen.
const _uhrVersatz = (() => {
  const Echt = globalThis.Date;
  const letzte = K.eval('mts(matches[matches.length - 1])');
  const lid = K.eval('matches[matches.length - 1].id');
  const stellen = ms => { globalThis.Date = class extends Echt {
    constructor(...a){ if(a.length===0) super(ms); else super(...a); }
    static now(){ return ms; } }; };
  try {
    K.eval('invalidateCache(); 0');
    stellen(letzte - 2000);
    const vorher = K.eval(`_buildStories().some(s => s.id === 'spiel_${lid}')`);
    stellen(letzte + 60000);
    const nachher = K.eval(`_buildStories().some(s => s.id === 'spiel_${lid}')`);
    return {vorher, nachher};
  } finally { globalThis.Date = Echt; K.eval('invalidateCache(); 0'); }
})();
ok(!_uhrVersatz.vorher && _uhrVersatz.nachher,
   'eine Partie, die fuer die Uhr des Telefons noch kuenftig war, kommt nach, sobald die Uhr sie einholt',
   JSON.stringify(_uhrVersatz));
ok(_feed.matchKarten >= 3 && _feed.matchResult > 0,
   'der Feed erzaehlt regelmaessig von konkreten und besonderen Partien',
   _feed.matchKarten + ' Karten mit Matchbezug, ' + _feed.matchResult + ' Ergebnisgeschichte');
ok(_feed.matchOhneBand.length === 0,
   'jede konkrete Partie zeigt Ergebnis und Beteiligte direkt auf der Karte',
   _feed.matchOhneBand.join(', ') || 'alle mit Ergebnisband');
console.log('  ' + _feed.roh + ' erzeugt, ' + _feed.sichtbar + ' im Feed · '
  + _feed.mitSpieler + ' mit Spieler, davon ' + _feed.wappen + ' mit Wappen');

ok(_feed.ohneGesicht === 0,
   'jede Story mit Spieler traegt sein Gesicht',
   _feed.ohneGesicht + ' ohne');
ok(_feed.wappen > 0,
   'die Einzelspieler-Karten tragen das Wappen wie ueberall sonst',
   _feed.wappen + ' von ' + _feed.mitSpieler);
// Bis drei Beteiligte stehen alle Gesichter, ab vier zwei und die Zahl der
// übrigen. Bei dreien stand „+1" an der Stelle des dritten Gesichts: so
// breit wie das Gesicht und ohne zu sagen, wer es ist.
const _gesichter = JSON.parse(K.eval(`JSON.stringify([2, 3, 4, 6].map(n => {
  const h = _newsGesichtHtml({id:'g' + n, cat:'tafel', dataRef:{type:'tafel_moment',
    playerIds:players.slice(0, n).map(p => p.id)}});
  return n + ':' + ((h.match(/class="av[ "]/g) || []).length - (h.match(/nf-face-mehr/g) || []).length)
    + '/' + ((h.match(/nf-face-mehr">\\+(\\d+)/) || [])[1] || '-'); }))`));
ok(_gesichter.join(' ') === '2:2/- 3:3/- 4:2/2 6:2/4',
   'bis drei Beteiligte stehen alle Gesichter, ab vier zwei und die Zahl der übrigen',
   _gesichter.join(' · '));
// Mehrere Bewegungen auf der Insignium-Karte: eine neue Stufe vor einem
// neuen Grad, und darunter die wertvollere Stufe zuerst, auch wenn sie
// jemand wieder trägt. Vorher ging „zum ersten Mal" vor: zwei Volutenkränze
// trugen die Bühne, der Lorbeerreif stand klein darunter. Eine gespeicherte
// Karte in alter Reihenfolge wird beim Anzeigen ebenso geordnet.
const _insOrdnung = JSON.parse(K.eval(`JSON.stringify((function(){
  const p = players.slice(0, 4).map(x => x.id);
  const L = (stufe, grad, punkte) => ({stufe, grad, punkte});
  const zuege = [{pid:p[0], art:'auf', vor:L(1,2,1150), nach:L(2,0,1220)},
                 {pid:p[3], art:'grad', vor:L(5,0,4400), nach:L(5,1,4750)},
                 {pid:p[1], art:'auf', vor:L(1,2,1180), nach:L(2,0,1210)},
                 {pid:p[2], art:'auf', vor:L(3,2,3050), nach:L(4,0,3150), wieder:true}];
  const s = {id:'instag_ordnung', cat:'tafel', ic:'award', when:new Date(), prio:60, title:'alt', desc:'alt',
    dataRef:{type:'insignium_tag', tag:'2026-10-12', zuege, playerIds:p}};
  const neu = _insAltZuTag([s])[0];
  const h = String(_newsCardHtmlM2(neu, false, false));
  const kopf = (h.match(/class="ni-b [^"]*" data-pid="([^"]+)"/) || [])[1];
  const zeilen = (h.match(/class="ni-z ni-[a-z]+" data-pid="[^"]+"/g) || [])
    .map(x => p.indexOf(x.match(/data-pid="([^"]+)"/)[1]));
  return {kopf:p.indexOf(kopf), zeilen:zeilen.join(','), titel:neu.title,
    titelVorn:neu.title.indexOf('Lorbeerreif für ' + pmap()[p[2]].name) === 0,
    gespeichert:s.dataRef.zuege[0].pid === p[0] && s.title === 'alt'};
})())`));
ok(_insOrdnung.kopf === 2 && _insOrdnung.zeilen === '0,1,3' && _insOrdnung.titelVorn && _insOrdnung.gespeichert,
   'auf der Insignium-Karte steht die wertvollste neue Stufe vorn, eine Stufe vor einem Grad',
   JSON.stringify(_insOrdnung));
ok(_feed.rufe.length === 0,
   'keine Ausrufezeichen in Schlagzeile oder Text',
   _feed.rufe.join(' | ') || 'keine');
ok(_feed.haeufung.length === 0,
   'kein Story-Typ steht an einem Tag mehr als zweimal im Feed',
   _feed.haeufung.join(', ') || 'keiner');
const _gleichtitel = JSON.parse(K.eval(`JSON.stringify((function(){
  const p = matches.slice(-2), wann = new Date(mts(p[1]));
  const l = p.map((m,i) => ({id:'gleich-'+i, title:'Dieselben Sieger',
    desc:'Das Ergebnis ist 10:5.', when:wann, prio:41, cat:'highlight',
    dataRef:{type:'spiel', matchId:m.id, playerIds:[m.a1,m.a2,m.b1,m.b2]}}));
  const out = _consolidateStories(l);
  return {ids:out.map(s => s.id), mids:out.map(s => s.dataRef.matchId)};
})())`));
ok(_gleichtitel.ids.length === 2 && new Set(_gleichtitel.mids).size === 2,
   'zwei verschiedene Partien mit gleichem Titel und gleicher Minute bleiben zwei Karten',
   _gleichtitel.ids.join(', '));

// Serienmarken sind Ereignisse ihres auslösenden Matches. Sie dürfen nicht
// rückwirkend verschwinden, nur weil der Spieler danach verloren hat.
const _serienHistorisch = JSON.parse(K.eval(`JSON.stringify((function(){
  const a=_buildStories().filter(s=>(s.dataRef||{}).type==='win_streak');
  // Die lebende Serie je Spieler, hier selbst gezaehlt: die App kennt sie
  // nicht mehr, seit jede Marke an ihrer Partie haengt und keine Karte mehr
  // rueckwirkend geloescht wird.
  const live={};
  const nachZeit=[...matches].sort((x,y)=>mts(x)-mts(y));
  nachZeit.forEach(m=>{ const aw=m.winner==='A';
    [[m.a1,aw],[m.a2,aw],[m.b1,!aw],[m.b2,!aw]].forEach(([pid,sieg])=>{
      if(pid) live[pid]=sieg?(live[pid]||0)+1:0; }); });
  const vergangen=a.filter(s=>(live[(s.dataRef||{}).pid]||0)<((s.dataRef||{}).streak||0));
  const map=new Map(matches.map(m=>[m.id,new Date(m.created_at).getTime()]));
  const falsch=a.filter(s=>!(s.dataRef||{}).matchId
    || map.get(s.dataRef.matchId)!==new Date(s.when).getTime());
  const b=_buildStories().filter(s=>(s.dataRef||{}).type==='win_streak');
  return {n:a.length,vergangen:vergangen.length,falsch:falsch.length,
    stabil:a.map(s=>s.id).join('|')===b.map(s=>s.id).join('|')};
})())`));
ok(_serienHistorisch.n > 0 && _serienHistorisch.vergangen > 0,
   'eine erreichte Serienmarke bleibt auch nach dem spaeteren Serienbruch erhalten',
   JSON.stringify(_serienHistorisch));
ok(_serienHistorisch.falsch === 0 && _serienHistorisch.stabil,
   'Serienkarten tragen Matchzeit und stabile fachliche Identitaet',
   JSON.stringify(_serienHistorisch));


console.log('\n=== 11. DER TAGESPLAN ===');
// Drei Uhrzeiten haben sich geaendert, alle drei mit einem Grund.
const _plan = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const s = _consolidateStories(roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when)));
  const potd = s.filter(x => (x.dataRef||{}).type === 'potd');
  // Die Chronik eines Monats steht auf der Karte seines Abschlusses; eigene
  // Karten fuer sie und fuer jeden Erstling gibt es nicht mehr.
  const chr  = roh.filter(x => ['chronik_monat','chronik_erstling'].indexOf((x.dataRef||{}).type) >= 0);
  const tagVon = m => { const d = new Date(m.created_at);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const spieltage = new Set(matches.map(tagVon));
  const kVon = w => { const d = new Date(w);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  return {
    // Der Spieler des Tages steht um 23:59 an dem Tag, an dem gespielt wurde.
    potdZeit: potd.map(x => new Date(x.when).getHours()+':'+String(new Date(x.when).getMinutes()).padStart(2,'0')),
    potdAmSpieltag: potd.every(x => spieltage.has(kVon(x.when))),
    chrAlt: chr.map(x => x.id),
    // Die Sammelkarte muss wirklich buendeln: jede Zeile, die sie traegt,
    // stand vorher als eigene Karte im Feed und darf jetzt nicht mehr daneben
    // stehen. Ohne diese Gegenrechnung misst die Zusicherung nichts.
    sammel: s.filter(x => (x.dataRef||{}).type === 'sammel')
             .map(x => ((x.dataRef||{}).teile||[]).length),
    sammelErsetzt: (function(){
      // Verglichen wird ueber die Schlagzeile, und die unterscheidet zwei
      // Partien nicht: „Maxi und Martin setzen sich gegen Leon und Johannes
      // durch" heisst an einem Tag mit zwei Begegnungen derselben vier Leute
      // zweimal so. Die Zeile einer Partie bleibt deshalb aussen vor.
      const einzel = s.filter(x => (x.dataRef||{}).type !== 'sammel');
      const titelImFeed = new Set(einzel.filter(x => (x.dataRef||{}).type !== 'spiel')
        .map(x => x.title));
      let daneben = 0;
      s.filter(x => (x.dataRef||{}).type === 'sammel').forEach(x => {
        ((x.dataRef||{}).teile || []).forEach(t => {
          if(t.typ === 'spiel') return;
          if(titelImFeed.has(t.titel)) daneben++; });
      });
      return daneben;
    })(),
    // Wie viele Karten haette der Feed ohne die Buendelung?
    ohneSammel: s.reduce((n, x) => n + ((x.dataRef||{}).type === 'sammel'
      ? (((x.dataRef||{}).teile||[]).length) : 1), 0),
    mitSammel: s.length
  };
})())`));
ok(_plan.potdZeit.every(t => t === '23:59'), 'der Spieler des Tages steht um 23:59',
   _plan.potdZeit.join(', ') || 'keiner');
ok(_plan.potdAmSpieltag, 'und zwar an dem Tag, an dem gespielt wurde');

// Und der Tag steht seinem eigenen Spieltag zur Verfuegung, nicht erst dem
// naechsten. Die Quelle des Generators liess JEDEN Tag ab Mitternacht aus,
// damit der Rueckblick nicht mitten im laufenden Spieltag aufspringt — damit
// konnte die Karte an ihrem eigenen 23:59 nie entstehen. Gemessen wird gegen
// den letzten Spieltag der Fixtures (26.08.); die Uhr wird dafuer kurz
// umgestellt und danach zurueck, weil die ganze Suite an FIXED haengt.
const _potdQuelle = (function(){
  const Echt = globalThis.Date;
  const stellen = ms => { globalThis.Date = class extends Echt {
    constructor(...a){ if(a.length===0) super(ms); else super(...a); }
    static now(){ return ms; } }; };
  const lies = () => { try { return K.eval('(_potdLastDayData()||{}).dayKey || null'); }
                       catch(e){ return 'FEHLER: ' + e.message; } };
  try {
    stellen(new Echt(2026, 7, 26, 18, 0, 0).getTime());
    const waehrend = lies();
    stellen(new Echt(2026, 7, 26, 23, 59, 0).getTime());
    const danach = lies();
    return {waehrend, danach};
  } finally { globalThis.Date = FakeDate; }
})();
ok(_potdQuelle.waehrend !== '2026-08-26',
   'der laufende Spieltag wird nicht schon um 18 Uhr gewertet',
   String(_potdQuelle.waehrend));
ok(_potdQuelle.danach === '2026-08-26',
   'um 23:59 gehoert der Tag sich selbst',
   String(_potdQuelle.danach));

// Der Rang kommt aus dem Generator, nicht aus der Zeile. Eine gespeicherte
// Karte trug ihre `prio` mit sich; als die Skala auf EIN Band umgestellt
// wurde, blieben die alten Zeilen auf ihrer alten Zahl stehen und der
// Tagesdeckel verglich zwei Skalen. Gemessen wird an einer Karte, die der
// Generator noch bildet (dann gilt seine Zahl), und an einer, die er nicht
// mehr bildet (dann gilt das Band ihres Typs).
const _prioFrisch = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  const kennt = frisch.find(s => s && s.prio > 40 && (s.dataRef||{}).type);
  if(!kennt) return {keine:true};
  const ausDb  = Object.assign({}, kennt, {prio: 6});
  const veraltet = {id:'diese_id_bildet_niemand_mehr', cat:'highlight',
                    title:'Alt', desc:'Alt', when: kennt.when, prio: 4,
                    dataRef:{type:'top_clash'}};
  const aus = _newsTexteAuffrischen([ausDb, veraltet]);
  const bekannt = aus.find(s => s.id === ausDb.id);
  const alt = aus.find(s => s.id === veraltet.id);
  return {bekannt: bekannt && bekannt.prio, sollBekannt: kennt.prio,
          veraltet: alt && alt.prio, sollVeraltet: STORY_PRIO.top_clash};
})())`));
ok(!_prioFrisch.keine && _prioFrisch.bekannt === 6,
   'eine gespeicherte Karte behaelt ihren publizierten Rang',
   _prioFrisch.bekannt + ' statt ' + _prioFrisch.sollBekannt);
ok(!_prioFrisch.keine && _prioFrisch.veraltet === 4,
   'auch eine historische Karte wird beim Lesen nicht umgeschrieben',
   _prioFrisch.veraltet + ' statt ' + _prioFrisch.sollVeraltet);

// Zwei Karten ueber denselben Rekord, und die aeltere nennt einen Halter,
// der keiner mehr ist: sie widerspricht der juengeren, die direkt daneben
// steht. Gemessen am 10.09. stand „Martin uebernimmt ‚Der Zerstoerer'"
// zwei Karten ueber „Jannik baut ‚Der Zerstoerer' aus". Nur BEIDES
// zusammen zaehlt: eine Uebernahme, der nichts widerspricht, bleibt eine
// Nachricht ueber ihren eigenen Tag.
const _rekAlt = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles().byId;
  const rid = Object.keys(A).find(k => A[k] && (A[k].pids||[]).length);
  if(!rid) return {keine:true};
  const halter = A[rid].pids;
  const fremd = (players||[]).find(p => p && !halter.includes(p.id));
  if(!fremd) return {keine:true};
  const t = Date.now();
  const mach = (id, typ, pids, ms, titel) => ({id, cat:'tafel', ic:'award',
    title:titel, desc:'Beleg mit 7 Zahlen.', when:new Date(ms), prio:70,
    dataRef:{type:typ, rekordId:rid, playerIds:pids, vorher:[]}});
  const alt  = mach('rek_pruef_alt',  'rekord_geholt',      [fremd.id], t-3600000, 'Alt uebernimmt');
  const neuK = mach('rek_pruef_neu',  'rekord_gesteigert', halter.slice(0,1), t, 'Neu baut aus');
  // Zwei Tafel-Karten desselben Tages werden gebuendelt: gesucht wird die
  // Aussage, egal ob sie als Karte oder als Zeile darin steht.
  const drin = (liste, titel) => liste.some(x => x.title === titel
    || (((x.dataRef||{}).teile)||[]).some(t => t && t.titel === titel));
  const zusammen = _consolidateStories([neuK, alt]);
  const allein   = _consolidateStories([Object.assign({}, alt)]);
  return {mitJuengerer: drin(zusammen, 'Alt uebernimmt'),
          juengereBleibt: drin(zusammen, 'Neu baut aus'),
          alleine: drin(allein, 'Alt uebernimmt')};
})())`));
ok(!_rekAlt.keine && _rekAlt.mitJuengerer === true,
   'eine historische Rekord-Uebernahme bleibt als Ereignis erhalten',
   String(_rekAlt.mitJuengerer));
ok(!_rekAlt.keine && _rekAlt.juengereBleibt === true,
   'die Karte, die noch gilt, bleibt',
   String(_rekAlt.juengereBleibt));
ok(!_rekAlt.keine && _rekAlt.alleine === true,
   'und eine Uebernahme, der nichts widerspricht, bleibt auch',
   String(_rekAlt.alleine));

// Dasselbe fuer die Monatschronik: auch dort wird ein Feld im Lauf eines
// Tages enger und weiter. Gemessen am 08.09. stand „Leo holt ‚Ohne
// Schwachstelle'", neun Minuten spaeter „Leo und Maxi holen ‚Ohne
// Schwachstelle'" und drei Stunden danach „Maxi holt ‚Ohne Schwachstelle'"
// — dreimal dieselbe Chronik an einem Tag.
const _chronAlt = JSON.parse(K.eval(`JSON.stringify((function(){
  const T = seasonTitles(currentSeason().id).awarded || [];
  if(!T.length) return {keine:true};
  const tid = T[0].titleId, halter = T.filter(a => a.titleId === tid).map(a => a.pid);
  const fremd = (players||[]).find(p => p && !halter.includes(p.id));
  if(!fremd) return {keine:true};
  const t = Date.now();
  const mach = (id, pids, ms, titel) => ({id, cat:'tafel', ic:'award', title:titel,
    desc:'Beleg mit 7 Zahlen.', when:new Date(ms), prio:62,
    dataRef:{type:'chronik_geholt', titleId:tid, playerIds:pids, vorher:[]}});
  const alt  = mach('chr_pruef_alt', [fremd.id], t-3600000, 'Fremd holt sie');
  const neuK = mach('chr_pruef_neu', halter.slice(0,1), t, 'Halter holt sie');
  const drin = (liste, titel) => liste.some(x => x.title === titel
    || (((x.dataRef||{}).teile)||[]).some(y => y && y.titel === titel));
  const zus = _consolidateStories([neuK, alt]);
  return {alteDrin: drin(zus, 'Fremd holt sie'), neueDrin: drin(zus, 'Halter holt sie')};
})())`));
ok(!_chronAlt.keine && _chronAlt.alteDrin === true,
   'auch eine historische Monatschronik bleibt im Tagesbuendel erhalten',
   String(_chronAlt.alteDrin));
ok(!_chronAlt.keine && _chronAlt.neueDrin === true,
   'und die Chronik-Karte, die noch gilt, bleibt',
   String(_chronAlt.neueDrin));

// Der Deckel je Sorte behaelt die zwei juengsten. Was es je Tag genau einmal
// gibt, faellt nie darunter: der Feed reicht vierzehn Tage zurueck, darin
// liegen sechs bis sieben Spieltage, und gemessen standen zwei ihrer Sieger
// im Feed. „Leo ist Spieler des Tages" und „Alex ist Spieler des Tages" sind
// keine Wiederholung voneinander, sie gehoeren zwei verschiedenen Tagen.
const _tagesSieger = JSON.parse(K.eval(`JSON.stringify((function(){
  const t = Date.now();
  const namen = ['Aa','Bb','Cc','Dd','Ee'];
  const karten = namen.map((n, i) => ({
    id:'potd_pruef_'+i, cat:'highlight', ic:'dayKing',
    title:n+' ist Spieler des Tages',
    desc:'5 von 7 Spielen gewonnen, das sind 71 %.',
    when:new Date(t - i*86400000), prio:STORY_PRIO.potd,
    dataRef:{type:'potd', dayKey:'pruef'+i, playerId:'x'+i, wins:5, games:7}}));
  const aus = _consolidateStories(karten);
  return {gebaut: karten.length,
          imFeed: aus.filter(s => (s.dataRef||{}).type === 'potd').length};
})())`));
ok(_tagesSieger.imFeed === _tagesSieger.gebaut,
   'jeder Spieltag behaelt seinen Sieger, auch der fuenfte im Fenster',
   _tagesSieger.imFeed + ' von ' + _tagesSieger.gebaut);

// Und derselbe Spieler darf zwei Spieltage gewinnen. Die Schlagzeile ist
// dann wortgleich, der Text nicht: gemessen gewann Martin den 02.09. mit
// 3 von 3 und den 08.09. mit 5 von 7. Die aeltere Karte fiel weg, weil
// beide „Martin ist Spieler des Tages" heissen.
const _zweiTage = JSON.parse(K.eval(`JSON.stringify((function(){
  const t = Date.now();
  const mach = (i, wins, spiele) => ({id:'potd_gleich_'+i, cat:'highlight',
    ic:'dayKing', title:'Martin ist Spieler des Tages',
    desc: wins+' von '+spiele+' Spielen gewonnen. Tag '+i+'.',
    when:new Date(t - i*86400000), prio:STORY_PRIO.potd,
    dataRef:{type:'potd', dayKey:'g'+i, playerId:'m', wins:wins, games:spiele}});
  const aus = _consolidateStories([mach(0,5,7), mach(6,3,3)]);
  const gleich = _consolidateStories([mach(0,5,7), Object.assign(mach(6,5,7),
    {id:'potd_gleich_x', desc:'5 von 7 Spielen gewonnen. Tag 0.'})]);
  return {verschieden: aus.filter(s => (s.dataRef||{}).type==='potd').length,
          wortgleich: gleich.filter(s => (s.dataRef||{}).type==='potd').length};
})())`));
ok(_zweiTage.verschieden === 2,
   'derselbe Spieler darf zwei Spieltage gewinnen',
   _zweiTage.verschieden + ' von 2');
ok(_zweiTage.wortgleich === 2,
   'verschiedene IDs bleiben auch bei identischem Wortlaut zwei Ereignisse',
   _zweiTage.wortgleich + ' statt 2');

// Ein Spieler zeigt je Monat nur EINE Chronik. Holt er mehrere, sagt die
// Karte welche — sonst zaehlt sie zwei auf und laesst offen, welche ihn im
// Profil beschreibt.
const _zeigtSich = JSON.parse(K.eval(`JSON.stringify((function(){
  const sid = currentSeason().id;
  const T = seasonTitles(sid).awarded || [];
  const proPid = {};
  T.forEach(a => (proPid[a.pid] = proPid[a.pid] || []).push(a));
  const mehrere = Object.keys(proPid).filter(p => proPid[p].length > 1);
  if(!mehrere.length) return {keine:true};
  const pid = mehrere[0];
  const gezeigt = seasonTitleOf(pid, sid);
  const andere = proPid[pid].find(a => a.titleId !== gezeigt.titleId);
  const einer = Object.keys(proPid).find(p => proPid[p].length === 1);
  return {faelle: mehrere.length,
    aufGezeigte: (_chronikZeigtSich([pid], sid, gezeigt.titleId)||{}).zeigt,
    aufAndere:   (_chronikZeigtSich([pid], sid, andere.titleId)||{}).zeigt,
    beiEinem:    einer ? _chronikZeigtSich([einer], sid, proPid[einer][0].titleId) : 'keiner',
    beiZweien:   _chronikZeigtSich([pid, 'x'], sid, gezeigt.titleId),
    // Und die Marke muss im Band wirklich stehen.
    band: _newsSammelBand([
      {ic:'award', titel:'holt A', marke:'in der Chronik'},
      {ic:'award', titel:'holt B', marke:''}], [], true)};
})())`));
ok(!_zeigtSich.keine && _zeigtSich.faelle > 0,
   'es gibt Spieler mit mehreren Chroniken im Monat',
   String(_zeigtSich.faelle));
ok(_zeigtSich.aufGezeigte === true,
   'die Chronik, die in der Tafel steht, ist als solche erkannt',
   String(_zeigtSich.aufGezeigte));
ok(_zeigtSich.aufAndere === false,
   'und die zweite desselben Monats ist es nicht',
   String(_zeigtSich.aufAndere));
ok(_zeigtSich.beiEinem === null || _zeigtSich.beiEinem === 'keiner',
   'bei nur einer Chronik gibt es nichts zu unterscheiden',
   JSON.stringify(_zeigtSich.beiEinem));
ok(_zeigtSich.beiZweien === null,
   'und bei zwei Haltern wird nichts behauptet',
   JSON.stringify(_zeigtSich.beiZweien));
ok(_zeigtSich.band.indexOf('nf-sam-k') >= 0
   && _zeigtSich.band.indexOf('in der Chronik') >= 0,
   'das Sammelband zeigt die Marke',
   _zeigtSich.band.slice(0, 90));
ok(_plan.chrAlt.length === 0, 'die Chronik des Monats hat keine eigene Karte neben seinem Abschluss',
   _plan.chrAlt.join(', '));

// ── Der Abschluss steht ueber dem Abend, der ihn beschliesst ─────────
// EINE Karte je Monat, am 1. um 00:00: beim ersten Oeffnen nach dem
// Monatswechsel ist sie die juengste. Sie stand am letzten Tag um 23:50 und
// damit unter dem Spieler dieses Tages (23:59), die Chronik am 1. um 00:00
// als eigene Karte und jeder Erstling als eine weitere. Das Team der Saison
// und die Zeichen, die erst mit den Titeln kamen, standen auf keiner.
// Der Generator bildet sie nur in den ersten zwei Tagen einer Saison; dafuer
// wird die Uhr kurz verstellt.
const _amErsten = (ms, code) => {
  const Echt = globalThis.Date;
  globalThis.Date = class extends Echt {
    constructor(...a){ if(a.length===0) super(ms); else super(...a); }
    static now(){ return ms; } };
  try {
    return JSON.parse(K.eval(`JSON.stringify((function(){
      invalidateCache();
      _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
      const roh = _buildStories();
      ${code}
    })())`));
  } finally {
    globalThis.Date = FakeDate;
    K.eval('(function(){ invalidateCache();'
      + ' _cache._buildStoriesKey = null; _cache._buildStoriesResult = null; })()');
  }
};
const _recap = _amErsten(new RealDate(2026, 7, 1, 12, 0, 0).getTime(), `
  return roh.filter(x => (x.dataRef||{}).type === 'season_recap').map(x => {
    const d = new Date(x.when), r = x.dataRef, aw = seasonTitles(r.sid).awarded;
    const karte = _newsCardHtmlM2(x, false, false, '');
    return {sid:r.sid, iso:d.toISOString(), zeit:d.toTimeString().slice(0, 8),
      // seasonEnd ist die letzte Millisekunde des Monats: eine danach.
      erster:d.getTime() === seasonEnd(r.sid).getTime() + 1,
      breaking:_isBreaking(x),
      team:(r.team && r.team.pids || []).length, teamSoll:(seasonTeamOf(r.sid) || []).filter(Boolean).length,
      eintraege:r.chronik ? r.chronik.eintraege : -1, eintraegeSoll:aw.length,
      erstFalsch:((r.chronik || {}).erstlinge || []).filter(e =>
        (seasonTitleHistory(e.pid) || []).some(t => t.title && t.sid < r.sid)).map(e => pname(e.pid)),
      erstSoll:[...new Set(aw.map(a => a.pid))].filter(pid =>
        !(seasonTitleHistory(pid) || []).some(t => t.title && t.sid < r.sid)).length,
      erst:((r.chronik || {}).erstlinge || []).length,
      zeichen:(r.zeichen || []).length,
      band:/class="nf-mb"/.test(karte), felder:(karte.match(/class="nf-mb-f /g) || []).length,
      zeilen:(karte.match(/class="ni-z ni-/g) || []).length,
      nachsatzDoppelt:/holt den Titel|ist entschieden/.test(karte)};
  });`);
ok(_recap.length === 1, 'am Monatsersten steht genau ein Monatsabschluss', _recap.length + ' Karten');
ok(_recap.every(x => x.zeit === '00:00:00' && x.erster),
   'er steht am 1. um 00:00, am Ende des Monats, von dem er erzaehlt',
   _recap.map(x => x.sid + ' -> ' + x.iso).join(', ') || 'keiner');
ok(_recap.every(x => x.breaking), 'und er ist Breaking');
ok(_recap.every(x => x.team === 2 && x.teamSoll === 2), 'er traegt das Team der Saison',
   JSON.stringify(_recap.map(x => [x.team, x.teamSoll])));
ok(_recap.every(x => x.eintraege === x.eintraegeSoll && x.eintraege > 0),
   'und die Chronik des Monats mit jedem Eintrag', JSON.stringify(_recap.map(x => [x.eintraege, x.eintraegeSoll])));
ok(_recap.every(x => x.erst === x.erstSoll && !x.erstFalsch.length),
   'und genau die, die zum ersten Mal darin stehen',
   JSON.stringify(_recap.map(x => [x.erst, x.erstSoll, x.erstFalsch])));
ok(_recap.every(x => x.band && x.felder === 2 && x.zeilen === x.zeichen),
   'die Karte zeigt Team und Chronik als Felder und jedes Zeichen, das mit den Titeln kam, als Zeile',
   JSON.stringify(_recap.map(x => [x.band, x.felder, x.zeilen, x.zeichen])));
ok(_recap.every(x => !x.nachsatzDoppelt), 'und wiederholt die Schlagzeile nicht');

// Endet ein Monat an einem Sonntag, kommen drei Abschluesse in einer Minute:
// der Tag, die Woche und der Monat — in dieser Reihenfolge. Der 31.05.2026
// war ein Sonntag ohne Partie; gestellt werden drei Siege desselben Duos.
const _reihe = _amErsten(new RealDate(2026, 5, 1, 9, 0, 0).getTime(), `
  const alt = matches.slice();
  const deltas = d => { const rc = simulateEloWithSliders(matches), m = {};
    rc.history.forEach(h => { m[h.matchId] = h.deltas; }); matches.forEach(x => { x.deltas = m[x.id] || {}; }); };
  const vorlage = alt.find(m => tagKey(mts(m)) === '2026-05-27');
  try {
    matches = alt.concat([0, 1, 2].map(i => Object.assign({}, vorlage, {id:'so31_' + i,
      created_at:new Date(2026, 4, 31, 15, i * 20).toISOString(), games_a:10, games_b:4, winner:'A'})));
    deltas(); invalidateCache(); _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const neu = _buildStories();
    const art = t => neu.find(x => (x.dataRef||{}).type === t && tagKey(x.when) >= '2026-05-31');
    const z = x => x ? new Date(x.when).getTime() : null;
    const iso = x => x ? new Date(x.when).toString().slice(4, 24) : '-';
    const p = art('potd'), w = art('woche'), m = art('season_recap');
    return {potd:z(p), woche:z(w), monat:z(m), text:[p, w, m].map(iso).join(' < ')};
  } finally { matches = alt; deltas(); }`);
ok(_reihe.potd && _reihe.woche && _reihe.monat
   && _reihe.potd < _reihe.woche && _reihe.woche < _reihe.monat
   && _reihe.woche - _reihe.potd === 5000,
   'Spieler des Tages, dann die Woche fuenf Sekunden spaeter, dann der Monat', _reihe.text);

// ── Was erst mit dem Schluss kommt [§11.0e] ─────────────────────────
// Der Spieler des Tages, der Woche, der Award-Sammler, Unschlagbar,
// Untouchable entstehen ohne Partie. Keine Karte nannte sie, und wer durch
// sie eine Stufe weiter stand, stand in keinem Vergleich: der Stand eine
// Millisekunde vor dem Wochenschluss trug den Spieler der Woche schon, sobald
// die Woche nach der Uhr vorbei war (`_periodeOffen`). Gemessen an den
// echten Partien: der Wochenschluss am 29.06. hob Leon um einen Grad, der
// am 03.08. brachte Julian den Award-Sammler, der Monatsschluss im Juli Leon
// und Martin Untouchable.
const _schlussAm = (ms, code) => _amErsten(ms, `
  const bestand = _cache._stories;
  try { _cache._stories = []; _cache._buildStoriesKey = null;
    const roh = _buildStories();
    ${code}
  } finally { _cache._stories = bestand; }`);
const _J = IDS[NAMES.indexOf('Julian')], _M = IDS[NAMES.indexOf('Martin')],
      _L = IDS[NAMES.indexOf('Leon')], _X = IDS[NAMES.indexOf('Maxi')];

// Der Tag endet vor dem Monat (23:59:59) und beginnt nach der Woche (Mo 00:00).
const _grenzen = JSON.parse(K.eval(`JSON.stringify((function(){
  const pos = (pid, t) => insigniumPos(prestigeOf(pid, t));
  // Gemessen werden Punkte und nicht der Grad: Martins Vize-Titel hob ihn
  // einmal um einen Grad, seit „Neuland" und „Der Zerstörer" ihm Rekorde
  // geben, steht er schon vorher darauf. Der 30.06. bleibt der Prüfstein,
  // weil er der letzte Tag seines Monats ist.
  const pkt = (pid, t) => prestigeOf(pid, t).punkte;
  const juni30 = _storyTagGrenzen(new Date(2026, 5, 30, 12).getTime());
  const juni29 = _storyTagGrenzen(new Date(2026, 5, 29, 12).getTime());
  const woche = new Date(2026, 5, 29).getTime();
  return {
    monat: pkt('${_M}', juni30.nachMs) < pkt('${_M}', seasonEnd('2026-06').getTime()),
    monatText: Math.round(pkt('${_M}', juni30.nachMs)) + ' -> ' + Math.round(pkt('${_M}', seasonEnd('2026-06').getTime())),
    woche: pos('${_L}', juni29.vorMs) === pos('${_L}', woche) && pos('${_L}', woche) > pos('${_L}', woche - 1),
    wocheText: pos('${_L}', woche - 1) + ' -> ' + pos('${_L}', juni29.vorMs)
  };
})())`));
ok(_grenzen.monat, 'der letzte Tag des Monats endet vor dessen Schluss: Martins Prestige aus dem Vize-Titel steht nicht in der Karte des 30.06.', _grenzen.monatText);
ok(_grenzen.woche, 'ein Montag beginnt nach dem Schluss der Woche: Leons Grad aus dem Spieler der Woche steht nicht in der Karte des 29.06.', _grenzen.wocheText);

// Der Tag: was er vergab, steht unter seinem Spieler des Tages [§11.6f],
// alles, aus den Partien und mit seinem Schluss, mit allen Klassen und dem
// Spieler des Tages selbst. Seltenes und Legendaeres des Schlusses stand
// dort einmal als Zeile, das Gewoehnliche Tage spaeter in der Ehrung einer
// Runde; danach stand je Tag eine eigene Ehrung direkt daneben und nannte
// den Spieler des Tages ein zweites Mal, und je Runde noch eine.
const _tagSchluss = _schlussAm(FIXED, `
  const p = roh.find(x => x.id === 'potd_2026-08-26');
  const d = (p && p.dataRef) || {};
  const q = (d.ehrung || []).flatMap(x => x.posten.map(y => Object.assign({pid:x.pid}, y)));
  const html = p ? _newsCardHtmlM2(p, false, false, '') : '';
  const blatt = p ? String((_ndPotdBlatt(p) || {}).mitte || '') : '';
  return {da:!!p, maxi:q.some(y => y.pid === '${_X}' && y.id === 'allwetter' && y.mal === 1 && y.bis === 1 && y.p > 0),
    potd:q.some(y => y.id === 'potd' && y.p > 0),
    gewoehnlich:roh.filter(x => (x.dataRef||{}).type === 'potd').some(x => (x.dataRef.ehrung || []).some(y => y.posten.some(z => z.klasse === 'common'))),
    karte:/class="nf-eht"/.test(html) && /Ehrung des Tages/.test(html) && /Allwetter/.test(html),
    blatt:/Die Ehrung des Tages/.test(blatt) && /class="eh-p"/.test(blatt),
    // Alles, was der Tag vergab: dieselbe Zahl wie der Unterschied der
    // Laufbahn an den Grenzen des Tages.
    zahl:(d.ehrung || []).reduce((n, x) => n + x.posten.reduce((m, y) => m + y.mal, 0), 0),
    soll:(g => rcpEhrungHtml(rcpLaufbahnDaten(g.vorMs + 1, g.nachMs)).zahl)(_storyTagGrenzen(new Date(2026, 7, 26, 12).getTime())),
    voll:d.ehrungVoll === true,
    // Keine eigene Karte für diesen Tag und keine Ehrung je Runde. Tage ohne
    // Spieler des Tages haben ihre Karte des Tages, dieser hat ihn.
    tage:roh.filter(x => /^tagesehrung_/.test(x.id)).length,
    eigene:roh.filter(x => /^(ehrung_tag_|tagesehrung_)2026-08-26/.test(x.id) || ((x.dataRef||{}).type === 'ehrung' && !x.dataRef.periode)).length};`);
ok(_tagSchluss.da && _tagSchluss.maxi && _tagSchluss.potd,
   'der Schluss des 26.08. vergibt Maxi Allwetter, und die Karte des Spielers des Tages traegt es samt dem Spieler des Tages', JSON.stringify(_tagSchluss));
ok(_tagSchluss.gewoehnlich, 'die Ehrung eines Tages nennt auch das Gewoehnliche');
ok(_tagSchluss.karte && _tagSchluss.blatt && _tagSchluss.eigene === 0,
   'sie steht als Teil der Karte und ihres Blatts, ohne eigene Karte und ohne Ehrung je Runde', JSON.stringify(_tagSchluss));
ok(_tagSchluss.voll && _tagSchluss.zahl === _tagSchluss.soll && _tagSchluss.zahl > 5,
   'sie nennt alles, was der Tag vergab, so viel wie die Laufbahn an den Grenzen des Tages', JSON.stringify(_tagSchluss));

// Gespeichert liegt die Ehrung eines Tages noch als eigene Zeile
// (`ehrung_tag_<Tag>`), und ihr Spieler des Tages ist älter als sie und
// trägt keine. Abgemeldet stand die Ehrung dieser Tage nirgends mehr; sie
// geht in dessen Karte auf und reist mit. Trägt die Karte schon eine — ein
// Gerät mit der alten Fassung legte die Zeile neben eine neue —, gilt die.
const _tagAlt = _schlussAm(FIXED, `
  const p = roh.find(x => x.id === 'potd_2026-08-26');
  const sp = p.dataRef.ehrung;
  const alt = {id:'ehrung_tag_2026-08-26', cat:'badge', ic:'medal', when:new Date(2026, 7, 26, 23, 58, 30),
    prio:STORY_PRIO.ehrung, title:'Alte Ehrung des Tages', desc:'',
    dataRef:{type:'ehrung', periode:'tag', tag:'2026-08-26', playerIds:sp.map(x => x.pid), spieler:sp}};
  const ohne = Object.assign({}, p, {dataRef:Object.assign({}, p.dataRef)});
  delete ohne.dataRef.ehrung; delete ohne.dataRef.ehrungVoll; delete ohne.dataRef.ehrungBrk;
  const sicht = liste => {
    _cache._stories = liste.concat(roh.filter(x => x.id !== p.id)).sort(_storyFolge);
    _cache._consolFrom = null; _cache._frischVon = null; _cache._snapshotConsolFrom = null;
    const st = getStoriesCache();
    const k = st.find(x => x.id === p.id) || {};
    return {allein:st.some(x => x.id === alt.id), ehrung:JSON.stringify((k.dataRef || {}).ehrung) === JSON.stringify(sp),
      mit:((k.dataRef || {}).memberIds || []).includes(alt.id),
      karte:k.id ? /class="nf-eht"/.test(_newsCardHtmlM2(k, false, false, '')) : false};
  };
  const fremd = Object.assign({}, alt, {dataRef:Object.assign({}, alt.dataRef, {spieler:[]})});
  return {alt:sicht([alt, ohne]), beide:sicht([fremd, p])};`);
ok(!_tagAlt.alt.allein && _tagAlt.alt.ehrung && _tagAlt.alt.mit && _tagAlt.alt.karte,
   'eine gespeicherte Ehrung eines Tages geht in die Karte ihres Spielers des Tages auf und reist mit', JSON.stringify(_tagAlt.alt));
ok(!_tagAlt.beide.allein && _tagAlt.beide.ehrung && _tagAlt.beide.mit,
   'und trägt die Karte schon eine, gilt die', JSON.stringify(_tagAlt.beide));

// Die Woche: Award-Sammler in der Karte der Woche, die Stufe in einer
// Zeichen-Karte des Schlusses. Ob der Schluss vom 03.08. Julian neben dem
// Award-Sammler auch einen Grad gibt, hängt an der Elo der Partien und
// wechselte mit jeder Fassung des Positionsbonus [§C44]. Die Zeichen-Karte
// wird deshalb am Schluss vom 29.06. gemessen, der Leon allein mit dem
// Spieler der Woche einen Grad gibt: dort steht genau ein Grund. Bis jede
// Chronik den Grundwert und ihren Bonus brachte [§C39], war es der Schluss
// vom 15.06. mit Julian, danach der vom 27.07. mit Jannik; seit die Liga die
// Schwellen von sechsundzwanzig Chroniken selbst setzte und eine
// Schattenseite eine besondere Chronik überschattet, steht Jannik dort schon
// vorher auf dem Grad. Gemessen heben in den Fixture-Monaten nur die
// Wochenschlüsse vom 29.06. und 10.08. jemanden, beide Leon.
// Die Ehrung der Woche nennt alle Auszeichnungen der Woche, wie die Saeulen
// ihres Rueckblicks, und steht direkt unter der Wochenkarte: zur selben Zeit
// und, weil sie weniger wichtig ist, darunter (`_storyFolge`).
const _wocheSchluss = _schlussAm(new RealDate(2026, 7, 4, 8, 0, 0).getTime(), `
  const w = roh.find(x => (x.dataRef||{}).type === 'woche');
  const e = roh.find(x => x.id === 'ehrung_der_woche_2026-07-27');
  const d = (e && e.dataRef) || {};
  const q = (d.spieler || []).flatMap(x => x.posten.map(y => Object.assign({pid:x.pid}, y)));
  const z = _ehrungZeitraum(d) || {};
  const ab = new Date(2026, 6, 27).getTime(), bis = new Date(2026, 7, 3).getTime() - 1;
  const rck = rcpEhrungHtml(rcpWocheLaufbahn(ab, bis)).zahl;
  // Aus beiden Richtungen eingelesen: der Generator liefert schon in
  // Ordnung, Bestand und Realtime nicht, und eine stabile Sortierung ließe
  // die Ordnung des Generators auch ohne Gleichstand stehen.
  const folgen = [roh.slice(), roh.slice().reverse()].map(l => l.sort(_storyFolge).map(x => x.id));
  return {sammler:q.some(y => y.pid === '${_J}' && y.id === 'award_collector' && y.klasse === 'legendary' && y.bis === 1),
    potw:q.some(y => y.id === 'potw'), zr:z.vor + ' ' + z.wann, zahl:d.zahl, rck,
    titel:q.some(y => EHRUNG_SCHLUSS.monat.includes(y.id)),
    gleich:!!e && !!w && new Date(e.when).getTime() === new Date(w.when).getTime(),
    darunter:!!e && !!w && folgen.every(f => f.indexOf(e.id) === f.indexOf(w.id) + 1),
    brk:!!e && _isBreaking(e) && !!w && !_isBreaking(w) && !w.dataRef.abschluss,
    // Breaking wie jede Karte, mit dem Grund im Kleintext: welche Ehrung im
    // Balken, welche legendäre Auszeichnung des Schlusses darunter.
    balken:/class="nf-brk-band"[^]*?Ehrung der Woche/.test(e ? _newsCardHtmlM2(e, false, false, '') : ''),
    grund:((e ? _newsCardHtmlM2(e, false, false, '') : '').match(/<div class="nf-brk-sub">([^<]*)<\\/div>/) || [])[1] || '',
    gold:/nf-ehrung-zr zr-woche/.test(e ? _newsCardHtmlM2(e, false, false, '') : '') && /EHRUNG DER WOCHE/.test(e ? _newsCardHtmlM2(e, false, false, '') : ''),
    runden:roh.filter(x => (x.dataRef||{}).type === 'ehrung' && !x.dataRef.periode).length};`);
ok(_wocheSchluss.sammler && _wocheSchluss.potw && _wocheSchluss.zr === 'Geholt vom\u00a027.07. bis\u00a002.08.',
   'die Ehrung der Woche bis 02.08. nennt Julians Award-Sammler, legendaer, den Spieler der Woche und die Woche', JSON.stringify(_wocheSchluss));
ok(_wocheSchluss.zahl === _wocheSchluss.rck && _wocheSchluss.zahl > 10 && !_wocheSchluss.titel,
   'sie nennt alle Auszeichnungen der Woche wie ihr Rueckblick, ohne die Titel des Monats, der in ihr endet', JSON.stringify(_wocheSchluss));
ok(_wocheSchluss.gleich && _wocheSchluss.darunter && _wocheSchluss.gold,
   'sie steht zur Zeit der Wochenkarte direkt darunter, in deren Gold und mit eigener Rubrik', JSON.stringify(_wocheSchluss));
ok(_wocheSchluss.brk, 'der Award-Sammler aus dem Schluss macht sie zum Breaking, nicht die Wochenkarte', JSON.stringify(_wocheSchluss));
ok(_wocheSchluss.balken && _wocheSchluss.grund === 'Julian holt sich zum Schluss der Woche die legendäre Auszeichnung „Award-Sammler“, zum ersten Mal.',
   'sie traegt den Balken mit ihrer Ehrung und erzaehlt im Kleintext, wer welche legendaere Auszeichnung des Schlusses holt', JSON.stringify([_wocheSchluss.balken, _wocheSchluss.grund]));

// ── Eine legendäre aus einer Partie ist einmal Breaking ─────────────
// An ihrer Partie. Der Spieler des Tages trug sie in seiner Ehrung, und ein
// gespeicherter ohne ehrungBrk wurde an jeder legendären des ganzen Tages
// gemessen: am 28.10. stand „Absoluter Sieger" um 16:11 als Breaking an der
// Partie und um 23:59 noch einmal am Spieler des Tages. Am 26.08. holen Leon
// und Martin „Dominator" in einer Partie; weder der neue noch ein
// gespeicherter Spieler des Tages, dem eine Ehrung der Runde mit dieser
// Auszeichnung beim Anzeigen zufällt, ist Breaking. Vergibt der Schluss
// selbst eine (gestellt: der Award-Sammler), ist er es, und der Kleintext
// sagt warum.
const _einmalBrk = _schlussAm(FIXED, `
  const p = roh.find(x => x.id === 'potd_2026-08-26');
  const alt = Object.assign({}, p, {dataRef:Object.assign({}, p.dataRef)});
  delete alt.dataRef.ehrung; delete alt.dataRef.ehrungVoll; delete alt.dataRef.ehrungBrk;
  const leg = p.dataRef.ehrung.filter(x => x.posten.some(q => q.klasse === 'legendary'));
  const runde = {id:'ehrung_m_alt', cat:'badge', ic:'medal', when:new Date(2026, 7, 26, 18, 30), prio:STORY_PRIO.ehrung,
    title:'Alte Ehrung einer Runde', desc:'', dataRef:{type:'ehrung', ab:new Date(2026, 7, 26, 15).getTime(), bis:new Date(2026, 7, 26, 16, 30).getTime(),
      playerIds:leg.map(x => x.pid), spieler:leg}};
  const zus = _consolidateStories([alt, runde]).find(x => x.id === p.id);
  const echt = _ehrungTagesSchluss;
  let gestellt = null;
  try {
    _ehrungTagesSchluss = ms => tagKey(ms) === '2026-08-26'
      ? [{pid:'${_X}', summe:70, posten:[{id:'award_collector', name:'Award-Sammler', ic:'medalTrio', klasse:'legendary', mal:1, bis:1, p:70}]}] : echt(ms);
    _ehrungGrundMemo.delete(matches);
    const html = _newsCardHtmlM2(zus, false, false, '');
    gestellt = {brk:_isBreaking(zus), grund:(html.match(/<div class="nf-brk-sub">([^<]*)<\\/div>/) || [])[1] || ''};
  } finally { _ehrungTagesSchluss = echt; _ehrungGrundMemo.delete(matches); }
  const saetze = [_ehrungBrkSatz([{pid:'${_X}', name:'Award-Sammler', bis:3}], 'tag'),
    _ehrungBrkSatz([{pid:'${_X}', name:'Award-Sammler', bis:1}, {pid:'${_X}', name:'Unantastbar', bis:2}], 'woche'),
    _ehrungBrkSatz([{pid:'${_X}', name:'Award-Sammler', bis:1}, {pid:'${_J}', name:'Unantastbar', bis:1}], 'tag')];
  return {saetze, legendaer:leg.length, neu:_isBreaking(p), alt:_isBreaking(zus), traegt:(zus.dataRef.ehrung || []).some(x => x.posten.some(q => q.klasse === 'legendary')),
    partie:roh.some(x => _isBreaking(x) && (x.dataRef||{}).matchId && tagKey(x.when) === '2026-08-26'), gestellt};`);
ok(_einmalBrk.legendaer > 0 && _einmalBrk.traegt && !_einmalBrk.neu && !_einmalBrk.alt && _einmalBrk.partie,
   'eine legendaere Auszeichnung aus einer Partie ist an ihrer Partie Breaking, der Spieler des Tages nicht, auch nicht ein gespeicherter, der sie in seiner Ehrung traegt', JSON.stringify(_einmalBrk));
ok(_einmalBrk.gestellt && _einmalBrk.gestellt.brk && _einmalBrk.gestellt.grund === 'Maxi holt sich zum Schluss des Tages die legendäre Auszeichnung „Award-Sammler“, zum ersten Mal.',
   'vergibt der Schluss des Tages eine legendaere, ist er Breaking und erzaehlt im Kleintext, wer sie holt', JSON.stringify(_einmalBrk.gestellt));
ok(JSON.stringify(_einmalBrk.saetze) === JSON.stringify(['Maxi holt sich zum Schluss des Tages die legendäre Auszeichnung „Award-Sammler“, zum 3.\u00a0Mal.',
    'Maxi holt sich zum Schluss der Woche die legendären Auszeichnungen „Award-Sammler“ und „Unantastbar“.',
    'Zum Schluss des Tages zweimal legendär: „Award-Sammler“ für Maxi und „Unantastbar“ für Julian.']),
   'der Kleintext erzaehlt die Nachricht: wer was zum wievielten Mal holt, zwei fuer einen, eine Zeile fuer mehrere', JSON.stringify(_einmalBrk.saetze));
ok(_wocheSchluss.runden === 0, 'eine Ehrung je Runde entsteht nicht mehr: der Tag hat eine', JSON.stringify(_wocheSchluss));
const _zeichenSchluss = _schlussAm(new RealDate(2026, 5, 29, 8, 0, 0).getTime(), `
  const z = roh.find(x => x.id === 'instag_woche_2026-06-29');
  const d = (z && z.dataRef) || {};
  const karte = z ? _newsCardHtmlM2(z, false, false, '') : '';
  const blatt = z ? (_ndInsTagBlatt(z) || {}).mitte || '' : '';
  return {zeichen:!!z, schluss:d.schluss, wann:z ? new Date(z.when).getTime() === new Date(2026, 5, 29).getTime() : false,
    zug:(d.zuege || []).map(x => x.pid === '${_L}' ? x.art : '?').join(','),
    grund:(d.grund || []).map(x => x.id).join(','),
    karte:/nf-abs viol[\\s\\S]*Leon[\\s\\S]*Player of the Week/.test(karte),
    blatt:blatt.indexOf('Mit dem Schluss der Woche vergeben') >= 0 && blatt.indexOf('nach der Woche') >= 0,
    seite:z ? _newsSeite(z) : ''};`);
ok(_zeichenSchluss.zeichen && _zeichenSchluss.schluss === 'woche' && _zeichenSchluss.wann && _zeichenSchluss.zug === 'grad',
   'Leons neuer Grad aus dem Schluss der Woche steht in einer Zeichen-Karte am Montag um 00:00', JSON.stringify(_zeichenSchluss));
ok(_zeichenSchluss.grund === 'potw' && _zeichenSchluss.karte && _zeichenSchluss.blatt,
   'die Zeichen-Karte nennt, was der Schluss vergab, auf der Karte und im Blatt', _zeichenSchluss.grund);
ok(_zeichenSchluss.seite === 'zeichen', 'sie steht auf der Seite der Zeichen', _zeichenSchluss.seite);

// Faellt der Schluss der Woche auf den des Monats (31.05., ein Sonntag),
// traegt der Monatsabschluss beide Zeichen, und keine zweite Karte entsteht.
// In den echten Partien bewegte der Wochenschluss an diesem Abend allein
// niemanden; die Bewegung wird deshalb gestellt, sonst bliebe die Probe auch
// ohne die Regel gruen.
const _wocheMonat = _schlussAm(new RealDate(2026, 5, 1, 9, 0, 0).getTime(), `
  const m = roh.find(x => x.id === 'season_recap_2026-05');
  const echt = _insZuegeZwischen;
  let gestellt = false;
  try {
    _insZuegeZwischen = (vor, nach, best, wann) => { const L = echt(vor, nach, best, wann);
      if(!L.zuege.length) L.zuege.push({pid:'${_L}', art:'grad', vor:{stufe:0, grad:0, punkte:100},
        nach:{stufe:0, grad:1, punkte:140}, ms:(wann('${_L}') || {}).ms, matchId:null, wieder:false, traeger:1, von:12});
      return L; };
    _cache._stories = []; _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    gestellt = _buildStories().some(x => (x.dataRef||{}).schluss === 'woche');
  } finally { _insZuegeZwischen = echt; }
  return {woche:roh.some(x => (x.dataRef||{}).schluss === 'woche'), gestellt,
    monat:!!m && (m.dataRef.zeichen || []).some(z => z.pid === '${_L}')};`);
ok(!_wocheMonat.woche && !_wocheMonat.gestellt && _wocheMonat.monat,
   'am Monatsende traegt der Monatsabschluss die Zeichen der Woche mit, ohne eigene Karte', JSON.stringify(_wocheMonat));

// Der Monat: alle Auszeichnungen des Monats in seiner Ehrung, dieselben wie
// in den Saeulen seines Rueckblicks, darunter Meister, Vize-Meister, Team
// der Saison und Untouchable. Wer mit dem Monat Team der Saison oder
// Vize-Meister wurde, stand auf dem Podest, aber nirgends als Auszeichnung
// mit ihrem Wert; die Ehrung des Schlusses nannte danach nur diese vier,
// neben einem Rueckblick, der 256 zaehlte. Sie steht direkt unter ihm.
const _monatSchluss = _schlussAm(new RealDate(2026, 7, 1, 12, 0, 0).getTime(), `
  const m = roh.find(x => x.id === 'season_recap_2026-07');
  const e = roh.find(x => x.id === 'ehrung_des_monats_2026-07');
  const d = (e && e.dataRef) || {};
  const q = (d.spieler || []).flatMap(x => x.posten.map(y => Object.assign({pid:x.pid}, y)));
  const wer = id => q.filter(y => y.id === id).map(y => y.pid).sort().join(',');
  const top = JSON.parse(seasons.find(s => s.id === '2026-07').top_elo);
  const z = _ehrungZeitraum(d) || {};
  const rck = (g => rcpEhrungHtml(rcpLaufbahnDaten(g.von, g.bis)).zahl)(rcpMonatGrenzen('2026-07'));
  const folgen = [roh.slice(), roh.slice().reverse()].map(l => l.sort(_storyFolge).map(x => x.id));
  const html = e ? _newsCardHtmlM2(e, false, false, '') : '';
  return {untouchable:wer('untouchable'), meister:wer('champion') === seasonChampion('2026-07'),
    vize:wer('vice_champion') === top[1].id, team:wer('team_of_season').split(',').filter(Boolean).length,
    zahl:d.zahl, rck, zr:z.vor + ' ' + z.wann,
    gleich:!!e && !!m && new Date(e.when).getTime() === new Date(m.when).getTime(),
    darunter:!!e && !!m && folgen.every(f => f.indexOf(e.id) === f.indexOf(m.id) + 1),
    karte:/nf-ehrung-zr zr-monat/.test(html) && /EHRUNG DES MONATS/.test(html) && /class="eh-kp"/.test(html) && /class="eh-kp-b"/.test(html)
      && !/class="eh-s"/.test(html),
    brk:!!e && _isBreaking(e), recapOhne:!!m && !m.dataRef.abschluss && !/nf-abs/.test(_newsCardHtmlM2(m, false, false, ''))};`);
ok(_monatSchluss.untouchable === [_L, _M].sort().join(',') && _monatSchluss.meister && _monatSchluss.vize && _monatSchluss.team === 2,
   'die Ehrung des Juli nennt Meister, Vize, Team der Saison und Leons und Martins Untouchable', JSON.stringify(_monatSchluss));
ok(_monatSchluss.zahl === _monatSchluss.rck && _monatSchluss.zahl > 50,
   'und alle Auszeichnungen des Monats, dieselben wie die Saeulen seines Rueckblicks', JSON.stringify(_monatSchluss));
ok(_monatSchluss.zr === 'Geholt im Juli 2026' && _monatSchluss.gleich && _monatSchluss.darunter && _monatSchluss.recapOhne,
   'sie nennt den Monat und steht zur Zeit des Rueckblicks direkt darunter, der keine Zeile mehr dafuer traegt', JSON.stringify(_monatSchluss));
ok(_monatSchluss.karte && !_monatSchluss.brk,
   'sie traegt Gold, ihre Rubrik, die Gesichter mit ihrem Prestige und was jede Klasse brachte, ohne Saeulen, und ist kein zweites Breaking neben dem Rueckblick', JSON.stringify(_monatSchluss));

// ── Was um Montag 00:00 vergeben wird, zählt einmal [§11.6f] ──────────
// Um Mitternacht zum Montag schließt die Woche davor. Ab Mitternacht
// gezählt stand ihr Spieler der Woche auch in der Woche danach: am 19.10.
// „Spieler der Woche ×2" für Leon, einmal für die Woche davor, und im Juni,
// der an einem Montag beginnt, auch im Rückblick des Monats. Je Woche der
// echten Partien nennt ihre Laufbahn genau die Spieler der Woche, die ihr
// Schluss vergab; der Spieler der Woche bis 31.05. steht im Mai, nicht im
// Juni.
const _montag = JSON.parse(K.eval(`JSON.stringify((function(){
  const je = l => { const o = {}; (l || []).forEach(x => (x.posten || []).forEach(q => {
    if(q.id === 'potw') o[pname(x.pid)] = (o[pname(x.pid)] || 0) + q.mal; })); return o; };
  const falsch = [];
  let n = 0;
  for(let ab = new Date(2026, 4, 25); ab.getTime() < new Date(2026, 7, 24).getTime(); ab.setDate(ab.getDate() + 7)){
    const S = new Date(ab); S.setDate(S.getDate() + 7);
    const ist = je(rcpWocheLaufbahn(ab.getTime(), S.getTime() - 1)), soll = je(_ehrungSchlussPosten(S.getTime(), ['potw']));
    if(JSON.stringify(ist) !== JSON.stringify(soll)) falsch.push(tagKey(ab.getTime()) + ' ' + JSON.stringify(ist) + ' statt ' + JSON.stringify(soll));
    n++;
  }
  const juni1 = new Date(2026, 5, 1).getTime();
  const mai = rcpMonatGrenzen('2026-05'), juni = rcpMonatGrenzen('2026-06');
  const vorher = je(_ehrungSchlussPosten(juni1, ['potw']));
  const inMai = je(rcpLaufbahnDaten(mai.von, mai.bis)), inJuni = je(rcpLaufbahnDaten(juni.von, juni.bis));
  const montage = [8, 15, 22, 29].map(t => je(_ehrungSchlussPosten(new Date(2026, 5, t).getTime(), ['potw'])));
  const summe = l => l.reduce((n, o) => n + Object.values(o).reduce((a, b) => a + b, 0), 0);
  return {n, falsch, vorher, maiBis:mai.bis === juni1, juniVon:juni.von === juni1 + 1,
    imMai:Object.keys(vorher).length > 0 && Object.keys(vorher).every(k => inMai[k] >= vorher[k]),
    juni:summe([inJuni]), juniSoll:summe(montage)};
})())`));
ok(_montag.n >= 12 && !_montag.falsch.length,
   'jede Woche nennt genau den Spieler der Woche, den ihr Schluss vergab, nicht den der Woche davor', JSON.stringify(_montag.falsch.slice(0, 3)));
ok(_montag.maiBis && _montag.juniVon && _montag.imMai && _montag.juni === _montag.juniSoll,
   'der Mai endet mit dem Sonntag und zaehlt bis zum Schluss seiner letzten Woche, der Juni beginnt danach und nennt nur seine vier', JSON.stringify(_montag));

// ── Die größere Ehrung trägt den Tag [§11.6f] ────────────────────────
// Endet mit einem Spieltag ein Monat oder eine Woche, stehen um Mitternacht
// nicht zwei oder drei Ehrungen untereinander, die kleinere ganz in der
// größeren. Der 30.06. ist der letzte Tag des Juni, ein Dienstag mit neun
// Partien: sein Spieler des Tages steht ohne Ehrung, keine Karte des Tages
// entsteht, und die Ehrung des Juni nennt alles, was der Tag vergab.
const _groesserMonat = _schlussAm(new RealDate(2026, 6, 1, 12, 0, 0).getTime(), `
  const p = roh.find(x => x.id === 'potd_2026-06-30');
  const e = roh.find(x => x.id === 'ehrung_des_monats_2026-06');
  const tag = _ehrungDesTages(new Date(2026, 5, 30, 23, 59).getTime());
  const im = (pid, id) => (((e ? e.dataRef.spieler : []).find(x => x.pid === pid) || {}).posten || []).find(q => q.id === id);
  return {potd:!!p, leer:!!p && Array.isArray(p.dataRef.ehrung) && !p.dataRef.ehrung.length, wo:p && p.dataRef.ehrungIn,
    brk:!!p && _isBreaking(p), karte:p ? /class="nf-eht"/.test(_newsCardHtmlM2(p, false, false, '')) : true,
    blatt:p ? /Die Ehrung des Tages/.test(String((_ndPotdBlatt(p) || {}).mitte || '')) : true,
    tag:tag.reduce((n, x) => n + x.posten.length, 0), monat:!!e,
    fehlt:tag.flatMap(x => x.posten.filter(q => { const m = im(x.pid, q.id); return !m || m.mal < q.mal; }).map(q => pname(x.pid) + ' ' + q.id)),
    eigene:roh.filter(x => /^(tagesehrung_|ehrung_tag_)2026-06-30/.test(x.id)).length};`);
ok(_groesserMonat.potd && _groesserMonat.leer && _groesserMonat.wo === 'monat' && !_groesserMonat.karte && !_groesserMonat.blatt && !_groesserMonat.eigene,
   'am letzten Tag des Monats steht der Spieler des Tages ohne Ehrung, auf der Karte und im Blatt, und ohne eigene Karte des Tages', JSON.stringify(_groesserMonat));
ok(_groesserMonat.tag > 3 && _groesserMonat.monat && !_groesserMonat.fehlt.length,
   'die Ehrung des Monats nennt alles, was dieser Tag vergab', JSON.stringify(_groesserMonat));

// Ein Sonntag, an dem auch der Monat endet: der 31.05.2026, gestellt mit
// drei Partien. Spieler des Tages und Woche um 23:59, der Rückblick des
// Monats um 00:00 — nur dessen Ehrung steht da. Sie zählt bis zum Schluss
// der Woche, Montag 00:00, und nennt deren Spieler der Woche; die Ehrung
// der Woche entsteht nicht. Ein Sonntag mitten im Monat, der 23.08.,
// ebenso gestellt: dort trägt die Woche den Tag.
const _sonntag = (ms, tag, vorlageTag, code) => _amErsten(ms, `
  const alt = matches.slice();
  const deltas = () => { const rc = simulateEloWithSliders(matches), m = {};
    rc.history.forEach(h => { m[h.matchId] = h.deltas; }); matches.forEach(x => { x.deltas = m[x.id] || {}; }); };
  const vorlage = alt.find(m => tagKey(mts(m)) === '${vorlageTag}');
  const [y, mo, d] = '${tag}'.split('-').map(Number);
  try {
    matches = alt.concat([0, 1, 2].map(i => Object.assign({}, vorlage, {id:'so_' + i,
      created_at:new Date(y, mo - 1, d, 15, i * 20).toISOString(), games_a:10, games_b:4, winner:'A'})))
      .sort((a, b) => mts(a) - mts(b));
    deltas(); invalidateCache(); _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const neu = _buildStories();
    const p = neu.find(x => x.id === 'potd_${tag}');
    const tagE = _ehrungDesTages(new Date(y, mo - 1, d, 23, 59).getTime());
    const deckt = e => tagE.flatMap(x => x.posten.filter(q => { const m = (((e ? e.dataRef.spieler : []).find(z => z.pid === x.pid) || {}).posten || []).find(z => z.id === q.id);
      return !m || m.mal < q.mal; }).map(q => pname(x.pid) + ' ' + q.id));
    const basis = {potd:!!p, leer:!!p && Array.isArray(p.dataRef.ehrung) && !p.dataRef.ehrung.length, wo:p && p.dataRef.ehrungIn,
      tag:tagE.reduce((n, x) => n + x.posten.length, 0), eigene:neu.filter(x => /^tagesehrung_${tag}/.test(x.id)).length};
    ${code}
  } finally { matches = alt; deltas(); }`);
const _sonntagMonat = _sonntag(new RealDate(2026, 5, 1, 9, 0, 0).getTime(), '2026-05-31', '2026-05-27', `
    const e = neu.find(x => x.id === 'ehrung_des_monats_2026-05');
    const g = rcpMonatGrenzen('2026-05');
    const potw = _ehrungSchlussPosten(new Date(2026, 5, 1).getTime(), ['potw']).map(x => x.pid).sort().join(',');
    const inE = ((e && e.dataRef.spieler) || []).filter(x => x.posten.some(q => q.id === 'potw')).map(x => x.pid).sort().join(',');
    return Object.assign(basis, {monat:!!e, woche:neu.some(x => /^ehrung_der_woche_2026-05-25/.test(x.id)), fehlt:deckt(e),
      potw:!!potw && potw === inE, zahl:e && e.dataRef.zahl, rck:rcpEhrungHtml(rcpLaufbahnDaten(g.von, g.bis)).zahl,
      zeit:e ? new Date(e.when).getTime() === new Date(2026, 5, 1).getTime() : false});`);
ok(_sonntagMonat.potd && _sonntagMonat.leer && _sonntagMonat.wo === 'monat' && !_sonntagMonat.eigene && !_sonntagMonat.woche,
   'endet ein Monat an einem Sonntag, stehen weder die Ehrung des Tages noch die der Woche da', JSON.stringify(_sonntagMonat));
ok(_sonntagMonat.monat && _sonntagMonat.zeit && _sonntagMonat.tag > 0 && !_sonntagMonat.fehlt.length && _sonntagMonat.potw
   && _sonntagMonat.zahl === _sonntagMonat.rck,
   'die Ehrung des Monats um 00:00 nennt alles vom Sonntag und den Spieler der Woche, so viel wie die Saeulen seines Rueckblicks', JSON.stringify(_sonntagMonat));
const _sonntagWoche = _sonntag(new RealDate(2026, 7, 24, 12, 0, 0).getTime(), '2026-08-23', '2026-08-19', `
    const e = neu.find(x => x.id === 'ehrung_der_woche_2026-08-17');
    return Object.assign(basis, {woche:!!e, fehlt:deckt(e)});`);
ok(_sonntagWoche.potd && _sonntagWoche.leer && _sonntagWoche.wo === 'woche' && !_sonntagWoche.eigene
   && _sonntagWoche.woche && _sonntagWoche.tag > 0 && !_sonntagWoche.fehlt.length,
   'an einem Sonntag mitten im Monat traegt die Ehrung der Woche den Tag, der Spieler des Tages steht ohne', JSON.stringify(_sonntagWoche));

// Was den ganzen Tag beschreibt, vergibt sein Schluss: Julians Unschlagbar
// vom 11.06. steht unter dem Spieler des Tages und ohne eigene Karte. Es
// stand in der naechsten Ehrung danach, der einer Runde Tage spaeter. Unter
// den Tagen steht keine Auszeichnung zweimal: je Spieler, Auszeichnung und
// dem wievielten Mal genau einmal. Woche und Monat fassen zusammen und
// duerfen nennen, was schon einmal dastand.
//
// Gespeichert liegen Ehrungen je Runde, die es nicht mehr gibt. Sie gehen
// in die Karte ihres Tages auf: neben einem Spieler des Tages, der den
// ganzen Tag traegt, reisen sie nur mit; einer von vorher traegt nur den
// Schluss, und dann wird vereinigt — ohne eine Auszeichnung zweimal.
const _ehrungSchluss = _schlussAm(new RealDate(2026, 5, 16, 8, 0, 0).getTime(), `
  const tage = roh.filter(x => (x.dataRef||{}).type === 'potd');
  const hat = (sp, id) => (sp || []).some(y => y.pid === '${_J}' && y.posten.some(q => q.id === (id || 'unbeatable')));
  const tag = tage.find(x => x.id === 'potd_2026-06-11');
  const n = {};
  tage.forEach(x => (x.dataRef.ehrung || []).forEach(y => y.posten.forEach(q => {
    for(let i = q.bis - q.mal + 1; i <= q.bis; i++){ const k = y.pid + '|' + q.id + '|' + i; n[k] = (n[k] || 0) + 1; } })));
  // Die Runde: was die Partien des Tages vergaben, ohne den Schluss.
  const schluss = _ehrungTagesSchluss(new Date(2026, 5, 11, 23, 59).getTime());
  const schlussIds = new Set(EHRUNG_SCHLUSS.tag);
  const rundeSp = tag.dataRef.ehrung.map(y => ({pid:y.pid, posten:y.posten.filter(q => !schlussIds.has(q.id))}))
    .filter(y => y.posten.length).map(y => Object.assign(y, {summe:y.posten.reduce((m, q) => m + q.p, 0)}));
  const runde = {id:'ehrung_gespeichert', when:new Date(2026, 5, 11, 19), prio:STORY_PRIO.ehrung, title:'Alte Ehrung', desc:'',
    dataRef:{type:'ehrung', spieler:rundeSp, ab:new Date(2026, 5, 11, 13).getTime(), bis:new Date(2026, 5, 11, 17).getTime()}};
  const alt = Object.assign({}, tag, {dataRef:Object.assign({}, tag.dataRef, {ehrung:schluss})});
  delete alt.dataRef.ehrungVoll; delete alt.dataRef.ehrungBrk;
  const zeige = karte => { _cache._stories = [runde, karte].concat(roh.filter(x => x.id !== tag.id)).sort(_storyFolge);
    _cache._consolFrom = null; _cache._frischVon = null; _cache._snapshotConsolFrom = null;
    const st = getStoriesCache(), k = st.find(x => x.id === tag.id) || {dataRef:{}};
    const z = {}; (k.dataRef.ehrung || []).forEach(y => y.posten.forEach(q => { z[y.pid + '|' + q.id] = (z[y.pid + '|' + q.id] || 0) + q.mal; }));
    const soll = {}; tag.dataRef.ehrung.forEach(y => y.posten.forEach(q => { soll[y.pid + '|' + q.id] = q.mal; }));
    return {allein:st.some(x => x.id === runde.id), mit:(k.dataRef.memberIds || []).includes(runde.id),
      gleich:Object.keys(z).length === Object.keys(soll).length && Object.keys(soll).every(x => z[x] === soll[x]),
      unschlagbar:hat(k.dataRef.ehrung)}; };
  return {tag:!!tag && hat(tag.dataRef.ehrung),
    runden:roh.filter(x => (x.dataRef||{}).type === 'ehrung' && !x.dataRef.periode).length,
    eigen:roh.some(x => (x.dataRef||{}).type === 'badge_unlocked' && x.dataRef.badgeId === 'unbeatable'
      && x.dataRef.playerId === '${_J}' && x.dataRef.tag === '2026-06-11'),
    neu:zeige(tag), vorher:zeige(alt), runde:rundeSp.length,
    doppelt:Object.keys(n).filter(k => n[k] > 1), posten:Object.keys(n).length};`);
ok(_ehrungSchluss.tag && !_ehrungSchluss.runden && !_ehrungSchluss.eigen,
   'Julians Unschlagbar vom 11.06. steht unter dem Spieler des Tages, keine Ehrung je Runde und keine eigene Karte', JSON.stringify(_ehrungSchluss));
ok(_ehrungSchluss.runde > 0 && !_ehrungSchluss.neu.allein && _ehrungSchluss.neu.mit && _ehrungSchluss.neu.gleich,
   'eine gespeicherte Ehrung einer Runde geht in den Spieler des Tages auf, der den ganzen Tag traegt, und reist mit', JSON.stringify(_ehrungSchluss.neu));
ok(!_ehrungSchluss.vorher.allein && _ehrungSchluss.vorher.mit && _ehrungSchluss.vorher.gleich && _ehrungSchluss.vorher.unschlagbar,
   'neben einem gespeicherten Spieler des Tages, der nur den Schluss traegt, ergeben beide zusammen den ganzen Tag, keine Auszeichnung zweimal', JSON.stringify(_ehrungSchluss.vorher));
ok(_ehrungSchluss.posten > 20 && !_ehrungSchluss.doppelt.length,
   'unter den Tagen steht keine Auszeichnung zweimal', _ehrungSchluss.doppelt.slice(0, 3).join(', ') || _ehrungSchluss.posten + ' Verleihungen');

// Ein Tag ohne Spieler des Tages hat eine Karte, die ihn zusammenfasst:
// die Ehrung des Tages, und wer am meisten abgab, steht auf ihr wie auf dem
// Spieler des Tages. Gespeicherte Ehrungen einer Runde desselben Tages
// reisen mit. Breaking ist sie nur, wenn der Schluss es war.
const _tagOhne = _schlussAm(new RealDate(2026, 5, 16, 8, 0, 0).getTime(), `
  const t = new Date(2026, 5, 11, 23, 59).getTime(), tg = '2026-06-11';
  const karte = _ehrungKarte(_ehrungDesTages(t), 'tagesehrung_' + tg, t, {periode:'tag', tag:tg, voll:true, breaking:false});
  const sp = karte.dataRef.spieler, ab = players.find(p => !sp.some(y => y.pid === p.id) && !p.hidden) || players[0];
  const swing = {id:'elo_swing_day_' + ab.id + '_' + tg, when:new Date(2026, 5, 11, 23, 58), prio:STORY_PRIO.elo_swing,
    title:'Harter Tag', desc:'', dataRef:{type:'elo_swing', pid:ab.id, delta:-41}};
  const runde = {id:'ehrung_alt_runde', when:new Date(2026, 5, 11, 19), prio:STORY_PRIO.ehrung, title:'Alte Ehrung', desc:'',
    dataRef:{type:'ehrung', spieler:sp.slice(0, 1), ab:new Date(2026, 5, 11, 13).getTime(), bis:new Date(2026, 5, 11, 17).getTime()}};
  _cache._stories = [karte, swing, runde].concat(roh.filter(x => !/^potd_2026-06-11/.test(x.id) && (x.dataRef||{}).type !== 'elo_swing')).sort(_storyFolge);
  _cache._consolFrom = null; _cache._frischVon = null; _cache._snapshotConsolFrom = null;
  const st = getStoriesCache(), k = st.find(x => x.id === karte.id) || {dataRef:{}};
  const html = k.id ? _newsCardHtmlM2(k, false, false, '') : '';
  const blatt = k.id ? String((_ndEhrungBlatt(k) || {}).mitte || '') : '';
  const tagIds = st.filter(x => tagKey(x.when) === tg && ((x.dataRef||{}).type === 'ehrung' || (x.dataRef||{}).type === 'elo_swing')).map(x => x.id);
  return {eine:tagIds.length === 1 && tagIds[0] === karte.id, ids:tagIds, gegen:!!k.dataRef.gegenstueck && /class="nf-gegen"/.test(html) && /Der härteste Tag/.test(blatt),
    mit:['ehrung_alt_runde', swing.id].every(id => (k.dataRef.memberIds || []).includes(id)),
    rubrik:/EHRUNG DES TAGES/.test(html) && /class="eh-kp"/.test(html), brk:_isBreaking(k)};`);
ok(_tagOhne.eine && _tagOhne.gegen && _tagOhne.mit && _tagOhne.rubrik && !_tagOhne.brk,
   'ein Tag ohne Spieler des Tages hat eine Karte: die Ehrung des Tages mit dem härtesten Tag und den Ehrungen seiner Runden', JSON.stringify(_tagOhne));

// Welche Auszeichnung welcher Schluss vergeben kann, steht in
// `EHRUNG_SCHLUSS` fest — ueber alle Auszeichnungen zu zaehlen kostete je
// Schluss das Zehnfache. Nachgerechnet wird es an jedem Schluss der echten
// Partien ueber ALLE Auszeichnungen: was sich zwischen einer Millisekunde
// davor und dem Schluss aendert und Prestige bringt, muss auf der Liste
// stehen, und was auf der Liste steht, kommt auch vor.
const _schlussListe = JSON.parse(K.eval(`JSON.stringify((function(){
  const S = [], tage = new Set(matches.map(m => tagKey(mts(m))).filter(t => t >= '2026-06-01'));
  tage.forEach(t => { const d = new Date(t + 'T00:00:00'); d.setHours(23, 59, 0, 0); S.push(['tag', d.getTime()]);
    const w = new Date(t + 'T00:00:00'); w.setDate(w.getDate() - (w.getDay() + 6) % 7 + 7); S.push(['woche', w.getTime()]); });
  ['2026-06','2026-07'].forEach(sid => S.push(['monat', seasonEnd(sid).getTime()]));
  const gesehen = {}, fehlt = [];
  [...new Map(S.map(x => [x.join('|'), x])).values()].forEach(([art, s]) => {
    const vor = s - 1, msA = _partienBis(vor), msB = _partienBis(s);
    BADGES.forEach(b => players.forEach(p => { let a = 0, z = 0;
      try { a = b.count(p.id, msA, vor) || 0; z = b.count(p.id, msB, s) || 0; } catch(e){ return; }
      if(!(z > a) || !(auszeichnungsTeilwert(b.id, z) > 0)) return;
      gesehen[art + '|' + b.id] = 1;
      if(!EHRUNG_SCHLUSS[art].includes(b.id)) fehlt.push(art + ' ' + b.id); }));
  });
  const nie = Object.keys(EHRUNG_SCHLUSS).flatMap(art => EHRUNG_SCHLUSS[art].filter(id => !gesehen[art + '|' + id]).map(id => art + ' ' + id));
  return {fehlt:[...new Set(fehlt)], nie, n:Object.keys(gesehen).length};
})())`));
ok(!_schlussListe.fehlt.length, 'jede Auszeichnung, die ein Schluss vergibt, steht auf seiner Liste', _schlussListe.fehlt.join(', '));
// Eine steht auf der Liste, ohne in den echten Partien vorzukommen: der
// Award-Sammler am Schluss eines Tages, wenn der fuenfte Spieler des Tages
// nach dem zweiten Spieler der Woche kommt. In den Fixtures kam der zweite
// Spieler der Woche immer zuletzt.
const _SCHLUSS_MOEGLICH = ['tag award_collector'];
ok(_schlussListe.nie.every(x => _SCHLUSS_MOEGLICH.includes(x)),
   'und jede auf der Liste vergibt er an den echten Partien', _schlussListe.nie.join(', ') || _schlussListe.n + ' gesehen');

ok(_plan.sammel.length > 0, 'es gibt Sammelkarten', _plan.sammel.length + '');
ok(_plan.sammel.every(n => n >= 2), 'eine Sammelkarte traegt alle verbundenen Zeilen',
   _plan.sammel.join(', ') || 'keine');
ok(_plan.sammelErsetzt === 0, 'keine ihrer Zeilen steht daneben noch als eigene Karte',
   _plan.sammelErsetzt + ' doppelt');
ok(_plan.mitSammel < _plan.ohneSammel, 'die Buendelung verkuerzt den Feed',
   _plan.mitSammel + ' statt ' + _plan.ohneSammel);

console.log('\n=== 12. DERSELBE FAKT NICHT ZWEIMAL IM MONAT ===');
// Der Typ-Cooldown (7 Tage) und der Spieler-Cooldown (2 Tage) verhindern die
// Kombination nicht: die Fuehrungs-Typen zeigen strukturell auf denselben Kopf.
// Gemessen wiederholten sich ueber 40 Tage elf Typ-Person-Paare, eines fuenfmal.
const _paare = JSON.parse(K.eval(`JSON.stringify((function(){
  if(!Array.isArray(_cache._stories)) _cache._stories = [];
  const basis = new Date('2026-08-27T23:00:00');
  const zaehl = {}, tag = {};
  for(let d = 39; d >= 0; d--){
    const t = new Date(basis.getTime() - d*86400000);
    [10, 19].forEach(h => {
      const j = new Date(t); j.setHours(h, 5, 0, 0);
      let a = [];
      try { a = _buildAmbientStories(j, pmap(), id => pname(id)) || []; } catch(e){}
      a.filter(x => new Date(x.when).getHours() === h &&
                    new Date(x.when).toDateString() === t.toDateString())
       .forEach(x => {
         _cache._stories.push(x);
         const sub = (x.dataRef||{}).sub, pid = (x.dataRef||{}).ambientPid;
         if(!sub || !pid) return;
         // Pflicht-Slots sind ausgenommen: ein Rueckblick gehoert auf sein
         // Datum und darf nicht vom Losverfahren abhaengen. Wer darin vorkommt,
         // entscheidet der Monat, nicht der Generator.
         if(sub === 'rueckblick_halbzeit' || sub === 'rueckblick_jahr') return;
         const k = sub + '|' + pid;
         const ts = j.getTime();
         if(tag[k] != null && (ts - tag[k]) <= 30*86400000) zaehl[k] = (zaehl[k]||0)+1;
         tag[k] = ts;
       });
    });
  }
  return {verstoesse: Object.keys(zaehl).length, liste: Object.keys(zaehl).slice(0, 4)};
})())`));
ok(_paare.verstoesse === 0, 'kein Fun Fact wiederholt Typ und Person binnen 30 Tagen',
   _paare.liste.join(', ') || 'keiner');

console.log('\n=== 13. DER TEXT KOMMT AUS DEM GENERATOR ===');
// Stories werden persistiert, damit alle Geraete dieselbe Karte sehen. Titel
// und Text waren damit eingefroren: eine ueberarbeitete Formulierung erschien
// nur an Karten, die es noch nicht gab. Der Feed zeigte weiter Saetze, die im
// Quelltext seit dem Umbau nicht mehr stehen.
const _auffr = JSON.parse(K.eval(`JSON.stringify((function(){
  _cache._stories = [];
  delete _cache._buildStoriesKey; delete _cache._frischVon;
  const frisch = _buildStories();
  if(!frisch.length) return {n:0};
  // Eine persistierte Zeile mit ALTEM Wortlaut nachstellen.
  const alt = frisch.map(s => Object.assign({}, s, {
    title: 'ALTER TITEL', desc: 'alter Text mit einem Gedankenstrich — und einer Floskel.'}));
  _cache._stories = alt;
  _cache._consolFrom = null;
  const sicht = getStoriesCache();
  // Ein Fun Fact ist ausgenommen: sobald sein Slot im Bestand steht, bildet
  // der Generator ihn nicht mehr, und dann gibt es nichts aufzufrischen. Genau
  // das haelt ihn stabil — siehe Abschnitt 4.
  const ohneFakt = sicht.filter(x => String(x.id).indexOf('ambient_') !== 0);
  const rohSnapshot = _newsTexteAuffrischen(alt);
  return {
    n: ohneFakt.length, fakten: sicht.length - ohneFakt.length,
    rohTitelStabil: rohSnapshot.every(x => x.title === 'ALTER TITEL'),
    rohTextStabil: rohSnapshot.every(x => x.desc === alt[0].desc),
    nochAlt: ohneFakt.filter(x => x.title === 'ALTER TITEL').length,
    mitStrich: ohneFakt.filter(x => (x.desc||'').indexOf('—') >= 0).length,
    // Zeitpunkt und ID muessen bleiben, sonst springt eine Karte im Feed.
    // Ausgenommen ist, was die Konsolidierung SELBST baut: Sammelkarte,
    // Badge-Gruppe und Typ-Gruppe fassen mehrere Zeilen zusammen und bekommen
    // dafuer eine eigene ID. Erkennbar am Praefix, nicht am Typ — die
    // Badge-Gruppe traegt weiter den Typ badge_unlocked, weil sie davon erzaehlt.
    idsGleich: sicht.every(x => frisch.some(f => f.id === x.id)
                              || /^(sammel_|badgegrp_|grp_)/.test(x.id || ''))
  };
})())`));
ok(_auffr.n > 0, 'der Feed steht', _auffr.n + ' Karten');
ok(_auffr.fakten > 0, 'und traegt auch Fun Facts', _auffr.fakten + ' Karten');
ok(_auffr.rohTitelStabil, 'jeder persistierte Titel bleibt als Snapshot erhalten');
ok(_auffr.rohTextStabil, 'auch der persistierte Beschreibungstext wird nicht umgeschrieben');
ok(_auffr.idsGleich, 'ID und Zeitpunkt bleiben, was die Datenbank sagt');

// ── Was der Generator nicht mehr erzeugt, verschwindet auch ─────────
// Der Wochenrueckblick war einmal sechs eigene Karten ueber den Montag
// verteilt. Er ist jetzt EINE Karte am Sonntag, aber die alten liegen
// persistiert in der Datenbank: am Montag stand „der groesste Sprung der
// Woche" neben dem Spieltag, der gerade lief.
//
// Abgemeldet wird am ID-PRAEFIX, nicht am Typ: der woechentliche Elo-Sprung
// hiess `elo_swing_week_…` und trug denselben Typ wie der taegliche, der es
// noch gibt. Ueber den Typ war er nicht zu fassen.
const _abg = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  // Die Liste wird GELESEN, nicht abgeschrieben: eine Kopie haette jede
  // Aenderung an ihr durchgehen lassen.
  const tote = STORY_ABGEMELDET.slice();
  const alt = tote.map((p, i) => ({
    id: p + 'x' + i, cat: 'highlight', ic: 'star',
    title: 'ALTE WOCHENKARTE ' + p, desc: 'Der groesste Sprung der Woche.',
    when: Date.now() - i * 60000, prio: 50,
    dataRef: {type: 'elo_swing', playerIds: [], matchId: null}
  })).concat(frisch);
  _cache._stories = alt; _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  return {
    n: tote.length,
    durch: sicht.filter(x => tote.some(p => String(x.id).indexOf(p) === 0)).length,
    lebend: sicht.length,
    // Und kein Praefix, den der Generator HEUTE noch bildet, steht auf der
    // Liste: das schaltete eine lebende Karte stumm.
    kollision: frisch.filter(s => tote.some(p => String(s.id).indexOf(p) === 0)).length
  };
})())`));
ok(_abg.durch === 0, 'keine abgemeldete Karte erreicht den Feed',
   _abg.durch + ' von ' + _abg.n);
ok(_abg.lebend > 0, 'der Feed steht danach immer noch', _abg.lebend + ' Karten');
ok(_abg.kollision === 0, 'kein abgemeldetes Praefix wird heute noch gebildet',
   _abg.kollision + ' Kollisionen');

// ── Ein Countdown laeuft ab ─────────────────────────────────────────
// „Noch 5 Tage" gilt fuer eine ganze Saison unter EINER ID, und der
// Zeitstempel stammt aus dem ersten Insert. Ist die Saison vorbei, hoert der
// Generator auf — und die Karte zaehlte Tage herunter, die es nicht mehr gab.
const _cd = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  const tot = {id:'season_endspurt_2020-01', cat:'highlight', ic:'rocket',
    title:'Noch 5 Tage', desc:'Die Top 2 trennen nur 3 Elo.',
    when: Date.now(), prio: 9,
    dataRef:{type:'season_endgame', sid:'2020-01', daysLeft:5}};
  _cache._stories = [tot].concat(frisch);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  // Der LAUFENDE Countdown muss bleiben — er wird ja noch gebildet.
  const laufend = frisch.filter(s => (s.dataRef||{}).type === 'season_endgame');
  return {abgelaufenDurch: sicht.filter(x => x.id === tot.id).length,
          laufendeGebildet: laufend.length,
          laufendeImFeed: sicht.filter(x => laufend.some(l => l.id === x.id)).length};
})())`));
ok(_cd.abgelaufenDurch === 1, 'ein einmal publizierter Countdown bleibt historisch im Feed',
   _cd.abgelaufenDurch + ' durch');
ok(_cd.laufendeGebildet === 0 || _cd.laufendeImFeed === _cd.laufendeGebildet,
   'der laufende Countdown bleibt', _cd.laufendeImFeed + ' von ' + _cd.laufendeGebildet);

// ── Eine Serienmarke haengt an ihrer Partie, nicht am heutigen Stand ──
// Gerechnet wurde der Stand NACH der letzten Partie der Liga, und die ID trug
// die Laenge (`team_streak_A_B_7`): jede Laenge wurde einzeln persistiert, und
// aus einer Serie, die von fuenf auf zehn wuchs, standen vier Karten im Feed.
// Der Ausweg war ein Filter, der jede Karte wegnahm, deren Laenge die LEBENDE
// Serie nicht mehr erreicht — und damit verschwand die 5er-Marke vom Dienstag,
// sobald die Serie am Mittwoch riss. Eine Karte, die zu ihrem Zeitpunkt
// richtig war, bleibt richtig [§C33].
const _ts = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  const SORTEN = ['team_streak', 'team_loss_streak', 'loss_streak', 'win_streak'];
  const marken = frisch.filter(s => SORTEN.indexOf((s.dataRef||{}).type) >= 0);
  // Jede Marke nennt die Partie, mit der sie fiel, und steht auf ihrer Zeit.
  const zeit = new Map(matches.map(m => [m.id, new Date(m.created_at).getTime()]));
  const ohnePartie = marken.filter(s => !(s.dataRef||{}).matchId);
  const falscheZeit = marken.filter(s => (s.dataRef||{}).matchId
    && zeit.get(s.dataRef.matchId) !== new Date(s.when).getTime());
  // Und eine Marke, deren Serie langst gerissen ist, bleibt im Feed. Gestellt
  // mit einer Laenge, die kein Duo und kein Spieler der Liga je erreicht hat:
  // genau die Lage, in der der Filter zuschlug.
  const echt = marken.find(s => (s.dataRef||{}).type === 'team_streak'
                             || (s.dataRef||{}).type === 'team_loss_streak');
  let gerissen = 0;
  if(echt){
    const alt = Object.assign({}, echt, {id: echt.id + '_alt',
      title: echt.title + ' (alt)',
      dataRef: Object.assign({}, echt.dataRef, {streak: (echt.dataRef.streak || 5) + 20})});
    _cache._consolFrom = null;
    gerissen = _consolidateStories([alt]).length;
  }
  return {n: marken.length, ohnePartie: ohnePartie.length,
          falscheZeit: falscheZeit.length, gerissen, hatEchte: !!echt};
})())`));
ok(_ts.n > 0 && _ts.ohnePartie === 0,
   'jede Serienmarke nennt die Partie, mit der sie fiel',
   _ts.n + ' Marken, ' + _ts.ohnePartie + ' ohne Partie');
ok(_ts.falscheZeit === 0, 'und steht auf der Zeit dieser Partie',
   _ts.falscheZeit + ' mit fremder Zeit');
ok(_ts.hatEchte && _ts.gerissen === 1,
   'eine Marke bleibt im Feed, auch wenn die Serie langst gerissen ist',
   String(_ts.gerissen));

// ── Der Memo greift ─────────────────────────────────────────────────
// `_newsTexteAuffrischen` lieferte bei jedem Aufruf ein frisches Array, und
// der Referenz-Memo in `_consolidateStories` — der genau dafuer gebaut ist —
// schlug damit nie an. `getStoriesCache` laeuft nach jedem `loadAll` und bei
// jedem Zeichnen des Feeds.
// Gemessen wird der Fall, in dem der Wortlaut sich WIRKLICH aendert: nur dann
// baut die Auffrischung ein neues Array, und nur dort kann der Memo fehlen.
const _memo = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  const persistiert = frisch.map(s => Object.assign({}, s, {title: 'ALT: ' + s.title}));
  _cache._stories = persistiert; _cache._consolFrom = null; _cache._frischVon = null;
  getStoriesCache();
  let treffer = 0;
  for(let i = 0; i < 5; i++){
    const vor = _cache._consolList;
    getStoriesCache();
    if(_cache._consolList === vor) treffer++;
  }
  return {treffer};
})())`));
ok(_memo.treffer === 5, 'der Memo der Konsolidierung greift', _memo.treffer + ' von 5');

// Diese Praefixe hat der Generator einmal gebildet und bildet sie nicht mehr.
// Die Liste ist ein historischer Befund, keine Kopie der Code-Liste: sie
// haelt fest, WAS abgemeldet gehoert, und faellt, wenn eines wieder von der
// Abmeldung verschwindet. `elo_swing_week_` fehlte zuerst, weil sein Typ
// (`elo_swing`) noch gebildet wird — die Karte stand weiter im Feed.
// `lead_change_` kam dazu: es gab eine Karte je Wechsel, heute ist es EINE
// Karte je Tag (`lead_day_`). Beide standen in derselben Minute im Feed und
// nannten zwei verschiedene Vorspruenge. `elo_record_` ebenso — der Bestwert
// steht als „Der hoechste Gipfel" in der Ewigen Tafel.
const _historisch = ['upset_match_', 'thriller_', 'biggest_blowout_', 'potw_',
                     'team_woche_', 'anniversary_', 'elo_swing_week_',
                     'lead_change_', 'elo_record_'];
const _fehlend = JSON.parse(K.eval(`JSON.stringify(${JSON.stringify(_historisch)}
  .filter(p => !STORY_ABGEMELDET.includes(p)))`));
ok(_fehlend.length === 0, 'jedes einmal gebildete, tote Praefix ist abgemeldet',
   _fehlend.join(', '));

// ── Nichts steht zweimal untereinander ──────────────────────────────
// Nach zwei Partien standen zwei Karten „Martin baut ‚Der Fels' aus"
// untereinander, beide mit 6.9 gegen 7.0 und nur einer anderen Spielzahl im
// Fliesstext — und in einer Sammelkarte stand dieselbe Zeile VIERMAL. Die ID
// trug den rohen Wert, also bekam jede Partie eine eigene Karte, obwohl die
// ANGEZEIGTE Zahl dieselbe blieb.
//
// Und gebuendelt wird nach der Minute statt nach der Partie: genau ein
// Story-Typ trug ueberhaupt eine `matchId`, alles andere fiel durch.
const _dop = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const basis = roh.find(s => ((s.dataRef||{}).type||'').indexOf('rekord_') === 0) || roh[0];
  // Vier persistierte Zeilen mit derselben Schlagzeile, wie sie nach vier
  // Partien an einem Tag entstanden sind.
  const vier = [1,2,3,4].map(i => Object.assign({}, basis, {
    id: 'rek_fels_' + i, title: 'X baut „Der Fels" aus',
    desc: '6.9 Gegentore je Abwehrspiel · ' + (152+i) + ' Spiele. Vorher 7.0.',
    // Eigener synthetischer Moment: Der Test soll die vier Dubletten
    // gegeneinander messen, nicht zufaellig mit einer echten Sammelkarte
    // kollidieren, die denselben Spieler am Basis-Zeitpunkt nennt.
    when: new Date(new Date(basis.when).getTime() + 15 * 60000),
    dataRef: Object.assign({}, basis.dataRef || {}, {type:'rekord_gesteigert'})}));
  _cache._stories = vier.concat(roh);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  // Eine Partie-Karte und eine Pflichtkarte duerfen dieselbe Schlagzeile
  // zweimal tragen: zwei Spieltage, zwei Sieger — und zwei Partien mit
  // denselben vier Leuten und demselben Ausgang heissen gleich. Sie stehen
  // unter zwei Tagesköpfen bzw. zu zwei Uhrzeiten [§C33].
  const _prt = s => { const d=(s&&s.dataRef)||{};
    return d.type==='spiel' || (d.type==='sammel' && d.quelle==='spiel' && !!d.matchId); };
  const _PFL = ['potd','woche','season_recap','chronik_frei'];
  const titel = sicht.filter(s => !_prt(s) && _PFL.indexOf((s.dataRef||{}).type) < 0)
    .map(s => String(s.title||''));
  const zeilen = [];
  sicht.forEach(s => ((s.dataRef||{}).teile || []).forEach(t => {
    if(t && t.titel) zeilen.push(String(t.titel)); }));
  // Je Sammelkarte: keine zwei Zeilen mit derselben Schlagzeile.
  let zeilenDoppelt = 0;
  sicht.forEach(s => { const ts = ((s.dataRef||{}).teile||[]).map(t => String(t.titel||''));
    ts.forEach((t, i) => { if(t && ts.indexOf(t) !== i) zeilenDoppelt++; }); });
  // Und in einer Minute steht hoechstens eine Karte JE SUBJEKT: zwei Karten
  // derselben Minute sind erlaubt, wenn sie von verschiedenen Leuten handeln
  // — genau das ist der Grund, warum die Buendelung nicht mehr nur nach der
  // Minute geht. Zwei Karten ueber DENSELBEN Spieler in derselben Minute
  // waeren dagegen die Doublette, die sie verhindern soll.
  const proMin = {};
  const gesehen = {};
  const kollisionen = [];
  sicht.forEach(s => {
    const k = new Date(s.when).toISOString().slice(0,16);
    const dd = s.dataRef || {};
    // Was absichtlich einzeln bleibt, ist keine Doublette: Breaking und eine
    // seltene Auszeichnung stehen fuer sich, auch wenn in derselben Minute
    // eine Sammelkarte ueber dieselbe Person steht.
    let einzeln = false;
    try { einzeln = _isBreaking(s); } catch(e){}
    if(dd.type === 'badge_unlocked' && (dd.rarity === 'rare' || dd.rarity === 'legendary'))
      einzeln = true;
    if(dd.type === 'chronik_geholt' && dd.chronKlasse === 'legendaer')
      einzeln = true;
    // Die Ehrung einer Woche steht absichtlich zur Zeit ihrer Wochenkarte,
    // direkt darunter [§11.6f]: sie ist deren Bilanz, keine verfehlte
    // Buendelung.
    if(dd.type === 'ehrung' && dd.periode) einzeln = true;
    if(einzeln) return;
    // Die Ewige Tafel ist ein eigener Ereignisstrom und wird VOR den
    // Spieltagskarten vereinigt [§C33]: ein Tafel-Moment umfasst den ganzen
    // Spieltag und traegt die Uhrzeit seiner jüngsten Zeile, ein
    // Rekordwechsel die der letzten Partie. Dass beide in der Minute einer
    // Partie-Karte liegen, ist keine verfehlte Buendelung, sondern die
    // Trennung der zwei Ebenen. Gefragt ist hier, ob zwei SPIELTAGSKARTEN
    // derselben Minute ueber dieselbe Person zusammengefunden haben.
    if(s.cat === 'tafel' || dd.quelle === 'tafel' || dd.quelle === 'form') return;
    // Und eine negative Meldung reist nicht mit: sie bleibt ihre eigene
    // Karte, weil Rot eine Richtung ist und eine Karte eine hat [§C25].
    // „Leo und Maxi verlieren zusammen alles" steht deshalb neben der
    // Sammelkarte derselben Partie, in der Leo gewonnen hat.
    let neg = false;
    try { neg = typeof _newsIstNegativ === 'function' && _newsIstNegativ(s); } catch(e){}
    if(neg) return;
    let ids = []; try { ids = _newsPids(s) || []; } catch(e){}
    if(!gesehen[k]) gesehen[k] = {};
    let kollision = false;
    ids.forEach(id => { if(gesehen[k][id]) kollision = true; gesehen[k][id] = 1; });
    if(kollision){ proMin[k] = (proMin[k]||1) + 1; kollisionen.push(k+' '+s.title); }
  });
  return {
    felsGesamt: titel.filter(t => t.indexOf('Der Fels') >= 0).length
              + zeilen.filter(t => t.indexOf('Der Fels') >= 0).length,
    quellen: sicht.flatMap(s => (s.dataRef.teile || []).flatMap(t => t.sourceIds || [t.id]))
      .filter(id => /^rek_fels_[1-4]$/.test(id)),
    zeilenDoppelt,
    minutenMitMehreren: Object.keys(proMin).filter(k => proMin[k] > 1).length,
    kollisionen
  };
})())`));
ok(_dop.felsGesamt === 4, 'vier publizierte Meldungen bleiben vollstaendig erhalten',
   _dop.felsGesamt + ' mal im Feed');
ok(new Set(_dop.quellen).size === 4, 'gleicher Wortlaut behaelt alle vier urspruenglichen Story-IDs',
   _dop.quellen.join(', '));
ok(_dop.zeilenDoppelt === 3, 'eine Sammelkarte behaelt jede Story-ID als Zeile',
   _dop.zeilenDoppelt + ' doppelt');
ok(_dop.minutenMitMehreren === 0,
   'in einer Minute steht hoechstens eine Karte je Spieler',
   _dop.kollisionen.join(' | ') || _dop.minutenMitMehreren + ' Minuten');

// ── Der Kopf fasst zusammen, alle Teile bleiben gleichrangig ─────────
const _sam = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const norm = t => String(t||'').replace(/<[^>]*>/g,' ')
    .replace(/&[a-z]+;/g,' ').replace(/[^0-9a-zA-ZäöüÄÖÜß%]+/g,' ').trim().toLowerCase();
  const sicht = getStoriesCache().filter(x => (x.dataRef||{}).type === 'sammel');
  let kopfKopie = 0, textListe = 0, leer = 0, unvollstaendig = 0, markiert = 0, blattDoppelt = 0;
  sicht.forEach(x => {
    const b = _newsDetailBody(x);
    const obenTitel = norm(x.title), obenText = norm(x.desc);
    const labels = (b.match(/class="nw-label">([^<]*)</g)||[])
      .map(t => norm(t.replace(/^[^>]*>/,'').replace(/<$/,'')));
    const teile = x.dataRef.teile || [];
    // Die Karte einer Partie, deren einzige Meldung ihr Hauptanlass ist:
    // Schlagzeile und Satz stehen oben, die Bühne darunter, und eine Zeile
    // wiederholte beides.
    const nurHaupt = String(x.id).indexOf('sammel_spiel_match_') === 0 && teile.filter(t => (t.typ || t.type) !== 'spiel'
      && !(norm(t.titel) === obenTitel && norm(t.text) === obenText)).length === 0 && b.indexOf('nd-buehne') >= 0;
    if(!labels.length && !nurHaupt) leer++;
    // Auf der Karte EINER Partie ist die Schlagzeile ihr Hauptanlass, und
    // genau eine Zeile im Blatt ist er [§C33]; jede andere Sammelkarte fasst
    // zusammen und kopiert keine.
    const partie = String(x.id).indexOf('sammel_spiel_match_') === 0;
    const kopien = teile.filter(t => obenTitel === norm(t.titel) || obenText === norm(t.text)).length;
    if(partie ? kopien !== 1 : kopien > 0) kopfKopie++;
    // Im Blatt trägt die Zeile des Hauptanlasses seinen Beleg: sein Satz
    // stand dort als Titel und gleich darunter noch einmal als erste Zeile.
    if(partie && labels.some(l => l === obenTitel)) blattDoppelt++;
    // Im Bündel einer Partie ist die Partie die Bühne und keine Zeile.
    const buehne = b.indexOf('nd-buehne') >= 0 ? teile.filter(t => (t.typ || t.type) === 'spiel').length : 0;
    // Steht der Hauptanlass mit Satz und Schlagzeile schon oben, hat er keine
    // Zeile mehr: sie wiederholte beides.
    const oben = partie ? teile.filter(t => norm(t.titel) === obenTitel && norm(t.text) === obenText && obenText).length : 0;
    if(labels.length !== teile.length - buehne - oben) unvollstaendig++;
    if(b.indexOf('nw-zeile-kopf-teil') >= 0) markiert++;
    // Der Text der Karte darf nicht die Schlagzeilen aller Zeilen sein.
    const alle = (x.dataRef.teile||[]).map(t => norm(t.titel));
    if(alle.length > 1 && alle.every(t => t && norm(x.desc).indexOf(t) >= 0)) textListe++;
  });
  return {n: sicht.length, kopfKopie, textListe, leer, unvollstaendig, markiert, blattDoppelt};
})())`));
ok(_sam.n > 0, 'es gibt Sammelkarten mit Blatt', _sam.n + '');
ok(_sam.kopfKopie === 0, 'der Sammelkarten-Kopf kopiert kein Einzelereignis, außer auf der Karte einer Partie genau ihren Hauptanlass',
   _sam.kopfKopie + ' Kopien');
ok(_sam.textListe === 0, 'der Kartentext ist eine Zusammenfassung, keine Liste',
   _sam.textListe + ' Karten');
ok(_sam.leer === 0, 'und keine Sammelkarte oeffnet ein leeres Blatt',
   _sam.leer + ' leer');
ok(_sam.unvollstaendig === 0, 'das Blatt zeigt ausnahmslos alle Einzelereignisse',
   _sam.unvollstaendig + ' unvollstaendig');
ok(_sam.markiert === 0, 'kein Einzelereignis wird im Blatt hervorgehoben',
   _sam.markiert + ' markiert');
ok(_sam.blattDoppelt === 0, 'im Blatt einer Partie steht der Satz des Hauptanlasses nicht noch einmal als Zeile',
   _sam.blattDoppelt + ' doppelt');

// ── Gebuendelt wird nur, was ein Subjekt teilt ──────────────────────
// Die Minute allein reichte nicht: „Leon und Maxi gewinnen zusammen alles"
// trug „Leo: Angstgegner" als zweite Zeile, und Leo spielte in dieser Partie
// gar nicht mit. Gemessen waren drei von fuenf Spiel-Buendeln so gebaut.
// Und was selten ist, bleibt eine eigene Karte: „Nerven aus Stahl" (drei
// Zittersiege in Folge) stand als Kleingedrucktes unter der Duo-Serie zweier
// Fremder.
const _sub = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  const sammel = sicht.filter(x => (x.dataRef||{}).type === 'sammel');
  // Je Spiel-Buendel: jede Zeile teilt mindestens einen Spieler mit dem Rest.
  const fremd = [];
  sammel.filter(x => x.dataRef.quelle === 'spiel').forEach(x => {
    const t = x.dataRef.teile || [];
    t.forEach((z, i) => {
      if(x.dataRef.matchId){
        if(z.matchId !== x.dataRef.matchId) fremd.push(x.title + ' / ' + z.titel);
        return;
      }
      const andere = t.filter((_, j) => j !== i)
        .reduce((a, u) => a.concat(u.pids || []), []);
      if(!(z.pids || []).some(p => andere.indexOf(p) >= 0))
        fremd.push(x.title + ' / ' + z.titel);
    });
  });
  // Seltene und legendaere Auszeichnungen stehen nie als Zeile.
  //
  // Der Fall wird GEBAUT und nicht dem Tag abgelauscht: eine wiederholbare
  // Auszeichnung ist nur beim ersten Mal und an runden Marken Nachricht
  // [§11.0c], und ob an einem beliebigen Stichtag gerade eine seltene
  // faellig ist, hat mit der Buendelungsregel nichts zu tun. Gemessen wird,
  // dass eine seltene Auszeichnung neben zwei Meldungen desselben Moments
  // eine eigene Karte bleibt [§C33].
  const _pid = Object.keys(pmap())[0];
  const _mom = new Date(2026, 7, 26, 17, 5, 0).getTime();
  const _mk = (id, typ, ref, titel, text) => ({id, cat:'badge', ic:'medal',
    title:titel, desc:text, when:_mom, prio:60,
    dataRef:Object.assign({type:typ}, ref)});
  const _rarLauf = [
    _mk('bx1','badge_unlocked', {playerId:_pid, badgeId:'wall_badge',
      badgeName:'Mauer', rarity:'rare', matchId:'mx'}, 'Test: Mauer', 'Eine Zahl: 2.'),
    _mk('bx2','jubilee', {pid:_pid, total:250}, 'Test: 250. Spiel', 'Eine Zahl: 250.'),
    _mk('bx3','milestone_wins', {pid:_pid, milestone:'100'}, 'Test: 100. Sieg', 'Eine Zahl: 100.')
  ];
  _cache._consolFrom = null;
  const _rarRaus = _consolidateStories(_rarLauf.slice());
  const _rarZeilen = [];
  _rarRaus.forEach(x => ((x.dataRef||{}).teile||[]).forEach(z => _rarZeilen.push(z.titel)));
  const selten = _rarLauf.filter(s => (s.dataRef||{}).rarity === 'rare');
  const versteckt = selten.filter(s => _rarZeilen.indexOf(s.title) >= 0).map(s => s.title);
  const zeilenTitel = [];
  sammel.forEach(x => (x.dataRef.teile||[]).forEach(z => zeilenTitel.push(z.titel)));
  return {sammel: sammel.length, fremd, selten: selten.length, versteckt,
          ohnePids: sammel.reduce((n, x) => n + (x.dataRef.teile||[])
            .filter(z => !(z.pids||[]).length).length, 0)};
})())`));
ok(_sub.sammel > 0, 'es gibt Sammelkarten', _sub.sammel + '');
ok(_sub.fremd.length === 0, 'jede Matchzeile gehoert zu ihrer Partie, Legacy-Gruppen teilen ihre Beteiligten',
   _sub.fremd.slice(0, 3).join(' | ') || 'keine fremde Zeile');
// In der KARTE IHRER PARTIE steht sie mit — sonst stuende dasselbe Ergebnis
// zweimal untereinander. In einem fremden Buendel nicht: „Nerven aus Stahl"
// ist der Grund, warum jemand die App oeffnet, und steht nicht als
// Kleingedrucktes unter der Duo-Serie zweier anderer [§C33].
ok(_sub.selten > 0 && _sub.versteckt.length === 0,
   'eine seltene Auszeichnung steht nicht als Zeile in einem fremden Buendel',
   _sub.versteckt.join(', ') || _sub.selten + ' seltene, alle einzeln');
ok(_sub.ohnePids === 0, 'jede Zeile weiss, von wem sie handelt',
   _sub.ohnePids + ' ohne');

// ── Die Monatschronik im laufenden Monat ────────────────────────────
//    Der ganze laufende Monat kam im Feed nicht vor: die Monatskarte
//    entsteht erst am 1. fuer den VORmonat, und gemessen trug der August
//    dreizehn Eintraege und keine einzige Karte. Wer „Auf dem Thron" holte,
//    erfuhr es nur, wenn er selbst in den Chronik-Tab sah.
const _chrg = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const chr = roh.filter(s => (s.dataRef||{}).type === 'chronik_geholt');
  const sid = currentSeason().id;
  // Der Zeitschnitt muss wirklich schneiden: der Stand vor dem letzten
  // Spieltag darf nicht derselbe sein wie der von heute, sonst gibt es nie
  // eine Meldung.
  const letzte = matches.length ? mts(matches[matches.length-1]) : 0;
  const t0 = new Date(letzte); t0.setHours(0,0,0,0);
  const jetzt = seasonTitleHalter(sid);
  const vorher = seasonTitleHalter(sid, t0.getTime() - 1);
  const schatten = chr.filter(s => {
    const t = SEASON_TITLE_BY_ID[(s.dataRef||{}).titleId];
    return t && t.kunst === 'schatten';
  }).length;
  // Wer an diesem Spieltag gespielt hat. Eine Chronik wechselt auch, weil
  // ANDERE gespielt haben — dann gibt es keine Karte, denn die Schlagzeile
  // waere ein Satz ueber jemanden, der zugesehen hat [§C33].
  const amTag = new Set();
  matches.forEach(m => { if(mts(m) < t0.getTime()) return;
    [m.a1,m.a2,m.b1,m.b2].forEach(p => { if(p) amTag.add(p); }); });
  const aenderungen = Object.keys(jetzt).filter(id => {
    const t = SEASON_TITLE_BY_ID[id], n = jetzt[id], a = vorher[id];
    if(!(t && t.kunst !== 'schatten' && n
      && (!a || a.pids.join(',') !== n.pids.join(',')))) return false;
    const alt = (a && a.pids) || [];
    const neuLeute = n.pids.filter(x => alt.indexOf(x) < 0);
    const wer = (alt.length && neuLeute.length
      && alt.every(x => n.pids.indexOf(x) >= 0)) ? neuLeute : n.pids;
    return wer.some(p => amTag.has(p));
  }).length;
  // Und keine gemeldete Chronik nennt jemanden, der an diesem Tag nicht
  // gespielt hat.
  const ohneEigenePartie = chr.filter(s =>
    !((s.dataRef||{}).playerIds || []).some(p => amTag.has(p))).length;
  // Verglichen wird bis zum Ende des Tages, wie die Karte selbst: was den
  // ganzen Tag beschreibt, kommt erst um 23:59 [§11.0e].
  const vorPrestige = prestigeTabelle(t0.getTime() - 1).byPid;
  const jetztPrestige = prestigeTabelle(_storyTagGrenzen(letzte).nachMs).byPid;
  const gemeldet = {};
  chr.forEach(s => Object.entries((s.dataRef||{}).prestigeDelta || {}).forEach(([pid, x]) => {
    gemeldet[pid] = (gemeldet[pid] || 0) + (Number(x) || 0);
  }));
  // Gutgeschrieben wird der ganze Zuwachs dem, dessen Profileintrag mit
  // dieser Chronik wechselt; wer seinen Eintrag behält, bekommt durch den
  // Wechsel nichts. Dass dessen Bonus mit dem Spieltag wächst, weil der
  // Halter seine Schwelle weiter überbietet [§C39], ist keine Nachricht
  // einer Chronik-Karte: gemessen holte Johannes „Den Beidfüßigen", sein
  // „Aufdreher" stieg am selben Tag von 158 auf 159, und die Karte sagte
  // richtig „kein zusätzliches Prestige".
  const nachMs = _storyTagGrenzen(letzte).nachMs;
  const profil = (pid, t) => (seasonTitleOf(pid, sid, t) || {}).titleId || '';
  const deltaFalsch = Object.keys(gemeldet).filter(pid => {
    const echt = Math.max(0, ((((jetztPrestige[pid]||{}).teile||{}).monat)||0)
      - ((((vorPrestige[pid]||{}).teile||{}).monat)||0));
    return profil(pid, t0.getTime() - 1) === profil(pid, nachMs) ? gemeldet[pid] !== 0 : gemeldet[pid] !== echt;
  });
  // Persistierte Karten aus älteren Builds besitzen noch kein Delta. Karte
  // und Blatt müssen dann denselben aktuell gezählten Laufbahnbeitrag lesen.
  let altKonsistent = true;
  if(chr.length){
    const alt = Object.assign({}, chr[0], {dataRef:Object.assign({}, chr[0].dataRef)});
    delete alt.dataRef.prestigeDelta;
    const laufbahn = _newsChronikPrestige(alt.dataRef);
    const summe = Object.values(laufbahn.werte).reduce((n,x)=>n+(Number(x)||0),0);
    const karte = _newsTafelWert(alt);
    const kartenwert = Number(String((karte||{}).v||0).replace(',','.')) || 0;
    const blatt = String(_newsDetailBody(alt)||'');
    altKonsistent = laufbahn.modus === 'bestand'
      && Math.abs(kartenwert - Math.round(summe*10)/10) < 1e-9
      && Object.values(laufbahn.werte).every(x => Number(x)>0
        ? blatt.includes(String(x).replace('.',',')+' Prestige<small>zählt aktuell</small>')
        : blatt.includes('zählt aktuell nicht'));
  }
  return {
    n: chr.length, aenderungen, ohneEigenePartie,
    prio: chr.map(s => s.prio),
    ohneRef: chr.filter(s => !(s.dataRef||{}).titleId
      || !Object.prototype.hasOwnProperty.call((s.dataRef||{}), 'prestigeDelta')).length,
    deltaFalsch, altKonsistent,
    falscheSumme:chr.filter(s => {
      const d=s.dataRef||{};
      return (Number(d.punkte)||0) !== Object.values(d.prestigeDelta||{})
        .reduce((n,x)=>n+(Number(x)||0),0);
    }).length,
    // Eine verdraengte Chronik zeigt GAR KEINEN grossen Wert. Die Karte trug
    // „0 ZUSAETZLICH" im groessten Schriftgrad, und eine Null liest sich dort
    // wie ein Fehler: der Erfolg kann eine legendaere Chronik sein, er zaehlt
    // nur nicht zusaetzlich, weil je Monat ein Eintrag in der Tafel steht
    // [§C32]. Den Grund nennt der Satz mit Namen.
    nullAlsPlus:chr.filter(s => {
      const d=s.dataRef||{}, plus=Object.values(d.prestigeDelta||{}).some(x=>Number(x)>0);
      return !plus && !!_newsTafelWert(s);
    }).length,
    // playerIds sind die GENANNTEN, nicht jeder Mithalter: wer schon
    // Halter war, hat an diesem Tag nichts getan, und die Tafel-Sammelkarte
    // schrieb ihn sonst in ihre Schlagzeile („Julian und Martin bewegen die
    // Ewige Tafel" ueber zwei Zeilen, die beide von Martin erzaehlen).
    // Beim Dazukommen sind das die Neuen, sonst alle Halter [§C33].
    gekuerzt:chr.filter(s => {
      const d=s.dataRef||{}, h=jetzt[d.titleId];
      if(!h) return false;
      const soll = d.chronWie === 'dazu'
        ? (h.pids||[]).filter(p => (d.vorher||[]).indexOf(p) < 0)
        : (h.pids||[]);
      return (d.playerIds||[]).length !== soll.length;
    }).length,
    ohnePids: chr.filter(s => !((s.dataRef||{}).playerIds||[]).length).length,
    schatten,
    // Blatt: jede Karte muss eine Mitte haben, sonst oeffnet sie ins Leere.
    leer: chr.filter(s => !String(_newsDetailBody(s) || '').trim()).length,
    // Der Wert auf der Karte ist das Prestige, nicht die erste Zahl im Satz.
    wert: chr.map(s => { const w = _newsTafelWert(s); return w ? w.l : '—'; }),
    stand: {jetzt: Object.keys(jetzt).length, vorher: Object.keys(vorher).length},
    // Zwei Halterstaende zum selben Zeitpunkt muessen gleich sein: sonst
    // haengt der Schnitt an etwas anderem als der Zeit.
    stabil: JSON.stringify(seasonTitleHalter(sid)) === JSON.stringify(jetzt)
  };
})())`));
// ── Eine gemeldete Chronik steht auch in der Tafel ──────────────────
//    Als der Monat erst ab dem fuenften Spieltag gewertet wurde, zog
//    `seasonTitles` die Grenze und `seasonTitleHalter` nicht — und der Feed
//    meldete Chroniken, die es nicht gab: gemessen nannte die Funktion am
//    04.08. acht, am 06.08. zehn und am 07.08. dreizehn Halter, waehrend die
//    Monatstafel null Eintraege zeigte. „Leon holt ‚Auf Augenhoehe'" stand
//    im Feed, im Chronik-Tab stand nichts. Heute gibt es keine Grenze fuer
//    den ganzen Monat, sondern fuenfzehn Partien je Spieler [§C39]; beide
//    muessen sie gleich ziehen, und zwar in beide Richtungen.
const _gate = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = {};
  matches.forEach(m => {
    const d = new Date(mts(m));
    const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    (tage[k] = tage[k] || new Set()).add(d.toISOString().slice(0,10));
  });
  const schnitte = [];
  Object.keys(tage).forEach(sid => {
    const liste = [...tage[sid]].sort();
    // Je Monat ein Schnitt hinter jedem der ersten acht Spieltage: in ihnen
    // erreichen die meisten ihre fuenfzehnte Partie.
    liste.slice(0, 8).forEach(tag => {
      const bis = new Date(tag + 'T23:59:59').getTime();
      schnitte.push({sid, tag, bis});
    });
  });
  const falscheGrenze = [], ohneEintrag = [];
  let frueh = 0;
  schnitte.forEach(x => {
    let H = null, T = null;
    try { H = seasonTitleHalter(x.sid, x.bis); T = seasonTitles(x.sid, x.bis); } catch(e){ return; }
    if(!T) return;
    if(!H) { falscheGrenze.push(x.sid + '/' + x.tag + ' halter=null'); return; }
    if(T.days < 5 && Object.keys(H).length) frueh++;
    Object.keys(H).forEach(id => H[id].pids.forEach(pid => {
      if(!T.awarded.some(a => a.titleId === id && a.pid === pid)) ohneEintrag.push(x.sid + '/' + x.tag + '/' + id);
    }));
    // Und umgekehrt: was die Tafel zeigt, kennt auch der Halterstand.
    T.awarded.forEach(a => { if(!(H[a.titleId] && H[a.titleId].pids.includes(a.pid)))
      falscheGrenze.push(x.sid + '/' + x.tag + ' ' + a.titleId + ' fehlt im Halterstand'); });
  });
  return {n:schnitte.length, falscheGrenze:falscheGrenze.slice(0,4), frueh,
          ohneEintrag:ohneEintrag.slice(0,4), nOhne:ohneEintrag.length};
})())`));
ok(_gate.n > 20, 'die Grenze wird an vielen Zeitschnitten geprueft', _gate.n + ' Schnitte');
ok(_gate.falscheGrenze.length === 0,
   'Halterstand und Monatstafel ziehen dieselbe Grenze',
   _gate.falscheGrenze.join(' | '));
ok(_gate.frueh > 0, 'vor dem fuenften Spieltag gibt es schon Chroniken', _gate.frueh + ' Schnitte');
ok(_gate.nOhne === 0, 'keine gemeldete Chronik fehlt in der Monatstafel',
   _gate.ohneEintrag.join(' | ') || _gate.nOhne + ' ohne Eintrag');

// ── Die Zeile einer Sammelkarte ist kuerzer als die Karte ───────────
//    Im Blatt eines Tafel-Moments stand jede Zeile mit dem vollen
//    Kartentext: gemessen bis zu 183 Zeichen und vier Saetze, neunmal
//    untereinander. Fuenf der neun erklaerten dabei, warum sich NICHTS
//    aendert — die Bauanleitung des Feeds, nicht die Nachricht [§C33].
const _zeil = JSON.parse(K.eval(`JSON.stringify((function(){
  // Ueber jeden vierten Spieltag, nicht nur ueber heute: die Zeilen, die die
  // Prestige-Mechanik erklaerten, gehoeren zu einer VERDRAENGTEN Chronik, und
  // an einem einzelnen Tag steht davon keine im Buendel. Gemessen trug der
  // 10.08. drei davon („In der Chronik bleibt ‚Der makellose Tag' staerker").
  const alleMatches = matches.slice();
  const alleTage = [...new Set(alleMatches.map(m => tagKey(mts(m))))].sort();
  const zeilen = [];
  alleTage.filter((_, i) => i % 4 === 0 || i >= alleTage.length - 3).forEach(k => {
    const grenze = Math.max(...alleMatches.filter(m => tagKey(mts(m)) === k).map(mts));
    matches = alleMatches.filter(m => mts(m) <= grenze);
    invalidateCache();
    let st = [];
    try { st = _consolidateStories(_buildStories()); } catch(e){}
    st.filter(s => (s.dataRef||{}).type === 'sammel' && s.dataRef.quelle === 'tafel')
      .forEach(s => (s.dataRef.teile || []).forEach(t => zeilen.push(t)));
  });
  matches = alleMatches;
  invalidateCache();
  // Gemessen wird in SAETZEN und in Zeichen: ein langer Beleg mit zwei
  // Anteilen und seinem Nenner traegt allein 113 Zeichen und ist trotzdem ein
  // Satz, drei kurze Saetze passen in 100. Der volle Kartentext hatte vier
  // Saetze und bis zu 183 Zeichen — das ist ein Absatz.
  const saetze = x => String(x||'').split(/(?<=\\.)\\s+/).filter(Boolean).length;
  const lang = zeilen.filter(t => saetze(t.text) > 3 || String(t.text||'').length > 130);
  // Gemeint sind die drei Saetze, die die Prestige-Mechanik erklaeren: „In
  // der Chronik bleibt ‚X' staerker, also kommt fuer die Laufbahn kein
  // Prestige hinzu", „Fuer die Laufbahn kommt durch diesen Wechsel kein
  // Prestige hinzu" und „Die Halterlage aendert sich, der Prestige-Stand
  // nicht". Das blanke „staerker" traf daneben jeden Beleg, der das Wort
  // enthaelt: „Der Rückenwind" nennt „+4 Punkte staerkere Mitspieler als
  // sonst" und ist damit dreimal als Mechanik-Erklaerung gezaehlt worden.
  const mechanik = zeilen.filter(t => /In der Chronik bleibt|kein Prestige|Prestige-Stand/.test(String(t.text||'')));
  return {n:zeilen.length, max:Math.max(0, ...zeilen.map(t => String(t.text||'').length)),
          lang:lang.map(t => t.titel + ' (' + saetze(t.text) + ' Saetze, '
            + String(t.text).length + ' Zeichen)').slice(0,3),
          mechanik:mechanik.map(t => t.titel).slice(0,3), nM:mechanik.length};
})())`));
ok(_zeil.n > 40, 'die Tafel-Sammelkarten tragen viele Zeilen', _zeil.n + ' Zeilen');
ok(_zeil.lang.length === 0, 'keine Zeile einer Sammelkarte wird zum Absatz',
   _zeil.lang.join(' | ') || 'laengste ' + _zeil.max + ' Zeichen');
ok(_zeil.nM === 0, 'keine Zeile erklaert die Prestige-Mechanik',
   _zeil.mechanik.join(' | ') || _zeil.nM + ' Zeilen');

ok(_chrg.stand.jetzt > 0, 'der Halterstand des laufenden Monats ist zu lesen',
   _chrg.stand.jetzt + ' Chroniken');
ok(_chrg.stabil, 'derselbe Zeitpunkt ergibt denselben Halterstand');
ok(_chrg.stand.vorher !== _chrg.stand.jetzt || _chrg.n > 0,
   'der Zeitschnitt schneidet wirklich',
   'vorher ' + _chrg.stand.vorher + ', heute ' + _chrg.stand.jetzt);
ok(_chrg.n > 0, 'eine Chronik im laufenden Monat wird gemeldet', _chrg.n + ' Karten');
ok(_chrg.n === _chrg.aenderungen,
   'Chronik-Wechsel werden vor dem Buendeln nicht abgeschnitten',
   _chrg.n + ' von ' + _chrg.aenderungen);
ok(_chrg.deltaFalsch.length === 0 && _chrg.falscheSumme === 0,
   'Chronik-Stories zeigen exakt den echten neuen Monatsbeitrag',
   _chrg.deltaFalsch.join(', ') || _chrg.falscheSumme + ' falsche Summen');
ok(_chrg.nullAlsPlus === 0,
   'eine verdraengte Chronik behauptet kein zusaetzliches Prestige',
   _chrg.nullAlsPlus + ' falsche Karten');
ok(_chrg.altKonsistent,
   'auch alte Chronik-Stories zeigen in Karte und Blatt denselben aktuellen Beitrag');
// Gemessen wird die ORDNUNG, nicht die Zahl. Als hier `p === 80` stand,
// haette die Zusicherung eine verschobene Skala fuer einen Fehler gehalten
// und eine vertauschte Reihenfolge durchgelassen — genau andersherum als
// gemeint [§C33].
const _chronOrd = JSON.parse(K.eval('JSON.stringify({rek:STORY_PRIO.rekord_geholt,'
  + ' chr:STORY_PRIO.chronik_geholt, ins:STORY_PRIO.insignium_stufe})'));
ok(_chronOrd.rek > _chronOrd.chr && _chronOrd.chr > _chronOrd.ins,
   'die Chronik-Karte liegt zwischen Liga-Rekord und Insignium-Stufe',
   _chronOrd.rek + ' > ' + _chronOrd.chr + ' > ' + _chronOrd.ins);
ok(_chrg.prio.every(p => p === _chronOrd.chr),
   'und jede gemeldete Chronik traegt genau diesen Rang',
   _chrg.prio.join(','));
ok(_chrg.ohneRef === 0, 'jede Chronik-Karte kennt ihre Wertung und ihr Prestige',
   _chrg.ohneRef + ' ohne');
ok(_chrg.ohnePids === 0, 'jede Chronik-Karte weiss, von wem sie handelt',
   _chrg.ohnePids + ' ohne');
ok(_chrg.gekuerzt === 0, 'eine geteilte Chronik behaelt alle Halter',
   _chrg.gekuerzt + ' gekuerzte Karten');
ok(_chrg.schatten === 0, 'Schattenseiten meldet der Feed nicht', _chrg.schatten + ' gemeldet');
ok(_chrg.leer === 0, 'jede Chronik-Karte oeffnet ein Blatt mit Inhalt', _chrg.leer + ' leer');
ok(_chrg.wert.every(l => ['Prestige','je Spieler','zusammen','—'].includes(l)),
   'der grosse Wert der Chronik-Karte nennt nur den echten Prestige-Beitrag',
   _chrg.wert.join(','));
ok(_chrg.ohneEigenePartie === 0,
   'keine Chronik-Karte nennt jemanden ohne Partie an diesem Tag',
   _chrg.ohneEigenePartie + ' Karten');
// Gebaut, weil es sich an den echten Partien nicht messen laesst: beide
// gemeldeten Chroniken halten dort ein Plus. Eine verdraengte Chronik zeigte
// „0 ZUSAETZLICH" im groessten Schriftgrad der Karte, und eine Null liest
// sich dort wie ein Fehler — der Erfolg kann eine legendaere Chronik sein,
// er zaehlt nur nicht zusaetzlich, weil je Monat ein Eintrag in der Tafel
// steht [§C32].
const _nullwert = JSON.parse(K.eval(`JSON.stringify((function(){
  const pid = players[0].id;
  const bau = (delta, zeigt) => ({id:'chr0', cat:'tafel', ic:'scroll',
    when:new Date(), title:'Eine Chronik', desc:'Ein Satz mit 1 Zahl.',
    dataRef:{type:'chronik_geholt', titleId:'x', sid:currentSeason().id,
             playerIds:[pid], prestigeDelta:{[pid]: delta}, punkte:delta,
             grundwert:120, zeigt}});
  const ohne = _newsTafelWert(bau(0, false));
  const mit = _newsTafelWert(bau(35, true));
  return {ohne: ohne ? ohne.v + '|' + ohne.l : null,
          mit: mit ? mit.v + '|' + mit.l : null};
})())`));
ok(_nullwert.ohne === null,
   'eine verdraengte Chronik zeigt gar keinen grossen Wert',
   String(_nullwert.ohne));
ok(_nullwert.mit === '+35|Prestige', 'und eine mit Zuwachs nennt ihn',
   String(_nullwert.mit));

// Und das Gebuendelte steht auf der KARTE, nicht erst im Blatt.
const _band = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const sammel = getStoriesCache().filter(x => (x.dataRef||{}).type === 'sammel');
  let ohneBand = 0, zeilen = 0;
  sammel.forEach(x => {
    const h = _newsCardHtmlM2(x, false, false);
    // Die Zeile des Fußes zählt nicht mit: sie gehört zum Fuß (sp-fz).
    const n = (h.split('nf-sam-z').length - 1) - (h.split('sp-fz').length - 1);
    zeilen += n;
    // Was nicht die Schlagzeile der Karte SELBST ist, steht als Zeile auf
    // der Karte — jede, ohne Deckel. Ausgelassen wurde zusaetzlich der
    // Titel des KOPFS, und bei einer Tafel-Karte sind das zwei
    // verschiedene Saetze: ueber „Henry, Johannes und zwei weitere bewegen
    // die Ewige Tafel" stand Henrys Beleg als Text, und Henry selbst kam
    // auf seiner eigenen Karte namentlich nicht vor. Der Text ist der
    // BELEG des staerksten Ereignisses, nicht seine Schlagzeile.
    // Eine Tafel-Karte darf deshalb auch mehr als vier Zeilen tragen. „Und 1
    // weitere" versteckte zuvor genau eine Meldung, nur um eine Zeile zu
    // sparen. Buendeln darf nichts verstecken [§C33].
    // Bis zur Grenze steht jede Meldung auf der Karte; darueber fuehrt
    // die Zahl ins Blatt, und dort steht weiterhin jede Zeile. Sechs waren
    // zu viele, sobald ein Spieltag die Tafel wirklich bewegt: gemessen trug
    // ein Tafel-Moment achtzehn Zeilen, und die Karte war ein Block aus
    // Namen [§C33].
    const teile = (x.dataRef.teile||[]).filter(t => t.titel !== x.title);
    // Ein Ausbau steht nicht auf der Karte: derselbe Halter, ein besserer
    // Wert, kein Wechsel. Gemessen trug ein Tafel-Moment achtzehn Zeilen, elf
    // davon Ausbauten, und bei vier Plaetzen standen zwei Wechsel und zwei
    // Ausbauten darauf [§C33].
    const wechsel = teile.filter(t => t.typ !== 'rekord_gesteigert');
    // Und das Ergebnis steht nicht als Zeile unter seinem eigenen Band: die
    // Zeile „X und Y setzen sich gegen A und B durch" nennt dieselben vier
    // Namen, die das Band mit Wappen und Stand darueber zeigt, und ihr
    // Anlass steht in der Schlagzeile [§C33]. Nur auf der Achse der PARTIE —
    // eine Karte ueber zwei Ergebnisse desselben Tages besteht aus lauter
    // Ergebnis-Zeilen, und die sind dort die Aussage.
    const ohneErg = (x.dataRef.quelle === 'spiel' && x.dataRef.matchId
                     && !x.dataRef.bandFremd)
      ? (wechsel.length ? wechsel : teile).filter(t => t.typ !== 'spiel')
      : (wechsel.length ? wechsel : teile);
    // Auf der Karte einer Partie höchstens drei, ohne Schlagzeile, Fuß und
    // Nebensache [§C33]; nachgerechnet wird die Regel selbst weiter unten.
    const partie = x.dataRef.quelle === 'spiel' && x.dataRef.matchId && !x.dataRef.bandFremd;
    const soll = partie ? Math.min(_spZeilen(x.dataRef.teile, x.title, _spBild(x).occ).zeilen.length, 3)
      : Math.min(ohneErg.length, NEWS_LIMITS.sammelZeilen);
    if(soll !== n) ohneBand++;
  });
  return {n: sammel.length, ohneBand, zeilen,
    floskeln:sammel.filter(x=>/Einzelheiten|Alle Belege|eigenständige|zusammengehörige Ereignisse|Ereignisse in einem Moment/i
      .test((x.title||'')+' '+(x.desc||''))).map(x=>x.title)};
})())`));
ok(_band.zeilen > 0, 'die Sammelkarte traegt ihr Band', _band.zeilen + ' Zeilen');
ok(_band.ohneBand === 0,
   'die Karte traegt ihre staerksten Zeilen, das Blatt alle',
   _band.ohneBand + ' Karten ohne');
ok(_band.floskeln.length === 0,
   'Sammelstories verzichten auf technische Erklaerfloskeln',
   _band.floskeln.join(' | ') || 'alle Texte redaktionell');

// ── Ein Ausbau steht nicht auf der Karte ───────────────────────────
// „Wichtig ist, was wirklich in der Chronik steht und welcher Rekord wirklich
// uebernommen wurde" — ein Ausbau ist keins von beidem. Gemessen trug ein
// Tafel-Moment achtzehn Zeilen, elf davon Ausbauten, und bei vier Plaetzen
// standen zwei Wechsel und zwei Ausbauten auf der Karte [§C33].
const _ausbau = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const m = _newsTagMs(tage[tage.length - 1])[0];
  const wann = new Date(mts(m));
  const l = [];
  // Zwei echte Wechsel und elf Ausbauten, alle im selben Moment.
  for(let i = 0; i < 2; i++) l.push({
    id:'w-' + i, cat:'tafel', ic:'trophyStar', when:wann, prio:80 - i,
    title:'Ein Wechsel ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:'rekord_geholt', rekordId:'rw' + i, matchId:m.id,
             causalKey:_storyGruppeKey('table', tage[tage.length - 1]),
             playerIds:[players[0].id]}});
  for(let i = 0; i < 11; i++) l.push({
    id:'a-' + i, cat:'tafel', ic:'chartBar', when:wann, prio:60 - i,
    title:'Ein Ausbau ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:'rekord_gesteigert', rekordId:'ra' + i, matchId:m.id,
             causalKey:_storyGruppeKey('table', tage[tage.length - 1]),
             playerIds:[players[0].id]}});
  _cache._consolFrom = null;
  const k = _consolidateStories(l).find(x => (x.dataRef||{}).type === 'sammel');
  if(!k) return {fehlt:true};
  const h = _newsCardHtmlM2(k, false, false);
  const blatt = _newsDetailBody(k);
  return {fehlt:false,
          zeilen: h.split('nf-sam-z').length - 1,
          ausbauAufKarte: (h.match(/Ein Ausbau/g) || []).length,
          rest: (h.match(/und (\\d+) weitere/) || [])[1] || '',
          imBlatt: (blatt.match(/Ein Ausbau/g) || []).length,
          teile: (k.dataRef.teile || []).length};
})())`));
ok(!_ausbau.fehlt && _ausbau.zeilen === 2 && _ausbau.ausbauAufKarte === 0,
   'auf der Karte stehen nur die echten Wechsel',
   _ausbau.zeilen + ' Zeilen, ' + _ausbau.ausbauAufKarte + ' Ausbauten');
ok(_ausbau.rest === '11', 'und die Ausbauten zaehlen in die Zahl dahinter',
   'und ' + _ausbau.rest + ' weitere');
ok(_ausbau.imBlatt === 11 && _ausbau.teile === 13,
   'das Blatt zeigt jede Zeile',
   _ausbau.imBlatt + ' Ausbauten von ' + _ausbau.teile + ' Zeilen');

// ── Wer mehreres auf einmal holt, und was mehrere zugleich holen ────
// Die Buendelung kannte nur Moment und Subjekt und borgte sich Rubrik und
// Schlagzeile der staerksten Zeile. An der Ewigen Tafel gruppierte sie sogar
// den ganzen TAG ohne jedes Subjekt: gemessen standen vier Rekordwechsel
// dreier Spieler in einer Karte, und die drei, die im selben Moment dieselbe
// Insignium-Stufe erreichten, fielen ueber die vier Zeilen hinaus und
// standen einzeln daneben. Zwei Achsen kommen deshalb davor.
const _achsen = JSON.parse(K.eval(`JSON.stringify((function(){
  const ids = players.map(p => p.id);
  const W = matches[matches.length-1].created_at;
  const st = (id, typ, extra, prio, ti, tx) => ({id, cat:'tafel', ic:'award',
    title:ti, desc:tx, when:W, prio:prio,
    dataRef:Object.assign({type:typ}, extra)});
  const lauf = liste => { _cache._consolFrom = null;
    return _consolidateStories(liste.slice()).filter(x => (x.dataRef||{}).type === 'sammel'); };
  const zeig = arr => arr.map(x => { const h = String(_newsCardHtmlM2(x, false, false));
    return {q:x.dataRef.quelle, ti:x.title, tx:x.desc,
      n:(x.dataRef.teile||[]).length, sorte:_newsSorte(x),
      rub:_newsRubrik(_newsSorte(x), x), pids:(x.dataRef.playerIds||[]).length,
      band:(h.split('nf-sam-z').length - 1),
      mehr:(h.match(/nf-face-mehr">\\+(\\d+)/) || [])[1] || '',
      // Der Fuss der Spieler-Karte: die exakte Zahl steht dort kompakt.
      fuss:(h.match(/<b class="g">(\\d+)<\\/b><span>Erfolge im selben Moment/) || [])[1] || '',
      zeilen:(x.dataRef.teile||[]).map(t => t.titel)}; });
  // Die Schlagzeile beginnt mit dem Namen, wie im Generator — daran haengt
  // die Zeile im Sammelband der Spieler-Karte.
  const nm = pid => (pmap()[pid] || {}).name || '?';
  const rek = (id, rid, pid, prio) => st(id, 'rekord_geholt',
    {rekordId:rid, playerIds:[pid], vorher:[]}, prio || 84,
    nm(pid) + ' übernimmt „' + rid + '"', '11 Siege in Folge. Vorher waren es 10.');
  const ins = (id, pid) => st(id, 'insignium_stufe',
    {pid, stufe:1, stufeName:'Schildring', punkte:640 + id.charCodeAt(1), oben:false}, 76,
    nm(pid) + ' traegt den Schildring',
    '385 Prestige zusammen. Bis zum Volutenkranz fehlen 335.');
  // Alte Stufen-Zeilen werden zur Insignium-Karte ihres Tages (_insAltZuTag).
  const leiter = liste => { _cache._consolFrom = null;
    return _consolidateStories(liste.slice()).filter(x => (x.dataRef||{}).type === 'insignium_tag')
      .map(x => { const h = String(_newsCardHtmlM2(x, false, false));
        return {ti:x.title, tx:x.desc, n:(x.dataRef.zuege||[]).length, mit:(x.dataRef.memberIds||[]).length,
          buehne:h.indexOf('class="ni-b ') >= 0,
          zeilen:(h.match(/class="ni-z[ "]/g) || []).length, mehr:/weitere</.test(h)}; }); };
  return {
    ic: leiter([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2])]),
    if: leiter([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2]), ins('i4',ids[3]), ins('i5',ids[4])]),
    id: leiter([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2]), rek('r9','switcher',ids[2])]),
    // (a) ein Spieler, zwei Rekorde
    a: zeig(lauf([rek('r1','unstoppable',ids[0]), rek('r2','eloday',ids[0])])),
    // (b) drei Sorten in einem Moment: das Verb steht nur, wo es wechselt
    b: zeig(lauf([rek('r3','unstoppable',ids[0]),
      st('bg','badge_unlocked',{badgeId:'wall_badge',playerId:ids[0],rarity:'common'},8,
         nm(ids[0]) + ': Mauer','Sieg mit maximal 2 Gegentoren.'),
      st('jb','jubilee',{pid:ids[0],total:100},6,nm(ids[0]) + ' feiert 100. Spiel',
         '100 Partien stehen jetzt in der Bilanz.')])),
    // (c) drei Spieler, dieselbe Stufe: keine Tafel mehr
    c: zeig(lauf([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2])])),
    // (t) drei Spieler, drei Rekorde: der Tafel-Moment
    t: zeig(lauf([rek('r1','unstoppable',ids[0]), rek('r2','eloday',ids[1]), rek('r3','switcher',ids[2])])),
    f: zeig(lauf([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2]),
                  ins('i4',ids[3]), ins('i5',ids[4])])),
    // (d) Der Erfolg gewinnt: wer die Stufe teilt UND einen Rekord holt,
    //     steht mit der Stufe auf der gemeinsamen Karte. Sonst stuende der
    //     Schildring auf zwei Karten [§C33].
    d: zeig(lauf([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2]),
                  rek('r9','switcher',ids[2])])),
    g: zeig(lauf([
      st('ls','loss_streak',{pid:ids[0],playerIds:[ids[0]]},55,
        nm(ids[0]) + ' sucht den Ausweg','Fünf Pleiten in Folge.'),
      st('tl','team_loss_streak',{playerIds:[ids[0],ids[1]]},54,
        nm(ids[0]) + ' und ' + nm(ids[1]) + ' stecken fest','Gemeinsam ohne Sieg.')
    ])),
    // (e) einer allein bleibt eine eigene Karte
    e: zeig(lauf([rek('r1','unstoppable',ids[0])])),
    n0: (players[0]||{}).name, n1: (players[1]||{}).name, n2: (players[2]||{}).name
  };
})())`));
ok(_achsen.a.length === 1 && _achsen.a[0].q === 'tafel',
   'zwei Tafel-Erfolge eines Spielers im selben Moment werden EINE Tafel-Karte',
   _achsen.a.length + ' Karten');
ok(_achsen.a[0] && _achsen.a[0].ti === _achsen.n0 + ' bewegt die Ewige Tafel',
   'die Schlagzeile nennt den Spieler und den gemeinsamen Ort',
   (_achsen.a[0]||{}).ti);
ok(_achsen.a[0] && _achsen.a[0].n === 2 && _achsen.a[0].band === 2,
   'und jeder der beiden steht als Zeile auf der Karte',
   (_achsen.a[0]||{}).band + ' von ' + (_achsen.a[0]||{}).n);
ok(_achsen.b[0] && _achsen.b[0].ti
   === _achsen.n0 + ' holt einen Liga-Rekord, eine Auszeichnung und feiert ein Jubiläum',
   'das Verb steht nur da, wo es wechselt', (_achsen.b[0]||{}).ti);
ok(_achsen.b[0] && _achsen.b[0].band === 3,
   'auch die dritte Zeile steht auf der Karte, nicht als „und 1 weitere"',
   (_achsen.b[0]||{}).band + ' Zeilen');
// Die Stufen stehen nicht mehr in der Ewigen Tafel: dieselbe Stufe für drei
// Spieler ist EINE Insignium-Karte, mit allen dreien als Bewegung.
ok(_achsen.ic.length === 1 && _achsen.ic[0].n === 3 && _achsen.ic[0].mit === 3 && _achsen.c.length === 0,
   'dieselbe Stufe fuer drei Spieler wird EINE Insignium-Karte, nicht die Tafel',
   JSON.stringify(_achsen.ic) + ' · Tafel ' + _achsen.c.length);
// Die Reihenfolge der drei folgt dem Prestige (`_insZugVor`), gefragt ist
// hier nur: die Stufe einmal, jeder Name einmal.
ok(_achsen.ic[0] && /^Schildring für [^,]+, [^,]+ und [^,]+$/.test(_achsen.ic[0].ti)
   && _achsen.ic[0].ti.split('Schildring').length === 2
   && [_achsen.n0, _achsen.n1, _achsen.n2].every(n => _achsen.ic[0].ti.split(n).length === 2),
   'die Schlagzeile nennt die Stufe einmal und alle drei', (_achsen.ic[0]||{}).ti);
// Der Satz erklärt die Stufe und behauptet nichts, was eine alte Zeile nicht
// weiß: wie viele sie tragen, steht nur in neuen Karten.
ok(_achsen.ic[0] && /^Der Schildring ist die zweite Stufe der Leiter und beginnt bei 600 Prestige\.$/.test(_achsen.ic[0].tx),
   'ihr Satz erklärt die Stufe ohne Floskel', (_achsen.ic[0]||{}).tx);
// Und jede Bewegung steht darauf: die besonderste als Bühne, jede übrige als
// Zeile — es standen höchstens drei Zeilen und der Rest als Zahl.
ok(_achsen.if.length === 1 && _achsen.if[0].n === 5 && _achsen.if[0].buehne
   && _achsen.if[0].zeilen === 4 && !_achsen.if[0].mehr,
   'eine große Karte zeigt die besonderste Bewegung als Bühne und jede übrige als Zeile, ohne Rest',
   JSON.stringify(_achsen.if[0] || {}));
ok(_achsen.id.length === 1 && _achsen.id[0].n === 3 && _achsen.d.length === 0,
   'Stufen und Rekord desselben Tages stehen auf ihren eigenen Karten',
   JSON.stringify({ins:_achsen.id.map(x => x.n), tafel:_achsen.d.map(x => x.q + ':' + x.n)}));
ok(_achsen.e.length === 0, 'ein einzelner Erfolg bleibt eine eigene Karte',
   _achsen.e.length + ' Sammelkarten');
// „Ein Spiel, zwei Geschichten" gilt fuer jeden Spieltag und sagt von keinem
// der beiden Anlaesse etwas. Seit jede Partie ihre Karte hat, ist ein Buendel
// immer eine Partie samt allem, was aus ihr folgte — und genau das gehoert in
// die Zeile [§C33].
// „Ein Spiel, zwei Geschichten" gilt fuer jeden Spieltag und sagt von keinem
// der beiden Anlaesse etwas. Seit jede Partie ihre Karte hat, ist ein Buendel
// immer eine Partie samt allem, was aus ihr folgte — und genau das gehoert in
// die Zeile [§C33].
ok(_achsen.g[0] && _achsen.g[0].ti
   === 'Durststrecke für ' + _achsen.n0 + ' und gemeinsame Durststrecke für '
       + _achsen.n0 + ' und ' + _achsen.n1,
   'verknuepfte Spielstories nennen ihre Anlaesse in der Schlagzeile',
   (_achsen.g[0]||{}).ti);
ok(_achsen.g[0] && /Meldungen hängen daran|Siegchance lag vor dem Anstoß/.test(_achsen.g[0].tx)
   && !/Geschichten wachsen|wachsen \\d/.test(_achsen.g[0].tx),
   'ihr Teaser erzaehlt die Partie statt die Kartenstruktur',
   (_achsen.g[0]||{}).tx);
ok(_achsen.b[0] && _achsen.t[0] && _achsen.b[0].sorte === 'spieler' && _achsen.t[0].sorte === 'tafel'
   && _achsen.b[0].rub !== _achsen.t[0].rub,
   'Spieler-Moment und Tafel-Moment tragen eigene Form und Rubrik',
   (_achsen.b[0]||{}).rub + ' / ' + (_achsen.t[0]||{}).rub);
ok(_achsen.b[0] && _achsen.t[0] && _achsen.b[0].pids === 1 && _achsen.t[0].pids === 3,
   'die Spieler-Karte zeigt ein Gesicht, die Tafel-Karte alle',
   (_achsen.b[0]||{}).pids + ' / ' + (_achsen.t[0]||{}).pids);
ok(_achsen.b[0] && _achsen.b[0].fuss === '3',
   'die Zahl der Erfolge steht im Fuss der Spieler-Karte, nicht im Satz',
   '„' + (_achsen.b[0]||{}).fuss + '"');
// Und die Zeilen wiederholen nicht, was oben steht [§C33].
ok(_achsen.b[0] && _achsen.b[0].zeilen.every(z => z.indexOf(_achsen.n0) !== 0),
   'auf der Spieler-Karte faellt der Name vor jeder Zeile weg',
   (_achsen.b[0]||{}).zeilen.join(' | '));
ok(_achsen.t[0] && new Set(_achsen.t[0].zeilen).size === 3
   && [_achsen.n0,_achsen.n1,_achsen.n2].every(n=>_achsen.t[0].zeilen.some(z=>z.indexOf(n)===0)),
   'auf der Tafel-Karte bleibt jeder beteiligte Traeger als eigene Zeile lesbar',
   (_achsen.t[0]||{}).zeilen.join(' | '));

// ── Nur die wichtigsten ────────────────────────────────────────────
// Gemessen trug ein Spieltag neun Karten und der Feed zweiundzwanzig, davon
// vier Fun Facts — einer an jedem Tag, auch an denen, an denen wirklich etwas
// passiert ist. „Leon fuehrt das Prestige an" gilt seit Wochen.
const _wenig = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  const tag = s => { const d = new Date(s.when);
    return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
  const proTag = {};
  sicht.forEach(s => { const k = tag(s);
    let brk = false; try { brk = _isBreaking(s); } catch(e){}
    if(!brk) proTag[k] = (proTag[k]||0) + 1; });
  const zuViel = Object.keys(proTag).filter(k => proTag[k] > NEWS_LIMITS.proTag);
  // Gezaehlt wird, was der Deckel auch wegnehmen kann. Breaking und die
  // Pflichtkarte eines Tages sind davon ausgenommen — und besetzten vorher
  // trotzdem einen Platz, obwohl der Feed sie ohnehin durchlaesst: gemessen
  // gingen am letzten Spieltag der Fixtures zwei von fuenf Plaetzen an einen
  // Countdown und den Spieler des Tages, und die 8er-Serie fiel heraus.
  // Und eine PARTIE-Karte zaehlt gar nicht mit: sie ist keine Auswahl, sie
  // wurde gespielt. Gemessen kamen von 52 Partien des Fensters 18 in einer
  // sichtbaren Karte vor, weil der Deckel die uebrigen wegnahm [§C33].
  const PFLICHT = new Set(['potd','woche','season_recap','chronik_frei']);
  // Die Runde der Vier nimmt Partie-Karten auf und ist selbst eine [§11.6c].
  const prt = s => { const d = (s&&s.dataRef)||{};
    return d.type === 'spiel' || d.type === 'runde'
        || (d.type === 'sammel' && d.quelle === 'spiel' && (!!d.matchId
            || (d.teile||[]).some(x => String((x&&x.id)||'').indexOf('spiel_') === 0))); };
  const zaehlbar = {};
  // Die erste Tafel-Karte eines Tages hat ihren eigenen Platz [§C33].
  const _tfl = s => s.cat === 'tafel' || (s.dataRef||{}).quelle === 'tafel'
                 || (s.dataRef||{}).quelle === 'form';
  const _frei = new Set();
  {
    const je = {};
    sicht.forEach(s => { if(_tfl(s)) (je[tag(s)] = je[tag(s)] || []).push(s); });
    Object.keys(je).forEach(k => je[k]
      .sort((a, b) => new Date(a.when) - new Date(b.when))
      .slice(0, NEWS_LIMITS.tafelProTagMin || 0)
      .forEach(s => _frei.add(s.id)));
  }
  sicht.forEach(s => { const k = tag(s), t = (s.dataRef||{}).type;
    let brk = false; try { brk = _isBreaking(s); } catch(e){}
    if(brk || PFLICHT.has(t) || t === 'elo_swing' || prt(s) || _frei.has(s.id)) return;
    zaehlbar[k] = (zaehlbar[k] || 0) + 1; });
  const zuVielZaehlbar = Object.keys(zaehlbar).filter(k => zaehlbar[k] > NEWS_LIMITS.proTag);
  // Ein Fun Fact steht nur an einem Tag ohne Nachricht.
  const echteTage = new Set();
  sicht.forEach(s => { const t = (s.dataRef||{}).type;
    if(t !== 'ambient' && t !== 'season_endgame') echteTage.add(tag(s)); });
  const funFacts = sicht.filter(s => (s.dataRef||{}).type === 'ambient');
  return {sicht: sicht.length, roh: roh.length,
          maxTag: Math.max.apply(null, Object.keys(proTag).map(k => proTag[k])),
          zuViel, zuVielZaehlbar,
          maxZaehlbar: Math.max.apply(null, Object.keys(zaehlbar).map(k => zaehlbar[k])),
          funFacts: funFacts.length,
          funAmLautenTag: funFacts.filter(s => echteTage.has(tag(s))).map(s => s.title),
          marken: roh.filter(s => (s.dataRef||{}).type === 'rivalry_milestone').length,
          deckel: NEWS_LIMITS.proTag, markenDeckel: NEWS_LIMITS.rivalryMarke};
})())`));
ok(_wenig.zuVielZaehlbar.length === 0,
   'kein Tag traegt mehr deckelbare Karten als der Deckel erlaubt',
   _wenig.zuVielZaehlbar.join(', ') || 'hoechstens ' + _wenig.maxZaehlbar);
ok(_wenig.funAmLautenTag.length === 0,
   'nachgeholte Fun Facts stehen nur an vergangenen stillen Tagen',
   _wenig.funAmLautenTag.join(' | ') || _wenig.funFacts + ' an stillen Tagen');
ok(_wenig.marken <= _wenig.markenDeckel,
   'nur die juengsten Duell-Meilensteine werden ueberhaupt gebildet',
   _wenig.marken + ' von hoechstens ' + _wenig.markenDeckel);

// Der Deckel darf nicht die Zusammenfassung des Tages nehmen. In einer
// simulierten Liga aus hundert Partien fiel „Tobi ist Spieler des Tages" als
// siebtstaerkste Karte heraus, waehrend zwei Auszeichnungen und eine laufende
// Serie darueber standen — der Tag hatte danach keinen Sieger mehr.
const _pflicht = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  // Einen Spieltag kuenstlich ueberfuellen: zehn Karten mit hoher Prio zur
  // Zeit des Spielers des Tages.
  const potd = roh.find(s => (s.dataRef||{}).type === 'potd');
  if(!potd) return {keine:true};
  // Zehn verschiedene Sorten, sonst raeumt schon der Deckel je Sorte auf und
  // der Tag laeuft gar nicht ueber.
  const sorten = ['milestone_wins','milestone_goals','milestone_elo','jubilee','top_form'];
  const fuell = [];
  for(let i = 0; i < 10; i++) fuell.push(Object.assign({}, potd, {
    id: 'fuell_' + i, title: 'Fuellkarte ' + i, desc: 'Zehn Karten mehr an diesem Tag. ' + i,
    prio: 99, dataRef: {type: sorten[i % sorten.length], pid: potd.dataRef.playerId}}));
  _cache._stories = fuell.concat(roh);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  return {potdDrin: sicht.some(x => x.id === potd.id),
          fuellDrin: sicht.filter(x => String(x.id).indexOf('fuell_') === 0).length};
})())`));
ok(!_pflicht.keine && _pflicht.potdDrin === true,
   'der Spieler des Tages ueberlebt einen ueberfuellten Tag', JSON.stringify(_pflicht));
console.log('  ' + _wenig.roh + ' erzeugt, ' + _wenig.sicht
  + ' im Feed, hoechstens ' + _wenig.maxTag + ' an einem Tag');

// ── Zwei gleich starke Redaktionshälften ────────────────────────────
// Eine Momentaufnahme des Generators unterschlaegt fast alle Tafelmeldungen:
// sie entstehen am jeweiligen Spieltag und leben danach aus der Persistenz.
// Deshalb wird der echte Vierzehn-Tage-Ablauf Tag fuer Tag nachgespielt und
// jede erstmals gebildete ID wie in der Datenbank behalten. Sammelkarten
// zaehlen nach ihren sichtbaren Zeilen — drei Ereignisse in einer Karte sind
// redaktionell weiterhin drei Geschichten.
const _mix = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle=matches.slice(), AlteDate=Date, alteStories=_cache._stories;
  const bestand=new Map(), ende=new AlteDate('2026-08-27T21:59:59Z').getTime();
  let aus=null;
  try {
    for(let tage=20; tage>=0; tage--){
      const jetzt=ende-tage*86400000;
      Date=class extends AlteDate {
        constructor(...a){ if(a.length) super(...a); else super(jetzt); }
        static now(){ return jetzt; }
      };
      matches=alle.filter(m=>mts(m)<=jetzt);
      invalidateCache(); _cache._stories=[...bestand.values()];
      (_buildStories()||[]).forEach(s=>{ if(!bestand.has(s.id)) bestand.set(s.id,s); });
    }
    matches=alle; invalidateCache();
    const roh=[...bestand.values()]
      .filter(s=>new Date(s.when).getTime()>=ende-NEWS_FENSTER_TAGE*86400000);
    _cache._stories=roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
    _cache._consolFrom=null; _cache._frischVon=null;
    const sicht=getStoriesCache();
    const istTafel=s=>s.cat==='tafel'||(s.dataRef||{}).quelle==='tafel';
    const tafel=sicht.filter(istTafel), rest=sicht.filter(s=>!istTafel(s));
    const fun=rest.filter(s=>(s.dataRef||{}).type==='ambient');
    const spiel=rest.filter(s=>{const d=s.dataRef||{}; return d.type!=='ambient' &&
      !!(d.matchId||d.type==='potd'||d.type==='woche'||d.type==='runde'||
         (d.type==='sammel'&&d.quelle==='spiel'));});
    const gewicht=s=>(s.dataRef||{}).type==='sammel'
      ? Math.max(1,((s.dataRef||{}).teile||[]).length) : 1;
    const tw=tafel.reduce((n,s)=>n+gewicht(s),0);
    const sw=spiel.reduce((n,s)=>n+gewicht(s),0);
    const zaehlTypen = liste => liste.reduce((o,s)=>{ const d=s.dataRef||{};
      const k=d.type==='sammel' ? 'sammel:'+d.quelle : d.type;
      o[k]=(o[k]||0)+gewicht(s); return o; },{});
    const tage=[...new Set(sicht.map(s=>tagKey(s.when)))].filter(k=>_newsTagMs(k).length);
    // Wuerdig ist, was das Band tragen darf — dieselbe Frage und dieselbe
    // Liste wie in der App [§C27]. Vorher stand sie hier ein zweites Mal.
    const karten=tage.map(k=>{
      const items=sicht.filter(s=>tagKey(s.when)===k);
      const id=_newsTagKarte(items,k), karte=items.find(s=>s.id===id);
      const kandidaten=items.filter(_newsTagKarteWuerdig);
      const max=kandidaten.length?Math.max.apply(null,kandidaten.map(_newsTagSpannung)):0;
      return {id,type:karte&&(karte.dataRef||{}).type,
        wuerdig:karte?_newsTagKarteWuerdig(karte):true,
        score:karte?_newsTagSpannung(karte):0,max,kand:kandidaten.length,
        partien:_newsTagMs(k).length};
    });
    aus={tafel:tw,spiel:sw,fun:fun.length,quote:tw/(tw+sw+fun.length),
      tafelKarten:tafel.length,spielKarten:spiel.length,
      kartenQuote:tafel.length/(tafel.length+spiel.length+fun.length),
      tafelTypen:zaehlTypen(tafel),spielTypen:zaehlTypen(spiel),
      // Ein Tag, an dem nur Breaking, der Spieler des Tages und Rueckblicke
      // stehen, hat kein Band — und das ist richtig, nicht falsch.
      // Ein Tag, dessen staerkste wuerdige Geschichte unter dem Niveau einer
      // Tagesbilanz bleibt, traegt kein Band: ein Band, das eine beliebige
      // Karte auszeichnet, zeichnet nichts aus [§C33].
      // Und ein Tag mit weniger als drei Partien traegt keins.
      karten, falsch:karten.filter(x=>x.kand && x.max >= NEWS_LIMITS.tagKarteSpannung
          && x.partien >= NEWS_LIMITS.tagKartePartien
        ? (!x.id||Math.abs(x.score-x.max)>1e-8) : !!x.id).length,
      ohneBand:karten.filter(x=>!x.id).length,
      // Gefragt wird die Karte selbst: die Runde ist wuerdig, wenn eine
      // ihrer Partien es ist [§11.6c], und das sagt der Typ allein nicht.
      bandUnwuerdig:karten.filter(x=>x.type && !x.wuerdig).length};
  } finally {
    matches=alle; Date=AlteDate; invalidateCache(); _cache._stories=alteStories;
    _cache._consolFrom=null; _cache._frischVon=null;
  }
  return aus;
})())`));
// Das Band ist das aus §C33: 20 bis 50 Prozent Tafel, gemessen an
// EREIGNISSEN und nicht an Karten — eine Sammelkarte mit vier sichtbaren
// Zeilen zaehlt vier Geschichten. Es stand bei 40 bis 60, und das war die
// Lage, in der nur ein Bruchteil der Partien ueberhaupt eine Karte hatte:
// gemessen kamen von 52 Partien des Fensters 18 vor. Seit jede Partie ihre
// Karte bekommt, fuehrt der Spieltag — die Tafel ist die zweite Ebene
// daneben und nicht die halbe Tafel. Gemessen liegt sie bei 25 % der
// Ereignisse und 17 % der Karten, und ihren Platz je Tag haelt sie ueber die
// Reservierung, nicht ueber die Quote. Die Untergrenze stand bei 25 %: mit
// den laengeren Fenstern von Lauf und Hoehenflug [§C35] wechseln die beiden
// nicht mehr jede Woche den Halter, und das nahm sieben von 53 Ereignissen.
ok(_mix.quote >= .20 && _mix.quote <= .50,
   'der Spieltag fuehrt, und die Tafel bleibt die zweite Ebene daneben',
   `${_mix.tafel} zu ${_mix.spiel}+${_mix.fun} · ${Math.round(_mix.quote*100)} % Tafel; `
   + `${_mix.tafelKarten} zu ${_mix.spielKarten}+${_mix.fun} Karten · ${Math.round(_mix.kartenQuote*100)} %; `
   + JSON.stringify({tafel:_mix.tafelTypen,spiel:_mix.spielTypen}));
ok(_mix.fun > 0,
   'die Gegenhaelfte enthaelt automatisch erzeugte Fun Facts',
   _mix.fun + ' Fun Facts');
ok(_mix.karten.length >= 5 && _mix.falsch === 0
   && _mix.karten.every(x=>!x.id || x.score>=620),
   'jede echte Karte des Tages ist die spannendste wuerdige Geschichte ihres Spieltags',
   _mix.karten.map(x=>(x.type||'ohne Band')+':'+Math.round(x.score)).join(' · '));
ok(_mix.bandUnwuerdig === 0,
   'kein Band gehoert Breaking, dem Spieler des Tages oder einem Rueckblick',
   _mix.karten.map(x=>x.type||'ohne Band').join(', ')
   + ' · ' + _mix.ohneBand + ' Tage ohne Band');

// ── Das Rekord-Blatt nennt niemanden zweimal ────────────────────────
// „Maxi, Leo und Julian uebernehmen" stand im Kopf, „Vorher gehalten von Maxi
// und Julian und Leo" darunter, und unter „Wer sonst noch vorne steht" noch
// einmal dieselben drei mit derselben Zahl. Drei Bloecke, ein Inhalt.
// Und eine Uebernahme, deren Vorgaenger die heutigen Halter SIND, hat es nie
// gegeben: der Generator bildet ihre ID nicht mehr, also bliebe die
// persistierte Karte fuer immer stehen.
const _rek = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const vorlage = roh.find(s => (s.dataRef||{}).type === 'rekord_geholt')
               || roh.find(s => ((s.dataRef||{}).type||'').indexOf('rekord_') === 0);
  if(!vorlage) return {keine:true};
  const ids = (vorlage.dataRef.playerIds || []).slice();
  // Eine Uebernahme von sich selbst, wie sie der alte Vergleich erzeugte.
  const falsch = Object.assign({}, vorlage, {id: vorlage.id + '_selbst',
    title: 'X uebernimmt den Rekord von sich selbst',
    desc: 'Derselbe Halter wie vorher, nur anders sortiert. 3 Stueck.',
    dataRef: Object.assign({}, vorlage.dataRef,
      {type:'rekord_geholt', vorher: ids.slice().reverse()})});
  _cache._stories = [falsch].concat(roh);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  // Und ein echtes Blatt: steht ein Halter unter den Verfolgern?
  const echt = Object.assign({}, vorlage, {dataRef: Object.assign({}, vorlage.dataRef,
    {type:'rekord_geholt'})});
  const b = _newsDetailBody(echt);
  const vf = (b.match(/class="nd-vf-nm">([^<]*)</g)||[])
    .map(t => t.replace(/^[^>]*>/,'').replace(/<$/,''));
  const _pm = pmap();
  const halterNamen = ids.map(id => (_pm[id]||{}).name).filter(Boolean);
  // Gezaehlt wird die AUSSAGE: die Karte kann als Zeile in einer Sammelkarte
  // stehen, und dann steht sie trotzdem im Feed.
  const zeilen = [];
  sicht.forEach(x => { const t = ((x.dataRef||{}).teile||[]);
    if(t.length > 1) t.forEach(u => zeilen.push(u.titel)); else zeilen.push(x.title); });
  const generatorSelbst = roh.filter(s => { const d=s.dataRef||{};
    return d.type === 'rekord_geholt' && d.fall === 'uebernommen'
      && (d.playerIds||[]).some(id => (d.vorher||[]).includes(id)); }).length;
  return {selbstDurch: zeilen.filter(t => t === falsch.title).length, generatorSelbst,
          halterUnterVerfolgern: vf.filter(n => halterNamen.indexOf(n) >= 0).length,
          verfolger: vf.length};
})())`));
ok(!_rek.keine, 'es gibt eine Rekord-Uebernahme', JSON.stringify(_rek));
ok(_rek.generatorSelbst === 0, 'der Generator laesst niemanden einen Rekord von sich selbst uebernehmen',
   _rek.generatorSelbst + ' erzeugt');
ok(_rek.selbstDurch === 1, 'ein bereits publizierter Legacy-Snapshot wird beim Lesen nicht geloescht',
   _rek.selbstDurch + ' erhalten');
ok(_rek.halterUnterVerfolgern === 0, 'der Halter steht nicht unter den Verfolgern',
   _rek.halterUnterVerfolgern + ' von ' + _rek.verfolger);

// ── Derselbe Halter in anderer Reihenfolge ist kein Wechsel ─────────
// „Maxi, Leo und Julian uebernehmen" stand im Feed, und darunter „Vorher
// gehoerte er Maxi, Julian und Leo" — dieselben drei, nur anders sortiert.
const _halter = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = {pids:['a','b','c'], ev:'7 Siege', val:7};
  const B = {pids:['c','a','b'], ev:'7 Siege', val:7};
  const C = {pids:['a','b'],     ev:'7 Siege', val:7};
  return {gleicheGruppe: _rekordArt(A, B), andereGruppe: _rekordArt(A, C),
          liste1: _namenListe(['Maxi']), liste3: _namenListe(['Maxi','Julian','Leo'])};
})())`));
ok(_halter.gleicheGruppe === '', 'dieselbe Haltergruppe ist kein Wechsel',
   _halter.gleicheGruppe || 'leer');
ok(_halter.andereGruppe === 'geholt', 'eine andere Haltergruppe schon',
   _halter.andereGruppe);
ok(_halter.liste3 === 'Maxi, Julian und Leo', 'drei Namen lesen sich als Aufzaehlung',
   _halter.liste3);
ok(_halter.liste1 === 'Maxi', 'ein Name bleibt ein Name', _halter.liste1);

// ── Die Schlagzeile nennt alle, um die es geht ──────────────────────
// Ueber einer Sammelkarte von drei Leuten stand „Leon und Martin bewegen die
// Ewige Tafel": zwei der drei Namen in der Zeile, der dritte nur in der Liste
// darunter. Genannt werden jetzt alle, und ab dem vierten zaehlt die Zeile
// den Rest — sechs Namen sprengen jede Ueberschrift.
const _nk = JSON.parse(K.eval(`JSON.stringify({
  eins:  _namenKurz(['Leon']),
  zwei:  _namenKurz(['Leon','Martin']),
  drei:  _namenKurz(['Leon','Martin','Julian']),
  vier:  _namenKurz(['Leon','Martin','Julian','Maxi']),
  sechs: _namenKurz(['Leon','Martin','Julian','Maxi','Leo','Jane']),
  paar:  _namenKurz(['Leon','Martin','Julian'], 2)
})`));
ok(_nk.eins === 'Leon', 'ein Name steht allein da', _nk.eins);
ok(_nk.zwei === 'Leon und Martin', 'zwei Namen mit und', _nk.zwei);
ok(_nk.drei === 'Leon, Martin und Julian', 'drei Namen als Aufzaehlung', _nk.drei);
ok(_nk.vier === 'Leon, Martin und zwei weitere', 'ab dem vierten zaehlt die Zeile', _nk.vier);
ok(_nk.sechs === 'Leon, Martin und vier weitere', 'und bei sechs genauso', _nk.sechs);
ok(_nk.paar === 'Leon und zwei weitere', 'die Grenze ist einstellbar', _nk.paar);

// Und dieselbe Regel an der echten Sammelkarte: drei Rekordwechsel an einem
// Tag, drei Namen in der Ueberschrift.
const _samT = JSON.parse(K.eval(`JSON.stringify((function(){
  const bau = n => {
    const wann = new Date().toISOString(), teile = [];
    for(let i = 0; i < n; i++) teile.push({
      id:'t' + i, title:'Titel ' + i, desc:'Text ' + i, cat:'tafel', ic:'award',
      when:wann, prio:90 - i,
      dataRef:{type:'rekord_geholt', rekordId:'r' + i, playerIds:[players[i].id]}});
    const k = _consolidateStories(teile).find(s => (s.dataRef||{}).type === 'sammel');
    return k ? k.title : '';
  };
  return {zwei:bau(2), drei:bau(3), namen:players.slice(0,3).map(p => p.name)};
})())`));
ok(_samT.drei.indexOf(_samT.namen[2]) >= 0,
   'die Sammelkarte nennt auch den dritten Namen', _samT.drei);
ok(/ bewegen die Ewige Tafel$/.test(_samT.drei) && /^[^,]+, [^,]+ und /.test(_samT.drei),
   'und zaehlt sie als Aufzaehlung auf', _samT.drei);
ok(_samT.zwei === _samT.namen[0] + ' und ' + _samT.namen[1] + ' bewegen die Ewige Tafel',
   'zwei Namen stehen weiter mit und', _samT.zwei);

// ── Dieselbe Aussage nicht dreimal in einer Woche ───────────────────
// „Martin baut ‚Der Massstab' aus" gilt nach jedem gewonnenen Spiel aufs
// Neue, jedes Mal mit einem Prozentpunkt mehr: andere ID, andere Zahl,
// dieselbe Nachricht. Gemessen standen vier davon nebeneinander im Feed.
// Gesperrt wird die AUSSAGE — Art, Beteiligte und Sache —, nicht der
// Wortlaut: der aendert sich ja gerade.
const _sperre = JSON.parse(K.eval(`JSON.stringify((function(){
  const tag = 86400000, jetzt = Date.now();
  const lauf = (abstand, n) => {
    const l = [];
    for(let i = 0; i < n; i++) l.push({
      id:'rek_x_' + i, title:'Martin steht bei ' + (73 + i) + ' %', desc:'Text ' + i,
      cat:'tafel', ic:'award', prio:70, when:new Date(jetzt - i * abstand * tag).toISOString(),
      dataRef:{type:'rekord_gesteigert', rekordId:'yardstick', playerIds:[players[9].id]}});
    return _consolidateStories(l).filter(s => (s.dataRef||{}).type === 'rekord_gesteigert').length;
  };
  // Verschiedene Halter sind verschiedene Aussagen und bleiben beide stehen.
  const wechsel = (() => {
    const l = [0, 1].map(i => ({
      id:'rek_w_' + i, title:'Wechsel ' + i, desc:'Text ' + i, cat:'tafel', ic:'award',
      prio:84, when:new Date(jetzt - i * tag).toISOString(),
      dataRef:{type:'rekord_geholt', rekordId:'yardstick', playerIds:[players[i].id],
               vorher:[players[i + 4].id]}}));
    return _consolidateStories(l).length;
  })();
  return {taeglich:lauf(1, 3), weitAuseinander:lauf(4, 2), wechsel, tage:NEWS_LIMITS.sperreTage};
})())`));
ok(_sperre.tage >= 1, 'es gibt eine Sperrfrist', String(_sperre.tage));
ok(_sperre.taeglich === 3, 'drei publizierte Aussagen an drei Tagen bleiben drei Ereignisse',
   String(_sperre.taeglich));
ok(_sperre.weitAuseinander === 2, 'vier Tage auseinander bleiben beide stehen',
   String(_sperre.weitAuseinander));
ok(_sperre.wechsel === 2, 'ein Halterwechsel ist jedes Mal eine eigene Nachricht',
   String(_sperre.wechsel));

// ── Eine Karte sagt, was zu tun ist ─────────────────────────────────
// „Jane liegt ‚Das Sonntagskind' am naechsten" nannte weder, worum es geht,
// noch was dafuer verlangt ist: darunter stand allein „Leon haelt den
// Bestwert". Wer die Karte las, wusste danach nur, dass ihm irgendetwas
// fehlt. Die Bedingung steht im Katalog und gehoert auf die Karte.
const _ziel = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const T = _ambientTemplatePool(new Date(), pm, nameOf);
  const v = T.find(x => x.key === 'prestige_schritt');
  if(!v) return {fehlt:true};
  const k = v.make(() => 0.42);
  if(!k) return {leer:true};
  const bedingungen = [];
  // Jeder offene Schritt jedes Spielers, damit die Regeln nicht am
  // einen Fall haengen, den die Karte gerade zufaellig zieht.
  const alle = [];
  players.forEach(p => prestigeSchritte(p.id, 99).forEach(s => {
    alle.push(s);
    if(s.cond) bedingungen.push(s.cond);
  }));
  // Der Katalog schreibt negativ, die abgeleitete Rekordliste neg. Die
  // Zusicherung fragt beide Felder ab, sonst prueft sie am falschen Namen
  // vorbei und ist immer gruen.
  const neg = alle.filter(s => {
    const d = (s.art === 'monat' ? DISZIPLINEN : CHRONICLES).find(x => x.id === s.id);
    return d && (d.art === 'schatten' || d.negativ === true || d.neg === true);
  }).map(s => s.art + '/' + s.id);
  // Der eigene Stand: ohne ihn sagt die Karte nicht, wie weit es noch ist.
  const ohneStand = alle.filter(s => s.art === 'rekord' && s.stand && !s.mein).length;
  // Und ein Verb je Halterzahl.
  const karten = [];
  players.forEach(p => {
    const st = prestigeSchritte(p.id, 1);
    if(!st.length) return;
    const kk = v.make(() => (players.indexOf(p) + 0.5) / players.length);
    if(kk) karten.push(kk.desc || '');
  });
  // Gemessen wird an ALLEN Schritten, nicht an der einen Karte, die der
  // Wuerfel gerade zieht: ein Rekord mit mehreren Haltern kommt in den
  // zwoelf gezogenen Karten nicht zwangslaeufig vor.
  const viele = alle.filter(x => (x.halterN || 0) > 1);
  return {t:k.title, d:k.desc, passt:bedingungen.some(c => k.desc.indexOf(c) >= 0),
          neg, ohneStand, n:alle.length,
          vieleN:viele.length,
          amp:alle.filter(x => /&/.test(String(x.halter) + String(x.txt))).length,
          verb:viele.filter(x => / hält /.test(String(x.txt))).map(x => x.txt),
          steht:karten.filter(t => / steht bei /.test(t)).length, k:karten.length};
})())`));
ok(!_ziel.fehlt && !_ziel.leer, 'die Karte zum naechsten Rekord entsteht', JSON.stringify(_ziel));
ok(!/am nächsten/.test(_ziel.t || ''), 'ihre Schlagzeile sagt nicht nur, wer am naechsten liegt',
   _ziel.t);
ok(_ziel.passt,
   'und ihr Text nennt die Bedingung aus dem Katalog', (_ziel.d || '').slice(0, 90));
ok(/Prestige/.test(_ziel.d || ''), 'samt dem, was der Rekord einbringt', (_ziel.d || '').slice(0, 90));

// ── Ein Ziel, das niemand haben will, ist kein Ziel ─────────────────
// „Alex kann ‚Die bitterste Pleite' holen" stand im Feed: die hoechste
// Siegchance, mit der je jemand verlor, als Aufgabe. Gefiltert war nur die
// Schattenseite, nicht die negative Fuegung — `nextRecordFor` kennt die
// Regel seit jeher [§C25].
ok(_ziel.neg.length === 0, 'kein negativer Eintrag wird als Ziel vorgeschlagen',
   _ziel.neg.join(', ') || 'keiner');
// ── Und die Karte nennt den eigenen Stand ───────────────────────────
// Sie sagte die Schwelle und den Bestwert des Halters. „Martin haelt den
// Bestwert mit 84 %" ist ohne die eigenen 71 % keine Auskunft darueber, wie
// weit es noch ist.
ok(_ziel.n > 0, 'es gibt offene Schritte zu messen', String(_ziel.n));
ok(_ziel.ohneStand === 0, 'jeder offene Rekord kennt den eigenen Stand',
   String(_ziel.ohneStand));
ok(_ziel.k > 0 && _ziel.steht > 0, 'und die Karte schreibt ihn hin',
   _ziel.steht + ' von ' + _ziel.k);
// ── „&" gehoert in eine Zelle, nicht in einen Satz ──────────────────
// `_chronHolderNames` ist die Form fuer die schmale Zelle des
// Rekorde-Reiters. Im Fliesstext stand damit „Martin & Julian haelt den
// Bestwert mit 84 %": das Zeichen als einziges im Satz, und das Verb im
// Singular ueber zwei Leute [§C33].
ok(_ziel.vieleN > 0, 'es gibt Rekorde mit mehreren Haltern', String(_ziel.vieleN));
ok(_ziel.amp === 0, 'kein Kaufmanns-Und in einem Prestige-Satz', String(_ziel.amp));
ok(_ziel.verb.length === 0, 'zwei Halter halten, nicht haelt',
   _ziel.verb[0] || 'keiner');

// ── Jede Ambient-Karte traegt einen Wert, mit dem man etwas anfangen
// kann ──────────────────────────────────────────────────────────────
// Sie stehen an vierzig Stellen und wurden nie zusammen gemessen, also
// ging jede einzeln kaputt: „vor -1 Tagen" (der Fun Fact von 10 Uhr sah
// eine Auszeichnung aus der Partie um 11:39), „7 traegt den Schildring",
// „Im Schnitt fallen 6.9 Tore" mit englischem Punkt, „1 Platz" als Anzahl
// statt als Rang und ein leerer Wertblock. Der Deckel ist deshalb ein
// Rundlauf ueber ALLE Vorlagen: eine neue Karte ist gerade die, an die
// niemand denkt.
const _amb = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const raus = { ohneWert:[], punkt:[], minus:[], amp:[], verb:[] };
  // Mehrere Zeitpunkte und mehrere Wuerfel, damit jede Vorlage auch die
  // Zweige trifft, die von der Uhrzeit oder vom gezogenen Spieler haengen.
  // Dazu der Vormittag jedes Spieltags der letzten Wochen: der Fun Fact von
  // 10 Uhr entsteht VOR der ersten Partie, sah aber die ganze Liste und
  // rechnete damit „vor -1 Tagen". Nur mit dem heutigen Zeitpunkt ist
  // dieser Zweig nie zu treffen.
  const morgen = [...new Set(matches.map(m => String(m.created_at).slice(0, 10)))]
    .sort().slice(-25).map(d => new Date(d + 'T08:00:00'));
  [new Date(), new Date(Date.now() - 36e5 * 9)].concat(morgen).forEach(t0 => {
    const T = _ambientTemplatePool(t0, pm, nameOf);
    T.forEach(v => {
      for(let i = 0; i < 12; i++){
        let k = null;
        try { k = v.make(() => (i + 0.5) / 12); } catch(e){ continue; }
        if(!k) continue;
        const txt = String(k.title || '') + ' | ' + String(k.desc || '');
        // Der grosse Block der Karte darf nicht leer bleiben.
        if(k.vv === undefined || k.vv === null || String(k.vv) === '')
          raus.ohneWert.push(v.key);
        // Eine Dezimalzahl traegt hier ein Komma [§C27].
        if(/\\d\\.\\d/.test(txt.replace(/\\d{1,2}\\.\\d{1,2}\\./g, '')))
          raus.punkt.push(v.key + ': ' + txt.slice(0, 60));
        // Keine negative Anzahl: „vor -1 Tagen", „-2 Siege".
        if(/(^|[^\\d.,])-\\s?\\d/.test(txt)) raus.minus.push(v.key + ': ' + txt.slice(0, 60));
        // „&" gehoert in eine Tabellenzelle, nicht in einen Satz.
        if(/&/.test(txt)) raus.amp.push(v.key);
        // Eine Zahl ueber eins bekommt das Verb im Plural.
        if(/\\b([2-9]|\\d\\d+) (trägt|hält|liegt|steht|gewinnt|verliert|holt|ist)\\b/.test(txt))
          raus.verb.push(v.key + ': ' + txt.slice(0, 60));
      }
    });
  });
  const T0 = _ambientTemplatePool(new Date(), pm, nameOf);
  const einzig = {}; T0.forEach(v => { einzig[v.key] = (einzig[v.key] || 0) + 1; });
  return { n:T0.length, raus,
           doppelt:Object.keys(einzig).filter(k => einzig[k] > 1) };
})())`));
ok(_amb.n >= 30, 'der Rundlauf sieht alle Vorlagen', String(_amb.n));

// ── Der grosse Wert ist eine Zahl der Karte, keine Konstante ────────
// „1" mit der Aufschrift „Rekordhalter" stand im Block des Chronik-
// Rampenlichts: das gilt fuer jeden Rekord, sagt damit nichts, und die
// Aufschrift beschrieb den TRAeGER statt die Zahl. Gemessen trug die
// Vorlage 25 verschiedene Titel und immer denselben Wert.
//
// Geprueft wird das Muster und nicht der eine Fall: wechselt der Titel
// einer Vorlage, muss der Wert mitwechseln. Ein Fun Fact ueber die ganze
// Liga („7499 Tore in 466 Partien") behaelt beides und faellt nicht
// darunter; von den sechsunddreissig Vorlagen traf es genau diese eine.
const _konst = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap(); const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const s = {};
  const morgen = [...new Set(matches.map(m => String(m.created_at).slice(0, 10)))]
    .sort().slice(-25).map(d => new Date(d + 'T08:00:00'));
  [new Date(), new Date(Date.now() - 36e5 * 9)].concat(morgen).forEach(t0 => {
    _ambientTemplatePool(t0, pm, nameOf).forEach(v => {
      for(let i = 0; i < 12; i++){
        let k = null;
        try { k = v.make(() => (i + 0.5) / 12); } catch(e){ continue; }
        if(!k) continue;
        const e = s[v.key] || (s[v.key] = {t:{}, w:{}});
        e.t[String(k.title || '')] = 1; e.w[String(k.vv)] = 1;
      }
    });
  });
  return Object.keys(s).filter(k => Object.keys(s[k].t).length > 1
                                 && Object.keys(s[k].w).length === 1)
    .map(k => k + ' (' + Object.keys(s[k].t).length + ' Titel, Wert „'
      + Object.keys(s[k].w)[0] + '")');
})())`));
ok(_konst.length === 0, 'kein grosser Wert bleibt konstant, waehrend der Titel wechselt',
   _konst.join(' · ') || 'alle ' + _amb.n + ' Vorlagen');

// Und der Feed meldet keine Schattenseite [§C35]. Das Rampenlicht rotierte
// ueber ALLE vergebenen Rekorde, zwoelf davon negativ, und die Rotation
// haengt am Kalendertag: an jedem fuenften Tag stand „Alex haelt ‚Das
// Scheunentor'" als Fun Fact im Feed.
const _schand = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const neg = {};
  CHRONICLES.forEach(d => { if(d.neg) neg[d.name] = 1; });
  // Die Auswahl haengt am KALENDERTAG (\`day % recs.length\`), also trifft nur
  // ein voller Umlauf jeden Eintrag des Topfes. Achtzig Tage reichen dafuer:
  // der Topf ist kleiner. Gemessen wird die Karte selbst und nicht der Topf
  // mit derselben Bedingung noch einmal — das waere ein Test, der nie rot
  // werden kann.
  const getroffen = {}, raus = {};
  for(let t = 0; t < 80; t++){
    const t0 = new Date(Date.now() - t * 86400000);
    const v = _ambientTemplatePool(t0, pm, nameOf)
      .find(x => x.key === 'chronicle_spotlight');
    if(!v) return ['die Vorlage gibt es nicht mehr'];
    let k = null;
    try { k = v.make(() => 0.5); } catch(e){ continue; }
    if(!k) continue;
    Object.keys(neg).forEach(n => {
      if(String(k.title || '').indexOf('„' + n + '“') >= 0) raus[n] = 1; });
    const m = String(k.title || '').match(/„([^“]+)“/);
    if(m) getroffen[m[1]] = 1;
  }
  const liste = Object.keys(raus);
  return liste.length ? liste : (Object.keys(getroffen).length < 5
    ? ['der Umlauf traf nur ' + Object.keys(getroffen).length + ' Eintraege'] : []);
})())`));
ok(_schand.length === 0, 'das Chronik-Rampenlicht zeigt keine Schattenseite',
   _schand.join(', ') || 'achtzig Tage nachgespielt, kein negativer Eintrag');
ok(_amb.doppelt.length === 0, 'jede Vorlage hat ihren eigenen Schluessel',
   _amb.doppelt.join(', ') || 'keine');
ok(_amb.raus.ohneWert.length === 0, 'keine Ambient-Karte ohne grossen Wert',
   [...new Set(_amb.raus.ohneWert)].join(', ') || 'keine');
ok(_amb.raus.punkt.length === 0, 'jede Dezimalzahl traegt ein Komma',
   _amb.raus.punkt[0] || 'keine');
ok(_amb.raus.minus.length === 0, 'keine negative Anzahl in einer Karte',
   _amb.raus.minus[0] || 'keine');
ok(_amb.raus.amp.length === 0, 'kein Kaufmanns-Und in einer Ambient-Karte',
   [...new Set(_amb.raus.amp)].join(', ') || 'keins');
ok(_amb.raus.verb.length === 0, 'eine Mehrzahl bekommt ihr Verb im Plural',
   _amb.raus.verb[0] || 'keine');

// ── Der Feed meldet keine Schande ───────────────────────────────────
// Die Liga liest ihn gemeinsam [§C33]. Eine Schattenseite steht im
// Rekorde-Reiter und im Profil, aber niemand bekommt eine Nachricht darueber,
// dass er am meisten kassiert. Seit die Schandtafel dreizehn Eintraege traegt,
// ist das nicht mehr an einer Handvoll IDs zu erkennen: geprueft wird gegen
// den KATALOG, damit ein neuer Eintrag nicht still durchrutscht.
const _keineSchande = JSON.parse(K.eval(`JSON.stringify((function(){
  const ids = CHRONICLES.filter(c => c.neg).map(c => c.id)
    .concat(SEASON_TITLES.filter(t => t.kunst === 'schatten').map(t => t.id));
  const st = _buildStories() || [];
  const treffer = [];
  st.forEach(s => {
    const j = JSON.stringify(s);
    ids.forEach(id => { if(j.indexOf('"' + id + '"') >= 0) treffer.push(s.type + '/' + id); });
  });
  return {stories:st.length, ids:ids.length, treffer:[...new Set(treffer)]};
})())`));
ok(_keineSchande.stories > 0 && _keineSchande.ids >= 12,
   'der Durchlauf sieht Stories und kennt die ganze Schandtafel',
   _keineSchande.stories + ' Stories, ' + _keineSchande.ids + ' Schande-IDs');
ok(_keineSchande.treffer.length === 0, 'keine Schande steht im Feed',
   _keineSchande.treffer.slice(0, 4).join(', ') || 'keine');

// ── Wer eine Bestmarke ausruft, nennt ihren Halter ──────────────────
// „Leon beherrscht die Wochen · 6x Spieler der Woche. Bestwert der Liga"
// stand im Feed, und derselbe Bestwert gehoerte im Rekorde-Reiter Julian:
// Leon hat 4 von 15 eigenen Wochen gewonnen, Julian 4 von 13. Die Karte
// zaehlte die Titel, der Rekord misst den Anteil — und die Anzahl gehoert
// dem, der oefter dabei war [§C35]. Gerechnet wird deshalb an EINER Stelle
// [§C27]: `chronicleRang` ist die Reihenfolge, die auch das Rekord-Blatt
// zeigt. Geprueft wird der genannte Spieler, nicht der Wortlaut: die Karte
// darf nur Halter benennen.
const _bmk = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  // Der Umsteiger und der Aufschwung sind gestrichen; ihre Karten mit ihnen.
  const paare = { personal_glanztag:'glanztag' };
  const T = _ambientTemplatePool(new Date(), pm, nameOf);
  const out = [];
  Object.keys(paare).forEach(key => {
    const v = T.find(x => x.key === key);
    if(!v){ out.push({ key, fehlt:true }); return; }
    const r = chronicleRang(paare[key]) || [];
    const halter = r.filter(x => x.wert === (r[0] || {}).wert).map(x => x.pid);
    for(let i = 0; i < 12; i++){
      let k = null;
      try { k = v.make(() => (i + 0.5) / 12); } catch(e){ continue; }
      if(!k) continue;
      const d = k.dataRef || {};
      const pids = d.ambientPids || (d.ambientPid ? [d.ambientPid] : []);
      // Die beiden Quoten des Satzes: ein Anteil in Prozent oder „x von n".
      const q = [...String(k.desc || '').matchAll(/([0-9]+) von ([0-9]+) Partien|([0-9]+) %/g)]
        .map(x => x[3] != null ? +x[3] : Math.round(+x[1] / +x[2] * 100));
      out.push({ key, rek:paare[key], n:pids.length,
        fremd: pids.filter(x => halter.indexOf(x) < 0).map(nameOf),
        halter: halter.map(nameOf),
        rechnung: q.length >= 2 && Math.abs(parseInt(k.vv, 10)) === Math.abs(q[0] - q[1]),
        satz: k.vv + ' · ' + k.desc });
    }
  });
  return out;
})())`));
ok(_bmk.length >= 1 && !_bmk.some(x => x.fehlt),
   'die Bestmarken-Karte steht im Pool',
   _bmk.filter(x => x.fehlt).map(x => x.key).join(', ') || String(_bmk.length));
ok(_bmk.every(x => x.fehlt || x.n > 0),
   'jede Bestmarken-Karte nennt ueberhaupt einen Spieler',
   (_bmk.find(x => !x.fehlt && !x.n) || {}).key || 'alle');
const _bmkFremd = _bmk.filter(x => x.fremd && x.fremd.length);
ok(_bmkFremd.length === 0, 'jede Bestmarken-Karte nennt nur Halter des Rekords',
   _bmkFremd.length ? _bmkFremd[0].key + ': ' + _bmkFremd[0].fremd.join(', ')
     + ' statt ' + _bmkFremd[0].halter.join(', ') : 'keine Abweichung');
// Der grosse Wert ist der Abstand der beiden Quoten im Satz darunter, so wie
// sie dastehen: „+13 %-Punkte … 32 % der Partien, sonst 20 %" stand da, weil
// der Wert ungerundet gerundet wurde und die Quoten einzeln.
const _bmkRechnung = _bmk.filter(x => !x.fehlt && x.n && !x.rechnung);
ok(_bmk.some(x => x.rechnung) && _bmkRechnung.length === 0,
   'der Wert einer Bestmarken-Karte ist die Differenz der Quoten im Satz',
   _bmkRechnung.length ? _bmkRechnung[0].satz : 'stimmt');

// „Das Kaltblut" misst einen Anteil und keinen Abstand: die Karte nennt nur
// Halter des Rekords, und ihr grosser Wert ist der Anteil, den das „x von n"
// im Satz ergibt — nicht ein zweites Mal gerechnet und anders gerundet.
const _kbl = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const v = _ambientTemplatePool(new Date(), pm, nameOf).find(x => x.key === 'personal_kaltblut');
  if(!v) return {fehlt:true};
  const r = chronicleRang('kaltblut') || [];
  const halter = r.filter(x => x.wert === (r[0] || {}).wert).map(x => x.pid);
  const k = v.make(() => 0.5);
  if(!k) return {leer:true, n:r.length};
  const d = k.dataRef || {};
  const pids = d.ambientPids || (d.ambientPid ? [d.ambientPid] : []);
  const m = String(k.desc).match(/([0-9]+) von ([0-9]+) Partien/);
  return {n:pids.length, fremd:pids.filter(x => halter.indexOf(x) < 0).map(nameOf),
    stimmt: !!m && parseInt(k.vv, 10) === Math.round(+m[1] / +m[2] * 100),
    satz: k.vv + ' · ' + k.desc};
})())`));
ok(!_kbl.fehlt && !_kbl.leer && _kbl.n > 0 && _kbl.fremd.length === 0,
   'die Kaltblut-Karte steht im Pool und nennt nur Halter des Rekords',
   _kbl.fehlt ? 'fehlt' : _kbl.leer ? 'leer bei ' + _kbl.n + ' im Rennen' : (_kbl.fremd.join(', ') || _kbl.satz));
ok(_kbl.stimmt, 'der Wert der Kaltblut-Karte ist der Anteil aus dem Satz darunter', _kbl.satz || '');

// ── Kein Listentrenner im Fliesstext ────────────────────────────────
// Ein Beleg wie „20 % aller 25 Siege endeten 10:9 · 5" ist fuer eine Zelle
// gebaut: der Mittelpunkt trennt dort zwei Spalten. Mitten in einem Satz
// steht er wie ein Tippfehler, und danach ging es klein weiter: „… gewonnen
// · 9. sonst haelt ihn niemand."
const _fliess = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const texte = _buildStories().map(s => s.desc || '');
  _ambientTemplatePool(new Date(), pm, nameOf).forEach(v => {
    let k = null; try { k = v.make(() => 0.42); } catch(e){}
    if(k) texte.push(k.desc || '');
  });
  return {
    punkt: texte.filter(t => /·/.test(t)).length,
    // Ein Datum wie „26.08. hat niemand mehr geholt" endet keinen Satz und
    // wird vorher entfernt, sonst schlaegt die Regel an der falschen Stelle
    // an statt dort, wo sie hingehoert: „… gewonnen · 9. sonst haelt ihn
    // niemand."
    klein: texte.filter(t => /\\.\\s+[a-zäöüß]/
      .test(String(t).replace(/\\d{1,2}\\.\\d{1,2}\\.\\s/g, ' '))).length,
    probe: _evSatz('20 % aller 25 Siege endeten 10:9 · 5 Zittersiege')
  };
})())`));
ok(_fliess.punkt === 0, 'kein Story-Text traegt einen Listentrenner', String(_fliess.punkt));
ok(_fliess.klein === 0, 'und kein Satz faengt klein an', String(_fliess.klein));
ok(_fliess.probe === '20 % aller 25 Siege endeten 10:9, 5 Zittersiege',
   'der Beleg wird fuer den Fliesstext umgestellt', _fliess.probe);

// ── Wer da zusammen steht, und warum ────────────────────────────────
// Unter zwei Wappen stand „als Duo", sobald eine Karte genau zwei Leute
// zeigte. Bei „Martin schlaegt Leo im Spitzenspiel" standen sich die beiden
// gegenueber, und bei „Johannes und Stefan bewegen die Ewige Tafel" holte
// jeder einen eigenen Rekord. Die Beziehung sagt der STORY-TYP, nicht die
// Kartenform.
const _bez = JSON.parse(K.eval(`JSON.stringify((function(){
  const f = typ => _ndBeziehung({dataRef:{type:typ, matchId:'m1'}}, 2);
  const roh = _buildStories();
  const alle = roh.concat(_consolidateStories(roh));
  const falsch = [];
  const seen = {};
  alle.forEach(s => {
    const d = s.dataRef || {};
    const t = d.type || '';
    if(seen[t]) return; seen[t] = 1;
    let ids = []; try { ids = (_newsPids(s) || []); } catch(e){}
    if(ids.length < 2) return;
    const b = _ndBeziehung(s, ids.length);
    // „als Duo" darf nur dastehen, wo die Karte wirklich von einem Duo handelt.
    if(b === 'als Duo' && t !== 'team_streak' && t !== 'team_loss_streak') falsch.push(t);
    if(!b) falsch.push(t + '(leer)');
  });
  return {falsch, clash:f('top_clash'), duo:f('team_streak'), duell:f('rivalry'),
          sammel:_ndBeziehung({dataRef:{type:'sammel', quelle:'tafel'}}, 2)};
})())`));
ok(_bez.falsch.length === 0, 'nur ein echtes Duo steht als Duo da', _bez.falsch.join(', ') || 'keins');
ok(_bez.clash === 'Sieger und Verlierer dieser Partie',
   'im Spitzenspiel stehen sich zwei gegenueber', _bez.clash);
ok(_bez.duo === 'als Duo', 'die Duo-Serie bleibt ein Duo', _bez.duo);
ok(_bez.duell === 'im direkten Duell', 'die Rivalitaet bleibt ein Duell', _bez.duell);
ok(_bez.sammel === 'an der Ewigen Tafel', 'die Sammelkarte nennt ihren Anlass', _bez.sammel);

// ── Das Blatt erklaert nicht die App ────────────────────────────────
// Im Blatt des Spielers des Tages stand „Gewertet wird der Spieltag ab drei
// Partien. Die Karte kommt um 23:59, wenn keine Partie mehr dazukommen
// kann." Das ist die Bauanleitung des Feeds, nicht die Nachricht. Genauso
// stand unter einer Insignium-Stufe „deshalb ist diese Karte Breaking
// [§C30]" — die App erklaerte dem Leser ihre eigene Regel samt Paragraph.
const _meta = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const treffer = [];
  roh.concat(_consolidateStories(roh)).forEach(s => {
    let h = ''; try { h = _newsDetailBody(s); } catch(e){ return; }
    if(/Gewertet wird|diese Karte Breaking|§C\\d/.test(String(h)))
      treffer.push((s.dataRef||{}).type || '?');
  });
  return treffer;
})())`));
ok(_meta.length === 0, 'kein Blatt erklaert die Regeln des Feeds', _meta.join(', ') || 'keins');

// ── Die Karte des Tages steht ab der dritten Partie und wechselt ──
// Sie kam einmal zwanzig Minuten nach dem ersten Spiel: der Rekord, der
// gerade wechselte, war die einzige Karte des Tages und damit automatisch die
// staerkste. Danach stand sie erst mit der fuenften Partie oder um 19 Uhr und
// kam, als der Spieltag laengst gelaufen war. Jetzt mit der dritten Partie,
// und was spaeter am Tag spannender ist, uebernimmt das Band.
const _tk = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = {};
  matches.forEach(m => { const k = tagKey(m.created_at); tage[k] = (tage[k]||0)+1; });
  const voll = Object.keys(tage).find(k => tage[k] >= NEWS_LIMITS.tagKartePartien + 2);
  // POTD hat absichtlich die hoehere Feed-Prioritaet: die Tageskarte soll
  // trotzdem die seltenere Geschichte waehlen und nicht reflexhaft POTD.
  // Die Breaking-Zeile steht daneben, weil sie im Feed schon die lauteste
  // Karte ist und das Band damit dasselbe zweimal sagen wuerde.
  const items = [{id:'a', prio:999, dataRef:{type:'potd'}},
                 {id:'b', prio:1, dataRef:{type:'giant_slayer', chance:.08}},
                 {id:'c', prio:998, dataRef:{type:'lead_change'}},
                 {id:'d', prio:997, dataRef:{type:'woche'}}];
  const beiMs = (ms, tag, liste) => {
    const echt = Date.now; Date.now = () => ms;
    let r = null; try { r = _newsTagKarte(liste || items, tag); } finally { Date.now = echt; }
    return r;
  };
  const um = (tag, std, min) => {
    const d = new Date(tag + 'T00:00:00'); d.setHours(std, min||0, 0, 0);
    return beiMs(d.getTime(), tag);
  };
  const zeiten = tag => matches.filter(m => tagKey(m.created_at) === tag)
    .map(m => mts(m)).sort((a, b) => a - b);
  const dritte = voll ? zeiten(voll)[NEWS_LIMITS.tagKartePartien - 1] : 0;
  // Ein Tag mit einer und einer mit zwei Partien wird aus einem echten
  // gebaut: ohne ihn waere die Zusicherung gruen, auch wenn die Regel fehlt.
  const alle = matches.slice(), gekuerzt = {};
  try {
    [1, 2].forEach(n => {
      const erste = alle.filter(m => tagKey(m.created_at) === voll)
        .sort((a, b) => mts(a) - mts(b)).slice(0, n);
      matches = alle.filter(m => tagKey(m.created_at) !== voll).concat(erste);
      gekuerzt[n] = um(voll, 23, 59);
    });
  } finally { matches = alle; }
  // Spaeter am Tag kommt eine spannendere Geschichte dazu: sie uebernimmt.
  const spaeter = items.concat([{id:'e', prio:1, dataRef:{type:'giant_slayer', chance:.01}}]);
  return {vollN: tage[voll], voll, gekuerzt,
    vorDritter: beiMs(dritte - 1, voll), abDritter: beiMs(dritte, voll),
    wechsel: beiMs(dritte + 3600e3, voll, spaeter),
    leer: um('2020-01-01', 23),
    breaking: _newsTagKarteWuerdig({dataRef:{type:'lead_change'}}),
    potd: _newsTagKarteWuerdig({dataRef:{type:'potd'}}),
    rueckblick: _newsTagKarteWuerdig({dataRef:{type:'woche'}}),
    negativ: _newsTagKarteWuerdig({cat:'badges', dataRef:{type:'badge_unlocked', rarity:'negative'}}),
    pleite: _newsTagKarteWuerdig({dataRef:{type:'loss_streak'}}),
    partien: NEWS_LIMITS.tagKartePartien, stunde: NEWS_LIMITS.tagKarteStunde};
})())`));
ok(_tk.partien === 3 && _tk.stunde === undefined,
   'die Schwelle liegt bei der dritten Partie, ohne Uhrzeit',
   _tk.partien + ' Partien, Stunde ' + _tk.stunde);
ok(_tk.vorDritter === null, 'vor der dritten Partie steht noch kein Band',
   _tk.voll + ' mit ' + _tk.vollN + ' Partien -> ' + _tk.vorDritter);
ok(_tk.abDritter === 'b', 'mit der dritten Partie steht es',
   _tk.vollN + ' Partien -> ' + _tk.abDritter);
ok(_tk.wechsel === 'e', 'eine spaeter spannendere Karte uebernimmt das Band',
   String(_tk.wechsel));
ok(_tk.gekuerzt[1] === null && _tk.gekuerzt[2] === null,
   'ein Spieltag mit einer oder zwei Partien bekommt auch abends kein Band',
   JSON.stringify(_tk.gekuerzt));
ok(_tk.leer === null, 'ein Tag ohne Partie bekommt keine Karte des Tages',
   String(_tk.leer));
ok(!_tk.breaking && !_tk.potd && !_tk.rueckblick,
   'Breaking, der Spieler des Tages und ein Rueckblick tragen das Band nie',
   JSON.stringify({breaking:_tk.breaking, potd:_tk.potd, rueckblick:_tk.rueckblick}));
// Und keine Schande und keine Pleitenserie: das Band ist golden, und Gold
// gehoert dem Titel [§C25]. Gemessen trug „Anton: Die Talfahrt" das Band.
ok(!_tk.negativ && !_tk.pleite, 'eine Karte mit negativer Richtung traegt das Band nie',
   JSON.stringify({negativ:_tk.negativ, pleite:_tk.pleite}));

// ── Keine Meldung einer Partie ohne ihre Partie ──────────────────────
// Das 100. Duell zweier Spieler stand allein im Feed: seine Partie lag
// einen Tag vor dem Fenster, ihre Karte gab es nicht mehr, und die Meldung
// hing an nichts. Jede Meldung mit Partie steht jetzt nur mit ihrer Karte da.
const _waisen = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const karten = new Set(roh.filter(s => (s.dataRef||{}).type === 'spiel').map(s => s.dataRef.matchId));
  const mit = roh.filter(s => { const d = s.dataRef || {};
    return d.matchId && d.type !== 'spiel' && !/^(rekord_|chronik_|insignium_)/.test(d.type || ''); });
  return {mit: mit.length, ohne: mit.filter(s => !karten.has(s.dataRef.matchId)).map(s => s.title)};
})())`));
ok(_waisen.mit > 20 && _waisen.ohne.length === 0,
   'keine Meldung einer Partie steht ohne die Karte ihrer Partie',
   _waisen.mit + ' Meldungen mit Partie · ' + (_waisen.ohne.join(' | ') || 'keine allein'));

// ── Die Schlagzeile fasst die Anlässe zusammen, jeden mit seinen Leuten ──
// „Durststrecke und Teamserie für Leon und Maxi" gab Leos Pleiten den beiden
// Siegern, „Siegesserie für Maxi und Durststrecke" verlor den Namen, und die
// Reihe begann mit irgendeinem Anlass. Gestellt an einer echten Partie, dann
// über alle Bündel der echten Liga.
const _etik = JSON.parse(K.eval(`JSON.stringify((function(){
  const m = matches[matches.length - 1], W = _spSieger(m), L = _spVerlierer(m), w = new Date(mts(m));
  const l = [
    {id:'spiel_' + m.id, cat:'highlight', ic:'ball', when:w, prio:40, title:'Ein Sieg', desc:'10:6.',
     dataRef:{type:'spiel', resultKind:'normal', matchId:m.id, playerIds:W, winners:W, losers:L}},
    {id:'et-ls', cat:'misfortune', ic:'dropDouble', when:w, prio:55, title:pname(L[0]) + ' findet kein Mittel', desc:'5.',
     dataRef:{type:'loss_streak', pid:L[0], streak:5, matchId:m.id, playerIds:[L[0]]}},
    {id:'et-ts', cat:'team', ic:'unstoppable', when:w, prio:50, title:'Zusammen alles', desc:'5.',
     dataRef:{type:'team_streak', a:W[0], b:W[1], streak:5, matchId:m.id, playerIds:W}}
  ];
  _cache._consolFrom = null;
  const sam = _consolidateStories(l).find(x => (x.dataRef||{}).type === 'sammel');
  const soll = _namenListe(W.map(pname)) + ' gewinnen zusammen zum 5. Mal in Folge';
  const samText = sam ? _newsCardHtmlM2(sam, false, false).replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ') : '';
  // Zwei kleine Marken zweier Spieler in derselben Partie.
  _cache._consolFrom = null;
  const zwei = _consolidateStories([l[0], {id:'et-bm', cat:'badge', ic:'medal', when:w, prio:20,
    title:pname(W[0]) + ' und ' + pname(W[1]) + ' erreichen runde Marken', desc:'2.',
    dataRef:{type:'badge_marken', matchId:m.id, playerIds:W,
      marken:[{pid:W[0], badgeId:'a', name:'Erste', rang:5}, {pid:W[1], badgeId:'b', name:'Zweite', rang:10}]}}])
    .find(x => (x.dataRef||{}).type === 'sammel');
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const NEG = /^(Durststrecke|Gemeinsame Durststrecke|Schande)/;
  const falsch = [];
  let n = 0;
  getStoriesCache().forEach(x => {
    const d = x.dataRef || {};
    if(d.type !== 'sammel' || d.quelle !== 'spiel') return;
    n++;
    const t = String(x.title || '');
    if(t.length > 110) falsch.push(t + ' (zu lang)');
    const teile = t.split(/,| und (?=[A-ZÄÖÜa-zäöü-]+ (?:für|gegen|zwischen)\b|(?:gemeinsame |seltene |legendäre )?[A-ZÄÖÜ][a-zäöüß-]+(?: „[^“]+“)? (?:für|gegen|zwischen)\b)/);
    if(teile.length > 3) falsch.push(t + ' (mehr als drei)');
    if(/^(Durststrecke|Gemeinsame Durststrecke|Schande)/.test(t) && / und (Siegesserie|Teamserie|Serienbruch|Auszeichnung|Spitzenduell)/.test(t))
      falsch.push(t + ' (Pleite vor Sieg)');
    // Ein Etikett ohne eigenen Namen: nur dann richtig, wenn es mit dem
    // nächsten unter DENSELBEN Namen steht („Siegesserie und Elo-Marke für Maxi").
    { const re = /(Durststrecke|Siegesserie|Teamserie|Serienbruch)( und | im| mit|$)/g; let mm;
      while((mm = re.exec(t))){ const rest = t.slice(mm.index + mm[0].length).split(',')[0];
        if(mm[2] !== ' und ' || !/ (für|gegen|zwischen) /.test(rest + ' ')) { falsch.push(t + ' (ohne Namen)'); break; } } }
    if(/Auszeichnung (für|und|im|mit)|Auszeichnung$/.test(t)) falsch.push(t + ' (Auszeichnung ohne ihren Namen)');
    // Und die Zeilen darunter folgen derselben Richtung: keine rote vor einer positiven.
    const z = (d.teile || []).filter(u => (u.typ || u.type) !== 'spiel' && !u.brk);
    if(z.some((u, k) => u.neg && z.slice(k + 1).some(v => !v.neg))) falsch.push(t + ' (rote Zeile vor einer positiven)');
  });
  // Zwei Anlässe DESSELBEN Spielers stehen unter einem Namen.
  _cache._consolFrom = null;
  const gleich = _consolidateStories([l[0],
    {id:'et-eh', cat:'personal', ic:'peak', when:w, prio:55, title:pname(W[0]) + ' erreicht einen Höchststand', desc:'1.',
     dataRef:{type:'elo_hoch', pid:W[0], elo:900, vorher:880, seit:30, matchId:m.id, playerIds:[W[0]]}},
    {id:'et-me', cat:'milestone', ic:'chart', when:w, prio:50, title:pname(W[0]) + ' knackt 900 Elo', desc:'1.',
     dataRef:{type:'milestone_elo', pid:W[0], milestone:'900 Elo', mark:900, matchId:m.id, playerIds:[W[0]]}},
    l[1]]).find(x => (x.dataRef||{}).type === 'sammel');
  const gleichSoll = pname(W[0]) + ' erreicht einen Höchststand';
  const gleichText = gleich ? _newsCardHtmlM2(gleich, false, false).replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ') : '';
  // Zwei Marken EINES Spielers: Schlagzeile und Zeile nennen beide.
  _cache._consolFrom = null;
  const einer = _consolidateStories([l[0], {id:'et-bm1', cat:'badge', ic:'medal', when:w, prio:20,
    title:pname(W[0]) + ' erreicht runde Marken', desc:'2.',
    dataRef:{type:'badge_marken', matchId:m.id, playerIds:[W[0]],
      marken:[{pid:W[0], badgeId:'a', name:'Zittersieg', rang:5}, {pid:W[0], badgeId:'b', name:'Frühschicht', rang:5}]}}])
    .find(x => (x.dataRef||{}).type === 'sammel');
  // Und jede Zeile einer Serie oder Form nennt ihre Zahl.
  const ohneZahl = [];
  getStoriesCache().forEach(x => { const d = x.dataRef || {};
    if(d.type !== 'sammel' || d.quelle !== 'spiel') return;
    (d.teile || []).forEach(t => { if(/^(loss_streak|team_streak|team_loss_streak|top_form|badge_marken)$/.test(t.typ || '')
      && !/[0-9]/.test(t.titel || '')) ohneZahl.push(t.titel); }); });
  return {titel: sam ? sam.title : '', soll, n, falsch, marken: zwei ? zwei.title : '',
    pleite: samText.indexOf(pname(L[0]) + ' verliert zum 5. Mal in Folge') >= 0,
    markenSoll: pname(W[0]) + ' holt „Erste“ zum 5. Mal, ' + pname(W[1]) + ' „Zweite“ zum 10. Mal',
    gleich: gleich ? gleich.title : '', gleichSoll,
    gleichZeilen: gleichText.indexOf(pname(W[0]) + ' knackt 900 Elo') >= 0 && gleichText.indexOf(pname(L[0])) >= 0,
    einer: einer ? einer.title : '', einerZeile: einer ? (einer.dataRef.teile.find(t => t.typ === 'badge_marken') || {}).titel : '',
    ohneZahl};
})())`));
ok(_etik.titel === _etik.soll && _etik.pleite,
   'die Schlagzeile ist der schwerste Anlass, der keine Pleite ist, und die Pleite steht darunter mit dem Namen dessen, der sie hat',
   _etik.titel + ' / soll ' + _etik.soll + ' · Pleite als Zeile ' + _etik.pleite);
ok(/Zittersieg/.test(_etik.einer) && /Frühschicht/.test(_etik.einer)
   && /Zittersieg/.test(_etik.einerZeile) && /Frühschicht/.test(_etik.einerZeile) && /5\. Mal/.test(_etik.einerZeile),
   'zwei Marken eines Spielers stehen mit Namen in Schlagzeile und Zeile, die Zeile mit ihrer Zahl',
   _etik.einer + ' / ' + _etik.einerZeile);
ok(_etik.gleich === _etik.gleichSoll && _etik.gleichZeilen,
   'von zwei Anlässen desselben Spielers ist einer die Schlagzeile und der andere eine Zeile, die Pleite eines anderen mit dessen Namen',
   _etik.gleich + ' / soll ' + _etik.gleichSoll + ' · Zeilen ' + _etik.gleichZeilen);
ok(_etik.ohneZahl.length === 0,
   'jede Zeile einer Serie, einer Form oder einer Marke nennt ihre Zahl',
   _etik.ohneZahl.slice(0, 3).join(' | ') || 'alle mit Zahl');
ok(_etik.marken === _etik.markenSoll,
   'zwei kleine Marken zweier Spieler stehen mit Namen und Zahl, nicht als Auszeichnung ohne Namen',
   _etik.marken + ' / soll ' + _etik.markenSoll);
ok(_etik.n > 10 && _etik.falsch.length === 0,
   'jede Schlagzeile einer Partie nennt höchstens drei Anlässe, jeden mit Namen, und keine Pleite vor einem Sieg, auch nicht in den Zeilen',
   _etik.falsch.slice(0, 3).join(' | ') || _etik.n + ' Bündel');

// ── Die Zeilen der Partie-Karte ─────────────────────────────────────
// Unter „Julian holt die legendäre Auszeichnung ‚Dominator‘" stand „Julian
// holt ‚Carry‘ zum 5. Mal", vier Zeilen und „und 2 weitere" waren auf fast
// jeder zweiten Karte, und die Serie, die der Fuß zeichnete, stand daneben
// noch einmal als Zeile. Gestellt: ein Spitzenwechsel als Hauptanlass, der
// Fuß zeichnet die Serie, darunter sieben weitere Anlässe aus fünf Themen,
// zwei davon Nebensachen.
const _zeilenWahl = JSON.parse(K.eval(`JSON.stringify((function(){
  const m = matches[matches.length - 1], W = _spSieger(m), L = _spVerlierer(m), w = new Date(mts(m));
  const st = (id, typ, prio, title, x) => ({id, cat:'highlight', ic:'chart', when:w, prio, title, desc:'1.',
    dataRef:Object.assign({type:typ, matchId:m.id, playerIds:[x.pid || x.playerId || W[0]]}, x)});
  const l = [
    {id:'spiel_' + m.id, cat:'highlight', ic:'ball', when:w, prio:40, title:'Ein Sieg', desc:'10:6.',
     dataRef:{type:'spiel', resultKind:'normal', matchId:m.id, playerIds:W, winners:W, losers:L,
       visual:{version:2, score:{key:'tafel', data:_spKopfDaten(_spFakten(m))},
         occasion:{key:'serie', data:{pid:W[1], laenge:5, eig:5, liga:9, ligaWer:W[0]}}}}},
    st('zw-sp', 'lead_change', 95, pname(W[0]) + ' übernimmt die Tabellenspitze', {newLeader:W[0], prevLeader:L[0]}),
    st('zw-ws', 'win_streak', 80, pname(W[1]) + ' zündet die 5er-Serie', {pid:W[1], streak:5}),
    st('zw-ms', 'milestone_wins', 70, pname(W[0]) + ' feiert den 100. Sieg', {pid:W[0], milestone:'100 Siege'}),
    st('zw-tf', 'top_form', 65, pname(W[0]) + ' ist in Form', {pid:W[0], wins:8}),
    st('zw-rv', 'rivalry', 60, 'Duell', {a:W[0], b:L[0], n:70}),
    st('zw-bm', 'badge_marken', 50, pname(W[1]) + ' holt eine Marke', {playerIds:[W[1]], marken:[{pid:W[1], badgeId:'a', name:'Erste', rang:5}]}),
    st('zw-ls', 'loss_streak', 45, pname(L[0]) + ' verliert', {pid:L[0], streak:5}),
    st('zw-tl', 'team_loss_streak', 44, 'Zwei verlieren', {a:L[0], b:L[1], streak:3}),
    st('zw-ng', 'badge_unlocked', 43, pname(L[1]) + ' bekommt „Pechvogel“', {playerId:L[1], badgeId:'x', badgeName:'Pechvogel', rarity:'negative'})
  ];
  _cache._consolFrom = null;
  const sam = _consolidateStories(l).find(x => (x.dataRef||{}).type === 'sammel');
  if(!sam) return {fehlt:true};
  const h = _newsCardHtmlM2(sam, false, false);
  const id = t => ((sam.dataRef.teile || []).find(x => x.titel === t) || {}).id;
  const zeilen = [...h.matchAll(/class="nf-sam-z(?! sp-fz)[^"]*"[^>]*><i[^>]*>[\\s\\S]*?<\\/i><span>([\\s\\S]*?)<\\/span>/g)]
    .map(x => id(x[1].replace(/<[^>]+>/g, '')) || x[1]);
  const unter = (h.match(/class="nf-sam-z sp-fz"[^>]*><i[^>]*>[\\s\\S]*?<\\/i><span>([\\s\\S]*?)<\\/span>/) || [])[1] || '';
  return {titel:sam.title, soll:pname(W[0]) + ' übernimmt die Tabellenspitze', zeilen,
    unter:id(unter.replace(/<[^>]+>/g, '')) || unter, weitere:(h.match(/class="nf-sam-m">([^<]*)/) || [])[1] || ''};
})())`));
ok(!_zeilenWahl.fehlt && _zeilenWahl.titel === _zeilenWahl.soll,
   'die Schlagzeile einer Partie-Karte ist ihr Hauptanlass in seinem Satz', _zeilenWahl.titel);
ok(_zeilenWahl.unter === 'zw-ws' && _zeilenWahl.zeilen.indexOf('zw-ws') < 0,
   'was der Fuß zeichnet, steht als letzte Zeile direkt über ihm und nicht noch einmal darüber', _zeilenWahl.unter + ' · ' + _zeilenWahl.zeilen.join(', '));
ok(_zeilenWahl.zeilen.join() === 'zw-ms,zw-rv,zw-bm' && _zeilenWahl.weitere === 'und 2 weitere',
   'darunter höchstens drei Zeilen, ein neues Thema zuerst, eine Nebensache weder als Zeile noch in der Zahl',
   _zeilenWahl.zeilen.join(', ') + ' · ' + _zeilenWahl.weitere);

// Welche Meldung der Fuß zeichnet, merkt er sich (`zeigt`). Nach Art und
// Person geraten, galten beide Rivalitäten einer Partie als gezeichnet,
// obwohl der Fuß nur eine zeigt, und die andere fehlte auf der Karte. Die
// Medaille dagegen nennt jeden, der sie holte, und deckt alle.
const _zeigt = JSON.parse(K.eval(`JSON.stringify((function(){
  const m = matches[matches.length - 1], W = _spSieger(m), L = _spVerlierer(m);
  const r1 = {type:'rivalry_milestone', a:W[0], b:L[0], n:50, matchId:m.id};
  const r2 = {type:'rivalry', a:W[1], b:L[1], n:70, matchId:m.id};
  const b1 = {type:'badge_unlocked', badgeId:'wall_badge', rarity:'rare', playerId:W[0], matchId:m.id};
  const b2 = {type:'badge_unlocked', badgeId:'wall_badge', rarity:'rare', playerId:W[1], matchId:m.id};
  const ff = _spFussFakten(m, [r1, r2, b1, b2]);
  const duell = ff.find(x => x.a.key === 'duell'), med = ff.find(x => x.a.key === 'medaille');
  const teil = (r, titel) => ({typ:r.type, titel, ref:r});
  const z = _spZeilen([teil(r1, 'R1'), teil(r2, 'R2'), teil(b1, 'B1'), teil(b2, 'B2')], 'Kopf', {key:'duell', data:{}, zeigt:duell.ids});
  const zm = _spZeilen([teil(r1, 'R1'), teil(b1, 'B1'), teil(b2, 'B2')], 'Kopf', {key:'medaille', data:{name:'Mauer'}, zeigt:med.ids});
  return {zeilen:z.zeilen.map(t => t.titel).join(), unter:(z.unter || {}).titel,
    medZeilen:zm.zeilen.map(t => t.titel).join(), medUnter:(zm.unter || {}).titel};
})())`));
ok(_zeigt.zeilen === 'B1,R2,B2' && _zeigt.unter === 'R1' && _zeigt.medZeilen === 'R1' && _zeigt.medUnter === 'B1',
   'der Fuß blendet genau die Meldungen aus, die er zeichnet: die zweite Rivalität bleibt eine Zeile, die Medaille deckt jeden Halter',
   JSON.stringify(_zeigt));

// ── Fuß und Schlagzeile sagen nicht dasselbe [§C33] ────────────────────
// Unter „Leon und Leo gewinnen zum 5. Mal zusammen" stand als Zeile des
// Fußes „Leon und Leo feiern den 5. gemeinsamen Sieg" (auf gespeicherten
// Karten im alten Wortlaut), und unter „Leon stellt mit 5 Siegen den
// Serien-Rekord der Liga auf" die Zeile „Leon zündet die 5er-Serie".
const _gleich = JSON.parse(K.eval(`JSON.stringify((function(){
  const T = 'Leon und Leo gewinnen zum 5. Mal zusammen';
  const alt = _spZeilen([], T, {key:'chemie', zeile:'Leon und Leo feiern den 5. gemeinsamen Sieg'}).unter;
  const neu = _spZeilen([], T, {key:'chemie', zeile:T}).unter;
  const anders = _spZeilen([], 'Leon und Leo gehen gegen Maxi und Jane in Führung', {key:'chemie', zeile:T}).unter;
  const z = _spZeilen([{typ:'streak_record', ref:{pid:'a'}, titel:'R'}, {typ:'win_streak', ref:{pid:'a'}, titel:'S'},
    {typ:'win_streak', ref:{pid:'b'}, titel:'S2'}], 'R', null).zeilen.map(t => t.titel);
  // Und die Form selbst spricht wie die Schlagzeile der gewöhnlichen Partie.
  const m = matches.slice().reverse().find(x => { const F = _spFakten(x); const c = SP_FORM.chemie.wann(F); return c && c.rund && F.duo.p >= 2; });
  const F = m && _spFakten(m);
  return {alt:alt ? alt.titel : null, neu:neu ? neu.titel : null, anders:anders ? anders.titel : null, z,
    form:F ? SP_FORM.chemie.text(F, SP_FORM.chemie.wann(F)).t : '', soll:F ? _spNl(F.W) + ' gewinnen zum ' + F.duo.s + '. Mal zusammen' : '-'};
})())`));
ok(_gleich.alt === null && _gleich.neu === null && _gleich.anders && _gleich.form === _gleich.soll,
   'die Zeile des Fußes fällt weg, wenn sie dasselbe sagt wie die Schlagzeile, im alten und im neuen Wortlaut', JSON.stringify(_gleich));
ok(_gleich.z.join() === 'S2', 'unter dem Serien-Rekord steht die Serie desselben Spielers nicht noch einmal als Zeile', _gleich.z.join());

// ── Die Karte einer Partie: neue Anlässe, Fuß, Seiten, Satz [§C33] ──────
// Jedes Ende einer Pleitenserie und jede Rückkehr wird an den rohen
// Partien nachgezählt, in beide Richtungen: keins zu viel, keins fehlt.
// „Stefan und Leon retten ein 10:9" sagte nicht, dass es Stefans erster
// Sieg nach zwölf Niederlagen war. Dazu: kein Fuß zeichnet dieselbe
// Familie wie der Fuß der Partie davor, die Teamzeile nennt Team A links,
// und der Satz einer Partie nennt ihren Stand nicht noch einmal.
const _aufbau = JSON.parse(K.eval(`JSON.stringify((function(){
  invalidateCache(); _cache._consolFrom = null; _cache._frischVon = null;
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  const reihe = matches.slice().sort((a, b) => mts(a) - mts(b)), seit = Date.now() - NEWS_FENSTER_TAGE * 864e5;
  const pm = pmap(), zeig = id => sichtbar(pm[id]);
  const sollP = new Set(), sollR = new Set(), lauf = {}, zuletzt = {};
  reihe.forEach(m => {
    const W = m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2], L = m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2], t = mts(m);
    W.concat(L).forEach(id => { if(zuletzt[id] && t - zuletzt[id] >= 14 * 864e5 && t >= seit && t <= Date.now() && zeig(id)) sollR.add(id + '|' + m.id); zuletzt[id] = t; });
    W.forEach(id => { if((lauf[id] || 0) >= 5 && t >= seit && t <= Date.now() && zeig(id)) sollP.add(id + '|' + m.id + '|' + lauf[id]); lauf[id] = 0; });
    L.forEach(id => { lauf[id] = (lauf[id] || 0) + 1; });
  });
  const ist = typ => roh.filter(s => (s.dataRef || {}).type === typ).map(s => s.dataRef);
  const istP = new Set(ist('pleiten_ende').map(d => d.pid + '|' + d.matchId + '|' + d.n));
  const istR = new Set(ist('rueckkehr').map(d => d.pid + '|' + d.matchId));
  const diff = (a, b) => [...a].filter(x => !b.has(x));
  // Die Füße der Partien in zeitlicher Folge.
  const idx = new Map(reihe.map((m, i) => [m.id, i]));
  const fuss = new Map(roh.filter(s => (s.dataRef || {}).type === 'spiel' && s.dataRef.visual)
    .map(s => [s.dataRef.matchId, (s.dataRef.visual.occasion || {}).key || null]));
  const fam = k => SP_FUSS_FAMILIE[k] || k, doppelt = [];
  fuss.forEach((k, mid) => { const vor = reihe[idx.get(mid) - 1], kv = vor && fuss.get(vor.id);
    if(k && kv && fam(k) === fam(kv)) doppelt.push(mid + ' ' + k + ' nach ' + kv); });
  // Die Teamzeile: Team A links, und der Satz ohne den Stand.
  const seiten = [], stand = [];
  getStoriesCache().filter(c => _newsSorte(c) === 'spiel' && (c.dataRef || {}).matchId).forEach(c => {
    const m = matches.find(x => x.id === c.dataRef.matchId);
    if(!m) return;
    const h = _newsCardHtmlM2(c, false, false);
    const z = (h.match(/<div class="sp-nz"><span class="([a-z ]*)">([\\s\\S]*?)<\\/span><span class="sp-nz-gg">/) || []);
    const links = (z[2] || '').replace(/<[^>]+>/g, ' ');
    if(!z[2] || !links.includes(pname(m.a1)) || !links.includes(pname(m.a2)) || (z[1] === 'w') !== (m.winner === 'A')) seiten.push(c.id);
    const st = Math.max(m.games_a, m.games_b) + ':' + Math.min(m.games_a, m.games_b);
    if(String(c.desc || '').indexOf(st) >= 0) stand.push(c.id + ': ' + c.desc);
  });
  // Der Kopf schreibt keinen Namen, den die Teamzeile darunter trägt; ein
  // Fuß mit beiden Seiten steht wie der Kopf; ein Zähler trägt keinen
  // Ordnungspunkt; und kein Satz beginnt klein („drei Siege in Folge.").
  const namen = [], ab = [], punkt = [];
  getStoriesCache().filter(c => _newsSorte(c) === 'spiel' && (c.dataRef || {}).matchId).forEach(c => {
    const b = _spBild(c), occ = b.occ || {};
    if(/class="(sp-z-n|sp-f-n|sp-aufst|sp-wp-n)"/.test(b.kopf || '')) namen.push(c.id + ' ' + b.form);
    if(['duoserie', 'revanche', 'gegner'].includes(occ.key) && occ.data && occ.data.awA === false
       && String(b.fuss || '').indexOf('<div class="sp-b ') !== 0) ab.push(c.id + ' ' + occ.key);
    if(/<u>\\.<\\/u>|<b>\\.<\\/b><\\/span>/.test(b.fuss || '')) punkt.push(c.id + ' ' + occ.key);
  });
  const klein = roh.filter(s => /^[a-zäöüß]/.test(String(s.desc || '')) || /^[a-zäöüß]/.test(String(s.title || '')))
    .map(s => s.id + ': ' + (s.desc || s.title));
  // „75% aus 8 Spielen", „64% als Duo": im Satz steht ein Leerzeichen vor
  // dem Prozentzeichen, wie überall sonst in der App.
  const prozent = roh.filter(s => /\\d%/.test(String(s.desc || '') + ' ' + String(s.title || '')))
    .map(s => s.id + ': ' + s.desc);
  // Die Serie eines Duos nennt dessen Bilanz bis zu ihrer Partie: „Zehn
  // gemeinsame Spiele, zehn Siege." stand über „spielen zum 75. Mal zusammen".
  const duo = roh.filter(s => (s.dataRef || {}).type === 'team_streak').map(s => {
    const d = s.dataRef, bis = idx.get(d.matchId), k = [d.a, d.b];
    let w = 0, n = 0;
    reihe.slice(0, bis + 1).forEach(m => { const sa = [m.a1, m.a2], sb = [m.b1, m.b2];
      const t = k.every(id => sa.includes(id)) ? 'A' : k.every(id => sb.includes(id)) ? 'B' : null;
      if(t){ n++; if(m.winner === t) w++; } });
    const soll = n > d.streak ? 'Zusammen ' + w + ' Siege aus ' + n + ' Partien.' : 'Jede gemeinsame Partie gewonnen.';
    return s.desc === soll ? null : s.id + ': ' + s.desc + ' statt ' + soll;
  });
  const duoN = duo.length, duoFalsch = duo.filter(Boolean);
  // Steht die Zahl in der Schlagzeile, sagt der Satz sie nicht noch einmal:
  // „Johannes zündet die 3er-Serie" über „Drei Siege in Folge.",
  // „verliert zum 5. Mal in Folge" über „Fünf Niederlagen am Stück.",
  // „verlieren zusammen zum 3. Mal in Folge" über „Seit dem 04.11. gehen
  // drei gemeinsame Spiele in Folge verloren", und mehrere Marken eines
  // Spielers mit „Alex holt ‚X' zum 5. Mal, Alex holt ‚Y' zum 10. Mal".
  const WORT = {3:'drei', 4:'vier', 5:'fünf', 6:'sechs', 7:'sieben', 8:'acht', 9:'neun', 10:'zehn'};
  const zweimal = roh.filter(s => ['win_streak','loss_streak','team_streak','team_loss_streak','badge_marken'].includes((s.dataRef || {}).type))
    .filter(s => {
      const d = String(s.desc || ''), n = Number((s.dataRef || {}).streak) || 0;
      if(/zum \d+\. Mal/.test(d)) return (s.dataRef.playerIds || []).length === 1;
      if(!n) return false;
      return new RegExp('(^|\\D)' + n + ' (Siege|Niederlagen|gemeinsame)|\\b' + (WORT[n] || '#') + ' (Siege|Niederlagen|gemeinsame)', 'i').test(d);
    }).map(s => s.id + ': ' + s.desc);
  // Die Zeile des Fußes steht über ihm, in der Liste der Anlässe.
  const fz = getStoriesCache().map(c => _newsCardHtmlM2(c, false, false)).filter(h => h.indexOf('sp-fz') >= 0);
  const fzOben = fz.filter(h => h.indexOf('sp-fz') < h.lastIndexOf('class="sp-')).length;
  return {p:istP.size, r:istR.size, pFehlt:diff(sollP, istP), pZuviel:diff(istP, sollP), rFehlt:diff(sollR, istR), rZuviel:diff(istR, sollR),
    fuesse:fuss.size, doppelt, seiten, stand, fz:fz.length, fzOben, namen, ab, punkt, klein, duoN, duoFalsch, zweimal, prozent,
    serienN:roh.filter(s => ['win_streak','loss_streak','team_loss_streak'].includes((s.dataRef || {}).type)).length,
    abN:roh.filter(s => { const o = ((s.dataRef || {}).visual || {}).occasion || {};
      return ['duoserie', 'revanche', 'gegner'].includes(o.key) && o.data && o.data.awA === false; }).length,
    alt:getStoriesCache().some(c => _newsCardHtmlM2(c, false, false).indexOf('sp-fu-z') >= 0)};
})())`));
ok(_aufbau.p > 0 && !_aufbau.pFehlt.length && !_aufbau.pZuviel.length,
   'jedes Ende einer Pleitenserie ab fünf Niederlagen ist eine Meldung, keins zu viel',
   _aufbau.p + ' · fehlt ' + _aufbau.pFehlt.slice(0, 2).join(',') + ' · zu viel ' + _aufbau.pZuviel.slice(0, 2).join(','));
ok(_aufbau.r > 0 && !_aufbau.rFehlt.length && !_aufbau.rZuviel.length,
   'jede Rückkehr nach vierzehn Tagen ist eine Meldung, keine zu viel',
   _aufbau.r + ' · fehlt ' + _aufbau.rFehlt.slice(0, 2).join(',') + ' · zu viel ' + _aufbau.rZuviel.slice(0, 2).join(','));
ok(_aufbau.fuesse > 20 && !_aufbau.doppelt.length,
   'kein Fuß zeichnet dieselbe Zeichnung wie der Fuß der Partie davor', _aufbau.doppelt.slice(0, 3).join(' | ') || _aufbau.fuesse + ' Füße');
ok(!_aufbau.seiten.length, 'die Teamzeile nennt Team A links und markiert den Sieger', _aufbau.seiten.slice(0, 3).join(', '));
ok(!_aufbau.stand.length, 'der Satz einer Partie-Karte nennt ihren Stand nicht noch einmal', _aufbau.stand.slice(0, 2).join(' | '));
ok(_aufbau.fz > 0 && _aufbau.fzOben === _aufbau.fz && !_aufbau.alt,
   'die Zeile des Fußes steht über ihm in der Liste, keine Unterschrift darunter', _aufbau.fz + ' / ' + _aufbau.fzOben);
ok(!_aufbau.namen.length, 'kein Kopf schreibt die Namen, die die Teamzeile darunter trägt', _aufbau.namen.slice(0, 3).join(', '));
ok(_aufbau.abN > 0 && !_aufbau.ab.length, 'ein Fuß mit beiden Seiten steht wie der Kopf: Team A links',
   _aufbau.ab.slice(0, 3).join(', ') || _aufbau.abN + ' Füße mit Sieg von B');
ok(!_aufbau.punkt.length, 'ein Zähler im Fuß trägt keinen Ordnungspunkt nach seinen Ziffern', _aufbau.punkt.slice(0, 3).join(', '));
ok(!_aufbau.klein.length, 'keine Meldung beginnt Schlagzeile oder Satz klein', _aufbau.klein.slice(0, 2).join(' | '));
ok(!_aufbau.prozent.length, 'in keiner Meldung klebt das Prozentzeichen an der Zahl', _aufbau.prozent.slice(0, 2).join(' | '));
ok(_aufbau.duoN > 0 && !_aufbau.duoFalsch.length, 'die Serie eines Duos nennt dessen Bilanz bis zu ihrer Partie, nachgezählt',
   _aufbau.duoFalsch.slice(0, 2).join(' | ') || _aufbau.duoN + ' Serien');
ok(_aufbau.serienN > 0 && !_aufbau.zweimal.length, 'steht die Zahl einer Serie oder Marke in der Schlagzeile, sagt der Satz sie nicht noch einmal',
   _aufbau.zweimal.slice(0, 3).join(' | ') || _aufbau.serienN + ' Serien');

// ── Was zählt, meldet Stufen, nicht jeden Schritt ─────────────────────
// „Leon und Maxi treffen zum 207. Mal aufeinander" stand an jedem Spieltag
// der beiden, und Bilder wie die Uhr des Tages trafen ab ihrer Schwelle auf
// jede weitere Partie zu. Gemeldet wird jedes zehnte Duell, gezeichnet nur an
// Stufen.
const _stufen = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const falsch = [];
  roh.filter(s => (s.dataRef||{}).type === 'rivalry').forEach(s => {
    if(s.dataRef.n % 10 !== 0) falsch.push(s.title); });
  roh.forEach(s => { const d = s.dataRef || {}, o = d.visual && d.visual.occasion;
    if(!o) return;
    const x = o.data || {};
    if(o.key === 'uhr' && !SP_TAG_STUFEN.has(x.n)) falsch.push('Uhr bei ' + x.n);
    if(o.key === 'duoserie' && !(x.k === 3 || x.k === 5 || x.k === 7 || x.k % 5 === 0)) falsch.push('Duo gegen Duo bei ' + x.k);
    if(o.key === 'tagesring' && !SP_TAG_STUFEN.has((x.folge || []).filter(Boolean).length)) falsch.push('Tagesring bei ' + (x.folge || []).filter(Boolean).length);
  });
  return {riv: roh.filter(s => (s.dataRef||{}).type === 'rivalry').map(s => s.dataRef.n), falsch};
})())`));
ok(_stufen.falsch.length === 0,
   'eine Rivalität steht auf jedem zehnten Duell, Uhr, Tagesring und Duo gegen Duo nur auf ihren Stufen',
   _stufen.falsch.slice(0, 4).join(' | ') || 'Rivalität ' + _stufen.riv.join(', '));

// ── Was in einer Partie sonst noch passiert ───────────────────────────
// 36 von 52 Partien in vierzehn Tagen trugen kein einziges Ereignis. Sechs
// Dinge einer einzelnen Partie sind jetzt eine Zeile ihrer Karte: der Bann
// gegen einen Gegner reißt, ein Duo feiert ein Jubiläum, eine Revanche am
// selben Tag, der lange Tag, der Höchststand, der Tabellensprung. Keins
// steht allein, jedes meldet nur seine Stufen, und ist es das stärkste der
// Partie, zeichnet der Fuß es.
// Gemessen an zwei Stichtagen, dem 22.07. und dem 27.08.: welche dieser
// Ereignisse in den letzten Tagen liegen, ist Zufall der Partien. Schon eine
// kleine Änderung am Positionsbonus der Elo [§C44] nahm am 27.08.
// Höchststand und Tabellensprung aus dem Fenster — die Spitzen aus Mai bis
// Juli lagen höher, und im August übertraf sie niemand.
const _partieRechnung = `(function(){
  const T = ['fluch', 'duo_jubilaeum', 'revanche', 'tagesmarathon', 'elo_hoch', 'tabellensprung',
    'duell_kippt', 'woche_spitze', 'tag_plus', 'tag_hoehe', 'monat_gewinn', 'monat_halb', 'partner_best',
    'pleiten_ende', 'duo_pleiten_ende', 'rueckkehr'];
  const FUSS = {fluch:'gegner', elo_hoch:'hoch', tabellensprung:'rang', revanche:'revanche',
    duo_jubilaeum:'chemie', tagesmarathon:'tagesring', duell_kippt:'kippt', woche_spitze:'woche',
    tag_plus:'plus', tag_hoehe:'hoehe', monat_gewinn:'monatsbest', monat_halb:'halb', partner_best:'partner',
    pleiten_ende:'wende', rueckkehr:'rueckkehr'};
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const st = getStoriesCache();
  const neu = roh.filter(s => T.includes((s.dataRef||{}).type));
  const allein = st.filter(s => T.includes((s.dataRef||{}).type)).map(s => s.title);
  const inKarte = neu.filter(s => st.some(k => { const d = k.dataRef || {};
    return d.type === 'sammel' && d.quelle === 'spiel'
      && ((d.teile || []).some(t => t.id === s.id) || (d.memberIds || []).includes(s.id)); })).length;
  const stufe = neu.filter(s => { const d = s.dataRef;
    return d.type === 'duo_jubilaeum' && ![25, 50, 75, 100, 150, 200, 250, 300, 400, 500].includes(d.n)
      || d.type === 'tagesmarathon' && ![10, 15, 20, 25, 30, 40].includes(d.n)
      || d.type === 'fluch' && d.n < 5
      || d.type === 'elo_hoch' && d.seit < 20
      || d.type === 'tabellensprung' && d.pre - d.post < 3
      || d.type === 'duell_kippt' && !(d.n >= 16 && d.s * 2 > d.n && (d.s - 1) * 2 <= d.n - 1)
      || d.type === 'woche_spitze' && d.s < 5
      || d.type === 'tag_plus' && !(d.tief <= -25 && d.elo > 0 && d.n >= 4)
      || d.type === 'tag_hoehe' && d.elo < 75
      || d.type === 'monat_gewinn' && !(d.elo >= 22 && d.n >= 8 && d.elo > d.vorher)
      || d.type === 'monat_halb' && !(d.n >= 15 && d.s * 2 >= d.n && (d.s - 1) * 2 < d.n - 1)
      || d.type === 'partner_best' && !(d.n >= 8 && d.n % 8 === 0)
      || d.type === 'pleiten_ende' && d.n < 5
      || d.type === 'duo_pleiten_ende' && d.n < 4
      || d.type === 'rueckkehr' && d.tage < 14; }).map(s => s.title);
  let folgt = 0; const fremd = [];
  roh.filter(s => (s.dataRef||{}).type === 'spiel').forEach(s => {
    const m = matches.find(x => x.id === s.dataRef.matchId); if(!m) return;
    const refs = roh.filter(x => (x.dataRef||{}).matchId === m.id && x.dataRef.type !== 'spiel').map(x => x.dataRef);
    const a = (_spFussFakten(m, refs)[0] || {}).a;
    if(!a || !refs.some(r => FUSS[r.type] === a.key)) return;
    const o = (s.dataRef.visual || {}).occasion;
    // Zeichnete die Partie davor dieselbe Zeichnung, weicht der Fuß aus [§C33].
    const vorher = _spFussVorher(m), fam = k => SP_FUSS_FAMILIE[k] || k;
    if(o && o.key === a.key) folgt++;
    else if(vorher && fam(vorher) === fam(a.key)) folgt++;
    else fremd.push(s.title + ': ' + (o ? o.key : '-') + ' statt ' + a.key);
  });
  // Und der Fuß des Höchststands nennt die Zahlen des Ereignisses: aus den
  // letzten vierzig Partien gerechnet stand dort „vorher 291, seit 1 Partien“
  // über einem Blatt mit 299 und 82.
  const hoch = neu.filter(s => s.dataRef.type === 'elo_hoch').map(s => {
    const d = s.dataRef, m = matches.find(x => x.id === d.matchId);
    const v = _spAnlassSnapshot(m, [d], null) || {}, x = v.data || {};
    return v.key === 'hoch' && x.alt === d.vorher && x.seit === d.seit && x.elo === d.elo
      ? '' : s.title + ': ' + v.key + ' ' + x.alt + '/' + x.seit;
  });
  // Holt der Höchststand zugleich „Der höchste Gipfel", meldet ihn nur die Tafel.
  const w = new Date(2026, 7, 20, 18), w2 = new Date(2026, 7, 21, 18);
  const gipfel = _ohneDoppeltenGipfel([
    {id:'g-rek', when:w, dataRef:{type:'rekord_geholt', rekordId:'peak', playerIds:['p1']}},
    {id:'g-hoch', when:w, dataRef:{type:'elo_hoch', pid:'p1'}},
    {id:'g-ander', when:w, dataRef:{type:'elo_hoch', pid:'p2'}},
    {id:'g-tag', when:w2, dataRef:{type:'elo_hoch', pid:'p1'}}]).map(s => s.id).join(',');
  return {n:neu.length, typen:[...new Set(neu.map(s => s.dataRef.type))], allein, inKarte, stufe, folgt, fremd, gipfel,
    hoch:hoch.length, hochFalsch:hoch.filter(Boolean)};
})`;
const _partieJuli = _amErsten(new RealDate(2026, 6, 22, 23, 0, 0).getTime(), `
  const alle = matches.slice();
  matches = alle.filter(m => mts(m) <= Date.now()); invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  try { return ${_partieRechnung}(); } finally { matches = alle; }`);
const _partieJetzt = JSON.parse(K.eval(`JSON.stringify(${_partieRechnung}())`));
const _partie = {n:_partieJuli.n + _partieJetzt.n, typen:[...new Set(_partieJuli.typen.concat(_partieJetzt.typen))],
  allein:_partieJuli.allein.concat(_partieJetzt.allein), inKarte:_partieJuli.inKarte + _partieJetzt.inKarte,
  stufe:_partieJuli.stufe.concat(_partieJetzt.stufe), folgt:_partieJuli.folgt + _partieJetzt.folgt,
  fremd:_partieJuli.fremd.concat(_partieJetzt.fremd), gipfel:_partieJetzt.gipfel,
  hoch:_partieJuli.hoch + _partieJetzt.hoch, hochFalsch:_partieJuli.hochFalsch.concat(_partieJetzt.hochFalsch)};
ok(_partie.typen.length >= 4 && _partie.allein.length === 0 && _partie.inKarte === _partie.n,
   'was in einer Partie sonst noch passiert, steht als Zeile in ihrer Karte und nie allein',
   _partie.n + ' Ereignisse (' + _partie.typen.join(', ') + '), ' + _partie.inKarte + ' in ihrer Karte'
   + (_partie.allein.length ? ' · allein: ' + _partie.allein.slice(0, 2).join(' | ') : ''));
ok(_partie.stufe.length === 0, 'jedes dieser Ereignisse meldet nur seine Stufen und Schwellen',
   _partie.stufe.slice(0, 3).join(' | ') || 'alle auf Stufen');
ok(_partie.hoch > 0 && _partie.hochFalsch.length === 0,
   'der Fuß des Höchststands nennt die alte Marke und den Abstand des Ereignisses',
   _partie.hochFalsch.slice(0, 2).join(' | ') || _partie.hoch + ' Höchststände');
ok(_partie.gipfel === 'g-rek,g-ander,g-tag',
   'holt ein Höchststand zugleich den Gipfel der Liga, meldet ihn nur die Tafel',
   _partie.gipfel);
ok(_partie.folgt > 0 && _partie.fremd.length === 0,
   'ist eins davon das stärkste der Partie, zeichnet der Fuß es',
   _partie.folgt + ' Füße' + (_partie.fremd.length ? ' · ' + _partie.fremd.slice(0, 3).join(' | ') : ''));

// ── Die sieben Fakten des Katalogs, an den rohen Partien nachgerechnet ──
// Jeder sagt etwas über die Partien bis zu seiner: dass ein Sieger im Duell
// vorn liegt, die Woche anführt, den Tag ins Plus dreht oder über +75
// kommt, den größten Gewinn des Monats holt, im Monat auf die Hälfte kommt
// oder mit diesem Partner am besten gewinnt. Nachgezählt wird jede Zahl
// aus `matches` und den Elo-Deltas, ohne die Rechnung des Generators.
const _katalog = JSON.parse(K.eval(`JSON.stringify((function(){
  const T = ['duell_kippt', 'woche_spitze', 'tag_plus', 'tag_hoehe', 'monat_gewinn', 'monat_halb', 'partner_best'];
  const roh = _buildStories(), H = getHistoryByMatchId();
  const reihe = matches.slice().sort((a, b) => mts(a) - mts(b));
  const gew = (id, x) => (x.winner === 'A') === (x.a1 === id || x.a2 === id);
  const dabei = (id, x) => [x.a1, x.a2, x.b1, x.b2].includes(id);
  const delta = (id, x) => Number(((H.get(x.id) || {}).deltas || {})[id]) || 0;
  const falsch = [], je = {};
  roh.filter(s => T.includes((s.dataRef || {}).type)).forEach(s => {
    const d = s.dataRef, m = matches.find(x => x.id === d.matchId), bis = reihe.indexOf(m);
    je[d.type] = (je[d.type] || 0) + 1;
    const vor = reihe.slice(0, bis + 1), fehler = t => falsch.push(s.title + ' (' + t + ')');
    if(!gew(d.pid, m)) fehler('kein Sieger');
    if(d.type === 'duell_kippt'){
      const du = vor.filter(x => dabei(d.pid, x) && dabei(d.gegen, x) && gew(d.pid, x) !== gew(d.gegen, x));
      let s0 = 0, vorn = -1;
      du.forEach((x, i) => { if(gew(d.pid, x)) s0++; if(i < du.length - 1 && s0 * 2 > i + 1) vorn = i + 1; });
      if(s0 !== d.s || du.length !== d.n || s0 * 2 <= du.length || du.length < 16 || (vorn >= 0 && du.length - vorn < 10)) fehler('Bilanz');
    }
    if(d.type === 'woche_spitze'){
      const wk = _wochenKey(m.created_at);
      const tab = (l) => { const z = {}; l.filter(x => _wochenKey(x.created_at) === wk).forEach(x => [x.a1, x.a2, x.b1, x.b2].forEach(id => {
        const q = z[id] || (z[id] = {s:0, n:0}); q.n++; if(gew(id, x)) q.s++; }));
        return Object.keys(z).filter(id => z[id].s >= 5).sort((a, b) => z[b].s / z[b].n - z[a].s / z[a].n || z[b].s - z[a].s); };
      if(tab(vor)[0] !== d.pid || tab(vor.slice(0, -1))[0] === d.pid) fehler('Woche');
    }
    if(d.type === 'tag_plus' || d.type === 'tag_hoehe'){
      let e = 0; const l = vor.filter(x => dabei(d.pid, x) && tagKey(x.created_at) === tagKey(m.created_at)).map(x => (e += delta(d.pid, x)));
      const davor = l.slice(0, -1), jetzt = l[l.length - 1];
      if(Math.round(jetzt) !== d.elo || l.length !== d.n) fehler('Elo des Tages');
      if(d.type === 'tag_plus' && !(davor.length >= 3 && Math.min(...davor) <= -25 && davor[davor.length - 1] < 0 && jetzt > 0)) fehler('ins Plus');
      if(d.type === 'tag_hoehe' && !(jetzt >= 75 && Math.max(0, ...davor) < 75)) fehler('über +75');
    }
    if(d.type === 'monat_gewinn' || d.type === 'monat_halb'){
      const sid = seasonOf(m.created_at).id, l = vor.filter(x => dabei(d.pid, x) && seasonOf(x.created_at).id === sid);
      if(d.type === 'monat_gewinn'){
        const davor = l.slice(0, -1).filter(x => gew(d.pid, x)).map(x => delta(d.pid, x));
        if(l.length < 8 || Math.round(delta(d.pid, m)) !== d.elo || d.elo < 22 || davor.some(v => v >= delta(d.pid, m))) fehler('Gewinn');
      } else {
        const s1 = l.filter(x => gew(d.pid, x)).length, n1 = l.length;
        if(s1 !== d.s || n1 !== d.n || n1 < 15 || s1 * 2 < n1 || (s1 - 1) * 2 >= n1 - 1) fehler('Hälfte');
      }
    }
    if(d.type === 'partner_best'){
      const z = {};
      vor.filter(x => dabei(d.pid, x)).forEach(x => { const mit = [x.a1, x.a2].includes(d.pid) ? [x.a1, x.a2].find(y => y !== d.pid) : [x.b1, x.b2].find(y => y !== d.pid);
        const q = z[mit] || (z[mit] = {s:0, n:0}); q.n++; if(gew(d.pid, x)) q.s++; });
      const best = Object.keys(z).filter(id => z[id].n >= 6).sort((a, b) => z[b].s / z[b].n - z[a].s / z[a].n || z[b].n - z[a].n)[0];
      if(best !== d.mit || z[d.mit].n !== d.n || d.n % 8) fehler('Partner');
    }
    // Und sein Fuß zeichnet sich, im Blatt wie an der Karte.
    if(!_spFaktBild(d)) fehler('ohne Zeichnung');
  });
  return {je, falsch};
})())`));
ok(Object.keys(_katalog.je).length === 7 && _katalog.falsch.length === 0,
   'jeder der sieben Fakten stimmt mit den rohen Partien und hat seine Zeichnung',
   JSON.stringify(_katalog.je) + (_katalog.falsch.length ? ' · ' + _katalog.falsch.slice(0, 3).join(' | ') : ''));

// ── Der härteste Tag gehört zum Spieler des Tages ──────────────────────
// „Harter Tag für Leo" stand als eigene rote Karte eine Minute unter dem
// Spieler des Tages: dieselbe Frage, wer den Tag geprägt hat, auf zwei
// Karten. Er steht jetzt als Gegenstück auf dessen Karte; die Meldung reist
// mit und geht nicht verloren.
const _gegen = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const st = getStoriesCache();
  const swing = roh.filter(s => (s.dataRef||{}).type === 'elo_swing');
  const potdTage = new Set(st.filter(s => (s.dataRef||{}).type === 'potd').map(s => tagKey(s.when)));
  const allein = st.filter(s => (s.dataRef||{}).type === 'elo_swing' && potdTage.has(tagKey(s.when))).map(s => s.title);
  const mit = st.filter(s => (s.dataRef||{}).gegenstueck);
  const verloren = swing.filter(w => !st.some(s => s.id === w.id || ((s.dataRef||{}).memberIds || []).includes(w.id))).map(w => w.id);
  const zeile = mit.every(s => _newsCardHtmlM2(s, false, false).indexOf('class="nf-gegen"') >= 0
    && (_newsDetailBody(s) || '').indexOf('nd-gegen') >= 0);
  return {swing:swing.length, mit:mit.length, allein, verloren, zeile};
})())`));
ok(_gegen.swing > 0 && _gegen.mit === _gegen.swing && !_gegen.allein.length && !_gegen.verloren.length && _gegen.zeile,
   'der härteste Tag steht auf der Karte und im Blatt des Spielers des Tages, nicht daneben, und geht nicht verloren',
   JSON.stringify(_gegen));

// ── Woher die Zahl der Laufbahn kommt ─────────────────────────────────
// Die Zahl neben einem Spieler ist die Bewegung des ganzen Spieltags über
// alle drei Quellen, die Chips nennen nur die Wechsel der Karte. Gemeldet
// stand „übernimmt ‚Der Einzelkämpfer'" neben −33 und „verliert ‚Der Lauf'"
// neben +34, ohne dass zu sehen war, warum. Jede Zeile mit Bewegung trägt
// jetzt ihre Quellen, und die ergeben zusammen die Zahl daneben.
const _quell = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const zahl = t => +String(t).replace('−', '-').replace('+', '');
  let n = 0; const falsch = [];
  getStoriesCache().filter(x => (x.dataRef||{}).type === 'sammel' && x.dataRef.quelle === 'tafel').forEach(x => {
    const b = _newsDetailBody(x);
    b.split('<div class="nd-wk').slice(1).filter(z => z.indexOf('data-pid') >= 0 && z.indexOf('data-pid') < 40).forEach(z => {
      const d0 = z.indexOf('nd-wk-d');
      const d = d0 < 0 ? 0 : zahl(z.slice(z.indexOf('>', d0) + 1, z.indexOf('<', d0)));
      if(!d) return;
      n++;
      const q0 = z.indexOf('class="nd-wk-q">');
      const q = q0 < 0 ? '' : z.slice(q0).split('<span class="nd-wk-gs')[0].split('nd-wk-p')[0];
      const summe = q.split('<b class="').slice(1)
        .reduce((s, t) => s + zahl(t.slice(t.indexOf('>') + 1, t.indexOf('<'))), 0);
      if(!q || summe !== d) falsch.push(x.id + ': ' + d + ' gegen ' + summe);
    });
  });
  return {n, falsch};
})())`));
ok(_quell.n > 3 && _quell.falsch.length === 0,
   'jede Zahl der Laufbahn im Blatt trägt ihre Quellen, und die ergeben zusammen die Zahl',
   _quell.falsch.slice(0, 3).join(' | ') || _quell.n + ' Zeilen');

// ── Der Fuß zeigt, wovon die Schlagzeile spricht, und wechselt ab ──
// Über „Leon und Maxi treffen zum 188. Mal aufeinander" stand Leos Wende als
// Fuß, und von 52 Partien in vierzehn Tagen trugen 11 die Wende: der Fuß
// hatte eine eigene Reihe, die die Rivalität nicht kannte und deren erster
// zutreffender Eintrag immer gewann.
const _fuss = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const ZU = {lead_change:'spitze', streak_killer:'riss', milestone_wins:'marken', milestone_goals:'marken',
    milestone_elo:'marken', jubilee:'marken', win_streak:'serie', team_streak:'teamserie',
    rivalry:'duell', rivalry_milestone:'duell'};
  const FAKT = new Set(['spitze','medaille','riss','marken','serie','teamserie','duell']);
  const falsch = [], fuesse = [];
  getStoriesCache().forEach(s => {
    const d = s.dataRef || {};
    if(!d.matchId || !(d.type === 'spiel' || (d.type === 'sammel' && d.quelle === 'spiel'))) return;
    const basis = _newsSpielFakten(s).find(x => x.type === 'spiel') || {};
    const occ = basis.visual && basis.visual.occasion && basis.visual.occasion.key;
    fuesse.push({t:mts(_spMatch(d.matchId) || {}), occ:occ || ''});
    if(d.type !== 'sammel') return;
    const leit = (d.teile || []).find(t => String(t.titel || '').trim() === String(s.title || '').trim());
    const soll = leit && ZU[leit.typ];
    // Ein Zustand (Serie, Serie zu zweit, Rivalität) tritt zurück, wenn er
    // auf den Karten davor schon gezeichnet war; ein Ereignis nie [§C33].
    if(soll && occ !== soll && !SP_FUSS_ZUSTAND.has(soll)) falsch.push(s.title + ' → ' + occ + ' statt ' + soll);
  });
  fuesse.sort((a, b) => a.t - b.t);
  const n = {}; fuesse.forEach(f => { if(f.occ) n[f.occ] = (n[f.occ] || 0) + 1; });
  const mit = fuesse.filter(f => f.occ).length;
  const max = Object.entries(n).sort((a, b) => b[1] - a[1])[0] || ['', 0];
  let folge = 0;
  for(let i = 1; i < fuesse.length; i++)
    if(fuesse[i].occ && fuesse[i].occ === fuesse[i - 1].occ && !FAKT.has(fuesse[i].occ)) folge++;
  return {falsch, mit, max, folge, arten:Object.keys(n).length};
})())`));
ok(_fuss.falsch.length === 0,
   'der Fuß einer Partie zeigt den Anlass ihrer Schlagzeile, wenn er ein Ereignis ist',
   _fuss.falsch.slice(0, 3).join(' | ') || 'alle passend');
ok(_fuss.mit > 30 && _fuss.max[1] <= _fuss.mit / 5 && _fuss.arten >= 10,
   'kein Fuß steht auf mehr als einem Fünftel der Partien, und es gibt mindestens zehn verschiedene',
   _fuss.max[0] + ' ' + _fuss.max[1] + ' von ' + _fuss.mit + ' · ' + _fuss.arten + ' Arten');
ok(_fuss.folge === 0,
   'zwei Partien hintereinander tragen nicht denselben frei gewählten Fuß',
   _fuss.folge + ' Wiederholungen');
// Das Zählwerk zeichnete nur die erste runde Zahl ihrer Art: erreichten in
// einer Partie der eine den hundertsten Sieg und der andere die
// fünfhundertste Partie, stand nur der Sieg im Fuß. Gestellt: drei Marken
// zweier Sieger in einer Partie, dazu eine doppelte, die nur einmal zählt.
const _marken = JSON.parse(K.eval(`JSON.stringify((function(){
  const m = matches[matches.length - 1], w = m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
  const v = _spAnlassSnapshot(m, [{type:'jubilee', pid:w[1], total:500}, {type:'milestone_wins', pid:w[0], milestone:'100'},
    {type:'milestone_elo', pid:w[0], mark:1500}, {type:'milestone_wins', pid:w[0], milestone:'100'}], 'feld');
  const h = v ? _spOccasionBild(v) : '';
  return {key:v && v.key, liste:((v && v.data && v.data.liste) || []).map(x => x.wert + ' ' + x.label),
    namen:w.every(p => h.indexOf(esc(pmap()[p].name)) >= 0), ziffern:(h.match(/<i>\\d<\\/i>/g) || []).length};
})())`));
ok(_marken.key === 'marken' && _marken.liste.join() === '100 Sieg,1500 Elo,500 Partie' && _marken.namen && _marken.ziffern === 10,
   'jede runde Zahl einer Partie steht im Fuß, von jedem und jede einmal, die schwerste zuerst, jede auf ihren Ziffern',
   JSON.stringify(_marken));

// ── Die Wochenkarte zeigt alle sechs Wertungen ──────────────────────
// Sie zeigte drei und darunter „und 3 weitere Wertungen": die Ueberraschung,
// der Krimi und das Team der Woche kamen auf der Karte gar nicht vor, obwohl
// sie einmal je Woche erscheint und fuer nichts anderes da ist. Und das Team
// der Woche entstand im Generator als letztes und stand damit auch als
// letztes, obwohl es neben dem Spieler der Woche gehoert.
const _wo = JSON.parse(K.eval(`JSON.stringify((function(){
  const s = _consolidateStories(_buildStories()).find(x => (x.dataRef||{}).type === 'woche');
  if(!s) return {fehlt:true};
  const teile = (s.dataRef.teile || []);
  const karte = _newsCardHtmlM2(s, false, false);
  return {n:teile.length, arten:teile.map(t => t.art),
          zeilen:(String(karte).match(/nf-wl-z/g) || []).length,
          rest:/nf-wl-m/.test(String(karte))};
})())`));
ok(!_wo.fehlt, 'die Wochenkarte entsteht', JSON.stringify(_wo));
ok(_wo.arten[0] === 'potw' && _wo.arten[1] === 'team',
   'Spieler der Woche steht oben, das Team der Woche direkt darunter', (_wo.arten||[]).join(', '));
ok(_wo.zeilen === _wo.n, 'die Karte zeigt jede Wertung', _wo.zeilen + ' von ' + _wo.n);
ok(_wo.rest === false, 'und keine Zeile mehr, die den Rest verschweigt', String(_wo.rest));

// ── Wie die Liga spricht ────────────────────────────────────────────
// Leicht und unkompliziert, aber mit den Zahlen dran. Der Gedankenstrich ist
// raus: er trennte Saetze, die als zwei Saetze klarer sind. Und die
// Schlagzeile steht nicht noch einmal im Text — „Serie gerissen: Martin"
// mit „Leon & Maxi stoppen die Serie" darunter trug den Verlierer in der
// Zeile und die Tat im Kleingedruckten.
const _sprache = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const seen = {}; const arten = [];
  roh.forEach(s => { const d = s.dataRef||{};
    const k = (d.type||'?') + (d.sub ? ':'+d.sub : '');
    if(seen[k]) return; seen[k] = 1; arten.push({k, t:s.title||'', d:s.desc||''}); });
  const norm = t => String(t).replace(/[„""»«.,;:!?()]/g,' ').replace(/\\s+/g,' ').trim().toLowerCase();
  return {
    n: arten.length,
    strich: arten.filter(a => /[—–]/.test(a.t + a.d)).map(a => a.k),
    // Ausgenommen ist die Auszeichnung: ihr Text ist die Bedingung aus dem
    // Katalog, und „Debuetant: Match gespielt" braucht keine Zahl. Das gilt
    // fuer die gesammelten runden Marken genauso, solange es nur eine ist —
    // dann ist die Karte eine Auszeichnung, und ihre Zahl steht im Titel.
    ohneZahl: arten.filter(a => a.k !== 'badge_unlocked' && a.k !== 'badge_marken'
      && !/\\d/.test(a.d)).map(a => a.k),
    titelDoppelt: arten.filter(a => norm(a.t).length >= 12
      && norm(a.d).indexOf(norm(a.t)) >= 0).map(a => a.k),
    // Ein Fragezeichen im Text heisst, dass ein Name nicht aufgeloest wurde.
    ohneNamen: arten.filter(a => /\\B\\?\\B|: \\?|\\? /.test(a.d)).map(a => a.k)
  };
})())`));
ok(_sprache.strich.length === 0, 'kein Gedankenstrich in einem Story-Text',
   _sprache.strich.join(', '));
ok(_sprache.ohneZahl.length === 0, 'jeder Story-Text nennt eine Zahl',
   _sprache.ohneZahl.join(', '));
ok(_sprache.titelDoppelt.length === 0, 'kein Text wiederholt seine Schlagzeile',
   _sprache.titelDoppelt.join(', '));
ok(_sprache.ohneNamen.length === 0, 'kein unaufgeloester Name im Text',
   _sprache.ohneNamen.join(', '));

// ── „Ausgebaut" heisst besser geworden ──────────────────────────────
// Die Meldung feuerte, sobald sich die ANGEZEIGTE Zahl aenderte — egal
// wohin. „Der Fels" ging von 6,9 auf 7,0 Gegentore und „Der Platzhirsch"
// von 44 auf 42 Prozent, beides eine Verschlechterung, und beides stand als
// „baut seinen Rekord aus" im Feed. Wer den Rekord haelt und verschlechtert,
// hat nichts getan: die anderen sind nur nicht vorbeigezogen.
const _art = JSON.parse(K.eval(`JSON.stringify((function(){
  const p = ['p1'], q = ['p2'];
  const f = (a, n) => _rekordArt(a, n);
  return {
    ohneVorher:   f(null, {pids:p, ev:'7 Siege', val:7}),
    halterWechsel:f({pids:q, ev:'6 Siege', val:6}, {pids:p, ev:'7 Siege', val:7}),
    besser:       f({pids:p, ev:'6 Siege', val:6}, {pids:p, ev:'7 Siege', val:7}),
    schlechter:   f({pids:p, ev:'7 Siege', val:7}, {pids:p, ev:'6 Siege', val:6}),
    gleich:       f({pids:p, ev:'7 Siege', val:7}, {pids:p, ev:'7 Siege', val:7.0001})
  };
})())`));
ok(_art.ohneVorher === 'erstmals', 'ein Rekord ohne Vorgaenger ist erstmals vergeben', _art.ohneVorher);
ok(_art.halterWechsel === 'geholt', 'ein neuer Halter hat ihn geholt', _art.halterWechsel);
ok(_art.besser === 'gesteigert', 'ein besserer Wert ist ausgebaut', _art.besser);
ok(_art.schlechter === '', 'ein SCHLECHTERER Wert ist keine Nachricht', _art.schlechter || 'leer');
ok(_art.gleich === '', 'und eine unsichtbare Aenderung auch nicht', _art.gleich || 'leer');

// ── Ein ueberschrittener Meilenstein bleibt auffrischbar ────────────
// Die ID traegt die Zahl (`rivalry_milestone_A|B_50`). Stand das Paar bei 52,
// bildete der Generator die 50er-ID nicht mehr — und „Historisches 50.
// Aufeinandertreffen — die Rivalitaet waechst" stand mit Gedankenstrich und
// leerem Satz im Feed, Monate nach dem Umbau. Gemeldet wird deshalb JEDE
// ueberschrittene Schwelle, mit dem Zeitpunkt der kreuzenden Partie.
const _ms = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const ms = roh.filter(s => (s.dataRef||{}).type === 'rivalry_milestone');
  // Eine persistierte Zeile mit dem ALTEN Wortlaut nachstellen.
  const alt = ms.map(s => Object.assign({}, s, {title: 'ALTER TITEL',
    desc: 'Historisches ' + s.dataRef.n + '. Aufeinandertreffen — die Rivalitaet waechst.'}));
  _cache._stories = alt.concat(roh.filter(s => (s.dataRef||{}).type !== 'rivalry_milestone'));
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  const gezeigt = sicht.filter(s => (s.dataRef||{}).type === 'rivalry_milestone');
  return {
    erzeugt: ms.length,
    // Gemeldet wird die ueberschrittene Schwelle, nicht die aktuelle Zahl:
    // steht ein Paar bei 52, gehoert ihm die 50er-Karte. Gezaehlt wird
    // deshalb, ob eine Schwelle UNTER dem heutigen Stand des Paares steht.
    // (Frueher stand hier „dasselbe Paar zweimal" — das galt nur, solange
    // jede Schwelle der ganzen Ligageschichte gebildet wurde.)
    mehrfach: ms.some(x => {
      const a = x.dataRef.a, b = x.dataRef.b;
      let n = 0;
      matches.forEach(m => {
        const A = [m.a1, m.a2], B = [m.b1, m.b2];
        if((A.indexOf(a) >= 0 && B.indexOf(b) >= 0)
        || (A.indexOf(b) >= 0 && B.indexOf(a) >= 0)) n++;
      });
      return n > x.dataRef.n;
    }),
    gezeigt: gezeigt.length,
    nochAlt: gezeigt.filter(s => s.title === 'ALTER TITEL'
      || String(s.desc||'').indexOf('—') >= 0).length,
    // Der Zeitpunkt gehoert der kreuzenden Partie, nicht dem letzten Duell.
    zeitOk: ms.every(s => {
      const m = matches.find(x => x.id === s.dataRef.matchId);
      return m && Math.abs(new Date(s.when).getTime() - mts(m)) < 1000;
    })
  };
})())`));
ok(_ms.erzeugt > 0, 'Meilensteine werden gebildet', _ms.erzeugt + ' Schwellen');
ok(_ms.mehrfach, 'auch ueberschrittene Schwellen, nicht nur die aktuelle');
ok(_ms.nochAlt === _ms.gezeigt, 'ein alter Meilenstein-Wortlaut bleibt als Snapshot erhalten',
   _ms.nochAlt + ' von ' + _ms.gezeigt);
ok(_ms.zeitOk, 'der Meilenstein steht am Tag der kreuzenden Partie');

// ── Der Tag ist das Mass, nicht das Fenster ─────────────────────────
//    Die Mischung aus Spieltag und Ewiger Tafel war eine Quote ueber das
//    ganze 14-Tage-Fenster. Gemessen schnitt sie den Feed von 42 auf 23
//    Karten und leerte zwei von sieben Spieltagen vollstaendig: der 24.08.
//    trug vierzehn Meldungen und im Feed keine einzige Karte.
console.log('\n═══ DER TAG IST DAS MASS ═══');
const _tagmix = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const feed = getStoriesCache();
  const tk = w => tagKey(w);
  const istTafel = s => s.cat === 'tafel' || (s.dataRef||{}).quelle === 'tafel';
  const gew = s => (s.dataRef||{}).type === 'sammel'
    ? Math.max(1, ((s.dataRef||{}).teile||[]).length) : 1;
  const proTag = {}, rohTag = {};
  feed.forEach(s => { (proTag[tk(s.when)] = proTag[tk(s.when)] || []).push(s); });
  roh.forEach(s => { (rohTag[tk(s.when)] = rohTag[tk(s.when)] || []).push(s); });
  // Jeder Tag, an dem gespielt wurde und fuer den der Generator etwas
  // gebildet hat, traegt mindestens eine Karte.
  const leer = Object.keys(rohTag).filter(k => _newsTagMs(k).length
    && !(proTag[k] || []).length);
  // Und kein Tag traegt mehr als den Deckel — Pflicht und Breaking zaehlen
  // nicht mit [§C33].
  // Der Sieger des Tages und sein Gegenpart „Harter Tag fuer X" fassen den
  // ganzen Tag zusammen, stehen an seinem Ende und zaehlen nicht mit [§C33].
  const pflicht = new Set(['potd','woche','season_recap','elo_swing']);
  // Eine Partie-Karte zaehlt nicht mit: sie ist keine Auswahl, sie wurde
  // gespielt. Neun Partien an einem Tag sind neun Ereignisse [§C33].
  // Die Runde der Vier nimmt Partie-Karten auf und ist selbst eine [§11.6c].
  const prt = s => { const d = (s&&s.dataRef)||{};
    return d.type === 'spiel' || d.type === 'runde'
        || (d.type === 'sammel' && d.quelle === 'spiel' && (!!d.matchId
            || (d.teile||[]).some(x => String((x&&x.id)||'').indexOf('spiel_') === 0))); };
  // Die erste Tafel-Karte eines Tages zaehlt nicht mit: sie hat ihren eigenen
  // Platz, damit sie keiner Karte den ihren nimmt, die schon dastand [§C33].
  const ueber = Object.keys(proTag).filter(k => {
    const frei = new Set(proTag[k].filter(istTafel)
      .sort((a, b) => new Date(a.when) - new Date(b.when))
      .slice(0, NEWS_LIMITS.tafelProTagMin || 0).map(s => s.id));
    return proTag[k].filter(s => {
      const t = (s.dataRef||{}).type;
      if(frei.has(s.id)) return false;
      let b = false; try { b = _isBreaking(s); } catch(e){}
      return !b && !pflicht.has(t) && !prt(s);
    }).length > NEWS_LIMITS.proTag;
  });
  // Wo sich die Tafel bewegt hat, steht sie auch im Feed.
  const tafelTage = Object.keys(rohTag).filter(k => rohTag[k].some(istTafel));
  const ohneTafel = tafelTage.filter(k => !(proTag[k] || []).some(istTafel));
  // Von einer Achse hoechstens zwei Buendel je Tag: vier Karten „Ein Spiel,
  // N Geschichten" untereinander sind drei zu viel. Die Achse der PARTIE ist
  // davon ausgenommen — vier Partien sind vier Nachrichten, und jede
  // Schlagzeile nennt seit dem Umbau, was in ihrer Partie passiert ist.
  const achseZuViel = [];
  Object.keys(proTag).forEach(k => {
    const z = {};
    proTag[k].forEach(s => { const d = s.dataRef||{};
      if(d.type !== 'sammel' || prt(s)) return;
      const a = 'sammel/' + (d.quelle || 'spiel');
      z[a] = (z[a]||0) + 1; });
    Object.keys(z).forEach(a => { if(z[a] > 2) achseZuViel.push(k + ' ' + a + ' ' + z[a]); });
  });
  // Die Waage wird je TAG gemessen, nicht ueber das Fenster: der Generator
  // bildet Tafel-Aenderungen nur fuer den LETZTEN Spieltag, Spieltagskarten
  // aber fuer alle vierzehn Tage. Ueber das Fenster gerechnet waere die Quote
  // damit eine Aussage ueber den Generator und nicht ueber die Mischung.
  const istSpieltagsKarte = s => !istTafel(s) && (s.dataRef||{}).type !== 'ambient';
  // Die Zeichen-Karte eines Wochenschlusses steht am Montag um 00:00, ist
  // aber keine Tafel dieses Spieltags: sie gehoert der Woche davor.
  const istTafelTag = s => istTafel(s) && !(s.dataRef||{}).schluss;
  const beides = Object.keys(rohTag).filter(k =>
    rohTag[k].some(istTafelTag) && rohTag[k].some(istSpieltagsKarte));
  const ohneSpieltag = beides.filter(k => !(proTag[k] || []).some(istSpieltagsKarte));
  const mischung = beides.map(k => {
    let t = 0, sp = 0;
    (proTag[k] || []).forEach(s => { if(istTafel(s)) t += gew(s);
      else if(istSpieltagsKarte(s)) sp += gew(s); });
    return {tag: k, t, sp, anteil: Math.round(100 * t / Math.max(1, t + sp))};
  });
  return {karten: feed.length, tage: Object.keys(proTag).length,
          leer, ueber, ohneTafel, achseZuViel, beides, ohneSpieltag, mischung};
})())`));
ok(_tagmix.leer.length === 0, 'kein Spieltag im Feed bleibt ohne Karte',
   _tagmix.leer.join(', ') || 'keiner');
// Gebaut, nicht gehofft: zwei Spieltage, dieselbe Schlagzeile. Der Vergleich
// der Schlagzeilen wirft die aeltere weg [§C33], und dann stand der aeltere
// Spieltag ohne eine einzige Karte in der Tafel. Der reservierte Tafel-Platz
// wird am selben Weg geprueft: ein schwacher Tafel-Wechsel unter sechs
// starken Spieltagskarten faellt sonst unter den Deckel.
const _tagbau = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const a = tage[tage.length - 1], b = tage[tage.length - 2];
  const msVon = k => mts(_newsTagMs(k)[0]);
  // elo_swing ist der gemessene Fall: „Harter Tag fuer Johannes" stand an
  // vier Tagen im Fenster, und der Vergleich der Schlagzeilen liess genau
  // eine davon stehen. Der 13.08. hatte danach nur noch den Spieler des
  // Tages, der 19.08. gar nichts.
  const gleich = [a, b].map((k, i) => ({
    id: 'gl-' + i, cat:'highlight', ic:'flame', when: new Date(msVon(k)), prio: 38,
    title: 'Dieselbe Schlagzeile', desc: 'Ein Text, ' + (i + 1) + ' Zahlen.',
    dataRef: {type:'elo_swing', pid: players[0].id, delta: 20 + i}
  }));
  _cache._consolFrom = null;
  const doppelt = _consolidateStories(gleich);
  // Der schwache Tafel-Wechsel gegen sechs starke Spieltagskarten: sechs
  // verschiedene Spieler und drei Sorten, damit weder der Deckel je Sorte
  // noch die Rueckholung der fehlenden Gesichter die Auswahl macht.
  const stark = [];
  const sorten = ['top_clash','top_clash','giant_slayer','giant_slayer',
                  'streak_killer','streak_killer'];
  for(let i = 0; i < 6; i++) stark.push({
    id:'st-' + i, cat:'highlight', ic:'ball', when:new Date(msVon(a) + i * 3600000),
    prio: 80 + i, title:'Starke Karte ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:sorten[i], matchId:'kein-' + i, playerIds:[players[i].id]}
  });
  stark.push({id:'tf-1', cat:'tafel', ic:'trophyStar', when:new Date(msVon(a)),
    prio: 40, title:'Ein schwacher Wechsel', desc:'Ein Rekord wandert um 1 Platz.',
    dataRef:{type:'rekord_gesteigert', rekordId:'x', playerIds:[players[6].id]}});
  _cache._consolFrom = null;
  const mitTafel = _consolidateStories(stark);
  return {tageImFeed: [...new Set(doppelt.map(s => tagKey(s.when)))].length,
          tafelDrin: mitTafel.some(s => s.cat === 'tafel'),
          karten: mitTafel.length};
})())`));
ok(_tagbau.tageImFeed === 2,
   'zwei Spieltage mit derselben Schlagzeile behalten beide eine Karte',
   _tagbau.tageImFeed + ' Tage');
ok(_tagbau.tafelDrin,
   'und ein schwacher Tafel-Wechsel haelt seinen Platz gegen sechs starke Karten',
   _tagbau.karten + ' Karten');
const _altesGesamtkontingent = 120;
const _ohneGesamtdeckel = K.eval(`(function(){
  const l = Array.from({length:125}, (_, i) => ({
    id:'ohne-deckel-' + i, cat:'season', ic:'sparkle',
    when:new Date(2026, 7, 27, 0, i), prio:20,
    title:'Eigenes Ereignis ' + i, desc:'Eigener Text mit Zahl ' + i + '.',
    dataRef:{type:'test_story_' + i}
  }));
  _cache._snapshotConsolFrom = null;
  return _consolidateStories(l).length;
})()`);
ok(_ohneGesamtdeckel > _altesGesamtkontingent, 'ereignisreiche Feeds duerfen mehr als das alte Gesamtkontingent tragen',
   _ohneGesamtdeckel + ' statt hoechstens ' + _altesGesamtkontingent);
ok(_tagmix.ohneTafel.length === 0,
   'wo sich die Ewige Tafel bewegt hat, steht sie auch im Feed',
   _tagmix.ohneTafel.join(', ') || 'keiner');
ok(_tagmix.achseZuViel.length === 0,
   'von einer Sammel-Achse stehen hoechstens zwei Karten an einem Tag',
   _tagmix.achseZuViel.join(', ') || 'keine');
// Gebaut: vier Partien eines Tages, jede mit zwei Geschichten und einem
// eigenen Paar. Gemessen standen am 26.08. vier Karten „Ein Spiel, N
// Geschichten fuer …" untereinander — vier verschiedene Partien, aber fuer
// den, der scrollt, viermal dieselbe Schlagzeile.
const _vierBuendel = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const basis = mts(_newsTagMs(tage[tage.length - 1])[0]);
  const l = [];
  for(let i = 0; i < 4; i++){
    const wann = new Date(basis + i * 600000);   // vier verschiedene Minuten
    // Vier Paare aus denselben vier Spielern: jedes Paar ist eine eigene
    // Aussage (die Sperrfrist greift also nicht), und die dritte und vierte
    // Karte bringt kein neues Gesicht mit — sonst holt die Regel „der Deckel
    // darf niemanden ganz verschwinden lassen" sie zurueck, richtig so, aber
    // dann messen wir nicht den Deckel.
    const paare = [[0, 1], [2, 3], [0, 2], [1, 3]][i];
    const p1 = players[paare[0]].id, p2 = players[paare[1]].id;
    l.push({id:'b' + i + 'a', cat:'highlight', ic:'ball', when:wann, prio:70,
      title:'Serienbruch ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
      dataRef:{type:'streak_killer', matchId:'mm' + i, playerIds:[p1, p2]}});
    l.push({id:'b' + i + 'b', cat:'highlight', ic:'thriller', when:wann, prio:69,
      title:'Krimi ' + i, desc:'Noch ein Satz mit ' + i + ' Zahlen.',
      dataRef:{type:'spiel', resultKind:'krimi', matchId:'mm' + i,
               playerIds:[p1, p2]}});
  }
  _cache._consolFrom = null;
  const out = _consolidateStories(l);
  return {buendel: out.filter(s => (s.dataRef||{}).quelle === 'spiel').length,
          karten: out.length};
})())`));
ok(_vierBuendel.buendel === 4,
   'und vier Partien eines Tages tragen vier Karten',
   _vierBuendel.buendel + ' Buendel von ' + _vierBuendel.karten + ' Karten');
// ── Eine Partie faellt unter keinen Deckel ─────────────────────────
//    Gemessen fielen am 07.09. der Probeliga „Ben und Jonas gewinnen ohne
//    Gegentor" (73) und „Kai und Ella stuerzen die Favoriten" (71) unter den
//    Tagesdeckel, weil Tafel, Spieler des Tages und zwei Sammelkarten
//    darueber standen: von neun Partien stand am Ende kein einziges Ergebnis
//    im Feed. Der Ausweg war einmal eine gemeinsame Karte fuer zwei
//    verdraengte Ergebnisse. Heute wird gar nichts verdraengt — eine Karte je
//    Partie IST der Deckel des Spieltags [§C33].
const _ergSam = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const tag = tage[tage.length - 1];
  const partien = _newsTagMs(tag).slice(0, 3);
  const basis = mts(partien[0]);
  const l = [];
  // Sechs starke Karten ohne Partie: sie belegen den Tag weit ueber den
  // Deckel hinaus.
  const starke = ['milestone_wins','milestone_goals','milestone_elo',
                  'jubilee','rivalry_milestone','rivalry'];
  starke.forEach((typ, i) => l.push({
    id:'sk-' + i, cat:'personal', ic:'medal', when:new Date(basis + i * 60000),
    prio: 85 - i, title:'Starke Marke ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:typ, pid:players[i % 4].id, playerIds:[players[i % 4].id]}
  }));
  // Drei Partien, jede mit ihrer eigenen Karte und dem schwaechsten Rang des
  // Spieltagsbandes. Keine davon darf wegfallen.
  partien.forEach((m, i) => l.push({
    id:'er-' + i, cat:'highlight', ic:'thriller',
    when:new Date(mts(m) + 3600000 + i * 60000), prio: 41,
    title:'Ein Ergebnis ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:'spiel', resultKind:'krimi', matchId:m.id,
             playerIds:[players[i % 4].id]}
  }));
  _cache._consolFrom = null;
  const out = _consolidateStories(l);
  const amTag = out.filter(s => tagKey(s.when) === tag);
  return {partien: partien.length,
          durch: out.filter(s => (s.dataRef||{}).type === 'spiel').length,
          deckelbar: amTag.filter(s => (s.dataRef||{}).type !== 'spiel').length,
          deckel: NEWS_LIMITS.proTag,
          karten: amTag.length};
})())`));
ok(_ergSam.durch === _ergSam.partien,
   'jede Partie steht im Feed, auch wenn der Tag voll ist',
   _ergSam.durch + ' von ' + _ergSam.partien);
ok(_ergSam.deckelbar === 6,
   'auch Meldungen neben den Partien werden nicht durch einen Deckel verworfen',
   _ergSam.deckelbar + ' deckelbare von ' + _ergSam.karten + ' Karten');
// ── Eine Partie oder keine ─────────────────────────────────────────
//    Die Sammelkarte borgte die matchId ihres Kopfes. Ein Tafel-Moment
//    entsteht aber ueber die MINUTE und umfasst damit mehrere Partien: ueber
//    „Leo und Stefan bewegen die Ewige Tafel" stand das Ergebnis einer
//    Partie, an der nur einer der beiden beteiligt war.
const _bandEinig = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const partien = _newsTagMs(tage[tage.length - 1]).slice(0, 2);
  const bau = (mids) => {
    const wann = new Date(mts(partien[0]));
    const l = mids.map((mid, i) => ({
      id:'bd-' + i + '-' + mids.join('_'), cat:'tafel', ic:'trophyStar',
      when: wann, prio: 76 - i, title:'Ein Wechsel ' + i,
      desc:'Ein Rekord wandert um ' + (i + 1) + ' Platz.',
      dataRef:{type:'rekord_geholt', rekordId:'r' + i, matchId:mid,
               playerIds:[players[i].id]}
    }));
    _cache._consolFrom = null;
    const out = _consolidateStories(l);
    const sam = out.filter(s => (s.dataRef||{}).quelle === 'tafel');
    return sam.length ? (sam[0].dataRef.matchId || null) : 'kein Buendel';
  };
  return {gleich: bau([partien[0].id, partien[0].id]),
          verschieden: bau([partien[0].id, partien[1].id]),
          erste: partien[0].id};
})())`));
ok(_bandEinig.gleich === _bandEinig.erste,
   'ein Tafel-Moment aus EINER Partie zeigt ihr Ergebnisband',
   String(_bandEinig.gleich));
ok(_bandEinig.verschieden === null,
   'und einer aus zwei Partien zeigt keins, statt sich eine auszusuchen',
   String(_bandEinig.verschieden));
// ── Breaking aus derselben Partie reist zusammen ───────────────────
//    Gemessen stand „Neuer Spitzenreiter: Maxi" mit dem Ergebnisband 10:0 im
//    Feed, und „Maxi und Henry: Absoluter Sieger" — die legendaere
//    Auszeichnung fuer genau dieses 10:0 — als zweite Karte daneben:
//    dasselbe Spiel, dasselbe Wappen, derselbe Stand, zweimal gelesen.
//    Zusammengelegt wird nur ueber die PARTIE: eine gemeinsame Minute ohne
//    gemeinsames Spiel sagt nichts.
const _brk = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const p = _newsTagMs(tage[tage.length - 1]).slice(0, 2);
  const bau = (zweiteMatchId) => {
    const l = [
      {id:'brk-a', cat:'team', ic:'medal', when:new Date(mts(p[0])),
       prio:90, title:'Eine legendäre Auszeichnung', desc:'Ein 10:0 im Katalog.',
       dataRef:{type:'badge_unlocked', badgeId:'perfect_win', rarity:'legendary',
                matchId:p[0].id, playerIds:[players[0].id, players[1].id]}},
      {id:'brk-b', cat:'liga', ic:'crown', when:new Date(mts(p[0])),
       prio:93, title:'Neuer Spitzenreiter', desc:'Die Spitze wechselt nach 1 Spiel.',
       dataRef:{type:'lead_change', newLeader:players[0].id,
                prevLeader:players[2].id, matchId:zweiteMatchId}}
    ];
    _cache._consolFrom = null;
    const out = _consolidateStories(l);
    const sam = out.filter(x => (x.dataRef||{}).type === 'sammel');
    let brk = false;
    try { brk = sam.length ? _isBreaking(sam[0]) : false; } catch(e){}
    return {karten: out.length, sammel: sam.length,
            titel: sam.length ? sam[0].title : '',
            text: sam.length ? sam[0].desc : '',
            band: sam.length ? (sam[0].dataRef.matchId || null) : null,
            breaking: brk,
            karte: sam.length ? _newsCardHtmlM2(sam[0], false, false).replace(/<[^>]+>/g, ' ') : '',
            sorte: sam.length ? _newsSorte(sam[0]) : ''};
  };
  return {gleich: bau(p[0].id), fremd: bau(p[1].id), mid: p[0].id};
})())`));
// ── Jeder Anlass nennt die, denen er gehört ─────────────────────────
//    „Seltene Auszeichnung in einer Partie für Julian und Leo" stand über
//    einer Auszeichnung, die nur Julian geholt hat, und „Enges Spiel und
//    Rivalitätsmarke … für Martin, Jane und Maxi" warf Sieger und Rivalen in
//    einen Topf [§C33].
const _wem = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const m = _newsTagMs(tage[tage.length - 1])[0];
  const P = players.map(p => p.id), nm = i => pmap()[P[i]].name;
  const w = new Date(mts(m));
  const l = [
    {id:'spiel_' + m.id, cat:'highlight', ic:'ball', when:w, prio:40, title:'Ein enges Spiel', desc:'10:8.',
     dataRef:{type:'spiel', resultKind:'eng', matchId:m.id, playerIds:[P[2], P[3]], winners:[P[2], P[3]], losers:[P[0], P[4]]}},
    {id:'wem-b', cat:'team', ic:'medal', when:w, prio:60, title:nm(2) + ': Mauer', desc:'Selten.',
     dataRef:{type:'badge_unlocked', badgeId:'wall_badge', rarity:'rare', matchId:m.id, playerId:P[2], playerIds:[P[2]]}},
    {id:'wem-r', cat:'duell', ic:'swords', when:w, prio:50, title:'50. Duell', desc:'50 Begegnungen.',
     dataRef:{type:'rivalry_milestone', a:P[0], b:P[1], n:50, matchId:m.id}},
    {id:'wem-k', cat:'highlight', ic:'flameBreak', when:w, prio:55, title:nm(2) + ' und ' + nm(3) + ' brechen die 8er-Serie von ' + nm(4), desc:'Acht Siege.',
     dataRef:{type:'streak_killer', matchId:m.id, streak:8, victimPid:P[4], breakerIds:[P[2], P[3]], playerIds:[P[2], P[3], P[4]]}}
  ];
  _cache._consolFrom = null;
  const sam = _consolidateStories(l).filter(x => (x.dataRef||{}).type === 'sammel');
  return {titel: sam.length ? sam[0].title : '', n: [0,1,2,3,4].map(nm),
    karte: sam.length ? _newsCardHtmlM2(sam[0], false, false).replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ') : ''};
})())`));
ok(_wem.titel === _wem.n[2] + ' und ' + _wem.n[3] + ' brechen die 8er-Serie von ' + _wem.n[4]
   && _wem.karte.indexOf(_wem.n[2] + ' holt die seltene Auszeichnung „Mauer“') >= 0
   && _wem.karte.indexOf(_wem.n[0] + ' und ' + _wem.n[1] + ' treffen zum 50. Mal aufeinander') >= 0,
   'die Schlagzeile ist der schwerste Anlass, und jeder andere steht darunter mit denen, denen er gehört, die Auszeichnung mit Namen',
   _wem.titel + ' · ' + _wem.karte.slice(0, 160));
ok(_brk.gleich.sammel === 1 && _brk.gleich.karten === 1,
   'zwei Breaking-Meldungen einer Partie werden EINE Karte',
   _brk.gleich.karten + ' Karten');
ok(_brk.gleich.breaking === true,
   'und sie bleibt Breaking, statt die seltenste Meldung zu entschaerfen',
   String(_brk.gleich.breaking));
ok(_brk.gleich.band === _brk.mid && _brk.gleich.sorte === 'spiel',
   'sie zeigt das Ergebnis der Partie, aus der beides kommt',
   _brk.gleich.sorte + ' / ' + String(_brk.gleich.band));
ok(/Spitzenreiter/.test(_brk.gleich.titel) && /Absoluter Sieger/.test(_brk.gleich.karte),
   'ihre Schlagzeile ist der stärkere Anlass, und der andere steht auf derselben Karte',
   _brk.gleich.titel);
ok(/\d/.test(_brk.gleich.text) || /[Zz]wei|[Dd]rei|[Vv]ier/.test(_brk.gleich.text),
   'und ihr Text sagt, wie viele Meldungen zusammenkommen',
   _brk.gleich.text);
ok(_brk.fremd.sammel === 0 && _brk.fremd.karten === 2,
   'zwei Breaking-Meldungen aus verschiedenen Partien bleiben zwei Karten',
   _brk.fremd.karten + ' Karten');
// ── Was eine Auszeichnung erzaehlt, erzaehlt das Ergebnis nicht ────
//    „Absoluter Sieger" IST das 10:0, und beides in einer Schlagzeile nennt
//    dasselbe zweimal. Gefallen ist dabei nicht die Karte, sondern der
//    ANLASS: eine Partie hoert nicht auf, gespielt worden zu sein, und
//    Ergebnis und Auszeichnung stehen ohnehin in derselben Karte.
const _gedeckt = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const m = _newsTagMs(tage[tage.length - 1])[0];
  const erg = () => ({id:'spiel_' + m.id, cat:'highlight', ic:'hundred',
    when:new Date(mts(m)), prio:69,
    title:'Zwei gewinnen ohne Gegentor', desc:'Ein makelloses 10:0.',
    dataRef:{type:'spiel', resultKind:'zu_null', matchId:m.id,
             playerIds:[players[0].id, players[1].id]}});
  // Gewoehnlich, nicht selten: eine seltene Auszeichnung bleibt eine eigene
  // Karte und bildet mit dem Ergebnis gar kein Buendel.
  const bdg = id => ({id:'badge_' + id + '_' + m.id, cat:'badge', ic:'medal',
    when:new Date(mts(m)), prio:80,
    title:'Eine Auszeichnung', desc:'Zehn zu null.',
    dataRef:{type:'badge_unlocked', badgeId:id, rarity:'common', matchId:m.id,
             playerIds:[players[0].id]}});
  const titelVon = l => { _cache._consolFrom = null;
    const out = _consolidateStories(l);
    const sam = out.find(x => (x.dataRef||{}).type === 'sammel');
    return {karten: out.length, titel: sam ? sam.title : (out[0]||{}).title || ''};
  };
  return {mitBadge: titelVon([bdg('perfect_win'), erg()]),
          fremdBadge: titelVon([bdg('wall_badge'), erg()]),
          allein: titelVon([erg()])};
})())`));
ok(_gedeckt.mitBadge.karten === 1
   && !/ohne Gegentor/.test(_gedeckt.mitBadge.titel),
   'der Anlass des Ergebnisses faellt, wenn eine Auszeichnung derselben Partie ihn erzaehlt',
   _gedeckt.mitBadge.titel);
// Im Bündel ist das Ergebnis kein Anlass mehr, den Ausgang zeigt der Kopf
// [§C33]; allein bleibt sein Satz die Schlagzeile.
ok(!/ohne Gegentor/.test(_gedeckt.fremdBadge.titel) && _gedeckt.fremdBadge.titel === 'Eine Auszeichnung'
   && /ohne Gegentor/.test(_gedeckt.allein.titel),
   'im Bündel ist die Auszeichnung die Schlagzeile, allein das Ergebnis',
   _gedeckt.fremdBadge.titel + ' / ' + _gedeckt.allein.titel);
// ── Und die uebrigen Meldungen derselben Partie reisen mit ─────────
//    Gemessen am 21.09. standen „Martin fuehrt die Tabelle" (Breaking,
//    Band 10:7) und „Stefan und Julian stuerzen die Favoriten" (Band 10:7)
//    untereinander: zwei Fakten, ein Moment, zweimal dasselbe Band.
const _brkMit = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const m = _newsTagMs(tage[tage.length - 1])[0];
  const spitze = {id:'lead_day_x', cat:'highlight', ic:'kingClass',
    when:new Date(mts(m)), prio:93,
    title:players[0].name + ' übernimmt die Tabellenspitze',
    desc:'Steht mit 216 Elo oben, 28 vor dem Zweiten.',
    dataRef:{type:'lead_change', newLeader:players[0].id, prevLeader:players[1].id,
             matchId:m.id, elo:216, gap:28, wechsel:1,
             playerIds:[players[0].id, players[1].id]}};
  const erg = {id:'spiel_' + m.id, cat:'highlight', ic:'giantSlayer',
    when:new Date(mts(m)), prio:67,
    title:'Zwei stürzen die Favoriten', desc:'Nur 18 % Siegchance vor dem Anstoß.',
    dataRef:{type:'spiel', resultKind:'upset', matchId:m.id,
             playerIds:[players[2].id, players[3].id]}};
  // Eine seltene Auszeichnung reist MIT und wird gekennzeichnet. Sie blieb
  // einmal einzeln stehen, damit sie nicht als Kleingedrucktes unter einer
  // fremden Schlagzeile endet — und stand damit neben der Karte desselben
  // Spiels: gemessen zweimal dasselbe 10:4 mit denselben vier Wappen und
  // demselben Stand. Nerves of Steel deckt den Krimi, nicht den Upset.
  const selten = {id:'badge_rare_x', cat:'badge', ic:'medal',
    when:new Date(mts(m)), prio:70,
    title:'Eine seltene Auszeichnung', desc:'Drei Zittersiege in Folge.',
    dataRef:{type:'badge_unlocked', badgeId:'nerves_of_steel', rarity:'rare',
             matchId:m.id, playerIds:[players[4].id]}};
  // Auch eine negative Meldung reist mit. Rot ist die Richtung ihrer Zeile,
  // aber kein Grund, dasselbe Ergebnis auf einer zweiten Karte zu zeigen.
  const schlecht = {id:'badge_neg_x', cat:'badge', ic:'dizzy',
    when:new Date(mts(m)), prio:40,
    title:'Absoluter Verlierer', desc:'0:10 Niederlage.',
    dataRef:{type:'badge_unlocked', badgeId:'perfect_loss', rarity:'negative',
             matchId:m.id, playerIds:[players[5].id]}};
  const lauf = l => { _cache._consolFrom = null; return _consolidateStories(l); };
  const a = lauf([spitze, erg]);
  const sa = a.filter(x => (x.dataRef||{}).type === 'sammel');
  const b = lauf([spitze, erg, selten]);
  const c = lauf([spitze, erg, schlecht]);
  const cg = c.find(x => (x.dataRef||{}).type === 'sammel');
  const cz = cg ? (cg.dataRef.teile || []) : [];
  return {negKarten:c.length, negEinzeln:c.filter(x => x.id === 'badge_neg_x').length,
          negZeilen:cz.filter(x => x.neg).length, negTeile:cz.length,
          karten:a.length, sammel:sa.length,
          titel:sa.length ? sa[0].title : '',
          zeilen:sa.length ? (sa[0].dataRef.teile || []).length : 0,
          band:sa.length ? (sa[0].dataRef.matchId || null) : null,
          brk:sa.length ? !!_isBreaking(sa[0]) : false,
          mid:m.id,
          mitSelten:b.length,
          seltenEinzeln:b.filter(x => x.id === 'badge_rare_x').length,
          seltenZeile:(function(){
            const g = b.find(x => (x.dataRef||{}).type === 'sammel');
            const t = g ? (g.dataRef.teile || []) : [];
            const z = t.find(u => u.typ === 'badge_unlocked');
            return z ? (z.klasse || '') : '';
          })(),
          seltenTitel:(function(){
            const g = b.find(x => (x.dataRef||{}).type === 'sammel');
            return g ? g.title : '';
          })(),
          seltenKarte:(function(){
            const g = b.find(x => (x.dataRef||{}).type === 'sammel');
            return g ? _newsCardHtmlM2(g, false, false) : '';
          })()};
})())`));
ok(_brkMit.karten === 1 && _brkMit.sammel === 1 && _brkMit.zeilen === 2,
   'eine Breaking-Karte nimmt die uebrigen Meldungen ihrer Partie mit',
   _brkMit.karten + ' Karten, ' + _brkMit.zeilen + ' Zeilen');
ok(_brkMit.brk === true && _brkMit.band === _brkMit.mid,
   'sie bleibt Breaking und zeigt das Band ihrer Partie',
   String(_brkMit.brk) + ' / ' + String(_brkMit.band === _brkMit.mid));
ok(/Tabellenspitze/.test(_brkMit.titel) && !/Favoritensturz/.test(_brkMit.titel),
   'ihre Schlagzeile ist der Anlass des Breaking, den Ausgang zeigt der Kopf',
   _brkMit.titel);
ok(_brkMit.mitSelten === 1 && _brkMit.seltenEinzeln === 0,
   'eine seltene Auszeichnung derselben Partie steht in derselben Karte',
   _brkMit.mitSelten + ' Karten');
ok(_brkMit.seltenZeile === 'Selten',
   'und ihre Zeile traegt die Klasse, damit sie nicht untergeht',
   '„' + _brkMit.seltenZeile + '"');
ok(/Tabellenspitze/.test(_brkMit.seltenTitel)
   && (/class="nf-sam-kl">Selten</.test(_brkMit.seltenKarte) || /class="sp-fk sp-md /.test(_brkMit.seltenKarte)),
   'unter der Schlagzeile steht sie mit ihrer Klasse oder als Medaille',
   _brkMit.seltenTitel);
ok(_brkMit.negKarten === 1 && _brkMit.negEinzeln === 0
   && _brkMit.negTeile === 3 && _brkMit.negZeilen === 1,
   'und eine negative Meldung derselben Partie bleibt als rote Zeile in derselben Karte',
   _brkMit.negKarten + ' Karten, ' + _brkMit.negZeilen + ' negative Zeilen');
// ── Der Tafel-Moment ist lesbar, nicht vollstaendig ────────────────
//    Gemessen am 28.09. trug er achtzehn Zeilen, davon elf Ausbauten, und
//    der grosse Wert sagte „18 WECHSEL" — bei elf davon hat niemand
//    gewechselt. Zuerst steht, was Wirkung hat: der Monatseintrag, der
//    wirklich in der Chronik landet und fuers Prestige zaehlt.
const _tafelOrd = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const t = tage[tage.length - 1];
  const m = _newsTagMs(t)[0], ms = mts(m), ck = 'table:' + t;
  const basis = (id, typ, prio, titel, extra) => ({
    id, cat:'tafel', ic:'trophy', when:new Date(ms), prio,
    title:titel, desc:titel + '. Ein Satz mit 1 Zahl.',
    dataRef:Object.assign({type:typ, causalKey:ck, matchId:m.id,
      playerIds:[players[0].id]}, extra || {})
  });
  const bau = (ausbauten) => {
    const l = [
      basis('c-zeigt', 'chronik_geholt', 62, 'Ein Monatseintrag mit Marke',
            {zeigt:true, titleId:'tz'}),
      basis('c-nicht', 'chronik_geholt', 62, 'Ein Monatseintrag ohne Marke',
            {zeigt:false, titleId:'tn'}),
      basis('r-neu', 'rekord_geholt', 76, 'Eine Bestmarke wechselt',
            {rekordId:'rn', kammer:'koennen'}),
      // Eine Stufe stand hier als vierter Wechsel; sie hat seit der
      // Insignium-Karte des Tages ihren eigenen Platz.
      basis('r-neu2', 'rekord_geholt', 58, 'Eine zweite Bestmarke wechselt',
            {rekordId:'rm', kammer:'koennen'})
    ];
    for(let i = 0; i < 4; i++)
      l.push(basis('r-aus' + i, 'rekord_gesteigert', 40,
        'Eine Bestmarke waechst, Nummer ' + (i + 1), {rekordId:'ra' + i, kammer:'koennen'}));
    // Die spaeter dazukommende Zeile sortiert VOR allen anderen. Genau das
    // ist der Fall, der die Karte vorher ihre Identitaet verlieren liess:
    // der Schluessel war die alphabetisch erste Mitglieds-ID.
    if(ausbauten) l.push(basis('a-spaeter', 'rekord_gesteigert', 40,
      'Eine Bestmarke waechst spaeter', {rekordId:'rs', kammer:'koennen'}));
    _cache._consolFrom = null;
    const out = _consolidateStories(l);
    const k = out.filter(x => (x.dataRef||{}).type === 'sammel'
      && (x.dataRef||{}).quelle === 'tafel')[0] || null;
    if(!k) return null;
    const teile = k.dataRef.teile || [];
    const wert = _newsTafelWert(k) || {};
    const html = _newsCardHtmlM2(k, false, false);
    return {id:k.id, prio:k.prio, n:teile.length,
            reihe:teile.map(x => x.typ), marke:teile[0].marke || '',
            wertV:String(wert.v), wertL:wert.l || '',
            text:k.desc,
            zeilen:(html.split('nf-sam-z').length - 1),
            rest:/und (\\d+) weitere/.exec(html) ? /und (\\d+) weitere/.exec(html)[1] : ''};
  };
  return {vier: bau(0), fuenf: bau(1)};
})())`));
ok(_tafelOrd.vier && _tafelOrd.vier.n === 8,
   'ein gestellter Tafel-Moment traegt acht Spuren',
   _tafelOrd.vier ? String(_tafelOrd.vier.n) : 'keine Karte');
ok(_tafelOrd.vier && _tafelOrd.vier.reihe[0] === 'chronik_geholt'
   && _tafelOrd.vier.marke === 'in der Chronik',
   'zuerst steht der Monatseintrag, der wirklich in der Chronik landet',
   _tafelOrd.vier ? (_tafelOrd.vier.reihe[0] + ' / ' + _tafelOrd.vier.marke) : '');
ok(_tafelOrd.vier
   && _tafelOrd.vier.reihe.slice(0, 4).join(',')
      === 'chronik_geholt,rekord_geholt,chronik_geholt,rekord_geholt'
   && _tafelOrd.vier.reihe.slice(4).every(x => x === 'rekord_gesteigert'),
   'dann jeder Halterwechsel, und das Ausbauen zuletzt',
   _tafelOrd.vier ? _tafelOrd.vier.reihe.join(' ') : '');
ok(_tafelOrd.vier && _tafelOrd.vier.prio === 89,
   'die Karte bleibt im Band des Spieltags, statt ueber Breaking zu wachsen',
   _tafelOrd.vier ? String(_tafelOrd.vier.prio) : '');
ok(_tafelOrd.vier && _tafelOrd.vier.wertV === '4'
   && _tafelOrd.vier.wertL === 'Wechsel',
   'der grosse Wert zaehlt die Wechsel und nicht die Ausbauten',
   _tafelOrd.vier ? (_tafelOrd.vier.wertV + ' ' + _tafelOrd.vier.wertL) : '');
ok(_tafelOrd.vier && /[Zz]wei Bestmarken/.test(_tafelOrd.vier.text)
   && /vier Ausbauten/.test(_tafelOrd.vier.text),
   'und der Satz nennt Wechsel und Ausbauten getrennt',
   _tafelOrd.vier ? _tafelOrd.vier.text : '');
ok(_tafelOrd.vier && _tafelOrd.vier.zeilen === 4
   && _tafelOrd.vier.rest === '4',
   'auf der Karte stehen vier Zeilen, die Zahl fuehrt ins Blatt',
   _tafelOrd.vier ? (_tafelOrd.vier.zeilen + ' Zeilen, +' + _tafelOrd.vier.rest) : '');
ok(_tafelOrd.vier && _tafelOrd.fuenf
   && _tafelOrd.vier.id === _tafelOrd.fuenf.id,
   'und eine Zeile mehr ergibt dieselbe Karte, nicht eine neue',
   _tafelOrd.vier ? (_tafelOrd.vier.id + ' | ' + (_tafelOrd.fuenf||{}).id) : '');
// ── Breaking und die Pflichtkarte kosten keinen Tagesplatz ─────────
//    Beide waren vor dem Verdraengen geschuetzt, besetzten aber trotzdem
//    einen der Plaetze — und der Feed laesst sie ohnehin durch. Gemessen
//    gingen so am letzten Spieltag der Fixtures zwei von fuenf Plaetzen an
//    einen Countdown und den Spieler des Tages.
const _platz = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const t = tage[tage.length - 1];
  const p = _newsTagMs(t);
  const ms = i => mts(p[Math.min(i, p.length - 1)]) + i * 61000;
  // Je Karte ein eigener Typ, eine eigene Minute und ein eigener Spieler:
  // sonst buendelt die Minute sie, oder der Deckel je Sorte greift vorher.
  const gew = [
    {t:'giant_slayer', pr:74}, {t:'top_clash', pr:72}, {t:'streak_killer', pr:70},
    {t:'win_streak', pr:68}, {t:'loss_streak', pr:66}, {t:'top_form', pr:64}
  ].map((x, i) => ({id:'gew' + i, cat:'highlight', ic:'star', prio:x.pr,
    when:new Date(ms(i + 2)), title:'Gewoehnliche Karte ' + i,
    desc:'Ein Satz mit ' + (i + 1) + ' Zahl.',
    dataRef:{type:x.t, pid:players[i].id, playerIds:[players[i].id], streak:99}}));
  const brk = {id:'lead_day_platz', cat:'highlight', ic:'kingClass', prio:93,
    when:new Date(ms(0)), title:'Ein Spitzenwechsel', desc:'Mit 216 Elo oben.',
    dataRef:{type:'lead_change', newLeader:players[10].id, prevLeader:players[11].id,
             elo:216, gap:28, wechsel:1, playerIds:[players[10].id, players[11].id]}};
  const pflicht = {id:'potd_platz', cat:'highlight', ic:'medal', prio:88,
    when:new Date(ms(1)), title:'Ein Spieler des Tages', desc:'5 von 7 gewonnen.',
    dataRef:{type:'potd', pid:players[9].id, playerIds:[players[9].id], dayKey:t}};
  const lauf = l => { _cache._consolFrom = null;
    return _consolidateStories(l).filter(x => tagKey(x.when) === t); };
  const mit = lauf([brk, pflicht].concat(gew));
  const ohne = lauf(gew);
  const zahl = l => l.filter(x => String(x.id).indexOf('gew') === 0).length;
  return {mitGew: zahl(mit), ohneGew: zahl(ohne), mitAlle: mit.length,
          deckel: NEWS_LIMITS.proTag,
          brkDa: mit.some(x => x.id === 'lead_day_platz'),
          pflichtDa: mit.some(x => x.id === 'potd_platz')};
})())`));
ok(_platz.ohneGew === 6,
   'ein Tag ohne Breaking behaelt alle publizierten Karten',
   _platz.ohneGew + ' von ' + _platz.deckel);
ok(_platz.mitGew === 6,
   'Breaking und der Spieler des Tages verdraengen keine davon',
   _platz.mitGew + ' von ' + _platz.deckel);
ok(_platz.brkDa && _platz.pflichtDa && _platz.mitAlle === 8,
   'sie stehen trotzdem beide im Feed',
   _platz.mitAlle + ' Karten');
// ── Eine Serie je Spieler und Tag, auch im Feed ────────────────────
//    Der Generator bildet nur noch die hoechste Marke, aber persistierte
//    Zeilen aus aelteren Laeufen tragen die kuerzeren weiter. Gemessen stand
//    „Johannes zuendet die 7er-Serie" neben „2 Serien im Gleichschritt: Jane
//    & Johannes" und darunter „Jane zuendet die 5er-Serie": dieselbe laufende
//    Serie in drei Zeilen. Die Gruppe entsteht aus den Mitgliedern, also muss
//    die Grenze VOR der Gruppierung greifen.
const _serieEinmal = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const p = _newsTagMs(tage[tage.length - 1]);
  const A = players[0].id, B = players[1].id;
  // A reisst die 5er-Marke in der ersten und die 7er in der dritten Partie,
  // B die 5er ebenfalls in der dritten: die Gruppe entsteht aus Partie drei.
  const l = [
    {id:'ws-1', cat:'highlight', ic:'flame', when:new Date(mts(p[0])), prio:68,
     title:players[0].name + ' zündet die 5er-Serie',
     desc:'Fünf Siege in Folge. 1 Zahl.',
     dataRef:{type:'win_streak', pid:A, streak:5, matchId:p[0].id}},
    {id:'ws-2', cat:'highlight', ic:'flame', when:new Date(mts(p[2])), prio:71,
     title:players[0].name + ' zündet die 7er-Serie',
     desc:'Sieben Siege in Folge. 2 Zahlen.',
     dataRef:{type:'win_streak', pid:A, streak:7, matchId:p[2].id}},
    {id:'ws-3', cat:'highlight', ic:'flame', when:new Date(mts(p[2])), prio:68,
     title:players[1].name + ' zündet die 5er-Serie',
     desc:'Fünf Siege in Folge. 3 Zahlen.',
     dataRef:{type:'win_streak', pid:B, streak:5, matchId:p[2].id}}
  ];
  _cache._consolFrom = null;
  const out = _consolidateStories(l);
  // Wie oft steht A auf einer Serien-Meldung — als Karte oder als Zeile?
  let aMal = 0;
  out.forEach(s => {
    const d = s.dataRef || {};
    const zeilen = d.type === 'sammel' ? (d.teile || [])
      : [{typ:d.type, pids:(d.playerIds || []).concat(d.pid ? [d.pid] : [])}];
    zeilen.forEach(t => {
      if(t.typ !== 'win_streak' && t.typ !== 'group') return;
      const ids = (t.pids || []).length ? t.pids : [];
      if(ids.indexOf(A) >= 0) aMal++;
    });
  });
  const titel = [];
  out.forEach(s => {
    const d = s.dataRef || {};
    if(d.type === 'sammel') (d.teile || []).forEach(t => titel.push(t.titel));
    else titel.push(s.title);
  });
  const memberIds = out.flatMap(s => (s.dataRef || {}).memberIds || [s.id]);
  return {karten: out.length, aMal, titel, memberIds};
})())`));
ok(_serieEinmal.aMal === 2,
   'jede einmal publizierte Serienmarke des Spielers bleibt erhalten',
   _serieEinmal.aMal + ' Meldungen: ' + _serieEinmal.titel.join(' | '));
ok(_serieEinmal.memberIds.includes('ws-1') && _serieEinmal.memberIds.includes('ws-2'),
   'die fruehere Marke verschwindet nicht, wenn der Lauf spaeter waechst',
   _serieEinmal.memberIds.join(' | '));
// ── Die drei Befunde aus dem Nachlauf der echten Liga ──────────────
//    Der Generator laeuft bei jedem Laden, und was er bildet, wird
//    persistiert: die Datenbank traegt die VEREINIGUNG aller Zwischenstaende
//    eines Tages. Nachgespielt an den echten 538 Partien des 14. und 15.09.
//    fielen dabei drei Karten heraus, die stehen muessten.
const _nachlauf = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const tag = tage[tage.length - 1], vortag = tage[tage.length - 2];
  const p = _newsTagMs(tag);
  const basis = mts(p[0]);
  // (1) Breaking scheitert an keiner Sperre. Die Spitze wechselte zweimal
  //     hin und her: der Schluessel der Sperrfrist sortiert die Beteiligten,
  //     und damit tragen „A verdraengt B" und „B verdraengt A" dieselbe
  //     Aussage. Von drei Breaking-Karten blieb eine stehen.
  const wechsel = [
    {id:'lc-1', cat:'liga', ic:'crown', when:new Date(mts(_newsTagMs(vortag)[0])),
     prio:93, title:'Neuer Spitzenreiter: ' + players[1].name,
     desc:players[1].name + ' steht nach 1 Spiel an der Spitze.',
     dataRef:{type:'lead_change', newLeader:players[1].id, prevLeader:players[0].id,
              matchId:_newsTagMs(vortag)[0].id}},
    {id:'lc-2', cat:'liga', ic:'crown', when:new Date(basis), prio:93,
     title:'Neuer Spitzenreiter: ' + players[0].name,
     desc:players[0].name + ' steht nach 2 Spielen an der Spitze.',
     dataRef:{type:'lead_change', newLeader:players[0].id, prevLeader:players[1].id,
              matchId:p[0].id}}
  ];
  _cache._consolFrom = null;
  const beide = _consolidateStories(wechsel);
  // (2) Die Reservierung fuer eine Match-Geschichte gehoert einer Karte, die
  //     sie braucht. Breaking zaehlt nicht gegen den Deckel — nahm den
  //     Platz aber ein, und das Ergebnis des Tages fiel heraus.
  const l2 = [{id:'rv-brk', cat:'liga', ic:'crown', when:new Date(basis), prio:93,
    title:'Neuer Spitzenreiter', desc:'Die Spitze wechselt nach 1 Spiel.',
    dataRef:{type:'lead_change', newLeader:players[0].id, prevLeader:players[1].id,
             matchId:p[0].id}}];
  ['milestone_wins','milestone_goals','milestone_elo','jubilee','rivalry_milestone']
    .forEach((typ, i) => l2.push({id:'rv-s' + i, cat:'personal', ic:'medal',
      when:new Date(basis + i * 60000), prio:85 - i, title:'Starke Marke ' + i,
      desc:'Ein Satz mit ' + i + ' Zahlen.',
      dataRef:{type:typ, pid:players[i % 4].id, playerIds:[players[i % 4].id]}}));
  l2.push({id:'rv-erg', cat:'highlight', ic:'thriller',
    when:new Date(basis + 600000), prio:63, title:'Ein Ergebnis',
    desc:'Ein Satz mit 1 Zahl.',
    dataRef:{type:'spiel', resultKind:'krimi', matchId:p[1].id,
             playerIds:[players[0].id]}});
  _cache._consolFrom = null;
  const mitErg = _consolidateStories(l2);
  // (3) Der Deckel je Sorte behaelt die ERSTEN. Er entschied nach der Staerke, und
  //     damit hing das Ergebnis am ganzen Tag: die Karte, die am Vormittag im
  //     Feed stand, fiel am Nachmittag heraus, sobald eine staerkere derselben
  //     Sorte dazukam — gemessen schrieb ein Spieltag so nach fast jeder
  //     Partie eine seiner Meldungen um. Eine Nachricht gehoert ihrem
  //     Zeitpunkt. Die starke Karte steht hier deshalb ZULETZT: nach Staerke
  //     haette sie die beiden vom Morgen verdraengt.
  //     Genommen wird eine Sorte mit eigener Sache je Karte, damit nicht die
  //     Sperrfrist misst (sie fasst Karten ohne Sache zusammen), und
  //     dieselben zwei Gesichter auf allen vier, damit nicht die Regel
  //     „der Deckel darf niemanden verschwinden lassen" sie zurueckholt.
  const l3 = [];
  [[64, 0], [65, 1], [69, 2], [73, 3]].forEach(([pr, i]) => l3.push({
    id:'dk-' + pr, cat:'team', ic:'medal',
    when:new Date(basis + i * 3600000), prio:pr,
    title:'Auszeichnung mit ' + pr, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:'badge_unlocked', badgeId:'b' + i, rarity:'common',
             matchId:p[i % p.length].id,
             playerIds:[players[0].id, players[1].id]}}));
  _cache._consolFrom = null;
  const gedeckelt = _consolidateStories(l3)
    .filter(x => (x.dataRef || {}).type === 'badge_unlocked')
    .map(x => x.prio).sort((a, b) => b - a);
  return {wechsel: beide.filter(x => (x.dataRef||{}).type === 'lead_change').length,
          ergDrin: mitErg.some(x => x.id === 'rv-erg'),
          ergKarten: mitErg.length,
          gedeckelt};
})())`));
ok(_nachlauf.wechsel === 2,
   'zwei Breaking-Karten ueber denselben Wechsel in beide Richtungen bleiben beide',
   _nachlauf.wechsel + ' von 2');
ok(_nachlauf.ergDrin === true,
   'der reservierte Platz geht an eine Karte, die ihn braucht, nicht an Breaking',
   _nachlauf.ergDrin + ' bei ' + _nachlauf.ergKarten + ' Karten');
ok(_nachlauf.gedeckelt.length === 4 && _nachlauf.gedeckelt.join(',') === '73,69,65,64',
   'auch mehrere Karten derselben Sorte bleiben vollstaendig erhalten',
   _nachlauf.gedeckelt.join(', '));
ok(_tagmix.beides.length > 0,
   'es gibt Tage mit Nachrichten aus beiden Haelften', _tagmix.beides.join(', '));
ok(_tagmix.ohneSpieltag.length === 0,
   'und der Spieltag steht dort ebenso im Feed wie die Tafel',
   _tagmix.ohneSpieltag.join(', ') || 'keiner');
// Gemessen wird am sichtbaren INHALT: ein Buendel zaehlt mit seinen Zeilen.
// 20 bis 80 % ist die belastbare Auslegung von „gutes Mittel" fuer einen
// einzelnen Tag — darunter kommt eine Haelfte gar nicht vor, darueber liest
// sich der Tag wie nur eine von beiden.
ok(_tagmix.mischung.every(x => x.anteil >= 20 && x.anteil <= 80),
   'und beide Haelften halten sich an einem solchen Tag die Waage',
   _tagmix.mischung.map(x => x.tag + ': ' + x.anteil + ' % (' + x.t + '/' + x.sp + ')').join(' | '));

// ── Die ID einer Tafel-Meldung traegt ihren Spieltag ────────────────
//    Ohne ihn beschrieb dieselbe ID zwei Ereignisse: geht eine Chronik weg
//    und kommt an dieselben Leute zurueck, bildet der Generator dieselbe ID
//    erneut, die Datenbank behaelt den alten Zeitstempel und
//    `_newsTexteAuffrischen` uebernimmt den neuen `dataRef`. Gemessen trug
//    „Johannes holt ‚Der Beidfuessige'" den 24.08. und die Partie des 26.08.,
//    und der ganze Tafel-Moment des 24. wanderte in die Karte des 26.
const _tid = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const tafel = roh.filter(s => /^(rekord_|chronik_geholt|insignium_stufe)$|^rekord_/
    .test((s.dataRef||{}).type||'') || ['chronik_geholt','insignium_stufe']
    .indexOf((s.dataRef||{}).type) >= 0);
  const ohneTag = tafel.filter(s => String(s.id).indexOf(tagKey(s.when)) < 0);
  // Und die Partie, auf die eine Tafel-Karte zeigt, liegt an ihrem eigenen Tag.
  const fremdePartie = tafel.filter(s => {
    const mid = (s.dataRef||{}).matchId;
    if(!mid) return false;
    const m = matches.find(x => x.id === mid);
    return !m || tagKey(mts(m)) !== tagKey(s.when);
  }).map(s => s.title);
  return {n: tafel.length, ohneTag: ohneTag.map(s => s.id), fremdePartie};
})())`));
ok(_tid.n > 0, 'Tafel-Meldungen werden gebildet', _tid.n + ' Karten');
ok(_tid.ohneTag.length === 0, 'jede Tafel-Meldung traegt ihren Spieltag in der ID',
   _tid.ohneTag.slice(0, 2).join(', ') || 'alle');
ok(_tid.fremdePartie.length === 0,
   'und zeigt auf eine Partie ihres eigenen Tages',
   _tid.fremdePartie.slice(0, 2).join(' | ') || 'alle');


// ── Neu ist, was seit dem letzten Blick dazugekommen ist ────────────
//    Gezaehlt wurde, was nicht in der Liste der gelesenen IDs steht — und
//    das ist nicht dasselbe. Eine Karte faellt unter einen Deckel, eine
//    gleichlautende Schlagzeile verdraengt sie, eine Sperrfrist laeuft ab:
//    gemessen ueber fuenfundvierzig Tage trugen 81 von 267 neu auftauchenden
//    Karten (30 %) einen Zeitpunkt, der laenger zurueckliegt als alles, was
//    der Leser schon gesehen hat.
const _stand = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const feed = getStoriesCache();
  localStorage.removeItem(NEWS_LS_SEEN);
  localStorage.removeItem(NEWS_LS_STAND);
  const offenVorher = newsUnreadCount();
  _newsMarkAllSeen();
  const offenNachher = newsUnreadCount();
  const gesetzt = Number(localStorage.getItem(NEWS_LS_STAND)) || 0;
  const neuste = feed.reduce((mx, s) => Math.max(mx, new Date(s.when).getTime()), 0);
  // Eine Karte, die erst spaeter im Feed erscheint, aber aelter ist als der
  // Lesestand, gilt als gelesen — auch wenn ihre ID unbekannt ist.
  const alt = feed.length
    ? Object.assign({}, feed[feed.length - 1], {id: 'nie-gesehen'}) : null;
  const altGilt = alt ? _newsGelesen(alt, _newsLoadSeen(), gesetzt) : false;
  // Eine Karte NACH dem Lesestand ist neu.
  const frisch = feed.length
    ? Object.assign({}, feed[0], {id: 'ganz-neu', when: new Date(gesetzt + 60000)}) : null;
  const frischGilt = frisch ? _newsGelesen(frisch, _newsLoadSeen(), gesetzt) : true;
  localStorage.removeItem(NEWS_LS_SEEN);
  localStorage.removeItem(NEWS_LS_STAND);
  return {offenVorher, offenNachher, gesetzt, neuste, altGilt, frischGilt};
})())`));
ok(_stand.offenVorher > 0, 'ohne Lesestand ist jede Karte neu',
   _stand.offenVorher + ' offen');
ok(_stand.offenNachher === 0, 'nach „Alles gelesen" ist keine mehr offen',
   _stand.offenNachher + ' offen');
ok(_stand.gesetzt === _stand.neuste,
   'der Lesestand steht auf der neuesten Karte des Feeds',
   _stand.gesetzt + ' / ' + _stand.neuste);
ok(_stand.altGilt,
   'eine Karte, die spaeter mit altem Zeitpunkt auftaucht, gilt als gelesen');
ok(!_stand.frischGilt, 'eine Karte nach dem Lesestand gilt als neu');

// Die Ewige Tafel ist absichtlich eine rollende Tageskarte: ihre ID bleibt,
// waehrend ein spaeterer Wechsel als neue Zeile dazukommt. Gelesen wird ihre
// Fassung, nicht pauschal die ID des ganzen Tages.
const _tafelLesestand = JSON.parse(K.eval(`JSON.stringify((function(){
  localStorage.removeItem(NEWS_LS_SEEN);
  localStorage.removeItem(NEWS_LS_STAND);
  const t1 = new Date('2026-08-26T11:30:00Z').getTime();
  const t2 = new Date('2026-08-26T12:15:00Z').getTime();
  const alt = {id:'sammel_tafel_lesetest', when:new Date(t1),
    dataRef:{type:'sammel', quelle:'tafel', teile:[{id:'rek_alt', ms:t1}]}};
  _newsMarkSeen(alt);
  const altGelesen = _newsGelesen(alt, _newsLoadSeen(), _newsLesestand());
  const neu = {id:alt.id, when:new Date(t2),
    dataRef:{type:'sammel', quelle:'tafel', teile:[
      {id:'rek_alt', ms:t1}, {id:'rek_neu', ms:t2}
    ]}};
  const neuOffen = !_newsGelesen(neu, _newsLoadSeen(), _newsLesestand());
  _newsMarkSeen(neu);
  const neuGelesen = _newsGelesen(neu, _newsLoadSeen(), _newsLesestand());
  const normalAlt = {id:'normale_story', when:new Date(t1), dataRef:{type:'spiel'}};
  _newsMarkSeen(normalAlt);
  const normalNeu = Object.assign({}, normalAlt, {when:new Date(t2)});
  const normalBleibt = _newsGelesen(normalNeu, _newsLoadSeen(), _newsLesestand());
  localStorage.removeItem(NEWS_LS_SEEN);
  localStorage.removeItem(NEWS_LS_STAND);
  return {altGelesen, neuOffen, neuGelesen, normalBleibt};
})())`));
ok(_tafelLesestand.altGelesen,
   'die geoeffnete Fassung der Ewigen Tafel gilt als gelesen');
ok(_tafelLesestand.neuOffen,
   'eine spaeter aktualisierte Ewige Tafel wird wieder als neu markiert');
ok(_tafelLesestand.neuGelesen,
   'nach dem Oeffnen gilt genau die aktualisierte Tafel-Fassung als gelesen');
ok(_tafelLesestand.normalBleibt,
   'unveraenderliche Story-Snapshots behalten ihren Lesestand');

// ── Jeder Text sagt, was passiert ist ───────────────────────────────
//    Gemessen an allen Typen, die der Generator ueber vierzig Tage bildet.
console.log('\n═══ JEDER TEXT SAGT, WAS PASSIERT IST ═══');
const _worte = JSON.parse(K.eval(`JSON.stringify((function(){
  // Ueber mehrere Spieltage, nicht nur ueber heute: ein einziger Lauf trifft
  // von jedem Typ hoechstens einen Fall, und dann prueft die Zusicherung
  // genau den, der zufaellig gerade ansteht. Genommen wird jeder vierte
  // Spieltag der ganzen Ligageschichte — die letzten zwoelf allein trugen
  // zum Beispiel keinen Krimi, den das zweite Team gewonnen hat, und genau
  // dort stand die Reihenfolge der Tore falsch.
  const alleMatches = matches.slice();
  const alleTage = [...new Set(alleMatches.map(m => tagKey(mts(m))))].sort();
  const tage = alleTage.filter((_, i) => i % 4 === 0 || i >= alleTage.length - 3);
  const roh = [];
  const gesehen = new Set();
  tage.forEach(k => {
    const grenze = Math.max(...alleMatches.filter(m => tagKey(mts(m)) === k).map(mts));
    matches = alleMatches.filter(m => mts(m) <= grenze);
    invalidateCache();
    let l = [];
    try { l = _buildStories(); } catch(e){}
    l.forEach(x => { if(!gesehen.has(x.id)){ gesehen.add(x.id); roh.push(x); } });
  });
  matches = alleMatches;
  invalidateCache();
  // Das Ergebnis im Text gehoert dem Sieger. Unter „Leon schlaegt Julian im
  // Spitzenspiel" stand „9:10" — dieselbe Karte behauptete zwei Sieger.
  const ergebnisFalsch = [];
  roh.forEach(s => {
    const d = s.dataRef || {};
    const mid = d.matchId;
    if(!mid) return;
    if(['top_clash','giant_slayer','spiel'].indexOf(d.type) < 0) return;
    const m = matches.find(x => x.id === mid);
    if(!m) return;
    const hoch = Math.max(m.games_a, m.games_b), tief = Math.min(m.games_a, m.games_b);
    const gefunden = String(s.title || '').match(/(\\d{1,2})\\s?:\\s?(\\d{1,2})/)
      || String(s.desc || '').match(/(\\d{1,2})\\s?:\\s?(\\d{1,2})/);
    if(!gefunden) return;
    if(Number(gefunden[1]) !== hoch || Number(gefunden[2]) !== tief)
      ergebnisFalsch.push(s.title + ' → ' + gefunden[0]);
  });
  // ── Die Partie muss zu den Namen passen ──────────────────────────
  //    Tafel-Karten trugen die letzte Partie der DATENBANK, egal von wem sie
  //    erzaehlen. Gemessen zeigten 34 von 169 Karten der Probeliga ein
  //    Ergebnisband mit vier Wappen, unter denen kein genannter Spieler
  //    stand: ueber „Leo und Stefan bewegen die Ewige Tafel" stand
  //    „Jane/Johannes 10:8 Maxi/Henry". Ein einziger Generatorlauf traegt
  //    dafuer zu wenig — der Sweep ueber jeden vierten Spieltag trifft die
  //    Faelle, in denen die Halter an diesem Tag zuletzt nicht antraten.
  const mitMatch = roh.filter(s => (s.dataRef || {}).matchId);
  const fremdeNamen = mitMatch.filter(s => {
    const m = matches.find(x => x.id === (s.dataRef || {}).matchId);
    if(!m) return false;
    let ids = [];
    try { ids = _newsPids(s) || []; } catch(e){}
    if(!ids.length) return false;
    const vier = [m.a1, m.a2, m.b1, m.b2];
    return !ids.some(p => vier.indexOf(p) >= 0);
  }).map(s => ((s.dataRef || {}).type || '') + ': ' + s.title);
  // ── Eine Serie je Spieler und Tag, die laengste ───────────────────
  //    An einem Spieltag mit acht Partien fallen die 5er- UND die 7er-Marke
  //    desselben Spielers, und „Jonas zuendet die 5er-Serie" stand neben
  //    „Jonas zuendet die 7er-Serie": eine Nachricht und eine Wiederholung.
  //    Gemessen brachte die Probeliga danach keine einzige Serienkarte in
  //    den Feed — sie deckelten sich gegenseitig weg.
  const serienDoppelt = [];
  {
    const jeTag = new Map();
    roh.filter(x => (x.dataRef || {}).type === 'win_streak').forEach(x => {
      const k = (x.dataRef.pid || '') + '|' + tagKey(x.when);
      jeTag.set(k, (jeTag.get(k) || 0) + 1);
    });
    jeTag.forEach((n, k) => { if(n > 1) serienDoppelt.push(k + ': ' + n); });
  }
  // Der Text wiederholt die Schlagzeile nicht wortgleich.
  const echo = roh.filter(s => {
    const t = String(s.title || '').trim(), d = String(s.desc || '').trim();
    return t && d && (d === t || d.indexOf(t + '.') === 0);
  }).map(s => s.title);
  // Kein Etikett mit Doppelpunkt am Satzanfang („Saison-Endspurt: …").
  const etikett = roh.filter(s => /^[A-ZÄÖÜ][^.!?:]{2,24}:\\s/.test(String(s.desc || '')))
    .map(s => s.title + ' → ' + String(s.desc).slice(0, 40));
  // Und kein doppelter Punkt. „25.08." traegt seinen eigenen, und dahinter
  // stand der des Satzes: „Der letzte Sieg liegt vor dem 25.08.." Jede
  // abgekuerzte Angabe am Satzende hat dieses Problem.
  const punkte = roh.filter(s => /\\.\\./.test(String(s.desc || '').replace(/\\.\\.\\./g, '')))
    .map(s => String(s.desc).slice(-44));
  // Und kein englischer Kartentitel.
  // Gesucht sind durchgehend englische Aufschriften. „Player of the Week"
  // und „Player of the Day" sind die Namen, unter denen die Liga ihre
  // Wochen- und Tageswertung seit jeher fuehrt, und „Upset" gehoert zum
  // eigenen Wortschatz — beides bleibt.
  const englisch = roh.filter(s => /\\b(Giant Slayer|Losing Streak|Win Streak|Loser|Winner|New Record)\\b/
    .test(String(s.title || ''))).map(s => s.title);
  // Ein Satzfragment ohne Verb, allein hinter einem Punkt: „3 am Stueck."
  // Ein Satzfragment: der letzte Satz beginnt mit einer Zahl und traegt
  // hoechstens drei Woerter. „3 am Stueck." ist kein Satz.
  const fragment = roh.filter(s => {
    const teile = String(s.desc || '').split(/(?<=\\.)\\s+/).filter(Boolean);
    if(teile.length < 2) return false;
    const letzt = teile[teile.length - 1].replace(/\\.$/, '').trim();
    return /^\\d/.test(letzt) && letzt.split(/\\s+/).length <= 3;
  }).map(s => s.desc);
  // ── Niemand ist sein eigener Vorgaenger ──────────────────────────
  //    Der Rekord kannte nur „uebernimmt", auch wenn das Halterfeld bloss
  //    enger oder weiter geworden ist. Gemessen widersprachen sich vier
  //    Karten der Ligageschichte: „Leon uebernimmt ‚Der Aufschwung'. Vorher
  //    hielt Leon, Jannik und Stefan den Rekord" — Leon uebernahm von sich
  //    selbst, und aus drei Namen wurde ein „hielt". Und „Martin und Leo
  //    uebernehmen ‚Das Sonntagskind'. Vorher hielt Leo den Rekord mit 70 %"
  //    verkaufte Leos Rueckschritt auf 67 % als Uebergabe, obwohl Leo den
  //    Rekord weiter haelt [§C27]. Ein einziger Generatorlauf trifft keinen
  //    dieser Faelle — sie liegen auf fuenf verschiedenen Spieltagen.
  const selbstVorgaenger = [], falschesVerb = [];
  roh.forEach(s => {
    const d = s.dataRef || {};
    const typ = String(d.type || '');
    if(typ.indexOf('rekord_') !== 0 && typ !== 'chronik_geholt') return;
    const txt = String(s.desc || '');
    const i = txt.indexOf('Vorher');
    if(i < 0) return;
    const satz = txt.slice(i);
    // Gefragt wird nur der Satz über den Vorgänger: der nächste nennt die
    // Wirkung auf die Laufbahn, und dort steht der neue Halter zu Recht.
    const vorSatz = satz.split(/\.\s/)[0];
    (d.playerIds || []).forEach(pid => {
      const nm = pname(pid);
      // Auf Wortgrenzen geprueft: „Leo" steckt in „Leon", und ein reines
      // indexOf meldete damit Leo als seinen eigenen Vorgaenger, obwohl im
      // Satz Leon stand. Die Liga hat beide Namen.
      if(nm && new RegExp('(^|[^A-Za-zÄÖÜäöüß])' + nm
          + '($|[^A-Za-zÄÖÜäöüß])').test(vorSatz))
        selbstVorgaenger.push(s.title + ' || ' + vorSatz);
    });
    // Und das Verb zaehlt die Genannten: ein Name „hielt", mehrere „hielten".
    // Erst den ganzen Satz nehmen, dann die bekannten Enden abstreifen: mit
    // einer traegen Gruppe und einem optionalen Schwanz matchte das Muster
    // genau einen Buchstaben („Vorher hielten L").
    const v = /Vorher (hielt|hielten)(?: sie)? ([^.]+)\\./.exec(satz);
    if(v){
      const wen = v[2].replace(/ den Rekord mit .*$/, '').replace(/ auch$/, '');
      if((wen.indexOf(' und ') >= 0) !== (v[1] === 'hielten'))
        falschesVerb.push(s.title + ' || Vorher ' + v[1] + ' ' + wen);
    }
  });
  const mitVorgaenger = roh.filter(s => {
    const typ = String((s.dataRef || {}).type || '');
    return (typ.indexOf('rekord_') === 0 || typ === 'chronik_geholt')
      && String(s.desc || '').indexOf('Vorher') >= 0;
  }).length;
  return {n: roh.length, ergebnisFalsch, echo, etikett, englisch, fragment,
          punkte: punkte.slice(0, 4),
          mitMatch: mitMatch.length, fremdeNamen, serienDoppelt,
          mitVorgaenger, selbstVorgaenger:selbstVorgaenger.slice(0, 4),
          nSelbst:selbstVorgaenger.length,
          falschesVerb:falschesVerb.slice(0, 4), nVerb:falschesVerb.length,
          serien: roh.filter(x => (x.dataRef || {}).type === 'win_streak').length};
})())`));
ok(_worte.n > 0, 'der Generator bildet Texte', _worte.n + ' Karten');
ok(_worte.mitMatch > 0, 'Karten mit einer konkreten Partie werden gebildet',
   _worte.mitMatch + ' von ' + _worte.n);
ok(_worte.fremdeNamen.length === 0,
   'und jede zeigt eine Partie, in der ein genannter Spieler mitgespielt hat',
   _worte.fremdeNamen.slice(0, 3).join(' | ') || 'alle');
// ── Was eine Rekordkarte ans Storysystem weitergibt ────────────────
// Der Name des Rekords stand nur in der Schlagzeile, die Wechselart nur im
// Typ-Praefix, der VOLLE neue Halterstand nur gekuerzt in `playerIds` (drei
// Gesichter), der alte Wert und der Grundwert gar nicht. Wer eine Karte
// nachtraeglich lesen will — ein Blatt, eine Sammelzeile, eine Auffrischung
// — hat die Definition nicht mehr zur Hand: ein gestrichener Rekord steht
// gar nicht mehr im Katalog [§C35].
const _rekFelder = JSON.parse(K.eval(`JSON.stringify((function(){
  // Ueber jeden vierten Spieltag der Ligageschichte, nicht nur ueber heute:
  // ein einziger Lauf traegt drei Rekordkarten, und dann prueft die
  // Zusicherung genau die drei, die zufaellig gerade anstehen.
  const alleMatches = matches.slice();
  const alleTage = [...new Set(alleMatches.map(m => tagKey(mts(m))))].sort();
  const roh = [], gesehen = new Set();
  alleTage.filter((_, i) => i % 4 === 0 || i >= alleTage.length - 3).forEach(k => {
    const grenze = Math.max(...alleMatches.filter(m => tagKey(mts(m)) === k).map(mts));
    matches = alleMatches.filter(m => mts(m) <= grenze);
    invalidateCache();
    let l = [];
    try { l = _buildStories(); } catch(e){}
    l.forEach(x => { if(!gesehen.has(x.id)){ gesehen.add(x.id); roh.push(x); } });
  });
  matches = alleMatches;
  invalidateCache();
  const karten = roh.filter(s => String((s.dataRef || {}).type || '')
    .indexOf('rekord_') === 0);
  const PFLICHT = ['rekordId','rekordName','kammer','kammerLabel','fall',
                   'basis','halter','vorher','wert','matchId','causalKey'];
  const FAELLE = ['erstmals','uebernommen','dazu','allein','gesteigert'];
  const fehlt = [], falscherFall = [], ohneZeit = [], basisFalsch = [];
  karten.forEach(s => {
    const d = s.dataRef;
    PFLICHT.forEach(f => { if(d[f] === undefined) fehlt.push(d.rekordId + '.' + f); });
    if(FAELLE.indexOf(d.fall) < 0) falscherFall.push(d.rekordId + ': ' + d.fall);
    if(!s.when) ohneZeit.push(d.rekordId);
    const c = CHRONICLE_BY_ID[d.rekordId];
    if(c && d.basis !== c.basis) basisFalsch.push(d.rekordId);
  });
  // Und die neuen Liga-Rekorde [§C35] kommen im Feed ueberhaupt vor.
  // Ein neuer Eintrag kann still durchrutschen: er steht im Katalog, im
  // Rekorde-Reiter und in der Rangliste, und der Generator bildet trotzdem
  // keine Karte fuer ihn, weil ein Feld fehlt. Gezaehlt wird, wie viele
  // davon in diesem Lauf eine Karte haben. Der Lauf sieht nur jeden vierten
  // Spieltag; ein Rekord, der nur an einem anderen Tag wechselt, fiele
  // heraus, und dann gehoert er nicht in diese Liste.
  // Der Wiedereinstieg fehlt: seit eine Pause sechs Tage dauert, wechselt er
  // an den echten Partien nur an Tagen, die dieser Lauf nicht sieht. Die
  // weichen Knie fehlen, weil eine Schattenseite keine Rekordkarte bekommt.
  const NEU = ['damage_control','rollencoup','glanztag','kaltblut'];
  const neuGesehen = NEU.filter(id => karten.some(s => s.dataRef.rekordId === id));
  return {n:karten.length, fehlt:fehlt.slice(0, 6), falscherFall:falscherFall.slice(0, 3),
          ohneZeit:ohneZeit.slice(0, 3), basisFalsch:basisFalsch.slice(0, 3),
          neuGesehen, neuN:NEU.length,
          faelle:[...new Set(karten.map(s => s.dataRef.fall))].sort()};
})())`));
ok(_rekFelder.n > 40, 'der Generator bildet Rekordkarten', _rekFelder.n + '');
ok(_rekFelder.fehlt.length === 0,
   'jede Rekordkarte gibt ID, Name, Kammer, Wechselart, Grundwert, Halter, Vorgaenger, Wert und Partie weiter',
   _rekFelder.fehlt.join(', ') || _rekFelder.n + ' Karten');
ok(_rekFelder.falscherFall.length === 0,
   'die Wechselart ist eine der fuenf bekannten',
   _rekFelder.falscherFall.join(' · ') || _rekFelder.faelle.join('/'));
ok(_rekFelder.ohneZeit.length === 0, 'jede Rekordkarte traegt ihren Zeitpunkt',
   _rekFelder.ohneZeit.join(', ') || 'alle');
ok(_rekFelder.basisFalsch.length === 0,
   'der weitergegebene Grundwert ist der des Katalogs',
   _rekFelder.basisFalsch.join(', ') || 'alle');
// Alle vier sind der gemessene Stand. Die Schwelle steht auf dem gemessenen
// Wert und nicht darunter — jeder Rekord, der still uebersprungen wird,
// kostet genau einen.
ok(_rekFelder.neuGesehen.length === _rekFelder.neuN,
   'auch die neuen Liga-Rekorde bekommen ihre Karte',
   _rekFelder.neuGesehen.length + ' von ' + _rekFelder.neuN + ': '
   + _rekFelder.neuGesehen.join(', '));

ok(_worte.mitVorgaenger > 10, 'es gibt viele Tafel-Karten mit einem Vorgaenger',
   _worte.mitVorgaenger + ' von ' + _worte.n);
ok(_worte.nSelbst === 0, 'niemand steht als sein eigener Vorgaenger im Satz',
   _worte.selbstVorgaenger.join(' | ') || _worte.nSelbst + ' Treffer');
ok(_worte.nVerb === 0, 'das Verb im Vorgaenger-Satz zaehlt die Genannten',
   _worte.falschesVerb.join(' | ') || _worte.nVerb + ' falsch');
ok(_worte.serien > 0, 'Serienmarken werden gebildet', _worte.serien + ' Karten');
ok(_worte.serienDoppelt.length === 0,
   'und ein Spieler zuendet an einem Tag nur seine laengste Serie',
   _worte.serienDoppelt.slice(0, 3).join(' | ') || 'keine doppelt');
// Gebaut, nicht gehofft: die echten Partien tragen keinen Tag, an dem ein
// Spieler die 5er- UND die 7er-Marke reisst, und eine Zusicherung, die den
// Fall nie sieht, prueft nichts [§5]. Gebaut wird der haeufigste Verlauf: vier
// Siege am Tag davor, drei am Zieltag — dann fallen dort beide Marken.
// Der Held ist Jane: bei einem Vielspieler faengt schon der Nebenrollen-
// Deckel des Generators die zweite Karte ab, und dann messen wir ihn und
// nicht die Regel.
const _serieTag = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const basis = mts(alle[alle.length - 1]);
  const held = (players.find(p => p.name === 'Jane') || players[0]).id;
  const rest = players.filter(p => p.id !== held).slice(0, 3).map(p => p.id);
  const dazu = [];
  const vor = basis - 20 * 3600000;
  // Tag davor: erst eine Niederlage, damit der Lauf bei null beginnt,
  // dann vier Siege (Marke 3). Zieltag: drei Siege, also die Marke 5 — und
  // mit der achten waere es die 8er; gemessen wird, dass der Tag nur EINE
  // Karte traegt und die laengste seiner Marken.
  const bau = (praefix, ab, n, ersteVerloren) => {
    for(let i = 0; i < n; i++) dazu.push({
      id: praefix + i, a1:held, a2:rest[0], b1:rest[1], b2:rest[2],
      a1_side:'drive', a2_side:'reves', b1_side:'drive', b2_side:'reves',
      games_a: (ersteVerloren && i === 0) ? 7 : 10,
      games_b: (ersteVerloren && i === 0) ? 10 : 7,
      winner: (ersteVerloren && i === 0) ? 'B' : 'A', exp_a: 0.5,
      created_at: new Date(ab + i * 300000).toISOString(), deltas:{}
    });
  };
  bau('sv', vor, 5, true);
  bau('sn', basis + 300000, 3, false);
  matches = alle.concat(dazu);
  invalidateCache();
  let l = [];
  try { l = _buildStories(); } catch(e){}
  const mein = l.filter(x => (x.dataRef || {}).type === 'win_streak'
    && x.dataRef.pid === held && tagKey(x.when) === tagKey(basis));
  matches = alle;
  invalidateCache();
  return {n: mein.length, marken: mein.map(x => x.dataRef.streak)};
})())`));
ok(_serieTag.n === 1,
   'und zwei Marken an einem Tag ergeben eine Karte, nicht zwei',
   _serieTag.n + ' Karten (' + _serieTag.marken.join(', ') + ')');
ok(_serieTag.marken[0] === 5,
   'und zwar die laengste Marke des Tages',
   String(_serieTag.marken[0]));

// ── Die Leiter der Marken und der Lauf als Einheit [§C33] ─────────────
// Sie stand bei 5, 7, 10, 15, 20. Drei Siege in Folge sind das, was die
// meisten ueberhaupt erreichen — dieselbe Schwelle, bei der am Wappen das
// Feuer angeht [§C26] —, und sieben und zehn lagen dicht beieinander.
// Gemessen ueber die 19 Spieltage vom 28.07. bis 26.08.: vorher acht
// gebildete und fuenf gezeigte Serienkarten, jetzt siebzehn und neun.
const _serienLauf = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const tage = [...new Set(alle.map(m => tagKey(mts(m))))].sort()
    .filter(t => t >= '2026-07-28' && t <= '2026-08-26');
  const erlaubt = n => [3,5,8,10].indexOf(n) >= 0 || (n > 10 && n % 5 === 0);
  let roh = 0, gezeigt = 0, falsch = [], doppeltMarke = 0, doppeltLauf = 0;
  const gesehen = {};
  tage.forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let r = []; try { r = _buildStories() || []; } catch(e){ return; }
    const ws = r.filter(x => (x.dataRef||{}).type === 'win_streak');
    roh += ws.length;
    const jeMarke = {};
    ws.forEach(x => {
      const n = Number(x.dataRef.streak) || 0;
      gesehen[n] = 1;
      if(!erlaubt(n)) falsch.push(n);
      const k = x.dataRef.pid + '|' + n;
      jeMarke[k] = (jeMarke[k]||0) + 1;
    });
    doppeltMarke += Object.keys(jeMarke).filter(k => jeMarke[k] > 1).length;
    let f = []; try { f = _consolidateStories(r) || []; } catch(e){}
    const g = f.filter(x => (x.dataRef||{}).type === 'win_streak');
    gezeigt += g.length;
    const jeLauf = {};
    g.forEach(x => { const k = x.dataRef.lauf || '?'; jeLauf[k] = (jeLauf[k]||0) + 1; });
    doppeltLauf += Object.keys(jeLauf).filter(k => jeLauf[k] > 1).length;
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {roh, gezeigt, falsch:[...new Set(falsch)],
    marken:Object.keys(gesehen).map(Number).sort((a,b)=>a-b),
    doppeltMarke, doppeltLauf};
})())`));
console.log('  Serienkarten im Durchlauf: ' + _serienLauf.roh + ' gebildet, '
  + _serienLauf.gezeigt + ' gezeigt · Marken: ' + _serienLauf.marken.join(', '));
ok(_serienLauf.falsch.length === 0, 'jede Serienmarke steht auf der Leiter',
   _serienLauf.falsch.join(', ') || 'keine daneben');
ok(_serienLauf.marken.indexOf(3) >= 0 && _serienLauf.marken.indexOf(8) >= 0,
   'die Leiter beginnt bei drei und kennt die acht',
   _serienLauf.marken.join(', '));
ok(_serienLauf.doppeltMarke === 0, 'dieselbe Marke steht je Spieler nur einmal im Fenster',
   _serienLauf.doppeltMarke + ' doppelt');
ok(_serienLauf.doppeltLauf === 0, 'und von einem Lauf steht nur die laengste Marke im Feed',
   _serienLauf.doppeltLauf + ' Laeufe mit zwei Karten');

// ── Der Serien-Rekord der Liga ab fuenf ───────────────────────────────
// Mit sechs blieb er einer jungen Liga verschlossen: sie erreicht die fuenf,
// bevor sie die sechs erreicht, und genau dann ist die laengste Serie ihrer
// Geschichte eine Nachricht. Im Fenster der Fixtures steht der Bestwert bei
// dreizehn und liegt Monate zurueck, also wird die Schwelle selbst gemessen.
const _recSchwelle = JSON.parse(K.eval(`JSON.stringify((function(){
  const orig = _allTimeRecords;
  const letzte = matches[matches.length - 1];
  const bau = val => ({eloRec:null, streakRec:{val, pid:players[0].id,
    matchId:letzte.id, when:letzte.created_at}});
  const zaehl = () => {
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    return _buildStories().filter(s => (s.dataRef||{}).type === 'streak_record').length;
  };
  try {
    _allTimeRecords = () => bau(5); const fuenf = zaehl();
    _allTimeRecords = () => bau(4); const vier = zaehl();
    return {fuenf, vier};
  } finally {
    _allTimeRecords = orig;
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(_recSchwelle.fuenf === 1 && _recSchwelle.vier === 0,
   'der Serien-Rekord der Liga wird ab fuenf Siegen gemeldet',
   JSON.stringify(_recSchwelle));
// ── Der Formlauf gehoert seiner Partie, nicht dem heutigen Stand ─────
// Gerechnet wurde der Stand NACH der letzten Partie der Liga, und ein Filter
// nahm die Karte weg, sobald der Vorsprung wieder unter die Schwelle fiel.
// Damit verschwand eine Karte, die zu ihrem Zeitpunkt richtig war — und im
// Lauf desselben Spieltags verschiebt sich das Fenster schon so weit, dass die
// eigene Karte vom Mittag als veraltet galt: gemessen wurden acht gebildet und
// keine einzige gezeigt. Der Uebertritt ueber die Schwelle haengt jetzt an der
// Partie, mit der er passierte, und bleibt damit stehen.
const _form = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const basis = mts(alle[alle.length - 1]);
  // Henry: er hat im Fenster nicht gespielt, sein Vorsprung steht also klar
  // unter der Schwelle, bis die gestellten Siege kommen.
  const held = (players.find(p => p.name === 'Henry') || players[0]).id;
  const rest = players.filter(p => p.id !== held).slice(0, 3).map(p => p.id);
  const bau = (praefix, ab, n, gewinnt) => {
    const out = [];
    for(let i = 0; i < n; i++) out.push({
      id: praefix + i, a1:held, a2:rest[0], b1:rest[1], b2:rest[2],
      a1_side:'drive', a2_side:'reves', b1_side:'drive', b2_side:'reves',
      games_a: gewinnt ? 10 : 6, games_b: gewinnt ? 6 : 10,
      winner: gewinnt ? 'A' : 'B', exp_a: 0.5,
      created_at: new Date(ab + i * 300000).toISOString(), deltas:{}
    });
    return out;
  };
  const hoch = bau('fh', basis + 300000, FORM_FENSTER, true);
  const tief = bau('ft', basis + (FORM_FENSTER + 1) * 300000, FORM_FENSTER, false);
  // Die Karte vom Vormittag, wie sie der Generator baut und die Datenbank sie
  // am Abend liefert: der Uebertritt haengt an seiner Partie.
  const frueh = {
    id:'top_form_' + held + '_' + hoch[FORM_FENSTER - 1].id,
    cat:'highlight', ic:'flame',
    title:'Formlauf', desc:'Zehn von zehn Partien gewonnen.',
    when:new Date(basis + FORM_FENSTER * 300000).toISOString(),
    prio:STORY_PRIO.top_form,
    dataRef:{type:'top_form', pid:held, matchId:hoch[FORM_FENSTER - 1].id,
             qJetzt:100, qBasis:39, vorsprung:61}
  };
  matches = alle.concat(hoch, tief);
  invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  // Der Vorsprung von jetzt, hier selbst gerechnet: die App kennt ihn nicht
  // mehr, seit die Karte an ihrer Partie haengt.
  const eigene = matches.filter(m => [m.a1,m.a2,m.b1,m.b2].indexOf(held) >= 0)
    .sort((x, y) => mts(x) - mts(y));
  const fenster = eigene.slice(-FORM_FENSTER);
  const davor = eigene.slice(0, -FORM_FENSTER);
  const vor = fenster.filter(m => won(held, m)).length / FORM_FENSTER
            - davor.filter(m => won(held, m)).length / davor.length;
  _cache._consolFrom = null;
  const durch = _consolidateStories([frueh]).length;
  const erg = {vor, durch, schwelle: FORM_VORSPRUNG};
  matches = alle;
  invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return erg;
})())`));
ok(_form.vor < _form.schwelle,
   'nach zehn Niederlagen steht der Vorsprung auf den eigenen Schnitt nicht mehr',
   Math.round(_form.vor * 100) + ' gegen ' + Math.round(_form.schwelle * 100) + ' Punkte');
ok(_form.durch === 1, 'die Karte vom Vormittag bleibt trotzdem im Feed',
   String(_form.durch));

// ── Breaking scheitert auch nicht an der gleichen Schlagzeile ────────
// Die Tabellenspitze wechselte am 14.09. zu Martin und am 15.09. zurueck zu
// Maxi. Beide Karten heissen „Maxi uebernimmt die Tabellenspitze", also fiel
// die vom 14. weg: der Tag, an dem er sie uebernahm, hatte danach keine
// Breaking-Karte mehr. Zwei Wechsel sind zwei Ereignisse [§C33].
const _brkTitel = JSON.parse(K.eval(`JSON.stringify((function(){
  const t0 = mts(matches[matches.length - 1]);
  const bau = (n, tag) => ({
    id:'lead_day_' + n, cat:'highlight', ic:'crown',
    title:'Maxi übernimmt die Tabellenspitze',
    desc:'Die Spitze wechselt, Nummer ' + n + '.',
    when:new Date(t0 - tag * 864e5).toISOString(), prio:93,
    dataRef:{type:'lead_change', pid:players[10].id, playerIds:[players[10].id]}
  });
  // Je Tag noch eine zweite Karte: bleibt fuer einen Spieltag sonst nichts
  // uebrig, holt die Rueckholung die verworfene zurueck [§C33], und die
  // Gegenprobe waere damit immer gruen.
  // Der Fueller braucht je Tag eine eigene Aussage: zwei Ergebniskarten ohne
  // Sache teilen einen Sperrschluessel, und dann faellt der Fueller des
  // aelteren Tages weg — der Tag ist wieder leer, und die Rueckholung greift.
  const fuell = tag => ({
    id:'badge_unlocked_f' + tag, cat:'badge', ic:'trophy',
    title:'Eine Auszeichnung am Tag ' + tag, desc:'Zum ' + (tag + 1) + '. Mal geholt.',
    when:new Date(t0 - tag * 864e5).toISOString(), prio:54,
    dataRef:{type:'badge_unlocked', pid:players[tag].id, playerIds:[players[tag].id],
             badgeId:'f' + tag}
  });
  const zwei = _consolidateStories([bau(2, 0), fuell(0), bau(1, 1), fuell(1)])
    .filter(x => (x.dataRef || {}).type === 'lead_change');
  // Gegenprobe: dieselbe Schlagzeile ohne Breaking bleibt eine Karte.
  const ohne = _consolidateStories([2, 1].map(n => {
    const s = bau(n, n === 2 ? 0 : 1);
    s.id = 'elo_swing_' + n; s.prio = 38;
    s.dataRef = {type:'elo_swing', pid:players[10].id, playerIds:[players[10].id]};
    return s;
  }).concat([fuell(0), fuell(1)])).filter(x => (x.dataRef || {}).type === 'elo_swing');
  return {brk:zwei.length, normal:ohne.length,
          istBrk:zwei.length ? !!_isBreaking(zwei[0]) : false};
})())`));
ok(_brkTitel.istBrk, 'der Spitzenwechsel ist Breaking', String(_brkTitel.istBrk));
ok(_brkTitel.brk === 2, 'zwei Wechsel mit derselben Schlagzeile bleiben zwei Karten',
   String(_brkTitel.brk));
ok(_brkTitel.normal === 2, 'auch ohne Breaking bleiben verschiedene Ereignisse mit gleicher Schlagzeile stehen',
   String(_brkTitel.normal));

// ── Und der Wechsel nennt eine Zahl ─────────────────────────────────
// „X steht nach dem letzten Spiel an der Spitze. Y war vorher dort." nannte
// keine und war damit an jedem Wechsel derselbe Satz. Am 14.09. wechselte
// die Spitze zweimal und am 15.09. erneut; zwei der drei Karten trugen Wort
// fuer Wort denselben Text, und der Doublettenfilter warf die aeltere weg.
// Gebaut, nicht gehofft: der Zweite schlaegt den Ersten so lange, bis er
// vorn ist. Gebaut wird an einem eigenen Tag nach der letzten echten
// Partie, ab 6 Uhr im Minutentakt: am 26.08. wechselt die Spitze auch in
// den echten Partien, seit der Positionsbonus gegen die eigene Aufteilung
// misst [§C44], und ein gebauter Tag dort zaehlte drei Wechsel statt zwei.
const _fw = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const letzte = new Date(mts(alle[alle.length - 1]));
  const basis = new Date(letzte.getFullYear(), letzte.getMonth(), letzte.getDate() + 1, 6).getTime();
  const sim = getGlobalSim();
  const rang = Object.keys(sim.elo || {})
    .filter(pid => pmap()[pid] && !pmap()[pid].hidden)
    .map(pid => ({pid, elo:sim.elo[pid]}))
    .sort((a, b) => b.elo - a.elo);
  const erster = rang[0].pid, zweiter = rang[1].pid;
  const rest = rang.slice(2, 4).map(x => x.pid);
  // Die Elo kommt aus den persistierten Deltas der Partie, nicht aus einer
  // Rechnung ueber das Ergebnis: ohne sie bewegt sich die Tabelle nicht, und
  // das Szenario waere immer gruen.
  const d = {};
  d[zweiter] = 12; d[rest[0]] = 12; d[erster] = -12; d[rest[1]] = -12;
  const partie = i => ({
    id:'fw' + i, a1:zweiter, a2:rest[0], b1:erster, b2:rest[1],
    a1_side:'drive', a2_side:'reves', b1_side:'drive', b2_side:'reves',
    games_a:10, games_b:2, winner:'A', exp_a:0.5,
    created_at:new Date(basis + (i + 1) * 60000).toISOString(),
    deltas:Object.assign({}, d)
  });
  // Und dieselbe Partie mit umgekehrten Vorzeichen: damit holt der alte
  // Erste die Spitze am selben Tag zurueck, und der Tag traegt zwei Wechsel.
  const zurueckPartie = i => ({
    id:'fz' + i, a1:erster, a2:rest[1], b1:zweiter, b2:rest[0],
    a1_side:'drive', a2_side:'reves', b1_side:'drive', b2_side:'reves',
    games_a:10, games_b:2, winner:'A', exp_a:0.5,
    created_at:new Date(basis + (i + 1) * 60000).toISOString(),
    deltas:{[erster]:12, [rest[1]]:12, [zweiter]:-12, [rest[0]]:-12}
  });
  // Die Karte entsteht nur, wenn die LETZTE Partie den Wechsel ausgeloest
  // hat: sie vergleicht den Stand von jetzt mit dem Rang vor diesem Spiel.
  // Angehaengt wird deshalb eine Partie nach der anderen, bis es kippt —
  // vierzig auf einmal lassen den Wechsel in der Mitte passieren, und am
  // Ende steht der neue Erste schon vor dem letzten Spiel oben.
  let fw = [], l = [];
  const dazu = [];
  for(let i = 0; i < 60; i++){
    dazu.push(partie(i));
    matches = alle.concat(dazu);
    invalidateCache();
    try { l = _buildStories(); } catch(e){ l = []; }
    fw = l.filter(x => (x.dataRef || {}).type === 'lead_change');
    if(fw.length) break;
  }
  // Phase zwei: weiter anhaengen, bis der alte Erste wieder oben steht.
  let fz = [];
  const dazu2 = dazu.slice();
  for(let i = dazu.length; i < 90; i++){
    dazu2.push(zurueckPartie(i));
    matches = alle.concat(dazu2);
    invalidateCache();
    let l2 = [];
    try { l2 = _buildStories(); } catch(e){ l2 = []; }
    const k = l2.filter(x => (x.dataRef || {}).type === 'lead_change');
    if(k.length && k[0].dataRef.newLeader === erster){ fz = k; break; }
  }
  const erg = { n:fw.length, texte:fw.map(x => x.desc), titel:fw.map(x => x.title),
    // Zwei Wechsel an einem Tag: die Karte nennt den DIREKTEN Vorgaenger
    // (nie sich selbst), sagt, dass die Spitze zurueckgeholt wurde, und
    // zaehlt die Wechsel.
    zw: fz.length ? {
      n: fz.length,
      titel: fz[0].title,
      text: fz[0].desc,
      held: _breakingHeroText(fz[0]),
      wechsel: fz[0].dataRef.wechsel,
      eigenerVor: fz[0].dataRef.prevLeader === fz[0].dataRef.newLeader,
      zurueck: fz[0].dataRef.zurueck === true
    } : null,
    ohneZahl: fw.filter(x => !/\\d/.test(String(x.desc))).map(x => x.desc),
    floskel:  fw.filter(x => /nach dem letzten Spiel/.test(String(x.desc))).length,
    // Das Ergebnis der entscheidenden Partie steht als Band ueber dem Text.
    // Es stand zusaetzlich in der Schlagzeile UND im ersten Satz: „Stefan
    // und Julian gewinnen 10:7. Martin fuehrt die Tabelle", und darunter
    // dasselbe noch einmal.
    standImTitel: fw.filter(x => /\\d+:\\d+/.test(String(x.title))).map(x => x.title),
    standImText:  fw.filter(x => /\\d+:\\d+/.test(String(x.desc))).map(x => x.desc),
    // Ein Wechsel hat zwei verschiedene Seiten. Genannt war, wer am Morgen
    // oben stand — bei A → B → A war A damit sein eigener Vorgaenger.
    eigenerVor: fw.filter(x => x.dataRef.prevLeader === x.dataRef.newLeader).length,
    vorImText:  fw.filter(x => String(x.desc).indexOf('Vorher stand dort') < 0).length,
    held:       fw.map(x => _breakingHeroText(x)),
    heldOhneZahl: fw.filter(x => !/\\d/.test(String(_breakingHeroText(x)))).length,
    heldEtikett:  fw.filter(x => /^[A-ZÄÖÜ][^.!?]*:/.test(String(_breakingHeroText(x)))).length,
    neuer:    fw.length ? (fw[0].dataRef.newLeader === zweiter) : false };
  matches = alle;
  invalidateCache();
  return erg;
})())`));
ok(_fw.n > 0, 'ein Fuehrungswechsel wird gebildet', String(_fw.n));
ok(_fw.neuer, 'und nennt den neuen Ersten', String(_fw.neuer));
ok(_fw.ohneZahl.length === 0, 'die Karte nennt den Elo-Stand der Spitze',
   _fw.ohneZahl[0] || (_fw.texte[0] || '').slice(0, 90));
ok(_fw.floskel === 0, 'statt „nach dem letzten Spiel" ohne jede Zahl',
   String(_fw.floskel));
ok(_fw.standImTitel.length === 0 && _fw.standImText.length === 0,
   'und wiederholt nicht das Ergebnis, das ihr Band schon zeigt',
   (_fw.standImTitel[0] || _fw.standImText[0] || 'keins'));
ok(_fw.eigenerVor === 0 && _fw.vorImText === 0,
   'der Vorgaenger steht im Satz',
   _fw.eigenerVor + ' / ' + _fw.vorImText);
ok(_fw.zw && _fw.zw.n === 1 && _fw.zw.wechsel === 2,
   'zwei Wechsel an einem Tag ergeben EINE Karte mit beiden',
   _fw.zw ? (_fw.zw.n + ' Karten, ' + _fw.zw.wechsel + ' Wechsel') : 'kein Rueckwechsel');
ok(_fw.zw && _fw.zw.eigenerVor === false,
   'und ihr Vorgaenger ist nie der neue Erste selbst',
   String(_fw.zw && _fw.zw.eigenerVor));
ok(_fw.zw && _fw.zw.zurueck === true && /zurück/.test(_fw.zw.titel),
   'die Schlagzeile sagt, dass die Spitze zurueckgeholt wurde',
   (_fw.zw || {}).titel);
ok(_fw.zw && /zweimal/.test(_fw.zw.text) && /zurück/.test(_fw.zw.held),
   'Satz und Breaking-Nachsatz sagen es auch',
   (_fw.zw || {}).text + ' | ' + (_fw.zw || {}).held);
ok(_fw.heldOhneZahl === 0 && _fw.heldEtikett === 0,
   'der Breaking-Nachsatz nennt eine Zahl und kein Etikett mit Doppelpunkt',
   (_fw.held[0] || '').slice(0, 110));

ok(_worte.ergebnisFalsch.length === 0,
   'das Ergebnis im Text gehoert dem Sieger',
   _worte.ergebnisFalsch.slice(0, 2).join(' | ') || 'alle');
ok(_worte.echo.length === 0, 'kein Text wiederholt nur seine Schlagzeile',
   _worte.echo.slice(0, 2).join(' | ') || 'keiner');
ok((_worte.punkte || []).length === 0, 'kein Satz endet auf zwei Punkten',
   (_worte.punkte || []).join(' | ') || 'keiner');
ok(_worte.etikett.length === 0, 'kein Etikett mit Doppelpunkt am Satzanfang',
   _worte.etikett.slice(0, 2).join(' | ') || 'keins');
ok(_worte.englisch.length === 0, 'keine englische Schlagzeile',
   _worte.englisch.slice(0, 2).join(' | ') || 'keine');
ok(_worte.fragment.length === 0, 'kein Satzfragment als letzter Satz',
   _worte.fragment.slice(0, 2).join(' | ') || 'keins');

console.log('=== JEDE ZEILE HAT IHRE ZEIT, DIE WIRKUNG STEHT EINMAL ===');
// Im Blatt eines Tafel-Moments stand eine Liste ohne jeden Zeitbezug,
// obwohl ein Moment mehrere Partien umfasst. Und die Punktewirkung stand
// gar nicht darin: sie ist je Spieler EINE Zahl, egal aus welcher Zeile sie
// kommt — beide Staende gehoeren dem Spieltag [§11.0e]. Je Zeile gezeigt
// waere dieselbe Rechnung neunmal untereinander.
const _wirk = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories() || [];
  _cache._consolFrom = null;
  const feed = _consolidateStories(roh.slice()) || [];
  const sam = feed.filter(s => (s.dataRef || {}).quelle === 'tafel')[0]
           || feed.filter(s => (s.dataRef || {}).type === 'sammel')[0];
  if(!sam) return {n:0};
  const d = sam.dataRef, teile = d.teile || [];
  const m = String(_newsDetailMitte(sam) || '');
  const uhr = t => new Date(t.ms).toLocaleTimeString('de-DE',
    {hour:'2-digit', minute:'2-digit'});
  const standVon = t => {
    const p = (matches || []).find(x => x.id === t.matchId);
    if(!p) return '';
    return p.winner === 'A' ? p.games_a + ':' + p.games_b
                            : p.games_b + ':' + p.games_a;
  };
  const eigene = teile.filter(t => t.matchId && t.matchId !== d.matchId);
  const wPos = m.indexOf('Wirkung auf das Insignium');
  const spieler = {};
  teile.forEach(t => Object.keys(t.lb || {}).forEach(pid => { spieler[pid] = 1; }));
  return {n:teile.length,
    zeiten:teile.filter(t => t.ms && m.indexOf(uhr(t)) >= 0).length,
    eigene:eigene.length,
    staende:eigene.filter(t => { const v = standVon(t); return v && m.indexOf(v) >= 0; }).length,
    abschnitte:(m.match(/Wirkung auf die Laufbahn/g) || []).length,
    reihen: (m.match(/class="nd-wk( [^"]*)?"/g) || []).length,
    // Der Balken zeigt die Strecke zur naechsten Schwelle, und darin heller,
    // was der Spieltag dazugelegt hat: zwei Segmente je Zeile.
    balken: (m.match(/class="nd-wk-b"/g) || []).length,
    zuwachs: (m.match(/class="nd-wk-d/g) || []).length,
    spieler:Object.keys(spieler).length};
})())`));
ok(_wirk.n > 1, 'eine Sammelkarte mit mehreren Zeilen steht im Feed', String(_wirk.n));
ok(_wirk.zeiten === _wirk.n, 'jede Zeile im Blatt nennt ihre eigene Uhrzeit',
   _wirk.zeiten + ' von ' + _wirk.n);
ok(_wirk.eigene === 0 || _wirk.staende === _wirk.eigene,
   'und ihr eigenes Ergebnis, wo es ein anderes ist als oben',
   _wirk.staende + ' von ' + _wirk.eigene);
ok(_wirk.abschnitte === 1 && _wirk.reihen === _wirk.spieler && _wirk.spieler > 0,
   'die Punktewirkung steht in einem Abschnitt, einmal je Spieler',
   _wirk.abschnitte + ' Abschnitt, ' + _wirk.reihen + ' Zeilen für '
   + _wirk.spieler + ' Spieler');
// „1205 → 1240 Prestige" sind zwei Zahlen, die man erst verrechnen muss, und
// bei neun Zeilen darueber weiss niemand mehr, was ausschlaggebend war. Jede
// Zeile traegt deshalb den Balken zur naechsten Schwelle und den Zuwachs.
ok(_wirk.balken === _wirk.reihen && _wirk.zuwachs === _wirk.reihen,
   'und jede Zeile zeigt den Weg zur naechsten Schwelle und den Zuwachs',
   _wirk.balken + ' Balken, ' + _wirk.zuwachs + ' Zuwaechse');

console.log('=== ERST ZEICHNEN, DANN RECHNEN ===');
// `loadAll` ruft den Abgleich direkt nach `render()`. Lief der Generator
// darin sofort, stand die neue Rangliste erst nach seinen rund 370 ms auf dem
// Bildschirm. Gefragt wird, ob er im selben Aufruf schon gelaufen ist.
const _sofort = K.eval(`(function(){
  let n = 0; const alt = _buildStories;
  _buildStories = function(){ n++; return alt.apply(this, arguments); };
  const vorher = _cache._stories;
  _cache._stories = [{id:'probe', when:new Date(), dataRef:{}}];
  const p = syncStoriesViaDb(); if(p && p.catch) p.catch(() => {});
  const sofort = n;
  _buildStories = alt; _cache._stories = vorher;
  return sofort;
})()`);
ok(_sofort === 0, 'der News-Generator wartet auf einen ruhigen Moment nach dem Zeichnen',
   _sofort + ' Laeufe im selben Aufruf');

console.log('=== DIE STUFE KOMMT AUS DEN PUNKTEN ===');
// Leon stand im Blatt mit 2687 Prestige als Volutenkranz und „noch 0 bis
// zum Zierkranz": die Stufe kam als Zahl aus der Datenbank und gehoerte einer
// aelteren Leiter. Die Punkte sind die Beobachtung, die Stufe eine Ableitung.
// Gespeichert wird hier absichtlich die falsche Stufe.
const _wkStufe = JSON.parse(K.eval(`JSON.stringify((function(){
  const pid = players[0].id, je = {};
  const p = INSIGNIEN[3].min + 120;
  je[pid] = {vor:p - 40, nach:p, stufeVor:1, stufeNach:1};
  const h = _ndWirkungBlock(je);
  return {h, name:INSIGNIEN[3].name, next:INSIGNIEN[4].name,
          rest:INSIGNIEN[4].min - p, falsch:INSIGNIEN[1].name};
})())`));
ok(_wkStufe.h.indexOf('<em>' + _wkStufe.name + '</em>') >= 0
   && _wkStufe.h.indexOf('noch ' + _wkStufe.rest + ' bis zum ' + _wkStufe.next) >= 0
   && _wkStufe.h.indexOf('<em>' + _wkStufe.falsch + '</em>') < 0,
   'die Wirkung nennt die Stufe, die zu den Punkten gehoert',
   _wkStufe.name + ' / noch ' + _wkStufe.rest);
// Und wer einen Rekord abgeben oder teilen muss, steht in der Wirkung mit:
// sein Minus gehoert zu diesem Tag. Die Rekord-Karte traegt dafuer die
// bisherigen Halter, die nicht mehr allein halten.
const _wkVor = JSON.parse(K.eval(`JSON.stringify((function(){
  const fehlt = [];
  let n = 0;
  (_buildStories() || []).forEach(s => {
    const d = s.dataRef || {};
    if(!/^rekord_(geholt|uebernommen|geteilt|allein)/.test(d.type || '')) return;
    if(!d.laufbahn || !Array.isArray(d.vorher)) return;
    const neu = d.halter || [];
    d.vorher.filter(pid => neu.indexOf(pid) < 0 || neu.length > d.vorher.length)
      .forEach(pid => { n++; if(!d.laufbahn[pid]) fehlt.push(s.id + ' ' + pid); });
  });
  return {n, fehlt};
})())`));
ok(_wkVor.fehlt.length === 0,
   'wer einen Rekord abgibt oder teilt, steht in der Wirkung der Karte',
   _wkVor.fehlt.slice(0, 3).join(', ') || _wkVor.n + ' Vorgaenger');

// Und auf der Karte selbst steht, wer verliert: die Schlagzeile feiert die
// Neuen, und wer seinen Anteil abgeben musste, erfuhr es erst im Blatt. Die
// Zeile nennt den Betrag und die Stufe, auf die jemand faellt.
const _vband = JSON.parse(K.eval(`JSON.stringify((function(){
  const a = players[0].id, b = players[1].id, lb = {};
  const lo = INSIGNIEN[3].min;
  lb[a] = {vor:lo + 50, nach:lo - 30};
  lb[b] = {vor:400, nach:460};
  const h = _newsPrestigeBand({dataRef:{type:'rekord_geholt', laufbahn:lb}});
  const ohne = _newsPrestigeBand({dataRef:{type:'rekord_geholt', laufbahn:{[b]:lb[b]}}});
  return {h, ohne, a:pmap()[a].name, b:pmap()[b].name, stufe:INSIGNIEN[2].name};
})())`));
// Und wer gewinnt, steht auch darin: die Zeile zeigte nur die Verlierer,
// und die Hälfte der Wirkung stand erst im Blatt. Gewinner zuerst.
ok(_vband.h.indexOf(_vband.a) >= 0 && _vband.h.indexOf('−80') >= 0
   && _vband.h.indexOf(_vband.b) >= 0 && _vband.h.indexOf('+60') >= 0
   && _vband.h.indexOf(_vband.b) < _vband.h.indexOf(_vband.a) && _vband.ohne.indexOf('+60') >= 0,
   'die Tafel-Karte nennt, wer Prestige gewinnt und wer verliert, die Gewinner zuerst',
   _vband.h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
// Und Name und Betrag stehen in EINEM Chip. Als Reihe aus Text brachen sie
// bei drei Namen um, und der Betrag stand in der zweiten Zeile neben dem
// falschen Namen. Die Stufe, auf die jemand fällt, steht nicht darin: sie
// gehört der Insignium-Karte desselben Tages und stand sonst zweimal da.
const _vchips = (_vband.h.match(/<b class="nf-vl minus">[\s\S]*?<\/b>/g) || []);
ok(_vchips.length === 1 && _vchips[0].indexOf(_vband.a) >= 0 && _vchips[0].indexOf('−80') >= 0
   && _vchips[0].indexOf(_vband.stufe) < 0 && _vchips[0].indexOf('↓') < 0 && /class="(rcp-av|av)/.test(_vchips[0]),
   'je Verlierer ein Chip mit Gesicht, Name und Betrag, ohne die Stufe der Insignium-Karte',
   _vchips.length + ' Chips');
// Und jeder steht da, nicht zwei je Seite und „+2": eine Bilanz mit
// unbekannten Posten ist keine. Je Seite nach dem Betrag geordnet, und vor
// jeder Seite ein Pfeil statt der Woerter „Gewinnt" und „Verliert".
const _vall = JSON.parse(K.eval(`JSON.stringify((function(){
  const lb = {}, d = [120, 35, 285, 35, 76, -50, -176, -9];
  d.forEach((x, i) => { lb[players[i].id] = {vor:1000, nach:1000 + x}; });
  const h = _newsPrestigeBand({dataRef:{type:'rekord_geholt', laufbahn:lb}});
  const zeilen = h.split('class="nf-pb-z"').slice(1);
  const betr = z => (z.match(/<em class="num">([^<]+) P<\\/em>/g) || [])
    .map(x => +x.replace(/<[^>]+>/g, '').replace(' P', '').replace('\\u2212', '-'));
  const nm = z => (z.match(/<i>([^<]+)<\\/i>/g) || []).map(x => x.replace(/<[^>]+>/g, ''));
  return {chips:(h.match(/class="nf-vl /g) || []).length, mehr:/nf-vl mehr|\\+[0-9]+<\\/b>/.test(h),
    woerter:/Gewinnt|Verliert/.test(h.replace(/aria-label="[^"]*"/g, '')),
    pfeile:(h.match(/class="nf-pb-r (auf|ab)"/g) || []).map(x => x.indexOf('auf') >= 0 ? 'auf' : 'ab'),
    oben:betr(zeilen[0] || ''), unten:betr(zeilen[1] || ''), obenN:nm(zeilen[0] || ''),
    gleich:[players[1].name, players[3].name].sort((a, b) => a.localeCompare(b, 'de'))};
})())`));
ok(_vall.chips === 8 && !_vall.mehr,
   'die Tafel-Karte nennt jeden, der Prestige gewinnt oder verliert, ohne Rest als Zahl',
   _vall.chips + ' Chips' + (_vall.mehr ? ', mit Rest' : ''));
ok(_vall.oben.join(' ') === '285 120 76 35 35' && _vall.unten.join(' ') === '-176 -50 -9'
   && _vall.obenN.slice(3).join(',') === _vall.gleich.join(','),
   'jede Seite steht nach dem Betrag geordnet, gleiche Betraege nach dem Namen',
   _vall.oben.join(' ') + ' | ' + _vall.unten.join(' '));
ok(_vall.pfeile.join(',') === 'auf,ab' && !_vall.woerter,
   'vor Gewinnern und Verlierern steht ein Pfeil, kein Wort',
   _vall.pfeile.join(',') + (_vall.woerter ? ', mit Wort' : ''));

// Und der Satz der Rekordkarte nennt, wer dabei verliert: die Karte erzaehlte
// nur von Jane, und dass Leon den Rekord jetzt teilt und Prestige verliert,
// stand nirgends. Geprueft an jeder Karte, deren bisheriger Halter in der
// Wirkung mit einem Minus steht.
const _vsatz = JSON.parse(K.eval(`JSON.stringify((function(){
  let n = 0; const fehlt = [];
  (_buildStories() || []).forEach(s => {
    const d = s.dataRef || {};
    if(!/^rekord_/.test(d.type || '') || !d.laufbahn) return;
    // Nur wo jemand teilt oder abgibt: beim Ausbauen ist der Vorgaenger der
    // Halter selbst, und sein Minus kommt von anderswo.
    if(['dazu', 'uebernommen'].indexOf(d.fall) < 0) return;
    (d.vorher || []).forEach(pid => {
      const w = d.laufbahn[pid];
      if(!w || !(w.nach < w.vor)) return;
      n++;
      if(String(s.desc).indexOf(pmap()[pid].name) < 0 || !/Prestige weniger/.test(s.desc))
        fehlt.push(s.title);
    });
  });
  return {n, fehlt};
})())`));
ok(_vsatz.n > 0 && _vsatz.fehlt.length === 0,
   'die Rekordkarte nennt im Satz, wer an diesem Spieltag Prestige verliert',
   _vsatz.fehlt.slice(0, 2).join(' · ') || _vsatz.n + ' Verluste');

// Die Tafel-Karte nennt nur, was Rekorde und Monatschroniken bewegen. Der
// ganze Zuwachs des Tages enthielt die Auszeichnungen mit, und die nennt die
// Ehrung derselben Runde: dasselbe Prestige stand auf zwei Karten. Eine
// gespeicherte Karte ohne Aufschlüsselung zeigt weiter den ganzen Zuwachs.
const _vquelle = JSON.parse(K.eval(`JSON.stringify((function(){
  const a = players[0].id, b = players[1].id, lb = {};
  lb[a] = {vor:1000, nach:1262, rek:240, mon:10};
  lb[b] = {vor:500, nach:512, rek:0, mon:0};
  const txt = h => h.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
  const h = _newsPrestigeBand({dataRef:{type:'rekord_geholt', laufbahn:lb}});
  const alt = _newsPrestigeBand({dataRef:{type:'rekord_geholt', laufbahn:{[a]:{vor:1000, nach:1262}}}});
  return {h:txt(h), alt:txt(alt), b:pmap()[b].name};
})())`));
ok(/\+250 P/.test(_vquelle.h) && !/\+262/.test(_vquelle.h) && _vquelle.h.indexOf(_vquelle.b) < 0 && /\+262 P/.test(_vquelle.alt),
   'die Tafel-Karte zählt nur Rekorde und Chroniken, die Auszeichnungen stehen in der Ehrung',
   _vquelle.h + ' | alt: ' + _vquelle.alt);

console.log('=== DIE EHRUNG ===');
// Jede Ehrung der Fixtures, nicht nur die im Fenster des Feeds: je Tag die
// Ehrung des Tages, als Karte des Tages und — so liegen gespeicherte Karten
// von vorher — als Ehrung einer Runde, dazu jede Woche und jeder Monat.
const _eh = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = [], ids = new Set();
  [...new Set(matches.map(m => tagKey(mts(m))))].forEach(tg => {
    const ms = matches.filter(m => tagKey(mts(m)) === tg), t = new Date(tg + 'T23:59:00').getTime();
    const sp = _ehrungDesTages(t);
    [_ehrungKarte(sp, 'tagesehrung_' + tg, t, {periode:'tag', tag:tg, voll:true, breaking:false}),
     _ehrungKarte(sp, 'ehrung_' + ms[ms.length - 1].id, t, {ab:mts(ms[0]), bis:mts(ms[ms.length - 1])})]
      .forEach(x => { if(x){ ids.add(x.id); alle.push(x); } });
  });
  for(let t = Date.parse('2026-05-10'); t < Date.parse('2026-09-01'); t += NEWS_FENSTER_TAGE * 864e5 * 0.9)
    _newsZeitraumEhrungen(t).forEach(s => { if(!ids.has(s.id)){ ids.add(s.id); alle.push(s); } });
  const ORD = {legendary:0, rare:1, common:2};
  const falsch = [];
  let legendaer = 0, umbruch = 0, kacheln = 0, zeilen = 0, rest = 0;
  const perioden = {};
  // Säulen prüfen, auf der Karte einer Runde (klein, fünf je Reihe) und auf
  // der Bühne des Blatts (groß, mit Namen, vier je Reihe).
  const saeulenOk = (s, h, gross) => {
    const sp = s.dataRef.spieler;
    const saeulen = h.split('<span class="eh-s" ').slice(1);
    if(saeulen.length !== sp.length) falsch.push(s.id + ': ' + saeulen.length + ' Säulen für ' + sp.length);
    const hoehe = saeulen.map(o => +((o.match(/eh-saeule" style="height:(\\d+)px/) || [])[1] || 0));
    sp.forEach((x, i) => {
      const o = saeulen[i] || '';
      const m = o.match(gross ? /class="zk (\\w+)"/ : /class="zk k (\\w+)"/);
      if(!m || m[1] !== _ehrungTon(x.posten[0].klasse)) falsch.push(s.id + ' ' + pname(x.pid) + ': Kachel ' + (m && m[1]));
      if(x.posten.some(q => ORD[q.klasse] < ORD[x.posten[0].klasse])) falsch.push(s.id + ' ' + pname(x.pid) + ': nicht die seltenste vorn');
      const innen = (o.match(/eh-saeule" style="height:\\d+px">([\\s\\S]*?)<\\/span>/) || ['', ''])[1];
      const stuecke = (innen.match(/<i class=/g) || []).length;
      const soll = x.posten.filter(q => q.klasse !== 'common').length + (x.posten.some(q => q.klasse === 'common') ? 1 : 0);
      if(stuecke !== soll) falsch.push(s.id + ' ' + pname(x.pid) + ': ' + stuecke + ' Stücke statt ' + soll);
      if(x.posten[0].klasse === 'legendary' && o.indexOf('glanz-bahn') < 0) falsch.push(s.id + ' ' + pname(x.pid) + ': Gold ohne Lauflicht');
      // Unter der Säule das Wappen, Insignium und Gesicht, nicht das
      // nackte Gesicht von 30 px.
      if(!/<span class="eh-s-av"[^>]*><span class="rav zn/.test(o)) falsch.push(s.id + ' ' + pname(x.pid) + ': ohne Wappen');
      if(gross && o.indexOf('<b class="eh-s-n">' + esc(pname(x.pid)) + '</b>') < 0) falsch.push(s.id + ': Bühne ohne Namen');
    });
    if(hoehe[0] !== Math.max(...hoehe)) falsch.push(s.id + ': Säulen ' + hoehe.join(','));
    const reihen = h.split('eh-umbruch').length, jeReihe = gross ? 4 : 5;
    if(reihen !== Math.ceil(sp.length / jeReihe)) falsch.push(s.id + ': ' + reihen + ' Reihen für ' + sp.length);
    if(reihen > 1){
      umbruch++;
      // Gleich lang: um höchstens eine Säule verschieden, die längeren vorn.
      const laenge = h.split('eh-umbruch').map(t => t.split('<span class="eh-s" ').length - 1);
      if(Math.max(...laenge) - Math.min(...laenge) > 1 || laenge.some((n, i) => i && n > laenge[i - 1]))
        falsch.push(s.id + ': ungleiche Reihen ' + laenge.join('+'));
    }
  };
  alle.forEach(s => {
    if(s.dataRef.periode) perioden[s.dataRef.periode] = (perioden[s.dataRef.periode] || 0) + 1;
    const d = s.dataRef, sp = d.spieler, knapp = !!d.periode;
    const h = _newsEhrungHtml(s, false, '');
    // Keine Bilanz-Chips der Tafel: dieselbe Form las sich als dieselbe Nachricht.
    if(/nf-verlust|nf-vl/.test(h)) falsch.push(s.id + ' trägt das Band der Tafel');
    // Keine eigene Zeichnung: ein Entwurf hängte Medaillen an Bänder, die es
    // sonst nirgends in der App gibt.
    if(/eh-m |eh-band/.test(h)) falsch.push(s.id + ' trägt Medaille oder Band');
    const klassen = _ehrungKlassen(sp);
    if(!knapp){
      // Gespeicherte Ehrung einer Runde: Säulen auf dem Wappen, der Schimmer
      // des Seltenen nur mit einer legendären, kein Satz und kein Fuß.
      saeulenOk(s, h, false);
      const leg = sp.some(x => x.posten.some(q => q.klasse === 'legendary'));
      if(leg !== /nf-glanz/.test(h.slice(0, 200))) falsch.push(s.id + ': Schimmer ' + !leg);
      if(/class="nf-d"|class="eh-fuss"|class="eh-k /.test(h)) falsch.push(s.id + ': Zusatztext auf der Karte');
    } else {
      // Die knappe Karte eines Tages, einer Woche, eines Monats: keine
      // Säulen; die vorderen fünf mit Gesicht und Prestige, mehr als Zahl
      // (nie „+1"); ein Balken je Klasse und, was jede Klasse zählte,
      // zusammen alle Auszeichnungen. Die Säulen machten die Karte der Woche
      // höher als einen Bildschirm.
      if(/class="eh-s"|class="nf-d"/.test(h)) falsch.push(s.id + ': Säulen oder Satz auf der knappen Karte');
      const gesichter = (h.match(/class="eh-kp-s (gold|viol|gruen)"/g) || []).length;
      const r = +((h.match(/eh-kp-rest"><i class="num">\\+(\\d+)</) || [])[1] || 0);
      if(gesichter !== (sp.length > 5 ? 4 : sp.length) || r !== (sp.length > 5 ? sp.length - 4 : 0) || r === 1)
        falsch.push(s.id + ': ' + gesichter + ' Gesichter und +' + r + ' für ' + sp.length);
      if(r) rest++;
      const balken = (h.match(/<div class="eh-kp-b">([\\s\\S]*?)<\\/div>/) || ['', ''])[1];
      if((balken.match(/<i class=/g) || []).length !== klassen.length) falsch.push(s.id + ': Balken');
      const zahlen = (h.match(/<span class="eh-k \\w+"><i><\\/i><b class="num">\\d+<\\/b>/g) || []).map(x => +x.replace(/<[^>]+>/g, ''));
      if(zahlen.reduce((a, b) => a + b, 0) !== d.zahl) falsch.push(s.id + ': Klassen ' + zahlen.join('+') + ' statt ' + d.zahl);
      const gold = d.periode === 'woche' || d.periode === 'monat';
      if(gold !== /nf-ehrung-zr/.test(h)) falsch.push(s.id + ': Gold ' + !gold);
    }
    // Dieselbe Angabe auf Karte und Blatt [§C27]: oben, was der Zeitraum
    // bedeutet, darunter der Zeitraum. Das Blatt setzt beide Teile zu einem
    // Satz zusammen.
    const z = _ehrungZeitraum(d);
    const vor = (h.match(/<span class="eh-zr-k">([^<]*)<\\/span>/) || [])[1];
    const zr = (h.match(/<span class="eh-zr-t">([^<]*)<\\/span>/) || [])[1];
    if(!z || vor !== esc(z.vor) || zr !== esc(z.wann) || (d.periode
      ? !({tag:/^Geholt( am)?$/, woche:/^Geholt$/, monat:/^Geholt im$/}[d.periode] || /^$/).test(vor)
      : (!/^Geholt in de[nr] Partien?$/.test(vor)
        || !/ Uhr$/.test(zr) || zr.indexOf(datumFmt(d.ab, 'uhr')) < 0 || zr.indexOf(datumFmt(d.bis, 'uhr')) < 0)))
      falsch.push(s.id + ': Zeitraum ' + vor + ' | ' + zr);
    const b = _ndEhrungBlatt(s);
    if(z && b.mitte.indexOf('<div class="nw-hinweis eh-zeit">' + esc(z.vor + ' ' + z.wann)
      + (/\\.$/.test(z.wann) ? '' : '.') + '</div>') < 0)
      falsch.push(s.id + ': Blatt nennt einen anderen Zeitraum');
    // Im Blatt die Säulen groß, mit Namen, vier je Reihe.
    saeulenOk(s, b.kopf, true);
    // Im Blatt jede Klasse, die vorkommt, und zusammen alle Auszeichnungen.
    const fuss = (b.mitte.match(/<span class="eh-k \\w+"><i><\\/i><b class="num">\\d+<\\/b>/g) || []).map(x => +x.replace(/<[^>]+>/g, ''));
    if(fuss.reduce((a, c) => a + c, 0) !== d.zahl) falsch.push(s.id + ': Blatt-Klassen ' + fuss.join('+') + ' statt ' + d.zahl);
    // Der Satz im Blatt nennt die wertvollste Auszeichnung, nie die Summe —
    // die steht bei den Klassen.
    const top = sp.flatMap(x => x.posten.map(q => ({x, q}))).sort((a, c) => ORD[a.q.klasse] - ORD[c.q.klasse] || c.q.p - a.q.p)[0];
    if(s.desc.indexOf('„' + top.q.name + '“') < 0 || /Zusammen|Prestige/.test(s.desc)) falsch.push(s.id + ': ' + s.desc);
    if(top.q.klasse === 'legendary') legendaer++;
    // Das Blatt: jede Auszeichnung genau einmal, jede als dieselbe Kachel
    // (zwei je Zeile), jede mit dem Rest ihres vollen Werts als Strich. Eine
    // seltene stand vorher als eigene Zeile über die ganze Breite.
    const kasten = b.mitte.split('<div class="eh-p" ').slice(1);
    sp.forEach((x, i) => {
      const k = kasten[i] || '';
      if(k.indexOf('<b>' + esc(pname(x.pid)) + '</b>') < 0) falsch.push(s.id + ': Kasten ' + i + ' nicht ' + pname(x.pid));
      x.posten.forEach(q => {
        const kl = 'eh-g-t';
        // Jeder Kasten öffnet seine Auszeichnung für diesen Spieler (data-bp).
        const n = k.split('<div class="').filter(t => t.indexOf(kl + ' ' + q.klasse + '" data-bp="' + q.id + '" data-bp-pid="' + x.pid + '">') === 0
          && t.indexOf('<b>' + esc(q.name) + '</b>') >= 0).length;
        if(n !== 1) falsch.push(s.id + ' ' + pname(x.pid) + ': „' + q.name + '“ ' + n + '-mal als ' + kl);
        if(q.klasse === 'common') kacheln++; else zeilen++;
      });
    });
    const striche = (b.mitte.match(/class="eh-q-m"/g) || []).length;
    const posten = sp.reduce((n, x) => n + x.posten.length, 0);
    if(striche !== posten) falsch.push(s.id + ': ' + striche + ' Striche für ' + posten);
  });
  // Der Strich ist der Rest des vollen Werts: das vierte Mal einer seltenen
  // Auszeichnung bringt gedämpft, das erste voll.
  const r = q => Math.round(q.p / (auszeichnungsTeilwert(q.id, 1) * q.mal) * 100);
  const probe = {id:'wall_badge', klasse:'rare', mal:1, bis:4, p:auszeichnungsTeilwert('wall_badge', 4)};
  const erst = {id:'wall_badge', klasse:'rare', mal:1, bis:1, p:auszeichnungsTeilwert('wall_badge', 1)};
  const blattP = _ndEhrungBlatt({dataRef:{spieler:[{pid:players[0].id, summe:probe.p,
    posten:[Object.assign({name:'Mauer', ic:'shield'}, probe)]}]}}).mitte;
  const breite = +((blattP.match(/eh-q-m"[^>]*><i style="width:([\\d.]+)%/) || [])[1]);
  return {n:alle.length, falsch, legendaer, umbruch, kacheln, zeilen, rest, perioden, breite, soll:r(probe), voll:r(erst)};
})())`));
ok(_eh.n >= 80 && _eh.legendaer > 0 && _eh.umbruch > 0 && _eh.kacheln > 0 && _eh.zeilen > 0 && _eh.rest > 0 && !_eh.falsch.length
   && _eh.perioden.woche > 5 && _eh.perioden.monat >= 2 && _eh.perioden.tag > 20,
   'die Ehrung eines Tages, einer Woche, eines Monats steht knapp: Gesichter mit Prestige, die vorderen fünf, und ein Balken der Klassen; die Säulen auf dem Wappen mit der Zeichenkachel der seltensten stehen im Blatt mit Namen, vier je Reihe, und auf gespeicherten Karten einer Runde fünf je Reihe; im Blatt jede Klasse, im Satz die wertvollste und jede Auszeichnung genau einmal in ihrem Kasten',
   _eh.falsch.slice(0, 4).join(' | ') || _eh.n + ' Ehrungen, ' + _eh.legendaer + ' legendär, ' + _eh.umbruch + ' mehrreihig, ' + _eh.zeilen + ' Zeilen, ' + _eh.kacheln + ' Kacheln');
// Die Zeile in Worten: heute und gestern als Wort, weiter zurück das
// Datum, über Mitternacht der zweite Tag, eine einzige Partie in der Einzahl.
const _ehZr = JSON.parse(K.eval(`JSON.stringify((function(){
  const um = (tage, h, m) => { const d = new Date(); d.setDate(d.getDate() - tage); d.setHours(h, m, 0, 0); return d.getTime(); };
  const tm = t => datumFmt(new Date(t), 'tm');
  const satz = z => z ? z.vor + ' | ' + z.wann : '';
  return [
    [satz(_ehrungZeitraum({ab:um(0, 13, 44), bis:um(0, 15, 55)})), 'Geholt in den Partien | von heute, 13:44 Uhr bis 15:55 Uhr'],
    [satz(_ehrungZeitraum({ab:um(1, 13, 44), bis:um(1, 15, 55)})), 'Geholt in den Partien | von gestern, 13:44 Uhr bis 15:55 Uhr'],
    [satz(_ehrungZeitraum({ab:um(4, 16, 44), bis:um(4, 18, 10)})), 'Geholt in den Partien | vom ' + tm(um(4, 0, 0)) + ', 16:44 Uhr bis 18:10 Uhr'],
    [satz(_ehrungZeitraum({ab:um(1, 23, 10), bis:um(0, 0, 40)})), 'Geholt in den Partien | von gestern, 23:10 Uhr bis heute, 00:40 Uhr'],
    [satz(_ehrungZeitraum({ab:um(16, 15, 12), bis:um(14, 15, 10)})), 'Geholt in den Partien | vom ' + tm(um(16, 0, 0)) + ', 15:12 Uhr bis ' + tm(um(14, 0, 0)) + ', 15:10 Uhr'],
    [satz(_ehrungZeitraum({ab:um(0, 15, 55), bis:um(0, 15, 55)})), 'Geholt in der Partie | von heute, 15:55 Uhr'],
    [satz(_ehrungZeitraum({})), '']];
})())`));
// Gelesen mit gewöhnlichen Leerzeichen: vor jeder Uhrzeit steht ein festes.
_ehZr.forEach(x => { x[0] = x[0].replace(/\u00a0/g, ' '); });
ok(_ehZr.every(([ist, soll]) => ist === soll),
   'die Ehrung sagt, dass die Auszeichnungen in diesen Partien geholt sind, und nennt sie mit heute, gestern oder Datum, über Mitternacht und über mehrere Tage mit beiden Tagen, mit „Uhr" hinter jeder Uhrzeit und eine einzelne Partie in der Einzahl',
   _ehZr.filter(([ist, soll]) => ist !== soll).map(([ist, soll]) => ist + ' statt ' + soll).join(' | '));
ok(Math.round(_eh.breite) === _eh.soll && _eh.soll < 100 && _eh.voll === 100,
   'der Strich unter einer Auszeichnung zeigt, wie viel vom vollen Wert sie beim wievielten Mal bringt',
   _eh.breite + ' % statt ' + _eh.soll + ' %');

console.log('=== GEMELDET WIRD VOM ERSTEN SPIELTAG AN ===');
// Ein Monat hatte unter fuenf Spieltagen keine Chronik, und am fuenften ging
// die Tafel mit einer eigenen Karte auf („Die Monatstafel ist offen"):
// sonst stand jeder Eintrag als „holt" im Feed, fuer Werte, die ueber fuenf
// Spieltage entstanden waren. Heute zaehlt eine Chronik je Spieler ab
// fuenfzehn Partien [§C39]; wer sie erreicht, holt seine Chronik an diesem
// Spieltag wie jeder andere, in der Tafel-Karte des Tages [§11.0e]. Gemessen
// am echten Verlauf: die Partien werden Spieltag fuer Spieltag
// zurueckgenommen, bis es im August die erste Chronik gibt.
const _frei = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  try {
    const sid = '2026-08';
    const ms = alle.filter(m => (seasonOf(m.created_at) || {}).id === sid)
      .map(m => mts(m)).sort((a, b) => a - b);
    const tage = [...new Set(ms.map(t => tagKey(t)))];
    let treffer = null;
    for(let i = 0; i < tage.length; i++){
      const grenze = Math.max(...ms.filter(t => tagKey(t) === tage[i]));
      matches = alle.filter(m => mts(m) <= grenze);
      invalidateCache();
      if(Object.keys(seasonTitleHalter(sid) || {}).length){ treffer = {i, grenze}; break; }
    }
    if(!treffer) return {tag:''};
    matches = alle.filter(m => mts(m) <= treffer.grenze);
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const roh = _buildStories() || [];
    const C = _seasonTitleCtx(sid);
    const spiele = pid => ((C.rankAll || []).find(r => r.id === pid) || {}).games || 0;
    const wechsel = roh.filter(x => (x.dataRef || {}).type === 'chronik_geholt');
    return {tag:tagKey(treffer.grenze), i:treffer.i,
      frei:roh.filter(x => (x.dataRef || {}).type === 'chronik_frei').length,
      wechsel:wechsel.length, titel:wechsel.map(x => x.title).slice(0, 3),
      unter:wechsel.flatMap(x => x.dataRef.playerIds || []).filter(pid => spiele(pid) < CHRONIK_MIN_SPIELE)};
  } finally {
    matches = alle; invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(_frei.tag && _frei.i < 4,
   'die erste Chronik des Monats gibt es vor dem fuenften Spieltag', _frei.tag + ', Spieltag ' + (_frei.i + 1));
ok(_frei.frei === 0, 'keine Karte meldet, dass die Monatstafel aufgeht', String(_frei.frei));
ok(_frei.wechsel > 0 && _frei.unter.length === 0,
   'am selben Spieltag steht jede erste Chronik als Wechsel im Feed, jeder Halter mit fuenfzehn Partien',
   _frei.wechsel + ' · ' + _frei.titel.join(' | ') + (_frei.unter.length ? ' · unter fuenfzehn: ' + _frei.unter.join(', ') : ''));

console.log('=== TAFEL, PROFIL UND PRESTIGE SIND DREI EBENEN ===');
// Ein Spieler kann in der Monatstafel mehrere Disziplinen fuehren, im Profil
// steht genau eine davon, und nur diese eine zaehlt fuers Prestige [§C32].
// Das Blatt nannte einen Namen und einen Wert: wer „Der Nervenkitzel" neben
// „kein zusaetzliches Prestige" las, konnte nicht sehen, dass dieser Name
// einem ANDEREN Eintrag gehoert und die Chronik dieser Karte nur in der
// Tafel steht.
const _drei = JSON.parse(K.eval(`JSON.stringify((function(){
  const l = _buildStories() || [];
  const k = l.filter(s => (s.dataRef || {}).type === 'chronik_geholt');
  if(!k.length) return {n:0};
  const roh = s => String(_newsDetailMitte(s) || '')
    .replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');
  const sid = k[0].dataRef.sid;
  const T = seasonTitles(sid) || {awarded:[]};
  const je = {};
  (T.awarded || []).forEach(a => { (je[a.pid] = je[a.pid] || []).push(a); });
  const pid = Object.keys(je).filter(p => je[p].length > 1)[0] || '';
  const profil = pid ? seasonTitleOf(pid, sid) : null;
  // Die Karte einer Chronik, die der Profileintrag ihres Halters ist. Es
  // war die erste Karte des Tages, dann die über Leos „Wochenschluss"; seit
  // „Das Zielwasser" Leos Profileintrag im August ist, trägt keine Karte
  // dieses Tages mehr den Profileintrag ihres Halters. Dann wird sie gebaut
  // wie der Fall darunter — gefragt ist das Blatt, nicht der Spieltag.
  const eig = k.find(s => { const d = s.dataRef || {};
    return (d.playerIds || []).some(p => (seasonTitleOf(p, d.sid) || {}).titleId === d.titleId); })
    || (profil ? {dataRef:{type:'chronik_geholt', sid, titleId:profil.titleId, playerIds:[pid]}} : k[0]);
  const echt = roh(eig);
  // Und der Fall, den die echten Daten an diesem Tag nicht hergeben: eine
  // Karte ueber eine Chronik, die NICHT der Profileintrag ihres Halters ist.
  const ander = pid ? je[pid].filter(a => a.titleId !== (profil || {}).titleId)[0] : null;
  const gebaut = ander ? roh({dataRef:{type:'chronik_geholt', sid,
    titleId:ander.titleId, playerIds:[pid]}}) : '';
  return {n:k.length, echt,
    tafel:/\\d+ Eintr(ag|äge) in der Tafel/.test(echt),
    diese:echt.indexOf('im Profil steht diese') >= 0,
    gebautDa:!!ander, gebaut,
    fremd: ander ? (gebaut.indexOf('im Profil „' + profil.name) >= 0) : false,
    keinPlus: ander ? (gebaut.indexOf('zählt aktuell nicht') >= 0
                       || gebaut.indexOf('kein zusätzliches Prestige') >= 0) : false,
    name: ander ? (pname(pid) + ': ' + ander.name + ' statt ' + profil.name) : ''};
})())`));
ok(_drei.n > 0, 'der Generator bildet Chronik-Karten', String(_drei.n));
ok(_drei.tafel, 'das Blatt nennt die Zahl der Eintraege in der Monatstafel',
   (_drei.echt || '').slice(0, 120));
ok(_drei.diese, 'und dass diese Chronik der Profileintrag ist');
ok(_drei.gebautDa && _drei.fremd,
   'eine Chronik, die nicht im Profil steht, nennt den Eintrag, der dort steht',
   _drei.name || 'kein Spieler mit zwei Eintraegen');
ok(_drei.keinPlus, 'und behauptet kein zusaetzliches Prestige',
   (_drei.gebaut || '').slice(0, 140));

console.log('=== DER ROHE GRUNDWERT IST NICHT, WAS JEMAND BEKOMMT ===');
// Ein zehnter Rekord gibt nicht 100 Prestige: er wird durch die Zahl seiner
// Halter geteilt, landet auf einem Rang im Rekordstapel und wird dort durch
// die Wurzel seiner Staffel geteilt — und weil er die anderen Rekorde mit
// verschiebt, ist der Nettozuwachs noch eine dritte Zahl [§C34]. Das Blatt
// zeigt deshalb die beiden Staende aus `prestigeTabelle` und die Rechnung,
// nie den Grundwert als erhaltene Punkte. Und es zeigt ueberhaupt etwas: nur
// „uebernommen" hatte einen Fall im Schalter, ein erstmals vergebener und ein
// ausgebauter Rekord oeffneten ein Blatt mit null Zeichen Mitte.
const _rekBlatt = JSON.parse(K.eval(`JSON.stringify((function(){
  const l = _buildStories() || [];
  const k = l.filter(s => String((s.dataRef || {}).type || '').indexOf('rekord_') === 0);
  if(!k.length) return {n:0};
  const s0 = k[0], d0 = s0.dataRef;
  const pid = (d0.playerIds || [])[0];
  const w = (d0.laufbahn || {})[pid] || null;
  const P = prestigeTabelle().byPid[pid] || {};
  const q = (P.quellen || []).find(x => x.q === 'rekord' && x.id === d0.rekordId) || null;
  const mitte = pid => String(_newsDetailMitte(s0) || '');
  const m0 = mitte();
  // Dieselbe Karte in den beiden anderen Rekordfaellen.
  const bau = t => ({dataRef:Object.assign({}, d0, {type:t})});
  const laengen = ['rekord_erstmals', 'rekord_geholt', 'rekord_gesteigert']
    .map(t => String(_newsDetailMitte(bau(t)) || '').length);
  // Und eine Karte aus einem aelteren Lauf, die die Staende nicht kennt.
  const alt = {dataRef:Object.assign({}, d0, {laufbahn:null})};
  const mAlt = String(_newsDetailMitte(alt) || '');
  return {n:k.length, typen:[...new Set(k.map(x => x.dataRef.type))],
    hatWirkung:!!w, laengen,
    // Der gespeicherte Stand ist der von jetzt: der jüngste Spieltag rechnet
    // „nachher" als 0 und damit gegen den heissen Cache [§11.0e].
    standStimmt: w ? w.nach === Math.round(P.punkte || 0) : false,
    quelleStimmt: (w && q) ? (w.basis === Math.round(q.basis)
      && w.halter === q.halter && w.staffel === q.staffel) : false,
    // Die Wirkung steht gezeichnet wie an der Tafel: Stand nachher, Zuwachs
    // oder Verlust. Der Rechentext der Quelle stand je Halter in einer Zeile
    // und gehört ins Laufbahn-Blatt [§C33].
    zeigtStaende: !!w && m0.indexOf('>' + w.nach + ' Prestige') >= 0
      && (w.nach === w.vor || m0.indexOf((w.nach > w.vor ? '+' : '−') + Math.abs(w.nach - w.vor)) >= 0),
    zeigtRechnung: m0.indexOf('Grundwert') >= 0,
    rohWert: w ? (m0.indexOf('+' + w.basis + ' Prestige') >= 0
                  || m0.indexOf(w.basis + ' Prestige ›') >= 0) : false,
    altRechnung: mAlt.indexOf('Grundwert') >= 0,
    altHeute: mAlt.indexOf('Prestige aus diesem Rekord') >= 0,
    // Gemessen wird der Abschnitt, nicht das ganze Blatt: der Pfeil steht auch
    // im Kopf einer anderen Zeile, und ein ODER darauf ist immer wahr.
    altOhneZuwachs: mAlt.slice(mAlt.indexOf('Wirkung auf die Laufbahn')).indexOf('→') < 0};
})())`));
// Die Bühne des Rekords: alle Halter genannt, unter „vorher" nur, wer
// wirklich weg ist, und kein Halter unter den Verfolgern — die Liste bekam
// nur `playerIds`, und die nennen höchstens drei.
const _rekBuehne = JSON.parse(K.eval(`JSON.stringify((function(){
  const falsch = []; let n = 0;
  _buildStories().filter(s => /^rekord_/.test((s.dataRef || {}).type || '')).forEach(s => {
    const d = s.dataRef, pm = pmap(), b = _newsDetailBody(s); n++;
    const h = ((d.halter && d.halter.length) ? d.halter : d.playerIds || []).filter(id => pm[id]);
    const weg = (d.vorher || []).filter(id => pm[id] && h.indexOf(id) < 0);
    const kopf = b.slice(0, b.indexOf('nd-rk-h') + 400);
    if(h.some(id => kopf.indexOf(esc(pm[id].name)) < 0)) falsch.push(s.id + ' Halter fehlt');
    const alt = (b.match(/class="nd-rk-alt">([\\s\\S]*?)<small>/) || [, ''])[1];
    if((alt.match(/data-pid=/g) || []).length !== Math.min(3, weg.length)) falsch.push(s.id + ' vorher');
    const vf = [...b.matchAll(/class="nd-vf-nm">([^<]*)</g)].map(x => x[1]);
    if(vf.some(nm => h.some(id => esc(pm[id].name) === nm))) falsch.push(s.id + ' Halter als Verfolger');
  });
  return {n, falsch};
})())`));
ok(_rekBuehne.n > 0 && _rekBuehne.falsch.length === 0,
   'die Bühne eines Rekords nennt alle Halter, zeigt nur echte Vorgänger, und kein Halter steht unter den Verfolgern',
   _rekBuehne.falsch.slice(0, 3).join(' | ') || _rekBuehne.n + ' Rekord-Blätter');
ok(_rekBlatt.n > 0, 'der Generator bildet Rekord-Karten',
   (_rekBlatt.typen || []).join(', '));
ok(_rekBlatt.laengen && _rekBlatt.laengen.every(x => x > 400),
   'jeder der drei Rekordfaelle oeffnet ein gefuelltes Blatt',
   (_rekBlatt.laengen || []).join(' / '));
ok(_rekBlatt.hatWirkung && _rekBlatt.standStimmt,
   'die Karte traegt den Prestigestand aus prestigeTabelle',
   String(_rekBlatt.standStimmt));
ok(_rekBlatt.quelleStimmt,
   'und Grundwert, Halterzahl und Wurzelstaffel ihrer Quelle',
   String(_rekBlatt.quelleStimmt));
ok(_rekBlatt.zeigtStaende && !_rekBlatt.zeigtRechnung,
   'das Blatt zeigt die Wirkung aus den gespeicherten Staenden gezeichnet und keinen Rechentext',
   'Staende ' + _rekBlatt.zeigtStaende + ', Rechnung ' + _rekBlatt.zeigtRechnung);
ok(_rekBlatt.rohWert === false,
   'und nennt den rohen Grundwert nie als erhaltene Punkte');
ok(_rekBlatt.altHeute && !_rekBlatt.altRechnung && _rekBlatt.altOhneZuwachs,
   'eine Karte ohne gespeicherte Staende zeigt, was der Rekord heute bringt, und keinen Zuwachs',
   'heute ' + _rekBlatt.altHeute + ', Rechnung ' + _rekBlatt.altRechnung + ', ohne Zuwachs ' + _rekBlatt.altOhneZuwachs);

console.log('=== DER ANLASS STEHT ZUERST ===');
// Eine Sammelkarte erbt ihr Breaking von einer ihrer Zeilen [§C33]. Welche
// das war, stand nirgends: `teile` ist nach `prio` sortiert, und die
// Tafel-Familie ordnet Bestmarke vor Monatschronik vor Insignium-Stufe —
// also stand gerade der erste Lorbeerreif der Ligageschichte als LETZTE von
// sechs Zeilen im Sammelband, waehrend die Karte daneben roten Rahmen und
// pulsierenden Balken trug und nicht sagte, wofuer. Und der Nachsatz fehlte
// ganz: `_breakingHeroText` kannte sieben Typen und die Sammelkarte nicht,
// fiel damit auf `desc` zurueck, und der Aufrufer unterdrueckt ihn genau
// dann, wenn er `desc` ist.
// Gemessen wird an einem gestellten Buendel. Die Tafel traegt seit der
// Insignium-Karte keine Breaking-Zeile mehr; eine Partie-Karte schon: eine
// legendaere Auszeichnung mit der NIEDRIGSTEN prio der drei Zeilen — nach
// prio allein stuende sie hinten.
const _anlass = JSON.parse(K.eval(`JSON.stringify((function(){
  const m = matches[matches.length - 1], W = _spSieger(m), L = _spVerlierer(m), w = new Date(mts(m));
  const leg = BADGES.find(b => rarityOf(b.id) === 'legendary') || {id:'x', name:'X'};
  const roh = [
    {id:'spiel_' + m.id, cat:'highlight', ic:'ball', when:w, prio:40, title:'Ein Sieg', desc:'10:6.',
     dataRef:{type:'spiel', resultKind:'normal', matchId:m.id, playerIds:W, winners:W, losers:L}},
    {id:'an-ms', cat:'milestone', ic:'chart', when:w, prio:70, title:pname(W[0]) + ' feiert den 100. Sieg',
     desc:'100 Siege.', dataRef:{type:'milestone_wins', pid:W[0], milestone:'100 Siege', matchId:m.id, playerIds:[W[0]]}},
    {id:'an-lg', cat:'badge', ic:'trophyStar', when:w, prio:30, title:pname(W[1]) + ' holt „' + leg.name + '"',
     desc:'Eine legendäre Auszeichnung.', dataRef:{type:'badge_unlocked', badgeId:leg.id, playerId:W[1],
       rarity:'legendary', matchId:m.id, playerIds:[W[1]]}}
  ];
  _cache._consolFrom = null;
  const fertig = _consolidateStories(roh.slice());
  const sam = fertig.find(s => (s.dataRef || {}).type === 'sammel');
  if(!sam) return {sam:false, typen:fertig.map(s => (s.dataRef || {}).type)};
  const t = sam.dataRef.teile || [];
  const html = _newsCardHtmlM2(sam, false, false);
  const sub = _breakingHeroText(sam);
  return {sam:true, breaking:!!_isBreaking(sam), n:t.length,
    reihe:t.map(x => (x.brk ? '*' : '') + x.titel),
    ersteBrk:!!(t[0] || {}).brk,
    nurEine:t.filter(x => x.brk).length,
    marke:html.indexOf('nf-sam-brk') >= 0 || t.some(x => x.brk && x.titel === sam.title),
    // Die Zahl der gebuendelten Meldungen steht im Breaking-Balken: die
    // Karte sah sonst aus wie eine einzelne Nachricht.
    zahlImBalken:html.indexOf('class="nf-brk-n">3 Meldungen<') >= 0,
    sub:String(sub || ''), subFremd:String(sub || '') !== String(sam.desc || ''),
    subImHtml:html.indexOf('nf-brk-sub') >= 0, desc:sam.desc};
})())`));
ok(_anlass.sam && _anlass.breaking && _anlass.n === 3,
   'drei Meldungen einer Partie mit einer legendären Auszeichnung werden eine Breaking-Karte',
   'Buendel ' + _anlass.sam + ', Breaking ' + _anlass.breaking + ', ' + _anlass.n + ' Zeilen');
ok(_anlass.ersteBrk && _anlass.nurEine === 1,
   'der Anlass des Breaking steht als erste Zeile',
   _anlass.reihe.join(' | '));
ok(_anlass.marke, 'und ist die Schlagzeile oder als Anlass gekennzeichnet');
ok(_anlass.zahlImBalken,
   'der Breaking-Balken nennt die Zahl der gebuendelten Meldungen');
// Auf der Karte einer Partie erklärt der Satz den Hauptanlass selbst; ein
// Nachsatz darunter nannte die Spitze nach Schlagzeile und Tabelle ein
// drittes Mal [§C33].
ok(!_anlass.subImHtml && _anlass.desc === 'Eine legendäre Auszeichnung.',
   'auf der Karte einer Partie erklärt der Satz den Anlass des Breaking, ohne Nachsatz darunter',
   _anlass.desc + (_anlass.subImHtml ? ' · mit Nachsatz' : ''));
// Ein Aufstieg in die beiden obersten Stufen ist Breaking, jetzt auf der
// Insignium-Karte des Tages; ein belegtes „wieder" nicht, eine tiefere Stufe nie.
const _insBrk = JSON.parse(K.eval(`JSON.stringify((function(){
  const k = z => _isBreaking({dataRef:{type:'insignium_tag', zuege:[z]}});
  return {erst:k({art:'auf', wieder:false, nach:{stufe:INSIGNIUM_OBEN}}),
    wieder:k({art:'auf', wieder:true, nach:{stufe:INSIGNIUM_OBEN}}),
    tief:k({art:'auf', wieder:false, nach:{stufe:INSIGNIUM_OBEN - 1}}),
    grad:k({art:'grad', nach:{stufe:INSIGNIUM_OBEN + 1}})};
})())`));
ok(_insBrk.erst && !_insBrk.wieder && !_insBrk.tief && !_insBrk.grad,
   'nur ein Aufstieg in die obersten Stufen, der kein belegtes wieder ist, macht die Insignium-Karte zu Breaking',
   JSON.stringify(_insBrk));

console.log('=== ZWEIMAL LAUFEN ERGIBT DASSELBE ===');
// Eine Story wird persistiert, damit alle Geraete dieselbe Karte zur selben
// Zeit sehen. Das haelt nur, wenn derselbe Datenstand immer dieselbe ID,
// denselben Zeitpunkt, dieselbe Gruppe und denselben Text ergibt: sonst legt
// jeder Aufruf eine neue Zeile an, und der Feed waechst vom Oeffnen und
// Schliessen der App von selbst. Gemessen wird deshalb zweimal derselbe Lauf
// und einmal ein Lauf, der den Bestand des ersten schon vorfindet.
const _zwei = JSON.parse(K.eval(`JSON.stringify((function(){
  const kalt = () => { _cache._buildStoriesKey = null; _cache._buildStoriesResult = null; };
  const lauf = () => {
    kalt();
    return (_buildStories() || []).map(s => ({id:s.id,
      when:new Date(s.when).toISOString(), titel:String(s.title || ''),
      text:String(s.desc || ''), grund:String((s.dataRef || {}).causalKey || '')}));
  };
  const sig = l => l.map(s => [s.id, s.when, s.grund, s.titel, s.text].join('~'));
  const feed = () => {
    kalt();
    const l = _buildStories() || [];
    return (_consolidateStories(l.slice()) || []).map(s => [s.id,
      new Date(s.when).toISOString(),
      ((s.dataRef || {}).teile || []).map(t => t.titel).join('+'),
      String(s.title || '')].join('~'));
  };
  const vorher = _cache._stories;
  _cache._stories = [];
  const a = lauf(), b = lauf();
  const f1 = feed(), f2 = feed();
  // Der dritte Lauf findet die Karten des ersten vor: das ist das Oeffnen der
  // App, nachdem sie in der Datenbank stehen.
  _cache._stories = a.map(s => ({id:s.id, when:new Date(s.when),
                                 title:s.titel, desc:s.text}));
  const c = lauf();
  _cache._stories = vorher;
  kalt();
  const ida = a.map(s => s.id);
  return {n:a.length, fn:f1.length,
    gleich:JSON.stringify(sig(a)) === JSON.stringify(sig(b)),
    abw:sig(a).filter((x, i) => x !== sig(b)[i]).slice(0, 2),
    feedGleich:JSON.stringify(f1) === JSON.stringify(f2),
    neu:c.map(s => s.id).filter(id => ida.indexOf(id) < 0)};
})())`));
ok(_zwei.n > 0, 'der Generator bildet Karten', String(_zwei.n) + ' roh');
ok(_zwei.gleich, 'zweimal laufen ergibt dieselben IDs, Zeitpunkte und Texte',
   _zwei.abw.join(' | ').slice(0, 120) || 'gleich');
ok(_zwei.feedGleich, 'und dieselbe Gruppierung', String(_zwei.fn) + ' Karten');
ok(_zwei.neu.length === 0, 'ein Lauf mit dem eigenen Bestand legt nichts Neues an',
   _zwei.neu.slice(0, 2).join(' | ') || 'nichts');

// ── Die Tabelle des Monats nennt den Stand ihres Tages ──────────────
// Die Karte „August 2026 hat eine Tabelle" stand am 04.08. und nannte die
// Zahlen des 26.08. („Martin führt mit 390 Elo … Gewertet sind 107
// Partien"). Gemessen wird gegen die rohen Partien: so viele Partien, wie
// der Monat bis zu ihrem Zeitpunkt hatte.
const _saisonStart = JSON.parse(K.eval(`JSON.stringify((function(){
  const s = _buildStories().find(x => (x.dataRef || {}).type === 'season_start');
  if(!s) return null;
  const d = s.dataRef, t = new Date(s.when).getTime();
  const bis = matchesInSeason(d.sid).filter(m => new Date(m.created_at).getTime() <= t);
  const zahl = +((s.desc.match(/Gewertet sind (\\d+) Partien/) || [])[1]);
  return {zahl, soll: bis.length, alle: matchesInSeason(d.sid).length};
})())`));
ok(_saisonStart && _saisonStart.zahl === _saisonStart.soll && _saisonStart.soll < _saisonStart.alle,
   'die Tabelle des Monats nennt den Stand ihres Tages, nicht den von heute',
   _saisonStart ? _saisonStart.zahl + ' Partien genannt, ' + _saisonStart.soll + ' bis dahin, '
     + _saisonStart.alle + ' im ganzen Monat' : 'keine Karte');

// ── „damit" heißt bis zu dieser Partie ──────────────────────────────
// „Martin zündet die 8er-Serie" um 10:56 nannte „134 Siege aus 211 Partien"
// — die Zahl nach seiner letzten Partie des Tages. Jede Serienmarke im
// Fenster wird gegen die rohen Partien bis zu ihrem Zeitpunkt nachgezählt.
const _damit = JSON.parse(K.eval(`JSON.stringify((function(){
  const falsch = []; let n = 0;
  _buildStories().filter(x => (x.dataRef || {}).type === 'win_streak').forEach(x => {
    const z = x.desc.match(/(\\d+) Siege aus (\\d+) Partien/);
    if(!z) return; n++;
    const t = new Date(x.when).getTime(), pid = x.dataRef.pid;
    const bis = matches.filter(m => matchOf(pid, m) && new Date(m.created_at).getTime() <= t);
    const siege = bis.filter(m => won(pid, m)).length;
    if(+z[1] !== siege || +z[2] !== bis.length) falsch.push(x.id + ': ' + z[0] + ' statt ' + siege + '/' + bis.length);
  });
  return {n, falsch};
})())`));
ok(_damit.n > 0 && _damit.falsch.length === 0,
   'eine Serienmarke zählt die Laufbahn bis zu ihrer Partie',
   _damit.falsch.slice(0, 2).join(' | ') || _damit.n + ' Marken');

// ── Das Blatt rechnet bis zu seiner Partie ──────────────────────────
// Das Jubiläum „100 Spiele" nannte darunter die Bilanz von heute („221 /
// 134"), der Meilenstein „221W · 134L", die Duo-Serie die gemeinsame Bilanz
// von heute. Gestellt: das hundertste Spiel eines Spielers, und die Bilanz
// im Blatt muss zusammen hundert ergeben.
const _bisPartie = JSON.parse(K.eval(`JSON.stringify((function(){
  const pid = players.find(p => matches.filter(m => matchOf(p.id, m)).length > 150).id;
  const eigene = matches.filter(m => matchOf(pid, m));
  const m100 = eigene[99];
  const s = {id:'test_jubilee', when:m100.created_at, title:'x', desc:'y',
    dataRef:{type:'jubilee', pid, total:100, matchId:m100.id}};
  const h = String(_newsDetailMitte(s)).replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');
  // Die Bilanz steht als Balken mit „x Siege … y Niederlagen" darunter.
  const z = h.match(/(\\d+) Siege [^]*? (\\d+) Niederlagen/);
  const ms = {id:'test_ms', when:m100.created_at, title:'x', desc:'y',
    dataRef:{type:'milestone_wins', pid, milestone:'x', matchId:m100.id}};
  const h2 = String(_newsDetailMitte(ms)).replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');
  const z2 = h2.match(/(\\d+) : (\\d+)/);
  return {summe: z ? +z[1] + +z[2] : null, summe2: z2 ? +z2[1] + +z2[2] : null,
    englisch: /Win-Rate|\\d+W · \\d+L/.test(h + h2)};
})())`));
ok(_bisPartie.summe === 100 && _bisPartie.summe2 === 100 && !_bisPartie.englisch,
   'das Blatt eines Jubiläums und eines Meilensteins rechnet bis zu seiner Partie',
   'Jubiläum ' + _bisPartie.summe + ', Meilenstein ' + _bisPartie.summe2);

// ── Der Faden zeigt auf eine ältere Karte im Feed [§C33] ─────────────
// Eine Tafel-Karte, die eine frühere fortsetzt, sagt es: derselbe Rekord,
// wieder geholt oder ausgebaut. Eine Karte mit Partie trägt keinen Faden
// und ist keins seiner Ziele: unter „Stefan und Leon retten ein 10:9" stand
// „Beendet · Maxi holt die seltene Auszeichnung ‚Mauer'", weil die
// Pleitenserie als Zeile in einer fremden Partie-Karte steckte.
const _faden = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const alle = getStoriesCache();
  const fd = _newsFaeden(alle);
  const nochmal = _newsFaeden(getStoriesCache()) === fd;
  const by = new Map(alle.map(x => [x.id, x]));
  const partie = c => { const d = (c && c.dataRef) || {};
    return d.type === 'spiel' || !!d.matchId || (d.teile || []).some(t => /^spiel_/.test(t.id || '')); };
  const falsch = [], arten = {};
  fd.forEach((f, id) => {
    arten[f.art] = (arten[f.art] || 0) + 1;
    const c = by.get(id), z = by.get(f.ziel);
    if(!c || !z){ falsch.push(id + ' zeigt ins Leere'); return; }
    if(!(new Date(z.when) < new Date(c.when))) falsch.push(id + ' zeigt nicht zurück');
    if(!NEWS_FADEN_ART[f.art]) falsch.push(id + ' ohne Art');
    if(partie(c) || partie(z)) falsch.push(id + ' hängt an einer Partie');
  });
  // Gestellt: derselbe Rekord zweimal. Wer ihn vor der früheren Karte hielt
  // und jetzt wieder hat, holt ihn zurück — wer ihn nur ausbaut, setzt fort.
  const [A, B] = players.map(p => p.id);
  const mk = (id, when, halter, vorher) => ({id, title:id, desc:'x', when:new Date(when),
    dataRef:{type:'rekord_geholt', rekordId:'test_r', halter, vorher, playerIds:halter}});
  const alt = mk('r1', '2026-08-20T10:00:00Z', [B], [A]);
  const neu = mk('r2', '2026-08-24T10:00:00Z', [A], [B]);
  const aus = mk('r3', '2026-08-25T10:00:00Z', [A], [A]);
  const vorher = _cache._stories;
  _cache._stories = [aus, neu, alt];
  const g = _newsFaeden([aus, neu, alt]);
  // Gestellt an echten Partien: die Pleitenserie eines Spielers und sein
  // erster Sieg danach. Früher hieß das „Wende" und zeigte auf die Karte
  // der Serie; jetzt sagt es die Zeile der Partie, und der Faden schweigt.
  const reiheS = [...matches].sort((a,b) => mts(a) - mts(b));
  const P = players[0].id;
  const eig = reiheS.filter(m => [m.a1,m.a2,m.b1,m.b2].includes(P));
  const gew = m => (m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2]).includes(P);
  const j0 = eig.findIndex((m, i) => !gew(m) && eig[i+1] && gew(eig[i+1]));
  const [w1, w2] = [eig[j0], eig[j0+1]];
  const zeit = m => new Date(mts(m));
  const ws = [{id:'sp_'+w2.id, title:'sp', desc:'x', when:zeit(w2), dataRef:{type:'spiel', matchId:w2.id}},
              {id:'ls', title:'ls', desc:'x', when:zeit(w1), dataRef:{type:'loss_streak', pid:P, streak:3, matchId:w1.id, lauf:w1.id}}];
  _cache._stories = ws;
  const gw = _newsFaeden(ws);
  _cache._stories = vorher;
  return {n: fd.size, arten, falsch, nochmal, partieFrei: gw.size === 0,
    zurueck: (g.get('r2')||{}).art + '→' + (g.get('r2')||{}).ziel,
    weiter: (g.get('r3')||{}).art + '→' + (g.get('r3')||{}).ziel,
    erste: g.has('r1')};
})())`));
ok(_faden.falsch.length === 0,
   'jeder Faden zeigt auf eine ältere Karte im Feed, und keiner hängt an einer Partie',
   _faden.falsch.slice(0, 2).join(' | ') || JSON.stringify(_faden.arten));
ok(_faden.zurueck === 'zurueck→r1' && _faden.weiter === 'weiter→r2' && !_faden.erste,
   'ein Rekord kommt zurück oder wird fortgesetzt, die erste Karte hat keinen Faden',
   _faden.zurueck + ' · ' + _faden.weiter);
ok(_faden.nochmal, 'derselbe Bestand rechnet den Faden nicht zweimal');
ok(_faden.partieFrei, 'der erste Sieg nach einer Pleitenserie zeigt nicht auf die Karte der Serie');

// ── Kopf und Fuß einer Partie folgen ihrem Anlass [§C33, §11.6c] ─────
// Jede Partie-Karte trug dasselbe Ergebnisband und darunter eine Zeile, und
// dreißig Karten sahen im Feed gleich aus. Jetzt wählt der Anlass Kopf und
// Fuß. Geprüft wird dreierlei, jeweils gegen die rohen Partien
// nachgerechnet: dass jede Zeichnung stimmt, dass es Vielfalt gibt (keine
// Form trägt die Hälfte der Karten), und dass der Satz darüber nicht
// wiederholt, was die Zeichnung zeigt.
const _bogen = JSON.parse(K.eval(`JSON.stringify((function(){
  const karten = getStoriesCache().filter(s => _newsSorte(s) === 'spiel' && (s.dataRef||{}).matchId);
  const falsch = [], wiederholt = [], formen = {}; let n = 0, feldN = 0;
  const reihe = [...matches].sort((a, b) => mts(a) - mts(b));
  const gew = (pid, m) => (m.winner === 'A') === (m.a1 === pid || m.a2 === pid);
  const text = h => String(h).replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ');
  const FORM = {feld:'sp-feld', krimi:'sp-at', aussenseiter:'sp-wp', deutlich:'sp-vt', spitze:'sp-tk', rang:'sp-tk', marken:'sp-zm',
    serie:'sp-sl', riss:'sp-rk', teamserie:'sp-duo', wende:'sp-ku', duell:'sp-bg', medaille:'sp-md',
    premiere:'sp-pm', rolle:'sp-ro'};
  // Die gewöhnliche Partie trägt eine der Formen [§C33]: die Klasse folgt der Wahl.
  const FORMKL = {mosaik:'sp-mo', tacho:'sp-ta', streu:'sp-sd', transfer:'sp-et', chemie:'sp-ch', gegner:'sp-gg',
    revanche:'sp-rv', gipfel:'sp-gp', rueckkehr:'sp-zu', gefaelle:'sp-gf', tagesring:'sp-tr', zaehlwerk:'sp-zw', feld:'sp-feld',
    tauziehen:'sp-tz', muenze:'sp-mz', weste:'sp-ws', uhr:'sp-uh', ueberholt:'sp-uo', duoserie:'sp-ds', hoch:'sp-ho',
    tafel:'sp-ag', pucks:'sp-pu', balken:'sp-lb', strom:'sp-sm', herz:'sp-hz', zunull:'sp-zn'};
  karten.forEach(s => {
    const d = s.dataRef, m = matches.find(x => x.id === d.matchId);
    if(!m) return;
    const a = _spAnlass(s);
    const html = _newsCardHtmlM2(s, false, false);
    const basis = _newsSpielFakten(s).find(x => x.type === 'spiel') || {};
    const visual = basis.visual || {}, scoreKey = visual.score && visual.score.key;
    const SCOREKL = Object.assign({krimi:'sp-at', aussenseiter:'sp-wp', deutlich:'sp-band',
      zeile:'sp-zeile', abstand:'sp-band'}, FORMKL);
    const OCCKL = Object.assign({nerven:'sp-nv', verteilung:'sp-vt'}, FORM, FORMKL);
    const kl = SCOREKL[scoreKey], occ = visual.occasion && visual.occasion.key;
    if(visual.version !== 2 || !kl
       || html.indexOf('class="' + kl) < 0 && html.indexOf('class="sp-fk ' + kl) < 0){
      falsch.push(s.id + ' ohne gespeicherte Scoregrafik ' + scoreKey); return; }
    if(occ && OCCKL[occ] && html.indexOf('class="' + OCCKL[occ]) < 0
       && html.indexOf('class="sp-fk ' + OCCKL[occ]) < 0){
      falsch.push(s.id + ' ohne gespeicherte Anlassgrafik ' + occ); return; }
    if(occ && ['chemie','gegner','revanche','rueckkehr','tagesring','zaehlwerk','marken'].includes(occ)){
      const oh = _spOccasionBild(visual.occasion);
      if(/class="sp-nz"/.test(oh)) wiederholt.push(s.id + ' ' + occ + ' wiederholt beide Teams');
      if(occ === 'chemie' && /Sieg zu zweit/.test(oh)) wiederholt.push(s.id + ' Chemietext bricht um');
    }
    const form = FORMKL[scoreKey] ? scoreKey : null;
    // Geprüft wird die Zeichnung, die auf der Karte steht: der Fuß folgt dem
    // stärksten Anlass und wechselt ab, also nicht immer dem ersten der
    // alten Reihe (_spAnlass). Wo beide dasselbe sagen, rechnet die Prüfung
    // seinen Text nach.
    const zeigt = k => a.key === k && (!occ || occ === k);
    n++; formen[scoreKey] = (formen[scoreKey] || 0) + 1;
    if(html.indexOf('class="sp-feld') >= 0) feldN++;
    if(a.key === 'medaille' && !/rare|legendary/.test(String((_newsSpielFakten(s).find(y => y.badgeId === a.x.badgeId) || {}).rarity)))
      falsch.push(s.id + ' Medaille für eine gewöhnliche Auszeichnung');
    const w = m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
    const hoch = Math.max(m.games_a, m.games_b), tief = Math.min(m.games_a, m.games_b);
    const vor = reihe.slice(0, reihe.indexOf(m) + 1);
    const t = text(html);
    // Das Spielfeld: Abwehr A, Sturm B, Sturm A, Abwehr B, und je Stange
    // die Elo der Partie. Team A steht links wie am Tisch, auch wenn B
    // gewann [§C33].
    if(form === 'feld'){
      const rolle = (id) => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_side'];
      const def = ids => ids.find(id => rolle(id) === 'reves') || ids[0];
      const atk = ids => ids.find(id => id !== def(ids));
      const [li, re] = [[m.a1,m.a2], [m.b1,m.b2]];
      const soll = [def(li), atk(re), atk(li), def(re)]
        .map(id => _newsEloDelta(id, m.id)).map(v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v));
      const ist = [...html.matchAll(/<em class="[gr] num">([^<]+)<\\/em><\\/div>/g)].map(x => x[1]);
      if(ist.join() !== soll.join()) falsch.push(s.id + ' Feld ' + ist + ' statt ' + soll);
    }
    // Die Anzeigetafel nur bei einem Tor, und die Bilanz in engen Partien
    // je Sieger bis zu dieser.
    if(scoreKey === 'krimi'){
      if(hoch - tief !== 1) falsch.push(s.id + ' Krimi bei ' + hoch + ':' + tief);
      if(occ === 'nerven') w.forEach(pid => {
        const eng = vor.filter(x => [x.a1,x.a2,x.b1,x.b2].includes(pid) && Math.abs(x.games_a - x.games_b) === 1);
        const gw = eng.filter(x => gew(pid, x)).length;
        if(html.indexOf('>' + gw + ':' + (eng.length - gw) + '</em>') < 0) falsch.push(s.id + ' enge Bilanz');
      });
    }
    // Die Verteilung ab sechs Toren: so deutlich oder deutlicher, und wann
    // zuletzt.
    if(scoreKey === 'deutlich'){
      if(hoch - tief < 6) falsch.push(s.id + ' deutlich bei ' + hoch + ':' + tief);
      if(occ === 'verteilung'){
        const so = vor.filter(x => Math.abs(x.games_a - x.games_b) >= Math.min(10, hoch - tief)).length;
        // Auf der Karte steht die Zahl einmal, als Zeile über dem Fuß; „zuletzt
        // am" behält das Blatt.
        if(t.indexOf(so + ' von ' + vor.length + ' Partien der Liga endeten so deutlich') < 0) falsch.push(s.id + ' Verteilung nennt nicht ' + so + ' von ' + vor.length);
      }
    }
    // Die Wippe nur unter der Linie der Überraschung.
    if(scoreKey === 'aussenseiter'){
      const h = getHistoryByMatchId().get(m.id), e = h && h.expA != null ? h.expA : m.exp_a;
      const c = m.winner === 'A' ? e : 1 - e;
      if(!(c < CHANCE_UPSET)) falsch.push(s.id + ' Wippe bei ' + c);
      if(t.indexOf(Math.max(1, Math.round(c * 100)) + ' %') < 0) falsch.push(s.id + ' Wippe ohne Chance');
    }
    // Die Wende ist der erste Sieg nach mindestens drei Pleiten in Folge.
    if(zeigt('wende')){
      const k = +(t.match(/(\\d+) Pleiten, dann/) || [,0])[1];
      const ok = w.some(pid => {
        const eig = reihe.filter(x => [x.a1,x.a2,x.b1,x.b2].includes(pid));
        let i = eig.indexOf(m) - 1, c = 0;
        while(i >= 0 && !gew(pid, eig[i])){ c++; i--; }
        return c === k;
      });
      if(k < 3 || !ok) falsch.push(s.id + ' Wende nach ' + k);
    }
    // Der Rangsprung: mindestens zwei Plätze, so wie die Rangtabelle es sagt.
    if(zeigt('rang')){
      [...t.matchAll(/steigt von (\\d+) auf (\\d+)/g)].forEach(x => {
        if(+x[1] - +x[2] < 1) falsch.push(s.id + ' Sprung ' + x[1] + '→' + x[2]);
      });
      if(!a.x.some(v => v.r.pre - v.r.post >= 2)) falsch.push(s.id + ' Sprung unter zwei Plätzen');
    }
    // Die Serie gegen den eigenen Bestwert VOR dieser Partie.
    if(zeigt('serie')){
      const pid = a.x.pid;
      let lauf = 0, best = 0;
      vor.slice(0, -1).forEach(x => { if(![x.a1,x.a2,x.b1,x.b2].includes(pid)) return;
        lauf = gew(pid, x) ? lauf + 1 : 0; best = Math.max(best, lauf); });
      if(best && t.indexOf('eigener Bestwert ' + best) < 0) falsch.push(s.id + ' Bestwert ' + best);
    }
    // Der gerissene Lauf: ein Feld je Sieg und das rote Feld der Partie,
    // die ihn beendet hat, und der Bestwert des Trägers VOR dieser Partie.
    if(zeigt('riss')){
      const r = (html.match(/class="sp-rk-r[^"]*"[^>]*>([\\s\\S]*?)<\\/div>/) || [,''])[1];
      const w = (r.match(/<i class="w"/g) || []).length, x = (r.match(/<i class="x"/g) || []).length;
      if(x !== 1 || (a.x.streak <= 20 && w !== a.x.streak)) falsch.push(s.id + ' Lauf ' + w + '+' + x + ' statt ' + a.x.streak);
      const pid = a.x.victimPid; let lauf = 0, best = 0;
      vor.slice(0, -1).forEach(y => { if(![y.a1,y.a2,y.b1,y.b2].includes(pid)) return;
        lauf = gew(pid, y) ? lauf + 1 : 0; best = Math.max(best, lauf); });
      const soll = best > a.x.streak ? 'eigener Bestwert ' + best : 'der eigene Bestwert';
      if(t.indexOf(soll) < 0) falsch.push(s.id + ' Bruch nennt nicht ' + soll);
    }
    // Die Premiere: der erste gemeinsame Sieg der beiden Sieger, beim
    // ersten Mal oder ab dem dritten Versuch.
    if(zeigt('premiere')){
      const zus = vor.slice(0, -1).filter(y => { const A = [y.a1,y.a2], B = [y.b1,y.b2];
        return (A.includes(w[0]) && A.includes(w[1])) || (B.includes(w[0]) && B.includes(w[1])); });
      if(zus.some(y => gew(w[0], y)) || zus.length === 1) falsch.push(s.id + ' keine Premiere');
      if(zus.length && t.indexOf('nach ' + zus.length + ' Niederlagen zu zweit') < 0) falsch.push(s.id + ' Premiere zählt nicht ' + zus.length);
    }
    // Der Rollentausch: unter einem Viertel der eigenen Partien vorher auf
    // dieser Seite, ab zwanzig.
    if(zeigt('rolle')){
      const pid = a.x.pid, r = m[['a1','a2','b1','b2'].find(k => m[k] === pid) + '_side'];
      const ei = vor.slice(0, -1).filter(y => [y.a1,y.a2,y.b1,y.b2].includes(pid));
      const dort = ei.filter(y => y[['a1','a2','b1','b2'].find(k => y[k] === pid) + '_side'] === r).length;
      if(ei.length < 20 || dort / ei.length >= 0.25 || t.indexOf(dort + ' von ' + ei.length + ' Partien') < 0) falsch.push(s.id + ' Rolle');
    }
    // Die Rivalität zählt jede Begegnung bis zu dieser.
    if(zeigt('duell')){
      const g = vor.filter(x => { const A = [x.a1,x.a2], B = [x.b1,x.b2];
        return (A.includes(a.x.a) && B.includes(a.x.b)) || (B.includes(a.x.a) && A.includes(a.x.b)); }).length;
      if(t.indexOf(': ' + g + ' Begegnung') < 0) falsch.push(s.id + ' Rivalität nennt nicht ' + g);
    }
    // Was die Zeichnung zeigt, sagt der Satz nicht.
    const satz = (html.match(/class="nf-d">([\\s\\S]*?)<\\/div>/) || [,''])[1].replace(/<[^>]+>/g, '');
    // Der allgemeine Satz aus Siegchance und Elo-Gewinn steht unter keiner
    // Partie-Karte mehr: die Zeichnung zeigt das eine oder das andere, und
    // derselbe Satz unter dreißig Karten sagt nichts [§C33]. Nur „Zwei Welten"
    // nennt den Gewinn beider Sieger, weil seine Zeichnung die Elo VORHER zeigt.
    if(/Siegchance lag/.test(satz)) falsch.push(s.id + ' Satz wiederholt die Siegchance');
    if(form !== 'gefaelle' && /bringt der Sieg/.test(satz)) falsch.push(s.id + ' Satz wiederholt die Elo');
  });
  // Gestellt, weil das Fenster sie nicht trägt: der Spitzenwechsel und die
  // Auszeichnung einer Partie.
  const sp = reihe.find(m => { const r = getRankSnapshots()[m.id];
    return r && w1(m, r); });
  function w1(m, r){ const w = m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
    return w.some(p => r.postRank[p] === 1 && r.preRank[p] > 1); }
  let spitze = '';
  if(sp){
    const r = getRankSnapshots()[sp.id];
    const neu = Object.keys(r.postRank).find(p => r.postRank[p] === 1);
    const alt = Object.keys(r.preRank).find(p => r.preRank[p] === 1);
    spitze = text(_spTabelleBild(_spTabelleDaten({m:sp, x:{newLeader:neu, prevLeader:alt}}, true)));
    spitze = spitze.indexOf(pmap()[neu].name + ' steigt von ' + r.preRank[neu] + ' auf 1 und führt') >= 0 ? 'ok' : spitze;
  }
  // Eine echte wiederholbare Auszeichnung statt eines kuenstlichen fuenften
  // Debuets ohne Partie. Erstvergabe und Wiederholung sind zwei Formen:
  // historische Traeger beim ersten Mal, persoenliche Zahl an der Marke.
  const bMap = getBadgeEarnedCache(), medFolgen = new Map();
  reihe.forEach(m => (bMap[m.id] || []).forEach(ev => {
    if(!['rare','legendary'].includes(rarityOf(ev.badge.id))) return;
    const k = ev.playerId + '|' + ev.badge.id;
    if(!medFolgen.has(k)) medFolgen.set(k, []);
    const folge = medFolgen.get(k);
    if(!folge.some(x => x.m.id === m.id)) folge.push({m, ev});
  }));
  const medFolge = [...medFolgen.values()].find(f => f.length >= 5);
  let medPasst = false;
  if(medFolge){
    const ev = medFolge[0].ev, x = {pid:ev.playerId, badgeId:ev.badge.id};
    const ersteDaten = _spMedailleDaten({m:medFolge[0].m, x});
    const markeDaten = _spMedailleDaten({m:medFolge[4].m, x});
    const erste = _spMedailleBild(ersteDaten), marke = _spMedailleBild(markeDaten);
    const traeger = new Set();
    reihe.slice(0, reihe.indexOf(medFolge[0].m) + 1).forEach(m => (bMap[m.id] || []).forEach(y => {
      if(y.badge.id === ev.badge.id && activePlayers().some(p => p.id === y.playerId)) traeger.add(y.playerId);
    }));
    const name = pmap()[ev.playerId].name;
    medPasst = ersteDaten.rang === 1 && !ersteDaten.wiederholung
      && erste.includes(esc(ev.badge.name)) && marke.includes(esc(ev.badge.name))
      && ersteDaten.traeger.slice().sort().join() === [...traeger].sort().join()
      && !/sp-md-wieder/.test(erste)
      && text(erste).includes(traeger.size + ' von ' + activePlayers().length + ' tragen sie')
      && text(erste).includes(name + ' zum ersten Mal')
      && markeDaten.rang === 5 && markeDaten.wiederholung
      && markeDaten.marken.join() === '1,5,10'
      && /class="sp-fk sp-md (viol|gold) sp-md-wieder"/.test(marke)
      && text(marke).includes(name + ' 5. Mal')
      && text(marke).includes('noch 5 bis zur 10.')
      && !/zum ersten Mal/.test(text(marke));
  }
  // Holten zwei sie in derselben Partie, nannte die Medaille nur den, dessen
  // Meldung zuerst kam. Gesucht an der ganzen Liga: jede Partie, in der mehr
  // als einer dieselbe seltene oder legendäre holte, jeder mit dem
  // wievielten Mal, nachgezählt an den rohen Vergaben.
  const zaehl = {}, mehrere = [];
  reihe.forEach(m => {
    const je = {};
    (bMap[m.id] || []).forEach(ev => {
      const k = ev.playerId + '|' + ev.badge.id;
      if((je[ev.badge.id] = je[ev.badge.id] || new Set()).has(ev.playerId)) return;
      je[ev.badge.id].add(ev.playerId); zaehl[k] = (zaehl[k] || 0) + 1; });
    Object.keys(je).forEach(b => { if(je[b].size > 1 && ['rare','legendary'].includes(rarityOf(b)))
      mehrere.push({m, b, soll:[...je[b]].map(p => p + ':' + zaehl[p + '|' + b])}); });
  });
  const mehrFalsch = mehrere.filter(x => {
    const d = _spMedailleDaten({m:x.m, x:{pid:x.soll[0].split(':')[0], badgeId:x.b}}), h = _spMedailleBild(d);
    const ist = ((d && d.alle) || []).map(y => y.pid + ':' + y.rang);
    return ist.slice().sort().join() !== x.soll.slice().sort().join()
      || x.soll.some(y => { const [p, r] = y.split(':');
        return !text(h).includes(pmap()[p].name + ' ' + (+r > 1 ? r + '. Mal' : 'zum ersten Mal')); });
  }).map(x => x.m.id + ' ' + x.b);
  const ser = [_newsSerienBand(4, false, true), _newsSerienBand(8, false, true),
               _newsSerienBand(6, true, true), _newsSerienBand(5, false, false)];
  const leer = h => (h.match(/<i class="x">/g) || []).length;
  // Der Rollentausch kommt im Fenster nicht vor; gestellt an der ganzen
  // Ligageschichte, jede Fundstelle aus den rohen Partien nachgerechnet.
  const ro = reihe.map(m => [m, _spRolleDaten(m)]).filter(x => x[1]);
  const roFalsch = ro.filter(([m, d]) => {
    const vorher = reihe.slice(0, reihe.indexOf(m)).filter(y => [y.a1,y.a2,y.b1,y.b2].includes(d.pid));
    const pos = y => y[['a1','a2','b1','b2'].find(k => y[k] === d.pid) + '_side'];
    const dort = vorher.filter(y => pos(y) === pos(m)).length;
    return !gew(d.pid, m) || vorher.length < 20 || dort !== d.dort || dort / vorher.length >= 0.25
      || text(_spRolleBild(d)).indexOf(dort + ' von ' + vorher.length + ' Partien') < 0;
  }).map(x => x[0].id);
  return {n, falsch, wiederholt, formen, spitze, feldN, rolle:{n:ro.length, falsch:roFalsch},
    gestellt: medPasst, medMehrere:{n:mehrere.length, falsch:mehrFalsch},
    ser: ser.map(h => leer(h) + (/Marke (\\d+)/.exec(h) || [,'-'])[1])};
})())`));
const _formZahl = Object.keys(_bogen.formen).length;
const _formMax = Math.max(0, ...Object.values(_bogen.formen));
ok(_bogen.n > 0 && _bogen.falsch.length === 0,
   'jede Partie-Karte trägt Kopf und Fuß ihres Anlasses, die mit den Partien stimmen, und der Satz wiederholt sie nicht',
   _bogen.falsch.slice(0, 2).join(' | ') || _bogen.n + ' Karten');
ok(_formZahl >= 6 && _formMax <= _bogen.n * 0.45,
   'die gespeicherten Scoregrafiken variieren deutlich statt fast immer Standard zu sein',
   JSON.stringify(_bogen.formen));
ok(_bogen.wiederholt.length === 0,
   'die Anlassgrafik wiederholt weder die Teamnamen des Scorekopfs noch den abgeschnittenen Duo-Text',
   _bogen.wiederholt.join(' | ') || 'keine Doppelung');

// Die neue Scoreebene hat einen strengeren Redaktionsfilter als die
// historischen 13 Formen: Mosaik nur mit benanntem statistischem Befund,
// Elo-Transfer nur in den obersten fuenf Prozent und mit Abstand zueinander.
// Gezählt wird die Kette selbst, ohne Bestand. Der Generator wählt die
// Köpfe seines Fensters ab einem Vorlauf davor (`SP_SCORE_VORLAUF`), und
// eine volle Kette ab der ersten Partie trifft an der Grenze zu diesen
// Karten nicht immer dieselbe Wahl: gemessen stand dort einmal dasselbe
// Tauziehen zweimal, zwischen einer Partie vor dem Fenster, die keine
// Karte mehr hat, und der ersten Karte darin. Dass der Bestand die Spur
// trägt, prüfen die beiden Zusicherungen weiter unten.
const _scoreWahl = JSON.parse(K.eval(`JSON.stringify((function(){
  const _bestand = _cache._stories;
  invalidateCache(); _cache._stories = [];
  try {
  const reihe = [...matches].sort((a,b) => mts(a) - mts(b));
  const zahl = {}, falsch = [], transferBei = [], spur = [];
  reihe.forEach((m, i) => {
    const w = _spScoreWahl(m), snap = _spScoreSnapshot(m);
    spur.push(w.key);
    zahl[w.key] = (zahl[w.key] || 0) + 1;
    if(w.key === 'mosaik'){
      const d = snap.data || {}, h = _spScoreBild(snap);
      if(!['selten','haeufig','marke'].includes(d.grund)
         || !/SELTENER AUSGANG|HÄUFIGSTER AUSGANG|RUNDE ZAHL/.test(h))
        falsch.push(m.id + ' Mosaik ohne Befund');
    }
    // Elo-Transfer, Klapptafel, Ergebniszeile, Abstand und Weste kommen aus
    // der Wahl nicht mehr: sie zeigten die Verlierer links oder sagten, was
    // jede Ansicht zeigt.
    if(['transfer', 'krimi', 'zeile', 'abstand', 'weste'].includes(w.key)){
      transferBei.push(i); falsch.push(m.id + ' alter Kopf ' + w.key);
    }
  });
  const eng = transferBei.some((v, i) => i && v - transferBei[i - 1] < 5);
  const doppelt = spur.filter((k, i) => i && k === spur[i - 1]);
  // „Zwei Welten" je Duo: dieselben zwei Sieger auf dreißig Karten nur einmal.
  const welten = [];
  reihe.forEach((m, i) => { if(spur[i] !== 'gefaelle') return;
    const duo = _spSieger(m).slice().sort().join();
    const vor = reihe.slice(Math.max(0, i - 30), i).findIndex((y, j) => spur[Math.max(0, i - 30) + j] === 'gefaelle'
      && _spSieger(y).slice().sort().join() === duo);
    if(vor >= 0) welten.push(m.id + ' ' + duo.split(',').map(pname).join(' und ')); });
  const GRUND = ['tafel', 'strom', 'balken', 'feld'];
  const SPEZIAL = ['herz', 'deutlich', 'aussenseiter', 'zunull'];
  const grund = GRUND.map(k => zahl[k] || 0);
  const gewoehnlich = Object.keys(zahl).filter(k => !SPEZIAL.includes(k)).map(k => [k, zahl[k]])
    .sort((a, b) => b[1] - a[1])[0];
  return {n:reihe.length, zahl, falsch, transfer:transferBei.length, eng,
          doppelt:doppelt.length, welten, grund, gewoehnlich};
  } finally { invalidateCache(); _cache._stories = _bestand; }
})())`));
ok(_scoreWahl.falsch.length === 0,
   'das Mosaik erscheint nur mit einem belegten Befund, und kein Kopf kommt aus der Zeit vor dem Katalog',
   _scoreWahl.falsch.slice(0, 4).join(' | ') || JSON.stringify(_scoreWahl.zahl));
ok(_scoreWahl.doppelt === 0,
   'neue Scoregrafiken wiederholen sich nicht direkt hintereinander',
   _scoreWahl.doppelt + ' Wiederholungen · ' + JSON.stringify(_scoreWahl.zahl));
// Die Grundansichten einer gewöhnlichen Partie wechseln sich ab, statt dass
// die mit dem höchsten Gewicht gewinnt: der Tacho stand auf 69 von 466
// Karten, das Spielfeld auf vier. Die vier, die für jede Partie gelten
// (Anzeigetafel, Elo-Strom, Torpucks, Spielfeld), stehen gleich oft, und
// kein Kopf ohne besonderen Ausgang steht auf mehr als jeder zehnten Karte.
ok(Math.min(..._scoreWahl.grund) > 0 && Math.max(..._scoreWahl.grund) <= 1.5 * Math.min(..._scoreWahl.grund)
   && _scoreWahl.gewoehnlich[1] <= _scoreWahl.n / 10,
   'die Grundansichten wechseln sich ab, und kein gewöhnlicher Kopf steht auf mehr als jeder zehnten Karte',
   'Tafel, Strom, Balken, Feld ' + _scoreWahl.grund.join('/') + ' · am häufigsten '
   + _scoreWahl.gewoehnlich.join(' ') + ' von ' + _scoreWahl.n);
ok(_scoreWahl.welten.length === 0,
   'ein Duo gewinnt nicht zweimal in dreißig Karten „als ungleiches Paar“',
   _scoreWahl.welten.slice(0, 3).join(' | ') || (_scoreWahl.zahl.gefaelle || 0) + ' Karten');

// Ein Zustand, der über viele Partien gilt — eine Serie, die Serie eines
// Duos, eine Rivalität —, steht als Fuß nicht auf zwei Karten hintereinander.
// Er stand, sobald er zutraf: die Siegesserie auf zwölf von 43 Karten, an
// einem Tag dreimal.
// Gezählt wird an denselben zwei Stichtagen wie oben: zwei Wochen Partien
// allein sind zu wenig für eine Verteilung — am 27.08. stand der Fuß des
// Angstgegners auf 8 von 52 Karten, sobald Höchststand und Tabellensprung
// dort fehlten [§C44].
const _fussRechnung = `(function(){
  const karten = _buildStories().filter(s => (s.dataRef||{}).type === 'spiel' && s.dataRef.visual)
    .sort((a, b) => a.when - b.when);
  const fuss = karten.map(s => (s.dataRef.visual.occasion || {}).key || '-');
  const ZUSTAND = ['serie', 'teamserie', 'duell'];
  const zahl = {}; fuss.forEach(k => { zahl[k] = (zahl[k] || 0) + 1; });
  return {n:fuss.length, zahl, folge:fuss.filter((k, i) => i && ZUSTAND.includes(k) && fuss[i - 1] === k).length};
})`;
const _fussJuli = _amErsten(new RealDate(2026, 6, 22, 23, 0, 0).getTime(), `
  const alle = matches.slice();
  matches = alle.filter(m => mts(m) <= Date.now()); invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  try { return ${_fussRechnung}(); } finally { matches = alle; }`);
const _fussJetzt = JSON.parse(K.eval(`JSON.stringify(${_fussRechnung}())`));
const _fussFolge = (() => {
  const zahl = {};
  [_fussJuli, _fussJetzt].forEach(f => Object.keys(f.zahl).forEach(k => { zahl[k] = (zahl[k] || 0) + f.zahl[k]; }));
  return {n:_fussJuli.n + _fussJetzt.n, zahl, folge:_fussJuli.folge + _fussJetzt.folge,
    max:Math.max(...Object.keys(zahl).filter(k => k !== '-').map(k => zahl[k]))};
})();
ok(_fussFolge.n >= 30 && _fussFolge.folge === 0 && _fussFolge.max <= _fussFolge.n * .15,
   'Serie, Duo-Serie und Rivalität stehen als Fuß nicht zweimal hintereinander, und kein Fuß steht auf mehr als jeder siebten Karte',
   _fussFolge.folge + ' hintereinander · ' + JSON.stringify(_fussFolge.zahl));

// Die vorherigen Formen kommen aus dem veroeffentlichten Bestand. Zwei
// alte Spielfelder muessen auch nach geaenderten Auswahlregeln als solche
// zaehlen; die erste neue Karte bleibt nach zwei weiteren Partien bytegleich.
const _publizierteForm = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches, bestand = _cache._stories, letzte = alle[alle.length - 1];
  const alt = alle.slice(-2).map(m => ({id:'spiel_'+m.id, when:new Date(mts(m)),
    dataRef:{type:'spiel', matchId:m.id, visual:{version:2,
      score:{key:'feld', data:_spFeldDaten({m,c:_spChance(m)})}, occasion:null}}}));
  const neu = [8,5,5].map((score,i) => Object.assign({}, letzte, {
    id:'variation-'+i, games_a:10, games_b:score, winner:'A',
    created_at:new Date(mts(letzte)+(i+1)*60000).toISOString()}));
  const stand = ms => { matches=ms; invalidateCache(); _cache._stories=alt.slice(); };
  try {
    stand(alle.concat(neu[0]));
    const v = _spVisualSnapshot(neu[0], []), fest = _storyStableJson(v);
    const s = {id:'spiel_'+neu[0].id, when:new Date(mts(neu[0])),
      dataRef:{type:'spiel',matchId:neu[0].id,visual:v}};
    matches=alle.concat(neu); invalidateCache(); _cache._stories=[s].concat(alt);
    const spur = neu.map(m => _spVisualSnapshot(m, []).score.key);
    const stabil = _storyStableJson(_spVisualSnapshot(neu[0], [])) === fest;
    const vor = spur.join();
    invalidateCache(); _cache._stories=[s].concat(alt);
    const kalt = neu.map(m => _spVisualSnapshot(m, []).score.key).join();
    return {spur, erster:v.score.key, stabil, kalt:vor===kalt,
      alteFest:alt.every(s => _storyStableJson(_spScoreSnapshot(matches.find(m=>m.id===s.dataRef.matchId)))
        === _storyStableJson(s.dataRef.visual.score))};
  } finally { matches=alle; invalidateCache(); _cache._stories=bestand; }
})())`));
ok(_publizierteForm.erster !== 'feld' && new Set(_publizierteForm.spur).size >= 2
   && _publizierteForm.spur.every((k,i,a) => !i || k !== a[i-1]),
   'drei neue Testpartien beruecksichtigen die gespeicherten Spielfelder und variieren ihre Scoregrafik',
   _publizierteForm.spur.join(' → '));
ok(_publizierteForm.stabil && _publizierteForm.kalt && _publizierteForm.alteFest,
   'publizierte Grafikdaten bleiben nach weiteren Partien und beim Kaltstart identisch');

// Der Kopf einer neuen Partie rechnet nicht die ganze Liga nach. Der
// Durchlauf fing bei der ersten Partie an, und weil der Bestand nur einen
// Monat zurückreicht, wählte er bei jedem neuen Datenstand jeden älteren
// Kopf noch einmal: mit vier Jahren Liga 3642 Wahlen für einen Spieltag.
// Veröffentlicht sind hier die 150 Karten vor den fünf jüngsten Partien,
// mit den Köpfen der vollen Kette; die fünf jüngsten fragt man wie der
// Generator, die neueste zuerst. Sie bekommen dieselben Köpfe wie in der
// vollen Kette, und gewählt wird nur im Vorlauf und für sie selbst.
const _vorlauf = JSON.parse(K.eval(`JSON.stringify((function(){
  const bestand = _cache._stories, orig = _spScoreKandidaten;
  try {
    invalidateCache(); _cache._stories = [];
    const reihe = _spBasis().chrono.slice(), n = reihe.length;
    reihe.forEach(m => _spScoreWahl(m));
    const voll = new Map(reihe.map(m => [m.id, _spScoreSnapshot(m)]));
    const pub = reihe.slice(n - 155, n - 5).map(m => ({id:'spiel_' + m.id, when:new Date(mts(m)),
      dataRef:{type:'spiel', matchId:m.id, visual:{version:2, score:voll.get(m.id), occasion:null}}}));
    let wahlen = 0;
    _spScoreKandidaten = function(m){ wahlen++; return orig(m); };
    invalidateCache(); _cache._stories = pub;
    const neu = reihe.slice(-5).reverse();
    const anders = neu.filter(m => _spScoreWahl(m).key !== voll.get(m.id).key).map(m => m.id);
    return {wahlen, grenze:SP_SCORE_VORLAUF + neu.length, vorher:n - 150, anders};
  } finally { _spScoreKandidaten = orig; invalidateCache(); _cache._stories = bestand; }
})())`));
ok(_vorlauf.wahlen <= _vorlauf.grenze && _vorlauf.anders.length === 0,
   'der Kopf einer neuen Partie wählt nur im Vorlauf neu und trifft dieselbe Wahl wie die volle Kette',
   _vorlauf.wahlen + ' Wahlen, erlaubt ' + _vorlauf.grenze + ' (ohne Vorlauf ' + _vorlauf.vorher + ')'
   + (_vorlauf.anders.length ? ' · anders: ' + _vorlauf.anders.join(', ') : ''));

// Dieselbe Rivalitaets-ID wird mit dem naechsten Duell neu berechnet. Der
// erste Snapshot muss an der alten Partie und seiner damaligen Zahl bleiben.
const _duellFest = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle=matches, bestand=_cache._stories;
  const r=_buildStories().find(s => (s.dataRef||{}).type==='rivalry');
  if(!r) return {fehlt:true};
  const alt=Object.assign({},r,{dataRef:Object.assign({},r.dataRef)});
  const mid=alt.dataRef.matchId, basis=matches.find(m=>m.id===mid);
  delete alt.dataRef.matchId;
  const snapshot=_storyStableJson(alt);
  const next=Object.assign({},basis,{id:'duell-naechstes',
    created_at:new Date(mts(alle[alle.length-1])+60000).toISOString()});
  const erg=m=>({id:'spiel_'+m.id,title:'Ergebnis',desc:'Das Ergebnis bleibt.',
    cat:'highlight',prio:41,when:new Date(mts(m)),dataRef:{type:'spiel',matchId:m.id}});
  try {
    matches=alle.concat(next); invalidateCache();
    const aktualisiert=Object.assign({},r,{when:new Date(mts(next)),
      dataRef:Object.assign({},r.dataRef,{matchId:next.id,n:r.dataRef.n+1})});
    const merged=_mergeStorySnapshots([alt,erg(basis)],[aktualisiert,erg(next)]);
    _cache._stories=merged;
    const karten=getStoriesCache();
    const k=karten.find(s=>s.dataRef.matchId===mid);
    const z=k && (k.dataRef.teile||[]).find(t=>t.id===r.id);
    const letzte=karten.find(s=>s.dataRef.matchId===next.id);
    return {fehlt:false,n:r.dataRef.n,stand:z && z.ref.n,match:z && z.matchId,mid,
      gewandert:!!(letzte && (letzte.dataRef.teile||[]).some(t=>t.id===r.id)),
      unveraendert:_storyStableJson(alt)===snapshot,
      generatorMatch:!!r.dataRef.matchId};
  } finally {matches=alle;invalidateCache();_cache._stories=bestand;}
})())`));
ok(!_duellFest.fehlt && _duellFest.generatorMatch && _duellFest.match===_duellFest.mid
   && _duellFest.stand===_duellFest.n && !_duellFest.gewandert && _duellFest.unveraendert,
   'eine Rivalitaetszahl bleibt nach dem naechsten Duell unveraendert an ihrer urspruenglichen Partie',
   JSON.stringify(_duellFest));
const _duellGleicheSekunde = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle=matches, bestand=_cache._stories;
  const r=_buildStories().find(s=>(s.dataRef||{}).type==='rivalry');
  if(!r) return {fehlt:true};
  const basis=matches.find(m=>m.id===r.dataRef.matchId);
  const alt=Object.assign({},r,{dataRef:Object.assign({},r.dataRef)});
  delete alt.dataRef.matchId;
  const next=Object.assign({},basis,{id:'duell-gleiche-sekunde'});
  try {
    matches=alle.concat(next); invalidateCache(); _cache._stories=[alt];
    const angezeigt=_consolidateStories([alt])[0];
    const neu=_buildStories().find(s=>s.id===r.id);
    // Das nächste Duell ist kein zehntes: es bekommt keine Rivalität, und die
    // gemeldete bleibt bei ihrem Duell. Vorher wanderte dieselbe ID mit der
    // Zahl plus eins weiter, und „zum 207. Mal" stand an jedem Spieltag.
    const weiter=_buildStories().filter(s=>(s.dataRef||{}).type==='rivalry'
      && s.dataRef.a===r.dataRef.a && s.dataRef.b===r.dataRef.b);
    return {fehlt:false,alt:angezeigt.dataRef.matchId===basis.id,
      neu:!neu || neu.dataRef.matchId===basis.id,
      n:weiter.every(s => s.dataRef.n % 10 === 0 && s.dataRef.matchId!==next.id)};
  } finally {matches=alle;invalidateCache();_cache._stories=bestand;}
})())`));
ok(!_duellGleicheSekunde.fehlt && _duellGleicheSekunde.alt
   && _duellGleicheSekunde.neu && _duellGleicheSekunde.n,
   'eine Rivalitaet gehoert ihrem zehnten Duell und wandert nicht zum naechsten',
   JSON.stringify(_duellGleicheSekunde));
// ── Die Formen der gewöhnlichen Partie über die ganze Liga [§C33] ────
// Eine Partie ohne Anlass bekam immer dasselbe Spielfeld oder dieselbe
// Ergebniszeile. Jetzt wählt `_spForm` aus dreizehn Formen. Geprüft wird
// an jeder gewöhnlichen Partie der Ligageschichte: dass die Regel jeder
// Form aus den rohen Partien stimmt, dass jede Zeichnung den Stand trägt,
// dass die Formen wechseln und dass eine Karte ihre Form behält, wenn
// danach weitergespielt wird.
const _formen = JSON.parse(K.eval(`JSON.stringify((function(){
  const reihe = [...matches].sort((a, b) => mts(a) - mts(b));
  const gew = (pid, m) => (m.winner === 'A') === (m.a1 === pid || m.a2 === pid);
  const dabei = (pid, m) => [m.a1, m.a2, m.b1, m.b2].includes(pid);
  const sieger = m => (m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2]).slice().sort().join();
  const verlierer = m => (m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2]).slice().sort().join();
  const feld = reihe.filter(m => _spIstFeld(m));
  const zahl = {}, falsch = [], ohneStand = [], moeglich = new Set();
  let folgeGleich = 0;
  const spur = [];
  feld.forEach(m => {
    const w = _spForm(m), x = w.x, i = reihe.indexOf(m), vor = reihe.slice(0, i + 1);
    const hoch = Math.max(m.games_a, m.games_b), tief = Math.min(m.games_a, m.games_b);
    zahl[w.key] = (zahl[w.key] || 0) + 1;
    _spFormKand(m).filter(c => !SP_FORM[c.key].v2).forEach(c => moeglich.add(c.key));
    // Zweimal hintereinander darf nur das Spielfeld stehen, und nur, wenn
    // sonst keine Form auf die Partie passt.
    // Die alte Kette kennt nur die dreizehn alten Formen (ohne v2).
    if(spur.length && spur[spur.length - 1] === w.key && _spFormKand(m).filter(c => !SP_FORM[c.key].v2).length > 1) folgeGleich++;
    spur.push(w.key);
    const html = _spFormBild(m).html;
    // Das Spielfeld zeigt den Stand in Spielrichtung, den Sieger hell (_spStand).
    const stand = w.key === 'feld' ? _spStand({sa:m.games_a, sb:m.games_b, aw:m.winner === 'A'}) : '<em>' + hoch + '</em>:' + tief + '</b>';
    if(html.indexOf(stand) < 0) ohneStand.push(m.id + '/' + w.key);
    // Alle vier Namen stehen da, in der Zeichnung oder darunter.
    const pm = pmap();
    if([m.a1, m.a2, m.b1, m.b2].some(id => html.indexOf(esc(pm[id].name)) < 0)) ohneStand.push(m.id + '/' + w.key + ' ohne alle Namen');
    // Der Satz wiederholt nicht, was die Zeichnung zeigt: keine Siegchance
    // vor dem Anstoß, kein Elo-Gewinn — außer bei Zwei Welten, deren
    // Zeichnung die Elo VORHER zeigt.
    const satz = ((x => _spIstFeld(x) ? SP_FORM[_spForm(x).key].text(_spFakten(x), _spForm(x).x) : null)(m) || {}).d || '';
    if(/Siegchance/.test(satz) || (w.key !== 'gefaelle' && /bringt der Sieg/.test(satz))) falsch.push(m.id + ' Satz wiederholt ' + w.key);
    if(w.key === 'mosaik' && !(hoch === 10 && hoch - tief >= 2 && hoch - tief <= 3)) falsch.push(m.id + ' Mosaik ' + hoch + ':' + tief);
    if(w.key === 'tacho' && !(_spChance(m) >= 0.62 && hoch - tief < 6)) falsch.push(m.id + ' Tacho');
    if(w.key === 'zaehlwerk'){
      if(!x.wer){ if(x.wert !== i + 1 || x.wert % 100) falsch.push(m.id + ' Zählwerk Liga ' + x.wert); }
      else {
        const eig = vor.filter(y => dabei(x.wer, y)), n = x.sieg ? eig.filter(y => gew(x.wer, y)).length : eig.length;
        if(n !== x.wert || x.wert % 50 || (x.sieg && !gew(x.wer, m))) falsch.push(m.id + ' Zählwerk ' + n + ' statt ' + x.wert);
      }
    }
    if(w.key === 'revanche'){
      const z = vor.slice(0, -1).filter(y => [sieger(y), verlierer(y)].sort().join('|') === [sieger(m), verlierer(m)].sort().join('|')).pop();
      if(!z || sieger(z) !== verlierer(m)) falsch.push(m.id + ' Revanche');
      const seit = _spSeit(mts(m) - mts(z || m));
      if(z && _spRevancheBild(SP_FORM.revanche.daten(_spFakten(m), x)).indexOf('nach ' + seit.n + ' ' + seit.e) < 0) falsch.push(m.id + ' Revanche ohne Abstand');
    }
    if(w.key === 'gipfel'){
      const r = getRankSnapshots()[m.id], pre = [m.a1, m.a2, m.b1, m.b2].map(id => r && r.preRank[id]);
      if(!pre.includes(1) || !pre.includes(2)) falsch.push(m.id + ' Gipfel ohne 1 und 2');
    }
    if(w.key === 'rueckkehr'){
      const eig = vor.filter(y => dabei(x.id, y)), v = eig[eig.length - 2];
      if(!gew(x.id, m) || !v || (mts(m) - mts(v)) / 86400000 < 10) falsch.push(m.id + ' Rückkehr');
    }
    if(w.key === 'tagesring'){
      const tag = vor.filter(y => tagKey(y.created_at) === tagKey(m.created_at) && dabei(x.id, y));
      if(tag.length < 4 || tag.filter(y => gew(x.id, y)).length / tag.length < 0.75 || !gew(x.id, m)) falsch.push(m.id + ' Tagesring');
    }
  });
  // Was einmal dasteht, bleibt stehen: dieselbe Partie, nur ohne alles,
  // was danach gespielt wurde, ergibt dieselbe Form und dieselbe Zeile.
  const alle = matches, stich = feld.filter((m, k) => k % Math.max(1, Math.floor(feld.length / 10)) === 3).slice(0, 10);
  const wackelt = [];
  const voll = stich.map(m => ({id:m.id, k:_spForm(m).key, t:((x => _spIstFeld(x) ? SP_FORM[_spForm(x).key].text(_spFakten(x), _spForm(x).x) : null)(m) || {}).t}));
  stich.forEach((m, k) => {
    matches = alle.filter(y => mts(y) <= mts(m)); invalidateCache();
    const mm = matches.find(y => y.id === m.id), jetzt = {k:_spForm(mm).key, t:((x => _spIstFeld(x) ? SP_FORM[_spForm(x).key].text(_spFakten(x), _spForm(x).x) : null)(mm) || {}).t};
    if(jetzt.k !== voll[k].k || jetzt.t !== voll[k].t) wackelt.push(m.id + ' ' + voll[k].k + '→' + jetzt.k);
  });
  matches = alle; invalidateCache();
  return {n:feld.length, zahl, falsch, ohneStand, folgeGleich, wackelt, stich:stich.length,
    nieGewaehlt:[...moeglich].filter(k => !zahl[k])};
})())`));
const _formWerte = Object.values(_formen.zahl);
ok(_formen.n > 50 && !_formen.falsch.length,
   'jede Form der gewöhnlichen Partie stimmt mit den rohen Partien, und ihr Satz wiederholt nicht die Zeichnung',
   _formen.falsch.slice(0, 3).join(' | ') || _formen.n + ' Partien');
ok(_formen.ohneStand.length === 0,
   'jede Form trägt den Stand der Partie und alle vier Namen, den Sieger zuerst',
   _formen.ohneStand.slice(0, 4).join(', ') || 'alle');
// Welche Form überhaupt passt, hängt an den Partien: „Rückkehr" trifft in
// den echten Partien zwei gewöhnliche Partien, und seit der Positionsbonus
// die Elo verschoben hat, tragen beide einen Ranglistensprung als Anlass.
// Gefordert ist deshalb, dass jede Form, die auf eine gewöhnliche Partie
// zutrifft, auch irgendwo steht, und dass es mindestens zwölf sind — nicht
// eine feste Zahl, die an zwei Partien hängt.
ok(!_formen.nieGewaehlt.length && Object.keys(_formen.zahl).length >= 12 && Math.max(..._formWerte) <= _formen.n * 0.25
   && (_formen.zahl.feld || 0) <= _formen.n * 0.15 && _formen.folgeGleich === 0,
   'die Formen wechseln: jede, die irgendwo passt, kommt vor, keine trägt ein Viertel, das Spielfeld ist selten, keine zweimal hintereinander, wo eine andere passt',
   JSON.stringify(_formen.zahl) + ' · gleich hintereinander ' + _formen.folgeGleich
   + (_formen.nieGewaehlt.length ? ' · passt, steht nie: ' + _formen.nieGewaehlt.join(', ') : ''));
ok(_formen.stich >= 8 && !_formen.wackelt.length,
   'eine Partie behält Form und Schlagzeile, wenn danach weitergespielt wird',
   _formen.wackelt.join(', ') || _formen.stich + ' Stichproben');
ok(_bogen.rolle.n >= 3 && !_bogen.rolle.falsch.length,
   'der Rollentausch ist ein Sieg auf einer Seite, die vorher unter einem Viertel der eigenen Partien lag',
   _bogen.rolle.n + ' Fundstellen, falsch: ' + _bogen.rolle.falsch.slice(0, 3));
ok(_bogen.spitze === 'ok' && _bogen.gestellt,
   'der Spitzenwechsel zeigt vorher und nachher, die Erstvergabe historische Träger und die Wiederholung ihre Zahl',
   String(_bogen.spitze).slice(0, 120) + ' · Medaille ' + String(_bogen.gestellt));
ok(_bogen.medMehrere.n > 0 && _bogen.medMehrere.falsch.length === 0,
   'holen mehrere dieselbe Auszeichnung in einer Partie, nennt die Medaille jeden mit dem wievielten Mal',
   _bogen.medMehrere.n + ' Partien' + (_bogen.medMehrere.falsch.length ? ': ' + _bogen.medMehrere.falsch.join(', ') : ''));
ok(_bogen.ser.join() === '15,210,0-,0-',
   'der Lauf zeigt die nächste Marke als leere Felder, eine Pleitenserie hat keine',
   _bogen.ser.join(' · '));

// ── Das Blatt einer Serie [§C33] ────────────────────────────────────
// Es zeigte die Serie als Punktreihe und darunter Zahlen in Zeilen, und
// welche Partien die Serie waren, stand nirgends. Jetzt steht jede Partie
// des Laufs darin. Nachgerechnet an jeder Serienmarke der Ligageschichte:
// genau so viele Zeilen, wie die Serie lang ist, jede mit dem richtigen
// Ausgang aus Sicht des Trägers, ohne Lücke, und davor war die Serie nicht
// schon länger. Beim Serienbruch kommt die Partie dazu, die sie beendet.
const _serBlatt = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories(), falsch = [], typen = {};
  let n = 0;
  const TYP = {win_streak:1, loss_streak:1, team_streak:1, team_loss_streak:1, streak_killer:1};
  roh.filter(s => TYP[(s.dataRef||{}).type] && (s.dataRef||{}).matchId).forEach(s => {
    const d = s.dataRef, t = d.type, m = matches.find(x => x.id === d.matchId);
    if(!m) return;
    n++; typen[t] = 1;
    const html = _newsDetailBody(s);
    const zeilen = [...html.matchAll(/class="nd-pz (w|l)" data-mid="([^"]+)"/g)].map(x => ({w:x[1] === 'w', id:x[2]}));
    const pid = t === 'streak_killer' ? d.victimPid : (d.pid || d.a), partner = t === 'team_streak' || t === 'team_loss_streak' ? d.b : null;
    const sieg = t === 'win_streak' || t === 'team_streak' || t === 'streak_killer';
    const gew = y => (y.winner === 'A') === [y.a1, y.a2].includes(pid);
    const reihe = [...matches].sort((a, b) => mts(a) - mts(b)).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(pid)
      && (!partner || ([y.a1, y.a2].includes(pid) && [y.a1, y.a2].includes(partner)) || ([y.b1, y.b2].includes(pid) && [y.b1, y.b2].includes(partner))));
    const bis = reihe.findIndex(y => y.id === m.id);
    const lauf = t === 'streak_killer' ? reihe.slice(bis - d.streak, bis) : reihe.slice(bis - d.streak + 1, bis + 1);
    const soll = (t === 'streak_killer' ? lauf.concat([m]) : lauf).map(y => ({w:gew(y), id:y.id}));
    if(JSON.stringify(zeilen.slice(0, soll.length)) !== JSON.stringify(soll) || lauf.some(y => gew(y) !== sieg))
      falsch.push(s.id + ' Lauf');
    const davor = reihe[reihe.indexOf(lauf[0]) - 1];
    if(davor && gew(davor) === sieg) falsch.push(s.id + ' beginnt mitten in der Serie');
    if(t !== 'streak_killer' && html.indexOf('<b class="num">' + d.streak + '</b><span>') < 0) falsch.push(s.id + ' ohne Zahl');
  });
  return {n, falsch, typen:Object.keys(typen).length};
})())`));
ok(_serBlatt.n >= 10 && _serBlatt.typen === 5 && _serBlatt.falsch.length === 0,
   'das Blatt einer Serie zeigt jede Partie des Laufs, aus den rohen Partien nachgerechnet',
   _serBlatt.falsch.slice(0, 3).join(' | ') || _serBlatt.n + ' Serienblätter aus ' + _serBlatt.typen + ' Typen');

// ── Das Blatt einer Rivalität und einer Auszeichnung [§C33] ─────────
// Die Rivalität zählt ihre Duelle und die Bilanz bis zur Partie der Karte,
// nachgerechnet aus den rohen Partien; die Auszeichnung zeigt jeden Spieler
// der Liga als Feld, hell, wer sie trägt, und gerahmt, wer sie hier geholt hat.
const _rvBd = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories(), falsch = [];
  let rv = 0, bd = 0;
  roh.filter(s => /^rivalry/.test((s.dataRef||{}).type || '')).forEach(s => {
    const d = s.dataRef, m = d.matchId ? matches.find(x => x.id === d.matchId) : null;
    const html = _newsDetailBody(s); rv++;
    const l = [...matches].sort((x, y) => mts(x) - mts(y)).filter(y => (!m || mts(y) <= mts(m))
      && (([y.a1, y.a2].includes(d.a) && [y.b1, y.b2].includes(d.b)) || ([y.b1, y.b2].includes(d.a) && [y.a1, y.a2].includes(d.b))));
    const sa = l.filter(y => (y.winner === 'A') === [y.a1, y.a2].includes(d.a)).length;
    const tau = (html.match(/class="nd-rv-tau"><b class="num">(\\d+)<\\/b>[\\s\\S]*?<b class="num">(\\d+)<\\/b>/) || []).slice(1).map(Number);
    const n = +(html.match(/class="nd-rv-m"><b class="num">(\\d+)</) || [])[1];
    if(n !== l.length || tau[0] !== sa || tau[1] !== l.length - sa) falsch.push(s.id + ' ' + n + ' ' + tau + ' statt ' + l.length + ' ' + sa);
  });
  roh.filter(s => (s.dataRef||{}).type === 'badge_unlocked').forEach(s => {
    const d = s.dataRef, html = _newsDetailBody(s); bd++;
    const ids = Object.keys(pmap()).filter(id => !pmap()[id].hidden);
    const hat = ids.filter(id => (getCachedBadges(id) || []).some(b => b.id === d.badgeId));
    const felder = [...html.matchAll(/<span class="(hat)?( dies)?" data-pid="([^"]+)"/g)];
    const pids = (d.playerIds && d.playerIds.length) ? d.playerIds : [d.playerId];
    if(felder.length !== ids.length || felder.filter(f => f[1]).length !== hat.length
      || felder.some(f => !!f[1] !== hat.includes(f[3]) || !!f[2] !== pids.includes(f[3])) || html.indexOf('Elo aus dieser Partie') >= 0)
      falsch.push(s.id + ' Träger');
  });
  return {rv, bd, falsch};
})())`));
ok(_rvBd.rv > 0 && _rvBd.bd > 0 && _rvBd.falsch.length === 0,
   'das Blatt einer Rivalität zählt Duelle und Bilanz bis zu ihrer Partie, das einer Auszeichnung zeigt jeden Träger der Liga',
   _rvBd.falsch.slice(0, 3).join(' | ') || _rvBd.rv + ' Rivalitäten, ' + _rvBd.bd + ' Auszeichnungen');

// ── Spieler des Tages, Woche, Endspurt, Runde [§C33] ────────────────
// Das Feld des Tages aus den rohen Partien: jeder, der an dem Tag spielte,
// mit Siegen von Partien. Die Woche zeigt jede Wertung mit Gesicht und Zahl,
// ohne den Satz darunter; der Endspurt seine Tage und den Abstand; die Runde
// keine Legende, die ihre Zeichnung erklärt.
const _blk5 = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories(), falsch = [], n = {potd:0, woche:0, end:0, runde:0};
  roh.filter(s => (s.dataRef||{}).type === 'potd').forEach(s => {
    const d = s.dataRef, b = _newsDetailBody(s); n.potd++;
    const tag = matches.filter(y => tagKey(y.created_at) === d.dayKey), z = {};
    tag.forEach(y => [y.a1, y.a2, y.b1, y.b2].forEach(id => { z[id] = z[id] || [0, 0]; z[id][1]++;
      if((y.winner === 'A') === [y.a1, y.a2].includes(id)) z[id][0]++; }));
    const ist = [...b.matchAll(/class="nd-bk-z[^"]*" data-pid="([^"]+)"[\\s\\S]*?<b class="num">(\\d+) von (\\d+)<\\/b>/g)];
    if(ist.length !== Object.keys(z).length || ist.some(x => !z[x[1]] || z[x[1]][0] !== +x[2] || z[x[1]][1] !== +x[3])) falsch.push(s.id + ' Feld');
    if(b.indexOf('nd-buehne') < 0 || b.indexOf('Siegquote</span>') >= 0) falsch.push(s.id + ' Bühne');
  });
  roh.filter(s => (s.dataRef||{}).type === 'woche').forEach(s => {
    const d = s.dataRef, b = _newsDetailBody(s); n.woche++;
    const z = (b.match(/class="nd-wo-z/g) || []).length;
    if(z !== (d.teile || []).length || b.indexOf('nw-satz') >= 0) falsch.push(s.id + ' Woche');
    (d.teile || []).forEach(t => { if(t.wert && b.indexOf(esc(t.wert)) < 0) falsch.push(s.id + ' ohne ' + t.label); });
  });
  roh.filter(s => (s.dataRef||{}).type === 'season_endgame').forEach(s => {
    const d = s.dataRef, b = _newsDetailBody(s); n.end++;
    if(b.indexOf('<b class="num">' + d.daysLeft + '</b>') < 0 || b.indexOf(d.gap + ' Elo') < 0) falsch.push(s.id + ' Endspurt');
  });
  roh.filter(s => (s.dataRef||{}).type === 'runde').forEach(s => { n.runde++;
    if(_newsRundeBlatt(s).indexOf('steht für') >= 0) falsch.push(s.id + ' Legende'); });
  return {n, falsch};
})())`));
ok(_blk5.n.potd > 0 && _blk5.n.woche > 0 && _blk5.n.end > 0 && _blk5.n.runde > 0 && _blk5.falsch.length === 0,
   'Spieler des Tages mit dem Feld des Tages aus den rohen Partien, die Woche mit Gesichtern ohne Satz, der Endspurt mit Tagen und Abstand, die Runde ohne Legende',
   _blk5.falsch.slice(0, 3).join(' | ') || JSON.stringify(_blk5.n));

// ── Die Runde der Vier [§C33, §11.6c] ────────────────────────────────
// Eine Runde ist ein Block von Partien ohne Pause über dreißig Minuten, in
// dem nur dieselben vier gespielt haben, mindestens dreimal. Sie ist eine
// eigene Story, die dreißig Minuten nach der letzten Partie entsteht — die
// Karten ihrer Partien bleiben daneben stehen, mit ihrem eigenen Bild.
// Nachgerechnet an den rohen Partien.
const _runde = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const feed = getStoriesCache();
  const reihe = [...matches].sort((a, b) => mts(a) - mts(b));
  const vier = m => [m.a1, m.a2, m.b1, m.b2].sort().join();
  const bl = []; let r = null;
  reihe.forEach(m => {
    if(r && mts(m) - r.t <= 1800000){ r.ms.push(m); r.t = mts(m); }
    else { r = {ms:[m], t:mts(m)}; bl.push(r); }
  });
  const seit = Date.now() - NEWS_FENSTER_TAGE * 86400000;
  const soll = bl.filter(x => x.ms.length >= 3 && new Set(x.ms.map(vier)).size === 1
    && x.t + 1800000 <= Date.now() && x.t >= seit);
  const ohne = bl.filter(x => x.t >= seit && (x.ms.length < 3 || new Set(x.ms.map(vier)).size > 1));
  const ist = roh.filter(s => (s.dataRef||{}).type === 'runde');
  const falsch = [];
  soll.forEach(x => {
    const st = ist.find(s => s.id === 'runde_' + x.ms[0].id);
    if(!st){ falsch.push(x.ms[0].id + ' ohne Runde'); return; }
    const d = st.dataRef;
    if(new Date(st.when).getTime() !== x.t + 1800000) falsch.push(st.id + ' Zeitpunkt');
    if(d.matchIds.join() !== x.ms.map(m => m.id).join()) falsch.push(st.id + ' Partien');
    if(st.desc.indexOf(datumFmt(mts(x.ms[0]), 'uhr')) < 0 || st.desc.indexOf(datumFmt(x.t, 'uhr')) < 0) falsch.push(st.id + ' ohne Uhrzeiten');
    vier(x.ms[0]).split(',').forEach(id => {
      const w = x.ms.filter(m => (m.winner === 'A') === (m.a1 === id || m.a2 === id)).length;
      const z = d.spieler.find(y => y.id === id);
      if(!z || z.w !== w || z.l !== x.ms.length - w) falsch.push(st.id + ' Bilanz');
    });
    if(!feed.some(s => s.id === st.id)) falsch.push(st.id + ' fehlt im Feed');
    // Jede Partie der Runde behält ihre eigene Karte.
    x.ms.forEach(m => { if(!feed.some(s => (s.dataRef||{}).matchId === m.id)) falsch.push(m.id + ' ohne eigene Karte'); });
    const html = _newsCardHtmlM2(feed.find(s => s.id === st.id) || st, false, false);
    // Die Karte fasst zusammen: je Partie ein Feld aus Uhrzeit und Stand,
    // keine Partie mit ihren Wappen — die steht direkt darunter auf ihrer
    // eigenen Karte — und keine Kleinschrift über der Schlagzeile.
    if((html.match(/class="sp-rs-z"/g) || []).length !== x.ms.length) falsch.push(st.id + ' Streifen');
    if(/Zusammenfassung von|class="sp-rd-was"/.test(html)) falsch.push(st.id + ' mit Kennzeile');
    if(/class="sp-rd-p[ "]/.test(html)) falsch.push(st.id + ' wiederholt die Partien');
    if((_newsRundeBlatt(st).match(/data-mid="/g) || []).length !== x.ms.length) falsch.push(st.id + ' Blatt');
  });
  ohne.forEach(x => { if(ist.some(s => s.id === 'runde_' + x.ms[0].id)) falsch.push(x.ms[0].id + ' ist keine Runde'); });
  // Gestellt an echten Partien: drei Partien derselben vier, dann eine
  // fremde zehn Minuten danach, dann zwei Partien, dann eine Runde, die erst
  // vor zwanzig Minuten endete.
  const echt = reihe.slice(-60);
  const [p, q] = [echt[0], echt.find(m => vier(m) !== vier(echt[0]))];
  const zeit = Date.now() - 6 * 3600000;
  const mk = (vor, i, min) => Object.assign({}, vor, {id:'tr' + i, created_at:new Date(zeit + min * 60000).toISOString()});
  const fall = (liste, jetzt) => { const alt = matches;
    try { matches = liste; return _newsRundenStories(jetzt).map(s => s.id + '@' + new Date(s.when).getTime()); }
    finally { matches = alt; } };
  const drei = fall([mk(p, 1, 0), mk(p, 2, 12), mk(p, 3, 25)], zeit + 3 * 3600000);
  const fremd = fall([mk(p, 1, 0), mk(p, 2, 12), mk(p, 3, 25), mk(q, 4, 35)], zeit + 3 * 3600000);
  const zwei = fall([mk(p, 1, 0), mk(p, 2, 12)], zeit + 3 * 3600000);
  const offen = fall([mk(p, 1, 0), mk(p, 2, 12), mk(p, 3, 25)], zeit + 45 * 60000);
  const zu = fall([mk(p, 1, 0), mk(p, 2, 12), mk(p, 3, 25)], zeit + 56 * 60000);
  return {soll: soll.length, ist: ist.length, falsch, ohne: ohne.length,
    gestellt: {drei, fremd, zwei, offen, zu}, ende: zeit + 55 * 60000};
})())`));
ok(_runde.soll >= 3 && _runde.ist === _runde.soll && _runde.falsch.length === 0,
   'jede abgeschlossene Runde der Vier ist eine eigene Story mit Uhrzeiten und Bilanz, fasst ihre Partien zusammen statt sie zu wiederholen, und jede Partie behält ihre Karte',
   _runde.falsch.slice(0, 3).join(' | ') || _runde.ist + ' Runden, ' + _runde.ohne + ' Blöcke ohne Runde');
const _rg = _runde.gestellt;
ok(_rg.drei.length === 1 && _rg.drei[0] === 'runde_tr1@' + _runde.ende && !_rg.fremd.length && !_rg.zwei.length
   && !_rg.offen.length && _rg.zu.length === 1,
   'eine Runde braucht drei Partien derselben vier ohne einen Fünften und entsteht dreißig Minuten nach der letzten',
   JSON.stringify(_rg));

console.log('=== DIE BLAETTER DER EWIGEN TAFEL ZEIGEN IHRE STORY ALS BILD ===');
// Monatschronik, Monatstafel, Erstling und Insignium-Stufe öffneten eine
// Spalte aus Zahlenkästen und Textzeilen. Sie tragen jetzt eine Bühne, und
// deren Zahlen werden hier gegen ihre Quelle gehalten: die Tafel gegen
// `seasonTitles`, die drei Quellen der Stufe gegen die gespeicherten Punkte,
// der Wechsel gegen die Halter der Karte.
const _tafelBl = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const typ = t => roh.filter(s => (s.dataRef||{}).type === t);
  const blatt = s => { _ndBlattJetzt = null; return {k:_newsBlattKopf(s) || '', m:_newsDetailMitte(s) || ''}; };
  const zahl = (re, h) => (h.match(re) || []).length;
  const r = {};
  // Die Insignium-Karte des Tages: die Bewegung der Schlagzeile als Bühne,
  // jede Bewegung mit den drei Graden ihrer Stufe, ihre Wirkung aus den drei
  // Quellen und die Leiter der Liga.
  const ins = typ('insignium_tag')[0];
  if(ins){
    const b = blatt(ins), d = ins.dataRef, z = d.zuege[0];
    r.ins = {buehne:/class="nd-is-z"/.test(b.k), grade:zahl(/class="nd-is-gf/g, b.m),
      soll:d.zuege.filter(x => INSIGNIEN[x.nach.stufe + 1]).length * 3,
      wirkung:zahl(/<div class="nd-wk[ "]/g, b.m), personen:d.zuege.length,
      leiter:/nf-ll/.test(b.m), stufe:b.k.indexOf('>' + _insLageName(z.nach) + '<') >= 0};
  }
  // Die Tafel am Tag, an dem sie aufgeht: gestellt am laufenden Monat, mit
  // dem Schnitt der Karte. Die Tafel eines abgeschlossenen Monats zeigt der
  // Saison-Rückblick.
  const _frei = {id:'x_frei', cat:'tafel', ic:'scroll', title:'Offen', desc:'', when:new Date(Date.now()),
    dataRef:{type:'chronik_frei', sid:currentSeason().id, eintraege:0, halter:0, traeger:[]}};
  const mo = (seasonTitles(currentSeason().id) || {}).awarded ? _frei : null;
  if(mo){
    const b = blatt(mo), aw = seasonTitles(mo.dataRef.sid, Date.now() + 1).awarded;
    const je = {}; aw.forEach(a => { je[a.pid] = (je[a.pid] || 0) + 1; });
    const max = Math.max(...Object.values(je));
    const erste = (b.k.match(/class="nd-bk-z hell"[\\s\\S]*?<b class="num">(\\d+)<\\/b>/) || [])[1];
    r.monat = {zellen:zahl(/class="nd-mo-z"/g, b.m), soll:aw.length,
      // Jeder Träger ein Balken: es waren sechs und „und 3 weitere".
      balken:zahl(/class="nd-bk-z/g, b.k), traeger:Object.keys(je).length,
      erste:+erste, max};
  }
  const ch = typ('chronik_geholt')[0];
  if(ch){
    const b = blatt(ch), d = ch.dataRef;
    const alle = (d.alle && d.alle.length ? d.alle : d.playerIds);
    const weg = (d.vorher || []).filter(id => alle.indexOf(id) < 0);
    r.chronik = {buehne:/nd-buehne nd-rk/.test(b.k),
      namen:alle.every(id => b.k.indexOf(esc(pname(id))) >= 0),
      vorher:weg.length ? /nd-rk-alt/.test(b.k) : !/nd-rk-alt/.test(b.k),
      name:b.k.indexOf(esc(d.chronName)) >= 0, tafel:b.m.indexOf('Ganze Tafel') >= 0};
  }
  // Der Tafel-Moment: oben der Spieltag als Achse — jede Partie ein Strich,
  // jede Bewegung ein Punkt in der Farbe ihrer Art —, und ohne einen Namen:
  // wer was bewegt hat, steht in der Liste darunter. Jede Zeile der Liste
  // führt zu ihrem Eintrag und nicht ins Profil. Nachgezählt wird an den
  // Teilen der Karte und an den rohen Partien des Tages.
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const tm = getStoriesCache().find(s => (s.dataRef||{}).type === 'sammel' && s.dataRef.quelle === 'tafel');
  if(tm){
    const b = blatt(tm), teile = tm.dataRef.teile;
    const ty = t => String(t.typ || t.type || '');
    const tag = tagKey(Math.max(...teile.map(t => t.ms)));
    const mehr = (b.k.match(/<b class="num">\\+(\\d+)<\\/b><\\/span>/g) || []).reduce((a, x) => a + +x.replace(/\\D/g, ''), 0);
    const ziel = t => {
      const ref = t.ref || {};
      if(ty(t).indexOf('rekord_') === 0) return 'data-chron="' + esc(ref.rekordId) + '"';
      if(ty(t) === 'chronik_geholt') return 'data-disz="' + esc(ref.titleId + '|' + ref.sid) + '"';
      if(ty(t) === 'insignium_stufe') return 'data-laufbahn="' + esc(ref.pid) + '"';
      return '';
    };
    const zeilen = b.m.match(/<div class="nw-zeile nw-tz[^>]*>/g) || [];
    const mitHalter = teile.filter(t => t.rname && (t.halter || []).length);
    r.moment = {punkte:zahl(/<i class="ta-(rek|chr|aus|ins)"><\\/i>/g, b.k) + mehr, teile:teile.length,
      striche:zahl(/class="nd-ta-p( an)?"/g, b.k), hell:zahl(/class="nd-ta-p an"/g, b.k), partien:(matches || []).filter(m => tagKey(mts(m)) === tag).length,
      ohneNamen:!/class="av\\b|data-pid=/.test(b.k),
      ziele:teile.filter(t => ziel(t)).every(t => zeilen.some(z => z.indexOf(ziel(t)) >= 0)),
      zielZahl:teile.filter(t => ziel(t)).length,
      profil:zeilen.filter(z => /data-pid=/.test(z)).length,
      bilder:zeilen.length, mitHalter:mitHalter.length + teile.filter(t => ty(t) === 'insignium_stufe').length,
      saetze:zahl(/class="nw-zeile nw-tz[^]*?class="nw-satz/g, b.m)};
  }
  return r;
})())`));
const _tb = _tafelBl;
ok(_tb.moment && _tb.moment.punkte === _tb.moment.teile && _tb.moment.striche === _tb.moment.partien
   && _tb.moment.partien > 0 && _tb.moment.hell > 0 && _tb.moment.ohneNamen && _tb.moment.zielZahl > 0 && _tb.moment.ziele
   && _tb.moment.profil === 0 && _tb.moment.bilder === _tb.moment.mitHalter && _tb.moment.saetze === 0,
   'das Blatt eines Tafel-Moments zeigt den Spieltag als Achse mit jeder Partie und jeder Bewegung ohne Namen, und jede Zeile führt zu ihrem Eintrag statt ins Profil',
   JSON.stringify(_tb.moment));
ok(_tb.ins && _tb.ins.buehne && _tb.ins.grade === _tb.ins.soll && _tb.ins.wirkung === _tb.ins.personen
   && _tb.ins.leiter && _tb.ins.stufe,
   'das Blatt der Insignium-Karte zeigt die Verwandlung, je Bewegung die drei Grade und die Wirkung, und die Leiter der Liga',
   JSON.stringify(_tb.ins));
ok(_tb.monat && _tb.monat.zellen === _tb.monat.soll && _tb.monat.balken === _tb.monat.traeger
   && _tb.monat.erste === _tb.monat.max,
   'das Blatt der offenen Monatstafel zeigt jeden Eintrag als Zelle und jeden Träger als Balken',
   JSON.stringify(_tb.monat));
ok(_tb.chronik && _tb.chronik.buehne && _tb.chronik.namen && _tb.chronik.vorher && _tb.chronik.name && _tb.chronik.tafel,
   'das Blatt eines Chronik-Wechsels zeigt dieselbe Bühne wie ein Rekord, mit allen Haltern und nur echten Vorgängern',
   JSON.stringify(_tb.chronik));

console.log('=== EIN WAPPEN UND EINE ZAHL, UND KEINE LEERE UEBERSCHRIFT ===');
// Meilenstein, Jubiläum, Form, Ausschlag, Spitzenspiel und runde Marken
// tragen eine Bühne, deren Zahl die der Karte ist. Und kein Blatt trägt eine
// Überschrift ohne etwas darunter: „Die Partie zum Meilenstein" stand über
// nichts, weil die Partie schon im Kopf stand.
// Jubiläum und Siegmeilenstein entstehen an früheren Spieltagen (14. und
// 20.08.) und werden dort gemessen; den Elo-Meilenstein, den der letzte Tag
// trug, gibt es nicht mehr, seit der Positionsbonus gegen die eigene
// Aufteilung misst [§C44].
const _wz = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const blatt = s => { _ndBlattJetzt = null; return {k:_newsBlattKopf(s) || '', m:_newsDetailMitte(s) || ''}; };
  const falsch = [], gesehen = {};
  let n = 0, leer = [];
  const pruefe = s => {
    const d = s.dataRef || {};
    let b; try { b = blatt(s); } catch(e){ return; }
    if(/class="nd-section">[^<]*<\\/div>\\s*(<div class="nd-section"|$)/.test(b.m.trim())) leer.push(d.type);
    if(gesehen[d.type]) return;
    const zahl = {jubilee:() => d.total, milestone_wins:() => parseInt(d.milestone, 10), milestone_goals:() => parseInt(d.milestone, 10),
      milestone_elo:() => d.mark, elo_swing:() => '−' + Math.abs(d.delta), top_form:() => '+' + d.vorsprung}[d.type];
    if(zahl){
      gesehen[d.type] = 1; n++;
      const z = String(zahl());
      // Die Zahl der Bühne, nicht die gleiche Zahl in der Leiter darunter.
      const groß = (b.k.match(/class="nd-hz-t"><em>[^<]*<\\/em><b class="num">([^<]*)<\\/b>/) || [])[1];
      if(!/nd-buehne nd-hz/.test(b.k) || groß !== (/^\\d+$/.test(z) ? _spZahl(+z) : z)) falsch.push(d.type + ' ' + z + ' statt ' + groß);
    }
    if(d.type === 'top_clash'){
      gesehen[d.type] = 1; n++;
      const m = matches.find(x => x.id === d.matchId);
      if(!/nd-buehne nd-ts/.test(b.k) || b.k.indexOf('>' + m.games_a + '</em>') < 0 || b.k.indexOf('>' + m.games_b + '</em>') < 0) falsch.push('top_clash');
    }
    if(d.type === 'badge_marken'){
      gesehen[d.type] = 1; n++;
      if((b.k.match(/class="nd-bm-k/g) || []).length !== d.marken.length) falsch.push('badge_marken');
    }
  };
  const alle = matches.slice();
  ['2026-08-14', '2026-08-20'].forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache(); _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let r = []; try { r = _buildStories() || []; } catch(e){}
    r.forEach(pruefe);
  });
  matches = alle; invalidateCache(); _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  roh.forEach(pruefe);
  // Der Fun Fact eines Spielers: dieselbe Bühne mit seinem Wert. Gezogen an
  // mehreren Tagen, weil je Tag genau einer entsteht.
  let fakten = 0;
  for(let t = 10; t <= 26; t += 2){
    let l = []; try { l = _buildAmbientStories(new Date(2026, 7, t, 15, 5), pmap(), id => pname(id), []) || []; } catch(e){}
    l.forEach(s => { const d = s.dataRef || {};
      if(d.leiter || !d.ambientPid || d.vv == null || d.vv === '') return;
      fakten++;
      const b = blatt(s);
      // Ein Fun Fact mit Bild trägt das Bild seiner Karte als Bühne.
      if(d.bild){
        if(!/nd-buehne nd-ff/.test(b.k) || b.k.indexOf('ff-' + d.bild.f) < 0) falsch.push('ambient ' + d.sub + ' ohne sein Bild');
      } else {
        const groß = (b.k.match(/class="nd-hz-t"><em>[^<]*<\\/em><b class="num">([^<]*)<\\/b>/) || [])[1];
        if(groß !== esc(String(d.vv))) falsch.push('ambient ' + d.sub + ': ' + groß + ' statt ' + d.vv);
      }
      if(!b.m.trim()) falsch.push('ambient ' + d.sub + ' ohne Mitte');
    });
  }
  n += fakten ? 1 : 0;
  return {n, falsch, leer:[...new Set(leer)], fakten};
})())`));
ok(_wz.n >= 6 && _wz.fakten > 0 && !_wz.falsch.length,
   'Meilenstein, Jubiläum, Form, Ausschlag, Spitzenspiel, runde Marken und der Fun Fact tragen ihre Zahl auf einer Bühne',
   _wz.falsch.join(' | ') || _wz.n + ' Arten, ' + _wz.fakten + ' Fun Facts');
ok(!_wz.leer.length, 'kein Blatt trägt eine Überschrift ohne etwas darunter', _wz.leer.join(', '));

console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
process.exit(fails ? 1 : 0);
