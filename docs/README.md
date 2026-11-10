# Inhaltsverzeichnis der Dokumentation

Erzeugt von `node tools/doku.mjs` aus den Dateien selbst — nicht von Hand
bearbeiten. Wächter 8 vergleicht es mit dem Erzeugten; ist es rot, hat
sich eine Datei geändert, und der Aufruf zieht es nach.

| Datei | worum es geht |
|---|---|
| [README.md](../README.md) — Kicker-Liga | Eine App für eine 2-gegen-2-Tischkicker-Liga: Elo, Saisons, Auszeichnungen, Liga-Rekorde, Monatschronik, Insignien und ein Nachrichten-Feed. |
| [CLAUDE.md](../CLAUDE.md) — Kicker-Liga — Arbeitsanweisung | Deutschsprachige Einzeldatei-PWA für eine 2-gegen-2-Tischkicker-Liga: Elo, Saisons, Awards, Rekorde, Chronik, News. |
| [docs/anker.md](anker.md) — Abschnitte im Code | Jede Datei in `src/` mit den Bannern, die sie trägt, in der Reihenfolge des Baus. |
| [docs/architektur.md](architektur.md) — Herleitung | Die Liga ist ein Dutzend Leute und ein Tischkicker. |
| [docs/befunde.md](befunde.md) — Bewusst behaltene Doppelungen und Abweichungen | Was beim Aufräumen gefunden und absichtlich NICHT vereinheitlicht wurde, mit dem Grund. |
| [docs/erweitern.md](erweitern.md) — Etwas hinzufügen — und was daran hängt | Auszeichnungen, Monatswertungen und Liga-Rekorde sind nicht nur Listen. |
| [docs/laufzeit.md](laufzeit.md) — Laufzeit: Zustand, Caching, Takt | Was die App zur Laufzeit festhält, wie lange und wann sie es verwirft. |
| [docs/leistung.md](leistung.md) — Performance und Cache-Gültigkeit | Wie die App gemessen wird und was die Messungen in vier Runden ergeben haben. |
| [tests/README.md](../tests/README.md) — Die Testsuiten | Geprüft wird immer das **gebaute** Ergebnis (`dist/index.html`), nie die Quelle: nur so fällt auch ein Fehler auf, der erst beim Zusammensetzen entsteht. |
| [tools/README.md](../tools/README.md) — Werkzeuge | Alle laufen mit Node ohne Abhängigkeiten; die mit Browser nehmen den vorhandenen Chromium (`tests/browser.js`). |
| [mockup/README.md](../mockup/README.md) — Entwürfe (mockup/) | Eigenständige Seiten ohne Bauablauf, Vorlage für einen Umbau — kein Teil der App. |
| [datenbank/README.md](../datenbank/README.md) — Datenbank | SQL, das der Betreiber selbst im Supabase-Editor ausführt. |

## Gestaltungsgesetze

Ein Kürzel `§Cnn` im Code verweist auf eine dieser Dateien (ab 25) oder
auf einen Abschnitt des CSS (bis 24, siehe `anker.md`).

| Gesetz | Regel in einem Satz |
|---|---|
| [§C25 Farbgesetz](gesetze/C25-farbgesetz.md) | Status- und Wertfarben haben vier Rollen: Rangfarbe heißt „ich", Gold heißt Titel oder heute gehaltener Rekord, Grün und Rot zeigen ausschließlich eine Richtung, alles Übrige ist Metall. - Der Feed trägt daneben eine … |
| [§C26 Das Zeichen](gesetze/C26-das-zeichen.md) | Sterne zählen Ligatitel: höchstens fünf, dann die Zahl — unter dem Avatar in der Liste (`_znSterneSvg`) wie über dem Zeichen mit Band (`_insSterne`). |
| [§C27 Ein Bauteil, überall dasselbe](gesetze/C27-ein-bauteil.md) | Derselbe Spieler sieht überall gleich aus, und dieselbe Aussage hat ein Bauteil: Wappen `.rav` (`insAvWrap`), Podest `.podest`/`.pod-karte` (`_chronPodestHtml`, Platz aus dem Wert, `_chronPlatz`), Segmentwähler `.ui-s… |
| [§C28 Die Nebenwertungen](gesetze/C28-nebenwertungen.md) | Über der Liga-Tabelle steht in jedem Zeitraum an derselben Stelle ein Band der Nebenwertungen: eine breite Karte, dann kleine Kacheln. |
| [§C29 Zwei Ranglisten über denselben Zeitraum](gesetze/C29-zwei-ranglisten.md) | Spieler und Duos einer Saison sind zwei Ranglisten desselben Zeitraums: ein Reiter (`ligaSicht`) wechselt sie, keine zweite Seite. |
| [§C30 Sieben Stufen, sieben Gegenstände — gezeichnet nach der Vorlage](gesetze/C30-insignium.md) | Sieben Stufen (`INSIGNIEN`): Reif ab 0, Schildring ab 600, Volutenkranz ab 1200, Zierkranz ab 2100, Lorbeerreif ab 3100, Kronenreif ab 4500, Ordensstern ab 6000 Prestige. |
| [§C31 Drei Rückblicke, ein Baukasten](gesetze/C31-rueckblicke.md) | Saison-, Wochen- und Tagesrückblick bauen aus denselben Teilen (`rcpKopfHtml`, `rcpHeldHtml`, `rcpZahlenHtml`, `rcpKachelHtml`, `rcpZeileHtml`, `rcpNotizHtml`, `rcpAbschnitt`, `rcpKalenderHtml`, `rcpFeldHtml`) und aus… |
| [§C32 Ein Chronik-Eintrag gehört dem, der ihn hält](gesetze/C32-chronik-eintrag.md) | Ein Monatseintrag gehört dem, der den Bestwert in diesem Monat hält, oder niemandem; punktgleich tragen ihn alle. - Die Matrix zeigt je Spieler und Monat einen Eintrag (`seasonTitleOf`, `chronikEintragVon`: der wertvo… |
| [§C33 Im Feed hat jeder ein Gesicht](gesetze/C33-feed.md) | **Snapshot-Vertrag, er geht allem anderen vor:** eine veröffentlichte Zeile in `stories` bleibt in ID, Text, Zeitpunkt, Priorität, Beteiligten und Bild unverändert; weder gleicher Wortlaut noch spätere Stände noch ein… |
| [§C34 Drei belegbare Quellen, kein versteckter Leistungswert](gesetze/C34-prestige.md) | Prestige kommt ausschließlich aus Auszeichnungen, Monatschroniken und aktuell gehaltenen Liga-Rekorden. |
| [§C35 Nicht jeder Eintrag darf am Können hängen](gesetze/C35-rekorde.md) | Zweiundsechzig Liga-Rekorde in fünf Kammern (8 Bestmarken, 16 Können, 6 Aktuelle Form, 17 Fügungen, 15 Schattenseiten), in dieser Reihenfolge in Leiste und Liste (`CHRON_KINDS.ord`). |
| [§C36 Die Titel sind Licht](gesetze/C36-titel-aura.md) | Die Meistertitel sind eine Aura hinter Avatar und Insignium (`AURA_STUFEN`): zehn Stufen, je Titel eine, danach zählen die Sterne weiter [§C26]. - Maß aus dem Entwurf: die Aura ist 1/0,7 so breit wie das Zeichen (`AUR… |
| [§C37 Ein Anteil misst gegen die Menge, um die es geht](gesetze/C37-anteile.md) | Ein Anteil misst gegen die Teilmenge, um die es geht, nicht gegen alle Partien: enge Partien beim Pechvogel und Clutch-Player (`agg.clutch`), enge Partien des Duos bei den Glückspilzen, die Pleiten beim Zirkus, die Au… |
| [§C38 Die Chronik gehört nicht nur den besten Drei](gesetze/C38-chronik-mitte.md) | Ein Monatseintrag für die Mitte des Feldes misst den Abstand zum eigenen Niveau, nicht das Niveau: „Auf Augenhöhe", „Die Steigerung", „Der Staffellauf", „Das Seitenbündnis" (beide über `_stUebergaenge`), „Der Quertrei… |
| [§C39 Die Monatschronik fragt nicht, wer der Beste ist](gesetze/C39-monatschronik.md) | Die Monatschronik fragt nach Abweichung von der Erwartung, Konstanz, dem Verhältnis zum Ligamittel desselben Monats, zu einem bestimmten anderen Spieler, zum eigenen Spiel (vorne gegen hinten, neben neuen Partnern, in… |
| [§C40 Das Karriereende: vier Regeln, mehr gibt es nicht](gesetze/C40-karriereende.md) | Gespeichert werden nur der Zeitpunkt (`players.retired_at`) und der Stand des Profils (`players.retired_stand`); alles andere folgt aus vier Regeln. - 1. Ein Zeitraum (Tag, Woche, Monat) fragt `sichtbar`: wer darin ge… |
| [§C41 Ein Zeichen, eine Bedeutung](gesetze/C41-ein-zeichen.md) | Jedes Zeichen im Katalog (`ICONS`, `02-icons.js`) trägt genau eine Bedeutung. |
| [§C42 Der Start zeigt den letzten Stand und schreibt nie](gesetze/C42-start.md) | Nach jedem Live-Abruf liegt der Stand auf dem Gerät (`_standSchreiben`, IndexedDB `kicker-stand`): die vier Antworten der Datenbank, wie sie kamen, der Story-Bestand und ein Fingerabdruck (`_standHash`). |
| [§C43 Bewegung: nie warten, von selbst enden, nur, was man sieht](gesetze/C43-bewegung.md) | **Die Oberfläche steht im ersten Bild.** Kopfleiste und Zeichen sind festes Markup in `src/index.html` und nicht bis zum ersten Skriptbefehl versteckt; das Zeichen ist ein Bild von 252 px in der Seite (`01-shell.css`)… |
| [§C44 Das Positionsprofil: wo jemand spielt und wo er besser ist](gesetze/C44-positionsprofil.md) | Das Positionsprofil ist eine Zahl zwischen 5 und 95 % Sturm (`positionsLage`, `positionsProfilWert`). |
| [Allgemeine Gestaltungsregeln](gesetze/allgemein.md) | Detail folgt der Größe: unter 26 px weder Sterne noch Feuer, unter 48 px kein Wappen (`znWrap`, `insAvWrap`). - Ein Duo hat keinen Rang und kein Wappen: zwei überlappende Chips. - Nichts sagt zweimal dasselbe — keine … |
