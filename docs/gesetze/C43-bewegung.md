# §C43 Bewegung: nie warten, von selbst enden, nur, was man sieht

## Regel

- **Die Oberfläche steht im ersten Bild.** Kopfleiste und Zeichen sind festes Markup in `src/index.html` und nicht bis zum ersten Skriptbefehl versteckt; das Zeichen ist ein Bild von 252 px in der Seite (`01-shell.css`), ohne eigene Anfrage. Kein Bild steht davor.
- **Bei jedem Öffnen baut sich die Liga auf** — dem ersten Bild, das der Start zeichnet, während `loadAll` läuft (`_bewegungNachRender`), nicht einem `render` von anderswo: die untere Leiste steigt herauf, der Inhalt kommt in Teilen (`.bau`, höchstens vierzehn, die Verzögerung am Teil selbst), Licht fährt um das Zeichen, um Platz 1 bis 3 und um „Match eintragen". Eine Sperre nach kurzer Pause gibt es nicht.
- **Ohne Stand auf dem Gerät** [§C42] steht bis zur Antwort der Datenbank das Gerüst der Liga (`_startGeruest`), das danach über ihr ausblendet; kommt nach 2,5 s kein Bild, ebenso.
- **Jeder Wechsel, den ein Tippen wählt, baut sich auf** (`_wechselBeginnt`, `_wechselZiel`): ein Reiter über die Leiste ebenso wie eine Ansicht darin — Zeitraum, Saison, Spieler oder Duos, Awards, Rekorde oder Chronik, Sortierung, Seite des Verlaufs. Überschrift, Wähler und Suche stehen, Karten und Zeilen kommen nacheinander (höchstens zehn, 45 ms auseinander, je 0,56 s), auch aus dem kastenlosen Rahmen einer vergangenen Saison (`.geschichte`) und Karte für Karte aus den Rekorden. Dieselbe Wahl noch einmal und neue Daten (`render` aus `loadAll`) bauen nichts auf.
- **Der Verlauf bleibt ruhig** (`RUHIGE_REITER`): ein Blick auf vergangene Partien zum Nachschlagen — kein Aufbau beim Öffnen, Wechseln, Suchen oder Blättern, kein Licht um eine Partie, kein leises Licht, solange er offen ist. Schlitten, Schleier und Ladelinie der Leiste bleiben: sie gehören dem Wechsel, nicht dem Reiter.
- **Ein Wähler antwortet sofort:** die Pille des gewählten Reiters ist EIN Schlitten, der gleitet (`_navSchlitten`, `.nav-schlitten`), nur per `transform` in Pixeln aus der Fensterbreite — er fährt, bevor der neue Reiter gerechnet ist. Im Reiter ist der getippte Knopf gewählt, bevor gerechnet ist (`_wahlSofort`, der Knopf aus dem Klick selbst), sein Schlitten fährt los und nach dem Neuzeichnen an derselben Stelle weiter (`schlittenFahren`). Rechnet die Ansicht länger als 90 ms, dunkelt ein Schleier die alte ab (`.reiter-schleier`), bei einem Wechsel im Reiter erst unter dem Wähler; nach 120 ms läuft unter der Kopfleiste die Ladelinie (`_ladeStart`, `.lade-linie`), ebenso solange Daten kommen; beides endet, wenn die Ansicht steht und die Daten da sind (`_wechselSteht`, `_connBewegung`), die Linie spätestens nach 15 s. Steht die Verbindung zum ersten Mal, geht vom Punkt oben links ein Ring aus.
- **Das Podest glänzt, wenn eine Ansicht ankommt, und dieselbe Ansicht erst nach 45 s wieder** (`_podestLicht`, `_podestZuletzt`, `_ansichtSchluessel`: Reiter mit seiner Wahl): Licht im Metall um Platz 1 bis 3 [§C25] in Liga, Positionen und bei den Duos, um das Podest der Awards; über Gold zieht das Band (`.glanz-bahn.glanz-einmal`).
- **Das Kantenlicht hat zwei Bedeutungen und keine dritte** (`kantenlicht`, `.kl`) [§C41]: *zeichnen* — einmal herum, dann steht der Rahmen einige Sekunden: eine Karte, die zählt, ist angekommen; *hinweis* — zweimal herum, ohne Rahmen: hier ist etwas neu. Beide enden von selbst (4,6 und 4,2 s): das Licht läuft nach der Runde langsamer weiter, ein Schein liegt um die Karte, dann verlischt beides, und nichts davon bleibt im Dokument. Das Licht im Profilkopf ist dieselbe Zeichnung mit eigener Bedeutung: es läuft, solange der Monat läuft.
- **Die Zeichen am Ring des Profilkopfs** [§C26] kommen nacheinander, danach läuft alle sieben Sekunden ein Licht reihum über sie, einmal um den Ring, dann Ruhe (`.pp-av-mark`, Lichthof im Hintergrund). Trägt jemand Lob und Niederlagenserie, blendet die zweite Farbe des Rings langsam ein und aus (`ppRingWechsel`).
- **Neues kündigt sich mit dem Hinweislicht an:** die Pille „News" steht vom ersten Bild an als Gerüst an ihrem Platz (`.wartet`, festes Markup, kein Tipp), still, ohne Schimmer, mit dem Stand des Geräts kommt ihr Inhalt, sonst mit den Stories aus der Datenbank: sie färbt sich ein, Zeichen und Wort gleiten herein, die Zahl springt auf, und gibt es Ungelesenes, fährt zweimal Licht um sie (`_pilleKommt`); kommt der Hinweis „x neue Stories" [§C27], fährt es um ihn, und von der Pille geht zweimal ein Ring aus (`_hinweisBewegung`). Nichts davon läuft endlos.
- **Ein Blatt kommt gestaffelt** (`_blattStaffeln`, `.staffel-k`): die ersten acht Teile 45 ms auseinander; trägt ein Rahmen den ganzen Inhalt, zählen seine Kinder; das Profil behält seine eigene Folge; ein Rückblick stellt vor. Im Feed fährt beim Öffnen Licht in ihrer Farbe um die ungelesenen Stories im Bild, höchstens sechs, 200 ms nacheinander (`_feedLicht`), beim Filtern nicht noch einmal. Story und Auszeichnung öffnen mit Licht an ihrer Kante (`_fensterLicht`), innen, weil sie selbst scrollen; wer scrollt, beendet es. Geschlossen werden sie geleert (`_fensterZu`).
- **Ein Rückblick stellt vor** (`_vorstellung`, `VORSTELLUNG`, `openSheet` mit `vorstellung`): der Saison-Rückblick zuerst den Meister, groß in der Mitte (`.vs-gross`, Licht hinter ihm `.vs-spot`, sein Band einmal über ihn), der sich nach gut einer Sekunde auf seinen Platz setzt, ein Ring geht von ihm aus (`.vs-ring`); Platz 2 und 3 steigen dazu, Licht fährt um alle drei im Takt jedes Podests, der Kranz geht auf (`.vs-kranz`); nach 1,45 s das Team der Saison mit Licht und Glanz in Blau (`kl-blau`, `glanz-blau`), seine Partien Zelle für Zelle; ab 1,85 s der Rest, 70 ms auseinander. Der Wochenrückblick leiser (`woche`): der Held sofort, ohne größer zu werden, Licht innen an seiner Kante, ein Ring um sein Gesicht, ab 0,56 s der Rest. Ein anderer Monat aus dem Wähler im Blatt (`wechsel`): Kopf und Wähler stehen, der Meister steigt zuerst auf, ohne Auftritt. Zurück aus einem Blatt darüber und bei Bewegungsruhe stellt nichts vor. Gezeitet wird mit Klassen zu ihrer Zeit (`.vs-w` → `.vs-da`), nie mit wartendem `animation-delay`; ein Teil der Vorstellung (`.vs`) trägt sonst keine Bewegung. Was unter dem Rand steht, wartet still, auch alles darin — Balken, Linien, Zellen, Säulen —, und kommt, wenn es 40 px vor dem Rand hereinkommt (`_vsPlanen`, `_vsKommt`), mehrere nacheinander; die Tabelle mit Licht um Platz 1 bis 3 (`_vsLicht`), ein zugeklapptes Teil, wenn es aufgeklappt hereinkommt. Was nachkommt (`rcpSpaetLaden`), rechnet erst nach dem ersten Bildschirm (`_vorstellungRest`) und kommt ebenso beim Hereinscrollen (`_vorstellungNach`). Der Tag mit den meisten Partien trägt im Kalender einen Rand, der einmal aufleuchtet.
- **Was ein Blatt oder Fenster verdeckt, steht still** (`_verdecken`, `.steht`): was dort endlos läuft, hält das CSS über `animation-play-state` an, nie `pause()`, und nur diese Elemente, nicht den ganzen Bereich; das Licht darunter verlischt. Beim Schließen läuft es weiter.
- **Nur, was man sieht, bewegt sich** (`_bewegungBeobachten`, `_lichtBeobachten`): was endlos läuft und nicht im Bild steht, hält über dieselbe Klasse `.steht` an und läuft weiter, wenn es hereinkommt — bemerkt an seinem Beginn (`animationstart`), wo immer es entsteht, die Lage aus einem IntersectionObserver ohne Layout. Beobachtet wird das nächste HTML-Element, nie ein Pfad oder eine Gruppe in einem SVG: Safari meldet SVG-Inhalt nie als sichtbar. Ein Licht endet, wenn seine Karte das Bild verlässt; was in einem Blatt, Fenster oder Hinweis eben erst hereinfährt, behält es in seiner ersten halben Sekunde. Was der Browser in einer Karte mit `content-visibility:auto` ohnehin nicht zeichnet, rechnet er auch nicht.
- **Im laufenden Betrieb zieht hin und wieder eine leise Linie um etwas, das zählt** (`_leisesLicht`, `_leiseZiel`, `_leisePlanen`, `LEISE_KARTEN`, `.kl-leise`): alle 7 bis 12 s eine Runde in 6,5 s, sanft an- und auslaufend, schmaler und gut halb so hell wie beim Ankommen, ohne Rahmen. Die Ziele wechseln reihum (`LEISE_FOLGE`) und kommen aus dem offenen Reiter und seiner Ansicht: Platz 1 bis 3 in Liga und Positionen, die Duos oben, das Podest der Awards, die Rekorde oben; dazwischen die Pille „News", wenn etwas ungelesen ist, „Match eintragen" und das Zeichen der Liga — dieselben Bedeutungen wie beim Ankommen [§C41], nie zweimal dasselbe hintereinander, nie zwei Lichter zugleich. Es beginnt auch, während man scrollt oder tippt. Eine Karte nur ganz im Bild; ausgesetzt unter einem Blatt oder Fenster, im Verlauf, auf einer versteckten Seite und während eines Aufbaus, dann nächster Versuch nach 2 s. Geplant vom Öffnen an.
- **Neue Daten nehmen das Licht nicht mit:** zeichnet die App denselben Reiter neu, wechselt es an dieselbe Stelle der neuen Ansicht und läuft weiter (`_lichtMerken`, `_lichtZurueck`). Ein Wechsel nimmt es nicht mit: die neue Ansicht hat ihr eigenes.
- **Abbrechbar:** jede Berührung, jedes Scrollen beendet den Aufbau (`_vorfuehrungEnde`) und den Auftritt eines Rückblicks (`_vorstellungEnde`); alles im Bild steht sofort, wo es hingehört, auch was darin wachsen sollte, und was darunter wartet, kommt beim Hereinscrollen. Das Licht läuft zu Ende — es verdeckt nichts.
- **Nur Drehung, Verschiebung und Deckkraft** (`transform`, `opacity`); der Kegel des Lichts ist so groß wie die Diagonale seiner Karte, nicht größer. **An einem Element höchstens eine Bewegung auf `transform`**: zwei — auch wenn eine davon längst steht und nur ihren Endwert hält — rechnet Chromium jedes Bild im Hauptthread; Kommen und Atmen der Zeichen am Ring liegen deshalb auf zwei Elementen (`.pp-av-mark`, `.pp-av-mark > .d`).
- **Eine Karte im Feed bewegt sich nur im Bild** (`_feedKartenSicht`, `.im-bild`, `.nf-liste.sicht`): bis der Beobachter sie hereinmeldet, steht alles in ihr still, auch was sie beim Ankommen aufbaut. Dieselbe Auswahl wie `content-visibility`: was Chromium überspringen kann, erreicht kein `.steht` mehr.
- **Bewegung lässt nichts verschwinden: kein Teil mit eigener Ebene in einem runden Ausschnitt ohne eigenen Stapel.** Was in einem Kreis, einer Karte oder einem Balken mit `overflow:hidden` und runden Ecken liegt und `z-index` oder `filter` trägt, gehört dem Stapel dieses Ausschnitts — der Ausschnitt trägt `isolation:isolate` oder ist ohnehin ein Stapel —, oder es trägt beides nicht. Das Gesicht (`.av.av-emoji`) hat gar keine Ebene darin: Glanz und Grund sind zwei Hintergründe des Kreises, das Emoji ein gewöhnliches Kind mit Textschatten.
- **Kein Schein über `filter`:** Symbole, Emojis, Marken und Zeichen, die nicht Teil einer Zeichnung sind, tragen ihren Schein als Text- oder Kastenschatten oder als Lichthof im Hintergrund (`radial-gradient`), nie als `drop-shadow`. Ein `filter` macht ein Teil für Safari zu einer eigenen Ebene. Was innerhalb eines SVG leuchtet (Feuer, Kurvenpunkte, Linien), wird mit seiner Zeichnung gemalt und darf.
- **Was noch nicht leuchtet, trägt keine Bewegung** (`_lichtWartet`, `.kl-wartet`): Licht und Band über Gold liegen bis zu ihrem Einsatz ohne Kasten (`display:none`) in ihrer Karte und beginnen dann ohne Verzögerung; das Band über dem Ersten des Podests ruht, bis die Karte steht. Im ersten Bild eines Aufbaus trägt jede Karte nur ihr eigenes Einblenden — Platz 1 nicht mehr als Platz 2.
- **Bei Bewegungsruhe** (`prefers-reduced-motion`) steht alles sofort, ohne Licht.

## Stellen

`src/index.html` (Oberfläche im ersten Bild), `09d-bewegung.js` (`_startBereit`, `_startGeruest`, `kantenlicht`, `_aufbauen`, `_podestLicht`, `_glanzEinmal`, `_lichtMerken`, `_lichtZurueck`, `_bewegungNachRender`, `RUHIGE_REITER`, `_vorfuehrungEnde`, `_navSchlitten`, `_ladeStart`, `_ladeEnde`, `_wechselBeginnt`, `_wahlSofort`, `_wechselSteht`, `_connBewegung`, `_pilleKommt`, `_hinweisBewegung`, `_blattStaffeln`, `_feedLicht`, `_fensterLicht`, `_verdecken`, `_fensterZu`, `_bewegungBeobachten`, `_feedKartenSicht`, `FEED_SICHT`, `_lichtBeobachten`, `_lichtWartet`, `_leisesLicht`, `_leiseZiel`, `_leisePlanen`, `_metallTon`, `VORSTELLUNG`, `_vorstellung`, `_vsBuehne`, `_vsHeld`, `_vsWarten`, `_vsDirekt`, `_vsPlanen`, `_vsKommt`, `_vsLicht`, `_vorstellungNach`, `_vorstellungRest`, `_vorstellungEnde`, `_vorstellungAus`), `06-db.js` (`showSeasonRecap`), `07b-rueckblick.js` (`showPotwRecap`), `05b-recap-teile.js` (`rcpSpaetLaden`, `rcpKalenderHtml`, `rcpTeamHtml`), `30-news-ui.js` (`newsBadgeRefresh`, `_newsToastZeigen`), `30a-news-karte.js` (`_renderNewsFeed`, `_newsFeedRest`), `16-sheet-infra.js` (`openSheet`, `_sheetForceClose`), `31-news-detail.js`, `18a-badge-popover.js`, `09-ui-infra.js` (`render`, `renderNav`, `_renderNachEingabe`, `schlittenFahren`), `06-db.js` (`setConn`), `05-nav-sheet.css` (der Schlitten), `06c-stand.js` (kein Stand → Gerüst), `37-boot.js` (`_startBereit`), `00-prolog.js`, `01-shell.css` (das Zeichen), `17-bewegung.css`; die runden Ausschnitte mit eigenem Stapel: `02-ranking.css` (`.av.av-emoji`), `06-misc.css` (`.pp-av-inner`, `.av-opt`, `.pp-pos-combined`, `.pp-rd`, `.pp-rank-card`, `.pp-slider`), `07-icons-profil.css` (`.nf-card`, `.bsh-card`, `.nd-chance-b`), `11-chronik.css` (`.lchron-wrap`); der Schein ohne `filter`: `05-nav-sheet.css` (`.ach-toast-ic`), `06-misc.css` (`.pp-tr .ic`), `07-icons-profil.css` (`.pp-tr .ic.svg-ic`, `.bsh-card-ic`, `.nf-gross-band svg`), `08-highlights.css` (`.hof-av .em`, `.hof-pod-av .em`), `09-recap.css` (`.nd-ms-band svg`), `10-award-sheet.css` (`.aw-winner-crown`, `.aw-winner-shared-marker`), `11-chronik.css` (`.tmark`, `.pp-av-mark`), `15-zeichen.css` (`.zn-ti`).

## Prüfung

`tests/start` (die Kopfleiste steht mit dem Zeichen, bevor ein Skript läuft, ohne Bild davor, die Pille „News" schon als Gerüst, still, ohne Ebene neben sich; mit dem Stand steht sie, bevor das Netz antwortet; ohne Stand das Gerüst, bis die Datenbank antwortet; beim Öffnen baut sich die Liga auf, mit Licht im Metall um Platz 1 bis 3, um das Zeichen und den Knopf; auch direkt nach dem Schließen wieder; nach seiner Zeit nichts übrig, auch kein leeres style-Attribut; der Punkt oben links beim ersten „verbunden"; bei Bewegungsruhe nichts davon; der Start lädt das große Symbol nicht), `tests/blatt` (im Feed läuft endlos nur, was im Bild steht, auch wenn das Öffnen das Layout erzwingt; im Profil trägt kein Element zwei Bewegungen auf `transform`; ein über die Leiste betretener Reiter baut sich auf, mit Licht im Metall, dessen Kegel die Karte deckt; nur transform und opacity; neue Daten nehmen das Licht nicht mit; nach seiner Zeit nichts übrig, gleich zurück kein zweites Mal; der leuchtende Schlitten steht unter dem gewählten Knopf; rechnet ein Reiter lange, fährt der Schlitten sofort und Schleier und Ladelinie überbrücken, und steht er, sind beide fort; ein Wechsel im Reiter wählt den Knopf vor der Rechnung, der Schleier beginnt unter dem Wähler, der Schlitten fährt über das Neuzeichnen hinweg weiter; die neue Liste baut sich unter dem stehenden Wähler auf, mit einem Licht je Platz und keinem alten; ebenso eine vergangene Saison und die Rekorde; dieselbe Wahl und neue Daten bauen nichts auf; dieselbe Ansicht glänzt erst nach der Pause wieder; um den Hinweis auf neue Stories fährt Licht, von der Pille ein Ring, nichts läuft endlos, die Pille gleitet herein, bei Bewegungsruhe nichts davon; der Feed kommt gestaffelt, mit Licht um die ungelesenen Stories im Bild, ohne eine Karte höher zu machen, beim Filtern nicht noch einmal; was das Blatt verdeckt, steht still und läuft danach weiter, und wechselt darunter eine Klasse, läuft danach nur die neue Bewegung; Story und Auszeichnung öffnen mit Licht genau an ihrer Kante, das ihnen nichts zu scrollen gibt und beim Scrollen endet, und sind geschlossen leer; im laufenden Betrieb eine leise, langsame Linie um eine Karte, die zählt und ganz im Bild steht, deren Licht endet, wenn sie das Bild verlässt, reihum zwischen den Plätzen, der Pille mit Neuem, dem Knopf und dem Zeichen, nie zweimal dasselbe hintereinander, nie um eine angeschnittene Karte, die Karte aus dem offenen Reiter und seiner Ansicht — auch gleich nach einer Berührung, nicht neben anderem Licht, nicht unter einem Blatt, alle 7 bis 12 s und nach einem ausgesetzten Versuch nach 2 s, nicht bei Bewegungsruhe; im Feed und im Profil steht, was endlos läuft und nicht im Bild ist, und läuft wieder, wenn es hereinkommt; mit einem Beobachter, der SVG-Inhalt wie Safari nie sichtbar meldet, läuft das Feuer im Profilkopf, und kein SVG-Inhalt wird beobachtet; kein Teil mit z-index oder Filter liegt in einem runden Ausschnitt ohne eigenen Stapel — in jedem Reiter, im Feed, in Stories jeder Art und den Blättern, mit Emoji als Gesichtern; kein Symbol, Emoji oder Zeichen trägt seinen Schein über `filter`; im ersten Bild trägt jede der ersten drei Karten nur ihr eigenes Einblenden, Licht und Band warten ohne Kasten und laufen danach — in Liga, Positionen, Duos und Awards; der Saison-Rückblick stellt vor, Bild für Bild gemessen: der Meister groß in der Mitte, dann auf seinem Platz, Platz 2 und 3, der Kranz, das Team, dann der Rest, nach weniger als zweieinhalb Sekunden, und danach wartet nichts im Bild; was nachkommt, rechnet erst nach dem ersten Bildschirm; unter dem Rand wartet die Tabelle still und kommt beim Hereinscrollen, mit Licht um Platz 1 bis 3; eine Berührung beendet die Vorstellung, alles im Bild steht sofort; die Woche stellt leiser vor, mit Licht und Ring um den Helden; ein anderer Monat ohne Auftritt, mit stehendem Kopf; zurück aus einem Blatt darüber und bei Bewegungsruhe nichts davon), `tests/start` (das Öffnen plant das leise Licht, Bewegungsruhe nicht; der Start zeichnet keine Zeichen der Laufbahn vor, das Profil die seines Rangs, und geschlossen zeichnet niemand weiter).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Beim Öffnen war bis zum ersten Skriptbefehl nur der dunkle Grund zu sehen:
`#app` war bis dahin versteckt, und auf einem Mittelklasse-Telefon dauert das
Übersetzen des Skripts rund eine halbe Sekunde. Danach stand die Liga mit
einem Schlag da. Gemessen (Chromium, CPU vierfach gedrosselt) malt die Seite
ihr erstes Bild bei 160 bis 290 ms, der erste Skriptbefehl läuft bei 400 bis
550 ms: was festes Markup ist, steht also, bevor das Skript übersetzt ist.

Der Entwurf (`mockup/start/`) überbrückte diese Zeit mit einem Startbild —
dem Zeichen der Liga in der Mitte, das danach in die Kopfleiste flog. Im
Einbau stand es zwischen dem Öffnen und der Liga; gewünscht war, dass die
Oberfläche sofort da ist. Es ist entfernt, und die Kopfleiste selbst steht
im ersten Bild. Ihr Zeichen war `icon.png` mit 1254 px und 1,2 MB — eine
eigene Anfrage und eine volle Dekodierung für ein Bild von 38 px — und kam
sichtbar später als alles andere; jetzt steht ein Bild von 7 kB in der Seite.

Eine Sperre zeigte nach einem Öffnen in den letzten fünf Minuten keine
Vorführung. Wer die App schloss und gleich wieder öffnete, sah nichts und
hielt die Effekte für kaputt. Sie läuft jetzt bei jedem Öffnen. Das Podest
glänzte zuerst einmal je Reiter und Sitzung: wer später zur Woche oder
zurück zur Saison kam, sah nie wieder Licht. Je Ansicht mit 45 s Pause
sieht es, wer ankommt, und nicht, wer zwischen zwei Ansichten hin- und
herschaltet.

Die Vorführung gehört echten Anlässen: dem ersten Bild eines Starts und
jedem Wechsel, den ein Tippen wählt. Zuerst baute sich nur ein über die
Leiste betretener Reiter auf; Zeitraum, Saison, Spieler und Duos, Awards,
Rekorde und Chronik wechselten ohne jede Bewegung, und auf einem langsamen
Telefon stand nach dem Tippen auf „Gesamt" alles still, bis gerechnet war —
auch der gedrückte Knopf. Ein `render` von anderswo — neue Daten, die
Prüfumgebungen der Tests, die die Ansicht direkt zeichnen — baut weiter
nichts auf. Das Verblassen der ganzen Liste bei jedem Filter wirkte schon
einmal wie ein Neustart (01-shell.css); deshalb stehen Überschrift und
Wähler, und nur was darunter neu ist, kommt.

Beim ersten Einbau der inneren Wechsel wanderte das Licht der alten Ansicht
mit in die neue: dieselbe Stelle im Baum ist in der Woche ein anderes
Element als in der Saison, und Platz 1 der Woche trug sein Licht und das
der Saison. Eine vergangene Saison steht in einem Rahmen ohne Kasten
(`display:contents`); als ein Teil bewegte er nichts sichtbar und nahm die
Wähler mit. Die Rekorde kamen als drei große Blöcke statt Karte für Karte.

Der Schlitten eines Wählers fuhr vorher erst nach der Rechnung los. Fährt er
sofort, zeichnet das Neuzeichnen einen neuen Wähler mitten in der Fahrt; er
sprang dann ans Ziel. Er fährt jetzt dort weiter, wo der alte war: seine
Transition beginnt um die vergangene Zeit später, gezählt ab dem Bild, mit
dem der Compositor die Fahrt übernahm. An der alten Transition ist der
Stand nicht abzulesen — solange der Hauptthread rechnet, steht sie für ihn
noch am Start, während sie im Bild längst fährt.

Gemessen (vierfach gedrosselt, verschachtelt, Median aus 16) kostet die
Bewegung eines inneren Wechsels 20 bis 30 ms bis zum ersten Bild, innerhalb
der Streuung: Awards 230 statt 201 ms, Rekorde 192 statt 170 ms. Der Aufbau
läuft etwas ruhiger als beim ersten Einbau (45 statt 30 ms Abstand, 0,56
statt 0,42 s je Teil); schneller wirkte er auf dem Telefon hektisch.

Das Kantenlicht war zuerst nur im Profilkopf. Als Bauteil [§C27] trägt es
überall dieselben Bedeutungen; eine weitere machte jede unklar. Nach gut einer
Sekunde war es im Entwurf vorbei, bevor man die Karte angesehen hatte — es
steht deshalb einige Sekunden und blendet dann langsam aus. Kam in dieser
Zeit die Antwort der Datenbank, zeichnete die App die Liste neu, und das
Licht verschwand mitten im Leuchten mit den alten Zeilen; es wechselt jetzt
an dieselbe Stelle der neuen Liste. Ein Kegel so groß wie im Profilkopf
(1400 px) kostete bei dreifacher Pixeldichte ein Vielfaches an Speicher.

Beim Reiterwechsel blieb auf einem langsamen Telefon die alte Pille
gemessen 640 ms stehen: jeder Knopf trug seine eigene, und ihr Umfärben
wartete wie alles andere auf das Ende der Rechnung. Ein Schlitten, der nur
verschoben wird, fährt auf dem Compositor, ohne den Hauptthread. Gemessen
(vierfach gedrosselt, warme Reiter, Median aus 30) bleibt der Wechsel gleich
schnell: 57 ms bis zur neuen Ansicht, 136 ms bis zum gemalten Bild (vorher
141 ms).

Die Pille „News" erschien zuerst unvermittelt, sobald die Stories mit der
Datenbank abgeglichen waren — nach dem Netz, sichtbar später als alles
andere, und bis dahin war an ihrer Stelle eine Lücke. Sie steht jetzt als
Gerüst da und füllt sich; mit dem Stand des Geräts gemessen 34 ms nach der
Liga, ohne Stand (allererster Start) nach dem Abgleich. In ihrem Gerüst lief
zuerst derselbe Schimmer wie im Gerüst der Liga, eine Ebene, die links neben
der Pille beginnt und von ihrem runden Rand abgeschnitten werden sollte.
Safari auf dem iPhone schnitt die laufende Ebene dort nicht ab, und solange
der Start den Hauptthread hielt, stand ein heller Streifen fünf Sekunden
lang still neben der Pille in der Kopfleiste. Das Gerüst der Liga hat keinen
runden Rand, und sein Streifen beginnt links außerhalb des Bilds.

Nach dem Öffnen stand die Liga still, bis man etwas antippte; gewünscht war,
dass die Lichter hin und wieder an einzelnen Karten wiederkommen, als leises
Spiel, das nicht stört. Es ist dieselbe Zeichnung mit derselben Bedeutung —
eine dritte hätte jede unklar gemacht [§C41] — und nie dort, wo jemand
gerade etwas tut. Zuerst kam alle 30 bis 55 s das Licht des Ankommens, nur
halb so hell, immer um Platz 1 bis 3: zu selten, um die Liga lebendig
wirken zu lassen, und mit seinen drei Runden und dem aufleuchtenden Rahmen
zu schnell, um ruhig zu sein. Jetzt kommt es öfter, aber als eine einzige,
langsame Runde ohne Rahmen, und wandert über das, was zählt. Ein laufendes
Licht kostet den Hauptthread nur den Grundpreis jeder Animation in Chrome,
gleich ob Ring, Schein oder beides (gemessen vierfach gedrosselt rund 8 ms
je Sekunde, ohne Licht unter 1 ms): kein Stil, kein Layout, kein Malen.
Es wartete danach noch 4 s nach jeder Berührung: wer sich durch die App
bewegte, sah es nie. Und es kannte nur Karten der Rangliste, der Duos und
des Podests; in Rekorden und Verlauf zog es um Pille, Knopf und Zeichen,
nie um das, was der Reiter zeigt.

Was endlos läuft, lief auch, wo es niemand sah. Im Feed waren es 24 bis 27
Bewegungen der Karten — Glanz, Atmen, Puls —, die meisten weit außerhalb
des Bilds; Chrome hält sie dort nicht an. In Ruhe kostet das wenig, denn
der Compositor dreht sie, aber jedes Bild beim Scrollen rechnete sie alle
auf dem Hauptthread mit. Gemessen (vierfach gedrosselt, 40 Schritte durch
den Feed) sank mit dem Anhalten der Hauptthread von rund 1060 auf 620 ms je
Sekunde, die Bilder über 34 ms von rund 90 auf 34 bis 42, das längste von
517 bis 700 auf 117 bis 200 ms.
Im ersten Einbau beobachtete der Beobachter das bewegte Element selbst. Die
Bilder des Feuers sind Pfade im SVG des Avatars, und Safari meldet SVG-Inhalt
dem IntersectionObserver nie als sichtbar: auf dem iPhone stand das Feuer im
Profilkopf und in der Rangliste still, in Chromium lief es.

Blätter und die beiden Fenster liegen hinter einem Vorhang mit Unschärfe,
und jedes Bild einer Bewegung darunter rechnete sie neu — die Lichter über
Titeln in den Awards, der Puls des Punkts oben links. Angehalten wurde
zuerst mit `pause()` und `play()`: danach pulsierte der Punkt auch nach
„verbunden" weiter, und wechselte seine Klasse unter dem Blatt, liefen zwei
Pulse nebeneinander, die der Hauptthread in jedem Bild rechnete. Chrome
löst eine CSS-Animation, die einmal über die Schnittstelle gesteuert wurde,
von ihrer Regel. Jetzt hält das CSS an, und zwar nur, was läuft: eine
Klasse am ganzen verdeckten Bereich rechnete den Stil jedes Knotens neu,
in den Awards gemessen 65 ms beim Anhalten und 45 ms beim Fortsetzen
(vierfach gedrosselt) — das Fortsetzen mitten im Zuschieben des Blatts. An
den laufenden Elementen allein sind es 6 und 1 ms. Geschlossen behielten Story und
Auszeichnung ihren Inhalt, unsichtbar und mit allem, was darin endlos lief.
Ihr Licht lag im ersten Einbau im Fluss: der Inhalt einer Story steht über
ihrem Motiv (`.nd > *`, relative), und der Ring wurde ein vier Pixel
breiter Block am Ende, der dem Fenster Höhe zum Scrollen gab; in den Karten
des Feeds machte dieselbe Regel die Karte höher.

Gemessen wird beim Aufbau nichts: welche Teile im Bild stehen, sagt die
Reihenfolge. Eine vererbte Variable als Verzögerung ließ im Entwurf jeden
Knoten darunter seinen Stil neu rechnen, und ein Messen des Layouts im
ersten Bild kostete gemessen bis zu 1,3 s Hauptthread.

Auf dem iPhone standen Gesichter manchmal als leere graue Kreise da — im
Feed, im Blatt einer Partie, in der Liste eines Tafel-Moments —, in
derselben Karte daneben die Gesichter der Monatstabelle vollständig. Das
Emoji eines Gesichts lag mit `z-index:2` und einem `filter` über dem Kreis,
sein Glanz als `::after` mit `z-index:1`, und der Kreis selbst war kein
Stapel: beide Ebenen gehörten dem Stapel der Karte oder des Fensters. Läuft
dort eine Bewegung — der Aufbau, die Nadel der Siegchance, ein Licht an der
Kante —, legt Safari jedes Teil, das danach gemalt wird und sie überdecken
könnte, auf eine eigene Grafikebene, und die muss der runde Rand des
Kreises von außen schneiden. Genau diese Ebenen zeichnete es manchmal gar
nicht: übrig blieb der graue Grund. In der Monatstabelle liegt jedes
Gesicht in einem verschobenen Behälter, der damit sein eigener Stapel ist —
dort fehlte nie eines. Eine Suche über alle Reiter, den Feed, jede Art von
Story und die Blätter fand dasselbe Muster an 699 Gesichtern und in zehn
weiteren Behältern: das große Gesicht im Profil und die Auswahl der
Gesichter, Zeichen mit Schein auf den Auszeichnungskarten, Teile im Profil,
der Strich auf dem Balken der Siegchance, die stehende
Namensspalte der Chronik und die Teile der Karten ohne `content-visibility`
(Breaking, große Karten). Chromium zeichnet all das richtig, deshalb fiel
es in keiner Suite auf; geprüft wird jetzt das Muster selbst.

Der Stapel allein half den Zeichen nicht. Auf den goldenen Karten im Blatt
der Auszeichnungen fehlte das Zeichen weiter oder kam spät, obwohl jede
Karte ihr eigener Stapel war: das Zeichen trug seinen Schein als
`drop-shadow`, und ein `filter` macht ein Teil für Safari zu einer eigenen
Ebene — dieselbe Ebene, die schon das Emoji im Gesicht verloren hatte. Der
Schein steht jetzt als Lichthof im Hintergrund, als Text- oder
Kastenschatten; Kronen, Marken in der Rangliste, die Sterne unter jedem
Wappen und das Zeichen im großen Band trugen denselben `filter`.

Platz 1 kam auf dem iPhone in jedem Reiter sichtbar nach Platz 2 und 3. Licht
und Band legte `_podestLicht` vom ersten Bild an in ihre Karte und ließ sie
über `animation-delay` warten — eine wartende Animation ist für Safari schon
eine laufende, mit eigener Ebene. Jede der drei Karten trug damit im ersten
Bild Kegel, Schein und Rahmen, Gold dazu das Band, zweieinhalb Karten
breit; im Podest der Awards lief über dem Ersten außerdem das dauerhafte
Band. In Chromium kam Platz 1 trotzdem zuerst — gemessen 308 gegen 358 ms
—, auf dem Telefon nicht.

Der Saison-Rückblick kam zuerst wie jedes andere Blatt, acht Teile 45 ms
auseinander, der Meister als eine Karte auf dem Podest unter vielen.
Gewünscht war eine Vorstellung, die das Wichtigste zuerst zeigt — der
Meister groß, der sich auf seinen Platz setzt, dann das Team der Saison,
dann alles andere —, schön und flüssig, aber nicht nervig und nicht zu
lang, und für die Woche dasselbe weniger spektakulär. Nach gut einer
Sekunde steht der Meister, ab 1,85 s kommt der Rest; wer
früher weiter will, tippt oder scrollt. Beim Durchblättern der Monate im
Blatt kam der große Auftritt jedes Mal wieder, zwei Sekunden je Monat, und
der Kopf mit dem Monat, auf den man eben getippt hatte, blendete aus und
wieder ein: der Wechsel stellt deshalb ohne Auftritt vor, und der Kopf
steht. Zurück aus einem Profil kam der Auftritt ebenfalls wieder.

Unter dem Rand wuchsen Balken, Linien, Zellen und Säulen beim Öffnen, wo
niemand sie sah; wer hinunterscrollte, fand fertige Bilder. Gemeldet erst
an der unteren Kante, stand beim Scrollen eine halbe Sekunde lang eine
leere Fläche, wo die Tabelle hingehörte — sie kommt deshalb 40 px früher.
Was nachkommt, kostet beim ersten Öffnen gemessen 790 ms Hauptthread
(vierfach gedrosselt, Juli); zur alten Zeit gerechnet, 380 ms nach dem
Öffnen, hielte es die Zeitgeber der Vorstellung so lange an, und Platz 2,
Platz 3 und der Kranz kämen auf einmal. Es rechnet deshalb nach dem ersten
Bildschirm.
