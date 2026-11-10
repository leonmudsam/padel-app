# §C33 Im Feed hat jeder ein Gesicht

## Regel

- **Snapshot-Vertrag, er geht allem anderen vor:** eine veröffentlichte Zeile in `stories` bleibt in ID, Text, Zeitpunkt, Priorität, Beteiligten und Bild unverändert; weder gleicher Wortlaut noch spätere Stände noch ein Kontingent entfernen sie. Wo die Herleitung von Deckeln, Auffrischen oder Wegfallen erzählt, beschreibt sie, was der Generator VOR dem Veröffentlichen tut, oder einen früheren Stand. `_newsTexteAuffrischen` ist nur noch ein Identitätsweg; `_consolidateStories` verdichtet verlustfrei (`memberIds`, `sourceIds`). Der Feed reicht bis zum selben Tag des Vormonats (`newsAnzeigeAb`), und dieses Fenster wird vollständig geladen; eine Zeile hält vierzig Tage ab ihrem Ereignis (`NEWS_HALTEN_TAGE`), und was davor liegt, fällt auch aus dem Stand des Geräts (`_mergeStorySnapshots`). Der Generator bildet nur die letzten vierzehn Tage (`NEWS_FENSTER_TAGE`); was älter ist, kommt so aus der Datenbank, wie es veröffentlicht wurde.
- Zwei Karten wachsen mit dem Spieltag: die Ewige Tafel (`tafel:<Datum>`) und die Insignium-Karte (`instag_<Datum>`). Sie wachsen in Fassungen, nie durch Ändern einer Zeile: jede Fassung ist der ganze Stand des Tages, eingefügt unter `<ID>~<Fassung>` (`_tafelFassung`: die letzte Partie des Tages, dahinter `z`, wenn der Tag zu ist), und gezeigt wird je Tag nur eine (`_tafelFassungen`): die zu den vorhandenen Partien passende, sonst die jüngste. Hochgeladen wird nur eingefügt; die Datenbank erlaubt kein Ändern.
- Jede Story, die einen Spieler nennt, zeigt ihn (`_newsPids`, `_newsGesichtHtml`): bis drei Beteiligte alle Gesichter, ab vier zwei und die Zahl der übrigen („+2“), nie „+1“. Die Farbfamilie folgt der Kartenform, nicht der Datenkategorie [§C25].
- Eine Partie, eine Karte: jede Partie bekommt ihre Karte (`spiel_<Partie>`), und alles mit derselben `matchId` bündelt sich daran, auch Breaking, seltene Auszeichnungen und negative Zeilen (`neg`). Verschiedene Match-IDs werden nie über eine Minute zusammengelegt. Das Ergebnisband steht einmal (`bandFremd`). Keine Meldung einer Partie entsteht ohne die Karte ihrer Partie (`_buildStories`, außer der Ewigen Tafel, die nach Tag bündelt). Die Schlagzeile der Karte einer Partie ist ihr Hauptanlass: der schwerste Anlass, der keine Pleite ist (`_leitWert`, Breaking vorn), in seinem eigenen Satz (`_achseZeile`); gibt es nur Pleiten, der Satz des Ergebnisses, und das Ergebnis selbst ist kein Anlass, den Ausgang zeigt der Kopf. Darunter steht jeder übrige Anlass einmal (`_spZeilen`): höchstens drei, ein neues Thema zuerst (`SP_THEMA`), eine Pleite hinter den Siegen, der Rest als „und N weitere“; was der Fuß zeichnet (`zeigt`; ein gespeicherter Fuß ohne nach Art und Person, `SP_FUSS_TYP`), steht nicht als Zeile, und ist es nicht der Hauptanlass, steht sein Satz klein unter dem Fuß (`.sp-fu-z`); eine Nebensache (die gemeinsame Pleite, eine Auszeichnung, die keiner will) steht nur im Blatt, auch nicht in der Zahl. Ein Bündel über eine Minute ohne gemeinsame Partie fasst seine Anlässe als Reihe zusammen: höchstens drei, der stärkste zuerst, eine Pleite hinter einem Sieg, jeder mit genau seinen Leuten, zwei Anlässe derselben Leute unter einem Namen (`_gruppen`), dasselbe für mehrere in der Mehrzahl, höchstens 96 Zeichen. Jede Zeile ist ein Satz (`_satzZeile`), der sagt, was genau passiert ist: welche Marken, wie viele Siege oder Pleiten in Folge, wie viele der letzten Partien, ohne „ihre“; das Blatt zeigt jede Zeile und erklärt sie, die des Hauptanlasses mit ihrem Beleg statt ihres Satzes, der schon die Schlagzeile ist. Der Fuß zeigt den schwersten Anlass mit eigener Zeichnung, gewogen wie in der Schlagzeile (eine Tabelle für beide, `ANLASS_GEWICHT`, `anlassGewicht`; `_spFussFakten`), und merkt sich im Schnappschuss, welche Meldungen er zeichnet (`zeigt`, `_spFaktId`): Spitzenwechsel und Rangsprung als Monatstabelle in einer Kette, ein Feld je Platz bis zum letzten besetzten (`_spTabelleBild`); eine seltene oder legendäre Auszeichnung als Medaille mit jedem, der sie in der Partie holte, und dem wievielten Mal (`alle`), einem allein mit der nächsten Marke, darunter die Liga als Punkte; jede runde Zahl der Partie, von jedem und jede einmal, in einem Fuß auf Klappziffern, die schwerste zuerst, höchstens vier (`marken`, `SP_MARKEN`, `_spMarkenBild`), und das Zählwerk der Form tritt dann zurück; ohne einen wählt er unter allen zutreffenden Zeichnungen mit Abzug für die Füße der Partien davor (`_spFussSpur`), nie zweimal dieselbe hintereinander.
- Kopf und Fuß einer Partie folgen dem Anlass in fester Rangfolge (`_spAnlass`, `_spBild`); die gewöhnliche Partie hat Formen mit Regel und Gewicht (`SP_FORM`); die `v2`-Formen gibt es nur für neue Karten, die alte Formkette kennt sie nicht; neue Karten speichern ihr Bild als `dataRef.visual` Version 2 (`score`, `occasion`, `_spScoreWahl`), alte bleiben über den V1-Pfad lesbar. Den Kopf trägt ein besonderer Ausgang in seinem Vorrang (`_spScoreSpezial`: Außenseitersieg mit der Wippe, zu null mit dem Tor, ein Tor Abstand mit dem Herzschlag, ab sechs Toren das Band), außer derselbe stand auf einer der zwei Karten davor; sonst die Grundansicht des Katalogs, die am längsten nicht dran war, bei Gleichstand die vordere (`SP_KOPF_GRUND`: Klapptafel, Elo-Strom, Lebensbalken, Spielfeld, Tauziehen, Tacho, Münzwurf, Zwei Welten, Mosaik, Erwartung gegen Ergebnis; `_spScoreAuswahl`); das Mosaik nur mit benanntem Befund, „Zwei Welten“ nur, wenn dasselbe Duo es auf den letzten dreißig Karten nicht hatte. **Team A steht links, Team B rechts**, wie am Tisch: Daten mit A und B zeichnen sich, wie sie sind (`SP_KOPF_AB`), ein Kopf, der nach Siegern rechnet, wird gespiegelt, wenn B gewann (`sp-b`); der Stand liest sich immer A:B mit dem Sieger hell (`_spSt`), und unter jedem Kopf steht dieselbe Teamzeile „A gegen B“, je Paar die Abwehr zuerst, der Sieger mit grüner, der Verlierer mit roter Kante (`_spTeamZeile`); kein Kopf schreibt diese Namen ein zweites Mal (`tz`), und ein Paar steht nebeneinander, nie übereinander (`.sp-chips`). Ein Fuß mit beiden Seiten (Duo gegen Duo, Revanche, Gegner) steht wie der Kopf, ein Zähler zeigt eine Menge ohne Ordnungspunkt („150 Siege“, `SP_MEHRZAHL`). Der Herzschlag zeichnet sich einmal und trägt ein Licht, das auf der Kurve der Sieger entlangläuft; der Elo-Strom führt von jedem Verlierer ein Band zur Mitte und von dort zu jedem Sieger, so breit wie die Punkte; die Lebensbalken zeigen, was jedem Team von zehn Toren blieb, der leere trägt „K.o.“. Den Fuß trägt ein Ereignis der Partie vor allem anderen; ein Zustand (`SP_FUSS_ZUSTAND`: Serie, Duo-Serie, Rivalität) tritt zurück, wenn er auf einer der letzten Karten gezeichnet war (`_spAnlassSnapshot`). **Nie dieselbe Zeichnung zweimal hintereinander**: die Familie des Fußes der vorigen Partie (`SP_FUSS_FAMILIE`, `_spFussVorher`: jede Kurve, jede Rangliste, die Tabelle …) fällt ganz aus der Wahl, auch für einen Fakt; bleibt nichts, trägt die Karte keinen Fuß. Ein Fuß zeichnet den Stand der Partie nicht noch einmal (`nurAnlass`) und trägt auf der Karte keinen Satz (`.sp-lg` fällt weg, das Blatt behält ihn). Jedes Bauteil trennt `…Daten` und `…Bild`; nichts wird gekürzt oder geschrumpft (`_spPasst`).
- Was in einer einzelnen Partie passiert, ist eine Zeile ihrer Karte, nie eine eigene Karte, und hat ein eigenes Blatt: gebrochener Fluch (`fluch`, erster Sieg nach mindestens fünf Niederlagen in Folge gegen denselben, der letzte Sieg gegen ihn zwei Wochen her oder nie), Duo-Jubiläum (`duo_jubilaeum`, 25., 50., 75., 100. … gemeinsame Partie), Revanche (`revanche`, dieselben Duos am selben Tag, das Duell davor mit mindestens drei Toren verloren), langer Tag (`tagesmarathon`, 10., 15., 20., 25., 30., 40. Partie des Tages), Elo-Höchststand (`elo_hoch`, über den höchsten Stand, den er je in einem Monat hatte, nach mindestens zwanzig Partien; der Satz nennt den Monat der alten Marke, die Kurve des Fußes bleibt im Monat, weil die Elo jeden Monat neu beginnt; holt er damit „Der höchste Gipfel“, meldet ihn nur die Tafel) Tabellensprung (`tabellensprung`, drei Plätze mit einem Sieg, nur in einer belastbaren Tabelle), das Ende einer Pleitenserie (`pleiten_ende`, erster Sieg nach mindestens fünf Niederlagen in Folge; `duo_pleiten_ende`, erster gemeinsamer nach mindestens vier gemeinsamen; gewogen mit der Länge, im Fuß die Kurve der Serie), die Rückkehr (`rueckkehr`, die erste Partie nach mindestens vierzehn Tagen, Sieger und Verlierer; im Fuß nur die eines Siegers), Jubiläum und Siegmarke an der Leiter und an jeder fünfzigsten Partie oder jedem fünfzigsten Sieg, an jeder Partie des Fensters (`_rundeMarke`), und die sieben Fakten des Katalogs, je Partie höchstens einer je Art: die gekippte Bilanz (`duell_kippt`, ab sechzehn Duellen liegt ein Sieger gegen einen Verlierer vorn, davor zehn Duelle nicht oder nie), die Spitze der Woche (`woche_spitze`, ein Sieger übernimmt die beste Siegquote der Woche ab fünf Siegen), der Tag im Plus (`tag_plus`, ab der vierten Partie des Tages nach einem Tief von −25 Elo), der Höhenflug des Tages (`tag_hoehe`, zum ersten Mal an diesem Tag über +75 Elo), der größte Gewinn des Monats (`monat_gewinn`, ab der achten Partie im Monat, mindestens 22 Elo und mehr als mit jedem eigenen Sieg davor), die halben Siege im Monat (`monat_halb`, ab der fünfzehnten Partie im Monat erreicht die Siegquote 50 % von unten, einmal je Monat) und der beste Partner (`partner_best`, mit diesem die beste Quote unter allen ab sechs gemeinsamen Partien, jede achte gemeinsame). Alle fragen `sichtbar` [§C40]. Ist eins das stärkste der Partie, zeichnet es der Fuß (Gegner, Höchststand, Tabelle, Revanche, Chemie, Tagesring; die Fakten als Kurve, `_spLinie`, mit einer Bezugslinie, über der Grün und unter der Rot steht, oder als Rangliste, `_spRangliste`), und ein einzeln geöffneter Fakt zeichnet im Blatt denselben Fuß (`_spFaktBild`).
- **Der Aufbau der Karte einer Partie**: Kopf, Teamzeile, Schlagzeile, Satz, die übrigen Anlässe als Zeilen, als letzte Zeile die des Fußes, darunter der Fuß. Die Schlagzeile ist der Hauptanlass (der schwerste, der keine Pleite ist, `_leitWert`), der Satz darunter **erklärt ihn** (sein eigener Satz) und nicht die Partie. Ohne Anlass nennt die Partie, was ihr Kopf nicht zeigt (`_spKontext`: das Duell dieser zwei Duos, die gemeinsamen Siege, den Tag eines Siegers); Stand, Abstand, Elo und Chance stehen im Kopf und in keinem Satz. Steht die Zahl einer Serie oder Marke in der Schlagzeile oder Zeile („zündet die 3er-Serie“, „verliert zum 5. Mal in Folge“), sagt der Satz etwas anderes (die Bilanz bis dahin, seit wann, wofür es eine Marke gibt) und nicht dieselbe Zahl noch einmal. Die Zeilen: höchstens drei, ein neues Thema zuerst, die Pleite hinter den Siegen, der Rest als Zahl, keine Nebensache (`_spZeilen`). Die Zeile des Fußes ist der Fakt, den er zeichnet, oder bei einer Form ihr gespeicherter Satz (`occasion.zeile`); sie steht in derselben Form wie jede Zeile direkt über ihm (`_newsSammelBand`, `.sp-fz`), und zeichnet er den Hauptanlass, sagt es die Schlagzeile. Sagt die Zeile einer Form dasselbe wie die Schlagzeile („gewinnen zum 5. Mal zusammen“ über dem Ring der gemeinsamen Partien), fällt sie ebenso weg, und unter einem Serien-Rekord steht die Serie desselben Spielers nicht noch einmal als Zeile (`_spZeilen`). Breaking auf der Karte einer Partie trägt keinen Kleintext.
- Was einen ganzen Tag beschreibt (Unschlagbar, Comeback-Tag, Zusammenbruch, Schwarzer Tag), wird erst vergeben, wenn der Tag zu ist (`_tagZu`, 23:59), an der letzten Partie des Spielers und mit `tagEnde`; seine Karte steht um 23:57 für sich (`dataRef.tag`), die kleinen Marken des Tages in einer Sammelkarte `awards:<Tag>`, nie in der Karte einer Partie — außer eine Ehrung trägt es, die des Tages oder die größere, die ihn mitträgt; dann steht es nur dort (`_tagGetragen`).
- **Was ein Zeitraum an Auszeichnungen brachte, steht in seiner Ehrung** (`30e-news-ehrung.js`): Tag, Woche und Monat zählen alles, was in ihnen geholt wurde, aus den Partien und mit ihrem Schluss, als Unterschied zweier Prestige-Stände an ihren Grenzen (`rcpLaufbahnDaten`) [§C27]. Manche Auszeichnung entsteht ohne Partie, mit dem Schluss eines Tages um 23:59 (Spieler des Tages, Unschlagbar, Comeback-Tag, Tag der Götter, Allwetter, Award-Sammler), einer Woche am Montag um 00:00 (Spieler der Woche, Award-Sammler) oder eines Monats in seiner letzten Millisekunde (Meister, Vize-Meister, Team der Saison, Untouchable); welche ein Schluss vergeben kann, steht fest (`EHRUNG_SCHLUSS`), gezählt mit der Auszeichnung selbst eine Millisekunde vor dem Schluss gegen den Schluss (`_ehrungSchlussPosten`), für Breaking und für die Woche, die die Titel des Monats abzieht. **Der Tag** (`_ehrungDesTages`, zwischen den Grenzen des Tages, `_storyTagGrenzen`) ist Teil der Karte seines Spielers des Tages um 23:59 (`dataRef.ehrung`, `ehrungVoll`): je Geehrtem eine Zeile mit Gesicht, Name, den seltenen und legendären Auszeichnungen mit Namen und den gewöhnlichen als Zahl, ihren Zeichenkacheln in der Farbe ihrer Klasse (die gewöhnlichen als eine mit ihrer Zahl) und dem Prestige, mehr als fünf Geehrte als „und n weitere“ (`_ehrungTagHtml`); im Blatt „Die Ehrung des Tages“ mit denselben Kästen wie im Blatt einer Ehrung (`_ehrungBloeckeHtml`). Ohne Spieler des Tages ist sie eine eigene Karte um 23:59 (`tagesehrung_<Tag>`, `periode:'tag'`, `voll`) in der knappen Form, mit dem härtesten Tag darunter wie beim Spieler des Tages (`_spGegenHtml`, im Blatt „Der härteste Tag“). Eine Karte fasst den Tag zusammen; eine Ehrung je Runde gibt es nicht. Gespeicherte Ehrungen einer Runde und eines Tagesschlusses (`ehrung_tag_<Tag>`) gehen in die Karte ihres Tages auf und reisen mit (`_consolidateStories`, `memberIds`); trägt die schon den ganzen Tag, gilt sie, sonst wird vereinigt (`_ehrungVereint`). **Woche und Monat**: `ehrung_der_woche_<Montag>` am Sonntag um 23:59:05, zur Zeit der Wochenkarte, gezählt ab einer Millisekunde nach ihrem Montag 00:00 (dort schließt die Woche davor) bis zu ihrem Schluss am Montag darauf, mit Spieler der Woche und Award-Sammler und ohne die Titel eines Monats, der in der Woche endet (`rcpWocheLaufbahn`); `ehrung_des_monats_<Saison>` am Ersten um 00:00, zur Zeit des Rückblicks, an denselben Grenzen wie dessen Laufbahn (`rcpMonatGrenzen`: ab einer Millisekunde nach Mitternacht des Ersten bis zu seiner letzten Millisekunde, endet er an einem Sonntag bis zum Schluss dieser Woche). Bei gleicher Zeit steht die wichtigere Karte oben (`_storyFolge`, in Generator, Bestand, Verdichtung und Realtime), die Ehrung also direkt unter ihrer Karte. **Die größere Ehrung trägt den Tag** (`_ehrungGroessere`): endet mit einem Spieltag eine Woche (Sonntag) oder ein Monat (sein letzter Tag), steht nur die größte. Der Spieler des Tages steht dann ohne Ehrung (`ehrungIn`: `woche` oder `monat`), ein Tag ohne ihn hat keine Karte, die Woche, die mit einem Monat endet, hat keine Ehrung, und die des Monats trägt dann deren Spieler der Woche; ein gespeicherter Spieler des Tages zeigt an einem solchen Tag keine Ehrung, wenn die größere im Feed steht. **Die knappe Karte** (Tag ohne Spieler des Tages, Woche, Monat; `_newsEhrungKompaktHtml`): Rubrik („EHRUNG DES TAGES“, „EHRUNG DER WOCHE“, „EHRUNG DES MONATS“), Schlagzeile, darunter der Zeitraum in einer Zeile („Geholt am 26.10.“, „Geholt vom 26.10. bis 01.11.“, „Geholt im Oktober 2026“), eine Reihe Gesichter mit Prestige und Namen, die vorderen fünf, mehr als „+n weitere“ (nie „+1“), darunter in einer Zeile die Zahl je Klasse und als Unterkante der Balken, was jede Klasse an Prestige brachte; Woche und Monat in Gold wie ihre Karten, der Tag im Violett der Ehrung; ohne Säulen, Summe und Schimmer; bei 360 px höchstens 190 px und zwei Drittel der Wochenkarte. Ab vier Geehrten nennt die Schlagzeile ihre Zahl statt der Namen. Breaking sind der Spieler des Tages, die Ehrung des Tages und die der Woche nur, wenn ihr Schluss selbst eine legendäre Auszeichnung vergab, die nicht Schlagzeile ist (`_ehrungBrkGrund`, je Datenstand und Schluss gemerkt; `EHRUNG_KOPF`: Spieler des Tages und der Woche, Meister, Vize, Team der Saison; mitgespeichert als `ehrungBrk` und `breaking`); die Woche fragt dazu den Schluss ihres Sonntags, den sie trägt; die Ehrung des Monats nie, der Monat ist es mit seinem Rückblick. Eine legendäre aus einer Partie ist an ihrer Partie-Karte Breaking und nirgends sonst, auch wenn die Ehrung sie trägt; ein gespeicherter Spieler des Tages ohne `ehrungBrk` fragt deshalb den Schluss seines Tages, nicht seine Ehrung. Ist eine solche Karte Breaking, trägt sie den Balken — die Ehrung mit ihrem Namen darin — und im Kleintext die Nachricht dazu, wer welche zum wievielten Mal holt („Julian holt sich zum Schluss der Woche die legendäre Auszeichnung „Award-Sammler“, zum ersten Mal.“; mehrere Spieler in einer Zeile: „Zum Schluss des Tages zweimal legendär: … für Maxi und … für Julian.“; keine Begründung der Regel, das Band sagt schon „Breaking“, `_ehrungBrkSatz`, `.nf-brk-sub`, im Blatt unter dem Balken `.nd-brk-grund`). Was eine Ehrung eines Tages trägt, auch über eine größere, hat keine eigene Karte um 23:57 (`_tagGetragen`). Die Ehrungen nur der letzten Millisekunde einer Woche und eines Monats sind abgemeldet (`ehrung_woche_`, `ehrung_monat_`).
- **Die Zeichen-Karte des Wochenschlusses** (`instag_woche_<Montag>`, `insignium_tag` mit `schluss:'woche'`): wer mit dem Schluss der Woche eine Stufe oder einen Grad weiter steht, bekommt dieselbe Karte wie an einem Spieltag, am Montag um 00:00, aus dem Stand eine Millisekunde davor gegen den Schluss (`_insZuegeZwischen`, dieselbe Rechnung wie die Karte des Tages). Darunter steht, was der Schluss den Bewegten vergab (`grund` aus `_abschlussAuszeichnungen`, Spieler der Woche, Award-Sammler, als Zeile `_newsAbschlussHtml`), im Blatt dazu „Die Leiter der Liga nach der Woche". Sie ist ein Schnitt und keine Fassung: sie wächst nicht, steht nicht in `_tafelFassungen` und wird nach dem Veröffentlichen nicht neu gerechnet. Fällt der Schluss der Woche auf den des Monats, trägt der Monatsabschluss beide Zeichen, und sie entsteht nicht.
- Eine gespeicherte Ehrung einer Runde (`type:'ehrung'` ohne `periode`), die in keiner Karte ihres Tages aufgeht, bleibt, wie sie war, und zeigt je Geehrtem eine Säule (`_ehrungSaeulen`): so hoch wie sein Prestige aus Auszeichnungen gegen den, der am meisten bekam, gestapelt aus jeder seltenen und legendären und einem Stück für alle gewöhnlichen, darauf die Zeichenkachel der wertvollsten (die seltenste Klasse, darin der höchste Wert), eine legendäre mit dem Lauflicht des Profils, unten sein Wappen (Insignium und Gesicht, 48 px); höchstens fünf je Reihe, weil die Karte im Feed bei 360 px nur 287 px breit ist, mehr auf Reihen, die sich um höchstens eine Säule unterscheiden, die längeren vorn (`eh-umbruch`), auf schmaleren Telefonen werden die Wappen über die Breite der Bühne kleiner (`--je`, `100cqi`), statt dass eine Säule allein umbricht. Darunter steht die Schlagzeile, ohne Satz und ohne Fuß: das Bild zeigt Säulen, Zeichenkachel und Prestige schon. Unter ihr, in welchen Partien die Auszeichnungen geholt sind (`_ehrungZeitraum`), als Anmerkung mit einem Strich davor und ohne Uhr: oben leise, was der Zeitraum bedeutet („Geholt in den Partien"), darunter heller der Zeitraum mit „Uhr" hinter jeder Uhrzeit („von heute, 13:44 Uhr bis 15:55 Uhr"), umbrochen nur vor dem „bis" — heute und gestern als Wort, weiter zurück das Datum, über Mitternacht und über mehrere Tage beide Tage, eine Partie in der Einzahl; ein Tag steht bei 360 px in einer Zeile, sonst höchstens zwei, innerhalb eines Endes nur feste Leerzeichen. Im Blatt stehen beide Teile als ein Satz („Geholt in den Partien von heute, 13:44 Uhr bis 15:55 Uhr."). Mit einer legendären trägt die Karte den Schimmer des Seltenen. Das Blatt jeder Ehrung (`_ndEhrungBlatt`) trägt den Satz, der die wertvollste Auszeichnung mit dem wievielten Mal als Ziffer nennt und nie die Summe, zeigt die Säulen mit Wappen und Namen, vier je Reihe, die Summe mit ihrem Anteil je Klasse, Zahl und Prestige und je Spieler jede Auszeichnung als dieselbe Kachel, zwei je Zeile, die seltensten zuerst, jede mit dem Strich in der Farbe ihrer Klasse, wie viel vom vollen Wert sie beim wievielten Mal bringt. Prestige aus Auszeichnungen steht nur hier: die Tafel-Karte nennt Rekorde und Chroniken. Keine Ehrung zählt gegen einen Deckel.
- Dieselben Vier am Tisch (mindestens drei Partien ohne Pause über `RUNDE_PAUSE_MS`) bekommen eine zusätzliche Karte, die Runde (`type:'runde'`), dreißig Minuten nach der letzten Partie; sie zählt gegen keinen Deckel.
- Was im selben Moment passiert, kommt in eine Sammelkarte nach seinem Grund (`causalKey`): die dauerhafte Tafel eines Spieltags (`table:<Tag>`), die kurze Strecke (`form:<Tag>`), die Spieler-Karte (`quelle:'spieler'`) und die Erfolgs-Karte (`quelle:'erfolg'`). Der Schlüssel kommt aus dem Inhalt; die Uhrzeit ist die früheste Zeile, die die Karte zeigt; Titel und Text fassen die Gruppe zusammen; die Karte zeigt höchstens `NEWS_LIMITS.sammelZeilen` Zeilen ohne Ausbauten, das Blatt alle, gegliedert nach Sorte.
- Die Reihenfolge ist die Zeit; nichts sortiert um. `prio` steht auf EINER Skala (`STORY_PRIO`, `_newsPrio`: Breaking 90+, Spieltag 38–89, Hintergrund 10–37) und wiegt nur Sammelkarte und Karte des Tages.
- Was der Generator bildet: jede ID aus Fachlichem (Spieler, Sache, Spieltag), nie aus Uhrzeit oder Zufall, sodass derselbe Datenstand dieselben Karten ergibt; was es je Tag genau einmal gibt, fällt beim Verdichten nicht weg (`TAG_PFLICHT`); Marken einer Serie hängen an ihrer Partie und bleiben stehen; was zählt, meldet Stufen und nicht jeden Schritt dazwischen: die Rivalität jedes zehnte Duell an der Partie, in der es gespielt wurde (ID mit Zahl), Chemie, Tagesring, Uhr des Tages und Duo gegen Duo nur an runden Zahlen (`SP_TAG_STUFEN`); der Spieler des Tages steht an jedem Spieltag des Fensters um 23:59; der härteste Tag (`elo_swing`) desselben Tages steht als Gegenstück auf dessen Karte und in dessen Blatt (`gegenstueck`, `memberIds`), nicht als eigene Karte daneben; Auszeichnungen sind nach Klasse Nachricht (`_badgeTakt`, `NEWS_BADGE_MARKEN`), kleine Marken einer Partie stehen zusammen (`badge_marken`); was der Generator nicht mehr bildet, meldet `STORY_ABGEMELDET` ab; ablaufen lässt eine Zeile nur die Haltezeit (`NEWS_HALTEN_TAGE`).
- Der Monatsabschluss (`season_recap`) ist **eine** Karte am 1. um 00:00: Podest, Titelrennen, darunter das Team der Saison mit Bilanz und Elo, die Chronik des Monats mit ihrer Zahl, den drei mit den meisten Einträgen und denen, die zum ersten Mal darin stehen (bis drei mit Namen, mehr als Zahl), und jede Insignium-Bewegung, die erst mit den Titeln kam (`_newsMonatBand`, gegen den Stand eine Millisekunde vor dem Monatsende). Ihr Satz nennt den Monat in Zahlen, der Nachsatz nur, wie der Titel entschieden wurde; Meister und Monat stehen in der Schlagzeile. Ein Tippen öffnet den Saison-Rückblick, ein eigenes Blatt hat sie nicht. Eigene Karten für die Chronik eines abgeschlossenen Monats und für jeden Erstling gibt es nicht (`STORY_ABGEMELDET`). Der Abschluss eines Tages, einer Woche und eines Monats kommt in dieser Reihenfolge: der Spieler des Tages um 23:59:00, die Wochenkarte am Sonntag um 23:59:05, der Monat um 00:00, sodass er beim ersten Öffnen danach die jüngste Karte ist.
- Breaking ist das Seltenste und scheitert an keinem Deckel und keiner Sperre: legendäre Auszeichnung, längste Siegesserie aller Zeiten, Tabellenführer eines belastbaren Spieltags, feststehender Meister, Schlusssprint, erster Aufstieg in die obersten Insignium-Stufen, Karriereende. Entschieden nach dem Bündeln (`_isBreaking`); eine gebündelte Breaking-Karte nennt ihren Anlass zuerst (`brk`).
- Die Karte des Tages (`_newsTagKarte`) steht nur an Spieltagen ab der dritten Partie (`NEWS_LIMITS.tagKartePartien`) und wechselt, solange eine spannendere Karte des Tages dazukommt; nie auf Breaking, dem Spieler des Tages, einem Rückblick oder einer negativen Karte (`_newsTagKarteWuerdig`, `_newsTagSpannung`).
- Die Insignium-Karte des Tages (`insignium_tag`, `30d-news-insignium.js`) zeigt, was der Spieltag am Zeichen ändert, gegen den Stand vor dem Spieltag und neben der Tafel, die das Prestige zeigt — von Mitternacht, nach dem Schluss der Woche, bis eine Sekunde davor, vor dem Schluss des Monats, mit dem Schluss des Tages um 23:59 (`_storyTagGrenzen`); was erst mit ihm kam, steht um 23:59: jede neue Stufe („wieder" nur mit Beleg, „zum ersten Mal" nie, weil die App das nicht belegen kann, ohne jeden Spieltag nachzurechnen), jeder Rückfall auf eine tiefere Stufe und ein Grad nur über dem höchsten bekannten Platz (`insigniumPos`, `_insBestVor`: das `best` der letzten Karte und alte Stufen-Zeilen im Bestand). Ein Grad, der in derselben Stufe zurückkommt oder geht, steht nicht da. Auf der Karte trägt die **besonderste** Bewegung die Bühne — die erste nach `_insZugVor`: neue Stufen vor Graden vor Rückfällen, darin die wertvollere Stufe zuerst, auch wenn sie jemand wieder trägt (ein Lorbeerreif vor zwei Volutenkränzen, die ihn sonst als Zeile darunter schoben); Generator, Schlagzeile, Zeilen und Blatt lesen dieselbe Reihenfolge, und eine gespeicherte Karte wird beim Anzeigen ebenso geordnet (`_insAltZuTag`): Wort und Lage darüber, darunter die Verwandlung (`_insVerwandlung`) aus zwei Zeichen und einem Pfeil, gelesen wie die Leiter, links die tiefere Stufe, rechts die höhere, das Gesicht auf dem Zeichen von jetzt, der Pfeil vom alten zum neuen („Zierkranz → Lorbeerreif (Gesicht)" beim Aufstieg mit zwei Ringen, „Zierkranz (Gesicht) ← Lorbeerreif" beim Rückfall, rot und ohne Ringe, im Blatt ebenso), und die Spur der ganzen Leiter (`_insSpur`: drei Felder je Stufe und die sieben Zeichen, das der Stufe von jetzt größer; gefüllt, was schon da war, Violett, was der Tag dazubringt, rot gestreift, was ein Rückfall kostet). **Jede übrige** Bewegung steht klein unter der Schlagzeile als Zeile (`_newsInsTagZeilen`): Gesicht, was passiert ist, die beiden Zeichen in derselben Leserichtung — alle, ohne Rest als Zahl, ohne Kästen. Jede Bewegung gleich groß als Bild, als Kacheln oder Zeilen mit eigener Spur, ließ keinen Anlass hervortreten. Die Karte trägt nur die Schlagzeile, keinen Satz und keine Prestige-Zahl: Gewinn und Verlust stehen auf der Tafel-Karte, und auf beiden Karten standen sie doppelt; der Satz, was die Stufe in der Liga bedeutet, und das Prestige stehen im Blatt. Verglichen wird der Stand vor mit dem nach dem Spieltag: wer an einem Tag auf- und wieder absteigt, hat sich nicht bewegt. Im Blatt steht jede Bewegung mit Zeichen und Gesicht im Kopf (`nd-is-viele`), darunter jede mit ihrem Weg durch die Stufe (`_insWegHtml`), ihrer Wirkung (`_ndWirkungBlock`) und die Leiter der Liga. Sie fragt `ligaAktiv`, auch im gespeicherten `best` [§C40]; nur Rückfälle machen sie negativ, nie Karte des Tages; nur ein Aufstieg ohne belegtes „wieder" kann sie dazu machen, in die obersten Stufen auch zu Breaking. Alte Einzelzeilen (`insignium_stufe`) werden beim Anzeigen zur Karte ihres Tages (`_insAltZuTag`).
- Die Ewige Tafel meldet Rekord- und Chronikwechsel gegen den Stand vor dem Spieltag (`_storyStand`), in vier Fällen (`_halterFall`) plus Ausbau; ein Ausbau heißt besser geworden (`_rekordArt`), ein Fenster meldet keinen; die Karte trägt ihre ganze Lage im `dataRef` und ihre Wirkung auf die Laufbahn samt Verlusten (`_tafelLaufbahn`, `_ndWirkungBlock`); auf der Karte steht jeder, der durch Rekorde und Chroniken Prestige gewinnt oder verliert, nach Betrag geordnet hinter einem Pfeil (`_newsPrestigeBand`, aus `rek` und `mon`; die Auszeichnungen nennt die Ehrung, das Blatt alle drei Quellen). Jede Zeile steht bei der Partie, ab der ihr Stand des Abends galt (`_tafelWechsel`), mit einem der Genannten darin, sonst bei deren nächster und zuletzt bei deren letzter Partie davor; was erst mit dem Tagesende gilt, steht so bei der letzten eigenen. Die Wirkung auf die Laufbahn nennt nur, was Prestige bewegt: eine Monatschronik nur bei dem, dessen gezählter Eintrag des Monats sich damit ändert (`zaehlt`), einen Ausbau nie; die Gruppen „Monatschroniken" und „Ausbauten" sagen das in einem Satz. Wer nicht gespielt hat, bekommt keine Karte; die Schandtafel meldet der Feed nicht.
- Fun Facts: ein Slot um 15:00 (`ambient_<Tag>_15`), nachgetragen für stille Tage im Fenster; eine abgemeldete Karte im Slot (`_storyAbgemeldet`) gibt ihn frei, und der Ersatz trägt die nächste freie ID (`ambient_<Tag>_15_2`), weil die Datenbank keine Zeile ändert; deterministisch gezogen mit Rotation von Vorlage, Rubrik (`ambientRubrik`) und These (`AMBIENT_PAAR_COOLDOWN_DAYS`); die Rubrik des Fun Facts davor ist immer gesperrt, auch über Spieltage ohne Slot hinweg, und zuerst gezogen wird eine Karte über jemanden, der in den drei Tagen davor keine eigene Karte hatte (Durchgang −1); jedes Bild aus `dataRef.bild` (`30c-news-fakt.js`).
- Neu ist, was seit dem Lesestand dazukam (`NEWS_LS_STAND`, `_newsGelesen`); eine Tafel-Karte, die eine frühere fortsetzt (derselbe Rekord, dieselbe Monatschronik, zurückgeholt oder ausgebaut), sagt es mit einem Faden (`_newsFaeden`). Keine Karte einer Partie trägt einen Faden oder ist sein Ziel: was eine Partie beendet oder fortsetzt, sagt ihre eigene Zeile.
- So spricht die Liga: jede Zahl mit Komma, Ergebnis aus Sicht des Siegers, der Elo-Gewinn gehört einem (`eloPid`), kein Gedankenstrich, kein Etikett mit Doppelpunkt, kein Satzfragment, keine englische Aufschrift, der Text wiederholt nicht die Schlagzeile und nicht, was die Zeichnung zeigt (`_ndNeu`, `_ndLead`), und das Blatt einer Rekordkarte nicht ihren Beleg (`belegHtml` mit `kurz`: unter den Zellen steht nur „k von n"); kein Blatt erklärt die App.
- Jedes Story-Blatt hat Kopf, typ-eigene Mitte und Fuß (§C27) und zeigt, wovon seine Story handelt: Serie mit ihren Partien, Rivalität mit ihrem Verlauf, Auszeichnung mit ihren Trägern, Spitzenwechsel mit jedem Wechsel, Spieler des Tages mit seiner Bahn, Woche mit allen sechs Wertungen, Rückblick per Knopf (`_newsRueckblickKnopf`); der Monatsabschluss öffnet den Saison-Rückblick statt eines Blatts. Jede Auszeichnung in einem Blatt (Zeile und Kachel der Ehrung, Zeichenkachel einer Säule, Medaillon, runde Marke, was ein Schluss vergab, Posten der Laufbahn) öffnet ihre Detailansicht über dem Blatt und über der Story (`data-bp`, `_bpBinden`, `.bp-bg` über `.nd-bg`); Escape und Zurück schließen zuerst sie. Kam sie ohne Partie, nennt die Detailansicht die Tage, Wochen oder Monate, deren Schluss sie vergab, und jeder öffnet seinen Rückblick (`_badgeSchluesse`). Die Klassen heißen überall deutsch (`RARITY_META`).
- Der Feed hat sieben Chips: Alle, Breaking und fünf Seiten (`NEWS_SEITEN`, `_newsSeite`) — Tafel, Spieltag, Zeichen, Ehrung, Liga. Jede Karte steht auf genau einer Seite, und die Zahlen der Seiten ergeben zusammen „Alle"; „Liga" nimmt, was keiner anderen gehört (Fun Facts, Saison, Spieler der Woche ohne Partie, Karriereende). Breaking liegt quer dazu. Das Zeichen eines Chips ist das des Rubrikbands seiner Karten.

## Stellen

`26-news-konstanten.js` (`NEWS_LIMITS`, `STORY_PRIO`), `26b-story-fakten.js`, `26c-news-bausteine.js`, `27-news-generator.js` (`_buildStories`), `28-news-ambient.js`, `29-news-cache.js` (`_consolidateStories`, `TAG_PFLICHT`), `29b-news-sync.js`, `30-news-ui.js`, `30a-news-karte.js`, `30b-news-spieltag.js`, `30c-news-fakt.js`, `31-news-detail.js`, `31a-news-detail-mitte.js`, `31b-news-detail-helfer.js`.

## Prüfung

`tests/rechnen` (was den Tag beschreibt, erst am Tagesende; keine Ehrung vor 23:59, dann trägt der Spieler des Tages alles des Tages), `tests/ambient` (Snapshots, Bündel, IDs bei zweitem Lauf, eine abgemeldete Karte gibt ihren Fun-Fact-Slot frei, Abwechslung von Kopf und Fuß der Partie-Karten, Sprache über jeden vierten Spieltag, Breaking-Anlässe, Fun-Fact-Bilder, die Säulen, die Karte ohne Satz und Fuß, die Klassen, der Satz und das Blatt jeder Ehrung, die Tafel-Karte ohne Auszeichnungen, der Monatsabschluss mit Team, Chronik, Erstlingen und Zeichen, Tag vor Woche vor Monat, was ein Schluss vergibt unter dem Spieler des Tages und in der Ehrung der Woche und des Monats und in keiner zweiten, Woche und Monat mit allen Auszeichnungen wie ihr Rückblick und direkt unter dessen Karte, aus beiden Richtungen sortiert, eine gespeicherte Ehrung eines Tages in der Karte ihres Spielers des Tages, Reihen um höchstens eine Säule verschieden, die Liste je Schluss an den echten Partien nachgerechnet, die Zeichen-Karte des Wochenschlusses, ein Spieltag ohne die Abschlüsse von Woche und Monat, ein Tag ohne Spieler des Tages als eine Karte mit dem härtesten Tag, was um Montag 00:00 vergeben wird, einmal, die größere Ehrung trägt den Tag am 30.06. und an gestellten Sonntagen, eine legendäre aus einer Partie macht den Spieler des Tages nicht zum Breaking, auch keinen gespeicherten, eine des Schlusses schon, mit dem Grund im Kleintext), `tests/blatt` (jede Karte und jedes Blatt bei 288 und 360 px, die sieben Chips und jede Karte auf genau einer Seite, Bildzonen, Faden, Bewegung, die Ehrung in einer Reihe und ohne gebrochenen Namen, die knappe Ehrung der Woche und des Monats gemessen, eine Auszeichnung im Blatt öffnet ihre Detailansicht darüber und ihre Wochen, jedes Gesicht der Ehrung des Tages rund, unter der Schlagzeile, in welchen Partien sie geholt ist, ein Tag in einer Zeile, der Monatsabschluss öffnet den Saison-Rückblick), `tests/wiederholung` (Auszeichnungsmarken), `tests/storyscroll`, `tests/leistung` (Feed in Portionen), `tests/start` (der Feed liest einen Monat, eine Zeile hält ab ihrem Ereignis).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Jede Story, die einen Spieler
nennt, zeigt ihn: ein Einzelner sein Wappen wie überall sonst [§C27], ein
Duo zwei überlappende Chips. `_newsPids` sucht die Beteiligten in den über
die Jahre gewachsenen `dataRef`-Feldern; `_newsGesichtHtml` zeichnet sie.
Bei dreien stand ein Chip „+1" an der Stelle des dritten Gesichts, genauso
breit wie das Gesicht und ohne zu sagen, wer es ist; bis drei stehen deshalb
alle, erst ab vier fasst „+2" den Rest zusammen.
Der Feed war die einzige Ansicht der App, in der ein Spieler nur ein Name
war.
Und er trug erst elf Kategoriefarben, danach fast nur noch Gold. Jetzt
entscheidet nicht die interne Datenkategorie, sondern die für den Leser
sichtbare Kartenform über die ruhige Farbfamilie [§C25]. Die Kategorie ist
nur noch ein Rückfallwert; Karte und Detailblatt leiten Kante, Rubrik,
Zeichen und Schimmer gemeinsam aus `--story` ab.

**Aktueller Snapshot-Vertrag (ersetzt die historischen Deckel- und
Auffrischungsregeln in den folgenden Befundabsätzen):** Eine einmal in
`stories` publizierte Zeile bleibt in ID, Text, Zeitpunkt, Priorität,
Beteiligten und visuellen Daten unverändert. Gleicher Wortlaut, spätere
Serienstände, weitere Partien sowie Tages-, Typ-, Spieler- oder
Gesamtkontingente dürfen sie nicht entfernen. `_newsTexteAuffrischen` ist
deshalb nur noch ein kompatibler Identitätsweg. `_consolidateStories`
verdichtet ausschließlich verlustfrei; Gruppen tragen `memberIds` und die
Snapshotdaten ihrer Mitglieder. Das DB-Fenster wird vollständig und
seitenweise geladen, nicht auf eine feste Zeilenzahl gekürzt.

**Eine Partie, eine Matchkarte:** Alle matchbezogenen Ereignisse mit derselben
konkreten `matchId` werden gebündelt, auch Breaking, mehrere Auszeichnungsthemen
und negative Ereignisse. Die negative Richtung gehört ihrer Zeile (`neg`),
nicht einer zweiten Karte; Gewinner und Betroffene werden nicht verwechselt.
Gruppenzeilen tragen die ursprünglichen `members`, Bundlezeilen deren
`sourceIds` und unveränderte `ref`-Daten im Speicher. So bleiben IDs und
Fakten auch nach einer Vorgruppierung auffindbar. Bekannte verschiedene
Match-IDs werden nie über eine gemeinsame Minute zusammengelegt.

Alte kleine Auszeichnungen in Tageskarten werden zur Anzeige anhand ihrer
gespeicherten Match-IDs aufgeteilt und mit identischen neuen Marken vereinigt;
sämtliche Quell-IDs bleiben erhalten, die DB-Zeile bleibt unangetastet.
Rivalitätsstände speichern ihren Matchauslöser. Bei alten Rivalitäten ohne
`matchId` wird nur eine Partie mit exakt demselben Zeitpunkt und derselben
Paarung zugeordnet; bei mehreren Kandidaten entscheidet der damalige Duellstand.
Es gibt keinen Rückfall auf das inzwischen jüngste Duell.

Veränderlich ist nur, was heute noch läuft: die **heutige Ewige Tafel**
und die **heutige Insignium-Karte**. Rekord- und Chronikbewegungen eines
lokalen Tages teilen den Schlüssel `tafel:<Datum>`, ergeben genau eine
sichtbare Karte und setzen deren Zeitpunkt auf den jüngsten enthaltenen
Wechsel. Die Leiter ist EINE Zeile je Tag (`instag_<Datum>`), bei jedem Lauf
neu gegen den Stand vor dem Spieltag gerechnet. Vorher stand jede neue Stufe
als eigene Zeile in der Tafel, ein Grad gar nicht und ein Rückfall auch
nicht, und eine Stufe, die am Mittag erreicht und am Abend wieder verloren
war, blieb als „trägt den Volutenkranz" stehen.

Gewachsen sind beide zuerst per Upsert unter derselben ID. Die Tabelle
`stories` erlaubt aber nur Einfügen, kein Ändern: jede spätere Fassung
scheiterte, und der ganze Stapel des Uploads mit ihr. Am 19.10. stand in der
Datenbank die Tafel und die Insignium-Karte von 13:54, obwohl die Partien
um 14:04 und 17:17 beide verändert hatten. Bis der Generator fertig war,
zeigte der Feed die alte Karte, danach die neue, und nach Mitternacht für
immer die alte; das Blatt rechnete neu und zeigte die richtige. Seither ist
jede Fassung eine eigene Zeile, und die Auswahl der geltenden geschieht
beim Lesen.

Neue Matchstories speichern die Darstellung als `dataRef.visual` Version 2:
`score` enthält eine immer sichtbare Scoregrafik, `occasion` höchstens eine
unabhängige Anlassgrafik. `scoreVisualKey` und `occasionVisualKey` liegen
zusätzlich direkt im `dataRef`. Die gespeicherten Zeichnungsdaten werden
gerendert, nicht bei einem späteren Lauf neu gewählt. Karten mit genau einer
Partie erben beide Ebenen; Karten mit mehreren Partien behaupten keinen
einzelnen gemeinsamen Endstand. Alte Stories bleiben über den bisherigen
Anlasspfad lesbar.

Funfacts haben genau einen lokalen Slot um **15:00 Uhr**. Beim nächsten
Öffnen werden fehlende, vollständig matchfreie Tage innerhalb des
14-Tage-Fensters nachgetragen, auch nach mehrtägiger Pause. Heute verhindert
nur eine Partie oder ein Saisonabschluss bis 15:00 Uhr den Slot; beginnt die
erste Partie beispielsweise um 15:20 Uhr, bleibt der 15-Uhr-Snapshot stehen.
Normale Funfacts werden nie durch spätere Tagesereignisse entfernt.
Drei Regeln gegen Rauschen: **kein Story-Typ steht an einem Tag mehr als zweimal im
Feed** (`_consolidateStories`, ausgenommen die seltenen Ereignisse, die
Sammelkarte — und alles, was es je Tag, Woche oder Monat genau EINMAL
gibt (`TAG_PFLICHT`). Das kann sich nicht wiederholen: seit der Feed
vierzehn Tage zurückreicht, liegen sechs bis sieben Spieltage darin, und
von ihren Siegern standen gemessen zwei im Feed — vier Spieltage
verloren genau die Karte, die ihre Schlagzeile ist. „Leo ist Spieler des
Tages" und „Alex ist Spieler des Tages" sind keine Wiederholung
voneinander, sie gehören zwei verschiedenen Tagen. Bei sieben Tagen
Fenster fiel es nicht auf, da passten zwei Sieger hinein), **keine zwei
Karten tragen dieselbe
Schlagzeile** oder **denselben Text** („Eine große Rivalität, die Liga
liebt's" stand wortgleich unter zwei Karten und nannte keine einzige Zahl).
**`prio` steht auf EINER Skala** (`STORY_PRIO`, §11.0a). Der Tagesdeckel und
das Gewicht einer Sammelkarte sind Vergleiche, und ein Vergleich braucht eine
Skala. Es waren zwei: die Spieltags-Karten standen auf 1 bis 10, die Karten
der Ewigen Tafel auf 70 bis 95 — jede für sich richtig einsortiert, nie
gegeneinander. Damit gewann jede Tafel-Karte, bevor der Deckel hinsah.
Gemessen über 56 Spieltage bekam die Ewige Tafel 66 % aller Tagesplätze,
und von dem, was der Generator zum Spieltag selbst bildete, fielen 70 % der
laufenden Siegesserien, 83 % der Pleitenserien und 83 % der Serienbrecher
weg, während jede der 183 Insignium-Stufen und jeder der 88 Rekordwechsel
durchkam. Wer die App nach einem Spieltag öffnete, las von allem außer vom
Spieltag. Drei Bänder ordnen jetzt alles: **Breaking** (90+), **der
Spieltag** (38–89, was DIESE Partien hergegeben haben) und **der
Hintergrund** (10–37, was gestern schon galt). Innerhalb eines Bandes
entscheidet die gemessene Seltenheit; fest bleiben nur der Sieger des
Spieltags oben und an der Tafel die Ordnung Liga-Rekord über Monatschronik
über Insignium-Stufe. Die Zahlen stehen an EINER Stelle: verteilt über 1900
Zeilen ist die zweite Skala genau der Fehler, den niemand sieht.
Eine **Sammelkarte trägt, was sie zusammenfasst** — das Gewicht ihres
stärksten Teils und einen Schritt je weiterem. Mit `+1` wog eine Karte über drei Insignium-
Stufen kaum mehr als eine einzelne davon; eine einzelne Karte zu deckeln
kostet eine Meldung, diese zu deckeln kostet alle. Die Karte über EINEN
Spieler und die über EINEN Erfolg erben gar nicht: sie fassen keinen Moment
zusammen, sie sind eine eigene Nachricht und haben einen eigenen Rang.
**Text und Titel fassen immer die Gruppe zusammen**; kein Einzelereignis
wird in den Kopf kopiert oder dadurch wichtiger gemacht.
**Und sie steht an der Uhrzeit einer Zeile, die sie ZEIGT.** Sie trug die
des jüngsten Teils, und ein Tafel-Moment umfasst den ganzen Spieltag: die
Karte stand nach der zweiten Partie um 10:44 im Feed und wanderte mit jeder
weiteren nach unten, bis sie um 14:32 unter allen Partien lag. Wer sie
mittags gelesen hatte, fand sie abends an einer anderen Stelle — und eine
Karte, die ihren Zeitpunkt wechselt, ist im Feed eine andere. Die älteste
Zeile zu nehmen ist aber auch falsch: die ist bei einem Tafel-Moment fast
immer ein **Ausbau**, und ein Ausbau steht gar nicht auf der Karte. Gemessen
stand darüber „Heute, 15:19" und darunter, in jeder einzelnen Zeile und im
Ergebnisband, „15:37" — eine Uhrzeit, zu der nichts von dem passiert ist,
was die Karte zeigt. Den jüngsten Teil zu nehmen löst das und kostet die
Karte ihren Platz: der Tagesdeckel vergibt chronologisch, und der
reservierte Platz der Ewigen Tafel geht an die FRÜHESTE Tafel-Karte des
Tages — gemessen fiel der ganze Tafel-Moment damit aus dem Feed. Es ist
deshalb die früheste Zeile, die auch auf der Karte stehen kann: sie bleibt
stehen, weil keine früher gespielte Partie nachträglich dazukommt und ein
Ausbau nie ein Wechsel wird. Jede Zeile nennt ohnehin ihre eigene Uhrzeit,
und jede trägt die ID der Karte, aus der sie kommt, damit nachzumessen ist,
dass eine Karte im Bündel aufgeht und nicht verschwindet.
**Der Satz zählt nicht dreimal und behauptet keinen Moment.** Er hieß „Ein
Moment, 8 Spuren: 5 Ausbauten und drei Monatschroniken ordnen die Ewige
Tafel neu." Drei Fehler in einer Zeile: „Ein Moment" gilt nicht für einen
ganzen Spieltag, dessen Zeilen gemessen 14:09 und 14:32 tragen; „8 Spuren"
ist eine Floskel und zählt dasselbe wie die Aufzählung dahinter; und „8"
als Ziffer neben „drei" als Wort mischt beide Schreibweisen im selben Satz
[§C27]. Übrig bleibt die Aufzählung und der Zeitraum, für den sie gilt.

**Die Reihenfolge ist die Zeit.** `_consolidateStories` sortiert nicht mehr
um. Zwei Durchgänge taten das früher: einer tauschte gleichartige Nachbarn,
einer schob Karten nach hinten, deren Gesichter schon viermal dastanden.
Beide kosteten Chronologie, ohne eine einzige Karte zu sparen, und der Feed
ist nach Tagen gegliedert: eine Karte, die dabei den Tag wechselt, steht
unter dem falschen Kopf. Gemessen ergab das acht Tagesköpfe für sieben Tage.
Die Verteilung trägt jetzt allein der Generator (`PER_PLAYER_LIMIT`,
`NEBENROLLEN_LIMIT`); gemessen steht danach kein Spieler auf mehr als einem
Drittel der Karten, und jeder gewertete Spieler kommt vor.
**Was es je Tag genau einmal gibt, fällt dort nicht weg** (`GEN_PFLICHT`).
Der Deckel zählt Karten je Spieler, und sortiert ist davor nach Zeit: wer am
Nachmittag noch drei Karten bekommt, hat sein Budget aufgebraucht, bevor der
Deckel die Karte vom Mittag ansieht. Gemessen kostete das den EINZIGEN
Spitzenwechsel des Augusts — am 11.08. gab Leon die Tabelle an Martin ab,
und die Titelrennen-Karte des Tages fiel aus, weil Martin an diesem Tag
schon auf drei Karten stand; dieselbe Falle stand vor jeder Insignium-Stufe
und vor dem Spieler des Tages. Diese Karten zählen weiter mit, damit die
übrigen zurückstehen, verworfen werden sie nie — dieselbe Regel wie
`TAG_PFLICHT` in der Anzeige, nur eine Stufe früher: was der Generator hier
wegwirft, fehlt danach auch in seinem Bündel. Gemessen kamen im Juni 2026
dadurch zehn Ereignisse zurück, die in keiner Karte mehr standen. Dasselbe
gilt für die Marke einer laufenden Serie (`GEN_PARTIE`): sie hängt an ihrer
Partie und geht in deren Bündel auf, ist also keine eigene Karte — und der
letzte Lauf eines Spieltags, der mit allen Tafel- und Insignium-Karten,
verwarf sie. Leons 3er-Serie vom 01.10. hielt nur die Datenbank fest.
**Die Uhr des Telefons ist nicht die des Servers.** Den Zeitpunkt einer
Partie setzt der Server, `now` das Telefon. Geht dessen Uhr zwei Sekunden
nach, gilt die gerade gespeicherte Partie im ersten Lauf als künftig, und
der Memo des Generators hielt genau dieses Ergebnis fest, bis die nächste
Partie kam. Sein Schlüssel zählt deshalb auch die Partien, die für diese
Uhr noch in der Zukunft liegen; holt die Uhr sie ein, läuft er neu.

**Was einmal dasteht, bleibt stehen.** Jede Entscheidung zwischen zwei
Karten fällt in der Reihenfolge, in der die Nachrichten entstanden sind:
über eine Karte entscheidet nur, was VOR ihr dastand, und eine spätere
Partie kann sie nicht mehr aus dem Feed nehmen. Vorher wählten beide Deckel
nach `prio` aus dem ganzen Tag: gemessen schrieb ein Spieltag damit nach fast
jeder Partie einen Teil seiner Tafel um — nach der ersten Partie standen vier
Karten, nach der zweiten war eine davon weg, nach der vierten die nächste.
Wer mittags gelesen hatte, fand abends etwas anderes vor. Der **Deckel je
Sorte** behält deshalb die ersten zwei und der **Tagesdeckel** vergibt seine
Plätze von vorn. Gelesen wird weiter von neu nach alt, also steht die
Reihenfolge am Ende einmal und nur nach dem Zeitpunkt.
**Dieselbe Aussage ist die Ausnahme, und dort gilt die spätere.** Die drei
Sperren (`seenContent`, `seenTitel`, die Sperrfrist) lesen `src` von neu nach
alt, also bleibt die jüngste Karte stehen: „Der größte Ausschlag des Tages"
gehörte gestern jemand anderem, und die zweite Karte trägt den Stand, der
jetzt gilt. Es ist keine neue Nachricht, es ist dieselbe mit einer neuen
Zahl — sie steht mit ihrem eigenen Zeitpunkt da, und die erste fällt.
**Eine Karte, die den ganzen Tag zusammenfasst, zählt nicht gegen den
Deckel** (`TAG_SUMME`). „Harter Tag für X" ist der Gegenpart zum Sieger des
Tages: es gibt sie je Tag einmal, und sie trägt 23:58 — die Uhrzeit, zu der
der Tag zu ist, nicht die der Partie, die sie ausgelöst hat. Gegen einen
Deckel, der von vorn vergibt, verliert sie damit immer: gemessen stand sie
nach der vierten Partie des 26.08. im Feed und fiel nach der fünften heraus,
weil vier Karten mit früherer Uhrzeit dazugekommen waren. Eine Wiederholung
kann sie nicht sein, also nimmt sie niemandem etwas weg. Vom Vergleich der
Schlagzeilen ist sie dagegen NICHT ausgenommen — „Harter Tag für Johannes"
stand an vier Tagen des Fensters.
`tests/ambient` spielt den letzten Spieltag Partie für Partie nach, mit
einem Bestand, der sich verhält wie die Datenbank.
Der Deckel je Sorte ist ein Deckel auf **Wiederholungen**, und eine Partie
ist keine: neun Partien an einem Tag sind neun Ereignisse, nicht eine
Nachricht und acht Wiederholungen. Zwei Karten derselben Sorte können damit
untereinander stehen — die Grenze ist der Deckel und nicht die Reihenfolge;
umsortieren wäre der größere Fehler, eine Karte gehört ihrem Zeitpunkt.
**Jede Partie bekommt ihre Karte** (`spiel_<Partie>`, `type:'spiel'`,
`STORY_PRIO.spiel`). Gebildet wurde nur, was ein auffälliges Muster traf — ein
10:0, ein Krimi, ein Außenseitersieg —, und davon höchstens zwei je Tag.
Gemessen über das Vierzehn-Tage-Fenster: 52 Partien, und 18 davon kamen in
einer sichtbaren Karte überhaupt vor. Wer am Abend den Spieltag nachliest,
erfuhr von zwei Dritteln der Spiele nichts. Die Karte ist der **Anker** ihres
Spiels: alles, was in dieser Partie passiert ist — eine Serienmarke, eine
Auszeichnung, ein Meilenstein, ein Spitzenwechsel — hängt sich beim Bündeln
an sie. Ohne einen einzigen Fakt bleibt sie das Ergebnis mit den beiden
Zahlen, die jede Partie hat: die Siegchance vor dem Anstoß und die Elo danach.
**Kopf und Fuß zeigen, wovon die Partie erzählt** (`_spBild`,
`30b-news-spieltag.js`). Jede Partie-Karte begann mit demselben
Ergebnisband, und darunter wechselte nur eine Zeile: dreißig Karten sahen im
Feed gleich aus. Der Anlass wählt jetzt beides, in fester Rangfolge, das
erste, was zutrifft (`_spAnlass`): der **Spitzenwechsel**, eine **seltene
oder legendäre Auszeichnung** (die Medaille und wer sie in der Liga trägt),
der **Serienbruch** (die Zahl rot durchgestrichen, der Lauf mit dem roten
Feld der Partie, die ihn beendet hat, und wer das war — derselbe Lauf wie bei
der Serie, eine Kette aus Gliedern war eine zweite Bildsprache), die
**Serie** (der Lauf gegen den eigenen Bestwert und den Liga-Rekord VOR dieser
Partie), die **Teamserie** (der Lauf des Duos und seine Bilanz als Ring), der
**Außenseitersieg** (die Wippe: das Elo-Gewicht beider Teams), die
**Rivalitätsmarke** (jede Begegnung der beiden als Balken bis zu dieser
Partie), die **Premiere** (der erste gemeinsame Sieg eines Duos, beim ersten
Mal oder ab dem dritten Versuch, und die Versuche als Lauf), die **Wende**
(die Elo-Kurve der letzten zwölf Partien, ab drei Pleiten), der
**Rangsprung** ab zwei Plätzen (die Monatstabelle als Kette: jeder Platz ein
Feld, wer stieg, gleitet von seinem alten Feld herüber, ein Bogen zeigt den
Sprung, die neue Spitze in Gold — vorher neun Zeilen mit Linien von „vorher"
nach „danach", die höchste Zeichnung aller Füße, in der wer sich nicht
bewegte so viel Platz nahm wie der Sprung), der **Rollentausch** (ein Sieg auf der
Seite, die vorher unter einem Viertel der eigenen Partien lag, ab zwanzig,
und ihr Anteil als Strahl), der **Ein-Tor-Krimi** (die Anzeigetafel und die
Bilanz der Sieger in engen Partien), der **deutliche Sieg** ab sechs Toren
(alle Partien der Liga nach Gegentoren und wie viele so deutlich waren; im
Kopf der Stand groß, der Sieger hell, und je Tor des Siegers ein Feld,
davon der Abstand hell — der Stand stand dort allein und kursiv, weil
`_spStand` ihn aus `<em>` baut und die Regel fehlte) und
sonst eine der **dreizehn Formen der gewöhnlichen Partie** (unten).
**Die Medaille gehört dem Seltenen.** Sie stand auch für jede gewöhnliche
Auszeichnung und jede runde Marke, und an einem Spieltag trug damit jede
dritte Partie-Karte dieselbe Medaille — auf einem 10:9 der „Zittersieg",
obwohl die Anzeigetafel genau das zeigt. Eine gewöhnliche Auszeichnung steht
als Zeile im Sammelband, und was eine seltene nur als Ergebnis erzählt
(`SP_ERGEBNIS_BADGE`, dieselbe Liste wie `BADGE_DECKT`), zeigt das Bild des
Ergebnisses. Eine runde Wiederholung ist dagegen eine persönliche Leistung:
`dataRef.rang` hält ihre historische Vergabezahl. Auch reine
Ergebnis-Badges dürfen an diesen Wiederholungsmarken die Medaille tragen.
**Die Medaille nennt jeden, der sie in der Partie holte**, mit dem
wievielten Mal („zum ersten Mal", „5. Mal"), einen allein mit der nächsten
Marke („noch 5 bis zur 10."), und darunter die Liga als Punkte: hell, wer
sie trägt, leuchtend, wer sie hier holte. Vorher gab es zwei Zeichnungen,
eine mit Plätzen für das erste Mal und eine mit Marken für die
Wiederholung, und beide nannten nur einen: holten Julian und Maxi
„Absoluter Sieger" zusammen, stand im Fuß nur Julian. Takt und Grafik
teilen `_badgeNaechsteMarke`; neue Occasiondaten speichern `rang`,
`wiederholung`, `marken` und `alle`, alte V2-Daten ohne `alle` zeigen ihren
einen Träger.
**Runde Zahlen stehen zusammen** (`marken`): jeder Sieg, jede Elo, jedes
Tor und jede Partie, die in dieser Partie rund wurde, von jedem, auf
Klappziffern. Das Zählwerk zeichnete nur die erste Marke ihrer Art, und
erreichten der eine den hundertsten Sieg und der andere die fünfhundertste
Partie, stand nur der Sieg im Fuß. Der erste Trägerstand und ein Legacy-Rang
kommen aus dem kanonischen Vergabe-Eventindex am `_spBasis`, gebunden an die
Eventcache-Referenz, nicht aus einem heutigen Vollzensus je Spieler.
**Der Rangsprung braucht eine Tabelle**: am Monatsanfang
springt jeder Sieger zwei Plätze, weil die Tabelle aus drei Leuten besteht;
er zählt erst, wenn die Rangliste belastbar ist (`_storyRangFrei`).
**Die gewöhnliche Partie hat dreizehn Gesichter** (`SP_FORM`, `_spForm`).
Gut die Hälfte der Partie-Karten hat keinen Anlass, und jede davon trug
dasselbe Spielfeld: gemessen 31 von 59 Partie-Karten im Fenster. Jede
Partie hat aber etwas, das nur sie hat. Jede Form trägt eine Regel
(`wann`), ein Gewicht (`rang`), Schlagzeile und Satz (`text`) und ein Bild:
das **Mosaik** (10:7 und 10:8, jedes Ergebnis als Feld, so hell wie
häufig), **Pflicht erfüllt** (der Favorit ab 62 %, die Nadel), **Erwartung
gegen Ergebnis** (ab der fünfzigsten Partie, knapp trotz 70 % oder klar
trotz unter 50 %: die Liga als Wolke, die Erwartung als Linie), der
**Elo-Transfer** (so viel Elo wie nur jede achte Partie davor),
**Eingespielt** (ein Duo ab zwölf Partien und drei Vierteln Siegen, oder
eine runde Zahl gemeinsamer Siege), der **Lieblingsgegner** und der
**gebrochene Fluch** (Spieler gegen Spieler: jede fünfte Marke ab drei
Vierteln, oder ein Sieg nach mindestens fünf Niederlagen gegen ihn), die
**Revanche** (dieselben zwei Duos, damals gewann die andere Seite — mit
dem Abstand in Minuten, Stunden, Tagen oder Wochen), das
**Gipfeltreffen** (der Erste und der Zweite der Monatstabelle am Tisch),
**Zurück am Tisch** (ein Sieg nach mindestens zehn Tagen Pause), **Zwei
Welten** (ab 220 Elo zwischen den Siegern), der **Tagesring** (ab vier
Partien des Tages und drei Vierteln Siegen), das **Zählwerk** (der
fünfzigste, hundertste … Sieg oder die Partie, oder jede hundertste der
Liga) und das **Spielfeld**, das immer passt. **In jeder Form steht der
Stand** (`_spSt`), und zwar als Teil der Zeichnung — im Feld des Mosaiks,
unter der Nadel, als Ende der Reihe —, und **alle vier Namen**: wer den
Feed überfliegt, will wissen, welche Partie es war; beim Tagesring stand
der Stand zuerst nur im Satz. Mehrere Anlässe teilen sich dagegen kein
Bild: der stärkste wählt den Kopf, die übrigen hängen als Zeilen im
Sammelband.
**Die V2-Scorewahl folgt dem Katalog und ist fest** (`_spScoreWahl`). Ein
besonderer Ausgang ist selbst die Geschichte und trägt den Kopf in festem
Vorrang: Außenseitersieg, zu null, ein Tor Abstand, ab sechs Toren — außer
derselbe stand auf einer der zwei Karten davor, denn der klare Sieg trifft
jede fünfte Partie und stand sonst viermal hintereinander. Sonst kommt die
Grundansicht, die am längsten nicht dran war, bei Gleichstand die vordere
des Katalogs (`SP_KOPF_GRUND`). Vorher gewann ein Befund nach Gewicht und
Abschlägen, und drei Ansichten (Tacho, Klapptafel, Band) standen auf fast der
Hälfte der Karten; der Tacho (Gewicht 20) stand über jedem Sieg eines
Favoriten, gemessen auf neun von 43 Karten in dreißig Tagen. Gemessen an
616 Partien verteilt der Katalog die Köpfe auf vierzehn Ansichten, keine
zweimal hintereinander, in keinem Fenster von zehn Karten eine öfter als
dreimal. „Leon und Henry gewinnen als ungleiches Paar" stand an zwei Tagen
dreimal, weil die 220 Elo am Duo hängen und nicht an der Partie; „Zwei
Welten" zählt deshalb nur, wenn dasselbe Duo es auf den letzten dreißig
Karten nicht hatte. Das Mosaik verlangt einen seltenen, häufigsten oder
runden Verteilungsbefund. Den Elo-Transfer gibt es nicht mehr: dieselben
Zahlen zeigt der Elo-Strom, mit den Gesichtern an den Enden.
**Team A links, Team B rechts.** Eine Zeit lang standen die Sieger immer
links (gespiegelt beim Zeichnen), mit „schlagen" in der Namenszeile.
Spielten aber dieselben vier mehrmals hintereinander, wechselten die Namen
bei jedem Sieg der anderen Seite die Seite, und die Karte stand anders als
der Tisch und die Eingabe. Jetzt steht jede Seite, wo sie eingetragen ist:
ein Kopf mit A und B zeichnet sich, wie er ist, einer, der nach Siegern
rechnet, wird gespiegelt, wenn B gewann (`sp-b`), der Stand liest sich A:B
mit dem Sieger hell (`_spSt`), und unter jedem Kopf steht dieselbe
Teamzeile „A gegen B" mit grüner Kante für die Sieger und roter für die
Verlierer (`_spTeamZeile`) — die Farbe sagt, wer gewann, nicht die Seite.
Ein eigener Stand für Strom und Herzschlag sah fast aus wie `_spSt` und war
doch ein zweites Bauteil. Band, Spielfeld und Wippe schrieben die Namen
unter ihre Gesichter, und die Teamzeile darunter nannte sie noch einmal,
in anderer Reihenfolge („Stefan, Leon“ über „Leon, Stefan“). Tacho,
Münzwurf und Tauziehen legten das zweite Gesicht eines Paars über das
erste und deckten dessen Buchstaben zu. Zu null las bei einem Sieg von B
„10:0“ neben den Verlierern: die Rückstellung der Spalten traf Stand und
Tore mit. Der Münzwurf nannte die Chance zweimal, als „52:48“ und als
„Siegchance vorher 52 %“; die Klappziffern eines Zählers endeten auf einem
einzelnen Punkt („1 5 0 .“); die Duo-Serie schrieb „7 Siege in Folge“ und
„7:0 in 7 Duellen“ unter eine Zeile, die beides schon sagte.
Die Spur liest gespeicherte V2-Grafiken aus dem Rohbestand, statt alte
Spielfeldkarten nach neuen Regeln als andere Formen zu zählen. Ein
chronologischer Durchlauf je Datenstand und deterministische Gleichstände
ergeben beim Kaltstart dieselbe Wahl. Neue Partien ändern keine publizierte
Score- oder Anlassgrafik; eine gespeicherte Karte mit Krimi, Ergebniszeile,
Abstand oder Transfer zeigt diese weiter. Der Legacy-Pfad `_spForm` bleibt
für alte Karten lesbar; seine historischen dreizehn Formen werden nicht
umgeschrieben.
Die Fakten
kommen aus den ungebündelten Meldungen (`_newsRohIndex`), weil eine
Sammelzeile nur Titel und Zeichen trägt. Der **Spieler des Tages** zeigt
seinen Tag als Bahn und die Elo darüber (`_spTagBild`) statt dreier Zahlen.
**Jedes Bauteil hat zwei Hälften**: `…Daten` rechnet aus den Partien,
`…Bild` zeichnet nur, was es bekommt. Die Liga wächst, aus 466 Partien
werden 46 600 und aus „Leo" „Maximilian-Alexander"; weil das Bild nur Daten
nimmt, zeichnet `tests/blatt` jedes Bauteil auch mit Grenzwerten und langen
Namen. **Nichts wird gekürzt oder geschrumpft**: ein „…" versteckte, wer
gemeint ist, und ein kleinerer Name sah neben seinen Nachbarn falsch aus. Ein
Name steht in der Grafik nur, wo sie Platz für ihn hat — auf dem Spielfeld
unter seinem Wappen, in der Tabelle an seiner Linie —, und ob er passt, sagt
eine feste Regel (`_spPasst`: kein Wort länger, als die Spalte Zeichen
fasst), keine Messung. Sonst steht er in einer **Textstelle** darunter
(`.sp-lg`), ein Name je Zeile. Dieselbe Regel gilt seitdem für das
Ergebnisband (ein Name je Zeile), die Zeile einer Sammelkarte und den
Faden: sie brechen um, statt mit „…" zu enden. Was wächst, hat einen Deckel
und sagt, was dahinter liegt: die Serie wird über sechzehn ein Balken, der
gerissene Lauf über zwanzig Siege ein Balken, die Rivalität zeigt die letzten
dreißig Begegnungen, die Tabelle neun Plätze um die Bewegung, die Medaille
ab sechzehn Spielern Punkte statt Gesichter. Gerechnet wird einmal je
Datenstand (`_spBasis`: Spielreihenfolge, Ergebnisverteilung als
Präfixsumme, Serienstand vor jeder Partie, die Runden), und das Bild einer
Karte wird gemerkt (`_spBildMemo`) [§3 Caching].
Und **was die Zeichnung zeigt, sagt der Satz nicht** (`_newsSpielSatz`,
`zeigt` aus `_spBild`): „Die Siegchance lag vor dem Anstoß bei 73 %, für
Maxi bringt der Sieg +13 Elo." stand unter jeder Partie-Karte, und dreißig
Mal derselbe Satz sagt nichts. Er fällt unter jeder Partie-Karte weg; wie
`_ndLead` eine Ableitung aus dem Text, also auch für gespeicherte Karten.
Die gewöhnliche Partie bekommt stattdessen den Satz ihrer Form, und der
nennt, was weder Schlagzeile noch Zeichnung zeigen: wie oft die Sieger
dieses Ergebnis schon hatten, die Quote mit anderen Partnern, wann der
letzte Sieg gegen diesen Gegner war. Nur „Zwei Welten" nennt den Gewinn
beider Sieger, weil die Zeichnung die Elo VORHER zeigt. Ein Satz, der die
Geschichte eines Anlasses ist — „Nur 30 % Siegchance … Trotzdem …" —,
bleibt.
**Dieselben Vier am Tisch bekommen eine eigene Karte, die Runde**
(`_newsRundenStories`, `type:'runde'`). 115 der 466 Partien liegen in
Runden: dieselben vier, Partie auf Partie, meist mit wechselnden Paarungen,
und dass es eine Runde war, sah man nur an den Wappen. Eine **Runde** ist ein
Block von Partien ohne eine Pause über dreißig Minuten (`RUNDE_PAUSE_MS`),
in dem nur dieselben vier gespielt haben, und das mindestens dreimal
(`RUNDE_MIN`) — zwei Partien sind ein Rückspiel, und spielt im Block ein
Fünfter, ist es keine Runde. Gemessen liegen die Abstände darin bei 11
Minuten im Median und unter 17 Minuten in neun von zehn Fällen; so ergeben
sich 29 Runden. **Jede Partie behält ihre Karte und ihr Bild.** Die Runde
war zuerst eine Ableitung bei der Anzeige, die die Karten ihrer Partien
aufnahm, und bei vier Spielern stand danach nur noch sie da: Spielfeld,
Anzeigetafel, Wippe und Lauf jeder einzelnen Partie gingen verloren. Jetzt
ist sie eine Story wie jede andere, die **dazukommt**: dreißig Minuten nach
der letzten Partie, wenn feststeht, dass keine mehr folgt, und dieser
Zeitpunkt ist ihr Zeitstempel. Vorher weiß niemand, ob noch eine Partie
kommt — und was einmal dasteht, bleibt stehen: die ID trägt die erste
Partie, gespeichert wird sie einmal. Die Schlagzeile nennt, wer sie
gewonnen hat — bei immer denselben Teams ist es ein Duell („gewinnen die
Runde gegen … 3:1", „trennen sich 1:1") —, der Satz die **Uhrzeiten** der
ersten und letzten Partie. **Die Karte fasst zusammen**: die Tabelle
als Reihe aus vier Feldern (Siege, Niederlagen, Elo) und die Partien als
Streifen aus Uhrzeit und Stand. Sie trug darunter jede Partie als Zeile mit
vier Wappen und ihrem Anlass — und genau diese Partien stehen direkt
daneben als eigene Karten: wer scrollte, las jedes Spiel zweimal, und was
die Runde ist, stand nirgends. Eine Kennzeile in Kleinschrift über der
Schlagzeile („Zusammenfassung von 5 Partien am Stück, nur …") sollte das
sagen; sie wiederholte Rubrik, Satz und Tabelle und las sich als Fußnote vor
der Überschrift, und sie ist wieder weg. Die Fläche ist leiser (gestrichelte Kante,
kein Schein). Das Blatt zeigt die Tabelle, wer mit wem an welcher
Stange stand (eine Spalte je Partie, in Blöcken zu acht, die Zeilen in der
Folge der Tabelle — eine Legende darunter erklärte die Zeichnung) und jede Partie;
jede Zeile öffnet die Karte ihrer Partie. Sie zählt gegen keinen Deckel,
fällt an keiner Sperre und verbraucht im Generator kein Budget eines
Spielers (`PER_PLAYER_LIMIT`): sie fasst zusammen, was ohnehin dasteht, und
nahm dort gemessen den Karten derselben Spieler den Platz.
**Sie ist keine Auswahl, sie wurde gespielt**, und darum zählt sie gegen
keinen Deckel und fällt an keiner Sperre: nicht am Tagesdeckel, nicht am
Deckel je Sorte, nicht am Vergleich der Schlagzeilen (zwei Partien derselben
vier Leute heißen gleich), nicht an der Sperrfrist und nicht am
`PER_PLAYER_LIMIT` des Generators — dort verbrauchte ein Vielspieler nach den
ersten Partien eines Tages sein Budget, und gemessen fiel danach jede
Formkarte, jede Serienmarke und jeder Meilenstein desselben Tages weg.
**Und das Bündel, in dem sie steckt, auch nicht** (`_istPartie`). Bündelt
die Karte einer Partie mit einer Meldung ohne Partie — eine Rivalität, der
Countdown —, entstand ein Bündel nach Minute ohne `matchId`; es zählte gegen
den Deckel je Sorte, der je Tag nur die ersten zwei behält, und die Partie
darin verschwand. Gemessen am 01.10.: fünf Partien derselben vier, und die
um 15:08 lag in der Datenbank und stand nirgends im Feed. Ein Bündel ist
deshalb eine Partie, sobald eine Partie-Karte darin steckt, und steckt genau
eine darin und nennt kein Teil eine andere, trägt es deren `matchId` — dann
hat es auch ihr Bild und ihr Band.
Gedeckelt wird nur noch, was **über** den Partien liegt und von gestern schon
gelten könnte. Damit ist auch `matchProTagMin` gefallen: ein reservierter
Platz für „eine Geschichte mit konkreter Partie" ist verschenkt, wenn jede
Partie ohnehin eine Karte hat.
**Und ihre Schlagzeile ist ihr Hauptanlass.** Ein Bündel hieß zuerst „Ein
Spiel, zwei Geschichten für Maxi und Henry" — das gilt für jeden Spieltag
und sagt von keinem Anlass etwas. Danach nannte es die Anlässe als Reihe
(„Serienbruch gegen Martin und Elo-Marke für Maxi im Ein-Tor-Krimi"), mit
genau ihren Leuten, dem stärksten zuerst und höchstens 96 Zeichen. Darunter
standen aber dieselben Anlässe noch einmal als Zeilen, und die Serie, die
der Fuß zeichnete, ein drittes Mal: jeder Anlass stand bis zu dreimal auf
derselben Karte, fast jede zweite trug vier Zeilen und „und 2 weitere", und
unter „Julian holt die legendäre Auszeichnung ‚Dominator‘" stand „Julian
holt ‚Carry‘ zum 5. Mal". Jetzt ist der schwerste Anlass, der keine Pleite
ist, die Schlagzeile in seinem eigenen Satz, jeder andere steht einmal: als
Zeichnung des Fußes (mit seinem Satz klein darunter, wenn er nicht der
Hauptanlass ist) oder als eine von höchstens drei Zeilen, ein neues Thema
zuerst. Gemessen an dreißig Partie-Bündeln der Fixtures trug vorher jede
mindestens eine Zeile und sieben drei oder mehr; jetzt tragen neunzehn
keine, weil Schlagzeile und Fuß schon alles sagen. Was der Fuß zeichnet,
wurde zuerst nach Art und Person geraten: zwei Rivalitäten oder die
Duo-Jubiläen beider Seiten einer Partie galten beide als gezeichnet, und
eine fehlte auf der Karte. Jetzt merkt sich der Fuß die Meldungen, die er
zeigt, die Medaille jeden ihrer Halter. Im Blatt stand der Satz des
Hauptanlasses als Titel und gleich darunter als erste Zeile; die Zeile
trägt dort jetzt seinen Beleg. Eine
Pleite steht nie als Schlagzeile über einem Sieg: über ihm stand sonst
„Jane bekommt ‚Absoluter Verlierer‘"; gibt es nur Pleiten, erzählt das
Ergebnis. Die gemeinsame Pleite und eine Auszeichnung, die keiner will,
sind Nebensachen: sie standen als rote Zeilen unter jedem zweiten Sieg und
stehen jetzt nur im Blatt. Ein Bündel über eine Minute ohne gemeinsame
Partie behält die Reihe. Etiketten mit Doppelpunkt („Leo: Krimi-Versager",
„50. Duell: Leo vs Martin") werden zu Sätzen (`_satzZeile`, aus dem
`dataRef`; der gespeicherte Titel bleibt), und seit eine Zeile auch
Schlagzeile ist, sagen sie nicht mehr „ziehen ihre Serien gemeinsam
weiter". Der Satz unter der Schlagzeile ist der Satz der Partie aus ihrer
Form oder ihrem Anlass; „Eine Meldung hängt daran" beschrieb den Bau der
Karte.
**Und jede Partie hat etwas, das nur sie sagt.** An gut der Hälfte der
Partien hing kein einziger Anlass, und was die Liga in einer Partie
wirklich bewegt — wer im Duell wieder vorn liegt, wer die Woche anführt,
wer den Tag aus einem Tief ins Plus dreht —, sagte keine Meldung. Die
sieben Fakten des Katalogs sagen es, jeder mit einer Schwelle, damit er
nicht an jeder Partie hängt: gemessen an 52 Partien des Fensters stand
jeder höchstens dreimal da, zusammen zwanzigmal. Die Hälfte der Siege im
Monat kam zuerst an jeder zweiten Partie wieder, wenn jemand um 50 %
pendelte (Julian zweimal im August); sie zählt einmal je Monat, gemerkt
auch vor dem Fenster, sonst meldete sie sich ein zweites Mal, sobald das
erste aus dem Fenster fiel.
**Eine negative Meldung derselben Partie reist mit.** Das Subjekt ist das
Spiel, nicht ausschließlich das Siegerteam. Schande und Durststrecke stehen
als rote Zeilen mit ihren tatsächlichen Betroffenen neben den positiven
Anlässen; der Score wird nicht auf einer zweiten Matchkarte wiederholt.
**Eine Gruppe ist so negativ wie ihre Mitglieder** (`_newsIstNegativ`).
Mehrere Pleitenserien derselben Partie werden EINE Zeile („2 Pechvögel:
Anton & Maxi"), und die trägt `type:'group'` mit `loss_streak` in `sub`.
Geprüft wurde nur `type`, also galt die Gruppe als positiv: gemessen stand
sie als Zeile auf „Teamserie in einer Partie", der Karte über den Sieg der
beiden anderen.
**Und eine Gruppe trägt den Anlass ihrer Mitglieder** (`sub`, in
`_leitWert`, `_etikett` und `_satzZeile`), in der Mehrzahl. Der Anlass-Katalog kannte „group" nicht, also
fiel er weg: gemessen hieß ein Bündel aus fünf Zeilen nur „Teamserie in
einer Partie", obwohl auch zwei Einzelserien und eine Auszeichnung
daranhingen.
**Und eine Marke verschwindet nicht, wenn ihre Serie reißt.** Die Serie eines
Spielers, die eines Duos und der Formlauf waren ein Stand von HEUTE, gerechnet
nach der letzten Partie der Liga, und die ID trug die Länge
(`team_streak_A_B_7`): jede Länge wurde einzeln persistiert, und aus einer
Serie, die von fünf auf zehn wuchs, standen vier Karten im Feed. Der Ausweg
war ein Filter, der jede Karte wegnahm, deren Zahl der lebende Wert nicht mehr
erreicht — und damit verschwand die 5er-Marke vom Dienstag, sobald die Serie
am Mittwoch riss. Wer von unten nach oben liest, sah die Serie brechen und
fand die Marke nicht mehr, die an ihrem Tag richtig war. Jede dieser Marken
hängt deshalb an der Partie, die sie ausgelöst hat, und bleibt stehen: `loss_streak`,
`team_streak`, `team_loss_streak` und `top_form` tragen ihre `matchId` und
ihren `lauf`, und der Generator läuft die Partien dafür chronologisch ab wie
bei `win_streak` seit jeher. Der Formlauf meldet dabei den **Übertritt** über
die Schwelle, nicht den Zustand: bleibt der Vorsprung über mehrere Partien
stehen, ist das dieselbe Aussage. Die **Pause** (`dry_spell`) ist davon
ausgenommen — sie behauptet gerade, dass seit ihrer Partie nichts mehr
passiert ist.
**Der Spieler des Tages steht an jedem Spieltag des Fensters.** Er entstand
nur für den LETZTEN (`_potdLastDayData` sucht von hinten den ersten Tag mit
einem Kandidaten und hört dann auf), und im Fenster liegen sechs bis sieben
Spieltage: gemessen war genau EINE Karte gebildet, und die sechs Tage davor
hatten keinen Sieger mehr. Er IST die Schlagzeile seines Spieltags. Die ID
trägt den Tag, ist also stabil, und ein zweiter Lauf legt keine Zeile dazu.
**Ein Tag trägt vier Karten** (`NEWS_LIMITS.proTag`), und der Deckel zählt
nur, was er auch wegnehmen kann. „Breaking zählt nicht mit" stand als Regel
da, umgesetzt war die Hälfte davon: Breaking und die Pflichtkarte waren vor
dem Verdrängen geschützt, besetzten aber trotzdem einen Platz — und der
Feed lässt sie ohnehin durch, der Platz war verschenkt. Gemessen am letzten
Spieltag der Fixtures gingen zwei von fünf Plätzen an „Noch 5 Tage um den
Monat" und den Spieler des Tages, „Martin zündet die 8er-Serie" fiel heraus,
und der Tag zeigte drei selbst gewählte Karten statt fünf; über das ganze
Fenster lag die Ewige Tafel damit bei 64 % statt der gemessenen Hälfte. Vier
eigene Plätze plus der Sieger des Tages plus, wenn es eines gibt, ein
Breaking — gemessen drei bis sechs Karten je Spieltag. Gemessen trug ein
Spieltag vorher neun: zwei Sammelkarten, zwei Serien, zwei Auszeichnungen, den
Spieler des Tages, den Elo-Ausschlag und einen Serienbrecher. Das ist keine
Tafel mehr, das ist ein Protokoll. Der Tag vergibt seine Plätze **von vorn**:
wer zuerst da war, behält seinen Platz, und eine spätere stärkere Karte
wartet auf morgen. Nach `prio` vergeben hing die Auswahl eines Tages an
seinem Ende — die Karte vom Vormittag fiel heraus, sobald am Nachmittag eine
stärkere dazukam. **Breaking zählt nicht mit**:
es ist das Seltenste und darf nie an einem Deckel scheitern. Und was es je
Tag, Woche oder Monat genau einmal gibt, fällt nie darunter (`TAG_PFLICHT`:
Spieler des Tages, Wochenkarte, Monatsabschluss; dazu
`TAG_SUMME` für den Gegenpart des Tagessiegers) — der
Spieler des Tages IST die Schlagzeile seines Spieltags. In einer simulierten
Liga aus hundert Partien fiel er als siebtstärkste Karte heraus, während zwei
Auszeichnungen und eine laufende Serie darüber standen, und der Tag hatte
danach keinen Sieger mehr. Die Reihenfolge bleibt die Zeit.
`prio` sortiert den Feed seit dem chronologischen Umbau nicht mehr und
entscheidet auch über keinen Deckel mehr; sie trägt das Gewicht einer
Sammelkarte und die Spannung, aus der die Karte des Tages gewählt wird.
**Die Mischung gehört dem Tag, nicht dem Fenster.** Die erste Karte der
**Ewigen Tafel** eines Tages zählt gar nicht gegen den Deckel
(`NEWS_LIMITS.tafelProTagMin`): sie hat ihren eigenen Platz. Vorher war es
ein Tausch — die schwächste Karte des Tages musste weichen —, und kam die
Tafel erst am Nachmittag, traf das eine Karte, die seit dem Vormittag im
Feed stand. Reserviert und ungenutzt wäre der Platz an einem Tag ohne
Tafel dagegen verschenkt: der Tag trüge dann drei statt vier Karten. Die
erste ist chronologisch die erste, und später kann keine davorrutschen. Vorher war es eine Quote über die ganzen vierzehn Tage —
mindestens 40 % Tafel, gemessen am Inhalt der Karten —, und erfüllt wurde sie,
indem SPIELTAGSKARTEN wegfielen: gemessen schnitt das den Feed von 42 auf 23
Karten und leerte zwei von sieben Spieltagen vollständig. Der 24.08. trug
vierzehn Meldungen und im Feed keine einzige Karte. Der Tafel half das nicht,
sie blieb bei vier Karten — nur stand daneben nichts mehr. Je Tag reserviert
hängt die Auswahl eines Tages außerdem nur noch an diesem Tag: ein neuer
Spieltag verschiebt nicht mehr, was vorgestern zu sehen war.
**Und kein Spieltag bleibt ohne Karte.** Der Vergleich der Schlagzeilen wirft
weg, was schon einmal dasteht; „Harter Tag für Johannes" stand an vier Tagen
des Fensters und blieb einmal stehen. Der 13.08. hatte danach nur noch den
Spieler des Tages, der 19.08. gar nichts. Bleibt für einen Tag, an dem
gespielt wurde, keine Karte übrig, kommt die stärkste der verworfenen zurück:
dieselbe Schlagzeile unter zwei verschiedenen Tagesköpfen ist erlaubt — jede
nennt im Text ihr eigenes Datum, und für die Pflichtkarten gilt die Ausnahme
längst. Die **Sperrfrist** gehört nicht dazu: sie sagt gerade, dass diese
Aussage gestern schon erzählt wurde.
**Von einer Sammel-Achse stehen höchstens zwei Karten an einem Tag.** Die
Sammelkarte war vom Deckel je Sorte ganz ausgenommen, und gemessen standen am
26.08. vier Karten „Ein Spiel, N Geschichten für …" untereinander — vier
verschiedene Partien, für den, der scrollt, viermal dieselbe Schlagzeile. Sie
zählt jetzt nach ihrer Achse mit (`sammel/tafel`, `sammel/spieler`,
`sammel/erfolg`): vier verschiedene Nachrichten dürfen nebeneinander stehen,
vier gleiche nicht. Die Achse der **Partie** ist davon ausgenommen, seit die
Schlagzeile die Anlässe ihrer Partie nennt: vier verschiedene Partien tragen
vier verschiedene Zeilen, und keine davon ist eine Wiederholung.
Eine **seltene Auszeichnung** steht darin über einer laufenden Serie: die
Serie läuft weiter, die Auszeichnung ist geholt. Sie stand auf 5 und damit
unter der Duo-Pleitenserie, mit der Begründung, Team-News sollten „auch mal
oben stehen" — was seit dem chronologischen Feed niemand mehr entscheidet.

**Der Fun Fact entscheidet am Slot, nicht rückwirkend in der Anzeige.** Ein
vergangener Tag wird nur nachgefüllt, wenn er vollständig matchfrei war.
Heute darf eine Partie nach 15:00 Uhr neben dem zuvor fälligen Funfact stehen;
die spätere Partie löscht keine bereits publizierte Karte.

**Gebildet wird nur, was auch erscheinen kann.** Über die ganze
Ligageschichte reißen viele Paare eine Duell-Schwelle: gemessen sechzehn, von
denen zwei im Feed standen. Die anderen vierzehn wurden trotzdem gebildet und
**persistiert** — Zeilen in der Datenbank für Karten, die niemand je sieht.
Gemeldet werden die jüngsten (`NEWS_LIMITS.rivalryMarke`); ein Meilenstein
von vor drei Monaten ist keine Nachricht mehr.

**Was im selben Moment passiert, kommt in eine Karte.** Ein Spieltag trug
gemessen zehn Karten, vier davon in derselben Minute: ein Rekordwechsel,
eine Insignium-Stufe und zwei Rivalitäten standen als Fremde nebeneinander,
und zwei Spieler bekamen im selben Spiel dieselbe Auszeichnung auf zwei
Karten. `_consolidateStories` bündelt das zur **Sammelkarte** (`sammel`).
Tafel-Ereignisse bilden dabei zuerst einen eigenen Strom, und zusammen
gehören sie über ihren **Grund** (`causalKey`, `_storyGruppeKey`): die
dauerhafte Tafel EINES Spieltags ist `table:<Tag>`. Partie und Minute waren
dafür nur ein Stellvertreter, und er traf daneben: gemessen über die 19
Spieltage vom 28.07. bis 26.08. stand am 29.07. eine zweite Tafel-Karte
neben der ersten, weil eine Insignium-Stufe eine andere Minute trug als die
Rekorde desselben Tages — und beide hießen „… bewegen die Ewige Tafel".
**Die dauerhafte Tafel und die kurze Strecke sind zwei Karten.** Ein Rekord
auf einem gleitenden Fenster erzählt etwas anderes als eine Laufbahn: sein
Wert bewegt sich auch, wenn hinten ein schwaches Ergebnis herausfällt, und
deshalb meldet er kein „ausgebaut" [§C35]. In einer Karte mit den
dauerhaften Rekorden war dieser Unterschied nicht zu sehen. Seine Achse ist
`form:<Tag>`, seine Schlagzeile „… setzen Marken auf kurzer Strecke" — beide
Karten mit derselben Schlagzeile standen gemessen an 13 von 19 Spieltagen
untereinander. Kammer, Farbfamilie und Filter bleiben die der Ewigen Tafel
[§C25], im Blatt heißt der Abschnitt „Auf kurzer Strecke". Gemessen tragen
neun der 19 Spieltage vom 28.07. bis 26.08. eine solche Karte, acht davon
neben der dauerhaften. Zeilen aus älteren Läufen ohne `causalKey` finden
weiter über Partie oder Minute zusammen und bleiben die dauerhafte Tafel.
**Der Schlüssel einer Sammelkarte kommt aus ihrem Inhalt, nicht aus der
Reihenfolge.** Der Tafel-Moment hieß nach seiner alphabetisch ersten
Mitglieds-ID und die Spieltags-Karte nach der Position ihrer Gruppe in der
Schleife. Beides verschiebt sich, sobald eine Zeile dazukommt oder zwei
Gruppen verschmelzen: der Leser sah nicht dieselbe Karte wachsen, sondern
eine neue an ihrer Stelle, und der Lesestand hing daran. Gemessen ergaben
drei Partien eines Tages drei verschiedene Tafel-Karten. Der Tafel-Moment
heißt deshalb nach seinem **Grund** (`causalKey`, für den ganzen Spieltag
derselbe), die Spieltags-Karte nach der kleinsten Mitglieds-ID; nur Zeilen
aus älteren Läufen ohne Grund finden weiter über das erste Mitglied
zusammen.
Ein vollständiges Bundle entsteht auch dann, wenn eine Zeile Breaking ist. Spieltags-Ereignisse brauchen zusätzlich **ein
gemeinsames Subjekt**; Fun Facts gehören nie dazu, weil sie nicht aus dem
Moment entstanden sind. Jede Karte erhält eine **gemeinsame Aussage**, die
aus allen Teilen gebaut wird. Kein Einzeltext wird zum Kopf erhoben und eine
fünfte Spur fällt nicht wieder als scheinbar unabhängige Karte daneben.
Alte Datenbankzeilen ohne `matchId` bleiben über die Minute kompatibel;
neue Generatorzeilen tragen die Partie, wo sie fachlich bekannt ist.
**Ein `matchId` bleibt sichtbar.** Auszeichnungs-, Serien-, Rivalitäts- und
Tafel-Karten aus einer konkreten Partie zeigen über ihrer Geschichte immer
dasselbe Ergebnisband mit beiden Teams, allen vier Wappen und dem Endstand.
Damit erzählen auch „Mauer“, „Absoluter Sieger“, Serienbruch und Upset
zuerst, in welchem Spiel sie entstanden sind; Rubrik, Schimmer und eigener
Kartenaufbau bleiben trotzdem erhalten.
**Und die Partie passt zu den Namen.** Eine Tafel-Karte trug die letzte
Partie der DATENBANK, egal von wem sie erzählt: über „Leo und Stefan bewegen
die Ewige Tafel" stand „Jane/Johannes 10:8 Maxi/Henry", ein Spiel, an dem
keiner der beiden beteiligt war. Gemessen taten das 34 von 169 Karten. Jede
Karte zeigt deshalb die **letzte eigene Partie eines genannten Spielers** an
ihrem Tag — sie ist die, nach der der Wechsel galt, und sie ist immer eine,
in der er mitgespielt hat. Die auslösende Partie zu suchen kostete gemessen
~200 ms auf einen Generator von 340 ms und nennt dasselbe Spiel. Eine
**Sammelkarte** zeigt ein Band nur, wenn **alle** ihre Teile dieselbe Partie
nennen: ein Tafel-Moment entsteht über die Minute und umfasst damit mehrere
Partien, und sich eine davon auszusuchen ist genau der Fehler von vorher.
**Die Leiter der Marken beginnt bei drei** (3, 5, 8, 10 und dann jede
fünfte, `istSerienMarke`). Die Karte einer Siegesserie zeigt die **nächste
Marke** als leere Felder hinter dem Lauf (`naechsteSerienMarke`): man sieht,
wie weit es noch ist. Eine Pleitenserie hat kein Ziel — eine Marke, auf die
man zuläuft, wäre dort ein Wunsch. Die Leiter steht an EINER Stelle; sie
stand als Menge im Generator, und zwei Kopien nennen irgendwann zwei Ziele. Sie stand bei 5, 7, 10, 15, 20 — eine Stufe über dem, was das
Zeichen daneben schon feiert: drei Siege in Folge sind das, was die meisten
überhaupt erreichen, und genau dort geht am Wappen das Feuer an [§C26].
Sieben und zehn lagen dicht beieinander; acht ist die Marke, die einen
langen Spieltag abschließt. Gemessen über die 19 Spieltage vom 28.07. bis
26.08.: vorher acht gebildete und fünf gezeigte Serienkarten, jetzt
siebzehn und neun.
**Der Lauf ist die Einheit, nicht der Tag** (`lauf` im `dataRef`, die Partie,
mit der die Serie angefangen hat). Die 5er-Marke von gestern steckt in der
8er von heute, und beide standen unter zwei Tagesköpfen als zwei
Nachrichten. Und **dieselbe Marke ist einmal Nachricht**: seit die Leiter
bei drei beginnt, erreicht derselbe Spieler dieselbe Marke im Fenster
mehrmals — „Alex zündet die 3er-Serie" stand gemessen zweimal im Feed,
einmal als Karte und einmal als Zeile einer Sammelkarte. Es bleibt die
jüngste, dieselbe Regel wie bei einer wiederholten Auszeichnung [§11.0c].
Der **Serien-Rekord der Liga** wird ab fünf Siegen gemeldet: mit sechs blieb
er einer jungen Liga verschlossen, die die fünf erreicht, bevor sie die
sechs erreicht.
**Eine Serie je Spieler und Tag, die längste.** An einem Spieltag mit acht
Partien fallen die 5er- UND die 7er-Marke desselben Spielers, und „Jonas
zündet die 5er-Serie" stand neben „Jonas zündet die 7er-Serie": eine
Nachricht und eine Wiederholung, denn die längere enthält die kürzere. Sie
verbrauchten dabei beide Plätze, die der Deckel je Sorte hergibt — gemessen
brachte ein Probelauf über vierzehn Tage danach keine einzige Serienkarte in
den Feed.
Die Grenze steht **zweimal**, und beide Male ist sie nötig: der Generator
bildet nur die höchste Marke, aber persistierte Zeilen aus älteren Läufen
tragen die kürzeren weiter. Gemessen stand „Johannes zündet die 7er-Serie"
neben „2 Serien im Gleichschritt: Jane & Johannes" und darunter noch „Jane
zündet die 5er-Serie" — dieselbe laufende Serie in drei Zeilen. Die Gruppe
entsteht aus ihren Mitgliedern, also greift die Grenze in der Anzeige
**vor** der Gruppierung und räumt Einzelkarte und Gruppe zugleich auf.
**Für Spieltagskarten reicht die Minute allein nicht.** „Johannes und Anton verlieren zusammen
alles" trug „Maxi: Nerven aus Stahl" als zweite Zeile — drei fremde Spieler
in einer Karte, die nur ihr Zeitstempel verband. Innerhalb einer Minute
bilden deshalb die **Beteiligten** die Gruppen: wer einen Spieler mit einer
bestehenden Gruppe teilt, kommt dazu und zieht die Gruppen zusammen, die er
verbindet. Zwei Karten in derselben Minute sind danach erlaubt,
solange sie von verschiedenen Leuten handeln.
Innerhalb einer Sammelkarte steht **jede Schlagzeile einmal**: viermal
„Martin baut ‚Der Fels' aus" untereinander war eine Zeile und drei
Wiederholungen. Und ihr Titel folgt der Zahl der Namen — „Martin bewegen
die Ewige Tafel" stand über einer Karte mit einem einzigen Namen.
**Die Schlagzeile nennt alle, um die es geht** (`_namenKurz`): „Leon und
Martin bewegen die Ewige Tafel" stand über einer Karte von drei Leuten, und
der dritte kam nur in der Liste darunter vor. Einer steht allein, zwei stehen
mit „und", drei als Aufzählung, ab dem vierten zählt die Zeile den Rest —
sechs Namen sprengen jede Überschrift. Dieselbe Aufzählung gilt im Blattkopf
und im Sammelband.

**Zwei Fragen kommen vor der Bündelung nach Moment und Subjekt:** Hat EIN
Spieler mehreres auf einmal geholt? Haben MEHRERE dasselbe geholt? Beides
ist eine eigene Nachricht mit eigener Kartenform. Vorher borgte sich das
Bündel Rubrik und Schlagzeile seiner stärksten Zeile, und an der Ewigen
Tafel gruppierte es sogar den ganzen TAG ohne jedes Subjekt: gemessen
standen vier Rekordwechsel dreier Spieler in einer Karte, während die drei,
die im selben Moment dieselbe Insignium-Stufe erreichten, über die vier
Zeilen hinausfielen und einzeln daneben standen.
Die **Spieler-Karte** (`quelle:'spieler'`, `.nf-s-spieler`, Rubrik „ALLES
AUF EINMAL") nennt in der Schlagzeile jede
Sorte mit ihrer Zahl — „Maxi holt zwei Monatschroniken", „Jonas holt einen
Liga-Rekord und erreicht die nächste Insignium-Stufe". Verb und Gegenstand
stehen dafür getrennt (`ERFOLG_WORT`), und das Verb wird nur genannt, wo es
wechselt: „holt einen Liga-Rekord, eine Auszeichnung und feiert ein
Jubiläum" — je Verb eine eigene Aufzählung ergab zwei „und" in einer Zeile.
Sie zeigt ein Wappen groß und im Fuß die Zahl der Erfolge. Der Teaser
beschreibt den Nachhall für die Laufbahn, statt die Kartenstruktur mit
„Einzelheiten stehen darunter" zu erklären.
Die **Erfolgs-Karte** (`quelle:'erfolg'`, `.nf-s-erfolg`, Rubrik „GEMEINSAM
GEHOLT") stellt den Erfolg voran und die Gesichter als Chips daneben — keins
ist wichtiger als das andere. Ihre Schlagzeile und ihr Satz kommen aus
`SAMMEL_ERFOLG`, je Typ eine Wendung: „Sina, Mira und Jonas tragen jetzt den
Schildring" mit „Ein gemeinsamer Sprung auf der Laufbahn: drei Zeichen
wechseln zugleich ihre Form". Den
Satz vom Kopf zu borgen wäre falsch — „385 Prestige zusammen" gehört einem
der drei, und die Karte handelt von allen.
**Der Erfolg geht dem Spieler vor.** Wer die Insignium-Stufe mit zwei
anderen teilt und im selben Moment noch einen Rekord holt, steht mit der
Stufe auf der gemeinsamen Karte; der Rekord fällt in die Bündelung nach
Moment und Subjekt, und dort gehören Rekorde ohnehin hin. Liefe die
Spieler-Achse zuerst, stünde „der Schildring" auf zwei Karten, und das ist
genau die Doppelung, die diese Regeln verhindern.
**Beide Achsen fassen nur, was allein dasteht** (genau ein Beteiligter):
eine Duo-Serie gehört keinem Einzelnen und wäre auf einer Karte über einen
Spieler eine Behauptung über zwei. Für den Liga-Rekord und die Monatschronik gibt es
die Erfolgs-Achse gar nicht: sie tragen ihre Mithalter schon in EINER Karte
(„Maxi, Leo und Julian übernehmen"), und die Auszeichnung fasst
`badgeGroups` je Partie zusammen — ein zweites Bauteil für dieselbe Aussage
wäre eins zu viel [§C27].
**Die Zeilen wiederholen nicht, was oben steht.** Auf der Spieler-Karte
fällt der Name vor jeder Zeile weg — er steht in der Schlagzeile, und
dreimal „Tobi" untereinander ist zweimal zu viel; es bleibt „übernimmt ‚Der
Unaufhaltsame'". Auf der Erfolgs-Karte bleibt er stehen und bekommt den
Wert dazu, der die Träger unterscheidet („Sina: 385 Prestige"): dreimal
„trägt den Schildring" unter „Sina, Mira und Jonas tragen jetzt den
Schildring" wäre die Schlagzeile in drei Wiederholungen. Wo nur der Name
unterscheidet (Jubiläum, Meilenstein), steht er allein — die Liste IST dann
die Aufzählung, und ab dem vierten Namen ist sie die einzige Stelle, an der
alle vorkommen.

**Die Ewige Tafel wird zuerst als eigener Ereignisstrom vereinigt.** Alle
Rekorde, Chroniken und Insignium-Wechsel eines Spieltags landen in genau
einem Bundle, auch wenn ein Teil Breaking ist. Vor der Bündelung
gibt es keinen Chronik- oder Rekordausbau-Cap mehr: Die Karte wird kleiner in
der Zahl der Rahmen, nicht ärmer an fachlichem Inhalt.

**Die Zeile einer Sammelkarte ist kürzer als die Karte** (`zeileText`). Im
Blatt eines Tafel-Moments stand jede Zeile mit dem vollen Kartentext:
gemessen bis zu 183 Zeichen und vier Sätze, neunmal untereinander. Fünf der
neun erklärten dabei, warum sich NICHTS ändert, und das ist die Bauanleitung
des Feeds, nicht die Nachricht. Die Zeile nennt den Wert, die Klasse und den
Zuwachs, wo es einen gibt; der Liga-Rekord lässt seine Bedingung weg (sie
nennt jede Schwelle [§C35] und war allein 175 Zeichen lang), das Insignium
die Aufteilung seines Prestiges. Der ganze Text bleibt an der einzelnen
Karte. Höchstens drei Sätze und 130 Zeichen, gemessen über jeden vierten
Spieltag der Ligageschichte.

**Bündeln darf nichts verstecken.** Die Sammelkarte trägt eine eigene
zusammenfassende Schlagzeile — und darunter das **Sammelband**
(`_newsSammelBand`, `.nf-sam`): jede Meldung mit ihrem Zeichen, kurz und in
einer Reihe, auf der KARTE und nicht erst im Blatt. Das Detailblatt zeigt
dieselben Ereignisse vollständig und **gleichrangig**; keine
erste Zeile wird markiert oder in den Kopf gezogen.
**Ausgenommen ist der Anlass eines Breaking** (`brk` an der Zeile,
`.nf-sam-brk`). Eine Sammelkarte erbt ihr Breaking von einer ihrer Zeilen,
und welche das war, stand nirgends: `teile` ist nach `prio` sortiert, und
die Tafel-Familie ordnet Liga-Rekord über Monatschronik über Insignium-Stufe
— der erste Lorbeerreif der Ligageschichte stand damit als letzte von sechs
Zeilen, während die Karte daneben voller Rahmen und pulsierenden Balken trug
und nicht sagte, wofür. Eine Karte, die die Spalte bricht, muss die Behauptung
belegen: der Anlass steht deshalb **zuerst** und trägt eine Marke aus zwei
Worten, Rot wie die Karte [§C25]. Eine Marke am rechten Rand war dafür zu
leise — die Karte trug einen vollen roten Rahmen, einen pulsierenden Punkt
und einen Schein hinter der Fläche und nannte ihren Grund in derselben
grauen Zeile wie fünf andere. Die Zeile bekommt deshalb eine **eigene Kante
und eine eigene Fläche** und ihr Zeichen in Rot, und der Balken der Karte
nennt neben dem Wort BREAKING die **Zahl der gebündelten Meldungen**
(`.nf-brk-n`): sonst sah eine Karte über sechs Ereignisse aus wie eine
einzelne Nachricht. `tests/blatt` misst Kante und Fläche im Browser. Darunter fällt auch der **Nachsatz**
(`.nf-brk-sub`): `_breakingHeroText` kannte sieben Typen und die Sammelkarte
nicht, fiel damit auf `desc` zurück, und der Aufrufer unterdrückt ihn genau
dann, wenn er `desc` ist — die gebündelte Breaking-Karte hatte also gar
keinen. Er trägt jetzt den langen Satz des Anlasses. Gemessen wird das an
einem gestellten Bündel: die echte Liga erreicht den Lorbeerreif nicht
[§10.3], es gibt in ihr also keine gebündelte Breaking-Karte.
**Jede Partie steht einmal über ihren Zeilen, die Wirkung steht einmal.**
Ein Tafel-Moment umfasst mehrere Partien, und im Blatt stand eine Liste ohne
jeden Zeitbezug; danach trug jede Zeile Uhrzeit und Stand („· 17:17 ·
10:4"), und zehn Chroniken aus derselben Partie sagten es zehnmal
untereinander. Jetzt steht in jeder Gruppe über ihren Zeilen eine leise
Zeile mit Uhrzeit und Stand der Partie (`.nw-zk`), als Stand und nicht als
zweites Band, denn neun Bänder mit je vier Wappen sind genau das, wovor
„Detail folgt der Größe" warnt. Die Punktewirkung dagegen ist je Spieler EINE Zahl,
egal aus welcher Zeile sie kommt: beide Stände gehören dem Spieltag
[§11.0e]. Sie steht deshalb in einem Abschnitt „Wirkung auf die Laufbahn"
unter der Liste, einmal je Spieler — je Zeile gezeigt stünde dieselbe
Rechnung neunmal untereinander.
**Wer auf der Karte steht, steht in der Wirkung** (`_tafelLaufbahn`). Der
Abschnitt liest die Angabe aus den Zeilen, und nur die REKORD-Zeile trug
sie: gemessen fehlte Leo dort ganz, obwohl seine Zeile „+80 Prestige"
nennt — und die Prestige-Zelle der Zahlenreihe stand damit auf dem Zuwachs
eines einzigen Spielers. Im Screenshot las das als „+2 PRESTIGE" über
„+9 Prestige" drei Zeilen darunter, und eines von beidem sah aus wie ein
Fehler. Jede Tafel-Meldung — Bestmarke, Monatschronik, Insignium-Stufe —
trägt deshalb dieselbe Angabe aus derselben Quelle.
**Und die Zeile sagt, woher ihre Zahl kommt.** Sie hieß „Johannes +67
Prestige für die Laufbahn": derselbe Wortlaut wie die Aufschrift der
Zahlenreihe und des Abschnitts, aber eine andere Größe — dort steht der
Zuwachs des ganzen Spieltags, hier der Beitrag eines Eintrags. Die Zeile
nennt ihn deshalb ausdrücklich „aus diesem Eintrag", und steht sie allein,
fällt der Name weg: er steht in ihrer eigenen Schlagzeile schon
(„Johannes holt ‚Der Beidfüßige'").
**Und sie ist gezeichnet, nicht gerechnet** (`_ndWirkungBlock`). Dort stand
„1205 → 1240 Prestige": zwei Zahlen, die man erst lesen und dann verrechnen
muss, und bei neun Zeilen darüber weiß niemand mehr, was daran
ausschlaggebend war. Jede Zeile trägt jetzt das **Zeichen ihrer Stufe**, den
**Zuwachs** als Zahl und einen **Balken** über die Strecke von dieser
Insignium-Schwelle zur nächsten — darin heller, was der Spieltag dazugelegt
hat, und dahinter, wie weit es noch ist [§C30]. Die größte Wirkung steht
oben: sie ist das, was den Tag ausmacht. Gerechnet wird mit den
**gespeicherten** Ständen und nicht mit `prestigeOf` — eine Karte von
vorletzter Woche erzählt vom Stand von damals [§C31]. Die Stufe dazu wird
aus den Punkten abgeleitet und nicht gelesen [§C30].
**Und sie zeigt, was verloren ging.** Jane zog bei „Der Lauf" mit Leon
gleich, Leons Anteil halbierte sich, und im Blatt stand bei ihm „±0": ein
Minus wurde als Null gezeigt, und der Balken kannte nur den Zuwachs. Ein
Verlust steht jetzt rot da [§C25] — die Zahl mit Minus, das verlorene Stück
gestreift im Balken, „fällt auf …" und ein Pfeil am Zeichen, wenn jemand
unter eine Schwelle rutscht —, und darunter der Grund als Marke
(`_ndWirkungsGruende`): welcher Rekord oder welche Chronik geholt,
übernommen, geteilt oder verloren wurde. Dafür trägt die Wirkung einer
Rekord- und Chronik-Karte auch die **bisherigen Halter**, die nicht mehr
allein halten (`_mitVorgaengern`), und die Zeile im Bündel ihre Halter vor
und nach dem Tag. Das Verlorene steht nicht in derselben Summe wie
das Gewonnene — sie hieße, der Tag hätte weniger gebracht —, sondern über
der Wirkung, deren rote Zeilen es zusammenzählt (`.nd-sec-r`). Als fünfte
Zelle der Zahlenreihe brach es die Reihe in zwei, und „−413 verloren" stand
allein auf einer Zeile. `tests/blatt` misst das Stück im Balken.
**Und schon auf der Karte** (`_newsPrestigeBand`): unter dem Sammelband
einer Tafel-Karte steht die Bilanz des Tages in zwei leisen Zeilen, vor der
einen ein grüner Pfeil hinauf, vor der anderen ein roter hinab [§C25], und
darin **jeder**, der an diesem Tag Prestige gewinnt oder verliert, je Seite
nach dem Betrag geordnet, bei gleichem Betrag nach dem Namen. Je Seite zwei
Chips und der Rest als „+2" ließen offen, wer die übrigen waren; die Wörter
„Gewinnt" und „Verliert" nahmen der Zeile Platz und lasen sich langsamer als
die Richtung. Je Spieler ein **Chip** aus Gesicht, Name und Betrag; was der
Betrag am Zeichen ändert, steht nur auf der Insignium-Karte. Vorher standen
dort nur die Verlierer, und die andere Hälfte der Wirkung stand erst im
Blatt; davor stand „Verliert" vor einer Reihe aus Text, die bei drei Namen
umbrach, sodass der Betrag in der zweiten Zeile neben dem falschen Namen
stand. Der Chip hält zusammen, was zusammengehört. Die Zeile steht unter dem Band und nicht im Kopf.
Der Betrag ist das, was Rekorde und Chroniken bewegt haben, nicht der ganze
Zuwachs des Tages: der enthielt die Auszeichnungen, und die nennt die
Ehrung derselben Runde — dasselbe Prestige stand auf zwei Karten, einmal
allein und einmal in einer größeren Zahl versteckt, und die Ehrung trug
dazu noch dieselben Chips. Jetzt zeigt jede Karte ihre Quelle: die Tafel
Rekorde und Chroniken, die Ehrung Auszeichnungen in Säulen statt Chips,
die Insignium-Karte die Stufe; das Blatt der Tafel nennt alle drei. Der Satz einer Rekordkarte nennt den
Verlust ebenfalls („Für Leon heißt der Spieltag 77 Prestige weniger", und
wenn das Zeichen fällt, auf welche Stufe); die Zeile im Bündel bleibt ohne
ihn, dort steht er einmal in der Verlust-Zeile der Karte.
**Und davor steht in Zahlen, worum es geht** (`rcpZahlenHtml`, das Bauteil
der Rückblicke [§C31]): wie viele Bestmarken wirklich den Halter gewechselt
haben, wie viele nur ausgebaut wurden, wie viele Chroniken dazukamen, wie
viele Insignien und was am Ende an Prestige hängenblieb. Neun Zeilen
untereinander sagen das nicht.
**Die Liste selbst ist nach Sorte gegliedert** (`rcpAbschnitt`, `.nw-ic`).
Zweiundzwanzig Zeilen sind keine Liste, sie sind eine Wand: gemessen trug ein
Tafel-Moment sechs Bestmarken, neun Ausbauten, fünf Chroniken und zwei
Insignien, und alle standen als EIN Stapel untereinander — wer ihn öffnete,
konnte nicht sehen, was ein Wechsel und was nur ein besserer Wert war. Jede
Gruppe trägt jetzt ihre Überschrift — mit der Zahl dahinter nur ohne
Zahlenreihe darüber, sonst stünde sie zweimal —, und jede Zeile ihr
**Zeichen**: in einer langen Liste ist es das Erste, was man sieht.
**Ein Wert steht rechts nur, wenn er kurz ist.** Rechts unter den Gesichtern
stand jeder Beleg, und er brach nicht um: „Maxi gewinnt an dieser Seite
100 %, sonst 31 %" machte die Spalte so breit, dass Eintrag und Satz links
Wort für Wort untereinander standen („Der / Schattenmann", „Leon / holt")
und die Zeile über den Rand lief. Bis sechzehn Zeichen steht er rechts,
länger als eigene Zeile über die ganze Breite (`.nw-tz-lang`); beim Ausbau
steht die Einheit einmal („+58 +59 %-Punkte"). Die Säule über einer Partie
wird höchstens fünf Punkte hoch und danach breiter: neunzehn Bewegungen
nach einer Partie waren ein Turm von 230 px über einer leeren Fläche. Unter vier
Zeilen bleibt die Gliederung weg, dort sagt sie nichts.
**Und über Überschriften steht keine weitere.** „An der Ewigen Tafel" stand
als Sammelüberschrift direkt über „Bestmarken 1" und „Monatschroniken 2" —
und dieselbe Aussage stand auf demselben Blatt schon dreimal: in der Rubrik,
in der Schlagzeile („… bewegen die Ewige Tafel") und unter den Wappen („an
der Ewigen Tafel"). Wo die Liste ihre eigenen Überschriften trägt, fällt die
darüber weg; ohne Gliederung bleibt sie, denn dann hat die Liste keine.
**Im Blatt ist die Partie die Bühne und keine Zeile.** Sie hieß „Leon und
Maxi setzen sich gegen Leo und Anton durch" und darunter „Vor dem Anstoß lag
die Siegchance bei 81 %. Der Sieg bringt +7 Elo." — dieselben vier Namen und
derselbe Stand wie das Band darüber. Das Blatt eines Partie-Bündels trägt
jetzt die Zeichnung der Karte als Bühne, darunter „Was dazu gehört" mit
jeder übrigen Zeile ohne die Uhrzeit der Partie, die neunmal dieselbe wäre,
und dann dieselben Abschnitte wie das Blatt der Partie
(`_ndPartieAbschnitte`).
**Und auf der KARTE steht sie gar nicht** (`sammelTeile`). Das Band über der
Karte zeigt die vier Wappen und den Stand, und darunter stand im Sammelband
„Leon und Maxi setzen sich gegen Leo und Anton durch" — dieselbe Partie in
einer zweiten Schreibweise, und die Karte erzählte damit von zwei Dingen,
von denen eins die Überschrift des anderen ist. Gefiltert wird nur die
Achse der Partie: der Ergebnis-Strom besteht ausschließlich aus
Partie-Zeilen, und dort bliebe sonst ein leeres Band.
**Was unten in Zahlen steht, sagt der Satz oben nicht** (`_ndLead`). Der
Satz der Tafel-Karte zählt auf, was passiert ist („Eine Bestmarke, ein
Ausbau, zwei Monatschroniken und ein neues Insignium: …") — im Feed ist das
die ganze Aussage. Im Blatt steht direkt darunter die Zahlenreihe mit
denselben vier Angaben, und damit dieselbe Information zweimal in sechs
Zeilen [§C27]. Der Kopf lässt die Aufzählung dort weg, und ebenso den
Zuwachs für die Laufbahn: „Für die Laufbahn bleiben 279 Prestige." stand
über der Reihe, deren vierte Zelle „+279 Prestige" ist.
Eine eigene Funktion, weil die Regel sonst nur im Zeichnen des Blatts
stünde und damit nur mit einem Dokument zu messen wäre.
**Der Blattkopf zeigt so viele Wappen, wie seine Zeile Namen nennt.**
Gezeigt wurden immer die ersten ZWEI, während `_namenKurz` bis zu drei
nennt: „Johannes, Leo und Leon bewegen die Ewige Tafel" stand über zwei
Gesichtern, und welcher der drei fehlt, sagte nichts. Der Deckel ist
deshalb derselbe — drei, und ab dem vierten zählt ein Chip den Rest, wie
auf der Karte [§C27].
**Der große Wert ist der Sortierwert seines Belegs** (`_newsTafelWert`).
Gelesen wurde die erste Zahl des Fließtexts, ohne Vorzeichen und ohne
Einheit: unter einer Übernahme von „Der Höhenflug" stand „10 %", während
der Satz darunter „+10 %-Punkte" nennt — ein Unterschied als Anteil
gelesen, und das Plus fehlt. Der Beleg beginnt garantiert mit dem
Sortierwert [§C35], also steht er dort und muss nicht gesucht werden; nur
eine Karte ohne `ev` fällt auf den Satz zurück. Ein langer Wert wird dabei
kleiner statt breiter (`data-lang`) — „+10 %-Punkte" brach in zwei Zeilen
und drückte die Schlagzeile daneben auf drei.
**Eine Pleitenserie sagt, wie lange der letzte Sieg her ist.** „Fünf
Niederlagen am Stück." nannte die Zahl und sonst nichts: ob das vor zwei
Wochen oder gestern anfing, stand nirgends, und genau das ist die Frage,
die eine Durststrecke aufwirft. Die Karte nennt deshalb den Tag, vor dem
der letzte Sieg liegt — **und keinen Punkt dahinter**: „25.08." trägt
seinen eigenen schon, und der des Satzes stand daneben („liegt vor dem
25.08.."). Jede abgekürzte Angabe am Satzende hat das Problem, also prüft
`tests/ambient` es über jeden vierten Spieltag der Ligageschichte.
**Und der Schlusssprint bekommt keinen Nachsatz.** `_breakingHeroText`
trug für ihn „Machtwechsel an der Tabellenspitze: … Das Titelrennen ist
wieder völlig offen" — ein Etikett mit Doppelpunkt am Satzanfang, ohne eine
einzige Zahl, und die offene Lage stimmt bei 91 Elo Vorsprung nicht. Der
Fall ist weg, damit fällt der Nachsatz auf `desc` zurück, und den
unterdrückt der Aufrufer: `desc` steht eine Zeile höher.
**Und das Blatt passt auf das Telefon.** Die Zahlenreihe trug fünf Zellen,
„BESTMARKEN" war 75 px breit und die Zelle 62 — `overflow:hidden` schnitt die
Aufschrift ab. Daneben endete „noch 1615 bis zum Ordensstern" als „noch 1615
bis zum Ord…" und nannte die Stufe nicht, und das Zeichen der Stufe stand bei
34 px als dunkler Fleck da, obwohl unter 48 px vom Wappen nichts übrig bleibt
[§6]. Die Reihe bricht deshalb um — vier Zellen zwei mal zwei, wo sie
nicht in eine Reihe passen (`vier`) —, die Aufschrift darf zwei Zeilen
nehmen, die Zeile der Wirkung auch, und das Zeichen misst 48 px.
`tests/blatt` misst das für JEDEN Story-Typ im Blatt selbst (`.nd`, 310 px
wie auf einem 360-px-Telefon): läuft etwas aus dem Rand, oder ist eine
Schrift breiter als ihr Feld, ohne mit „…" zu enden? Im nackten Kasten galt
`.nd .num{white-space:nowrap}` nicht, und die Prüfung sah den Beleg nicht,
der rechts in einer Zeile festhing.

  **Aber sie bedeckt nicht den ganzen Bildschirm** (`NEWS_LIMITS.sammelZeilen`).
Die Regel war für zwei bis vier Teile geschrieben. Gemessen trug ein
Tafel-Moment neunzehn Zeilen — fünf Bestmarken, dreizehn Monatschroniken und
ein Insignium —, und die Karte war gerendert 852 px hoch und damit höher als
das Telefon: damit versteckte gerade die vollständige Liste alles andere des
Tages. Sechs waren noch zu viele: gemessen am 28.09. trug ein Tafel-Moment
achtzehn Zeilen, und die Karte war ein Block aus Namen. Auf der Karte
stehen deshalb **vier** und dahinter die Zahl der übrigen. Im **Blatt**
steht weiterhin jede einzelne Zeile — die Karte fasst zusammen, das Blatt
zeigt alles.
**Und ein Ausbau steht gar nicht auf der Karte.** Wichtig ist, was wirklich
in der Chronik steht und welcher Rekord wirklich übernommen wurde; ein Ausbau
ist keins von beidem — derselbe Halter, ein besserer Wert, kein Wechsel.
Gemessen trug ein Tafel-Moment achtzehn Zeilen, elf davon Ausbauten, und bei
vier Plätzen standen zwei Wechsel und zwei Ausbauten darauf. Sie zählen jetzt
in die Zahl dahinter, und das Blatt zeigt sie. Gibt es NUR Ausbauten, bleibt
der stärkste stehen: eine Karte mit leerem Band ist schlimmer als eine, die
einen Ausbau nennt.
**Und zuerst steht, was Wirkung hat.** Sortiert war nach `prio`, also nach
der Familie: Bestmarke, Monatschronik, Insignium. Bei achtzehn Zeilen sagt
das nichts mehr — elf davon waren Ausbauten, und der eine Monatseintrag,
der wirklich in der Chronik landet und fürs Prestige zählt [§C32], lag
dahinter. Drei Stufen: der **gekennzeichnete Chronik-Eintrag**
(`zeigt === true`, die Marke „in der Chronik"), dann jeder
**Halterwechsel** — darin weiter Bestmarke vor Monatschronik vor
Insignium-Stufe —, dann das **Ausbauen**, bei dem niemand gewechselt hat.
**Die Reihenfolge wiegt die Karte dabei nicht.** `kopf` trägt Rang, Rubrik
und Zeichen der Sammelkarte, und `kopf` war die erste ANGEZEIGTE Zeile:
gemessen fiel der Tafel-Moment des 26.08. von 84 auf 70, sobald vorne die
Monatschronik stand und nicht die Bestmarke — und damit unter den
Tagesdeckel. Der Kopf ist der stärkste Teil, die Reihenfolge eine Frage der
Lesbarkeit.
**Und sie wächst nicht über ihr Band hinaus** (`PRIO_SPIELTAG_MAX`). Die
Karte wiegt mehr mit jeder Zeile, zwei Punkte je Stück: achtzehn Zeilen
ergaben 110 und standen damit über dem Breaking-Band (90+), ohne Breaking zu
sein [§C33 `STORY_PRIO`]. Ihren Platz hält sie auch ohne das — die Ewige
Tafel hat je Tag einen reservierten —, also bleibt sie bei 89.
**Der große Wert zählt Wechsel, keine Ausbauten.** „18 WECHSEL" stand über
einem Moment, in dem elf Zeilen ein Ausbau waren: derselbe Halter, ein
besserer Wert, kein Wechsel. Dasselbe im Satz — „elf Bestmarken" zählte
beide zusammen; er nennt sie jetzt getrennt („Eine Bestmarke, vier
Ausbauten, zwei Monatschroniken und ein neues Insignium"). Jede Zeile trägt ihre
Beteiligten (`pids`) — daran hängt die Bündelung, und im Blatt führt die
Zeile damit zu dem, von dem sie handelt.
Technische Floskeln wie „Ereignisse in einem Moment", „alle Belege" oder
„alle Einzelheiten stehen darunter" sind verboten: Das Band selbst macht
die Vollständigkeit sichtbar.

**Der Feed reicht einen Monat zurück** (`newsAnzeigeAb`), und der Schnitt
liegt am DATUM. Vierzehn Tage waren zu kurz: am 20. Oktober endete der Feed
am 6., und wer nach dem Monatsanfang fragte, fand ihn nicht mehr. Die
vierzehn Tage bleiben das Fenster des Generators (`NEWS_FENSTER_TAGE`): ihn
weiter zurückzuschicken hieße, für vergangene Tage Karten aus dem Stand von
heute zu bilden. Eine Zeile hielt dreißig Tage ab dem Einfügen, die
Vorgabe der Tabelle; jetzt hält sie vierzig ab ihrem Ereignis
(`NEWS_HALTEN_TAGE`), denn der Monat zurück hat bis zu einunddreißig Tage.
Der Schnitt lag einmal an der Zeilenzahl: die App las die 100
jüngsten Zeilen und zeigte davon 50, und bei achtzehn bis sechsundzwanzig
Karten je Spieltag reichte das rund acht Tage weit. Eine Zeilenzahl ist
keine Fensterbreite — sie hängt daran, wie viel gerade los war, und wer
nach einer Woche Pause hineinsah, fand seinen eigenen Spieltag nicht mehr.
`_loadStoriesFromDb` liest das vollständige Datumsfenster in Seiten von
`NEWS_DB_SEITENGROESSE`; weder Datenweg noch Anzeige besitzen einen
fachlichen Gesamtdeckel.
**Dieselbe Auszeichnung ist einmal Nachricht, dann an runden Marken**
(`NEWS_BADGE_MARKEN`: 1, 5, 10, 20, 25, 50, 75, 100, 125; ab 150 jeder
weitere 25er-Schritt). Die Karte entstand jedes Mal
neu, wenn jemand ein Badge wieder holte: gemessen stand „Martin: Mauer"
vierzehnmal im Feed, wortgleich — der Text ist die Bedingung aus dem
Katalog und ändert sich nie. 93 der 866 je gebildeten Karten gingen darauf
zurück, mehr als auf jede andere Quelle; nach der Regel sind es elf.
**Wie oft, sagt die Klasse** (`_badgeTakt`). Eine Liste für alle drei war in
beide Richtungen zu grob. Eine **legendäre** Auszeichnung ist jedes Mal eine
Nachricht: sie ist das Seltenste, was der Katalog hergibt, und „Absoluter
Sieger" ist beim zweiten Mal genauso der Grund, warum jemand die App öffnet
— nach der Liste fiel sie zwischen der zehnten und der fünfundzwanzigsten
Verleihung weg. Eine **seltene** beim ersten Mal und an den runden Marken.
Eine **gewöhnliche** erst ab der fünften (`NEWS_BADGE_MARKEN_KLEIN`): einen
Zittersieg holt jeder, der lange genug dabei ist, und der erste ist keine
Nachricht.
**Und die kleinen Marken einer Partie stehen zusammen** (`badge_marken`,
`match:<matchId>`). Eine gewöhnliche Auszeichnung kam im Feed gar nicht vor —
nur legendär, selten und die gewhitelisteten Sonderfälle bekamen eine Karte,
und damit fehlte genau das, was ein Spieler aus der unteren Hälfte überhaupt
erreicht. Einzeln können sie es nicht sein: gemessen fallen an sieben der
vierzehn Tage eine bis vier runde Marken, und vier Karten „X: Zittersieg"
untereinander sind ein Protokoll. Also eine Veröffentlichung je Partie, die
in deren gemeinsame Matchkarte eingeht und jeden Betroffenen nennt, mit
`prio 39` als schwächste Meldung des Spieltagsbandes. Bei genau einer Marke steht die Zahl in der Schlagzeile und
der Text ist die Bedingung aus dem Katalog; ihr Blatt trägt dann dasselbe
Medaillon wie eine einzelne Auszeichnung [§C27], bei mehreren eine Zeile je
Marke.
Der Generator behält alle newswürdigen Auszeichnungsthemen einer Partie,
nicht nur das seltenste. Identität einer Verleihung ist Spieler, Badge und
Match-ID; gleiche Sekunde allein ist weder eine Doublette noch derselbe Rang.
Prestige zählt dagegen jedes Erreichen mit einer flacher werdenden, aber
nie endenden Folge [§C34]. Eine **Würde** ist ausgenommen — sie ist je Saison neu
zu holen und jedes Mal eine Nachricht.
**Ein überholter Elo-Rekord verschwindet.** Neun Karten „Neuer Elo-Rekord:
Martin" standen nebeneinander, mit 128, 183 und 214 Elo — acht davon
behaupteten eine Bestmarke, die längst überboten war. Dieselbe Regel wie
bei der überholten Serie: es bleibt die, die noch gilt.
**Und ein überholter Liga-Rekord auch, aber nur neben seinem Nachfolger.**
Ein Rekord kann an einem Nachmittag zweimal wechseln: gemessen am 10.09.
stand „Martin übernimmt ‚Der Zerstörer'" im Feed zwei Karten über „Jannik
baut ‚Der Zerstörer' aus", und beim „Gigantentöter" stand „Henry und
Jannik übernehmen" acht Minuten vor „Henry übernimmt" — dasselbe Feld, nur
enger geworden. Eine Karte fällt weg, wenn **beides** zutrifft: eine
jüngere Karte über denselben Rekord steht daneben, und ihr eigener Halter
ist heute keiner mehr. Ohne die zweite Bedingung verschwände auch eine
Übernahme, der nichts widerspricht — die erzählt von ihrem Tag und nicht
von heute. **Dieselbe Regel gilt für die Monatschronik**, denn auch ihr Feld
wird im Lauf eines Tages enger und weiter: am 08.09. stand „Leo holt ‚Ohne
Schwachstelle'", neun Minuten später „Leo und Maxi holen ‚Ohne
Schwachstelle'" und drei Stunden danach „Maxi holt ‚Ohne Schwachstelle'".
**Was wichtig ist, bleibt eine eigene Karte** (`_sammelEinzeln`): bei
Spieltagsmeldungen Breaking und jede **seltene oder legendäre Auszeichnung**.
Tafel-Breaking reist dagegen mit seinem vollständigen Tafel-Moment. „Nerven aus Stahl" (drei
Zittersiege in Folge) ist der Grund, warum jemand die App öffnet — es steht
nicht als Kleingedrucktes unter der Duo-Serie zweier anderer.
**In der Karte IHRER Partie steht sie aber mit** (`klasse` an der Zeile,
`.nf-sam-kl`, `.nw-kl`). Seit jede Partie eine Karte hat, hieß „einzeln
bleiben" nämlich: NEBEN der Karte desselben Spiels. Gemessen stand ein 10:4
zweimal untereinander — einmal als „Siegesserie in einer Partie" und einmal
als „Jane: Wiederholungstäter" —, mit denselben vier Wappen und demselben
Stand, und wer scrollt, liest zwei Partien statt einer. Sie reist deshalb mit
und geht dabei nicht unter: die Schlagzeile nennt sie als „seltene" oder
„legendäre Auszeichnung" statt nur als „Auszeichnung", ihre Zeile trägt die
Klasse als Marke in Violett — die Familie der Auszeichnungen [§C25] —, und im
Blatt steht sie mit ihrem Zeichen in der Gruppe. In einem FREMDEN Bündel
bleibt sie weiter außen vor.
**Und eine Partie zeigt ihr Ergebnis einmal** (`bandFremd`). Jede Geschichte
mit einer `matchId` zeigt das Ergebnisband. Bleibt eine alte oder nicht
matchbezogene Kartenform trotzdem neben ihrer Partie stehen, stand
dasselbe Band zweimal untereinander. Das Band gehört deshalb der Partie: die
Partie-Karte und ihr Bündel tragen es, alles andere, was nur daran hängt,
verzichtet darauf. Damit ist die Trennung eindeutig, und die Karte behält ihr
Gesicht; im Blatt steht die Partie weiterhin.
**Zwei Breaking-Meldungen aus DERSELBEN Partie sind aber eine Nachricht**
(`SAMMEL_BREAKING`). Gemessen stand „Neuer Spitzenreiter: Maxi" mit dem
Ergebnisband 10:0 im Feed und „Maxi und Henry: Absoluter Sieger" — die
legendäre Auszeichnung für genau dieses 10:0 — als zweite Karte daneben:
dasselbe Spiel, dieselben Wappen, derselbe Stand, zweimal gelesen. Sie
werden eine Karte, die Breaking bleibt, das Ergebnis der Partie als Band
trägt und in der Schlagzeile **beide Anlässe nennt** („Neue Tabellenspitze
für Maxi und legendäre Auszeichnung „Absoluter Sieger" für Maxi und Henry") — „Ein Spiel, zwei
Geschichten" gilt für jeden Spieltag und verschweigt genau das, was diese
Karte besonders macht. Zusammengelegt wird nur über die **Partie**, nie über
die Minute: eine gemeinsame Minute ohne gemeinsames Spiel sagt nichts.
**Und die übrigen Meldungen derselben Partie reisen mit.** Zusammengelegt
wurde nur Breaking mit Breaking, und damit stand die gewöhnliche Meldung
desselben Spiels als eigene Karte daneben — mit demselben Ergebnisband,
denselben vier Wappen und demselben Stand. Gemessen am 21.09. lagen „Martin
führt die Tabelle" (Breaking) und „Stefan und Julian stürzen die Favoriten"
untereinander, beide mit dem Band 10:7: zwei Fakten, aber ein Moment, und
ein Moment ist eine Karte. Seltene und legendäre Auszeichnungen sowie
negative Ereignisse mit derselben Match-ID reisen ebenfalls mit. Ihre
Klassenmarke beziehungsweise rote Zeilenrichtung bleibt sichtbar. Nur fremde
Partien und nicht matchbezogene Veröffentlichungen bleiben getrennt.
Ist eine Zeile Breaking, steht ihr Anlass zuerst.
**Was eine Auszeichnung derselben Partie erzählt, erzählt das Ergebnis
nicht noch einmal** (`BADGE_DECKT`). „Absoluter Sieger" IST das 10:0, „Upset
King" IST der Favoritensturz. Die Regel stand nur im Generator und galt
damit nur für neue Karten; gemessen am 15.09. lag „Maxi und Henry gewinnen
ohne Gegentor" aus einem älteren Lauf in der Datenbank, und weil der
Generator diese ID nicht mehr bildet, konnte sie auch niemand umschreiben.
Gefragt wird nach dem **Bestand**: liegt die Auszeichnung im Stapel, fällt
das Ergebnis — liegt sie nicht darin, weil eine gewöhnliche Auszeichnung
nur an runden Marken eine eigene Karte bekommt, bleibt das Ergebnis die
einzige Nachricht darüber.
**Eine gewöhnliche Auszeichnung deckt dabei genauso.** Gesammelt wurde nur
aus `badge_unlocked`, und eine gewöhnliche Auszeichnung hat keine eigene
Karte: sie steht in der gemeinsamen Matchmeldung `badge_marken`. Genau ihre
Marken sind es aber, die das Ergebnis erzählen. Und „Zittersieg" heißt im
Katalog `nail_biter` und ist auf „10:9 Sieg" definiert — dasselbe wie der
Ein-Tor-Krimi, nur unter anderem Namen, und er fehlte in der Liste.
Gemessen hieß die Karte des 25.08. damit „Ein-Tor-Krimi und Auszeichnung
in einer Partie", während ihre Zeile „Johannes holt ‚Zittersieg' zum
5. Mal · 10:9 Sieg" trug.
**Die Karte fasst zusammen, das Blatt zeigt alles.** Der Text der
Tafel-Karte hängte die Schlagzeilen aller Zeilen aneinander und trug damit
die Liste, die das Blatt darunter ohnehin führt; er beschreibt jetzt den
gemeinsamen Moment, die Einzelheiten tragen nur die Zeilen. Und im Blatt fällt die Zeile weg,
die der Kopf schon ist [§C33 `_ndNeu`]: bei einer Spiel-Sammelkarte
gehören Schlagzeile und Text dem stärksten Ereignis, dessen Zeile stand
darunter wortgleich ein zweites Mal. Bleibt dabei nichts übrig, wird die
ganze Liste gezeigt — ein leeres Blatt ist schlimmer als eine Wiederholung.

**Neu ist, was seit dem letzten Blick dazugekommen ist** (`NEWS_LS_STAND`,
`_newsGelesen`). Gezählt wurde, was nicht in der Liste der gelesenen IDs
steht — und das ist nicht dasselbe. Die Liste kennt nur, was auf dem
Bildschirm stand, und der Feed zeigt nicht jeden Tag dieselbe Auswahl: eine
Karte fällt unter einen Deckel, eine gleichlautende Schlagzeile verdrängt
sie, eine Sperrfrist läuft ab. Gemessen über fünfundvierzig Tage trugen 81
von 267 neu auftauchenden Karten (30 %) einen Zeitpunkt, der länger
zurückliegt als alles, was der Leser schon gesehen hat: „Martin und Alex
brechen Julians 7er-Serie" vom 09.07. kam am 14.07. und am 20.07. erneut als
neu hoch, und über einem Tag ohne eine einzige neue Karte stand „1 NEU".
„Alles gelesen" setzt deshalb einen **Lesestand** — den Zeitpunkt der
neuesten Karte, die dabei im Feed stand. Gelesen ist, was in der Liste steht
ODER älter ist als der Lesestand. Eine Karte, die später mit altem Zeitpunkt
doch noch erscheint, steht damit unter einem Tag, den der Leser gelesen hat,
und behauptet das nicht mehr.

**Eine Karte, die eine frühere fortsetzt, sagt es** (`_newsFaeden`,
`.nf-faden`). „Anton und Johannes verlieren zusammen alles" am 25.08. und
„Johannes und Anton stürzen die Favoriten" am 26.08. standen als zwei
Fremde da; dass die zweite die erste beendet, musste der Leser selbst
finden. Der **Faden** ist eine Zeile unter der Karte mit dem Titel und dem
Tag der früheren und ihrer Art: **Ende** (der Serienbruch zur Serie),
**Wende** (der erste Sieg nach einer Pleitenserie), **Revanche** (die
nächste Begegnung derselben zwei Duos, andersherum ausgegangen),
**Rückeroberung** und **Fortsetzung** (derselbe Rekord, dieselbe
Monatschronik, derselbe Lauf) und **Wechsel** an der Tabellenspitze.
Antippen öffnet die frühere Karte; ihr Blatt nennt umgekehrt, wo es
weitergeht. Er ist eine Ableitung wie `_isBreaking`, nichts davon wird
gespeichert, und er zeigt nur auf eine Karte, die im Feed steht und älter
ist. Gesucht wird über die ungebündelten Meldungen, weil die Serie, die
eine Partie beendet, in einer fremden Sammelkarte stecken kann.
**Jede Beziehung wird an den Partien nachgeprüft**, nicht am Wortlaut: eine
Pleitenserie wendet nur der ERSTE Sieg danach, eine Serie endet nur, wenn
dazwischen keine Niederlage lag — sonst zeigte jede spätere Partie derselben
Leute auf dieselbe alte Karte. Eine **Revanche** zählt nur über Tage: das
Rückspiel direkt danach ist am Kicker der Normalfall, und gemessen waren
es sieben von zehn Fäden. Eine **Rückkehr** nach der Pause gibt es nicht:
die Karte der Pause fällt mit der nächsten Partie weg, es steht also nie
eine im Feed, auf die sie zeigen könnte. Gerechnet wird einmal je Bestand
(`WeakMap` an der aufgefrischten Liste), gemessen unter einer Millisekunde.
`tests/ambient` rechnet jeden Faden aus den rohen Partien nach,
`tests/blatt` misst ihn bei 360 px und öffnet ihn.

**Breaking scheitert auch nicht am Doublettenfilter.** Die Tabellenspitze
wechselte am 14.09. zweimal und am 15.09. erneut; zwei der drei Karten
hießen „Neuer Spitzenreiter: Maxi" und trugen Wort für Wort denselben Text,
also warf der Vergleich nach Schlagzeile UND Text die ältere weg — der Tag,
an dem er die Spitze übernahm, hatte danach keine Breaking-Karte mehr. Zwei
Wechsel sind zwei Ereignisse, und sie stehen unter zwei Tagesköpfen.
Der Text war dabei die eigentliche Ursache: „X steht nach dem letzten Spiel
an der Spitze. Y war vorher dort" nennt keine Zahl und ist damit an jedem
Wechsel derselbe Satz. Er nennt jetzt den Elo-Stand und den Vorsprung — das
sagt zugleich, wie knapp es oben zugeht.
**Breaking scheitert an keiner Sperre.** Der Schlüssel der Sperrfrist
sortiert die Beteiligten, damit dieselben zwei Halter in anderer Reihenfolge
nicht als Wechsel gelten. Bei einem **gerichteten** Ereignis dreht das die
Aussage um: „Maxi verdrängt Martin" und „Martin verdrängt Maxi" tragen
dieselben zwei Namen. Gemessen wechselte die Tabellenspitze am 14.09.
zweimal und am 15.09. erneut, und von den drei Breaking-Karten blieb genau
eine stehen — die Sperrfrist hielt die anderen für Wiederholungen derselben
Aussage. Breaking ist das Seltenste; es darf an keinem Deckel und an keiner
Sperre scheitern.
**Dieselbe Aussage kommt drei Tage lang nur einmal** (`NEWS_LIMITS.sperreTage`).
Zwei gleiche Schlagzeilen fängt der Feed schon ab. Eine Aussage, deren ZAHL
sich mitbewegt, entkommt ihm: „Martin baut ‚Der Maßstab' aus" heißt nach dem
nächsten Sieg genauso, nur mit 74 statt 73 Prozent, und bekommt damit eine
eigene ID, einen eigenen Titel und eine eigene Karte. Gesperrt wird deshalb
die Aussage selbst — Art, Beteiligte und Sache —, nicht der Wortlaut. Wer den
Rekord übernimmt, trägt andere Spieler im Schlüssel: eine Übernahme bleibt
Nachricht, auch am Tag nach einer anderen. Was es je Tag, Woche oder Monat
genau einmal gibt, fällt nie darunter, und die ambienten Karten hängen ohnehin
an ihrem Slot.

**Zwei Karten mit derselben Schlagzeile sind eine zu viel** — außer bei
dem, was es je Tag, Woche oder Monat genau einmal gibt (`TAG_PFLICHT`).
Derselbe Spieler gewinnt zwei Spieltage, und die Schlagzeile lautet
beide Male gleich: gemessen holte Martin den 02.09. mit 3 von 3 und den
08.09. mit 5 von 7, und die ältere Karte fiel weg. Sie stehen unter zwei
verschiedenen Tagesköpfen, und jede nennt im Text ihr eigenes Datum. Eine
echte Doublette fängt weiterhin der volle Vergleich aus Schlagzeile UND
Text ab. Sonst gilt: der Feed
entfernt Doubletten nach Text UND nach Titel: zwei Rekordkarten
unterschieden sich im Beleg und trugen wortgleich dieselbe Zeile, und nach
zwei Partien stand sie zweimal untereinander. Wer den Rekord hält, wird
dafür **sortiert** verglichen — dieselben zwei Halter in anderer
Reihenfolge galten sonst als Halterwechsel.

**Was der Generator nicht mehr erzeugt, verschwindet auch.** Der
Wochenrückblick war einmal sechs eigene Karten über den Montag verteilt.
Er ist jetzt eine Karte am Sonntag — aber die alten liegen persistiert in
der Datenbank, und nichts hat sie je wieder angefasst: am Montag danach
stand „der größte Sprung der Woche" neben dem Spieltag, der gerade lief.
`_newsTexteAuffrischen` konnte sie nicht einmal umschreiben, weil der
Generator ihre ID gar nicht mehr bildet. `STORY_ABGEMELDET` meldet sie ab —
am **ID-Präfix**, nicht am Typ: der wöchentliche Elo-Sprung hieß
`elo_swing_week_…` und trug denselben Typ wie der tägliche, den es noch
gibt. Über den Typ war er nicht zu fassen. Auf die Liste gehört **nur**,
was der Generator nicht mehr bildet — ein Präfix, das es noch gibt, wäre
damit stumm geschaltet.
Drei sind dazugekommen. Den Spitzenwechsel gab es einmal je Wechsel
(`lead_change_<Saison>_<Partie>`), heute ist es eine Karte je Tag
(`lead_day_<Saison>_<Tag>`): gemessen am 21.09. stand „Neuer Spitzenreiter:
Martin · 11 vor Maxi" in derselben Minute wie „Martin übernimmt die
Tabellenspitze · 28 vor Maxi" — ein Ereignis, zwei Karten, zwei
verschiedene Zahlen, weil die alte ihren Vorsprung eingefroren trägt. Und
der **Elo-Bestwert** (`elo_record_`) steht als „Der höchste Gipfel" in der
Ewigen Tafel; seiner Karte war das Breaking schon genommen, die Doppelung
damit nicht. Und das **Ergebnis** (`match_result_`) entstand nur für ein
auffälliges Muster und höchstens zweimal je Tag; heute bekommt jede Partie
ihre Karte (`spiel_<Partie>`), und die alte Zeile lag daneben — dieselbe
Partie, dasselbe Ergebnisband, zwei Karten untereinander.

**Was abläuft, läuft auch ab.** Eine Karte, deren Wahrheit ein Countdown
ist, lebt nur so lange, wie der Generator sie noch bildet
(`STORY_LAEUFT_AB`). „Noch 5 Tage" gilt unter EINER ID für eine ganze
Saison, und der Zeitstempel stammt aus dem ersten Insert: war die Saison
vorbei, zählte die Karte für immer Tage herunter, die es nicht mehr gab.

**Und was überholt ist, auch.** Die ID einer Serienkarte trägt ihre Länge
(`team_streak_A_B_7`), also wird jede Länge einzeln persistiert. Aus einer
Serie, die von sieben auf zehn wuchs, standen vier Karten im Feed. Für
Einzelspieler filterte `_liveStreakForm` das längst, für Duos filtert es
jetzt `_liveTeamStreak`.

Ein **historischer Serien-Meilenstein** ist dagegen ein Match-Ereignis und
bleibt auch nach dem späteren Serienbruch erhalten. Der Generator läuft die
Partien chronologisch ab, verankert 5er-, 7er-, 10er- und weitere Marken an
der auslösenden Partie und baut die stabile ID aus Spieler, Match und Länge.
Starke Upsets werden ebenso ihrem Match zugeordnet; je Tag bleibt die
stärkste Überraschung, im Fenster höchstens vier.

`_newsTexteAuffrischen` merkt sein Ergebnis auf die Eingabe und gibt bei
unverändertem Wortlaut dieselbe Referenz zurück. Ohne das baute es bei
jedem Aufruf ein frisches Array, und der Referenz-Memo in
`_consolidateStories` — der genau dafür gebaut ist — schlug nie an:
gemessen null Treffer in fünf Aufrufen, bei einem Aufruf nach jedem
`loadAll` und bei jedem Zeichnen des Feeds. `tests/ambient` misst das alles.

**Das Ergebnis im Text gehört dem Sieger.** Es stand in der Reihenfolge der
Eingabe, und damit stand „Maxi und Leo retten ein 9:10 ins Ziel" im Feed —
die Sieger genannt und dahinter der Stand des Verlierers. Dasselbe im
Spitzenspiel: unter „Leon schlägt Julian" stand „9:10". Eine Karte, die zwei
verschiedene Sieger behauptet, ist keine Nachricht.
**Und der Elo-Gewinn gehört einem, nicht der Partie** (`eloPid`). „Der Sieg
bringt +19 Elo" stand da, und die Zahl ist die des STÄRKEREN von zwei
Siegern: gemessen tragen nur 24 der 466 Partien für beide dieselbe Zahl,
und der Abstand geht bis 38 Elo. Der Satz nennt deshalb, wem sie gehört
(„Für Julian bringt der Sieg +19 Elo"); die Elo je Spieler zeigt das Blatt
(`_ndEloWirkung`). Kennt eine ältere Zeile den Träger nicht, bleibt die
Zahl weg — eine Behauptung über zwei Leute ist schlimmer als eine Zahl
weniger.
**Kein Etikett mit Doppelpunkt am Satzanfang, kein Satzfragment, keine
englische Aufschrift.** „Saison-Endspurt: Leon führt mit 91 Elo Vorsprung"
ist eine Rubrik und ein Satz in einem, und die Rubrik steht schon über der
Karte [§C27]. „Seit dem 16.07. geht jedes gemeinsame Spiel verloren. 3 am
Stück." endet auf einem Fragment ohne Verb. Und „Giant Slayer" und „Losing
Streak" waren die einzigen englischen Aufschriften der Liga — „Player of the
Week" und „Player of the Day" bleiben, das sind die Namen der beiden
Wertungen. `tests/ambient` prüft das über jeden vierten Spieltag der
Ligageschichte: ein einziger Generatorlauf trifft von jedem Typ höchstens
einen Fall, und dann prüft die Zusicherung genau den, der zufällig gerade
ansteht.
**Und der Text wiederholt nicht seine Schlagzeile.** „Leo: Sieg Nummer 100"
trug darunter „Leo feiert den 100. Sieg", „Leo knackt 300 Elo" trug „300 Elo
zum ersten Mal überschritten". Jeder Text nennt eine Zahl, die die
Schlagzeile noch nicht hat.

**So spricht die Liga.** Leicht und unkompliziert, aber mit den Zahlen dran.
Kein Gedankenstrich — er trennte Sätze, die als zwei Sätze klarer sind. Die
Schlagzeile sagt, was passiert ist, und steht nicht noch einmal im Text:
„Serie gerissen: Martin" trug den Verlierer in der Zeile und die Tat im
Kleingedruckten, jetzt heißt es „Leon und Maxi brechen Martins 8er-Serie".
Jeder Text nennt eine Zahl (ausgenommen die Auszeichnung, deren Text die
Bedingung aus dem Katalog ist), und jeder Name im Satz ist aufgelöst: „Holt
er ihn" stand direkt hinter dem Namen des HALTERS und zeigte auf den
Falschen. `tests/ambient` misst das alles.

**„Ausgebaut" heißt besser geworden** (`_rekordArt`). Die Meldung feuerte,
sobald sich die angezeigte Zahl änderte — egal wohin. „Der Fels" ging von
6,9 auf 7,0 Gegentore und „Der Platzhirsch" von 44 auf 42 %, beides eine
Verschlechterung, und beides stand als „baut seinen Rekord aus" im Feed. Wer
den Rekord hält und verschlechtert, hat nichts getan: die anderen sind nur
nicht vorbeigezogen.

**Ein überschrittener Meilenstein bleibt auffrischbar.** Die ID trägt die
Zahl (`rivalry_milestone_A|B_50`); stand das Paar bei 52, bildete der
Generator die 50er-ID nicht mehr, und „Historisches 50. Aufeinandertreffen"
blieb mit seinem alten Wortlaut stehen. Gemeldet wird deshalb **jede
überschrittene Schwelle**, mit dem Zeitpunkt der kreuzenden Partie und dem
Zwischenstand von damals — „Das 50. Aufeinandertreffen dieser beiden" stand
sonst wortgleich unter zwei Karten und nannte keine einzige Zahl.

**Der Text kommt aus dem Generator, nicht aus der Datenbank.** Stories
werden persistiert, damit alle Geräte dieselbe Karte zur selben Zeit sehen —
Titel und Text waren damit aber eingefroren: eine überarbeitete Formulierung
erschien nur an Karten, die es noch nicht gab. Nach dem Umbau stand „dieses
Duo harmoniert gerade perfekt" weiter im Feed, obwohl der Satz längst durch
die Zahl ersetzt war. `_newsTexteAuffrischen` lässt deshalb den Wortlaut des
Generators gewinnen, wenn er dieselbe ID noch einmal erzeugt. ID und
Zeitpunkt bleiben, was die Datenbank sagt, sonst spränge eine Karte im Feed;
alles andere ist eine Ableitung aus den Daten und darf sich verbessern —
genau so arbeiten `_isBreaking` und `_displayCat` seit jeher.
Außerdem ergänzt die Auffrischung ableitbare Generator-Ereignisse, die im
Vierzehn-Tage-Fenster in einer älteren Datenbank noch fehlen. Die stabile
fachliche ID entdoppelt diesen Backfill; es braucht weder Migration noch
pauschale Neuberechnung historischer Daten.

**Derselbe Datenstand ergibt dieselbe Karte.** Eine Story wird persistiert,
damit alle Geräte dieselbe Karte zur selben Zeit sehen — das hält nur,
solange ein zweiter Lauf über dieselben Partien dieselben IDs, dieselben
Zeitpunkte, dieselbe Gruppierung und denselben Wortlaut ergibt. Sonst legt
jedes Öffnen der App eine neue Zeile an, und der Feed wächst vom Zusehen.
Jede ID ist deshalb aus Fachlichem gebaut — Spieler, Sache, Spieltag — und
nie aus dem Bestand, der Uhrzeit des Laufs oder einem Zufall.
`tests/ambient` läuft den Generator zweimal und vergleicht beides samt der
fertigen Gruppierung, und ein dritter Lauf findet den Bestand des ersten
vor: er darf keine einzige ID hinzufügen.

**Der Rang gehört dazu** (`_newsPrio`). `prio` stand als Zahl mit in der
Zeile, und als die Skala auf EIN Band umgestellt wurde, blieb jede längst
gespeicherte Karte auf ihrer alten stehen: gemessen trugen 113 der 153
Zeilen im Vierzehn-Tage-Fenster noch einen Wert von höchstens zehn, und von
den fünfundzwanzig, die der Generator heute noch bildet, wichen
vierundzwanzig ab — „Die Woche gehört Martin" stand mit 9 neben einer
frischen Sammelkarte mit 80. Damit waren die zwei Skalen wieder da, diesmal
zwischen Datenbank und Generator, und der Tagesdeckel entschied zwischen
ihnen. Überlebt haben die alten Karten nur dort, wo eine Ausnahme sie trug:
Breaking und die Pflichtkarten zählen nicht gegen den Deckel. Gerechnet
wird deshalb immer neu — die Zahl des Generators, sonst das Band des Typs
aus `STORY_PRIO`.

**Breaking ist das Seltenste, also darf es das Lauteste sein.** Sieben
Anlässe sind erlaubt, das sind wenige Karten pro Saison. Vorher unterschied
sie ein dünner roter Rahmen von jeder anderen Karte, und im Feed ging sie
unter. Jetzt: voller Rahmen, ein Balken mit pulsierendem Punkt, ein warmer
Schein von links unten und eine Schlagzeile, die die Karte trägt. Der Puls
ruht bei `prefers-reduced-motion`.
Der **Nachsatz** darunter (`.nf-brk-sub`, `_breakingHeroText`) trägt den
langen Satz — aber nur, wo es einen gibt. Die Funktion kennt sieben Typen
und fiel sonst auf `desc` zurück: damit stand der Teaser auf jeder anderen
Breaking-Karte zweimal untereinander, auf der gebündelten ebenso wie auf
jeder legendären Auszeichnung [§C33 `_ndNeu`].

**Die Karte des Tages** (`_newsTagKarte`, `.nf-gross`) steht groß an ihrer
Uhrzeit, nicht am Kopf des Tages — sie nach oben zu ziehen wäre genau die
Umsortierung, die der Feed nicht mehr macht. Es gibt sie **nur an
Spieltagen**: an einem Tag ohne Partie ist nichts passiert, was ihn von einem
anderen unterscheidet, und dort standen sonst ein Fun Fact oder eine
Zufallsstatistik groß im Bild, die gestern genauso dagestanden hätten.
Und sie steht **ab der dritten Partie des Tages**
(`NEWS_LIMITS.tagKartePartien`), in dem Moment, in dem sie gelaufen ist, und
**wechselt, solange der Tag läuft**: gewählt wird bei jedem Zeichnen unter
allen Karten des Tages, und eine spannendere, die später kommt, übernimmt
das Band. Acht Partien waren einmal die Schwelle, der Median der Liga, dann
fünf oder 19 Uhr — das Band kam damit, als der Spieltag längst gelaufen war,
und wer mittags nach drei Partien in den Feed sah, fand keins. Bei **einer
oder zwei Partien gibt es kein Band**: es zeichnet aus, was sich gegen andere
Karten durchgesetzt hat, und zwei Partien sind kein Feld, aus dem man wählt.
Welche Story es trägt, entscheidet `_newsTagSpannung` unter denen, die es
tragen dürfen (`_newsTagKarteWuerdig`): Rekordwechsel, große
Überraschungen, Spitzenspiele und mehrteilige Ereignisse stehen vor einer
gewöhnlichen Tagesbilanz. **Vier Sorten tragen es nie**, jede aus ihrem
eigenen Grund. **Breaking** nicht: die Karte ist im Feed ohnehin die
lauteste, voller Rahmen, pulsierender Balken, Schein hinter der Fläche —
das Band darüber sagt dasselbe ein zweites Mal [§C27] und nimmt es genau
der Karte, die sonst keine Möglichkeit hat, herauszustehen. **Der Spieler
des Tages** nicht: er ist eine Pflichtkarte, steht an jedem gewerteten
Spieltag und trägt seine Goldkante schon — er hätte das Band an jedem
ruhigen Tag von selbst, und dann zeichnet es nichts aus. **Ein Rückblick**
nicht: Woche, Monat und Saison erzählen von einem Zeitraum, das Band gehört
dem Tag. Und **keine Karte mit negativer Richtung** (`_newsIstNegativ`):
das Band ist golden, und Gold gehört dem Titel [§C25] — gemessen trug
„Anton: Die Talfahrt", eine Schande, das Band und den goldenen
Auswahlschimmer. Bleibt danach kein würdiger Kandidat, trägt an diesem Tag keine
Karte das Band — und ebenso, wenn der stärkste unter dem Niveau einer
Tagesbilanz bleibt (`NEWS_LIMITS.tagKarteSpannung`): gemessen trug ein
Spieltag das Band auf „Der größte Ausschlag des Tages" mit 564 Punkten gegen
620 für einen Tagessieger, und ein Band, das eine beliebige Karte
auszeichnet, zeichnet nichts aus. Die Liste steht an EINER Stelle, weil `tests/ambient` und
`tests/blatt` dieselbe Frage stellen und sie sich vorher jeder selbst
beantwortet haben.
Die Auswahl ist deterministisch und verändert weder Story-ID noch Zeitpunkt.
Sie wird aus allen Karten des Tages berechnet, nicht neu aus dem aktiven
Filter; ist die Gewinnerstory dort ausgeblendet, bekommt keine Ersatzkarte
das Band.
Die Auswahl wird über den echten Vierzehn-Tage-Verlauf nachgemessen: An
jedem Spieltag muss sie den höchsten Spannungswert tragen, mindestens das
Niveau einer Tagesbilanz erreichen und darf nie ein Ambient-Fact sein.
Der Spieler des Tages gewinnt das Band dabei nur an Tagen, an denen keine
stärkere Geschichte entstanden ist.
Vorher wurde sie zwanzig Minuten nach dem ersten Spiel vergeben: der Rekord,
der gerade wechselte, war die einzige Karte des Tages und damit automatisch
die stärkste, während der Spieltag noch lief und der Spieler des Tages noch
gar nicht feststand. Danach stand sie erst um 23:59 und damit einen halben
Tag, nachdem die letzte Partie gelaufen war. Welche Partien zu einem
Kalendertag gehören, sagt `_newsTagMs` — in Ortszeit, weil der Feed nach
Ortszeit gruppiert und `matchesByDay` nach UTC schlüsselt.
**Die Sammelkarte zeigt ihre stärksten Zeilen, das Blatt alle.** Ihr eigener
Titel ist eine Zusammenfassung und entspricht deshalb keinem Einzelereignis.
Bis `NEWS_LIMITS.sammelZeilen` stehen alle Teile im Sammelband, darüber
führt die Zahl der übrigen ins Blatt.
**Wo der Erfolg ein Zeichen ist, steht das Zeichen dabei**
(`_newsErfolgZeichen`). „Vier Spieler tragen jetzt den Schildring" zeigte
den Schildring kein einziges Mal — daneben stand ein Pokal aus dem
Icon-Katalog. Die App hat das Bauteil [§C27]; `insigniumStufeSvg` trägt
seine Verläufe selbst und funktioniert deshalb auch dort [§C30].

**Der Kopf einer Sammelkarte ist keine bevorzugte Detailzeile.** Titel und
Text verbinden Beteiligte und Anlass zu einer redaktionellen Geschichte;
das Sammelband belegt sie mit allen Einzelmeldungen. Im Blatt erhalten die
Teile dasselbe Markup und denselben visuellen Rang.

**Ein Fun Fact gehört fest zu seinem 15-Uhr-Slot und bleibt ein Snapshot.**
Aus den Vorlagen gewinnt deterministisch die erste passende, die Rotation
und Spieler-Cooldowns einhält. `syncStoriesViaDb` lädt den Bestand vor der
Ziehung; ein bereits persistierter Slot wird weder neu gezogen noch durch
`_newsTexteAuffrischen` verändert. Die ID lautet
`ambient_<lokaler-Tag>_15`, der Zeitpunkt ist exakt 15:00 Uhr.

**Ein Fun Fact zeichnet seinen Anlass** (`dataRef.bild`, `_faktBild`,
`30c-news-fakt.js`). Alle trugen dieselbe Form: eine große Zahl links, der
Satz rechts. „3 Tage ohne Spiel", „41 Awards", „3830 Prestige" und „7:2
Duelle" sahen untereinander gleich aus. Jede Vorlage legt jetzt die Daten
ihres Bilds in den `dataRef`, und die Karte trägt daraus einen eigenen
Kopf:
- das **Podest** für einen Bestwert;
- das **Rennen** der ersten drei für die Form der letzten vierzehn Tage;
- die **Strichliste** für gesammelte Titel;
- die **Sterne** für Meistertitel [§C26];
- das **Zählwerk** für eine große Summe und die runde Partie;
- das **Tauziehen** für zwei Spieler;
- der Lauf eines **Duos**;
- die Felder der **Pause** samt Marke der längsten;
- die **Vitrine** und die **Medaille**;
- die **Stufe** der Leiter und das **Ziel**;
- die zwei **Rollen**;
- die **Verteilung** der Ergebnisse;
- die **Säulen** der Spieltage und Wochen;
- der **Platz** im Feld;
- die **Tafel** des Monats.

Das Bild steht an der Karte, Zahl und Gesichter links fallen dann weg
[§C27]. Das Blatt trägt dasselbe Bild als Bühne. Gespeichert wird es mit
der Karte, wie jede Zeichnung einer Story; eine ältere Karte ohne `bild`
behält ihre Zahl links. Die Breite eines Balkens rechnet die Vorlage, weil
dort bekannt ist, ob weniger besser ist. Die Reihenfolge eines Rekords
(`chronicleRang`) ist schon nach dem Wert geordnet. Jedes Bild nennt die
Namen seiner Spieler im Text, und es bleibt leise wie die Karte [§C25]:
Metall, die Familienfarbe nur am Ersten. `tests/ambient` rechnet die Zahlen
jedes Bilds an ihrer Quelle nach. `tests/blatt` misst jedes bei 288 und
360 px.
**Verpasste stille Tage werden nachgetragen.** Beim nächsten Öffnen prüft
`_buildAmbientStories` alle Tage des 14-Tage-Fensters. Ein vergangener Tag
bekommt seinen Slot nur, wenn dort keine Partie und vor dem Slot kein
Saisonabschluss lag. Für heute zählt der Stand um 15:00 Uhr: eine erste
Partie um 15:20 Uhr entfernt den bereits fälligen Funfact nicht, eine Partie
um 14:50 Uhr verhindert ihn. Der erste Insert bleibt auf allen Geräten der
kanonische Text- und Zeit-Snapshot.
**Der Tagesplan.** `07:00` gab es nicht mehr: der Spieler des Tages steht um
**23:59 an seinem eigenen Spieltag**, wenn keine Partie mehr dazukommen kann
(die späteste der Liga hat um 18 Uhr angefangen). Vorher erschien er am
Morgen danach und stand in der Tafel unter einem Datum, an dem gar nicht
gespielt wurde. Der Fun Fact steht einmal täglich um **15:00 Uhr**, sofern
bis dahin keine Partie und kein Saisonabschluss lag. Der Wochenrückblick ist
**eine** Karte am **Sonntag um 23:59:05** (`woche`): vorher standen sechs
Wertungen als sechs Karten über den Montag verteilt, und der Montag ist der
Spieltag — die vergangene Woche verdeckte, was gerade passierte. Danach stand
sie um 23:00 und damit unter dem Spieler des Sonntags, der um 23:59 kommt:
der Abschluss eines Tages über dem der ganzen Woche. Die Wochengrenze liegt
dafür in `_potwLastWeekRange` (23:59, wie `_tagZu`), damit Rückblick, POTW
und Wochenkarte über dasselbe Fenster reden.

**Der Monat schließt mit einer Karte.** Am Monatswechsel entstanden drei
Arten Karten: der Meister am letzten Tag um 23:50, die Chronik am 1. um
00:00 und je Erstling eine Zeile in der Tafel des 1., zwischen den Rekorden
eines Spieltags, der mit dem alten Monat nichts zu tun hat — im Juni 2026
zehn. Dazwischen stand der Spieler des letzten Tages, über dem Meister.
Das Team der Saison und die Zeichen, die erst mit den Titeln kamen, standen
auf keiner: gemessen stieg Martin am 1. Juli um 00:00 auf den Volutenkranz
III und fiel am Spieltag danach zurück, und keine Karte hatte es gesagt.
Jetzt trägt der Monatsabschluss das alles am 1. um 00:00, und sein Tippen
öffnet den Saison-Rückblick: sein Blatt hatte Podest, Titelrennen und Tage
vorn ein zweites Mal gezeigt, und zum Rückblick führte von dort kein Weg.
Gebildet wird er nur in den ersten zwei Tagen der neuen Saison — vorher
steht der Meister nicht fest.

**Der Spieltag führt, die Ewige Tafel ist die zweite Ebene daneben.**
Inhaltlich teilte sich das Vierzehn-Tage-Fenster einmal ungefähr zur Hälfte in
**Ewige Tafel** und **Spieltag plus automatisch erzeugte Fun Facts**, und der
Test erlaubte 40 bis 60 %. Das war die Lage, in der nur ein Bruchteil der
Partien überhaupt eine Karte hatte: gemessen kamen von 52 Partien des Fensters
18 vor. Seit jede Partie ihre Karte bekommt, führt der Spieltag — die Tafel
ist nicht die halbe Tafel, sondern die Ebene daneben, und ihren Platz je Tag
hält sie über die Reservierung und nicht über eine Quote. Gemessen liegt sie
bei 25 % der Ereignisse und 17 % der Karten; der Test erlaubt 20 bis 50 %,
damit ein ungewöhnlich ruhiger oder ereignisreicher Spieltag nicht künstlich
mit belanglosen Karten aufgefüllt wird. Die Untergrenze stand bei 25 %: seit
„Der Lauf" vierzig Partien zählt und „Der Höhenflug" zwanzig gegen zwanzig
vergleicht [§C35], wechseln die beiden nicht mehr jede Woche den Halter, und
das nahm sieben der 53 Tafel-Ereignisse des Fensters — bei gleich vielen
Tafel-Karten. Gemessen werden Ereignisse, nicht
bloß Karten: eine Sammelkarte mit vier vollständig sichtbaren Zeilen zählt
vier Geschichten. Die Seiten des Feeds sind im Filter exklusiv: eine
Tafelmeldung darf einen Match-Zeitpunkt tragen, zählt deshalb aber nicht
ein zweites Mal als Spieltagsmeldung. Es gab nur Tafel und Spieltag; die
Ehrung, die Fun Facts und die Saison standen auf keiner Seite, und das
Zeichen stand unter der Tafel, obwohl seine Karte eine eigene Rubrik trägt.
Gemessen standen im Vierzehn-Tage-Fenster der Fixtures 19 von 83 Karten
auf keiner Seite.

**Dieselbe These kommt nicht vor dreißig Tagen wieder**
(`AMBIENT_PAAR_COOLDOWN_DAYS`). Eine These ist der Typ UND die Person:
derselbe Typ über jemand anderen ist eine neue Aussage, und die
Führungs-Typen zeigen strukturell immer auf denselben Kopf. **Eine These
ohne Person ist der Typ selbst** — gemerkt wurde sie nicht, weil die
Schleife über die Köpfe lief und es dort keinen gibt: „2 tragen den Reif, 7
den Schildring" hängt an der ganzen Liga. Gemessen über vierzig
nachgespielte Tage stand `insignium_stand` damit nach drei, vier und sechs
Tagen wieder da, denn der Typ-Cooldown von sieben Tagen fällt ab dem zweiten
Durchgang und ein personenloses Template liefert immer ein Ergebnis.
Ausgenommen sind die **Rückblicke mit festem Termin** (`pflicht`): die
Monatshalbzeit gehört dem 15. und der Jahresblick dem 1. Januar, sie hängen
nicht am Losverfahren. `tests/ambient` spielt die vierzig Tage Slot für Slot
nach und prüft jede These.
Die Ambient-Auswahl rotiert nicht nur konkrete Templates, sondern auch ihre
**Rubrik** (`ambientRubrik`). Zwei aufeinanderfolgende Slots vermeiden nach
Möglichkeit dieselbe Erzählart; bei einem kleinen Pool wird die Sperre
stufenweise gelockert, damit der Slot trotzdem gefüllt werden kann.

**Wer nicht gespielt hat, hat nichts getan.** Ein Liga-Rekord und eine
Monatschronik wechseln auch den Halter, weil ANDERE gespielt haben: „Der
makellose Tag" misst einen Anteil, und wer den Bestwert hält, verliert ihn mit
dem nächsten schwachen Tag — der Nächstbeste übernimmt, ohne angetreten zu
sein. Gemessen trugen 23 von 280 Tafel-Karten einen Namen, der an diesem Tag
keine Partie hatte; „Martin holt ‚Der Tagesabschluss'" stand über einem
Spieltag ohne Martin. Die Karte kommt deshalb nur, wenn mindestens einer der
Genannten an diesem Tag gespielt hat. Dieselbe Begründung wie beim Ausbauen:
die anderen sind nur nicht vorbeigezogen.
**Und sie nennt die, um die es geht, nicht jeden Mithalter.** „Martin zieht
bei ‚Der Nachzügler' gleich" trug Martin UND Julian in `playerIds`, und die
Tafel-Sammelkarte darüber hieß „Julian und Martin bewegen die Ewige Tafel" —
über zwei Zeilen, die beide von Martin erzählen. Beim Dazukommen sind die
Genannten die Neuen, sonst alle Halter.
**Die ID einer Tafel-Meldung ist ihr Rekord und ihr Spieltag** — nicht der
Stand des Augenblicks. Sie trug den angezeigten Wert und die sortierten
Halter, und beides bewegt sich im Lauf eines Tages: gemessen stand nach der
vierten Partie des 26.08. „Maxi übernimmt ‚Der Höhenflug'" im Feed, nach der
fünften „Maxi und Johannes übernehmen" und nach der siebten „Maxi, Julian,
Jane und Johannes übernehmen" — drei IDs, drei Karten desselben Vorgangs, und
weil keine der anderen deutlich genug widersprach, blieben am Ende alle drei
im Bestand stehen. Der Rekord wechselt an diesem Spieltag einmal; gerechnet
wird gegen den Stand vor dem Spieltag, und ob danach einer oder vier halten,
ist derselbe Vorgang. Also eine Karte, die mitwächst: der Wortlaut kommt aus
dem Generator, der Zeitpunkt aus der Datenbank. Dieselbe Regel gilt für die
Monatschronik (`chrget_<Chronik>_<Saison>_<Tag>`), deren Halterfeld im Lauf
eines Tages ebenso enger und weiter wird. Der Spieltag bleibt in der ID:
ohne ihn beschreibt dieselbe ID zwei verschiedene Ereignisse — geht eine
Chronik weg und kommt an dieselben Leute zurück, bildet der Generator genau
diese ID erneut. Die Datenbank hat sie schon, also bleibt
der alte Zeitstempel — aber `_newsTexteAuffrischen` übernimmt den neuen
`dataRef`, und damit zeigt eine Karte vom 24. auf die Partie vom 26. Gemessen
wanderte so der ganze Tafel-Moment des 24.08. in die Sammelkarte des 26.08.,
und der 24. hatte keine Tafel-Karte mehr. Eine Wiederkehr ist ein neues
Ereignis und bekommt eine eigene Karte.
**Eine überholte Meldung fällt nur am eigenen Tag.** Zwei Karten über
denselben Rekord widersprechen sich, wenn sie am selben Tag stehen: „Der
Zerstörer" wechselte zweimal am 10.09., und beim „Gigantentöter" stand „Henry
und Jannik übernehmen" acht Minuten vor „Henry übernimmt". Über Tage hinweg
erzählen sie dagegen eine Geschichte, und der Vergleich lief einmal über das
ganze Fenster: jeder Weiterwechsel löschte die Meldung von vorgestern, und
gemessen fielen so zwei von sieben Spieltagen ganz aus.
**Eine Null ist kein großer Wert.** Auf der Chronik-Karte stand „0
ZUSÄTZLICH" im größten Schriftgrad, und das liest sich wie ein Fehler: der
Erfolg kann eine legendäre Chronik sein, er zählt nur nicht zusätzlich, weil
je Monat ein Eintrag in der Tafel steht [§C32] und ein stärkerer den Platz
hält. Dann fällt der große Wert weg, und den Grund nennt der Satz mit Namen —
„Für die Laufbahn bleibt ‚Der Wundertäter' stärker".
**Die Ewige Tafel meldet sich.** Der ganze Awards-Reiter kam im Feed nicht
vor: wer einen Liga-Rekord übernahm, eine Monatschronik holte oder eine
Insignium-Stufe erreichte, erfuhr es nur, wenn er selbst nachsah. Die
Kategorie `tafel` sammelt das.
Eine **Insignium-Meldung ist ein echter Übergang**, kein Nähefenster: Der
Stand vor dem letzten Spieltag wird mit dem heutigen verglichen. **Und sie
sagt, ob die Stufe zum ersten Mal dasteht.** Prestige aus Liga-Rekorden
wird unter den Haltern geteilt und fällt mit einem verlorenen Bestwert
wieder [§C34], dieselbe Stufe kann also zweimal erreicht werden — beide
Male hieß die Karte „X trägt den Volutenkranz", als wäre es das erste Mal.
Der Beleg ist der eigene Bestand: die ID einer Insignium-Karte trägt
Spieler, Stufe und Spieltag, eine ältere Zeile mit demselben Spieler und
derselben Stufe ist damit die Antwort. Aus dem Prestige selbst ist sie
nicht zu holen, dafür müsste jeder Spieltag der Ligageschichte einzeln
nachgerechnet werden. Dann heißt es „trägt den Volutenkranz wieder", und
die Karte nennt den Tag, an dem die Stufe zuletzt stand. Ein Abstieg
bekommt weiterhin keine Karte. Überspringt
jemand mehrere Stufen, entsteht für jede gekreuzte Schwelle genau eine
stabile ID aus Spieler und Stufe. Eine binäre Suche setzt `when` auf die
erste Partie, an der die Stufe wirklich erreicht war; historische Prestige-
und Saisonabfragen schneiden dafür Matches, Badges und Chroniken am selben
Zeitpunkt. Wiederholte Generatorläufe erzeugen keine Dublette.
**Auch der laufende Monat** (`chronik_geholt`, `prio 62`). Die Monatskarte
entsteht erst am 1. für den VORmonat; gemessen trug der August dreizehn
Chronik-Einträge und dazu keine einzige Karte. Quelle ist derselbe
Zeitschnitt wie bei den Rekorden: `seasonTitleHalter(sid)` gegen
`seasonTitleHalter(sid, bisMs)` vor dem letzten Spieltag. Gemeldet wird nur
der **Wechsel**, in vier Fällen mit vier Verben — `holt` (vorher niemand),
`übernimmt` (der Halter wechselt), `hält jetzt allein` (das Feld ist enger
geworden) und `zieht gleich` (jemand kommt dazu). „Julian holt ‚Der
Nachzügler'. Vorher hielten sie Julian, Martin und Maxi" stand da, als es
nur einen Fall gab: er war schon Mithalter, und aus drei Haltern wurde
einer. Die Schlagzeile nennt beim Dazukommen die **Neuen**, sonst alle
Halter. `prio 62` liegt über der Insignium-Stufe und unter dem übernommenen
Liga-Rekord: damit überlebt die Karte den Tagesdeckel, ohne die Ewige Tafel
zu überstimmen. Vor dem Bündeln gibt es **keinen Chronik-Cap**: alle echten
Wechsel derselben Partie oder Minute stehen vollständig in ihrer gemeinsamen
Tafel-Karte. Auch eine legendäre Chronik reist in diesem Fall mit dem
Tafel-Moment; allein bleibt sie weiterhin eine eigenständige Karte. Der
große Wert der Karte ist ausschließlich der **tatsächliche neue
Laufbahnbeitrag**. Dafür werden die gecachten Monats-Summen vor und nach dem
Spieltag aus `prestigeTabelle(bisMs)` verglichen. Steht für denselben Spieler
schon eine stärkere Chronik in diesem Monat, zeigt die Karte `0 zusätzlich`
und benennt den stärkeren Eintrag statt fälschlich den ungedämpften
Katalogwert als `+Prestige` auszugeben. Bei mehreren Haltern liegt die
Differenz je Spieler in `prestigeDelta`; Sammelkarten übernehmen denselben
geprüften Text. Das Detailblatt zeigt für jeden Beteiligten den gezählten
Monatseintrag und seinen echten Zuwachs. Alte persistierte Karten ohne diese
Daten behaupten ebenfalls kein Plus: Ihr aktuell zählender Beitrag wird aus
derselben Laufbahnquelle abgeleitet. Das Blatt zeigt außerdem die Zahlenreihe aus Klasse, Art,
Ausschlag und Prestige [§C39], die Bedingung, das Podest des Monats und
einen Knopf in die Tafel. Schattenseiten meldet der Feed auch hier nicht. Quelle der Rekordmeldungen ist ein
Zeitschnitt — `allChronicles(bisMs)` vor dem letzten Spieltag gegen heute;
er kostet einmal ~18 ms und liegt danach im Cache.
**Eine Rekordkarte gibt ihre ganze Lage weiter.** Der Name des Rekords
stand nur in der Schlagzeile, die Wechselart nur im Typ-Präfix, der volle
neue Halterstand nur gekürzt in `playerIds` (drei Gesichter), der alte Wert
und der Grundwert gar nicht. Wer eine Karte nachträglich liest — ein Blatt,
eine Sammelzeile, eine Auffrischung —, hat die Definition nicht mehr zur
Hand: ein gestrichener Rekord steht gar nicht mehr im Katalog. Der `dataRef`
trägt deshalb `rekordId`, `rekordName`, `kammer` und `kammerLabel`, `fall`
(eine der fünf Wechselarten), `basis`, `halter` (alle neuen Halter),
`vorher` (alle alten), `wert` und `wertVorher`, `ev` und `evVorher`,
`cond`, `matchId`, `causalKey`, `fenster` und `laufbahn` (die
Punktewirkung); den Zeitpunkt trägt `when`. `tests/ambient` prüft das über
jeden vierten Spieltag der Ligageschichte.
**Vier Fälle, vier Aussagen** (`_halterFall`): **erstmals vergeben** (den
Rekord hatte vorher niemand), **übernommen** (der Halter wechselt), **jetzt
allein** (das Feld ist enger geworden) und **gleichgezogen** (jemand kommt
dazu) — dazu **ausgebaut**, wenn sich nur der Wert bewegt. Es war eine
Aussage für alles außer dem Ausbauen, und gemessen widersprachen sich vier
Karten der Ligageschichte: „Leon übernimmt ‚Der Aufschwung'. Vorher hielt
Leon, Jannik und Stefan den Rekord mit +8 %" — Leon übernahm von sich
selbst, und aus drei Namen wurde ein „hielt". Und „Martin und Leo übernehmen
‚Das Sonntagskind'. Vorher hielt Leo den Rekord mit 70 %" verkaufte Leos
Rückschritt auf 67 % als Übergabe, obwohl Leo den Rekord weiter hält. Der
Fall wird für Rekord und Monatschronik an EINER Stelle entschieden [§C27],
**genannt wird beim Dazukommen der Neue**, und als Vorgänger steht nur, wer
wirklich **weg** ist: aus {A,B} kann {A,C} werden, und dann war A sein
eigener Vorgänger.
Der Halter wird dafür **sortiert** verglichen, und eine Übernahme, deren
Vorgänger die heutigen Halter sind, verschwindet aus dem Feed: „Maxi, Leo
und Julian übernehmen" stand über „Vorher gehörte der Rekord Maxi, Julian
und Leo" — dieselben drei, nur anders sortiert. Der Generator bildet diese
ID nicht mehr, also kann `_newsTexteAuffrischen` sie auch nicht umschreiben;
die persistierte Karte bliebe sonst für immer stehen.
**Der große Wert heißt, was er ist.** Er kam aus einem Regex über den
Fließtext und trug immer die Aufschrift „Bestwert"; bei „Der Wandler"
stand damit „0 %" unter BESTWERT, obwohl die Zahl dort ein Unterschied
zwischen zwei Positionen ist und je kleiner desto besser. Wie die Zahl
heißt, sagt die Kammer des Katalogs [§C35] — ein Liga-Rekord ist ein
Bestwert, eine Fügung nicht.
Im Rekord-Blatt steht unter den **Verfolgern**, wer DAHINTER liegt — und
**wie weit** (`.nd-vf-b`). Die Liste nannte Rang, Name und Wert; ob der
Zweite knapp dran ist oder weit weg, musste man daraus ausrechnen, und bei
84 gegen 81 gegen 62 Prozent ist gerade das die Aussage. Der Balken zeigt den
Anteil am Bestwert und steht auf eigener Zeile: neben dem Namen ist die
Spalte so breit, wie der Wert daneben es übrig lässt, und damit war dieselbe
Prozentzahl in jeder Zeile eine andere Länge — gemessen trug der Vierte einen
längeren Balken als der Dritte. Wo der Sortierwert negativ ist (weniger
Gegentore ist besser), hat ein Anteil keine Bedeutung, und dann bleibt der
Balken weg.
**Und niemand davor.** Die Karte trägt den Wert, der bei ihrer Entstehung
galt — er steckt in ihrer ID —, die Liste rechnet heute. Zwischen beidem
können Partien liegen, und dann stand unter „Martin übernimmt ‚Der
Zerstörer' · 24 %" ein Verfolger mit 25 %: eine Karte, die sich selbst
widerspricht. Wer den Wert inzwischen überholt hat, steht nicht dahinter;
das Blatt nennt ihn als heutigen Halter. Teilen
sich drei den Rekord punktgleich, füllten genau diese drei die Liste, und
unter „wer sonst noch vorne steht" standen dieselben Namen mit derselben
Zahl, die der Kopf zwei Zeilen darüber schon nennt. Das
Ausbauen ist die schwächste davon und an eine
Bedingung geknüpft: gemeldet wird nur, wenn sich die **angezeigte** Zahl
ändert. Ein Anteil rückt an fast jedem Spieltag um ein Tausendstel weiter,
und das ergab neun Karten „X baut seinen Rekord aus" an einem Morgen, auf
denen dieselbe Zahl stand wie vorher. Echte Ausbauten werden nicht mehr vor
der Tafel-Bündelung abgeschnitten; derselbe Moment wird vollständig auf
einem Rahmen erzählt. Schattenseiten meldet der Feed gar nicht — die Liga
liest ihn gemeinsam.
Die Monatschronik ist EINE Karte je Monat, nicht eine je Eintrag; die drei
mit den meisten Einträgen bekommen ihr Gesicht. Dazu eine eigene Karte für
jeden, der **zum ersten Mal überhaupt** in der Chronik steht — der Moment,
den ein Spieler aus der unteren Hälfte sonst nie im Feed sieht.

**Breaking ist das Seltenste, nicht das Lauteste.** Erlaubt sind allein:
ein legendäres Badge, die längste Siegesserie aller Zeiten, der
Tabellenführer eines belastbaren Spieltags, der feststehende Meister, der
Schlusssprint einer Saison, der **erste** Aufstieg in die beiden
obersten Insignium-Stufen [§C30] und ein Karriereende [§C40]. **Entschieden wird es nach dem Bündeln**,
nicht davor: eine Sammelkarte erbt es von ihren Teilen (`_isBreaking`,
`sammel.breaking`), sonst verlöre ein Anlass seinen Rang, sobald er mit
seinem Moment reist.
**Drei Anlässe sind gefallen, jeder gemessen.** Ein **erstmals vergebener
Liga-Rekord**: in der Füllphase der Ewigen Tafel wird jeder Rekord zum
ersten Mal vergeben, und gemessen trugen elf der 18 Spieltage des Juni 2026
deshalb eine Breaking-Karte — immer dieselbe, den Tafel-Moment des Tages,
der es von einer seiner Zeilen erbte. Damit war Breaking die Regel. Der
**Elo-Bestwert** (`elo_record`): die Karte bildet der Generator nicht mehr,
der Bestwert steht als „Der höchste Gipfel" in der Tafel, aber
persistierte Zeilen trugen den Typ weiter und waren dieselbe Meldung
zweimal, einmal laut. Und eine **wieder getragene** obere Insignium-Stufe:
Prestige aus Rekorden wird geteilt und fällt wieder [§C34], dieselbe Stufe
kann mehrmals erreicht werden, und beim zweiten Mal bricht sie die Spalte
nicht mehr — `wieder` sagt, ob es das erste Mal ist.
**Die erste Tabelle eines Monats nennt den Stand ihres Tages**
(`season_start`). Die Karte steht an der Partie, die die Rangliste
freigibt, und rechnete ihren Text mit dem Stand von heute: am 04.08. stand
„Martin führt mit 390 Elo, 11 vor Leon. Gewertet sind 107 Partien" — die
Zahlen des 26.08., die mit jeder Partie weiterwuchsen. Gesucht wird jetzt
die erste Partie, nach der `_storyRangFrei` hält, und die Rangliste kommt
aus dem Elo-Stand der Elo-Bahn bis dorthin. Der Zeitpunkt stand dabei auf
der fünfzehnten Partie, auch wenn erst eine spätere genug Spieler brachte.
Dasselbe galt für jeden Satz mit „damit": „Martin zündet die 8er-Serie" um
10:56 nannte „134 Siege aus 211 Partien", die Zahl nach seiner letzten
Partie des Tages, und das Jubiläum „Aus 100 Partien sind … Siege geworden"
zählte die Siege der ganzen Laufbahn. Beide zählen bis zu ihrer Partie.
Der **Schlusssprint** ist dafür dazugekommen. „Noch fünf Tage" entstand an
jedem der letzten sieben Tage einer Saison, egal wie klar die Sache war:
gemessen stand die Karte auch bei 91 Elo Vorsprung da, und ihr Text
erklärte dann selbst, dass nichts mehr dazwischenkommt. Jetzt drei
Bedingungen — Frist, höchstens `SAISON_ENDSPURT_ELO` Abstand und eine
belastbare Rangliste —, und ihr Zeitstempel ist die letzte Partie statt
`now`, sonst stünde sie im Feed über dem Spieltag statt unter ihm.
Die Liste ist geschlossen: `tests/ambient` prüft jeden Anlass einzeln und
misst über die 19 Spieltage vom 28.07. bis 26.08., dass keine Karte des
fertigen Feeds Breaking trägt, deren Anlass nicht darauf steht. Gemessen
sind es dort zwei Karten und im Juni 2026 keine.
**Und sie veraltet am Abstand, nicht an der Siegzahl.** Der Stale-Filter
verglich die Siege im Fenster mit der Zahl von damals, und das Fenster der
letzten zehn Partien verschiebt sich schon im Lauf desselben Spieltags: die
Karte entsteht nach der vierten Partie mit 8 von 10, nach der siebten
stehen dort 7, und die eigene Karte von heute Mittag fiel als veraltet weg.
Gemessen am echten Vierzehn-Tage-Verlauf wurden acht Formkarten gebildet
und keine einzige gezeigt. Gefragt wird deshalb, was die Karte behauptet:
steht der Vorsprung auf den eigenen Schnitt noch (`_liveStreakForm().vor`)?
**Die Form-Karte misst den Abstand zum eigenen Schnitt, nicht das Niveau**
(`FORM_FENSTER`, `FORM_BASIS_MIN`, `FORM_VORSPRUNG`, §11.0b). „Neun von
zehn gewonnen" konnte nur holen, wer ohnehin die beste Quote hat: gemessen
nannte die Karte über die ganze Ligageschichte vier Spieler, einen davon
zehn der siebzehn Male. Verglichen werden jetzt die letzten zehn Partien
mit der Laufbahn DAVOR — dieselbe Frage, mit der die Monatschronik die
Mitte des Feldes erreicht [§C38] —, und dieselbe Schwelle trifft damit
sieben Spieler statt vier, darunter die untere Hälfte der Siegquote. Die
25 Prozentpunkte sind an den echten Partien geeicht: die Karte fällt 0,46
mal je Spieltag, bei 20 wären es 0,63 und bei 30 nur noch 0,25.

**Eine Karte über einen Spieler soll ihn belohnen.** „Henry gewinnt 39 %
seiner Spiele" stand als Nachricht da und sagte ihrem Helden, dass er
unterdurchschnittlich ist. Gesucht wird stattdessen die Kennzahl, in der
er am weitesten vorne steht, und genannt wird sein Platz darin. Aus
demselben Grund zieht die Duo-Karte aus dem vorderen Drittel: „Eingespielt:
Martin & Stefan" stand über einem Paar auf Platz 24 von 24.

**Eine Karte sagt, was zu tun ist.** „Jane liegt ‚Das Sonntagskind' am
nächsten" nannte weder, worum es geht, noch was dafür verlangt ist: darunter
stand allein „Leon hält den Bestwert". Wer ein Ziel zeigt, nennt die
Bedingung aus dem Katalog, den Stand des Halters, **den eigenen Stand** und
den Gewinn. Ohne den eigenen sagt die Karte nicht, wie weit es noch ist; er
wird durch denselben Beleg des Katalogs formatiert wie der Bestwert, weil
zwei Zahlen in zwei Einheiten nicht vergleichbar sind. Und der große Wert
ist der eigene Stand, nicht die Aussicht auf Prestige: eine Zahl, die
niemand geholt hat, stand im Goldrahmen einer gehaltenen Bestmarke [§C25].
Gefallen ist „Kein anderer ist gerade so nah dran" — die Karte stellt
diesen Vergleich nie an, sie zieht unter allen, die überhaupt einen offenen
Schritt haben.
**Und ein Ziel, das niemand haben will, ist kein Ziel.** „Alex kann ‚Die
bitterste Pleite' holen" stand im Feed: die höchste Siegchance, mit der je
jemand verlor, als Aufgabe. Gefiltert war nur die Schattenseite, nicht die
negative Fügung — `nextRecordFor` kennt die Regel seit jeher [§C25]. Der
Katalog schreibt sie als `negativ`, die abgeleitete Rekordliste als `neg`;
am falschen Feld geprüft ist die Zusicherung immer grün.

**Wer eine Bestmarke ausruft, nennt ihren Halter** (`chronicleRang`).
„Leon beherrscht die Wochen · 6× Spieler der Woche. Bestwert der Liga" stand
im Feed, und derselbe Bestwert gehörte im Rekorde-Reiter Julian: Leon hat 4
von 15 eigenen Wochen gewonnen, Julian 4 von 13. Die Karte zählte die Titel,
„Der Wochenherr" misst den Anteil — und die Anzahl gehört dem, der öfter
dabei war [§C35]. Dasselbe beim Spieler des Tages (Leon 17 von 54 Spieltagen,
Julian 12 von 23) und bei den Toren je Partie, wo drei Spieler still
gleichauf bei 8,7 lagen, während „Der Torjäger" Leon mit 8,9 je Sturmspiel
gehört. Drei Karten rechnen deshalb nicht mehr selbst, sondern lesen die
Reihenfolge des Rekords [§C27]; halten mehrere den Bestwert punktgleich,
stehen alle da. Die Zählung lebt daneben als eigene Karte weiter, ohne den
Satz „Bestwert der Liga" — eine Sammlung ist keine Bestmarke. Seit die
Rekorde auf Spieltage, Wochen und Tore als Doppel der Siegquote gefallen
sind [§C35], nennen die drei Karten die Halter von „Der Glanztag", „Der
Umsteiger" und „Der Aufschwung": Bestmarken gegen das Eigene, die nicht
automatisch dem gehören, der am meisten gewinnt.
`tests/ambient` prüft den genannten Spieler, nicht den Wortlaut.

**Jede Ambient-Vorlage wird im Rundlauf gemessen, nicht einzeln.** Sie
stehen an vierzig Stellen und gingen deshalb einzeln kaputt: „vor -1 Tagen"
(der Fun Fact von 10 Uhr entsteht vor der ersten Partie, sah aber die ganze
Liste), „7 trägt den Schildring", ein leerer Wertblock, „1 Platz" als Anzahl
statt als Rang, ein Anteil, der dem Spieler gehörte und der Liga
zugeschrieben war, und ein großer Wert, der den Katalog zählte, während die
Schlagzeile von einer Führung erzählte. `tests/ambient` läuft jede Vorlage
an mehreren Uhrzeiten und mit mehreren Würfeln ab — darunter der Vormittag
jedes Spieltags der letzten Wochen, weil der Blick in die Zukunft nur dort
zu treffen ist — und prüft sechs Dinge: einen gefüllten großen Wert, das
Komma in jeder Dezimalzahl [§C27], keine negative Anzahl, kein „&" im Satz,
das Verb im Plural nach einer Mehrzahl und einen großen Wert, der sich mit
seinem Titel bewegt.

**Die Aufschrift des großen Werts sagt, was die Zahl zählt** — nicht, wem sie
gehört, und sie ist keine Konstante. Unter dem Chronik-Rampenlicht stand
„1 Rekordhalter": die Eins gilt für jeden Rekord und sagt damit nichts, und
„Rekordhalter" beschreibt den Träger statt die Zahl. Dieselbe Vorlage trug
gemessen fünfundzwanzig verschiedene Titel und immer denselben Wert. Im
Rennen um die laufende Tafel stand „1 in Führung", also wieder der Träger,
und darunter im Satz noch ein zweites Mal dieselbe Zahl. Jetzt trägt das
Rampenlicht den Wert der Bestmarke mit dem Namen seiner Kammer
(`CHRON_KINDS`, dieselbe Quelle wie `_newsWertBlock` [§C27]) und das Rennen
die Zahl der offenen Einträge. Der Beleg eines Liga-Rekords beginnt
garantiert mit dem Sortierwert [§C35], `_chronKurz` trifft dort also das
Richtige; ein **Monatsbeleg** tut das nicht — „Der makellose Tag" belegt
seinen Anteil mit „1 von 4 Spieltagen ohne Niederlage", und die erste Zahl
ist dort die Anzahl.

**Und das Rampenlicht zeigt keine Schattenseite.** Der Topf lief über alle
vergebenen Rekorde, zwölf davon negativ, und die Auswahl hängt am
Kalendertag: an jedem fünften Tag stand „Alex hält ‚Das Scheunentor'" als
Fun Fact im Feed, obwohl der Feed die Schandtafel gar nicht meldet [§C35].

**Was zwei Leute miteinander zu tun haben, sagt der Story-Typ** und nicht die
Kartenform (`_ndBeziehung`). Unter zwei Wappen stand „als Duo", sobald eine
Karte genau zwei Leute zeigte: bei „Martin schlägt Leo im Spitzenspiel"
standen sich die beiden gegenüber, bei „Johannes und Stefan bewegen die
Ewige Tafel" holte jeder einen eigenen Rekord. Ein Duo sind nur die beiden
Duo-Serien; alles andere nennt seine eigene Beziehung.
Auf dem Blatt einer Partie stand „in derselben Partie" unter ihren Siegern
— auf dem Blatt, das diese Partie ist —, auf der Karte einer Partie „im
selben Moment". Dort steht jetzt „gewinnen diese Partie" und „in dieser
Partie". Und die Wochenkarte nannte „20 an 4 Tagen" als Zeile direkt unter
ihrem Satz „20 Spiele an 4 Tagen": verglichen wurde nur die kurze Form.

**Das Blatt einer Serie zeigt ihre Partien** (`_ndSerieBlatt`,
`_ndPartieListe`). Es zeigte die Serie als Band, darunter die letzten zehn
als Punktreihe und Zahlen in Zeilen („Gemeinsame Bilanz bis hierher",
„Tore 411:564"), und welche Partien die Serie waren, stand nirgends. Die
Bühne trägt jetzt Gesicht, die Zahl groß, den Lauf und den Zeitraum — beim
Duo zwei Chips, ein Duo hat kein Wappen —, und darunter steht jede Partie
des Laufs mit Partner, Stand aus Sicht des Trägers und Gegnern; der Tag
steht nur an der ersten Partie des Tages. Dazu, wo es etwas sagt: bei der
Siegesserie der Lauf gegen eigenen Bestwert und Liga-Rekord VOR der Serie,
bei einem Einzelnen die Partner (erst, wenn einer öfter dabei war: lauter
„1×" sagen nichts), bei einem Duo die Siegquote zusammen und mit anderen,
und die nächste Partie danach. Der Serienbruch trägt die gerissene Serie
als Bühne, ihre Partien samt der, die sie beendet, und die Bilanz der
Brecher gegen den Träger. Alles endet an der Partie der Karte: eine Marke
bleibt nach dem Riss stehen, und ihr Blatt zählt nicht bis heute. Dieselbe
Regel gilt für jede Bilanz im Blatt (`_ndBisPartie`, `_ndBilanzBis`): das
Jubiläum „100 Spiele" nannte darunter die Bilanz von heute („152 Siege /
Niederlagen" zusammen) und der Meilenstein „221W · 134L".

**Das Blatt einer Rivalität zeigt, wie es zur Bilanz kam**
(`_ndRivalBlatt`). Es zeigte zwei Gesichter mit „55 Siege" darunter und das
Jubiläumsduell als Band. Die Bühne trägt jetzt beide Wappen, die Zahl der
Duelle und die Bilanz als Tauziehen; darunter die Partie der Karte, der
Verlauf als Linie um die Null, die letzten dreißig als Lauf und die
deutlichste auf jeder Seite. Gezählt wird bis zur Partie der Karte.
**Das Blatt einer Auszeichnung zeigt ihre Träger als Feld**
(`_ndBadgeBlatt`): das Medaillon mit den Gesichtern als Bühne, die Partie,
in der sie geholt wurde, und jeder Spieler der Liga als Feld, hell, wer sie
trägt, gerahmt, wer sie hier geholt hat. „Elo aus dieser Partie" stand dort
und hatte mit der Auszeichnung nichts zu tun, und „5 von 12 tragen sie" als
Satz im Medaillon sagt das Feld. Die Blätter mit eigener Bühne stehen in
einer Tabelle (`_ND_BLATT`), Kopf und Mitte kommen aus einem Aufruf.

**Die Spitze kann an einem Tag mehrmals wechseln.** Das Blatt des
Titelrennens zeigte nur den Stand am Ende des Tages, und wer es öffnete,
erfuhr nicht, dass die Tabelle zwischendurch schon einmal jemand anderem
gehörte — die Karte nennt die Zahl der Wechsel im Satz, das Blatt zeigte
denselben zweien noch einmal. Es zeigt jetzt jeden Wechsel mit Uhrzeit,
Ergebnis, Nachfolger und Vorgänger, gebaut aus denselben Ereignissen
(`events`), aus denen die Karte entsteht [§11.0e], und in `rcpZeileHtml` —
dem Bauteil, das die App schon hat [§C27]. Bei genau einem Wechsel bleiben
die Zeilen weg: er steht im Kopf schon.
**Die Schlagzeile sagt den Vorgang, nicht das Ergebnis.** Sie hieß „Stefan
und Julian gewinnen 10:7. Martin führt die Tabelle" — zwei Sätze in einer
Überschrift, und der erste davon steht eine Zeile höher als Band. Übrig
bleibt „X übernimmt die Tabellenspitze", und wer am selben Tag abgab und
wiederkam, „holt die Tabellenspitze zurück". Der Satz darunter nennt Stand,
Vorsprung, Vorgänger und, ab zwei Wechseln, ihre Zahl — die Partie zeigt
das Band.
**Und der Vorgänger ist der DIREKTE Vorgänger.** Genannt war, wer am Morgen
oben stand. Wechselte die Spitze von A zu B und zurück zu A, war A damit
sein eigener Vorgänger: das Blatt stellte denselben Spieler als „neuer #1"
und „vorher #1" gegenüber, und der Breaking-Nachsatz schrieb „A verdrängt
A". Der Vorgänger des letzten Wechsels ist nie der neue Erste — ein Wechsel
hat zwei verschiedene Seiten. Der Nachsatz nennt dazu eine Zahl: „Machtwechsel
an der Tabellenspitze: … Das Titelrennen ist wieder völlig offen" war ein
Etikett mit Doppelpunkt am Satzanfang, nannte keine und behauptete eine
offene Lage, die bei 91 Elo Vorsprung nicht stimmt.

**Das Blatt erklärt nicht die App.** Unter dem Spieler des Tages stand
„Gewertet wird der Spieltag ab drei Partien. Die Karte kommt um 23:59, wenn
keine Partie mehr dazukommen kann", unter einer Insignium-Stufe „deshalb ist
diese Karte Breaking [§C30]". Das ist die Bauanleitung des Feeds samt
Paragraph, nicht die Nachricht. Wer ein Blatt öffnet, will wissen, was
passiert ist.

**Die Wochenkarte zeigt alle sechs Wertungen**, jede mit ihrem **Zeichen** und
der Sieger mit seinem **Wappen**. Sie trug sechs Zeilen Text und kein einziges
Gesicht, und vor dem Lesen war nicht zu sehen, welche der sechs der Spieler
der Woche ist. Gold trägt dabei nur er, die übrigen fünf sind Metall [§C25].
Das Team der Woche steht direkt unter dem Spieler der Woche. Sie zeigte drei und darunter „und 3
weitere Wertungen": die Überraschung, der Krimi und das Team der Woche kamen
auf der Karte gar nicht vor, obwohl sie einmal je Woche erscheint und für
nichts anderes da ist. Die Reihenfolge ist die Wertigkeit, nicht die, in der
die sechs Blöcke im Generator stehen — das Team entstand als letztes und
stand damit auch als letztes. **Im Blatt** steht jede Wertung als Zeile aus
Gesicht, Name, Wertung und Zahl, der Spieler der Woche in Gold; der Satz
darunter („Julian hat in dieser Woche 101 Elo gutgemacht. Das ist der
größte Anstieg der Liga.") sagte Zahl und Wertung daneben ein zweites Mal,
und die Namen standen als Pillen ohne Gesicht.
**Das Blatt des Spielers des Tages** (`_ndPotdBlatt`) trägt Krone, Wappen
und die Elo des Tages als Kurve auf der Bühne, darunter das Feld des Tages —
jeder, der gespielt hat, mit Siegen von Partien — und die Bahn. Zwei Kacheln
„67 %" und „6 : 3" sagten, was der Satz darüber nennt. **Der Endspurt**
(`_ndEndspurtBlatt`) zeigt die verbleibenden Tage als Ring, die beiden oben
mit Wappen und den Abstand als Balken, darunter den Abstand Tag für Tag; dort
standen zwei Buchstaben-Kreise und „Verbleibend 6 Tage" als Zeile.

**Kein Listentrenner im Fließtext** (`_evSatz`). Ein Beleg wie „20 % aller
25 Siege endeten 10:9 · 5" ist für eine Zelle gebaut: der Mittelpunkt trennt
dort zwei Spalten. Mitten in einem Satz steht er wie ein Tippfehler, und
danach ging es klein weiter — „… gewonnen · 9. sonst hält ihn niemand."
Neun der fünfunddreißig Belege endeten außerdem auf einer blanken Zahl, die
nicht sagte, was sie zählt.

**Wo ein Rückblick existiert, führt die Karte hin.** `showPotwRecap` und
`showPotdRecap` sind gebaut und öffnen sich am richtigen Tag von selbst —
vom Feed aus gab es keinen Weg dorthin, und wer die Karte drei Tage später
las, kam an die Auswertung nicht mehr heran. Spieler der Woche, Spieler
des Tages und Team der Woche tragen deshalb einen gefüllten Knopf im Blatt
(`_newsRueckblickKnopf`: „Rückblick auf den Tag", „Rückblick auf die
Woche"), und er öffnet den Rückblick auf DEN Tag und DIE Woche der Karte
(`showPotdRecap({tag})`, `showPotwRecap({woche})`), nicht auf den letzten:
eine Karte von vorletzter Woche zeigte sonst die Auswertung von gestern.
Das **Team der Woche** rechnet mit `teamStatsFromMatches` — derselben
Funktion, aus der auch der Teams-Tab seine Zahlen zieht [§C27]. Es gab
Team-SERIEN und ein Team der Saison, aber nichts dazwischen. Für den TAG
gibt es bewusst keins: eine Duo-Karte an jedem Spieltag wäre die
Wiederholung, die §C33 gerade verhindert.
`tests/ambient` misst das alles.

**Die Ehrung braucht keinen Satz.** Unter den Säulen standen Schlagzeile,
ein Satz, der die wertvollste Auszeichnung nannte („Henry holt dabei
‚Serienbrecher‘ zum 6. Mal."), und ein Fuß mit jeder Klasse und ihrem
Prestige. Das Bild zeigt die Geehrten, ihre wertvollste Auszeichnung als
Zeichenkachel und ihr Prestige; der Text darunter erklärte es ein zweites
Mal und machte die Karte zwei Zeilen höher. Die Karte trägt jetzt nur
Bild und Schlagzeile, wie die Insignium-Karte; Satz und Klassen stehen im
Blatt. Eine Zeile kam danach dazu, weil sie fehlte: die Karte trug nur die
Uhrzeit, zu der sie entsteht — zwei Stunden nach der letzten Partie —, und
neben „18:04" las sich eine Runde von 13:44 bis 15:55 wie eine Ehrung für
den Abend. Woher die Auszeichnungen stammen, stand nur im Blatt. Die erste
Zeile darunter, „Partien vom 06.10., 15:12 bis 08.10., 15:10", sagte nicht,
wozu die Zahlen gehören: vier Ziffern mit Doppelpunkt hinter einem Datum
lasen sich auch als Ergebnis, und neben der Uhr im Kopf stand eine zweite
Uhr mit einer anderen Bedeutung. Jetzt sagt die Zeile oben, was der
Zeitraum bedeutet, hinter jeder Uhrzeit steht „Uhr", und die zweite Uhr ist
weg. Mit „Uhr" nur am Ende stand „vom 19.10., 17:17 bis gestern, 16:04 Uhr"
da, und die erste Zahl war wieder keine Uhrzeit. Als ein Satz in einer Zeile passte das nicht in die Karte (neben dem
Bild 219 px bei 360 px), deshalb stehen die beiden Teile untereinander.

**Stille Auszeichnungen.** Was ohne Partie entsteht — der Spieler des Tages,
der Woche, der Award-Sammler, Allwetter, Tag der Götter, Untouchable — hatte
keine Karte, und zwei Dinge sahen es nicht: die Ehrung sammelt, was an
Partien hängt, und die Zähler fragten die Uhr statt den Schnitt. Der Stand
eine Millisekunde vor dem Schluss einer Woche trug den Spieler der Woche
schon, sobald die Woche heute vorbei war, und die Karte des letzten Spieltags
verglich mit „jetzt" und trug ihn mit. Gemessen an den echten Partien kam der
Award-Sammler, legendär, am 03.08. für Julian und stand nur im Rückblick der
Woche; derselbe Schluss hob Julian um einen Grad, und keine Karte sagte es.
Unschlagbar dagegen stand zweimal, um 23:57 als eigene Karte und Tage später
in der Ehrung, und mit der neuen Zeile im Spieler des Tages wäre es dreimal
gewesen. Danach nannte der Schluss Seltenes und Legendäres als Zeile in der
Karte, die es ohnehin gab, und eine Zeichen-Karte entstand nur, wo sich das
Zeichen ohne Partie bewegt hatte. Das ließ die Hälfte stehen: Meister, Vize
und Team der Saison standen auf dem Podest des Rückblicks, aber nirgends als
Auszeichnung mit ihrem Wert, der Spieler des Tages und der Woche auch nicht,
und das Gewöhnliche des Tages (Comeback-Tag) kam Tage später in der Ehrung
einer Runde an. Nach dem Oktober sagte keine Karte, dass Maxi Team der
Saison und Julian Vize-Meister geworden war. Danach hatte jeder Schluss
eine Ehrung dessen, was seine letzte Millisekunde vergab, eine Minute neben
der Karte des Schlusses. Das passte zu keinem Zeitraum: die Ehrung des Tages
stand direkt neben dem Spieler des Tages und nannte ihn ein zweites Mal; die
des Oktobers nannte unter „Geholt im Oktober 2026" vier Auszeichnungen neben
einem Rückblick, der 256 zählte, und stand um 00:01 über ihm statt darunter;
die der Woche stand um 23:57:30 unter dem Spieler des Sonntags statt unter
der Wochenkarte. Jetzt gehört der Tag zur Karte seines Spielers des Tages,
und Woche und Monat nennen alles, was im Zeitraum geholt wurde, direkt unter
ihrer Karte. Bei gleicher Zeit entschied vorher, in welcher Reihenfolge
Bestand und Realtime die Zeilen lasen, welche oben stand. Die gespeicherten
Ehrungen eines Tages abzumelden hätte sie ganz aus dem Feed genommen: ihr
Spieler des Tages ist älter als sie und trägt keine.

**Eine Karte für den Tag, und die größere Ehrung gewinnt.** Danach stand
an einem Spieltag eine Ehrung je Runde, zwei Stunden nach ihrer letzten
Partie, und um 23:59 der Spieler des Tages mit dem, was der Schluss vergab:
bis zu vier Karten über denselben Tag, jede mit einem Teil davon. Jetzt
trägt der Spieler des Tages alles, was der Tag brachte, und ohne ihn steht
eine Karte des Tages mit dem härtesten Tag darunter. Die Ehrung der Woche
mit Säulen und Namen war höher als ein Bildschirm, 61 Auszeichnungen für
sieben Spieler in zwei Reihen Wappen, und überschattete die Wochenkarte
darüber; mit einer Reihe Gesichtern, eigener Balkenzeile und Summe waren
es noch 233 px, jetzt 187. Endete mit einem Spieltag eine Woche oder ein
Monat, standen um Mitternacht bis zu drei Ehrungen untereinander, die
kleinere ganz in der größeren; jetzt steht die größte. Dabei fiel auf, dass
die Woche ab Mitternacht ihres Montags zählte: um 00:00 schließt dort die
Woche davor, und deren Spieler der Woche stand ein zweites Mal da — am
19.10. „Spieler der Woche ×2“ für Leon, einmal für die Woche davor. Die
gespeicherte Ehrung dieser Woche trägt das weiter; eine Zeile ändert sich
nicht.

**Eine Auszeichnung führt zu sich.** In der Ehrung der Woche stand „Player
of the Week“ als Zeile, und ein Tippen darauf öffnete nichts oder, auf dem
Gesicht daneben, das Profil, wo die Auszeichnung zwischen sechzig anderen
steht. Die Detailansicht ging nur aus dem Profil auf, und aus einer Story
geöffnet läge sie dahinter: sie stand auf Ebene 120, die Story auf 140.
Jetzt öffnet jede Auszeichnung in einem Blatt ihre Detailansicht darüber.
Für eine Auszeichnung ohne Partie stand dort „Diese Auszeichnung wird über
Saison-/Karriere-Daten ermittelt und ist nicht an ein einzelnes Match
gebunden“: ein Satz über die App statt über den Spieler. Jetzt stehen dort
die Wochen, für die er Spieler der Woche war, und jede öffnet ihren
Rückblick. Die Klasse hieß dort „Rare“, im Blatt darunter „Selten“.

**Breaking einmal, und mit Grund.** Der gespeicherte Spieler des Tages vom
28.10. trug kein `ehrungBrk`, und beim Anzeigen kamen die Ehrungen seines
Tages zu ihm. Gemessen wurde er an jeder legendären Auszeichnung darin, und
„Absoluter Sieger" aus der Partie um 16:11 machte ihn um 23:59 ein zweites
Mal zum Breaking — dieselbe Nachricht wie die Partie-Karte. Jetzt fragt er
den Schluss seines Tages. Die Ehrung der Woche war mit dem Award-Sammler
Breaking, zeigte es aber nicht: ihre Karte hatte keinen Balken, und keine
Karte sagte, welche Auszeichnung sie zum Breaking machte.
