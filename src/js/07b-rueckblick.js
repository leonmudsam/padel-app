// ╔═══ §3.8 ─── WOCHEN- UND TAGESRÜCKBLICK ──────────────────────────────╗
//     Die Rückblicke auf den Spieler der Woche und des Tages: Blatt,
//     Auto-Trigger am Wochenanfang und nach dem Spieltag. Bauteile aus
//     05b-recap-teile.js [§C31], Sieger aus _periodeRangliste.
// ╚═════════════════════════════════════════════════════════════════════════╝
// HIER BEGINNT DER KORRIGIERTE showPotwRecap FUNKTIONSBLOCK
// opts.auto=true → Schutz-Phase aktiv (gegen versehentliches Schließen beim
// Auto-Trigger am Wochenanfang). Beim manuellen Aufruf via Hall-of-Fame-Button
// bleibt opts.auto leer → keine Schutz-Phase, sofort schließbar.
function showPotwRecap(opts){
  opts = opts || {};
  // opts.woche (der Montag als Tagesschlüssel) zeigt eine bestimmte Woche:
  // die Story „Die Woche gehört …" öffnet IHRE Woche, nicht die letzte.
  _sheetSetReopen(()=>showPotwRecap(opts.woche ? {woche:opts.woche} : undefined));
  try{
    const {start:weekStart, end:weekEnd}=opts.woche ? _potwWocheVon(opts.woche) : _potwLastWeekRange();
    const ms=_potwMatchesInRange(weekStart,weekEnd);
    const wkKey=_potwKeyOf(weekStart);
    if(!ms.length){ toast('Letzte Woche keine Sätze','info'); return; }

    // Spieler-Stats für die Woche (inkl. längster Serie innerhalb der Woche).
    // Torjäger, Abwehr, Team und Überraschung rechnet der Rückblick nicht
    // mehr selbst: sie kommen aus den Auszeichnungen der Woche (unten).
    const ps={}; // player stats
    const run={}; // current streak
    const pm=pmap(); // Player map for quick lookup
    const orderedMatchesForWeek = [...ms].sort((a,b)=>mts(a)-mts(b));

    orderedMatchesForWeek.forEach(m=>{
      const aWon=m.winner==='A';
      [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
        if(!ps[id]) ps[id]={wins:0,losses:0,gf:0,ga:0,eloDelta:0,bestStreak:0};
        if(run[id]===undefined) run[id]=0;
        const onA=(id===m.a1||id===m.a2);
        const won=(onA&&aWon)||(!onA&&!aWon);
        const gf=onA?m.games_a:m.games_b, ga=onA?m.games_b:m.games_a;
        const d=(m.deltas&&m.deltas[id])||0; // Original delta aus DB
        ps[id].gf+=gf; ps[id].ga+=ga; ps[id].eloDelta+=d;
        if(won){ ps[id].wins++; run[id]=run[id]>=0?run[id]+1:1; }
        else  { ps[id].losses++; run[id]=run[id]<=0?run[id]-1:-1; }
        if(run[id]>ps[id].bestStreak) ps[id].bestStreak=run[id];
      });
    });

    // POTW ermitteln — gleiche Regel wie Achievement (countPeriodWins):
    // Min 5 Siege in der Woche, höchste Winrate gewinnt.
    // Tiebreaker bei Gleichstand auf Winrate: mehr absolute Siege, dann mehr Elo-Delta.
    const candidates = _periodeRangliste(orderedMatchesForWeek, 'woche', true)
      .map(r => [r.id, ps[r.id], r.wr]);

    let potwWinners = [];
    if (candidates.length > 0) {
      const topWr = candidates[0][2];
      // Geteilte POTW: jeder mit ≥ Min-Siegen und gleicher Winrate (mit kleinem Epsilon
      // gegen Floating-Point-Rundungsfehler — analog zu countPeriodWins).
      potwWinners = candidates.filter(c => Math.abs(c[2] - topWr) < 0.001);
    }
    
    if (!potwWinners.length) { toast('Die Vorwoche hat keinen Player of the Week', 'info'); return; }

    const mainPotwPlayerId = potwWinners[0][0];
    const mainPotwStats = potwWinners[0][1];
    const mainPotwPlayer = pm[mainPotwPlayerId];
    if (!mainPotwPlayer) { toast('Die Vorwoche hat keinen Player of the Week', 'info'); return; }

    const weekLabel='KW '+isoWeek(weekStart);
    const sundayDate=new Date(weekEnd);
    const dateRange=datumFmt(weekStart, 'tm')
      +'–'+datumFmt(sundayDate, 'tm');
    const games=mainPotwStats.wins+mainPotwStats.losses;
    const winrate=games?Math.round((mainPotwStats.wins/games)*100):0;
    const eloDelta=Math.round(mainPotwStats.eloDelta);
    const eloDeltaStr=(eloDelta>=0?'+':'')+eloDelta;

    const uniquePlayers=new Set();
    ms.forEach(m=>[m.a1,m.a2,m.b1,m.b2].forEach(id=>uniquePlayers.add(id)));
    const totalGoals=ms.reduce((a,m)=>a+(m.games_a||0)+(m.games_b||0),0);

    // Die Auszeichnungen DIESER Woche, aus derselben Rechnung wie der
    // Awards-Reiter [§C27]. Vorher rechnete der Rückblick Torjäger, Abwehr,
    // Team und Überraschung selbst — ohne die Mindestzahl an Partien und mit
    // einer eigenen Elo-Simulation der Woche —, und die Kachel öffnete das
    // Award-Blatt derselben Woche, auf dem ein anderer stehen konnte.
    const vorherWoche = awWeekStart;
    awWeekStart = new Date(weekStart);
    let R;
    try { R = awardRankings('week'); } finally { awWeekStart = vorherWoche; }

    // Die Woche als Zahlen: was die Kopfzeile nicht schon sagt (Partien,
    // Spieler, Games).
    const spieltage = new Set(ms.map(m => tagKey(mts(m)))).size;
    const eng = ms.filter(m => partie(m).knapp).length;
    const duos = new Set(ms.flatMap(m => [paarKey(m.a1, m.a2), paarKey(m.b1, m.b2)])).size;

    // ─── Darstellung [§C31] ──────────────────────────────────────────
    // Dieselben Bauteile wie im Saison- und im Tages-Rückblick. Vorher
    // stand die ganze Gestaltung hier als Inline-Style: ein eigener Kopf,
    // zwei Avatar-Varianten, vier Zahlenkacheln und eine eigene Kachelform
    // — alles Dinge, die es nebenan schon gab, nur anders aussehend.
    const wkStartMs = weekStart.getTime(), wkEndMs = weekEnd.getTime();
    // Die Awards in der Kachel des Reiters, Metall statt Gold: der Titel
    // dieser Seite ist der Spieler der Woche [§C25]. Die längste Serie der
    // Woche steht schon unter dem Helden, wenn er sie hält — als Kachel ein
    // zweites Mal wäre dieselbe Zahl zweimal. „Größter Aufwind" ist keine
    // Kachel mehr: die Elo jedes Spielers steht im Feld der Woche.
    const hlKacheln = rcpAwardKacheln(R,
      ['mvt', 'streaks', 'scorer', 'wall', 'clutch', 'upset', 'biggest', 'grinder'],
      ['worstWr', 'lossStreaks'],
      key => `data-potw-award="${key}" data-potw-week="${wkStartMs}"`,
      (key, top) => key === 'streaks' && mainPotwStats.bestStreak >= 3 && top.some(x => x.id === mainPotwPlayerId));

    // Was die Woche für die Laufbahnen bedeutete, und woraus [§C31]: die
    // neuen Zeichen, das Prestige nach Quellen, die Auszeichnungen und die
    // Rekorde, die in dieser Woche gefallen sind. Sie brauchen Zeitschnitte
    // an den Rändern der Woche und kommen nach (`rcpSpaetLaden`).
    const spaet = () => {
      const daten = rcpWocheLaufbahn(wkStartMs, wkEndMs);
      const zuege = rcpZeichenZuege(daten);
      const lb = rcpLaufbahnHtml(daten);
      const eh = rcpEhrungHtml(daten);
      const REK = rekordeImZeitraum(wkStartMs, wkEndMs);
      return (zuege.length ? rcpAbschnitt('Neue Zeichen', zuege.length)
          + `<div class="rcp-is nd-is nd-is-viele">${_insBewegungenHtml(zuege)}</div>` : '')
        + (lb ? rcpAbschnitt('Wirkung auf die Laufbahn') + lb : '')
        + (eh.html ? rcpAbschnitt('Auszeichnungen der Woche', eh.zahl) + eh.html : '')
        + (REK.length ? rcpAbschnitt('Rekorde der Woche', REK.length) + rcpRekordArtenHtml(REK) + rcpRekordWandHtml(REK) : '');
    };

    const serieHtml = mainPotwStats.bestStreak >= 3
      ? rcpNotizHtml({ic:'flame',
          text:`Siegesserie von <b class="num">${mainPotwStats.bestStreak}</b> Sätze am Stück`,
          attr:`data-potw-player="${esc(mainPotwPlayerId)}"`})
      : '';

    const geteilt = potwWinners.length > 1;
    openSheet(
      rcpKopfHtml({ic:'weekly', titel:weekLabel,
        marke: geteilt ? 'Players of the Week' : 'Player of the Week',
        meta: rcpMeta([dateRange, ms.length+' Sätze', uniquePlayers.size+' Spieler',
                       totalGoals ? totalGoals+' Games' : ''])})
      + rcpHeldHtml({
          pid: mainPotwPlayerId,
          pids: geteilt ? potwWinners.map(w => w[0]) : null,
          // Ohne Banner: im Schild stünde die Ligaposition von heute, und die
          // hat mit dieser Woche nichts zu tun. Der Reif bleibt — er ist die
          // Laufbahn und gehört zur Person [§C31].
          band:false, px:104, marke:'Spieler der Woche', strahl:true,
          zahlen: rcpZahlenHtml([
            {v:mainPotwStats.wins,   l:'Siege',       ton:'gruen'},
            {v:mainPotwStats.losses, l:'Niederlagen', ton:'rot'},
            {v:winrate+'\u00A0%',          l:'Quote'},
            {v:eloDeltaStr,          l:'Elo', ton:eloDelta>=0 ? 'gruen' : 'rot'}
          ])})
      + serieHtml
      // Wann die Woche gewonnen wurde und gegen wen [§C31]: die Bilanz
      // allein sagte nicht, ob sie an einem Tag fiel oder über sieben. Die
      // Elo-Linie zeigt dazu, in welcher Reihenfolge.
      + (geteilt ? '' : rcpAbschnitt('Die Woche von ' + pname(mainPotwPlayerId))
          + rcpWocheHtml(ms, mainPotwPlayerId, weekStart) + rcpEloBahnHtml(ms, mainPotwPlayerId))
      // Die Woche der Liga: an welchen Tagen wie viel gespielt wurde, als
      // Kalender wie im Saison-Rückblick, darunter ihre Zahlen.
      + rcpAbschnitt('Die Woche in Zahlen')
      + rcpKalenderHtml(ms, weekStart, 7)
      + rcpZahlenHtml([
          {v:spieltage,                        l:spieltage === 1 ? 'Spieltag' : 'Spieltage'},
          {v:komma(totalGoals / ms.length, 1), l:'Games je Satz'},
          {v:eng,                              l:'Enge Sätze'},
          {v:duos,                             l:'Duos'}])
      + rcpAbschnitt('Das Feld der Woche') + rcpFeldHtml(ms, mainPotwPlayerId)
      + (hlKacheln.length ? rcpAbschnitt('Awards der Woche', hlKacheln.length) + awVitrineHtml(hlKacheln, '') : '')
      + rcpSpaetHtml()
      + `<button id="closePotwBtn" class="recap-done-btn">Verstanden</button>`,
      // Eine leise Vorstellung [§C43]: der Spieler der Woche mit Licht,
      // dann der Rest; kein großer Auftritt wie beim Meister.
      {protectMs: opts.auto ? 2500 : 0, vorstellung:'woche'});

    const _grab = document.getElementById('sheetGrab');
    if(_grab) _grab.classList.add('grab-pulse');
    _recapMarkSeen('potw_shown_'+wkKey, 'potw:'+wkKey);

    const wurzel = document.getElementById('sheet');
    const zu = document.getElementById('closePotwBtn');
    if(zu) zu.onclick = () => closeSheet();
    // Einmal für das Blatt, einmal für das, was nachkommt.
    const bindeIn = root => {
      root.querySelectorAll('[data-detail]').forEach(el => {
        el.onclick = () => sheetNav(()=>showPlayer(el.dataset.detail));
      });
      // Die Kacheln öffnen das Award-Detail FÜR DIESE WOCHE. Ein inline-onclick
      // ginge nicht: der ganze Code liegt in einer IIFE, showAward steht dort
      // nicht im globalen Namensraum.
      root.querySelectorAll('[data-potw-award]').forEach(el => {
        el.onclick = () => sheetNav(()=>{
          awPeriod = 'week';
          awWeekStart = new Date(+el.dataset.potwWeek);
          showAward(el.dataset.potwAward);
        });
      });
      root.querySelectorAll('[data-potw-player],.rcp-eh [data-pid]').forEach(el => {
        el.onclick = () => sheetNav(()=>showPlayer(el.dataset.potwPlayer || el.dataset.pid));
      });
      // Ein neues Zeichen und eine Zeile der Laufbahn öffnen die Laufbahn:
      // dort steht die Rechnung Posten für Posten.
      root.querySelectorAll('.rcp-is [data-pid],[data-laufbahn]').forEach(el => {
        el.onclick = () => sheetNav(()=>showLaufbahn(el.dataset.laufbahn || el.dataset.pid));
      });
      root.querySelectorAll('[data-chron]').forEach(el => {
        el.onclick = () => sheetNav(()=>showChronicle(el.dataset.chron));
      });
      _bpBinden(root);
    };
    bindeIn(wurzel);
    rcpSpaetLaden(wurzel, spaet, bindeIn);
  } catch(e){
    console.error('POTW Recap Fehler:',e);
  }
}

// ── Die Laufbahn einer Woche ohne die Titel des Monats [§C31] ────────
// Endet in einer Woche ein Monat, kommen in seiner letzten Millisekunde
// Meister, Vize, Team der Saison und Untouchable [§C34]. Sie gehören dem
// Monat und stehen in seinem Rückblick und seiner Ehrung: in der Woche bis
// zum 31.05. standen sie unter „Wirkung auf die Laufbahn" ein zweites Mal,
// Meister +150 und Team der Saison +75 als Gewinn einer Woche. Herausgenommen
// waren sie nur, wenn die Woche mit dem Monat endete; die Woche vom 26.10.
// bis 01.11., über das Ende des Oktobers hinweg, zählte sie mit.
// Gezählt wird dafür bis zum Schluss der Woche, Montag 00:00 [§11.6f]: dort
// kommen der Spieler der Woche und der Award-Sammler. Bis zur letzten
// Millisekunde des Sonntags gerechnet fehlten sie in den Auszeichnungen der
// Woche, und die Ehrung der Woche, die dieselben Stände liest, hätte ihren
// Spieler der Woche nicht genannt. Gezählt wird ab einer Millisekunde nach
// ihrem Beginn: um Montag 00:00 schließt die Woche davor, und ab Mitternacht
// gezählt stand deren Spieler der Woche ein zweites Mal da — am 19.10.
// „Spieler der Woche ×2" für Leon, einmal für die Woche davor. Die neuen
// Zeichen bleiben, wie die Liga sie in dieser Woche getragen hat — auch mit
// einem Titel.
function rcpWocheLaufbahn(vonMs, bisMs){
  const daten = rcpLaufbahnDaten(vonMs + 1, bisMs + 1);
  const je = new Map(daten.map(x => [x.pid, x]));
  const monate = new Set();
  for(let t = vonMs; t <= bisMs + 864e5; t += 864e5) monate.add(seasonOf(Math.min(t, bisMs)).id);
  monate.forEach(sid => {
    const E = seasonEnd(sid).getTime();
    if(E < vonMs || E > bisMs) return;
    _ehrungSchlussPosten(E, EHRUNG_SCHLUSS.monat).forEach(z => {
      const x = je.get(z.pid);
      if(!x) return;
      z.posten.forEach(q => {
        const alt = x.posten.find(y => y.id === q.id);
        if(!alt) return;
        alt.mal -= q.mal; alt.p = Math.round((alt.p - q.p) * 10) / 10;
      });
      x.posten = x.posten.filter(y => y.mal > 0 && y.p > 0);
      const minus = Math.round(z.summe);
      x.teile.auszeichnung -= minus; x.delta -= minus;
    });
  });
  return daten;
}

// Auto-Trigger: an Mo/Di der neuen Woche einmal pro Gerät
function autoShowPotwRecap(){
  try{
    const now=new Date();
    const wd=wochentagMo(now);
    // Mo/Di — und der Mittwoch dazu, wenn der Monat an einem dieser Tage
    // wechselt: sein Rückblick geht vor, und wer erst am Dienstag öffnete,
    // bekam den Monat und danach keine Woche mehr [§C31].
    const erster=new Date(now.getFullYear(), now.getMonth(), 1);
    const verdraengt=now.getDate()<=3 && wochentagMo(erster)<=1;
    if(wd>=(verdraengt?3:2)) return;
    if(!matches.length) return;
    const {start}=_potwLastWeekRange();
    const wkKey=_potwKeyOf(start);
    if(_recapSeen('potw_shown_'+wkKey, 'potw:'+wkKey)) return;
    // Nichts Offenes zudecken [§C31]
    if(_etwasOffen()) return;
    // Saison-Recap hat Vorrang
    if(seasons.length && now.getDate()<=3){
      const last=seasons[0];
      if(last && last.id!==currentSeason().id && !_recapSeen('recap_shown_'+last.id, 'season:'+last.id)) return;
    }
    if(!potwHasData()) return;
    // Hat sich heute schon ein Rückblick von selbst geöffnet, kommt die Woche
    // morgen [§C31].
    if(_autoRueckblickHeute()) return;
    _autoRecapSeen.add('potw:'+wkKey); // Session-Guard gegen Wiederholung im selben Load
    _autoRueckblickMerken();
    showPotwRecap({auto:true});
  } catch(e){ console.error('POTW auto:',e); }
}

// Ermittelt den letzten ABGESCHLOSSENEN Spieltag mit einem POTD-Kandidaten
// (min. 3 Siege). Wird vom Auto-Recap, vom Knopf "Letzten Tag ansehen" und vom
// News-Generator gelesen — EINE Rechnung für dieselbe Frage [§C27].
// Kein eigener Cache nötig — Aufruf ist nur 1× pro Render, der Hot-Path ist Profil/Sheet.
function _potdLastDayData(){
  if(!matches.length) return null;
  const now=new Date();
  const todayStart=new Date(now); todayStart.setHours(0,0,0,0);
  // Der laufende Spieltag zählt erst, wenn er vorbei ist — und vorbei ist er um
  // 23:59 [§C33]. Ausgeschlossen war früher JEDER Tag ab Mitternacht, damit der
  // Recap nicht mitten im laufenden Spieltag aufspringt. Damit konnte aber auch
  // die Karte "Spieler des Tages" an ihrem eigenen Spieltag nie entstehen: sie
  // ist auf 23:59 desselben Tages datiert, und diese Quelle nannte um 23:59
  // noch den Tag davor. Gemessen erschien der Sieger des 10.09. erst am 11.09.
  // um 00:00 — wer nach dem Spielen die App öffnete, fand die Schlagzeile
  // seines eigenen Spieltags nicht, und an ihrer Stelle stand der Sieger des
  // vorletzten Spieltags.
  const tagEnde=new Date(now); tagEnde.setHours(23,59,0,0);
  const laeuftNoch=now.getTime()<tagEnde.getTime();
  const byDay={};
  for(const m of matches){
    const d=new Date(m.created_at);
    if(laeuftNoch && d>=todayStart) continue;
    const dk=tagKey(d);
    if(!byDay[dk]) byDay[dk]=[];
    byDay[dk].push(m);
  }
  const days=Object.keys(byDay).sort().reverse();
  if(!days.length) return null;
  // Erstes Datum mit qualifiziertem Kandidat (min. 3 Siege)
  const pm=pmap();
  for(const dk of days){
    const dms=byDay[dk];
    const wins={};
    dms.forEach(m=>[m.a1,m.a2,m.b1,m.b2].forEach(id=>{
      const onA=(id===m.a1||id===m.a2);
      const w=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
      if(!wins[id]) wins[id]=0;
      if(w) wins[id]++;
    }));
    const qualified=Object.entries(wins).some(([id,w])=>w>=3 && sichtbar(pm[id]));
    if(qualified) return {dayKey:dk, dayMatches:dms};
  }
  return null;
}

// Die Partien eines bestimmten Spieltags, in derselben Form wie der letzte.
function _potdTagData(dk){
  const dms=matches.filter(m=>tagKey(m.created_at)===dk);
  return dms.length ? {dayKey:dk, dayMatches:dms} : null;
}
// True wenn es einen abgeschlossenen Spieltag mit ≥3-Siegen-Kandidat gibt (für Button-Sichtbarkeit)
function potdHasData(){ return _potdLastDayData()!==null; }

// Player-of-the-Day Recap: zeigt einmal pro Tag pro Gerät den Sieger des letzten Spieltags.
// Mit opts.force=true (vom "Letzten Tag ansehen"-Button) wird der localStorage-Check und
// das Setzen des "shown"-Flags übersprungen, damit der manuelle Aufruf den Auto-Trigger
// für heute nicht unterdrückt. Zusätzlich wird beim Force-Aufruf die Schutz-Phase
// (protectMs) deaktiviert → manueller Aufruf ist sofort per Backdrop-Klick schließbar.
function showPotdRecap(opts){
  opts = opts || {};
  // opts.tag zeigt einen bestimmten Spieltag: die Story „X ist Spieler des
  // Tages" öffnet IHREN Tag. Ohne ihn war nur der letzte zu erreichen, über
  // den Knopf im Liga-Reiter.
  _sheetSetReopen(()=>showPotdRecap(opts.tag ? {force:true, tag:opts.tag} : undefined));
  try{
    const now=new Date();
    if(!matches.length){ if(opts.force) toast('Noch keine Sätze','info'); return; }

    // v9.15 BUGFIX: Der "gesehen"-Guard hing am HEUTIGEN Datum statt am
    // recappten Spieltag. Folge: Gab es dazwischen spielfreie Tage, bekam
    // jeder neue Tag einen frischen Key und derselbe Recap (z.B. "Player of
    // the Day: Dienstag") erschien am Mittwoch UND am Donnerstag erneut.
    // Jetzt ist der Spieltag selbst der Key (analog POTW, das die recappte
    // Woche keyed) → einmal gesehen = nie wieder, egal wie viele spielfreie
    // Tage folgen. Dafür muss der letzte Spieltag VOR dem Guard ermittelt
    // werden (zentral via _potdLastDayData, identisch zum Auto-Trigger).
    const _guardDay=opts.tag ? _potdTagData(opts.tag) : _potdLastDayData();
    if(!_guardDay){ if(opts.force) toast('Noch kein gewerteter Spieltag','info'); return; }
    if(!opts.force && _recapSeen('potd_shown_'+_guardDay.dayKey, 'potd:'+_guardDay.dayKey)) return;

    // Konflikte vermeiden: nicht zeigen wenn ein Sheet offen ist
    // oder der Saison-Recap heute noch ansteht (Vorrang Saison-Recap).
    // Beim manuellen Force-Aufruf werden diese Auto-Trigger-Konflikte übersprungen.
    if(!opts.force){
      const sheetEl=document.getElementById('sheet');
      if(sheetEl && sheetEl.classList.contains('show')) return;
      if(seasons.length && now.getDate()<=3){
        const last=seasons[0];
        if(last && last.id!==currentSeason().id && !_recapSeen('recap_shown_'+last.id, 'season:'+last.id)) return;
      }
      // POTW hat Vorrang am Mo/Di der neuen Woche
      {
        const wd=wochentagMo(now);
        if(wd<2 && potwHasData()){
          const {start}=_potwLastWeekRange();
          if(!_recapSeen('potw_shown_'+_potwKeyOf(start), 'potw:'+_potwKeyOf(start))) return;
        }
      }
    }

    // Letzter Spieltag mit Kandidat — oben bereits ermittelt (Guard).
    const lastDay=_guardDay;
    const lastDayKey=lastDay.dayKey;
    const dayMatches=lastDay.dayMatches;

    // Spieler-Stats für diesen Tag (inkl. längster Serie innerhalb des Tages)
    const ps={};
    const run={};
    const ordered=[...dayMatches].sort((a,b)=>mts(a)-mts(b));
    ordered.forEach(m=>{
      const aWon=m.winner==='A';
      [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
        if(!ps[id]) ps[id]={wins:0,losses:0,gf:0,ga:0,eloDelta:0,bestStreak:0};
        if(run[id]===undefined) run[id]=0;
        const onA=(id===m.a1||id===m.a2);
        const won=(onA&&aWon)||(!onA&&!aWon);
        const gf=onA?m.games_a:m.games_b, ga=onA?m.games_b:m.games_a;
        const d=(m.deltas&&m.deltas[id])||0;
        ps[id].gf+=gf; ps[id].ga+=ga; ps[id].eloDelta+=d;
        if(won){ ps[id].wins++; run[id]=run[id]>=0?run[id]+1:1; }
        else  { ps[id].losses++; run[id]=run[id]<=0?run[id]-1:-1; }
        if(run[id]>ps[id].bestStreak) ps[id].bestStreak=run[id];
      });
    });

    // Player of the Day: min. 3 Siege, Tiebreak via Elo-Delta des Tages.
    const pm=pmap();
    const candidates=_periodeRangliste(ordered, 'tag', true).map(r=>[r.id, ps[r.id]]);
    if(!candidates.length) return;

    const potdId=candidates[0][0];
    const s=candidates[0][1];
    const player=pm[potdId];
    if(!player) return;

    // Datum sprachlich aufbereiten
    const [yy,mm,dd]=lastDayKey.split('-').map(Number);
    const dt=new Date(yy,mm-1,dd);
    const dayStr=dt.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});

    // Anzeige-Werte
    const games=s.wins+s.losses;
    const winrate=games?Math.round((s.wins/games)*100):0;
    const eloDelta=Math.round(s.eloDelta);
    const eloDeltaStr=(eloDelta>=0?'+':'')+eloDelta;

    const uniquePlayers=new Set();
    dayMatches.forEach(m=>[m.a1,m.a2,m.b1,m.b2].forEach(id=>uniquePlayers.add(id)));

    // ─── Höhepunkte des Spieltags ────────────────────────────────────
    // Der Tages-Rückblick zeigte bisher nur den Sieger und vier Zahlen.
    // Ein Spieltag hat aber dieselben Geschichten wie eine Woche, nur
    // kürzer — dieselben drei Kacheln, aus denselben Daten gerechnet.
    // Die meisten gewonnenen Sätze des Tages — beim Tischkicker stand hier
    // der Torjäger.
    const tagSaetze = {};
    dayMatches.forEach(m => {
      [m.a1, m.a2, m.b1, m.b2].forEach(id => {
        const t = teamVon(m, id); if(!t) return;
        const f = partieFuer(m, t);
        if(!tagSaetze[id]) tagSaetze[id] = {g:0, s:0};
        tagSaetze[id].g++; tagSaetze[id].s += f.setsFor;
      });
    });
    const tagScorer = Object.keys(tagSaetze)
      .map(id => ({id, g:tagSaetze[id].g, s:tagSaetze[id].s}))
      .filter(x => x.s > 0 && sichtbar(pm[x.id]))
      .sort((a,b) => b.s - a.s || a.g - b.g)[0];

    let tagUpset = null;
    for(const m of dayMatches){
      const sp = m.exp_a == null ? 0.5 : m.exp_a;
      const chance = m.winner === 'A' ? sp : (1 - sp);
      if(chance < CHANCE_OFFEN && (!tagUpset || chance < tagUpset.chance)) tagUpset = {m, chance};
    }
    const upsetSieger = tagUpset
      ? (tagUpset.m.winner === 'A' ? [tagUpset.m.a1, tagUpset.m.a2] : [tagUpset.m.b1, tagUpset.m.b2])
      : null;

    const tagKacheln = [];
    const tagHl = (ic, label, name, wert, attr) => tagKacheln.push(rcpKachelHtml(
      name ? {ic, label, name, wert, ton:'metall', attr} : {ic, label, leer:true}));
    tagHl('padelBall', 'Meiste Sätze', tagScorer ? pname(tagScorer.id) : null,
          tagScorer ? tagScorer.s + (tagScorer.s === 1 ? ' Satz' : ' Sätze') : null,
          tagScorer ? `data-potd-player="${esc(tagScorer.id)}"` : '');
    // Größter Aufwind ist keine Kachel mehr: die Elo jedes Spielers steht im
    // Feld des Tages, dieselbe Zahl stand sonst zweimal da.
    tagHl('bolt', 'Größte Überraschung', upsetSieger ? pname(upsetSieger[0])+' & '+pname(upsetSieger[1]) : null,
          tagUpset ? Math.round(tagUpset.chance*100)+'\u00A0% Chance' : null,
          upsetSieger ? `data-potd-team="${esc(upsetSieger.slice().sort().join('|'))}"` : '');

    const serieHtml = s.bestStreak >= 3
      ? rcpNotizHtml({ic:'flame',
          text:`Siegesserie von <b class="num">${s.bestStreak}</b> Sätze am Stück`})
      : '';

    openSheet(
      rcpKopfHtml({ic:'trophyDay', marke:'Player of the Day', titel:dayStr,
        meta: rcpMeta([dayMatches.length+' Sätze', uniquePlayers.size+' Spieler'])})
      + rcpHeldHtml({pid:potdId, band:false, px:104, marke:'Spieler des Tages', strahl:true,
          zahlen: rcpZahlenHtml([
            {v:s.wins,      l:'Siege',       ton:'gruen'},
            {v:s.losses,    l:'Niederlagen', ton:'rot'},
            {v:winrate+'\u00A0%', l:'Quote'},
            {v:eloDeltaStr, l:'Elo', ton:eloDelta>=0 ? 'gruen' : 'rot'}
          ])})
      + serieHtml
      // Wie der Tag zustande kam und gegen wen [§C31]: die Bahn ist
      // dasselbe Bild wie im Blatt der Story [§C27].
      + rcpAbschnitt('Der Tag von ' + pname(potdId))
      + _ndTagesbahn(potdId, dayMatches, true) + rcpEloBahnHtml(dayMatches, potdId)
      + rcpAbschnitt('Das Feld des Tages') + rcpFeldHtml(dayMatches, potdId)
      + rcpAbschnitt('Höhepunkte des Tages')
      + `<div class="rcp-awards${tagKacheln.length%2 ? ' ungerade' : ''}">${tagKacheln.join('')}</div>`
      + `<button id="closePotdBtn" class="recap-done-btn">Verstanden</button>`,
      {protectMs: opts.force ? 0 : 2500});

    const _grab = document.getElementById('sheetGrab');
    if(_grab) _grab.classList.add('grab-pulse');

    // Flag SOFORT setzen — sonst löst Wegwischen beim nächsten Laden erneut
    // aus. Beim manuellen Aufruf („Letzten Tag ansehen") NICHT, damit der
    // automatische Rückblick für heute später noch kommen darf.
    if(!opts.force) _recapMarkSeen('potd_shown_'+lastDayKey, 'potd:'+lastDayKey);
    const wurzel = document.getElementById('sheet');
    const zu = document.getElementById('closePotdBtn');
    if(zu) zu.onclick = () => closeSheet();
    wurzel.querySelectorAll('[data-detail],[data-potd-player]').forEach(el => {
      el.onclick = () => sheetNav(()=>showPlayer(el.dataset.detail || el.dataset.potdPlayer));
    });
    wurzel.querySelectorAll('[data-potd-team]').forEach(el => {
      const paar = el.dataset.potdTeam.split('|');
      el.onclick = () => sheetNav(()=>showTeam(paar[0], paar[1]));
    });
  } catch(e){
    console.error('POTD Recap Fehler:',e);
  }
}
