// ╔═══ §1.3 ─── PADEL: SÄTZE, GAMES, SIEGER ───────────────────────────╗
//     Die eine Stelle, die ein Padel-Ergebnis liest. Eingabe, Elo, Badges,
//     Chronik, News und jede Ansicht fragen hier, statt selbst zu zählen.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Eine Partie trägt ihre Sätze als Games aus Sicht von Team A, z. B.
// [[6,4],[3,6],[10,8]], und je Satz eine Art:
//   'n'    normaler Satz (6:4, 7:5, auch ein kurzer 4:2)
//   'tb'   im Tiebreak entschieden (7:6)
//   'mtb'  Match-Tiebreak statt eines dritten Satzes, in Punkten (10:8)
//   'open' nicht zu Ende gespielt (die Zeit auf dem Platz war um)
// Gespielt wird je nach Tag verschieden: ein Satz und dann Teamwechsel
// (1:0), zwei oder drei Sätze, bei langen Sessions auch 3:0. Die Prüfung
// ist deshalb großzügig: jeder beendete Satz braucht einen Sieger, mehr
// nicht. Eine strenge Tennisprüfung hätte jeden kurzen Satz abgewiesen.
//
// Was daraus folgt und überall gleich gemeint ist:
//   Satzstand   die beendeten Sätze, z. B. 2:1. Ein offener Satz zählt nicht.
//   Games       alle Games; ein Match-Tiebreak zählt als ein Game für den,
//               der ihn gewinnt (sonst wöge ein 10:8 mehr als ein ganzer Satz).
//   Zu Null     ein Satz ohne abgegebenes Game, 6:0 (ein Bagel). Die Liga
//               zählt alles je Satz; vorher hieß Zu Null „zwei Sätze ohne
//               Satzverlust" und hing an der Begegnung.
//   Bagel       ein beendeter normaler Satz 6:0 (oder höher zu null).
//   Doppel-Bagel  zwei oder mehr Sätze zu Null in einem Match.
//   Wende       den ersten Satz verloren und das Match gewonnen.
//   Umkämpft    der Verlierer hat mindestens einen Satz gewonnen.
//   Tiebreak-Krimi  der entscheidende Satz ging in den Tiebreak oder
//               Match-Tiebreak, und der Verlierer hatte selbst einen Satz
//               gewonnen — oder es war der einzige Satz.

const SATZ_ARTEN = ['n', 'tb', 'mtb', 'open'];
// Ab welchem Wert ein Satz ohne Angabe als Match-Tiebreak gilt: kein Satz
// in Games erreicht zehn, ein Match-Tiebreak immer.
const MTB_AB = 10;
// Welcher Satz ein Bagel ist: der Gewinner hat mindestens sechs Games, der
// Verlierer keins. Ein kurzer 4:0 ist ein klarer Satz, aber kein Bagel.
const BAGEL_AB = 6;

// Die Art eines Satzes. Ohne Angabe wird sie aus den Zahlen gelesen:
// 7:6 ist ein Tiebreak, ab zehn ein Match-Tiebreak.
function satzArt(satz, art){
  if(SATZ_ARTEN.includes(art)) return art;
  const a = +satz[0] || 0, b = +satz[1] || 0, hi = Math.max(a, b), lo = Math.min(a, b);
  if(hi >= MTB_AB) return 'mtb';
  if(hi === 7 && lo === 6) return 'tb';
  return 'n';
}
// Wer einen Satz gewonnen hat: 'A', 'B' oder null (offen oder gleich).
function satzSieger(satz, art){
  if(satzArt(satz, art) === 'open') return null;
  const a = +satz[0] || 0, b = +satz[1] || 0;
  return a > b ? 'A' : b > a ? 'B' : null;
}

// Die Sätze einer Partie, aufgeräumt: immer Paare ganzer Zahlen ab null,
// die Art je Satz gesetzt. Fehlt `sets` (eine Zeile ohne Sätze), steht dort
// ein einziger Satz aus den Games — besser als eine Partie ohne Ergebnis.
function partieSaetze(m){
  let s = m && m.sets;
  if(typeof s === 'string'){ try { s = JSON.parse(s); } catch(e){ s = null; } }
  let k = m && m.set_kind;
  if(typeof k === 'string'){ try { k = JSON.parse(k); } catch(e){ k = null; } }
  if(!Array.isArray(s) || !s.length){
    const a = Math.max(0, Math.round(+(m && m.games_a) || 0)), b = Math.max(0, Math.round(+(m && m.games_b) || 0));
    return [{a, b, art: satzArt([a, b])}];
  }
  return s.map((x, i) => {
    const a = Math.max(0, Math.round(+(x && x[0]) || 0)), b = Math.max(0, Math.round(+(x && x[1]) || 0));
    return {a, b, art: satzArt([a, b], Array.isArray(k) ? k[i] : null)};
  });
}

// Die Auswertung einer Satzliste, unabhängig davon, ob sie schon in einer
// Partie steht: die Eingabe rechnet damit live, bevor gespeichert ist.
function saetzeAuswerten(saetze){
  let setsA = 0, setsB = 0, gamesA = 0, gamesB = 0, bagelsA = 0, bagelsB = 0, fehler = null;
  const sieger = [];
  saetze.forEach((s, i) => {
    const w = satzSieger([s.a, s.b], s.art);
    sieger.push(w);
    if(s.art !== 'open' && !w) fehler = fehler || `Satz ${i + 1} braucht einen Sieger — oder als nicht beendet markieren.`;
    if(w === 'A') setsA++; else if(w === 'B') setsB++;
    if(s.art === 'mtb'){
      if(w === 'A') gamesA++; else if(w === 'B') gamesB++;
    } else { gamesA += s.a; gamesB += s.b; }
    if(s.art === 'n' && w === 'A' && s.b === 0 && s.a >= BAGEL_AB) bagelsA++;
    if(s.art === 'n' && w === 'B' && s.a === 0 && s.b >= BAGEL_AB) bagelsB++;
  });
  // Sieger: mehr Sätze; bei Satzgleichstand (die Zeit war um) mehr Games.
  let winner = setsA > setsB ? 'A' : setsB > setsA ? 'B' : gamesA > gamesB ? 'A' : gamesB > gamesA ? 'B' : null;
  if(!saetze.length) fehler = fehler || 'Mindestens einen Satz eintragen.';
  else if(!winner) fehler = fehler || 'Gleichstand in Sätzen und Games — einen Satz beenden oder einen Match-Tiebreak eintragen.';
  const beendet = saetze.filter(s => s.art !== 'open');
  const ersterSieger = sieger.find(x => x);
  const letzterIdx = (() => { for(let i = sieger.length - 1; i >= 0; i--) if(sieger[i]) return i; return -1; })();
  const letzter = letzterIdx >= 0 ? saetze[letzterIdx] : null;
  const verlSaetze = winner === 'A' ? setsB : winner === 'B' ? setsA : 0;
  const winSaetze  = winner === 'A' ? setsA : winner === 'B' ? setsB : 0;
  const gW = winner === 'B' ? gamesB : gamesA, gL = winner === 'B' ? gamesA : gamesB;
  const total = gamesA + gamesB;
  const tiebreaks = [];
  saetze.forEach((s, i) => { if((s.art === 'tb' || s.art === 'mtb') && sieger[i]) tiebreaks.push({art: s.art, sieger: sieger[i]}); });
  const zuNull = !!winner && winSaetze >= 1 && verlSaetze === 0
    && (winner === 'A' ? bagelsA : bagelsB) === winSaetze;
  const doppelBagel = zuNull && winSaetze >= 2;
  const umkaempft = !!winner && verlSaetze > 0;
  const entscheidTb = !!letzter && (letzter.art === 'tb' || letzter.art === 'mtb')
    && sieger[letzterIdx] === winner && (umkaempft || winSaetze === 1);
  const gameDiff = Math.abs(gamesA - gamesB);
  return {
    saetze, sieger, winner, fehler,
    setsA, setsB, gamesA, gamesB, bagelsA, bagelsB,
    satzZahl: beendet.length, offen: saetze.length - beendet.length,
    gameDiff, gameAnteil: total ? gW / total : 0.5,
    zuNull, doppelBagel, umkaempft,
    wende: !!winner && !!ersterSieger && ersterSieger !== winner,
    tiebreaks, mtb: saetze.some(s => s.art === 'mtb'),
    entscheidTb,
    // Knapp: umkämpft, im Tiebreak entschieden oder ein voller Satz mit
    // höchstens zwei Games Abstand (6:4, 7:5). Ein kurzer 1:0 oder 3:2 ist
    // nicht knapp, er war nur kurz. Deutlich: kein Satz abgegeben und
    // mindestens drei Viertel der Games — 6:2 ist deutlich, 6:3 nicht.
    knapp: !!winner && (umkaempft || entscheidTb || (gameDiff <= 2 && gW >= 6)),
    deutlich: !!winner && !umkaempft && total >= 6 && gW / total >= 0.75,
    gamesSieger: gW, gamesVerlierer: gL,
  };
}

// Die Auswertung einer gespeicherten Partie, gemerkt je Objekt. Der
// Schlüssel enthält die Sätze: eine bearbeitete Partie ist dasselbe Objekt
// mit anderem Ergebnis.
const _partieMemo = new WeakMap();
function partie(m){
  const sig = JSON.stringify(m.sets || null) + '|' + JSON.stringify(m.set_kind || null) + '|' + m.games_a + ':' + m.games_b;
  const hit = _partieMemo.get(m);
  if(hit && hit.sig === sig) return hit.p;
  const p = saetzeAuswerten(partieSaetze(m));
  // Gespeichert ist der Sieger in der Zeile; bei einer alten oder von Hand
  // geänderten Zeile gilt der, nicht die Rechnung.
  if(m.winner === 'A' || m.winner === 'B') p.winner = m.winner;
  _partieMemo.set(m, {sig, p});
  return p;
}

// Aus Sicht eines Teams ('A' oder 'B'): gewonnene und verlorene Sätze und
// Games, Bagels gegeben und kassiert.
function partieFuer(m, team){
  const p = partie(m), a = team === 'A';
  return {
    won: p.winner === team,
    setsFor: a ? p.setsA : p.setsB, setsAgainst: a ? p.setsB : p.setsA,
    gamesFor: a ? p.gamesA : p.gamesB, gamesAgainst: a ? p.gamesB : p.gamesA,
    bagelsFor: a ? p.bagelsA : p.bagelsB, bagelsAgainst: a ? p.bagelsB : p.bagelsA,
    tbWon: p.tiebreaks.filter(t => t.sieger === team).length,
    tbLost: p.tiebreaks.filter(t => t.sieger !== team).length,
  };
}
// Auf welcher Seite ein Spieler in einer Partie stand und in welchem Team.
function teamVon(m, id){ return (m.a1 === id || m.a2 === id) ? 'A' : (m.b1 === id || m.b2 === id) ? 'B' : null; }
function seiteVon(m, id){
  for(const k of ['a1', 'a2', 'b1', 'b2']) if(m[k] === id) return m[k + '_side'];
  return null;
}

// Der Stand als Text, Satz für Satz: „6:4 3:6 10:8". Ohne zweites Argument
// aus Sicht des Siegers, mit `false` aus Sicht des Verlierers. Ein offener
// Satz steht in Klammern.
function saetzeText(m, gewonnen = true){
  const p = partie(m), umdrehen = (p.winner === 'B') === gewonnen;
  return p.saetze.map(s => {
    const t = umdrehen ? s.b + ':' + s.a : s.a + ':' + s.b;
    return s.art === 'open' ? '(' + t + ')' : t;
  }).join(' ');
}
// Die einzelnen beendeten Sätze aus Sicht des Siegers, z. B. „6:4" — für
// die Häufigkeit eines Satzergebnisses.
function satzErgebnisse(m){
  const p = partie(m), umdrehen = p.winner === 'B';
  return p.saetze.filter(s => s.art !== 'open' && s.art !== 'mtb')
    .map(s => umdrehen ? s.b + ':' + s.a : s.a + ':' + s.b);
}

// Was ein Satz an Elo bewegen darf, nach seiner Länge — und Länge heißt
// hier der Weg bis zum Sieg, nicht wie knapp es war: gezählt werden nur die
// Games, die der Sieger gewinnen musste. Zählten die des Gegners mit, brächte
// ein 6:4 mehr als ein 6:0, und ein knapper Satz würde belohnt.
// Die Staffel hat die Liga vorgegeben: ein Satz bis 6 ist das volle Gewicht,
// gleich wie er ausging; bis 1 die Hälfte, bis 3 drei Viertel, dazwischen
// gerade Linien (bis 2 also 62,5 %, bis 4 rund 83 %, bis 5 rund 92 %). Geht
// ein Satz über 6 hinaus (7:5, 7:6, 8:6), wird er länger, und jedes Game
// darüber bringt zehn Prozent mehr; bei 150 % ist Schluss, damit ein
// vertipptes 16:14 nicht das Dreifache eines Satzes bewegt. Ein
// Match-Tiebreak zählt wie ein Satz bis 2. Wie deutlich es war, sagt die
// MoV (`movMult`).
// Gerechnet wird je Satz (`partieTeile`): die Gruppe trägt mal jeden Satz
// einzeln ein, mal drei Sätze als eine Partie, und beides soll dieselbe Elo
// geben. Vorher wog die ganze Partie nach ihren Games zusammen, und ein
// 2:1 brachte dem Sieger alles und dem Verlierer nichts für seinen Satz.
// Die drei Stufen stehen als Regler in den Einstellungen (`gewicht_eins`,
// `gewicht_drei`, `gewicht_ueber6`); hier die Werte, die die Liga vorgab.
const GEWICHT_STUETZEN_STANDARD = {eins:0.5, drei:0.75};
const GEWICHT_JE_GAME_UEBER_6 = 0.1;
const GEWICHT_MAX = 1.5;
const GEWICHT_MTB_GAMES = 2;
function satzGewichtNachGames(g){
  const ueber = cfg.gewicht_ueber6 ?? GEWICHT_JE_GAME_UEBER_6;
  if(g >= 6) return Math.min(GEWICHT_MAX, 1 + ueber * (g - 6));
  const stuetzen = [[1, cfg.gewicht_eins ?? GEWICHT_STUETZEN_STANDARD.eins],
    [3, cfg.gewicht_drei ?? GEWICHT_STUETZEN_STANDARD.drei], [6, 1]];
  if(g <= stuetzen[0][0]) return stuetzen[0][1];
  for(let i = 1; i < stuetzen.length; i++){
    const [g1, w1] = stuetzen[i - 1], [g2, w2] = stuetzen[i];
    if(g <= g2) return w1 + (w2 - w1) * (g - g1) / (g2 - g1);
  }
  return 1;
}
function partieGewicht(m){
  const p = partie(m);
  return satzGewichtNachGames(p.mtb ? GEWICHT_MTB_GAMES : p.gamesSieger);
}
// Ging der Satz über sechs hinaus oder in einen Tiebreak? Dann hat der
// Verlierer ihn lange offen gehalten, und die Elo gleicht ihm einen Teil
// des Verlusts aus (TIEBREAK_AUSGLEICH in der Engine): ein 7:6 wiegt für
// den Sieger mehr als ein 6:4 und kostete den Verlierer sonst ebenso mehr.
function satzUeberSechs(m){
  const p = partie(m);
  return p.gamesSieger > 6 || p.mtb || p.tiebreaks.length > 0;
}

// Die Sätze einer Partie, jeder als eigene Partie mit denselben Spielern
// und Seiten — so, als wäre er einzeln eingetragen. Die Elo rechnet sie
// nacheinander [§3.6]. Ein offener Satz zählt nach seinen Games; steht er
// gleich, hat er keinen Sieger und bewegt nichts.
function partieTeile(m){
  return partieSaetze(m).map((s, i) => Object.assign({}, m, partieFelder([s]), {satzNr:i + 1}))
    .filter(t => t.winner === 'A' || t.winner === 'B');
}

// Die Speicherfelder einer Partie aus ihren Sätzen: was in der Zeile neben
// `sets` steht, damit Abfragen und der Export nicht selbst zählen.
function partieFelder(saetze){
  const p = saetzeAuswerten(saetze);
  return {
    sets: saetze.map(s => [s.a, s.b]),
    set_kind: saetze.map(s => s.art),
    sets_a: p.setsA, sets_b: p.setsB,
    games_a: p.gamesA, games_b: p.gamesB,
    winner: p.winner,
  };
}

// ── Die Partie über mehrere Sätze [§1.3] ─────────────────────────────
// Eine Zeile ist ein Satz: wer drei Sätze auf einmal einträgt, bekommt drei
// Zeilen, wie wer jeden einzeln speichert. Vorher war eine Zeile die ganze
// Partie, und dieselbe Partie stand im Verlauf als „18:16", im Blatt als
// „2:1" mit der Elo der alten Rechnung und in der Story mit einer dritten
// Zahl. Was nur über mehrere Sätze Sinn ergibt — wer die Partie gewann, 2:1,
// die Wende, Zu Null ab 2:0, der Doppel-Bagel, drei umkämpfte Sätze —
// steht in der Begegnung: Sätze derselben zwei Paare direkt hintereinander,
// ohne andere Partie dazwischen, am selben Tag und höchstens
// BEGEGNUNG_PAUSE_MIN nach dem Satz davor. Gewertet wird sie an ihrem
// LETZTEN Satz (`begegnungAm`); an jedem anderen ist sie leer, sonst zählte
// eine Wende einmal je Satz. Kommt ein Satz dazu, wandert die Wertung zu ihm.
const BEGEGNUNG_PAUSE_MIN = 90;
const _BEGEGNUNG_LEER = Object.freeze({winner:null, setsA:0, setsB:0, zuNull:false, wende:false,
  doppelBagel:false, umkaempft:false, saetze:[], n:0});
let _begMemo = {liste:null, laenge:-1, gruppen:null};
const _paarSchluessel = (p, q) => [p, q].sort().join('|');
function _begegnungsGruppen(){
  if(_begMemo.liste === matches && _begMemo.laenge === matches.length) return _begMemo.gruppen;
  const gruppen = new Map();
  const folge = matches.slice().sort((x, y) => mts(x) - mts(y));
  let akt = null, vor = null;
  for(const m of folge){
    const a = _paarSchluessel(m.a1, m.a2), b = _paarSchluessel(m.b1, m.b2);
    const gleich = vor && akt && ((a === akt.a && b === akt.b) || (a === akt.b && b === akt.a))
      && tagKey(mts(m)) === tagKey(mts(vor)) && mts(m) - mts(vor) <= BEGEGNUNG_PAUSE_MIN * 60000;
    if(!gleich) akt = {a, b, zeilen:[]};
    akt.zeilen.push(m);
    gruppen.set(m.id, akt);
    vor = m;
  }
  _begMemo = {liste:matches, laenge:matches.length, gruppen};
  return gruppen;
}
// Die ganze Begegnung, zu der ein Satz gehört, aus Sicht SEINES Teams A:
// die Sätze in ihrer Reihenfolge (gedreht, wo die Paare andersherum
// eingetragen waren) und ihre Wertung. Ein Satz, der in keiner Liste steht
// (die Vorschau beim Eintragen), ist für sich allein eine Begegnung.
function begegnungVon(m){
  const g = _begegnungsGruppen().get(m.id);
  const zeilen = g ? g.zeilen : [m];
  const aRef = _paarSchluessel(m.a1, m.a2);
  const saetze = [];
  zeilen.forEach(z => {
    const gedreht = _paarSchluessel(z.a1, z.a2) !== aRef;
    partieSaetze(z).forEach(s => saetze.push(gedreht ? {a:s.b, b:s.a, art:s.art} : s));
  });
  const p = saetzeAuswerten(saetze);
  return Object.assign({}, p, {saetze, n:zeilen.length, zeilen, letzte:zeilen[zeilen.length - 1] === m || !g,
    nr:zeilen.indexOf(m) + 1 || 1});
}
// Die Wertung über mehrere Sätze, nur am letzten Satz der Begegnung.
function begegnungAm(m){
  const b = begegnungVon(m);
  return b.letzte ? b : _BEGEGNUNG_LEER;
}
// Aus Sicht eines Spielers: gewann sein Team die Begegnung, die an diesem
// Satz endet? Null, wenn hier keine endet.
function begegnungGewonnen(m, id){
  const b = begegnungAm(m);
  return b.winner ? teamVon(m, id) === b.winner : null;
}
