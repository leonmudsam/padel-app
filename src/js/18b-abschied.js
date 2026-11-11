// ╔═══ §C40 ─── DER ABSCHIED ─────────────────────────────────────────╗
//     Ein Karriereende ist die einzige Nachricht, die eine ganze Laufbahn
//     erzählt. Die Story im Feed sagt, DASS es passiert ist; das Blatt
//     erzählt die Laufbahn: wann sie anfing, wie sie Saison für Saison lief,
//     die besonderen Momente, mit wem und gegen wen, worin der Spieler am
//     stärksten war und was beim Abschied in der Ewigen Tafel stand.
//
//     Gerechnet wird nichts Neues. Jede Zahl kommt aus der Stelle, aus der
//     sie auch Profil, Rückblick und Tafel lesen [§C27] — Serie, Peak,
//     Partner, Fingerabdruck, Saisonrangliste, eingefrorene Rekorde und
//     Prestige. Gebaut wird aus dem Baukasten der Rückblicke [§C31].
// ╚═════════════════════════════════════════════════════════════════════════╝

// Die Daten einer Laufbahn. Ein Topf mit Version im Schlüssel, also mit
// Deckel [§3 Caching]; gerechnet wird beim Öffnen und nicht beim Laden.
function abschiedDaten(pid){
  const key = 'ab_' + pid + '_' + matches.length + '_' + _cache.version;
  if(!_cache._abschied) _cache._abschied = {};
  if(_cache._abschied[key]) return _cache._abschied[key];
  _topfDeckel(_cache._abschied, 8);
  const pm = pmap(), p = pm[pid];
  if(!p) return null;
  const ms = matchesOfPlayer(pid, matches);
  if(!ms.length) return null;
  const sim = getGlobalSim();
  let siege = 0, tore = 0, gegen = 0, upset = null, klar = null;
  ms.forEach(m => {
    const aufA = m.a1 === pid || m.a2 === pid;
    const gew = (aufA && m.winner === 'A') || (!aufA && m.winner === 'B');
    const f = aufA ? m.games_a : m.games_b, g = aufA ? m.games_b : m.games_a;
    tore += f || 0; gegen += g || 0;
    if(!gew) return;
    siege++;
    const chance = m.exp_a == null ? .5 : (aufA ? m.exp_a : 1 - m.exp_a);
    if(!upset || chance < upset.chance) upset = {m, chance};
    if(!klar || f - g > klar.abstand) klar = {m, abstand:f - g};
  });
  const serie = longestPlayerStreakInfo(pid, matches);
  // Die Partner und Gegner aus der Bilanz des Profils [§C27]: dieselbe
  // Liste, aus der das Profil seine Beziehungskarten zieht.
  const h2h = playerH2HList(pid, 1);
  const partner = h2h.filter(x => x.teamG >= 5)
    .sort((a, b) => b.teamW / b.teamG - a.teamW / a.teamG || b.teamG - a.teamG).slice(0, 3);
  const gegner = h2h.filter(x => x.oppG >= 6);
  const liebling = gegner.slice().sort((a, b) => b.oppW / b.oppG - a.oppW / a.oppG || b.oppG - a.oppG)[0] || null;
  const angst = gegner.slice().sort((a, b) => a.oppW / a.oppG - b.oppW / b.oppG || b.oppG - a.oppG)[0] || null;
  // Saison für Saison: der Platz kommt aus derselben Rangliste wie der
  // Saison-Rückblick (`saisonRang`). Der Monat, in dem er aufgehört hat,
  // rankt ihn nicht mehr [§C40] — dort steht kein Platz.
  const cur = currentSeason().id;
  const sids = (allPastSeasons() || []).slice();
  if(!sids.includes(cur)) sids.push(cur);
  const saisons = sids.sort().map(sid => {
    const n = (sim.seasonPlayed[sid] || {})[pid] || 0;
    if(!n) return null;
    const r = saisonRang(sid), i = r.findIndex(e => e.id === pid);
    return {sid, n, platz:i >= 0 ? i + 1 : 0, von:r.length,
            elo:Math.round(((sim.seasonEndElos[sid] || {})[pid]) ?? cfg.start_elo),
            meister:i === 0 && sid !== cur};
  }).filter(Boolean);
  const chroniken = sids.map(sid => {
    const t = seasonTitleOf(pid, sid);
    return t ? {sid, name:t.name, ic:t.ic, tone:t.tone, ev:t.ev} : null;
  }).filter(Boolean);
  const badges = getCachedBadges(pid) || [];
  const klasse = {legendary:0, rare:0, common:0};
  badges.forEach(b => { const k = rarityOf(b.id); if(klasse[k] != null) klasse[k] += b.count || 1; });
  const d = {
    pid, name:p.name, ende:ruhestandMs(pid), erste:ms[0], letzte:ms[ms.length - 1],
    spiele:ms.length, siege, quote:siege / ms.length, tore, gegen,
    elo:Math.round(sim.careerElo[pid] ?? cfg.start_elo),
    peak:Math.round(sim.peakElo[pid] ?? cfg.start_elo),
    serie, upset, klar, partner, liebling, angst, saisons, chroniken,
    titel:meisterTitel(pid),
    potw:countPeriodWins(pid, matches, 'week'), potd:countPeriodWins(pid, matches, 'day'),
    rekorde:chroniclesOfPlayer(pid).filter(r => !r.neg),
    prestige:prestigeOf(pid), rang:getPlayerRank(pid),
    legendaer:badges.filter(b => rarityOf(b.id) === 'legendary'), klasse,
    auszeichnungen:badges.reduce((s, b) => s + (b.count || 1), 0)
  };
  _cache._abschied[key] = d;
  return d;
}

// Die Bühne: das Wappen groß mit Band, so wie es beim Abschied stand —
// Insignium, Rangfarbe und die Aura der Titel [§C36] —, darunter Rangstufe
// und die Zeit von der ersten Partie bis zum Karriereende. Der Name steht
// darüber im Kopf; auf der Bühne ein zweites Mal sagte er nichts Neues. Dieselbe Bühne für Story und Blatt [§C27].
function abschiedBuehneHtml(pid){
  const d = abschiedDaten(pid);
  if(!d) return '';
  const pr = d.prestige;
  return `<div class="ab-buehne" data-pid="${esc(pid)}">
    <div class="ab-strahl" aria-hidden="true"></div>
    <div class="ab-av">${rcpAvHtml(pid, 132, {band:true, titel:d.titel})}</div>
    <div class="ab-rang">${rankBadgeHtml(pid, 'sm')}<span>${esc(pr.insignie.name)} · ${_spZahl(pr.punkte)} Prestige</span></div>
    <div class="ab-zeit num">${esc(datumFmt(mts(d.erste), 'tmj'))}<i></i>${esc(datumFmt(d.ende, 'tmj'))}</div>
  </div>`;
}

// Die Zahlen der Laufbahn in einer Reihe.
// Im Blatt einer Story sind es drei: das Blatt ist schmaler, und eine
// vierte Zelle stand allein in einer zweiten Reihe.
function _abZahlen(d, drei){
  return rcpZahlenHtml([
    {v:_spZahl(d.spiele), l:'Sätze'}, {v:_spZahl(d.siege), l:'Siege'},
    {v:Math.round(d.quote * 100) + ' %', l:'Siegquote'}, drei ? null : {v:d.elo, l:'Karriere-Elo'},
    d.titel && !drei ? {v:d.titel, l:'Titel', ton:'gold'} : null]);
}

// Saison für Saison: ein Feld je Monat, der Platz groß, die Elo darunter.
// Der Titel trägt Gold [§C25], die Plätze zwei und drei ihr Metall.
function _abSaisonenHtml(d){
  if(!d.saisons.length) return '';
  const MET = ['', 'gold', 'silber', 'bronze'];
  return `<div class="ab-sz">${d.saisons.map((s, k) => `<div class="ab-sz-f ${MET[s.platz] || ''}" style="--k:${k}">
    <span class="ab-sz-m">${esc(seasonLabel(s.sid).split(' ')[0].slice(0, 3))}</span>
    <b class="num">${s.platz ? s.platz + '.' : '–'}</b>
    <span class="ab-sz-e num">${s.elo}</span>
    <span class="ab-sz-n num">${s.n} Sätze</span></div>`).join('')}</div>`;
}

// Die besonderen Momente: die Kacheln der Rückblicke [§C31].
function _abMomenteHtml(d){
  const k = [];
  const datum = m => datumFmt(mts(m), 'tmj');
  if(d.serie.best >= 2) k.push(rcpKachelHtml({ic:'flame', label:'Längste Siegesserie', ton:'metall',
    name:d.serie.best + ' Siege in Folge', wert:d.serie.peakDate ? 'bis ' + datumFmt(d.serie.peakDate, 'tmj') : ''}));
  k.push(rcpKachelHtml({ic:'peak', label:'Höchster Elo-Stand', ton:'metall', name:d.peak + ' Elo', wert:'in einer Saison'}));
  if(d.upset && d.upset.chance < .5) k.push(rcpKachelHtml({ic:'underdog', label:'Größte Überraschung', ton:'metall',
    name:Math.round(d.upset.chance * 100) + ' % Siegchance', wert:standFuer(d.upset.m) + ' am ' + datum(d.upset.m),
    attr:`data-mid="${esc(d.upset.m.id)}"`}));
  if(d.klar) k.push(rcpKachelHtml({ic:'explosion', label:'Deutlichster Sieg', ton:'metall',
    name:standFuer(d.klar.m), wert:'am ' + datum(d.klar.m), attr:`data-mid="${esc(d.klar.m.id)}"`}));
  if(d.titel) k.push(rcpKachelHtml({ic:'crown', label:'Meistertitel', ton:'gold',
    name:d.titel === 1 ? 'Ein Titel' : d.titel + ' Titel', wert:'Player of the Season'}));
  if(d.potw) k.push(rcpKachelHtml({ic:'weekKing', label:'Player of the Week', ton:'metall',
    name:d.potw === 1 ? 'Eine Woche' : d.potw + ' Wochen', wert:'Wochenwertung gewonnen'}));
  if(d.potd) k.push(rcpKachelHtml({ic:'dayKing', label:'Player of the Day', ton:'metall',
    name:d.potd === 1 ? 'Ein Spieltag' : d.potd + ' Spieltage', wert:'Tageswertung gewonnen'}));
  return k.length ? `<div class="rcp-awards ab-momente${k.length % 2 ? ' ungerade' : ''}">${k.join('')}</div>` : '';
}

// Ein Duo als Zeile: beide Gesichter, die Namen, die Bilanz als Balken.
function _abDuoHtml(pid, x, art){
  const g = art === 'team' ? x.teamG : x.oppG, w = art === 'team' ? x.teamW : x.oppW;
  const q = g ? Math.round(w / g * 100) : 0;
  const attr = art === 'team' ? `data-team="${esc(paarKey(pid, x.oid))}"` : `data-h2h="${esc(pid + '|' + x.oid)}"`;
  return `<div class="ab-duo klick" ${attr}>
    ${art === 'team' ? rcpPaarHtml([pid, x.oid], 36) : rcpAvHtml(x.oid, 36)}
    <span class="ab-duo-t"><b>${esc(art === 'team' ? pname(pid) + ' & ' + pname(x.oid) : pname(x.oid))}</b>
      <span class="ab-duo-b"><i style="width:${q}%"></i></span></span>
    <span class="ab-duo-z num"><b>${q} %</b><small>${w}–${g - w}</small></span></div>`;
}

// Der Inhalt unter der Bühne. Die Story zeigt den Anfang davon, das Blatt
// alles; beide aus derselben Funktion.
function abschiedMitteHtml(pid, kurz){
  const d = abschiedDaten(pid);
  if(!d) return '';
  const ab = (t, html, n) => html ? rcpAbschnitt(t, n) + html : '';
  // Kurz für das Blatt einer Story: die Kacheln wurden dort gekürzt, und der
  // ganze Abschied steht einen Knopf weiter.
  if(kurz) return _abZahlen(d, true);
  const momente = ab('Besondere Momente', _abMomenteHtml(d));
  const partner = d.partner.length ? `<div class="ab-duos">${d.partner.map(x => _abDuoHtml(pid, x, 'team')).join('')}</div>` : '';
  const gegner = [d.liebling ? `<div class="ab-gg"><span class="ab-gg-l">Lieblingsgegner</span>${_abDuoHtml(pid, d.liebling, 'gegner')}</div>` : '',
    d.angst && (!d.liebling || d.angst.oid !== d.liebling.oid) ? `<div class="ab-gg"><span class="ab-gg-l">Angstgegner</span>${_abDuoHtml(pid, d.angst, 'gegner')}</div>` : ''].join('');
  let staerken = '';
  try { const r = fingerRadarSvg(pid), z = fingerFeldZeilen(pid); if(r) staerken = `<div class="ab-fa">${r}</div>${z}`; } catch(e){ staerken = ''; }
  const rekorde = d.rekorde.length ? `<div class="rcp-liste">${d.rekorde.map(r => {
    const h = (r.holders || []).find(x => x.pid === pid) || r;
    // Der erste Teil des Belegs ist der Wert, nach dem sortiert wird [§C35];
    // der ganze Beleg lief über die Zeile hinaus und endete mit „…".
    return rcpZeileHtml({ic:r.ic, ton:r.tone, name:r.name, sub:String(h.ev || '').split(' · ')[0], rechts:r.shared ? 'geteilt' : '', attr:`data-chron="${esc(r.id)}"`});
  }).join('')}</div>` : '';
  const chroniken = d.chroniken.length ? `<div class="rcp-liste">${d.chroniken.map(c =>
    rcpZeileHtml({ic:c.ic, ton:c.tone, name:c.name, sub:String(c.ev || '').split(' · ')[0], rechts:seasonLabel(c.sid), attr:`data-stafel="${esc(c.sid)}"`})).join('')}</div>` : '';
  const legende = d.legendaer.length ? `<div class="ab-lg">${d.legendaer.map(b =>
    `<span class="ab-lg-c">${svgI(b.ic || 'trophyStar')}${esc(b.name)}${(b.count || 1) > 1 ? `<b class="num">${b.count}×</b>` : ''}</span>`).join('')}</div>` : '';
  const auszeichnungen = d.auszeichnungen ? rcpZahlenHtml([
    {v:d.auszeichnungen, l:'Verliehen'}, {v:d.klasse.legendary, l:'Legendär', ton:d.klasse.legendary ? 'gold' : ''},
    {v:d.klasse.rare, l:'Selten'}, {v:d.klasse.common, l:'Gewöhnlich'}]) + legende : '';
  return _abZahlen(d)
    + ab('Saison für Saison', _abSaisonenHtml(d), d.saisons.length)
    + momente
    + ab('Die besten Partner', partner)
    + ab('Gegenüber', gegner)
    + ab('Die Stärken', staerken)
    + ab('Rekorde beim Abschied', rekorde, d.rekorde.length)
    + ab('Monatschroniken', chroniken, d.chroniken.length)
    + ab('Auszeichnungen', auszeichnungen);
}

// Das Blatt. `auto` beim ersten Öffnen der App nach einem Karriereende:
// dann schützt es sich kurz gegen ein versehentliches Wegwischen, wie der
// Saison-Rückblick [§C31].
function zeigeAbschied(pid, opts){
  opts = opts || {};
  if(!abschiedDaten(pid)) return;
  _sheetSetReopen(() => zeigeAbschied(pid));
  const p = pmap()[pid];
  openSheet(
    rcpKopfHtml({ic:'hourglass', marke:'Karriereende', titel:p.name, metall:true})
    + abschiedBuehneHtml(pid)
    + abschiedMitteHtml(pid)
    + `<div class="blatt-fuss ab-fuss"><button type="button" class="btn ghost" data-detail="${esc(pid)}">Zum Profil</button>`
    + `<button type="button" class="btn" id="abFertig">Verstanden</button></div>`,
    {protectMs: opts.auto ? 2500 : 0});
  const merken = () => _recapMarkSeen(_abschiedSchluessel(pid), 'abschied:' + pid);
  const wurzel = document.getElementById('sheet');
  const fertig = document.getElementById('abFertig');
  if(fertig) fertig.onclick = () => { merken(); closeSheet(); };
  const binden = (sel, fn) => wurzel.querySelectorAll(sel).forEach(el => {
    el.onclick = () => { merken(); fn(el); };
  });
  binden('[data-detail]', el => sheetNav(() => showPlayer(el.dataset.detail)));
  binden('.ab-duo[data-team]', el => { const [a, b] = el.dataset.team.split('|'); sheetNav(() => showTeam(a, b)); });
  binden('.ab-duo[data-h2h]', el => { const [a, b] = el.dataset.h2h.split('|'); sheetNav(() => showH2H(a, b)); });
  binden('[data-mid]', el => sheetNav(() => showMatchDetail(el.dataset.mid)));
  binden('[data-chron]', el => sheetNav(() => showChronicle(el.dataset.chron)));
  binden('[data-stafel]', el => sheetNav(() => showSeasonTable(el.dataset.stafel)));
}

// Gemerkt je Karriereende, nicht je Spieler: wer aufhört, zurückkommt und
// wieder aufhört, bekommt einen zweiten Abschied.
function _abschiedSchluessel(pid){
  return 'abschied_' + pid + '_' + ruhestandMs(pid);
}

// Einmal je Gerät, bis vierzehn Tage nach dem Karriereende — so lange bildet
// der Generator seine Karte [§C33]. Der jüngste Abschied zuerst; was offen
// ist, wird nicht überdeckt [§C31].
function autoZeigeAbschied(){
  try {
    if(_etwasOffen()) return;
    const jetzt = Date.now();
    const p = ruhestandSpieler().find(x => jetzt - ruhestandMs(x) < NEWS_FENSTER_TAGE * 864e5
      && !_recapSeen(_abschiedSchluessel(x.id), 'abschied:' + x.id));
    if(!p) return;
    _autoRecapSeen.add('abschied:' + p.id);
    zeigeAbschied(p.id, {auto:true});
  } catch(e){ console.error('Abschied auto:', e); }
}
