# §C41 Ein Zeichen, eine Bedeutung

## Regel

- Jedes Zeichen im Katalog (`ICONS`, `02-icons.js`) trägt genau eine Bedeutung. Zwei verschiedene Sachen teilen nie ein Zeichen.
- Dieselbe Sache in mehreren Systemen behält ein Zeichen: die laufende Siegesserie ist als Award, Badge, Ring am Avatar und Anlass einer Partie dieselbe Flamme. Ein solches Zeichen steht mit seiner einen Bedeutung in `ZEICHEN_FAMILIEN` (`tests/umbau/disziplinen`).
- Ausnahme in der Gegenrichtung: Disziplinen (Liga-Rekorde und Monatschroniken) stehen in der Chronik nebeneinander und brauchen dort jede ihr eigenes Bild, auch wo eine von ihnen mit einem Award dieselbe Sache meint.
- Kein Schlüssel steht im Katalog zweimal, keine zwei Schlüssel tragen dieselbe Zeichnung.
- Jeder Zugriff auf eine Zeichnung geht über `icPfad` (oder `svgI`/`zkHtml`, die ihn rufen). Ein ersetzter Name steht in `ZEICHEN_ALT` und zeigt auf die Zeichnung, die seine Sache jetzt trägt; lebender Code setzt nur heutige Namen.
- Was der Code wörtlich setzt (Schalter, Kopfzeilen, Rubriken und Filter des Feeds), folgt derselben Regel: der Schalter „Drive“ zeigt die Seite, nicht das Zeichen des Drive-Virtuosen.
- Ränge sind eine Leiter aus Winkeln (`rang1` bis `rang5`), Seiten der halbe Court von oben mit dem Platz des Spielers (`posDrive` … `posReinReves`), „Der Dauer-Drive“ und „Der Dauer-Revés“ derselbe Court gestrichelt mit der ganzen Seite getönt (`driveFenster`, `revesFenster`).
- Jedes Zeichen ist eine Padel-Zeichnung: die Rubrik Spieltag ist der Court quer mit Netz, Aufschlaglinien und Mittellinie (`spielfeld`), ein Ball ist der Padelball. Ein Zeichen aus der Kicker-Liga (Fußballfeld, Kickertisch, Stürmer, Pfeife, Ball mit Kreuzlinien) steht nur noch als alter Name in `ZEICHEN_ALT`.

## Stellen

`02-icons.js` (`ICONS`, `ZEICHEN_ALT`, `icPfad`), die Kataloge `AW_IC` (`13-view-awards.js`), `BADGES` (`17-badges.js`), `DISZIPLINEN` (`32-chronik-katalog.js`), `NEWS_CATEGORIES` (`26-news-konstanten.js`), `RANKS` und `posClassify` (`05-rang-elo.js`), `AV_RINGS` (`35-chronik-ui.js`), `SP_ANLASS` (`30b-news-spieltag.js`), die Rubriken `_newsSorteIcon` und Filter in `30a-news-karte.js`.

## Prüfung

`tests/umbau/disziplinen` (kein Zeichen mit zwei Bedeutungen über Award, Badge, Disziplin, News, Rang, Ring, Position, Spieltag und Rubrik; jede Familie hat mindestens zwei Träger; jeder Träger nennt ein Zeichen, das es gibt; keine doppelte Zeichnung, kein doppelter Schlüssel; jeder alte Name zeigt auf eine bestehende Zeichnung; jedes wörtlich gesetzte Zeichen steht unter seinem heutigen Namen im Katalog; jede Disziplin hat ihr eigenes Zeichen), `tests/umbau/tafel` (kein Zeichen ohne Aufrufer), `tests/padel` (die Rubrik Spieltag ein Court quer ohne Mittelkreis, das Zählwerk mit dem Padelball, Dauer-Revés und Dauer-Drive mit ihrer Seite, die Kicker-Namen nur in `ZEICHEN_ALT`).

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

Der Entwurf den Entwurf „aufwertung-6/“ der Kicker-Liga hat jede Verwendung erfasst und je
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

**Kein Zeichen aus der Kicker-Liga.** Die Liga ist aus der Kicker-Liga
hervorgegangen, und mit dem Katalog kamen Zeichnungen, die ein Padelspieler
nicht als seine liest: die Rubrik Spieltag war ein Fußballfeld mit
Mittelkreis und Strafräumen und stand als Wasserzeichen auf jeder Karte
einer Partie, das Zählwerk der Liga trug einen Ball mit Kreuzlinien, „Der
Dauer-Revés“ die hintere Hälfte des Kickertischs (die Abwehr) und „Der
Dauer-Drive“ den Dauerstürmer auf seinem Sockel — die Seite, um die es
geht, zeigte keins von beiden. Jetzt ist die Rubrik der Court quer wie auf
der Karte einer Partie, der Ball der Padelball und das Dauer-Paar der halbe
Court der Seiten-Zeichen, gestrichelt für das Fenster der letzten Sätze.
Die alten Namen zeigen über `ZEICHEN_ALT` auf ihre Padel-Zeichnung, damit
eine gespeicherte Karte, die einen von ihnen trägt, ihr Bild behält.
