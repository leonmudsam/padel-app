# Bewusst behaltene Doppelungen und Abweichungen

Was beim Aufräumen gefunden und absichtlich NICHT vereinheitlicht wurde, mit
dem Grund. Wer hier etwas zusammenlegen will, prüft zuerst den Grund — die
meisten Stellen hängen an gespeicherten Daten, und eine Vereinheitlichung
änderte dann etwas, das Nutzer schon gesehen haben.

## An gespeicherten Daten

- **Zwei Tagesbegriffe.** `mdayKey` schlüsselt nach UTC-Tag (Badge-Stände,
  `matchesByDay`, `_periodWinnerMap('day')`), `tagKey` nach Ortstag (Feed,
  Rückblick des Tages, Story-IDs). Heute fallen sie nie auseinander, weil
  keine Partie nach 18 Uhr begonnen hat. Ein gemeinsamer Begriff verschöbe
  Badge-Zähler oder Story-IDs.
- **Der Wochenschlüssel trägt das Kalenderjahr** (`_wochenKey`), nicht das
  ISO-Jahr; in der ersten Januarwoche weicht das ab. Er steckt in gespeicherten
  Ständen. Der Feed bildet seine Wochen-IDs mit einer eigenen Funktion
  (`isoWeek` in `_buildStories`, mit ISO-Jahr und führender Null) — sie
  verdeckt das globale `isoWeek` und bleibt, weil die IDs gespeichert sind.
- **`_yesterdayKey` im Generator** ist Mitternacht Ortszeit, als UTC
  geschrieben; im Sommer ergibt das das Datum von vorgestern. Er steckt in
  der ID von `elo_swing_day_…`.
- **Alte Story-Pfade:** `STORY_ABGEMELDET`, `_newsTexteAuffrischen`, das
  V1-Kartenbild (`_spAnlass`, `_spForm`), die Rückfälle auf `desc` und die
  Speicherschlüssel `NEWS_LS_*_v1`. Sie lesen Zeilen, die schon in der
  Datenbank stehen.
- **`_consolidateStoriesLegacy`** ist trotz des Namens der aktive Hauptweg
  der Konsolidierung.

## Rechnungen

- **Die Elo-Rechnung** (`simulateElo`, `simulateEloWithSliders`,
  `periodPlayerStats`) teilt Buchführung, bleibt aber dreifach: die Deltas
  werden gespeichert, und schon eine andere Reihenfolge der
  Gleitkommarechnung verschöbe Werte in der Datenbank.
- **`longestStreaks` neben `longestPlayerStreak`** und **`_computeCarry`
  neben `countCarries`**: die eine Rechnung fragt alle Spieler auf einmal,
  die andere je Spieler in der Badge-Schleife. Zusammengelegt wäre die
  Schleife quadratisch; `tests/tafel` hält die Serien aneinander.
- **`_stQuote` und die ausgeschriebene Quote** im Katalog: `_stQuote` gibt
  bei leerer Menge 0, die ausgeschriebene Form `NaN`. Wo eine Schwelle oder
  `Math.min` darauf folgt, ist das ein anderes Ergebnis.

## Vereinheitlicht, mit einem Randfall

- **Der Spieler der Woche** steht jetzt an einer Stelle
  (`_periodeRangliste`). Der Wochenrückblick verglich die Quote exakt, der
  Zähler der Auszeichnung und der Feed mit 0,001 Toleranz. Zwei verschiedene
  Quoten liegen erst ab rund dreißig Partien eines Spielers in einer Woche
  so dicht beieinander; in den echten Partien kommt das nicht vor, und der
  Rückblick zeigt jetzt in jedem Fall denselben Sieger wie die Auszeichnung.
