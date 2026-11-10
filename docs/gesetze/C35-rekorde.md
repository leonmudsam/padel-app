# §C35 Nicht jeder Eintrag darf am Können hängen

## Regel

- Zweiundsechzig Liga-Rekorde in fünf Kammern (8 Bestmarken, 16 Können, 6 Aktuelle Form, 17 Fügungen, 15 Schattenseiten), in dieser Reihenfolge in Leiste und Liste (`CHRON_KINDS.ord`). Die Kammer steht am Eintrag (`allzeit.kammer`), nicht aus `art` erraten.
- Die Siegquote zählt einmal. Nach dem Niveau fragen nur der beste Monat, der höchste Gipfel, die längste Siegesserie, die Form von jetzt und die beiden Positionen (`NIVEAU` in `tests/disziplinen`); jeder andere Rekord mit dem Grundwert des Könnens (100) fragt nach dem Abstand zum Eigenen [§C38], nach einer Teilmenge oder nach einer Folge und folgt der Siegquote gemessen mit r unter 0,75.
- Die Karte nennt Zeitraum, Grundwert und Mindestbasis (`zeitraum`, `basis`, `mind`) und zeigt, wie weit der Halter vorn liegt (`_rekFeldHtml`, aus `chronicleRang`); der Kopf jeder Kammer sagt in einem Satz, was sie misst (`CHRON_KINDS.satz`). Kein Text beschreibt die App oder eine frühere Rechnung.
- Ein Rekord hat keine Wertlatte, nur eine Stichprobe (Partien, Spieltage, Wochen, Niederlagen). Was ein Wert von sich aus braucht (erstes Glied, zwei Partien, eine Richtung, die sein Name verspricht: Sprung, Vorsprung, Aufschwung), bleibt; eine Teilmenge, die beschreibt, welche Partien zählen, ist keine Latte. Ein Abstand, der auf null rundet, ist keine Richtung.
- Was einen ganzen Spieltag beschreibt (der makellose Tag, Kaltstart und Tagesabschluss, der Glanztag, die Fügungen eines Abends), zählt nur Tage, die für den gefragten Stand zu sind (`_tagZu`); ein laufender Tag hat noch keine letzte Partie und keine Tagesquote.
- Aktuelle Form ist ein festes Endfenster der letzten 20, 25, 40 oder 50 eigenen Partien, nie der beste Abschnitt; kein Fenster ist kürzer als zwanzig Partien. „Der Lauf" zählt die letzten 40, „Der Höhenflug" vergleicht die letzten 20 mit den 20 davor. Ein gleitendes Fenster (`fenster`) meldet kein „ausgebaut" und nennt nicht den Wert seines Vorgängers.
- Gemessen wird der Anteil, nicht die Anzahl; der Beleg (`ev`) beginnt mit dem Sortierwert. Ein Anteil an den eigenen Gelegenheiten kennt die Spielzahl nicht. Stehen neben einem Abstand seine beiden Quoten, ist er ihre Differenz, so wie sie dastehen: die Vergleichsquote folgt aus der eigenen Quote und dem Abstand (`_ppGegen`), der Wandler zeigt die Anteile des Profils.
- `offen`: erfüllbar mit fünfzig Partien in der Laufbahn — im Rennen steht jemand mit unter hundert Partien, der Rekord ist vergeben und gehört nicht nur den drei Besten.
- Zwölf Gegenpaare tragen dieselbe Mindestbasis; ein `paar` (zwei Enden eines Werts mit Vorzeichen) zeigt zurück, und die Rennen schneiden sich nicht.
- Fügungen tragen `zufall` (`quote`: erreichbar, mindestens die halbe Liga im Rennen; `fund`: darf selten und unbesetzt sein, höchstens die Hälfte leer) und wiegen 75 statt 100. Eine Laufbahn aus lauter Niederlagen erreicht keinen Rekord mit Grundwert 100.
- Kein Halter trägt mehr als ein Viertel der Tafel; jeder gewertete Spieler mindestens einen Eintrag. Die Schandtafel (`art:'schatten'`) zählt nichts und fragt eher den Abstand zum Eigenen als das Niveau; kein Halter über zwei Fünftel davon, mindestens sechs Namen.
- Dieselbe Frage auf zwei Zeitachsen bleibt EINE Disziplin (zweiundzwanzig tragen beide); liest der Monat eine Zählung als Wende und die Laufbahn als Kehrseite, sind es zwei Fragen und zwei Einträge („Der Ausbruch" und „Der Stammkunde"). Ein neuer Rekord steht im Katalog neben seinem nächsten Verwandten. Was eine Beziehung zweier Spieler misst oder an der Spielzahl hängt, wird kein Rekord.
- `cond` nennt jede Schwelle der Wertfunktion, `wie` sagt, wie gemessen wird, samt Nenner. Gestrichene Rekorde stehen namentlich in `STORY_ABGEMELDET`; eine ID wechselt nicht, wenn ein Eintrag seine Frage wechselt, und die ID eines gestrichenen Rekords wird nicht für eine neue Frage wiederbenutzt (die Folge der Tage im Soll heißt `sollstrecke`, nicht `kopfhoch`).
- Ein Verhältnis gewonnener zu verlorenen Extremergebnissen ist nur ein Rekord, wenn es die Liga nicht wie die Siegquote ordnet. 10:9 zu 9:10 folgt ihr gemessen mit r = 0,62 und steht als Paar: „Das Kaltblut" (Fügung) und „Die weichen Knie" (Schattenseite), ab zehn Zitterpartien, der Nenner sind die Zitterpartien; „Die weichen Knie" tragen dazu die Monatsachse. 10:0 zu 0:10 folgt ihr mit r = 0,98 und ist keiner; die Frage steht im Monat („Der Zerstörer", „Der Widerstand").

## Stellen

`32-chronik-katalog.js` (`DISZIPLINEN`), `34-chronik-rekorde.js` (`_chronicleCtx`, `CHRONICLES`, `CHRON_KINDS`, `chronicleRang`, `rekordZaehlung`), `35-chronik-ui.js` (`ligaRekordeHtml`, `_rekFeldHtml`).

## Prüfung

`tests/rechnen` (der laufende Tag zählt erst um 23:59), `tests/disziplinen` (Katalog, Kammern und ihre Zahlen, die Siegquote, die nur das Niveau trägt, Schwellen im Text, offene Rennen, Paare, Fenster, Halterdeckel, Schandtafel, sichtbarer Text), `tests/ambient` (jede Rekord-Karte gegen den ganzen Katalog), `tests/blatt` (Kammerfelder und Besitzleiste).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Wer besser spielt,
gewinnt jede Quote und jede Serie — am Ende liegen alle Liga-Einträge bei
denselben drei Spielern. Zweiundzwanzig von sechsunddreißig Rekorden
fragten direkt nach Können, und drei Spieler hielten vierundzwanzig der
achtunddreißig Haltungen. Heute sind es **zweiundsechzig Rekorde** in
**fünf Kammern** — 16 Können, 6 Aktuelle Form, 8 Bestmarken, 17 Fügungen,
15 Schattenseiten. Gemessen halten zehn der elf gewerteten Spieler zwischen
fünf und elf Einträgen, die beiden Besten der Siegquote sechs und acht.
**Die Kammer steht am Eintrag** (`allzeit.kammer`), sie wird nicht mehr aus
`art` erraten. Abgeleitet war „Fügung, sonst Schatten, sonst Ereignis gleich
Bestmarke", und damit gab es die Kammer „Aktuelle Form" gar nicht: ein
Fenster-Rekord ist eine Leistung und landete im Können. Dort stand „Höchste
Siegquote in den letzten 20 Partien" neben „Beste Siegquote als Außenseiter
über die ganze Laufbahn", also zwei verschiedene Zeitachsen in einer
Kammer, und wer die Tafel liest, konnte nicht sehen, was gerade gilt und
was für immer.
**Die Karte nennt Zeitraum, Grundwert und Mindestbasis** (`zeitraum`,
`basis`, `mind`). Die Mindestbasis musste der Leser aus dem Bedingungssatz
heraussuchen, und über welche Strecke gerechnet wird, stand nirgends. Der
Grundwert steht dabei ausdrücklich als „100 P Basis": er ist NICHT, was
jemand bekommt — er wird durch die Zahl der Halter geteilt und danach in
der Wurzelstaffel gedämpft [§C34]. Den tatsächlichen Beitrag zeigt das
Blatt. Die Zeile steht leise und ohne Rahmen: zwei gerahmte Pillen
brachen fast immer um und waren lauter als der Wert.
**Die Karte zeigt, wie weit der Halter vorn liegt** (`_rekFeldHtml`). Sie
nannte seinen Wert und sonst nichts; ob der Zweite knapp dahinter liegt,
stand erst im Blatt. Jetzt steht der Wert groß in der Farbe der Kammer, und
darunter das Bauteil „Wo im Feld" des Belegs [§C27] — jeder im Rennen ein
Punkt, der Halter am rechten Ende —, daneben der Erste, der ihn nicht
hält, mit seinem Wert. Gelesen wird `chronicleRang`, dieselbe Reihenfolge
wie Podest und Verfolger; ihr Topf ist deshalb so groß wie der Katalog,
sonst räumte jedes Zeichnen des Reiters die Einträge, die Blatt und Feed
gerade brauchten. Der Kopf jeder Kammer sagt in einem Satz, was sie misst
(`CHRON_KINDS.satz`), und zeigt die drei, die darin am meisten halten.
**Und sie nennt nicht, was sich an der APP geändert hat.** Jede Karte trug
eine Marke „Neu" oder „Überarbeitet". Die sagt, welche Fassung der App
gerade läuft, und dem Leser einer Rekordkarte nichts: er will wissen, was
der Rekord misst und wer ihn hält. Dasselbe galt für die Erklärungen — dort
stand die Begründung gegen die frühere Rechnung („Der beste Zwanzigerblock
irgendwo in der Laufbahn gehörte immer dem, der am meisten gespielt hat",
„Deshalb wiegt der Eintrag 50 Punkte und nicht 100", „sonst wäre eine Seite
leichter zu halten als die andere"). Das ist die Bauanleitung und gehört in
einen Kommentar, nicht auf die Karte — dieselbe Regel wie „Das Blatt
erklärt nicht die App" [§C33]. `tests/disziplinen` prüft jeden sichtbaren
Text jedes Rekords und jeder Chronik gegen eine Liste solcher Wendungen und
gegen Entwicklersprache („Rohsicht", „Cache", „Projektion", „Savepoint",
ein Paragraphenzeichen).
**Die Siegquote zählt einmal.** Einundzwanzig Laufbahn-Rekorde ordneten die
Liga gemessen wie die Siegquote der Laufbahn, mit einer Korrelation von
0,76 bis 0,99: die Anteile gewonnener Spieltage und Wochen („Der
Platzhirsch", „Der Wochenherr"), die Tore je Sturmspiel und die Gegentore
je Abwehrspiel („Der Torjäger", „Der Fels"), die Tordifferenz je Partie
(„Der Deutliche"), die Quote in engen Partien, gegen Favoriten, nach zwei
Niederlagen, gegen Gegner in Serie, beim Wiedersehen, neben dem
schwierigsten Partner, die Quote über der Elo-Erwartung und die besten
dreißig Partien. Jede davon fragte anders und bekam dieselbe Antwort: wer
am meisten gewinnt, gewinnt auch dort. Die zwei Besten hielten zusammen 31
Einträge, und jeder neue Rekord dieser Art machte die Tafel nur länger.
Das Niveau steht jetzt an sechs Stellen — „Der Maßstab", „Der höchste
Gipfel", „Der Unaufhaltsame", „Der Lauf" und die beiden kompletten
Positionen —, und die übrigen fragen, was die Siegquote nicht sagt: wie
weit ein Ausschnitt der eigenen Partien vom eigenen Rest abweicht: „Der
Glanztag" (der beste Spieltag gegen die eigene Quote) und als Kehrseiten
„Der Rost" und „Der Abschwung" (die letzten 25 gegen die Laufbahn davor);
an den echten Partien liegen sie bei r zwischen −0,46 und +0,16. Sechs der
gestrichenen behalten ihre Monatschronik: im Monat beginnen alle bei
derselben Elo, und dort misst dieselbe Frage etwas anderes.
**Drei Rekorde fielen, weil sie sich überschnitten.** „Der Umsteiger" (die
Partie nach einem Positionswechsel) fragte, was der Wandler und die beiden
Positionsrekorde schon beantworten; „Der Aufschwung" (die letzten 25 gegen
die Laufbahn davor) stand neben „Dem Höhenflug", der dieselbe Richtung mit
zwei gleichen Fenstern misst; „Neuland" über die Laufbahn wiederholte die
Monatschronik gleichen Namens, die bleibt. Ihre gespeicherten Karten sind
abgemeldet, die Hinweiskarten am Eintrag ihrer Sorte
(`AMBIENT_ABGEMELDET`), weil deren ID nur das Zeitfenster trägt. An die
Stelle der beiden Hinweiskarten tritt die des Kaltbluts
(`personal_kaltblut`): ohne Ersatz wiederholte die Rotation in vierzig
nachgespielten Tagen drei Thesen über dieselbe Person statt zwei.
**Die Zitterpartie steht als Paar.** Ein Verhältnis gewonnener zu verlorenen
Extremergebnissen war ausgeschlossen, weil es als Anteil die Liga wie die
Siegquote ordnet. Für 10:9 gegen 9:10 gilt das nicht: gemessen folgt der
Anteil der Siegquote mit r = 0,62, vorn steht ein Spieler aus der Mitte der
Tabelle, und die Besten liegen um die Hälfte. „Das Kaltblut" bekommt deshalb
zur Monatschronik die Laufbahn-Achse, „Die weichen Knie" stehen als
Schattenseite daneben; beide ab zehn Zitterpartien, der Nenner sind die
Zitterpartien und nicht alle Partien oder Pleiten — das unterscheidet sie
vom Pechvogel, der die 9:10 durch alle Pleiten teilt. Für 10:0 gegen 0:10
sind es r = 0,98 bei einer Handvoll Fällen je Spieler: eine zweite
Siegquote, und kein Rekord.
`tests/disziplinen` misst jeden Rekord mit dem Grundwert des Könnens gegen die
Siegquote und fällt, sobald einer außerhalb von `NIVEAU` darüber steigt.
„Die ruhige Hand" bleibt, weil sie den SPRUNG in engen Partien misst und
nicht die Quote darin; ebenso „Der Stehaufmann" den Sprung nach einer
Niederlage.
**Drei Einträge haben ihre Frage gewechselt und ihre ID behalten.** Ein
Wechsel und keine Neuanlage, damit jeder Verweis auf sie weiter trägt —
Profile, eingefrorene Monate und persistierte Karten hängen an der ID.
„Gegen jeden bestanden" zählte den ANTEIL der regelmäßigen Gegner mit
positiver Bilanz und beantwortete damit eine andere Frage als sein Name:
wer gegen neun von zehn gut und gegen den zehnten furchtbar steht, stand
bei 90 % und hatte genau den Angstgegner, den der Eintrag ausschließen
soll. Er heißt jetzt **„Kein Angstgegner"** und wertet im Monat den Anteil;
seine Laufbahn-Achse ist mit der Siegquote gefallen (s. o.).
„Der Schadensbegrenzer" zählte den Anteil der Pleiten ab sieben Toren
Rückstand und ließ offen, wie die übrigen ausgingen: wer nie hoch und immer
mit fünf Toren verliert, stand bei null Prozent und damit an der Spitze. Er
heißt jetzt **„Der Widerstand"** und misst den mittleren Rückstand JEDER
Niederlage. „Der Wiedereinstieg" maß die Quote im ersten Spiel nach einer
Pause und hielt damit, wer ohnehin gewinnt; er misst jetzt den Abstand
dieser Rückkehrspiele zu den übrigen eigenen Partien. Eine Pause sind sechs
volle Tage (`REKORD_PAUSE_STUNDEN`, eine Zahl für Rechnung, Bedingung und
Erklärung): bei drei Tagen war fast jede Woche eine Rückkehr. Nach sechs
Tagen kommen nur zwei Spieler auf acht Rückkehrspiele, also verlangen
Wiedereinstieg und Rost vier.
**Aktuelle Form ist ein festes Endfenster und nie der beste Abschnitt.**
Sieben Rekorde stehen auf den letzten 20, 25, 40 oder 50 eigenen
Partien. Der beste Zwanzigerblock IRGENDWO in einer Laufbahn gehörte immer
dem Vielspieler: dreihundert Partien haben 281 solche Blöcke, dreißig
Partien haben elf, und das Maximum aus vielen Ziehungen ist größer.
`tests/disziplinen` rechnet jedes Fenster unabhängig aus den echten
Partien nach.
**Kein Fenster ist kürzer als zwanzig Partien.** „Der Lauf" zählte die
letzten 20, „Der Höhenflug" verglich 10 mit 10. Ein Spieler bestreitet
gemessen 3,5 bis 7,4 Partien je Spieltag; zehn Partien waren zwei, drei
Tage und zwanzig drei bis fünf. Der Rekord wechselte mit jeder Woche, und
weil zehn Partien nur Schritte von zehn Prozentpunkten kennen, teilten
sich drei Spieler den Höhenflug mit genau +30. Jetzt zählt der Lauf 40
Partien (fünf bis elf Spieltage) und der Höhenflug 20 gegen 20, in
Schritten von fünf Punkten; an den Fixtures hält ihn danach einer allein.
**Die Bestmarken stehen vorn.** Mit dem Können zuerst begann der Reiter mit
siebzehn Karten aus Schnitten und Erwartungsabständen; eine Serie, ein
Gipfel, ein Tag sind ohne Erklärung zu lesen. Die Reihenfolge ist Alle,
Bestmarken, Können, Form, Fügungen, Schatten.
**Elf Rekorde sind gefallen, elf sind dazugekommen.** Weg sind „Der
Gigantentöter", „Der Nervenkitzler", „Der Unerschütterliche", „Der
Hausherr", „Das Sonntagskind", „Die starke Phase", „Der Aufschwung", „Die
kalte Dusche", „Die Torbilanz", „Der Angreifer" und die Laufbahn-Achse der
„Steigerung" (ihre Monatschronik bleibt). Neu sind „Gegen den Wind", „Der
Sturmführer", „Der Allrounder", „Der Laufstopper", „Der Lauf", „Die
Abwehrmauer", „Der Sturmtreue", „Der Seitenwechsler" und die
Laufbahn-Achsen von „Kein Angstgegner", „Der Deutliche" und „Der
Kaltstart". Die persistierten Karten der gestrichenen Rekorde sind in
`STORY_ABGEMELDET` namentlich abgemeldet: der Generator bildet ihre IDs
nicht mehr, also kann `_newsTexteAuffrischen` sie nicht umschreiben, und
sie behaupteten sonst für immer einen Rekord, den es nicht mehr gibt. Ihr
Blatt stürzt trotzdem nicht ab — die Definition wird überall mit `?`
abgefragt, der Text steht in der Zeile.
**Zwölf Gegenpaare messen dieselbe Frage von zwei Seiten** und tragen
dieselbe Mindestbasis: sonst wäre eine Hälfte leichter zu halten als die
andere. Keines ist mehr je Seite geeicht: Unaufhaltsamer und
Durststrecke verlangen ihr erstes Glied, Wiedereinstieg und Rost vier
Rückkehrspiele, Kaltblut und weiche Knie zehn Zitterpartien.
**Ein Rekord hat keine Wertlatte, nur eine Stichprobe.** Der Rekord ist
der beste Wert, den es gibt, und nicht der beste über einer Latte. Siebzehn Rekorde trugen eine solche Latte — in Prozent („mindestens
25 %", „höchstens 45 % Siegchance", „ein Sturmanteil zwischen 43 und
57 %"), in Elo („ab 350 Elo", „ab 150 Elo Verlust") oder als Serienlänge
(„ab 8 Siegen in Folge") —, und sie ließ den Rekord leer oder strich den
Besten aus dem Rennen. Was ein Wert von sich aus braucht, bleibt: eine
Serie ihr erstes Glied, ein Wechsel zwei Partien, eine Wiederholung zwei
gleiche Ergebnisse, ein Sprung oder Verlust eine Richtung. Verlangt werden darf nur,
dass der Wert auf genug beruht: Partien, Spieltage, Wochen, Niederlagen —
sonst hielte ein Neuling nach drei Abenden einen Rekord, ohne eine Linie
gezeigt zu haben. Eine Teilmenge, die beschreibt, welche Partien zählen
(„Partien mit 35 bis 65 % Siegchance"), ist keine Latte und bleibt.
`tests/disziplinen` liest Bedingung, Mindestbasis und Wertfunktion jedes
Rekords, dazu `min` und die Wertfunktion auf Elo-Latten. Seitdem sind
„Der Unaufhaltsame", „Der höchste Gipfel" und „Der Maßstab" mit fünfzig
Partien erreichbar und tragen `offen`. Eine Latte bei null ist auch eine:
„Der Allrounder" verlangte, auf BEIDEN Positionen über der Rechnung zu
liegen, das schaffte ein einziger Spieler, und mit seinem Karriereende stand
der Rekord leer. Sein Name verspricht keine Richtung, nur Ausgewogenheit;
im Rennen steht jetzt jeder mit zwanzig Spielen je Position, und vorn, wer
auf der schwächeren am nächsten an der Rechnung liegt. Wo der Name eine
Richtung verspricht („Der Wiedereinstieg", „Der Abschwung"), bleibt sie —
aber erst ab einem sichtbaren Prozentpunkt: „−0 %-Punkte" stand sonst als
Rückgang in der Liste.
**Eine Kammer, die die Auslosung misst, wiegt 75.** Rollenwerte und
Fügungen dürfen von einer Laufbahn aus lauter Niederlagen gehalten werden:
„Das Fundament" fragt nach der gleichmäßigsten Tordifferenz, und wer immer
0:10 verliert, ist gleichmäßig. Was den Grundwert des Könnens trägt, darf
sie nicht erreichen — `tests/disziplinen` spielt genau diese Laufbahn gegen
jeden Rekord mit Grundwert 100.
**Der Anteil an den eigenen Gelegenheiten kennt die Spielzahl nicht.** Er
zählt nicht, wie oft etwas gelang, sondern wie oft von wie vielen
Gelegenheiten. Wer an zwanzig Spieltagen dabei war, wird an zwanzig
gemessen — und genau deshalb erreicht ein solcher Anteil den, der weniger
spielt. Gemessen verlangten 17 der 57 Rekorde eine Mindestzahl von vierzig
Partien oder mehr, darunter die vier mit fünfzig Sturm- oder
Abwehrspielen; „Auf Augenhöhe" und „Der Wiedereinstieg" fragen
stattdessen nach den eigenen offenen Partien und Rückkehrspielen. Die Herleitung samt Messung steht in
`mockup/README-staerken.md`.
**Ein neuer Rekord steht neben seinem nächsten Verwandten.** Die
Katalogreihenfolge IST die Reihenfolge im Rekorde-Reiter, und ein Eintrag
am Ende der Liste erklärt sich niemandem: „Auf Augenhöhe" steht neben
„Die ruhige Hand", „Der Sturmführer" neben „Der Abwehrchef", „Der
Kaltstart", „Der Wiedereinstieg" und „Der letzte Ball" beieinander, „Das
Kaltblut" neben „Der Eiskalte", „Die weichen Knie" neben „Der Pechvogel",
„Der Glanztag" neben
„Der höchste Gipfel", „Der Sturmtreue" neben „Die Mauer", „Die
Abwehrmauer" neben „Der Dauerstürmer" und „Der Rollencoup" neben dem
kompletten Verteidiger. „Der Pendler" und „Der Wanderpass"
stehen neben „Der Seitenwechsler", „Der Spurwechsel" neben „Das
Wechselbad", „Der Serienstopp" neben „Der Sonntagsschuss" und „Der
Stammkunde" neben „Der Angstgegner". Wer eine
Monatschronik um ihre Laufbahn-Achse ergänzt, verschiebt ihren Eintrag
dorthin; die Monatstafel bleibt davon unberührt, weil `SEASON_TITLES` nach
Art, Chronik-Art und Ausschlag sortiert und nicht nach der Katalogfolge.
**Die Schwelle ist keine Bedingung, sondern eine Kammer.** Ein Rekord
DARF eine hohe Mindestzahl verlangen: wer sie hält, hat die Frage über eine
lange Strecke beantwortet, und Rekorde sind auch dazu da, Können zu
belohnen. Er darf aber nicht nur das. Rekorde tragen deshalb
`offen` im Katalog: ihre Bedingung ist mit **fünfzig Partien** in der
Laufbahn erfüllbar — 42 der 62, unter anderem „Der Lauf", „Der
Höhenflug", „Der letzte Ball", „Der Kaltstart", „Der Wiedereinstieg",
„Das Kaltblut", „Der Glanztag", „Der Dauerstürmer", „Die
Abwehrmauer", „Der Sturmtreue", „Die Mauer" und „Der Rollencoup". Sie
fragen nach einer Teilmenge der eigenen Partien und nicht nach einer
Gesamtzahl, und genau deshalb erreicht sie auch, wer weniger spielt. Nicht
offen sind die, die eine lange Strecke oder einen breiten Partnerkreis
verlangen — die beiden kompletten Positionen, „Der Allrounder", „Der
Katalysator", Rückenwind und Einzelkämpfer — und die Funde „Die
Punktlandung" und „Die Achterbahn". Gemessen waren 13 der 21 damaligen Rekorde
mit lesbarer Mindestzahl für einen solchen Spieler unerreichbar: „ab 50
Sturmspielen", „ab 60 Gelegenheiten", „ab 80 Spielen" gehören dem
Vielspieler, weil sie außer ihm niemand halten KANN. `offen` ist dabei
keine Beschriftung: `tests/disziplinen` zählt nach, dass in jedem offenen
Rennen jemand mit unter hundert Partien steht, dass jeder offene Rekord
vergeben ist und dass mindestens einer nicht den drei Besten gehört.
**Ein gleitendes Fenster meldet kein „ausgebaut"** (`fenster` im Katalog).
Der Wert einer Laufbahn steigt, weil jemand besser gespielt hat; der Wert
eines Fensters steigt auch dann, wenn am hinteren Ende ein schwaches
Ergebnis herausfällt. Dieselbe Begründung wie beim Verschlechtern [§C33]:
wer nichts getan hat, hat nichts getan. Gemessen ergaben die drei ersten
Fenster-Rekorde 26 der 135 Karten ihrer Familie, und keine davon nannte
eine Leistung; heute tragen die Fenster-Rekorde der Kammer „Aktuelle Form"
die Marke. Und die Teilmenge muss **mitwandern**: „in den ersten 25
Partien" ist fertig, sobald jemand 25 Partien hat, und ein Rekord darauf
könnte den Halter nie mehr wechseln.
**Es nennt auch den Wert seines Vorgängers nicht.** Der gilt nicht mehr:
sein Fenster ist weitergerutscht, während der neue Halter sein eigenes
gefüllt hat. Gemessen stand „Maxi, Julian, Jane und Johannes übernehmen
‚Der Höhenflug'. +10 %-Punkte … Vorher hielt Leon den Rekord mit +20 %" —
eine Übernahme mit dem schlechteren Wert, und der Satz erklärt nicht, wieso.
Es bleibt „Vorher gehörte der Rekord Leon"; dieselbe Begründung wie beim
ausgebliebenen „ausgebaut". `tests/ambient` prüft jede Rekord-Karte.
**Die Bedingung nennt jede Schwelle, die Erklärung sagt, wie gemessen wird.**
Auf der Karte steht `cond`, im Blatt darunter `wie` — und beides war
lückenhaft: nur 15 der 46 Rekorde hatten überhaupt eine Erklärung. „Die
ruhige Hand" verlangte „mindestens 9 Prozentpunkte" und schwieg über die 14
engen Partien und die 20 % der Laufbahn, die ebenso verlangt sind; wer die
Karte las, wusste nicht, warum er nicht im Rennen steht. „Der
Gigantentöter" nannte keinen Nenner, obwohl er gegen ALLE Partien zählt und
nicht gegen die als Außenseiter. Und „Die Mauer" heißt so, misst aber nur,
wie oft jemand hinten stand: ohne Erklärung liest sich der Name als
Abwehrstärke. Die Erklärung nennt deshalb bei jedem Anteil seinen **Nenner**
und sagt, wo eine Zahl etwas NICHT bedeutet. Geprüft wird beides maschinell:
`tests/disziplinen` liest jede Schwelle aus dem Quelltext der Wertfunktion
und verlangt sie im Text — als Ziffer oder ausgeschrieben.
**Kein Halter trägt mehr als ein Viertel der Tafel.** Eine Kennzahl auf
drei Teilmengen ist dieselbe Frage in drei Ausschnitten und sammelt sich
beim selben Halter; Sturm und Abwehr sind dagegen ein PAAR wie „Der
komplette Stürmer" und „Der komplette Verteidiger" — „Die Handschrift" und
„Das Fundament" messen dieselbe Streuung auf den beiden Positionen und
gehören gemessen zwei verschiedenen Spielern. Gedeckelt wird deshalb nicht
die Frage, sondern der Halter: `tests/disziplinen` nennt jeden, der mehr
als ein Viertel aller Haltungen trägt.
Dagegen steht die Kammer der **Fügungen**: Einträge, die von der Auslosung
und vom letzten Ball entschieden werden. Sie tragen `zufall` im Katalog,
stehen als `ereignis` da und wiegen fürs Prestige damit halb so viel wie
ein Beleg für eine Fähigkeit [§C34] — sie sollen jemandem gehören können,
nicht jemanden auszeichnen.
`zufall` sagt zugleich, WIE gemessen wird, und das entscheidet über die
Zusicherung:
**`'quote'`** mittelt über eine Laufbahn oder einen Tag („Der schwerste
Tag", „Der Wiedergänger", „Das Nadelöhr" und die Folgen). Sie muss erreichbar sein: mindestens die halbe Liga steht
im Rennen, und vergeben ist sie auch.
**`'fund'`** ist ein einzelnes Zusammentreffen („Die Punktlandung", „Die
Achterbahn"). Es darf selten sein und sogar unbesetzt
bleiben — sonst wäre es keins; höchstens die Hälfte der Funde darf leer
stehen. Eine Quotenschwelle darauf anzuwenden hieße, das Seltene
abzuschaffen.
**Ein PAAR wird zusammen gemessen** (`paar` im Katalog). „Der Rückenwind"
und „Der Einzelkämpfer" sind die zwei Enden eines Werts: wen die Auslosung
gerade als Mitspieler zuteilt, über oder unter dem eigenen Mittel. Das
Vorzeichen teilt das Feld, und gemessen standen fünf über und fünf unter
ihm — einzeln gemessen fiel jede Hälfte an der Regel „mindestens die halbe
Liga im Rennen" durch, die gegen eine zu hohe SCHWELLE geschrieben ist. Ein
Vorzeichen ist keine Schwelle. `paar` ist dabei keine Beschriftung:
`tests/disziplinen` verlangt, dass der Partner zurückzeigt und dass sich
die beiden Rennen nicht schneiden — zwei Einträge, in deren Rennen derselbe
Spieler steht, sind keine Enden eines Werts, sondern zwei Wertungen.
Gerechnet wird gegen das **eigene** Mittel und nicht gegen das der Liga:
wer selbst der Beste ist, kann nie mit sich selbst spielen, sein
Partnerfeld ist zwangsläufig das schwächste, und gemessen lag diese Fassung
bei r = −0,66 mit der eigenen Siegquote [§C38]. Gegen das Eigene
gerechnet bei −0,09.
Über beide hinweg gilt: mindestens eine gehört der unteren Hälfte der
Siegquote, und die drei Besten halten höchstens die Hälfte der Kammer.
Ohne das hätte man zehn Einträge dazugebaut und nichts verändert.
Jeder gewertete Spieler trägt mindestens einen Liga-Eintrag.
`tests/disziplinen` misst das alles nach.
Was **nicht** in die Kammer gehört: sieben Rekorde, die einen Nachbarn
doppelten — „Der Vollstrecker" neben „Der Zerstörer", „Der perfekte Abend"
neben „Der makellose Tag". Dieselbe Frage mit derselben Antwort sammelt
sich beim selben Halter. Vier von ihnen behalten ihre Monatswertung und
verlieren nur den Liga-Rekord; drei gibt es nicht mehr.
Billig dürfen Fügungen trotzdem nicht sein: eine Bestmarke, die jeder
geschenkt bekommt, ist keine mehr.
Und gemessen wird überall der **Anteil**, nicht die Anzahl — sonst hält den
Rekord, wer am meisten spielt. Der Beleg muss das auch sagen: er beginnt
mit dem Wert, nach dem sortiert wird, und nennt die Anzahl erst dahinter.
„32 seiner 134 Siege waren Kantersiege" las sich als Bestenliste der
Anzahl, und das Podest zeigte genau diese 32 über der 10 des Spielers, der
den höheren Anteil hält.
**Die Schandtafel ist keine Rangliste von hinten.** Dreizehn Rekorde tragen
`art:'schatten'` und sieben Monatschroniken `monat.art:'schatten'` — die
Kehrseite gehört dazu, sie zählt aber nichts: `REKORD_GRUNDWERT.schatten` ist
null, `chronikPunkte` gibt einer Schattenseite nichts, `neg` hält sie aus der Zahl im
Profil und in der Rangliste heraus, `nextRecordFor` schlägt sie niemandem
vor, und der Feed meldet sie gar nicht. Eine negative FÜGUNG ist davon
ausgenommen und behält ihren Wert [§C25].
Das eigentliche Problem ist ein anderes: wer schlechter spielt, verliert
JEDE Quote. Eine Schande, die das Niveau misst, gehört damit immer demselben
Spieler. Gemessen hielt der Zehnte der Siegquote fünf der dreizehn
Haltungen, sobald die Kandidaten das reine Niveau fragten. Die meisten
fragen deshalb nach dem **Abstand zum Eigenen** [§C38] statt nach dem
Niveau, und genau dadurch haben sie ihr Tor bestanden: „Die Ladehemmung"
ging von r = −0,35 auf +0,14, „Die stumme Antwort" von −0,40 auf +0,06;
„Der Rost" ist die Kehrseite des Wiedereinstiegs, „Der Abschwung" misst,
ob jemand dauerhaft schwächer geworden ist. Ein gleichmäßiger Streu wäre gelogen — eine Schande MISST, dass
jemand schlecht war —, also ist nur der Extremfall gedeckelt: kein Halter
über zwei Fünftel der Schandtafel, und mindestens sechs Namen tragen mit.
**Dieselbe Frage auf zwei Zeitachsen bleibt EINE Disziplin** [§13.1].
Unter den ersten taten das `spotless`, `gleichauf`, `hochform`,
`schlussball`, `kaltstart`, `evenkeel`, `drought`, `abyss`, `hardluck`,
`sieve`, `angstgegner`, `untersoll` und `misfire`. Zwei Namen und zwei
Icons für denselben Gedanken wären eins zu viel [§C27] — deshalb bekam
„Der Kaltstart" seine Laufbahn-Achse an der bestehenden Monatsdisziplin
und keine zweite daneben.
**Der Ausbruch und der Stammkunde zählen dasselbe und fragen nicht
dasselbe.** Beide zählen die Niederlagen in Folge gegen einen Gegner, bis
ein Sieg gegen genau diesen Gegner gelingt. Im Monat zählt der Bruch: „Der
Ausbruch" ist eine Wende und selten [§C39]. Über die Laufbahn bleibt die
Serie selbst, und die ist eine Kehrseite. Sie stand als Laufbahn-Achse des
Ausbruchs unter den Fügungen und gab dem Prestige den Grundwert einer
Fügung für siebzehn Niederlagen in Folge gegen denselben Gegner [§C34].
Jetzt steht sie als „Der Stammkunde" unter den Schattenseiten, neben dem
Angstgegner, der dieselbe Lage als Anteil misst; gewertet wird weiter erst
nach dem Sieg, weil eine laufende Serie noch keine Länge hat. Die alte ID
`ausbruch` ist als Rekord abgemeldet wie jeder gestrichene, die
Monatschronik behält sie.
**Eine Folge ist eine Fügung, wenn die Auslosung sie schreibt.** „Der
Pendler" (jedes Mal die andere Position), „Der Wanderpass" (jedes Mal ein
anderer Partner) und „Der Spurwechsel" (abwechselnd Favorit und
Außenseiter) sind längste Folgen wie das Wechselbad: gezählt werden
Partien, nicht Übergänge, Tag und Monat unterbrechen nicht. „Der
Serienstopp" ist die längste Gegner-Siegesserie, die ein eigener Sieg
beendet hat — die Länge hat der Gegner gespielt, deshalb Fügung und keine
Bestmarke. Gemessen halten die
fünf neuen Einträge Spieler auf Platz 2 bis 10 der Siegquote.
**Was eine Beziehung zweier Spieler misst, wird kein Rekord.** Aus dem
Vorschlag in `mockup/besonderheiten` fielen damit Teamgefälle und
Gegensprung (beide Partner tragen denselben Wert), Grenzverkehr (der Faden
zwischen zwei Leuten gehört beiden) und Doppelgesicht. Ebenso fielen, was
an der Spielzahl hängt (Rückeroberung r = 0,64, Fixpunkt 0,64 gegen die
eigenen Partien), was beim Halter einer verwandten Wertung landet
(Amplitude bei „Der große Sprung", Herzschlaglauf beim Nadelöhr) und was zu
wenige ins Rennen bringt (Gegenhalt fünf, Umschaltmoment drei Spieler, mit
einem Bestwert unter null).
„Die Steigerung" ist den umgekehrten Weg gegangen: ihre Laufbahn-Achse ist
gefallen, die Monatschronik bleibt.
**Und wo die eine Hälfte schon jemandem gehört, bleibt die andere weg.**
„Der Dauerstürmer" zählt den Sturmanteil der letzten fünfzig Partien. Die
Abwehr-Fassung derselben Frage ginge gemessen an Henry mit 98 %, und Henry
hält „Die Mauer" schon: dieselbe Frage mit derselben Antwort sammelt sich
beim selben Halter. Der Sturmanteil gehört dagegen dem Zehnten der
Siegquote.
Was auf der Monatsachse **nicht** trägt, bleibt weg: „Die stumme Antwort"
schiebt ihre Schwelle dort gemessen höchstens 1,39 σ hinaus und wäre damit
eine Chronik, deren Bester kaum weiter draußen liegt als der Schnitt
[§C39]. Fünf Gelegenheiten zu antworten sind ein Wurf, fünfundzwanzig ein
Muster — sie trägt deshalb nur die Laufbahn.
`tests/disziplinen` misst das alles: die Verteilung, die beiden Achsen und
dass keine Schattenseite Prestige gibt; `tests/ambient` prüft den Feed
gegen den ganzen Katalog, damit ein neuer Eintrag nicht still durchrutscht.
