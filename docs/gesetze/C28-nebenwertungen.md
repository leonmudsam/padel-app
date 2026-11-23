# §C28 Die Nebenwertungen

## Regel

- Über der Liga-Tabelle steht in jedem Zeitraum an derselben Stelle ein Band der Nebenwertungen: eine breite Karte, dann kleine Kacheln. In der Saison führt das Team der Saison, in Woche und Tag der Spieler des Zeitraums, und zwar der Erste der Auszeichnung selbst (`_periodeRangliste`), nicht eine eigene Rechnung der Liga.
- Die Woche steht in der Zeitraumleiste der Liga nur, wenn die laufende Woche mindestens `WOCHE_MIN_SPIELTAGE` Spieltage hat (`ligaWocheOffen`), gleich wer an ihnen gespielt hat, also genau dann, wenn es einen Player of the Week geben kann [§C31]. Sie steht zwischen Saison und Tag. Steht die Liga auf „Woche" und die Woche hat ihren Reiter nicht mehr, zeigt sie die Saison.
- Alle Zeiträume tragen dieselbe Metrikleiste (`METRIC_LABEL`, `METRIC_REITER`); der erste Eintrag ist die Leitgröße, nach ihr wird der Erste bestimmt. Elo heißt im Zeitraum der Zuwachs, in Saison und Gesamt der Stand.
- Die Torbilanz in Gesamt und unter den Teams ist ein Schnitt je Partie, geschrieben und gerechnet wie Plus-Minus (`AW_WERT.plusMinus`, „Ø +1,4"); in Gesamt steht dahinter, wer weniger als `AW_MIN.spielerSaldo` Partien hat, und unter seiner Zahl steht die Schwelle.
- Tageskönig und Wochenkönig zählen den Anteil der eigenen Spieltage und Wochen als Player of the Day und Week, nicht die Zahl der Titel; gezählt wird nur, was zu ist, und beim Wochenkönig nur eine Woche, die jemand gewinnen konnte (`_gewerteteWochen`). Eine Mindestzahl gibt es nicht: beide zeigen ab der ersten abgeschlossenen Woche, bei gleichem Anteil steht vorn, wer öfter Player of the Day oder Week war.

## Stellen

`11-view-ranking.js` (`ligaWocheOffen`), `05-rang-elo.js`, `13-view-awards.js` (Könige), `14-top5-listen.js`, `15-views-rest.js` (Teams), `17-badges.js` (`_periodeRangliste`, `_gewerteteWochen`), `25-helpers.js` (die Hilfe der Liga), `src/css/02-ranking.css`.

## Prüfung

`tests/umbau/blatt` zeichnet jeden Reiter bei 360 px und misst die Nebenwertungen der Liga; `tests/umbau/tafel` ordnet die Torbilanz in Gesamt und unter den Teams nach und liest jede Zahl; `tests/umbau/rechnen` stellt einen Seltenspieler mit höherem Anteil vor einen Vielspieler mit mehr Titeln; `tests/padel` zeigt den Reiter „Woche" erst ab dem zweiten Spieltag der Woche, zwischen Saison und Tag, fällt ohne ihn auf die Saison zurück, nennt den Spieler der Woche der Auszeichnung (nach der Quote, nicht nach den Siegen) und lässt eine Woche mit einem Spieltag aus dem Nenner des Wochenkönigs; nach drei Spieltagen steht ein Tageskönig, ohne Mindestzahl.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Ein Band über der Tabelle der Liga steht in jedem Zeitraum an derselben
Stelle und in derselben Form: eine breite Karte für die Hauptnebenwertung,
dann kleine Kacheln. In der Saison führt das Team der Saison, in Woche und
Tag der Spieler des Zeitraums — er ist dort kein Tabellenerster, sondern ein
Titel mit eigener Regel (Mindestzahl Siege, beste Quote), und gehört deshalb
neben die Tabelle, nicht hinein.

Vorher hatte jeder Reiter hier etwas anderes: die Saison eine schmale Leiste
ganz unten unter der Liste, Woche und Tag eine große goldene Heldenkarte
darüber, die Ewige Tafel gar nichts. Drei Formen für dieselbe Rolle — und
die Leiste unten hat niemand gesucht.

Dazu gehört **eine Metrikleiste für alle Zeiträume** (`METRIC_LABEL`,
`METRIC_REITER` in `05-rang-elo.js`): überall dieselbe Leiste, und der erste
Eintrag ist die Leitgröße des Zeitraums. Nach ihr wird der Erste bestimmt,
und nur in ihr steht er als Kopfzeile über der Liste. Elo heißt dabei im
Zeitraum der Zuwachs, in Saison und Gesamt der Stand — beides ist „die Elo
dieses Zeitraums", einmal als Strecke und einmal als Punkt. Vorher hatte
jeder Reiter seine eigene Bedienung mit eigener Aufschrift: drei Sprachen
für dieselbe Frage.

**Die Torbilanz ist ein Schnitt je Partie.** In Gesamt und unter den Teams
stand die Summe der Tordifferenzen, und vorn stand, wer am meisten gespielt
hatte: bei gleichem Saldo je Partie lag ein Vielspieler mit doppelt so
vielen Partien doppelt so weit vorn. Die Wertung, die dieselbe Frage
stellt, ist Plus-Minus in den Awards — dieselbe Rechnung, dieselbe
Schreibweise, dieselbe Schwelle, unter der ein einziges 10:0 den Schnitt
entscheidet. Die Summe steht unter den Teams weiter in der Zeile, im Profil
als Kennzahl.

**Ein König ist, wer seine Tage am häufigsten gewinnt.** Tageskönig und
Wochenkönig zählten die Titel als Player of the Day und Week, und vorn stand,
wer am häufigsten spielte: zwölf Tagessiege aus zwanzig Spieltagen standen
hinter dreizehn aus hundert. Gezählt wird jetzt der Anteil der eigenen
Spieltage und Wochen, die zu sind — der laufende Tag und die laufende Woche
haben noch keinen Titel und dürfen den Nenner nicht vergrößern. Eine
Mindestzahl gibt es nicht mehr. Mit fünf Spieltagen und drei Wochen standen
beide Awards einer Saison bis weit in den Monat leer, und das Blatt sagte
„Keine Daten", obwohl die Liga längst Player of the Day und Week hatte; ein
Award zeigt ab der ersten abgeschlossenen Woche. Dass ein Titel aus einem
einzigen Spieltag hundert Prozent sind, gilt dafür; bei gleichem Anteil
steht vorn, wer öfter gewann. Der Wochenkönig zählte
dazu jede eigene Woche, auch eine mit einem einzigen Spieltag, in der es
seit der Regel der zwei Spieltage [§C31] keinen Player of the Week geben
kann: jede solche Woche senkte den Anteil, ohne dass jemand sie hätte
gewinnen können.

**Die Woche hat einen Reiter, sobald sie zwei Spieltage hat.** Die Liga
spielt meist an einem Tag in der Woche, und dann zeigte „Woche" dieselbe
Tabelle wie „Tag" noch einmal, mit einem Spieler der Woche, der derselbe
war wie der des Tages. Deshalb war der Reiter ganz weg, auch in den Wochen,
in denen die Liga zweimal spielte und die Woche etwas anderes erzählt als
jeder ihrer Tage. Jetzt folgt er derselben Regel wie die Auszeichnung: es
gibt ihn, wenn es einen Player of the Week geben kann. Der Spieler der Woche
auf der Karte rechnete die Liga vorher selbst nach, mit eigener Sortierung
und ohne die Spieltage; er ist jetzt der Erste von `_periodeRangliste`, wie
der des Tages.

Stellen: `11-view-ranking.js` (Band und Sortierung), `02-ranking.css`.
