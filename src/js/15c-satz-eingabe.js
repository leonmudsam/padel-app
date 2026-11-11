// ╔═══ §5.6b ─── DIE SATZ-EINGABE ──────────────────────────────────────╗
//     Ein Bauteil für Neue Partie und Bearbeiten [§C27]: je Satz zwei
//     Zahlenfelder, sonst nichts. Rechnet nichts selbst, sondern fragt §1.3.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Eingetragen wird einmal nach der Partie, nicht nach jedem Ball. Die erste
// Fassung hatte Stepper, zwei Reihen Schnellwahl und Schalter für Match-
// Tiebreak und „nicht beendet" — zu viel für das, was man nach dem Spiel
// will: die Zahlen tippen und speichern. Jetzt sind es zwei Felder je Satz
// mit dem Ziffernblock; nach der ersten Zahl springt die Eingabe weiter.
//
// Jedes Ergebnis lässt sich speichern, auch ohne Tiebreak, mit kurzen Sätzen
// oder anderer Punktzahl. Die Art eines Satzes liest die App selbst aus den
// Zahlen (`satzListe`):
//   gleich (3:3)            nicht beendet, zählt nicht als Satz
//   7:6                     Tiebreak
//   ab 10, im Entscheidungssatz nach 1:1   Match-Tiebreak
//   alles andere            normaler Satz, egal bis wie viel gespielt wurde
// Der Zustand ist ein schlichtes Objekt, das der Aufrufer hält:
//   st.saetze  [{a, b}]
const SATZ_MAX = 5;
const SATZ_ZAHL_MAX = 99;

function satzStart(){ return {saetze:[{a:'', b:''}]}; }
function satzStartAus(m){
  const s = partieSaetze(m).map(x => ({a:x.a, b:x.b}));
  return {saetze: s.length ? s : [{a:'', b:''}]};
}
const _satzZahl = v => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? Math.min(n, SATZ_ZAHL_MAX) : null; };
// Die Sätze, wie §1.3 sie liest. Leere Zeilen fallen weg.
function satzListe(st){
  const roh = st.saetze.map(s => ({a:_satzZahl(s.a), b:_satzZahl(s.b)}))
    .filter(s => s.a != null && s.b != null && (s.a > 0 || s.b > 0));
  let sa = 0, sb = 0;
  return roh.map((s, i) => {
    const hi = Math.max(s.a, s.b), lo = Math.min(s.a, s.b);
    let art = 'n';
    if(s.a === s.b) art = 'open';
    else if(hi === 7 && lo === 6) art = 'tb';
    else if(i > 0 && hi >= 10 && sa === sb) art = 'mtb';
    if(art !== 'open'){ if(s.a > s.b) sa++; else sb++; }
    return {a:s.a, b:s.b, art};
  });
}
function satzAuswertung(st){ return saetzeAuswerten(satzListe(st)); }

function _satzStandHtml(st){
  const p = satzAuswertung(st);
  if(p.winner && !p.fehler){
    const sw = p.winner === 'A' ? p.setsA + ':' + p.setsB : p.setsB + ':' + p.setsA;
    const gw = p.winner === 'A' ? p.gamesA + ':' + p.gamesB : p.gamesB + ':' + p.gamesA;
    return {ok:true, html:`<b>Team ${p.winner}</b> gewinnt ${sw} in Sätzen <span>· ${gw} Games</span>`};
  }
  const leer = !satzListe(st).length;
  return {ok:false, html:`<span>${leer ? 'Games je Satz eintragen, z. B. 6 und 4.' : esc(p.fehler || '')}</span>`};
}
function satzEditorHtml(st){
  const zeile = (s, i) => `<div class="se-satz" data-se-satz="${i}">
      <span class="se-nr">Satz ${i + 1}</span>
      <input class="se-in A num" data-se-in="${i},a" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" aria-label="Satz ${i + 1}, Games Team A" value="${s.a === '' ? '' : esc(String(s.a))}" placeholder="0">
      <span class="se-sep">:</span>
      <input class="se-in B num" data-se-in="${i},b" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" aria-label="Satz ${i + 1}, Games Team B" value="${s.b === '' ? '' : esc(String(s.b))}" placeholder="0">
      ${st.saetze.length > 1 ? `<button class="se-weg" data-se-weg="${i}" aria-label="Satz ${i + 1} entfernen">${svgI('x')}</button>` : '<span></span>'}
    </div>`;
  const stand = _satzStandHtml(st);
  return `<div class="se">
    <div class="se-kopf"><span class="cl A">Team A</span><span class="cl B">Team B</span></div>
    ${st.saetze.map(zeile).join('')}
    <div class="se-fuss">
      <div class="se-stand${stand.ok ? ' ok' : ''}" data-se-stand>${stand.html}</div>
      ${st.saetze.length < SATZ_MAX ? `<button class="se-plus" data-se-plus="1">+ Satz</button>` : ''}
    </div>
  </div>`;
}

// Bindet das Bauteil in `wurzel` (das Element, das es enthält). Beim Tippen
// wird nur der Stand neu geschrieben — die Felder bleiben, sonst verlöre das
// Telefon bei jeder Ziffer den Fokus. Satz dazu oder weg zeichnet neu.
function satzEditorBinden(wurzel, st, geaendert){
  if(!wurzel) return;
  const neu = fokus => {
    wurzel.innerHTML = satzEditorHtml(st); satzEditorBinden(wurzel, st, geaendert); geaendert && geaendert();
    if(fokus){ const f = wurzel.querySelector(`[data-se-in="${fokus}"]`); if(f) f.focus(); }
  };
  const standNeu = () => {
    const el = wurzel.querySelector('[data-se-stand]'), s = _satzStandHtml(st);
    if(el){ el.innerHTML = s.html; el.classList.toggle('ok', s.ok); }
    geaendert && geaendert();
  };
  wurzel.querySelectorAll('[data-se-in]').forEach(inp => {
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('input', () => {
      const [i, k] = inp.dataset.seIn.split(',');
      const roh = inp.value.replace(/[^0-9]/g, '').slice(0, 2);
      if(roh !== inp.value) inp.value = roh;
      st.saetze[+i][k] = roh;
      standNeu();
      // Weiter zum nächsten Feld, sobald die Zahl fertig ist: eine Ziffer
      // außer der 1 (die eine 10 oder 11 beginnen kann), oder zwei Ziffern.
      if(roh.length === 2 || (roh.length === 1 && roh !== '1')){
        const naechst = k === 'a' ? `${i},b` : `${+i + 1},a`;
        const f = wurzel.querySelector(`[data-se-in="${naechst}"]`);
        if(f) f.focus(); else inp.blur();
      }
    });
    inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); inp.blur(); } });
  });
  wurzel.querySelectorAll('[data-se-weg]').forEach(b => b.onclick = () => {
    st.saetze.splice(+b.dataset.seWeg, 1); neu();
  });
  const plus = wurzel.querySelector('[data-se-plus]');
  if(plus) plus.onclick = () => { st.saetze.push({a:'', b:''}); neu(`${st.saetze.length - 1},a`); };
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

// ── Ein Satz gehört zur Partie davor [§5.6b] ─────────────────────────
// Die Gruppe trägt mal jeden Satz einzeln ein, mal alle zusammen. Einzeln
// eingetragen waren drei Sätze vorher drei Partien: B gewann die erste 1:0,
// A die zweite und dritte, und niemand sah, dass A die Partie nach
// Satzrückstand gedreht hatte — keine Wende, kein 2:1, drei Siege und eine
// Niederlage statt eines Siegs. Jetzt schließt ein Eintrag an die Partie
// davor an, wenn er sie fortsetzt:
//   - sie ist die letzte Partie der Liga, nichts liegt dazwischen,
//   - dieselben zwei Paare stehen sich gegenüber, gleich auf welcher Seite
//     des Netzes sie eingetragen sind,
//   - am selben Tag, höchstens BEGEGNUNG_STUNDEN nach ihrem Beginn,
//   - und zusammen sind es nicht mehr als SATZ_MAX Sätze.
// Die Eingabe sagt vor dem Speichern, dass angehängt wird, und lässt es
// abwählen (`M.neu`). Die Seiten bleiben die der Partie: ein Paar tauscht
// zwischen zwei Sätzen selten, und eine Zeile hat je Spieler eine Seite.
const BEGEGNUNG_STUNDEN = 4;
function partieFortsetzung(st, saetze, jetzt){
  const ids = [st.A1, st.A2, st.B1, st.B2];
  if(!ids.every(Boolean) || new Set(ids).size !== 4 || !saetze || !saetze.length) return null;
  let L = null;
  for(const m of matches) if(!L || mts(m) > mts(L)) L = m;
  if(!L) return null;
  const paar = (p, q) => [p, q].sort().join('|');
  const la = paar(L.a1, L.a2), lb = paar(L.b1, L.b2), na = paar(st.A1, st.A2), nb = paar(st.B1, st.B2);
  let gedreht;
  if(la === na && lb === nb) gedreht = false;
  else if(la === nb && lb === na) gedreht = true;
  else return null;
  const t = jetzt == null ? Date.now() : jetzt;
  if(tagKey(t) !== tagKey(L.created_at) || t < mts(L) || t - mts(L) > BEGEGNUNG_STUNDEN * 3600000) return null;
  const alt = partieSaetze(L);
  if(alt.length + saetze.length > SATZ_MAX) return null;
  const dazu = saetze.map(s => gedreht ? {a:s.b, b:s.a, art:s.art} : s);
  return {partie:L, gedreht, saetze:alt.concat(dazu), satzNr:alt.length + 1};
}
// Die Zeile über der Elo-Vorschau: woran angehängt wird und wie es danach
// steht, aus Sicht der Eingabe. Wer abgewählt hat, sieht, dass es eine neue
// Partie wird, und kann zurück.
function anschlussHtml(st){
  const f = partieFortsetzung(st, satzListe(st));
  if(!f) return '';
  const uhr = datumFmt(f.partie.created_at, 'uhr');
  if(st.neu) return `<div class="m-anschluss aus"><span>Wird eine neue Partie.</span>
    <button type="button" class="m-anschluss-k" data-anschluss="an">An die Partie von ${uhr} anhängen</button></div>`;
  const p = saetzeAuswerten(f.saetze);
  const a = f.gedreht ? p.setsB : p.setsA, b = f.gedreht ? p.setsA : p.setsB;
  const namen = (x, y) => esc(pname(x)) + ' & ' + esc(pname(y));
  const stand = a === b ? `${a}:${b}` : a > b ? `${a}:${b} für ${namen(st.A1, st.A2)}` : `${b}:${a} für ${namen(st.B1, st.B2)}`;
  const n = f.saetze.length - f.satzNr + 1;
  return `<div class="m-anschluss"><span>${n === 1 ? `Satz ${f.satzNr}` : `Satz ${f.satzNr} bis ${f.saetze.length}`} der Partie von ${uhr}, danach steht es <b>${stand}</b>.</span>
    <button type="button" class="m-anschluss-k" data-anschluss="aus">Neue Partie</button></div>`;
}
