# §C29 Zwei Ranglisten über denselben Zeitraum

## Regel

- Spieler und Duos einer Saison sind zwei Ranglisten desselben Zeitraums: ein Reiter (`ligaSicht`) wechselt sie, keine zweite Seite.

## Stellen

`11-view-ranking.js`, `ligaSicht` in `01-update.js`.

## Prüfung

`tests/blatt` (Reiter bei 360 px), `tools/golden.mjs` (Ansicht `liga-duos`).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Eine Saison hat zwei Sieger: den besten Spieler und das beste Duo. Beides
sind Ranglisten desselben Zeitraums, also stehen sie im selben Rahmen und
werden über einen Reiter gewechselt (`ligaSicht`: Spieler · Teams), nicht
über eine zweite Seite. Das Duo stand vorher nur als Karte über der Tabelle —
man sah den Ersten, aber nie den Rest.

Stellen: `11-view-ranking.js`, Zustand `ligaSicht` in `01-update.js`.
