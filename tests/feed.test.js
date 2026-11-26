// Die Regeln des Feeds am Ende eines Zeitraums und der Fun Facts [§C33],
// aus der Kicker-Liga übernommen: die Ewige Tafel steht nach der letzten
// Partie fest; was der Tagesschluss um 23:59 ändert, steht in der Ehrung des
// Tages, und die ist eine eigene knappe Karte unter dem Spieler des Tages;
// Tag, Woche und Monat schließen in fester Reihenfolge, die größere Ehrung
// trägt den Tag; gelesen ist nur, was vor dem Lesestand liegt; die Fun Facts
// sprechen in ganzen Sätzen, melden einen Platz nur auf dem Podest, zeigen
// zur Halbzeit die beiden Seiten und schweigen, wenn die Liga ruht.
//
// Rechnet ohne Browser (tests/runtime.js) mit der Testliga
// (tests/fixture.js). Am 24.07. ändert der Schluss die Tafel („David
// übernimmt ‚Der letzte Ball'"), der 02.08. ist ein Sonntag, dessen Woche
// den Tag trägt. Jede Rechnung steht in einem try: gegen eine Fassung ohne
// die Regel soll die Zusicherung fallen und nicht die Suite abbrechen.
const {K, setNow} = require('./runtime.js').createRuntime();
const {ladeLiga} = require('./fixture.js');
let checks = 0, fails = 0;
const ok = (c, msg) => { checks++; if(!c) fails++; console.log((c ? '  ok  ' : '  ✗   ') + msg); };
const J = s => { try { return JSON.parse(K(`JSON.stringify(${s})`)); } catch(e){ return {fehler:String(e && e.message || e).slice(0, 160)}; } };
const L = ladeLiga();
const ms = (tag, h, mi, s) => new Date(`${tag}T${String(h).padStart(2, '0')}:${String(mi || 0).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`).getTime();

// Ein Stand der Liga: alle Sätze bis `bis`, die Uhr auf `jetzt`, ohne
// gespeicherte Stories — der Generator bildet alles, was er bilden würde.
const stand = (bis, jetzt, dazu) => {
  setNow(jetzt);
  const liste = L.matches.filter(m => new Date(m.created_at).getTime() <= bis).concat(dazu || [])
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  K(`players=${JSON.stringify(L.players)};seasons=${JSON.stringify(L.seasons)};matches=${JSON.stringify(liste)};
    invalidateCache();_cache._stories=[];window.__roh=_buildStories();0`);
};

// ── Die Tafel steht nach der letzten Partie fest ─────────────────────
// Um 23:59 schrieb der Generator Tafel und Zeichen-Karte des Tages in einer
// neuen Fassung („z") neu, und die gelesene Karte stand am Morgen wieder als
// ungelesen da.
const D1 = '2026-07-24', D1E = ms(D1, 23, 59, 59) + 999;
const tafel = tag => J(`__roh.filter(x => STORY_TAFEL_UPDATE.has((x.dataRef||{}).type) && tagKey(x.when) === '${tag}' || /^instag_${tag}/.test(x.id))
  .map(x => x.id + '|' + x.title + '|' + JSON.stringify((x.dataRef||{}).laufbahn||{}) + '|' + JSON.stringify((x.dataRef||{}).zuege||[])).sort()`);
stand(D1E, ms(D1, 21, 0));
const tVor = tafel(D1);
stand(D1E, ms('2026-07-25', 0, 5));
const tNach = tafel(D1);
ok(Array.isArray(tVor) && tVor.length > 0 && JSON.stringify(tVor) === JSON.stringify(tNach)
   && !tNach.some(x => /z$/.test(x.split('|')[0])),
  `Die Tafel des ${D1} ist nach dem Schluss um 23:59 dieselbe wie nach der letzten Partie (${(tVor || []).length} / ${(tNach || []).length} Zeilen, keine Fassung „z")`);

// ── Was der Schluss ändert, steht in der Ehrung des Tages ───────────
const SOLL = ['David übernimmt „Der letzte Ball“', 'David holt „Der Endspurt“'];
const e1 = J(`(()=>{const p=__roh.find(x=>x.id==='potd_${D1}'), e=__roh.find(x=>x.id==='tagesehrung_${D1}');
  const ts=(e&&(e.dataRef||{}).tagesschluss||[]).map(z=>z.text);
  const inTafel=__roh.filter(x=>STORY_TAFEL_UPDATE.has((x.dataRef||{}).type)).map(x=>x.title).join(' | ');
  return {p:!!p, e:!!e, ts, inTafel, potdEhrung:!!(p&&(Array.isArray(p.dataRef.ehrung)||Array.isArray(p.dataRef.tagesschluss))),
    gleich:!!(p&&e)&&new Date(p.when).getTime()===new Date(e.when).getTime(), prio:!!(p&&e)&&e.prio<p.prio,
    folge:(()=>{const l=__roh.slice().sort(_storyFolge).map(x=>x.id);return l.indexOf('tagesehrung_${D1}')-l.indexOf('potd_${D1}');})()};})()`);
ok(e1.p && e1.e && SOLL.every(t => (e1.ts || []).indexOf(t) >= 0) && !SOLL.some(t => String(e1.inTafel).indexOf(t) >= 0),
  `Was der Schluss des ${D1} an der Tafel ändert, trägt die Ehrung des Tages und nicht die Tafel (${(e1.ts || []).join(' · ') || e1.fehler || 'keine Zeilen'})`);
ok(e1.e && !e1.potdEhrung && e1.gleich && e1.prio && e1.folge === 1,
  'Die Ehrung des Tages ist eine eigene Karte zur Zeit des Spielers des Tages, direkt unter ihm; er selbst trägt keine Auszeichnungen');
const k1 = J(`(()=>{const p=__roh.find(x=>x.id==='potd_${D1}'), e=__roh.find(x=>x.id==='tagesehrung_${D1}');
  return {e:e?_newsCardHtmlM2(e,false,false,''):'', p:p?_newsCardHtmlM2(p,false,false,''):'', b:e?String((_ndEhrungBlatt(e)||{}).mitte||''):''};})()`);
ok(/Mit dem Schluss des Tages/.test(k1.e || '') && /Der letzte Ball/.test(k1.e || '') && /Mit dem Schluss des Tages/.test(k1.b || '')
   && /EHRUNG DES TAGES|Ehrung des Tages/.test(k1.e || '') && !/Ehrung des Tages|nf-eht/.test(k1.p || ''),
  'Karte und Blatt der Ehrung des Tages zeigen die Zeilen des Schlusses, die Karte des Spielers des Tages keine Ehrung');

// ── Ein Sonntag: die größere Ehrung trägt den Tag ───────────────────
// Am 02.08. endet die Woche mit dem Spieltag. Es gibt nur die Ehrung der
// Woche; was der Schluss an der Tafel ändert, steht unter dem Spieler des
// Tages. Reihenfolge: Woche und Ehrung der Woche 23:59:05, darunter der
// Spieler des Tages 23:59.
// In der Testliga ist der Sonntag der einzige Spieltag seiner Woche, und
// eine solche Woche hat weder Karte noch Ehrung [§C31]: der Sonntag behält
// dann seine. Für die Woche, die ihn trägt, bekommt sie einen zweiten
// Spieltag, einen Satz am Donnerstag.
const D2 = '2026-08-02';
const sonntag = L.matches.filter(m => m.created_at.slice(0, 10) === D2);
stand(ms(D2, 23, 59, 59) + 999, ms('2026-08-03', 0, 5));
const s2allein = J(`({tag:__roh.some(x=>x.id==='tagesehrung_${D2}'), woche:__roh.some(x=>/^woche_/.test(x.id)&&tagKey(x.when)==='${D2}'),
  ew:__roh.some(x=>/^ehrung_der_woche_2026-07-27/.test(x.id))})`);
ok(s2allein.tag && !s2allein.woche && !s2allein.ew,
  'Ist der Sonntag der einzige Spieltag seiner Woche, behält er seine Ehrung, und die Woche hat weder Karte noch Ehrung');
stand(ms(D2, 23, 59, 59) + 999, ms('2026-08-03', 0, 5),
  [Object.assign({}, sonntag[0], {id:sonntag[0].id + '-do', created_at:'2026-07-30T18:00:00'})]);
const s2 = J(`(()=>{const l=__roh.slice().sort(_storyFolge), i=id=>l.findIndex(x=>x.id===id);
  const p=l.find(x=>x.id==='potd_${D2}'), w=l.find(x=>/^woche_/.test(x.id)&&tagKey(x.when)==='${D2}'), ew=l.find(x=>/^ehrung_der_woche_/.test(x.id));
  return {tagesehrung:i('tagesehrung_${D2}')>=0, ein:p&&p.dataRef.ehrungIn, ts:((p&&p.dataRef.tagesschluss)||[]).map(z=>z.text),
    karte:p?_newsCardHtmlM2(p,false,false,''):'',
    woche:w?new Date(w.when).toTimeString().slice(0,8):null, ew:ew?new Date(ew.when).toTimeString().slice(0,8):null,
    potd:p?new Date(p.when).toTimeString().slice(0,8):null,
    folge:w&&ew&&p?[i(w.id),i(ew.id),i(p.id)]:null};})()`);
ok(!s2.tagesehrung && s2.ein === 'woche' && (s2.ts || []).indexOf('Ben übernimmt „Der letzte Ball“') >= 0
   && /Mit dem Schluss des Tages/.test(s2.karte || ''),
  `Endet mit dem Spieltag die Woche, gibt es keine Ehrung des Tages; der Spieler des Tages trägt, was der Schluss ändert (${(s2.ts || []).length} Zeilen)`);
ok(s2.woche === '23:59:05' && s2.ew === '23:59:05' && s2.potd === '23:59:00' && !!s2.folge
   && s2.folge[1] === s2.folge[0] + 1 && s2.folge[2] > s2.folge[1],
  `Am Sonntag: Wochenkarte und Ehrung der Woche um 23:59:05, die wichtigere oben, darunter der Spieler des Tages um 23:59 (${s2.woche}/${s2.ew}/${s2.potd})`);

// ── Gespeicherte Karten werden beim Anzeigen überführt ──────────────
// Ältere Fassungen speicherten die Ehrung des Tages im Spieler des Tages
// und die Wochenkarte um 23:00. Eine gespeicherte Zeile ändert sich nicht
// [§C33]; beim Anzeigen entsteht aus ihr die neue Form.
stand(D1E, ms('2026-07-25', 0, 5));
const alt = J(`(()=>{const p=__roh.find(x=>x.id==='potd_${D1}'), e=__roh.find(x=>x.id==='tagesehrung_${D1}');
  if(!p||!e) return {fehlt:true};
  const potd=Object.assign({}, p, {dataRef:Object.assign({}, p.dataRef, {ehrung:e.dataRef.spieler, ehrungVoll:true, ehrungBrk:false,
    tagesschluss:e.dataRef.tagesschluss})});
  const woche={id:'woche_2026-W31', cat:'season', ic:'weekKing', when:new Date(2026,7,2,23,0,0), prio:84, title:'Die Woche der Liga', desc:'.', dataRef:{type:'woche'}};
  _cache._stories=[potd, woche];
  const l=getStoriesCache(), k=l.find(x=>x.id==='tagesehrung_${D1}'), q=l.find(x=>x.id==='potd_${D1}'), w=l.find(x=>x.id==='woche_2026-W31');
  _cache._stories=[];
  return {k:!!k, ts:k?((k.dataRef||{}).tagesschluss||[]).length:0, brk:k?(k.dataRef||{}).breaking:null,
    q:!!q&&!(q.dataRef||{}).ehrung&&!(q.dataRef||{}).tagesschluss, w:w?new Date(w.when).toTimeString().slice(0,8):null};})()`);
ok(!alt.fehlt && alt.k && alt.ts > 0 && alt.brk === false && alt.q,
  'Ein gespeicherter Spieler des Tages mit Ehrung zeigt sie als eigene Karte, mit ihren Zeilen des Schlusses und ihrer Antwort auf Breaking');
ok(alt.w === '23:59:05', `Eine gespeicherte Wochenkarte von 23:00 steht am Sonntag um 23:59:05 (${alt.w})`);

// ── Der Lesestand zählt nur, was davor liegt ────────────────────────
// Die Ehrung der Woche steht zur Zeit der Wochenkarte und entsteht erst am
// Montag um 00:00; wer dazwischen las, bekam sie nie als neu zu sehen.
const T0 = ms('2026-08-02', 23, 59, 5);
const lese = J(`[_newsGelesen({id:'ehrung_der_woche_x', when:new Date(${T0}), dataRef:{type:'ehrung'}}, new Set(), ${T0}),
  _newsGelesen({id:'ehrung_der_woche_x', when:new Date(${T0}), dataRef:{type:'ehrung'}}, new Set(), ${T0 + 1})]`);
ok(Array.isArray(lese) && lese[0] === false && lese[1] === true,
  'Eine Karte zur selben Zeit wie der Lesestand ist ungelesen, eine davor gelesen');

// ── Das Fenster des Generators beginnt um Mitternacht ───────────────
// Auf die Millisekunde geschnitten sah es vom ältesten Tag nur die Partien
// nach der Uhrzeit des Öffnens und fand keinen oder einen anderen Spieler
// des Tages. Der 24.07. hat Sätze von 17:18 bis 19:06; vierzehn Tage später
// um 18:00 liegt die Grenze mitten darin.
const voll = J(`(()=>{const p=__roh.find(x=>x.id==='potd_${D1}');return p?p.dataRef.games:null;})()`);
stand(ms('2026-08-07', 18, 0), ms('2026-08-07', 18, 0));
const rand = J(`(()=>{const p=__roh.find(x=>x.id==='potd_${D1}');return p?p.dataRef.games:null;})()`);
ok(voll != null && rand === voll,
  `Der älteste Tag des Fensters zählt ganz: der Spieler des Tages vom ${D1} mit ${voll} Sätzen auch vierzehn Tage später (${rand})`);

// ── Fun Facts in ganzen Sätzen, ein Platz nur auf dem Podest ────────
// Gemessen standen in der Kicker-Liga „Duell der Liga: Leon vs Maxi",
// „Rekord im Fokus: …", „vor Maxi mit 218 Siege" und „Nummer 9 bei der
// Siegquote" im Feed. Geprüft wird jede Vorlage an vielen Tagen.
// Ein Fun Fact erzählt eine Entwicklung, keinen Einzeleintrag [§C33]: der
// Pool trägt die acht Fragen, und jede muss an der Testliga ziehen. Dafür
// trägt jeder Satz Elo und Erwartung, wie in der App (`exp_a`, `deltas`);
// die Testliga lädt beides nicht mit.
stand(Infinity, ms('2026-08-26', 21, 0));
K(`(()=>{const h=new Map(simulateEloWithSliders(matches).history.map(x=>[x.matchId,x]));
  matches.forEach(m=>{const x=h.get(m.id);m.deltas=x?x.deltas:{};m.exp_a=x?x.expA:.5;});invalidateCache();})();0`);
const FF_FRAGEN = ['form_aufwind','form_erwartung','form_laufbahn','laufbahn_marke','chronik_reihe','duo_chemie','rolle_seite','liga_marke'];
const ffs = J(`(()=>{const pm=pmap(), nameOf=pid=>(pm[pid]||{}).name||'?';
  const falsch=[], gesehen=new Set(), pool=new Set();
  // Über die ganze Testliga, März bis August: „Über der Erwartung“ zieht
  // nur an gut jedem sechsten Tag, die letzten zwei Monate allein trafen keinen.
  for(let t=1;t<=90;t++){
    const now=new Date(${ms('2026-08-15', 15, 30)} - t*1.7*86400000); now.setHours(15,30,0,0);
    _ambientTemplatePool(now, pm, nameOf).forEach(x=>{ pool.add(x.key); let c=null; try{ c=x.make(_ambientRng(t)); }catch(e){ c=null; }
      if(!c) return; gesehen.add(x.key);
      const ti=String(c.title||''), de=String(c.desc||'');
      if(/^[^„"]*: /.test(ti)) falsch.push(x.key+' Titel mit Etikett: '+ti);
      if(/^[^„".]*: [+\\-−]?\\d/.test(de)) falsch.push(x.key+' Text mit Etikett: '+de);
      if(/ vs\\.? /i.test(ti+' '+de)) falsch.push(x.key+' mit vs: '+ti);
      if(/\\bmit \\d+ (Siege|Niederlagen)\\b/.test(de)) falsch.push(x.key+' Dativ: '+de);
      if(de && !/[.)“]$/.test(de.trim())) falsch.push(x.key+' ohne Punkt: '+de);
    });
  }
  return {falsch:[...new Set(falsch)], n:gesehen.size, gesehen:[...gesehen], pool:[...pool]};})()`);
ok(Array.isArray(ffs.pool) && ffs.pool.filter(k => !/^rueckblick_/.test(k)).sort().join() === FF_FRAGEN.slice().sort().join(),
  `Der Pool der Fun Facts trägt genau die acht Fragen, dazu Halbzeit und Jahresrückblick (${(ffs.pool || []).join(', ')})`);
ok(FF_FRAGEN.every(k => (ffs.gesehen || []).includes(k)),
  `Jede der acht Fragen zieht an der Testliga (${FF_FRAGEN.filter(k => !(ffs.gesehen || []).includes(k)).join(', ') || 'alle'})`);
ok(ffs.n >= 8 && Array.isArray(ffs.falsch) && !ffs.falsch.length,
  `Jeder Fun Fact spricht in ganzen Sätzen und nennt einen Platz nur auf dem Podest: ${(ffs.falsch || []).slice(0, 3).join(' · ') || ffs.fehler || ffs.n + ' Vorlagen'}`);

// ── Keine These über dieselbe Person zweimal in 30 Tagen ────────────
// Mit acht Fragen kommt dieselbe These eher wieder, und der letzte
// Durchgang der Ziehung liess die Paar-Sperre fallen: dieselbe These über
// dieselbe Person stand nach wenigen Tagen wieder da. Nachgespielt wird die
// ganze Testliga Tag für Tag, mit dem Bestand der Tage davor.
const thesen = J(`(()=>{const pm=pmap(), nameOf=id=>(pm[id]||{}).name||'?';
  const bestand=[], wann={}, falsch=[]; let karten=0;
  for(let t=new Date('2026-04-01T19:00:00').getTime(); t<=new Date('2026-08-15T19:00:00').getTime(); t+=86400000){
    _cache._stories=bestand.map(s=>Object.assign({}, s));
    let neu=[]; try{ neu=_buildAmbientStories(new Date(t), pm, nameOf) || []; }catch(e){ neu=[]; }
    neu.forEach(x=>{
      if(bestand.some(b=>b.id===x.id)) return;
      karten++;
      const d=x.dataRef||{}, pids=d.ambientPids||(d.ambientPid?[d.ambientPid]:['']), tag=Math.round(new Date(x.when).getTime()/864e5);
      if(!/^rueckblick_/.test(d.sub)) pids.forEach(pid=>{ const k=d.sub+'|'+pid;
        if(wann[k]!=null && tag-wann[k]<30) falsch.push(k.split('|')[0]+' '+((pm[pid]||{}).name||'')+' nach '+(tag-wann[k])+' Tagen'); wann[k]=tag; });
      bestand.push({id:x.id, when:x.when, title:x.title, desc:x.desc, prio:20, cat:x.cat, ic:x.ic, dataRef:d});
    });
  }
  _cache._stories=[];
  return {karten, falsch};})()`);
ok(thesen.karten >= 10 && Array.isArray(thesen.falsch) && !thesen.falsch.length,
  `Keine These über dieselbe Person zweimal in 30 Tagen, auch wenn ein Slot dafür leer bleibt (${thesen.karten} Karten${(thesen.falsch || []).length ? ' — ' + thesen.falsch.slice(0, 3).join(' · ') : ''})`);

// ── Die Halbzeit zeigt die beiden Seiten ────────────────────────────
// Sie zeigte nur die Tafel der Monatschroniken, und ihr Blatt die letzten
// Sätze des Tabellenführers, als wären es die der Liga.
const HZ = ms('2026-08-15', 15, 30);
stand(HZ, ms('2026-08-15', 15, 31));
const hz = J(`(()=>{const pm=pmap(), nameOf=pid=>(pm[pid]||{}).name||'?';
  const t=_ambientTemplatePool(new Date(${HZ}), pm, nameOf).find(x=>x.key==='rueckblick_halbzeit');
  const c=t&&t.make(_ambientRng(7)); if(!c) return {fehlt:true};
  const b=(c.dataRef||{}).bild||{}, falsch=[];
  ['reves','drive'].forEach(k=>{ const l=b[k]||[];
    if(!l.length||l.length>3) falsch.push(k+' hat '+l.length+' Zeilen');
    l.forEach((x,i)=>{ if(x[2]<HALBZEIT_MIN_SAETZE) falsch.push(k+' '+nameOf(x[0])+' mit '+x[2]+' Sätzen');
      if(!sichtbar(x[0])) falsch.push(k+' '+nameOf(x[0])+' im Ruhestand');
      if(i && x[1]/x[2] > l[i-1][1]/l[i-1][2]) falsch.push(k+' nicht nach Quote'); }); });
  const s={id:'ambient_hz', cat:c.cat, ic:c.ic, title:c.title, desc:c.desc, when:new Date(${HZ}),
    dataRef:Object.assign({type:'ambient', sub:t.key}, c.dataRef)};
  const karte=_faktBild(s,false)||'', bl=_ndFaktBlatt(s)||{};
  return {f:b.f, falsch, desc:c.desc, karte:/class="ff-hz"/.test(karte)&&/Revés/.test(karte)&&/Drive/.test(karte),
    blatt:/Die Spitze des Monats/.test(bl.mitte||'')&&/Die Monatschroniken/.test(bl.mitte||'')&&!/Die letzten zehn/.test(bl.mitte||'')};})()`);
ok(!hz.fehlt && hz.f === 'halbzeit' && Array.isArray(hz.falsch) && !hz.falsch.length,
  `Die Halbzeit zeigt Revés und Drive des Monats, je bis zu drei nach Siegquote ab ${J('HALBZEIT_MIN_SAETZE')} Sätzen auf der Seite: ${hz.fehlt ? 'keine Karte' : (hz.f + ' ' + (hz.falsch || []).join(' · '))}`);
ok(!!hz.karte && !!hz.blatt, 'Ihre Karte zeichnet beide Seiten nebeneinander, ihr Blatt zeigt die Spitze des Monats und die Chroniken');
ok(!hz.fehlt && typeof hz.desc === 'string' && !/\d %/.test(hz.desc) && hz.desc.length <= 140,
  `Ihr Satz passt auf die Karte, und „%" bricht nicht allein um (${hz.desc && hz.desc.length} Zeichen)`);

// ── Fun Facts nur, solange die Liga spielt ──────────────────────────
// Genau 72 Stunden nach dem letzten Satz ist schon Pause: der Slot des
// 26.08. um 15:00 bleibt leer, der des 25.08. steht.
setNow(ms('2026-08-26', 16, 0));
const ruhe = J(`(()=>{players=['p1','p2','p3','p4'].map(id=>({id,name:id,hidden:false,elo:0,drive:.5}));seasons=[];
  const t=${ms('2026-08-23', 15, 0)};
  matches=Array.from({length:12},(_,i)=>({id:'r'+i,a1:'p1',a2:'p2',b1:'p3',b2:'p4',a1_side:'reves',a2_side:'drive',b1_side:'reves',b2_side:'drive',
    ...partieFelder([{a:6,b:i%3,art:'n'}]),deltas:{p1:5,p2:5,p3:-5,p4:-5},exp_a:.5,created_at:new Date(t-(11-i)*3600000).toISOString()}));
  invalidateCache();_cache._stories=[];
  const ids=_buildStories().filter(s=>String(s.id).startsWith('ambient_')).map(s=>s.id);
  return {a25:ids.some(x=>x.startsWith('ambient_2026-08-25')), a26:ids.some(x=>x.startsWith('ambient_2026-08-26'))};})()`);
ok(ruhe.a25 === true && ruhe.a26 === false,
  `Drei Tage (72 Stunden) nach dem letzten Satz bleibt der Fun Fact aus, einen Tag davor steht er (25.08. ${ruhe.a25}, 26.08. ${ruhe.a26})`);

// ── Die Monatschronik bis zum letzten Satz ändert sich mit dem Schluss nicht
// Die Spieltage zählten bis zum Stand, die Spieler des Tages und der Woche
// bis zur Uhr: nach 23:59 kam ein Tagessieg ohne seinen Tag dazu, und die
// Tafel des letzten Satzes bekam „Der Tagesregent" nachträglich — in der
// Kicker-Liga am 19.11. um 01:16 für 17:15. Geprüft an jedem Spieltag der
// Testliga, am Tag danach mittags; montags ist damit auch die Woche zu.
{
  const letzte = {};
  L.matches.forEach(m => { const t = new Date(m.created_at).getTime(), d = new Date(t);
    const k = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); letzte[k] = Math.max(letzte[k] || 0, t); });
  const tage = Object.values(letzte).sort((a, b) => a - b);
  const halter = (t, jetzt) => { stand(t, jetzt);
    // Halter UND die Zählung darunter: eine Liga, in der niemand die
    // Schwelle des Tagesregenten erreicht, ändert keinen Halter, und der
    // Fehler bliebe unsichtbar, bis er es tut.
    return J(`(()=>{const sid=seasonOf(new Date(${t})).id, h=seasonTitleHalter(sid, ${t}), C=_seasonTitleCtx(sid, ${t});
      return Object.keys(h).sort().map(k=>k+':'+[].concat(h[k].halter||h[k].pids||h[k]).join('+'))
        .concat(Object.keys(C.P).sort().map(id=>id+' Tage '+C.P[id].tagN+' Tagessiege '+C.P[id].potd+' Wochen '+C.P[id].potwG+' Wochensiege '+C.P[id].potw));})()`); };
  const anders = [];
  tage.forEach(t => {
    const morgen = new Date(t); morgen.setDate(morgen.getDate() + 1); morgen.setHours(12, 0, 0, 0);
    const vor = halter(t, t + 60000), nach = halter(t, morgen.getTime());
    if(JSON.stringify(vor) !== JSON.stringify(nach)){
      const a = [].concat(vor), b = [].concat(nach);
      anders.push(new Date(t).toISOString().slice(0, 10) + ': ' + b.filter(x => !a.includes(x)).concat(a.filter(x => !b.includes(x)).map(x => '−' + x)).join(' '));
    }
  });
  ok(tage.length > 10 && !anders.length,
    `Die Monatschronik bis zum letzten Satz eines Tages ändert sich mit dem Schluss um 23:59 nicht (${tage.length} Spieltage)` + (anders.length ? ' — ' + anders.slice(0, 3).join(' | ') : ''));
}

console.log(fails ? `\n${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `\nALLE ${checks} CHECKS BESTANDEN`);
process.exit(fails ? 1 : 0);
