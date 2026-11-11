// Die Padel-Logik [§1.3]: Sätze, Games, Sieger, Zu Null, Tiebreak, das
// Gewicht einer Partie in der Elo, die Satz-Eingabe und die Regeln, wann der
// Feed überhaupt etwas erzählt. Rechnet ohne Browser (tests/runtime.js) und
// mit gebauten Fällen, nicht mit der Testliga: jede Zusicherung soll eine
// Regel festhalten, die man in einem Satz sagen kann.
const {K, setNow} = require('./runtime.js').createRuntime();
let checks = 0, fails = 0;
const ok = (c, msg) => { checks++; if(!c) fails++; console.log((c ? '  ok  ' : '  ✗   ') + msg); };
const J = s => JSON.parse(K(`JSON.stringify(${s})`));
const aus = (saetze) => J(`(()=>{const p=saetzeAuswerten(${JSON.stringify(saetze)});return {w:p.winner,sa:p.setsA,sb:p.setsB,ga:p.gamesA,gb:p.gamesB,
  zn:p.zuNull,db:p.doppelBagel,wende:p.wende,tb:p.entscheidTb,knapp:p.knapp,deutlich:p.deutlich,f:p.fehler,bA:p.bagelsA};})()`);
const S = (a, b, art = 'n') => ({a, b, art});

// ── Sieger, Sätze, Games ──────────────────────────────────────────────
let p = aus([S(6,4), S(6,3)]);
ok(p.w === 'A' && p.sa === 2 && p.sb === 0 && p.ga === 12 && p.gb === 7, '6:4 6:3 → A gewinnt 2:0, 12:7 Games');
ok(p.zn === true && p.deutlich === false, 'Zwei Sätze ohne Satzverlust sind zu Null, 6:4 6:3 ist nicht deutlich');
p = aus([S(6,0)]);
ok(p.w === 'A' && p.zn === false && p.bA === 1, 'Ein einzelner Satz 6:0 ist ein Bagel, aber kein Zu Null (1:0)');
p = aus([S(6,0), S(6,0)]);
ok(p.db === true && p.zn === true, '6:0 6:0 ist ein Doppel-Bagel');
p = aus([S(3,0), S(3,0), S(3,0)]);
ok(p.w === 'A' && p.sa === 3 && p.zn === true && p.db === false, 'Kurzsätze 3:0 3:0 3:0: 3:0 in Sätzen, zu Null, kein Bagel');
p = aus([S(4,6), S(6,4), S(10,8,'mtb')]);
ok(p.w === 'A' && p.ga === 11 && p.gb === 10 && p.wende && p.tb && p.knapp,
  '4:6 6:4 10:8 (Match-Tiebreak): A gewinnt, der MTB zählt als ein Game, Wende und Tiebreak-Krimi');
p = aus([S(7,6,'tb')]);
ok(p.w === 'A' && p.tb === true, 'Ein einziger Satz 7:6 ist im Tiebreak entschieden');
p = aus([S(6,4), S(3,3,'open')]);
ok(p.w === 'A' && p.sa === 1 && !p.f, 'Ein offener Satz zählt nicht als Satz, die Partie ist trotzdem entschieden');
p = aus([S(5,6,'open'), S(4,2,'open')]);
ok(p.w === 'A' && p.sa === 0 && p.sb === 0 && !p.f, 'Nur offene Sätze (die Zeit war um): es entscheiden die Games, 9:8 für A');
p = aus([S(3,3,'open')]);
ok(p.w === null && !!p.f, 'Völliger Gleichstand braucht eine Entscheidung und lässt sich nicht speichern');

// ── Die Satz-Eingabe liest die Art selbst ────────────────────────────
const liste = st => J(`satzListe(${JSON.stringify(st)}).map(s=>s.art).join(',')`);
ok(liste({saetze:[{a:'6',b:'4'},{a:'4',b:'6'},{a:'10',b:'7'}]}) === 'n,n,mtb', 'Nach 1:1 ist ein Satz ab 10 ein Match-Tiebreak');
ok(liste({saetze:[{a:'10',b:'8'}]}) === 'n', 'Ein erster Satz bis 10 bleibt ein normaler (langer) Satz');
ok(liste({saetze:[{a:'7',b:'6'},{a:'3',b:'3'},{a:'',b:''}]}) === 'tb,open', '7:6 ist ein Tiebreak, Gleichstand offen, leere Zeilen fallen weg');
ok(J(`satzAuswertung({saetze:[{a:'4',b:'2'}]}).winner`) === 'A', 'Jedes Ergebnis lässt sich eintragen, auch ein Kurzsatz 4:2');

// ── Das Gewicht: der Weg bis zum Sieg ────────────────────────────────
const gw = sets => J(`partieGewicht({sets:${JSON.stringify(sets)},set_kind:${JSON.stringify(sets.map(() => 'n'))},winner:'A'})`);
ok(gw([[6,4]]) > gw([[3,0]]) && gw([[6,0]]) > gw([[2,0]]), 'Ein Satz bis 6 wiegt mehr als ein Kurzsatz bis 3 oder 2');
ok(Math.abs(gw([[6,0]]) - gw([[6,4]])) < 1e-9, '6:0 und 6:4 wiegen gleich lang — wie knapp, sagt die MoV');
ok(Math.abs(gw([[6,4]]) - 1) < 1e-9 && gw([[7,6]]) > 1, 'Ein Satz bis 6 ist das volle Gewicht, ein 7:6 etwas mehr');

// ── Elo: längere Partien geben mehr ──────────────────────────────────
K(`players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];0`);
const delta = sets => J(`(()=>{const m={id:'x',a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
  ...partieFelder(${JSON.stringify(sets.map(([a, b]) => ({a, b, art:'n'})))}),created_at:'2026-08-10T18:00:00Z'};
  matches=[m];invalidateCache();return simulateEloWithSliders([m]).history[0].deltas.p1;})()`);
const d64 = delta([[6,4]]), d30 = delta([[3,0]]), d60 = delta([[6,0]]), d2 = delta([[6,4],[6,3]]);
ok(d64 > d30, `6:4 bringt mehr Elo als 3:0 (${d64} gegen ${d30})`);
ok(d60 >= d64, `6:0 bringt mindestens so viel wie 6:4 (${d60} gegen ${d64})`);
ok(d2 > d64, `Zwei Sätze bringen mehr als einer (${d2} gegen ${d64})`);

// ── Der Feed in einer leeren und einer ruhenden Liga ─────────────────
setNow(new Date(2026, 7, 26, 16, 0).getTime());
ok(J(`(()=>{matches=[];invalidateCache();return _buildStories().length;})()`) === 0, 'Eine Liga ohne Partie bekommt keine einzige Story');
const ambient = tageHer => J(`(()=>{const t=Date.now()-${tageHer}*86400000;
  matches=Array.from({length:12},(_,i)=>({id:'a'+i,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:6,b:i%3,art:'n'}]),deltas:{p1:5,p2:5,p3:-5,p4:-5},exp_a:.5,created_at:new Date(t-(11-i)*3600000).toISOString()}));
  invalidateCache();_cache._stories=[];return _buildStories().filter(s=>String(s.id).startsWith('ambient_')).map(s=>s.id);})()`);
// Letzte Partie am 21.08.; Fun Facts gibt es bis drei Tage danach (22.–24.),
// am 25. und 26. nicht mehr.
const ruhig = ambient(5);
ok(ruhig.length > 0 && ruhig.every(id => id < 'ambient_2026-08-25'),
  'Mehr als drei Tage nach der letzten Partie kommt kein Fun Fact mehr: ' + ruhig.join(', '));
ok(J(`AMBIENT_RUHE_TAGE`) === 3, 'Die Ruhezeit der Fun Facts sind drei Tage');

// ── Auszeichnungen ───────────────────────────────────────────────────
const zaehl = (id, sets) => J(`(()=>{const m={id:'b',a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
  ...partieFelder(${JSON.stringify(sets)}),exp_a:.5,created_at:'2026-08-10T18:00:00Z'};
  return BADGES.find(b=>b.id==='${id}').count('p1',[m]);})()`);
ok(zaehl('perfect_win', [S(6,0), S(6,0)]) === 1 && zaehl('perfect_win', [S(6,0)]) === 0, 'Absoluter Sieger heißt Doppel-Bagel, ein einzelnes 6:0 reicht nicht');
ok(zaehl('nail_biter', [S(4,6), S(6,4), S(10,8,'mtb')]) === 1, 'Ein Sieg im Match-Tiebreak ist ein Zittersieg');
ok(zaehl('wall_badge', [S(4,6), S(6,3)]) === 1, 'Satzrückstand gedreht ist „Die Wende"');

// ── Das Insignium auf Padel-Volumen ──────────────────────────────────
ok(J(`INSIGNIEN.map(x=>x.min).join(',')`) === '0,400,800,1200,1700,2500,3200',
  'Die Stufen: Reif 0, Schildring 400, Volutenkranz 800, Zierkranz 1200, Lorbeerreif 1700, Kronenreif 2500, Ordensstern 3200');
ok(J(`insigniumGradSchwellen(4).join(',')`) === '1700,1900,2200' && J(`insigniumGradSchwellen(6).join(',')`) === '3200,3600,4000',
  'Die Grade: Lorbeerreif 1700/1900/2200, Ordensstern 3200/3600/4000');
ok(J('insigniumStufeVon(399)') === 0 && J('insigniumStufeVon(400)') === 1 && J('insigniumStufeVon(3199)') === 5,
  'Die Grenzen liegen genau auf den Schwellen');

// ── Der erste Tag: keine Woche, keine leere Ansicht ──────────────────
// Eine Liga mit einem Spieler und ohne Partie, wie nach dem Anlegen. Jede
// Ansicht trägt dann eine Vorschau statt „noch keine Daten".
K(`players=[{id:'p1',name:'Leon',hidden:false,elo:0,drive:.5}];matches=[];seasons=[];invalidateCache();0`);
const ANSICHTEN = {
  'Liga Saison': "period='season';_vRankingCore()", 'Liga Tag': "period='day';_vRankingCore()",
  'Ewige Tafel': "period='all';_vRankingCore()", 'Awards': "awView='awards';vAwards()",
  'Rekorde': "awView='rekorde';vAwards()", 'Chronik': "awView='chronik';vAwards()",
  'Seiten': "rankMetric='drive';vPositions()", 'Teams': 'vTeams()', 'Verlauf': 'vHistory()',
};
const html = {};
for(const [n, c] of Object.entries(ANSICHTEN)) html[n] = K(c);
const ohne = Object.keys(html).filter(n => !html[n].includes('class="vorschau"'));
ok(!ohne.length, 'Jede Ansicht der leeren Liga trägt eine Vorschau' + (ohne.length ? ': fehlt in ' + ohne.join(', ') : ''));
ok(!/data-period="week"|data-awperiod="week"/.test(html['Liga Saison'] + html['Awards']),
  'Kein Wochenfilter: die Liga kennt Saison, Tag und Gesamt, die Awards nur die Saison');
ok(/data-period="season"[\s\S]*data-period="day"[\s\S]*data-period="all"/.test(html['Liga Saison']),
  'Die Liga bietet Saison, Tag und Gesamt in dieser Reihenfolge');
ok((html['Awards'].match(/class="aw-trophy/g) || []).length >= 30,
  'Die Awards zeigen ohne Partie die ganze Vitrine, jede Kachel noch niemandes');
ok((html['Rekorde'].match(/class="rek offen"/g) || []).length === J('CHRONICLES.length'),
  'Die Rekorde zeigen ohne Halter jeden Rekord als offene Karte');
ok((html['Chronik'].match(/class="rek offen"/g) || []).length === J('SEASON_TITLES.length'),
  'Die Chronik zeigt vor dem ersten Monat jede Monatschronik mit ihrer Bedingung');
ok(!/id="addPlayerBtn" style="margin-top:14px"/.test(html['Liga Saison'] + html['Ewige Tafel'])
  && html['Liga Saison'].includes('knopf-wort'), '„Spieler anlegen" ist nur so breit wie sein Wort und liegt nicht unter dem Plus');
ok(J(`(()=>{period='day';players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));
  const m={id:'d',a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:6,b:3,art:'n'}]),deltas:{p1:5,p2:5,p3:-5,p4:-5},exp_a:.5,created_at:new Date(Date.now()-3600000).toISOString()};
  matches=[m,{...m,id:'e',created_at:new Date(Date.now()-1800000).toISOString()}];invalidateCache();
  const h=_vRankingCore();return h.includes('Player of the Day') && h.includes('nw-name');})()`),
  'Spieler des Tages ab zwei Siegen, dieselbe Schwelle wie die Auszeichnung');


// ── Jeder Satz ist eine eigene Rechnung ──────────────────────────────
// Drei Sätze als eine Partie gegen dieselben drei Sätze einzeln. Gleich bis
// auf den Seitenbonus: das Seitenprofil zählt Partien und lernt zwischen
// zwei einzeln eingetragenen Sätzen dazu, innerhalb einer Partie nicht.
const satzLauf = liste => J(`(()=>{players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  matches=${JSON.stringify(liste)}.map((s,i)=>({id:'s'+i,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder(s.map(([a,b])=>({a,b,art:satzArt([a,b])}))),created_at:new Date(Date.UTC(2026,7,10,18,i)).toISOString()}));
  invalidateCache();const sim=simulateEloWithSliders(matches);
  return {elo:sim.elo, je:((sim.history[0].breakdowns.p3||{}).saetze||[]).map(b=>b.delta)};})()`);
const eine = satzLauf([[[5,7],[6,4],[7,5]]]), drei = satzLauf([[[5,7]],[[6,4]],[[7,5]]]);
ok(['p1','p2','p3','p4'].every(id => Math.abs(eine.elo[id] - drei.elo[id]) <= 2),
  `Drei Sätze als eine Partie geben die Elo von drei einzeln eingetragenen (${eine.elo.p1}/${eine.elo.p3} gegen ${drei.elo.p1}/${drei.elo.p3})`);
ok(eine.je.length === 3 && eine.je[0] > 0 && eine.je[1] < 0 && eine.je[2] < 0,
  `Wer einen Satz gewinnt, bekommt dafür Elo, auch in der verlorenen Partie (${eine.je.join(' ')})`);
ok(J(`(()=>{const t=partieTeile({sets:[[6,4],[3,3]],set_kind:['n','open']});return t.length===1&&t[0].winner==='A';})()`),
  'Ein offener Satz im Gleichstand hat keinen Sieger und bewegt keine Elo');
ok(J(`(()=>{players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));matches=[];invalidateCache();
  const c=computeMatch([{id:'p1',pos:'reves'},{id:'p2',pos:'drive'}],[{id:'p3',pos:'reves'},{id:'p4',pos:'drive'}],
    partieFelder([{a:5,b:7,art:'n'},{a:6,b:4,art:'n'},{a:7,b:5,art:'n'}]));
  return c.saetze.p1.length===3 && c.saetze.p1.reduce((x,y)=>x+y,0)===c.res.p1;})()`),
  'Die Vorschau beim Eintragen nennt die Elo je Satz, und sie ergibt die Summe');

console.log(fails ? `\n${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `\nALLE ${checks} CHECKS BESTANDEN`);
process.exit(fails ? 1 : 0);
