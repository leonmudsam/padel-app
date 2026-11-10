-- Das Karriereende eines Spielers [§C40 in CLAUDE.md].
--
-- Einmal im Supabase-Dashboard ausführen (SQL Editor). Beide Befehle sind
-- wiederholbar: wer die erste Fassung schon ausgeführt hat, führt die Datei
-- einfach noch einmal aus, und es kommt nur die zweite Spalte dazu.
--
-- retired_at     Der Zeitpunkt des Karriereendes. „Karriere beenden"
--                schreibt ihn, „Karriere fortsetzen" setzt ihn auf NULL.
-- retired_stand  Der Stand des Profils, in zwei Teilen: beim Klick die
--                Rekorde, die Rangstufe und der Prestige-Platz, nach dem
--                Ende seiner letzten Woche und seines letzten Monats die
--                Auszeichnungen, das Prestige und der Fingerabdruck. Damit
--                sieht das Profil eines Ruheständlers in zwei Jahren aus wie
--                an seinem Abschluss, auch wenn die App inzwischen neue
--                Rekorde oder Auszeichnungen kennt. Die App schreibt ihn und
--                leert ihn bei der Rückkehr.
--
-- Fehlt eine der Spalten, meldet der Knopf das und ändert nichts.
-- Bestehende Daten bleiben unberührt: beide Spalten sind für alle Spieler
-- leer.

alter table public.players
  add column if not exists retired_at timestamptz;

alter table public.players
  add column if not exists retired_stand jsonb;
