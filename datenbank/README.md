# Datenbank

SQL, das der Betreiber selbst im Supabase-Editor ausführt. Die App ändert
kein Schema: sie liest und schreibt nur Zeilen, und eine fehlende Spalte
sagt der Knopf, der sie braucht, statt sie anzulegen.

| Datei | legt an | gebraucht von |
|---|---|---|
| `karriereende.sql` | `players.retired_at` und `players.retired_stand` | Karriereende [§C40], `06b-ruhestand.js` |
