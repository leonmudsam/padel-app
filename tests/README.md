# Die Testsuiten

Geprüft wird immer das **gebaute** Ergebnis (`dist/index.html`), nie die
Quelle: nur so fällt auch ein Fehler auf, der erst beim Zusammensetzen
entsteht. Jede Suite ist ein eigener Prozess, weil die App eine IIFE mit
globalem Zustand ist.

Wie geprüft wird — gemessen statt geschätzt, jede Zusicherung einmal rot —
steht in [CLAUDE.md §5](../CLAUDE.md). Diese Datei nennt die Suiten.

## Die Suiten

| Suite | prüft | Checks |
|---|---|--:|
| `padel` | Die Padel-Logik [§1.3]: Sieger aus Sätzen und Games, Zu Null als ein Satz 6:0, Doppel-Bagel über zwei Sätze, knapp und deutlich je Satz, Match-Tiebreak als ein Game, offene Sätze, Gleichstand nicht speicherbar; jeder Satz ist eine Partie, drei auf einmal geben drei Zeilen; Sätze derselben Paare hintereinander sind eine Begegnung (2:1, Wende einmal am letzten Satz, eine Partie dazwischen beendet sie, alte Zeilen mit mehreren Sätzen werden geteilt, die Story einer gelöschten Partie verschwindet); die Satz-Eingabe liest die Art selbst (7:6 Tiebreak, ab 10 nach 1:1 Match-Tiebreak, Gleichstand offen); das Gewicht eines Satzes nach dem Weg bis zum Sieg (6:4 wie 6:0, beide über 3:0); Elo für längere Partien höher; jeder Satz eine eigene Rechnung (drei Sätze als eine Partie wie drei einzeln, ein gewonnener Satz bringt auch in der Niederlage Elo, die Vorschau nennt die Elo je Satz); keine Story ohne Partie, keine Fun Facts nach drei Tagen Ruhe; Satz zu Null, Zittersieg und Wende in den Auszeichnungen, Serien 5/10/15/20 und Saison-Elo 75/150/300, Klassen passend zu ihren Zählern, keine Auszeichnung spricht von Partien; das Profil zählt Matches; der Revanchist braucht ein neues Match; jede Schwelle von Chronik und Rekorden steht in ihrem Text, keiner spricht von Partien, die Chronik zählt in Sätzen (10/5/5/40/50); die Rekorde öffnen sich mit dem 40. Satz der Liga, nicht je Spieler (auch wer erst zwei Sätze hat, steht dann im Rennen), und bis dahin nennen Reiter, Erklärkarte und Blatt das Tor und den Stand der Liga; Erklärkarten lassen sich schließen; Grundwerte der Rekorde 30/20 und der Chroniken 30; der Seiten-Reiter öffnet auf Revés; die Insignium-Leiter (400 bis 3200) mit ihren Graden; der erste Tag: jede Ansicht der leeren Liga trägt eine Vorschau, Awards, Rekorde und Chronik zeigen ihren ganzen Katalog, kein Wochenfilter, der Spieler des Tages ab drei gewonnenen Sätzen, der Schwelle der Auszeichnung; die Staffel je Satz nach der Länge (1:0 17 %, bis 2 ein Drittel, bis 3 50 %, bis 6 100 %, je Game darüber +10 %), die Neulingsphase in vollen Sätzen, Wiederholungen nur in vollen Sätzen und der Ausgleich für den Verlierer eines Satzes über sechs; Profilbild und Regler stehen in der Liga, nicht auf einem Gerät (Gerätewerte der Regler verworfen, ein lokales Profilbild nachgetragen); der Feed bei kurzen Sätzen: „gleichauf" statt „0 vor", Jubiläum ab dem 50. Satz, gewöhnliche Auszeichnungen ab der zehnten Vergabe | 77 |
| `blaetter` | Jede Ansicht, jedes Blatt und jede Story der Testliga einmal geöffnet: kein „undefined", „NaN", „[object" oder kaputter Grafikwert im sichtbaren Text (Reiter, Profile, Duos, Duelle, Sätze mit Elo-Analyse, Awards, Rekorde, Monatschroniken, Auszeichnungen, Saison-Rückblicke ohne gespeicherten Titel, Feed); die Erklärkarten stehen auch in einer laufenden Liga in jedem Reiter, ihr Kreuz ist groß und farbig, und eine geschlossene Karte kommt in keinem Reiter wieder; der Elo-Pegel gemessen auf dem schmalsten Telefon (Paare nebeneinander, Team A links, jede Säule an der Nulllinie in ihrer Richtung, nichts übereinander, auch mit ±12.345), und die Kante der Teamzeile ist ein Rand, kein Schatten | 17 |
| `archiv` | Saisonarchiv: abgeschlossene Monate werden archiviert, Meister und Team der Saison stimmen mit der Rechnung überein | 10 |
| `bewegung` | Bewegung der Oberfläche [§C43] im Browser: Öffnen, Wechsel, Aufbau, Kantenlicht | 31 |
| `kalender` | Kalendergrenzen in Berliner Zeit: Woche über den Jahreswechsel, Zeitumstellung, Fortschritt im Monat | 7 |
| `prefix` | Präfixe und Reihenfolge der Quelldateien, Zusammensetzen ohne Kommentare | 82 |
| `ruheliga` | Karriereende [§C40]: wer im Ruhestand ist, steht in keinem Vergleich der aktiven Liga | 18 |
| `storyscroll` | Der Feed im Browser: Scrollen, Nachladen, Story-Detail | 20 |

Die Suiten im Browser (`bewegung`, `storyscroll`) brauchen Chromium
(`npm install --no-save playwright-core`, danach
`npx playwright-core install chromium-headless-shell`). Ohne Browser steigen
sie mit Code 2 aus und gelten als übersprungen.

## Im Umbau: `tests/umbau/`

Fünfzehn Suiten stammen aus der Kicker-Liga und rechnen noch mit deren
Daten — Tore bis zehn, Sturm und Abwehr, die echten Partien der Kicker-
Liga als Fixture (`matches.txt`) und Schwellen, die an ihnen geeicht sind.
`tests/run.mjs` führt sie nicht aus. Sie werden einzeln auf die Testliga
(`tests/fixture.js`) und die Padel-Regeln umgestellt und dann zurück nach
`tests/` gelegt, mit einer Zeile in der Tabelle oben:

`aktualisierung`, `ambient`, `backup`, `bedienung`, `blatt`, `disziplinen`,
`eingabe`, `leistung`, `mobil`, `rechnen`, `ruhestand`, `start`, `tafel`,
`wiederholung`, `zeichen`.

Bis dahin prüft `node tools/rauchtest.cjs` jede Ansicht und die wichtigsten
Blätter mit der Testliga auf Fehler beim Zeichnen.

## Die Testliga

Es gibt noch keine echten Padel-Partien. `node tools/fixture-padel.mjs`
erzeugt mit festem Startwert eine Liga, wie die Gruppe spielt: rund fünf
Spieltage im Monat, drei bis fünf Partien am Tag, wechselnde Formate (ein
Satz und Teamwechsel, zwei oder drei Sätze mit Match-Tiebreak, lange
Sessions bis 3:0). `tests/fixture.js` lädt sie für Suiten und Werkzeuge.
Sobald echte Partien da sind, werden die Schwellen an ihnen nachgeeicht
([docs/erweitern.md](../docs/erweitern.md)).
