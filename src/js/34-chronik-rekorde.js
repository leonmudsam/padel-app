// ─── §13.4b DIE CHRONIK: EINE pro Spieler ────────────────────────────
//     Ein Saisontitel beschreibt EINEN Monat und ist jeden Monat neu zu
//     holen. Eine Chronik beschreibt die ganze LAUFBAHN — und davon trägt
//     jeder Spieler genau EINE. Nicht sieben, nicht zwölf: eine.
//
//     Warum genau eine: Wer eine Liste von zwölf Auszeichnungen trägt, hat
//     keine Auszeichnung mehr, sondern einen Lebenslauf. Die eine Chronik
//     ist der Satz, mit dem man diesen Spieler beschreibt — und weil sie
//     ligaweit vergeben wird, hat sie sonst niemand.
//
//     VERGABE — jeder Eintrag geht an den ECHTEN Bestwert (allChronicles),
//     nicht reihum. Dass trotzdem jeder Spieler nur EINEN Eintrag trägt, ist
//     eine reine Anzeige-Regel. Erreichen zwei Spieler exakt denselben Wert,
//     halten sie den Rekord GEMEINSAM — ein Tiebreak nach Siegen oder
//     Tordifferenz würde einem der beiden etwas wegnehmen, das er hat.
//
//     SUMME oder ANTEIL — die Trennlinie dieses Katalogs:
//       Ein Liga-Rekord darf eine SUMME sein, wenn die Summe die Aussage IST:
//       meiste Siege, meiste Tore, meiste Spiele, höchster Elo-Stand. Da ist
//       „viel gespielt" kein Nebeneffekt, sondern der Rekord selbst.
//       Alles, was eine EIGENSCHAFT beschreibt — wie oft jemand im letzten
//       Ball gewinnt, wie oft er zu null gewinnt, wie oft er als Außenseiter
//       gewinnt — muss ein ANTEIL sein. Sonst gewinnt immer der mit den
//       meisten Partien, und der Eintrag sagt nichts über ihn aus. Solche
//       Einträge stehen deshalb unter „Spielweise", nicht unter „Rekorde".
//
//     Reihenfolge = Wertigkeit:
//       1. Liga-Rekorde        — die harten Bestwerte (Summen und Höchststände)
//       2. Schattenseiten      — dasselbe nach unten
//       3. Spielweise          — wie jemand spielt (Anteile)
//       4. Laufbahn            — was über Monate passiert ist
//
//     Es gibt bewusst KEINE Verbindungs-Rekorde mehr („beste Quote mit
//     Partner X", „Angstgegner Y"). Sie beschrieben ein Duo, nicht einen
//     Spieler: Wer sie hielt, hatte sie halb dem anderen zu verdanken, und
//     dieselbe Zeile stand am Ende bei zwei Leuten im Profil. Eine Chronik
//     soll eine Einzelleistung sein.
//
//     Alles entsteht in EINEM Durchlauf über alle Matches (_chronicleCtx).
//     Elo aus getGlobalSim — keine zweite Rechenquelle.
// Vier Kammern, nicht drei. „Der hoechste Gipfel" und „Der Glücksgriff"
// standen bisher in derselben Schublade, weil beide `art:'ereignis'` tragen —
// der eine ist der beste Elo-Stand der Ligageschichte, der andere ein Sieg
// mit 17 % Siegchance. Die Fuegungen [§C35] bekommen deshalb eine eigene
// Kammer: sie zeichnen niemanden aus, sie gehoeren jemandem.
// `pl` benennt die Kammer, `kurz` den Reiter darüber: fünf Reiter nebeneinander
// haben auf 430 Pixeln keinen Platz für „Schattenseiten".
// FÜNF Kammern. „Aktuelle Form" ist die neue: sieben Rekorde, deren Wert auf
// einem festen Endfenster der eigenen Partien steht — die letzten 20, 25, 40
// oder 50. Sie standen bisher zwischen den Laufbahn-Rekorden im Können und
// in den Bestmarken, und damit stand „Höchste Siegquote in den letzten 20
// Partien" neben „Beste Siegquote als Außenseiter über die ganze Laufbahn":
// zwei verschiedene Zeitachsen in einer Kammer. Wer die Tafel liest, kann so
// nicht sehen, was gerade gilt und was für immer.
// `satz` steht unter der Überschrift der Kammer im Rekorde-Reiter: was die
// Rekorde darin gemeinsam haben. Ohne ihn stand „Fügungen" über zwölf
// Karten, und warum „Der Rückenwind" dort steht und nicht im Können, sagte
// erst das Blatt.
// `ord` ist die Reihenfolge in der Leiste und in der Liste darunter. Die
// Bestmarken stehen vorn: eine Serie, ein Gipfel, ein Tag sind ohne
// Erklärung zu lesen, und mit dem Können zuerst begann der Reiter mit
// siebzehn Karten aus Schnitten und Erwartungsabständen.
const CHRON_KINDS = {
  mark:    {label:'Bestmarke',     pl:'Bestmarken',     kurz:'Marken',   ic:'target',     ord:0,
            satz:'Einzelne Bestleistungen, jede an einem Tag erreicht'},
  koennen: {label:'Können',        pl:'Können',         kurz:'Können',   ic:'trophyStar', ord:1,
            satz:'Schnitt und Quote über die ganze Laufbahn'},
  form:    {label:'Aktuelle Form', pl:'Aktuelle Form',  kurz:'Form',     ic:'trendUp',    ord:2,
            satz:'Gerechnet über die letzten eigenen Partien'},
  fuegung: {label:'Fügung',        pl:'Fügungen',       kurz:'Fügungen', ic:'weatherMix', ord:3,
            satz:'Was Auslosung und letzter Ball entscheiden'},
  shame:   {label:'Schattenseite', pl:'Schattenseiten', kurz:'Schatten', ic:'ghost',      ord:4,
            satz:'Die Kehrseite. Sie bringt kein Prestige'},
};
// Unter dieser Spielzahl bekommt niemand eine Chronik. Eine Laufbahn braucht
// eine Laufbahn — sonst trägt ein Gast nach zwölf Spielen einen Liga-Rekord.
const CHRON_MIN_GAMES = 15;
// Die Fenster und Teilmengen der Laufbahn-Rekorde, an einer Stelle. Beim
// Tischkicker waren es 40, 50, 20 und 25 Partien; ein Padel-Spieler kommt
// im Jahr auf rund hundert Partien, und mit den alten Zahlen wäre ein
// Fenster erst nach einem halben Jahr gefüllt. Der Katalog liest dieselben
// Werte, damit Bedingung und Rechnung nicht auseinanderlaufen [§10.2].
const RF = {lauf:20, rolle:25, form:10, partner:12, abschwung:12, teil:10, duo:8, glanztag:4};
// Was „eine Pause" heisst, steht als `REKORD_PAUSE_STUNDEN` im Katalog:
// Bedingung und Erklaerung nennen die Zahl, und sie werden vor dieser Datei
// geladen.
const REKORD_PAUSE_MS = REKORD_PAUSE_STUNDEN * 3600 * 1000;

// Die Allzeit-Wertung jeder Disziplin [§13.1]. Es gibt keinen zweiten
// Katalog mehr: Wer hier steht, steht dort — mit demselben Namen, demselben
// Icon, demselben Ton. Nur die Zeitachse ist eine andere, und deshalb auch
// die Schwelle. So kann die Liste der Rekorde nicht mehr an der Monatstafel
// vorbeidriften, und dieselbe Aussage kann nicht zweimal im Profil landen.
const _chronRoh = DISZIPLINEN.filter(d => d.allzeit).map(d => ({
  id:d.id, name:d.name, short:d.short, ic:d.ic, tone:d.tone, art:d.art,
  // Die Kammer steht am Eintrag und wird nicht mehr aus `art` erraten. Sie
  // war abgeleitet — Fuegung, sonst Schatten, sonst Ereignis gleich
  // Bestmarke —, und damit gab es die Kammer „Aktuelle Form" gar nicht:
  // ein Fenster-Rekord ist eine Leistung und landete im Koennen. Der
  // Rueckfall bleibt fuer den Fall, dass ein Eintrag sie vergisst; dass
  // keiner sie vergisst, zaehlt `tests/disziplinen` nach.
  kind: d.allzeit.kammer || (d.zufall ? 'fuegung' : d.art === 'schatten' ? 'shame'
      : d.art === 'ereignis' ? 'mark' : 'koennen'),
  // Der Grundwert des Rekords fuers Prestige [§C34], aus `REKORD_GRUNDWERT`:
  // 100 fuer eine Leistung, 75 fuer eine Rolle oder eine Fuegung, 0 fuer eine
  // Schattenseite. Er stand vorher allein in einem Faktor je `art`, und damit
  // konnte eine Bestmarke wie die laengste Siegesserie nicht wie das Koennen
  // wiegen, ohne gleichzeitig ihren Platz in der Katalogreihenfolge und in
  // der Monatstafel zu verschieben — `art` ordnet den Katalog, der Grundwert
  // wiegt. Fehlt er, nimmt `_rekordBasis` den Wert der Kammer.
  basis: d.allzeit.basis,
  // Die drei Angaben, die das Blatt nennt und die vorher nur im Satz der
  // Bedingung standen: woraus gerechnet wird, ab wann jemand mitzaehlt und
  // ueber welchen Zeitraum. Wer die Karte las, musste die Mindestbasis aus
  // dem Bedingungssatz heraussuchen.
  mind: d.allzeit.mind || '',
  zeitraum: d.allzeit.zeitraum || '',
  zufall: d.zufall || '',
  // `paar` nennt den Eintrag, der das ANDERE Ende desselben Werts wertet.
  // Fuer eine Quoten-Fuegung verlangt `tests/disziplinen` sonst, dass
  // mindestens die halbe Liga im Rennen steht — gegen eine zu hohe Schwelle.
  // Ein Vorzeichen ist keine Schwelle: es teilt das Feld, und gemessen
  // standen fuenf ueber und fuenf unter dem eigenen Mittel. Gepruefft wird
  // deshalb das Paar, und `paar` muss hier stehen, weil `CHRONICLES` eine
  // Projektion ist und ein Feld, das sie nicht nennt, gar nicht ankommt.
  paar: d.paar || '',
  // Rot ist die Richtung [§C25]. Eine Schattenseite ist immer negativ, eine
  // Fuegung nur dann, wenn sie von einer Niederlage erzaehlt — „Die bitterste
  // Pleite" stand im Profil in Gold neben den Titeln und wurde als Rekord
  // mitgezaehlt. Die Kammer bleibt davon unberuehrt, und `art` auch: sonst
  // wuerde sich das Prestige verschieben [§C34].
  neg: d.art === 'schatten' || d.negativ === true,
  cond:d.allzeit.cond, wie:d.allzeit.wie || '', val:d.allzeit.val, raw:d.allzeit.raw,
  // Ein GLEITENDES Fenster meldet kein „ausgebaut". Der Wert einer Laufbahn
  // steigt, weil jemand besser gespielt hat; der Wert eines Fensters steigt
  // auch dann, wenn am hinteren Ende ein schwaches Ergebnis herausfaellt.
  // Dieselbe Begruendung wie beim Verschlechtern [§C33]: wer nichts getan
  // hat, hat nichts getan. Gemessen ergaben die drei Fenster-Rekorde 26 der
  // 135 Karten ihrer Familie, und keine davon nannte eine Leistung.
  fenster:!!d.allzeit.fenster,
  // Die OFFENE Kammer [§C35]: die Bedingung ist mit fuenfzig Partien in der
  // Laufbahn erfuellbar. Gemessen waren 13 der 21 bestehenden Rekorde mit
  // lesbarer Mindestzahl fuer einen solchen Spieler unerreichbar — „ab 50
  // Partien rechts", „ab 60 Gelegenheiten", „ab 80 Spielen" gehoeren dem
  // Vielspieler, weil sie ausser ihm niemand halten KANN. Die Marke ist
  // keine Beschriftung: `tests/disziplinen` zaehlt nach, dass in jedem
  // offenen Rennen jemand mit unter hundert Partien steht.
  offen:!!d.allzeit.offen,
  unit:d.allzeit.unit, min:d.allzeit.min, ev:d.allzeit.ev,
  // Wann er erreicht wurde — nur dort, wo es einen Zeitpunkt GIBT. Ein
  // Karriereschnitt („Ø 6,9 Gegentore in 134 Partien links") hat keinen;
  // eine Serie, ein Elo-Tag, ein Saisonsprung schon. Eine erfundene
  // Jahreszahl unter jedem Rekord wäre schlechter als keine.
  zeit:d.allzeit.zeit
}));

// Die Reihenfolge ist die Rangfolge: die Liga-Liste zeigt sie von oben nach
// unten, und im Profil steht der erste Rekord, den jemand hält, als sein
// Rekord. Sonst folgt sie dem Katalog — Leistung vor Ereignis vor Schatten,
// weil ein Können schwerer wiegt als ein Ereignis.
//
// Eine Siegesserie ist die Ausnahme. Sie ist zwar ein Ereignis, aber die
// eindrucksvollere Zahl als die beste Bilanz: eine Strecke, kein Schnitt.
// Eine Quote überlebt einen schlechten Abend, eine Serie nicht. Wer hier
// steht, wird vorgezogen — der Rest behält die Katalogfolge.
const CHRON_VORRANG = ['unstoppable'];

const CHRONICLES = CHRON_VORRANG
  .map(id => _chronRoh.find(c => c.id === id)).filter(Boolean)
  .concat(_chronRoh.filter(c => !CHRON_VORRANG.includes(c.id)));
const CHRONICLE_BY_ID = {};
// Einträge mit `raw`+`min` bekommen ihr `val` hier abgeleitet. Der Rohwert
// bleibt erhalten, weil die Fortschritts-Anzeige (nextRecordFor) ihn auch
// dann braucht, wenn ein Spieler die Untergrenze noch gar nicht erreicht.
CHRONICLES.forEach((c, i) => {
  c.ord = i;
  if(!c.val && c.raw){
    const min = c.min || 0;
    c.val = (p, C) => { const v = c.raw(p, C); return (v != null && isFinite(v) && v >= min) ? v : null; };
  }
  CHRONICLE_BY_ID[c.id] = c;
});

// Ein Durchlauf über ALLE Matches. Liefert pro Spieler alles, was die
// Chroniken brauchen, plus die Liga-Eckdaten.
//
// `bisMs` blendet alles aus, was nach diesem Zeitpunkt gespielt wurde, und
// liefert damit die Rekordlage, wie sie DAMALS war. Ohne diesen Schnitt gibt
// es keine Aussage „das war in diesem Monat neu": Wer die heutige Rekordliste
// in den Saison-Rückblick vom Mai legt, zeigt Bestwerte, die im Juli
// aufgestellt wurden. Der Schnitt muss auch die Elo-Simulation treffen —
// `peak` und die Saison-Endstände kämen sonst weiter aus der Zukunft.
// Ohne Argument bleibt alles wie bisher, inklusive des einen heißen Caches.
function _chronicleCtx(bisMs){
  bisMs = _schnitt(bisMs);
  const key = matches.length + '_' + _cache.version;
  if(!bisMs && _cache._chronCtxKey === key) return _cache._chronCtx;
  if(bisMs){
    if(!_cache._chronCtxBis) _cache._chronCtxBis = {};
    const bk = bisMs + '_' + key;
    if(_cache._chronCtxBis[bk]) return _cache._chronCtxBis[bk];
    _topfDeckel(_cache._chronCtxBis, 24);
  }

  const ms = (bisMs ? matches.filter(m => mts(m) <= bisMs) : matches.slice())
    .sort((a,b)=>mts(a)-mts(b));
  const gSim = bisMs ? getSimAt(bisMs) : getGlobalSim();
  // Was einen ganzen Spieltag beschreibt, fragt nur Tage, die zu sind
  // (`_tagZu`): „Der makellose Tag" stand nach vier Siegen am Nachmittag in
  // der Ewigen Tafel, und eine Niederlage am Abend nahm ihn wieder weg;
  // „Der Tagesabschluss" wertete die jüngste Partie als die letzte des Tages.
  // Zu ist ein Tag für den Stand, nach dem gefragt wird, nicht für die Uhr.
  const tagZu = day => _tagZu(day, bisMs || Date.now());
  const pm = pmap();
  const P = {};
  const run = {}, runL = {};              // laufende Sieg-/Niederlagenserie
  const runStart = {}, runLStart = {};
  const altRun = {}, altStart = {};      // laufende Wechselserie Sieg/Pleite
  const daySet = {}, dayCount = {}, dayWins = {};
  // Was ein Abend an FÜGUNGEN hergibt [§C35]: Siegchance, Torkonto,
  // Ergebnis-Häufigkeiten und die beiden Höchstmaße. Eine Karte je Spieler
  // und Abend — die Alternative wären vier weitere Parallel-Karten.
  const dayZufall = {};                   // pid → {Tages-Key: {e,gf,ga,n10,n01,erg}}
  const seasonAgg = {};                   // pid → {Saison-ID: {g, w}}
  const lastRes = {};                     // pid → letztes Ergebnis (true = Sieg)
  const seasonSet = {};
  const mates = {};
  const allDays = new Set();
  const allSeasons = new Set();
  // Die Rohsicht: je Spieler jede Partie aus seiner Sicht, in Spielreihenfolge
  // [§C39]. Sie liegt NEBEN `P`, nicht darin — `P` wird gecacht, sie nicht.
  const roh = {};
  // Ein Rekord aller Zeiten nennt sein Jahr, wenn es nicht das laufende ist
  // (`datumFmt` mit `tmx`): „Am 15.03. gewann" stand sonst Jahre später da.
  const jahrJetzt = String(new Date().getFullYear());
  const dLabel = (k) => { const [y,m,d] = k.split('-'); return d + '.' + m + '.' + (y === jahrJetzt ? '' : y.slice(2)); };
  const ensure = (id) => P[id] || (P[id] = {
    id, games:0, wins:0, losses:0, gf:0, ga:0, gd:0,
    drvG:0, drvW:0, revG:0, revW:0,
    // Games je Seite, für den Anteil des eigenen Teams rechts und links.
    drvGf:0, drvGa:0, revGf:0, revGa:0,
    // Leistung gegen die Erwartung, je Seite aufsummiert. Sie ist der
    // Teil des Positionswerts [§5.2], der Mate- und Gegnerstaerke
    // beruecksichtigt — ohne sie waere „der komplette Stuermer" nur eine
    // Siegquote mit Torzugabe.
    drvPerf:0, revPerf:0,
    // Der Game-Anteil gegen die Erwartung je Seite, die zweite
    // Haelfte der Leistung im Positionsprofil von „Der Wandler" [§C44].
    drvGm:0, revGm:0,
    expSum:0,                        // Summe der Siegchancen — das eigene Soll
    winStreak:0, winSpan:'', lossStreak:0, lossSpan:'',
    debacle:0, nail:0, bitter:0, close:0, closeW:0,
    blowW:0, upsets:0, days:0, maxDay:0, maxDayLabel:'',
    // Der Torrueckstand ueber ALLE Niederlagen. „Der Widerstand" fragt, wie
    // hoch verloren wird, und nicht wie oft: vorher zaehlte an dieser Stelle
    // nur die deutliche Pleite ab sieben Toren, und damit blieb offen, wie
    // die uebrigen ausgingen. Die Summe steht hier und der Mittelwert im
    // Katalog, damit der Nenner die eigenen Niederlagen bleiben.
    wdSum:0,
    perfDays:0, bigDays:0,           // volle Spieltage / davon ohne Niederlage
    seasons:0, firstDay:'', firstLabel:'', lastDay:'',
    peak:0, founder:false,
    afterLoss:0, afterLossOpp:0,     // Antwort auf die eigene letzte Niederlage
    alt:0, altSpan:'',               // laengste Serie aus abwechselnd Sieg und Pleite
    flukeExp:null, flukeLabel:'',    // der unwahrscheinlichste Sieg der Laufbahn
    bestMonth:null,                  // {q, g, sid} — der beste Monat seines Lebens
    fall:null,
    // ── Fügungen [§C35]: was Auslosung und letzter Ball entschieden haben.
    //    Alle sechs fallen in den Durchläufen ab, die es ohnehin gibt —
    //    der Tagesdurchlauf unten läuft schon für die vollen Spieltage.
    hartTag:null, hartTagLabel:'',   // schwerster Abend: niedrigste mittlere Siegchance
    gleichTag:0, gleichTore:0, gleichLabel:'',  // Abend mit exakt aufgehendem Game-Konto
    wiederTag:0, wiederErg:'', wiederLabel:'',  // dasselbe Ergebnis an einem Abend
    beidesTag:0, beidesLabel:'',     // Bagel gewonnen und Bagel kassiert am selben Abend
    // ── Rekorde auf einem gleitenden Fenster und auf einer Rolle [§C35].
    //    Sie brauchen die
    //    REIHENFOLGE der Partien und damit die Rohsicht, die
    //    `_seasonTitleCtx` fuer den Monat schon hat. Gebaut wird sie unten
    //    in `roh` und nach der Auswertung verworfen: am gecachten `P` haengen
    //    nur diese Skalare, sonst truege jeder der 24 Zeitschnitte 4×N
    //    Partien-Objekte mit sich.
    l40N:0, l40W:0,                      // die letzten RF.lauf Partien
    r50N:0, r50Atk:0,                    // Partien rechts unter den letzten RF.rolle
    // ── Der Abstand zum EIGENEN [§C38]. Wer eine Quote gewinnt, gewinnt
    //    fast jede; ein Eintrag auf das Niveau gehoert damit immer denselben
    //    drei Spielern. Diese Felder fragen stattdessen, wie weit ein
    //    Ausschnitt der eigenen Partien vom eigenen Rest abweicht — und sind
    //    damit fuer jede Koennensklasse erreichbar.
    hfDelta:null, hfNeu:0, hfAlt:0,              // letzte 20 gegen die 20 davor
    sbDelta:null, sbDrin:0, sbRaus:0, sbN:0,     // Schlussspiel eines Tages
    ksDelta:null, ksDrin:0, ksRaus:0, ksN:0,     // erstes Spiel eines Tages
    rwDelta:null, rwNeu:0, rwAlt:0,              // Partner-Elo im Fenster
    ahN:0, ahQ:0, ahRest:0, ahDelta:null,        // offene Partien gegen die uebrigen
    weN:0, weW:0, weDelta:null, weRaus:0,        // die erste Partie nach einer Pause
    asDelta:null, asNeu:0, asAlt:0,              // die letzten 25 gegen die Laufbahn davor
    gtDelta:null, gtW:0, gtN:0, gtQ:0, gtLabel:'',  // der beste Spieltag gegen die eigene Quote
    // ── Teilmengen der Rohsicht. Sie fallen im Durchlauf ab, den es fuer
    //    die Fenster ohnehin gibt, und bleiben Skalare [§3].
    favN:0,                              // als Favorit
    // Der Ausschlag ueber der Erwartung, je Seite getrennt. Gehalten wird
    // die BESSERE der beiden qualifizierten Seiten; welche das ist, sagt
    // `rcPos`, damit der Beleg sie nennen kann.
    rcDelta:null, rcPos:'', rcQ:0, rcExp:0, rcW:0, rcN:0,
    swN:0, swOk:0,                       // Rollenwechsel zwischen zwei Partien
    ausgN:0, ausgSd:null, ausgMit:0,     // Gleichmass in ausgeglichen angesetzten Partien
    drvSd:null, drvMit:0,                // Gleichmaessigkeit rechts
    revSd:null, revMit:0,                // und links
    // ── Die Schandtafel [§C35]: vier Kennzahlen, die eine Kehrseite messen.
    //    Sie fallen im selben Durchlauf ueber die Rohsicht ab wie die
    //    Fenster darueber und bleiben Skalare — am gecachten Spieler haengt
    //    keine Liste, sonst truege jeder der 24 Zeitschnitte sie mit [§3].
    favL:0,                              // Pleiten als Favorit
    angstQ:null, angstGeg:'', angstN:0, angstW:0,   // der unangenehmste Gegner
    // Was die Partner an dieser Seite gewinnen oder verlieren. EIN Feld
    // fuer zwei Rekorde: „Der Katalysator" liest es mit Plus, „Der Klotz am
    // Bein" mit Minus. Zwei Rechnungen ueber dieselbe Frage nennen
    // irgendwann zwei verschiedene Beste [§C27].
    einflussD:null, einflussN:0,
    // ── Folgen, die die Auslosung schreibt [§C35]. Drei laengste Laeufe
    //    und zwei einzelne Partien, alle aus der Rohsicht unten. Gezaehlt
    //    werden Partien, nicht Uebergaenge: A–B–A ist eine Folge aus drei.
    wpLauf:0, wpSpan:'',                 // jedes Mal ein anderer Partner
    pdLauf:0, pdSpan:'',                 // jedes Mal die andere Seite
    spLauf:0, spSpan:'',                 // abwechselnd Favorit und Aussenseiter
    bannMax:0, bannLabel:'',             // laengste beendete Pleitenserie gegen einen Gegner
    stoppMax:0, stoppLabel:'',           // laengste beendete Siegesserie eines Gegners
    eiskaltLauf:0, eiskaltSpan:'',       // im Tiebreak gewonnene Partien in Folge
    sollLauf:0, sollSpan:'',             // eigene Spieltage im Soll in Folge
  });

  // Die Elo VOR jeder Partie, aus der zentralen Simulation. „Der Rueckenwind"
  // und „Der Einzelkaempfer" fragen nach der Staerke der Partner, und die
  // muss der Stand von damals sein: die heutige Elo eines Partners haengt an
  // Partien, die es zum Zeitpunkt der Frage noch nicht gab [Regel 5]. Sie
  // wird nicht nachgerechnet — `eloBefore` steht in der Historie, die
  // `simulateElo` ohnehin fuehrt.
  const eloVor = {};
  (gSim.history || []).forEach(h => { eloVor[h.matchId] = h.eloBefore || {}; });

  ms.forEach(m => {
    const day = mdayKey(m);
    allDays.add(day);
    // Der Serienstand VOR dieser Partie, fuer alle vier auf einmal. „Der
    // Serienstopp" fragt, welche Serie ein Gegner mitbrachte, und die vier
    // Staende unten werden in derselben Schleife fortgeschrieben: gelesen
    // nach dem ersten Spieler waere es der Stand NACH dieser Partie [Regel 3].
    const runVor = {};
    [m.a1, m.a2, m.b1, m.b2].forEach(x => { if(x) runVor[x] = run[x] || 0; });
    const sid = (seasonOf(m.created_at) || {}).id;
    if(sid) allSeasons.add(sid);
    const ids = [m.a1, m.a2, m.b1, m.b2];
    const mateOf = id => id===m.a1 ? m.a2 : id===m.a2 ? m.a1 : id===m.b1 ? m.b2 : m.b1;
    ids.forEach(id => {
      if(!id) return;
      const p = ensure(id);
      const onA = (id===m.a1 || id===m.a2);
      const w = (onA && m.winner==='A') || (!onA && m.winner==='B');
      const gf = onA ? m.games_a : m.games_b;
      const ga = onA ? m.games_b : m.games_a;
      const pos = id===m.a1 ? m.a1_side : id===m.a2 ? m.a2_side : id===m.b1 ? m.b1_side : m.b2_side;
      const diff = gf - ga;
      p.games++; p.gf += gf; p.ga += ga; p.gd += diff;
      if(w) p.wins++; else p.losses++;
      const exp = myExp(id, m);
      p.expSum += exp;                  // Soll der Laufbahn [§C39-Rechnung]
      (roh[id] || (roh[id] = [])).push({w, gf, ga, pos, exp, zitter: partie(m).entscheidTb, knapp: partie(m).knapp,
        // `day` gehoert dazu, seit „Der letzte Ball" die letzte Partie eines
        // Spieltags gegen die uebrigen desselben Tages stellt und „Die
        // Steigerung" die eigenen Spieltage halbiert. Beide Fragen haengen an
        // der Reihenfolge INNERHALB eines Tages, und die kennt nur die
        // fertige Liste.
        day,
        // Der Zeitpunkt der Partie. „Der Wiedereinstieg" fragt nach 72
        // vollstaendigen Stunden ohne eigenes Match, und das ist ein
        // Zeitabstand und keine Differenz von Kalendertagen: zwei Partien am
        // Abend des einen und am Morgen des uebernaechsten Tages liegen zwei
        // Kalendertage und nur 36 Stunden auseinander.
        ts: mts(m),
        // `mate` gehoert zur Rohsicht wie `geg`: „Der Klotz am Bein" fragt,
        // wie die Partner AN DIESER SEITE stehen, und das ist ohne den
        // Partner nicht zu beantworten.
        mate: onA ? (id === m.a1 ? m.a2 : m.a1) : (id === m.b1 ? m.b2 : m.b1),
        // Die Elo des Partners, wie sie vor dieser Partie stand.
        mEl: (eloVor[m.id] || {})[onA ? (id === m.a1 ? m.a2 : m.a1) : (id === m.b1 ? m.b2 : m.b1)],
        geg: onA ? [m.b1, m.b2] : [m.a1, m.a2],
        // Die laengere der beiden Gegner-Siegesserien VOR dem Beginn der Partie.
        // „Der Serienstopp" fragt, welche Serie ein eigener Sieg beendet hat,
        // und `run` steht fuer die A-Seite hier schon auf dem neuen Stand.
        gR: Math.max(runVor[onA ? m.b1 : m.a1] || 0, runVor[onA ? m.b2 : m.a2] || 0)});
      if(pos === 'drive'){ p.drvG++; p.drvGf += gf; p.drvGa += ga; if(w) p.drvW++; p.drvPerf += (w?1:0) - exp; p.drvGm += posGameLeistung(gf, ga, exp); }
      else             { p.revG++; p.revGf += gf; p.revGa += ga; if(w) p.revW++; p.revPerf += (w?1:0) - exp; p.revGm += posGameLeistung(gf, ga, exp); }
      // Die Felder tragen die Namen aus der Kicker-Liga und meinen [§1.3]:
      // debacle = zu Null verloren, nail/bitter = im Tiebreak gewonnen
      // bzw. verloren, close = knapp, blowW = deutlicher Sieg.
      const pz = partie(m), fz = partieFuer(m, onA ? 'A' : 'B');
      const bg = begegnungAm(m);
      if(bg.zuNull && bg.winner !== (onA ? 'A' : 'B')) p.debacle++;
      if(w && pz.entscheidTb)  p.nail++;
      if(!w && pz.entscheidTb) p.bitter++;
      if(pz.knapp){ p.close++; if(w) p.closeW++; }
      if(w && pz.deutlich) p.blowW++;
      if(!w) p.wdSum += ga - gf;
      if(w && exp < CHANCE_UPSET) p.upsets++;
      // ── Fügungen [§C35] ───────────────────────────────────────────
      if(!dayZufall[id]) dayZufall[id] = {};
      const dz = dayZufall[id][day]
        || (dayZufall[id][day] = {e:0, gf:0, ga:0, n10:0, n01:0, erg:{}});
      dz.e += exp; dz.gf += gf; dz.ga += ga;
      if(fz.bagelsFor) dz.n10++;
      if(fz.bagelsAgainst) dz.n01++;
      const ergKey = standFuer(m, w);
      dz.erg[ergKey] = (dz.erg[ergKey] || 0) + 1;
      if(!p.firstDay){ p.firstDay = day; p.firstLabel = sid ? seasonLabel(sid) : dLabel(day); }
      p.lastDay = day;
      if(!daySet[id]) daySet[id] = new Set();
      daySet[id].add(day);
      if(!dayCount[id]) dayCount[id] = {};
      dayCount[id][day] = (dayCount[id][day] || 0) + 1;
      if(dayCount[id][day] > p.maxDay){ p.maxDay = dayCount[id][day]; p.maxDayLabel = dLabel(day); }
      if(!dayWins[id]) dayWins[id] = {};
      if(w) dayWins[id][day] = (dayWins[id][day] || 0) + 1;
      if(sid){
        if(!seasonAgg[id]) seasonAgg[id] = {};
        if(!seasonAgg[id][sid]) seasonAgg[id][sid] = {g:0, w:0};
        seasonAgg[id][sid].g++; if(w) seasonAgg[id][sid].w++;
      }
      // Wechselbad: Sieg, Pleite, Sieg, Pleite. Das misst kein Können, nur
      // einen unentschlossenen Abend — und genau deshalb kann es jeder
      // halten, auch wer sonst nichts gewinnt.
      if(lastRes[id] !== undefined && lastRes[id] !== w){ altRun[id] = (altRun[id] || 1) + 1; }
      else { altRun[id] = 1; altStart[id] = day; }
      if(altRun[id] > p.alt){
        p.alt = altRun[id];
        p.altSpan = altStart[id] === day ? dLabel(day) : (dLabel(altStart[id]) + '–' + dLabel(day));
      }
      // Der unwahrscheinlichste Sieg. Eine einzige Partie reicht, und die
      // Rechnung stand gegen ihn — mehr braucht dieser Eintrag nicht.
      if(w && (p.flukeExp == null || exp < p.flukeExp)){
        p.flukeExp = exp; p.flukeLabel = dLabel(day);
      }
      // Was macht er direkt nach einer Pleite? Gezählt wird die Gelegenheit,
      // nicht das Spiel danach im Kalender — die Reihenfolge ist chronologisch.
      if(lastRes[id] === false){ p.afterLossOpp++; if(w) p.afterLoss++; }
      lastRes[id] = w;
      if(sid){ if(!seasonSet[id]) seasonSet[id] = new Set(); seasonSet[id].add(sid); }
      // Serien in beide Richtungen — die schwarze Serie ist so viel wert
      // wie die goldene, nur eben andersherum.
      if(w){
        runL[id] = 0;
        run[id] = (run[id] || 0) + 1;
        if(run[id] === 1) runStart[id] = day;
        if(run[id] > p.winStreak){
          p.winStreak = run[id];
          p.winSpan = runStart[id] === day ? dLabel(day) : (dLabel(runStart[id]) + '–' + dLabel(day));
        }
      } else {
        run[id] = 0;
        runL[id] = (runL[id] || 0) + 1;
        if(runL[id] === 1) runLStart[id] = day;
        if(runL[id] > p.lossStreak){
          p.lossStreak = runL[id];
          p.lossSpan = runLStart[id] === day ? dLabel(day) : (dLabel(runLStart[id]) + '–' + dLabel(day));
        }
      }
      // Duelle und Partnerschaften
      const mate = mateOf(id);
      if(mate){
        if(!mates[id]) mates[id] = {};
        if(!mates[id][mate]) mates[id][mate] = {g:0, w:0};
        mates[id][mate].g++; if(w) mates[id][mate].w++;
      }
    });
  });

  // Liga-Eckdaten
  const dayKeys = [...allDays].sort();
  const firstDayKey = dayKeys[0] || '';
  const C = {
    P, startElo: cfg.start_elo,
    totalDays: dayKeys.length,
    firstDay: firstDayKey,
    firstLabel: firstDayKey ? (()=>{ const [y,mo,d] = firstDayKey.split('-'); return d + '.' + mo + '.' + y; })() : '',
    seasonCount: allSeasons.size,
  };

  // Zu kurze Laufbahnen und versteckte Spieler fliegen raus, BEVOR die
  // Rekorde vergeben werden — sonst hält ein Gast den Liga-Rekord. Ein
  // Ruheständler auch, und zwar auch in einem Zeitschnitt vor seinem
  // Karriereende [§C40]: ein Liga-Rekord ist ein Vergleich mit der Liga von
  // heute. Sonst schriebe der Feed am Tag nach dem Abschied „X übernimmt"
  // für jeden Rekord, den der Ruheständler abgeben musste, und hängte es an
  // eine Partie, die damit nichts zu tun hat. Seine eigenen Rekorde stehen
  // eingefroren im Profil (`ruhestandStand`).
  Object.keys(P).forEach(id => {
    if(!ligaAktiv(id) || P[id].games < CHRON_MIN_GAMES){ delete P[id]; return; }
  });

  // ── Die zwei Kammern [§C35]: ein Durchlauf ueber die Rohsicht ──────
  // Zehn Rekorde fragen nach einem gleitenden Fenster, nach einer Rolle oder
  // nach dem Gegnerkreis. Sie stehen hier und nicht als zehn Zaehler im
  // Match-Durchlauf oben: „die letzten 40 Partien" und „die 25 davor" haengen
  // an der Reihenfolge, und die kennt erst die fertige Liste.
  const _sd = (a) => {
    if(a.length < 2) return 0;
    const m = a.reduce((x, y) => x + y, 0) / a.length;
    return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length);
  };
  const _mit = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  Object.keys(P).forEach(id => {
    const p = P[id], r = roh[id] || [];
    // Das feste Endfenster. Es MUSS mitwandern: „in den ersten 25 Partien"
    // waere nach 25 Partien fertig und koennte den Halter nie mehr wechseln.
    // Und es ist das ENDE der Laufbahn und nicht der beste Abschnitt darin:
    // wer dreihundert Partien hat, hat 281 Zwanzigerbloecke und wer zwanzig
    // hat, hat einen — das Maximum aus vielen Ziehungen ist groesser, und
    // damit gehoerte jeder Formrekord dem Vielspieler [Regel 20].
    // Die letzten RF.lauf: „Der Lauf" fragt nach der Siegquote von jetzt.
    if(r.length >= RF.lauf){
      const l40 = r.slice(-RF.lauf);
      p.l40N = RF.lauf;
      p.l40W = l40.filter(x => x.w).length;
    }
    // Die Seiten unter den letzten RF.rolle. Gezählt wird rechts; die
    // Gegenseite liest dieselbe Zahl von links, damit die beiden Hälften
    // nicht zwei verschiedene Fenster messen.
    if(r.length >= RF.rolle){
      const l50 = r.slice(-RF.rolle);
      p.r50N = RF.rolle;
      p.r50Atk = l50.filter(x => x.pos === 'drive').length;
    }
    // ── Der Abstand zum EIGENEN [§C38] ────────────────────────────
    // Die letzten zwanzig Partien gegen die zwanzig DAVOR. Gegen alles davor
    // gerechnet hing der Wert an der Laenge der Laufbahn: je mehr Partien im
    // Vergleichsteil, desto traeger die Zahl, gegen die das Fenster laeuft.
    // Zwei gleich grosse Fenster fragen dieselbe Frage fuer jeden gleich.
    if(r.length >= 2 * RF.form){
      const drin = r.slice(-RF.form), raus = r.slice(-2 * RF.form, -RF.form);
      p.hfNeu = drin.filter(x => x.w).length / RF.form;
      p.hfAlt = raus.filter(x => x.w).length / RF.form;
      p.hfDelta = p.hfNeu - p.hfAlt;
    }
    // Die letzte Partie jedes eigenen Spieltags gegen alle anderen dieses
    // Tages. Drei Partien je Tag, damit „die letzte" ueberhaupt eine Auswahl
    // ist; verglichen wird INNERHALB des Tages, sonst stehen zwei
    // verschiedene Wochen gegeneinander.
    const _tage = {};
    r.forEach(x => { (_tage[x.day] || (_tage[x.day] = [])).push(x); });
    const _tagListe = Object.keys(_tage).sort();
    // Dieselbe Teilung von der anderen Seite: „Der Kaltstart" nimmt die
    // ERSTE Partie jedes Tages gegen die uebrigen. Ein Paar mit demselben
    // Fenster, derselben Mindestbasis und derselben Rechnung — sonst waeren
    // es zwei verschiedene Fragen mit zwei verschiedenen Haltern.
    {
      const voll = _tagListe.filter(t => _tage[t].length >= 3 && tagZu(t));
      if(voll.length){
        const letzte = [], vorher = [], erste = [], danach = [];
        voll.forEach(t => { const a = _tage[t];
          letzte.push(a[a.length - 1]); vorher.push(...a.slice(0, -1));
          erste.push(a[0]);             danach.push(...a.slice(1)); });
        if(vorher.length){
          p.sbN = letzte.length;
          p.sbDrin = letzte.filter(x => x.w).length / letzte.length;
          p.sbRaus = vorher.filter(x => x.w).length / vorher.length;
          p.sbDelta = p.sbDrin - p.sbRaus;
        }
        if(danach.length){
          p.ksN = erste.length;
          p.ksDrin = erste.filter(x => x.w).length / erste.length;
          p.ksRaus = danach.filter(x => x.w).length / danach.length;
          p.ksDelta = p.ksDrin - p.ksRaus;
        }
      }
    }
    // Die Staerke der Partner: die letzten 25 Partien gegen die 25 davor.
    // Gemessen wird die Elo des Partners VOR der jeweiligen Partie, also
    // der Stand von damals [Regel 5] — die heutige Quote eines Partners
    // haengt an Partien, die es zum Zeitpunkt der Frage nicht gab. Zwei
    // gleich lange Fenster, damit die Frage fuer jeden dieselbe ist: gegen
    // das eigene Mittel ueber die ganze Laufbahn gerechnet wuchs der Abstand
    // mit der Laenge der Laufbahn.
    if(r.length >= 2 * RF.partner){
      const el = a => { const w = a.map(x => x.mEl).filter(x => x != null && isFinite(x));
        return w.length ? _mit(w) : null; };
      const neu25 = el(r.slice(-RF.partner)), alt25 = el(r.slice(-2 * RF.partner, -RF.partner));
      if(neu25 != null && alt25 != null){
        p.rwNeu = neu25; p.rwAlt = alt25; p.rwDelta = neu25 - alt25;
      }
    }
    // Offene Partien: die Elo-Rechnung gab beiden Teams zwischen 45 und 55
    // Prozent. Verglichen wird mit der EIGENEN Gesamtquote, also messen alle
    // gegen ihr eigenes Niveau und nicht gegeneinander [§C38]. Die Grenzen
    // kommen aus `_stAugenhoehe` — dieselbe Funktion, die die Monatsfassung
    // von „Auf Augenhoehe" benutzt, sonst zaehlen die zwei Durchlaeufe ueber
    // dieselbe Frage verschieden [§10.2].
    {
      const off = r.filter(_stAugenhoehe);
      const rest = r.filter(x => !_stAugenhoehe(x));
      if(off.length >= RF.teil && rest.length){
        p.ahN = off.length;
        p.ahQ = off.filter(x => x.w).length / off.length;
        // Gegen die UEBRIGEN eigenen Partien, nicht gegen die Gesamtquote:
        // die offenen Partien stecken in der Gesamtquote mit drin, und damit
        // verglich sich der Ausschnitt zum Teil mit sich selbst — je mehr
        // offene Partien jemand hatte, desto kleiner fiel sein Abstand aus.
        p.ahRest = rest.filter(x => x.w).length / rest.length;
        p.ahDelta = p.ahQ - p.ahRest;
      }
    }
    // Aussenseiter heisst unter 45 % Siegchance vor der Partie, Favorit
    // ueber 55 % — dieselben Linien, die die Elo-Rechnung zieht [§5.2].
    // „Der Unaufgeregte" nimmt die weite Mitte dazwischen: 35 bis 65 %.
    const fav = [], ausg = [], atk = [], def = [];
    r.forEach(x => {
      if(_stFavorit(x)) fav.push(x);
      if(x.exp >= CHANCE_UPSET && x.exp <= 1 - CHANCE_UPSET) ausg.push(x);
      (x.pos === 'drive' ? atk : def).push(x);
    });
    p.favN = fav.length;
    // Die Pleiten als Favorit, gezaehlt und nicht aus `favN` minus Siegen
    // gerechnet: das stimmte nur, solange es kein Unentschieden gibt.
    p.favL = fav.filter(x => !x.w).length;
    // Der Rollenwechsel zwischen zwei aufeinanderfolgenden eigenen Partien.
    // Der Nenner sind die Uebergaenge und nicht die Partien: bei zwanzig
    // Partien gibt es neunzehn Gelegenheiten zu wechseln.
    if(r.length >= 2){
      p.swN = r.length - 1;
      p.swOk = r.filter((x, i) => i > 0 && r[i - 1].pos !== x.pos).length;
    }
    // Der unangenehmste Gegner: dieselbe Frage wie „Der Angstgegner" im
    // Monat, nur ueber die Laufbahn [§13.1]. Gezaehlt wird gegen die Duelle
    // gegen GENAU diesen Gegner und nicht gegen alle Partien [§C37].
    const geg = {};
    r.forEach(x => x.geg.forEach(g => { if(g) (geg[g] = geg[g] || []).push(x); }));
    // „Der Wiedereinstieg": die erste eigene Partie nach sechs vollstaendigen
    // Tagen ohne eigenes Match. Gemessen wird der Abstand der Zeitpunkte
    // und nicht die Differenz der Kalendertage — Montagabend und der
    // Sonntagmorgen danach sind sechs Kalendertage und keine sechs Tage
    // Pause. Die
    // allererste Partie einer Laufbahn zaehlt nicht mit: vor ihr gibt es
    // keine Pause, nur keine Liga.
    //
    // Gemessen wird gegen die EIGENE Quote in allen uebrigen Partien [§C38].
    // Gefragt war die Siegquote der Rueckkehrspiele, und die ordnete die Liga
    // genau wie die Siegquote der Laufbahn (gemessen r = 0,82): wer ohnehin
    // gewinnt, gewinnt auch nach der Pause. Gegen das Eigene haelt ihn, wer
    // nach einer Pause BESSER spielt als sonst — gemessen stehen vorn
    // Spieler aus allen Teilen der Tabelle.
    {
      let n = 0, w = 0, rn = 0, rw = 0;
      for(let i = 1; i < r.length; i++){
        if(r[i].ts - r[i - 1].ts >= REKORD_PAUSE_MS){ n++; if(r[i].w) w++; }
        else { rn++; if(r[i].w) rw++; }
      }
      p.weN = n; p.weW = w;
      if(n && rn){ p.weRaus = rw / rn; p.weDelta = w / n - p.weRaus; }
    }
    // „Der Abschwung": die letzten 25 Partien gegen die ganze Laufbahn
    // davor. „Der Höhenflug" vergleicht zwanzig mit zwanzig und misst einen
    // Ausschlag; dieser misst, ob jemand dauerhaft schwächer geworden ist.
    if(r.length >= 2 * RF.abschwung){
      const neu = r.slice(-RF.abschwung), alt = r.slice(0, -RF.abschwung);
      p.asNeu = neu.filter(x => x.w).length / neu.length;
      p.asAlt = alt.filter(x => x.w).length / alt.length;
      p.asDelta = p.asNeu - p.asAlt;
    }
    // „Der Glanztag": der Spieltag mit dem groessten Vorsprung auf die eigene
    // Quote der Laufbahn, ab fuenf Partien an diesem Tag. Ein einzelner Tag
    // kann jeden treffen; gemessen an der eigenen Quote haelt ihn nicht der,
    // der ohnehin jeden Tag gewinnt.
    {
      const tage = {};
      r.forEach(x => { const t = tage[x.day] || (tage[x.day] = {n:0, w:0}); t.n++; if(x.w) t.w++; });
      const q = p.games ? p.wins / p.games : 0;
      Object.keys(tage).sort().forEach(k => { const t = tage[k];
        if(t.n < RF.glanztag || !tagZu(k)) return;
        const d = t.w / t.n - q;
        if(p.gtDelta == null || d > p.gtDelta){ p.gtDelta = d; p.gtW = t.w; p.gtN = t.n; p.gtQ = q; p.gtLabel = dLabel(k); }
      });
    }
    // „Der Rollencoup": rechts und links getrennt, und je Seite nur die
    // Partien, in denen die Elo-Rechnung dem eigenen Team unter 45 Prozent
    // gab — dieselbe Linie, die „Aussenseiter" ueberall in der App heisst
    // [§5.2]. Gehalten wird die BESSERE der beiden qualifizierten
    // Seiten: wer auf einer Seite ueber dem Soll liegt, hat das dort
    // getan, und ein Mittel ueber beide verwaesserte es mit der Seite, auf
    // der er selten steht. Die Siegchance kommt aus der Partie und wird
    // nicht mit heutigen Reglern nachgerechnet [Regel 8].
    ['drive', 'reves'].forEach(pos => {
      const s = r.filter(x => x.pos === pos && x.exp < CHANCE_OFFEN);
      if(s.length < RF.teil) return;
      const q = s.filter(x => x.w).length / s.length;
      const e = _mit(s.map(x => x.exp));
      if(p.rcDelta == null || q - e > p.rcDelta){
        p.rcDelta = q - e; p.rcPos = pos; p.rcQ = q; p.rcExp = e;
        p.rcW = s.filter(x => x.w).length; p.rcN = s.length;
      }
    })
    Object.keys(geg).forEach(g => {
      const d = geg[g];
      if(d.length < RF.teil) return;
      const q = d.filter(x => x.w).length / d.length;
      if(p.angstQ === null || q < p.angstQ){
        p.angstQ = q; p.angstGeg = g; p.angstN = d.length;
        p.angstW = d.filter(x => x.w).length;
      }
    });
    // Was die Partner an dieser Seite kostet. Verglichen wird jeder
    // Partner mit SICH SELBST ohne diesen Partner — gegen das Ligamittel
    // gerechnet gehoerte der Rekord dem, der mit den Schwachen spielt.
    // `roh` liegt hier fuer alle Spieler vollstaendig vor; die Rechnung
    // laeuft ueber die Partner und nicht ueber die Partien, das sind je
    // Spieler ein Dutzend Durchlaeufe.
    const mates = {};
    r.forEach(x => { if(x.mate) (mates[x.mate] = mates[x.mate] || []).push(x); });
    // Der Kreis der regelmaessigen Partner: fuenfzehn gemeinsame Partien,
    // damit eine Bilanz ueberhaupt eine ist, und drei solche Partner.
    // Gewichtet wird nach den gemeinsamen Partien — ein Partner, mit dem
    // vierzig Partien zusammenkommen, sagt mehr als einer mit fuenfzehn.
    const _agM = Object.keys(mates).filter(m => mates[m].length >= RF.duo);
    const nutz = _agM.filter(m => roh[m]);
    if(nutz.length >= 3){
      let summe = 0, gew = 0;
      nutz.forEach(m => {
        const mit = mates[m].filter(x => x.w).length / mates[m].length;
        const ohne = roh[m].filter(x => x.mate !== id);
        const q = ohne.length ? ohne.filter(x => x.w).length / ohne.length : mit;
        summe += (mit - q) * mates[m].length; gew += mates[m].length;
      });
      p.einflussN = nutz.length;
      p.einflussD = gew ? summe / gew : null;
    }
    // ── Folgen, die die Auslosung schreibt [§C35] ──────────────────
    // Die laengste Folge eigener Partien, in der jede die vorige auf eine
    // bestimmte Weise abloest. Tag und Monat unterbrechen sie nicht: eine
    // Folge gehoert der Laufbahn, nicht dem Kalender. Eine Laenge allein
    // (ohne Anteil) haelt nicht automatisch der Vielspieler — gemessen
    // hielten sie Spieler auf Platz 6, 7 und 10 der Siegquote.
    const _folge = (passt, weiter) => {
      let n = 0, best = 0, start = '', span = '';
      r.forEach((x, i) => {
        if(!passt(x)){ n = 0; return; }
        if(n > 0 && weiter(r[i - 1], x)) n++; else { n = 1; start = x.day; }
        if(n > best){
          best = n;
          span = start === x.day ? dLabel(x.day) : (dLabel(start) + '–' + dLabel(x.day));
        }
      });
      return {n:best, span};
    };
    {
      const wp = _folge(x => !!x.mate, (a, b) => a.mate !== b.mate);
      p.wpLauf = wp.n; p.wpSpan = wp.span;
      const pd = _folge(x => !!x.pos, (a, b) => a.pos !== b.pos);
      p.pdLauf = pd.n; p.pdSpan = pd.span;
      // Die offene Zone zwischen 45 und 55 % unterbricht: dort ist niemand
      // Favorit und niemand Aussenseiter [§5.2].
      const sp = _folge(x => x.exp < CHANCE_OFFEN || _stFavorit(x),
                        (a, b) => (a.exp < CHANCE_OFFEN) !== (b.exp < CHANCE_OFFEN));
      p.spLauf = sp.n; p.spSpan = sp.span;
    }
    // „Der Stammkunde": dieselbe Zaehlung wie die Monatschronik „Der
    // Ausbruch" (`_bannLaufDerLiga`), nur ohne Monatsgrenze. Je Gegner laufen
    // die direkten Niederlagen in Folge; ein Sieg beendet sie, und erst dann
    // zaehlt der Stand. Eine noch laufende Serie hat noch keine Laenge.
    // „Der Serienstopp": die laengste Siegesserie eines Gegners, die ein
    // eigener Sieg beendet hat. Je Partie zaehlt die laengere der beiden,
    // nicht ihre Summe.
    {
      const bann = {};
      r.forEach(x => x.geg.forEach(g => {
        if(!g) return;
        if(x.w){
          if((bann[g] || 0) > p.bannMax){ p.bannMax = bann[g]; p.bannLabel = dLabel(x.day); }
          bann[g] = 0;
        } else bann[g] = (bann[g] || 0) + 1;
      }));
      r.forEach(x => {
        if(x.w && x.gR > p.stoppMax){ p.stoppMax = x.gR; p.stoppLabel = dLabel(x.day); }
      });
    }
    // „Der Eiskalte": im Tiebreak gewonnene Partien in Folge.
    // Gezaehlt wird nur, was `_stEinTorPartie` als solche erkennt — dieselbe
    // Frage, die „Das Kaltblut" im Monat stellt [§10.2]. Partien mit anderem
    // Ausgang dazwischen unterbrechen nicht, erst eine Tiebreak-Niederlage beendet sie.
    {
      let n = 0, start = '';
      r.forEach(x => {
        if(!_stEinTorPartie(x)) return;
        if(!x.w){ n = 0; return; }
        if(++n === 1) start = x.day;
        if(n > p.eiskaltLauf){
          p.eiskaltLauf = n;
          p.eiskaltSpan = start === x.day ? dLabel(x.day) : (dLabel(start) + '–' + dLabel(x.day));
        }
      });
    }
    // „Der Tagesabschluss" ueber die Laufbahn: eigene Spieltage im Soll in
    // Folge. Ein Tag zaehlt wie im Monat ab der ersten Partie und erst, wenn
    // er zu ist (`tagZu`); im Soll heisst mindestens so viele Siege, wie die
    // Siegchancen des Tages zusammen erwarten liessen — dieselbe Toleranz wie
    // in der Monatswertung, sonst kippt ein Tag mit genau erfuelltem Soll an
    // einer Rundung.
    {
      let n = 0, start = '';
      _tagListe.forEach(t => {
        if(!tagZu(t)) return;
        const a = _tage[t];
        const siege = a.filter(x => x.w).length, soll = a.reduce((s, x) => s + x.exp, 0);
        if(siege < soll - 1e-9){ n = 0; return; }
        if(++n === 1) start = t;
        if(n > p.sollLauf){
          p.sollLauf = n;
          p.sollSpan = start === t ? dLabel(t) : (dLabel(start) + '–' + dLabel(t));
        }
      });
    }
    const dz = (a) => a.map(x => x.gf - x.ga);
    if(ausg.length >= 2){ p.ausgN = ausg.length; p.ausgSd = _sd(dz(ausg)); p.ausgMit = _mit(dz(ausg)); }
    if(atk.length  >= 2){ p.drvSd  = _sd(dz(atk));  p.drvMit  = _mit(dz(atk));  }
    if(def.length  >= 2){ p.revSd  = _sd(dz(def));  p.revMit  = _mit(dz(def));  }
  });

  Object.keys(P).forEach(id => {
    const p = P[id];
    p.days = daySet[id] ? daySet[id].size : 0;
    p.seasons = seasonSet[id] ? seasonSet[id].size : 0;
    // Volle Spieltage (3+ Partien) und die makellosen darunter.
    const dc = dayCount[id] || {}, dw = dayWins[id] || {};
    const dzAll = dayZufall[id] || {};
    Object.keys(dc).forEach(day => {
      if(!tagZu(day)) return;
      // ── Fügungen, die einen ganzen Abend brauchen [§C35] ───────────
      const dz = dzAll[day];
      if(dz){
        // Der schwerste Abend: die mittlere Siegchance über alle Partien
        // dieses Tages. Ab drei Partien — aus zweien ist das kein Abend,
        // sondern eine Laune der Aufstellung.
        if(dc[day] >= 3){
          const mw = dz.e / dc[day];
          if(p.hartTag == null || mw < p.hartTag){ p.hartTag = mw; p.hartTagLabel = dLabel(day); }
        }
        // Die Punktlandung: das eigene Game-Konto eines Abends geht exakt auf.
        // Je mehr Partien, desto unwahrscheinlicher — deshalb zählt die
        // GRÖSSE des Abends, nicht die Zahl solcher Abende.
        if(dz.gf === dz.ga && dc[day] > p.gleichTag){
          p.gleichTag = dc[day]; p.gleichTore = dz.gf; p.gleichLabel = dLabel(day);
        }
        // Die Achterbahn: einen Bagel gewonnen und einen kassiert, an einem Abend.
        if(dz.n10 && dz.n01){ p.beidesTag++; p.beidesLabel = dLabel(day); }
        // Der Wiedergänger: dasselbe Ergebnis, wieder und wieder.
        let mx = 0, mk = '';
        Object.keys(dz.erg).forEach(k => { if(dz.erg[k] > mx){ mx = dz.erg[k]; mk = k; } });
        if(mx > p.wiederTag){ p.wiederTag = mx; p.wiederErg = mk; p.wiederLabel = dLabel(day); }
      }
      if(dc[day] < 3) return;
      p.bigDays++;
      if((dw[day] || 0) === dc[day]) p.perfDays++;
    });
    // Der beste Monat seines Lebens — als Quote, ab CHRONIK_MIN_SPIELE Partien im Monat.
    const sa = seasonAgg[id] || {};
    Object.keys(sa).forEach(sd => {
      const r = sa[sd];
      if(r.g < CHRONIK_MIN_SPIELE) return;
      const q = r.w / r.g;
      if(!p.bestMonth || q > p.bestMonth.q) p.bestMonth = {q, g:r.g, w:r.w, sid:sd};
    });
    p.peak = Math.round(gSim.peakElo[id] || cfg.start_elo);
    p.founder = !!(firstDayKey && p.firstDay === firstDayKey);

    // Elo-Sprünge zwischen zwei gespielten Saisons
    const played = [];
    Object.keys(gSim.seasonEndElos || {}).sort().forEach(sid => {
      const g = (gSim.seasonPlayed[sid] || {})[id] || 0;
      if(g >= 10 && gSim.seasonEndElos[sid][id] !== undefined){
        played.push({sid, elo:gSim.seasonEndElos[sid][id]});
      }
    });
    for(let i = 1; i < played.length; i++){
      const d = played[i].elo - played[i-1].elo;
      if(!p.fall || d < p.fall.d){
        p.fall = {d, from:seasonLabel(played[i-1].sid), to:seasonLabel(played[i].sid)};
      }
    }

    // Früher stand hier eine Titel-Bilanz (champCount, champStreak, …). Kein
    // Rekord hat sie je gelesen — sie war ein Rest aus der Zeit, als Rekorde
    // nachzählten, wie oft jemand einen Saisontitel geholt hat. Genau das ist
    // die Doppelung, die es nicht mehr geben soll (siehe ABGRENZUNG oben).
    // Wegfallen darf sie auch deshalb, weil sie pro Spieler einen
    // seasonTitleHistory-Durchlauf gekostet hat.
  });

  if(bisMs){ _cache._chronCtxBis[bisMs + '_' + key] = C; return C; }
  _cache._chronCtxKey = key;
  _cache._chronCtx = C;
  return C;
}

// Vergabe für alle Spieler auf einmal — Liga-Rekorde brauchen ohnehin das
// ganze Feld, und der Profilaufruf wird damit zum reinen Lookup.
// Vergabe für die ganze Liga in EINEM Durchlauf.
//
// EIN REKORD = EIN BESTWERT. Jeder Rekord geht an den, der ihn wirklich hält.
// Kein Reihum-Verfahren: Wer 221 Siege hat, ist der Rekordsieger, auch wenn
// er schon den höchsten Elo-Gipfel hält. Alles andere wäre kein Rekord.
// Und wer denselben Bestwert erreicht hat, hält denselben Rekord: bei exaktem
// Gleichstand tragen ihn alle Gleichauf-Halter (entry.pids/entry.holders).
//
// Dass jeder Spieler trotzdem nur EINE Auszeichnung trägt, ist eine reine
// ANZEIGE-Regel: `byPid` behält je Spieler den wertvollsten seiner Rekorde
// (Katalog-Reihenfolge = Wertigkeit). `byId` bleibt vollständig — die
// Liga-Liste zeigt jeden Rekord mit seinem echten Halter.
// `bisMs` reicht den Zeitschnitt an den Kontext durch — siehe dort.
function allChronicles(bisMs){
  bisMs = _schnitt(bisMs);
  const key = matches.length + '_' + _cache.version;
  if(!bisMs && _cache._chronAllKey === key) return _cache._chronAll;
  if(bisMs){
    if(!_cache._chronAllBis) _cache._chronAllBis = {};
    const bk = bisMs + '_' + key;
    if(_cache._chronAllBis[bk]) return _cache._chronAllBis[bk];
    _topfDeckel(_cache._chronAllBis, 24);
  }
  const C = _chronicleCtx(bisMs);
  const byPid = {}, byId = {};
  CHRONICLES.forEach(def => {
    // Bestwert — und ALLE, die ihn halten. Ein Rekord wird nicht per
    // Tiebreak zugeteilt: Wer denselben Wert erreicht hat, hat denselben
    // Rekord. Bei exaktem Gleichstand tragen ihn beide.
    let bv = -Infinity;
    const vals = {};
    Object.keys(C.P).forEach(id => {
      const v = def.val(C.P[id], C);
      if(v == null || !isFinite(v)) return;
      vals[id] = v;
      if(v > bv) bv = v;
    });
    const pids = Object.keys(vals).filter(id => Math.abs(vals[id] - bv) <= 1e-9)
      // Nur noch die ANZEIGE-Reihenfolge, keine Auswahl mehr.
      .sort((a, b) => C.P[b].wins - C.P[a].wins || C.P[b].gd - C.P[a].gd || (a < b ? -1 : 1));
    if(!pids.length) return;
    const _zeit = (id) => {
      if(!def.zeit) return '';
      try { return def.zeit(C.P[id], bv, C) || ''; } catch(e){ return ''; }
    };
    const holders = pids.map(id => ({pid:id, ev:def.ev(C.P[id], bv, C), zeit:_zeit(id)}));
    const entry = {
      id:def.id, name:def.name, ic:def.ic, tone:def.tone, kind:def.kind, neg:def.neg,
      cond:def.cond, ord:def.ord, pid:pids[0], pids, holders,
      shared:pids.length > 1, val:bv, ev:holders[0].ev, zeit:holders[0].zeit
    };
    byId[def.id] = entry;
    // Jeder Halter bekommt den Eintrag mit SEINEM Beleg — bei geteilten
    // Rekorden steht bei jedem die eigene Zahl, nicht die des anderen.
    holders.forEach(h => {
      if(byPid[h.pid]) return;        // erster Treffer = wertvollster
      byPid[h.pid] = Object.assign({}, entry, {ev:h.ev, zeit:h.zeit, mine:h.pid});
    });
  });
  const res = {byPid, byId, rated:Object.keys(C.P).length};
  if(bisMs){ _cache._chronAllBis[bisMs + '_' + key] = res; return res; }
  _cache._chronAllKey = key;
  _cache._chronAll = res;
  return res;
}

// ─── Was in EINER Saison an Rekorden passiert ist ────────────────────
// Zwei Rekordstände nebeneinandergelegt: der am Monatsende und der am Ende
// des Vormonats. Was sich dazwischen bewegt hat, ist die Ausbeute dieses
// Monats — und zwar dreierlei, sprachlich getrennt, weil es drei
// verschiedene Ereignisse sind:
//   'neu'      der Rekord existierte vorher gar nicht (niemand erfüllte die
//              Mindestbedingung) — die erste Marke überhaupt
//   'geholt'   er wechselte den Halter
//   'gesteigert' derselbe hielt ihn und hat seinen eigenen Wert überboten
// Ein Rekord, an dem sich nichts bewegt hat, taucht nicht auf: ein
// Rückblick, der zwanzig unveränderte Bestwerte auflistet, erzählt vom
// Katalog und nicht von der Saison.
//
// Schattenseiten bleiben draußen. „Die längste Durststrecke" ist im
// Rückblick keine Nachricht, sondern eine Ohrfeige — und die Liga liest
// ihn gemeinsam.
function saisonRekorde(sid){
  if(!sid) return [];
  const vor = _prevSeasonId(sid);
  return _rekordeZwischen('srek_' + sid, vor ? seasonEnd(vor).getTime() : null, seasonEnd(sid).getTime());
}
// Dieselbe Rechnung für einen beliebigen Zeitraum — die Woche eines
// Rückblicks [§C31]: der Stand vor ihrem ersten Augenblick gegen den an
// ihrem Ende. Dieselben Zeitschnitte wie die Laufbahn-Wirkung derselben
// Woche (`rcpLaufbahnDaten`), damit `allChronicles` jeden nur einmal rechnet.
function rekordeImZeitraum(vonMs, bisMs){
  return _rekordeZwischen('zrek_' + vonMs + '_' + bisMs, vonMs - 1, bisMs);
}
function _rekordeZwischen(name, vorMs, bisMs){
  const key = name + '_' + matches.length + '_' + _cache.version;
  if(!_cache._srek) _cache._srek = {};
  if(_cache._srek[key]) return _cache._srek[key];
  _topfDeckel(_cache._srek, 24);

  const out = [];
  try {
    const jetzt = allChronicles(bisMs).byId;
    const vor   = vorMs != null ? allChronicles(vorMs).byId : {};
    CHRONICLES.forEach(def => {
      if(def.kind === 'shame') return;
      const n = jetzt[def.id];
      if(!n) return;
      const a = vor[def.id];
      // Ein Bestwert ist immer der größte (`allChronicles`). Fällt der Wert
      // desselben Halters, weil eine Quote mit jeder Partie wandert, ist das
      // kein Rekord dieses Zeitraums: es stand als „verbessert" da — in einer
      // einzigen Augustwoche siebzehnmal, darunter „Der Glanztag" vom 20.07.
      let art = '';
      if(!a) art = 'neu';
      else if(n.val - a.val > 1e-9) art = (a.pid === n.pid) ? 'gesteigert' : 'geholt';
      else if(n.pids.join(',') !== a.pids.join(',')) art = 'geholt';
      if(!art) return;
      out.push(Object.assign({}, n, {art, vorwert: a ? a.val : null,
                                     vorhalter: a ? a.pid : null}));
    });
  } catch(e){ return []; }
  _cache._srek[key] = out;
  return out;
}

// Namen aller Halter eines Rekords, fertig für die Anzeige („Leon & Martin").
// Alle Liga-Rekorde, die ein Spieler haelt — in Katalog-Reihenfolge, also
// wertvollster zuerst. `chronicleOf` liefert davon nur den ersten; das Profil
// zeigt alle.
function chroniclesOfPlayer(pid, bisMs){
  // Ein Ruheständler hält, was er beim Karriereende hielt [§C40] — soweit es
  // den Rekord noch gibt. Ein gestrichener stand sonst in seinem Profil und
  // im Abschied als einziger Ort der App, sein Blatt öffnete nicht, und das
  // Prestige zählte ihn mit einem Ersatzwert weiter [§C35].
  if(bisMs == null && imRuhestand(pid)) return (ruhestandStand(pid).rekorde || []).filter(r => CHRONICLE_BY_ID[r.id]);
  let all;
  try { all = allChronicles(bisMs); } catch(e){ return []; }
  const out = [];
  CHRONICLES.forEach(def => {
    const e = all.byId[def.id];
    if(!e) return;
    const h = (e.holders || [{pid:e.pid, ev:e.ev}]).find(x => x.pid === pid);
    if(!h) return;
    out.push(Object.assign({}, e, {ev:h.ev, zeit:h.zeit || '', mine:pid}));
  });
  return out;
}

function _chronHolderNames(entry){
  if(!entry) return '';
  const names = (entry.pids || [entry.pid]).map(id => { const p = pmap()[id]; return p ? p.name : '?'; });
  return names.length > 1 ? names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1] : names[0];
}

// Dieselben Namen, aber fuer einen Satz. Die Form mit „&" gehoert in die
// Zelle des Rekorde-Reiters, wo sie schmal bleiben muss; im Fliesstext stand
// damit „Martin & Julian haelt den Bestwert mit 84 %" — das Zeichen als
// einziges im Satz, und dazu das Verb im Singular. Die Aufzaehlung fuer
// Saetze hat die App schon [§C27], hier fehlte nur der Weg dorthin.
function _chronHalterSatz(entry){
  if(!entry) return '';
  const names = (entry.pids || [entry.pid]).map(id => { const p = pmap()[id]; return p ? p.name : '?'; });
  return _namenListe(names);
}

// Was fehlt einem Spieler ohne Rekord bis zum nächstgelegenen? Nur zählbare
// Rekorde kommen infrage (`unit`) — und nichts Negatives: „noch drei
// 0:10-Niederlagen" wäre ein Ziel, das niemand haben will, und „noch 5 %
// Siegchance mehr, die trotzdem verloren geht" genauso wenig.
// Gewählt wird der RELATIV nächste, damit nicht immer derselbe Rekord mit
// der kleinsten absoluten Zahl vorschlägt.
function nextRecordFor(pid){
  let C, all;
  try { C = _chronicleCtx(); all = allChronicles(); } catch(e){ return null; }
  const p = C.P[pid];
  if(!p || all.byPid[pid]) return null;
  let best = null;
  CHRONICLES.forEach(def => {
    if(!def.unit || def.neg) return;
    const mine = def.raw(p, C);
    if(mine == null || !isFinite(mine)) return;
    const lead = all.byId[def.id];
    // Ohne Halter reicht die Untergrenze, sonst muss der Bestwert fallen.
    const target = lead ? lead.val : (def.min || 0);
    const need = lead ? Math.floor(target - mine) + 1 : Math.ceil(target - mine);
    if(need <= 0) return;
    const rel = need / Math.max(1, target);
    if(!best || rel < best.rel){
      best = {def, rel, need, mine, lead,
              holder: lead ? _chronHolderNames(lead) : null, target};
    }
  });
  if(!best) return null;
  return {
    id:best.def.id, name:best.def.name, ic:best.def.ic, tone:best.def.tone,
    cond:best.def.cond, need:best.need, unit:best.def.unit,
    have:Math.round(best.mine), target:Math.round(best.target),
    holder:best.holder,
    txt: `Noch ${best.need} ${best.def.unit}` +
         (best.holder ? `, ${best.holder} hält ${Math.round(best.target)}`
                      : ` bis zur Untergrenze von ${Math.round(best.target)}`)
  };
}

// Die eine Chronik eines Spielers — oder null.
function chronicleOf(pid){
  if(imRuhestand(pid)) return chroniclesOfPlayer(pid)[0] || null;
  try { return allChronicles().byPid[pid] || null; } catch(e){ return null; }
}

// Wer hält welche Chronik? Für die Liga-Ansicht. {chronId → Chronik}
function chronicleHolders(){
  try { return allChronicles().byId; } catch(e){ return {}; }
}

// Wie viele Rekorde jeder haelt — die Zahlen der Besitzleiste ueber dem
// Rekorde-Reiter. Sie stehen in `byId` laengst da, wurden aber nie gezaehlt;
// gerechnet wird ueber knapp vierzig Eintraege, nicht ueber die Partien.
// Gemerkt wird trotzdem: die Leiste steht bei JEDEM Zeichnen des Reiters.
//
// Gezaehlt wird, was ein Rekord IST: eine Schattenseite und eine negative
// Fuegung zaehlen nicht mit [§C25]. Die Leiste zaehlte sie, das Podest der
// Ewigen Tafel und das Profil nicht — auf derselben Seite standen damit zwei
// Zahlen unter demselben Wort: Martins Saeule sagte 13, seine Podestkarte
// „10 Rek.". Wer zwei Zaehlungen fuer dieselbe Frage baut, hat einen Fehler
// gemacht [§C27], also steht die Regel hier und nicht dreimal im Aufruf.
// Die Schandtafel bleibt in ihrer Kammer sichtbar — dort gehoert sie hin.
function rekordZaehlung(){
  const key = matches.length + '_' + _cache.version;
  if(_cache._rekZKey === key) return _cache._rekZ;
  const A = allChronicles();
  const zahl = {};
  Object.keys(A.byPid).forEach(pid => { zahl[pid] = 0; });
  Object.keys(A.byId).forEach(cid => {
    if(A.byId[cid].neg) return;
    (A.byId[cid].pids || []).forEach(pid => { zahl[pid] = (zahl[pid] || 0) + 1; });
  });
  // Auch wer nichts haelt, gehoert in die Leiste: eine fehlende Saeule sagt
  // „ich habe ihn uebersehen", eine gestrichelte Null sagt „er haelt nichts".
  const C = _chronicleCtx();
  Object.keys(C.P).forEach(pid => { if(zahl[pid] === undefined) zahl[pid] = 0; });
  const res = Object.keys(zahl).filter(pid => pmap()[pid])
    .map(pid => ({pid, n:zahl[pid]}))
    .sort((a, b) => b.n - a.n || pname(a.pid).localeCompare(pname(b.pid)));
  _cache._rekZKey = key;
  _cache._rekZ = res;
  return res;
}

// Die vollstaendige Reihenfolge EINES Rekords — das Podest im Blatt und die
// Verfolger darunter. Der Kontext ist gecacht, gerechnet wird nur ueber die
// gewerteten Spieler; das Ergebnis wird gemerkt, weil ein Blatt beim
// Zurueckwischen erneut gezeichnet wird.
function chronicleRang(cid){
  const def = CHRONICLE_BY_ID[cid];
  if(!def || !def.val) return [];
  const key = cid + '_' + matches.length + '_' + _cache.version;
  if(!_cache._chronRang) _cache._chronRang = {};
  if(_cache._chronRang[key]) return _cache._chronRang[key];
  const C = _chronicleCtx();
  const reihe = [];
  Object.keys(C.P).forEach(pid => {
    const v = def.val(C.P[pid], C);
    if(v == null || !isFinite(v)) return;
    let ev = '', zeit = '';
    try { ev = def.ev(C.P[pid], v, C) || ''; } catch(e){ ev = ''; }
    if(def.zeit){ try { zeit = def.zeit(C.P[pid], v, C) || ''; } catch(e){ zeit = ''; } }
    reihe.push({pid, wert:v, ev, zeit});
  });
  // Dieselbe Ordnung wie bei der Vergabe — sonst stuende auf dem Podest ein
  // anderer als in der Liste darueber.
  reihe.sort((a, b) => b.wert - a.wert
    || C.P[b.pid].wins - C.P[a.pid].wins
    || C.P[b.pid].gd - C.P[a.pid].gd
    || (a.pid < b.pid ? -1 : 1));
  // Der Rekorde-Reiter fragt jede Reihenfolge des Katalogs auf einmal ab
  // (der Feldstreifen jeder Karte). Mit zwölf räumte er bei jedem Zeichnen
  // die Einträge, die Blatt und Feed gerade brauchten [§3].
  _topfDeckel(_cache._chronRang, CHRONICLES.length + 12);
  _cache._chronRang[key] = reihe;
  return reihe;
}

// Wie ein Rekord zu seinem Halter kam: der Wert der drei auf dem Podest an
// jedem Monatsende der letzten sechs Monate und heute — für den Beleg im
// Rekord-Blatt [§C27]. Gerechnet über den Zeitschnitt, den es gibt
// (_chronicleCtx), und nicht neu: ein Schnitt rechnet die Elo-Bahn bis
// dorthin nach, gemessen 7 bis 36 ms je Monat. Deshalb in Schritten, einer
// je Takt, und erst nach dem Öffnen des Blatts — sechs Schnitte auf einmal
// stünden mitten in der Animation. Die Schnitte selbst liegen danach im
// Cache und teilen ihn mit dem Feed und den Rückblicken.
//
// Die drei Linien sind die drei Plätze des Podests darüber, in derselben
// Reihenfolge (`chronicleRang`). Vorher zeichnete der Verlauf nur den Halter
// und den Zweiten, und wer auf dem Podest Dritter stand, fehlte darunter:
// ob er näher kam oder zurückfiel, stand nirgends.
function rekordVerlauf(cid, fertig){
  const def = CHRONICLE_BY_ID[cid];
  const key = cid + '_' + matches.length + '_' + _cache.version;
  if(!_cache._rekVerlauf) _cache._rekVerlauf = {};
  if(key in _cache._rekVerlauf){ fertig(_cache._rekVerlauf[key]); return; }
  const rang = def && def.val ? chronicleRang(cid) : [];
  if(!rang.length){ fertig(null); return; }
  const drei = rang.slice(0, 3).map(r => r.pid);
  const monate = allPastSeasons().slice(-6);
  const schnitte = monate.map(sid => seasonEnd(sid).getTime()).concat([0]);
  const labels = monate.map(sid => String(seasonLabel(sid)).split(' ')[0].slice(0, 3)).concat(['heute']);
  const werte = drei.map(() => []), vorn = [];
  const wert = (C, pid) => {
    if(!pid || !C.P[pid]) return null;
    try { const v = def.val(C.P[pid], C); return v == null || !isFinite(v) ? null : v; } catch(e){ return null; }
  };
  let i = 0;
  const schritt = () => {
    const C = _chronicleCtx(schnitte[i] || undefined);
    drei.forEach((pid, k) => werte[k].push(wert(C, pid)));
    const x = werte[0][werte[0].length - 1];
    let best = -Infinity;
    Object.keys(C.P).forEach(pid => { const v = wert(C, pid); if(v != null && v > best) best = v; });
    vorn.push(x != null && x >= best - 1e-9);
    if(++i < schnitte.length){ setTimeout(schritt, 0); return; }
    // „vorn seit": der erste Monat, ab dem der Halter bis heute nie
    // dahinter lag. Heute liegt er vorn — er hält den Rekord.
    let seit = vorn.length - 1;
    while(seit > 0 && vorn[seit - 1]) seit--;
    const ergebnis = {labels, seit,
      reihen:drei.map((pid, k) => ({pid, name:pname(pid), werte:werte[k]}))};
    _topfDeckel(_cache._rekVerlauf, 16);
    _cache._rekVerlauf[key] = ergebnis;
    fertig(ergebnis);
  };
  schritt();
}

// Der Titel, der im Profil unter dem Namen steht: laufender Saisontitel vor
// letztem abgeschlossenem. Ehrentitel gibt es bewusst nicht mehr — sie waren
// nur eine zweite Anzeige derselben Aussage.
// Der BEINAME einer Chronik: er beschreibt den Spieler, nicht das Ereignis.
// Im Profilkopf steht eine Pille unter dem Namen, und dort las sich „Der
// Endspurt" wie eine Überschrift und nicht wie eine Beschreibung — „Der
// Ausdauernde" schon. Der Katalogname bleibt überall sonst: in der Matrix,
// auf der Plakette, im Blatt und in der Nachricht geht es um die Wertung,
// im Profilkopf um den Menschen.
// Ein eingefrorener Monat kann eine Chronik tragen, die es im heutigen
// Katalog nicht mehr gibt [§13.3a]; dann bleibt der gespeicherte Name.
function chronBeiname(t){
  const d = t && t.titleId && SEASON_TITLE_BY_ID[t.titleId];
  return (d && d.beiname) || (t && t.name) || '';
}

// Im Band steht nur, was ein Titel ist: die jüngste POSITIVE Monatschronik
// [§C39]. Eine Schattenseite stand dort rot, sobald sie die jüngste war, und
// verdrängte den Beinamen eines früheren Monats: Jannik trug im August „Der
// Durchlässige" (Das Scheunentor) statt „Der Zugeknöpfte" aus dem Juni.
// Jetzt bleibt der Juni stehen, bis wieder ein positiver Monat kommt. Je
// Monat steht der Eintrag, der zählt (`seasonTitleOf`, der wertvollste):
// der Beiname soll sagen, was den Spieler in diesem Monat ausmacht, und
// vorher stand der erste positive im Katalog — „Der Torjäger" (50) vor „Der
// Lernfähige" (100) desselben Monats. Eine Schattenseite zählt nichts und
// ist deshalb nur dann der Eintrag eines Monats, wenn er sonst nichts
// brachte. Die Monate von hinten, der laufende zuerst — er ist der jüngste.
function playerTitleBadge(pid){
  const rows = seasonTitleHistory(pid);
  for(let i = rows.length - 1; i >= 0; i--){
    const r = rows[i], t = r.title;
    if(!t || chronikStufe(t.titleId) === 'schatten') continue;
    return {kind:'season', name:chronBeiname(t), titel:t.name, titleId:t.titleId,
            ic:t.ic, tone:t.tone, sub:r.label + (r.live ? ' · läuft' : ''), live:r.live,
            sid:r.sid, ev:t.ev};
  }
  return null;
}

// ─── §13.4c Titelrennen der laufenden Saison ─────────────────────────
// Wer führt gerade bei welchem Titel — und wie klar? Genutzt vom
// „Tafel im Entstehen"-Block und von der Fun-Fact-Vorlage.
// Nutzt denselben Durchlauf, nur auf die laufende Saison angewendet.
// Wer einer noch nicht vergebenen Monatswertung am naechsten kommt.
// Gemerkt je Saison, weil die Chronik-Tafel danach siebenundzwanzig Mal
// fragt und der Kontext dahinter der ganze Monat ist.
function _stNahDef(sid, titleId){
  if(!sid) sid = currentSeason().id;
  const key = sid + '_' + matches.length + '_' + _cache.version;
  if(!_cache._stNah) _cache._stNah = {};
  if(_cache._stNahKey !== key){ _cache._stNah = {}; _cache._stNahKey = key; }
  if(titleId in _cache._stNah) return _cache._stNah[titleId];
  let raus = null;
  try {
    const def = DISZIPLINEN.find(d => d.id === titleId);
    if(def && def.monat) raus = _stNah(_seasonTitleCtx(sid), def);
  } catch(e){ raus = null; }
  _cache._stNah[titleId] = raus;
  return raus;
}

function seasonTitleRace(sid){
  if(!sid) sid = currentSeason().id;
  const t = seasonTitles(sid);
  const C = _seasonTitleCtx(sid);
  return SEASON_TITLES.map(def => {
    const held = t.awarded.find(a => a.titleId === def.id);
    if(held){
      // Verfolger: der Zweitbeste dieses Eintrags. Früher war es der beste
      // noch FREIE Spieler — „frei" gibt es nicht mehr, seit jeder Eintrag
      // an seinen echten Halter geht [§C32].
      const chase = def.pick(C, new Set(t.awarded.filter(a => a.titleId === def.id).map(a => a.pid)));
      return {titleId:def.id, name:def.name, ic:def.ic, tone:def.tone, cond:def.cond,
              pid:held.pid, ev:held.ev, chaser:chase || null};
    }
    return {titleId:def.id, name:def.name, ic:def.ic, tone:def.tone, cond:def.cond,
            pid:null, ev:null, chaser:null};
  });
}

