// Die Testliga, wie die App sie aus der Datenbank bekäme. Eine Stelle für
// alle Suiten und Werkzeuge: vorher entpackte jede Suite ihre Fixture mit
// einer eigenen Kopie des Parsers.
//
//   ladeLiga()          die Hauptliga (tests/fixtures/liga.json)
//   ladeLiga('liga2')   eine zweite, kleinere Liga für Kalibrierproben
//
// Jeder Aufruf gibt frische Objekte zurück: eine Suite, die Matches
// verändert, verdirbt sie keiner anderen. Erzeugt wird die Datei mit
// `node tools/fixture-padel.mjs`.
const fs = require('fs');
const path = require('path');

function ladeLiga(name = 'liga'){
  const roh = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json'), 'utf8'));
  const players = roh.players.map(p => ({...p}));
  const matches = roh.matches.map(m => ({...m, sets: m.sets.map(s => s.slice()), set_kind: m.set_kind.slice(), deltas: {}}));
  const monate = [...new Set(matches.map(m => m.created_at.slice(0, 7)))].sort();
  const seasons = monate.map(id => {
    const [y, mo] = id.split('-').map(Number);
    const ende = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return {id, start_date: id + '-01', end_date: id + '-' + String(ende).padStart(2, '0')};
  });
  return {players, matches, seasons, ids: players.map(p => p.id), names: players.map(p => p.name)};
}

module.exports = { ladeLiga };
