# §C41 Ein Zeichen, eine Bedeutung

## Regel

- Jedes Zeichen im Katalog (`ICONS`, `02-icons.js`) trägt genau eine Bedeutung. Zwei verschiedene Sachen teilen nie ein Zeichen.
- Dieselbe Sache in mehreren Systemen behält ein Zeichen: die laufende Siegesserie ist als Award, Badge, Ring am Avatar und Anlass einer Partie dieselbe Flamme. Ein solches Zeichen steht mit seiner einen Bedeutung in `ZEICHEN_FAMILIEN` (`tests/disziplinen`).
- Ausnahme in der Gegenrichtung: Disziplinen (Liga-Rekorde und Monatschroniken) stehen in der Chronik nebeneinander und brauchen dort jede ihr eigenes Bild, auch wo eine von ihnen mit einem Award dieselbe Sache meint.
- Kein Schlüssel steht im Katalog zweimal, keine zwei Schlüssel tragen dieselbe Zeichnung.
- Jeder Zugriff auf eine Zeichnung geht über `icPfad` (oder `svgI`/`zkHtml`, die ihn rufen). Ein ersetzter Name steht in `ZEICHEN_ALT` und zeigt auf die Zeichnung, die seine Sache jetzt trägt; lebender Code setzt nur heutige Namen.
- Was der Code wörtlich setzt (Schalter, Kopfzeilen, Rubriken und Filter des Feeds), folgt derselben Regel: der Schalter „Sturm“ zeigt die Position, nicht den Blitz des kompletten Stürmers.
- Ränge sind eine Leiter aus Winkeln (`rang1` bis `rang5`), Positionen der halbe Tisch von oben mit dem Platz des Spielers (`posSturm` … `posReinAbwehr`).

## Stellen

`02-icons.js` (`ICONS`, `ZEICHEN_ALT`, `icPfad`), die Kataloge `AW_IC` (`13-view-awards.js`), `BADGES` (`17-badges.js`), `DISZIPLINEN` (`32-chronik-katalog.js`), `NEWS_CATEGORIES` (`26-news-konstanten.js`), `RANKS` und `posClassify` (`05-rang-elo.js`), `AV_RINGS` (`35-chronik-ui.js`), `SP_ANLASS` (`30b-news-spieltag.js`), die Rubriken `_newsSorteIcon` und Filter in `30a-news-karte.js`.

## Prüfung

`tests/disziplinen` (kein Zeichen mit zwei Bedeutungen über Award, Badge, Disziplin, News, Rang, Ring, Position, Spieltag und Rubrik; jede Familie hat mindestens zwei Träger; jeder Träger nennt ein Zeichen, das es gibt; keine doppelte Zeichnung, kein doppelter Schlüssel; jeder alte Name zeigt auf eine bestehende Zeichnung; jedes wörtlich gesetzte Zeichen steht unter seinem heutigen Namen im Katalog; jede Disziplin hat ihr eigenes Zeichen), `tests/tafel` (kein Zeichen ohne Aufrufer).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Von 143 vergebenen Zeichen trugen 79 mehr als eine Sache. Die Krone stand
für den Meistertitel, den Traummonat, die Highlights, die Legende, den
Titelverteidiger und den Spitzenwechsel einer Partie; der Blitz für Stürmer,
Sturm-Flex, den kompletten Stürmer und die Eilmeldung. Ein Zeichen, das
sechs Dinge heißt, sagt keins davon. Geprüft wurde Eindeutigkeit nur
innerhalb eines Systems (jede Disziplin ihr Zeichen), über die Systeme
hinweg nie.

Die Rubriken des Feeds legten ihr Zeichen neben `NEWS_CATEGORIES` ein
zweites Mal fest, und dieselbe Sache hatte zwei Bilder: der Spieltag den
Ball im Rubrikband und die Klingen im Filter. `shieldStar` und `ghost`
standen zweimal im Katalog; der zweite Eintrag überschrieb den ersten still.
Acht Zeichnungen waren Zwillinge — `chartUp` und `trendUp` dieselbe Linie,
zwei gebrochene Herzen, zwei Regenwolken, zwei Hanteln —, und die Rakete
las sich bei 14 px als Stift.

Der Entwurf `mockup/aufwertung-6/` hat jede Verwendung erfasst und je
Bedeutung entschieden: eigene Zeichnung oder das Zeichen derselben Sache.
Dabei zeigte sich die Grenze in der Gegenrichtung: sieben Paare von
Disziplinen meinten nach dem Entwurf dieselbe Sache wie ein Award (der
Wochenherr und die Wochenkrone wie der Wochenkönig), stehen aber in der
Chronik-Matrix nebeneinander, wo zwei gleiche Bilder in 62 px nicht zu
unterscheiden sind. Sie haben je ein eigenes Zeichen bekommen.

Gespeicherte Stories tragen ihren Zeichenschlüssel, und der
Snapshot-Vertrag [§C33] verbietet, sie umzuschreiben. Deshalb verschwindet
kein Name ersatzlos: `ZEICHEN_ALT` lässt eine Karte vom Juni das Zeichen
zeigen, das ihre Sache heute trägt, statt einer Lücke.
