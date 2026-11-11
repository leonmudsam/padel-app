// ╔═══ §13 ─── DISZIPLINEN: MONATSTAFEL & LIGA-REKORDE ─────────────────╗
//     Eine Liga misst dieselben Dinge auf zwei Zeitachsen: Wer war diesen
//     Monat der Beste darin — und wer war es je. Früher waren das zwei
//     Kataloge, und achtzehnmal stand derselbe Gedanke in beiden: „Der
//     Vollstrecker" maß den Anteil 10:0-Siege für einen Monat, „Der Henker"
//     denselben Anteil für die Laufbahn. Zwei Namen, zwei Icons, im Profil
//     zwei Zeilen mit derselben Aussage.
//
//     Es gibt deshalb nur noch EINEN Katalog: DISZIPLINEN [§13.1]. Jede
//     Disziplin hat höchstens eine `monat`- und höchstens eine `allzeit`-
//     Wertung, und beide messen dieselbe Größe.
//
//     Architektur:
//       DISZIPLINEN[]        — der eine Katalog [§13.1]
//       SEASON_TITLES[]      — daraus abgeleitet, die Monatswertungen [§13.1]
//       CHRONICLES[]         — daraus abgeleitet, die Allzeitwertungen [§13.4b]
//       _seasonTitleCtx(sid) — EIN Durchlauf über die Saison-Matches [§13.2]
//       seasonTitles(sid)    — Vergabe, memoisiert [§13.3]
//       _freezeSeasonTitles  — abgeschlossene Saison in seasons.titles [§13.3a]
//       seasonTitleHistory(pid) — Titel-Historie eines Spielers [§13.4]
//       _chronicleCtx()      — EIN Durchlauf über ALLE Matches [§13.4b]
//       allChronicles()      — Vergabe für die ganze Liga [§13.4b]
//       UI: showSeasonTable / showLigaChronik / showChronicle [§13.5]
//       Marken neben dem Namen [§13.6], Avatar-Status-Ring [§13.7]
//
//     KEINE zweite Rechenquelle: Elo kommt aus getGlobalSim (seasonEndElos
//     für abgeschlossene, elo für die laufende Saison), Matches aus
//     matchesInSeason(). Damit kann die Tafel nicht von der Rangliste
//     abweichen.
//
//     GERECHNET WIRD NUR DIE LAUFENDE SAISON. Sobald ein Monat archiviert
//     ist, steht seine Tafel in seasons.titles und wird von dort gelesen
//     [§13.3a] — vollständig, mit Name, Icon, Ton und Beleg. Eine Disziplin
//     zu streichen verändert deshalb nur die Zukunft; alte Monate zeigen
//     weiter, was damals galt, auch wenn es den Eintrag heute nicht mehr gibt.
//
//     ⚑ HOTSPOT — neue Disziplinen brauchen (vollständig: docs/erweitern.md §10.2):
//       - Eintrag in DISZIPLINEN [§13.1] an der richtigen Stelle im Block
//       - ein neues Feld in BEIDEN Kontext-Pässen, [§13.2] für `monat` und
//         [§13.4b] für `allzeit`. Nur einer davon ist der häufigste Fehler:
//         die Monatstafel zeigt den Eintrag, der Liga-Rekord bleibt leer
//       - `art` setzen — sie steuert den Prestige-Wert [§13.8], und ein
//         neuer Eintrag verschiebt die Insignium-Leiter mit
//
//     LEISTUNG VOR EREIGNIS VOR SCHATTEN — die Reihenfolge im Katalog:
//       Vorn steht, was eine QUOTE misst und eine niedrige Einstiegshürde
//       hat: Wer nur an zwei Abenden im Monat spielt, soll dieselbe Chance
//       haben wie der Vielspieler. Dahinter kommt, was einmalig passiert
//       ist, ganz hinten die Schattenseiten. Weil jeder Spieler nur EINEN
//       Monatseintrag trägt und `byPid` den ersten Treffer als seinen
//       wertvollsten zeigt, entscheidet diese Reihenfolge, was jemand vorn
//       im Profil sieht.
//
//     KEIN PENSUM MEHR: Einträge, die nur die Spielzahl maßen — Rekord-
//     sieger, Torfabrik, Dauerbrenner, Marathonmann, Unermüdlicher,
//     Allgegenwärtiger, Immerdabei, Malocher, Gründervater, Veteran,
//     längster Tag, Nachtschwärmer, Frühaufsteher — sind gestrichen. Wer
//     oft spielt, sammelt dadurch schon mehr Gelegenheiten; er musste dafür
//     nicht zusätzlich ausgezeichnet werden. Wie viel jemand dabei war, fragt
//     nur der eigene ANTEIL an den Partien eines Monats gegen den eigenen
//     Anteil davor („Der Aufdreher", „Der Rückzug"): den hält nicht, wer am
//     meisten spielt, sondern wer deutlich mehr oder weniger spielt als sonst.
//
//     KEINE VERBINDUNGEN: Es gibt keine Einträge, die ein DUO beschreiben.
//     Wer sie hielt, hatte sie halb dem anderen zu verdanken, und dieselbe
//     Zeile stand am Ende bei zwei Leuten im Profil. Was ein Partner
//     auslöst, wird nur als EIGENE Leistung gemessen — „Der Katalysator"
//     zählt, wie viel besser die anderen neben ihm sind, und nennt dabei
//     keinen Namen.
//
//     JEDER EINTRAG IST EIN BESTWERT [§C32]. Er geht an den, der ihn in
//     diesem Monat wirklich hält — oder an niemanden. Früher durften die
//     meisten Einträge weiterrutschen, wenn der Beste schon etwas trug;
//     dann stand „Der Unaufhaltsame" bei zwölf Siegen in Folge, während
//     einer mit dreizehn danebensaß. Deshalb darf eine Bedingung jetzt
//     auch einen Superlativ nennen. Die Schwellen in den Bedingungen
//     („ab 10 Spielen") bleiben, aber als Zulassung, nicht als Vergabe:
//     sie sagen, wer überhaupt mitzählt.
//
//     DER MEISTER ist KEINE Disziplin. Er ging per Definition an Platz 1
//     der Saison-Elo und sagte damit nichts, was die Rangliste nicht schon
//     zeigt. Er kommt direkt aus seasonChampion() und steht als Krone neben
//     dem Namen. Die Tafel ist für das da, was man an der Tabelle NICHT
//     ablesen kann.
// ╚═════════════════════════════════════════════════════════════════════════╝

// Farbwelt der Titel — greift die Rarity-Töne der Badges auf, damit sich
// Tafel, Profil und Rangliste gleich anfühlen.
const TITLE_TONES = {
  gold:   {c:'var(--gold)',   rgb:'247,207,74'},
  silver: {c:'#c3ced9',       rgb:'154,167,181'},
  acid:   {c:'var(--acid)',   rgb:'228,242,74'},
  blue:   {c:'var(--blue)',   rgb:'86,180,232'},
  orange: {c:'var(--orange)', rgb:'255,120,73'},
  purple: {c:'var(--purple)', rgb:'167,139,250'},
  red:    {c:'var(--red)',    rgb:'240,86,106'},
};
// Wie Klasse und Art einer Monatschronik heißen, wenn sie jemand liest.
// Sie stehen an einer Stelle, weil sie in vier Ansichten auftauchen: auf der
// Plakette, im Chronik-Blatt, in der Laufbahn und in der Nachricht. Vorher
// stand in der Laufbahn „Leistung" — die Art der DISZIPLIN, nicht die der
// Chronik, und den Wert trägt seit §C39 die der Chronik.
const CHRONIK_KLASSE_NAME = {legendaer:'legendär', selten:'selten', besonders:'besonders', schatten:'Schattenseite'};
// Die Klasse sagt, was eine Chronik als Leistung bedeutet, nicht nur, wie
// weit ihre Schwelle hinausliegt [§C39]; über das Prestige entscheidet sie
// nicht. Sie folgte dem Ausschlag, und damit waren
// „Die Lieblingszahl", „Der Torhagel" und „Der Ausbruch" legendär, „Der
// Souverän" aber besonders: eine Fügung, die selten vorkommt, stand über dem
// Monat, den jemand mit hundert Elo Vorsprung gewann.
//   legendär   ein ganzer Monat als außergewöhnliche Leistung: über alle
//              Partien, jeden Spieltag, jede Woche, jeden Gegner oder die
//              Tabelle — nie eine Fügung, nie eine Wende.
//   selten     eine klare Leistung über den ganzen Monat, gegen die Rechnung
//              in einem Zug (Tag, Woche, Serie, der Rivale), gegen die
//              Stärksten, eine einzigartige Fügung — und jede Wende
//              (`wende:true`): sie zeigt erst eine Schwäche, ein verlorenes
//              Duell nach dem anderen, einen schwachen Vormonat, und dann,
//              dass sie gebrochen wurde. Das ist mehr als ein Muster und
//              weniger als ein Monat ohne Schwäche.
//   besonders  ein Muster in einem Ausschnitt der eigenen Partien und die
//              Fügungen.
//   schatten   eine Schattenseite ist keine Leistung und bringt nichts,
//              also hat sie keine dieser Klassen; im Blatt steht dort
//              „Schattenseite".
const CHRONIK_ART_NAME = {koennen:'Können', konstanz:'Konstanz',
                          fuegung:'Fügung', schatten:'Schattenseite'};

// ─── Der Grundwert eines Liga-Rekords im Prestige [§C34] ─────────────
// Eine Stelle für alle Rekorde. Wer misst, was jemand kann — Können,
// Bestmarke, Form —, beginnt bei 100; wer festhält, wo jemand steht oder was
// Auslosung und letzter Ball entschieden (Rollenwert, Fügung), bei 75; eine
// Schattenseite bringt nichts. Die Zahl stand an jedem der 63 Einträge
// einzeln, und mit 150 wog ein Können-Rekord so viel wie ein Meistertitel:
// wer zehn Bestwerte hielt, stand auf der Leiter vor dem, der die Liga
// gewann.
const REKORD_GRUNDWERT = {koennen:100, fuegung:75, schatten:0};

function titleTone(tone){ return TITLE_TONES[tone] || TITLE_TONES.acid; }

// ─── Die Farbe eines Monatseintrags ist seine Klasse [§C25, §C39] ────
// Gold legendär, Lila selten, Metall besonders, Rot eine Schattenseite —
// dieselben Farben wie bei den Auszeichnungen. Vorher trug eine Zelle den
// Ton ihrer Disziplin (Gold für Können, Lila für Fügung) und die Klasse
// nur als Stärke derselben Farbe: eine besondere Können-Chronik stand golden
// neben einer legendären Fügung in Lila, und welche mehr wert war, sah man
// nicht. Die Stufe einer Schattenseite ist „schatten", egal wie selten sie ist.
const CHRONIK_STUFE_TON = {legendaer:'gold', selten:'purple', besonders:'silver', schatten:'red'};
function chronikStufe(titleId){
  const d = DISZIPLINEN.find(x => x.id === titleId);
  const m = d && d.monat;
  if(!m) return '';
  return m.art === 'schatten' ? 'schatten' : (CHRONIK_KLASSE_NAME[m.klasse] ? m.klasse : '');
}
// Ein Eintrag, den der Katalog nicht mehr kennt, behält den Ton, mit dem er
// eingefroren wurde [§13.3a].
function chronikTon(a){
  const st = chronikStufe(a && a.titleId);
  return titleTone(CHRONIK_STUFE_TON[st] || (a && a.tone));
}

// Mindest-Spiele, damit ein Spieler in einer Saison überhaupt gewertet wird.
// Wer drei Spiele mitgenommen hat, soll keinen Saisontitel gewinnen können.
const TITLE_MIN_GAMES = 8;

// ─── §13.1 Der Disziplinen-Katalog ───────────────────────────────────
// EIN Eintrag, ZWEI Wertungen. Vorher standen dieselben Gedanken zweimal
// im System: „Der Vollstrecker" maß den Anteil 10:0-Siege für einen Monat,
// „Der Henker" denselben Anteil für die Laufbahn. Achtzehnmal dasselbe
// Muster, zwei Namen, zwei Icons, zwei Schwellen — und im Profil zwei
// Zeilen, die dasselbe sagten.
//
// Eine Disziplin hat deshalb höchstens eine `monat`- und höchstens eine
// `allzeit`-Wertung. Beide messen DIESELBE Größe, nur auf verschiedenen
// Zeitachsen, und sie teilen sich Name, Icon und Ton. Wer eine Doppelung
// bauen will, muss dafür jetzt einen zweiten Eintrag anlegen — und sieht
// dabei, dass er es tut.
//
//   monat   → Saison-Tafel. pick(C, taken) liefert {pid, ev} oder null.
//             Ein Eintrag pro Spieler, Reihenfolge = Vergabe-Reihenfolge.
//   allzeit → Liga-Rekord. val(p, C) oder raw(p, C)+min liefert die Zahl,
//             den Bestwert halten alle, die ihn erreichen.
//
// `art` steuert, was ein Eintrag für das Prestige wert ist [§13.8]:
//   leistung — eine Quote, ein Können. Zählt doppelt.
//   ereignis — etwas ist passiert, oft einmalig. Zählt einfach.
//   schatten — die Kehrseite. Zählt nicht, verschwindet aber auch nicht.
// Es gibt keine `pensum`-Art mehr: Einträge, die nur die Spielzahl maßen
// (Rekordsieger, Torfabrik, Dauerbrenner, Marathonmann, Unermüdlicher,
// Allgegenwärtiger, Immerdabei, Malocher, Gründervater, Veteran, längster
// Tag, Nachtschwärmer, Frühaufsteher …) sind ersatzlos gestrichen. Wer
// oft spielt, sammelt dadurch schon mehr Gelegenheiten; er musste dafür
// nicht zusätzlich ausgezeichnet werden.
//
// REIHENFOLGE gilt für BEIDE Wertungen: Leistung vor Ereignis vor
// Schatten, innerhalb der Blöcke selten vor häufig. Sie entscheidet in
// der Monatstafel, wer zuerst zugreift, und im Profil, welche Zeile oben
// steht.
//
// Sie entscheidet NICHT mehr, wer zuerst zugreift: das tut der Vorsprung
// [§C32]. Wer mehrere Bestwerte hält, trägt den, bei dem er am
// deutlichsten vorn liegt.
//
// Eine Monatschronik hält, wer im Monat mindestens sechs eigene Partien
// hat — positive wie Schattenseiten [§C39]. Gezählt wird je Spieler, vom
// ersten Spieltag an. Die Zahl ist auf das Padel-Volumen gesetzt: rund fünf
// Spieltage im Monat mit drei bis fünf Partien, je Spieler meist fünf bis
// zwanzig. Beim Tischkicker galten fünfzehn, und eine Padel-Liga hätte damit
// in manchen Monaten keinen einzigen Halter. Unter sechs Partien streut
// jeder Anteil so weit, dass die Chronik dem Zufall gehörte.
// Eine Bedingung nennt keine Untergrenze für den Monat, die darunter liegt;
// was dort steht, meint den Vormonat, die Laufbahn davor oder einen Teil
// des Monats.
const CHRONIK_MIN_SPIELE = 6;

// ─── Bausteine der Monatschroniken ───────────────────────────────────
// Eine Teilmenge zählt ab drei Partien (beim Tischkicker fünf). Darunter
// sagt eine Quote nichts, darüber hinge die Chronik bei sechs Partien im
// Monat an der Spielzahl statt an der Leistung [§C39].
const ST_TEIL = 3;

const pct = v => Math.round(v * 100);
// Was „eine Pause" heisst: sechs volle Tage ohne eigenes Match. Bei drei
// Tagen war fast jede Woche eine Rueckkehr, und gefragt ist die nach einer
// echten Pause. Die Zahl steht EINMAL: Bedingung, Erklaerung und Rechnung
// lesen sie, sonst nennen zwei Stellen irgendwann zwei Schwellen [§C27].
const REKORD_PAUSE_STUNDEN = 144;
// Ein Abstand in Prozentpunkten mit Vorzeichen; was auf null rundet, steht
// ohne eins da.
const _ppZeichen = v => { const d = Math.round(v * 100); return d > 0 ? '+' + d : d < 0 ? '−' + (-d) : '0'; };
// Die Richtung steht im Wort, die Zahl ohne Vorzeichen: „−12 %-Punkte über
// der Rechnung" und „-0,2 Tore mehr rechts" lasen sich als Widerspruch.
const _ppLage = (v, plus, minus) => { const d = Math.round(v * 100); return `${Math.abs(d)} %-Punkte ${d < 0 ? minus : plus}`; };
// Eine Elo unter null trägt das Minuszeichen und keinen Bindestrich:
// „-2 statt 178 Elo" stand im Beleg des Gegenwinds.
const _stElo = v => { const d = Math.round(v); return (d < 0 ? '−' : '') + Math.abs(d); };
// Plätze mit Richtung und Einzahl: unter „Am nächsten dran" stand „von
// Platz 1 auf Platz 2 · -1 Plätze" und „von Platz 3 auf Platz 2 · 1 Plätze".
const _stPlaetze = (v, plus, minus) => { const n = Math.abs(Math.round(v));
  return `${n} ${n === 1 ? 'Platz' : 'Plätze'}${n ? ' ' + (v < 0 ? minus : plus) : ''}`; };
// Die Vergleichsquote eines Belegs, aus der eigenen Quote und dem Abstand:
// so ergibt die Rechnung auf dem Bildschirm genau den Abstand davor. Einzeln
// gerundet stand „+13 %-Punkte · 67 statt 55 %", und wer nachrechnete, kam
// auf 12. Der Abstand selbst bleibt der gerundete Wert des Rekords, denn er
// ordnet die Liste — aus den gerundeten Quoten gerechnet, stünde dort
// irgendwann 12 über 13. `v` zählt in Richtung der eigenen Quote: bei einem
// Rückstand ist er negativ.
const _ppGegen = (a, v) => pct(a) - Math.round(v * 100);
const _stMittel = a => a.reduce((x, y) => x + y, 0) / a.length;
// Die Stichprobe eines Vergleichs zweier Teilmengen: ihr Zufall ist die
// Summe beider, 1/a + 1/b, und gleich groß wie der einer einzigen Menge
// dieser Größe [§C39].
const _stH = (a, b) => a > 0 && b > 0 ? a * b / (a + b) : 0;
// Knapp nach §1.3: Tiebreak, ein Satz für jeden oder höchstens zwei Games
// Unterschied. Der Eintrag der Rohsicht trägt es schon (33-chronik-engine).
const _stEng = s => !!s.knapp;

// Favorit und Augenhoehe aus der Sicht einer einzelnen Partie. Die Grenzen
// stehen bei der Elo-Rechnung, die sie zieht [§5.2]; hier standen sie als
// blanke Zahl an fuenf Stellen, zwei davon in den zwei getrennten
// Durchlaeufen ueber dieselbe Frage — und die muessen gleich zaehlen, sonst
// zeigt die Monatstafel einen anderen Halter als der Liga-Rekord [§10.2].
const _stFavorit = s => s.exp > CHANCE_FAVORIT;
const _stAugenhoehe = s => s.exp >= CHANCE_OFFEN && s.exp <= CHANCE_FAVORIT;

// Poisson-Binomial: die Wahrscheinlichkeit, aus Partien mit ungleichen
// Siegchancen mindestens k zu gewinnen. Damit laesst sich sagen, wie
// wahrscheinlich ein ganzer Monat so oder besser ausgeht — die Grundlage
// des „Unmoeglichen Monats" und des „Ausreissers".
function _stPBinom(ps, k){
  let d = [1];
  ps.forEach(p => {
    const n = new Array(d.length + 1).fill(0);
    for(let i = 0; i < d.length; i++){ n[i] += d[i] * (1 - p); n[i + 1] += d[i] * p; }
    d = n;
  });
  let s = 0;
  for(let i = k; i < d.length; i++) s += d[i];
  return s;
}

// Die Kalenderwochen eines Spielers, ab fuenf Partien je Woche. Eine Woche
// ist lang genug, dass ein einzelner schlechter Tag sie nicht kippt, und
// kurz genug, dass eine Schwaechephase auffaellt.
const _stWochen = p => Object.values(p.wochGrp).filter(a => a.length >= ST_TEIL);

// Die Partien, die auf eine Niederlage folgen — die Gelegenheiten zu
// antworten, nicht die Antworten selbst.
const _stNachPleite = p => p.partien.filter((s, i) => i > 0 && !p.partien[i-1].win);

// Die beiden Haelften eines Monats, geteilt an der Mitte der eigenen
// Spieltage. „Die Steigerung" vergleicht sie miteinander.
// Die Streuung einer Reihe von Zahlen. „Der Gleichmut" fragt nicht nach der
// Hoehe der Game-Differenz, sondern danach, wie weit sie um ihr eigenes Mittel
// schwankt — dafuer reicht kein Mittelwert.
const _stStreu = a => {
  const m = _stMittel(a);
  return Math.sqrt(_stMittel(a.map(x => (x - m) * (x - m))));
};
// Die Siegquote einer Teilmenge von Partien, 0 für die leere Menge.
const _stQuote = a => a.length ? _stSiege(a) / a.length : 0;
// Die Siege einer Teilmenge, und ihr Anteil OHNE Schutz vor der leeren Menge:
// `_stQuoteRoh([])` ist NaN. Das ist ein anderes Ergebnis als `_stQuote` (0),
// sobald eine Schwelle, ein Math.min oder ein Vergleich darauf folgt — deshalb
// zwei Namen. Beide Formen standen zusammen über fünfzigmal ausgeschrieben.
function _stSiege(a){ return a.filter(s => s.win).length; }
function _stQuoteRoh(a){ return _stSiege(a) / a.length; }
// Wochen mit genug Partien fuer eine Wahrscheinlichkeitsrechnung. `_stWochen`
// nimmt fuenf; unter sechs ist eine ganze Woche kaum unwahrscheinlich zu
// nennen, weil schon vier Siege in Folge eine Woche fuellen.
const _stWochGross = p => Object.values(p.wochGrp).filter(a => a.length >= 6);
// Die ersten drei Partien eines Spieltags gegen alles danach. Der Vergleich
// laeuft innerhalb desselben Tages, damit nicht zwei verschiedene Wochen
// gegeneinander stehen.
function _stTagBlock(p){
  const frueh = [], spaet = [];
  Object.values(p.tagGrp).forEach(a => {
    a.forEach((s, i) => (i < 3 ? frueh : spaet).push(s));
  });
  return {frueh, spaet};
}
// Die Partie direkt nach ZWEI Pleiten am Stueck. Nach einer fragt schon
// „Die Antwort"; zwei sind die Stelle, an der ein Tag kippt.
const _stNachZwei = p => p.partien.filter((s, i) =>
  i >= 2 && !p.partien[i-1].win && !p.partien[i-2].win);
// Die letzte Partie jeder Kalenderwoche, in der ueberhaupt gespielt wurde.
const _stWochLetzte = p => Object.values(p.wochGrp)
  .filter(a => a.length >= 3).map(a => a[a.length - 1]);
// Partien als klarer Favorit und als Aussenseiter. Die Grenzen sind
// dieselben wie im Rest des Katalogs.
const _stRollen = p => ({
  fav: p.partien.filter(_stFavorit),
  aus: p.partien.filter(s => s.exp < CHANCE_OFFEN)
});
// Partien, die im Tiebreak oder Match-Tiebreak entschieden wurden (§1.3):
// der letzte Ballwechsel hat entschieden. `_stEng` ist weiter gefasst. Die
// Frage je Partie steht einmal, weil auch der Liga-Rekord „Der Eiskalte" sie
// stellt, und zwei Durchläufe über dieselbe Frage müssen gleich zählen
// [§10.2]. Der Name stammt aus der Kicker-Liga (ein Tor Unterschied).
const _stEinTorPartie = s => !!s.zitter;
const _stEinTor = p => p.partien.filter(_stEinTorPartie);
// Jede Partie mit ihrer direkten Vorgaengerin am SELBEN Tag. Die erste Partie
// eines Tages hat keine: was am Vortag war, ist kein Uebergang, sondern eine
// Nacht dazwischen. „Der Staffellauf" und „Das Seitenbündnis" fragen beide,
// was nach einem Partnerwechsel kam, und zaehlen damit ueber dieselben Paare.
// Der Wert einer Partie ist ihr Ergebnis gegen die Rechnung, Sieg minus
// Siegchance: dieselbe Groesse wie beim Uebersoll [§C38].
const _stUebergaenge = p => p.partien.map((s, i) => ({vor:p.partien[i-1], s}))
  .filter(x => x.vor && x.vor.tag === x.s.tag && x.vor.mate && x.s.mate)
  .map(x => ({wechsel:x.vor.mate !== x.s.mate, bund:x.vor.geg.includes(x.s.mate),
              r:(x.s.win ? 1 : 0) - x.s.exp}));

function _stHaelften(p){
  const tage = Object.keys(p.tagGrp).sort();
  if(tage.length < 4) return null;
  const mitte = tage[Math.floor(tage.length / 2)];
  const e1 = p.partien.filter(s => s.tag < mitte), e2 = p.partien.filter(s => s.tag >= mitte);
  if(e1.length < 4 || e2.length < 4) return null;
  return {q1: _stQuoteRoh(e1),
          q2: _stQuoteRoh(e2), n1:e1.length, n2:e2.length};
}

// Die letzten zehn Partien gegen ALLE davor. Nicht gegen die Gesamtquote:
// die enthaelt das Fenster selbst, und dann zaehlt es doppelt. Ein GESUCHTES
// Maximum aus allen Zehnerbloecken taugt dafuer nicht — wer dreihundert
// Partien hat, hat 291 Ziehungen und wer zwanzig hat, hat elf, und das
// Maximum aus vielen Ziehungen ist groesser [§C39]. Das letzte Fenster liegt
// fest, also gibt es keinen Auswahlvorteil.
function _stLetzteZehn(p){
  if(p.games < 10) return null;
  const drin = p.partien.slice(-10), raus = p.partien.slice(0, p.games - 10);
  return {d: _stQuote(drin) - _stQuote(raus), drin: _stQuote(drin),
          raus: _stQuote(raus), vor: raus.length};
}

// Die zeitlich letzte Partie jedes eigenen Spieltags gegen alle anderen
// dieses Tages. Drei Partien je Tag, damit „die letzte" ueberhaupt eine
// Auswahl ist. Der Vergleich laeuft INNERHALB des Tages, sonst stehen zwei
// verschiedene Wochen gegeneinander.
function _stSchlussBall(p, mindTage){
  const tage = Object.keys(p.tagGrp).filter(t => p.tagGrp[t].length >= 3);
  if(tage.length < mindTage) return null;
  const letzte = [], rest = [];
  tage.forEach(t => { const a = p.tagGrp[t];
    letzte.push(a[a.length - 1]); rest.push(...a.slice(0, -1)); });
  if(!rest.length) return null;
  return {d: _stQuote(letzte) - _stQuote(rest), drin: _stQuote(letzte),
          raus: _stQuote(rest), n: letzte.length, m: rest.length};
}

// Das Gegenstück zum letzten Ball: die erste Partie jedes Spieltags gegen
// die übrigen desselben Tages. Die Monatschronik „Der Kaltstart" zählte die
// ersten Partien absolut (85 % gewonnen), und das erreicht nur, wer ohnehin
// fast alles gewinnt — gemessen hielten sie nur die ersten drei der Tabelle.
// Gegen den eigenen Rest gestellt fragt sie, was ihr Name sagt [§C39].
function _stErsterBall(p, mindTage){
  const tage = Object.keys(p.tagGrp).filter(t => p.tagGrp[t].length >= 3);
  if(tage.length < mindTage) return null;
  const erste = [], rest = [];
  tage.forEach(t => { const a = p.tagGrp[t];
    erste.push(a[0]); rest.push(...a.slice(1)); });
  if(!rest.length) return null;
  return {d: _stQuote(erste) - _stQuote(rest), drin: _stQuote(erste),
          raus: _stQuote(rest), n: erste.length, m: rest.length};
}
// Die Summe der Siegchancen: wie viele Siege die Elo-Rechnung vor den
// Partien erwartet hat. Mehrere Chroniken stellen das Ist dagegen statt
// gegen eine feste Quote — eine feste Quote erreicht nur der Stärkste.
function _stSoll(a){ return a.reduce((s, x) => s + x.exp, 0); }
// Wie weit eine Teilmenge über der Rechnung lag: die Quote gegen die mittlere
// Siegchance derselben Partien. Die neuen Chroniken gegen das Eigene und
// gegen die Spitze fragen alle so [§C39] — die Quote allein ordnete sie wie
// die Tabelle, weil der Starke gegen jeden öfter gewinnt.
const _stUeberSoll = a => _stQuoteRoh(a) - _stSoll(a) / a.length;
// Die nächste Partie am selben Tag gegen dieselben zwei, direkt nach einer
// Niederlage gegen sie.
const _stRevanchen = p => p.partien.filter((s, i) => {
  const a = p.partien[i - 1];
  return i > 0 && !a.win && a.tag === s.tag && a.geg.slice().sort().join() === s.geg.slice().sort().join();
});
// Die nächste Partie am selben Tag, direkt nach einem Sieg — das Gegenstück
// zu den Gelegenheiten, nach einer Pleite zu antworten.
const _stNachSieg = p => p.partien.filter((s, i) => i > 0 && p.partien[i - 1].win && p.partien[i - 1].tag === s.tag);
// Die Partien neben einem Partner, mit dem es vor diesem Monat nie eine gab.
// Die Laufbahn davor einmal je Monat, am Kontext gemerkt.
function _stNeuland(p, C){
  if(!C._partnerVorher){
    const ab = seasonStart(C.sid).getTime(), o = {};
    (matches || []).forEach(m => {
      if(mts(m) >= ab) return;
      [[m.a1, m.a2], [m.a2, m.a1], [m.b1, m.b2], [m.b2, m.b1]].forEach(([x, y]) => {
        if(x && y) (o[x] = o[x] || new Set()).add(y); });
    });
    C._partnerVorher = o;
  }
  const alt = C._partnerVorher[p.pid];
  return p.partien.filter(s => s.mate && !(alt && alt.has(s.mate)));
}
// Die eigene Laufbahn vor diesem Monat: Partien, Siegquote und Sturmanteil.
// „Der Ausnahmemonat" und „Der Rollentausch" stellen den Monat gegen sie und
// nicht gegen den Vormonat — ein Vormonat sind zwanzig Partien und selbst
// schon ein Ausreisser, die Laufbahn ist das, was jemand gewoehnlich spielt.
// Gewertet wird erst ab dreissig Partien davor: darunter gibt es keine
// Laufbahn, gegen die ein Monat herausragen koennte. Einmal je Monat fuer
// alle gerechnet und am Kontext gemerkt, wie bei `_stNeuland`.
function _stLaufbahnVor(p, C){
  if(!C._laufbahnVor){
    const ab = seasonStart(C.sid).getTime(), o = {};
    (matches || []).forEach(m => {
      if(mts(m) >= ab) return;
      [['a1', 'A'], ['a2', 'A'], ['b1', 'B'], ['b2', 'B']].forEach(([k, seite]) => {
        const id = m[k];
        if(!id) return;
        const x = o[id] || (o[id] = {g:0, w:0, atk:0, def:0});
        x.g++;
        if(m.winner === seite) x.w++;
        if(m[k + '_side'] === 'drive') x.atk++; else x.def++;
      });
    });
    C._laufbahnVor = o;
  }
  const x = C._laufbahnVor[p.pid];
  // `atk` ist der Anteil der Partien rechts davor: „Der Rollentausch" stellt
  // die Seiten des Monats gegen die der Laufbahn.
  return x && x.g >= 15 ? {g:x.g, q:x.w / x.g, atk:x.atk / x.g, drvG:x.atk, revG:x.def} : null;
}
// Die Duelle der Laufbahn vor diesem Monat, je Gegner: wie oft gegen ihn
// gespielt und wie oft gewonnen. „Der Bannbrecher" und „Die Retourkutsche"
// fragen, wie der Monat gegen den schwierigsten und den liebsten Gegner der
// Laufbahn ausging. Einmal je Monat für alle gerechnet und am Kontext gemerkt.
function _stDuelleVor(p, C){
  if(!C._duelleVor){
    const ab = seasonStart(C.sid).getTime(), o = {};
    (matches || []).forEach(m => {
      if(mts(m) >= ab) return;
      [['a1', 'A', ['b1', 'b2']], ['a2', 'A', ['b1', 'b2']], ['b1', 'B', ['a1', 'a2']], ['b2', 'B', ['a1', 'a2']]]
        .forEach(([k, seite, geg]) => {
          const id = m[k];
          if(!id) return;
          geg.forEach(g => {
            const fid = m[g];
            if(!fid) return;
            const x = ((o[id] = o[id] || {})[fid] = o[id][fid] || {g:0, w:0});
            x.g++;
            if(m.winner === seite) x.w++;
          });
        });
    });
    C._duelleVor = o;
  }
  return C._duelleVor[p.pid] || {};
}
// Der Gegner, gegen den die Laufbahn davor am schlechtesten (`richtung` -1)
// oder am besten (+1) aussah, unter denen, gegen die es im Monat mindestens
// vier Duelle und davor zehn gab. Schlecht und gut heißt: unter und über der
// eigenen Quote der Laufbahn — ohne diese Grenze wählte die Chronik bei
// jemandem mit nur einem solchen Gegner denselben für beide Fragen, und ein
// Gegner, gegen den es wie gegen alle lief, stand als Angstgegner da.
function _stDuellWende(p, C, richtung){
  const lv = _stLaufbahnVor(p, C);
  if(!lv) return null;
  const vor = _stDuelleVor(p, C);
  const l = Object.keys(p.gegnerGrp)
    .filter(g => (vor[g] || {}).g >= 6 && p.gegnerGrp[g].length >= 3)
    .map(g => ({fid:g, kq:vor[g].w / vor[g].g, kn:vor[g].g,
                mq:_stQuoteRoh(p.gegnerGrp[g]), mn:p.gegnerGrp[g].length, mw:_stSiege(p.gegnerGrp[g])}))
    .filter(x => richtung < 0 ? x.kq < lv.q : x.kq > lv.q)
    .sort((a, b) => richtung * (b.kq - a.kq) || b.kn - a.kn || (a.fid < b.fid ? -1 : 1));
  return l.length ? l[0] : null;
}
// Die Partien neben einem Partner, der seine zwei Partien davor verloren
// hatte, gleich wann — auch über den Monatswechsel: „Die Stütze" fragt, was
// an der Seite von jemandem geschieht, dem es gerade nicht läuft. Einmal je
// Monat für alle Partien gerechnet und am Kontext gemerkt.
function _stPartnerTief(p, C){
  if(!C._partnerTief){
    const ende = C.ms.length ? mts(C.ms[C.ms.length - 1]) : 0, imMonat = new Set(C.ms.map(m => m.id));
    const zuletzt = {}, o = {};
    (matches || []).filter(m => mts(m) <= ende).sort((a, b) => mts(a) - mts(b)).forEach(m => {
      const ids = [m.a1, m.a2, m.b1, m.b2];
      if(imMonat.has(m.id)) o[m.id] = new Set(ids.filter(id => id && (zuletzt[id] || []).length === 2
        && zuletzt[id].every(w => !w)));
      ids.forEach((id, i) => {
        if(!id) return;
        const w = (i < 2) === (m.winner === 'A');
        zuletzt[id] = (zuletzt[id] || []).concat(w).slice(-2);
      });
    });
    C._partnerTief = o;
  }
  return p.partien.filter(s => s.mate && C._partnerTief[s.mid] && C._partnerTief[s.mid].has(s.mate));
}
// Wie unwahrscheinlich ein Ausschnitt nach der Rechnung war, als
// Zehnerlogarithmus der Wahrscheinlichkeit, mindestens so viele Siege zu
// holen (`unten`: höchstens so wenige). Die Chroniken der sechsten Fassung
// fragen so statt nach dem Abstand zur Rechnung in Prozentpunkten: ein
// Abstand schwankt mit wenigen Partien stärker, und wer achtzig Partien im
// Monat spielte, bekam kaum je eine Chronik — gemessen im Schnitt eine
// positive, wer weniger spielte, drei. Eine Wahrscheinlichkeit ist für zehn
// und für hundert Partien gleich schwer zu reißen, solange nur der Zufall
// spielt; wer über viele Partien besser ist als die Rechnung, reißt sie
// leichter, und das ist gewollt.
function _stUnwahr(a, unten){
  const ps = a.map(s => s.exp), k = _stSiege(a);
  return -Math.log10(Math.max(unten ? 1 - _stPBinom(ps, k + 1) : _stPBinom(ps, k), 1e-9));
}
// Der Gegner mit den meisten Duellen im Monat, bei Gleichstand der mit der
// kleineren ID: „Das Stammduell" und „Die Übermacht" fragen nach dem Gegner,
// den der Monat am häufigsten gegenüberstellte, nicht nach dem besten oder
// schlechtesten — eine Auswahl unter allen Gegnern hinge wieder an der
// Zahl der Gegner („Der Lieblingsgegner" mit 0,54 an der Spielzahl).
function _stRivale(p){
  const g = Object.keys(p.gegnerGrp)
    .sort((x, y) => p.gegnerGrp[y].length - p.gegnerGrp[x].length || (x < y ? -1 : 1))[0];
  return g ? {fid:g, a:p.gegnerGrp[g]} : null;
}
// Die langen Spieltage: geschlossene Tage mit mindestens sieben eigenen
// Partien. „Der lange Atem" fragt, was an solchen Tagen herauskommt.
const _stLangeTage = p => Object.values(p.tagGrp).filter(a => a.length >= 7);
// Das erste Wiedersehen mit denselben zwei Gegnern an einem späteren Tag,
// nachdem das letzte Duell gegen sie verloren ging. „Die Revanche" fragt
// nach derselben Paarung am selben Tag; hier liegt eine Nacht dazwischen.
function _stSpaeteRevanchen(p){
  const out = [], letzte = {};
  p.partien.forEach(s => {
    const k = s.geg.slice().sort().join('+'), l = letzte[k];
    if(l && !l.win && l.tag !== s.tag) out.push(s);
    letzte[k] = s;
  });
  return out;
}
// Partien am selben Tag nach einem Wechsel der Seite gegen die nach
// derselben Seite, beide gegen die Rechnung. „Der Platztausch" und „Das
// Festhalten" sind die zwei Enden derselben Differenz.
function _stPlatzwechsel(p){
  const w = [], b = [];
  p.partien.forEach((s, i) => {
    const v = p.partien[i - 1];
    if(!v || v.tag !== s.tag) return;
    (v.pos !== s.pos ? w : b).push(s);
  });
  return w.length >= ST_TEIL && b.length >= ST_TEIL ? {w, b, d:_stUeberSoll(w) - _stUeberSoll(b)} : null;
}
// Die unwahrscheinlichste Siegesserie des Monats: das Produkt der
// Siegchancen über eine Folge von Siegen, mal der Zahl der eigenen Partien.
// Ohne diesen Faktor hätte, wer mehr spielt, mehr Anläufe auf eine lange
// Serie (gemessen 0,35 an der Spielzahl); mit ihm ist es ungefähr die
// Erwartung, irgendwo im Monat eine solche Serie zu sehen.
function _stSiegeszug(p){
  let best = null, run = 1, len = 0;
  p.partien.forEach(s => {
    if(!s.win){ run = 1; len = 0; return; }
    run *= s.exp; len++;
    if(!best || run < best.p) best = {p:run, n:len};
  });
  return best ? Object.assign(best, {erw:best.p * p.games}) : null;
}
// Der eigene Anteil an allen Partien eines Monats, gemittelt über die Monate
// davor mit mindestens acht eigenen Partien. „Der Aufdreher" und „Der Rückzug"
// stellen den Monat dagegen. Gefragt ist der ANTEIL und nicht die Zahl: die
// Zahl gegen den Vormonat schwankte mit der Liga selbst — im Juni spielte
// jeder ein Vielfaches des Mai, weil die Liga erst anlief, und der Wert hing
// mit 0,63 an der Spielzahl. Der Anteil fragt, ob jemand mehr dabei war als
// sonst, unabhängig davon, wie viel die Liga spielte (gemessen −0,02).
function _stAnteilVor(p, C){
  if(!C._anteilVor){
    const ab = seasonStart(C.sid).getTime(), je = {}, liga = {};
    (matches || []).forEach(m => {
      if(mts(m) >= ab) return;
      const sid = (seasonOf(m.created_at) || {}).id;
      if(!sid) return;
      liga[sid] = (liga[sid] || 0) + 1;
      [m.a1, m.a2, m.b1, m.b2].forEach(id => {
        if(id) (je[id] = je[id] || {})[sid] = (je[id][sid] || 0) + 1; });
    });
    C._anteilVor = {je, liga};
  }
  const v = C._anteilVor, eigen = v.je[p.pid] || {};
  const l = Object.keys(eigen).filter(sid => eigen[sid] >= TITLE_MIN_GAMES).map(sid => eigen[sid] / v.liga[sid]);
  return l.length ? {anteil:_stMittel(l), monate:l.length} : null;
}
// Die Partien gegen die beiden Ersten der Monatstabelle, ohne sich selbst.
function _stSpitzeGegen(p, C){
  const spitze = C.rankAll.slice(0, 2).map(r => r.id).filter(id => id !== p.pid);
  return p.partien.filter(s => s.geg.some(g => spitze.includes(g)));
}
// Gegen wen es im Monat mindestens vier Duelle gab: die zweite Hälfte dieser
// Duelle gegen die erste, jeweils über der Rechnung, im Mittel über alle
// solchen Gegner. Wer sich auf einen Gegner einstellt, wird gegen ihn besser.
function _stLernkurve(p){
  const l = Object.values(p.gegnerGrp).filter(a => a.length >= 4);
  if(l.length < 3) return null;
  return {n:l.length, v:_stMittel(l.map(a => {
    const h = Math.floor(a.length / 2);
    return _stUeberSoll(a.slice(h)) - _stUeberSoll(a.slice(0, h));
  }))};
}
// Wie viele Games Unterschied eine Siegchance erwarten lässt, aus den
// Partien des Monats selbst: die Steigung der Game-Differenz über die Chance.
// Ein fester Wert wäre eine Behauptung über diese Liga; die Steigung misst
// sie und wandert mit ihr.
function _stTorSteigung(C){
  if(C._torSteigung != null) return C._torSteigung;
  let a = 0, b = 0;
  C.ms.forEach(m => { const x = (m.exp_a == null ? .5 : m.exp_a) - .5;
    a += x * ((m.games_a || 0) - (m.games_b || 0)); b += x * x; });
  return (C._torSteigung = b ? a / b : 0);
}
// Der eigene Vormonat: die Monatschroniken des Vergleichs stellen einen
// Spieler gegen sich selbst, einen Monat früher. Der Vormonat braucht vier
// Partien — darunter ist eine Quote ein Zufall; der Monat selbst die
// CHRONIK_MIN_SPIELE, ab denen jede Monatschronik zählt.
function _stVormonat(p, C){
  const v = _prevSeasonId(C.sid);
  if(!v) return null;
  const q = _seasonTitleCtx(v).P[p.pid];
  return q && q.games >= 4 ? q : null;
}
function _stVormonatPlatz(p, C){
  const v = _prevSeasonId(C.sid);
  const a = v ? _seasonTitleCtx(v).rankAll.findIndex(r => r.id === p.pid) : -1;
  const b = C.rankAll.findIndex(r => r.id === p.pid);
  return a >= 0 && b >= 0 ? {vor:a + 1, jetzt:b + 1} : null;
}

// Fuenf Lagen desselben Monats. „Ohne Schwachstelle" wertet die schwaechste
// davon: ein einziger Einbruch kostet die Chronik, und deshalb kann sie nur
// holen, wer keinen hatte [§C39].
function _stLagen(p, c){
  const stark = {};
  Object.values(c.P).forEach(x => { if(x.games >= 8) stark[x.pid] = x.q; });
  const grp = {
    vorne:   p.partien.filter(s => s.pos === 'drive'),
    hinten:  p.partien.filter(s => s.pos === 'reves'),
    oben:    p.partien.filter(s => s.geg.some(g => stark[g] != null && stark[g] > p.q)),
    eng:     p.partien.filter(_stEng),
    antwort: _stNachPleite(p)
  };
  const q = {};
  for(const k in grp){
    if(grp[k].length < ST_TEIL) return null;
    q[k] = _stQuoteRoh(grp[k]);
  }
  return q;
}

const DISZIPLINEN = [
  // ═══ LIGA-REKORDE ═════════════════════════════════════════════════
  // Was jemand je erreicht hat. Diese Disziplinen tragen keine
  // Monatswertung mehr: die Monatsebene ist ein eigener Katalog
  // geworden, mit eigenen Fragen und eigenen Schwellen [§C39].

  {id:'best_record', name:'Der Maßstab', short:'Maßstab', ic:'massstab', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'mark', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ein einzelner Monat',
      mind:'6 Partien im Monat',
      wie:'Gewertet wird der beste einzelne Monat einer Laufbahn und nicht der Schnitt über alle Monate. Monate mit weniger als sechs eigenen Partien bleiben außen vor.',
      cond:'Höchste Siegquote in einem einzelnen Monat, ab 6 Partien in diesem Monat',
      val:p => p.bestMonth ? p.bestMonth.q : null,
      ev:(p,v) => `${Math.round(v*100)} % aus ${p.bestMonth.g} Partien`,
      zeit:p => p.bestMonth ? seasonLabel(p.bestMonth.sid) : ''
    }},

  {id:'spotless', name:'Der makellose Tag', short:'Makellos', ic:'trophyDay', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Makellose',
      art:'koennen',
      klasse:'legendaer', aus:3.61, streu:0.0492, mitte:0.0222, n0:8, echt:1,
      wie:'Der Anteil der eigenen Spieltage ohne verlorene Partie. Ein Tag zählt ab drei eigenen Partien.',
      stichprobe:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length,
      cond:'Mindestens 20 % der eigenen Spieltage ohne eine einzige Niederlage, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=3,
        p=>{const t=Object.values(p.tagGrp).filter(a=>a.length>=3);
      return t.filter(a=>a.every(s=>s.win)).length/t.length;},
        0.2,
        p=>{const t=Object.values(p.tagGrp).filter(a=>a.length>=3);
      return `${t.filter(a=>a.every(s=>s.win)).length} von ${t.length} Spieltagen ohne Niederlage`;}))},
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, je voller Spieltag',
      mind:'8 volle Spieltage',
      wie:'Ein voller Spieltag hat vier oder mehr eigene Partien. Gezählt wird, an wie vielen davon keine Partie verloren ging, geteilt durch alle vollen Spieltage.',
      cond:'Höchster Anteil voller Spieltage ohne Niederlage, ab 8 vollen Spieltagen',
      val:p => p.bigDays >= 8 ? p.perfDays/p.bigDays : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.bigDays} vollen Spieltage ohne eine einzige Niederlage · ${p.perfDays} ${p.perfDays === 1 ? 'Tag' : 'Tage'}`
    }},

  {id:'kopfhoch', name:'Der Tagesabschluss', short:'Tagesende', ic:'tagesabschluss', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Gefestigte',
      art:'konstanz',
      klasse:'selten', aus:2.16, streu:0.234, mitte:0.495, n0:9, echt:0.6,
      wie:'Ein Tag zählt, wenn am Ende mindestens so viele Siege stehen, wie die Siegchancen vor den Partien dieses Tages zusammen erwarten ließen.',
      stichprobe:p => p.tagN,
      cond:'An jedem eigenen Spieltag mindestens so viele Siege, wie die Elo-Rechnung erwartet hat, ab 3 Spieltagen',
      ...(_stWertung(
        p=>p.tagN>=3,
        p=>{const t=Object.values(p.tagGrp);return t.filter(a=>_stSiege(a)>=_stSoll(a)-1e-9).length/t.length;},
        1,
        p=>{const t=Object.values(p.tagGrp);return `${t.filter(a=>_stSiege(a)>=_stSoll(a)-1e-9).length} von ${t.length} Spieltagen mindestens im Soll`;}))}},

  {id:'catalyst', name:'Der Katalysator', short:'Katalyse', ic:'partnerHebel', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen,
      zeitraum:'Ganze Laufbahn, je Partner',
      mind:'3 Partner mit je 8 gemeinsamen Partien',
      wie:'Für jeden Partner wird die gemeinsame Siegquote mit der aus allen übrigen Partien dieses Partners verglichen. Gemittelt über alle Partner, gewichtet nach den gemeinsamen Partien.',
      cond:'Größter positiver Einfluss auf die eigenen Partner, ab 3 Partnern mit je 15 gemeinsamen Partien',
      val:p => (p.einflussN >= 3 && p.einflussD != null && p.einflussD > 0) ? p.einflussD : null,
      ev:(p,v) => `${Math.abs(Math.round(v*100))} %-Punkte ${v < 0 ? 'verlieren' : 'gewinnen'} die ${p.einflussN} Partner an dieser Seite häufiger`
    }},

  {id:'ausgleich', name:'Der Ausgleicher', short:'Ausgleich', ic:'jederPartner', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Verlässliche',
      art:'koennen',
      klasse:'selten', aus:2.09, streu:0.185, mitte:0.213, n0:6, echt:1,
      wie:'Nicht der beste Partner zählt, sondern der schlechteste. Es geht darum, mit wem auch immer zu bestehen.',
      stichprobe:p => Math.min(...Object.values(p.partnerGrp).filter(a => a.length >= ST_TEIL).map(a => a.length)),
      cond:'Neben JEDEM Partner mindestens 60 %, ab 3 Partnern mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.partnerGrp).filter(a=>a.length>=ST_TEIL).length>=3,
        p=>Math.min(...Object.values(p.partnerGrp).filter(a=>a.length>=ST_TEIL)
      .map(a=>_stQuoteRoh(a))),
        0.6,
        (p,v)=>{const k=Object.keys(p.partnerGrp).filter(k=>p.partnerGrp[k].length>=ST_TEIL)
      .map(k=>({k,q:_stQuoteRoh(p.partnerGrp[k])})).sort((a,b)=>a.q-b.q)[0];
      return `selbst neben ${pname(k.k)} noch ${pct(k.q)} % · ${Object.values(p.partnerGrp).filter(a=>a.length>=ST_TEIL).length} Partner`;}))}},

  {id:'clutch', name:'Die ruhige Hand', short:'Nerven', ic:'target', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, alle knappen Partien',
      mind:'8 knappe Partien',
      wie:'Knapp ist eine Partie, die im Tiebreak entschieden wurde, in der beide einen Satz gewonnen haben oder die mit höchstens zwei Games Unterschied endete. Verglichen wird die Siegquote dieser Partien mit der Siegquote in allen übrigen eigenen Partien, in Prozentpunkten.',
      cond:'Größter Leistungssprung in knappen Partien, ab 8 knappen Partien',
      val:p => {
        if(p.close < 8) return null;
        const rest = p.games - p.close;
        if(rest < 1) return null;
        const d = (p.closeW/p.close) - ((p.wins - p.closeW)/rest);
        return d > 0 ? d : null;
      },
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte in knappen Partien · ${pct(p.closeW/p.close)} statt ${_ppGegen(p.closeW/p.close, v)} % sonst`
    },
    // Dieselbe Rechnung auf der Monatsachse [§13.1]: enge gegen die uebrigen
    // eigenen Partien desselben Monats. Gegen das Eigene gemessen, also fuer
    // jede Staerke erreichbar — gehalten haben sie in den Fixture-Monaten zwei
    // Spieler mit einer Monatsquote unter 40 %.
    monat:{
      beiname:'Der Abgeklärte',
      art:'koennen',
      klasse:'besonders', aus:1.81, streu:0.188, mitte:0.0224, n0:9.6, echt:0,
      wie:'Knapp heißt: Tiebreak, ein Satz für jeden oder höchstens zwei Games Unterschied. Verglichen wird die Siegquote dieser Partien mit der in allen übrigen eigenen Partien des Monats.',
      stichprobe:p => _stH(p.partien.filter(_stEng).length, p.partien.filter(s => !_stEng(s)).length),
      // 35 statt 30 Prozentpunkte, seit über jede Spielzahl gleich gemessen
      // wird [§C39]: mit 30 ging die Chronik in drei von fünf Monaten an
      // jemanden, weil Spieler mit vielen knappen Partien jetzt mitzählen.
      cond:'In knappen Partien mindestens 35 Prozentpunkte stärker als in den übrigen, ab 3 knappen und 3 übrigen Partien',
      ...(_stWertung(
        p => p.partien.filter(_stEng).length >= ST_TEIL && p.partien.filter(s => !_stEng(s)).length >= ST_TEIL,
        p => _stQuoteRoh(p.partien.filter(_stEng)) - _stQuoteRoh(p.partien.filter(s => !_stEng(s))),
        0.35,
        (p, v) => { const e = p.partien.filter(_stEng);
          return `${_ppZeichen(v)} %-Punkte in knappen Partien · ${_stSiege(e)} von ${e.length} gewonnen`; }))}},

  {id:'gleichauf', name:'Auf Augenhöhe', short:'Auf Höhe', ic:'augenhoehe', tone:'gold', art:'leistung',
    // Die Laufbahn-Achse derselben Frage [§13.1]. „Die ruhige Hand" darueber
    // nimmt die ENGEN Partien, also die nach dem Ergebnis knappen: offen ist
    // eine Aussage ueber den Beginn der Partie, eng eine ueber den Abpfiff. Verglichen
    // wird gegen die eigene Gesamtquote, also messen alle gegen ihr eigenes
    // Niveau und nicht gegeneinander [§C38].
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, alle offenen Partien',
      mind:'10 ausgeglichen erwartete Partien',
      wie:'Ausgeglichen heißt: die Elo-Rechnung gab beiden Teams zwischen 45 und 55 Prozent Siegchance. Verglichen wird die Siegquote in diesen Partien mit der Siegquote in allen übrigen eigenen Partien, in Prozentpunkten.',
      cond:'Größter Leistungssprung in ausgeglichen erwarteten Partien, ab 20 solchen Partien',
      val:p => (p.ahDelta != null && p.ahDelta > 0) ? p.ahDelta : null,
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte in offenen Partien · ${pct(p.ahQ)} statt ${_ppGegen(p.ahQ, v)} % sonst`
    },
    monat:{
      beiname:'Der Entscheider',
      art:'koennen',
      klasse:'besonders', aus:2.02, streu:0.096, mitte:0.0111, n0:15, echt:0,
      wie:'Offen heißt: die Rechnung gab beiden Teams zwischen 45 und 55 Prozent. Verglichen wird die Quote darin mit der eigenen Gesamtquote.',
      stichprobe:p => p.partien.filter(_stAugenhoehe).length,
      cond:'In offenen Partien mindestens 20 Prozentpunkte stärker als sonst, ab 3 offenen Partien',
      ...(_stWertung(
        p=>p.partien.filter(_stAugenhoehe).length>=ST_TEIL,
        p=>{const d=p.partien.filter(_stAugenhoehe);return _stQuoteRoh(d)-p.q;},
        0.2,
        p=>{const d=p.partien.filter(_stAugenhoehe);
      return `${_stSiege(d)} von ${d.length} offenen Partien · sonst ${pct(p.q)} %`;}))}},

  {id:'destroyer', name:'Der Zerstörer', short:'Zerstörer', ic:'abrissbirne', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, alle Siege',
      mind:'10 Siege',
      wie:'Ein Kantersieg ist ein Sieg ohne Satzverlust mit mindestens drei Vierteln der Games, etwa 6:2 oder 6:1 6:3. Gezählt wird ihr Anteil an den eigenen Siegen, nicht an allen Partien.',
      cond:'Höchster Anteil Kantersiege an allen eigenen Siegen, ab 10 Siegen',
      val:p => p.wins >= 10 ? p.blowW/p.wins : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.wins} Siege waren Kantersiege · ${p.blowW} Kantersiege`
    },
    // Derselbe Anteil im Monat [§13.1]. Ein 10:0 allein waere die schaerfere
    // Frage, aber es ist zu selten fuer einen Anteil: in 466 Partien endeten
    // acht so. Sieben Tore sind dieselbe Grenze wie ueber die Laufbahn.
    monat:{
      beiname:'Der Kantersieger',
      art:'koennen',
      klasse:'besonders', aus:1.19, streu:0.0858, mitte:0.145, n0:22, echt:0.7,
      wie:'Ein Kantersieg ist ein Sieg ohne Satzverlust mit mindestens drei Vierteln der Games, etwa 6:2 oder 6:1 6:3. Gezählt wird ihr Anteil an den eigenen Siegen des Monats, nicht an allen Partien.',
      stichprobe:p => p.wins,
      cond:'Mindestens 25 % der eigenen Siege waren Kantersiege, ab 3 Siegen',
      ...(_stWertung(
        p => p.wins >= ST_TEIL,
        p => p.partien.filter(s => s.win && s.deutlich).length / p.wins,
        0.25,
        (p, v) => `${pct(v)} % aller ${p.wins} Siege waren Kantersiege · ${p.partien.filter(s => s.win && s.deutlich).length} Stück`))}},

  {id:'breitenwirkung', name:'Kein Angstgegner', short:'Kein Angst', ic:'jederGegner', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Standhafte',
      art:'koennen',
      klasse:'selten', aus:1.76, streu:0.274, mitte:0.517, n0:9, echt:0,
      wie:'Regelmäßig heißt mindestens drei Duelle im Monat. Gegen jeden davon zählt, ob es mindestens so viele Siege wurden, wie die Siegchancen vor den Partien zusammen erwarten ließen. Gegen einen starken Gegner reichen weniger als gegen einen schwachen.',
      stichprobe:p => Object.values(p.gegnerGrp).filter(d => d.length >= 3).length,
      cond:'Gegen JEDEN regelmäßigen Gegner mindestens so viele Siege, wie die Elo-Rechnung erwartet hat, ab 8 solchen Gegnern',
      ...(_stWertung(
        p=>Object.values(p.gegnerGrp).filter(d=>d.length>=3).length>=4,
        p=>{const r=Object.values(p.gegnerGrp).filter(d=>d.length>=3);
      return r.filter(d=>_stSiege(d)>=_stSoll(d)-1e-9).length/r.length;},
        1,
        p=>{const r=Object.values(p.gegnerGrp).filter(d=>d.length>=3);
      return `gegen ${r.filter(d=>_stSiege(d)>=_stSoll(d)-1e-9).length} von ${r.length} regelmäßigen Gegnern mindestens die erwarteten Siege`;}))}},

  {id:'deutlich', name:'Der Deutliche', short:'Deutlich', ic:'plusMinus', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unbarmherzige',
      art:'koennen',
      klasse:'selten', aus:1.79, streu:0.864, mitte:-0.0983, n0:42, echt:0,
      wie:'Aus der Siegchance vor jeder Partie folgt, wie viele Games Unterschied zu erwarten sind, gerechnet über alle Partien des Monats. Gewertet wird, wie weit die eigene Game-Differenz je Partie darüber liegt.',
      stichprobe:p => p.games,
      cond:'Je Partie mindestens 1,5 Games mehr Differenz, als die Stärke der Teams erwarten ließ',
      ...(_stWertung(
        p=>p.games>=8,
        (p,C)=>{const S=_stTorSteigung(C);return p.partien.reduce((s,x)=>s+(x.gf-x.ga)-S*(x.exp-.5),0)/p.games;},
        1.5,
        (p,v)=>`${v<0?'−':'+'}${komma(Math.abs(v))} Games je Partie über der Erwartung · ${p.gf}:${p.ga}`))}},

  // Die beiden Seiten als GANZES, nicht als Einzelmaß. Gegentore allein
  // oder eigene Tore allein sagen nichts darüber, ob jemand seine Spiele
  // auch gewinnt. Gewertet wird deshalb genau der
  // Wert, nach dem die Seiten-Rangliste sortiert (posWert, [§5.2]):
  // Siegquote, Leistung gegen die Erwartung, Rollenbeitrag, Erfahrung.
  // Damit gehört der Erste dieser Liste sichtbar etwas — die Seiten-
  // Rangliste war die einzige Rangliste der App, auf der es nichts zu holen
  // gab.
  //
  // Nur allzeit: der Wert wiegt Erfahrung mit ein, und ein Monat hat davon
  // zu wenig. Über vier Wochen entschiede die Spielzahl statt der Leistung.
  {id:'drive_ace', name:'Der komplette Drive', short:'Drive', ic:'driveAce', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen,
      zeitraum:'Ganze Laufbahn, alle Partien rechts',
      mind:'12 Partien rechts',
      wie:'Drei Teile: die Siegquote rechts, ein Viertel des Abstands zur Elo-Erwartung und ein Fünftel des Anteils der Games, den das eigene Team rechts holt. Wie viele Partien rechts es waren, zählt nicht.',
      cond:'Höchster Gesamtwert rechts, ab 12 Partien rechts',
      val:p => (p.drvG >= 12)
        ? posLeistung('drive', p.drvG, p.drvW, p.drvGf/((p.drvGf+p.drvGa)||1), p.drvPerf/p.drvG) : null,
      ev:(p,v) => `${Math.round(v*100)} Wert rechts · ${p.drvW}:${p.drvG-p.drvW} in ${p.drvG} Partien rechts`
    }},

  {id:'reves_ace', name:'Der komplette Revés', short:'Revés', ic:'revesAce', tone:'blue', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen,
      zeitraum:'Ganze Laufbahn, alle Partien links',
      mind:'12 Partien links',
      wie:'Drei Teile: die Siegquote links, ein Viertel des Abstands zur Elo-Erwartung und ein Fünftel des Anteils der Games, den das eigene Team links holt. Wie viele Partien links es waren, zählt nicht.',
      cond:'Höchster Gesamtwert links, ab 12 Partien links',
      val:p => (p.revG >= 12)
        ? posLeistung('reves', p.revG, p.revW, p.revGf/((p.revGf+p.revGa)||1), p.revPerf/p.revG) : null,
      ev:(p,v) => `${Math.round(v*100)} Wert links · ${p.revW}:${p.revG-p.revW} in ${p.revG} Partien links`
    }},

  // Dieselbe Achse wie die beiden darueber und deshalb hier [§C35]: der
  // komplette Drive und der komplette Revés messen die Seite als
  // Ganzes, der Rollencoup nur den Teil davon, den die Rechnung nicht
  // vorhergesagt hat. Gewertet wird die BESSERE der beiden qualifizierten
  // Seiten — wer auf einer Seite ueber dem Soll liegt, hat das dort
  // getan, und ein Mittel ueber beide verwaesserte es mit der Seite, auf der
  // er selten steht. Die Siegchance kommt aus der Partie und wird nicht mit
  // heutigen Reglern nachgerechnet: eine zweite Rechnung ueber dieselbe
  // Frage nennt irgendwann eine andere Zahl [§C27].
  {id:'rollencoup', name:'Der Rollencoup', short:'Rollencoup', ic:'rollencoup', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, je Seite',
      mind:'20 Außenseiterpartien auf einer Seite',
      wie:'Nur Partien, in denen das eigene Team unter 45 Prozent Siegchance hatte, getrennt nach rechts und links. Gezählt wird, um wie viel öfter gewonnen wurde als erwartet; die bessere Seite gilt.',
      cond:'Größter Vorsprung auf die Erwartung als Außenseiter auf einer Seite, ab 20 solchen Partien',
      val:p => (p.rcDelta != null && p.rcDelta > 0) ? p.rcDelta : null,
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte über der Erwartung · ${pct(p.rcQ)} % statt ${_ppGegen(p.rcQ, v)} % ${p.rcPos === 'drive' ? 'rechts' : 'links'}`
    }},

  {id:'comeback_king', name:'Der Stehaufmann', short:'Comeback', ic:'comeback', tone:'acid', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'12 Partien direkt nach einer Niederlage',
      wie:'Eine Gelegenheit ist jede Partie, die direkt auf eine eigene Niederlage folgt. Verglichen wird die Siegquote dort mit der Siegquote in allen übrigen eigenen Partien, in Prozentpunkten.',
      cond:'Größter Aufschwung direkt nach einer Niederlage, ab 25 Gelegenheiten',
      val:p => {
        if(p.afterLossOpp < 12) return null;
        const rest = p.games - p.afterLossOpp;
        if(rest < 1) return null;
        const d = p.afterLoss/p.afterLossOpp - (p.wins - p.afterLoss)/rest;
        return d > 0 ? d : null;
      },
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte nach einer Pleite · ${pct(p.afterLoss/p.afterLossOpp)} statt ${_ppGegen(p.afterLoss/p.afterLossOpp, v)} % sonst`
    }},

  {id:'damage_control', name:'Der Widerstand', short:'Zähigkeit', ic:'widerstand', tone:'blue', art:'leistung',
    // Gemessen wird jetzt JEDE Niederlage und nicht mehr nur die deutliche ab
    // sieben Toren. Der Anteil deutlicher Pleiten liess offen, wie die
    // uebrigen ausgingen: wer nie hoch und immer mit fuenf Toren verliert,
    // stand dort bei null Prozent und damit an der Spitze. Der mittlere
    // Rueckstand beantwortet die Frage, die der Name stellt.
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, alle Niederlagen',
      mind:'10 Niederlagen',
      wie:'Gemessen wird der Rückstand in Games jeder Niederlage, gemittelt über alle eigenen Niederlagen. Es zählt, wie hoch verloren wird, nicht wie oft.',
      cond:'Niedrigster mittlerer Rückstand in Games in allen eigenen Niederlagen, ab 10 Niederlagen',
      val:p => p.losses >= 10 ? -(p.wdSum / p.losses) : null,
      ev:p => `${komma(p.wdSum/p.losses, 2)} Games Rückstand je Niederlage im Schnitt · ${p.losses} Niederlagen`
    },
    // Im Monat gegen das Ligamittel desselben Monats [§C39]: der Rueckstand
    // je Niederlage allein haengt daran, wie torreich ein Monat gespielt wurde.
    // Verglichen wird mit dem mittleren Abstand in Games aller Partien, Siege wie
    // Niederlagen — der Abstand, mit dem in diesem Monat ueberhaupt
    // entschieden wurde.
    monat:{
      beiname:'Der Zähe',
      art:'koennen',
      klasse:'besonders', aus:2.13, streu:0.606, mitte:-0.0461, n0:20, echt:0,
      wie:'Gemessen wird der Rückstand in Games jeder eigenen Niederlage, gemittelt, gegen den mittleren Abstand in Games aller Partien desselben Monats. Gefragt ist, wie hoch verloren wird, und nicht wie oft.',
      stichprobe:p => p.losses,
      cond:'In den eigenen Niederlagen im Schnitt mindestens 1,25 Games knapper als der Ligaschnitt, ab 3 Niederlagen',
      ...(_stWertung(
        p => p.losses >= ST_TEIL,
        (p, c) => c.L.gameAbstand - _stMittel(p.partien.filter(s => !s.win).map(s => s.ga - s.gf)),
        1.25,
        (p, v, c) => `${komma(c.L.gameAbstand - v)} Games Rückstand je Niederlage · Liga ${komma(c.L.gameAbstand)} je Partie`))}},

  {id:'metronom', name:'Das Metronom', short:'Metronom', ic:'clock', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Taktgeber',
      art:'konstanz',
      klasse:'selten', aus:2.29, streu:0.178,
      wie:'Für jeden Spieltag steht eine Tagesquote. Gemessen wird die Spanne dazwischen.',
      stichprobe:false,
      cond:'Zwischen bestem und schwächstem Spieltag höchstens 15 Prozentpunkte, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=3,
        p=>{const q=Object.values(p.tagGrp).filter(a=>a.length>=3).map(a=>_stQuoteRoh(a));
      return -(Math.max(...q)-Math.min(...q));},
        -0.15,
        (p,v)=>`${pct(-v)} %-Punkte zwischen bestem und schwächstem Tag`))}},

  // ── DIE OFFENE KAMMER [§C35] ──────────────────────────────────────
  // Sieben Rekorde, deren Bedingung mit FUENFZIG Partien in der Laufbahn
  // erfuellbar ist. Gemessen an den echten Partien waren 13 der 21
  // bestehenden Rekorde mit lesbarer Mindestzahl fuer einen solchen Spieler
  // unerreichbar: „ab 50 Partien rechts", „ab 60 Gelegenheiten", „ab 80
  // Spielen" gehoeren dem Vielspieler, weil sie ausser ihm niemand halten
  // KANN. Die Schwellen stehen auf einem 5er-Raster — eine Bedingung ist
  // eine Absprache und keine Kalibrierung, und „ab 22 Siegen" liest sich wie
  // ein Versehen.
  // Vierzig Partien und nicht zwanzig: bei fünf bis sieben Partien je
  // Spieltag waren zwanzig drei gute Tage, und der Rekord wechselte mit
  // jeder Woche. Vierzig sind fünf bis elf Spieltage — eine Form und keine
  // Woche.
  {id:'lauf', name:'Der Lauf', short:'Lauf', ic:'formPeak', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'form', basis:REKORD_GRUNDWERT.koennen, offen:true, fenster:true,
      zeitraum:'Die letzten 40 Partien',
      mind:'20 Partien',
      wie:'Gezählt werden genau die letzten vierzig eigenen Partien, egal wann sie gespielt wurden.',
      cond:'Höchste Siegquote in den letzten 40 Partien, ab 20 Partien',
      val:p => p.l40N >= RF.lauf ? p.l40W / p.l40N : null,
      ev:(p,v) => `${Math.round(v*100)} % aus den letzten 40 Partien · ${p.l40W} Siege`
    }},

  {id:'allrounder', name:'Der Allrounder', short:'Allround', ic:'bothSides', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen,
      zeitraum:'Ganze Laufbahn, beide Seiten',
      mind:'10 Partien rechts und 10 Partien links',
      wie:'Die Leistung gegen die Elo-Erwartung, getrennt für rechts und links. Gewertet wird die schwächere der beiden Seiten: vorne steht, wer auf beiden über der Erwartung liegt.',
      cond:'Größter Abstand zur Erwartung auf der schwächeren Seite, ab 10 Partien je Seite',
      // Ohne Latte bei null: „über der Rechnung auf beiden" liess den Rekord
      // leer, sobald sein einziger Halter aufgehört hatte. Ein Rekord ist der
      // beste Wert, den es gibt [§C35]; verlangt wird nur die Stichprobe.
      val:p => (p.drvG < 10 || p.revG < 10) ? null
        : Math.min(p.drvPerf / p.drvG, p.revPerf / p.revG),
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte auf der schwächeren Seite · ${_ppZeichen(p.drvPerf/p.drvG)} rechts, ${_ppZeichen(p.revPerf/p.revG)} links`
    }},

  {id:'sturmfuehrer', name:'Der Rechtsaußen', short:'Rechts', ic:'sturmfuehrer', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, alle Partien rechts',
      mind:'10 Partien rechts',
      wie:'Die Elo-Rechnung gibt jeder Partie vorab eine Siegchance. Über alle Partien rechts gemittelt ergibt das die dort erwartete Siegquote. Gewertet wird, wie weit die tatsächliche darüber liegt, in Prozentpunkten.',
      cond:'Größter Vorsprung der Quote rechts auf die dort erwartete Siegquote, ab 10 Partien rechts',
      val:p => p.drvG >= 10 ? p.drvPerf / p.drvG : null,
      // Prozentpunkte mit ihrer Einheit, und null ohne Vorzeichen: „Punkte"
      // allein las sich wie Prestige, und „+0" stand im Rennen [§C35].
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte · ${pct(p.drvW/p.drvG)} statt ${_ppGegen(p.drvW/p.drvG, v)} % erwartet in ${p.drvG} Partien rechts`
    }},

  // ── DIE ANSPRUCHSVOLLE KAMMER [§C35] ──────────────────────────────
  // Hier darf ein Rekord verlangen, dass jemand die Frage ueber eine lange
  // Strecke beantwortet hat. Alle anderen Bedingungen gelten unveraendert:
  // der Wert bleibt ein ANTEIL oder ein Schnitt und keine Ansammlung, sonst
  // waere es wieder ein Rekord fuer den, der am meisten spielt.
  {id:'defchief', name:'Der Linksaußen', short:'Links', ic:'shieldRank', tone:'blue', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, alle Partien links',
      mind:'10 Partien links',
      wie:'Die Elo-Rechnung gibt jeder Partie vorab eine Siegchance. Über alle Partien links gemittelt ergibt das die dort erwartete Siegquote. Gewertet wird, wie weit die tatsächliche darüber liegt, in Prozentpunkten.',
      cond:'Größter Vorsprung der Quote links auf die dort erwartete Siegquote, ab 10 Partien links',
      val:p => p.revG >= 10 ? p.revPerf / p.revG : null,
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte · ${pct(p.revW/p.revG)} statt ${_ppGegen(p.revW/p.revG, v)} % erwartet in ${p.revG} Partien links`
    }},

  // Zwei Disziplinen, die nicht das NIVEAU messen, sondern den Abstand zum
  // EIGENEN [§C38]. Wer eine Quote gewinnt, gewinnt fast jede — ein Eintrag
  // auf das Niveau gehoert damit immer denselben drei Spielern. Der Abstand
  // zum Eigenen ist fuer jede Koennensklasse erreichbar: der Zehnte der
  // Siegquote kann in zehn Partien genauso weit ueber seinem eigenen Schnitt
  // liegen wie der Erste. Beide tragen beide Zeitachsen, weil dieselbe Frage
  // auf zwei Achsen in EINE Disziplin gehoert [§13.1].
  // Die Vorderseite des „Untersolls" — dieselbe Rechnung, nur andersherum.
  // Sie steht nur im Monat. Ueber die Laufbahn gemessen hielt sie, wer am
  // meisten gewinnt: die Elo beginnt jeden Monat neu und holt die Staerke
  // erst nach Wochen ein, also liegt der Starke fast jede Partie ueber
  // seiner Erwartung. Im Monat beginnen alle gleich, und der Ausschlag
  // misst, wer seine Rechnung schlaegt [§C38].
  {id:'uebersoll', name:'Das Übersoll', short:'Übersoll', ic:'sollPlus', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Überbieter',
      art:'koennen',
      // An den echten Partien gemessen: die Schwelle von 15 Punkten liegt
      // 1,57 σ ueber dem Schnitt aller je gewerteten Werte (36 Werte, Mittel
      // −0,9 Punkte, σ 10,2). Einmal gemessen und dann festgeschrieben, wie
      // bei jeder Chronik [§C39] — ein Ausschlag, der mit der Liga wandert,
      // liesse das Prestige aller bisherigen Halter sinken.
      klasse:'selten', aus:1.6, streu:0.0956, mitte:-0.00529, n0:42, echt:0.4,
      wie:'Vor jeder Partie gibt die Elo-Rechnung dem eigenen Team eine Siegchance. Ihr Mittel über den Monat ist die erwartete Siegquote. Gewertet wird, wie weit die tatsächliche Quote darüber liegt.',
      stichprobe:p => p.games,
      cond:'Mindestens 15 Prozentpunkte über der eigenen Elo-Erwartung',
      ...(_stWertung(
        p=>p.games>=8,
        p=>p.q-p.expQ,
        0.15,
        p=>`${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet`))}},

  {id:'steigerung', name:'Die Steigerung', short:'Steigerung', ic:'steigerung', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Steigende',
      art:'koennen',
      klasse:'selten', wende:true, aus:2.26, streu:0.15, mitte:0.00755, n0:11, echt:0,
      wie:'Die Spieltage des Monats werden in der Mitte geteilt und die beiden Quoten desselben Spielers verglichen.',
      stichprobe:p => (h => h ? _stH(h.n1, h.n2) : 0)(_stHaelften(p)),
      cond:'In der zweiten Hälfte des Monats mindestens 35 Prozentpunkte stärker als in der ersten, ab 4 Partien je Hälfte',
      ...(_stWertung(
        p=>_stHaelften(p)!=null,
        p=>{const h=_stHaelften(p);return h?h.q2-h.q1:null;},
        0.35,
        p=>{const h=_stHaelften(p);return `${pct(h.q2)} % in der zweiten Hälfte, ${pct(h.q1)} % in der ersten`;}))}},

  {id:'hochform', name:'Der Höhenflug', short:'Höhenflug', ic:'hochSpitze', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Aufgeblühte',
      art:'koennen',
      klasse:'selten', wende:true, aus:1.73, streu:0.187, mitte:0.0295, n0:8, echt:0.55,
      wie:'Die letzten zehn Partien des Monats gegen alle davor in diesem Monat.',
      stichprobe:p => (f => f ? _stH(10, f.vor) : 0)(_stLetzteZehn(p)),
      cond:'In den letzten 10 Partien mindestens 35 Prozentpunkte über der eigenen Quote davor, ab 20 Partien im Monat',
      ...(_stWertung(
        p=>_stLetzteZehn(p)!=null,
        p=>{const f=_stLetzteZehn(p);return f?f.d:null;},
        0.35,
        p=>{const f=_stLetzteZehn(p);return `${pct(f.drin)} % in den letzten 10, ${pct(f.raus)} % in den ${f.vor} davor`;}))},
    // Zwanzig gegen zwanzig und nicht zehn gegen zehn: zehn Partien sind
    // zwei, drei Spieltage, und jeder Wert ist ein Vielfaches von zehn
    // Prozentpunkten — drei Spieler teilten sich den Rekord mit genau +30.
    // Zwanzig sind drei bis fünf Spieltage, in Schritten von fünf Punkten.
    allzeit:{
      kammer:'form', basis:REKORD_GRUNDWERT.koennen, offen:true, fenster:true,
      zeitraum:'Die letzten 20 gegen die 20 davor',
      mind:'20 Partien',
      wie:'Die letzten zwanzig eigenen Partien gegen die zwanzig davor.',
      cond:'Größte Verbesserung der letzten 20 Partien gegenüber den 20 davor, ab 20 Partien',
      val:p => (p.hfDelta != null && p.hfDelta > 0) ? p.hfDelta : null,
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte · ${pct(p.hfNeu)} % in den letzten 20 statt ${_ppGegen(p.hfNeu, v)} % in den 20 davor`
    }},
  {id:'kaltstart', name:'Der Kaltstart', short:'Kaltstart', ic:'sunrise', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Frühstarter',
      art:'konstanz',
      klasse:'besonders', aus:2.1, streu:0.177, mitte:-0.0241, n0:6.4, echt:0.1,
      wie:'Die erste Partie jedes eigenen Spieltags gegen alle anderen dieses Tages. Ein Tag zählt ab drei Partien.',
      stichprobe:p => (b => b ? _stH(b.n, b.m) : 0)(_stErsterBall(p, 3)),
      cond:'In der ersten Partie eines Spieltags mindestens 35 Prozentpunkte stärker als in den übrigen, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>_stErsterBall(p,3)!=null,
        p=>{const s=_stErsterBall(p,3);return s?s.d:null;},
        0.35,
        p=>{const s=_stErsterBall(p,3);return `${pct(s.drin)} % in ${s.n} Startspielen, ${pct(s.raus)} % danach`;}))},
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, je Spieltag',
      mind:'6 Spieltage mit je 3 eigenen Partien',
      wie:'Für jeden eigenen Spieltag mit mindestens drei Partien wird die erste Partie mit allen übrigen dieses Tages verglichen.',
      cond:'Größter Vorsprung in der ersten Partie eines Spieltags, ab 10 Spieltagen mit je 3 Partien',
      val:p => (p.ksDelta != null && p.ksN >= 6 && p.ksDelta > 0) ? p.ksDelta : null,
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte · ${pct(p.ksDrin)} % in ${p.ksN} Startspielen, sonst ${_ppGegen(p.ksDrin, v)} %`
    }},

  // Dieselbe Frage wie der Kaltstart darueber und deshalb hier [§C35], nur
  // eine Ebene groesser: der Kaltstart misst das erste Spiel eines Abends,
  // der Wiedereinstieg das erste nach einer echten Pause. Gemessen wird der
  // Abstand der Zeitpunkte und nicht die Differenz der Kalendertage —
  // Freitagabend und Sonntagmorgen sind zwei Kalendertage und keine drei
  // Tage Pause.
  {id:'wiedereinstieg', name:'Der Wiedereinstieg', short:'Rückkehr', ic:'doorReturn', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, jede Rückkehr',
      // Vier Rückkehrspiele und nicht acht: nach sechs Tagen Pause kamen an
      // den echten Partien nur zwei Spieler auf acht, und der Rost blieb leer.
      mind:'4 Rückkehrspiele',
      wie:`Ein Rückkehrspiel ist die erste eigene Partie nach ${REKORD_PAUSE_STUNDEN} vollständigen Stunden, also ${REKORD_PAUSE_STUNDEN / 24} Tagen, ohne eigene Partie. Die Siegquote dieser Rückkehrspiele wird gegen die Siegquote aller übrigen eigenen Partien gestellt. Der Wert ist der Abstand in Prozentpunkten. Gerechnet wird mit dem Abstand der Zeitpunkte und nicht mit Kalendertagen; die allererste Partie einer Laufbahn zählt nicht mit.`,
      cond:`Größter Vorsprung in der ersten Partie nach ${REKORD_PAUSE_STUNDEN / 24} Tagen Pause gegenüber den übrigen Partien, ab 4 Rückkehrspielen`,
      val:p => (p.weDelta != null && p.weN >= 4 && pct(p.weDelta) > 0) ? p.weDelta : null,
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte · ${pct(p.weW / p.weN)} % in ${p.weN} Rückkehrspielen, sonst ${_ppGegen(p.weW / p.weN, v)} %`
    }},
  {id:'schlussball', name:'Der letzte Ball', short:'Schluss', ic:'whistle', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Nervenstarke',
      art:'konstanz',
      klasse:'besonders', aus:2.72, streu:0.189, mitte:-0.0122, n0:6.4, echt:0,
      wie:'Die letzte Partie jedes eigenen Spieltags gegen alle anderen dieses Tages. Ein Tag zählt ab drei Partien.',
      stichprobe:p => (b => b ? _stH(b.n, b.m) : 0)(_stSchlussBall(p, 3)),
      cond:'In der letzten Partie eines Spieltags mindestens 50 Prozentpunkte stärker als in den übrigen, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>_stSchlussBall(p,3)!=null,
        p=>{const s=_stSchlussBall(p,3);return s?s.d:null;},
        0.50,
        p=>{const s=_stSchlussBall(p,3);return `${pct(s.drin)} % in ${s.n} Schlussspielen, ${pct(s.raus)} % davor`;}))},
    allzeit:{
      kammer:'koennen', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Laufbahn, je Spieltag',
      mind:'6 Spieltage mit je 3 eigenen Partien',
      wie:'Für jeden eigenen Spieltag mit mindestens drei Partien wird die zeitlich letzte Partie gegen alle übrigen dieses Tages gestellt. Der Vergleich läuft innerhalb desselben Tages.',
      cond:'Größter Vorsprung in der letzten Partie eines Spieltags, ab 10 Spieltagen mit je 3 Partien',
      val:p => (p.sbDelta != null && p.sbN >= 6 && p.sbDelta > 0) ? p.sbDelta : null,
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte · ${pct(p.sbDrin)} % in ${p.sbN} Schlussspielen, sonst ${_ppGegen(p.sbDrin, v)} %`
    }},

  {id:'unstoppable', name:'Der Unaufhaltsame', short:'Serie', ic:'flameTriple', tone:'orange', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Ligageschichte',
      mind:'Ein Sieg',
      wie:'Gezählt werden Siege, die ohne Niederlage dazwischen aufeinanderfolgen, über Spieltage und Saisons hinweg. Eine Niederlage setzt die Zählung auf null.',
      cond:'Längste Siegesserie der Ligageschichte',
      unit:'Siege in Folge', min:1, raw:p => p.winStreak,
      ev:(p,v) => v === 1 ? `1 Sieg` : `${v} Siege in Folge`,
      zeit:p => p.winSpan || ''
    }},

  // Ein Abend, an dem alles saß. Braucht weder eine Laufbahn noch eine
  // Quote — nur einen guten Tag, und den kann jeder haben. Deshalb steht
  // er unter EREIGNIS und nicht unter LEISTUNG.
  {id:'peak', name:'Der höchste Gipfel', short:'Gipfel', ic:'peak', tone:'gold', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Ligageschichte',
      mind:'Eine Partie',
      wie:'Die Elo beginnt jeden Monat neu, der Gipfel ist also der höchste Stand, den je jemand innerhalb eines Monats erreicht hat. Es ist dieselbe Elo, die auch die Liga-Rangliste zeigt.',
      cond:'Höchster Elo-Stand der Ligageschichte',
      unit:'Elo', raw:p => p.peak,
      ev:(p,v) => `${Math.round(v)} Elo, nie stand jemand höher`
    }},
  // Ein einzelner Tag, an dem alles saß, gemessen an der eigenen Quote: so
  // haelt ihn nicht der, der ohnehin jeden Tag gewinnt [§C38].
  {id:'glanztag', name:'Der Glanztag', short:'Glanztag', ic:'glanztag', tone:'gold', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ein einzelner Spieltag',
      mind:'4 Partien an diesem Tag',
      wie:'Für jeden eigenen Spieltag mit mindestens fünf Partien wird die Siegquote dieses Tages gegen die eigene Siegquote der ganzen Laufbahn gestellt. Gehalten wird der Tag mit dem größten Abstand.',
      cond:'Größter Vorsprung eines Spieltags auf die eigene Siegquote, ab 4 Partien an diesem Tag',
      val:p => (p.gtDelta != null && pct(p.gtDelta) > 0) ? p.gtDelta : null,
      ev:(p,v) => `${_ppZeichen(v)} %-Punkte · ${p.gtW} von ${p.gtN} gewonnen, sonst ${_ppGegen(p.gtW / p.gtN, v)} %`,
      zeit:p => p.gtLabel || ''
    }},

  // Die Folge der Tage im Soll. „Der Tagesabschluss" fragt im Monat nach dem
  // Anteil solcher Tage; ueber die Laufbahn war genau dieser Anteil ein
  // gestrichener Rekord (`kopfhoch`), weil er die Liga wie die Siegquote
  // ordnete — die Elo beginnt jeden Monat neu, und der Starke schlaegt seine
  // Rechnung wochenlang [§C35]. Die Folge fragt etwas anderes, so wie „Der
  // Pendler" neben dem Seitenwechsler steht: nicht wie oft, sondern wie
  // lange am Stueck. Gemessen halten sie der Dritte, der Sechste und der
  // Siebte der Siegquote gemeinsam (r = 0,52). Ein Tag zaehlt wie im Monat ab
  // der ersten Partie und erst, wenn er zu ist; die Kennung ist neu, weil
  // die Karten des gestrichenen Rekords abgemeldet sind.
  {id:'sollstrecke', name:'Die Sollstrecke', short:'Strecke', ic:'sollstrecke', tone:'gold', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:REKORD_GRUNDWERT.koennen, offen:true,
      zeitraum:'Ganze Ligageschichte, Spieltag für Spieltag',
      mind:'Ein Spieltag im Soll',
      wie:'Ein Spieltag ist im Soll, wenn am Ende mindestens so viele Siege stehen, wie die Siegchancen vor den Partien dieses Tages zusammen erwarten ließen. Gezählt werden die eigenen Spieltage hintereinander, ein Tag darunter beendet die Folge. Gegen einen starken Gegner reichen weniger Siege als gegen einen schwachen.',
      cond:'Längste Folge eigener Spieltage, an denen jedes Mal mindestens so viele Siege standen, wie die Elo-Rechnung erwartet hat',
      unit:'Spieltage in Folge', min:1, raw:p => p.sollLauf,
      ev:(p,v) => `${v} ${v === 1 ? 'Spieltag' : 'Spieltage in Folge'} mindestens im Soll`,
      zeit:p => p.sollSpan || ''
    }},

  {id:'wall', name:'Der Linksverankerte', short:'Linkstreu', ic:'posReinReves', tone:'blue', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'20 Partien',
      wie:'Gezählt wird, wie oft jemand links (Revés) stand, geteilt durch alle eigenen Partien. Die Zahl sagt, wie festgelegt eine Seite ist, und nichts darüber, wie gut dort gespielt wurde.',
      cond:'Höchster Anteil links über die ganze Laufbahn, ab 20 Partien',
      val:p => p.games >= 20 ? p.revG/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien links · ${p.revG} Partien`
    }},

  {id:'sturmtreue', name:'Der Rechtstreue', short:'Rechtstreu', ic:'strikeBoot', tone:'orange', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'20 Partien',
      wie:'Gezählt wird, wie oft jemand rechts (Drive) stand, geteilt durch alle eigenen Partien. Die Zahl sagt, wie festgelegt eine Seite ist, nicht wie gut dort gespielt wurde.',
      cond:'Höchster Anteil rechts über die ganze Laufbahn, ab 20 Partien',
      val:p => p.games >= 20 ? p.drvG/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien rechts · ${p.drvG} Partien`
    }},

  {id:'switcher', name:'Der Wandler', short:'Wandler', ic:'refresh', tone:'purple', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'20 Partien',
      wie:'Gerechnet wird mit dem Seitenprofil aus dem Profil: wo jemand spielt und auf welcher Seite Siege und Games gegen die Erwartung besser sind. Gewertet wird der Abstand zu fünfzig zu fünfzig; bei genau fünfzig zu fünfzig stünde der Wert bei 100 Prozent.',
      cond:'Ausgeglichenstes Seitenprofil zwischen rechts und links, ab 20 Partien',
      val:p => {
        if(p.games < 20) return null;
        return 1 - Math.abs(positionsProfilWert(p) - 0.5) * 2;
      },
      ev:p => {
        // Dieselben Anteile wie im Profil: Drive gerundet, Revés der Rest
        // zu hundert, der Abstand ihre Differenz.
        const st = pct(positionsProfilWert(p));
        return `${Math.abs(2 * st - 100)} %-Punkte Unterschied im Seitenprofil · ${st} % Drive, ${100 - st} % Revés`;
      }
    }},

  // Wo jemand steht, entscheidet die Aufstellung und nicht das Koennen —
  // deshalb eine Bestmarke und kein Koennens-Rekord, dieselbe Kammer wie
  // „Die Mauer" und „Der Wandler" darueber [§C27].
  //
  // Beide Seiten haben ein eigenes Fenster: der Anteil rechts und der
  // Anteil links in den letzten RF.rolle Partien. Auf einem Fenster, damit die
  // Marke den Halter wechseln kann: ueber eine ganze Laufbahn mittelt sich
  // jede Rolle heraus.
  {id:'dauersturm', name:'Der Dauer-Drive', short:'Rechts fest', ic:'roleFix', tone:'orange', art:'ereignis',
    allzeit:{
      kammer:'form', basis:REKORD_GRUNDWERT.fuegung, offen:true, fenster:true,
      zeitraum:'Die letzten 25 Partien',
      mind:'25 Partien',
      wie:'Der Anteil der Partien rechts an den letzten fünfundzwanzig eigenen Partien. Wo jemand steht, entscheidet die Aufstellung; über die Stärke dort sagt die Zahl nichts.',
      cond:'Höchster Anteil rechts in den letzten 25 Partien',
      val:p => p.r50N >= RF.rolle ? p.r50Atk / p.r50N : null,
      ev:(p,v) => `${Math.round(v*100)} % rechts · ${p.r50Atk} von ${p.r50N} Partien`
    }},

  {id:'abwehrmauer', name:'Der Dauer-Revés', short:'Links fest', ic:'abwehrFenster', tone:'blue', art:'ereignis',
    allzeit:{
      kammer:'form', basis:REKORD_GRUNDWERT.fuegung, offen:true, fenster:true,
      zeitraum:'Die letzten 25 Partien',
      mind:'25 Partien',
      wie:'Der Anteil der Partien links an den letzten fünfundzwanzig eigenen Partien. Wo jemand steht, entscheidet die Aufstellung.',
      cond:'Höchster Anteil links in den letzten 25 Partien',
      val:p => p.r50N >= RF.rolle ? (p.r50N - p.r50Atk) / p.r50N : null,
      ev:(p,v) => `${Math.round(v*100)} % links · ${p.r50N - p.r50Atk} von ${p.r50N} Partien`
    }},

  {id:'seitenwechsler', name:'Der Seitenwechsler', short:'Wechsler', ic:'sideSwap', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'20 Partien',
      wie:'Geprüft wird jedes Paar aufeinanderfolgender eigener Partien: wurde zwischen rechts und links gewechselt? Gezählt wird der Anteil der Wechsel daran; bei zwanzig Partien sind es neunzehn Gelegenheiten.',
      cond:'Höchster Anteil an Seitenwechseln zwischen aufeinanderfolgenden Partien, ab 20 Partien',
      val:p => (p.games >= 20 && p.swN) ? p.swOk / p.swN : null,
      ev:(p,v) => `${Math.round(v*100)} % der Übergänge mit Seitenwechsel · ${p.swOk} von ${p.swN}`
    }},

  // Das Gegenstueck zum Seitenwechsler als Folge: dort zaehlt, WIE OFT
  // zwischen zwei Partien gewechselt wurde, hier, wie lange es ohne
  // Unterbrechung so ging. Viele verstreute Wechsel ergeben dieselbe Quote
  // wie ein langer Lauf — gemessen halten die beiden verschiedene Spieler.
  {id:'pendler', name:'Der Pendler', short:'Pendler', ic:'pendulum', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Ligageschichte',
      mind:'15 Partien',
      wie:'Rechts nach links oder links nach rechts verlängert die Folge, zweimal hintereinander dieselbe Seite beginnt sie neu. Gezählt werden Partien, nicht Wechsel, und gewechselt wird erst ab zwei Partien. Tag und Monat unterbrechen sie nicht. Wo jemand steht, entscheidet die Aufstellung.',
      cond:'Längste Folge von Partien mit jedes Mal der anderen Seite als in der Partie davor',
      unit:'Partien in Folge', min:2, raw:p => p.pdLauf,
      ev:(p,v) => `${v} Partien in Folge mit Seitenwechsel`,
      zeit:p => p.pdSpan || ''
    }},

  // Der Partner statt der Seite. Keine Sammlung: A, B, A, B sind vier
  // Partien, obwohl nur zwei Partner dabei waren — eine Decke durch die
  // Groesse der Liga gibt es damit nicht.
  {id:'wanderpass', name:'Der Wanderpass', short:'Wanderer', ic:'partnerWalk', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Ligageschichte',
      mind:'15 Partien',
      wie:'Ein anderer Partner als in der Partie davor verlängert die Folge, derselbe Partner zweimal hintereinander beginnt sie neu. Ein früherer Partner darf wiederkommen, nur nicht direkt danach, und ein Wechsel braucht zwei Partien. Wer neben wem steht, entscheidet die Auslosung.',
      cond:'Längste Folge von Partien mit jedes Mal einem anderen Partner als in der Partie davor',
      unit:'Partien in Folge', min:2, raw:p => p.wpLauf,
      ev:(p,v) => `${v} Partien in Folge mit wechselndem Partner`,
      zeit:p => p.wpSpan || ''
    }},

  {id:'seesaw', name:'Das Wechselbad', short:'Wechsel', ic:'cycle', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Ligageschichte',
      mind:'2 Partien im Wechsel',
      wie:'Sieg, Niederlage, Sieg, Niederlage und so weiter. Die Folge bricht, sobald zweimal dasselbe passiert. Das misst kein Können, nur einen unentschlossenen Tag.',
      cond:'Längste Folge aus abwechselnd Sieg und Niederlage',
      unit:'Partien im Wechsel', min:2, raw:p => p.alt,
      ev:(p,v) => `${v} Partien im ständigen Wechsel`,
      zeit:p => p.altSpan || ''
    }},

  // Das Wechselbad der Ausgangslage: nicht Sieg und Niederlage wechseln,
  // sondern Favorit und Aussenseiter. Sechs Niederlagen sind dabei genauso
  // gueltig wie sechs Siege — das Ergebnis spielt keine Rolle.
  {id:'spurwechsel', name:'Der Spurwechsel', short:'Spur', ic:'laneSwap', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Ligageschichte',
      mind:'15 Partien',
      wie:'Favorit heißt über 55 % Siegchance vor der Partie, Außenseiter unter 45 %. Die Lage dazwischen unterbricht die Folge, dieselbe Lage zweimal hintereinander beginnt sie neu, und ein Wechsel braucht zwei Partien. Wie die Rechnung eine Partie sieht, entscheidet die Aufstellung, nicht das Ergebnis.',
      cond:'Längste Folge von Partien, abwechselnd als Favorit und als Außenseiter',
      unit:'Partien in Folge', min:2, raw:p => p.spLauf,
      ev:(p,v) => `${v} Partien in Folge abwechselnd Favorit und Außenseiter`,
      zeit:p => p.spSpan || ''
    }},

  // Das 10:9 als Folge. Gefragt war das Verhaeltnis gewonnener zu verlorener
  // 10:9-Partien, und als Anteil ordnete es die Liga gemessen wie die
  // Siegquote (r = 0,86) — eine zweite Rangliste des Koennens [§C35]. Gegen
  // die Rechnung gestellt blieb ein Rauschen von wenigen Prozentpunkten. Die
  // Folge dagegen erzaehlt etwas: gehalten hat sie der Siebte der Siegquote
  // mit sieben, und die Korrelation liegt bei 0,43. Partien mit anderem
  // Ausgang dazwischen unterbrechen sie nicht, nur ein 9:10 beendet sie.
  // Eine Fuegung: wer den letzten Ball bekommt, entscheidet das Glueck so
  // sehr wie die Nerven. Gezaehlt wird mit `_stEinTorPartie`, wie „Das
  // Kaltblut" im Monat.
  {id:'eiskalt', name:'Der Eiskalte', short:'Eiskalt', ic:'eiskalt', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Ligageschichte',
      mind:'Ein Sieg im Tiebreak',
      wie:'Gezählt werden nur Partien, die im Tiebreak oder Match-Tiebreak entschieden wurden. Jeder solche Sieg verlängert die Folge, eine solche Niederlage beendet sie; Partien mit anderem Ausgang dazwischen zählen nicht und unterbrechen sie nicht. Tag und Monat unterbrechen sie ebenso wenig.',
      cond:'Längste Folge im Tiebreak gewonnener Partien, ohne eine Tiebreak-Niederlage dazwischen',
      unit:'Tiebreak-Siege in Folge', min:1, raw:p => p.eiskaltLauf,
      ev:(p,v) => v === 1 ? `1 Sieg im Tiebreak` : `${v} Siege im Tiebreak in Folge`,
      zeit:p => p.eiskaltSpan || ''
    }},

  {id:'kaltblut', name:'Das Kaltblut', short:'Kaltblut', ic:'kaltblut', tone:'purple', art:'ereignis', zufall:'quote',
    monat:{
      beiname:'Der Kaltblütige',
      art:'fuegung',
      klasse:'besonders', aus:2.01, streu:0.145, mitte:0.508, n0:9, echt:1,
      wie:'Im Tiebreak entschieden heißt: der letzte Ballwechsel hat entschieden.',
      stichprobe:p => _stEinTor(p).length,
      cond:'Mindestens 80 % der Partien gewonnen, die im Tiebreak entschieden wurden, ab 3 solchen Partien',
      ...(_stWertung(
        p=>_stEinTor(p).length>=ST_TEIL,
        p=>_stQuote(_stEinTor(p)),
        0.80,
        (p,v)=>{const a=_stEinTor(p);
          return `${_stSiege(a)} von ${a.length} Partien im Tiebreak · ${pct(v)} %`;}))},
    // Dieselbe Frage über die Laufbahn [§13.1]: Tiebreak-Siege gegen Tiebreak-
    // Niederlagen. Eine Fügung, weil der letzte Ballwechsel öfter springt als
    // entscheidet; das Gegenstück sind „Die weichen Knie" mit derselben
    // Mindestbasis.
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Laufbahn, alle im Tiebreak entschiedenen Partien',
      mind:'6 im Tiebreak entschiedene Partien',
      wie:'Gezählt werden die Zittersiege, geteilt durch alle eigenen Partien, die im Tiebreak oder Match-Tiebreak entschieden wurden. Gefragt ist, wem der letzte Ballwechsel öfter gehört.',
      cond:'Höchster Anteil an Zittersiegen unter allen im Tiebreak entschiedenen Partien, ab 6 solchen Partien',
      val:p => (p.nail + p.bitter) >= 6 ? p.nail / (p.nail + p.bitter) : null,
      ev:(p,v) => `${Math.round(v*100)} % der ${p.nail + p.bitter} Zitterpartien gewonnen · ${p.nail} zu ${p.bitter}`
    }},

  {id:'hardnight', name:'Der schwerste Tag', short:'Losglück', ic:'schwererTag', tone:'blue',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ein einzelner Spieltag',
      mind:'3 Partien am Tag',
      wie:'Gemittelt wird die Siegchance vor der Partie über alle eigenen Partien dieses Tages. Gewertet wird ab drei eigenen Partien an einem Tag, und zwar der schwerste solche Tag einer Laufbahn.',
      cond:'Niedrigste mittlere Siegchance an einem ganzen Spieltag, ab 3 Partien',
      val:p => p.hartTag != null ? -p.hartTag : null,
      ev:p => `${Math.round(p.hartTag*100)} % mittlere Siegchance über einen ganzen Spieltag`,
      zeit:p => p.hartTagLabel || ''
    },
    // Derselbe Abend im Monat [§13.1], und wie dort eine Fuegung: wer an
    // einem Tag gegen wen antritt, entscheidet die Auslosung. Gehalten haben
    // ihn in den Fixture-Monaten zwei Spieler mit einer Monatsquote unter
    // 40 %, nicht die, die ohnehin vorn stehen.
    monat:{
      beiname:'Der Leidgeprüfte',
      art:'fuegung',
      klasse:'besonders', aus:1.69, streu:0.0717, mitte:-0.421, n0:42, echt:1,
      wie:'Gemittelt wird die Siegchance vor der Partie über alle eigenen Partien eines Spieltags, ab drei Partien an diesem Tag. Gewertet wird der schwerste solche Tag des Monats.',
      stichprobe:p => p.games,
      cond:'Ein Spieltag mit höchstens 30 % mittlerer Siegchance, ab 3 Partien an diesem Tag',
      ...(_stWertung(
        p => Object.values(p.tagGrp).some(a => a.length >= 3),
        p => -Math.min(...Object.values(p.tagGrp).filter(a => a.length >= 3).map(a => _stSoll(a) / a.length)),
        -0.30,
        (p, v) => `${pct(-v)} % mittlere Siegchance über einen ganzen Spieltag`))}},

  {id:'mirrorday', name:'Der Wiedergänger', short:'Déjà-vu', ic:'duplicate', tone:'blue',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ein einzelner Spieltag',
      mind:'2 gleiche Ergebnisse an einem Tag',
      wie:'Gezählt wird, wie oft dasselbe Ergebnis an einem Spieltag aus eigener Sicht und in derselben Richtung vorkam. Verglichen wird Satz für Satz: ein 6:4 und ein 4:6 sind zwei verschiedene Ergebnisse, ein 6:4 und ein 6:4 6:2 ebenso.',
      cond:'Häufigste Wiederholung desselben Ergebnisses an einem Spieltag',
      val:p => p.wiederTag >= 2 ? p.wiederTag : null,
      ev:p => `${p.wiederTag}× dasselbe Ergebnis ${p.wiederErg} an einem Tag`,
      zeit:p => p.wiederLabel || ''
    }},

  {id:'needleeye', name:'Das Nadelöhr', short:'Nadelöhr', ic:'needleEye', tone:'acid',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'20 Partien',
      wie:'Der Anteil der eigenen Partien, die im Tiebreak oder Match-Tiebreak entschieden wurden. Knapp gewonnen und knapp verloren zählen gleich.',
      cond:'Höchster Anteil an im Tiebreak entschiedenen Partien, ab 20 Partien',
      val:p => p.games >= 20 ? (p.nail + p.bitter)/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien im Tiebreak entschieden · ${p.nail + p.bitter} Stück`
    }},

  {id:'evenkeel', name:'Die Punktlandung', short:'Landung', ic:'scaleBalance', tone:'gold',
    art:'ereignis', zufall:'fund',
    monat:{
      beiname:'Der Ausbalancierte',
      art:'konstanz',
      klasse:'besonders', aus:0.88, streu:0.397,
      wie:'Gewonnene und abgegebene Games über den ganzen Monat, umgerechnet auf 10 Partien. Je näher beide beieinander liegen, desto besser; zwischen einem und fünf Games Abstand liegt dabei mehr als zwischen fünf und zehn.',
      stichprobe:false,
      cond:'Am Monatsende höchstens 5 Games Differenz, auf 10 Partien gerechnet, ab 8 Partien'
,
      // Die Untergrenze ist ein halbes Game und nicht eins: mit eins stand
      // ein 60:60 gleichauf mit 60:59 [§C39]. Gerechnet auf 10 Partien, etwa
      // den Median der Spielzahl im Monat: eine Game-Differenz ist eine Summe,
      // und ihr Zufall wächst mit der Wurzel der Partien. Ohne das hinge die
      // Chronik an der Spielzahl — wer wenig spielt, landete leicht.
      ...(_stWertung(
        p=>p.games>=8,
        p=>-Math.log10(Math.max(Math.abs(p.gf-p.ga)*Math.sqrt(10/p.games),0.5)),
        -Math.log10(5),
        p=>`${p.gf}:${p.ga} Games nach ${p.games} Partien`
          + (p.games !== 10 ? ` · auf 10 Partien ${komma(Math.abs(p.gf-p.ga)*Math.sqrt(10/p.games), 1)} Games` : '')))},
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung,
      zeitraum:'Ein einzelner Spieltag',
      mind:'3 Partien am Tag',
      wie:'Am Ende des Spieltags stehen gewonnene und abgegebene Games exakt gleich. Je mehr Partien an diesem Tag, desto unwahrscheinlicher: gewertet wird der größte solche Tag, nicht die Zahl solcher Tage.',
      cond:'Größter Spieltag mit exakt ausgeglichenem Game-Konto, ab 3 Partien am Tag',
      val:p => p.gleichTag >= 3 ? p.gleichTag : null,
      ev:p => `${p.gleichTag} Partien an einem Tag, ${p.gleichTore}:${p.gleichTore} Games`,
      zeit:p => p.gleichLabel || ''
    }},

  {id:'rollercoaster', name:'Die Achterbahn', short:'Achterbahn', ic:'coasterDip', tone:'orange',
    art:'ereignis', zufall:'fund',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung,
      zeitraum:'Ein einzelner Spieltag',
      mind:'Beide Ergebnisse am selben Tag',
      wie:'Ein Bagel gewonnen (6:0) und einer kassiert (0:6) am selben Spieltag. Gezählt wird, an wie vielen Tagen das zusammenkam. Beides braucht den passenden Gegner, nicht die passende Form.',
      cond:'Ein 6:0 und ein 0:6 am selben Spieltag',
      val:p => p.beidesTag >= 1 ? p.beidesTag : null,
      ev:p => `${p.beidesTag}× ein 6:0 und ein 0:6 am selben Tag`,
      zeit:p => p.beidesLabel || ''
    }},

  {id:'fluke', name:'Der Sonntagsschuss', short:'Coup', ic:'surprise', tone:'orange', art:'ereignis', zufall:'quote',
    // Auch als Monatswertung: eine einzige Partie genuegt, und die Rechnung
    // stand dagegen. Gemessen ueber die bisherigen Monate ging sie an Platz
    // sieben und Platz zehn der Siegquote — an Leute, die von den Eintraegen,
    // die am Koennen haengen, keinen bekommen.
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Eine einzelne Partie',
      mind:'Eine gewonnene Partie',
      wie:'Die Elo-Rechnung gibt jeder Partie vor der Partie eine Siegchance. Gewertet wird der gewonnene Auftritt mit der niedrigsten davon. Eine einzige Partie genügt, und die Rechnung stand dagegen.',
      cond:'Gewonnene Partie mit der niedrigsten vorherigen Siegchance',
      val:p => p.flukeExp != null ? -p.flukeExp : null,
      ev:p => `${Math.round(p.flukeExp*100)} % Siegchance und trotzdem gewonnen`,
      zeit:p => p.flukeLabel || ''
    }},

  {id:'ausbruch', name:'Der Ausbruch', short:'Ausbruch', ic:'lock', tone:'purple', art:'ereignis',
    // Keine Laufbahn-Achse: dieselbe Zählung über die ganze Ligageschichte
    // ist „Der Stammkunde" unter den Schattenseiten. Als Fügung stand hier
    // ein Rekord, der mit dem Grundwert einer Fügung Prestige dafür gab,
    // siebzehnmal in Folge gegen denselben Gegner verloren zu haben. Im
    // Monat zählt der Bruch, und der ist eine Wende [§C39]; über die
    // Laufbahn bleibt die Serie, und die ist eine Kehrseite [§C35].
    monat:{
      beiname:'Der Befreite',
      art:'fuegung',
      klasse:'selten', wende:true, aus:2.14, streu:3.88,
      wie:'Gegen manche läuft es über Monate nicht. Gezählt wird die längste Pleitenserie gegen einen Gegner, die in diesem Monat gebrochen wurde.',
      stichprobe:false,
      cond:'Einen Gegner besiegt, gegen den zuvor 15 Duelle in Folge verloren gingen',
      ...(_stWertung(
        p=>true,
        (p,c)=>p.bannLauf,
        15,
        (p,v)=>`nach ${v} Pleiten in Folge gegen denselben Gegner wieder gewonnen`))}},

  // Das Gegenstueck zum Ausbruch von der anderen Seite: nicht die eigene
  // Pleitenserie endet, sondern die Siegesserie eines Gegners. Gezaehlt
  // wird die Laenge der einen beendeten Serie, und die hat der Gegner
  // gespielt — deshalb eine Fuegung und keine Bestmarke.
  {id:'serienstopp', name:'Der Serienstopp', short:'Stopp', ic:'handStop', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Eine einzelne Partie',
      mind:'Ein Sieg gegen einen Gegner in Serie',
      wie:'Vor jeder Partie steht für beide Gegner fest, wie viele Siege sie gerade in Folge tragen. Gewinnt das eigene Team, ist die längere der beiden Serien beendet. Gewertet wird die längste so beendete Serie, nicht die Zahl solcher Siege und nicht die Summe beider Gegner.',
      cond:'Längste Siegesserie eines Gegners, die mit einem eigenen Sieg endete',
      val:p => p.stoppMax > 0 ? p.stoppMax : null,
      ev:(p,v) => `${v} Siege in Folge beim Gegner, mit einem eigenen Sieg beendet`,
      zeit:p => p.stoppLabel || ''
    }},

  // ── Gleichmaessigkeit: drei Fuegungen, kein Koennen [§C35] ────────
  // Wer die geringste Streuung hat, ist nicht der Beste — er ist der, bei dem
  // jede Partie gleich aussieht. Das zeichnet niemanden aus, es kann jemandem
  // gehoeren, und deshalb stehen die drei als `ereignis` in der Kammer der
  // Fuegungen und wiegen fuers Prestige halb so viel wie ein Beleg fuer eine
  // Faehigkeit [§C34]. `konstanz` gibt es dafuer nicht: das ist eine Art der
  // MONATSCHRONIK [§C39], und ein ungueltiger Wert faellt hier still auf
  // `ereignis` zurueck.
  // rechts und links sind ein PAAR, so wie „Der komplette Stürmer" und „Der
  // komplette Verteidiger". Eine dritte Fassung derselben Frage auf einer
  // dritten Teilmenge waere die Haeufung, die §C35 verbietet — „gegen den
  // Rest der Liga" ist der Gegnerkreis und keine Rolle, und gemessen halten
  // die drei drei verschiedene Spieler.
  {id:'unruffled', name:'Der Unaufgeregte', short:'Ruhe', ic:'flatWave', tone:'acid',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:REKORD_GRUNDWERT.fuegung, offen:true,
      zeitraum:'Ganze Laufbahn, ausgeglichen angesetzte Partien',
      mind:'20 Partien mit 35 bis 65 % Siegchance',
      wie:'Ausgeglichen angesetzt heißt: die Elo-Rechnung gab dem eigenen Team vor der Partie zwischen 35 und 65 Prozent. Gewertet wird die Streuung der Game-Differenzen in genau diesen Partien, niedrig ist besser. Über das Niveau sagt die Zahl nichts.',
      cond:'Gleichmäßigste Game-Differenz in ausgeglichen angesetzten Partien, ab 20 solchen Partien',
      val:p => (p.ausgSd != null && p.ausgN >= 20) ? -p.ausgSd : null,
      ev:p => `${komma(p.ausgSd)} Games Streuung in ${p.ausgN} offen angesetzten Partien`
    }},

  // Zwei Fuegungen, die von der AUSLOSUNG leben: wen jemand als Partner
  // bekommt, entscheidet er nicht selbst. Der Katalog fragt bei „Der Klotz am
  // Bein" und „Der Wegbereiter" nach der WIRKUNG eines Partners; nach seiner
  // STAERKE fragt nichts.
  //
  // Gerechnet wird gegen das EIGENE Mittel und nicht gegen das der Liga. Wer
  // selbst der Beste ist, kann nie mit sich selbst spielen: sein Partnerfeld
  // ist zwangslaeufig das schwaechste der Liga, und gemessen lag diese
  // Fassung bei r = −0,66 mit der eigenen Siegquote — damit waere die Fuegung
  // eine zweite Rangliste des Koennens gewesen [§C38]. Gegen das Eigene
  // gerechnet faellt der Effekt weg: gemessen −0,09.
  //
  // Beide lesen DASSELBE Feld, eines mit Plus und eines mit Minus. Zwei
  // Rechnungen fuer dieselbe Frage waeren eine zu viel [§C27].
  //
  // `paar` sagt, dass die beiden die zwei ENDEN eines Werts sind. Fuer eine
  // Quoten-Fuegung verlangt `tests/disziplinen` sonst, dass mindestens die
  // halbe Liga im Rennen steht — gegen eine zu hohe Schwelle. Ein Vorzeichen
  // ist aber keine Schwelle: es teilt das Feld, und gemessen standen fuenf
  // ueber und sechs unter dem eigenen Mittel. Gepruefft wird deshalb das
  // Paar: zusammen muessen die beiden Rennen die halbe Liga tragen, und wer
  // die Mindestzahl erfuellt, steht in einem von beiden.
  {id:'tailwind', name:'Der Rückenwind', short:'Rückenwind', ic:'windBack', tone:'acid',
    art:'ereignis', zufall:'quote', paar:'solorun',
    allzeit:{
      kammer:'form', basis:REKORD_GRUNDWERT.fuegung, fenster:true,
      zeitraum:'Die letzten 25 gegen die 25 davor',
      mind:'25 Partien',
      wie:'Für jede Partie zählt die Elo des Partners, wie sie unmittelbar vor der Partie stand. Gemittelt über die letzten 25 Partien und über die 25 davor; gewertet wird der Anstieg. Über die eigene Leistung sagt die Zahl nichts.',
      cond:'Größter Anstieg der Partnerstärke in den letzten 25 Partien, ab 25 Partien',
      val:p => (p.rwDelta != null && p.rwDelta > 0) ? p.rwDelta : null,
      ev:(p,v) => `+${Math.round(v)} Elo stärkere Partner · ${_stElo(p.rwNeu)} statt ${_stElo(p.rwAlt)} Elo`
    }},

  {id:'solorun', name:'Der Einzelkämpfer', short:'Alleingang', ic:'soloPath', tone:'blue',
    art:'ereignis', zufall:'quote', paar:'tailwind',
    allzeit:{
      kammer:'form', basis:REKORD_GRUNDWERT.fuegung, fenster:true,
      zeitraum:'Die letzten 25 gegen die 25 davor',
      mind:'25 Partien',
      wie:'Für jede Partie zählt die Elo des Partners vor der Partie. Gemittelt über die letzten 25 Partien und über die 25 davor; gewertet wird der Rückgang. Über die eigene Leistung sagt die Zahl nichts.',
      cond:'Größter Rückgang der Partnerstärke in den letzten 25 Partien, ab 25 Partien',
      val:p => (p.rwDelta != null && p.rwDelta < 0) ? -p.rwDelta : null,
      ev:(p,v) => `${Math.round(v)} Elo schwächere Partner · ${_stElo(p.rwNeu)} statt ${_stElo(p.rwAlt)} Elo`
    }},

  {id:'drought', name:'Die Durststrecke', short:'Flaute', ic:'trendCrash', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Gestrandete',
      art:'schatten',
      klasse:'schatten', aus:1.99, streu:2.54,
      wie:'Die längste Pleitenserie des Monats.',
      stichprobe:false,
      cond:'10 Niederlagen am Stück',
      ...(_stWertung(
        p=>true,
        p=>{let l=0,b=0;p.partien.forEach(s=>{if(s.win)l=0;else{l++;b=Math.max(b,l);}});return b;},
        10,
        (p,v)=>v === 1 ? `1 Niederlage` : `${v} Niederlagen in Folge`))},
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Ligageschichte',
      mind:'Eine Niederlage',
      wie:'Gezählt werden Niederlagen, die ohne Sieg dazwischen aufeinanderfolgen, über Spieltage und Saisons hinweg. Ein Sieg setzt die Zählung auf null.',
      cond:'Längste Niederlagenserie der Ligageschichte',
      min:1, raw:p => p.lossStreak,
      ev:(p,v) => v === 1 ? `1 Niederlage` : `${v} Niederlagen in Folge`,
      zeit:p => p.lossSpan || ''
    }},

  {id:'abyss', name:'Das Fass ohne Boden', short:'Debakel', ic:'dizzy', tone:'red', art:'schatten',
    // Dieselbe Frage auf zwei Zeitachsen gehoert in EINE Disziplin [§13.1].
    monat:{
      beiname:'Der Eingebrochene',
      art:'schatten',
      klasse:'schatten', aus:2.55, streu:0.0319, mitte:0.0194, n0:20, echt:0.1,
      wie:'Zu Null verloren heißt: kein Satz gewonnen, bei mindestens zwei Sätzen (0:2, 0:3). Gezählt wird ihr Anteil an den eigenen Niederlagen des Monats: es zählt, wie hoch verloren wird, nicht wie oft.',
      stichprobe:p => p.losses,
      cond:'Mindestens 40 % der eigenen Pleiten zu Null, ab 3 Pleiten',
      ...(_stWertung(
        p => p.losses >= ST_TEIL,
        p => p.debacle / p.losses,
        0.40,
        (p, v) => `${pct(v)} % aller ${p.losses} Pleiten zu Null · ${p.debacle} Stück`))},
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Laufbahn, alle Niederlagen',
      mind:'12 Niederlagen',
      wie:'Gezählt werden die Niederlagen zu Null (kein Satz gewonnen, mindestens zwei Sätze), geteilt durch alle eigenen Niederlagen. Es zählt, wie hoch verloren wird, nicht wie oft.',
      cond:'Höchster Anteil an Niederlagen zu Null unter allen eigenen Niederlagen, ab 12 Niederlagen',
      val:p => p.losses >= 12 ? p.debacle/p.losses : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.losses} Niederlagen zu Null · ${p.debacle} Stück`
    }},

  {id:'hardluck', name:'Der Pechvogel', short:'Pechvogel', ic:'pille', tone:'red', art:'schatten',
    // Dieselbe Frage auf zwei Zeitachsen gehoert in EINE Disziplin [§13.1].
    monat:{
      beiname:'Der Unglückliche',
      art:'schatten',
      klasse:'schatten', aus:1.54, streu:0.0759, mitte:0.131, n0:20, echt:0,
      wie:'Eine im Tiebreak verlorene Partie ist die knappste mögliche Niederlage. Gezählt wird ihr Anteil an allen eigenen Niederlagen, nicht an den knappen Partien.',
      stichprobe:p => p.losses,
      cond:'Mindestens 25 % der eigenen Pleiten im Tiebreak, ab 3 Pleiten',
      ...(_stWertung(
        p => p.losses >= ST_TEIL,
        p => p.bitter / p.losses,
        0.25,
        (p, v) => `${pct(v)} % aller ${p.losses} Pleiten im Tiebreak · ${p.bitter} davon`))},
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Laufbahn, alle Niederlagen',
      mind:'12 Niederlagen',
      wie:'Gezählt werden die im Tiebreak verlorenen Partien, geteilt durch alle eigenen Niederlagen.',
      cond:'Höchster Anteil an Tiebreak-Niederlagen unter allen eigenen Niederlagen, ab 12 Niederlagen',
      val:p => p.losses >= 12 ? p.bitter/p.losses : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.losses} Niederlagen im Tiebreak · ${p.bitter} Stück`
    }},

  // Das Gegenstück zum Kaltblut [§C35]: wer die Zitterpartien verliert.
  // Der Pechvogel darüber teilt die Tiebreak-Niederlagen durch alle eigenen
  // Pleiten und fragt, wie jemand verliert; hier ist der Nenner die
  // Tiebreak-Partie selbst, und gefragt ist, wem der letzte Ballwechsel
  // gehört. Im Monat ist es das Gegenstück zum „Kaltblut", mit derselben
  // Schwelle: achtzig Prozent.
  {id:'weicheknie', name:'Die weichen Knie', short:'Knie', ic:'weicheKnie', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Wankende',
      art:'schatten',
      klasse:'schatten', aus:2.12, streu:0.145, mitte:0.492, n0:9, echt:1,
      wie:'Im Tiebreak entschieden heißt: der letzte Ballwechsel hat entschieden. Gezählt werden die Niederlagen darunter.',
      stichprobe:p => _stEinTor(p).length,
      cond:'Mindestens 80 % der Partien verloren, die im Tiebreak entschieden wurden, ab 3 solchen Partien',
      ...(_stWertung(
        p => _stEinTor(p).length >= ST_TEIL,
        p => 1 - _stQuote(_stEinTor(p)),
        0.80,
        (p, v) => { const a = _stEinTor(p);
          return `${a.length - _stSiege(a)} von ${a.length} Partien im Tiebreak verloren · ${pct(v)} %`; }))},
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Laufbahn, alle im Tiebreak entschiedenen Partien',
      mind:'6 im Tiebreak entschiedene Partien',
      wie:'Gezählt werden die Tiebreak-Niederlagen, geteilt durch alle eigenen Partien, die im Tiebreak oder Match-Tiebreak entschieden wurden.',
      cond:'Höchster Anteil an Tiebreak-Niederlagen unter allen im Tiebreak entschiedenen Partien, ab 6 solchen Partien',
      val:p => (p.nail + p.bitter) >= 6 ? p.bitter / (p.nail + p.bitter) : null,
      ev:(p,v) => `${Math.round(v*100)} % der ${p.nail + p.bitter} Zitterpartien verloren · ${p.nail} zu ${p.bitter}`
    }},

  {id:'freefall', name:'Der Sturzflug', short:'Sturzflug', ic:'sturzflug', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Von einem Saisonende zum nächsten',
      mind:'6 Partien in beiden Saisons',
      wie:'Verglichen werden die Elo-Endstände zweier aufeinanderfolgender Saisons, in denen jeweils mindestens zehn Partien gespielt wurden. Gewertet wird der größte Rückgang.',
      cond:'Größter Elo-Verlust von einem Saisonende zum nächsten, ab 10 Partien in beiden Saisons',
      val:p => (p.fall && p.fall.d < 0) ? -p.fall.d : null,
      ev:p => `${_stElo(p.fall.d)} Elo von ${p.fall.from} auf ${p.fall.to}`,
      zeit:p => p.fall ? p.fall.to : ''
    }},

  {id:'angstgegner', name:'Der Angstgegner', short:'Angst', ic:'ghost', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Geplagte',
      art:'schatten',
      klasse:'schatten', aus:1.96, streu:0.183, mitte:-0.358, n0:16, echt:0,
      wie:'Der Gegner, gegen den im Monat am wenigsten zu holen war, ab zehn Duellen.',
      stichprobe:p => p._ag ? p._ag.n : 0,
      cond:'Gegen einen Gegner mit mindestens 10 Duellen keinen einzigen Sieg',
      ...(_stWertung(
        p=>Object.values(p.gegnerGrp).some(a=>a.length>=6),
        p=>{let b=null;Object.keys(p.gegnerGrp).forEach(g=>{const d=p.gegnerGrp[g];if(d.length<6)return;
      const q=_stQuoteRoh(d);if(!b||q<b.q)b={q,g,n:d.length,w:_stSiege(d)};});
      p._ag=b;return b?-b.q:null;},
        0,
        p=>`${p._ag.w} von ${p._ag.n} gegen ${pname(p._ag.g)}`))},
    // Dieselbe Frage ueber die ganze Laufbahn [§13.1]. Zwanzig Duelle statt
    // zehn: was ein Monat als Serie zeigt, muss eine Laufbahn als Muster
    // zeigen. Gezaehlt wird gegen die Duelle gegen GENAU diesen Gegner und
    // nicht gegen alle Partien [§C37].
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Laufbahn, je Gegner',
      mind:'10 Duelle gegen denselben Gegner',
      wie:'Für jeden Gegner mit mindestens zwanzig Duellen steht der eigene Niederlagenanteil gegen genau diesen Gegner. Gewertet wird der höchste davon.',
      cond:'Höchster Niederlagenanteil gegen einen einzelnen regelmäßigen Gegner, ab 10 Duellen',
      val:p => p.angstQ != null ? 1 - p.angstQ : null,
      ev:p => `${Math.round((1-p.angstQ)*100)} % der ${p.angstN} Duelle gegen einen einzelnen Gegner verloren · ${p.angstN - p.angstW} Pleiten`
    }},

  // Der Angstgegner als Folge statt als Anteil: wie oft in Folge gegen
  // denselben Gegner verloren wurde, bevor ein Sieg gegen genau diesen
  // Gegner gelang. Dieselbe Zählung wie die Monatschronik „Der Ausbruch"
  // (`bannMax`), aber nicht dieselbe Frage: dort zählt der Bruch, und der ist
  // eine Wende [§C39]; hier bleibt die Serie, und die ist eine Kehrseite.
  // Sie stand als Fügung unter dem Namen des Ausbruchs und gab dem Prestige
  // [§C34] den Grundwert einer Fügung für siebzehn Niederlagen in Folge.
  // Gewertet wird erst nach dem Sieg, wie bisher: vorher steht nicht fest,
  // wie lang die Serie wird.
  {id:'stammkunde', name:'Der Stammkunde', short:'Stammkunde', ic:'stammkunde', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten, offen:true,
      zeitraum:'Ganze Ligageschichte, je Gegner',
      mind:'Ein Sieg nach einer Niederlage gegen denselben Gegner',
      wie:'Je Gegner werden die direkten Niederlagen in Folge gezählt, bis ein Sieg gegen genau diesen Gegner gelingt. Partien gegen andere Gegner dazwischen unterbrechen die Zählung nicht. Gewertet wird die Serie erst mit diesem Sieg, vorher steht nicht fest, wie lang sie wird.',
      cond:'Die meisten Niederlagen in Folge gegen einen einzelnen Gegner, bis ein Sieg gegen genau diesen Gegner gelang',
      val:p => p.bannMax > 0 ? p.bannMax : null,
      ev:(p,v) => `${v} Niederlagen in Folge gegen denselben Gegner bis zum nächsten Sieg`,
      zeit:p => p.bannLabel || ''
    }},

  // Das Gegenstück zum Bannbrecher: gegen den Gegner, gegen den es in der
  // Laufbahn am besten lief, im Monat schwächer als davor. Der Angstgegner
  // darüber fragt nach einem Gegner ohne Sieg; hier zählt der Abstand zur
  // eigenen Geschichte gegen ihn, nicht das Niveau.
  {id:'retourkutsche', name:'Die Retourkutsche', short:'Retour', ic:'retourkutsche', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Entzauberte',
      art:'schatten',
      klasse:'schatten', aus:1.85, streu:0.139, mitte:0.0936, n0:6, echt:1,
      wie:'Gewertet wird der Gegner, gegen den die eigene Laufbahn vor diesem Monat am besten aussah, unter denen mit mindestens zehn Duellen davor, vier Duellen im Monat und einer Quote über der eigenen Laufbahnquote. Verglichen wird die Quote gegen diesen Gegner in diesem Monat mit der Quote gegen denselben Gegner davor.',
      stichprobe:(p, C) => (x => x ? _stH(x.mn, x.kn) : 0)(_stDuellWende(p, C, 1)),
      cond:'Gegen den liebsten Gegner der Laufbahn mindestens 35 Prozentpunkte schwächer als davor, ab 10 Duellen davor, 4 im Monat und 30 Partien in der Laufbahn',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && _stDuellWende(p, C, 1) != null,
        (p, C) => { const x = _stDuellWende(p, C, 1); return x.kq - x.mq; },
        0.35,
        (p, v, C) => { const x = _stDuellWende(p, C, 1);
          return `${_ppLage(v, 'unter', 'über')} der Laufbahn gegen ${pname(x.fid)} · ${x.mw} von ${x.mn} Duellen, davor ${pct(x.kq)} % in ${x.kn}`; }))}},

  // Das Gegenstück zum Stammduell: gegen den häufigsten Gegner des Monats so
  // selten gewonnen, wie es die Rechnung kaum erwartete. Der Angstgegner
  // fragt nach einem Gegner ohne einen Sieg, gleich wie stark er ist.
  {id:'uebermacht', name:'Die Übermacht', short:'Übermacht', ic:'uebermacht', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Unterlegene',
      art:'schatten',
      klasse:'schatten', aus:3.47, streu:0.408,
      wie:'Gewertet wird der Gegner mit den meisten Duellen im Monat. Aus den Siegchancen aller Duelle gegen diesen Gegner folgt, wie wahrscheinlich höchstens so wenige Siege waren.',
      stichprobe:false,
      cond:'Gegen den häufigsten Gegner des Monats so selten gewonnen, wie es die Rechnung mit höchstens 2 % erwartet hat, ab 6 Duellen',
      ...(_stWertung(
        p => { const r = _stRivale(p); return !!r && r.a.length >= 6; },
        p => _stUnwahr(_stRivale(p).a, true),
        1.6989700043360187,
        (p, v) => { const r = _stRivale(p);
          return `${_stSiege(r.a)} von ${r.a.length} Duellen gegen ${pname(r.fid)} · so wenige gab die Rechnung zu ${komma(Math.pow(10, -v) * 100, 1)} %`; }))}},

  {id:'untersoll', name:'Das Untersoll', short:'Untersoll', ic:'sollMinus', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Gehemmte',
      art:'schatten',
      klasse:'schatten', aus:2.07, streu:0.0956, mitte:0.00529, n0:42, echt:0.4,
      wie:'Vor jeder Partie gibt die Elo-Rechnung dem eigenen Team eine Siegchance. Ihr Mittel über den Monat ist die erwartete Siegquote. Gewertet wird, wie weit die tatsächliche Quote darunter liegt.',
      stichprobe:p => p.games,
      cond:'Mindestens 20 Prozentpunkte unter der eigenen Elo-Erwartung',
      ...(_stWertung(
        p=>p.games>=8,
        p=>p.expQ-p.q,
        0.2,
        p=>`${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet`))},
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Laufbahn',
      mind:'20 Partien',
      wie:'Vor jeder Partie gibt die Elo-Rechnung dem eigenen Team eine Siegchance. Ihr Mittel über die Laufbahn ist die erwartete Siegquote. Gewertet wird, wie weit die tatsächliche Quote darunter liegt.',
      cond:'Größter Rückstand der Siegquote auf die eigene Elo-Erwartung, ab 20 Partien',
      val:p => {
        if(p.games < 20) return null;
        const d = (p.expSum/p.games) - (p.wins/p.games);
        return d > 0 ? d : null;
      },
      ev:(p,v) => `${_ppLage(v, 'unter', 'über')} der Rechnung · ${pct(p.wins/p.games)} statt ${_ppGegen(p.wins/p.games, -v)} % in ${p.games} Partien`
    }},

  // ── Vier neue Schanden [§C35] ────────────────────────────────────
  // Jede fragt nach dem ABSTAND ZUM EIGENEN oder gegen eine Teilmenge, nicht
  // nach dem Niveau. Eine Schande, die das Niveau misst, gehoert immer
  // demselben Spieler: gemessen hielt der Zehnte der Siegquote sechs von elf
  // Haltungen der Schandtafel, sobald die Kandidaten das reine Niveau
  // fragten. Dieselbe Begruendung wie bei der Chronik fuer die Mitte des
  // Feldes [§C38].
  {id:'noanswer', name:'Die stumme Antwort', short:'Stumm', ic:'mutedReply', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Verstummte',
      art:'schatten',
      klasse:'schatten', aus:2.28, streu:0.136, mitte:-0.0623, n0:11, echt:0,
      wie:'Die Partien direkt nach einer eigenen Niederlage gegen alle übrigen eigenen Partien des Monats.',
      stichprobe:p => _stH(_stNachPleite(p).length, p.games - _stNachPleite(p).length),
      cond:'Direkt nach einer Niederlage mindestens 25 Prozentpunkte schwächer als sonst, ab 3 solchen und 3 übrigen Partien',
      ...(_stWertung(
        p => _stNachPleite(p).length >= ST_TEIL && p.games - _stNachPleite(p).length >= ST_TEIL,
        p => { const a = _stNachPleite(p), r = p.partien.filter((s, i) => !(i > 0 && !p.partien[i - 1].win));
          return _stQuoteRoh(r) - _stQuoteRoh(a); },
        0.25,
        p => { const a = _stNachPleite(p);
          return `${_stSiege(a)} von ${a.length} Partien nach einer Niederlage gewonnen`; }))},
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Laufbahn',
      mind:'12 Partien direkt nach einer Niederlage',
      wie:'Die Siegquote direkt nach einer eigenen Niederlage gegen die Siegquote in allen übrigen eigenen Partien. Gewertet wird der Einbruch.',
      cond:'Größter Einbruch direkt nach einer Niederlage, ab 25 Gelegenheiten',
      val:p => {
        if(p.afterLossOpp < 12) return null;
        const rest = p.games - p.afterLossOpp;
        if(rest < 1) return null;
        const d = (p.wins - p.afterLoss)/rest - p.afterLoss/p.afterLossOpp;
        return d > 0 ? d : null;
      },
      ev:(p,v) => `${_ppLage(v, 'weniger', 'mehr')} nach einer Pleite · ${pct(p.afterLoss/p.afterLossOpp)} statt ${_ppGegen(p.afterLoss/p.afterLossOpp, -v)} % sonst`
    }},

  {id:'favflop', name:'Der Wackelkandidat', short:'Wackel', ic:'wobbleStep', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Laufbahn, alle Favoritenspiele',
      mind:'10 Partien als Favorit',
      wie:'Favorit heißt: die Elo-Rechnung gab dem eigenen Team vor der Partie mehr als 55 Prozent Siegchance. Gewertet wird der Niederlagenanteil in genau diesen Partien.',
      cond:'Höchster Niederlagenanteil als Favorit, ab 10 Partien als Favorit',
      val:p => p.favN >= 10 ? p.favL/p.favN : null,
      ev:(p,v) => `${Math.round(v*100)} % der ${p.favN} Favoritenspiele verloren · ${p.favL} Niederlagen`
    },
    // Derselbe Anteil im Monat [§13.1], mit der Teilmengen-Grenze der
    // Monatschronik statt der zwanzig Favoritenspiele der Laufbahn.
    monat:{
      beiname:'Der Favoritenpatzer',
      art:'schatten',
      klasse:'schatten', aus:1.91, streu:0.108, mitte:0.312, n0:17, echt:0,
      wie:'Favorit heißt über 55 % Siegchance vor der Partie. Gewertet wird der Niederlagenanteil in genau diesen Partien.',
      stichprobe:p => p.partien.filter(_stFavorit).length,
      cond:'Mindestens 50 % der Partien als Favorit verloren, ab 4 solchen Partien',
      ...(_stWertung(
        p => p.partien.filter(_stFavorit).length >= 4,
        p => { const f = p.partien.filter(_stFavorit); return 1 - _stQuoteRoh(f); },
        0.50,
        p => { const f = p.partien.filter(_stFavorit);
          return `${f.length - _stSiege(f)} von ${f.length} Partien als Favorit verloren`; }))}},

  {id:'ballast', name:'Der Klotz am Bein', short:'Klotz', ic:'dragWeight', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten,
      zeitraum:'Ganze Laufbahn, je Partner',
      mind:'3 Partner mit je 8 gemeinsamen Partien',
      wie:'Für jeden Partner wird die gemeinsame Siegquote mit der aus allen übrigen Partien dieses Partners verglichen. Gewertet wird der Rückgang, gemittelt über alle Partner und gewichtet nach den gemeinsamen Partien.',
      cond:'Größter negativer Einfluss auf die eigenen Partner, ab 3 Partnern mit je 15 gemeinsamen Partien',
      val:p => (p.einflussN >= 3 && p.einflussD != null && p.einflussD < 0) ? -p.einflussD : null,
      ev:(p,v) => `${Math.abs(Math.round(v*100))} %-Punkte ${v < 0 ? 'gewinnen' : 'verlieren'} die ${p.einflussN} Partner an dieser Seite häufiger`
    }},
  // Die zwei Gegenstücke zu Wiedereinstieg und Aufschwung, gegen das
  // EIGENE gemessen wie die Schandtafel es verlangt [§C35]: nach einer Pause
  // schwächer als sonst, und in den letzten 25 Partien schwächer als früher.
  // Mit dem Wegfall der bittersten Pleite trug die Tafel elf Einträge, und
  // einer hielt fünf davon.
  {id:'rost', name:'Der Rost', short:'Rost', ic:'rost', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten, offen:true,
      zeitraum:'Ganze Laufbahn, jede Rückkehr',
      mind:'4 Rückkehrspiele',
      wie:`Ein Rückkehrspiel ist die erste eigene Partie nach ${REKORD_PAUSE_STUNDEN} vollständigen Stunden, also ${REKORD_PAUSE_STUNDEN / 24} Tagen, ohne eigene Partie. Die Siegquote dieser Rückkehrspiele wird gegen die Siegquote aller übrigen eigenen Partien gestellt. Der Wert ist der Rückstand in Prozentpunkten.`,
      cond:`Größter Rückstand in der ersten Partie nach ${REKORD_PAUSE_STUNDEN / 24} Tagen Pause gegenüber den übrigen Partien, ab 4 Rückkehrspielen`,
      val:p => (p.weDelta != null && p.weN >= 4 && pct(p.weDelta) < 0) ? -p.weDelta : null,
      ev:(p,v) => `${_ppZeichen(-v)} %-Punkte · ${pct(p.weW / p.weN)} % in ${p.weN} Rückkehrspielen, sonst ${_ppGegen(p.weW / p.weN, -v)} %`
    }},
  {id:'abschwung', name:'Der Abschwung', short:'Abschwung', ic:'abschwung', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:REKORD_GRUNDWERT.schatten, offen:true, fenster:true,
      zeitraum:'Die letzten 25 gegen die Laufbahn davor',
      mind:'25 Partien',
      wie:'Die Siegquote der letzten 25 eigenen Partien gegen die Siegquote aller Partien davor. Der Wert ist der Rückstand in Prozentpunkten. Vorn steht, wer heute dauerhaft schwächer spielt als früher.',
      cond:'Größter Rückgang der letzten 25 Partien gegenüber der Laufbahn davor, ab 25 Partien',
      val:p => (p.asDelta != null && pct(p.asDelta) < 0) ? -p.asDelta : null,
      ev:(p,v) => `${_ppZeichen(-v)} %-Punkte · ${pct(p.asNeu)} % in den letzten 25 statt ${_ppGegen(p.asNeu, -v)} % davor`
    },
    // Dieselbe Frage im Monat [§13.1], das Gegenstück zum Ausnahmemonat:
    // der Monat gegen die Laufbahn davor, nicht die letzten fünfundzwanzig.
    monat:{
      beiname:'Der Formlose',
      art:'schatten',
      klasse:'schatten', aus:1.77, streu:0.0898, mitte:-0.00918, n0:42, echt:1,
      wie:'Die Siegquote dieses Monats gegen die Siegquote aller eigenen Partien vor diesem Monat. Gewertet wird nur, wer davor schon dreißig Partien hatte.',
      stichprobe:p => p.games,
      cond:'Siegquote mindestens 15 Prozentpunkte unter der eigenen Laufbahn vor diesem Monat, ab 15 Partien davor',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && _stLaufbahnVor(p, C) != null,
        (p, C) => _stLaufbahnVor(p, C).q - p.q,
        0.15,
        (p, v, C) => { const l = _stLaufbahnVor(p, C);
          return `${pct(p.q)} % statt ${pct(l.q)} % in ${l.g} Partien davor`; }))}},

  // ═══ MONATSCHRONIKEN ══════════════════════════════════════════════
  // Keine davon fragt „wer ist der Beste", ausser den zwei, die nach der
  // Tabelle fragen (Thron, Souverän). Sie fragen nach der Abweichung von der
  // Erwartung, nach Konstanz, nach dem Verhaeltnis zum Ligamittel oder zu
  // einem bestimmten anderen Spieler [§C39]. Weitere stehen oben bei ihrer
  // Allzeitwertung: dieselbe Frage auf zwei Zeitachsen gehoert in EINE
  // Disziplin [§13.1].

  {id:'tagesregent', name:'Der Tagesregent', short:'Regent', ic:'zepter', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Tagesherrscher',
      art:'koennen',
      klasse:'legendaer', aus:2.55, streu:0.172, mitte:0.161, n0:9, echt:1,
      wie:'Player of the Day ist, wer an einem Spieltag die beste Bilanz hat. Gezählt wird der Anteil an den eigenen Spieltagen.',
      stichprobe:p => p.tagN,
      cond:'An mindestens 60 % der eigenen Spieltage Player of the Day, ab 4 Spieltagen',
      // Die Spieltage, die zu sind (`tagN`), nicht alle: der Spieler des
      // Tages steht erst um 23:59 fest, und gegen alle Tage geteilt fiel die
      // Quote jeden Nachmittag, an dem gespielt wurde.
      ...(_stWertung(
        p=>p.tagN>=4,
        p=>p.potd/p.tagN,
        0.6,
        (p,v)=>`Player of the Day an ${p.potd} der ${p.tagN} Spieltage · ${pct(v)} %`))}},

  {id:'thron', name:'Auf dem Thron', short:'Thron', ic:'thron', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unantastbare',
      art:'koennen',
      klasse:'legendaer', aus:2.64, streu:3,
      wie:'Gemessen wird der schlechteste Platz, den die Liga-Tabelle am Ende eines Spieltags zeigte. Gezählt wird jeder Spieltag des Monats, auch einer ohne eigene Partie: wer aussetzt, kann überholt werden.',
      stichprobe:false,
      cond:'An keinem Spieltag des Monats aus den ersten zwei Plätzen der Liga gefallen',
      ...(_stWertung(
        p=>p.thronRang != null,
        p=>-p.thronRang,
        -2,
        (p)=>`Nie schlechter als Platz ${p.thronRang} · ${p.tagN} eigene Spieltage`))}},

  // Die Ausnahme von der Regel oben, wie der Thron davor: sie fragt nach der
  // Tabelle [§C39]. Leon gewann den Juni mit 103 Elo Vorsprung und hielt in
  // diesem Monat keine einzige Chronik — die Fragen nach der Rechnung
  // schlägt niemand, den die Rechnung schon ganz oben sieht. Wie weit
  // jemand vorne steht, ist trotzdem eine Besonderheit; die Schwelle sorgt
  // dafür, dass nicht jeder Erste sie hat. Hundert Elo erreichte die Liga in
  // fünf Monaten zweimal (103 im Juni, 131 im Oktober); die übrigen Ersten
  // lagen 40 bis 65 vorn.
  {id:'souveraen', name:'Der Souverän', short:'Souverän', ic:'souveraen', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Souveräne',
      art:'koennen',
      klasse:'legendaer', aus:1.82, streu:199,
      wie:'Die Monatstabelle ordnet nach der Elo dieses Monats. Gewertet wird der Abstand zum Zweiten: einen Vorsprung hat nur, wer vorne steht.',
      stichprobe:false,
      cond:'Mit mindestens 100 Elo Vorsprung an der Spitze der Monatstabelle',
      ...(_stWertung(
        (p, C) => C.rank.length >= 2,
        (p, C) => { const ich = C.rank.find(r => r.id === p.pid), zweit = C.rank.find(r => r.id !== p.pid);
          return ich && zweit ? ich.elo - zweit.elo : null; },
        100,
        // Wer nicht vorne steht, liegt hinter dem Ersten: „-103 Elo vor Leon
        // auf Platz zwei" stand unter „Am nächsten dran".
        (p, v, C) => { const n = pname(C.rank.find(r => r.id !== p.pid).id);
          return v < 0 ? `${Math.round(-v)} Elo hinter ${n} auf Platz eins` : `${Math.round(v)} Elo vor ${n} auf Platz zwei`; }))}},

  {id:'angstfrei', name:'Ohne Angstgegner', short:'Angstfrei', ic:'geistBann', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Furchtlose',
      art:'koennen',
      klasse:'legendaer', aus:2.96, streu:0.158, mitte:0.282, n0:5, echt:1,
      wie:'Nicht der Lieblingsgegner zählt, sondern der unangenehmste. Gegen wen läuft es am schlechtesten, und wie schlecht ist das noch.',
      stichprobe:p => Math.min(...Object.values(p.gegnerGrp).filter(a => a.length >= 3).map(a => a.length)),
      cond:'Gegen JEDEN regelmäßigen Gegner mindestens 75 %, ab 3 Gegnern mit je 3 Duellen',
      ...(_stWertung(
        p=>Object.values(p.gegnerGrp).filter(a=>a.length>=3).length>=3,
        p=>Math.min(...Object.values(p.gegnerGrp).filter(a=>a.length>=3).map(a=>_stQuoteRoh(a))),
        0.75,
        (p,v)=>{const g=Object.values(p.gegnerGrp).filter(a=>a.length>=3);
      return `${g.length} regelmäßige Gegner, gegen keinen unter ${pct(v)} %`;}))}},

  {id:'wochenkrone', name:'Die Wochenkrone', short:'Krone', ic:'wochenkrone', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Dauerregent',
      art:'koennen',
      // Die haerteste Chronik des Katalogs. Gemessen liegt die Schwelle
      // sechs Standardabweichungen ueber dem Feld — der beste Wert der
      // Ligageschichte sind vierzig Prozent. So weit jenseits aller
      // Messwerte sagt eine Standardabweichung nichts mehr, deshalb ist der
      // Ausschlag auf vier gedeckelt: den hoechsten, den es im Katalog
      // wirklich gibt [§C39].
      klasse:'legendaer', aus:3.02, streu:0.172, mitte:0.145, n0:5, echt:0,
      wie:'Player of the Week ist, wer in einer Kalenderwoche die beste Bilanz hat. Gezählt wird der Anteil an den eigenen Wochen mit mindestens fünf Partien, nicht die Zahl der Wochen.',
      stichprobe:p => p.potwG,
      cond:'In mindestens zwei Dritteln der eigenen Spielwochen Player of the Week, ab 3 Wochen mit je 3 Partien',
      ...(_stWertung(
        p=>p.potwG>=3,
        p=>p.potw/p.potwG,
        2/3,
        (p,v)=>`Player of the Week in ${p.potw} von ${p.potwG} Wochen · ${pct(v)} %`))}},

  {id:'traumquote', name:'Der Traummonat', short:'Traumlauf', ic:'star', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Überlegene',
      art:'koennen',
      klasse:'legendaer', aus:1.75, streu:0.15, mitte:0.488, n0:42, echt:0.95,
      wie:'Die Siegquote des Monats, ohne Gewichtung und ohne Vergleich.',
      stichprobe:p => p.games,
      cond:'Mindestens 75 % Siegquote über den ganzen Monat',
      ...(_stWertung(
        p=>p.games>=8,
        p=>p.q,
        0.75,
        p=>`${p.wins} von ${p.games} Partien gewonnen · ${pct(p.q)} %`))}},

  {id:'nachzuegler', name:'Der Nachzügler', short:'Nachzügler', ic:'spaetStart', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Aufholer',
      art:'koennen',
      klasse:'selten', wende:true, aus:2.07, streu:0.273,
      wie:'Verglichen werden die ersten fünf und die letzten fünf eigenen Partien des Monats, nicht die beiden Hälften.',
      stichprobe:false,
      cond:'In den letzten 3 Partien des Monats mindestens 3 Siege mehr als in den ersten 5',
      ...(_stWertung(
        p=>p.games>=8,
        p=>(_stSiege(p.partien.slice(-5))-_stSiege(p.partien.slice(0,5)))/5,
        0.6,
        p=>`${_stSiege(p.partien.slice(-5))} von 5 zum Schluss, ${_stSiege(p.partien.slice(0,5))} von 5 zum Auftakt`))}},

  {id:'schattenmann', name:'Der Schattenmann', short:'Zuspieler', ic:'schattenmann', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Wegbereiter',
      art:'koennen',
      klasse:'besonders', aus:1.82, streu:0.267, mitte:0.111, n0:8, echt:0.5,
      wie:'Für jeden Partner wird die gemeinsame Quote mit dessen Quote ohne diesen Spieler verglichen.',
      stichprobe:p => p._sm ? p.partnerGrp[p._sm.mid].length : 0,
      cond:'Ein Partner gewinnt an dieser Seite mindestens 60 Prozentpunkte häufiger als ohne, ab 3 gemeinsamen Partien',
      ...(_stWertung(
        p=>true,
        (p,c)=>{let b=null;
      Object.keys(p.partnerGrp).forEach(mid=>{const z=p.partnerGrp[mid];if(z.length<ST_TEIL)return;
      const o=c.P[mid];if(!o)return;const ohne=o.partien.filter(s=>s.mate!==p.pid);if(ohne.length<ST_TEIL)return;
      const d=_stQuoteRoh(z)-_stQuoteRoh(ohne);
      if(!b||d>b.d)b={d,mid,q:_stQuoteRoh(z)};});
      p._sm=b;return b?b.d:null;},
        0.6,
        (p,v)=>`${pname(p._sm.mid)} gewinnt an dieser Seite ${pct(p._sm.q)} %, sonst ${pct(p._sm.q-v)} %`))}},

  {id:'zunull', name:'Die weiße Weste', short:'Weste', ic:'weisseWeste', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Saubermann',
      art:'koennen',
      klasse:'besonders', aus:2.14, streu:0.0331, mitte:0.0292, n0:22, echt:1,
      wie:'Zu Null heißt: jeden Satz gewonnen, bei mindestens zwei Sätzen (2:0, 3:0). Ein einzelner gewonnener Satz zählt nicht.',
      stichprobe:p => p.wins,
      cond:'Mindestens 50 % der eigenen Siege zu Null, ab 3 Siegen',
      ...(_stWertung(
        p=>p.wins>=ST_TEIL,
        p=>p.partien.filter(s=>s.win&&s.zuNull).length/p.wins,
        0.50,
        p=>`${p.partien.filter(s=>s.win&&s.zuNull).length} von ${p.wins} Siegen zu Null`))}},

  {id:'bollwerk', name:'Das Bollwerk', short:'Bollwerk', ic:'bollwerk', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unüberwindliche',
      art:'koennen',
      klasse:'selten', aus:1.94, streu:0.753, mitte:0.0379, n0:42, echt:0.95,
      wie:'Der Anteil der abgegebenen Games gegen den Schnitt aller, die in diesem Monat gespielt haben. Als Anteil, nicht je Partie: sonst hinge er an der Zahl der Sätze.',
      stichprobe:p => p.games,
      cond:'Mindestens 10 Prozentpunkte weniger Games abgegeben als der Schnitt aller Spieler des Monats',
      ...(_stWertung(
        p=>p.games>=ST_TEIL,
        (p,c)=>_stMittel(Object.values(c.P).map(x=>x.ga/((x.gf+x.ga)||1)))-p.ga/((p.gf+p.ga)||1),
        0.10,
        (p,v,c)=>`${pct(p.ga/((p.gf+p.ga)||1))} % der Games abgegeben · Liga ${pct(_stMittel(Object.values(c.P).map(x=>x.ga/((x.gf+x.ga)||1))))} %`))}},

  {id:'ausreisser2', name:'Der Ausreißer', short:'Ausreißer', ic:'ausreisser', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Senkrechtstarter',
      art:'koennen',
      klasse:'selten', aus:2.21, streu:0.437,
      wie:'Aus den Siegchancen der Partien eines Tages folgt, wie wahrscheinlich dieser Tag war. Je unwahrscheinlicher, desto höher der Wert.',
      stichprobe:false,
      cond:'Ein Spieltag, den die Rechnung mit höchstens 2 % erwartet hat, ab 4 Partien am Tag',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).some(a=>a.length>=4),
        p=>{let b=null;Object.keys(p.tagGrp).forEach(t=>{const a=p.tagGrp[t];if(a.length<4)return;
      const q=Math.max(_stPBinom(a.map(s=>s.exp),_stSiege(a)),1e-6);
      if(!b||q<b.q)b={q,a};});p._au=b;return b?-Math.log10(b.q):null;},
        1.6989700043360187,
        (p,v)=>`${_stSiege(p._au.a)} von ${p._au.a.length} an einem Tag · erwartet waren ${komma(p._au.q*100, 1)} %`))}},

  // Die Siegesserie gegen die Rechnung: nicht die längste, sondern die, mit
  // der am wenigsten zu rechnen war (`_stSiegeszug`). Die längste Serie hing
  // mit 0,41 an der Spielzahl, und sieben Siege gegen Schwächere sind weniger
  // als fünf gegen die Spitze.
  {id:'siegeszug', name:'Der Siegeszug', short:'Siegeszug', ic:'siegeszug', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Seriensieger',
      art:'koennen',
      klasse:'selten', aus:3.14, streu:0.626,
      wie:'Die Siegchancen einer Serie werden multipliziert: so wahrscheinlich war genau diese Folge. Mit der Zahl der eigenen Partien des Monats wird daraus, wie oft so etwas im Monat zu erwarten war.',
      stichprobe:false,
      cond:'Eine Siegesserie, mit der bei der Zahl der eigenen Partien höchstens zu 2 % zu rechnen war',
      ...(_stWertung(
        p => _stSiegeszug(p) != null,
        p => -Math.log10(Math.max(_stSiegeszug(p).erw, 1e-9)),
        1.6989700043360187,
        p => { const z = _stSiegeszug(p);
          // Ab eins ist es eine Zahl von Serien, keine Wahrscheinlichkeit:
          // „war damit zu 227,2 % zu rechnen" stand im Blatt.
          return `${z.n} Siege am Stück · bei ${p.games} Partien ` + (z.erw >= 1
            ? `war damit ${komma(z.erw, 1)}-mal zu rechnen` : `war damit zu ${komma(z.erw * 100, 1)} % zu rechnen`); }))}},

  {id:'endspurt', name:'Der Endspurt', short:'Endspurt', ic:'rakete', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Ausdauernde',
      art:'koennen',
      klasse:'besonders', aus:1.53, streu:0.139, mitte:-0.0107, n0:9, echt:0.6,
      wie:'Die jeweils letzte Partie jedes eigenen Spieltags, verglichen mit der Siegchance, die die Elo-Rechnung vor genau diesen Partien gab.',
      stichprobe:p => p.tagN,
      cond:'Die letzten Partien der Spieltage mindestens 20 Prozentpunkte häufiger gewonnen, als die Elo-Rechnung erwartet hat, ab 3 Spieltagen',
      ...(_stWertung(
        p=>p.tagN>=ST_TEIL,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[a.length-1]);return _stQuoteRoh(l)-_stSoll(l)/l.length;},
        0.20,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[a.length-1]);return `${_stSiege(l)} von ${l.length} Tagesabschlüssen gewonnen · erwartet ${pct(_stSoll(l)/l.length)} %`;}))}},

  {id:'umschwung', name:'Der Umschwung', short:'Wende', ic:'umschwung', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Verwandelte',
      art:'koennen',
      klasse:'selten', wende:true, aus:0.86, streu:0.189, mitte:0.304, n0:45, echt:0,
      wie:'Zwei aufeinanderfolgende eigene Spieltage nebeneinander. Gesucht ist der größte Sprung nach oben.',
      stichprobe:p => p.games,
      cond:'Von einem Spieltag zum nächsten mindestens 50 Prozentpunkte besser, ab 4 Partien an beiden Tagen',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=4).length>=2,
        p=>{const t=Object.keys(p.tagGrp).sort().map(k=>p.tagGrp[k]).filter(a=>a.length>=4);
      let b=null;for(let i=1;i<t.length;i++){
      const x=_stQuoteRoh(t[i-1]), y=_stQuoteRoh(t[i]);
      if(!b||y-x>b.d) b={d:y-x,x,y};}
      p._um=b;return b?b.d:null;},
        0.50,
        p=>`von ${pct(p._um.x)} % auf ${pct(p._um.y)} % am nächsten Spieltag`))}},

  // Der Zeitpunkt eines Partnerwechsels, nicht der Partner selbst: „Der
  // Kontrast" fragt, NEBEN WEM es laeuft, „Der Katalysator", was der Spieler
  // seinen Partnern bringt. Hier zaehlt die Partie direkt nach einem Wechsel
  // gegen die mit demselben Partner wie davor, beide gegen die Rechnung —
  // dann kann auch gewinnen, wer unter 50 % liegt. Das sagt nicht, dass
  // Wechsel helfen, nur dass danach mehr gelang.
  {id:'staffellauf', name:'Der Staffellauf', short:'Staffel', ic:'baton', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Anschlussfinder',
      art:'koennen',
      klasse:'besonders', aus:1.89, streu:0.164, mitte:-0.0125, n0:9, echt:0,
      wie:'Jede Partie wird mit der direkt davor gespielten Partie desselben Spieltags verglichen: nach einem Partnerwechsel gegen mit demselben Partner wie davor. Gemessen wird jeweils das Ergebnis gegen die Siegchance vor der Partie, also über oder unter der Rechnung, und nicht die Siegquote. Die erste Partie eines Tages zählt in keiner Gruppe.',
      stichprobe:p => (u => _stH(u.filter(x => x.wechsel).length, u.filter(x => !x.wechsel).length))(_stUebergaenge(p)),
      cond:'Nach einem Partnerwechsel mindestens 30 Prozentpunkte weiter über der Rechnung als mit demselben Partner, ab 3 Partien in jeder Gruppe an 3 Spieltagen',
      ...(_stWertung(
        p=>{const u=_stUebergaenge(p);return p.tagN>=3&&u.filter(x=>x.wechsel).length>=ST_TEIL&&u.filter(x=>!x.wechsel).length>=ST_TEIL;},
        p=>{const u=_stUebergaenge(p),m=a=>a.reduce((x,y)=>x+y.r,0)/a.length;
      return m(u.filter(x=>x.wechsel))-m(u.filter(x=>!x.wechsel));},
        0.30,
        // „weiter über der Rechnung" wie in der Bedingung: der Beleg steht
        // als Zeile einer Sammelkarte vor der Klasse, und „besser gegen die
        // Rechnung" trug das Seitenbündnis dort über 130 Zeichen [§C33].
        (p,v)=>{const u=_stUebergaenge(p);
      return `${_ppLage(v, 'besser', 'schlechter')} gegen die Rechnung nach einem Partnerwechsel · ${u.filter(x=>x.wechsel).length} Partien danach, ${u.filter(x=>!x.wechsel).length} mit demselben Partner`;}))}},

  // Unter den Partnerwechseln nur die, bei denen der neue Partner eben noch
  // auf der anderen Seite stand, gegen alle uebrigen Wechsel. Anders als beim
  // Staffellauf wechseln beide Gruppen den Partner; verglichen wird, woher er
  // kommt.
  {id:'seitenbuendnis', name:'Das Seitenbündnis', short:'Bündnis', ic:'sideJoin', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Seitenverbinder',
      art:'koennen',
      klasse:'besonders', aus:1.81, streu:0.164, mitte:0.0537, n0:7.2, echt:1,
      wie:'Gezählt werden nur Partien desselben Spieltags nach einem Partnerwechsel. Stand der neue Partner in der Partie davor auf der Gegenseite, ist es ein Bündnis, sonst ein gewöhnlicher Wechsel. Gemessen wird jeweils das Ergebnis gegen die Siegchance vor der Partie, nicht die Siegquote.',
      stichprobe:p => (u => _stH(u.filter(x => x.bund).length, u.filter(x => !x.bund).length))(_stUebergaenge(p).filter(x => x.wechsel)),
      cond:'Neben dem Gegner der Partie davor mindestens 35 Prozentpunkte weiter über der Rechnung als nach anderen Partnerwechseln, ab 3 Partien in jeder Gruppe an 3 Spieltagen',
      ...(_stWertung(
        p=>{const u=_stUebergaenge(p).filter(x=>x.wechsel);return p.tagN>=3&&u.filter(x=>x.bund).length>=ST_TEIL&&u.filter(x=>!x.bund).length>=ST_TEIL;},
        p=>{const u=_stUebergaenge(p).filter(x=>x.wechsel),m=a=>a.reduce((x,y)=>x+y.r,0)/a.length;
      return m(u.filter(x=>x.bund))-m(u.filter(x=>!x.bund));},
        0.35,
        (p,v)=>{const u=_stUebergaenge(p).filter(x=>x.wechsel);
      return `${_ppLage(v, 'besser', 'schlechter')} gegen die Rechnung neben dem Gegner von eben · ${u.filter(x=>x.bund).length} solche Partien, ${u.filter(x=>!x.bund).length} andere Wechsel`;}))}},

  // Was neben einem Partner geschieht, dem es gerade nicht läuft: zwei
  // Pleiten am Stück, gleich an welchem Tag. Der Schattenmann fragt nach
  // einem einzelnen Partner über den ganzen Monat, hier zählt der Moment. Die
  // zwei Partien davor zählen über den Monatswechsel: sonst hätte die erste
  // Woche eines Monats keinen Partner, dem es gerade nicht läuft.
  {id:'stuetze', name:'Die Stütze', short:'Stütze', ic:'stuetze', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Mutmacher',
      art:'koennen',
      klasse:'besonders', aus:1.86, streu:0.153, mitte:0.0112, n0:12, echt:0.3,
      wie:'Nur die Partien neben einem Partner, der die zwei Partien davor verloren hatte, auch an einem früheren Tag. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:(p, C) => _stPartnerTief(p, C).length,
      cond:'Neben einem Partner nach zwei Pleiten am Stück mindestens 30 Prozentpunkte über der Rechnung, ab 3 solchen Partien',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && _stPartnerTief(p, C).length >= ST_TEIL,
        (p, C) => _stUeberSoll(_stPartnerTief(p, C)),
        0.30,
        (p, v, C) => { const a = _stPartnerTief(p, C);
          return `${_stSiege(a)} von ${a.length} Partien neben einem Partner nach zwei Pleiten · ${_ppLage(v, 'über', 'unter')} der Rechnung`; }))}},

  {id:'aufholjagd', name:'Die Antwort', short:'Antwort', ic:'antwort', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Trotzige',
      art:'koennen',
      klasse:'selten', wende:true, aus:1.79, streu:0.184, mitte:0.523, n0:20, echt:0.85,
      wie:'Nur die Partien, die auf eine Pleite folgen. Gemessen wird der Anteil, nicht die längste Serie.',
      stichprobe:p => _stNachPleite(p).length,
      cond:'Mindestens 85 % der Partien direkt nach einer Niederlage gewonnen, ab 3 Gelegenheiten',
      ...(_stWertung(
        p=>_stNachPleite(p).length>=ST_TEIL,
        p=>{const d=_stNachPleite(p);return _stQuoteRoh(d);},
        0.85,
        p=>{const d=_stNachPleite(p);return `${_stSiege(d)} von ${d.length} Antworten nach einer Pleite`;}))}},

  {id:'favschreck', name:'Der Favoritenschreck', short:'Schreck', ic:'giantSlayer', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unerschrockene',
      art:'koennen',
      klasse:'selten', aus:1.22, streu:0.189, mitte:0.247, n0:8, echt:0,
      wie:'Klarer Favorit heißt: das gegnerische Team hatte vorher mindestens 65 Prozent Siegchance.',
      stichprobe:p => p.partien.filter(s => s.exp <= CHANCE_UPSET).length,
      cond:'Mindestens 45 % gegen klare Favoriten, ab 3 solchen Partien',
      ...(_stWertung(
        p=>p.partien.filter(s=>s.exp<=CHANCE_UPSET).length>=ST_TEIL,
        p=>{const d=p.partien.filter(s=>s.exp<=CHANCE_UPSET);return _stQuoteRoh(d);},
        0.45,
        p=>{const d=p.partien.filter(s=>s.exp<=CHANCE_UPSET);return `${_stSiege(d)} von ${d.length} gegen klare Favoriten`;}))}},

  // Das Gegenstück zum Wackelkandidaten: als Favorit nicht nur gewinnen,
  // sondern öfter, als die Rechnung es dem Favoriten zutraut. Gefragt wird
  // nach der Wahrscheinlichkeit (`_stUnwahr`), nicht nach dem Abstand: wer
  // viel spielt, ist oft Favorit, und ein Abstand über sechzig Partien
  // schwankt weniger als über acht.
  {id:'favoritenrolle', name:'Die Favoritenrolle', short:'Favorit', ic:'favoritenrolle', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Favoritenkönig',
      art:'koennen',
      klasse:'selten', aus:2.15, streu:0.507,
      wie:'Favorit heißt über 55 % Siegchance vor der Partie. Aus den Siegchancen aller dieser Partien folgt, wie wahrscheinlich mindestens so viele Siege waren.',
      stichprobe:false,
      cond:'Als Favorit so oft gewonnen, wie es die Rechnung mit höchstens 2 % erwartet hat, ab 8 Partien als Favorit',
      ...(_stWertung(
        p => p.partien.filter(_stFavorit).length >= 8,
        p => _stUnwahr(p.partien.filter(_stFavorit)),
        1.6989700043360187,
        (p, v) => { const a = p.partien.filter(_stFavorit);
          return `${_stSiege(a)} von ${a.length} als Favorit gewonnen · die Rechnung gab dafür ${komma(Math.pow(10, -v) * 100, 1)} %`; }))}},

  {id:'formgipfel', name:'Der Formgipfel', short:'Formgipfel', ic:'formGipfel', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Entfesselte',
      art:'koennen',
      klasse:'besonders', aus:0.69, streu:0.101, mitte:0.28, n0:42, echt:1,
      wie:'Jeder Block aus sieben Partien am Stück wird gegen die eigene Monatsquote gestellt. Gesucht ist der beste.',
      stichprobe:p => p.games,
      cond:'Ein Block aus 7 Partien mindestens 35 Prozentpunkte über dem eigenen Monatsschnitt',
      ...(_stWertung(
        p=>p.games>=9,
        p=>{let b=-9;for(let i=0;i+7<=p.games;i++){const q=_stSiege(p.partien.slice(i,i+7))/7;if(q-p.q>b)b=q-p.q;}return b;},
        0.35,
        (p,v)=>`${Math.round((p.q+v)*7)} von 7 am Stück · sonst ${pct(p.q)} %`))}},

  {id:'unmoeglich', name:'Der Unmögliche Monat', short:'Unmöglich', ic:'diamond', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unmögliche',
      art:'koennen',
      klasse:'legendaer', aus:1.87, streu:0.468,
      wie:'Die Rechnung gab vor jeder Partie eine Siegchance. Daraus folgt, wie wahrscheinlich der ganze Monat so oder besser ausgeht. Je unwahrscheinlicher der Monat, desto höher der Bonus.',
      stichprobe:false,
      cond:'Ein Monat, den die Elo-Rechnung mit höchstens 5 % erwartet hat',
      // Gewertet wird die Wahrscheinlichkeit als Zehnerlogarithmus wie bei
      // jeder anderen Chronik, die nach der Rechnung fragt (`_stUnwahr`). Der
      // Wert war eins minus die Wahrscheinlichkeit: zwischen 2 % und einem
      // Tausendstel lagen damit 0,02, ein Zwanzigstel der Streuung, und ein
      // Monat, der hundertmal unwahrscheinlicher war, brachte einen Punkt
      // Bonus mehr [§C39].
      ...(_stWertung(
        p=>p.games>=8,
        p=>_stUnwahr(p.partien),
        -Math.log10(0.05),
        (p,v)=>{ const c = Math.pow(10, -v) * 100;
          return `${p.wins} von ${p.games} Siegen · die Rechnung gab dafür ${c < 0.1 ? 'unter 0,1' : komma(c, 1)} %`; }))}},

  {id:'schwachstelle', name:'Ohne Schwachstelle', short:'Lückenlos', ic:'kingClass', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Lückenlose',
      art:'koennen',
      klasse:'selten', aus:1.4, streu:0.103, mitte:0.341, n0:14, echt:0,
      wie:'Fünf Teilquoten desselben Monats; gewertet wird die schwächste. Es zählt, dass es nirgends einen Einbruch gibt.',
      stichprobe:p => Math.min(p.drvG, p.revG, _stNachPleite(p).length, p.partien.filter(_stEng).length),
      cond:'In allen fünf Lagen mindestens 50 %: vorne, hinten, gegen die Stärkeren, in knappen Partien und nach einer Niederlage, ab 3 Partien je Lage',
      ...(_stWertung(
        (p,c)=>_stLagen(p,c)!=null,
        (p,c)=>{const q=_stLagen(p,c);return q?Math.min(...Object.values(q)):null;},
        0.5,
        (p,v,c)=>{const q=_stLagen(p,c);
      return `vorne ${pct(q.vorne)} %, hinten ${pct(q.hinten)} %, gegen oben ${pct(q.oben)} %, `
      +`eng ${pct(q.eng)} %, nach Pleite ${pct(q.antwort)} %`;}))}},

  {id:'schwachewoche', name:'Ohne schwache Woche', short:'Durchweg', ic:'weekly', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Beständige',
      art:'konstanz',
      klasse:'selten', aus:2.76, streu:0.291, mitte:0.895, n0:53, echt:0.95,
      wie:'Der Monat wird in Kalenderwochen geteilt, und gewertet wird die schwächste gegen den eigenen Monatsschnitt. Nicht das Niveau zählt, sondern dass es nie einbrach.',
      stichprobe:p => p.games,
      cond:'Auch in der schwächsten Kalenderwoche höchstens 2 Prozentpunkte unter der eigenen Monatsquote, ab 3 Wochen mit je 3 Partien',
      ...(_stWertung(
        p=>_stWochen(p).length>=3,
        p=>{const m=Math.min(..._stWochen(p).map(a=>_stQuoteRoh(a)));
      return -Math.log10(Math.max(p.q-m,0.005));},
        1.6989700043360187,
        p=>{const W=_stWochen(p), m=Math.min(...W.map(a=>_stQuoteRoh(a)));
      return `${W.length} Wochen, die schwächste bei ${pct(m)} % · Monat ${pct(p.q)} %`;}))}},

  {id:'punktgenau2', name:'Der Erwartungstreue', short:'Erwartung', ic:'stopwatch', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Berechenbare',
      art:'konstanz',
      klasse:'besonders', aus:1.33, streu:0.372,
      wie:'Der Abstand zwischen der eigenen Siegquote und der, die die Elo-Rechnung vorher erwartet hat, umgerechnet auf 40 Partien. Je näher an null, desto besser.',
      stichprobe:false,
      cond:'Die eigene Quote liegt am Monatsende höchstens 2 Prozentpunkte neben der Elo-Erwartung, auf 40 Partien gerechnet',
      // Gerechnet auf 40 Partien, den Median der Spielzahl: der Zufall einer
      // Quote schrumpft mit der Wurzel der Partien, und über hundert Partien
      // liegt sie von selbst nah an der Rechnung [§C39].
      ...(_stWertung(
        p=>p.games>=8,
        p=>-Math.log10(Math.max(Math.abs(p.q-p.expQ)*Math.sqrt(p.games/40),0.0005)),
        -Math.log10(0.02),
        // Der Abstand steht vorn und mit einer Stelle: „50 % gespielt, 50 %
        // erwartet" stand bei 0,3 Prozentpunkten Abstand, und der Bonus, der
        // daraus folgt, war auf dem Bildschirm nicht zu sehen.
        p=>{ const q = Math.round(p.q * 1000) / 10, e = Math.round(p.expQ * 1000) / 10;
          // Gewertet wird der Abstand auf 40 Partien, und nur er steht vorn:
          // der rohe Abstand folgt aus den beiden Quoten dahinter. Beide
          // nebeneinander machten den Beleg in der Sammelzeile zum Absatz.
          return (p.games !== 40 ? 'auf 40 Partien ' : '')
            + `${komma(Math.abs(q - e) * Math.sqrt(p.games / 40), 1)} %-Punkte daneben · ${komma(q, 1)} % gespielt, ${komma(e, 1)} % erwartet`; }))}},

  {id:'schwaechstertag', name:'Der schwächste Tag', short:'Jeder Tag', ic:'schwaechsterTag', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Grundsolide',
      art:'konstanz',
      klasse:'selten', aus:2.35, streu:0.171, mitte:0.196, n0:53, echt:0.55,
      wie:'Nicht der beste Tag zählt, sondern der schlechteste. Ein Ausrutscher genügt, um die Chronik zu verlieren.',
      stichprobe:p => p.games,
      cond:'Auch am schwächsten eigenen Spieltag noch mindestens 60 %, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=3,
        p=>Math.min(...Object.values(p.tagGrp).filter(a=>a.length>=3).map(a=>_stQuoteRoh(a))),
        0.6,
        (p,v)=>{const t=Object.values(p.tagGrp).filter(a=>a.length>=3);
      return `${t.length} Spieltage, keiner unter ${pct(v)} %`;}))}},

  {id:'beidseitig', name:'Der Beidfüßige', short:'Beidfüßig', ic:'sort', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Vielseitige',
      art:'konstanz',
      klasse:'besonders', aus:0.82, streu:0.429,
      wie:'Die Quote rechts und die links, beide gegen die eigene Gesamtquote, umgerechnet auf 15 Partien auf der selteneren Seite. Je näher an null, desto besser.',
      stichprobe:false,
      cond:'Auf beiden Seiten höchstens 3 Prozentpunkte neben der eigenen Gesamtquote, auf 15 Partien gerechnet, ab 3 Partien je Seite',
      ...(_stWertung(
        p=>p.partien.filter(s=>s.pos==='drive').length>=ST_TEIL&&p.partien.filter(s=>s.pos==='reves').length>=ST_TEIL,
        p=>{const a=p.partien.filter(s=>s.pos==='drive'),d=p.partien.filter(s=>s.pos==='reves');
      const m=Math.max(Math.abs(_stQuoteRoh(a)-p.q),
      Math.abs(_stQuoteRoh(d)-p.q));
      // Gerechnet auf 15 Partien auf der selteneren Seite, dem Median:
      // ohne das hing die Chronik mit 0,38 an der Spielzahl [§C39].
      return -Math.log10(Math.max(m*Math.sqrt(Math.min(a.length,d.length)/15),0.0005));},
        -Math.log10(0.03),
        p=>{const a=p.partien.filter(s=>s.pos==='drive'),d=p.partien.filter(s=>s.pos==='reves');
      const r=x=>Math.round(x*1000)/10, q=r(p.q), qa=r(_stQuoteRoh(a)), qd=r(_stQuoteRoh(d));
      const k=Math.min(a.length,d.length), dm=Math.max(Math.abs(qa-q),Math.abs(qd-q));
      // Wie beim Erwartungstreuen steht nur der gewertete Abstand vorn.
      return (k !== 15 ? 'auf 15 Partien ' : '')
        + `${komma(dm*Math.sqrt(k/15),1)} %-Punkte neben ${komma(q,1)} % · ${komma(qa,1)} % vorne, ${komma(qd,1)} % hinten`;}))}},

  // ── Zweite Runde: neun Chroniken mehr [§C39] ─────────────────────
  // Alle an den echten Partien kalibriert. Was hier nicht steht, hat eine
  // der beiden Regeln gerissen: die Schwelle liess sich nicht weit genug
  // hinausschieben (heute 1,2 σ), oder der Wert hing an der Spielzahl. „Die Sammlung"
  // (wie viele verschiedene Ergebnisse) korrelierte mit −0,91 zur
  // Spielzahl — wer zwoelf Partien spielt, hat zwoelf verschiedene
  // Ergebnisse —, „Der Tag gegen die Rechnung" mit +0,56.
  {id:'wochwunder', name:'Die Woche gegen die Rechnung', short:'Wunder', ic:'wunderWoche', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Wundertäter',
      art:'koennen',
      klasse:'selten', aus:2.29, streu:0.543,
      wie:'Gerechnet wird die Wahrscheinlichkeit, in dieser Woche so viele Siege oder mehr zu holen. Partie für Partie aus der Siegchance, die vor der Partie stand.',
      stichprobe:false,
      cond:'Eine Kalenderwoche, die die Elo-Rechnung mit höchstens 1,5 % erwartet hat, ab 6 Partien in dieser Woche',
      ...(_stWertung(
        p=>_stWochGross(p).length>=1,
        p=>-Math.log10(Math.max(1e-6, Math.min(..._stWochGross(p)
             .map(a=>_stPBinom(a.map(s=>s.exp), _stSiege(a)))))),
        -Math.log10(0.015),
        (p,v)=>`Eine Woche, die mit ${komma(Math.pow(10,-v)*100)} % erwartet war · ${_stWochGross(p).length} ${_stWochGross(p).length === 1 ? 'Woche' : 'Wochen'} gewertet`))}},

  {id:'gleichmut', name:'Der Gleichmut', short:'Gleichmut', ic:'gleichmass', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Gleichmütige',
      art:'konstanz',
      klasse:'selten', aus:3.83, streu:0.409, mitte:-4.32, n0:42, echt:0,
      wie:'Nicht wie hoch gewonnen wird, sondern wie gleichmäßig. Gemessen wird der Anteil der Games je Partie, damit ein Satz und drei Sätze vergleichbar sind: wer jede Partie mit 6:4 beendet, steht vor dem, der 6:0 und 0:6 abwechselt.',
      stichprobe:p => p.games,
      cond:'Der Anteil der Games jeder Partie bleibt im Schnitt höchstens 18 Prozentpunkte vom eigenen Mittel entfernt',
      ...(_stWertung(
        p=>p.games>=TITLE_MIN_GAMES,
        p=>-_stStreu(p.partien.map(s=>s.gf/((s.gf+s.ga)||1))),
        -0.18,
        (p,v)=>`${pct(-v)} %-Punkte Streuung um ${pct(p.gf/((p.gf+p.ga)||1))} % der Games im Schnitt`))}},

  {id:'zweiteluft', name:'Die zweite Luft', short:'Luft', ic:'zweiteLuft', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Spätzünder',
      art:'koennen',
      klasse:'selten', wende:true, aus:2.95, streu:0.128, mitte:0.0265, n0:10, echt:0,
      wie:'Der Vergleich läuft innerhalb der eigenen Spieltage: dieselben Gegner, dieselbe Woche, nur später am Tag.',
      stichprobe:p => (b => _stH(b.frueh.length, b.spaet.length))(_stTagBlock(p)),
      cond:'Ab der vierten Partie eines Spieltags mindestens 40 Prozentpunkte stärker als in den ersten drei, ab 3 Partien in jedem Block',
      ...(_stWertung(
        p=>_stTagBlock(p).frueh.length>=ST_TEIL && _stTagBlock(p).spaet.length>=ST_TEIL,
        p=>{const b=_stTagBlock(p); return _stQuote(b.spaet)-_stQuote(b.frueh);},
        0.40,
        (p)=>{const b=_stTagBlock(p);
          return `${pct(_stQuote(b.spaet))} % ab der vierten Partie, ${pct(_stQuote(b.frueh))} % davor`;}))}},

  // An den langen Spieltagen gegen die Rechnung. Die zweite Luft davor
  // vergleicht die Partien eines Tages miteinander; hier zählt, was an Tagen
  // mit sieben und mehr Partien herauskommt. Gefragt wird nach der
  // Wahrscheinlichkeit (`_stUnwahr`): lange Tage hat, wer viel spielt, und
  // ein Abstand über sie schwankte zu wenig, um je eine Schwelle zu reißen.
  {id:'langeratem', name:'Der lange Atem', short:'Atem', ic:'langerAtem', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Langläufer',
      art:'koennen',
      klasse:'selten', aus:2.87, streu:0.438,
      wie:'Lang heißt: mindestens sieben eigene Partien an einem Tag. Aus den Siegchancen aller Partien dieser Tage folgt, wie wahrscheinlich mindestens so viele Siege waren.',
      stichprobe:false,
      cond:'An den langen Spieltagen so oft gewonnen, wie es die Rechnung mit höchstens 2 % erwartet hat, ab 2 Spieltagen mit je 7 Partien',
      ...(_stWertung(
        p => _stLangeTage(p).length >= 2,
        p => _stUnwahr([].concat(..._stLangeTage(p))),
        1.6989700043360187,
        (p, v) => { const t = _stLangeTage(p), a = [].concat(...t);
          return `${_stSiege(a)} von ${a.length} an ${t.length} langen Spieltagen · die Rechnung gab dafür ${komma(Math.pow(10, -v) * 100, 1)} %`; }))}},

  {id:'auferstehung', name:'Die Auferstehung', short:'Rückkehr', ic:'aufstehen', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unbeugsame',
      art:'koennen',
      klasse:'selten', wende:true, aus:1.48, streu:0.204, mitte:0.497, n0:11, echt:1,
      wie:'Gezählt werden nur die Partien direkt nach zwei eigenen Niederlagen am Stück, und davon der Anteil der Siege.',
      stichprobe:p => _stNachZwei(p).length,
      cond:'Mindestens 80 % der Partien nach zwei Pleiten am Stück gewonnen, ab 3 solchen Gelegenheiten',
      ...(_stWertung(
        p=>_stNachZwei(p).length>=ST_TEIL,
        p=>_stQuote(_stNachZwei(p)),
        0.80,
        (p)=>{const a=_stNachZwei(p);
          return `${_stSiege(a)} von ${a.length} Partien nach zwei Pleiten am Stück`;}))}},

  {id:'nulldiaet', name:'Die Nulldiät', short:'Nulldiät', ic:'nulldiaet', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Zugeknöpfte',
      art:'koennen',
      klasse:'besonders', aus:2.13, streu:0.0579, mitte:0.0762, n0:42, echt:0.7,
      wie:'Gezählt wird der Anteil der Partien, in denen höchstens ein Viertel der Games an die Gegner ging, etwa 6:2 oder 6:1 6:3. Ein Anteil und keine Zahl, damit kurze und lange Partien gleich zählen.',
      stichprobe:p => p.games,
      cond:'Mindestens 25 % der Partien mit höchstens einem Viertel abgegebener Games',
      ...(_stWertung(
        p=>p.games>=TITLE_MIN_GAMES,
        p=>p.partien.filter(s=>s.ga<=(s.gf+s.ga)/4).length/p.games,
        0.25,
        (p,v)=>`${p.partien.filter(s=>s.ga<=(s.gf+s.ga)/4).length} von ${p.games} Partien mit höchstens einem Viertel abgegebener Games · ${pct(v)} %`))}},

  {id:'serienbrecher', name:'Der Serienbrecher', short:'Brecher', ic:'flameBreak', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Feuerlöscher',
      art:'koennen',
      klasse:'selten', aus:2.03, streu:0.181, mitte:0.431, n0:13, echt:0.45,
      wie:'Die Serie des Gegners wird für jede Partie neu nachgezählt, mit dem Stand vor der Partie.',
      stichprobe:p => p.brechG,
      cond:'Mindestens 80 % gegen Gegner, die zum Zeitpunkt der Partie drei Siege am Stück tragen, ab 3 solchen Partien',
      ...(_stWertung(
        p=>p.brechG>=ST_TEIL,
        p=>p.brechW/p.brechG,
        0.80,
        (p,v)=>`${p.brechW} von ${p.brechG} gegen eine laufende Serie · ${pct(v)} %`))}},

  {id:'wochenschluss', name:'Der Wochenschluss', short:'Schluss', ic:'wochenschluss', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Vollender',
      art:'koennen',
      klasse:'besonders', aus:1.1, streu:0.29, mitte:0.484, n0:4, echt:0,
      wie:'Der letzte Ball einer Woche ist der, der stehen bleibt, bis wieder gespielt wird.',
      stichprobe:p => _stWochLetzte(p).length,
      cond:'Mindestens 80 % der letzten Partien einer Kalenderwoche gewonnen, ab 3 Wochen mit je 3 Partien',
      ...(_stWertung(
        p=>_stWochLetzte(p).length>=3,
        p=>_stQuote(_stWochLetzte(p)),
        0.80,
        (p)=>{const a=_stWochLetzte(p);
          return `${_stSiege(a)} von ${a.length} Wochenabschlüssen gewonnen`;}))}},

  {id:'rollenfest', name:'Favorit wie Außenseiter', short:'Rollen', ic:'wippe', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Unbeeindruckte',
      art:'konstanz',
      klasse:'besonders', aus:2.16, streu:0.148,
      wie:'Favorit ist über 55 % Siegchance, Außenseiter unter 45 %. Gemessen wird der Abstand zwischen beiden Quoten, nicht wie hoch sie liegen.',
      stichprobe:false,
      cond:'Als klarer Favorit und als Außenseiter höchstens 5 Prozentpunkte auseinander, ab 3 Partien in jeder Lage',
      ...(_stWertung(
        p=>_stRollen(p).fav.length>=ST_TEIL && _stRollen(p).aus.length>=ST_TEIL,
        p=>{const r=_stRollen(p); return -Math.abs(_stQuote(r.fav)-_stQuote(r.aus));},
        -0.05,
        (p)=>{const r=_stRollen(p);
          return `${pct(_stQuote(r.fav))} % als Favorit, ${pct(_stQuote(r.aus))} % als Außenseiter`;}))}},

  {id:'aufstieg', name:'Der Aufstieg', short:'Aufstieg', ic:'stepsUp', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Aufsteiger',
      art:'koennen',
      klasse:'selten', wende:true, aus:1.61, streu:4.35,
      wie:'Verglichen wird der Tabellenplatz am ersten eigenen Spieltag mit dem am letzten Spieltag des Monats. Die Tabelle ist die des Monats, sie startet für alle gleich.',
      stichprobe:false,
      cond:'Im Monat mindestens 8 Plätze in der Liga-Tabelle gewonnen',
      ...(_stWertung(
        p=>p.platzErst != null && p.platzLetzt != null,
        p=>p.platzErst-p.platzLetzt,
        8,
        (p,v)=>`von Platz ${p.platzErst} auf Platz ${p.platzLetzt} · ${_stPlaetze(v, 'nach vorn', 'zurück')}`))}},

  // ── Gegen den eigenen Vormonat [§C39] ─────────────────────────────────
  // Die beiden Chroniken stellen einen Spieler gegen sich selbst, einen
  // Monat früher. Wer im Vormonat schwach war, hat mehr Raum nach oben,
  // und wer ganz oben steht, kann kaum noch steigen: so belohnen sie die
  // Verbesserung und nicht das Niveau.
  {id:'sprung', name:'Der Sprung', short:'Sprung', ic:'vormonatSprung', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Durchstarter',
      art:'koennen',
      klasse:'selten', wende:true, aus:2.14, streu:0.119, mitte:-0.00615, n0:17, echt:0.25,
      wie:'Verglichen wird die eigene Siegquote dieses Monats mit der des Vormonats, in Prozentpunkten. Der Vormonat braucht acht eigene Partien.',
      stichprobe:(p, C) => _stH(p.games, _stVormonat(p, C).games),
      cond:'Siegquote mindestens 25 Prozentpunkte über der des Vormonats, ab 8 Partien im Vormonat',
      ...(_stWertung(
        (p,C)=>p.games>=8 && _stVormonat(p,C)!=null,
        (p,C)=>p.q-_stVormonat(p,C).q,
        0.25,
        (p,v,C)=>`${pct(p.q)} % statt ${pct(_stVormonat(p,C).q)} % im Vormonat`))}},

  {id:'kletterer', name:'Die Kletterpartie', short:'Klettern', ic:'leiterAuf', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Kletterer',
      art:'koennen',
      klasse:'selten', wende:true, aus:2.02, streu:2.31,
      wie:'Verglichen wird der Platz in der Monatstabelle mit dem am Ende des Vormonats. Der Vormonat braucht acht eigene Partien.',
      stichprobe:false,
      cond:'Mindestens 5 Plätze weiter vorn als am Ende des Vormonats, ab 8 Partien im Vormonat',
      ...(_stWertung(
        (p,C)=>p.games>=8 && _stVormonat(p,C)!=null && _stVormonatPlatz(p,C)!=null,
        (p,C)=>{const x=_stVormonatPlatz(p,C);return x.vor-x.jetzt;},
        5,
        (p,v,C)=>{const x=_stVormonatPlatz(p,C);return `von Platz ${x.vor} auf Platz ${x.jetzt} · ${_stPlaetze(v, 'nach vorn', 'zurück')}`;}))}},

  {id:'zitterkoenig', name:'Der Zitterkönig', short:'Zittersieg', ic:'zitterkrone', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Nervenkünstler',
      art:'fuegung',
      klasse:'selten', aus:5.06, streu:0.0857, mitte:0.316, n0:25, echt:0.1,
      wie:'Knapp heißt: Tiebreak, ein Satz für jeden oder höchstens zwei Games Vorsprung. Gezählt wird der Anteil an den eigenen Siegen, nicht an allen Partien.',
      stichprobe:p => p.wins,
      cond:'Mindestens 75 % der Siege des Monats waren knapp, ab 6 Siegen',
      ...(_stWertung(
        p=>p.wins>=6,
        p=>p.partien.filter(s=>s.win&&s.knapp).length/p.wins,
        0.75,
        p=>`${p.partien.filter(s=>s.win&&s.knapp).length} von ${p.wins} Siegen waren knapp`))}},

  {id:'nervenkitzel', name:'Der Nervenkitzel', short:'Kitzel', ic:'thriller', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Dauerzitterer',
      art:'fuegung',
      klasse:'besonders', aus:3.29, streu:0.0623, mitte:-0.00641, n0:42, echt:0,
      wie:'Knapp heißt: Tiebreak, ein Satz für jeden oder höchstens zwei Games Unterschied. Verglichen wird der eigene Anteil mit dem der ganzen Liga.',
      stichprobe:p => p.games,
      cond:'Mindestens 20 Prozentpunkte mehr knappe Partien als im Ligaschnitt',
      ...(_stWertung(
        p=>p.games>=8,
        (p,c)=>p.partien.filter(_stEng).length/p.games-c.L.engAnteil,
        0.20,
        (p,v,c)=>`${pct(p.partien.filter(_stEng).length/p.games)} % knappe Partien · Liga ${pct(c.L.engAnteil)} %`))}},

  {id:'spezialisiert', name:'Der Spezialist', short:'Spezialist', ic:'spezialist', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Fachmann',
      art:'fuegung',
      klasse:'besonders', aus:1.76, streu:0.115, mitte:0, n0:10, echt:0.3,
      wie:'Die Siegquote rechts gegen die links. Ein großer Abstand heißt einseitig, nicht gut.',
      stichprobe:p => _stH(p.drvG, p.revG),
      cond:'Auf einer Seite mindestens 35 Prozentpunkte besser als auf der anderen, ab 3 Partien je Seite',
      ...(_stWertung(
        p=>p.partien.filter(s=>s.pos==='drive').length>=ST_TEIL&&p.partien.filter(s=>s.pos==='reves').length>=ST_TEIL,
        p=>{const a=p.partien.filter(s=>s.pos==='drive'),d=p.partien.filter(s=>s.pos==='reves');
      return Math.abs(_stQuoteRoh(a)-_stQuoteRoh(d));},
        0.35,
        (p,v)=>{const a=p.partien.filter(s=>s.pos==='drive'),d=p.partien.filter(s=>s.pos==='reves');
      return `${pct(v)} %-Punkte Unterschied, stärker ${_stQuoteRoh(a)>_stQuoteRoh(d)?'rechts':'links'}`;}))}},

  {id:'torhagel', name:'Die Langstrecke', short:'Lang', ic:'langstrecke', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Langstreckler',
      art:'fuegung',
      klasse:'besonders', aus:3.41, streu:0.304, mitte:-0.0577, n0:42, echt:0,
      wie:'Die Games je Partie gegen den Schnitt aller Partien desselben Monats. Wer öfter drei Sätze oder lange Tiebreaks spielt, steht vorn.',
      stichprobe:p => p.games,
      cond:'In den eigenen Partien fallen mindestens 4 Games je Partie mehr als im Ligaschnitt des Monats',
      ...(_stWertung(
        p=>p.games>=8,
        (p,c)=>(p.gf+p.ga)/p.games-c.L.gameSchnitt,
        4,
        (p,v,c)=>`${komma((p.gf+p.ga)/p.games)} Games je Partie · Liga ${komma(c.L.gameSchnitt)}`))}},

  {id:'lieblingszahl', name:'Die Lieblingszahl', short:'Die Zahl', ic:'lieblingszahl', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Gewohnheitstäter',
      art:'fuegung',
      klasse:'besonders', aus:3.37, streu:0.0439, mitte:0.16, n0:42, echt:0,
      wie:'Das häufigste Ergebnis der eigenen Partien, Satz für Satz, und der Anteil daran.',
      stichprobe:p => p.games,
      cond:'Ein und dasselbe Ergebnis in mindestens 30 % der eigenen Partien',
      ...(_stWertung(
        p=>p.games>=8,
        p=>{const n={};p.partien.forEach(s=>{const k=s.erg;n[k]=(n[k]||0)+1;});
      const b=Object.keys(n).sort((a,b)=>n[b]-n[a])[0];p._lz={k:b,n:n[b]};return n[b]/p.games;},
        0.30,
        (p,v)=>`${p._lz.n}× ${p._lz.k} · ${pct(v)} % aller Partien`))}},

  {id:'wechselhaft', name:'Der Wechselhafte', short:'Wechsel', ic:'wechselhaft', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Launische',
      art:'fuegung',
      klasse:'besonders', aus:1.63, streu:0.0359,
      wie:'Gemessen wird die Streuung der Tagesquoten um den eigenen Monatsschnitt: groß heißt, kein Tag sah aus wie der andere.',
      stichprobe:false,
      cond:'Die Tagesquoten streuen mindestens 25 Prozentpunkte um die eigene Monatsquote, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=3,
        p=>{const q=Object.values(p.tagGrp).filter(a=>a.length>=3).map(a=>_stQuoteRoh(a));
      return Math.sqrt(q.reduce((x,y)=>x+(y-p.q)*(y-p.q),0)/q.length);},
        0.25,
        (p,v)=>{const q=Object.values(p.tagGrp).filter(a=>a.length>=3).map(a=>_stQuoteRoh(a));
      return `${pct(Math.min(...q))} % am schwächsten, ${pct(Math.max(...q))} % am stärksten Tag`;}))}},

  {id:'kontrast', name:'Der Kontrast', short:'Kontrast', ic:'kontrast', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Kontrastreiche',
      art:'fuegung',
      klasse:'besonders', aus:1.29, streu:0.196,
      wie:'Die Spanne zwischen der Quote neben dem stärksten und der neben dem schwächsten Partner.',
      stichprobe:false,
      cond:'Zwischen bestem und schwächstem Partner mindestens 80 Prozentpunkte, ab 3 Partnern mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.partnerGrp).filter(a=>a.length>=ST_TEIL).length>=3,
        p=>{const q=Object.keys(p.partnerGrp).filter(k=>p.partnerGrp[k].length>=ST_TEIL)
      .map(k=>({k,q:_stQuoteRoh(p.partnerGrp[k])})).sort((a,b)=>b.q-a.q);
      p._ko=q;return q[0].q-q[q.length-1].q;},
        0.8,
        p=>`${pct(p._ko[0].q)} % neben ${pname(p._ko[0].k)}, ${pct(p._ko[p._ko.length-1].q)} % neben ${pname(p._ko[p._ko.length-1].k)}`))}},

  // Das andere Ende von „Favorit wie Außenseiter": dort zaehlt, wer in
  // beiden Lagen gleich gut ist, hier, wer als Aussenseiter OEFTER gewinnt als
  // als Favorit. Die Schwelle liegt ueber dem Band jener Chronik, damit
  // dieselbe Lage nicht zweimal vergeben wird. Wer welche Lage bekommt,
  // entscheidet die Aufstellung — eine Fuegung.
  {id:'quertreiber', name:'Der Quertreiber', short:'Quer', ic:'crossFlip', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Querkopf',
      art:'fuegung',
      klasse:'besonders', aus:3.11, streu:0.136, mitte:-0.365, n0:7.2, echt:0,
      wie:'Favorit heißt über 55 % Siegchance vor der Partie, Außenseiter unter 45 %. Verglichen werden die beiden Siegquoten: als Außenseiter höher als als Favorit ist die Umkehrung dessen, was die Rechnung erwartet.',
      stichprobe:p => (r => _stH(r.fav.length, r.aus.length))(_stRollen(p)),
      cond:'Als Außenseiter mindestens 5 Prozentpunkte öfter gewonnen als als Favorit, ab 3 Partien in jeder Lage',
      ...(_stWertung(
        p=>_stRollen(p).fav.length>=ST_TEIL && _stRollen(p).aus.length>=ST_TEIL,
        p=>{const r=_stRollen(p); return _stQuote(r.aus)-_stQuote(r.fav);},
        0.05,
        (p,v)=>{const r=_stRollen(p);
          return `${_ppLage(v, 'öfter', 'seltener')} gewonnen als Außenseiter · ${pct(_stQuote(r.aus))} % gegen ${_ppGegen(_stQuote(r.aus), v)} % als Favorit`;}))}},

  // Erste und letzte Partie eines Spieltags mit verschiedenem Ergebnis.
  // Wer die Haelfte seiner Partien gewinnt, hat dafuer von selbst die
  // groesste Chance; verglichen wird deshalb mit dem Anteil, den die eigene
  // Monatsbilanz bei zufaelliger Reihenfolge erwarten liesse, 2·S·N durch
  // n·(n−1). Ohne diesen Bezug gehoerte die Chronik dem, der bei 50 % steht.
  {id:'tagesumkehr', name:'Die Tagesumkehr', short:'Umkehr', ic:'uTurn', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Umkehrspieler',
      art:'fuegung',
      klasse:'besonders', aus:1.39, streu:0.17, mitte:0.0167, n0:9, echt:0.5,
      wie:'Gezählt werden die eigenen Spieltage ab drei Partien, an denen das erste und das letzte Ergebnis verschieden waren, egal in welche Richtung. Verglichen wird mit dem Anteil, den die eigene Monatsbilanz bei zufälliger Reihenfolge der Partien erwarten ließe.',
      stichprobe:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length,
      cond:'Mindestens 25 Prozentpunkte mehr Spieltage, die anders endeten als sie begannen, als die eigene Bilanz erwarten lässt, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=ST_TEIL,
        p=>{const t=Object.values(p.tagGrp).filter(a=>a.length>=3);
      const um=t.filter(a=>a[0].win!==a[a.length-1].win).length/t.length;
      return um-2*p.wins*p.losses/(p.games*(p.games-1));},
        0.25,
        (p,v)=>{const t=Object.values(p.tagGrp).filter(a=>a.length>=3);
      return `${_ppLage(v, 'über', 'unter')} der eigenen Bilanz · ${t.filter(a=>a[0].win!==a[a.length-1].win).length} von ${t.length} Spieltagen endeten anders, als sie begannen`;}))}},

  {id:'randlage', name:'Immer am Rand', short:'Am Rand', ic:'search', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Grenzgänger',
      art:'fuegung',
      klasse:'besonders', aus:1.29, streu:0.0503, mitte:0.134, n0:42, echt:0,
      wie:'Keine Leistung, eine Fügung: wem die knappen Partien zufallen, entscheidet niemand selbst.',
      stichprobe:p => p.games,
      cond:'Mindestens 20 % der eigenen Partien wurden im Tiebreak entschieden',
      ...(_stWertung(
        p=>p.games>=TITLE_MIN_GAMES,
        p=>_stEinTor(p).length/p.games,
        0.20,
        (p,v)=>`${_stEinTor(p).length} von ${p.games} Partien im Tiebreak entschieden · ${pct(v)} %`))}},

  // Das Gegenstueck zum Nervenkitzel: dort zaehlen die knappen Partien gegen das
  // Ligamittel, hier die deutlichen. Wie deutlich es ausgeht, entscheidet die
  // Paarung so sehr wie das Spiel — eine Fuegung. Sieben Tore sind dieselbe
  // Grenze wie beim Kantersieg des Zerstoerers.
  {id:'klartext', name:'Klare Verhältnisse', short:'Klartext', ic:'klartext', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Kompromisslose',
      art:'fuegung',
      klasse:'besonders', aus:2.09, streu:0.0451, mitte:0.00989, n0:42, echt:0,
      wie:'Deutlich heißt: kein Satz abgegeben und mindestens drei Viertel der Games, in beide Richtungen. Verglichen wird der eigene Anteil mit dem aller Partien desselben Monats.',
      stichprobe:p => p.games,
      cond:'Mindestens 10 Prozentpunkte mehr deutlich entschiedene Partien als im Ligaschnitt',
      ...(_stWertung(
        p => p.games >= TITLE_MIN_GAMES,
        (p, c) => p.partien.filter(s => s.deutlich).length / p.games - c.L.klarAnteil,
        0.10,
        (p, v, c) => `${pct(p.partien.filter(s => s.deutlich).length / p.games)} % deutlich entschieden · Liga ${pct(c.L.klarAnteil)} %`))}},

  // Wo jemand steht, gegen die eigene Laufbahn davor: ein Stuermer, der einen
  // Monat lang hinten aushilft, oder umgekehrt. Die Aufstellung entscheidet,
  // also eine Fuegung; in beide Richtungen, weil keine besser ist.
  {id:'rollentausch', name:'Der Rollentausch', short:'Tausch', ic:'rollentausch', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Rollenwechsler',
      art:'fuegung',
      klasse:'besonders', aus:2.44, streu:0.0662, mitte:0, n0:42, echt:0.85,
      wie:'Der Anteil der Partien rechts dieses Monats gegen den Anteil in allen eigenen Partien davor, in beide Richtungen. Gewertet wird nur, wer davor schon dreißig Partien hatte.',
      stichprobe:p => p.games,
      cond:'Mindestens 25 Prozentpunkte mehr oder weniger rechts als in der eigenen Laufbahn davor, ab 15 Partien davor',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && _stLaufbahnVor(p, C) != null,
        (p, C) => Math.abs(p.drvG / p.games - _stLaufbahnVor(p, C).atk),
        0.25,
        (p, v, C) => `${pct(p.drvG / p.games)} % rechts statt ${pct(_stLaufbahnVor(p, C).atk)} % in der Laufbahn davor`))}},

  // Was ein Wechsel der Seite am selben Tag bewirkt, gegen die Partien
  // auf derselben Seite (`_stPlatzwechsel`). Eine Fügung in beide
  // Richtungen: der eine spielt nach dem Wechsel auf, der andere auf dem
  // Platz, den er schon hatte. Gemessen hängt der Unterschied mit keiner
  // anderen Chronik enger als 0,36 zusammen.
  {id:'platztausch', name:'Der Platztausch', short:'Umstieg', ic:'platztausch', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Rollenspringer',
      art:'fuegung',
      klasse:'besonders', aus:1.93, streu:0.135, mitte:-0.0142, n0:8.9, echt:0,
      wie:'Verglichen werden die Partien nach einem Wechsel der Seite am selben Tag mit denen auf derselben Seite wie zuvor, beide gegen die Siegchance, die die Elo-Rechnung ihnen gab.',
      stichprobe:p => (x => x ? _stH(x.w.length, x.b.length) : 0)(_stPlatzwechsel(p)),
      cond:'Nach einem Wechsel der Seite am selben Tag mindestens 25 Prozentpunkte weiter über der Rechnung als auf derselben Seite, ab 3 Partien in jeder Gruppe',
      ...(_stWertung(
        p => _stPlatzwechsel(p) != null,
        p => _stPlatzwechsel(p).d,
        0.25,
        (p, v) => { const x = _stPlatzwechsel(p);
          return `${_stSiege(x.w)} von ${x.w.length} nach einem Wechsel, ${_stSiege(x.b)} von ${x.b.length} auf derselben Seite · ${_ppZeichen(v)} %-Punkte`; }))}},

  {id:'festhalten', name:'Das Festhalten', short:'Halten', ic:'festhalten', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Ortstreue',
      art:'fuegung',
      klasse:'besonders', aus:2.15, streu:0.135, mitte:0.0142, n0:8.9, echt:0,
      wie:'Verglichen werden die Partien auf derselben Seite wie zuvor mit denen nach einem Wechsel der Seite am selben Tag, beide gegen die Siegchance, die die Elo-Rechnung ihnen gab.',
      stichprobe:p => (x => x ? _stH(x.w.length, x.b.length) : 0)(_stPlatzwechsel(p)),
      cond:'Auf derselben Seite wie in der Partie davor mindestens 30 Prozentpunkte weiter über der Rechnung als nach einem Wechsel, ab 3 Partien in jeder Gruppe',
      ...(_stWertung(
        p => _stPlatzwechsel(p) != null,
        p => -_stPlatzwechsel(p).d,
        0.3,
        (p, v) => { const x = _stPlatzwechsel(p);
          return `${_stSiege(x.b)} von ${x.b.length} auf derselben Seite, ${_stSiege(x.w)} von ${x.w.length} nach einem Wechsel · ${_ppZeichen(v)} %-Punkte`; }))}},

  // ── Besonderheiten gegen das Eigene und gegen die Spitze [§C39] ─────
  // Sieben Chroniken, die nicht fragen, wer der Beste ist, sondern worin
  // jemand anders spielt als sonst oder als die Liga: vorne mehr als hinten,
  // hinten weniger als sonst, neben neuen Partnern, in der Revanche, gegen
  // die beiden Ersten, gegen Gegner, die er schon kennt, und nach einem Sieg.
  // Gemessen gingen in den Fixture-Monaten Juni bis August 21 bis 28 Einträge
  // an neun oder zehn Spieler, und Jannik, Jane oder Maxi standen in manchem
  // Monat leer da; diese gehen an Alex, Jannik, Jane, Julian, Johannes und
  // Martin — fünf der sechs nicht auf Platz eins. Dazu das Gegenstück zum
  // Sprung als Schattenseite.
  {id:'neuland', name:'Neuland', short:'Neuland', ic:'neuland', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Brückenbauer',
      art:'koennen',
      klasse:'besonders', aus:1.51, streu:0.138, mitte:-0.0336, n0:16, echt:0.3,
      wie:'Nur die Partien neben einem Partner, mit dem es vor diesem Monat keine einzige gab. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:(p, C) => _stNeuland(p, C).length,
      cond:'Neben neuen Partnern mindestens 20 Prozentpunkte über der Rechnung, ab 3 solchen Partien',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && _stNeuland(p, C).length >= ST_TEIL,
        (p, C) => _stUeberSoll(_stNeuland(p, C)),
        0.20,
        (p, v, C) => { const a = _stNeuland(p, C);
          return `${_stSiege(a)} von ${a.length} Partien neben neuen Partnern · ${_ppLage(v, 'über', 'unter')} der Rechnung`; }))}},

  {id:'revanche', name:'Die Revanche', short:'Revanche', ic:'revanche', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Revanchist',
      art:'koennen',
      klasse:'selten', wende:true, aus:1.81, streu:0.219, mitte:0.059, n0:5, echt:0,
      wie:'Eine Revanche ist die nächste eigene Partie am selben Tag gegen dieselben zwei Gegner, direkt nach einer Niederlage gegen sie. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:p => _stRevanchen(p).length,
      cond:'Revanchen mindestens 45 Prozentpunkte häufiger gewonnen, als die Elo-Rechnung erwartet hat, ab 3 Revanchen',
      ...(_stWertung(
        p => p.games >= TITLE_MIN_GAMES && _stRevanchen(p).length >= 3,
        p => _stUeberSoll(_stRevanchen(p)),
        0.45,
        p => { const a = _stRevanchen(p); return `${_stSiege(a)} von ${a.length} Revanchen gewonnen · erwartet ${pct(_stSoll(a)/a.length)} %`; }))}},

  // Die Revanche mit einer Nacht dazwischen: das erste Wiedersehen mit
  // denselben zwei Gegnern an einem späteren Tag, nachdem das letzte Duell
  // gegen sie verloren ging (`_stSpaeteRevanchen`).
  {id:'spaeterevanche', name:'Die späte Revanche', short:'Rache', ic:'spaeteRevanche', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Nachtragende',
      art:'koennen',
      klasse:'selten', wende:true, aus:1.7, streu:0.139, mitte:-0.0344, n0:12, echt:0.6,
      wie:'Nur die erste Partie gegen dieselben zwei Gegner an einem späteren Tag, wenn die letzte gegen sie verloren ging. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:p => _stSpaeteRevanchen(p).length,
      cond:'Im ersten Wiedersehen mit denselben zwei Gegnern an einem späteren Tag nach einer Niederlage gegen sie mindestens 20 Prozentpunkte über der Rechnung, ab 3 solchen Partien',
      ...(_stWertung(
        p => _stSpaeteRevanchen(p).length >= ST_TEIL,
        p => _stUeberSoll(_stSpaeteRevanchen(p)),
        0.2,
        (p, v) => { const a = _stSpaeteRevanchen(p);
          return `${_stSiege(a)} von ${a.length} Wiedersehen nach einer Niederlage · ${_ppLage(v, 'über', 'unter')} der Rechnung`; }))}},

  {id:'spielverderber', name:'Der Spielverderber', short:'Störfeuer', ic:'kroneRiss', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Gipfelstürmer',
      art:'koennen',
      klasse:'selten', aus:1.92, streu:0.114, mitte:-0.0711, n0:21, echt:0.55,
      wie:'Nur die Partien gegen die beiden Ersten der Monatstabelle. Der Erste selbst wird nicht gewertet. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:(p, C) => _stSpitzeGegen(p, C).length,
      cond:'Gegen die beiden Ersten der Monatstabelle mindestens 15 Prozentpunkte über der Rechnung, ab 3 solchen Partien',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && C.rankAll[0] && C.rankAll[0].id !== p.pid && _stSpitzeGegen(p, C).length >= ST_TEIL,
        (p, C) => _stUeberSoll(_stSpitzeGegen(p, C)),
        0.15,
        (p, v, C) => { const a = _stSpitzeGegen(p, C);
          return `${_stSiege(a)} von ${a.length} Partien gegen die Spitze · ${_ppLage(v, 'über', 'unter')} der Rechnung`; }))}},

  {id:'lernkurve', name:'Die Lernkurve', short:'Lernkurve', ic:'lernkurve', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Lernfähige',
      art:'koennen',
      klasse:'selten', wende:true, aus:2.21, streu:0.155, mitte:0.00901, n0:81, echt:0.6,
      wie:'Gegen jeden Gegner mit mindestens vier Duellen im Monat zählt, um wie viel die zweite Hälfte der Duelle über der Rechnung lag, verglichen mit der ersten. Gemittelt wird über alle solchen Gegner.',
      stichprobe:p => Object.values(p.gegnerGrp).filter(a => a.length >= 4).reduce((n, a) => n + a.length, 0),
      cond:'Gegen bekannte Gegner im Mittel mindestens 35 Prozentpunkte stärker als zu Beginn, ab 3 Gegnern mit je 4 Duellen',
      ...(_stWertung(
        p => p.games >= TITLE_MIN_GAMES && _stLernkurve(p) != null,
        p => _stLernkurve(p).v,
        0.35,
        (p, v) => `gegen ${_stLernkurve(p).n} Gegner zuletzt ${_ppLage(v, 'stärker', 'schwächer')} als zu Beginn`))}},

  // Die Laufbahn gegen einen Gegner auf den Monat geholt [§C39]: gegen den,
  // gegen den es davor am schlechtesten lief, im Monat besser als davor. Die
  // Lernkurve daneben vergleicht zwei Hälften desselben Monats, der Ausbruch
  // eine einzelne Serie; hier steht die Quote gegen ihn in diesem Monat gegen
  // die ganze Laufbahn davor. Gemessen an den echten Partien hängt der Wert
  // mit 0,1 an der Siegquote und an der Spielzahl.
  {id:'bannbrecher', name:'Der Bannbrecher', short:'Bannbruch', ic:'bannbruch', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Überwinder',
      art:'koennen',
      klasse:'selten', wende:true, aus:1.41, streu:0.128, mitte:0.069, n0:7.6, echt:1,
      wie:'Gewertet wird der Gegner, gegen den die eigene Laufbahn vor diesem Monat am schlechtesten aussah, unter denen mit mindestens zehn Duellen davor, vier Duellen im Monat und einer Quote unter der eigenen Laufbahnquote. Verglichen wird die Quote gegen diesen Gegner in diesem Monat mit der Quote gegen denselben Gegner davor.',
      stichprobe:(p, C) => (x => x ? _stH(x.mn, x.kn) : 0)(_stDuellWende(p, C, -1)),
      cond:'Gegen den schwierigsten Gegner der Laufbahn mindestens 25 Prozentpunkte besser als davor, ab 10 Duellen davor, 4 im Monat und 30 Partien in der Laufbahn',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && _stDuellWende(p, C, -1) != null,
        (p, C) => { const x = _stDuellWende(p, C, -1); return x.mq - x.kq; },
        0.25,
        (p, v, C) => { const x = _stDuellWende(p, C, -1);
          return `${_ppZeichen(v)} %-Punkte gegen ${pname(x.fid)} · ${x.mw} von ${x.mn} Duellen, davor ${pct(x.kq)} % in ${x.kn}`; }))}},

  // Der Gegner, den der Monat am häufigsten gegenüberstellte (`_stRivale`),
  // gegen die Rechnung. Der Bannbrecher davor fragt nach dem schwierigsten
  // Gegner der Laufbahn; hier wählt der Monat selbst, und wer viel spielt,
  // hat gegen den Rivalen eine große Stichprobe, die schwer zu reißen ist,
  // wenn nur der Zufall spielt.
  {id:'stammduell', name:'Das Stammduell', short:'Duell', ic:'stammduell', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Duellsieger',
      art:'koennen',
      klasse:'selten', aus:2.32, streu:0.298,
      wie:'Gewertet wird der Gegner mit den meisten Duellen im Monat. Aus den Siegchancen aller Duelle gegen diesen Gegner folgt, wie wahrscheinlich mindestens so viele Siege waren.',
      stichprobe:false,
      cond:'Gegen den häufigsten Gegner des Monats so oft gewonnen, wie es die Rechnung mit höchstens 10 % erwartet hat, ab 6 Duellen',
      ...(_stWertung(
        p => { const r = _stRivale(p); return !!r && r.a.length >= 6; },
        p => _stUnwahr(_stRivale(p).a),
        1,
        (p, v) => { const r = _stRivale(p);
          return `${_stSiege(r.a)} von ${r.a.length} Duellen gegen ${pname(r.fid)} · die Rechnung gab dafür ${komma(Math.pow(10, -v) * 100, 1)} %`; }))}},

  {id:'nachlegen', name:'Das Nachlegen', short:'Nachlegen', ic:'nachlegen', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Nachleger',
      art:'koennen',
      klasse:'besonders', aus:1.81, streu:0.0999, mitte:-0.0357, n0:18, echt:0.55,
      wie:'Nur die Partien am selben Tag direkt nach einem Sieg. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:p => _stNachSieg(p).length,
      cond:'Nach einem Sieg mindestens 15 Prozentpunkte über der Rechnung, ab 3 solchen Partien',
      ...(_stWertung(
        p => p.games >= TITLE_MIN_GAMES && _stNachSieg(p).length >= ST_TEIL,
        p => _stUeberSoll(_stNachSieg(p)),
        0.15,
        (p, v) => { const a = _stNachSieg(p);
          return `${_stSiege(a)} von ${a.length} Partien nach einem Sieg · ${_ppLage(v, 'über', 'unter')} der Rechnung`; }))}},

  // Der Monat gegen die eigene Laufbahn davor [§C39]. „Der Sprung" stellt ihn
  // gegen den Vormonat, „Das Übersoll" gegen die Rechnung; hier steht das,
  // was jemand gewoehnlich spielt. Gegen das Eigene gemessen und damit fuer
  // jede Staerke erreichbar: in den Fixture-Monaten hielten ihn der Zehnte
  // und der Zweite der Siegquote, und die Spielzahl haengt nicht daran
  // (r = 0,10).
  {id:'ausnahmemonat', name:'Der Ausnahmemonat', short:'Ausnahme', ic:'ausnahmemonat', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Überflieger',
      art:'koennen',
      klasse:'selten', aus:1.57, streu:0.0898, mitte:0.00918, n0:42, echt:1,
      wie:'Die Siegquote dieses Monats gegen die Siegquote aller eigenen Partien vor diesem Monat. Gewertet wird nur, wer davor schon dreißig Partien hatte.',
      stichprobe:p => p.games,
      cond:'Siegquote mindestens 15 Prozentpunkte über der eigenen Laufbahn vor diesem Monat, ab 15 Partien davor',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && _stLaufbahnVor(p, C) != null,
        (p, C) => p.q - _stLaufbahnVor(p, C).q,
        0.15,
        (p, v, C) => { const l = _stLaufbahnVor(p, C);
          return `${pct(p.q)} % statt ${pct(l.q)} % in ${l.g} Partien davor`; }))}},

  {id:'absturz', name:'Der Absturz', short:'Absturz', ic:'absturz', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Abgestürzte',
      art:'schatten',
      klasse:'schatten', aus:1.65, streu:0.119, mitte:0.00615, n0:17, echt:0.25,
      wie:'Die eigene Siegquote dieses Monats gegen die des Vormonats, in Prozentpunkten. Der Vormonat braucht acht eigene Partien.',
      stichprobe:(p, C) => _stH(p.games, _stVormonat(p, C).games),
      cond:'Siegquote mindestens 20 Prozentpunkte unter der des Vormonats, ab 8 Partien im Vormonat',
      ...(_stWertung(
        (p, C) => p.games >= 8 && _stVormonat(p, C) != null,
        (p, C) => _stVormonat(p, C).q - p.q,
        0.20,
        (p, v, C) => `${pct(p.q)} % statt ${pct(_stVormonat(p, C).q)} % im Vormonat`))}},

  // Das Gegenstück zur Kletterpartie: Plätze in der Monatstabelle gegen das
  // Ende des Vormonats. Der Absturz davor vergleicht die Siegquote.
  {id:'abrutsch', name:'Der Abrutsch', short:'Abrutsch', ic:'abrutsch', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Abgerutschte',
      art:'schatten',
      klasse:'schatten', aus:2.16, streu:2.35,
      stichprobe:false,
      cond:'Mindestens 5 Plätze weiter hinten als am Ende des Vormonats, ab 8 Partien im Vormonat',
      ...(_stWertung(
        (p, C) => p.games >= 8 && _stVormonat(p, C) != null && _stVormonatPlatz(p, C) != null,
        (p, C) => { const x = _stVormonatPlatz(p, C); return x.jetzt - x.vor; },
        5,
        (p, v, C) => { const x = _stVormonatPlatz(p, C); return `von Platz ${x.vor} auf Platz ${x.jetzt} · ${_stPlaetze(v, 'zurück', 'nach vorn')}`; }))}},

  // Das Zielwasser andersherum: rechts weniger getroffen als in den
  // Partien rechts der Laufbahn davor. Die Ladehemmung vergleicht mit dem
  // eigenen Mittel im selben Monat.
  {id:'klatsche', name:'Die Klatsche', short:'Klatsche', ic:'klatsche', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Gerupfte',
      art:'schatten',
      klasse:'schatten', aus:0.43, streu:0.0937, mitte:0.16, n0:20, echt:0,
      wie:'Eine Klatsche ist eine deutliche Niederlage: kein Satz gewonnen und höchstens ein Viertel der Games. Gezählt wird ihr Anteil an den eigenen Niederlagen des Monats, nicht an allen Partien.',
      stichprobe:p => p.losses,
      cond:'Mindestens 40 % der eigenen Niederlagen waren Klatschen, ab 3 Niederlagen',
      ...(_stWertung(
        p => p.losses >= ST_TEIL,
        p => p.partien.filter(s => !s.win && s.deutlich).length / p.losses,
        0.40,
        (p, v) => `${pct(v)} % aller ${p.losses} Niederlagen waren Klatschen · ${p.partien.filter(s => !s.win && s.deutlich).length} Stück`))}},

  // ── Schattenseiten gegen das Eigene [§C39] ─────────────────────────
  // Sieben Gegenstücke zu Chroniken, die es schon gibt: was dort über dem
  // eigenen Rest liegt, liegt hier darunter. Sie fragen wie ihre Vorbilder
  // gegen das Eigene oder gegen die Rechnung, nicht nach dem Niveau — eine
  // Schattenseite auf das Niveau gehoerte immer dem Schwaechsten der Liga.
  // Gemessen gehen sie in den Fixture-Monaten an Alex, Henry, Jannik,
  // Johannes und Stefan, keiner auf den ersten drei Plaetzen eines Monats.
  {id:'fehlstart', name:'Der Fehlstart', short:'Fehlstart', ic:'fehlstart', tone:'red', art:'schatten',
    monat:{
      beiname:'Die Schlafmütze',
      art:'schatten',
      klasse:'schatten', aus:2.15, streu:0.177, mitte:0.0241, n0:6.4, echt:0.1,
      wie:'Gewertet wird die zeitlich erste Partie jedes eigenen Spieltags gegen alle anderen dieses Tages, ab drei Partien je Tag.',
      stichprobe:p => (b => b ? _stH(b.n, b.m) : 0)(_stErsterBall(p, 3)),
      cond:'In der ersten Partie eines Spieltags mindestens 40 Prozentpunkte schwächer als in den übrigen, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p => _stErsterBall(p, 3) != null,
        p => -_stErsterBall(p, 3).d,
        0.40,
        p => { const s = _stErsterBall(p, 3);
          return `${pct(s.drin)} % in ${s.n} Startspielen, ${pct(s.raus)} % danach`; }))}},

  {id:'kraefteverfall', name:'Der Kräfteverfall', short:'Verfall', ic:'kraefteverfall', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Ausgelaugte',
      art:'schatten',
      klasse:'schatten', aus:2.14, streu:0.127, mitte:-0.0291, n0:10, echt:0,
      wie:'Der Vergleich läuft innerhalb der eigenen Spieltage: ab der vierten Partie gegen die ersten drei desselben Tages.',
      stichprobe:p => (b => _stH(b.frueh.length, b.spaet.length))(_stTagBlock(p)),
      cond:'Ab der vierten Partie eines Spieltags mindestens 25 Prozentpunkte schwächer als in den ersten drei, ab 3 Partien in jedem Block',
      ...(_stWertung(
        p => _stTagBlock(p).frueh.length >= 3 && _stTagBlock(p).spaet.length >= 3,
        p => { const b = _stTagBlock(p); return _stQuote(b.frueh) - _stQuote(b.spaet); },
        0.25,
        p => { const b = _stTagBlock(p);
          return `${pct(_stQuote(b.spaet))} % ab der vierten Partie, ${pct(_stQuote(b.frueh))} % davor`; }))}},

  // Das Gegenstück zum letzten Ball: die letzte Partie eines Spieltags
  // gegen die übrigen desselben Tages, nur mit umgekehrtem Vorzeichen.
  {id:'abgesang', name:'Der Abgesang', short:'Abgesang', ic:'abgesang', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Schlussmüde',
      art:'schatten',
      klasse:'schatten', aus:1.77, streu:0.189, mitte:0.0122, n0:6.4, echt:0,
      wie:'Die letzte Partie jedes eigenen Spieltags gegen alle anderen dieses Tages. Ein Tag zählt ab drei Partien.',
      stichprobe:p => (b => b ? _stH(b.n, b.m) : 0)(_stSchlussBall(p, 3)),
      cond:'In der letzten Partie eines Spieltags mindestens 35 Prozentpunkte schwächer als in den übrigen, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p => _stSchlussBall(p, 3) != null,
        p => -_stSchlussBall(p, 3).d,
        0.35,
        p => { const s = _stSchlussBall(p, 3); return `${pct(s.drin)} % in ${s.n} Schlussspielen, ${pct(s.raus)} % davor`; }))}},

  {id:'einbruch', name:'Der Einbruch', short:'Einbruch', ic:'einbruch', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Nachlassende',
      art:'schatten',
      klasse:'schatten', aus:1.75, streu:0.15, mitte:-0.00755, n0:11, echt:0,
      wie:'Die Spieltage des Monats werden in der Mitte geteilt und die beiden Quoten desselben Spielers verglichen.',
      stichprobe:p => (h => h ? _stH(h.n1, h.n2) : 0)(_stHaelften(p)),
      cond:'In der zweiten Hälfte des Monats mindestens 25 Prozentpunkte schwächer als in der ersten, ab 4 Partien je Hälfte',
      ...(_stWertung(
        p => _stHaelften(p) != null,
        p => { const h = _stHaelften(p); return h.q1 - h.q2; },
        0.25,
        p => { const h = _stHaelften(p);
          return `${pct(h.q2)} % in der zweiten Hälfte, ${pct(h.q1)} % in der ersten`; }))}},

  // Das Gegenstück zum Nachzügler: stark in den Monat, schwach hinaus.
  {id:'strohfeuer', name:'Das Strohfeuer', short:'Stroh', ic:'strohfeuer', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Verglühte',
      art:'schatten',
      klasse:'schatten', aus:2.23, streu:0.283,
      wie:'Verglichen werden die ersten fünf und die letzten fünf eigenen Partien des Monats, nicht die beiden Hälften.',
      stichprobe:false,
      cond:'In den ersten 3 Partien des Monats mindestens 3 Siege mehr als in den letzten 5',
      ...(_stWertung(
        p => p.games >= 8,
        p => (_stSiege(p.partien.slice(0, 5)) - _stSiege(p.partien.slice(-5))) / 5,
        0.6,
        p => `${_stSiege(p.partien.slice(0, 5))} von 5 zum Auftakt, ${_stSiege(p.partien.slice(-5))} von 5 zum Schluss`))}},

  {id:'sattheit', name:'Die Sattheit', short:'Satt', ic:'sattheit', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Satte',
      art:'schatten',
      klasse:'schatten', aus:2.2, streu:0.0999, mitte:0.0357, n0:18, echt:0.55,
      wie:'Nur die Partien am selben Tag direkt nach einem Sieg. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:p => _stNachSieg(p).length,
      cond:'Nach einem Sieg mindestens 25 Prozentpunkte unter der Rechnung, ab 3 solchen Partien',
      ...(_stWertung(
        p => p.games >= TITLE_MIN_GAMES && _stNachSieg(p).length >= ST_TEIL,
        p => -_stUeberSoll(_stNachSieg(p)),
        0.25,
        (p, v) => { const a = _stNachSieg(p);
          return `${_stSiege(a)} von ${a.length} Partien nach einem Sieg · ${_ppLage(v, 'unter', 'über')} der Rechnung`; }))}},

  {id:'ehrfurcht', name:'Die Ehrfurcht', short:'Ehrfurcht', ic:'ehrfurcht', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Ehrfürchtige',
      art:'schatten',
      klasse:'schatten', aus:2.02, streu:0.114, mitte:0.0711, n0:21, echt:0.55,
      wie:'Nur die Partien gegen die beiden Ersten der Monatstabelle. Der Erste selbst wird nicht gewertet. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:(p, C) => _stSpitzeGegen(p, C).length,
      cond:'Gegen die beiden Ersten der Monatstabelle mindestens 30 Prozentpunkte unter der Rechnung, ab 3 solchen Partien',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && C.rankAll[0] && C.rankAll[0].id !== p.pid && _stSpitzeGegen(p, C).length >= ST_TEIL,
        (p, C) => -_stUeberSoll(_stSpitzeGegen(p, C)),
        0.30,
        (p, v, C) => { const a = _stSpitzeGegen(p, C);
          return `${_stSiege(a)} von ${a.length} Partien gegen die Spitze · ${_ppLage(v, 'unter', 'über')} der Rechnung`; }))}},

  {id:'rueckfall', name:'Der Rückfall', short:'Rückfall', ic:'rueckfall', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Vergessliche',
      art:'schatten',
      klasse:'schatten', aus:1.66, streu:0.155, mitte:-0.00901, n0:81, echt:0.6,
      wie:'Gegen jeden Gegner mit mindestens vier Duellen im Monat zählt, um wie viel die zweite Hälfte der Duelle unter der Rechnung lag, verglichen mit der ersten. Gemittelt wird über alle solchen Gegner.',
      stichprobe:p => Object.values(p.gegnerGrp).filter(a => a.length >= 4).reduce((n, a) => n + a.length, 0),
      cond:'Gegen bekannte Gegner im Mittel mindestens 25 Prozentpunkte schwächer als zu Beginn, ab 3 Gegnern mit je 4 Duellen',
      ...(_stWertung(
        p => p.games >= TITLE_MIN_GAMES && _stLernkurve(p) != null,
        p => -_stLernkurve(p).v,
        0.25,
        (p, v) => `gegen ${_stLernkurve(p).n} Gegner zuletzt ${_ppLage(v, 'schwächer', 'stärker')} als zu Beginn`))}},

  // Das Gegenstück zu Neuland: neben Partnern, mit denen es vor diesem
  // Monat keine Partie gab, unter der Rechnung.
  {id:'fremdeln', name:'Das Fremdeln', short:'Fremdeln', ic:'fremdeln', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Fremdelnde',
      art:'schatten',
      klasse:'schatten', aus:2.1, streu:0.138, mitte:0.0336, n0:16, echt:0.3,
      wie:'Nur die Partien neben einem Partner, mit dem es vor diesem Monat keine einzige gab. Verglichen wird die Quote darin mit der Siegchance, die die Elo-Rechnung diesen Partien gab.',
      stichprobe:(p, C) => _stNeuland(p, C).length,
      cond:'Neben neuen Partnern mindestens 30 Prozentpunkte unter der Rechnung, ab 3 solchen Partien',
      ...(_stWertung(
        (p, C) => p.games >= TITLE_MIN_GAMES && _stNeuland(p, C).length >= ST_TEIL,
        (p, C) => -_stUeberSoll(_stNeuland(p, C)),
        0.30,
        (p, v, C) => { const a = _stNeuland(p, C);
          return `${_stSiege(a)} von ${a.length} Partien neben neuen Partnern · ${_ppLage(v, 'unter', 'über')} der Rechnung`; }))}},

  // Der Ausreißer andersherum: ein Spieltag, den die Rechnung so schlecht
  // kaum erwartete. Die schwarze Woche fragt nach dem Abstand über eine
  // Woche; hier zählt die Wahrscheinlichkeit eines Tages (`_stUnwahr`).
  {id:'vergessen', name:'Der Tag zum Vergessen', short:'Vergessen', ic:'tagVergessen', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Gestrauchelte',
      art:'schatten',
      klasse:'schatten', aus:2.63, streu:0.407,
      wie:'Die Elo-Erwartung auf einen Tag zusammengezogen: wie wahrscheinlich höchstens so wenige Siege an diesem Tag waren. Gewertet wird der unwahrscheinlichste eigene Spieltag.',
      stichprobe:false,
      cond:'Ein Spieltag, den die Rechnung mit höchstens 2 % so schlecht erwartet hat, ab 4 Partien am Tag',
      ...(_stWertung(
        p => Object.values(p.tagGrp).some(a => a.length >= 4),
        p => Math.max(...Object.values(p.tagGrp).filter(a => a.length >= 4).map(a => _stUnwahr(a, true))),
        1.6989700043360187,
        (p, v) => { const a = Object.values(p.tagGrp).filter(a => a.length >= 4)
            .find(a => Math.abs(_stUnwahr(a, true) - v) < 1e-12);
          return `${_stSiege(a)} von ${a.length} an einem Tag · so wenige gab die Rechnung zu ${komma(Math.pow(10, -v) * 100, 1)} %`; }))}},

  // Die schwaechste eigene Woche gegen die Rechnung. „Ohne schwache Woche"
  // fragt, ob es keine gab; hier zaehlt, wie tief die eine war.
  {id:'schwarzewoche', name:'Die schwarze Woche', short:'Woche', ic:'wochenloch', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Gebeutelte',
      art:'schatten',
      klasse:'schatten', aus:1.83, streu:0.123, mitte:0.13, n0:45, echt:0.4,
      wie:'Eine Woche zählt ab fünf eigenen Partien. Verglichen wird die Quote dieser Woche mit der Siegchance, die die Elo-Rechnung den Partien darin gab; gewertet wird die schwächste solche Woche des Monats.',
      stichprobe:p => p.games,
      cond:'Eine Woche mindestens 35 Prozentpunkte unter der Rechnung, ab 2 Wochen mit je 3 Partien',
      ...(_stWertung(
        p => _stWochen(p).length >= 2,
        p => -Math.min(..._stWochen(p).map(a => _stUeberSoll(a))),
        0.35,
        (p, v) => { const a = _stWochen(p).slice().sort((x, y) => _stUeberSoll(x) - _stUeberSoll(y))[0];
          return `${_stSiege(a)} von ${a.length} Partien in der schwächsten Woche · ${_ppLage(v, 'unter', 'über')} der Rechnung`; }))}},

  // ── Wie viel jemand dabei war, gegen die eigenen Monate davor [§C39] ──
  // Kein Pensum: wer am meisten spielt, haelt keine der beiden. Gefragt ist
  // der eigene Anteil an allen Partien des Monats gegen den eigenen Anteil
  // davor (`_stAnteilVor`), also wer DEUTLICH mehr oder weniger dabei war
  // als sonst. Gemessen hielt den Aufdreher Johannes, Neunter der
  // Siegquote, und den Rueckzug Henry. Der Aufdreher ist eine Fuegung und
  // zaehlt halb: Anwesenheit ist kein Koennen [§C34], und der Rueckzug ist
  // eine Schattenseite und zaehlt nichts.
  {id:'aufdreher', name:'Der Aufdreher', short:'Aufdreher', ic:'aufdreher', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Eifrige',
      art:'fuegung',
      klasse:'besonders', aus:2.62, streu:0.732,
      wie:'Der eigene Anteil an allen Partien des Monats gegen den eigenen Anteil in den Monaten davor, gemittelt über die Monate mit mindestens acht eigenen Partien. Gefragt ist nicht, wer am meisten spielt, sondern wer deutlich mehr dabei ist als sonst.',
      stichprobe:false,
      cond:'Mindestens dreimal so großer Anteil an den Partien des Monats wie in den Monaten davor mit je 8 Partien',
      ...(_stWertung(
        (p, C) => _stAnteilVor(p, C) != null,
        (p, C) => (p.games / C.ms.length) / _stAnteilVor(p, C).anteil,
        3,
        (p, v, C) => `${pct(p.games / C.ms.length)} % aller Partien des Monats statt ${pct(_stAnteilVor(p, C).anteil)} % davor`))}},

  {id:'rueckzug', name:'Der Rückzug', short:'Rückzug', ic:'rueckzug', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Zurückgezogene',
      art:'schatten',
      klasse:'schatten', aus:1.22, streu:0.733,
      wie:'Der eigene Anteil an allen Partien des Monats gegen den eigenen Anteil in den Monaten davor, gemittelt über die Monate mit mindestens acht eigenen Partien. Gewertet wird der Rückgang.',
      stichprobe:false,
      cond:'Höchstens ein Viertel des eigenen Anteils an den Partien aus den Monaten davor mit je 8 Partien',
      ...(_stWertung(
        (p, C) => _stAnteilVor(p, C) != null,
        (p, C) => -(p.games / C.ms.length) / _stAnteilVor(p, C).anteil,
        -0.25,
        (p, v, C) => `${pct(p.games / C.ms.length)} % aller Partien des Monats statt ${pct(_stAnteilVor(p, C).anteil)} % davor`))}}
];

// Die beiden Wertungen als eigene Listen — die Engines darunter bleiben
// unverändert. Wer eine Disziplin ohne `monat` anlegt, taucht in der
// Saison-Tafel nicht auf; wer keine `allzeit` hat, hat keinen Rekord.
// Die Monatschroniken haben ihre eigene Wertigkeit und stehen deshalb nicht
// in der Reihenfolge des Katalogs: drei von ihnen sitzen oben bei ihrer
// Allzeitwertung, weil dieselbe Frage auf zwei Zeitachsen in EINE Disziplin
// gehoert. Sortiert wird nach Art und darin nach dem Ausschlag der Schwelle —
// das ist dieselbe Ordnung, in der auch das Prestige faellt [§C39].
DISZIPLINEN.forEach(d => { if(d.monat) _stGleichesMass(d.monat); });

const _STA = {leistung:0, ereignis:1, schatten:2};
const _STK = {koennen:0, konstanz:1, fuegung:2, schatten:3};
const SEASON_TITLES = DISZIPLINEN.filter(d => d.monat)
  .sort((a, b) => _STA[a.art] - _STA[b.art]
               || _STK[a.monat.art] - _STK[b.monat.art]
               || (b.monat.aus || 0) - (a.monat.aus || 0))
  .map(d => ({
    id:d.id, name:d.name, short:d.short, ic:d.ic, tone:d.tone, art:d.art,
    kunst:d.monat.art, klasse:d.monat.klasse, aus:d.monat.aus, beiname:d.monat.beiname,
    cond:d.monat.cond, wie:d.monat.wie || '', pick:d.monat.pick
  }));
const SEASON_TITLE_BY_ID = {};
SEASON_TITLES.forEach(t => { SEASON_TITLE_BY_ID[t.id] = t; });

// ─── [§C32] Ein Eintrag gehört dem, der ihn hält ─────────────────────
// score(p, pid) liefert eine Zahl (größer = besser) oder null, wenn die
// Bedingung nicht erfüllt ist. Ermittelt wird der Bestwert über ALLE
// gewerteten Spieler — unabhängig davon, wer schon einen Eintrag trägt.
//
// Früher durften die meisten Einträge weiterrutschen: wer den Bestwert hielt
// und schon etwas anderes trug, gab den Eintrag an den Nächstbesten ab.
// Damit stand „Der Unaufhaltsame" bei jemandem mit zwölf Siegen in Folge,
// während einer mit dreizehn danebensaß — und in der Praxis ging ein Drittel
// aller Einträge an jemanden, der nicht der Beste war. Das macht die Tafel
// nicht abwechslungsreicher, sondern unwahr.
//
// Zurückgegeben wird deshalb die ganze Lage, nicht nur ein Name:
//   halter     alle, die den Bestwert punktgleich halten
//   evVon(id)  der Beleg für einen dieser Halter
// Alle Halter bekommen den Eintrag — dass ein Spieler in der Matrix nur
// einen zeigt, ist eine reine Anzeige-Regel (seasonTitleOf).
//
// `pid`/`ev` bleiben der beste noch FREIE Spieler — das braucht das
// Titelrennen für den Verfolger, und sonst niemand.
// ── Eine Monatswertung, deklarativ ───────────────────────────────────
// Jede der zweiunddreissig Wertungen hatte dieselbe Form: ein Tor fuer die
// Stichprobe, eine Groesse, eine Schwelle. Geschrieben stand sie als EIN
// Ausdruck, in dem die Groesse zweimal vorkam — einmal in der Bedingung,
// einmal als Ergebnis. Damit liess sich nicht sagen, wer knapp daneben liegt:
// wer die Schwelle reisst, bekam `null`, und `null` hat keine Reihenfolge.
// Getrennt aufgeschrieben faellt beides ab: die Vergabe wie bisher, und die
// Frage „wer kaeme als Naechstes in Frage".
//   `mind`  Wer ueberhaupt gewertet wird (Stichprobe und Voraussetzung).
//   `wert`  Die Groesse. Groesser ist besser, auch bei den Schattenseiten —
//           wo weniger besser ist, steht ein Minus davor.
//   `ab`    Ab hier ist die Bedingung erfuellt.
//
// Neben `aus` steht im Eintrag `streu`: die Standardabweichung der Groesse
// ueber alle je gewerteten Spieler und Monate, in der Einheit von `wert`.
// Sie macht das Ueberbieten der Schwelle vergleichbar — elf Prozentpunkte
// Player of the Day, drei Siege mehr in Folge und ein Zehntel weniger
// Abstand in Games sind sonst drei verschiedene Waehrungen —, und daraus rechnet
// der Bonus einer Chronik [§C39]. Gemessen einmal an den echten Partien und
// dann festgeschrieben wie `aus`: eine Streuung, die mit der Liga wandert,
// verschoebe das Prestige jedes frueheren Halters. Eine Schattenseite hat
// keine, sie bringt nichts.
//
// Die Schwellen sind an den echten Partien geeicht, nicht geschaetzt, und sie
// folgen einer Regel: EINE MONATSWERTUNG GEHT IN HOECHSTENS EINEM DRITTEL DER
// GEWERTETEN MONATE AN JEMANDEN, in den fuenf Monaten von Juni bis Oktober
// also hoechstens zweimal. Vorher lagen sie so niedrig, dass in einem Monat
// vierundzwanzig der vierunddreissig Wertungen vergeben wurden, und ein
// einzelner Spieler trug neun davon. Spaeter hiess die Grenze nur noch „nicht
// in jedem Monat", und „Der Spielverderber" ging in allen fuenf Monaten an
// jemanden, „Die Steigerung" in vier: was fast jeder Monat hergibt, ist keine
// Auszeichnung mehr, sondern eine Zeile im Protokoll. `tests/disziplinen`
// zaehlt es an allen Partien der Liga bis Ende Oktober
// (`tests/fixtures/oktober.txt`) nach; ein rotes Ergebnis nennt die Wertung,
// deren Schwelle zu tief haengt.
function _stWertung(mind, wert, ab, ev){
  // Das Tor der fünfzehn Partien steht HIER und nicht in jeder Bedingung:
  // Vergabe, „wer käme als Nächstes", Eichung und Tests lesen alle `mind`,
  // und eine Chronik, die es vergäße, wäre die eine, die es wieder gäbe.
  const eigen = mind;
  mind = (p, C) => p.games >= CHRONIK_MIN_SPIELE && eigen(p, C);
  // `mind` und `wert` bekommen den Kontext mit: mehrere Chroniken stellen
  // den eigenen Wert gegen das Ligamittel desselben Monats oder gegen die
  // uebrigen Spieler, und das steht nur im Kontext. Die Vergabe (`pick`)
  // baut `_stGleichesMass`, wenn der Eintrag fertig ist: sie liest den
  // gewerteten Wert, und der braucht die Eichung des Eintrags.
  return {mind, wert, ab, ev};
}

// ─── Gleiches Maß für jede Spielzahl [§C39] ──────────────────────────
// Über wenige Partien streut jeder Anteil weiter als über viele: an den
// echten Partien lagen die Werte von Spielern mit 15 bis 29 Partien im
// Monat im Median 1,57-mal so weit vom Schnitt wie die von Spielern mit 60
// und mehr, bei den Vergleichen zweier Teilmengen bis dreimal. Die Schwellen
// liegen draußen im Feld, und dorthin kommt, wer wenig spielt, durch Zufall:
// von den Werten über einer Schwelle gehörten 80 Spielern mit wenigen
// Partien und 32 Vielspielern, obwohl beide Gruppen gleich groß sind.
//
// Gewertet wird deshalb der Abstand zur Mitte (`mitte`, der Schnitt aller
// gewerteten Spieler-Monate, bei einem Betrag null), umgerechnet auf die
// übliche Stichprobe der Chronik (`n0`, der Median ihrer `stichprobe`):
// v* = mitte + (v − mitte) / √(echt + (1 − echt) · n0 / n).
// `echt` ist der Anteil der Streuung bei der üblichen Stichprobe, der nicht
// Zufall ist, gemessen aus (v − mitte)² = τ² + B / n. Wo die Streuung echtes
// Können trägt (der Traummonat: 0,9), ändert sich kaum etwas; wo sie fast
// nur Zufall ist (ein Muster in einem Ausschnitt), zählt derselbe Abstand
// über zehn Partien halb so viel wie über vierzig. Damit kommen
// Vielspieler nicht nach oben, weil sie mehr spielen, sondern weil ein
// Abstand über mehr Partien weniger Zufall ist.
//
// Keine Umrechnung (`stichprobe:false`): wer nach einer Wahrscheinlichkeit
// fragt, rechnet die Spielzahl schon ein (`_stUnwahr`); die Tabelle, feste
// Fenster, Folgen und der Anteil an den Partien der Liga fragen nicht nach
// einer Stichprobe; der Abstand zu einem Ziel (Punktlandung, Erwartungstreue,
// der Beidfüßige) wird in der Chronik selbst auf eine feste Spielzahl
// umgerechnet, weil dort bekannt ist, wie er mit ihr wächst. Ebenso wenig
// eine Spanne oder Streuung über Tage oder Partner (das Metronom, der
// Wechselhafte, der Kontrast) und die Nähe zweier Quoten (der Rollenfeste):
// ihr Zufall hängt an den Partien je Tag oder je Lage, nicht an der Zahl im
// Monat, und auf die Partien des Monats umgerechnet hingen sie gemessen
// stärker an der Spielzahl als vorher (der Wechselhafte mit +0,68 statt
// −0,22, der Rollenfeste mit −0,58 statt −0,02).
//
// Die Bedingung nennt die Schwelle für die übliche Stichprobe; der Beleg
// nennt den gemessenen Wert und dahinter den gewerteten, wo sie sich
// unterscheiden. Der Wert des Halters in der Tafel (`awarded[].wert`) ist
// der gewertete: aus ihm rechnen Bonus und Überschattung.
function _stGleichesMass(m){
  const roh = m.wert, evRoh = m.ev, n = m.stichprobe;
  m.roh = roh;
  if(typeof n === 'function' && m.n0 > 0 && m.echt != null && m.mitte != null){
    m.wert = (p, C) => {
      const v = roh(p, C);
      if(v == null || !isFinite(v)) return v;
      const k = n(p, C);
      return k > 0 ? m.mitte + (v - m.mitte) / Math.sqrt(m.echt + (1 - m.echt) * m.n0 / k) : v;
    };
    const zeig = _stEinheit(m.cond, m.ab);
    m.ev = (p, v, C) => {
      const r = roh(p, C), text = evRoh(p, r, C);
      if(!zeig || v == null || r == null || !isFinite(v) || !isFinite(r)) return text;
      const a = zeig(r), b = zeig(v);
      // Ein gewerteter Wert unter null heißt nur „auf der anderen Seite":
      // „67 % in 3 Schlussspielen, 60 % davor · gewertet −4 Prozentpunkte"
      // sagte unter „Am nächsten dran" nichts, was der Beleg nicht sagt.
      return a === b || b.charAt(0) === '−' ? text : text + ' · gewertet ' + b;
    };
  }
  m.pick = (C, t) => _stPickTop(C, t, p => {
    if(!m.mind(p, C)) return null;
    const v = m.wert(p, C);
    return (v != null && isFinite(v) && v >= m.ab) ? v : null;
  }, m.ev);
}
// Die Einheit der Schwelle, wie die Bedingung sie nennt — so steht der
// gewertete Wert im Beleg in derselben Einheit wie die Schwelle. Eine
// Schwelle mit „höchstens" steht als negativer Wert im Katalog und wird
// mit umgekehrtem Vorzeichen gezeigt.
function _stEinheit(cond, ab){
  const m = String(cond || '').match(/(\d+(?:,\d+)?)\s*(%|Prozentpunkte?|Games?)(?![a-zäöü])/);
  if(!m) return null;
  // Nur, wenn die Schwelle in der Einheit der Bedingung steht. „Ohne
  // schwache Woche" misst logarithmisch (höchstens 2 Prozentpunkte sind dort
  // 1,70), und hinter ihrem Beleg stand „gewertet 194 Prozentpunkte".
  const zahl = parseFloat(m[1].replace(',', '.')), mal = (m[2] === '%' || m[2].startsWith('Prozentpunkt')) ? 100 : 1;
  if(Math.abs(Math.abs(ab) * mal - zahl) > 0.011 * Math.max(1, zahl)) return null;
  m[1] = m[2];
  const s = ab < 0 ? -1 : 1;
  // Ein Anteil steht höchstens mit 100 % da: die Umrechnung auf die übliche
  // Spielzahl ergab „5 von 5 … gewonnen · gewertet 106 %".
  if(m[1] === '%') return v => Math.max(0, Math.min(100, pct(s * v))) + ' %';
  if(m[1].startsWith('Prozentpunkt')) return v => { const d = Math.round(s * v * 100);
    return (d < 0 ? '−' + (-d) : d) + (Math.abs(d) === 1 ? ' Prozentpunkt' : ' Prozentpunkte'); };
  const wort = ' Games';
  return v => (s * v < 0 ? '−' : '') + komma(Math.abs(s * v), 2) + wort;
}

// Wer der Bedingung am naechsten kommt, ohne sie zu erfuellen. Gewertet wird
// nur, wer die Stichprobe hat: „fast erreicht" von jemandem mit zwei Partien
// ist keine Aussage.
function _stNah(C, def){
  const w = def && def.monat;
  if(!w || !w.mind || !w.wert) return null;
  let best = null;
  Object.keys(C.P).forEach(pid => {
    const p = C.P[pid];
    if(!w.mind(p, C)) return;
    const v = w.wert(p, C);
    if(v == null || !isFinite(v) || v >= w.ab) return;
    if(!best || v > best.v) best = {pid, v};
  });
  return best ? {pid:best.pid, wert:best.v,
                 ev:w.ev(C.P[best.pid], best.v, C)} : null;
}

function _stPickTop(C, taken, score, ev){
  let bv = -Infinity;
  const werte = {};
  Object.keys(C.P).forEach(pid => {
    const v = score(C.P[pid], pid);
    if(v == null || !isFinite(v)) return;
    werte[pid] = v;
    if(v > bv) bv = v;
  });
  const ids = Object.keys(werte);
  if(!ids.length) return null;
  // Gleichstand bricht: mehr Siege → bessere Game-Differenz → Spieler-ID.
  // Damit ist die Vergabe deterministisch — dieselbe Saison ergibt immer
  // dieselbe Tafel, unabhängig von Objekt-Reihenfolgen.
  const ordnung = (a, b) => C.P[b].wins - C.P[a].wins || C.P[b].gd - C.P[a].gd || (a < b ? -1 : 1);
  const halter = ids.filter(id => Math.abs(werte[id] - bv) <= 1e-9).sort(ordnung);
  const frei = ids.filter(id => !taken.has(id))
    .sort((a, b) => werte[b] - werte[a] || ordnung(a, b))[0];
  // `rang` ist die vollständige Reihenfolge dieser Disziplin im Monat, nicht
  // nur ihr Sieger — das Detail-Blatt zeigt daraus ein Podest. Sie entsteht
  // aus `werte`, die ohnehin schon dastehen; ein zweiter Durchlauf wäre
  // dieselbe Rechnung ein zweites Mal.
  // `evVon` nimmt den Bestwert, weil alle Halter ihn per Definition teilen;
  // `evFuer` nimmt den eigenen Wert und gilt damit auch für Platz zwei.
  return {pid: frei || null, ev: frei ? ev(C.P[frei], werte[frei], C) : null,
          halter, evVon: id => ev(C.P[id], bv, C),
          rang: ids.slice().sort((a, b) => werte[b] - werte[a] || ordnung(a, b)),
          wert: id => werte[id],
          evFuer: id => ev(C.P[id], werte[id], C)};
}

