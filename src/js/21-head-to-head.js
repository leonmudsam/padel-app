// ╔═══ §9.2 ─── HEAD-TO-HEAD PROFIL SHEET ──────────────────────────────╗
//     Vergleich zweier Spieler in direkten Begegnungen.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Zwei-Spieler-Bilanz: zusammen (als Teamkollegen) UND gegen (als Gegner).
// Aus Sicht von Spieler A; tauscht man die Reihenfolge der Args, dreht sich
// die Gegner-Perspektive um. Konsistent zum showTeam-Sheet-Design.
function showH2H(idA, idB){
  const pm = pmap();
  const pA = pm[idA], pB = pm[idB];
  if(!pA || !pB) return;
  _sheetSetReopen(()=>showH2H(idA, idB));
  if(idA === idB) return;

  const d = h2hDetail(idA, idB);

  // Avatar-Helper (konsistent mit showTeam)
  const avBig = (p) => {
    const em = p.avatar_id ? avatarEmoji(p.avatar_id) : null;
    if(em) return `<div style="width:60px;height:60px;border-radius:50%;background:var(--surface3);display:grid;place-items:center;font-size:28px;border:2px solid var(--line2)">${em}</div>`;
    return `<div style="width:60px;height:60px;border-radius:50%;background:${avColor(p.id)};display:grid;place-items:center;font-size:20px;font-family:'Archivo Black',sans-serif;color:#080b10;border:2px solid var(--line2)">${esc(initials(p.name))}</div>`;
  };

  // Empty state — beide Spieler kennen sich, aber keine gemeinsamen Matches
  if(d.total === 0){
    openSheet(`
      <div style="text-align:center;margin-bottom:18px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:var(--muted);font-weight:700;font-family:'Sometype Mono',monospace">Direkter Vergleich</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px">
          <div data-detail="${esc(pA.id)}" style="cursor:pointer">${avBig(pA)}</div>
          <span class="svg-ic" style="color:var(--muted);width:18px;height:18px">${svgI('crossedSwords')}</span>
          <div data-detail="${esc(pB.id)}" style="cursor:pointer">${avBig(pB)}</div>
        </div>
        <div style="font-family:'Archivo Black',sans-serif;font-size:18px;letter-spacing:-.02em;line-height:1.1;margin-top:12px">${esc(pA.name)} <span style="color:var(--muted);font-size:14px">vs</span> ${esc(pB.name)}</div>
      </div>
      ${emptyState('crossedSwords','Noch keine gemeinsamen Sätze')}
    `);
    return;
  }

  const teamWr  = d.asTeam.g ? Math.round(d.asTeam.w / d.asTeam.g * 100) : 0;
  const oppWr   = d.asOppForA.g ? Math.round(d.asOppForA.w / d.asOppForA.g * 100) : 0;
  const teamGdRaw  = d.asTeam.gf - d.asTeam.ga;
  const oppGdRaw   = d.asOppForA.gf - d.asOppForA.ga;
  const teamGd  = (teamGdRaw>=0?'+':'') + teamGdRaw;
  const oppGd   = (oppGdRaw>=0?'+':'') + oppGdRaw;
  const teamElo = Math.round(d.asTeam.eloDelta);
  const oppElo  = Math.round(d.asOppForA.eloDelta);
  const teamEloStr = (teamElo>=0?'+':'') + teamElo;
  const oppEloStr  = (oppElo>=0?'+':'') + oppElo;
  const teamEloCol = teamElo>=0 ? 'var(--acid)' : 'var(--red)';
  const oppEloCol  = oppElo>=0  ? 'var(--acid)' : 'var(--red)';

  // ─── ALS-TEAM BLOCK ───
  const teamBlock = d.asTeam.g ? `
    <div style="background:var(--surface);border:1px solid rgba(86,180,232,.22);border-radius:14px;padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span class="svg-ic" style="color:var(--blue);width:16px;height:16px">${svgI('handshake')}</span>
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--blue);font-weight:700;font-family:'Sometype Mono',monospace">Als Team</span>
        <span style="margin-left:auto;font-size:11px;color:var(--muted);font-family:'Sometype Mono',monospace">${d.asTeam.g} ${d.asTeam.g === 1 ? 'Satz' : 'Sätze'}</span>
      </div>
      <div style="display:flex;height:7px;border-radius:99px;overflow:hidden;background:var(--line);margin-bottom:6px">
        <div style="width:${teamWr}%;background:var(--acid)"></div>
        <div style="width:${100-teamWr}%;background:var(--red);opacity:.85"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-family:'Sometype Mono',monospace;margin-bottom:11px">
        <span style="color:var(--acid);font-weight:700">${d.asTeam.w} ${d.asTeam.w === 1 ? 'Sieg' : 'Siege'}</span>
        <span style="font-weight:700">${teamWr}\u00A0%</span>
        <span style="color:var(--red);font-weight:700">${d.asTeam.g-d.asTeam.w} ${d.asTeam.g-d.asTeam.w === 1 ? 'Niederlage' : 'Niederlagen'}</span>
      </div>
      <div style="display:flex;gap:7px">
        <div style="flex:1;background:var(--bg2);border-radius:9px;padding:8px;text-align:center">
          <div class="num" style="font-family:'Archivo Black',sans-serif;font-size:14px;line-height:1">${teamGd}</div>
          <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-top:3px">Game-Bilanz</div>
        </div>
        <div style="flex:1;background:var(--bg2);border-radius:9px;padding:8px;text-align:center">
          <div class="num" style="font-family:'Archivo Black',sans-serif;font-size:14px;line-height:1;color:${teamEloCol}">${teamEloStr}</div>
          <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-top:3px">Elo zusammen</div>
        </div>
        <button data-team="${esc(paarKey(idA, idB))}" style="flex:1.2;background:rgba(86,180,232,.1);border:1px solid rgba(86,180,232,.3);border-radius:9px;padding:8px;color:var(--blue);font-family:'Sometype Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
          Zum Duo
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>` : '';

  // ─── ALS-GEGNER BLOCK (aus Sicht idA) ───
  const oppBlock = d.asOppForA.g ? `
    <div style="background:var(--surface);border:1px solid rgba(167,139,250,.22);border-radius:14px;padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span class="svg-ic" style="color:var(--purple);width:16px;height:16px">${svgI('crossedSwords')}</span>
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--purple);font-weight:700;font-family:'Sometype Mono',monospace">Als Gegner</span>
        <span style="margin-left:auto;font-size:11px;color:var(--muted);font-family:'Sometype Mono',monospace">${d.asOppForA.g} ${d.asOppForA.g === 1 ? 'Satz' : 'Sätze'}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-family:'Sometype Mono',monospace">
        <span style="color:var(--ink)">${esc(pA.name)}</span> vs <span style="color:var(--ink)">${esc(pB.name)}</span>
      </div>
      <div style="display:flex;height:7px;border-radius:99px;overflow:hidden;background:var(--line);margin-bottom:6px">
        <div style="width:${oppWr}%;background:var(--acid)"></div>
        <div style="width:${100-oppWr}%;background:var(--red);opacity:.85"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-family:'Sometype Mono',monospace;margin-bottom:11px">
        <span style="color:var(--acid);font-weight:700">${d.asOppForA.w}× gewonnen</span>
        <span style="font-weight:700">${oppWr}\u00A0%</span>
        <span style="color:var(--red);font-weight:700">${d.asOppForA.g-d.asOppForA.w}× verloren</span>
      </div>
      <div style="display:flex;gap:7px">
        <div style="flex:1;background:var(--bg2);border-radius:9px;padding:8px;text-align:center">
          <div class="num" style="font-family:'Archivo Black',sans-serif;font-size:14px;line-height:1">${oppGd}</div>
          <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-top:3px">Game-Bilanz</div>
        </div>
        <div style="flex:1;background:var(--bg2);border-radius:9px;padding:8px;text-align:center">
          <div class="num" style="font-family:'Archivo Black',sans-serif;font-size:14px;line-height:1;color:${oppEloCol}">${oppEloStr}</div>
          <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-top:3px">Elo (für ${esc(pA.name.split(' ')[0])})</div>
        </div>
      </div>
    </div>` : '';

  // ─── LETZTE BEGEGNUNGEN ───
  const lastRows = d.lastEncounters.map(enc => {
    const m = enc.m;
    const won = enc.wonForA;
    const isTeam = enc.type === 'team';
    const score = standFuer(m, won);
    const typeChip = isTeam
      ? `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(86,180,232,.12);color:var(--blue);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:2px 6px;border-radius:6px;font-family:'Sometype Mono',monospace">Team</span>`
      : `<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(167,139,250,.12);color:var(--purple);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:2px 6px;border-radius:6px;font-family:'Sometype Mono',monospace">Gegner</span>`;
    return `<div class="rrow" data-match="${esc(m.id)}" style="padding:10px 12px;display:flex;align-items:center;gap:10px">
      <div style="width:24px;height:24px;border-radius:50%;background:${won?'rgba(228,242,74,.12)':'rgba(240,86,106,.12)'};color:${won?'var(--acid)':'var(--red)'};display:grid;place-items:center;flex-shrink:0">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          ${won?'<polyline points="4,12 10,18 20,6"/>':'<path d="M6 6L18 18M6 18L18 6"/>'}
        </svg>
      </div>
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:7px">
        ${typeChip}
        <span class="num" style="font-size:10px;color:var(--muted)">${dateStr(m.created_at)}</span>
      </div>
      <div class="num" style="font-size:13px;font-weight:600;color:var(--ink);flex-shrink:0">${score}</div>
    </div>`;
  }).join('');

  const lastBlock = d.lastEncounters.length ? `
    <div style="margin-bottom:14px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);font-weight:700;margin-bottom:8px;font-family:'Sometype Mono',monospace">Letzte Begegnungen</div>
      <div class="rlist">${lastRows}</div>
    </div>` : '';

  openSheet(`
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.2em;color:var(--muted);font-weight:700;font-family:'Sometype Mono',monospace">Direkter Vergleich</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px">
        <div data-detail="${esc(pA.id)}" style="cursor:pointer">${avBig(pA)}</div>
        <span class="svg-ic" style="color:var(--muted);width:18px;height:18px">${svgI('crossedSwords')}</span>
        <div data-detail="${esc(pB.id)}" style="cursor:pointer">${avBig(pB)}</div>
      </div>
      <div style="font-family:'Archivo Black',sans-serif;font-size:18px;letter-spacing:-.02em;line-height:1.1;margin-top:12px">${esc(pA.name)} <span style="color:var(--muted);font-size:14px">vs</span> ${esc(pB.name)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:5px;font-family:'Sometype Mono',monospace">${d.total} ${d.total===1?'gemeinsame Begegnung':'gemeinsame Begegnungen'}</div>
    </div>

    ${teamBlock}
    ${oppBlock}
    ${h2hBegegnungenHtml(idA, idB)}
    ${lastBlock}
  `);

  // Sheet-Handler — analog zu showTeam
  const sheetEl = document.getElementById('sheet');
  if(sheetEl){
    sheetEl.querySelectorAll('[data-detail]').forEach(el=>{
      el.onclick=()=>{const pid=el.dataset.detail; sheetNav(()=>showPlayer(pid));};
    });
    sheetEl.querySelectorAll('[data-team]').forEach(el=>{
      el.onclick=()=>{const [a,b]=el.dataset.team.split('|'); if(a&&b){sheetNav(()=>showTeam(a,b));}};
    });
    sheetEl.querySelectorAll('[data-match]').forEach(el=>{
      el.onclick=()=>{const mid=el.dataset.match; sheetNav(()=>showMatchDetail(mid));};
    });
  }
}


// ── Jede Begegnung als Balken [§C27] ─────────────────────────────────
// Die Bilanz gegeneinander war zwei Zahlen und eine Liste der letzten
// Spiele. Ob einer früher klar vorn lag und der andere aufgeholt hat, sah
// man nicht. Jede Begegnung als Gegner steht als Balken, nach oben für A,
// nach unten für B, so hoch wie das Ergebnis deutlich war, in der
// Reihenfolge, in der gespielt wurde. Höchstens die letzten vierzig: bei
// hundertzehn Begegnungen wäre ein Balken schmaler als ein Pixel. Die
// Namen stehen über und unter der Zeichnung und brechen um.
function h2hBegegnungenHtml(a, b){
  const alle = matchesOfPlayer(a, matches).filter(m => [m.a1, m.a2, m.b1, m.b2].includes(b)
    && ((m.a1 === a || m.a2 === a) !== (m.a1 === b || m.a2 === b)));
  if(alle.length < 2) return '';
  const ms = alle.slice(-40);
  const W = 320, H = 110, mitte = 55, n = ms.length;
  const bw = Math.min(14, (W - 16) / n - 2);
  const sieg = m => (m.a1 === a || m.a2 === a) ? m.winner === 'A' : m.winner === 'B';
  const balken = ms.map((m, i) => {
    const w = sieg(m), h = 8 + Math.max(0, partie(m).gameAnteil - .5) * 84;
    const x = 8 + i * (W - 16) / n;
    return `<rect class="${w ? 'w' : 'l'}" style="--i:${i}" x="${x.toFixed(1)}" y="${(w ? mitte - h : mitte).toFixed(1)}" width="${Math.max(1, bw).toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`;
  }).join('');
  const aw = ms.filter(sieg).length;
  return `<div class="h2h-bg">${rcpAbschnitt(alle.length > n ? 'Die letzten ' + n + ' Begegnungen' : 'Jede Begegnung',
      alle.length > n ? alle.length + ' insgesamt' : '')}
    <div class="h2h-bg-n"><span>${esc(pname(a))}</span><b class="num">${aw}</b></div>
    <svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="h2h-bg-0" x1="0" x2="${W}" y1="${mitte}" y2="${mitte}"/>${balken}</svg>
    <div class="h2h-bg-n re"><span>${esc(pname(b))}</span><b class="num">${n - aw}</b></div></div>`;
}
