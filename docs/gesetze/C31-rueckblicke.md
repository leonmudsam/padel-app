# §C31 Drei Rückblicke, ein Baukasten

## Regel

- Saison-, Wochen- und Tagesrückblick bauen aus denselben Teilen (`rcpKopfHtml`, `rcpHeldHtml`, `rcpZahlenHtml`, `rcpKachelHtml`, `rcpZeileHtml`, `rcpNotizHtml`, `rcpAbschnitt`, `rcpKalenderHtml`, `rcpFeldHtml`) und aus den Bauteilen, die die App schon hat: das Podest der Ewigen Tafel, die Award-Kachel des Reiters (`awKachelHtml` mit `metall`), die Säulen der Ehrung (`_ehrungSaeulen` mit `still`), die Bewegungen der Insignium-Karte (`_insBewegungenHtml`), das Band des Beinamens (`.pp-banner`).
- Ein Gold je Blatt: die Marke im Kopf und der Sieger. Die Award-Kacheln sind Metall; ein Chronik-Band trägt den Ton seiner Chronik, die Monatschroniken in der Laufbahn die Farbe ihrer Quelle. Ohne Ende bewegt sich nur der Sieger: der Strahlenkranz hinter ihm und das Licht auf seiner Karte.
- Der Saison-Rückblick beginnt mit dem Podest auf der Meisterbühne (`.nf-meister.rcp-buehne`), und er stellt vor [§C43]: der Meister groß in der Mitte, dann auf seinem Platz, Platz 2 und 3 im Takt des Kantenlichts, sein Strahlenkranz, wenn er steht, dann das Team der Saison, dann der Rest; die Woche stellt leiser vor, mit Licht um den Helden. Darunter das Team der Saison (`rcpTeamHtml` aus `seasonTeamOf`, mit seinen Partien als Zellen), dann der Monat als Kalender mit den Eckdaten und ihrem Unterschied zum Vormonat, die Tabelle (`rcpTabelleHtml`: Elo als Balken, die Bewegung gegenüber dem Vormonat je Zeile, der größte Sprung und der tiefste Fall hervorgehoben), das Titelrennen mit den Tagen an der Spitze und der Saison des Meisters (`saisonRang`, `saisonPodestHtml`, `saisonSpitze`, `saisonRennenHtml`, `saisonSpitzeHtml`, `saisonZellenHtml`; die Elo je Tag aus `getSeasonPositionHistory`), die Awards, und dann die Laufbahnen: neue Zeichen, Wirkung auf die Laufbahn, Auszeichnungen, Chronik und Rekorde.
- Woche und Tag zeigen Held und Feld (`rcpWocheHtml`, `rcpEloBahnHtml`, `rcpFeldHtml` mit der Elo jedes Spielers). Der Held steht vor dem Strahlenkranz der Meisterbühne, leiser (`rcpHeldHtml` mit `strahl`); Wappen, Name und Zahlen heben sich nacheinander herein, die Elo-Linie zeichnet sich von links, jede Partie setzt ihren Punkt, wenn die Linie bei ihr ankommt. Die Woche zeigt dazu ihre Tage als Kalender mit ihren Zahlen (Spieltage, Tore je Partie, enge Partien, Duos), ihre Awards und dieselben Laufbahn-Abschnitte wie die Saison, mit den Rekorden der Woche.
- Die Wirkung auf die Laufbahn ist der Unterschied zweier Prestige-Stände, vor dem Zeitraum und an seinem Ende (`rcpLaufbahnDaten`), je Spieler nach den drei Quellen [§C34]; die neuen Zeichen sind, wer dabei Stufe oder Grad wechselte (`rcpZeichenZuege`), die Säulen der Auszeichnungen genau ihr Teil aus Auszeichnungen (`rcpEhrungHtml`). Die Rekorde eines Zeitraums kommen aus `saisonRekorde` oder `rekordeImZeitraum`; „verbessert" heißt, dass der Wert gestiegen ist. Dieser Teil kommt nach, wenn das Blatt eingefahren ist (`rcpSpaetLaden`).
- „Awards" sind die Wertungen eines Zeitraums aus dem Awards-Reiter (`rcpAwardKacheln`, `awardRankings` mit `awSeasonId` oder `awWeekStart`), nie aus einer eigenen Rechnung; „Auszeichnungen" sind, was im Profil gesammelt wird.
- Die Wirkung einer Woche zählt ab einer Millisekunde nach ihrem Montag 00:00, wo die Woche davor schließt, bis zu ihrem eigenen Schluss am Montag darauf, mit Spieler der Woche und Award-Sammler, und ohne die Titel eines Monats, der in ihr endet (`rcpWocheLaufbahn`): Meister, Vize, Team der Saison und Untouchable kommen mit dem Monat und stehen in seinem Rückblick und seiner Ehrung, nicht in denen der Woche, auch wenn die Woche über das Monatsende hinausreicht. Ein Schnitt nach der letzten Partie ist „jetzt" nur, wenn kein Monatswechsel dazwischen liegt (`_schnitt`), sonst zeigte der Morgen nach dem Monatsende andere Zahlen als der Abend. Die Wirkung eines Monats zählt ab einer Millisekunde nach Mitternacht des Ersten bis zu seiner letzten Millisekunde; endet er an einem Sonntag, bis zum Schluss dieser Woche, mit ihrem Spieler der Woche (`rcpMonatGrenzen`). Rückblick und Ehrung des Monats lesen dieselben Grenzen.
- Von selbst öffnet sich höchstens ein Rückblick am Tag (`_autoRueckblickHeute`, gemerkt, sobald er geplant ist): der Saison-Rückblick in den ersten drei Tagen des Monats (`autoShowSeasonRecap`) geht vor, die Woche kommt am Montag oder Dienstag, und am Mittwoch, wenn der Monat an einem dieser Tage wechselt. Gesehen ist ein Rückblick, sobald er offen ist; Wegwischen zählt. Der Monatsabschluss im Feed öffnet den Saison-Rückblick.
- Was sich von selbst öffnet — Monat, Woche, Abschied —, deckt nichts zu, das offen ist (`_etwasOffen`): kein Blatt, keine Story, kein Popover, keinen Dialog, kein Formular, in das jemand schreibt. Ist beim Öffnen des Monats etwas offen, nimmt er seine Merker zurück und kommt beim nächsten Abruf; vorher ging er 600 ms nach einem Datenabruf über das Bearbeiten einer Partie auf.
- Ein Rückblick zeigt den Stand von damals (`insigniumSvg` mit `opt.titel`, `opt.pos`); der Reif bleibt der heutige.
- Eine Kachel schreibt jeden Namen aus (`.rcp-aw-name` bricht um): ein Award kann einem Duo gehören, und „Leon & Johannes" stand bei 390 px als „Leon & Joha…" da.
- Gestaltung steht im CSS; ein `style`-Attribut trägt nur einen berechneten Wert.

## Stellen

`05b-recap-teile.js` (Bauteile und Grafiken), `07b-rueckblick.js` (`rcpWocheLaufbahn`, `autoShowPotwRecap`), `06-db.js` (`showSeasonRecap`, `autoShowSeasonRecap`), `09-ui-infra.js` (`_etwasOffen`), `18b-abschied.js` (`autoZeigeAbschied`), `03-saison.js` (`_schnitt`), `34-chronik-rekorde.js` (`saisonRekorde`, `rekordeImZeitraum`), `src/css/09-recap.css`.

## Prüfung

`tests/bedienung` öffnet den Monat, während ein Blatt aufgeht und während ein Formular offen ist, und erst danach; `tests/tafel` rechnet Tage an der Spitze, das Titelrennen, den Kalender, die Tabelle mit ihren Bewegungen, die Wirkung auf die Laufbahn (die Woche zum Monatsende morgens wie abends und ohne die Titel des Monats), welcher Rückblick sich an welchem Tag von selbst öffnet, die Säulen der Auszeichnungen, die neuen Zeichen und die Arten der Rekorde aus ihren Quellen nach und misst die Inline-Styles; `tests/blatt` hält die Awards der Woche gegen den Awards-Reiter, zählt die Zahlen und den Kalender der Woche nach, misst die Heldenkarte bei 360 px, rechnet den Vergleich der Saison mit dem Vormonat nach und misst beide Rückblicke bei 360 px: nichts ragt heraus, die Laufbahn kommt nach, die neuen Zeichen stehen zu dritt, kein Rekordname bricht im Wort, und ohne Ende bewegt sich nur der Sieger; die Folge der Vorstellung misst es Bild für Bild (§C43). `tests/ambient` zählt den Spieler der Woche je Woche und je Monat genau einmal: jede Woche der echten Partien nennt den, den ihr Schluss vergab, der Mai trägt den seiner letzten Woche, der Juni nicht.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Saison, Woche und Tag bauen aus
denselben Teilen (`05b-recap-teile.js`): `rcpKopfHtml`, `rcpHeldHtml`,
`rcpZahlenHtml`, `rcpKachelHtml`, `rcpZeileHtml`, `rcpNotizHtml`,
`rcpAbschnitt`. Wo die App das Bauteil schon hat, wird es benutzt [§C27]:
das Podest des Saison-Rückblicks ist `.podest`/`.pod-karte` wie in der
Ewigen Tafel, seine Awards stehen in der Kachel des Awards-Reiters.
**Ein Gold je Blatt.** Die Marke im Kopf und der Sieger — sonst nichts.
Kacheln und Zeilen sind Metall, Rot bleibt der Richtung [§C25]. Als acht
Kacheln golden umrandet waren, sagte Gold nichts mehr, und der Sieger
stach aus nichts mehr heraus.
Der Saison-Rückblick hat **keine** Heldenkarte: das Podest IST der Held,
eine Karte darüber sagte dasselbe ein zweites Mal. `rcpHeldHtml` gehört
Woche und Tag; dort hat der Held kein Banner, weil eine Ligaposition mit
einer Woche nichts zu tun hat.
**Der Meister hat eine Bühne** (`saisonRang`, `saisonPodestHtml`,
`saisonSpitze`, `saisonRennenHtml`, `saisonSpitzeHtml`,
`saisonZellenHtml`). Die Karte „X ist Saison-Champion" war die seltenste
des Monats und stand im Feed als Fun Fact — `_newsSorte` kannte den Typ
nicht, zwei Sätze, kein Bild —, ihr Blatt nannte drei Elo-Zahlen und die
Saison-ID, und der Nachsatz schrieb „Die Saison 2026-08 ist Geschichte …
Vor Johannes." Jetzt trägt sie die Form des Helden [§C25]: das Podest
unter einem goldenen Strahlenkranz, im Fuß das Titelrennen klein und die
Tage vorn; das Blatt zeigt dazu das Rennen groß mit einem Band, das an
jedem Spieltag in der Farbe dessen steht, der vorn lag, die Tage an der
Spitze als Balken und die Saison des Meisters als Zellen. Der Nachsatz
nennt den Monat beim Namen und erzählt, wann der Titel entschieden war —
Elo und Vorsprung stehen schon im Podest. Das Podest ist dasselbe wie im
Saison-Rückblick, der seine Rangliste seitdem aus `saisonRang` nimmt; die
Elo je Tag kommt aus `getSeasonPositionHistory` (`eloByDay`,
`spielTage`), aus derselben Schleife, die die Linien des
Positionsverlaufs zeichnet — eine zweite Rechnung über dieselben Deltas
nennte irgendwann einen anderen Ersten. `tests/tafel` rechnet die Tage
vorn und das Ende des Rennens aus den rohen Partien nach.
**Woche und Tag zeigen den Helden und das Feld** (`rcpWocheHtml`,
`rcpEloBahnHtml`, `rcpFeldHtml`): die Woche des Spielers der Woche als
Spieltage, der Tag des Spielers des Tages als Bahn samt Elo-Kurve, und
darunter jeder Spieler der Woche oder des Tages als Balken seiner Bilanz.
Zwei Kacheln mit Zahlen sagten nicht, wie knapp es war. **Der
Saison-Rückblick zeigt nach der Tabelle das Titelrennen, die Tage an der
Spitze und die Saison des Meisters** — dieselben Bauteile wie die
Meisterbühne; die Tabelle und die Kennzahlen stehen davor, weil sie die
Fragen beantworten, mit denen man den Rückblick öffnet.
Ein Rückblick zeigt den Stand von DAMALS: `insigniumSvg` nimmt dafür
`opt.titel` und `opt.pos` entgegen. Der Reif bleibt der heutige — die
Laufbahn ist eine Karriere und kein Monat.
Gestaltung gehört ins CSS: ein `style`-Attribut trägt einen berechneten
Wert (Avatarfarbe, `--rav`, Farbton), nie ein ganzes Bauteil. Vorher
standen Wochen- und Tages-Rückblick zu großen Teilen als Inline-Style im
JavaScript, und derselbe Spieler sah in drei Rückblicken dreimal anders
aus. `tests/tafel` misst beides.

**Die Woche hat eine Bühne und ihre Awards.** Der Wochenrückblick
rechnete Torjäger, Abwehr, Team und Überraschung selbst, ohne die
Mindestzahl an Partien und mit einer eigenen Elo-Simulation der Woche, und
jede Kachel öffnete das Award-Blatt derselben Woche — auf dem ein anderer
stehen konnte. Jetzt kommen die Kacheln aus `awardRankings('week')` für
diese Woche, wie die des Saison-Rückblicks aus der Saison: bis zu zehn,
Metall vorn, Schattenseiten rot dahinter; die längste Serie fehlt, wenn
sie schon unter dem Helden steht. Die vier Zahlen der Heldenkarte standen
bei 360 px untereinander und ab 336 px als drei und eine: die Breite der
Zellen rechnet mit 8 px Abstand, die Karte setzte 16.

**Die Saison misst sich am Vormonat.** Ein Monat für sich sagte nicht, ob
die Liga mehr gespielt hatte oder wer vorangekommen war: 161 Partien sind
viel oder wenig, je nachdem, was davor war. Die Eckdaten tragen deshalb den
Unterschied zum Vormonat, ohne Farbe — mehr Partien sind kein Lob —, und
jede Zeile der Tabelle ihre Bewegung, der größte Sprung und der tiefste
Fall hervorgehoben. Das Podest steht auf derselben Bühne wie in der
Meister-Story [§C27], und die Awards sind dieselbe Liste wie dort mit der
Siegquote in engen Partien, Plus-Minus, Underdog, dem höchsten Sieg und der
längsten Pleitenserie dazu.

**Die Rückblicke zeigen ihre Fakten als Bild.** Saison und Woche erzählten
mit Zeilen und Kacheln aus Text: die Rangliste als zwölf große Karten über
anderthalb Bildschirme, der größte Sprung und der tiefste Fall als zwei
Kacheln darunter, neununddreißig Rekorde als neununddreißig Zeilen, die
Chronik als Liste, die Awards in einer eigenen Kachel, in der „Ø 6,9
Gegentore je Partie" in drei Zeilen brach — und was der Monat für die
Laufbahnen bedeutete, stand nirgends. Die Eckdaten standen über dem Podest
und schoben den Meister unter den Rand des ersten Bildschirms. Jetzt steht
der Meister zuerst, die Tabelle ist ein Balkenbild mit ihren Bewegungen,
der Monat ein Kalender, die Awards stehen in der Kachel des Reiters, die
Chronik auf den Bändern der Beinamen, die Rekorde nach ihren Haltern, und
die Laufbahn hat einen eigenen Teil: wer ein neues Zeichen trägt, und je
Spieler das Prestige nach seinen drei Quellen. Die Säulen der
Auszeichnungen lasen ihre Posten zuerst aus den Verleihungen der
Ehrung-Story, die nur kennt, was an einer Partie hängt: Spieler der Woche
und des Tages, Team der Saison und Sammler fehlten, und bei Julian standen
in den Säulen 344 Prestige aus Auszeichnungen, in der Laufbahn 633. Sie
kommen jetzt aus denselben zwei Ständen. Die Rekorde eines Zeitraums
zählten „verbessert", sobald sich der Wert desselben Halters bewegte, auch
nach unten: in einer Augustwoche siebzehnmal, darunter „Der Glanztag" vom
20.07. Das Team der Saison fragte nur die gespeicherte Zeile der Saison
und fehlte, wo die Rechnung eins kannte. Der Endpunkt des Meisters im
Titelrennen pulsierte ohne Ende als dritte Bewegung für denselben Sieger;
die Bänder der Beinamen tragen im Rückblick kein Lauflicht, die Säulen der
Auszeichnungen keins. Die zwei Prestige-Stände an den Rändern einer Woche
kosteten gemessen 280 ms vor dem ersten Bild: dieser Teil kommt nach, und
das Blatt öffnet so schnell wie vorher. „Größter Aufwind" ist keine Kachel
mehr, die Elo jedes Spielers steht im Feld.

**Die Woche zählt bis zu ihrem Schluss.** Gerechnet bis zur letzten
Millisekunde des Sonntags fehlten in den Auszeichnungen der Woche der
Spieler der Woche und der Award-Sammler: sie kommen am Montag um 00:00.
Die Titel des Monats nahm die Woche nur heraus, wenn sie mit dem Monat
endete; die Woche vom 26.10. bis 01.11., über das Ende des Oktobers
hinweg, zählte Meister, Vize und Team des Oktobers mit. Die Ehrung der
Woche liest dieselben Stände und hätte beides geerbt.

**Der Meister kommt zuerst.** Auf der Bühne des Rückblicks stiegen Platz
3, 2 und 1 nacheinander auf, der Meister eine halbe Sekunde nach dem
Öffnen, und der Strahlenkranz drehte sich von Anfang an über der leeren
Mitte: das Licht des Siegers war da, bevor er es war, und die wichtigste
Karte kam zuletzt. Danach stieg der Meister zuerst auf, Silber und Bronze
folgten im Takt des Kantenlichts (`PODEST_VERSATZ`), und der Kranz blendete
ein, wenn er stand — aber das Blatt kam wie jedes andere in acht Teilen,
45 ms auseinander, und der Meister war eine Karte unter vielen. Gewünscht
war eine Vorstellung, die das Wichtigste zuerst zeigt: der Meister groß,
dann auf seinem Platz, dann das Team der Saison, dann alles andere, schön,
aber weder nervig noch lang. Sie steht in §C43; die Woche bekommt dieselbe
Folge leiser, ohne großen Auftritt — eine Woche ist kein Monat.

**Ein Rückblick am Tag, die Titel im Monat.** Endete ein Monat am Sonntag,
öffneten sich am Montag zwei Rückblicke: der Monat beim Start und die Woche
300 ms später, und wer den Monat wegwischte statt „Verstanden" zu tippen,
bekam ihn bis zum dritten Tag bei jedem Öffnen wieder. Die Woche bis zum
31.05. zeigte unter „Wirkung auf die Laufbahn" Meister +150 und Team der
Saison +75 als Gewinn einer Woche, und am Morgen danach galt ihr Schnitt als
„jetzt": gemessen nannte sie für Martin morgens 87 Prestige und abends 62.
