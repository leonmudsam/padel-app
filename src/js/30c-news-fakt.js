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
    + `<div class="ff-dl-n">${_ffNm(b.a)}<small class="num">${n} Duelle</small>${_ffNm(b.b)}</div>`;
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

const _FF_FORM = {
  rennen:_ffRennen, podest:_ffPodest, sammlung:_ffSammlung, sterne:_ffSterne, zahl:_ffZahl, duell:_ffDuell, duo:_ffDuo, vitrine:_ffVitrine, medaille:_ffMedaille,
  stufe:_ffStufe, ziel:_ffZiel, rolle:_ffRolle, verteilung:_ffVerteilung, saeulen:_ffSaeulen,
  platz:_ffPlatz, tafel:_ffTafel, zaehler:_ffZaehler, lauf:_ffLauf
};
