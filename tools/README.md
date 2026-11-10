# Werkzeuge

Alle laufen mit Node ohne Abhängigkeiten; die mit Browser nehmen den
vorhandenen Chromium (`tests/browser.js`).

| Werkzeug | Aufruf | wofür |
|---|---|---|
| `build.mjs` | `node tools/build.mjs` | hängt `src/css/*` und `src/js/*` in der Reihenfolge ihrer Präfixe ins Gerüst `src/index.html`, entfernt die Kommentare, vergibt die Version als Hash über den Inhalt und schreibt `dist/index.html` und den Service Worker `dist/sw.js` mit derselben Fassung |
| `check.mjs` | `node tools/check.mjs` | die acht Wächter aus CLAUDE.md §4; jede rote Zeile nennt, was zu tun ist |
| `doku.mjs` | `node tools/doku.mjs` | erzeugt `docs/README.md` und `docs/anker.md` aus den Dateien; Wächter 8 vergleicht |
| `golden.mjs` | `node tools/golden.mjs [--basis=<rev>] [--schnell] [--bilder]` | vergleicht den Bau mit einem früheren Stand: jede Rechnung, jede Ansicht, jede Story, das CSS, die Schreibzugriffe. Für jeden Umbau, der nichts ändern soll (`tests/README.md`) |
| `performance.cjs` | `node tools/performance.cjs [--profil] [--cpu=4] [--mobil] [--ruhe]` | misst kaltes und warmes Rendern mit den echten Partien, mit `--ruhe` allein die Arbeit je Sekunde, während eine Ansicht nur offen steht; liefert `createHarness`, das Gerüst für Chromium, das `golden.mjs` wiederverwendet (`docs/leistung.md`) |
| `interaktion.cjs` | `node tools/interaktion.cjs --cpu=4` | misst Tippen, Suchen, Reiterwechsel und Blattzug |
