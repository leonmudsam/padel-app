#!/usr/bin/env node
/*
 *  Erzeugt die Testliga: eine Padel-Gruppe, wie sie wirklich spielt.
 *
 *    node tools/fixture-padel.mjs          → tests/fixtures/liga.json, liga2.json
 *
 *  Es gibt noch keine echten Matches, an denen die Schwellen der App geeicht
 *  werden könnten. Bis dahin steht hier eine nachgebaute Liga mit festem
 *  Startwert — jeder Lauf ergibt dieselbe Datei, damit die Tests stabil
 *  bleiben. Was sie nachbildet, kommt von der Gruppe selbst:
 *    · rund fünf Padel-Tage im Monat, je Tag meist drei bis fünf Matches
 *    · je nach Tag ein anderes Format: nur ein Satz und dann Teamwechsel
 *      (1:0), zwei oder drei Sätze mit Match-Tiebreak, oder lange Sessions,
 *      in denen alle Sätze gespielt werden (auch 3:0)
 *    · Sätze bis 6, Tiebreak bei 6:6; ab und zu ist die Zeit um, bevor ein
 *      Satz zu Ende ist
 *    · vier Spieler an den meisten Tagen, manchmal sechs oder acht
 *  Sobald es echte Matches gibt, werden die Schwellen an ihnen nachgeeicht
 *  (docs/erweitern.md §10.3), und diese Datei bleibt für die Tests.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Ein kleiner, fester Zufall (mulberry32): dieselbe Liga auf jedem Rechner.
function zufall(seed){
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function liga({seed, namen, monate, jahr, startMonat}){
  const R = zufall(seed);
  const wahl = arr => arr[Math.floor(R() * arr.length)];
  const mischen = arr => { const a = arr.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ids = namen.map((_, i) => '00000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'));
  // Spielstärke (Abweichung vom Mittel, in Game-Wahrscheinlichkeit) und
  // Seitenvorliebe (Anteil rechts) je Spieler, dazu die Form, die langsam
  // wandert: so entstehen Serien, Einbrüche und Aufsteiger.
  const sp = ids.map((id, i) => ({id, name: namen[i], staerke: (R() - .5) * .16,
    drive: R() < .5 ? .2 + R() * .2 : .6 + R() * .25, aktiv: .45 + R() * .55, form: 0}));
  const players = sp.map(p => ({id: p.id, name: p.name, elo: 0, drive: .5, hidden: false, avatar_id: null,
    created_at: new Date(Date.UTC(jahr, startMonat - 1, 1, 8)).toISOString()}));
  const matches = [];

  const satz = (pA, bisGames = 6) => {
    let a = 0, b = 0;
    for(;;){
      if(R() < pA) a++; else b++;
      if((a >= bisGames || b >= bisGames) && Math.abs(a - b) >= 2) return {a, b, art: 'n'};
      if(a === bisGames && b === bisGames){
        // Tiebreak: etwas zufälliger als ein Game
        return R() < .5 + (pA - .5) * .7 ? {a: 7, b: 6, art: 'tb'} : {a: 6, b: 7, art: 'tb'};
      }
    }
  };
  const mtb = pA => {
    let a = 0, b = 0;
    for(;;){
      if(R() < .5 + (pA - .5) * .8) a++; else b++;
      if((a >= 10 || b >= 10) && Math.abs(a - b) >= 2) return {a, b, art: 'mtb'};
    }
  };

  for(let mo = 0; mo < monate; mo++){
    const m0 = startMonat - 1 + mo;
    // Der letzte Monat endet vor dem 26.: die Messungen stehen am 26. August
    // (tools/performance.cjs), und eine Partie nach dem Stichtag gäbe es nicht.
    const tageImMonat = mo === monate - 1 ? 25 : new Date(Date.UTC(jahr, m0 + 1, 0)).getUTCDate();
    // 3 bis 8 Tage, meist fünf
    const nTage = Math.max(3, Math.min(8, Math.round(5 + (R() - .5) * 4)));
    const tage = mischen([...Array(tageImMonat).keys()].map(d => d + 1)).slice(0, nTage).sort((x, y) => x - y);
    for(const tag of tage){
      sp.forEach(p => { p.form = p.form * .7 + (R() - .5) * .05; });
      const r = R();
      const format = r < .3 ? 'kurz' : r < .8 ? 'normal' : 'lang';
      const zahl = R() < .6 ? 4 : R() < .75 ? 6 : 8;
      const da = mischen(sp.filter(p => R() < p.aktiv)).slice(0, zahl);
      while(da.length < 4){ const x = wahl(sp); if(!da.includes(x)) da.push(x); }
      const nMatches = format === 'kurz' ? 4 + Math.floor(R() * 4) : format === 'lang' ? 2 + Math.floor(R() * 2) : 3 + Math.floor(R() * 3);
      // Abends ab 18 Uhr, ein Platz für anderthalb bis zwei Stunden: ein
      // kurzer Satz dauert gut eine Viertelstunde, zwei Sätze eine halbe.
      let zeit = Date.UTC(jahr, m0, tag, 16 + Math.floor(R() * 2), Math.floor(R() * 60));
      for(let k = 0; k < nMatches; k++){
        const vier = mischen(da).slice(0, 4);
        const seiten = (x, y) => (x.drive + (R() - .5) * .3) >= (y.drive + (R() - .5) * .3) ? [y, x] : [x, y];
        const [a1, a2] = seiten(vier[0], vier[1]), [b1, b2] = seiten(vier[2], vier[3]);
        const st = p => p.staerke + p.form;
        // Wer auf seiner ungewohnten Seite steht, spielt etwas schwächer.
        const seitenMalus = (p, s) => (s === 'drive' ? 1 - p.drive : p.drive) * .03;
        const tA = st(a1) + st(a2) - seitenMalus(a1, 'reves') - seitenMalus(a2, 'drive');
        const tB = st(b1) + st(b2) - seitenMalus(b1, 'reves') - seitenMalus(b2, 'drive');
        const pA = Math.max(.25, Math.min(.75, .5 + (tA - tB) / 2));
        const saetze = [];
        let wa = 0, wb = 0;
        if(format === 'kurz'){
          saetze.push(satz(pA));
        } else if(format === 'normal'){
          while(wa < 2 && wb < 2){
            const s = (wa === 1 && wb === 1 && R() < .55) ? mtb(pA) : satz(pA);
            saetze.push(s); if(s.a > s.b) wa++; else wb++;
          }
        } else {
          const n = R() < .5 ? 3 : 2;
          for(let i = 0; i < n; i++){ const s = satz(pA); saetze.push(s); }
        }
        // Ab und zu ist die Platzzeit um: ein letzter Satz bleibt offen.
        if(format !== 'kurz' && R() < .07){
          const a = Math.floor(R() * 5), b = Math.floor(R() * 5);
          if(a !== b) saetze.push({a, b, art: 'open'});
        }
        let sa = 0, sb = 0, ga = 0, gb = 0;
        saetze.forEach(s => {
          if(s.art !== 'open'){ if(s.a > s.b) sa++; else sb++; }
          if(s.art === 'mtb'){ if(s.a > s.b) ga++; else gb++; } else { ga += s.a; gb += s.b; }
        });
        if(sa === sb && ga === gb){ saetze.push(satz(pA)); const s = saetze[saetze.length - 1]; if(s.a > s.b){ sa++; ga += s.a; gb += s.b; } else { sb++; ga += s.a; gb += s.b; } }
        const winner = sa > sb ? 'A' : sb > sa ? 'B' : ga > gb ? 'A' : 'B';
        zeit += (format === 'kurz' ? 18 : format === 'lang' ? 45 : 32) * 60000 + Math.floor(R() * 6) * 60000;
        matches.push({id: 'm' + String(matches.length).padStart(4, '0'),
          created_at: new Date(zeit).toISOString(),
          a1: a1.id, a2: a2.id, b1: b1.id, b2: b2.id,
          a1_side: 'reves', a2_side: 'drive', b1_side: 'reves', b2_side: 'drive',
          sets: saetze.map(s => [s.a, s.b]), set_kind: saetze.map(s => s.art),
          sets_a: sa, sets_b: sb, games_a: ga, games_b: gb, winner, deltas: {}, exp_a: .5});
      }
    }
  }
  return {players, matches};
}

const NAMEN = ['Alex','Ben','Clara','David','Ella','Finn','Greta','Hannes','Ida','Jonas'];
const ziel = join(ROOT, 'tests/fixtures');
mkdirSync(ziel, {recursive: true});
const a = liga({seed: 20260501, namen: NAMEN, monate: 6, jahr: 2026, startMonat: 3});
const b = liga({seed: 77, namen: ['Anna','Bruno','Carla','Dario','Emil','Fiona','Gabriel','Hanna'], monate: 4, jahr: 2026, startMonat: 6});
writeFileSync(join(ziel, 'liga.json'), JSON.stringify(a));
writeFileSync(join(ziel, 'liga2.json'), JSON.stringify(b));
console.log(`liga.json: ${a.players.length} Spieler, ${a.matches.length} Matches · liga2.json: ${b.players.length} Spieler, ${b.matches.length} Matches`);
