# §C44 Das Positionsprofil: wo jemand spielt und wo er besser ist

## Regel

- Das Positionsprofil ist eine Zahl zwischen 5 und 95 % Sturm (`positionsLage`, `positionsProfilWert`). Es addiert zwei Chancen: `POS_LEISTUNG` (10) mal den Abstand der Leistung je Partie, vorne gegen hinten, und die Aufstellung, ln((Sturm + 1) / (Abwehr + 1)).
- Leistung heißt: Sieg und Torverhältnis, beide gegen die Erwartung der Partie, je zur Hälfte (`posTorLeistung`: Vorsprung durch alle Tore weniger Siegchance minus 50 %). Die Erwartung kommt aus der Elo aller vier und kennt damit Gegner und Mitspieler.
- Die Leistung je Position misst gegen den eigenen Schnitt aller Partien, nicht gegen null, und wird mit `POS_SCHRUMPF` (15) Partien dorthin gezogen. Wenige Partien auf einer Seite sagen wenig; keine Mindestzahl schaltet eine Seite hart ein oder aus.
- Die Aufstellung zählt voll, solange eine Seite kaum Partien hat, und mit Partien auf beiden Seiten bis hinunter auf `POS_MENGE_MIN` (ein Viertel): Gewicht 1 − s / (s + 15) · 0,75, s die Partien auf der selteneren Seite.
- Verglichen wird je Partie, nie die Summe: eine Summe wächst mit der Zahl der Partien.
- Eine Rechnung für jede Frage nach der Position eines Spielers: das Profil und seine Einstufung (`posClassify`), die hell gezeichnete Rolle im Profil (`staerker`, gleichauf bis drei Prozentpunkte), das Blatt „So entsteht die Einstufung", der Positionsbonus der Elo-Rechnung, „Der Wandler", das Durchwechseln im Match-Builder und die Spalte `players.atk`. Die Zähler je Position schreiben beide Elo-Rechnungen mit `posZaehlenPartie` fort, die Chronik mit `posTorLeistung`.
- Der Positionsbonus der Elo (`posFactor`): auf der Seite, auf der das Profil schwächer ist, bringt ein Sieg mehr und kostet eine Niederlage um genauso viel weniger, bis `POS_GRENZE` (10 %); auf der stärkeren dämpft ein Sieg und eine Niederlage kostet zusätzlich, halb so viel, bis `POS_DAEMPFER` (5 %). Die Höhe folgt allein der Klarheit der Einstufung (0 bei 50 % Sturm, voll bei 5 oder 95 %) mal zwei mal `pos_swing`, nicht dem Anteil der Partien. Nach einer Niederlage gilt der Faktor gespiegelt (`2 − f`). Die Aufschlüsselung einer Partie nennt Seite, Prozent und Wirkung (Bonus, Schutz, Dämpfer, Abzug). Gespeicherte Deltas bleiben, wie sie sind [§3.5a]; die Regel gilt für neue Partien und für eine Neuberechnung aus den Einstellungen.
- Das Blatt der Einstufung zeigt je Position Partien, Siegquote, den Elo-Abstand zu Gegnern und Mitspieler vor jeder Partie, Sieg und Tore gegen die Erwartung, die Leistung gegen den eigenen Schnitt und die Wirkung in der Elo für genau diesen Spieler.
- Der Wert der Positions-Rangliste (`posWert` [§5.2]) fragt etwas anderes, nämlich wer auf einer Position der Beste der Liga ist, und bleibt getrennt. Die Erklärung dort sagt das.
- Karriereende [§C40]: das Profil vergleicht einen Spieler nur mit sich selbst und entsteht aus den eigenen Partien; es fragt weder `sichtbar` noch `ligaAktiv`.

## Stellen

`05-rang-elo.js` (`POS_SCHRUMPF`, `POS_LEISTUNG`, `POS_MENGE_MIN`, `POS_GRENZE`, `POS_DAEMPFER`, `posTorLeistung`, `posZaehler`, `posZaehlenPartie`, `posPerfFrom`, `positionsLage`, `positionsProfilWert`, `posFactor`, `atkStrength`, `posClassify`), `10-elo-engine.js` (Zähler in beiden Rechnungen, Positionsbonus in `simulateEloWithSliders`), `34-chronik-rekorde.js` (`atkTor`, `defTor`), `18-profil.js` (Positions-Profil, Rollen, `zeigeProfilPosInfo`), `22-team-profil.js` (Aufschlüsselung „Positions-Bonus"), `32-chronik-katalog.js` („Der Wandler"), `20-bind.js` (Durchwechseln), `15-views-rest.js` (Erklärung des Positions-Swing), `12-view-positionen.js` (Abgrenzung im Blatt „So entsteht der Wert").

## Prüfung

`tests/rechnen` hält Henry an den echten Partien bei „Reiner Verteidiger" unter dem Anteil seiner Sturmpartien und prüft, dass gleiche Leistung je Partie auf beiden Seiten nur die Aufstellung übrig lässt, gewogen nach der selteneren Seite, dass dieselbe Aufteilung aus mehr Partien weniger zählt, dass zehn Prozentpunkte besser vorne bei 50:50 mehr wiegen als drei Viertel der Partien vorne, dass Sieg und Torverhältnis je zur Hälfte zählen und ein 10:6 bei 75 % genau die Erwartung ist, dass wenige Partien zum eigenen Schnitt gezogen werden, dass `staerker` der Leistung folgt, dass die schwächere Seite bis 10 % und die stärkere genau halb so weit reicht, auch mit vollem Regler, dass Henry vorne die vollen 10 % und hinten 5 % Dämpfer trägt, dass die Höhe der Klarheit folgt und nicht dem Anteil der Partien (ein Stürmer mit 78 % trägt mehr als ein Verteidiger mit 72 %, bei 50 % zählt keine Seite anders), dass eine Niederlage den Faktor gespiegelt trägt, dass der Elo-Abstand zu Gegnern und Mitspieler aus dem Stand vor jeder Partie kommt und dass die Elo-Rechnung dieselbe Lage aus den Partien davor liest; `tests/disziplinen` legt „Der Wandler" und das Profil nebeneinander; `tests/blatt` misst die hell gezeichnete Rolle gegen `staerker` und das Blatt der Einstufung bei 360 px, Zeile für Zeile mit Sturm links und Abwehr rechts, samt der Wirkung in der Elo.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Henry stand im Profil bei 29 % Sturm und 71 % Abwehr, eingestuft als
Verteidiger. Gespielt hatte er 15 Partien vorne mit 4 Siegen und 187
hinten mit 76 Siegen: vorne 25 Prozentpunkte unter der Erwartung je
Partie, hinten 3. Die alte Rechnung mischte zu gleichen Teilen den Anteil
der Partien (7 %) und eine Leistungshälfte, die die SUMME der
Überperformance verglich: −3,7 vorne gegen −6,0 hinten. Weil hinten mehr
Partien standen, war das Minus dort größer, und die Leistungshälfte sagte
50:50 — schlechter als in der Abwehr zu spielen schob ihn nach vorne. Wer
insgesamt unter der Erwartung spielt, wurde so auf seine seltenere
Position gedrückt; Jane (vorne 31 %, hinten 66 % Siege) stand bei 33 %,
Leo (vorne 34 %, hinten 52 %) als Abwehr-Flex.

Dazu kamen ein Regler „Positions-Erfahrungs-Gewicht", der Häufigkeit und
Leistung linear mischte, und eine Mindestzahl von drei Partien, ab der eine
Seite voll zählte und darunter gar nicht. Beides ersetzt die Rechnung in
Chancen: die Leistung entscheidet, die Häufigkeit hilft, solange es
wenig zu messen gibt, und das Ziehen zum eigenen Schnitt macht aus drei
Partien keinen Beweis.

In der ersten Fassung dieser Rechnung zählte die Häufigkeit voll und die
Leistung mit dem Faktor 4. Bei Henry stand −2,5 aus der Aufstellung gegen
−0,5 aus der Leistung; Leo spielte gleich oft vorne und hinten, vorne 14
Prozentpunkte schwächer, und stand bei 35 % kaum anders als jemand ohne
Unterschied; Maxi und Stefan, auf beiden Seiten gleich stark, standen als
Stürmer, weil sie öfter vorne spielten. Die Leistung zählt jetzt zehnfach,
die Aufstellung mit Partien auf beiden Seiten nur noch zu einem Viertel.
Das Torverhältnis kam dazu, weil es verlässlicher misst als der Sieg
allein: an den echten Partien, in zwei Hälften geteilt, stimmte der
Abstand vorne gegen hinten mit Toren zu 0,62 überein, mit Siegen allein
zu 0,41. An den 611 Partien der Liga stehen Henry bei 6 %, Jane bei 8 %,
Leo bei 28 %, Maxi bei 55 % (Sturm-Flex), Stefan bei 49 % (Flex), Jannik
bei 65 %, Leon bei 77 % und Julian bei 82 %.

Der Positionsbonus der Elo maß gegen 50:50. Für jeden, der fast nur auf
einer Position spielt, war das ein Abzug bei jedem Sieg und ein Aufschlag
bei jeder Niederlage auf der eigenen Stammposition (Henry hinten 0,83 und
1,17): die Elo eines Spezialisten lief nach unten, weil er dort spielte,
wo er es kann. Ein genaueres Profil hätte das verschärft. Gegen die
eigene Aufteilung gemessen hebt sich der Bonus über die eigenen Partien
auf, aber auf der Stammposition kostete er ohne Grenze bis zu 7 % (Jane,
Julian, Leon). Ganz ohne Abzug zählte ein Sieg dort so viel wie auf der
schwächeren Seite, obwohl er dort leichter fällt. Danach war nur der
Abzug begrenzt, auf 5 %, und der Bonus nicht: Henry bekam vorne 33 %
mehr, und ein Ausschlag von einem Drittel sagt mehr, als eine Einstufung
aus 15 Partien weiß. Danach galten 10 % in beide Richtungen, gemessen gegen
die eigene Aufteilung: der Ausschlag einer Seite wuchs mit dem Anteil der
anderen, damit sich beides über die eigenen Partien aufhob. Das traf die
Falschen. Henry gewann in der Abwehr und verlor 0,49 von 57 Elo (0,8 %),
obwohl er dort klar stärker ist; Leo (72 % Verteidiger) trug nach einer
Niederlage hinten 2,48, Leon (78 % Stürmer) nach derselben vorne nur 1,37,
weil Leo fast gleich oft auf beiden Seiten steht. Jetzt folgt die Höhe der
Klarheit der Einstufung, und die stärkere Seite trägt halb so viel wie die
schwächere: der Dämpfer ist klein, die Belohnung für einen Sieg auf der
schwächeren Seite deutlich. Ohne Ausgleich über die eigenen Partien steht
ein reiner Spezialist dadurch etwas tiefer, aber nicht weit, weil die Elo
sich nachzieht: bei 5 % liegt das Gleichgewicht dort, wo die Erwartung des
Teams 2,5 Punkte tiefer liegt, rund 35 Elo der eigenen.

Drei Stellen beantworteten die Frage, wo jemand besser ist, auf drei
Arten: das Profil, eine Kopie seiner Formel in der Elo-Rechnung und die
Rollen im Profil, die die rohe Siegquote verglichen und weder Partner noch
Gegner noch die Zahl der Partien kannten. Jetzt antwortet `positionsLage`
für alle. Die Aufschlüsselung einer Partie schrieb nach einer Niederlage
auf der schwachen Position „Starke Position", weil sie den Multiplikator
las statt den Faktor.

Die Erklärung im Reiter Positionen nannte drei Bestandteile ihres Werts,
gerechnet werden vier; die Tore fehlten.
