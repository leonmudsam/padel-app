// Zentrale historische Sim-Laeufe: kein Browser und kein Backend erforderlich.
// Die unveraenderte DB-First-Engine ist die Vergleichsquelle, nicht eine zweite Formel.
const {K,setNow}=require('./runtime.js').createRuntime();
let count=0,failed=0;
function ok(value,text){count++;if(value) console.log('✓ '+text);else{failed++;console.log('✗ '+text);}}
K(`players=['a','b','c','d','e'].map(id=>({id,name:id,hidden:false}));matches=[];cfg={...cfg,start_elo:0};invalidateCache();`);
ok(K('typeof getSimAt === "function" && typeof getSimForMatches === "function"'),'Ein gemeinsamer historischer Sim-Cache ist vorhanden');
if(!failed){
  ok(K('currentSeason()===currentSeason()'),'Der aktuelle Monat wird nicht für jeden Cache-Lookup neu aufgebaut');
  K(`matches=Array.from({length:60},(_,i)=>({id:'m'+i,a1:'a',a2:i%2?'b':'e',b1:'c',b2:'d',a1_side:'drive',a2_side:'reves',b1_side:'drive',b2_side:'reves',games_a:i%3?10:6,games_b:i%3?i%10:10,winner:i%3?'A':'B',exp_a:i%5?0.61:0,deltas:{a:i%3?1.125:-0.875,b:0.0625,c:-1.125,d:-0.0625,e:0.0625},created_at:new Date(2026,i<20?5:(i<40?6:7),1+Math.floor(i%20/2),12).toISOString()}));invalidateCache();`);
  for(const n of [0,1,2,3,19,20,21,39,40,41,59,60]){
    K(`window.subset=matches.slice(0,${n});window.expectedSim=simulateElo(subset);window.actual=getSimForMatches(subset);`);
    ok(K('JSON.stringify(actual)===JSON.stringify(expectedSim)'),`Prefix ${n}: alle Kennzahlen und die gesamte History identisch`);
    ok(K(`actual===getSimForMatches(matches.slice(0,${n}))`),`Prefix ${n}: neue Array-Kopie teilt denselben Lauf`);
    ok(K('actual.history.length===subset.length'),`Prefix ${n}: keine historischen Partien fehlen`);
  }
  K(`window.cutoff=Date.parse(matches[26].created_at);window.expectedSim=simulateElo(matches.filter(m=>mts(m)<=cutoff));window.actual=getSimAt(cutoff);`);
  ok(K('JSON.stringify(actual)===JSON.stringify(expectedSim)'),'Zeitschnitt schliesst alle Partien mit gleichem Zeitstempel ein');
  ok(K('getSimAt(cutoff)===getSimAt(cutoff+1)'),'Zeitpunkte ohne neue Partie teilen denselben Prefix');
  ok(K('getSimAt(0)===getGlobalSim()'),'Null-Schnitt bleibt wie _schnitt ungeschnitten');
  ok(K('getSimAt(mts(matches.at(-1)))===getGlobalSim()'),'Schnitt an der letzten Partie nutzt den globalen Lauf');
  ok(K('getSimAt(Infinity)===getGlobalSim()'),'Schnitt hinter dem Ende nutzt den globalen Lauf');
  ok(K('getSimForMatches(matches.slice())===getGlobalSim()'),'Vollstaendige Kopie nutzt den globalen Lauf');
  ok(K('getSimAt(mts(matches[0])-1).history.length===0'),'Schnitt vor der ersten Partie bleibt leer');
  K(`window.arbitrary=[matches[1],matches[8],matches[25],matches[42]];window.expectedSim=simulateElo(arbitrary);window.actual=getSimForMatches(arbitrary);`);
  ok(K('JSON.stringify(actual)===JSON.stringify(expectedSim)'),'Beliebige Teilmenge bekommt ihren eigenen kanonischen Lauf');
  ok(K('actual===getSimForMatches(arbitrary)'),'Beliebige Teilmenge wird an ihrer Referenz memoisiert');
  K(`window.changed=matches.slice(0,5).map(m=>({...m,deltas:{...m.deltas,a:25}}));window.expectedSim=simulateElo(changed);window.actual=getSimForMatches(changed);`);
  ok(K('JSON.stringify(actual)===JSON.stringify(expectedSim)'),'Gleichlange fremde Match-Objekte werden nicht mit dem Liga-Prefix verwechselt');
  K(`window.oldPrefix=getSimAt(cutoff);window.oldArbitrary=getSimForMatches(arbitrary);cfg.start_elo=37;invalidateCache(['stats']);`);
  ok(K('oldPrefix!==getSimAt(cutoff)'),'Selektive Invalidierung verwirft historische Sim-Laeufe');
  ok(K('JSON.stringify(getSimAt(cutoff))===JSON.stringify(simulateElo(matches.filter(m=>mts(m)<=cutoff)))'),'Neue Start-Elo gilt auch im Zeitschnitt');
  ok(K('oldArbitrary!==getSimForMatches(arbitrary)'),'Selektive Invalidierung verwirft auch WeakMap-Teilmengen');
  ok(K('JSON.stringify(getSimForMatches(arbitrary))===JSON.stringify(simulateElo(arbitrary))'),'Die gleiche Teilmengen-Referenz liest nach Invalidierung frische Konfiguration');
  K(`window.kept=getSimForMatches(matches.slice(0,25));window.edited=matches[5];matches=matches.map(m=>m===edited?{...m,deltas:{...m.deltas,a:-7.375}}:m);invalidateCache(['stats']);`);
  ok(K('JSON.stringify(getSimForMatches(matches.slice(0,25)))===JSON.stringify(simulateElo(matches.slice(0,25)))'),'Match-Edit gleicher Laenge trifft einen frischen historischen Lauf');
  ok(K('kept!==getSimForMatches(matches.slice(0,25))'),'Match-Edit gleicher Laenge kann keinen alten Prefix zurueckgeben');
  K(`for(let i=1;i<60;i++) getSimForMatches(matches.slice(0,i));`);
  ok(K('Object.keys(_cache._prefixSim||{}).length<=24'),'Historische Prefix-Laeufe sind auf 24 Eintraege begrenzt');
  K(`window.previous=matches;matches=[];invalidateCache();`);
  ok(K('getSimAt(15)===getGlobalSim()'),'Leere Liga teilt den globalen Empty-State');
  ok(K('getSimForMatches([])===getGlobalSim()'),'Leere Array-Kopie teilt den globalen Empty-State');
  K(`matches=previous;invalidateCache();`);
  ok(K('getSimForMatches(matches).history.length===matches.length'),'Nach Empty-State ist die globale History wieder vollstaendig');
  K(`window.old=getSimAt(mts(matches[25]));window.next={...matches.at(-1),id:'neu',created_at:new Date(mts(matches.at(-1))+60000).toISOString()};matches=matches.concat(next);invalidateCache(['stats']);`);
  ok(K('getSimForMatches(matches).history.length===61'),'Nach Match-Add bleibt die komplette globale History erhalten');
  ok(K('JSON.stringify(getSimForMatches(matches))===JSON.stringify(simulateElo(matches))'),'Match-Add liefert alle Saison- und Team-Maps wie ein voller Lauf');
  ok(K('old!==getSimAt(mts(matches[25]))'),'Match-Add verwirft historische Prefix-Laeufe');
  K(`window.original=simulateElo;window.calls=0;simulateElo=function(ms,opts){calls++;return original(ms,opts)};invalidateCache();window.cut=mts(matches[26]);window.direct=getSimAt(cut);window.source=matches.filter(m=>mts(m)<=cut);window.peak=seasonPeakElos(source);`);
  ok(K('calls===1'),'Zeitschnitt und Saison-Peaks simulieren ihren gleichen Prefix nur einmal');
  ok(K('peak===seasonPeakElos(source) && calls===1'),'Warme Saison-Peaks berechnen keinen Sim erneut');
  K(`cfg.start_elo+=100;invalidateCache(['stats']);window.freshPeak=seasonPeakElos(source);`);
  ok(K('freshPeak!==peak'),'Saison-Peaks vergessen eine alte Konfiguration auch an gleicher Array-Referenz');
  ok(K('calls===2'),'Nach Versionswechsel entsteht genau ein frischer Prefix-Lauf');
  ok(K('getSimAt(cut)===getSimForMatches(source) && calls===2'),'Badge- und Rekord-Prefix teilen auch den frischen Stand');
  K(`window.expectedPeak={};original(source).history.forEach(h=>{const m=source.find(m=>m.id===h.matchId);const s=expectedPeak[seasonOf(m.created_at).id]||(expectedPeak[seasonOf(m.created_at).id]={});[m.a1,m.a2,m.b1,m.b2].forEach(id=>{const e=h.eloAfter[id];if(e!==undefined&&(s[id]===undefined||e>s[id]))s[id]=e;});});`);
  ok(K('JSON.stringify(freshPeak)===JSON.stringify(expectedPeak)'),'Saison-Peaks stimmen exakt mit der ungecacheten DB-First-History ueberein');
  // Der alte inkrementelle Weg wurde durch eine neue Array-Referenz ohne
  // Version ausgelöst und verlor History, Team-Maps und frühere Saisons.
  K(`simulateElo=original;invalidateCache();getGlobalSim();
    matches=matches.concat({...matches.at(-1),id:'noch-neu'});`);
  ok(K('JSON.stringify(getGlobalSim())===JSON.stringify(simulateElo(matches))'),'Match-Add ohne Tick verliert keine alte History oder Saison-/Team-Map');
  K(`window.globalAlt=getGlobalSim();window.gruppenAlt=getMatchesBySeason();
    matches=matches.map((m,i)=>i===0?{...m,deltas:{...m.deltas,a:12.375}}:m);`);
  ok(K('JSON.stringify(getGlobalSim())===JSON.stringify(simulateElo(matches)) && globalAlt!==getGlobalSim()'),'Gleich langer Array-Ersatz wird nicht als alter globaler Lauf gelesen');
  ok(K('getMatchesBySeason()!==gruppenAlt && getMatchesBySeason()["2026-06"][0]===matches[0]'),'Saisongruppen folgen auch der Quellenidentität');
  K(`window.groupSource=matches.slice(0,27);window.groups=getMatchesBySeason(groupSource);`);
  ok(K('groups===getMatchesBySeason(groupSource) && groups["2026-06"]===getMatchesBySeason(groupSource)["2026-06"]'),'Historische Auszeichnungen teilen stabile Saison-Arrays für alle Spieler');
  K(`window.monthSim=getGlobalSim();getHistoryByMatchId();getSnapMap();getRankSnapshots();getStreakSnapshots();getMatchesBySeason();getSeasonRankingsCache();`);
  setNow(new Date(2026,8,1,0,1).getTime());
  ok(K('currentSeason().id==="2026-09"'),'Der gemeinsame Monatswert wechselt an der lokalen Kalendergrenze');
  ok(K('monthSim!==getGlobalSim() && JSON.stringify(getGlobalSim())===JSON.stringify(simulateElo(matches))'),'Kalendermonat erneuert den globalen Lauf ohne Daten-Tick');
  ok(K('getHistoryByMatchId() instanceof Map && getHistoryByMatchId().size===matches.length'),'Monatswechsel lässt keine History-Map mit altem Schlüssel und leerem Wert zurück');
  ok(K('!!getSnapMap() && !!getRankSnapshots() && !!getStreakSnapshots() && !!getMatchesBySeason() && !!getSeasonRankingsCache()'),'Alle abgeleiteten Maps bleiben nach Monatswechsel vollständig vorhanden');
  K(`invalidateCache(['stats']);`);
  ok(K('groups!==getMatchesBySeason(groupSource)'),'Saisongruppen einer alten Teilmengenreferenz folgen der Cache-Version');
}

// ── Gemeinsame Zeitschnitte an den echten Partien der Liga ──────────────
// `_partienBis` gibt je Stand EIN Array; es muss dasselbe enthalten wie der
// Filter, den es ersetzt, und darf von niemandem verändert werden, der es
// liest — auch nicht von einem ganzen Generatorlauf.
{
  const R=require('./runtime.js').createRuntime();
  const fs=require('node:fs'),path=require('node:path');
  const NAMEN=['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
  const IDS=NAMEN.map((_,i)=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
  const MS=fs.readFileSync(path.join(__dirname,'fixtures/matches.txt'),'utf8').trim().split(';').map((row,i)=>{
    const f=row.split(',').map(Number),pos=k=>f[4+k]===0?'drive':'reves';
    return {id:'m'+String(i).padStart(4,'0'),a1:IDS[f[0]],a2:IDS[f[1]],b1:IDS[f[2]],b2:IDS[f[3]],
      a1_side:pos(0),a2_side:pos(1),b1_side:pos(2),b2_side:pos(3),games_a:f[8],games_b:f[9],winner:f[10]===0?'A':'B',
      exp_a:f[11]/1000,created_at:new Date(f[12]*1000).toISOString(),deltas:{}};});
  R.setNow(new Date(2026,7,26,21).getTime());
  R.K(`players=${JSON.stringify(NAMEN.map((name,i)=>({id:IDS[i],name,hidden:false,elo:0})))};
    matches=${JSON.stringify(MS)};seasons=[];invalidateCache();`);
  const schnitte=R.K(`(()=>{const t=matches.map(mts);return [t[0]-1,t[0],t[50],t[50]+1,t[200],t[333],t[t.length-2],t[t.length-1]-1];})()`);
  // Zwei Partien mit demselben Zeitstempel: beide gehören zum Schnitt.
  const gleich=schnitte.every(b=>R.K(`JSON.stringify(_partienBis(${b}).map(m=>m.id))===JSON.stringify(matches.filter(m=>mts(m)<=${b}).map(m=>m.id))`));
  ok(gleich,'Ein gemeinsamer Zeitschnitt enthält genau die Partien des alten Filters, in derselben Reihenfolge');
  ok(R.K(`_partienBis(${schnitte[4]})===_partienBis(${schnitte[4]}) && _partienBis(${schnitte[4]})!==matches`),'Derselbe Stand liefert dasselbe Array, nicht die Liga selbst');
  // Die Historie der Monatstitel liest, wer in welchem Monat gespielt hat,
  // aus einer Tabelle je Liste; gegen die alte Abfrage über alle Partien.
  const alt=`(pid,quelle)=>[...new Set(quelle.map(m=>(seasonOf(m.created_at)||{}).id).filter(Boolean))].filter(sid=>quelle.some(m=>(seasonOf(m.created_at)||{}).id===sid&&(m.a1===pid||m.a2===pid||m.b1===pid||m.b2===pid)))`;
  const titel=R.K(`(()=>{const alt=${alt};let gut=true;
    for(const b of [${schnitte[2]},${schnitte[4]},${schnitte[5]}]) for(const p of players){
      const neu=seasonTitleHistory(p.id,b).map(r=>r.sid);
      if(JSON.stringify(neu)!==JSON.stringify(alt(p.id,_partienBis(b)).sort())) gut=false; }
    return gut;})()`);
  ok(titel,'Die Monatstitel-Historie nennt in jedem Schnitt dieselben Monate wie die alte Abfrage');
  R.K(`prestigeTabelle(${schnitte[4]});prestigeTabelle(${schnitte[5]});_buildStories();`);
  ok(R.K(`(()=>{const ids=matches.map(m=>m.id);for(const b of ${JSON.stringify(schnitte)}){const a=_partienBis(b);
    const n=matches.filter(m=>mts(m)<=b).length;if(a.length!==n||a.some((m,i)=>m.id!==ids[i]))return false;}return true;})()`),
    'Nach Prestige-Schnitten und einem Generatorlauf ist kein geteilter Zeitschnitt verändert');
  // Eine Liga, die nicht aufsteigend vorliegt, bekommt den alten Filter.
  R.K('window.__umgedreht=matches.slice().reverse();matches=window.__umgedreht;invalidateCache();');
  ok(R.K(`JSON.stringify(_partienBis(${schnitte[4]}).map(m=>m.id))===JSON.stringify(matches.filter(m=>mts(m)<=${schnitte[4]}).map(m=>m.id))`),
    'Eine nicht aufsteigende Liga wird gefiltert statt halbiert');
  ok(R.K(`_wochenKey(matches[3].created_at)===_wochenKey(matches[3].created_at) && _wochenKey(new Date(matches[3].created_at))===_wochenKey(matches[3].created_at)`),
    'Der Wochenschlüssel ist für Text und Datum derselbe');
}
console.log(failed?`\n${failed} von ${count} CHECKS FEHLGESCHLAGEN`:`\nALLE ${count} CHECKS BESTANDEN`);
process.exitCode=failed?1:0;
