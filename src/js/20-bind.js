// ╔═══ §10.1 ─── BIND (globaler Click-Dispatcher) ──────────────────────╗
//     Zentrale Stelle, die data-* Attribute auf Click-Handler mappt.
// ╚═════════════════════════════════════════════════════════════════════════╝
function bind(){
  const main=document.getElementById('main');if(!main) return;
  // Geschlossene Erklärkarten wieder zeigen: nur dieses Gerät, nichts in der Liga.
  const hz=main.querySelector('#hinweiseZurueckBtn');
  if(hz) hz.onclick=()=>{ hinweiseWeg().clear(); _hinweiseSpeichern(); toast('Hinweise werden wieder gezeigt','ok'); render(); };
  // Die „?"-Knöpfe der Reiter [§C27]: ein Blatt, wie der Reiter funktioniert.
  main.querySelectorAll('[data-hilfe]').forEach(b => b.onclick = () => zeigeHilfe(b.dataset.hilfe));
  // Die Einblicke über den Ranglisten klappen auf, ohne neu zu zeichnen.
  einblickBinden(document.getElementById('main'));
  main.querySelectorAll('.einblick.auf .einblick-i').forEach(bindDetailLinks);
  // Die Spielersuche in der Ewigen Tafel ist entfallen. Ihr
  // Schnell-Neuzeichnen hat .rlist ohnehin selbst neu aufgebaut und kannte
  // weder das Podest noch die Heldenzeile — nach dem ersten Tastendruck
  // standen die ersten drei doppelt in der Liste.

  // Eine Suche ersetzt nur ihre Ergebnisliste. Das Feld selbst bleibt stehen:
  // keine Tastatur schließt, kein Cursor springt und keine Komposition bricht ab.
  const ts=document.getElementById('teamSearch');
  if(ts){
    let bild=null,komposition=false;
    const suchen=()=>{
      teamSearch=ts.value;
      if(komposition || bild!==null) return;
      bild=requestAnimationFrame(()=>{
        bild=null;
        if(komposition || tab!=='teams' || document.getElementById('teamSearch')!==ts) return;
        const ergebnis=vTeams(true),liste=document.getElementById('teamResults'),kopf=document.getElementById('teamCount');
        if(!liste || !kopf || !ergebnis || typeof ergebnis!=='object') return;
        liste.innerHTML=ergebnis.html;kopf.textContent=ergebnis.kopf;
        liste.querySelectorAll('[data-team]').forEach(el=>el.onclick=()=>{
          const [a,b]=el.dataset.team.split('|');if(a&&b) showTeam(a,b);
        });
        // Die Duos mit Karriereende folgen derselben Suche [§C40]; zu
        // gezeichnet wird ihr Inhalt erst beim Aufklappen.
        const ruhe=document.querySelector('[data-einblick="ruhe_teams"].auf .einblick-i');
        if(ruhe){ ruhe.innerHTML=ergebnis.ruhe||''; bindDetailLinks(ruhe); }
        // Der letzte vollständige Render darf nicht dieselben alten Ergebnisse
        // behaupten, nachdem die Liste gezielt ausgetauscht worden ist.
        document.getElementById('main')._renderHtml=null;
      });
    };
    ts.oninput=e=>{teamSearch=ts.value;if(!e.isComposing) suchen();};
    ts.addEventListener('compositionstart',()=>{komposition=true;});
    ts.addEventListener('compositionend',()=>{komposition=false;suchen();});
  }

  main.querySelectorAll('[data-metric]').forEach(b=>b.onclick=()=>{rankMetric=b.dataset.metric;_renderNachEingabe();});
  // Der Zeitraumwechsel setzt die gewählte Saison zurück. Sie gilt nur unter
  // „Saison"; bliebe sie über einen Ausflug in „Woche" hinweg stehen, böten
  // die Saison-Tools darunter weiter den Mai an, während oben die laufende
  // Woche steht — und beim Zurückwechseln stünde plötzlich wieder der Mai da.
  main.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{
    period=b.dataset.period;ligaSeasonId=null;_renderNachEingabe();});
  // v9: Saison-Tools am Ende der Rangliste (Recap + Positionsverlauf)
  // Welche Saison gemeint ist, steht am Knopf — _seasonToolsHtml setzt sie
  // aus der Saison, die der Liga-Tab gerade zeigt.
  main.querySelectorAll('[data-seasontool]').forEach(b=>b.onclick=()=>{
    const sid=b.dataset.sid;
    if(b.dataset.seasontool==='pos'){ showPositionHistory(sid); return; }
    const s=seasons.find(x=>x.id===sid);
    if(s) showSeasonRecap(s);
  });
  const ap=document.getElementById('addPlayerBtn');if(ap)ap.onclick=showAddPlayer;

  // positions toggle (reuse rankMetric)
  main.querySelectorAll('[data-postoggle]').forEach(b=>b.onclick=()=>{rankMetric=b.dataset.postoggle;_renderNachEingabe();});
  main.querySelectorAll('[data-possort]').forEach(b=>b.onclick=()=>{posSort=b.dataset.possort;_renderNachEingabe();});

  // awards anklickbar
  main.querySelectorAll('[data-award]').forEach(el=>el.onclick=()=>showAward(el.dataset.award));
  main.querySelectorAll('[data-awview]').forEach(b=>b.onclick=()=>{awView=b.dataset.awview;rekKammer='';_renderNachEingabe();});
  main.querySelectorAll('[data-rekkammer]').forEach(b=>b.onclick=()=>{rekKammer=b.dataset.rekkammer;_renderNachEingabe();});
  // Rekorde- und Chronik-Reiter tragen dieselben Elemente wie das
  // Chronik-Blatt — also brauchen sie auch dessen Verdrahtung.
  if(awView!=='awards'){
    const c=document.getElementById('main');
    if(c) _bindChronikClicks(c);
    chronikMatrixScrollen(c);
  }
  // Die Saison-Zeitleiste liefert Knöpfe statt eines <select>. Gebunden wird
  // am Rahmen, nicht am einzelnen Knopf: das sind zwei Zuhörer statt einem
  // Dutzend, und die Zuordnung „welcher Einsatzort" hängt an der id, die das
  // Bauteil mitbringt.
  const swBind=(id,fn)=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.onclick=e=>{
      const b=e.target.closest('[data-saisonwahl]');
      if(b && el.contains(b)) fn(b.dataset.saisonwahl);
    };
  };
  // Aus demselben Grund wie im Liga-Tab darunter setzt die Wahl den Zeitraum mit.
  swBind('awSeasonPicker', sid=>{awPeriod='season';awSeasonId=sid;_renderNachEingabe();});
  // Die Zeitleiste steht nur unter „Saison", ihre Wahl meint also immer die
  // Saison. Der Zeitraum wird trotzdem mitgesetzt: die Ansicht baut sich erst
  // nach dem Tippen auf, und wer „Gesamt" und gleich danach einen Monat der
  // noch stehenden Leiste traf, bekam die Gesamttabelle mit den Werkzeugen
  // jenes Monats darunter — nicht als Geschichte gekennzeichnet, weil die
  // Rangliste das nur unter „Saison" tut [§C40].
  swBind('ligaSeasonPicker', sid=>{
    period='season';
    ligaSeasonId = sid===currentSeason().id ? null : sid;
    _renderNachEingabe();window.scrollTo(0,0);});

  // Liga: Spieler/Duo-Umschalter
  main.querySelectorAll('[data-ligasicht]').forEach(b=>b.onclick=()=>{
    ligaSicht=b.dataset.ligasicht;_renderNachEingabe();});

  // teams toggle (eigene State-Variable teamView)
  main.querySelectorAll('[data-teamtoggle]').forEach(b=>b.onclick=()=>{teamView=b.dataset.teamtoggle;_renderNachEingabe();});
  
  // teams sort (neue State-Variable teamSort)
  main.querySelectorAll('[data-teamsort]').forEach(b=>b.onclick=()=>{teamSort=b.dataset.teamsort;_renderNachEingabe();});


  // detail
  main.querySelectorAll('[data-detail]').forEach(el=>el.onclick=()=>showPlayer(el.dataset.detail));
  // team detail
  main.querySelectorAll('[data-team]').forEach(el=>el.onclick=()=>{
    const [a,b]=el.dataset.team.split('|');
    if(a&&b) showTeam(a,b);
  });
  // head-to-head detail (asymmetrisch: erste ID = "Du", zweite = Gegenüber)
  main.querySelectorAll('[data-h2h]').forEach(el=>el.onclick=(e)=>{
    e.stopPropagation();
    const [a,b]=el.dataset.h2h.split('|');
    if(a&&b) showH2H(a,b);
  });
  // v9.16: Statistik-Karten öffnen die Top-5-Rangliste dahinter statt direkt
  // ein Profil. stopPropagation, damit ein umgebendes [data-detail]/[data-team]
  // nicht zusätzlich feuert.
  main.querySelectorAll('[data-toplist]').forEach(el=>{
    el.style.cursor='pointer';
    el.onclick=(e)=>{ e.stopPropagation(); openTopList(el.dataset.toplist); };
  });

  // Liga-Chronik (§13) — Einstieg im Awards-Tab
  const lcb=document.getElementById('ligaChronikBtn');
  if(lcb) lcb.onclick=()=>showLigaChronik();

  // history filter
  const hs=document.getElementById('histSel');if(hs)hs.onchange=()=>{histFilter=hs.value;_histPage=0;_renderNachEingabe();};
  main.querySelectorAll('[data-match]').forEach(el=>el.onclick=e=>{
    if(e.target.dataset.delmatch)return; showMatchDetail(el.dataset.match);});
  main.querySelectorAll('[data-delmatch]').forEach(el=>el.onclick=e=>{
    e.stopPropagation(); showMatchDetail(el.dataset.delmatch);});

  // ═══ PAGINIERUNGS-BUTTONS FÜR VERLAUFSTAB ═══
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  if(prevPageBtn) prevPageBtn.onclick = () => {
    _histPage = Math.max(0, _histPage - 1);
    _renderNachEingabe();
  };
  if(nextPageBtn) nextPageBtn.onclick = () => {
    _histPage = Math.min(+nextPageBtn.dataset.historymax, _histPage + 1);
    _renderNachEingabe();
  };

  // match builder
  if(document.getElementById('saveM')){
    main.querySelectorAll('[data-combo]').forEach(inp=>bindCombo(inp));
    // Seiten tauschen: die Plätze, nicht ein Auswahlfeld [§5.6b].
    main.querySelectorAll('[data-tausch]').forEach(b=>b.onclick=()=>{
      seitenTauschen(M, b.dataset.tausch); render();
    });
    satzEditorBinden(document.getElementById('satzSlot'), M, requestMatchPreview);

    document.getElementById('clearM').onclick=()=>{M=matchLeer();render();};
    // Durchwechseln: vier gewählte Spieler zufällig in neue Teams, die
    // Seiten danach nach Gewohnheit — mit etwas Zufall, damit ein knapper
    // Unterschied im Profil nicht immer dieselbe Seite ergibt.
    const shuf=document.getElementById('shuffleBtn');
    if(shuf) shuf.onclick=()=>{
      const ids=[M.A1,M.A2,M.B1,M.B2].filter(Boolean);
      if(ids.length!==4){toast('Erst 4 Spieler auswählen',true);return;}
      for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
      const setzen=(p1,p2)=>{
        // diff=0 → 50 %, diff=0,5 → rund 95 % für den mit mehr Drive rechts
        const prob=1/(1+Math.exp(-(driveStrength(p1)-driveStrength(p2))*6));
        return Math.random()<prob?[p2,p1]:[p1,p2];
      };
      [M.A1,M.A2]=setzen(ids[0],ids[1]);
      [M.B1,M.B2]=setzen(ids[2],ids[3]);
      M.fixA=M.fixB=false;
      toast('Teams gemischt','ok');render();
    };
    document.getElementById('saveM').onclick=doSaveMatch;
    updatePreview(); requestMatchPreview();
  }

  // settings sliders
  bindSlider('cfgK','k_factor',v=>v,v=>Math.round(v));
  bindSlider('cfgRisk','risk_split',v=>v/100,v=>Math.round(v));
  bindSlider('cfgPos','pos_swing',v=>v/100,v=>Math.round(v));
  bindSlider('cfgWinBoost','win_boost',v=>v/100,v=>Math.round(v));
  bindSlider('cfgMovDamp','mov_loss_damp',v=>v/100,v=>Math.round(v));
  bindSlider('cfgLowEloLossDamp','low_elo_loss_damp',v=>v/100,v=>Math.round(v));
  bindSlider('cfgBonus','match_bonus',v=>v/10,v=>komma(v/10,1));
  // Neue Slider
  bindSlider('cfgStartElo','start_elo',v=>v,v=>Math.round(v));
  bindSlider('cfgMovMax','mov_max_boost',v=>v/100,v=>Math.round(v));
  bindSlider('cfgExpProt','exp_protect_max',v=>v/100,v=>Math.round(v));
  bindSlider('cfgUdElo','underdog_elo_max',v=>v/100,v=>Math.round(v));
  bindSlider('cfgUdGames','underdog_games_max',v=>v/100,v=>Math.round(v));
  bindSlider('cfgNpMult','new_player_mult',v=>v/100,v=>Math.round(v));
  bindSlider('cfgNpMidMult','new_player_mid_mult',v=>v/100,v=>Math.round(v));
  bindSlider('cfgVetDamp','veteran_damp',v=>v/100,v=>Math.round(v));
  bindSlider('cfgGewEins','gewicht_eins',v=>v/100,v=>Math.round(v));
  bindSlider('cfgGewDrei','gewicht_drei',v=>v/100,v=>Math.round(v));
  bindSlider('cfgGewUeber6','gewicht_ueber6',v=>v/100,v=>Math.round(v));
  bindSlider('cfgTbAusgleich','tb_ausgleich',v=>v/100,v=>Math.round(v));
  const recalcBtn=document.getElementById('recalcBtn');
  if(recalcBtn) recalcBtn.onclick=async()=>{
    if(!(await bestaetigen({ic:'alert', gefahr:true, ja:'Neu berechnen',
      titel:'Alle Sätze neu berechnen?',
      text:'Alte Einträge mit mehreren Sätzen werden geteilt, und die Elo jedes Satzes wird mit den aktuellen Reglern neu gerechnet. Vergangene Saisons und Auszeichnungen können sich ändern. Das lässt sich nicht rückgängig machen.'}))) return;
    toast('Alle Sätze werden neu berechnet …');
    // Erst alte Zeilen mit mehreren Sätzen in Sätze teilen [§1.3], dann
    // rechnen: sonst stünde eine Partie weiter als „2:1" mit der Elo der
    // alten Rechnung neben den Sätzen der neuen.
    try { await partienAufteilen(); }
    catch(e){ toast('Aufteilen fehlgeschlagen', true, {sub:e.message||''}); return; }
    await persistRecalc(matches);
    toast('Neuberechnung abgeschlossen','ok');
    await loadAll();
  };
  const forceReloadBtn=document.getElementById('forceReloadBtn');
  if(forceReloadBtn) forceReloadBtn.onclick=forceReload;
    // lockBtn2 entfernt

  // Backup & Export (§12)
  const expXlsxBtn=document.getElementById('expXlsxBtn');
  if(expXlsxBtn) expXlsxBtn.onclick=exportMatchesXlsx;
  const expCsvBtn=document.getElementById('expCsvBtn');
  if(expCsvBtn) expCsvBtn.onclick=exportMatchesCsv;
  const expSaveBtn=document.getElementById('expSaveBtn');
  if(expSaveBtn) expSaveBtn.onclick=exportSavepoint;
  const impBackupBtn=document.getElementById('impBackupBtn');
  if(impBackupBtn) impBackupBtn.onclick=startBackupImport;

  // Ausgeblendete Spieler wieder einblenden
  main.querySelectorAll('[data-unhide]').forEach(btn=>btn.onclick=async()=>{
    await sb.from('players').update({hidden:false}).eq('id',btn.dataset.unhide);
    toast('Eingeblendet','ok');
    await loadAll();
  });
// POTW Recap Button in Wochenansicht
const potwRecapWeekBtn = document.getElementById('potwRecapWeekBtn');
if(potwRecapWeekBtn){
  potwRecapWeekBtn.onclick = () => showPotwRecap();
}
// POTD Recap Button in Tagesansicht — force-Aufruf umgeht localStorage-Check
const potdRecapDayBtn = document.getElementById('potdRecapDayBtn');
if(potdRecapDayBtn){
  potdRecapDayBtn.onclick = () => showPotdRecap({force:true});
}

  };


// Combobox: Tippen filtert Spieler, Auswahl setzt M[key]
function bindCombo(inp){
  const key=inp.dataset.combo;
  const list=document.querySelector(`[data-combolist="${key}"]`);
  if(!list) return;
  let blurTimer=null,komposition=false,aktiv=-1;
  list.id='match-options-'+key;list.setAttribute('role','listbox');
  inp.setAttribute('role','combobox');inp.setAttribute('aria-autocomplete','list');
  inp.setAttribute('aria-controls',list.id);inp.setAttribute('aria-expanded','false');
  const schliessen=()=>{list.classList.remove('show');inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');aktiv=-1;};
  const chosenIds=()=>[M.A1,M.A2,M.B1,M.B2].filter((v,i)=>['A1','A2','B1','B2'][i]!==key&&v);
  const waehlen=o=>{
    const p=pmap()[o.dataset.pick];
    if(!inp.isConnected || !ligaAktiv(p) || chosenIds().includes(p.id)) return;
    M[key]=p.id;inp.value=p.name;inp.classList.add('filled');schliessen();
    // Steht das Team komplett, setzt die Gewohnheit die Seiten [§5.6b].
    if(seitenVorbelegen(M, key[0])){ render(); return; }
    requestMatchPreview();
  };
  const renderList=(q)=>{
    const taken=chosenIds();
    const gSim=getGlobalSim();
    const rankElo=p=>gSim.careerElo[p.id]??p.elo; // Karriere-Elo für Sortierung
    const dispElo=p=>Math.round(gSim.elo[p.id]??cfg.start_elo); // Saison-Elo für Anzeige
    let arr=[...activePlayers()].sort((a,b)=>rankElo(b)-rankElo(a)).filter(p=>!taken.includes(p.id));
    const passt=p=>!q||p.name.toLowerCase().includes(q.toLowerCase());
    arr=arr.filter(passt);
    aktiv=-1;inp.removeAttribute('aria-activedescendant');
    // Ohne Vorschlag sagt die Liste, warum: wer schon in der Partie steht
    // oder die Karriere beendet hat, ist kein Tippfehler. Dort stand für
    // beide „Kein Treffer", als gäbe es den Namen nicht.
    // Der Hinweis auf ein Karriereende trägt `data-ruhestand` wie die Liste
    // der Ruheständler: er nennt den Namen, um zu sagen, dass er nicht zur
    // Wahl steht [§C40].
    const leer=()=>{
      const da=players.find(p=>taken.includes(p.id)&&passt(p));
      if(q&&da) return `<div class="combo-opt empty">${esc(da.name)} steht schon in diesem Satz</div>`;
      const weg=players.find(p=>sichtbar(p)&&!ligaAktiv(p)&&passt(p));
      if(q&&weg) return `<div class="combo-opt empty" data-ruhestand>${esc(weg.name)} hat die Karriere beendet</div>`;
      return `<div class="combo-opt empty">Kein Treffer</div>`;
    };
    list.innerHTML=arr.length ? arr.slice(0,8).map((p,i)=>`<div class="combo-opt" id="match-choice-${key}-${i}" role="option" aria-selected="false" data-pick="${p.id}">${esc(p.name)}<span class="ce">${dispElo(p)}</span></div>`).join('')
      : leer();
    list.classList.add('show');inp.setAttribute('aria-expanded','true');
    list.querySelectorAll('[data-pick]').forEach(o=>{
      // Den Eingabefokus erhalten; so klappt die Bildschirmtastatur nicht
      // zwischen Vorschlag und Auswahl zu und ein Blur-Timer gewinnt nie.
      o.onpointerdown=e=>e.preventDefault();o.onclick=()=>waehlen(o);
    });
  };
  inp.onfocus=()=>{clearTimeout(blurTimer);renderList(inp.value && pmap()[M[key]] && pmap()[M[key]].name===inp.value ? '' : inp.value);};
  inp.oninput=e=>{M[key]='';inp.classList.remove('filled');requestMatchPreview();if(!komposition&&!e.isComposing) renderList(inp.value);};
  inp.addEventListener('compositionstart',()=>{komposition=true;});
  inp.addEventListener('compositionend',()=>{komposition=false;M[key]='';renderList(inp.value);requestMatchPreview();});
  inp.onblur=()=>{clearTimeout(blurTimer);blurTimer=setTimeout(()=>{if(document.activeElement!==inp) schliessen();},180);};
  inp.onkeydown=e=>{
    if(komposition || e.isComposing || e.keyCode===229) return;
    if(e.key==='Escape'){e.preventDefault();schliessen();return;}
    if(e.key==='ArrowDown' || e.key==='ArrowUp'){
      e.preventDefault();if(!list.classList.contains('show')) renderList(inp.value);
      const opts=[...list.querySelectorAll('[data-pick]')];if(!opts.length) return;
      aktiv=aktiv<0?(e.key==='ArrowDown'?0:opts.length-1):(aktiv+(e.key==='ArrowDown'?1:-1)+opts.length)%opts.length;
      opts.forEach((o,i)=>{o.setAttribute('aria-selected',String(i===aktiv));o.style.background=i===aktiv?'var(--surface3)':'';});
      inp.setAttribute('aria-activedescendant',opts[aktiv].id);opts[aktiv].scrollIntoView({block:'nearest'});
    }else if(e.key==='Enter' && list.classList.contains('show')){
      const opts=list.querySelectorAll('[data-pick]'),o=opts[aktiv<0?0:aktiv];
      if(o){e.preventDefault();waehlen(o);}
    }
  };
}

function bindSlider(id,key,toState,toLabel){
  const sl=document.getElementById(id);if(!sl)return;
  sl.oninput=()=>{document.getElementById(id+'v').textContent=toLabel(+sl.value);};
  sl.onchange=async()=>{
    const newVal=toState(+sl.value);
    const o={};o[key]=newVal;
    // Ein Regler gilt für die ganze Liga oder gar nicht. Vorher landete ein
    // Wert, den die Datenbank ablehnte (eine Spalte, die es dort noch nicht
    // gab), still in localStorage: dieses Gerät rechnete dann mit anderen
    // Gewichten als alle anderen und schrieb seine Elo trotzdem in die Liga.
    let dbOk=false;
    try{
      const {error}=await sb.from('config').update(o).eq('id',1);
      if(!error) dbOk=true;
      else console.warn('Einstellung nicht gespeichert:',key,error.message);
    }catch(e){
      console.warn('Einstellung nicht gespeichert:',key,e);
    }
    if(!dbOk){
      // Regler und Anzeige zurück auf den Wert, der in der Liga gilt: die
      // Einstellungen zeichnen sich aus `cfg`, und das ist unverändert.
      if(tab==='settings') render();
      toast('Nicht gespeichert','err',{sub:'Die Einstellung konnte nicht in die Liga geschrieben werden und gilt deshalb nirgends.'});
      return;
    }
    cfg[key]=newVal;
    invalidateCache();
    toast('Gespeichert','ok');
  };
}

