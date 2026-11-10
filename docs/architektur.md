# Herleitung

> **Was hier NICHT steht:** Ablauf, Regeln, Wächter, Testsuiten, Landkarte,
> und überhaupt jede Zahl. Das steht in `CLAUDE.md`, dort an genau einer
> Stelle, und Wächter 6 zählt es nach. Dieses Dokument beantwortet nur die
> Fragen, die eine Anweisung nicht beantwortet: **warum** das Repository so
> geschnitten ist.
>
> Beides doppelt zu führen war der frühere Zustand. Das Ergebnis: hier stand
> „sechs Suiten", während es sieben waren, und ein Arbeitsablauf in einer
> anderen Reihenfolge als der verbindliche. Wer zwei Anweisungen findet,
> befolgt die falsche.

## Warum eine ausgelieferte Datei

Die Liga ist ein Dutzend Leute und ein Tischkicker. Es gibt keinen Server,
kein Deployment-Fenster und niemanden, der eine Build-Kette betreut.
GitHub Pages liefert eine Datei aus, und ein neuer Stand ist ein `git push`.

Der Preis dafür ist, dass die Datei alles enthält: Stile, Logik, Ansichten.
Sie ist deshalb groß — aber sie wird einmal geladen und danach vom Service
Worker aus dem Gerät bedient (`sw.js`, ebenso gebaut und mitversioniert), und
die Alternative wäre eine Werkzeugkette, die niemand wartet.

## Warum Aneinanderhängen und kein Bundler

Die gesamte Logik ist eine einzige IIFE. Innerhalb davon greifen hunderte
Bezeichner quer durcheinander, ohne jede Deklaration von Abhängigkeiten.
Sie in `import`/`export` zu übersetzen wäre ein eigenes Projekt mit eigenem
Risiko und ohne sichtbaren Gewinn — die App liefe danach genauso.

`build.mjs` hängt die Dateien deshalb in alphabetischer Reihenfolge wieder
aneinander. Daraus folgt die einzige Regel, die man beim Anlegen einer Datei
kennen muss: **die Nummern-Präfixe sind die Reihenfolge.** Wer umbenennt,
verschiebt Code.

Das kostet etwas, und man sollte wissen, was: es gibt keine Kapselung. Jede
Datei sieht jede andere, ein Name ist einmal im ganzen Projekt vergeben, und
eine Funktion, die niemand mehr ruft, fällt niemandem auf. Genau dagegen
prüft Wächter 4 — er ersetzt, was ein Modulsystem geschenkt hätte.

## Warum die Version ein Fingerabdruck ist

`BUILD_VERSION` steht im ausgelieferten Code, und `checkForUpdate` fragt
alle fünf Minuten die veröffentlichte Datei ab, um die beiden zu vergleichen —
mit dem ETag der letzten Antwort, sodass eine unveränderte Seite nicht noch
einmal übertragen wird. Ist die entfernte Version eine andere, lädt die App
von selbst neu, sobald nichts offen ist und niemand gerade etwas berührt
[§C42], und sagt es danach kurz.

Von Hand gepflegt stand diese Nummer sechs Veröffentlichungen lang still.
Die Folge war nicht sichtbar, sondern das Gegenteil: jedes Gerät, das die
App offen hatte, verglich die Version mit sich selbst und blieb auf einem
Stand von vor Tagen. Ein PWA-Symbol auf einem Telefon wird nicht neu
geladen, wenn niemand es dazu auffordert.

Deshalb vergibt `build.mjs` die Nummer und nicht der Mensch: sie endet auf
einem Hash über genau den Inhalt, der ausgeliefert wird. Sie ändert sich,
wenn sich die Auslieferung ändert, und sonst nie — ein Bauen ohne Änderung
darf kein Update auslösen. Das Datum davor ist nur Lesbarkeit und bleibt
stehen, solange der Hash steht. Wächter 5 prüft, dass die ausgelieferte
Datei die Nummer trägt, die zu ihrem Inhalt gehört.

## Warum der Start nicht auf das Netz wartet

Ohne Netz gibt es keine Liga — aber fast immer weiß das Gerät schon, was die
Datenbank sagen wird. Deshalb zeigt der Start den letzten Stand des Geräts
(IndexedDB, `06c-stand.js`), während der Abruf läuft, und der Service Worker
hält Seite, Schriften und Bibliothek bereit [§C42]. Der Stand zeigt nur und
schreibt nie: was veröffentlicht oder speichert, hängt am Live-Abruf, sonst
entstünde eine Story aus gestrigen Daten, die für immer gespeichert bliebe.

Aus demselben Grund läuft der Story-Generator in einem Worker
(`29c-news-worker.js`), und zwar mit dem ausgelieferten Code selbst statt
einer zweiten Fassung: ein zweiter Generator liefe früher oder später
auseinander, und die Karten auf zwei Geräten sagten Verschiedenes.

## Warum die Tests im Browser messen

Ein Teil der Zusicherungen ist Geometrie: ob eine Flamme in ihrer Zeile
bleibt, ob ein Zeichen von einer Kartenkante abgeschnitten wird, ob eine
Wischgeste beim richtigen Element ankommt. Solche Sätze lassen sich nicht
durch Lesen prüfen, und ein Test, der sie behauptet statt sie zu messen,
ist ein grüner Haken für nichts.

Die Suiten, die das tun, brauchen deshalb einen echten Browser. Ohne ihn
steigen sie mit Code 2 aus und werden als *übersprungen* geführt — sichtbar,
aber nicht rot, damit ein Rechner ohne Chromium nicht die ganze Prüfung
blockiert. Lokal: `npm install --no-save playwright-core`.

## Veröffentlichung

Veröffentlicht wird über GitHub Actions (`.github/workflows/pages.yml`,
Pages-Quelle „GitHub Actions" und die Variable `PAGES_VIA_ACTIONS` = `true`):
bei jedem Push auf `main` wird gebaut, geprüft und das Ergebnis aus `dist/`
veröffentlicht. Jeder andere Zweig und jeder Pull Request läuft nur durch
den Prüf-Job. Die Läufe stehen je Zweig in einer eigenen Reihe: mit einer
gemeinsamen Gruppe verdrängte ein Push auf einen Arbeitszweig den wartenden
Lauf von `main`, und dessen Fassung kam nie ins Netz.

`index.html` und `sw.js` werden trotzdem mitversioniert, und Wächter 1 prüft,
dass sie zu `src/` passen: zurück auf „Deploy from a branch" geht es mit zwei
Handgriffen (Variable löschen, Pages-Quelle wieder auf den Branch), und dann
ist der Stand im Repository der Stand im Netz.
