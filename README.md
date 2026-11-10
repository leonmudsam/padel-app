# Kicker-Liga

Eine App für eine 2-gegen-2-Tischkicker-Liga: Elo, Saisons, Auszeichnungen,
Liga-Rekorde, Monatschronik, Insignien und ein Nachrichten-Feed. Ausgeliefert
wird eine einzige Datei, `index.html`, über GitHub Pages; die Daten liegen in
Supabase.

## Bauen und prüfen

```
node tools/build.mjs            # src/ → dist/index.html
cp dist/index.html dist/sw.js .  # die ausgelieferten Dateien, mitversioniert
node tools/check.mjs            # acht Wächter
node tests/run.mjs              # zwanzig Suiten (dreizehn brauchen Chromium)
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
| [mockup/README.md](mockup/README.md) | Entwürfe und was davon eingebaut ist |
| [datenbank/README.md](datenbank/README.md) | SQL, das der Betreiber selbst ausführt |
