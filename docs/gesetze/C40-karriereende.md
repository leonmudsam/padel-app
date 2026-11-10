# §C40 Das Karriereende: vier Regeln, mehr gibt es nicht

## Regel

- Gespeichert werden nur der Zeitpunkt (`players.retired_at`) und der Stand des Profils (`players.retired_stand`); alles andere folgt aus vier Regeln.
- 1. Ein Zeitraum (Tag, Woche, Monat) fragt `sichtbar`: wer darin gespielt hat, steht darin und kann ihn gewinnen, auch nach dem Karriereende. Eine Monatschronik bleibt dem, der sie geholt hat.
- 2. Ein Laufbahn-Vergleich (Ewige Tafel, Gesamt, Rangstufen, Liga-Rekorde, Prestige-Rang, Teams- und Positionslisten, Wertungen über die Laufbahn, Spielerwahl, Fun Facts, Insignium-Meldungen) fragt `ligaAktiv` ohne Zeitpunkt, auch in einem Zeitschnitt. Die Abfrage steht in den Engines, ein neuer Eintrag erbt sie.
- Dazu gehören die Bestwerte im Profil eines Aktiven: bester und schwächster Partner, Lieblings- und Angstgegner (`bestWorstMate`, `nemesis` mit `wer`), Erz- und Lieblingsgegner eines Duos aus zwei Aktiven (`teamDetail`), die laufende Reihe gegen denselben Gegner (`_badgeStreakState`) und das Feld des Fingerabdrucks (`fingerFeld`). Die Bilanz mit jedem („alle Beziehungen", `playerH2HList`) fragt nicht. Das Profil eines Ruheständlers und ein Duo mit ihm fragen `sichtbar`; in seinem eigenen Fingerabdruck steht er mit im Feld.
- 3. Das Profil steht im gespeicherten Stand: der Karriere-Teil beim Klick (`_ruheKarriereBauen`, `karriereSetzen`), der Abschluss-Teil nach `ruhestandAbschlussMs` einmal geschrieben (`_ruheAbschliessen`). Danach rechnet für ihn nichts mehr; gültig nur mit `RUHE_STAND_FASSUNG` und genau diesem Karriereende. Ein Rekord, den der Katalog nicht mehr führt, fällt auch aus seinem Stand und zählt kein Prestige (`chroniclesOfPlayer`) [§C35].
- 4. Nach dem Abschluss nennt ihn keine Story mehr außer der seines Karriereendes (`ohneStoriesNachAbschied`, ein Tor im Generator und in `_consolidateStories`). Gesucht wird in dem, was die Story sagt, nicht in ihrer gespeicherten Zeichnung (`visual`): sonst fiel die Karte einer Partie anderer weg, weil ihr Fuß ihn in einer Rangliste trug; die Ranglisten eines Fußes lassen ihn nach dem Abschluss selbst weg (`_spNoch`).
- Eine Partie nach dem Karriereende gibt es nicht (`imRuhestandAm`). Gelöscht wird nur, wer nie gespielt hat (`spielerLoeschen`, gefragt bei der Datenbank). Kehrt er zurück, gilt wieder die Liga von heute.
- Er steht als zugeklappter Einblick am Ende von Gesamt, Positionen, Teams und Chronik-Matrix, ohne Platz; seine Serie brennt nicht. Die Story `karriereende_<Spieler>_<Tag>` ist Breaking und gilt nur, solange das Karriereende gilt (`_storyWiderrufen`); das Blatt ist `zeigeAbschied`.
- Wer etwas Neues baut, entscheidet nur: Zeitraum oder aus seinen Partien (`sichtbar`), oder Laufbahn-Vergleich (`ligaAktiv`). Eine rohe `.hidden`-Abfrage gibt es nicht.

## Stellen

`06b-ruhestand.js`, `18b-abschied.js`, Spalten aus `datenbank/karriereende.sql`.

## Prüfung

`tests/ruhestand` (die vier Regeln an den echten Partien, Profil zwei Monate und eine Fassung später Wort für Wort gleich), `tests/ruheliga` (kein Ruheständler auf dem Bildschirm außerhalb von `[data-ruhestand]` und `[data-bis]`, kein Bestwert mit ihm im Profil eines Aktiven), `tests/blatt` (Abschied bei 360 px).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Wer die Gruppe verlässt, spielt keine Partie mehr. Löschen oder Ausblenden
(`hidden`) nähme auch seine Geschichte; Ausblenden bleibt der Weg für einen
versehentlich angelegten Spieler. Gespeichert werden der Zeitpunkt
(`players.retired_at`) und der Stand des Profils (`players.retired_stand`,
Spalten aus `datenbank/karriereende.sql`); alles andere folgt aus den Regeln.
1. **Ein Zeitraum braucht keine Abfrage** (`sichtbar`). Tag, Woche, Monat:
   wer darin gespielt hat, steht darin — Tabelle, Awards, Player of the Day
   und Week, Meister, Monatschronik, Positionsverlauf, Rückblick, die
   Tabelle vor und nach jeder Partie —, auch nach seinem Karriereende, und
   er kann ihn gewinnen. Danach spielt er nicht mehr und kommt in späteren
   Zeiträumen von selbst nicht vor. Ebenso alles, was aus seinen Partien
   entsteht: Serien, Jubiläen, Meilensteine, Auszeichnungen und wer sie
   trägt. **Eine Monatschronik bleibt dem, der sie geholt hat**: wer im
   Juni Chroniken holt und aufhört, behält sie, und kein Nächstbester
   rückt nach, der sie in diesem Monat nicht verdient hat — die
   Monatsrechnung fragt deshalb `sichtbar` und nie `ligaAktiv`. Eine frühere Fassung fragte hier nach dem Ende jedes Zeitraums,
   an über zwanzig Stellen, und ließ ihn den Monat und die Woche seines
   Karriereendes verlieren, obwohl er darin gespielt hatte.
2. **Ein Laufbahn-Vergleich ist ohne ihn, ab dem Karriereende**
   (`ligaAktiv`, ohne Zeitpunkt): Ewige Tafel und Gesamt, Rangstufen,
   Liga-Rekorde, Prestige-Rang, die Teams- und Positionslisten, die
   Wertungen über die ganze Laufbahn (`getCachedAwardRankings('all')`), die
   Spielerwahl, die Fun Facts und die Insignium-Meldungen. Auch in einem
   Zeitschnitt: ein Laufbahn-Vergleich vergleicht mit der Liga von heute,
   sonst meldete der Feed Übernahmen, die niemand gespielt hat. Diese
   Abfrage steht in den Engines (`_chronicleCtx`, `_rangTabelle`,
   `prestigeTabelle`, die Award-Rangliste); ein neuer Rekord, eine neue
   Chronik, ein neuer Award läuft durch sie und erbt die Regel.
   **Auch ein Bestwert im Profil eines Aktiven ist ein solcher Vergleich.**
   Bester und schwächster Partner, Lieblings- und Angstgegner, Erz- und
   Lieblingsgegner eines Duos, die laufende Reihe gegen denselben Gegner und
   der Platz im Feld des Fingerabdrucks rechneten mit allen, die je gespielt
   hatten: im Profil eines Aktiven stand ein Ruheständler als bester
   Partner, mit dem niemand mehr spielt, eine Reihe gegen ihn lief nie
   weiter und riss nie, und im Fingerabdruck stand er als Punkt im Feld und
   schob die anderen um einen Platz nach hinten.
   Die Bilanz mit jedem steht weiter in „alle Beziehungen" — dort ist er
   Geschichte, kein Bestwert. Sein eigenes Profil und ein Duo mit ihm
   zeigen die Laufbahn, wie sie war (`sichtbar`); seinen eigenen
   Fingerabdruck misst die aktive Liga und er selbst.
3. **Sein Profil steht im gespeicherten Stand, in zwei Teilen.**
   - *Karriere*, beim Klick (`_ruheKarriereBauen`, mit dem Zeitpunkt in
     EINEM Schreiben, `karriereSetzen`): was ein Vergleich mit der Liga war —
     die Rekorde, die er hielt, samt Halterzahl, Rangstufe, Perzentil,
     Prestige-Platz. Gerechnet mit der gewöhnlichen Rechnung, solange er
     noch ein Spieler wie jeder ist; keine zweite Rechnung, kein Zeitschnitt.
   - *Abschluss*, sobald jeder Zeitraum zu ist, in dem er gespielt hat
     (`ruhestandAbschlussMs`: Ende der Woche und des Monats seines
     Karriereendes, plus der Tag, an dem deren Rückblicke erscheinen),
     einmal nach dem Laden geschrieben (`_ruheAbschliessen`): was er selbst
     gespielt hat — Auszeichnungen und ihr Katalog mit der Klasse von
     damals (`badgeKatalog`), Prestige mit Insignium, Fingerabdruck.
   Bis zum Abschluss rechnet sein Profil wie jedes, nur mit den Rekorden aus
   dem Karriere-Teil (`prestigeTabelle().ruhe`): das Karriereende selbst
   ändert sein Prestige nicht. Danach rechnet für ihn nichts mehr — eine
   neue Fassung der App, ein neuer Katalogeintrag, ein anderer Startwert
   ändern sein Profil nicht; eine neue Gestaltung schon, das ist gewollt.
   Die Stufe gilt über ihren Schlüssel (`insignie.key`), nicht über ihre
   Zahl, damit eine neue Stufe in der Leiter nicht auf den Nachbarn zeigt.
   „Diese Saison" heißt im Profil die Saison seines Karriereendes, und der
   Saisonverlauf zeigt jede seiner eigenen Saisons. `prestigeOf`,
   `chroniclesOfPlayer`, `chronicleOf`, `getPlayerRank`, `getCachedBadges`
   und `fingerabdruck` lesen für ihn aus dem Stand. Gültig ist ein Stand nur
   mit seiner Fassung (`RUHE_STAND_FASSUNG`) und für genau dieses
   Karriereende; ohne Stand — nur bei einem von Hand gesetzten Zeitpunkt —
   zeigt das Profil keine Rekorde und keinen Rang. Fehlt die Spalte, wird
   nichts gesetzt, und der Hinweis nennt die SQL-Datei.
4. **Der Feed nennt ihn nach dem Abschluss nicht mehr**
   (`ohneStoriesNachAbschied`), außer in der Karte seines Karriereendes: ein
   Tor für alles, im Generator, bevor gespeichert wird, und in
   `_consolidateStories` für Zeilen aus der Datenbank. Bis zum Abschluss
   erzählt er noch von den Zeiträumen, in denen er gespielt hat. Kein
   Story-Typ fragt selbst.
**Eine Partie nach dem Karriereende gibt es nicht** (`imRuhestandAm`): die
Eingabe bietet ihn nicht an, das Bearbeiten einer Partie danach auch nicht;
wer schon in der Partie steht, bleibt wählbar. Genau das trägt Regel 1.
Wird eine Partie von VOR dem Karriereende nach seinem Abschluss korrigiert,
ändert das die Zeiträume (Regel 1), aber nicht seinen gespeicherten Stand —
der bleibt, wie er beim Abschluss war.
**Wer eine neue Ansicht, Story oder Wertung baut**, entscheidet eine Frage:
ist es ein Zeitraum oder etwas aus seinen Partien (`sichtbar`), oder ein
Vergleich über die Laufbahn (`ligaAktiv`)? Mehr ist nicht zu tun. Eine rohe
`.hidden`-Abfrage lässt `tests/ruhestand` nicht zu.
**Was auf dem Bildschirm steht, wird abgesucht** (`tests/ruheliga`): nach
seinem Abschluss, während die anderen weiterspielen, jeder Reiter aus
`NAV`, jeder Knopf darin bis zur Tiefe drei und die Spielerwahl. Erlaubt ist
er nur in `[data-ruhestand]` (die Liste der Ruheständler,
`EINBLICK.….ruhestand`, und der Hinweis der Spielerwahl, wer seinen Namen
tippt: „… hat die Karriere beendet" statt „Kein Treffer") und in `[data-bis]`, einem Stück Geschichte, das
spätestens mit seinem Abschluss endet (`geschichteHtml`: ein vergangener
Monat in Liga und Awards, eine vergangene Woche, die Zeile der
Chronik-Matrix bis zu ihrem letzten Eintrag), und im Verlauf
(`GESCHICHTE`). Eine neue Ansicht, die ihn zeigt, fällt auf, ohne dass der
Test sie kennt. `tests/ruhestand` zeichnet Profil, Laufbahn,
Auszeichnungen, Bilanzen und Abschied nach dem Abschluss und noch einmal
zwei Monate und eine neue Fassung der App später und vergleicht den Text.
**Kehrt er zurück** (beide Spalten leer), gilt wieder die Liga von heute:
Auszeichnungen und Chroniken bleiben, die Rekorde werden gegen das Feld
von heute gerechnet — das Prestige ist danach niedriger oder höher als beim
Abschied, unverändert nur, wenn in der Pause niemand gespielt hat.
**Wo er steht:** am Ende von Gesamt unter „Mehr zur Saison", der Positionen,
der Teams und der Chronik-Matrix, jeweils als Einblick [§C27], der zu ist —
dieselben Zeilen wie darüber (`ruhestandTafelHtml`, `positionsBlockHtml`,
`vTeams(true).ruhe`, `ruhestandChronikHtml`), ohne Platz und ohne das Metall der ersten drei. Im
Profil die Pille „Karriereende" und vorn die Karriere-Elo des Abschieds.
Eine Serie, die nicht mehr läuft, brennt nicht (`znFeuer`, `avRingOf`). Die
Knöpfe „Karriere beenden" und „Karriere fortsetzen" erscheinen nur für
jemanden mit Partien.
**Gelöscht wird nur, wer nie gespielt hat** (`spielerLoeschen`): jede
Partie trägt drei weitere Namen, deren Elo, Serien und Rekorde gegen ihn
gerechnet sind. Mit Partien heißt der Knopf „Spieler entfernen" und bietet
Karriereende und Ausblenden an. Ob es Partien gibt, fragt die Datenbank
und nicht die geladene Liste; ohne Antwort wird nichts gelöscht.
**Das Karriereende ist eine Nachricht und ein Blatt** (`18b-abschied.js`).
Die Story (`karriereende_<Spieler>_<Tag>`) ist Breaking und trägt die Bühne
des Abschieds in kühlem Metall [§C25]; sie gilt nur, solange genau dieses
Karriereende gilt (`_storyWiderrufen`). Das Blatt (`zeigeAbschied`) erzählt
die Laufbahn aus dem Baukasten der Rückblicke [§C31] und öffnet sich nach
dem Knopf, über die Pille, aus der Story und einmal je Gerät beim nächsten
Start, solange das Karriereende im Fenster des Feeds liegt.

Stellen: `06b-ruhestand.js`, `18b-abschied.js`, Spalten aus `datenbank/karriereende.sql`.
