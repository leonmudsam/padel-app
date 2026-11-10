# Etwas hinzufügen — und was daran hängt

Auszeichnungen, Monatswertungen und Liga-Rekorde sind nicht nur Listen. Sie
bilden die **drei sichtbaren Quellen des Prestiges** [§C34], und das Prestige
ist die Insignium-Leiter. Wer einen
Eintrag hinzufügt oder streicht, verschiebt
damit, wer welches Zeichen trägt — auch dann, wenn er die Prestige-Datei gar
nicht geöffnet hat.

Die folgenden Listen nennen jede Stelle, die mitgeht. Sie sind vollständig:
was hier nicht steht, hängt auch nicht daran.

# 10.1 Eine Auszeichnung (Badge)

Alles in `17-badges.js`, außer wo anders genannt.

| Stelle | was | wenn es fehlt |
|---|---|---|
| `BADGES[]` | Eintrag mit `id`, `ic`, `name`, `desc`, `count` | — |
| dort `count(id, ms, bis)` | bei einer Auszeichnung, die an einem Zeitraum hängt (Tag, Woche, Monat): den Schnitt `bis` weiterreichen; welcher Zeitraum offen ist, sagt `_periodeOffen`, nie die Uhr | der Stand eine Millisekunde vor dem Schluss der Woche trug den Spieler der Woche schon, sobald die Woche nach der Uhr vorbei war, und den Aufstieg, den er brachte, sah keine Karte. `tests/ambient` misst es am 03.08. |
| dort `name` | ein Name, den keine Stufe des Karriere-Rangs trägt (`RANKS`) | die Auszeichnung für 150 Partien hieß „Legende" wie die oberste Rangstufe, und im Profil stand dasselbe Wort für zwei Dinge. `tests/disziplinen` misst es |
| dort `desc` | ein Satz ohne Kürzel und Formelzeichen („ab 3 Partien", „höchstens 2 Tore Unterschied", „10:0-Sieg", nicht „20+ Siege") | er steht im Blatt und als Text der Karte im Feed; „Sieg mit Tordifferenz ≥ 7" und „mind. einen Gegner aus den Bottom-2" waren eine Formel. `tests/disziplinen` misst es |
| `BADGE_RARITY` | die Klasse | `rarityOf` liefert still `common`, die billigste — das Badge ist als „Legendary" gedacht und zählt wie ein Zittersieg |
| `RARITY_META.<klasse>.total` | um eins nach | der Zähler im Badge-Blatt („38 von 50") lügt |
| `BADGE_WUERDE` | **nur**, wenn jeder neue saisonweise Erfolg eine neue News-Karte auslösen soll | ohne Eintrag meldet der Feed nur die festen Meilensteine; auf Prestige hat die Liste keinen Einfluss |
| — | nichts weiter für den News-Takt | er hängt an der Klasse (`_badgeTakt`, [§C33]): legendär jedes Mal, selten an `NEWS_BADGE_MARKEN`, gewöhnlich an `NEWS_BADGE_MARKEN_KLEIN` und dort nur in der gemeinsamen Matchkarte |
| `getBadgeEarnedCache` | `fire('id')` | das Badge erscheint nur im Profil: kein Toast, kein Chip im Match-Review |
| `EHRUNG_SCHLUSS` (`30e-news-ehrung.js`) | **nur**, wenn die Auszeichnung ohne Partie mit dem Schluss eines Tages, einer Woche oder eines Monats kommt (an der Partie mit `tagEnde` gehört sie zum Tag): unter `tag`, `woche` oder `monat`; ist sie die Schlagzeile der Karte dieses Schlusses, auch in `EHRUNG_KOPF` | gezählt wird sie in jeder Ehrung ohnehin, aus den Prestige-Ständen an den Grenzen des Zeitraums; fehlt sie unter `tag`, macht sie den Spieler des Tages, die Karte des Tages und, an einem Sonntag, die Ehrung der Woche nicht zum Breaking; unter `woche` die Ehrung der Woche nicht; unter `monat` zählt die Woche, in der der Monat endet, sie ein zweites Mal (`rcpWocheLaufbahn`) [§C33]. `tests/ambient` zählt an jedem Schluss der echten Partien über alle Auszeichnungen nach und nennt, was fehlt |
| `src/js/02-icons.js` | das Icon aus `ic`: ein Schlüssel, den keine andere Sache trägt, oder das Zeichen derselben Sache, dann mit ihrer Familie in `ZEICHEN_FAMILIEN` (`tests/disziplinen`) [§C41] | die Kachel bleibt leer, oder ein Zeichen sagt zwei Dinge — die Krone stand für sechs |

Die ersten fünf Zeilen der goldenen Vitrine folgen `BADGE_PROFIL_ORDER`, je
zwei Einträge pro Zeile: Dynastie/Dominator, 20er/15er Serie,
Meister/Team der Saison, Untouchable/Award-Sammler und Absoluter Sieger/
Mr. Perfect. Danach bleibt die Reihenfolge aus `BADGES[]` stabil. „Absoluter
Sieger" ist Legendary, „Allwetter" Rare; die wiederholbare 10:0-Leistung ist
damit wertvoller als das einmalige Wochentags-Sammelziel.

# 10.2 Eine Disziplin (Monatswertung, Liga-Rekord oder beides)

| Stelle | was | wenn es fehlt |
|---|---|---|
| `32-chronik-katalog.js` `DISZIPLINEN[]` | Eintrag **im richtigen Block**: Leistung, dann Ereignis, dann Schatten | ein Spieler zeigt nur EINEN Monatseintrag, und die Katalogreihenfolge entscheidet welchen [§C32] — falsch einsortiert verdrängt eine Schattenseite seinen Titel |
| dort `art` | `leistung`, `ereignis` oder `schatten` | steuert bei einem Liga-Rekord den Prestige-Wert und bei jedem Eintrag die Katalogreihenfolge; ohne gültige Angabe fällt der Eintrag auf `ereignis` und wiegt die Hälfte. Den Wert einer Monatschronik trägt dagegen `monat.art` [§C39]. `tests/disziplinen` misst es |
| dort `short` | ein ganzes Wort, das in 54 px passt | „Umschwung“ ist kürzer als „Nachzügler“ und breiter, also zählt die gerenderte Breite: `tests/blatt` misst sie am Markup, `tests/disziplinen` verbietet die Abkürzung mit Punkt |
| dort `ic` | ein Icon, das keine andere Disziplin trägt — und keine andere Sache in einem anderen System, außer es ist dieselbe (Familie in `ZEICHEN_FAMILIEN`) [§C41] | in einer Zelle von 62 Pixeln ist die Zeichnung das Erste, was man sieht — zwei gleiche sind dort nicht zu unterscheiden. `tests/disziplinen` misst es |
| dort `monat.wie` | ein Satz, was die Zahl im Beleg bedeutet | nur nötig, wenn die Größe nicht selbsterklärend ist. Er steht im Detail-Blatt unter der Bedingung; ohne ihn liest sich „+15 Prozentpunkte" wie Elo oder wie Prestige |
| dort `monat.beiname` | der Beiname fürs Spielerprofil: **Der/Die/Das + Spielertyp** | im Profilkopf stünde der Katalogname, und „Der Endspurt“ beschreibt kein Spielertyp — „Der Ausdauernde“ schon. `tests/disziplinen` verlangt ihn für jede Chronik, höchstens 20 Zeichen, eindeutig, nie der Katalogname — sonst trägt der Halter im Profil den Namen einer Wertung —, und prüft ihn gegen dieselbe Sprachregel wie Beleg und Bedingung |
| dort `monat.art`, `monat.klasse`, `monat.aus` | die drei festen Angaben einer Chronik [§C39]; die Klasse sagt, was die Chronik als Leistung bedeutet: `legendaer` ein ganzer Monat als außergewöhnliche Leistung (Können oder Konstanz, keine Wende), `selten` eine klare Leistung über den Monat, gegen die Rechnung in einem Zug, gegen die Stärksten, eine einzigartige Fügung oder eine Wende, `besonders` ein Muster in einem Ausschnitt oder eine Fügung, `schatten` jede Schattenseite | `art` entscheidet nur, ob es Prestige gibt (eine Schattenseite nicht), `klasse` ist Farbe und Name, nicht Prestige: jede andere Chronik bringt den Grundwert 100 und ihren Bonus. `aus` muss mindestens 1,2 σ betragen, sonst liegt der Beste kaum weiter draußen als der Schnitt; ausgenommen ist eine Schwelle, die die Liga selbst festgelegt hat (`_LIGA_SETZT` in `tests/disziplinen`). Nach der Seltenheit allein eingeordnet stand eine Fügung golden über dem Monat mit hundert Elo Vorsprung — `tests/disziplinen` hält die Grenzen der Klassen |
| dort `monat.wende` | `true`, **nur** wenn die Chronik zuerst eine Schwäche zeigt und dann, dass sie gebrochen wurde (Pleiten gegen denselben Gegner, ein schwacher Vormonat, ein schwacher Beginn, die Niederlage davor) | ohne die Marke stünde eine Wende als legendär oder bloß besonders da; mit ihr ist sie selten [§C39]. `tests/disziplinen` verlangt für jede Wende die Klasse `selten` |
| dort `monat.streu` | **jede Chronik, auch eine Schattenseite**: die Standardabweichung des gewerteten `wert` über alle gewerteten Spieler und Monate, in der Einheit von `wert`, an den echten Partien gemessen und auf drei Stellen festgeschrieben | aus ihr rechnet der Bonus über der Schwelle, je σ zehn Punkte mal die Halbierungen an der Schwelle (`chronikBonus`, `chronikHalbierungenJeSigma`: 24 bei 1,2 σ Ausschlag, 54 bei 3,5 σ), und das Gewicht einer Schattenseite, mit dem sie eine besondere Chronik überschattet (`chronikSchattenGewicht`, `chronikUeberschattet`) [§C39]. Ohne sie bringt die Chronik nur den Grundwert, und eine Schattenseite überschattet nie; in der falschen Einheit (Prozent statt Anteil) wird der Bonus hundertmal zu klein oder zu groß. Gelesen wird sie über `_chronikMonat`, nicht über die Projektion `SEASON_TITLES`. `tests/disziplinen` verlangt sie für jede Chronik und hält sie gegen die Streuung der Fixture-Monate |
| dort `monat.stichprobe` | **jede Chronik**: eine Funktion `(p, C) => n`, die Zahl der Partien, auf die sich der Wert stützt (alle Partien des Monats, die Spieltage, die kleinere zweier Gruppen, beide Hälften als harmonisches Mittel `_stH`) — oder ausdrücklich `false`: bei einer Wahrscheinlichkeit, einer Frage nach der Tabelle, einem festen Zeitraum, einer Serie, dem Anteil an den Partien, einem Abstand, der sich schon selbst auf eine feste Zahl Partien hochrechnet, und dort, wo die Wertung die Abhängigkeit von der Spielzahl umkehrt (an den echten Partien messen) [§C39] | ohne sie zählt der Wert roh, und wer wenig spielt, liegt mit demselben Spiel öfter jenseits der Schwelle und näher am Bonus. `tests/disziplinen` verlangt sie für jede Chronik und rechnet die Wertung Wert für Wert nach |
| dort `monat.mitte`, `monat.n0`, `monat.echt` | **nur mit einer Stichprobe**: der Schnitt des rohen Werts, die mittlere Stichprobe und der Anteil der Streuung, der kein Zufall ist (aus `(roh − Lage)² = τ² + B/n`, die Lage als Gerade in ln n, in Zwanzigsteln), an den echten Partien gemessen und festgeschrieben; danach `aus` und `streu` am gewerteten Wert neu messen | `_stGleichesMass` wertet nur mit allen dreien und rechnet sonst roh; eine Eichung ohne Stichprobe täuscht eine Wertung vor. `tests/disziplinen` verlangt beides zusammen oder keins |
| dort `monat` | `mind`, `wert`, `ab` und `ev` über `_stWertung` | ohne die vier gibt es keine Vergabe. `_stWertung` setzt die fünfzehn Partien im Monat selbst davor (`CHRONIK_MIN_SPIELE`); `mind` nennt nur, was darüber hinausgeht, und `cond` für den Monat selbst keine kleinere Zahl — „ab 8 Partien“ stand noch in elf Bedingungen, als die fünfzehn schon galten. `mind` sagt, wer gewertet wird, `wert` die Größe (größer ist besser, bei einer Schattenseite steht ein Minus davor), `ab` die Schwelle. Getrennt aufgeschrieben, weil sonst niemand sagen kann, wer knapp daneben liegt: wer die Schwelle reißt, bekam einen leeren Wert, und leere Werte haben keine Reihenfolge. `ab` wird an den echten Partien gemessen, nicht geschätzt: in höchstens einem Drittel der gewerteten Monate ein Halter, an `tests/fixtures/oktober.txt` höchstens zwei von fünf [§C32]. Es ist eine runde Zahl — Prozent und Prozentpunkte in Fünferschritten (darunter 2, 1 oder 0,5), Tore in Vierteln, Elo in Zehnern —, gerundet in die Richtung, in der die Seltenheit hält; `tests/disziplinen` liest sie aus `cond`. Fragt `wert`, wie ein Ausschnitt der eigenen Partien gegen die Rechnung ausging, fragt er nach der Wahrscheinlichkeit (`_stUnwahr`), nicht nach dem Abstand: ein Abstand über wenige Partien reißt jede Schwelle leichter als einer über viele [§C39] |
| `33-chronik-engine.js` `_seasonTitleCtx` | das Feld, das `monat:` liest | die Monatstafel bleibt leer |
| `34-chronik-rekorde.js` `_chronicleCtx` | **dasselbe Feld noch einmal** | der häufigste Fehler: die Monatstafel zeigt den Eintrag, der Liga-Rekord bleibt unbesetzt. Zwei getrennte Durchläufe über dieselbe Frage — sie müssen gleich zählen |
| dort `negativ` | `true`, **nur** wenn die Fügung von einer Niederlage erzählt | sie steht im Profil golden zwischen den Titeln und wird als Rekord mitgezählt [§C25]. Eine `art:'schatten'`-Disziplin braucht das Feld nicht — sie ist ohnehin negativ |
| dort `zufall` | `'quote'` oder `'fund'`, **nur** wenn der Eintrag kein Können misst | ohne ihn steht die Fügung in der Kammer „Bestmarken" neben dem höchsten Elo-Stand der Ligageschichte. Der Wert entscheidet, welche Zusicherung in `tests/disziplinen` für ihn gilt [§C35] |
| dort `paar` | die **id** des Eintrags, der das andere Ende desselben Werts wertet, **nur** bei einer Quoten-Fügung mit Vorzeichen | ohne ihn verlangt `tests/disziplinen` für jede Hälfte einzeln, dass die halbe Liga im Rennen steht — die Regel ist gegen eine zu hohe SCHWELLE geschrieben, und ein Vorzeichen ist keine Schwelle: gemessen standen fünf über und fünf unter dem eigenen Mittel, und beide Hälften fielen durch. Die Marke ist keine Beschriftung: der Partner muss zurückzeigen, und die beiden Rennen dürfen sich nicht schneiden. `paar` muss außerdem in der Projektion `_chronRoh` stehen — `CHRONICLES` nennt nur, was sie kennt, und ein Feld, das sie nicht nennt, kommt im Test gar nicht an |
| `allzeit.kammer` | `koennen`, `form`, `mark`, `fuegung` oder `shame` [§C35] | ohne sie wird die Kammer aus `art` erraten, und die Ableitung kennt „Aktuelle Form" nicht: ein Fenster-Rekord landet im Können und steht dort neben einem Laufbahnwert. `tests/disziplinen` zählt die fünf Kammern und ihre Zahlen (16/6/8/18/14) nach |
| `allzeit.basis` | der Grundwert fürs Prestige, immer aus `REKORD_GRUNDWERT` (`32-chronik-katalog.js`) und nie als Zahl: `.koennen` (100) für Können, leistungsbezogene Form und leistungsbezogene Bestmarke, `.fuegung` (75) für Rollenwert und Fügung, `.schatten` (0) für eine Schattenseite [§C34] | ohne ihn nimmt `_rekordBasis` den Wert der Kammer, und eine Bestmarke, die wie das Können wiegen soll, fiele auf ihn zurück. Als Zahl geschrieben bleibt der Eintrag stehen, wenn die Gewichtung sich ändert: die 150 des Könnens stand an 26 Einträgen einzeln. Er ist NICHT, was jemand bekommt — erst durch die Halter geteilt, dann gedämpft. `tests/disziplinen` prüft die Zahl je Kammer und beide Schritte in dieser Reihenfolge |
| `allzeit.mind` | die Mindestbasis in Worten, so wie sie auf der Karte steht | sie stand nur im Bedingungssatz, und wer die Karte las, musste sie daraus heraussuchen. Ein Gegenpaar muss dieselbe Zahl tragen, sonst ist eine Hälfte leichter zu halten als die andere — `tests/disziplinen` vergleicht die Zahlen der zwölf Paare |
| `allzeit.zeitraum` | über welche Strecke gerechnet wird („Ganze Laufbahn", „Die letzten 40 Partien", „Ein einzelner Spieltag") | ohne ihn steht auf der Karte nicht, ob der Wert für immer gilt oder für die letzten vierzig Partien, und das ist der Unterschied zwischen zwei Kammern |
| `allzeit.offen` | `true`, **nur** wenn die Bedingung mit fünfzig Partien in der Laufbahn erfüllbar ist [§C35] | ohne die Marke wächst der Katalog still zum Vielspieler: 13 der 21 bestehenden Rekorde mit lesbarer Mindestzahl sind für einen 50-Spieler unerreichbar. Die Marke ist keine Beschriftung — `tests/disziplinen` verlangt, dass im Rennen jemand mit unter hundert Partien steht, dass der Rekord vergeben ist und dass er nicht nur den drei Besten gehört |
| `allzeit.fenster` | `true`, **nur** wenn der Wert auf einem gleitenden Fenster steht („die letzten 30 Partien", „zwei Fenster im Vergleich") | der Feed meldet „X baut den Rekord aus", sobald am hinteren Ende des Fensters ein schwaches Ergebnis herausfällt — und dann hat der Halter nichts getan [§C33]. Gemeldet wird bei ihm nur der Halterwechsel. `tests/ambient` misst es über jeden vierten Spieltag |
| `allzeit.cond` | **jede** Schwelle, die die Wertfunktion erzwingt, nicht nur die auffälligste | sie steht auf der Karte im Rekorde-Reiter und ist das, was der Leser als Aufgabe versteht. „Die ruhige Hand" nannte nur die 9 Prozentpunkte und schwieg über die 14 engen Partien und die 20 % der Laufbahn — wer die Karte las, wusste nicht, warum er nicht im Rennen steht. `tests/disziplinen` liest die Schwellen aus dem Quelltext der Rechnung und verlangt jede im Text. Eine Schwelle ist eine **Stichprobe** (Partien, Spieltage, Wochen, Niederlagen), nie eine Wertlatte in Prozent, Elo oder Serienlänge: der Rekord ist der beste Wert, den es gibt [§C35] |
| `allzeit.wie` | **Pflicht für jeden Rekord**: wie gemessen wird, und bei einem Anteil der Nenner | nur 15 der 46 Rekorde hatten eine Erklärung, und mehrere Namen führten in die Irre: „Die Mauer" misst nicht die Abwehrstärke, sondern nur, wie oft jemand hinten stand. Sie steht als Notiz unter der Bedingung im Rekord-Blatt. `tests/disziplinen` verlangt mindestens 40 Zeichen und verbietet eine Floskel („sozusagen", „im Grunde"), die nichts erklärt |
| `allzeit.ev` | beginnt mit dem Wert, **nach dem sortiert wird** — die Anzahl steht dahinter | Podest und Verfolgerliste zeigen die erste Zahl des Belegs. Beginnt er mit der Anzahl, steht dort „34" über „10", obwohl der mit 10 den höheren Anteil hält. `tests/disziplinen` rechnet die erste Zahl gegen den Sortierwert zurück und lässt nur eine Umrechnung davon gelten |
| `src/js/02-icons.js` | das Icon aus `ic` | die Zeile bleibt ohne Zeichen |

**Ein Liga-Rekord mit dem Grundwert des Könnens fragt nicht noch einmal nach der
Siegquote** [§C35]. Wer am meisten gewinnt, gewinnt auch in engen Partien,
nach Niederlagen, gegen Favoriten und mit der höchsten Tordifferenz —
einundzwanzig solche Rekorde gehörten deshalb fast alle denselben zwei
Spielern. Das Niveau fragen nur die Einträge in `NIVEAU` (`tests/disziplinen`):
bester Monat, höchster Gipfel, längste Serie, Form von jetzt, die beiden
Positionen. Ein neuer Rekord fragt nach dem Abstand eines Ausschnitts zum
eigenen Rest [§C38], nach einer Teilmenge oder einer Folge; der Test misst
die Korrelation seines Werts mit der Siegquote und fällt ab 0,75. Wer
bewusst eine weitere Niveau-Frage will, trägt sie in `NIVEAU` ein und
begründet, warum sie keine der sechs wiederholt.

Ein Eintrag darf **nur `allzeit`** haben, wenn ein Monat zu kurz ist, um die
Größe zu messen — so wie der Positionswert, der Erfahrung mitwiegt: über vier
Wochen entschiede die Spielzahl statt der Leistung. Dann entfällt der Eintrag
in `_seasonTitleCtx`, sonst nichts.

**Misst ein Eintrag etwas, das eine Ansicht schon zeigt, rechnet er es nicht
nach.** Der Positionswert steht an EINER Stelle: `posLeistung` ist der
gemeinsame Kern aus Siegquote, Erwartungsabstand und Rollenbeitrag, und
`posWert` multipliziert ihn für die Rangliste mit dem Erfahrungsfaktor
[§5.2]. Der Liga-Rekord ruft `posLeistung` direkt — nach der Mindestbasis
darf die Spielzahl den Wert nicht mehr heben, sonst hielte ihn wieder der
Vielspieler. Eine zweite Formel daneben wäre genau der Fehler, den dieser
Absatz verbietet. Das
Sturm-/Abwehrprofil steht ebenso nur in `positionsLage` [§C44]; Profil,
hell gezeichnete Rolle, Elo-Positionsbonus und „Der Wandler" rufen dieselbe
Funktion auf. Zwei
Rechnungen über dieselbe Frage nennen irgendwann zwei verschiedene Beste, und
dann steht in der Chronik ein anderer Name als über der Liste, auf der er ihn
geholt hat. `tests/disziplinen` legt beide nebeneinander.

Eine Disziplin zu **streichen** verändert nur die Zukunft: abgeschlossene
Monate stehen vollständig eingefroren in `seasons.titles` und zeigen weiter,
was damals galt.

Soll der Eintrag ausdrücklich kein Können messen, gilt zusätzlich §C35 — er
wird `ereignis`, und beide Bedingungen dort werden nachgemessen.

# 10.3 Die Balance nachziehen

Der Teil, den man vergisst. Ein neuer Eintrag ist neues Prestige für jeden,
der ihn hält — und für sonst niemanden.

1. **Die Seltenheitsklasse bestimmt die Standardregel.**
   `PRESTIGE_AUSZEICHNUNG` gibt Startwert und Abnahme für Rare und Common
   vor [§C34]. Jede legendäre Auszeichnung, dazu POTW, POTD und die
   Meilensteine der Laufbahn stehen mit eigenem Startwert in
   `PRESTIGE_AUSZEICHNUNG_SPEZIAL` — eine neue
   legendäre wird dort nach ihrem Gewicht eingeordnet, das Regelblatt
   zeigt sie dann von selbst an der richtigen Stelle. Eine falsch gewählte
   Klasse verändert weiterhin Optik und Punktfolge.
2. **Jede positive Auszeichnung wächst bei jedem Erreichen.** Die harmonische
   Folge hat weder Mindestwert noch harte Obergrenze; es gibt kein
   nachträgliches Quellenlimit. `tests/disziplinen` prüft die Dominator-,
   Meister-, Team-, POTW-, POTD- und Carry-Folgen sowie das Wachstum aller
   fünfzig Katalogeinträge.
3. **Die Schwellen in `INSIGNIEN` werden an der echten Liga kalibriert**
   [§C30]. Keine Spanne ist kürzer als 500 und keine kürzer als die vorige:
   die Spitze trägt den Lorbeerreif im ersten Grad, die beiden dahinter
   stehen darunter, im Zierkranz oder in der Volute, und der erste Ordensstern bei **6.000 Prestige** soll
   langfristig erreichbar sein; seine Grade II und III folgen je 500 darüber.
   Wer Startwerte anhebt, zieht die Schwellen mit — sonst steigt die Liga
   über Nacht, ohne gespielt zu haben. Ausnahme ist eine Anhebung, die
   einen Fortschritt nachträgt, der schon erarbeitet ist: die Meilensteine
   der Laufbahn hoben drei Spieler zum Lorbeerreif, und das war gewollt.

Nichts davon wird geschätzt. `tests/disziplinen` misst es an den echten
Partien und fällt, wenn es kippt:

| Zusicherung | fällt, wenn |
|---|---|
| jede Prestigequelle gehört zu genau einem der drei sichtbaren Blöcke | wieder ein versteckter vierter Wert einfließt |
| Auszeichnungen wiegen schwerer als Rekorde | der Reif zur Rekordanzeige wird |
| mehr als die halbe Liga hält einen wertenden Rekord | die Einstiegshürden zu hoch sind |
| mehr als die halbe Liga trägt mindestens den Schildring | die erste Sprosse zu hoch hängt |
| der Beste trägt noch keinen Kronenreif | der Katalog die Spitze nach oben schiebt |
| der Ordensstern ist von niemandem erreicht | dasselbe, eine Stufe höher |
| nur Kronenreif und Ordensstern sind die obersten Stufen | die Breaking-Grenze beim Einfügen einer Stufe verrutscht [§C33] |
| Glut und Hof in der Rangfarbe werden mit der Leiter nicht schwächer, die Lichter tragen die Rangfarbe | der Schimmer nicht mehr sagt, wer weiter oben steht [§C30] |
| keine Spanne ist kürzer als 500 | eine Stufe fast geschenkt ist |
| der Ordensstern hat drei Grade, I ab 6000, II ab 6500, III ab 7000, der Kronenreif 4500, 5000, 5500, und Ordensstern III ist das oberste Feld | er wieder anders zählt als jede andere Stufe [§C30] |
| die Spitze trägt den Lorbeerreif im ersten Grad, die beiden dahinter stehen darunter, im Zierkranz oder in der Volute | Schwellen und Grade die heutige Liga falsch abbilden. Gemessen wird ohne Namen und ohne Reihenfolge: die war festgeschrieben, und damit fiel die Zusicherung bei jedem Rekord, der Punkte verschiebt — kalibriert ist die Leiter und nicht die Tabelle |
| nur die Rekorde des Niveaus folgen der Siegquote | ein Rekord die Siegquote anders verpackt noch einmal zählt und damit dem Besten Prestige schenkt, das er schon hat [§C35] |
| das Langzeitmodell kann den Ordensstern erreichen | ein weicher Deckel zur harten Obergrenze wird |
| jede positive Dauerquelle behält einen positiven Zuwachs | das Prestige stehen bleibt, obwohl weiter gewonnen wird |
| auch der dritte Grad des Ordenssterns wird endlich überschritten | das oberste Feld der Leiter nur scheinbar erreichbar ist |
| wenige sehr starke Partien schlagen viele durchschnittliche | Anwesenheit wieder als Können zählt |
| Prestige aus Auszeichnungen und Monaten fällt nie | ein Wert wieder am heutigen Zensus hängt [§C34] |
| je Spieler und Monat zählt genau eine Chronik, und zwar die des Profils | die Laufbahn einen Monat mehrfach zählt oder eine andere Wertung als die Matrix [§C32] |
| ein verlorener Rekord zählt nicht mehr, ein geteilter nur geteilt | ein Bestwert weiterzählt, den heute jemand anders hält |
| jede Klasse zählt so viele Badges wie `RARITY_META` behauptet | ein Badge dazukommt oder wegfällt und der Zähler stehen bleibt |

Ein roter Wert dieser Art ist eine **Antwort**, keine Störung: er nennt die
Zahl, die nachgezogen werden muss. Angepasst wird die Zusicherung nur, wenn
sich die Absicht geändert hat — nicht, damit sie wieder grün ist.
