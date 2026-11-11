// ╔═══ §5.3c ─── TOP-5-LISTEN FÜR STATISTIK-KARTEN (v9.16) ─────────────╗
//     Statistik-/Superlativ-Karten (Team of the Season, Peak-Elo, Bestes
//     Team, Größter Upset …) öffneten bisher direkt das Spieler- bzw.
//     Team-Profil des Siegers. Damit war nicht zu sehen, WER knapp dahinter
//     liegt. Jetzt öffnen sie erst die Rangliste dahinter (Top 5); ein Tap auf
//     eine Zeile führt weiter ins Profil, es geht also keine Navigation
//     verloren. Die Ranking-Helper unten sind bewusst geteilt: vRanking nimmt
//     [0] für die Karte, das Sheet nimmt die ersten 5 — eine Wahrheit,
//     keine doppelte Berechnung.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Teams eines Match-Sets nach gemeinsamem Elo-Zuwachs. minGames filtert
// Zufalls-Duos (Saison-Karte: min. 2 gemeinsame Spiele).
function _teamEloRanking(ms, minGames){
  const T={};
  ms.forEach(m=>{
    [[m.a1,m.a2,m.winner==='A'],[m.b1,m.b2,m.winner==='B']].forEach(([x,y,won])=>{
      const ids=[x,y].sort(), k=ids.join('|');
      if(!T[k]) T[k]={ids, g:0, w:0, elo:0};
      T[k].g++; if(won) T[k].w++;
      T[k].elo += ((m.deltas||{})[x]||0) + ((m.deltas||{})[y]||0);
    });
  });
  return Object.values(T).filter(t=>t.g>=(minGames||1)).sort((a,b)=>b.elo-a.elo||b.g-a.g);
}
// Team of the Season: Elo-Zuwachs aus der Sim (konsistent zur Tabelle),
// Spielzahlen aus den Saison-Matches. Absteigend sortiert.
function _seasonTeamRanking(seasonMs, sid){
  const gsim=getGlobalSim();
  const map=gsim.seasonTeamElo[sid||currentSeason().id]||{};
  const counts={};
  teamStatsFromMatches(seasonMs).forEach(t=>{ counts[paarKey(t.ids[0], t.ids[1])]=t; });
  return Object.entries(map).map(([k,elo])=>{
    const c=counts[k];
    return c ? {ids:k.split('|'), elo, g:c.g, w:c.w} : null;
  }).filter(t=>t && t.g>=2).sort((a,b)=>b.elo-a.elo||b.g-a.g);
}
// Upsets eines Match-Sets: niedrigste Siegerwartung des Siegers zuerst.
function _upsetRanking(ms){
  return ms.map(m=>{
    const expA=m.exp_a??0.5;
    const we=m.winner==='A'?expA:(1-expA);
    return {m, winPct:Math.round(we*100), sp:1-we};
  }).sort((a,b)=>b.sp-a.sp);
}

// Generisches Top-N-Sheet. rows: [{ids:[pid…]|null, matchId?, name, val, detail?}]
// ids mit 1 Element → Spieler-Zeile, 2 Elemente → Team-Zeile, matchId → Match.
function showTopList(c){
  if(!c) return;
  _sheetSetReopen(()=>showTopList(c));
  const rows=(c.rows||[]).slice(0, c.limit||5);
  const items=rows.map((r,i)=>{
    const ids=r.ids||[];
    const isTeam=ids.length===2;
    const av=isTeam?awLiPair(ids[0],ids[1]):(ids.length?awLiAv(ids[0]):'');
    const hook=r.matchId ? `data-li-match="${esc(r.matchId)}"`
      : isTeam ? `data-li-team="${esc(ids.slice().sort().join('|'))}"`
      : ids.length ? `data-li-player="${esc(ids[0])}"` : '';
    return `<div class="aw-li${i===0?' top':''}" ${hook}>
      <div class="aw-li-rank">${i+1}.</div>
      ${av}
      <div class="aw-li-info">
        <div class="aw-li-name">${esc(r.name)}</div>
        ${r.detail?`<div class="aw-li-detail">${esc(r.detail)}</div>`:''}
      </div>
      <div class="aw-li-val">${esc(r.val)}</div>
    </div>`;
  }).join('');
  openSheet(`
    ${blattKopfHtml({ic:c.ic || 'trophy', ton:c.cls === 'blue' ? 'blau' : c.cls === 'red' ? 'rot' : 'gold',
      titel:c.title || '', unter:c.sub || ''})}
    ${items?`${blattAbschnittHtml('medal', c.listLabel || ('Top ' + rows.length))}
      <div class="aw-list">${items}</div>`
     :`<div class="leerstand" style="margin-top:24px">Noch keine Daten</div>`}
    ${c.why?`${blattAbschnittHtml('info', 'So wird gewertet')}<div class="blatt-text">${esc(c.why)}</div>`:''}`);
  // Zeilen weiterverlinken — gleiche Ziele wie vorher die Karte selbst.
  document.querySelectorAll('.aw-li[data-li-player]').forEach(el=>{
    el.onclick=()=>{ sheetNav(()=>showPlayer(el.dataset.liPlayer)); };
  });
  document.querySelectorAll('.aw-li[data-li-team]').forEach(el=>{
    el.onclick=()=>{ const [a,b]=el.dataset.liTeam.split('|'); sheetNav(()=>showTeam(a,b)); };
  });
  document.querySelectorAll('.aw-li[data-li-match]').forEach(el=>{
    el.onclick=()=>{ sheetNav(()=>showMatchDetail(el.dataset.liMatch)); };
  });
}

// Baut das passende Top-5-Sheet für eine Statistik-Karte (data-toplist="<kind>").
// Berechnet erst beim Klick — die Views tragen nur das Attribut.
// Erreichbar sind genau die Sorten, die als data-toplist im Markup stehen.
// Fünf weitere Blätter (Peak-Elo, Saison-Titel, Meiste Siege, Beste
// Siegquote, Team of the Season) hingen hier ohne jeden Aufrufer — die
// Karten, die sie einmal geöffnet haben, gibt es nicht mehr.
function openTopList(kind){
  const teamRow=t=>({ids:t.ids, name:t.ids.map(pname).join(' & '),
    val:(t.elo>=0?'+':'')+Math.round(t.elo)+' Elo', detail:t.w+'/'+t.g+' Siege'});
  if(kind==='periodTeam'){
    return showTopList({title:'Bestes Team', sub:periodLabel(period),
      ic:AW_IC.mvt, cls:'blue', rows:_teamEloRanking(matchesInPeriod(period),1).filter(t=>t.elo>0).map(teamRow),
      why:'Das Duo mit dem höchsten gemeinsamen Elo-Zuwachs in diesem Zeitraum.'});
  }
  if(kind==='periodStreak'){
    return showTopList({title:AWARD_META.streaks.title, sub:periodLabel(period),
      ic:AW_IC.streaks, cls:'acid',
      rows:longestStreaks(matchesInPeriod(period)).map(s=>({ids:[s.id], name:pname(s.id), val:s.v+'×', detail:'Siege in Folge'})),
      why:'Die längste Siegesserie innerhalb dieses Zeitraums, ab 2 Siegen in Folge.'});
  }
  if(kind==='periodUpset'){
    return showTopList({title:'Größte Überraschung', sub:periodLabel(period),
      ic:AW_IC.upset, cls:'blue',
      rows:_upsetRanking(matchesInPeriod(period)).map(u=>{
        const w=u.m.winner==='A'?[u.m.a1,u.m.a2]:[u.m.b1,u.m.b2];
        return {ids:w, matchId:u.m.id, name:w.map(pname).join(' & '),
          val:u.winPct+'\u00A0%', detail:standFuer(u.m)+' · '+dateStr(u.m.created_at)};
      }),
      why:'Der Sieg mit der niedrigsten Siegchance vor dem Satz.'});
  }
  if(kind==='periodKing'){
    const isWeek=period==='week';
    const list=(getCachedAwardRankings('all')[isWeek?'weekKingList':'dayKingList'])||[];
    return showTopList({title:isWeek?'Wochenkönig':'Tageskönig', sub:'Alle Saisons',
      ic:isWeek?'weekKing':'dayKing', cls:'gold',
      rows:list.map(k=>({ids:[k.id], name:pname(k.id), val:Math.round(k.q*100)+' %',
        detail:`${k.v} von ${k.n} ${isWeek?'Wochen':'Spieltagen'}`+(k.gilt?'':` · ab ${isWeek?KOENIG_MIN.woche:KOENIG_MIN.tag}`)})),
      why:isWeek
        ? `Der Anteil der eigenen abgeschlossenen Wochen, die ein Spieler als Bester beendet hat (mit mindestens 5 Siegen), ab ${KOENIG_MIN.woche} Wochen.`
        : `Der Anteil der eigenen Spieltage, die ein Spieler als Bester beendet hat (mit mindestens 3 Siegen), ab ${KOENIG_MIN.tag} Spieltagen.`});
  }
}

function showAward(key){
  const R=awardRankings(awPeriod); const pl=awPeriodLabel(); const meta=AWARD_META[key]; if(!meta)return;
  _sheetSetReopen(()=>showAward(key));
  const tn=ids=>ids.map(pname).join(' & ');

  // ── NEUE TEAM-AWARDS v4 ──
  // favoritenschreck verhält sich wie ein Match-Award (zeigt ein konkretes Spiel),
  // gewinner/verlierer sind aber TEAMS — daher haben wir ein eigenes Layout unten.
  // rivalry ist ein 4-Spieler-Award mit Sonderlayout (Team A vs Team B).
  const MATCH_AWARDS = new Set(['upset','biggest']);
  const RIVALRY_AWARDS = new Set(['rivalry']);
  const FAVS_AWARDS = new Set(['favoritenschreck']);

  let bodyHtml='', fuss='', arrTop=null, topGleich=0;

  if(MATCH_AWARDS.has(key)){
    const arr = key==='upset' ? R.upsets : R.biggest;
    if(arr&&arr.length){
      const top = arr[0];
      const m = top.m;
      const winnerSide = m.winner;
      // Die Partie als Bühne [§C27] — dieselbe wie im Blatt der Partie.
      const zeile = key === 'biggest'
        ? dateStr(m.created_at) + ' · ' + top.diff + ' Games Unterschied'
        : dateStr(m.created_at) + ' · Siegchance ' + Math.round((1 - top.sp) * 100) + ' %';
      bodyHtml = buehneHtml(m, {zeile});
      fuss = blattFussHtml([
        {label:'Zum Satz', ic:'clock', prim:true, attr:`data-li-match="${esc(m.id)}"`},
        {label:'Zum Duo', ic:'users', attr:`data-li-team="${esc(_awSieger(top).slice().sort().join('|'))}"`}]);
    } else {
      bodyHtml = `<div class="leerstand" style="margin-top:24px">Keine Daten</div>`;
    }
  } else if(FAVS_AWARDS.has(key)){
    // Favoritenschreck: Match-Detail aus dem Top-Eintrag der Liste rendern.
    // Wie biggest/upset zeigen wir das konkrete Spiel mit Score + Teams. Zusätzlich
    // wird die überwundene Team-Elo-Differenz oben prominent dargestellt.
    const arr = R.favoritenschreckList;
    if(arr && arr.length){
      const top = arr[0];
      const m = top.m;
      bodyHtml = buehneHtml(m, {zeile: dateStr(m.created_at) + ' · ' + top.v + ' Elo überwunden'});
      fuss = blattFussHtml([
        {label:'Zum Satz', ic:'clock', prim:true, attr:`data-li-match="${esc(m.id)}"`},
        {label:'Zum Duo', ic:'users', attr:`data-li-team="${esc(top.ids.slice().sort().join('|'))}"`}]);
      // Weitere Plätze als kompakte Liste — andere Teams mit ihren best-Coups
      if(arr.length > 1){
        const rest = arr.slice(1, 7);
        const items = rest.map((e, idx) => {
          const teamName = pname(e.ids[0]) + ' & ' + pname(e.ids[1]);
          return `<div class="aw-li" data-li-team="${esc(e.ids.slice().sort().join('|'))}">
            <div class="aw-li-rank">${idx+2}.</div>
            ${awLiPair(e.ids[0], e.ids[1])}
            <div class="aw-li-info"><div class="aw-li-name">${esc(teamName)}</div></div>
            <div class="aw-li-val">${e.v} Elo</div>
          </div>`;
        }).join('');
        bodyHtml += `${blattAbschnittHtml('medal', 'Weitere Coups')}<div class="aw-list">${items}</div>`;
      }
    } else {
      bodyHtml = `<div class="leerstand" style="margin-top:24px">Keine Daten</div>`;
    }
  } else if(RIVALRY_AWARDS.has(key)){
    // Erzfeinde: Team-Paar mit zwei Bilanz-Boxen (Team A | Team B) + Game-Verhältnis.
    const arr = R.rivalryList;
    if(arr && arr.length){
      const top = arr[0];
      const teamAName = pname(top.idsA[0]) + ' & ' + pname(top.idsA[1]);
      const teamBName = pname(top.idsB[0]) + ' & ' + pname(top.idsB[1]);
      // Zwei Duos auf der Bühne [§C27]; in der Mitte stehen die Siege
      // gegeneinander, und „führt" steht über dem, der vorn liegt.
      bodyHtml = buehneHtml({a1:top.idsA[0], a2:top.idsA[1], b1:top.idsB[0], b2:top.idsB[1],
          games_a:top.wA, games_b:top.wB, winner: top.wA > top.wB ? 'A' : top.wB > top.wA ? 'B' : ''},
        {marke:'Führt', gleich: top.wA === top.wB,
         zeile: Math.round(top.pct*100) + ' % als Gegner · ' + top.g + ' Duelle · ' + top.gfA + ':' + top.gfB + ' Games'});
      // Weitere Rivalitäten
      if(arr.length > 1){
        const rest = arr.slice(1, 7);
        // Der Platz zählt, wer eine höhere Quote hat: gleichauf mit der
        // Spitze heißt Platz 1, nicht 2., 3. und 4. — das Profil und der
        // Award-Sammler zählen diese Rivalitäten längst als geteilte Spitze.
        const q = x => Math.round(x.pct*1000);
        const items = rest.map((e, idx) => {
          const platz = arr.filter(x => q(x) > q(e)).length + 1;
          const aN = pname(e.idsA[0]) + ' & ' + pname(e.idsA[1]);
          const bN = pname(e.idsB[0]) + ' & ' + pname(e.idsB[1]);
          return `<div class="aw-li">
            <div class="aw-li-rank">${platz}.</div>
            <div class="aw-li-info" style="min-width:0">
              <div class="aw-li-name" style="font-size:12px">${esc(aN)}</div>
              <div class="aw-li-name" style="font-size:9.5px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-top:2px">vs ${esc(bN)}</div>
            </div>
            <div class="aw-li-val">${Math.round(e.pct*100)}\u00A0% · ${e.g}×</div>
          </div>`;
        }).join('');
        bodyHtml += `${blattAbschnittHtml('medal', 'Weitere Rivalitäten')}<div class="aw-list">${items}</div>`;
      }
    } else {
      bodyHtml = `<div class="leerstand" style="margin-top:24px">Keine Daten</div>`;
    }
  } else {
    // Liste, Sortierung, Zahl, Einheit und Stichprobe kommen aus AW_WERT
    // [§5.3d] — dieselbe Zeile, aus der Kachel, Profil und Duo-Blatt lesen.
    // Hier stand eine eigene Kopie aller neununddreißig Formate, und sie
    // sagte zu derselben Serie „8er Serie", während die Kachel „8er" trug.
    const arr = awListe(key, R).map(x => {
      const t = awText(key, x);
      return {x, ids:awIds(key, x), name:awIds(key, x).map(pname).join(' & '),
        z:t.z, e:t.e, val:t.e ? t.z+' '+t.e : t.z, detail:t.b, sort:AW_WERT[key].s(x)};
    });

    // Hero (#1) + Liste der weiteren Plätze
    if(!arr.length){
      bodyHtml = `<div class="leerstand" style="margin-top:24px">Keine Daten</div>`;
    } else {
      const isTeamAward = arr[0].ids.length === 2;
      const isNeg = awNeg(key);
      // Der Held trägt die Farbe seiner Rolle [§C25] — Gold, Blau für ein
      // Duo, Rot für die Kehrseite —, nicht einen der sechs Katalogtöne.
      const heroRgb = isNeg ? '240,86,106' : isTeamAward ? '86,180,232' : '247,207,74';

      // ─── Hero (#1) – alle bei sort=arr[0].sort sind geteilte #1 ───
      const topGroup = arr.filter(x => x.sort === arr[0].sort);
      const isShared = topGroup.length > 1;
      const top = arr[0];
      arrTop = top; topGleich = topGroup.length;
      // Wert (für Hero – alle teilen denselben Wert)
      const heroVal = `<b>${esc(top.z)}</b>${top.e ? ' '+esc(top.e) : ''}`;

      let heroHtml;
      if(!isShared){
        // ─── Single Hero (#1) ───
        const heroClick = isTeamAward
          ? `data-li-team="${esc(top.ids.slice().sort().join('|'))}"`
          : `data-li-player="${esc(top.ids[0])}"`;
        const heroAv = isTeamAward ? awHeroPair(top.ids[0], top.ids[1]) : awHeroAv(top.ids[0], isNeg);
        const heroMarker = isNeg
          ? `<div class="aw-winner-marker"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.skull}</svg></div>`
          : `<div class="aw-winner-crown">${svgI('crown')}</div>`;
        const heroBadge = isNeg
          ? `<span class="aw-winner-badge">Schandfleck · #1</span>`
          : `<span class="aw-winner-badge"><svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/></svg> Spitze · #1</span>`;

        heroHtml = `
          <div class="aw-winner ${isNeg?'shame':''}" style="--c:${heroRgb}" ${heroClick}>
            ${heroBadge}
            <div class="aw-winner-av-wrap">
              ${heroMarker}
              ${heroAv}
            </div>
            <div class="aw-winner-name">${esc(top.name)}</div>
            <div class="aw-winner-val">${heroVal}</div>
          </div>`;
      } else {
        // ─── Shared Hero: mehrere Spieler/Teams teilen sich #1 ───
        const sharedBadge = isNeg
          ? `<span class="aw-winner-badge">Geteilt · #1 · ${topGroup.length} ${isTeamAward?'Teams':'Sünder'}</span>`
          : `<span class="aw-winner-badge"><svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/></svg> Geteilt · #1 · ${topGroup.length} ${isTeamAward?'Teams':'Spieler'}</span>`;
        const sharedMarker = isNeg
          ? `<div class="aw-winner-shared-marker shame"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.skull}</svg></div>`
          : `<div class="aw-winner-shared-marker">${svgI('crown')}</div>`;
        const entries = topGroup.map(e => {
          const av = isTeamAward
            ? `<div class="aw-winner-tied-pair">${awLiAv(e.ids[0],false,true)}${awLiAv(e.ids[1],false,true)}</div>`
            : awLiAv(e.ids[0], false, isNeg);
          const click = isTeamAward
            ? `data-li-team="${esc(e.ids.slice().sort().join('|'))}"`
            : `data-li-player="${esc(e.ids[0])}"`;
          return `<div class="aw-winner-tied-entry" ${click}>
            ${av}
            <div class="aw-winner-tied-name">${esc(e.name)}</div>
          </div>`;
        }).join('');

        heroHtml = `
          <div class="aw-winner shared ${isNeg?'shame':''}" style="--c:${heroRgb}">
            ${sharedBadge}
            ${sharedMarker}
            <div class="aw-winner-shared-grid">${entries}</div>
            <div class="aw-winner-val">${heroVal}</div>
          </div>`;
      }

      // ─── Liste (Plätze ab nach allen #1-Geteilten) ───
      // Olympische Ränge: Position des ersten Eintrags mit gleichem sort + 1
      const rankOf = (i) => {
        for(let j=0; j<=i; j++) if(arr[j].sort === arr[i].sort) return j+1;
        return i+1;
      };
      const MAX_LIST = 6;
      const byRank = {};
      const orderRanks = [];
      // Bei geteiltem #1 starten wir die Liste hinter allen geteilten Plätzen
      const listStart = topGroup.length;
      for(let i=listStart; i<arr.length; i++){
        const rk = rankOf(i);
        if(!byRank[rk]){ byRank[rk] = []; orderRanks.push(rk); }
        byRank[rk].push(arr[i]);
        if(Object.values(byRank).reduce((a,b)=>a+b.length,0) >= MAX_LIST) break;
      }

      const listItems = [];
      const shameCls = isNeg ? 'shame' : '';
      for(const rk of orderRanks){
        const entries = byRank[rk];
        if(entries.length === 1){
          const e = entries[0];
          const avHtml = isTeamAward ? awLiPair(e.ids[0],e.ids[1]) : awLiAv(e.ids[0], false, isNeg);
          const clickAttr = isTeamAward
            ? `data-li-team="${esc(e.ids.slice().sort().join('|'))}"`
            : `data-li-player="${esc(e.ids[0])}"`;
          listItems.push(`
            <div class="aw-li ${shameCls}" ${clickAttr}>
              <div class="aw-li-rank">${rk}.</div>
              ${avHtml}
              <div class="aw-li-info">
                <div class="aw-li-name">${esc(e.name)}</div>
                ${e.detail ? `<div class="aw-li-detail">${esc(e.detail)}</div>` : ''}
              </div>
              <div class="aw-li-val">${esc(e.z)}</div>
            </div>
          `);
        } else {
          const tiedRows = entries.map(e => {
            const avHtml = isTeamAward ? awLiPair(e.ids[0],e.ids[1],true) : awLiAv(e.ids[0], true, isNeg);
            const clickAttr = isTeamAward
              ? `data-li-team="${esc(e.ids.slice().sort().join('|'))}"`
              : `data-li-player="${esc(e.ids[0])}"`;
            return `
              <div class="aw-li-tied-row" ${clickAttr}>
                ${avHtml}
                <div class="aw-li-info">
                  <div class="aw-li-name">${esc(e.name)}</div>
                </div>
              </div>`;
          }).join('');
          listItems.push(`
            <div class="aw-li tied ${shameCls}">
              <div class="aw-li-rank">${rk}.</div>
              <div class="aw-li-tied-stack">
                ${tiedRows}
                <span class="aw-li-tie-badge">Geteilt · ${entries.length} ${isTeamAward?'Teams':'Spieler'}</span>
              </div>
              <div class="aw-li-val">${esc(entries[0].z)}</div>
            </div>`);
        }
      }

      // Der Beleg [§C27]: woraus der Wert besteht, wo er im Feld liegt und
      // wie knapp der Abstand zum Nächsten ist — aus derselben Liste.
      const w = AW_WERT[key];
      const zweitE = arr.find(e => e.sort !== top.sort) || null;
      const zA = zweitE ? belegAnteil(zweitE.detail) : null;
      const belegAw = belegHtml({
        ev: top.z + ' ' + (top.detail || ''),
        feld: w.f ? arr.map(e => ({v:w.f(e.x), t:e.z, er:e.sort === top.sort})) : null,
        dahinter: zweitE ? `Dahinter: <b>${esc(zweitE.name)}</b> mit ${esc(zweitE.z)}.` : '',
        zweiter: zA && _belegIstQuote(zweitE.z + ' ' + zweitE.detail, zA) ? {name:zweitE.name, q:zA.k / zA.n} : null
      });
      const listLabel = isNeg ? 'Weitere Sünder' : 'Weitere Plätze';
      bodyHtml = heroHtml + belegAw + (listItems.length
        ? `${blattAbschnittHtml('medal', listLabel)}<div class="aw-list">${listItems.join('')}</div>`
        : '');
    }
  }

  // Kopf, Beleg, Liste, Regel, Weg weiter — in jedem Blatt dieselbe
  // Reihenfolge [§C27]. Der Ton ist die Rolle [§C25], nicht einer von sechs
  // Katalogtönen: der leuchtende Kreis trug Orange, Violett und Acid.
  const kopfIds = (awTop(key, R)[0] ? awIds(key, awTop(key, R)[0]) : []);
  const kopfTon = awNeg(key) ? 'rot' : kopfIds.length >= 2 ? 'blau' : 'gold';
  if(!fuss && arrTop && arrTop.ids.length && topGleich === 1)
    fuss = blattFussHtml([arrTop.ids.length === 2
      ? {label:'Zum Duo', ic:'users', prim:true, attr:`data-li-team="${esc(arrTop.ids.slice().sort().join('|'))}"`}
      : {label:'Zum Profil', ic:'user', prim:true, attr:`data-li-player="${esc(arrTop.ids[0])}"`}]);
  openSheet(`
    ${blattKopfHtml({ic:AW_IC[key] || 'trophy', ton:kopfTon, titel:meta.title, unter:pl + ' · Award'})}
    ${bodyHtml}
    ${blattAbschnittHtml('info', 'So wird gewertet')}
    <div class="blatt-text">${meta.why}</div>
    ${fuss}`);

  // Die Bühne und der Fuß führen, wohin sie zeigen: eine Seite ins Duo, der
  // Knopf in die Partie, das Profil oder das Duo.
  document.querySelectorAll('#sheet .buehne-s[data-team], #sheet .blatt-fuss [data-li-team]').forEach(el=>{
    el.onclick=()=>{ const [a,b]=(el.dataset.team||el.dataset.liTeam).split('|'); if(a&&b) sheetNav(()=>showTeam(a,b)); };
  });
  document.querySelectorAll('#sheet .blatt-fuss [data-li-player]').forEach(el=>{
    el.onclick=()=>{ sheetNav(()=>showPlayer(el.dataset.liPlayer)); };
  });
  document.querySelectorAll('#sheet .blatt-fuss [data-li-match]').forEach(el=>{
    el.onclick=()=>{ sheetNav(()=>showMatchDetail(el.dataset.liMatch)); };
  });
  // Listen-Einträge klickbar
  document.querySelectorAll('.aw-li[data-li-player], .aw-li-tied-row[data-li-player], .aw-winner[data-li-player], .aw-winner-tied-entry[data-li-player]').forEach(el=>{
    el.style.cursor='pointer';
    el.onclick=()=>{ const pid=el.dataset.liPlayer; sheetNav(()=>showPlayer(pid)); };
  });
  document.querySelectorAll('.aw-li[data-li-team], .aw-li-tied-row[data-li-team], .aw-winner[data-li-team], .aw-winner-tied-entry[data-li-team]').forEach(el=>{
    el.style.cursor='pointer';
    el.onclick=(ev)=>{ ev.stopPropagation(); const [a,b]=el.dataset.liTeam.split('|'); sheetNav(()=>showTeam(a,b)); };
  });
}



