// ─── §11.7 — Story-Detail (dynamisch je Typ) ─────────────────────────
// Detail-Popover (z-index 140) — kann ÜBER dem Sheet (100)
// liegen und ist unabhängig schließbar.
// ── Was unten in Zahlen steht, sagt der Satz oben nicht ────────────
// Der Satz der Tafel-Karte zaehlt auf, was passiert ist („Eine Bestmarke,
// ein Ausbau, zwei Monatschroniken und ein neues Insignium: …") — im FEED
// ist das die ganze Aussage. Im Blatt steht direkt darunter die Zahlenreihe
// mit denselben vier Angaben, und damit dieselbe Information zweimal in
// sechs Zeilen [§C27]. Der Kopf laesst die Aufzaehlung dort weg; was danach
// kommt — der Zuwachs fuer die Laufbahn — bleibt, denn das zaehlt die Reihe
// nicht auf [§C33 `_ndNeu`].
//
// Eine eigene Funktion, weil die Regel sonst nur im Zeichnen des Blatts
// stuende und damit nur mit einem Dokument zu messen waere.
//
// Dasselbe gilt für den Zuwachs: „Für die Laufbahn bleiben 279 Prestige."
// stand über der Reihe, deren vierte Zelle „+279 Prestige" ist.
function _ndLead(desc, body){
  const lead = String(desc || '');
  if(String(body || '').indexOf('rcp-z') < 0 || !/^[^:]+:\s+\S/.test(lead)) return lead;
  const rest = lead.replace(/^[^:]+:\s+/, '');
  if(/^für die Laufbahn bleiben \d+ Prestige\.$/i.test(rest) && /rcp-z-l">Prestige</.test(body)) return '';
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : lead;
}

function openNewsDetail(sid){
  const stories = getStoriesCache();
  const s = stories.find(x => x.id === sid);
  if(!s) return;
  // ── Read-State (Bugfix v8.1) ──
  // Story IMMER hier markieren — egal über welchen Pfad geöffnet wurde
  // (Mini-Popup, Feed-Card, Direkt-Aufruf). _newsMarkSeen ist idempotent
  // (Set-Add), kein Risiko bei mehrfachem Aufruf.
  try {
    _newsMarkSeen(sid);
    newsBadgeRefresh();
    // Sichtbare Cards im Feed visuell synchron halten.
    // CSS.escape ist seit 2015 in allen relevanten Browsern verfügbar; defensiv
    // mit Fallback auf simples Escape für Edge-Cases.
    const escId = (window.CSS && CSS.escape) ? CSS.escape(sid) : sid.replace(/[\\"']/g, '\\$&');
    document.querySelectorAll('.nf-card[data-sid="'+escId+'"], .nf-hero[data-sid="'+escId+'"]').forEach(el => {
      el.classList.add('read'); el.classList.remove('important');
      el.querySelector('.nf-dot')?.remove();
    });
  } catch(e){}
  // Der Monatsabschluss öffnet den Saison-Rückblick selbst [§C31], mit seiner
  // Vorstellung; geschlossen steht der Feed wieder da (`sheetNav`). Sein
  // Blatt zeigte Podest, Titelrennen, Tage an der Spitze und die Saison des
  // Meisters ein zweites Mal, und zum Rückblick führte von dort kein Weg.
  if((s.dataRef || {}).type === 'season_recap'){
    const se = (seasons || []).find(x => x.id === s.dataRef.sid);
    if(se){
      const ndBg = document.getElementById('ndBg');
      if(ndBg && ndBg.classList.contains('show')) closeNewsDetail();
      sheetNav(() => showSeasonRecap(se));
      return;
    }
  }
  // v9: Breaking-Stories im Detail ebenfalls in der Breaking-Optik anzeigen.
  const dcat = _displayCat(s);
  const cat = NEWS_CATEGORIES[dcat] || NEWS_CATEGORIES.fun;
  // Body-HTML dynamisch je Typ — nutzt vorhandene Avatar/Stat-Helper
  const body = _newsDetailBody(s);
  // Der Kopf einer Partie trägt den Satz ohne Siegchance und Elo, wie die
  // Karte: die Bühne darunter zeigt beides [§C33].
  let lead = _ndLead(s.desc, body);
  // Auf der Bühne eines Rekords stehen Vorgänger und Wirkung gezeichnet; die
  // Sätze dazu standen im Kopf ein zweites Mal [§C33 `_ndNeu`].
  if(body.indexOf('nd-rk') >= 0) lead = lead.split(/(?<=\.)\s+/)
    .filter(x => !/^(Vorher (gehörte|hielt|hielten)|Für .+ heißt der Spieltag)/.test(x)).join(' ');
  // Die Bühne einer Stufe zeigt die Punkte, ihre drei Quellen und den Weg
  // zur nächsten; der Satz zählte dieselben Zahlen davor auf.
  if(body.indexOf('nd-is') >= 0) lead = lead.split(/(?<=\.)\s+/)
    .filter(x => !/(Prestige zusammen|bis zum .+ fehlen|^Zuletzt stand die Stufe)/.test(x)).join(' ');
  // Die Form zeigt beide Quoten als Balken; der Satz bestand nur aus ihnen.
  if(body.indexOf('nd-fv') >= 0) lead = lead.split(/(?<=\.)\s+/)
    .filter(x => !/(aus den letzten \d+ Partien|Laufbahn davor sind es)/.test(x)).join(' ');
  // Die Monatstafel zeigt Einträge und Träger als Säulen.
  if(body.indexOf('nd-mo') >= 0) lead = lead.split(/(?<=\.)\s+/)
    .filter(x => !/(Einträge? (gehen|geht|stehen|steht)|^Vorn steh)/.test(x)).join(' ');
  try { if(_newsSorte(s) === 'spiel') lead = _newsSpielSatz(lead, SP_ZEIGT_ALLES); } catch(e){}
  const nd = document.getElementById('nd');
  const bg = document.getElementById('ndBg');
  if(!nd || !bg) return;
  // Der Faden [§C33] in beide Richtungen: woran diese Karte anschließt und
  // welche spätere sie fortsetzt. Dieselbe Ableitung wie im Feed.
  let fadenHtml = '';
  try {
    const fd = _newsFaeden(stories);
    const zurueck = fd.get(sid);
    let weiter = null;
    fd.forEach((f, id) => { if(f.ziel === sid && !weiter) weiter = {art: f.art, von: id}; });
    fadenHtml = _newsFadenHtml(zurueck, stories) + _newsFadenHtml(weiter, stories, true);
  } catch(e){}
  // Das Blatt setzt fort, was die Karte angefangen hat: dieselbe Rubrik,
  // dasselbe Motiv, dieselben fetten Akzente [§C27]. Vorher stand oben der
  // Kategorienname aus der Datenbank („Badge & Awards"), den es auf der
  // Karte seit dem Rubrikband nicht mehr gibt.
  const sorte = _newsSorte(s);
  const brk = _isBreaking(s);
  // Warum der Spieler des Tages oder eine Ehrung Breaking ist, steht auch im
  // Blatt unter dem Balken: der Satz der Karte, ohne ihn hieß es nur
  // „BREAKING" über einer Ehrung (`_ehrungBrkSatz`).
  const brkGrund = brk && (((s.dataRef || {}).type === 'potd') || ((s.dataRef || {}).type === 'ehrung')) ? _breakingHeroText(s) : '';
  const negativ = _newsIstNegativ(s);
  nd.className = 'nd ' + _newsTonKlassen(s, 'nd') + (negativ ? ' nd-neg' : '') + (brk ? ' nd-brk' : '');
  // #nd ist der Scrollbehälter, nicht der Feed darunter. Eine Öffnung ist
  // immer ein neuer Lesestart, auch bei derselben Story oder einem Faden
  // aus dem offenen Blatt. Vor dem Markup zurücksetzen: kein Zwischenlayout
  // des neuen Inhalts und kein späterer Frame, der das Lesen zurückzieht.
  nd.scrollTop = 0;
  nd.innerHTML = `
    ${_newsMotiv(sorte, s)}
    ${brk ? '<div class="nf-brk-band"><span class="nf-brk-punkt"></span>BREAKING</div>' : ''}
    ${brkGrund ? `<div class="nd-brk-grund">${esc(brkGrund)}</div>` : ''}
    <div class="nd-head">
      <div class="nd-ic nv-cat-${dcat}">${svgI(icPfad(s.ic) ? s.ic : cat.ic)}</div>
      <div class="nd-title-wrap">
        <div class="nd-cat">${esc(_newsRubrik(sorte, s))}</div>
        <div class="nd-title">${esc(s.title)}</div>
        <div class="nd-when">${svgI('clock')}${esc(_newsWhenLabel(s.when))}</div>
      </div>
      <button class="nd-x" id="ndXBtn" aria-label="Schließen">×</button>${sorte === 'held' || sorte === 'woche' ? glanzBahn() : ''}
    </div>
    ${lead ? `<div class="nd-desc">${_newsBetont(lead)}</div>` : ''}
    ${body}
    ${fadenHtml ? `<div class="nd-faeden">${fadenHtml}</div>` : ''}
    ${_newsRueckblickKnopf(s)}
    <button class="nd-close" id="ndCloseBtn">Schließen</button>`;
  bg.classList.add('show');
  _zurueckAbgleichen();
  _fensterLicht(nd, 'story');
  _verdecken('nd', true);
  document.getElementById('ndCloseBtn').onclick = closeNewsDetail;
  document.getElementById('ndXBtn').onclick = closeNewsDetail;
  nd.querySelectorAll('.nf-faden[data-ziel]').forEach(el => {
    el.onclick = () => openNewsDetail(el.dataset.ziel);
  });
  nd.querySelectorAll('[data-rueckblick]').forEach(el => {
    el.onclick = () => {
      const [art, k] = String(el.dataset.rueckblick).split('|');
      closeNewsDetail();
      sheetNav(() => { try { art === 'abschied' ? zeigeAbschied(k) : art === 'tag' ? showPotdRecap({force:true, tag:k}) : showPotwRecap({woche:k}); } catch(e){} });
    };
  });
  // Match-Refs: bei Klick zum Match-Detail springen
  nd.querySelectorAll('[data-mid]').forEach(el => {
    el.onclick = () => {
      const mid = el.dataset.mid;
      closeNewsDetail();
      sheetNav(() => { try { showMatchDetail(mid); } catch(e){} }); // über den News-Feed stapeln
    };
  });
  // Player-Refs: zum Spielerprofil
  nd.querySelectorAll('[data-pid]').forEach(el => {
    el.onclick = () => {
      const pid = el.dataset.pid;
      closeNewsDetail();
      sheetNav(() => { try { showPlayer(pid); } catch(e){} }); // über den News-Feed stapeln
    };
  });
  // Eine Auszeichnung öffnet ihre Detailansicht über dem Blatt, auch wo sie
  // in einer Zeile steht, die sonst ins Profil führt [§8.5].
  _bpBinden(nd);
  // §13: Titel-Plaketten und der „Ganze Tafel"-Button im Saison-Abschluss
  nd.querySelectorAll('[data-tplayer]').forEach(el => {
    el.onclick = () => {
      const pid = el.dataset.tplayer;
      closeNewsDetail();
      sheetNav(() => { try { showPlayer(pid); } catch(e){} });
    };
  });
  nd.querySelectorAll('[data-season-table]').forEach(el => {
    el.onclick = () => {
      const sid = el.dataset.seasonTable;
      closeNewsDetail();
      sheetNav(() => { try { showSeasonTable(sid); } catch(e){} });
    };
  });
  // Eine Monatschronik öffnet ihre Wertung im Monat der Karte, ein
  // Insignium die Laufbahn: dorthin führt eine Zeile der Tafel [§C33].
  nd.querySelectorAll('[data-disz]').forEach(el => {
    el.onclick = () => {
      const [tid, sid] = String(el.dataset.disz).split('|');
      closeNewsDetail();
      sheetNav(() => { try { showDisziplin(tid, sid); } catch(e){} });
    };
  });
  nd.querySelectorAll('[data-laufbahn]').forEach(el => {
    _insRangWaermen(el.dataset.laufbahn);
    el.onclick = () => {
      const pid = el.dataset.laufbahn;
      closeNewsDetail();
      sheetNav(() => { try { showLaufbahn(pid); } catch(e){} });
    };
  });
  nd.querySelectorAll('[data-chron]').forEach(el => {
    el.onclick = () => {
      const cid = el.dataset.chron;
      closeNewsDetail();
      sheetNav(() => { try { showChronicle(cid); } catch(e){} });
    };
  });
}
// ── Der Rückblick zur Story ──────────────────────────────────────────
// Spieler des Tages und die Woche haben einen eigenen Rückblick, und der war
// nur über den Liga-Reiter zu erreichen — und dort nur für den LETZTEN Tag
// und die LETZTE Woche. Wer die Karte drei Tage später las, kam an die
// Auswertung nicht mehr heran. Der Knopf öffnet den Rückblick IHRES Tages
// oder IHRER Woche.
function _newsRueckblickKnopf(s){
  const d = (s && s.dataRef) || {};
  if(d.type === 'karriereende' && d.pid && pmap()[d.pid])
    return `<button class="btn nd-rueck" type="button" data-rueckblick="${esc('abschied|' + d.pid)}">${svgI('hourglass')}Der ganze Abschied</button>`;
  const ziel = d.type === 'potd' && d.dayKey ? 'tag|' + d.dayKey
    : (d.type === 'woche' || d.type === 'potw') && d.woche ? 'woche|' + d.woche : '';
  if(!ziel) return '';
  return `<button class="btn nd-rueck" type="button" data-rueckblick="${esc(ziel)}">${svgI(ziel.indexOf('tag|') === 0 ? 'dayKing' : 'weekKing')}`
    + `${ziel.indexOf('tag|') === 0 ? 'Rückblick auf den Tag' : 'Rückblick auf die Woche'}</button>`;
}
function closeNewsDetail(){
  const bg = document.getElementById('ndBg');
  if(bg) bg.classList.remove('show');
  _fensterZu(bg, document.getElementById('nd'), 'nd');
  _zurueckAbgleichen();
}

// Detail-Body-HTML — schaltet nach dataRef.type. Für unbekannte Typen
// wird nur die Description angezeigt (Fallback).
//
// v8.1: massiv erweitert. Helper-Funktionen unten liefern wiederverwendbare
// Bausteine (Match-VS-Block, Elo-Delta, Form-Strip), die in mehreren Cases
// gemeinsam genutzt werden. Vermeidet duplizierte Berechnungen.
// Rang, Zeichen und Prestige unter dem Namen im Blatt. Ein Name allein sagt
// nicht, wer da gerade gefeiert wird — und das Wappen daneben zeigt die Stufe,
// ohne sie zu benennen.
function _newsRangZeile(pid){
  try {
    // Dieselbe Rechnung stand hier ein zweites Mal [§C27].
    const rang = _newsGesamtrang(pid);
    const P = prestigeOf(pid);
    const teile = [];
    // „Rang 6" stand hier als Text UND daneben als Rangabzeichen — dieselbe
    // Aussage zweimal. Das Abzeichen ist das Bauteil [§C27], die Zeile nennt,
    // was es nicht sagt.
    // „der Liga" las sich wie die Tabelle der laufenden Saison; gemeint ist
    // der Zeitraum „Gesamt" des Liga-Tabs, und die beiden Plaetze koennen
    // weit auseinanderliegen.
    if(rang > 0) teile.push('Platz ' + rang + ' der Gesamtliga');
    if(!_ndZeichenUnten){
      if(P && P.insignie) teile.push(P.insignie.name);
      if(P && P.punkte != null) teile.push(P.punkte + ' Prestige');
    }
    return teile.join(' · ');
  } catch(e){ return ''; }
}

// ── Ein Geruest fuer jedes Blatt ────────────────────────────────────
// Es gibt einunddreissig Story-Typen, und jeder brachte sein eigenes Blatt
// mit: mal eine Namenszeile mit Pfeil, mal ein Wert ohne Einordnung, mal gar
// nichts. Wer zwei Blaetter nacheinander oeffnete, fand nichts an derselben
// Stelle. Kopf und Fuss stehen deshalb jetzt an EINER Stelle, und die Cases
// liefern nur noch die Mitte.
//
// Der Kopf zeigt, um wen es geht: ein Wappen wie ueberall sonst [§C27], den
// Namen und darunter Rang, Zeichen und Prestige. Bei einer Partie steht das
// Was die Leute auf einer Karte miteinander zu tun haben, sagt der STORY-TYP
// und nicht die Kartenform. Gemessen stand unter „Martin schlaegt Leo im
// Spitzenspiel" die Zeile „als Duo" — die beiden standen sich gegenueber —,
// und unter „Johannes und Stefan bewegen die Ewige Tafel" ebenfalls: zwei
// Leute, die am selben Tag je einen eigenen Rekord holten. „als Duo" war die
// Vorgabe fuer alles, was genau zwei Wappen zeigt, und stimmte nur bei den
// beiden Duo-Serien.
function _ndBeziehung(s, anzahl){
  const t = ((s && s.dataRef) || {}).type || '';
  if(t === 'rivalry' || t === 'rivalry_milestone') return 'im direkten Duell';
  if(t === 'team_streak' || t === 'team_loss_streak') return 'als Duo';
  if(t === 'top_clash') return 'Sieger und Verlierer dieser Partie';
  if(t === 'streak_killer') return 'auf beiden Seiten der Partie';
  if(t === 'badge_unlocked') return 'mit derselben Auszeichnung';
  if(t === 'potd' || t === 'potw') return 'punktgleich an der Spitze';
  // Das Blatt einer Partie zeigt ihre Sieger. „in derselben Partie" stand
  // darunter — auf dem Blatt, das diese Partie IST.
  if(t === 'spiel') return 'gewinnen diese Partie';
  // Die Sammelkarte buendelt einen MOMENT, nicht zwingend eine Partie: die
  // Gruppe entsteht ueber die Minute [§C33].
  if(t === 'sammel'){
    const q = (s.dataRef || {}).quelle;
    // Auf der Karte ueber einen Erfolg haben die Beteiligten genau eines
    // miteinander zu tun: sie haben dasselbe geholt.
    if(q === 'erfolg') return 'mit demselben Erfolg';
    // Zwei Ergebnisse desselben Tages verbindet der Tag, nicht die Partie.
    if(q === 'ergebnis') return 'an diesem Spieltag';
    // Die Karte einer Partie hat ihre Partie: „im selben Moment" stimmt,
    // sagt aber weniger als das, was alle Zeilen gemeinsam haben.
    if(q === 'spiel' && (s.dataRef || {}).matchId) return 'in dieser Partie';
    return q === 'tafel' ? 'an der Ewigen Tafel' : 'im selben Moment';
  }
  if(((s && s.dataRef) || {}).matchId) return 'in derselben Partie';
  return 'gemeinsam auf dieser Karte';
}

// Ergebnis darueber, bei einem Duo stehen zwei Wappen nebeneinander.
function _newsBlattKopf(s){
  const d = s.dataRef || {};
  const pm = pmap();
  const nm = pid => (pm[pid] && pm[pid].name) || '';
  let ids = [];
  try { ids = (_newsPids(s) || []).filter(id => pm[id]); } catch(e){}
  // Die Runde hat ihre Tabelle als Kopf; vier Wappen darüber sagten dasselbe.
  if(d.type === 'runde') return '';
  // Das Blatt einer Partie trägt die Zeichnung ihrer Karte als Bühne. Es
  // zeigte einen nackten Stand und darunter zwei Wappen mit „gewinnen diese
  // Partie", während die Karte darüber Spielfeld, Mosaik oder Revanche trug:
  // wer sie öffnete, verlor das Bild, wegen dem er getippt hatte.
  if(d.matchId && (d.type === 'spiel' || (d.type === 'sammel' && _newsSorte(s) === 'spiel'))){ const b = _ndBuehne(s); if(b) return b; }
  { const x = _ndEigenesBlatt(s); if(x) return x.kopf; }
  // Eigene Bühnen und die Runde verwenden kein Ergebnisband. Sein Markup
  // erst für den sichtbaren Rückfall bauen, statt es jedes Mal zu verwerfen.
  const erg = d.matchId ? _newsBlattErgebnis(d.matchId) : '';
  if(!ids.length) return erg;
  // Ein Duo hat keinen Rang [§C27] — zwei Wappen, zwei Namen, keine Zeile
  // darunter, die es fuer beide gaebe.
  //
  // ── So viele Wappen wie Namen, und alle ──────────────────────────
  // Gezeigt wurden erst die ersten ZWEI, waehrend die Zeile daneben drei
  // Namen nannte, dann drei und ein Chip „+2" mit „und zwei weitere" daneben.
  // Das Blatt ist die Stelle, an der man nachsieht, wer dabei war: hier steht
  // jeder, mit Wappen und Namen. Ab vier rücken die Wappen enger.
  if(ids.length > 1){
    return erg + `<div class="nd-held nd-held-duo${ids.length > 3 ? ' viele' : ''}">
      <div class="nd-held-av">${ids.map(id => avHtml(pm[id], '', {ins:true, px:48, feuer:0})).join('')}</div>
      <div><div class="nd-held-nm">${esc(_namenListe(ids.map(nm)))}</div>
      <div class="nd-held-un">${esc(_ndBeziehung(s, ids.length))}</div></div></div>`;
  }
  const pid = ids[0];
  // Das Rangabzeichen ist ein Bauteil, das die App schon hat [§C27] — im Blatt
  // stand statt seiner die Zeile „Rang 6", also derselbe Rang als nackter Text.
  let ab = ''; try { ab = rankBadgeHtml(pid) || ''; } catch(e){}
  return erg + `<div class="nd-held" data-pid="${esc(pid)}">
    ${avHtml(pm[pid], '', {ins:true, px:54, feuer:0})}
    <div><div class="nd-held-nm">${esc(nm(pid))}</div>
    <div class="nd-held-un">${ab}<span>${esc(_newsRangZeile(pid))}</span></div></div></div>`;
}

// Kopf und Fuß der Karte, groß. Beide tragen den Stand und die Namen.
function _ndBuehne(s){
  try {
    const b = _spBild(s);
    return b && b.kopf ? `<div class="nd-buehne">${b.kopf}${b.fuss || ''}</div>` : '';
  } catch(e){ return ''; }
}
// ── Was unter der Bühne einer Partie steht ───────────────────────────
// Nur Zeichnungen und keine Sätze darüber, was sie zeigen: die Blätter
// trugen unter jedem Abschnitt eine Zeile Kleingedrucktes, die erklärte,
// was die Grafik ohnehin zeigt. Und nur, was die Bühne nicht schon zeigt.
// Jede Partie aus Sicht ihrer Teilnehmer: wie oft sich Sieger und
// Verlierer als Gegner trafen, die Bilanz und die letzten zwölf, diese
// Partie zuletzt.
function _ndDuelle(m, nur){
  const F = _spFakten(m), l = F.gegner.filter(g => !nur || nur(g));
  if(!l.length) return '';
  return `<div class="nd-dd">${l.sort((a, b) => b.n - a.n).map((g, k) => {
    const f = g.folge.slice(-12);
    return `<div class="nd-dd-z" data-pid="${esc(g.w)}" style="--k:${k}">${_spChip(g.w)}`
      + `<span class="nd-dd-n">${esc(_spName(g.w))}<i>gegen</i>${esc(_spName(g.l))}</span>`
      + `<b class="num">${_spZahl(g.s)}:${_spZahl(g.n - g.s)}</b>`
      + `<span class="nd-lf">${f.map((w, j) => `<i class="${w ? 'w' : 'l'}${j === f.length - 1 ? ' dies' : ''}"></i>`).join('')}</span></div>`;
  }).join('')}</div>`;
}
// Der Tag als Leiste: jede Partie mit Stand und Uhrzeit, diese gerahmt.
function _ndTagLeiste(m){
  const tag = _spFormBasis().tage.get(tagKey(m.created_at)) || [];
  if(tag.length < 2) return '';
  return `<div class="nd-tl">${tag.map((y, k) => `<span class="nd-tl-z${y === m ? ' dies' : ''}" style="--k:${k}">`
    + `<b class="num">${Math.max(y.games_a, y.games_b)}:${Math.min(y.games_a, y.games_b)}</b>`
    + `<small class="num">${esc(datumFmt(y.created_at, 'uhr'))}</small></span>`).join('')}</div>`;
}
// Wie oft die Liga bis hier mit diesem Abstand endete: eine Säule je
// Abstand, diese hell und mit ihrem Anteil.
function _ndVerteilung(m){
  const F = _spFakten(m), v = F.vert.slice(1), sum = v.reduce((a, b) => a + b, 0) || 1, max = Math.max(1, ...v);
  return `<div class="nd-vt">${v.map((n, k) => `<span class="${k + 1 === F.diff ? 'dies' : ''}" style="--k:${k}">`
    + (k + 1 === F.diff ? `<em class="num">${_spZahl(Math.round(n / sum * 100))} %</em>` : '')
    + `<i style="height:${Math.max(3, Math.round(n / max * 100))}%"></i><b class="num">${k + 1}</b></span>`).join('')}</div>`
    + `<div class="nd-vt-l"><span>1 Game Abstand</span><span>10 und mehr</span></div>`;
}

// Das Ergebnis der Partie, aus der die Story stammt. Vorher stand es je nach
// Typ mal als Block, mal gar nicht.
function _newsBlattErgebnis(matchId){
  const m = (matches || []).find(x => x.id === matchId);
  if(!m) return '';
  const pm = pmap();
  const seite = ids => ids.filter(id => pm[id])
    .map(id => `<span class="nd-erg-n">${esc(pm[id].name)}</span>`).join('');
  const aWin = m.winner === 'A';
  const dt = new Date(m.created_at).toLocaleDateString('de-DE',
    {weekday:'long', day:'2-digit', month:'2-digit'});
  const uhr = datumFmt(m.created_at, 'uhr');
  return `<div class="nd-erg">
    <div class="nd-erg-z">${esc(dt)} um ${esc(uhr)}</div>
    <div class="nd-erg-r">
      <div class="nd-erg-s${aWin?' w':''}">${seite([m.a1, m.a2])}</div>
      <div class="nd-erg-sc"><b class="${aWin?'w':'v'}">${m.games_a}</b><i>:</i><b class="${aWin?'v':'w'}">${m.games_b}</b></div>
      <div class="nd-erg-s re${aWin?'':' w'}">${seite([m.b1, m.b2])}</div>
    </div></div>`;
}

// ── Das Medaillon ────────────────────────────────────────────────────
// Eine Auszeichnung ist das Einzige im Feed, das man sich VERDIENT — und sie
// stand als graue Zeile „Seltenheit: Negative" im Blatt. Jetzt trägt sie
// ihr Zeichen in einem Ring, der die Klasse trägt, darunter die Bedingung
// und die Zahl der Halter [§C34]. Die Klasse färbt den Ring, nicht die
// ganze Fläche [§C25].
// `bp` macht das Medaillon antippbar: die Detailansicht der Auszeichnung für
// diesen Spieler (`{id, pid}`, `_bpBinden`).
function _newsMedaillon(ic, rarity, name, bedingung, badgeId, bp){
  const r = rarity || 'common';
  let halter = '';
  try { halter = _newsBadgeHalterText(badgeId); } catch(e){}
  return `<div class="nd-med nd-med-${esc(r)}"${bp && bp.id && bp.pid ? ` data-bp="${esc(bp.id)}" data-bp-pid="${esc(bp.pid)}"` : ''}>
    <div class="nd-med-r">${svgI(ic || 'medal')}</div>
    <div class="nd-med-t">
      <div class="nd-med-n">${esc(name || '')}</div>
      <div class="nd-med-k">${esc(_newsRarityLabel(r))}</div>
      ${_ndNeu(bedingung) ? `<div class="nd-med-b">${esc(bedingung)}</div>` : ''}
    </div>
    ${halter ? `<div class="nd-med-h">${esc(halter)}</div>` : ''}
  </div>`;
}

// ── Die Verfolger ────────────────────────────────────────────────────
// Ein Rekord ohne Verfolger ist eine Zahl ohne Maßstab. Das ganze Feld
// dahinter steht deshalb im Blatt — es waren die drei Besten, und die
// Überschrift „Wer dahinter liegt" sagte nicht, dass es nur drei waren. Gelesen wird dieselbe Rangfolge, aus der auch der
// Rekorde-Reiter zeichnet [§C27].
//
// Wer den Rekord HÄLT, steht hier nicht: bei einem Rekord, den sich drei
// punktgleich teilen, füllten genau diese drei die Liste, und unter der
// Überschrift „Wer sonst noch vorne steht" standen dieselben drei Namen mit
// derselben Zahl, die der Kopf zwei Zeilen darüber schon nennt [§C33].
// Wer DAHINTER liegt — und niemand davor. Die Karte traegt den Wert, der
// bei ihrer Entstehung galt (er steckt in ihrer ID); die Liste rechnet
// HEUTE. Zwischen beidem koennen Partien liegen, und dann stand unter
// „Martin uebernimmt ‚Der Zerstoerer' · 24 %" ein Verfolger mit 25 % —
// eine Karte, die sich selbst widerspricht. Wer den Wert der Karte
// inzwischen ueberholt hat, steht nicht dahinter, sondern davor: die Liste
// laesst ihn weg und sagt stattdessen, wem der Rekord jetzt gehoert.
function _newsVerfolger(rekordId, halter, wert){
  if(!rekordId) return '';
  try {
    const rang = chronicleRang(rekordId);
    if(!Array.isArray(rang) || rang.length < 2) return '';
    const pm = pmap();
    const oben = (Array.isArray(halter) ? halter : []);
    const grenze = (wert == null || !isFinite(wert)) ? null : wert + 1e-9;
    const davor = grenze == null ? [] : rang.filter(r =>
      oben.indexOf(r.pid || r.id) < 0 && r.wert > grenze);
    const dahinter = rang.filter(r => oben.indexOf(r.pid || r.id) < 0
                                   && (grenze == null || r.wert <= grenze));
    // ── Wie weit dahinter, sieht man ──────────────────────────────────
    // Die Liste nannte Rang, Name und Wert. Ob der Zweite knapp dran ist oder
    // weit weg, muss man daraus ausrechnen — und bei „84 %" gegen „81 %"
    // gegen „62 %" ist gerade das die Aussage. Der Balken zeigt den Anteil am
    // Bestwert. Nur wo er etwas bedeutet: ein Rekord, dessen Sortierwert
    // negativ ist (weniger Gegentore ist besser), hat keinen sinnvollen
    // Anteil, und dann bleibt der Balken weg.
    const basis = (wert != null && isFinite(wert) && wert > 0
                   && dahinter.every(r => isFinite(r.wert) && r.wert >= 0)) ? wert : null;
    const zeilen = dahinter.map((r, i) => {
      const pid = r.pid || r.id;
      if(!pm[pid]) return '';
      // Kein Mindestmaß: ein aufgerundeter Balken stellte den Vierten vor den
      // Dritten, und dann sagt er das Gegenteil von dem, was er soll.
      const anteil = basis ? Math.min(100, r.wert / basis * 100) : null;
      // Der Balken steht auf EIGENER Zeile und nicht neben dem Namen: die
      // Namensspalte ist so breit, wie der Wert daneben es uebrig laesst, und
      // damit war dieselbe Prozentzahl in jeder Zeile eine andere Laenge —
      // gemessen stand der Vierte mit einem laengeren Balken als der Dritte.
      return `<div class="nd-vf-z" data-pid="${esc(pid)}">
        <span class="nd-vf-n">${oben.length + i + 1}</span>
        ${avHtml(pm[pid], '', {ins:true, px:30, feuer:0})}
        <span class="nd-vf-nm">${esc(pm[pid].name)}</span>
        <b>${esc(_chronKurz(r.ev))}</b>
        ${anteil != null
          ? `<span class="nd-vf-b"><i style="width:${anteil.toFixed(1)}%"></i></span>` : ''}
      </div>`;
    }).filter(Boolean).join('');
    // Steht jemand darueber, ist der Rekord weitergewandert. Das gehoert
    // auf die Karte, nicht verschwiegen: sonst zeigt das Blatt eine
    // Bestmarke, die es nicht mehr gibt.
    const jetzt = davor.length ? `<div class="nd-stat-row">
        <div class="nd-stat-label">Hält ihn jetzt</div>
        <div class="nd-stat-val">${esc(davor.map(r => (pm[r.pid || r.id] || {}).name)
          .filter(Boolean).join(', '))}</div></div>` : '';
    return (zeilen || jetzt) ? `<div class="nd-section">Wer dahinter liegt</div>
      ${jetzt}<div class="nd-vf">${zeilen}</div>` : '';
  } catch(e){ return ''; }
}

// Die Partien eines Tages, an denen ein Spieler beteiligt war. „Kein anderer
// holte mehr Siege" ist eine Behauptung — das Blatt zeigt sie jetzt.
function _newsTagPartien(dayKey, pid){
  if(!dayKey) return [];
  try {
    const ids = new Set((Array.isArray(pid) ? pid : [pid]).filter(Boolean));
    return matches.filter(m => {
      if(tagKey(m.created_at) !== dayKey) return false;
      return !ids.size || [m.a1, m.a2, m.b1, m.b2].some(id => ids.has(id));
    });
  } catch(e){ return []; }
}

// ── Was oben steht, steht unten nicht noch einmal ────────────────────
// Der Kopf des Blatts zeigt Schlagzeile und Text der Karte. Steht derselbe
// Satz darunter ein zweites Mal, liest man ihn zweimal und erfaehrt nichts:
// beim Angstgegner stand „5× in Folge gegen denselben Gegner" als Bedingung
// im Medaillon, und drei Zeilen darueber im Text schon „Fuenf Pleiten in
// Folge gegen Maxi". Verglichen wird ohne Auszeichnung und ohne
// Grossschreibung, damit auch eine leicht umgestellte Fassung auffaellt.
let _ndOben = '';
function _ndNormal(t){
  return String(t == null ? '' : t)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[„""»«.,;:!?()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase();
}
function _ndNeu(txt){
  const n = _ndNormal(txt);
  if(!n || n.length < 12) return txt;
  return _ndOben.indexOf(n) >= 0 ? '' : txt;
}

// ── Die Leiter der Liga im Blatt ─────────────────────────────────────
// Jede Stufe eine Zeile, jedes Feld mit seinem Bild und darauf die Gesichter
// derer, die es an diesem Tag trugen — alle; vorher standen drei und „+2".
// Die Zeichen stehen im Violett der Vorlage: das Blatt gehört keinem Rang.
function _ndLigaLeiter(L){
  try {
    const pm = pmap(), felder = Array.isArray(L && L.felder) ? L.felder : [];
    const zeilen = INSIGNIEN.map((ins, i) => {
      const f = Array.from({length:INSIGNIUM_GRADE}, (_, g) => {
        const da = felder.filter(x => x[1] === i && x[2] === g && pm[x[0]]).map(x => x[0]);
        let z = '';
        try { z = insigniumStufeSvg(ins.key, INS_BILD_RANG, g) || ''; } catch(e){ z = ''; }
        const gesichter = da.map(pid =>
          `<span class="nd-ll-av" data-pid="${esc(pid)}">${avHtml(pm[pid], '', {px:18})}</span>`).join('');
        return `<span class="nd-ll-f${da.length ? ' da' : ''}">${z}`
          + (gesichter ? `<span class="nd-ll-g">${gesichter}</span>` : '') + `</span>`;
      }).join('');
      return `<div class="nd-ll-z"><div class="nd-ll-n"><b>${esc(ins.name)}</b>`
        + `<span class="num">${i === 0 ? 'Start' : 'ab ' + ins.min}</span></div>`
        + `<div class="nd-ll-r">${f}</div></div>`;
    }).join('');
    return `<div class="nd-ll">${zeilen}</div>`;
  } catch(e){ return ''; }
}

// ── Das Insignium im Blatt ───────────────────────────────────────────
// Die Karte „Stefan trägt den Schildring" öffnete ein Blatt mit NULL Zeichen
// Inhalt: kein Zeichen, keine Leiter, keine Punkte. Ausgerechnet die Story,
// die von der Stufe handelt, zeigte sie nicht. Hier steht sie jetzt groß —
// dieselbe Zeichnung wie in der Laufbahn [§C27], daneben, wie weit es zur
// nächsten ist, und darunter die Leiter aus der Karte.
function _newsInsigniumBlock(pid, stufeIdx){
  try {
    const P = prestigeOf(pid);
    if(!P) return '';
    const stufe = (stufeIdx != null && INSIGNIEN[stufeIdx]) ? stufeIdx : (P.stufe || 0);
    const ins = INSIGNIEN[stufe] || INSIGNIEN[0];
    const rangLabel = (getPlayerRank(pid) || {}).label;
    let zeichen = '';
    try { zeichen = insigniumStufeSvg(ins.key, rangLabel, P.grad) || ''; } catch(e){}
    const n = P.naechste;
    // Der Anteil misst die STUFE, nicht die Laufbahn: „62 % geschafft" heißt,
    // wie weit es von dieser Schwelle zur nächsten ist.
    const anteil = n ? Math.max(0, Math.min(100,
      Math.round((P.punkte - ins.min) / Math.max(1, n.min - ins.min) * 100))) : 100;
    // Am Ordensstern gibt es keine nächste Stufe, aber bis Grad III einen
    // nächsten Grad.
    const gradZiel = n ? null : insigniumGradSchwellen(stufe).find(x => x > P.punkte);
    return `<div class="nd-ins">
      <div class="nd-ins-z">${zeichen}</div>
      <div class="nd-ins-t">
        <div class="nd-ins-n">${esc(ins.name)}</div>
        <div class="nd-ins-p"><b>${P.punkte}</b> Prestige${P.platz ? ` · Platz ${P.platz} von ${P.von}` : ''}</div>
        ${n ? `<div class="nd-ins-b"><i style="width:${anteil}%"></i></div>
          <div class="nd-ins-r">Noch <b>${P.fehlt}</b> bis zum ${esc(n.name)} · ${anteil} %</div>`
            : `<div class="nd-ins-r">${gradZiel ? `Noch <b>${gradZiel - P.punkte}</b> bis ${esc(ins.name + ' ' + INSIGNIUM_GRAD_NAME[P.grad + 1])}`
                : 'Die höchste Stufe der Leiter'}</div>`}
      </div>
    </div>${_newsLeiter(pid)}`;
  } catch(e){ return ''; }
}

// Welche Partie steht schon im Kopf? Die Mitte darf sie dann nicht noch
// einmal zeigen: das Blatt trug dieselbe Begegnung zweimal untereinander,
// oben als Ergebnis und darunter als Match-Block.
let _ndKopfMatch = null;
// Steht das Insignium schon als Block in der Mitte? Dann nennt der Kopf es
// nicht noch einmal als Text.
let _ndZeichenUnten = false;

// Kopf und typ-eigene Mitte. Das Blatt endet danach direkt beim eindeutigen
// Schließen-Knopf; Profil- und Rückblick-Sprünge verdoppelten die Navigation.
function _newsDetailBody(s){
  const d = s.dataRef || {};
  // Die Mitte wird ZUERST gebaut. Nur so weiss der Kopf, ob das Zeichen schon
  // unten steht: sonst nannte er „Reif · 168 Prestige" und der Block darunter
  // sagte dasselbe noch einmal, mit Bild.
  _ndKopfMatch = d.matchId || null;
  _ndBlattJetzt = null;
  _ndOben = _ndNormal((s.title || '') + ' ' + (s.desc || ''));
  let mitte = '';
  try { mitte = _newsDetailMitte(s) || ''; } catch(e){ mitte = ''; }
  _ndKopfMatch = null;
  _ndOben = '';
  _ndZeichenUnten = mitte.indexOf('nd-ins') >= 0;
  const kopf = _newsBlattKopf(s);
  _ndZeichenUnten = false;
  return kopf + mitte;
}

// ── Der Spieltag als Bahn ────────────────────────────────────────────
// Das Blatt des Spielers des Tages zeigte jede Partie als vollen Vs-Block:
// vier Wappen, zwei Namenszeilen, ein Stand. An einem Tag mit zehn Partien
// sind das zehn solche Bloecke und vierzig Wappen — „Detail folgt der Groesse"
// warnt genau davor [§6]. Die Bahn zeigt den Tag dagegen in einer Zeile: ein
// Feld je Partie, gruen fuer einen Sieg, rot fuer eine Niederlage, in
// Spielreihenfolge. Darunter steht jede Partie kurz mit Uhrzeit, Stand und
// Gegner — das ist der Beleg, ohne die Wand.
function _ndTagesbahn(pid, liste, nurBahn){
  try {
    const ids = (Array.isArray(pid) ? pid : [pid]).filter(Boolean);
    if(!ids.length || !liste || !liste.length) return '';
    const haupt = ids[0];
    const pm = pmap();
    const reihe = liste.slice().sort((a, b) => mts(a) - mts(b));
    const sieg = m => {
      const aSeite = (m.a1 === haupt || m.a2 === haupt);
      return aSeite ? m.winner === 'A' : m.winner === 'B';
    };
    const dabei = m => [m.a1, m.a2, m.b1, m.b2].indexOf(haupt) >= 0;
    const eigene = reihe.filter(dabei);
    if(!eigene.length) return '';
    const felder = eigene.map(m => {
      const s = sieg(m);
      const hoch = Math.max(Number(m.games_a) || 0, Number(m.games_b) || 0);
      const tief = Math.min(Number(m.games_a) || 0, Number(m.games_b) || 0);
      return `<i class="${s ? 'w' : 'l'}">${s ? hoch + ':' + tief : tief + ':' + hoch}</i>`;
    }).join('');
    const zeilen = eigene.map(m => {
      const s = sieg(m);
      const aSeite = (m.a1 === haupt || m.a2 === haupt);
      const mit = (aSeite ? [m.a1, m.a2] : [m.b1, m.b2]).filter(x => x && x !== haupt);
      const geg = (aSeite ? [m.b1, m.b2] : [m.a1, m.a2]).filter(Boolean);
      const nm = x => (pm[x] && pm[x].name) || '?';
      const hoch = Math.max(Number(m.games_a) || 0, Number(m.games_b) || 0);
      const tief = Math.min(Number(m.games_a) || 0, Number(m.games_b) || 0);
      return `<div class="nd-tm ${s ? 'w' : 'l'}" data-mid="${esc(m.id)}">
        <span class="nd-tm-u">${esc(_newsUhrzeit(mts(m)))}</span>
        <span class="nd-tm-s">${s ? hoch + ':' + tief : tief + ':' + hoch}</span>
        <span class="nd-tm-g">${mit.length ? 'mit ' + esc(nm(mit[0])) + ', ' : ''}gegen ${
          esc(geg.map(nm).join(' & '))}</span>
      </div>`;
    }).join('');
    // Der Rückblick des Tages zeigt nur die Bahn: die Partien stehen dort
    // schon in den Höhepunkten.
    if(nurBahn) return `<div class="nd-bahn">${felder}</div>`;
    return `<div class="nd-bahn">${felder}</div><div class="nd-tml">${zeilen}</div>`;
  } catch(e){ return ''; }
}

// ── Die Wirkung auf die Laufbahn, gezeichnet ─────────────────────────
// Sie stand als Zeile da: „1205 → 1240 Prestige". Zwei Zahlen, die man erst
// lesen und dann verrechnen muss, und bei neun Zeilen darueber weiss niemand
// mehr, was daran ausschlaggebend war. Der Balken zeigt es: die Strecke von
// dieser Insignium-Schwelle zur naechsten, darin heller, was der Spieltag
// dazugelegt hat. Daneben der Zuwachs als Zahl und das Zeichen der Stufe.
//
// Gerechnet wird mit den GESPEICHERTEN Staenden und nicht mit `prestigeOf`:
// eine Karte von vorletzter Woche erzaehlt vom Stand von damals [§C31].
//
// ── Und sie zeigt, was verloren ging ──────────────────────────────────
// Jane zog bei „Der Lauf" mit Leon gleich, und Leon teilt den Rekord
// seitdem: sein Anteil halbiert sich, sein Prestige sinkt. Im Blatt stand
// bei ihm „±0" — ein Minus wurde als Null gezeigt, und der Balken kannte nur
// den Zuwachs. Ein Verlust steht jetzt rot da [§C25]: die Zahl mit Minus,
// das verlorene Stück als eigener Abschnitt im Balken, und fällt jemand
// unter eine Schwelle, sagt die Zeile „fällt auf …". Darunter steht, warum:
// welcher Rekord geteilt, verloren oder geholt wurde (`gruende`).
//
// Die Stufe kommt aus den Punkten und nicht aus der gespeicherten Zahl
// (`insigniumStufeVon`): die gespeicherte gehörte einer älteren Leiter.
// ── Woher die Zahl kommt ─────────────────────────────────────────────
// Die Zahl rechts ist die Bewegung des ganzen Spieltags über alle drei
// Quellen [§C34]; die Zeilen darunter nennen nur, was diese Karte erzählt.
// Ohne Aufschlüsselung stand „übernimmt ‚Der Einzelkämpfer'" neben −33 und
// „verliert ‚Der Lauf'" neben +34: beim einen verloren die übrigen Rekorde
// im selben Moment an Wert, der andere gewann an anderer Stelle mehr, als
// die beiden Rekorde kosteten. Neue Karten tragen die Quellen (`rek`, `mon`); für ältere
// wird nachgerechnet, an den Ständen vor und nach dem Spieltag — und nur
// gezeigt, wenn die Summe die gespeicherte Zahl trifft, sonst erzählte die
// Aufschlüsselung von einem anderen Stand als die Zahl daneben.
function _ndWirkungQuellen(pid, w, tagMs){
  const delta = Math.round(Number(w.nach) || 0) - Math.round(Number(w.vor) || 0);
  let rek = w.rek, mon = w.mon, posten = [];
  if(tagMs){
    try {
      const memo = _ndWirkungQuellen.memo || (_ndWirkungQuellen.memo = new Map());
      const k = tagKey(tagMs) + '|' + (matches || []).length;
      let paar = memo.get(k);
      if(!paar){
        const tg = _storyTagGrenzen(tagMs);
        paar = tg ? {vor:_storyStand(tg.vorMs), nach:_storyStand(tg.nachMs)} : null;
        if(memo.size > 8) memo.clear();
        memo.set(k, paar);
      }
      const x = paar && _prestigeWirkung(pid, paar.vor, paar.nach);
      if(x && x.vor === Math.round(Number(w.vor) || 0) && x.nach === Math.round(Number(w.nach) || 0)){
        rek = x.rekordDelta; mon = x.monatDelta;
        // Die Posten, die sich bewegt haben: ein Rekord, der geteilt wurde
        // oder im Stapel an Wert verlor, steht auf keiner Zeile der Karte und
        // erklärt trotzdem ein Minus neben „übernimmt".
        const je = st => { const o = {};
          (((st.prestige(pid) || {}).quellen) || []).forEach(q => {
            if(q.q === 'rekord' || q.q === 'monat') o[q.q + ':' + q.id] = {name:q.name || '', p:q.p || 0}; });
          return o; };
        const a = je(paar.vor), b = je(paar.nach);
        posten = [...new Set(Object.keys(a).concat(Object.keys(b)))]
          .map(k => ({name:(b[k] || a[k]).name, d:Math.round((b[k] ? b[k].p : 0) - (a[k] ? a[k].p : 0))}))
          .filter(x => x.name && x.d).sort((p, q) => Math.abs(q.d) - Math.abs(p.d));
      }
    } catch(e){}
  }
  if(rek == null || mon == null) return null;
  return {rek, mon, aus:delta - rek - mon, posten};
}
function _ndWirkungBlock(je, gruende, tagMs){
  const ids = Object.keys(je || {});
  if(!ids.length) return '';
  const pm = pmap();
  const dl = pid => Math.round(Number(je[pid].nach) || 0) - Math.round(Number(je[pid].vor) || 0);
  // Der groesste Zuwachs zuerst: er ist das, was den Tag ausmacht. Wer
  // verloren hat, steht darunter.
  return ids.sort((a, b) => dl(b) - dl(a))
    .map(pid => {
      const w = je[pid];
      const nach = Math.round(Number(w.nach) || 0);
      const vor = Math.round(Number(w.vor) || 0);
      const delta = nach - vor;
      const sn = insigniumStufeVon(nach);
      const sv = insigniumStufeVon(vor);
      const ins = sn != null ? INSIGNIEN[sn] : null;
      const next = sn != null ? INSIGNIEN[sn + 1] : null;
      const auf = sn != null && sn > sv;
      const ab = sn != null && sn < sv;
      let zeichen = '';
      try {
        if(ins)
          zeichen = insigniumStufeSvg(ins.key, (getPlayerRank(pid) || {}).label, 0) || '';
      } catch(e){}
      // Die Strecke ist die STUFE, nicht die Laufbahn: „noch 460 bis zum
      // Lorbeerreif" ist die Frage, die ein Traeger hat [§C30].
      let balken = '', rest = '';
      if(ins && next){
        const spanne = Math.max(1, next.min - ins.min);
        const lage = x => Math.max(0, Math.min(100, (x - ins.min) / spanne * 100));
        const bis = lage(nach);
        // Beim Aufstieg liegt der alte Stand unter dieser Schwelle, beim Fall
        // darüber: dann ist die ganze Strecke Zuwachs bzw. Verlust.
        const war = auf ? 0 : ab ? 100 : lage(vor);
        const fest = Math.min(bis, war);
        balken = `<span class="nd-wk-b"><i style="width:${fest.toFixed(1)}%"></i>`
          + (delta >= 0
              ? `<em style="width:${Math.max(0, bis - fest).toFixed(1)}%"></em>`
              : `<u style="width:${Math.max(0, war - fest).toFixed(1)}%"></u>`)
          + `</span>`;
        rest = ab
          ? `${nach} Prestige · noch ${Math.max(0, INSIGNIEN[sv].min - nach)} zurück zum ${esc(INSIGNIEN[sv].name)}`
          : `${nach} Prestige · noch ${Math.max(0, next.min - nach)} bis zum ${esc(next.name)}`;
      } else if(ins){
        rest = `${nach} Prestige · die letzte Stufe`;
      } else {
        rest = `${nach} Prestige`;
      }
      const marke = !ins ? ''
        : auf ? `<em>${esc('neu: ' + ins.name)}</em>`
        : ab ? `<em class="r">${esc('fällt auf ' + ins.name)}</em>`
        : `<em>${esc(ins.name)}</em>`;
      // Jeder Grund als Chip. Ab dem vierten stand „+1", und welcher Rekord
      // fehlte, sah man nirgends — das Blatt ist die Stelle, die alles nennt.
      const gr = ((gruende && gruende[pid]) || []);
      const chips = gr.map(g => `<span class="nd-wk-g ${g.neg ? 'r' : 'g'}">${
        esc(g.verb)} <b>${esc(g.name)}</b></span>`).join('');
      const dz = delta > 0 ? '+' + delta : delta < 0 ? '−' + Math.abs(delta) : '±0';
      const q = delta ? _ndWirkungQuellen(pid, w, tagMs) : null;
      const vz = v => (v > 0 ? '+' : '−') + Math.abs(v);
      const quellen = q ? [['Rekorde', q.rek], ['Monatschroniken', q.mon], ['Auszeichnungen', q.aus]]
        .filter(x => x[1]).map(x => `<span>${x[0]} <b class="${x[1] > 0 ? 'g' : 'r'}">${vz(x[1])}</b></span>`).join('') : '';
      // Was die Chips nicht schon nennen, mit seinem Anteil: jeder Posten,
      // aber nur in der Richtung der Zahl daneben. Neben −123 erklärten zwei
      // Pluszeilen nichts, sie lasen sich als Widerspruch.
      const genannt = new Set(((gruende && gruende[pid]) || []).map(g => g.name));
      const posten = q ? (q.posten || []).filter(x => !genannt.has(x.name) && (x.d > 0) === (delta > 0))
        .map(x => `<span>„${esc(x.name)}“ <b class="${x.d > 0 ? 'g' : 'r'}">${vz(x.d)}</b></span>`).join('') : '';
      return `<div class="nd-wk${delta < 0 ? ' neg' : ''}${ab ? ' fall' : ''}" data-pid="${esc(pid)}" style="cursor:pointer">
        ${zeichen ? `<span class="nd-wk-z">${zeichen}${ab
          ? `<i class="nd-wk-ab">${svgI('trendDown')}</i>` : auf
          ? `<i class="nd-wk-auf">${svgI('trendUp')}</i>` : ''}</span>` : ''}
        <span class="nd-wk-t">
          <span class="nd-wk-n"><b>${esc((pm[pid] && pm[pid].name) || '?')}</b>${marke}</span>
          ${balken}
          <span class="nd-wk-r">${rest}</span>
          ${quellen ? `<span class="nd-wk-q">${quellen}</span>` : ''}
          ${posten ? `<span class="nd-wk-q nd-wk-p">${posten}</span>` : ''}
          ${chips ? `<span class="nd-wk-gs">${chips}</span>` : ''}
        </span>
        <span class="nd-wk-d ${delta > 0 ? 'g' : delta < 0 ? 'r' : ''}">${dz}</span>
      </div>`;
    }).join('');
}

// Warum sich die Laufbahn eines Spielers an diesem Tag bewegt hat, aus den
// Zeilen eines Tafel-Moments: wer einen Rekord oder eine Chronik geholt,
// geteilt oder verloren hat. Die Zeilen tragen dafür die Halter vor und nach
// dem Tag; ohne sie (ältere Läufe) bleibt die Liste leer.
//
// Genannt wird nur, was Prestige bewegt. Eine Monatschronik zählt je Spieler
// und Monat einmal, die wertvollste [§C32]: bei Leon standen dreizehn Chips,
// „holt ‚Die Steigerung'", „holt ‚Der Höhenflug'" und so weiter, neben
// „Monatschroniken −20" — keiner davon hatte etwas bewegt. `zaehlt` nennt,
// wem eine Chronik wirklich etwas gibt oder nimmt.
function _ndWirkungsGruende(teile){
  const out = {};
  (teile || []).forEach(t => {
    const nach = t.halter || [], vor = t.vorher || [];
    const name = t.rname || '';
    if(!name || (!nach.length && !vor.length)) return;
    const nur = Array.isArray(t.zaehlt) ? t.zaehlt : null;
    const dazu = (pid, g) => { if(!nur || nur.indexOf(pid) >= 0) (out[pid] = out[pid] || []).push(g); };
    nach.forEach(pid => {
      if(vor.indexOf(pid) < 0) dazu(pid, {verb: vor.length ? 'übernimmt' : 'holt', name, neg:false});
      else if(nach.length < vor.length) dazu(pid, {verb:'hält allein', name, neg:false});
    });
    vor.forEach(pid => {
      if(nach.indexOf(pid) < 0) dazu(pid, {verb:'verliert', name, neg:true});
      else if(nach.length > vor.length) dazu(pid, {verb:'teilt', name, neg:true});
    });
  });
  // Ein Verlust zuerst: er erklärt das Minus daneben.
  Object.keys(out).forEach(pid => out[pid].sort((a, b) => b.neg - a.neg));
  return out;
}

// ── Die Siegchance als Skala ─────────────────────────────────────────
// „57 %" ist eine Zahl, die man erst lesen und dann einordnen muss: war das
// ein Pflichtsieg oder eine Sensation? Die Elo-Rechnung hat dafuer vier
// Linien [§5.2], und sie stehen an EINER Stelle. Der Balken zeigt, wo die
// Partie darin lag, und die Aufschrift nennt das Wort dazu.
function _ndChanceSkala(chance){
  const c = Number(chance);
  if(!isFinite(c) || c <= 0 || c >= 1) return '';
  const pct = Math.max(1, Math.round(c * 100));
  const wort = chanceWort(c);
  // Rot nur, wo die Rechnung dagegenstand: Gruen und Rot sind die Richtung
  // [§C25], Metall ist alles Uebrige.
  const ton = c < CHANCE_UPSET ? ' r' : (c >= CHANCE_FAVORIT ? ' g' : '');
  const linien = [CHANCE_SENSATION, CHANCE_UPSET, CHANCE_FAVORIT]
    .map(x => `<u style="left:${Math.round(x * 100)}%"></u>`).join('');
  return `<div class="nd-chance${ton}">
    <div class="nd-chance-b">${linien}<i style="width:${pct}%"></i></div>
    <div class="nd-chance-z"><span>Siegchance vor der Partie</span>
      <span><b>${pct} %</b> · ${esc(wort)}</span></div>
  </div>`;
}

// ── Die Elo-Wirkung je Spieler ───────────────────────────────────────
// Vier Zahlen untereinander sagen nicht, wer am meisten gewonnen und wer am
// meisten verloren hat. Der Balken zeigt den Ausschlag, die Mitte ist die
// Null, und der Rang dahinter sagt, was die Partie in der Tabelle bewegt hat.
function _ndEloWirkung(matchId, pids){
  try {
    const liste = (pids || []).map(pid => ({pid, d: _newsEloDelta(pid, matchId)}))
      .filter(x => x.d != null);
    if(!liste.length) return '';
    const max = Math.max.apply(null, liste.map(x => Math.abs(x.d))) || 1;
    const pm = pmap();
    return liste.sort((a, b) => b.d - a.d).map(x => {
      const breit = Math.max(4, Math.round(Math.abs(x.d) / max * 50));
      const rk = _newsRankChange(x.pid, matchId);
      // Nur ein WECHSEL ist eine Aussage. „6 → 6" ist keine.
      const rang = (rk && rk.pre !== rk.post)
        ? `<em>Rang ${rk.pre} → ${rk.post}</em>` : '';
      return `<div class="nd-elo" data-pid="${esc(x.pid)}" style="cursor:pointer">
        <span class="nd-elo-n">${esc((pm[x.pid] && pm[x.pid].name) || '?')}</span>
        <span class="nd-elo-b"><i class="${x.d >= 0 ? 'p' : 'n'}" style="width:${breit}%"></i></span>
        <span class="nd-elo-v ${x.d >= 0 ? 'g' : 'r'}">${x.d >= 0 ? '+' : ''}${x.d}</span>
        ${rang}
      </div>`;
    }).join('');
  } catch(e){ return ''; }
}

// ── Die Blätter einer Serie [§C33] ──────────────────────────────────
// Sie zeigten die Serie als Reihe von Punkten und darunter Zahlen in
// Zeilen („Gemeinsame Bilanz bis hierher", „Tore 411:564"), und welche
// Partien die Serie waren, stand nirgends. Jetzt trägt die Bühne Gesicht,
// Zahl, Lauf und Zeitraum, und darunter steht jede Partie der Serie.
// Die Partien eines Laufs: die letzten n eigenen bis zu dieser, bei einem
// Duo nur die gemeinsamen auf derselben Seite.
function _ndLauf(pid, partner, bis, n){
  let l = _spEigene(pid, bis);
  if(partner) l = l.filter(y => [y.a1, y.a2, y.b1, y.b2].includes(partner) && _spSeite(y, pid) === _spSeite(y, partner));
  return l.slice(-Math.max(1, n));
}
// Eine Liste solcher Zeilen: der Tag steht nur an der ersten Partie des
// Tages, zehnmal „25.08." untereinander sagt nichts.
function _ndPartieListe(l, fuer){
  return `<div class="nd-pzl">${l.map((y, k) => _ndPartieZeile(y, fuer, k, !k || tagKey(l[k - 1].created_at) !== tagKey(y.created_at))).join('')}</div>`;
}
// Eine Partie in einer Zeile aus Sicht dessen, um den es geht: Tag, die
// eigene Seite, der Stand mit den eigenen Toren zuerst, die Gegner.
function _ndPartieZeile(y, fuer, k, tagNeu){
  const w = _spGew(y, fuer), eig = _spTeam(y, _spSeite(y, fuer)), geg = _spTeam(y, _spSeite(y, fuer) === 'A' ? 'B' : 'A');
  const t = _spSeite(y, fuer) === 'A' ? [y.games_a, y.games_b] : [y.games_b, y.games_a];
  return `<div class="nd-pz ${w ? 'w' : 'l'}" data-mid="${esc(y.id)}" style="--k:${k || 0}">`
    + `<span class="nd-pz-t num">${tagNeu !== false ? `<small>${esc(datumFmt(y.created_at, 'tm'))}</small>` : ''}${esc(datumFmt(y.created_at, 'uhr'))}</span>${_spChips(eig)}`
    + `<b class="num">${t[0]}:${t[1]}</b><span class="nd-pz-gg">gegen</span>${_spChips(geg)}</div>`;
}
function _ndSerieBuehne(ids, n, neg, lauf, duo){
  const pm = pmap();
  const gesicht = duo ? `<span class="nd-sr-duo">${ids.map(_spChip).join('')}</span>`
    : (pm[ids[0]] ? avHtml(pm[ids[0]], '', {ins:true, px:64, feuer:0}) : '');
  const von = lauf.length ? datumFmt(lauf[0].created_at, 'tm') : '', bis = lauf.length ? datumFmt(lauf[lauf.length - 1].created_at, 'tm') : '';
  return `<div class="nd-buehne nd-sr${neg ? ' neg' : ''}"><div class="nd-sr-k">${gesicht}`
    + `<div class="nd-sr-z"><b class="num">${_spZahl(n)}</b><span>${neg ? (n === 1 ? 'Niederlage' : 'Niederlagen') : (n === 1 ? 'Sieg' : 'Siege')} in Folge</span>`
    + `<em>${esc(_namenListe(ids.map(_spName)))}</em></div></div>`
    + _newsSerienBand(n, neg, !neg)
    + (von ? `<div class="nd-sr-d num"><span>${esc(von)}</span><span>${esc(bis)}</span></div>` : '') + `</div>`;
}
// Wie oft jeder Partner dabei war, als Balken.
function _ndPartnerBalken(pid, lauf){
  const z = {};
  lauf.forEach(y => { const p = _spTeam(y, _spSeite(y, pid)).find(id => id !== pid); if(p) z[p] = (z[p] || 0) + 1; });
  const ids = Object.keys(z).sort((a, b) => z[b] - z[a]);
  // Lauter „1×" sagen nichts: die Zeile kommt erst, wenn einer öfter dabei war.
  if(ids.length < 2 || z[ids[0]] < 2) return '';
  const max = z[ids[0]];
  return `<div class="nd-bk">${ids.map((id, k) => `<div class="nd-bk-z" data-pid="${esc(id)}" style="--k:${k}">${_spChip(id)}`
    + `<span class="nd-bk-n">${esc(_spName(id))}</span><span class="nd-bk-b"><i style="width:${Math.round(z[id] / max * 100)}%"></i></span>`
    + `<b class="num">${z[id]}×</b></div>`).join('')}</div>`;
}
// Die Siegquote jedes der beiden mit dem anderen und mit allen übrigen
// Partnern, bis zu dieser Partie.
function _ndZusammenGetrennt(a, b, bis){
  const q = (pid, mit) => { const l = _spEigene(pid, bis), z = l.filter(y => [y.a1, y.a2, y.b1, y.b2].includes(mit) && _spSeite(y, pid) === _spSeite(y, mit));
    const o = l.filter(y => z.indexOf(y) < 0);
    return {mit:Math.round(z.filter(y => _spGew(y, pid)).length / Math.max(1, z.length) * 100), ohne:Math.round(o.filter(y => _spGew(y, pid)).length / Math.max(1, o.length) * 100)}; };
  const zeile = (wort, v, kl) => `<div class="nd-zg-r"><span>${wort}</span><span class="nd-zg-b"><i class="${kl}" style="width:${v}%"></i></span><b class="num">${v} %</b></div>`;
  return `<div class="nd-zg">${[[a, b], [b, a]].map(([p, o], k) => { const x = q(p, o);
    return `<div class="nd-zg-p" data-pid="${esc(p)}" style="--k:${k}"><div class="nd-zg-n">${_spChip(p)}<b>${esc(_spName(p))}</b></div>`
      + zeile('zusammen', x.mit, x.mit < x.ohne ? 'r' : 'g') + zeile('mit anderen', x.ohne, '') + `</div>`; }).join('')}</div>`;
}
// Was nach der letzten Partie des Laufs kam: die nächste eigene Partie.
function _ndWieWeiter(pid, partner, m){
  const l = matchesOfPlayer(pid, matches);
  const nach = l.slice(l.indexOf(m) + 1).find(y => !partner || ([y.a1, y.a2, y.b1, y.b2].includes(partner) && _spSeite(y, pid) === _spSeite(y, partner)));
  return nach ? _ndPartieZeile(nach, pid) : '';
}
function _ndSerieBlatt(s){
  const d = s.dataRef || {}, t = d.type;
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  if(!m) return null;
  const ab = (ti, html) => html ? `<div class="nd-section">${esc(ti)}</div>${html}` : '';
  if(t === 'streak_killer'){
    const lauf = _ndLauf(d.victimPid, null, m, d.streak + 1);
    return {kopf:`<div class="nd-buehne">${_spRissBild(_spRissDaten({m, x:{victimPid:d.victimPid, streak:d.streak}}))}</div>`,
      mitte:ab('Die Serie, die riss', _ndPartieListe(lauf, d.victimPid))
        + ab('Die Brecher gegen ' + _spName(d.victimPid), _ndDuelle(m, g => g.l === d.victimPid))};
  }
  const duo = t === 'team_streak' || t === 'team_loss_streak';
  const neg = t === 'loss_streak' || t === 'team_loss_streak';
  const pid = duo ? d.a : d.pid, partner = duo ? d.b : null;
  if(!pid || !d.streak) return null;
  const lauf = _ndLauf(pid, partner, m, d.streak);
  let marken = '';
  if(t === 'win_streak'){ try { marken = _spSerieBild(_spSerieDaten({m:lauf[0], x:{pid, streak:d.streak}})); } catch(e){} }
  return {kopf:_ndSerieBuehne(duo ? [d.a, d.b] : [pid], d.streak, neg, lauf, duo),
    mitte:ab('Gegen die Bestmarken', marken)
      + ab(neg ? 'Niederlage für Niederlage' : 'Sieg für Sieg', _ndPartieListe(lauf, pid))
      + (duo ? ab('Zusammen und getrennt', _ndZusammenGetrennt(d.a, d.b, m)) : ab('Mit wem', _ndPartnerBalken(pid, lauf)))
      + ab('Die nächste Partie', _ndWieWeiter(pid, partner, m))};
}

// ── Das Blatt einer Rivalität [§C33] ────────────────────────────────
// Es zeigte zwei Gesichter mit „55 Siege" darunter und das Jubiläumsduell
// als Band; wie es zu der Bilanz kam, stand nirgends. Die Bühne trägt jetzt
// beide und die Zahl der Duelle, darunter das Tauziehen der Bilanz, dann
// den Verlauf, die letzten dreißig und die deutlichsten auf jeder Seite.
// Gezählt wird bis zur Partie der Karte.
function _ndRivalBlatt(s){
  const d = s.dataRef || {}, a = d.a, b = d.b, pm = pmap();
  if(!a || !b || !pm[a] || !pm[b]) return null;
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  let l = _spEigene(a, m || undefined).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(b) && _spSeite(y, a) !== _spSeite(y, b));
  if(!m) l = matchesOfPlayer(a, matches).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(b) && _spSeite(y, a) !== _spSeite(y, b));
  if(!l.length) return null;
  const f = l.map(y => _spGew(y, a)), sa = f.filter(Boolean).length, n = l.length;
  const seite = id => `<div class="nd-rv-p" data-pid="${esc(id)}">${avHtml(pm[id], '', {ins:true, px:64, feuer:0})}<b>${esc(_spName(id))}</b></div>`;
  const kopf = `<div class="nd-buehne nd-rv">${seite(a)}<div class="nd-rv-m"><b class="num">${_spZahl(n)}</b><span>Duelle</span></div>${seite(b)}`
    + `<div class="nd-rv-tau"><b class="num">${_spZahl(sa)}</b><span class="nd-rv-tb"><i style="width:${(sa / n * 100).toFixed(1)}%"></i></span><b class="num">${_spZahl(n - sa)}</b></div></div>`;
  // Der Verlauf: jede Begegnung schiebt die Linie, über der Null führt a.
  let k = 0;
  const v = [0].concat(f.map(w => (k += w ? 1 : -1)));
  const lo = Math.min(...v, 0), hi = Math.max(...v, 0), W = 300, H = 96;
  const X = i => 4 + i / Math.max(1, v.length - 1) * (W - 8), Y = x => 8 + (1 - (x - lo) / Math.max(1, hi - lo)) * (H - 16);
  const linie = `<div class="nd-li"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="nd-li-0" x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>`
    + `<polyline points="${v.map((x, i) => X(i).toFixed(1) + ',' + Y(x).toFixed(1)).join(' ')}"/>`
    + `<circle cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="3.5"/></svg>`
    + `<span class="nd-li-o">${esc(_spName(a))} vorn</span><span class="nd-li-u">${esc(_spName(b))} vorn</span></div>`;
  const letzte = f.slice(-30);
  const lauf = `<div class="nd-lf gross">${letzte.map((w, j) => `<i class="${w ? 'w' : 'l'}${j === letzte.length - 1 && m ? ' dies' : ''}"></i>`).join('')}</div>`;
  const deutlich = w => l.filter(y => _spGew(y, a) === w).sort((p, q) => Math.abs(q.games_a - q.games_b) - Math.abs(p.games_a - p.games_b))[0];
  const dl = [deutlich(true), deutlich(false)].filter(Boolean);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:(m ? ab('Das ' + n + '. Duell', _ndPartieListe([m], a)) : '')
    + ab('Wer wann vorn lag', n >= 3 ? linie : '')
    + ab(letzte.length < n ? 'Die letzten ' + letzte.length : 'Jedes Duell', lauf)
    + ab('Die deutlichsten', dl.length ? _ndPartieListe(dl, a) : '')};
}

// ── Das Blatt einer Auszeichnung [§C33] ─────────────────────────────
// Das Medaillon stand unter einem Band der Partie und dem Wappen, darunter
// „Elo aus dieser Partie" — eine Zahl, die mit der Auszeichnung nichts zu tun
// hat. Jetzt steht das Medaillon mit den Gesichtern als Bühne, darunter die
// Partie, in der sie geholt wurde, und jeder Spieler der Liga als Feld: hell,
// wer sie trägt. Die Zahl der Halter steht damit gezeichnet und nicht
// zusätzlich als Satz im Medaillon.
function _ndBadgeBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const pids = ((Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId]).filter(id => pm[id]);
  if(!pids.length || !d.badgeId) return null;
  const bdef = (typeof BADGES !== 'undefined') ? BADGES.find(b => b.id === d.badgeId) : null;
  const medaille = _newsMedaillon(s.ic || (bdef && bdef.ic) || 'medal', d.rarity,
    d.badgeName || (bdef && bdef.name) || '', bdef ? bdef.desc : '', null, {id:d.badgeId, pid:pids[0]});
  // Jeder, der sie an diesem Tag geholt hat; der fünfte fiel vorher still weg.
  const kopf = `<div class="nd-buehne nd-bd">${medaille}<div class="nd-bd-w">${pids.map(id =>
    `<span data-pid="${esc(id)}">${avHtml(pm[id], '', {ins:true, px:52, feuer:0})}<b>${esc(_spName(id))}</b></span>`).join('')}</div></div>`;
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  const alle = Object.keys(pm).filter(id => sichtbar(pm[id]));
  const hat = id => (getCachedBadges(id) || []).some(b => b.id === d.badgeId);
  const traeger = alle.filter(hat).length;
  const feld = `<div class="nd-tg">${alle.sort((x, y) => hat(y) - hat(x)).map((id, k) => `<span class="${hat(id) ? 'hat' : ''}${pids.includes(id) ? ' dies' : ''}" data-pid="${esc(id)}" style="--k:${k}">`
    + `${_spChip(id)}<small>${esc(_spName(id))}</small></span>`).join('')}</div>`;
  const nem = d.nemesisOppId && pm[d.nemesisOppId] && _ndNormal(_ndOben).indexOf(_ndNormal(_spName(d.nemesisOppId))) < 0
    ? `<div class="nd-stat-row" data-pid="${esc(d.nemesisOppId)}" style="cursor:pointer"><div class="nd-stat-label">Gegen wen</div>`
      + `<div class="nd-stat-val neg">${esc(_spName(d.nemesisOppId))} ›</div></div>` : '';
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Geholt in dieser Partie', m ? _ndPartieListe([m], pids[0]) : '') + nem
    + ab(traeger === 1 ? 'Nur einer trägt sie' : traeger + ' von ' + alle.length + ' tragen sie', traeger ? feld : '')};
}

// ── Das Blatt eines Liga-Rekords [§C33] ─────────────────────────────
// Es zeigte den Wert groß, darunter „Vorher gehalten von Leon ›" als Zeile
// und unter „Für die Laufbahn" je Halter einen Rechentext („Aktuelle Form ·
// Grundwert 150 ÷ 4 Halter · 18. Rekord ÷ √7 · 20 Rekorde: 1450 → 1465").
// Die Bühne zeigt jetzt den Wechsel als Bild — wer ihn vorher hielt, wer
// jetzt — und den Wert, beim Ausbau den alten durchgestrichen davor. Die
// Wirkung steht gezeichnet wie an der Tafel: Stufe, Zuwachs oder Verlust
// und der Weg zur nächsten Schwelle. Die Rechnung der Quelle steht im
// Laufbahn-Blatt, wohin jede Zeile führt.
function _ndRekordBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const neu = ((Array.isArray(d.halter) && d.halter.length) ? d.halter : (d.playerIds || [])).filter(id => pm[id]);
  if(!neu.length) return null;
  const vorRoh = (Array.isArray(d.vorher) ? d.vorher : []).filter(id => pm[id]);
  // Als Vorgänger steht nur, wer wirklich weg ist [§C33].
  const weg = vorRoh.filter(id => neu.indexOf(id) < 0);
  const def = (typeof CHRONICLE_BY_ID !== 'undefined') ? CHRONICLE_BY_ID[d.rekordId] : null;
  const wert = _chronKurz(d.ev);
  const alt = d.type === 'rekord_gesteigert' && d.evVorher ? _chronKurz(d.evVorher) : '';
  const kopf = _ndWechselBuehne({neu, weg, wert, alt, metall:!!d.zufall,
    label:d.kammerLabel || 'Bestmarke', name:d.rekordName || (def && def.name) || ''});
  // Die Wirkung aus den gespeicherten Ständen: eine Karte von vorletzter
  // Woche erzählt vom Stand von damals [§C31]. Ohne Stände (ältere Läufe)
  // steht, was der Rekord heute bringt, und kein Zuwachs.
  const lb = d.laufbahn || {}, je = {};
  Object.keys(lb).forEach(id => { if(pm[id] && lb[id] && lb[id].vor != null && lb[id].nach != null) je[id] = lb[id]; });
  let wirkung = '';
  if(Object.keys(je).length){
    wirkung = _ndWirkungBlock(je, _ndWirkungsGruende([{halter:neu, vorher:vorRoh, rname:d.rekordName || (def && def.name) || ''}]),
      new Date(s.when).getTime());
  } else {
    wirkung = neu.map(id => { let q = null;
      try { q = ((prestigeTabelle().byPid[id] || {}).quellen || []).find(x => x.q === 'rekord' && x.id === d.rekordId) || null; } catch(e){}
      return q ? `<div class="nd-stat-row" data-pid="${esc(id)}" style="cursor:pointer"><div class="nd-stat-label">${esc(_spName(id))}</div>`
        + `<div class="nd-stat-val acid">${esc(komma(q.p).replace(',0', ''))} Prestige aus diesem Rekord ›</div></div>` : ''; }).join('');
  }
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:(_ndNeu(d.cond) ? `<div class="tnote nd-rk-c">${esc(d.cond)}</div>` : '')
    // Alle Halter, nicht `playerIds`: die nennen höchstens drei, und der
    // vierte stand dann als Verfolger unter seinem eigenen Rekord.
    + _newsVerfolger(d.rekordId, neu, d.wert)
    + belegHtml({ev:d.ev, kurz:true})
    + ab('Wirkung auf die Laufbahn', wirkung)
    + (def ? `<button class="btn ghost sm" data-chron="${esc(def.id)}" style="margin-top:12px;width:100%">Rekord öffnen</button>` : '')};
}

// ── Der Spieler des Tages [§C33] ────────────────────────────────────
// Unter dem Wappen standen zwei Kacheln „67 %" und „6 : 3", die der Satz
// darüber schon nennt. Die Bühne trägt jetzt Krone, Wappen und die Elo des
// Tages als Kurve über der Bahn; darunter das Feld des Tages — jeder, der
// gespielt hat, nach Siegen — und seine Partien.
function _ndPotdBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const pids = ((Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId]).filter(id => pm[id]);
  if(!pids.length || !d.dayKey) return null;
  const pid = pids[0];
  let kurve = '';
  try { kurve = _spTagBild(_spTagDaten(Object.assign({}, s, {dataRef:Object.assign({}, d, {playerId:pid})}))); } catch(e){}
  const kopf = `<div class="nd-buehne nd-pt"><div class="nd-pt-k"><span class="nd-pt-kr">${svgI('crown')}</span>`
    // Bei Gleichstand jeder, der den Tag teilt, nicht die ersten drei.
    + pids.map(id => `<span data-pid="${esc(id)}">${avHtml(pm[id], '', {ins:true, px:pids.length > 3 ? 56 : 72, feuer:0})}</span>`).join('')
    + `</div><b class="nd-pt-n">${esc(_namenListe(pids.map(_spName)))}</b>${kurve}</div>`;
  const tag = (_spFormBasis().tage.get(d.dayKey) || []);
  const feld = {};
  tag.forEach(y => [y.a1, y.a2, y.b1, y.b2].forEach(id => { if(!pm[id]) return; feld[id] = feld[id] || {s:0, n:0}; feld[id].n++; if(_spGew(y, id)) feld[id].s++; }));
  const ids = Object.keys(feld).sort((a, b) => feld[b].s - feld[a].s || feld[b].s / feld[b].n - feld[a].s / feld[a].n);
  const max = Math.max(1, ...ids.map(id => feld[id].n));
  const balken = ids.length > 1 ? `<div class="nd-bk nd-ft">${ids.map((id, k) => `<div class="nd-bk-z${pids.includes(id) ? ' hell' : ''}" data-pid="${esc(id)}" style="--k:${k}">${_spChip(id)}`
    + `<span class="nd-bk-n">${esc(_spName(id))}</span><span class="nd-bk-b"><i style="width:${Math.round(feld[id].n / max * 100)}%"><u style="width:${Math.round(feld[id].s / feld[id].n * 100)}%"></u></i></span>`
    + `<b class="num">${feld[id].s} von ${feld[id].n}</b></div>`).join('')}</div>` : '';
  const liste = _newsTagPartien(d.dayKey, pids);
  const bahn = _ndTagesbahn(pids, liste);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  // Das Gegenstück des Tages, das als eigene Karte unter dieser stand
  // (`gegenstueck`, aus der Verdichtung): sein Satz und seine Partien.
  const g = d.gegenstueck;
  const gegen = g && pm[g.pid] ? `<div class="nd-gegen" data-pid="${esc(g.pid)}">${_spChip(g.pid)}`
      + `<span><b>${esc(_spName(g.pid))}</b> gibt an diesem Tag mehr Elo ab als jeder andere</span>`
      + `<b class="num r">${_spVz(Number(g.delta) || 0)} Elo</b></div>`
      + _ndTagesbahn([g.pid], _newsTagPartien(d.dayKey, [g.pid])) : '';
  return {kopf, mitte:ab('Das Feld des Tages', balken) + ab(pids.length > 1 ? 'Der Tag der Tagessieger' : 'Der Tag in Partien', bahn)
    + ab('Der härteste Tag', gegen)
    // Was der Schluss des Tages vergab, im Blatt mit jedem Posten, dem
    // wievielten Mal und dem Rest seines Werts — derselbe Kasten wie im
    // Blatt einer Ehrung [§11.6f, §C27].
    + ab('Die Ehrung des Tages', _ehrungBloeckeHtml(d.ehrung))};
}

// ── Der Endspurt der Saison [§C33] ──────────────────────────────────
// Zwei Buchstaben-Kreise mit „11 Elo Diff" dazwischen und darunter
// „Verbleibend 6 Tage" als Zeile. Die Bühne zeigt die verbleibenden Tage als
// Ring, die beiden mit Wappen und Elo und den Abstand als Balken; darunter
// der Abstand Tag für Tag.
function _ndEndspurtBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), a = d.leader, b = d.second;
  if(!a || !b || !pm[a.pid] || !pm[b.pid]) return null;
  let h = null; try { h = getSeasonPositionHistory(d.sid); } catch(e){}
  const tage = (h && (h.totalDays || (h.eloByDay && h.eloByDay[a.pid] || []).length)) || 31;
  const zeile = (x, k) => `<div class="nd-es-z" data-pid="${esc(x.pid)}"><span class="nd-es-r num">${k}.</span>${avHtml(pm[x.pid], '', {ins:true, px:48, feuer:0})}`
    + `<b>${esc(_spName(x.pid))}</b><span class="num">${_spZahl(x.elo)} Elo</span></div>`;
  const kopf = `<div class="nd-buehne nd-es"><div class="nd-es-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" class="g"/>`
    + `<circle cx="40" cy="40" r="34" class="f" pathLength="1" style="stroke-dasharray:${Math.max(0, Math.min(1, 1 - d.daysLeft / tage)).toFixed(3)} 1"/></svg>`
    + `<b class="num">${d.daysLeft}</b><span>${d.daysLeft === 1 ? 'Tag' : 'Tage'}</span></div>`
    + `<div class="nd-es-r2">${zeile(a, 1)}<div class="nd-es-gap"><span><i style="width:${Math.min(100, d.gap / 100 * 100).toFixed(0)}%"></i></span><b class="num">${_spZahl(d.gap)} Elo</b></div>${zeile(b, 2)}</div></div>`;
  let linie = '';
  try {
    const ea = (h.eloByDay || {})[a.pid] || [], eb = (h.eloByDay || {})[b.pid] || [];
    const v = ea.map((x, i) => x != null && eb[i] != null ? x - eb[i] : null).filter(x => x != null);
    if(v.length >= 3){
      const lo = Math.min(...v, 0), hi = Math.max(...v, 0), W = 300, H = 90;
      const X = i => 4 + i / Math.max(1, v.length - 1) * (W - 8), Y = x => 8 + (1 - (x - lo) / Math.max(1, hi - lo)) * (H - 16);
      linie = `<div class="nd-li"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="nd-li-0" x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>`
        + `<polyline points="${v.map((x, i) => X(i).toFixed(1) + ',' + Y(x).toFixed(1)).join(' ')}"/><circle cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="3.5"/></svg>`
        + `<span class="nd-li-o">${esc(_spName(a.pid))} vorn</span><span class="nd-li-u">${esc(_spName(b.pid))} vorn</span></div>`;
    }
  } catch(e){}
  return {kopf, mitte:linie ? `<div class="nd-section">Der Abstand Tag für Tag</div>${linie}` : ''};
}

// ── Ein Wechsel an der Ewigen Tafel als Bild [§C33] ─────────────────
// Rekord und Monatschronik wechseln auf dieselbe Weise den Halter, also
// zeigt sie EIN Bauteil [§C27]: wer weg ist, ein Pfeil, wer jetzt hält, der
// Wert groß und darunter der Name. Die Chronik trägt darüber ihr Zeichen —
// ihr Blatt war eine Spalte aus Zahlenkästen, Podest und Textzeilen.
function _ndWechselBuehne(o){
  const pm = pmap();
  const wap = (id, px) => `<span data-pid="${esc(id)}">${avHtml(pm[id], '', {ins:true, px, feuer:0})}</span>`;
  // Jeder, der vorher hielt, und jeder, der jetzt hält: es waren höchstens
  // drei und vier, der Rest stand als „+2". Bei vielen werden die Wappen
  // kleiner und die Reihe bricht um.
  const neu = o.neu || [], weg = o.weg || [];
  const viele = neu.length + weg.length > 5;
  return `<div class="nd-buehne nd-rk${o.metall ? ' metall' : ''}">`
    + (o.ic ? `<span class="nd-rk-ic">${zkHtml(o.ic, 'g', o.metall ? '' : 'gold')}</span>` : '')
    + `<div class="nd-rk-w">`
    + (weg.length ? `<div class="nd-rk-alt">${weg.map(id => wap(id, viele ? 38 : 48)).join('')}<small>vorher</small></div>`
      + `<svg class="nd-rk-pf" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8H34"/><path d="M28 3L35 8L28 13"/></svg>` : '')
    + `<div class="nd-rk-neu">${neu.map(id => wap(id, viele ? 44 : weg.length ? 52 : neu.length > 1 ? 60 : 76)).join('')}`
    + `<small>${weg.length ? 'jetzt' : (neu.length > 1 ? 'halten ihn' : 'hält ihn')}</small></div></div>`
    + `<em class="nd-rk-h">${esc(_namenListe(neu.map(_spName)))}</em>`
    + (o.wert ? `<div class="nd-rk-v">${o.alt ? `<s class="num">${esc(o.alt)}</s>` : ''}<b class="num">${esc(o.wert)}</b><span>${esc(o.label || '')}</span></div>` : '')
    + `<div class="nd-rk-n">${esc(o.name || '')}</div>`
    + (o.marken && o.marken.length ? `<div class="nd-rk-m">${o.marken.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : '')
    + `</div>`;
}

// ── Drei Ebenen, die nicht dasselbe sind [§C32] ─────────────────────
// In der MONATSTAFEL kann ein Spieler mehrere Disziplinen führen, im PROFIL
// steht genau eine davon, und nur diese eine zählt fürs PRESTIGE [§C34].
// Die Zeile nannte einen Namen und einen Wert: wer „Der Nervenkitzel" neben
// „kein zusätzliches Prestige" las, konnte nicht sehen, dass dieser Name
// einem ANDEREN Eintrag gehört. Gezählt wird aus `seasonTitles` — derselben
// Quelle, aus der die Tafel selbst kommt — und zwar am Stand der Karte: die
// laufende Monatstafel ändert sich bei jeder Partie, und eine Karte von
// Dienstag erzählt vom Dienstag. Ein Bauteil für die beiden Karten, die
// davon erzählen [§C27]: den Wechsel und den Tag, an dem die Tafel aufgeht.
function _ndChronikEbenen(d, bisMs, ids, wertVon, modus, titleId){
  const pm = pmap();
  let T = null;
  try { T = seasonTitles(d.sid, bisMs); } catch(e){ T = null; }
  const awarded = (T && T.awarded) || [];
  return ids.map(pid => {
    const plus = Number(wertVon(pid)) || 0;
    const tp = chronikEintragVon(T, pid);
    const titel = (tp && tp.name) || (d.titelJeSpieler || {})[pid] || '';
    const diese = (titleId && tp) ? tp.titleId === titleId : false;
    const n = awarded.filter(a => a.pid === pid).length;
    // Überschattet, steht im Profil nicht die Schattenseite, die hier zählt
    // — das Profil zeigt keine —, sondern dass diese Chronik nichts bringt.
    const eigen = titleId ? awarded.find(a => a.pid === pid && a.titleId === titleId) : null;
    const schatten = eigen ? chronikUeberschattet(T, eigen) : null;
    const ebenen = [];
    if(n) ebenen.push(n + (n === 1 ? ' Eintrag' : ' Einträge') + ' in der Tafel');
    if(schatten) ebenen.push('überschattet von „' + schatten.name + '"');
    else if(diese) ebenen.push('im Profil steht diese');
    else if(titel) ebenen.push('im Profil „' + titel + '"');
    // Der Wert und was er bedeutet stehen untereinander, und die Spalte
    // bricht um (`.nd-ce > em`). In einer Zeile („126,5 Prestige · zählt
    // aktuell", „kein zusätzliches Prestige") nahm sie dem Namen daneben so
    // viel Platz, dass er bei 310 px abgeschnitten wurde.
    const [wert, was] = modus === 'zuwachs'
      ? (plus > 0 ? ['+' + plus + ' Prestige', ''] : ['kein zusätzliches Prestige', ''])
      : (plus > 0 ? [String(plus).replace('.', ',') + ' Prestige', 'zählt aktuell']
                  : ['zählt aktuell nicht', '']);
    return `<div class="nd-ce" data-pid="${esc(pid)}">${pm[pid] ? avHtml(pm[pid], '', {px:30}) : ''}
      <span class="nd-ce-t"><b>${esc(_spName(pid))}</b>${ebenen.length ? `<small>${esc(ebenen.join(' · '))}</small>` : ''}</span>
      <em class="${plus > 0 ? 'g' : ''}">${esc(wert)}${was ? `<small>${esc(was)}</small>` : ''}</em></div>`;
  }).join('');
}

// ── Eine Monatschronik wechselt den Halter [§C33] ───────────────────
// Dieselbe Bühne wie beim Rekord, dazu das Zeichen der Chronik und ihre
// Klasse. Darunter die vier Angaben ihres Werts, das Feld im Monat, wenn
// mehr als einer die Bedingung erfüllt (sonst stünde der Halter ein zweites
// Mal als Podest da), und die Wirkung gezeichnet wie an der Tafel.
function _ndChronikBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const def = (typeof SEASON_TITLE_BY_ID !== 'undefined') ? SEASON_TITLE_BY_ID[d.titleId] : null;
  const neu = ((Array.isArray(d.alle) && d.alle.length) ? d.alle : (d.playerIds || [])).filter(id => pm[id]);
  if(!neu.length || !d.sid) return null;
  const vor = (Array.isArray(d.vorher) ? d.vorher : []).filter(id => pm[id]);
  const weg = vor.filter(id => neu.indexOf(id) < 0);
  const name = d.chronName || (def && def.name) || '';
  const kl = CHRONIK_KLASSE_NAME[d.chronKlasse || (def && def.klasse)];
  const kopf = _ndWechselBuehne({neu, weg, wert:d.ev ? _chronKurz(d.ev) : '', label:'Monatschronik',
    name, marken:[kl, seasonLabel(d.sid)].filter(Boolean)});
  const bis = new Date(s.when).getTime() + 1;
  let podest = '', halterWert = Number.isFinite(d.wert) ? d.wert : undefined;
  try {
    const C = _seasonTitleCtx(d.sid, Number.isFinite(bis) ? bis : undefined);
    const r = def && def.pick ? def.pick(C, new Set()) : null;
    // Eine Karte von vor dem Bonus trägt keinen Wert; dann rechnet die
    // Zahlenreihe mit dem Halter am Tag der Karte [§C39].
    if(halterWert === undefined && r && r.halter && r.halter.length && r.wert) halterWert = r.wert(r.halter[0]);
    if(r && r.rang && r.rang.length > 1){
      podest = _chronPodestHtml(r.rang.map(pid => {
        let w = ''; try { w = r.evFuer ? r.evFuer(pid) : ''; } catch(e){}
        return {pid, wert:_chronKurz(w), v:r.wert ? r.wert(pid) : null};
      }));
    }
  } catch(e){}
  const lb = d.laufbahn || {}, je = {};
  Object.keys(lb).forEach(id => { if(pm[id] && lb[id] && lb[id].vor != null && lb[id].nach != null) je[id] = lb[id]; });
  const wirkung = Object.keys(je).length
    ? _ndWirkungBlock(je, _ndWirkungsGruende([{halter:neu, vorher:vor, rname:name, zaehlt:d.zaehlt}]), new Date(s.when).getTime()) : '';
  const beitragIds = (Array.isArray(d.playerIds) ? d.playerIds : []).filter(id => pm[id]);
  const laufbahn = _newsChronikPrestige(d);
  const ebenen = beitragIds.length
    ? _ndChronikEbenen(d, Number.isFinite(bis) ? bis : undefined, beitragIds, pid => laufbahn.werte[pid], laufbahn.modus, d.titleId) : '';
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  const cond = def && def.cond && _ndNeu(def.cond) ? def.cond : '';
  return {kopf, mitte:(cond ? `<div class="tnote nd-rk-c">${esc(cond)}</div>` : '')
    + (def ? _chronFaktenHtml(def, halterWert) : '')
    + ab('Das Feld im Monat', podest)
    + ab('Wirkung auf die Laufbahn', wirkung)
    + ab('Tafel, Profil und Laufbahn', ebenen)
    + `<button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`};
}

// ── Die Monatstafel als Bild [§C33] ─────────────────────────────────
// Die Karte des Tages, an dem die Tafel eines Monats aufgeht; geschnitten
// wird an der Karte. Wie sie am Monatswechsel feststeht, zeigt die Karte des
// Monatsabschlusses, und die öffnet den Saison-Rückblick. Das Blatt
// zeigte eine Zahl in einem Kasten und darunter Namen mit Textzeilen. Die Bühne
// trägt jetzt die Zahl der Einträge und je Träger einen Balken so lang wie
// seine Einträge; darunter steht jeder Eintrag als Zelle aus Zeichen,
// Kurzname und Gesicht — die Tafel selbst, so wie sie am Tag der Karte
// stand.
function _ndMonatBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  if(!d.sid) return null;
  const bis = new Date(s.when).getTime() + 1;
  let T = null;
  try { T = seasonTitles(d.sid, Number.isFinite(bis) ? bis : undefined); } catch(e){ T = null; }
  const aw = ((T && T.awarded) || []).filter(a => pm[a.pid]);
  if(!aw.length) return null;
  const je = {};
  aw.forEach(a => { je[a.pid] = (je[a.pid] || 0) + 1; });
  const ids = Object.keys(je).sort((a, b) => je[b] - je[a] || _spName(a).localeCompare(_spName(b)));
  const max = Math.max(...ids.map(id => je[id]));
  // Je Träger ein Balken so lang wie seine Einträge, mit Gesicht und Name:
  // dasselbe Bauteil wie das Feld des Spielers des Tages [§C27].
  // Jeder Träger, nicht sechs und „und 2 weitere".
  const balken = ids.map((id, k) => `<div class="nd-bk-z${k === 0 ? ' hell' : ''}" data-pid="${esc(id)}" style="--k:${k}">`
    + `${_spChip(id)}<span class="nd-bk-n">${esc(_spName(id))}</span>`
    + `<span class="nd-bk-b"><i style="width:${Math.round(je[id] / max * 100)}%"><u style="width:100%"></u></i></span>`
    + `<b class="num">${je[id]}</b></div>`).join('');
  const kopf = `<div class="nd-buehne nd-mo"><div class="nd-mo-k"><b class="num">${aw.length}</b>`
    + `<span>${aw.length === 1 ? 'Eintrag' : 'Einträge'} · ${esc(seasonLabel(d.sid) || '')}</span>`
    + `<small>${ids.length === 1 ? 'ein Spieler' : ids.length + ' Spieler'} · bis Monatsende offen</small></div>`
    + `<div class="nd-bk nd-ft">${balken}</div></div>`;
  const zellen = aw.map((a, k) => `<span class="nd-mo-z" data-pid="${esc(a.pid)}" style="--k:${k}">`
    + `<i>${svgI(a.ic || 'scroll')}</i><b>${esc(a.name || a.short || '')}</b>${avHtml(pm[a.pid], '', {px:22})}</span>`).join('');
  // Am Tag, an dem die Tafel aufgeht, zählt ab jetzt jeder Eintrag fürs
  // Prestige [§C34]: die vorläufigen Profileinträge stehen deshalb dabei.
  let ebenen = '';
  {
    const tr = (Array.isArray(d.traeger) ? d.traeger : []).filter(id => pm[id]);
    const monatWert = pid => {
      try {
        const q = ((prestigeTabelle().byPid[pid] || {}).quellen || [])
          .find(x => x.q === 'monat' && (!x.sid || x.sid === d.sid));
        return q ? Math.round((q.p || 0) * 10) / 10 : 0;
      } catch(e){ return 0; }
    };
    if(tr.length) ebenen = `<div class="nd-section">Tafel, Profil und Laufbahn</div>`
      + _ndChronikEbenen(d, Number.isFinite(bis) ? bis : undefined, tr, monatWert, 'bestand', '');
  }
  return {kopf, mitte:`<div class="nd-section">Die Tafel an diesem Tag</div><div class="nd-mo-g">${zellen}</div>`
    + ebenen + `<button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`};
}

// ── Die neue Stufe [§C30] ───────────────────────────────────────────
// Die Stufe IST die Story. Das Blatt trug denselben Block wie jede
// Prestige-Karte: ein kleines Zeichen, eine Zeile Text und die Leiter. Die
// Bühne zeigt jetzt die Verwandlung — die Stufe davor leise, ein Pfeil, die
// neue groß um das Gesicht —, darunter woraus die Punkte kommen als ein
// Balken in drei Farben, der Weg durch die drei Grade dieser Stufe und die
// Leiter. Gerechnet wird mit dem gespeicherten Stand: eine Karte von
// vorletzter Woche erzählt vom Stand von damals, und die Stufe ist eine
// Ableitung aus den Punkten.
function _ndInsigniumBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid]) return null;
  const lb = (d.laufbahn || {})[pid] || null;
  const punkte = Number(d.punkte) || (lb && Number(lb.nach)) || 0;
  if(!punkte && d.stufe == null) return null;
  const i = punkte ? insigniumStufeVon(punkte) : (d.stufe | 0);
  const ins = INSIGNIEN[i], next = INSIGNIEN[i + 1];
  const rl = (getPlayerRank(pid) || {}).label;
  const gs = insigniumGradSchwellen(i);
  let grad = 0; gs.forEach((x, g) => { if(punkte >= x) grad = g; });
  const zeichen = (key, g, bild) => { try { return insigniumStufeSvg(key, rl, g, bild ? {bild:true} : undefined) || ''; } catch(e){ return ''; } };
  const vorher = i > 0 ? INSIGNIEN[i - 1] : null;
  const kopf = `<div class="nd-buehne nd-is">`
    + `<div class="nd-is-w">${vorher ? `<span class="nd-is-alt">${zeichen(vorher.key, 2, true)}<small>${esc(vorher.name)}</small></span>`
      + `<svg class="nd-rk-pf" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8H34"/><path d="M28 3L35 8L28 13"/></svg>` : ''}`
    + `<span class="nd-is-neu" data-pid="${esc(pid)}"><span class="nd-is-z">${zeichen(ins.key, grad)}</span>`
    + `<span class="nd-is-av">${avHtml(pm[pid], '', {px:58})}</span></span></div>`
    + `<b class="nd-is-n">${esc(ins.name)}</b><span class="nd-is-p"><b class="num">${punkte}</b> Prestige · ${esc(_spName(pid))}</span>`
    + (d.wieder ? `<span class="nd-is-wd">wieder getragen${typeof d.wieder === 'string'
      ? ' · zuletzt ' + esc(datumFmt(d.wieder + 'T12:00:00', 'tmx')) : ''}</span>` : '') + `</div>`;
  // Woraus die Punkte kommen. Gespeichert ist die Aufteilung im Satz der
  // Karte; jüngere Karten tragen sie zusätzlich als Zahlen.
  let teile = d.teile || null;
  if(!teile){
    const m = /(\d+) aus Auszeichnungen, (\d+) aus Monatschroniken und (\d+) aus Rekorden/.exec(String(s.desc || ''));
    if(m) teile = {auszeichnung:+m[1], monat:+m[2], rekord:+m[3]};
  }
  let quellen = '';
  if(teile){
    const q = [['auszeichnung', 'Auszeichnungen'], ['monat', 'Chroniken'], ['rekord', 'Rekorde']]
      .map(([k, l]) => ({k, l, v:Math.max(0, Math.round(Number(teile[k]) || 0))}));
    const sum = q.reduce((a, x) => a + x.v, 0);
    if(sum > 0) quellen = `<div class="nd-is-q"><span class="nd-is-qb">${q.map(x => x.v ? `<i class="${x.k}" style="width:${(x.v / sum * 100).toFixed(1)}%"></i>` : '').join('')}</span>`
      + `<span class="nd-is-ql">${q.map(x => `<span class="${x.k}"><b class="num">${x.v}</b>${x.l}</span>`).join('')}</span></div>`;
  }
  const weg = next ? _insWegHtml(pid, punkte) : '';
  const leiter = `<div class="nf-leiter nd-is-l">${INSIGNIEN.map((x, k) => `<span class="nf-lt-p${k <= i ? ' hat' : ''}${k === i ? ' jetzt' : ''}">`
    + `${zeichen(x.key, k === i ? grad : 0, true)}</span>`).join('')}</div>`;
  const ab = (x, html) => html ? `<div class="nd-section">${esc(x)}</div>${html}` : '';
  return {kopf, mitte:ab('Woraus die Punkte kommen', quellen) + ab('Der Weg durch die Stufe', weg) + ab('Die Leiter', leiter)};
}

// Der Weg durch eine Stufe: drei Grade als Strecken, je mit ihrem Bild,
// der Stand als Marke, und am Ende die nächste Stufe mit ihrer Schwelle.
// Was fehlt, steht im Satz der Karte; hier zeigt es die Strecke. Mit dem
// Stand davor (`vorher`) steht auch er als leise Marke darauf, wenn er in
// derselben Stufe lag: so sieht man einen neuen Grad als Weg. Die
// Insignium-Karte des Tages und das Blatt einer Stufe teilen es [§C27].
function _insWegHtml(pid, punkte, vorher){
  const i = insigniumStufeVon(punkte), ins = INSIGNIEN[i], next = INSIGNIEN[i + 1];
  if(!next) return '';
  const rl = (getPlayerRank(pid) || {}).label;
  const gs = insigniumGradSchwellen(i);
  let grad = 0; gs.forEach((x, g) => { if(punkte >= x) grad = g; });
  const zeichen = (key, g) => { try { return insigniumStufeSvg(key, rl, g, {bild:true}) || ''; } catch(e){ return ''; } };
  const spanne = Math.max(1, next.min - ins.min);
  const lage = x => Math.max(0, Math.min(100, (x - ins.min) / spanne * 100));
  const grenzen = gs.concat([next.min]);
  const alt = vorher != null && insigniumStufeVon(vorher) === i && Math.round(vorher) !== Math.round(punkte)
    ? `<em class="nd-is-gm alt" style="left:${lage(vorher).toFixed(1)}%"></em>` : '';
  return `<div class="nd-is-g"><div class="nd-is-gs">${gs.map((x, g) => `<span class="nd-is-gf${g <= grad ? ' da' : ''}${g === grad ? ' jetzt' : ''}" style="flex:${(lage(grenzen[g + 1]) - lage(x)).toFixed(1)} 1 0">`
    + `<span class="nd-is-gz">${zeichen(ins.key, g)}</span><i></i><small class="num">${x}</small></span>`).join('')}`
    + `${alt}<em class="nd-is-gm" style="left:${lage(punkte).toFixed(1)}%"></em></div>`
    + `<span class="nd-is-ge"><span class="nd-is-gz">${zeichen(next.key, 0)}</span><small class="num">${next.min}</small></span></div>`;
}

// ── Der Tafel-Moment als Zeitleiste [§C33] ──────────────────────────
// Die Tafel eines Tages rollt: jeder weitere Wechsel ersetzt ihre Karte
// [§C33]. Die Bühne zeigt, WANN sich an diesem Tag etwas bewegt hat: die
// Partien des Tages als Striche auf einer Achse, und über jedem Augenblick
// seine Bewegungen als Punkte in der Farbe ihrer Art — Gold Bestmarke und
// Chronik, Silber der Ausbau, Violett die Stufe [§C25].
// Hier stand vorher je Spieler eine Zeile mit Gesicht, Namen, einem Satz
// und einem Zeichen je Bewegung. Genau das zeigt die Liste darunter schon,
// Zeile für Zeile und mit dem Wechsel aus Gesichtern: das Blatt sagte
// dieselbe Sache zweimal untereinander. Namen stehen deshalb nur unten.
// Davor stand eine Zeitachse mit gestapelten ZEICHEN und losen Namenschips;
// welches Zeichen wem gehörte, war nicht zu erkennen. Ohne Namen ist das
// keine Frage mehr: oben steht der Tag, unten stehen die Leute.
// Die Klassen tragen `nd-ta`/`ta-`: `.nd-tl` ist die Tagesleiste, und
// `.rek` ist die Karte des Rekorde-Reiters, die ihr Raster über den Punkt
// zog — er war damit 22 statt 9 Pixel hoch.
function _ndTafelArt(t){
  const ty = String(t.typ || t.type || '');
  return ty === 'insignium_stufe' ? 'ins' : ty === 'rekord_gesteigert' ? 'aus'
    : ty.indexOf('chronik_') === 0 ? 'chr' : 'rek';
}
function _ndTafelMomentBlatt(s){
  const d = s.dataRef || {};
  if(d.type !== 'sammel' || (d.quelle !== 'tafel' && d.quelle !== 'form')) return null;
  const teile = (Array.isArray(d.teile) ? d.teile : []).filter(t => Number.isFinite(t.ms));
  if(!teile.length) return null;
  const ms = teile.map(t => t.ms);
  // Die Achse ist der Spieltag, nicht nur die Spanne der Bewegungen: erst
  // daneben sieht man, nach welcher Partie sich die Tafel bewegt hat und
  // nach welchen nicht.
  const tag = tagKey(Math.max(...ms));
  const partien = (matches || []).map(mts).filter(x => Number.isFinite(x) && tagKey(x) === tag);
  const A = Math.min(...ms, ...partien), B = Math.max(...ms, ...partien);
  const lage = x => B > A ? 6 + (x - A) / (B - A) * 88 : 50;
  // Was näher als ein Punkt beieinander liegt, steht in einer Säule —
  // nebeneinander überlappten die Punkte, und dann war ihre Zahl nicht mehr
  // zu zählen.
  const ORDNUNG = {rek:0, chr:1, ins:2, aus:3};
  const saeulen = [];
  teile.slice().sort((a, b) => a.ms - b.ms).forEach(t => {
    const x = lage(t.ms), letzte = saeulen[saeulen.length - 1];
    if(letzte && x - letzte.x0 < 6) letzte.arten.push(_ndTafelArt(t));
    else saeulen.push({x0:x, arten:[_ndTafelArt(t)], ms:t.ms});
  });
  // Jede Bewegung ein Punkt: eine Säule mit mehr als sechs trug oben „+3",
  // und die Säule sagte damit eine andere Zahl als die Liste darunter.
  // Höher als fünf Punkte wird eine Säule nicht, sie wird breiter: neunzehn
  // Bewegungen nach einer Partie standen als ein Turm von 230 px über einer
  // leeren Fläche, und die Liste begann erst unter dem halben Bildschirm.
  // Die weiteren Spalten wachsen zur Mitte hin, damit keine über den Rand
  // läuft (`l`: nach links).
  const STAPEL = 5;
  const saeulenHtml = saeulen.map((z, k) => {
    const arten = z.arten.sort((a, b) => ORDNUNG[a] - ORDNUNG[b]);
    const spalten = [];
    for(let i = 0; i < arten.length; i += STAPEL) spalten.push(arten.slice(i, i + STAPEL));
    return `<span class="nd-ta-s${z.x0 > 50 ? ' l' : ''}" style="left:${z.x0.toFixed(1)}%;--k:${k}">`
      + spalten.map(sp => `<span class="nd-ta-c">${sp.map(a => `<i class="ta-${a}"></i>`).join('')}</span>`).join('')
      + `</span>`;
  }).join('');
  // Die Partie, nach der sich etwas bewegt hat, ist hell; die übrigen
  // bleiben leise Striche auf der Achse.
  const bewegt = new Set(ms);
  const striche = partien.map(x => `<i class="nd-ta-p${bewegt.has(x) ? ' an' : ''}" style="left:${lage(x).toFixed(1)}%"></i>`).join('');
  // So hoch wie die höchste Säule: fest bemessen stand über zwei Punkten
  // eine leere Fläche, so groß wie die Liste darunter.
  const hoehe = Math.min(STAPEL, Math.max(...saeulen.map(z => z.arten.length)));
  const NAME = {rek:'Bestmarke', chr:'Monatschronik', ins:'Insignium', aus:'Ausbau'};
  const da = Object.keys(NAME).filter(a => teile.some(t => _ndTafelArt(t) === a));
  const uhr = x => esc(_newsUhrzeit(x));
  const kopf = `<div class="nd-buehne nd-ta${d.quelle === 'form' ? ' form' : ''}">`
    + `<div class="nd-ta-k"><b class="num">${teile.length}</b><span>${teile.length === 1 ? 'Bewegung' : 'Bewegungen'}`
    + `${d.quelle === 'form' ? ' auf kurzer Strecke' : ' an der Ewigen Tafel'}</span>`
    + `</div>`
    + `<div class="nd-ta-f" aria-hidden="true" style="--h:${hoehe}">${saeulenHtml}<span class="nd-ta-a"></span>${striche}</div>`
    + `<div class="nd-ta-u num"><span>${uhr(A)}</span><span>${partien.length === 1 ? 'eine Partie'
      : (_BELEG_ZAHL[partien.length] || String(partien.length)) + ' Partien'}</span>${B > A ? `<span>${uhr(B)}</span>` : ''}</div>`
    + `<div class="nd-ta-l">${da.map(a => `<span class="ta-${a}"><i></i>${NAME[a]}</span>`).join('')}</div></div>`;
  return {kopf, mitte:null};
}

// Wohin eine Zeile der Tafel führt: zu dem, wovon sie erzählt. Sie führte
// ins Profil des ersten Genannten, und wer auf „Der Zerstörer" tippte, um
// zu sehen, wer dahinter liegt, landete auf einer Seite über einen Menschen.
// Ein Rekord öffnet sein Blatt, eine Monatschronik ihre Wertung im Monat
// der Karte, ein Insignium die Laufbahn. Nur was keines davon kennt — eine
// Zeile aus einem älteren Lauf ohne Verweis —, bleibt beim Profil.
function _ndTafelZiel(t){
  const ref = t.ref || {}, ty = String(t.typ || t.type || '');
  const pid = ref.pid || (t.pids || [])[0];
  if(ty.indexOf('rekord_') === 0 && ref.rekordId && CHRONICLE_BY_ID[ref.rekordId])
    return ` data-chron="${esc(ref.rekordId)}"`;
  if(ty === 'chronik_geholt' && ref.titleId && SEASON_TITLE_BY_ID[ref.titleId] && ref.sid)
    return ` data-disz="${esc(ref.titleId + '|' + ref.sid)}"`;
  if(ty.indexOf('chronik_') === 0 && ref.sid) return ` data-season-table="${esc(ref.sid)}"`;
  if(ty === 'insignium_stufe' && pid && pmap()[pid]) return ` data-laufbahn="${esc(pid)}"`;
  return pid && pmap()[pid] ? ` data-pid="${esc(pid)}"` : '';
}

// Eine Zeile der Tafel als Bild statt als Satz: der Name des Eintrags, was
// geschah, und rechts der Wechsel aus Gesichtern. Ohne Halter (ältere Läufe)
// bleibt die Zeile, wie sie war.
// Der Wert kommt getrennt (`wert`, `wertText`): wohin er gehört, entscheidet
// die Zeile an seiner Länge. Er stand immer rechts unter den Gesichtern und
// brach nicht um — „Maxi gewinnt an dieser Seite 100 %, sonst 31 %" machte
// die rechte Spalte so breit, dass Eintrag und Satz links Wort für Wort
// untereinander standen und die Zeile über den Rand lief.
function _ndTafelZeileBild(t){
  const pm = pmap();
  const typ = String(t.typ || t.type || '');
  const ref = t.ref || {};
  const chip = (id, aus) => pm[id] ? `<span class="nd-tz-f${aus ? ' aus' : ''}">${_spChip(id)}</span>` : '';
  if(typ === 'insignium_stufe' && ref.pid && pm[ref.pid]){
    const p = Number(ref.punkte) || 0;
    const i = p ? insigniumStufeVon(p) : (ref.stufe | 0);
    let z = '';
    try { z = insigniumStufeSvg(INSIGNIEN[i].key, (getPlayerRank(ref.pid) || {}).label, 0, {bild:true}) || ''; } catch(e){}
    return {label:INSIGNIEN[i].name, verb:_spName(ref.pid) + ' erreicht', rechts:`<span class="nd-tz-w">${chip(ref.pid)}<span class="nd-tz-z">${z}</span></span>`,
      wert:p ? `${p} P` : '', wertText:p ? `${p} P` : ''};
  }
  const neu = (Array.isArray(t.halter) ? t.halter : []).filter(id => pm[id]);
  const vor = (Array.isArray(t.vorher) ? t.vorher : []).filter(id => pm[id]);
  if(!neu.length || !t.rname) return null;
  const weg = vor.filter(id => neu.indexOf(id) < 0);
  // Wer etwas getan hat: beim Gleichziehen die Neuen, sonst alle Halter.
  const dazu = neu.filter(id => vor.indexOf(id) < 0);
  const wer = vor.length && neu.length > vor.length && dazu.length ? dazu : neu;
  const mehr = wer.length > 1;
  const verb = typ === 'rekord_gesteigert' ? (mehr ? 'bauen aus' : 'baut aus')
    : !vor.length ? (mehr ? 'holen' : 'holt') : weg.length ? (mehr ? 'übernehmen' : 'übernimmt')
    : neu.length < vor.length ? (mehr ? 'halten allein' : 'hält allein')
    : neu.length > vor.length ? (mehr ? 'ziehen gleich' : 'zieht gleich') : (mehr ? 'halten' : 'hält');
  const wert = ref.ev ? _chronKurz(ref.ev) : '';
  let alt = typ === 'rekord_gesteigert' && ref.evVorher ? _chronKurz(ref.evVorher) : '';
  // Beim Ausbau steht die Einheit einmal: „+58 %-Punkte +59 %-Punkte" war
  // die Hälfte doppelt und schob den Satz links in drei Zeilen.
  const zahl = /^([+−-]?\d[\d.,]*)(.*)$/;
  const za = alt.match(zahl), zw = wert.match(zahl);
  if(za && zw && za[2] && za[2] === zw[2]) alt = za[1];
  const pf = `<svg class="nd-tz-pf" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5H13"/><path d="M10 2L14 5L10 8"/></svg>`;
  // Jeder Name und jedes Gesicht, vorher und nachher: es standen zwei und
  // drei da, der Rest als „+1" und „und zwei weitere".
  return {label:t.rname, verb:_namenListe(wer.map(_spName)) + ' ' + verb, rechts:`<span class="nd-tz-w">${weg.map(id => chip(id, true)).join('')}`
    + (weg.length ? pf : '') + neu.map(id => chip(id)).join('') + `</span>`,
    wert:wert ? (alt ? `<s>${esc(alt)}</s> ` : '') + esc(wert) : '',
    wertText:wert ? (alt ? alt + ' ' : '') + wert : ''};
}

// ── Ein Wappen und eine Zahl [§C33] ─────────────────────────────────
// Meilenstein, Jubiläum, Form und Ausschlag erzählen von EINEM Spieler und
// EINER Zahl. Ihre Blätter zeigten das Wappen im Kopf und die Zahl darunter
// in einem Kasten oder einer Zeile; die Bühne stellt beides zusammen.
function _ndHeldBuehne(pid, wert, label, neg, extra){
  const pm = pmap();
  return `<div class="nd-buehne nd-hz${neg ? ' neg' : ''}"><div class="nd-hz-k"><span data-pid="${esc(pid)}">${avHtml(pm[pid], '', {ins:true, px:64, feuer:0})}</span>`
    + `<span class="nd-hz-t"><em>${esc(_spName(pid))}</em><b class="num">${esc(String(wert))}</b><small>${esc(label)}</small></span></div>`
    + (extra || '') + `</div>`;
}
// Die Leiter einer Marke: zwei davor, diese, die nächste. Dieselbe Leiter,
// nach der der Generator die Marke vergibt (`_ladderCrossing`).
// `fuenfzig`: Partien und Siege zählen auch jede fünfzigste (`_rundeMarke`).
function _ndMarkenLeiter(wert, min, schritt, fuenfzig){
  const marken = [];
  if(schritt){ for(let v = min; v <= wert + schritt; v += schritt) marken.push(v); }
  else if(fuenfzig){ for(let v = min; v <= wert * 2 + 50; v++) if(_rundeMarke(v, min)) marken.push(v); }
  else { let p = 1; while(p <= wert * 10){ [1, 2.5, 5].forEach(r => { const v = r * p; if(Number.isInteger(v) && v >= min && v <= wert * 10) marken.push(v); }); p *= 10; } }
  marken.sort((a, b) => a - b);
  const i = marken.indexOf(wert);
  if(i < 0) return '';
  const zeig = marken.slice(Math.max(0, i - 2), i + 2);
  return `<div class="nd-ml">${zeig.map(v => `<span class="${v < wert ? 'da' : v === wert ? 'jetzt' : 'naechst'}"><b class="num">${_spZahl(v)}</b></span>`).join('<i></i>')}</div>`;
}
// Siege und Niederlagen bis zu einer Partie als ein Balken.
function _ndBilanzBalken(st){
  if(!st || !(st.wins + st.losses)) return '';
  const n = st.wins + st.losses, w = st.wins / n * 100;
  return `<div class="nd-bb"><span class="nd-bb-b"><i style="width:${w.toFixed(1)}%"></i><u style="width:${(100 - w).toFixed(1)}%"></u></span>`
    + `<span class="nd-bb-z"><span><b class="num">${_spZahl(st.wins)}</b> Siege</span><span><b class="num">${st.winRate} %</b></span><span><b class="num">${_spZahl(st.losses)}</b> Niederlagen</span></span></div>`;
}
// Die Elo einer Laufbahn bis zu einer Partie als Linie, die Marke gestrichelt.
function _ndEloLinie(pid, bisId, marke){
  let pkt = [];
  try {
    for(const h of (getGlobalSim().history || [])){
      const v = h.eloAfter && h.eloAfter[pid];
      if(v != null) pkt.push(v);
      if(h.matchId === bisId) break;
    }
  } catch(e){ pkt = []; }
  if(pkt.length < 3) return '';
  const lo = Math.min(...pkt, marke), hi = Math.max(...pkt, marke), W = 300, H = 90;
  const X = i => 4 + i / (pkt.length - 1) * (W - 8), Y = v => 6 + (hi - v) / Math.max(1, hi - lo) * (H - 12);
  return `<div class="nd-li nd-el"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="nd-li-0" x1="0" x2="${W}" y1="${Y(marke).toFixed(1)}" y2="${Y(marke).toFixed(1)}"/>`
    + `<polyline points="${pkt.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`
    + `<circle cx="${X(pkt.length - 1).toFixed(1)}" cy="${Y(pkt[pkt.length - 1]).toFixed(1)}" r="3.5"/></svg>`
    + `<span class="nd-li-o num">${_spZahl(marke)}</span></div>`;
}
function _ndMeilensteinBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid]) return null;
  const art = {jubilee:['Partien', 10, 0, true], milestone_wins:['Siege', 50, 0, true], milestone_goals:['Games', 500, 0],
    milestone_elo:['Elo', (cfg.start_elo ?? 1000) + 200, 100]}[d.type];
  const wert = d.type === 'jubilee' ? Number(d.total) : d.type === 'milestone_elo' ? Number(d.mark) || parseInt(d.milestone, 10) : parseInt(d.milestone, 10);
  if(!art || !Number.isFinite(wert)) return null;
  const kopf = _ndHeldBuehne(pid, _spZahl(wert), art[0], false, _ndMarkenLeiter(wert, art[1], art[2], art[3]));
  const st = _ndBilanzBis(pid, s);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  return {kopf, mitte:(d.type === 'milestone_elo' ? ab('Die Elo bis hierher', _ndEloLinie(pid, d.matchId, wert)) : '')
    + ab('Die Bilanz bis hierher', _ndBilanzBalken(st))
    + (m ? ab('Die Partie', _newsMatchVsBlock(d.matchId)) : '')};
}
// Die Form gegen den eigenen Schnitt: zwei Balken, und darunter die zehn
// Partien, aus denen die erste Zahl besteht.
function _ndFormBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid] || d.qJetzt == null || d.qBasis == null) return null;
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  const lauf = m ? _ndLauf(pid, null, m, FORM_FENSTER) : [];
  const zeile = (l, q, kl) => `<div class="nd-fv-z ${kl}"><span>${esc(l)}</span><span class="nd-fv-b"><i style="width:${Math.max(0, Math.min(100, q))}%"></i></span><b class="num">${q} %</b></div>`;
  const extra = `<div class="nd-fv">${zeile('letzte ' + FORM_FENSTER, d.qJetzt, 'jetzt')}${zeile('davor', d.qBasis, '')}</div>`
    + (lauf.length ? `<span class="nd-lf nd-hz-lf">${lauf.map((y, j) => `<i class="${_spGew(y, pid) ? 'w' : 'l'}${j === lauf.length - 1 ? ' dies' : ''}"></i>`).join('')}</span>` : '');
  const kopf = _ndHeldBuehne(pid, '+' + (d.vorsprung != null ? d.vorsprung : d.qJetzt - d.qBasis), 'Prozentpunkte über dem eigenen Schnitt', false, extra);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Die zehn Partien', lauf.length ? _ndPartieListe(lauf, pid) : '')};
}
// Der härteste Tag: die Elo des Tages als Kurve unter der Zahl, darunter
// der Tag in Partien.
function _ndAusschlagBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid] || d.delta == null) return null;
  let kurve = '';
  try { kurve = _spTagBild(_spTagDaten({when:s.when, dataRef:{playerId:pid}})); } catch(e){}
  const kopf = _ndHeldBuehne(pid, (d.delta > 0 ? '+' : '−') + Math.abs(d.delta), 'Elo an diesem Tag', d.delta < 0, kurve);
  const liste = _newsTagPartien(tagKey(s.when), [pid]);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Der Tag in Partien', _ndTagesbahn(pid, liste))};
}
// ── Das Spitzenspiel [§C33] ─────────────────────────────────────────
// Platz 1 gegen Platz 2 stand als zwei Zeilen „Platz 1 · Martin ›". Die
// Bühne zeigt beide mit ihrem Platz und das Ergebnis dazwischen, den Sieger
// hell; darunter dieselben Abschnitte wie das Blatt jeder Partie.
function _ndSpitzenspielBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  if(!m || !pm[d.p1] || !pm[d.p2]) return null;
  const sieger = _spSieger(m);
  const seite = (pid, platz) => `<span class="nd-ts-p${sieger.includes(pid) ? ' w' : ''}" data-pid="${esc(pid)}"><i class="num">${platz}.</i>`
    + `${avHtml(pm[pid], '', {ins:true, px:64, feuer:0})}<b>${esc(_spName(pid))}</b></span>`;
  const kopf = `<div class="nd-buehne nd-ts">${seite(d.p1, 1)}<span class="nd-ts-m"><b class="num">${_spStand({sa:m.games_a, sb:m.games_b, aw:m.winner === 'A'})}</b>`
    + `<small>${esc(_newsUhrzeit(mts(m)))}</small></span>${seite(d.p2, 2)}</div>`;
  return {kopf, mitte:_ndPartieAbschnitte(s)};
}
// ── Die runden Marken eines Tages ───────────────────────────────────
// Je Marke eine Kachel aus Zeichen, Zahl und Gesicht. Darunter, wofür es
// sie gibt — bei einer einzigen Marke steht das schon im Satz der Karte.
function _ndMarkenBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const l = (Array.isArray(d.marken) ? d.marken : []).filter(x => pm[x.pid]);
  if(!l.length) return null;
  const def = id => (typeof BADGES !== 'undefined') ? BADGES.find(b => b.id === id) : null;
  const kopf = `<div class="nd-buehne nd-bm">${l.map((x, k) => {
    const b = def(x.badgeId) || {};
    const kl = rarityOf(x.badgeId);
    return `<span class="nd-bm-k nf-bd-${esc(kl)}" data-pid="${esc(x.pid)}" style="--k:${k}"><span class="nd-bm-ic">${svgI(b.ic || 'medal')}</span>`
      + `<b class="num">${x.rang}.</b><em>${esc(x.name || b.name || '')}</em>`
      + `<span class="nd-bm-w">${_spChip(x.pid)}<small>${esc(_spName(x.pid))}</small></span></span>`;
  }).join('')}</div>`;
  const ids = [...new Set(l.map(x => x.badgeId))];
  const bed = l.length > 1 ? ids.map(id => { const b = def(id) || {};
    return rcpZeileHtml({ic:b.ic || 'medal', name:b.name || id, sub:b.desc || ''}); }).join('') : '';
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Wofür es sie gibt', bed)
    + (d.matchId ? ab('Die Partie', _newsMatchVsBlock(d.matchId)) : '')};
}

// ── Der Fun Fact [§C33] ─────────────────────────────────────────────
// Der Fun Fact zeigte das Wappen im Kopf und die Zahl darunter in einem
// Kasten. Er handelt meistens von einem Spieler und einer Zahl, also steht
// beides auf derselben Bühne wie Meilenstein und Form. Darunter, was die
// Zahl einordnet: wer bei einem Rekord dahinter liegt, das Zeichen, wenn es
// um Prestige geht, sonst die letzten zehn Partien bis zum Tag der Karte.
function _ndFaktBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.ambientPid;
  // Ein Fun Fact mit Bild trägt es groß als Bühne [30c-news-fakt] — dasselbe
  // Bild wie die Karte, sonst verlöre das Blatt, wegen dem man getippt hat.
  // Darunter steht, was das Bild nicht zeigt.
  const bild = d.leiter ? '' : _faktBild(s, true);
  if(bild){
    const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
    const b = d.bild || {};
    let mitte = '';
    if(d.type === 'dry_spell') mitte = ab('Die letzte Partie', d.lastMatchId ? _newsBlattErgebnis(d.lastMatchId) : '');
    else if(b.f === 'duell' && pm[b.a] && pm[b.b]) mitte = ab('Jede Begegnung', h2hBegegnungenHtml(b.a, b.b));
    else if(d.prestige && pid && pm[pid]) mitte = ab('Der Stand am Zeichen', _newsInsigniumBlock(pid));
    else if(pid && pm[pid]) mitte = ab('Die letzten zehn Partien', _ndFaktLauf(pid, s));
    return {kopf:`<div class="nd-buehne nd-ff">${bild}</div>`, mitte};
  }
  if(d.leiter || !pid || !pm[pid] || d.vv == null || d.vv === '') return null;
  const kopf = _ndHeldBuehne(pid, d.vv, d.vl || '', false, '');
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  if(d.prestige) return {kopf, mitte:ab('Der Stand am Zeichen', _newsInsigniumBlock(pid))};
  if(d.chronicle) return {kopf, mitte:_newsVerfolger(d.chronicle, [pid], null)
    || ab('Die letzten zehn Partien', _ndFaktLauf(pid, s))};
  return {kopf, mitte:ab('Die letzten zehn Partien', _ndFaktLauf(pid, s))};
}
// Die zehn Partien vor der Karte als Lauf und als Bilanz.
function _ndFaktLauf(pid, s){
  const t = new Date(s.when).getTime();
  const l = matchesOfPlayer(pid, matches).filter(m => mts(m) <= t).slice(-10);
  if(!l.length) return '';
  const w = l.filter(m => _spGew(m, pid)).length;
  return `<span class="nd-lf nd-hz-lf">${l.map(m => `<i class="${_spGew(m, pid) ? 'w' : 'l'}"></i>`).join('')}</span>`
    + _ndBilanzBalken({wins:w, losses:l.length - w, winRate:Math.round(w / l.length * 100)});
}

// Welche Story ein eigenes Blatt mit Bühne hat. Kopf und Mitte kommen aus
// demselben Aufruf, gemerkt je Story, damit nichts doppelt gerechnet wird.
const _ND_BLATT = {win_streak:_ndSerieBlatt, loss_streak:_ndSerieBlatt, team_streak:_ndSerieBlatt,
  team_loss_streak:_ndSerieBlatt, streak_killer:_ndSerieBlatt, rivalry:_ndRivalBlatt,
  rivalry_milestone:_ndRivalBlatt, badge_unlocked:_ndBadgeBlatt,
  rekord_erstmals:_ndRekordBlatt, rekord_gesteigert:_ndRekordBlatt, rekord_geholt:_ndRekordBlatt,
  potd:_ndPotdBlatt, season_endgame:_ndEndspurtBlatt, chronik_geholt:_ndChronikBlatt,
  chronik_frei:_ndMonatBlatt,
  insignium_stufe:_ndInsigniumBlatt, insignium_tag:_ndInsTagBlatt, sammel:_ndTafelMomentBlatt,
  jubilee:_ndMeilensteinBlatt, milestone_wins:_ndMeilensteinBlatt, milestone_goals:_ndMeilensteinBlatt,
  milestone_elo:_ndMeilensteinBlatt, top_form:_ndFormBlatt, elo_swing:_ndAusschlagBlatt,
  top_clash:_ndSpitzenspielBlatt, badge_marken:_ndMarkenBlatt, dry_spell:_ndFaktBlatt, ambient:_ndFaktBlatt,
  karriereende:_ndAbschiedBlatt, ehrung:_ndEhrungBlatt};
// Das Blatt eines Karriereendes zeigt die Bühne und den Anfang des
// Abschieds; der ganze steht einen Knopf weiter [§C40].
function _ndAbschiedBlatt(s){
  const d = s.dataRef || {};
  if(!pmap()[d.pid]) return null;
  return {kopf:abschiedBuehneHtml(d.pid), mitte:abschiedMitteHtml(d.pid, true)};
}
// Gemerkt nur für einen Aufbau (`_newsDetailBody` leert es): an der Story
// hängend hielte es nach einer neuen Partie den alten Stand fest.
let _ndBlattJetzt = null;
function _ndEigenesBlatt(s){
  const f = _ND_BLATT[(s.dataRef || {}).type];
  if(!f) return null;
  if(_ndBlattJetzt && _ndBlattJetzt.s === s) return _ndBlattJetzt.x;
  let x = null;
  try { x = f(s); } catch(e){ x = null; }
  _ndBlattJetzt = {s, x};
  return x;
}

// ── Was unter der Bühne einer Partie steht [§C33] ──────────────────
// Zeichnungen in fester Folge, jede nur, wo die Bühne sie nicht schon zeigt:
// die Aufstellung, die Siegchance auf ihrer Skala, die Elo-Wirkung je
// Spieler, die direkten Duelle, der Tag und wie oft die Liga so ausgeht. Ein
// Abschnitt „Was dieses Spiel besonders macht" stand dort als Wort und Satz
// („Außenseiter-Sieg · Die Rechnung stand dagegen") über einer Skala, die
// genau das zeigt. Dieselbe Folge trägt das Blatt einer Partie und das
// ihres Bündels.
function _ndPartieAbschnitte(s){
  const d = s.dataRef || {};
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  if(!m) return '';
  let bild = '';
  try { bild = _spBild(s).kopf || ''; } catch(e){ bild = ''; }
  const zeigt = kl => bild.indexOf('class="' + kl) >= 0 || bild.indexOf('class="sp-fk ' + kl) >= 0;
  const beteiligt = _spSieger(m).concat(_spVerlierer(m));
  // Steht das Spielfeld schon auf der Bühne, trägt es Siegchance und Elo
  // je Spieler; die Abschnitte darunter nennen dann nur noch, was es nicht
  // zeigt — wer in der Tabelle den Platz gewechselt hat. Steht es als
  // Abschnitt, zeigt es nur die Aufstellung.
  const buehneFeld = zeigt('sp-feld');
  const c = d.chance != null ? d.chance : (d.quote != null ? d.quote / 100 : _spChance(m));
  const skala = buehneFeld || zeigt('sp-ta') || zeigt('sp-sd') || zeigt('sp-wp') ? '' : _ndChanceSkala(c);
  const mitRang = buehneFeld ? beteiligt.filter(pid => { const r = _newsRankChange(pid, m.id); return r && r.pre !== r.post; }) : beteiligt;
  const elo = !zeigt('sp-et') && mitRang.length ? _ndEloWirkung(m.id, mitRang) : '';
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  let feld = '', duelle = '', tag = '', vert = '';
  try { feld = buehneFeld ? '' : `<div class="nd-feld">${_spFeldBild(Object.assign(_spFeldDaten({m, c:null}), {ohneElo:true}))}</div>`; } catch(e){}
  try { duelle = _ndDuelle(m); } catch(e){}
  try { tag = _ndTagLeiste(m); } catch(e){}
  try { vert = zeigt('sp-mo') || zeigt('sp-vt') ? '' : _ndVerteilung(m); } catch(e){}
  return ab('Wer wo stand', feld) + ab('Wie erwartbar war das', skala)
    + ab(buehneFeld ? 'In der Tabelle' : 'Was die Partie bewegt hat', elo)
    + ab('Die direkten Duelle', duelle) + ab('Der Tag', tag) + ab('Wie oft es so ausgeht', vert);
}

