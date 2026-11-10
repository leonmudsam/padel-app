# §C25 Farbgesetz

## Regel

- Status- und Wertfarben haben vier Rollen: Rangfarbe heißt „ich", Gold heißt Titel oder heute gehaltener Rekord, Grün und Rot zeigen ausschließlich eine Richtung, alles Übrige ist Metall.
- Der Feed trägt daneben eine leise Navigationsschicht und keine Wertung: Gold für Spieler des Tages und der Woche, kühles Metall für Ewige Tafel und Bestmarken, Violett für Insignien und Auszeichnungen, Grün für positive Spieltagsdynamik, Bronze für das Duell, Rot für Breaking und negative Richtung. Fun Facts tragen davon nur einen schwachen Farbschnitt.
- Diese Farben sitzen nur an Kante, Rubrik, Zeichen und einem schwachen Schimmer; Kartenflächen bleiben dunkel.
- Im Rekorde-Reiter tragen Können, Aktuelle Form und Bestmarke Gold, die Fügung Metall, die Schattenseite Rot: fünf Kammern, drei Töne.
- Was negativ ist (`neg`, aus `art:'schatten'` oder `negativ:true`), trägt Rot, steht hinten und zählt nirgends als Rekord (`rekordZaehlung`); `nextRecordFor` schlägt es nicht vor. Das Banner des Beinamens im Profilkopf trägt deshalb nie eine Schattenseite: es ist ein Titel und immer Gold [§C39].
- Die Kammer steht als `data-kammer` an der Karte, nicht als Farbklasse: eine Fügung kann rot sein und bleibt eine Fügung.
- Die Klassen der Auszeichnungen tragen ihren Namen als Farbe: Gold legendär, Lila selten, Rot negativ; „gewöhnlich" steht im Profil in Metall statt Grün, weil es die größte Gruppe ist und das Profil sonst bunt würde. Die Monatschroniken ebenso (`chronikStufe`, `chronikTon`): Gold legendär, Lila selten, Metall besonders, Rot die Schattenseite — in Matrix, Profilstreifen und Plakette; Gold glänzt in der Matrix.
- Im Profil und in der Laufbahn liegt unter jeder Überschrift eine gestrichelte Kante in der Rangfarbe; die Insignium-Stufe (`st-<Stufe>`) ändert nur Höhe und Kraft, der Ordensstern trägt sie facettiert.

## Stellen

`src/css/14-farbgesetz.css`, `_newsSorte` und `--story` im Feed, `rekordZaehlung` und `nextRecordFor` (`34-chronik-rekorde.js`).

## Prüfung

`tests/blatt` hält Besitzleiste und Podest je Spieler aneinander, misst Farbfamilien und Kanten im Feed, im Profil die Klassenfarben der Auszeichnungen und die Kante unter jeder Überschrift auf jeder Stufe, in der Chronik-Matrix die Farbe jeder Zelle nach ihrer Stufe und den Glanz nur auf Gold.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Status- und Wertfarben haben vier feste Rollen:
1. Rangfarbe = „ich"
2. Gold = Titel und heute gehaltene Rekorde
3. Grün/Rot = ausschließlich Richtung
4. Metall = alles Übrige
Der News-Feed setzt daneben eine **leise Navigationsschicht**, keine neue
Wertung: Rubrikgold bleibt Spieler des Tages und Woche vorbehalten; die
Karte des Tages trägt Gold nur als übergeordneten Auswahlschimmer. Kühles
Metall führt durch Ewige Tafel und Bestmarken, Violett durch Insignien und Auszeichnungen,
Grün durch positive Spieltagsdynamik, Bronze durch das direkte Duell und
Rot durch Breaking oder eine negative Richtung. Fun Facts bleiben die
leiseste Kartenform, tragen innerhalb davon aber einen kleinen Farbschnitt:
Blau für Liga/Chronik, Violett für Spieler/Laufbahn/Auszeichnungen, Grün
für Form und Bronze für Duelle.
Diese Farben sitzen nur an Kante, Rubrik, Zeichen und einem schwachen
Schimmer; alle Kartenflächen bleiben dunkel. Zwölf eigene Vollfarben wären
ein Regenbogen, eine einzige Goldfamilie machte dagegen jede zweite Karte
zum vermeintlichen Titel.
Im Rekorde-Reiter heißt das: Können, Aktuelle Form und Bestmarke tragen
Gold, die Fügung Metall [§C35] — sie zeichnet niemanden aus —, die
Schattenseite Rot. Als alle Karten golden waren, sagte Gold dort nichts
mehr. Fünf Kammern tragen deshalb drei Töne und nicht fünf: eine neue Farbe
je Kammer wäre ein Regenbogen, und das Farbgesetz kennt vier Rollen.
Das **Banner des Beinamens im Profilkopf** trägt keine Schattenseite. „Der
Gestrandete" kommt aus der Durststrecke und stand erst golden unter dem
Namen wie ein Titel, dann rot — und rot verdrängte er den Beinamen, den
jemand einen Monat davor geholt hatte. Ein Banner ist ein Titel; was
negativ ist, steht in der Matrix und auf der Plakette, rot, und im Banner
gar nicht [§C39].
**Was negativ ist, trägt Rot und zählt nicht als Rekord** (`neg`, gesetzt
von `art:'schatten'` oder `negativ:true` im Katalog). „Die bitterste
Pleite" stand im Profil golden zwischen den Titeln und machte aus sechs
Rekorden sieben; sie steht dort jetzt rot, hinten und außerhalb der Zahl,
und `nextRecordFor` schlägt sie niemandem als Ziel vor.
**Gezählt wird sie an keiner Stelle** (`rekordZaehlung`): die Besitzleiste
des Rekorde-Reiters zählte sie mit, Podest und Profil nicht, und damit
standen zwei Zahlen unter demselben Wort — Martins Säule sagte 13, seine
Podestkarte „10 Rek.". Die Regel steht deshalb in der Zählung und nicht
dreimal im Aufruf [§C27]; sichtbar bleibt die Schandtafel in ihrer Kammer.
`tests/blatt` hält Leiste und Podest je Spieler aneinander — eine Summe
stimmt auch dann, wenn zwei Spieler ihre Zahlen tauschen. Die **Kammer**
bleibt davon unberührt — sie steht als `data-kammer` an der Karte, nicht
als Farbklasse, weil eine Fügung rot sein kann und trotzdem eine Fügung
bleibt — und `art` auch, sonst verschöbe sich das Prestige [§C34].

**Die Klassen der Auszeichnungen sind Namen, keine Wertung des Profils.**
Das Profil färbte „selten" in der Rangfarbe: bei goldenem Rang stand eine
seltene Auszeichnung in demselben Gold wie eine legendäre, und die Leiste
darunter sagte nicht mehr, welche Klasse wie viel ausmacht. Sie trägt jetzt
Lila wie im Blatt der Auszeichnungen und im Popover. „Gewöhnlich" bleibt im
Profil Metall: es ist die größte Gruppe, und in Grün wäre das Profil bunt,
ohne mehr zu sagen.
**Die Kante unter den Überschriften hing an einer alten Leiter.** Ihre
Regeln trugen die Schlüssel `kerben` und `strahl`, die es seit Schildring,
Volutenkranz, Zierkranz und Kronenreif nicht mehr gibt: unter deren
Überschriften stand keine Kante, am Reif ein Hauch, gestrichelt war sie nur
am Lorbeerreif — und weil den nur die Spitze trug, sah es aus, als gehöre
die Kante zum Rang Legende. Die Grundregel trägt jetzt selbst die Striche.
