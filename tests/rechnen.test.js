// Rechen- und Cache-Regressionsprüfungen ohne Browser oder Backend.
// Der ausgelieferte Code ist die einzige Rechenquelle; erwartet werden nur
// unabhängig nachzählbare Ergebnisse, nicht eine zweite Elo-Implementierung.
const fs=require('node:fs');
const {K,setNow}=require('./runtime.js').createRuntime();
let checks=0,fails=0;
const ok=(condition,message)=>{checks++;if(!condition)fails++;console.log((condition?'  ok  ':'  ✗   ')+message)};
K(`players=Array.from({length:4},(_,i)=>({id:'p'+i,name:'Spieler '+i,hidden:false,elo:0,atk:.5}));
  matches=[];seasons=[];invalidateCache();
  window.__cfgBasis={...cfg};window.__partie={id:'eins',a1:'p0',a2:'p1',b1:'p2',b2:'p3',
    a1_side:'drive',a2_side:'reves',b1_side:'drive',b2_side:'reves',games_a:10,games_b:0,winner:'A',
    created_at:new Date().toISOString(),exp_a:.5,deltas:{p0:21,p1:19,p2:-20,p3:-18}};`);
const nullwerte=K(`(() => {
  cfg={...window.__cfgBasis,match_bonus:0,mov_loss_damp:0,pos_swing:0,risk_split:0,
    underdog_elo_max:0,underdog_games_max:0};invalidateCache();
  const h=simulateEloWithSliders([window.__partie]).history[0];
  return {bonus:Object.values(h.breakdowns).every(b=>b.matchBonus===0),
    mov:Object.values(h.breakdowns).filter(b=>!b.won).every(b=>b.movMult===1),
    sieger:h.deltas.p0===38 && h.deltas.p1===38,verlierer:h.deltas.p2===-24 && h.deltas.p3===-24};
})()`);
for(const [key,value]of Object.entries(nullwerte))ok(value,'Explizite Null in den Elo-Einstellungen: '+key);
const defaults=K(`(() => {
  cfg={...window.__cfgBasis};const normal=simulateEloWithSliders([window.__partie]).history[0];
  cfg={...window.__cfgBasis,match_bonus:null,mov_loss_damp:null};
  const leer=simulateEloWithSliders([window.__partie]).history[0];
  delete cfg.match_bonus;delete cfg.mov_loss_damp;
  const fehlt=simulateEloWithSliders([window.__partie]).history[0];
  return {null:JSON.stringify(normal.deltas)===JSON.stringify(leer.deltas),
    fehlt:JSON.stringify(normal.deltas)===JSON.stringify(fehlt.deltas)};
})()`);
for(const [key,value]of Object.entries(defaults))ok(value,'Nur fehlende Einstellungen verwenden den Standard: '+key);
const kanonisch=K(`(() => {
  cfg={...window.__cfgBasis};matches=[{...window.__partie}];invalidateCache();
  const vorher=JSON.stringify(matches[0].deltas),sim=getGlobalSim();
  const db=JSON.stringify(sim.history[0].deltas)===vorher && sim.elo.p0===21 && sim.elo.p2===-20;
  cfg={...cfg,k_factor:64,match_bonus:0,mov_loss_damp:0};invalidateCache(['global']);
  const nachher=getGlobalSim();
  const stabil=JSON.stringify(nachher.history[0].deltas)===vorher && JSON.stringify(matches[0].deltas)===vorher;
  const gerechnet=simulateEloWithSliders(matches).history[0];
  return {db,stabil,einmal:Object.values(gerechnet.breakdowns).every(b=>gerechnet.deltas[b.playerId]===Math.round(b.finalDelta)),
    team:nachher.teamElo['p0|p1']===40 && nachher.teamElo['p2|p3']===-38,
    perioden:periodPlayerStats('all').every(p=>p.eloNet===matches[0].deltas[p.id])};
})()`);
for(const [key,value]of Object.entries(kanonisch))ok(value,'DB-Deltas bleiben die gemeinsame Elo-Quelle: '+key);
const h2h=K(`(() => {
  cfg={...window.__cfgBasis};players=players.map(p=>({...p,hidden:false}));
  matches=[{...window.__partie}];invalidateCache();
  const eins=playerH2HList('p0',1),warm=playerH2HList('p0',1)===eins;
  const min=playerH2HList('p0',2).length===0;
  matches=matches.concat({...window.__partie,id:'zwei'});invalidateCache(['global','stats','badges']);
  const zwei=playerH2HList('p0',1),add=zwei.every(p=>p.total===2) && zwei.length===3;
  const schwelle=playerH2HList('p0',2).length===3;
  matches=matches.map(m=>({...m,winner:'B'}));invalidateCache(['stats']);
  const edit=playerH2HList('p0',1).every(p=>p.teamW===0 && p.oppW===0);
  players=players.map(p=>p.id==='p1'?{...p,hidden:true}:p);invalidateCache(['stats']);
  const hidden=playerH2HList('p0',1).every(p=>p.oid!=='p1');
  matches=matches.slice(0,1);invalidateCache(['stats']);
  const weg=playerH2HList('p0',1).every(p=>p.total===1);
  for(let i=0;i<100;i++){invalidateCache(['stats']);playerH2HList('p0',1)}
  const begrenzt=Object.keys(_cache._h2hList).length<=80;
  return {warm,min,add,schwelle,edit,hidden,weg,begrenzt};
})()`);
for(const [key,value]of Object.entries(h2h))ok(value,'H2H-Listen bleiben aktuell und begrenzt: '+key);
K(`players=players.map(p=>({...p,hidden:false}));matches=[{...window.__partie}];invalidateCache();`);
const zeit=K(`({tag:periodPlayerStats('day').length,woche:periodPlayerStats('week').length})`);
K(`periodPlayerStats('day')`);
setNow(new Date(2026,7,27,21).getTime());
ok(zeit.tag===4 && K(`matchesInPeriod('day').length===0 && periodPlayerStats('day').length===0`),
  'Tagesstatistik folgt dem kanonischen Zeitraum auch ohne neue Partie');
K(`periodPlayerStats('week')`);
setNow(new Date(2026,7,31,21).getTime());
ok(zeit.woche===4 && K(`matchesInPeriod('week').length===0 && periodPlayerStats('week').length===0`),
  'Wochenstatistik folgt dem kanonischen Zeitraum auch ohne neue Partie');
setNow(new Date(2026,7,26,21).getTime());
K(`window.__periodeAll=periodPlayerStats('all');window.__periodeVersion=_cache.version;`);
setNow(new Date(2026,8,1,0,1).getTime());
ok(K(`periodPlayerStats('all').every(p=>p.elo===cfg.start_elo) && _cache.version===window.__periodeVersion`),
  'Unveränderte Allzeit-Bilanz zeigt nach Monatswechsel die zurückgesetzte aktuelle Elo');
ok(K(`periodPlayerStats('all').every(p=>p.eloNet===window.__periodeAll.find(v=>v.id===p.id).eloNet)`),
  'Monatswechsel verändert keine historische Allzeit-Bilanz');
setNow(new Date(2026,7,26,21).getTime());
const erwartung=K(`(() => {
  matches=[{...window.__partie,exp_a:0}];invalidateCache();const m=matches[0];
  const a=myExp('p0',m),b=myExp('p2',m),s=getGlobalSim(),duo=teamDetail('p0','p1');
  const badge=BADGES.find(b=>b.id==='upset_king'),erhalten=badgesEarnedInMatch(m.id);
  return {null:a===0 && b===1,engine:a===s.history[0].expA,
    duo:duo.biggestUpset?.expected===a,
    quote:posPerfFrom('p0',matches).aPerfAvg===1-a,
    badge:badge.count('p0',matches)===1,
    trigger:['p0','p1'].every(pid=>erhalten.some(e=>e.playerId===pid && e.badge.id==='upset_king')),
    keineDoppelung:erhalten.filter(e=>e.badge.id==='upset_king').length===2};
})()`);
for(const [key,value]of Object.entries(erwartung))ok(value,'Grenzwerte der gespeicherten Erwartung stimmen überall: '+key);

// Das echte Liga-Fixture enthält Gruppen mit Bruchteilen aus Wiederholungs-
// und Wurzeldämpfung. Gerade dort muss die sichtbare Aufteilung dieselbe
// sein wie im Laufbahnblatt, nicht drei unabhängig gerundete Kopfzahlen.
const names=['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const ids=names.map((_,i)=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const fixture=fs.readFileSync(__dirname+'/fixtures/matches.txt','utf8').trim().split(';').map((row,i)=>{
  const f=row.split(',').map(Number),pos=k=>f[4+k]===0?'drive':'reves';
  return{id:'m'+i,a1:ids[f[0]],a2:ids[f[1]],b1:ids[f[2]],b2:ids[f[3]],
    a1_side:pos(0),a2_side:pos(1),b1_side:pos(2),b2_side:pos(3),games_a:f[8],games_b:f[9],
    winner:f[10]===0?'A':'B',exp_a:f[11]/1000,created_at:new Date(f[12]*1000).toISOString(),deltas:{}};
});
K(`players=${JSON.stringify(names.map((name,i)=>({id:ids[i],name,hidden:false,elo:0,atk:.5})))};
  matches=${JSON.stringify(fixture)};seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  const fixtureDeltas=new Map(simulateEloWithSliders(matches).history.map(h=>[h.matchId,h.deltas]));
  matches.forEach(m=>m.deltas=fixtureDeltas.get(m.id)||{});invalidateCache();`);
const prestige=K(`(() => {
  const t=prestigeTabelle(),gruppen=['auszeichnung','monat','rekord'];
  const sums=Object.values(t.byPid).map(p=>{
    const roh=gruppen.map(g=>p.quellen.filter(q=>q.q===g).reduce((s,q)=>s+q.p,0));
    const summe=Object.values(p.teile).reduce((s,q)=>s+q,0);
    return {pid:p.pid,roh,punkte:p.punkte,summe,teile:gruppen.map(g=>p.teile[g]),
      blatt:_prestigeRunden(roh,p.punkte,1)};
  });
  return {summe:sums.every(p=>p.summe===p.punkte),
    gesamt:sums.every(p=>p.punkte===Math.round(p.roh.reduce((s,q)=>s+q,0))),
    profil:sums.every(p=>JSON.stringify(p.teile)===JSON.stringify(p.blatt)),
    story:sums.every(p=>JSON.stringify(gruppen.map(g=>_storyStand().prestige(p.pid).teile[g]))===JSON.stringify(p.blatt)),
    brueche:sums.some(p=>p.roh.some(v=>v!==Math.round(v))),
    cache:t===prestigeTabelle()};
})()`);
for(const [key,value]of Object.entries(prestige))ok(value,'Eine Prestige-Aufteilung für Engine, Story und Laufbahn: '+key);
// Das Positionsprofil [§C44] an den echten Partien und an gebauten Fällen.
// Henry spielte 14 von 152 Partien vorne und dort klar schlechter gegen die
// Erwartung als hinten. Die erste Rechnung verglich die Summen und stellte
// ihn bei 30 % Sturm als Verteidiger ein; die zweite ließ die Aufstellung
// fünfmal so stark zählen wie die Leistung, und wer gleich oft vorne und
// hinten spielte, aber vorne klar schwächer war, stand kaum anders als
// jemand ohne Unterschied.
const profil=K(`(() => {
  const henry=positionsLage(posPerfFrom(${JSON.stringify(ids[2])},matches));
  const lage=p=>positionsLage(p);
  // gleiche Leistung je Partie auf beiden Seiten: übrig bleibt die
  // Aufstellung, gewogen nach den Partien auf der selteneren Seite
  const gleich=lage({aG:15,dG:187,aPerf:-.1*15,dPerf:-.1*187});
  // dieselbe Leistung je Partie vorne, einmal aus 3, einmal aus 30 Partien
  const wenig=lage({aG:3,dG:100,aPerf:-.5*3,dPerf:0}), viel=lage({aG:30,dG:100,aPerf:-.5*30,dPerf:0});
  const mehrVorne=lage({aG:60,dG:40,aPerf:0,dPerf:0}).wert>lage({aG:40,dG:60,aPerf:0,dPerf:0}).wert;
  const besserVorne=lage({aG:50,dG:50,aPerf:.1*50,dPerf:0}).wert>lage({aG:50,dG:50,aPerf:0,dPerf:0}).wert;
  // die Aufstellung zählt weniger, je mehr Partien beide Seiten haben:
  // dasselbe Verhältnis 3 zu 7, einmal aus 10, einmal aus 100 Partien
  const mengeKlein=lage({aG:3,dG:7,aPerf:0,dPerf:0}), mengeGross=lage({aG:30,dG:70,aPerf:0,dPerf:0});
  // vorne zehn Prozentpunkte besser bei 50:50 wiegt mehr als 75 % der
  // Partien vorne ohne jeden Unterschied
  const leistung=lage({aG:50,dG:50,aPerf:.1*50,dPerf:0,aGm:.1*50,dGm:0}).wert;
  const menge=lage({aG:75,dG:25,aPerf:0,dPerf:0,aGm:0,dGm:0}).wert;
  // Sieg und Torverhältnis zählen je zur Hälfte
  const nurTore=lage({aG:50,dG:50,aPerf:0,dPerf:0,aGm:.1*50,dGm:0}).wert;
  const nurSiege=lage({aG:50,dG:50,aPerf:.1*50,dPerf:0,aGm:0,dGm:0}).wert;
  const tor=[posTorLeistung(10,6,.75),posTorLeistung(9,10,.5),posTorLeistung(2,10,.5)];
  // die stärkere Rolle aus der Leistung gegen die Erwartung, nicht aus der Siegquote
  const staerker=[lage({aG:20,aW:12,dG:20,dW:10,aPerf:-.05*20,dPerf:.1*20}).staerker,
    lage({aG:40,dG:40,aPerf:.01*40,dPerf:0}).staerker, lage({aG:0,dG:40,dPerf:.2*40}).staerker];
  // die schwächere Seite bis 10 %, die stärkere halb so viel, bis 5 %; mit
  // dem vollen Regler stoßen die klaren Profile an beide Grenzen
  const seiten=sw=>players.map(p=>{const l=positionsLage(posPerfFrom(p.id,matches));
    const f=[posFactor(l,'drive',sw),posFactor(l,'reves',sw)];
    return {f, schwach:Math.max(...f)-1, stark:1-Math.min(...f)};});
  const voll=seiten(1), sechs=seiten(.6);
  const hl=positionsLage(posPerfFrom(${JSON.stringify(ids[2])},matches));
  // die Höhe folgt der Klarheit der Einstufung und nicht dem Anteil der
  // Partien: dasselbe Profil aus 50:50 und aus 90:10 gibt denselben Faktor,
  // und ein klarerer Stürmer (78 %) trägt mehr als ein weniger klarer
  // Verteidiger (72 %)
  const bau=(wert,anteil)=>({wert,anteil,aG:anteil*100,dG:(1-anteil)*100});
  const anteilEgal=posFactor(bau(.3,.5),'reves',.6)===posFactor(bau(.3,.1),'reves',.6)
    && posFactor(bau(.3,.5),'drive',.6)===posFactor(bau(.3,.1),'drive',.6);
  const klarer=[1-posFactor(bau(.78,.68),'drive',.6), 1-posFactor(bau(.28,.47),'reves',.6)];
  const mitte=[posFactor(bau(.5,.5),'drive',.6), posFactor(bau(.5,.5),'reves',.6)];
  return {henry:{wert:henry.wert,anteil:henry.anteil,kl:posClassify(henry.wert).label},
    gleich:gleich.wert, gleichSoll:1/(1+Math.pow(188/16,1-15/30*.75)), wenig:wenig.rA, viel:viel.rA, mehrVorne, besserVorne,
    mengeKlein:mengeKlein.wert, mengeGross:mengeGross.wert, leistung, menge, nurTore, nurSiege, tor, staerker,
    unten:Math.min(...voll.map(x=>Math.min(...x.f))), oben:Math.max(...voll.map(x=>Math.max(...x.f))),
    halb:Math.max(...voll.concat(sechs).map(x=>Math.abs(x.stark-x.schwach/2))),
    henryElo:[posFactor(hl,'reves',.6),posFactor(hl,'drive',.6)], anteilEgal, klarer, mitte,
    profil:players.every(p=>driveStrength(p.id)===positionsLage(posPerfFrom(p.id,matches)).wert)};
})()`);
ok(profil.henry.kl==='Reiner Verteidiger' && profil.henry.wert<profil.henry.anteil,
  'Henry steht als Reiner Verteidiger, unter dem Anteil seiner Sturmpartien, weil er vorne schwächer ist: '+JSON.stringify(profil.henry));
ok(Math.abs(profil.gleich-profil.gleichSoll)<1e-12,
  'Gleiche Leistung je Partie auf beiden Seiten lässt nur die Aufstellung übrig, gewogen nach den Partien auf der selteneren Seite: '+profil.gleich);
ok(profil.wenig>profil.viel && profil.wenig<0,
  'Drei schwache Sturmpartien zählen weniger als dreißig mit derselben Leistung: '+profil.wenig+' gegen '+profil.viel);
ok(profil.mehrVorne && profil.besserVorne, 'Mehr Partien vorne und bessere Leistung vorne heben das Profil');
ok(profil.mengeKlein<profil.mengeGross && profil.mengeGross<.5,
  'Die Aufstellung zählt weniger, je mehr Partien beide Seiten haben (3 zu 7 gegen 30 zu 70): '+profil.mengeKlein+' gegen '+profil.mengeGross);
ok(profil.leistung>profil.menge && profil.menge>.5,
  'Zehn Prozentpunkte besser vorne bei 50:50 wiegen mehr als drei Viertel der Partien vorne ohne Unterschied: '+profil.leistung+' gegen '+profil.menge);
ok(Math.abs(profil.nurTore-profil.nurSiege)<1e-12 && profil.nurTore>.5
  && Math.abs(profil.tor[0])<1e-12 && Math.abs(profil.tor[1]+1/19)<1e-12 && Math.abs(profil.tor[2]+2/3)<1e-12,
  'Sieg und Torverhältnis gegen die Erwartung zählen je zur Hälfte; ein 10:6 bei 75 % Siegchance ist genau die Erwartung, ein 9:10 bei 50 % fast: '
  +JSON.stringify({nurTore:profil.nurTore,nurSiege:profil.nurSiege,tor:profil.tor}));
ok(profil.staerker.join()==='def,beide,beide',
  'Die stärkere Rolle sagt die Leistung gegen die Erwartung, gleichauf bis drei Prozentpunkte, ohne Partien keine: '+profil.staerker.join());
ok(Math.abs(profil.unten-.95)<1e-12 && Math.abs(profil.oben-1.1)<1e-12 && profil.halb<1e-12,
  'Die schwächere Seite reicht bis 10 %, die stärkere halb so weit, bis 5 %, auch mit dem vollen Regler: '
  +profil.unten+' bis '+profil.oben+', Abweichung von der Hälfte '+profil.halb);
ok(Math.abs(profil.henryElo[1]-1.1)<1e-12 && Math.abs(profil.henryElo[0]-.95)<1e-12,
  'Henry bekommt vorne die vollen 10 %, und hinten dämpft ein Sieg um 5 % und eine Niederlage kostet 5 % mehr: '
  +JSON.stringify(profil.henryElo));
ok(profil.anteilEgal && profil.klarer[0]>profil.klarer[1] && profil.klarer[1]>0 && profil.mitte.join()==='1,1',
  'Die Höhe folgt der Klarheit der Einstufung, nicht dem Anteil der Partien; bei 50 % zählt keine Seite anders: '
  +JSON.stringify({klarer:profil.klarer,mitte:profil.mitte}));
ok(profil.profil, 'Profil und Stärke für das Durchwechseln sind dieselbe Zahl');
// Der Elo-Abstand zu Gegnern und Mitspieler, den das Blatt der Einstufung
// zeigt, nachgerechnet aus dem Stand vor jeder Sturmpartie von Henry.
const abstand=K(`(() => {
  const id=${JSON.stringify(ids[2])}, vor=new Map(getGlobalSim().history.map(h=>[h.matchId,h.eloBefore]));
  let n=0, geg=0, mit=0;
  matches.forEach(m=>{
    const slot=[['a1','a2','b1','b2'],['a2','a1','b1','b2'],['b1','b2','a1','a2'],['b2','b1','a1','a2']].find(x=>m[x[0]]===id);
    if(!slot||m[slot[0]+'_side']!=='drive') return;
    const e=vor.get(m.id); n++;
    geg+=(e[m[slot[2]]]+e[m[slot[3]]])/2-e[id]; mit+=e[m[slot[1]]]-e[id];
  });
  const t=posPerfFrom(id,matches);
  return {n, geg:t.aGegAvg, gegSoll:geg/n, mit:t.aMitAvg, mitSoll:mit/n};
})()`);
ok(abstand.n>10 && Math.abs(abstand.geg-abstand.gegSoll)<1e-9 && Math.abs(abstand.mit-abstand.mitSoll)<1e-9,
  'Der Elo-Abstand zu Gegnern und Mitspieler je Position kommt aus dem Stand vor jeder Partie: '+JSON.stringify(abstand));
// Die Elo-Rechnung liest dieselbe Lage wie das Profil, aus den Partien vor
// der Partie. Dort stand eine eigene Kopie der alten Formel.
const eloLage=K(`(() => {
  players=Array.from({length:4},(_,i)=>({id:'e'+i,name:'Elo '+i,hidden:false,elo:0,atk:.5}));
  cfg={...window.__cfgBasis};
  const t0=Date.UTC(2026,7,3,18,0), vorher=[];
  for(let i=0;i<9;i++) vorher.push({...window.__partie,id:'ev'+i,a1:'e0',a2:'e1',b1:'e2',b2:'e3',
    a1_side:i%3?'drive':'reves',a2_side:i%3?'reves':'drive',winner:i%4?'A':'B',games_a:i%4?10:6,games_b:i%4?7:10,
    created_at:new Date(t0+i*6e5).toISOString(),deltas:{}});
  const h=simulateEloWithSliders(vorher).history;
  vorher.forEach((m,i)=>m.exp_a=h[i].expA);
  const letzte={...window.__partie,id:'ez',a1:'e0',a2:'e1',b1:'e2',b2:'e3',a1_side:'reves',a2_side:'drive',
    created_at:new Date(t0+20*6e5).toISOString(),deltas:{}};
  const bd=simulateEloWithSliders(vorher.concat(letzte)).history[9].breakdowns.e0;
  const l=positionsLage(posPerfFrom('e0',vorher));
  // dazu das andere Team: wer verliert, trägt den Faktor gespiegelt — auf
  // der schwächeren Seite so viel Schutz, wie ein Sieg dort Bonus brächte
  const alle=simulateEloWithSliders(vorher.concat(letzte)).history[9].breakdowns;
  const spiegel=Object.values(alle).every(x=>Math.abs(x.posMult-(x.won?x.posFactor:2-x.posFactor))<1e-12)
    && Object.values(alle).some(x=>!x.won && x.posFactor!==1);
  return {wert:bd.posStrength, soll:l.wert, faktor:bd.posFactor, sollFaktor:posFactor(l,'reves',cfg.pos_swing), spiegel};
})()`);
ok(eloLage.spiegel, 'Nach einer Niederlage gilt der Faktor gespiegelt: Schutz auf der schwächeren Seite, Abzug auf der stärkeren');
ok(Math.abs(eloLage.wert-eloLage.soll)<1e-12 && Math.abs(eloLage.faktor-eloLage.sollFaktor)<1e-12,
  'Die Elo-Rechnung nimmt das Positionsprofil aus den Partien davor, mit derselben Lage und demselben Bonus: '+JSON.stringify(eloLage));
// Eine Partie in der letzten Sekunde des Monats gehört ihm ganz: `seasonOf`
// ordnete sie dem Mai zu, aber `seasonEnd` war 23:59:59,000, und jeder
// Filter bis zum Monatsende — die Partien des Monats, der Schnitt eines
// abgeschlossenen Monats — verlor sie. Der Mai hatte dann keine Partie, und
// der Juni auch nicht.
const randMonat=K(`(() => {
  players=Array.from({length:4},(_,i)=>({id:'r'+i,name:'Rand '+i,hidden:false,elo:0,atk:.5}));
  const t=new Date(2026,4,31,23,59,59,500).toISOString();
  matches=[{...window.__partie,id:'rand',a1:'r0',a2:'r1',b1:'r2',b2:'r3',created_at:t,deltas:{r0:10,r1:10,r2:-10,r3:-10}}];
  seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  return {monat:seasonOf(t).id, drin:matchesInSeason('2026-05').length, juni:matchesInSeason('2026-06').length,
    schnitt:_partienBis(seasonEnd('2026-05').getTime()).length,
    erster:seasonEnd('2026-05').getTime()+1===new Date(2026,5,1).getTime()};
})()`);
ok(randMonat.monat==='2026-05'&&randMonat.drin===1&&randMonat.juni===0&&randMonat.schnitt===1&&randMonat.erster,
  'Eine Partie in der letzten Sekunde des Monats zählt zu ihm, und eine Millisekunde nach seinem Ende ist der Erste: '+JSON.stringify(randMonat));
// Der Saisonverlauf rechnet jede Saison, in der gespielt wurde, die neueste
// zuerst; die echten Partien reichen über weniger Monate, deshalb hier
// sieben mit je einer Partie am Monatsersten. Dass das Profil sie alle zeigt
// und nicht die letzten fünf, prüft tests/blatt.
const verlauf=K(`(() => {
  players=Array.from({length:4},(_,i)=>({id:'s'+i,name:'Saison '+i,hidden:false,elo:0,atk:.5}));
  const jetzt=new Date();
  matches=Array.from({length:7},(_,k)=>({...window.__partie,id:'v'+k,a1:'s0',a2:'s1',b1:'s2',b2:'s3',
    created_at:new Date(jetzt.getFullYear(),jetzt.getMonth()-6+k,1,0,30).toISOString(),
    deltas:{s0:20,s1:20,s2:-20,s3:-20}}));
  seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  const h=computeSeasonHistory('s0');
  return {n:h.length,absteigend:h.every((x,i)=>!i||h[i-1].id>x.id),neueste:!!h[0]&&h[0].id===currentSeason().id};
})()`);
ok(verlauf.n===7&&verlauf.absteigend&&verlauf.neueste,'Der Saisonverlauf zeigt jede Saison mit Partien, die neueste zuerst: '+JSON.stringify(verlauf));
// Was einen ganzen Tag beschreibt, gilt erst, wenn der Tag zu ist. Am 19.10.
// stand „Unschlagbar" für Leon um 14:26 nach dem dritten Sieg im Feed, mit
// Karte und Hinweis, obwohl der Tag noch lief; Comeback-Tag, Zusammenbruch,
// Schwarzer Tag und der Spieler des Tages zählten ebenso vor dem Abend.
// Gespielt wird drei Siege bis 13 Uhr und — im zweiten Fall — eine
// Niederlage um 17 Uhr.
const tag=(uhr,jetzt,mitPleite)=>{
  setNow(Date.UTC(2026,9,19,uhr[0],uhr[1]));
  return K(`(() => {
    players=Array.from({length:4},(_,i)=>({id:'t'+i,name:'Tag '+i,hidden:false,elo:0,atk:.5}));
    const p=(id,h,m,a)=>({...window.__partie,id,a1:'t0',a2:'t1',b1:'t2',b2:'t3',
      created_at:new Date(Date.UTC(2026,9,19,h,m)).toISOString(),winner:a?'A':'B',
      games_a:a?10:4,games_b:a?4:10,deltas:{t0:a?20:-20,t1:a?20:-20,t2:a?-20:20,t3:a?-20:20}});
    matches=[p('t1',12,0,1),p('t2',12,30,1),p('t3',13,0,1)].concat(${mitPleite} ? [p('t4',17,0,0)] : []);
    seasons=[];cfg={...window.__cfgBasis};invalidateCache();
    const ev=Object.entries(getBadgeEarnedCache()).flatMap(([mid,l])=>l.map(e=>({mid,pid:e.playerId,b:e.badge.id,ende:e.meta&&e.meta.tagEnde})));
    const n=(pid,b)=>(computeBadges(pid).find(x=>x.id===b)||{}).count||0;
    // Wo Unschlagbar steht: eine eigene Karte, die Karte einer Partie oder —
    // seit der Schluss des Tages seine Ehrung hat — die Karte des Spielers
    // des Tages, als Ehrung des Tages [§11.6f]. Dort stand es sonst ein
    // zweites Mal.
    let karte='';
    try { const l=_buildStories(), s=l.find(x=>(x.dataRef||{}).badgeId==='unbeatable');
      const t=l.find(x=>(x.dataRef||{}).type==='potd'&&(x.dataRef.ehrung||[]).some(y=>y.posten.some(q=>q.id==='unbeatable')));
      const k=[];
      if(s) k.push(new Date(s.when).toISOString().slice(11,16)+(s.dataRef.matchId?' an der Partie':' eigene Karte'));
      if(t) k.push(new Date(t.when).toISOString().slice(11,16)+' Spieler des Tages');
      karte=k.join(', '); } catch(e){ karte='Fehler '+e.message; }
    return {karte,unschlagbar:n('t0','unbeatable'),schwarz:n('t2','black_day'),zusammenbruch:n('t0','crash_day'),
      comeback:n('t2','comeback_day'),potd:n('t0','potd'),
      ev:ev.filter(e=>['unbeatable','black_day','crash_day','comeback_day'].includes(e.b)).map(e=>e.pid+':'+e.b+'@'+e.mid+(e.ende?'/'+e.ende:'')).sort().join(' ')};
  })()`);
};
const mittag=tag([14,26],0,false), abend=tag([23,59],0,false), pleite=tag([23,59],0,true), pleiteMittag=tag([17,30],0,true);
ok(mittag.unschlagbar===0&&mittag.schwarz===0&&mittag.potd===0&&mittag.ev==='',
  'Um 14:26 ist kein Tag zu: weder Unschlagbar noch Schwarzer Tag noch Spieler des Tages, und keine Vergabe: '+JSON.stringify(mittag));
ok(abend.unschlagbar===1&&abend.schwarz===1&&abend.potd===1&&abend.karte==='23:59 Spieler des Tages'
  &&abend.ev==='t0:unbeatable@t3/2026-10-19 t1:unbeatable@t3/2026-10-19 t2:black_day@t3/2026-10-19 t3:black_day@t3/2026-10-19',
  'Um 23:59 gilt der Tag, an der letzten Partie, und Unschlagbar steht einmal, am Tagesende in der Karte des Spielers des Tages statt in der Karte einer Partie: '+JSON.stringify(abend));
ok(pleiteMittag.zusammenbruch===0&&pleiteMittag.comeback===0&&pleiteMittag.ev==='',
  'Nach einer Niederlage um 17 Uhr ist der Tag noch nicht „mit einer Niederlage beendet": '+JSON.stringify(pleiteMittag));
ok(pleite.unschlagbar===0&&pleite.schwarz===0&&pleite.zusammenbruch===1&&pleite.comeback===1
  &&pleite.ev==='t0:crash_day@t4/2026-10-19 t1:crash_day@t4/2026-10-19 t2:comeback_day@t4/2026-10-19 t3:comeback_day@t4/2026-10-19',
  'Mit der Niederlage am Abend ist der Tag nicht unschlagbar, sondern ein Zusammenbruch, und für die Gegner ein Comeback-Tag: '+JSON.stringify(pleite));
// Dieselbe Regel in Liga-Rekorden und Monatschronik: „Der makellose Tag",
// „Der Tagesabschluss", „Der Schlussstrich" und die Tagesquoten fragen nach
// dem ganzen Tag. Ein Vortag mit 22 Partien im Wechsel (die Rekorde zählen
// ab dreißig), dann acht Siege bis 13:30, gefragt um 14:26 und um 23:59.
const tagesRekord=(uhr)=>{
  setNow(Date.UTC(2026,9,19,uhr[0],uhr[1]));
  return K(`(() => {
    players=Array.from({length:4},(_,i)=>({id:'t'+i,name:'Tag '+i,hidden:false,elo:0,atk:.5}));
    const p=(id,tag,min,a)=>({...window.__partie,id,a1:'t0',a2:'t1',b1:'t2',b2:'t3',
      created_at:new Date(Date.UTC(2026,9,tag,10,min)).toISOString(),winner:a?'A':'B',
      games_a:a?10:4,games_b:a?4:10,deltas:{t0:a?20:-20,t1:a?20:-20,t2:a?-20:20,t3:a?-20:20}});
    matches=Array.from({length:22},(_,i)=>p('v'+i,18,i*20,i%2===0))
      .concat(Array.from({length:8},(_,i)=>p('r'+i,19,i*30,true)));
    seasons=[];cfg={...window.__cfgBasis};invalidateCache();
    const r=_chronicleCtx().P.t0||{}, m=_seasonTitleCtx('2026-10').P.t0||{};
    return {makellos:r.perfDays||0, abschluss:r.sbN||0, schluss:m.lastG||0, besterTag:m.bestPerfTag||0, tage:m.tagN||0};
  })()`);
};
const rekMittag=tagesRekord([14,26]), rekAbend=tagesRekord([23,59]);
ok(rekMittag.makellos===0&&rekMittag.abschluss===1&&rekMittag.schluss===1&&rekMittag.besterTag===0&&rekMittag.tage===1,
  'Um 14:26 zählt nur der Vortag in Rekorden und Chroniken, die nach dem ganzen Tag fragen: '+JSON.stringify(rekMittag));
ok(rekAbend.makellos===1&&rekAbend.abschluss===2&&rekAbend.schluss===2&&rekAbend.besterTag===8&&rekAbend.tage===2,
  'Um 23:59 zählt der Tag überall mit: '+JSON.stringify(rekAbend));
// Die Ehrung [§11.6f]: der Tag hat eine, und sie ist Teil des Spielers des
// Tages um 23:59, mit allem, was der Tag vergab. Es gab eine Ehrung je
// Runde, zwei Stunden nach ihrer letzten Partie: 13:02 und 15:30 ergaben
// zwei Karten (um 15:02 und um 18:50), und mit dem Spieler des Tages
// standen drei untereinander, jede mit einem Teil des Tages. Was die Karte
// des Tages an Prestige nennt, ist das Prestige der Auszeichnungen in der
// Laufbahn.
const ehrung=(zeiten,uhr)=>{
  setNow(Date.UTC(2026,9,19,uhr[0],uhr[1]));
  return K(`(() => {
    players=Array.from({length:4},(_,i)=>({id:'t'+i,name:'Tag '+i,hidden:false,elo:0,atk:.5}));
    matches=${JSON.stringify(zeiten)}.map((z,i)=>({...window.__partie,id:'e'+i,a1:'t0',a2:'t1',b1:'t2',b2:'t3',
      created_at:new Date(Date.UTC(2026,9,19,z[0],z[1])).toISOString(),winner:'A',
      games_a:10,games_b:i%2?9:4,deltas:{t0:20,t1:20,t2:-20,t3:-20}}));
    seasons=[];cfg={...window.__cfgBasis};invalidateCache();
    const l=_buildStories();
    const tag=l.find(s=>(s.dataRef||{}).type==='potd');
    const bMap=getBadgeEarnedCache();
    const ausPartien=matches.reduce((n,m)=>n+(bMap[m.id]||[]).filter(e=>auszeichnungsPunkte(e.badge.id,1)>0).length,0);
    const sp=tag?tag.dataRef.ehrung:[];
    const summe=pid=>((sp.find(x=>x.pid===pid)||{}).summe||0);
    return {ehrungen:l.filter(s=>(s.dataRef||{}).type==='ehrung').map(s=>s.id),
      tag:tag?new Date(tag.when).toISOString().slice(11,16):'',
      genannt:sp.reduce((n,x)=>n+x.posten.reduce((m,q)=>m+q.mal,0),0), ausPartien,
      schluss:sp.some(x=>x.posten.some(q=>q.id==='potd')),
      prestige:['t0','t2'].map(pid=>[Math.round(summe(pid)),Math.round((prestigeOf(pid).teile||{}).auszeichnung||0)])};
  })()`);
};
const amNachmittag=ehrung([[13,2],[15,30],[16,50]],[19,0]);
const amSchluss=ehrung([[13,2],[15,30],[16,50]],[23,59]);
ok(!amNachmittag.ehrungen.length&&!amNachmittag.tag,
  'Vor dem Schluss des Tages steht keine Ehrung, auch nicht zwei Stunden nach einer Runde: '+JSON.stringify(amNachmittag));
ok(amSchluss.tag==='23:59'&&!amSchluss.ehrungen.length&&amSchluss.schluss&&amSchluss.genannt>amSchluss.ausPartien&&amSchluss.ausPartien>0,
  'Um 23:59 trägt der Spieler des Tages alles, was die Partien und der Schluss des Tages vergaben, und keine Ehrung steht daneben: '+JSON.stringify(amSchluss));
ok(amSchluss.prestige.every(([a,b])=>a>0&&Math.abs(a-b)<=1),
  'Was die Ehrung des Tages an Prestige nennt, ist das Prestige der Auszeichnungen in der Laufbahn: '+JSON.stringify(amSchluss.prestige));
// Tages- und Wochenkönig zählen den Anteil der eigenen Spieltage, nicht
// die Zahl der Titel [§C28]: wer an 4 von 6 Spieltagen der Beste war, steht
// vor dem, der es an 5 von 12 war.
setNow(Date.UTC(2026,9,19,12,0));
const koenige=K(`(() => {
  const ids=['a','b','q1','q2','q3','q4','o1','o2'];
  players=ids.map(id=>({id,name:'Spieler '+id,hidden:false,elo:0,atk:.5}));
  const ms=[]; let n=0;
  const tag=(pid,datum,sieg)=>{
    const runden=sieg?4:1;
    for(let i=0;i<runden;i++){
      const mit='q'+(i+1), w=sieg;
      ms.push({...window.__partie,id:'k'+(n++),a1:pid,a2:mit,b1:'o1',b2:'o2',
        created_at:new Date(Date.UTC(2026,8,datum,10,i*20)).toISOString(),winner:w?'A':'B',
        games_a:w?10:4,games_b:w?4:10,deltas:{[pid]:w?20:-20,[mit]:w?20:-20,o1:w?-20:20,o2:w?-20:20}});
    }
  };
  [1,2,3,4,5,6].forEach((d,i)=>tag('a',d,i<4));
  [7,8,9,10,11,12,13,14,15,16,17,18].forEach((d,i)=>tag('b',d,i<5));
  matches=ms;seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  const l=awardRankings('all').dayKingList.filter(x=>x.id==='a'||x.id==='b');
  return l.map(x=>x.id+':'+x.v+'/'+x.n);
})()`);
ok(koenige.join(' ')==='a:4/6 b:5/12',
  'Der Tageskönig ist, wer den größten Anteil seiner Spieltage gewann, nicht wer die meisten Titel sammelte: '+JSON.stringify(koenige));
// Der Ring am Avatar trägt jeden Zustand, nicht nur den ersten [§13.7]:
// Player of the Week und Player of the Day, je Spieler aus SEINER letzten
// abgeschlossenen Woche und SEINEM letzten abgeschlossenen Spieltag mit
// eigenen Partien. Gezählt wurde der letzte Zeitraum der Liga: Leon war am
// 21.10. Spieler des Tages, an den drei Spieltagen danach spielte die Liga
// ohne ihn, und das Zeichen war weg. Hier gewinnt c die Woche 8 und den
// 23.02. und spielt danach nicht mehr — er trägt beides, obwohl b Woche 10
// und den 16.03. gewann. a gewann Woche 9 und den 02.03., verlor am 10.03.
// in Woche 10 und spielt heute: sein letzter Zeitraum ist Woche 10 und der
// 10.03., an dem niemand drei Siege holte — kein Zeichen. Die Wochen werden
// nach der Zeit verglichen: als Text steht „2027-W10" vor „2027-W9", und a
// trüge sonst die neunte weiter.
setNow(Date.UTC(2027,2,17,12,0));
const ringe=K(`(() => {
  const ids=['a','b','c','q1','q2','q3','q4','o1','o2'];
  players=ids.map(id=>({id,name:'Spieler '+id,hidden:false,elo:0,atk:.5}));
  const ms=[]; let n=0;
  const siege=(pid,tag,stunde,zahl,monat)=>{
    for(let i=0;i<zahl;i++){
      const mit='q'+(1+i%4);
      ms.push({...window.__partie,id:'r'+(n++),a1:pid,a2:mit,b1:'o1',b2:'o2',
        created_at:new Date(Date.UTC(2027,monat==null?2:monat,tag,stunde,i*15)).toISOString(),winner:'A',
        games_a:10,games_b:4,deltas:{[pid]:20,[mit]:20,o1:-20,o2:-20}});
    }
  };
  siege('c',23,10,5,1);  // Woche 8, Spieltag 23.02., danach nie wieder
  siege('a',2,10,5);     // Woche 9, Spieltag 02.03.
  siege('b',9,10,5);     // Woche 10, die letzte abgeschlossene
  ms.push({...window.__partie,id:'r'+(n++),a1:'b',a2:'q1',b1:'a',b2:'o1',   // a verliert am 10.03.
    created_at:new Date(Date.UTC(2027,2,10,10,0)).toISOString(),winner:'A',
    games_a:10,games_b:6,deltas:{b:20,q1:20,a:-20,o1:-20}});
  siege('b',16,10,3);    // Spieltag 16.03., zu
  siege('a',17,9,4);     // heute, noch offen
  matches=ms.sort((x,y)=>new Date(x.created_at)-new Date(y.created_at));
  seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  const zeig=id=>avRingeOf(id).filter(r=>r.kind==='potw'||r.kind==='potd').map(r=>r.kind+':'+r.sub).join(',');
  const l=avRingeOf('b');
  return {a:zeig('a'),b:zeig('b'),c:zeig('c'),erster:(avRingOf('b')||{}).kind,alle:l.map(r=>r.kind).join(),
    geordnet:l.every((r,i)=>!i||l[i-1].prio>=r.prio)};
})()`);
ok(ringe.b==='potw:Woche 10,potd:Spieltag 16.03.'&&ringe.geordnet&&ringe.erster===ringe.alle.split(',')[0],
  'Der Ring trägt Woche und Tag zugleich, aus der letzten abgeschlossenen Woche und dem letzten abgeschlossenen Spieltag: '+JSON.stringify(ringe));
ok(ringe.c==='potw:Woche 8,potd:Spieltag 23.02.',
  'Wer danach nicht mehr spielte, trägt Woche und Tag seines letzten eigenen Zeitraums weiter: '+JSON.stringify(ringe));
ok(ringe.a==='',
  'Wer seinen letzten eigenen Zeitraum nicht gewann, trägt keinen älteren Sieg, auch nicht nach der Reihenfolge der Schlüssel: '+JSON.stringify(ringe));
// Mit den Jahren: eine Dauer in der Einheit, die man sagt, und eine lange
// Zahl mit Tausenderpunkt. Nach den Wochen kam keine Einheit mehr („nach
// 130 Wochen"), und die Fun Facts schrieben „82820 Tore".
const lang=JSON.parse(K(`JSON.stringify((() => {
  const T=864e5, s=ms=>{const x=_spSeit(ms);return x.n+' '+x.e+'|'+x.nom;};
  return {seit:[s(3*T),s(20*T),s(70*T),s(400*T),s(910*T),s(366*T*3)],
    zahl:[tausender('82820 Tore in 5152 Partien'),tausender('Im Schnitt 16,1 Tore, 123456,5 Punkte'),
      tausender('Die Liga sieht ein 10:8 zum 1.012. Mal'),tausender('Rang 2029, -12345 Elo, Spiel m12345'),
      tausender(tausender('100000'))]};
})())`));
ok(lang.seit.join()==='3 Tagen|Tage,3 Wochen|Wochen,2 Monaten|Monate,13 Monaten|Monate,2 Jahren|Jahre,3 Jahren|Jahre',
  'Eine lange Dauer steht in Monaten und Jahren, nicht in Wochen: '+lang.seit.join(' · '));
ok(lang.zahl.join(' · ')==='82.820 Tore in 5152 Partien · Im Schnitt 16,1 Tore, 123.456,5 Punkte · Die Liga sieht ein 10:8 zum 1.012. Mal · Rang 2029, -12.345 Elo, Spiel m12345 · 100.000',
  'Eine Zahl ab fünf Stellen trägt Tausenderpunkte, eine vierstellige, eine schon gegliederte und eine in einem Namen nicht: '+lang.zahl.join(' · '));
// Ein Tag in einem Satz trägt sein Jahr, wenn es nicht das laufende ist,
// und am Satzende genau einen Punkt: „am 15.03." stand sonst drei Jahre
// später da, und der Wochenrekord endete auf „21.06..".
setNow(new Date(2027,4,10,12).getTime());
const tage=JSON.parse(K(`JSON.stringify([datumFmt(new Date(2026,2,15),'tmx'),datumFmt(new Date(2027,2,15),'tmx'),
  tagImSatz(new Date(2026,2,15)),tagImSatz(new Date(2027,2,15))])`));
ok(tage.join(' ')==='15.03.26 15.03. 15.03.26. 15.03.',
  'Ein Tag aus einem anderen Jahr trägt das Jahr, am Satzende mit genau einem Punkt: '+tage.join(' · '));
console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
process.exitCode=fails?1:0;
