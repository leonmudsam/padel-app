# §C26 Das Zeichen

## Regel

- Sterne zählen Ligatitel: höchstens fünf, dann die Zahl — unter dem Avatar in der Liste (`_znSterneSvg`) wie über dem Zeichen mit Band (`_insSterne`). Mit Band liegen sie auf einem festen Radius um die Reifmitte.
- Feuer hinter dem Avatar heißt laufende Siegesserie in drei Stufen (3–4, 5–6, ab 7), Stop-Motion ohne JS-Timer, und nur dort. Neben dem Namen steht allein die Niederlagenserie (`lossStreakInline`, Tropfen bei 3, 5, 7).
- Das Feuer trägt überall die Rangfarbe (`insAvWrap` setzt `--zn-c`), mit demselben hellen Kern wie im Profilkopf. Wie weit eine Stufe schlagen darf, sagt `spitze`, je Stufe überschreibbar.
- Der Profilkopf rückt nur für brennende Stufen nach unten (`--feuerluft`). In den Formpunkten brennt die Serie als zwei Pseudo-Elemente (`.dot.glut`), nicht als SVG.
- Am Ring im Profilkopf steht jeder Zustand, den jemand gerade trägt (`avRingeOf`): Titelverteidiger, Player of the Week und Player of the Day — je Spieler aus seiner eigenen letzten abgeschlossenen Woche und seinem letzten abgeschlossenen Spieltag mit Partien, also auch für mehrere zugleich, während der Titelverteidiger einer bleibt —, Team of the Season, eine Serie — der wichtigste oben rechts, die übrigen auf festen Plätzen (`AV_RING_PLAETZE`), oben mittig und unten mittig nie. Die Zeile unter dem Namen nennt den wichtigsten und klappt zu allen auf. Lob und Niederlagenserie zugleich: der Ring wechselt langsam zwischen beiden Farben.

## Stellen

`09c-zeichen.js` (`znWrap`, `znFeuer`), `35b-prestige.js` (`_insSterne`), `35-chronik-ui.js` (`avatarRings`, `avRingeOf`, `_avRingMarkenHtml`, `_avRingChipHtml`), `18-profil.js`, `src/css/15-zeichen.css`, `src/css/11-chronik.css` (`.pp-av-mark`, `.pp-ringe`).

## Prüfung

`tests/zeichen` misst Feuer, Sterne und die Füllung des Feuers in Zeile und Profil am Knoten; `tests/blatt` misst die Zeichen am Ring mit zwei bis fünf Zuständen und klappt die Zeile auf; `tests/rechnen` rechnet Woche und Tag des Rings, auch für den, der danach nicht mehr spielte, und für den, der seinen letzten Zeitraum nicht gewann.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Sterne = Ligatitel. **Höchstens fünf, dann die
Zahl** — in beiden Formen gleich: unter dem Avatar in der Liste
(`_znSterneSvg`, CSS), über dem Zeichen mit Band (`_insSterne`, im SVG).
Zwei Formen für dieselbe Zahl wären eine zu viel [§C27]; die Stelle ist
verschieden, weil mit Band der Fuß der Raute gehört [§C30].
Mit Band liegen sie auf einem **festen Radius** um die Reifmitte, nicht auf
dem Zeichen und nicht je Stufe woanders. Sie standen im verkleinerten
Kasten der früheren Schwinge und landeten damit auf dem Kopf des Insigniums — Gold
auf Gold, bei neun der fünfzehn Zeichnungen nicht mehr zu zählen.
Feuer dahinter
= laufende Siegesserie in drei Stufen (3–4, 5–6, ab 7), Stop-Motion ohne
JS-Timer — und **nur dort**. Neben dem Namen steht allein die
Niederlagenserie (`lossStreakInline`, ein bis drei Tropfen bei denselben
Schwellen 3, 5, 7); für sie brennt am Avatar nichts. Die Siegesserie stand
dort ein zweites Mal als Flammensymbol und sagte damit dieselbe Zahl in
einer zweiten Bildsprache.
Die kleinste Stufe kam in einer 52-px-Zeile keine sechs Pixel über den
Reif und war auf dem Telefon ein warmer Hauch statt eines Feuers — drei
Siege in Folge sind aber das, was die meisten überhaupt erreichen. Die
Leiter beginnt deshalb eine Zeichnung höher und hat oben eine neue,
größere. Wie weit eine Stufe schlagen darf, sagt `spitze`; sie ist **je
Stufe** überschreibbar, weil der Deckel die unteren Stufen wirklich
beschneidet und ein angehobener Deckel sie still hätte mitwachsen lassen.
**Das Feuer trägt die Rangfarbe, überall** (`insAvWrap` setzt `--zn-c`):
dieselbe Hülle, derselbe Schein in der Rangfarbe und derselbe helle Kern
wie im Profilkopf. In der Rangliste brannte es orange mit warmem Kern und
im Profil desselben Spielers in seiner Rangfarbe — zwei Bildsprachen für
dieselbe Serie [§C27]. Die Zeile behält ihre eigene Geometrie, ihr Schein
ist sogar kräftiger: von einem Feuer ist dort nur der Streifen über dem
Reif zu sehen. `tests/zeichen` vergleicht die Füllung beider am Knoten.
Über dem Zeichen hat der
Profilkopf nur seinen Innenabstand, und `.pp-header` schneidet ab: für die
brennenden Stufen rückt er nach unten (`--feuerluft`) — und nur für sie,
damit neunzehn von zwanzig Profilen dafür nichts zahlen.
Dieselbe Serie brennt auch in den Formpunkten (`.dot.glut`, `formDotsHtml`)
— dort aber als zwei Pseudo-Elemente, nicht als SVG: sechzig gezeichnete
Feuer auf einer Liste sind auf dem Telefon eine Zumutung. Der Punkt bleibt
grün, die Flamme sitzt darüber.

**Am Ring steht jeder Zustand.** Der Ring trug nur den mit der höchsten
Priorität: wer Player of the Week, Team of the Season und Player of the Day
zugleich war, zeigte eins davon, und die anderen gab es im Profil nirgends.
Jetzt sitzt jedes Zeichen auf dem Ring. Der wichtigste steht oben rechts, wo
vorher der einzige stand; oben mittig sitzt die Krone der hohen Stufen und
unten der Schild mit dem Platz, dort steht keins. Die Zeile darunter blieb
eine Zeile — mehrere von Anfang an schoben die Elo-Werte aus dem ersten
Bild —, sie klappt zu allen auf. Trägt jemand ein Lob und eine
Niederlagenserie, verschwiege Gold allein die Serie und Rot allein das Lob:
der Ring wechselt deshalb langsam zwischen beiden.

Player of the Week und Player of the Day kommen je Spieler aus dem letzten
abgeschlossenen Zeitraum, in dem er selbst gespielt hat — nicht aus dem
letzten der Liga und nicht aus dem letzten mit einem Sieger. Am Sieger des
letzten Zeitraums der Liga verlor Leon sein Zeichen: er war am 21.10.
Spieler des Tages, an den drei Spieltagen danach spielte die Liga ohne ihn.
Den Titelverteidiger gibt es weiter nur einmal, weil die Vorsaison nur einen
Meister hat. Die Wochen werden nach der Zeit verglichen: als Text steht
„2027-W10" vor „2027-W9", und der Sieger der neunten Woche hätte das Zeichen
bis in die dreizehnte getragen.
