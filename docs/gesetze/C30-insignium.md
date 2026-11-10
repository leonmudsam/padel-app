# §C30 Sieben Stufen, sieben Gegenstände — gezeichnet nach der Vorlage

## Regel

- Sieben Stufen (`INSIGNIEN`): Reif ab 0, Schildring ab 600, Volutenkranz ab 1200, Zierkranz ab 2100, Lorbeerreif ab 3100, Kronenreif ab 4500, Ordensstern ab 6000 Prestige. Keine Spanne ist kürzer als die vorige.
- Die Stufe ist eine Ableitung aus den Punkten (`insigniumStufeVon`), nie eine gespeicherte Zahl.
- Zwischen zwei Schwellen liegen drei Grade (`INSIGNIUM_GRADE`, `insigniumGradSchwellen`: Drittel, abgerundet auf Hundert). Der Ordensstern hat dieselben drei Grade, je `ORDENSSTERN_GRAD` (500) auseinander: I ab 6000, II ab 6500, III ab 7000; darüber zählt er nicht weiter. Die beiden obersten Stufen stehen als `INSIGNIUM_OBEN`.
- Jede Stufe ist ein eigener Gegenstand, gezeichnet als Vektor nach der Vorlage (`INS_ZEICHEN`, je Stufe drei Zeichnungen); die Leiter steigt, kein Grad trägt mehr als der erste der nächsten Stufe.
- Der Bau ist Silber (ab Schildring III Platin), Gold ist Akzent ab dem Lorbeerreif, in der Fläche erst am Ordensstern. Der Rang ist ein Schimmer in den Tönen der Rangfarbe (`INS_RANGFARBE`, `_izStein`), dazu Glut und Hof (`data-schein`).
- Groß Vektor, klein Bild (`_insZeichnung`, `insBild`, `INS_VEKTOR_PX`); das Bild unter einer kurzen Blob-Adresse (`insBildHref`). Keine Zeichnung trägt einen Filter, keine Ebene darüber einen Filter oder eine Skalierung.
- Die Raute am Fuß trägt die Ligaposition (`_insFuss`); die Sterne stehen darüber auf Radius `INS_STERN_R`; dahinter die Aura [§C36].
- Verläufe und Zeichnungen stehen je einmal im Topf `<svg id="insDefs">` außerhalb von `#app` und des Blatts (`insigniumRef`, Gruppe in `<defs>`, kein `<symbol>`); `{eigen:true}` liefert das volle Markup.
- Leistung des Feeds und der Blätter: `content-visibility:auto` an `.nf-card` (außer Breaking und Karte des Tages), zuerst die sichtbaren Karten (`NEWS_FEED_SOFORT`, `_newsFeedRest`), ein geschlossenes Blatt ist leer (`_sheetForceClose`), der Zug-Lauscher nur, wenn die Geste schließen kann, kein `backdrop-filter` an stillstehenden Leisten, `will-change:transform` am Blatt.
- Die Lage auf der Leiter ist eine Zahl (`insigniumPos`: Stufe mal drei plus Grad, auf jeder Stufe gleich, Ordensstern III ist 20); damit vergleicht die Insignium-Karte des Tages, ob jemand so hoch noch nie stand [§C33].
- Die kleine Leiter (`_newsLeiter`), die Spur der Insignium-Karte (`_insSpur`) und die Laufbahn (Vitrine `.lb-karus`, ganze Leiter `#lbAlle`) zeigen die echten Zeichen; die Liga erfährt den Stand als Fun Fact (`insignium_stand`, gespeichert in `dataRef.leiter`).

## Stellen

`35a-insignium-zeichen.js`, `35b-prestige.js`, `src/css/12-insignium.css`, für den Feed `30-news-ui.js`, `30d-news-insignium.js` und `16-sheet-infra.js`.

## Prüfung

`tests/zeichen` rastert alle 21 Zeichnungen (mittig, spiegelgleich, Loch, Reif bei 22–25 %, Rangfarbe im Stein); `tests/disziplinen` (Schwellen, Grade auch am Ordensstern, Steine und Gold an jedem Übergang); `tests/blatt` (kein Filter, Vektor gegen Bild, Topf, Leiter, Vitrine, die Grade des Ordenssterns in Laufbahn und Karte).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Das
Insignium hat sieben Stufen (`INSIGNIEN`): **Reif** ab 0, **Schildring**
ab 600, **Volutenkranz** ab 1200, **Zierkranz** ab 2100, **Lorbeerreif**
ab 3100, **Kronenreif** ab 4500 und **Ordensstern** ab 6000 Prestige. Jede
Spanne kostet mindestens so viel wie die vorige (600, 600, 900, 1000,
1400, 1500); der Ordensstern liegt weit über der heutigen Ligaspitze,
bleibt durch die stetig wachsenden Erfolgsfolgen aber erreichbar.
Kronenreif und Ordensstern lagen bei 4300 und 5600: die Spitze der Liga
stand mit 4208 Prestige 92 vor dem Kronenreif, und die beiden obersten
Stufen, deren erster Aufstieg Breaking ist [§C33], wären nach wenigen
Spieltagen gefallen. Die Grade des Kronenreifs liegen seitdem wie die des
Ordenssterns je 500 auseinander (4500, 5000, 5500). Davor lagen alle
Schwellen bei 500 bis 4500: mit den höheren Startwerten der Auszeichnungen und
Rekorde [§C34] stieg das Prestige der Spitze um gut ein Viertel, und ohne
neue Schwellen hätte sie über Nacht eine Stufe höher gestanden, ohne etwas
dafür getan zu haben.
**Die Stufe ist eine Ableitung aus den Punkten** (`insigniumStufeVon`).
Das Blatt eines Tafel-Moments las sie als Zahl aus der gespeicherten Karte,
und die gehörte einer älteren Leiter: Leon stand dort mit 2687 Prestige als
Volutenkranz und „noch 0 bis zum Zierkranz". Gespeichert sind die Punkte,
sie sind die Beobachtung.
**Die Zeichen sind Vektorzeichnungen nach der Vorlage**
(`35a-insignium-zeichen.js`, `INS_ZEICHEN`, je Stufe drei). Aus Kreisen
und Pfaden gerechnet blieb jede Fassung hinter der gemalten Vorlage
(`mockup/insignium-vorlage.webp`) zurück; aus ihr ausgeschnitten waren die
Zeichen verwaschen, trugen Reste des Vorlagengrunds und wurden über 60 px
weich. Die Zeichnungen folgen der Vorlage und sind in jeder Größe scharf.
**Jede Stufe ist ein eigener Gegenstand**: der Reif ein Band, der
Schildring Sicheln, der Volutenkranz C-Schnecken Rücken an Rücken, der
Zierkranz Akanthuswedel (ein Stiel mit Fiederblättern, der einrollt), der
Lorbeerreif Lorbeer in Blattpaaren mit belaubten Linien darüber, der Kronenreif Eichenlaub in zwei
Lagen mit Eicheln und einem Band unter dem Stein, der Ordensstern eine
Glorie aus Haarstrichen mit großen Spitzen. Zierkranz und Lorbeer waren
einmal beide ein Blattkranz und kaum zu unterscheiden, der Kronenreif ein
Lorbeer mit Krone — so war die obere Leiter eine Wiederholung.
**Die Leiter steigt, sie springt nicht zurück.** Jeder Grad legt etwas
dazu, und kein Grad sieht schlichter aus als der letzte der Stufe davor.
**Der Bau ist Silber, Gold ist ein Akzent** (`IZ_METALL`, `INS_ZEICHEN`).
Die Stufen liefen von Silber über Rose, Champagner und Rotgold zu Gold,
und neben Silber las sich jedes warme Metall als Bronze: Zier- und
Lorbeerkranz sahen weniger wert aus als Reif und Schildring. Jetzt ist
der Bau durchgehend Silber und ab dem Schildring III Platin (heller und
kühler), der Rang liegt als Schimmer darauf, und Gold kommt nur als
Akzent — Nieten, Lilie, Kehle, Fassung der Raute — ab dem Lorbeerreif und
erst am Ordensstern in der Fläche.
**Der Lorbeer bleibt vorn, die Verzierung steigt darüber auf**
(`_izLorbeer`). Er trug zwei Reihen Laub übereinander, und seine drei Grade
waren darin kaum zu unterscheiden; ein Entwurf mit Ranken AUF dem Laub las
sich wie mehrere Schichten übereinander. Jetzt ist er ein Zweig in
Blattpaaren, und wo das Laub endet, steigt eine Linie am Reif zum Kopf auf
und rollt nach außen ein — Grad II legt eine Gegenlinie zum Kopf dazu,
Grad III ein S am Ende des Laubs. Blätter wachsen an den Linien nur nach
außen und nur am Bogen: in der Schnecke verdeckten sie Auge und Stein.
Das Auge trägt schon in Grad I einen Stein in der Rangfarbe, weil der
Zierkranz III ihn trägt und die Farbe sonst einen Grad lang verschwände;
`tests/disziplinen` zählt die Augen. **Und
der dritte Grad einer Stufe trägt nie mehr als der erste der nächsten**:
Zierkranz III hatte Steine im Reif und rotgoldenes Laub, Lorbeerreif I
keins von beidem. Die Steine kommen mit dem zweiten Grad des Lorbeers.
`tests/disziplinen` zählt Steine und Gold an jedem Übergang.
Licht fällt überall von oben links: jedes Teil hat eine helle und eine
dunkle Seite, eine Kante im Ton seines Werkstoffs und einen Glanz, und der
Reif wirft einen Schatten auf die Zierde hinter ihm. Gezeichnet wird auf
1000 × 1000 mit dem Innenrand des Reifs bei 22 % der Kante (`IZ_RI`); jede
Zierde wird links gebaut und gespiegelt, und ein Kreis besteht aus
absoluten Bögen — ein relativer Bogen überstand das Spiegeln nicht, und
der Knopf einer Ranke saß um seinen Durchmesser verschoben neben ihr.
**Groß ist die Zeichnung Vektor, klein ein Bild** (`_insZeichnung`,
`insBild`, `INS_VEKTOR_PX`). Sie stand überall als `<image>` mit einer
SVG-Datei darin, und Safari rastert ein solches Bild in der Größe seiner
Nutzereinheiten (170) und nicht in der, in der es erscheint: im
Profilkopf wurden sie auf 270 px gezogen, und das Zeichen stand mit
Treppenkanten da wie ausgeschnitten. Ab 64 px Wappengröße, im Profilkopf
und auf der Karte in der Mitte der Vitrine der Laufbahn steht sie deshalb
als Vektorgruppe im Topf — die Karten am Rand der Vitrine stehen als Bild
und bekommen ihre Vektorzeichnung, wenn sie in die Mitte rücken: sieben
Vektorzeichnungen kosteten beim Öffnen 60 ms Stilberechnung von 122 —, einmal je
Rang, Stufe und Grad, die Verläufe neben der Gruppe und jede Kennung mit
eigenem Präfix (`_izPraefix`), und das Wappen verweist darauf. Darunter
bleibt es beim Bild: ein Verweis klont die ganze Zeichnung, und der Feed
mit siebzig Wappen öffnete damit gemessen doppelt so langsam; das Bild
erscheint dort mit dem 1,18-Fachen der Wappengröße, und dafür reichen
seine 170 Einheiten. Dasselbe gilt für die einundzwanzig Felder der
ganzen Leiter (`insigniumStufeSvg(…, {bild:true})`): rund 40 px, und als
Vektor klonte jedes eine Zeichnung von bis zu 70 Kilobyte — der Topf trug
danach 1,7 Megabyte und 7400 Knoten, und die Laufbahn öffnete bei
gedrosselter CPU auch warm in 367 ms statt 123. **Und das Bild steht unter einer kurzen Adresse**
(`insBildHref`, eine Blob-Adresse): als Daten-URL trug es rund 190
Kilobyte, und jedes `<use>` klont die Gruppe samt dieser Adresse — der Feed
hat rund 240 davon, und das Öffnen brauchte gemessen im Median 150 ms statt
46. `insBild` bleibt die Daten-URL für alles, was ausserhalb der Seite
gerastert wird; ein Blob gilt nur dort, wo er angelegt wurde. `tests/blatt`
misst die Länge jeder Bildadresse im Dokument.
**Die Zeichnung trägt keinen Filter**: Schlag- und
Reifschatten sind weiche Radialverläufe, die Lichtkanten zwei Striche
statt eines Weichzeichners — ein gefiltertes Element rechnet Safari in
CSS-Pixeln. **Und außen liegt auch keiner darauf**: jedes Wappen trug
`filter: drop-shadow(…)` am ganzen `svg.ins`, im Feed allein 234 Mal.
Dasselbe gilt für eine Ebene, die skaliert — der Profilkopf läuft deshalb
ohne `scale` ein. `tests/blatt` sucht über alle Reiter, Profil, Laufbahn
und Feed nach einem Filter oder einer Skalierung über einem Zeichen
(ausgenommen das Entfärben einer Stufe, die niemand trägt) und misst,
dass Profilkopf und Laufbahn Vektor und die Ranglistenzeile Bild ist.
Sie steht mit der Kante `INS_BILD_KANTE` um die
Mitte: so liegt der Innenrand jedes Reifs auf dem Innenrand des Bands, und
Gesicht, Reif und Raute stehen in jeder Stufe an derselben Stelle.
Zwischen zwei Schwellen liegen drei Grade (`INSIGNIUM_GRADE`), je Grad ein
Bild. Sie teilen die Spanne in Drittel, abgerundet auf volle Hundert
(`insigniumGradSchwellen`): der Zierkranz (2100 bis 3099) hat Grad II ab
2400 und Grad III ab 2700. Sie lagen bei 16 und 40 % der Spanne, und Grad
III war damit länger als die beiden davor zusammen. Der Grad baut den
Gegenstand aus, die Stufe wechselt ihn: Leon, Julian und Martin tragen in
den Referenzdaten Zierkranz III. Der **Ordensstern** hat keine nächste
Stufe, deren Spanne man dritteln könnte; seine Grade liegen je
`ORDENSSTERN_GRAD` (500) auseinander: I ab 6000, II ab 6500, III ab 7000.
Er zählte vorher Zacken, acht beim Erreichen und alle 500 eine mehr, ohne
Ende: in der Laufbahn stand „8 9 10" neben dem „I II III" jeder anderen
Stufe, auf der Karte „erreicht die 9. Zacke" neben „steigt auf Zierkranz
III". Jetzt heißt jede Lage gleich, und über Grad III gibt es nichts mehr
zu zählen.
Die beiden obersten Stufen stehen als `INSIGNIUM_OBEN` an einer Stelle:
ihr erster Aufstieg ist Breaking [§C33], und als Zahl im Generator wäre
die Grenze beim Einfügen einer Stufe still eine Stufe tiefer gelandet.
**Der Rang ist ein Schimmer.** Steine, Kristalle, Beeren und Eicheln
sind in den Tönen der Rangfarbe (`INS_RANGFARBE`, `_izStein`) gezeichnet,
gedämpft und je Rang eine eigene Zeichnung; Lilie, Band und die großen
Spitzen des Sterns sind Metall mit einem Schimmer darauf. In voller
Sättigung standen sie als violette Flecken auf dem Metall und liefen dem
Schmuck den Rang ab. `tests/zeichen` misst die Rangfarbe im Stein und
verlangt eine Lilie aus Metall.
Ein Filter über einem Bild färbte vorher die violetten Bildpunkte um und
kostete auf zwölf Wappen einer Rangliste in jedem Bild des Scrollens.
Dazu zwei Lichter in der Rangfarbe, beide als
Kreis mit einem Verlauf aus dem gemeinsamen Topf: die **Glut** am
Innenrand zwischen Gesicht und Band, vom Schildring an mit jedem Feld der
Leiter kräftiger, und ab dem Zierkranz der **Hof** hinter dem Zeichen, mit
jeder Stufe kräftiger. So sieht man den Aufstieg auch dort, wo vom
Schmuck in einer Zeile wenig ankommt. Beide tragen `data-schein`: sie
sind Licht und keine Form.
**Die Raute am Fuß trägt die Ligaposition** (`_insFuss`, nur mit Band):
eine dunkle Raute mit der Zahl, genau auf dem Stein (`INS_RAUTE_Y`, aus
`IZ_RAUTE`). Der Stein ist so groß wie die Ziffer darauf und nicht
größer: mit 86 Einheiten Halbdiagonale zog er den Blick vom Gesicht
weg nach unten, mit 64 bleibt von ihm die Fassung als Rand um die Zahl. In der Liste steht keine Zahl darauf; die Titelsterne sitzen
dort **unter** der Raute [§C26], weil der Stein die Stelle am Fuß schon
belegt.
Die Sterne stehen mit Band in einem eigenen **Streifen darüber**, auf
Radius 78 (`INS_STERN_R`), und die Bandbox (`INS_BAND_BOX`) reicht dafür
weiter nach oben, als das Zeichen selbst braucht: Kristall und Spitzen des
Ordenssterns reichen weiter hinaus als jeder gerechnete Schmuck vorher.
Hinter dem Reif liegt mit Band die **Aura** der Meistertitel [§C36]; die
dunkle Unterlage, die ihn auf die Schwinge setzte, ist mit ihr gefallen —
unter Licht wäre sie ein Schatten genau dort, wo der Schein am hellsten ist.
**Die Verläufe gehören dem Dokument, nicht dem Zeichen.** Sie hängen nur am
Metall des Rangs und am Glanz der Sterne — nicht am Spieler, nicht an der
Stufe. Sie stehen deshalb einmal in einem unsichtbaren `<svg id="insDefs">`
am Rumpf der Seite, und jedes Wappen verweist nur darauf. Vorher trug jedes
Wappen seine zwölf Gradienten selbst: das waren rund sechzig der
siebenundneunzig Knoten eines Zeichens und im Awards-Tab 312 Gradienten für
ein knappes Dutzend verschiedener Sätze. Der Topf steht **außerhalb von
`#app` und des Blatts** — darin nähme ihn das nächste `render()` mit, und
ein Verweis auf einen Verlauf, den es nicht gibt, wirft keinen Fehler: die
Fläche wird schwarz. `tests/blatt` sieht nach jedem Zeichnen nach.
**Die Zeichnungen stehen auch nur einmal im Dokument.** Eine Zeichnung ist
zwanzig bis siebzig Kilobyte, und die Laufbahn zeigt die ganze Leiter samt
Vitrine: `insigniumStufeSvg` legt deshalb je Rang, Stufe und Zeichnung eine
Gruppe (`inst…`) in den Topf und verweist darauf, wie die Wappen. Mit
`{eigen:true}` kommt das volle Markup zurück — damit ein
Ergebnis für sich steht und sich außerhalb des Dokuments rastern lässt;
genau das tun `tests/zeichen` und `tests/disziplinen`.
Dieselbe Zeichnung entsteht nur einmal: gleicher Rang, gleiche Stufe,
gleiche Titelzahl heißt gleiches Wappen, und das Ergebnis wird gemerkt.
**Und sie steht auch nur einmal im Dokument** (`insigniumRef`). Gemerkt war
bisher die Zeichenkette, ausgeliefert wurde sie trotzdem in jeder Kopie: der
News-Feed trug gemessen 76 Wappen à 48 px und damit 648 seiner 713 Kilobyte
Markup und 3069 seiner 4605 DOM-Knoten — bei zwölf Spielern und einem Dutzend
verschiedener Zeichnungen. Diese Fläche wird beim Schließen verschoben und
hinter dem `backdrop-filter` des Vorhangs in jedem Bild neu gerechnet, und
genau das ruckelte; im Schließen läuft kein JavaScript, gemessen nicht eine
einzige Longtask. Das Listen-Bauteil `.rav` [§C27] verweist deshalb mit
`<use>` auf eine **Gruppe in `<defs>`** im selben Topf, in dem die Verläufe
schon stehen — 72 Kilobyte und 1612 Knoten. Eine Gruppe, kein `<symbol>`:
ein `<symbol>` eröffnet beim Verweis ein ZWEITES Koordinatensystem. Das
äußere `<svg>` trägt `viewBox="-22 -22 144 144"`, das `<use>` setzte darin
einen Viewport bei (0,0), und die Zeichnung rutschte um 22 von 144 Einheiten
nach unten rechts — auf einer 52-px-Kachel 8 px, das Gesicht oben links und
der Reif unten rechts, auf jeder Seite der App. Die Box des `<svg>` ist in
beiden Fassungen dieselbe, also fängt nur eine Messung am INHALT das:
`tests/zeichen` legt Verweis und volles Markup nebeneinander und vergleicht,
wo gezeichnet wird. Der Schlüssel ist das MARKUP selbst: gleiches
Markup heißt gleiches Symbol, also hängt der Topf an der Zahl verschiedener
Zeichnungen und nicht an der Zeit [§3]. Ohne Topf bleibt es beim vollen
Markup, wie bei den Verläufen. Der Inhalt liegt damit im Symbol und ist aus
der Instanz nicht mehr zu erreichen: `tests/zeichen` rechnet den Reif aus der
gerenderten Box und der viewBox und prüft die Rechnung einmal gegen das
gezeichnete Original. `tests/blatt` sieht nach, dass kein Verweis auf ein
fehlendes Symbol zeigt und dass viele Wappen wenige Zeichnungen teilen.
**Der Feed legt nur, was zu sehen ist** (`content-visibility:auto` an
`.nf-card`). Rund siebzig Karten und 4600 Knoten kosteten beim Öffnen und
bei jedem Zurück aus einem Story-Blatt 110 bis 140 ms Layout — das Parsen
des Markups nur zehn, das Bauen der Karten fünfzehn. Gemessen jetzt rund
35 ms. Breaking und die Karte des Tages sind ausgenommen: ihr Schein liegt
außerhalb der Fläche, und die Eindämmung schnitte ihn ab. `tests/blatt`
misst die Geometrie der Karten deshalb mit abgeschalteter Regel — so, wie
eine Karte auf dem Bildschirm liegt — und prüft die Regel selbst getrennt.
**Und er zeichnet zuerst, was man sieht** (`NEWS_FEED_SOFORT`,
`_newsFeedRest`). Auch mit `content-visibility` rechnete der Browser beim
Öffnen Stil und Layout aller rund 3400 Knoten: gemessen 350 ms mit
gedrosselter CPU, und das Skript selbst war davon kein Zehntel. Gezeichnet
werden zuerst rund zwölf Karten, auch bei einem sehr großen einzelnen
Spieltag. Der Rest wird nicht vorab als HTML gebaut: `_newsFeedPlan`
reicht nach einem Bild in ruhigen Takten höchstens vier Karten nach
(`requestIdleCallback` mit Zeitgrenze, sonst kurzer Timer). Tagesköpfe und
Tageskarten bleiben einmalig; die Wahl gilt weiterhin über alle Filter.
Ein Index je Tag ersetzt wiederholte Vollsuchen im Storybestand. Die Klicks
hängen an der Liste, nicht an jeder Karte. Alte Aufträge prüfen ihre
Identität, die offene Liste und Datenversion: kein Einfügen in ein neues
Blatt, einen neuen Filter oder nach dem Schließen. Ein direkter Aufruf von
`_newsFeedRest()` füllt für Geometrieprüfungen weiterhin vollständig.
**Ein geschlossenes Blatt ist leer** (`_sheetForceClose`). Es liegt
unter dem Bildschirmrand in einer eigenen Schicht und behielt seinen
Inhalt, nach dem Feed 5400 Knoten, die jede Stilberechnung der Seite
mitlief. Geleert wird am Ende des Zuschiebens; jedes Öffnen trägt eine
Nummer (`sheet._auf`), und was beim Schließen später erledigt wird — das
Leeren und das Zuziehen per Wisch —, lässt ein inzwischen neu geöffnetes
Blatt in Ruhe: der Wisch schloss sonst 280 ms später das nächste.
**Der Zug-Lauscher hängt nur, wenn die Geste schließen kann**
(`bindSheetSwipe`): oben und ohne gescrollten Inhalt. Ein nicht passiver
`touchmove` lässt den Browser vor jedem Scrollbild auf JavaScript warten,
und er hing dauerhaft am Blatt.
**Kopfleiste und untere Leiste tragen keinen `backdrop-filter`**: beide
stehen beim Scrollen still, und die Unschärfe rechnete in jedem Bild alles
darunter neu, bei Flächen, die bis auf ihren Saum deckend sind.
**Das Blatt wird verschoben, nicht neu gezeichnet** (`will-change:transform`
auf `.sheet`): ohne den Hinweis liegt sein Inhalt in der Schicht der Seite
und wird in jedem Bild der Bewegung mitgemalt. Und ein Vorhang mit
`backdrop-filter` nennt die eine Eigenschaft, die sich ändert: `transition:.2s`
ist `transition:all` und stellte auch den Blur zur Animation, der in jedem
Bild alles hinter sich neu rechnet.

Gemessen, nicht behauptet: `tests/zeichen` rastert alle einundzwanzig
Zeichnungen und verlangt je Zeichnung, dass sie mittig steht, spiegelgleich ist, ein
freies Loch für das Gesicht hat, ihren Reif rundum bei 22 bis 25 % der
Kante trägt und am Rand der Zeichenfläche nichts mehr zeichnet — und dass
sich zwei Grade bei 52 px sichtbar unterscheiden. `tests/disziplinen`
verlangt je Stufe drei verschiedene Zeichnungen und für jeden Rang eine
Zeichnung in seiner Rangfarbe, ohne Filter.
Auch die kleine Leiter im Blatt (`_newsLeiter`, `.nf-lt-p`) zeigt die
**echten** Zeichen. Sie zeigte fünf CSS-Kreise mit
`repeating-conic-gradient` — fünf Rosetten in fünf Farben, wo Reif,
Schildring, Volutenkranz, Lorbeerreif und Ordensstern stehen müssten, und
damit einen Platzhalter, der mit dem Zeichen eines Spielers nichts zu tun
hatte. Sie zeigt dieselben Bilder wie die Laufbahn. Ein Feld ist **höchstens 40 px** breit: bei 28 blieb vom
Schildring ein Ring, und die sechzehn des CSS-Punktes waren für einen Punkt
gedacht. Sieben Felder und die Zahl daneben liefen bei 360 px über den
Rand; die Felder teilen sich deshalb die Zeile, und die Zahl steht
darunter. `tests/blatt` misst beides.
Die Laufbahn zeigt die Leiter als Vitrine (`.lb-karus`/`.lb-k`): eine
Stufe groß in der Mitte, die übrigen schiebt man heran — **oder tippt sie
an**. Wischen allein hat die letzte Stufe nie erreicht: der Blatt-Zug
riss jede waagerechte Geste an sich, sobald sie zwölf Pixel nach unten
driftete. Das ist repariert (`bindSheetSwipe` entscheidet die Richtung
einmal je Berührung), aber ein Ziel tippt man ohnehin lieber an.
`tests/blatt` misst beides.
Die drei Marken unter der Vitrine sind Knöpfe: sie zeigen den Grad in der
Vitrine. Darunter steht **die ganze Leiter** (`#lbAlle`): sieben Zeilen zu
drei Feldern, das erreichte hell, das eigene gerahmt, darüber „x von 21
erreicht"; ein Feld antippen stellt die Vitrine auf Stufe und Grad. Die
Vitrine allein zeigte einen Gegenstand zur Zeit, und was ein Grad
verändert, sah man nur durch Wischen und Merken. `tests/blatt` misst das.
**Und die Liga erfährt davon** (`insignium_stand`, ein Fun Fact „Die Leiter
der Liga"): wie viele welche Stufe tragen, was die Spitze trägt und wie
weit es zur nächsten Stufe ist, auf der Karte die sieben Zeichen mit ihrer
Trägerzahl und im Blatt jede Stufe mit den Gesichtern ihrer Träger. Der
Stand ist mit der Karte gespeichert (`dataRef.leiter`) — eine Karte von
gestern erzählt vom Stand von gestern.
