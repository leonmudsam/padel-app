// Kalendergrenzen in der Zeit der Liga: Zeitumstellung und Jahreswechsel.
// Die übrigen Suiten laufen in der Zone der Maschine, und der Prüf-Job ist
// UTC — dort ist jeder Tag 24 Stunden lang, und ein Fehler, der nur an der
// Umstellung auftritt, bleibt grün. Diese Suite stellt Berliner Zeit ein,
// bevor das erste Datum entsteht.
process.env.TZ = 'Europe/Berlin';
const {K, setNow} = require('./runtime.js').createRuntime();
let checks = 0, fails = 0;
const ok = (c, msg) => { checks++; if(!c) fails++; console.log((c ? '  ok  ' : '  ✗   ') + msg); };
const B = (y, mo, d, h = 12, mi = 0) => new Date(y, mo, d, h, mi).getTime();

ok(new Date(2026, 9, 25, 12).getTimezoneOffset() === -60 && new Date(2026, 9, 24, 12).getTimezoneOffset() === -120,
  'Die Suite rechnet in Berliner Zeit (Winterzeit ab dem 25. Oktober)');

K(`players=Array.from({length:4},(_,i)=>({id:'k'+i,name:'Kal '+i,hidden:false,elo:0,atk:.5}));
  seasons=[];window.__p=(id,t,a)=>({id,a1:'k0',a2:'k1',b1:'k2',b2:'k3',a1_side:'drive',a2_side:'reves',b1_side:'drive',b2_side:'reves',
    games_a:a?10:4,games_b:a?4:10,winner:a?'A':'B',exp_a:.5,created_at:new Date(t).toISOString(),
    deltas:{k0:a?20:-20,k1:a?20:-20,k2:a?-20:20,k3:a?-20:20}});0`);

// ── Die Woche über den Jahreswechsel ──────────────────────────────────
// Der 28.12.2026 bis 03.01.2027 ist KW 53. Mit dem Kalenderjahr im
// Schlüssel zerfiel sie in „2026-W53" und „2027-W53", zwei halbe Wochen
// mit je einem Spieler der Woche.
setNow(B(2027, 0, 20));
const jahr = JSON.parse(K(`JSON.stringify((()=>{
  const k=t=>_wochenKey(new Date(t).toISOString());
  // Drei Siege vor Silvester, drei danach: ein Spieler der Woche braucht
  // fünf, also gibt es ihn nur, wenn die Woche eine ist.
  matches=[${[[11, 29], [11, 30], [11, 31], [12, 1], [12, 2], [12, 3]].map(([mo, d], i) => `__p('w${i}',${B(2026, mo, d, 15)},1)`).join(',')}];
  invalidateCache();
  const sieger=_periodWinnerMap(matches,'week');
  return {mo:k(${B(2026, 11, 28)}), so:k(${B(2027, 0, 3)}), nach:k(${B(2027, 0, 4)}), vor:k(${B(2026, 11, 27)}),
    wochen:Object.keys(sieger).sort()};
})())`));
ok(jahr.mo === jahr.so && jahr.mo === '2026-W53' && jahr.nach === '2027-W1' && jahr.vor === '2026-W52',
  'Die Woche über den Jahreswechsel hat einen Schlüssel: ' + JSON.stringify(jahr));
ok(jahr.wochen.join() === '2026-W53',
  'Sie hat einen Spieler der Woche, nicht zwei halbe: ' + jahr.wochen.join(', '));

// ── Der Fortschritt in der Liga nach dem Kalender ─────────────────────
// Der Oktober hat mit der Umstellung 31 Tage und eine Stunde. Gerechnet in
// Millisekunden durch vierundzwanzig Stunden stand „Tag 27 von 32".
const lauf = (t, per) => { setNow(t); return K(`(()=>{tab='ranking';period=${JSON.stringify(per)};ligaSeasonId=null;
  matches=[__p('l1',${B(2026, 9, 3, 15)},1)];invalidateCache();
  const h=vRanking(), m=h.match(/<span class="lauf-t">[^<]*<b class="num">(\\d+)<\\/b> von <b class="num">(\\d+)<\\/b>/),
    z=(h.match(/<span class="lauf-z"[^>]*>([\\s\\S]*?)<\\/span>/)||[,''])[1];
  return m ? m[1]+'/'+m[2]+'/'+(z.match(/<i/g)||[]).length+'/'+((z.match(/<i[^>]*class="[^"]*\\bh\\b/g)||[]).length) : 'fehlt';})()`); };
const okt27 = lauf(B(2026, 9, 27, 12), 'season'), okt31 = lauf(B(2026, 9, 31, 23, 30), 'season');
const mrz31 = lauf(B(2026, 2, 31, 0, 30), 'season');
ok(okt27 === '27/31/31/1' && okt31 === '31/31/31/1' && mrz31 === '31/31/31/1',
  'Die Saison zählt die Tage des Monats nach dem Kalender, auch mit Zeitumstellung: ' + [okt27, okt31, mrz31].join(' '));
const woche = lauf(B(2026, 2, 30, 0, 30), 'week'), tag = lauf(B(2026, 9, 25, 10, 30), 'day');
ok(woche === '1/7/7/1' && tag === '11/24/24/1',
  'Woche und Tag rahmen den Tag und die Stunde, die die Uhr zeigt: ' + woche + ' ' + tag);

// ── Ein Tag endet an der nächsten Mitternacht ─────────────────────────
// Mit 24 Stunden endete der 25. Oktober um 23 Uhr, und der 29. März reichte
// eine Stunde in den Montag und nahm den Abschluss der Woche mit.
const grenzen = JSON.parse(K(`JSON.stringify((()=>{
  matches=[__p('g1',${B(2026, 2, 29, 15)},1),__p('g2',${B(2026, 9, 25, 15)},1)];invalidateCache();
  const a=_storyTagGrenzen(${B(2026, 2, 29, 15)}), b=_storyTagGrenzen(${B(2026, 9, 25, 15)});
  return {mrz:a.nachMs===${new Date(2026, 2, 29, 23, 59, 58, 999).getTime()}, okt:b.nachMs===${new Date(2026, 9, 25, 23, 59, 58, 999).getTime()},
    mrzVon:a.vonMs===${new Date(2026, 2, 29).getTime()}};
})())`));
ok(grenzen.mrz && grenzen.okt && grenzen.mrzVon,
  'Der Tag einer Story endet an den Tagen der Umstellung in derselben Sekunde wie sonst: ' + JSON.stringify(grenzen));

// ── Gestern ist der Kalendertag davor ─────────────────────────────────
setNow(B(2026, 2, 30, 0, 30));
const gestern = JSON.parse(K(`JSON.stringify({key:gesternKey(Date.now()), feed:_newsWhenLabel(${B(2026, 2, 29, 18)}),
  kopf:_newsDayLabel(${B(2026, 2, 29, 18)})})`));
ok(gestern.key === '2026-03-29' && gestern.feed === 'Gestern, 18:00' && gestern.kopf === 'GESTERN',
  'Nach der Umstellung auf die Sommerzeit ist „Gestern" auch um 00:30 der Tag davor: ' + JSON.stringify(gestern));

console.log(fails ? `${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `ALLE ${checks} CHECKS BESTANDEN`);
if(fails) process.exitCode = 1;
