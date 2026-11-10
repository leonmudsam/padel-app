# §C42 Der Start zeigt den letzten Stand und schreibt nie

## Regel

- Nach jedem Live-Abruf liegt der Stand auf dem Gerät (`_standSchreiben`, IndexedDB `kicker-stand`): die vier Antworten der Datenbank, wie sie kamen, der Story-Bestand und ein Fingerabdruck (`_standHash`). Er gilt nur für dieselbe Fassung der App (`BUILD_VERSION`).
- Der erste Durchlauf von `loadAll` startet den Abruf und zeichnet währenddessen aus dem Stand (`_standZeigen`). Ist der Abruf schon da, entfällt der Stand.
- **Abgeleitetes schreibt nur ein Gerät mit der Uhr der Liga** (`ligaSchreibtAbgeleitet`, `LIGA_ZEITZONE`): Stories und Saison-Archiv rechnet jedes Gerät in Tagen und Monaten seiner eigenen Uhr. Veröffentlichen, aufräumen und archivieren darf nur ein Gerät, dessen Uhr dieselbe Wanduhr zeigt wie Europe/Berlin — jetzt und ein halbes Jahr davor und danach, also mit derselben Sommerzeit — und das kein automatisierter Browser ist (`navigator.webdriver`). Jedes andere rechnet und zeigt seine Stories nur sich selbst. Was ein Spieler selbst einträgt, gilt immer.
- **Stories nur aus den Partien von eben** (`_datenFrisch`, `_partienGeholt`, `DATEN_FRISCH_MS`): veröffentlicht werden Stories nur, wenn der letzte vollständige Abruf der Partien höchstens eine Minute zurückliegt — gezählt ab seinem Absenden. Der Takt der News (`_newsAutoSyncTick`) rechnet gar nicht mit einem älteren Stand: beim Zurückkommen aus dem Hintergrund wartet er auf den Abruf, den das Zurückkommen gestartet hat, und läuft keiner, weil ein Blatt offen ist, setzt er aus.
- **Das Nachholen eines abgebrochenen Nachschreibens** (`_nachholen`, Marke `kicker_nachrechnen`) [§3.1c] läuft nur nach einem Live-Abruf und nur mit der Uhr der Liga: es schreibt abgeleitete Deltas wie das Archiv.
- **Aus dem Stand wird nur gezeichnet, nie geschrieben.** Kein Archiv, keine Story, kein Karriereende, kein Rückblick, der von selbst aufgeht, keine Migration der Einstellungen: was veröffentlicht oder speichert, hängt am Live-Abruf. Bis er da ist, steht „verbinde…“.
- Der Live-Abruf mit demselben Fingerabdruck lässt Daten, Töpfe und DOM stehen (`_standGezeigt`); ein anderer ersetzt alles wie ohne Stand.
- Scheitert der Live-Abruf, bleibt der Stand stehen und ein Hinweis sagt es; die Fehlerkarte kommt nur ohne Stand.
- Dieselbe Liste leerer Töpfe gilt für Stand und Live-Abruf (`LADEN_TOEPFE`), dasselbe Einbauen (`_datenEinbauen`).
- Der Service Worker (`src/sw.js`, ausgeliefert als `sw.js`) hält die Seite, das Symbol, die Schriften und die Supabase-Bibliothek: aus dem Topf, im Hintergrund nachgefüllt. Die Antworten der Datenbank hält er nie, und jede Anfrage mit `_cb` geht ans Netz — der Update-Check ganz, `forceReload` holt die Seite frisch und legt sie in den Topf.
- Er trägt die Fassung der Seite (`SW_FASSUNG`, gesetzt von `tools/build.mjs`); eine neue Fassung räumt beim Aktivieren die Töpfe der alten. Registriert wird er nur über https oder auf dem eigenen Rechner.
- **Eine neue Fassung lädt von selbst** (`checkForUpdate`, `_updVersuchen`): nie über einem Blatt, Dialog, Popover oder einer Story, nicht im Eingabe- oder Einstellungsreiter, nicht mit fokussiertem Feld, nicht während geschrieben (`_schreibOffen`), abgerufen (`_loadAllPromise`) oder Stories veröffentlicht werden (`_newsAutoSyncRunning`), nicht neben einem Hinweis mit Knopf — und nur in Ruhe: seit Start oder Zurückkommen keine Berührung, oder die letzte eine Minute her (`UPD_RUHE_MS`). **Geht die App in den Hintergrund, lädt die wartende Fassung dort** (`_updImHintergrund`), auch über einem Blatt oder einer Story, nicht über einer Eingabe, einem Dialog oder einem fokussierten Feld und nicht neben einem Hinweis mit Knopf; läuft gerade ein Schreiben, Abruf oder Veröffentlichen, sobald es fertig ist. Danach steht kurz „App aktualisiert" (`_updMelden`), ohne Knopf — nach einem Neuladen im Hintergrund beim Zurückkommen. Die erwartete Fassung reist als `_upd` in der Adresse; kam die alte zurück, gibt es keinen Hinweis und zehn Minuten keinen zweiten Versuch (`UPD_SPERRE_MS`).

## Stellen

`01-update.js` (`checkForUpdate`, `_updVersuchen`, `_updImHintergrund`, `_updBelegt`, `_updMelden`, `forceReload`), `06c-stand.js`, `06-db.js` (`_loadAllDurchlauf`, `_datenEinbauen`, `_overridesNachziehen`, `ligaSchreibtAbgeleitet`, `_datenFrisch`, `autoArchiveSeasons`, `_nachholen`), `29-news-cache.js` (`syncStoriesViaDb`), `29b-news-sync.js` (`_newsAutoSyncTick`), `src/sw.js`, `37-boot.js` (Registrierung), `tools/build.mjs` und Wächter 1 und 5 in `tools/check.mjs`.

## Prüfung

`tests/start` (ein Telefon der Liga mit Berliner Uhr veröffentlicht; ein Gerät mit Tokioter oder Londoner Uhr und ein automatisierter Browser zeigen die Stories, schreiben aber weder Stories noch Archiv; ein Telefon, das mittags im Hintergrund verschwindet und nach Partien vor 15 Uhr zurückkommt, schreibt keinen Fun Fact für diesen Tag — mit offenem Feed und bei langsamem Netz, dann mit den Partien des Tages und ihren Stories —, und an einem Tag ohne Partie kommt der Fun Fact nach dem Zurückkommen; die Liga steht aus dem Stand, bevor das Netz antwortet; kein Schreibzugriff bis dahin; dasselbe Markup und derselbe Knoten nach dem Live-Abruf mit denselben Daten; ohne Netz bleibt der Stand; ein Stand einer anderen Fassung gilt nicht; der Service Worker hält die Seite unter ihrer Fassung, ohne Netz öffnet die App aus ihm, Update-Check und Neu laden gehen ans Netz, eine neue Fassung räumt den Topf der alten, keine Anfrage geht an eine fremde Adresse; über einem offenen Blatt lädt das Update nicht, nach dem Schließen von selbst, danach läuft die neue Fassung und steht kurz „App aktualisiert" ohne Knopf und ohne Merkmal in der Adresse; nach einer Berührung lädt es nicht sofort, beim Zurückkommen schon; geht die App in den Hintergrund, lädt es auch über einem Blatt, über einer Eingabe nicht; bringt das Neuladen eine alte Fassung zurück, lädt es nicht gleich noch einmal und meldet nichts; die Läufe der Veröffentlichung stehen je Zweig in einer eigenen Reihe).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Die App zeigte beim Start nichts, bis Supabase alle Spieler, alle Partien,
die Einstellungen und die Saisons geschickt hatte. Auf dem Telefon hieß das
bei jedem Öffnen eine leere Seite mit „verbinde…“, mit schlechtem Netz für
Sekunden. Der Inhalt, auf den man wartete, war fast immer derselbe wie beim
letzten Mal.

Der gespeicherte Stand macht das sichtbar, was das Gerät schon weiß. Er darf
aber nur zeigen: `loadAll` schreibt nach einem Abruf in die Datenbank — es
archiviert abgeschlossene Monate, veröffentlicht Stories, schließt ein
Karriereende ab und zieht Einstellungen nach. Jede dieser Handlungen aus
einem alten Stand hätte etwas veröffentlicht, das die Datenbank gerade nicht
sagt; eine Story aus gestrigen Daten ist mit dem Snapshot-Vertrag [§C33] für
immer gespeichert. Deshalb trennt `_datenEinbauen` (rein lokal) das Einbauen
vom Schreiben (`_overridesNachziehen`, Archiv, Sync), und nur der
Live-Abruf ruft beides.

Gespeichert werden die Antworten, wie sie aus der Datenbank kamen, nicht der
eingebaute Zustand: so baut der Stand mit demselben Code ein wie der
Live-Abruf, und der Fingerabdruck vergleicht dieselbe Sache. Ein Stand einer
anderen Fassung der App wurde mit anderem Code eingebaut und gilt nicht.

Ohne den Vergleich zeichnete der Live-Abruf mit denselben Daten die Ansicht
ein zweites Mal, nach einer zweiten kalten Rechnung aller Töpfe — der
Schnellstart hätte den Start teurer gemacht, nicht billiger.

Gemessen in `tests/start` mit drei Sekunden Netz: die Liga steht nach rund
400 ms; vorher nach dem Netz.

Der Service Worker gehört zur selben Regel: ohne ihn holte jedes Öffnen die
Seite, das Skript von jsdelivr und die Schriften von Google, bevor etwas zu
sehen war. Er darf aber das Update nicht verschlucken. Der Update-Check
(`checkForUpdate`) und das Neuladen (`forceReload`) tragen `_cb`; beide gehen
am Topf vorbei, sonst verglich die Seite wieder ihre eigene Version mit sich
selbst — genau der Fehler, den die Version aus dem Fingerabdruck einmal
behoben hat. Im Test geht keine Anfrage an eine fremde Adresse: ein Service
Worker holt fremde Quellen selbst, an jeder Umleitung des Browsers vorbei,
und mit der echten Bibliothek spräche der Test mit der echten Datenbank.

Das Update stand vorher als Banner oben („Neue Version — Neu laden") und
wartete auf einen Finger. Ein PWA-Symbol bleibt tagelang offen; wer den
Banner übersah, spielte mit einer Fassung weiter, deren Fehler schon behoben
waren. Jetzt lädt die App selbst — aber nie unter den Fingern: ein Neuladen
über einem Formular verlöre die Eingabe, eines während der Kette im
Hintergrund eine Partie ohne ihre Elo, eines während des Veröffentlichens
eine halbe Story. Ruhe heißt: seit dem Öffnen oder Zurückkommen nichts
berührt — dann sieht man den Start ohnehin gerade —, oder eine Minute nichts;
wer die Rangliste liest, berührt nichts, und eine kürzere Ruhe ließe sie
unter den Augen an den Anfang springen. Die erwartete Fassung steht in der
Adresse und nicht im Speicher des Geräts, der in einem privaten Fenster
fehlt: ohne sie wüsste die neue Seite weder, dass sie Bescheid sagen soll,
noch, dass ein Zwischenspeicher die alte zurückgab — und lüde im Takt des
Checks immer wieder neu.

Am 13.10. stand im Feed „Harter Tag für Maxi", 33 Elo verloren, datiert auf
Dienstag 16:58 — einen Tag ohne Spiel. Geschrieben hatte die Karte ein
automatisierter Browser, der die Liga kurz vor Mitternacht mit Tokioter Uhr
öffnete. Für ihn war schon Mittwoch, sein „gestern" reichte von Montag
17 Uhr bis Dienstag 17 Uhr deutscher Zeit und enthielt die beiden letzten
Partien des Montags (−20 und −13 für Maxi); 23:58 seines Dienstags ist 16:58
bei uns. Im selben Lauf archivierte er vier Saisons mit Monatsgrenzen sieben
Stunden neben denen der Liga; ein Telefon der Liga archivierte sie eine halbe
Stunde später zurück. Jedes Gerät rechnet Tage und Monate mit seiner eigenen
Uhr, und die Datenbank nimmt, was zuerst kommt: ein Mitspieler im Urlaub
hätte dasselbe angerichtet. Deshalb schreibt nur, wer mit der Uhr der Liga
rechnet, und kein automatisierter Browser — auch kein Test, der versehentlich
an der echten Datenbank hängt.

Am 19.10. stand im Feed um 15 Uhr „Liga in Zahlen", obwohl an diesem Tag ab
13:54 vier Partien gespielt worden waren — und ein Tag mit Partien vor
15 Uhr bekommt keinen Fun Fact. Angelegt hatte ihn um 17:39 ein Telefon mit
der Uhr der Liga, das seit dem Mittag im Hintergrund lag. Beim
Zurückkommen startete die App zweierlei: den Abruf der Daten (`_tickDaten`)
und den Takt der News, der sofort rechnete — mit den Partien, die noch im
Speicher lagen. Der Abruf kam erst danach an, und war ein Blatt offen, etwa
der Feed, fand er gar nicht statt. Für dieses Telefon war der Tag bis
15 Uhr ohne Spiel, und es schrieb den Fun Fact in die Liga, wo er für alle
stand. Die Regel über die Uhr hielt das nicht auf: die Uhr stimmte, der
Stand nicht.

**Die neue Fassung kam nicht an.** Zwei Gründe, beide gemessen. Der
Veröffentlichungslauf des Merges von PR #212 wurde abgebrochen, bevor er
veröffentlichte: alle Läufe teilten eine Gruppe (`concurrency: pages`), und
der Push auf einen Arbeitszweig eine Minute später verdrängte den wartenden
Lauf von `main`. Keine App konnte diese Fassung finden. Die Gruppe steht
jetzt je Zweig (`pages-${{ github.ref }}`). Und wer die App offen hat, liest
im Feed, einem Blatt, oder tippt: die gefundene Fassung wartete dann, bis
eine Minute lang nichts berührt war, und das kam kaum vor; wer die App
verließ, nahm sie beim nächsten Öffnen in denselben Kreis mit. Jetzt lädt sie,
sobald die App in den Hintergrund geht.
