# §C27 Ein Bauteil, überall dasselbe

## Regel

- Derselbe Spieler sieht überall gleich aus, und dieselbe Aussage hat ein Bauteil: Wappen `.rav` (`insAvWrap`), Podest `.podest`/`.pod-karte` (`_chronPodestHtml`, Platz aus dem Wert, `_chronPlatz`), Segmentwähler `.ui-switch` (außen, Schlitten) und `.ui-tabs` (innen, Strich), Rangabzeichen `.rangab` (`rankBadgeHtml`), Gesicht `.av`, Zeichenkachel `.zk` (`zkHtml`), Award-Kachel `.aw-trophy` (`awKachelHtml`, `awVitrineHtml`), Beleg (`belegHtml`), Blattkopf und -fuß (`blattKopfHtml`, `blattAbschnittHtml`, `blattFussHtml`), Bühne (`buehneHtml`), Weg durch eine Insignium-Stufe (`_insWegHtml`), Bewegungen auf der Leiter (`_insBewegungenHtml`, Insignium-Blatt und Rückblick), Säulen der Auszeichnungen (`_ehrungSaeulen`, Ehrung und Rückblick), Kalender eines Zeitraums (`rcpKalenderHtml`, Saison und Woche), Hinweis (`toast`), Bestätigung (`bestaetigen`), Einblick (`einblickHtml`). Wer ein zweites Bauteil für dieselbe Aussage baut, hat einen Fehler gemacht.
- Bewegung: der Schlitten fährt nur über `transform` (`schlittenFahren`); eine Animation endet an `transitionend` mit Rückfall-Timer und genau einem Abschluss je Element (`_afterTransition`); der Finger besitzt den Zug (Eingabefelder und gescrollte Listen gehören nicht der Schließgeste, ein Bild je Frame); ein Balken wächst in der Höhe, nie in der Breite; was endlos läuft, bewegt nur `transform` und `opacity` — ein Schein, der atmet, ist eine eigene Ebene, die kommt und geht, und ein Lichtlauf fährt per `transform` (`glanzZug`) über eine Fläche, die abschneidet, oder über seine eigene Bahn (`glanzBahn`); alles ruht bei Bewegungsruhe.
- Ein Award hat ein Zeichen (`AW_IC`), einen Namen (`AWARD_META.title`) und einen Wert aus EINER Tabelle (`AW_WERT`: Liste, Zahl, Einheit, Stichprobe, `gilt`); die Kachel beantwortet wer, wie viel, woraus (`awFeldHtml`, `awLaufHtml`) und trägt drei Töne (`ton-pos`, `ton-team`, `ton-neg`); im Rückblick ist das Können Metall (`metall`, `ton-metall`), weil dort Gold dem Sieger gehört [§C31]. Ein Name gehört einer Frage.
- Feed-Karte: Tageskopf als Marke (`.nf-tag`), Rubrikband (`_newsRubrik`, `_newsSorteIcon`), zwölf Kartenformen (`_newsSorte`) mit je einer Bildzone (die Ehrung: je Geehrtem eine Säule wie im Säulenbild eines Spieltags, gestapelt aus seinen Auszeichnungen in Klassenfarbe, darauf die Zeichenkachel `.zk` seiner wertvollsten, unten sein Wappen `.rav`, `.eh-buehne` — keine eigene Zeichnung wie Medaille oder Band), Motiv (`_newsMotiv`), keine zwei Rubriken mit demselben Zeichen; die Bildzone macht die Karte nicht höher und nimmt der Schlagzeile nicht den Platz; ein Deckel schneidet ab statt zu schrumpfen; Zahl, Datum, Name fett (`_newsBetont`). Es gibt eine Kartenform, kein Mini-Popup.
- Licht und Rand: Breaking bricht die Spalte und glimmt; die Karte des Tages schimmert leise golden; der Lichtlauf (`glanzZug`, ohne eigenes Abschneiden auf seiner Bahn `glanzBahn`) nur dort, wo EINER einen goldenen Titel trägt, und im Profil über allem Gewonnenen — jedem Liga-Titel, jedem gehaltenen Rekord, Platz 1 einer Saison, als Welle über den legendären Auszeichnungen —, versetzt (`glanzBahn(verzug)`), sodass er durch eine Reihe wandert; das Seltene trägt einen leisen Lauf in seiner Familienfarbe (`_newsGlanz`); der Rand (`--kante`, `--rahmen`) sagt das Gewicht; negativ trägt `.nf-neg`.
- Metall statt Bewegung: Platz 1 bis 3 tragen ihr Metall als feste Veredelung — ein Rahmen im Verlauf von Gold, Silber oder Bronze (`border-box` unter `padding-box`), eine Lichtkante oben, ein Schein darunter, die Platzziffer mit Glanz; kein Strich an der Kante, nichts in einer Liste bewegt sich ohne Anlass. Bewegung nur auf eine Handlung hin, und sie endet von selbst: der gewählte Reiter federt (`reiterStoss`) und leuchtet fest, ein Blatt blendet beim Öffnen ein (`blattEin`), und beim Öffnen der App und beim ersten Betreten eines Reiters fährt das Kantenlicht (`kantenlicht`, `.kl`) im Metall um Platz 1 bis 3 und verlischt nach gut vier Sekunden [§C43]. Der Profilkopf trägt Kante und Hof im Rangton fest im Hintergrund und lebt sonst von Aura und Insignium; um seinen Rand läuft beim Öffnen und dann alle zehn Sekunden ein Licht in Rangfarbe (`.pp-rand`). Im Profil bewegt sich außerdem, was gewonnen ist oder gerade läuft: die Elo-Kurve zeichnet sich einmal, die Form springt auf, der laufende Monat und der eigene Rang atmen.
- Story-Blatt: derselbe Bau (`_newsBlattKopf`, `_newsDetailMitte`, `_newsBlattFuss`), die Mitte zuerst gebaut, die Partie höchstens einmal, Scroll vor dem Markup auf null; was oben steht, steht unten nicht noch einmal (`_ndNeu`, `_ndOben`); kein Satz erklärt eine Grafik; das Blatt einer Partie zeigt Bühne, Siegchance auf der Skala, Elo-Wirkung, Duelle, Tagesleiste und Verteilung (`_ndBuehne`, `_ndChanceSkala`, `_ndEloWirkung`, `_ndDuelle`, `_ndTagLeiste`, `_ndVerteilung`); der Spieltag als Bahn (`_ndTagesbahn`); jedes Blatt zeigt, wovon seine Story handelt.
- Mitte: jedes Zeichen des Katalogs steht mit der Mitte seiner Geometrie auf (12, 12) seines Felds; Zeichen in Kachel, Kreis oder Chip, das Gesicht auf dem Reif seines Wappens, Initialen und Ziffern in ihrem Gesicht stehen in der Mitte; eine Regel für die `span` eines Behälters trifft nie `.av`, `.zk` oder `.rav` (`:not(.av)`, `:not(.zk)`, `> .av`).
- Zeichen: ein Strich aus EINER Regel (`--strich`); der Strahl des Positionsprofils gehört der überwiegenden Seite, die stärkere Rolle trägt ihre Farbe; das Insignium hat Reif, Kopf und Raute an fester Stelle; das Banner nur, wo ein Spieler allein und groß steht; die Kachel misst am Reif.
- Eine Form je Sache: Kalendertag `tagKey`, Uhrzeit `datumFmt`, ein Tag im Satz mit Jahr, wenn es nicht das laufende ist (`datumFmt` mit `tmx`, am Satzende `tagImSatz`), Dezimalkomma `komma`, eine Zahl ab fünf Stellen mit Tausenderpunkt (`tausender`, für jede Story im Generator), Stand aus Sicht des Nebenstehenden `standFuer`, Überraschung als Siegchance der Sieger, Namen mit „&" nur in schmalen Zellen (`_chronHolderNames`), im Satz mit „und" (`_chronHalterSatz`, `_namenListe`), Elo-Grenzen in `expected` und `CHANCE_*`, der Platz im Feed aus der Gesamtliga (`_newsGesamtrang`). Zwei Rechnungen über dieselbe Frage, die bleiben müssen, hält ein Test aneinander.
- Layout: Raster mit `minmax(0,1fr)`; ein Knopf in einer Zeile so breit wie sein Wort; ein Reiter nennt sein Wort ganz (`METRIC_REITER`), ein langes Wort wird kleiner statt gebrochen (`_awLblLang`); eine Bilanz bricht nicht um; ein langer Wert in der Zahlenreihe wird kleiner, nicht breiter.
- Partie-Karte: der Stand ist `_spSt` (A:B, der Sieger hell) oder die Zeichnung selbst, die Namen stehen unter jedem Kopf in derselben Teamzeile (`_spTeamZeile`: Team A links, je Paar die Abwehr zuerst, Sieger mit grüner, Verlierer mit roter Kante); eine Zeile der Karte, auch die des Fußes, ist dieselbe Zeile (`_newsSammelBand`); ein Verlauf ist eine Kurve (`_spLinie`: runde Achse, die die Beschriftung nicht überlappt, Bezugslinie, über ihr Grün und unter ihr Rot, wo sie eine Richtung trennt, Ränder so breit wie die längste Beschriftung) und ein Vergleich weniger eine Rangliste (`_spRangliste`: Platz, Gesicht, Name, Balken, Wert, Zahl, wahlweise der Schnitt); beide nutzen alle Fakten des Katalogs und ihr Blatt (`_spFaktBild`).
- Ansichten: eine Grafik über einer Rangliste ist eine Zeile, die aufklappt (`einblickHtml`); der Positionsverlauf ist eine Tabelle über die Zeit (`_posvTabelle`, `posvVorschauHtml`); die Partie im Verlauf zeigt den Sieger (`vHistory`), das Duo seine Bilanz als Balken; die Siegchance steht beim Aufstellen unter der Score-Karte (`_matchChanceHtml`); der Direkte Vergleich zeigt jede Begegnung (`h2hBegegnungenHtml`); die Kammern des Rekorde-Reiters sind Felder; eine lange Erklärung steht hinter `.kopf-info`.

## Stellen

quer durch `src/js` und `src/css`; die Bauteile selbst in `05b-recap-teile.js`, `09-ui-infra.js`, `09c-zeichen.js`, `13-view-awards.js`, `16-sheet-infra.js`, `30a-news-karte.js`, `30b-news-spieltag.js`, `31-news-detail.js`, `31a-news-detail-mitte.js`.

## Prüfung

`tests/blatt` (Geometrie, Bauteile, Text und Bewegung jedes Reiters und Blatts bei 360 px), `tests/bewegung` (Wischgeste, Abschlüsse), `tests/rechnen` (Tausenderpunkt ab fünf Stellen, Jahr eines Tages im Satz, Dauer in Monaten und Jahren), `tests/zeichen` (alles in der Mitte: Katalog, Kachel, Wappen, Initialen), `tests/blatt` (was im Feed endlos läuft, bewegt nur transform und opacity; Platz 1 bis 3 mit Rahmen, Schein und glänzender Ziffer, ohne Strich, nichts in der Rangliste bewegt sich ohne Anlass, die offene Liga rechnet weder Stil noch Layout; das Profil lebt, wo etwas gewonnen ist oder läuft, endlos nur mit transform und opacity, bei Bewegungsruhe still), `tests/tafel` (Strich, Award-Tabelle, Kalendertag, Formatierer), `tests/zeichen`.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Derselbe Spieler sieht in
Rangliste, Positionen, Awards, Team-Blatt, Podest und Profil gleich aus.
Das Wappen ist `.rav` (`insAvWrap`), das Podest ist `.podest`/`.pod-karte`
(`_chronPodestHtml` zeichnet es für Monats- und Rekord-Blatt aus derselben
Reihenfolge — zwei Podeste für dieselbe Aussage wären eins zu viel; den
Platz nimmt es aus dem Wert (`_chronPlatz`), nicht aus der Reihenfolge:
die zwei punktgleichen Halter von „Der Unaufhaltsame" standen als 01 und
02 da, während die Notiz darunter „punktgleich" sagte),
die Segmentwähler sind `.ui-switch` (äußere Ebene: eine Wanne, in der ein
Schlitten zur Wahl gleitet) und `.ui-tabs` (innere Ebene: eine Grundlinie,
unter der der Strich wandert), das Rangabzeichen ist `.rangab`
(`rankBadgeHtml`), und wer die Karte des Tages tragen darf, sagt
`_newsTagKarteWuerdig` [§C33].
**Die Wahl fährt.** Lage und Breite des Schlittens rechnet das CSS aus
Zahl und Lage der Knöpfe (`:has`, `--n`, `--i`); weil jeder Wechsel die
Ansicht neu zeichnet, merkt sich der Druck auf einen Knopf die alte Lage,
und `schlittenFahren` (aus `render` und `openSheet`) lässt ihn von dort
anfahren — sonst spränge er. Im Inhalt fährt er schon vor der Rechnung los
(`_wahlSofort` [§C43]) und nach dem Neuzeichnen an derselben Stelle weiter. Die Box behält ihre feste Lage und Breite;
ausschließlich `transform` verschiebt sie. Animiertes `left`/`width`
löste sonst in jedem Bild ein neues Layout aus. Der Test misst die echte
Lage einschließlich Transformationsmatrix, nicht nur den CSS-Startpunkt.
Ein Wähler mit verschieden breiten Knöpfen
trägt `.roll` und seinen Strich am Knopf; dort kann nichts gleiten. Der
äußere Wähler ist die erste Wahl einer Seite: in der Liga der Zeitraum,
der vorher als innere Ebene gleichrangig über „Spieler · Teams" und der
Metrik stand. Der Monat steht darunter als Reihe aus Zellen, eine je
Tag: gespielt hell, ohne Partie leise, heute gerahmt — der Balken zeigte
nur, wie viel Kalender vergangen ist. Gezählt wird nach Kalendertag
(`tagKey`), über Millisekunden verrutscht ein Tag an der Zeitumstellung.
Die untere Leiste trägt den gewählten Reiter in einer Pille, die als Schlitten von Reiter zu Reiter gleitet [§C43], und die
Titelmarke der Ranglistenzeile steht in ihrer Kachel.
**Ein Gesicht hat eine Grundform** (`.av`). Es gab nur Regeln je Behälter
— Ranglistenzeile, Duo-Chips, Rückblick —, und wo ein Avatar ohne eigenen
Behälter stand, war er ein Blockelement: auf jeder Rekordkarte und in der
Chronik-Matrix klebten die Initialen oben links und wurden abgeschnitten.
Die Grundform zentriert; ein Behälter setzt nur noch Größe und Rundung.
Wo keiner das tut, misst `--av`: unter 48 px fällt das Wappen weg
(`insAvWrap`), und das Gesicht kam dabei ohne jede Größe zurück — das Duo
einer Durststrecke stand im Feed als „LMA" da.
**Ein Award hat ein Zeichen** (`AW_IC`). Die Tabelle stand dreimal
wortgleich in drei Funktionen, eine vierte im Duo-Blatt nannte zwei
Zeichen, die es nicht gibt („Schlechtestes Team" und „Baustelle" standen
ohne), und Rückblick und Liga suchten sich ihres selbst aus: Wochen- und
Tageskönig trugen dieselbe Krone, der Pechvogel das Gespenst der
schwächsten Bilanz. Auch der Name kommt von einer Stelle
(`AWARD_META.title`); nur wo ein Drittel der Zeile nicht reicht, steht
die Kurzform („Siegesserie", „Überraschung") — „Heißeste Serie" war ein
dritter Name für dieselbe Liste. Und **ein Name gehört einer Frage**: der
Award „Einzelkämpfer" (Siegquote als Stärkster der vier) hieß wie der
Liga-Rekord, der den Rückgang der Mitspielerstärke misst, und heißt jetzt
„Leitwolf". Torjäger, Pechvogel und Favoritenschreck teilen ihren Namen
mit einer Chronik, weil sie dieselbe Idee auf zwei Zeitachsen messen. `tests/tafel` sieht nach, dass jedes
Zeichen im Katalog steht.
**Ein Knopf in einer Zeile ist so breit wie sein Wort.** `.btn` trägt
`width:100%`, weil er meist allein steht; neben einem Text lief „Neu laden"
damit 112 px aus den Einstellungen, und „Mischen" zog sich über die halbe
Seite. `tests/blatt` zeichnet jeden Reiter bei 360 px ganz und misst beides.
**Eine Animation endet, wenn sie endet** (`_afterTransition`). Beim
Zurückgehen aus einem Blatt schiebt sich das Kind nach unten, der Inhalt wird
getauscht, das Eltern-Blatt kommt hoch. Der Tausch hing an `setTimeout(200)`,
und ein Timer ist nicht das Ende einer Transition: er läuft ab dem Aufruf,
die Transition erst ab dem nächsten Style-Flush. Der Umbau des Eltern-Blatts
fiel damit in die letzten Bilder des Zuschiebens und riss sie ab — gemessen
kostet der Feed dabei über 100 ms Hauptthread, 94 % seines Markups sind die
SVG der Wappen. `_afterTransition` horcht auf `transitionend` des eigenen
Elements und hält einen Timer als Rückfall, denn eine Transition, die nie
startet, endet auch nie. Je Element/Eigenschaft gehört genau ein abbrechbarer
Abschluss zum aktuellen Übergang; Öffnen/Schließen oder ein neuer Übergang
entfernt alte Listener und Rückfall-Timer. Doppeltes Schließen invalidiert
keinen laufenden Leerschritt. Ein schon abgeschlossener Wisch leert sofort,
ohne auf eine zweite, gar nicht mehr stattfindende Bewegung zu warten.
Inline-Snap-/Swap-Dauern und Nudge werden nicht übernommen. Popover und
gequeute News-Hinweise bleiben auch bei bereits geschlossenem Blatt erreichbar.
`tests/blatt` und `tests/bewegung` messen Abschlüsse und verbleibende Arbeit.
**Der Finger besitzt den Zug.** Eingabefelder und bereits gescrollte
innere Listen gehören nicht der Schließgeste. Waagerechte/aufwärts gerichtete
Gesten lösen den nicht passiven Zug-Lauscher. Gezeichnet wird nur der
jüngste Stand einmal je Frame; Öffnen, Schließen, Abbruch oder ein zweiter
Finger entziehen alten Bildern den Besitz und entfernen `is-dragging`.
Wischgeschwindigkeit zählt die letzte kurze Strecke, nicht Gesamtweg geteilt
durch die Zeit seit der letzten Bewegung. Pause, Mindestweg und langer
langsamer Zug bleiben eigene Fälle. Bei Bewegungsruhe werden Blätter sofort
getauscht/geleert. Nur Knöpfe verzichten auf die Doppeltipp-Zoom-Geste;
Seitenzoom und natives Scrollen bleiben frei, Tastaturfokus ist sichtbar.
Im Feed gliedert der **Tageskopf** (`.nf-tag`) die Tafel: Wochentag
ausgeschrieben, Datum daneben, die Zahl der Karten rechts — und sonst
nichts. Er trug zuerst die Schlagzeile der wichtigsten Karte, und
die stand damit zweimal untereinander; danach die Bilanz des Tages und die
Gesichter, die wiederholten, was die Karten darunter ohnehin zeigen: vier
Wappen über vier Karten, auf denen dieselben vier Wappen stehen.
Er ist eine **Marke auf dem Zeitstrahl, keine Karte**: mit Rahmen und Füllung
sah er aus wie eine ungeöffnete Story und stand mit den Karten darunter auf
einer Ebene. Sein `data-tag` trägt den Tagesschlüssel, damit sich prüfen
lässt, ob an diesem Tag gespielt wurde — `_newsTagMs` beantwortet das,
seit die Bilanz aus dem Markup verschwunden ist.
Über jeder Karte steht das **Rubrikband** (`.nf-top`, `_newsRubrik`,
`_newsSorteIcon`): Zeichen und Rubrik links, Uhrzeit rechts, wie in einer
Zeitung. Vorher trug jede Karte eine gefärbte Pille mit dem Kategorienamen
aus der Datenbank („Badge & Awards"), und zehn Pillen in zehn Farben
untereinander waren ein Farbverlauf ohne Aussage. Das Band ist **leiser als
die Schlagzeile** — es sagt, woher die Nachricht kommt, und überlässt ihr
den Platz.
Die **zwölf Kartenformen** (`.nf-s-spiel`, `-tafel`, `-ins`, `-held`, `-woche`,
`-duell`, `-serie`, `-badge`, `-marke`, `-fakt`, `-spieler`, `-erfolg`,
vergeben von `_newsSorte`) sagen vor dem ersten Satz, worum es geht: der **Kopf nach
dem Anlass** (`_spBild`) beim Spieltag, die **Tabelle der Runde** bei dieselben
Vier, das **Ergebnisband** (`_newsErgebnisBand`) über jeder anderen Karte
einer Partie, der **große Wert** (`_newsWertBlock`)
bei einem Rekord, die **Leiter** (`_newsLeiter`) beim Insignium, der
**Bilanzbalken** (`_newsBilanzBalken`) beim Duell, der **Serienlauf**
(`_newsSerienBand`) bei einer Serie, das **Sammelband**
(`_newsSammelBand`) unter einer Sammelkarte, das **Zahlenband**
(`_newsZahlband`) im Fuß. Vorher unterschied die Sorten nur eine Randfarbe, und zehn Karten
untereinander sahen alle gleich aus. Rivalität, Serie und Duo waren zuletzt
noch EINE Sorte, und an einem Spieltag standen drei Karten „ZU ZWEIT"
untereinander, die von drei verschiedenen Dingen erzählten.
Jede Karte trägt außerdem ihr **Motiv** (`_newsMotiv`) — dasselbe Zeichen wie
im Rubrikband, groß und leise am rechten Rand, ganz innerhalb der Karte, weil
es angeschnitten wie ein Fehler aussah, mit einem weichen Schein dahinter,
weil es als reine Kontur auf dem Telefon von einem Kratzer nicht zu
unterscheiden war — und einen **Winkel** (`.nf-chev`)
neben dem Satz, der sagt, dass sie sich öffnet.
**Keine zwei Rubriken tragen dasselbe Zeichen**: der Spieltag trug gekreuzte
Klingen und das Duell trägt Klingen, und als Motiv nebeneinander war das
dieselbe Zeichnung in zwei Größen. Das Zeichen sitzt in einer eigenen
**Kachel** — frei stehend war es ein Strich von elf Pixeln neben der Schrift
und von ihr kaum zu unterscheiden.
Der Grund der Karte hat zwei Stellschrauben: `--neu` ist der Anlauf von
links, solange sie ungelesen ist, `--tint` der Schein aus der Ecke in der
Farbe ihrer Rubrik. Beide als Variable, weil die Sorte sonst den
Ungelesen-Zustand überschrieben hätte — und das ist der wichtigere.
Die Sorte setzt dafür genau eine Familie über `--story` und `--story-rgb`:
Gold für Tages-/Wochensieger, Silber für Tafel/Bestmarke, Violett für
Laufbahn/Auszeichnungen, Grün für Spiel/Serie und Bronze für Duelle. Fakten
greifen dieselben Familien als besonders schwachen Farbschnitt auf; ihre
gespeicherte `ambientRubrik` setzt dazu Klasse und sprechenden Rubriknamen.
Karten derselben Familie unterscheiden sich nur in der Stärke
ihres Schimmers. Das hält den Feed ruhig und verhindert zugleich, dass
Tafel, Insignium, Auszeichnung und Sammelkarte alle golden aussehen.
**Jede Karte hat eine Bildzone.** Eine Karte, die nur aus Text besteht, ist
eine Zeile in einer Tafel voller Zeichnungen — `tests/blatt` verlangt für
jede Sorte mindestens eins der Bauteile dieses Abschnitts.
**Die Bildzone macht die Karte nie höher als ihren Text.** Die beiden Wappen
eines Duells standen übereinander in der linken Spalte und machten die Karte
56 Pixel höher als ihr einzeiliger Satz; daneben war nichts. Sie stehen
jetzt als Band über dem Text. Ein einzelner Wert stand als eigener Streifen
im Fuß und füllte dort eine Zeile mit zwei Wörtern; er steht jetzt neben dem
Wappen. Und der Serienlauf sagt rechts, was seine Punkte zählen — sonst war
die halbe Bandbreite leer.
**Und sie nimmt der Schlagzeile nicht den Platz.** Ein Wert UND ein Bild
standen NEBENeinander, und die Spalte war damit so breit wie beide zusammen:
gemessen 169 von 316 Pixeln, also 53 % der Karte, während die Schlagzeile
auf 77 px zusammengedrückt wurde und mitten im Satz abbrach („Maxi, Julian,
Jane und Johannes übernehmen „Der …"). Sie stehen deshalb **übereinander**,
und dann ist die Spalte so breit wie das Breitere von beiden — gemessen
23 %. Das gilt für beide Bildformen, die Chips einer Tafel-Karte und das
einzelne Wappen einer Marke, wo Wappen und Elo-Wert nebeneinander 36 %
nahmen; ein Duo bleibt ausgenommen, dort sind die zwei überlappenden Wappen
selbst die Aussage. **Auch die Aufschrift zieht die Spalte nicht auf**: sie
endet bei 72 px, weil „ELO VORSPRUNG" auf einer Karte ohne jedes Bild 28 %
belegte. Der Name der Zahl bleibt trotzdem der der Kammer und nicht ihr
Kürzel — „Marken" unter einem einzelnen Bestwert wäre eine Mehrzahl über
einen Wert [§C35].
**Ein Deckel schneidet ab, statt zu schrumpfen.** Die Chipgruppe trägt
`flex-shrink:0`, und bei 72 px stand der Deckel mitten in ihr: zwei Wappen
und ein „+2" sind 30 + 19 + 19 Pixel, und das dritte Zeichen war weg. Der
Deckel liegt deshalb bei 81 px — 68 px Inhalt plus die 13 px des
Trennstrichs. Gemessen wird nicht nur die Breite der Spalte, sondern ob ein
Kind über ihren Inhalt hinausragt: eine Spalte, die ihre eigene Zeichnung
abschneidet, ist so falsch wie eine zu breite. Gemessen wird in Prozent und nicht in Pixeln: die Karte
ist auf jedem Telefon anders breit. `tests/blatt` stellt dafür jede der
zwölf Sorten einmal — der Feed eines Zeitschnitts trug gemessen fünf davon,
und gerade die Marke kam nicht vor.
Im Satz stehen Ergebnis,
Zahl, Datum und Name **fett** (`_newsBetont`): eine Ableitung aus dem Text
wie `_isBreaking`, also auch an persistierten Karten. Der **Filter** sind
vier Chips mit Anzahl und Zeichen (`.nf-chip-f`) statt elf Rubriken, und der
**Gelesen-Knopf** (`.nf-gelesen`) steht neben der Zahl, die ihn erklärt.
Es gibt **eine** Kartenform, nicht zwei: das Mini-Popup über dem
Glockenknopf ist entfallen. Es zeigte dieselben Stories in einer viel
einfacheren Karte — Kategorie-Pille aus der Datenbank, Titel, Text, ohne
Motiv, ohne Sammelband, ohne Gesicht —, und erreichbar war es zuletzt gar
nicht mehr: der Knopf öffnet seit langem direkt den vollen Feed. Der Feed
ist an `.nf-wrap` erkennbar; `_isNewsFeedOpen` fragte nach der Popup-Klasse
`.nv-list-flat`, war damit immer falsch, und eine Story, die per Realtime
hereinkam, erschien erst beim nächsten Öffnen.
**Breaking bricht die Spalte**: die Karte steht breiter als jede andere und
ist daran erkannt, bevor ein Wort gelesen ist; ihr Rahmen glimmt, weil ein
stehender roter Rahmen beim Scrollen ein Farbton unter vielen war. Die
**Karte des Tages** bewegt sich leiser: Ein goldener Auswahlschimmer wandert
einmal alle sieben Sekunden durch ihr Band, der goldene Stern atmet und ein
warmer Goldschein liegt wie bei Breaking hinter der gesamten Karte. Ihre
eigentliche Familie bleibt gleichzeitig an Kante, Rubrik und Motiv sichtbar;
eine Tafelgeschichte wird durch die Auswahl also nicht vollständig golden.
Beides ruht bei
`prefers-reduced-motion`, und `tests/blatt` misst das nach.
**Dasselbe Licht liegt, wo Gold einen Titel bedeutet und EINER ihn trägt**
(`glanzZug`, `06-misc.css`): der Erste in Gold auf jedem Podest, der
Spieler des Tages und der Woche im Feed, solange ungelesen, samt dem Kopf
ihres Blatts, und der Held der Rückblicke. Nirgends sonst — ein Licht auf
jeder goldenen Zahl wäre eine Kirmes, und Gold trägt nur, was selten ist
[§C25]. Ein eigenes Pseudo-Element über der Box, ohne `overflow:hidden`:
die Aura des Ersten leuchtet über das Podest hinaus und wäre sonst abgeschnitten.
Anderthalb Sekunden Lauf, gut sechs Ruhe; bei Bewegungsruhe fehlt es ganz.
`tests/blatt` misst, wer es trägt, wer nicht, und dass es ruht.
**Im Profil lebt, was gewonnen ist oder gerade läuft.** Das Profil stand
ganz still: ein Meistertitel, ein gehaltener Rekord und ein laufender Monat
sahen aus wie jede andere Karte. Ein erster Entwurf gab jeder Fläche
Metall, Verläufe und einen Strahlenfächer hinter dem Insignium — das war
moderner als der Rest der App und gab dem Kopf einen Schimmer, den jeder
hat (`mockup/profil`). Jetzt bleiben Material und Schrift, und bewegt wird
nur mit dem, was die App schon kennt: der Lichtlauf des Goldes über Titeln,
Rekorden, Platz 1 und legendären Auszeichnungen, versetzt Karte für Karte;
ein Licht um den Rand des Kopfs, der sonst von Aura und Insignium lebt; die
Elo-Kurve, die sich einmal zeichnet; Form-Punkte, die aufspringen; der
laufende Monat und der eigene Rang, die atmen. Endlos läuft nur transform
und opacity, nichts hängt am Scrollen, und bei Bewegungsruhe steht alles.
**Das Seltene im Feed trägt einen leiseren Lauf in der Farbe seiner
Familie** (`_newsGlanz`, `.nf-glanz`): Spitzenwechsel, übernommener Rekord,
Insignium-Stufe, erster Chronik-Eintrag, seltene und legendäre
Auszeichnung, eine Serie ab fünf und die Partie-Köpfe Medaille, Wippe,
Premiere und Serienbruch. Bewegung hatten vorher nur Breaking, die Karte
des Tages und die Sieger des Tages und der Woche; alles dazwischen stand
still, und ein Spitzenwechsel sah aus wie ein gewöhnliches 10:7. Nicht in
Gold — Gold gehört dem Titel —, nicht auf einer negativen Karte und nicht
doppelt auf Breaking oder der Karte des Tages; alle elf Sekunden, versetzt
nach der ID, damit nicht alle Lichter im selben Takt laufen. Gemessen
tragen ihn zehn von 77 Karten des Fensters.
**Der Hinweis „x neue Stories" hat zwei Zeilen** (`_newsToastFuellen`,
`_newsToastZeigen`): „15 neue Stories" neben einem Zeichen auf einer Marke
in Acid — die Zeitung der Pille mit einem Funken, der beim Erscheinen
zweimal aufblitzt, während das Blatt zweimal kippt (`.nh-ic`) —, darunter
leise die Schlagzeile der wichtigsten ungelesenen Story —
Breaking, wichtig, Priorität, die neueste, nie ein Name — mit einem Punkt
in der Farbe ihrer Karte (`_newsTonKlassen`, dieselben Klassen wie Karte
und Blatt), höchstens zwei Zeilen. Er hält links wie rechts mindestens
12 px Abstand zum Rand. Beim Erscheinen fährt zweimal Licht um seine Kante,
von der Pille geht ein Ring aus, ihre Zahl springt auf [§C43]; dann steht
er still. Der erste nach dem Öffnen steht 7 s, jeder weitere 4 s
(`NEWS_TOAST_START_MS`, `NEWS_TOAST_MS`). Er war zuerst eine flache grüne
Pille in der Schrift jedes Knopfs, die niemand bemerkte; danach eine
leuchtende mit Lichtlauf alle vier Sekunden, und ein Entwurf trug noch
einen Strich je Story, Gesichter, Rubrik und eine ablaufende Linie — zu
viel für wenige Sekunden. Beim Öffnen sieht man zuerst der Liga beim
Aufbauen zu; in vier Sekunden war der Hinweis oft fort, bevor der Blick
nach oben ging. Bei Bewegungsruhe steht er still.
**Der Rand sagt, wie schwer eine Karte wiegt** (`--kante`, `--rahmen`): Nur
Tages- und Wochensieger tragen die starke Goldkante; die Karte des Tages
bekommt unabhängig von ihrer Sorte einen feineren Goldrahmen samt äußerem
Schein. Alle anderen Sorten behalten eine ruhige Kante ihrer Familie. Der Fun Fact bleibt am leisesten, Rot
bleibt der Richtung. „Wichtig" leuchtet und verbreitert nicht — als es die
Kante auf vier Pixel setzte, trug ein Fun Fact denselben Rand wie ein
Liga-Rekord.
Eine Karte, die von einer Pleitenserie oder einer Schande erzählt, trägt
`.nf-neg` und damit Rot in Rubrik und Motiv [§C25] — die Durststrecke stand
vorher im selben Grün wie die Siegesserie.
**Jedes Blatt hat denselben Bau**: `_newsBlattKopf` (das Ergebnis der Partie,
dann Wappen, Name und darunter Rang, Zeichen und Prestige), die typ-eigene
Mitte aus `_newsDetailMitte`, dann `_newsBlattFuss` (der Weg weiter). Es gibt
einunddreißig Story-Typen, und jeder brachte sein eigenes Blatt mit: wer zwei
nacheinander öffnete, fand nichts an derselben Stelle. Die Partie steht dabei
höchstens einmal im Blatt — `_ndKopfMatch` merkt sich, was der Kopf schon
zeigt, damit `_newsMatchVsBlock` sie nicht wiederholt.
Jede Öffnung setzt den tatsächlichen Scrollbehälter `#nd` vor dem Markup auf
null, auch dieselbe Story und ein Faden aus dem offenen Detail; der Feed
darunter bleibt an seiner Stelle. Nur sichtbare Bausteine werden gebaut:
eigene Bühnen brauchen kein verworfenes Ergebnisband, gruppierte Listen
keine zweite flache Liste und Matchbündel nur die tatsächlich gezeigten Zeilen.
**Das Blatt setzt fort, was die Karte angefangen hat**: dieselbe Rubrik,
dasselbe Motiv, dieselbe Zeichenkachel, dieselben fetten Akzente, dazu eine
Haarlinie und einen schwachen Flächenschimmer in der Farbe der Sorte am
Kopf. Auch eine negative Serie bleibt nach dem Öffnen rot. Sein Kopf trägt das
**Rangabzeichen** (`rankBadgeHtml`) — das Bauteil, das die App schon hat
[§C27]; dort stand statt seiner die Zeile „Rang 6" als nackter Text. Vorher stand oben der
Kategorienname aus der Datenbank, den es auf der Karte seit dem Rubrikband
nicht mehr gibt.

**Was oben steht, steht unten nicht noch einmal** (`_ndNeu`, `_ndOben`). Der
Kopf des Blatts zeigt Schlagzeile und Text der Karte; steht derselbe Satz
darunter ein zweites Mal, liest man ihn zweimal und erfährt nichts. Beim
Angstgegner stand „5× in Folge gegen denselben Gegner" als Bedingung im
Medaillon und drei Zeilen darüber im Text schon „Fünf Pleiten in Folge gegen
Maxi". Die **Beschriftung** einer Zeichnung ist davon ausgenommen: der Name
des Zeichens steht neben dem Zeichen, weil er dazugehört.

**Das Blatt einer Partie aus dem Verlauf nennt, wer gewonnen hat**
(`showMatchDetail`). Dort stand „Team A gewinnt", und die Siegchance vor
dem Anpfiff gab es nur nach Aufklappen der Elo-Analyse. Sie steht jetzt
unter der Bühne, aus derselben Quelle wie die Karte der Partie im Feed (die Erwartung
der Elo-Bahn, dahinter `exp_a`). Die Auszeichnungen stehen einmal je
Spieler: fünf Marken zweier Spieler waren fünf Karten mit dreimal
demselben Namen. Und die vier Namen der Elo-Liste führen ins Profil — von
dort ging es nur zum Duo weiter.
**Das Blatt einer Partie zeigt, was in ihr zu sehen war** (`_ndBuehne`,
`_ndChanceSkala`, `_ndEloWirkung`, `_ndDuelle`, `_ndTagLeiste`,
`_ndVerteilung`). Oben steht die **Zeichnung der Karte als Bühne**: das
Blatt zeigte einen nackten Stand und zwei Wappen mit „gewinnen diese
Partie", und wer eine Karte wegen ihres Mosaiks öffnete, verlor das Bild.
Darunter stehen Zeichnungen in fester Folge — die Aufstellung, die
**Siegchance auf ihrer Skala** mit den drei Linien der Elo-Rechnung [§5.2]
und dem Wort dazu, die **Elo-Wirkung je Spieler** als Ausschlag um die Null
mit dem Rangwechsel dahinter, die **direkten Duelle** der Sieger gegen die
Verlierer als Bilanz und Lauf, **der Tag** als Leiste mit dieser Partie
gerahmt und **wie oft die Liga so ausgeht** als Säulen. Jede nur, wo die
Bühne sie nicht schon zeigt: das Spielfeld trägt Siegchance und Elo, also
nennt der Abschnitt darunter nur noch, wer in der Tabelle den Platz
gewechselt hat, und als Abschnitt zeigt das Spielfeld nur die Aufstellung.
**Kein Satz erklärt eine Grafik.** Der Abschnitt „Was dieses Spiel besonders
macht" stand als „Außenseiter-Sieg · Die Rechnung stand dagegen" über einer
Skala, die genau das zeigt; der Entwurf trug unter jedem Abschnitt eine
Zeile Kleingedrucktes. Beides ist weg.
**Ein Balken wächst, er erscheint nicht.** Eine Zahl, die man gezeichnet
sieht, versteht man schneller; eine Zeichnung, die aufgeht, sieht man
überhaupt. Bewegt wird nur Deckkraft und Höhe: die BREITE ist die Aussage,
und wer sie animiert, misst während der Bewegung eine falsche Länge. Die Bahn
läuft dazu von links auf, in Spielreihenfolge — so liest man den Tag in der
Richtung, in der er passiert ist. Beides ruht bei `prefers-reduced-motion`,
wie der Puls von Breaking und der Schimmer der Karte des Tages.
**Der Spieltag steht als Bahn, nicht als Wand** (`_ndTagesbahn`). Das Blatt
des Spielers des Tages zeigte jede Partie als vollen Vs-Block: vier Wappen,
zwei Namenszeilen, ein Stand. An einem Tag mit zehn Partien sind das zehn
solche Blöcke und vierzig Wappen — genau davor warnt „Detail folgt der
Größe" [§6]. Die Bahn zeigt den Tag in einer Zeile: ein Feld je Partie, grün
für einen Sieg, rot für eine Niederlage, in Spielreihenfolge. Darunter steht
jede Partie kurz mit Uhrzeit, Stand und Gegner — der Beleg ohne die Wand.
**Und ein Blatt, dessen Karte nur zwei Zahlen hat, zeigt sie gezeichnet.**
Der Saisonstart nannte allein die Saison-ID — eine Zeichenkette, die
niemanden interessiert —, obwohl die beiden an der Spitze, ihr Abstand und die
Stichprobe im `dataRef` liegen: er zeigt sie als Vs-Block und Zahlenreihe
[§C27]. Und der Serienbruch zeigt die gerissene Serie als **Lauf**
(`_newsSerienBand`): acht ist eine Zahl, die Reihe zeigt, wie lang acht sind.
**Jedes Blatt zeigt, wovon seine Story handelt.** Die Karte „X trägt den
Schildring" öffnete ein Blatt mit NULL Zeichen Inhalt, und fünf ambiente
Karten zeigten „Im Fokus: Name" — den Namen, den der Kopf zwei Zeilen
darüber schon nannte. Der **Insignium-Block** (`_newsInsigniumBlock`) trägt
jetzt die Zeichnung groß, die Stufe, die Punkte, den Balken zur nächsten
Schwelle und die Leiter; jede ambiente Karte trägt ihren Wert groß, und wo
es ums Prestige geht, steht der Block dabei — er IST die Aussage. Der
Blattkopf nennt Stufe und Prestige dann nicht noch einmal als Text: dafür
wird die **Mitte zuerst gebaut** (`_ndZeichenUnten`), sonst weiß der Kopf
nicht, was unter ihm steht.

Und es schmückt aus, wo es etwas zu feiern gibt: das
**Medaillon** (`_newsMedaillon`) bei einer Auszeichnung — Zeichen im Ring der
Klasse, darunter Bedingung und Halterzahl [§C34] —, der **große Wert**
(`.nd-gwert`) und die **Verfolger** (`_newsVerfolger`, die drei Besten aus
`chronicleRang`) bei einem Rekord, der **Serienlauf** bei einer Serie, der
**Bilanzbalken** beim Duell, die **Partien des Tages** (`_newsTagPartien`)
beim Spieler des Tages. Der ganze Awards-Reiter hatte im Blatt vorher
gar keinen Fall: wer eine Rekord-Karte öffnete, sah den Satz, den er auf der
Karte schon gelesen hatte. Wer ein zweites Bauteil für dieselbe Aussage baut,
hat einen Fehler gemacht.
**Die Award-Kachel ist EIN Bauteil** (`awKachelHtml`, `.aw-trophy`) und
steht in EINER Vitrine (`awVitrineHtml`): im Awards-Reiter, im Award-Blatt
des Profils und im Duo-Blatt. Das Profil baute zuerst die alte Fassung
(`aw-trophy-cup`, `-plaque`), das Duo-Blatt eine dritte mit sechs
Katalogfarben und „#2" als Platz. Die Kachel beantwortet drei Fragen in
dieser Reihenfolge: **wer** hat es (Wappen, Name, Stichprobe), **wie
viel** (Zahl mit ausgeschriebener Einheit, unten, damit die Zahlen einer
Reihe auf einer Linie liegen), **woraus** (die Lage im Feld,
`awFeldHtml`: jeder Eintrag der Liste als Punkt, die Halter in der Farbe
der Kachel, die Mitte als Strich — eine Serie stattdessen als Lauf,
`awLaufHtml`). Vorher stand die Zahl ohne Einheit da („6,90", „+10",
„8er"), und die Stichprobe wurde gebaut und nie gezeigt. Gleichauf und
„Platz 2" stehen als Marke AUF der oberen Kante: im Kopf nahm die Marke
dem Namen ein Drittel der Breite, und „Tageskönig" brach mitten im Wort.
Eine leere Kachel sagt, was fehlt (`AW_LEER`), statt einen Strich zu zeigen.
**Und ihr Wert kommt aus EINER Tabelle** (`AW_WERT`, [§5.3d]): Liste,
Sortierung, Zahl, Einheit, Stichprobe, Mindestbedingung (`gilt`) und die
Art (`lauf`, `einzeln`, `gegner`). Kachel, Award-Blatt, Profil,
Duo-Blatt, Award-Sammler und Saison-Rückblick lesen daraus
(`awListe`, `awTop`, `awRang`, `awText`, `awNeg`); vorher standen dort
vier Sortier- und fünf Anzeigetabellen, und dieselbe Serie hieß „8",
„8er", „8er Serie" und „8 Siege in Folge". Wer einen Award hinzufügt,
trägt ihn in `AWARD_META`, `AW_IC` und `AW_WERT` ein — sonst nirgends.
`tests/tafel` hält Kachel und Profil an der Tabelle fest.
Der Farbstich kommt aus **drei** Rollen und nicht aus sechs Katalogtönen
[§C25]: `ton-pos` Gold für das Können, `ton-team` Blau für das, was zu
zweit geholt wurde, `ton-neg` Rot für die Kehrseite. Die Töne stehen an
der KACHEL, nicht am Behälter — im Profil-Sheet gibt es keinen gefärbten
Behälter, und dort fiel die Farbe damit ganz aus.
**Ein Zeichen mit Fläche steht in der Zeichenkachel** (`zkHtml`, `.zk`):
drei Größen (28, 36, 48 px) und sechs Töne nach den Rollen des
Farbgesetzes, ohne Ton Metall. Vorher baute jede Ansicht ihren eigenen
Kasten um ihr Zeichen.
**Eine Behauptung hat einen Beleg** (`belegHtml`, `05b-recap-teile.js`).
Rekord-, Award-, Chronik- und Rekord-Story-Blatt belegten ihren Wert mit
einem Satz; „72 %" aus fünfzig und aus fünfhundert Partien standen gleich
da, und ob der Zweite knapp dahinter liegt, stand nur in der Liste. Vier
Formen in fester Reihenfolge, jede nur, wo sie etwas sagt: **Woraus** (die
Stichprobe als Zellen, eine je Gelegenheit, aus dem „x von y" des Belegs —
ohne das fällt die Form weg, statt eine zu erfinden), **Wo im Feld**
(`belegFeldHtml`: jeder im Rennen als Punkt, der Halter golden, die Mitte
als Strich, darunter der Zweite in einem Satz; die Award-Kachel zeichnet
dasselbe Bauteil in ihrer Rollenfarbe), **Wie knapp** (`belegLuftHtml`:
wie viele der eigenen Ergebnisse anders hätten ausgehen müssen, damit der
Zweite gleichauf läge — als große Zahl, als Zellen, als Wort von
„hauchdünn" bis „deutlich" und als zwei Balken; nur, wenn der große Wert
selbst ein Anteil ist und es einen Zweiten gibt. Dort stand vorher die
Spanne um den Anteil, Wilson mit 90 %, und darunter „wären ein paar
Partien anders ausgegangen, läge der Wert wohl irgendwo zwischen 36 und
57 %" — richtig gerechnet und eine Frage an den Leser; eine Zahl, die man
abzählen kann, beantwortet sie) und **Wie es dazu kam**
(`rekordVerlauf`: die drei des Podests an den letzten sechs Monatsenden
und heute, in dessen Reihenfolge und Metallen Gold, Silber, Bronze, mit
„vorn seit"; vorher zeichnete er nur Halter und Zweiten, und wer auf dem
Podest darüber Dritter stand, fehlte im Verlauf). Der Fuß des Rekord-Blatts führt ins Profil des
Halters und nennt ihn auf dem Knopf; „Direkter Vergleich" öffnete die
Bilanz von Halter und Zweitem gegeneinander, die mit dem Rekord nichts zu
tun hat. Gerechnet wird nichts Neues: die Zahlen kommen aus
dem Katalog, aus `chronicleRang`, aus `AW_WERT` und aus dem Zeitschnitt.
Das Story-Blatt eines Rekords zeigt nur, woraus der Wert der KARTE
besteht — ihren gespeicherten Beleg, nicht den von heute.
**Ein Blatt hat einen Kopf, einen Fuß und einen Weg hinaus.** Der Kopf
(`blattKopfHtml`) ist die Zeichenkachel in 48 px in der Farbe der Rolle,
der Titel und darunter Zeitraum und Art. Es gab fünf Köpfe: ein
leuchtender Kreis über der Mitte im Award-Blatt, ein nackter Titel im
Rekord-Blatt, ein Kasten mit Zeichen im Chronik-Blatt, ein 48-px-Gesicht
neben „Awards" im Profil, der Stand als Überschrift im Blatt der Partie.
Blätter über einen Menschen (Profil, Duo, Direkter Vergleich, Rückblicke,
Stories) behalten ihren Heldenkopf: dort ist das Gesicht die Überschrift.
Der Kopf eines Abschnitts ist `blattAbschnittHtml` — Zeichen, Name, rechts
worauf er sich bezieht —, der Fuß `blattFussHtml`: höchstens zwei Knöpfe,
der wichtigere gefüllt. Den Knopf zum Schließen setzt `openSheet` in eine
Leiste, die beim Scrollen oben bleibt; vorher schloss ein Blatt nur durch
Wischen oder einen Knopf, den es selbst baute oder nicht.
**Eine Partie steht auf der Bühne** (`buehneHtml`): die Sieger links und
hell, die Verlierer leiser, der Stand in der Mitte, darunter Zeit, Abstand
und Siegchance — im Award-Blatt einer Partie, bei den Erzfeinden (dort die
Siege gegeneinander) und im Blatt der Partie. Im Award-Blatt standen die
Teams als Farbbalken über die volle Breite: `.aw-mini-av` hatte keine
einzige Regel.
**Der Hinweis trägt seine Rolle** (`toast`): die Zeichenkachel statt einer
vollen grünen oder roten Fläche, eine zweite Zeile mit der Wirkung, und
nach dem Speichern einer Partie „Rückgängig" (`partieLoeschen`, dieselbe
Stelle wie das Löschen im Blatt). **Die Bestätigung** (`bestaetigen`)
ersetzt `confirm()`: sie nennt, was verloren geht, der sichere Knopf steht
links und der zerstörende rechts und rot.
**Die Kennzahlen des Duo-Blatts sind gezeichnet** (`.duo-kz`): die
Siegquote jede Partie als Zelle, die Torbilanz je Partie auf ihrer Skala,
die Elo mit ihrem Verlauf, die laufende Serie als Lauf. Vorher standen
vier Kästen in vier Farben, darunter die Quote noch einmal als Balken, drei
Kästen „Serien" und ein Form-Verlauf, dessen Endwert die Elo aus dem
Kasten war.
**Ein Zeichen hat einen Strich.** Die Strichstärke steht in EINER Regel
(`svg[viewBox="0 0 24 24"]`, Token `--strich`); ein Behälter setzt
höchstens `--strich` — 1,75 ab 18 px, 1,4 für das leise Motiv der
Stories, sonst 2. Sie stand an 78 Stellen in 13 Werten zwischen 1 und 3,4,
und ein `stroke-width` am `<svg>` im Markup setzte 2,5 neben 2. Die Regel
schlägt das Markup, runde Enden und Ecken kommen mit. Diagramme und die
Sterne des Zeichens [§C26] zeichnen nicht im 24er-Raster und sind davon
ausgenommen. `tests/tafel` zählt nach.
**Der Strahl im Positions-Profil gehört der Seite, die überwiegt.** Er
lief immer von links und war so lang wie der Sturmanteil; bei 29 zu 71
zeigte er damit die kleinere Hälfte und las sich wie ein
Fortschrittsbalken, der fast leer ist. Sturm beginnt links, Abwehr rechts,
ein Flex-Profil liegt als ruhiger Kern in der Mitte. Der Knopf bleibt an
der Grenze zwischen beiden — die ist die Aussage.
**Die stärkere Rolle trägt ihre Farbe, die schwächere steht zurück**
(`.pp-rd.stark` / `.schwach`). Beide gleich laut gezeichnet sagten nicht,
worin jemand besser ist, und genau das beantwortet diese Karte. Welche
stärker ist, sagt `positionsLage` (`staerker`) [§C44], die Leistung gegen
die Erwartung je Position, nicht die rohe Siegquote: die kannte weder
Partner noch Gegner und zeichnete nach zwei Sturmpartien ohne Sieg die
Abwehr hell. Bis drei Prozentpunkte Abstand gelten beide als neutral. Die Nebenrolle bleibt mit
78 % Deckkraft lesbar, die starke Rolle bekommt nur einen kleinen Schein;
auch Abwehrdominanz behält die Rangfarbe statt auf Metallgrau zu fallen.
**Ein langer Wert in der Zahlenreihe wird kleiner, nicht breiter.**
„Schattenseite" maß gerendert 104 px in einer 88-px-Zelle und lief in die
daneben, in der der Ausschlag steht. Zwei Stufen (`.lang`, `.sehrlang`)
reichen; `tests/blatt` misst jede Chronik des Katalogs nach.
**Die Kachel misst am Reif, nicht am Gesicht** — der Avatar ist 46 % von
`--rav`. Wer ein 40-px-Gesicht ersetzt, braucht 87 px Kachel, nicht 40.
Unter 48 px bleibt vom Zeichen nichts übrig; 52 px sind das Maß der
Ranglistenzeile und die Untergrenze.
**Das Banner trägt es nur, wo ein Spieler allein und groß steht:**
Profilkopf, Podest der Ewigen Tafel, Podest der Award-Sammler, die Karte
des Spielers der Woche und des Tages, das Podest im Saison-Rückblick.
Aura, Raute und Sterne erzählen von der LAUFBAHN; in einer Zeile fehlt ihnen
die Höhe, und in einem Team-Blatt handelt die Seite vom Duo, nicht von
den Titeln eines Einzelnen.
Das Insignium hat drei Teile, die in jeder Stufe an derselben Stelle
stehen: den **Reif** um das Gesicht, den **Kopf** auf zwölf Uhr und die
**Raute** am Fuß (`_insFuss`) — daran bleibt die Familie erkennbar, auch
wenn der Schmuck dazwischen vollständig wechselt [§C30].
**Der Platz im Feed ist der der GESAMTLIGA** (`_newsGesamtrang`). Die Zahl
kommt aus `careerElo` und ist damit der Rang unter dem Zeitraum „Gesamt"
des Liga-Tabs, nicht der der laufenden Saison — beide können weit
auseinanderliegen. Als „Rang 7 in der Liga" auf einer Karte über einen
guten Spieltag stand, behauptete sie das Gegenteil dessen, was gerade
passiert war: derselbe Spieler war in diesem Monat Zweiter. Gerechnet wird
es an EINER Stelle; die Zeile im Blatt rechnete es ein zweites Mal nach.
**Zwei Rechnungen über dieselbe Frage werden aneinandergehalten.**
`longestStreaks` trägt die Bestenliste des Awards-Tabs, `longestPlayerStreak`
den Wert einer Auszeichnung — zwei Durchläufe über die längste Siegesserie.
Sie zusammenzulegen kostet mehr, als es bringt: die Liste rechnet alle
Spieler auf einmal, das Badge fragt je Spieler, und das wäre in der
Badge-Schleife quadratisch. Also bleiben beide, und `tests/tafel` hält sie
aneinander. Wo eine Zusammenlegung nichts kostet, gilt weiter: es gibt sie
nur einmal.
**Die Elo-Rechnung zieht ihre Grenzen an einer Stelle** (`expected`,
`CHANCE_FAVORIT`, `CHANCE_OFFEN`, `CHANCE_UPSET`, `CHANCE_SENSATION`,
[§5.2]). Die Erwartungsformel stand zweimal da — `expected` und ein
wortgleiches `localExp` in der Elo-Engine —, und die vier Linien als blanke
Zahl an zehn Stellen: Favorit ab 55 %, Augenhöhe 45 bis 55, Außenseiter-Sieg
unter 35, Sensation unter 20. Die 0,35 stand in der Auszeichnung „Upset
King", in der Award-Kachel und in BEIDEN Chronik-Durchläufen — vier Stellen,
die dasselbe Ereignis zählen [§10.2]. Und die 0,20 trennt zwei Kartensorten
des Feeds, die sich sonst doppeln: unter 20 % erzählt der Favoritensturz, von
20 bis 35 die Ergebniskarte; blank nebeneinander war ihre
Zusammengehörigkeit nicht zu sehen. Ob die Linie selbst dazugehört, ist je
Wertung kalibriert und bleibt es: „Der Favoritenschreck" verlangt
„mindestens 65 Prozent für die Gegenseite" und zählt `<=`, der
Außenseiter-Sieg zählt `<`.
**Ein Kalendertag hat eine Schreibweise** (`tagKey`). „Welcher Tag ist
das?" stand zwölfmal ausgeschrieben im Code, und in zwei Schreibweisen:
mit führender Null („2026-08-06") und ohne („2026-7-6"). Einmal hat sich
das gekreuzt — ein Deckel-Schlüssel wurde mit der kurzen Fassung gebaut
und mit der langen abgefragt, fand nie eine Partie, und die Regel „kein
Spieltag bleibt ohne Karte" griff nie; der Ausweg war damals ein zweiter
Aufruf daneben statt einer Schreibweise. Ortszeit, nicht UTC: der Feed
gruppiert nach Kalendertagen, wie sie auf der Uhr des Lesers stehen —
`matchesByDay` schlüsselt bewusst nach UTC und ist deshalb etwas anderes.
`tests/tafel` zählt die Stellen im gebauten Stand nach, weil sich jede
neue sonst wieder selbst eine aussucht.
**Und eine Uhrzeit hat einen Formatierer** (`datumFmt`): `toLocaleDateString`
mit Optionen baut bei jedem Aufruf einen neuen, und im Feed lief das je
Karte mehrmals — gemessen 16 ms für die Uhrzeit allein beim Öffnen.
Uhrzeit, Tag und Monat, das kurze Datum und der Wochentag gehen durch einen
gemerkten; `tests/tafel` zählt die Stellen, die ihn selbst bauen.
**Eine Zahl und ein Name haben je eine Form.** Eine Dezimalzahl trägt ein
Komma (`komma`) — acht Belege des Katalogs und acht Fun Facts schrieben
„6.9 Gegentore" mit englischem Punkt mitten im deutschen Satz, und ein
Absturz stand als „-308 Elo" unter einer Bedingung, die „mindestens −150"
schreibt. Dasselbe galt außerhalb des Feeds an neunundvierzig Stellen: „4.00
Gegentore" in der Betonmauer, „Ø 8.8" in der Positionsliste, „+1.5 Elo" in
den Einstellungen, jede Kachel der Rückblicke. `tests/blatt` liest dafür den
sichtbaren Text jedes Reiters und der Blätter mit Nachkommastellen.
Mit den Jahren kamen zwei Formen dazu. Die Sätze setzen ihre Zahlen roh ein,
und eine Liga mit über fünftausend Partien schrieb „82820 Tore in 5152
Partien" und „16705 Tore insgesamt": ab fünf Stellen gruppiert `tausender`,
einmal für jede Story am Ende des Generators und für den großen Wert der Fun
Facts. Und ein Tag in einem Satz stand ohne Jahr: „Der letzte Sieg gegen
Leon war am 15.03.", „Am 15.03. gewann Johannes 7 von 7" in den Rekorden
aller Zeiten, auch wenn der März Jahre zurücklag. `tmx` setzt das Jahr, wenn
es nicht das laufende ist, `tagImSatz` dazu genau einen Punkt ans Satzende —
der Wochenrekord endete vorher auf „21.06..". `tests/rechnen` prüft beide.
**Was in einem Rahmen steht, steht in seiner Mitte.** Gemessen an der Tinte
in jedem Reiter, jedem Blatt und jeder Karte saß das Zeichen in den Kacheln
des Monatsrückblicks 6,5 px über der Mitte, die Initialen in der Tabelle
einer Partie 5,6 px, das Gesicht im Wappen des Vergleichs 3,5 px über dem
Reif. Jedes Mal setzte eine Regel die `span` eines Behälters als Spalte
(`.rcp-rw-r > span`, `.sp-rk-t > span`) oder gab ihr einen Rand
(`.nd-vs-p .av`) und traf damit auch die Kachel oder das Gesicht darin. Und
141 der 272 Zeichen des Katalogs lagen schon in ihrem eigenen Feld
daneben: die Flamme 2,5 Einheiten zu hoch, die doppelten Flammen und
Tropfen bis 4,5, der Bannbruch ragte oben hinaus und war abgeschnitten. Sie
tragen jetzt ein `<g transform="translate(…)">`. `tests/zeichen` misst den
Katalog und jede Ansicht.
**Ein Stand gehört dem, der neben ihm steht** (`standFuer`): die eigenen
Tore zuerst, ohne zweites Argument die der Sieger. Gespeichert ist er in
der Reihenfolge der Eingabe, und sieben Stellen schrieben ihn so ab:
„Stefan & Martin 8:10" in der Top-5-Liste der Überraschungen, der Krimi
und der klarste Sieg der Wochenkarte, die hundertste Partie als Fun Fact,
und in den letzten Spielen eines Duos stand neben dem roten Kreuz
„10 : 8". Zwei weitere drehten ihn selbst um.
Und **eine Überraschung hat eine Zahl**: die Siegchance der Sieger. Die
Award-Kachel zeigte die der Gegenseite, 71 % gegen 30 % in Liga, Liste und
Blatt. Im **Award-Blatt** trägt jeder Wert seine Einheit ausgeschrieben
(„Ø 6,5 Gegentore" statt „6,5 /Sp." und „9,7 Gegen/Sp.", „Player of the
Day" statt „POTD"), eine Serie beginnt beim zweiten Ergebnis — „On Fire"
listete „1er Serie", „Eiskalt erwischt" sieben Spieler mit „1er
Niederlagen" —, und der Underdog-Held zeigt die Quote, nach der er sortiert
ist: mit der Anzahl stand Platz 5 bei 2× hinter Platz 2 bei 1×, und das
Profil kürte nach der Anzahl einen anderen Ersten als die Kachel.
**Wer im Profil einen Award auf Platz 1 trägt, steht im Blatt oben**, und
gleichauf heißt geteilt: vier Rivalitäten mit derselben Quote zählten
Profil und Award-Sammler als geteilte Spitze für neun Spieler, die Kachel
nannte nur die erste und das Blatt die übrigen als 2., 3. und 4. Die
Kachel trägt jetzt „+3" wie jeder andere geteilte Award, und das Blatt
nummeriert nach der Quote.
Eine Aufzählung von Namen hat zwei Formen, und beide sind nötig:
`_chronHolderNames` mit „&" für die schmale Zelle des Rekorde-Reiters,
`_chronHalterSatz` und `_namenListe` mit „und" für jeden Satz. Im Fließtext
stand „Martin & Julian hält den Bestwert mit 84 %" — das Zeichen als
einziges im Satz, und das Verb im Singular über zwei Leute. Der Feed hatte
daneben eine dritte, eigene Aufzählung (`_namesOf`), und der Spieler des
Tages eine vierte.
**Ein Raster teilt nach `minmax(0,1fr)`, nicht nach `1fr`.** `1fr` ist
mindestens so breit wie sein Inhalt: die Beziehungskarten im Profil liefen
mit „Schwächster Partner" 17 px in den Rand des Blatts, die Seitenkarten
des Podests mit ihrem Wappen samt Banner 4 px, und die Quellen der
Laufbahn standen als 115, 125 und 62 px nebeneinander. `tests/blatt` misst
jedes Blatt am Innenrand — am Außenrand gemessen fiel nichts davon auf.
**Ein Reiter nennt sein Wort ganz.** Fünf Reiter teilen sich 328 px, und
in der Ewigen Tafel standen „Siegq…", „Torbil…" und „Prest…". Ab fünf
Reitern wird die Schrift kleiner, und „Siegquote" heißt dort „Quote"
(`METRIC_REITER`); unter der Zahl steht der volle Name. Dasselbe gilt für
den Namen einer Award-Kachel: „Längste Siegesser…", „Größte Überras…" und
„Schlechtester Spi…" standen gekürzt da. Die Sperrung ist enger, und zwei
Namen sind kürzer und sagen dasselbe: „Schwächste Bilanz" (das Gegenstück
zu „Beste Bilanz") und „Längste Pleitenserie".
**Und ein langes Wort darin wird kleiner, nicht gebrochen** (`_awLblLang`):
`overflow-wrap` hielt den Namen in der Kachel und brach ihn bei 360 px
mitten im Wort („Unaufhaltsa|m", „Showmaste|r"), ohne Trennstrich, weil
nicht jedes Telefon Deutsch trennt. Ab zehn Zeichen steht er in 10 px, ab
vierzehn in 9. Dazu trug die nicht vergebene Kachel das Polster des leeren
Zustands einer ganzen Ansicht: die Regel hieß `.empty` und traf jeden
Baustein mit dem Zusatz „leer". Sie heißt jetzt `.leerstand`, ein Name,
den kein anderer Baustein trägt. Dazwischen hieß sie `[class="empty"]` und
galt nur ohne weitere Klasse: setzte der Aufbau `bau` dazu, stand „Keine
Matches in diesem Zeitraum" eine halbe Sekunde groß, weiß und links da.
**Eine Partie im Verlauf zeigt, wer gewonnen hat** (`vHistory`): Gesichter
vor den Namen, der Sieger hell, der Verlierer leise, im Stand die Zahl des
Siegers in Acid, und die Partien eines Tages unter einem Tageskopf mit
ihrer Zahl, wie im Feed. Beide Teams standen weiß und fett nebeneinander:
die Regel `.mteam .won` suchte ein Kind und traf nie, die Klasse sitzt an
`.mteam` selbst. **Und ein Duo zeigt seine Bilanz als Balken** (`.tm-bar`),
wie die Ranglistenzeile eines Spielers; „26–4" als Zahl allein ließ
ausrechnen, ob ein Duo knapp oder klar vorn liegt.
**Eine Bilanz ist eine Zahl und bricht nicht um.** In der Gesamtansicht
der Liga stand „221–" über „134", in der Positionsliste „81–" über „40",
und dahinter endete „Ø 8.8 T…" mitten im Wort. Die Tore je Spiel stehen
in der Positionsliste deshalb in einer eigenen Zeile — wie die Formpunkte
in der Liga.
Der Saisonwähler (`.saisonwahl`, `saisonWaehlerHtml`) ist bewusst **keins**
von beiden: er wählt weder Ansicht noch Filter, sondern den Zeitpunkt, von
dem alles darunter handelt. Als `.ui-tabs` stand er zwischen zwei echten
Reiterstreifen und war von ihnen nicht zu unterscheiden.
**Eine Grafik über einer Rangliste ist eine Zeile, die aufklappt**
(`einblickHtml`, `15b-einblick.js`): die Rollen-Landkarte über den
Positionen, das Netz der Duos über den Teams. Als volle Karte nahm jede
davon den halben Bildschirm über der Rangliste, und die Rangliste ist der
Grund, warum man den Reiter öffnet. Gezeichnet wird erst beim Aufklappen;
zu kostet der Einblick keine Rechnung. Im Liga-Reiter gibt es keinen: das
Titelrennen der Saison war dieselbe Frage wie der Positionsverlauf, und der
trägt es jetzt selbst — seine Karte unter „Mehr zur Saison" zeigt den
Verlauf vereinfacht (`posvVorschauHtml`: jede Linie mit derselben Kurve
wie im Blatt, `_posvPfad`, ohne Gesichter und Achsen, die ersten drei voll
und darunter mit Platz und Farbe) und öffnet beim Tippen den ganzen
Verlauf. Sie trug vorher die Elo der ersten drei, also eine andere Grafik
als das Blatt, das sie öffnet. Der Saison-Rückblick darunter ist eine
schmale Zeile. Oben
bleibt die Rangliste das Erste. Dieselbe Zeile trägt die Ruheständler
[§C40] am Ende von Gesamt, Positionen und Teams.
**Der Positionsverlauf liest sich als Tabelle über die Zeit**
(`07-positionsverlauf.js`). Er zeigte gerade Linien, die sich in Spitzen
kreuzten, die Namen mit „…" gekürzt neben dem Gesicht, einen Hinweis
„Linie oder Gesicht antippen" und darunter einen leeren Kasten „Hier
stehen die Einzelheiten". Jetzt laufen Kurven von Tag zu Tag, die Tage mit Partie tragen eine Marke
auf der Achse, und am Ende steht das Gesicht mit der Bewegung seit dem
vorletzten Spieltag. Platz eins trägt nur die goldene Ziffer an der Achse:
ein goldenes Band lag quer über die ganze Breite und las sich wie eine
markierte Zeile, über die die Linien der anderen hinweglaufen. Die Namen stehen ganz in der **Tabelle** darunter
(`_posvTabelle`: Platz, Gesicht, Name, Verlauf klein, Bewegung, Elo); sie
ist zugleich die Wahl des Spielers, also braucht es keinen Satz, der die
Bedienung erklärt. Das Detail erscheint erst nach der Wahl: die Zahlen der
Saison als Zahlenreihe [§C31], der **Platz an jedem Tag** als Zelle und
die Partien als Lauf (`saisonZellenHtml`); darunter die Tage an der Spitze
aus demselben Bauteil wie im Saison-Rückblick. `tests/blatt` rechnet die
Bewegung aus den rohen Plätzen nach.
**Eine Erklärung steht hinter einem Knopf, wenn sie länger ist als die
Ansicht kurz** (`.kopf-info`): der Absatz über den Positionen nahm drei
Zeilen vor der Liste ein. Er steht in einem Blatt hinter dem Zeichen neben
der Überschrift, darunter bleibt eine Zeile.
**Die Siegchance steht beim Aufstellen unter der Score-Karte**
(`#chanceSlot`, `_matchChanceHtml`), sobald vier Spieler gewählt sind, aus
derselben Rechnung, mit der die Partie danach gewertet wird
(`computeMatch`), und ohne Satz, der sie erklärt — die beiden Prozente und
„Favorit" sagen es selbst. In der Vorschau nach dem Stand stand sie ein
zweites Mal und ist dort weg.
**Der Direkte Vergleich zeigt jede Begegnung** (`h2hBegegnungenHtml`): die
letzten vierzig als Balken je Partie, Höhe nach Tordifferenz, Farbe nach
Sieger. Die Bilanz allein sagte nicht, ob sie aus einer Serie oder aus
einem Hin und Her stammt.
**Die Kammern des Rekorde-Reiters sind Felder, keine Leiste**
(`.rek-kammern`): drei Spalten, 13 px und gut 35 px hoch. Als Leiste standen
sechs Wörter in 11,5 px eng aneinander, und die letzten lagen hinter dem
Rand. Die Besitzleiste darüber ist so hoch, dass Zahl, Säule und Gesicht
in ihrer Karte bleiben; das Gesicht lief unten hinaus.

Was endlos läuft, kostete den Feed fast den ganzen Hauptthread. Der Schein
von Breaking, das Atmen der Tafel-Rubrik und der Puls des Breaking-Punkts
wechselten ihren `box-shadow`, der Lichtlauf seine `background-position`:
jede dieser Bewegungen verlangte in jedem Bild einen Takt des Hauptthreads
über den ganzen Feed — Stil, Zeichnen, Übergabe. Gemessen mit vierfach
gedrosselter CPU waren das rund 490 ms je Sekunde, solange der Feed nur
offen stand; ein Wischen in dieser Zeit ruckelte. Dieselben Bewegungen als
Ebenen, die kommen und gehen oder fahren, rechnet die Grafikkarte: 3 ms.
Dasselbe galt für den Lichtlauf auf dem Podest des Awards-Reiters (160 ms
je Sekunde) und auf dem Helden der Rückblicke; dort schneidet die Fläche
nicht ab — das Wappen ragt heraus —, also trägt der Lauf seine eigene Bahn.
Der Schein von Breaking liegt dafür auf einer Hülle hinter der Karte
(`.nf-brk-hof`), weil die Karte abschneidet, was über ihren Rand ragt.

Das Metall der ersten drei ist fest und nicht bewegt. Zwei Fassungen mit
Bewegung kamen aus dem Entwurf `mockup/aufwertung-6/` und gingen wieder
heraus: ein Licht über einen 3 px breiten Strich links an der Karte, dann
ein Lichtband über die ganze Karte, dazu Kacheln, die beim Scrollen oder
beim Zeichnen einliefen. Auf dem Telefon erschien das beim Scrollen, und
hörte man auf, blieb der Schimmer mitten auf der Karte stehen; die Striche
selbst wirkten wie ein Fehler. Ein fester Glanz steht immer richtig,
kostet nach dem ersten Zeichnen nichts und lässt Zahl und Name vorne.
Bewegung bleibt dem, was der Finger auslöst, und endet in einer
Viertelsekunde — sie kann nicht halb stehen bleiben.
