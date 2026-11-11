// ╔═══ §2.7 ─── RANG-SYSTEM (Durchschnitts-Saison-Elo) ─────────────────╗
//     Spieler-Rang ergibt sich aus dem durchschnittlichen Saison-Elo über
//     alle absolvierten Saisons.
// ╚═════════════════════════════════════════════════════════════════════════╝
const RANKS=[
  {label:'Legende',   icon:'rang5',  color:'var(--gold)',   pct:0.10},
  {label:'Elite',     icon:'rang4',   color:'var(--purple)', pct:0.30},
  {label:'Stark',     icon:'rang3',  color:'var(--acid)',   pct:0.60},
  {label:'Solide',    icon:'rang2', color:'var(--blue)',   pct:0.85},
  {label:'Einsteiger',icon:'rang1',   color:'var(--orange)', pct:1.00},
];

// Mit `bisMs` der Stand bis dorthin — für den eingefrorenen Rang eines
// Ruheständlers [§C40], der sich mit späteren Partien anderer nicht
// verschieben darf.
function getSeasonAvgElos(bisMs){
  // Direkter Lookup aus getGlobalSim — der globale Sim hat bereits Karriere-Elo
  // (gewichteter Durchschnitt aller Saison-End-Elos). Vermeidet Doppelberechnung.
  const sim=bisMs==null?getGlobalSim():getSimAt(bisMs);
  const avgs={};
  players.forEach(p=>{
    avgs[p.id]=sim.careerElo[p.id]!==null && sim.careerElo[p.id]!==undefined
      ? Math.round(sim.careerElo[p.id]) : null;
  });
  return avgs;
}
// Die Rangstufen der Ewigen Tafel aus einer Elo-Tabelle. Eine Stelle für
// die Reihenfolge, damit der eingefrorene Rang dieselbe Rechnung nimmt wie
// der heutige [§C27].
function _rangTabelle(avgs){
  const ranked=players
    .filter(p=>ligaAktiv(p)&&avgs[p.id]!==null&&avgs[p.id]!==undefined)
    .sort((a,b)=>avgs[b.id]-avgs[a.id]);
  const result={};
  ranked.forEach((p,idx)=>{
    const pct=(idx+1)/ranked.length;
    const rank=RANKS.find(r=>pct<=r.pct)||RANKS[RANKS.length-1];
    result[p.id]={...rank,avg:avgs[p.id],perzentil:pct*100};
  });
  return result;
}
function getAllPlayerRanks(){
  const key='allRanks_'+matches.length+'_'+_cache.version;
  if(_cache._allRanksKey===key) return _cache._allRanksData;
  const result=_rangTabelle(getSeasonAvgElos());
  _cache._allRanksKey=key;
  _cache._allRanksData=result;
  return result;
}

// Wie weit vorn jemand in der Ewigen Tafel steht, in Prozent der aktiven
// Liga. Ein Ruheständler behält den Wert seines Karriereendes [§C40].
function rangPerzentil(id){
  const r=getPlayerRank(id);
  return r&&r.perzentil||0;
}

function getPlayerRank(id){
  // Ein Ruheständler trägt den Rang, mit dem er aufgehört hat [§C40] — die
  // Liga von heute vergleicht ihn nicht mehr.
  if(imRuhestand(id)) return ruhestandStand(id).rang||null;
  return getAllPlayerRanks()[id]||null;
}

// Das Rangabzeichen. Die Gestaltung steht in 02-ranking.css; hier bleibt nur
// die Farbe, weil sie vom Rang kommt und sonst als fünf Klassen im CSS
// stünde. Vorher trug das Abzeichen seine zehn Angaben im style-Attribut —
// wer die Höhe ändern wollte, musste sie im JavaScript suchen.
function rankBadgeHtml(id, size='sm'){
  const r=getPlayerRank(id); if(!r) return '';
  return `<span class="rangab${size==='lg'?' gross':''}" style="--rc:${r.color}"
    >${svgI(r.icon)}${esc(r.label)}</span>`;
}


// ── Eine Metrikleiste für alle vier Zeiträume [§C28] ─────────────────
// Vorher hatte jeder Reiter im Liga-Tab seine eigene Bedienung: die Saison
// gar keine, Woche und Tag zwei Knöpfe mit der Aufschrift „Nach Siegen" /
// „Nach Elo", die Ewige Tafel fünf mit anderer Aufschrift. Drei Sprachen
// für dieselbe Frage. Jetzt steht überall dieselbe Leiste, und der erste
// Eintrag ist die Leitgröße des Zeitraums: nach ihr wird der Erste
// bestimmt, und nur in ihr steht er als Kopfzeile über der Liste.
// Elo heißt dabei im Zeitraum der Zuwachs, in Saison und Gesamt der Stand —
// beides ist „die Elo dieses Zeitraums", nur einmal als Strecke und einmal
// als Punkt.
const METRIC_LABEL={elo:'Elo',wins:'Siege',winrate:'Siegquote',
  goaldiff:'Game-Bilanz',prestige:'Prestige',games:'Partien'};
// Fünf Reiter teilen sich 328 px: „Siegquote" stand dort als „Siegq…".
// Im Reiter reicht das Wort, das die Spalte meint; unter der Zahl steht
// weiter der volle Name.
const METRIC_REITER={winrate:'Quote'};
// Die LIGA-Rangliste ist die Elo-Rangliste — in Saison, Woche und Tag gibt
// es dort nichts zu sortieren. Wer nach Siegrate oder Tordiff schaut, sucht
// keine Rangliste, sondern eine Bestenliste, und die steht im Awards-Tab.
// Nur die EWIGE TAFEL blickt über Saisons hinweg; dort ist die Frage „wer
// hat die beste Quote über drei Saisons" tatsächlich eine andere Frage als
// „wer hat die höchste Karriere-Elo", und nur dort steht die Leiste.
// Ein Zeitraum mit genau einer Metrik zeigt gar keine Leiste — das fällt
// unten in metrikLeisteHtml von selbst heraus.
// Die Ewige Tafel sortierte einmal nach „Serie". Eine laufende Serie ist
// aber eine Aussage über DIESE WOCHE, und sie stand in einer Tabelle, die
// über alle Saisons blickt — drei Siege am Stück brachten dort einen
// Karrierespieler vor jemanden mit dreihundert Partien. Wer die Serien
// sehen will, findet sie im Awards-Tab, wo sie hingehören. An ihrer Stelle
// steht jetzt das Prestige [§C34]: die einzige Zahl, die über die ganze
// Laufbahn geht, und die, die das Zeichen an jedem Avatar erklärt.
const PERIOD_METRICS={
  season:['elo'],
  week:  ['elo'],
  day:   ['elo'],
  all:   ['elo','winrate','goaldiff','prestige','games']
};
// Welche Metrik gilt gerade? rankMetric wird auch vom Positionen-Tab
// benutzt (dort 'drive'/'reves'), und nicht jeder Zeitraum kennt jede Metrik.
// Statt das an jeder Lesestelle zu prüfen, fällt es hier einmal auf die
// Leitgröße zurück.
function metrikFuer(per){
  const liste = PERIOD_METRICS[per] || PERIOD_METRICS.all;
  return liste.includes(rankMetric) ? rankMetric : liste[0];
}
// Die Leiste selbst — ein Bauteil. Wo es nichts zu wählen gibt, steht auch
// keine Leiste: ein Umschalter mit einem Eintrag ist eine Behauptung, keine
// Bedienung.
function metrikLeisteHtml(per){
  const liste = PERIOD_METRICS[per] || PERIOD_METRICS.all;
  if(liste.length < 2) return '';
  const jetzt = metrikFuer(per);
  return `<div class="ui-tabs">${liste.map(k =>
    `<button data-metric="${k}" class="${jetzt===k?'on':''}">${METRIC_REITER[k]||METRIC_LABEL[k]}</button>`
  ).join('')}</div>`;
}

// ╔═══ §2.8 ─── ERWEITERTES ELO + AUTO-POSITION ────────────────────────╗
//     K-Faktor + Gewichtung + Score-Spread laut cfg.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Bestehende DB-Felder bleiben gleich. Neu: dynamischer K + Margin-of-Victory,
// rein clientseitig berechnet (kein Schema-Umbau nötig).
function expected(a,b){ return 1/(1+Math.pow(10,(b-a)/400)); }

// ─── Wo die Elo-Rechnung ihre Grenzen zieht ──────────────────────────
// Drei Linien, und jede stand als blanke Zahl an mehreren Stellen: Favorit ab
// 55 Prozent Siegchance, auf Augenhoehe von 45 bis 55, Aussenseiter-Sieg
// unter 35. Die 0,35 stand in der Auszeichnung „Upset King" und in BEIDEN
// Chronik-Durchlaeufen — drei Stellen, die dasselbe Ereignis zaehlen und
// deshalb gleich zaehlen muessen [§10.2]. Die Formel selbst stand zweimal da:
// `expected` hier und ein wortgleiches `localExp` in der Elo-Engine.
const CHANCE_FAVORIT = 0.55;
const CHANCE_OFFEN = 0.45;
const CHANCE_UPSET = 0.35;
// Und darunter die Sensation. Die Linie trennt zwei Kartensorten des Feeds,
// die sich sonst doppeln wuerden: unter 20 Prozent erzaehlt der Favoritensturz
// („Der Gigantentoeter"), von 20 bis 35 die Ergebniskarte. Beide Zahlen
// standen blank da, und damit war ihre Zusammengehoerigkeit nicht zu sehen.
const CHANCE_SENSATION = 0.20;
// Ob die Linie selbst noch dazugehoert, ist je Wertung kalibriert: „Der
// Favoritenschreck" verlangt „mindestens 65 Prozent fuer die Gegenseite" und
// zaehlt deshalb `<= CHANCE_UPSET`, der Aussenseiter-Sieg zaehlt `<`. Die
// Grenze ist dieselbe, die Randbedingung nicht — und sie wird nicht
// stillschweigend vereinheitlicht, weil die Schwellen daran geeicht sind.
// Das Wort zu einer Siegchance, an EINER Stelle: die Skala im Blatt einer
// Partie und der Bogen auf ihrer Karte sagen sonst zu 30 % zwei Dinge.
function chanceWort(c){
  return c < CHANCE_SENSATION ? 'Sensation' : c < CHANCE_UPSET ? 'Außenseiter'
       : c < CHANCE_FAVORIT ? 'Augenhöhe' : 'Favorit';
}
function riskWeights(hi,lo,rs){ const gap=Math.min(Math.abs(hi-lo)/400,1); const s=rs*gap; return {strong:1-s,weak:1+s}; }

// ─── §2.8a Das Seitenprofil [§C44] ─────────────────────────────────────
// Eine Zahl zwischen 0 und 1: wie sehr jemand Drive-Spieler ist (rechts).
// 0 heißt Revés (links). Sie fragt zwei Dinge und rechnet beide als Chance
// (log-odds), damit sie sich addieren:
//   1) Wo ist jemand besser?  POS_LEISTUNG mal der Abstand der Leistung je
//      Match, rechts gegen links, beide am eigenen Schnitt gemessen und mit
//      POS_SCHRUMPF Matches dorthin gezogen. Leistung heißt: Sieg und
//      Game-Anteil, beide gegen die Erwartung des Matches, je zur Hälfte.
//      Die Erwartung kommt aus der Elo aller vier, kennt also Gegner und
//      Partner.
//   2) Wo spielt jemand?  ln((Matches rechts + 1) / (Matches links + 1)),
//      voll gewogen, solange eine Seite kaum Matches hat, und mit Matches auf
//      beiden Seiten bis auf POS_MENGE_MIN herunter: dann sagt die Leistung,
//      wo jemand hingehört, und die Gewohnheit nur noch wenig.
// Das Ergebnis liegt zwischen 5 und 95 %: ganz am Rand trüge der
// Seitenbonus der Elo-Rechnung (`posFactor`) mehr, als eine Einstufung
// sicher sagen kann.
//
// Der Game-Anteil zählt mit, weil der Sieg allein bei wenigen Matches zu
// grob ist: ein 7:6 im einzigen Satz ist fast ein Unentschieden, ein 6:1
// nicht. Erwartet wird ein Vorsprung, so wie die Siegchance über 50 %
// liegt: bei 75 % Siegchance ein Viertel mehr Games.
//
// POS_SCHRUMPF ist kleiner als beim Tischkicker (dort 15): eine Padel-Liga
// spielt im Monat um die zwanzig Matches je Spieler, und mit 15 bliebe das
// Profil ein halbes Jahr lang beim eigenen Schnitt stehen.
const POS_SCHRUMPF = 8;
const POS_LEISTUNG = 10;
const POS_MENGE_MIN = .25;

// Der Game-Anteil eines Matches gegen seine Erwartung, aus Sicht eines
// Teams: Vorsprung durch alle Games, weniger der Vorsprung, den die
// Siegchance erwarten lässt. Eine Stelle für die Elo-Rechnung, den
// Rückfall in `posPerfFrom` und die Chronik [§C27].
function posGameLeistung(gf, ga, exp){
  return gf + ga ? (gf - ga) / (gf + ga) - (exp - .5) : 0;
}
// Die Zähler je Spieler, die beide Elo-Rechnungen Match für Match
// fortschreiben: Matches, Siege, Leistung (Sieg und Games gegen die
// Erwartung) und der Elo-Abstand zu Gegnern und Partner, den das Blatt
// der Einstufung zeigt. `a` ist rechts (Drive), `d` links (Revés).
// `vorher` ist der Elo-Stand vor dem Match; ohne ihn bleiben Gegner und
// Partner ungezählt.
function posZaehler(){
  return {aG:0,aW:0,dG:0,dW:0,aPerf:0,dPerf:0,aGm:0,dGm:0,aGeg:0,dGeg:0,aMit:0,dMit:0};
}
function posZaehlenPartie(zaehler, m, aWon, expA, vorher){
  const p = partie(m);
  [[m.a1,m.a1_side,m.a2,true],[m.a2,m.a2_side,m.a1,true],[m.b1,m.b1_side,m.b2,false],[m.b2,m.b2_side,m.b1,false]]
  .forEach(([id,pos,mate,onA])=>{
    const t=zaehler[id]; if(!t) return;
    const s=pos==='drive'?'a':'d', won=onA?aWon:!aWon, exp=onA?expA:1-expA;
    t[s+'G']++; if(won) t[s+'W']++;
    t[s+'Perf']+=(won?1:0)-exp;
    t[s+'Gm']+=posGameLeistung(onA?p.gamesA:p.gamesB, onA?p.gamesB:p.gamesA, exp);
    if(vorher && t[s+'Geg']!=null){
      const opp=onA?[m.b1,m.b2]:[m.a1,m.a2];
      t[s+'Geg']+=(vorher[opp[0]]+vorher[opp[1]])/2-vorher[id];
      t[s+'Mit']+=vorher[mate]-vorher[id];
    }
  });
}

function posPerfFrom(id, matchSubset){
  const schnitt = (t, s) => {
    const g = t[s + 'G'];
    return {[s + 'Wr']: g ? t[s + 'W'] / g : null, [s + 'PerfAvg']: g ? t[s + 'Perf'] / g : null,
      [s + 'GmAvg']: g ? t[s + 'Gm'] / g : null,
      [s + 'GegAvg']: g && t[s + 'Geg'] != null ? t[s + 'Geg'] / g : null,
      [s + 'MitAvg']: g && t[s + 'Mit'] != null ? t[s + 'Mit'] / g : null};
  };
  const aus = t => ({aG:t.aG, aW:t.aW, dG:t.dG, dW:t.dW, ...schnitt(t, 'a'), ...schnitt(t, 'd')});
  if (!matchSubset || matchSubset === matches) {
    const t = getGlobalSim().posTracker[id];
    if (t) return aus(t);
  }
  // Ohne die Elo-Rechnung fehlt der Stand vor jedem Match: Gegner und
  // Partner bleiben hier leer statt null Elo Abstand zu zeigen.
  const t = {...posZaehler(), aGeg:null, dGeg:null, aMit:null, dMit:null};
  for(const m of matchSubset) posZaehlenPartie({[id]:t}, m, m.winner==='A', m.exp_a!=null ? m.exp_a : 0.5);
  return aus(t);
}

// ─── Der Seitenwert [§5.2] ───────────────────────────────────────────
// Die eine Zahl, nach der die Seiten-Rangliste sortiert und die dort als
// „Wert" rechts steht. Sie wiegt vier Dinge gegeneinander:
//   Siegquote auf der Seite — die Hauptsache
//   Leistung gegen die Erwartung — kennt Partner- und Gegnerstärke
//   Game-Anteil auf der Seite — wie deutlich die Matches dort ausgehen
//   Erfahrung — wächst asymptotisch, ab etwa 15 Matches praktisch voll
//
// Sie steht hier und nicht in der Ansicht, weil zwei Stellen sie brauchen:
// die Seiten-Rangliste und der Liga-Rekord darauf [§13.1]. Die Rangliste
// wiegt die Erfahrung mit, der Rekord nicht: eine Mindestzahl entscheidet
// dort nur über die Teilnahme, sonst gehörte er dem Vielspieler [§C35].
// `posLeistung` ist der gemeinsame Kern, `posWert` derselbe Kern mal
// Erfahrung [§C27].
//   anteilAvg  Anteil der Games, die das eigene Team auf dieser Seite holt
function posLeistung(pos, g, w, anteilAvg, perfAvg){
  if(!g) return 0;
  const perfBonus = (perfAvg || 0) * 0.25;
  const anteilBonus = Math.max(0, Math.min(1, anteilAvg == null ? .5 : anteilAvg)) * 0.2;
  return w/g + perfBonus + anteilBonus;
}
function posWert(pos, g, w, anteilAvg, perfAvg){
  if(!g) return 0;
  return posLeistung(pos, g, w, anteilAvg, perfAvg) * (1 - Math.exp(-g/3));
}

// Die Lage eines Spielers auf beiden Seiten, aus jeder Form, in der die
// Zahlen anfallen: `posPerfFrom` (aG/dG und Mittelwerte), der Kontext der
// Chronik (drvG/revG und Summen) und der Zähler der Elo-Rechnung (aG/dG
// und Summen). Eine Rechnung für Profil, Elo, die stärkere Seite im Profil,
// „Der Seitenwechsler" und das Durchwechseln [§C27].
//   rA, rD    Leistung je Match rechts und links gegen den eigenen Schnitt
//   anteil    Anteil der Matches rechts
//   menge     wie stark die Gewohnheit noch zählt (1 bis POS_MENGE_MIN)
//   wert      das Profil
//   staerker  'drive', 'reves' oder 'beide' (bis drei Prozentpunkte Abstand,
//             und ohne Matches auf einer Seite)
// Fehlen die Games ganz, zählt der Sieg allein — so rechnen gebaute Fälle
// in den Tests, die nur die Siegleistung angeben.
function positionsLage(p){
  p = p || {};
  const aG = Number(p.aG != null ? p.aG : p.drvG) || 0;
  const dG = Number(p.dG != null ? p.dG : p.revG) || 0;
  const summe = (g, roh, avg) => roh != null ? (Number(roh) || 0) : avg != null ? (Number(avg) || 0) * g : null;
  const seite = (g, sieg, gm) => gm == null ? (sieg || 0) : ((sieg || 0) + gm) / 2;
  const aS = seite(aG, summe(aG, p.aPerf != null ? p.aPerf : p.drvPerf, p.aPerfAvg),
    summe(aG, p.aGm != null ? p.aGm : p.drvGm, p.aGmAvg));
  const dS = seite(dG, summe(dG, p.dPerf != null ? p.dPerf : p.revPerf, p.dPerfAvg),
    summe(dG, p.dGm != null ? p.dGm : p.revGm, p.dGmAvg));
  const n = aG + dG;
  if(!n) return {aG, dG, anteil:.5, rA:0, rD:0, menge:1, wert:.5, staerker:'beide'};
  const schnitt = (aS + dS) / n;
  const rA = (aS - aG * schnitt) / (aG + POS_SCHRUMPF);
  const rD = (dS - dG * schnitt) / (dG + POS_SCHRUMPF);
  const selten = Math.min(aG, dG);
  const menge = 1 - selten / (selten + POS_SCHRUMPF) * (1 - POS_MENGE_MIN);
  const lg = menge * Math.log((aG + 1) / (dG + 1)) + POS_LEISTUNG * (rA - rD);
  const staerker = (!aG || !dG || Math.abs(rA - rD) <= .03) ? 'beide' : rA > rD ? 'drive' : 'reves';
  return {aG, dG, anteil:aG / n, rA, rD, menge, staerker,
    wert:Math.min(.95, Math.max(.05, 1 / (1 + Math.exp(-lg))))};
}
function positionsProfilWert(p){ return positionsLage(p).wert; }

// Der Seitenbonus der Elo-Rechnung [§3.6]. Auf der Seite, auf der das
// Profil schwächer ist, bringt ein Sieg mehr, und eine Niederlage kostet
// um genauso viel weniger: bis POS_GRENZE. Auf der stärkeren Seite gibt es
// beim Sieg einen Dämpfer und bei der Niederlage einen Abzug dazu, halb so
// viel: bis POS_DAEMPFER. Wie viel davon gilt, sagt allein die Klarheit der
// Einstufung — 0 bei 50 %, voll bei 5 oder 95 % —, mal zwei mal Swing.
// Wer also auf seiner ungewohnten Seite aushilft und gewinnt, wird dafür
// belohnt; der reine Spezialist steht auf Dauer etwas tiefer, aber nicht
// weit, weil sich die Elo nachgleicht.
const POS_GRENZE = 0.10;
const POS_DAEMPFER = 0.05;
function posFactor(lage, pos, sw){
  const a = lage.wert;
  const klar = Math.min(1, Math.abs(a - .5) / .45);
  const anteil = Math.min(1, 2 * (sw || 0) * klar);
  if(!anteil) return 1;
  const schwach = a < .5 ? 'drive' : 'reves';
  return pos === schwach ? 1 + POS_GRENZE * anteil : 1 - POS_DAEMPFER * anteil;
}
// Drive-Anteil 0..1 nach dem Seitenprofil.
function driveStrengthFrom(id, matchSubset){
  return positionsProfilWert(posPerfFrom(id,matchSubset));
}
// Live-Stärke aus allen aktuellen Matches (für Anzeige & Vorschau)
function driveStrength(id){ return driveStrengthFrom(id, matches); }

// ╔═══ §2.9 ─── SEITEN-KLASSIFIZIERUNG (7 Stufen) ──────────────────────╗
//     Reine Drive-Spieler (rechts) bis reine Revés-Spieler (links), dazwischen
//     fünf Mischformen.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Wandelt das Seitenprofil (0,05 bis 0,95) in ein Label + Icon um.
// Feingranular: 60/40-Splits sollen NICHT als reines „Beidseitig" durchrutschen.
function posClassify(autoDrive){
  const a = autoDrive;
  if(a >= 0.78) return {label:'Reiner Drive',   icon:'posReinDrive',  tone:'drive'};
  if(a >= 0.60) return {label:'Drive',          icon:'posDrive',      tone:'drive'};
  if(a >= 0.54) return {label:'Drive-Flex',     icon:'posDriveFlex',  tone:'drive'};
  if(a >  0.46) return {label:'Beidseitig',     icon:'posFlex',       tone:'flex'};
  if(a >  0.40) return {label:'Revés-Flex',     icon:'posRevesFlex', tone:'reves'};
  if(a >  0.22) return {label:'Revés',          icon:'posReves',     tone:'reves'};
  return                {label:'Reiner Revés',   icon:'posReinReves', tone:'reves'};
}
// Die Seite in Worten, an einer Stelle [§C27]: kurz für Chips, lang für Sätze.
const SEITE_LANG = {drive:'Drive (rechts)', reves:'Revés (links)'};
const SEITE_NAME = {drive:'Drive', reves:'Revés'};

// Margin-of-Victory: ein deutliches Ergebnis zählt mehr, ein knappes
// weniger. Gemessen am Anteil der Games, den der Sieger holt (0,5 = gleich,
// 1 = alles), und an der Game-Differenz, logarithmisch gedämpft: ein 6:0 im
// einzigen Satz bringt rund drei Viertel des Aufschlags, ein 6:0 6:0 den
// vollen. Beim Tischkicker war das auf ein 10:0 geeicht.
// Die Deutlichkeit eines Satzes: der Anteil der Games des Siegers und der
// Abstand, ein 6:0 trägt den vollen Aufschlag. Gerechnet wird je Satz
// (`partieTeile`); über eine ganze Partie stand hier ln 13 als Maß, und ein
// einzelner Satz 6:0 kam damit nur auf drei Viertel. Ein Match-Tiebreak
// liest seine Punkte: als ein Game 1:0 hätte jedes 10:8 als Zu-Null-Satz
// gegolten.
function movMult(m){
  const maxBoost = cfg.mov_max_boost ?? 0.4;
  const saetze = partieSaetze(m || {});
  if(saetze.length === 1 && saetze[0].art === 'mtb'){
    const {a, b} = saetze[0], n = a + b;
    if(!n) return 1;
    const anteil = Math.max(0, Math.min(1, (Math.max(a, b) / n - .5) * 2));
    return 1 + maxBoost * anteil * Math.min(1, Math.log(Math.abs(a - b) + 1) / Math.log(11));
  }
  const p = m && m.sets !== undefined ? partie(m) : saetzeAuswerten(saetze);
  const anteil = Math.max(0, Math.min(1, (p.gameAnteil - .5) * 2));
  return 1 + maxBoost * anteil * Math.min(1, Math.log(p.gameDiff + 1) / Math.log(7));
}

// computeMatch nutzt DIESELBE Engine wie der Recalc, damit die beim
// Speichern erzeugten Deltas exakt dem entsprechen, was nach einer späteren
// Neuberechnung in der Datenbank steht. Gerechnet wird ein hypothetisches
// Match auf dem Endstand des gecachten globalen Sims.
//   felder  das Ergebnis aus `partieFelder` (sets, set_kind, games, winner)
function computeMatch(teamA, teamB, felder){
  const HYPO_ID = '__hypo__';
  const hypo = {
    id: HYPO_ID,
    a1: teamA[0].id, a1_side: teamA[0].pos,
    a2: teamA[1].id, a2_side: teamA[1].pos,
    b1: teamB[0].id, b1_side: teamB[0].pos,
    b2: teamB[1].id, b2_side: teamB[1].pos,
    ...felder,
    created_at: new Date().toISOString()
  };
  const globalSim = getGlobalSim();
  const sim = simulateEloWithSliders([hypo], {
    initialState: globalSim,
    initialCurSeason: globalSim.curSeason
  });
  const entry = sim.history.find(h => h.matchId === HYPO_ID);
  const res = entry ? {...entry.deltas} : {};
  const expA = entry ? entry.expA : 0.5;
  // Die Elo je Satz, für die Vorschau beim Eintragen: die Summe allein
  // sagte nicht, dass ein gewonnener Satz auch in der Niederlage zählt.
  const saetze = {};
  Object.keys(res).forEach(id => {
    const bd = entry && entry.breakdowns && entry.breakdowns[id];
    saetze[id] = bd && bd.saetze ? bd.saetze.map(b => b.delta) : [res[id]];
  });
  return {res, expA, saetze};
}

// ─── Schreiben, was sich geändert hat ───────────────────────────────
// Eine neue Partie schrieb die Positionsstärke ALLER Spieler, auch derer,
// die nicht mitgespielt hatten, und eine gelöschte oder bearbeitete die
// Deltas ALLER Partien der Liga — gemessen 498 Anfragen in zwanzig Runden
// hintereinander, um am Ende fast überall denselben Wert zu schreiben. Für
// die Ansicht gebraucht wird davon nichts: die App rechnet aus den Partien
// [§3.1c]. Geschrieben wird deshalb nur, was sich wirklich geändert hat.
// Verglichen wird mit Spielraum: eine Zahl, die einmal durch die Datenbank
// gegangen ist, kann in der letzten Stelle abweichen, und dann schriebe
// jeder Durchlauf alles noch einmal.
function _zahlAnders(a, b){ return !(Math.abs((+a || 0) - (+b || 0)) < 1e-6); }
function _deltaAnders(m, patch){
  if(!m) return true;
  if(_zahlAnders(m.exp_a, patch.exp_a)) return true;
  const a = m.deltas || {}, b = patch.deltas || {};
  const k = new Set([...Object.keys(a), ...Object.keys(b)]);
  for(const id of k) if(_zahlAnders(a[id], b[id])) return true;
  return false;
}
// Positionsstärke und Saison-Elo der Spieler: in der Datenbank nur ein
// Abbild der Partien (die Rangliste liest sie nicht), deshalb nur, wo sie
// abweichen, und danach lokal nachgezogen — sonst schriebe der nächste
// Durchlauf dieselben Werte noch einmal.
async function _spielerSchreiben(){
  const map = getSeasonEloMap(), schreiben = [];
  players.forEach(p => {
    const drive = driveStrengthFrom(p.id, matches);
    const elo = Math.round(map[p.id] ?? cfg.start_elo);
    const o = {};
    if(_zahlAnders(drive, p.drive)) o.drive = drive;
    if(elo !== Math.round(p.elo)) o.elo = elo;
    if(!Object.keys(o).length) return;
    schreiben.push(sb.from('players').update(o).eq('id', p.id).then(r => {
      if(r && r.error) throw r.error;
      Object.assign(p, o);
    }));
  });
  await Promise.all(schreiben);
}

async function persistNewMatch(newMatchId) {
  // Ein neues Match am Ende ändert nie vorherige Match-Deltas. Seine eigenen
  // stehen schon in der Zeile (`computeMatch`); neu geschrieben werden sie
  // nur, wenn die Rechnung mit dem Zeitpunkt der Datenbank anders ausgeht.
  const sim = getGlobalSim();
  const entry = sim.history.find(h => h.matchId === newMatchId);
  const m = matches.find(x => x.id === newMatchId);
  const patch = entry && {id:newMatchId, deltas:entry.deltas, exp_a:entry.expA};
  const schreiben = [_spielerSchreiben()];
  if(patch && _deltaAnders(m, patch)){
    schreiben.push(sb.from('matches').update({deltas:patch.deltas, exp_a:patch.exp_a}).eq('id', newMatchId)
      .then(r => { if(r && r.error) throw r.error; if(m){ m.deltas = patch.deltas; m.exp_a = patch.exp_a; } }));
  }
  await Promise.all(schreiben);
}

// Die Liga aus einer Partienliste neu rechnen, nur auf dem Gerät: die
// Liste wird zu `matches`, jede Partie trägt ihre neuen Deltas. Zurück
// kommt, was die Datenbank danach braucht — die Partien, deren Deltas sich
// geändert haben. Verglichen wird VOR dem Einsetzen, sonst wäre nichts mehr
// anders.
function ligaNeuRechnen(matchList){
  const {matchPatches} = recalcHistory(matchList);
  const vorher = new Map(matchList.map(m => [m.id, m]));
  const geaendert = matchPatches.filter(p => _deltaAnders(vorher.get(p.id), p));
  const neu = new Map(geaendert.map(p => [p.id, p]));
  // Ohne Änderung bleiben die Töpfe: das Nachholen rechnet meist nach und
  // findet nichts, und danach rechnete jeder Reiter kalt.
  const anders = geaendert.length || matchList !== matches;
  matches = matchList.map(m => {
    const p = neu.get(m.id);
    return p ? {...m, deltas:p.deltas, exp_a:p.exp_a} : m;
  });
  if(anders) invalidateCache();
  return {geaendert};
}

// Schreibt eine neu gerechnete Liga in die Datenbank: die geänderten
// Deltas, Positionsstärke und Saison-Elo, und die Archive der vergangenen
// Monate, in denen sich etwas geändert hat. Vorher wurde JEDER vergangene
// Monat geleert und neu archiviert, auch wenn nur die letzte Partie von heute
// gelöscht war — und mit ihm seine eingefrorene Chronik. `monate` nennt
// zusätzlich Monate, die sich ohne geänderte Delta geändert haben: die
// gelöschte Partie selbst taucht in keiner Rechnung mehr auf.
// Updates laufen in Batches parallel, um Rate-Limits zu respektieren (Supabase ~100 req/s).
async function rechnungSchreiben(r, monate){
  const BATCH = 25;
  const deltas = r.geaendert.map(p => () => sb.from('matches').update({deltas:p.deltas, exp_a:p.exp_a}).eq('id', p.id)
    .then(x => { if(x && x.error) throw x.error; }));
  for(let i = 0; i < deltas.length; i += BATCH) await Promise.all(deltas.slice(i, i + BATCH).map(f => f()));
  await _spielerSchreiben();
  // Archivierte Saison-Snapshots invalidieren → autoArchiveSeasons schreibt
  // sie neu. `titles` muss mit: die eingefrorene Chronik steht auf der alten
  // Elo-Kurve, und „+148 Elo gegenueber der Vorsaison" waere eine Behauptung
  // ueber Zahlen, die es nicht mehr gibt.
  const vergangen = new Set(allPastSeasons());
  const betroffen = new Set(monate || []);
  const zeit = new Map(matches.map(m => [m.id, m.created_at]));
  r.geaendert.forEach(p => { const t = zeit.get(p.id); if(t) betroffen.add(seasonOf(t).id); });
  const leeren = [...betroffen].filter(sid => vergangen.has(sid));
  if(!leeren.length) return;
  await Promise.all(leeren.map(sid => sb.from('seasons').update({top_elo: JSON.stringify([]), titles: null}).eq('id', sid)));
  // Lokal: top_elo leeren, damit autoArchiveSeasons sie als stale erkennt
  seasons.forEach(s => { if(leeren.includes(s.id)){ s.top_elo = JSON.stringify([]); s.titles = null; } });
  await autoArchiveSeasons();
}
// Rechnen und Schreiben in einem, für den Knopf „Neu berechnen" und das
// Nachholen nach einem abgebrochenen Schreiben [§3.1c].
async function persistRecalc(matchList, monate){
  const r = ligaNeuRechnen(matchList);
  await rechnungSchreiben(r, monate);
  return r;
}
