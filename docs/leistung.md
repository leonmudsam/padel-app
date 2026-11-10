# Performance und Cache-Gültigkeit

Wie die App gemessen wird und was die Messungen in vier Runden ergeben
haben. Die Regeln, die daraus folgen, stehen in [laufzeit.md](laufzeit.md).

Stand: 3. Oktober 2026. Vergleich zum Stand `5445ba8`.

## Was geändert wurde

- Unveränderte Anzeigeansichten behalten DOM, Fokus und Bindings. Nur das
  zuletzt gerenderte Markup wird gemerkt, zusammen mit Datenversion und
  Root-Knoten. Zeitabhängige Vorlagen werden weiterhin ausgewertet.
  Formulare und Einstellungen werden nicht wiederverwendet.
- Die fünf Navigationsknöpfe bleiben im Dokument. Bei einem Wechsel wird
  ihre aktive Klasse geändert, nicht die ganze Leiste neu gebaut.
- Der Feed baut zunächst ungefähr zwölf Karten, höchstens fünfzehn.
  Weitere Grafiken, Texte und DOM-Knoten entstehen in Portionen von höchstens
  vier Karten pro ruhigem Takt. Auch ein großer einzelner Spieltag ist teilbar.
  Alte Aufträge gelangen nicht in neue Filter/Blätter oder in geschlossene
  Ansichten. Tageskopf, Tageskarte, Reihenfolge und Story-IDs bleiben erhalten.
- Gleichzeitige `loadAll`-Anforderungen laufen nicht mehr nebeneinander.
  Ein Burst von sechs Anforderungen braucht zunächst vier Leseabfragen und
  danach einen frischen Durchlauf mit vier weiteren, statt 24 paralleler
  Abfragen. Kommt während des Folgedurchlaufs eine weitere Anforderung,
  folgt erneut ein frischer Durchlauf. Überholte Antworten werden nicht
  eingebaut; alle Aufrufer warten bis zum abschließend aktuellen Stand.
  Reines Hintergrundpolling schließt sich nur an den laufenden Abruf an,
  damit langsame Verbindungen nicht immer neue Zusatzläufe auslösen.
- Ablehnungen und fehlerhafte Teilantworten geben die Ladesperre wieder frei,
  ersetzen keine Daten durch Teilstände und erlauben einen erneuten Versuch.
- Tages-, Wochen-, Saisonlisten- und Positionsverlauf-Caches berücksichtigen
  Kalenderwechsel auch ohne neue Partie oder Datenversion.

Die Elo-, Prestige-, Rekord- und Chronikformeln wurden nicht verändert.
Story-Inhalt, Publikationsregeln und gespeicherte Grafikentscheidungen bleiben
unverändert. Keine Datenbank-/Schemaänderung und keine neue Laufzeitabhängigkeit.

## Lokale Messung

Chromium, 390 × 844 px, 466 echte Fixture-Partien, zwölf Spieler. Gemessen
wird synchrones JavaScript samt erstem Layout, ohne Backend oder externe
Schriftladezeiten. Drei kalte und neun warme Aufrufe je Ansicht, Median,
gleicher Messmodus mit `--profil`. Hardware- und laufabhängige Richtwerte,
keine garantierten Zeiten auf einem Telefon.

„Warm“ bedeutet hier: dieselbe Ansicht mit unveränderten Daten erneut rendern.
Es bedeutet nicht, dass ein erstmaliger Tabwechsel ebenfalls unter 2 ms dauert.

| Wiederholte Ansicht | Vorher | Nachher |
|---|--:|--:|
| Liga | 6,9 ms | 0,9 ms |
| Positionen | 4,2 ms | 0,3 ms |
| Rekorde | 21,0 ms | 1,3 ms |
| Chronik | 3,4 ms | 0,3 ms |
| Verlauf | 11,6 ms | 0,6 ms |
| Profil | 12,1 ms | 12,1 ms |
| News öffnen | 18,9 ms | 11,9 ms |

Beim News-Öffnen wurden vorher alle 77 Karten gebaut, jetzt zunächst 14
im Fixture-Feed. Das vollständige Nachreichen wird separat geprüft.
Die kalten Berechnungen der Liga/Positionen und der Story-Generator sind
weiterhin aufwendiger; diese Änderung behauptet dort keinen neuen Geschwindigkeitsgewinn.

## Nachmessen und Regressionen

```powershell
node tools/build.mjs
node tools/performance.cjs --profil --ausgabe=dist/performance.json
node tests/leistung.test.js
node tests/run.mjs
```

`leistung` prüft 49 Invarianten im Browser statt empfindlicher Zeitlimits:
DOM-Identität und Fokus, frische Versionen, Kalendergrenzen, vollständigen
Feed, einmalige Tagesköpfe/-karten, begrenzte Portionen, alten Filterauftrag,
Schließen und Versionswechsel, Rückfall ohne Idle-API sowie parallele
Ladeanforderungen, Teilfehler, Wiederholung und spätere Anforderungen während
der Story-Synchronisierung und Hintergrundpolling bei einem langsamen Abruf.
Die neuen Engstellen-/Kalenderprüfungen wurden
vor der jeweiligen Änderung nachweislich rot ausgeführt.

Ohne Chromium wird die Browser-Suite sichtbar übersprungen. Das Messtool
benötigt denselben vorhandenen Testbrowser. JSON-Messergebnisse in `dist/`
sind lokale, nicht eingecheckte Artefakte.

## Zweite Runde: Handy-CPU und gemeinsame Rechenquellen

Vergleich dieser Runde: `2aa54b0`. Gleicher Chromium 151, 390 × 844 px,
466 Partien und zwölf Spieler, diesmal mit vierfach gedrosselter CPU.
Die Vergleichsfassung wurde über `KICKER_HTML=index.html` gemessen, bevor das
neue Build in die Wurzel kopiert wurde. Vorher und nachher mit `--profil`.
Die Drosselung simuliert keine konkrete Handy-Hardware oder Safari.

Neu:

- Historische Rekord-Kontexte und Saison-Peaks teilen exakte DB-First-Prefixe.
  Im gesamten Messablauf sinkt die Zahl der Simulationen von 54 auf 38.
  Saison-Auszeichnungen teilen außerdem ihre Monatsteilmengen, damit die
  gemeinsamen Periodensieger nicht je Spieler neu gerechnet werden.
- Der globale Cache hält eine vollständige History und alle Saison-/Team-Maps.
  Ein Add ohne Versionswechsel verlor früher alte Maps im inkrementellen Weg.
  Monatswechsel und Quellenersatz können keine leeren abgeleiteten Cache-Hits
  hinterlassen. Historische Prefixe sind begrenzt, fremde Teilmengen WeakMaps.
- Der aktuelle Monat ist ein einzelnes Memo mit Kalenderprüfung, kein pro
  Lookup neu aufgebautes Objekt. Periodenstatistiken folgen der kanonischen
  Zeitraumliste, einschließlich Tages-/Wochenwechsel und Saisonreset.
- Spielerprofile verwenden gemeinsame chronologische Listen, binden nur ihre
  eigenen Knöpfe und zeichnen ihre unteren Abschnitte bedarfsweise. Der Kopf
  mit Aura und Wappen bleibt vollständig. Überhänge und horizontale Galerien
  bleiben erhalten; ältere Browser behalten das vollständige Layout.
- Blattnavigation und Wischabschlüsse sind an ihre Öffnungsnummer gebunden.
  Ein alter Abschluss verändert kein später geöffnetes Blatt. Der Scrollreset
  erfolgt vor dem neuen Markup, nicht zwischen zwei neuen Layout-Zuständen.
- H2H-Listen werden auch bei Edit, Ausblenden und Löschen aktuell. Null als
  gespeicherte Erwartung, abgeschalteter Spielbonus oder Verlustaufschlag
  wird nicht mehr durch einen Standard ersetzt. Bestehende DB-Deltas werden
  nicht neu berechnet oder überschrieben.
- Prestige-Teilsummen verwenden zentral die vorhandene Restverteilung:
  Auszeichnungen + Monatschroniken + Rekorde ergeben exakt den Gesamtwert,
  in Story und Laufbahn gleich. Rohwerte und Gesamtformel bleiben unverändert.

| Profilaufruf, JS + erstes Layout | Vorher | Nachher |
|---|--:|--:|
| kalt, Median | 350,8 ms | 310,7 ms |
| wiederholt, Median | 64,5 ms | 36,0 ms |

Eine Änderung des Scrollreset allein verschob Layout-Arbeit nur aus der
JavaScript-Messung in das nächste Bild. Das wurde nicht als Gewinn gewertet;
obige Zeiten schließen das erste Layout ein. Kopf und Saison-Galerie wurden
auch visuell bei 390 px geprüft, jeder Abschnitt wird im Test hineingescrollt.

### Grenzen der Messung

Der kalte synchrone Story-Generator bleibt aufwendig: im Interaktionslauf
1355,5 → 1177,8 ms; längster Task 1373 → 1196 ms. Das ist weniger Arbeit,
aber **keine Lagfreiheit**. Kalte Liga-/Positionenaufrufe brauchen weiter
mehrere hundert Millisekunden. Bei News-Öffnen ist kein verlässlicher weiterer
Zeitgewinn nachgewiesen (längster Task 231 → 246 ms in diesen Läufen).
Netzwerk, echte Touch-Scrollbilder, Schriftladen, Safari und physische Telefone
sind damit nicht abgedeckt. Keine Garantie von durchgehend 60 Bildern/s.

Das Messtool erfasst jetzt Bildabstände und Longtasks. Zeitwerte bleiben
diagnostisch statt CI-Grenze. Profilzähler enthalten aufgerufene Unterfunktionen
und dürfen nicht zu einer vermeintlichen Gesamtzeit addiert werden.

```powershell
node tools/performance.cjs --cpu=4 --mobil --profil --ausgabe=dist/mobil.json
node tests/mobil.test.js
node tests/prefix.test.js
node tests/rechnen.test.js
```

Die neuen Suiten prüfen 21 UI-, 76 Prefix- und 36 Recheninvarianten am gebauten
Ergebnis. `prefix` und `rechnen` laufen auch in CI ohne Chromium. Neue Fehler
wurden gegen die Vergleichsfassung zunächst rot nachgewiesen; geprüft werden
auch Bruchteile, gleiche Zeitstempel, Kalendergrenzen und direkte Quellenwechsel.
`mobil` prüft tatsächliches Verhalten und Arbeitsmenge, keine empfindlichen
Millisekundenlimits.

## Dritte Runde: Eingaben und Bewegung

Vergleich: `5cbcb75`, Chromium 151, 390 × 844 px, gleiche Fixture und CPU ×4.
Drei Läufe je Aktion mit `tools/interaktion.cjs`. Eingaben stehen synthetisch
per Timer in der Warteschlange. Handlerzeit, Eingaberückstau, Longtasks und
rAF-Abstände sind getrennte Messwerte, keine echte Handy-FPS- oder INP-Messung.

- Die Navigation quittiert Reiterwechsel vor dem teuren Neuzeichnen.
  Auch schnelle Filterwechsel teilen einen Auftrag; nur das letzte Ziel wird gebaut.
  Direktes Rendern und neue Roots entziehen alten Aufgaben den Besitz.
- Match-Zustand, Score und Gültigkeit reagieren unmittelbar; Vorschauarbeit
  wird je Bild zusammengefasst. Chance, Deltas und Speichern verwenden das
  letzte kanonische `computeMatch`-Ergebnis, nicht separate Berechnungen.
- Suchen behalten das Eingabefeld. Teams zeichnen nur passende Ergebnisse
  aus derselben Vorlage; Cursor, Fokus und IME-Komposition bleiben erhalten.
  Die Spielerauswahl hat Pfeiltasten-/Enter-/Escape- und Pointerbedienung.
- Doppeltippen speichert nicht zweimal. Speicherantworten sind an ihren
  Entwurf gebunden; neuere Eingaben bleiben auch nach Erfolg oder Fehler
  erhalten. Bereits gestartete Datenabrufe ersetzen keine lebenden Formulare,
  auch nicht bei Abruffehlern. Hauptansichtsbindungen bleiben im Hauptinhalt.
- Segmentwähler bewegen ihre feste Box per `transform`, nicht per animiertem
  `left`/`width`. Blattgesten bündeln Zeichnen je Frame, messen tatsächliche
  kurze Wischgeschwindigkeit und behandeln Abbruch/Zweitfinger sicher.
  Scrollbesitz, Bewegungsruhe und sichtbarer Tastaturfokus bleiben berücksichtigt.

| Eingabediagnose | Vorher | Nachher |
|---|--:|--:|
| Zehn Score-Tipps: Handler-Median | 2,4 ms | 0,5 ms |
| `computeMatch` dafür | 20 | 10 |
| Schneller Score-Burst: Handler-Median | 1,2 ms | 0,3 ms |
| Fünf schnelle Tababsichten: gebaute Ansichten | 5 | 2 |
| Dabei maximaler Eingaberückstau | 610,3 ms | 350,6 ms |
| Dabei Longtasks | 3 | 1 |
| Isolierte Segmentbewegung: Layouts je 300-ms-Übergang | 18–19 | 0 |

Die Segmentmessung isoliert einen Drei-Knopf-Wähler in derselben App-Hülle:
vorher entstanden rund 6–8 ms Layoutarbeit je Bewegung, nachher keine.
Das ist weniger Arbeit je Bild, kein pauschaler Nachweis höherer GPU-FPS.
Score-Endstände, Speicherzustände, Navigationsziele und Eingabefokus stimmen
in allen drei Diagnoseläufen. Bei 20 schnellen Score-Tipps entstehen jetzt
je nach Framephase vier bis acht Berechnungen statt dreißig.

### Verbleibende Grenzen

Der kalte Positions-Klickhandler antwortet jetzt mit rund 0,8 statt 313,7 ms,
aber sein nachgelagerter Render bleibt ein rund 291-ms-Longtask. Der größte
rAF-Abstand bleibt rund 333 ms; die vollständige Ansicht erscheint dadurch
nicht schneller. Zusammenfassen spart Zwischenansichten, beseitigt aber nicht
die Kosten der endgültigen kalten Berechnung. Auch der zuvor dokumentierte
kalte Story-Generator bleibt ein Engpass.

Teamsuche vermeidet den vollständigen Render und erhält den Fokus; ein
FPS-Gewinn ist dafür in diesen Läufen nicht nachgewiesen. Blattziehen und
Spielersuche hatten bereits vorher keine Longtasks. Reale Telefone, Safari,
Bildschirmtastaturen und Netzwerk sind nicht durch CPU-Drosselung ersetzbar;
durchgehend 60 Bilder/s oder vollständige Lagfreiheit sind nicht zugesichert.

```powershell
node tools/interaktion.cjs --cpu=4 --runden=3 --ausgabe=dist/interaktion.json
node tools/interaktion.cjs --cpu=4 --runden=3 --waehler-only --ausgabe=dist/waehler.json
node tests/bedienung.test.js
node tests/bewegung.test.js
node tests/eingabe.test.js
```

Die drei neuen Suiten prüfen 16 Bedienungs-, 24 Bewegungs- und 42
Eingabeinvarianten am gebauten Artefakt. Neue Zusicherungen wurden vor ihrer
jeweiligen Behebung rot ausgeführt; Geometriegrenzen bleiben unverändert.
Elo-/Prestigeformeln und publizierte Story-/Grafikentscheidungen sind unverändert.

## Vierte Runde: stille Liga-Aktualisierung und saubere Detailabschlüsse

Vergleich `4e2949b`, gleiche 466 Partien, unveränderte gemeinsame
Story-Snapshots, Chromium 151, 390 × 844 px, CPU ×4, drei Läufe je Aktion.
Neue Award-Markierungen dürfen den Vergleich nicht durch andere ausgewählte
Stories verändern. Gemessen ist die vollständige Arbeit einschließlich
verzögertem Render, erstem Layout und zwei rAF-Gelegenheiten, nicht nur ein
kurzer Klickhandler und auch nicht der fertige GPU-Paint.

- Liga-Tap (auch erneut auf den aktiven Knopf) aktualisiert über denselben
  Datenweg im Hintergrund. Ein Auftrag bündelt weitere Taps bis zum Abrufende;
  ein bereits früher gestarteter Abruf wird einmal frisch nachgeholt.
  Unveränderte Antworten zeichnen/invalidieren nichts; Fehler lassen die letzte
  Ansicht stehen. Keine zweite Datenbank-/Elo-Rechnung und kein Dokumentreload.
- Die komplette Ansicht startet nicht nach jedem Filter oder Datenwechsel
  erneut mit 320 ms Verblassen/Verschieben. Segmentwähler und erklärende
  Grafiken behalten ihre eigene Bewegung.
- Story-Details beginnen synchron vor neuem Markup oben, ohne den Feed
  zurückzusetzen. Nicht gezeigte Ergebnisbänder und doppelte Zeilenlisten
  werden gar nicht erst gebaut.
- Übergangsabschlüsse haben einen abbrechbaren Listener/Timer je Eigenschaft.
  Doppeltes Schließen invalidiert keinen Cleanup; abgeschlossene Wische leeren
  sofort, ohne zweite Wartephase. Im Vergleich eines 500-Zeilen-Blatts:
  ein statt zwei Abschlüsse und 0 statt 1007 verbleibende Knoten beim ersten
  Wischabschluss. Der alte Doppel-Close konnte diese Knoten dauerhaft behalten.
- Wiederholungsmedaillen lesen die historische Vergabezahl aus kanonischen
  Badge-Events. Ein kompakter Index je Datenstand ersetzt aktuelle Vollzensen
  pro Spieler und Medaille; ein Legacy-Rang braucht nur binäre Suche. Neue
  Snapshots halten ihre Zahl und höchstens drei Marken, alte V2-Daten bleiben
  unverändert. Elo- und Prestigeformeln sind nicht betroffen.

Belastbar in allen drei Diagnoseläufen: drei sichtbare Match-Anlasszeilen
brauchen drei statt sieben Textaufbauten und kein verworfenes Ergebnisband;
sechs Tafelzeilen werden sechs statt zwölf Mal gezeichnet.

| Vollständige Aktion bis zwei rAF-Gelegenheiten, Median | Vorher | Nachher |
|---|--:|--:|
| Matchdetail warm | 83,1 ms | 65,9 ms |
| Tafeldetail warm | 108,3 ms | 100,0 ms |
| Fünf schnelle Tababsichten warm | 250,5 ms | 215,9 ms |
| Story-Detail schließen | 49,9 ms | 49,8 ms |

Die kalten Matchdetails bleiben bei rund 350 ms Bildlücke, die kalten
Tafeldetails wurden nicht schneller (416,6 → 432,5 ms vollständige Aktion).
Schließen hatte schon vorher keine Longtasks. Es sind lokale Richtwerte,
keine CI-Zeitgrenzen und kein belastbarer Nachweis von Handy-FPS oder INP;
die teure kalte Statistik-/Storyarbeit bleibt ein Engpass.

```powershell
node tests/aktualisierung.test.js
node tests/storyscroll.test.js
node tests/bewegung.test.js
node tests/wiederholung.test.js
node tools/interaktion.cjs --cpu=4 --runden=3 --ausgabe=dist/interaktion.json
```

Die neuen/erweiterten Suiten prüfen 16 Aktualisierungs-, 20 Storydetail-,
31 Bewegungs- und 44 Wiederholungsinvarianten, einschließlich Rotnachweis vor
den Änderungen, gleicher Snapshotbühne im Bündel/Detail und Geometrie bei
288/360 px. Die lokale Vorher-/Nachher-Diagnose mit identischen Stories liegt
im ignorierten `dist`; sie verändert weder den Backendbestand noch den Code.

## Fünfte Runde: Start, Hintergrund und Ruhe

Vergleich gegen `a4c563b`, dieselben 466 Partien, Chromium, 390 × 844 px,
vierfach gedrosselte CPU. Die Regeln dazu stehen in [laufzeit.md](laufzeit.md)
und im Gesetz [§C42](gesetze/C42-start.md); die Bewegungsregel in
[§C27](gesetze/C27-ein-bauteil.md).

**Der Start wartet nicht mehr auf das Netz.**

- Nach jedem Live-Abruf liegt der Stand der Liga auf dem Gerät (IndexedDB).
  Der nächste Start zeichnet daraus, während das Netz antwortet, und schreibt
  dabei nichts. In `tests/start` mit drei Sekunden Netz steht die Liga nach
  rund 400 ms statt nach dem Netz.
- Ein Service Worker hält Seite, Schriften und Supabase-Bibliothek. Ohne Netz
  öffnet die App aus ihm; Update-Check und Neuladen gehen weiter ans Netz.
- Der Update-Check merkt sich den ETag seiner Fassung. Vorher lud jeder Start
  die ganze Seite ein zweites Mal herunter, neben den vier Datenabfragen.

**Die Rechnung nach dem Start blockiert nicht mehr.**

- Der Story-Generator rechnet in einem Worker mit demselben Code. Kalt war
  er auf dem Hauptthread rund eine Sekunde am Stück (`Generator kalt` in
  `tools/performance.cjs --mobil`, 1038 ms); beim Start rechnet der
  Hauptthread jetzt keine Story mehr (`tests/start`).
- Nach dem Zeichnen rechnen die übrigen Reiter im Leerlauf vor. Beim ersten
  Öffnen von Positionen, Awards, Rekorden, Chronik und Teams nach dem Start
  rechnet nichts mehr kalt (`tests/start`); vorher Awards drei, Teams eine
  kalte Rechnung.
- Gemeinsame Zeitschnitte und Generator-Sortierung sparen Kopien der Liga;
  ein Zeitgewinn ist in einzelnen Läufen nicht vom Rauschen zu trennen
  (±20 % zwischen zwei Läufen derselben Fassung).

**Was offen steht, kostet fast nichts mehr.** Hauptthread-Arbeit je Sekunde,
während die Ansicht nur offen steht (`node tools/performance.cjs --cpu=4
--ruhe`):

| Ansicht | vorher | nachher |
|---|--:|--:|
| Feed | 589 ms | 5 ms |
| Awards | 238 ms | 2 ms |
| Saisonrückblick | 157 ms | 4 ms |
| Wochenrückblick | 45 ms | 5 ms |
| Liga, Positionen, Rekorde, Chronik, Teams, Verlauf, Profil, Laufbahn | 2–4 ms | 2–5 ms |

Die Ursache waren Endlos-Animationen auf `box-shadow` und
`background-position`: jedes Bild verlangte einen Takt des Hauptthreads über
die ganze Ansicht, und ein Wischen in dieser Zeit ruckelte. Dieselben Scheine
und Lichtläufe laufen jetzt als Ebenen über `opacity` und `transform`.
`tools/golden.mjs --bilder` vergleicht 180 Bilder in Ruhe und mit Animationen,
die bei 0, ¼ und ½ angehalten sind: keins über der Schwelle; einzig der
Hochpunkt des Breaking-Scheins weicht um 0,6 % der Pixel ab (Überblendung
statt wachsendem Schatten).

Nicht verändert: der Puls des Statusrings im Profilkopf (`avRingPulse`)
bleibt ein `box-shadow`, weil das Wappen abschneidet, was über seinen Rand
ragt; er erscheint nur im Kopf eines Profils mit extremer Form.

```
node tools/performance.cjs --cpu=4 --ruhe
node tools/golden.mjs --basis=<rev> --bilder
node tests/start.test.js
```

Grenzen wie in den Runden davor: Chromium mit CPU-Drosselung ist kein
Telefon, Safari und echte Netze sind nicht gemessen.

## Sechste Runde: Bewegung

Vergleich gegen `e55e91a^`, den Stand vor der Bewegung [§C43] — Aufbau beim
Öffnen und bei jedem Wechsel, Kantenlicht, Schlitten, Schleier und
Ladelinie, der schlichte Hinweis, gestaffelte Blätter, das leise Licht.
Dieselben 466 Partien, Chromium, 390 × 844 px, vierfach gedrosselte CPU.

**Was offen steht, kostet fast nichts dazu.** In Ruhe läuft nur das leise
Licht, rund zwei Drittel der Zeit eine Runde: gemessen im eingeschwungenen
Zustand 8 ms Hauptthread je Sekunde, solange es läuft, ohne Licht unter
1 ms — der Grundpreis jeder laufenden Animation, gleich ob Ring, Schein
oder beides, und gleich um welches Ziel; Stil, Layout und Malen bleiben bei
null. Der Schlitten unten und die Ladelinie sind zwei Ebenen mehr,
zusammen unter 1 % der Fläche. Das Kantenlicht dreht und blendet auf dem
Compositor: Liga mit drei Lichtern 23,7 ms Hauptthread je Sekunde, ohne
24,6 ms.

**Die Bedienung bleibt gleich schnell.**

| Fall | vorher | nachher |
|---|--:|--:|
| Reiterwechsel, warm, bis zum Bild | 141 ms | 136 ms |
| Kalter Wechsel zu Positionen, bis zum Bild (Median aus 5) | 385 ms | 389 ms |
| Profil öffnen: Stil, Layout, Aufgaben je Öffnen | 57 / 22 / 176 ms | 56–59 / 21–23 / 166–181 ms |
| Öffnen der App: Bilder in den ersten 2,5 s | 47–51 | 47–51 |

Ein Wechsel im Reiter kostet bis zum ersten Bild 20 bis 30 ms mehr
(Aufbau und Licht, verschachtelt gemessen, Median aus 16); der Schlitten
fährt dafür sofort, statt auf die Rechnung zu warten. Was ein Blatt
verdeckt, hält an: 6 ms beim Anhalten, 1 ms beim Fortsetzen in den Awards.

**Der Feed** braucht beim Öffnen mit dem Licht um die ungelesenen Stories
rund 110 ms mehr Hauptthread über die ersten 6 s (3267 gegen 3155 ms,
Median aus 6) und im Mittel ein langes Bild mehr, während er noch Karten
nachreicht. Die Lage der Karten liefert ein `IntersectionObserver`; mit
`getBoundingClientRect` waren es 200 ms mehr. Die große Karte des Tages
kostet im Bild mit und ohne Licht gleich viel (rund 430 ms je Sekunde,
ihre eigenen SVG-Bewegungen) — das ist älter als diese Runde.

Einzelmessungen streuen stark: der Profil-Kaltstart desselben Stands lag
zwischen 249 und 720 ms. Verglichen wurde deshalb über Wiederholungen, im
Wechsel der Fassungen und mit Stil-, Layout- und Aufgabenzeit statt
einzelner Zeitstempel.

```
node tools/performance.cjs --cpu=4 --mobil
node tools/performance.cjs --cpu=4 --ruhe
node tools/interaktion.cjs --cpu=4 --runden=3
```

## Siebte Runde: Nur, was man sieht

Vergleich gegen den Stand davor, dieselben 466 Partien, Chromium,
390 × 844 px, vierfach gedrosselte CPU, App vom echten Server mit dem Stand
des Geräts.

**Der Start rechnet nichts mehr für Unsichtbares.** Er zeichnete die Zeichen
der Laufbahn für jeden Rang der Liga vor, in Blöcken im Leerlauf. Jetzt
zeichnet sie das Profil, aus dem die Laufbahn kommt, für seinen Rang
(`_insRangWaermen`, beschrieben in [laufzeit.md](laufzeit.md)).

| Lange Aufgaben nach den ersten 2,5 s (ohne Bedienung, 40 s) | vorher | nachher |
|---|--:|--:|
| Anzahl | 49 | 2 |
| zusammen | 5577 ms | 172 ms |
| längste | 298 ms | 122 ms |
| letzte | nach 14,2 s | nach 3,6 s |

Wer in den ersten Sekunden tippte, wartete vorher bis zu 300 ms auf eine
Zeichnung, die er nicht sah. Kalt kostet das erste Laufbahn-Blatt eines
Rangs 600 bis 900 ms Skript, warm 65 bis 140 ms; aus dem Profil ist es warm.

**Was endlos läuft, steht außerhalb des Bilds** [§C43]. In Ruhe kostet es
wenig — der Compositor dreht es —, aber jedes Bild beim Scrollen rechnete
alles auf dem Hauptthread mit. 40 Schritte durch den Feed, je Fassung zwei
Läufe:

| Feed scrollen | vorher | nachher |
|---|--:|--:|
| Hauptthread je Sekunde | 1037–1094 ms | 616–628 ms |
| Bilder über 34 ms | 88–93 | 34–42 |
| längstes Bild | 517–700 ms | 117–200 ms |

Angehalten wird, was der Browser zeichnet: die großen Karten, die
Eilmeldung, Glanz und Atmen der Karten im Bild und am Rand, im Profil der
Kopf. Die Karten mit `content-visibility:auto` stehen außerhalb des Bilds von
Anfang an still (achte Runde).

**Ein leises Licht** kostet, solange es läuft, den Grundpreis jeder Animation
(8 ms je Sekunde, ohne Licht unter 1 ms); verlässt seine Karte das Bild,
endet es.

```
node tests/start.test.js
node tests/blatt.test.js
```

## Achte Runde: Ring, Rückblicke, Chroniken

Vergleich gegen `974346e`, den Stand vor dem Ring mit allen Zeichen,
dieselben 466 Partien, Chromium, 390 × 844 px, vierfach gedrosselte CPU.

**Ein offenes Profil kostet wieder, was es vorher kostete.** Die Zeichen am
Ring kommen nacheinander und atmen danach; beides lag als zwei Bewegungen auf
`transform` an einem Element, und das rechnet Chromium jedes Bild im
Hauptthread — auch wenn die erste längst steht und nur ihren Endwert hält.
Gemessen 110 ms je Sekunde bei offenem Profil, ohne die Zeichen 10. Jetzt
liegen Kommen und Atmen auf zwei Elementen: 14 ms (vorher 12).

**Der Feed nach einem anderen Blatt.** Öffnete der Feed, während das Blatt
schon oben stand, legte Chromium die Bewegungen auch der Karten weit unter
dem Bildrand an, bevor `content-visibility` sie übersprang. Danach erreichte
sie kein `.steht` mehr, und ein einziger Glanz 3000 px tiefer verlangte jedes
Bild einen Takt des Hauptthreads über den ganzen Feed. Jetzt steht in einer
Karte alles still, bis sie im Bild ist (`.im-bild`) [§C43].

| Feed offen, direkt nach der Laufbahn | vorher | nachher |
|---|--:|--:|
| nach 4 s, das Licht um die Ungelesenen läuft noch | 120–160 ms/s | 40–50 ms/s |
| nach 10 s | 20–23 ms/s | 6–8 ms/s |

**Die Rückblicke** stehen in Ruhe bei 5 ms je Sekunde (vorher 2 bis 3):
Strahlenkranz und Bühne drehen auf der Grafikkarte.

**Der Generator** rechnet kalt im Hauptthread 960 bis 1140 ms gegen 1090
bis 1345 ms vorher (drei Läufe je Fassung, `Generator kalt`): die neuen
Chroniken und der Stand der Tafel je Partie kosten nichts Messbares. In der
App rechnet er im Worker.

```
node tools/performance.cjs --cpu=4 --ruhe
node tools/performance.cjs --cpu=4 --mobil
node tests/blatt.test.js
```

## Neunte Runde: Speichern ohne Warten

Eine neue Partie stand auf dem Telefon sekundenlang auf „Speichere…". Nach
dem Insert wartete der Knopf auf die Positionsstärke aller zwölf Spieler,
die Saison-Elo, das Neuladen der ganzen Liga und die Stories; erst danach
wechselte die Ansicht. Löschen, „Rückgängig" und Bearbeiten schrieben die
Deltas **aller** Partien der Liga — rund 500 Anfragen in zwanzig Runden
hintereinander, um fast überall denselben Wert zu schreiben — und leerten
jeden vergangenen Monat samt eingefrorener Chronik.

Jetzt steht die Änderung, sobald die Datenbank die eine Anfrage bestätigt
hat, die es braucht; die Liga rechnet das Gerät, und was die Datenbank
daraus ableitet, schreibt eine Kette danach, nur wo sich etwas geändert hat
[§3.1c]. Gemessen mit einer Attrappe, die jede Anfrage nach 250 ms
beantwortet, eingefrorenen vergangenen Monaten wie in der Liga und
`exp_a` als `real` wie in der Datenbank:

| vierfach gedrosselte CPU | sichtbar vorher | sichtbar nachher | Anfragen vorher | Anfragen nachher |
|---|--:|--:|--:|--:|
| Speichern | 3,5 s | 1,5 s | 30 | 18 |
| Rückgängig (letzte Partie) | 5,9 s | 0,7 s | 498 | 10 |
| Bearbeiten (40 Partien zurück) | 5,9 s | 0,6 s | 499 | 6 |

Ohne Drosselung sind es 0,5, 0,4 und 0,4 s. „Sichtbar" heißt: Rangliste und
Hinweis stehen. Beim Speichern davon 250 ms die Antwort auf den Insert und
rund 600 ms (gedrosselt) das Zeichnen der Rangliste mit dem neuen Stand —
fast ganz das Prestige hinter den Wappen der Zeilen. Die zwölf Anfragen an
`players` sind der Attrappe geschuldet (Positionsstärke 0,5 für alle); in
der Liga ändert sie sich nur bei den vier, die gespielt haben. Bearbeiten
schreibt die Deltas der Partie und jeder späteren desselben Monats — die
Elo verschiebt sich durch alle —, keine davor und keine eines anderen
Monats.

```
node tests/eingabe.test.js
```

## Zehnte Runde: eine Liga, die Jahre alt ist

Gemessen mit `mockup/langlebig-lauf.js`: die 616 echten Partien bis Oktober
neunmal hintereinander, jedes Mal 23 Wochen später, mit vertauschten
Spielern — 5544 Partien über 49 Monate, die vergangenen Monate eingefroren
wie in der Datenbank. Ein Lauf des Generators nach einer neuen Partie, in
Node auf dem Rechner, nicht auf dem Telefon:

| 5544 Partien | vorher | nachher |
|---|--:|--:|
| neuer Datenstand (eine Partie mehr) | 24,2 s | 10,9 s |
| derselbe Datenstand noch einmal | 1,0 s | 0,7 s |
| Wahlen eines Kopfs je Lauf | 3642 | 92 |

Fast die Hälfte war die Kette der Köpfe: sie lief bei jedem Datenstand ab
der ersten Partie der Liga, und weil der Bestand nur einen Monat
zurückreicht, wählte sie jeden älteren Kopf neu. Sie beginnt jetzt
`SP_SCORE_VORLAUF` Partien vor der ältesten Karte, die noch gebraucht wird
(`docs/laufzeit.md`), und wächst nicht mehr mit dem Alter der Liga.

Was bleibt, wächst weiter mit ihr: rund sieben der elf Sekunden sind
Prestige-Stände zu früheren Zeitpunkten — vor und nach jedem Spieltag, jeder
Woche und jedem Monat im Fenster, für die Ehrungen und die Laufbahn —, je
Stand die Auszeichnungen aller zwölf Spieler über alle Partien bis dahin und
die Rekorde zu diesem Zeitpunkt. Mit den 616 Partien von heute braucht ein
Lauf 1,1 bis 1,6 Sekunden, vorher 1,5 bis 2,0.

Der Generator läuft im Worker (`29c-news-worker.js`), und die Oberfläche
wartet nicht auf ihn — solange der Worker nicht ausfällt. Er galt nach
zwanzig Sekunden ohne Antwort als hängengeblieben, und dann rechnete der
Hauptthread denselben Lauf und blieb für die Sitzung dabei: mit den elf
Sekunden auf dem Rechner und einem Vielfachen davon auf einem Telefon wäre
das bei einer Liga dieses Alters bei jedem Lauf geschehen, und das Telefon
hätte so lange stillgestanden. Die zwanzig Sekunden gelten jetzt nur, bis
ein neuer Worker den Lauf annimmt; danach hat er fünf Minuten
(`docs/laufzeit.md`).

Dazu zwei Formen, die erst mit den Jahren auffallen: Zahlen ab fünf
Stellen standen ohne Tausenderpunkt im Satz („82820 Tore in 5152
Partien"), und ein Tag stand ohne Jahr, auch wenn er Jahre zurücklag
(„Der letzte Sieg gegen Leon war am 15.03."). Eine Revanche nach zweieinhalb
Jahren hieß „nach 130 Wochen", Gold von vor dreizehn Monaten „vor 400 Tagen"
[§C27].

```
node mockup/langlebig-lauf.js && node mockup/langlebig-pruef.js
```
