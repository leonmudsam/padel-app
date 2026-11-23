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
  'Bagel serviert heißt ein Satz zu Null (6:0), 6:1 reicht nicht; 0:6 ist Bagel kassiert');
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
  'Ohne Spieltag in der Woche kein Wochenreiter: die Liga bietet Saison, Tag und Gesamt, die Awards nur die Saison');
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
  'Spieler des Tages mit gewonnenen Sätzen, dieselbe Schwelle wie die Auszeichnung');
ok(J(`(()=>{matches=matches.slice(0,2);invalidateCache();const zwei=_vRankingCore().includes('nw-name');
  matches=matches.slice(0,1);invalidateCache();return zwei && !_vRankingCore().includes('nw-name');})()`),
  'Zwei gewonnene Sätze reichen für den Spieler des Tages, einer nicht: an einem Tag mit drei langen Sätzen hätte sonst niemand drei');


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
ok(st([[1,0]]) === 10 && st([[2,0]]) === 25 && st([[3,1]]) === 40 && st([[5,4]]) === 80 && st([[6,0]]) === 100 && st([[6,4]]) === 100,
  `Staffel nach der Spielzeit: 1:0 10 %, bis 2 25 %, 3:x 40 %, 5:x 80 %, 6:x 100 % (${st([[1,0]])}, ${st([[2,0]])}, ${st([[3,1]])}, ${st([[5,4]])}, ${st([[6,4]])})`);
ok(st([[7,5]]) === 130 && st([[7,6]]) === 130 && st([[8,6]]) === 150 && st([[12,10]]) === 150,
  `Über sechs: 7:5 und 7:6 130 %, ab 8:6 höchstens 150 % (${st([[7,5]])}, ${st([[8,6]])}, ${st([[12,10]])})`);
// Eine Stunde mit langen Sätzen bringt so viel wie eine mit kurzen. Die
// zwei Spieltage der Liga mit ihren Reglern, nur die Staffel aus dem Code:
// am 11.11. zwanzig Sätze bis 2 in zwei Stunden, am 19.11. 7:6, 7:5 und
// 6:1 in anderthalb. Mit der alten Staffel bekam der Sieger auf dem Platz
// am zweiten 1,35 Elo je Minute, am ersten 2,27.
const _stunde = J(`(()=>{const _m=matches,_p=players,_s=seasons,_c=cfg;
  cfg={k_factor:40,start_elo:0,risk_split:0,pos_swing:0.1,win_boost:1.08,mov_max_boost:0.5,mov_loss_damp:0.5,match_bonus:0,
    low_elo_loss_damp:0,exp_protect_max:0.1,underdog_elo_max:0.5,underdog_games_max:0.3,new_player_mult:1.5,
    new_player_mid_mult:1.2,veteran_damp:0.5,tb_ausgleich:0.5};
  players=['P1','P2','P3','P4','P5','P6','P7'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const A=(a1,a2,b1,b2,s,t,art)=>({a1,a2,b1,b2,s,t,art:art||'n'});
  const l=[A('P6','P2','P7','P5',[1,2],'11T15:42'),A('P6','P2','P7','P5',[1,2],'11T15:58'),A('P6','P2','P7','P5',[2,0],'11T15:59'),
    A('P6','P2','P7','P5',[1,2],'11T16:00'),A('P6','P2','P7','P5',[0,2],'11T16:01'),A('P6','P2','P1','P4',[0,2],'11T16:18'),
    A('P6','P2','P1','P4',[0,2],'11T16:19'),A('P6','P2','P1','P4',[2,1],'11T16:20'),A('P7','P5','P1','P4',[0,2],'11T16:21'),
    A('P7','P5','P1','P4',[2,1],'11T16:22'),A('P7','P5','P1','P4',[0,2],'11T16:23'),A('P7','P5','P1','P4',[2,1],'11T16:24'),
    A('P7','P5','P1','P4',[1,2],'11T16:25'),A('P6','P2','P1','P4',[2,1],'11T16:37'),A('P6','P2','P7','P5',[2,1],'11T16:53'),
    A('P6','P2','P1','P4',[0,2],'11T16:54'),A('P6','P2','P1','P4',[2,1],'11T16:55'),A('P6','P2','P1','P4',[2,1],'11T16:56'),
    A('P5','P7','P1','P4',[0,2],'11T16:58'),A('P6','P2','P1','P4',[4,5],'11T17:27'),
    A('P7','P5','P3','P4',[7,6],'19T18:46','tb'),A('P7','P5','P3','P4',[5,7],'19T18:47'),A('P7','P5','P3','P4',[1,6],'19T18:48')];
  matches=l.map((x,i)=>Object.assign({id:'h'+i,a1:x.a1,a2:x.a2,b1:x.b1,b2:x.b2,a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    created_at:'2026-11-'+x.t+':00Z'},partieFelder([{a:x.s[0],b:x.s[1],art:x.art}])));
  invalidateCache();
  const h=simulateEloWithSliders(matches).history;
  const sieger=(von,bis)=>{const v=h.slice(von,bis).flatMap(x=>Object.values(x.deltas).filter(d=>d>0));return v.reduce((a,b)=>a+b,0)/v.length;};
  const r={kurz:sieger(0,20)/(120/20), lang:sieger(20,23)/(90/3)};
  matches=_m;players=_p;seasons=_s;cfg=_c;invalidateCache();
  return r;})()`);
const _quote = _stunde.lang / _stunde.kurz;
ok(_quote >= 0.8 && _quote <= 1.25,
  `Eine Minute auf dem Platz bringt dem Sieger in langen Sätzen so viel wie in kurzen (${_stunde.lang.toFixed(2)} gegen ${_stunde.kurz.toFixed(2)} Elo je Minute, ${Math.round(_quote * 100)} %)`);
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

// ── Kurze Sätze wiegen nach ihrer Länge, auch in der Neulingsphase ──
ok(J(`(()=>{const _m=matches,_p=players,_s=seasons;players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const mk=(i,a,b)=>({id:'k'+i,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a,b,art:'n'}]),created_at:new Date(Date.UTC(2026,7,10,16,i)).toISOString()});
  matches=Array.from({length:8},(_,i)=>mk(i,2,1));invalidateCache();
  const kurz=simulateEloWithSliders(matches).saetzeSeason.p1;
  matches=Array.from({length:2},(_,i)=>mk(i,6,4));invalidateCache();
  const lang=simulateEloWithSliders(matches).saetzeSeason.p1;
  matches=_m;players=_p;seasons=_s;invalidateCache();
  return Math.abs(kurz-2)<0.01 && lang===2;})()`),
  'Acht Sätze bis 2 zählen für die Neulingsphase wie zwei volle Sätze, ein Viertel je Satz');
// Der Zittersieg ist jeder knapp gewonnene Satz: im Tiebreak, mit einem
// Game Vorsprung ab 4:3 oder in der Verlängerung. Vorher nur der Tiebreak,
// und ein 5:4 zählte nicht. Die Verlängerung (ab 8 Games des Siegers)
// ersetzt den Wiederholungstäter und ist selten; Unschlagbar gibt es ab
// drei Sätzen am Tag statt ab fünf.
const zitter = J(`(()=>{const mk=(i,a,b,art)=>({id:'z'+i,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a,b,art:art||satzArt([a,b])}]),exp_a:.5,created_at:new Date(Date.UTC(2026,7,10,16,i)).toISOString()});
  const P=(a,b,art)=>partie(mk(0,a,b,art));
  const zs=[[4,3],[5,4],[6,5],[7,6],[8,6],[3,2],[2,1],[6,4],[7,5],[9,6]].map(([a,b])=>a+':'+b+'='+(P(a,b).zittersieg?1:0)+(P(a,b).lang?'L':'')).join(' ');
  const c=(bid,ms,bis)=>{const b=BADGES.find(x=>x.id===bid);return b?b.count('p1',ms,bis):-1;};
  const verloren=mk(9,4,5);
  const tag=[0,1,2].map(i=>mk(20+i,2,1)).map((m,i)=>({...m,created_at:new Date(Date.UTC(2026,7,3,15,i)).toISOString()}));
  return {zs, nail:c('nail_biter',[mk(1,4,3),mk(2,5,4),mk(3,2,1),mk(4,6,4),verloren]),
    lang:c('long_set',[mk(5,8,6),mk(6,9,7),mk(7,6,4),mk(8,6,8)]),
    unschlagbar:c('unbeatable',tag,Date.UTC(2026,7,5)),
    klasse:rarityOf('long_set'), alt:BADGES.some(x=>x.id==='repeat_score'),
    selten:RARITY_META.rare.total===BADGES.filter(x=>rarityOf(x.id)==='rare').length};})()`);
ok(zitter.zs === '4:3=1 5:4=1 6:5=1 7:6=1 8:6=1L 3:2=0 2:1=0 6:4=0 7:5=0 9:6=0L',
  'Zittersieg ab 4:3 mit einem Game Vorsprung, im Tiebreak und in der Verlängerung; 3:2, 6:4 und 9:6 nicht: ' + zitter.zs);
ok(zitter.nail === 2, `Zittersieg zählt 4:3 und 5:4, nicht 2:1, 6:4 oder ein verlorenes 4:5 (${zitter.nail})`);
ok(zitter.lang === 2 && zitter.klasse === 'rare' && zitter.alt === false && zitter.selten === true,
  `Die Verlängerung zählt gewonnene Sätze ab 8 Games (8:6, 9:7), ist selten und ersetzt den Wiederholungstäter (${zitter.lang}, ${zitter.klasse})`);
ok(zitter.unschlagbar === 1, `Unschlagbar gibt es ab drei Sätzen am Tag ohne Satzverlust (${zitter.unschlagbar})`);

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
ok(J('[CHRONIK_MIN_SPIELE, ST_TEIL, ST_TAG, CHRON_MIN_GAMES, RF.lauf]').join(',') === '10,5,5,40,50',
  'Chronik in Sätzen: 10 im Monat, Teilmengen ab 5, ein Spieltag ab 5, Rekorde ab 40, der Lauf über 50');

// ── Die Rekorde öffnen sich mit der Liga, nicht je Spieler ──────────
// Nach dem ersten Spieltag (bis 14 Sätze je Spieler) trug jede Rekordkarte
// „noch niemand", das Blatt des Unaufhaltsamen nannte „Mindestbasis: Ein
// Sieg", und dass erst ab CHRON_MIN_GAMES Sätzen gewertet wird, stand
// nirgends. Das Tor galt außerdem je Spieler; es gilt für die Liga. Ein
// Satz unter dem Tor, genau auf ihm, und dort ein fünfter Spieler mit nur
// zwei Sätzen, der trotzdem im Rennen steht.
const _tor = J(`(()=>{const _m=matches,_p=players,_s=seasons;
  players=['p1','p2','p3','p4','p5'].map((id,i)=>({id,name:['Leon','Domi','Fabio','Niggo','Matti'][i],hidden:false,elo:0,drive:.5}));seasons=[];
  const mk=n=>Array.from({length:n},(_,i)=>({id:'q'+i,a1:'p1',a2:'p2',b1:'p3',b2:i>=CHRON_MIN_GAMES-2?'p5':'p4',
    a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:6,b:i%5,art:'n'}]),exp_a:.5,created_at:new Date(Date.UTC(2026,7,10,8,i)).toISOString()}));
  const sicht=()=>{awView='rekorde';rekKammer='';const reiter=vAwards();showChronicle('unstoppable');
    return {reiter,blatt:document.getElementById('sheet').innerHTML};};
  matches=mk(CHRON_MIN_GAMES-1);invalidateCache();
  const a=sicht();
  const vor={tor:rekordTor(),rated:allChronicles().rated,halter:Object.keys(chronicleHolders()).length,
    leiste:a.reiter.includes('sobald die Liga <b>'+CHRON_MIN_GAMES+' Sätze</b> gespielt hat')
      &&(a.reiter.match(/<i class="an"><\\/i>/g)||[]).length===CHRON_MIN_GAMES-1&&a.reiter.includes('noch 1<'),
    karte:a.reiter.includes('Vergeben werden die Rekorde, sobald die Liga <b>'+CHRON_MIN_GAMES+' Sätze</b>'),
    blatt:a.blatt.includes('sobald die Liga '+CHRON_MIN_GAMES+' Sätze gespielt hat. Bisher sind es '+(CHRON_MIN_GAMES-1)+'.')};
  matches=mk(CHRON_MIN_GAMES);invalidateCache();
  const b=sicht();
  const nach={tor:rekordTor(),rated:allChronicles().rated,p5:!!_chronicleCtx().P.p5,leiste:/class="rek-tor"/.test(b.reiter),
    halter:!!chronicleHolders().unstoppable,blatt:!b.blatt.includes('Bisher sind es')};
  matches=_m;players=_p;seasons=_s;invalidateCache();
  return {vor,nach};})()`);
ok(!_tor.vor.tor.offen && _tor.vor.tor.n === 39 && _tor.vor.rated === 0 && _tor.vor.halter === 0 && _tor.vor.leiste && _tor.vor.karte,
  `Unter ${J('CHRON_MIN_GAMES')} Sätzen der Liga ist kein Rekord vergeben, und der Reiter sagt, ab wann und wie weit die Liga ist (${_tor.vor.tor.n})`);
ok(_tor.vor.blatt, 'Das Rekord-Blatt nennt das Tor der Liga und ihre Sätze bisher');
ok(_tor.nach.tor.offen && _tor.nach.rated === 5 && _tor.nach.halter && !_tor.nach.leiste && _tor.nach.blatt,
  'Mit dem 40. Satz der Liga sind die Rekorde vergeben, die Zeile zum Tor fällt weg');
ok(_tor.nach.p5, 'Das Tor gilt für die Liga: wer erst zwei Sätze hat, steht trotzdem im Rennen');

// ── Player of the Week erst ab zwei Spieltagen ──────────────────────
// Mit einem einzigen Spieltag in der Woche war der Player of the Week fast
// immer der Player of the Day desselben Tages. Eine Woche (3. bis 9. August)
// mit sechs Sätzen am Dienstag, die p1 alle gewinnt, und einmal dieselbe
// Woche mit einem Satz am Donnerstag dazu.
const _potw = J(`(()=>{const _m=matches,_p=players,_s=seasons;
  players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const mk=(id,tag,std)=>({id,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:6,b:3,art:'n'}]),deltas:{p1:5,p2:5,p3:-5,p4:-5},exp_a:.5,created_at:new Date(2026,7,tag,std).toISOString()});
  const dienstag=Array.from({length:6},(_,i)=>mk('w'+i,4,17+i%4));
  const lauf=ms=>{matches=ms;invalidateCache();const wk=_wochenKey(ms[0].created_at);
    return {woche:_periodWinnerMap(matches,'week')[wk]||null,zahl:countPeriodWins('p1',matches,'week'),tag:countDayWins('p1',matches),
      news:!!_newsPeriodWinner(matches,'woche'),gewertet:_gewerteteWochen(matches).has(wk)};};
  const ein=lauf(dienstag), zwei=lauf(dienstag.concat([mk('w9',6,18)]));
  matches=_m;players=_p;seasons=_s;invalidateCache();
  return {ein,zwei};})()`);
ok(_potw.ein.woche === null && _potw.ein.zahl === 0 && !_potw.ein.news && !_potw.ein.gewertet && _potw.ein.tag === 1,
  'Eine Woche mit einem einzigen Spieltag hat keinen Player of the Week, nur den Player of the Day, und zählt nicht für die Wochenkrone');
ok(_potw.zwei.woche === 'p1' && _potw.zwei.zahl === 1 && _potw.zwei.news && _potw.zwei.gewertet,
  'Mit einem zweiten Spieltag in der Woche gibt es ihn, egal wie viele dort spielen');
// Das Rennen um die Woche im Feed („übernimmt die Woche") auch erst ab dem
// zweiten Spieltag: am 11.11. standen neun solche Karten neben dem Spieler
// des Tages. Dienstag gewinnt A fünf von sechs Sätzen (p1 führt), Donnerstag
// gewinnt B sechs (p3 zieht vorbei).
setNow(new Date(2026, 7, 6, 23, 30).getTime());
const _spitze = J(`(()=>{const _m=matches,_p=players,_s=seasons;
  players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const mk=(id,tag,i,a)=>({id,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([a?{a:6,b:3,art:'n'}:{a:3,b:6,art:'n'}]),exp_a:.5,created_at:new Date(2026,7,tag,17,i*10).toISOString()});
  matches=Array.from({length:6},(_,i)=>mk('d'+i,4,i,i<5)).concat(Array.from({length:6},(_,i)=>mk('t'+i,6,i,false)));
  invalidateCache();_cache._stories=[];
  const st=_buildStories().filter(s=>String(s.id).startsWith('wochenspitze_'));
  const tag=s=>String(s.dataRef.matchId).charAt(0);
  const r={dienstag:st.filter(s=>tag(s)==='d').length, donnerstag:st.filter(s=>tag(s)==='t').length,
    widerrufen:_storyWiderrufen({id:'wochenspitze_p1_d4',dataRef:{type:'woche_spitze',matchId:'d4'}}),
    gilt:!_storyWiderrufen({id:'wochenspitze_p3_t4',dataRef:{type:'woche_spitze',matchId:'t4'}}),
    tagNr:[_spieltagDerWoche(matches[0]),_spieltagDerWoche(matches[11])].join(',')};
  matches=_m;players=_p;seasons=_s;invalidateCache();_cache._stories=[];
  return r;})()`);
setNow(new Date(2026, 7, 26, 18, 40).getTime());
ok(_spitze.dienstag === 0 && _spitze.donnerstag >= 1 && _spitze.tagNr === '1,2',
  `Die Wochenspitze im Feed erst ab dem zweiten Spieltag der Woche (${_spitze.dienstag} am ersten, ${_spitze.donnerstag} am zweiten)`);
ok(_spitze.widerrufen && _spitze.gilt,
  'Eine schon gespeicherte Wochenspitze vom ersten Spieltag gilt nicht mehr, eine vom zweiten bleibt');

// Der Reiter „Woche" in der Liga erst ab dem zweiten Spieltag der Woche,
// mit demselben Spieler der Woche wie die Auszeichnung. Heute ist Mittwoch,
// der 26. August; die Woche begann am Montag. Am Montag gewinnen p1 und p2
// fünf Sätze, am Mittwoch p5 und p6 sechs von sieben mit mehr Elo: die
// Woche geht nach der Quote an p1, der Tag nach den Siegen an p5.
const _wochenReiter = J(`(()=>{const _m=matches,_p=players,_s=seasons,_per=period;
  players=['p1','p2','p3','p4','p5','p6'].map(id=>({id,name:id.toUpperCase(),hidden:false,elo:0,drive:.5}));seasons=[];
  const mk=(id,tag,std,[a1,a2,b1,b2],d)=>({id,a1,a2,b1,b2,a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:6,b:3,art:'n'}]),deltas:{[a1]:d,[a2]:d,[b1]:-d,[b2]:-d},exp_a:.5,created_at:new Date(2026,7,tag,std,0).toISOString()});
  const montag=Array.from({length:5},(_,i)=>mk('m'+i,24,10+i,['p1','p2','p3','p4'],1));
  const mittwoch=Array.from({length:6},(_,i)=>mk('w'+i,26,9+i,['p5','p6','p3','p4'],5)).concat([mk('w9',26,15,['p3','p4','p5','p6'],5)]);
  const lauf=(ms,per)=>{matches=ms;period=per;invalidateCache();const h=_vRankingCore();
    const name=(h.match(/class="nw-name">([^<]*)</)||[])[1]||null;
    return {reiter:/data-period="week"/.test(h), folge:/data-period="season"[\\s\\S]*data-period="week"[\\s\\S]*data-period="day"[\\s\\S]*data-period="all"/.test(h),
      potw:h.includes('Player of the Week'), name, nachher:period,
      saisonAn:/data-period="season" class="on"/.test(h), offen:ligaWocheOffen(),
      auszeichnung:(_periodeRangliste(matchesInPeriod('week'),'woche',true)[0]||{}).id||null};};
  const ein=lauf(montag,'season'), einWoche=lauf(montag,'week');
  const zwei=lauf(montag.concat(mittwoch),'season'), zweiWoche=lauf(montag.concat(mittwoch),'week');
  matches=_m;players=_p;seasons=_s;period=_per;invalidateCache();
  return {ein,einWoche,zwei,zweiWoche};})()`);
ok(!_wochenReiter.ein.reiter && !_wochenReiter.ein.offen,
  'Mit einem Spieltag in der Woche hat die Liga keinen Reiter „Woche"');
ok(_wochenReiter.zwei.reiter && _wochenReiter.zwei.folge && _wochenReiter.zwei.offen,
  'Ab dem zweiten Spieltag steht „Woche" in der Leiste, zwischen Saison und Tag');
ok(_wochenReiter.einWoche.nachher === 'season' && _wochenReiter.einWoche.saisonAn && !_wochenReiter.einWoche.potw,
  'Stand die Liga auf „Woche" und hat die Woche keine zwei Spieltage, zeigt sie die Saison');
ok(_wochenReiter.zweiWoche.potw && _wochenReiter.zweiWoche.nachher === 'week'
  && _wochenReiter.zweiWoche.auszeichnung === 'p1' && _wochenReiter.zweiWoche.name === 'P1',
  `Die Woche nennt denselben Player of the Week wie die Auszeichnung (${_wochenReiter.zweiWoche.name}, Auszeichnung ${_wochenReiter.zweiWoche.auszeichnung})`);
// Die Wochenkrone zählt im Nenner nur Wochen, die jemand gewinnen konnte.
// p1 gewinnt die Woche vom 3. August (zwei Spieltage) und spielt in der vom
// 10. August nur an einem Tag: ein Titel aus einer Woche, nicht aus zwei.
const _krone = J(`(()=>{const _m=matches,_p=players,_s=seasons;
  players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const mk=(id,tag,std)=>({id,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:6,b:3,art:'n'}]),deltas:{p1:6,p2:4,p3:-5,p4:-5},exp_a:.5,created_at:new Date(2026,7,tag,std).toISOString()});
  matches=Array.from({length:5},(_,i)=>mk('a'+i,4,10+i)).concat([mk('b0',6,10)],Array.from({length:3},(_,i)=>mk('c'+i,11,10+i)));
  invalidateCache();const k=(_awardRankingsUncached('all').weekKingList||[]).find(x=>x.id==='p1')||{};
  matches=_m;players=_p;seasons=_s;invalidateCache();
  return {v:k.v,n:k.n};})()`);
ok(_krone.v === 1 && _krone.n === 1,
  `Die Wochenkrone zählt eine Woche mit einem Spieltag nicht mit (${_krone.v} von ${_krone.n})`);

// ── Keine Zeichnung aus der Kicker-Liga ─────────────────────────────
// Das Zeichen des Spieltags war ein Fußballfeld mit Mittelkreis und
// Strafräumen und stand als Wasserzeichen auf jeder Karte einer Partie; die
// Verteilung zählte nach Abstand bis „10 und mehr" (die Kicker-Leiter bis
// 10:0) und warf ein 2:0 und ein 6:4 in eine Säule; „Der Tag" schrieb einen
// Match-Tiebreak als „1:0"; das Zählwerk der Liga trug einen Ball mit
// Kreuzlinien, „Der
// Dauer-Revés" die hintere Hälfte des Kickertischs und „Der Dauer-Drive"
// den Dauerstürmer auf seinem Sockel.
const _kicker = J(`(()=>{const _m=matches,_p=players,_s=seasons;
  players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const mk=(id,i,a,b,art)=>({id,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a,b,art:art||'n'}]),exp_a:.5,created_at:new Date(2026,7,4,10,i*10).toISOString()});
  const liga=l=>{matches=l.map(([a,b,art],i)=>mk('k'+i,i,a,b,art));invalidateCache();return matches[matches.length-1];};
  const saeulen=h=>(h.match(/<em>[^<]*<\\/em><\\/span>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join(',');
  const hell=h=>((h.match(/class="sp-vt-s jetzt"[^>]*><i[^>]*><\\/i><em>([^<]*)</)||[])[1])||'';
  // Kurze Sätze, ein 6:4 und ein 7:5 (derselbe Abstand), ein Match-Tiebreak.
  let m=liga([[6,4],[7,5],[6,4],[2,1],[2,0],[2,1],[10,8,'mtb'],[6,1]]);
  const karte=_spVerteilungBild(_spVerteilungDaten({m})), blatt=_ndVerteilung(m), tag=_ndTagLeiste(m);
  const r1={karte:saeulen(karte), hell:hell(karte), fuss:((karte.match(/<div class="sp-vt-f">([\\s\\S]*?)<\\/div>/)||[])[1]||'').replace(/<[^>]+>/g,''),
    blatt:(blatt.match(/<b class="num">[^<]*<\\/b><\\/span>/g)||[]).map(x=>x.replace(/<[^>]+>/g,'')).join(','),
    blattHell:/<span class="dies"[^>]*><em class="num">13 %<\\/em><i[^>]*><\\/i><b class="num">6:1</.test(blatt),
    abstand:/Abstand|und mehr/.test(karte+blatt), tagMtb:tag.includes('>10:8<')&&!tag.includes('>1:0<')};
  // Mehr Ergebnisse als Säulen: die seltenen stehen als „andere", dieses bleibt.
  m=liga([[6,4],[6,3],[7,5],[6,1],[3,0],[6,2],[6,0]]);
  const r2v=saeulen(_spVerteilungBild(_spVerteilungDaten({m})));
  const feld=icPfad('spielfeld'), r=feld.match(/<rect[^>]*width="([\\d.]+)" height="([\\d.]+)"/)||[];
  const disz=id=>(DISZIPLINEN.find(d=>d.id===id)||{}).ic;
  const r2={feldQuer:+r[1]>+r[2], feldKreis:/<circle/.test(feld),
    vert:r1, andere:r2v,
    ball:_spZaehlwerkBild({wert:100,nurAnlass:true}).includes(icPfad('padelBall')),
    alt:['ball','abwehrFenster','roleFix'].every(k=>!ICONS[k]&&icPfad(k)&&icPfad(k)===ICONS[ZEICHEN_ALT[k]]),
    seiten:disz('abwehrmauer')+','+disz('dauersturm'),
    formen:['mosaik','pucks'].filter(k=>k in SP_FORM||k in SP_FORM_BILD).join(',')};
  matches=_m;players=_p;seasons=_s;invalidateCache();
  return r2;})()`);
ok(_kicker.feldQuer && !_kicker.feldKreis,
  'Das Zeichen des Spieltags ist ein Padel-Court im Querformat, kein Fußballfeld mit Mittelkreis');
ok(_kicker.vert.karte === '6:4,2:1,10:8,7:5,6:1,2:0' && _kicker.vert.blatt === _kicker.vert.karte && _kicker.vert.hell === '6:1'
  && _kicker.vert.blattHell && !_kicker.vert.abstand,
  `Die Verteilung zeigt in Karte und Blatt die Ergebnisse der Liga, das häufigste zuerst, 6:4 und 7:5 getrennt, dieses hell (${_kicker.vert.karte})`);
ok(_kicker.vert.fuss.trim() === '1 von 8 Sätzen endete 6:1' && _kicker.andere === '7:5,6:0,6:1,6:2,6:3,andere',
  `Unter der Karte steht, wie oft die Liga so endete; mehr als sechs Ergebnisse stehen als „andere" (${_kicker.vert.fuss.trim()} · ${_kicker.andere})`);
ok(_kicker.vert.tagMtb, '„Der Tag" schreibt einen Match-Tiebreak mit seinen Punkten (10:8), nicht als „1:0"');
ok(_kicker.ball && _kicker.alt,
  'Das Zählwerk der Liga trägt den Padelball; die alten Kicker-Zeichen gibt es nur noch als Verweis auf ihr Padel-Zeichen');
ok(_kicker.seiten === 'revesFenster,driveFenster',
  `„Der Dauer-Revés" und „Der Dauer-Drive" zeigen den halben Court mit ihrer Seite (${_kicker.seiten})`);
ok(_kicker.formen === '',
  'Das Mosaik der Endstände 10:0 bis 10:9 und die Pucks bis zehn Tore gibt es nicht mehr' + (_kicker.formen ? ': ' + _kicker.formen : ''));

// ── Das Match statt der Runde, Sätze statt Treffen ──────────────────
// Die zwei Spieltage der Liga (die Sätze aus der Elo-Prüfung oben): am
// 19.11. dieselben zwei Teams in drei Sätzen 7:6, 5:7, 1:6. Die Kicker-Liga
// nannte das „gewinnen die Runde … 2:1" unter „3 Sätze zwischen 19:46 und
// 19:46 Uhr", ihr Satz zum 1:1 hieß „holen sich die Revanche", fünf Sätze
// eines Matches „5 Treffen dieser beiden Duos", und die Woche mit einem
// Spieltag stand als Wochenkarte und Ehrung der Woche ein zweites Mal da.
setNow(new Date('2026-11-20T12:00:00Z').getTime());
const _feed = J(`(()=>{const _m=matches,_p=players,_s=seasons,_c=cfg;
  cfg={k_factor:40,start_elo:0,risk_split:0,pos_swing:0.1,win_boost:1.08,mov_max_boost:0.5,mov_loss_damp:0.5,match_bonus:0,
    low_elo_loss_damp:0,exp_protect_max:0.1,underdog_elo_max:0.5,underdog_games_max:0.3,new_player_mult:1.5,
    new_player_mid_mult:1.2,veteran_damp:0.5,tb_ausgleich:0.5};
  players=['P1','P2','P3','P4','P5','P6','P7'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const A=(a1,a2,b1,b2,s,t,art)=>({a1,a2,b1,b2,s,t,art:art||'n'});
  const l=[A('P6','P2','P7','P5',[1,2],'11T15:42'),A('P6','P2','P7','P5',[1,2],'11T15:58'),A('P6','P2','P7','P5',[2,0],'11T15:59'),
    A('P6','P2','P7','P5',[1,2],'11T16:00'),A('P6','P2','P7','P5',[0,2],'11T16:01'),A('P6','P2','P1','P4',[0,2],'11T16:18'),
    A('P6','P2','P1','P4',[0,2],'11T16:19'),A('P6','P2','P1','P4',[2,1],'11T16:20'),A('P7','P5','P1','P4',[0,2],'11T16:21'),
    A('P7','P5','P1','P4',[2,1],'11T16:22'),A('P7','P5','P1','P4',[0,2],'11T16:23'),A('P7','P5','P1','P4',[2,1],'11T16:24'),
    A('P7','P5','P1','P4',[1,2],'11T16:25'),A('P6','P2','P1','P4',[2,1],'11T16:37'),A('P6','P2','P7','P5',[2,1],'11T16:53'),
    A('P6','P2','P1','P4',[0,2],'11T16:54'),A('P6','P2','P1','P4',[2,1],'11T16:55'),A('P6','P2','P1','P4',[2,1],'11T16:56'),
    A('P5','P7','P1','P4',[0,2],'11T16:58'),A('P6','P2','P1','P4',[4,5],'11T17:27'),
    A('P7','P5','P3','P4',[7,6],'19T18:46','tb'),A('P7','P5','P3','P4',[5,7],'19T18:46'),A('P7','P5','P3','P4',[1,6],'19T18:46')];
  matches=l.map((x,i)=>Object.assign({id:'f'+i,a1:x.a1,a2:x.a2,b1:x.b1,b2:x.b2,a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    created_at:'2026-11-'+x.t+':'+String(i % 60).padStart(2,'0')+'Z'},partieFelder([{a:x.s[0],b:x.s[1],art:x.art}])));
  invalidateCache();const sim=simulateEloWithSliders(matches);matches.forEach((m,i)=>{m.deltas=sim.history[i].deltas;});invalidateCache();
  _cache._stories=[];const st=_buildStories();
  const typ=t=>st.filter(x=>(x.dataRef||{}).type===t), karte=id=>st.find(x=>(x.dataRef||{}).matchId===id&&(x.dataRef||{}).type==='spiel')||{};
  const match=typ('match').find(x=>x.id==='match_f20')||{};
  const text=st.map(x=>x.title+' '+x.desc).join(' | ');
  const allein=(()=>{const mm=matches;matches=[mm[20],mm[21]].map(x=>Object.assign({},x,{created_at:'2026-11-22T18:00:00Z'}));
    matches[1].created_at='2026-11-22T18:20:00Z';invalidateCache();const g=_ehrungGroessere(new Date('2026-11-22T12:00:00').getTime());
    matches=mm;invalidateCache();return g;})();
  const r={match:match.title||'', matchDesc:match.desc||'', matchWann:match.when?new Date(match.when).toISOString().slice(11,16):'',
    runden:typ('runde').length, satz2:karte('f21').title||'', satz3:karte('f22').title||'', revanche:!!_spFakten(matches[21]).revanche,
    woche:typ('woche').length, wochenEhrung:st.filter(x=>/^ehrung_der_woche/.test(x.id)).length, tagEhrung:st.filter(x=>x.id==='tagesehrung_2026-11-11').length,
    potd:typ('potd').map(x=>x.title+'|'+(x.dataRef.playerIds||[]).length).join(' / '),
    pleite:(typ('team_loss_streak')[0]||{}).desc||'', kicker:(text.match(/Treffen|direkte Duelle|Duellen|die Runde gegen|und 18:46 Uhr/)||[''])[0],
    alt:[{type:'runde',paarungen:1},{type:'woche',woche:'2026-W46'},{type:'ehrung',periode:'woche',woche:'2026-11-09'},{type:'runde',paarungen:3}]
      .map(d=>_storyWiderrufen({dataRef:d})).join(','), allein};
  matches=_m;players=_p;seasons=_s;cfg=_c;invalidateCache();_cache._stories=[];
  return r;})()`);
setNow(new Date(2026, 7, 26, 18, 40).getTime());
ok(_feed.match === 'P3 und P4 drehen das Match gegen P7 und P5 und gewinnen 2:1'
  && _feed.matchDesc === '6:7, 7:5, 6:1, 19:13 Games. Der erste Satz ging an P7 und P5.' && _feed.matchWann === '20:16' && _feed.runden === 0,
  `Drei Sätze derselben Teams sind ein Match mit eigener Karte, die Sätze aus Sicht der Sieger, 90 Minuten nach dem letzten; keine Runde (${_feed.match} / ${_feed.matchDesc} / ${_feed.matchWann})`);
ok(_feed.satz2 === 'P3 und P4 gleichen im Match zum 1:1 aus' && _feed.satz3 === 'P3 und P4 holen den 3. Satz zum 2:1' && !_feed.revanche,
  `Ein Satz im Match erzählt den Stand im Match, und der Ausgleich ist keine Revanche (${_feed.satz2} / ${_feed.satz3})`);
ok(_feed.woche === 0 && _feed.wochenEhrung === 0 && _feed.tagEhrung === 1 && _feed.allein === '',
  'Eine Woche mit einem Spieltag hat weder Wochenkarte noch Ehrung der Woche, der Tag behält seine, auch als Sonntag');
ok(/^Ohne gemeinsamen Sieg seit \d\d:\d\d Uhr\.$/.test(_feed.pleite) && _feed.kicker === '',
  `Am selben Tag nennt die Pleitenserie die Uhrzeit, und kein Text zählt Sätze als Treffen oder Duelle (${_feed.pleite}${_feed.kicker ? ' · ' + _feed.kicker : ''})`);
// Am 19.11. gewannen P3 und P4 zwei Sätze mit derselben Elo; früher hieß es
// „P3 und P4: Spieler des Tages". Jetzt gibt es einen, und am 11.11. auch.
ok(/^P\d ist Spieler des Tages\|1 \/ P\d ist Spieler des Tages\|1$/.test(_feed.potd),
  `Jeder Tag hat genau einen Spieler des Tages, auch bei gleichen Siegen und gleicher Elo (${_feed.potd})`);
ok(_feed.alt === 'true,true,true,false',
  'Gespeicherte Runden fester Teams und Wochenkarten mit einem Spieltag treten zurück, eine Runde mit wechselnden Partnern bleibt');

// ── Die Profilbilder ─────────────────────────────────────────────────
// 99 Bilder und die Initialen füllen die Auswahl in zwanzig Reihen zu fünf.
// Die ID steht in der Liga; was ein Spieler trägt, darf nie wegfallen.
const _bilder = J(`({n:AVATAR_OPTIONS.length, ids:new Set(AVATAR_OPTIONS.map(x=>x.id)).size, em:new Set(AVATAR_OPTIONS.map(x=>x.em)).size,
  liga:['eye','alien','butterfly','eggplant','twoface','beer','frog','hedgehog'].every(id=>avatarEmoji(id)),
  ohne:AVATAR_OPTIONS.filter(x=>/🔥|⭐|👑/.test(x.em)).length})`);
ok(_bilder.n === 99 && _bilder.ids === 99 && _bilder.em === 99 && _bilder.liga && _bilder.ohne === 0,
  `99 Profilbilder, jedes mit eigener ID und eigenem Zeichen, jedes Bild der Liga bleibt, keins mit Feuer, Stern oder Krone (${_bilder.n})`);

// ── Erklärkarten lassen sich schließen ─────────────────────────────
ok(J(`(()=>{const a=vorschauHtml('info','Probe','Satz',null,'','<i>Ersatz</i>');
  hinweiseWeg().add('Probe');const b=vorschauHtml('info','Probe','Satz',null,'','<i>Ersatz</i>');
  const c=vorschauHtml('info','Probe','Satz');hinweiseWeg().delete('Probe');
  return /data-hinweis-zu/.test(a)&&/data-hinweis="Probe"/.test(a)&&b==='<i>Ersatz</i>'&&c==='';})()`),
  'Jede Erklärkarte trägt ein Kreuz; geschlossen steht nur noch ihr Ersatz oder nichts');
ok(J('[REKORD_GRUNDWERT.koennen, REKORD_GRUNDWERT.fuegung, CHRONIK_GRUNDWERT]').join(',') === '30,20,30',
  'Rekorde beginnen bei 30 (Können) und 20 (Fügung), Chroniken bei 30');

// ── Der Feed an einem Tag mit kurzen Sätzen ─────────────────────────
// Am ersten Spieltag (Sätze bis 2, bis 14 je Spieler) stand „0 vor Domi",
// jeder feierte sein „Jubiläum" zum 10. Satz und zwei holten eine
// gewöhnliche Auszeichnung „zum 5. Mal".
ok(J(`_vorText(0,'Domi')`) === 'gleichauf mit Domi' && J(`_vorText(7,'Domi')`) === '7 vor Domi',
  'Ein Abstand von null Elo heißt „gleichauf", nicht „0 vor"');
ok(J('JUBILAEUM_AB') === 50 && J('[10,25].some(n=>_rundeMarke(n,JUBILAEUM_AB))') === false && J('_rundeMarke(50,JUBILAEUM_AB)') === true,
  'Ein Jubiläum gibt es ab dem 50. Satz, nicht schon zum 10. oder 25.');
ok(J(`[1,5].every(n=>!_badgeTakt('common',n)) && [10,25].every(n=>_badgeTakt('common',n))`) === true,
  'Eine gewöhnliche Auszeichnung wird erst ab der zehnten Vergabe erzählt');

// ── Was die Liga betrifft, steht in der Liga, nicht auf einem Gerät ──
// Ein Profilbild und die Regler lagen bei einem abgelehnten Speichern still
// in localStorage: das Bild sah nur das eine Gerät, und die Regler ließen es
// mit anderen Gewichten rechnen als alle anderen.
const GERAET = ANSCHLUSS.then(async () => {
  K(`window.__vorher={p:players,m:matches,c:cfg,se:seasons,f:sb.from};
    localStorage.setItem('padel_playerEdit_p9',JSON.stringify({avatar_id:'wolf'}));
    localStorage.setItem('padel_playerEdit_p8',JSON.stringify({avatar_id:'clown'}));
    localStorage.setItem('padel_cfg_overrides',JSON.stringify({k_factor:99}));0`);
  const roh = `[{id:'p9',name:'Neun',avatar_id:null},{id:'p8',name:'Acht',avatar_id:'alien'}]`;
  K(`window.__roh=${roh};_overridesVerwerfen();_datenEinbauen({p:__roh,m:[],c:{id:1,k_factor:40},se:[]});0`);
  const e = J(`({bild:players[0].avatar_id,liga:players[1].avatar_id,k:cfg.k_factor,ov:localStorage.getItem('padel_cfg_overrides')})`);
  ok(e.bild === 'wolf' && e.liga === 'alien' && e.k === 40 && e.ov === null,
    `Ein Gerätewert der Regler gilt nicht und wird verworfen; ein Profilbild nur dieses Geräts bleibt sichtbar, das der Liga geht vor (${e.bild}/${e.liga}/${e.k})`);
  // Die Spalte nimmt kein Bild an: es bleibt auf dem Gerät, bis sie es tut.
  K(`window.__upd=[];sb.from=()=>({update:o=>({eq:(k,id)=>({is:async()=>{__upd.push(id+':'+o.avatar_id);return {error:{message:'invalid input syntax for type integer'}};}})})});
    _avatareNachziehen([{id:'p9',avatar_id:null},{id:'p8',avatar_id:'alien'}]);0`);
  await new Promise(r => setImmediate(r));
  const a = J(`({u:__upd.join(','),p9:localStorage.getItem('padel_playerEdit_p9'),p8:localStorage.getItem('padel_playerEdit_p8')})`);
  K(`window.__upd=[];sb.from=()=>({update:o=>({eq:(k,id)=>({is:async()=>{__upd.push(id+':'+o.avatar_id);return {error:null};}})})});
    _avatareNachziehen([{id:'p9',avatar_id:null}]);0`);
  await new Promise(r => setImmediate(r));
  const b = J(`({u:__upd.join(','),p9:localStorage.getItem('padel_playerEdit_p9')})`);
  ok(a.u === 'p9:wolf' && a.p9 !== null && a.p8 === null && b.u === 'p9:wolf' && b.p9 === null,
    'Ein lokales Profilbild wird in die Liga nachgetragen und erst danach vergessen; hat die Liga schon eines, gewinnt die Liga');
  K(`players=__vorher.p;matches=__vorher.m;cfg=__vorher.c;seasons=__vorher.se;sb.from=__vorher.f;invalidateCache();0`);
});

// ── Das Titelband [§C26] ─────────────────────────────────────────────
// Bis fünf Titel ein Stern je Titel, ab sechs die Zahl zwischen zwei
// Sternen. Es standen fünf Sterne und dahinter die Ziffer: „★★★★★25" lief
// breiter als der Reif, und die Ziffer am Ende las sich wie ein Platz. In
// der Zeile (`_znSterneSvg`) und über dem Zeichen (`_insSterne`) dieselbe
// Form, und jeder Stern trägt fünf helle Facetten.
const band = J(`[1,5,6,9,12,25].map(n => {
  const s = _znSterneSvg(n);
  const pfad = k => (s.split('class="' + k + '" d="')[1]||'').split('"')[0].split('M').length - 1;
  const t = s.match(/<text x="([0-9.]+)"[^>]*>([0-9]+)<[/]text>/);
  return {n, sterne: pfad('zs'), facetten: pfad('zs-h'), breite: +((s.match(/width="([0-9.]+)"/)||[])[1]||0),
    zahl: t ? +t[2] : null, mitte: t ? +t[1] : null};
})`);
const fuenf = band.find(b => b.n === 5).breite;
ok(band.filter(b => b.n <= 5).every(b => b.sterne === b.n && b.zahl === null)
   && band.filter(b => b.n > 5).every(b => b.sterne === 2 && b.zahl === b.n && Math.abs(b.mitte - b.breite/2) < .2 && b.breite < fuenf),
  'Titelband: bis fünf ein Stern je Titel, ab sechs die Zahl mittig zwischen zwei Sternen, schmaler als fünf Sterne: ' + JSON.stringify(band.map(b => b.n + ':' + b.sterne + '/' + b.zahl)));
ok(band.every(b => b.facetten === 5 * b.sterne), 'Titelband: jeder Stern trägt fünf helle Facetten');
const bogen = J(`[3,8,25].map(n => {
  const s = _insSterne(n, 'b_');
  const d = (s.match(/<path d="([^"]*)"/)||[])[1] || '';
  const t = s.match(/<text x="([0-9.]+)"[^>]*>\s*([0-9]+)<[/]text>/);
  return {n, sterne: d.split('M').length - 1, zahl: t ? +t[2] : null, x: t ? +t[1] : null};
})`);
ok(bogen[0].sterne === 3 && bogen[0].zahl === null && bogen.slice(1).every(b => b.sterne === 2 && b.zahl === b.n && b.x === 50),
  'Über dem Zeichen dieselbe Form: ab sechs die Zahl mittig zwischen zwei Sternen: ' + JSON.stringify(bogen));

// Der Anschluss läuft asynchron (Speichern); das Ergebnis erst danach.
Promise.all([ANSCHLUSS, GERAET]).catch(e => ok(false, 'Anschluss abgebrochen: ' + (e && e.message))).then(() => {
  console.log(fails ? `\n${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `\nALLE ${checks} CHECKS BESTANDEN`);
  process.exit(fails ? 1 : 0);
});
