# Laufzeit: Zustand, Caching, Takt

Was die App zur Laufzeit festhält, wie lange und wann sie es verwirft. Die
Abschnittsnummern im Text (§2, §3, §6 …) meinen die Abschnitte von
[CLAUDE.md](../CLAUDE.md), Kürzel wie §C27 die Gesetze in
[gesetze/](gesetze/), Kürzel wie §5.2 Abschnitte im Code ([anker.md](anker.md)).

# Zustand

Der veränderliche Zustand der Oberfläche steht gesammelt in
`src/js/01-update.js` (`tab`, `period`, `ligaSeasonId`, `ligaSicht`,
`awView`, `awPeriod`, `awSeasonId`, `rekKammer`, `rankMetric`, …). Neue Zustandsvariablen
gehören dorthin und nirgendwo anders, und sie brauchen einen Rücksetzpunkt:
`09-ui-infra.js` (Tabwechsel), `20-bind.js` (Zeitraumwechsel) und
`24-lock.js` (Klick aufs Logo) setzen zurück.

`rekKammer` gilt **nur** für den Rekorde-Reiter und ist leer für alle fünf
Kammern (`koennen`, `form`, `mark`, `fuegung`, `shame`). Sie wird beim
Tabwechsel UND beim Reiterwechsel geleert: wer den Tab verlässt, will beim
Zurückkommen die ganze Tafel sehen und nicht den Ausschnitt von vorhin.

`ligaSeasonId` gilt **nur** für den Liga-Tab — Awards, News und Ambient
rechnen weiter mit `currentSeason()`. Sie wird beim Tabwechsel UND beim
Zeitraumwechsel geleert: die gewählte Saison gehört zur Ansicht „Saison",
und die Saison-Tools darunter (Recap, Positionsverlauf) folgen ihr.

`einblickOffen` nennt die aufgeklappten Einblicke (`rollen`, `netz`,
`ruhe_liga`, `ruhe_pos`, `ruhe_teams`, `ruhe_chronik`), durch Leerzeichen getrennt, und ist
sonst leer. Es sind mehrere, weil ein Reiter zwei tragen kann: mit einem
einzigen Wert klappte der zweite den ersten im Zustand zu, und nach dem
nächsten Neuzeichnen stand er geschlossen da. Ein Neuzeichnen im selben
Reiter lässt sie offen — eine
neue Partie oder ein anderer Zeitraum klappt nichts zu, was man gerade
liest —, der Tabwechsel und der Klick aufs Logo leeren ihn: ein neuer Reiter
beginnt mit der Rangliste oben und nicht mit einer Grafik darüber.

Der Schnellstart [§C42] hält zwei Werte in `06c-stand.js`: `_standOffen`
(nur der erste `loadAll`-Durchlauf darf den gespeicherten Stand zeigen) und
`_standGezeigt` (sein Fingerabdruck, bis der Live-Abruf ihn bestätigt oder
ersetzt; ein Fehler leert ihn).

Die Rückblicke, die sich von selbst öffnen [§C31], merken sich in
`06-db.js`, was gesehen ist: `_autoRecapSeen` für die laufende Sitzung (ein
Neuladen alle dreißig Sekunden soll nichts zweimal öffnen) und auf dem Gerät
`recap_shown_<Saison>`, `potw_shown_<Woche>` und `auto_rueckblick_tag` — der
Tag, an dem sich zuletzt einer von selbst geöffnet hat. Gesetzt wird er, sobald
einer geplant ist, nicht erst, wenn er offen ist: die Woche fragt 300 ms vor
dem Öffnen des Monats, und sonst gingen beide auf. Ist beim Öffnen des Monats
etwas offen (`_etwasOffen`), nimmt er `_autoRecapSeen` und den Tag zurück,
und der nächste Abruf fragt wieder. Zurückgesetzt wird nichts;
der nächste Tag ist ein anderer Schlüssel.

Die Bewegung [§C43] hält in `09d-bewegung.js`: `_podestZuletzt` (je
Ansicht — Reiter mit seiner Wahl, `_ansichtSchluessel` —, wann ihr Podest
zuletzt geglänzt hat; nach 45 s glänzt es wieder, ein neues Öffnen leert
ihn), `_wechselZiel` (der Reiter, in dem ein Tippen gerade einen Wechsel
gewählt hat; `_renderNachEingabe` setzt ihn, das nächste `render` des
Reiters verbraucht ihn und nimmt dann kein Licht mit), `_wahlKnopf` (der
Knopf eines Wählers, den der laufende Klick getroffen hat; er gilt nur für
diesen Klick, `_wahlSofort` verbraucht ihn) und `_aufbauTeile` (die
Teile, die gerade aufbauen; ihr Ende, eine Berührung oder der nächste
Aufbau räumt sie). Beim Wechsel: `_ladeGruende` (warum die Ladelinie läuft:
`wechsel`, `daten`; sie endet, wenn keiner mehr gilt), `_ladeLauf` und
`_schleierLauf` (die laufenden Animationen) und `_verbunden` (ob der Punkt
schon einmal „verbunden" gezeigt hat; er wird nicht zurückgesetzt).
Am Blatt hängt `_vs`, die Vorstellung eines Rückblicks (`_vorstellung`):
ihr Zeitplan, ihre Zeitgeber, ihr IntersectionObserver und die Teile, die
noch warten (`wartet`); ein neues Blatt und das Schließen räumen sie
(`_vorstellungAus`), eine Berührung beendet ihren Auftritt
(`_vorstellungEnde`), was noch unter dem Rand wartet, bleibt beobachtet.
`_verdeckt` (je Blatt oder Fenster die Elemente, die es angehalten hat;
das Schließen gibt sie frei) und an jedem dieser Elemente `_steht` (wie oft
es angehalten ist; bei null verliert es `.steht`), an Story und Auszeichnung
`_auf` (das jüngste Öffnen; ein älteres Licht kommt nicht mehr).
`_sichtGruppen` (je HTML-Element, das der IntersectionObserver
`_bewegSicht` beobachtet, die Elemente mit endloser Bewegung darin; was nicht
mehr im Dokument steht, fällt beim nächsten Beginn heraus), an jedem dieser
Elemente `_sicht` (seine Gruppe) und `_ausSicht` (ob es gerade außerhalb des
Bilds steht und dafür `_steht` mitzählt).
`_lichtSicht` beobachtet die Karte jedes Kantenlichts, bis es endet.
`_kartenBeobachtet` (die Karten des Feeds, die der IntersectionObserver
`_kartenSicht` beobachtet; was nicht mehr im Dokument steht, fällt beim
nächsten Zeichnen des Feeds heraus) setzt an jeder Karte `.im-bild`, solange
sie im Bild steht; `FEED_SICHT` sagt, ob es den Beobachter gibt.
`_leiseSchritt` (die
Stelle in `LEISE_FOLGE`), `_leiseKarte` (welcher der drei Plätze als
nächster dran ist) und `_leiseZuletzt` (das Element des letzten leisen
Lichts, damit es nicht zweimal hintereinander leuchtet); sie werden nicht
zurückgesetzt, ein neu gezeichnetes Element ist ein anderes.
`_schlittenVorher` (`09-ui-infra.js`) trägt zusätzlich `t0`, das Bild, mit
dem der Schlitten eines Wählers losfuhr; `schlittenFahren` verbraucht ihn.

Die Zurück-Taste (`09-ui-infra.js`, [§4.3]) hält `_zurueckEintrag` (ob der
eine eigene Eintrag im Verlauf liegt), `_zurueckEigene` (wie viele
`popstate` die App mit `history.back()` selbst ausgelöst hat; jeder wird
einmal verbraucht) und `_zurueckPlan` (der Zeitgeber des Abgleichs, siehe
Takt). Der Eintrag liegt genau dann im Verlauf, wenn es etwas gibt, wohin
„zurück" führt: ein Dialog, ein Popover, eine Story, ein Blatt oder ein
anderer Reiter als die Liga. Ein Neuladen auf dem alten Eintrag ersetzt ihn
(`replaceState`); sonst wird nichts zurückgesetzt.

Das Update [§C42] hält in `01-update.js`: `_updNeu` (die Fassung, die der
Check gefunden hat und die noch nicht läuft), `_updSperre` (welche Fassung
ein Neuladen erwartet hatte und bis wann kein zweites versucht wird, wenn
die alte zurückkam), `_updBeruehrt` (die letzte Berührung: Zeiger, Taste,
Rad) und `_updSichtbar` (Start oder letztes Zurückkommen), beide als
`performance.now()`, weil Ruhe eine Dauer ist und die Uhr des Geräts
springen darf. Zurückgesetzt wird keiner: das Neuladen beginnt eine neue
Seite.

Zeitweilige Arbeitsaufträge sind keine Ansichtsauswahl: `_ligaRefreshAuftrag`
lebt im Navigations-Layer und wird nach Ende des gemeinsamen Datenabrufs
geleert; `_loadAllLeise` gilt nur für dessen Lauf und wird im `finally`
zurückgesetzt. Ein Vordergrundaufruf hat Vorrang vor stiller Fehleranzeige.

> **Pflegepflicht.** Kommt eine Zustandsvariable dazu, wird sie hier genannt
> und ihr Rücksetzverhalten beschrieben.

# Caching

Jeder Topf hängt an `_cache` und trägt **`_cache.version` im Schlüssel**. Das
ist die ganze Regel: `invalidateCache()` erhöht die Version, und ein Wert mit
altem Schlüssel wird nie wieder gefunden. Die Tag-Liste
(`invalidateCache(['global','stats',…])`) löscht darüber hinaus einzelne Töpfe
sofort — sie ist eine Abkürzung, kein Ersatz.

Wer die Version wegen der Bequemlichkeit weglässt, baut einen stillen Fehler:
`teamDetail` und `h2hDetail` hatten nur Spieler-IDs im Schlüssel und hingen
damit allein an ihrem Tag — den der Eingabe-Tab beim Speichern gar nicht
mitreicht. Gemessen zeigte das Duo-Blatt nach einer neuen Partie weiter 26:4
statt 27:4 und die Bilanz 110 Duelle statt 111. `tests/tafel` misst das nach.

`tests/tafel` liest die ausgelieferte Datei und prüft die Regel für **jeden**
Topf nach — Stichproben genügen dafür nicht, weil ein neuer Topf gerade der
ist, an den niemand denkt.

Kalenderabhängige Schlüssel tragen zusätzlich ihre echte Zeitgrenze:
`matchesInPeriod` den Tages-/Wochenbeginn, `getCachedAwardRankings` die
aktuelle Woche beziehungsweise den Tag, `allPastSeasons` den laufenden
Monat, `getSeasonPositionHistory` den heutigen Tag, solange die Saison
läuft, und `avatarRings` die Woche, den Tag und ob er zu ist. Die kleine Recap-Kurve trägt auch `ph.lastDay`. Ohne neue Partie darf
der Cache keinen alten Tag oder noch laufenden Vormonat behaupten.
`tests/leistung` prüft das mit unveränderter Datenversion.

`periodPlayerStats` folgt der Identität der kanonischen Periodenliste und
dem aktuellen Monat: auch neben einer unveränderten Allzeit-Bilanz muss die
absolute aktuelle Elo nach dem Monatswechsel zurückgesetzt sein.
`currentSeason` prüft weiterhin die Ortszeit bei jedem Aufruf, hält aber nur
das eine aktuelle Monatsobjekt statt es bei jedem Cache-Treffer neu zu bauen.

`getGlobalSim` hält genau einen vollständigen DB-First-Lauf, gebunden an
Version, Monat und Quellenreferenzen. Der ehemalige inkrementelle Weg hielt
nur die History und Saison-/Team-Maps der neuen Partien. Historische Schnitte
teilen über `getSimAt` und `getSimForMatches` denselben exakten Liga-Prefix
(höchstens 24 Läufe). Fremde Teilmengen erhalten ihren eigenen kanonischen
Lauf in einer versions- und quellengebundenen WeakMap. Gleiche Zeitstempel
werden im Zeitschnitt vollständig eingeschlossen, ein ausdrücklich kürzerer
Index-Prefix bleibt dagegen kürzer. Auszeichnungen und Rekorde nutzen diese
Quelle, nicht zusätzliche Simulationen. Historische Saison-Gruppierungen
teilen stabile Array-Identitäten für die Periodensieger aller Spieler.
`tests/prefix` vergleicht sämtliche Maps und History mit der unveränderten
ungecacheten Engine, einschließlich Brüchen, Edit, Add, Empty-State und Monat.

H2H-Listen tragen Version und Matchanzahl im Schlüssel und höchstens 80
Einträge. Gültige Nullwerte für Erwartung, Spielbonus und Verlustdämpfung sind
keine fehlenden Angaben. Die sichtbaren Prestige-Gruppensummen kommen zentral
aus derselben Restverteilung wie die Posten im Laufbahnblatt; Gesamtformel und
Rohquellen bleiben unverändert. `tests/rechnen` prüft die gemeinsame Anzeige
in Engine, Profil und Story, ohne eine zweite Elo-Formel zu implementieren.

Das Spielerprofil nutzt bereits gecachte Spieler-/Saisonlisten und bindet
nur seine eigenen Knöpfe. Browser mit beiden nötigen CSS-Fähigkeiten zeichnen
seine `.pp-sec`-Abschnitte bedarfsweise (`content-visibility:auto` mit
`overflow-clip-margin` für Überhänge). Wappen und Aura im Kopf sowie andere
Blätter sind ausgenommen, ältere Browser behalten das vollständige Layout.
`openSheet` setzt den alten Scrollstand vor dem neuen Markup zurück; jede
verspätete Navigations- oder Wischphase prüft die Öffnungsnummer. Schließen
oder direktes Neuöffnen entzieht alten Phasen den Besitz.

`render` merkt am `#main` ausschließlich das zuletzt gezeichnete Markup,
seine `_cache.version` und den Root-Knoten. Gleiches Markup in derselben
Version behält DOM, Fokus und Bindings; Vorlagen werden dennoch ausgewertet,
damit zeitabhängige Anzeigeänderungen erkannt werden. Datenwechsel, andere
Vorlagen und fremd ersetzter Inhalt erzwingen einen Umbau. Eingabe und
Einstellungen sind ausgenommen. Die fünf Navigationsknöpfe werden einmal
gebaut und gebunden, danach ändert sich nur ihre aktive Klasse. Kein
unbegrenzter HTML-Cache je Ansicht oder Filter.
Die ganze `.view` wird nicht bei jedem Umbau verblasst/verschoben: Filter
und Datenantworten wirkten sonst 320 ms lang wie ein erneuter Seitenstart.
Erklärende Grafiken und Segmentwähler behalten ihre eigene Bewegung.

Benutzerseitige Reiter-/Filterwechsel verwenden `_renderNachEingabe`:
die Navigation antwortet synchron, genau ein Frame mit anschließender Aufgabe
baut die zuletzt gewählte Ansicht. Während eines Reiterwechsels ist der alte
Inhalt inert, Filter derselben Ansicht bleiben für die nächste Wahl bedienbar.
Ein direktes `render` oder ein anderer Root entzieht dem alten Auftrag den
Besitz und stellt die vorherige Eingabefreigabe wieder her. `aria-busy` und
`aria-current` machen den Zustand auch ohne Farbe erkennbar. `bind` bindet nur
den Hauptinhalt, keine Knöpfe eines gleichzeitig geöffneten Blatts.
`_eingabeOffen` erkennt ein bereits aufgebautes lebendes Match-/Settingsformular:
auch vorher gestartete Datenabrufe aktualisieren darin nur Daten und Vorschau,
nicht den Eingabe-DOM. Abruffehler stehen als Hinweis statt anstelle des
Formulars; freier, noch nicht ausgewählter Suchtext geht so nicht verloren.

Die Match-Eingabe hält mit `_cache._matchInputMemo` genau das letzte
`computeMatch`-Ergebnis, gebunden an Version, Monat, Aufstellung, Rollen,
Stand und Quellenreferenzen. Chance, Vorschau und Speichern teilen diese
Rechnung; die Formel wird nicht kopiert. Unveränderte Chancen behalten ihren
DOM. Zustand, Stand und Speichergültigkeit antworten sofort, die Vorschau
zeichnet höchstens einmal je Frame und prüft ihren Formular-Root. Die
Teamsuche aktualisiert über `vTeams(true)` ausschließlich ihre Ergebnisliste
aus derselben Vorlage, nicht das Eingabefeld. Cursor, Fokus und laufende
IME-Komposition bleiben erhalten; alte Aufgaben verändern keinen neuen Reiter.
Comboboxen unterstützen Pfeiltasten, Enter und Escape samt ARIA-Auswahl.
Speichern hält eine sofortige Einzelsperre und einen Eingabesnapshot; eine
verspätete Antwort löscht keinen zwischenzeitlich geänderten Entwurf. Ein
bereits erfolgter Insert wird nach einem Folgefehler nicht erneut angeboten.

Ein Topf mit einem Schlüssel, der die Version enthält, **wächst über die
Versionen**: er braucht eine Obergrenze, ab der er geräumt wird. Sieben
hatten keine — darunter der der Auszeichnungen, der zu jeder Version zwölf
Listen mit je dreißig Einträgen anlegt und jede vorige behält. Der Deckel
wird nur bei einem Fehlgriff geprüft: vor dem Lesen geräumt, verlöre er
gerade den Treffer, für den er da ist. Geräumt wird der **älteste Eintrag**
(`_topfDeckel`), nicht der ganze Topf. Beim vollständigen Leeren ist das Memo
oberhalb des Deckels nämlich nicht beschnitten, es ist **aus**: gemessen an
`_seasonTitleCtx` mit Deckel 8 kostete ein zweiter Blick auf sechs und acht
Zeitschnitte null Rechnungen, auf zwölf und zwanzig jeweils alle noch einmal.
Und ein Deckel steht nie weit über der Arbeitsmenge — der News-Generator
allein fragt sieben verschiedene Schnitte des Monatskontexts ab, der Deckel
stand bei acht. `tests/tafel` zählt die Töpfe und
die Deckel und misst, dass ein Eintrag zu viel einen Eintrag kostet —
Stichproben genügen dafür nicht, weil ein neuer Topf gerade
der ist, an den niemand denkt.

**Ein Zeitschnitt, der nichts abschneidet, ist kein Zeitschnitt**
(`_schnitt`, `_schnittSaison`). Der Feed vergleicht „vor dem letzten
Spieltag" mit „heute" und schrieb „heute" als den Zeitstempel der letzten
Partie. Für jede geschnittene Rechnung ist das aber ein eigener Schlüssel:
gemessen rechnete ein Generatorlauf `prestigeTabelle` zweimal, einmal
ungeschnitten für 17 ms und einmal als Schnitt für 59 ms, und Juni und Juli
kamen in sechs Schnittfassungen vor, obwohl beide Monate längst zu sind.
Schlimmer als die Zeit ist die Abweichung: `seasonTitles` liest einen
abgeschlossenen Monat nur OHNE Schnitt aus dem eingefrorenen Datensatz und
rechnet ihn mit Schnitt frisch nach [§10.2] — derselbe Monat kann damit unter
zwei Namen erscheinen, je nachdem ob ein Schnitt mitgegeben wurde. Ein
Schnitt hinter der letzten Partie fällt deshalb weg, und ein Schnitt hinter
dem Monatsende fällt für DIESEN Monat weg. Gemessen sank der News-Generator
dadurch von 241 auf 162 ms kalt (Median aus elf Läufen). **Ein Generatorlauf nimmt genau zwei Stände** (`_storyStand`,
`_storyTagGrenzen`, `_prestigeWirkung` in `26b-story-fakten.js`): den Stand
vor der ersten Partie des Spieltags und den danach. Rekord, Monatschronik und
Insignium rechneten sich ihre Tagesgrenze und ihren Zeitschnitt vorher jeder
selbst aus, und jeder ein bisschen anders — die Chronik fragte
`prestigeTabelle` am Zeitstempel der letzten Partie, also mit einem Schnitt,
der nichts abschneidet. Drei Rechnungen über dieselbe Änderung nennen
irgendwann drei Zahlen, und die stehen dann auf drei Karten derselben Minute.
„Vorher" ist Mitternacht, nach dem Schluss der Woche, „nachher" eine Sekunde
vor Mitternacht, vor dem Schluss des Monats (23:59:59, `seasonEnd`): beide
Abschlüsse haben ihre eigene Karte [§C33]. Für den jüngsten Spieltag ist das
Ende „jetzt", solange danach nichts zuging (`_schnitt`), und alle vier
zentralen Funktionen treffen ihren heißen Cache. Wo eine Rechnung an der
Identität eines Arrays hängt statt an einer Version (`_winnerCountsOf`,
`matchesOfPlayer`, `matchesByDay`), reicht eine `WeakMap` — `matches` wird
immer **ersetzt**, nie an Ort und Stelle verändert, und ein frisches Array
verwirft den Memo von selbst. Die Sieger der Zeiträume tragen im Schlüssel
dazu den Zeitraum, der beim Schnitt noch offen ist (`_periodeOffen`), nicht
die Uhr und nicht die Zahl der Sieger: zwei Schnitte, die je einen anderen
Zeitraum offen lassen, haben gleich viele Sieger und trotzdem andere.

**Ein Zeitschnitt ist ein Array je Stand** (`_partienBis`, `04-cache.js`):
die Partien bis `bisMs`, gefunden per Binärsuche wie in `getSimAt`, gemerkt
in einer `WeakMap` an `matches` je Zahl der eingeschlossenen Partien
(höchstens 24, der älteste geht zuerst). `prestigeTabelle(bis)` und
`seasonTitleHistory(pid, bis)` schnitten sich denselben Stand vorher jeder
selbst zurecht — zwölf gleiche Kopien der Liga je Schnitt —, und die Memos,
die an der Identität ihres Arrays hängen, trafen über diese Grenze nie. Das
Array ist nur zu lesen; `tests/prefix` sieht nach einem Generatorlauf nach,
dass keines verändert wurde. Liegt die Liga nicht aufsteigend vor, gilt der
alte Filter. Wer in welchem Monat gespielt hat, steht je Liste einmal in
`_spielerJeSaison` (`WeakMap`), `_wochenKey` merkt sich Text und Zahl wie
`mts`, die Partien je Kalendertag stehen in `_tagMsIndex` (`WeakMap` an
`matches`; die Konsolidierung des Feeds fragte für jede Story einmal durch
die ganze Liga), und die Badge-Vergabe sucht ein Badge in einer Map statt
in `BADGES`.

**Der Verlauf eines Rekords** (`_rekVerlauf`, Schlüssel Rekord, Partienzahl
und Version, Deckel 16) wird nach dem Öffnen des Blatts gerechnet, ein
Monatsende je Takt: ein Zeitschnitt rechnet die Elo-Bahn bis dorthin nach,
gemessen 7 bis 36 ms je Monat, und sechs davon auf einmal stünden mitten in
der Animation. Die Schnitte selbst liegen danach in `_chronCtxBis` und
teilen sich den Topf mit Feed und Rückblicken.

**Die Karten am Spieltag rechnen einmal je Datenstand** (`_spBasisMemo`,
`_spBildMemo`, beide eine `WeakMap` an `matches`): Spielreihenfolge,
Ergebnisverteilung als Präfixsumme, Serienstand vor jeder Partie und die
Runden der Vier, und je Karte ihr Bild, solange `players` dasselbe Array ist.
Eine Karte las sonst für die Verteilung, die Serie und die Runde je einmal
die ganze Liga — bei sechzig Karten sechzig Läufe bei jedem Öffnen. Die
Zeilen einer Runde finden die Karte ihrer Partie über `_spKarteMemo`, eine
`WeakMap` an der Liste des Feeds: je Zeile den ganzen Feed zu durchsuchen
wäre bei acht Zeilen und siebzig Karten ein Quadrat für nichts. Die Formen
der gewöhnlichen Partie hängen an `_spFormBasis`, ebenfalls eine `WeakMap`
an `matches`: die Partien je Tag, je Partie Siegchance, Abstand und Gewinn,
und gemerkt die Fakten, Kandidaten und die Wahl je Partie — die Kette der
Wahl läuft einmal je Datenstand.

**Warum eine Karte eines Schlusses Breaking ist** (`_ehrungGrundMemo`, eine
`WeakMap` an `matches`, je Schluss, neu, sobald `players` ein anderes Array
ist): was der Schluss eines Tages oder einer Woche an legendären
Auszeichnungen vergab. `_isBreaking` fragt es bei jedem Zeichnen des Feeds
für jeden Spieler des Tages und jede Ehrung, und jede Frage zählte sonst
sechs Auszeichnungen für alle Spieler zweimal.

Die V2-Scorewahl indiziert außerdem die wirklich publizierten `visual.score`
je Match und Storybestand. Dieser Index und die chronologische Variationsspur
werden bei neuer Rohstory-Referenz oder `_cache.version` neu aufgebaut;
publizierte Grafiken selbst bleiben unverändert. Die Spur beginnt nicht bei
der ersten Partie, sondern `SP_SCORE_VORLAUF` (120) Partien vor der ältesten
veröffentlichten Karte oder der ältesten Partie im Fenster des Generators,
je nachdem, was früher liegt (`_spScoreAb`). Der Bestand reicht nur einen
Monat zurück, und ab der ersten Partie wählte der Generator bei jedem neuen
Datenstand jeden älteren Kopf noch einmal: mit vier Jahren Liga 3642 Wahlen
und elf Sekunden je Lauf. Fragt jemand nach einer Partie vor dem Anfang,
läuft die Spur von der ersten Partie an neu. `_consolidateStories` hängt
neben der Eingabeliste auch an `matches` und `_cache.version`, damit eine zuvor
noch nicht geladene Matchreferenz nach dem Datenladen richtig aufgelöst wird.

**Ein Ruheständler kostet keine eigene Rechnung** [§C40]. Sein Stand liegt
in der Datenbank; `_ruheGespeichertMemo` merkt das Zerlegte je Spieler, Text
und Zeitpunkt. Bis zu seinem Abschluss rechnet `prestigeTabelle` ihn im selben
Durchlauf wie alle mit (`ruhe`), danach liest `prestigeOf` den Abschluss-Teil.
Die Daten des Abschieds (`abschiedDaten`, `_cache._abschied`, Deckel 8)
tragen Version und Partienzahl im Schlüssel und werden erst beim Öffnen
gerechnet.

**Der höchste Platz auf der Leiter** (`_insBestVor`) kommt nur aus dem
Bestand: aus dem `best` der letzten Insignium-Karte und aus alten
Stufen-Zeilen. Die Stände jedes Spieltags davor nachzurechnen kostete rund
anderthalb Sekunden und verdrängte, was das Vorwärmen für die Awards
bereitgelegt hatte (`tests/start` war rot). Ein Ruheständler fällt beim
Lesen heraus [§C40].

**Die Rohsicht landet nicht im Cache.** Fünfundzwanzig Liga-Rekorde [§C35]
fragen nach einem gleitenden Fenster, nach einer Rolle, nach dem Gegnerkreis,
nach dem Partnerkreis oder nach den eigenen Spieltagen und brauchen dafür die Partien je Spieler in
Spielreihenfolge — dieselbe Rohsicht, die `_seasonTitleCtx` für den Monat
schon hat. `_chronicleCtx` baut sie in einer eigenen Struktur NEBEN `P`,
rechnet die Werte daraus aus und lässt sie fallen; am gecachten
Spielerobjekt hängen nur Skalare. Am Objekt selbst wären es 4×N
Partien-Objekte, und der Zeitschnitt hält bis zu 24 Kontexte gleichzeitig.
Jede Partie trägt dort `mate`, `geg` und `day`: „Der Klotz am Bein"
vergleicht jeden Mitspieler mit sich selbst OHNE diesen Partner, „Der
Rückenwind" braucht die Stärke des Partners, und „Der letzte Ball" und „Die
Steigerung" gruppieren nach Spieltagen — alle drei Fragen hängen an einer
Reihenfolge, die nur die fertige Liste kennt. Die vier Kennzahlen der Schandtafel fallen im
selben Durchlauf ab — gemessen 8,6 auf 10,3 ms kalt, warm weiterhin null. `tests/disziplinen` sieht nach, dass kein Spielerobjekt im
Cache eine Liste trägt.

**Der Stand des Geräts** (IndexedDB `kicker-stand`, ein Eintrag `liga`)
ist der einzige Topf, der eine Sitzung überlebt. Sein Schlüssel ist
`BUILD_VERSION`: ein Stand einer anderen Fassung wird nicht gezeichnet. Er
hält die vier Antworten der Datenbank, wie sie kamen, den Story-Bestand und
den Fingerabdruck `_standHash` über ihren Text; geschrieben wird er am Ende
jedes Live-Durchlaufs mit neuen Daten, gelesen nur im ersten. Liefert der
Live-Abruf denselben Fingerabdruck, bleiben Daten, Töpfe und DOM aus dem
Stand stehen — sonst rechnete der Start alles zweimal kalt.

**Die Töpfe des Service Workers** (`src/sw.js`) überleben ebenfalls:
`kicker-seite-<Fassung>` hält Seite und Symbol, `kicker-fremd` Schriften und
Supabase-Bibliothek. Die Fassung ist die BUILD_VERSION; eine neue räumt beim
Aktivieren die Seitentöpfe der alten. Antworten der Datenbank und Anfragen
mit `_cb` (Update-Check, Neu laden) liegen nie darin.

> **Pflegepflicht.** Kommt ein Topf dazu, steht seine Schlüsselregel hier.

# Takt

`_zurueckAbgleichen` (`09-ui-infra.js`) gleicht den Eintrag der Zurück-Taste
nach der laufenden Aufgabe ab (`setTimeout` 0, höchstens einer offen):
Schließen und Öffnen folgen oft im selben Zug, und ein sofortiges
`history.back()` nähme den Eintrag, den das neue Blatt gerade hingelegt hat.

Zwei Zeitgeber laufen dauerhaft (`37-boot.js`): `_tickDaten` alle dreißig
Sekunden, `_tickVersion` alle fünf Minuten. Beide **ruhen, solange die Seite
versteckt ist**, und holen beim Zurückkommen sofort nach. `loadAll` lädt alle
Spieler und alle Partien; das im Hintergrund zu tun ist Mobilfunk und Akku
für nichts, und ein PWA-Symbol bleibt tagelang offen. Der News-Autosync
(`_newsAutoSyncTick`, `29b-news-sync.js`, alle zehn Minuten und beim
Zurückkommen) befolgt dieselbe Regel und rechnet nur mit den Partien von eben
[§C42]: beim Zurückkommen wartet er auf den Abruf, den `_tickDaten` gestartet
hat; läuft keiner, weil ein Blatt offen ist, setzt er aus.

Der Update-Check (`checkForUpdate`, `01-update.js`) fragt mit
`If-None-Match`; der ETag steht mit der Version, zu der er gehört, im Speicher
des Geräts (`kicker_upd_v1`) und gilt nur, solange diese Version läuft. Ohne
ihn lud jeder Start die ganze Seite erneut — neben den vier Datenabfragen.
Der erste Check des Starts wartet, bis der erste Datenlauf gezeichnet hat und
die Seite ruht. `tests/start` misst beides am echten Start.

Findet er eine andere Fassung, lädt `_updVersuchen` neu, sobald nichts offen
ist, nichts geschrieben oder abgerufen wird und Ruhe ist (seit dem Start
oder Zurückkommen keine Berührung, oder die letzte eine Minute her,
`UPD_RUHE_MS`). Bis dahin fragt `_updWarten` nach — alle zwei Sekunden, nach
einer Berührung erst, wenn die Minute um ist — und nur, solange die Seite
sichtbar ist; das Zurückkommen versucht es sofort. Eine wartende Fassung
fragt das Netz nicht noch einmal. Brachte das Neuladen die alte Fassung
zurück, ruht der Versuch `UPD_SPERRE_MS` (zehn Minuten).

`loadAll` hält höchstens einen Durchlauf offen (`_loadAllPromise`). Weitere
explizite Anforderungen setzen `_loadAllNochmals` und erhalten dieselbe Promise, die
erst nach dem frischen Folgedurchlauf erfüllt ist. Nach jedem abgeschlossenen
Abruf wird gegebenenfalls erneut geladen: Speichern darf nicht lediglich
eine schon vorher gestartete Antwort erhalten. Alle vier Leseabfragen enden,
auch bei einer Ablehnung; überholte Antworten leeren keine Caches und
publizieren keine Stories. Fehlerhafte Teilantworten werden nicht eingebaut,
und ein Fehler verwirft den Fingerprint, damit ein erneuter Versuch möglich
bleibt. Unveränderte erfolgreiche Antworten behalten weiterhin den Cache —
außer der Tag ist seit dem letzten Durchlauf zugegangen (23:59, `_tagZu`)
oder Mitternacht war: dann rechnet dieselbe Antwort neu, weil Auszeichnungen,
Rekorde und Chroniken, die einen ganzen Tag beschreiben, erst jetzt gelten.
Reine Hintergrundticks verwenden `loadAll({nachladen:false})` und schließen
sich nur an einen laufenden Abruf an. Sonst würde ein langsamer Abruf, der
länger als dreißig Sekunden dauert, durch jeden Tick erneut verworfen.
Jedes Tippen auf den unteren Liga-Knopf, auch wenn er schon aktiv ist,
ruft `_ligaAktualisieren`: nach einem Rückmeldungsbild lädt der vorhandene
Datenweg mit `leise:true`, ohne Dokumentreload oder Ladeansicht. Ein einzelner
`_ligaRefreshAuftrag` bündelt weitere Liga-Taps bis zum Abrufende. Eine schon
vor dem Tap gestartete Abfrage wird einmal frisch nachgeholt, nicht durch
jeden weiteren Tap erneut verworfen. Unveränderte Daten behalten DOM/Caches;
Abruffehler behalten die letzte Ansicht. Ein sich anschließender expliziter
Vordergrundaufruf hebt den stillen Modus auf (`_loadAllLeise`).

Was gespeichert wird, steht, sobald die Datenbank die eine Anfrage
bestätigt hat, die es braucht — Insert, Update oder Delete der Partie
[§3.1c]: die Liga wird auf dem Gerät gerechnet (`ligaNeuRechnen`, eine neue
Partie leert `LADEN_TOEPFE` wie ein Abruf) und gezeichnet (`neuZeichnen`,
dasselbe wie nach einem Abruf: ein offenes Formular bleibt). Was die
Datenbank daraus ableitet — Positionsstärke und Saison-Elo
(`_spielerSchreiben`), die Deltas, die sich geändert haben, die Archive der
vergangenen Monate, in denen das geschah (`rechnungSchreiben`) —, schreibt
`imHintergrund` danach in einer Kette (`06-db.js`: `_schreibKette`,
`_schreibOffen` zählt die offenen Aufträge, `_schreibFehler` merkt sich einen
gescheiterten bis zum nächsten Nachholen). Jeder Auftrag beginnt nach dem
nächsten Bild (`nachDemBild`), auf einer versteckten Seite gleich. `loadAll`
holt erst, wenn die Kette leer ist: ein Abruf dazwischen brächte halb
geschriebene Deltas und archivierte aus ihnen. Ein Auftrag, der Deltas
schreibt, setzt auf dem Gerät `kicker_nachrechnen`, bis er durch ist; steht
die Marke nach einem Live-Abruf noch, rechnet `_nachholen` die Liga nach und
schreibt, was abweicht — nur mit der Uhr der Liga [§C42]. Ein Fehler beim
Nachschreiben sagt ein Hinweis; die Partie bleibt.

Der erste Durchlauf startet den Abruf und zeichnet, während das Netz noch
antwortet, aus dem gespeicherten Stand (`_standZeigen`, höchstens 400 ms
Warten auf IndexedDB); aus dem Stand wird nichts geschrieben [§C42].
Scheitert der Abruf danach, bleibt der Stand stehen und ein Hinweis sagt es.
Mit neuen Daten zeichnet `loadAll` vor `autoArchiveSeasons`: das Archiv
wartet je abgeschlossenem Monat auf einen Upsert, und am ersten Tag eines
Monats stand die Rangliste so lange leer; ändert das Archiv die Version,
wird noch einmal gezeichnet.

Stories veröffentlichen, abgelaufene löschen und Monate archivieren darf nur
ein Gerät mit der Uhr der Liga, kein automatisierter Browser
(`ligaSchreibtAbgeleitet`, [§C42](gesetze/C42-start.md)); jedes andere
rechnet dasselbe und zeigt es nur sich selbst. Stories veröffentlicht es nur
aus Partien, deren Abruf höchstens eine Minute vor dem Rechnen abgeschickt
wurde (`_partienGeholt`, `_datenFrisch`); jede vollständige Antwort setzt
diesen Zeitpunkt, auch eine unveränderte.

Kommen neue Daten, zeichnet `loadAll` zuerst und lässt den News-Generator
danach in einem Worker rechnen (`_storiesImWorker`, `29c-news-worker.js`):
derselbe ausgelieferte Code, vor ihm eine Attrappe für DOM und Speicher. Kalt
rechnet er an den Fixtures mit vierfach gedrosselter CPU rund eine Sekunde am
Stück; auf dem Hauptthread blieb in dieser Sekunde jedes Tippen liegen. Der
Worker lebt die Sitzung lang und bekommt den Datenstand nur, wenn sich
`players`, `matches`, `cfg`, `seasons` oder `_cache.version` geändert haben
(`_storyWorkerStand`), den Story-Bestand jedes Mal — so trifft sein Memo genau
dann, wenn er auf dem Hauptthread getroffen hätte. Hat sich der Stand während
der Rechnung geändert, gilt die Antwort nicht. Ohne Worker, ohne Skripttext,
bei einem Fehler oder wenn ein neuer Worker den Lauf nicht binnen zwanzig
Sekunden annimmt (`STORY_WORKER_FRIST.annahme`), rechnet der Hauptthread wie
zuvor, in einem ruhigen Moment (`_leerlauf`, höchstens anderthalb Sekunden
später); nach einem Fehlschlag bleibt der Worker für die Sitzung aus. Hat er
angenommen (`_storyWorkerLebt`), rechnet er bis zu fünf Minuten
(`STORY_WORKER_FRIST.rechnen`), ohne dass der Hauptthread übernimmt: dort liefe
derselbe Code, nur stünde das Telefon still. Mit zwanzig Sekunden für alles
übernahm er, sobald die Liga einige Jahre alt war. Wer die fünf Minuten
überschreitet, wird beendet (`_storyWorkerNeu`); der Lauf bringt keine neuen
Stories, und der nächste startet einen neuen Worker. `tests/start` hält Worker und Hauptthread
aneinander, `tests/ambient` sieht nach, dass der Generator nicht im selben
Aufruf wie das Zeichnen läuft.

Nach jedem Zeichnen mit neuen Daten rechnet `_vorwaermen` (`04-cache.js`
§2.1b) die Töpfe der übrigen Reiter vor — Positionen, Awards der laufenden
Saison, Rekorde, Chronik, Teams, Prestige —, EINEN je ruhigem Moment
(`_leerlauf`) und mit genau den Aufrufen, die die Ansicht beim Betreten
macht, sonst träfe der Schlüssel nicht. Seit der Generator im Worker rechnet,
wärmt er den Hauptthread nicht mehr nebenbei; ohne das Vorwärmen rechneten
Awards und Teams beim ersten Öffnen kalt. Ein neuer Datenstand (andere
Version) oder ein neuerer Auftrag bricht den laufenden ab
(`_vorwaermAuftrag`), eine versteckte Seite wartet. `tests/start` zählt nach
dem Start beim ersten Öffnen jedes Reiters die kalten Rechnungen: null.
Die Zeichen der Laufbahn gehören nicht dazu: sie tragen die Rangfarbe, und
der Start zeichnete sie für jeden Rang der Liga — gemessen elf Sekunden lang
Blöcke bis 336 ms (vierfach gedrosselt), für ein Blatt, das nur das Profil
öffnet. Jetzt zeichnet `_insRangWaermen` (Plan in `_insWarmPlan`, an Rang
und Datenversion gebunden) die eines Rangs, wenn sein Profil oder eine
Story mit dem Weg zur Laufbahn offen steht, eine Zeichnung je ruhigem
Moment; ist kein Blatt und kein Fenster mehr offen, hört es auf. Kalt
kostete das erste Laufbahn-Blatt eines Rangs 600 bis 900 ms Skript, warm 65
bis 140 ms. `tests/start` sieht nach, dass der Start keines zeichnet und
das Öffnen der Laufbahn aus dem Profil höchstens eines, das der eigenen
Stufe mitten im Grad.

Beim Start wartet die Oberfläche höchstens 2,5 s auf das erste Bild
(`_startAuftrag`), dann steht das Gerüst [§C43]. Der Aufbau räumt sich nach
seiner Zeit ab (`_aufbauAuftrag`), die Klasse `.aufbau` am Wurzelknoten nach
1,7 s (`_vorfuehrungAuftrag`), jedes Kantenlicht nach seiner Dauer
(`KANTE_MS`, 4,6 s zeichnen, 4,2 s Hinweis) und das Band über Gold nach
seiner Bahn; `tests/start` sieht nach, dass danach nichts davon im Dokument
steht. Ein Licht oder Band mit Verzögerung steht bis zu seinem Einsatz ohne
Kasten in seiner Karte, und ein Zeitgeber je Licht gibt es dann frei
(`_lichtWartet`, `.kl-wartet`); beim Neuzeichnen wandert es mit. Die Ladelinie endet spätestens 15 s nach ihrem Beginn (`_ladeNot`),
auch wenn ein Grund noch gilt. Der Hinweis „x neue Stories" blendet nach 7 s
aus, wenn er der erste nach dem Öffnen ist (`_newsToastSchonDa`), sonst nach
4 s (`_newsToastHideTimer`); der Ring an der Pille räumt seine Klasse nach
2,4 s (`_rufAuftrag`); die Pille „News" trägt `.kommt` 1,1 s lang. Das Licht im Feed beobachtet 280 ms nach dem Öffnen, wenn
das Blatt eingefahren ist, welche Karten im Bild stehen, das an Story und Auszeichnung kommt nach 120 ms; was ein Blatt
verdeckt, hält nach 300 ms an, wenn es eingefahren ist; geschlossene Fenster
werden nach 260 ms geleert, wenn sie nicht wieder offen sind. Vom Öffnen
an plant `_leiseAuftrag` alle 7 bis 12 s ein leises Licht von 6,5 s; es läuft weiter,
solange die Seite offen ist. Ist die Seite versteckt, steht ein Blatt offen,
ist der Verlauf offen oder baut sich eine Ansicht auf, setzt es aus und
versucht es nach 2 s wieder (`LEISE_NOCHMAL_MS`).

Saison- und Wochenrückblick öffnen ohne die Laufbahn, ihre Auszeichnungen
und die Rekorde der Woche: die brauchen Prestige- und Rekordstände an den
Rändern des Zeitraums, und die Woche öffnete damit gemessen 280 ms nach
dem Tippen statt 20 ms. Ein Zeitgeber setzt den Teil 380 ms nach dem
Öffnen ein, wenn das Blatt eingefahren ist (`RCP_SPAET_MS`,
`rcpSpaetLaden`), und stellt der Rückblick vor, erst nach ihrem ersten
Bildschirm (`VORSTELLUNG`, `spaet`: 2,5 s für die Saison, 1,1 s beim
Wechsel des Monats, 1,15 s für die Woche, `_vorstellungRest`); ist das Blatt
inzwischen ein anderes, fällt er weg.

Die Vorstellung selbst zeitet mit Zeitgebern am Blatt (`_vs.zu`): jedes
Teil bekommt seine Klasse zu seiner Zeit (`VORSTELLUNG`), was hereinkommt,
45 bis 70 ms nach dem vorigen (`_vsPlanen`); nach `ende` (3 s, 1,5 s)
wartet nichts mehr auf seine Zeit. Eine Berührung löscht die noch offenen
Zeitgeber; ein neues Blatt und das Schließen ebenso (`_vorstellungAus`).

`_tickDaten` lässt außerdem ein offenes Blatt, den Eingabe-Tab und die
Einstellungen in Ruhe:
was man gerade unter den Fingern hat, wird nicht neu gezeichnet. `tests/blatt`
und `tests/bedienung` messen diese Bedingungen.

> **Pflegepflicht.** Kommt ein Zeitgeber dazu oder ändert seine Bedingung,
> steht das hier.
