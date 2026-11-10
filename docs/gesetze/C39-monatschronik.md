# §C39 Die Monatschronik fragt nicht, wer der Beste ist

## Regel

- Die Monatschronik fragt nach Abweichung von der Erwartung, Konstanz, dem Verhältnis zum Ligamittel desselben Monats, zu einem bestimmten anderen Spieler, zum eigenen Spiel (vorne gegen hinten, neben neuen Partnern, in der Revanche, nach einem Sieg, gegen bekannte Gegner, gegen die beiden Ersten, neben einem Partner nach zwei Pleiten, als Favorit, gegen den häufigsten Gegner, an langen Spieltagen, nach einem Positionswechsel), zur eigenen Laufbahn (die Tore im Sturm, die Gegentore und Tore in der Abwehr, die Bilanz gegen denselben Gegner) oder einem seltenen Einzelereignis, nicht nach dem Können. Nur zwei fragen nach der Tabelle: „Auf dem Thron" und „Der Souverän" (mindestens 100 Elo Vorsprung an der Spitze der Monatstabelle). Sie soll zeigen, worin ein Spieler besonders ist; dass jeder eine bekommt, ist kein Ziel, dass der Beste eines Monats leer ausgeht, aber auch nicht: an den echten Monaten hält der Meister jedes Monats mindestens eine positive Chronik.
- Eine Können-Chronik misst gegen die Elo-Erwartung (`_stSoll`, `_stTorSteigung`), gegen den eigenen Rest (`_stErsterBall`, `_stSchlussBall`) oder gegen den eigenen Vormonat (`_stVormonat`, `_stVormonatPlatz`), nicht gegen eine feste Latte, die nur der Stärkste erreicht. In den Fixture-Monaten halten die ersten drei der Monatstabelle höchstens das 1,3-fache der Einträge, die ihnen nach ihrer Zahl unter den Gewerteten zustehen.
- Eine Monatschronik hält, wer im Monat mindestens fünfzehn eigene Partien hat (`CHRONIK_MIN_SPIELE`, in `_stWertung`), positive wie Schattenseiten, vom ersten Spieltag an; eine Grenze für den ganzen Monat gibt es nicht. Wer darunter bleibt, ist nicht gewertet: in der Matrix leer, in der Tafel unter „Nicht gewertet“ (`zuWenig`, auch eingefroren). Eine Bedingung nennt für den Monat selbst keine kleinere Zahl; was sie nennt, meint einen Teil des Monats (fünf in einer Teilmenge, `ST_TEIL`), den Vormonat (acht Partien, `_stVormonat`) oder die Laufbahn davor. Die Besonderheit steckt in der Schwelle.
- **Ein Wert zählt nach seiner Stichprobe** (`_stGleichesMass`): über wenige Partien streut ein Anteil von selbst weiter, und wer wenig spielt, läge mit demselben Spiel öfter jenseits der Schwelle. Gewertet wird `mitte + (roh − mitte) / √(echt + (1 − echt) · n0 / n)`; `n` ist die Stichprobe, auf die sich der Wert stützt (`monat.stichprobe`), `mitte` der Schnitt, `n0` die mittlere Stichprobe und `echt` der Anteil der Streuung, der kein Zufall ist (aus `(roh − Lage)² = τ² + B/n` mit der Lage als Gerade in ln n, in Zwanzigsteln) — alle drei an den echten Partien gemessen und festgeschrieben. Bei `n0` bleibt der Wert, darunter rückt er zur Mitte, darüber weiter hinaus. Schwelle, Ausschlag, Streuung und Bonus gelten für den gewerteten Wert (`wert`; der rohe ist `roh`), und der Beleg nennt ihn hinter dem rohen („· gewertet 41 %“), wo beide verschieden aussehen. `stichprobe:false` tragen Fragen nach einer Wahrscheinlichkeit (sie ist für jede Zahl gleich schwer), nach der Tabelle, einem festen Zeitraum, einer Serie oder dem Anteil an den Partien, und vier Beträge und Spannen („Favorit wie Außenseiter“, „Der Wechselhafte“, „Das Metronom“, „Der Kontrast“), bei denen die Wertung die Abhängigkeit von der Spielzahl umkehrte. Die Punktlandung, der Erwartungstreue und der Beidfüßige rechnen ihren Abstand selbst auf eine feste Zahl hoch (50, 40 und 15 Partien), und ihr Beleg nennt nur den hochgerechneten.
- Jede `monat`-Wertung trägt `art` (koennen, konstanz, fuegung, schatten), `klasse` (legendaer, selten, besonders, schatten), `aus` (Ausschlag der Schwelle in σ) und `streu` (Standardabweichung der Größe in ihrer eigenen Einheit, auch bei einer Schattenseite), einmal an den Daten geprüft und dann festgeschrieben.
- Die Klasse sagt, was eine Chronik als Leistung bedeutet, nicht wie weit ihre Schwelle hinausliegt: **legendär** ist ein ganzer Monat als außergewöhnliche Leistung — über alle Partien, jeden Spieltag, jede Woche, jeden Gegner oder die Tabelle —, nur Können oder Konstanz, nie eine Wende; **selten** ist eine klare Leistung über den ganzen Monat, gegen die Rechnung in einem Zug (ein Tag, eine Woche, eine Serie, der Rivale), gegen die Stärksten, eine einzigartige Fügung und jede **Wende** (`wende:true`: sie zeigt erst eine Schwäche — Pleiten gegen denselben Gegner, einen schwachen Vormonat, einen schwachen Beginn — und dann, dass sie gebrochen wurde); **besonders** ist ein Muster in einem Ausschnitt der eigenen Partien und jede andere Fügung; eine Schattenseite trägt `schatten` und keine dieser Klassen.
- Die Klasse zählt keine Halter. Gedeckelt ist die Rate: eine Chronik geht in höchstens einem Drittel der gewerteten Monate an jemanden, aufgerundet — gemessen an allen Partien der Liga bis Ende Oktober (`tests/fixtures/oktober.txt`), also in höchstens zwei von fünf Monaten. Ausgenommen sind die sechsundzwanzig Schwellen, die die Liga selbst festgelegt hat (`_LIGA_SETZT` in `tests/disziplinen`): sie sind eine Ansage wie der Tagesregent und werden weder gegen die Seltenheit noch gegen den Mindestausschlag geeicht; ihr `aus` ist an denselben Partien gemessen.
- Fragt eine Chronik, wie ein Ausschnitt der eigenen Partien gegen die Rechnung ausging, fragt eine neue nach der Wahrscheinlichkeit (`_stUnwahr`: der Zehnerlogarithmus der Wahrscheinlichkeit, mindestens so viele oder höchstens so wenige Siege zu holen), nicht nach dem Abstand in Prozentpunkten. Ein Abstand schwankt über wenige Partien stärker; eine Wahrscheinlichkeit ist für zehn und für hundert Partien gleich schwer zu reißen, solange nur der Zufall spielt.
- Die Klasse ist Farbe und Name (`chronikStufe`): Gold legendär, Lila selten, Metall besonders, Rot eine Schattenseite. Über den Wert entscheidet sie nicht: jede Chronik außer einer Schattenseite bringt den Grundwert 100 (`CHRONIK_GRUNDWERT`), gleich welcher Klasse und Art, dazu den Bonus: je σ, um die der Halter die Schwelle überbietet (`chronikUeber`: `(wert − ab) / streu`), zehn Punkte (`CHRONIK_BONUS_JE_HALBIERUNG`) mal die Halbierungen, die an der Schwelle auf ein σ kommen (`chronikHalbierungenJeSigma`: das Mills-Verhältnis φ/Q des Ausschlags durch ln 2) — bei 1,2 σ Ausschlag 24 je σ, bei 2,5 σ 41, bei 3,5 σ 54. Weit draußen ist jeder Schritt seltener, und eine legendäre Chronik bringt dort mehr je Schritt; mehr Abweichung bringt immer mehr, und eine besondere mit viel davon steht vor einer legendären mit wenig. Mindestens 1, wer die Schwelle überhaupt überbietet, nach oben offen, genau auf der Schwelle nichts (`chronikBonus`). Eine Schattenseite bringt nichts. Der Wert des Halters steht in der Tafel und im eingefrorenen Monat (`awarded[].wert`, `SEASON_TITLES_FREEZE_V` 8). Je Spieler und Monat steht und zählt der wertvollste Eintrag (`chronikEintragVon`), also der mit dem größten Bonus.
- Eine Chronik mit „höchstens" bringt mehr, je näher sie am Ziel liegt: eine Wahrscheinlichkeit zählt als Zehnerlogarithmus (`_stUnwahr`, auch „Der Unmögliche Monat"), ein Abstand zu einem Ziel logarithmisch mit einer Untergrenze unter dem kleinsten Schritt, der auf dem Bildschirm steht (die Punktlandung ein halbes Tor, eine Quote ein Zwanzigstel Prozentpunkt), und der Beleg nennt den Abstand mit einer Stelle. Die Laufbahn schreibt „weiter als verlangt", nicht „über der Schwelle".
- **Die Schattenseite überschattet eine besondere Chronik** (`chronikUeberschattet`): geht eine Schattenseite desselben Spielers im selben Monat mindestens doppelt so weit über ihre Schwelle hinaus wie eine besondere Chronik über ihre (`CHRONIK_SCHATTEN_FAKTOR` 2, in σ der eigenen Streuung, `chronikSchattenGewicht`) und mindestens eine Streuung weit (`CHRONIK_SCHATTEN_MIN` 1), bringt die besondere kein Prestige. Sie bleibt in der Tafel und trägt dort „überschattet von …"; zählt im Monat sonst nichts, steht in Matrix und Prestige die Schattenseite (`chronikEintragVon`), die Farbe der Zelle (`chronikZellStufe`) übergeht die überschattete. Seltene und legendäre Chroniken überschattet nichts. Das Blatt jeder gehaltenen Chronik, auch einer Schattenseite, zeigt unter dem Ausschlag der Schwelle, wie weit ihr Halter darüber liegt (`_chronFaktenHtml`); das Blatt einer Schattenseite nennt, was sie bei ihrem Halter überschattet, das der überschatteten die Schattenseite.
- Eine Chronik schiebt ihre Schwelle mindestens 1,2 σ hinaus (außer einer Schwelle der Liga), korreliert mit ihrem gewerteten Wert höchstens 0,35 mit der Spielzahl, in beide Richtungen, gemessen an allen fünf Monaten bis Ende Oktober, und misst eine Leistung und keine reine Zählung von Gelegenheiten. Acht Chroniken reißen die Korrelation und stehen namentlich im Test (`_SPIELZAHL_ALT`): sechs, deren Wert mit mehr Gelegenheiten von selbst extremer wird („Der Ausreißer“, „Der Umschwung“, „Der Formgipfel“, „Ohne Schwachstelle“, „Das Metronom“, „Die Lieblingszahl“), „Die Auferstehung“ (die Schwelle setzte die Liga, und wer mehr spielt, ist im Schnitt der Stärkere) und „Der Favoritenschreck“ (wer oft klarer Außenseiter ist, ist meist ein tieferer). Die Liste wird nur kürzer, eine neue Chronik kommt nicht dazu.
- Ein Vergleich mit der eigenen Laufbahn zählt alle Partien vor dem ersten Tag des Monats und erst ab dreißig davon (`_stLaufbahnVor`), einer gegen einen bestimmten Gegner dazu erst ab zehn Duellen davor und vier im Monat (`_stDuelleVor`, `_stDuellWende`); welcher Gegner gemeint ist, entscheidet die Laufbahn davor und nicht der Monat, sonst suchte sich die Chronik ihren Ausreißer selbst; ein Vergleich mit dem Ligamittel nimmt alle Partien desselben Monats (`C.L`: `torSchnitt`, `engAnteil`, `klarAnteil`, `torAbstand`).
- Wie viel jemand spielt, fragt nur der eigene Anteil an allen Partien des Monats gegen den eigenen Anteil in den Monaten davor (`_stAnteilVor`, Monate ab acht eigenen Partien), nie die Zahl selbst. Mehr als sonst ist eine Fügung, weniger als sonst eine Schattenseite: Anwesenheit ist kein Können [§C34].
- Eine Schattenseite fragt wie ihr Gegenstück gegen das Eigene oder gegen die Rechnung, nicht nach dem Niveau; sonst gehörte sie immer dem Schwächsten der Liga.
- Vorgegeben und nicht kalibriert: „Der Tagesregent" (60 % der eigenen Spieltage), „Die Wochenkrone" (zwei Drittel der eigenen Wochen, gezählt ab fünf Partien je Woche, über `_periodWinnerMap`), „Auf dem Thron" (Platz zwei oder besser an jedem Spieltag ab der ersten eigenen Partie, aus der Elo-Bahn von `getGlobalSim`, `_thronDerLiga`).
- Im Profilkopf steht der Beiname (`monat.beiname`, `chronBeiname`), überall sonst der Katalogname. Jede Chronik hat einen, und er ist ein eigener Spielertyp, nie der Katalogname; das Blatt nennt ihn in `.chron-kose`. Im Profilkopf steht er als Banner (`.pp-banner`) und nur der der jüngsten **positiven** Monatschronik (`playerTitleBadge`): ein Monat mit nur Schattenseiten verdrängt ihn nicht, hat ein Monat beides, gilt die positive; das Banner bleibt, bis ein neuerer Monat eine positive bringt, und die Zeile darunter nennt seinen Monat („läuft", solange er läuft). Das Banner: ein deckendes Band (Grund aus dunklem Gold unter der Tönung, an den Enden dunkler) mit einer durchgezogenen Naht innen an Ober- und Unterkante und gefalteten Enden, die zum Band hin in den Schatten fallen, Lichthof und Schein im Gold, so groß wie die Pille davor, ohne gestrichelte Kante; beim Öffnen entrollt es sich, danach schieben sich die Enden heraus, alle siebeneinhalb Sekunden ein Glanz; der Monat darunter zwischen zwei goldenen Strichen.
- Die Klasse ist sichtbar: Farbe der Zelle (`data-kl`, `chronikTon`) — in der Matrix und im Profilstreifen die höchste Klasse, die der Spieler im Monat hält (`chronikZellStufe`), auch wenn der Eintrag, der in der Zelle steht und zählt, eine niedrigere trägt; die Zahlen je Stufe unter dem Namen zählen diese Farben, das Band im Kopf die Klassen aller Einträge — Gold mit einem Glanz alle sechs Sekunden, Name auf der Plakette (`CHRONIK_KLASSE_NAME`), Zahlenreihe im Blatt (`rcpZahlenHtml`, `_chronFaktenHtml`): Klasse, Art, Ausschlag und Prestige; mit einem Halter steht unter dem Ausschlag, wie weit er darüber liegt („+0,64 σ“), und unter dem Prestige die Rechnung („100 + 16“), ohne Halter „+ Bonus“. Die Laufbahn nennt je Chronik „Grundwert 100 + 16 für 0,64 σ weiter als verlangt“.
- Die Matrix ordnet nach dem Prestige ihrer Zellen (je Monat der Eintrag, der zählt), dann Zahl der Einträge, dann Name; sie steht in einer Karte (`_lchronTabelle`), Ruheständler in einer eigenen Karte (`ruhe_chronik`). Strich heißt gewertet ohne Eintrag, leer heißt nicht gewertet. Der Kopf jeder Spalte nennt den Monat mit seinem Jahr („Okt ’26“), sonst sind nach dem zweiten Jahr zwei Oktober nicht zu unterscheiden, und zeigt die Zahl und als Band die Stufen ihrer Einträge, die Zeile unter dem Namen je Stufe die Zahl ihrer Zellen, die Zelle „+N", wenn der Spieler im Monat mehr hält; die Legende nennt die Stufen, ohne Wert.
- Eine Schwelle ist eine runde Zahl, so wie sie in der Bedingung steht: Prozent und Prozentpunkte in Fünferschritten, darunter in halben Schritten (1,5 %, 3 Prozentpunkte); Tore in Vierteln, Elo in Zehnern. Gerundet wird in die Richtung, in der die Seltenheit hält.
- Ein Kürzel (`short`) ist ein ganzes Wort und passt gerendert in 54 px.
- Die Rohsicht liegt in der Engine (`_seasonTitleCtx`: `partien`, `tagGrp`, `wochGrp`, `partnerGrp`, `gegnerGrp`).
- Spieltage zählen erst, wenn sie zu sind (`_tagZu`): `tagGrp`, die letzte Partie eines Tages, die Tagesquoten und das Tagesende von „Auf dem Thron"; „Der Tagesregent" teilt durch diese Tage (`tagN`). Wochen bleiben offen gezählt — eine Woche geht Tage nach ihrer letzten Partie zu, und ihr Ende stünde in der Tafel eines anderen Tages.

- **Ein Beleg liest sich für jeden, der ihn trägt** — auch für den Nächsten unter der Schwelle und für jeden im Feld. Die Richtung steht im Wort (`_ppLage`, `_stRichtung`, `_stPlaetze`: „12 %-Punkte unter der Rechnung", „1 Platz zurück", „103 Elo hinter Leon auf Platz eins"), ein Wert unter null trägt das Minuszeichen (`_stElo`, `_ppZeichen`), bei eins steht die Einzahl. Der gewertete Wert steht nur dahinter, wenn er in der Einheit der Bedingung zu lesen ist (`_stEinheit`): nie unter null, ein Anteil nie über 100 %, und nicht bei einer Chronik, die logarithmisch misst.

## Stellen

`32-chronik-katalog.js` (`DISZIPLINEN`, `_stWertung`, `_stSoll`, `_stTorSteigung`, `_stErsterBall`, `_stVormonat`, `_stVormonatPlatz`, `_stLaufbahnVor`, `_stDuelleVor`, `_stDuellWende`, `_stPartnerTief`, `_stUnwahr`, `_stRivale`, `_stLangeTage`, `_stSpaeteRevanchen`, `_stPlatzwechsel`, `_stSiegeszug`, `CHRONIK_MIN_SPIELE`, `_stGleichesMass`, `_stEinheit`), `33-chronik-engine.js` (`_seasonTitleCtx`, das Ligamittel `L`, `zuWenig`), `35-chronik-ui.js`, `35b-prestige.js` (`chronikPunkte`, `chronikBonus`, `chronikUeber`, `chronikHalbierungenJeSigma`, `chronikSchattenGewicht`, `chronikUeberschattet`, `CHRONIK_GRUNDWERT`, `CHRONIK_BONUS_JE_HALBIERUNG`, `CHRONIK_SCHATTEN_FAKTOR`, `CHRONIK_SCHATTEN_MIN`), `27-news-generator.js` (Wechsel vom ersten Spieltag an).

## Prüfung

`tests/rechnen` zählt den laufenden Tag erst um 23:59; `tests/archiv` friert einen Monat der alten Fassung neu ein und sonst keinen; `tests/ambient` zieht Halterstand und Tafel an derselben Grenze in beide Richtungen, findet Chroniken vor dem fünften Spieltag und meldet die erste Chronik eines Monats als gewöhnlichen Wechsel, jeden Halter mit fünfzehn Partien, ohne eine Karte für das Aufgehen der Tafel; `tests/disziplinen` hält die Grenze von fünfzehn Partien (keine Chronik darunter, wer darunter bleibt, ist nicht gewertet und nicht „ohne Eintrag“, keine Bedingung nennt für den Monat weniger, eine Chronik schon am zweiten Spieltag), rechnet die Wertung nach der Stichprobe Wert für Wert nach und hält jede Chronik außer den Schwellen der Liga an 1,2 σ und an der Seltenheit (an `tests/fixtures/oktober.txt` in höchstens zwei von fünf Monaten vergeben), jede an der Spielzahl-Korrelation und den Meister jedes dieser Monate an mindestens einer positiven Chronik, die Überschattung (doppelt so weit und mindestens eine Streuung, nur besondere, nur derselbe Spieler, die Schattenseite in Matrix und Prestige, an den echten Partien mehrfach und bei mehr als einem Spieler), den unmöglichen Monat und die Punktlandung, die mehr bringen, je näher sie am Ziel liegen, die Klasse an der Leistung (legendär nur Können oder Konstanz ohne Wende, jede Wende selten, eine Schattenseite als `schatten`), den Grundwert 100 für jede Klasse, die Streuung jeder Chronik gegen die Fixture-Monate, den Bonus (71 % statt 60 % beim Tagesregenten bringen 126, je σ 24 bei 1,2 σ Ausschlag, 41 bei 2,5 σ und 54 bei 3,5 σ, gleich weit über der Schwelle mehr für die legendäre weit draußen als für die besondere nahe am Feld, mindestens 1, „höchstens“ in dieselbe Richtung, in der Regel zwischen 1 und 50) und den eingefrorenen Wert jedes Halters, zählt den Anteil der ersten drei gegen ihre Zahl unter den Gewerteten, rechnet „Der Sprung" und „Die Kletterpartie" aus den rohen Partien beider Monate nach, an allen fünf Monaten, den Sprung Wert für Wert, ebenso die acht Chroniken gegen das Eigene, deren sieben positive an mindestens fünf Spieler und höchstens zu einem Viertel an den Monatsersten gehen, und die acht gegen Ligamittel, Laufbahn davor und die Laufbahnfragen auf der Monatsachse mit ihren acht Haltungen, ebenso die Schattenseiten gegen das Eigene und den Anteil an den Partien mit ihren drei Haltungen, nicht alle bei den letzten drei eines Monats, die sieben der fünften Fassung Wert für Wert mit ihren zwei Haltungen, keine Chronik mehr als zweimal, und die neunzehn der sechsten Fassung Wert für Wert, liest jede Schwelle aus der Bedingung und verlangt eine runde Zahl, verwirft eine Chronik der alten Fassung und rechnet das Banner aus der Tafel jedes Monats nach (die jüngste positive Chronik); `tests/blatt` misst jedes Kürzel des Katalogs in der Zelle, die Farbe jeder Zelle nach ihrer Stufe, den Glanz nur auf Gold, die höchste Klasse des Monats als Farbe der Zelle auch über einem Eintrag niedrigerer Klasse, „+N", die Zahlen je Stufe unter dem Namen, das Band im Kopf und die Legende ohne Wert, die Zahlenreihe einer gehaltenen Chronik mit Grundwert, Bonus und Abstand zur Schwelle, den Abstand auch im Blatt einer Schattenseite und dort, was sie überschattet, ohne dass eine Zeile ihre Zelle verlässt, die Laufbahn mit Grundwert und Bonus, das Jahr jedes Monats im Kopf in seiner Spalte, und das Banner im Profilkopf: deckend, mit Naht, Falte, Lichthof und Entrollen.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Der alte
Monatskatalog maß fast überall das Können, und wer eine Quote gewinnt,
gewinnt fast jede. Er ist vollständig ersetzt durch Chroniken, die
nach der **Abweichung von der Erwartung** fragen, nach **Konstanz**, nach
dem **Verhältnis zum Ligamittel** desselben Monats, zu einem **bestimmten
anderen Spieler** oder nach einem **seltenen Einzelereignis**. Die
Liga-Rekorde der Ewigen Tafel sind davon unberührt; dreiundzwanzig Disziplinen tragen
beide Zeitachsen, weil dieselbe Frage auf zwei Zeitachsen in EINE Disziplin
gehört [§13.1] — sie sind in §C35 genannt.
**Das Tor sind fünfzehn Partien je Spieler, vom ersten Spieltag an.** Der
alte Katalog verlangte je Chronik 15, 20 oder 25 Partien, und damit hing die
Chronik an der Spielzahl statt an der Leistung. Danach galten acht Partien
je Spieler und für den ganzen Monat drei, später fünf Spieltage: vorher
hielt niemand etwas, und am fünften Spieltag ging die Tafel mit einer
eigenen Karte auf („Die Monatstafel ist offen"). Das hielt zwei Fehler. Wer
an einem Spieltag zwanzig Partien spielte, wartete bis zum fünften Tag des
Monats, obwohl sein Wert längst feststand. Und wer mit acht Partien kam,
holte mit den Ausreißern einer kleinen Stichprobe: über wenige Partien
streut jeder Anteil weiter, die Schwellen liegen draußen im Feld, und wer
wenig spielte, lag öfter jenseits und näher am Bonus. Jetzt hält eine
Chronik, wer fünfzehn eigene Partien hat, gleich an welchem Tag — an den
echten Partien gibt es am zweiten Spieltag eines Monats schon Halter, und
die erste Chronik eines Monats ist im Feed ein Wechsel wie jeder andere.
Wer darunter bleibt, ist nicht gewertet und steht nicht als „ohne Eintrag“
da. Die Besonderheit steckt weiter in der Schwelle, nicht im Tor; „ab 8
Partien" stand noch in elf Bedingungen und galt nicht mehr — eine Bedingung
nennt jetzt nur, was über die fünfzehn hinausgeht.
**Ein Wert zählt nach seiner Stichprobe.** Fünfzehn Partien allein machen
Viel- und Wenigspieler nicht gleich: wer zwanzig Partien spielt, erreicht
eine Quote von 80 % mit demselben Spiel weit öfter als wer hundert spielt,
und eine Abweichung über einen Monat zu halten ist schwerer als über drei
Spieltage. Gemessen streute derselbe Wert bei Spielern unter dreißig
Partien im Median 1,57-mal so weit wie bei Spielern mit vielen. Gewertet
wird deshalb `mitte + (roh − mitte) / √(echt + (1 − echt) · n0 / n)`: bei
der mittleren Stichprobe `n0` bleibt der Wert, darunter rückt er zur Mitte,
darüber weiter hinaus — so weit, wie der Zufall an der Streuung beteiligt
ist. Dieser Anteil (`1 − echt`) ist je Chronik an den echten Partien
geschätzt, aus `(roh − Lage)² = τ² + B/n`, die Lage als Gerade in ln n,
damit ein Wert, der mit der Spielzahl wandert, nicht als Streuung zählt.
Danach liegt das Verhältnis bei 1,10; mit Prestige aus der Chronik gehen
69 % der Spieler-Monate mit fünfzehn bis neunundzwanzig Partien aus, 81 %
mit dreißig bis neunundfünfzig und 92 % darüber, im Schnitt mit 124, 127
und 123 Punkten. Dass mehr Spieler-Monate mit vielen Partien etwas halten,
ist kein Vorteil im Wert, sondern mehr Gelegenheiten für Fragen nach einem
Tag oder einer Woche. Eine Wahrscheinlichkeit wird nicht gewertet: sie ist
für jede Zahl gleich schwer. Vier Beträge und Spannen auch nicht: bei ihnen
kehrte die Wertung die Abhängigkeit um („Der Wechselhafte“ von −0,22 auf
+0,68, „Favorit wie Außenseiter“ von −0,02 auf −0,58). Drei Abstände zu
einem Ziel rechnen schon selbst auf eine feste Zahl Partien hoch.
Jede `monat`-Wertung trägt drei feste Angaben. **`art`** ist
`koennen`, `konstanz`, `fuegung` oder `schatten` und sagt, wofür die Chronik
steht. **`klasse`** ist `legendaer`, `selten`, `besonders` oder `schatten` und
sagt, was die Chronik als Leistung bedeutet (unten, „Die Klasse sagt, was
eine Chronik bedeutet"). **`aus`** ist der Ausschlag der Schwelle:
wie weit sie vom Schnitt aller liegt, die in dieser Disziplin je gewertet
wurden, in Standardabweichungen.
**Die Klasse ist keine Volkszählung.** Sie stand einmal als Grenze für die
Häufigkeit hier — legendär einmal, selten zweimal, besonders dreimal in der
Ligageschichte —, und das wäre mit der Liga selbst falsch geworden: eine
legendäre Bedingung wird mit den Jahren zwangsläufig ein zweites und ein
drittes Mal erreicht und bleibt trotzdem legendär, weil sie keinen Deut
leichter geworden ist. „Auf dem Thron" gehört heute zwei Monaten und ist
legendär. Gedeckelt wird deshalb die **Rate** und für alle Klassen gleich:
in höchstens einem Drittel der gewerteten Monate (unten, sechste Fassung).
Und ob eine Chronik ihren Platz
verdient, entscheidet ihr Ausschlag, nicht ihre Häufigkeit — `tests/disziplinen`
hält jede an der 1,2-σ-Grenze. Ein Test gegen die heutige Häufigkeit je
Klasse war nicht einmal rot zu bekommen: eine einzelne falsch eingeordnete
Chronik verschiebt den Schnitt ihrer Klasse nicht genug.
**Den Wert trägt nicht die Klasse.** Sie trug ihn, 150, 100 und 50, und
damit brachte ein besonderer Monat ein Drittel eines legendären, auch wenn
sein Halter die Latte weit hinter sich ließ; wer sie gerade eben riss, bekam
dasselbe wie einer, der sie verdoppelte. Jetzt bringt jede Chronik außer
einer Schattenseite denselben Grundwert, 100: wer in einem Monat etwas
erreicht, wofür es eine Chronik gibt, wird dafür belohnt, auch wenn wenig
Können darin steckt. Die Klasse bleibt als Farbe und Name, sie sagt, wie
weit draußen die Latte hängt. Dazu kommt der **Bonus**: wie weit der Halter
die Schwelle überbietet, in Standardabweichungen der Chronik. Prozentpunkte,
Siege in Folge, Tore und Elo sind verschiedene Währungen; erst in σ lässt
sich sagen, ob elf Prozentpunkte über einer Quote mehr sind als drei Siege
über einer Serie. Jedes σ brachte 25, gleich wo die Schwelle lag, und eine
legendäre Chronik stand damit fast immer hinter einer seltenen oder
besonderen: weit draußen liegen ihre Halter selten weit darüber, und der
unmögliche Monat stand mit 101 da, einem Punkt über dem Grundwert. Weit
draußen ist aber
jeder Schritt seltener als nahe am Feld. Je σ bringt der Bonus deshalb zehn
Punkte für jede Halbierung, die der Anteil der Spieler-Monate an der Schwelle
erfährt (das Mills-Verhältnis φ/Q des Ausschlags durch ln 2): 24 bei 1,2 σ
Ausschlag, 41 bei 2,5 σ, 54 bei 3,5 σ. Er bleibt linear in der Abweichung,
und eine besondere Chronik mit viel davon steht weiter vor einer legendären
mit wenig. Die Seltenheit selbst als Bonus — die Halbierungen bis zum Wert
des Halters — wüchse im Quadrat und gäbe einem einzigen Monat weit draußen
über tausend Punkte. Gemessen an den echten Partien liegt der Bonus fast
immer zwischen 1 und 50. Genau auf der Schwelle gibt es
keinen, und wo die Schwelle schon das Höchste ist („Die Wochenkrone": jede
eigene Woche), auch nicht. Die Dämpfung ab der dritten Chronik bleibt, wie
sie ist [§C34].
Gerechnet wird mit **festgeschriebenen** Größen: der Schwelle `ab` und der
Streuung `streu`, beide einmal an den Daten gemessen. Eine Streuung, die mit
der Liga wandert, verschöbe das Prestige aller bisherigen Halter, sobald
neue Monate die Verteilung verschieben, und genau dieser Fehler steckte
schon einmal in den Auszeichnungen [§C34]. Der Wert des Halters dagegen
gehört seinem Monat und friert mit ihm ein (`awarded[].wert`);
ohne ihn brächte ein abgeschlossener Monat nur den Grundwert, und dieselbe
Chronik zählte nach dem Monatswechsel weniger als davor.
Art, Klasse und Ausschlag werden **einmal an den Daten geprüft und dann
festgeschrieben**, genau wie `BADGE_RARITY`.
Zwei Regeln räumen den Katalog, und beide sind gemessen: eine Chronik muss
ihre Schwelle **mindestens 1,2 σ** hinausschieben können, sonst liegt ihr
Bester kaum weiter draußen als der Durchschnitt; und ihr Wert darf **nicht
an der Spielzahl hängen** — höchstens 0,35 Korrelation. Die zweite nimmt am
meisten weg: „wie viele verschiedene Ergebnisse" liegt bei −0,91, weil wer
zwölf Partien spielt zwangsläufig zwölf verschiedene Ergebnisse hat, und
„der unwahrscheinlichste Spieltag" bei +0,56, weil acht Partien an einem Tag
weiter ausschlagen können als vier. Sie muss außerdem eine
**Leistung** messen — Breite und Anwesenheit zählen nicht, „mit wie vielen
anderen jemand gespielt hat" ist ein Kalender. Reine **Zählungen von
Gelegenheiten** fallen ebenfalls weg: wer mehr spielt, bekommt mehr Chancen
auf ein 10:0 oder eine lange Serie. Die Anteilsformen derselben Fragen
bleiben.
Drei Schwellen sind **vorgegeben und werden nicht kalibriert**: „Der
Tagesregent" verlangt Player of the Day an 60 % der eigenen Spieltage, „Die
Wochenkrone" Player of the Week in JEDER eigenen Woche, „Auf dem Thron" den
zweiten Platz der Liga an jedem Spieltag des Monats. Player of the Week
kommt dabei aus `_periodWinnerMap`, damit Chronik und Auszeichnung nicht
auseinanderlaufen [§C27]; die Tabelle kommt aus der Elo-Bahn von
`getGlobalSim` (`_thronDerLiga`), aus demselben Grund — selbst aus den
Deltas aufsummiert nennt eine zweite Rechnung irgendwann einen anderen
Ersten als der Liga-Tab, weil die Simulation die Elo an jeder Monatsgrenze
zurückdreht.
**„Auf dem Thron" zählt jeden Spieltag des Monats, auch einen ohne eigene
Partie.** Die Tabelle fragt nicht, wer dabei war, und wer aussetzt, kann
überholt werden — damit hängt die Wertung nicht an der Zahl der eigenen
Auftritte. Vor der ersten eigenen Partie des Monats steht niemand in der
Monatstabelle; solche Tage zählen nicht mit, sonst trüge jeder, der später
einsteigt, von vornherein den schlechtesten Platz. Sie ist die Chronik für
den, der nie ausschlägt und trotzdem jeden Monat oben steht: gemessen ist
Leons August in keiner einzigen Rate der Liga die Nummer eins — 90 Partien
ziehen jede Rate zur Mitte —, und die Tabelle hat er trotzdem nie aus der
Hand gegeben. Zwei Monate erfüllen sie (Leon im August, Martin im Juni),
und sie ist trotzdem legendär: die Klasse zählt keine Halter.

**Im Profilkopf steht der Spielertyp, nicht die Wertung** (`monat.beiname`,
`chronBeiname`). Die Pille unter dem Namen trug den Katalognamen, und
„Der Endspurt" liest sich dort wie eine Überschrift statt wie eine
Beschreibung — „Der Ausdauernde" schon. Überall sonst bleibt der
Katalogname: in der Matrix, auf der Plakette, im Blatt und in der Nachricht
geht es um die Wertung, im Profilkopf um den Menschen. Dort steht er als
Banner und nicht mehr als Pille: die laufende Chronik trug eine gestrichelte
Kante, und die sah aus wie ein Knopf, der noch lädt — für einen Beinamen,
der ein Titel ist, das falsche Bild. Dass der Monat noch läuft, sagt die
Zeile darunter ohnehin. Flach und mit Enden in der Farbe des Bands las es
sich trotzdem als Schild; die Falte, der Lichthof und das Entrollen machen
es zum Titel. Die Tönung allein war durchscheinend, und durch das Band sah
man den Kopf des Profils in seiner Rangfarbe — Glas statt Stoff. Darunter
liegt deshalb ein deckender Grund aus dunklem Gold.
**Im Banner steht nur, was ein Titel ist.** Es zeigte den Eintrag des
laufenden oder letzten Monats, auch eine Schattenseite, rot: Jannik trug im
August „Der Durchlässige" (Das Scheunentor) statt „Der Zugeknöpfte" aus dem
Juni, und wer einen schlechten Monat hatte, verlor damit den Titel eines
guten. Jetzt bleibt der letzte positive Beiname stehen, bis ein neuerer
Monat einen positiven bringt. Ein eingefrorener
Monat kann eine Chronik tragen, die es nicht mehr gibt; dann bleibt der
gespeicherte Name.
**Das Blatt der Wertung nennt ihn trotzdem** (`.chron-kose`): dort steht,
wie ihr Halter im Profil heißt. Fünfzehn Wertungen hießen im Profil genauso
wie in der Matrix — „Der Ausreißer", „Der Zerstörer", „Der Spielverderber",
„Der Beidfüßige" —, und wer eine davon hielt, trug im Profilkopf den Namen
einer Wertung statt eines Spielertyps; im Blatt fiel der Beiname dort weg.
Jetzt hat jede einen eigenen („Der Senkrechtstarter", „Der Kantersieger",
„Der Gipfelstürmer", „Der Vielseitige"). Sonst war der Beiname nirgends neben seiner
Wertung zu sehen — „Der Nervenkitzel" macht seinen Träger zum
„Dauerzitterer", und wer das Blatt öffnete, erfuhr davon nichts. Er sitzt
im Kopf des Blatts auf einer eigenen Zeile, nicht in der Zahlenreihe
darunter: die trägt die vier Angaben, die den Wert der Chronik bestimmen,
und ein Name ist keine davon. Metall, kein Gold — er zeichnet niemanden
aus [§C25].

**Die Klasse ist zu sehen, nicht nur zu berechnen.** Von den vier Angaben,
die den Wert einer Chronik bestimmen, stand keine einzige in der App: wer
ein Chronik-Blatt öffnete, sah die Bedingung und sonst nichts. Jetzt trägt
die Zelle der Matrix und die des Profilstreifens die Klasse als Farbe
(`data-kl`, `chronikTon`, unten: „Die Klasse ist Farbe"), die Plakette nennt sie in Worten
(`CHRONIK_KLASSE_NAME`, Metall — sie zeichnet niemanden aus), und das
Chronik-Blatt zeigt Klasse, Art, Ausschlag und Prestige als Zahlenreihe —
`rcpZahlenHtml`, das Bauteil der Rückblicke [§C27]. In der Laufbahn stand
neben einem Monatseintrag „Leistung", die Art der DISZIPLIN; den Wert trägt
`monat.art`, also steht dort jetzt „Konstanz" oder „Können".
**Die Zelle trägt die höchste Klasse des Monats.** Seit der Bonus
entscheidet, welcher Eintrag zählt, schlägt eine besondere Chronik eine
legendäre, wenn ihr Halter die Schwelle weiter überbietet. Mit der Farbe
ihrer eigenen Klasse stand dann ein grauer Monat in der Matrix, in dem
jemand eine goldene hielt. Gezeigt wird der Eintrag, der zählt, in der
Farbe der höchsten Klasse, die der Spieler im Monat hält.
**Die Zeilen der Matrix ordnet das Prestige ihrer Zellen**, dann die Zahl
der Einträge, dann der Name. Gezählt wird je Monat der Eintrag, der in der
Zelle steht und fürs Prestige zählt. Vorher zählte jeder Eintrag eines
Monats mit; seit jede Chronik denselben Grundwert bringt, war das nur noch
ihre Zahl, und neun Einträge in einem Monat standen über drei Monaten mit
je einem.
**Die Matrix steht in einer Karte und sagt mehr als ihre Zellen**
(`_lchronTabelle`). Der Kopf jeder Spalte nennt unter dem Monat die Zahl
seiner Einträge und zeigt als schmales Band, wie sie sich auf die Stufen
verteilen; die laufende Spalte ist getönt. Unter dem Namen steht je Stufe,
wie viele Zellen der Zeile sie tragen — „5 Einträge" sagte nicht, welche.
Eine Zelle nennt in der Ecke, wie viele Einträge ihr Spieler im selben
Monat daneben hält („+2"): die Matrix zeigt je Monat einen, und dass Martin
im August neun hielt, stand nirgends. Die Legende zeigt die vier Stufen mit
ihrem Wert und die gestrichelte Kante ohne einen Satz dazu. Ein Strich heißt gewertet ohne
Eintrag, eine leere Zelle nicht gewertet: vorher stand in beiden Fällen
derselbe Strich, und wer einen Monat ausgesetzt hatte, sah aus wie einer,
der leer ausging. Die Ruheständler stehen in einer Karte am Ende, zu
(`ruhe_chronik`, `ruhestandChronikHtml`) [§C40]: in der Matrix der aktiven
Liga standen sie zwischen denen, die um die nächste Chronik spielen.
**Ein Kürzel ist ein ganzes Wort und passt in die Zelle.** Fünf endeten auf
einem Punkt („Punktland.", „Angstgegn."), drei liefen über die 54 px der
Zelle. Gezählt wird dafür nicht in Zeichen — „Umschwung" ist kürzer als
„Nachzügler" und breiter —, sondern die gerenderte Breite in `tests/blatt`;
`scrollWidth` taugt nicht, er rundet auf ganze Pixel, und „Augenhöhe" ragte
um ein Viertel Pixel heraus. Gemessen wird jedes Kürzel des Katalogs, nicht
nur, was die Matrix gerade zeigt: „Wochenkron" und „Traummonat" liefen über,
fielen aber nicht auf, weil sie in den Fixture-Monaten niemand hielt — heute
heißen sie „Krone" und „Traumlauf".
**Die Rohsicht liegt in der Engine.** `_seasonTitleCtx` legt je Spieler
`partien` an (jede Partie aus seiner Sicht, in Spielreihenfolge) und daraus
`tagGrp`, `wochGrp`, `partnerGrp`, `gegnerGrp`. Die Chroniken fragen nach
dem schwächsten Spieltag, der schwächsten Woche, dem unangenehmsten Gegner;
solche Fragen lassen sich nicht in vierzig Zähler auflösen, ohne für jede
neue Frage einen neuen Zähler zu erfinden.

**Eine feste Latte erreicht nur der Stärkste.** Fünf Können-Chroniken
fragten trotz der Regel oben nach dem Niveau: zwei Tore Differenz je Partie
(„Der Deutliche"), gegen jeden regelmäßigen Gegner mehr Siege als
Niederlagen („Kein Angstgegner"), 85 % der ersten und 75 % der letzten
Partien eines Spieltags („Der Kaltstart", „Der Endspurt"), jeder Spieltag
nicht negativ („Der Tagesabschluss"). Gemessen gingen damit 42 % aller
Einträge der Fixture-Monate an die ersten drei der Monatstabelle, bei
zwölf Spielern wären es nach ihrem Anteil 25 %, und „Kein Angstgegner"
korrelierte mit 0,42 mit der Spielzahl. Jetzt messen sie gegen die
Elo-Erwartung — die erwarteten Siege je Gegner und je Spieltag, die
Tordifferenz, die die Siegchance erwarten ließ (die Steigung aus den
Partien des Monats selbst) — oder gegen den eigenen Rest: die erste Partie
eines Spieltags gegen die übrigen, wie ihr Gegenstück „Der letzte Ball".
„Der Deutliche" ging damit an Johannes auf Platz elf und Leon auf Platz
sechs, und der Anteil der ersten drei sank auf 35 %. Schwellen und
Ausschlag sind über alle fünf Monate der Liga gemessen.

**Der Vormonat ist ein Maßstab.** „Der Sprung" verlangt eine Siegquote
25 Prozentpunkte über der des Vormonats, „Die Kletterpartie" fünf Plätze
weiter vorn in der Monatstabelle, beide ab acht Partien im Vormonat und
den fünfzehn im Monat selbst. Wer im Vormonat schwach war, hat mehr Raum nach oben, und wer
ganz oben steht, kann kaum noch steigen: beide belohnen die Verbesserung
und nicht das Niveau. Als Erster hielt beide Johannes, im Juli auf Platz
sieben der Tabelle.


**Die Klasse ist Farbe.** Die Zelle trug den Ton ihrer Disziplin
und die Klasse nur als Stärke derselben Farbe, und der Wert rechnete aus
Sockel, Art × Ausschlag und einem kleinen Zuschlag der Klasse: alle lagen
zwischen 90 und 190, „Der Kontrast" (legendär) brachte 95 und „Die weiße
Weste" (besonders) 110, und eine goldene Zelle konnte weniger wert sein als
eine blasse. Danach folgte die Klasse dem Ausschlag der Schwelle, und an der
Farbe las man ab, wie weit draußen die Latte hing; heute sagt sie, was die
Chronik bedeutet (unten). Eine Zeit lang war die Farbe auch der
Wert, Gold 150, Lila 100, Metall 50, und eine Fügung zählte zuerst halb wie
bei den Rekorden [§C35]; eine besondere brachte 25 — „Der Aufdreher" mit
45 % aller Partien eines Monats statt 11 % stand damit unter der kleinsten
Auszeichnung, die sich wiederholt. Seitdem zählt die Art nicht mehr, und
seit dem Grundwert mit Bonus (oben) auch die Klasse nicht. Je Monat steht und zählt der
wertvollste Eintrag; vorher war es der erste im Katalog, und der ordnet nach
Art und Ausschlag, nicht nach Wert.
**Acht Chroniken fragen nach dem Eigenen.** In den Fixture-Monaten gingen 21
bis 28 Einträge an neun oder zehn Spieler, und die Mitte des Feldes fand
sich in keiner Wertung wieder, die nach ihr fragte. „Der Knipser" und „Der
Riegel" stellen vorne und hinten gegen das eigene Mittel, „Neuland" die
Partien neben neuen Partnern, „Die Revanche" die zweite Partie gegen
dieselben Gegner am selben Tag, „Das Nachlegen" die Partie nach einem Sieg,
„Die Lernkurve" die späteren Duelle gegen dieselben Gegner gegen die
früheren, „Der Spielverderber" die Partien gegen die beiden Ersten — alle
gegen die Rechnung, nicht gegen eine feste Latte; „Der Absturz" ist das
Gegenstück zum Sprung. Ihre Schwellen schieben sich nur 1,2 bis 2,2 σ
hinaus: sechs sind besonders und tragen Metall und 50, „Die Lernkurve" ist
mit 2,17 σ selten. Die Untergrenze liegt deshalb bei 1,2 σ statt 1,5 σ —
über ihr steht der Beste immer noch deutlich außerhalb des Schnitts, und nur
einer je Monat hält sie. Gemessen gehen die sieben positiven in den
Fixture-Monaten neunmal an Alex, Jannik, Jane, Julian, Johannes und Martin,
einmal an den Monatsersten (Martin im August). Mit ihnen bekam der Katalog eine neue Fassung
(`SEASON_TITLES_FREEZE_V`): jeder abgeschlossene Monat wird einmal neu
gerechnet und eingefroren, damit alle Spalten der Matrix dieselben Fragen
stellen. Die dritte Fassung kam mit acht weiteren: vier gegen das
Ligamittel oder die eigene Laufbahn davor („Klare Verhältnisse",
„Der Rollentausch", „Der Ausnahmemonat" und der Widerstand im Monat) und
vier Laufbahnfragen auf der Monatsachse (die ruhige Hand, der Zerstörer,
der schwerste Tag, der Wackelkandidat). Gemessen gehen sie in den
Fixture-Monaten fünfzehnmal an sieben Spieler, und ihr Wert hängt höchstens
mit 0,23 an der Spielzahl. Ein Verhältnis aus 10:0 gegen 0:10 ging nicht:
in 466 Partien endeten acht so, kein Monat hat dafür eine Stichprobe;
„Der Zerstörer" fragt deshalb nach Siegen mit sieben Toren Vorsprung.
Verworfen wurde auch „Der Spätzünder" (Spieltage, die mit einer Niederlage
beginnen und mit einem Sieg enden): dieselbe Frage stellt schon „Die zweite
Luft". Zur selben Fassung gehören neun Schattenseiten, sieben davon
Gegenstücke bestehender Chroniken („Der Fehlstart" zum Kaltstart, „Der
Kräfteverfall" zur zweiten Luft, „Der Einbruch" zur Steigerung, „Die
Sattheit" zum Nachlegen, „Die Ehrfurcht" zum Spielverderber, „Der Rückfall"
zur Lernkurve, „Die stumme Antwort" im Monat zur Antwort) und „Die schwarze
Woche", dazu der Anteil an den Partien in beide Richtungen („Der
Aufdreher", „Der Rückzug"). Die Zahl der Partien gegen den Vormonat hing
mit 0,63 an der Spielzahl, weil die Liga im Juni ein Vielfaches des Mai
spielte; der Anteil an den Partien hängt mit −0,02 daran. Verworfen wurden
die verpatzte Revanche (dieselben zwei Spieler wie anderswo), „Der
Lieblingsgegner" (0,54 an der Spielzahl) und der unwahrscheinlichste Sieg
im Monat (0,45).

**Die fünfte Fassung fragt nach Wendepunkten.** Sieben weitere Chroniken,
gemessen an allen Monaten der Liga, nicht nur an den Fixtures. Vier
vergleichen mit der eigenen Laufbahn oder mit einem Gegenüber: „Der
Bannbrecher" schlägt den Gegner, gegen den die Laufbahn davor am
schlechtesten lief, um mindestens 25 Prozentpunkte besser als davor,
„Die Retourkutsche" ist das Gegenstück gegen den liebsten Gegner, „Das
Zielwasser" trifft im Sturm mindestens 0,75 Tore je Partie mehr als in den
Sturmspielen davor, „Die Stütze" gewinnt neben einem Partner, der die zwei
Partien davor verloren hatte, über die Rechnung hinaus — die zwei Partien
zählen über die Monatsgrenze hinweg, denn wer am Ersten aus zwei Pleiten
des Vormonats kommt, ist nicht weniger angeschlagen. Drei sind
Schattenseiten bestehender Gegenstücke: „Die weichen Knie" bekommen zum Rekord die Monatsachse (80 %
der Partien mit einem Tor Unterschied verloren), „Der Abgesang" ist die
Kehrseite des letzten Balls, „Das Fremdeln" die von „Neuland". Bannbrecher
und Retourkutsche wählen den Gegner aus der Laufbahn davor: wählte der
Monat ihn aus, gewönne die Chronik immer der, der gegen irgendwen einmal
ausreißt, und das ist bei vier Duellen jeder. Gemessen hängt keine der
sieben mit mehr als 0,19 an der Spielzahl, und an den echten Partien gehen
sie in fünf Monaten elfmal an fünf Spieler. Verworfen wurden der
Manndecker und der Knacker (Gegentore gegen einen Stürmer unter dessen
Schnitt, Tore gegen einen Verteidiger darüber: 0,72 und 0,69 mit der
Siegquote, der Manndecker −0,94 mit „Das Scheunentor"), „Der Klotz am Bein" (der Partner
gewinnt ohne ihn mehr: −0,97 mit der Siegquote, eine zweite Siegquote),
„Der Phönix" (der Aufstieg vom Elo-Tief des Monats: 0,70 an der
Spielzahl), der Sprenger und der Pflichtsieg (gegen eingespielte Duos und
gegen die beiden Letzten: 0,90 und 0,60 mit „Das Übersoll", dieselbe
Frage noch einmal) und das Spiel auf der Nebenposition (vier Werte in fünf
Monaten, keine Stichprobe). Mit der fünften Fassung wird jeder
abgeschlossene Monat noch einmal gerechnet und eingefroren.

**Die sechste Fassung macht die Chronik selten und gerecht für den, der
viel spielt.** Drei Dinge waren falsch, alle an den echten Partien von Juni
bis Oktober gemessen. Erstens war die Grenze der Seltenheit keine mehr: sie
hieß „nicht mehr Halter als Monate", und „Der Spielverderber" ging in allen
fünf Monaten an jemanden, „Die Steigerung", „Der Rollentausch" und „Die
Sattheit" in vier, achtzehn weitere in drei. Was fast
jeder Monat hergibt, ist keine Besonderheit. Jetzt geht eine Chronik in
höchstens einem Drittel der Monate an jemanden; dafür stiegen
dreiundzwanzig Schwellen (vom Spielverderber mit 15 statt 6 Prozentpunkten
bis zur Durststrecke mit 12 statt 11 Pleiten), „Kein Angstgegner" verlangt
acht regelmäßige Gegner statt vier und „Der Angstgegner" zehn Duelle statt
acht, und wo eine Schwelle stieg, stieg mit ihr der Ausschlag. Zweitens bekam, wer viel spielt, kaum eine
Chronik: wer im Monat achtzig Partien und mehr spielte, hielt im Schnitt
eine positive, alle anderen drei (r = −0,30 zwischen Spielzahl und
positiven Einträgen). Die Schwellen fragen nach Abständen, und ein Abstand
über zehn Partien schwankt so weit, dass ihn der Zufall reißt; über hundert
reißt ihn nur, wer wirklich anders spielt. Drittens hielt Leon im Juni als
Meister mit 131 Partien und 103 Elo Vorsprung keine einzige Chronik.
Dazu kamen neunzehn neue, sechs davon nach einer Wahrscheinlichkeit
(`_stUnwahr`): „Die Favoritenrolle" (als Favorit, höchstens 2 %), „Der
Siegeszug" (die unwahrscheinlichste Serie, mal der Zahl der Partien, sonst
hätte mehr Anläufe, wer mehr spielt), „Das Stammduell" und „Die Übermacht"
(gegen den häufigsten Gegner des Monats, 10 % und 2 %), „Der lange Atem"
(an Tagen mit sieben Partien, 2 %) und „Der Tag zum Vergessen" (das
Gegenstück zum Ausreißer). Gegen die eigene Laufbahn fragen „Der
Abwehrwall", „Das Leck" und „Der Aufbauspieler" (die Abwehr, wie das
Zielwasser den Sturm), „Die Torflaute" und „Der Abschwung" auf der
Monatsachse; „Die Torgefahr" stellt den Sturm gegen das Ligamittel, „Die
späte Revanche" das Wiedersehen nach einer Nacht gegen die Rechnung, „Der
Platztausch" und „Das Festhalten" den Positionswechsel gegen das Bleiben;
„Der Abrutsch", „Die Klatsche" und „Das Strohfeuer" sind Gegenstücke der
Kletterpartie, des Zerstörers und des Nachzüglers, und „Der Souverän" fragt
nach dem Vorsprung an der Spitze. Leon hält im Juni jetzt zwei (Souverän,
Stammduell). Die Vielspieler holen kaum auf — achtzig Partien und mehr
bringen im Schnitt 1,1 positive statt 1,0 —, denn
wer viel spielt und genau so spielt, wie die Rechnung erwartet, ist in
keinem Monat besonders. Verworfen wurde, was eine bestehende Frage
wiederholte, gemessen an der Korrelation mit ihr: der Teamspieler (0,85
mit dem Übersoll), der Kronprinz neben den beiden Ersten (0,76 mit dem
Schattenmann), der Bremsklotz (0,79), der Wochentakt (0,82 mit „Ohne
schwache Woche"), jede Woche über der Rechnung (0,87 mit dem
Tagesabschluss), ohne Minus im Monat (0,85 mit dem Traummonat), das
Drehbuch der Favoriten (−0,83 mit „Favorit wie Außenseiter") und das Pendel
aus Sieg und Niederlage (−0,85 mit der stummen Antwort); was an der
Spielzahl hing: die Blamage als Favorit (0,48), die längste Serie ohne
Rechnung (0,41) und der Sonntagsschuss im Monat (0,45 in den
Fixture-Monaten); und was keine Besonderheit ist: das Zugpferd neben
schwächeren Partnern und der Blitzstart in den Monat erreichten als
Bestes eines Monats nur 14 bis 30 % Wahrscheinlichkeit.

**Eine Schwelle ist rund.** Die Kalibrierung lieferte Schwellen wie 82 %,
33 Prozentpunkte, 0,65 Tore oder 4 %, und so standen sie in der Bedingung.
Eine krumme Zahl merkt sich niemand, und sie liest sich, als sei sie auf
einen bestimmten Halter zugeschnitten. Jetzt stehen Prozent und
Prozentpunkte in Fünferschritten, kleine Wahrscheinlichkeiten bei 2, 1 oder
0,5 %, Tore in Vierteln und Elo in Zehnern; dreiunddreißig Schwellen wurden
gerundet, jede in die Richtung, in der die Chronik in höchstens zwei von
fünf Monaten vergeben bleibt und ihren Ausschlag von 1,2 σ behält. Meist
war das nach oben: „Die weiße Weste" verlangt 15 statt 11 %, „Die Antwort"
85 statt 82 %, „Neuland" 20 statt 17 Prozentpunkte. Nach unten ging es, wo
die Seltenheit trotzdem hielt: „Der Staffellauf" mit 30 statt 32, „Der
Endspurt" mit 20 statt 22 Prozentpunkten. Die Fragen nach einer
Wahrscheinlichkeit stehen alle bei 2 %: mit 5 % wären „Der Ausreißer", „Der
lange Atem", „Die Favoritenrolle", „Die Übermacht" und „Der Siegeszug" in
drei oder vier von fünf Monaten vergeben worden, und „Der Tag zum
Vergessen" folgt dem Ausreißer als dessen Gegenstück. Leon verliert damit
den langen Atem im Juni.

**Die Klasse sagt, was eine Chronik bedeutet.** Sie folgte dem Ausschlag
der Schwelle, und das maß nur, wie selten etwas ist: „Der Ausbruch", „Die
Lieblingszahl", „Der Torhagel" und „Der Nervenkitzel" waren legendär, „Der
Souverän" besonders — eine Fügung, die selten vorkommt, stand golden über
dem Monat, den jemand mit hundert Elo Vorsprung gewann. Und „Der Ausbruch"
zeigt zuerst fünfzehn verlorene Duelle in Folge, bevor er zeigt, dass die
Serie riss. Jetzt ist legendär nur, was einen ganzen Monat als Leistung
auszeichnet: „Die Wochenkrone", „Der Tagesregent", „Auf dem Thron", „Der
Souverän", „Der Traummonat", „Der Unmögliche Monat", „Ohne Angstgegner" und
„Der makellose Tag". Selten sind die Leistungen über den ganzen Monat, die
nicht die Spitze verlangen („Das Übersoll", „Der Ausnahmemonat", „Kein
Angstgegner", „Ohne Schwachstelle", die Konstanz über alle Tage und Wochen),
die Würfe gegen die Rechnung in einem Zug („Der Siegeszug", „Die Woche
gegen die Rechnung", „Der Ausreißer", „Der lange Atem", „Die
Favoritenrolle", „Das Stammduell"), die Siege gegen die Stärksten („Der
Spielverderber", „Der Favoritenschreck", „Der Serienbrecher"), „Der
Zitterkönig" als Fügung, die drei von vier Siegen des Monats betrifft — und
die fünfzehn
Wenden, vom Ausbruch über den Sprung und die Kletterpartie bis zur
Revanche. Eine Wende ist mehr als ein Muster, weil sie etwas überwindet,
und weniger als ein Monat ohne Schwäche, weil sie die Schwäche zuerst
zeigt. Alles andere ist besonders: Muster in einem Ausschnitt der eigenen
Partien und die übrigen Fügungen. Eine Schattenseite trug ebenfalls eine
Klasse, und im Blatt stand „Das Fass ohne Boden" als legendär; sie ist
keine Leistung und bringt nichts, und dort steht jetzt „Schattenseite".
Neununddreißig positive Chroniken wechselten dabei ihre Klasse. Prüfbar
sind die Grenzen, nicht das Urteil dazwischen: `tests/disziplinen` fällt,
wenn eine Fügung oder eine Wende legendär wird, eine Wende nicht selten ist
oder eine Schattenseite eine Wertklasse trägt.

**Die Liga setzt sechsundzwanzig Schwellen selbst.** Die Schwellen waren an
den Partien geeicht: jede so, dass ihre Chronik in höchstens zwei von fünf
Monaten vergeben wird und mindestens 1,2 σ vom Schnitt liegt. Die Liga hat
sechsundzwanzig davon anders festgelegt, meist niedriger — „Der Traummonat"
ab 75 %, „Die Punktlandung" mit höchstens 20 Toren Differenz, „Die
Durststrecke" ab zehn Niederlagen, „Die Wochenkrone" in zwei Dritteln der
Wochen, gezählt ab fünf Partien je Woche —, „Der Zitterkönig" höher, ab zehn
Siegen. Eine solche Schwelle ist eine Ansage wie der Tagesregent und wird
nicht nachgeeicht: an den Partien bis Ende Oktober geht „Der Beidfüßige" in
allen fünf Monaten an jemanden, sechs weitere in vier, „Der Zitterkönig" in
keinem, und acht liegen weniger als 1,2 σ vom Schnitt. `tests/disziplinen`
nennt sie in `_LIGA_SETZT` und hält alle übrigen an beiden Regeln; ihr
Ausschlag ist an denselben Partien neu gemessen, damit das Blatt stimmt.

**Eine Chronik mit „höchstens" bringt mehr, je näher sie am Ziel liegt.**
„Der Unmögliche Monat" rechnete mit eins minus der Wahrscheinlichkeit, und
zwischen 2 % und einem Tausendstel lagen damit 0,02 — ein Zwanzigstel seiner
Streuung. Martin bekam für einen Monat, den die Rechnung mit 1 % erwartet
hatte, einen Punkt Bonus, und kein Monat konnte mehr als vier bringen. Er
rechnet jetzt wie jede Frage nach der Rechnung mit dem Zehnerlogarithmus
(`_stUnwahr`): ein zehnmal unwahrscheinlicherer Monat ist um eine Stufe
weiter vorn. „Die Punktlandung" stellte ein 212:212 einem 212:211 gleich,
weil sie mindestens ein Tor Abstand rechnete; die Untergrenze ist jetzt ein
halbes. Und wo der Abstand unter einem Prozentpunkt liegt („Der
Erwartungstreue", „Der Beidfüßige"), stand „50 % gespielt, 50 % erwartet"
neben einem Bonus, der aus 0,3 Prozentpunkten kam; der Beleg nennt den
Abstand jetzt mit einer Stelle. In der Laufbahn stand „für 0,45 σ über der
Schwelle" — bei einer Punktlandung las sich das, als brächte mehr Abstand
mehr Bonus; dort steht jetzt „weiter als verlangt".

**Die Schattenseite überschattet eine besondere Chronik.** Wer im Monat
viele Schattenseiten sammelte, fand trotzdem fast immer eine besondere
Chronik, ein Muster in einem Ausschnitt der eigenen Partien, und bekam
dafür hundert Punkte — oft genau an ihrer Schwelle, neben einer
Schattenseite weit über ihrer. Gewogen wird in derselben Einheit wie der
Bonus: wie weit jede über ihre Schwelle hinausgeht, in σ ihrer eigenen
Streuung. Eine besondere Chronik zählt nicht, wenn eine Schattenseite
desselben Spielers im selben Monat mindestens doppelt so weit hinausgeht und
mindestens eine Streuung weit — in Punkten: die Schattenseite wiegt
mindestens doppelt so schwer wie der Bonus und mindestens 25. Die
Mindestweite steht da, damit eine Schattenseite knapp an ihrer Schwelle
nicht eine besondere knapp an ihrer löscht; gleich viel ist nicht doppelt
so schlecht. Gemessen am Abstand zum Schnitt statt zur Schwelle
(„doppelt so weit vom Üblichen") griff die Regel an den echten Partien
viermal, so wie sie steht elfmal, bei fünf Spielern. Henry im Juli und Jane
im Oktober bleiben ohne Prestige aus der Chronik; Stefan verliert im Juli
„Die ruhige Hand" an „Das Fass ohne Boden" und behält „Den
Ausbruch" — eine seltene Chronik überschattet nichts, sie ist eine
Leistung über den ganzen Monat. Das Blatt einer Schattenseite zeigte
zuerst nur den Ausschlag ihrer Schwelle, „Der Pechvogel" mit 1,54 σ, und
nicht, wie weit Leon darüber lag — genau die Zahl, nach der sich die
Überschattung entscheidet. Sie steht jetzt darunter wie bei einer
positiven Chronik, und was dabei überschattet wird, steht in beiden
Blättern. Ihr Kopf stand dabei in Gold statt in Rot (das Blatt fragte ein
Feld, das es am Eintrag der Saison nicht gibt), und „Schattenseite" stand
als Klasse und als Art zweimal nebeneinander; die Art fällt weg, wenn sie
wie die Klasse heißt.

**Ein Beleg für jeden, der ihn trägt.** Die Vorlagen der Belege waren für
den Halter geschrieben, dessen Wert über der Schwelle liegt. Unter „Am
nächsten dran" und im Feld ist der Wert oft kleiner als null, und dort
stand „-32 %-Punkte öfter gewonnen als Außenseiter", „-103 Elo vor Leon auf
Platz zwei", „von Platz 1 auf Platz 2 · -1 Plätze" und „67 % in 3
Schlussspielen, 60 % davor · gewertet −4 Prozentpunkte". Dazu kamen „1
Tage", „1 Spieltage in Folge" und „1 Siege mit einem Tor Unterschied in
Folge" in den Ranglisten der Rekorde, „-262 Elo" beim Sturzflug, „gewertet
106 %" bei fünf von fünf gewonnenen Wochenabschlüssen und „gewertet 194
Prozentpunkte" bei „Ohne schwache Woche", deren Wert ein Logarithmus ist.
