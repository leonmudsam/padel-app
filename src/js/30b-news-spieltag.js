// ─── §11.6c — Die Karten „Am Spieltag" [§C33] ────────────────────────
// 55 der 73 Karten im Vierzehn-Tage-Fenster sind Partie-Karten, und jede
// begann mit demselben Ergebnisband — vier Wappen, der Stand, zwei Namen.
// Der Fuß wechselte schon nach dem Anlass, aber er war eine Zeile unter
// einem Kopf, der immer gleich aussah. Jetzt folgt auch der KOPF dem Anlass,
// und jeder Anlass zeigt eine Zahl, die es auf der Karte vorher nicht gab:
//
//   gewöhnliche Partie   das Spielfeld: wer wo stand, Elo je Spieler
//   Ein-Tor-Krimi        die Anzeigetafel und die Bilanz in engen Partien
//   klarer Sieg          wie oft die Liga so deutlich gespielt hat
//   Außenseitersieg      die Wippe: das Elo-Gewicht beider Teams
//   Spitzenwechsel,      die Monatstabelle vor und nach der Partie
//   Rangsprung
//   Serie                der Lauf gegen den eigenen Bestwert und die Liga
//   Serienbruch          der gerissene Lauf und wer ihn beendet hat
//   Teamserie            der Lauf des Duos und seine Bilanz als Ring
//   Wende                die Elo-Kurve der letzten zwölf Partien
//   Rivalität            jede Begegnung der beiden als Balken
//   seltene Auszeichnung die Medaille und wer sie in der Liga trägt
//   Premiere             der erste gemeinsame Sieg eines Duos und der Versuch
//   Rollentausch         ein Sieg auf der ungewohnten Seite und ihr Anteil
//   Spieler des Tages    die Tagesbahn und die Elo über den Tag
//   dieselben Vier       eine Karte für die ganze Runde
//
// JEDES BAUTEIL HAT ZWEI HÄLFTEN: `…Daten` rechnet aus den Partien, `…Bild`
// zeichnet nur, was es bekommt. Die Liga wächst — aus 466 Partien werden
// 4 660 und 46 600, aus „Leo" wird „Maximilian-Alexander" —, und eine
// Zeichnung, die mit den Zahlen von heute passt, läuft mit denen von morgen
// über. Weil das Bild nur Daten nimmt, zeichnet `tests/blatt` jedes Bauteil
// auch mit Grenzwerten und misst, dass nichts übereinanderliegt und nichts
// abgeschnitten wird.
//
// NICHTS WIRD GEKÜRZT ODER GESCHRUMPFT. Ein „…" versteckte, wer gemeint ist,
// und ein Name, der kleiner wird, damit er in eine Spalte passt, sah neben
// seinen Nachbarn falsch aus. Ein Name steht deshalb in der Grafik nur, wo
// sie Platz für ihn hat — auf dem Spielfeld unter seinem Wappen, in der
// Tabelle an seiner Linie —, und ob er passt, entscheidet eine feste Regel
// (`_spPasst`: kein Wort länger, als die Spalte Zeichen fasst), keine
// Messung. Passt er nicht, oder ist die Grafik eng wie die Wippe, steht er
// in einer TEXTSTELLE darunter (`.sp-lg`), ein Name je Zeile, die wie ein
// Satz umbricht.
//
// JEDE RECHNUNG LÄUFT EINMAL JE DATENSTAND (`_spBasis`, eine WeakMap an
// `matches` wie `matchesOfPlayer` [§3 Caching]): die Partien in
// Spielreihenfolge, die Ergebnisverteilung als Präfixsumme, der Serienstand
// vor jeder Partie und die Runden. Jede Karte liest daraus, statt die ganze
// Liga noch einmal abzulaufen — bei 46 600 Partien und sechzig Karten wären
// das sonst 2,8 Millionen Schritte bei jedem Öffnen des Feeds.

// Eine Zahl mit Tausenderpunkt: aus 21:27 wird mit den Jahren 2.100:2.700.
// Einmal gebaut, wie `datumFmt`.
const _SP_ZAHL = new Intl.NumberFormat('de-DE');
function _spZahl(n){ return _SP_ZAHL.format(Math.abs(Math.round(Number(n) || 0))); }
function _spVz(v){
  if(v == null) return '';
  return (v > 0 ? '+' : v < 0 ? '−' : '±') + _spZahl(v);
}
function _spName(id){ const p = pmap()[id]; return (p && p.name) || '?'; }
// Ein Name im Satz einer Textstelle, fett wie im Kartentext [§C33].
function _spNb(id){ return `<b>${esc(_spName(id))}</b>`; }
function _spUnd(ids){
  return ids.length > 1
    ? ids.slice(0, -1).map(_spNb).join(', ') + ' und ' + _spNb(ids[ids.length - 1])
    : _spNb(ids[0]);
}
// Untereinander statt mit „und": jeder Name eine eigene Zeile.
function _spStapel(ids){ return ids.map(id => `<span>${_spNb(id)}</span>`).join(''); }
function _spUnter(html){ return `<div class="sp-lg">${html}</div>`; }
// Passt ein Name in eine Spalte, die n Zeichen fasst? Umbrechen darf er an
// Leerzeichen und Bindestrich, also zählt das längste Wort. Gerechnet für
// das schmalste Telefon (320 px), damit es auf jedem passt.
function _spPasst(ids, n, ganz){
  return ids.every(id => {
    const t = String(_spName(id));
    return ganz ? t.length <= n : t.split(/[\s-]+/).every(w => w.length <= n);
  });
}
function _spChip(id){ const p = pmap()[id]; return p ? avHtml(p, '', {}) : ''; }
function _spChips(ids){ return `<span class="sp-chips">${ids.map(_spChip).join('')}</span>`; }
function _spWappen(id, px){ const p = pmap()[id]; return p ? avHtml(p, '', {ins:true, px:px || 48, feuer:0}) : ''; }
function _spSeite(m, id){ return (m.a1 === id || m.a2 === id) ? 'A' : 'B'; }
function _spGew(m, id){ return _spSeite(m, id) === m.winner; }
function _spTeam(m, s){ return s === 'A' ? [m.a1, m.a2] : [m.b1, m.b2]; }
function _spSieger(m){ return _spTeam(m, m.winner); }
function _spVerlierer(m){ return _spTeam(m, m.winner === 'A' ? 'B' : 'A'); }
// Der Stand einer Partie: Satz für Satz in Games, aus Sicht von A, der
// Gewinner jedes Satzes hell [§1.3]. Ohne Partie (`d.mm`) die beiden Zahlen,
// wie sie sind — etwa die Siege zweier Duos.
function _spStand(d){
  if(d.mm && Array.isArray(d.mm.sets) && d.mm.sets.length){
    const p = partie(d.mm);
    const satz = s => `<em class="${s.a > s.b ? 'w' : ''}">${s.a}</em><i>:</i><em class="${s.b > s.a ? 'w' : ''}">${s.b}</em>`;
    if(p.saetze.length === 1) return satz(p.saetze[0]);
    return `<span class="sp-saetze n${p.saetze.length}">${p.saetze.map(s => `<span class="sp-satz${s.art === 'open' ? ' offen' : ''}">${satz(s)}</span>`).join('')}</span>`;
  }
  return `<em class="${d.aw ? 'w' : ''}">${d.sa}</em><i>:</i><em class="${d.aw ? '' : 'w'}">${d.sb}</em>`;
}

// ── Ein Durchlauf je Datenstand ──────────────────────────────────────
// Eine Runde: ein Block von Partien ohne eine Pause über dreißig Minuten
// (`RUNDE_PAUSE_MS`), in dem nur dieselben vier gespielt haben, und das
// mindestens dreimal [§C33]. Spielt im Block ein Fünfter, ist es keine
// Runde; zwei Partien sind ein Rückspiel und keine Runde. Gemessen an den
// 466 Partien der Liga liegen die Abstände innerhalb einer Runde bei 11
// Minuten im Median und unter 17 Minuten in neun von zehn Fällen; so
// ergeben sich 29 Runden aus 115 Partien.
const RUNDE_PAUSE_MS = 30 * 60 * 1000;
// Drei Partien und nicht zwei: zwei sind ein Rückspiel. Die Zahl steht an
// einer Stelle, weil sie an zwei gefragt wird — beim Bilden der Runden und
// beim Bauen der Story —, und eine Grenze, die zweimal blank dasteht, ändert
// man einmal und hat dann zwei.
const RUNDE_MIN = 3;
const _spBasisMemo = new WeakMap();
function _spBasis(){
  let b = _spBasisMemo.get(matches);
  if(b) return b;
  const chrono = (matches || []).slice().sort((a, b) => mts(a) - mts(b));
  const idx = new Map(chrono.map((m, i) => [m.id, i]));
  // kum[d][i]: Partien mit d Toren Abstand unter den ersten i der Liga.
  const kum = Array.from({length:11}, () => new Int32Array(chrono.length + 1));
  const lauf = {}, best = {}, vor = new Map();
  let liga = 0, ligaWer = null;
  const bloecke = [];
  let r = null;
  chrono.forEach((m, i) => {
    const d = Math.min(10, Math.abs(m.games_a - m.games_b));
    for(let k = 0; k < 11; k++) kum[k][i + 1] = kum[k][i] + (k === d ? 1 : 0);
    const ids = [m.a1, m.a2, m.b1, m.b2];
    vor.set(m.id, {best:Object.fromEntries(ids.map(id => [id, best[id] || 0])), liga, ligaWer});
    ids.forEach(id => {
      lauf[id] = _spGew(m, id) ? (lauf[id] || 0) + 1 : 0;
      if(lauf[id] > (best[id] || 0)) best[id] = lauf[id];
      if(lauf[id] > liga){ liga = lauf[id]; ligaWer = id; }
    });
    // Ein Block endet mit der ersten Pause über dreißig Minuten.
    const set = ids.slice().sort().join(',');
    const t = mts(m);
    if(r && t - r.t <= RUNDE_PAUSE_MS){
      r.ids.push(m.id); r.t = t; if(r.set !== set) r.set = null;
    } else {
      r = {set, t, ids:[m.id]};
      bloecke.push(r);
    }
  });
  const runden = bloecke.filter(x => x.set && x.ids.length >= RUNDE_MIN);
  b = {chrono, idx, kum, vor, runden, byId:new Map(chrono.map(m => [m.id, m]))};
  _spBasisMemo.set(matches, b);
  return b;
}
function _spMatch(id){ return _spBasis().byId.get(id); }
// Die eigenen Partien bis einschließlich `bis`.
function _spEigene(pid, bis){
  const l = matchesOfPlayer(pid, matches), i = l.indexOf(bis);
  return i < 0 ? l : l.slice(0, i + 1);
}
// Die Siegchance der Sieger aus der Elo-Bahn, wie im Blatt der Partie.
function _spChance(m){
  const h = getHistoryByMatchId().get(m.id);
  const e = h && h.expA != null ? h.expA : m.exp_a;
  return e == null ? null : (m.winner === 'A' ? e : 1 - e);
}

// ── Der Anlass, in fester Rangfolge: das erste, was zutrifft ─────────
// Was die Schlagzeile als Anlass nennt (Rivalitätsmarke, Auszeichnung),
// steht vor dem, was nur aus den Partien abgeleitet ist (Wende,
// Rangsprung): „Auszeichnung in einer Partie für …" stand sonst über dem
// Bild einer Wende, von der die Karte gar nicht erzählt. Eine seltene oder
// legendäre Auszeichnung steht vor allem außer der Tabellenspitze: die
// Schlagzeile nennt sie zuerst.
//
// DIE MEDAILLE GEHÖRT DEM SELTENEN. Sie stand auch für jede gewöhnliche
// Auszeichnung und jede runde Marke, und gemessen trug damit jede dritte
// Partie-Karte eines Spieltags dieselbe Medaille — auf einem 10:9 der
// „Zittersieg", obwohl die Anzeigetafel genau das zeigt. Eine gewöhnliche
// Auszeichnung steht als Zeile im Sammelband; und was eine Auszeichnung nur
// als Ergebnis erzählt (`SP_ERGEBNIS_BADGE`, dieselbe Liste wie
// `BADGE_DECKT`), zeigt das Bild des Ergebnisses.
//
// DER RANGSPRUNG BRAUCHT EINE TABELLE. Am Monatsanfang springt jeder Sieger
// zwei Plätze, weil die Tabelle aus drei Leuten besteht — gemessen trug am
// ersten Spieltag eines Monats jede zweite Karte die Tabelle. Er zählt erst,
// wenn die Rangliste belastbar ist (`_storyRangFrei`), wie der Spitzenwechsel.
const SP_ERGEBNIS_BADGE = new Set(['perfect_win', 'upset_king', 'krimi', 'nerves_of_steel', 'nail_biter']);
function _spAnlass(s){
  const d = s.dataRef || {};
  const m = d.matchId ? _spMatch(d.matchId) : null;
  if(!m) return {key:''};
  const fakten = _newsSpielFakten(s);
  const f = t => fakten.find(x => x.type === t);
  const c = _spChance(m);
  let x;
  if((x = f('lead_change')) && x.newLeader) return {key:'spitze', m, x};
  if((x = fakten.find(y => y.type === 'badge_unlocked' && (y.rarity === 'rare' || y.rarity === 'legendary')
      && (!SP_ERGEBNIS_BADGE.has(y.badgeId) || (y.rang > 1 && _badgeTakt('rare', y.rang))))) && x.badgeId)
    return {key:'medaille', m, x:{pid:x.playerId, badgeId:x.badgeId, rang:x.rang}};
  if((x = f('streak_killer')) && x.victimPid) return {key:'riss', m, x};
  if((x = f('win_streak')) && x.streak) return {key:'serie', m, x};
  if((x = f('team_streak')) && x.streak && x.a && x.b) return {key:'teamserie', m, x};
  if(c != null && c < CHANCE_UPSET) return {key:'aussenseiter', m, c};
  if((x = f('rivalry_milestone')) && x.a && x.b) return {key:'duell', m, x};
  return _spAnlassDaten(m, c);
}
// Der Teil des Anlasses, der allein aus den Partien kommt. Der Generator
// fragt ihn, um zu wissen, ob eine Partie gewöhnlich ist und eine Form
// bekommt [§C33] — die übrigen Anlässe kommen aus den Meldungen derselben
// Partie und machen sie ohnehin zu einem Bündel mit eigener Schlagzeile.
function _spAnlassDaten(m, c){
  if(c === undefined) c = _spChance(m);
  const diff = Math.abs(m.games_a - m.games_b);
  let x;
  if((x = _spPremiereDaten(m))) return {key:'premiere', m, x};
  const wende = _spSieger(m).map(pid => ({pid, n:_newsPleitenVor(pid, m)}))
    .filter(w => w.n >= 3).sort((a, b) => b.n - a.n)[0];
  if(wende) return {key:'wende', m, x:wende};
  let frei = false;
  try { frei = _storyRangFrei(seasonOf(m.created_at).id, mts(m)).frei; } catch(e){}
  const sprung = frei ? _spSieger(m).map(pid => ({pid, r:_newsRankChange(pid, m.id)}))
    .filter(w => w.r && w.r.pre - w.r.post >= 2) : [];
  if(sprung.length) return {key:'rang', m, x:sprung};
  if((x = _spRolleDaten(m))) return {key:'rolle', m, x};
  if(partie(m).entscheidTb) return {key:'krimi', m, c};
  if(partie(m).deutlich) return {key:'deutlich', m};
  return {key:'feld', m, c};
}
const SP_ANLASS = {
  spitze:      {name:'Spitzenwechsel',  kurz:'Spitze',      ic:'spitzenwechsel'},
  riss:        {name:'Serienbruch',     kurz:'Bruch',       ic:'flameBreak'},
  serie:       {name:'Serie',           kurz:'Serie',       ic:'flame'},
  teamserie:   {name:'Teamserie',       kurz:'Duo-Serie',   ic:'unstoppable'},
  aussenseiter:{name:'Außenseitersieg', kurz:'Außenseiter', ic:'underdog'},
  wende:       {name:'Wende',           kurz:'Wende',       ic:'comeback'},
  duell:       {name:'Rivalität',       kurz:'Rivalität',   ic:'crossedSwords'},
  medaille:    {name:'Auszeichnung',    kurz:'Marke',       ic:'abzeichen'},
  rang:        {name:'Rangsprung',      kurz:'Sprung',      ic:'stepsUp'},
  premiere:    {name:'Premiere',        kurz:'Premiere',    ic:'premiere'},
  rolle:       {name:'Rollentausch',    kurz:'Rolle',       ic:'posSwap'},
  krimi:       {name:'Tiebreak-Krimi',  kurz:'Tiebreak',    ic:'pinch'},
  deutlich:    {name:'Klarer Sieg',     kurz:'Klar',        ic:'thumbsUp'},
  feld:        {name:'Ergebnis',        kurz:'',            ic:'court'}
};

// ── Die Ergebniszeile: das Band in einer Zeile ───────────────────────
// Wo die Grafik darunter die Aussage trägt, braucht der Kopf nur den Stand
// und die vier Gesichter als Chips. Die Namen stehen unter ihren Gesichtern,
// je Seite eine halbe Karte breit, und brechen wie ein Satz um.
function _spZeileDaten(m){
  return {A:_spTeam(m, 'A'), B:_spTeam(m, 'B'), sa:m.games_a, sb:m.games_b, aw:m.winner === 'A', mm:m};
}
function _spZeileBild(d){
  const s = (ids, w, re) => `<span class="sp-z-s${w ? ' w' : ''}${re ? ' re' : ''}">${_spChips(ids)}`
    + (d.tz ? '' : `<span class="sp-z-n">${_spStapel(ids)}</span>`) + `</span>`;
  return `<div class="sp-zeile">${s(d.A, d.aw)}<b class="sp-z-sc num">${_spStand(d)}</b>${s(d.B, !d.aw, true)}</div>`;
}
// Das Band des klaren Siegs: dieselben Wappen wie das Ergebnisband der App,
// die Namen aber je einer in seiner Zeile — „Johannes & Jannik" in einer
// Zeile wurde gekürzt.
function _spBandBild(d){
  const s = (ids, w, re) => `<div class="sp-band-s${w ? ' w' : ''}${re ? ' re' : ''}"><span class="sp-band-avs">`
    + `${ids.map(id => _spWappen(id, 48)).join('')}</span>${d.tz ? '' : `<span class="sp-z-n">${_spStapel(ids)}</span>`}</div>`;
  // Die Mitte zeigt den Abstand, denn um ihn geht es: der Stand groß, der
  // Sieger hell, darunter je Game des Siegers ein Feld — so viele, wie die
  // Gegenseite auch geholt hat, leise, und der Abstand hell.
  const hoch = Math.max(d.sa, d.sb), tief = Math.min(d.sa, d.sb);
  const felder = hoch <= 20 ? Array.from({length:hoch}, (_, i) => `<i class="${i < tief ? '' : 'a'}" style="--i:${i}"></i>`).join('') : '';
  return `<div class="sp-band">${s(d.A, d.aw)}<div class="sp-band-m"><div class="sp-band-sc num">${_spStand(d)}</div>`
    + (felder ? `<span class="sp-band-g">${felder}</span>` : '')
    + `<span class="sp-band-d num">+${_spZahl(hoch - tief)}</span></div>${s(d.B, !d.aw, true)}</div>`;
}

// ── Der Court: die gewöhnliche Partie ────────────────────────────────
// Die Karte zeigt, wer wo stand: der Platz von oben, links Team A, rechts
// Team B, das Netz dazwischen. Je Team der Revés außen an der Glaswand und
// der Drive am Netz — so liest sich eine Zeile von links nach rechts wie
// der Platz: Revés A, Drive A | Netz | Drive B, Revés B. Unter jedem die Elo
// der Partie.
function _spFeldDaten(a){
  const m = a.m;
  const seite = id => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_side'];
  const rev = s => _spTeam(m, s).find(id => seite(id) === 'reves') || _spTeam(m, s)[0];
  const drv = s => _spTeam(m, s).find(id => id !== rev(s));
  const slot = (id, r) => ({id, r, w:_spGew(m, id), d:_newsEloDelta(id, m.id)});
  return {slots:[slot(rev('A'), 'Revés'), slot(drv('A'), 'Drive'), slot(drv('B'), 'Drive'), slot(rev('B'), 'Revés')],
    sa:m.games_a, sb:m.games_b, aw:m.winner === 'A', c:a.c, mm:m};
}
// Das Feld ist ein Fluss und keine Fläche mit festen Plätzen: der Stand
// oben, darunter vier Spalten, eine je Spieler, und jede wächst mit ihrem
// Namen. Glaswände, Netz und Aufschlaglinien liegen dahinter und tragen
// keine Schrift. Passen die Namen nicht unter ihre Stange, steht die Aufstellung
// darunter in zwei Spalten, eine je Team.
function _spFeldBild(d){
  const innen = !d.tz && _spPasst(d.slots.map(s => s.id), 9);
  const aufst = w => d.slots.filter(s => s.w === w).sort((a, b) => (a.r === 'Revés') - (b.r === 'Revés'))
    .map(s => `<span><i>${s.r}</i>${_spNb(s.id)}</span>`).join('');
  return `<div class="sp-feld">
    <span class="sp-f-wand l"></span><span class="sp-f-wand r"></span><span class="sp-f-netz"></span>
    ${[22, 78].map(x => `<i class="sp-f-linie" style="left:${x}%"></i>`).join('')}<i class="sp-f-mittel"></i>
    <div class="sp-f-sc"><b class="num">${_spStand(d)}</b>${d.c != null ? `<span>${Math.round(d.c * 100)} % Chance</span>` : ''}</div>
    <div class="sp-f-reihe">${d.slots.map((s, i) => `<div class="sp-f-sp${s.w ? ' w' : ''}" style="--i:${i}">`
      + `<span class="sp-f-rolle">${s.r}</span>${_spWappen(s.id, 48)}`
      + (innen ? `<span class="sp-f-n">${esc(_spName(s.id))}</span>` : '')
      + (d.ohneElo ? '' : `<em class="${(s.d || 0) >= 0 ? 'g' : 'r'} num">${_spVz(s.d)}</em>`) + `</div>`).join('')}</div>
  </div>${innen || d.tz ? '' : `<div class="sp-aufst"><div class="w">${aufst(true)}</div><div class="re">${aufst(false)}</div></div>`}`;
}

// ── Die Anzeigetafel: der Tiebreak-Krimi ─────────────────────────────
function _spTafelDaten(a){
  return {A:_spTeam(a.m, 'A'), B:_spTeam(a.m, 'B'), sa:a.m.games_a, sb:a.m.games_b, aw:a.m.winner === 'A', c:a.c, mm:a.m};
}
function _spTafelBild(d){
  const t = (ids, sc, w) => `<div class="sp-at-t${w ? ' w' : ''}"><b class="num">${sc}</b>${_spChips(ids)}</div>`;
  const pa = d.c == null ? null : Math.round((d.aw ? d.c : 1 - d.c) * 100);
  // Groß die Sätze; bei einem einzigen Satz dessen Games (7:6).
  const p = d.mm ? partie(d.mm) : null;
  const ein = !p || p.saetze.length === 1;
  const sa = !p ? d.sa : ein ? p.saetze[0].a : p.setsA, sb = !p ? d.sb : ein ? p.saetze[0].b : p.setsB;
  return `<div class="sp-at"><div class="sp-at-g">${t(d.A, sa, d.aw)}<div class="sp-at-m"><span>${p && p.mtb ? 'MATCH-TIEBREAK' : 'TIEBREAK'}</span>`
    + (pa != null ? `<em>${pa} : ${100 - pa}</em><i>Chance vorher</i>` : '')
    + `</div>${t(d.B, sb, !d.aw)}</div>`
    + `<div class="sp-at-n"><span class="${d.aw ? 'w' : ''}">${_spStapel(d.A)}</span><span class="re${d.aw ? '' : ' w'}">${_spStapel(d.B)}</span></div></div>`;
}
// Wer gewinnt die Tiebreak-Partien? Je Sieger die letzten acht bis zu
// dieser, und die Bilanz aller.
function _spNervenDaten(a){
  const m = a.m;
  return {zeilen:_spSieger(m).map(pid => {
    const eng = _spEigene(pid, m).filter(_spKrimi);
    const w = eng.filter(x => _spGew(x, pid)).length;
    return {id:pid, w, l:eng.length - w, zellen:eng.slice(-8).map(x => _spGew(x, pid) ? (x === m ? 'W' : 'w') : 'l')};
  })};
}
// Der Name steht über seinen Zellen und hat die ganze Zeile: neben den
// Zellen blieben ihm sechzig Pixel. Die Bilanz steht in einer Spalte so
// breit wie sie selbst; die Zellen nehmen, was übrig ist.
function _spNervenBild(d){
  const z = d.zeilen.map(r => `<div class="sp-nv-z">${_spChip(r.id)}<span class="sp-nv-m"><span class="sp-nv-n">${_spNb(r.id)}</span>`
    + `<span class="sp-nv-c">${r.zellen.map(c => `<i class="${c === 'l' ? 'l' : 'w'}${c === 'W' ? ' jetzt' : ''}"></i>`).join('')}</span></span>`
    + `<em class="num">${_spZahl(r.w)}:${_spZahl(r.l)}</em></div>`).join('');
  return `<div class="sp-nv"><div class="sp-k">Tiebreak-Sätze bis zu dieser</div>${z}</div>`;
}

// ── Die Verteilung: der klare Sieg ───────────────────────────────────
// „Zuletzt so deutlich am …" sagte, wann; nicht, wie selten. Zehn Säulen,
// eine je Abstand in Games von 1 bis 10 und mehr, gezählt über die Liga bis
// zu dieser Partie — diese hell, die deutlicheren leiser dahinter. Gelesen aus der
// Präfixsumme: eine Karte kostet elf Zugriffe, nicht einen Lauf.
function _spVerteilungDaten(a){
  const m = a.m, b = _spBasis(), i = b.idx.get(m.id) + 1, diff = Math.min(10, Math.abs(m.games_a - m.games_b));
  const n = b.kum.map(k => k[i]);
  let so = 0;
  for(let k = diff; k <= 10; k++) so += n[k];
  let zuletzt = null;
  for(let j = i - 2; j >= 0; j--){
    const x = b.chrono[j];
    if(Math.abs(x.games_a - x.games_b) >= diff){ zuletzt = mts(x); break; }
  }
  return {n, diff, gesamt:i, so, zuletzt};
}
function _spVerteilungBild(d){
  const max = Math.max(1, ...d.n.slice(1));
  const saeulen = [];
  for(let k = 1; k <= 10; k++){
    saeulen.push(`<span class="sp-vt-s${k === d.diff ? ' jetzt' : k > d.diff ? ' mehr' : ''}" style="--i:${k}">`
      + `<i style="height:${(d.n[k] / max * 100).toFixed(0)}%"></i><em>${k}${k === 10 ? '+' : ''}</em></span>`);
  }
  return `<div class="sp-vt"><div class="sp-k">Alle ${_spZahl(d.gesamt)} Sätze nach Abstand in Games</div>
    <div class="sp-vt-g">${saeulen.join('')}</div>`
    // Auf der Karte steht der Satz als Zeile über dem Fuß („96 von 626
    // Partien der Liga endeten so deutlich"), darunter stand er ein zweites Mal.
    + (d.nurAnlass ? '' : `<div class="sp-vt-f"><b class="num">${_spZahl(d.so)}</b> von ${_spZahl(d.gesamt)} Sätzen so deutlich oder deutlicher`
      + `${d.zuletzt ? `, zuletzt am ${datumFmt(d.zuletzt, 'tmx')}` : ''}</div>`) + `</div>`;
}

// ── Die Wippe: der Außenseitersieg ───────────────────────────────────
// Das Gewicht ist die Elo vor dem ersten Aufschlag. Der Favorit sitzt unten, wie es
// die Rechnung erwartet hat — gewonnen hat die leichte Seite. Die Schilder
// stehen unter der Bahn in zwei Spalten und nicht an den Enden des Balkens:
// dort liefen lange Namen über die Kante und in die Zahl.
function _spWippeDaten(a){
  const m = a.m, h = getHistoryByMatchId().get(m.id) || {};
  const elo = ids => Math.round(ids.reduce((s, id) => s + ((h.eloBefore || {})[id] || 0), 0) / ids.length);
  return {fav:_spVerlierer(m), dog:_spSieger(m), eloFav:elo(_spVerlierer(m)), eloDog:elo(_spSieger(m)),
    pct:Math.max(1, Math.round(a.c * 100)), sa:m.games_a, sb:m.games_b, aw:m.winner === 'A', mm:m};
}
function _spWippeBild(d){
  const gap = Math.max(0, d.eloFav - d.eloDog);
  const th = Math.min(13, 5 + gap / 25) * Math.PI / 180;
  const px = 150, py = 86, r = 104;
  // Die Sieger waren leichter und sitzen oben, auf ihrer Seite des Tischs:
  // Team A links, Team B rechts [§C33]. Gewann B, kippt die Wippe zur
  // anderen Seite.
  const re = d.aw === false, dx = r * Math.cos(th), dy = r * Math.sin(th);
  const lx = re ? px + dx : px - dx, ly = py - dy;
  const rx = re ? px - dx : px + dx, ry = py + dy;
  const P = (x, y) => `left:${(x / 300 * 100).toFixed(1)}%;top:${(y / 120 * 100).toFixed(1)}%`;
  const minus = v => (v < 0 ? '−' : '') + _spZahl(v);
  const schild = (ids, e, p, w) => `<div class="sp-wp-l${w ? ' w' : ''}">${d.tz ? '' : `<span class="sp-wp-n">${_spStapel(ids)}</span>`}`
    + `<span class="sp-wp-z">Ø ${minus(e)} Elo · ${p} %</span></div>`;
  return `<div class="sp-wp">
    <div class="sp-wp-kopf"><b class="sp-wp-st num">${_spStand(d)}</b>
      <span class="sp-wp-gap"><b class="num">${_spZahl(gap)}</b><span>Elo Gefälle</span></span></div>
    <div class="sp-wp-bahn">
      <svg viewBox="0 0 300 120" aria-hidden="true">
        <path class="sp-wp-dr" d="M${px} ${py}L${px - 13} ${py + 24}H${px + 13}Z"/>
        <line class="sp-wp-bk" x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}"/>
        <circle class="sp-wp-ax" cx="${px}" cy="${py}" r="3.5"/>
      </svg>
      <div class="sp-wp-t w" style="${P(lx + (re ? -8 : 8), ly - 4)}">${_spChips(d.dog)}</div>
      <div class="sp-wp-t" style="${P(rx + (re ? 8 : -8), ry - 4)}">${_spChips(d.fav)}</div>
    </div>
    <div class="sp-wp-ls">${re ? schild(d.fav, d.eloFav, 100 - d.pct, false) + schild(d.dog, d.eloDog, d.pct, true)
      : schild(d.dog, d.eloDog, d.pct, true) + schild(d.fav, d.eloFav, 100 - d.pct, false)}</div>
  </div>`;
}

// ── Die Tabelle vorher und nachher: Spitzenwechsel und Rangsprung ────
// Eine Linie je Spieler von seinem Platz vor der Partie zu dem danach. Wer
// durch diese Partie steigt, ist grün, wer dadurch fällt, rot — die Richtung
// [§C25]; die übrigen bleiben Metall. Die neue Spitze trägt Gold. Höchstens
// neun Zeilen: in einer Liga mit vierzig Spielern ginge sonst die Bewegung
// zwischen Platz 31 und 33 in einer Wand aus Linien unter.
function _spTabelleDaten(a, spitze){
  const m = a.m, snap = getRankSnapshots()[m.id];
  if(!snap || !snap.preRank || !snap.postRank) return null;
  const fokus = new Set(spitze ? [a.x.newLeader, a.x.prevLeader].filter(Boolean) : a.x.map(w => w.pid));
  const dabei = new Set([m.a1, m.a2, m.b1, m.b2]);
  const fr = [...fokus].flatMap(id => [snap.preRank[id], snap.postRank[id]]).filter(Boolean);
  if(!fr.length) return null;
  const unten = Math.max(...fr), von = Math.max(1, Math.min(Math.min(...fr), unten - 8)), bis = von + 8;
  const zeilen = Object.keys(snap.postRank)
    .filter(id => snap.preRank[id] >= von && snap.preRank[id] <= bis && snap.postRank[id] >= von && snap.postRank[id] <= bis)
    .map(id => {
      const p = snap.preRank[id], q = snap.postRank[id];
      return {id, p, q, k:(fokus.has(id) || dabei.has(id)) && p !== q ? (q < p ? 'g' : 'r') : 'm'};
    });
  return {zeilen, von, bis, spitze};
}
// Die Monatstabelle als Kette: jeder Platz ein Feld, das Gesicht auf seinem
// Platz nach der Partie. Wer stieg, gleitet von seinem alten Feld herüber,
// dort bleibt ein Umriss, und ein Bogen zeigt den Sprung; wer fiel, trägt
// einen roten Rand, die neue Spitze Gold [§C25]. Vorher standen neun Zeilen
// mit Linien von „vorher" nach „danach" da, die höchste Zeichnung aller
// Füße, und wer sich nicht bewegte, nahm so viel Platz ein wie der Sprung.
// Die Kette endet am letzten besetzten Platz: in einer Liga mit fünf
// Spielern standen sonst vier leere Felder da. Die Daten sind dieselben wie
// vorher, gespeicherte Karten zeichnen also auch die Kette.
function _spTabelleBild(d){
  if(!d || !d.zeilen || !d.zeilen.length) return '';
  const bis = Math.min(d.bis, Math.max(...d.zeilen.map(z => Math.max(z.p, z.q))));
  const n = bis - d.von + 1, nach = {};
  d.zeilen.forEach(z => { nach[z.q] = z; });
  const mitte = r => (r - d.von + .5) / n * 100;
  const steiger = d.zeilen.filter(z => z.k === 'g');
  // Ein Bogen je Aufsteiger, so hoch wie der Sprung weit; ohne Punkt am
  // Ende, weil die Zeichnung in der Breite gestreckt wird und ein Kreis
  // darin zur Linse wurde.
  const boegen = steiger.map(z => { const a = mitte(z.p), c = mitte(z.q), h = Math.min(15, 6 + Math.abs(z.p - z.q) * 2.5);
    return `<path class="sp-tk-b" d="M${a.toFixed(1)} 17Q${((a + c) / 2).toFixed(1)} ${(17 - h).toFixed(1)} ${c.toFixed(1)} 17"/>`; }).join('');
  const felder = Array.from({length:n}, (_, i) => { const r = d.von + i, z = nach[r];
    const k = (z && z.k !== 'm' ? ' ' + z.k : '') + (d.spitze && r === 1 ? ' eins' : '');
    return `<span class="sp-tk-f${k}">${z ? `<i style="--d:${z.p - z.q}">${_spChip(z.id)}</i>` : '<i></i>'}`
      + `<small class="num">${_spZahl(r)}</small></span>`; }).join('');
  const geister = steiger.map(z => `<u class="sp-tk-g" style="left:${mitte(z.p).toFixed(1)}%"></u>`).join('');
  // Im Satz höchstens zwei: beim Spitzenwechsel die beiden an der Spitze,
  // sonst die größten Sprünge. Mit allen, die sich bewegt hatten, brach er
  // auf dem schmalsten Telefon in drei Zeilen um.
  const wer = (d.spitze ? d.zeilen.filter(z => z.k !== 'm' && (z.q === 1 || z.p === 1)).sort((u, v) => u.q - v.q)
    : d.zeilen.filter(z => z.k !== 'm').sort((u, v) => Math.abs(v.p - v.q) - Math.abs(u.p - u.q) || u.q - v.q)).slice(0, 2);
  const satz = wer.map(l => `${_spNb(l.id)} ${l.k === 'g' ? 'steigt' : 'fällt'} von ${_spZahl(l.p)} auf ${_spZahl(l.q)}`
    + (d.spitze && l.q === 1 ? ' und führt' : '')).join(', ');
  return `<div class="sp-fk sp-tk" style="--n:${n}"><div class="sp-k">Monatstabelle${d.von > 1 ? `, ab Platz ${_spZahl(d.von)}` : ''}</div>`
    + `<svg class="sp-tk-s" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true">${boegen}</svg>`
    + `<div class="sp-tk-r">${geister}${felder}</div></div>${satz ? _spUnter(satz + '.') : ''}`;
}

// ── Der Lauf gegen den eigenen Bestwert und die Liga: die Serie ──────
// „3 Siege nacheinander · Marke 5" sagte, wie weit es zur nächsten runden
// Zahl ist. Ob drei für diesen Spieler viel sind, sagte es nicht. Bis
// sechzehn steht eine Zelle je Sieg, darüber ein Balken auf derselben Skala.
// Die Marken stehen als Striche auf der Bahn und ihre Namen in einer Zeile
// darunter: an der Bahn selbst lagen zwei nahe Marken übereinander.
function _spSerieDaten(a){
  const v = _spBasis().vor.get(a.m.id), pid = a.x.pid;
  return {pid, laenge:a.x.streak, eig:v.best[pid] || 0, liga:v.liga, ligaWer:v.ligaWer};
}
function _spSerieBild(d){
  const max = Math.max(d.laenge, d.eig, d.liga, 1);
  const zellen = max <= 16;
  const pos = k => (k / max * 100).toFixed(2);
  const bahn = zellen
    ? Array.from({length:max}, (_, i) => `<i class="${i < d.laenge ? 'w' : ''}" style="--i:${i}"></i>`).join('')
    : `<i class="sp-sl-voll" style="width:${pos(d.laenge)}%"></i>`;
  const strich = (k, cls) => k ? `<u class="${cls}" style="left:${pos(k)}%"></u>` : '';
  const selbst = d.ligaWer === d.pid && d.liga === d.eig;
  const legende = (d.eig ? `<span class="eig">eigener Bestwert ${_spZahl(d.eig)}${selbst ? ', zugleich Liga-Rekord' : ''}</span>` : '')
    + (!selbst && d.liga ? `<span class="liga">Liga-Rekord ${_spZahl(d.liga)}${d.ligaWer ? ` von ${_spNb(d.ligaWer)}` : ''}</span>` : '');
  return `<div class="sp-sl"><div class="sp-sl-k">${_spChip(d.pid)}<em class="num">${_spZahl(d.laenge)} in Folge</em>${d.nurAnlass ? '' : `<span class="sp-sl-n">${_spNb(d.pid)}</span>`}</div>
    <div class="sp-sl-r${zellen ? '' : ' balken'}">${bahn}${strich(d.eig, 'eig')}${selbst ? '' : strich(d.liga, 'liga')}</div>
    <div class="sp-sl-ms">${legende}</div></div>`;
}

// ── Der gerissene Lauf: der Serienbruch ──────────────────────────────
// Die Serie war die Leistung des anderen, also steht sie groß da: die Zahl,
// rot durchgestrichen [§C25], daneben wer sie getragen hat und ob sie sein
// Bestwert war, und darunter derselbe Lauf wie bei einer laufenden Serie
// [§C27] — ein Feld je Sieg, am Ende das rote Feld der Partie, die ihn
// beendet hat. Es war eine Kette aus Gliedern mit einem gezackten Strich am
// Ende: eine eigene Bildsprache für dieselbe Serie, die eine Karte weiter
// als Lauf steht, und der Strich las sich als Kratzer. Bis zwanzig Felder
// einzeln, darüber ein Balken.
function _spRissDaten(a){
  const v = _spBasis().vor.get(a.m.id) || {best:{}};
  return {opfer:a.x.victimPid, laenge:a.x.streak, brecher:_spSieger(a.m), eig:v.best[a.x.victimPid] || 0};
}
function _spRissBild(d){
  const n = Math.max(1, d.laenge), einzeln = n <= 20;
  const lauf = einzeln
    ? Array.from({length:n}, (_, i) => `<i class="w" style="--i:${i}"></i>`).join('')
    : `<i class="w sp-rk-voll" style="--i:0"></i>`;
  const best = d.eig > n ? `eigener Bestwert ${_spZahl(d.eig)}` : d.eig === n ? 'der eigene Bestwert' : '';
  return `<div class="sp-rk"><div class="sp-rk-k">`
    + `<span class="sp-rk-z"><b class="num">${_spZahl(n)}</b><s></s></span>`
    + `<span class="sp-rk-t">${_spChip(d.opfer)}<span><em>Siege in Folge</em>${best ? `<small>${best}</small>` : ''}</span></span>`
    + `<span class="sp-rk-b"><small>beendet</small>${_spChips(d.brecher)}</span></div>`
    + `<div class="sp-rk-r${einzeln ? '' : ' balken'}" style="--n:${einzeln ? n : 1}">${lauf}<i class="x" style="--i:${einzeln ? n : 1}">${svgI('x')}</i></div>`
    + _spUnter(`${_spZahl(n)} Siege in Folge von ${_spNb(d.opfer)}, beendet von ${_spUnd(d.brecher)}.`) + `</div>`;
}

// ── Die Premiere: zwei, die zum ersten Mal zusammen gewinnen ─────────
// Ein Duo, das zum ersten Mal zusammen spielt und gewinnt, oder eins, das
// nach mehreren Versuchen den ersten gemeinsamen Sieg holt. Die Zahl ist der
// Versuch: wie viele gemeinsame Partien es dafür gebraucht hat, als Lauf aus
// roten Feldern und dem grünen am Ende — derselbe Lauf wie bei Serie und
// Serienbruch [§C27]. Gezählt wird erst ab dem dritten Versuch: ein Sieg im
// zweiten ist keine Geschichte.
function _spPremiereDaten(m){
  const [A, B] = _spSieger(m);
  if(!A || !B) return null;
  const zusammen = _spEigene(A, m).filter(x => x !== m && [x.a1, x.a2, x.b1, x.b2].includes(B)
    && _spSeite(x, A) === _spSeite(x, B));
  if(zusammen.some(x => _spGew(x, A))) return null;
  if(zusammen.length && zusammen.length < 2) return null;
  return {A, B, versuch:zusammen.length + 1};
}
function _spPremiereBild(d){
  const n = d.versuch, lauf = n <= 20
    ? Array.from({length:n - 1}, (_, i) => `<i class="l" style="--i:${i}"></i>`).join('') + `<i class="w" style="--i:${n - 1}"></i>`
    : `<i class="l sp-pm-voll" style="--i:0"></i><i class="w" style="--i:1"></i>`;
  const was = n === 1 ? `<b class="num">1.</b><span><em>gemeinsamer Satz</em><small>und gleich gewonnen</small></span>`
    : `<b class="num">${_spZahl(n)}.</b><span><em>Versuch</em><small>der erste gemeinsame Sieg</small></span>`;
  return `<div class="sp-pm"><div class="sp-pm-k"><span class="sp-pm-d">${_spChip(d.A)}<i>${svgI('handshake')}</i>${_spChip(d.B)}</span>`
    + `<span class="sp-pm-t">${was}</span></div>`
    + (n > 1 ? `<div class="sp-pm-r" style="--n:${n <= 20 ? n : 2}">${lauf}</div>` : '')
    + _spUnter(n === 1 ? `${_spUnd([d.A, d.B])} spielen zum ersten Mal zusammen.`
      : `${_spUnd([d.A, d.B])} gewinnen zum ersten Mal zusammen, nach ${_spZahl(n - 1)} Niederlagen zu zweit.`) + `</div>`;
}

// ── Der Rollentausch: ein Sieg auf der ungewohnten Seite ──────────────
// Wer fast immer hinten steht und vorn gewinnt, hat etwas anderes gezeigt
// als sonst. Die Zahl ist der Anteil der Rolle an der eigenen Laufbahn bis
// zu dieser Partie, gezeichnet wie der Strahl im Seitenprofil [§C27]:
// rechts (Drive) und links (Revés), und die heutige Seite trägt die Marke.
// Erst ab zehn Partien und unter einem Viertel — vorher ist keine Seite
// gewohnt.
function _spRolleDaten(m){
  let best = null;
  _spSieger(m).forEach(pid => {
    const r = m[(m.a1 === pid ? 'a1' : m.a2 === pid ? 'a2' : m.b1 === pid ? 'b1' : 'b2') + '_side'];
    const vor = _spEigene(pid, m).filter(x => x !== m);
    if(vor.length < 10) return;
    const rolle = x => x[(x.a1 === pid ? 'a1' : x.a2 === pid ? 'a2' : x.b1 === pid ? 'b1' : 'b2') + '_side'];
    const dort = vor.filter(x => rolle(x) === r);
    const anteil = dort.length / vor.length;
    if(anteil >= 0.25 || (best && best.anteil <= anteil)) return;
    best = {pid, r, anteil, dort:dort.length, alle:vor.length, w:dort.filter(x => _spGew(x, pid)).length};
  });
  return best;
}
function _spRolleBild(d){
  const sturm = d.r === 'drive' ? d.anteil : 1 - d.anteil;
  const pct = v => Math.round(v * 100);
  const name = d.r === 'drive' ? 'rechts' : 'links';
  return `<div class="sp-ro"><div class="sp-ro-k">${_spChip(d.pid)}<span><em>heute ${name}</em>`
    + `<small>${_spZahl(d.dort)} von ${_spZahl(d.alle)} Sätzen vorher dort</small></span>`
    + `<b class="num">${_spZahl(pct(d.anteil))} %</b></div>`
    + `<div class="sp-ro-s"><i class="drive${d.r === 'drive' ? ' heute' : ''}" style="width:${(sturm * 100).toFixed(1)}%"></i>`
    + `<i class="reves${d.r === 'reves' ? ' heute' : ''}"></i></div>`
    + `<div class="sp-ro-l"><span>Drive ${_spZahl(pct(sturm))} %</span><span>Revés ${_spZahl(100 - pct(sturm))} %</span></div>`
    + _spUnter(`${_spNb(d.pid)} steht sonst selten ${name} und gewinnt dort. Bilanz dort vorher ${_spZahl(d.w)}:${_spZahl(d.dort - d.w)}.`) + `</div>`;
}

// ── Das Duo: der Lauf zu zweit und die gemeinsame Bilanz als Ring ─────
// Im Ring steht die Siegquote — drei Zeichen, egal wie viele Partien es
// werden; die Bilanz selbst steht in der Textstelle darunter.
function _spDuoDaten(a){
  const m = a.m, A = a.x.a, B = a.x.b;
  const zusammen = _spEigene(A, m).filter(x => [x.a1, x.a2, x.b1, x.b2].includes(B) && _spSeite(x, A) === _spSeite(x, B));
  const w = zusammen.filter(x => _spGew(x, A)).length;
  return {A, B, laenge:a.x.streak, w, l:zusammen.length - w};
}
function _spDuoBild(d){
  const anteil = d.w / Math.max(1, d.w + d.l), U = 2 * Math.PI * 22;
  const lauf = d.laenge <= 16
    ? Array.from({length:d.laenge}, (_, i) => `<i style="--i:${i}"></i>`).join('')
    : `<i class="voll"></i>`;
  return `<div class="sp-duo"><svg viewBox="0 0 56 56" aria-hidden="true">
      <circle class="sp-duo-b" cx="28" cy="28" r="22"/>
      <circle class="sp-duo-w" cx="28" cy="28" r="22" stroke-dasharray="${(anteil * U).toFixed(1)} ${U.toFixed(1)}" transform="rotate(-90 28 28)"/>
      <text x="28" y="32" text-anchor="middle">${Math.round(anteil * 100)} %</text></svg>
    <div class="sp-duo-r"><div class="sp-duo-k">${_spChips([d.A, d.B])}<em class="num">${_spZahl(d.laenge)} in Folge</em></div>
      <div class="sp-duo-l${d.laenge > 16 ? ' balken' : ''}">${lauf}</div></div></div>`
    + _spUnter(`${d.nurAnlass ? 'Gemeinsam' : _spUnd([d.A, d.B]) + ' zusammen'}: ${_spZahl(d.w)} ${d.w === 1 ? 'Sieg' : 'Siege'}, ${_spZahl(d.l)} ${d.l === 1 ? 'Niederlage' : 'Niederlagen'}.`);
}

// ── Die Elo-Kurve: die Wende ─────────────────────────────────────────
// Die letzten zwölf Partien des Siegers als Linie, aufsummiert aus der Elo
// jeder Partie; die Pleiten davor als rote Punkte, dieser Sieg grün.
function _spKurveDaten(a){
  const m = a.m, pid = a.x.pid;
  let s = 0;
  const werte = _spEigene(pid, m).slice(-12).map(x => ({v:(s += (_newsEloDelta(pid, x.id) || 0)), w:_spGew(x, pid), jetzt:x === m}));
  return {pid, werte, n:a.x.n, d:_newsEloDelta(pid, m.id)};
}
function _spKurveBild(d){
  const pkt = [{v:0}].concat(d.werte);
  const lo = Math.min(...pkt.map(p => p.v)), hi = Math.max(...pkt.map(p => p.v));
  const X = i => 12 + i * (276 / Math.max(1, pkt.length - 1)), Y = v => 10 + (hi - v) / Math.max(1, hi - lo) * 54;
  const pfad = pkt.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('');
  const punkte = pkt.slice(1).map((p, i) => `<circle class="${p.w ? 'w' : 'l'}${p.jetzt ? ' jetzt' : ''}" cx="${X(i + 1).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="${p.jetzt ? 5 : 2.8}"/>`).join('');
  return `<div class="sp-ku"><div class="sp-ku-k">${_spChip(d.pid)}`
    + `<span class="sp-ku-s">${_spZahl(d.n)} Pleiten, dann <em class="g num">${_spVz(d.d)}</em></span></div>
    <svg viewBox="0 0 300 74" aria-hidden="true"><line class="sp-ku-0" x1="6" x2="294" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>
    <path class="sp-ku-l" pathLength="1" d="${pfad}"/>${punkte}</svg>
    ${_spUnter(`Elo von ${_spNb(d.pid)} über die letzten ${_spZahl(d.werte.length)} Sätze.`)}</div>`;
}

// ── Jede Begegnung: die Rivalität ────────────────────────────────────
// Gezeigt werden die letzten dreißig; die Bilanz darüber zählt alle, bis zu
// dieser Partie — die Marke steht an ihrer Partie [§C33].
function _spDuellDaten(a){
  const m = a.m, A = a.x.a, B = a.x.b;
  const alle = _spEigene(A, m).filter(x => [x.a1, x.a2, x.b1, x.b2].includes(B) && _spSeite(x, A) !== _spSeite(x, B));
  return {A, B, gesamt:alle.length, aw:alle.filter(x => _spGew(x, A)).length,
    spiele:alle.slice(-30).map(x => ({a:_spGew(x, A), diff:Math.abs(x.games_a - x.games_b), jetzt:x === m}))};
}
function _spDuellBild(d){
  const gapx = 300 / Math.max(d.spiele.length, 12);
  const balken = d.spiele.map((x, i) => {
    const h = 6 + x.diff * 2.6;
    return `<rect class="${x.a ? 'a' : 'b'}${x.jetzt ? ' jetzt' : ''}" x="${(i * gapx + 1).toFixed(1)}" y="${x.a ? 34 - h : 36}" width="${Math.max(1, gapx - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" style="--i:${i}"/>`;
  }).join('');
  const mehr = d.gesamt > d.spiele.length ? `, davon die letzten ${_spZahl(d.spiele.length)}` : '';
  return `<div class="sp-bg"><div class="sp-bg-k"><span>${_spChip(d.A)}<em class="num">${_spZahl(d.aw)}</em></span>`
    + `<span class="sp-k">Siege</span><span class="re"><em class="num">${_spZahl(d.gesamt - d.aw)}</em>${_spChip(d.B)}</span></div>
    <svg viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><line class="sp-bg-0" x1="0" x2="300" y1="35" y2="35"/>${balken}</svg>
    ${_spUnter(`${_spNb(d.A)} oben, ${_spNb(d.B)} unten: ${_spZahl(d.gesamt)} ${d.gesamt === 1 ? 'Begegnung' : 'Begegnungen'}${mehr}.`)}</div>`;
}

// ── Die Medaille: die Auszeichnung und wer sie in der Liga trägt ─────
// „Selten" ist ein Wort; wie selten, zeigt die Liga: jeder Spieler ein
// Punkt. Violett ist die Familie der Auszeichnungen, Gold nur die
// legendäre [§C25].
// Steht jemand zum Zeitpunkt der Partie noch in der Liga? Die Ranglisten
// eines Fußes (Träger, Partner, Woche) nennen nach dem Abschied niemanden,
// den keine Story mehr nennt [§C40]; was er davor tat, bleibt.
function _spNoch(id, m){
  const p = _spielerVon(id);
  if(!p || !sichtbar(p)) return false;
  const ab = ruhestandAbschlussMs(p);
  return !ab || mts(m) <= ab;
}
function _spMedailleDaten(a){
  const b = (typeof BADGES !== 'undefined' ? BADGES : []).find(x => x.id === a.x.badgeId);
  if(!b) return null;
  // Wer eine Auszeichnung trägt, ist Geschichte [§C40]: ein späteres
  // Karriereende nimmt der Karte ihre Träger nicht.
  const ids = players.filter(p => _spNoch(p.id, a.m)).map(p => p.id);
  // Kein heutiger Badge-Zensus fuer eine vergangene Partie: der kanonische
  // Event-Cache weiss, WANN jemand Traeger wurde und das wievielte Mal es
  // war. Ein Index am vorhandenen Datenstand ersetzt Vollrechnungen je
  // Spieler und Medaille. Cache-Versionen koennen den Event-Cache ersetzen,
  // ohne matches zu ersetzen, darum gehoert seine Referenz in den Guard.
  const B = _spBasis(), quelle = getBadgeEarnedCache();
  if(!B.medaillen || B.medaillen.quelle !== quelle){
    const erste = new Map(), vergaben = new Map();
    B.chrono.forEach((m, i) => {
      const gesehen = new Set();
      (quelle[m.id] || []).forEach(ev => {
        const badge = ev.badge && ev.badge.id, pid = ev.playerId;
        if(!badge || !pid) return;
        const k = pid + '|' + badge;
        if(gesehen.has(k)) return;
        gesehen.add(k);
        let traeger = erste.get(badge);
        if(!traeger){ traeger = new Map(); erste.set(badge, traeger); }
        if(!traeger.has(pid)) traeger.set(pid, i);
        let folge = vergaben.get(k);
        if(!folge){ folge = []; vergaben.set(k, folge); }
        folge.push(i);
      });
    });
    B.medaillen = {quelle, erste, vergaben};
  }
  const i = B.idx.get(a.m && a.m.id), erst = B.medaillen.erste.get(b.id);
  const traeger = ids.filter(id => erst && erst.has(id) && erst.get(id) <= i);
  // Numerische Matchpositionen statt eines langen UUID-Schluessels je
  // Vergabe halten den Index klein. Der Rang braucht nur eine binaere Suche
  // im bereits vorhandenen Eventverlauf, keine neue Badge-Rechnung.
  const rangVon = pid => {
    if(i == null) return 0;
    const folge = B.medaillen.vergaben.get(pid + '|' + b.id) || [];
    let lo = 0, hi = folge.length;
    while(lo < hi){ const mid = (lo + hi) >>> 1; if(folge[mid] <= i) lo = mid + 1; else hi = mid; }
    return lo && folge[lo - 1] === i ? lo : 0;
  };
  const rang = Number.isInteger(a.x.rang) && a.x.rang > 0 ? a.x.rang : rangVon(a.x.pid);
  const erreicht = rang >= 150 ? [Math.floor(rang / 25) * 25 - 25, Math.floor(rang / 25) * 25]
    : NEWS_BADGE_MARKEN.filter(k => k <= rang).slice(-2);
  // Jeder, der sie in dieser Partie holte, mit dem wievielten Mal: holten
  // Julian und Maxi „Absoluter Sieger" zusammen, nannte der Fuß nur Julian,
  // obwohl die Zeile darüber beide nannte.
  const sicht = new Set(ids);
  const alle = [a.x.pid].concat((quelle[a.m && a.m.id] || []).filter(ev => ev.badge && ev.badge.id === b.id).map(ev => ev.playerId))
    .filter((pid, k, l) => pid && sicht.has(pid) && l.indexOf(pid) === k)
    .map(pid => { const r = pid === a.x.pid ? rang : rangVon(pid); return {pid, rang:r, naechste:_badgeNaechsteMarke(r)}; });
  return {name:b.name, ic:b.ic, klasse:rarityOf(b.id), wer:a.x.pid, rang, ids, traeger, alle,
    wiederholung:rang > 1, marken:erreicht.concat(_badgeNaechsteMarke(rang))};
}
// Geprägt in der Farbe ihrer Klasse, mit dem Zeichen der Auszeichnung, am
// Band; daneben jeder, der sie hier holte, mit dem wievielten Mal, darunter
// die Liga als Punkte: hell, wer sie trägt, leuchtend, wer sie hier holte.
// Vorher gab es zwei Zeichnungen, eine für das erste Mal mit Plätzen und
// eine für die Wiederholung mit Marken, und beide nannten nur einen. Alte
// Daten ohne `alle` zeigen ihren einen, mit dem Rang, den sie trugen.
function _spMedailleBild(d){
  if(!d) return '';
  const gold = d.klasse === 'legendary', ton = gold ? 'gold' : 'viol';
  const alle = (Array.isArray(d.alle) && d.alle.length ? d.alle
    : d.wer ? [{pid:d.wer, rang:d.rang, naechste:(d.marken || []).find(n => n > d.rang)}] : []).filter(x => pmap()[x.pid]);
  const hier = new Set(alle.map(x => x.pid)), tr = new Set(d.traeger || []);
  // Der Name bricht um statt abzuschneiden; das Mal steht ungeteilt dahinter.
  const wer = alle.map(x => `<div class="sp-md-w">${_spChip(x.pid)}<span><b>${esc(_spName(x.pid))}</b> `
    + `<em class="sp-md-zahl num">${x.rang > 1 ? `<b>${_spZahl(x.rang)}.</b> Mal` : 'zum ersten Mal'}</em></span></div>`).join('');
  // Die nächste Marke nur für einen: bei zweien stünden zwei Rechnungen
  // untereinander, die niemand vergleicht.
  const eins = alle.length === 1 && alle[0].rang > 1 && alle[0].naechste > alle[0].rang ? alle[0] : null;
  const id = 'spm' + _spVisualHash(d.name + '|' + alle.map(x => x.pid + ':' + x.rang).join());
  const punkte = Array.from({length:24}, (_, k) => { const w = k * 15 * Math.PI / 180;
    return `<circle class="sp-md-pkt" cx="${(32 + 22.3 * Math.cos(w)).toFixed(1)}" cy="${(46 + 22.3 * Math.sin(w)).toFixed(1)}" r=".9"/>`; }).join('');
  // Ein Name mit einem langen Wort steht über der ganzen Breite: neben der
  // Medaille bleiben auf dem schmalsten Telefon 140 px, und
  // „Wiederholungstäter" brach dort mitten im Wort um.
  const name = `<div class="sp-md-n">${esc(d.name)}</div>`;
  const breit = String(d.name || '').split(/[\s-]+/).some(w => w.length > 11);
  return `<div class="sp-fk sp-md ${ton}${d.wiederholung && d.rang > 1 ? ' sp-md-wieder' : ''}">`
    + `<div class="sp-k">${gold ? 'Legendäre' : 'Seltene'} Auszeichnung</div>${breit ? name : ''}<div class="sp-md-g">`
    + `<span class="sp-md-m"><svg viewBox="0 0 64 74" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" class="s1"/><stop offset=".5" class="s2"/><stop offset="1" class="s3"/></linearGradient></defs>`
    + `<path class="sp-md-band" d="M18 0h11l7 22-9 4zM46 0H35l-7 22 9 4z"/><circle cx="32" cy="46" r="25" fill="url(#${id})"/>`
    + `<circle class="sp-md-in" cx="32" cy="46" r="19.5"/>${punkte}</svg>`
    + `<span class="sp-md-ic">${zkHtml(d.ic, '', ton)}</span><b class="sp-md-glanz"></b></span>`
    + `<div class="sp-md-r">${breit ? '' : name}${wer}`
    + (eins ? `<small class="num">noch ${_spZahl(eins.naechste - eins.rang)} bis zur ${_spZahl(eins.naechste)}.</small>` : '')
    + `</div></div>`
    + (d.ids && d.ids.length ? `<div class="sp-md-l"><span>${d.ids.map(p => `<i class="${hier.has(p) ? 'neu' : tr.has(p) ? 'hat' : ''}"></i>`).join('')}</span>`
      + `<small class="num">${_spZahl(tr.size)} von ${_spZahl(d.ids.length)} tragen sie</small></div>` : '')
    + `</div>`;
}

// ── Der Spieler des Tages: die Tagesbahn und die Elo über den Tag ────
// Die Karte nannte Siegquote, Bilanz und Platz als drei Zahlen — dass der
// Tag mit zwei Pleiten anfing und mit fünf Siegen endete, stand nirgends.
// Die Bahn ist dasselbe Bild wie im Blatt (_ndTagesbahn) [§C27]; die Linie
// darüber zeigt, wie die Elo des Tages zustande kam. Ab vierundzwanzig
// Partien werden die Felder schmaler, nicht weniger.
function _spTagDaten(s){
  const d = s.dataRef || {}, pid = d.playerId;
  if(!pid) return null;
  const tag = tagKey(s.when);
  const ms = matchesOfPlayer(pid, matches).filter(x => tagKey(mts(x)) === tag);
  let e = 0;
  return {pid, partien:ms.map(x => ({w:_spGew(x, pid), e:(e += (_newsEloDelta(pid, x.id) || 0))})), elo:e};
}
function _spTagBild(d){
  if(!d || !d.partien.length) return '';
  const pkt = [{e:0}].concat(d.partien), n = pkt.length;
  const lo = Math.min(...pkt.map(p => p.e)), hi = Math.max(...pkt.map(p => p.e));
  const X = i => 8 + i * (284 / Math.max(1, n - 1)), Y = v => 6 + (hi - v) / Math.max(1, hi - lo) * 34;
  const w = d.partien.filter(p => p.w).length, l = d.partien.length - w;
  return `<div class="sp-tg"><svg viewBox="0 0 300 46" aria-hidden="true">
      <path class="sp-tg-f" d="M${X(0)} 46${pkt.map((p, i) => `L${X(i).toFixed(1)} ${Y(p.e).toFixed(1)}`).join('')}L${X(n - 1).toFixed(1)} 46Z"/>
      <path class="sp-tg-l" pathLength="1" d="${pkt.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.e).toFixed(1)}`).join('')}"/></svg>
    <div class="sp-tg-b${d.partien.length > 24 ? ' eng' : ''}">${d.partien.map((p, i) => `<i class="${p.w ? 'w' : 'l'}" style="--i:${i}"></i>`).join('')}</div>
    <div class="sp-tg-z"><span><b class="num">${_spZahl(w)}</b> ${w === 1 ? 'Sieg' : 'Siege'}, <b class="num">${_spZahl(l)}</b> ${l === 1 ? 'Niederlage' : 'Niederlagen'}</span>`
    + `<span><b class="num ${d.elo >= 0 ? 'g' : 'r'}">${_spVz(d.elo)}</b> Elo</span></div></div>`;
}

// ── Die gewöhnliche Partie hat dreizehn Gesichter [§C33] ─────────────
// Gut die Hälfte aller Partie-Karten hatte keinen Anlass, und jede davon
// trug dasselbe Spielfeld: gemessen 31 von 59 Partie-Karten im Fenster, und
// der Feed sah dadurch an jedem Spieltag gleich aus. Jede gewöhnliche Partie
// hat aber etwas, das nur sie hat — eine runde Zahl, einen Gegner, gegen
// den es immer klappt, eine Revanche, einen Tag, an dem nichts danebengeht.
// Dreizehn Formen fragen danach, jede mit einer Regel (`wann`), einem
// Gewicht (`rang`: je seltener und erzählender, desto höher), einer
// Schlagzeile samt Satz (`text`) und einem Bild. Das Spielfeld bleibt eine
// davon.
//
// IN JEDER FORM STEHT DER STAND (`_spSt`), und zwar dort, wo er zur
// Zeichnung gehört — im Feld des Mosaiks, unter der Nadel, als Ende des
// Kalenders. Wer den Feed überfliegt, will wissen, welche Partie es war;
// beim Tagesring stand er zuerst nur im Satz.
//
// ALLES RECHNET BIS ZU DIESER PARTIE, und die Wahl auch (`_spForm`): sie
// sieht nur die Partien davor. Eine Karte behält damit ihre Form, ihre
// Schlagzeile und ihren Satz, wenn später gespielt wird — was einmal
// dasteht, bleibt stehen [§C33]. Deshalb entscheidet sie der Generator und
// nicht die Anzeige: Kopf, Schlagzeile und Satz kommen aus derselben Wahl.

// Der Stand gehört dem Sieger: seine Zahl zuerst und hell [§C33].
// Der Stand in der Reihenfolge der Seiten, A zuerst, der Sieger hell. Ohne
// `aw` (gespeicherte Daten) die Siegerzahl zuerst.
function _spSt(d){
  return d.aw === false ? `<b class="sp-st num">${_spZahl(d.tief)}:<em>${_spZahl(d.hoch)}</em></b>`
    : `<b class="sp-st num"><em>${_spZahl(d.hoch)}</em>:${_spZahl(d.tief)}</b>`;
}
// Die Namen beider Teams als Textstelle unter der Zeichnung, je einer in
// seiner Zeile [§11.6c]. Die Sieger stehen vorn, und das Wort dazwischen
// sagt, wie es ausging: mit „gegen" las man den Sieger nur an der
// Helligkeit der Namen ab.
function _spNz(W, L, wort){
  return `<div class="sp-nz"><span class="w">${_spStapel(W)}</span><span class="sp-nz-gg">${wort || 'schlagen'}</span>`
    + `<span class="re">${_spStapel(L)}</span></div>`;
}
// ── Die Teamzeile unter dem Kopf: Team A links, Team B rechts ──────────
// Wie am Tisch und bei der Eingabe. Die Sieger standen immer links, und
// spielten dieselben vier mehrmals hintereinander, wechselten die Namen bei
// jedem Sieg der anderen Seite die Seite. Der Sieger trägt den grünen
// Strich, der Verlierer den roten [§C25]; dazwischen steht „gegen", denn
// „schlagen" stimmt nur, wenn der Sieger links steht.
// Je Paar die Abwehr zuerst, wie die Gesichter im Kopf (`_spKopfDaten`):
// unter Julian über Leon stand sonst „Leon, Julian".
function _spTeamZeile(m){
  const aw = m.winner === 'A';
  const rolle = id => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_side'];
  const ord = s => _spTeam(m, s).slice().sort((a, b) => (rolle(a) === 'reves' ? 0 : 1) - (rolle(b) === 'reves' ? 0 : 1));
  return `<div class="sp-nz"><span class="${aw ? 'w' : 'l'}">${_spStapel(ord('A'))}</span><span class="sp-nz-gg">gegen</span>`
    + `<span class="re ${aw ? 'l' : 'w'}">${_spStapel(ord('B'))}</span></div>`;
}
// Wie lange etwas her ist, in der Einheit, die man sagen würde: `e` nach
// „vor" und „nach", `nom` vor „her". Nach den Wochen kamen keine Einheiten
// mehr, und mit einer Liga, die Jahre alt ist, stand eine Revanche „nach
// 130 Wochen" da. Ab zwei Monaten zählen Monate, ab zwei Jahren Jahre.
function _spSeit(ms){
  const ein = (n, e1, eN, nom1, nomN) => ({n, e:n === 1 ? e1 : eN, nom:n === 1 ? nom1 : nomN});
  const min = Math.max(1, Math.round(ms / 60000));
  if(min < 60) return ein(min, 'Minute', 'Minuten', 'Minute', 'Minuten');
  const h = Math.round(min / 60);
  if(h < 24) return ein(h, 'Stunde', 'Stunden', 'Stunde', 'Stunden');
  const t = Math.round(h / 24);
  if(t < 14) return ein(t, 'Tag', 'Tagen', 'Tag', 'Tage');
  if(t < 61) return ein(Math.round(t / 7), 'Woche', 'Wochen', 'Woche', 'Wochen');
  const mo = Math.round(t / 30.44);
  if(mo < 24) return ein(mo, 'Monat', 'Monaten', 'Monat', 'Monate');
  return ein(Math.round(t / 365.25), 'Jahr', 'Jahren', 'Jahr', 'Jahre');
}

// Die Partien je Kalendertag und je Partie Siegchance, Abstand und Gewinn
// der Sieger: einmal je Datenstand, wie `_spBasis`.
const _spFormBasisMemo = new WeakMap();
function _spFormBasis(){
  let b = _spFormBasisMemo.get(matches);
  if(b) return b;
  const chrono = _spBasis().chrono, tage = new Map();
  chrono.forEach(m => { const k = tagKey(m.created_at); if(!tage.has(k)) tage.set(k, []); tage.get(k).push(m); });
  const punkte = chrono.map(m => ({c:_spChance(m), d:Math.abs(m.games_a - m.games_b),
    g:_spSieger(m).reduce((s, id) => s + (_newsEloDelta(id, m.id) || 0), 0)}));
  b = {tage, punkte, fakten:new Map(), kand:new Map(), wahl:new Map()};
  _spFormBasisMemo.set(matches, b);
  return b;
}

// Die Fakten einer Partie, alle bis einschließlich dieser.
function _spFakten(m){
  const FB = _spFormBasis();
  let F = FB.fakten.get(m.id);
  if(F) return F;
  const B = _spBasis(), i = B.idx.get(m.id);
  const W = _spSieger(m), L = _spVerlierer(m), alle = W.concat(L);
  const h = getHistoryByMatchId().get(m.id) || {};
  // hoch:tief ist der Stand, wie die Karte ihn zeigt: die Sätze, bei einem
  // einzigen Satz dessen Games. `diff` ist der Abstand in Games, `anteil`
  // der Anteil der Games der Sieger, `satz` das ganze Ergebnis [§1.3].
  const pz = partie(m), ein = pz.saetze.length === 1;
  const sW = m.winner === 'B' ? pz.setsB : pz.setsA, sL = m.winner === 'B' ? pz.setsA : pz.setsB;
  F = {m, i, W, L, c:_spChance(m), diff:pz.gameDiff, anteil:pz.gameAnteil, satz:standFuer(m),
    hoch:ein ? Math.max(pz.saetze[0].a, pz.saetze[0].b) : sW, tief:ein ? Math.min(pz.saetze[0].a, pz.saetze[0].b) : sL,
    delta:{}, elo:{}, zahl:{}};
  alle.forEach(id => {
    F.delta[id] = _newsEloDelta(id, m.id) || 0;
    F.elo[id] = Math.round((h.eloBefore || {})[id] != null ? h.eloBefore[id] : cfg.start_elo);
    const eig = _spEigene(id, m);
    F.zahl[id] = {p:eig.length, s:eig.filter(x => _spGew(x, id)).length};
  });
  F.gewinn = W.reduce((s, id) => s + F.delta[id], 0);
  const mit = (x, id) => x.a1 === id || x.a2 === id || x.b1 === id || x.b2 === id;
  const duo = _spEigene(W[0], m).filter(x => mit(x, W[1]) && _spSeite(x, W[0]) === _spSeite(x, W[1]));
  F.duo = {p:duo.length, s:duo.filter(x => _spGew(x, W[0])).length, folge:duo.map(x => _spGew(x, W[0]))};
  // Spieler gegen Spieler: wie oft sich ein Sieger und ein Verlierer als
  // Gegner trafen und wie viele Niederlagen gegen ihn direkt davor lagen.
  F.gegner = [];
  W.forEach(w => L.forEach(l => {
    const folge = _spEigene(w, m).filter(x => mit(x, l) && _spSeite(x, w) !== _spSeite(x, l)).map(x => _spGew(x, w));
    let fluch = 0;
    for(let k = folge.length - 2; k >= 0 && !folge[k]; k--) fluch++;
    F.gegner.push({w, l, n:folge.length, s:folge.filter(Boolean).length, folge, fluch});
  }));
  const tag = FB.tage.get(tagKey(m.created_at)) || [m];
  F.tag = tag.slice(0, tag.indexOf(m) + 1);
  // Die Revanche: dieselben zwei Duos haben sich vorher getroffen, und
  // damals gewann die andere Seite.
  const wSet = W.slice().sort().join(), lSet = L.slice().sort().join();
  const team = (x, s) => _spTeam(x, s).slice().sort().join();
  const vorher = _spEigene(W[0], m).slice(0, -1).reverse().find(x => {
    const a = team(x, 'A'), b = team(x, 'B');
    return (a === wSet && b === lSet) || (a === lSet && b === wSet);
  });
  if(vorher && _spSieger(vorher).slice().sort().join() === lSet) F.revanche = {vorher, ms:mts(m) - mts(vorher)};
  F.treffen = _spEigene(W[0], m).filter(x => { const a = team(x, 'A'), b = team(x, 'B');
    return (a === wSet && b === lSet) || (a === lSet && b === wSet); });
  F.pause = W.map(id => { const eig = _spEigene(id, m), v = eig[eig.length - 2];
    return {id, tage:v ? Math.floor((mts(m) - mts(v)) / 86400000) : null, vorher:v}; });
  let frei = false;
  try { frei = _storyRangFrei(seasonOf(m.created_at).id, mts(m)).frei; } catch(e){}
  F.rang = {};
  alle.forEach(id => { F.rang[id] = frei ? _newsRankChange(id, m.id) : null; });
  F.vert = B.kum.map(k => k[i + 1]);
  FB.fakten.set(m.id, F);
  return F;
}

const SP_RUND = new Set([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200]);
// Stufen innerhalb eines Tages (Siege, Partien): ein Bild, das ab einer
// Schwelle bei JEDER weiteren Partie zutraf, stand an einem langen Tag auf
// Karte um Karte. Es zählt die Stufe, nicht jeder Schritt dazwischen.
const SP_TAG_STUFEN = new Set([4, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]);
const _spMarke = n => n >= 50 && n % 50 === 0;
const _spNl = ids => _namenListe(ids.map(_spName));

// Strengere V2-Befunde fuer Grafiken, die sonst fast jede normale Partie
// erklaeren koennten. Die historischen 13 Formen behalten ihre Regeln;
// neue Score-Snapshots verwenden diese belastbareren Anlaesse.
// Im Padel nicht im Gebrauch: das Mosaik zählte die Endstände 10:0 bis
// 10:9, und ein Satzergebnis hat keine solche feste Leiter.
function _spMosaikBefund(F){
  return null;
  const gesamt = F.vert.slice(1).reduce((s, n) => s + n, 0);
  if(gesamt < 30) return null;
  const n = F.vert[F.diff] || 0, max = Math.max(...F.vert.slice(1, 10));
  const selten = n <= Math.max(2, Math.floor(gesamt * 0.04));
  // Der Modalwert bleibt oft ueber viele Partien derselbe. Er ist nur bei
  // jeder fuenften Bestaetigung neu erzaehlenswert; eine allgemeine runde
  // Ergebnismarke erst in Zehnerschritten.
  const haeufig = n === max && n / gesamt >= 0.18 && n >= 5 && n % 5 === 0;
  const marke = n >= 10 && n % 10 === 0;
  return selten || haeufig || marke
    ? {grund:selten ? 'selten' : (haeufig ? 'haeufig' : 'marke')} : null;
}

// ── Die vier eines Kopfs nach dem Katalog ───────────────────────────
// Die Sieger links, je Paar die Abwehr zuerst: so steht jeder in jedem Kopf
// an derselben Stelle. Dazu das Elo, das die Partie jedem brachte — die zwei
// Sieger bekommen selten dasselbe, und ein Schnitt „Elo je Sieger" stimmte
// für keinen von beiden.
function _spKopfDaten(F){
  const m = F.m, rolle = id => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_side'];
  const ord = l => l.slice().sort((a, b) => (rolle(a) === 'reves' ? 0 : 1) - (rolle(b) === 'reves' ? 0 : 1));
  const delta = {};
  F.W.concat(F.L).forEach(id => { delta[id] = Math.round(F.delta[id] || 0); });
  return {W:ord(F.W), L:ord(F.L), hoch:F.hoch, tief:F.tief, anteil:F.anteil, aw:F.m.winner === 'A',
    pct:F.c != null ? Math.round(F.c * 100) : null, delta};
}
// Die wievielte Partie dieser Art im Monat diese ist, sie eingeschlossen.
function _spImMonat(F, art){
  const B = _spBasis(), mon = tagKey(mts(F.m)).slice(0, 7);
  let n = 0;
  for(let j = F.i; j >= 0; j--){
    const x = B.chrono[j];
    if(tagKey(mts(x)).slice(0, 7) !== mon) break;
    if(art(x)) n++;
  }
  return n;
}
// ── Was eine gewöhnliche Partie sagt, das ihr Kopf nicht zeigt ─────────
// Kopf und Teamzeile zeigen schon, wer gegen wen wie hoch gewann, mit
// welcher Elo und Chance. „Maxi und Johannes gewinnen mit 2 Toren
// Abstand" über zehn und acht Pucks, darunter „Leon und Stefan treffen
// 8-mal" und im Fuß noch einmal 10:8 — dieselbe Zahl viermal. Die
// Schlagzeile nennt deshalb etwas aus der Geschichte dieser Leute: das
// Duell dieser zwei Duos, die gemeinsamen Siege, den Tag eines Siegers.
// Welche, entscheidet die Partie selbst (`_spVisualHash`), damit nicht
// jede Karte dieselbe Sorte Satz trägt.
function _spKontext(F){
  const W = _spNl(F.W), L = _spNl(F.L), n = F.treffen.length;
  const s = F.treffen.filter(x => _spGew(x, F.W[0])).length;
  const wahl = [];
  if(n >= 3) wahl.push({
    t:s * 2 > n ? (s - 1) * 2 <= n - 1 ? `${W} gehen gegen ${L} in Führung` : `${W} bleiben gegen ${L} vorn`
      : s * 2 === n ? `${W} gleichen gegen ${L} aus` : `${W} verkürzen gegen ${L}`,
    d:`Von ${_spZahl(n)} Treffen dieser beiden Duos gingen ${_spZahl(s)} an ${W}.`});
  if(F.duo.p >= 2) wahl.push({t:`${W} gewinnen zum ${_spZahl(F.duo.s)}. Mal zusammen`,
    d:`Das sind ${_spZahl(Math.round(F.duo.s / F.duo.p * 100))} % der ${_spZahl(F.duo.p)} gemeinsamen Sätze.`});
  const tag = F.W.map(id => { const l = F.tag.filter(x => [x.a1, x.a2, x.b1, x.b2].includes(id));
    return {id, k:l.length, w:l.filter(x => _spGew(x, id)).length}; }).filter(x => x.k >= 3).sort((a, b) => b.w - a.w)[0];
  if(tag) wahl.push({t:`${_spName(tag.id)} holt den ${_spZahl(tag.w)}. Sieg des Tages`,
    d:`${_spZahl(tag.w)} ${tag.w === 1 ? 'Sieg' : 'Siege'} aus ${_spZahl(tag.k)} Sätzen an diesem Tag.`});
  if(!wahl.length) wahl.push(F.duo.p <= 1 ? {t:`${W} gewinnen den ersten gemeinsamen Satz`,
      d:n > 1 ? `Von ${_spZahl(n)} Treffen dieser beiden Duos gingen ${_spZahl(s)} an ${W}.` : `Es ist das erste Treffen dieser beiden Duos.`}
    : {t:`${W} gewinnen zum ${_spZahl(F.duo.s)}. Mal zusammen`,
      d:`Das sind ${_spZahl(Math.round(F.duo.s / F.duo.p * 100))} % der ${_spZahl(F.duo.p)} gemeinsamen Sätze.`});
  return wahl[_spVisualHash(F.m.id + '|kontext') % wahl.length];
}
// Im Tiebreak entschieden, nach §1.3. Zu Null ist ein Satz 6:0, kein
// einziges Game abgegeben; vorher hing es am Match über mehrere Sätze.
const _spKrimi = x => partie(x).entscheidTb;
const _spZuNull = x => partie(x).zuNull;

// ── Die Formen: Regel, Daten, Bild und Text ──────────────────────────
// `wann` gibt die Daten der Regel oder null, `daten` macht daraus, was das
// Bild braucht — nur Zahlen und IDs, damit `tests/blatt` jedes Bild auch
// mit Grenzwerten zeichnen kann [§11.6c].
const SP_FORM = {
  // Das Mosaik: wie gewöhnlich dieses Ergebnis ist. Zehn Felder von 10:0
  // bis 10:9, jedes so hell, wie oft die Liga bis hier so endete.
  mosaik:{rang:12, ic:'chartBar',
    wann:() => null,
    gewicht:x => x.grund === 'selten' ? 28 : (x.grund === 'haeufig' ? 22 : 18),
    daten:(F, x) => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, diff:F.diff,
      n:F.vert.slice(), mal:F.vert[F.diff], grund:x.grund,
      gesamt:F.vert.slice(1).reduce((s, n) => s + n, 0)}),
    text:(F, x) => {
      const eig = _spEigene(F.W[0], F.m).filter(x => _spGew(x, F.W[0]) && Math.abs(x.games_a - x.games_b) === F.diff).length;
      if(!x.grund) return {t:`${_spNl(F.W)} gewinnen das ${F.vert[F.diff]}. ${F.satz} der Liga`,
        d:`Für ${_spName(F.W[0])} ist es der ${eig}. Sieg mit diesem Ergebnis.`};
      const art = x.grund === 'selten' ? 'seltenen' : 'häufigsten';
      return {t:x.grund === 'marke'
          ? `${_spNl(F.W)} gewinnen das ${F.vert[F.diff]}. ${F.satz} der Liga`
          : `${_spNl(F.W)} landen beim ${art} Ergebnis der Liga`,
        d:`Für ${_spName(F.W[0])} ist es der ${eig}. Sieg mit diesem Ergebnis.`};
    }},
  // Pflicht erfüllt: der Favorit gewinnt, und die Nadel zeigt, wie sicher
  // es vorher aussah.
  tacho:{rang:20, ic:'target',
    wann:F => F.c != null && F.c >= 0.62 && F.diff < 6 ? {} : null,
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, pct:Math.round(F.c * 100), klar:F.diff >= 4}),
    text:(F, x) => {
      if(x && x.leicht) return {t:`${_spNl(F.W)} gewinnen mit leichtem Vorteil`,
        d:`${F.satz} gegen ${_spNl(F.L)}. Vor dem Satz lagen beide Teams nah beieinander.`};
      const w = F.W[0], als = _spEigene(w, F.m).slice(0, -1).filter(x => { const c = _spChance(x);
        return c != null && (_spGew(x, w) ? c : 1 - c) >= 0.62; });
      const g = als.filter(x => _spGew(x, w)).length;
      return {t:`${_spNl(F.W)} lösen die Favoritenrolle ein`,
        d:als.length >= 5 ? `${_spName(w)} gewinnt als Favorit ${Math.round(g / als.length * 100)} % aller Sätze.`
          : `${_spName(w)} geht zum ${als.length + 1}. Mal als Favorit in einen Satz.`};
    }},
  // Erwartung gegen Ergebnis: das Ergebnis weicht deutlich von der Rechnung
  // ab. Die Liga bis hier als Wolke, die Erwartung als Linie, diese Partie
  // als Punkt.
  streu:{rang:34, ic:'ausreisser',
    wann:F => F.i >= 50 && F.c != null && ((F.c >= 0.7 && F.diff <= 2) || (F.c < 0.5 && F.diff >= 5)) ? {knapp:F.c >= 0.7} : null,
    daten:(F, x) => {
      const pk = _spFormBasis().punkte.slice(0, F.i).filter(p => p.c != null);
      const bins = {};
      pk.forEach(p => { const k = Math.min(19, Math.floor(p.c * 20)) + '_' + Math.min(10, p.d); bins[k] = (bins[k] || 0) + 1; });
      const erw = [];
      for(let k = 0; k < 10; k++){ const z = pk.filter(p => p.c >= k / 10 && p.c < (k + 1) / 10);
        if(z.length >= 4) erw.push([k / 10 + 0.05, z.reduce((s, p) => s + p.d, 0) / z.length]); }
      const so = pk.filter(p => x.knapp ? (p.c >= 0.7 && p.d <= F.diff) : (p.c < 0.5 && p.d >= F.diff)).length;
      return {W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, c:F.c, diff:F.diff, knapp:x.knapp,
        bins:Object.keys(bins).map(k => { const [a, b] = k.split('_').map(Number); return {c:(a + 0.5) / 20, d:b, n:bins[k]}; }),
        erw, so, gesamt:pk.length};
    },
    text:(F, x) => {
      const pk = _spFormBasis().punkte.slice(0, F.i).filter(p => p.c != null && Math.abs(p.c - F.c) < 0.05);
      const soll = pk.length >= 4 ? pk.reduce((s, p) => s + p.d, 0) / pk.length : null;
      return {t:`${_spNl(F.W)} gewinnen ${x.knapp ? 'knapper' : 'klarer'} als gedacht`,
        // Die Siegchance steht in der Zeichnung, der Satz nennt den Schnitt,
        // den die Linie nur zeigt.
        d:soll != null ? `So eine Ausgangslage endet im Schnitt mit ${komma(soll)} Games Abstand.`
          : `In dieser Lage ist es erst der ${pk.length + 1}. Satz der Liga.`};
    }},
  // Der Elo-Transfer: historische Formregel. Neue Karten tragen ihn nicht
  // mehr als Kopf — er zeigte die Verlierer links; der Elo-Strom sagt
  // dasselbe mit den Siegern links.
  transfer:{rang:30, ic:'boomerang',
    wann:F => {
      if(F.i < 50) return null;
      const g = _spFormBasis().punkte.slice(0, F.i).map(p => p.g).sort((a, b) => b - a);
      return F.gewinn >= g[Math.floor(g.length * 0.12)] ? {} : null;
    },
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, delta:Object.assign({}, F.delta), gewinn:F.gewinn}),
    text:F => {
      const pk = _spFormBasis().punkte, B = _spBasis();
      let z = null;
      for(let j = F.i - 1; j >= 0; j--) if(pk[j].g >= F.gewinn){ z = B.chrono[j]; break; }
      return {t:`${_spZahl(F.gewinn)} Elo wechseln die Seite`,
        d:z ? `So viel brachte zuletzt ein Satz am ${tagImSatz(mts(z))}` : 'So viel brachte bis hier kein Satz der Liga.'};
    }},
  // Eingespielt: ein Duo, das zusammen fast immer gewinnt, oder eine runde
  // Zahl gemeinsamer Siege.
  chemie:{rang:26, ic:'handshake',
    // Nur an runden Zahlen: „eingespielt" ab zwölf Partien galt für jeden
    // weiteren Sieg desselben Duos, und das Bild stand Partie für Partie da.
    wann:F => (F.duo.p >= 12 && F.duo.s / F.duo.p >= 0.75 && F.duo.s % 5 === 0) || (SP_RUND.has(F.duo.s) && F.duo.p >= 5) ? {rund:SP_RUND.has(F.duo.s)} : null,
    gewicht:x => x.rund ? 38 : 0,
    daten:F => ({A:F.W[0], B:F.W[1], L:F.L, hoch:F.hoch, tief:F.tief, s:F.duo.s, p:F.duo.p, folge:F.duo.folge.slice(-30)}),
    text:(F, x) => {
      const q = id => { const p = F.W.find(o => o !== id);
        const ohne = _spEigene(id, F.m).filter(y => !(_spTeam(y, _spSeite(y, id)).includes(p)));
        return Math.round(ohne.filter(y => _spGew(y, id)).length / Math.max(1, ohne.length) * 100); };
      // Derselbe Wortlaut wie die Schlagzeile einer gewöhnlichen Partie
      // (`_spKontext`): unter „Leon und Leo gewinnen zum 5. Mal zusammen"
      // stand als Zeile des Fußes „Leon und Leo feiern den 5. gemeinsamen
      // Sieg". Bei gleichem Wortlaut lässt `_spZeilen` die Zeile weg.
      return {t:x.rund ? `${_spNl(F.W)} gewinnen zum ${F.duo.s}. Mal zusammen` : `${_spNl(F.W)} sind eingespielt`,
        d:`Mit anderen Partnern gewinnt ${_spName(F.W[0])} ${q(F.W[0])} % und ${_spName(F.W[1])} ${q(F.W[1])} %.`};
    }},
  // Der Lieblingsgegner und der gebrochene Fluch: Spieler gegen Spieler.
  gegner:{rang:24, ic:'crossedSwords',
    wann:F => {
      const fluch = F.gegner.filter(g => g.fluch >= 5).sort((a, b) => b.fluch - a.fluch)[0];
      if(fluch) return {g:fluch, fluch:true};
      const lieb = F.gegner.filter(g => g.n >= 6 && g.s / g.n >= 0.75 && g.s % 5 === 0).sort((a, b) => b.s / b.n - a.s / a.n || b.n - a.n)[0];
      return lieb ? {g:lieb, fluch:false} : null;
    },
    gewicht:x => x.fluch ? 42 : 0,
    daten:(F, x) => ({w:x.g.w, l:x.g.l, W:F.W, L:F.L, s:x.g.s, n:x.g.n, folge:x.g.folge.slice(-24), fluch:x.fluch ? x.g.fluch : 0, hoch:F.hoch, tief:F.tief, awA:F.m.winner === 'A'}),
    text:(F, x) => {
      const g = x.g, eig = _spEigene(g.w, F.m).slice(0, -1).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(g.l) && _spSeite(y, g.w) !== _spSeite(y, g.l));
      if(x.fluch){
        const s = eig.filter(y => _spGew(y, g.w)).pop();
        return {t:`${_spName(g.w)} schlägt ${_spName(g.l)} wieder`,
          d:s ? `Der letzte Sieg gegen ${_spName(g.l)} war am ${tagImSatz(mts(s))}` : `Es ist der erste Sieg gegen ${_spName(g.l)} nach ${g.fluch} Niederlagen.`};
      }
      let k = 0; for(let j = eig.length - 1; j >= 0 && _spGew(eig[j], g.w); j--) k++;
      return {t:`${_spName(g.w)} schlägt ${_spName(g.l)} zum ${g.s}. Mal`,
        d:k ? `Das ist der ${k + 1}. Sieg in Folge gegen ${_spName(g.l)}.`
          : `Die letzte Niederlage gegen ${_spName(g.l)} war am ${tagImSatz(mts(eig[eig.length - 1]))}`};
    }},
  // Die Revanche: dieselben zwei Duos, und diesmal gewinnt die andere Seite.
  revanche:{rang:28, ic:'rematch',
    wann:F => F.revanche || null,
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, vHoch:Math.max(F.revanche.vorher.games_a, F.revanche.vorher.games_b),
      vTief:Math.min(F.revanche.vorher.games_a, F.revanche.vorher.games_b), seit:_spSeit(F.revanche.ms), awA:F.m.winner === 'A'}),
    text:F => {
      const s = F.treffen.filter(y => _spGew(y, F.W[0])).length, n = F.treffen.length;
      return {t:F.revanche.ms <= 1800000 ? `${_spNl(F.W)} antworten sofort` : `${_spNl(F.W)} holen sich die Revanche`,
        // Die Bilanz steht als Satz und nicht als „x:y": ein zweiter Stand im Text
        // neben dem der Partie liest sich als ihr Ergebnis.
        d:n <= 2 ? `Es ist das ${n}. Treffen dieser beiden Duos.`
          : s === n - s ? `Von ${n} Treffen dieser beiden Duos gingen je ${s} an jede Seite.`
          : `Von ${n} Treffen dieser beiden Duos gingen ${Math.max(s, n - s)} an ${_spNl(s > n - s ? F.W : F.L)}.`};
    }},
  // Gipfeltreffen: der Erste und der Zweite der Monatstabelle am selben Tisch.
  gipfel:{rang:26, ic:'peak',
    wann:F => { const r = F.W.concat(F.L).map(id => F.rang[id] && F.rang[id].pre);
      return r.includes(1) && r.includes(2) ? {} : null; },
    daten:F => ({hoch:F.hoch, tief:F.tief, zeilen:F.W.concat(F.L).map(id => ({id, pre:F.rang[id] ? F.rang[id].pre : null,
      post:F.rang[id] ? F.rang[id].post : null, w:F.W.includes(id)})).sort((a, b) => (a.pre || 999) - (b.pre || 999))}),
    text:F => {
      const ids = F.W.concat(F.L), eins = ids.find(id => F.rang[id] && F.rang[id].pre === 1), zwei = ids.find(id => F.rang[id] && F.rang[id].pre === 2);
      const gleich = F.W.includes(eins) === F.W.includes(zwei);
      const t = gleich ? (F.W.includes(eins) ? `Die beiden Ersten gewinnen zusammen` : `${_spNl(F.W)} schlagen die beiden Ersten`)
        : `${_spName(F.W.includes(eins) ? eins : zwei)} gewinnt das Gipfeltreffen`;
      const neu = ids.find(id => F.rang[id] && F.rang[id].post === 1);
      return {t, d:neu ? `Nach dem Satz führt ${_spName(neu)} die Monatstabelle.` : `${_spName(eins)} war vorher Erster.`};
    }},
  // Zurück am Tisch: ein Sieg nach mindestens zehn Tagen ohne Partie.
  rueckkehr:{rang:32, ic:'doorReturn',
    wann:F => F.pause.filter(p => p.tage != null && p.tage >= 10).sort((a, b) => b.tage - a.tage)[0] || null,
    daten:(F, x) => ({id:x.id, mit:F.W.find(o => o !== x.id), tage:x.tage, L:F.L, hoch:F.hoch, tief:F.tief}),
    text:(F, x) => ({t:`${_spName(x.id)} ist zurück`, d:`Der letzte Satz davor war am ${tagImSatz(mts(x.vorher))}`}),
  },
  // Zwei Welten: im Sieger-Duo liegen mindestens 220 Elo zwischen beiden.
  gefaelle:{rang:16, ic:'weight',
    wann:F => Math.abs(F.elo[F.W[0]] - F.elo[F.W[1]]) >= 220 ? {} : null,
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, elo:Object.assign({}, F.elo)}),
    text:F => ({t:`${_spNl(F.W)} gewinnen als ungleiches Paar`,
      d:`Für ${_spName(F.W[0])} bringt der Sieg ${_spVz(F.delta[F.W[0]])} Elo, für ${_spName(F.W[1])} ${_spVz(F.delta[F.W[1]])}.`})},
  // Der Tagesring: ein Sieger hat heute mindestens vier Partien gespielt und
  // drei von vier gewonnen.
  tagesring:{rang:22, ic:'sunrise',
    wann:F => {
      const t = F.W.map(id => ({id, ms:F.tag.filter(x => [x.a1, x.a2, x.b1, x.b2].includes(id))}))
        .map(t => Object.assign(t, {s:t.ms.filter(x => _spGew(x, t.id)).length}))
        .filter(t => t.ms.length >= 4 && t.s / t.ms.length >= 0.75 && SP_TAG_STUFEN.has(t.s)).sort((a, b) => b.s - a.s)[0];
      return t || null;
    },
    daten:(F, x) => ({id:x.id, mit:F.W.find(o => o !== x.id), L:F.L, hoch:F.hoch, tief:F.tief, folge:x.ms.slice(-24).map(y => _spGew(y, x.id))}),
    text:(F, x) => ({t:`${_spName(x.id)} ist heute nicht zu stoppen`,
      d:`Der Tag bringt bisher ${_spVz(x.ms.reduce((s, y) => s + (_newsEloDelta(x.id, y.id) || 0), 0))} Elo.`})},
  // Das Zählwerk: eine runde Zahl fällt in dieser Partie.
  zaehlwerk:{rang:44, ic:'hundred',
    wann:F => {
      for(const id of F.W) if(_spMarke(F.zahl[id].s)) return {wert:F.zahl[id].s, sieg:true, wer:id};
      for(const id of F.W.concat(F.L)) if(_spMarke(F.zahl[id].p)) return {wert:F.zahl[id].p, sieg:false, wer:id};
      return (F.i + 1) % 100 === 0 ? {wert:F.i + 1, sieg:false, wer:null} : null;
    },
    daten:(F, x) => ({wer:x.wer, wert:x.wert, sieg:x.sieg, W:F.W, L:F.L, hoch:F.hoch, tief:F.tief}),
    text:(F, x) => {
      if(!x.wer) return {t:`Die Liga spielt ihren ${x.wert}. Satz`, d:`Der erste war am ${datumFmt(mts(_spBasis().chrono[0]), 'tmj')}.`};
      const eig = _spEigene(x.wer, F.m);
      if(x.sieg) return {t:`${_spName(x.wer)} feiert den ${x.wert}. Sieg`, d:`Dafür brauchte es ${eig.length} Sätze.`};
      const s = F.zahl[x.wer].s;
      return {t:`${_spName(x.wer)} bestreitet den ${x.wert}. Satz`, d:`${s} davon endeten mit einem Sieg.`};
    }},
  // ── Sechs Formen nur für neue Karten (`v2`) ─────────────────────────
  // Gemessen trugen 52 Partien in vierzehn Tagen elf verschiedene Köpfe,
  // und drei davon (Tacho, Tafel, Band) standen auf fast der Hälfte. Diese
  // sechs zeigen Seiten einer Partie, die vorher keine Zeichnung hatte. Die
  // alte Formkette (`_spForm`) für Karten ohne gespeichertes Bild kennt sie
  // nicht: sonst änderte sich das Bild einer Karte, die längst dasteht [§C33].
  // Das Tauziehen: zwei bis fünf Games Abstand. Der Knoten steht so weit auf
  // der Seite der Sieger, wie ihr Anteil an den Games war.
  tauziehen:{rang:13, ic:'scaleBalance', v2:true,
    wann:F => F.diff >= 2 && F.diff <= 5 ? {} : null,
    daten:F => ({A:_spTeam(F.m, 'A'), B:_spTeam(F.m, 'B'), aw:F.W.includes(F.m.a1), W:F.W, L:F.L,
      hoch:F.hoch, tief:F.tief, anteil:F.anteil, delta:Object.assign({}, F.delta)}),
    text:F => _spKontext(F)},
  // Der Münzwurf: vor dem ersten Aufschlag lag keine Seite vorn (47 bis 53 %).
  muenze:{rang:18, ic:'target', v2:true,
    wann:F => F.c != null && Math.abs(F.c - 0.5) <= 0.03 ? {} : null,
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, pct:Math.round(F.c * 100)}),
    text:F => ({t:`${_spNl(F.W)} gewinnen den Münzwurf`, d:_spKontext(F).d})},
  // Die weiße Weste: ein Satz zu Null, kein Game abgegeben. Ein Sonderfall
  // wie der Krimi (`_spScoreSpezial`) mit eigener Zeichnung.
  weste:{rang:60, ic:'zuNull', v2:true,
    wann:F => _spZuNull(F.m) ? {} : null,
    daten:F => {
      const vor = _spBasis().chrono.slice(0, F.i).filter(y => partie(y).zuNull);
      const z = vor[vor.length - 1];
      return {W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, n:vor.length + 1, zuletzt:z ? mts(z) : null};
    },
    text:F => ({t:`${_spNl(F.W)} lassen kein Game zu`, d:`${F.satz} gegen ${_spNl(F.L)} — ein Satz zu Null.`})},
  // Die Uhr des Tages: ab der sechsten Partie eines Tages, jede als Strich
  // auf dem Zifferblatt, diese hell.
  uhr:{rang:24, ic:'clock', v2:true,
    wann:F => SP_TAG_STUFEN.has(F.tag.length) && F.tag.length >= 6 ? {n:F.tag.length} : null,
    daten:(F, x) => ({n:x.n, W:F.W, L:F.L, hoch:F.hoch, tief:F.tief,
      zeiten:F.tag.map(y => { const t = new Date(mts(y)); return t.getHours() * 60 + t.getMinutes(); })}),
    text:(F, x) => ({t:`Der ${_spZahl(x.n)}. Satz des Tages`, d:`${_spNl(F.W)} gewinnen gegen ${_spNl(F.L)}.`})},
  // Überholt: ein Sieger zieht in der Tabelle an einem Verlierer vorbei.
  ueberholt:{rang:30, ic:'ueberholen', v2:true,
    wann:F => {
      const r = id => F.rang[id];
      const paare = [];
      F.W.forEach(w => F.L.forEach(l => { const a = r(w), b = r(l);
        if(a && b && a.pre && b.pre && a.post && b.post && a.pre > b.pre && a.post < b.post)
          paare.push({w, l, wPre:a.pre, wPost:a.post, lPre:b.pre, lPost:b.post}); }));
      return paare.sort((a, b) => a.wPost - b.wPost || a.lPost - b.lPost)[0] || null;
    },
    daten:(F, x) => Object.assign({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief}, x),
    text:(F, x) => ({t:`${_spName(x.w)} zieht an ${_spName(x.l)} vorbei`, d:`Vorher Platz ${x.wPre}, jetzt Platz ${x.wPost}.`})},
  // Duo gegen Duo: dieselben zwei Paare, und dieses gewinnt zum dritten
  // Mal oder öfter in Folge.
  duoserie:{rang:28, ic:'crossedSwords', v2:true,
    wann:F => {
      const folge = F.treffen.map(y => _spGew(y, F.W[0]));
      let k = 0;
      for(let j = folge.length - 1; j >= 0 && folge[j]; j--) k++;
      return (k === 3 || k === 5 || k === 7 || k === 10 || (k > 10 && k % 5 === 0))
        ? {k, n:folge.length, s:folge.filter(Boolean).length, folge:folge.slice(-16)} : null;
    },
    gewicht:x => 28 + Math.min(10, x.k),
    daten:(F, x) => Object.assign({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, awA:F.m.winner === 'A'}, x),
    text:(F, x) => ({t:`${_spNl(F.W)} schlagen ${_spNl(F.L)} zum ${x.k}. Mal in Folge`,
      d:`In diesem Duell steht es ${x.s}:${x.n - x.s}.`})},
  // ── Die Köpfe des Katalogs ────────────────────────────────────────
  // Drei Grundansichten, die für jede Partie wahr sind, und zwei besondere
  // Ausgänge mit festem Bild. Der Elo-Transfer, die Ergebniszeile, der
  // Abstand und die Klapptafel des Krimis kommen in keinem neuen Kopf mehr
  // vor: der Transfer zeigte die Verlierer links, die Klapptafel „9 : 10"
  // auch, und Zeile und Abstand sagten, was jede Ansicht zeigt.
  // Die Anzeigetafel: der Endstand auf Klappziffern, neben jedem Paar das
  // Elo jedes Spielers, darunter die Siegchance vor der Partie.
  tafel:{rang:10, ic:'court', v2:true,
    wann:() => ({}),
    daten:F => _spKopfDaten(F),
    text:F => _spKontext(F)},
  // Die Pucks zählten Tore bis zehn; ein Padel-Ergebnis hat keine solche
  // Leiter, die Form wird nicht mehr gewählt.
  pucks:{rang:10, ic:'padelBall', v2:true,
    wann:() => null,
    daten:F => _spKopfDaten(F),
    text:F => _spKontext(F)},

  // Der Elo-Strom: was von den Verlierern zu den Siegern floss, je Spieler
  // so breit wie seine Punkte.
  strom:{rang:10, ic:'bolt', v2:true,
    wann:() => ({}),
    daten:F => _spKopfDaten(F),
    // Die Elo zeigt der Strom selbst; „holen zusammen 60 Elo" stand über
    // der Zeichnung, die genau das zeichnet.
    text:F => _spKontext(F)},
  // Die Lebensbalken (`_spBalkenBild`): was jedem Team am Ende blieb.
  balken:{rang:10, ic:'chartBar', v2:true,
    wann:() => ({}),
    daten:F => _spKopfDaten(F),
    text:F => _spKontext(F)},
  // Das Herzschlagfinale: im Tiebreak entschieden. Bei den Siegern schlägt
  // der Puls bis zum letzten Ballwechsel hoch, bei den Verlierern läuft er
  // flach aus.
  herz:{rang:58, ic:'nerves', v2:true,
    wann:F => _spKrimi(F.m) ? {} : null,
    daten:F => Object.assign(_spKopfDaten(F), {nr:_spImMonat(F, _spKrimi)}),
    text:F => ({t:`${_spNl(F.W)} gewinnen im ${partie(F.m).mtb ? 'Match-Tiebreak' : 'Tiebreak'}`,
      d:`Es ist der ${_spImMonat(F, _spKrimi)}. Satz in diesem Monat, den der Tiebreak entscheidet.`})},
  // Der Doppel-Bagel: unter jedem Paar sein Netz. Bei den Siegern leer und
  // golden, bei den Verlierern so oft getroffen, wie Sätze an die Sieger gingen.
  zunull:{rang:60, ic:'weisseWeste', v2:true,
    wann:F => _spZuNull(F.m) ? {} : null,
    daten:F => Object.assign(_spKopfDaten(F), {nr:_spImMonat(F, _spZuNull),
      monat:seasonLabel(tagKey(mts(F.m)).slice(0, 7)).split(' ')[0]}),
    text:F => ({t:`${_spNl(F.W)} lassen kein Game zu`, d:`${F.satz} gegen ${_spNl(F.L)} — ein Satz zu Null.`})},
  // Der Court: wer auf welcher Seite stand. Er bleibt der Rückfall und
  // erzählt dann, wie oft sich genau diese beiden Duos schon trafen.
  feld:{rang:8, ic:'court',
    wann:() => ({}),
    daten:F => _spFeldDaten({m:F.m, c:F.c}),
    text:F => _spKontext(F)}
};

// Die Kandidaten einer Partie, schwerste zuerst.
function _spFormKand(m){
  const FB = _spFormBasis();
  let k = FB.kand.get(m.id);
  if(k) return k;
  const F = _spFakten(m);
  k = Object.keys(SP_FORM).map(key => { const f = SP_FORM[key]; let x = null;
    try { x = f.wann(F); } catch(e){ x = null; }
    return x ? {key, x, rang:Math.max(f.rang, f.gewicht ? f.gewicht(x) : 0)} : null; })
    .filter(Boolean).sort((a, b) => b.rang - a.rang);
  FB.kand.set(m.id, k);
  return k;
}
// Ist die Partie eine gewöhnliche, also ohne Anlass aus den Partien selbst?
function _spIstFeld(m){
  const c = _spChance(m);
  return !(c != null && c < CHANCE_UPSET) && _spAnlassDaten(m).key === 'feld';
}
// ── Die Wahl: abwechslungsreich und trotzdem fest ────────────────────
// Die schwerste zutreffende Form, die in den beiden gewöhnlichen Partien
// davor nicht stand; was in den zehn davor schon stand, wiegt sieben Punkte
// weniger, und das Spielfeld kommt höchstens einmal je fünf. „Davor" ist
// die Form, die dort WIRKLICH steht: die Kette läuft einmal je Datenstand
// von der ersten Partie an. Ein Fenster, das für jede Karte zwölf Partien
// zurück neu anfing, nahm für die Partie davor gemessen fünfmal eine andere
// Form an als die, die dort stand, und dann standen zwei gleiche
// hintereinander. Die Kette sieht nur Partien vor der Karte, also bleibt
// eine Form stehen, wenn später gespielt wird [§C33].
function _spForm(m){
  const FB = _spFormBasis();
  let w = FB.wahl.get(m.id);
  if(w) return w;
  const B = _spBasis(), bis = B.idx.get(m.id);
  if(!FB.spur){ FB.spur = []; FB.spurBis = -1; }
  for(let j = FB.spurBis + 1; j <= bis; j++){
    const x = B.chrono[j], spur = FB.spur;
    FB.spurBis = j;
    if(!_spIstFeld(x)) continue;
    const k = _spFormKand(x).filter(c => !SP_FORM[c.key].v2), zuletzt = spur[spur.length - 1];
    const oft = key => spur.slice(-10).filter(s => s === key).length;
    const frei = k.filter(c => !spur.slice(-2).includes(c.key) && (c.key !== 'feld' || !spur.slice(-4).includes('feld')))
      .map(c => Object.assign({}, c, {eff:c.rang - 7 * oft(c.key)})).sort((a, b) => b.eff - a.eff);
    // Ist alles Zutreffende gerade erst dagewesen, kommt das Spielfeld: es
    // passt immer, und zweimal dieselbe Form hintereinander liest sich wie
    // eine Wiederholung.
    const c = frei[0] || k.find(c => c.key === 'feld' && zuletzt !== 'feld') || k.find(c => c.key !== zuletzt) || k[0];
    FB.wahl.set(x.id, c);
    spur.push(c.key);
  }
  // Eine Partie mit Anlass ist nicht Teil der Kette; fragt doch jemand,
  // bekommt sie die schwerste Form, ohne die Kette zu verschieben.
  return FB.wahl.get(m.id) || _spFormKand(m).filter(c => !SP_FORM[c.key].v2)[0];
}
// Schlagzeile und Satz einer gewöhnlichen Partie, oder null. Neue V2-Karten
// formulieren die Partie aus derselben Score-Wahl, die sie anschliessend
// zeichnen. Der Text einer gespeicherten Karte steht in der Karte; die alte
// Formkette (`_spForm`) zeichnet nur noch das Bild historischer V1-Karten.
function _spScoreText(m){
  if(!_spIstFeld(m)) return null;
  const w = _spScoreWahl(m);
  if(w && w.key === 'zeile') return SP_FORM.feld.text(_spFakten(m), {});
  if(w && w.key === 'abstand'){
    const F = _spFakten(m);
    return {t:`${_spNl(F.W)} gewinnen mit ${F.diff} Games Abstand`,
      d:`${F.satz} gegen ${_spNl(F.L)}. Der Abstand ist die Geschichte dieses Satzes.`};
  }
  return w && SP_FORM[w.key] ? SP_FORM[w.key].text(_spFakten(m), w.x) : null;
}
function _spFormBild(m){
  const w = _spForm(m), f = SP_FORM[w.key];
  return {key:w.key, glanz:w.key === 'zaehlwerk' || w.key === 'rueckkehr' || w.key === 'transfer' || (w.key === 'gegner' && w.x.fluch),
    html:SP_FORM_BILD[w.key](f.daten(_spFakten(m), w.x))};
}

// ── Die Bilder der Formen ────────────────────────────────────────────
// Jedes zeichnet nur, was `daten` ihm gibt [§11.6c].
function _spMosaikBild(d){
  const sum = d.n.reduce((s, v) => s + v, 0) || 1, max = Math.max(1, ...d.n.slice(1));
  const feld = k => `<div class="sp-mo-k${k === d.diff ? ' jetzt' : ''}" style="--a:${(d.n[k] / max).toFixed(2)};--i:${10 - k}">`
    + (k === d.diff ? _spSt(d) : `<b class="num">10:${10 - k}</b>`) + `<span class="num">${_spZahl(Math.round(d.n[k] / sum * 100))} %</span></div>`;
  const label = d.grund === 'selten' ? 'SELTENER AUSGANG'
    : (d.grund === 'haeufig' ? 'HÄUFIGSTER AUSGANG' : 'RUNDE ZAHL');
  const beleg = d.grund === 'marke'
    ? `${_spZahl(d.mal)}. Satz mit diesem Ergebnis`
    : `${_spZahl(d.mal)} von ${_spZahl(d.gesamt || sum)} Sätzen`;
  return `<div class="sp-fk sp-mo"><div class="sp-mo-g">${Array.from({length:10}, (_, i) => feld(10 - i)).join('')}</div>`
    + (d.grund ? `<div class="sp-mo-a"><b>${label}</b><span>${beleg}</span></div>` : '')
    + _spNz(d.W, d.L) + `</div>`;
}
function _spTachoBild(d){
  const a = p => { const w = (p / 100 * 180 - 180) * Math.PI / 180; return [50 + 40 * Math.cos(w), 50 + 40 * Math.sin(w)]; };
  const [x1, y1] = a(d.pct);
  const ticks = [0, 25, 50, 75, 100].map(t => { const w = (t / 100 * 180 - 180) * Math.PI / 180;
    return `<line x1="${(50 + 33 * Math.cos(w)).toFixed(1)}" y1="${(50 + 33 * Math.sin(w)).toFixed(1)}" x2="${(50 + 29 * Math.cos(w)).toFixed(1)}" y2="${(50 + 29 * Math.sin(w)).toFixed(1)}"/>`; }).join('');
  return `<div class="sp-fk sp-ta"><div class="sp-ta-u"><svg viewBox="0 0 100 56" aria-hidden="true">
      <path class="sp-ta-g" d="M10 50A40 40 0 0 1 90 50"/><path class="sp-ta-f" d="M10 50A40 40 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>
      <g class="sp-ta-t">${ticks}</g><g class="sp-ta-n" style="--w:${(d.pct / 100 * 180 - 90).toFixed(1)}deg"><line x1="50" y1="50" x2="50" y2="17"/><circle cx="50" cy="50" r="3.2"/></g></svg>
      <b class="num">${_spZahl(d.pct)} %</b><span>Siegchance vorher</span></div>
    <div class="sp-ta-r">${_spChips(d.W)}${_spSt(d)}<em>${d.klar ? 'so klar wie erwartet' : 'knapper als die Rechnung'}</em></div></div>`
    + _spNz(d.W, d.L);
}
function _spStreuBild(d){
  const X = c => 6 + c * 88, Y = v => 52 - Math.min(10, v) * 4.4;
  const max = Math.max(1, ...d.bins.map(b => b.n));
  const wolke = d.bins.map(b => `<rect x="${(X(b.c) - 2.1).toFixed(1)}" y="${(Y(b.d) - 2.1).toFixed(1)}" width="4.2" height="4.2" rx="1" style="opacity:${(0.15 + b.n / max * 0.6).toFixed(2)}"/>`).join('');
  const erw = d.erw.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ');
  return `<div class="sp-fk sp-sd"><svg viewBox="0 0 100 56" aria-hidden="true">
      <line class="sp-sd-ax" x1="6" y1="54" x2="96" y2="54"/><line class="sp-sd-ax" x1="6" y1="4" x2="6" y2="54"/>
      <g class="sp-sd-w">${wolke}</g>${erw ? `<polyline class="sp-sd-e" points="${erw}"/>` : ''}
      <circle class="sp-sd-r" cx="${X(d.c).toFixed(1)}" cy="${Y(d.diff).toFixed(1)}" r="4.6"/><circle class="sp-sd-p" cx="${X(d.c).toFixed(1)}" cy="${Y(d.diff).toFixed(1)}" r="2.2"/></svg>
    <div class="sp-sd-t">${_spSt(d)}<em>${d.knapp ? 'knapper als erwartet' : 'deutlicher als erwartet'}</em>
      <span>bei <b class="num">${_spZahl(Math.round(d.c * 100))} %</b> Siegchance so ${d.knapp ? 'eng' : 'klar'} nur <b class="num">${_spZahl(d.so)}</b> von <b class="num">${_spZahl(d.gesamt)}</b></span></div>
    <div class="sp-sd-a"><span>↑ Games Abstand</span><span>Siegchance →</span></div></div>`
    + _spNz(d.W, d.L);
}
function _spTransferBild(d){
  const seite = (ids, w) => `<div class="sp-et-s${w ? ' w' : ''}">${ids.map(id => `<div class="sp-et-p">${_spWappen(id, 48)}`
    + `<em class="num ${d.delta[id] >= 0 ? 'g' : 'r'}">${_spVz(d.delta[id])}</em></div>`).join('')}</div>`;
  const punkte = Array.from({length:12}, (_, k) => `<i style="--i:${k};top:${(8 + (k * 37) % 84)}%"></i>`).join('');
  return `<div class="sp-fk sp-et">${seite(d.L, false)}<div class="sp-et-m">${punkte}`
    + `<b class="num">${_spVz(d.gewinn)}</b><span>Elo</span>${_spSt(d)}</div>${seite(d.W, true)}</div>`
    + _spNz(d.L, d.W, 'an');
}
function _spChemieBild(d){
  const n = d.folge.length, r = 21, U = 2 * Math.PI * r, l = U / Math.max(1, n);
  const seg = d.folge.map((w, k) => `<circle r="${r}" cx="28" cy="28" class="${w ? 'w' : 'l'}${k === n - 1 ? ' jetzt' : ''}" `
    + `style="stroke-dasharray:${Math.max(0.5, l - 1.2).toFixed(2)} ${(U - l + 1.2).toFixed(2)};stroke-dashoffset:${(-l * k).toFixed(2)};--i:${k}"/>`).join('');
  return `<div class="sp-fk sp-ch"><div class="sp-ch-d">${_spWappen(d.A, 48)}<div class="sp-ch-r"><svg viewBox="0 0 56 56" aria-hidden="true">${seg}</svg>`
    + `<span><b class="num">${_spZahl(d.s)}.</b><i>DUO-SIEG</i></span></div>${_spWappen(d.B, 48)}</div>`
    // Auf der Karte zählt der Ring selbst: „18. Duo-Sieg" in einem Ring aus
    // allen gemeinsamen Partien. Der Satz darunter wiederholte die 18.
    + (d.nurAnlass ? '' : `<div class="sp-ch-u">${_spSt(d)}<span><b class="num">${_spZahl(d.s)}</b> von <b class="num">${_spZahl(d.p)}</b> zusammen gewonnen</span></div>`) + `</div>`
    + (d.nurAnlass ? '' : _spNz([d.A, d.B], d.L));
}
function _spGegnerBild(d){
  return `<div class="sp-fk sp-gg"><div class="sp-gg-p w">${_spWappen(d.w, 48)}</div>
    <div class="sp-gg-m"><em>${d.fluch ? 'Fluch gebrochen' : 'Lieblingsgegner'}</em>
      <span class="sp-gg-b num">${d.ab ? `${_spZahl(d.n - d.s)}:<b>${_spZahl(d.s)}</b>` : `<b>${_spZahl(d.s)}</b>:${_spZahl(d.n - d.s)}`}</span>
      <span class="sp-gg-r">${d.folge.map((w, k) => `<i class="${w ? 'w' : 'l'}${k === d.folge.length - 1 ? ' jetzt' : ''}" style="--i:${k}"></i>`).join('')}</span>
      ${d.nurAnlass ? '' : `<span class="sp-gg-h">heute ${_spSt(d)}</span>`}</div>
    <div class="sp-gg-p">${_spWappen(d.l, 48)}</div></div>`
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
function _spRevancheBild(d){
  return `<div class="sp-fk sp-rv"><span class="sp-rv-c">${_spChips(d.W)}</span>
    <div class="sp-rv-m"><span class="sp-rv-t alt"><i>vorher</i><b class="num">${d.ab ? _spZahl(d.vHoch) + ':' + _spZahl(d.vTief) : _spZahl(d.vTief) + ':' + _spZahl(d.vHoch)}</b></span>
      <span class="sp-rv-p"><svg viewBox="0 0 60 24" aria-hidden="true"><path d="M4 18C18 2 42 2 56 16"/><path class="k" d="M50 15L56 16L55 10"/></svg>
        <i>nach ${_spZahl(d.seit.n)} ${d.seit.e}</i></span>
      <span class="sp-rv-t neu"><i>jetzt</i>${_spSt(d)}</span></div>
    <span class="sp-rv-c re">${_spChips(d.L)}</span></div>`
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
function _spGipfelBild(d){
  return `<div class="sp-fk sp-gp">${d.zeilen.map((z, k) => `<div class="sp-gp-z${z.w ? ' w' : ''}" style="--i:${k}">`
    + `<span class="num">${z.pre ? _spZahl(z.pre) + '.' : '–'}</span>${_spChip(z.id)}<span class="sp-gp-n">${esc(_spName(z.id))}</span>`
    + `<em class="num ${z.post && z.pre && z.post < z.pre ? 'g' : z.post && z.pre && z.post > z.pre ? 'r' : ''}">${z.post && z.post !== z.pre ? '→ ' + _spZahl(z.post) + '.' : '='}</em></div>`).join('')}
    <div class="sp-gp-f">${d.nurAnlass ? '' : _spSt(d)}<span>Platz 1 und 2 auf dem Court</span></div></div>`;
}
function _spRueckkehrBild(d){
  const n = Math.min(28, d.tage + 1);
  return `<div class="sp-fk sp-zu">${_spWappen(d.id, 48)}<div class="sp-zu-m">
      <span class="sp-zu-z"><b class="num">${_spZahl(d.tage)}</b> ${d.nurAnlass ? 'Tage' : 'Tage Pause'}</span>
      <span class="sp-zu-k">${Array.from({length:n}, (_, k) => `<i class="${k === 0 ? 'alt' : ''}" style="--i:${k}"></i>`).join('')}${d.nurAnlass ? '' : _spSt(d)}</span></div></div>`
    + (d.nurAnlass ? '' : _spUnter(`${_spNb(d.id)} mit ${_spNb(d.mit)} gegen ${_spUnd(d.L)}.`));
}
function _spGefaelleBild(d){
  const ids = d.W.concat(d.L), lo = Math.min(...ids.map(id => d.elo[id])), hi = Math.max(...ids.map(id => d.elo[id]));
  const h = id => 20 + Math.round((d.elo[id] - lo) / Math.max(1, hi - lo) * 60);
  const s = (id, w, k) => `<span class="sp-gf-s${w ? ' w' : ''}" style="--i:${k}"><b class="num">${(d.elo[id] < 0 ? '−' : '') + _spZahl(d.elo[id])}</b>`
    + `<i style="height:${h(id)}%"></i>${_spChip(id)}</span>`;
  const team = (t, w, k) => `<div class="sp-gf-t${w ? ' w' : ''}"><div class="sp-gf-ss">${t.map((id, j) => s(id, w, k + j)).join('')}</div>`
    + `<small class="num">${_spZahl(Math.abs(d.elo[t[0]] - d.elo[t[1]]))} Elo dazwischen</small></div>`;
  return `<div class="sp-fk sp-gf">${team(d.W, true, 0)}${_spSt(d)}${team(d.L, false, 2)}</div>` + _spNz(d.W, d.L);
}
function _spTagesringBild(d){
  const n = d.folge.length, r = 30, U = 2 * Math.PI * r, l = U / n, s = d.folge.filter(Boolean).length;
  const seg = d.folge.map((w, k) => `<circle r="${r}" cx="38" cy="38" class="${w ? 'w' : 'l'}${k === n - 1 ? ' jetzt' : ''}" `
    + `style="stroke-dasharray:${Math.max(0.5, l - 2.4).toFixed(2)} ${(U - l + 2.4).toFixed(2)};stroke-dashoffset:${(-l * k).toFixed(2)};--i:${k}"/>`).join('');
  return `<div class="sp-fk sp-tr"><div class="sp-tr-r"><svg viewBox="0 0 76 76" aria-hidden="true">${seg}</svg><span>${_spWappen(d.id, 48)}</span></div>
    <div class="sp-tr-t"><em>heute</em><span class="sp-tr-z"><b class="num">${_spZahl(s)}</b> von ${_spZahl(n)}</span>
      <span class="sp-tr-j">Satz ${_spZahl(n)}${d.nurAnlass ? '' : ' ' + _spSt(d)}</span></div></div>`
    + (d.nurAnlass ? '' : _spUnter(`${_spNb(d.id)} mit ${_spNb(d.mit)} gegen ${_spUnd(d.L)}.`));
}
function _spZaehlwerkBild(d){
  const z = String(d.wert).padStart(3, '0').split('');
  const einheit = d.label || (d.wer ? (d.sieg ? 'Sieg' : 'Satz') : 'Satz der Liga');
  // Die Ziffer steht als Text da, das Rollband ist ein Pseudo-Element: ein Band aus
  // zehn Ziffern hinter overflow:hidden ist für jede Messung abgeschnittener Text,
  // und ohne Bewegung braucht es niemand.
  const rolle = c => `<span class="sp-zw-r" style="--z:${c}"><b>${c}</b></span>`;
  return `<div class="sp-fk sp-zw">${d.wer ? _spWappen(d.wer, 48) : `<span class="sp-zw-l">${svgI('ball')}</span>`}
    <div class="sp-zw-m"><span class="sp-zw-w num">${z.map(rolle).join('')}</span>
      <span class="sp-zw-u">${(SP_MEHRZAHL[einheit] || einheit) + (!d.nurAnlass && d.wer && _spPasst([d.wer], 12, true) ? ` von ${esc(_spName(d.wer))}` : '')}</span></div>
    ${d.nurAnlass ? '' : `<div class="sp-zw-s">${_spSt(d)}</div>`}</div>`
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
// Runde Zahlen: jeder, der in dieser Partie eine erreicht, mit seiner Zahl
// auf Klappziffern und dem, was gezählt wird. Der Name bricht um statt
// abzuschneiden, und wird die Zahl so lang, dass er keinen Platz mehr
// hätte, rückt sie mit ihrer Einheit in die Zeile darunter. Höchstens vier,
// die schwersten zuerst: vier Zeilen sind schon die Höhe eines Kopfs, und
// jede steht ohnehin als Zeile der Karte oder ihres Blatts.
// Ein Zähler zeigt eine Menge, keine Ordnungszahl: „450 Partien der Liga".
const SP_MEHRZAHL = {Sieg:'Siege', Partie:'Sätze', Game:'Games', 'Satz der Liga':'Sätze der Liga'};
function _spMarkenBild(d){
  const l = ((d && d.liste) || []).filter(x => pmap()[x.pid]).slice(0, 4);
  if(!l.length) return '';
  // Ohne Ordnungspunkt und mit der Einheit in der Mehrzahl: „150 Siege".
  // Der Punkt stand nach den Klappziffern allein auf der Grundlinie und las
  // sich als „1 5 0 ." [§C33].
  const ziffern = x => _spZahl(x.wert).split('').map(c => /\d/.test(c) ? `<i>${c}</i>` : `<s>${c}</s>`).join('');
  return `<div class="sp-fk sp-zm"><div class="sp-k">${l.length > 1 ? 'Runde Zahlen in diesem Satz' : 'Runde Zahl'}</div>`
    + l.map(x => `<div class="sp-zm-z">${_spChip(x.pid)}<b>${esc(_spName(x.pid))}</b>`
      + `<span class="sp-zm-n"><span class="sp-zm-d num">${ziffern(x)}</span><em>${esc(SP_MEHRZAHL[x.label] || x.label)}</em></span></div>`).join('') + `</div>`;
}
// ── Ein Liniendiagramm und eine kleine Rangliste ────────────────────
// Für die Fakten des Katalogs [§C33]. Links die Achse mit runden Werten,
// unten Anfang und Ende, eine Bezugslinie mit ihrem Wert, am Ende Punkt und
// Wert; die Achse weicht der Bezugslinie aus. Über und unter ihr zwei
// Farben, wo sie eine Richtung trennt [§C25]. Die Schrift steht in neun
// Einheiten: die Zeichnung ist 244 breit und auf dem schmalsten Telefon
// 216 px, darin bleibt sie über 8 px.
// Ein runder Schritt für höchstens vier Abstände, bei jeder Spanne: eine
// feste Reihe bis 500 legte bei 14 000 Elo Spanne fünfzehn Werte
// übereinander.
function _spSchritt(span){
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, span / 4))));
  return [1, 2, 2.5, 5, 10].map(k => k * p).find(s => span / s <= 4) || 10 * p;
}
function _spLinie(v, o){
  const W = 244, H = 80, OB = 8, UN = 16, n = v.length - 1;
  const f = o.fmt || (y => (y < 0 ? '−' : '') + _spZahl(y)), r = x => x.toFixed(1);
  let lo = Math.min(...v, o.ref != null ? o.ref : Infinity, o.lo != null ? o.lo : Infinity);
  let hi = Math.max(...v, o.ref != null ? o.ref : -Infinity, o.hi != null ? o.hi : -Infinity);
  if(hi === lo){ hi += 1; lo -= 1; }
  const st = _spSchritt(hi - lo); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
  // Die Ränder wachsen mit der längsten Beschriftung: mit festen Rändern
  // ragte „12.345:12.344" rechts aus der Karte und „−12.000" links.
  const ende = String(o.ende != null ? o.ende : f(v[n]));
  const LI = Math.max(32, 8 + 5.6 * Math.max(String(f(lo)).length, String(f(hi)).length));
  const RE = Math.max(38, 12 + 6.2 * ende.length);
  const X = i => LI + i * (W - LI - RE) / Math.max(1, n), Y = y => OB + (hi - y) * (H - OB - UN) / (hi - lo);
  const ticks = [];
  for(let y = lo; y <= hi + 1e-9; y += st) if(o.ref == null || Math.abs(Y(y) - Y(o.ref)) >= 10) ticks.push(y);
  const d = v.map((y, i) => (i ? 'L' : 'M') + r(X(i)) + ' ' + r(Y(y))).join('');
  const basis = o.ref != null ? o.ref : lo, id = 'spl' + _spVisualHash(v.join() + '|' + o.ref + '|' + (o.x || []).join());
  const flaeche = `${d}L${r(X(n))} ${r(Y(basis))}L${r(X(0))} ${r(Y(basis))}Z`;
  const fl = o.zwei
    ? `<clipPath id="${id}o"><rect x="0" y="0" width="${W}" height="${r(Y(o.ref))}"/></clipPath>`
      + `<clipPath id="${id}u"><rect x="0" y="${r(Y(o.ref))}" width="${W}" height="${H}"/></clipPath>`
      + `<path class="sp-ln-f" clip-path="url(#${id}o)" d="${flaeche}"/><path class="sp-ln-f neg" clip-path="url(#${id}u)" d="${flaeche}"/>`
      + `<path class="sp-ln-l" clip-path="url(#${id}o)" d="${d}"/><path class="sp-ln-l neg" clip-path="url(#${id}u)" d="${d}"/>`
    : `<path class="sp-ln-f" d="${flaeche}"/><path class="sp-ln-l" d="${d}"/>`;
  const ey = Math.min(H - UN - 1, Math.max(OB + 7, Y(v[n]) + 3.5));
  // Passen Anfang und Ende unten nicht nebeneinander, steht nur das Ende:
  // „24.628. Duell" und „24.689. Duell" lagen sonst übereinander.
  const [xa, xe] = [String((o.x || [])[0] || ''), String((o.x || [])[1] || '')];
  const anfang = 5.4 * (xa.length + xe.length) + 10 <= X(n) - LI;
  return `<svg class="sp-ln-s" viewBox="0 0 ${W} ${H}" aria-hidden="true">`
    + ticks.map(y => `<line class="sp-ln-g" x1="${LI}" x2="${W - RE}" y1="${r(Y(y))}" y2="${r(Y(y))}"/>`
      + `<text class="sp-ln-t" x="${LI - 5}" y="${r(Y(y) + 3)}">${esc(f(y))}</text>`).join('')
    + (o.ref != null ? `<line class="sp-ln-r" x1="${LI}" x2="${W - RE}" y1="${r(Y(o.ref))}" y2="${r(Y(o.ref))}"/>`
      + `<text class="sp-ln-t ref" x="${LI - 5}" y="${r(Y(o.ref) + 3)}">${esc(f(o.ref))}</text>` : '')
    + fl
    + (o.letzt && n > 0 ? `<path class="sp-ln-l letzt" d="M${r(X(n - 1))} ${r(Y(v[n - 1]))}L${r(X(n))} ${r(Y(v[n]))}"/>` : '')
    + (o.fahne ? `<path class="sp-ln-fahne" d="M${r(X(n))} ${r(Y(v[n]) - 5)}v-13l9 3.5-9 3.5"/>` : '')
    + `<circle class="sp-ln-p${o.zwei && v[n] < o.ref ? ' neg' : ''}" cx="${r(X(n))}" cy="${r(Y(v[n]))}" r="4"/>`
    + `<text class="sp-ln-w" x="${r(X(n) + 8)}" y="${r(ey)}">${esc(ende)}</text>`
    + (anfang ? `<text class="sp-ln-x" x="${LI}" y="${H - 3}">${esc(xa)}</text>` : '')
    + `<text class="sp-ln-x re" x="${r(X(n))}" y="${H - 3}">${esc(xe)}</text></svg>`;
}
// Platz, Gesicht und Name, ein Balken bis `max`, der Wert und eine Zahl
// daneben, wahlweise ein Strich für den Schnitt. Der Name bricht um.
function _spRangliste(l, o){
  return `<table class="sp-rl"><thead><tr><th></th><th></th><th></th><th>${esc(o.kopf[0])}</th><th>${esc(o.kopf[1])}</th></tr></thead><tbody>`
    + l.map((q, i) => `<tr class="${q.id === o.hervor ? 'an' : ''}"><td class="num">${_spZahl(i + 1)}.</td>`
      + `<td><span class="sp-rl-n">${_spChip(q.id)}<span>${esc(_spName(q.id))}</span></span></td>`
      + `<td class="sp-rl-b"><i style="width:${Math.min(100, q.wert / o.max * 100).toFixed(1)}%"></i>`
      + (o.schnitt != null ? `<u style="left:${Math.min(100, o.schnitt / o.max * 100).toFixed(1)}%"></u>` : '') + `</td>`
      + `<td class="num">${esc(q.zahl)}</td><td class="num sp-rl-a">${esc(q.neben)}</td></tr>`).join('')
    + `</tbody></table>`;
}
// ── Die Füße der sieben Fakten ──────────────────────────────────────
// Jeder rechnet aus den Partien bis zu dieser (`…Daten`) und zeichnet nur,
// was er bekommt (`…Bild`), wie jeder Fuß [§C33].
function _spKipptDaten(a){
  const w = a.x.pid, l = a.x.gegen;
  const duelle = _spEigene(w, a.m).filter(x => [x.a1, x.a2, x.b1, x.b2].includes(l) && _spSeite(x, w) !== _spSeite(x, l));
  let d = 0; const voll = [0].concat(duelle.map(x => (d += _spGew(x, w) ? 1 : -1)));
  // Sechzig Duelle reichen für die Kurve; davor zählt nur, wo sie stand.
  const ab = Math.max(0, voll.length - 61);
  return duelle.length ? {w, l, s:duelle.filter(x => _spGew(x, w)).length, n:duelle.length, ab, verlauf:voll.slice(ab)} : null;
}
function _spKipptBild(d){
  if(!d || !d.verlauf || d.verlauf.length < 3) return '';
  return `<div class="sp-fk sp-ln"><div class="sp-k">Bilanz, Duell für Duell</div>`
    + `<div class="sp-ln-lg">${_spChip(d.w)}<small>darüber ${esc(_spName(d.w))} vorn</small>${_spChip(d.l)}<small>darunter ${esc(_spName(d.l))}</small></div>`
    + _spLinie(d.verlauf, {ref:0, zwei:true, fmt:_spVz, letzt:true, ende:`${_spZahl(d.s)}:${_spZahl(d.n - d.s)}`,
      x:[d.ab ? `${_spZahl(d.ab)}. Duell` : 'Beginn', `${_spZahl(d.n)}. Duell`]}) + `</div>`;
}
function _spWocheDaten(a){
  const B = _spBasis(), i = B.idx.get(a.m.id), wk = _wochenKey(a.m.created_at), je = {};
  for(let j = i; j != null && j >= 0 && _wochenKey(B.chrono[j].created_at) === wk; j--){
    const x = B.chrono[j], W = _spSieger(x);
    [x.a1, x.a2, x.b1, x.b2].forEach(id => { if(!id) return; const z = je[id] || (je[id] = {s:0, n:0}); z.n++; if(W.includes(id)) z.s++; });
  }
  const liste = Object.keys(je).filter(id => je[id].s >= 5 && _spNoch(id, a.m))
    .map(id => ({id, s:je[id].s, n:je[id].n, q:Math.round(100 * je[id].s / je[id].n)}))
    .sort((p, q) => q.s / q.n - p.s / p.n || q.s - p.s).slice(0, 5);
  return liste.length ? {pid:a.x.pid, liste} : null;
}
function _spWocheBild(d){
  if(!d || !d.liste) return '';
  return `<div class="sp-fk sp-ln"><div class="sp-k">Siegquote der Woche, ab fünf Siegen</div>`
    + _spRangliste(d.liste.map(q => ({id:q.id, wert:q.q, zahl:_spZahl(q.q) + ' %', neben:`${_spZahl(q.s)}/${_spZahl(q.n)}`})),
      {hervor:d.pid, max:100, kopf:['Quote', 'Siege']}) + `</div>`;
}
function _spTagEloDaten(a, ref){
  const pid = a.x.pid, tag = tagKey(a.m.created_at);
  let e = 0;
  const verlauf = [0].concat(_spEigene(pid, a.m).filter(x => tagKey(x.created_at) === tag).map(x => (e += _newsEloDelta(pid, x.id) || 0)));
  return verlauf.length >= 2 ? {pid, ref, verlauf} : null;
}
function _spTagEloBild(d){
  if(!d || !d.verlauf) return '';
  const n = d.verlauf.length - 1, hoehe = d.ref > 0, x = ['Beginn', `${_spZahl(n)}. Satz`];
  return `<div class="sp-fk sp-ln"><div class="sp-k">Elo des Tages, ${esc(_spName(d.pid))}</div>`
    + _spLinie(d.verlauf, hoehe ? {ref:d.ref, lo:0, fmt:_spVz, x, fahne:true} : {ref:0, zwei:true, fmt:_spVz, x}) + `</div>`;
}
function _spMonatEloDaten(a){
  const pid = a.x.pid, sid = seasonOf(a.m.created_at).id, H = getHistoryByMatchId();
  const verlauf = _spEigene(pid, a.m).filter(x => seasonOf(x.created_at).id === sid)
    .map(x => Math.round(((H.get(x.id) || {}).eloAfter || {})[pid] || 0));
  return verlauf.length >= 2 ? {pid, sid, verlauf} : null;
}
// Der Schritt dieser Partie hebt sich ab, in der Richtung, die er hat.
function _spMonatEloBild(d){
  if(!d || !d.verlauf) return '';
  const n = d.verlauf.length;
  return `<div class="sp-fk sp-ln metall"><div class="sp-k">Elo im ${esc(seasonLabel(d.sid).split(' ')[0])}, ${esc(_spName(d.pid))}</div>`
    + _spLinie(d.verlauf, {letzt:true, x:['1. Satz', `${_spZahl(n)}. Satz`]}) + `</div>`;
}
function _spMonatQuoteDaten(a){
  const pid = a.x.pid, sid = seasonOf(a.m.created_at).id;
  let s = 0;
  const verlauf = _spEigene(pid, a.m).filter(x => seasonOf(x.created_at).id === sid)
    .map((x, i) => Math.round(100 * (s += _spGew(x, pid) ? 1 : 0) / (i + 1)));
  return verlauf.length >= 2 ? {pid, sid, verlauf} : null;
}
function _spMonatQuoteBild(d){
  if(!d || !d.verlauf) return '';
  const n = d.verlauf.length;
  return `<div class="sp-fk sp-ln"><div class="sp-k">Siegquote im ${esc(seasonLabel(d.sid).split(' ')[0])}, ${esc(_spName(d.pid))}</div>`
    + _spLinie(d.verlauf, {ref:50, zwei:true, lo:0, hi:100, fmt:y => _spZahl(y) + ' %', x:['1. Satz', `${_spZahl(n)}. Satz`]}) + `</div>`;
}
function _spPartnerDaten(a){
  const pid = a.x.pid, je = {};
  let s = 0, n = 0;
  _spEigene(pid, a.m).forEach(x => {
    const mit = _spTeam(x, _spSeite(x, pid)).find(y => y && y !== pid), w = _spGew(x, pid);
    n++; if(w) s++;
    if(!mit) return;
    const z = je[mit] || (je[mit] = {s:0, n:0}); z.n++; if(w) z.s++;
  });
  const liste = Object.keys(je).filter(id => je[id].n >= 6 && _spNoch(id, a.m))
    .map(id => ({id, s:je[id].s, n:je[id].n, q:Math.round(100 * je[id].s / je[id].n)}))
    .sort((p, q) => q.s / q.n - p.s / p.n || q.n - p.n).slice(0, 5);
  return liste.length ? {pid, mit:a.x.mit, liste, allg:Math.round(100 * s / Math.max(1, n))} : null;
}
function _spPartnerBild(d){
  if(!d || !d.liste) return '';
  return `<div class="sp-fk sp-ln metall"><div class="sp-k">Siegquote je Partner, ${esc(_spName(d.pid))}</div>`
    + _spRangliste(d.liste.map(q => ({id:q.id, wert:q.q, zahl:_spZahl(q.q) + ' %', neben:_spZahl(q.n)})),
      {hervor:d.mit, max:100, schnitt:d.allg, kopf:['Quote', 'Sätze']})
    + `<div class="sp-rl-lg"><i></i>${_spZahl(d.allg)} % mit allen</div></div>`;
}
// Welcher Fuß welchen Fakt zeichnet und woraus; das Blatt eines einzeln
// geöffneten Fakts zeichnet denselben (`_spFaktBild`).
const SP_FAKT_FUSS = {duell_kippt:'kippt', woche_spitze:'woche', tag_plus:'plus', tag_hoehe:'hoehe',
  monat_gewinn:'monatsbest', monat_halb:'halb', partner_best:'partner'};
const SP_FAKT_DATEN = {kippt:_spKipptDaten, woche:_spWocheDaten, plus:a => _spTagEloDaten(a, 0),
  hoehe:a => _spTagEloDaten(a, 75), monatsbest:_spMonatEloDaten, halb:_spMonatQuoteDaten, partner:_spPartnerDaten};
function _spFaktBild(d){
  const m = d && d.matchId && _spMatch(d.matchId), key = d && SP_FAKT_FUSS[d.type];
  if(!m || !key) return '';
  return _spOccasionBild({key, data:SP_FAKT_DATEN[key]({key, m, x:d})});
}
function _spTauziehenBild(d){
  // Der Knoten: so weit auf der Seite der Sieger, wie ihr Anteil an den Games.
  const anteil = d.anteil != null ? d.anteil : d.hoch / Math.max(1, d.hoch + d.tief);
  const pos = Math.round((d.aw ? 1 - anteil : anteil) * 100);
  const team = (ids, w) => `<div class="sp-tz-t${w ? ' w' : ''}">${_spChips(ids)}<span class="sp-tz-d">`
    + ids.map(id => `<i class="num ${d.delta[id] >= 0 ? 'g' : 'r'}">${_spVz(d.delta[id] || 0)}</i>`).join('') + `</span></div>`;
  return `<div class="sp-fk sp-tz">${team(d.A, d.aw)}<div class="sp-tz-s">`
    + `<span class="sp-tz-zug" style="${d.aw ? `left:0;right:${100 - pos}%` : `left:${pos}%;right:0`}"></span>`
    + `<span class="sp-tz-mitte"></span><span class="sp-tz-k" style="left:${pos}%">${_spSt(d)}</span></div>${team(d.B, !d.aw)}</div>`
    + _spNz(d.W, d.L);
}
// Die Münze wird geworfen, dreht sich und landet: die Hälfte der Sieger so
// groß wie ihre Chance vorher. Die Chance stand zweimal da, als „52:48"
// unter der Münze und als „Siegchance vorher 52 %" daneben.
function _spMuenzeBild(d){
  const w = Math.max(1, Math.min(99, d.pct)) / 100, a = (w * 2 * Math.PI) - Math.PI / 2;
  const x = (32 + 25 * Math.cos(a)).toFixed(2), y = (32 + 25 * Math.sin(a)).toFixed(2);
  return `<div class="sp-fk sp-mz"><div class="sp-mz-m"><span class="sp-mz-c"><svg viewBox="0 0 64 64" aria-hidden="true">`
    + `<circle class="sp-mz-r" cx="32" cy="32" r="30"/><circle class="sp-mz-l" cx="32" cy="32" r="25"/>`
    + `<path class="sp-mz-w" d="M32 32V7A25 25 0 ${w > .5 ? 1 : 0} 1 ${x} ${y}Z"/>`
    + `<circle class="sp-mz-i" cx="32" cy="32" r="21"/></svg></span>`
    + `<span class="sp-mz-z num"><b>${_spZahl(d.pct)}</b> : ${_spZahl(100 - d.pct)}</span><small>Chance vorher</small></div>`
    + `<div class="sp-mz-t"><em>Münzwurf</em><span class="sp-mz-h">${_spChips(d.W)}${_spSt(d)}</span></div></div>`
    + _spNz(d.W, d.L);
}
function _spWesteBild(d){
  return `<div class="sp-fk sp-ws"><div class="sp-ws-s"><svg viewBox="0 0 60 70" aria-hidden="true">`
    + `<path d="M30 3L55 12V33C55 50 44 61 30 67C16 61 5 50 5 33V12Z"/></svg>${_spSt(d)}</div>`
    + `<div class="sp-ws-t"><em>Weiße Weste</em>${_spChips(d.W)}`
    + `<span class="sp-ws-u">${d.n === 1 ? 'das erste Zu-null der Liga' : `das <b class="num">${_spZahl(d.n)}.</b> Zu-null der Liga`}</span>`
    + (d.zuletzt ? `<span class="sp-ws-u">zuletzt am <b class="num">${datumFmt(d.zuletzt, 'tmx')}</b></span>` : '') + `</div></div>`
    + _spNz(d.W, d.L);
}
function _spUhrBild(d){
  const pt = (mi, r) => { const a = ((mi % 720) / 720 * 360 - 90) * Math.PI / 180;
    return [(50 + r * Math.cos(a)).toFixed(1), (50 + r * Math.sin(a)).toFixed(1)]; };
  const zeit = mi => String(Math.floor(mi / 60)).padStart(2, '0') + ':' + String(mi % 60).padStart(2, '0');
  const n = d.zeiten.length, jetzt = d.zeiten[n - 1];
  const marken = Array.from({length:12}, (_, k) => { const [a, b] = pt(k * 60, 44), [c, e] = pt(k * 60, 47);
    return `<line x1="${a}" y1="${b}" x2="${c}" y2="${e}"/>`; }).join('');
  const striche = d.zeiten.map((mi, k) => { const [a, b] = pt(mi, 29), [c, e] = pt(mi, 40);
    return `<line class="${k === n - 1 ? 'jetzt' : ''}" style="--i:${k}" x1="${a}" y1="${b}" x2="${c}" y2="${e}"/>`; }).join('');
  const [zx, zy] = pt(jetzt, 24);
  return `<div class="sp-fk sp-uh"><div class="sp-uh-b"><svg viewBox="0 0 100 100" aria-hidden="true">`
    + `<circle class="sp-uh-r" cx="50" cy="50" r="47"/><g class="sp-uh-h">${marken}</g><g class="sp-uh-s">${striche}</g>`
    + `<line class="sp-uh-z" x1="50" y1="50" x2="${zx}" y2="${zy}"/><circle class="sp-uh-n" cx="50" cy="50" r="2.6"/></svg></div>`
    + `<div class="sp-uh-t"><em>Dauerbetrieb</em><span class="sp-uh-g"><b class="num">${_spZahl(d.n)}.</b> Satz des Tages</span>`
    + `<span class="sp-uh-u">seit <b class="num">${zeit(d.zeiten[0])}</b> Uhr, diese um <b class="num">${zeit(jetzt)}</b></span>`
    + `<span class="sp-uh-e">${_spChips(d.W)}${d.nurAnlass ? '' : _spSt(d)}</span></div></div>`
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
function _spUeberholtBild(d){
  const ps = [d.wPre, d.wPost, d.lPre, d.lPost], lo = Math.min(...ps), hi = Math.max(...ps);
  const y = p => (10 + (p - lo) / Math.max(1, hi - lo) * 36).toFixed(1);
  const platz = (x, p, cls) => `<text class="${cls}" x="${x}" y="${(+y(p) + 3).toFixed(1)}">${_spZahl(p)}.</text>`;
  return `<div class="sp-fk sp-uo"><div class="sp-uo-g"><svg viewBox="0 0 100 56" aria-hidden="true">`
    + `<line class="sp-uo-ax" x1="22" y1="4" x2="22" y2="52"/><line class="sp-uo-ax" x1="78" y1="4" x2="78" y2="52"/>`
    + `<polyline class="sp-uo-l" points="22,${y(d.lPre)} 78,${y(d.lPost)}"/><polyline class="sp-uo-w" points="22,${y(d.wPre)} 78,${y(d.wPost)}"/>`
    + `<circle class="sp-uo-l" cx="78" cy="${y(d.lPost)}" r="3"/><circle class="sp-uo-w" cx="78" cy="${y(d.wPost)}" r="3.6"/>`
    + platz(4, d.wPre, 'w') + platz(4, d.lPre, 'l') + platz(84, d.wPost, 'w') + platz(84, d.lPost, 'l')
    + `</svg><div class="sp-uo-a"><span>vorher</span><span>nachher</span></div></div>`
    // Auf der Karte sagt die Zeile darüber „Johannes zieht an Maxi vorbei";
    // daneben stehen nur die beiden Gesichter in der Farbe ihrer Linie.
    + (d.nurAnlass ? `<div class="sp-uo-t"><span class="sp-uo-p w">${_spChip(d.w)}${esc(_spName(d.w))}</span>`
        + `<span class="sp-uo-p l">${_spChip(d.l)}${esc(_spName(d.l))}</span></div></div>`
      : `<div class="sp-uo-t"><em>Überholt</em><span class="sp-uo-p">${_spChip(d.w)}<i>zieht vorbei an</i>${_spChip(d.l)}</span>`
        + `<span class="sp-uo-u">Platz <b class="num">${_spZahl(d.wPost)}</b> statt <b class="num">${_spZahl(d.wPre)}</b></span></div></div>`)
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
function _spDuoserieBild(d){
  return `<div class="sp-fk sp-ds"><span class="sp-ds-c">${_spChips(d.W)}</span><div class="sp-ds-m"><em>Duo gegen Duo</em>`
    + `<span class="sp-ds-k"><b class="num">${_spZahl(d.k)}</b> in Folge</span>`
    + `<span class="sp-ds-r">${d.folge.map((w, k) => `<i class="${w ? 'w' : 'l'}${k === d.folge.length - 1 ? ' jetzt' : ''}" style="--i:${k}"></i>`).join('')}</span>`
    // Die Bilanz aller Duelle nur, wenn sie mehr sagt als die Serie: unter
    // „7 in Folge" stand „7:0 in 7 Duellen".
    + (d.s === d.k && d.n === d.k ? '' : `<span class="sp-ds-u">${d.ab ? `${_spZahl(d.n - d.s)}:<b class="num">${_spZahl(d.s)}</b>`
      : `<b class="num">${_spZahl(d.s)}</b>:${_spZahl(d.n - d.s)}`} in ${_spZahl(d.n)} Duellen</span>`) + `</div>`
    + `<span class="sp-ds-c re">${_spChips(d.L)}</span></div>`
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
// Der Elo-Höchststand: die Kurve des laufenden Monats, die alte Bestmarke
// als gestrichelte Linie und der neue Punkt darüber. Eine Zahl allein sagte
// nicht, wie lange die alte Marke stand. Alte Marke und Abstand kommen aus
// dem Ereignis: aus den letzten vierzig Partien gerechnet, lag die alte Marke
// bei 82 Partien Abstand außerhalb, und der Fuß nannte „vorher 291, seit 1
// Partien“, während das Blatt 299 und 82 sagte. Die Kurve bleibt im Monat,
// weil die Elo jeden Monat neu beginnt: über die Grenze gezeichnet, sah der
// Neubeginn wie ein Absturz aus.
function _spHochDaten(pid, m, x){
  const seit = x && x.seit > 0 ? x.seit : 0, sid = seasonOf(m.created_at).id;
  const eig = _spEigene(pid, m).filter(y => seasonOf(y.created_at).id === sid)
    .slice(-Math.min(80, Math.max(12, seit + 2)));
  const H = getHistoryByMatchId();
  const kurve = eig.map(y => Math.round(((H.get(y.id) || {}).eloAfter || {})[pid] || 0));
  if(kurve.length < 2) return null;
  const elo = x && x.elo != null ? x.elo : kurve[kurve.length - 1];
  const alt = x && x.vorher != null ? x.vorher : Math.max(...kurve.slice(0, -1));
  const monat = x && x.vorherSid && x.vorherSid !== sid ? seasonLabel(x.vorherSid) : '';
  return {pid, kurve, elo, alt, seit, monat};
}
function _spHochBild(d){
  const lo = Math.min(d.alt, ...d.kurve), hi = Math.max(d.alt, ...d.kurve), n = d.kurve.length;
  const X = i => 4 + i * (192 / Math.max(1, n - 1)), Y = v => 6 + (hi - v) / Math.max(1, hi - lo) * 40;
  const pfad = d.kurve.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  return `<div class="sp-fk sp-ho"><div class="sp-ho-g"><svg viewBox="0 0 200 52" aria-hidden="true">`
    + `<line class="sp-ho-alt" x1="4" x2="196" y1="${Y(d.alt).toFixed(1)}" y2="${Y(d.alt).toFixed(1)}"/>`
    + `<path class="sp-ho-l" d="${pfad}"/><circle class="sp-ho-p" cx="${X(n - 1).toFixed(1)}" cy="${Y(d.elo).toFixed(1)}" r="3.4"/></svg></div>`
    + `<div class="sp-ho-t"><em>Höchststand</em><span class="sp-ho-z">${_spChip(d.pid)}<b class="num">${_spZahl(d.elo)}</b> Elo</span>`
    + `<span class="sp-ho-u">bisher <b class="num">${_spZahl(d.alt)}</b>${d.monat ? ` im ${esc(d.monat)}` : ''}${d.seit
      ? `, vor ${d.seit === 1 ? 'eines Satzes' : `<b class="num">${_spZahl(d.seit)}</b> Sätze`}` : ''}</span></div></div>`;
}
// ── Die Köpfe des Katalogs ──────────────────────────────────────────
// Jeder zeigt den Endstand und alle vier Gesichter, die Sieger links, und
// endet mit der Namenszeile (`_spNz`). Der Stand ist `_spSt`, wo er neben
// der Zeichnung steht; bei Klapptafel, Pucks und Tor ist er die Zeichnung
// selbst, die Siegerzahl zuerst. Ein eigener Stand für Strom und Herzschlag
// sah fast aus wie `_spSt` und war doch ein zweites Bauteil [§C27]. Sie nehmen nur die Daten aus
// `_spKopfDaten` und zeichnen ohne Rechnung.
const _spKopfPaar = ids => `<span class="sp-kp">${ids.map(_spChip).join('')}</span>`;
const _spKopfElo = (d, ids) => ids.map(id => _spVz((d.delta || {})[id] || 0)).join(' ');
function _spAnzeigeBild(d){
  const seite = (ids, w) => `<div class="sp-ag-s${w ? ' w' : ''}">${_spKopfPaar(ids)}<span class="num">${_spKopfElo(d, ids)}</span></div>`;
  return `<div class="sp-fk sp-ag">${seite(d.W, true)}<div class="sp-ag-m"><div class="sp-ag-z">`
    + `<span class="sp-ag-k w"><b>${_spZahl(d.hoch)}</b></span><i></i><span class="sp-ag-k"><b>${_spZahl(d.tief)}</b></span></div>`
    + (d.pct != null ? `<small class="sp-ag-c num">Chance vorher ${_spZahl(d.pct)} %</small>` : '')
    + `</div>${seite(d.L, false)}</div>` + _spNz(d.W, d.L);
}
function _spPucksBild(d){
  // Bis zehn Tore ein Puck je Tor; darüber hinaus (eine Verlängerung, ein
  // anderes Ziel) zählt die Zahl allein.
  const n = Math.max(10, d.hoch);
  const reihe = (k, w) => k > 10 ? '' : Array.from({length:10}, (_, i) => `<i class="${i < k ? (w ? 'w' : 'l') : ''}"></i>`).join('');
  const z = (ids, k, w) => `<div class="sp-pu-z${w ? ' w' : ''}">${_spKopfPaar(ids)}<span class="sp-pu-r">${reihe(k, w)}`
    + (!w && n === 10 ? `<u style="--von:${k}"></u>` : '') + `</span><b class="num">${_spZahl(k)}</b></div>`;
  return `<div class="sp-fk sp-pu">${z(d.W, d.hoch, true)}${z(d.L, d.tief, false)}</div>` + _spNz(d.W, d.L);
}
// ── Der Elo-Strom: was die Verlierer abgaben, fließt zu den Siegern ────
// Von jedem Verlierer ein Band zur Mitte, so breit wie seine Punkte, dort
// der Stand, und von der Mitte zu jedem Sieger sein Band. Team A steht
// links. Vorher liefen vier Bänder von jedem Verlierer zu jedem Sieger und
// kreuzten sich in einem X: welche Punkte wohin gingen, war nicht zu lesen,
// und die Bänder sagten dasselbe viermal.
function _spStromBild(d){
  const W = 240, H = 78, cx = W / 2, aw = d.aw !== false, dl = d.delta || {};
  const A = aw ? d.W : d.L, B = aw ? d.L : d.W;
  const breit = id => Math.max(3, Math.min(13, Math.abs(dl[id] || 0) / 2.2));
  const id = 'sps' + _spVisualHash(d.W.concat(d.L).join() + d.hoch + ':' + d.tief);
  const yEnde = [18, 60];
  // Die Bänder einer Seite laufen in der Mitte übereinander zusammen.
  const seite = (ids, links, sieg) => {
    const summe = ids.reduce((n, x) => n + breit(x), 0);
    let off = H / 2 - summe / 2;
    return ids.map((x, i) => {
      const b = breit(x), ym = off + b / 2; off += b;
      const xa = links ? 34 : W - 34, xm = links ? cx - 30 : cx + 30, xk = (xa + xm) / 2;
      // Der Fluss läuft vom Verlierer zur Mitte und von der Mitte zum Sieger.
      const pfad = sieg ? `M${xm} ${ym.toFixed(1)}C${xk} ${ym.toFixed(1)},${xk} ${yEnde[i]},${xa} ${yEnde[i]}`
        : `M${xa} ${yEnde[i]}C${xk} ${yEnde[i]},${xk} ${ym.toFixed(1)},${xm} ${ym.toFixed(1)}`;
      return `<path class="sp-sm-p${sieg ? ' w' : ''}" d="${pfad}" stroke="url(#${id})" stroke-width="${b.toFixed(1)}"/>`;
    }).join('');
  };
  const ende = (x, i, links, sieg) => `<span class="sp-sm-a${sieg ? ' w' : ''}" style="top:${yEnde[i] - 12}px;${links ? 'left' : 'right'}:2px">`
    + `${_spChip(x)}<b class="num">${_spVz(dl[x] || 0)}</b></span>`;
  // Rot bei den Verlierern, Gold in der Mitte, Grün bei den Siegern [§C25].
  const [x1, x2] = aw ? [W, 0] : [0, W];
  return `<div class="sp-fk sp-sm"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>`
    + `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" x2="${x2}" y1="0" y2="0"><stop offset=".08" stop-color="#f0566a"/>`
    + `<stop offset=".5" stop-color="#f7cf4a"/><stop offset=".92" stop-color="#E4F24A"/></linearGradient></defs>`
    + seite(A, true, aw) + seite(B, false, !aw) + `</svg>`
    + A.map((x, i) => ende(x, i, true, aw)).join('') + B.map((x, i) => ende(x, i, false, !aw)).join('')
    + `<span class="sp-sm-m">${_spSt(d)}</span></div>` + _spNz(d.W, d.L);
}
function _spHerzBild(d){
  // Der Herzschlag der Sieger steigt bis zum letzten Tor, der der Verlierer
  // zuckt noch einmal und läuft flach aus. Über die Kurve der Sieger läuft
  // ein Lichtpunkt wie auf einem Monitor — auf der Kurve selbst (`lauf`):
  // vorher lief er waagerecht durch die Spalte und kreuzte die Zacken.
  const SW = 'M0 25H10l3-5 3 5h3l2 6 4-27 4 33 3-14h4q4-8 8 0H60';
  const SL = 'M0 25h9l2-6 2 9 2-4h4l1 2 1-1H60';
  const paar = (ids, w) => `<span class="sp-hz-p${w ? ' w' : ''}">${ids.map(_spChip).join('')}</span>`;
  const kurve = (p, w) => `<span class="sp-hz-k${w ? ' w' : ''}"><svg viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true">`
    + `<path class="sp-hz-b" pathLength="100" d="${p}"/>${w ? `<path class="sp-hz-lauf" pathLength="100" d="${p}"/>` : ''}</svg></span>`;
  const zelle = (lab, v) => `<span><b class="num">${esc(v)}</b><small>${lab}</small></span>`;
  return `<div class="sp-fk sp-hz"><div class="sp-hz-g">${paar(d.W, true)}${kurve(SW, true)}`
    + `<span class="sp-hz-m"><small>Tiebreak</small>${_spSt(d)}</span>${kurve(SL, false)}${paar(d.L, false)}</div>`
    + `<div class="sp-kl">` + (d.pct != null ? zelle('Chance vorher', _spZahl(d.pct) + ' %') : '')
    + zelle('Elo der Sieger', _spKopfElo(d, d.W)) + (d.nr ? zelle('im Monat', _spZahl(d.nr) + '.') : '') + `</div></div>`
    + _spNz(d.W, d.L);
}
// ── Die Lebensbalken: wie viel jedem Team am Ende blieb ───────────────
// Der Verlierer endet leer, der Sieger mit seinem Anteil an den Games:
// ein 7:6 lässt gut die Hälfte, ein 6:1 fast alles. Statt der Pucks, die
// die Tore zweimal zählten — als Kugeln und als Zahl daneben —, zeigt der
// Balken den Abstand, den die Zahlen nicht auf einen Blick sagen. Team A
// links, die Balken laufen von außen zur Mitte, die Elo jedes Spielers
// außen.
function _spBalkenBild(d){
  const aw = d.aw !== false, dl = d.delta || {};
  const A = aw ? d.W : d.L, B = aw ? d.L : d.W;
  const rest = (gegen) => gegen === 'sieg' ? Math.round((d.anteil != null ? d.anteil : .75) * 100) : 0;
  const seite = (ids, sieg, links, gegen) => `<div class="sp-lb-s${sieg ? ' w' : ''}${links ? '' : ' re'}">`
    + `<span class="sp-lb-k">${_spKopfPaar(ids)}<span class="num">${_spKopfElo(d, ids)}</span></span>`
    + `<span class="sp-lb-b"><i style="--r:${rest(gegen)}%"></i>${sieg ? '' : '<em>K.o.</em>'}</span></div>`;
  return `<div class="sp-fk sp-lb">${seite(A, aw, true, aw ? 'sieg' : 0)}<span class="sp-lb-m">${_spSt(d)}</span>${seite(B, !aw, false, aw ? 0 : 'sieg')}</div>`
    + _spNz(d.W, d.L);
}
// Die Treffer liegen über das Netz verteilt, jeder mit seinem Einschlag:
// zu einer Pyramide gestapelt sahen sie aus wie Obst in einer Kiste.
const SP_TREFFER = [[25, 15], [47, 11], [70, 17], [80, 31], [33, 30], [56, 25], [71, 41], [21, 41], [45, 40], [60, 45]];
function _spZunullBild(d){
  const id = 'spn' + _spVisualHash(d.W.concat(d.L).join() + ':' + d.hoch);
  const netz = `<path class="sp-zn-n" d="${Array.from({length:11}, (_, i) => `M${16 + i * 6.8} 2V46`).join('')}`
    + `${Array.from({length:8}, (_, i) => `M16 ${2 + i * 6.3}H84`).join('')}M6 10L16 2M94 10L84 2M6 54L16 46M94 54L84 46"/>`;
  const rahmen = `<path class="sp-zn-r" d="M6 55V10H94V55"/><path class="sp-zn-b" d="M2 55H98"/>`;
  const treffer = SP_TREFFER.slice(0, Math.min(10, d.hoch)).map(([x, y], i) => `<g transform="translate(${x} ${y})"><g class="sp-zn-hit" style="--i:${i}">`
    + `<circle class="sp-zn-ring" r="7"/><circle class="sp-zn-ball" r="4.3" fill="url(#${id}b)"/><path class="sp-zn-glanz" d="M-2.2 -1.6a2.6 2.6 0 0 1 2.4-1.4"/></g></g>`).join('');
  const paar = (ids, w) => `<div class="sp-zn-p${w ? '' : ' aus'}">${_spKopfPaar(ids)}<span class="num">${_spKopfElo(d, ids)}</span></div>`;
  return `<div class="sp-fk sp-zn">${paar(d.W, true)}<span class="sp-zn-z num"><b>${_spZahl(d.hoch)}</b><i>:</i><u>0</u></span>${paar(d.L, false)}`
    + `<div class="sp-zn-tore"><svg class="sp-zn-t leer" viewBox="0 0 100 58" aria-hidden="true"><defs><radialGradient id="${id}" cx=".5" cy=".55" r=".6">`
    + `<stop offset="0" stop-color="#f7cf4a" stop-opacity=".32"/><stop offset="1" stop-color="#f7cf4a" stop-opacity="0"/></radialGradient></defs>`
    + `<rect class="sp-zn-glut" x="6" y="6" width="88" height="50" fill="url(#${id})"/>${netz}${rahmen}</svg>`
    + `<svg class="sp-zn-t voll" viewBox="0 0 100 58" aria-hidden="true"><defs><radialGradient id="${id}b" cx=".38" cy=".32" r=".75">`
    + `<stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#ecebe2"/><stop offset="1" stop-color="#a9a89c"/></radialGradient></defs>`
    + `${netz}${treffer}${rahmen}</svg></div>`
    + (d.nr ? `<em class="sp-zn-band">${svgI('weisseWeste')}<b>Zu Null</b><small class="num">${_spZahl(d.nr)}. im ${esc(d.monat || 'Monat')}</small></em>` : '')
    + `</div>` + _spNz(d.W, d.L);
}

const SP_FORM_BILD = {mosaik:_spMosaikBild, tacho:_spTachoBild, streu:_spStreuBild, transfer:_spTransferBild,
  chemie:_spChemieBild, gegner:_spGegnerBild, revanche:_spRevancheBild, gipfel:_spGipfelBild,
  rueckkehr:_spRueckkehrBild, gefaelle:_spGefaelleBild, tagesring:_spTagesringBild, zaehlwerk:_spZaehlwerkBild,
  tauziehen:_spTauziehenBild, muenze:_spMuenzeBild, weste:_spWesteBild,
  uhr:_spUhrBild, ueberholt:_spUeberholtBild, duoserie:_spDuoserieBild, hoch:_spHochBild,
  feld:_spFeldBild, tafel:_spAnzeigeBild, pucks:_spPucksBild, strom:_spStromBild, balken:_spBalkenBild,
  herz:_spHerzBild, zunull:_spZunullBild};

// ── Kopf und Fuß je Anlass ───────────────────────────────────────────
// Ein Anlass trägt die Ergebniszeile als Kopf und seine Grafik als Fuß; die
// gewöhnliche Partie trägt ihre Form. Die Ergebniszeile wechselte sich
// einmal mit dem Spielfeld ab, damit es überhaupt vorkam — seit es eine
// von dreizehn Formen ist, stand es damit auf gut der Hälfte der Karten,
// und der Feed sah an jedem Spieltag gleich aus.
const _spZeile = a => _spZeileBild(_spZeileDaten(a.m));
const SP_KOPF = {
  krimi:a => _spTafelBild(_spTafelDaten(a)),
  aussenseiter:a => _spWippeBild(_spWippeDaten(a)), deutlich:a => _spBandBild(_spZeileDaten(a.m)),
  spitze:_spZeile, rang:_spZeile, serie:_spZeile, wende:_spZeile, duell:_spZeile,
  riss:_spZeile, teamserie:_spZeile, medaille:_spZeile, premiere:_spZeile, rolle:_spZeile
};
const SP_FUSS = {
  krimi:a => _spNervenBild(_spNervenDaten(a)), deutlich:a => _spVerteilungBild(_spVerteilungDaten(a)),
  spitze:a => _spTabelleBild(_spTabelleDaten(a, true)), rang:a => _spTabelleBild(_spTabelleDaten(a, false)),
  serie:a => _spSerieBild(_spSerieDaten(a)), wende:a => _spKurveBild(_spKurveDaten(a)),
  duell:a => _spDuellBild(_spDuellDaten(a)), riss:a => _spRissBild(_spRissDaten(a)),
  teamserie:a => _spDuoBild(_spDuoDaten(a)), medaille:a => _spMedailleBild(_spMedailleDaten(a)),
  premiere:a => _spPremiereBild(a.x), rolle:a => _spRolleBild(a.x)
};

// ── Zwei unabhängige Bildebenen je Partie ────────────────────────────
// Die obere Ebene erklärt immer sofort Paarung und Endstand. Die optionale
// untere Ebene erklärt den Anlass. Beide werden samt Zeichnungsdaten beim
// Publizieren gespeichert und danach nie aus neueren Partien rekonstruiert.
const SP_ANLASS_FORMEN = new Set(['chemie','gegner','revanche','gipfel','rueckkehr','tagesring','zaehlwerk',
  'uhr','ueberholt','duoserie']);
function _spVisualHash(v){
  let h = 2166136261 >>> 0, s = String(v || '');
  for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// Ein besonderer Ausgang hat immer dasselbe Bild und geht nach seinem
// Vorrang: Außenseitersieg, Doppel-Bagel, Tiebreak, klarer Sieg. Ein
// Doppel-Bagel ist auch ein klarer Sieg, und die Sonderkarte trägt ihn.
function _spScoreSpezial(m){
  const c = _spChance(m), diff = Math.abs(m.games_a - m.games_b);
  if(c != null && c < CHANCE_UPSET) return {key:'aussenseiter', x:{c}};
  if(_spZuNull(m)) return {key:'zunull', x:{}};
  if(partie(m).entscheidTb) return {key:'herz', x:{}};
  if(partie(m).deutlich) return {key:'deutlich', x:{}};
  return null;
}
// Die Grundansichten des Katalogs in seiner Reihenfolge: drei für jede
// Partie (Anzeigetafel, Elo-Strom, Torpucks), das Spielfeld, und sechs, die
// eine Bedingung haben. Ob eine zutrifft, sagt ihre Form (`wann`); das
// Mosaik nur mit einem benannten Befund (`_spMosaikBefund`).
const SP_KOPF_GRUND = ['tafel', 'strom', 'balken', 'feld', 'tauziehen', 'tacho', 'muenze', 'gefaelle', 'mosaik', 'streu'];
function _spScoreKandidaten(m){
  const F = _spFakten(m);
  return SP_KOPF_GRUND.map(key => {
    let x = null;
    try { x = key === 'mosaik' ? _spMosaikBefund(F) : SP_FORM[key].wann(F); } catch(e){ x = null; }
    return x ? {key, x, rang:SP_FORM[key].rang} : null;
  }).filter(Boolean);
}
// Die Wahl des Kopfs, in einem chronologischen Durchlauf je Datenstand.
// Ein besonderer Ausgang ist selbst die Geschichte und steht oben, außer
// derselbe stand auf einer der zwei Karten davor: der klare Sieg trifft auf
// jede fünfte Partie zu und stand sonst viermal hintereinander. Sonst kommt
// die Grundansicht, die am längsten nicht dran war, bei Gleichstand die
// erste des Katalogs. Vorher gewann ein Befund nach Gewicht und Abschlägen,
// und drei Ansichten (Tacho, Klapptafel, Band) standen auf fast der Hälfte
// der Karten; Elo-Transfer und Ergebniszeile zeigten die Verlierer links.
// „Zwei Welten" hängt am Duo und nicht an der Partie: Leon und Henry liegen
// immer 220 Elo auseinander, und „gewinnen als ungleiches Paar" stand an
// zwei Tagen dreimal über ihnen. Es zählt deshalb nur, wenn dieses Duo es
// auf den letzten dreißig Karten nicht schon hatte.
function _spScoreAuswahl(x, spur, duos, ohne){
  const duo = _spSieger(x).slice().sort().join();
  const schonDuo = k => spur.slice(-30).some((y, i, a) => y === k && duos[duos.length - a.length + i] === duo);
  const seit = k => { const i = spur.lastIndexOf(k); return i < 0 ? Infinity : spur.length - 1 - i; };
  let best = null;
  _spScoreKandidaten(x).filter(c => c.key !== ohne && !(c.key === 'gefaelle' && schonDuo('gefaelle')))
    .forEach(c => { const st = seit(c.key); if(!best || st > best.st) best = {c, st}; });
  return best ? best.c : null;
}
// ── Wo der Durchlauf anfängt ──────────────────────────────────────────
// Bei der ältesten Partie, die noch jemand braucht, und SP_SCORE_VORLAUF
// Partien davor. Er fing bei der ersten Partie der Liga an, und das bei
// jedem neuen Datenstand: der Bestand reicht nur einen Monat zurück
// (`newsAnzeigeAb`), also wählte der Generator für jede ältere Partie den
// Kopf neu, um für die neue einen zu finden. Gemessen mit vier Jahren
// Liga, 5544 Partien: 3642 Wahlen für einen Spieltag, elf von
// vierundzwanzig Sekunden des Generators, und mit jedem Monat mehr.
// Gebraucht wird die älteste veröffentlichte Karte, deren Form die Spur
// festhält, und die älteste Partie im Fenster des Generators. Die Wahl
// schaut höchstens dreißig Karten zurück (`_spScoreAuswahl`); der Vorlauf
// ist das Vierfache, damit ein kalter Anfang zur Ruhe kommt, bevor eine
// Karte zählt. Was in ihm gewählt wird, steht auf keiner Karte.
const SP_SCORE_VORLAUF = 120;
function _spScoreAb(B, pub){
  let erste = B.chrono.length;
  pub.forEach((v, id) => { const i = B.idx.get(id); if(i != null && i < erste) erste = i; });
  const seit = Date.now() - NEWS_FENSTER_TAGE * 864e5;
  let fenster = B.chrono.length;
  while(fenster > 0 && mts(B.chrono[fenster - 1]) >= seit) fenster--;
  return Math.max(0, Math.min(erste, fenster) - SP_SCORE_VORLAUF);
}
function _spScoreNeu(FB, ab){
  FB.scoreWahl = new Map(); FB.scoreSpur = []; FB.scoreDuo = [];
  FB.scoreAb = ab; FB.scoreBis = ab - 1;
}
function _spScoreWahl(m){
  const FB = _spFormBasis(), B = _spBasis();
  const roh = Array.isArray(_cache._stories) ? _cache._stories : null;
  // Die Spur muss die publizierten Formen kennen. Eine Neuberechnung mit
  // neuen Auswahlregeln zaehlte bisher fuer die alten Spielfeldkarten andere
  // Formen und waehlte deshalb auch fuer die naechste Partie das Spielfeld.
  // Ein Index pro Storybestand, danach ein chronologischer Durchlauf.
  if(FB.scoreFrom !== roh || FB.scoreVersion !== _cache.version){
    FB.scoreFrom = roh; FB.scoreVersion = _cache.version;
    FB.scorePublished = new Map();
    (roh || []).forEach(s => {
      const d = s.dataRef || {};
      if(d.type === 'spiel' && d.matchId && d.visual && d.visual.version === 2
         && d.visual.score && d.visual.score.key) FB.scorePublished.set(d.matchId, d.visual);
    });
    FB.fussWahl = new Map();
    _spScoreNeu(FB, _spScoreAb(B, FB.scorePublished));
  }
  let w = FB.scoreWahl && FB.scoreWahl.get(m.id);
  if(w) return w;
  if(!FB.scoreWahl) _spScoreNeu(FB, _spScoreAb(B, FB.scorePublished || new Map()));
  const bis = B.idx.get(m.id);
  // Wer nach einer Partie vor dem Anfang fragt, bekommt den Durchlauf
  // von der ersten Partie an, wie vor dem Vorlauf.
  if(bis != null && bis < FB.scoreAb) _spScoreNeu(FB, 0);
  for(let j = FB.scoreBis + 1; j <= bis; j++){
    const x = B.chrono[j], spezial = _spScoreSpezial(x), spur = FB.scoreSpur;
    FB.scoreBis = j;
    const publiziert = FB.scorePublished.get(x.id);
    if(publiziert) w = {key:publiziert.score.key, x:{}};
    else if(spezial && !spur.slice(-2).includes(spezial.key)) w = spezial;
    else w = _spScoreAuswahl(x, spur, FB.scoreDuo, spezial && spezial.key) || spezial
      || {key:'feld', x:{}, rang:SP_FORM.feld.rang};
    FB.scoreWahl.set(x.id, w);
    spur.push(w.key);
    FB.scoreDuo.push(_spSieger(x).slice().sort().join());
  }
  return FB.scoreWahl.get(m.id) || {key:'feld', x:{}, rang:SP_FORM.feld.rang};
}
function _spScoreSnapshot(m){
  const w = _spScoreWahl(m), c = _spChance(m);
  const fest = _spFormBasis().scorePublished.get(m.id);
  if(fest) return fest.score;
  if(w.key === 'aussenseiter') return {key:w.key, data:_spWippeDaten({m, c})};
  if(w.key === 'deutlich') return {key:w.key, data:_spZeileDaten(m)};

  const F = _spFakten(m);
  return {key:w.key, data:SP_FORM[w.key].daten(F, w.x)};
}
// ── Der Fuß zeigt, wovon die Schlagzeile spricht ────────────────────
// Er hatte eine eigene Rangfolge, und die kannte die Rivalität nicht: über
// „Leon und Maxi treffen zum 188. Mal aufeinander" stand als Fuß Leos Wende,
// zehn Pleiten und dann ein Sieg — eine andere Geschichte als die der
// Schlagzeile. Ein Anlass mit eigener Zeichnung wiegt jetzt, was er in der
// Schlagzeile wiegt (`_leitWert` in `_consolidateStories`), und der
// schwerste zeichnet den Fuß.
// Gibt es keinen, kam der Fuß aus einer festen Reihe, und die erste
// zutreffende gewann immer: gemessen trugen 11 von 52 Partien in vierzehn
// Tagen die Wende. Jetzt stehen alle zutreffenden Zeichnungen zur Wahl, und
// was in den Partien davor schon stand, wiegt weniger — wie beim Kopf.
// Welche Meldung ein Fuß zeichnet, steht als ihr Schlüssel im Schnappschuss
// (`zeigt`), und genau diese lässt die Karte als Zeile weg (`_spZeilen`).
// Nach Art und Person geraten, galten zwei Rivalitäten oder die
// Duo-Jubiläen beider Seiten einer Partie als gezeichnet, obwohl der Fuß nur
// eine zeigt, und die andere fehlte auf der Karte.
function _spFaktId(r){
  r = r || {};
  return [r.type, r.pid || r.playerId || r.newLeader || r.victimPid || '', r.gegen || r.mit || '',
    r.a || '', r.b || '', r.badgeId || ''].join('|');
}
const SP_MARKEN = {milestone_wins:'Sieg', milestone_elo:'Elo', milestone_goals:'Game', jubilee:'Satz'};
// Gewogen wie in der Schlagzeile (`anlassGewicht`); bei gleichem Gewicht
// gewinnt, was hier zuerst steht.
function _spFussFakten(m, fakten){
  const f = t => fakten.find(x => x.type === t), out = [];
  const nimm = (key, x, daten, ids) => out.push({w:anlassGewicht(x.type, x), a:{key, m, x:daten || x}, ids:ids || [_spFaktId(x)]});
  let x;
  if((x = f('lead_change')) && x.newLeader) nimm('spitze', x);
  if((x = fakten.find(y => y.type === 'badge_unlocked'
      && (y.rarity === 'rare' || y.rarity === 'legendary')
      && (!SP_ERGEBNIS_BADGE.has(y.badgeId) || (y.rang > 1 && _badgeTakt('rare', y.rang))))) && x.badgeId)
    // Die Medaille nennt jeden, der sie in der Partie holte, also zeichnet
    // sie jede dieser Meldungen.
    nimm('medaille', x, {pid:x.playerId, badgeId:x.badgeId, rang:x.rang},
      fakten.filter(y => y.type === 'badge_unlocked' && y.badgeId === x.badgeId).map(_spFaktId));
  if((x = f('streak_killer')) && x.victimPid) nimm('riss', x);
  // Jede runde Zahl der Partie, von jedem: das Zählwerk zeichnete nur die
  // erste Marke ihrer Art, und erreichten Leo den hundertsten Sieg und Maxi
  // die tausendste Partie, stand nur der Sieg im Fuß. Gewogen wie die
  // schwerste darunter.
  const marken = [], markenIds = [];
  fakten.forEach(y => { const label = SP_MARKEN[y.type];
    if(!label || !y.pid) return;
    const wert = y.type === 'milestone_elo' ? (Number(y.mark) || parseInt(y.milestone, 10))
      : y.type === 'jubilee' ? Number(y.total) : parseInt(y.milestone, 10);
    if(!(wert > 0)) return;
    markenIds.push(_spFaktId(y));
    if(!marken.some(z => z.pid === y.pid && z.label === label)) marken.push({pid:y.pid, wert, label, w:anlassGewicht(y.type, y)}); });
  if(marken.length) out.push({w:Math.max(...marken.map(z => z.w)), ids:markenIds, a:{key:'marken', m,
    x:marken.sort((p, q) => q.w - p.w).map(z => ({pid:z.pid, wert:z.wert, label:z.label}))}});
  if((x = f('win_streak')) && x.streak) nimm('serie', x);
  if((x = f('team_streak')) && x.streak && x.a && x.b) nimm('teamserie', x);
  // Was in der einzelnen Partie passiert, mit der Zeichnung, die es zeigt.
  if((x = f('fluch')) && x.pid && x.gegen) nimm('gegner', x);
  if((x = f('elo_hoch')) && x.pid) nimm('hoch', x);
  if((x = f('tabellensprung')) && x.pid && x.pre && x.post) nimm('rang', x, [{pid:x.pid, r:{pre:x.pre, post:x.post}}]);
  if((x = f('revanche'))) nimm('revanche', x);
  if((x = f('duo_jubilaeum')) && x.sieg) nimm('chemie', x);
  if((x = f('tagesmarathon')) && x.pid) nimm('tagesring', x);
  // Das Ende einer Pleitenserie zeichnet die Elo über die Serie, die
  // Rückkehr eines Siegers die Pause; die eines Verlierers bleibt Zeile.
  if((x = fakten.filter(y => y.type === 'pleiten_ende' && y.pid).sort((p, q) => q.n - p.n)[0])) nimm('wende', x);
  if((x = fakten.find(y => y.type === 'rueckkehr' && y.pid && y.sieg))) nimm('rueckkehr', x);
  // Die sieben Fakten des Katalogs.
  Object.keys(SP_FAKT_FUSS).forEach(t => { if((x = f(t)) && x.pid) nimm(SP_FAKT_FUSS[t], x); });
  if((x = f('rivalry_milestone')) && x.a && x.b) nimm('duell', x);
  else if((x = f('rivalry')) && x.a && x.b) nimm('duell', x);
  return out.sort((p, q) => q.w - p.w);
}
// Zustände, die über viele Partien gelten: eine Serie, die Serie eines Duos,
// eine Rivalität. Sie trafen gemessen auf jede vierte Partie zu und standen
// als Fuß, sobald sie zutrafen — die Siegesserie auf zwölf von 43 Karten in
// dreißig Tagen, an einem Tag dreimal dieselbe. Ein Ereignis (Fluch,
// Höchststand, Tabellensprung, Revanche, Jubiläum, langer Tag, Meilenstein,
// Spitzenwechsel, Auszeichnung, gerissene Serie) geschieht einmal und geht
// weiter vor allem anderen; ein Zustand tritt zurück, wenn er auf einer der
// letzten Karten schon gezeichnet war, und misst sich dann mit dem, was die
// Partie selbst zeigt.
const SP_FUSS_ZUSTAND = new Set(['serie', 'teamserie', 'duell']);
// Die Füße der Partien davor, die jüngste zuletzt: veröffentlicht oder in
// diesem Lauf gewählt. Der Generator friert die Partien deshalb in ihrer
// zeitlichen Folge ein.
function _spFussSpur(m, n){
  const FB = _spFormBasis(), B = _spBasis(), bis = B.idx.get(m.id);
  const spur = [];
  for(let j = (bis == null ? -1 : bis - 1); j >= 0 && spur.length < n && bis - j <= 3 * n; j--){
    const id = B.chrono[j].id;
    const pub = FB.scorePublished && FB.scorePublished.get(id);
    const k = pub ? (pub.occasion && pub.occasion.key) : (FB.fussWahl && FB.fussWahl.get(id));
    if(k) spur.unshift(k);
  }
  return spur;
}
function _spAnlassSnapshot(m, fakten, scoreKey){
  const c = _spChance(m);
  const FB = _spFormBasis();
  if(!FB.fussWahl) FB.fussWahl = new Map();
  const merke = v => { if(v && v.key) FB.fussWahl.set(m.id, v.key); return v; };
  const F = _spFakten(m), kand = [];
  // Was die Karte als Zeile trägt, mit der Zeichnung dazu. Ein Ereignis
  // steht über allem, was die Partie selbst zeigt (+100); ein Zustand misst
  // sich mit ihm [SP_FUSS_ZUSTAND].
  _spFussFakten(m, fakten).forEach(({w, a, ids}) => {
    const daten = SP_FAKT_DATEN[a.key] ? () => SP_FAKT_DATEN[a.key](a) : {
      marken:() => ({liste:a.x}),
      spitze:() => _spTabelleDaten(a, true), serie:() => _spSerieDaten(a),
      duell:() => _spDuellDaten(a), riss:() => _spRissDaten(a),
      teamserie:() => _spDuoDaten(a), medaille:() => _spMedailleDaten(a),
      rang:() => _spTabelleDaten(a, false),
      gegner:() => { const g = F.gegner.find(y => y.w === a.x.pid && y.l === a.x.gegen);
        return g ? SP_FORM.gegner.daten(F, {g, fluch:true}) : null; },
      hoch:() => _spHochDaten(a.x.pid, m, a.x),
      revanche:() => F.revanche ? SP_FORM.revanche.daten(F, {}) : null,
      chemie:() => SP_FORM.chemie.daten(F, {rund:true}),
      tagesring:() => SP_FORM.tagesring.daten(F, {id:a.x.pid,
        ms:F.tag.filter(y => [y.a1, y.a2, y.b1, y.b2].includes(a.x.pid))}),
      wende:() => _spKurveDaten({key:'wende', m, x:{pid:a.x.pid, n:a.x.n}}),
      rueckkehr:() => SP_FORM.rueckkehr.daten(F, {id:a.x.pid, tage:a.x.tage})
    }[a.key];
    if(daten) kand.push({key:a.key, rang:w, data:daten, fakt:true, zustand:SP_FUSS_ZUSTAND.has(a.key), zeigt:ids});
  });

  // Alle Zeichnungen, die aus der Partie selbst zutreffen, mit ihrem Gewicht
  // und dem Satz, der über ihnen steht (`zeile`). Ohne ihn stand eine
  // Zeichnung ohne jede Erklärung im Fuß: „Zurück" über Alex, der nach 41
  // Tagen wieder spielte, ohne dass die Karte es irgendwo sagte.
  const diff = Math.abs(m.games_a - m.games_b);
  const plus = (key, rang, data, zeile) => { if(key !== scoreKey) kand.push({key, rang, data, zeile}); };
  const nl = ids => _namenListe(ids.map(_spName));
  const pz = v => Math.max(1, Math.round(v * 100));
  let x;
  if((x = _spPremiereDaten(m))){ const p = x;
    plus('premiere', 36, () => p, () => p.versuch === 1 ? `${nl([p.A, p.B])} gewinnen den ersten gemeinsamen Satz`
      : `${nl([p.A, p.B])} gewinnen zum ersten Mal zusammen, im ${_spZahl(p.versuch)}. Versuch`); }
  // Die Wende ab drei Niederlagen; ab fünf ist sie ein Fakt (`pleiten_ende`).
  const wende = _spSieger(m).map(pid => ({pid, n:_newsPleitenVor(pid, m)}))
    .filter(w => w.n >= 3 && w.n < 5).sort((p, q) => q.n - p.n)[0];
  if(wende && !kand.some(k => k.key === 'wende') && !fakten.some(y => y.type === 'duo_pleiten_ende'))
    plus('wende', 30, () => _spKurveDaten({key:'wende', m, x:wende}),
      () => `${_spName(wende.pid)} gewinnt nach ${_spZahl(wende.n)} Niederlagen wieder`);
  let frei = false;
  try { frei = _storyRangFrei(seasonOf(m.created_at).id, mts(m)).frei; } catch(e){}
  const sprung = frei ? _spSieger(m).map(pid => ({pid, r:_newsRankChange(pid, m.id)}))
    .filter(w => w.r && w.r.pre - w.r.post >= 2).sort((p, q) => (q.r.pre - q.r.post) - (p.r.pre - p.r.post)) : [];
  if(sprung.length && !kand.some(k => k.key === 'rang'))
    plus('rang', 34, () => _spTabelleDaten({key:'rang', m, x:sprung}, false),
      () => `${_spName(sprung[0].pid)} springt von Platz ${sprung[0].r.pre} auf Platz ${sprung[0].r.post}`);
  const rolle = _spRolleDaten(m);
  if(rolle) plus('rolle', 30, () => rolle,
    () => `${_spName(rolle.pid)} gewinnt ${rolle.r === 'drive' ? 'rechts' : 'links'}, sonst nur in ${pz(rolle.anteil)} % der Sätze dort`);
  // Ein besonderer Ausgang, den der Kopf nicht zeigt, bleibt als Fuß sichtbar.
  if(c != null && c < CHANCE_UPSET && scoreKey !== 'aussenseiter')
    plus('aussenseiter', 40, () => _spWippeDaten({m, c}),
      () => `${nl(_spSieger(m))} gewinnen als Außenseiter, mit ${pz(c)} % Siegchance`);
  // Zeigt der Kopf den Ausgang schon (Herzschlag, Tor zu null), tritt der
  // Fuß dazu zurück wie unter Krimi und Band: über einem Herzschlag stand
  // sonst die Bilanz in engen Partien als zweites Bild desselben Tors.
  if(_spKrimi(m)){ const nv = _spNervenDaten({m, c}), b = nv.zeilen.slice().sort((p, q) => q.w - p.w)[0];
    plus('nerven', scoreKey === 'krimi' || scoreKey === 'herz' ? 14 : 24, () => nv,
      () => `${_spName(b.id)} gewinnt ${_spZahl(b.w)} von ${_spZahl(b.w + b.l)} Sätzen im Tiebreak`); }
  if(partie(m).deutlich){ const vt = _spVerteilungDaten({m});
    plus('verteilung', scoreKey === 'deutlich' || scoreKey === 'zunull' ? 14 : 24, () => vt,
      () => `${_spZahl(vt.so)} von ${_spZahl(vt.gesamt)} Sätzen der Liga endeten so deutlich`); }
  // Die Zeichnungen aus dem Katalog der Formen. Das Zählwerk und die
  // Rückkehr sind Fakten geworden (Jubiläum, Siegmarke, `rueckkehr`): als
  // Form standen sie ohne Satz da.
  _spFormKand(m).filter(k => SP_ANLASS_FORMEN.has(k.key) && k.key !== 'zaehlwerk' && k.key !== 'rueckkehr')
    .forEach(k => plus(k.key, k.rang, () => SP_FORM[k.key].daten(F, k.x), () => SP_FORM[k.key].text(F, k.x).t));
  if(!kand.length) return null;
  // ── Nie dieselbe Zeichnung zweimal hintereinander [§C33] ──────────────
  // Gemeint ist das Bild, nicht der Anlass: „Julian dreht den Tag ins Plus"
  // und „Johannes kommt an diesem Tag auf +88" sind zwei Fakten und dieselbe
  // Kurve „Elo des Tages", und sie standen auf zwei Karten untereinander.
  // Ein Fakt ging vorher immer vor, auch derselbe Fuß wie davor. Jetzt fällt
  // die Familie des vorigen Fußes ganz aus der Wahl; bleibt nichts, trägt
  // die Karte keinen Fuß, und der Fakt steht als Zeile.
  const spur = _spFussSpur(m, 8), vorher = _spFussVorher(m);
  const fam = k => SP_FUSS_FAMILIE[k] || k;
  const oft = (f, n) => spur.slice(-n).filter(y => fam(y) === f).length;
  const gewertet = kand.filter(k => !vorher || fam(k.key) !== fam(vorher))
    .map(k => Object.assign({}, k, {eff:(k.fakt && !k.zustand ? k.rang + 100 : k.rang)
        - (k.zustand ? 14 * oft(fam(k.key), 2) + 5 * oft(fam(k.key), 8) : 8 * oft(fam(k.key), 2) + 3 * oft(fam(k.key), 8)),
      los:_spVisualHash(m.id + '|fuss|' + k.key)}))
    .sort((p, q) => q.eff - p.eff || q.rang - p.rang || p.los - q.los);
  for(const k of gewertet){
    const dd = k.data();
    if(!dd) continue;
    const v = {key:k.key, data:dd};
    if(k.zeigt) v.zeigt = k.zeigt;
    else if(k.zeile){ try { v.zeile = k.zeile(); } catch(e){} }
    return merke(v);
  }
  return null;
}
// Welche Füße als dieselbe Zeichnung gelten: jede Kurve ist eine Kurve,
// jede kleine Rangliste eine Rangliste, die Tabelle ist die Tabelle.
const SP_FUSS_FAMILIE = {kippt:'linie', plus:'linie', hoehe:'linie', monatsbest:'linie', halb:'linie',
  wende:'linie', hoch:'linie', woche:'rangliste', partner:'rangliste', spitze:'tabelle', rang:'tabelle',
  ueberholt:'tabelle', gipfel:'tabelle', serie:'serie', teamserie:'serie', duoserie:'serie',
  duell:'duell', gegner:'duell', nerven:'statistik', verteilung:'statistik', mosaik:'statistik',
  marken:'zahl', zaehlwerk:'zahl', tagesring:'tag', uhr:'tag'};
// Der Fuß der unmittelbar vorigen Partie, veröffentlicht oder in diesem
// Lauf gewählt; null, wenn sie keinen trug.
function _spFussVorher(m){
  const FB = _spFormBasis(), B = _spBasis(), bis = B.idx.get(m.id);
  if(bis == null || bis < 1) return null;
  const id = B.chrono[bis - 1].id;
  const pub = FB.scorePublished && FB.scorePublished.get(id);
  return pub ? ((pub.occasion && pub.occasion.key) || null) : ((FB.fussWahl && FB.fussWahl.get(id)) || null);
}
// ── Die Zeilen der Partie-Karte [§C33] ──────────────────────────────
// Unter der Schlagzeile (dem Hauptanlass) steht jeder übrige Anlass einmal:
// höchstens drei, ein neues Thema zuerst, eine Pleite hinter den Siegen,
// der Rest als Zahl. Was der Fuß zeichnet, steht nicht noch einmal als
// Zeile, und ist es nicht der Hauptanlass, steht sein Satz klein unter dem
// Fuß. Eine Nebensache steht nur im Blatt. Vorher trug fast jede zweite
// Karte vier Zeilen und darunter „und 2 weitere", unter „Julian holt die
// legendäre Auszeichnung ‚Dominator‘" stand „Julian holt ‚Carry‘ zum 5. Mal"
// — dieselbe Sorte Nachricht zweimal —, und die Serie, die der Fuß
// zeichnete, stand daneben als Zeile.
const SP_THEMA = {lead_change:'tabelle', tabellensprung:'tabelle', top_clash:'tabelle',
  badge_unlocked:'auszeichnung', badge_marken:'auszeichnung',
  streak_record:'serie', streak_killer:'serie', win_streak:'serie', top_form:'serie', loss_streak:'serie',
  fluch:'duell', rivalry_milestone:'duell', rivalry:'duell', revanche:'duell', giant_slayer:'duell',
  milestone_wins:'zahl', milestone_elo:'zahl', milestone_goals:'zahl', jubilee:'zahl', elo_hoch:'zahl',
  duo_jubilaeum:'duo', team_streak:'duo', team_loss_streak:'duo', tagesmarathon:'tag',
  duell_kippt:'duell', woche_spitze:'tabelle', tag_plus:'tag', tag_hoehe:'tag',
  monat_gewinn:'monat', monat_halb:'monat', partner_best:'duo',
  pleiten_ende:'serie', duo_pleiten_ende:'duo', rueckkehr:'pause'};
// Welche Meldungen ein Fuß zeichnet, je Zeichnung: nur für Füße, die vor
// `zeigt` gespeichert wurden.
const SP_FUSS_TYP = {spitze:['lead_change'], riss:['streak_killer'], marken:Object.keys(SP_MARKEN),
  serie:['win_streak'], teamserie:['team_streak'], duell:['rivalry_milestone', 'rivalry'], gegner:['fluch'],
  hoch:['elo_hoch'], rang:['tabellensprung'], revanche:['revanche'], chemie:['duo_jubilaeum'],
  tagesring:['tagesmarathon'], medaille:['badge_unlocked']};
function _spZeilen(teile, titel, occ){
  const kt = String(titel || '').trim();
  const ty = t => String((t && (t.typ || t.type)) || '');
  const ref = t => (t && (t.ref || t.dataRef)) || {};
  const thema = t => SP_THEMA[ty(t) === 'group' ? ref(t).sub : ty(t)] || '';
  const d = (occ && occ.data) || {}, l = occ && SP_FUSS_TYP[occ.key];
  const gezeichnet = t => {
    if(Array.isArray(occ && occ.zeigt)) return occ.zeigt.indexOf(_spFaktId(ref(t))) >= 0;
    const r = ref(t), pid = r.pid || r.playerId;
    if(!l || l.indexOf(ty(t)) < 0) return false;
    if(occ.key === 'medaille') return (r.rarity === 'rare' || r.rarity === 'legendary')
      && (r.badgeName || ((typeof BADGES !== 'undefined' && BADGES.find(b => b.id === r.badgeId)) || {}).name) === d.name;
    if(occ.key === 'marken') return (d.liste || []).some(x => x.pid === pid);
    return !(d.pid && pid && d.pid !== pid);
  };
  // Eine Nebensache: die gemeinsame Pleite und eine Auszeichnung, die keiner
  // will. Sie stand als rote Zeile unter jedem zweiten Sieg.
  const neben = t => ty(t) === 'team_loss_streak' || (ty(t) === 'badge_unlocked' && ref(t).rarity === 'negative');
  // Der Serien-Rekord enthält die Serie: unter „Leon stellt mit 5 Siegen
  // den Serien-Rekord der Liga auf" stand „Leon zündet die 5er-Serie".
  const rekordVon = new Set((teile || []).filter(t => ty(t) === 'streak_record').map(t => ref(t).pid));
  const alle = (teile || []).filter(t => ty(t) !== 'spiel' && !(ty(t) === 'win_streak' && rekordVon.has(ref(t).pid)));
  const haupt = alle.find(t => String(t.titel || '').trim() === kt) || null;
  const rest = alle.filter(t => t !== haupt);
  const fuss = rest.filter(gezeichnet).concat(haupt && gezeichnet(haupt) ? [haupt] : []);
  const frei = rest.filter(t => fuss.indexOf(t) < 0);
  const themen = new Set([haupt, fuss[0]].filter(Boolean).map(thema).filter(Boolean));
  const neu = [], wieder = [];
  frei.filter(t => !neben(t) && !t.neg).forEach(t => {
    const th = thema(t);
    if(!th || !themen.has(th)){ neu.push(t); if(th) themen.add(th); } else wieder.push(t);
  });
  const zeilen = neu.concat(wieder, frei.filter(t => !neben(t) && t.neg));
  // Die Zeile des Fußes: der Fakt, den er zeichnet, oder bei einer Form ihr
  // gespeicherter Satz (`zeile`). Sie steht als letzte Zeile direkt über
  // ihm. Zeichnet er den Hauptanlass, sagt es schon die Schlagzeile.
  const ic = occ && ((SP_FORM[occ.key] || {}).ic || (SP_ANLASS[occ.key] || {}).ic);
  // Sagt die Zeile einer Form dasselbe wie die Schlagzeile, zeichnet der
  // Fuß die Schlagzeile, und sie fällt weg. Gespeicherte Karten tragen den
  // alten Wortlaut („feiern den 5. gemeinsamen Sieg"), deshalb der Vergleich
  // auf den gemeinsamen Nenner.
  const gleich = x => String(x || '').trim().replace(/feiern den (\d+)\. gemeinsamen Sieg$/, 'gewinnen zum $1. Mal zusammen');
  const unter = fuss.length ? (fuss.indexOf(haupt) < 0 ? fuss[0] : null)
    : (occ && occ.zeile && gleich(occ.zeile) !== gleich(kt) ? {titel:occ.zeile, ic:ic || 'chartBar', form:true} : null);
  // Die Nebensachen fehlen nur hier: das Blatt zeigt jedes Teil.
  return {zeilen:zeilen.filter(t => t.brk).concat(zeilen.filter(t => !t.brk)), unter};
}
function _spVisualSnapshot(m, fakten){
  const score = _spScoreSnapshot(m);
  const fest = _spFormBasis().scorePublished.get(m.id);
  if(fest) return fest;
  return {version:2, score, occasion:_spAnlassSnapshot(m, fakten || [], score.key)};
}
// ── Der Kopf zeichnet Team A links und Team B rechts ──────────────────
// Bisher wurden Daten mit Seite A und B beim Zeichnen gespiegelt, damit die
// Sieger links stehen (`_spLinks`). Jetzt bleibt jede Seite, wo sie am
// Tisch steht: Daten mit A und B zeichnen sich so, wie sie sind, und ein
// Kopf, der nach Siegern und Verlierern rechnet, wird gespiegelt, wenn B
// gewann (`sp-b`, CSS). Der Stand liest sich dabei immer A:B (`_spSt`).
// Die Namen stehen in einer Zeile für alle Köpfe darunter (`_spTeamZeile`).
function _spScoreBild(v, m){
  if(!v || !v.key) return '';
  const aw = m ? m.winner === 'A' : (v.data && v.data.aw);
  // Unter dem Kopf steht die Teamzeile mit allen vier Namen (`tz`). Band,
  // Feld und Wippe schrieben sie ein zweites Mal unter ihre Gesichter, in
  // anderer Reihenfolge („Stefan, Leon" über „Leon, Stefan").
  const data = v.data && typeof v.data === 'object' && m
    ? Object.assign({}, v.data, v.data.aw == null ? {aw} : {}, {tz:true}) : v.data;
  const spezial = {krimi:_spTafelBild, aussenseiter:_spWippeBild, deutlich:_spBandBild,
    zeile:_spZeileBild, abstand:_spBandBild};
  let h = spezial[v.key] ? spezial[v.key](data) : SP_FORM_BILD[v.key] ? SP_FORM_BILD[v.key](data) : '';
  if(!h || !m) return h;
  h = h.replace(/<div class="sp-nz">[\s\S]*?<\/div>/g, '');
  if(aw === false && !SP_KOPF_AB.has(v.key)) h = h.replace(/^<div class="/, '<div class="sp-b ');
  return h + _spTeamZeile(m);
}
// Köpfe, deren Daten schon Seite A und B tragen: sie werden nicht gespiegelt.
const SP_KOPF_AB = new Set(['deutlich', 'abstand', 'zeile', 'krimi', 'feld', 'tauziehen', 'aussenseiter']);
function _spOccasionBild(v){
  if(!v || !v.key) return '';
  const data = v.data && typeof v.data === 'object'
    ? Object.assign({}, v.data, {nurAnlass:true}) : v.data;
  const bild = {
    spitze:_spTabelleBild, rang:_spTabelleBild, serie:_spSerieBild,
    wende:_spKurveBild, duell:_spDuellBild, riss:_spRissBild,
    teamserie:_spDuoBild, medaille:_spMedailleBild, marken:_spMarkenBild,
    kippt:_spKipptBild, woche:_spWocheBild, plus:_spTagEloBild, hoehe:_spTagEloBild,
    monatsbest:_spMonatEloBild, halb:_spMonatQuoteBild, partner:_spPartnerBild,
    premiere:_spPremiereBild, rolle:_spRolleBild,
    nerven:_spNervenBild, verteilung:_spVerteilungBild,
    aussenseiter:_spWippeBild
  };
  // Ein Fuß zeichnet den Stand der Partie nicht noch einmal (`nurAnlass`):
  // „10:8" stand im Kopf, in der Schlagzeile und im Kasten des Zählwerks.
  // Auf der Karte sagt die Zeile über dem Fuß, was er zeigt. Der Satz in
  // der Zeichnung („Johannes steigt von 2 auf 1 und führt, Maxi fällt von 1
  // auf 2") sagte es ein zweites Mal, unter der Schlagzeile „Johannes
  // übernimmt die Tabellenspitze" ein drittes. Das Blatt behält ihn.
  // Ein Fuß mit beiden Seiten steht wie der Kopf: Team A links, Team B
  // rechts (`ab`), und seine Bilanz liest sich A:B. Die Seite steht als
  // `awA` in den Daten und nicht als `aw`: daran liest `_spSt` die
  // Reihenfolge des Stands, und die alte Formkette, die dieselben Daten
  // ohne Spiegel zeichnet, las „8:10" neben den Siegern links.
  // Gespeicherte Füße ohne `awA` behalten die Sieger links.
  const ab = !!(data && data.awA === false && ['duoserie', 'revanche', 'gegner'].includes(v.key));
  if(ab){ data.ab = true; data.aw = false; }
  let h = bild[v.key] ? bild[v.key](data) : SP_FORM_BILD[v.key] ? SP_FORM_BILD[v.key](data) : '';
  if(ab) h = h.replace(/^<div class="/, '<div class="sp-b ');
  return h.replace(/<div class="sp-lg">[\s\S]*?<\/div>/g, '');
}
// Der Satz einer Partie nannte überall dieselben zwei Zahlen — „Die
// Siegchance lag vor dem ersten Aufschlag bei 73 %, für Maxi bringt der Sieg +13
// Elo" —, und an keiner Stelle sagten sie etwas über DIESE Partie. Er
// verliert sie deshalb überall (`_newsSpielSatz`); die gewöhnliche Partie
// bekommt ihren Satz aus ihrer Form, und das Blatt zeigt beide Zahlen
// gezeichnet.
const SP_ZEIGT_ALLES = {chance:true, elo:true};
// Gemerkt je Datenstand und Karte: der Feed zeichnet sich bei jedem Filter,
// jedem Zurück aus einem Blatt und jeder neuen Story neu, und die Bilder
// hängen nur an den Partien und den Namen. `matches` und `players` werden
// immer ersetzt, nie an Ort und Stelle verändert [§3 Caching].
const _spBildMemo = new WeakMap();
function _spBild(s){
  let proStand = _spBildMemo.get(matches);
  if(!proStand){ proStand = new WeakMap(); _spBildMemo.set(matches, proStand); }
  const alt = proStand.get(s);
  if(alt && alt.pl === players) return alt;
  let r = {kopf:'', fuss:'', zeigt:{}, key:'', form:'', glanz:false, pl:players};
  try {
    const basis = _newsSpielFakten(s).find(x => x.type === 'spiel') || s.dataRef || {};
    const v = basis.visual;
    if(v && v.version === 2 && v.score){
      const ok = v.occasion && v.occasion.key;
      r = {key:ok || v.score.key, form:v.score.key, occ:v.occasion || null,
        glanz:['zaehlwerk','marken','rueckkehr','transfer'].includes(ok || v.score.key),
        kopf:_spScoreBild(v.score, _spMatch(basis.matchId)), fuss:_spOccasionBild(v.occasion),
        zeigt:SP_ZEIGT_ALLES, pl:players};
      proStand.set(s, r);
      return r;
    }
    const a = _spAnlass(s);
    if(a.key === 'feld'){
      const f = _spFormBild(a.m);
      r = {key:'feld', form:f.key, glanz:f.glanz, kopf:f.html, fuss:'', zeigt:SP_ZEIGT_ALLES, pl:players};
    } else if(a.key){
      r = {key:a.key, form:'', glanz:false, kopf:SP_KOPF[a.key](a) || _newsErgebnisBand(a.m.id),
           fuss:(SP_FUSS[a.key] ? SP_FUSS[a.key](a) : '') || '', zeigt:SP_ZEIGT_ALLES, pl:players};
    }
  } catch(e){
    r = {kopf:'', fuss:'', zeigt:{}, key:'', form:'', glanz:false, pl:players};
  }
  proStand.set(s, r);
  return r;
}

// ── Die Runde der Vier [§C33] ────────────────────────────────────────
// Dieselben vier, Partie auf Partie, standen als Karten untereinander, und
// dass es eine Runde war, sah man nur an den Wappen. Die Runde ist deshalb
// eine eigene Story — ZUSÄTZLICH zu den Karten ihrer Partien, die einzeln
// bleiben, mit ihrem eigenen Bild [§C33]. Sie entsteht, wenn die Runde zu
// ist: dreißig Minuten nach der letzten Partie, und dieser Zeitpunkt ist ihr
// Zeitstempel. Vorher weiß niemand, ob noch eine Partie kommt.
//
// Die Runde war zuerst eine Ableitung bei der Anzeige, die die Karten ihrer
// Partien aufnahm. Damit stand bei vier Spielern nur noch die Runde da, und
// die Bilder der einzelnen Partien — Spielfeld, Anzeigetafel, Wippe — gingen
// verloren. Jetzt ist sie eine Story wie jede andere: die ID trägt die erste
// Partie, gespeichert wird sie einmal, und was einmal dasteht, bleibt.
function _newsRundenStories(nowMs){
  const out = [];
  const seit = nowMs - NEWS_FENSTER_TAGE * 86400000;
  _spBasis().runden.forEach(r => {
    const ende = r.t + RUNDE_PAUSE_MS;
    if(ende > nowMs || r.t < seit) return;
    const st = _newsRundeStory(r, ende);
    if(st) out.push(st);
  });
  return out;
}
function _newsRundeStory(r, ende){
  const ms = r.ids.map(_spMatch).filter(Boolean);
  if(ms.length < RUNDE_MIN) return null;
  const ids = [ms[0].a1, ms[0].a2, ms[0].b1, ms[0].b2];
  const z = {};
  ids.forEach(id => { z[id] = {id, w:0, l:0, e:0}; });
  ms.forEach(m => ids.forEach(id => { _spGew(m, id) ? z[id].w++ : z[id].l++; z[id].e += _newsEloDelta(id, m.id) || 0; }));
  const spieler = ids.map(id => z[id]).sort((a, b) => b.w - a.w || b.e - a.e);
  const top = spieler[0];
  const vorn = spieler.filter(x => x.w === top.w).map(x => x.id);
  const n = ms.length;
  const paarungen = new Set(ms.map(m => paarKey([m.a1, m.a2].sort().join('+'), [m.b1, m.b2].sort().join('+')))).size;
  // Die Schlagzeile nennt, wer die Runde gewonnen hat. Spielen immer
  // dieselben zwei Teams, ist es ein Duell und kein Turnier: dann gewinnt
  // ein Team oder beide trennen sich. Wechseln die Paarungen und steht
  // niemand allein vorn, teilen sie sich die Runde — alle vier hieße, jeder
  // hat gleich oft gewonnen.
  const teamA = [ms[0].a1, ms[0].a2], teamB = [ms[0].b1, ms[0].b2];
  const zwei = t => _namenListe(t.map(_spName));
  let title;
  if(paarungen === 1){
    const wa = ms.filter(m => _spGew(m, teamA[0])).length, wb = n - wa;
    title = wa === wb
      ? `${zwei(teamA)} trennen sich von ${zwei(teamB)} ${wa}:${wb}`
      : `${zwei(wa > wb ? teamA : teamB)} gewinnen die Runde gegen ${zwei(wa > wb ? teamB : teamA)} ${Math.max(wa, wb)}:${Math.min(wa, wb)}`;
  } else if(vorn.length === 1){
    title = `${_spName(top.id)} gewinnt die Runde mit ${top.w} von ${n} Sätzen`;
  } else if(vorn.length === 4){
    title = `${_namenListe(vorn.map(_spName))} gewinnen je ${top.w === 1 ? 'ein Satz' : top.w + ' Sätze'}`;
  } else {
    title = `${_namenListe(vorn.map(_spName))} teilen sich die Runde`;
  }
  // Die Uhrzeiten stehen im Satz: an ihnen lässt sich die Runde nachlesen.
  const desc = `${n} Sätze zwischen ${datumFmt(mts(ms[0]), 'uhr')} und ${datumFmt(mts(ms[n - 1]), 'uhr')} Uhr`
    + (paarungen === 3 ? ', jede Paarung mindestens einmal.' : paarungen > 1 ? `, ${paarungen} verschiedene Paarungen.` : ', immer dieselben Teams.');
  return {
    id:'runde_' + ms[0].id, cat:'highlight', ic:'users', when:new Date(ende),
    prio:STORY_PRIO.runde, title, desc,
    dataRef:{type:'runde', matchIds:ms.map(m => m.id), playerIds:ids, spieler, paarungen}
  };
}
// Der Anlass einer Partie der Runde: aus ihrer Karte im Feed, damit die Zeile
// dasselbe Zeichen trägt wie die Karte darüber [§C27].
const _spKarteMemo = new WeakMap();
function _spKarteDerPartie(mid){
  const l = getStoriesCache();
  let m = _spKarteMemo.get(l);
  if(!m){
    m = new Map();
    l.forEach(s => { const d = s.dataRef || {};
      if(d.matchId && (d.type === 'spiel' || (d.type === 'sammel' && d.quelle === 'spiel'))) m.set(d.matchId, s); });
    _spKarteMemo.set(l, m);
  }
  return m.get(mid) || null;
}
// Die Tafel der Runde ist eine Tabelle: eine Zeile je Spieler, der Name in
// der breiten Spalte. In vier Spalten nebeneinander hatte jeder Name ein
// Viertel der Karte.
function _spRundeTafel(sp){
  if(!sp || sp.length < 2) return '';
  const allein = sp[0].w > sp[1].w;
  const maxE = Math.max(8, ...sp.map(x => Math.abs(x.e)));
  return `<div class="sp-rd-tafel">${sp.map((x, i) => `<div class="sp-rd-sp${i === 0 && allein ? ' erst' : ''}" style="--i:${i}">${_spChip(x.id)}`
    + `<span class="sp-rd-m"><span class="sp-rd-n">${_spNb(x.id)}</span>`
    + `<i class="sp-rd-e ${x.e >= 0 ? 'g' : 'r'}"><u style="width:${(Math.abs(x.e) / maxE * 100).toFixed(0)}%"></u></i></span>`
    + `<span class="sp-rd-wl num">${_spZahl(x.w)}:${_spZahl(x.l)}</span>`
    + `<em class="num ${x.e >= 0 ? 'g' : 'r'}">${_spVz(x.e)}</em></div>`).join('')}</div>`;
}
// Eine Partie der Runde in einer Zeile: Uhrzeit, Paarung, Stand und ihr
// Anlass. Im Blatt öffnet die Zeile das Blatt der Partie.
function _spRundeZeile(mid, i, imBlatt){
  const m = _spMatch(mid);
  if(!m) return '';
  const aw = m.winner === 'A';
  const t = (ids, w) => `<span class="sp-rd-t${w ? ' w' : ''}">${_spChips(ids)}</span>`;
  let an = '';
  try { const k = _spKarteDerPartie(mid); an = k ? _spAnlass(k).key : ''; } catch(e){ an = ''; }
  const a = SP_ANLASS[an];
  return `<div class="sp-rd-p" style="--i:${i}"${imBlatt ? ` data-mid="${esc(mid)}"` : ''}><span class="sp-rd-u num">${datumFmt(mts(m), 'uhr')}</span>${t(_spTeam(m, 'A'), aw)}`
    + `<b class="num">${_spStand({sa:m.games_a, sb:m.games_b, aw, mm:m})}</b>${t(_spTeam(m, 'B'), !aw)}`
    + (a && a.kurz ? `<span class="sp-rd-a">${svgI(a.ic)}<span>${esc(a.kurz)}</span></span>` : '<span></span>')
    + `</div>`;
}
// Die Karte ist eine ZUSAMMENFASSUNG. Sie trug die Tabelle, die Schlagzeile
// und darunter jede Partie als Zeile mit vier Wappen — und genau diese
// Partien stehen direkt darunter als eigene Karten: wer scrollte, las jedes
// Spiel zweimal. Jetzt steht die Tabelle als eine Reihe aus vier Feldern, und
// die Partien nur noch als Streifen aus Uhrzeit und Stand — die Wappen und den
// Anlass trägt jede Partie auf ihrer eigenen Karte. Eine Kennzeile in
// Kleinschrift über der Schlagzeile („Zusammenfassung von 4 Partien am Stück,
// nur …") ist wieder weg: sie wiederholte, was Rubrik, Satz und die vier
// Felder schon sagen, und las sich als Fußnote vor der Überschrift.
// Die Fläche ist leiser und ohne Schein: die Karte erzählt nichts Neues,
// sie bündelt. Das Motiv bleibt — jede Karte trägt ihres [§C27]. Das Blatt
// zeigt alles.
// Die Tabelle der Runde in einer Reihe: vier Felder, der Sieger vorn. Ein
// Name steht nur, wenn er in ein Viertel der Breite passt [§C33]; sonst
// tragen die Wappen die Initialen, und das Blatt nennt alle vier.
function _spRundeKurz(sp){
  if(!sp || sp.length < 2) return '';
  const allein = sp[0].w > sp[1].w;
  const namen = _spPasst(sp.map(x => x.id), 9);
  return `<div class="sp-rq">${sp.map((x, i) => `<div class="sp-rq-f${i === 0 && allein ? ' erst' : ''}" style="--i:${i}">`
    + `${_spChip(x.id)}${namen ? `<span class="sp-rq-n">${esc(_spName(x.id))}</span>` : ''}`
    + `<span class="sp-rq-wl num">${_spZahl(x.w)}:${_spZahl(x.l)}</span>`
    + `<em class="num ${x.e >= 0 ? 'g' : 'r'}">${_spVz(x.e)}</em></div>`).join('')}</div>`;
}
function _spRundeStreifen(ids){
  return `<div class="sp-rs">${ids.map((mid, i) => {
    const m = _spMatch(mid);
    if(!m) return '';
    const hoch = Math.max(m.games_a, m.games_b), tief = Math.min(m.games_a, m.games_b);
    return `<span class="sp-rs-z" style="--i:${i}"><i class="num">${datumFmt(mts(m), 'uhr')}</i><b class="num">${_spZahl(hoch)}:${_spZahl(tief)}</b></span>`;
  }).join('')}</div>`;
}
function _newsRundeHtml(s, isRead, fadenHtml){
  const d = s.dataRef || {};
  const ps = d.matchIds || [];
  return `<div class="nf-card nf-s-spiel nf-runde nfc-${esc(s.cat || 'fun')}${isRead ? ' read' : ''}" data-sid="${esc(s.id)}">
    ${_newsMotiv('spiel', s)}
    <div class="nf-top"><span class="nf-rub"><i>${svgI('users')}</i><b>DIE RUNDE</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div><div class="nf-d">${_newsBetont(s.desc || '')}</div></div>
      <span class="nf-chev">${svgI('chevron')}</span></div>
    ${_spRundeKurz(d.spieler || [])}${_spRundeStreifen(ps)}${fadenHtml || ''}</div>`;
}
// Das Blatt der Runde: die Tabelle, wer mit wem an welcher Stange stand, und
// jede Partie mit ihrer Uhrzeit. Die Aufstellung ist eine Matrix — eine
// Spalte je Partie, eine Zeile je Spieler —, in Blöcken zu acht:
// dreiundzwanzig Spalten wären auf einem Telefon Striche.
function _newsRundeBlatt(s){
  const d = s.dataRef || {};
  const ps = (d.matchIds || []).map(_spMatch).filter(Boolean);
  const ids = (d.spieler || []).map(x => x.id);
  if(!ps.length || !ids.length) return '';
  const rolle = (m, id) => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_side'];
  const bloecke = [];
  for(let i = 0; i < ps.length; i += 8) bloecke.push(ps.slice(i, i + 8));
  const matrix = bloecke.map(bl => `<div class="sp-rm" style="--n:${bl.length}">`
    + `<span></span>${bl.map(m => `<span class="sp-rm-u num">${datumFmt(mts(m), 'uhr')}</span>`).join('')}`
    + ids.map(id => `${_spChip(id)}${bl.map(m => {
        const w = _spGew(m, id), r = rolle(m, id);
        return `<span class="sp-rm-z ${w ? 'w' : 'l'}">${r === 'reves' ? 'A' : r === 'drive' ? 'S' : ''}</span>`;
      }).join('')}`).join('') + `</div>`).join('');
  // Die Zeilen stehen in derselben Folge wie die Tabelle darüber, mit
  // Gesicht. Eine Legende („Von oben nach unten: … S steht für Sturm, A für
  // Abwehr, grün für gewonnen …") erklärte die Zeichnung, statt sie zu zeigen.
  return `<div class="nd-section">Die Tabelle der Runde</div>${_spRundeTafel(d.spieler)}`
    + `<div class="nd-section">Wer mit wem</div><div class="sp-rms">${matrix}</div>`
    + `<div class="nd-section">Die Sätze</div><div class="sp-rd-ps nd-rd">${(d.matchIds || []).map((mid, i) => _spRundeZeile(mid, i, true)).join('')}</div>`;
}
