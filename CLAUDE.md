# Kicker-Liga — Arbeitsanweisung

Deutschsprachige Einzeldatei-PWA für eine 2-gegen-2-Tischkicker-Liga:
Elo, Saisons, Awards, Rekorde, Chronik, News. Backend ist Supabase,
ausgeliefert wird **eine** `index.html` über GitHub Pages, daneben ihr
Service Worker `sw.js` [§C42].

> **Diese Datei ist Teil des Codes, nicht Begleitmaterial.**
> Wer die Struktur, den Ablauf oder eine Regel ändert, ändert sie hier im
> **selben Commit** mit. Wie genau, steht ganz unten unter
> [Pflege dieser Datei](#pflege-dieser-datei) — der Abschnitt ist
> verbindlich, nicht optional.

---

## 1. Der Bauablauf

`index.html` und `sw.js` im Wurzelverzeichnis sind **Build-Ergebnis**, nicht
Quelle. Niemals direkt bearbeiten.

```
1. in src/ ändern
2. node tools/build.mjs            → dist/index.html, dist/sw.js
3. cp dist/index.html dist/sw.js .  ← wird am häufigsten vergessen
4. node tools/check.mjs            → acht Wächter, alle müssen grün sein
5. node tests/run.mjs              → alle Suiten müssen grün sein
6. committen, MIT index.html und sw.js → git status --short index.html sw.js muss leer sein
```

Wächter 1 heißt „index.html entspricht src/" und schlägt genau dann an,
wenn Schritt 3 fehlt. Wer ihn rot sieht, hat fast immer nur das `cp`
vergessen — nicht die Quelle kaputtgemacht.

**Die Version wird nicht von Hand gepflegt.** `build.mjs` vergibt sie: ein
Datum und dahinter ein Hash über genau den ausgelieferten Inhalt. Sie ändert
sich, wenn sich die Auslieferung ändert, und sonst nie — zweimal bauen ergibt
dieselbe Nummer, auf jedem Betriebssystem. Zeilenenden zählen dafür nicht mit:
der Arbeitsbaum unter Windows trägt CRLF, Repository und Prüf-Job tragen LF, und
derselbe Inhalt ergab damit zwei Nummern — Wächter 5 war auf dem Rechner grün
und im Job rot. Von Hand gepflegt stand sie sechs Veröffentlichungen lang
still, und `checkForUpdate` verglich damit die Version einer Seite mit sich
selbst: kein Gerät erfuhr je von einer neuen Fassung. Wächter 5 prüft das
nach. Wer sie doch einmal setzen muss, tut es über `BUILD_STAMP=…`.

**Die Kommentare bleiben in `src/`.** `build.mjs` entfernt sie beim
Zusammensetzen — JavaScript, CSS und die HTML-Kommentare des Gerüsts. Sie
waren 38 % des JavaScripts, und jedes Telefon lud und parste sie bei jedem
Start: gemessen 649 statt 326 Kilobyte über die Leitung und rund 20 % mehr
Zeit zum Kompilieren. Entfernt wird mit einem kleinen Lexer, weil `//` auch in
Adressen und `/*` in regulären Ausdrücken steht; der Bau parst das Ergebnis,
bevor er es schreibt, und `tests/tafel` sieht nach, dass keiner übrig ist.
Wer einen Fehler im ausgelieferten Code sucht, liest ihn deshalb in `src/` —
in `dist/` fehlt das Warum.

**`index.html` gehört in denselben Commit wie seine Quelle.** Der Prüf-Job
baut aus dem Commit und vergleicht mit dem `index.html` des Commits, nicht
mit dem Arbeitsverzeichnis: lokal ist alles grün, solange die frisch gebaute
Datei dort liegt, und im Job schlägt Wächter 1 an. Genau das ist einem
Commit passiert, der `git add` nur für `src`, `tests` und `docs` rief. Die
Nachricht ist deutsch (§7).

Ein Durchlauf ohne Schritt 4 und 5 gilt als nicht erledigt. Kein Commit
mit rotem Wächter oder roter Suite.

---

## 2. Aufbau des Repositories

```
src/index.html        Gerüst mit den Platzhaltern /*@@CSS*/ und /*@@JS*/
src/sw.js             der Service Worker; build.mjs setzt seine Fassung [§C42]
src/css/              18 Dateien
src/js/               62 Dateien
tools/build.mjs       hängt src/css/* und src/js/* ALPHABETISCH aneinander,
                      ohne Kommentare
tools/check.mjs       acht Wächter
tools/doku.mjs        erzeugt docs/README.md und docs/anker.md
tools/golden.mjs      Vergleich zweier Fassungen: jede Rechnung und Ansicht
                      gegen einen früheren Stand (Umbau ohne sichtbare Folgen)
tools/performance.cjs Messung und das Gerüst für Chromium (createHarness)
tools/interaktion.cjs Messung der Bedienung
tests/run.mjs         Testläufer, jede Suite ein eigener Prozess
tests/ziel.js         entscheidet, welche Datei geprüft wird (dist vor Wurzel)
tests/runtime.js      die App ohne Browser, für reine Rechentests
tests/browser.js      findet Chromium oder meldet, dass keins da ist
tests/fixtures/       die echten Partien der Liga, gepackt
index.html            das ausgelieferte Ergebnis, mitversioniert
sw.js                 sein Service Worker, ebenso gebaut und mitversioniert
mockup/               Entwürfe ohne Bauablauf, kein Teil der App —
                      Übersicht in mockup/README.md
datenbank/            SQL, das der Betreiber selbst ausführt — die App ändert
                      kein Schema. karriereende.sql legt players.retired_at
                      und players.retired_stand an [§C40]; fehlt eine
                      Spalte, sagt der Knopf das
README.md             Einstieg: was die App ist, wie man sie baut
CLAUDE.md             diese Arbeitsanweisung
docs/                 Herleitung, Laufzeit, Gesetze, Leistung, Erweitern —
                      Inhaltsverzeichnis in docs/README.md (erzeugt)
icon.png              Symbol der App; build.mjs kopiert es nach dist/
.github/workflows/    pages.yml — Prüf-Job, Veröffentlichung schaltbar
```

> **Pflegepflicht.** Kommt eine Datei in `src/` dazu, fällt eine weg oder
> wird eine umbenannt, wird dieser Baum und — falls die Datei eine eigene
> Aufgabe hat — die Landkarte in §3 im selben Commit nachgezogen.

### Warum Aneinanderhängen und kein Bundler

Die gesamte Logik ist **eine IIFE**. Kein `import`, kein `export`, nichts
liegt auf `window`. Innerhalb dieser IIFE greifen hunderte Bezeichner quer
durcheinander, ohne jede Deklaration von Abhängigkeiten.

Daraus folgen drei harte Regeln:

1. **Die Zahlen-Präfixe der Dateinamen sind die Reihenfolge.** Wer eine
   Datei umbenennt, verschiebt Code. Neue Dateien bekommen ein Präfix, das
   sie an die richtige Stelle sortiert (`09c-`, `17b-`, `35b-` sind
   Nachzügler zwischen zwei bestehenden Nummern).
2. **Auch die CSS-Reihenfolge trägt Bedeutung.** Später geladene Regeln
   gewinnen bei gleicher Spezifität — `02-ranking.css` muss vor
   `12-insignium.css` stehen, sonst kippt das Wappen in der Ranglistenzeile.
3. **Ein Bezeichner darf nur einmal auf oberster Ebene stehen.** Getrennte
   Dateien sehen unabhängig aus, teilen sich nach dem Zusammensetzen aber
   einen Gültigkeitsbereich. Wächter 4 zählt sie (aktuell **1572**) — und schlägt auch an, wenn einer
   davon nirgends mehr gerufen wird.

---

## 3. Landkarte

Die Banner im Code (`[§C6]`, `[§11.7]`, `[§4.1b]`) sagen, wozu ein Block da
ist. Der Dateiname sagt, wo er liegt.

Die Tabelle nennt **jede** Datei aus `src/js/` genau einmal. Das ist keine
Ordnungsliebe: Wächter 6 zählt nach, und eine Datei ohne Zeile hier ist eine
Datei, deren Aufgabe niemand aufgeschrieben hat.

| Bereich | Dateien |
|---|---|
| Rahmen, Zustand, Daten | `00-prolog` (Konstanten, Supabase-Client) · `01-update` (Version, Update-Banner, **aller Zustand**) · `04-cache` · `06-db` (Laden, Speichern, Saison-Rückblick) · `06b-ruhestand` (Karriereende: `ligaAktiv`, `sichtbar`, der eingefrorene Stand) · `06c-stand` (der letzte Stand des Geräts, Schnellstart) · `37-boot` |
| Rechnen | `03-saison` · `05-rang-elo` (Ränge, `posWert`, das Positionsprofil `positionsLage` [§C44], Metrikleiste) · `08-stats` · `10-elo-engine` |
| Ansichten | `11-view-ranking` · `12-view-positionen` · `13-view-awards` · `15-views-rest` (Teams, Verlauf, Einstellungen) · `15b-einblick` (Rollen-Landkarte, Netz der Duos, als Zeile, die aufklappt) · `18-profil` · `18a-badge-popover` (eine Auszeichnung im Detail, aus jedem Blatt: wann und wo sie kam, `_bpBinden`) · `22-team-profil` |
| Blätter (Sheets) | `14-top5-listen` · `16-sheet-infra` (Öffnen, Stapel, Wischgeste) · `19-bilanzen` · `21-head-to-head` |
| Rückblicke | `05b-recap-teile` (Baukasten) · `07-positionsverlauf` (Positionsverlauf) · `07b-rueckblick` (Woche, Tag) · `18b-abschied` (der Abschied eines Ruheständlers, Bühne für Blatt und Story) |
| Zeichen und Wappen | `02-icons` (SVG-Katalog, `lossStreakInline`) · `09c-zeichen` (Feuer, Sterne, `avHtml`) · `17-badges` · `17b-fingerabdruck` · `35a-insignium-zeichen` (die 21 Zeichnungen der Leiter, `insBild`) · `35b-prestige` (Insignium, Laufbahn) · `35c-titel-aura` (die Aura der Meistertitel, `auraHref`) |
| News | `26-news-konstanten` (Kategorien, Limits) · `26b-story-fakten` (ein Stand der Liga, der Spieltag als Paar aus Vorher und Nachher, die Punktewirkung, was der Schluss eines Zeitraums als Grund eines Zeichens vergibt, die Bewegungen auf der Leiter, das Tor vor der Rangliste) · `26c-news-bausteine` (Rekorde aller Zeiten, Meilensteinleitern, Aufzählungen) · `27-news-generator` (Ereignisse, Ewige Tafel) · `28-news-ambient` · `29-news-cache` (Konsolidierung, Entzerrung) · `29b-news-sync` (Realtime, Autosync) · `29c-news-worker` (der Generator im Worker, mit demselben Code) · `30-news-ui` (Feed, `_isBreaking`) · `30a-news-karte` (die Bausteine einer Karte) · `30b-news-spieltag` (Kopf und Fuß einer Partie nach ihrem Anlass, die Runde der Vier) · `30c-news-fakt` (das Bild eines Fun Facts nach seinem Anlass) · `30d-news-insignium` (die Insignium-Karte des Tages: Sätze, Bühne, Blatt) · `30e-news-ehrung` (die Ehrung: alles, was ein Tag an Auszeichnungen brachte, je Spieler mit Prestige, unter dem Spieler des Tages oder als Karte des Tages; alles einer Woche und eines Monats knapp unter deren Karte; die größere Ehrung trägt den Tag) · `31-news-detail` (Kopf und Fuß eines Story-Blatts) · `31a-news-detail-mitte` (die Mitte je Typ) · `31b-news-detail-helfer` |
| Chronik | `32-chronik-katalog` (`DISZIPLINEN`) · `33-chronik-engine` (Monat) · `34-chronik-rekorde` (Allzeit, `CHRON_KINDS`, `chronicleRang`, `rekordZaehlung`) · `35-chronik-ui` |
| Bedienung | `09-ui-infra` · `09d-bewegung` (Öffnen, Gerüst, Kantenlicht, Aufbau, Podest-Licht, Wechsel, Vorstellung der Rückblicke [§C43]) · `20-bind` · `23-match-edit` · `24-lock` · `25-helpers` · `36-backup` |

Bewusst **keine** Zeilenzahlen hier: die veralten bei jeder Änderung.
`wc -l src/js/* src/css/*` beantwortet das in einer Sekunde.

### CSS

Die Reihenfolge trägt Bedeutung (später geladene Regeln gewinnen). Die Spalte
„Abschnitt" erklärt die Kürzel `§C0` bis `§C24`: sie sind die Banner im CSS,
und Wächter 7 liest sie hier.

| Datei | Abschnitt | Inhalt |
|---|---|---|
| `00-tokens.css` | §C0 | Variablen & Reset (--bg, --acid, Fonts) |
| `01-shell.css` | §C1–C3 | App-Shell, Content, Stat-Strip |
| `02-ranking.css` | §C4–C6 | Segmented Control, Rank-List, Saison |
| `03-match.css` | §C7 | Match-Builder |
| `04-awards.css` | §C8–C9 | Trophäen-Cards, Award-Detail-Sheet |
| `05-nav-sheet.css` | §C10–C14 | History, Modal, Bottom-Nav, FAB, Toast |
| `06-misc.css` | §C15 | Empty-State, kleine Helpers |
| `07-icons-profil.css` | §C16 | SVG-Icons, Spieler-Profil-Layout |
| `08-highlights.css` | §C17–C19 | Zusatzstyles, POTD/POTW, Hall of Fame |
| `09-recap.css` | §C20 | Season-Recap-Vollbild |
| `10-award-sheet.css` | §C21 | Winner-Hero + Positionsverlauf |
| `11-chronik.css` | §C22 | Saison-Titel & Chronik |
| `12-insignium.css` | §C23 | Insignium, Titelband, Laufbahn |
| `13-fingerabdruck.css` | §C24 | Sechs-Achsen-Profil |
| `14-farbgesetz.css` | §C25 | Eine Seite, eine Farbe |
| `15-zeichen.css` | §C26 | Sterne unten, Feuer hinten |
| `16-spieltag.css` | §C33 | Karten „Am Spieltag" und die Runde der Vier |
| `17-bewegung.css` | §C43 | Gerüst, Kantenlicht, Aufbau |

### Zustand, Caching und Takt

Wo der veränderliche Zustand der Oberfläche steht und wann er zurückgesetzt
wird, nach welcher Regel jeder Cache-Topf seinen Schlüssel bildet und
welche Zeitgeber laufen, steht in [docs/laufzeit.md](docs/laufzeit.md).
Wer eine Zustandsvariable, einen Topf oder einen Zeitgeber dazubaut, trägt
ihn dort ein — im selben Commit.

---

## 4. Die Wächter

| Wächter | fängt ab |
|---|---|
| 1 Drift | `index.html` oder `sw.js` wurde direkt bearbeitet statt `src/` (oder nicht kopiert) |
| 2 Parser | Syntaxfehler an einer Dateigrenze — sonst erst im Browser sichtbar |
| 3 CSS-Klammern | eine offene `{` am Dateiende frisst still die nächste Datei |
| 4 Bezeichner | derselbe Name auf oberster Ebene in zwei Dateien — **oder** ein Name, den niemand mehr ruft |
| 5 Fingerabdruck | die Auslieferung trägt eine Version, die nicht zu ihrem Inhalt gehört, oder `sw.js` eine andere Fassung als die Seite — dann erfährt kein Gerät von einer neuen Fassung |
| 6 Arbeitsanweisung | diese Datei, die Landkarte (JS und CSS), der Baum oder die Tabelle der Suiten in `tests/README.md` nennen eine Datei nicht, die es gibt, eine, die es nicht gibt, oder eine Zahl, die nicht stimmt |
| 7 Verweise | ein Kürzel `§Cnn`, ein Link oder ein Pfad in der Doku zeigt auf etwas, das es nicht gibt, ein Gesetz wird nirgends im Code zitiert, eine Abschnittsnummer `§n.m` steht zweimal im Code, ein Zitat `[§n.m]` zeigt auf keinen Abschnitt, oder einem Gesetz fehlt `## Regel`, `## Stellen` oder eine `## Prüfung`, die eine bestehende Suite nennt |
| 8 Verzeichnisse | `docs/README.md` oder `docs/anker.md` sind nicht mehr das, was `node tools/doku.mjs` aus den Dateien erzeugt |

Wächter 6 bis 8 machen die Pflegepflichten dieser Datei prüfbar: Landkarte,
Dateizahlen, Bezeichnerzahl und die Liste der Suiten. Die Zahl der **Checks**
je Suite zählt `tests/run.mjs` nach, weil nur er sie kennt. Ein rotes
Ergebnis dieser Art nennt die richtige Zahl — sie wird übernommen, nicht
weggeklickt.

---

## 5. Die Testsuiten

Geprüft wird immer das **gebaute** Ergebnis (`dist/index.html`), nie die
Quelle: nur so fällt auch ein Fehler auf, der erst beim Zusammensetzen
entsteht. Jede Suite ist ein eigener Prozess, weil die App eine IIFE mit
globalem Zustand ist.

Welche Suiten es gibt, was jede prüft und wie viele Checks sie zählt,
steht in [tests/README.md](tests/README.md). Wächter 6 verlangt dort eine
Zeile je Suite, `tests/run.mjs` zählt die Checks nach. Wie ein Umbau
beweist, dass er nichts ändert (`tools/golden.mjs`), steht ebenfalls dort.

### Wie geprüft wird

- **Geometrische Behauptungen werden gemessen, nicht geschätzt.** „Steht
  nicht über", „ist sichtbar", „liegt innerhalb" gehören in `zeichen` und
  werden dort am gerenderten Markup mit Playwright nachgemessen.
- **Jede neue Zusicherung wird einmal gegengeprüft:** den alten Wert kurz
  wiederherstellen, den Test fallen sehen, zurücknehmen. Ein Test, der noch
  nie rot war, prüft nichts.
- Die Fixtures sind die **echten** Partien der Liga. Schwellen, die auf
  erfundenen Zahlen kalibriert sind, sagen nichts.
- Ändert sich absichtliches Verhalten, wird die Zusicherung an die neue
  Absicht angepasst — nicht das Verhalten an den alten Test.

---

## 6. Gestaltungsgesetze

Diese Regeln stehen als Kommentar im Code und werden dort mit ihrem Kürzel
zitiert. Sie sind nicht Geschmack, sondern Absprache. Jedes Gesetz steht in
einer eigenen Datei unter `docs/gesetze/`; wer eine Ansicht, eine Story oder
eine Wertung anfasst, liest vorher das Gesetz, das sie zitiert.

Jede Gesetzesdatei beginnt mit **Regel**, **Stellen** und **Prüfung** — das
reicht zum Arbeiten. Darunter steht die **Herleitung**: wie es dazu kam und
was vorher falsch war. Sie wird gelesen, wenn eine Regel im Weg zu stehen
scheint, denn dort steht der Fehler, den sie verhindert. Eine geänderte
Regel ändert die Zeile oben und, wo nötig, die Herleitung; Wächter 7 hält
die drei Abschnitte und die genannte Suite fest.

| Kürzel | Gesetz |
|---|---|
| [§C25](docs/gesetze/C25-farbgesetz.md) | Farbgesetz |
| [§C26](docs/gesetze/C26-das-zeichen.md) | Das Zeichen |
| [§C27](docs/gesetze/C27-ein-bauteil.md) | Ein Bauteil, überall dasselbe |
| [§C28](docs/gesetze/C28-nebenwertungen.md) | Die Nebenwertungen |
| [§C29](docs/gesetze/C29-zwei-ranglisten.md) | Zwei Ranglisten über denselben Zeitraum |
| [§C30](docs/gesetze/C30-insignium.md) | Sieben Stufen, sieben Gegenstände — gezeichnet nach der Vorlage |
| [§C31](docs/gesetze/C31-rueckblicke.md) | Drei Rückblicke, ein Baukasten |
| [§C32](docs/gesetze/C32-chronik-eintrag.md) | Ein Chronik-Eintrag gehört dem, der ihn hält |
| [§C33](docs/gesetze/C33-feed.md) | Im Feed hat jeder ein Gesicht |
| [§C34](docs/gesetze/C34-prestige.md) | Drei belegbare Quellen, kein versteckter Leistungswert |
| [§C35](docs/gesetze/C35-rekorde.md) | Nicht jeder Eintrag darf am Können hängen |
| [§C36](docs/gesetze/C36-titel-aura.md) | Die Titel sind Licht |
| [§C37](docs/gesetze/C37-anteile.md) | Ein Anteil misst gegen die Menge, um die es geht |
| [§C38](docs/gesetze/C38-chronik-mitte.md) | Die Chronik gehört nicht nur den besten Drei |
| [§C39](docs/gesetze/C39-monatschronik.md) | Die Monatschronik fragt nicht, wer der Beste ist |
| [§C40](docs/gesetze/C40-karriereende.md) | Das Karriereende: vier Regeln, mehr gibt es nicht |
| [§C41](docs/gesetze/C41-ein-zeichen.md) | Ein Zeichen, eine Bedeutung |
| [§C42](docs/gesetze/C42-start.md) | Der Start zeigt den letzten Stand und schreibt nie (Stand des Geräts, Service Worker, nur die Uhr der Liga schreibt, nur aus den Partien von eben, eine neue Fassung lädt von selbst in Ruhe) |
| [§C43](docs/gesetze/C43-bewegung.md) | Bewegung: nie warten, von selbst enden, nur, was man sieht (Öffnen, Wechsel, Aufbau, Kantenlicht) |
| [§C44](docs/gesetze/C44-positionsprofil.md) | Das Positionsprofil: wo jemand spielt und wo er besser ist (eine Rechnung für Profil, Rollen, Elo-Positionsbonus, „Der Wandler" und Durchwechseln) |

Dazu die [allgemeinen Regeln](docs/gesetze/allgemein.md) ohne Kürzel: Detail folgt
der Größe, ein Duo hat keinen Rang, nichts sagt zweimal dasselbe, keine
persönliche Ansprache, eine Schrift hat einen Rückfall, dieselbe Sache hat
einen Namen, keine Possessivpronomen über einen Spieler, kein „Abend", ein
leeres Feld liest sich als Fehler, ein Blatt zeigt alles.

Kürzel `§C0` bis `§C24` sind Abschnitte des CSS (CSS-Landkarte in §3),
Kürzel wie `§5.2` Abschnitte im Code; beide stehen in
[docs/anker.md](docs/anker.md).

> **Pflegepflicht.** Wird ein Gesetz ergänzt, geändert oder aufgehoben,
> steht das hier — und der Kommentar im Code, der es zitiert, wird
> mitgezogen. Ein Kürzel, das nur noch an einer Stelle steht, ist tot.

---

## 7. Sprache, Ton, Commits

- Oberfläche, Kommentare und Commit-Nachrichten auf **Deutsch**.
- Kommentare erklären das **Warum** und benennen den Fehler, den sie
  verhindern — nicht, was die Zeile tut. Vorbild ist der Bestand.
- Nüchterner Ton, keine Ausrufezeichen, keine Werbesprache.
- Commit-Betreff ist ein Satz, der die Absicht nennt, nicht die Dateiliste
  („Das Feuer soll man sehen", nicht „update css").
- Im Fließtext des Commits steht, was vorher falsch war.
- **Kein Modellname** in Commit-Nachrichten, Code-Kommentaren, PR-Texten
  oder sonstigen Artefakten im Repository.
- **Die Oberfläche beschreibt nicht sich selbst.** Kein „Neu", kein
  „Überarbeitet", keine Begründung gegen eine frühere Rechnung, keine
  Entwicklersprache („Rohsicht", „Cache", „Projektion", „Savepoint", ein
  Paragraphenzeichen) und keine englische Aufschrift („Frischen Load",
  „Features", „checkt"). Warum eine Zeile so aussieht, gehört in einen
  Kommentar; auf dem Bildschirm steht, was die Zahl bedeutet. Der
  Rekorde-Reiter war nur die Stelle, an der es auffiel: dort trug jede der
  fünfundsechzig Karten eine Marke über die Fassung der App, und in den
  Erklärungen stand „sonst wäre eine Seite leichter zu halten als die
  andere". `tests/disziplinen` prüft jeden sichtbaren Text des Katalogs.
- Kein `node_modules/` und kein `package-lock.json` einchecken.

---

## 8. Vor dem Anfangen

1. `docs/architektur.md` lesen. Das Inhaltsverzeichnis aller Doku steht in
   `docs/README.md`, die Abschnitte jeder Code-Datei in `docs/anker.md`.
2. Die Datei, die du ändern willst, **ganz** lesen. Viele Kommentare halten
   Entscheidungen fest, die schon einmal rückgängig gemacht wurden.
3. Prüfen, ob es das Bauteil schon gibt (§C27), bevor du ein neues baust.
   Und das Gesetz lesen, das die Datei zitiert (`docs/gesetze/`): dort steht,
   was schon einmal falsch war.
4. `node tools/check.mjs` einmal laufen lassen, bevor du etwas änderst —
   dann weißt du, ob ein rotes Ergebnis von dir kommt.
5. **Für alles Neue das Karriereende entscheiden [§C40]**, bevor die erste
   Zeile steht: Story, Wertung, Rekord, Liste, Ansicht, Zähler. Entsteht
   es aus den eigenen Partien oder einem Zeitraum (Tag, Woche, Monat),
   fragt es `sichtbar`; vergleicht es über die Laufbahn mit der Liga von
   heute (Tafel, Prestige, Insignium, Rangstufe, Gesamt, Fun Fact), fragt
   es `ligaAktiv`. Eine rohe `.hidden`-Abfrage gibt es nicht, und nach dem
   Abschied nennt ihn keine Story außer der seines Karriereendes. Der Grund:
   jedes Mal, wenn diese Frage vergessen wurde, stand ein Ruheständler in
   einem Vergleich, den er nicht mehr spielt, oder verlor einen Monat, den
   er gespielt hatte.

---

## 9. Arbeit mit mehreren Agenten

Die App ist eine IIFE mit gemeinsamem Namensraum, und der Bauablauf schreibt
in zwei Dateien, die allen gehören. Parallele Arbeit ist deshalb möglich,
aber nur nach festen Regeln.

### 9.1 Rollen

- **Ein Koordinator.** Nur er committet, pusht, schreibt `CLAUDE.md`,
  `docs/` und führt den Bauablauf aus §1 aus.
- **Beliebig viele Zuarbeiter.** Sie lesen, suchen, messen, schlagen
  Änderungen vor und dürfen `src/`-Dateien bearbeiten, die ihnen **exklusiv**
  zugewiesen sind.

### 9.2 Was ein Zuarbeiter nie tut

- `tools/build.mjs` ausführen. Der Build schreibt `dist/index.html`; zwei
  gleichzeitige Läufe erzeugen eine Datei, die zu keinem Quellstand passt.
- `index.html` anfassen — auch nicht mit `cp`.
- `CLAUDE.md` oder etwas in `docs/` schreiben. Er **meldet** stattdessen
  seinen Änderungsvorschlag als Text an den Koordinator (siehe 9.5).
- Committen oder pushen.
- Eine Datei bearbeiten, die einem anderen Zuarbeiter zugewiesen ist.

### 9.3 Aufteilung, die funktioniert

Schneide Aufgaben **entlang der Dateigrenzen**, nicht entlang der Features —
ein Feature liegt fast immer in mehreren Dateien, und zwei Agenten in
derselben Datei erzeugen Konflikte, die niemand sieht, bis der Build läuft.

Vor dem Start nennt der Koordinator je Zuarbeiter ausdrücklich:
die Dateien, die er ändern darf; die Dateien, die er nur lesen darf; und die
Zusicherung, an der seine Arbeit gemessen wird.

Zwei Dinge lassen sich nicht aufteilen und bleiben beim Koordinator:
**neue Bezeichner auf oberster Ebene** (Wächter 4 sieht nur das Ganze) und
**Änderungen an der CSS-Reihenfolge**.

### 9.4 Zusammenführen

Der Koordinator führt nach jeder Runde den vollständigen Ablauf aus §1 aus.
Er ist der einzige, der weiß, ob das Ganze noch stimmt: ein Zuarbeiter kann
seine Datei für sich fehlerfrei halten und trotzdem einen Namen doppelt
vergeben oder eine Klammer offen lassen.

Bei Rot wird **nicht** der Test angepasst, sondern der Zuarbeiter mit dem
Befund zurückgeschickt.

### 9.5 Meldepflicht für diese Datei

Jeder Zuarbeiter beendet seinen Bericht mit einem der beiden Sätze:

- `CLAUDE.md: keine Änderung nötig.`
- `CLAUDE.md: <Abschnitt> — <was genau geändert werden muss>.`

Der Koordinator arbeitet diese Meldungen ab, **bevor** er committet. Ein
Bericht ohne einen dieser beiden Sätze gilt als unvollständig und wird
zurückgegeben.

## 10. Etwas hinzufügen — und was daran hängt

Auszeichnungen, Monatswertungen und Liga-Rekorde sind nicht nur Listen. Sie
bilden die **drei sichtbaren Quellen des Prestiges** [§C34], und das Prestige
ist die Insignium-Leiter. Wer einen
Eintrag hinzufügt oder streicht, verschiebt
damit, wer welches Zeichen trägt — auch dann, wenn er die Prestige-Datei gar
nicht geöffnet hat.

Die folgenden Listen nennen jede Stelle, die mitgeht. Sie sind vollständig:
was hier nicht steht, hängt auch nicht daran.

Diese Listen stehen in [docs/erweitern.md](docs/erweitern.md):
§10.1 eine Auszeichnung, §10.2 eine Disziplin (Monatswertung, Liga-Rekord
oder beides), §10.3 die Balance nachziehen. Wer etwas davon hinzufügt oder
streicht, arbeitet sie Zeile für Zeile ab.

---

## Pflege dieser Datei

Diese Datei ist die erste, die eine neue Sitzung liest; was sie nicht selbst
trägt, erreicht man über ihre Links. „Diese Datei" meint hier auch die
Dateien in `docs/` und `tests/README.md`. Was hier falsch
steht, wird geglaubt — eine veraltete Arbeitsanweisung ist schlimmer als
keine.

### Wann sie geändert wird

Immer im **selben Commit** wie die Änderung, die sie auslöst:

| Auslöser | zu ändern |
|---|---|
| Datei in `src/` kommt dazu, fällt weg, wird umbenannt | §2 Baum, §3 Landkarte (JS oder CSS), `node tools/doku.mjs` |
| Schritt im Bauablauf kommt dazu oder fällt weg | §1 |
| Wächter kommt dazu oder ändert seine Bedeutung | §4 |
| Datei in `src/js/` kommt dazu | §3 Landkarte — Wächter 6 besteht darauf |
| Testsuite kommt dazu; Zahl der Checks ändert sich | `tests/README.md` |
| Datei in `tools/` oder Hilfsdatei in `tests/` kommt dazu | §2 Baum — Wächter 6 besteht darauf |
| Banner im Code kommt dazu oder ändert sich | `node tools/doku.mjs` — Wächter 8 besteht darauf |
| Zahl der Bezeichner ändert sich | §2, letzter Absatz |
| Gestaltungsgesetz kommt dazu, ändert sich, fällt weg | seine Datei in `docs/gesetze/` (oben Regel, Stellen, Prüfung; darunter die Herleitung), der Index in §6 |
| Zustandsvariable kommt dazu oder ändert ihr Zurücksetzen | `docs/laufzeit.md` |
| Zeitgeber kommt dazu oder ändert seine Bedingung | `docs/laufzeit.md` |
| Cache-Topf kommt dazu | `docs/laufzeit.md` |
| Gemeinsames Bauteil kommt dazu (`.rav`, `.podest`, …) | `docs/gesetze/C27-ein-bauteil.md` |
| Zeichen kommt dazu, bekommt einen neuen Träger oder wird ersetzt | ein im ganzen Katalog freier Schlüssel mit eigener Bedeutung — oder der Träger meint dieselbe Sache und steht in `ZEICHEN_FAMILIEN` (`tests/disziplinen`); ein ersetzter Name kommt nach `ZEICHEN_ALT` [§C41] |
| Regel für Agenten ändert sich | §9 |
| Auszeichnung, Disziplin oder Prestige-Konstante ändert sich | `docs/erweitern.md` |
| Monatschronik kommt dazu oder ändert Art, Klasse oder Ausschlag | `docs/gesetze/C39-monatschronik.md`, `docs/erweitern.md` §10.2 |
| Ein Katalogfeld kommt dazu (`beiname`, `streu`, `zufall`, `offen`, `fenster`, `paar`, …) | `docs/erweitern.md` §10.1/§10.2 als eigene Zeile, **und** eine Zusicherung in `tests/disziplinen`, die es für jeden Eintrag verlangt — **und** bei einem Feld unter `allzeit` die Projektion `_chronRoh` in `34-chronik-rekorde.js`, bei einem unter `monat` die Projektion `SEASON_TITLES` in `32-chronik-katalog.js` oder das Lesen über `_chronikMonat`, sonst kommt das Feld nie an |
| Ein Liga-Rekord kommt dazu oder fällt weg | `docs/gesetze/C35-rekorde.md` (Zahl der Rekorde und Haltungen), `docs/erweitern.md` §10.2, §10.3 — und das Prestige verschiebt sich [§C34] |
| Eine Anweisung hier hat sich als falsch erwiesen | die Stelle selbst |

### Was zu einer Änderung immer dazugehört

Eine Änderung ist erst fertig, wenn sie an **allen vier** Stellen steht.
Fehlt eine, wird die Änderung beim nächsten Mal falsch fortgesetzt — und das
ist jedes Mal passiert, an dem in dieser Datei ein „vorher war es so" steht.

1. **Im Code**, als Kommentar, der den Fehler benennt, den er verhindert.
   Nicht was die Zeile tut, sondern warum sie so aussieht (§7).
2. **In dieser Datei**, an der Stelle, die die Regel trägt: das
   Gestaltungsgesetz in `docs/gesetze/`, die Pflichtliste in
   `docs/erweitern.md`, die Zahl in §2 oder `tests/README.md`. Neue Felder
   eines Katalogeintrags brauchen eine **eigene Zeile** in §10.1 oder §10.2 — sonst weiß niemand, dass sie zu füllen sind.
3. **In einer Zusicherung**, die die Regel prüfbar macht, und zwar so, dass
   sie einmal rot war (§5). Eine Regel ohne Test ist eine Bitte.
4. **Im Commit**, mit dem, was vorher falsch war (§7).

Was das im Einzelnen auslöst, steht in der Tabelle oben.

### Wie sie geändert wird

1. **Ersetzen, nicht anhängen.** Kein Änderungsjournal, keine „siehe auch
   neu"-Absätze. Wer eine Regel ändert, überschreibt die alte.
2. **Nur, was zutrifft.** Keine Absicht, keine Planung, keine Vermutung —
   nur der Stand, wie er jetzt ist. Was noch nicht gebaut ist, steht nicht
   hier.
3. **Nichts, was von selbst veraltet.** Keine Zeilenzahlen, keine
   Dateigrößen, keine Datumsangaben. Zahlen, die trotzdem hier stehen
   (Dateizahl, Bezeichnerzahl, Checks je Suite), stehen an genau einer
   Stelle und werden dort nachgezogen.
4. **Jede Regel nennt ihren Grund.** Eine Anweisung ohne Begründung wird
   beim nächsten Zweifel übergangen.
5. **Kürzen, wenn möglich.** Eine Regel, die nirgends mehr greift, wird
   gelöscht, nicht als „historisch" markiert.

### Prüfung vor dem Commit

Der Koordinator beantwortet drei Fragen, bevor er committet:

1. Stimmt jede Zahl in dieser Datei noch mit dem letzten Lauf von
   `tools/check.mjs` und `tests/run.mjs` überein?
2. Nennt §2 und §3 jede Datei, die es in `src/`, `tools/` und `tests/` gibt —
   und keine, die es nicht gibt? (Wächter 6 sagt es.)
3. Steht in dieser Datei eine Anweisung, die ich in diesem Commit
   umgangen habe? Dann war entweder der Commit falsch oder die Anweisung.
   Beides wird jetzt entschieden, nicht später.
