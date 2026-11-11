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
ok(p.zn === false && p.deutlich === false, 'Zu Null heißt ein Satz 6:0: 6:4 6:3 ist es nicht und auch nicht deutlich');
p = aus([S(6,0)]);
ok(p.w === 'A' && p.zn === true && p.db === false && p.bA === 1, 'Ein einzelner Satz 6:0 ist zu Null, aber kein Doppel-Bagel');
p = aus([S(6,0), S(6,0)]);
ok(p.db === true && p.zn === true, '6:0 6:0 ist ein Doppel-Bagel');
p = aus([S(3,0), S(3,0), S(3,0)]);
ok(p.w === 'A' && p.sa === 3 && p.zn === false && p.db === false, 'Kurzsätze 3:0 3:0 3:0: 3:0 in Sätzen, aber kein Satz zu Null');
p = aus([S(6,4)]);
ok(p.knapp === true && aus([S(1,0)]).knapp === false && aus([S(6,2)]).deutlich === true,
  'Je Satz: 6:4 ist knapp, ein kurzer 1:0 nicht, 6:2 ist deutlich');
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
ok(zaehl('perfect_win', [S(6,0)]) === 1 && zaehl('perfect_win', [S(6,1)]) === 0 && zaehl('perfect_loss', [S(0,6)]) === 1,
  'Absoluter Sieger heißt ein Satz zu Null (6:0), 6:1 reicht nicht; 0:6 ist der Absolute Verlierer');
ok(J(`BG.serien.join(',')`) === '5,10,15,20' && J(`BG.elo.join(',')`) === '75,150,300',
  'Serien 5/10/15/20 Sätze, Saison-Elo 75/150/300 für Aufsteiger, Dominator und Dynastie');
ok(J(`['dynasty_600','dominator_400','streak15','streak20'].every(id=>rarityOf(id)==='legendary') && rarityOf('perfect_win')==='rare'
  && RARITY_ORDER.every(k=>BADGES.filter(b=>rarityOf(b.id)===k).length===RARITY_META[k].total)`),
  'Die Klassen stimmen mit den Zählern überein, Dynastie und Dominator sind legendär');
ok(J(`BADGES.every(b=>!/Partie/.test(b.desc))`), 'Keine Auszeichnung spricht noch von Partien');
ok(J(`(()=>{rankMetric='elo';return /data-postoggle="reves" class="on"/.test(vPositions());})()`),
  'Der Seiten-Reiter öffnet auf Revés, der linken Seite');
ok(J(`(()=>{const m={id:'mx',a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
  ...partieFelder([{a:6,b:4,art:'n'}]),exp_a:.5,created_at:'2026-08-10T18:00:00Z'};
  matches=[m,{...m,id:'my',...partieFelder([{a:3,b:6,art:'n'}]),created_at:'2026-08-10T18:30:00Z'},
    {...m,id:'mz',...partieFelder([{a:6,b:2,art:'n'}]),created_at:'2026-08-10T19:00:00Z'}];invalidateCache();
  const s=playerStats('p1',matches);return s.matchW===1&&s.matchL===0&&s.wins===2&&s.losses===1;})()`),
  'Drei Sätze derselben Paare sind ein Match: 2:1 in Sätzen, 1:0 in Matches');
ok(J(`(()=>{const m={id:'r1',a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
  ...partieFelder([{a:4,b:6,art:'n'}]),exp_a:.5,created_at:'2026-08-10T18:00:00Z'};
  const w=x=>({...m,...partieFelder([{a:6,b:3,art:'n'}]),...x});
  matches=[m,w({id:'r2',created_at:'2026-08-10T18:30:00Z'})];invalidateCache();
  const inEinem=BADGES.find(b=>b.id==='revanchist').count('p1',matches);
  matches=[m,w({id:'r3',created_at:'2026-08-12T18:00:00Z'})];invalidateCache();
  const naechstes=BADGES.find(b=>b.id==='revanchist').count('p1',matches);
  return inEinem===0&&naechstes===1;})()`),
  'Revanchist heißt das nächste Match gegen dasselbe Paar gewonnen, ein 1:1 im selben Match zählt nicht');
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
  matches=[m,{...m,id:'e',created_at:new Date(Date.now()-1800000).toISOString()},{...m,id:'f',created_at:new Date(Date.now()-900000).toISOString()}];invalidateCache();
  const h=_vRankingCore();return h.includes('Player of the Day') && h.includes('nw-name');})()`),
  'Spieler des Tages ab drei gewonnenen Sätzen, dieselbe Schwelle wie die Auszeichnung');
ok(J(`(()=>{matches=matches.slice(0,2);invalidateCache();return !_vRankingCore().includes('nw-name');})()`),
  'Zwei gewonnene Sätze reichen nicht für den Spieler des Tages');


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

// ── Die Staffel der Liga und der Ausgleich im Tiebreak ───────────────
const st = sets => Math.round(gw(sets) * 1000) / 10;
ok(st([[1,0]]) === 50 && st([[2,0]]) === 62.5 && st([[3,1]]) === 75 && st([[6,0]]) === 100 && st([[6,4]]) === 100,
  `Staffel: 1:0 50 %, bis 2 62,5 %, 3:x 75 %, 6:x 100 % (${st([[1,0]])}, ${st([[2,0]])}, ${st([[3,1]])}, ${st([[6,4]])})`);
ok(st([[7,5]]) === 110 && st([[7,6]]) === 110 && st([[8,6]]) === 120 && st([[12,10]]) === 150,
  `Über sechs: 7:5 und 7:6 110 %, 8:6 120 %, höchstens 150 % (${st([[7,5]])}, ${st([[8,6]])}, ${st([[12,10]])})`);
const satzDelta = (a, b) => J(`(()=>{players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const m={id:'t',a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:${a},b:${b},art:satzArt([${a},${b}])}]),created_at:'2026-08-10T18:00:00Z'};
  matches=[m];invalidateCache();const d=simulateEloWithSliders([m]).history[0].deltas;return [d.p1,d.p3];})()`);
const [w64, l64] = satzDelta(6, 4), [w76, l76] = satzDelta(7, 6);
ok(w76 > w64, `Der Sieger eines 7:6 bekommt mehr als der eines 6:4 (${w76} gegen ${w64})`);
ok(l76 > l64, `Der Verlierer eines 7:6 verliert weniger als der eines 6:4, der Ausgleich im Tiebreak (${l76} gegen ${l64})`);

// ── Ein Satz ist eine Partie, mehrere Sätze sind eine Begegnung [§1.3] ─
// Drei Sätze auf einmal geben drei Zeilen, wie drei einzeln gespeicherte.
// B gewinnt den ersten, A den zweiten und dritten: drei Partien in Verlauf
// und Statistik, und über alle drei eine Begegnung 2:1 für A mit Wende —
// gewertet einmal, an ihrem letzten Satz. Die Datenbank ist eine Attrappe.
K(`(()=>{const ok=()=>{const c=new Proxy(function(){},{get(_,p){if(p==='then')return (a,b)=>Promise.resolve({error:null,data:null}).then(a,b);return c;},apply(){return c;}});return c;};
  sb.from=()=>ok();toast=()=>{};neuZeichnen=()=>{};0})()`);
K(`players=['p1','p2','p3','p4','p5'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];matches=[];invalidateCache();0`);
setNow(new Date(2026, 7, 26, 18, 0).getTime());
const eintrag = J(`(()=>{const c=computeMatch([{id:'p1',pos:'reves'},{id:'p2',pos:'drive'}],[{id:'p3',pos:'reves'},{id:'p4',pos:'drive'}],
  partieFelder([{a:4,b:6,art:'n'},{a:6,b:3,art:'n'},{a:3,b:3,art:'open'},{a:6,b:2,art:'n'}]));
  return c.je.map(x=>({s:x.zeile.sets.length,w:x.zeile.winner,d:x.res.p1}));})()`);
ok(eintrag.length === 3 && eintrag.every(x => x.s === 1) && eintrag.map(x => x.w).join('') === 'BAA',
  'Drei Sätze auf einmal werden drei Zeilen mit je einem Satz; ein offener Satz im Gleichstand fällt weg');
const zeile = (id, min, a1, a2, b1, b2, a, b) => `{id:'${id}',a1:'${a1}',a2:'${a2}',b1:'${b1}',b2:'${b2}',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
  ...partieFelder([{a:${a},b:${b},art:'n'}]),deltas:{},exp_a:.5,created_at:new Date(2026,7,26,18,${min}).toISOString()}`;
// Einzeln gespeichert, der zweite Satz mit den Teams andersherum eingetragen.
K(`matches=[${zeile('s1', 0, 'p1', 'p2', 'p3', 'p4', 4, 6)},${zeile('s2', 40, 'p3', 'p4', 'p1', 'p2', 3, 6)},${zeile('s3', 80, 'p1', 'p2', 'p3', 'p4', 6, 2)}];invalidateCache();0`);
const bg = J(`(()=>{const b=begegnungAm(matches[2]);return {n:b.n,st:b.setsA+':'+b.setsB,w:b.winner,wende:b.wende,
  erste:begegnungAm(matches[0]).n,zweite:begegnungAm(matches[1]).wende};})()`);
ok(bg.n === 3 && bg.st === '2:1' && bg.w === 'A' && bg.wende,
  `Drei Sätze derselben Paare hintereinander sind eine Begegnung, 2:1 mit Wende (${bg.st}), auch andersherum eingetragen`);
ok(bg.erste === 0 && bg.zweite === false, 'Gewertet wird die Begegnung nur an ihrem letzten Satz, sonst zählte die Wende je Satz');
const r = J(`(()=>{const s=playerStats('p1');return {g:s.games,w:s.wins,wenden:s.wenden,abz:BADGES.find(b=>b.id==='wall_badge').count('p1',matches)};})()`);
ok(r.g === 3 && r.w === 2 && r.wenden === 1 && r.abz === 1,
  `Drei Partien, zwei Siege, eine Wende, einmal „Die Wende" (${r.g}/${r.w}/${r.wenden}/${r.abz})`);
K(`matches=[${zeile('t1', 0, 'p1', 'p2', 'p3', 'p4', 4, 6)},${zeile('t2', 10, 'p1', 'p5', 'p3', 'p4', 6, 1)},${zeile('t3', 20, 'p1', 'p2', 'p3', 'p4', 6, 2)}];invalidateCache();0`);
ok(J(`begegnungAm(matches[2]).n`) === 1, 'Eine andere Partie dazwischen beendet die Begegnung');
K(`matches=[${zeile('u1', 0, 'p1', 'p2', 'p3', 'p4', 4, 6)}];invalidateCache();0`);
setNow(new Date(2026, 7, 26, 18, 40).getTime());
ok(J(`(()=>{const h=anschlussHtml({A1:'p3',A2:'p4',B1:'p1',B2:'p2',saetze:[{a:'3',b:'6'}]});return h.includes('Satz 2')&&h.includes('1:1');})()`),
  'Die Eingabe nennt den Satz der Partie und den Stand danach');
ok(J(`_mergeStorySnapshots([{id:'spiel_weg',dataRef:{matchId:'weg'},when:new Date()},{id:'spiel_u1',dataRef:{matchId:'u1'},when:new Date()}],[],new Date()).map(s=>s.id).join()`)
  === 'spiel_u1', 'Die Story einer gelöschten Partie verschwindet aus dem Feed');

const ANSCHLUSS = (async () => {
  // Eine alte Zeile mit drei Sätzen wird beim Neuberechnen geteilt.
  K(`(()=>{const ok=()=>{const c=new Proxy(function(){},{get(_,p){if(p==='then')return (a,b)=>Promise.resolve({error:null,data:[]}).then(a,b);return c;},apply(){return c;}});return c;};
    sb.from=t=>({update:()=>({eq:async()=>({error:null})}),insert:z=>({select:async()=>({error:null,data:z.map((x,i)=>({...x,id:'neu'+i}))})})});0})()`);
  K(`matches=[{id:'alt',a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:5,b:7,art:'n'},{a:6,b:4,art:'n'},{a:7,b:5,art:'n'}]),deltas:{},exp_a:.5,created_at:new Date(2026,7,26,9,57).toISOString()}];invalidateCache();0`);
  await K(`partienAufteilen()`);
  const t = J(`(()=>{const l=matches.slice().sort((x,y)=>mts(x)-mts(y));return {n:l.length,s:l.map(m=>standFuer(m,true)).join(' '),eins:l.every(m=>partieSaetze(m).length===1),bg:begegnungAm(l[2]).setsA+':'+begegnungAm(l[2]).setsB};})()`);
  ok(t.n === 3 && t.eins && t.bg === '2:1',
    `Eine alte Partie mit drei Sätzen wird in drei Sätze geteilt, als Begegnung weiter 2:1 (${t.n} Zeilen, ${t.bg})`);
})();

// ── Chronik und Rekorde: jede Schwelle der Rechnung steht im Text ────
// Seit eine Zeile ein Satz ist, stehen die Schwellen in Sätzen; vorher
// nannten die Texte oft andere Zahlen als die Rechnung („die letzten 40"
// bei einem Fenster von zwanzig, „ab 3" bei einem Tor von fünf). Gelesen
// werden die Vergleiche in der eigenen Bedingung, der Stichprobe und der
// Wertfunktion, mit aufgelösten Konstanten (ST_TEIL, ST_TAG, RF …); eine
// Schwelle, die als Bruch im Text steht („zwei Drittel", „3 Siege mehr"
// von fünf), ist ausgenommen.
const _schwelle = J(`(()=>{
  const KONST={ST_TEIL,ST_TAG,ST_TAG_LANG,CHRONIK_MIN_SPIELE,TITLE_MIN_GAMES};
  Object.keys(RF).forEach(k=>KONST['RF.'+k]=RF[k]);
  const aufloesen=src=>{let x=src.replace(/2\\s*\\*\\s*(ST_TEIL|ST_TAG|RF\\.\\w+)/g,(m,k)=>String(2*KONST[k]));
    Object.keys(KONST).sort((a,b)=>b.length-a.length).forEach(k=>{x=x.split(k).join(String(KONST[k]));});return x;};
  const WORT={2:'zwei',3:'drei',4:'vier',5:'fünf',6:'sechs',7:'sieben',8:'acht',9:'neun',10:'zehn',11:'elf',12:'zwölf'};
  const hat=(txt,n)=>{const k=[String(n),String(n).replace('.',',')];if(WORT[n])k.push(WORT[n]);
    if(n>0&&n<1){k.push(String(Math.round(n*1000)/10).replace('.',','));k.push(String(Math.round(n*100)));}
    return k.some(v=>/^[0-9]/.test(v)?new RegExp('(^|[^0-9.,])'+v.replace(/[.]/g,'\\\\.')+'([^0-9]|$)').test(txt):txt.toLowerCase().indexOf(v)>=0);};
  const fehlt=[];
  const pruef=(name,txt,src)=>{const z=new Set();const re=/(?:>=|<=|>|<)\\s*([0-9]+(?:\\.[0-9]+)?)/g;let m;
    const s=aufloesen(src);while((m=re.exec(s)))z.add(parseFloat(m[1]));
    txt=txt.replace(/\\u00a0/g,' ');
    [...z].forEach(n=>{if(n!==0&&n!==1&&!hat(txt,n))fehlt.push(name+': '+n);});};
  const BRUCH=['wochenkrone','nachzuegler','strohfeuer'];
  let monate=0;
  DISZIPLINEN.forEach(d=>{const m=d.monat;if(!m||!m.mind)return;monate++;
    pruef(d.name,(m.cond||'')+' '+(m.wie||''),String(m.mind.eigen||'')+' '+String(m.stichprobe||''));
    if(m.ab>0&&m.ab<1&&!BRUCH.includes(d.id)&&!hat(String(m.cond||'').replace(/\\u00a0/g,' '),m.ab))fehlt.push(d.name+' ab '+m.ab);});
  CHRONICLES.forEach(c=>pruef(c.name,(c.cond||'')+' '+(c.wie||'')+' '+(c.mind||''),String(c.raw||c.val||'')));
  return {fehlt, monate, rekorde:CHRONICLES.length,
    alt:DISZIPLINEN.filter(d=>/Partie|Tor\\b|Tore\\b/.test(JSON.stringify([d.name,d.monat&&d.monat.cond,d.monat&&d.monat.wie,d.allzeit&&d.allzeit.cond,d.allzeit&&d.allzeit.wie,d.allzeit&&d.allzeit.mind]))).map(d=>d.id)};})()`);
ok(_schwelle.fehlt.length === 0 && _schwelle.monate > 50 && _schwelle.rekorde > 50,
  'Jede Schwelle der Chronik und der Rekorde steht auch in ihrem Text: ' + (_schwelle.fehlt.slice(0, 6).join(' · ') || _schwelle.monate + ' Monatschroniken, ' + _schwelle.rekorde + ' Rekorde'));
ok(_schwelle.alt.length === 0, 'Kein Chronik-Text spricht noch von Partien oder Toren: ' + _schwelle.alt.join(', '));
ok(J('[CHRONIK_MIN_SPIELE, ST_TEIL, ST_TAG, CHRON_MIN_GAMES, RF.lauf]').join(',') === '8,5,5,40,50',
  'Chronik in Sätzen: 8 im Monat, Teilmengen ab 5, ein Spieltag ab 5, Rekorde ab 40, der Lauf über 50');

// Der Anschluss läuft asynchron (Speichern); das Ergebnis erst danach.
ANSCHLUSS.catch(e => ok(false, 'Anschluss abgebrochen: ' + (e && e.message))).then(() => {
  console.log(fails ? `\n${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `\nALLE ${checks} CHECKS BESTANDEN`);
  process.exit(fails ? 1 : 0);
});
