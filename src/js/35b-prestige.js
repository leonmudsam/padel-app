// ╔═══ §13.8 ─── PRESTIGE & INSIGNIUM ──────────────────────────────────╗
//     Eine Zahl für eine ganze Laufbahn — und ein Zeichen dafür, das um
//     den Avatar liegt. Das Prestige ist KEINE zweite Rangliste: Elo sagt,
//     wie stark jemand gerade ist, Prestige sagt, was er über die Zeit
//     zusammengetragen hat.
//
//     EIN GESETZ ÜBER ALLEN: Wer nichts falsch macht, verliert nichts.
//     Erworbenes bleibt — Auszeichnungen und Monatswertungen können nur
//     dazukommen. Nur die Allzeitwertungen sind eine Aussage über HEUTE:
//     Wer einen Liga-Rekord abgibt, verliert seinen Anteil daran. „Ich
//     halte den Rekord" ist eine Behauptung in der Gegenwart; sie soll
//     nicht dadurch wahr bleiben, dass sie einmal wahr war.
//
//     Vorher galt das nur auf dem Papier. Der Wert eines Eintrags hing an
//     der Zahl seiner heutigen Halter, und die wächst, während die Liga
//     älter wird: Henry stand im Mai bei 197 Punkten aus Auszeichnungen
//     und im August bei 63 — er hatte in der Zwischenzeit welche DAZU
//     gewonnen. Acht von zwölf Spielern liefen rückwärts. Ein Fortschritt,
//     der zurückläuft, während man spielt, ist keiner.
//
//     DREI QUELLEN, und jede hat ihr eigenes Gesetz. Es gibt bewusst keinen
//     vierten, unsichtbaren Leistungsblock: Können wird hier nur dann zu
//     Prestige, wenn daraus eine Auszeichnung, Monatschronik oder ein heute
//     gehaltener Rekord geworden ist.
//
//     AUSZEICHNUNGEN [§7] — Wert aus der Seltenheitsklasse, die im Katalog
//     steht und im Badge-Blatt angezeigt wird. Sie ist eine Aussage über
//     die Schwierigkeit, nicht über den heutigen Zensus, und sie steht
//     schon jetzt an jedem Badge. Eine Auszeichnung, die als „Legendary"
//     ausgewiesen ist und drei Punkte bringt, weil inzwischen sechs
//     Spieler sie haben, widerspricht ihrer eigenen Anzeige.
//
//     MONATSWERTUNGEN — ein fester Grundwert nach Art. Ein Monatseintrag
//     ist jeden Monat neu zu holen; dass ihn im Mai einer und im August
//     vier getragen haben, ändert nichts daran, was der im Mai wert war.
//
//     ALLZEITWERTUNGEN — wie bisher: geteilt durch die Zahl der Halter,
//     mit fallenden Erträgen. Sie dürfen wechseln, dafür sind sie da.
//
//     WIEDERHOLUNG. JEDE positive Auszeichnung zählt bei jedem Erreichen,
//     aber als nachvollziehbare, harmonisch gedämpfte Folge. Je zwei
//     Verleihungen teilen eine Stufe: Nummer eins und zwei zählen voll,
//     Nummer drei und vier liegen je nach Wertigkeit 5, 10, 12, 15, 18 oder
//     25 Prozent darunter. Drei Dominator-Erfolge ergeben so 50 + 50 + 45,
//     drei Carry-Erfolge 3 + 3 + 2,25.
//     Anders als eine geometrische Reihe bleibt jeder weitere Erfolg positiv
//     und die Summe hat keine Obergrenze. Häufige Alltags-Erfolge können eine
//     Laufbahn aber nicht kurzfristig durch bloße Menge beherrschen.
//
//     DIE SCHWELLEN sind an den echten 466 Partien kalibriert [§13.9]:
//     nach vier Monaten Liga trägt niemand den Ordensstern; seine Schwelle
//     liegt noch mehr als ein heutiges Spitzen-Lebenswerk entfernt.
// ╚═════════════════════════════════════════════════════════════════════════╝

// Bei Auszeichnungen gibt die sichtbare Seltenheitsklasse den Rahmen vor.
// Innerhalb dieses Rahmens dürfen wenige fachlich begründete
// Spitzenleistungen höher liegen: Eine Meisterschaft ist mehr wert als
// Dominator, Dominator mehr als Team der Saison; ein Wochensieg mehr als der
// deutlich mengenabhängigere Tagessieg.
//
// Startwert und Abnahme der nächsten Zweiergruppe. Die Klasse setzt den
// Standard: je wertvoller, desto höher der Start und desto langsamer die
// Abnahme. Die harmonische Folge darunter flacht ab, bleibt aber bei jedem
// endlichen Rang positiv und besitzt keine feste Obergrenze. Negative
// Auszeichnungen bleiben Erinnerungen, aber weder Strafe noch Lohn.
// Der Standard der Klasse Legendary greift nur für eine NEUE legendäre
// Auszeichnung, die unten noch keinen eigenen Wert hat; jede bestehende
// steht dort mit ihrem.
const PRESTIGE_AUSZEICHNUNG = {
  legendary:{basis:70, abnahme:0.10},
  rare:     {basis:25, abnahme:0.18},
  common:   {basis:3,  abnahme:0.25},
  negative: {basis:0,  abnahme:1}
};
// Jede legendäre Auszeichnung trägt ihren eigenen Startwert, dazu die zwei
// Wochen- und Tageswertungen. Ein Wert für die ganze Klasse stellte die
// längste Serie neben den Doppel-Bagel und die Dynastie neben den Dominator,
// und beides sind verschiedene Höhen: die Dynastie verlangt mehr Saison-Elo
// als der Dominator (die Marken stehen in BG, 17-badges.js). Die Reihenfolge der Tabelle ist die Gewichtung und die
// Reihenfolge im Regelblatt (`showPrestigeRegeln`) — wer eine Auszeichnung
// dazunimmt, ordnet sie hier nach ihrem Wert ein.
// Meister wächst mit der sanftesten Kurve. POTD fällt schneller, weil es
// stark von der Zahl der eigenen Spieltage abhängt; POTW bleibt wertvoller.
// Der Doppel-Bagel bleibt Legendary, verliert bei Wiederholungen aber etwas
// schneller an Neuigkeitswert.
//
// Die Meilensteine der Laufbahn (Siegermaschine, Urgestein, die beiden
// Seiten-Spezialisten, Allrounder, Dauerbrenner, Stammgast und die erste
// Partie; ihre Zahlen stehen in BG) stehen mit eigenem Wert darin: sie werden einmal erreicht und zeigen Fortschritt,
// und der soll mehr tragen als Menge. Mit dem Wert ihrer Klasse brachten 300
// Siege 25 Prestige — weniger als drei Spieler des Tages. Ihre Abnahme ist
// die der Klasse; sie greift nie, weil jeder Meilenstein einmal fällt.
//
// Der Meister der Saison steht ganz oben, gleichauf mit der Siegermaschine:
// er ist die höchste Auszeichnung, die eine Saison vergibt. Das Team der
// Saison steht neben der dritten Serienstufe. Die Siegesserien bilden eine
// Treppe — 15, 40, 75, 120 für die vier Stufen aus BG.serien —; mit dem Wert ihrer Klasse brachte die
// 10er Serie 25 und die 5er 3, und die Stufen dazwischen sagten nichts.
// Ihre Abnahme bleibt die ihrer Klasse.
const PRESTIGE_AUSZEICHNUNG_SPEZIAL = {
  champion:       {basis:150, abnahme:0.05},
  wins200:        {basis:150, abnahme:0.18},
  streak20:       {basis:120, abnahme:0.10},
  dynasty_600:    {basis:120, abnahme:0.10},
  games250:       {basis:100, abnahme:0.18},
  streak15:       {basis:75,  abnahme:0.10},
  team_of_season: {basis:75,  abnahme:0.10},
  dominator_400:  {basis:70,  abnahme:0.10},
  award_collector:{basis:70,  abnahme:0.10},
  untouchable:    {basis:70,  abnahme:0.10},
  reves50:          {basis:60,  abnahme:0.25},
  drive50:          {basis:60,  abnahme:0.25},
  potw:           {basis:50,  abnahme:0.12},
  mr_perfect:     {basis:50,  abnahme:0.10},
  allrounder:     {basis:50,  abnahme:0.18},
  games150:       {basis:50,  abnahme:0.25},
  streak10:       {basis:40,  abnahme:0.18},
  perfect_win:    {basis:40,  abnahme:0.15},
  streak5:        {basis:15,  abnahme:0.25},
  potd:           {basis:10,  abnahme:0.25},
  games25:        {basis:10,  abnahme:0.25},
  first_match:    {basis:5,   abnahme:0.25},
};

// Grundwert einer Allzeitwertung, bevor Halterzahl und Stapel darauf wirken.
// Er steht am Katalogeintrag, aus `REKORD_GRUNDWERT` [§C34]: eine runde Zahl
// ist im Blatt nachrechenbar, „100 Punkte, geteilt durch zwei Halter, dann
// durch Wurzel zwei". Fehlt er, gilt der Wert der Kammer. Der Rückfall las
// vorher einen Faktor je `art` mit den Schlüsseln „leistung" und „ereignis",
// die der Katalog nicht kennt („koennen", „fuegung"): jeder Eintrag ohne
// Grundwert wäre still bei 75 gelandet, auch ein Können-Rekord.
function _rekordBasis(def){
  if(def && def.basis != null && isFinite(def.basis)) return def.basis;
  const kind = def && def.kind;
  return kind === 'shame' ? REKORD_GRUNDWERT.schatten
       : kind === 'fuegung' ? REKORD_GRUNDWERT.fuegung : REKORD_GRUNDWERT.koennen;
}

// ─── Wiederholung zählt weniger, aber nie nichts ────────────────────
// Die ersten beiden Erfolge belegen denselben Schritt und zählen deshalb
// beide voll. Erst der dritte und vierte liegen eine Kurvenstufe tiefer, der
// fünfte und sechste noch eine. Danach wird die Kurve harmonisch flacher. So
// bleibt jeder weitere Erfolg positiv und die Summe wächst ohne Obergrenze,
// während bloße Menge einen Meistertitel nicht kurzfristig überholt.
//
// Sie gilt NUR für dieselbe Sache. Eine Meisterschaft und ein Team der
// Saison sind zwei verschiedene Dinge und zählen beide voll: das Stapeln
// über verschiedene Erfolge hinweg war der Fehler, den §C34 abgestellt hat,
// und der bestrafte genau den, der viel erreicht.
function _auszeichnungsRegel(id){
  const klasse = rarityOf(id);
  const grund = PRESTIGE_AUSZEICHNUNG[klasse] || PRESTIGE_AUSZEICHNUNG.common;
  return Object.assign({klasse}, grund, PRESTIGE_AUSZEICHNUNG_SPEZIAL[id] || {});
}

function _auszeichnungsAbnahme(id){
  return _auszeichnungsRegel(id).abnahme;
}

function _wiederholungsWert(n, abnahme){
  const k = Math.max(0, n | 0);
  if(!k) return 0;
  const a = Math.max(0, Math.min(0.999, Number(abnahme) || 0));
  const c = a / Math.max(0.001, 1 - a);
  let summe = 0;
  for(let i = 0; i < k; i++) summe += 1 / (1 + c * Math.floor(i / 2));
  return summe;
}

function auszeichnungsPunkte(id, n){
  const regel = _auszeichnungsRegel(id);
  return regel.basis * _wiederholungsWert(n, _auszeichnungsAbnahme(id));
}

function auszeichnungsTeilwert(id, n){
  const regel = _auszeichnungsRegel(id);
  if(regel.basis <= 0 || n <= 0) return 0;
  const a = _auszeichnungsAbnahme(id);
  return regel.basis / (1 + (a / Math.max(0.001, 1 - a)) * Math.floor((n - 1) / 2));
}

// Dieselbe Monatschronik zeigt beim zweiten Tragen weniger Neues, bleibt aber
// wie jede erworbene Quelle dauerhaft und wächst bei jedem weiteren Monat.
function _wurzelStaffel(rang, breite){
  return Math.floor(Math.max(1, rang | 0) / Math.max(1, breite | 0)) + 1;
}

function _wurzelStapel(liste, breite){
  let summe = 0;
  liste.sort((a, b) => b.p - a.p).forEach((q, i) => {
    q.voll = q.p;
    q.rang = i + 1;
    q.staffel = _wurzelStaffel(q.rang, breite);
    q.p = q.voll / Math.sqrt(q.staffel);
    summe += q.p;
  });
  return summe;
}

function _wurzelZuwachs(werte, neuerWert, breite){
  const summe = a => a.slice().sort((x, y) => y - x)
    .reduce((n, x, i) => n + x / Math.sqrt(_wurzelStaffel(i + 1, breite)), 0);
  return Math.max(0, summe((werte || []).concat([neuerWert])) - summe(werte || []));
}

// Wie nah ein Rekord sein muss, um noch als Ziel zu gelten: höchstens die
// Hälfte des Bestwerts entfernt. Darüber ist der Hinweis entmutigend
// statt hilfreich.
const PRESTIGE_REICHWEITE = 0.5;

// Die sieben Stufen. `min` ist die Schwelle, ab der die Stufe getragen wird.
//
// 0, 400, 800, 1200, 1700, 2500, 3200 — vorgegeben, nicht gerechnet, und
// auf das Volumen der Padel-Liga gesetzt: rund fünf Spieltage im Monat mit
// drei bis fünf Partien. Die Leiter der Kicker-Liga (600 bis 6000) war an
// hunderten Partien im Monat geeicht; mit ihr hätte hier nach einer Saison
// jeder noch den Reif getragen, und das Zeichen hätte nichts unterschieden.
// Die ersten drei Spannen sind gleich kurz (je 400), damit der erste
// Aufstieg in den ersten Wochen kommt; Lorbeerreif und Kronenreif kosten
// dann 800 und 700, und darüber zählt nur noch der Ordensstern.
const INSIGNIEN = [
  {key:'reif',    name:'Reif',          min:0},
  {key:'schild',  name:'Schildring',    min:400},
  {key:'volute',  name:'Volutenkranz',  min:800},
  {key:'zier',    name:'Zierkranz',     min:1200},
  {key:'lorbeer', name:'Lorbeerreif',   min:1700},
  {key:'krone',   name:'Kronenreif',    min:2500},
  {key:'stern',   name:'Ordensstern',   min:3200},
];
// Die beiden obersten Stufen. Ihr ERSTER Aufstieg ist Breaking [§C33] —
// als Zahl im Generator („stufe >= 3") wäre die Grenze beim Einfügen einer
// Stufe still um eins verrutscht.
const INSIGNIUM_OBEN = INSIGNIEN.length - 2;
// Innerhalb einer Stufe gibt es drei Grade. Ohne sie sind zwischen zwei
// Schwellen hunderte Punkte, in denen sich am Zeichen nichts tut — und je
// weiter oben, desto länger dauert das. Jeder Grad hat sein eigenes Bild
// [§C30]; man sieht ihn, wenn man ihn sucht, und er verrät auf einen Blick,
// ob jemand gerade angekommen ist oder kurz vor der nächsten Stufe steht.
const INSIGNIUM_GRADE = 3;
const INSIGNIUM_GRAD_NAME = ['I', 'II', 'III'];
// Die Grade teilen die Spanne bis zur nächsten Stufe in Drittel, abgerundet
// auf volle Hundert: der Lorbeerreif (1700 bis 2499) hat Grad II ab 1900 und
// Grad III ab 2200. Sie lagen bei 16 und 40 % der Spanne, und damit waren
// Grad I und II kurz und Grad III über die halbe Stufe lang: wer Grad III
// erreichte, trug ihn länger als die beiden davor zusammen. Eine runde
// Schwelle kann man sich merken und im Laufbahnblatt nachprüfen.
// Die Stufe zu einer Punktzahl. Sie steht an EINER Stelle: das Blatt einer
// Karte von vorletzter Woche las die Stufe als Zahl aus der Datenbank, und
// diese Zahl stammte aus einer Leiter mit anderen Stufen — Leon stand dort
// mit 2687 Prestige als Volutenkranz und „noch 0 bis zum Zierkranz". Der
// gespeicherte Punktestand ist die Beobachtung, die Stufe eine Ableitung.
function insigniumStufeVon(punkte){
  let i = 0;
  while(i + 1 < INSIGNIEN.length && punkte >= INSIGNIEN[i + 1].min) i++;
  return i;
}
// Der Ordensstern hat keine nächste Stufe, deren Spanne man dritteln
// könnte; seine Grade liegen deshalb je ORDENSSTERN_GRAD auseinander: I ab
// 3200, II ab 3600, III ab 4000 — so weit wie ein Grad des Kronenreifs. Er zählte vorher Zacken, acht beim
// Erreichen und alle 500 eine mehr, und war damit die einzige Stufe, die
// anders zählte: in der Laufbahn stand „8 9 10“ neben „I II III“, auf der
// Karte „erreicht die 9. Zacke“ neben „steigt auf Zierkranz III“.
const ORDENSSTERN_GRAD = 400;
function insigniumGradSchwellen(i){
  const st = INSIGNIEN[i], nx = INSIGNIEN[i + 1];
  if(!st) return [0];
  if(!nx) return Array.from({length:INSIGNIUM_GRADE}, (_, g) => st.min + g * ORDENSSTERN_GRAD);
  const drittel = (nx.min - st.min) / 3;
  return [st.min, st.min + Math.floor(drittel / 100) * 100,
          st.min + Math.floor(2 * drittel / 100) * 100];
}
// Die drei festen Angaben einer Monatschronik [§C39]. Eingefrorene Monate
// können IDs tragen, die es im heutigen Katalog nicht mehr gibt; dann ist
// hier nichts zu holen, und der Eintrag zählt null statt rückwirkend eine
// Art zu erfinden, die er nie hatte. EIN Nachschlagen für alle, die danach
// fragen — Wert, Grund und Anzeige müssen dasselbe lesen.
function _chronikMonat(titleId){
  const d = DISZIPLINEN.find(x => x.id === titleId);
  return (d && d.monat) || null;
}

// ─── §C39 Was eine Monatschronik wert ist ────────────────────────────
// Jede Chronik außer einer Schattenseite bringt denselben Grundwert, 100,
// gleich welcher Klasse und welcher Art. Wer in einem Monat etwas erreicht,
// wofür es eine Chronik gibt, wird dafür belohnt — auch dann, wenn wenig
// Können darin steckt. Die Klasse bleibt Farbe und Name (Gold legendär,
// Lila selten, Metall besonders, Rot eine Schattenseite) und sagt, wie weit
// draußen die Latte hängt; über den Wert entscheidet sie nicht mehr.
//
// Dazu kommt der Bonus: wie weit der Halter die Schwelle überbietet, in
// Standardabweichungen der Chronik (`streu`), mal einer Steigung, die mit dem
// Ausschlag der Schwelle (`aus`) wächst. Die Steigung ist die Rate, mit der
// Werte an der Schwelle seltener werden: je σ halbiert sich dort der Anteil
// der Spieler-Monate, die so weit kommen, φ/Q-mal durch ln 2 (das
// Mills-Verhältnis der Normalverteilung), und jede Halbierung bringt zehn
// Punkte. Bei 1,2 σ Ausschlag sind das 24 je σ, bei 2,5 σ 41, bei 3,5 σ 54.
// Genau auf der Schwelle gibt es keinen Bonus, und wo die Schwelle schon das
// Höchste ist („Gegen jeden regelmäßigen Gegner"), auch nicht.
//
// Vorher brachte jedes σ 25, gleich wo die Schwelle lag. Eine legendäre
// Chronik liegt weit draußen, ihre Halter selten weit darüber, und sie stand
// fast immer hinter einer seltenen oder besonderen mit mehr Bonus: der
// unmögliche Monat stand mit 101 da, ein Punkt über dem Grundwert. Weit
// draußen ist jeder Schritt seltener als nahe am Feld, und das zählt jetzt.
// Der Bonus bleibt linear in der Abweichung: mehr Abweichung bringt immer
// mehr, und eine besondere Chronik mit viel davon steht weiter vor einer
// legendären mit wenig. Die
// Seltenheit selbst als Bonus (die Halbierungen bis zum Wert des Halters,
// nicht bis eine σ über der Schwelle) wüchse im Quadrat und gäbe einem
// einzigen Monat weit draußen über tausend Punkte.
//
// Vorher galt die Klasse als Wert, 150, 100 und 50. Damit brachte ein
// besonderer Monat ein Drittel eines legendären, auch wenn sein Halter die
// Latte weit hinter sich ließ, und wer sie gerade eben riss, bekam dasselbe
// wie einer, der sie verdoppelte.
//
// Der Bonus misst mit festgeschriebenen Größen (`ab`, `streu`), nicht mit
// der Verteilung von heute: sonst sänke das Prestige aller bisherigen
// Halter, sobald neue Monate sie verschieben, und genau dieser Fehler
// steckte schon einmal in den Auszeichnungen [§C34]. Der Wert des Halters
// steht dazu in der Tafel und im eingefrorenen Monat (`wert`).
const CHRONIK_GRUNDWERT = 100;
const CHRONIK_BONUS_JE_HALBIERUNG = 10;
// Die komplementäre Fehlerfunktion (Numerical Recipes, `erfcc`, relativ
// genauer als 1,2·10⁻⁷) und daraus die Halbierungen je σ an einem Ausschlag.
function _erfc(x){
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418
    + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587
    + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
function chronikHalbierungenJeSigma(aus){
  const a = Number(aus) || 0;
  const phi = Math.exp(-a * a / 2) / Math.sqrt(2 * Math.PI), q = 0.5 * _erfc(a / Math.SQRT2);
  return q > 0 ? phi / q / Math.LN2 : 0;
}

// Wie weit ein Wert über der Schwelle liegt, in σ der Chronik; null, wenn
// es keine Rechnung dafür gibt (Schattenseite, unbekannte Chronik, kein
// Wert). Ein Wert genau auf der Schwelle, der nur durch die Rechnung in
// Gleitkomma ein Hauch darüber liegt, zählt als genau darauf.
function chronikUeber(titleId, wert){
  const m = _chronikMonat(titleId);
  if(!m || m.art === 'schatten' || !(m.streu > 0)) return null;
  if(wert == null || !isFinite(wert) || !isFinite(m.ab)) return null;
  const z = (wert - m.ab) / m.streu;
  return z > 1e-9 ? z : 0;
}
// Wer die Schwelle überhaupt überbietet, bekommt mindestens 1: eine Null
// neben „über der Schwelle" läse sich als Fehler.
function chronikBonus(titleId, wert){
  const z = chronikUeber(titleId, wert);
  if(!(z > 0)) return 0;
  const m = _chronikMonat(titleId);
  return Math.max(1, Math.round(CHRONIK_BONUS_JE_HALBIERUNG * chronikHalbierungenJeSigma(m.aus) * z));
}
// Wie schwer eine Schattenseite wiegt: wie weit sie über ihre Schwelle
// hinausgeht, in σ ihrer eigenen Streuung. Dieselbe Rechnung wie der Bonus
// einer positiven Chronik, nur ohne Punkte; null ohne Rechnung.
function chronikSchattenGewicht(titleId, wert){
  const m = _chronikMonat(titleId);
  if(!m || m.art !== 'schatten' || !(m.streu > 0)) return null;
  if(wert == null || !isFinite(wert) || !isFinite(m.ab)) return null;
  const z = (wert - m.ab) / m.streu;
  return z > 1e-9 ? z : 0;
}
// ─── §C39 Die Schattenseite überschattet eine besondere Chronik ──────
// Eine besondere Chronik bringt kein Prestige, wenn derselbe Spieler im
// selben Monat eine Schattenseite hält, die mindestens doppelt so weit über
// ihre Schwelle hinausgeht wie die besondere über ihre — und mindestens eine
// Streuung weit. In Punkten gelesen: die Schattenseite wiegt mindestens
// doppelt so schwer wie der Bonus und mindestens 25. Die besondere Chronik
// bleibt in der Tafel, sie zählt nur nicht.
// Nur „besonders": ein Muster in einem Ausschnitt der eigenen Partien ist
// in einem Monat voller Pleiten leicht zu finden. Gemessen holte, wer viele
// Schattenseiten sammelte, trotzdem jeden Monat eine besondere Chronik und
// damit hundert Punkte, oft genau an ihrer Schwelle neben einer
// Schattenseite weit über ihrer. Eine seltene oder legendäre Chronik ist
// eine Leistung über den ganzen Monat und bleibt stehen.
// Die Mindestweite verhindert, dass eine Schattenseite knapp an ihrer
// Schwelle eine besondere knapp an ihrer löscht: beide sagen dann gleich
// viel, und gleich viel ist nicht „doppelt so schlecht".
const CHRONIK_SCHATTEN_FAKTOR = 2;
const CHRONIK_SCHATTEN_MIN = 1;
function chronikUeberschattet(T, a){
  if(!a || chronikStufe(a.titleId) !== 'besonders') return null;
  const grenze = Math.max(CHRONIK_SCHATTEN_MIN,
    CHRONIK_SCHATTEN_FAKTOR * (chronikUeber(a.titleId, a.wert) || 0));
  let best = null, bz = -1;
  ((T && T.awarded) || []).forEach(s => {
    if(s.pid !== a.pid) return;
    const g = chronikSchattenGewicht(s.titleId, s.wert);
    if(g != null && g >= grenze - 1e-9 && g > bz){ best = s; bz = g; }
  });
  return best;
}
// Ein Abstand in σ, wie der Ausschlag im Blatt steht: zwei Stellen, Komma.
function chronikSigma(z){
  return String(Math.round((Number(z) || 0) * 100) / 100).replace('.', ',') + ' \u03c3';
}
// Ohne `wert` der Grundwert allein — für eine Chronik, die noch niemand
// hält, und für einen Monat, dessen Halterwert nicht bekannt ist.
function chronikPunkte(titleId, wert){
  const m = _chronikMonat(titleId);
  if(!m || m.art === 'schatten') return 0;   // Schattenseiten geben nichts
  return CHRONIK_GRUNDWERT + chronikBonus(titleId, wert);
}

// EIN Durchlauf für die ganze Liga. Seltenheit lässt sich nicht für einen
// Spieler allein bestimmen, also wird immer die ganze Tabelle gerechnet
// und memoisiert — wie überall an matches.length + _cache.version gebunden.
function prestigeTabelle(bisMs){
  bisMs = _schnitt(bisMs);
  const key = matches.length + '_' + _cache.version + (bisMs ? '_' + bisMs : '');
  if(!bisMs && _cache._prestigeKey === key) return _cache._prestige;
  if(bisMs){
    if(!_cache._prestigeBis) _cache._prestigeBis = {};
    if(_cache._prestigeBis[key]) return _cache._prestigeBis[key];
    _topfDeckel(_cache._prestigeBis, 20);
  }

  // Der Rang im Prestige ist ein Laufbahn-Vergleich und vergleicht, wer noch
  // antritt [§C40]. Ein Ruheständler wird mit derselben Rechnung geführt, aber
  // daneben (`ruhe`): seine Auszeichnungen und Chroniken wie bei jedem, seine
  // Rekorde die vom Karriereende (`ruhestandStand`).
  const aktive = (players || []).filter(p => ligaAktiv(p));
  const ruhe = (players || []).filter(p => sichtbar(p) && imRuhestand(p));
  const alle = aktive.concat(ruhe);
  const gesamt = aktive.length || 1;
  const quelleMatches = bisMs ? _partienBis(bisMs) : matches;

  // 1. Rohdaten je Spieler einsammeln.
  const roh = {};
  alle.forEach(p => { roh[p.id] = {badges:[], monat:[], rekord:[]}; });

  // Auszeichnungen — mit ihrer Anzahl. Jede positive Auszeichnung zählt bei
  // jedem Erreichen; Klasse und Anzahl reichen für die vollständige Rechnung.
  alle.forEach(p => {
    const badges = bisMs ? computeBadges(p.id, quelleMatches, bisMs) : getCachedBadges(p.id);
    (badges || []).forEach(b => {
      roh[p.id].badges.push({id:b.id, name:b.name, n:Math.max(1, b.count || 1)});
    });
  });

  // Monatswertungen — die Chronik des Spielers, ein Eintrag je Monat.
  // Bewusst nicht jeder Bestwert, den er in dem Monat hielt: ein
  // dominanter Monat gewinnt acht Quoten auf einmal, und die sagen alle
  // dasselbe über denselben Monat. Gezählt wird, was in der Matrix steht
  // [§C32] — sonst stünde im Profil eine Zahl, die nirgends nachzuzählen ist.
  alle.forEach(p => {
    (seasonTitleHistory(p.id, bisMs) || []).forEach(r => {
      if(r.title) roh[p.id].monat.push(
        {id:r.title.titleId, name:r.title.name, label:r.label, sid:r.sid, wert:r.title.wert});
    });
  });

  // Allzeitwertungen — was jemand HEUTE hält.
  const A = allChronicles(bisMs);
  const halterZahl = {};
  CHRONICLES.forEach(d => {
    const e = A.byId[d.id];
    if(!e) return;
    halterZahl[d.id] = e.pids.length;
    e.pids.forEach(pid => { if(roh[pid]) roh[pid].rekord.push(
      {id:d.id, name:d.name, art:d.art, kind:d.kind, basis:d.basis}); });
  });
  // Die Rekorde eines Ruheständlers: die er beim Karriereende hielt, geteilt
  // durch die Halter von damals. Die Liga von heute vergleicht ohne ihn. Ein
  // gestrichener Rekord zählt für ihn so wenig wie für alle anderen
  // (`chroniclesOfPlayer` lässt ihn weg): er bekam sonst einen Ersatzwert,
  // der zu keiner Kammer gehörte.
  ruhe.forEach(p => {
    chroniclesOfPlayer(p.id).forEach(r => {
      const d = CHRONICLE_BY_ID[r.id];
      roh[p.id].rekord.push({id:r.id, name:r.name, art:d.art, kind:d.kind, basis:d.basis,
                             halter:(r.pids || [r.pid]).length});
    });
  });

  // 2. Punkte.
  const out = {};
  alle.forEach(p => {
    const r = roh[p.id];

    // Nur heute gehaltene Rekorde werden gestapelt: Rang 1–2 zählen voll,
    // Rang 3–5 mit √2, Rang 6–8 mit √3 usw.
    // Auszeichnungen: sichtbare Klasse × gedämpfte Wiederholungsfolge.
    // Kein Quellenlimit verändert anschließend den Wert oder macht ihn von
    // der Sortierreihenfolge anderer Auszeichnungen abhängig.
    const az = [];
    r.badges.forEach(b => {
      const kl = rarityOf(b.id);
      const regel = _auszeichnungsRegel(b.id);
      const w = auszeichnungsPunkte(b.id, b.n);
      if(w <= 0) return;
      az.push({q:'auszeichnung', id:b.id, name:b.name, p:w, klasse:kl,
               mal:b.n, abnahme:_auszeichnungsAbnahme(b.id),
               basis:regel.basis, voll:w});
    });
    const pb = az.reduce((sum, q) => sum + q.p, 0);

    // Monatschroniken: Grundwert und Bonus über der Schwelle [§C39].
    const mo = [];
    // Hohe Chronikwerte stehen vor kleinen und bekommen damit die geringste
    // Wurzeldämpfung. So kann eine später erreichte, außergewöhnliche Chronik
    // eine Laufbahn noch sichtbar prägen; die Reihenfolge des Katalogs oder
    // der Monate beeinflusst die Punkte nicht.
    r.monat.forEach(m => {
      const voll = chronikPunkte(m.id, m.wert);
      if(voll <= 0) return;
      // Die Art der CHRONIK, nicht die der Disziplin: seit §C39 traegt
      // `monat.art` den Wert (Koennen, Konstanz, Fuegung), waehrend `art` der
      // Disziplin nur noch die Katalogreihenfolge bestimmt. In der Laufbahn
      // stand deshalb „Leistung" neben einer Chronik, deren Punkte aus
      // „Konstanz" kamen — die Zeile erklaerte den Wert daneben nicht.
      const km = _chronikMonat(m.id) || {};
      // `grundwert` und `bonus` getrennt: das Laufbahnblatt zeigt die
      // Rechnung, und aus der Summe allein war nicht zu sehen, wie weit
      // jemand über der Schwelle lag.
      mo.push({q:'monat', id:m.id, name:m.name, label:m.label,
               sid:m.sid, p:voll, voll, grundwert:CHRONIK_GRUNDWERT,
               bonus:voll - CHRONIK_GRUNDWERT, ueber:chronikUeber(m.id, m.wert),
               kunst:km.art || '', klasse:km.klasse || ''});
    });
    const pm = _wurzelStapel(mo, 3);

    // Allzeitwertungen: ein geteilter Rekord zählt geteilt — und dann
    // dasselbe Gesetz wie überall.
    const re = [];
    r.rekord.forEach(x => {
      const basis = _rekordBasis(x);
      const halter = x.halter || halterZahl[x.id] || 1;
      const voll = basis / Math.max(1, halter);
      if(voll <= 0) return;
      re.push({q:'rekord', id:x.id, name:x.name, p:voll, art:x.art,
               kind:x.kind, basis, halter});
    });
    const pr = _wurzelStapel(re, 3);

    const quellen = az.concat(mo, re);

    const punkte = Math.round(pb + pm + pr);
    // Dieselbe Restverteilung wie im Laufbahnblatt. Drei unabhängig
    // gerundete Summen konnten zusammen einen Punkt mehr als der Kopf
    // ergeben. Die Rohquellen und die Gesamtformel bleiben unverändert.
    const teile = _prestigeRunden([pb, pm, pr], punkte, 1);
    out[p.id] = {
      pid:p.id, punkte,
      teile:{auszeichnung:teile[0], monat:teile[1], rekord:teile[2]},
      zahlen:{auszeichnung:az.length, monat:mo.length, rekord:re.length},
      gesamt,
      quellen: quellen.sort((a,b) => b.p - a.p)
    };
  });

  const byPid = {}, ruheOut = {};
  aktive.forEach(p => { byPid[p.id] = out[p.id]; });
  ruhe.forEach(p => { ruheOut[p.id] = out[p.id]; });
  const res = {byPid, ruhe:ruheOut, gesamt, rang:Object.values(byPid).sort((a,b) => b.punkte - a.punkte).map(x => x.pid)};
  if(bisMs) _cache._prestigeBis[key] = res;
  else { _cache._prestigeKey = key; _cache._prestige = res; }
  return res;
}

// Der Stand eines Spielers, fertig zum Anzeigen.
function rekordQuelleVon(pid, cid){
  const P = prestigeOf(pid);
  return (P.quellen || []).find(q => q.q === 'rekord' && q.id === cid) || null;
}

// Wer nichts geholt hat, steht am Fuß der Leiter. Eine Stelle für den
// leeren Stand, damit der eingefrorene Rückfall nicht anders aussieht als
// der eines Neulings.
function prestigeLeer(von){
  return {punkte:0, stufe:0, insignie:INSIGNIEN[0], naechste:INSIGNIEN[1],
          fehlt:INSIGNIEN[1].min, grad:0,
          teile:{auszeichnung:0,monat:0,rekord:0},
          zahlen:{auszeichnung:0,monat:0,rekord:0}, quellen:[], platz:0, von:von || 0};
}

function prestigeOf(pid, bisMs){
  // Ein Ruheständler [§C40]: nach seinem Abschluss der gespeicherte Stand,
  // davor dieselbe Rechnung wie für jeden, mit den Rekorden vom
  // Karriereende (`prestigeTabelle().ruhe`).
  if(imRuhestand(pid)){
    const a = ruhestandAbschluss(pid);
    if(a && a.prestige) return a.prestige;
  }
  const T = prestigeTabelle(bisMs);
  const e = T.byPid[pid] || T.ruhe[pid];
  if(!e) return prestigeLeer(T.gesamt);
  const i = insigniumStufeVon(e.punkte);
  const letzte = i === INSIGNIEN.length - 1;
  // Der Grad folgt den Schwellen oben, auf jeder Stufe gleich.
  const gs = insigniumGradSchwellen(i);
  return Object.assign({}, e, {
    stufe:i,
    insignie:INSIGNIEN[i],
    naechste: letzte ? null : INSIGNIEN[i + 1],
    fehlt: letzte ? 0 : INSIGNIEN[i + 1].min - e.punkte,
    grad: gs.reduce((g, schwelle, gi) => e.punkte >= schwelle ? gi : g, 0),
    // Den Platz eines Ruheständlers im Prestige hält sein Karriere-Teil.
    platz: imRuhestand(pid) ? ruhestandStand(pid).platz : T.rang.indexOf(pid) + 1,
    von: imRuhestand(pid) ? ruhestandStand(pid).von : T.gesamt
  });
}

// Die Lage auf der Leiter als EINE Zahl: Stufe mal drei plus Grad. Ob jemand
// so hoch steht wie nie zuvor, ist damit ein Vergleich zweier Zahlen und
// keiner aus Stufe und Grad [§C30].
function insigniumPos(P){
  if(!P) return 0;
  return (P.stufe | 0) * INSIGNIUM_GRADE + (P.grad | 0);
}

// ─── §13.9 Das Zeichen: Insignium und Titelband ──────────────────────
//     Drei Achsen, drei Aussagen, keine doppelt:
//
//     DER REIF um den Avatar ist das Prestige. Sieben Stufen, jede eine
//     eigene Form, je drei Grade [§C30].
//     DER SCHIMMER des Zeichens ist der Rang: Steine, Lilie und Kristall
//     tragen die Rangfarbe.
//     DAS TITELBAND ist die dritte Achse: die Aura hinter dem Zeichen wird
//     mit jedem Meistertitel heller [§C36], die Sterne zählen die Titel. Die Raute am
//     Fuß trägt die Liga-Position — die Zahl, die sich jede Woche ändert,
//     gegenüber den Titeln, die bleiben.

// Wie oft jemand Meister war. Nur abgeschlossene Saisons — der laufende
// Monat ist noch nicht entschieden.
function meisterTitel(pid){
  const key = 'meister_' + pid + '_' + matches.length + '_' + _cache.version;
  if(!_cache._meister) _cache._meister = {};
  if(_cache._meister[key] != null) return _cache._meister[key];
  // Mit der Version im Schluessel waechst der Topf sonst ueber jede Version mit.
  _topfDeckel(_cache._meister, 60);
  const cur = currentSeason().id;
  let n = 0;
  (allPastSeasons() || []).forEach(sid => {
    if(sid === cur) return;
    if(seasonChampion(sid) === pid) n++;
  });
  _cache._meister[key] = n;
  return n;
}

// Die aktuelle Position in der Liga — dieselbe Quelle wie die Krone des
// Meisters, damit Wappen und Krone einander nie widersprechen.
function ligaPosition(pid){
  try {
    const C = _seasonTitleCtx(currentSeason().id);
    // rankAll und nicht rank: die Position gilt ab der ersten Partie, die
    // Wertungsschwelle TITLE_MIN_GAMES gehört den Monatswertungen [§13.2].
    const i = (C.rankAll || C.rank || []).findIndex(r => r.id === pid);
    return i >= 0 ? i + 1 : 0;
  } catch(e){ return 0; }
}

/* ==INS-GRAFIK-START== */

// ─── §13.9b Das Zeichen ────────────────────────────────────────────────
//     SIEBEN STUFEN, SIEBEN GEGENSTÄNDE, je drei Grade — einundzwanzig
//     Zeichnungen nach der Vorlage (35a-insignium-zeichen.js). Die Stufe wechselt
//     den Gegenstand, der Grad baut ihn aus [§C30]. Oben trägt jedes Zeichen
//     seinen Kopf (Lilie oder Krone), unten die Raute mit der Ligaposition.
//     Gezeichnet werden hier nur noch Sterne, Lichter und die Ziffer in der
//     Raute; die Aura kommt aus 35c-titel-aura.js.

// Zwei Farben mischen — für den Goldverlauf der Sterne.
function _insMix(hex, ziel, f){
  const a = hex.replace('#',''), b = ziel.replace('#','');
  let s = '#';
  for(let i = 0; i < 3; i++){
    const p = parseInt(a.substr(i*2,2),16), q = parseInt(b.substr(i*2,2),16);
    s += Math.round(p + (q - p) * f).toString(16).padStart(2,'0');
  }
  return s;
}
const _n = v => (Math.round(v * 10) / 10);

// Die Verläufe eines Zeichens hängen an ZWEI Dingen: am Metall des Rangs und
// am Glanz der Sterne. Nicht am Spieler, nicht an der Stufe, nicht an der
// Größe. Sie stehen deshalb einmal im Dokument, in einem eigenen unsichtbaren
// <svg>, und jedes Wappen verweist nur darauf.
//
// Vorher trug jedes Wappen seine zwölf Verläufe selbst. Im Awards-Tab waren
// das 312 Gradienten in 82 Wappen — die aus einem knappen Dutzend
// verschiedener Sätze bestanden. Rund sechzig der siebenundneunzig Knoten
// eines Zeichens waren seine eigene <defs>-Kopie.
//
// Der Topf hängt am Rumpf der Seite und überlebt damit jedes render(), das
// nur #app.innerHTML ersetzt. Wer den ganzen Rumpf ersetzt (Teststände tun
// das), nimmt ihn mit — dann wird er beim nächsten Zeichen neu angelegt und
// gefüllt. Gibt es überhaupt kein Dokument, trägt das Zeichen seine Verläufe
// wieder selbst; dann stimmt das Bild und nur die Zahl der Knoten nicht.
let _insTopf = null;                 // das <svg> mit den Verläufen
const _insDrin = new Set();          // welche Sätze darin schon stehen
const _insDefsIds = new Map();       // Satz-Schlüssel → id-Präfix
function _insDefsRef(rangLabel, glanz){
  const schl = (rangLabel || '-') + '|' + glanz;
  let id = _insDefsIds.get(schl);
  if(!id){ id = 'ind' + _insDefsIds.size + '_'; _insDefsIds.set(schl, id); }
  const topf = _insTopfHolen();
  if(!topf) return {id, inline:true};
  if(topf !== _insTopf){ _insTopf = topf; _insDrin.clear(); }
  if(!_insDrin.has(schl)){
    topf.insertAdjacentHTML('beforeend', _insDefs(id, _insSatzCache(rangLabel), glanz));
    _insDrin.add(schl);
  }
  return {id, inline:false};
}
// Gefragt ist nicht, OB etwas unter der id steht, sondern ob es Markup
// aufnehmen kann: ein Teststand ohne Browser liefert für jede id einen
// Stellvertreter, der nur so tut als wäre er ein Element. Dort trägt jedes
// Zeichen seine Verläufe wieder selbst — gerechnet wird dasselbe Bild.
function _insTopfHolen(){
  try {
    const da = document.getElementById('insDefs');
    if(da && typeof da.insertAdjacentHTML === 'function') return da;
    const b = document.body;
    if(!b || typeof b.insertAdjacentHTML !== 'function') return null;
    b.insertAdjacentHTML('beforeend',
      '<svg id="insDefs" aria-hidden="true" focusable="false"'
      + ' style="position:absolute;width:0;height:0;overflow:hidden"></svg>');
    const neu = document.getElementById('insDefs');
    return (neu && typeof neu.insertAdjacentHTML === 'function') ? neu : null;
  } catch(e){ return null; }
}
// Ein Satz je Rang, einmal gerechnet.
const _INS_SATZ = new Map();
function _insSatzCache(rang){
  const k = rang || '-';
  let c = _INS_SATZ.get(k);
  if(!c){ c = _insSatz(rang); _INS_SATZ.set(k, c); }
  return c;
}

const INS_R = 40;                    // Radius des Reifs
const INS_BREIT = 5.0;               // Breite des Bands
const INS_RA = INS_R + INS_BREIT / 2;  // Außenkante

// Die Rangfarbe. Sie ist der Schimmer des Zeichens [§C30]: Lilie, Steine
// und Kristalle der Leiter tragen sie in jedem Rang an denselben Stellen —
// Violett, Gold, Grün, Blau, Orange.
const INS_RANGFARBE = {
  Einsteiger:'#ff7849', Solide:'#56b4e8', Stark:'#E4F24A',
  Elite:'#a78bfa', Legende:'#f7cf4a',
};
// Der Rang der Vorlage. In ihm stehen die Zeichen dort, wo sie keinem
// Spieler gehören — in der Leiter der Liga, im Fun Fact.
const INS_BILD_RANG = 'Elite';
// Die Rangfarbe als Ton [§13.1]: dieselbe Farbe, die der Rang in der
// Rangliste trägt — als Paar aus CSS-Farbe und rgb-Tripel für rgba().
// Sie ist der Anker des Farbgesetzes [§C25]: eine Seite, eine Farbe.
const RANG_TON = {Legende:'gold', Elite:'purple', Stark:'acid',
                  Solide:'blue', Einsteiger:'orange'};
function rangTon(pid){
  return titleTone(RANG_TON[(getPlayerRank(pid) || {}).label] || 'blue');
}

const INS_GOLD = '#E8C25E';
const INS_GOLD_TIEF = '#6E4A0E';     // die Trennkante zwischen zwei Blättern

// Der Farbsatz eines Zeichens: die Rangfarbe und der dunkle Grund, auf dem
// das Zeichen liegt. Mehr hängt am Rang nicht mehr — Metall,
// Steine und Lichter trägt die Zeichnung selbst.
function _insSatz(rang){
  const l = INS_RANGFARBE[rang] ? rang : 'Solide';
  return {rang:l, rf:INS_RANGFARBE[l], unter:'#04070A'};
}

function _insDefs(id, c, glanzGold){
  const gl = glanzGold === undefined ? .3 : glanzGold;
  const gHell = _insMix('#DFBE79', '#FFF9E2', gl);
  const gMitt = _insMix('#BE9034', '#F2CE72', gl);
  const gTief = _insMix('#6E4A0E', '#A97A1E', gl);
  const st = (o, col, op) => `<stop offset="${o}" stop-color="${col}"`
    + (op !== undefined ? ` stop-opacity="${op}"` : '') + `/>`;
  const lin = (nm, x1,y1,x2,y2, stops) =>
    `<linearGradient id="${id}${nm}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
  return `<defs>`
    + lin('gd', 0,0,'.2',1, st(0,gHell) + st('.28',_insMix(gHell,gMitt,.45)) + st('.62',gMitt) + st(1,gTief))
    // Der Hof in der Rangfarbe ab dem Zierkranz: der Schimmer braucht Luft um
    // sich. Ein Kreis mit einem Verlauf aus dem gemeinsamen Topf, kein
    // Filter — ein blur() auf zwölf Wappen einer Rangliste kostete in jedem
    // Bild des Scrollens.
    + `<radialGradient id="${id}hof">`
      + st(0,c.rf,'0') + st('.6',c.rf,'0') + st('.66',c.rf,'.24') + st('.82',c.rf,'.08')
      + st(1,c.rf,'0') + `</radialGradient>`
    // Die Glut am Innenrand: Licht in der Rangfarbe, das zwischen Gesicht und
    // Reif hervortritt. Sie liegt als Ring zwischen dem Avatar (46 % der
    // Kachel) und dem Band und ist damit auch bei 52 px zu sehen.
    + `<radialGradient id="${id}glut">`
      + st(0,c.rf,'0') + st('.8',c.rf,'0') + st('.95',c.rf,'.5') + st(1,c.rf,'.7')
      + `</radialGradient>`
    + `<radialGradient id="${id}pl" cx=".38" cy=".32" r=".85">`
      + st(0,'#1e242b') + st('.55','#141920') + st(1,'#090d11') + `</radialGradient>`
    + `</defs>`;
}

/* ── Die sieben Stufen ───────────────────────────────────────────────
     Stufe 1  Reif          Das Band, oben die Lilie, unten die Raute;
                            ab Grad II Nieten, in Grad III ein Rand aus Rotgold.
     Stufe 2  Schildring    Sicheln außen am Reif; ab Grad II die Flügel am
                            Stein.
     Stufe 3  Volutenkranz  C-Schnecken Rücken an Rücken; ab Grad II ein
                            zweites Paar, in Grad III Akanthus und Steine.
     Stufe 4  Zierkranz     Akanthuswedel mit Fiederblättern; ab Grad II ein
                            zweiter Wedel und die Rangfarbe im Laub.
     Stufe 5  Lorbeerreif   Lorbeer an einem Zweig, Beeren in der Rangfarbe;
                            in Grad III Gold und eine kleine Krone.
     Stufe 6  Kronenreif    Eichenlaub in zwei Lagen, Eicheln als Steine, ein
                            Band unter dem Stein und die Krone.
     Stufe 7  Ordensstern   Eine Glorie aus Haarstrichen, große Spitzen, die
                            Krone mit Kristall; drei Zeichnungen, eine je Grad.

   Die Zeichen sind der Vorlage nachgezeichnet, als Vektor in
   35a-insignium-zeichen.js. Ausgeschnitten aus der gemalten Vorlage waren
   sie verwaschen und trugen den Grund der Vorlage an den Rändern; gerechnet
   aus Kreisen und Pfaden traf keine Runde die Vorlage. Jetzt folgt jedes
   Teil — Band, Lilie, Raute, Sicheln, Schnörkel, Laub, Krone, Strahlen —
   der Vorlage und ist in jeder Größe scharf. */

// Die Kante einer Zeichnung in Zeichen-Einheiten. Der Innenrand des Reifs
// liegt in jeder Zeichnung bei 22 % der Kante (IZ_RI), also liegt er hier auf
// dem Innenrand des Bands — dort, wo Gesicht und Glut gemessen sind.
const INS_BILD_KANTE = (INS_R - INS_BREIT / 2) / (IZ_RI / 1000);
// Die Mitte des Steins in der Raute am Fuß, 28 % der Kante unter der Mitte.
const INS_RAUTE_Y = 50 + (IZ_RAUTE - 500) / 1000 * INS_BILD_KANTE;

// Welches Bild eine Stufe zeigt: das ihres Grades, auf jeder Stufe eines je
// Grad.
function _insBildNr(key, grad){
  const n = (INS_ZEICHEN[key] || INS_ZEICHEN.reif).length;
  return Math.max(0, Math.min(n - 1, grad || 0));
}

// Das Zeichen einer Stufe: das Bild ihres Grades, darunter die Lichter.
function _insStufe(key, c, id, grad, eigen, bild){
  const nr = _insBildNr(key, grad);
  const k = INS_BILD_KANTE, o = 50 - k / 2;
  // Der Hof in der Rangfarbe, ab dem Zierkranz und mit jeder Stufe kräftiger:
  // höheres Prestige leuchtet mehr, ohne dass eine neue Form dazukommt
  // [§C30]. Beide Lichter tragen `data-schein`: sie sind Licht, keine Form.
  const si = Math.max(0, INSIGNIEN.findIndex(x => x.key === key));
  const hof = si >= 3 ? `<circle data-schein="1" cx="50" cy="50" r="68" fill="url(#${id}hof)"
      opacity="${_n(.45 + (si - 3) * .18)}"/>` : '';
  // Die Glut wächst mit jedem Feld der Leiter, vom Schildring an: ein
  // Zeichen, das weiter oben steht, leuchtet von innen mehr, und genau das
  // sieht man auch, wo vom Schmuck in einer Zeile wenig ankommt.
  const feld = si * INSIGNIUM_GRADE + Math.min(INSIGNIUM_GRADE - 1, nr);
  const glut = feld >= INSIGNIUM_GRADE ? `<circle data-schein="1" cx="50" cy="50"
      r="${_n(INS_R - INS_BREIT/2)}" fill="url(#${id}glut)"
      opacity="${_n(Math.min(1, .22 + (feld - INSIGNIUM_GRADE) * .045))}"/>` : '';
  const kk = INS_ZEICHEN[key] ? key : 'reif';
  if(bild && !eigen) return hof + glut
    + `<image href="${insBildHref(kk, nr, c.rang)}" x="${_n(o)}" y="${_n(o)}" width="${_n(k)}" height="${_n(k)}"/>`;
  return hof + glut + _insZeichnung(kk, nr, c.rang, o, k, eigen);
}

// ── Die Zeichnung als Vektor im Dokument [§C30] ──────────────────────
// Sie stand als `<image>` mit einer SVG-Datei darin. Safari rastert ein
// solches Bild in der Größe seiner Nutzereinheiten und nicht in der, in der
// es erscheint: im Profilkopf wurden 170 Einheiten auf 270 px gezogen, und
// jedes Insignium stand mit Treppenkanten da wie ausgeschnitten. Als Vektor
// zeichnet der Browser es in jeder Größe neu. Es steht einmal je Rang, Stufe
// und Grad im Topf, die Verläufe NEBEN der Gruppe — ein `<use>` klont nur,
// was es verweist, und die Verläufe braucht es nicht je Wappen. Ohne Topf
// (`eigen`, Tests, Rastern außerhalb des Dokuments) steht die Zeichnung
// vollständig im Markup.
// Das gilt ab einer Wappengröße von `INS_VEKTOR_PX`: darunter bleibt es beim
// Bild (`insBild`), weil ein Verweis die ganze Zeichnung klont und der Feed
// mit siebzig Wappen damit doppelt so lange zum Öffnen brauchte.
const INS_VEKTOR_PX = 64;
const _insZIds = new Map();          // Rang|Stufe|Bild → id der Gruppe
const _insZDrin = new Set();
let _insZTopf = null, _insZLauf = 0;
function _insZeichnung(key, nr, rang, o, k, eigen){
  const hin = inner => `<g transform="translate(${_n(o)} ${_n(o)}) scale(${(k / 1000).toFixed(5)})">${inner}</g>`;
  const farbe = INS_RANGFARBE[rang] || INS_RANGFARBE.Solide;
  const topf = eigen ? null : _insTopfHolen();
  if(!topf){
    const t = _izTeile(key, nr, farbe), p = 'ize' + (++_insZLauf) + '_';
    return hin(_izPraefix(t.defs + t.bild, p));
  }
  if(topf !== _insZTopf){ _insZTopf = topf; _insZDrin.clear(); }
  const schl = rang + '|' + key + '|' + nr;
  let id = _insZIds.get(schl);
  if(!id){ id = 'izg' + _insZIds.size; _insZIds.set(schl, id); }
  if(!_insZDrin.has(id)){
    const t = _izTeile(key, nr, farbe);
    topf.insertAdjacentHTML('beforeend',
      _izPraefix(t.defs, id + '_') + `<defs><g id="${id}">${_izPraefix(t.bild, id + '_')}</g></defs>`);
    _insZDrin.add(id);
  }
  return hin(`<use href="#${id}"/>`);
}

// Die Raute am Fuß gehört zum Bild. Mit Band trägt sie die Ligaposition: ein
// dunkles Feld über dem Stein und die Ziffer darauf — auf dem gemalten Stein
// wäre eine Ziffer nicht zu lesen.
function _insFuss(pos){
  if(!(pos > 0)) return '';
  const y0 = INS_RAUTE_Y, fx = 4.6, fy = 5.6, zwei = String(pos).length > 1;
  return `<path d="M50 ${_n(y0 - fy)}L${_n(50 + fx)} ${_n(y0)}L50 ${_n(y0 + fy)}L${_n(50 - fx)} ${_n(y0)}Z"
      fill="#0a0e12" opacity=".82"/>`
    + `<text x="50" y="${_n(y0 + (zwei ? 2.3 : 2.8))}" text-anchor="middle" font-size="${zwei ? 6.4 : 8}"
      font-family="'Archivo Black',sans-serif" font-weight="700" fill="#EEF2F5">${pos}</text>`;
}

// Die Titel als Sterne über dem Reif — die Aura zeigt, DASS da etwas
// ist, die Sterne sagen, wie viel. Sie hören nicht auf zu zählen, auch wenn
// die Aura bei zehn Titeln stehen bleibt: ab sechs stehen fünf Sterne
// und daneben die Zahl [§C26]. Zwölf nebeneinander sind keine Zahl mehr,
// die man auf einen Blick liest.
function _insSternPfad(cx, cy, r){
  let d = '';
  for(let i = 0; i < 10; i++){
    const a = i/10*Math.PI*2 - Math.PI/2;
    const rr = i % 2 ? r*.44 : r;
    d += (i ? 'L' : 'M') + _n(cx + Math.cos(a)*rr) + ' ' + _n(cy + Math.sin(a)*rr);
  }
  return d + 'Z';
}
// ─── Die Titelsterne über dem Zeichen [§C26] ──────────────────────
// Sie stehen in einem eigenen Streifen ÜBER dem ganzen Zeichen, auf einem
// festen Radius um die Reifmitte — und ausdrücklich nicht im verkleinerten
// Kasten der früheren Schwinge. Dort lagen sie, und ihr Maßstab zog sie
// von 68 Einheiten über der Reifmitte auf 53 herunter, also genau auf den
// KOPF des Insigniums: bei neun der fünfzehn Zeichnungen standen sie Gold
// auf Gold und waren nicht mehr zu zählen.
//
// Der Radius ist FEST und nicht je Stufe verschieden: die Sterne sagen in
// jedem Zeichen dasselbe, also stehen sie in jedem Zeichen an derselben
// Stelle [§C27]. Er liegt über dem höchsten Zeichen: der Kristall auf der
// Krone des Ordenssterns reicht 72,3 Einheiten über die Reifmitte, ein Stern
// auf 72 lag mit seiner unteren Spitze darin.
const INS_STERN_R = 78;
const INS_STERN_GR = 3.8;
function _insSterne(n, id){
  if(n <= 0) return '';
  // Höchstens fünf Sterne, dann die Zahl — genau wie unter dem Avatar in
  // der Liste (`_znSterneSvg`). Es waren zwei Bögen ab sechs und drei ab
  // dreizehn; damit sagte dieselbe Zahl in der Zeile und im Profil zweierlei,
  // und drei Bögen hätten vierzig Einheiten Luft gebraucht, die neunzehn von
  // zwanzig Spielern nie füllen. Die Ziffer wächst weiter und kostet nichts.
  const zeig = Math.min(n, 5), gr = INS_STERN_GR, R = INS_STERN_R;
  // Ein BOGENschritt, kein Winkelschritt: so haben zwei Sterne denselben
  // Abstand, egal wie weit außen der Bogen liegt.
  const schritt = 2.5 * gr / R;
  // Die Ziffer bekommt einen eigenen Platz im Bogen, und die ganze Gruppe
  // wird darum mittig gestellt — sonst stünde ein Zeichen mit Ziffer
  // sichtbar aus der Achse.
  const felder = zeig + (n > 5 ? 1.5 : 0);
  const w = i => (i - (felder - 1) / 2) * schritt;
  let d = '';
  for(let i = 0; i < zeig; i++)
    d += _insSternPfad(50 + Math.sin(w(i))*R, 50 - Math.cos(w(i))*R, gr);
  let s = `<path d="${d}" fill="url(#${id}gd)" stroke="${INS_GOLD_TIEF}"
    stroke-width=".55" stroke-linejoin="round"/>`;
  if(n > 5){
    const a = w(zeig + .45);
    s += `<text x="${_n(50 + Math.sin(a)*R)}" y="${_n(50 - Math.cos(a)*R + gr*.92)}"
      text-anchor="middle" font-size="${_n(gr*2.4)}"
      font-family="'Archivo Black',sans-serif" font-weight="700"
      fill="${INS_GOLD}" stroke="${INS_GOLD_TIEF}" stroke-width=".5"
      paint-order="stroke">${n}</text>`;
  }
  return s;
}

// Die Zeichenfläche ohne Band ist QUADRATISCH und auf den
// Reifmittelpunkt zentriert: das SVG wird mit translate(-50%,-50%)
// gesetzt, also muss der Reifmittelpunkt der Boxmittelpunkt sein. Sonst
// sitzt der Avatar höher als seine Fassung. Sie ist so eng gelegt, dass
// der Avatar den Reif innen fast füllt und nur ein schmaler dunkler Sitz
// bleibt.
const INS_BOX = '-22 -22 144 144';
// Mit Band: dieselbe Reifgröße, aber Platz für Raute und Sterne. Die Aura
// leuchtet darüber hinaus (`overflow:visible`), sie zählt nicht zur Box. Die
// Box ist waagerecht auf den Reif zentriert, damit translate(-50%) stimmt;
// senkrecht liegen 83 der 155 Einheiten über der Reifmitte und 72 darunter.
// Oben ist der STREIFEN DER STERNE: der Bogen liegt auf 78 Einheiten, ein
// Stern misst 3,8, also endet er bei 81,8 — darunter liegt der höchste Kopf,
// der Kristall des Ordenssterns, bei 72,3. Unten reicht die untere Spitze
// des Ordenssterns bis 72 unter die Mitte; bei 58 schnitt die Box sie ab.
const INS_BAND_BOX = '-40 -33 180 155';

// Das ganze Zeichen. `band:false` lässt Aura, Raute und Sterne weg (Listen,
// Feed). Der Avatar liegt DAVOR, nicht darin — `insAvWrap` legt ihn als
// eigenes Element über das SVG. `pos` überschreibt die Zahl in der Raute — auf dem Podest der
// Ewigen Tafel wäre die Ligaposition eine zweite Rangfolge auf derselben
// Karte, und zwei Zahlen, die sich widersprechen, sind schlimmer als
// keine. `titel` überschreibt die Zahl der Sterne, aus demselben Grund:
// ein Rückblick auf den Mai darf nicht die Titel tragen, die im August
// dazugekommen sind. Der REIF bleibt dabei der heutige — die Laufbahn ist
// eine Karriere und kein Monat.
// Zwei Wappen mit demselben Rang, derselben Stufe und derselben Titelzahl
// sind dieselbe Zeichnung. In der Ewigen Tafel steht jeder Spieler einmal, im
// Awards-Tab bis zu sechsmal — und gerechnet wurde jedes Mal neu.
// Gehalten wird bis zum nächsten Datenstand, wie jeder andere Cache der App
// [§2.1]. Ohne die Grenze wüchse er still: jede neue Partie kann Stufe, Grad
// oder Titelzahl verschieben, und ein Zeichen mit Band misst fünfunddreißig
// Kilobyte. Eine App, die auf einem Telefon tagelang offen steht, sammelte
// darin irgendwann mehr als sie anzeigt.
const _INS_MEMO = new Map();
let _insMemoStand = -1, _insMemoTopf = null;
function insigniumSvg(pid, opt){
  opt = opt || {};
  if(_insMemoStand !== _cache.version){ _INS_MEMO.clear(); _insMemoStand = _cache.version; }
  // Ein gemerktes Wappen verweist auf Zeichnung und Verläufe im Topf. Ist der
  // Topf ein neuer (der Rumpf wurde ersetzt), stünden die Verweise ins Leere,
  // und ein Verweis ins Leere zeichnet nichts.
  const _topfJetzt = _insTopfHolen();
  if(_topfJetzt !== _insMemoTopf){ _INS_MEMO.clear(); _insMemoTopf = _topfJetzt; }
  const P = prestigeOf(pid);
  const rangLabel = (getPlayerRank(pid) || {}).label;
  const band = opt.band !== false;
  const titel = band ? (opt.titel !== undefined ? opt.titel : meisterTitel(pid)) : 0;
  const aura = band ? auraStufe(titel) : 0;
  // Im Profilkopf bewegt sich die Aura in eigenen Ebenen hinter dem SVG
  // (`auraLebendHtml`); dort steht sie nicht noch einmal im Zeichen.
  const auraHier = aura && !opt.lebendig;
  const pos = band ? (opt.pos !== undefined ? opt.pos : ligaPosition(pid)) : 0;
  // Die Sterne tragen den vollen Goldglanz, sobald es Titel gibt. Er stieg
  // mit dem Rang der Schwinge; ein Verlaufssatz je Stufe hätte zehn Sätze
  // im Topf bedeutet für dieselben fünf Sterne.
  const glanz = aura ? 1 : .3;
  // Der Schlüssel nennt alles, was die Zeichnung bestimmt, und sonst nichts.
  // Ohne Größe ist das Zeichen groß (Profilkopf) und wird Vektor.
  const bild = opt.px != null && opt.px < INS_VEKTOR_PX;
  const schl = [rangLabel, P.insignie.key, P.grad, band ? 1 : 0,
                titel, pos, bild ? 1 : 0, auraHier ? 1 : 0].join('|');
  const fertig = _INS_MEMO.get(schl);
  if(fertig !== undefined) return fertig;
  const ref = _insDefsRef(rangLabel, glanz);
  const id = ref.id;
  const c = _insSatzCache(rangLabel);
  let s = `<svg viewBox="${band ? INS_BAND_BOX : INS_BOX}" class="ins" aria-hidden="true">`
    + (ref.inline ? _insDefs(id, c, glanz) : '');
  // Die Aura liegt ganz hinten. Die dunkle Unterlage, die den Reif auf die
  // Schwinge setzte, fällt mit ihr weg: unter Licht wäre sie ein Schatten
  // genau dort, wo der Schein am hellsten ist.
  if(auraHier) s += auraBildIns(aura);
  // Ein dunkler Sitz unter dem Bildrand: der Avatar soll IN der Fassung
  // liegen, nicht davor.
  s += `<circle cx="50" cy="50" r="${_n(INS_RA + .4)}" fill="url(#${id}pl)"/>`
    + `<circle cx="50" cy="50" r="${_n(INS_R - INS_BREIT/2 - 1.6)}" fill="none"
       stroke="#000000" stroke-width="2.4" opacity=".38"/>`
    + _insStufe(P.insignie.key, c, id, P.grad, ref.inline, bild)
    + (band ? _insFuss(pos) : '')
    + (band ? _insSterne(titel, id) : '')
    + `</svg>`;
  // Gemerkt wird nur, was der Topf trägt: eine Zeichnung mit eigenen Verläufen
  // hätte in jeder Kopie dieselben IDs, und dann gälte das erste <defs> für alle.
  if(!ref.inline) _INS_MEMO.set(schl, s);
  return s;
}

// ─── Dasselbe Wappen, einmal gezeichnet [§C30] ───────────────────────
// Der News-Feed trug gemessen 76 Wappen à 48 px: 648 der 713 Kilobyte
// seines Markups und 3069 seiner 4605 DOM-Knoten — bei zwölf Spielern und
// damit einem Dutzend verschiedener Zeichnungen. Diese Schicht wird beim
// Schliessen verschoben und hinter dem `backdrop-filter` des Vorhangs in
// jedem Bild neu geblurrt, und genau das ruckelte: kein JavaScript, eine
// Longtask gab es im Schliessen nie, nur Fläche.
// Die Verläufe stehen schon einmal im Dokument und werden verwiesen; das
// hier ist dasselbe Muster eine Ebene höher — die ganze Zeichnung als
// `<symbol>` im selben Topf, das Wappen nur noch ein `<use>` darauf.
// Der Schlüssel ist das MARKUP selbst: gleiches Markup heisst gleiches
// Symbol. Damit hängt der Topf an der Zahl verschiedener Zeichnungen und
// nicht an der Zeit — er wächst nicht über die Versionen [§3].
// Ohne Topf (Teststand ohne Browser) bleibt es beim vollen Markup, genau
// wie bei den Verläufen: ein `<use>` auf ein Symbol, das es nicht gibt,
// zeichnet nichts.
const _insSymIds = new Map();        // Markup → id der Zeichnung
const _insSymDrin = new Set();       // welche Zeichnungen im Topf stehen
let _insSymTopf = null;
function insigniumRef(pid, opt){
  const markup = insigniumSvg(pid, opt);
  const topf = _insTopfHolen();
  if(!topf) return markup;
  if(topf !== _insSymTopf){ _insSymTopf = topf; _insSymDrin.clear(); }
  let sid = _insSymIds.get(markup);
  if(!sid){ sid = 'insy' + _insSymIds.size; _insSymIds.set(markup, sid); }
  const vb = (/viewBox="([^"]+)"/.exec(markup) || [])[1] || INS_BOX;
  if(!_insSymDrin.has(sid)){
    // Eine GRUPPE in `<defs>`, kein `<symbol>`. Ein `<symbol>` eröffnet beim
    // Verweis ein ZWEITES Koordinatensystem: das äussere `<svg>` trägt
    // `viewBox="-22 -22 144 144"`, das `<use>` setzte darin einen Viewport bei
    // (0,0), und die ganze Zeichnung rutschte um 22 von 144 Einheiten nach
    // unten rechts — auf jeder Seite der App sass der Reif 15 % neben seinem
    // Gesicht. Eine Gruppe erbt das Koordinatensystem des Verweises und
    // zeichnet damit genau dort, wo das volle Markup zeichnete. `<defs>`
    // hält sie zugleich vom Rendern fern, wie die Verläufe daneben.
    const inner = markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    topf.insertAdjacentHTML('beforeend',
      `<defs><g id="${sid}">${inner}</g></defs>`);
    _insSymDrin.add(sid);
  }
  // Die Klasse und die viewBox bleiben am äusseren <svg>: jede CSS-Regel der
  // App greift dort und keine reicht in das Zeichen hinein.
  return `<svg viewBox="${vb}" class="ins" aria-hidden="true"><use href="#${sid}"/></svg>`;
}

// Ein Insignium OHNE Spieler: nur die Form EINER Stufe, ohne Aura und
// ohne Sterne. Die Laufbahn stellt alle Stufen und Grade nebeneinander, und
// dort geht es um die Stufe selbst — nicht darum, wer sie gerade trägt. Der
// Rang kommt trotzdem vom Spieler: er soll sehen, wie das Zeichen bei IHM
// aussähe.
// Im Dokument ist es ein Verweis auf eine Gruppe im Topf, wie das Wappen
// [§C30]: eine Zeichnung misst zwanzig bis siebzig Kilobyte, und die Laufbahn
// zeigt einundzwanzig davon, die kleine Leiter im Feed je Karte sieben. Mit
// `{eigen:true}` trägt es Zeichnung und Verläufe selbst und lässt sich damit auch
// außerhalb des Dokuments rastern; genau das tut `tests/zeichen`.
let _insEigenLauf = 0;
const _insStufeSym = new Map();      // Rang|Stufe|Bild → id der Gruppe
const _insStufeDrin = new Set();
let _insStufeTopf = null;
// Die Zeichnungen der Laufbahn eines Rangs vorab, sobald sie einen Tipp
// entfernt ist: im Profil, dessen Insignium sie öffnet, und in einer Story,
// die zu ihr führt [§2.1b]. Die Vitrine zeigt achtundzwanzig Zeichnungen, und
// jede trägt die Rangfarbe: kalt kostete das erste Laufbahn-Blatt eines Rangs
// gemessen 600 bis 900 ms Skript (vierfach gedrosselt), warm 65 bis 140 ms.
// Vorab gezeichnet werden die einundzwanzig kleinen Felder und je Stufe das
// erste und das letzte große Zeichen — so zeigt die Vitrine eine offene und
// eine durchlaufene Stufe; es bleibt das eine Zeichen der eigenen Stufe, wenn
// sie mitten im Grad steht. Eine Zeichnung je ruhigem Moment, und nur,
// solange Blatt oder Fenster offen sind. Zuerst zeichnete der Start die
// Zeichen jedes Rangs, der in der Liga vorkommt: elf Sekunden lang Blöcke bis
// 336 ms, 3,8 s zusammen, für ein Blatt, das man an diesem Tag vielleicht nie
// öffnet — und wer in dieser Zeit tippte, wartete.
let _insWarmPlan = null;
function _insRangWaermen(pid){
  const rang = (getPlayerRank(pid) || {}).label;
  if(!rang || typeof document === 'undefined') return;
  const alt = _insWarmPlan;
  if(alt && alt.rang === rang && alt.v === _cache.version) return;
  const n = INSIGNIUM_GRADE, plan = [];
  INSIGNIEN.forEach(ins => {
    for(let g = 0; g < n; g++) plan.push([ins.key, g, {bild:true}]);
    plan.push([ins.key, 0], [ins.key, n - 1]);
  });
  const auftrag = _insWarmPlan = {rang, v:_cache.version, plan};
  const weiter = () => {
    if(_insWarmPlan !== auftrag || _cache.version !== auftrag.v || !plan.length) return;
    // Geschlossen ist die Laufbahn wieder weiter weg: der Rest wartet auf
    // das nächste Profil desselben Rangs.
    if(!document.querySelector('.sheet.show, .nd-bg.show')){ _insWarmPlan = null; return; }
    if(!document.hidden){
      const [key, g, opt] = plan.shift();
      try { insigniumStufeSvg(key, rang, g, opt); } catch(e){}
    }
    _leerlauf(1000).then(weiter);
  };
  _leerlauf(1000).then(weiter);
}
function insigniumStufeSvg(key, rangLabel, grad, opt){
  const c = _insSatzCache(rangLabel);
  const topf = (opt && opt.eigen) ? null : _insTopfHolen();
  if(topf){
    if(topf !== _insStufeTopf){ _insStufeTopf = topf; _insStufeDrin.clear(); }
    // Klein (`{bild:true}`) steht die Zeichnung als Bild in der Gruppe, groß
    // als Vektor — dieselbe Grenze wie beim Wappen [§C30]. Die ganze Leiter
    // der Laufbahn zeigt einundzwanzig Felder von rund 40 px, und jedes
    // klonte über `<use>` eine Vektorzeichnung von bis zu 70 Kilobyte: der
    // Topf trug danach 1,7 Megabyte und 7400 Knoten, und das Öffnen der
    // Laufbahn kostete gemessen auch warm 92 ms Skript und 185 ms dahinter.
    const bild = !!(opt && opt.bild);
    const schl = c.rang + '|' + key + '|' + _insBildNr(key, grad) + (bild ? '|b' : '');
    let sid = _insStufeSym.get(schl);
    if(!sid){ sid = 'inst' + _insStufeSym.size; _insStufeSym.set(schl, sid); }
    if(!_insStufeDrin.has(sid)){
      const ref = _insDefsRef(rangLabel, .3);
      topf.insertAdjacentHTML('beforeend', `<defs><g id="${sid}">`
        + `<circle cx="50" cy="50" r="${_n(INS_RA + .4)}" fill="url(#${ref.id}pl)"/>`
        + _insStufe(key, c, ref.id, grad || 0, false, bild) + `</g></defs>`);
      _insStufeDrin.add(sid);
    }
    return `<svg viewBox="${INS_BOX}" class="ins" aria-hidden="true"><use href="#${sid}"/></svg>`;
  }
  const id = 'e' + (++_insEigenLauf) + '_';
  return `<svg viewBox="${INS_BOX}" class="ins" aria-hidden="true">`
    + _insDefs(id, c)
    + `<circle cx="50" cy="50" r="${_n(INS_RA + .4)}" fill="url(#${id}pl)"/>`
    + _insStufe(key, c, id, grad || 0, true)
    + `</svg>`;
}

/* ==INS-GRAFIK-ENDE== */
// Rundet eine Liste so, dass die Summe der gerundeten Werte EXAKT die
// vorgegebene Summe ergibt: erst abrunden, dann die Reste in der Reihenfolge
// der größten Nachkommaanteile verteilen. Ohne das driftet eine Liste aus
// 21 Posten um bis zu einen Punkt gegen ihre eigene Kopfzeile — und dann ist
// die Aufschlüsselung keine Rechnung mehr, sondern nur noch eine Behauptung.
function _prestigeRunden(werte, ziel, schritt){
  const e = Math.round(1 / schritt);            // 1 = ganze Zahlen, 10 = Zehntel
  const roh = werte.map(w => w * e);
  const aus = roh.map(Math.floor);
  let rest = Math.round(ziel * e) - aus.reduce((a, b) => a + b, 0);
  // Nur Posten, die es wirklich gibt, dürfen einen Rest abbekommen.
  const kand = roh.map((w, i) => i).filter(i => roh[i] > 0)
    .sort((a, b) => (roh[b] - aus[b]) - (roh[a] - aus[a]));
  for(let k = 0; rest > 0 && kand.length; k++, rest--) aus[kand[k % kand.length]]++;
  for(let k = 0; rest < 0 && kand.length; k++, rest++) aus[kand[kand.length - 1 - (k % kand.length)]]--;
  return aus.map(v => v / e);
}

// ─── §13.10 Die Laufbahn: wo stehe ich, und was fehlt ────────────────
//     Ein Tipp auf den eigenen Avatar. Kein Menüpunkt, keine Erklärseite —
//     das Zeichen selbst ist der Knopf. Drei Fragen, in dieser Reihenfolge:
//     Wo stehe ich? Woher kommt das? Was ist der nächste Schritt?
//
//     Die nächsten Schritte werden GERECHNET, nicht behauptet: aus den
//     eigenen Zahlen, mit der echten Distanz zum Bestwert bzw. zur
//     Untergrenze, und mit dem Prestige, das dabei herausspringt.

// Bis zu `n` erreichbare nächste Schritte, die günstigsten zuerst.
function prestigeSchritte(pid, n){
  n = n || 3;
  const out = [];
  const P = prestigeOf(pid);

  // 1. Allzeitwertungen, die der Spieler noch nicht hält.
  try {
    const C = _chronicleCtx(), A = allChronicles(), p = C.P[pid];
    if(p){
      CHRONICLES.forEach(def => {
        // ── Ein Ziel, das niemand haben will, ist kein Ziel ──────────
        // Gefiltert wurde nur die Schattenseite, nicht die negative
        // Fuegung. Damit stand „Alex kann ‚Die bitterste Pleite' holen"
        // im Feed — die hoechste Siegchance, mit der je jemand verlor,
        // als Aufgabe. `nextRecordFor` kennt die Regel seit jeher und
        // nennt in seinem Kommentar genau diesen Fall [§C25].
        // Der Katalog schreibt `negativ`, ein Rekord traegt es abgeleitet
        // als `neg` — hier laeuft die Liste der Rekorde, nicht der Katalog.
        if(def.art === 'schatten' || def.neg) return;
        const halte = A.byId[def.id];
        if(halte && halte.pids.includes(pid)) return;
        let mein = null, ziel = null;
        if(def.unit && def.raw){
          mein = def.raw(p, C);
          ziel = halte ? halte.val : (def.min || 0);
        } else if(def.val){
          mein = def.val(p, C);
          ziel = halte ? halte.val : null;
        }
        if(mein == null || !isFinite(mein) || ziel == null || mein >= ziel) return;
        const rel = (ziel - mein) / Math.max(1e-9, Math.abs(ziel));
        const voll = _rekordBasis(def)
          / Math.max(1, (halte ? halte.pids.length + 1 : 1));
        const gewinn = _wurzelZuwachs(
          P.quellen.filter(q => q.q === 'rekord').map(q => q.voll), voll, 3);
        out.push({
          art:'rekord', id:def.id, name:def.name, ic:def.ic, tone:def.tone, rel,
          gewinn:Math.round(gewinn),
          // Die Bedingung sagt, was zu tun ist. Sie stand hier nur im Fall
          // „noch niemand haelt es"; sonst las die Karte sich als „Stefan
          // haelt den Bestwert" und nannte weder die Aufgabe noch den
          // Rueckstand. Der Gedankenstrich ist mit weg: er trennte einen
          // Satz, der als zwei Saetze klarer ist [§C33].
          cond: def.cond || '',
          stand: halte ? _chronKurz(halte.ev) : '',
          halter: halte ? _chronHalterSatz(halte) : '',
          halterN: halte ? (halte.pids || []).length : 0,
          // ── Der eigene Stand ist die Zahl, mit der man etwas anfangen
          // kann ──────────────────────────────────────────────────────
          // Die Karte nannte die Schwelle und den Bestwert des Halters —
          // aber nicht, wo der Spieler selbst steht. „Martin haelt 84 %"
          // sagt ohne die eigenen 71 % nichts darueber, wie weit es noch
          // ist. Formatiert wird er wie der Bestwert, durch denselben
          // Beleg des Katalogs: zwei Zahlen in zwei Einheiten waeren
          // nicht vergleichbar.
          mein: (function(){
            try { return def.ev ? _chronKurz(def.ev(p, mein)) : ''; } catch(e){ return ''; }
          })(),
          txt: def.unit
            ? `Noch ${Math.max(1, Math.ceil(ziel - mein))} ${def.unit}`
              + (halte ? `. ${_chronHalterSatz(halte)} ${halte.pids.length > 1 ? 'halten' : 'hält'} ${Math.round(ziel)}` : '')
            : (halte ? `${_chronHalterSatz(halte)} ${halte.pids.length > 1 ? 'halten' : 'hält'} den Bestwert mit ${_chronKurz(halte.ev)}`
                     : def.cond)
        });
      });
    }
  } catch(e){ /* Kontext noch nicht da — dann eben ohne Rekorde */ }

  // 2. Monatswertungen der laufenden Saison, die noch offen sind.
  try {
    const T = seasonTitles(currentSeason().id);
    if(!T.awarded.some(a => a.pid === pid)){
      seasonTitleRace(currentSeason().id).forEach(r => {
        if(!r || r.pid === pid) return;
        const d = DISZIPLINEN.find(x => x.id === r.id);
        if(!d || d.art === 'schatten' || d.negativ) return;
        out.push({
          art:'monat', id:r.id, name:r.name || (d && d.name), ic:d.ic, tone:d.tone,
          rel: 0.55,          // ein offener Monatseintrag ist immer „diesen Monat noch"
          // Der Grundwert: was darüber kommt, hängt daran, wie weit die
          // Schwelle am Ende überboten wird [§C39], und das steht noch aus.
          gewinn: Math.round(_wurzelZuwachs(
            P.quellen.filter(q => q.q === 'monat').map(q => q.voll),
            chronikPunkte(r.id), 3)),
          cond: (d.monat && d.monat.cond) || '',
          stand: r.ev ? _chronKurz(r.ev) : '',
          halter: r.pid ? pname(r.pid) : '',
          txt: r.pid ? `${pname(r.pid)} führt mit ${_evSatz(r.ev) || (d.monat && d.monat.cond)}`
                     : (d.monat && d.monat.cond) || ''
        });
      });
    }
  } catch(e){ /* dito */ }

  // Ein Rekord, der weit weg ist, ist kein Schritt, sondern eine Absage.
  // Wer wenig hält, bekommt sonst zwangsläufig die teuersten Ziele
  // vorgeschlagen — es ist ja nichts Näheres da. Lieber gar nichts sagen.
  return out.filter(x => x.gewinn > 0 && (x.art !== 'rekord' || x.rel <= PRESTIGE_REICHWEITE))
    .sort((a, b) => a.rel - b.rel || b.gewinn - a.gewinn)
    .slice(0, n);
}

// Die drei Klassen bleiben als schneller Vergleich nebeneinander. Die
// vollstaendige Rechnung lebt aber in einem eigenen Blatt: Im Laufbahnbuch
// muss man die einzelnen Posten lesen koennen, ohne zuerst drei eng gesetzte
// Regelkarten zu entziffern. Legendary nennt die Spanne seiner Startwerte:
// jede legendäre Auszeichnung hat ihren eigenen, und ein einzelner Wert in
// der Karte stimmte für keine davon.
function _prestigeRegelKarten(){
  // Die Spanne jeder Klasse: seit die Meilensteine eigene Werte tragen,
  // stand über einer Siegermaschine mit 150 Prestige „Rare 25 P Start".
  const spanne = klasse => {
    const w = BADGES.filter(b => rarityOf(b.id) === klasse).map(b => _auszeichnungsRegel(b.id).basis);
    const min = Math.min(...w), max = Math.max(...w);
    return !w.length ? PRESTIGE_AUSZEICHNUNG[klasse].basis : min === max ? min : min + '–' + max;
  };
  const karte = (klasse, titel, start, regel) => `<span class="${klasse}">
      <b>${titel}</b><strong>${start} P Start</strong>
      <em>1. und 2. Mal voll.<br>
      3. und 4. Mal ${Math.round(regel.abnahme * 100)}&nbsp;% weniger; danach paarweise flacher, nie 0.</em></span>`;
  return `<div class="lb-regeln">
    ${karte('legendary', RARITY_META.legendary.label, spanne('legendary'), PRESTIGE_AUSZEICHNUNG.legendary)}
    ${karte('rare', RARITY_META.rare.label, spanne('rare'), PRESTIGE_AUSZEICHNUNG.rare)}
    ${karte('common', RARITY_META.common.label, spanne('common'), PRESTIGE_AUSZEICHNUNG.common)}
  </div>`;
}

// Jede Auszeichnung mit eigenem Startwert, nach ihrem Gewicht geordnet: der
// Startwert zuerst, bei Gleichstand die langsamere Kurve, dann der Name. Die
// Liste stand fest im Blatt, sechs Zeilen in einer Reihenfolge, die jemand
// einmal gewählt hatte — eine neue Auszeichnung wäre entweder gar nicht
// erschienen oder hinten angehängt worden, egal was sie wiegt. Der Balken
// zeigt den Startwert gegen den höchsten: ob eine Auszeichnung ein Drittel
// oder fast so viel wie die stärkste wiegt, liest man dort, ohne zu rechnen.
function _prestigeRegelListe(){
  const zeilen = Object.keys(PRESTIGE_AUSZEICHNUNG_SPEZIAL)
    .map(id => ({id, b:BADGES.find(x => x.id === id), r:_auszeichnungsRegel(id)}))
    .filter(x => x.b)
    .sort((x, y) => y.r.basis - x.r.basis || x.r.abnahme - y.r.abnahme
      || x.b.name.localeCompare(y.b.name, 'de'));
  const max = Math.max(1, ...zeilen.map(x => x.r.basis));
  return zeilen.map(({id, b, r}) => `<div class="lb-regel-z" data-id="${id}" data-kl="${r.klasse}">
      <span><b>${esc(b.name)}</b><em>${esc(b.desc || '')}</em></span>
      <strong>${r.basis} P <i>Start</i></strong>
      <small>3. + 4. Mal −${Math.round(r.abnahme * 100)} %</small>
      <i class="lb-regel-b" style="--w:${Math.round(r.basis / max * 1000) / 10}%"></i>
    </div>`).join('');
}

function showPrestigeRegeln(pid){
  const p = (pmap() || {})[pid];
  _sheetSetReopen(() => showPrestigeRegeln(pid));
  const bsp = _auszeichnungsRegel('dominator_400');
  const bsp3 = Math.round(auszeichnungsTeilwert('dominator_400', 3) * 10) / 10;
  openSheet(`<div class="pp-root lb-regelblatt">
    ${blattKopfHtml({ic:'info', titel:'Wert der Auszeichnungen',
      unter:((p && p.name) || '') + ' · dieselbe Auszeichnung wächst immer weiter'})}
    <p class="lb-regel-intro">Jede Auszeichnung beginnt mit ihrem Startwert. Die ersten beiden Erfolge zählen voll, danach sinkt ihr Wert in Zweiergruppen. Je seltener und bedeutender die Leistung, desto langsamer fällt ihre Kurve.</p>
    ${_prestigeRegelKarten()}
    <div class="pp-sec-title"><div class="l"><h4>Eigener Startwert</h4></div><div class="m">nach Gewicht</div></div>
    <div class="lb-regel-liste">${_prestigeRegelListe()}</div>
    <div class="tnote lb-regel-note">Beispiel: Dominator bringt beim ersten und zweiten Mal je ${bsp.basis} Punkte. Das dritte und vierte Mal zählen je ${Number.isInteger(bsp3) ? bsp3 : komma(bsp3)}, danach wird die Kurve paarweise sanfter. Die Summe wächst ohne festes Limit.</div>
  </div>`);
}

// Das Sheet. Aufgerufen vom Avatar im Profilkopf.
// ─── Warum ein Posten so viel wiegt [§C34] ───────────────────────────
// Der Satz stand als Closure im Laufbahnblatt, und das Blatt einer
// Tafel-Karte hatte deshalb keine Rechnung: dort hätte „+100 Prestige"
// gestanden, während die Laufbahn um 34 Punkte steigt — der Grundwert ist
// nicht, was jemand bekommt. Er wird durch die Zahl der Halter geteilt,
// landet auf einem Rang im Stapel und wird dort durch die Wurzel seiner
// Staffel geteilt. Eine Quelle, zwei Blätter, ein Satz [§C27].
// Vorher stand hier „2 von 12" — die Zahl der heutigen Halter. Sie erklärte
// den Wert nicht, sie war der Grund, warum er fiel.
// `ohneKopf` laesst die Einordnung weg — die Kammer bzw. die Klasse. Im
// Rekord-Blatt steht sie zwei Zeilen darueber als Untertitel, und dieselbe
// Angabe zweimal liest man zweimal und erfaehrt nichts [§C33].
function _prestigeQuellSatz(q, ohneKopf){
  // Eine Nachkommastelle, aber ohne die überflüssige Null: die Posten müssen
  // sichtbar zur Summe passen, sonst ist es keine Aufschlüsselung.
  const zahl = v => {
    const r = Math.round((Number(v) || 0) * 10) / 10;
    return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',');
  };
  const teile = [];
  if(q.q === 'rekord'){
    // Die KAMMER und nicht die Art der Disziplin: seit der Grundwert am
    // Eintrag steht [§C34], sagt `art` ueber den Wert nichts mehr — „Der
    // Unaufhaltsame" ist ein Ereignis und wiegt trotzdem wie das Koennen. Die
    // Zeile nannte damit eine Einordnung, die den Wert daneben nicht
    // erklaerte. Der Rueckfall las Namen je „leistung"/„ereignis", die der
    // Katalog nicht kennt, und schrieb damit immer „Ereignis".
    if(!ohneKopf) teile.push((CHRON_KINDS[q.kind] || {}).label
      || CHRONIK_ART_NAME[q.art] || 'Bestmarke');
    let rechnung = `Grundwert ${zahl(q.basis)}`;
    if(q.halter > 1) rechnung += ` ÷ ${q.halter} Halter`;
    if(q.staffel > 1) rechnung += ` · ${q.rang}. Rekord ÷ √${q.staffel}`;
    teile.push(rechnung);
  }
  else if(q.q === 'auszeichnung'){
    teile.push((RARITY_META[q.klasse] || RARITY_META.common).label);
    teile.push(`${q.mal}× erreicht`);
    teile.push(q.mal > 1
      ? `zuletzt ${zahl(auszeichnungsTeilwert(q.id, q.mal))} P`
      : `${zahl(q.basis)} P Startwert`);
  }
  else if(q.label) teile.push(q.label);
  if(q.q === 'monat'){
    if(CHRONIK_KLASSE_NAME[q.klasse]) teile.push(CHRONIK_KLASSE_NAME[q.klasse]);
    if(CHRONIK_ART_NAME[q.kunst]) teile.push(CHRONIK_ART_NAME[q.kunst]);
    // Der Bonus steht mit seinem Grund daneben: „+16" allein sagt nicht,
    // wofür. Ein Stand, der vor dem Bonus gespeichert wurde (der Abschluss
    // eines Ruheständlers [§C40]), hat keinen und zeigt seinen Wert von damals.
    const basis = q.grundwert == null ? q.voll : q.grundwert;
    let rechnung = `Grundwert ${zahl(basis)}`;
    // „weiter als verlangt" und nicht „über der Schwelle": bei einer Chronik
    // mit „höchstens" (die Punktlandung, die Wahrscheinlichkeit eines
    // Monats) las sich „über der Schwelle" so, als brächte der größere
    // Abstand den Bonus. Er kommt aus dem kleineren.
    if(q.bonus > 0) rechnung += ` + ${zahl(q.bonus)} für ${chronikSigma(q.ueber)} weiter als verlangt`;
    if(q.staffel > 1) rechnung += ` · ${q.rang}. Chronik ÷ √${q.staffel}`;
    teile.push(rechnung);
  }
  return teile.join(' · ');
}

function showLaufbahn(pid){
  const p = (pmap() || {})[pid];
  if(!p) return;
  _sheetSetReopen(() => showLaufbahn(pid));
  const P = prestigeOf(pid);
  // Eine Seite, eine Farbe [§C25]. Die Stufe hatte hier ihre eigene
  // Leiter (blau → acid → gold); zusammen mit der Rangfarbe des
  // Fingerabdrucks waren das zwei Aussagen in einem Sheet. Die Stufe
  // steht ohnehin im Zeichen und in der Abschnittskante.
  const t = rangTon(pid);
  // Der Ordensstern hat keine nächste Stufe; seine Spur reicht bis Grad III.
  const _gs = insigniumGradSchwellen(P.stufe);
  const spanne = P.naechste ? P.naechste.min - P.insignie.min : _gs[_gs.length - 1] - P.insignie.min;
  const drin = P.punkte - P.insignie.min;
  const _naechsterGrad = P.naechste ? null : _gs.find(x => x > P.punkte);
  const anteil = Math.max(0, Math.min(1, drin / Math.max(1, spanne)));

  // ── Die Vitrine [§13.10] ───────────────────────────────────────────
  //     Vorher stand hier eine Fortschrittsstange mit einer Beschriftung,
  //     danach eine Leiter aus fünf gleich kleinen Stationen. Beide zeigten
  //     das Zeichen so klein, dass man von der Form nichts sah — dabei ist
  //     die Form der ganze Punkt: dafür sammelt man.
  //     Jetzt liegt eine Stufe groß in der Mitte, und man schiebt die
  //     anderen heran. Die eigene steht beim Öffnen da; nach rechts kommt,
  //     was noch aussteht, nach links, was man hinter sich hat.
  const _rangL = (getPlayerRank(pid) || {}).label;
  // Jede Stufe hat drei Felder, eines je Grad, der Ordensstern ebenso. Ein
  // Feld ist erreicht, wenn die Stufe hinter einem liegt oder der eigene
  // Grad mindestens so weit ist.
  const _eigen = P.grad;
  const _da = (i, g) => i < P.stufe || (i === P.stufe && _eigen >= g);
  const _zeichen = (i, g, klein) => insigniumStufeSvg(INSIGNIEN[i].key, _rangL,
    g, klein ? {bild:true} : undefined);
  const karten = INSIGNIEN.map((ins, i) => {
    const zustand = i < P.stufe ? 'erreicht' : i === P.stufe ? 'jetzt' : 'offen';
    // Eine durchlaufene Stufe hat man ganz durchlaufen — sie steht im
    // höchsten Grad. Eine offene zeigt ihren ersten: so sieht man beim
    // Weiterschieben, wie das Zeichen ANFÄNGT, nicht wie es endet.
    const zeigt = i < P.stufe ? INSIGNIUM_GRADE - 1 : i === P.stufe ? _eigen : 0;
    // Die Grade sind Knöpfe: jeder hat sein eigenes Bild, und die Laufbahn
    // ist der Ort, an dem man sie alle ansieht [§C30]. Als Marken sagten sie
    // nur, DASS es sie gibt.
    const marken = Array.from({length:INSIGNIUM_GRADE}, (_, g) =>
      `<button type="button" data-lbgrad="${g}" aria-label="${esc(ins.name + ' ' + INSIGNIUM_GRAD_NAME[g])}"`
      + ` class="${_da(i, g) ? 'an' : ''}${g === zeigt ? ' zeigt' : ''}${i === P.stufe && g === _eigen ? ' hier' : ''}">`
      + `${INSIGNIUM_GRAD_NAME[g]}</button>`).join('');
    const unten = `<span class="lb-k-grad">${marken}</span>`;
    // Groß und scharf muss nur die Karte in der Mitte sein. Jede Vektorzeichnung
    // klont über `<use>` ihren ganzen Baum, und sieben davon kosteten beim
    // Öffnen gemessen 60 ms Stilberechnung von 122 — für Karten, die am Rand
    // klein und angeschnitten stehen. Sie stehen als Bild da, und die Karte,
    // die in die Mitte rückt, bekommt ihre Vektorzeichnung (`_fokus`).
    return `<div class="lb-k ${zustand}" data-lbstufe="${i}" data-lbg="${zeigt}"${i === P.stufe ? ' data-vek="1"' : ''}>
      <span class="lb-k-ins">${_zeichen(i, zeigt, i !== P.stufe)}</span>
      <span class="lb-k-n">${esc(ins.name)}</span>
      <span class="lb-k-p num">${i === 0 ? 'Start' : 'ab ' + ins.min}${
        // Wo ein Grad anfängt, steht neben ihm: die Grade sind runde
        // Schwellen [§C30], und man soll sie nachprüfen können.
        '<br>' + insigniumGradSchwellen(i).slice(1)
          .map((x, g) => INSIGNIUM_GRAD_NAME[g + 1] + ' ' + x).join(' · ')}</span>
      ${unten}
    </div>`;
  }).join('');

  // ── Alle Stufen [§C30] ─────────────────────────────────────────────
  //     Die Vitrine zeigt eine Stufe groß, und ihre Grade tippt man einzeln
  //     an. Wie die ganze Leiter aussieht — was kommt, was es schon gibt —,
  //     sah man nur Stufe für Stufe. Hier steht jedes Feld einmal: erreicht
  //     hell, das eigene gerahmt, was noch kommt leise, aber in Farbe, damit
  //     man sieht, worauf man zuläuft. Antippen legt es oben in die Vitrine.
  const _alle = INSIGNIEN.map((ins, i) => `<div class="lb-alle-z">
      <div class="lb-alle-n"><b>${esc(ins.name)}</b><span class="num">${i === 0 ? 'Start' : 'ab ' + ins.min}</span></div>
      <div class="lb-alle-f">${Array.from({length:INSIGNIUM_GRADE}, (_, g) =>
        `<button type="button" class="lb-feld${_da(i, g) ? ' da' : ''}${i === P.stufe && g === _eigen ? ' jetzt' : ''}"`
        + ` data-lbfeld="${i},${g}" aria-label="${esc(ins.name + ' ' + INSIGNIUM_GRAD_NAME[g])}">${_zeichen(i, g, true)}</button>`).join('')}</div>
    </div>`).join('');
  let _alleN = 0, _alleDa = 0;
  INSIGNIEN.forEach((ins, i) => { for(let g = 0; g < INSIGNIUM_GRADE; g++){ _alleN++; if(_da(i, g)) _alleDa++; } });

  // ── Die zweite Leiter: die Aura [§C36] ───────────────────────────
  //     Zehn Stufen in zwei Reihen, klein und ohne Karussell. Sie gehört
  //     hierher, weil sie zur Laufbahn gehört — aber sie darf die Vitrine
  //     nicht überreden: die eine sammelt man Punkt für Punkt, die andere
  //     gewinnt man. In der Mitte jedes Felds steht das eigene Zeichen, als
  //     Bild aus demselben Topf wie die ganze Leiter: so sieht man, wie das
  //     Licht bei IHM aussähe, und es kostet keine zweite Zeichnung.
  const _titel = meisterTitel(pid);
  const _auraJetzt = auraStufe(_titel);
  const _eigenBild = insBildHref(P.insignie.key,
    _insBildNr(P.insignie.key, P.grad), _insSatzCache(_rangL).rang);
  const auren = AURA_STUFEN.map((name, i) => {
    const st = i + 1;
    const zustand = st < _auraJetzt ? 'erreicht' : st === _auraJetzt ? 'jetzt' : 'offen';
    return `<div class="lb-au ${zustand}" title="${esc(name)}">
      <span class="lb-au-b"><img src="${auraHref(st)}" alt="" loading="lazy"><img class="lb-au-i" src="${_eigenBild}" alt="" loading="lazy"></span>
      <span class="lb-au-p num">${st}</span>
    </div>`;
  }).join('');
  const auFuss = !_auraJetzt
    ? 'ab dem ersten Meistertitel'
    : _auraJetzt === AURA_STUFEN.length
      ? AURA_STUFEN[_auraJetzt - 1] + ', weiter zählen die Sterne'
      : AURA_STUFEN[_auraJetzt - 1] + ', mit dem nächsten Titel ' + AURA_STUFEN[_auraJetzt];

  const teil = (lab, n, pt, sub) => `<div class="lb-teil">
      <div class="lb-t-n num">${pt}</div>
      <div class="lb-t-l">${esc(lab)}</div>
      <div class="lb-t-s num">${n} ${esc(sub)}</div>
    </div>`;

  // ── Die Aufschlüsselung ────────────────────────────────────────────
  //     Vorschläge waren hier das Falsche: wer wenig hält, bekommt
  //     zwangsläufig die teuersten Ziele vorgeschlagen, weil nichts
  //     Näheres da ist — „noch 10 Siege in Folge" ist kein Schritt,
  //     das ist eine Absage. Was fehlt, ist nicht der Rat, sondern die
  //     Rechnung: jeder Posten mit dem Grund, warum er so viel wiegt.
  const gruppen = [
    {q:'auszeichnung', kopf:'Auszeichnungen', leer:'noch keine erhalten', lab:'Stück'},
    {q:'monat',        kopf:'Monatschroniken', leer:'noch keine getragen', lab:'getragen'},
    {q:'rekord',       kopf:'Rekorde',         leer:'noch keinen gehalten', lab:'gehalten'},
  ];
  const posten = gruppen.map(g => P.quellen.filter(q => q.q === g.q));
  // Erst die drei Gruppensummen auf die Gesamtzahl abstimmen, dann in jeder
  // Gruppe die Posten auf ihre Gruppensumme. So passt jede Zeile zu der
  // Zahl über ihr und alles zusammen zur Zahl darunter.
  const summen = gruppen.map(g => P.teile[g.q]);
  const werte  = posten.map((qs, i) => _prestigeRunden(qs.map(q => q.p), summen[i], 0.1));

  // Zahlen mit einer Nachkommastelle, aber ohne die überflüssige Null:
  // die Posten müssen sichtbar zur Summe passen, sonst ist es keine
  // Aufschlüsselung, sondern nur eine zweite Liste.
  const zahl = v => {
    const r = Math.round(v * 10) / 10;
    return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',');
  };


  // ── Der Fingerabdruck [§13.11] ─────────────────────────────────────
  //     Das Prestige sagt, WAS jemand zusammengetragen hat. Der Abdruck
  //     sagt, WIE er spielt. Beides gehört auf dieselbe Seite, und beides
  //     trägt hier dieselbe Farbe: die des Rangs.
  const _fa = fingerabdruck(pid);
  const _faTon = rangTon(pid);

  // Ein Rekord öffnet seine Chronik, eine Auszeichnung ihre Detailansicht:
  // wann sie kam, in welchen Partien oder an welchem Schluss [§8.5].
  const zeile = (q, w) => `<div class="lb-q"${q.q === 'rekord' ? ` data-chron="${esc(q.id)}"`
      : q.q === 'auszeichnung' ? ` data-bp="${esc(q.id)}" data-bp-pid="${esc(pid)}"` : ''}>
      <span class="n">${esc(q.name)}<em>${esc(_prestigeQuellSatz(q))}</em></span>
      <span class="p num">${zahl(w)}</span>
    </div>`;

  const regeln = `<button class="lb-regel-auf" type="button" data-prestige-regeln>
    <span><b>Wie die Punkte entstehen</b><em>Klassen, Startwerte und Kurven</em></span>
    ${svgI('chevron')}
  </button>`;
  // Fünf Posten je Gruppe stehen offen, die wertvollsten; der Rest klappt
  // in seiner Gruppe auf, und der Knopf nennt, wie viele es sind. Alle offen
  // waren bei einer langen Laufbahn über fünfzig Zeilen, bevor die Summe
  // kam; hinter „Mehr anzeigen · 11 weitere" auf einem anderen Blatt ließ
  // sie sich nicht nachzählen. Aufgeklappt steht jeder Posten da.
  const OFFEN = 5;
  const block = (g, gi) => {
    const qs = posten[gi], w = werte[gi];
    const rest = qs.length > OFFEN ? qs.slice(OFFEN) : [];
    return `<div class="lb-grp">
      <div class="lb-grp-k"><span>${esc(g.kopf)}</span><span class="num">${zahl(summen[gi])}</span></div>
      ${g.q === 'auszeichnung' ? regeln : ''}
      ${qs.length ? qs.slice(0, OFFEN).map((q, i) => zeile(q, w[i])).join('')
                  : `<div class="lb-q leer">${g.leer}</div>`}
      ${rest.length ? `<div class="lb-rest chron-rest">${rest.map((q, i) => zeile(q, w[OFFEN + i])).join('')}</div>
      ${_chronMehrKnopf(rest.length)}` : ''}
    </div>`;
  };

  openSheet(`
   <div class="pp-root lb-root st-${P.insignie.key}" style="--ak:${t.c};--ak-rgb:${t.rgb}">
    <h3>Die Laufbahn</h3>
    <div class="sheet-sub num">${esc(p.name)}${P.platz ? ` · Platz ${P.platz} von ${P.von} im Prestige` : ''}</div>

    <div class="lb-karus" id="lbLeiter">
      <div class="lb-k-band">${karten}</div>
    </div>
    <div class="lb-stand">
      <span class="lb-st-p num">${P.punkte}</span>
      <span class="lb-st-l">Prestige</span>
      <span class="lb-st-n num">${P.naechste
        ? 'noch ' + P.fehlt + ' bis ' + esc(P.naechste.name)
        : _naechsterGrad
          ? 'noch ' + (_naechsterGrad - P.punkte) + ' bis ' + esc(P.insignie.name + ' ' + INSIGNIUM_GRAD_NAME[P.grad + 1])
          : 'die höchste Stufe der Leiter'}</span>
    </div>
    <div class="lb-spur"><i style="width:${Math.round(anteil * 100)}%"></i></div>

    <div class="pp-sec-title" style="margin-top:16px">
      <div class="l"><h4>Alle Stufen</h4></div>
      <div class="m num">${_alleDa} von ${_alleN} erreicht</div></div>
    <div class="lb-alle" id="lbAlle">${_alle}</div>

    <div class="pp-sec-title" style="margin-top:16px">
      <div class="l"><h4>Die Aura</h4></div>
      <div class="m num">${_titel} Titel</div></div>
    <div class="lb-auren">${auren}</div>
    <div class="lb-au-fuss">${esc(auFuss)}</div>

    ${_fa ? `<div class="pp-sec-title" style="margin-top:18px">
      <div class="l"><h4>Der Fingerabdruck</h4></div>
      <div class="m num">${_fa[0].von} im Feld</div></div>
    <div class="fa-karte" style="--tt:${_faTon.c};--ttr:${_faTon.rgb}">
      ${fingerRadarSvg(pid)}
      ${fingerFeldZeilen(pid)}
    </div>` : ''}

    <div class="pp-sec-title" style="margin-top:18px"><div class="l"><h4>Woher es kommt</h4></div></div>
    <div class="lb-teile">
      ${gruppen.map((g, i) => teil(g.kopf, P.zahlen[g.q], summen[i], g.lab)).join('')}
    </div>

    <div class="pp-sec-title" style="margin-top:18px"><div class="l"><h4>Posten für Posten</h4></div>
      <div class="m num">${P.quellen.length}</div></div>
    <div class="lb-buch">
      ${gruppen.map(block).join('')}
      <div class="lb-summe"><span>Gesamt</span><span class="num">${P.punkte}</span></div>
    </div>
   </div>
  `);
  _bindChronikClicks(document.getElementById('sheet'));
  _bpBinden(document.getElementById('sheet'));
  document.querySelectorAll('#sheet [data-prestige-regeln]').forEach(el => {
    el.onclick = () => sheetNav(() => showPrestigeRegeln(pid));
  });

  // ── Die Vitrine bedienen ───────────────────────────────────────────
  //     Welche Karte in der Mitte liegt, kann CSS nicht wissen: eine
  //     Position im Scrollbereich lässt sich nicht abfragen. Also setzt der
  //     Ablauf die Marke — und zwar bei jedem Schieben, sonst bliebe die
  //     getragene Stufe groß, während man längst eine andere ansieht.
  const _ld = document.getElementById('lbLeiter');
  if(_ld){
    const _lk = Array.prototype.slice.call(_ld.querySelectorAll('.lb-k'));
    const _fokus = () => {
      const m = _ld.scrollLeft + _ld.clientWidth / 2;
      let best = 0, bd = Infinity;
      _lk.forEach((k, i) => {
        const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - m);
        if(d < bd){ bd = d; best = i; }
      });
      _lk.forEach((k, i) => k.classList.toggle('fokus', i === best));
      const k = _lk[best];
      if(k && !k.hasAttribute('data-vek')){
        const z = k.querySelector('.lb-k-ins');
        if(z) z.innerHTML = _zeichen(best, +k.getAttribute('data-lbg') || 0);
        k.setAttribute('data-vek', '1');
      }
    };
    // Bei jedem Pixel neu rechnen wäre Arbeit ohne Wirkung — ein Bild reicht,
    // und genau ein Bild ist requestAnimationFrame.
    let _wart = 0;
    _ld.addEventListener('scroll', () => {
      if(_wart) return;
      _wart = requestAnimationFrame(() => { _wart = 0; _fokus(); });
    }, {passive:true});
    // Eine Karte in die Mitte holen. Wischen bleibt — aber eine Stufe, die
    // man ansehen will, ist ein Ziel, und ein Ziel tippt man an. Auf dem
    // Telefon ist das oft der kürzere Weg: bis zum Ordensstern sind es zwei
    // Wische über die halbe Breite des Blatts.
    const _zu = (i, weich) => {
      const k = _lk[i];
      if(!k) return;
      const ziel = Math.max(0, k.offsetLeft + k.offsetWidth / 2 - _ld.clientWidth / 2);
      if(weich && _ld.scrollTo) _ld.scrollTo({left:ziel, behavior:'smooth'});
      else _ld.scrollLeft = ziel;
    };
    _lk.forEach((k, i) => { k.onclick = () => _zu(i, true); });
    // Einen Grad zeigen: das Bild der Karte tauschen und den Knopf markieren.
    const _grad = (i, g) => {
      const k = _lk[i];
      if(!k) return;
      const z = k.querySelector('.lb-k-ins');
      if(z) z.innerHTML = _zeichen(i, g);
      k.setAttribute('data-lbg', g); k.setAttribute('data-vek', '1');
      k.querySelectorAll('[data-lbgrad]').forEach(b =>
        b.classList.toggle('zeigt', +b.getAttribute('data-lbgrad') === g));
    };
    _lk.forEach((k, i) => k.querySelectorAll('[data-lbgrad]').forEach(b => {
      b.onclick = ev => { ev.stopPropagation(); _grad(i, +b.getAttribute('data-lbgrad')); _zu(i, true); };
    }));
    document.querySelectorAll('#lbAlle [data-lbfeld]').forEach(b => {
      b.onclick = () => {
        const [i, g] = b.getAttribute('data-lbfeld').split(',').map(Number);
        _grad(i, g); _zu(i, true);
        if(_ld.scrollIntoView) _ld.scrollIntoView({block:'center', behavior:'smooth'});
      };
    });
    // Angefangen wird bei der eigenen Stufe, nicht links bei „Reif": wer weit
    // gekommen ist, sähe sonst ausgerechnet sein eigenes Zeichen nicht.
    _zu(P.stufe, false);
    _fokus();
  }
}
