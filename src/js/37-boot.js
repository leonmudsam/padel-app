// ╔═══ §10.4 ─── BOOT (Initialisierung) ────────────────────────────────╗
// Im Hintergrund wird nicht geladen. `loadAll` holt ALLE Spieler, ALLE
// Partien, die Konfiguration und die Saisons — bei fünfhundert Partien ist
// das jedes Mal ein sechsstelliger Betrag an Bytes, und das alle dreißig
// Sekunden auch dann, wenn das Telefon in der Tasche steckt. Ein PWA-Symbol
// bleibt tagelang offen; das ist Mobilfunk und Akku für nichts.
// Dafür wird beim Zurückkommen SOFORT geholt: wer die App wieder ansieht,
// will den Stand von jetzt, nicht den in bis zu dreißig Sekunden.
// Dieselbe Regel befolgt der News-Autosync schon [§11.9].
function _tickDaten(){
  if(document.hidden) return;
  // Ein offenes Blatt und der Eingabe-Tab werden nicht unter den Fingern
  // neu gezeichnet — diese Bedingung stand schon immer im Takt.
  if(document.getElementById('sheet').classList.contains('show')) return;
  // Auch ein Regler oder Passwort-/Konfigurationsfeld bleibt unter dem
  // Finger stehen; explizites Speichern lädt weiterhin unmittelbar nach.
  if(tab === 'match' || tab === 'settings') return;
  loadAll({nachladen:false});
}
function _tickVersion(){ if(!document.hidden) checkForUpdate(); }

// Die Oberfläche steht schon (src/index.html); ab hier wartet sie auf das
// erste Bild der Liga, höchstens 2,5 s, dann steht das Gerüst [§C43].
_startBereit();
loadAll();
checkForUpdate();
// Der Service Worker hält Seite, Schriften und Supabase-Bibliothek auf dem
// Gerät [§C42]. Nur über https oder auf dem eigenen Rechner: anderswo lässt
// der Browser ihn nicht zu, und im Worker des Generators gibt es ihn nicht.
if(typeof navigator !== 'undefined' && navigator.serviceWorker && typeof location !== 'undefined'
   && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')){
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
setInterval(_tickVersion, 5*60*1000);
setInterval(_tickDaten, 30000);
document.addEventListener('visibilitychange', () => {
  if(document.hidden) return;
  _tickDaten();
  _tickVersion();
});
})();
