// ╔═══ §5.6b ─── DIE SATZ-EINGABE ──────────────────────────────────────╗
//     Ein Bauteil für Neue Partie und Bearbeiten [§C27]: Satzzeilen mit
//     Steppern, Schnellwahl der üblichen Ergebnisse, Match-Tiebreak und
//     „nicht beendet". Rechnet nichts selbst, sondern fragt §1.3.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Der Zustand ist ein schlichtes Objekt, das der Aufrufer hält:
//   st.saetze  [{a, b, art}]  art: 'auto' | 'mtb' | 'open'
//   st.aktiv   die Satzzeile, auf die die Schnellwahl wirkt
// 'auto' liest die Art aus den Zahlen (7:6 ist ein Tiebreak). Einen
// Match-Tiebreak erkennt sie bewusst NICHT selbst: ein langer Satz bis 9
// oder 10 Games ist an manchen Tagen ein normaler Satz.
//
// Eingetragen wird einmal nach dem Match, nicht nach jedem Ball. Mit der
// Schnellwahl ist ein Satz ein Tipp: „6:4" antippen, „+ Satz", „6:3".
const SATZ_MAX = 5;
const SATZ_GAMES_MAX = 15;
const SATZ_PUNKTE_MAX = 30;
const SATZ_SCHNELL = [[6,0],[6,1],[6,2],[6,3],[6,4],[7,5],[7,6]];
const SATZ_SCHNELL_MTB = [[10,4],[10,6],[10,7],[10,8],[11,9],[12,10]];

function satzStart(){ return {saetze:[{a:0, b:0, art:'auto'}], aktiv:0}; }
function satzStartAus(m){
  const s = partieSaetze(m).map(x => ({a:x.a, b:x.b, art: x.art === 'mtb' || x.art === 'open' ? x.art : 'auto'}));
  return {saetze: s.length ? s : [{a:0, b:0, art:'auto'}], aktiv: Math.max(0, s.length - 1)};
}
// Die Sätze, wie §1.3 sie liest: jede Zeile mit ihrer festen Art.
function satzListe(st){
  return st.saetze.map(s => ({a:s.a, b:s.b,
    art: s.art === 'mtb' || s.art === 'open' ? s.art : (Math.max(s.a, s.b) === 7 && Math.min(s.a, s.b) === 6 ? 'tb' : 'n')}));
}
function satzAuswertung(st){ return saetzeAuswerten(satzListe(st)); }

function satzEditorHtml(st){
  const zeile = (s, i) => {
    const an = i === st.aktiv;
    const wer = satzSieger([s.a, s.b], s.art === 'auto' ? null : s.art);
    const art = s.art === 'mtb' ? 'Match-Tiebreak' : s.art === 'open' ? 'nicht beendet' : '';
    return `<div class="se-satz${an ? ' on' : ''}" data-se-satz="${i}">
      <span class="se-nr">${s.art === 'mtb' ? 'MTB' : 'Satz ' + (i + 1)}${art && s.art !== 'mtb' ? `<i>${art}</i>` : ''}</span>
      <div class="se-step A${wer === 'A' ? ' sieg' : ''}"><button data-se-step="${i},a,-1" aria-label="weniger">−</button><span class="se-v num">${s.a}</span><button data-se-step="${i},a,1" aria-label="mehr">+</button></div>
      <span class="se-sep">:</span>
      <div class="se-step B${wer === 'B' ? ' sieg' : ''}"><button data-se-step="${i},b,-1" aria-label="weniger">−</button><span class="se-v num">${s.b}</span><button data-se-step="${i},b,1" aria-label="mehr">+</button></div>
    </div>`;
  };
  const a = st.saetze[st.aktiv] || st.saetze[0];
  const liste = a.art === 'mtb' ? SATZ_SCHNELL_MTB : SATZ_SCHNELL;
  const chip = (x, y) => `<button class="se-chip${a.a === x && a.b === y ? ' on' : ''}" data-se-set="${x},${y}">${x}:${y}</button>`;
  const p = satzAuswertung(st);
  const fertig = p.winner && !p.fehler;
  const stand = fertig
    ? `<b>Team ${p.winner}</b> gewinnt ${p.winner === 'A' ? p.setsA + ':' + p.setsB : p.setsB + ':' + p.setsA}`
      + ` <span>· ${p.winner === 'A' ? p.gamesA + ':' + p.gamesB : p.gamesB + ':' + p.gamesA} Games</span>`
    : `<span>${esc(p.fehler || '')}</span>`;
  return `<div class="se">
    <div class="se-kopf"><span class="cl A">Team A</span><span class="cl B">Team B</span></div>
    ${st.saetze.map(zeile).join('')}
    <div class="se-schnell" aria-label="Schnellwahl für ${a.art === 'mtb' ? 'den Match-Tiebreak' : 'Satz ' + (st.aktiv + 1)}">
      <div class="se-reihe"><span class="se-rl A">A</span>${liste.map(([x, y]) => chip(x, y)).join('')}</div>
      <div class="se-reihe"><span class="se-rl B">B</span>${liste.map(([x, y]) => chip(y, x)).join('')}</div>
    </div>
    <div class="se-art">
      <button class="se-tog${a.art === 'mtb' ? ' on' : ''}" data-se-art="mtb">Match-Tiebreak</button>
      <button class="se-tog${a.art === 'open' ? ' on' : ''}" data-se-art="open">Nicht beendet</button>
      ${st.saetze.length > 1 ? `<button class="se-tog weg" data-se-weg="1">Satz entfernen</button>` : ''}
    </div>
    <div class="se-fuss">
      <div class="se-stand${fertig ? ' ok' : ''}">${stand}</div>
      ${st.saetze.length < SATZ_MAX ? `<button class="se-plus" data-se-plus="1">+ Satz</button>` : ''}
    </div>
  </div>`;
}

// Bindet das Bauteil in `wurzel` (das Element, das es enthält). Nach jeder
// Änderung zeichnet es sich selbst neu und ruft `geaendert`.
function satzEditorBinden(wurzel, st, geaendert){
  if(!wurzel) return;
  const neu = () => { wurzel.innerHTML = satzEditorHtml(st); satzEditorBinden(wurzel, st, geaendert); geaendert && geaendert(); };
  const max = s => s.art === 'mtb' ? SATZ_PUNKTE_MAX : SATZ_GAMES_MAX;
  wurzel.querySelectorAll('[data-se-satz]').forEach(el => el.addEventListener('click', e => {
    if(e.target.closest('button')) return;
    const i = +el.dataset.seSatz; if(i === st.aktiv) return;
    st.aktiv = i; neu();
  }));
  wurzel.querySelectorAll('[data-se-step]').forEach(b => b.onclick = () => {
    const [i, k, d] = b.dataset.seStep.split(','), s = st.saetze[+i];
    s[k] = Math.max(0, Math.min(max(s), s[k] + (+d)));
    st.aktiv = +i; neu();
  });
  wurzel.querySelectorAll('[data-se-set]').forEach(b => b.onclick = () => {
    const [x, y] = b.dataset.seSet.split(',').map(Number), s = st.saetze[st.aktiv];
    s.a = x; s.b = y; neu();
  });
  wurzel.querySelectorAll('[data-se-art]').forEach(b => b.onclick = () => {
    const s = st.saetze[st.aktiv], art = b.dataset.seArt;
    s.art = s.art === art ? 'auto' : art;
    // Ein Match-Tiebreak beginnt bei null Punkten; aus einem Satz in Games
    // übernommen hieße 6:4 sonst „6:4 Punkte".
    if(s.art === 'mtb' && Math.max(s.a, s.b) < 10){ s.a = 0; s.b = 0; }
    if(s.art !== 'mtb' && Math.max(s.a, s.b) > SATZ_GAMES_MAX){ s.a = 0; s.b = 0; }
    neu();
  });
  const weg = wurzel.querySelector('[data-se-weg]');
  if(weg) weg.onclick = () => {
    st.saetze.splice(st.aktiv, 1);
    st.aktiv = Math.max(0, Math.min(st.aktiv, st.saetze.length - 1)); neu();
  };
  const plus = wurzel.querySelector('[data-se-plus]');
  if(plus) plus.onclick = () => {
    st.saetze.push({a:0, b:0, art:'auto'});
    st.aktiv = st.saetze.length - 1; neu();
  };
}

// ── Die Aufstellung als Court [§5.6] ─────────────────────────────────
// Jedes Team ist eine Hälfte des Platzes, links steht der Revés-Spieler,
// rechts der Drive-Spieler. Der Platz bestimmt die Seite: wer tauscht,
// tauscht die Plätze, nicht ein Auswahlfeld. Vorher hatte jeder Spieler ein
// eigenes Feld für seine Position, und der Partner kippte automatisch mit.
// Slot 1 ist links (Revés), Slot 2 rechts (Drive).
const SLOT_SEITE = {1:'reves', 2:'drive'};
// Wer zwei Spieler in ein Team wählt, bekommt sie nach Gewohnheit gesetzt:
// der mit dem höheren Drive-Profil nach rechts. Wer selbst tauscht, legt
// das Team fest, und dann ordnet die App nichts mehr um.
function seitenVorbelegen(st, team){
  const l = st[team + '1'], r = st[team + '2'];
  if(!l || !r || st['fix' + team]) return false;
  if(driveStrength(l) > driveStrength(r) + 0.02){ st[team + '1'] = r; st[team + '2'] = l; return true; }
  return false;
}
function seitenTauschen(st, team){
  const l = st[team + '1']; st[team + '1'] = st[team + '2']; st[team + '2'] = l;
  st['fix' + team] = true;
}
