/* ════════════════════════════════════════════════════════════════════════════
 *  JAVASCRIPT DER LIGA
 *  Alle Dateien in src/js/ werden zu EINER IIFE zusammengehängt, in der
 *  Reihenfolge ihrer Präfixe, und teilen einen Gültigkeitsbereich: kein
 *  import, kein export, nichts auf window. Ein Name auf oberster Ebene darf
 *  es nur einmal geben (Wächter 4).
 *
 *  Wo was liegt:  CLAUDE.md §3 — die Landkarte, von Wächter 6 geprüft.
 *  Abschnitte:    docs/anker.md — jede Datei mit ihren §-Bannern, erzeugt.
 *  Warum:         docs/gesetze/ — die Gesetze, die der Code mit §Cnn zitiert.
 *  Mitziehen:     docs/erweitern.md — was bei einer neuen Auszeichnung,
 *                 Disziplin oder einem Rekord an welcher Stelle mitgeht.
 *
 *  Die Nummern der §-Anker sind gewachsen und folgen nicht der
 *  Ladereihenfolge (§11 lädt vor §13, §10.4 ganz zuletzt); maßgeblich ist
 *  der Dateiname. Ein neuer Abschnitt bekommt ein Banner der Form
 *      // ─── §N.M Name ───────────────
 *  mit einer Nummer, die es noch nicht gibt (Wächter 7 prüft das).
 * ════════════════════════════════════════════════════════════════════════════ */

// ╔═══ §0.1 ────────────────────────────────────────────────────────────────╗
//     ZUGANGSDATEN
// ╚═════════════════════════════════════════════════════════════════════════╝
const SUPABASE_URL = "https://unfljrllxtplrmbzidwd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZmxqcmxseHRwbHJtYnppZHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMjY2OTQsImV4cCI6MjEwOTkwMjY5NH0.UyU1e53H5qhubKn70eYVsY7Guj-WAVnAMYTpcSBMiKQ";
// ════════════════════════════════════════════════════════════

(function(){
"use strict";
if(SUPABASE_URL.startsWith("HIER")||SUPABASE_KEY.startsWith("HIER")){
  // Die Oberfläche steht schon im ersten Bild [§C43]; ohne Zugangsdaten
  // gibt es keine Liga darin, nur den Hinweis.
  document.getElementById('app').style.display='none';
  document.getElementById('setupGate').style.display='block'; return;
}
document.getElementById('app').style.display='block';
document.getElementById('botnav').style.display='flex';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

