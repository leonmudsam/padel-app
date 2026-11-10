# §C36 Die Titel sind Licht

## Regel

- Die Meistertitel sind eine Aura hinter Avatar und Insignium (`AURA_STUFEN`): zehn Stufen, je Titel eine, danach zählen die Sterne weiter [§C26].
- Maß aus dem Entwurf: die Aura ist 1/0,7 so breit wie das Zeichen (`AURA_SEITE`), ihre Mitte bis Radius 184 von 1000 frei — durch das Gesicht fällt kein Licht.
- Jede Stufe wird einmal gerechnet und als Blob-Adresse gemerkt (`auraHref`); im Wappen steht sie still als `<image>`.
- Bewegt nur im Profilkopf (`auraLebendHtml`), in drei Bildebenen, die nur `transform` und Deckkraft ändern; bei Bewegungsruhe still.
- In der Laufbahn stehen die zehn Stufen klein als zweite Leiter (`.lb-auren`).

## Stellen

`35c-titel-aura.js`, `35b-prestige.js` (`insigniumSvg`), `src/css/12-insignium.css`.

## Prüfung

`tests/zeichen` misst Lage, Größe, Loch und Helligkeit je Stufe; `tests/blatt` die Bewegung.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Hinter Avatar und Insignium steht die
**Aura** der Meistertitel (`35c-titel-aura.js`, `AURA_STUFEN`), die Korona
aus `mockup/titel-aura`: ein weicher Goldschein mit ungleich langen
Strahlen, ab der vierten Stufe Goldstaub, ab der siebten ein Lichtring, ab
der neunten einzelne Lichtsterne. Zehn Stufen, je Titel eine; danach
bleibt sie stehen, und die Zahl neben den fünf Sternen zählt weiter
[§C26]. Sie ersetzt die Rankenschwinge: die stand golden NEBEN dem Zeichen,
griff zweieinhalb Reifradien weit aus, musste in einer Zeile auf 78 %
zurückgenommen werden, und ein dritter goldener Kranz neben dem silbernen
war einer zu viel. Licht nimmt keine Form weg und liegt hinter allem.
**Das Maß kommt aus dem Entwurf**: dort nimmt das Insignium 70 % der
Fläche ein, also ist die Aura 1/0,7 so breit wie das Zeichen
(`AURA_SEITE`), und ihre Mitte ist bis Radius 184 von 1000 ausgespart —
genau am Reif beginnt der Schein, und durch das Gesicht fällt kein Licht.
Die Bandbox bleibt, wie sie war: die Aura leuchtet über sie hinaus
(`overflow:visible`), sonst rückte jede Stelle, an der das Banner steht.
**Jede Stufe wird einmal gerechnet und als Datei gemerkt** (`auraHref`,
eine Blob-Adresse wie bei den Wappen [§C30]). Im Wappen steht sie als
`<image>`, still: die Unschärfe der Strahlen rastert der Browser einmal.
**Bewegt ist sie nur im Profilkopf** (`auraLebendHtml`), und dort in drei
eigenen Bildebenen — Schein, Strahlen, Gegenstrahlen samt Staub —, die
sich nur über `transform` und Deckkraft bewegen: das rechnet die
Grafikkarte. Im Entwurf drehten sich Gruppen INNERHALB des SVG, und dann
rechnet der Browser die Unschärfe in jedem Bild neu; sechs Ebenen in
voller Größe hätten auf einem Telefon mit dreifacher Pixeldichte über
30 Megabyte Grafikspeicher gekostet. Im Zeichen dahinter steht sie dort
nicht noch einmal (`insigniumSvg(…, {lebendig:true})`). Bei
`prefers-reduced-motion` steht sie still.
In der Laufbahn stehen ihre zehn Stufen als **zweite Leiter** unter der
Vitrine (`.lb-auren`): zwei Reihen zu fünf, klein, in jedem Feld das
eigene Zeichen als Bild aus demselben Topf. Klein ist Absicht: die
Vitrine sammelt man Punkt für Punkt, die Aura gewinnt man, und zwei gleich
laute Leitern auf einer Seite sind keine mehr. `tests/zeichen` misst Lage,
Größe, Loch und die Helligkeit je Stufe, `tests/blatt` die Bewegung.
