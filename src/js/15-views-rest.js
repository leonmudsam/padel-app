// ╔═══ §5.4 ─── VIEW: TEAMS ────────────────────────────────────────────╗
//     Team-Tab mit Team-Statistiken und Top-Teams.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Ab wie vielen gemeinsamen Partien ein Duo in der Liste steht. Beim
// Tischkicker waren es vier; ein Padel-Duo kommt im Monat im Mittel auf
// zwei bis drei, und mit vier stünde die Liste die ersten Wochen leer.
const DUO_MIN = 3;
function vTeams(nurErgebnis=false){
  // Ein Duo mit einem Ruheständler spielt nie wieder [§C40]: es steht nicht
  // in der Liste der aktiven Liga, sondern am Ende in einer Zeile, die
  // aufklappt. Ein Duo mit einem ausgeblendeten Spieler steht nirgends.
  const T0=teamStats().filter(t=>t.g>=DUO_MIN);
  const T=T0.filter(t=>t.ids.every(id=>ligaAktiv(id)));
  const ruheT=T0.filter(t=>t.ids.every(id=>sichtbar(id))&&t.ids.some(id=>imRuhestand(id)));
  if(!T.length&&!ruheT.length){
    // „Noch nicht genug Daten" sagte nicht, wie viel genug ist und was dann
    // kommt.
    const html=vorschauHtml('handshake','Die Duos der Liga',
      `Ein Duo steht hier ab <b>${DUO_MIN} gemeinsamen Partien</b>. Die Liste zeigt, welche Paare zusammen am meisten gewinnen, und lässt sich nach Siegquote, Game-Bilanz und Elo sortieren.`,
      [
        ['duo','Das Duo im Detail','Getippt öffnet sich die gemeinsame Bilanz: Sätze, Games, Tiebreaks und welche Aufstellung, wer rechts und wer links, besser funktioniert.'],
        ['crossedSwords','Direkter Vergleich','Aus jedem Profil heraus lassen sich zwei Spieler gegeneinander stellen, mit jeder Begegnung.'],
      ]);
    return nurErgebnis?{kopf:`Ab ${DUO_MIN} gemeinsamen Partien`,html,ruhe:''}:`<div class="view-head"><h2>Teams</h2><p>Ab ${DUO_MIN} gemeinsamen Partien</p></div>${html}`;
  }
  const showBest=teamView!=='worst';
  
  // ═══ SORTIERUNG BASIEREND AUF teamSort VARIABLE ═══
  const ordnen=T=>{
  let sorted;
  if(teamSort==='wr'){
    // Standard: nach Siegquote
    sorted=[...T].sort((a,b)=>(b.w/b.g)-(a.w/a.g)||(b.gf-b.ga)-(a.gf-a.ga)||b.g-a.g);
  } else if(teamSort==='gd'){
    // Nach Torbilanz je Partie, wie in Gesamt: als Summe stand vorn, wer
    // am häufigsten zusammen gespielt hatte.
    sorted=[...T].sort((a,b)=>(b.gf-b.ga)/b.g-(a.gf-a.ga)/a.g||(b.w/b.g)-(a.w/a.g)||b.g-a.g);
  } else if(teamSort==='elo'){
    // Nach gesamtem Elo-Zuwachs (über alle Saisons hinweg)
    const gSim=getGlobalSim();
    sorted=[...T].sort((a,b)=>{
      const keyA=paarKey(a.ids[0], a.ids[1]);
      const keyB=paarKey(b.ids[0], b.ids[1]);
      const eloA=gSim.teamElo[keyA]||0;
      const eloB=gSim.teamElo[keyB]||0;
      return eloB-eloA || (b.w/b.g)-(a.w/a.g) || (b.gf-b.ga)-(a.gf-a.ga);
    });
  }
 else {
    // Fallback
    sorted=[...T].sort((a,b)=>(b.w/b.g)-(a.w/a.g)||(b.gf-b.ga)-(a.gf-a.ga)||b.g-a.g);
  }
  
  return sorted;
  };
  const sorted=ordnen(T);
  const arr=showBest?sorted:[...sorted].reverse();


  // Top-3 Akzente (Gold/Silber/Bronze) — Border + Rang-Kachel-Hintergrund
  // Dieselben drei Metalle wie in der Rangliste [§C26]: Gold, Silber, Bronze.
  // Platz 3 trug vorher Orange — das gehört jetzt allein der Siegesserie.
  const TOP=[
    {border:'rgba(247,207,74,.45)', bg:'#f7cf4a', fg:'#1d1700'},
    {border:'rgba(194,201,208,.38)',bg:'#C2C9D0', fg:'#1a1f1c'},
    {border:'rgba(192,132,87,.36)', bg:'#C08457', fg:'#241205'}
  ];

  const pm=pmap();
  const avPair=(idA,idB)=>{
    const a=pm[idA], b=pm[idB];
    const one=(p,offset)=>{
      if(!p) return `<div style="width:32px;height:32px;border-radius:50%;background:var(--surface3);border:2px solid var(--surface);${offset?'margin-left:-9px':''}"></div>`;
      const em=p.avatar_id?avatarEmoji(p.avatar_id):null;
      if(em) return `<div style="width:32px;height:32px;border-radius:50%;background:var(--surface3);display:grid;place-items:center;font-size:15px;border:2px solid var(--surface);${offset?'margin-left:-9px':''}">${em}</div>`;
      return `<div style="width:32px;height:32px;border-radius:50%;background:${avColor(p.id)};display:grid;place-items:center;font-size:11px;font-family:'Archivo Black',sans-serif;color:#080b10;border:2px solid var(--surface);${offset?'margin-left:-9px':''}">${esc(initials(p.name))}</div>`;
    };
    return `<div style="display:flex;align-items:center;flex-shrink:0">${one(a,false)}${one(b,true)}</div>`;
  };

  const gSim=getGlobalSim();

  // Dezente Team-/Spieler-Suche: filtert das aktuelle (sortierte) Feld nach
  // Spielername ODER kombiniertem Team-Namen. Beim Suchen keine Top-3-Medaillen.
  const _tq = (teamSearch||'').trim().toLowerCase();
  // Tokenisierte Suche: „&" und Leerzeichen trennen die Terme, Reihenfolge egal.
  // Dadurch findet „Leon & Martin", „Martin & Leon", „Leon Martin" und „Martin Leon"
  // dasselbe Duo. Jeder Term muss auf mind. einen der beiden Spielernamen passen.
  const _tqTokens = _tq.split(/[\s&]+/).filter(Boolean);
  const filtern = list => _tqTokens.length
    ? list.filter(t => {
        const names = t.ids.map(id => ((pm[id]&&pm[id].name)||'').toLowerCase());
        return _tqTokens.every(tok => names.some(nm => nm.includes(tok)));
      })
    : list;
  const arrF = filtern(arr);

  // `ohneRang` für die Duos mit Karriereende: kein Platz, kein Metall.
  const zeile=(t,i,ohneRang)=>{
    const wr=Math.round(t.w/t.g*100);
    const gd=t.gf-t.ga;
    const keyTeam=paarKey(t.ids[0], t.ids[1]);
    
    // ═══ DYNAMISCHE HAUPTMETRIK BASIEREND AUF teamSort ═══
    // Grün und Rot heißen Richtung [§C25]: Game-Bilanz und Elo-Zuwachs haben
    // eine, eine Siegrate hat keine. Die trägt deshalb Tinte — und Gold, wenn
    // sie dem ersten Platz gehört (weiter unten über TOP[]).
    let mainValue, mainColor;
    if(teamSort==='wr'){
      mainValue=wr+'\u00A0%';
      mainColor='var(--ink)';
    } else if(teamSort==='gd'){
      // Der Schnitt steht rechts, die Summe bleibt in der Zeile darunter.
      mainValue=AW_WERT.plusMinus.z({v:gd/t.g});
      mainColor=gd>=0?'var(--acid)':'var(--red)';
    } else if(teamSort==='elo'){
      const eloGainTotal=Math.round(gSim.teamElo[keyTeam]||0);
      mainValue=(eloGainTotal>=0?'+':'')+eloGainTotal;
      mainColor=eloGainTotal>=0?'var(--acid)':'var(--red)';
    }

    
    const isTop=showBest&&i<3&&!_tq&&!ohneRang;
    const top=isTop?TOP[i]:null;
    const borderColor=top?top.border:'var(--line)';
    const rankBlock=ohneRang?'':top
      ? `<div style="width:24px;height:24px;border-radius:8px;background:${top.bg};color:${top.fg};display:grid;place-items:center;font-family:'Archivo Black',sans-serif;font-size:12px;flex-shrink:0">${i+1}</div>`
      : `<div style="width:24px;text-align:center;font-family:'Archivo Black',sans-serif;font-size:14px;color:var(--faint);flex-shrink:0">${i+1}</div>`;
    
    // Die Bilanz als Balken: Siege links in Grün, Niederlagen rechts in Rot
    // [§C25]. Die Zeile nannte „26–4" als Zahl, und ob ein Duo knapp oder
    // klar vorn liegt, musste man ausrechnen — die Ranglistenzeile der
    // Spieler zeigt dasselbe seit jeher als Balken [§C27].
    return `<div class="rrow tm-row${top ? ' tm-top' : ''}" data-team="${esc(t.ids.join('|'))}" style="--tm-rand:${borderColor}">
      <div class="tm-zeile">
        ${rankBlock}
        ${avPair(t.ids[0],t.ids[1])}
        <div class="tm-mitte">
          <div class="tm-name">${esc(t.ids.map(pname).join(' & '))}</div>
          <div class="tm-bil num">${t.w}–${t.g-t.w} · ${gd>=0?'+':''}${gd} Games</div>
          <div class="tm-bar"><i style="width:${(t.w/t.g*100).toFixed(1)}%"></i></div>
        </div>
        <div class="tm-wert" style="color:${i===0&&isTop&&teamSort==='wr'?'var(--gold)':mainColor}">${mainValue}</div>
      </div>
    </div>`;
  };
  const rows=arrF.map((t,i)=>zeile(t,i,false)).join('');
  // Dieselbe Ordnung und dieselbe Suche wie die Liste darüber.
  const ruheF=filtern(showBest?ordnen(ruheT):[...ordnen(ruheT)].reverse());
  const ruhe=ruheF.length?`<div class="rlist">${ruheF.map((t,i)=>zeile(t,i,true)).join('')}</div>`:'';


  const ergebnis={kopf:`${arrF.length} Duo${arrF.length===1?'':'s'}${_tq?' gefunden':` ab ${DUO_MIN} gemeinsamen Partien, über alle Saisons`}`,
    html:arrF.length ? `<div class="rlist">${rows}</div>` : emptyState('search','Keine Teams gefunden'),
    ruhe, ruheZahl:ruheF.length};
  // Die Suche zeichnet nur die Ergebnisse. Keine zweite Filter-/Sortierformel
  // und kein Ersetzen des Eingabefelds samt Fokus, Cursor oder IME-Komposition.
  if(nurErgebnis) return ergebnis;
  return `
    <div class="view-head"><h2>Teams</h2><p id="teamCount">${ergebnis.kopf}</p></div>
    ${einblickHtml('netz', `ab ${DUO_MIN} Partien`)}
    <div class="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
      </svg>
      <input type="text" id="teamSearch" placeholder="Spieler oder Team suchen…" value="${esc(teamSearch)}">
    </div>
    <div class="ui-switch">
      <button data-teamtoggle="best" class="${showBest?'on':''}">${svgI('trendUp')}Beste</button>
      <button data-teamtoggle="worst" class="${!showBest?'on':''}">${svgI('trendDown')}Schlechteste</button>
    </div>
    <div class="ui-tabs">
      <button data-teamsort="wr" class="${teamSort==='wr'?'on':''}">Siegquote</button>
      <button data-teamsort="gd" class="${teamSort==='gd'?'on':''}">Game-Bilanz</button>
      <button data-teamsort="elo" class="${teamSort==='elo'?'on':''}">Elo-Zuwachs</button>
    </div>
    <div id="teamResults">${ergebnis.html}</div>
    ${ruheT.length ? `<div class="ruhe-ende">${einblickHtml('ruhe_teams', ruheT.length === 1 ? 'ein Duo' : ruheT.length + ' Duos')}</div>` : ''}`;
}


// ╔═══ §5.5 ─── VIEW: HISTORY (Match-Liste mit Filter) ─────────────────╗
//     Filterbar nach Spieler. Zeigt Badge-Chips pro Match.
// ╚═════════════════════════════════════════════════════════════════════════╝
function vHistory(){
  if(!matches.length)return `<div class="view-head"><h2>Verlauf</h2><p>Jede Partie, die neueste zuerst</p></div>${vorschauHtml('verlauf','Der Verlauf',
    'Jede eingetragene Partie steht hier mit Sätzen, Aufstellung und Elo-Wirkung, filterbar nach Spieler.',
    [
      ['edit','Korrigieren','Getippt öffnet sich die Partie. Ein falsches Ergebnis lässt sich dort bearbeiten oder löschen, und die Liga rechnet sich neu.'],
      ['medal','Was eine Partie auslöst','Unter jeder Partie stehen die Auszeichnungen, die sie gebracht hat.'],
    ])}`;
  let list=[...matches].reverse();
  if(histFilter!=='all')
    list=list.filter(m=>[m.a1,m.a2,m.b1,m.b2].includes(histFilter));
  
  // ═══ PAGINIERUNGSLOGIK ═══
  const ITEMS_PER_PAGE = 20; // Anzahl der Matches pro Seite
  const currentPage = _histPage; // Nutze die globale Variable
  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
  const paginatedList = list.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  
  const opts=`<option value="all">Alle Spieler</option>`+
    [...players].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${p.id}" ${histFilter===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
  
  // ── Die Partie im Verlauf [§C27] ─────────────────────────────────
  // Beide Teams standen weiß und fett nebeneinander, der Stand grau in der
  // Mitte: wer gewonnen hat, sah man erst an den Zahlen darunter. Die Regel
  // `.mteam .won` suchte ein Kind und traf nie — die Klasse sitzt an
  // `.mteam` selbst. Jetzt stehen Gesichter vor den Namen, der Sieger hell,
  // der Verlierer leise, und im Stand leuchtet die Zahl des Siegers. Die
  // Partien eines Tages stehen unter einem Tageskopf mit ihrer Zahl, wie im
  // Feed, und die Zeile nennt nur noch die Uhrzeit. Die Gestaltung liegt im
  // CSS; im Markup standen die Marken der Auszeichnungen als Inline-Stil
  // [§C31].
  const proTag={};
  list.forEach(m=>{const k=tagKey(mts(m));proTag[k]=(proTag[k]||0)+1;});
  let tagVorher=null;
  const rows=paginatedList.map(m=>{
    const aWon=m.winner==='A';
    const team=(ids,w,r)=>`<div class="mteam${r?' r':''} ${w?'won':'lost'}"><span class="mteam-av">${ids.map(id=>{const p=pmap()[id];return p?avHtml(p,'',{}):'';}).join('')}</span>`
      +`<span class="mteam-n">${esc(pname(ids[0]))} & ${esc(pname(ids[1]))}</span></div>`;
    const dl=ids=>ids.map(id=>{const d=(m.deltas||{})[id]||0;
      return `<span><b>${esc(pname(id))}</b> <span class="delta-v ${d>=0?'pos':'neg'}">${d>=0?'+':''}${Math.round(d)}</span></span>`;}).join('');
    const earned=badgesEarnedInMatch(m.id);
    const badgeChips=earned.length?`<div class="mrow-bd">${earned.map(e=>
      `<span>${badgeIc(e.badge,'12px')}<span>${esc(pname(e.playerId).split(' ')[0])}</span></span>`
    ).join('')}</div>`:'';
    const k=tagKey(mts(m));
    const kopf=k!==tagVorher?`<div class="mtag"><b>${esc(datumFmt(mts(m),'wt'))}</b><span>${esc(datumFmt(mts(m),'tm'))}</span>`
      +`<em class="num">${proTag[k]} ${proTag[k]===1?'Partie':'Partien'}</em></div>`:'';
    tagVorher=k;
    return `${kopf}<div class="mrow" data-match="${m.id}">
      <div class="mrow-top">
        ${team([m.a1,m.a2],aWon,false)}
        <div class="mscore num"><em class="${aWon?'w':''}">${m.games_a}</em><i>:</i><em class="${aWon?'':'w'}">${m.games_b}</em></div>
        ${team([m.b1,m.b2],!aWon,true)}
      </div>
      <div class="mrow-bot"><div class="mdeltas">${dl([m.a1,m.a2,m.b1,m.b2])}</div></div>
      ${badgeChips}
      <div class="mrow-bot mrow-fuss"><span>${datumFmt(mts(m),'uhr')}</span>
        <span data-delmatch="${m.id}" class="mrow-edit">${svgI('edit')} bearbeiten</span></div>
    </div>`;
  }).join('');

  // ═══ PAGINIERUNGS-CONTROLS ═══
  const paginationControls = totalPages > 1 ? `
    <div style="display:flex;align-items:center;gap:8px;margin-top:16px;padding-bottom:20px;width:100%">
      <button class="btn ghost sm" id="prevPageBtn" style="flex:1;min-width:0;padding:10px 8px;white-space:nowrap" ${currentPage===0?'disabled':''}>← Vorher</button>
      <div style="flex-shrink:0;color:var(--muted);font-size:11px;font-family:'Sometype Mono',monospace;text-align:center;padding:0 2px;white-space:nowrap">
        <b style="color:var(--ink)">${currentPage+1}</b> / <b style="color:var(--ink)">${totalPages}</b>
      </div>
      <button class="btn ghost sm" id="nextPageBtn" data-historymax="${totalPages-1}" style="flex:1;min-width:0;padding:10px 8px;white-space:nowrap" ${currentPage>=(totalPages-1)?'disabled':''}>Weiter →</button>
    </div>
  ` : '';

  return `
    <div class="view-head"><h2>Verlauf</h2><p>${list.length} Partien</p></div>
    <div class="search" style="margin-bottom:14px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/></svg>
      <select id="histSel" style="padding-left:40px">${opts}</select>
    </div>
    ${list.length?`<div class="mlist">${rows}</div>${paginationControls}`:emptyState('search','Keine Partien für diesen Filter')}`;
}


// ╔═══ §5.6 ─── VIEW: MATCH-EINGABE ────────────────────────────────────╗
//     Aufstellung auf dem Court + Satz-Eingabe für ein neues Match.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Der Entwurf eines Matches: vier Plätze (1 links/Revés, 2 rechts/Drive),
// ob ein Team von Hand getauscht wurde, und die Sätze [§5.6b].
function matchLeer(){ return {A1:'',A2:'',B1:'',B2:'',fixA:false,fixB:false,...satzStart()}; }
let M=matchLeer();
function vMatch(){
  const slot=(t,n)=>{
    const key=t+n;
    const sel=M[key]?pmap()[M[key]]:null;
    const seite=SLOT_SEITE[n];
    return `<div class="slot ${seite}"><div class="slot-seite">${svgI(seite==='drive'?'posDrive':'posReves')}${SEITE_LANG[seite]}</div>
      <div class="combo">
      <input type="text" data-combo="${key}" placeholder="Spieler…" autocomplete="off"
        value="${sel?esc(sel.name):''}" class="${sel?'filled':''}">
      <div class="combo-list" data-combolist="${key}"></div>
    </div></div>`;
  };
  const haelfte=t=>`<div class="team-block ${t}"><div class="team-label">Team ${t} <span class="tag" id="avg${t}"></span>
      <button class="seiten-tausch" data-tausch="${t}" title="Seiten tauschen" aria-label="Seiten von Team ${t} tauschen">${svgI('sideSwap')}</button></div>
      <div class="court-h">${slot(t,1)}${slot(t,2)}</div></div>`;
  return `
    <div class="view-head"><h2>Neue Partie</h2><p>Aufstellen, Sätze eintragen, speichern</p></div>
    <div class="builder court">
      ${haelfte('A')}
      <div class="vs-mid court-netz"><span class="line"></span><span class="vs">NETZ</span><span class="line"></span></div>
      ${haelfte('B')}
    </div>
    <div id="chanceSlot"></div>
    <div id="satzSlot" class="score-board saetze">${satzEditorHtml(M)}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:-4px 0 10px;gap:8px">
      <button class="btn ghost" id="addPlayerBtn" style="width:auto;flex-shrink:0;padding:8px 14px;font-size:11px;border-radius:10px">+ Spieler anlegen</button>
      <button class="btn ghost" id="shuffleBtn" style="width:auto;flex-shrink:0;padding:8px 14px;font-size:11px;border-radius:10px">Teams mischen</button>
    </div>
    <div id="previewSlot"></div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn ghost sm" id="clearM" style="flex:0 0 38%">Leeren</button>
      <button class="btn" id="saveM" disabled>Speichern</button>
    </div>
    <div class="m-fehlt" id="mFehlt" aria-live="polite"></div>`;
}

// ╔═══ §5.7 ─── VIEW: SETTINGS ─────────────────────────────────────────╗
//     Spieler verwalten, Saison-Recap, App-Reset (hinter Passwort-Lock).
// ╚═════════════════════════════════════════════════════════════════════════╝
function vSettings(){
  // `zeig` ist die Beschriftung, wenn der Regler in anderen Schritten zählt
  // als der Wert: der Zuschlag je Partie stand als „15" da und meint 1,5 Elo.
  const sl=(id,name,val,min,max,suf,zeig)=>`<div class="slider-wrap">
    <div class="sh"><span class="sn">${name}</span><span class="sv"><span id="${id}v">${zeig==null?val:zeig}</span>${suf||''}</span></div>
    <input type="range" id="${id}" min="${min}" max="${max}" value="${val}"></div>`;
  // Aktuelle Werte für Erklärungen (mit Fallbacks)
  const c = {
    k:          Math.round(cfg.k_factor),
    risk:       Math.round((cfg.risk_split ?? 0.6)*100),
    pos:        Math.round((cfg.pos_swing ?? 0.45)*100),
    winBoost:   Math.round((cfg.win_boost ?? 1.12)*100),
    movDamp:    Math.round((cfg.mov_loss_damp ?? 0.5)*100),
    bonus:      komma(cfg.match_bonus ?? 1.5, 1),
    startElo:   Math.round(cfg.start_elo ?? 0),
    npMult:     Math.round((cfg.new_player_mult ?? 1.5)*100),
    npMidMult:  Math.round((cfg.new_player_mid_mult ?? 1.2)*100),
    vetDamp:    Math.round((cfg.veteran_damp ?? 0.85)*100),
    movMax:     Math.round((cfg.mov_max_boost ?? 0.4)*100),
    expProt:    Math.round((cfg.exp_protect_max ?? 0.1)*100),
    udElo:      Math.round((cfg.underdog_elo_max ?? 0.15)*100),
    udGames:    Math.round((cfg.underdog_games_max ?? 0.05)*100),
    lowDamp:    Math.round((cfg.low_elo_loss_damp ?? 0)*100),
  };
  // Neun Regler statt fünfzehn. Die übrigen (Dämpfung bei Niederlagen,
  // Schutz für Schwächere und Erfahrene, Aufhol-Zuschlag, Anfänger, Spitze)
  // behalten ihre Werte aus der Datenbank und wirken weiter; verstellt hat
  // sie in der Kicker-Liga in einem Jahr niemand, und jeder Regler mehr
  // macht die Seite schwerer zu verstehen.
  return `
    <div class="view-head"><h2>Elo-Formel</h2><p>Wie Siege und Niederlagen die Elo verändern</p></div>

    <div class="cfg-section-title">Grundwerte</div>
    <div class="card">
      ${sl('cfgK','Tempo (K-Faktor)',c.k,8,64,'')}
      ${sl('cfgStartElo','Start-Elo jeder Saison',c.startElo,0,1000,'')}
      ${sl('cfgNpMult','Neulinge (erste ' + NEULING_BIS + ' Partien)',c.npMult,100,200,' %')}
    </div>

    <div class="cfg-section-title">Partner und Seite</div>
    <div class="card">
      ${sl('cfgRisk','Last des schwächeren Partners',c.risk,0,100,' %')}
      ${sl('cfgPos','Ausgleich der Seite',c.pos,0,100,' %')}
    </div>

    <div class="cfg-section-title">Sieg und Ergebnis</div>
    <div class="card">
      ${sl('cfgWinBoost','Mehr für Siege',c.winBoost,100,140,' %')}
      ${sl('cfgMovMax','Zuschlag für deutliche Siege',c.movMax,0,100,' %')}
      ${sl('cfgBonus','Zuschlag je Partie',Math.round((cfg.match_bonus ?? 1.5)*10),0,50,' Elo',c.bonus)}
      ${sl('cfgUdElo','Außenseiter-Zuschlag',c.udElo,0,100,' %')}
    </div>

    <div class="card">
      <div class="mini-label">So wirken die Regler</div>
      <div style="font-size:12px;color:var(--ink2);line-height:1.8">
        <b style="color:var(--acid)">Tempo</b> — Wie stark eine Partie die Elo verändert. Gewogen nach dem Weg bis zum Sieg: zwei Sätze bis sechs zählen voll, ein Satz bis sechs (6:0 oder 6:4) gut zwei Drittel, ein Kurzsatz bis drei die Hälfte, drei Sätze etwas mehr. Wie knapp es war, zählt dabei nicht.<br>
        <b style="color:var(--acid)">Start-Elo</b> — Mit diesem Wert beginnt jeder Spieler eine Saison.<br>
        <b style="color:var(--acid)">Neulinge</b> — In den ersten ${NEULING_BIS} Partien einer Saison wirkt das Tempo zu ${c.npMult} %, bis zur ${EINGEWOEHNT_BIS}. Partie noch etwas erhöht. So findet die Elo schnell ihren Platz.<br>
        <b style="color:var(--acid)">Last des schwächeren Partners</b> — Bei ${c.risk} % verliert weniger Elo, wer mit einem deutlich schwächeren Partner spielt.<br>
        <b style="color:var(--acid)">Ausgleich der Seite</b> — Auf der schwächeren Seite bringt ein Sieg mehr und kostet eine Niederlage weniger, höchstens ${Math.round(POS_GRENZE*100)} %. Auf der stärkeren ist es umgekehrt, höchstens ${Math.round(POS_DAEMPFER*100)} %. Welche Seite die schwächere ist, zeigt das Seitenprofil im Profil.<br>
        <b style="color:var(--acid)">Mehr für Siege</b> — Ein Sieg bringt ${c.winBoost-100} % mehr, als eine Niederlage kostet. So steigt die Elo über die Zeit.<br>
        <b style="color:var(--acid)">Zuschlag für deutliche Siege</b> — Gemessen am Anteil der Games: ein 6:0 6:0 zählt bis zu ${100+c.movMax} % einer knappen Partie, ein 6:4 kaum mehr.<br>
        <b style="color:var(--acid)">Zuschlag je Partie</b> — ${c.bonus} Elo für jede Partie, ob Sieg oder Niederlage.<br>
        <b style="color:var(--acid)">Außenseiter-Zuschlag</b> — Wer gegen deutlich Stärkere gewinnt, bekommt bis zu ${c.udElo} % mehr. Er kostet nie etwas.<br>
        <b style="color:var(--acid)">Saison</b> — Mit jedem Monat beginnt die Elo neu beim Startwert. Die Elo der Laufbahn ist der gewichtete Schnitt der Saisonenden.
      </div>
    </div>
    <div class="card" style="margin-top:14px;border:1px solid rgba(228,242,74,.18);background:linear-gradient(155deg,rgba(228,242,74,.06),var(--surface) 80%)">
      <div class="mini-label" style="color:var(--acid);display:flex;align-items:center;gap:6px">${svgI('info')}Wirkung der Regler</div>
      <p style="font-size:12px;color:var(--ink2);line-height:1.55;margin-top:8px">
        Änderungen an den Reglern wirken <b style="color:var(--acid)">nur auf neue Partien</b>.
        Vergangene Partien behalten ihre Elo, abgeschlossene Saisons und Auszeichnungen bleiben, wie sie sind.
      </p>
      <p style="font-size:12px;color:var(--ink2);line-height:1.55;margin-top:6px">
        Sollen die Regler auch rückwirkend gelten, lassen sich alle Partien neu berechnen.
        <b style="color:var(--red)">Dabei wird die gespeicherte Elo jeder Partie überschrieben.</b>
      </p>
      <button class="btn" id="recalcBtn" style="margin-top:14px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svgI('neuRechnen')} Alle Partien neu berechnen</button>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="mini-label">Sicherung und Export</div>
      <p style="font-size:11.5px;color:var(--ink2);line-height:1.6;margin-top:10px">
        Hier lässt sich jederzeit eine eigene Kopie der Liga speichern, falls in der Cloud etwas verloren geht.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
        <button class="btn ghost" id="expXlsxBtn" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svgI('scroll')} Partien als Excel (.xlsx)</button>
        <button class="btn ghost" id="expSaveBtn" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svgI('sichern')} Sicherung speichern (.json)</button>
        <button class="btn ghost sm" id="expCsvBtn" style="width:100%;font-size:11px">Stattdessen als CSV</button>
      </div>
      <p style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:12px">
        <b style="color:var(--acid)">Excel</b>: alle ${matches.length} Partien mit Namen, Seiten und Sätzen,
        dazu Spieler und Saisons. Zum Anschauen und Weitergeben.<br>
        <b style="color:var(--acid)">Sicherung</b>: die vollständige Kopie mit Elo und Einstellungen.
        Mit ihr lässt sich die Liga im Ernstfall wieder aufbauen.
      </p>
      <div style="height:1px;background:var(--line);margin:14px 0"></div>
      <button class="btn" id="impBackupBtn" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svgI('hochladen')} Datei einspielen</button>
      <p style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:10px">
        Nimmt .xlsx, .csv und .json. Vorher zeigt eine Vorschau, was dazukommt.
        <b style="color:var(--acid)">Es wird nie etwas gelöscht oder überschrieben</b>, nur fehlende Partien kommen dazu.
      </p>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="mini-label">Stand der App</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px">
        <div style="font-size:12px;color:var(--ink2);font-family:'Sometype Mono',monospace">${BUILD_VERSION}</div>
        <button class="btn ghost sm" id="forceReloadBtn" style="width:auto;padding:7px 12px;font-size:11px;flex-shrink:0">Neu laden</button>
      </div>
      <p style="font-size:11px;color:var(--muted);line-height:1.55;margin-top:10px">
        Fehlt etwas Neues, hält das Telefon noch den alten Stand. Der Knopf lädt ihn neu; sonst meldet sich ein neuer Stand von selbst.
      </p>
    </div>
    ${players.filter(p=>p.hidden).length?`
    <div class="card" style="margin-top:14px">
      <div class="mini-label">Ausgeblendete Spieler</div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:10px">
        ${players.filter(p=>p.hidden).map(p=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:10px">
              ${avHtml(p,'width:32px;height:32px;border-radius:9px;font-size:11px')}
              <span style="font-weight:600">${esc(p.name)}</span>
            </div>
            <button data-unhide="${p.id}" class="btn ghost sm" style="width:auto;padding:7px 12px;font-size:11px">Einblenden</button>
          </div>`).join('')}
      </div>
    </div>`:''}

    `;
}

// ╔═══ §5.8 ─── MATCH PREVIEW & SAVE-LOGIK ─────────────────────────────╗
//     Live-Preview der Elo-Deltas + doSaveMatch() schreibt Match und zeigt
//     Achievement-Toasts (Badge-Trigger via getBadgeEarnedCache).
// ╚═════════════════════════════════════════════════════════════════════════╝
function validM(){ return !_matchFehlt(); }
// Was dem Speichern noch fehlt, als Satz unter dem Knopf. Ein grauer Knopf
// ohne Grund liest sich als Fehler [§6 „Ein leeres Feld liest sich als
// Fehler"].
function _matchFehlt(){
  const ids=[M.A1,M.A2,M.B1,M.B2], n=ids.filter(Boolean).length;
  if(n<4) return n===3 ? 'Noch ein Spieler fehlt.' : `Noch ${4-n} Spieler wählen.`;
  if(new Set(ids).size!==4) return 'Ein Spieler steht doppelt.';
  if(!satzListe(M).length) return 'Mindestens einen Satz eintragen.';
  return satzAuswertung(M).fehler || '';
}
function teamsFromM(){return{teamA:[{id:M.A1,pos:SLOT_SEITE[1]},{id:M.A2,pos:SLOT_SEITE[2]}],
  teamB:[{id:M.B1,pos:SLOT_SEITE[1]},{id:M.B2,pos:SLOT_SEITE[2]}]};}
// Genau das letzte vollständige Eingabeergebnis, keine wachsende Sammlung
// aller getesteten Aufstellungen. Die Rechnung bleibt computeMatch; Chance,
// Vorschau und Speichern lesen dasselbe Ergebnis ohne eigene Elo-Formel.
// Vor dem ersten beendeten Satz rechnet sie mit einem angenommenen 6:4 für
// die Siegchance: die hängt nur an der Aufstellung.
function _matchInputResult(){
  const felder=partieFelder(satzListe(M));
  if(!felder.winner) Object.assign(felder, partieFelder([{a:6,b:4,art:'n'}]));
  const key=JSON.stringify([_cache.version,currentSeason().id,M.A1,M.A2,M.B1,M.B2,felder]);
  const memo=_cache._matchInputMemo;
  if(memo && memo.key===key && memo.matches===matches && memo.players===players && memo.cfg===cfg) return memo.result;
  const {teamA,teamB}=teamsFromM();
  const result=computeMatch(teamA,teamB,felder);
  _cache._matchInputMemo={key,matches,players,cfg,result};
  return result;
}
let _matchPreviewPlan=null;
function requestMatchPreview(){
  const slot=document.getElementById('previewSlot'),save=document.getElementById('saveM');
  if(!slot || !save) return;
  // Validität und Zahlen antworten sofort; Wappen und analytische Vorschau
  // höchstens einmal im nächsten Bild, immer für den letzten Eingabestand.
  save.disabled=!!doSaveMatch._busy || !validM();
  const fehlt=document.getElementById('mFehlt'); if(fehlt) fehlt.textContent=_matchFehlt();
  if(_matchPreviewPlan && _matchPreviewPlan.slot===slot) return;
  if(_matchPreviewPlan) cancelAnimationFrame(_matchPreviewPlan.frame);
  const plan={slot,frame:0};_matchPreviewPlan=plan;
  plan.frame=requestAnimationFrame(()=>{
    if(_matchPreviewPlan!==plan) return;
    _matchPreviewPlan=null;
    if(document.getElementById('previewSlot')===slot) updatePreview();
  });
}
function updatePreview(){
  if(_matchPreviewPlan){cancelAnimationFrame(_matchPreviewPlan.frame);_matchPreviewPlan=null;}
  const slot = document.getElementById('previewSlot');
  const save = document.getElementById('saveM');
  if(!slot || !save) return;
  const P = pmap();
  const gSim = getGlobalSim();
  const seasonElo = id => gSim.elo[id] ?? cfg.start_elo;

  const setAvg = (el,a,b) => {
    const e = document.getElementById(el);
    if(e && P[a] && P[b]) e.textContent = 'Ø '+Math.round((seasonElo(a)+seasonElo(b))/2)+' (Saison)';
    else if(e) e.textContent = '';
  };
  setAvg('avgA', M.A1, M.A2); setAvg('avgB', M.B1, M.B2);

  const ids = [M.A1,M.A2,M.B1,M.B2].filter(Boolean);
  // Die Siegchance steht, sobald vier verschiedene Spieler aufgestellt sind
  // — nicht erst, wenn das Ergebnis eingetragen ist: beim Aufstellen ist
  // sie die Frage, nach dem Spiel nur noch eine Zahl.
  const chanceSlot = document.getElementById('chanceSlot');
  const aufgestellt=ids.length===4 && new Set(ids).size===4;
  const c=aufgestellt?_matchInputResult():null;
  if(chanceSlot){
    const html=c?_matchChanceHtml(c.expA):'';
    if(chanceSlot._matchChanceHtml!==html){chanceSlot.innerHTML=html;chanceSlot._matchChanceHtml=html;}
  }
  if(new Set(ids).size !== ids.length){
    slot.innerHTML = `<div class="preview" style="color:var(--red);font-size:12px;text-align:center">Ein Spieler steht doppelt.</div>`;
    save.disabled = true; return;
  }
  if(!validM()){slot.innerHTML=''; save.disabled=true; return;}

  const p = satzAuswertung(M);
  const{teamA, teamB} = teamsFromM();
  const line = s => {
    const d = c.res[s.id];
    return `<div class="delta-row">
      <span class="dn">${esc(P[s.id].name)}
        <span class="chip ${s.pos}">${s.pos==='drive'?'R':'L'}</span>
      </span>
      <span class="delta-v ${d>=0?'pos':'neg'}">${d>=0?'+':''}${Math.round(d)}</span>
    </div>`;
  };
  const zusatz = [p.zuNull ? 'zu Null' : '', c.mov>1.15 ? 'deutlich ×'+komma(c.mov,2) : '',
    c.gewicht<0.9 ? 'kurze Partie ×'+komma(c.gewicht,2) : c.gewicht>1.1 ? 'lange Partie ×'+komma(c.gewicht,2) : '']
    .filter(Boolean).join(' · ');
  slot.innerHTML = `<div class="preview">
    <div class="prob-cap">Elo nach dieser Partie${zusatz?' · '+zusatz:''}</div>
    <div class="delta-list">
      ${line(teamA[0])}${line(teamA[1])}
      <div class="delta-div"></div>
      ${line(teamB[0])}${line(teamB[1])}
    </div>
  </div>`;
  save.disabled = !!doSaveMatch._busy;
}

// ── Die Siegchance beim Aufstellen [§C27] ────────────────────────────
// Unter dem Court, sobald die vier stehen: die beiden Paare, das Wort
// dazu und der Balken, aus derselben Rechnung, mit der das Match danach
// gewertet wird (`computeMatch`). Das Wort zeigt zum Favoriten.
function _matchChanceHtml(c){
  if(c===undefined){try {c=_matchInputResult().expA;}catch(e){return '';}}
  if(c == null || !isFinite(c)) return '';
  const pA = Math.round(c * 100), pB = 100 - pA;
  const wort = chanceWort(Math.max(c, 1 - c));
  const mitte = wort === 'Favorit' ? (c >= .5 ? '← Favorit' : 'Favorit →') : wort;
  return `<div class="m-chance"><div class="m-ch-r">${rcpPaarHtml([M.A1, M.A2], 26)}`
    + `<span class="m-ch-w">${esc(mitte)}</span>${rcpPaarHtml([M.B1, M.B2], 26)}</div>`
    + `<div class="prob"><div class="pa" style="width:${pA}%">${pA} %</div><div class="pb" style="width:${pB}%">${pB} %</div></div></div>`;
}

async function doSaveMatch(){
  if(doSaveMatch._busy) return;
  if(!validM()){toast('Partie unvollständig',true);return;}
  const state=M,stand=JSON.stringify(M),save=document.getElementById('saveM'),saveHtml=save?save.innerHTML:'';
  const unveraendert=()=>M===state && JSON.stringify(M)===stand;
  doSaveMatch._busy=true;
  if(save){save.disabled=true;save.setAttribute('aria-busy','true');save.textContent='Speichere…';}
  let insertedRow=null;
  try {
  const felder = partieFelder(satzListe(M));
  const winner = felder.winner;
  const c = _matchInputResult();
  const {teamA,teamB} = teamsFromM();
  const row = {
    a1:M.A1, a1_side:teamA[0].pos, a2:M.A2, a2_side:teamA[1].pos,
    b1:M.B1, b1_side:teamB[0].pos, b2:M.B2, b2_side:teamB[1].pos,
    ...felder, deltas:c.res, exp_a:c.expA
  };
  // insert(...).select() gibt die erzeugte Zeile inkl. id + created_at zurück,
  // damit die lokale Kopie exakt der DB entspricht (created_at wird für die
  // Saison-Filterung in matchesInSeason zwingend gebraucht).
  const{data:inserted, error} = await sb.from('matches').insert(row).select().single();
  if(error){toast('Fehler: '+error.message,true);return;}

  // Fallback: falls select() nicht greift, created_at lokal setzen,
  // sonst fiele das frische Match aus matchesInSeason heraus.
  const savedRow = inserted || {...row, created_at:new Date().toISOString()};
  insertedRow=savedRow;

  // Das Match steht in der Datenbank; ab hier wartet niemand mehr auf das
  // Netz [§3.1c]. Lokal anhängen, zeichnen, und was die Datenbank daraus
  // ableitet (Seitenprofil, Saison-Elo), schreibt die Kette danach. Ein
  // neues Match ist ein neuer Datenstand: dieselben Töpfe wie nach einem
  // Abruf (`LADEN_TOEPFE`), sonst zeigte ein Reiter den alten.
  matches = [...matches, savedRow];
  invalidateCache(LADEN_TOEPFE);
  // Ein während des Wartens geänderter Entwurf und ein bewusst gewechselter
  // Reiter gehören dem Nutzer, nicht der verspäteten Speicherantwort. Wer
  // mehrere Matches hintereinander mit denselben vier spielt, behält die
  // Aufstellung; nur die Sätze beginnen neu.
  if(unveraendert()){
    M={...matchLeer(),A1:M.A1,A2:M.A2,B1:M.B1,B2:M.B2,fixA:M.fixA,fixB:M.fixB};
    if(tab==='match') tab='ranking';
  }
  neuZeichnen();
  imHintergrund(() => persistNewMatch(savedRow.id));
  loadAll();

  // ─── ACHIEVEMENT-TOASTS ───────────────────────────────────────────
  // badgesEarnedInMatch liefert genau die in DIESEM Match neu erreichten
  // Badges. Gerechnet nach dem ersten Bild der neuen Ansicht: die
  // Auszeichnungen der ganzen Liga zu rechnen kostet mehr als das Zeichnen.
  // Common-Badges werden NICHT als Toast gezeigt, sonst entsteht eine
  // Kaskade; sie bleiben im Match-Rückblick sichtbar.
  nachDemBild().then(() => {
    const toastWorthy = badgesEarnedInMatch(savedRow.id).filter(e => rarityOf(e.badge.id) !== 'common');
    if(toastWorthy.length){
      toastWorthy.forEach(e => showAchievementToast(pname(e.playerId), e.badge));
    } else {
      // Die Wirkung in der zweiten Zeile, und ein Weg zurück: wer sich beim
      // Ergebnis vertippt hat, musste sonst das Match suchen und löschen.
      const sieger = winner === 'A' ? [row.a1,row.a2] : [row.b1,row.b2];
      toast('Partie gespeichert', 'ok', {
        sub: sieger.map(pname).join(' & ') + ' gewinnen ' + standFuer(savedRow),
        aktion: {label:'Rückgängig', fn: () => partieLoeschen(savedRow.id)}});
    }
  });
  } catch(e){
    console.warn('Match speichern:',e);
    // Nach erfolgreichem Insert ist das Match schon gespeichert. Den alten
    // Entwurf nicht als erneut speicherbare Kopie liegenlassen.
    if(insertedRow && unveraendert()){
      M=matchLeer();
      if(tab==='match') render();
    }
    toast(insertedRow?'Partie gespeichert. Anzeige fehlgeschlagen.':'Speichern fehlgeschlagen.',true);
  } finally {
    doSaveMatch._busy=false;
    if(save && save.isConnected){save.removeAttribute('aria-busy');save.innerHTML=saveHtml;}
    if(tab==='match') updatePreview();
  }
}
