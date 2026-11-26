// ═══════════════════════════════════════════════════════════════════════
// [§C33] DAS BILD EINES FUN FACTS
// ═══════════════════════════════════════════════════════════════════════
// Jeder Fun Fact trug dieselbe Form: eine große Zahl links, der Satz rechts.
// „3 Tage ohne Spiel", „41 Awards", „3830 Prestige" und „7:2 Duelle" standen
// untereinander und sahen gleich aus — die Pause wie die Vitrine, das Duell
// wie das Prestige. Jede Vorlage legt jetzt die Daten ihres Bilds in
// `dataRef.bild` [28-news-ambient], und hier wird daraus der Kopf ihres
// Anlasses: das Rennen der ersten drei, das Tauziehen zweier Spieler, der Lauf
// eines Duos, die Tage der Pause, die Vitrine, die Stufe der Leiter, die zwei
// Rollen, die Verteilung der Ergebnisse, die Säulen der Spieltage, der Platz
// im Feld, die Tafel des Monats und das Zählwerk.
//
// Gezeichnet wird nur, was gespeichert ist — ein Fun Fact ist eine Ziehung
// und erzählt vom Tag, an dem er stand. Eine ältere Karte ohne `bild` behält
// ihre Zahl links. Die Bilder sind leise wie die Karte [§C25]: Metall, die
// Farbe ihrer Familie (`--story`) nur am Ersten und an dem, worum es geht.
//
// Jedes Bild nennt die Namen seiner Spieler im Text, nicht nur als Gesicht:
// wer den Feed überfliegt, will wissen, wer gemeint ist, und ein Gesicht mit
// zwei Buchstaben sagt das nicht [§C33]. Kein Name wird gekürzt; er bricht um.

function _ffChip(pid){ const p = pmap()[pid]; return p ? avHtml(p, '', {}) : ''; }
function _ffNm(pid){ return `<span class="ff-nm">${esc(_spName(pid))}</span>`; }
// Eine Zahl, wie sie im Satz steht: ganz, ab fünf Stellen mit Tausenderpunkt
// (`tausender` [§C27]). `_spZahl` setzte den Punkt schon ab vier, und auf
// der Karte stand „1.000" über „1000 Games" in der Schlagzeile.
function _ffZl(v){ return tausender(String(Math.round(Number(v) || 0))); }
function _ffPct(x){ return Math.max(0, Math.min(100, Math.round((Number(x) || 0) * 1000) / 10)); }

function _faktBild(s, gross){
  const d = (s && s.dataRef) || {};
  // Die Pause ist kein Fun Fact aus dem Slot, sie trägt ihre Zahlen aber
  // schon im `dataRef` [27-news-generator].
  if(d.type === 'dry_spell') return _ffPause(d);
  const b = d.bild;
  if(!b || typeof b !== 'object') return '';
  const f = _FF_FORM[b.f];
  if(!f) return '';
  let h = '';
  try { h = f(b, d) || ''; } catch(e){ h = ''; }
  return h ? `<div class="ff ff-${esc(b.f)}${gross ? ' gross' : ''}">${h}</div>` : '';
}

// ── Das Rennen: die ersten drei als Balken ──────────────────────────────
// Die Breite rechnet die Vorlage aus; hier steht nur, wie lang.
function _ffRennen(b){
  const r = (b.r || []).filter(x => pmap()[x.p]);
  if(!r.length) return '';
  return r.map((x, k) => `<div class="ff-r${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x.p)}`
    + `<span class="ff-r-m">${_ffNm(x.p)}<span class="ff-bar"><i style="width:${_ffPct(x.w)}%"></i></span></span>`
    + `<b class="num">${esc(String(x.t))}</b></div>`).join('');
}

// ── Das Podest: Platz zwei, eins, drei, die Höhe nach dem Platz ─────────
// Für einen Bestwert der Liga: wer ihn hält, steht oben, und die beiden
// dahinter stehen daneben. Wie bei jedem Podest der App [§C27] ist die Höhe
// der Platz und nicht der Wert; den nennt die Zahl im Sockel. Mit `ins` trägt
// jeder sein Wappen — beim Prestige ist das Zeichen die Aussage.
function _ffPodest(b){
  const pm = pmap(), r = (b.r || []).filter(x => pm[x.p]);
  if(!r.length) return '';
  const folge = r.length >= 3 ? [1, 0, 2] : r.length === 2 ? [1, 0] : [0];
  return `<div class="ff-pd">` + folge.map(k => `<span class="ff-pd-s p${k + 1}" style="--k:${k}">`
    + (b.ins ? avHtml(pm[r[k].p], '', {ins:true, px:48, feuer:0}) : _ffChip(r[k].p))
    + `${_ffNm(r[k].p)}<em><b class="num">${esc(String(r[k].t))}</b><small class="num">${k + 1}</small></em></span>`).join('') + `</div>`;
}

// ── Die Sammlung: jeder Titel ein Feld ──────────────────────────────────
// Eine Anzahl ist keine Quote: sie wächst mit jedem Titel, und genau das
// zeigt die Reihe — siebzehn Felder sind siebzehn Tage.
function _ffSammlung(b){
  const r = (b.r || []).filter(x => pmap()[x.p]);
  if(!r.length) return '';
  return r.map((x, k) => {
    const n = Math.max(0, x.n | 0), z = Math.min(n, 30);
    return `<div class="ff-sm${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x.p)}<span class="ff-r-m">${_ffNm(x.p)}`
      + `<span class="ff-zl">${'<i class="w"></i>'.repeat(z)}${n > z ? '<i class="mehr"></i>' : ''}</span></span>`
      + `<b class="num">${esc(String(x.t))}</b></div>`;
  }).join('');
}

// ── Die Sterne: Meistertitel wie am Zeichen [§C26] ─────────────────────
// Höchstens fünf, dann die Zahl — dieselbe Regel wie unter dem Wappen.
function _ffSterne(b){
  const r = (b.r || []).filter(x => pmap()[x.p]);
  if(!r.length) return '';
  const stern = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.7l-5.6 3.1 1.3-6.2L3 9.3l6.3-.7z"/></svg>';
  return r.map((x, k) => {
    const n = Math.max(0, x.n | 0);
    return `<div class="ff-sn${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x.p)}${_ffNm(x.p)}`
      + `<span class="ff-sn-s">${stern.repeat(Math.min(5, n))}${n > 5 ? `<b class="num">${n}</b>` : ''}</span></div>`;
  }).join('');
}

// ── Das Zählwerk einer Summe: die Ziffern des Ersten, der Zweite dahinter
function _ffZahl(b){
  const pm = pmap();
  if(!pm[b.p]) return '';
  const z = b.zweiter && pm[b.zweiter.p] ? b.zweiter : null;
  return `<div class="ff-zw"><span class="ff-zw-z">${String(b.n | 0).split('').map((c, i) => `<i class="num" style="--k:${i}">${c}</i>`).join('')}</span>`
    + `<span class="ff-zw-m"><span class="ff-zw-p">${_ffChip(b.p)}${_ffNm(b.p)}</span>`
    + (z ? `<small class="num">+${(b.n | 0) - (z.n | 0)} vor <b>${esc(_spName(z.p))}</b> mit ${z.n | 0}</small>` : '') + `</span></div>`;
}

// ── Das Tauziehen zweier Spieler ────────────────────────────────────────
function _ffDuell(b){
  const pm = pmap();
  if(!pm[b.a] || !pm[b.b]) return '';
  const n = (b.wa | 0) + (b.wb | 0);
  const pa = n ? Math.round((b.wa | 0) / n * 100) : 50;
  return `<div class="ff-dl"><span class="ff-dl-s${b.wa >= b.wb ? ' vorn' : ''}">${_ffChip(b.a)}<b class="num">${b.wa | 0}</b></span>`
    + `<span class="ff-dl-bar"><i style="width:${pa}%"></i></span>`
    + `<span class="ff-dl-s re${b.wb > b.wa ? ' vorn' : ''}"><b class="num">${b.wb | 0}</b>${_ffChip(b.b)}</span></div>`
    + `<div class="ff-dl-n">${_ffNm(b.a)}<small class="num">${n} Sätze</small>${_ffNm(b.b)}</div>`;
}

// ── Ein Duo: zwei Gesichter, darunter jede gemeinsame Partie oder der Lauf
function _ffDuo(b){
  const pm = pmap();
  if(!pm[b.a] || !pm[b.b]) return '';
  let zellen = '', zahl = '';
  if(b.g){
    const g = Math.min(40, b.g | 0), w = Math.round((b.w | 0) / (b.g | 0) * g);
    zellen = Array.from({length:g}, (_, i) => `<i class="${i < w ? 'w' : ''}"></i>`).join('');
    zahl = `${b.w | 0} von ${b.g | 0}`;
  } else if(b.lauf){
    const best = Math.max(b.lauf | 0, b.best | 0), zeig = Math.min(20, best);
    zellen = Array.from({length:zeig}, (_, i) => `<i class="${i < Math.min(zeig, b.lauf | 0) ? 'w' : 'ziel'}"></i>`).join('');
    zahl = (b.lauf | 0) >= best ? `${b.lauf | 0} in Serie` : `${b.lauf | 0} von ${best}`;
  }
  return `<div class="ff-duo"><span class="ff-duo-k">${_ffChip(b.a)}${_ffChip(b.b)}</span>`
    + `<span class="ff-duo-m"><span class="ff-duo-n">${_ffNm(b.a)}<i>und</i>${_ffNm(b.b)}</span>`
    + `<span class="ff-zl">${zellen}</span></span><b class="num">${esc(zahl)}</b></div>`;
}

// ── Die Pause: ein Feld je Tag seit der letzten Partie ──────────────────
// Die letzte Partie hell, die Tage danach leer, und wo die längste Pause der
// Liga endete, eine Marke — so sieht man, ob es knapp wird.
function _ffPause(d){
  const n = Math.max(0, d.daysSince | 0), rek = Math.max(0, d.maxGapDays | 0);
  if(!n) return '';
  const len = Math.min(28, Math.max(n, rek) + 1);
  const zellen = Array.from({length:len}, (_, i) => i === 0 ? '<i class="sp"></i>'
    : `<i class="${i <= n ? 'still' : ''}${i === rek && rek < len ? ' pz-max' : ''}"></i>`).join('');
  return `<div class="ff ff-pause"><span class="ff-zl">${zellen}</span>`
    + `<div class="ff-pz-l"><span>letzter Satz</span>`
    + (rek && rek !== n ? `<span>längste Pause: <b class="num">${rek}</b> Tage</span>` : '') + `</div></div>`;
}

// ── Die Vitrine: jede Auszeichnung des Katalogs als Feld ────────────────
// Neue Karten zählen jedes Mal (`gesamt`, je Auszeichnung `n`): ein Feld
// leuchtet so stark, wie oft sie geholt wurde, und die große Zahl ist die
// Summe. Gespeicherte Karten ohne `gesamt` zeigen weiter „41 von 50".
function _ffVitrine(b){
  const pm = pmap();
  if(!pm[b.p]) return '';
  const hat = new Set(b.hat || []), n = b.n || {};
  const kat = b.gold ? BADGES.filter(x => rarityOf(x.id) === 'legendary') : BADGES;
  const max = Math.max(1, ...kat.map(x => Number(n[x.id]) || 0));
  const st = x => b.gesamt && hat.has(x.id)
    ? ` style="--a:${(0.45 + 0.55 * Math.log1p(Number(n[x.id]) || 1) / Math.log1p(max)).toFixed(2)}"` : '';
  const felder = kat.map(x => `<i class="${hat.has(x.id) ? 'hat ' + rarityOf(x.id) : ''}"${st(x)}>${svgI(x.ic || 'trophy')}</i>`).join('');
  const zahl = b.gesamt ? `${_spZahl(b.gesamt)}<small> geholt</small>` : `${hat.size}<small> von ${kat.length}</small>`;
  return `<div class="ff-vt-k">${_ffChip(b.p)}${_ffNm(b.p)}<b class="num">${zahl}</b></div>`
    + `<span class="ff-vt${b.gold ? ' gold' : ''}">${felder}</span>`;
}

// ── Die Medaille: die zuletzt vergebene goldene Auszeichnung ────────────
function _ffMedaille(b){
  const pm = pmap(), x = BADGES.find(y => y.id === b.b);
  if(!pm[b.p] || !x) return '';
  const alle = Object.keys(pm).filter(id => sichtbar(pm[id])).length;
  const n = Math.max(1, Math.min(alle, b.n | 0));
  return `<div class="ff-md"><span class="ff-md-z">${zkHtml(x.ic || 'trophyStar', 'g', 'viol')}${_ffChip(b.p)}</span>`
    + `<span class="ff-md-m"><b>${esc(x.name)}</b>${_ffNm(b.p)}`
    + `<span class="ff-pk">${Array.from({length:alle}, (_, i) => `<i class="${i < n ? 'hat' : ''}"></i>`).join('')}</span>`
    + `<small class="num">${n} von ${alle} tragen sie</small></span></div>`;
}

// ── Die Stufe: das Zeichen von jetzt, der Weg, das nächste ──────────────
function _ffStufe(b){
  const pm = pmap();
  if(!pm[b.p]) return '';
  const rang = (getPlayerRank(b.p) || {}).label;
  const z = k => { try { return insigniumStufeSvg(k, rang, 0, {bild:true}) || ''; } catch(e){ return ''; } };
  const sp = Math.max(1, (b.nachMin | 0) - (b.vonMin | 0));
  const anteil = Math.max(0, Math.min(1, ((b.punkte | 0) - (b.vonMin | 0)) / sp));
  const name = k => ((INSIGNIEN.find(x => x.key === k) || {}).name || '');
  return `<div class="ff-st"><span class="ff-st-z">${z(b.von)}<small>${esc(name(b.von))}</small></span>`
    + `<span class="ff-st-m">${_ffNm(b.p)}<span class="ff-bar"><i style="width:${(anteil * 100).toFixed(1)}%"></i></span>`
    + `<small class="num">${b.punkte | 0} von ${b.nachMin | 0}</small></span>`
    + `<span class="ff-st-z naechst">${z(b.nach)}<small>${esc(name(b.nach))}</small></span></div>`;
}

// ── Das Ziel: der eigene Stand gegen den Bestwert ───────────────────────
function _ffZiel(b){
  const pm = pmap();
  if(!pm[b.p]) return '';
  const halter = (b.halter || []).filter(id => pm[id]);
  return `<div class="ff-zi">${zkHtml(b.ic || 'trophy', '', '')}<span class="ff-zi-m">`
    + `<span class="ff-zi-r">${_ffChip(b.p)}${_ffNm(b.p)}<b class="num">${esc(b.mein || '')}</b><span class="ff-bar"><i style="width:${_ffPct(b.nah)}%"></i></span></span>`
    + (halter.length ? `<span class="ff-zi-r halter"><span class="sp-chips">${halter.map(_ffChip).join('')}</span><span class="ff-nms">${halter.map(_ffNm).join('')}</span>`
      + `<b class="num">${esc(b.stand || '')}</b><span class="ff-bar"><i style="width:100%"></i></span></span>` : '')
    + `</span></div>`;
}

// ── Die Seiten: Drive und Revés, um eine gemeinsame Mitte ────────────────
function _ffRolle(b){
  if(!pmap()[b.p]) return '';
  const s = Math.max(0, Math.min(100, b.s | 0)), a = Math.max(0, Math.min(100, b.a | 0));
  const stark = Math.abs(s - a) < 10 ? '' : s > a ? 's' : 'a';
  return `<div class="ff-rl-k">${_ffChip(b.p)}${_ffNm(b.p)}</div>`
    + `<div class="ff-rl${stark ? ' st-' + stark : ''}"><span class="ff-rl-l"><b class="num">${s} %</b><small>Drive · ${b.gs | 0} Sätze</small></span>`
    + `<span class="ff-rl-b"><span><i class="s" style="width:${s}%"></i></span><span><i class="a" style="width:${a}%"></i></span></span>`
    + `<span class="ff-rl-r"><b class="num">${a} %</b><small>Revés · ${b.ga | 0} Sätze</small></span></div>`;
}

// ── Die Verteilung der Satzergebnisse 6:0 bis 7:6 ───────────────────────
const FF_SAETZE = ['6:0', '6:1', '6:2', '6:3', '6:4', '7:5', '7:6'];
function _ffVerteilung(b){
  const je = (b.je || []).map(x => x | 0);
  if(je.length !== FF_SAETZE.length) return '';
  const max = Math.max(1, ...je), hl = new Set(b.hl || []);
  return `<span class="ff-vs">${je.map((n, i) => `<span class="${hl.has(i) ? 'hl' : ''}" style="--k:${i}">`
    + `<b class="num">${n}</b><em><i style="height:${Math.max(n ? 4 : 0, n / max * 100).toFixed(1)}%"></i></em><small class="num">${FF_SAETZE[i]}</small></span>`).join('')}</span>`;
}

// ── Säulen der Spieltage oder Wochen, die gemeinte hervorgehoben ─────────
function _ffSaeulen(b){
  const v = (b.v || []).map(x => x | 0);
  if(v.length < 2) return '';
  const max = Math.max(1, ...v), hl = new Set(b.hl || []);
  return `<span class="ff-sa${b.still ? ' still' : ''}">${v.map((n, i) => `<i class="${hl.has(i) ? 'hl' : ''}" style="height:${Math.max(6, n / max * 100).toFixed(1)}%;--k:${i}"></i>`).join('')}</span>`
    + `<div class="ff-sa-l"><span>${esc(b.l || '')}</span><span>die letzten ${v.length}</span></div>`;
}

// ── Der Platz im Feld: ein Punkt je Spieler, das eigene Gesicht an seinem
function _ffPlatz(b){
  if(!pmap()[b.p]) return '';
  const von = Math.max(1, Math.min(30, b.von | 0)), pl = Math.max(1, Math.min(von, b.platz | 0));
  return `<div class="ff-pl">${Array.from({length:von}, (_, i) => i + 1 === pl
      ? `<span class="ich">${_ffChip(b.p)}</span>` : `<i class="${i + 1 < pl ? 'vor' : ''}"></i>`).join('')}</div>`
    + `<div class="ff-pl-l">${_ffNm(b.p)}<span><b class="num">Platz ${pl}</b> von ${von}${b.t ? ' · ' + esc(b.t) : ''}</span></div>`;
}

// ── Die Tafel des Monats: jeder Eintrag ein Feld, die Träger daneben ────
function _ffTafel(b){
  const alle = Math.max(1, b.alle | 0), voll = Math.max(0, Math.min(alle, b.voll | 0));
  const tr = (b.traeger || []).filter(x => pmap()[x[0]]);
  return `<div class="ff-tf"><span class="ff-zl dicht">${Array.from({length:alle}, (_, i) => `<i class="${i < voll ? 'w' : ''}"></i>`).join('')}</span>`
    + `<span class="ff-tf-l"><b class="num">${voll}</b><small>von ${alle} vergeben</small></span></div>`
    + (tr.length ? `<div class="ff-tf-t">${tr.map(x => `<span>${_ffChip(x[0])}${_ffNm(x[0])}<b class="num">${x[1]}</b></span>`).join('')}</div>` : '');
}

// ── Die Halbzeit: die beiden Seiten des Monats nebeneinander ──────────
// Je Seite die drei mit der besten Siegquote im Monat, dieselbe Zeile wie
// das Rennen [§C27]: Gesicht, Name, Balken der Quote, die Quote. Revés
// links, Drive rechts wie auf dem Court [§C44]; der Erste jeder Seite in
// der Farbe der Karte.
function _ffHalbzeit(b){
  const seite = (l, ic, wort) => {
    const z = (l || []).filter(x => pmap()[x[0]]);
    if(!z.length) return '';
    return `<div class="ff-hz-s"><div class="ff-hz-k">${svgI(ic)}<b>${wort}</b></div>`
      + z.map((x, k) => { const q = x[2] ? Math.round(x[1] / x[2] * 100) : 0;
        return `<div class="ff-r${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x[0])}`
          + `<span class="ff-r-m">${_ffNm(x[0])}<span class="ff-bar"><i style="width:${q}%"></i></span></span>`
          + `<b class="num">${q}\u00a0%</b></div>`; }).join('') + `</div>`;
  };
  const r = seite(b.reves, 'posReves', 'Revés'), d = seite(b.drive, 'posDrive', 'Drive');
  return r && d ? `<div class="ff-hz">${r}${d}</div>` : '';
}

// ── Das Zählwerk: die runde Partie, wer sie gewonnen hat ───────────────
function _ffZaehler(b){
  const ziffern = String(b.n | 0).split('').map((z, i) => `<i class="num" style="--k:${i}">${z}</i>`).join('');
  const s = (b.sieger || []).filter(id => pmap()[id]);
  return `<div class="ff-zw"><span class="ff-zw-z">${ziffern}</span><span class="ff-zw-m">`
    + (s.length ? `<span class="sp-chips">${s.map(_ffChip).join('')}</span><span>${s.map(_ffNm).join('<i>und</i>')}</span>` : '')
    + (b.stand ? `<b class="num">${esc(b.stand)}</b>` : '') + `</span></div>`;
}

// ── Die laufende Serie: derselbe Lauf wie auf der Karte einer Serie [§C27]
function _ffLauf(b){
  if(!pmap()[b.p]) return '';
  return `<div class="ff-lf">${_ffChip(b.p)}${_ffNm(b.p)}</div>${_newsSerienBand(b.n | 0, false, true)}`;
}

// ═══ Die acht Fragen [§C33] ═══════════════════════════════════════════
// Ab hier zeichnet jede Form die Antwort auf genau eine Frage, mit den
// Zahlen, aus denen sie entsteht. Die Formen darüber bleiben stehen, solange
// eine gespeicherte Karte sie tragen kann: eine Karte ist ein Snapshot und
// behält ihr Bild. Jedes Gesicht trägt `data-pid` und öffnet im Blatt das
// Profil. Grün (`--acid`) und Rot stehen nur für eine Richtung [§C25]; was
// keine hat, ist Metall oder die leise Farbe der Karte.
//
// Die Formen stehen als Einträge der Tafel und nicht als eigene Funktionen:
// sie werden nur von hier aus gerufen, und jede Funktion auf oberster Ebene
// teilt sich ihren Namen mit der ganzen App.
// Eine Bahn der Erwartung: der Balken die geholten, der Strich die
// erwarteten, die Zahl rechts. Dieselbe für „mehr Siege als erwartet" und
// die Duo-Chemie [§C27].
function _ffErwartungReihe(wort, ist, erw, von){
  const a = Math.max(0, Math.min(100, ist / von * 100)), e = Math.max(0, Math.min(100, erw / von * 100));
  const lo = Math.min(a, e), hi = Math.max(a, e), mehr = a >= e;
  return `<span class="ff-ew-k">${wort}</span>`
    + `<span class="ff-ew-b"><i class="ist" style="width:${lo.toFixed(1)}%"></i>`
    + `<i class="${mehr ? 'mehr' : 'weniger'}" style="left:${lo.toFixed(1)}%;width:${(hi - lo).toFixed(1)}%"></i>`
    + `<u style="left:${e.toFixed(1)}%"></u><em class="num" style="left:${Math.max(12, Math.min(88, e)).toFixed(1)}%">erwartet ${_ffZl(erw)}</em></span>`
    + `<b class="num">${_ffZl(ist)}<small> von ${_ffZl(von)}</small></b>`;
}
const _FF_FORM = {
  rennen:_ffRennen, podest:_ffPodest, sammlung:_ffSammlung, sterne:_ffSterne, zahl:_ffZahl, duell:_ffDuell, duo:_ffDuo, vitrine:_ffVitrine, medaille:_ffMedaille,
  stufe:_ffStufe, ziel:_ffZiel, rolle:_ffRolle, verteilung:_ffVerteilung, saeulen:_ffSaeulen,
  platz:_ffPlatz, tafel:_ffTafel, zaehler:_ffZaehler, lauf:_ffLauf, halbzeit:_ffHalbzeit,

  // ── 1. Aufwind: die Elo der Sätze als Linie, die vierzehn Tage hell ──
  // Die Summe Satz für Satz, nicht der Stand der Elo: die beginnt jeden
  // Monat neu. Links die Wochen davor in Metall, rechts das Fenster in der
  // Richtung seines Ergebnisses, am Ende das Gesicht. Gezeichnet in einer
  // festen Fläche (260 × 76), die mit der Karte wächst; das Gesicht steht
  // darüber im HTML, damit es rund bleibt, wie breit die Karte auch ist.
  aufwind(b){
    const pm = pmap(), v = (b.v || []).map(Number).filter(isFinite);
    if(!pm[b.p] || v.length < 3) return '';
    const W = 260, H = 76, L = 4, R = 22, O = 15, U = 6, n = v.length - 1;
    const ab = Math.max(1, Math.min(n - 1, b.ab | 0));
    let lo = Math.min(...v), hi = Math.max(...v); if(hi === lo){ hi += 1; lo -= 1; }
    const X = i => L + i * (W - L - R) / n, Y = y => O + (hi - y) * (H - O - U) / (hi - lo);
    const f = x => x.toFixed(1), pfad = (i0, i1) => v.slice(i0, i1 + 1).map((y, k) => (k ? 'L' : 'M') + f(X(i0 + k)) + ' ' + f(Y(y))).join('');
    const hoch = (b.plus | 0) >= 0, id = 'ffa' + _spVisualHash(v.join() + '|' + b.p);
    const flaeche = pfad(ab, n) + `L${f(X(n))} ${H}L${f(X(ab))} ${H}Z`;
    const pc = (x, w) => (x / w * 100).toFixed(2) + '%';
    return `<div class="ff-kopf">${_ffNm(b.p)}<span class="ff-wert${hoch ? ' hoch' : ' tief'}"><b class="num">${esc(_spVz(b.plus | 0))}</b><small>Elo in 14 Tagen</small></span></div>`
      + `<div class="ff-aw"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`
      + `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity=".26"/><stop offset="1" stop-opacity="0"/></linearGradient></defs>`
      + `<line class="ff-aw-g" x1="${L}" x2="${W - R}" y1="${f(Y(v[ab]))}" y2="${f(Y(v[ab]))}"/>`
      + `<path class="ff-aw-f" fill="url(#${id})" d="${flaeche}"/>`
      + `<path class="ff-aw-v" d="${pfad(0, ab)}"/><path class="ff-aw-l" d="${pfad(ab, n)}"/>`
      + `<line class="ff-aw-t" x1="${f(X(ab))}" x2="${f(X(ab))}" y1="2" y2="${H}"/>`
      + `</svg><span class="ff-aw-p" data-pid="${esc(b.p)}" style="left:${pc(X(n), W)};top:${pc(Y(v[n]), H)}">${rcpAvHtml(b.p, 24, {})}</span></div>`
      + `<div class="ff-aw-x" style="grid-template-columns:${ab}fr ${n - ab}fr"><span>davor</span><span>14 Tage</span></div>`;
  },

  // ── 2. Über der Erwartung: Siege und Games, je mit ihrer Marke ───────
  // Der Balken ist das Geholte, die Marke das Erwartete aus der Elo aller
  // vier. Liegt der Balken über der Marke, ist das Stück darüber grün.
  erwartung(b){
    if(!pmap()[b.p] || !(b.n > 0) || !(b.g > 0)) return '';
    const reihe = _ffErwartungReihe;
    // Ganze Siege und eine Beschriftung, die zur Zahl passt: „+3,7 · Siege
    // über der Erwartung" las sich wie eine Formel [§C33].
    const plus = Math.round((b.s | 0) - Number(b.e || 0));
    return `<div class="ff-kopf"><span class="ff-kopf-p" data-pid="${esc(b.p)}">${rcpAvHtml(b.p, 24, {})}${_ffNm(b.p)}</span>`
      + `<span class="ff-wert${plus >= 0 ? ' hoch' : ' tief'}"><b class="num">${esc(_spVz(plus))}</b><small>Siege mehr als erwartet</small></span></div>`
      + `<div class="ff-ew">${reihe('Siege', b.s | 0, Number(b.e) || 0, b.n | 0)}${reihe('Games', b.gf | 0, Number(b.ge) || 0, b.g | 0)}</div>`;
  },

  // ── 3. Form gegen Laufbahn: je Spieler eine Hantel ───────────────────
  // Der leere Punkt ist die Laufbahn davor, der volle die vierzehn Tage,
  // der Steg dazwischen die Richtung. Die Achse beginnt und endet auf vollen
  // Zehnern um die Werte herum: bei 0 bis 100 lagen 59 und 83 % so nah, dass
  // die Hantel ein Punkt war.
  hantel(b){
    const pm = pmap(), r = (b.r || []).filter(x => pm[x[0]]);
    if(!r.length) return '';
    const alle = r.flatMap(x => [x[1], x[2]]);
    let lo = Math.floor(Math.min(...alle) / 10) * 10, hi = Math.ceil(Math.max(...alle) / 10) * 10;
    if(hi - lo < 40){ const m = (lo + hi) / 2; lo = Math.max(0, Math.round((m - 20) / 10) * 10); hi = Math.min(100, lo + 40); lo = hi - 40; }
    const P = x => ((x - lo) / (hi - lo) * 100).toFixed(1);
    return `<div class="ff-ht">` + r.map((x, k) => {
      const hoch = x[2] >= x[1], a = Math.min(x[1], x[2]), e = Math.max(x[1], x[2]);
      return `<div class="ff-ht-r${k ? '' : ' eins'}"><span class="ff-ht-p" data-pid="${esc(x[0])}" style="--k:${k}">${rcpAvHtml(x[0], 22, {})}${_ffNm(x[0])}</span>`
        + `<span class="ff-ht-b" style="--k:${k}"><i class="steg${hoch ? ' hoch' : ' tief'}" style="left:${P(a)}%;width:${(P(e) - P(a)).toFixed(1)}%"></i>`
        + `<i class="pkt l" style="left:${P(x[1])}%"></i><i class="pkt j${hoch ? ' hoch' : ' tief'}" style="left:${P(x[2])}%"></i></span>`
        + `<b class="num">${esc(_spVz(x[2] - x[1]))}</b></div>`;
    }).join('')
      + `<div class="ff-ht-r ff-ht-a"><span></span><span class="ff-ht-s num"><span>${lo}\u00a0%</span><span>${hi}\u00a0%</span></span><span></span></div>`
      + `<div class="ff-ht-lg"><span><i class="l"></i>Laufbahn davor</span><span><i class="j"></i>14 Tage</span></div></div>`;
  },

  // ── 4. Marke in Sicht: ein Ring von der letzten Marke bis zur nächsten
  // Das Gesicht in der Mitte, daneben der Rest groß und die Marke darunter.
  // Beim Prestige steht das Zeichen der nächsten Schwelle dabei.
  marke(b){
    const pm = pmap();
    if(!pm[b.p] || !(b.ziel > b.von)) return '';
    const anteil = Math.max(0, Math.min(1, (b.ist - b.von) / (b.ziel - b.von)));
    const R = 30, U = 2 * Math.PI * R, rest = Math.max(0, Math.round(b.ziel - b.ist));
    const was = {saetze:`bis zum ${_ffZl(b.ziel)}. Satz`, siege:`bis zum ${_ffZl(b.ziel)}. Sieg`,
      games:`bis zum ${_ffZl(b.ziel)}. gewonnenen Game`, prestige:`Prestige bis zum ${b.name || ''}`}[b.art] || '';
    let zeichen = '';
    if(b.art === 'prestige' && b.st){
      try { zeichen = insigniumStufeSvg(b.st, (getPlayerRank(b.p) || {}).label, b.grad | 0, {bild:true}) || ''; } catch(e){ zeichen = ''; }
    }
    return `<div class="ff-mk"><span class="ff-mk-r" data-pid="${esc(b.p)}"><svg viewBox="0 0 72 72" aria-hidden="true">`
      + `<circle class="ff-mk-h" cx="36" cy="36" r="${R}"/><circle class="ff-mk-v" cx="36" cy="36" r="${R}" stroke-dasharray="${(U * anteil).toFixed(1)} ${U.toFixed(1)}"/></svg>`
      + `${rcpAvHtml(b.p, 44, {})}</span>`
      + `<span class="ff-mk-m">${_ffNm(b.p)}<b class="num">noch ${_ffZl(rest)}</b><small>${esc(was)}</small>`
      + `<span class="ff-mk-s num">${_ffZl(b.ist)} von ${_ffZl(b.ziel)}</span></span>`
      + (zeichen ? `<span class="ff-mk-z">${zeichen}</span>` : '') + `</div>`;
  },

  // ── 5. Chronik einer Laufbahn: die Monate als Streifen ───────────────
  // Jede Zelle in der Farbe ihrer Stufe wie in der Chronik-Tabelle [§C25]:
  // Gold legendär, Lila selten, Metall besonders. Ein Strich heißt gewertet
  // ohne Eintrag, ein leeres Feld nicht gewertet. Die Reihe ohne Pause trägt
  // eine Klammer darunter.
  reihe(b){
    const pm = pmap(), z = (b.z || []).filter(x => x && x[0]);
    if(!pm[b.p] || !z.length) return '';
    const MON = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const n = Math.max(0, b.n | 0), von = b.art === 'serie' ? z.length - n : -1;
    const zahl = {serie:'Monate ohne Pause', meiste:'Monate in der Chronik', neu:'Eintrag in der Chronik'}[b.art] || '';
    const zellen = z.map((x, i) => {
      const st = x[1], mit = st && st !== '-';
      const t = mit ? titleTone(CHRONIK_STUFE_TON[st] || 'silver') : null;
      return `<span class="ff-rh-c${mit ? ' mit' : st === '-' ? ' ohne' : ' leer'}${i >= von && von >= 0 ? ' serie' : ''}"`
        + (t ? ` data-kl="${esc(st)}"` : '') + ` style="--k:${i}${t ? `;--tt:${t.c};--ttr:${t.rgb}` : ''}">`
        + `<i>${mit ? svgI(x[2] || 'scroll') : ''}</i><small class="num">${MON[Number(String(x[0]).slice(5, 7)) - 1] || ''}</small></span>`;
    }).join('');
    return `<div class="ff-kopf"><span class="ff-kopf-p" data-pid="${esc(b.p)}">${rcpAvHtml(b.p, 24, {})}${_ffNm(b.p)}</span>`
      + `<span class="ff-wert"><b class="num">${b.art === 'neu' ? '1.' : n}</b><small>${zahl}</small></span></div>`
      + `<div class="ff-rh" style="--n:${z.length}">${zellen}</div>`
      + `<div class="ff-rh-j"><span class="num">${esc(seasonLabel(z[0][0]))}</span><span class="num">${esc(seasonLabel(z[z.length - 1][0]))}</span></div>`;
  },

  // ── 6. Duo-Chemie: zwei Gesichter, ein Bogen, die Leistung darüber ───
  // Der Bogen ist so dick, wie oft die beiden zusammen gespielt haben, und
  // grün, weil sie zusammen mehr gewinnen als erwartet. Darunter dieselbe
  // Bahn wie bei „mehr Siege als erwartet" (`_ffErwartungReihe`). Hier stand
  // „dahinter X und Y mit +2": eine Karte über ein Duo zeigte zwei, und was
  // das zweite mit der Aussage zu tun hatte, sagte nichts.
  chemie(b){
    const pm = pmap();
    if(!pm[b.a] || !pm[b.b]) return '';
    const dick = (2 + Math.min(1, (b.g | 0) / 60) * 3).toFixed(1);
    const seite = id => `<span class="ff-ch-p" data-pid="${esc(id)}">${rcpAvHtml(id, 36, {})}${_ffNm(id)}</span>`;
    return `<div class="ff-ch">${seite(b.a)}<span class="ff-ch-m">`
      + `<svg viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><path class="ff-ch-gl" d="M2 38Q60 -8 118 38"/>`
      + `<path class="ff-ch-l" d="M2 38Q60 -8 118 38" style="stroke-width:${dick}"/></svg>`
      + `<b class="num">${esc(_spVz(Math.round((b.w | 0) - Number(b.e || 0))))}</b><small>Siege mehr als erwartet</small></span>${seite(b.b)}</div>`
      + (b.g > 0 ? `<div class="ff-ew ff-ch-ew">${_ffErwartungReihe('Siege', b.w | 0, Number(b.e) || 0, b.g | 0)}</div>` : '');
  },

  // ── 7. Rolle: ein Ausschnitt der Seiten-Landkarte [§C44] ─────────────
  // Waagerecht, wo jemand meist steht (Revés links, Drive rechts), senkrecht,
  // wo die Leistung gegen den eigenen Schnitt höher ist, symmetrisch um null
  // wie die Landkarte. Getönt sind die beiden Felder der schwächeren Seite.
  // Die übrigen Spieler stehen als Punkte, das Gesicht an seiner Stelle; ein
  // Wechsel zeigt mit einem Pfeil, woher er kam.
  landkarte(b){
    if(!pmap()[b.p]) return '';
    const W = 260, H = 112, S = Math.max(.10, Number(b.S) || .1), m = W / 2, f = x => x.toFixed(1);
    const X = a => 12 + Math.max(0, Math.min(1, a)) * (W - 24);
    // Das Gesicht (26 px) bleibt ganz im Feld, auch wenn die Karte nur
    // 191 px breit ist und das Feld damit 82 px hoch.
    const Y = v => H / 2 - Math.max(-1, Math.min(1, v / S)) * (H / 2 - 19);
    const yo = Y(.03), yu = Y(-.03);
    const wechsel = b.art === 'wechsel', xp = wechsel ? X(b.x14) : X(b.x), yp = Y(b.y);
    const pc = (x, w) => Math.max(7, Math.min(93, x / w * 100)).toFixed(2) + '%';
    const pkt = (b.o || []).map(o => `<circle class="ff-lk-o" cx="${f(X(o[0]))}" cy="${f(Y(o[1]))}" r="3.2"/>`).join('');
    const pfeil = wechsel ? `<circle class="ff-lk-alt" cx="${f(X(b.xv))}" cy="${f(yp)}" r="7"/>`
      + `<path class="ff-lk-pf" d="M${f(X(b.xv) + (xp > X(b.xv) ? 9 : -9))} ${f(yp)}H${f(xp + (xp > X(b.xv) ? -15 : 15))}"/>`
      + `<path class="ff-lk-pk" d="M${f(xp + (xp > X(b.xv) ? -15 : 15))} ${f(yp)}l${xp > X(b.xv) ? -6 : 6} -4.5v9z"/>` : '';
    return `<div class="ff-lk"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`
      + `<path class="ff-lk-q" d="M0 0H${m}V${f(yo)}H0Z"/><path class="ff-lk-q" d="M${m} ${f(yu)}H${W}V${H}H${m}Z"/>`
      + `<rect class="ff-lk-b" x="0" y="${f(yo)}" width="${W}" height="${f(yu - yo)}"/>`
      + `<line class="ff-lk-m" x1="${m}" x2="${m}" y1="0" y2="${H}"/><rect class="ff-lk-r" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="8"/>`
      + pkt + pfeil + `</svg>`
      + `<span class="ff-lk-f o">Drive besser</span><span class="ff-lk-f u">Revés besser</span>`
      + `<span class="ff-lk-p${xp > m ? ' li' : ''}" data-pid="${esc(b.p)}" style="left:${pc(xp, W)};top:${pc(yp, H)}">${rcpAvHtml(b.p, 26, {})}${_ffNm(b.p)}</span></div>`
      + `<div class="ff-lk-x"><span>← meist Revés</span><span>meist Drive →</span></div>`;
  },

  // ── 8. Die Liga: der Stand am Ende jedes Monats, die Marke als Linie ─
  // Jede Säule ist alles bis zum Ende ihres Monats, so wächst die Reihe auf
  // die Marke zu; die Säule, in der sie fällt oder fallen wird, ist hell.
  ligaband(b){
    const mon = (b.mon || []).filter(x => x && x[0]);
    if(!mon.length || !(b.m > 0)) return '';
    const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const max = Math.max(b.m, ...mon.map(x => x[1] | 0)), hoehe = v => Math.max(4, v / max * 100).toFixed(1);
    const kurz = mon.length > 8;
    const s = (b.sieger || []).filter(id => pmap()[id]);
    const ziffern = String(_ffZl(b.m)).split('').map((z, i) => z === '.' ? `<em>.</em>` : `<i class="num" style="--k:${i}">${z}</i>`).join('');
    const linie = Math.min(1, b.m / max);
    return `<div class="ff-lb-k"><span class="ff-zw-z">${ziffern}</span><span class="ff-lb-t"><b>${b.art === 'saetze' ? 'Sätze der Liga' : 'Games der Liga'}</b>`
      + `<small class="num">${b.erreicht ? `jetzt ${_ffZl(b.n)}` : `noch ${_ffZl(b.m - b.n)}`}</small></span>`
      + (s.length ? `<span class="ff-lb-s">${s.map(id => `<span data-pid="${esc(id)}">${rcpAvHtml(id, 22, {})}</span>`).join('')}</span>` : '') + `</div>`
      + `<div class="ff-lb" style="--h:${linie.toFixed(3)}"><span class="ff-lb-m"></span>`
      + mon.map((x, i) => `<span class="ff-lb-c${i === b.hl ? ' hl' : ''}${(x[1] | 0) >= b.m ? ' drueber' : ''}" style="--k:${i}">`
        + `<i style="height:${hoehe(x[1] | 0)}%"></i><small>${esc(kurz ? MON[Number(x[0].slice(5, 7)) - 1].charAt(0) : MON[Number(x[0].slice(5, 7)) - 1])}</small></span>`).join('')
      + `</div>`;
  },

  // ═══ Die zweite Reihe der Fragen [§C33] ═════════════════════════════
  // Wo eine Frage ein Bauteil der ersten Reihe teilt (Podest, Säulen, das
  // Ziel), ruft ihr Eintrag es auf, unter eigenem Namen: Knopf und Zahlen
  // des Blatts hängen an der Form (`_ND_FF_WEGE`, 31a `ambient`), und eine
  // gespeicherte Karte mit dem alten Podest behielte sonst ihr altes Blatt
  // nicht.

  // ── 9. Die Serie: jedes Feld ein Sieg, die Bestmarke als Kante ──────
  // Die Reihe reicht eine Stelle über die Bestmarke hinaus: man sieht, wie
  // weit es bis dorthin ist und was danach käme.
  serie(b){
    if(!pmap()[b.p] || !(b.k > 0)) return '';
    const k = b.k | 0, best = b.best | 0, len = Math.min(24, Math.max(k, best) + 1);
    const zellen = Array.from({length:len}, (_, i) => `<i class="${i < k ? 'w' : ''}${i === best - 1 ? ' best' : ''}" style="--k:${i}"></i>`).join('');
    const neu = k > best;
    return `<div class="ff-kopf"><span class="ff-kopf-p" data-pid="${esc(b.p)}">${rcpAvHtml(b.p, 24, {})}${_ffNm(b.p)}</span>`
      + `<span class="ff-wert${neu ? ' hoch' : ''}"><b class="num">${k}</b><small>Siege in Folge</small></span></div>`
      + `<div class="ff-se" style="--n:${len}">${zellen}</div>`
      + `<div class="ff-se-l num"><span>seit ${esc(datumFmt(b.ab, 'tm'))}</span><span>${neu ? 'davor ' + best : 'Bestmarke ' + best}</span></div>`;
  },

  // ── 10. Die Wende: jedes gedrehte Match als Reihe seiner Sätze ───────
  // Ein verlorener Satz in Metall, ein gewonnener in der Farbe der Karte:
  // keine Richtung, nur wer ihn holte [§C25].
  wende(b){
    if(!pmap()[b.p]) return '';
    const l = (b.l || []).filter(x => x && Array.isArray(x[1]));
    if(!l.length) return '';
    return `<div class="ff-kopf"><span class="ff-kopf-p" data-pid="${esc(b.p)}">${rcpAvHtml(b.p, 24, {})}${_ffNm(b.p)}</span>`
      + `<span class="ff-wert"><b class="num">${b.k | 0}</b><small>Matches gedreht</small></span></div>`
      + `<div class="ff-wd">` + l.map((x, i) => `<div class="ff-wd-r" style="--k:${i}"><small class="num">${esc(datumFmt(x[0], 'tm'))}</small>`
        + `<span class="ff-wd-s">${x[1].map(z => `<i class="num${z[0] > z[1] ? ' w' : ''}">${z[0] | 0}:${z[1] | 0}</i>`).join('')}</span></div>`).join('')
      + `</div>`;
  },

  // ── 11. Knappe Sätze: zwei Quoten auf einer Achse, die Mitte markiert ─
  knapp(b){
    if(!pmap()[b.p] || !(b.kn > 0) || !(b.on > 0)) return '';
    const q1 = Math.round(b.kw / b.kn * 100), q2 = Math.round(b.ow / b.on * 100);
    const reihe = (wort, q, w, n, hl) => `<span class="ff-ew-k">${wort}</span>`
      + `<span class="ff-kn-b${hl ? ' hl' : ''}"><i style="width:${q}%"></i><u></u></span>`
      + `<b class="num">${q} %<small> ${w | 0} von ${n | 0}</small></b>`;
    return `<div class="ff-kopf"><span class="ff-kopf-p" data-pid="${esc(b.p)}">${rcpAvHtml(b.p, 24, {})}${_ffNm(b.p)}</span>`
      + `<span class="ff-wert"><b class="num">${q1}\u00a0%</b><small>Siegquote in knappen Sätzen</small></span></div>`
      + `<div class="ff-kn">${reihe('knapp', q1, b.kw, b.kn, true)}${reihe('übrige', q2, b.ow, b.on, false)}</div>`;
  },

  // ── 12. Die Spitze einer Seite: das Podest, darüber die Seite ────────
  // Die Zahl im Sockel ist die Wertung der Seiten-Rangliste [§C27].
  seite(b){
    const r = (b.r || []).filter(x => pmap()[x[0]]);
    if(r.length < 3) return '';
    const d = b.s === 'drive';
    return `<div class="ff-sd-k">${svgI(d ? 'posDrive' : 'posReves')}<b>${d ? 'Drive' : 'Revés'}</b><small>${d ? 'rechts' : 'links'}</small></div>`
      + _ffPodest({r:r.map(x => ({p:x[0], t:x[1]}))});
  },

  // ── 13. Das erfolgreichste Duo: das Podest der Paare ────────────────
  duos(b){
    const pm = pmap(), r = (b.r || []).filter(x => pm[x[0]] && pm[x[1]]);
    if(r.length < 3) return '';
    return `<div class="ff-pd ff-pd-duo">` + [1, 0, 2].map(k => `<span class="ff-pd-s p${k + 1}" style="--k:${k}">`
      + `<span class="ff-duo-k">${_ffChip(r[k][0])}${_ffChip(r[k][1])}</span>`
      + `<span class="ff-pd-n">${_ffNm(r[k][0])}${_ffNm(r[k][1])}</span>`
      + `<em><b class="num">${r[k][2] | 0} %</b><small class="num">${k + 1}</small></em></span>`).join('') + `</div>`;
  },

  // ── 14. Ein neues Duo: die gemeinsamen Sätze je Woche ───────────────
  duoneu(b){
    const pm = pmap();
    if(!pm[b.a] || !pm[b.b]) return '';
    const v = (b.v || []).map(x => x | 0);
    return `<div class="ff-kopf"><span class="ff-kopf-p"><span class="ff-duo-k">${_ffChip(b.a)}${_ffChip(b.b)}</span>`
      + `<span class="ff-duo-n">${_ffNm(b.a)}<i>und</i>${_ffNm(b.b)}</span></span>`
      + `<span class="ff-wert"><b class="num">${b.n | 0}</b><small>Sätze zusammen</small></span></div>`
      + _ffSaeulen({v, hl:[v.length - 2, v.length - 1], l:'gemeinsame Sätze je Woche'}).replace('die letzten ' + v.length, v.length + ' Wochen');
  },

  // ── 15/16. Sätze gegeneinander: das Tauziehen und der Abstand ───────
  // Die Linie ist der Abstand Satz für Satz, über der Mitte führt, wer
  // links steht. Bei einer Wende sind die letzten Sätze hell.
  rivalen(b){
    const pm = pmap();
    if(!pm[b.a] || !pm[b.b]) return '';
    const v = (b.v || []).map(Number).filter(isFinite);
    let linie = '';
    if(v.length > 2){
      const W = 260, H = 54, n = v.length - 1, m = Math.max(2, ...v.map(Math.abs));
      const X = i => 4 + i * (W - 8) / n, Y = y => H / 2 - y / m * (H / 2 - 5), f = x => x.toFixed(1);
      const pfad = (i0, i1) => v.slice(i0, i1 + 1).map((y, k) => (k ? 'L' : 'M') + f(X(i0 + k)) + ' ' + f(Y(y))).join('');
      const ab = b.art === 'wende' ? Math.max(0, n - Math.round((b.l | 0) * n / Math.max(1, (b.wa | 0) + (b.wb | 0)))) : n;
      linie = `<div class="ff-rv"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`
        + `<rect class="ff-rv-o" x="0" y="0" width="${W}" height="${H / 2}"/>`
        + `<line class="ff-rv-m" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>`
        + `<path class="ff-rv-l${b.art === 'wende' ? ' alt' : ''}" d="${pfad(0, ab)}"/>`
        + (ab < n ? `<path class="ff-rv-l" d="${pfad(ab, n)}"/>` : '')
        + `<circle class="ff-rv-p" cx="${f(X(n))}" cy="${f(Y(v[n]))}" r="3"/></svg>`
        + `<span class="ff-rv-x num"><span>erster Satz</span><span>${b.art === 'wende' ? 'die letzten ' + (b.l | 0) : 'zuletzt'}</span></span></div>`;
    }
    return _ffDuell({a:b.a, b:b.b, wa:b.wa, wb:b.wb}) + linie;
  },

  // ── 17. Die Ewige Tafel: das Podest der Karriere-Elo ────────────────
  // Gesichter statt Wappen: das Wappen zeichnete den Stand des Lesers,
  // nicht den des Tages, an dem die Karte stand.
  ewig(b){
    const r = (b.r || []).filter(x => pmap()[x[0]]);
    if(r.length < 3) return '';
    return `<div class="ff-sd-k">${svgI('crown')}<b>Ewige Tafel</b><small>Karriere-Elo</small></div>`
      + _ffPodest({r:r.map(x => ({p:x[0], t:x[1]}))})
      .replace(/(<span class="ff-pd-s p(\d)"[^>]*>)/g, (m0, m1, k) => r[k - 1] && !r[k - 1][2] ? m1.replace('ff-pd-s', 'ff-pd-s neu') : m1);
  },

  // ── 18. Der Wettlauf: der Abstand der zwei, Monat für Monat ─────────
  // Gezeichnet wird der Abstand und nicht die beiden Summen: zwei Linien,
  // die bei 112 zu 112 enden, lagen aufeinander, und man sah weder, wer
  // vorn war, noch wann es sich drehte. Über der Mitte führt der Erste.
  wettlauf(b){
    const pm = pmap(), r = (b.r || []).filter(x => pm[x[0]] && Array.isArray(x[1]));
    const mon = b.mon || [];
    if(r.length < 2 || mon.length < 2) return '';
    const v = r[0][1].map((y, i) => (y | 0) - (r[1][1][i] | 0));
    const W = 260, H = 54, n = v.length - 1, m = Math.max(2, ...v.map(Math.abs));
    const X = i => 4 + i * (W - 8) / n, Y = y => H / 2 - y / m * (H / 2 - 5), f = x => x.toFixed(1);
    const MON = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const wort = {siege:'Siege', saetze:'Sätze', games:'Games'}[b.art] || '';
    const seite = (x, k) => `<span class="ff-wl-p${k ? ' re' : ' eins'}" data-pid="${esc(x[0])}">${k ? '' : rcpAvHtml(x[0], 24, {})}`
      + `<span>${_ffNm(x[0])}<b class="num">${_ffZl(x[1][x[1].length - 1])}</b></span>${k ? rcpAvHtml(x[0], 24, {}) : ''}</span>`;
    return `<div class="ff-kopf">${seite(r[0], 0)}<small>${esc(wort)}</small>${seite(r[1], 1)}</div>`
      + `<div class="ff-rv"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`
      + `<rect class="ff-rv-o" x="0" y="0" width="${W}" height="${H / 2}"/>`
      + `<line class="ff-rv-m" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>`
      + `<path class="ff-rv-l" d="${v.map((y, i) => (i ? 'L' : 'M') + f(X(i)) + ' ' + f(Y(y))).join('')}"/>`
      + `<circle class="ff-rv-p" cx="${f(X(n))}" cy="${f(Y(v[n]))}" r="3"/></svg>`
      + `<div class="ff-wl-x num" style="grid-template-columns:repeat(${mon.length},1fr)">${mon.map(x => `<span>${MON[Number(String(x).slice(5, 7)) - 1] || ''}</span>`).join('')}</div></div>`;
  },

  // ── 19. Das Prestige: das Podest mit den Wappen ─────────────────────
  // Hier ist das Wappen die Aussage, wie im Podest der Prestige-Rangliste.
  prestige(b){
    const r = (b.r || []).filter(x => pmap()[x[0]]);
    return r.length < 3 ? '' : _ffPodest({ins:true, r:r.map(x => ({p:x[0], t:_ffZl(x[1])}))});
  },

  // ── 20. Die Spitze des Monats: die Tabelle mit ihrer Woche ──────────
  // Grün und Rot nur für die Richtung des Platzes [§C25].
  monat(b){
    const r = (b.r || []).filter(x => pmap()[x[0]]);
    if(r.length < 3) return '';
    const pfeil = d => d == null ? '<em class="neu">neu</em>' : d > 0 ? `<em class="auf num">▲${d}</em>` : d < 0 ? `<em class="ab num">▼${-d}</em>` : '<em class="num">–</em>';
    return `<div class="ff-sd-k">${svgI('chartBar')}<b>${esc(seasonLabel(b.sid || ''))}</b><small>gegen vor einer Woche</small></div>`
      + `<div class="ff-mt">` + r.map((x, i) => `<div class="ff-mt-r${i ? '' : ' eins'}" data-pid="${esc(x[0])}" style="--k:${i}">`
        + `<small class="num">${i + 1}</small>${_ffChip(x[0])}${_ffNm(x[0])}<b class="num">${x[1] | 0}</b>${pfeil(x[2])}</div>`).join('') + `</div>`;
  },

  // ── 21. Gegen den Vormonat: die Plätze beider Monate als Linien ─────
  // Links der Vormonat, rechts der laufende; die Linie des Spielers in der
  // Farbe der Karte, die übrigen in Metall, das Podest rechts getönt.
  vormonat(b){
    const pm = pmap(), r = (b.r || []).filter(x => pm[x[0]] && x[1] > 0 && x[2] > 0);
    if(!pm[b.p] || r.length < 3) return '';
    const n = Math.max(...r.flatMap(x => [x[1], x[2]])), W = 260, H = Math.max(70, 14 + n * 9);
    const Y = p => 8 + (p - 1) * (H - 16) / Math.max(1, n - 1), L = 64, R = W - 64, f = x => x.toFixed(1);
    const ich = r.find(x => x[0] === b.p);
    // Die übrigen leise, mit einem Punkt an jedem Ende: als blosse Linien
    // lagen sie wie ein Knäuel hinter der einen, um die es geht.
    const linien = r.filter(x => x[0] !== b.p).map(x => `<path class="ff-vm-o" d="M${L} ${f(Y(x[1]))}L${R} ${f(Y(x[2]))}"/>`
      + `<circle class="ff-vm-d" cx="${L}" cy="${f(Y(x[1]))}" r="2"/><circle class="ff-vm-d" cx="${R}" cy="${f(Y(x[2]))}" r="2"/>`).join('');
    const pc = y => (y / H * 100).toFixed(2) + '%';
    return `<div class="ff-vm-k"><span>${esc(seasonLabel(b.v))}</span><span>${esc(seasonLabel(b.m))}</span></div>`
      + `<div class="ff-vm"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`
      + `<rect class="ff-vm-pd" x="${R - 8}" y="0" width="${W - R + 8}" height="${f(Y(3) + 5)}" rx="6"/>` + linien
      + (ich ? `<path class="ff-vm-l" d="M${L} ${f(Y(ich[1]))}L${R} ${f(Y(ich[2]))}"/>` : '') + `</svg>`
      + (ich ? `<span class="ff-vm-p l" style="top:${pc(Y(ich[1]))}"><b class="num">${ich[1]}.</b>${rcpAvHtml(b.p, 20, {})}</span>`
        + `<span class="ff-vm-p r" data-pid="${esc(b.p)}" style="top:${pc(Y(ich[2]))}">${rcpAvHtml(b.p, 22, {})}<b class="num">${ich[2]}.</b></span>` : '')
      + `</div><div class="ff-vm-n">${_ffNm(b.p)}</div>`;
  },

  // ── 22. Die Ergebnisse: Säulen des Monats, die Marke der Monate davor
  ergebnisse(b){
    const je = (b.je || []).map(x => x | 0), vor = (b.vor || []).map(x => (x | 0) / 1000);
    if(je.length !== FF_SAETZE.length || vor.length !== FF_SAETZE.length) return '';
    const n = Math.max(1, je.reduce((a, x) => a + x, 0)), q = je.map(x => x / n), max = Math.max(...q, ...vor, .01);
    return `<span class="ff-vs" style="grid-template-columns:repeat(${je.length},minmax(0,1fr))">` + je.map((x, i) => `<span class="${i === b.hl ? 'hl' : ''}" style="--k:${i}">`
      + `<b class="num">${Math.round(q[i] * 100)}</b><em><i style="height:${Math.max(x ? 4 : 0, q[i] / max * 100).toFixed(1)}%"></i>`
      + `<u style="bottom:${(vor[i] / max * 100).toFixed(1)}%"></u></em><small class="num">${FF_SAETZE[i]}</small></span>`).join('') + `</span>`
      + `<div class="ff-es-l"><span><i></i>${esc(seasonLabel(b.mk || '').replace(/\s*\d{4}$/, ''))} in %</span><span><u></u>Monate davor</span></div>`;
  },

  // ── 23. Das Tempo: Sätze je Spieltag, Monat für Monat ───────────────
  tempo(b){
    const mon = (b.mon || []).filter(x => x && x[0]);
    if(mon.length < 2) return '';
    const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const max = Math.max(1, ...mon.map(x => x[1] | 0)), kurz = mon.length > 7;
    return `<span class="ff-vs ff-tp" style="grid-template-columns:repeat(${mon.length},minmax(0,1fr))">` + mon.map((x, i) => `<span class="${i === b.hl ? 'hl' : ''}" style="--k:${i}">`
      + `<b class="num">${esc(komma((x[1] | 0) / 10))}</b><em><i style="height:${Math.max(4, (x[1] | 0) / max * 100).toFixed(1)}%"></i></em>`
      + `<small>${esc((MON[Number(x[0].slice(5, 7)) - 1] || '').slice(0, kurz ? 1 : 3))}</small></span>`).join('') + `</span>`
      + `<div class="ff-sa-l"><span>Sätze je Spieltag</span><span>${mon.length} Monate</span></div>`;
  },

  // ── 24. Die Auszeichnungen des Monats: je Spieler eine Strichliste ──
  // Gold die legendären, Lila die seltenen, Metall die übrigen [§C25].
  awmonat(b){
    const r = (b.r || []).filter(x => pmap()[x[0]]);
    if(!r.length) return '';
    return r.map((x, k) => {
      const n = x[1] | 0, z = Math.min(n, 40), l = Math.min(z, x[2] | 0), s = Math.min(z - l, x[3] | 0);
      const felder = Array.from({length:z}, (_, i) => `<i class="${i < l ? 'lg' : i < l + s ? 'rr' : 'w'}"></i>`).join('');
      return `<div class="ff-sm ff-am${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x[0])}<span class="ff-r-m">${_ffNm(x[0])}`
        + `<span class="ff-zl">${felder}${n > z ? '<i class="mehr"></i>' : ''}</span></span><b class="num">${n}</b></div>`;
    }).join('');
  },

  // ── 25. Ein Rekord in Reichweite: der eigene Stand gegen den Rekord ─
  rekordziel(b){
    const z = _ffZiel(b);
    return z ? `<div class="ff-sd-k">${svgI('trophy')}<b>${esc(b.name || '')}</b></div>` + z : '';
  }

};
