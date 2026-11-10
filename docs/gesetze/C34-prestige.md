# §C34 Drei belegbare Quellen, kein versteckter Leistungswert

## Regel

- Prestige kommt ausschließlich aus Auszeichnungen, Monatschroniken und aktuell gehaltenen Liga-Rekorden. Nur Rekorde können wieder sinken; Auszeichnungen und Chroniken bleiben Teil der Laufbahn.
- Je Monat zählt der Eintrag, der in der Matrix steht [§C32]; für abgeschlossene Monate aus dem Einfrierer (`_frozenTitlesOf`), nicht aus einer neuen Rechnung — außer der Monat wurde mit einer älteren Fassung des Katalogs eingefroren (`SEASON_TITLES_FREEZE_V`).
- Jede positive Auszeichnung zählt jedes Mal. Standard je Klasse in `PRESTIGE_AUSZEICHNUNG` (Rare 25 / −18 %, Common 3 / −25 %); jede legendäre, POTW/POTD und die acht Meilensteine der Laufbahn tragen einen eigenen Startwert in `PRESTIGE_AUSZEICHNUNG_SPEZIAL` (Siegermaschine 150, Urgestein 100, Abwehrchef und Mittelstürmer 60, Allrounder und Dauerbrenner 50, Stammgast 10, Debütant 5). Je zwei Verleihungen teilen eine Stufe, danach flacht die harmonische Kurve paarweise ab und endet nie. Schanden geben null.
- Das Regelblatt liest die Startwerte aus der Tabelle (`_prestigeRegelListe`), nicht aus einer festen Liste.
- Chroniken behalten ihren Wert aus `chronikPunkte`: der Grundwert 100 für jede Klasse und Art, dazu je σ, um die der Halter die Schwelle überbietet, zehn Punkte mal die Halbierungen an der Schwelle (`chronikBonus`, `chronikHalbierungenJeSigma`: 24 bei 1,2 σ Ausschlag, 54 bei 3,5 σ), eine Schattenseite nichts [§C39]; je Monat zählt der wertvollste Eintrag (`chronikEintragVon`), eine besondere Chronik, die eine Schattenseite desselben Monats überschattet (`chronikUeberschattet`), mit null; die Sammlung wird nach Wert gedämpft: Platz 1–2 voll, 3–5 ÷ √2, 6–8 ÷ √3, danach alle drei eine Wurzelstufe weiter.
- Rekorde beginnen bei `allzeit.basis` aus `REKORD_GRUNDWERT` (`_rekordBasis`; 100 Können/Form/Bestmarke, 75 Rollenwert/Fügung, 0 Schattenseite; fehlt er, gilt der Wert der Kammer), werden durch die Zahl der heutigen Halter geteilt und wie Chroniken gestapelt. Keine Quelle hat einen harten Deckel.
- Ein geänderter Grundwert gilt für jede Rechnung von heute: Laufbahn, Rangfolge, Insignium, Ziele, neue Stories und den Stand eines Ruheständlers bis zu seinem Abschluss. Gespeicherte Stories behalten die Zahlen ihres Tages; ein gespeicherter Abschluss eines Ruheständlers bleibt, wie er ist [§C40].
- Das Blatt einer Rekord- oder Tafel-Karte zeigt die Wirkung aus den beiden gespeicherten Ständen (`laufbahn`, `_ndWirkungBlock`), keinen Rechentext; die Rechnung steht im Laufbahnblatt (`_prestigeQuellSatz`). Alle drei Rekordfälle teilen dieses Blatt. Die Zahl ist die Bewegung des ganzen Spieltags; darunter steht sie nach Quellen aufgeteilt (Rekorde, Monatschroniken, Auszeichnungen, `_ndWirkungQuellen`), die zusammen die Zahl ergeben, und bis zu zwei Posten in ihrer Richtung, die die Karte sonst nicht nennt. Neue Karten speichern die Quellen (`rek`, `mon`), ältere werden an den Ständen des Tages nachgerechnet und nur gezeigt, wenn sie die gespeicherte Zahl treffen.
- Die Blätter der Ewigen Tafel tragen eine Bühne (`_ndWechselBuehne`, `_ndChronikBlatt`, `_ndMonatBlatt`, `_ndInsigniumBlatt`, `_ndInsTagBlatt`, `_ndTafelMomentBlatt`, `_ndHeldBuehne`, `_ndFaktBlatt`); eine Zeile führt zu ihrem Eintrag (`_ndTafelZiel`); keine Überschrift ohne Inhalt (`_ndOhneLeere`).
- Die Seltenheitsklasse (`BADGE_RARITY`) sagt, wie schwer eine Auszeichnung zu holen ist; Gold gehört nicht der Anwesenheit. Wer eine Klasse verschiebt, zieht `RARITY_META.total` mit.

## Stellen

`35b-prestige.js` (`prestigeTabelle`, `prestigeOf`, `PRESTIGE_*`), `17-badges.js` (`BADGE_RARITY`), `31a-news-detail-mitte.js` (Blätter der Ewigen Tafel).

## Prüfung

`tests/disziplinen` (Quellen, Folgen, Dämpfung, Erreichbarkeit), `tests/archiv` (eingefrorene Monate), `tests/rechnen` (dieselbe Restverteilung in Laufbahn und Story), `tests/ambient` (Zahlen jeder Bühne).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Prestige
[§13.8] kommt ausschließlich aus **Auszeichnungen, Monatschroniken und
aktuell gehaltenen Liga-Rekorden**. Siegquote, Elo-Hoch oder Spielzahl
erzeugen keinen vierten Punktetopf; Können zählt erst, wenn daraus einer
dieser sichtbaren Erfolge geworden ist. Nur aktuell gehaltene Rekorde dürfen
beim Verlust eines Bestwerts wieder sinken; erworbene Auszeichnungen und
Monatschroniken bleiben Teil der Laufbahn.
Gezählt wird je Monat **der Eintrag, der in der Matrix steht** [§C32] — nicht
jeder Bestwert dieses Monats: ein dominanter Monat gewinnt acht Quoten auf
einmal, und die sagen alle dasselbe über denselben Monat. Es ist derselbe
Eintrag, den das Profil zeigt, sonst stünde dort eine Wertung und im
Prestige eine andere, und die Zahl wäre nirgends nachzuzählen. Für einen
abgeschlossenen Monat kommt er aus dem Einfrierer (`_frozenTitlesOf`) und
nicht aus einer neuen Rechnung: sonst verschöbe ein geänderter Katalog
rückwirkend das Prestige jeder Laufbahn. `tests/disziplinen` und
`tests/archiv` messen beides.

**Jede positive Auszeichnung zählt jedes Mal.** Ihre sichtbare Klasse setzt
den Standard (`PRESTIGE_AUSZEICHNUNG`): Rare **25 / −18 %**, Common
**3 / −25 %**. **Jede legendäre Auszeichnung trägt ihren eigenen
Startwert** in `PRESTIGE_AUSZEICHNUNG_SPEZIAL`, dazu die Wochen- und
Tageswertung: Meister der Saison **150** (−5 %), 20er Serie und Dynastie
**120**, 15er Serie und Team der Saison **75**, Dominator, Award-Sammler
und Untouchable **70**, Player of the Week **50** (−12 %), Mr. Perfect
**50**, Absoluter Sieger **40** (−15 %), Player of the Day **10** (−25 %),
die übrigen mit −10 %. Der Meister ist die höchste Auszeichnung einer
Saison und lag mit 100 unter der 20er Serie und der Dynastie. **Die
Siegesserien sind eine Treppe**: 5er **15**, 10er **40**, 15er **75**,
20er **120**; mit dem Wert ihrer Klasse brachte die 10er Serie 25 und die
5er 3, und die Stufen dazwischen sagten nichts. Ihre Abnahme bleibt die
ihrer Klasse. **Die Meilensteine der Laufbahn** stehen ebenfalls mit
eigenem Wert darin: Siegermaschine **150**, Urgestein **100**, Abwehrchef
und Mittelstürmer **60**, Allrounder und Dauerbrenner **50**, Stammgast
**10**, Debütant **5**. Sie fallen einmal und zeigen Fortschritt, und der
soll mehr tragen als Menge: mit dem Wert ihrer Klasse brachten 300 Siege
25 Prestige, weniger als drei Spieler des Tages. Die Schwellen blieben
stehen; an den echten Partien stiegen damit die drei an der Spitze vom
Zierkranz zum Lorbeerreif, erarbeitet und nicht vom Katalog geschoben.
Die Karten der Klassen im Regelblatt nennen seitdem die Spanne ihrer
Startwerte, sonst stand „Rare 25 P" über einer Siegermaschine mit 150. Ein Wert für die ganze Klasse stellte die 20er Serie
neben den 10:0-Sieg und die Dynastie (600 Elo) neben den Dominator (400);
das sind verschiedene Höhen. Der Standard der Klasse (70) greift nur für
eine neue legendäre Auszeichnung ohne eigenen Eintrag. Die Tabelle steht
nach Gewicht geordnet, und **das Regelblatt liest sie von dort**
(`_prestigeRegelListe`, nach Startwert, dann der langsameren Kurve): es
stand eine feste Liste aus sechs Zeilen da, und eine neue Auszeichnung
wäre gar nicht oder hinten angehängt erschienen. Ein Balken je Zeile
zeigt den Startwert gegen den höchsten.
Damit ist der Meister unter den Saisonwürden am wertvollsten, Dominator
und Team der Saison liegen gleichauf. Der seltenere Wochensieger wiegt
klar vor dem stark von der Zahl eigener Spieltage abhängigen Tagessieg.
Je zwei Verleihungen teilen eine Stufe: Nummer eins und zwei zählen voll,
Nummer drei und vier sinken um den genannten Prozentsatz; danach wird die
harmonische Kurve paarweise flacher statt geometrisch gegen ein Limit zu
laufen. Drei Dominator-Erfolge ergeben 70 + 70 + 63, drei Carry-Erfolge
3 + 3 + 2,25. Jeder weitere positive Erfolg erhöht das Prestige, auch nach
tausend Wiederholungen. Schanden geben null Punkte und ziehen nichts ab.
Der Vergleich im festen Ligabestand misst dazu Spiele, Siegquote und alle
drei Prestigequellen gemeinsam: Julian steht mit 65 % aus 171 Partien bei
3004 Prestige und 1176 Auszeichnungspunkten, Maxi mit 44 % aus 348 Partien
bei 1145 und 906. POTD allein kann den doppelten Spielumfang damit nicht mehr
stark hebeln; vier seltene Wochensiege bringen Julian rund 188 Punkte. Das
ist eine gezielte Korrektur der beiden Perioden-Auszeichnungen, kein neuer
versteckter Skill-Multiplikator.

Monatswertungen behalten ihren tatsächlichen Info-Sheet-Wert aus
`chronikPunkte`: Grundwert und Bonus aus dem Wert, mit dem der Halter in
der Tafel steht [§C39]. Erst die Zusammenrechnung dämpft die nach Wert sortierte
Sammlung: Platz 1–2 zählen voll, 3–5 durch √2, 6–8 durch √3 und danach alle
drei Werte eine Wurzelstufe weiter. Liga-Rekorde beginnen bei dem
**Grundwert, der an ihrem Katalogeintrag steht** (`allzeit.basis`,
`_rekordBasis`, die Zahlen in `REKORD_GRUNDWERT`): 100 für Können, für die
leistungsbezogene Form und für eine leistungsbezogene Bestmarke, 75 für
einen Rollenwert und eine Fügung, 0 für eine Schattenseite. Er stand
vorher allein in einem Faktor je `art` — und damit konnte „Der
Unaufhaltsame" nicht wie das Können wiegen, ohne gleichzeitig seinen Platz
in der Katalogreihenfolge und in der Monatstafel zu verschieben: `art`
ordnet den Katalog, der Grundwert wiegt. Der Rückfall dieses Faktors las
die Schlüssel „leistung" und „ereignis", die der Katalog nicht kennt, und
hätte jeden Eintrag ohne Grundwert still mit 75 gewertet; jetzt gilt der
Wert der Kammer. Vorher wog das Können 150. Damit stand ein gehaltener
Bestwert neben einem Meistertitel, und wer zehn davon hielt, stand auf der
Leiter vor dem, der die Liga gewann; an den echten Partien trugen Rekorde
ein Viertel des Prestiges. Mit 100 ist es ein Fünftel. Die Schwellen der
Leiter blieben: die Spitze trägt weiter den Lorbeerreif im ersten Grad und
die beiden dahinter den Zierkranz, gesunken ist, wer sein Prestige vor
allem aus Bestwerten hatte. Sie werden durch die Zahl ihrer heutigen Halter geteilt und
dann wie Chroniken gestapelt: Platz 1–2 voll, 3–5 durch √2, 6–8 durch √3
und danach alle drei Rekorde eine Wurzelstufe weiter. So bleiben Rekorde belohnend,
Auszeichnungen tragend und zufälligere Chroniken sichtbar, ohne langfristig
allein zu dominieren. Keine Quelle besitzt einen harten Deckel.
Das Laufbahnblatt zeigt statt der gedrängten Drei-Karten-Legende einen
einzigen klaren Verweis. Er öffnet ein eigenes Regelblatt; dort bleiben
Legendary, Rare und Common in einer Zeile, bekommen aber ausreichend Höhe,
und die sechs Sonderwerte stehen darunter einzeln. Die Postenzeilen nennen
nur noch Klasse, Anzahl, Start- oder letzten Teilwert. Chronikzeilen zeigen den
unveränderten Info-Sheet-Wert als Grundwert und Bonus mit seinem Abstand zur
Schwelle, Rang und Wurzelstufe. Rekordzeilen zeigen
Grundwert, Halterteilung, Rang und Wurzelstufe. Die drei Quellensummen stehen
bereits oben; im echten Bestand tragen Auszeichnungen rund 63 %, Chroniken
17 % und Rekorde 20 % des Prestigevolumens. Eine runde Zahl ist im Blatt
nachrechenbar: „96, geteilt durch zwei Halter, dann durch Wurzel zwei"
liest niemand nach, 100 schon.
**Der rohe Grundwert ist nicht, was jemand bekommt.** Ein zehnter Rekord
gibt nicht 100 Prestige: er wird durch die Zahl seiner Halter geteilt,
landet auf einem Rang im Rekordstapel und wird dort durch die Wurzel seiner
Staffel geteilt — und weil er die anderen Rekorde mit verschiebt, ist der
Nettozuwachs am Ende noch eine dritte Zahl. Das Blatt einer Rekord-Karte
(`_ndRekordBlatt`) zeigt deshalb die **Wirkung aus den beiden Ständen** von
`prestigeTabelle` vor und nach dem Tagesabschluss — gespeichert als
`laufbahn` an der Karte, weil dieselbe Rechnung morgen eine andere Zahl
sagt — gezeichnet wie an der Tafel (`_ndWirkungBlock`): Stufe, Zuwachs oder
Verlust und der Weg zur nächsten Schwelle. Darüber stand je Halter ein
Rechentext („Aktuelle Form · Grundwert 150 ÷ 4 Halter · 18. Rekord ÷ √7 ·
20 Rekorde: 1450 → 1465"); die Rechnung der Quelle steht im Laufbahnblatt
(`_prestigeQuellSatz`), und jede Zeile führt dorthin. Eine Karte aus einem
älteren Lauf kennt die beiden Stände nicht — sie zeigt, was der Rekord
heute bringt, und behauptet keinen Zuwachs. Die **Bühne** zeigt den Wechsel
als Bild — unter „vorher" nur, wer wirklich weg ist, darunter alle Halter
mit Namen — und den Wert, beim Ausbau den alten durchgestrichen davor; die
Sätze „Vorher gehörte der Rekord …" und „Für … heißt der Spieltag …"
fallen im Kopf des Blatts deshalb weg. Die Verfolger bekommen alle Halter:
mit `playerIds`, das höchstens drei nennt, stand der vierte Halter als
Verfolger unter seinem eigenen Rekord. **Und alle drei Rekordfälle teilen
dieses Blatt**: nur „übernommen" hatte einen Fall im Schalter, ein erstmals
vergebener und ein ausgebauter Rekord öffneten gemessen ein Blatt mit null
Zeichen Mitte. `tests/ambient` misst das alles.
**Die übrigen Blätter der Ewigen Tafel tragen ebenfalls eine Bühne**
(`_ndWechselBuehne`, `_ndChronikBlatt`, `_ndMonatBlatt`,
`_ndInsigniumBlatt`). Sie waren eine Spalte aus Zahlenkästen, Podest und
Textzeilen. Der **Chronik-Wechsel** steht auf derselben Bühne wie der
Rekord — ein Wechsel ist ein Wechsel [§C27] — mit Klasse und Monat als
Marken; das Podest des Monats nur, wenn mehr als einer die Bedingung
erfüllt, sonst stünde der Halter zweimal da. Die **Monatstafel** (der Tag,
an dem sie aufgeht) zeigt die Zahl der Einträge, je
Träger einen Balken mit Gesicht und Name (dasselbe Bauteil wie das Feld des
Spielers des Tages) und jeden Eintrag als Zelle aus Zeichen, Name und
Gesicht; eine laufende Tafel wird dabei an der Karte geschnitten
(`seasonTitles(sid, bisMs)`), denn eine Karte von Dienstag erzählt vom
Dienstag. Den Monatswechsel und wer zum ersten Mal in der Chronik steht,
zeigt die Karte des Monatsabschlusses [§C33]. Die **Insignium-Stufe** zeigt die
Verwandlung — die Stufe davor leise, ein Pfeil, die neue groß um das
Gesicht —, woraus die Punkte kommen als ein Balken in drei Farben, den Weg
durch die drei Grade bis zur nächsten Schwelle und die Leiter; gerechnet
wird mit den gespeicherten Punkten, die Aufteilung trägt die Karte als
`teile` und eine ältere im Satz. Was die Bühne zeigt, fällt aus dem Satz
darüber weg (`_ndNeu`). Die Zeilen „Tafel, Profil und Laufbahn"
(`_ndChronikEbenen`) bleiben [§C32]. Der **Tafel-Moment** und die **kurze
Strecke** (`_ndTafelMomentBlatt`) zeigen oben den **Spieltag als Achse**:
jede Partie des Tages ein Punkt darauf, hell, wenn sich nach ihr etwas
bewegt hat, und darüber jede Bewegung als Punkt in der Farbe ihrer Art —
Gold Bestmarke und Chronik (die Chronik hohl), Silber der Ausbau, Violett
die Stufe —, so hoch wie die höchste Säule, und die höchstens fünf Punkte
hoch: danach wird sie breiter. Davor stand je Beteiligtem eine
Zeile mit Gesicht, Name und einem Zeichen je Bewegung, und das sagte die
Liste darunter ein zweites Mal; eine Zeitachse mit gestapelten ZEICHEN und
losen Namenschips davor ließ nicht erkennen, wem welches gehörte. Namen
stehen deshalb nur unten. Ihre
Zeilen (`_ndTafelZeileBild`) zeigen den Eintrag, wer was tat und rechts
den Wechsel aus Gesichtern mit dem Wert — ein langer Wert als eigene Zeile
darunter [§C33] —, und keinen Satz mehr, der beides wiederholt. **Eine Zeile führt zu ihrem Eintrag** (`_ndTafelZiel`): ein
Rekord öffnet sein Blatt, eine Monatschronik ihre Wertung im Monat der
Karte, ein Insignium die Laufbahn — sie führte ins Profil des ersten
Genannten, und wer auf „Der Zerstörer" tippte, landete bei einem Menschen.
Nur eine Zeile ohne Verweis bleibt beim Profil. Eine Zeile ohne Halter aus
einem älteren Lauf bleibt, wie sie war. Die Klassen heißen `nd-ta-…` und
`ta-…`: `.nd-tl` ist die Tagesleiste, `.rek` die Karte des
Rekorde-Reiters und zog ihr Raster über den Punkt, `.nd-tm` die
Partienzeile im Blatt des Spielers des Tages. `tests/ambient` hält
die Zahlen jeder Bühne an ihrer Quelle fest.
**Ein Spieler und eine Zahl stehen zusammen** (`_ndHeldBuehne`):
Meilenstein und Jubiläum (die Zahl, die Leiter der Marken davor und
danach, die Bilanz bis zur Partie als Balken, beim Elo-Meilenstein die
Elo der Laufbahn als Linie mit der Marke), die Form (der Vorsprung, beide
Quoten als Balken und die zehn Partien als Lauf) und der Ausschlag eines
Tages (die Elo des Tages als Kurve und der Tag in Partien). Sie zeigten das
Wappen im Kopf und die Zahl darunter in einem Kasten oder einer Zeile. Das
**Spitzenspiel** zeigt Platz eins und zwei mit dem Ergebnis dazwischen und
darunter die Abschnitte jeder Partie, die **runden Marken** eines Tages je
Marke eine Kachel aus Zeichen, Zahl und Gesicht. Der **Fun Fact** eines
Spielers (`_ndFaktBlatt`) steht auf derselben Bühne wie der Meilenstein;
darunter das Zeichen, wenn es um Prestige geht, die Verfolger, wenn es ein
Rekord ist, sonst die letzten zehn Partien bis zum Tag der Karte. Die
Leiter der Liga und ein Paar behalten ihr eigenes Blatt. **Und kein Blatt trägt
eine Überschrift ohne etwas darunter** (`_ndOhneLeere`): „Die Partie zum
Meilenstein" stand über nichts, weil die Partie schon im Kopf stand.
Die Seltenheitsklasse (`BADGE_RARITY`) sagt, wie schwer eine Auszeichnung
zu HOLEN ist. Die Halterzahl ist die Gegenprobe, nicht die Definition: die
zehn legendären halten null bis fünf der zwölf Spieler, die vierzehn
seltenen null bis neun, die achtzehn gewöhnlichen sechs bis zwölf. Oben
überlappen sie, weil eine Würde je Saison neu zu holen ist.
Gold gehört nicht der Anwesenheit: „Urgestein" (300 Matches) und
„Siegermaschine" (300 Siege) trugen als legendär denselben goldenen Rahmen
wie „Meister der Saison", hängen aber an nichts als der Spielzahl. Umgekehrt
sind „Mauer" und „Player of the Day" selten und nicht gewöhnlich: sie
belohnen den Vielspieler, aber sie sind besonderer als jedes Common. Wer
eine Klasse verschiebt, verschiebt Prestige — und zieht `RARITY_META.total`
mit [§10.1].

**Die Zahl der Laufbahn sagt, woher sie kommt.** Im Blatt eines
Tafel-Moments stand „übernimmt ‚Der Einzelkämpfer'" neben −33 und „verliert
‚Der Lauf'" neben +34. Beides war richtig: die Zahl ist die Bewegung des
ganzen Spieltags über alle drei Quellen, die Chips nennen nur die Wechsel der
Karte. Wer einen Rekord übernimmt und gleichzeitig andere teilen muss, steht
im Minus; wer zwei Rekorde verliert und am selben Tag eine Monatschronik
holt, im Plus. Ohne Aufschlüsselung las sich das als Rechenfehler. Darunter
steht deshalb je Quelle ihr Anteil, und was die Karte nicht nennt, mit
seinem Namen.
