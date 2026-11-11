# Datenbank

SQL, das der Betreiber selbst im Supabase-Editor ausführt. Die App ändert
kein Schema: sie liest und schreibt nur Zeilen, und eine fehlende Spalte
sagt der Knopf, der sie braucht, statt sie anzulegen. Die App spricht nur
mit dem öffentlichen anon-Schlüssel; der service_role-Schlüssel gehört nie
in den Code.

| Datei | legt an | gebraucht von |
|---|---|---|
| `schema.sql` | alle Tabellen (`players`, `matches`, `config`, `seasons`, `stories`), die Zugriffsregeln und Realtime für `stories` | die ganze App |
| `karriereende.sql` | `players.retired_at` und `players.retired_stand` (in `schema.sql` schon enthalten) | Karriereende [§C40], `06b-ruhestand.js` |
