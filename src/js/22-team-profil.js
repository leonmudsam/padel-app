// ╔═══ §9.3 ─── TEAM PROFIL SHEET ──────────────────────────────────────╗
//     Statistiken für ein konkretes Duo.
// ╚═════════════════════════════════════════════════════════════════════════╝
function showTeam(p1Id,p2Id){
  const pm=pmap();
  const pA=pm[p1Id], pB=pm[p2Id];
  if(!pA||!pB) return;
  _sheetSetReopen(()=>showTeam(p1Id,p2Id));
  const d=teamDetail(p1Id,p2Id);
  if(!d.games){
    openSheet(`
      <div style="text-align:center;margin-bottom:18px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:var(--muted);font-weight:700;font-family:'Sometype Mono',monospace">Team</div>
        <h3 style="margin-top:8px">${esc(pA.name)} &amp; ${esc(pB.name)}</h3>
      </div>
      ${emptyState('handshake','Noch keine gemeinsamen Sätze')}
    `);
    return;
  }

  const wr=Math.round(d.wr*100);
  const gdStr=(d.gd>=0?'+':'')+d.gd;
  const eloStr=(d.eloDelta>=0?'+':'')+d.eloDelta;

  // Die beiden Hälften des Duos, jede im eigenen Wappen [§C27]. Hier stand
  // ein von Hand gebauter Kreis mit eigenem Rand und eigener Schriftgröße —
  // derselbe Spieler sah im Team-Blatt anders aus als in jeder Liste, und
  // sein Zeichen fehlte im ganzen Blatt.
  // Ohne Band: das Blatt handelt vom DUO. Die Schwinge zählt Ligatitel, die
  // ein Einzelner geholt hat, und stünde hier neben einer Zahl, die zu zweit
  // erspielt wurde.
  const avBig=(p)=>avHtml(p, '', {ins:true, px:96});
  // Kleines Avatar (für Gegner-Rows, 30px)
  const avSm=(p,marginLeft)=>{
    if(!p) return '';
    const em=p.avatar_id?avatarEmoji(p.avatar_id):null;
    const ml=marginLeft?'margin-left:-8px;':'';
    if(em) return `<div style="width:30px;height:30px;border-radius:50%;background:var(--surface3);display:grid;place-items:center;font-size:14px;border:2px solid var(--surface);${ml}">${em}</div>`;
    return `<div style="width:30px;height:30px;border-radius:50%;background:${avColor(p.id)};display:grid;place-items:center;font-size:11px;font-family:'Archivo Black',sans-serif;color:#080b10;border:2px solid var(--surface);${ml}">${esc(initials(p.name))}</div>`;
  };

  // Gegnerspieler-Karte (einzelner Spieler)
  const oppRow=(opp,label,labelColor)=>{
    const op=pm[opp.oid]; if(!op) return '';
    return `<div style="margin-bottom:14px">
      ${blattAbschnittHtml('crossedSwords', label)}
      <div class="rrow" data-detail="${esc(op.id)}" style="padding:12px 14px">
        ${avSm(op,false)}
        <div class="rmid" style="margin-left:11px">
          <div class="rname" style="font-size:13px">${esc(op.name)}</div>
          <div class="rmeta"><span class="num">${opp.g} Begegnungen</span></div>
        </div>
        <div class="num" style="font-size:13px;font-weight:600;flex-shrink:0">
          <span style="color:var(--acid)">${opp.w}</span><span style="color:var(--faint)"> · </span><span style="color:var(--red)">${opp.g-opp.w}</span>
        </div>
      </div>
    </div>`;
  };

  // Highlight-Karte (höchster Sieg / Upset / schlimmste Niederlage)
  const highlightRow=(entry,kind)=>{
    if(!entry) return '';
    const m=entry.m;
    const onA=(m.a1===d.ids[0]&&m.a2===d.ids[1])||(m.a1===d.ids[1]&&m.a2===d.ids[0]);
    const oppIds=onA?[m.b1,m.b2]:[m.a1,m.a2];
    const o1=pm[oppIds[0]], o2=pm[oppIds[1]];
    const won=kind!=='loss';
    const meta = kind==='upset'
      ? `Erwartung ${Math.round(entry.expected*100)}\u00A0%`
      : dateStr(m.created_at);
    const labelMap={
      win:    {l:'Höchster Sieg',     ic:'explosion', col:'var(--acid)'},
      upset:  {l:'Größte Überraschung',     ic:'tornado',   col:'var(--purple)'},
      loss:   {l:'Schlimmste Niederlage', ic:'skull',     col:'var(--red)'}
    };
    const cfg=labelMap[kind];
    return `<div class="rrow" data-match="${esc(m.id)}" style="padding:11px 13px;display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--bg2);color:${cfg.col};display:grid;place-items:center;flex-shrink:0">
        <span class="ic svg-ic" style="font-size:16px">${svgI(cfg.ic)}</span>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:${cfg.col};font-weight:700;text-transform:uppercase;letter-spacing:.08em;line-height:1">${cfg.l}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px" class="num">vs ${esc((o1?o1.name:'?')+' & '+(o2?o2.name:'?'))} · ${meta}</div>
      </div>
      <div class="num" style="font-size:14px;font-weight:700;color:${won?'var(--acid)':'var(--red)'};flex-shrink:0">${entry.score}</div>
    </div>`;
  };

  // ─── KENNZAHLEN, gezeichnet [§C27] ───
  // Vier Zahlen standen in vier Kästen in vier Farben, darunter ein Balken
  // mit derselben Quote noch einmal, drei Kästen „Serien" und weiter unten
  // ein Form-Verlauf, dessen Endwert die Elo aus dem Kasten oben war. Jetzt
  // trägt jede Kennzahl ihre Zeichnung: die Siegquote jede Partie als Zelle
  // in Spielreihenfolge, die Torbilanz je Partie auf ihrer Skala, die Elo
  // ihren Verlauf, die laufende Serie ihren Lauf. Nichts steht zweimal.
  let kennzahlenHtml = '';
  if(d.games >= 1){
    // Die Elo-Bahn des Duos aus der Sim-History (live, gecached) statt aus
    // m.deltas, damit der Endwert zur Elo passt, die überall sonst steht.
    const histById = getHistoryByMatchId();
    const mById = new Map(matches.map(x => [x.id, x]));
    let trace = 0;
    const series = [0], folge = [];
    for(const mid of d.matchIdsChrono){
      const h = histById.get(mid), mm = mById.get(mid);
      const ds = h && h.deltas ? h.deltas : (mm && mm.deltas) || {};
      trace += (ds[d.ids[0]] || 0) + (ds[d.ids[1]] || 0);
      series.push(trace);
      if(mm){
        const aufA = d.ids.includes(mm.a1) && d.ids.includes(mm.a2);
        folge.push((aufA ? mm.winner === 'A' : mm.winner === 'B') ? 'j' : 'n');
      }
    }
    // Siegquote: die letzten 50 Partien als Zellen — eine Wand aus zweihundert
    // wäre keine Zeichnung mehr.
    const zellen = folge.slice(-50).map(z => `<i${z === 'j' ? ' class="j"' : ''}></i>`).join('');
    // Torbilanz je Partie auf ihrer Skala von −10 bis +10.
    const jePartie = d.games ? d.gd / d.games : 0;
    const bw = Math.min(50, Math.abs(jePartie) / 10 * 50);
    // Elo: der Verlauf als Linie.
    const W = 120, H = 26;
    const minE = Math.min(...series), maxE = Math.max(...series), range = Math.max(20, maxE - minE);
    const pfad = series.map((e, i) => (series.length > 1 ? i / (series.length - 1) * W : 0).toFixed(1)
      + ',' + (3 + (1 - (e - minE) / range) * (H - 6)).toFixed(1)).join(' ');
    // Serie: der laufende Lauf, dahinter die längsten.
    const cs = d.currentStreak;
    const serieZ = cs === 0 ? '–' : Math.abs(cs);
    const serieE = cs > 0 ? (cs === 1 ? 'Sieg in Folge' : 'Siege in Folge')
                 : cs < 0 ? (cs === -1 ? 'Niederlage in Folge' : 'Niederlagen in Folge') : 'keine Serie';
    const lauf = Math.min(12, Math.abs(cs));
    kennzahlenHtml = `<div class="duo-kz">
      <div class="duo-kz-k"><div class="duo-kz-w"><b class="${wr >= 50 ? 'auf' : 'ab'}">${wr} %</b><span>Siegquote</span></div>
        <div class="duo-kz-zellen">${zellen}</div>
        <div class="duo-kz-s num">${d.wins} ${d.wins === 1 ? 'Sieg' : 'Siege'} · ${d.losses} ${d.losses === 1 ? 'Niederlage' : 'Niederlagen'}${folge.length > 50 ? ' · die letzten 50' : ''}</div></div>
      <div class="duo-kz-k"><div class="duo-kz-w"><b class="${d.gd >= 0 ? 'auf' : 'ab'}">${gdStr}</b><span>Game-Bilanz</span></div>
        <div class="duo-kz-skala"><i class="${jePartie >= 0 ? 'auf' : 'ab'}" style="${jePartie >= 0 ? 'left:50%' : 'right:50%'};width:${bw.toFixed(1)}%"></i></div>
        <div class="duo-kz-s num">Ø ${jePartie >= 0 ? '+' : ''}${komma(jePartie, 1)} je Satz</div></div>
      <div class="duo-kz-k"><div class="duo-kz-w"><b class="${d.eloDelta >= 0 ? 'auf' : 'ab'}">${eloStr}</b><span>Elo zusammen</span></div>
        <svg class="duo-kz-linie ${d.eloDelta >= 0 ? 'auf' : 'ab'}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pfad}"/></svg>
        <div class="duo-kz-s num">aus ${d.games} ${d.games === 1 ? 'Satz' : 'Sätze'}, alle Saisons</div></div>
      <div class="duo-kz-k"><div class="duo-kz-w"><b class="${cs > 0 ? 'auf' : cs < 0 ? 'ab' : ''}">${serieZ}</b><span>${serieE}</span></div>
        ${lauf ? `<div class="aw-lauf duo-kz-lauf ${cs > 0 ? 'auf' : 'ab'}">${'<i></i>'.repeat(lauf)}</div>` : ''}
        <div class="duo-kz-s num">am längsten ${d.longestWinStreak || 0} ${d.longestWinStreak === 1 ? 'Sieg' : 'Siege'} · ${d.longestLossStreak || 0} ${d.longestLossStreak === 1 ? 'Niederlage' : 'Niederlagen'}</div></div>
    </div>`;
  }

  // ─── AUFSTELLUNG: TYPISCH + (optional) BESTE ───
  // Wenn beide Aufstellungen je ≥2× vorkamen UND die beste Quote von der
  // typischen abweicht (in teamDetail.bestLineup gesetzt), zeigen wir beide
  // Karten nebeneinander. Sonst nur die typische wie bisher.
  const POS_LABEL = {drive:'Drive · rechts', reves:'Revés · links'};
  const POS_ICON  = {drive:svgI('posDrive'), reves:svgI('posReves')};
  const POS_COLOR = {drive:'var(--orange)', reves:'var(--blue)'};
  const pA_side = d.posStats[pA.id].dom;
  const pB_side = d.posStats[pB.id].dom;
  const isSplit = d.games >= 2 && d.dominantCount === d.swapped; // 50/50

  const buildLineupCard = (label, sublabel, p0Pos, px = 58) => {
    const opos = p0Pos==='drive' ? 'reves' : 'drive';
    // Links steht der Revés, rechts der Drive — wie auf dem Platz. Der
    // farbige Ring um den Avatar ist entfallen: an seiner Stelle steht
    // das Wappen. Die Seite sagt die Zeile darüber schon zweimal, mit
    // Zeichen und Wort, und welche Karte die bessere Quote hat, steht in
    // ihrer eigenen Aufschrift.
    const buildSide = (player, pos) => {
      const avInner = `<div style="margin:0 auto 6px">${
        avHtml(player, '', {ins:true, px})}</div>`;
      return `<div style="flex:1;text-align:center;cursor:pointer" data-detail="${esc(player.id)}">
        <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:6px;color:${POS_COLOR[pos]}">
          <span class="svg-ic" style="width:11px;height:11px;display:inline-flex">${POS_ICON[pos]}</span>
          <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${POS_LABEL[pos]}</span>
        </div>
        ${avInner}
        <div style="font-size:11px;font-weight:600">${esc(player.name)}</div>
      </div>`;
    };
    return `<div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:11px 10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:9px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);font-weight:700;font-family:'Sometype Mono',monospace">${label}</div>
        <div style="font-size:9px;color:var(--ink2);font-family:'Sometype Mono',monospace;letter-spacing:.04em">${sublabel}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        ${p0Pos === 'reves' ? buildSide(pA, p0Pos) : buildSide(pB, opos)}
        <span style="color:var(--muted);font-size:10px">&amp;</span>
        ${p0Pos === 'reves' ? buildSide(pB, opos) : buildSide(pA, p0Pos)}
      </div>
    </div>`;
  };

  let lineupHtml;

  if(d.bestLineup){
    // Zwei Karten nebeneinander: TYPISCH (Mehrheits) + BESTE (höhere Quote)
    // Nebeneinander misst das Wappen 48 statt 58 px und das Raster teilt nach
    // minmax(0,1fr) [§C27]: zwei Wappen zu 58 px, das Zeichen dazwischen und
    // die Abstände sind breiter als eine halbe Zeile, und die zweite Karte
    // lief 30 px über den Rand des Blatts. Zwischen den beiden steht „&" —
    // sie spielen zusammen, „vs" stand zwischen zwei Partnern.
    // typGames/typWr aus teamDetail.bestLineup ableiten: bestLineup.p0 ist
    // die seltenere (=bessere) Pos, also die typische = die andere.
    const typGames = d.dominantCount;
    const typWr = Math.round(d.bestLineup.typicalWr * 100);
    const bestWr = Math.round(d.bestLineup.wr * 100);
    lineupHtml = `
      <div style="margin-bottom:18px">
        ${blattAbschnittHtml('users', 'Aufstellungs-Vergleich')}
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
          ${buildLineupCard('Typisch', typWr+'\u00A0% aus '+typGames, d.posStats[d.ids[0]].dom, 48)}
          ${buildLineupCard('Beste Quote', bestWr+'\u00A0% aus '+d.bestLineup.games, d.bestLineup.p0, 48)}
        </div>
      </div>`;
  } else {
    // Single-Card: bestehende Logik (typische Aufstellung)
    const renderPlayerLineup = (player, pos) => {
      const avInner = `<div style="margin:0 auto 8px">${
        avHtml(player, '', {ins:true, px:68})}</div>`;
      const posLabelStyle = isSplit ? 'color:var(--ink2)' : `color:${POS_COLOR[pos]}`;
      const posLabel = isSplit ? 'Wechselt' : POS_LABEL[pos];
      return `<div style="flex:1;text-align:center;cursor:pointer" data-detail="${esc(player.id)}">
        <div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-bottom:8px;${posLabelStyle}">
          <span class="svg-ic" style="width:13px;height:13px;display:inline-flex">${POS_ICON[pos]}</span>
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em">${posLabel}</span>
        </div>
        ${avInner}
        <div style="font-size:13px;font-weight:600">${esc(player.name)}</div>
      </div>`;
    };
    const lineupFooter = d.games >= 2 ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-family:'Sometype Mono',monospace;font-size:10.5px">
        <span style="color:var(--ink2)">In <span style="color:var(--ink);font-weight:700">${d.dominantCount} / ${d.games}</span> Sätze</span>
        <span style="color:var(--ink2)"><span style="color:var(--muted)">⇄</span> ${d.swapped}× getauscht</span>
      </div>` : '';
    lineupHtml = `
      <div style="margin-bottom:18px">
        ${blattAbschnittHtml('users', 'Typische Aufstellung')}
        <div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:14px 14px 12px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            ${d.posStats[pA.id].dom === 'reves' ? renderPlayerLineup(pA, 'reves') : renderPlayerLineup(pB, 'reves')}
            <div style="display:flex;flex-direction:column;align-items:center;color:var(--muted);font-size:11px">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/><polyline points="12,5 5,12 12,19"/></svg>
            </div>
            ${d.posStats[pA.id].dom === 'reves' ? renderPlayerLineup(pB, 'drive') : renderPlayerLineup(pA, 'drive')}
          </div>
          ${lineupFooter}
        </div>
      </div>`;
  }

  // ─── TEAM-AWARDS (Lifetime — alle Saisons) ───
  // Spiegel des Spieler-Awards-Konzepts: zeigt die Top-3-Platzierungen des
  // Duos in der saison-übergreifenden awardRankings('all')-Liste.
  // Die Zeichen kommen aus AW_IC wie überall sonst. Hier stand eine eigene
  // Tabelle, und zwei ihrer Namen gab es im Katalog nicht: „Schlechtestes
  // Team" und „Baustelle" standen im Duo-Blatt ohne Zeichen.
  // Dieselbe Kachel wie im Awards-Reiter [§C27]. Hier stand eine dritte
  // Fassung mit sechs Katalogfarben statt drei Rollen [§C25], dem Wert ohne
  // Einheit („8er", „4,00") und „#2" als Platz.
  const tAch = teamAchievements(p1Id, p2Id);
  const _tR = awardRankings('all');
  const teamAwardsHtml = tAch.length ? `
    <div style="margin-bottom:18px">
      ${blattAbschnittHtml('medal', 'Auszeichnungen als Team')}
      ${awVitrineHtml(tAch.map(a => awKachelHtml(a.key, [a.x],
        {rang:a.rank || null, mehr:0, liste:awListe(a.key, _tR), attr:`data-team-award="${esc(a.key)}"`})))}
    </div>` : '';

  // ─── LIGA-TITEL (Team of the Season) ───
  const titlesHtml = d.seasonTitles.length ? `
    <div style="margin-bottom:18px">
      ${blattAbschnittHtml('crown', 'Liga-Titel', d.seasonTitles.length + ' Titel')}
      <div class="pp-trophies" style="margin:0 -16px;padding:4px 16px">
        ${d.seasonTitles.map(t => `<div class="pp-tr team">
          <span class="ic svg-ic">${svgI('handshake')}</span>
          <div class="ti">Team of<br>the Season</div>
          <div class="su">${esc(t.label)}</div>
        </div>`).join('')}
      </div>
    </div>` : '';

  // ─── FUN FACTS ───
  // Satzbilanz, Tiebreaks, Sätze zu Null (6:0), Doppel-Bagel (ein Match mit
  // zwei davon) und das häufigste Satzergebnis — bewusst
  // kompakt, höchstens vier Karten in einer Reihe.
  let funFactsHtml = '';
  if(d.games >= 2){
    const facts = [
      { label:'Sätze', value:d.sf+':'+d.sa, color:'var(--acid)' },
    ];
    if(d.tbW + d.tbL > 0) facts.push({ label:'Tiebreaks', value:d.tbW+':'+d.tbL, color:'var(--blue)' });
    if(d.shutouts > 0) facts.push({ label:'Zu Null', value:d.shutouts+'×', color:'var(--blue)' });
    if(d.perfectWins > 0) facts.push({ label:'Doppel-Bagel', value:d.perfectWins+'×', color:'var(--gold)' });
    if(d.topScore && facts.length < 4) facts.push({ label:'Häufigster Satz', value:d.topScore, color:'var(--purple)', sub:d.topScoreCount+'×' });
    const cols = facts.length >= 4 ? 'repeat(4,1fr)' : 'repeat('+facts.length+',1fr)';
    funFactsHtml = `
      <div style="margin-bottom:18px">
        ${blattAbschnittHtml('chartBar', 'In Zahlen')}
        <div style="display:grid;grid-template-columns:${cols};gap:8px">
          ${facts.map(f => `<div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:10px 6px;text-align:center">
            <div class="num" style="font-family:'Archivo Black',sans-serif;font-size:15px;color:${f.color};line-height:1">${f.value}</div>
            <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-top:4px">${f.label}</div>
            ${f.sub?`<div style="font-size:8px;color:var(--muted);margin-top:2px;font-family:'Sometype Mono',monospace">${f.sub}</div>`:''}
          </div>`).join('')}
        </div>
      </div>`;
  }

  const highlights=[
    highlightRow(d.biggestWin,'win'),
    highlightRow(d.biggestUpset,'upset'),
    highlightRow(d.biggestLoss,'loss')
  ].filter(Boolean).join('');

  // Letzte 10 Matches (vorher 5) — slice in teamDetail bereits auf 10 erweitert
  const recentRows=d.recent.map(r=>{
    const m=r.m;
    const oppIds=r.onA?[m.b1,m.b2]:[m.a1,m.a2];
    const o1=pm[oppIds[0]], o2=pm[oppIds[1]];
    const won=r.won;
    return `<div class="rrow" data-match="${esc(m.id)}" style="padding:10px 13px;display:flex;align-items:center;gap:10px">
      <div style="width:24px;height:24px;border-radius:50%;background:${won?'rgba(228,242,74,.12)':'rgba(240,86,106,.12)'};color:${won?'var(--acid)':'var(--red)'};display:grid;place-items:center;flex-shrink:0">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          ${won?'<polyline points="4,12 10,18 20,6"/>':'<path d="M6 6L18 18M6 18L18 6"/>'}
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;line-height:1.2">vs <span style="color:var(--ink2)">${esc((o1?o1.name:'?')+' & '+(o2?o2.name:'?'))}</span></div>
        <div class="num" style="font-size:10px;color:var(--muted);margin-top:2px">${dateStr(m.created_at)}</div>
      </div>
      <div class="num" style="font-size:13px;font-weight:600;color:var(--ink);flex-shrink:0">${standFuer(m, won).replace(':', ' : ')}</div>
    </div>`;
  }).join('');

  openSheet(`
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:var(--muted);font-weight:700;font-family:'Sometype Mono',monospace">Team</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px">
        <div data-detail="${esc(pA.id)}" style="cursor:pointer">${avBig(pA)}</div>
        <div style="font-family:'Archivo Black',sans-serif;font-size:18px;color:var(--muted)">&amp;</div>
        <div data-detail="${esc(pB.id)}" style="cursor:pointer">${avBig(pB)}</div>
      </div>
      <div style="font-family:'Archivo Black',sans-serif;font-size:20px;letter-spacing:-.02em;line-height:1.1;margin-top:14px">${esc(pA.name)} &amp; ${esc(pB.name)}</div>
    </div>

    ${kennzahlenHtml}

    ${teamAwardsHtml}
    ${titlesHtml}
    ${lineupHtml}
    ${funFactsHtml}

    ${d.nemesis?oppRow(d.nemesis,'Erzgegner'):''}
    ${d.favorite?oppRow(d.favorite,'Lieblingsgegner'):''}

    ${highlights?`
    <div style="margin-bottom:18px">
      ${blattAbschnittHtml('star', 'Höhepunkte')}
      <div style="display:flex;flex-direction:column;gap:6px">${highlights}</div>
    </div>`:''}

    ${recentRows?`
    <div>
      ${blattAbschnittHtml('clock', d.recent.length === 1 ? 'Letzter Satz' : 'Letzte ' + Math.min(10,d.recent.length) + ' Sätze')}
      <div style="display:flex;flex-direction:column;gap:6px">${recentRows}</div>
    </div>`:''}
  `);

  // Innerhalb des Sheets klickbar machen
  const sheetEl=document.getElementById('sheet');
  if(sheetEl){
    sheetEl.querySelectorAll('[data-detail]').forEach(el=>{
      el.onclick=()=>{const pid=el.dataset.detail; sheetNav(()=>showPlayer(pid));};
    });
    sheetEl.querySelectorAll('[data-match]').forEach(el=>{
      el.onclick=()=>{const mid=el.dataset.match; sheetNav(()=>showMatchDetail(mid));};
    });
    // Team-Award-Chips: Klick öffnet Award-Detail-Sheet
    sheetEl.querySelectorAll('[data-team-award]').forEach(el=>{
      el.onclick=()=>{const key=el.dataset.teamAward; sheetNav(()=>{ awPeriod='all'; awSeasonId=null; showAward(key); });};
    });
  }
}

function showMatchDetail(mid){
  const m=matches.find(x=>x.id===mid);if(!m)return;
  _sheetSetReopen(()=>showMatchDetail(mid));
  // DB-First: Delta-Anzeige immer aus m.deltas (Wahrheitsquelle).
  // matchBreakdown() bleibt für Slider-Detail-Komponenten verfügbar.
  const line=(id,pos)=>{
    const d=(m.deltas||{})[id]||0;
    // Die Seite als Wort mit Zeichen, nicht als Kürzel [§6].
    return `<div class="delta-row" data-md-spieler="${esc(id)}" style="cursor:pointer"><span class="dn">${esc(pname(id))} <span class="chip ${pos}">${svgI(pos==='drive'?'posDrive':'posReves')}${SEITE_NAME[pos]||''}</span></span><span class="delta-v ${d>=0?'pos':'neg'}">${d>=0?'+':''}${Math.round(d)}</span></div>`;
  };
  // Auszeichnungen durch dieses Match
  const earned=badgesEarnedInMatch(mid);
  const earnedHtml=earned.length?`
    <div class="mini-label" style="margin-top:14px">Auszeichnungen in diesem Satz</div>
    <div style="display:flex;flex-direction:column;gap:5px">
      ${(()=>{
        // Eine Zeile je Spieler, nicht je Auszeichnung: fünf Marken zweier
        // Spieler standen als fünf Karten untereinander, und derselbe Name
        // dreimal. Die Farbe je Marke sagt weiter die Klasse (legendär Gold,
        // selten Violett, gewöhnlich Grün, negativ Rot).
        const jeSpieler = new Map();
        earned.forEach(e => { if(!jeSpieler.has(e.playerId)) jeSpieler.set(e.playerId, []);
          jeSpieler.get(e.playerId).push(e.badge); });
        return [...jeSpieler].map(([pid, bs]) => `<div class="rrow" style="padding:10px 13px;cursor:default;align-items:flex-start">
          <div class="rmid"><div class="rname" style="font-size:13px">${esc(pname(pid))}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:5px">${bs.map(b => {
              const color = (RARITY_META[rarityOf(b.id)]||{}).color || 'var(--ink2)';
              return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:${color}">`
                + `<span class="svg-ic" style="display:inline-flex">${badgeIc(b,'14px')}</span>${esc(b.name)}</span>`;
            }).join('')}</div></div>
        </div>`).join('');
      })()}
    </div>`:''
  ;
  // „Team A gewinnt" sagte, was das Band darunter ohnehin zeigt, und nannte
  // niemanden. Die Siegchance vor der Partie steht dagegen sonst nirgends
  // im Blatt, ohne dass man die Elo-Analyse aufklappt.
  const sieger = m.winner==='A' ? [m.a1,m.a2] : [m.b1,m.b2];
  // Dieselbe Quelle wie die Karte der Partie im Feed: die Erwartung aus der
  // Elo-Bahn, erst dahinter der gespeicherte Wert. Mit `m.exp_a` allein
  // stand hier 50 %, auf der Karte derselben Partie 57 %.
  const _h = getHistoryByMatchId().get(mid);
  const _expA = _h && _h.expA != null ? _h.expA : (typeof m.exp_a === 'number' ? m.exp_a : null);
  const chance = _expA == null ? null
    : Math.max(1, Math.round((m.winner==='A' ? _expA : 1 - _expA) * 100));
  // Kopf und Bühne wie in jedem Blatt einer Partie [§C27]: die Sieger hell,
  // die Verlierer leiser, der Stand in der Mitte. Vorher stand der Stand als
  // Überschrift und darunter zwei graue Kästen „Team A" und „Team B".
  // Gehört der Satz zu einer Begegnung über mehrere Sätze [§1.3], sagt der
  // Kopf, der wievielte er ist und wie die Partie ausging.
  const _bg = begegnungVon(m);
  const _bgZeile = _bg.n > 1 ? (() => {
    const z = _bg.zeilen[_bg.zeilen.length - 1], b = begegnungAm(z);
    const w = b.winner ? (b.winner === 'A' ? [z.a1, z.a2] : [z.b1, z.b2]).map(pname).join(' & ') : '';
    return `Satz ${_bg.nr} von ${_bg.n} im Match` + (w ? ` · ${w} ${Math.max(b.setsA, b.setsB)}:${Math.min(b.setsA, b.setsB)}` : '');
  })() : '';
  openSheet(`${blattKopfHtml({ic:'padelBall', titel:'Satz', unter:dateStr(m.created_at) + (_bgZeile ? ' · ' + _bgZeile : '')})}
    ${buehneHtml(m, {zeile: sieger.map(pname).join(' und ') + ' gewinnen'
      + (chance != null ? ' · Siegchance vorher ' + chance + ' %' : '')})}
    <div class="preview" style="margin-top:16px"><div class="delta-list">
      ${line(m.a1,m.a1_side)}${line(m.a2,m.a2_side)}<div class="delta-div"></div>${line(m.b1,m.b1_side)}${line(m.b2,m.b2_side)}
    </div></div>
    <button class="btn ghost sm" id="showBreakdownBtn" style="margin-top:10px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:6px">${svgI('chartBar')} Elo-Analyse anzeigen</button>
    <div id="breakdownSlot"></div>
    ${earnedHtml}
    <div class="blatt-fuss">
      <button type="button" class="btn gefahr" id="delThisMatch">${svgI('trash')}Löschen</button>
      <button type="button" class="btn" id="editThisMatch">${svgI('edit')}Bearbeiten</button>
    </div>`);
  // Breakdown-Button
    document.getElementById('showBreakdownBtn').onclick=()=>{
    const bd=matchBreakdown(mid);
    const slot=document.getElementById('breakdownSlot');
    if(!bd||!Object.keys(bd).length){slot.innerHTML='<p style="font-size:12px;color:var(--muted);text-align:center">Keine Daten verfügbar</p>';return;}
    // DB-First-Werte (was tatsächlich in der DB steht & oben angezeigt wird).
    // Die Aufschlüsselungs-Faktoren stammen aus simulateEloWithSliders und können
    // abweichen, wenn Slider oder Code-Logik seit dem Match geändert wurden.
    const histById=getHistoryByMatchId();
    const hist=histById.get(mid);
    const dbDeltas=(hist&&hist.deltas)||{};
    const dbBefore=(hist&&hist.eloBefore)||{};
    const dbAfter=(hist&&hist.eloAfter)||{};
    const ids=[m.a1,m.a2,m.b1,m.b2];
    // Divergenz erkennen: weicht die Slider-Summe relevant von der DB ab?
    const anyDiverged=ids.some(id=>{
      const b=bd[id]; if(!b||dbDeltas[id]===undefined)return false;
      return Math.abs(dbDeltas[id]-b.finalDelta)>=1;
    });
    const rows=ids.map(id=>{
      const b=bd[id]; if(!b)return '';
      // Elo-Analyse zeigt exakte Werte mit 2 Nachkommastellen — keine Rundung wie überall sonst.
      const sign=v=>v>=0 ? '+'+komma(v,2) : komma(v,2);
      // Die große Zahl ist die genaue Rechnung, die Summe der Zeilen darunter.
      // Verbucht wird in ganzen Elo; das zeigt die Zeile „40 → 55" darunter,
      // und die Analyse ist dazu da, zu zeigen, was vor dem Runden steht. Eine
      // Zeile „Rundung" glich die große Zahl an den verbuchten Wert an —
      // „+15,00" über „Rundung −0,12" — und versteckte damit die Rechnung.
      const hasDb=dbDeltas[id]!==undefined;
      const headerDelta=b.finalDelta;
      // Saison-Elo: bei DB-Werten sind das gespeicherte Integer (deshalb keine zusätzliche
      // Präzision möglich). Bei Sim-Fallback geben wir 1 Nachkommastelle aus.
      const fmtElo=v=>Number.isInteger(v)?String(v):komma(v,1);
      const seasonBefore=fmtElo(hasDb?dbBefore[id]:b.startElo);
      const seasonAfter=fmtElo(hasDb?dbAfter[id]:b.endElo);
      const simDelta=b.finalDelta;
      const rowDiverged=hasDb&&Math.abs(dbDeltas[id]-simDelta)>=1;
      // Ausgeblendet wird nur, was als 0,00 dastünde. Mit einer Schwelle von
      // 0,1 fehlten kleine Posten, und die Zeilen ergaben die Summe nicht.
      const zeigt=v=>Math.abs(v)>=0.005;
      // Die Posten EINES Satzes. Jeder Satz ist eine eigene Rechnung
      // [§3.6]; bei mehreren steht je Satz ein Kopf mit Stand und Elo und
      // darunter seine Posten, und die Summe oben ist ihre Summe.
      const faktorZeilen=b=>{
      const factors=[];
      factors.push({label:'Basis (Erwartung)',val:b.rawBase,desc:(b.won?'Sieg'+(b.expected<0.5?' gegen stärkeres Team':''):'Niederlage'+(b.expected>0.5?' gegen schwächeres Team':''))
        +(b.gewicht&&Math.abs(b.gewicht-1)>=0.02?' · '+(b.gewicht<1?'kurzer':'langer')+' Satz '+komma(b.gewicht*100,0)+' %':'')});
      if(zeigt(b.movEffect)) factors.push({label:'Deutlichkeit',val:b.movEffect,desc:b.won?'Deutlicher Sieg':'Deutliche Niederlage'+(b.movMult<1.2?' (gedämpft)':'')});
      if(zeigt(b.winBoostEffect)) factors.push({label:'Mehr für Siege',val:b.winBoostEffect,desc:'+'+komma(((b.winBoost-1)*100),1)+'\u00A0% für Siege'});
      if(b.expProtect<1) factors.push({label:'Schutz für Erfahrene',val:b.expProtectEffect,desc:komma(((1-b.expProtect)*100),1)+'\u00A0% Schutz'});
      if(b.lowEloDamp!==undefined && zeigt(b.lowEloEffect||0)){
        factors.push({label:'Schutz für Schwächere',val:b.lowEloEffect,desc:komma(((1-b.lowEloDamp)*100),1)+'\u00A0% weniger Verlust'});
      }
      if(zeigt(b.tbEffect||0)) factors.push({label:'Ausgleich im Tiebreak',val:b.tbEffect,
        desc:komma((1-b.tbDamp)*100,0)+' % weniger Verlust, Satz über sechs'});
      if(zeigt(b.rawBase*b.movMult*b.winBoost*b.expProtect*(b.underdogMult-1))){
        // Underdog-Boost setzt sich aus zwei unabhängig clampten Komponenten zusammen
        // (Elo-Gap + Spiele-Gap). Wir zeigen nur die wirksamen (positiven) Anteile,
        // weil negative Differenzen keinen Effekt mehr haben.
        const eloPart   = b.underdogEloDiff>0   ? b.underdogEloDiff+' Elo schwächer'   : null;
        const gamesPart = b.underdogGamesDiff>0 ? b.underdogGamesDiff+' Sätze weniger' : null;
        const desc = [eloPart, gamesPart].filter(Boolean).join(' · ') || 'Außenseiter';
        // Effekt ohne lowElo-Anteil: rawBase*mov*boost*expProtect*(underdogMult-1)
        const undEffect = b.rawBase*b.movMult*b.winBoost*b.expProtect*(b.underdogMult-1);
        factors.push({label:'Außenseiter-Zuschlag',val:undEffect, desc});
      }
      if(zeigt(b.riskEffect)) factors.push({label:b.riskShare<1?'Last im Team (stärker)':'Last im Team (schwächer)',val:b.riskEffect,desc:'Stärkeverteilung im Team'});
      // Schwach oder stark sagt der Faktor, nicht der Multiplikator: nach
      // einer Niederlage auf der schwachen Seite ist der kleiner als
      // eins, und dort stand „Starke Seite". Dahinter steht, was der
      // Faktor tut, in Prozent wie beim Sieg-Boost: ohne die Zahl war nicht
      // zu sehen, warum 0,49 bei einem und 2,48 beim anderen stand [§C44].
      if(zeigt(b.posEffect)){
        const schwach=b.posFactor>1, pz=komma(Math.abs(b.posFactor-1)*100,1)+'\u00A0% ';
        factors.push({label:'Ausgleich der Seite',val:b.posEffect,
          desc:(schwach?'Schwache':'Starke')+' Seite · '+pz+(schwach?(b.won?'Bonus':'Schutz'):(b.won?'Dämpfer':'Abzug'))});
      }
      factors.push({label:'Zuschlag je Satz',val:b.matchBonus,desc:'fest +'+komma(b.matchBonus,2)}); 
      // Zurückgegeben, nicht nur gebaut: als die Posten je Satz in eine eigene
      // Funktion zogen, blieb die Zuweisung stehen, und unter jedem Spieler
      // stand „undefined" statt der Rechnung.
      return factors.map(f=>`<div class="ea-posten" style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:11px">
        <div><span style="color:var(--ink)">${f.label}</span> <span style="color:var(--muted);font-size:10px">${f.desc}</span></div>
        <span class="ea-wert" style="font-family:'Sometype Mono',monospace;font-weight:700;color:${f.val>=0?'var(--acid)':'var(--red)'}">${sign(f.val)}</span>
      </div>`).join('');
      };
      const aufA=id===m.a1||id===m.a2;
      const factorRows=b.saetze&&b.saetze.length>1
        ? b.saetze.map(x=>{
            const st=x.satz?(aufA?x.satz[0]+':'+x.satz[1]:x.satz[1]+':'+x.satz[0]):'';
            return `<div class="ea-satz" style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:700;color:var(--ink2);margin-top:8px;padding-top:6px;border-top:1px dashed var(--line)">
              <span>Satz ${x.satzNr}${st?' · '+st:''}</span>
              <span style="font-family:'Sometype Mono',monospace;color:${x.finalDelta>=0?'var(--acid)':'var(--red)'}">${sign(x.finalDelta)}</span>
            </div>${faktorZeilen(x)}`;
          }).join('')
        : faktorZeilen(b);
      // Gespeichert ist das Delta vom Tag der Partie; die Faktoren rechnen mit
      // den Einstellungen von heute. Stehen sie mehr als eine Elo auseinander,
      // sagt die Zeile, was damals verbucht wurde.
      const divergeNote=rowDiverged?`<div class="ea-heute" style="font-size:10px;color:var(--gold);margin-top:6px;padding-top:6px;border-top:1px dashed var(--line);font-family:'Sometype Mono',monospace">Verbucht wurden ${dbDeltas[id]>=0?'+':''}${dbDeltas[id]} mit den Einstellungen vom Tag des Satzes</div>`:'';
      return `<div class="ea-spieler" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px;margin-top:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-weight:700;font-size:13px">${esc(pname(id))}</span>
          <span class="ea-summe" data-elo="${headerDelta}" style="font-family:'Archivo Black',sans-serif;font-size:15px;color:${headerDelta>=0?'var(--acid)':'var(--red)'}">${sign(headerDelta)}</span>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between">
            <span>${seasonBefore} → ${seasonAfter}</span>
            <span>K=${komma(b.kFactor,1)} · Erw. ${komma((b.expected*100),1)}\u00A0%</span>
          </div>
        </div>
        ${factorRows}
        ${divergeNote}
      </div>`;
    }).join('');
    const banner=anyDiverged?`<div style="background:rgba(247,207,74,.08);border:1px solid rgba(247,207,74,.3);border-radius:10px;padding:10px 12px;margin-top:10px;font-size:11.5px;color:var(--gold);line-height:1.5">
      Verbucht wurde, was am Tag des Satzes galt; die Zeilen darunter rechnen mit den heutigen Einstellungen. <b>Alle Sätze neu berechnen</b> in den Einstellungen bringt beides zusammen.
    </div>`:'';
    slot.innerHTML=`<div class="mini-label" style="margin-top:14px">Elo-Analyse</div>${banner}${rows}`;
    document.getElementById('showBreakdownBtn').style.display='none';
  };

  document.getElementById('editThisMatch').onclick=()=>showEditMatch(mid);
  document.getElementById('delThisMatch').onclick=async()=>{
    // Die Frage nennt, was verloren geht: diese Partie und alles, was aus
    // ihr gerechnet wurde.
    const ja = await bestaetigen({ic:'trash', gefahr:true, ja:'Löschen', nein:'Behalten',
      titel:'Satz löschen?',
      text:`${pname(m.a1)} & ${pname(m.a2)} gegen ${pname(m.b1)} & ${pname(m.b2)}, ${m.games_a}:${m.games_b} vom ${dateStr(m.created_at)}. Elo, Serien und Rekorde werden danach neu gerechnet.`});
    if(!ja) return;
    closeSheet(true);
    await partieLoeschen(mid);
  };
  // Die vier Namen führen ins Profil: das Blatt zeigte je Spieler die Elo
  // dieser Partie, und von dort ging es nur zum Duo weiter, nicht zu ihm.
  document.querySelectorAll('#sheet [data-md-spieler]').forEach(el=>{
    el.onclick=()=>sheetNav(()=>showPlayer(el.dataset.mdSpieler));
  });
  // Team-Chips → Team-Profil
  document.querySelectorAll('[data-team]').forEach(el=>{
    el.onclick=()=>{
      const [a,b]=el.dataset.team.split('|');
      if(!a||!b) return;
      sheetNav(()=>showTeam(a,b));
    };
  });
}

// Eine Partie löschen und die Liga neu rechnen. Eine Stelle für das Blatt
// der Partie und für „Rückgängig" nach dem Speichern [§C27] — zwei Kopien
// hätten irgendwann verschiedene Töpfe geleert.
// Gezeigt wird die Liga ohne die Partie, sobald die Datenbank sie gelöscht
// hat; die Deltas, die sich dadurch ändern, schreibt die Kette danach
// [§3.1c]. Vorher stand „Lösche & berechne neu…" sechs Sekunden da, und ein
// Fehler beim Löschen fiel nicht auf: die Liga wurde trotzdem ohne die
// Partie neu gerechnet, die in der Datenbank noch stand.
// ── Alte Zeilen mit mehreren Sätzen aufteilen [§1.3] ─────────────────
// Bis jede Zeile ein Satz war, trug eine Zeile die ganze Partie. Die
// Neuberechnung teilt solche Zeilen: der erste Satz bleibt, jeder weitere
// wird eine Zeile direkt dahinter (zehn Millisekunden auseinander, damit
// nichts dazwischen rutscht). Zurück kommen die neuen Zeilen; die Deltas
// rechnet die Neuberechnung danach.
async function partienAufteilen(){
  const neu = [];
  for(const m of matches.slice()){
    const saetze = partieSaetze(m).filter(s => saetzeAuswerten([s]).winner);
    if(saetze.length < 2) continue;
    const spieler = {a1:m.a1, a1_side:m.a1_side, a2:m.a2, a2_side:m.a2_side,
      b1:m.b1, b1_side:m.b1_side, b2:m.b2, b2_side:m.b2_side};
    const erste = partieFelder(saetze.slice(0, 1));
    const weitere = saetze.slice(1).map((s, i) => ({...spieler, ...partieFelder([s]), deltas:{}, exp_a:0.5,
      created_at:new Date(mts(m) + (i + 1) * 10).toISOString()}));
    const u = await sb.from('matches').update(erste).eq('id', m.id);
    if(u.error) throw u.error;
    const ins = await sb.from('matches').insert(weitere).select();
    if(ins.error) throw ins.error;
    matches = matches.map(x => x.id === m.id ? {...x, ...erste} : x).concat(ins.data || []);
    neu.push(...(ins.data || []));
  }
  if(neu.length) invalidateCache(LADEN_TOEPFE);
  return neu;
}
// Eine Partie oder mehrere: „Rückgängig" nach dem Speichern nimmt alle
// Sätze eines Eintrags zurück, die je eine Zeile sind [§1.3].
async function partieLoeschen(mids){
  const ids = Array.isArray(mids) ? mids : [mids];
  toast('Lösche…');
  const {error} = await sb.from('matches').delete().in('id', ids);
  if(error){ toast('Nicht gelöscht', 'err', {sub:'Die Verbindung zur Datenbank ist fehlgeschlagen.'}); return; }
  const weg = matches.filter(x => ids.includes(x.id));
  const r = ligaNeuRechnen(matches.filter(x => !ids.includes(x.id)));
  neuZeichnen();
  toast('Gelöscht', 'ok');
  // Der Monat der Partie ändert sich auch, wenn keine andere Delta es tut.
  imHintergrund(() => rechnungSchreiben(r, [...new Set(weg.map(x => seasonOf(x.created_at).id))]), true);
  loadAll();
}
