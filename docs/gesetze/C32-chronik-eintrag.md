# §C32 Ein Chronik-Eintrag gehört dem, der ihn hält

## Regel

- Ein Monatseintrag gehört dem, der den Bestwert in diesem Monat hält, oder niemandem; punktgleich tragen ihn alle.
- Die Matrix zeigt je Spieler und Monat einen Eintrag (`seasonTitleOf`, `chronikEintragVon`: der wertvollste, bei gleichem Wert der erste im Katalog) und daneben, wie viele er sonst noch hält („+2“); das ist eine Anzeigeregel, die Tafel (`showSeasonTable`) zeigt alles, und nur dieser eine zählt fürs Prestige [§C34]. In der Tafel und im Saison-Rückblick steht offen, was zählt; die übrigen Einträge klappen darunter auf (`_chronMehrKnopf`, `.chron-rest`).
- Der Feed sagt bei einem alleinigen Halter mehrerer Einträge, welcher im Profil steht (`_chronikZeigtSich`, Marke `.nf-sam-k` neben dem Text), und nennt den stärkeren Eintrag nur für EINEN Spieler.
- Einen Eintrag hält nur, wer im Monat fünfzehn eigene Partien hat (`CHRONIK_MIN_SPIELE`) [§C39]; eine Grenze für den ganzen Monat gibt es nicht. `seasonTitleHalter` zieht dieselbe Grenze wie die Tafel, aus derselben Quelle (`pick`), und antwortet nur ohne Monat mit einem leeren Stand. Die erste Chronik eines Monats ist ein Wechsel wie jeder andere; eine Karte für das Aufgehen der Tafel gibt es nicht mehr, die gespeicherten (`chronik_frei`) bleiben.
- Eine Monatswertung geht in höchstens einem Drittel der gewerteten Monate an jemanden, aufgerundet; die Schwellen (`ab` in `_stWertung`) sind an den echten Partien geeicht (`tests/fixtures/oktober.txt`, höchstens zwei von fünf Monaten) [§C39].

## Stellen

`33-chronik-engine.js` (`seasonTitles`, `seasonTitleOf`, `seasonTitleHalter`), `26c-news-bausteine.js` (`_chronikZeigtSich`), `27-news-generator.js`.

## Prüfung

`tests/disziplinen` zählt die Monate mit einem Halter und nennt die zu tief hängende Schwelle; `tests/ambient` prüft die Chronik-Karten; `tests/blatt` prüft, was in Tafel und Rückblick offen steht.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Jeder Monatseintrag
geht an den, der den Bestwert in diesem Monat wirklich hält — oder an
niemanden. Halten ihn mehrere punktgleich, tragen ihn alle. Genau wie bei
den Allzeit-Rekorden, und aus demselben Grund.
Dass ein Spieler in der Chronik-Matrix trotzdem nur EINEN Eintrag je Monat
zeigt, ist eine reine **Anzeige**-Regel: `seasonTitleOf` liefert den ersten
in Katalogreihenfolge, und die Katalogreihenfolge ist die Wertigkeit. Die
volle Tafel (`showSeasonTable`) zeigt alles.
**Und der Feed sagt, welcher es ist** (`_chronikZeigtSich`). „Martin holt
zwei Monatschroniken" zählte beide auf und ließ offen, welche davon ihn
im Profil beschreibt — die Frage, die ihr Halter als erste hat. Die Karte
nennt es im Satz („Steht jetzt in der Chronik, vor ‚Die Nulldiät'" oder
„In der Chronik steht weiter ‚Der makellose Tag'"), und in einer
Sammelkarte trägt die betreffende Zeile eine Marke aus zwei Worten
(`.nf-sam-k`, Metall — sie zeichnet niemanden aus [§C25]). Sie steht
NEBEN dem Text und nicht darin: der Text kürzt sich mit
Auslassungspunkten, und eine Marke im abgeschnittenen Teil wäre gar
nicht da. Beantwortet wird die Frage nur für einen Halter, der allein
steht, und nur, wenn er in dem Monat überhaupt mehrere hält: bei zwei
Haltern wäre es eine Behauptung über beide, bei einer einzigen Chronik
ist die Antwort offensichtlich. **Dieselbe Regel gilt für den stärkeren
Eintrag**: „In der Chronik bleibt ‚X' stärker, also kommt für die Laufbahn
kein Prestige hinzu" gehört EINEM Spieler. Bei zwei neuen Haltern sammelte
der Satz beide Einträge ein und behauptete sie für beide, und wer eine
Sammelkarte mit neun Zeilen las, fand darin drei verschiedene „stärker".
Steht der Eintrag selbst in der Tafel, fällt der Name ganz weg: „Steht jetzt
in der Chronik" sagt es eine Zeile darüber schon.
**Und das Blatt hält die drei Ebenen auseinander.** In der Monatstafel kann
ein Spieler mehrere Disziplinen führen, im Profil steht genau eine davon,
und nur diese eine zählt fürs Prestige [§C34]. Die Zeile nannte einen Namen
und einen Wert: wer „Der Nervenkitzel" neben „kein zusätzliches Prestige"
las, konnte nicht sehen, dass dieser Name einem ANDEREN Eintrag gehört und
die Chronik dieser Karte nur in der Tafel steht. Sie nennt jetzt die Zahl
der Einträge in der Tafel, ob der Profileintrag diese Chronik ist oder
welche sonst, und dahinter den echten Zuwachs. Gezählt wird aus
`seasonTitles` — derselben Quelle, aus der die Tafel selbst kommt [§C27].
Vorher galt „ein Eintrag je Spieler" schon bei der Vergabe: wer den
Bestwert hielt und schon etwas trug, gab ihn an den Nächstbesten ab. Damit
stand „Der Unaufhaltsame" bei zwölf Siegen in Folge, während einer mit
dreizehn danebensaß — und in den echten Daten ging ein Drittel aller
Einträge an jemanden, der nicht der Beste war. Deshalb gibt es die
Markierung `strict` nicht mehr: sie galt für vier von siebenundzwanzig
Einträgen, und was für vier richtig ist, ist für alle richtig.
Ein Monat unter fünf Spieltagen bekam einmal **gar keine** Chronik. **Der
Feed muss dieselbe Grenze ziehen**, und zwar aus derselben Quelle:
`seasonTitleHalter` zog sie nicht und meldete deshalb Chroniken, die es
nicht gab — gemessen acht
Halter am 04.08., zehn am 06.08. und dreizehn am 07.08., während die
Monatstafel null Einträge zeigte. „Leon holt ‚Auf Augenhöhe'" stand im Feed,
im Chronik-Tab stand nichts, und `seasonTitleOf` fand folgerichtig keinen
Eintrag — die Karte schrieb „kein Prestige hinzu" unter eine Chronik, die
sie selbst gerade verkündete. Damals antwortete die Funktion für einen
ungewerteten Monat mit `null`, und das Aufgehen der Tafel am fünften
Spieltag war kein Wechsel, sondern eine eigene Karte („Die Monatstafel ist
offen", `chronik_frei`): sonst stand jeder Eintrag als „holt" im Feed, für
Werte, die über fünf Spieltage entstanden waren. Heute gilt die Grenze je
Spieler — fünfzehn Partien [§C39] —, und wer sie erreicht, holt seine
Chronik an genau diesem Spieltag; das ist ein Wechsel wie jeder andere und
steht in der Tafel-Karte des Tages. Die gespeicherten Karten bleiben, wie
sie sind: sie waren an ihrem Tag richtig, und ihr Blatt und ihr Platz im
Tagesdeckel (`TAG_PFLICHT`) bleiben mit ihnen.
**Eine Monatswertung geht in höchstens einem Drittel der Monate an
jemanden.** Die Schwellen (`ab` in `_stWertung`) sind an den echten Partien
geeicht, nicht geschätzt. Vorher lagen sie so tief, dass ein Monat
vierundzwanzig der vierunddreißig Wertungen vergab und ein einzelner Spieler
neun davon trug: was fast jeder Monat hergibt, zeichnet niemanden mehr aus.
Danach hieß die Grenze eine Zeit lang nur „nicht mehr Halter als Monate",
und „Der Spielverderber" ging in jedem Monat an jemanden. Gedeckelt wird die
Rate und nicht eine feste Zahl — eine Zahl wäre mit der Liga von selbst
falsch geworden [§C39].
`tests/disziplinen` zählt es nach und nennt die Wertung, deren Schwelle zu
tief hängt.
