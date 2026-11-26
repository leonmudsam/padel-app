# §C37 Ein Anteil misst gegen die Menge, um die es geht

## Regel

- Ein Anteil misst gegen die Teilmenge, um die es geht, nicht gegen alle Partien: enge Partien beim Pechvogel und Clutch-Player (`agg.clutch`), enge Partien des Duos bei den Glückspilzen, die Pleiten beim Zirkus, die Außenseiter-Partien beim Underdog-Held.
- Auf der Kachel steht „x von y", nicht nur der Anteil.
- Die Mindestzahlen passen zum Zeitraum Saison und Woche und stehen an einer Stelle (`AW_MIN`, keine über fünf); die Erklärung (`AWARD_META.why`) liest ihre Zahl aus `AW_MIN`.
- Dasselbe gilt für die Quote des Player of the Week und Month (`PERIODE_MIN_SIEGE`, drei und sechs Siege) und für die Spitze der Woche im Feed, die dieselbe Zahl liest.

## Stellen

`13-view-awards.js` (`AW_MIN`, `AWARD_META`, `AW_WERT`), `17-badges.js` (`PERIODE_MIN_SIEGE`), `27-news-generator.js` (`wochenErster`).

## Prüfung

`tests/padel` prüft, dass eine Woche mit zwei Spieltagen und fünf Sätzen einen Player of the Week und die Quoten-Awards in Woche und Saison trägt und keine Mindestzahl über fünf steht. `tests/umbau/tafel` prüft Schwellen und Nenner der Awards und was nach einer vollen Woche leer bleibt.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

„Pechvogel"
zählte knappe Niederlagen gegen ALLE Partien und kürte damit den, der viele
enge Spiele hatte, statt den, der sie verliert: wer zwanzig Partien spielt,
davon zwei enge, und beide verliert, stand bei 10 % — hinter jemandem mit
acht knappen Niederlagen aus vierzig Spielen, der die Hälfte seiner engen
Partien gewonnen hat. Der Nenner ist die **Teilmenge**: enge Partien beim
Pechvogel und beim Clutch-Player (beide aus `agg.clutch`, eine Zählung für
zwei Kacheln [§C27]), enge Partien des Duos bei den Glückspilzen, die
**Pleiten** des Duos beim Zirkus (derselbe Nenner wie bei „Der Widerstand"
in der Chronik, die Frage ist seit dessen Umbau eine andere [§C35]), die Partien als Außenseiter beim
Underdog-Held — der zählte gar keinen Nenner und war damit eine
Anwesenheitsliste, obwohl sein Zwilling auf Team-Ebene, der Giant Slayer,
seit jeher die Quote rechnet. Auf der Kachel steht deshalb immer „x von y",
nicht nur der Anteil: die Stichprobe gehört zur Aussage.

**Und die Mindestzahlen passen zum Zeitraum** (`AW_MIN`, `PERIODE_MIN_SIEGE`).
Die Awards gibt es je Saison, und der Wochenrückblick fragt dieselbe
Rechnung für eine Woche. Ein Spieler kommt an einem Spieltag meist auf zwei
bis drei Sätze, in einer Woche selten auf sechs bis acht, im Monat auf zehn
bis zwanzig. Die Schwellen standen auf zehn Sätzen je Spieler und fünf
Siegen für den Player of the Week, gesetzt für sechs bis zehn Sätze am Tag:
jede Quote blieb in einer Woche leer und in einem Monat für die Hälfte der
Liga, und wer in der Woche vier von fünf Sätzen gewann, war kein Player of
the Week. Die Spitze der Woche im Feed trug eine eigene Fünf und hätte
eine Woche verschwiegen, deren Player of the Week feststand; sie liest
jetzt dieselbe Zahl. Die Schwellen stehen an einer Stelle beisammen, damit
sich das nicht wieder über die Dateien verteilt, und keine der Awards steigt
über fünf.
**Und die Erklärung nennt, was gilt** (`AWARD_META.why`). „So wird
gewertet" war fester Text und den Schwellen nicht gefolgt: die Betonmauer
verlangte dort zehn gemeinsame Spiele und in der Rechnung drei, der
Pechvogel zählte laut Text gegen alle Partien, und der Carry-King nannte
„einen der drei schwächsten" Mitspieler, während die Rechnung den
schwächsten der vier zählt. Die Zahl kommt jetzt aus `AW_MIN` selbst, auch
die der Positionswertungen (`AW_MIN.position`), die als blanke 2 an vier
Stellen stand.
