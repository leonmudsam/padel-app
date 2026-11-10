// ╔═══ §C31 ─── DIE BAUTEILE DER RÜCKBLICKE ────────────────────────────╗
//     Drei Rückblicke: Saison, Woche, Tag. Vorher hatte jeder seinen
//     eigenen Bauplan — der Saison-Rückblick .rcp-*-Klassen, die beiden
//     anderen mehrere hundert Inline-Styles. Derselbe Spieler sah damit in
//     drei Rückblicken dreimal anders aus, und in keinem trug er sein
//     Wappen [§C27].
//
//     Hier steht jedes Bauteil genau einmal. Die Rückblicke unterscheiden
//     sich nur noch in dem, was sie hineinreichen: Zeitraum, Zahlen,
//     Abschnitte. Wer eins von ihnen ändert, ändert alle drei — das ist
//     der Zweck.
// ╚═════════════════════════════════════════════════════════════════════╝

// Eckdaten aus Teilen, die es geben kann oder nicht („12 Matches · 8 Spieler").
function rcpMeta(teile){ return teile.filter(Boolean).join(' · '); }

// Der Kopf. Die Marke ist Gold: Saison-Sieger, Spieler der Woche und
// Spieler des Tages sind Titel, und Gold gehört den Titeln [§C25]. Vorher
// war sie zweimal grün und einmal gold — dieselbe Aussage in zwei Farben.
// Ein Abschied ist kein Titel und trägt Metall (`o.metall`) [§C40].
function rcpKopfHtml(o){
  return `<div class="rcp-head">
    <span class="rcp-label${o.metall ? ' metall' : ''}">${svgI(o.ic || 'trophy')}${esc(o.marke)}</span>
    <div class="rcp-month">${esc(o.titel)}</div>
    ${o.meta ? `<div class="rcp-meta">${esc(o.meta)}</div>` : ''}
    ${o.extra || ''}
  </div>`;
}

// Der Avatar eines Rückblicks — mit Wappen, wie überall sonst [§C27].
// `pos` und `titel` gehören zum ZEITRAUM und nicht zu heute: der Schild
// zeigt den Platz, den er in DIESEM Zeitraum belegt hat, die Schwingen die
// Titel bis dahin. Ohne die beiden stünde im Mai-Rückblick der Auguststand.
// Kein Feuer: ein abgeschlossener Zeitraum hat keine laufende Serie [§C26].
function rcpAvHtml(pid, px, o){
  o = o || {};
  const p = pmap()[pid];
  if(!p) return `<span class="rcp-av leer" style="--rav:${px}px">?</span>`;
  const em = p.avatar_id ? avatarEmoji(p.avatar_id) : null;
  const inner = em
    ? `<span class="av av-emoji"><span class="em">${em}</span></span>`
    : `<span class="av" style="background:${avColor(pid)}">${esc(initials(p.name))}</span>`;
  // Detail folgt der Größe: unter etwa 48 px bleibt vom Wappen nur ein Rand.
  if(px < 48) return `<span class="rcp-av" style="--rav:${px}px">${inner}</span>`;
  return insAvWrap(pid, inner, {px:px, band:!!o.band, pos:o.pos, titel:o.titel,
                                feuer:0, klasse:o.klasse});
}

// Zwei Avatare als Paar. Ein Duo hat keinen Rang, also auch kein Wappen —
// zwei überlappende Chips, wie in jeder Duo-Tabelle. Teilen sich mehr einen
// Titel, steht jeder da: ab dem vierten stand ein Chip „+1".
function rcpPaarHtml(ids, px){
  return `<span class="rcp-paar" style="--rav:${px}px">${
    ids.map(id => rcpAvHtml(id, px, {})).join('')}</span>`;
}

// Der Held: die eine Person, um die der Rückblick geht. Eine Karte für alle
// drei — vorher war es einmal eine Goldkarte und zweimal eine nackte Spalte.
// `pids` mit mehr als einem Eintrag heißt geteilter Titel: dann das Paar,
// denn ein geteilter Titel gehört keinem allein.

// ── Die Bahn des Lichtlaufs [§C27] ───────────────────────────────────
// Der goldene Lauf fährt per `transform` über eine Ebene, die zweieinhalb
// Karten breit ist — und die braucht etwas, das sie abschneidet. Podest,
// Rückblick und Blattkopf schneiden selbst nicht ab (das Wappen mit seiner
// Aura ragt heraus), deshalb trägt der Lauf seine eigene Bahn. Vorher
// wanderte eine `background-position`: jedes Bild ein Takt des
// Hauptthreads, gemessen im Awards-Reiter 160 ms je Sekunde bei vierfach
// gedrosselter CPU, solange das Podest zu sehen war. Ob die Bahn leuchtet,
// sagt das CSS: wo EINER einen goldenen Titel trägt [§C25], und im Profil
// über allem, was dort gewonnen ist [§C27]. `verzug` (Sekunden) versetzt
// das Licht: in einer Reihe wandert es von Karte zu Karte, statt überall
// zugleich aufzublitzen.
function glanzBahn(verzug){
  return '<span class="glanz-bahn" aria-hidden="true"'
    + (verzug != null ? ` style="--gd:${(+verzug).toFixed(2)}s"` : '') + '></span>';
}
function rcpHeldHtml(o){
  const ids = o.pids && o.pids.length ? o.pids : [o.pid];
  const ein = ids.length === 1;
  // Das Banner (Schwingen und Schild) nur dort, wo Titel und Ligaposition
  // zur Sache gehören — im Saison-Rückblick. In Woche und Tag stünde im
  // Schild eine Ligaposition, die mit dem Zeitraum nichts zu tun hat.
  const band = o.band !== false;
  const av = ein ? rcpAvHtml(ids[0], o.px || 104, {band:band, pos:o.pos, titel:o.titel})
                 : rcpPaarHtml(ids, 64);
  const namen = ids.map(pname).join(' & ');
  const abzeichen = ein ? rankBadgeHtml(ids[0], 'sm') : '';
  // `strahl`: hinter dem Wappen dreht sich der Strahlenkranz der
  // Meisterbühne, leiser [§C27] — dasselbe Licht für denselben Gedanken,
  // einen Sieger. Wappen, Name und Zahlen heben sich nacheinander herein.
  return `<div class="rcp-held${ein ? ' klick' : ''}${o.strahl ? ' mit-strahl' : ''}"${
      ein ? ` data-detail="${esc(ids[0])}"` : ''}>
    <div class="rcp-held-label">${esc(o.marke)}</div>
    <div class="rcp-held-av${ein && band ? ' band' : ''}">${
      o.strahl ? '<span class="nf-ms-strahl leise" aria-hidden="true"></span>' : ''}${av}</div>
    <div class="rcp-held-n">${esc(namen)}</div>
    ${abzeichen ? `<div class="rcp-held-rang">${abzeichen}</div>` : ''}
    ${o.zahlen || ''}${glanzBahn()}
  </div>`;
}

// Die Zahlenleiste. `ton` färbt einen Wert — und zwar nur dann, wenn die
// Farbe eine Richtung meint (Elo-Zuwachs grün, Verlust rot) oder einen
// Titel (gold). Alles andere bleibt Metall [§C25].
// Die Zellen sind gleich breit, die Werte nicht: „Schattenseite" ist
// dreizehn Zeichen in 18-px-Archivo und lief ueber seine Zelle hinaus in
// die daneben. Ein Wort laesst sich nicht umbrechen, also wird es kleiner —
// in zwei Stufen, damit „legendaer" und „2,39 σ" gross bleiben. Gezaehlt
// wird die Zeichenzahl und nicht die gerenderte Breite: hier steht kein
// Fliesstext, sondern eine Handvoll fester Woerter aus dem Katalog.
//
// `d` ist der Unterschied zu einem Bezug (dem Vormonat): klein unter der
// Zahl, ohne Farbe — mehr Partien sind kein Lob und weniger keine Warnung.
//
// Vier Zellen passen bei 360 px nicht in eine Reihe (je 78 px Mindestbreite,
// „BESTMARKEN" braucht 75), und drei plus eine allein darunter las sich wie
// eine Zahl, die nicht dazugehört. Vier stehen deshalb zwei mal zwei, wo die
// Reihe zu schmal ist (`vier`).
function rcpZahlenHtml(zellen){
  const lang = t => t.length > 11 ? ' sehrlang' : t.length > 8 ? ' lang' : '';
  const n = zellen.filter(Boolean).length;
  return `<div class="rcp-z${n === 4 ? ' vier' : ''}">${zellen.filter(Boolean).map(z => {
    const t = String(z.v);
    return `<div class="rcp-z-s"><div class="rcp-z-v${z.ton ? ' ' + z.ton : ''}${
      lang(t)} num">${esc(t)}</div><div class="rcp-z-l">${esc(z.l)}</div>${
      z.d != null ? `<div class="rcp-z-d num">${esc(z.d)}</div>` : ''}</div>`;
  }).join('')}</div>`;
}

// Eine Abschnittsüberschrift. `n` ist die Zahl rechts — nur setzen, wenn sie
// etwas sagt, das die Liste darunter nicht schon zeigt.
function rcpAbschnitt(t, n){
  return `<div class="rcp-section">${esc(t)}${
    n ? `<span class="rcp-section-n num">${esc(String(n))}</span>` : ''}</div>`;
}

// Eine Kachel: Auszeichnung, Höhepunkt, Rekord. `leer` zeigt sie gestrichelt
// statt halbdurchsichtig — ein leeres Feld liest sich sonst als Fehler.
function rcpKachelHtml(o){
  if(o.leer) return `<div class="rcp-aw leer">
    <div class="rcp-aw-ic">${svgI(o.ic || 'trophy')}</div>
    <div class="rcp-aw-info">
      <div class="rcp-aw-label">${esc(o.label)}</div>
      <div class="rcp-aw-name">–</div>
      <div class="rcp-aw-val">keine Daten</div>
    </div>
  </div>`;
  return `<div class="rcp-aw ${o.ton || 'gold'}${o.attr ? ' klick' : ''}" ${o.attr || ''}>
    <div class="rcp-aw-ic">${svgI(o.ic || 'trophy')}</div>
    <div class="rcp-aw-info">
      <div class="rcp-aw-label">${esc(o.label)}</div>
      <div class="rcp-aw-name">${esc(o.name)}</div>
      <div class="rcp-aw-val">${esc(o.wert || '')}</div>
    </div>
  </div>`;
}

// Die Awards eines Zeitraums — aus `R`, der Rechnung des Awards-Reiters für
// genau diesen Zeitraum, und in SEINER Kachel (`awKachelHtml`) [§C27]: wer
// es hat, mit Wappen, wie viel, und woraus als Lauf oder Lage im Feld.
// Vorher baute der Rückblick eine eigene Kachel aus Zeichen, Etikett und
// einer Zeile Mono-Text: dieselbe Torjäger-Wertung sah im Reiter wie eine
// Trophäe aus und hier wie ein Formularfeld, und „Ø 6,9 Gegentore je
// Partie" brach in drei Zeilen. Die Kacheln sind Metall statt Gold
// (`metall`): Gold trägt im Rückblick der Sieger, sonst nichts [§C31].
// Wer keinen Halter hat, fällt weg; die Schattenseiten stehen hinten.
// `attr(key)` sagt, wohin die Kachel führt; `ohne` lässt eine weg, die
// dasselbe schon an anderer Stelle sagt.
function rcpAwardKacheln(R, metall, rot, attr, ohne){
  const out = [];
  const kachel = key => {
    const top = awTop(key, R); if(!top.length) return;
    if(ohne && ohne(key, top)) return;
    out.push(awKachelHtml(key, top, {liste:awListe(key, R), attr:attr(key), metall:true}));
  };
  metall.forEach(kachel);
  rot.forEach(kachel);
  return out;
}

// Eine Ereigniszeile: ein Chronik-Eintrag oder ein Rekord. Links steht das
// Zeichen der Auszeichnung in ihrem Farbton, nicht der Avatar — die Zeile
// handelt von der Auszeichnung, wer sie hält steht darunter. Die Rangliste
// benutzt sie NICHT: dort ist `.rrow` das Bauteil, dasselbe wie im
// Liga-Tab [§C27].
function rcpZeileHtml(o){
  const t = o.ton ? titleTone(o.ton) : null;
  return `<div class="rcp-zeile${o.attr ? ' klick' : ''}"${
      t ? ` style="--tt:${t.c}"` : ''} ${o.attr || ''}>
    <span class="rcp-zeile-ic">${svgI(o.ic || 'trophy')}</span>
    <span class="rcp-zeile-tx">
      <span class="rcp-zeile-n">${esc(o.name)}</span>
      ${o.sub ? `<span class="rcp-zeile-s">${esc(o.sub)}</span>` : ''}
    </span>
    ${o.rechts ? `<span class="rcp-zeile-r num">${esc(o.rechts)}</span>` : ''}
  </div>`;
}

// Ein Hinweisstreifen unter dem Helden: die Serie, der Positionsverlauf.
// Eine Zeile, ein Symbol, ein Satz — mehr trägt die Stelle nicht.
// Der Pfeil ist CSS (.klick::after) und kein Symbol: er sagt „hier geht es
// weiter", nicht „hier steht etwas". Als Icon hätte er in jeder Kachel und
// jeder Zeile einzeln gepflegt werden müssen.
function rcpNotizHtml(o){
  return `<div class="rcp-notiz${o.attr ? ' klick' : ''}" ${o.attr || ''}>
    <span class="rcp-notiz-ic">${svgI(o.ic)}</span>
    <span class="rcp-notiz-tx">${o.text}</span>
  </div>`;
}

// ╔═══ §C27 ─── DER BELEG ─────────────────────────────────────────────╗
//     Ein Rekord, ein Award und eine Chronik sind Behauptungen, und das
//     Blatt belegte sie mit einem Satz. „72 %" aus fünfzig und aus
//     fünfhundert Partien sind zwei verschiedene Aussagen, und ob der Zweite
//     knapp dahinter liegt oder weit weg, musste man aus der Liste
//     ausrechnen. Vier Formen, jede für eine Frage, und jede nur, wo sie
//     etwas sagt:
//       Woraus         die Stichprobe als Zellen, eine je Gelegenheit
//       Wo im Feld     jeder im Rennen als Punkt, der Halter hervorgehoben
//       Wie knapp      wie viele der eigenen Gelegenheiten anders hätten
//                      ausgehen müssen, damit der Zweite gleichauf läge
//       Wie es dazu kam  der Verlauf über die Monatsenden
//     Gerechnet wird hier nichts Neues: die Zahlen kommen aus dem Beleg des
//     Katalogs, aus chronicleRang, aus AW_WERT und aus dem Zeitschnitt, den
//     es gibt (_chronicleCtx).
// ╚═════════════════════════════════════════════════════════════════════╝

// „27 von 49 Spielen um den letzten Ball" aus einem Beleg. Ohne „x von y"
// gibt es keine Stichprobe zu zeigen — dann fällt die Form weg, statt eine
// zu erfinden.
function belegAnteil(text){
  const s = String(text || '');
  const m = s.match(/(\d+)\s+von\s+(\d+)/);
  if(!m) return null;
  const k = +m[1], n = +m[2];
  if(!(n > 0) || k > n) return null;
  return {k, n, satz:s.slice(m.index).split(' · ')[0].replace(/[.,;]\s*$/, '')};
}
// Ist der Anteil derselbe Wert, den der Beleg groß nennt? Nur dann trägt
// die Spanne: „6 % aller 48 Spieltage · 3 Tage" zählt drei von 48, und die
// Spanne über drei von 48 beschreibt genau diese sechs Prozent.
function _belegIstQuote(text, a){
  const m = String(text || '').match(/([\d,]+)\s?%/);
  return !!(m && a && Math.abs(parseFloat(m[1].replace(',', '.')) - a.k / a.n * 100) <= 1);
}
// Woraus: eine Zelle je Gelegenheit. Ab hundert fasst eine Zelle mehrere —
// hundert Zellen sind auf dem Telefon vier Reihen, mehr wäre eine Fläche.
// `kurz` steht im Blatt einer Story: dort sagt die Karte darüber schon den
// ganzen Satz, und unter den Zellen stand er Wort für Wort ein zweites Mal.
function belegZellenHtml(a, kurz){
  if(!a) return '';
  const je = Math.max(1, Math.ceil(a.n / 100));
  const z = Math.ceil(a.n / je), voll = Math.round(a.k / je);
  let zellen = '';
  for(let i = 0; i < z; i++) zellen += i < voll ? '<i class="j"></i>' : '<i></i>';
  return `<div class="bl-zellen">${zellen}</div>
    <div class="bl-satz">${esc(kurz ? a.k + ' von ' + a.n : a.satz)}${je > 1 ? ` · eine Zelle für je ${je}` : ''}</div>`;
}
// Wo im Feld: `eintraege` sind {v, t, er} — Sortierwert, sein Text, und ob
// er zu den Haltern gehört. Links steht der kleinste Wert, rechts der
// größte; die Mitte ist der Median. Nur ab drei Einträgen: zwei Punkte
// sind kein Feld.
function belegFeldHtml(eintraege, mitSkala){
  const e = (eintraege || []).filter(x => x && x.v != null && isFinite(x.v));
  if(e.length < 3) return '';
  const lo = Math.min(...e.map(x => x.v)), hi = Math.max(...e.map(x => x.v));
  if(!(hi > lo)) return '';
  const pos = v => ((v - lo) / (hi - lo) * 92 + 4).toFixed(1);
  const sortiert = e.slice().sort((a, b) => a.v - b.v);
  const mitte = sortiert[Math.floor((sortiert.length - 1) / 2)];
  // Halter zuletzt, damit ihr Punkt über den anderen liegt.
  const punkte = e.filter(x => !x.er).concat(e.filter(x => x.er))
    .map(x => `<i${x.er ? ' class="er"' : ''} style="left:${pos(x.v)}%"></i>`).join('');
  const skala = mitSkala
    ? `<div class="bl-feld-l num"><span>${esc(String(sortiert[0].t))}</span><span>Mitte ${esc(String(mitte.t))}</span><span>${esc(String(sortiert[sortiert.length - 1].t))}</span></div>`
    : '';
  return `<div class="bl-feld" title="${e.length} im Feld"><span class="bl-feld-bahn"></span>`
    + `<span class="bl-feld-mitte" style="left:${pos(mitte.v)}%"></span>${punkte}</div>${skala}`;
}
// Wie knapp: wie viele der eigenen Gelegenheiten anders hätten ausgehen
// müssen, damit der Zweite gleichauf läge. Dort stand vorher die Spanne um
// den Anteil (Wilson, 90 %) — „Wären ein paar Partien anders ausgegangen,
// läge der Wert wohl irgendwo zwischen 36 und 57 %" war richtig gerechnet
// und trotzdem nicht zu lesen: eine Spanne ist eine Frage an den Leser.
// Eine Zahl, die man abzählen kann, beantwortet sie: zwei Partien.
function belegLuft(k, n, q2){ return Math.max(0, Math.ceil(k - q2 * n - 1e-9)); }
const _BELEG_ZAHL = ['keine', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
function belegLuftHtml(a, zweiter){
  if(!a || !zweiter || zweiter.q == null || !isFinite(zweiter.q)) return '';
  const m = belegLuft(a.k, a.n, zweiter.q);
  const q = a.k / a.n, pz = v => Math.round(v * 100);
  const [wort, ton] = m === 0 ? ['gleichauf', 'eng'] : m === 1 ? ['hauchdünn', 'eng']
    : m <= 3 ? ['knapp', 'eng'] : m <= 7 ? ['solide', 'mittel'] : ['deutlich', 'weit'];
  const zahl = _BELEG_ZAHL[m] || String(m);
  const satz = m === 0
    ? `${esc(zweiter.name)} liegt mit ${pz(zweiter.q)} % gleichauf.`
    : `${zahl.charAt(0).toUpperCase() + zahl.slice(1)} der ${a.n} Ergebnisse anders, und <b>${esc(zweiter.name)}</b> läge gleichauf.`;
  // Die Luft als Zellen: je eine für eine Gelegenheit Vorsprung, höchstens
  // zwölf — darüber ist der Vorsprung deutlich, und die Zahl sagt den Rest.
  const zellen = Array.from({length: Math.min(m, 12)}, () => '<i></i>').join('') + (m > 12 ? '<b>+' + (m - 12) + '</b>' : '');
  const balken = (wert, name, cls) => `<div class="bl-lz-z ${cls}"><span class="n">${esc(name)}</span>`
    + `<span class="b"><i style="width:${(wert * 100).toFixed(1)}%"></i></span><span class="v num">${pz(wert)} %</span></div>`;
  return `<div class="bl-luft" data-luft="${m}" data-ton="${ton}">
      <div class="bl-lz-kopf"><span class="bl-lz-zahl num">${m}</span>
        <span class="bl-lz-was">${m === 1 ? 'Ergebnis' : 'Ergebnisse'} Vorsprung</span>
        <span class="bl-lz-wort">${wort}</span></div>
      ${m ? `<div class="bl-lz-zellen">${zellen}</div>` : ''}
      ${balken(q, 'Bestwert', 'a')}${balken(zweiter.q, zweiter.name, 'b')}
    </div>
    <div class="bl-satz">${satz}</div>`;
}
// Wie es dazu kam: der Wert der drei auf dem Podest an jedem Monatsende und
// heute. `serie` = {labels, reihen:[{name, werte}], seit}, die Reihen in der
// Folge des Podests; ein fehlender Wert (noch nicht in der Wertung)
// unterbricht die Linie. Die Linien tragen die Metalle des Podests — Gold,
// Silber, Bronze —, damit Linie und Karte darüber dieselbe Person meinen.
function belegVerlaufHtml(s){
  const PLATZ = ['p1', 'p2', 'p3'];
  if(!s || !s.labels || s.labels.length < 2 || !s.reihen || !s.reihen.length) return '';
  const alle = [].concat(...s.reihen.map(r => r.werte)).filter(v => v != null && isFinite(v));
  if(alle.length < 2) return '';
  let lo = Math.min(...alle), hi = Math.max(...alle);
  if(!(hi > lo)){ lo -= 1; hi += 1; }
  const W = 300, H = 74, n = s.labels.length;
  const x = i => (8 + i * (W - 16) / (n - 1)).toFixed(1);
  const y = v => (H - 16 - (v - lo) / (hi - lo) * (H - 26)).toFixed(1);
  const linie = (werte, cls) => {
    const teile = []; let lauf = [];
    werte.forEach((v, i) => {
      if(v == null || !isFinite(v)){ if(lauf.length) teile.push(lauf); lauf = []; return; }
      lauf.push(x(i) + ',' + y(v));
    });
    if(lauf.length) teile.push(lauf);
    return teile.map(t => t.length > 1
      ? `<polyline class="${cls}" points="${t.join(' ')}"/>`
      : `<circle class="${cls}" cx="${t[0].split(',')[0]}" cy="${t[0].split(',')[1]}" r="2"/>`).join('');
  };
  const reihen = s.reihen.slice(0, 3), erste = reihen[0].werte;
  // Der Erste zuletzt, damit seine Linie über den anderen liegt.
  const linien = reihen.map((r, k) => linie(r.werte, 'bl-v-' + PLATZ[k])).reverse().join('');
  const seit = s.seit != null && erste[s.seit] != null
    ? `<circle class="bl-v-seit" cx="${x(s.seit)}" cy="${y(erste[s.seit])}" r="4.5"/>` : '';
  const achse = s.labels.map((l, i) => (i === 0 || i === n - 1 || n <= 6)
    ? `<text x="${x(i)}" y="${H - 2}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(l)}</text>` : '').join('');
  return `<svg class="bl-verlauf" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      ${linien}${seit}${achse}</svg>
    <div class="bl-legende">${reihen.map((r, k) => `<span class="${PLATZ[k]}">${esc(r.name)}</span>`).join('')}${
      s.seit != null ? `<span class="seit">vorn seit ${esc(s.labels[s.seit])}</span>` : ''}</div>`;
}
// Der Beleg in seiner festen Reihenfolge — nur die Formen, die für die
// Größe etwas sagen: eine Serie hat keine Spanne, ein Monat keinen Verlauf.
//   o.ev       der Beleg des Halters („36 von 50 Partien gewonnen")
//   o.feld     {v, t, er} je Eintrag im Rennen
//   o.dahinter ein Satz über den Zweiten
//   o.zweiter  {name, q} für die Spanne
//   o.verlauf  die id eines Liga-Rekords: sein Verlauf kommt nach dem
//              Öffnen (belegVerlaufLaden)
function belegHtml(o){
  const a = belegAnteil(o.ev);
  const teile = [];
  if(a) teile.push(blattAbschnittHtml('chartBar', 'Woraus', a.n + ' insgesamt')
    + `<div class="bl-box">${belegZellenHtml(a, o.kurz)}</div>`);
  const feld = belegFeldHtml(o.feld, true);
  if(feld) teile.push(blattAbschnittHtml('users', 'Wo im Feld', o.feld.length + ' im Rennen')
    + `<div class="bl-box">${feld}${o.dahinter ? `<div class="bl-satz">${o.dahinter}</div>` : ''}</div>`);
  const lz = a && _belegIstQuote(o.ev, a) ? belegLuftHtml(a, o.zweiter) : '';
  if(lz) teile.push(blattAbschnittHtml('target', 'Wie knapp') + `<div class="bl-box">${lz}</div>`);
  if(o.verlauf) teile.push(blattAbschnittHtml('trendUp', 'Wie es dazu kam', 'Monatsenden')
    + `<div class="bl-box" data-verlauf="${esc(o.verlauf)}"><div class="bl-lade"></div></div>`);
  return teile.join('');
}
// Der Verlauf kommt nach: er braucht einen Zeitschnitt je Monat
// [rekordVerlauf]. Ist das Blatt inzwischen ein anderes, fällt er weg.
function belegVerlaufLaden(root){
  const box = root && root.querySelector('[data-verlauf]');
  if(!box) return;
  setTimeout(() => {
    if(!box.isConnected) return;
    rekordVerlauf(box.dataset.verlauf, s => {
      if(!box.isConnected) return;
      const html = belegVerlaufHtml(s);
      if(html) box.innerHTML = html;
      else { const kopf = box.previousElementSibling; box.remove(); if(kopf) kopf.remove(); }
    });
  }, 360);
}

// ╔═══ §C31 ─── DIE MEISTERBÜHNE ──────────────────────────────────────╗
//     Der Meister einer Saison stand im Feed als rote Breaking-Karte mit
//     zwei Sätzen und ohne ein einziges Bild, und sein Blatt nannte drei
//     Elo-Zahlen untereinander und darunter die Saison-ID. Das Podest, das
//     Rennen um die Spitze und die Tage vorn gab es nur im Saison-Rückblick
//     — oder gar nicht. Die Bauteile stehen deshalb hier, einmal, und
//     Rückblick, Karte und Blatt zeichnen daraus [§C27].
// ╚═════════════════════════════════════════════════════════════════════╝

// Die Rangliste einer Saison — EINE Quelle für Podest, Liste und Wappen.
// Vorher rechnete das Podest aus season.top_elo und die Liste aus dem
// Simulator: zwei Reihenfolgen, die bei Gleichstand auseinanderliefen.
// Die dritte Zahl ist die Tordifferenz: der Elo-Zuwachs des Monats ist die
// Saison-Elo selbst, der Simulator setzt zu jedem Monatsbeginn zurück.
function saisonRang(sid){
  const ms = matchesInSeason(sid);
  const gSim = getGlobalSim();
  const stand = gSim.seasonEndElos[sid] || {};
  const gespielt = gSim.seasonPlayed[sid] || {};
  const sw = {}, sl = {}, gf = {}, ga = {};
  ms.forEach(m => {
    [[m.a1, m.a2, m.winner === 'A', m.games_a, m.games_b],
     [m.b1, m.b2, m.winner === 'B', m.games_b, m.games_a]].forEach(([x, y, won, f, g]) => {
      [x, y].forEach(id => {
        if(won) sw[id] = (sw[id] || 0) + 1; else sl[id] = (sl[id] || 0) + 1;
        gf[id] = (gf[id] || 0) + (f || 0); ga[id] = (ga[id] || 0) + (g || 0);
      });
    });
  });
  // Ein Monat ist ein Zeitraum [§C40]: wer darin spielte, steht darin.
  return Object.keys(gespielt).filter(id => gespielt[id] > 0 && sichtbar(id))
    .map(id => ({id, elo:Math.round(stand[id] ?? cfg.start_elo),
                 wins:sw[id] || 0, losses:sl[id] || 0, diff:(gf[id] || 0) - (ga[id] || 0)}))
    .sort((a, b) => b.elo - a.elo);
}

// Das Podest einer Saison, dasselbe Bauteil wie in der Ewigen Tafel [§C27]:
// drei Karten, der Erste höher und wärmer, das Wappen mit Banner. Die Zahl
// im Schild ist der Platz DIESER Saison, die Schwingen zählen die Titel bis
// zu ihr — ein Rückblick auf den Mai trägt nicht die Titel vom August [§C26].
function saisonPodestHtml(sid, rang, o){
  o = o || {};
  if(!rang || !rang.length) return '';
  const METALL = ['gold', 'silber', 'bronze'];
  const karte = (e, platz) => {
    const p = pmap()[e.id];
    if(!p) return '<div class="pod-leer"></div>';
    const titelBis = seasons.filter(x => x.id <= sid && seasonChampion(x.id) === e.id).length;
    const av = avHtml(p, '', {ins:true, band:true, pos:platz, titel:titelBis, feuer:0,
                              px:platz === 1 ? (o.px1 || 88) : (o.px || 70), klasse:'pod-av'});
    // Ohne Titel steht dort die Spielzahl — ein Strich sähe aus, als fehlte
    // die Zahl, statt zu sagen: dieser Spieler hat noch keinen.
    const sub = titelBis ? titelBis + ' Titel' : (e.wins + e.losses) + (e.wins + e.losses === 1 ? ' Partie' : ' Partien');
    return `<div class="pod-karte ${METALL[platz - 1]}${platz === 1 ? ' erster' : ''}" ${o.attr || 'data-detail'}="${esc(e.id)}">
      <div class="pod-platz num">${String(platz).padStart(2, '0')}</div>
      ${av}
      <div class="pod-name">${esc(p.name)}</div>
      <div class="pod-wert num">${e.elo}</div>
      <div class="pod-sub num">${esc(sub)}</div>${platz === 1 ? glanzBahn() : ''}
    </div>`;
  };
  const folge = [rang[1], rang[0], rang[2]], plaetze = [2, 1, 3];
  return `<div class="podest rcp-podest${o.klasse ? ' ' + o.klasse : ''}">${
    folge.map((e, k) => e ? karte(e, plaetze[k]) : '<div class="pod-leer"></div>').join('')}</div>`;
}

// Wer an wie vielen Spieltagen vorn lag, und wie oft die Spitze wechselte.
// Gezählt wird der Stand am Ende jedes Tages mit Partie, aus dem
// Positionsverlauf — derselben Rechnung, die dessen Linien zeichnet.
function saisonSpitze(sid){
  const ph = getSeasonPositionHistory(sid);
  const tage = {}, folge = [];
  if(!ph || ph.empty) return {tage, folge, spieltage:0, wechsel:0};
  (ph.spielTage || []).forEach(day => {
    const vorn = ph.activeIds.find(id => (ph.positionsByDay[id] || [])[day - 1] === 1);
    if(!vorn) return;
    tage[vorn] = (tage[vorn] || 0) + 1;
    folge.push({day, pid:vorn});
  });
  let wechsel = 0;
  for(let i = 1; i < folge.length; i++) if(folge[i].pid !== folge[i - 1].pid) wechsel++;
  return {tage, folge, spieltage:folge.length, wechsel};
}

// Das Titelrennen: die Saison-Elo der drei auf dem Podest am Ende jedes
// Tages, der Meister golden und obenauf, darunter ein Band, das an jedem
// Spieltag in der Farbe dessen steht, der vorn lag. Die Linien zeichnen sich
// von links auf — in der Richtung, in der der Monat passiert ist —, und bei
// Bewegungsruhe stehen sie still. `o.klein` ist die Fassung für die Karte:
// ohne Band, ohne Legende.
function saisonRennenHtml(sid, pids, o){
  o = o || {};
  const ph = getSeasonPositionHistory(sid);
  if(!ph || ph.empty || ph.lastDay < 2) return '';
  const ids = (pids || []).filter(id => ph.eloByDay && ph.eloByDay[id]).slice(0, 3);
  if(!ids.length) return '';
  const W = 320, H = o.klein ? 64 : 120, tief = o.klein ? 6 : 10;
  const werte = [];
  ids.forEach(id => ph.eloByDay[id].forEach(v => { if(v != null) werte.push(v); }));
  if(werte.length < 2) return '';
  let lo = Math.min(...werte), hi = Math.max(...werte);
  if(!(hi > lo)){ lo -= 1; hi += 1; }
  const n = ph.lastDay;
  const x = d => (6 + d * (W - 12) / (n - 1)).toFixed(1);
  const y = v => (H - tief - (v - lo) / (hi - lo) * (H - tief - 8)).toFixed(1);
  const METALL = ['gold', 'silber', 'bronze'];
  let linien = '', flaeche = '';
  // Von hinten nach vorn: der Meister liegt zuletzt und damit obenauf.
  ids.slice().reverse().forEach(id => {
    const k = ids.indexOf(id), reihe = ph.eloByDay[id];
    const pts = [];
    reihe.forEach((v, d) => { if(v != null) pts.push([x(d), y(v)]); });
    if(pts.length < 2) return;
    const pfad = 'M' + pts.map(p => p.join(',')).join('L');
    if(k === 0) flaeche = `<path class="srn-fl" d="${pfad}L${pts[pts.length - 1][0]},${H}L${pts[0][0]},${H}Z"/>`;
    const e = pts[pts.length - 1];
    linien += `<path class="srn-l ${METALL[k]}" pathLength="1" d="${pfad}"/>`
      + `<circle class="srn-p ${METALL[k]}" cx="${e[0]}" cy="${e[1]}" r="${k === 0 ? 4 : 3}"/>`;
  });
  const gid = 'srnFl' + String(sid).replace(/\W/g, '') + (o.klein ? 'k' : '');
  const svg = `<svg class="srn-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7cf4a" stop-opacity=".32"/><stop offset="1" stop-color="#f7cf4a" stop-opacity="0"/>
    </linearGradient></defs>
    ${[.25, .5, .75].map(t => `<line class="srn-g" x1="0" x2="${W}" y1="${(8 + t * (H - tief - 8)).toFixed(1)}" y2="${(8 + t * (H - tief - 8)).toFixed(1)}"/>`).join('')}
    ${flaeche.replace('class="srn-fl"', `class="srn-fl" fill="url(#${gid})"`)}${linien}</svg>`;
  if(o.klein) return `<div class="srn klein">${svg}</div>`;
  // Das Band der Spitze: ein Feld je Kalendertag, gefärbt nach dem, der am
  // Ende eines Spieltags vorn lag — wer nicht auf dem Podest steht, in Metall.
  const sp = saisonSpitze(sid);
  const vorn = {}; sp.folge.forEach(f => { vorn[f.day] = f.pid; });
  let zuletzt = null;
  const band = Array.from({length:n}, (_, d) => {
    const pid = vorn[d + 1] || null;
    if(pid) zuletzt = pid;
    const k = zuletzt ? ids.indexOf(zuletzt) : -1;
    const cls = k >= 0 ? METALL[k] : (zuletzt ? 'rest' : 'leer');
    return `<i class="${cls}${pid ? '' : ' still'}"></i>`;
  }).join('');
  const pm = pmap();
  const legende = ids.map((id, k) => `<span class="${METALL[k]}" data-pid="${esc(id)}"><u></u>${
    esc((pm[id] || {}).name || '?')}<b class="num">${ph.eloByDay[id][n - 1] != null ? ph.eloByDay[id][n - 1] : ''}</b></span>`).join('');
  return `<div class="srn">${svg}
    <div class="srn-band" title="Wer am Ende eines Spieltags vorn lag">${band}</div>
    <div class="srn-achse num"><span>1.</span><span>${Math.ceil(n / 2)}.</span><span>${n}.</span></div>
    <div class="srn-leg">${legende}</div></div>`;
}

// Die Tage an der Spitze als Balken, der Meister golden. Wer nie vorn lag,
// steht nicht da — eine Zeile mit null ist keine Aussage.
function saisonSpitzeHtml(sid, podium){
  const sp = saisonSpitze(sid);
  const ids = Object.keys(sp.tage).sort((a, b) => sp.tage[b] - sp.tage[a]);
  if(!ids.length) return '';
  const max = sp.tage[ids[0]] || 1, pm = pmap();
  const METALL = ['gold', 'silber', 'bronze'];
  return `<div class="srn-tage">${ids.map(id => {
    const k = (podium || []).indexOf(id);
    return `<div class="srn-t ${k >= 0 ? METALL[k] : 'rest'}" data-pid="${esc(id)}">
      <span class="n">${esc((pm[id] || {}).name || '?')}</span>
      <span class="b"><i style="width:${(sp.tage[id] / max * 100).toFixed(1)}%"></i></span>
      <span class="v num">${sp.tage[id]}</span></div>`;
  }).join('')}</div>
    <div class="bl-satz">${sp.spieltage} ${sp.spieltage === 1 ? 'Spieltag' : 'Spieltage'}, ${
      sp.wechsel === 0 ? 'die Spitze hat nie gewechselt' : sp.wechsel === 1 ? 'die Spitze hat einmal gewechselt'
      : 'die Spitze hat ' + (_BELEG_ZAHL[sp.wechsel] ? _BELEG_ZAHL[sp.wechsel] + 'mal' : sp.wechsel + '-mal') + ' gewechselt'}.</div>`;
}

// Die Saison eines Spielers als Zellen, eine je Partie, in Spielreihenfolge:
// grün ein Sieg, rot eine Niederlage [§C25]. „31 zu 12" muss man sich
// vorstellen, die Zellen sieht man.
function saisonZellenHtml(sid, pid){
  const ms = matchesInSeason(sid).filter(m => [m.a1, m.a2, m.b1, m.b2].includes(pid))
    .slice().sort((a, b) => mts(a) - mts(b));
  if(!ms.length) return '';
  const sieg = m => ((m.a1 === pid || m.a2 === pid) ? m.winner === 'A' : m.winner === 'B');
  return `<div class="srn-z">${ms.map(m => `<i class="${sieg(m) ? 'w' : 'l'}"></i>`).join('')}</div>`;
}

// ── Das Feld eines Zeitraums [§C31] ──────────────────────────────────
// Der Rückblick von Woche und Tag nannte den Helden und seine Zahlen, aber
// nicht, gegen wen er sie geholt hat: ob 5:1 viel war, sah man erst im
// Vergleich mit den anderen. Jeder Spieler steht als Zeile, Siege nach
// rechts, Niederlagen nach links, um eine gemeinsame Null; der Held in Gold
// [§C25]. Der Name bricht um, statt mit „…" zu enden.
// Rechts steht, was der Zeitraum an Elo brachte, aus den Deltas der Partien:
// Größter Aufwind war vorher eine eigene Kachel unter den Awards und nannte
// eine Zahl, die hier für jeden steht. Vor dem Namen das Gesicht — ohne
// Wappen, eine Zeile von 20 px trägt keins (Detail folgt der Größe).
function rcpFeldHtml(ms, held){
  const z = {};
  ms.forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(id => {
    if(!id) return;
    z[id] = z[id] || {w:0, l:0, elo:0};
    ((m.a1 === id || m.a2 === id) ? m.winner === 'A' : m.winner === 'B') ? z[id].w++ : z[id].l++;
    z[id].elo += (m.deltas || {})[id] || 0;
  }));
  const ids = Object.keys(z).sort((a, b) => (z[b].w - z[b].l) - (z[a].w - z[a].l) || z[b].w - z[a].w);
  if(!ids.length) return '';
  const max = Math.max(1, ...ids.map(id => Math.max(z[id].w, z[id].l)));
  const elo = id => { const e = Math.round(z[id].elo);
    return `<span class="rcp-feld-e num ${e > 0 ? 'auf' : e < 0 ? 'ab' : ''}">${e > 0 ? '+' : e < 0 ? '−' : '±'}${Math.abs(e)}</span>`; };
  return `<div class="rcp-feld">${ids.map((id, i) => `<div class="rcp-feld-z${id === held ? ' held' : ''}" data-detail="${esc(id)}" style="--i:${i}">
    <span class="rcp-feld-n">${rcpAvHtml(id, 20, {})}<span>${esc(pname(id))}</span></span>
    <span class="rcp-feld-b"><i class="l" style="width:${(z[id].l / max * 50).toFixed(1)}%"></i><u></u><i class="w" style="width:${(z[id].w / max * 50).toFixed(1)}%"></i></span>
    <span class="rcp-feld-v num">${z[id].w}:${z[id].l}</span>${elo(id)}</div>`).join('')}</div>`;
}

// ── Die Woche eines Spielers ─────────────────────────────────────────
// Sieben Spalten, oben die Siege, unten die Niederlagen. „5 Siege, 1
// Niederlage" sagte nicht, ob das an einem Tag war oder über die ganze Woche.
// Ein Tag ohne Partie ist ein Strich, kein Loch.
function rcpWocheHtml(ms, pid, start){
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const je = Array.from({length:7}, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const k = tagKey(d);
    const e = ms.filter(m => tagKey(mts(m)) === k && [m.a1, m.a2, m.b1, m.b2].includes(pid));
    const w = e.filter(m => (m.a1 === pid || m.a2 === pid) ? m.winner === 'A' : m.winner === 'B').length;
    return {d, w, l:e.length - w};
  });
  const max = Math.max(1, ...je.map(x => Math.max(x.w, x.l)));
  return `<div class="rcp-woche">${je.map((x, i) => `<div class="rcp-wo-t${x.w + x.l ? '' : ' leer'}" style="--i:${i}">
    <span class="rcp-wo-o"><i style="height:${(x.w / max * 100).toFixed(0)}%"></i></span>
    <span class="rcp-wo-u"><i style="height:${(x.l / max * 100).toFixed(0)}%"></i></span>
    <span class="rcp-wo-l">${WT[x.d.getDay()]}</span>
    <span class="rcp-wo-v num">${x.w + x.l ? x.w + ':' + x.l : '–'}</span></div>`).join('')}</div>`;
}

// ── Die Elo eines Tages als Linie ────────────────────────────────────
// Gerechnet wird nichts: die Deltas stehen an jeder Partie. Die Linie zeigt,
// wie der Tag zustande kam — zwei Pleiten am Anfang und danach fünf Siege
// sind dieselbe Bilanz wie umgekehrt, aber ein anderer Tag. Sie zeichnet
// sich von links, und jede Partie setzt ihren Punkt, wenn die Linie bei ihr
// ankommt (`--i`); am Ende steht die Summe.
function rcpEloBahnHtml(ms, pid){
  const e = ms.filter(m => [m.a1, m.a2, m.b1, m.b2].includes(pid)).sort((a, b) => mts(a) - mts(b));
  if(e.length < 2) return '';
  let s = 0;
  const pts = [0];
  e.forEach(m => { s += Math.round((m.deltas || {})[pid] || 0); pts.push(s); });
  const W = 320, H = 70, lo = Math.min(...pts), hi = Math.max(...pts), sp = hi - lo || 1;
  const x = i => (8 + i * (W - 16) / (pts.length - 1)).toFixed(1);
  const y = v => (H - 10 - (v - lo) / sp * (H - 22)).toFixed(1);
  const d = 'M' + pts.map((v, i) => x(i) + ',' + y(v)).join('L');
  const null0 = y(0);
  return `<div class="rcp-elo"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <line class="rcp-elo-0" x1="0" x2="${W}" y1="${null0}" y2="${null0}"/>
    <path class="rcp-elo-fl" d="${d}L${x(pts.length - 1)},${null0}L${x(0)},${null0}Z"/>
    <path class="rcp-elo-l" pathLength="1" d="${d}"/>
    ${pts.map((v, i) => i ? `<circle class="${v >= pts[i - 1] ? 'w' : 'l'}" style="--i:${(i / (pts.length - 1)).toFixed(2)}" cx="${x(i)}" cy="${y(v)}" r="3"/>` : '').join('')}
  </svg><div class="rcp-elo-z num"><span>Erste Partie</span><b class="${s >= 0 ? 'pos' : 'neg'}">${s >= 0 ? '+' : ''}${s} Elo</b></div></div>`;
}

// ╔═══ §C31 ─── DIE GRAFIKEN DER RÜCKBLICKE ────────────────────────────╗
//     Saison und Woche erzählten mit Zeilen und Kacheln aus Text: die
//     Rangliste als zwölf große Karten, neununddreißig Rekorde als
//     neununddreißig Zeilen, die Chronik als Liste, und was der Monat für die
//     Laufbahnen bedeutete, stand nirgends. Die Bauteile hier zeigen jede
//     dieser Fragen als Bild: der Zeitraum als Kalender, die Tabelle als
//     Balken mit ihren Bewegungen, das Team mit seinen Partien, die Wirkung
//     auf die Laufbahn nach Quellen, die Rekorde nach ihren Haltern, die
//     Beinamen auf ihrem Band. Gerechnet wird darin nichts Neues: jede Zahl
//     kommt aus der Stelle, die sie überall sonst liefert [§C27].
// ╚═════════════════════════════════════════════════════════════════════╝

// ── Der Zeitraum als Kalender ────────────────────────────────────────
// Ein Feld je Tag, eine Woche je Reihe, montags beginnend; je mehr Partien
// an einem Tag, desto heller das Feld, und die Zahl steht darin. „17
// Spieltage, 120 Partien" sagte nicht, ob der Monat gleichmäßig lief oder
// an zwei Abenden entschieden wurde. Die Woche ist dieselbe Zeichnung mit
// einer Reihe. Hell ist Metall, keine Richtung und kein Titel [§C25]. Der
// Tag mit den meisten Partien (`max`) trägt einen Rand: in einem Monat mit
// drei Feldern der hellsten Stufe sah man sonst nicht, welches es war.
function rcpKalenderHtml(ms, von, tage){
  const je = {};
  (ms || []).forEach(m => { const k = tagKey(mts(m)); je[k] = (je[k] || 0) + 1; });
  const d0 = new Date(von); d0.setHours(0, 0, 0, 0);
  const max = Math.max(1, ...Object.values(je));
  const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  let zellen = '';
  for(let i = 0, vor = wochentagMo(d0); i < vor; i++) zellen += '<span class="rcp-kal-x"></span>';
  for(let i = 0; i < tage; i++){
    const d = new Date(d0); d.setDate(d0.getDate() + i);
    const n = je[tagKey(d)] || 0;
    const k = n ? Math.max(1, Math.ceil(n / max * 4)) : 0;
    zellen += `<span class="rcp-kal-t k${k}${n === max ? ' max' : ''}" style="--i:${i}"><small class="num">${d.getDate()}</small>`
      + `${n ? `<b class="num">${n}</b>` : ''}</span>`;
  }
  return `<div class="rcp-kal${tage <= 7 ? ' woche' : ''}">${
    WT.map(t => `<span class="rcp-kal-w">${t}</span>`).join('')}${zellen}</div>`;
}

// ── Die Tabelle eines Monats ─────────────────────────────────────────
// Jede Zeile ein Balken, so lang wie die Saison-Elo im Feld, dazu die
// Bewegung gegenüber dem Vormonat, die Bilanz als geteilter Strich und die
// Elo. Vorher stand jeder als große Ranglistenkarte mit Wappen da, zwölf
// Karten über anderthalb Bildschirme, und der größte Sprung und der tiefste
// Fall standen als zwei eigene Kacheln darunter. Hier stehen sie in ihrer
// Zeile, hervorgehoben. Das Wappen trägt das Podest darüber; in einer
// Tabelle reicht das Gesicht (Detail folgt der Größe).
// `platzVor` ist {pid: Platz im Vormonat} oder null, wenn es keinen gab.
function rcpTabelleHtml(rang, platzVor){
  if(!rang || !rang.length) return '';
  const elos = rang.map(e => e.elo), lo = Math.min(...elos), hi = Math.max(...elos);
  const zug = rang.map((e, i) => platzVor && platzVor[e.id] ? platzVor[e.id] - (i + 1) : null);
  const auf = Math.max(0, ...zug.filter(x => x != null)), ab = Math.min(0, ...zug.filter(x => x != null));
  const METALL = ['gold', 'silber', 'bronze'];
  const PF_AUF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5M6 11l6-6 6 6"/></svg>';
  const PF_AB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15M6 13l6 6 6-6"/></svg>';
  const chip = (z, e) => {
    if(!platzVor) return '';
    if(z == null) return `<span class="rcp-tab-z leer" title="im Vormonat nicht in der Tabelle">–</span>`;
    if(z > 0) return `<span class="rcp-tab-z auf${z === auf ? ' max' : ''}" title="Platz ${platzVor[e.id]} im Vormonat">${PF_AUF}${z}</span>`;
    if(z < 0) return `<span class="rcp-tab-z ab${z === ab ? ' max' : ''}" title="Platz ${platzVor[e.id]} im Vormonat">${PF_AB}${-z}</span>`;
    return `<span class="rcp-tab-z gleich" title="derselbe Platz wie im Vormonat">=</span>`;
  };
  return `<div class="rcp-tab${platzVor ? ' mit-zug' : ''}">${rang.map((e, i) => {
    const sp = e.wins + e.losses, wr = sp ? e.wins / sp * 100 : 0;
    const w = hi > lo ? 22 + (e.elo - lo) / (hi - lo) * 78 : 100;
    return `<div class="rcp-tab-r${i < 3 ? ' ' + METALL[i] : ''}" data-detail="${esc(e.id)}" style="--w:${w.toFixed(1)}%;--i:${i}">
      <span class="rcp-tab-p num">${i + 1}</span>${chip(zug[i], e)}
      ${rcpAvHtml(e.id, 26, {})}
      <span class="rcp-tab-n">${esc(pname(e.id))}</span>
      <span class="rcp-tab-b" title="${e.wins} Siege, ${e.losses} Niederlagen"><span class="rcp-tab-wl"><i style="width:${wr.toFixed(1)}%"></i></span>
        <small class="num">${e.wins}–${e.losses}</small></span>
      <b class="rcp-tab-e num">${e.elo < 0 ? '−' + Math.abs(e.elo) : e.elo}</b>
    </div>`;
  }).join('')}</div>`;
}

// ── Das Team der Saison ──────────────────────────────────────────────
// Das Duo mit dem größten gemeinsamen Elo-Zuwachs (`seasonTeamOf`, dieselbe
// Rechnung wie der Badge-Zähler), mit seinen Partien als Zellen in
// Spielreihenfolge. Vorher fragte der Rückblick nur die gespeicherte Zeile
// der Saison: fehlte sie, gab es kein Team der Saison, obwohl die Rechnung
// eins kannte. Ein Duo hat keinen Rang, also keine Wappen, sondern das Paar.
function rcpTeamHtml(sid, ms){
  let t = null;
  try { t = seasonTeamOf(sid); } catch(e){ t = null; }
  if(!t || !t[0] || !t[1] || !pmap()[t[0]] || !pmap()[t[1]]) return '';
  const [a, b] = t;
  const paar = (x, y) => (x === a && y === b) || (x === b && y === a);
  const zusammen = (ms || []).filter(m => paar(m.a1, m.a2) || paar(m.b1, m.b2))
    .slice().sort((x, y) => mts(x) - mts(y));
  if(!zusammen.length) return '';
  const sieg = m => paar(m.a1, m.a2) ? m.winner === 'A' : m.winner === 'B';
  const w = zusammen.filter(sieg).length, l = zusammen.length - w;
  let elo = 0;
  try { elo = Math.round((((getGlobalSim().seasonTeamElo || {})[sid]) || {})[paarKey(a, b)] || 0); } catch(e){ elo = 0; }
  return `<div class="rcp-team klick" data-team="${esc(paarKey(a, b))}">
    <div class="rcp-team-l">${svgI('users')}Team der Saison</div>
    <div class="rcp-team-m">${rcpPaarHtml([a, b], 46)}
      <span class="rcp-team-t"><b>${esc(pname(a))} &amp; ${esc(pname(b))}</b>
        <small class="num">${zusammen.length} Partien · ${w}:${l}</small></span>
      <span class="rcp-team-e"><b class="num ${elo >= 0 ? 'auf' : 'ab'}">${elo >= 0 ? '+' : '−'}${Math.abs(elo)}</b><small>Elo zusammen</small></span>
    </div>
    <div class="srn-z">${zusammen.map((m, i) => `<i class="${sieg(m) ? 'w' : 'l'}" style="--i:${i}"></i>`).join('')}</div>
  </div>`;
}

// ── Was nachkommt ────────────────────────────────────────────────────
// Die Wirkung auf die Laufbahn braucht zwei Prestige-Stände, die Rekorde
// einer Woche zwei Rekordstände — Zeitschnitte, die sonst niemand fragt.
// Im Blatt gerechnet öffnete der Wochenrückblick gemessen 280 ms nach dem
// Tippen statt 20 ms, auf dem Telefon ein Vielfaches, und so lange stand
// nichts da [§C43]. Das Blatt öffnet deshalb ohne sie, mit einem ruhigen
// Platzhalter, und sie kommen, wenn es eingefahren ist — stellt der
// Rückblick vor, erst nach dem ersten Bildschirm der Vorstellung
// (`_vorstellungRest`), und dann wie alles darunter beim Hereinscrollen.
// Ist es inzwischen ein anderes Blatt, fallen sie weg. `binden` bekommt den
// neuen Teil.
const RCP_SPAET_MS = 380;
function rcpSpaetHtml(){
  return '<div class="rcp-spaet" data-rcp-spaet aria-busy="true"><i></i><i></i><i></i><i></i></div>';
}
function rcpSpaetLaden(wurzel, bau, binden){
  const box = wurzel && wurzel.querySelector('[data-rcp-spaet]');
  if(!box) return;
  setTimeout(() => {
    if(!box.isConnected) return;
    let html = '';
    try { html = bau() || ''; } catch(e){ html = ''; }
    if(!box.isConnected) return;
    const da = document.createElement('div');
    da.className = 'rcp-spaet-da';
    da.innerHTML = html;
    box.replaceWith(da);
    _vorstellungNach(da, box);
    if(binden) binden(da);
  }, Math.max(RCP_SPAET_MS, _vorstellungRest(wurzel)));
}

// ── Die Wirkung auf die Laufbahn ─────────────────────────────────────
// Was ein Zeitraum an Prestige gebracht oder gekostet hat, je Spieler und
// nach den drei Quellen [§C34]: Auszeichnungen Violett, Monatschroniken
// Gold, Rekorde Silber — die Farben der Aufschlüsselung im Blatt einer
// Stufe [§C27]. Was verloren ging (ein Rekord geteilt oder abgegeben),
// steht links der Null in Rot [§C25]. Darüber, wer dadurch ein neues
// Zeichen trägt. Vorher sagte kein Rückblick, was der Monat für die
// Laufbahnen bedeutete: Rekorde, Chroniken und Auszeichnungen standen als
// Listen da, ihre Summe nirgends.
// Zwei Stände, wie überall, wo eine Änderung gezeigt wird [§11.0e]: vor dem
// Zeitraum und an seinem Ende. Ein Zeitraum zeigt, wer darin sichtbar ist
// [§C40]; ein Ruheständler bewegt sich nicht mehr und fällt heraus.
// `posten` sind die Auszeichnungen des Zeitraums aus denselben zwei Ständen:
// wie oft jede dazukam und was sie brachte. Die Säulen darüber lasen sie
// zuerst aus den Verleihungen der Ehrung-Story, und die kennt nur, was an
// einer Partie hängt — Spieler der Woche und des Tages, Team der Saison und
// Sammler fehlten, und bei Julian standen in den Säulen 344 Prestige aus
// Auszeichnungen, in der Laufbahn 633.
function rcpLaufbahnDaten(vonMs, bisMs){
  const A = _storyStand(vonMs - 1), B = _storyStand(bisMs);
  const BADGE = new Map(BADGES.map(b => [b.id, b]));
  return (players || []).filter(p => sichtbar(p)).map(p => {
    const w = _prestigeWirkung(p.id, A, B);
    const teile = {auszeichnung:w.delta - w.rekordDelta - w.monatDelta, monat:w.monatDelta, rekord:w.rekordDelta};
    const lage = (st, gr, pt) => ({stufe:st | 0, grad:gr | 0, punkte:pt});
    const je = st => { const o = {};
      (((st.prestige(p.id) || {}).quellen) || []).forEach(q => { if(q.q === 'auszeichnung') o[q.id] = q; });
      return o; };
    const a = je(A), b = je(B);
    const posten = Object.keys(b).map(id => {
      const mal = (b[id].mal || 0) - ((a[id] || {}).mal || 0);
      const pt = Math.round(((b[id].p || 0) - ((a[id] || {}).p || 0)) * 10) / 10;
      const def = BADGE.get(id) || {};
      return {id, name:b[id].name || def.name || id, ic:def.ic || 'medal', klasse:rarityOf(id), mal, bis:b[id].mal || 0, p:pt};
    }).filter(q => q.mal > 0 && q.p > 0);
    return {pid:p.id, delta:w.delta, vor:w.vor, nach:w.nach, teile, posten,
            von:lage(w.stufeVor, w.gradVor, w.vor), zu:lage(w.stufeNach, w.gradNach, w.nach)};
  });
}
// Die Grenzen eines Monats für seine Laufbahn [§C31]. Er beginnt eine
// Millisekunde nach Mitternacht des Ersten: ist der ein Montag, schließt um
// 00:00 die Woche davor, und ihr Spieler der Woche gehört ihr — gezählt ab
// Mitternacht stand er im Rückblick des Monats und im Monat davor. Endet
// der Monat an einem Sonntag, endet mit ihm die Woche, und er zählt bis zu
// ihrem Schluss am Montag um 00:00: ihre Ehrung trägt dann der Monat
// (`_ehrungGroessere`), mit dem Spieler der Woche. Der Rückblick und die
// Ehrung des Monats lesen dieselben Grenzen [§C27].
function rcpMonatGrenzen(sid){
  const von = seasonStart(sid).getTime(), S = seasonEnd(sid).getTime();
  return {von:von + 1, bis:wochenBeginn(S + 1).getTime() === S + 1 ? S + 1 : S};
}
// Die neuen Zeichen: wer eine Stufe oder einen Grad weiter oder zurück
// steht, in der Form der Insignium-Karte (`_insBewegungenHtml`).
function rcpZeichenZuege(daten){
  return daten.map(x => {
    const a = insigniumPos(x.von), b = insigniumPos(x.zu);
    if(a === b) return null;
    const art = x.zu.stufe > x.von.stufe ? 'auf' : b > a ? 'grad' : 'ab';
    return {pid:x.pid, art, vor:x.von, nach:x.zu};
  }).filter(Boolean).sort(_insZugVor);
}
const RCP_QUELLEN = [['auszeichnung', 'Auszeichnungen'], ['monat', 'Monatschroniken'], ['rekord', 'Rekorde']];
function rcpLaufbahnHtml(daten){
  const l = (daten || []).filter(x => x.delta || Object.values(x.teile).some(Boolean))
    .sort((a, b) => b.delta - a.delta || pname(a.pid).localeCompare(pname(b.pid), 'de'));
  if(!l.length) return '';
  const plus = x => RCP_QUELLEN.reduce((n, [k]) => n + Math.max(0, x.teile[k]), 0);
  const minus = x => RCP_QUELLEN.reduce((n, [k]) => n + Math.max(0, -x.teile[k]), 0);
  const P = Math.max(0, ...l.map(plus)), M = Math.max(0, ...l.map(minus));
  const ganz = Math.max(1, P + M), null0 = M / ganz * 100;
  const pct = v => (v / ganz * 100).toFixed(2) + '%';
  const summe = {};
  RCP_QUELLEN.forEach(([k]) => { summe[k] = l.reduce((n, x) => n + x.teile[k], 0); });
  const vz = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
  // Jedes Stück steht an seinem Platz auf der ganzen Bahn: rechts der Null
  // aneinander, was dazukam, links davon, was verloren ging.
  const zeile = (x, i) => {
    let stuecke = '', r = M, li = M;
    RCP_QUELLEN.forEach(([k, name]) => {
      const v = x.teile[k];
      if(v > 0){ stuecke += `<i class="${k}" style="left:${pct(r)};width:${pct(v)}" title="${name} ${vz(v)}"></i>`; r += v; }
      else if(v < 0){ li += v; stuecke += `<i class="${k} weg" style="left:${pct(li)};width:${pct(-v)}" title="${name} ${vz(v)}"></i>`; }
    });
    return `<div class="rcp-lb-z" data-laufbahn="${esc(x.pid)}" style="--i:${i}">
      ${rcpAvHtml(x.pid, 24, {})}<span class="rcp-lb-n">${esc(pname(x.pid))}</span>
      <span class="rcp-lb-b"><u style="left:${null0.toFixed(2)}%"></u>${stuecke}</span>
      <b class="rcp-lb-d num ${x.delta > 0 ? 'auf' : x.delta < 0 ? 'ab' : ''}">${vz(x.delta)}</b>
    </div>`;
  };
  return `<div class="rcp-lb">${l.map(zeile).join('')}</div>
    <div class="rcp-lb-leg">${RCP_QUELLEN.map(([k, name]) => `<span class="${k}"><u></u>${name}`
      + ` <b class="num">${vz(summe[k])}</b></span>`).join('')}</div>`;
}

// ── Die Rekorde eines Zeitraums nach ihren Haltern ───────────────────
// Wer in diesem Monat welche Liga-Rekorde geholt hat, je Spieler eine
// Gruppe: das Gesicht, die Zahl, darunter jeder Rekord mit seinem Zeichen
// und dem, was passiert ist. Neununddreißig Zeilen untereinander waren
// vier Bildschirme, und ob ein Spieler den Monat beherrscht hatte, musste
// man aus den Namen darunter zusammenzählen. Ein geteilter Rekord steht bei
// jedem seiner Halter. Die Zeichen sind Metall: Gold trägt hier der Sieger
// [§C31]. Ein langes Wort im Namen wird kleiner, nicht gebrochen
// (`_awLblLang`, wie in der Award-Kachel [§C27]): „Der Sonntagsschuss"
// endete bei 360 px als „Sonntagsschus" und „s" darunter.
const RCP_REKORD_ART = {neu:'erstmals', geholt:'übernommen', gesteigert:'verbessert'};
function rcpRekordWandHtml(liste){
  const je = {};
  (liste || []).forEach(r => (r.pids || [r.pid]).forEach(pid => {
    if(!pmap()[pid] || !sichtbar(pid)) return;
    (je[pid] = je[pid] || []).push(r);
  }));
  const ids = Object.keys(je).sort((a, b) => je[b].length - je[a].length || pname(a).localeCompare(pname(b), 'de'));
  if(!ids.length) return '';
  const max = je[ids[0]].length;
  return `<div class="rcp-rw">${ids.map((pid, i) => `<div class="rcp-rw-p" style="--i:${i}">
    <div class="rcp-rw-k" data-detail="${esc(pid)}">${rcpAvHtml(pid, 28, {})}<b>${esc(pname(pid))}</b>
      <span class="rcp-rw-s" style="--w:${(je[pid].length / max * 100).toFixed(1)}%"><i></i></span>
      <em class="num">${je[pid].length}</em></div>
    <div class="rcp-rw-l">${je[pid].map(r => `<span class="rcp-rw-r ${esc(r.art)}" data-chron="${esc(r.id)}">`
      + `${zkHtml(r.ic, 'k', '')}<span><b class="${_awLblLang(r.name).trim()}">${esc(r.name)}</b><small>${esc(RCP_REKORD_ART[r.art] || '')}${
        r.zeit ? ' · ' + esc(r.zeit) : ''}</small></span></span>`).join('')}</div>
  </div>`).join('')}</div>`;
}
// Die Arten als Zahlen über der Wand: was an Rekorden neu, übernommen oder
// verbessert wurde.
function rcpRekordArtenHtml(liste){
  const n = {};
  (liste || []).forEach(r => { n[r.art] = (n[r.art] || 0) + 1; });
  const teile = ['geholt', 'gesteigert', 'neu'].filter(k => n[k]);
  return teile.length ? `<div class="rcp-rw-arten">${teile.map(k =>
    `<span class="${k}"><b class="num">${n[k]}</b> ${RCP_REKORD_ART[k]}</span>`).join('')}</div>` : '';
}

// ── Die Beinamen eines Monats ────────────────────────────────────────
// Je Spieler der eine Eintrag, der in seinem Profil steht und fürs Prestige
// zählt [§C32], auf dem Band, das er dort trägt (`.pp-banner`) [§C27];
// darunter der Beleg. Ohne Lauflicht: zehn Bänder untereinander mit je einem
// Glanz wären zehn Schimmer ohne Aussage. Die Schattenseiten tragen kein Band
// — das Band ist ein Titel [§C39] —, sie stehen klein und rot darunter.
// Was jemand darüber hinaus anführte, klappt auf.
function rcpBeinamenHtml(T){
  if(!T || !T.awarded || !T.awarded.length) return {html:'', zahl:0};
  const schatten = a => (_chronikMonat(a.titleId) || {}).art === 'schatten';
  const eintrag = new Set([...new Set(T.awarded.map(a => a.pid))].map(pid => chronikEintragVon(T, pid)));
  const zaehlt = [], neg = [], weitere = [];
  T.awarded.forEach(a => {
    if(!pmap()[a.pid]) return;
    if(schatten(a)){ neg.push(a); return; }
    (eintrag.has(a) ? zaehlt : weitere).push(a);
  });
  const band = a => {
    const t = titleTone(a.tone);
    return `<div class="rcp-bn" data-tplayer="${esc(a.pid)}">
      ${rcpAvHtml(a.pid, 48, {})}
      <span class="rcp-bn-t"><span class="pp-banner" style="--tt:${t.c};--ttr:${t.rgb}">
        <span class="pp-title-pill"><span class="i">${svgI(a.ic)}</span>${esc(a.name)}</span></span>
        <small><b>${esc(pname(a.pid))}</b>${a.ev ? ' · ' + esc(a.ev) : ''}</small></span>
    </div>`;
  };
  const zeile = a => rcpZeileHtml({ic:a.ic, ton:a.tone, name:a.name, sub:pname(a.pid) + (a.ev ? ' · ' + a.ev : ''),
    attr:`data-tplayer="${esc(a.pid)}"`});
  const html = (zaehlt.length ? `<div class="rcp-bns">${zaehlt.map(band).join('')}</div>` : '')
    + (neg.length ? `<div class="rcp-bn-neg">${neg.map(a => `<span data-tplayer="${esc(a.pid)}">`
        + `${zkHtml(a.ic, 'k', 'rot')}<span><b>${esc(a.name)}</b><small>${esc(pname(a.pid))}</small></span></span>`).join('')}</div>` : '')
    + (weitere.length ? `<div class="rcp-liste chron-rest">${weitere.map(zeile).join('')}</div>`
        + _chronMehrKnopf(weitere.length) : '');
  return {html, zahl:zaehlt.length};
}

// ── Die Auszeichnungen eines Zeitraums ───────────────────────────────
// Die Säulen der Ehrung [§C27]: je Geehrtem sein Prestige aus
// Auszeichnungen, gestapelt nach Klassen, auf seinem Wappen, darüber die
// wertvollste als Zeichenkachel; darunter, was jede Klasse gebracht hat.
// Still, ohne Lauflicht (`still`). Die Posten kommen aus den Ständen der
// Laufbahn (`rcpLaufbahnDaten`): die Säule eines Spielers ist genau der
// violette Teil seiner Zeile dort.
function rcpEhrungHtml(daten){
  const ORD = {legendary:0, rare:1, common:2};
  const sp = (daten || []).filter(x => x.posten && x.posten.length).map(x => ({pid:x.pid,
    summe:Math.round(x.posten.reduce((n, q) => n + q.p, 0) * 10) / 10,
    posten:x.posten.slice().sort((a, b) => (ORD[a.klasse] - ORD[b.klasse]) || (b.p - a.p) || a.name.localeCompare(b.name, 'de'))}))
    .sort((a, b) => b.summe - a.summe || pname(a.pid).localeCompare(pname(b.pid), 'de'));
  if(!sp.length) return {html:'', zahl:0};
  const klassen = _ehrungKlassen(sp);
  const zahl = klassen.reduce((n, z) => n + z.n, 0);
  return {zahl, html:`<div class="rcp-eh">${_ehrungSaeulen(sp, true, {still:true})}</div>`
    + (klassen.length ? `<div class="eh-fuss rcp-eh-k">${klassen.map(_ehrungKlasseHtml).join('')}</div>` : '')};
}
