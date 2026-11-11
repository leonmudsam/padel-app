# Padel Liga

Eine App für eine Padel-Gruppe, immer zwei gegen zwei: Elo, Saisons,
Auszeichnungen, Liga-Rekorde, Monatschronik, Insignien und ein
Nachrichten-Feed. Eingetragen wird einmal nach der Partie, Satz für Satz in Games. Jede
Spielweise geht: ein Satz und Teamwechsel, zwei oder drei Sätze, Match-
Tiebreak, kurze Sätze oder ein Satz, der nicht zu Ende kam. Ausgeliefert wird
eine einzige Datei, `index.html`, über GitHub Pages; die Daten liegen in
Supabase.

## Einrichten

1. `datenbank/schema.sql` einmal im Supabase-SQL-Editor des Projekts
   ausführen (Tabellen, Zugriff, Realtime).
2. GitHub → Settings → Pages → Source „GitHub Actions". Danach veröffentlicht
   jeder Push auf `main` von selbst.
3. In der App über „Spieler hinzufügen" die Gruppe anlegen, dann über den
   Plus-Knopf die erste Partie eintragen.

## Bauen und prüfen

```
node tools/build.mjs            # src/ → dist/index.html
cp dist/index.html dist/sw.js .  # die ausgelieferten Dateien, mitversioniert
node tools/check.mjs            # acht Wächter
node tests/run.mjs              # sieben Suiten (zwei brauchen Chromium)
node tools/rauchtest.cjs        # jede Ansicht mit der Testliga zeichnen
```

`index.html` und `sw.js` sind Bauergebnisse und werden nie von Hand bearbeitet. Der
Prüf-Job in `.github/workflows/pages.yml` führt dieselben Schritte aus.

## Wo was steht

| Datei | wofür |
|---|---|
| [CLAUDE.md](CLAUDE.md) | die Arbeitsanweisung: Bauablauf, Aufbau, Landkarte der Dateien, Wächter, Regeln |
| [docs/README.md](docs/README.md) | Inhaltsverzeichnis der Doku, erzeugt |
| [docs/architektur.md](docs/architektur.md) | warum die App so gebaut ist |
| [docs/anker.md](docs/anker.md) | jede Code-Datei mit ihren Abschnitten, erzeugt |
| [docs/gesetze/](docs/gesetze/) | die Gestaltungsgesetze, die der Code mit `§Cnn` zitiert |
| [docs/erweitern.md](docs/erweitern.md) | was mitgeht, wenn eine Auszeichnung, Disziplin oder ein Rekord dazukommt |
| [tests/README.md](tests/README.md) | die Suiten und der Vergleich zweier Fassungen |
| [tools/README.md](tools/README.md) | die Werkzeuge |
| [datenbank/README.md](datenbank/README.md) | SQL, das der Betreiber selbst ausführt |
