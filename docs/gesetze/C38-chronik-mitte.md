# §C38 Die Chronik gehört nicht nur den besten Drei

## Regel

- Ein Monatseintrag für die Mitte des Feldes misst den Abstand zum eigenen Niveau, nicht das Niveau: „Auf Augenhöhe", „Die Steigerung", „Der Staffellauf", „Das Seitenbündnis" (beide über `_stUebergaenge`), „Der Quertreiber", „Die Tagesumkehr" (gegen den Erwartungswert 2·S·N durch n·(n−1)), und die sieben gegen das Eigene [§C39]: „Der Knipser", „Der Riegel" (vorne und hinten gegen das eigene Mittel), „Neuland", „Die Revanche", „Das Nachlegen", „Der Spielverderber" (je ein Ausschnitt der eigenen Partien gegen die Rechnung, `_stUeberSoll`) und „Die Lernkurve".
- Dasselbe gilt für die Liga-Rekorde außerhalb des Niveaus [§C35]: „Der Wiedereinstieg" (Rückkehrspiele), „Der Glanztag" (der beste Spieltag) und die Kehrseiten „Der Rost" und „Der Abschwung" (die letzten 25 gegen die Laufbahn davor) stellen einen Ausschnitt der eigenen Partien gegen den eigenen Rest.
- Nicht eingebaut wird, was einen zweiten Monat zur Eichung braucht, nur mit einer Zufallsreferenz zu rechnen ist, Statistiksprache braucht, die 1,2 σ nicht erreicht oder an der Spielzahl hängt.

## Stellen

`32-chronik-katalog.js` (`DISZIPLINEN`), `33-chronik-engine.js`.

## Prüfung

`tests/disziplinen` fällt, wenn ein solcher Eintrag wieder an die Spitze der Siegquote geht, rechnet die vier Chroniken der Übergänge und Tage, die acht gegen das Eigene und die Liga-Rekorde gegen das Eigene aus den rohen Partien nach, verlangt für die sieben positiven gegen das Eigene mindestens fünf Halter und höchstens ein Viertel beim Monatsersten und misst jeden Rekord mit dem Grundwert des Könnens (100) gegen die Siegquote.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Wer eine Quote
gewinnt, gewinnt fast jede: gemessen gingen sechzig Prozent der
Monatseinträge an die besten Drei der Siegquote, und der Monatserste allein
hielt ein Drittel der Tafel. Ein Eintrag für die Mitte des Feldes misst
deshalb nicht das Niveau, sondern den **Abstand zum eigenen** — so wie „Das
Übersoll" im Monat, das jeder erreichen kann. „Auf Augenhöhe" vergleicht die Quote in
den Partien, die die Elo-Rechnung offen sah, mit der eigenen Gesamtquote;
„Die Steigerung" die zweite Hälfte der Spieltage mit der ersten; „Der
Sonntagsschuss" war eine einzige Partie, in der die Rechnung dagegen stand —
er trägt heute nur die Laufbahn, im Monat hing er mit 0,45 an der
Spielzahl [§C39].
Gemessen stehen ihre Halter im Mittel jenseits des ersten Drittels, und der
Anteil der Einträge an die besten Drei fiel von sechzig auf fünfundfünfzig
Prozent. `tests/disziplinen` fällt, wenn eine davon wieder an die Spitze
geht.
Vier weitere kommen aus `mockup/besonderheiten` und folgen derselben
Regel. „Der Staffellauf" und „Das Seitenbündnis" stellen die Partie nach
einem Partnerwechsel am selben Tag gegen die übrigen Übergänge, beide
gegen die Rechnung und nicht als Siegquote (`_stUebergaenge`); „Der
Quertreiber" ist das andere Ende von „Favorit wie Außenseiter", mit einer
Schwelle über deren Band, und „Die Tagesumkehr" zählt Spieltage, die
anders enden als sie beginnen, gegen das, was die eigene Bilanz bei
zufälliger Reihenfolge erwarten lässt (2·S·N durch n·(n−1)) — ohne diesen
Bezug gehörte sie dem, der bei 50 % steht. Gemessen gingen sie an die
Plätze 2, 7, 8 und 11 der Siegquote, bei höchstens 0,31 Korrelation zur
Spielzahl. Nicht eingebaut wurde, was einen zweiten Monat braucht
(Quantensprung, Anderes Trikot, Rivalitätswende, Ruhiges Feld,
Gegnerbalance, Torwende: drei Monatspaare sind keine Eichung), was nur
mit einer Zufallsreferenz zu rechnen ist (Erwartungskorridor), was in
Statistiksprache ausgedrückt werden müsste (Ergebnisdialekt in Bit,
Verdichtung als Rangkorrelation), was die damalige Grenze von 1,5 σ
nicht erreichte (Rückspielwelle — seit die Grenze bei 1,2 σ liegt, steht
sie als „Die Revanche" im Katalog), was es in den echten Partien kaum gibt (Bilanzparadox,
Gegenläufer, Startzeit, Umschaltmoment, Positionspakt), was einen
Effekt von wenigen Punkten ausschmückt (Chancenpendel, Doppelzone), was
aus vielen Paaren das günstigste sucht (Gegnergeflecht, Doppelgesicht mit
0,52 zur Spielzahl) und was an einem willkürlichen Viererblock hängt
(Spiegelmonat).
