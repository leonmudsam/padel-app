// ─── §11.7a — Die Mitte eines Story-Blatts, je Typ ──────────────────────
// Kopf und Fuß baut 31-news-detail.js; hier steht, was dazwischen liegt.
// Eine Überschrift ohne etwas darunter fällt weg. „Die Partie zum
// Meilenstein" stand über nichts, weil die Partie schon im Kopf stand und
// `_newsMatchVsBlock` sie nicht ein zweites Mal zeigt; dasselbe galt für
// jeden Abschnitt, dessen Inhalt leer ausfällt. Eine Regel an einer Stelle
// statt einer Bedingung an jeder Überschrift.
function _ndOhneLeere(html){
  return String(html || '').replace(/<div class="nd-section">[^<]*<\/div>\s*(?=<div class="nd-section">|$)/g, '');
}
function _newsDetailMitte(s){ return _ndOhneLeere(_ndMitteRoh(s)); }
function _ndMitteRoh(s){
  const d = s.dataRef || {};
  // Ein Blatt kann nur seine Bühne mitbringen und die Mitte dem Schalter
  // lassen (`mitte:null`): der Tafel-Moment teilt seine Liste mit den
  // übrigen Sammelkarten.
  { const x = _ndEigenesBlatt(s); if(x && x.mitte != null) return x.mitte; }
  const pm = pmap();
  const avM = (pid) => pm[pid] ? avHtml(pm[pid]) : '';
  const nameOf = (pid) => (pm[pid] && pm[pid].name) || '?';
  // §13.4b: Chronik-Karten haben keinen eigenen `type` — sie hängen an jeder
  // Story, die eine Chronik nennt, und öffnen deren Liga-Ansicht.
  if(d.chronicle && CHRONICLE_BY_ID[d.chronicle]){
    const def = CHRONICLE_BY_ID[d.chronicle];
    const row = d.ambientPid ? `<div class="nd-stat-row" data-pid="${esc(d.ambientPid)}" style="cursor:pointer">
      <div class="nd-stat-label">Rekordhalter</div><div class="nd-stat-val gold">${esc(nameOf(d.ambientPid))} ›</div></div>` : '';
    return `<div class="nd-section">Liga-Rekord · ${esc(CHRON_KINDS[def.kind].label)}</div>${row}
      <div class="nd-stat-row"><div class="nd-stat-label">Bedingung</div>
        <div class="nd-stat-val">${esc(def.cond)}</div></div>
      <button class="btn ghost sm" data-chron="${esc(def.id)}" style="margin-top:12px;width:100%">Rekord öffnen</button>`;
  }
  // ── Was der Rekord der Laufbahn bringt [§C34] ───────────────────
  // Auf einer Rekord-Karte stand nichts darüber, und wer den Grundwert
  // hineinschriebe, behauptete „+100 Prestige", während die Laufbahn um 34
  // Punkte steigt. Gezeigt werden deshalb die beiden Stände aus
  // `prestigeTabelle` vor und nach dem Tagesabschluss, die Rechnung der
  // Quelle im gemeinsamen Satz (`_prestigeQuellSatz` [§C27]) und der Anteil,
  // den alle heute gehaltenen Rekorde zusammen tragen. Eine Karte aus einem
  // älteren Lauf hat die beiden Stände nicht — sie zeigt dann die Rechnung
  // von heute und behauptet keinen Zuwachs.
  const rekordLaufbahn = (rid) => {
    const ids = (Array.isArray(d.playerIds) ? d.playerIds : []).filter(pid => pm[pid]);
    if(!ids.length) return '';
    const lb = d.laufbahn || {};
    const zeilen = ids.map(pid => {
      const w = lb[pid] || null;
      let q = null;
      if(!w){
        try {
          q = ((prestigeTabelle().byPid[pid] || {}).quellen || [])
            .find(x => x.q === 'rekord' && x.id === rid) || null;
        } catch(e){}
        if(!q) return '';
      }
      const satz = _prestigeQuellSatz(w
        ? {q:'rekord', art:d.art || 'ereignis', kind:d.kammer || '',
           basis:w.basis, halter:w.halter, rang:w.rang, staffel:w.staffel}
        : q);
      const rechts = w
        ? `${w.vor} → ${w.nach} Prestige`
        : `${komma(q.p).replace(',0', '')} Prestige`;
      const anteil = w && w.zahl
        ? `${satz} · ${w.zahl} ${w.zahl === 1 ? 'Rekord' : 'Rekorde'}: `
          + `${w.anteilVor} → ${w.anteilNach}`
        : satz;
      return `<div class="nd-stat-row" data-pid="${esc(pid)}" style="cursor:pointer">
        <div class="nd-stat-label">${esc(nameOf(pid))}<small>${esc(anteil)}</small></div>
        <div class="nd-stat-val acid">${esc(rechts)} ›</div></div>`;
    }).filter(Boolean).join('');
    return zeilen ? `<div class="nd-section">Für die Laufbahn</div>${zeilen}` : '';
  };

  try {
    switch(d.type){
      // Die Runde der Vier [§11.6c]: Tabelle, Aufstellung je Partie und jede
      // Partie mit ihrer Uhrzeit.
      case 'runde': return _newsRundeBlatt(s);
      // ── Die Ewige Tafel ─────────────────────────────────────────
      // Der ganze Awards-Reiter hatte im Blatt gar keinen Fall: wer eine
      // Rekord-Karte oeffnete, sah den Kopf und den Satz, den er auf der
      // Karte schon gelesen hatte. Jetzt steht dort der Wert gross, die
      // Bedingung, wem er vorher gehoerte und wer dahinter liegt.
      //
      // Alle drei Rekord-Meldungen teilen dieses Blatt. Nur `rekord_geholt`
      // hatte einen Fall, und der Schalter kennt keinen Rueckfall: ein
      // erstmals vergebener und ein ausgebauter Rekord oeffneten damit ein
      // Blatt mit NULL Zeichen Mitte, gemessen am gebauten Stand. Sie tragen
      // dieselben Felder — Wert, Bedingung, Vorgaenger, Verfolger — und der
      // Satz darueber sagt ohnehin schon, welcher der drei Faelle es ist
      // [§C33].
      case 'rekord_erstmals':
      case 'rekord_gesteigert':
      case 'rekord_geholt': {
        const def = (typeof CHRONICLE_BY_ID !== 'undefined') ? CHRONICLE_BY_ID[d.rekordId] : null;
        const wert = _chronKurz(d.ev);
        // Dieselben Halter in anderer Reihenfolge sind kein Wechsel: „Maxi,
        // Leo und Julian übernehmen" und darunter „Vorher gehalten von Maxi
        // und Julian und Leo" nannte dreimal dieselben drei Namen.
        const jetzt = (Array.isArray(d.playerIds) ? d.playerIds : []).slice().sort().join(',');
        const vorRoh = (Array.isArray(d.vorher) ? d.vorher : []).filter(pid => pm[pid]);
        const vor = vorRoh.slice().sort().join(',') === jetzt ? [] : vorRoh;
        // Der Beleg steht schon im Satz ueber dem Blatt — er stand hier ein
        // zweites Mal, Wort fuer Wort.
        return `<div class="nd-gwert ${d.zufall ? 'metall' : 'gold'}">
            <b>${esc(wert)}</b><span>${esc(d.kammerLabel || 'Bestmarke')}</span></div>
          ${_ndNeu(d.cond) ? `<div class="nd-stat-row"><div class="nd-stat-label">Bedingung</div>
            <div class="nd-stat-val" style="font-size:11px;text-align:right;max-width:62%">${esc(d.cond)}</div></div>` : ''}
          ${vor.length ? `<div class="nd-stat-row" data-pid="${esc(vor[0])}" style="cursor:pointer">
            <div class="nd-stat-label">Vorher gehalten von</div>
            <div class="nd-stat-val">${esc(_namenListe(vor.map(nameOf)))} ›</div></div>` : ''}
          ${_newsVerfolger(d.rekordId, d.playerIds, d.wert)}
          ${/* Woraus der Wert der KARTE besteht — ihr gespeicherter Beleg,
                nicht der von heute [§C33 „Und niemand davor"]. */ belegHtml({ev:d.ev, kurz:true})}
          ${rekordLaufbahn(d.rekordId)}
          ${def ? `<button class="btn ghost sm" data-chron="${esc(def.id)}" style="margin-top:12px;width:100%">Rekord öffnen</button>` : ''}`;
      }
      // Die Monatschronik ist EINE Karte je Monat [§C33]. Im Blatt stehen
      // deshalb die Traeger, nicht ein einzelner Eintrag.
      // Eine Monatschronik hat den Halter gewechselt. Das Blatt zeigt, was
      // die Chronik wert ist (dieselbe Zahlenreihe wie im Awards-Tab [§C27]),
      // die Bedingung, das Podest des Monats und den Weg in die Tafel.
      case 'chronik_geholt': {
        const def = (typeof SEASON_TITLE_BY_ID !== 'undefined')
          ? SEASON_TITLE_BY_ID[d.titleId] : null;
        let podest = '', erfuellt = 0, halterWert = Number.isFinite(d.wert) ? d.wert : undefined;
        try {
          const C = _seasonTitleCtx(d.sid);
          const r = def && def.pick ? def.pick(C, new Set()) : null;
          // Eine Karte von vor dem Bonus trägt keinen Wert; dann rechnet die
          // Zahlenreihe mit dem Halter des Podests darunter [§C39].
          if(halterWert === undefined && r && r.halter && r.halter.length && r.wert) halterWert = r.wert(r.halter[0]);
          if(r && r.rang && r.rang.length){
            erfuellt = r.rang.length;
            podest = _chronPodestHtml(r.rang.map(pid => {
              let w = ''; try { w = r.evFuer ? r.evFuer(pid) : ''; } catch(e){}
              return {pid, wert:_chronKurz(w), v:r.wert ? r.wert(pid) : null};
            }));
          }
        } catch(e){}
        // Die Bedingung nur, wenn sie nicht schon oben steht [§C33 `_ndNeu`].
        const cond = (def && def.cond && _ndNeu(def.cond)) ? def.cond : '';
        const beitragIds = (Array.isArray(d.playerIds) ? d.playerIds : []).filter(pid => pm[pid]);
        const laufbahn = _newsChronikPrestige(d);
        const beitrag = beitragIds.length
          ? `<div class="nd-section">Tafel, Profil und Laufbahn</div>`
            + _ndChronikEbenen(d, undefined, beitragIds, pid => laufbahn.werte[pid],
                            laufbahn.modus, d.titleId)
          : '';
        return (def ? _chronFaktenHtml(def, halterWert) : '')
          + (cond ? `<div class="tnote">${esc(cond)}</div>` : '')
          + (podest ? `<div class="nd-section">Dieser Monat</div>${podest}` : '')
          + (erfuellt > 1 ? `<div class="tnote">${erfuellt} erfüllen die Bedingung in diesem Monat.</div>` : '')
          + beitrag
          + `<button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`;
      }
      // Der Tag, an dem die Monatstafel aufgeht. Sie zeigt die vorläufigen
      // Profileinträge und die echte Punktewirkung — dieselbe Zeile wie beim
      // Chronik-Wechsel [§C27]. Ein `titleId` gibt es hier nicht: die Karte
      // handelt von der ganzen Tafel, nicht von einem Eintrag.
      case 'chronik_frei': {
        // `traeger` und nicht `playerIds`: auf der Karte steht kein Name,
        // damit der Deckel je Spieler die Karte nicht mitzaehlt [§C33].
        const ids = (Array.isArray(d.traeger) ? d.traeger : []).filter(pid => pm[pid]);
        // Der Monatsanteil aus der zentralen Tabelle, nicht aus dem Katalog:
        // je Spieler und Monat zählt genau eine Chronik [§C32].
        const monatWert = pid => {
          try {
            const q = ((prestigeTabelle().byPid[pid] || {}).quellen || [])
              .find(x => x.q === 'monat' && (!x.sid || x.sid === d.sid));
            return q ? Math.round((q.p || 0) * 10) / 10 : 0;
          } catch(e){ return 0; }
        };
        return `<div class="nd-gwert metall"><b>${esc(String(d.eintraege != null ? d.eintraege : ''))}</b>
            <span>Einträge in der Chronik</span></div>
          ${ids.length ? `<div class="nd-section">Tafel, Profil und Laufbahn</div>`
            + _ndChronikEbenen(d, undefined, ids, monatWert, 'bestand', '') : ''}
          <button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`;
      }
      case 'top_clash': {
        // v9.3: Ränge explizit — Platz 1 (Sieger) & Platz 2 (Verfolger),
        // beide antippbar; darunter das Spitzenspiel als Match-VS-Block.
        const rankRows = (d.p1 && d.p2) ? `
          <div class="nd-stat-row" data-pid="${esc(d.p1)}" style="cursor:pointer"><div class="nd-stat-label">Platz 1</div><div class="nd-stat-val acid">${esc(nameOf(d.p1))} ›</div></div>
          <div class="nd-stat-row" data-pid="${esc(d.p2)}" style="cursor:pointer"><div class="nd-stat-label">Platz 2</div><div class="nd-stat-val">${esc(nameOf(d.p2))} ›</div></div>` : '';
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        return (rankRows ? `<div class="nd-section">Duell an der Spitze</div>${rankRows}` : '')
             + (matchHtml ? `<div class="nd-section">Das Spitzenspiel</div>${matchHtml}` : '');
      }
      case 'elo_record': {
        // v9.4: Rekordhalter (antippbar) + Rekordwert + auslösendes Match.
        const row = d.pid ? `<div class="nd-stat-row" data-pid="${esc(d.pid)}" style="cursor:pointer"><div class="nd-stat-label">Rekordhalter</div><div class="nd-stat-val acid">${esc(nameOf(d.pid))} ›</div></div>` : '';
        const eloRow = d.elo!=null ? `<div class="nd-stat-row"><div class="nd-stat-label">Höchststand</div><div class="nd-stat-val acid">${d.elo} Elo</div></div>` : '';
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        return `<div class="nd-section">Liga-Rekord</div>${row}${eloRow}` + (matchHtml ? `<div class="nd-section">Rekordpartie</div>${matchHtml}` : '');
      }
      case 'streak_record': {
        const row = d.pid ? `<div class="nd-stat-row" data-pid="${esc(d.pid)}" style="cursor:pointer"><div class="nd-stat-label">Rekordhalter</div><div class="nd-stat-val acid">${esc(nameOf(d.pid))} ›</div></div>` : '';
        const sRow = d.streak!=null ? `<div class="nd-stat-row"><div class="nd-stat-label">Siege in Folge</div><div class="nd-stat-val acid">${d.streak}</div></div>` : '';
        return `<div class="nd-section">Liga-Rekord</div>${row}${sRow}`;
      }
      case 'giant_slayer': {
        const pct = d.chance!=null ? `<div class="nd-stat-row"><div class="nd-stat-label">Siegchance</div><div class="nd-stat-val red">${Math.max(1,Math.round(d.chance*100))}\u00A0%</div></div>` : '';
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        return `<div class="nd-section">Die Sensation</div>${pct}` + (matchHtml ? matchHtml : '');
      }
      // ── Das Blatt einer Partie ───────────────────────────────────
      // Unter der Bühne stehen Zeichnungen in fester Folge, jede nur, wo die
      // Bühne sie nicht schon zeigt: die Aufstellung, die Siegchance auf
      // ihrer Skala, die Elo-Wirkung je Spieler, die direkten Duelle, der
      // Tag und wie oft die Liga so ausgeht. Ein Abschnitt „Was dieses Spiel
      // besonders macht" stand dort als Wort und Satz („Außenseiter-Sieg ·
      // Die Rechnung stand dagegen") über einer Skala, die genau das zeigt.
      case 'spiel': return _ndPartieAbschnitte(s);
      // Zeilen aus aelteren Laeufen: der Generator bildet den Typ nicht mehr.
      case 'match_result': {
        const fakten = {
          zu_null: ['Doppel-Bagel', 'Kein Game für die Gegenseite'],
          upset:   ['Vor der Partie', d.chance != null ? `${Math.max(1, Math.round(d.chance * 100))} % Siegchance` : 'Außenseiter'],
          krimi:   ['Entscheidung', 'im Tiebreak'],
          kanter:  ['Entscheidung', `${d.margin || 0} Games Unterschied`],
          eng:     ['Entscheidung', 'über drei Sätze']
        }[d.resultKind] || ['Ergebnis', 'Besondere Partie'];
        return `<div class="nd-section">Was diese Partie besonders macht</div>
          <div class="nd-stat-row"><div class="nd-stat-label">${esc(fakten[0])}</div>
            <div class="nd-stat-val acid">${esc(fakten[1])}</div></div>`;
      }
      case 'group': {
        // v8.8: zusammengefasste Karte ("N Pechvögel: …") — alle Beteiligten
        // tappbar, mit ihrem jeweiligen Wert (frag).
        const pids = Array.isArray(d.playerIds) ? d.playerIds : [];
        const frags = Array.isArray(d.frags) ? d.frags : [];
        const rows = pids.map((pid, i) => {
          const m = (frags[i] || '').match(/\(([^)]*)\)/);
          const val = m ? m[1] : '›';
          return `<div class="nd-stat-row" data-pid="${esc(pid)}" style="cursor:pointer">
            <div class="nd-stat-label">${esc(nameOf(pid))}</div><div class="nd-stat-val">${esc(val)}</div></div>`;
        }).join('');
        return `<div class="nd-section">Beteiligte</div>${rows}`;
      }
      case 'potd': {
        // Der Held gross, darunter sein Rang und sein Zeichen, dann ein Satz
        // mit der Bedingung und erst danach die Zahlen. Vorher stand hier eine
        // Zeile mit dem Namen und ein Pfeil: „4 Siege · 57%" ohne die Angabe,
        // ab wie vielen Partien gewertet wird, liest sich wie eine
        // Karriere-Siegquote.
        const pids = (Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId];
        const wr = d.wr != null ? Math.round(d.wr * 100) : null;
        const nl = (d.wins != null && d.games != null) ? (d.games - d.wins) : null;
        // Hier stand, ab wie vielen Partien gewertet wird und wann die Karte
        // erscheint. Das ist die Bauanleitung des Feeds, nicht die Nachricht:
        // wer das Blatt oeffnet, will wissen, was passiert ist, und der Kopf
        // darueber hat es schon gesagt. Die Zahlen darunter erklaeren sich
        // selbst.
        const satz = '';
        const gitter = `<div class="nd-gitter">
            ${wr != null ? `<div><b class="g">${wr} %</b><span>Siegquote</span></div>` : ''}
            ${d.wins != null ? `<div><b>${d.wins}${nl != null ? ' : ' + nl : ''}</b><span>Siege${nl != null ? ' zu Niederlagen' : ''}</span></div>` : ''}
          </div>`;
        const weitere = pids.length > 1
          ? `<div class="nd-section">Punktgleich</div>` + pids.slice(1).map(pid =>
              `<div class="nd-stat-row" data-pid="${esc(pid)}" style="cursor:pointer">
                <div class="nd-stat-label">${esc(nameOf(pid))}</div><div class="nd-stat-val">›</div></div>`).join('')
          : '';
        // Die Partien des Tages. „Kein anderer holte mehr Siege" ist eine
        // Behauptung, und das Blatt zeigte sie nicht. Die Liste darf nicht
        // nach vier Zeilen abbrechen: an vollen Spieltagen gingen dadurch
        // genau die Partien verloren, auf denen die Tageswertung beruht.
        const tag = _newsTagPartien(d.dayKey, pids);
        const bahn = _ndTagesbahn(pids, tag);
        const spiele = bahn
          ? `<div class="nd-section">${pids.length > 1 ? 'Der Tag der Tagessieger' : 'Der Tag in Partien'}</div>` + bahn
          : (tag.length
              ? `<div class="nd-section">Die Partien an diesem Tag</div>`
                + tag.map(m => _newsMatchVsBlock(m.id)).join('')
              : '');
        return satz + gitter + weitere + spiele;
      }
      // ── Die Woche: sechs Wertungen in einem Blatt ────────────────────
      // Der Wochenrueckblick stand vorher als sechs Karten ueber den Montag
      // verteilt. Jetzt ist er eine Karte, und das Blatt traegt jede Wertung
      // als eigene Zeile mit Gesicht und Zahl — nichts geht verloren, aber der
      // Feed traegt statt sechs Karten eine.
      case 'woche': {
        const teile = Array.isArray(d.teile) ? d.teile : [];
        // „3 Partien an 2 Tagen" steht schon im Text der Karte, drei Zeilen
        // darueber. Die Zeile bleibt nur, wenn er sie nicht nennt.
        const kopfWert = `${d.spiele || 0} an ${d.tage || 0} ${d.tage === 1 ? 'Tag' : 'Tagen'}`;
        // Der Text sagt „20 Spiele an 4 Tagen", die Zeile „20 an 4 Tagen" —
        // verglichen wurde nur die zweite Form, und beide standen da.
        const nennt = [kopfWert, `${d.spiele || 0} Spiele an ${d.tage || 0}`,
          `${d.spiele || 0} Partien an ${d.tage || 0}`]
          .some(v => _ndOben.indexOf(_ndNormal(v)) >= 0);
        const kopf = nennt ? '' : `<div class="nd-stat-row">
            <div class="nd-stat-label">Partien in dieser Woche</div>
            <div class="nd-stat-val acid">${esc(kopfWert)}</div></div>`;
        // Jede Wertung als Zeile: Gesicht, Name, Wertung und Zahl — bei einem
        // geteilten Platz jeder, nicht die ersten zwei. Darunter
        // stand je ein Satz („Julian hat in dieser Woche 101 Elo gutgemacht.
        // Das ist der größte Anstieg der Liga."), der Zahl und Wertung daneben
        // ein zweites Mal sagte, und die Namen standen als Pillen ohne Gesicht.
        const zeilen = teile.map(t => {
          const ids = (Array.isArray(t.pids) ? t.pids : []).filter(pid => pm[pid]);
          return `<div class="nd-wo-z${t.held ? ' gold' : ''}"${ids[0] ? ` data-pid="${esc(ids[0])}"` : ''}>
              <span class="sp-chips">${ids.map(_spChip).join('')}</span>
              <span class="nd-wo-t"><b>${esc(_namenListe(ids.map(nameOf)))}</b><small>${esc(t.label || '')}</small></span>
              <b class="nd-wo-w num">${esc(t.wert || '')}</b></div>`;
        }).join('');
        return `<div class="nd-section">Die Woche</div>${kopf}
          <div class="nd-wo">${zeilen}</div>`;
      }
      // ── Die Sammelkarte: was im selben Moment passiert ist ───────────
      // Der Kopf fasst zusammen, auf der Karte einer Partie ist er ihr
      // Hauptanlass [§C33]. Darunter stehen alle Teile gleichrangig; keines
      // wird hervorgehoben, auch nicht der Hauptanlass.
      case 'sammel': {
        const teile = Array.isArray(d.teile) ? d.teile : [];
        // Die Ergebnis-Karte handelt von zwei Partien, und eine Partie sieht
        // man am Ergebnis. Auf der Karte ist dafuer kein Platz [§C27], im
        // Blatt schon: jede Zeile bekommt ihr eigenes Band. Ohne das stand
        // dort zweimal ein Satz ueber ein Spiel, dessen Stand nur im
        // Sammelband der Karte zu sehen war.
        const jeZeileBand = d.quelle === 'ergebnis';
        // Jede Änderung mit ihrer eigenen Uhrzeit: ein Tafel-Moment umfasst
        // mehrere Partien, und die Liste stand ohne jeden Zeitbezug da. Das
        // Ergebnis der eigenen Partie kommt dazu, wo es ein anderes ist als
        // das Band über der Liste — als Stand, nicht als zweites Band: neun
        // Bänder mit je vier Wappen sind das, wovor „Detail folgt der Größe"
        // warnt [§C33].
        const zeileStand = t => {
          if(!t.matchId || t.matchId === d.matchId) return '';
          const m = (matches || []).find(x => x.id === t.matchId);
          if(!m) return '';
          return standFuer(m);
        };
        const tafelBild = d.quelle === 'tafel' || d.quelle === 'form';
        // `ohneZeit`: die Zeile steht unter der Partie, aus der sie kommt
        // (`_partieGruppen`), und nennt Uhrzeit und Stand nicht noch einmal.
        const _zeile = (t, ohneZeit) => {
          const uhr = !ohneZeit && t.ms ? _newsUhrzeit(t.ms) : '';
          const stand = ohneZeit ? '' : zeileStand(t);
          const zeit = [uhr, stand].filter(Boolean).join(' · ');
          // Eine Zeile der Tafel ist ein Bild aus Gesichtern und Wert; ihr
          // Satz stand darunter und wiederholte beides [§C33].
          const bild = tafelBild ? _ndTafelZeileBild(t) : null;
          // Die Zeile führt zu ihrem Eintrag, nicht zum Profil.
          const ziel = tafelBild ? _ndTafelZiel(t) : '';
          // Ein kurzer Wert steht rechts unter den Gesichtern, ein langer als
          // eigene Zeile unter dem Satz — rechts machte er die Spalte so
          // breit, dass links ein Wort je Zeile übrig blieb.
          const kurz = bild && bild.wert && bild.wertText.length <= 16;
          if(bild) return `<div class="nw-zeile nw-tz${t.neg ? ' neg' : ''}"${ziel}${ziel ? ' style="cursor:pointer"' : ''}>
              ${t.ic ? `<i class="nw-ic">${svgI(t.ic)}</i>` : ''}
              <span class="nw-tz-t"><span class="nw-label">${esc(bild.label)}</span>${
                t.klasse ? `<b class="nw-kl">${esc(t.klasse)}</b>` : ''}${t.marke ? `<b class="nw-mk">${esc(t.marke)}</b>` : ''}
                <small>${esc([bild.verb, zeit].filter(Boolean).join(' · '))}</small></span>
              <span class="nw-tz-r">${bild.rechts}${kurz ? `<b class="nd-tz-v num">${bild.wert}</b>` : ''}</span>${
              bild.wert && !kurz ? `<b class="nw-tz-lang">${bild.wert}</b>` : ''}</div>`;
          // Die Zeile des Hauptanlasses: ihr Satz ist schon die Schlagzeile
          // des Blatts [§C33], also steht dort ihr Beleg. Vorher stand derselbe
          // Satz als Titel und gleich darunter als erste Zeile. Steht auch ihr
          // Text schon oben (die Karte einer Partie erklärt ihren
          // Hauptanlass mit seinem eigenen Satz), fällt die Zeile weg.
          if(!_ndNeu(t.titel) && !_ndNeu(t.text) && String(t.text || '').trim()) return '';
          const titel = _ndNeu(t.titel) ? t.titel : (_ndNeu(t.text) || t.titel);
          const text = titel === t.text ? '' : t.text;
          return `<div class="nw-zeile${t.neg ? ' neg' : ''}"${ziel ? ziel + ' style="cursor:pointer"'
              : (t.pids && t.pids[0]) ? ` data-pid="${esc(t.pids[0])}" style="cursor:pointer"` : ''}>
              <div class="nw-zeile-kopf">${t.ic
                ? `<i class="nw-ic">${svgI(t.ic)}</i>` : ''}<span class="nw-label">${
                esc(titel || '')}</span>${
                t.klasse ? `<b class="nw-kl">${esc(t.klasse)}</b>` : ''}${
                t.marke ? `<b class="nw-mk">${esc(t.marke)}</b>` : ''}${
                t.wert ? `<span class="nw-wert">${esc(t.wert)}</span>` : ''}</div>
              ${zeit ? `<div class="nw-satz num">${esc(zeit)}</div>` : ''}
              ${jeZeileBand && t.matchId ? _newsMatchVsBlock(t.matchId) : ''}
              ${_ndNeu(text) ? `<div class="nw-satz">${esc(text)}</div>` : ''}
            </div>`;
        };
        // ── Was hier relevant ist, steht in Zahlen davor ────────────
        // Neun Zeilen untereinander sagen nicht, wovon der Tag handelt: wie
        // viele Rekorde wirklich den Halter gewechselt haben, wie viele nur
        // ausgebaut wurden, wie viele Chroniken dazukamen und was am Ende an
        // Prestige haengenblieb. Die Zahlenreihe ist das Bauteil, das die
        // Rueckblicke dafuer schon haben [§C31].
        // Gewonnen und verloren über alle Spieler, je Spieler einmal.
        const prestigeSumme = (function(){
          let plus = 0, minus = 0;
          const gez = {};
          teile.forEach(t => { const lb = t.lb; if(!lb) return;
            Object.keys(lb).forEach(pid => { if(gez[pid]) return; gez[pid] = 1;
              const dd = Math.round(Number(lb[pid].nach) || 0) - Math.round(Number(lb[pid].vor) || 0);
              if(dd > 0) plus += dd; else minus -= dd; }); });
          return {plus, minus};
        })();
        const uebersicht = (function(){
          if(d.quelle !== 'tafel' && d.quelle !== 'form') return '';
          if(typeof rcpZahlenHtml !== 'function') return '';
          const typ = t => String((t && (t.typ || t.type)) || '');
          const wech = teile.filter(t => typ(t).indexOf('rekord_') === 0
            && typ(t) !== 'rekord_gesteigert').length;
          const aus = teile.filter(t => typ(t) === 'rekord_gesteigert').length;
          const chr = teile.filter(t => typ(t).indexOf('chronik_') === 0).length;
          const plus = prestigeSumme.plus;
          // Was andere dabei verloren haben, steht nicht in derselben Summe:
          // sie hiesse, der Tag haette weniger gebracht, und er hat zwei
          // Dinge getan [§C25]. Es steht über der Wirkung, deren rote Zeilen
          // es zusammenzählt — als fünfte Zelle brach es die Reihe in zwei,
          // und „−413 verloren" stand allein auf einer Zeile.
          const z = [
            wech ? {v: wech, l: wech === 1 ? 'Bestmarke' : 'Bestmarken', ton:'gold'} : null,
            aus ? {v: aus, l: aus === 1 ? 'Ausbau' : 'Ausbauten'} : null,
            chr ? {v: chr, l: chr === 1 ? 'Chronik' : 'Chroniken'} : null,
            plus ? {v: '+' + plus, l:'Prestige', ton:'gold'} : null
          ].filter(Boolean);
          return z.length > 1 ? rcpZahlenHtml(z) : '';
        })();
        // ── Zweiundzwanzig Zeilen sind keine Liste, sie sind eine Wand ──
        // Gemessen trug ein Tafel-Moment 22 Zeilen — sechs Bestmarken, neun
        // Ausbauten, fuenf Chroniken und zwei Insignien — und sie standen als
        // EIN Stapel untereinander. Wer ihn oeffnete, konnte nicht sehen, was
        // ein Wechsel und was nur ein besserer Wert war. Gruppen mit Zeichen
        // und Zahl machen das navigierbar; `rcpAbschnitt` ist die
        // Ueberschrift, die die App dafuer schon hat [§C31].
        const gruppiert = (function(){
          if(d.quelle !== 'tafel' && d.quelle !== 'form') return '';
          if(typeof rcpAbschnitt !== 'function') return '';
          // Unter vier Zeilen sagt eine Gruppierung nichts. Erst danach
          // zeichnen, sonst würde ihre komplette, verworfene Liste gebaut.
          if(teile.length < 4) return '';
          const typ = t => String((t && (t.typ || t.type)) || '');
          // Unter zwei Gruppen ein Satz, was sie fürs Prestige heißen: die
          // Wirkung darunter nennt nur, was Prestige bewegt, und ohne den
          // Satz sah eine Chronik ohne Chip dort wie vergessen aus.
          const gr = [
            {t:'Bestmarken', f:x => typ(x).indexOf('rekord_') === 0
                                 && typ(x) !== 'rekord_gesteigert'},
            {t:'Monatschroniken', f:x => typ(x).indexOf('chronik_') === 0,
             h:'Fürs Prestige zählt je Spieler und Monat eine Chronik, die wertvollste.'},
            {t:'Ausbauten', f:x => typ(x) === 'rekord_gesteigert',
             h:'Ein besserer Wert beim selben Halter ändert das Prestige nicht.'}
          ];
          // ── Die Partie steht einmal, über ihren Zeilen ────────────────
          // Jede Zeile trug „· 17:17 · 10:4", und zehn Monatschroniken aus
          // derselben Partie sagten es zehnmal untereinander. Die Zeilen
          // stehen jetzt unter der Partie, aus der sie kommen.
          const liste = l => {
            const gruppen = [];
            l.slice().sort((a, b) => (a.ms || 0) - (b.ms || 0)).forEach(t => {
              const k = (t.matchId || '') + '|' + (t.ms || '');
              const g = gruppen[gruppen.length - 1];
              if(g && g.k === k) g.l.push(t); else gruppen.push({k, l:[t]});
            });
            return `<div class="nw-liste">${gruppen.map(g => {
              const t = g.l[0];
              const kopf = [t.ms ? _newsUhrzeit(t.ms) : '', zeileStand(t)].filter(Boolean).join(' · ');
              return (kopf ? `<div class="nw-zk num">${esc(kopf)}</div>` : '')
                + g.l.map(x => _zeile(x, !!kopf)).join('');
            }).join('')}</div>`;
          };
          const rest = teile.slice();
          const aus = [];
          gr.forEach(g => {
            const l = rest.filter(g.f);
            l.forEach(x => rest.splice(rest.indexOf(x), 1));
            // Die Zahl steht in der Reihe darüber; nur ohne sie zählt die
            // Überschrift selbst.
            if(l.length) aus.push(rcpAbschnitt(g.t, uebersicht ? 0 : l.length)
              + (g.h ? `<div class="nw-hinweis">${esc(g.h)}</div>` : '') + liste(l));
          });
          if(rest.length) aus.push(liste(rest));
          return aus.join('');
        })();
        // ── Ein Bereich für die Wirkung, nicht einer je Zeile ───────────
        // Die Punktewirkung eines Spieltags ist je Spieler EINE Zahl, egal
        // aus welcher Zeile sie kommt: beide Stände gehören dem Tag, nicht
        // dem einzelnen Rekord [§11.0e]. Je Zeile gezeigt stünde dieselbe
        // Rechnung neunmal untereinander; hier steht sie einmal je Spieler.
        const wirkung = (function(){
          const je = {};
          teile.forEach(t => {
            const lb = t.lb;
            if(!lb) return;
            Object.keys(lb).forEach(pid => { if(!je[pid] && pm[pid]) je[pid] = lb[pid]; });
          });
          const ids = Object.keys(je);
          if(!ids.length) return '';
          // Was die roten Zeilen zusammen verlieren, steht über ihnen; der
          // Zuwachs steht in der Zahlenreihe oben.
          const verloren = uebersicht && prestigeSumme.minus
            ? `<span class="nd-sec-r"><b class="num">−${prestigeSumme.minus}</b> verloren</span>` : '';
          return `<div class="nd-section${verloren ? ' nd-sec-z' : ''}">Wirkung auf die Laufbahn${verloren}</div>`
            + _ndWirkungBlock(je, _ndWirkungsGruende(teile), new Date(s.when).getTime());
        })();
        // ── Das Bündel einer Partie ──────────────────────────────────
        // Es trägt die Zeichnung seiner Karte als Bühne [§C33], darunter, was
        // an der Partie hängt, und dann dieselben Abschnitte wie das Blatt
        // der Partie. Die Zeile der Partie selbst fällt weg: sie IST die
        // Bühne, und ihr Satz stand wortgleich ein zweites Mal darunter. Die
        // Uhrzeit fällt in jeder Zeile weg, die zu dieser Partie gehört —
        // neunmal „14:32" untereinander sagt nichts.
        if(d.matchId && _newsSorte(s) === 'spiel'){
          const eigen = teile.filter(t => String(t.typ || t.type || '') !== 'spiel');
          const zl = eigen.map(t => _zeile(Object.assign({}, t, {ms:t.matchId && t.matchId !== d.matchId ? t.ms : null}))).join('');
          return (zl ? `<div class="nd-section">Was dazu gehört</div><div class="nw-liste">${zl}</div>` : '')
            + _ndPartieAbschnitte(s) + wirkung;
        }
        // Die Gruppierung und das Matchblatt haben ihre Zeilen bereits.
        // Nur der tatsächlich sichtbare Rückfall zeichnet die flache Liste.
        const zeilen = gruppiert ? '' : teile.map(_zeile).join('');
        const mv = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        // Die Ueberschrift sagt, was die Liste ist. „In dieser Partie" stand
        // auch ueber der Karte, auf der drei Spieler dieselbe Stufe
        // erreichen — und die entsteht am Ende eines Spieltags, nicht in
        // einer Partie.
        const kopfzeile = d.quelle === 'tafel' ? 'An der Ewigen Tafel'
          : d.quelle === 'form' ? 'Auf kurzer Strecke'
          : d.quelle === 'spieler' ? 'Alles in diesem Moment'
          : d.quelle === 'erfolg' ? 'Alle mit diesem Erfolg'
          : d.quelle === 'ergebnis' ? 'Diese beiden Partien'
          : 'In dieser Partie';
        // ── Eine Ueberschrift ueber Ueberschriften sagt nichts ─────────
        // „An der Ewigen Tafel" stand als Sammelueberschrift direkt ueber
        // „Bestmarken 1" und „Monatschroniken 2" — und dieselbe Aussage stand
        // auf demselben Blatt schon dreimal: in der Rubrik, in der
        // Schlagzeile („… bewegen die Ewige Tafel") und unter den Wappen
        // („an der Ewigen Tafel"). Wo die Liste ihre eigenen Ueberschriften
        // traegt, faellt die darueber weg; ohne Gruppierung bleibt sie, denn
        // dann hat die Liste keine [§C33].
        return uebersicht
          + (gruppiert
              ? `${mv}${gruppiert}`
              : `<div class="nd-section">${kopfzeile}</div>${mv}<div class="nw-liste">${zeilen}</div>`)
          + wirkung;
      }
      // Die Stufe IST die Story — und das Blatt war leer.
      case 'insignium_stufe': {
        // Darunter stand „Die beiden obersten Stufen erreicht kaum jemand,
        // deshalb ist diese Karte Breaking [§C30]" — die App erklaerte dem
        // Leser ihre eigene Regel und zitierte dabei ihren Paragraphen. Dass
        // die Stufe selten ist, sagt die Leiter im Block darueber.
        return `<div class="nd-section">Die neue Stufe</div>`
          + _newsInsigniumBlock(d.pid, d.stufe);
      }
      case 'ambient': {
        // Vorher stand hier „Im Fokus: Stefan" — ein Wappen mit dem Namen, den
        // der Kopf zwei Zeilen darüber schon zeigt, und sonst NICHTS. Wer eine
        // Prestige-Karte öffnete, sah kein Zeichen, keine Leiter, keine Zahl.
        // Jetzt trägt jede ambiente Karte ihren Wert groß, und wo es ums
        // Prestige geht, steht die Leiter dabei — sie IST die Aussage.
        const wertBlock = (d.vv != null && d.vv !== '')
          ? `<div class="nd-gwert ${d.prestige ? 'gold' : ''}"><b>${esc(String(d.vv))}</b>`
            + `<span>${esc(d.vl || '')}</span></div>` : '';
        // Die Leiter der Liga: jedes Feld mit den Gesichtern, die es tragen,
        // so wie es am Tag der Karte stand [§C30].
        if(d.leiter) return wertBlock + `<div class="nd-section">Die Leiter der Liga</div>`
          + _ndLigaLeiter(d.leiter);
        if(d.ambientPid && pm[d.ambientPid]){
          return wertBlock
            + (d.prestige ? `<div class="nd-section">Der Stand am Zeichen</div>`
                            + _newsInsigniumBlock(d.ambientPid) : '')
            + (!wertBlock && !d.prestige ? `<div class="nd-section">Im Fokus</div>
              <div class="nd-vs"><div class="nd-vs-p" data-pid="${esc(d.ambientPid)}">
                ${avM(d.ambientPid)}<div class="nd-vs-name">${esc(nameOf(d.ambientPid))}</div>
              </div></div>` : '');
        }
        if(wertBlock && !(Array.isArray(d.ambientPids) && d.ambientPids.length === 2)) return wertBlock;
        if(Array.isArray(d.ambientPids) && d.ambientPids.length === 2 && pm[d.ambientPids[0]] && pm[d.ambientPids[1]]){
          const [pa, pb] = d.ambientPids;
          // v9.17: Paare sind nicht automatisch Gegner. Team-Stories (z.B. die
          // gemeinsame Siegesserie eines Duos) wurden bisher als „Duell … vs …"
          // gerendert, obwohl die beiden ZUSAMMEN spielen. pairKind kommt aus dem
          // Template; für bereits persistierte Rows ohne Feld entscheidet die
          // Kategorie ('team' → Team, sonst Duell).
          const isTeam = d.pairKind === 'team' || (!d.pairKind && s.cat === 'team');
          return `<div class="nd-section">${isTeam ? 'Das Duo' : 'Duell'}</div>
            <div class="nd-vs">
              <div class="nd-vs-p" data-pid="${esc(pa)}">${avM(pa)}<div class="nd-vs-name">${esc(nameOf(pa))}</div></div>
              <div class="nd-vs-mid">${isTeam ? '&amp;' : 'vs'}</div>
              <div class="nd-vs-p" data-pid="${esc(pb)}">${avM(pb)}<div class="nd-vs-name">${esc(nameOf(pb))}</div></div>
            </div>`;
        }
        return '';
      }
      case 'season_endgame': {
        const pA = d.leader, pB = d.second;
        return `<div class="nd-section">Top-2 Stand</div>
          <div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(pA.pid)}">
              ${avM(pA.pid)}
              <div class="nd-vs-name">${esc(nameOf(pA.pid))}</div>
              <div class="nd-vs-elo">${pA.elo} Elo</div>
            </div>
            <div class="nd-vs-mid">${d.gap}<div class="nd-vs-mid-sub">Elo Diff</div></div>
            <div class="nd-vs-p" data-pid="${esc(pB.pid)}">
              ${avM(pB.pid)}
              <div class="nd-vs-name">${esc(nameOf(pB.pid))}</div>
              <div class="nd-vs-elo">${pB.elo} Elo</div>
            </div>
          </div>
          <div class="nd-stat-row"><div class="nd-stat-label">Verbleibend</div><div class="nd-stat-val acid">${d.daysLeft} ${d.daysLeft===1?'Tag':'Tage'}</div></div>`;
      }
      case 'lead_change': {
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        const eloChg = d.matchId ? _newsEloDelta(d.newLeader, d.matchId) : null;
        const rankInfo = d.matchId ? _newsRankChange(d.newLeader, d.matchId) : null;
        // Die Spitze kann an einem Tag mehrmals wechseln. Der Kopf zeigt den
        // Stand am Ende des Tages; wer nur ihn sieht, erfaehrt nicht, dass
        // die Tabelle zwischendurch schon einmal jemand anderem gehoerte.
        // Gezeigt wird deshalb jeder Wechsel aus `events` — dieselben Fakten,
        // aus denen die Karte entsteht [§11.0e]. Bei genau einem Wechsel
        // bleiben die Zeilen weg: er steht zwei Zeilen darueber schon [§C33].
        const ev = Array.isArray(d.events) ? d.events : [];
        const wechselHtml = ev.length > 1 ? ev.map(e => {
          const nach = (e.detail && e.detail.nach) || e.actorIds[0];
          const vor  = (e.detail && e.detail.vor)  || e.actorIds[1];
          return rcpZeileHtml({ic:'kingClass', name:nameOf(nach),
            sub:'von ' + nameOf(vor) + (e.evidence ? ', ' + e.evidence : ''),
            rechts:e.occurredAt ? _newsUhrzeit(e.occurredAt) : '',
            attr:`data-pid="${esc(nach)}" style="cursor:pointer"`});
        }).join('') : '';
        return `<div class="nd-section">Wechsel an der Spitze</div>
          <div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(d.newLeader)}">
              ${avM(d.newLeader)}
              <div class="nd-vs-name">${esc(nameOf(d.newLeader))}</div>
              <div class="nd-vs-elo" style="color:var(--acid)">neuer #1</div>
            </div>
            <div class="nd-vs-mid">↑<div class="nd-vs-mid-sub">${d.zurueck ? 'holt zurück' : 'übernimmt'}</div></div>
            <div class="nd-vs-p" data-pid="${esc(d.prevLeader)}">
              ${avM(d.prevLeader)}
              <div class="nd-vs-name">${esc(nameOf(d.prevLeader))}</div>
              <div class="nd-vs-elo">vorher #1</div>
            </div>
          </div>
          ${eloChg !== null ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Elo-Veränderung</div>
            <div class="nd-stat-val ${eloChg>=0?'pos':'neg'}">${eloChg>=0?'+':''}${eloChg}</div>
          </div>` : ''}
          ${rankInfo ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Tabelle</div>
            <div class="nd-stat-val acid">#${rankInfo.pre} → #${rankInfo.post}</div>
          </div>` : ''}
          ${wechselHtml ? `<div class="nd-section">Alle ${ev.length} Wechsel des Tages</div>${wechselHtml}` : ''}
          ${matchHtml ? `<div class="nd-section">Die Partie</div>${matchHtml}` : ''}`;
      }
      case 'top_form': {
        const form = _newsRecentForm(d.pid, 10, s);
        return `<div class="nd-section">Die letzten 10 Partien bis hierher</div>
          ${form.strip ? `<div class="nd-form-strip">${form.strip}</div>` : ''}
          <div class="nd-stat-row" data-pid="${esc(d.pid)}" style="cursor:pointer">
            <div class="nd-stat-label">${esc(nameOf(d.pid))}</div>
            <div class="nd-stat-val acid">${d.wins}/10 Siege</div></div>
          ${form.currentStreak >= 2 ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Siege in Folge</div>
            <div class="nd-stat-val acid">${form.currentStreak}</div></div>` : ''}`;
      }
      case 'loss_streak': {
        // Die Reihe der letzten zehn steht nur, wenn sie mehr zeigt als die
        // Serie selbst: bei zehn Pleiten in Folge ist sie dieselbe Zeichnung
        // ein zweites Mal. Die Zeile „Leo · 10× Niederlage in Folge" darunter
        // nannte dieselbe Zahl ein drittes Mal und ist weg [§C33 `_ndNeu`].
        const form = d.streak < 10 ? _newsRecentForm(d.pid, 10, s) : {strip:''};
        return `<div class="nd-section">Die Serie</div>
          ${_newsSerienBand(d.streak, true)}
          ${form.strip ? `<div class="nd-section">Die letzten 10 Partien bis hierher</div>
          <div class="nd-form-strip">${form.strip}</div>` : ''}`;
      }
      case 'badge_unlocked': {
        // v8.6: bei konsolidierten Karten (mehrere Spieler, gleicher Badge im
        // selben Match) alle Beteiligten listen; sonst der einzelne Spieler.
        const pids = (Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId];
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        const eloChg = (pids.length === 1 && d.matchId) ? _newsEloDelta(pids[0], d.matchId) : null;
        // Das Blatt einer Auszeichnung soll belohnen. Vorher stand dort eine
        // Zeile „Spieler: Leo ›" — obwohl der Kopf schon Leo zeigte —, darunter
        // „Seltenheit: Negative" in Englisch. Jetzt traegt es das Medaillon,
        // die Klasse und die Zahl der Halter: „einer von zwoelf" ist das, was
        // eine Auszeichnung wert macht [§C34].
        const bdef = (typeof BADGES !== 'undefined')
          ? BADGES.find(b => b.id === d.badgeId) : null;
        const medaille = _newsMedaillon(s.ic || (bdef && bdef.ic) || 'medal', d.rarity,
          d.badgeName || (bdef && bdef.name) || '', bdef ? bdef.desc : '', d.badgeId, {id:d.badgeId, pid:pids[0]});
        // Mehrere Spieler nur dann als Liste — bei einem steht er im Kopf.
        const playersHtml = pids.length > 1
          ? `<div class="nd-section">${pids.length} Spieler</div>` + pids.map(pid =>
              `<div class="nd-stat-row" data-pid="${esc(pid)}" style="cursor:pointer">
                <div class="nd-stat-label">${esc(nameOf(pid))}</div><div class="nd-stat-val">›</div></div>`).join('')
          : '';
        // Den Gegner nennt der Text der Karte schon; die Zeile bleibt nur,
        // wenn er dort nicht steht — antippbar ist sie in beiden Faellen.
        const nemRow = (d.nemesisOppId && _ndNormal(_ndOben).indexOf(_ndNormal(nameOf(d.nemesisOppId))) < 0)
          ? `<div class="nd-stat-row" data-pid="${esc(d.nemesisOppId)}" style="cursor:pointer">
            <div class="nd-stat-label">Gegen wen</div>
            <div class="nd-stat-val neg">${esc(nameOf(d.nemesisOppId))} ›</div></div>` : '';
        return medaille + playersHtml + nemRow
          + (eloChg !== null ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Elo aus dieser Partie</div>
            <div class="nd-stat-val ${eloChg>=0?'pos':'neg'}">${eloChg>=0?'+':''}${eloChg}</div></div>` : '')
          + (matchHtml ? `<div class="nd-section">Die Partie</div>${matchHtml}` : '');
      }
      // Die gesammelten runden Marken eines Tages. Bei EINER Marke ist das
      // dieselbe Aussage wie bei einer einzelnen Auszeichnung, also dasselbe
      // Bauteil [§C27]: das Medaillon mit Klasse, Bedingung und Halterzahl.
      // Bei mehreren traegt jede Zeile ihren Traeger, ihr Zeichen und die
      // Zahl — ohne diesen Fall blieb das Blatt leer, und ein leeres Blatt
      // ist schlimmer als eine Wiederholung [§C33].
      case 'badge_marken': {
        const l = Array.isArray(d.marken) ? d.marken : [];
        const def = id => (typeof BADGES !== 'undefined') ? BADGES.find(b => b.id === id) : null;
        if(l.length === 1){
          const b0 = def(l[0].badgeId);
          return _newsMedaillon((b0 && b0.ic) || s.ic || 'medal',
              rarityOf(l[0].badgeId),
              l[0].name || (b0 && b0.name) || '', b0 ? b0.desc : '', l[0].badgeId, {id:l[0].badgeId, pid:l[0].pid})
            + (d.matchId ? `<div class="nd-section">Die Partie</div>`
                + _newsMatchVsBlock(d.matchId) : '');
        }
        return `<div class="nd-section">${l.length} runde Marken</div>`
          + l.map(x => rcpZeileHtml({ic:(def(x.badgeId) || {}).ic || 'medal',
              name:nameOf(x.pid), sub:x.name,
              rechts:'zum ' + x.rang + '. Mal',
              // Die Zeile ist die Marke: sie öffnet die Auszeichnung, nicht das Profil.
              attr:`data-bp="${esc(x.badgeId)}" data-bp-pid="${esc(x.pid)}"`})).join('');
      }
      case 'rivalry': {
        // Live-Bilanz aus matches berechnen — günstig, da rivalry-Stories selten sind.
        const h2h = _newsH2HRecord(d.a, d.b);
        return `<div class="nd-section">Die Kontrahenten</div>
          <div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(d.a)}">
              ${avM(d.a)}
              <div class="nd-vs-name">${esc(nameOf(d.a))}</div>
              <div class="nd-vs-elo">${esc(_newsRangKurz(d.a) || '')}</div>
            </div>
            <div class="nd-vs-mid">VS<div class="nd-vs-mid-sub">${d.n} Duelle</div></div>
            <div class="nd-vs-p" data-pid="${esc(d.b)}">
              ${avM(d.b)}
              <div class="nd-vs-name">${esc(nameOf(d.b))}</div>
              <div class="nd-vs-elo">${esc(_newsRangKurz(d.b) || '')}</div>
            </div>
          </div>
          ${_newsBilanzBalken(d.a, d.b, h2h.aWins, h2h.bWins)}
          ${h2h.lastMatchId ? `<div class="nd-section">Letztes Duell</div>${_newsMatchVsBlock(h2h.lastMatchId)}` : ''}`;
      }
      // Zwei, die zusammen spielen, hatten im Blatt gar keinen Fall: das
      // Duo-Blatt zeigte den Kopf und den Satz von der Karte. Jetzt steht die
      // Serie als Lauf da und darunter, wie oft die beiden ueberhaupt
      // zusammen gespielt haben.
      case 'team_streak':
      case 'team_loss_streak': {
        const verloren = d.type === 'team_loss_streak';
        let tw = null;
        try { tw = teamStatsFromMatches(_ndBisPartie(s)).find(t =>
          (t.ids || []).includes(d.a) && (t.ids || []).includes(d.b)); } catch(e){}
        // Die Zahl der Partien steht schon als Lauf darueber — sie stand hier
        // ein zweites Mal als Ziffer.
        //
        // Und die letzte gemeinsame Partie steht nur da, wenn die Karte keine
        // eigene nennt. Seit die Marke an ihrer ausloesenden Partie haengt,
        // zeigt der Kopf diese schon, und darunter stand eine ZWEITE
        // Begegnung derselben beiden — die Partie steht hoechstens einmal im
        // Blatt [§C27].
        let letzte = null;
        if(!d.matchId){
          try { letzte = [...matches].reverse().find(m =>
            [m.a1, m.a2].every(x => x === d.a || x === d.b) ||
            [m.b1, m.b2].every(x => x === d.a || x === d.b)); } catch(e){}
        }
        return `<div class="nd-section">${verloren ? 'Die Durststrecke' : 'Die Serie'}</div>
          ${_newsSerienBand(d.streak, verloren)}
          ${tw ? `<div class="nd-stat-row"><div class="nd-stat-label">Gemeinsame Bilanz bis hierher</div>
            <div class="nd-stat-val">${tw.w}:${tw.g - tw.w}</div></div>
          <div class="nd-stat-row"><div class="nd-stat-label">Siegquote als Duo</div>
            <div class="nd-stat-val ${tw.w * 2 >= tw.g ? 'acid' : 'neg'}">${Math.round(tw.w / tw.g * 100)} %</div></div>
          <div class="nd-stat-row"><div class="nd-stat-label">Games</div>
            <div class="nd-stat-val">${tw.gf}:${tw.ga}</div></div>` : ''}
          ${letzte && letzte.id !== _ndKopfMatch
            ? `<div class="nd-section">Die letzte gemeinsame Partie</div>${_newsMatchVsBlock(letzte.id)}` : ''}`;
      }
      case 'jubilee': {
        // Karriere-Bilanz nutzen statt nur Total — bestehende Stats-Funktion.
        const stats = _ndBilanzBis(d.pid, s);
        return `<div class="nd-section">Die ersten ${esc(String(d.total))} Partien</div>
          ${stats ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Siege / Niederlagen</div>
            <div class="nd-stat-val">${stats.wins} / ${stats.losses}</div></div>
          <div class="nd-stat-row">
            <div class="nd-stat-label">Siegquote</div>
            <div class="nd-stat-val acid">${stats.winRate} %</div></div>` : ''}
          ${d.matchId ? `<div class="nd-section">Die Jubiläumspartie</div>${_newsMatchVsBlock(d.matchId)}` : ''}`;
      }
      case 'quiet_week': {
        return `<div class="nd-section">Aktivität</div>
          <div class="nd-stat-row"><div class="nd-stat-label">Letzte 7 Tage</div><div class="nd-stat-val">${d.lastWeek} ${d.lastWeek === 1 ? 'Partie' : 'Partien'}</div></div>
          <div class="nd-stat-row"><div class="nd-stat-label">4-Wochen-Schnitt</div><div class="nd-stat-val">${d.avg} Partien</div></div>`;
      }
      // Die Karte sagt, dass der Monat eine Tabelle hat, und ihr Blatt zeigte
      // nur die Saison-ID — eine Zeichenkette, die niemanden interessiert. Die
      // Angaben liegen im `dataRef`: die beiden an der Spitze, ihr Abstand und
      // die Stichprobe, ab der gewertet wird. Der Vs-Block und die Zahlenreihe
      // sind die Bauteile, die die App dafuer schon hat [§C27].
      case 'season_start': {
        const pA = d.leader, pB = d.second;
        // Wappen wie überall [§C27]: dort standen zwei Buchstaben-Kreise.
        const avW = pid => pm[pid] ? avHtml(pm[pid], '', {ins:true, px:56, feuer:0}) : '';
        const vs = (pA && pB) ? `<div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(pA.pid)}">
              ${avW(pA.pid)}
              <div class="nd-vs-name">${esc(nameOf(pA.pid))}</div>
              <div class="nd-vs-elo">${pA.elo} Elo</div>
            </div>
            <div class="nd-vs-mid">${d.gap}<div class="nd-vs-mid-sub">Elo Diff</div></div>
            <div class="nd-vs-p" data-pid="${esc(pB.pid)}">
              ${avW(pB.pid)}
              <div class="nd-vs-name">${esc(nameOf(pB.pid))}</div>
              <div class="nd-vs-elo">${pB.elo} Elo</div>
            </div>
          </div>` : '';
        const z = rcpZahlenHtml([
          d.partien ? {v: d.partien, l: d.partien === 1 ? 'Partie' : 'Partien'} : null,
          d.aktive ? {v: d.aktive, l:'Gewertete'} : null
        ].filter(Boolean));
        return (vs ? `<div class="nd-section">Oben in der Tabelle</div>${vs}` : '')
          + (z ? `<div class="nd-section">Die Stichprobe</div>${z}` : '');
      }
      // Neue Typen (Phase 8) hängen sich hier dran an
      case 'milestone_wins':
      case 'milestone_goals':
      case 'milestone_elo': {
        const stats = _ndBilanzBis(d.pid, s);
        return `<div class="nd-section">Meilenstein</div>
          <div class="nd-stat-row" data-pid="${esc(d.pid)}" style="cursor:pointer">
            <div class="nd-stat-label">${esc(nameOf(d.pid))}</div>
            <div class="nd-stat-val gold">${esc(d.milestone)}</div></div>
          ${stats ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Bilanz bis zu dieser Partie</div>
            <div class="nd-stat-val">${stats.wins} : ${stats.losses}</div></div>` : ''}
          ${d.matchId ? `<div class="nd-section">Die Partie zum Meilenstein</div>${_newsMatchVsBlock(d.matchId)}` : ''}`;
      }
      case 'elo_swing': {
        // Vorher stand hier der Name — den der Kopf zwei Zeilen darueber schon
        // zeigt — und die Zahl, die auf der Karte stand. Jetzt traegt das Blatt
        // den Ausschlag gross und daneben, woher er kommt.
        const form = _newsRecentForm(d.pid, 10, s);
        let elo = null;
        try { elo = Math.round(((getGlobalSim() || {}).careerElo || {})[d.pid]); } catch(e){}
        return `<div class="nd-gwert ${d.delta >= 0 ? '' : 'rot'}">
            <b>${d.delta >= 0 ? '+' : ''}${d.delta}</b><span>Elo an diesem Tag</span></div>
          ${form.strip ? `<div class="nd-section">Die letzten Partien</div>
            <div class="nd-form-strip">${form.strip}</div>` : ''}
          ${elo ? `<div class="nd-stat-row"><div class="nd-stat-label">Stand jetzt</div>
            <div class="nd-stat-val">${elo} Elo</div></div>` : ''}
          ${form.currentStreak >= 2 ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Siege in Folge an diesem Tag</div>
            <div class="nd-stat-val ${d.delta >= 0 ? 'acid' : 'neg'}">${form.currentStreak}</div></div>` : ''}`;
      }
      // ── v8.2 Neue Typen ──
      case 'streak_killer': {
        // „Gestoppt von X" und „−7er Serie" standen wortgleich schon im Text
        // der Karte. Das Blatt zeigt stattdessen, was der Satz nicht sagt:
        // wann die Serie begann und wie lange sie gehalten hat.
        const lauf = _newsSerienLauf(d.victimPid, d.matchId, d.streak);
        const gitter = `<div class="nd-gitter">
            <div><b class="g">${d.streak}</b><span>Siege nacheinander</span></div>
            ${lauf.tage != null ? `<div><b>${lauf.tage}</b><span>${lauf.tage === 1 ? 'Tag' : 'Tage'} lang gehalten</span></div>` : ''}
          </div>`;
        const zeit = lauf.von ? `<div class="nd-satz">Die Serie begann am <b>${esc(lauf.von)}</b>`
            + (lauf.bis ? ` und endete am <b>${esc(lauf.bis)}</b>.` : '.') + `</div>` : '';
        // Acht ist eine Zahl, die Reihe zeigt, wie lang acht sind — dasselbe
        // Bauteil, mit dem eine laufende Serie im Feed steht [§C27].
        const band = _newsSerienBand(d.streak, false);
        return `<div class="nd-section">Die Serie von ${esc(nameOf(d.victimPid))}</div>`
          + band + gitter + zeit;
      }
      case 'rivalry_milestone': {
        const h2h = _newsH2HRecord(d.a, d.b);
        return `<div class="nd-section">Historische Bilanz</div>
          <div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(d.a)}">
              ${avM(d.a)}
              <div class="nd-vs-name">${esc(nameOf(d.a))}</div>
              <div class="nd-vs-elo">${h2h.aWins} Siege</div>
            </div>
            <div class="nd-vs-mid">${d.n}<div class="nd-vs-mid-sub">Duelle</div></div>
            <div class="nd-vs-p" data-pid="${esc(d.b)}">
              ${avM(d.b)}
              <div class="nd-vs-name">${esc(nameOf(d.b))}</div>
              <div class="nd-vs-elo">${h2h.bWins} Siege</div>
            </div>
          </div>
          ${d.matchId ? `<div class="nd-section">Das Jubiläumsduell</div>${_newsMatchVsBlock(d.matchId)}` : ''}`;
      }
      // ── Was in einer Partie sonst noch passiert [§C33] ─────────────
      // Die sechs Ereignisse hängen an ihrer Partie-Karte und öffnen sich dort
      // als Zeile. Einzeln geöffnet (ein Link, ein älterer Stand des Feeds)
      // zeigte ihr Blatt nur Kopf und Satz — NULL Zeichen Mitte. Jedes trägt
      // die eine Zahl, um die es geht, groß, und daneben, wogegen sie misst.
      case 'fluch': {
        const h2h = _newsH2HRecord(d.pid, d.gegen);
        return `<div class="nd-section">Die Niederlagen davor</div>
          ${_newsSerienBand(d.n, true)}
          <div class="nd-section">Die Bilanz gegeneinander</div>
          ${_newsBilanzBalken(d.pid, d.gegen, h2h.aWins, h2h.bWins)}`;
      }
      case 'duo_jubilaeum': {
        const q = d.n ? Math.round(100 * d.s / d.n) : 0;
        return `<div class="nd-gitter">
            <div><b class="g">${d.n}</b><span>Partien zusammen</span></div>
            <div><b>${d.s}</b><span>davon gewonnen</span></div>
            <div><b class="${q * 2 >= 100 ? 'g' : ''}">${q} %</b><span>Siegquote als Duo</span></div>
          </div>`;
      }
      case 'revanche': {
        return d.vorherId && d.vorherId !== _ndKopfMatch
          ? `<div class="nd-section">Das Duell davor</div>${_newsMatchVsBlock(d.vorherId)}`
          : `<div class="nd-section">Die Revanche</div>`;
      }
      case 'tagesmarathon': {
        return `<div class="nd-gitter">
            <div><b class="g">${d.n}</b><span>Partien an diesem Tag</span></div>
            <div><b>${d.s}</b><span>davon gewonnen</span></div>
            <div><b>${d.n - d.s}</b><span>verloren</span></div>
          </div>`;
      }
      case 'elo_hoch': {
        // Die Elo beginnt jeden Monat neu: der Monat der alten Marke steht
        // dabei, sonst liest sich „299 Elo" wie ein Stand aus diesem Monat.
        const monat = d.vorherSid && d.matchId && _spMatch(d.matchId)
          && d.vorherSid !== seasonOf(_spMatch(d.matchId).created_at).id ? seasonLabel(d.vorherSid) : '';
        return `<div class="nd-gwert gold"><b>${esc(String(d.elo))}</b><span>Elo, so viel wie nie</span></div>
          <div class="nd-stat-row"><div class="nd-stat-label">Bisheriger Höchststand${monat ? `<small>${esc(monat)}</small>` : ''}</div>
            <div class="nd-stat-val">${esc(String(d.vorher))} Elo</div></div>
          <div class="nd-stat-row"><div class="nd-stat-label">Partien dazwischen</div>
            <div class="nd-stat-val">${esc(String(d.seit))}</div></div>`;
      }
      // Die sieben Fakten des Katalogs zeichnen im Blatt denselben Fuß wie
      // an ihrer Karte [§C27].
      case 'duell_kippt': case 'woche_spitze': case 'tag_plus': case 'tag_hoehe':
      case 'monat_gewinn': case 'monat_halb': case 'partner_best':
        return _spFaktBild(d);
      // Das Ende einer Pleitenserie und die Rückkehr: die Zahl, um die es
      // geht, groß; den Tag davor nennt schon der Satz.
      case 'pleiten_ende': case 'duo_pleiten_ende':
        return `<div class="nd-gwert"><b>${esc(String(d.n))}</b><span>${d.type === 'pleiten_ende'
          ? 'Niederlagen in Folge davor' : 'gemeinsame Niederlagen in Folge davor'}</span></div>`;
      case 'rueckkehr':
        return `<div class="nd-gwert"><b>${esc(String(d.tage))}</b><span>Tage ohne Partie</span></div>`;
      case 'tabellensprung': {
        return `<div class="nd-gwert"><b>${esc(String(d.pre))} → ${esc(String(d.post))}</b><span>Platz in der Tabelle</span></div>
          <div class="nd-stat-row"><div class="nd-stat-label">Gewonnene Plätze</div>
            <div class="nd-stat-val acid">${d.pre - d.post}</div></div>`;
      }
      case 'win_streak': {
        // „Aktuelle Serie" stand über einer Marke, die an ihrer Partie hängt
        // und nach dem Riss stehen bleibt [§C33]; darunter dieselbe Zahl als
        // Punktreihe und als Zeile — dreimal eine Serie.
        return `<div class="nd-section">Die Serie</div>
          ${_newsSerienBand(d.streak, false)}`;
      }
      case 'dry_spell': {
        return `<div class="nd-section">Liga-Pause</div>
          <div class="nd-stat-row">
            <div class="nd-stat-label">Tage ohne Partie</div>
            <div class="nd-stat-val gold">${d.daysSince}</div></div>
          ${d.lastMatchId ? `<div class="nd-section">Letzte Partie</div>${_newsMatchVsBlock(d.lastMatchId)}` : ''}`;
      }
    }
  } catch(e){ /* defensiv */ }
  return '';
}

