// ╔═══ §11.6f ─── DIE EHRUNG ──────────────────────────────────────────╗
//     Welche Auszeichnungen in einem Zeitraum verdient wurden, von wem, und
//     was jede davon genau diesem Spieler an Prestige bringt. Eine
//     Auszeichnung stand bisher nur an ihrer Partie, und gewöhnliche nur an
//     runden Marken (die fünfte, die zehnte): wer an einem Nachmittag elf
//     holte, erfuhr von zwei. Was sie fürs Prestige wert waren, stand
//     nirgends — die Ewige Tafel zählt Rekorde und Chroniken, nicht
//     Auszeichnungen.
//
//     Der Tag hat eine Ehrung, und sie ist Teil der Karte seines Spielers
//     des Tages um 23:59 (`_ehrungDesTages`): alles, was an diesem Tag geholt
//     wurde, aus den Partien und mit dem Schluss des Tages. Ohne Spieler des
//     Tages steht sie als eine Karte des Tages (`tagesehrung_<Tag>`). Es gab
//     eine eigene Ehrung je Runde, zwei Stunden nach ihrer letzten Partie:
//     an einem Spieltag standen so bis zu drei Ehrungen und der Spieler des
//     Tages untereinander, jede mit einem Teil des Tages. Woche und Monat
//     haben ihre eigene Ehrung (`_newsZeitraumEhrungen`), direkt unter ihrer
//     Karte. Enden zwei davon zugleich, steht nur die größere
//     (`_ehrungGroessere`).
//
//     Der Wert je Auszeichnung ist ihr Teilwert beim wievielten Mal
//     (`auszeichnungsTeilwert`): das erste und zweite Mal voll, danach eine
//     Stufe weniger [§C34]. Gezählt wird für Tag, Woche und Monat dasselbe:
//     der Unterschied zweier Prestige-Stände an den Grenzen des Zeitraums
//     (`rcpLaufbahnDaten`) [§C27].
// ╚══════════════════════════════════════════════════════════════════════╝

// Die Geehrten in ihrer Reihenfolge: je Spieler seine Posten (`{id, name,
// ic, klasse, mal, bis, p}`), die seltenste Klasse zuerst, darin der höchste
// Wert; die Spieler nach ihrer Summe. Für die Karte einer Runde, eines
// Zeitraums und die Zeilen unter dem Spieler des Tages dieselbe Ordnung.
const EH_ORD = {legendary:0, rare:1, common:2};
function _ehrungSpieler(roh){
  const r1 = x => Math.round(x * 10) / 10;
  return (roh || []).filter(j => j && j.summe > 0).map(j => ({pid:j.pid, summe:r1(j.summe),
    posten:j.posten.map(q => Object.assign({}, q, {p:r1(q.p)}))
      .sort((a, b) => (EH_ORD[a.klasse] - EH_ORD[b.klasse]) || (b.p - a.p) || a.name.localeCompare(b.name, 'de'))}))
    .sort((a, b) => (b.summe - a.summe) || pname(a.pid).localeCompare(pname(b.pid), 'de'));
}

// Die Karte aus den Geehrten. `ref` trägt, woher sie kommen — `ab` und
// `bis` einer Runde oder `periode` mit Woche oder Monat (nicht `schluss`:
// so heißt bei der Zeichen-Karte der Schluss, der sie auslöste).
function _ehrungKarte(roh, id, T, ref){
  const nm = pid => pname(pid);
  const spieler = _ehrungSpieler(roh);
  if(!spieler.length) return null;
  const zahl = spieler.reduce((n, x) => n + x.posten.reduce((m, q) => m + q.mal, 0), 0);
  const gesamt = Math.round(spieler.reduce((n, x) => n + x.summe, 0));
  // Ein Monat ehrt bis zu zwölf: „256 Auszeichnungen für Leon, Leo, Maxi,
  // Julian, Stefan …" wäre eine Zeile Namen, die die Säulen darüber schon
  // zeigen. Ab vier steht die Zahl.
  const wer = ref && ref.periode && spieler.length > 3 ? spieler.length + ' Spieler' : _namenKurz(spieler.map(x => nm(x.pid)));
  const title = (zahl === 1 ? 'Eine Auszeichnung' : zahl + ' Auszeichnungen') + ' für ' + wer;
  // Der Satz nennt die wertvollste Auszeichnung der Runde: die seltenste
  // Klasse, darin der höchste Wert. Die Summe nannte er nur, wenn nichts
  // Seltenes dabei war — und dieselbe Zahl stand im Fuß der Karte, je
  // Klasse. Ohne Doppelpunkt: das Blatt kürzt einen Satz mit Etikett auf
  // seinen Rest (`_ndLead`), und „Darunter eine seltene: …" stand dort als
  // Satzrest ohne Verb.
  let top = null;
  spieler.forEach(x => x.posten.forEach(q => {
    if(!top || EH_ORD[q.klasse] < EH_ORD[top.q.klasse] || (q.klasse === top.q.klasse && q.p > top.q.p))
      top = {pid:x.pid, q};
  }));
  const klasse = {legendary:', eine legendäre Auszeichnung', rare:', eine seltene Auszeichnung'}[top.q.klasse] || '';
  // Das wievielte Mal als Ziffer, wie im Blatt darunter („1. Mal"): mit
  // „zum ersten Mal" stand im Satz keine Zahl, und Prestige soll er nicht
  // nennen — das steht bei den Klassen.
  const desc = `${nm(top.pid)} holt dabei „${top.q.name}“ zum ${top.q.bis}. Mal${klasse}.`;
  return {
    id, cat:'badge', ic:'medal', when:new Date(T),
    prio:STORY_PRIO.ehrung, title, desc,
    dataRef:Object.assign({type:'ehrung', playerIds:spieler.map(x => x.pid), spieler, zahl, gesamt}, ref)
  };
}

// ── Was ein Schluss vergibt ─────────────────────────────────────────
// Manche Auszeichnung entsteht ohne Partie: mit dem Schluss des Tages um
// 23:59 der Spieler des Tages und, was den ganzen Tag beschreibt
// (Unschlagbar, Comeback-Tag), dazu Allwetter, Tag der Götter und der
// Award-Sammler, die an ihm hängen; mit dem Schluss der Woche am Montag um
// 00:00 der Spieler der Woche und wieder der Award-Sammler; mit dem Schluss
// des Monats Meister, Vize-Meister, Team der Saison und Untouchable.
// Welche Auszeichnung welcher Schluss vergeben kann, steht hier fest;
// `tests/ambient` rechnet an allen Schlüssen der echten Partien nach, dass
// keine fehlt. Über alle Auszeichnungen zu zählen kostete je Schluss das
// Zehnfache. Eine Schattenseite bringt kein Prestige und steht in keiner
// Ehrung (Schwarzer Tag, Zusammenbruch).
const EHRUNG_SCHLUSS = {
  tag:['potd', 'unbeatable', 'godly_streak', 'allwetter', 'comeback_day', 'award_collector'],
  woche:['potw', 'award_collector'],
  monat:['champion', 'vice_champion', 'team_of_season', 'untouchable']
};
// Was die Karte des Schlusses selbst als Schlagzeile trägt: der Spieler des
// Tages, der Woche, das Podest des Monats. Eine legendäre Auszeichnung
// daneben, die der Schluss vergab, macht die Karte zum Breaking [§C33] —
// sie hat sonst keine eigene; diese nicht, sonst stünde jeder Monat zweimal
// oben.
const EHRUNG_KOPF = new Set(['potd', 'potw', 'champion', 'vice_champion', 'team_of_season']);
const _ehrungBrichtVor = sp => (sp || []).some(x => ((x && x.posten) || [])
  .some(q => q && q.klasse === 'legendary' && !EHRUNG_KOPF.has(q.id)));

// ── Warum die Karte eines Schlusses Breaking ist ────────────────────
// Was der Schluss eines Tages (`art` 'tag', `ms` 23:59) oder einer Woche
// ('woche', `ms` Montag 00:00, mit dem Schluss ihres Sonntags, den sie
// trägt) an legendären Auszeichnungen vergab, die nicht seine Schlagzeile
// sind: je Spieler und Auszeichnung eine Zeile. Nur das macht die Karte zum
// Breaking. Eine legendäre aus einer Partie hat ihre Partie-Karte, und die
// ist schon Breaking: gemessen am 28.10. stand „Absoluter Sieger" um 16:11
// als Breaking an der Partie und um 23:59 noch einmal, weil der gespeicherte
// Spieler des Tages kein `ehrungBrk` trug und beim Anzeigen jede legendäre
// des ganzen Tages gefragt wurde. Je Datenstand und Schluss gemerkt:
// `_isBreaking` fragt bei jedem Zeichnen des Feeds.
const _ehrungGrundMemo = new WeakMap();
function _ehrungBrkGrund(art, ms){
  let m = _ehrungGrundMemo.get(matches);
  if(!m || m.pl !== players){ m = {pl:players, je:new Map()}; _ehrungGrundMemo.set(matches, m); }
  const k = art + '|' + ms;
  if(m.je.has(k)) return m.je.get(k);
  let sp = [];
  try {
    if(art === 'tag') sp = _ehrungTagesSchluss(ms);
    else { const so = new Date(ms - 1); so.setHours(23, 59, 0, 0);
      sp = _ehrungSpieler(_ehrungSchlussPosten(ms, EHRUNG_SCHLUSS.woche)).concat(_ehrungTagesSchluss(so.getTime())); }
  } catch(e){ sp = []; }
  const l = [];
  sp.forEach(x => (x.posten || []).forEach(q => {
    if(q.klasse === 'legendary' && !EHRUNG_KOPF.has(q.id)) l.push({pid:x.pid, id:q.id, name:q.name, bis:q.bis}); }));
  m.je.set(k, l);
  return l;
}
// Der Satz dazu, im Kleintext unter der Karte (`.nf-brk-sub`): ohne ihn
// stand über einer Karte „BREAKING", und niemand sah, wofür. Er erzählt die
// Nachricht, nicht die Regel: „Breaking, weil der Schluss der Woche
// „Award-Sammler“ für Julian brachte, eine legendäre Auszeichnung." las sich
// wie eine Begründung der App für sich selbst, und die Oberfläche beschreibt
// sich nicht (CLAUDE.md, Sprache und Ton). Das Band darüber sagt schon „Breaking"; hier steht, wer
// was holt und zum wievielten Mal.
function _ehrungBrkSatz(l, art){
  if(!l || !l.length) return '';
  const wann = art === 'woche' ? 'zum Schluss der Woche' : 'zum Schluss des Tages';
  const je = new Map();
  l.forEach(q => { if(!je.has(q.pid)) je.set(q.pid, []); je.get(q.pid).push(q); });
  const titel = qs => _namenListe(qs.map(q => `„${q.name}“`));
  if(je.size === 1){
    const [pid, qs] = [...je][0];
    if(qs.length > 1) return `${pname(pid)} holt sich ${wann} die legendären Auszeichnungen ${titel(qs)}.`;
    const n = qs[0].bis;
    const mal = n === 1 ? ', zum ersten Mal' : n > 1 ? `, zum ${n}.\u00a0Mal` : '';
    return `${pname(pid)} holt sich ${wann} die legendäre Auszeichnung ${titel(qs)}${mal}.`;
  }
  // Mehrere Spieler: je einer mit seinen Titeln, ab dem vierten gezählt
  // (`_namenKurz`) — eine Zeile Kleintext, keine Liste.
  const wer = [...je].map(([pid, qs]) => `${titel(qs)} für ${pname(pid)}`);
  const n = l.length, oft = n <= 4 ? _zahlwortDe(n) + 'mal' : n + '-mal';
  return `${wann[0].toUpperCase() + wann.slice(1)} ${oft} legendär: ${_namenKurz(wer)}.`;
}
// Der Schluss, den eine Karte trägt: der Tag eines Spielers des Tages oder
// einer Ehrung des Tages, der Montag nach einer Woche.
function _ehrungSchlussVon(s){
  const d = (s && s.dataRef) || {};
  const tag = d.type === 'potd' ? d.dayKey : d.periode === 'tag' ? d.tag : null;
  if(tag){ const t = new Date(tag + 'T00:00:00'); t.setHours(23, 59, 0, 0); return {art:'tag', ms:t.getTime()}; }
  if(d.periode === 'woche' && d.bis) return {art:'woche', ms:Number(d.bis) + 1};
  return null;
}

// Gezählt wird mit der Auszeichnung selbst (`count` mit Schnitt), eine
// Millisekunde vor dem Schluss gegen den Schluss: was dazwischen dazukam,
// hat er gebracht. Ein Zeitraum: wer darin stand, steht darin [§C40].
// Gebraucht für Breaking (was vergab der Schluss selbst) und für die Woche,
// die die Titel des Monats abzieht (`rcpWocheLaufbahn`).
function _ehrungSchlussPosten(schlussMs, ids){
  const vor = schlussMs - 1, msA = _partienBis(vor), msB = _partienBis(schlussMs);
  const je = {};
  BADGES.forEach(b => {
    if(!ids.includes(b.id)) return;
    const klasse = rarityOf(b.id);
    (players || []).forEach(p => {
      if(!sichtbar(p)) return;
      let a = 0, n = 0;
      try { a = b.count(p.id, msA, vor) || 0; n = b.count(p.id, msB, schlussMs) || 0; } catch(e){ return; }
      if(!(n > a)) return;
      let wert = 0, mal = 0;
      for(let i = a + 1; i <= n; i++){ wert += auszeichnungsTeilwert(b.id, i); mal++; }
      if(!(wert > 0)) return;
      const j = je[p.id] || (je[p.id] = {pid:p.id, summe:0, posten:[]});
      j.posten.push({id:b.id, name:b.name, ic:b.ic, klasse, mal, bis:n, p:wert});
      j.summe += wert;
    });
  });
  return Object.values(je);
}
// Die Geehrten aus einem Paar von Prestige-Ständen (`rcpLaufbahnDaten`):
// je Spieler die Posten seiner Auszeichnungen und ihre Summe.
const _ehrungAusLaufbahn = daten => (daten || []).map(x => ({pid:x.pid,
  summe:x.posten.reduce((n, q) => n + q.p, 0), posten:x.posten}));

// Mehrere Ehrungen zu einer: je Spieler und Auszeichnung die Male und der
// Wert zusammen, das wievielte Mal das höchste. Für gespeicherte Ehrungen,
// die zusammen den Tag ergeben (`_consolidateStories`).
function _ehrungVereint(listen){
  const je = {};
  (listen || []).forEach(l => (l || []).forEach(x => {
    if(!x || !x.pid) return;
    const j = je[x.pid] || (je[x.pid] = {});
    (x.posten || []).forEach(q => {
      const a = j[q.id] || (j[q.id] = Object.assign({}, q, {mal:0, bis:0, p:0}));
      a.mal += q.mal || 0; a.bis = Math.max(a.bis, q.bis || 0); a.p += q.p || 0;
    });
  }));
  return _ehrungSpieler(Object.keys(je).map(pid => { const posten = Object.values(je[pid]);
    return {pid, summe:posten.reduce((n, q) => n + q.p, 0), posten}; }));
}

// ── Die größere Ehrung trägt den Tag ──────────────────────────────────
// Endet mit einem Spieltag auch eine Woche (am Sonntag) oder ein Monat (an
// seinem letzten Tag), enden sie in derselben Nacht: der Spieler des Tages
// und die Woche um 23:59, der Rückblick des Monats um 00:00. Mit je einer
// Ehrung standen dort zwei oder drei untereinander, und die kleinere stand
// ganz in der größeren — die Woche zählt ihren Sonntag, der Monat seinen
// letzten Tag und, endet er an einem Sonntag, seine letzte Woche bis zu
// ihrem Schluss (`rcpMonatGrenzen`). Es steht nur die größte: der Spieler
// des Tages bleibt, ohne Ehrung, ein Tag ohne ihn hat keine Karte, und die
// Woche, die mit dem Monat endet, hat keine eigene Ehrung. 'monat', 'woche'
// oder '' für einen Tag (irgendeine Zeit in ihm).
function _ehrungGroessere(tagMs){
  if(tagKey(seasonEnd(seasonOf(tagMs).id).getTime()) === tagKey(tagMs)) return 'monat';
  return new Date(tagMs).getDay() === 0 ? 'woche' : '';
}

// ── Die Ehrung eines Tages ────────────────────────────────────────────
// Alles, was an einem Tag geholt wurde: aus seinen Partien und mit seinem
// Schluss um 23:59, zwischen den Grenzen des Tages (`_storyTagGrenzen`).
// Er beginnt nach dem Schluss der Woche und endet vor dem des Monats: was
// diese vergeben, steht in ihrer eigenen Ehrung. Ob sie gezeigt wird,
// entscheidet `_ehrungGroessere`.
function _ehrungDesTages(tagMs){
  const g = _storyTagGrenzen(tagMs);
  if(!g) return [];
  return _ehrungSpieler(_ehrungAusLaufbahn(rcpLaufbahnDaten(g.vorMs + 1, g.nachMs)));
}
// Was der Schluss des Tages allein vergab: es entscheidet, ob die Karte
// des Tages Breaking ist. Die legendären Auszeichnungen aus den Partien
// haben ihre Zeile an der Partie und machten sonst jeden Tag mit einem
// „Absoluten Sieger" zweimal zu Breaking.
function _ehrungTagesSchluss(rep){
  return _ehrungSpieler(_ehrungSchlussPosten(rep, EHRUNG_SCHLUSS.tag));
}

// ── Die Ehrung einer Woche und eines Monats ────────────────────────────
// Alle Auszeichnungen des Zeitraums, aus denselben zwei Ständen wie die
// Säulen seines Rückblicks (`rcpLaufbahnDaten`, `rcpWocheLaufbahn`) [§C27]:
// die Karte heißt „Geholt im Oktober 2026", also gehört alles hinein, was
// im Oktober geholt wurde, nicht nur, was die letzte Millisekunde vergab.
// Nur das zeigte die Ehrung des Schlusses, und neben dem Rückblick, der 256
// Auszeichnungen zählte, standen dort vier.
//
// Sie steht direkt unter der Karte ihres Zeitraums, zur selben Zeit: die
// Woche am Sonntag um 23:59:05 unter der Wochenkarte, der Monat am Ersten
// um 00:00 unter seinem Rückblick. Bei gleicher Zeit steht die wichtigere
// oben (`_storyFolge`). Vorher stand die Ehrung des Monats um 00:01 über
// dem Rückblick und die der Woche um 23:57 unter dem Spieler des Sonntags.
//
// Breaking ist sie nur, wenn der Schluss selbst eine legendäre Auszeichnung
// vergab, die keine Schlagzeile ist (der Award-Sammler am Montag): die
// legendären aus Partien hatten ihre eigene Karte, und der Monat ist es mit
// seinem Rückblick schon. Die Woche trägt ihren Sonntag (`_ehrungGroessere`)
// und fragt deshalb auch, was dessen Schluss vergab: dort hätte es die
// Karte des Tages zum Breaking gemacht.
function _newsZeitraumEhrungen(nowMs){
  const out = [], seit = nowMs - NEWS_FENSTER_TAGE * 864e5;
  const wochen = new Set(), monate = new Set();
  (matches || []).forEach(m => {
    const t = mts(m);
    if(t > nowMs || t < seit - 31 * 864e5) return;
    wochen.add(wochenBeginn(new Date(t)).getTime());
    const s = seasonOf(m.created_at);
    if(s && s.id) monate.add(s.id);
  });
  wochen.forEach(ab => {
    const ende = new Date(ab); ende.setDate(ende.getDate() + 7);
    const S = ende.getTime();
    if(S > nowMs || S < seit || _ehrungGroessere(S - 1) === 'monat') return;
    const st = _ehrungKarte(_ehrungAusLaufbahn(rcpWocheLaufbahn(ab, S - 1)), 'ehrung_der_woche_' + tagKey(ab), S - 60000 + 5000,
      {periode:'woche', woche:tagKey(ab), von:ab, bis:S - 1, breaking:_ehrungBrkGrund('woche', S).length > 0});
    if(st) out.push(st);
  });
  monate.forEach(sid => {
    const S = seasonEnd(sid).getTime(), mg = rcpMonatGrenzen(sid);
    if(S + 1 > nowMs || S + 1 < seit) return;
    const st = _ehrungKarte(_ehrungAusLaufbahn(rcpLaufbahnDaten(mg.von, mg.bis)), 'ehrung_des_monats_' + sid, S + 1,
      {periode:'monat', sid, breaking:false});
    if(st) out.push(st);
  });
  return out.sort((a, b) => a.when - b.when);
}

// Der Ton einer Klasse, wie überall: Gold legendär, Violett selten, Grün
// gewöhnlich [§C25].
function _ehrungTon(k){ return k === 'legendary' ? 'gold' : k === 'rare' ? 'viol' : 'gruen'; }
const EH_KLASSEN = [['legendary', 'legendär'], ['rare', 'selten'], ['common', 'gewöhnlich']];
const _ehZahl = v => komma(Math.round(v * 10) / 10).replace(',0', '');

// ── Die Säulen ──────────────────────────────────────────────────────
// Je Geehrtem eine Säule, wie im Säulenbild eines Spieltags: unten sein
// Wappen, Insignium und Gesicht wie in der Rangliste [§C27], darüber die Säule, so hoch wie das Prestige seiner Auszeichnungen
// gegen den, der am meisten bekam, darauf die Zahl und die Zeichenkachel
// seiner wertvollsten Auszeichnung [§C27]. Die Säule ist aus den
// Auszeichnungen gestapelt, die Seltenste oben, in der Farbe ihrer Klasse
// [§C25]: jede seltene und legendäre ein eigenes Stück, die gewöhnlichen
// zusammen eins — man sieht, woher das Prestige kommt, ohne eine Zahl je
// Auszeichnung. Auf der Karte stand vorher das Prestige je Spieler in Chips
// wie auf der Ewigen Tafel: dieselbe Form für eine andere Zahl las sich als
// dieselbe Nachricht. Ein Entwurf hängte Bänder mit Medaillen darunter —
// eine Zeichnung, die es sonst nirgends in der App gibt.
// `gross` ist das Blatt: dort steht der Name unter dem Gesicht. `o.still`
// lässt das Lauflicht der legendären weg: im Rückblick stehen Säulen,
// Podest und Wappen untereinander, und ein Licht je Säule wäre dort
// Schimmer ohne Aussage.
function _ehrungSaeulen(sp, gross, o){
  o = o || {};
  const pm = pmap();
  const da = sp.filter(x => pm[x.pid] && x.summe > 0);
  if(!da.length) return '';
  // Ein Wappen braucht 48 px, darunter bleibt nur das Gesicht
  // (`insAvWrap`). Die Karte ist im Feed bei 360 px nur 287 px breit: in
  // einer Reihe stehen höchstens fünf, im Blatt mit den Namen darunter vier;
  // wer mehr ehrt, teilt die Säulen auf gleich lange Reihen, die vorderen
  // für die mit dem meisten Prestige. Auf schmaleren Telefonen werden die
  // Wappen über die Breite der Bühne kleiner (`--je`, CSS), statt dass eine
  // Säule allein in die nächste Reihe bricht. Vorher standen auf der Karte
  // nackte Gesichter von 30 px — ohne das Insignium, das sie überall sonst
  // tragen.
  const WAPPEN = gross ? 52 : 48, JE_REIHE = gross ? 4 : 5;
  const reihen = Math.ceil(da.length / JE_REIHE), breite = Math.ceil(da.length / reihen);
  // Gleich lang heißt: um höchstens eine Säule verschieden, die längeren
  // vorn. Ein Umbruch nach je `breite` Säulen ließ zehn Geehrte einer Woche
  // als 4 + 4 + 2 stehen und dreizehn als 4 + 4 + 4 + 1.
  const schnitt = new Set();
  for(let r = 0, n = 0; r < reihen - 1; r++){
    n += Math.floor(da.length / reihen) + (r < da.length % reihen ? 1 : 0);
    schnitt.add(n);
  }
  const H = gross ? 96 : 52, MIN = 6, max = Math.max(...da.map(x => x.summe));
  let gold = 0;
  const saeule = (x, i) => {
    const h = Math.max(MIN, Math.round(H * x.summe / max));
    const posten = (x.posten || []).filter(q => q.p > 0);
    const gewoehnlich = posten.filter(q => q.klasse === 'common');
    const stuecke = posten.filter(q => q.klasse !== 'common')
      .map(q => ({klasse:q.klasse, p:q.p, name:q.name}))
      .concat(gewoehnlich.length ? [{klasse:'common', p:gewoehnlich.reduce((n, q) => n + q.p, 0),
        name:gewoehnlich.length === 1 ? gewoehnlich[0].name : gewoehnlich.length + ' gewöhnliche'}] : [])
      .map(q => `<i class="${q.klasse}" style="flex-grow:${q.p}" title="${esc(q.name)}"></i>`).join('');
    // Die Kachel zeigt die wertvollste Auszeichnung: die seltenste Klasse,
    // darin der höchste Wert — die Posten sind schon so geordnet.
    const top = posten[0];
    return `<span class="eh-s" data-pid="${esc(x.pid)}" style="--i:${i}">`
      + `<span class="eh-s-z" title="${esc(top ? top.name : '')}"${top ? ` data-bp="${esc(top.id)}" data-bp-pid="${esc(x.pid)}"` : ''}>${top ? _ehrungKachel(top, o.still ? null : () => gold++, gross ? '' : 'k') : ''}</span>`
      + `<em class="eh-s-w num">+${_ehZahl(x.summe)}</em>`
      + `<span class="eh-saeule" style="height:${h}px">${stuecke}</span>`
      + `<span class="eh-s-av" title="${esc(pm[x.pid].name)}">${rcpAvHtml(x.pid, WAPPEN, {})}</span>`
      + (gross ? `<b class="eh-s-n">${esc(pm[x.pid].name)}</b>` : '')
      + `</span>`
      // Der Umbruch steht ausdrücklich da: von selbst bräche die Reihe erst
      // am Rand und ließe einen allein in der zweiten.
      + (schnitt.has(i + 1) ? '<span class="eh-umbruch" aria-hidden="true"></span>' : '');
  };
  return `<div class="eh-buehne${gross ? ' gross' : breite >= 5 ? ' voll' : ''}" style="--je:${breite}">${da.map(saeule).join('')}</div>`;
}

// Die Zeichenkachel einer Auszeichnung in der Farbe ihrer Klasse [§C27].
// Eine legendäre trägt das Lauflicht wie im Profil, versetzt von Kachel zu
// Kachel (`naechste` zählt die goldenen einer Ansicht), damit es durch die
// Reihe wandert, statt überall zugleich aufzublitzen. Klein (`k`) überall
// außer auf der Bühne des Blatts. Ohne `naechste` steht sie still.
function _ehrungKachel(q, naechste, groesse){
  const z = zkHtml(q.ic, groesse == null ? 'k' : groesse, _ehrungTon(q.klasse));
  return q.klasse === 'legendary' && naechste ? z.replace(/<\/span>$/, glanzBahn(1 + naechste() * .35) + '</span>') : z;
}

// Die Klassen einer Runde: wie viele Auszeichnungen jeder Klasse und was sie
// zusammen an Prestige brachten. Nur Klassen, die vorkommen.
function _ehrungKlassen(sp){
  const k = {};
  sp.forEach(x => (x.posten || []).forEach(q => {
    const z = k[q.klasse] || (k[q.klasse] = {n:0, p:0});
    z.n += q.mal; z.p += q.p;
  }));
  return EH_KLASSEN.filter(([id]) => k[id] && k[id].p > 0).map(([id, wort]) => ({id, wort, n:k[id].n, p:k[id].p}));
}
const _ehrungKlasseHtml = z => `<span class="eh-k ${z.id}"><i></i><b class="num">${z.n}</b> ${esc(z.wort)}`
  + ` <em class="num">+${_ehZahl(z.p)}</em></span>`;

// Woher die Auszeichnungen einer Ehrung kommen, auf der Karte und im Blatt
// dieselbe Angabe [§C27]. Die Karte trug nur die Uhrzeit, zu der sie
// entstand — zwei Stunden nach der letzten Partie —, und neben „18:04" las
// sich eine Runde von 13:44 bis 15:55 wie eine Ehrung für den Abend. Heute
// und gestern als Wort, weiter zurück das Datum; über Mitternacht steht der
// zweite Tag dabei. `ab` ist die erste Partie, aus der eine Auszeichnung der
// Runde stammt — eine, die erst am Tagesende vergeben wird, kann vom Vortag
// sein.
// Zwei Teile, die zusammen einen Satz ergeben: `vor` sagt, was der Zeitraum
// bedeutet, `wann` nennt ihn. „Partien vom 06.10., 15:12 bis 08.10., 15:10"
// allein sagte nicht, wozu die Zahlen gehören, und vier Ziffern mit
// Doppelpunkt hinter einem Datum lasen sich auch als Ergebnis. Hinter JEDER
// Uhrzeit steht „Uhr": mit einem „Uhr" nur am Ende stand „vom 19.10., 17:17
// bis gestern, 16:04 Uhr" da, und die erste Zahl las sich wieder nicht als
// Uhrzeit. Die Karte setzt beide Teile untereinander, das Blatt
// hintereinander. Innerhalb eines Endes nur feste Leerzeichen, damit der
// Zeitraum nur vor dem „bis" umbricht: umbrochen stand „15:55" allein in
// der zweiten Zeile, getrennt von seinem „bis".
// Die Ehrung einer Woche oder eines Monats nennt den Zeitraum, nicht seine
// Partien: „Geholt vom 19.10. bis 25.10.", „Geholt im Oktober 2026". Ohne
// „in der Woche": das sagt die Aufschrift darüber, und mit ihm brach der
// Zeitraum der Woche auch bei 360 px in eine zweite Zeile.
function _ehrungZeitraum(d){
  const jetzt = Date.now();
  const tag = t => tagKey(t) === tagKey(jetzt) ? 'heute'
    : tagKey(t) === gesternKey(jetzt) ? 'gestern' : datumFmt(t, 'tm');
  // Eine gespeicherte Ehrung eines Tages ohne Spieler des Tages, neben dem
  // sie aufgehen könnte (`_consolidateStories`): „Geholt am 22.10.".
  if(d && d.periode === 'tag' && d.tag){
    const w = tag(new Date(d.tag + 'T12:00:00').getTime());
    return /^\d/.test(w) ? {vor:'Geholt am', wann:w} : {vor:'Geholt', wann:w};
  }
  if(d && d.periode === 'woche' && d.von && d.bis)
    return {vor:'Geholt', wann:`vom\u00a0${datumFmt(d.von, 'tm')} bis\u00a0${datumFmt(d.bis, 'tm')}`};
  if(d && d.periode === 'monat' && d.sid) return {vor:'Geholt im', wann:seasonLabel(d.sid)};
  if(!d || !d.ab || !d.bis) return null;
  const von = t => { const w = tag(t); return (/^\d/.test(w) ? 'vom' : 'von') + '\u00a0' + w; };
  const uhr = t => '\u00a0' + datumFmt(t, 'uhr') + '\u00a0Uhr';
  if(d.ab === d.bis) return {vor:'Geholt in der Partie', wann:`${von(d.ab)},${uhr(d.ab)}`};
  return {vor:'Geholt in den Partien', wann:`${von(d.ab)},${uhr(d.ab)} bis`
    + (tagKey(d.ab) === tagKey(d.bis) ? '' : '\u00a0' + tag(d.bis) + ',') + uhr(d.bis)};
}

// Die Karte: die Säulen als Bühne, darunter die Schlagzeile und, leise,
// aus welchen Partien die Auszeichnungen stammen. Ein Satz nannte das
// Seltenste, und im Fuß stand, was jede Klasse gebracht hat — beides
// Zusatztext unter einem Bild, das die Säulen, ihre Zeichenkachel und ihr
// Prestige schon zeigt, wie bei der Insignium-Karte. Satz, Klassen und was
// jeder genau geholt hat, stehen im Blatt. Mit einer legendären
// Auszeichnung trägt die Karte den Schimmer des Seltenen, wie eine einzelne
// seltene Auszeichnung im Feed [§C25]; eine seltene allein reicht nicht,
// sie steht in fast jeder Ehrung.
function _newsEhrungHtml(s, isRead, fadenHtml){
  const d = s.dataRef || {};
  const sp = Array.isArray(d.spieler) ? d.spieler : [];
  const zr = _ehrungZeitraum(d);
  if(d.periode) return _newsEhrungKompaktHtml(s, d, sp, zr, isRead, fadenHtml);
  const glanz = sp.some(x => (x.posten || []).some(q => q.klasse === 'legendary'));
  return `<div class="nf-card nf-s-badge nf-ehrung nfc-badge${glanz ? ' nf-glanz' : ''}${isRead ? ' read' : ''}" data-sid="${esc(s.id)}"`
    + `${glanz ? ` style="--gv:${_newsGlanzVersatz(s.id)}s"` : ''}>
    ${_newsMotiv('badge', s)}
    <div class="nf-top"><span class="nf-rub"><i>${svgI('medal')}</i><b>DIE EHRUNG</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    ${_ehrungSaeulen(sp, false)}
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div>${zr ? `<div class="eh-zr"><span class="eh-zr-k">${esc(zr.vor)}</span> <span class="eh-zr-t">${esc(zr.wann)}</span></div>` : ''}</div>
      <span class="nf-chev">${svgI('chevron')}</span></div>${fadenHtml || ''}</div>`;
}

// ── Die Karte eines Tages, einer Woche, eines Monats: knapp ─────────────
// Sie steht direkt unter der Karte ihres Zeitraums und ist ein Teil von
// ihr: Schlagzeile und Zeitraum, eine Reihe Gesichter mit ihrem Prestige,
// die vorderen fünf, mehr als Zahl, und ein Balken, was jede Klasse
// brachte. Säulen, Namen und jede einzelne Auszeichnung stehen im Blatt.
// Mit den Säulen und Namen aller Geehrten war die Ehrung der Woche höher
// als ein Bildschirm (61 Auszeichnungen für sieben Spieler: zwei Reihen
// Wappen, darunter zwei Zeilen Klassen) und überschattete die Wochenkarte
// darüber. Woche und Monat in Gold wie ihre Karte; der Tag ohne Spieler des
// Tages in der Farbe der Ehrung, mit dem härtesten Tag darunter wie auf der
// Karte des Spielers des Tages [§C27].
const EH_KOMPAKT = 5;
function _newsEhrungKompaktHtml(s, d, sp, zr, isRead, fadenHtml){
  const pm = pmap(), klassen = _ehrungKlassen(sp);
  const da = sp.filter(x => x && pm[x.pid] && x.summe > 0);
  // Nie „+1": wer als Einziger übrig bliebe, steht mit Gesicht da [§C33].
  const vorn = da.length > EH_KOMPAKT ? da.slice(0, EH_KOMPAKT - 1) : da, rest = da.length - vorn.length;
  const art = {monat:['crown', 'EHRUNG DES MONATS', 'Ehrung des Monats'], woche:['weekKing', 'EHRUNG DER WOCHE', 'Ehrung der Woche'],
    tag:['medal', 'EHRUNG DES TAGES', 'Ehrung des Tages']}[d.periode] || ['medal', 'DIE EHRUNG', 'Ehrung'];
  const gold = d.periode === 'woche' || d.periode === 'monat';
  const kopf = x => `<span class="eh-kp-s ${_ehrungTon((x.posten[0] || {}).klasse)}">${_spChip(x.pid)}`
    + `<b class="num">+${_ehZahl(x.summe)}</b><small>${esc(_spName(x.pid))}</small></span>`;
  const g = d.gegenstueck;
  // Breaking wie jede andere Karte: der rote Balken, darin, welche Ehrung es
  // ist, und unten im Kleintext, welche legendäre Auszeichnung ihres
  // Schlusses es macht (`_ehrungBrkSatz`). Vorher zählte sie im Chip
  // „Breaking" mit und sah im Feed aus wie jede Ehrung.
  const brk = _isBreaking(s), grund = brk ? _breakingHeroText(s) : '';
  return (brk ? '<div class="nf-brk-hof">' : '') + `<div class="nf-card nf-s-badge nf-ehrung nf-ehrung-kp${gold ? ' nf-ehrung-zr zr-' + d.periode : ''} nfc-badge${brk ? ' nf-brk' : ''}${isRead ? ' read' : ''}" data-sid="${esc(s.id)}">
    ${_newsMotiv('badge', s)}
    ${brk ? `<div class="nf-brk-band"><span class="nf-brk-punkt"></span>BREAKING<span class="nf-brk-n">${esc(art[2])}</span>`
      // Nur die Uhrzeit: mit Datum und dem Namen der Ehrung brach sie bei
      // 360 px in eine zweite Zeile; der Tag steht im Kopf des Feeds.
      + `<span class="nf-brk-zeit">${esc(_newsUhrzeit(s.when))}</span></div>` : ''}
    <div class="nf-top"><span class="nf-rub"><i>${svgI(art[0])}</i><b>${art[1]}</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div>${zr ? `<div class="eh-zr"><span class="eh-zr-k">${esc(zr.vor)}</span> <span class="eh-zr-t">${esc(zr.wann)}</span></div>` : ''}</div>
      <span class="nf-chev">${svgI('chevron')}</span></div>
    <div class="eh-kp">${vorn.map(kopf).join('')}${rest ? `<span class="eh-kp-s eh-kp-rest"><i class="num">+${rest}</i><small>weitere</small></span>` : ''}</div>
    ${klassen.length ? `<div class="eh-kp-k"><div class="eh-kp-l">${klassen.map(z => `<span class="eh-k ${z.id}"><i></i><b class="num">${z.n}</b> ${esc(z.wort)}</span>`).join('')}</div>`
      + `<div class="eh-kp-b">${klassen.map(z => `<i class="${z.id}" style="flex-grow:${z.p}"></i>`).join('')}</div></div>` : ''}
    ${g && pm[g.pid] ? _spGegenHtml(g) : ''}
    ${grund ? `<div class="nf-brk-sub">${esc(grund)}</div>` : ''}${fadenHtml || ''}</div>` + (brk ? '</div>' : '');
}

// Wer an einem Tag am meisten Elo abgab, als Zeile auf der Karte, die den
// Tag zusammenfasst: auf dem Spieler des Tages und, ohne ihn, auf der
// Ehrung des Tages — dieselbe Zeile [§C27].
const _spGegenHtml = g => `<div class="nf-gegen">${_spChip(g.pid)}<span><b>${esc(_spName(g.pid))}</b> gibt am meisten ab</span>`
  + `<b class="num r">${_spVz(Number(g.delta) || 0)} Elo</b></div>`;

// ── Unter dem Spieler des Tages: alles, was der Tag vergab ─────────────
// Je Geehrtem eine Zeile: Gesicht, Name, darunter die seltenen und
// legendären Auszeichnungen mit Namen und die gewöhnlichen als Zahl, rechts
// ihre Zeichenkacheln in der Farbe ihrer Klasse (die gewöhnlichen als eine
// mit ihrer Zahl) und das Prestige daraus [§C25]. Mit allen Auszeichnungen
// des Tages stand je gewöhnlicher ein Name und eine Kachel da, und eine
// Zeile reichte über die Karte. Mehr als fünf Geehrte: die vorderen vier,
// der Rest als Zahl, nie „+1" [§C33]. Kein zweites Säulenbild: die Karte
// zeigt den Tag schon als Bahn. Das Blatt zeigt statt dieser Zeilen die
// Kästen der Ehrung (`_ehrungBloeckeHtml`).
function _ehrungTagHtml(sp){
  const pm = pmap();
  const l = (Array.isArray(sp) ? sp : []).filter(x => x && pm[x.pid] && x.summe > 0);
  if(!l.length) return '';
  const summe = l.reduce((n, x) => n + x.summe, 0);
  const vorn = l.length > EH_KOMPAKT ? l.slice(0, EH_KOMPAKT - 1) : l, rest = l.length - vorn.length;
  const zeile = x => {
    const gross = x.posten.filter(q => q.klasse !== 'common'), klein = x.posten.filter(q => q.klasse === 'common');
    const nKlein = klein.reduce((n, q) => n + q.mal, 0);
    const text = gross.map(q => q.name + (q.mal > 1 ? ' ×' + q.mal : ''))
      .concat(nKlein ? [nKlein === 1 ? klein[0].name : nKlein + ' gewöhnliche'] : []).join(' · ');
    return `<div class="nf-eht-z">${_spChip(x.pid)}`
      + `<span class="nf-eht-t"><b>${esc(_spName(x.pid))}</b><small>${esc(text)}</small></span>`
      + `<span class="nf-eht-a">${gross.map(q => zkHtml(q.ic, 'k', _ehrungTon(q.klasse))).join('')}`
      + (nKlein ? `<span class="nf-eht-g">${zkHtml(klein[0].ic, 'k', 'gruen')}${nKlein > 1 ? `<i class="num">${nKlein}</i>` : ''}</span>` : '')
      + `</span><b class="num">+${_ehZahl(x.summe)}</b></div>`;
  };
  return `<div class="nf-eht"><div class="nf-eht-k"><i>${svgI('medal')}</i>`
    + `<span>Ehrung des Tages</span><b class="num">+${_ehZahl(summe)}</b></div>`
    + vorn.map(zeile).join('')
    + (rest ? `<div class="nf-eht-r">und ${rest} weitere</div>` : '')
    + `</div>`;
}

// ── Das Blatt ───────────────────────────────────────────────────────
// Oben dieselben Säulen groß, mit Namen. Darunter die Summe der Runde und,
// was jede Klasse dazu beitrug, als geteilter Balken; dann je Spieler jede
// Auszeichnung mit dem wievielten Mal und ihrem Wert. Unter jeder ein
// Strich, wie viel vom vollen Wert sie beim wievielten Mal noch bringt: das
// erklärte vorher nur ein Satz am Ende, gesehen hat es niemand.
//
// Seltene und legendäre stehen als eigene Zeile, die gewöhnlichen als
// Kacheln in zwei Spalten. Je eine Zeile für jede machte das Blatt einer
// Runde mit 35 Auszeichnungen fünf Bildschirme lang, und die Pflichterfüller
// und Zittersiege standen so groß da wie die „Nerven aus Stahl".
function _ndEhrungBlatt(s){
  const d = s.dataRef || {};
  const sp = Array.isArray(d.spieler) ? d.spieler : [];
  const pm = pmap();
  if(!sp.some(x => pm[x.pid])) return null;
  const kopf = `<div class="nd-buehne nd-eh">${_ehrungSaeulen(sp, true)}</div>`;
  const klassen = _ehrungKlassen(sp);
  const summe = klassen.reduce((n, z) => n + z.p, 0);
  const anteil = klassen.length ? `<div class="eh-anteil">`
    + `<div class="eh-anteil-k"><b class="num">+${_ehZahl(summe)}</b><span>Prestige für die Laufbahn</span></div>`
    + `<div class="eh-anteil-b">${klassen.map(z => `<i class="${z.id}" style="flex-grow:${z.p}"></i>`).join('')}</div>`
    + `<div class="eh-anteil-l">${klassen.map(_ehrungKlasseHtml).join('')}</div></div>` : '';
  const zeit = _ehrungZeitraum(d);
  // Ein Datum trägt seinen Punkt schon: „Geholt am 22.10.." stand doppelt.
  // Ohne Spieler des Tages trägt die Ehrung des Tages, wer am meisten abgab.
  const g = d.gegenstueck;
  const gegen = g && pm[g.pid] ? `<div class="nd-section">Der härteste Tag</div>${_spGegenHtml(g)}` : '';
  return {kopf, mitte: anteil + (zeit ? `<div class="nw-hinweis eh-zeit">${esc(zeit.vor + ' ' + zeit.wann)}${/\.$/.test(zeit.wann) ? '' : '.'}</div>` : '')
    + `<div class="nd-section">Wer was geholt hat</div>${_ehrungBloeckeHtml(sp)}` + gegen
    + `<div class="nw-hinweis">Der Strich unter jeder Auszeichnung zeigt, wie viel ihres vollen Werts sie diesmal brachte. `
    + `Ab dem dritten Mal bringt sie etwas weniger.</div>`};
}
// Je Spieler sein Kasten, im Blatt einer Ehrung und unter dem Spieler des
// Tages derselbe [§C27].
function _ehrungBloeckeHtml(sp){
  const pm = pmap();
  const mal = q => q.mal === 1 ? `${q.bis}. Mal` : `${q.bis - q.mal + 1}.–${q.bis}. Mal`;
  // Der volle Wert ist, was dieselbe Auszeichnung beim ersten Mal bringt,
  // so oft genommen, wie sie diesmal kam.
  const voll = q => auszeichnungsTeilwert(q.id, 1) * q.mal;
  const rest = q => { const v = voll(q); return v > 0 ? Math.min(1, q.p / v) : 1; };
  const strich = q => `<span class="eh-q-m" role="img" aria-label="${Math.round(rest(q) * 100)} % des vollen Werts">`
    + `<i style="width:${(rest(q) * 100).toFixed(1)}%"></i></span>`;
  let gold = 0;
  // Jede Zeile und jede Kachel öffnet ihre Auszeichnung für diesen Spieler
  // (`_bpBinden`): das wievielte Mal und den Wert erklärt erst sie.
  const bp = (q, pid) => ` data-bp="${esc(q.id)}" data-bp-pid="${esc(pid)}"`;
  // Oben die Zeichenkachel und der Wert, darunter der Name über die ganze
  // Breite: neben Zeichen und Wert brach „Pflichterfüller" mitten im Wort.
  const kachel = (q, pid) => `<div class="eh-g-t ${esc(q.klasse)}"${bp(q, pid)}>`
    + `<span class="eh-g-o">${_ehrungKachel(q, () => gold++)}<em class="num">+${_ehZahl(q.p)}</em></span>`
    + `<b>${esc(q.name)}</b><small>${esc(mal(q))}</small>${strich(q)}</div>`;
  // Jede Auszeichnung ist dieselbe Kachel, zwei je Zeile, die seltensten
  // zuerst (`posten` ist so geordnet); die Klasse sagt die Farbe [§C25].
  // Eine seltene und eine legendäre standen vorher als eigene Zeile über
  // die ganze Breite, mit „Selten · 1. Mal" und „+25 von 25": dieselbe
  // Angabe in einer anderen Form, und „von 25" wiederholte die Zahl daneben.
  return (Array.isArray(sp) ? sp : []).filter(x => x && pm[x.pid]).map((x, i) => {
    const posten = x.posten || [];
    return `<div class="eh-p" style="--i:${i}">
      <div class="eh-p-k" data-pid="${esc(x.pid)}" style="cursor:pointer">${rcpAvHtml(x.pid, 30, {})}
        <b>${esc(pm[x.pid].name)}</b><em class="num">+${_ehZahl(x.summe)}</em></div>
      ${posten.length ? `<div class="eh-g">${posten.map(q => kachel(q, x.pid)).join('')}</div>` : ''}
    </div>`;
  }).join('');
}
