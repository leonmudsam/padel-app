// ╔═══ §9.4 ─── MATCH BEARBEITEN ───────────────────────────────────────╗
//     Edit-Sheet für nachträgliche Korrektur eines Matches. Dieselbe
//     Satz-Eingabe wie beim Eintragen [§5.6b].
// ╚═════════════════════════════════════════════════════════════════════════╝
let E={};  // Edit-Zustand
function showEditMatch(mid){
  const m=matches.find(x=>x.id===mid);if(!m)return;
  // Platz 1 ist links (Revés), Platz 2 rechts (Drive) — wie in der Eingabe.
  const links=(p,q,sp)=>sp==='drive'?[q,p]:[p,q];
  const [A1,A2]=links(m.a1,m.a2,m.a1_side), [B1,B2]=links(m.b1,m.b2,m.b1_side);
  E={id:m.id,A1,A2,B1,B2,...satzStartAus(m)};
  const gSim=getGlobalSim();
  const sortElo=p=>gSim.careerElo[p.id]??p.elo;
  const showElo=p=>Math.round(gSim.elo[p.id]??cfg.start_elo);
  // Wer vor diesem Match die Karriere beendet hat, steht nicht zur Wahl
  // [§C40]: ein Match nach dem Karriereende gibt es für ihn nicht. Wer schon
  // im Match steht, bleibt wählbar — eine Korrektur des Ergebnisses darf
  // ihn nicht hinauswerfen.
  const drin=new Set([m.a1,m.a2,m.b1,m.b2]);
  const zuSpaet=id=>!drin.has(id)&&imRuhestandAm(id,mts(m));
  const opts=sel=>`<option value="">Spieler…</option>`+
    [...players].filter(p=>!zuSpaet(p.id)).sort((a,b)=>sortElo(b)-sortElo(a)).map(p=>`<option value="${p.id}" ${E[sel]===p.id?'selected':''}>${esc(p.name)} · ${showElo(p)}</option>`).join('');
  const slot=(t,n)=>`<div class="slot ${SLOT_SEITE[n]}"><div class="slot-seite">${SEITE_LANG[SLOT_SEITE[n]]}</div>
    <div class="psel"><select data-ep="${t}${n}">${opts(t+n)}</select></div></div>`;
  const haelfte=t=>`<div class="team-block ${t}"><div class="team-label">Team ${t}
    <button class="seiten-tausch" data-etausch="${t}" title="Seiten tauschen" aria-label="Seiten von Team ${t} tauschen">${svgI('sideSwap')}</button></div>
    <div class="court-h">${slot(t,1)}${slot(t,2)}</div></div>`;
  openSheet(`${blattKopfHtml({ic:'edit', titel:'Partie bearbeiten', unter:'Änderungen lösen eine Neuberechnung aus'})}
    <div class="builder court" style="margin-top:16px">
      ${haelfte('A')}
      <div class="vs-mid court-netz"><span class="line"></span><span class="vs">NETZ</span><span class="line"></span></div>
      ${haelfte('B')}
    </div>
    <div id="eSatzSlot" class="score-board saetze" style="margin-top:12px">${satzEditorHtml(E)}</div>
    <div id="editWarn" style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:10px"></div>
    <div class="btn-row">
      <button class="btn ghost sm" id="cancelEdit" style="flex:0 0 38%">Abbrechen</button>
      <button class="btn" id="saveEdit">Speichern</button>
    </div>`);
  let speichert=false;
  const fehlerE=()=>{
    const ids=[E.A1,E.A2,E.B1,E.B2];
    if(ids.some(x=>!x)) return ' ';
    const spaet=ids.find(x=>zuSpaet(x));
    if(spaet) return (pmap()[spaet]||{}).name+' hat die Karriere vor dieser Partie beendet.';
    if(new Set(ids).size!==4) return 'Ein Spieler steht doppelt.';
    return satzAuswertung(E).fehler || '';
  };
  const checkE=()=>{const msg=fehlerE();const warn=document.getElementById('editWarn');
    if(warn)warn.textContent=msg.trim();
    const b=document.getElementById('saveEdit'); if(b) b.disabled=speichert||!!msg;};
  const selectsLesen=()=>document.querySelectorAll('[data-ep]').forEach(s=>E[s.dataset.ep]=s.value);
  document.querySelectorAll('[data-ep]').forEach(s=>s.onchange=()=>{selectsLesen();checkE();});
  document.querySelectorAll('[data-etausch]').forEach(b=>b.onclick=()=>{
    const t=b.dataset.etausch; selectsLesen(); seitenTauschen(E,t);
    const s1=document.querySelector(`[data-ep="${t}1"]`), s2=document.querySelector(`[data-ep="${t}2"]`);
    if(s1) s1.value=E[t+'1']; if(s2) s2.value=E[t+'2'];
    checkE();
  });
  satzEditorBinden(document.getElementById('eSatzSlot'), E, checkE);
  document.getElementById('cancelEdit').onclick=()=>showMatchDetail(mid);
  document.getElementById('saveEdit').onclick=async()=>{
    if(speichert) return;
    selectsLesen();
    const msg=fehlerE();
    if(msg){toast(msg.trim()||'Eingabe unvollständig',true);return;}
    const state=E,draft=JSON.parse(JSON.stringify(E)),save=document.getElementById('saveEdit');
    speichert=true;save.disabled=true;save.setAttribute('aria-busy','true');
    toast('Speichere…');
    // Jeder Satz ist eine eigene Partie [§1.3]: der erste bleibt in dieser
    // Zeile, jeder weitere wird eine neue direkt dahinter. Eine alte Zeile
    // mit mehreren Sätzen wird beim Bearbeiten so aufgeteilt.
    const saetze=satzListe(draft).filter(s=>saetzeAuswerten([s]).winner);
    const spieler={a1:draft.A1,a1_side:SLOT_SEITE[1],a2:draft.A2,a2_side:SLOT_SEITE[2],
      b1:draft.B1,b1_side:SLOT_SEITE[1],b2:draft.B2,b2_side:SLOT_SEITE[2]};
    const zeile={...spieler,...partieFelder(saetze.slice(0,1))};
    const t0=mts(m);
    const weitere=saetze.slice(1).map((s,i)=>({...spieler,...partieFelder([s]),deltas:{},exp_a:0.5,
      created_at:new Date(t0+(i+1)*10).toISOString()}));
    try {
    // Match-Zeile aktualisieren (Deltas folgen aus der Neuberechnung)
    const {error}=await sb.from('matches').update(zeile).eq('id',draft.id);
    if(error){toast('Fehler: '+error.message,true);return;}
    let neue=[];
    if(weitere.length){
      const ins=await sb.from('matches').insert(weitere).select();
      if(ins.error){toast('Fehler: '+ins.error.message,true);return;}
      neue=ins.data||[];
    }
    if(save.isConnected && E===state && JSON.stringify(E)===JSON.stringify(draft)) closeSheet(true);
    const updated=[...matches.map(x=>x.id===draft.id?{...x,...zeile}:x),...neue];
    // Die Liga mit dem geänderten Match steht sofort; die Deltas, die sich
    // dadurch ändern, schreibt die Kette danach [§3.1c].
    const r = ligaNeuRechnen(updated);
    neuZeichnen();
    toast('Gespeichert','ok');
    imHintergrund(() => rechnungSchreiben(r), true);
    loadAll();
    } catch(e){console.warn('Match bearbeiten:',e);toast('Speichern oder Neuberechnen fehlgeschlagen.',true);}
    finally{speichert=false;if(save.isConnected){save.removeAttribute('aria-busy');checkE();}}
  };
  checkE();
}
