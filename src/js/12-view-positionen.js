// ╔═══ §5.2 ─── VIEW: SEITEN-RANGLISTE ─────────────────────────────────╗
//     Wer ist rechts (Drive) und wer links (Revés) der Beste der Liga.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Die Rangliste einer Seite: eine Rechnung für die Liste und die
// Seiten-Landkarte darüber — zwei Rechnungen über dieselbe Frage nennten
// irgendwann zwei Beste [§C27].
// `spieler` nimmt eine andere Liste als die aktive Liga — die Ruheständler,
// mit derselben Rechnung [§C40].
function positionsListe(pos, spieler){
  const statsMap = allPlayerStats();
  return (spieler || activePlayers()).map(p=>{
    const s = statsMap[p.id] || playerStats(p.id);
    const g  = pos==='drive' ? s.drvG : s.revG;
    const w  = pos==='drive' ? s.drvW : s.revW;
    // Der Game-Anteil des eigenen Teams auf dieser Seite (0..1).
    const anteil = pos==='drive' ? s.drvAnteil : s.revAnteil;
    const perf=posPerfFrom(p.id,matches);
    const pAvg=pos==='drive'?perf.aPerfAvg:perf.dPerfAvg;
    const wr=g?w/g:0;
    // Die Rechnung steht in posWert [§5.2] — sie gehört nicht in eine
    // Ansicht, weil der Liga-Rekord auf dieser Seite dieselbe Zahl braucht
    // [§13.1]. Zwei Rechnungen, zwei Beste.
    const score=posWert(pos,g,w,anteil,pAvg);
    return {p,g,w,wr,pAvg:pAvg||0,anteil:anteil==null?.5:anteil,score};
  }).filter(x=>x.g>0)
    .sort((a,b)=> b.score-a.score || b.pAvg-a.pAvg || b.wr-a.wr);
}

// Die Zeilen einer Seite. `ohneRang` für die Ruheständler [§C40]: sie
// stehen in keiner Rangfolge der aktiven Liga, also trägt die Zeile keinen
// Platz und kein Metall der ersten drei.
function positionsBlockHtml(arr, pos, ohneRang){
  // Ohne Partie auf dieser Seite sagt die Ansicht, was hier stehen wird —
  // und nicht, was Drive und Revés im Padel sind: das weiß, wer spielt.
  if(!arr.length) return ohneRang ? '' : vorschauHtml(pos==='drive'?'posDrive':'posReves',
    pos==='drive' ? 'Drive · rechts' : 'Revés · links',
    `Hier steht, wer ${pos==='drive'?'rechts':'links'} am stärksten spielt, gemessen an Partner und Gegnern. Die Seite kommt aus der Aufstellung jedes Satzes.`,
    null, '', emptyState(pos==='drive'?'posDrive':'posReves', 'Noch niemand auf dieser Seite gewertet.'));
  return `<div class="rlist">${arr.map((x,i)=>{
    const perfChip = x.pAvg>0.08?'<span class="perf-up">▲</span>':x.pAvg<-0.08?'<span class="perf-dn">▼</span>':'';
    // Rechts steht der Wert, nach dem sortiert wird; der Game-Anteil hat
    // seine eigene ruhige Zeile darunter.
    const wert = Math.round(x.score*100);
    return `<div class="rrow ${!ohneRang&&i<3?'top'+(i+1):''}${ohneRang?' ruhe-row':''}" data-detail="${x.p.id}">
      ${ohneRang ? '' : `<span class="pos num">${i+1}</span>`}
      ${avHtml(x.p, '', {ins:true, px:52})}
      <div class="rmid">
        <div class="rname">${esc(x.p.name)} ${perfChip}</div>
        <div class="rmeta">
          <span>${x.w}–${x.g-x.w}</span>
          <span class="wbar"><i style="width:${Math.round(x.wr*100)}%"></i></span>
          <span>${Math.round(x.wr*100)} %</span>
        </div>
        <div class="rmeta rmeta-tore">${Math.round(x.anteil*100)} % der Games · ${x.g} ${x.g===1?'Satz':'Sätze'}</div>
      </div>
      <div class="rval"><div class="big num">${wert}</div><div class="small">Wert</div></div>
    </div>`;}).join('')}</div>`;
}

// Die Ruheständler auf der gewählten Seite, am Ende des Reiters [§C40].
function positionenRuheHtml(){
  const pos = rankMetric==='drive'?'drive':'reves';
  const arr = positionsListe(pos, ruhestandSpieler());
  return arr.length ? positionsBlockHtml(arr, pos, true) : '';
}

function vPositions(){
  // Revés steht links im Umschalter und ist deshalb auch die Vorwahl: wer
  // den Reiter öffnet, sieht zuerst die linke Seite, wie auf dem Platz.
  // `rankMetric` teilt sich der Reiter mit der Liga; nur 'drive' wählt rechts.
  const which = rankMetric==='drive'?'drive':'reves';
  const arr = positionsListe(which);
  const ruhe = positionsListe(which, ruhestandSpieler()).length;
  return `
    <div class="view-head"><h2>Seiten ${hilfeKnopf('seiten')}</h2><p>Wer auf welcher Seite am stärksten ist</p></div>
    ${einblickHtml('rollen')}
    <div class="ui-switch">
      <button data-postoggle="reves" class="${which==='reves'?'on':''}"><span class="pos-chip reves">${svgI('posReves')}Revés · links</span></button>
      <button data-postoggle="drive" class="${which==='drive'?'on':''}"><span class="pos-chip drive">${svgI('posDrive')}Drive · rechts</span></button>
    </div>
    <div class="mini-label">▲ über · ▼ unter der Erwartung</div>
    ${positionsBlockHtml(arr, which)}
    ${ruhe ? `<div class="ruhe-ende">${einblickHtml('ruhe_pos', ruhe === 1 ? 'ein Spieler' : ruhe + ' Spieler')}</div>` : ''}`;
}


