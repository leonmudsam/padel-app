// ─── §11.1 — Story-Generator ─────────────────────────────────────────
// ── Ein Höchststand, der der Gipfel der Liga ist, steht in der Tafel ──
// Wer mit seinem Höchststand zugleich „Der höchste Gipfel" holt, stand
// zweimal mit derselben Zahl im Feed: in der Ewigen Tafel als Rekord und in
// der Karte der Partie als Höchststand. Die Tafel sagt das Größere; der
// Höchststand fällt weg, an Ort und Stelle.
function _ohneDoppeltenGipfel(stories){
  const gipfel = new Set();
  stories.forEach(s => { const d = s.dataRef || {};
    if(/^rekord_/.test(d.type || '') && d.rekordId === 'peak')
      (d.playerIds || []).forEach(pid => gipfel.add(pid + '|' + tagKey(s.when))); });
  for(let i = stories.length; i--;){
    const d = stories[i].dataRef || {};
    if(d.type === 'elo_hoch' && gipfel.has(d.pid + '|' + tagKey(stories[i].when))) stories.splice(i, 1);
  }
  return stories;
}
function _buildStories(){
  const stories = [];
  // Eine leere Liga hat nichts zu erzählen: ohne eine einzige Partie gibt es
  // keine Story, auch keinen Saisonstart und keinen Fun Fact.
  if(!matches || !matches.length) return stories;
  const now = new Date();
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const sortedMatches = [...matches].sort((a,b)=>mts(b)-mts(a)); // neueste zuerst

  // ── ISO-Wochen-Helper (v8.3) ──
  // Liefert "2026-W26" als stabile Pro-Woche-Kennung. Vermeidet, dass
  // "Ruhige Woche"-Stories täglich neu erzeugt werden. ISO-Wochen starten
  // Montag → eine Woche ergibt EINE Story, nicht sieben.
  const isoWeek = (d) => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
    return t.getUTCFullYear() + '-W' + String(weekNum).padStart(2, '0');
  };
  const todayKey = tagKey(now);
  const weekKey  = isoWeek(now);

  // ── Abgeschlossene Zeiträume (v9.5) ──
  // Superlativ-Stories ("größter Elo-Gewinner/-Verlierer", "höchster Sieg",
  // "Krimi", "Upset" … der Woche/des Tages) dürfen sich NUR auf einen bereits
  // ABGESCHLOSSENEN Zeitraum beziehen. Sonst ist die Aussage nicht belastbar —
  // mitten am Tag/in der Woche kann sich der „Gewinner" noch ändern. Wir
  // rechnen deshalb auf „gestern" (voller Kalendertag) bzw. die „vergangene
  // Woche" (letzte abgeschlossene ISO-Woche, Mo–So).
  const _dayMs = 86400000;
  // Gestern und die Vorwoche nach dem Kalender: an einer Zeitumstellung
  // ist ein Tag 23 oder 25 Stunden lang, und mit festen 24 begann „gestern"
  // um 23 Uhr des Vorvortags oder um 1 Uhr.
  const _startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const _startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const _weekStartOf = (ts) => wochenBeginn(ts).getTime();
  const _thisWeekStart = _weekStartOf(now.getTime());
  const _prevWeekStart = _weekStartOf(_thisWeekStart - 3 * _dayMs);
  // Das UTC-Datum der lokalen Mitternacht: in Berlin der Tag davor
  // („Harter Tag" vom 27.10. heißt `…_2026-10-26`). Das ist schief, aber
  // die ID ist veröffentlicht — mit `tagKey` stünde derselbe Tag ein
  // zweites Mal unter neuer ID im Feed, weil die Datenbank nur einfügt.
  const _yesterdayKey  = new Date(_startOfYesterday).toISOString().slice(0,10);
  let   _lastWeekKey   = isoWeek(new Date(_prevWeekStart));

  // ── Der Wochenrückblick: EINE Karte, Sonntag 23:59 ───────────────────
  // Vorher standen sechs Wertungen als sechs eigene Karten über den Montag
  // verteilt (09, 10, 12, 15, 18, 20 Uhr). Gemessen trug ein Montag damit zehn
  // Karten, neun davon zwischen 09 und 20 Uhr — und der Montag ist der
  // Spieltag: die vergangene Woche verdeckte, was gerade passierte.
  // Jetzt sammeln die sechs Blöcke ihre Wertung in `_wochenTeile`, und daraus
  // entsteht am Sonntag um 23:59 eine einzige Karte. Jede Wertung behält ihre
  // Zahl, ihr Gesicht und ihren Weg ins Blatt.
  // Die Grenzen kommen aus _potwLastWeekRange, damit Rückblick, POTW-Karte und
  // Wochenkarte über dasselbe Fenster reden [§C27].
  const _wr = _potwLastWeekRange();
  const _wocheStart = _wr ? _wr.start.getTime() : _prevWeekStart;
  const _wocheEnde  = _wr ? (_wr.end.getTime() + 1) : _thisWeekStart;
  // Sonntag 23:59:05: wenn der Tag zu ist und fünf Sekunden nach dem Spieler
  // des Tages (23:59:00) — der Abschluss der Woche über dem ihres letzten
  // Tages, und beide unter dem des Monats, der um 00:00 kommt [§C33].
  const _wocheSlotTs = _wocheEnde - 60000 + 5000;
  const _wocheDue = now.getTime() >= _wocheSlotTs;
  _lastWeekKey = isoWeek(new Date(_wocheStart));
  const _wochenTeile = [];

  // ── Memoization (v8.4) ──
  // _buildStories ist teuer (~67ms @1k×12 Spieler, ~244ms @10k×20). Solange
  // sich weder Match-Zahl noch _cache.version noch ISO-Woche noch Tag ändern,
  // liefert der Generator dasselbe Ergebnis → Cache zurückgeben, Generator
  // KOMPLETT überspringen. Bei Match-Insert ändert sich matches.length, bei
  // Recalc/Config _cache.version → Key bricht automatisch.
  // Explizite Invalidierung zusätzlich über invalidateCache(['news']) in §3.
  // Slot-Signatur: der 15-Uhr-Slot bricht den Memo-Key, sobald er faellig wird,
  // auch ohne neues Match. Der Tag selbst steht ebenfalls im Schluessel und
  // startet beim naechsten Oeffnen den Nachlauf fuer verpasste stille Tage.
  // Dazu die Zahl der GESPEICHERTEN Fun Facts. `_buildAmbientStories` liest aus
  // `_cache._stories`, welcher Slot schon existiert und welche Typen die Tage
  // davor belegt haben — und der steht beim Kaltstart leer, weil `loadAll`
  // zeichnet, bevor `syncStoriesViaDb` gelaufen ist. Ohne diese Signatur blieb
  // das kalt gezogene Ergebnis die ganze Sitzung im Memo stehen, obwohl der
  // Bestand inzwischen da war. Die Bestandszahl bricht den Schluessel nur nach
  // einer tatsaechlich neu persistierten Ambient-Karte.
  const _ambientBestand = (Array.isArray(_cache._stories) ? _cache._stories : [])
    .reduce((n, s) => n + ((s && typeof s.id === 'string'
                            && s.id.indexOf('ambient_') === 0) ? 1 : 0), 0);
  const _ambientSlotSig = (_isAmbientDay(now)
    ? AMBIENT_SLOTS.filter(h => now.getHours() >= h).length : 0) + 'v' + _ambientBestand;
  // Morgen-Slot (07:00): POTW/POTD-Stories dürfen erst AB 07:00 erscheinen (nicht
  // schon nachts um 00:xx). Die Signatur kippt 0→1 um 07:00 und bricht dann den
  // Memo-Key, damit die Story ohne neues Match / ohne Reload auftaucht — analog
  // zum 19:00-Slot.
  // Der Spieler des Tages erscheint um 23:59 desselben Tages, nicht mehr um
  // 07:00 des Folgetags. Vorher stand die Karte in der Tafel unter einem Datum,
  // an dem gar nicht gespielt wurde. Die Signatur kippt um 23:59 und bricht
  // dann den Memo-Key, damit die Karte ohne Reload erscheint.
  const _morningSlotSig = (now.getHours() * 60 + now.getMinutes()) >= (23 * 60 + 59) ? 1 : 0;
  // Dasselbe für den Wochenrückblick: der Schalter kippt am Sonntag um
  // 23:59:05 und bricht den Memo-Key, sonst erschiene die Karte erst nach dem
  // nächsten Match oder Reload.
  const _weekSlotSig = _wocheDue ? 1 : 0;
  // Die Runde der Vier entsteht dreißig Minuten nach ihrer letzten Partie,
  // auch ohne neue Partie: die Zahl der geschlossenen Runden bricht den Key.
  let _rundenSig = 0;
  try { const _rn = now.getTime(); _rundenSig = _spBasis().runden.filter(r => r.t + RUNDE_PAUSE_MS <= _rn).length; } catch(e){}
  // Und die Partien, die für diese Uhr noch in der Zukunft liegen. Den
  // Zeitpunkt einer Partie setzt der Server, `now` das Telefon: geht dessen
  // Uhr zwei Sekunden nach, gilt die gerade gespeicherte Partie im ersten
  // Lauf als künftig, ihre Karten fehlen — und der Memo hielt genau dieses
  // Ergebnis fest, bis eine neue Partie kam. Gemessen fehlte so die
  // Siegesserie der vorletzten Partie eines Spieltags dauerhaft. Holt die
  // Uhr die Partie ein, ändert sich die Zahl und der Lauf wiederholt sich.
  let _zukunft = 0;
  for(let i = matches.length - 1; i >= 0 && mts(matches[i]) > now.getTime(); i--) _zukunft++;
  const _buildStoriesKey = matches.length + '_' + _cache.version + '_' + weekKey + '_' + todayKey + '_' + _ambientSlotSig + '_' + _morningSlotSig + '_' + _weekSlotSig + '_' + _rundenSig + '_' + _zukunft;
  if(_cache._buildStoriesKey === _buildStoriesKey && Array.isArray(_cache._buildStoriesResult)){
    return _cache._buildStoriesResult;
  }

  // Älteste zuerst, einmal für alle Serien unten: dieselbe Sortierung stand
  // fünfmal ausgeschrieben, jede kopierte und sortierte die ganze Liga neu.
  // Die Sortierung ist stabil, und jede Stelle liest nur.
  const chronoMatches = [...matches].sort((a, b) => mts(a) - mts(b));
  // Eine Partie nach ihrer ID: `matches.find` lief je Serie und je
  // Spielkarte einmal über die ganze Liga.
  const matchVonId = new Map(matches.map(m => [m.id, m]));

  // ── Helper-Refs einmalig (v8.4) ──
  // getHistoryByMatchId() und getRankSnapshots() sind bereits gecached, aber
  // jeder Aufruf prüft den Cache-Key neu. Einmal pro Generator-Lauf
  // referenzieren spart wiederholten Lookup-Overhead — mehrere Story-Typen
  // (elo_swing_week, elo_swing_day, upset_match, Führungswechsel) brauchen sie.
  const histMap = getHistoryByMatchId();
  const snaps   = getRankSnapshots();

  // ── Pre-Group: matches pro Spieler ──
  // O(N) statt O(N × N_players) für jeden späteren filter()-Aufruf.
  // matches ist asc-sortiert (loadAll) → byPlayer[pid] ist ebenfalls asc.
  // Bei 100k Matches × 50 Spielern: ~400k push-ops vs ~50M filter-ops.
  const byPlayer = {};
  matches.forEach(m => {
    const ids = [m.a1, m.a2, m.b1, m.b2];
    for(let i=0; i<4; i++){
      const pid = ids[i];
      if(!byPlayer[pid]) byPlayer[pid] = [];
      byPlayer[pid].push(m);
    }
  });

  // ── 1. Saison-Endspurt ──
  // Die letzten sieben Tage einer Saison, und die Entscheidung ist offen.
  // Vorher entstand die Karte an jedem dieser Tage, egal wie klar die Sache
  // war: gemessen stand „Noch 5 Tage" auch bei 91 Elo Vorsprung da, und der
  // Text erklärte dann selbst, dass nichts mehr dazwischenkommt. Ein
  // Countdown ohne Spannung ist kein Ereignis. Jetzt drei Bedingungen —
  // Frist, Abstand und eine belastbare Rangliste —, und damit ist die Karte
  // selten genug, um Breaking zu sein [§C33].
  try {
    const daysLeft = seasonDaysLeft();
    const _espSid = currentSeason().id;
    const _espFrei = _storyRangFrei(_espSid);
    if(daysLeft > 0 && daysLeft <= 7 && _espFrei.frei){
      const sid = _espSid;
      const sim = getGlobalSim();
      const endElos = sim.elo || {};
      const playedMap = (sim.seasonPlayed && sim.seasonPlayed[sid]) || {};
      const rankList = Object.keys(endElos)
        .filter(pid => sichtbar(pm[pid]) && (playedMap[pid]||0) > 0)
        .map(pid => ({pid, elo: Math.round(endElos[pid])}))
        .sort((a,b)=>b.elo-a.elo);
      const gap = rankList.length >= 2 ? rankList[0].elo - rankList[1].elo : Infinity;
      if(rankList.length >= 2 && gap <= SAISON_ENDSPURT_ELO){
        stories.push({
          id: 'season_endspurt_'+sid,
          cat: 'highlight',
          ic: 'saisonKal',
          title: `Noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'} um den Monat`,
          desc: `${nameOf(rankList[0].pid)} führt mit ${rankList[0].elo} Elo, `
              + `${nameOf(rankList[1].pid)} liegt ${gap} dahinter.`,
          // NICHT `now`: der Zeitstempel wäre der Moment, in dem jemand die
          // App öffnet, und die Karte stünde im Feed über der letzten Partie
          // statt unter ihr. Sie beschreibt den Stand nach dem letzten
          // Spieltag, also gehört sie dorthin.
          when: matches.length ? new Date(mts(matches[matches.length - 1])) : now,
          prio: STORY_PRIO.season_endgame,
          dataRef: {type:'season_endgame', sid, leader:rankList[0], second:rankList[1],
                    daysLeft, gap, playerIds:[rankList[0].pid, rankList[1].pid]}
        });
      }
    }
  } catch(e){ /* defensiv */ }

  // ── 2. Saisonstart: die erste belastbare Tabelle ───────────────────
  // Die Karte stand einmal an den ersten drei Tagen einer Saison und sagte
  // „alle starten bei 1000 Elo" — eine Bauanleitung, keine Nachricht. Vor
  // allem aber war sie das kleinste Problem: nach jedem Monatswechsel machte
  // die erste Partie ihren Sieger zum Tabellenfuehrer, und daraus entstand
  // eine Kette von Breaking-Karten ueber eine Tabelle, die es noch nicht gab.
  //
  // Es gibt deshalb genau EINE Karte je Saison, und sie kommt, sobald die
  // Rangliste belastbar ist [§11.0e]: genug Partien UND genug Spieler, die
  // wirklich dabei waren. Sie nennt den Stand, den sie freigibt — bis dahin
  // steht ueber die Tabelle nichts im Feed.
  try {
    const sid = currentSeason().id;
    // Die Karte steht an der Partie, die die Tabelle freigegeben hat — und
    // sie nennt den Stand DIESER Partie. Sie rechnete mit dem Stand von
    // heute: gemessen stand am 04.08. „Martin führt mit 390 Elo, 11 vor Leon.
    // Gewertet sind 107 Partien" — die Zahlen des 26.08., und sie wuchsen mit
    // jeder Partie des Monats weiter, unter einem Datum, das stehen blieb.
    const saison = matchesInSeason(sid).slice().sort((a, b) => mts(a) - mts(b));
    let frei = {frei:false}, k = -1;
    for(let i = STORY_RANG_MIN_PARTIEN - 1; i < saison.length; i++){
      const f = _storyRangFrei(sid, mts(saison[i]));
      if(f.frei){ frei = f; k = i; break; }
    }
    if(frei.frei){
      // Der Elo-Stand nach der freigebenden Partie: der letzte Stand jedes
      // Spielers aus der Elo-Bahn, bis dorthin [§11.0e].
      const hm = getHistoryByMatchId();
      const stand = {};
      for(let i = 0; i <= k; i++){
        const h = hm.get(saison[i].id);
        if(h && h.eloAfter) Object.keys(h.eloAfter).forEach(pid => { stand[pid] = h.eloAfter[pid]; });
      }
      const rang = Object.keys(stand)
        .filter(pid => sichtbar(pm[pid]))
        .map(pid => ({pid, elo: Math.round(stand[pid])}))
        .sort((a, b) => b.elo - a.elo);
      if(rang.length >= 2){
        const vor = rang[0].elo - rang[1].elo;
        stories.push({
          id: 'season_start_' + sid,
          cat: 'season',
          ic: 'saisonKal',
          title: `${currentSeason().label} hat eine Tabelle`,
          desc: `${nameOf(rang[0].pid)} führt mit ${rang[0].elo} Elo, `
              + `${vor} vor ${nameOf(rang[1].pid)}. `
              + `Gewertet sind ${frei.partien} Sätze und `
              + `${frei.genug} Spieler mit mindestens vier Einsätzen.`,
          // Der Zeitpunkt ist die Partie, die die Tabelle freigegeben hat,
          // und nicht der Moment des Nachschlagens: eine Karte, die beim
          // Oeffnen der App entsteht, traegt sonst den Zeitstempel des
          // Lesers [§C33].
          when: new Date(saison[k].created_at),
          prio: STORY_PRIO.season_start,
          dataRef: {type:'season_start', sid,
                    leader:rang[0], second:rang[1], gap:vor,
                    // Der Vorsprung als Bildzone: die Karte trug sonst nur
                    // zwei Wappen und sagte vor dem Lesen nichts ueber die
                    // Lage [§C27].
                    vv:String(vor), vl:'Elo Vorsprung',
                    partien:frei.partien, aktive:frei.genug, gebraucht:frei.gebraucht}
        });
      }
    }
  } catch(e){}

  // ── 3. Das Titelrennen eines Tages ─────────────────────────────────
  // Es gab eine Karte je Wechsel, und der Vergleich lief nur ueber die
  // LETZTE Partie: wechselte die Spitze am Nachmittag und am Abend zurueck,
  // entstanden zwei Breaking-Karten mit fast demselben Satz — und wechselte
  // sie mitten am Tag, entstand gar keine, weil vor der letzten Partie schon
  // der neue Erste oben stand.
  //
  // Gefragt ist deshalb der ganze Tag: jeder Wechsel auf Platz 1 wird
  // gesammelt, und daraus wird EINE Karte mit dem Endstand. Die Wechsel
  // stehen einzeln in `events` und damit im Blatt, mit Uhrzeit, Partie,
  // Vorgaenger und Vorsprung. Vor der Freigabe der Rangliste [§11.0e]
  // entsteht sie gar nicht.
  try {
    const sid = currentSeason().id;
    const frei = _storyRangFrei(sid);
    const saison = matchesInSeason(sid).slice().sort((a, b) => mts(a) - mts(b));
    const tg = saison.length ? _storyTagGrenzen(mts(saison[saison.length - 1])) : null;
    if(frei.frei && tg){
      const sim = getGlobalSim();
      const played = (sim.seasonPlayed && sim.seasonPlayed[sid]) || {};
      const rang = Object.keys(sim.elo || {})
        .filter(pid => sichtbar(pm[pid]) && (played[pid] || 0) > 0)
        .map(pid => ({pid, elo: Math.round(sim.elo[pid])}))
        .sort((a, b) => b.elo - a.elo);
      const desTages = saison.filter(m => mts(m) >= tg.vonMs && mts(m) <= tg.letzte);
      // Wer vor einer Partie Erster war, steht fertig in `preTop1`. Nach ihr
      // ist es der vor der naechsten — und nach der letzten der Stand von
      // jetzt. So braucht der Tag genau einen Durchlauf.
      const top1 = m => { const sn = snaps[m.id]; return sn ? (sn.preTop1 || null) : null; };
      const wechsel = [];
      desTages.forEach((m, i) => {
        const a = top1(m);
        const b = (i + 1 < desTages.length) ? top1(desTages[i + 1])
                                            : (rang[0] ? rang[0].pid : null);
        if(a && b && a !== b) wechsel.push({m, vor:a, nach:b, ts:mts(m)});
      });
      if(wechsel.length && rang.length){
        const letzter = wechsel[wechsel.length - 1];
        const fuehrt = rang[0], zweiter = rang[1] || null;
        const abstand = zweiter ? fuehrt.elo - zweiter.elo : 0;
        const m = letzter.m;
        // ── Die Schlagzeile sagt, was passiert ist ──────────────────
        // Sie trug das Ergebnis der entscheidenden Partie („Stefan und
        // Julian gewinnen 10:7. Martin fuehrt die Tabelle"), und genau
        // dieses Ergebnis steht als Band ueber dem Text [§C33]: zwei Saetze
        // in einer Ueberschrift, und der erste davon eine Zeile hoeher noch
        // einmal als Bild. Uebrig bleibt der Vorgang. Ob die Spitze neu
        // uebernommen oder am selben Tag zurueckgeholt wurde, sagt der
        // erste Wechsel des Tages.
        // ── Der Vorgaenger ist der DIREKTE Vorgaenger ───────────────
        // Genannt war, wer am Morgen oben stand. Wechselte die Spitze an
        // einem Tag von A zu B und zurueck zu A, war A damit sein eigener
        // Vorgaenger: das Blatt stellte denselben Spieler als „neuer #1"
        // und „vorher #1" gegenueber, und der Breaking-Nachsatz schrieb „A
        // verdraengt A". Der Vorgaenger des LETZTEN Wechsels ist nie der
        // neue Erste — ein Wechsel hat zwei verschiedene Seiten.
        const vorher = letzter.vor;
        const zurueck = fuehrt.pid === wechsel[0].vor;
        const title = zurueck
          ? `${nameOf(fuehrt.pid)} holt die Tabellenspitze zurück`
          : `${nameOf(fuehrt.pid)} übernimmt die Tabellenspitze`;
        const malWort = ['', 'einmal', 'zweimal', 'dreimal', 'viermal', 'fünfmal'];
        const wieOft = malWort[wechsel.length] || (wechsel.length + '-mal');
        // Der Satz nennt den Stand, den Vorsprung und den Vorgaenger — und
        // nicht mehr die Partie, die das Band darueber zeigt.
        const desc = [
          `${nameOf(fuehrt.pid)} steht mit ${fuehrt.elo} Elo oben`
            + (zweiter ? `, ${abstand} vor ${nameOf(zweiter.pid)}` : '') + '.',
          `Vorher stand dort ${nameOf(vorher)}.`,
          wechsel.length > 1 ? `Die Spitze wechselte an diesem Tag ${wieOft}.` : ''
        ].filter(Boolean).join(' ');
        const ereignisse = wechsel.map(w => _storyEreignis({
          type:'lead_change', occurredAt:new Date(w.ts).toISOString(), matchId:w.m.id,
          actorIds:[w.nach, w.vor], subjectKey:'rang1',
          title:`${nameOf(w.nach)} übernimmt Platz 1`,
          text:`${nameOf(w.vor)} gibt die Spitze ab.`,
          evidence:standFuer(w.m),
          importance:9,
          detail:{vor:w.vor, nach:w.nach}
        }));
        stories.push({
          // Eine ID je Tag: ein zweiter Wechsel ergaenzt die Karte, er legt
          // keine zweite an. Der Tag steht darin, damit ein Wechsel von
          // morgen eine eigene Geschichte bleibt.
          id: `lead_day_${sid}_${tg.tag}`,
          cat: 'highlight',
          ic: 'kingClass',
          title, desc,
          when: new Date(letzter.ts),
          prio: STORY_PRIO.lead_change,
          dataRef: {type:'lead_change', sid,
                    newLeader:fuehrt.pid, prevLeader:vorher,
                    matchId:m.id, dayKey:tg.tag,
                    elo:fuehrt.elo, gap:abstand, wechsel:wechsel.length,
                    zurueck,
                    playerIds:[fuehrt.pid, vorher],
                    causalKey:_storyGruppeKey('leader', tg.tag),
                    events:ereignisse}
        });
      }
    }
  } catch(e){}

  // ── 3b. Team-News: gemeinsame Siegesserie eines Duos ────────────────
  // Gerechnet wurde der Stand NACH der letzten Partie der Liga, und die ID
  // trug die Laenge (`team_streak_A_B_7`): jede Laenge wurde einzeln
  // persistiert, und aus einer Serie, die von fuenf auf zehn wuchs, standen
  // vier Karten im Feed. Der Ausweg war ein Filter, der jede Karte wegnahm,
  // deren Laenge die LEBENDE Serie nicht mehr erreicht — und damit verschwand
  // die 5er-Marke vom Dienstag, sobald die Serie am Mittwoch riss. Eine Karte,
  // die zu ihrem Zeitpunkt richtig war, bleibt richtig [§C33].
  //
  // Die Marke ist deshalb ein Ereignis ihrer Partie, genau wie die Serie eines
  // Einzelspielers: der Lauf ueber die Partien in Spielreihenfolge, die Marke
  // an der ausloesenden Partie, und die ID aus Duo, Partie und Laenge. Sie
  // haengt sich damit auch an die Karte ihres Spiels.
  try {
    const seit = now.getTime() - NEWS_FENSTER_TAGE * _dayMs;
    const TEAM_STREAK_MS = new Set([5, 7, 10, 15, 20]);
    const lauf = {}, laufStart = {}, kand = [], zus = {};
    chronoMatches.forEach(m => {
      if(mts(m) > now.getTime()) return;
      [[m.a1, m.a2, m.winner === 'A'], [m.b1, m.b2, m.winner === 'B']].forEach(([x, y, won]) => {
        if(!x || !y) return;
        const ids = [x, y].sort(), k = ids.join('|');
        const z = zus[k] || (zus[k] = {s:0, n:0});
        z.n++; if(won) z.s++;
        lauf[k] = won ? (lauf[k] || 0) + 1 : 0;
        if(lauf[k] === 1) laufStart[k] = m.id;
        const n = lauf[k];
        if(!(TEAM_STREAK_MS.has(n) || (n > 20 && n % 5 === 0))) return;
        if(mts(m) < seit) return;
        kand.push({ids, streak:n, when:new Date(m.created_at), matchId:m.id,
                   lauf:laufStart[k] || '', s:z.s, n:z.n});
      });
    });
    // Eine Serie je Duo und Tag, die laengste: die laengere enthaelt die
    // kuerzere, und beide untereinander sind eine Nachricht und eine
    // Wiederholung [§C33].
    const jeTag = new Map();
    kand.forEach(c => {
      const k = c.ids.join('|') + '@' + tagKey(c.when);
      const alt = jeTag.get(k);
      if(!alt || c.streak > alt.streak) jeTag.set(k, c);
    });
    [...jeTag.values()].sort((a, b) => b.when - a.when || b.streak - a.streak)
      .slice(0, 3).forEach(t => {
      stories.push({
        id: 'team_streak_' + t.ids.join('_') + '_' + t.matchId + '_' + t.streak,
        cat: 'team',
        ic: 'unstoppable',
        title: `${nameOf(t.ids[0])} und ${nameOf(t.ids[1])} gewinnen zusammen zum ${t.streak}. Mal in Folge`,
        // „Zehn gemeinsame Spiele, zehn Siege." las sich, als hätten die
        // beiden nur zehnmal zusammen gespielt — darunter stand „spielen zum
        // 75. Mal zusammen". Die Bilanz bis zu dieser Partie sagt, was die
        // Serie für dieses Duo bedeutet.
        desc: t.n > t.streak
          ? `Zusammen ${t.s} Siege aus ${t.n} Sätzen.`
          : `Jeder gemeinsame Satz gewonnen.`,
        when: t.when,
        prio: STORY_PRIO.team_streak + (t.streak >= 7 ? 4 : 0),
        dataRef: {type:'team_streak', a:t.ids[0], b:t.ids[1], streak:t.streak,
                  matchId:t.matchId, lauf:t.lauf}
      });
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] team_streak', e); }

  // ── 3c. Team-News: gemeinsame Niederlagenserie eines Duos ───────────
  // Pendant zu 3b, ab drei gemeinsamen Niederlagen in Folge — und aus demselben
  // Grund ein Ereignis ihrer Partie und kein Stand von heute.
  try {
    const seit = now.getTime() - NEWS_FENSTER_TAGE * _dayMs;
    const TEAM_LOSS_MS = new Set([3, 5, 7, 10]);
    const lauf = {}, laufStart = {}, ersteT = {}, kand = [];
    chronoMatches.forEach(m => {
      if(mts(m) > now.getTime()) return;
      [[m.a1, m.a2, m.winner === 'A'], [m.b1, m.b2, m.winner === 'B']].forEach(([x, y, won]) => {
        if(!x || !y) return;
        const ids = [x, y].sort(), k = ids.join('|');
        lauf[k] = won ? 0 : (lauf[k] || 0) + 1;
        // Wann die Serie begann — ohne das Datum sagt die Karte fuer jedes Duo
        // wortwoertlich dasselbe.
        if(lauf[k] === 1){ laufStart[k] = m.id; ersteT[k] = new Date(m.created_at); }
        const n = lauf[k];
        if(!(TEAM_LOSS_MS.has(n) || (n > 10 && n % 5 === 0))) return;
        if(mts(m) < seit) return;
        kand.push({ids, streak:n, when:new Date(m.created_at), matchId:m.id,
                   lauf:laufStart[k] || '', firstT:ersteT[k]});
      });
    });
    const jeTag = new Map();
    kand.forEach(c => {
      const k = c.ids.join('|') + '@' + tagKey(c.when);
      const alt = jeTag.get(k);
      if(!alt || c.streak > alt.streak) jeTag.set(k, c);
    });
    [...jeTag.values()].sort((a, b) => b.when - a.when || b.streak - a.streak)
      .slice(0, 3).forEach(t => {
      stories.push({
        id: 'team_loss_streak_' + t.ids.join('_') + '_' + t.matchId + '_' + t.streak,
        cat: 'team',
        ic: 'trendCrash',
        title: `${nameOf(t.ids[0])} und ${nameOf(t.ids[1])} verlieren zusammen zum ${t.streak}. Mal in Folge`,
        // Der Satz war fuer jedes Duo derselbe und stand damit wortgleich
        // zweimal im Feed. Die Zahl steht in der Schlagzeile; hier steht,
        // seit wann. „Seit dem 04.11. gehen drei gemeinsame Spiele in Folge
        // verloren" stand unter „verlieren zusammen zum 3. Mal in Folge".
        desc: `Ohne gemeinsamen Sieg seit dem ${tagImSatz(t.firstT || t.when)}`,
        when: t.when,
        prio: STORY_PRIO.team_loss_streak + (t.streak >= 7 ? 4 : 0),
        dataRef: {type:'team_loss_streak', a:t.ids[0], b:t.ids[1], streak:t.streak,
                  matchId:t.matchId, lauf:t.lauf}
      });
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] team_loss_streak', e); }

  // ── 4. Über dem eigenen Schnitt (letzte 10 gegen die Laufbahn davor) ──
  // Gemessen wird der ABSTAND, nicht das Niveau [§11.0b]. „Neun von zehn"
  // konnte nur holen, wer ohnehin die beste Quote der Liga hat; gemessen
  // nannte die Karte über die ganze Ligageschichte vier Spieler, einen davon
  // zehnmal. Wer von 42 auf 70 Prozent springt, hat mehr getan als wer von
  // 63 auf 70 kommt — und davon erfuhr der Feed nichts.
  //
  // Sie war ein Stand von HEUTE, gerechnet nach der letzten Partie der Liga,
  // und ein Filter nahm sie weg, sobald der Vorsprung wieder fiel. Damit
  // verschwand eine Karte, die zu ihrem Zeitpunkt richtig war — und im Lauf
  // desselben Spieltags verschob sich das Fenster schon so weit, dass die
  // eigene Karte vom Mittag als veraltet galt: gemessen wurden acht gebildet
  // und keine einzige gezeigt. Der Sprung gehoert deshalb der Partie, mit der
  // er entstanden ist: gerechnet wird nach JEDER Partie eines Spielers, und
  // gemeldet wird der Uebertritt ueber die Schwelle, nicht der Zustand.
  try {
    const seit = now.getTime() - NEWS_FENSTER_TAGE * _dayMs;
    const kand = [];
    // Aus seinen eigenen Partien: auch nach dem Karriereende eine Nachricht
    // über das, was er gespielt hat [§C40].
    players.filter(p => sichtbar(p)).forEach(p => {
      // byPlayer ist asc-sortiert (=aeltestes first).
      const arr = byPlayer[p.id] || [];
      if(arr.length < FORM_FENSTER + FORM_BASIS_MIN) return;
      // Praefixsumme der Siege, damit jedes Fenster in O(1) faellt.
      const pre = [0];
      for(let i = 0; i < arr.length; i++) pre.push(pre[i] + (won(p.id, arr[i]) ? 1 : 0));
      let drin = false;
      for(let i = FORM_FENSTER + FORM_BASIS_MIN - 1; i < arr.length; i++){
        const bis = i + 1;
        const wins = pre[bis] - pre[bis - FORM_FENSTER];
        const qJetzt = wins / FORM_FENSTER;
        const nDavor = bis - FORM_FENSTER;
        const qBasis = pre[nDavor] / nDavor;
        const vor = qJetzt - qBasis;
        const jetztDrin = vor >= FORM_VORSPRUNG;
        // Nur der Uebertritt ist eine Nachricht. Bleibt der Vorsprung ueber
        // mehrere Partien stehen, ist das dieselbe Aussage und nicht jede
        // Partie neu.
        if(jetztDrin && !drin){
          const m = arr[i];
          if(mts(m) >= seit && mts(m) <= now.getTime())
            kand.push({pid:p.id, wins, qJetzt, qBasis, vorsprung:vor,
                       when:new Date(m.created_at), matchId:m.id});
        }
        drin = jetztDrin;
      }
    });
    // Der groesste Sprung zuerst, nicht die hoechste Quote: die Karte handelt
    // vom Abstand.
    kand.sort((a, b) => b.vorsprung - a.vorsprung || b.when - a.when);
    kand.slice(0, NEWS_LIMITS.topForm).forEach(c => {
      stories.push({
        id: 'top_form_' + c.pid + '_' + c.matchId,
        cat: 'highlight',
        ic: 'flame',
        // Kein Possessivpronomen über einen Spieler [§6]: „über dem eigenen
        // Schnitt", nicht „über seinem Schnitt".
        title: `${nameOf(c.pid)} spielt über dem eigenen Schnitt`,
        desc: `${Math.round(c.qJetzt * 100)} % aus den letzten ${FORM_FENSTER} Sätzen. `
            + `Über die Laufbahn davor sind es ${Math.round(c.qBasis * 100)} %.`,
        when: c.when,
        prio: STORY_PRIO.top_form + (c.vorsprung >= 0.4 ? 4 : 2),
        dataRef: {type:'top_form', pid: c.pid, wins: c.wins, matchId: c.matchId,
                  qJetzt: Math.round(c.qJetzt * 100), qBasis: Math.round(c.qBasis * 100),
                  vorsprung: Math.round(c.vorsprung * 100)}
      });
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] top_form', e); }

  // ── 5. Niederlagenserie als Ereignis ihrer Partie ───────────────────
  // Gezaehlt wurde die LAUFENDE Serie, und die ID trug das Datum des Laufs:
  // die Karte war damit eine Behauptung ueber heute, und ein Filter nahm sie
  // weg, sobald die Serie riss. Damit verschwand eine Karte, die zu ihrem
  // Zeitpunkt richtig war — genau das, was der Feed nie tun darf [§C33]. Die
  // Marke gehoert deshalb ihrer Partie, wie die Siegesserie.
  try {
    const seit = now.getTime() - NEWS_FENSTER_TAGE * _dayMs;
    const marken = new Set([5, 8, 10]);
    const lauf = {}, laufStart = {}, kand = [];
    chronoMatches.forEach(m => {
      if(mts(m) > now.getTime()) return;
      const aGewinnt = m.winner === 'A';
      [[m.a1, aGewinnt], [m.a2, aGewinnt], [m.b1, !aGewinnt], [m.b2, !aGewinnt]]
        .forEach(([pid, sieg]) => {
        if(!pid) return;
        lauf[pid] = sieg ? 0 : (lauf[pid] || 0) + 1;
        if(lauf[pid] === 1) laufStart[pid] = m.id;
        const n = lauf[pid];
        if(!(marken.has(n) || (n > 10 && n % 5 === 0))) return;
        if(mts(m) < seit) return;
        // Der Zeitpunkt der Partie, mit der die Serie angefangen hat: die
        // Karte nennt ihn im Satz, damit sie nicht zweimal dasselbe sagt.
        const _st = matchVonId.get(laufStart[pid]);
        kand.push({pid, streak:n, when:new Date(m.created_at), matchId:m.id,
                   lauf:laufStart[pid] || '', seit:_st ? mts(_st) : 0});
      });
    });
    // Eine Serie je Spieler und Tag, die laengste.
    const jeTag = new Map();
    kand.forEach(c => {
      const k = c.pid + '|' + tagKey(c.when);
      const alt = jeTag.get(k);
      if(!alt || c.streak > alt.streak) jeTag.set(k, c);
    });
    [...jeTag.values()].sort((a, b) => b.when - a.when || b.streak - a.streak)
      .slice(0, NEWS_LIMITS.lossStreak).forEach(c => {
      stories.push({
        id: 'loss_streak_' + c.pid + '_' + c.matchId + '_' + c.streak,
        cat: 'misfortune',
        ic: c.streak >= 7 ? 'dropTriple' : 'dropDouble',
        title: `${nameOf(c.pid)} verliert zum ${c.streak}. Mal in Folge`,
        // ── Der zweite Satz nennt eine neue Zahl ─────────────────────
        // Er hiess „So lange hat Leo nicht mehr gewonnen": die Zahl stand
        // schon im ersten Satz, der Name in der Schlagzeile, und eine neue
        // Angabe kam nicht dazu [§C33]. Der Tag, an dem die Serie anfing,
        // sagt etwas, das sonst nirgends steht — die Duo-Pleitenserie macht
        // es seit jeher so.
        // Die Zahl steht in der Schlagzeile wie in der Zeile der Partie
        // („verliert zum 5. Mal in Folge"); „Fünf Niederlagen am Stück."
        // darunter sagte sie ein zweites Mal. Den Punkt setzt `tagImSatz`.
        desc: c.seit ? `Der letzte Sieg liegt vor dem ${tagImSatz(c.seit)}` : '',
        when: c.when,
        prio: STORY_PRIO.loss_streak + (c.streak >= 8 ? 4 : 0),
        dataRef: {type:'loss_streak', pid: c.pid, streak: c.streak,
                  matchId:c.matchId, lauf:c.lauf}
      });
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] loss_streak', e); }

  // ── Die Spieltage des Fensters und was sie vergaben [§11.6f] ─────────
  // Je Spieltag die Ehrung des Tages (`_ehrungDesTages`): alles, was an ihm
  // geholt wurde, aus den Partien und mit dem Schluss um 23:59. Sie ist Teil
  // der Karte des Spielers des Tages; ohne ihn steht sie als eine Karte des
  // Tages (`tagesehrung_<Tag>`). Eine Karte, die den Tag zusammenfasst, und
  // keine zweite: es gab daneben eine Ehrung je Runde, zwei Stunden nach
  // ihrer letzten Partie, und an einem Spieltag standen bis zu drei davon
  // und der Spieler des Tages untereinander, jede mit einem Teil des Tages.
  // Gerechnet vor den Auszeichnungen (6.): was die Karte des Tages trägt,
  // steht in keiner eigenen Karte um 23:57, je 'Tag|Spieler|Auszeichnung'
  // (`_tagGetragen`). Breaking fragt nur, was der Schluss vergab
  // (`_ehrungTagesSchluss`). Endet mit dem Tag eine Woche oder ein Monat,
  // trägt deren Ehrung den Tag (`_ehrungGroessere`): der Spieler des Tages
  // steht ohne Ehrung, ein Tag ohne ihn hat keine Karte — getragen ist er
  // trotzdem, in der größeren.
  const _potdTage = new Map(), _ehrungTage = new Map(), _tagGetragen = new Set();
  try {
    const seit = now.getTime() - NEWS_FENSTER_TAGE * 86400000;
    const tage = new Map();
    matches.forEach(m => {
      const ts = mts(m);
      if(ts < seit || ts > now.getTime()) return;
      const dk = tagKey(ts);
      let l = tage.get(dk);
      if(!l){ l = []; tage.set(dk, l); }
      l.push(m);
    });
    tage.forEach((dayMatches, dayKey) => {
      // Die Karte steht um 23:59 DESSELBEN Tages, nicht am Morgen danach: um
      // 23:59 kann keine Partie mehr dazukommen (die spaeteste der Liga hat um
      // 18 Uhr angefangen), und die Karte steht damit unter dem Datum, an dem
      // gespielt wurde.
      const rep = new Date(dayKey + 'T00:00:00'); rep.setHours(23, 59, 0, 0);
      if(now.getTime() < rep.getTime()) return;
      // Tages-Regel = meiste Siege (Tiebreak Elo-Delta) — identisch zu
      // showPotdRecap und zum Badge-Zaehler countDayWins.
      const res = _newsPeriodWinner(dayMatches, 'tag');
      let ehrung = [], brk = false, groesser = '';
      try {
        ehrung = _ehrungDesTages(rep.getTime());
        groesser = _ehrungGroessere(rep.getTime());
        brk = !groesser && _ehrungBrkGrund('tag', rep.getTime()).length > 0;
      } catch(e){ ehrung = []; }
      ehrung.forEach(x => x.posten.forEach(q => _tagGetragen.add(dayKey + '|' + x.pid + '|' + q.id)));
      if(groesser) ehrung = [];
      if(res) _potdTage.set(dayKey, {rep, res, ehrung, brk, groesser});
      else if(ehrung.length) _ehrungTage.set(dayKey, {rep, ehrung, brk});
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] potd tage', e); }

  // ── 6. Badge freigeschaltet (letzte 7 Tage) ──
  // Tap-Quelle: getBadgeEarnedCache. Wir zeigen die NEUSTEN N freigeschalteten,
  // Dubletten pro Spieler+Badge dedupliziert.
  try {
    const cutoff = now.getTime() - 7*86400000;
    const bMap = getBadgeEarnedCache();
    const badgeMatches = new Map(matches.map(m => [m.id,m]));
    const events = [];
    for(const mid in bMap){
      const arr = bMap[mid];
      if(!arr || !arr.length) continue;
      const matchObj = badgeMatches.get(mid);
      if(!matchObj) continue;
      const t = mts(matchObj);
      if(t < cutoff) continue;
      // Was einen ganzen Tag beschreibt, steht am Ende dieses Tages und
      // nicht in der Karte seiner letzten Partie: es entsteht erst, wenn der
      // Tag zu ist, und jene Karte stand da schon (`tagEnde`,
      // `getBadgeEarnedCache`). 23:57, unter dem Spieler des Tages (23:59)
      // und dem härtesten Tag (23:58): in derselben Minute wie sie stand
      // „Julian holt ‚Comeback-Tag'" als zweite Karte über denselben Spieler.
      arr.forEach(e => {
        const te = e.meta && e.meta.tagEnde;
        // Trägt die Ehrung des Tages es, steht es dort.
        if(te && _tagGetragen.has(te + '|' + e.playerId + '|' + e.badge.id)) return;
        let when = new Date(matchObj.created_at);
        if(te){ when = new Date(te + 'T00:00:00'); when.setHours(23, 57, 0, 0); }
        events.push({...e, when, matchId: mid, tagEnde: te || null});
      });
    }
    // Die Partie ist die Identitaet einer Verleihung. Nur echte Doubletten
    // desselben Events werden entfernt; eine spaetere Auszeichnung darf die
    // fruehere nicht schon im Generator verdraengen.
    const dedupe = {};
    events.forEach(ev => {
      const k = ev.playerId+'|'+ev.badge.id+'|'+ev.matchId;
      if(!dedupe[k]) dedupe[k] = ev;
    });
    // Das WIEVIELTE Mal ist das? Gezählt über die ganze Laufbahn, nicht nur
    // über das Fenster von sieben Tagen — sonst wäre jede Auszeichnung
    // immer die erste [§11.0c]. Die Zeitpunkte stehen sortiert da, also ist
    // der Rang die Seite des eigenen Zeitpunkts darin.
    const _bZeiten = {};
    for(const mid in bMap){
      const arr = bMap[mid];
      if(!arr || !arr.length) continue;
      const mo = badgeMatches.get(mid);
      if(!mo) continue;
      const t = mts(mo);
      arr.forEach(e => {
        const k = e.playerId+'|'+e.badge.id;
        (_bZeiten[k] = _bZeiten[k] || []).push({t,mid});
      });
    }
    for(const k in _bZeiten) _bZeiten[k].sort((a,b) => a.t - b.t);
    const _bRang = ev => {
      const l = _bZeiten[ev.playerId+'|'+ev.badge.id] || [];
      // Zwei Partien koennen dieselbe Sekunde tragen. Der Zeitstempel allein
      // gab dann beiden Verleihungen denselben Rang und verschluckte Marken.
      const i = l.findIndex(x => x.mid === ev.matchId);
      return i < 0 ? l.length : i + 1;
    };
    // Klasse und Verleihungsmarke entscheiden die Newswuerdigkeit, kein
    // Mengenbudget. Gewoehnliche Marken werden unten gesammelt; seltene,
    // legendaere und ausdruecklich gewaehlte negative Badges reisen mit.
    const whitelisted = Object.values(dedupe)
      .filter(ev => {
        if(!pm[ev.playerId]) return false;
        // Eine WÜRDE ist je Saison neu zu holen und jedes Mal Nachricht;
        // alles andere nur beim ersten Mal und an runden Marken [§11.0c].
        const wuerde = (typeof BADGE_WUERDE !== 'undefined') && BADGE_WUERDE.has(ev.badge.id);
        const rar = rarityOf(ev.badge.id);
        // Der Takt haengt an der Klasse [§11.0c]: legendaer jedes Mal, selten
        // beim ersten Mal und an den runden Marken. Eine Liste fuer alle war
        // zu grob — sie liess dreizehn legendaere Erfolge zwischen der
        // zehnten und der fuenfundzwanzigsten Verleihung wegfallen.
        if(!wuerde && !_badgeTakt(rar, _bRang(ev))) return false;
        return rar === 'legendary' || rar === 'rare' || NEWS_BADGE_WHITELIST.has(ev.badge.id);
      });
    // Jede newswuerdige Verleihung wird gespeichert. Die Match-Zusammenfuehrung
    // sorgt fuer eine Karte pro Partie; ein Themenlimit unterschlug dagegen
    // weitere seltene Auszeichnungen und negative Ereignisse desselben Spiels.
    const list = whitelisted.sort((a,b) => b.when - a.when);
    list.forEach(ev => {
      const rar = rarityOf(ev.badge.id);
      // `prio` sortiert den Feed nicht mehr — er steht chronologisch [§C33].
      // Sie entscheidet nur noch zweierlei: wer eine Sammelkarte anführt und
      // wer den Tagesdeckel überlebt. Dort gehört eine seltene Auszeichnung
      // über eine laufende Serie: die Serie läuft weiter, die Auszeichnung ist
      // geholt. Sie stand auf 5 und damit unter der Duo-Pleitenserie — mit der
      // alten Begründung, dass Team-News „auch mal oben stehen" sollten, was
      // seit dem chronologischen Feed niemand mehr entscheidet.
      // Nur die legendäre Auszeichnung ist Breaking [§C33]; die seltene
      // steht über der gewöhnlichen, verlässt ihr Band aber nicht.
      const rarPrio = STORY_PRIO.badge_unlocked
                    + ({legendary:36, rare:8, common:0, negative:0}[rar] || 0);
      // v9.7: Angstgegner-News benennt den Gegner (aus fire()-Meta durchgereicht).
      const _nemOpp = (ev.badge.id === 'nemesis' && ev.meta && ev.meta.oppId) ? ev.meta.oppId : null;
      // v9.17: Die Langzeit-Auszeichnungen bekommen einen eigenen Text mit dem
      // ECHTEN Karrierestand statt der nüchternen Badge-Beschreibung — dieselbe
      // Quelle wie das Profil (countGames/countWins), also keine Abweichung.
      let _bdesc;
      if(_nemOpp){
        // Der Name der Auszeichnung steht schon in der Schlagzeile; er stand
        // hier ein zweites Mal, gleich darunter.
        _bdesc = `5 Pleiten in Folge gegen ${nameOf(_nemOpp)}.`;
      } else if(ev.badge.id === 'games250'){
        _bdesc = `${nameOf(ev.playerId)} hat ${_spEigene(ev.playerId, badgeMatches.get(ev.matchId)).length} Sätze auf dem Court gespielt.`;
      } else if(ev.badge.id === 'wins200'){
        _bdesc = `300 Siege in der Karriere. ${nameOf(ev.playerId)} hält nach diesem Satz bei ${_spEigene(ev.playerId, badgeMatches.get(ev.matchId)).filter(m => _spGew(m, ev.playerId)).length}.`;
      } else {
        // Die Bedingung aus dem Katalog steht sonst ohne Punkt in der Karte:
        // sie ist dort eine Zelle in einem Raster, hier ist sie ein Satz.
        _bdesc = ev.badge.desc || 'Neue Auszeichnung freigeschaltet';
        if(!/[.!?]$/.test(_bdesc.trim())) _bdesc = _bdesc.trim() + '.';
      }
      stories.push({
        id: 'badge_'+ev.playerId+'_'+ev.badge.id+'_'+ev.matchId,
        cat: 'badge',
        ic: ev.badge.ic || 'trophy',
        title: `${nameOf(ev.playerId)}: ${ev.badge.name}`,
        desc: _bdesc,
        when: ev.when,
        prio: rarPrio,
        // Der Rang dieser Verleihung gehoert ihrem Match, nicht dem spaeteren
        // Profilstand. Die Anlassgrafik speichert ihn im visuellen Snapshot.
        dataRef: {type:'badge_unlocked', playerId: ev.playerId, badgeId: ev.badge.id, badgeName: ev.badge.name, matchId: ev.tagEnde ? undefined : ev.matchId, tag: ev.tagEnde || undefined, rarity: rar, rang:_bRang(ev), nemesisOppId: _nemOpp || undefined}
      });
    });
    // ── Die kleinen Marken einer Partie stehen zusammen ────────────
    // Eine gewoehnliche Auszeichnung kam im Feed gar nicht vor: nur
    // legendaer, selten und die gewhitelisteten Sonderfaelle bekamen eine
    // Karte. Damit fehlte genau das, was ein Spieler aus der unteren Haelfte
    // ueberhaupt erreicht. Einzeln koennen sie es nicht sein — gemessen
    // fallen an sieben der vierzehn Tage eine bis vier runde Marken, und vier
    // Karten „X: Zittersieg" untereinander sind ein Protokoll. Sie werden
    // deshalb je PARTIE gesammelt und gehen anschließend als eine Zeile in
    // deren Matchkarte auf. Eine Tageskarte über mehrere Partien konnte
    // keinem Ergebnis sauber zugeordnet werden und blieb als zweite Karte
    // neben einem der beteiligten Spiele stehen.
    const _kleine = Object.values(dedupe).filter(ev => {
      if(!pm[ev.playerId]) return false;
      const rar = rarityOf(ev.badge.id);
      if(rar !== 'common') return false;
      // Die gewhitelisteten Sonderfaelle haben ihre eigene Karte.
      if(NEWS_BADGE_WHITELIST.has(ev.badge.id)) return false;
      return _badgeTakt('common', _bRang(ev));
    });
    const _markenPartie = {};
    _kleine.forEach(ev => {
      const k = ev.matchId && !ev.tagEnde ? 'm:' + ev.matchId : 't:' + tagKey(ev.when.getTime());
      (_markenPartie[k] = _markenPartie[k] || []).push(ev);
    });
    Object.keys(_markenPartie).forEach(key => {
      const l = _markenPartie[key].slice().sort((a, b) => a.when - b.when);
      const tag = tagKey(l[l.length - 1].when.getTime());
      const namen = [...new Set(l.map(ev => nameOf(ev.playerId)))];
      const matchIds = [...new Set(l.map(ev => ev.tagEnde ? null : ev.matchId).filter(Boolean))];
      const gemeinsamesMatch = matchIds.length === 1
        && l.every(ev => ev.matchId === matchIds[0]) ? matchIds[0] : null;
      const zeile = ev => `${nameOf(ev.playerId)} holt „${ev.badge.name}“ zum ${_bRang(ev)}. Mal`;
      const bed = ev => String(ev.badge.desc || '').trim().replace(/([^.!?])$/, '$1.');
      // Mehrere Marken eines Spielers: die Schlagzeile nennt sie mit ihrer
      // Zahl wie die Zeile im Bündel, der Satz sagt, wofür es sie gibt.
      // Er wiederholte die Zeile („Alex holt ‚Überholmanöver' zum 5. Mal,
      // Alex holt ‚Pflichterfüller' zum 10. Mal").
      const eins = namen.length === 1 && l.length <= 3;
      const gleich = l.every(ev => _bRang(ev) === _bRang(l[0]));
      const einsTitel = () => `${namen[0]} holt ` + (gleich
        ? `${_namenListe(l.map(ev => `„${ev.badge.name}“`))}, ${l.length === 2 ? 'beide' : 'alle'} zum ${_bRang(l[0])}. Mal`
        : _namenListe(l.map(ev => `„${ev.badge.name}“ zum ${_bRang(ev)}. Mal`)));
      stories.push({
        id: gemeinsamesMatch ? 'badgemarken_match_' + gemeinsamesMatch
                             : 'badgemarken_slot_' + tag,
        cat: 'badge',
        ic: (l.length === 1 && l[0].badge.ic) || 'medal',
        title: l.length === 1 ? zeile(l[0]) : eins ? einsTitel()
          : `${_namenKurz(namen)} ${namen.length > 1 ? 'erreichen' : 'erreicht'} runde Marken`,
        // Bei einer einzigen Marke steht alles schon in der Schlagzeile; dann
        // traegt der Text die Bedingung aus dem Katalog — die Ausnahme, die
        // fuer jede Auszeichnung gilt [§C33].
        desc: l.length === 1 ? bed(l[0])
          // Eine Bedingung, die nur den Stand nennt („Zittersieg": „10:9-Sieg"),
          // sagt unter dem Kopf derselben Partie nichts Neues.
          : eins ? (l.filter(ev => !/\d+:\d+/.test(bed(ev))).map(ev => `„${ev.badge.name}“: ${bed(ev)}`).join(' ')
              || `${_zahlwortDe(l.length, true)} Auszeichnungen ${gemeinsamesMatch ? 'in diesem Satz' : 'an diesem Tag'}.`)
          : `${l.length} Auszeichnungen ${gemeinsamesMatch ? 'in diesem Satz' : 'an diesem Tag'}. `
            + l.map(zeile).join(', ') + '.',
        when: l[l.length - 1].when,
        prio: STORY_PRIO.badge_marken,
        dataRef: {type:'badge_marken', tag,
                  playerIds:[...new Set(l.map(ev => ev.playerId))],
                  causalKey:gemeinsamesMatch
                    ? _storyGruppeKey('match', gemeinsamesMatch)
                    : _storyGruppeKey('awards', tag),
                  matchId: gemeinsamesMatch,
                  marken: l.map(ev => ({pid:ev.playerId, badgeId:ev.badge.id,
                                        name:ev.badge.name, rang:_bRang(ev),
                                        matchId:ev.tagEnde ? null : (ev.matchId || null)}))}
      });
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] badges', e); }

  // ── 7. Rivalität (≥50 H2H-Duelle) ──
  // H2H = wie oft 2 Spieler in irgendeinem Match GEGENEINANDER waren (egal welcher Mate).
  // Iteriere matches 1×, baue Counter-Map auf.
  try {
    const pairCnt = {}; // "minId|maxId" → {n, lastDate}
    matches.forEach(m => {
      const A = [m.a1, m.a2], B = [m.b1, m.b2];
      A.forEach(a => B.forEach(b => {
        if(a === b) return;
        const k = a < b ? a+'|'+b : b+'|'+a;
        if(!pairCnt[k]) pairCnt[k] = {n:0, last:m.created_at, t:mts(m), mid:m.id, aw:0, zehn:null};
        pairCnt[k].n++;
        // Wer führt? Ohne diese Zahl sagte die Karte nur, dass es die
        // Paarung gibt. `aw` zählt aus Sicht des kleineren Ids.
        const ersterAufA = (a < b ? a : b) === a;
        const aGewinnt = ersterAufA ? m.winner === 'A' : m.winner === 'B';
        if(aGewinnt) pairCnt[k].aw++;
        // Der Stand beim letzten zehnten Duell: nur der wird gemeldet.
        if(pairCnt[k].n % 10 === 0)
          pairCnt[k].zehn = {n:pairCnt[k].n, aw:pairCnt[k].aw, t:mts(m), when:m.created_at, mid:m.id};
        if(mts(m) >= pairCnt[k].t){
          pairCnt[k].last = m.created_at; pairCnt[k].t = mts(m); pairCnt[k].mid = m.id;
        }
      }));
    });
    // ── Nur jedes zehnte Duell ist eine Nachricht ──────────────────
    // Die Karte hing an der LETZTEN Partie des Paares und trug deren Zahl.
    // Ihre ID kannte keine Zahl: lag die gespeicherte aus dem Fenster, baute
    // der Generator sie an jedem neuen Duell neu, und „Leon und Maxi treffen
    // zum 207. Mal aufeinander" stand an jedem Spieltag der beiden. Gemeldet
    // wird jetzt das zehnte, zwanzigste … Duell, an der Partie, in der es
    // gespielt wurde, mit dem Stand von damals und der Zahl in der ID. Die
    // Schwellen des Meilensteins (50, 100, 200, 500) meldet der Meilenstein.
    const _seit = now.getTime() - NEWS_FENSTER_TAGE * _dayMs;
    const ranked = Object.entries(pairCnt)
      .filter(([k,v]) => v.n >= 50 && v.zehn && v.zehn.n >= 50 && v.zehn.t >= _seit
        && ![50, 100, 200, 500].includes(v.zehn.n))
      .map(([k,v]) => {
        const [a,b] = k.split('|');
        return {a, b, n: v.zehn.n, aw: v.zehn.aw, when: new Date(v.zehn.when), matchId:v.zehn.mid, gesamt:v.n};
      })
      .sort((a,b) => b.gesamt - a.gesamt)
      .slice(0, NEWS_LIMITS.rivalry);
    ranked.forEach(r => {
      const tier = r.n >= 200 ? 'legendäre' : r.n >= 100 ? 'große' : 'wachsende';
      stories.push({
        id: 'rivalry_'+r.a+'_'+r.b+'_'+r.n,
        cat: 'rivalry',
        ic: 'crossedSwords',
        // Die Schlagzeile war ein Satzfragment und nannte niemanden:
        // „188 Duelle. Eine große Rivalität". Jetzt stehen die beiden drin.
        title: `${nameOf(r.a)} und ${nameOf(r.b)} treffen zum ${r.n}. Mal aufeinander`,
        // „Eine große Rivalität — die Liga liebt's" stand wortgleich unter
        // zwei Karten untereinander und nannte keine einzige Zahl.
        desc: (() => { const va = r.aw, vb = r.n - r.aw;
          return va === vb
            ? `${nameOf(r.a)} und ${nameOf(r.b)} stehen nach ${r.n} Duellen exakt bei ${va}:${vb}.`
            : `${nameOf(va > vb ? r.a : r.b)} führt ${Math.max(va, vb)}:${Math.min(va, vb)}. `
              + `Kein anderes Paar der Liga hat öfter gegeneinander gespielt.`;
        })(),
        when: r.when,
        prio: STORY_PRIO.rivalry + (r.n >= 200 ? 4 : r.n >= 100 ? 2 : 0),
        // Der Stand gehoert genau der Partie, bis zu der er gezaehlt wurde.
        // Ohne matchId wanderte dieselbe Zeile beim naechsten Duell von der
        // alten Matchkarte zur neuen und aus 196 wurden dort 197 Duelle.
        dataRef: {type:'rivalry', a: r.a, b: r.b, n: r.n,
                  aWins:r.aw, bWins:r.n - r.aw, matchId:r.matchId}
      });
    });
  } catch(e){}

  // ── 8. Jubiläum (Spiele-Meilensteine: Leiter ab 10, jede fünfzigste) ──
  // Die ID enthält die Marke: keine Wiederholung in späteren Läufen.
  try {
    const candidates = [];
    // Aus seinen eigenen Partien: auch nach dem Karriereende eine Nachricht
    // über das, was er gespielt hat [§C40].
    // Jede Partie im Fenster, nicht nur die jüngste: kamen zwei Partien
    // eines Spielers zugleich an, riss die erste die Marke, und gefragt
    // wurde nur die zweite. Die Leiter (10, 25, 50, 100, 250 …) und dazu
    // jede fünfzigste: die 450. Partie stand nur im Zählwerk des Fußes,
    // ohne Satz und nur, wenn der Fuß gerade sie wählte.
    const seit = now.getTime() - NEWS_FENSTER_TAGE * _dayMs;
    players.filter(p => sichtbar(p)).forEach(p => {
      const arr = byPlayer[p.id] || [];
      arr.forEach((m, i) => {
        const n = i + 1;
        if(mts(m) < seit || mts(m) > now.getTime() || !_rundeMarke(n, 10)) return;
        candidates.push({pid: p.id, total: n, when: new Date(m.created_at), matchId: m.id});
      });
    });
    candidates.sort((a,b) => b.when - a.when).forEach(c => {
      stories.push({
        id: 'jubilee_'+c.pid+'_'+c.total,
        cat: 'history',
        ic: 'calendar',
        // „feiert 250. Spiel" ohne Artikel, und darunter dieselbe Zahl noch
        // einmal. Der Satz nennt jetzt, was in diesen Partien zusammengekommen
        // ist [§C33].
        title: `${nameOf(c.pid)} feiert den ${c.total}. Satz`,
        // Die Siege der ersten hundert Partien, nicht die von heute: gezählt
        // wurde über die ganze Laufbahn, und unter „Aus 100 Partien" konnten
        // damit mehr als hundert Siege stehen.
        desc: (function(){
          const t = new Date(c.when).getTime();
          const alle = (matchesOfPlayer(c.pid, matches) || []).filter(m => mts(m) <= t);
          const siege = alle.filter(m => won(c.pid, m)).length;
          // „Aus 10 Partien sind 1 Siege geworden" stand beim ersten Jubiläum.
          return `${siege} ${siege === 1 ? 'Sieg' : 'Siege'} in ${c.total} Sätzen, `
               + `das sind ${Math.round(100 * siege / Math.max(1, c.total))} %.`;
        })(),
        when: c.when,
        prio: STORY_PRIO.jubilee + (c.total >= 1000 ? 6 : c.total >= 250 ? 3 : 0),
        dataRef: {type:'jubilee', pid: c.pid, total: c.total, matchId: c.matchId}
      });
    });
  } catch(e){}

  // ── 8b. Was in einer Partie sonst noch passiert ──
  // Eine Partie trug nur, was die Liga im Ganzen bewegt (Serien, Marken,
  // Rekorde), und an den meisten Partien hing deshalb gar nichts: gemessen
  // standen 36 von 52 Partien in vierzehn Tagen ohne ein einziges Ereignis
  // da. Sechs Dinge passieren aber in einer einzelnen Partie und sind für die
  // Beteiligten eine Nachricht: ein Fluch gegen einen Gegner reißt, ein Duo
  // spielt zum fünfzigsten Mal zusammen, eine Niederlage vom selben Tag wird
  // revanchiert, jemand bestreitet seine zehnte Partie des Tages, erreicht
  // nach langer Zeit wieder seinen Höchststand oder springt in der Tabelle
  // um drei Plätze. Jedes trägt seine Partie und hängt damit an ihrer Karte
  // [§C33]; keins steht als eigene Karte im Feed. Wo etwas zählt, meldet es
  // Stufen und nicht jeden Schritt.
  try {
    const seit = now.getTime() - NEWS_FENSTER_TAGE * _dayMs;
    const DUO_STUFEN = new Set([25, 50, 75, 100, 150, 200, 250, 300, 400, 500]);
    const TAG_STUFEN = new Set([10, 15, 20, 25, 30, 40]);
    const sieger = m => m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
    const verlierer = m => m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2];
    const duo = ids => ids.slice().sort().join('|');
    const gegen = {}, zusammen = {}, tagN = {}, duelle = {}, hoch = {};
    // Für die sieben Fakten des Katalogs [§C33]: die Bilanz je Paar von
    // Gegnern, die Woche, die Elo des Tages, der Monat und die Partner.
    const bilanz = {}, woche = {}, tagElo = {}, monat = {}, partner = {}, gesamt = {};
    // Für das Ende einer Pleitenserie und die Rückkehr: die Niederlagen in
    // Folge je Spieler und je Duo, der letzte Sieg, die letzte Partie.
    const pleiten = {}, duoPleiten = {}, letzterSieg = {}, duoSieg = {}, zuletzt = {};
    const vz = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(Math.round(v));
    const quote = (s, n) => Math.round(100 * s / Math.max(1, n));
    // Die beste Siegquote der Woche ab fünf Siegen, bei Gleichstand mehr Siege.
    const wochenErster = o => Object.keys(o).filter(id => o[id].s >= 5 && zeig(id))
      .map(id => ({id, s:o[id].s, n:o[id].n, q:o[id].s / o[id].n}))
      .sort((a, b) => b.q - a.q || b.s - a.s)[0] || null;
    const freiMemo = new Map();
    const frei = m => {
      const k = tagKey(m.created_at);
      if(!freiMemo.has(k)){ let f = false;
        try { f = _storyRangFrei(seasonOf(m.created_at).id, mts(m)).frei; } catch(e){}
        freiMemo.set(k, f); }
      return freiMemo.get(k);
    };
    const neuSt = [];
    // Alles hier entsteht aus den eigenen Partien und fragt deshalb
    // `sichtbar` [§C40 Regel 1]; nach dem Abschied hält ihn das Tor des
    // Generators ohnehin heraus.
    const zeig = id => sichtbar(pm[id]);
    chronoMatches.forEach(m => {
      const t = mts(m), W = sieger(m), L = verlierer(m), neu = t >= seit;
      if(!W[0] || !L[0]) return;
      const zeit = new Date(t);
      // (1) Der Fluch: der erste Sieg gegen einen Gegner nach mindestens
      // fünf Niederlagen in Folge gegen ihn, und der letzte Sieg liegt zwei
      // Wochen zurück oder es gab keinen. Fünf Pleiten fallen in einer Runde
      // an einem Vormittag; gemessen hätte das sechsmal in vierzehn Tagen
      // gemeldet, „wieder gegen Maxi" nach einem Sieg vom Vortag.
      let fluch = null;
      W.forEach(w => L.forEach(l => {
        const g = gegen[w + '>' + l] || (gegen[w + '>' + l] = {pleiten:0, sieg:0});
        if(neu && zeig(w) && zeig(l) && g.pleiten >= 5 && (!g.sieg || t - g.sieg >= 14 * _dayMs) && (!fluch || g.pleiten > fluch.n))
          fluch = {w, l, n:g.pleiten, sieg:g.sieg};
        g.pleiten = 0; g.sieg = t;
        const h = gegen[l + '>' + w] || (gegen[l + '>' + w] = {pleiten:0, sieg:0});
        h.pleiten++;
      }));
      if(fluch) neuSt.push({id:'fluch_' + fluch.w + '_' + fluch.l + '_' + m.id, cat:'rivalry', ic:'ghost',
        title:`${nameOf(fluch.w)} gewinnt nach ${fluch.n} Niederlagen in Folge wieder gegen ${nameOf(fluch.l)}`,
        desc: fluch.sieg ? `Der letzte Sieg gegen ${nameOf(fluch.l)} war am ${tagImSatz(fluch.sieg)}`
                         : `Es ist der erste Sieg gegen ${nameOf(fluch.l)} überhaupt.`,
        when:zeit, prio:STORY_PRIO.fluch,
        dataRef:{type:'fluch', pid:fluch.w, gegen:fluch.l, n:fluch.n, matchId:m.id, playerIds:[fluch.w, fluch.l]}});
      // (2) Das Duo-Jubiläum: dieselben zwei auf derselben Seite.
      [[W, true], [L, false]].forEach(([ids, sieg]) => {
        const k = duo(ids), z = zusammen[k] || (zusammen[k] = {n:0, s:0});
        z.n++; if(sieg) z.s++;
        if(neu && DUO_STUFEN.has(z.n) && ids.every(zeig)) neuSt.push({id:'duojub_' + k.replace('|', '_') + '_' + z.n, cat:'team', ic:'users',
          title:`${nameOf(ids[0])} und ${nameOf(ids[1])} spielen zum ${z.n}. Mal zusammen`,
          desc:`${z.s} von ${z.n} Sätzen gewonnen, Siegquote ${Math.round(100 * z.s / z.n)} %.`,
          when:zeit, prio:STORY_PRIO.duo_jubilaeum,
          dataRef:{type:'duo_jubilaeum', a:ids[0], b:ids[1], n:z.n, s:z.s, sieg, matchId:m.id, playerIds:ids.slice()}});
      });
      // (3) Die Revanche: dieselben zwei Duos am selben Tag, und die Sieger
      // haben das Duell davor klar verloren (drei Games oder mehr). Ohne den
      // Abstand war in jeder Runde jede zweite Partie eine Revanche.
      const dk = [duo(W), duo(L)].sort().join('#'), vor = duelle[dk];
      if(neu && vor && W.concat(L).every(zeig) && tagKey(vor.created_at) === tagKey(m.created_at)
         && duo(verlierer(vor)) === duo(W) && Math.abs(vor.games_a - vor.games_b) >= 3){

        neuSt.push({id:'revanche_' + m.id, cat:'comeback', ic:'rematch',
          title:`${nameOf(W[0])} und ${nameOf(W[1])} revanchieren sich gegen ${nameOf(L[0])} und ${nameOf(L[1])}`,
          desc:`Um ${datumFmt(mts(vor), 'uhr')} Uhr hatten sie noch ${standFuer(vor, false)} verloren.`,
          when:zeit, prio:STORY_PRIO.revanche,
          dataRef:{type:'revanche', W:W.slice(), L:L.slice(), vorherId:vor.id, matchId:m.id, playerIds:W.concat(L)}});
      }
      duelle[dk] = m;
      // (4) Der lange Tag: die zehnte, fünfzehnte … Partie eines Spielers an
      // einem Tag.
      W.concat(L).forEach(id => {
        const k = id + '|' + tagKey(m.created_at), z = tagN[k] || (tagN[k] = {n:0, s:0});
        z.n++; if(W.includes(id)) z.s++;
        if(neu && TAG_STUFEN.has(z.n) && zeig(id)) neuSt.push({id:'marathon_' + id + '_' + tagKey(m.created_at) + '_' + z.n, cat:'personal', ic:'hourglass',
          title:`${nameOf(id)} bestreitet den ${z.n}. Satz des Tages`,
          desc:`${z.s} davon gewonnen.`,
          when:zeit, prio:STORY_PRIO.tagesmarathon,
          dataRef:{type:'tagesmarathon', pid:id, n:z.n, s:z.s, matchId:m.id, playerIds:[id]}});
      });
      // (5) Der Höchststand: ein Sieger übertrifft seine beste Elo, und
      // die lag mindestens zwanzig eigene Partien zurück. Die Elo beginnt
      // jeden Monat neu; verglichen wird wie im Profil („Allzeit") mit dem
      // höchsten Stand, den er je in einem Monat erreicht hatte. Der Satz
      // nennt deshalb den Monat der alten Marke, wenn sie nicht aus diesem
      // stammt — sonst fragte man sich, wie 303 Elo „so viel wie nie" sein
      // können, wenn die Elo im Juli doch neu begonnen hat.
      const h = histMap.get(m.id) || {};
      W.concat(L).forEach(id => {
        const e = (h.eloAfter || {})[id];
        const r = hoch[id] || (hoch[id] = {max:-Infinity, seit:0, wann:0});
        if(e == null){ r.seit++; return; }
        if(e > r.max){
          if(neu && W.includes(id) && zeig(id) && r.max > -Infinity && r.seit >= 20){
            const anders = seasonOf(new Date(r.wann)).id !== seasonOf(m.created_at).id;
            neuSt.push({id:'hoch_' + id + '_' + m.id, cat:'personal', ic:'peak',
              title:`${nameOf(id)} erreicht ${Math.round(e)} Elo, so viel wie nie zuvor`,
              desc:`Der bisherige Höchststand lag bei ${Math.round(r.max)} Elo, ${r.seit} Sätze zuvor`
                + (anders ? ` im ${seasonLabel(seasonOf(new Date(r.wann)).id)}.` : '.'),
              when:zeit, prio:STORY_PRIO.elo_hoch,
              dataRef:{type:'elo_hoch', pid:id, elo:Math.round(e), vorher:Math.round(r.max), seit:r.seit,
                vorherSid:seasonOf(new Date(r.wann)).id, matchId:m.id, playerIds:[id]}});
          }
          r.max = e; r.seit = 0; r.wann = t;
        } else r.seit++;
      });
      // (6) Der Tabellensprung: ein Sieger gewinnt drei Plätze oder mehr,
      // sobald die Tabelle belastbar ist.
      if(neu && frei(m)) W.filter(zeig).forEach(id => {
        const r = _newsRankChange(id, m.id);
        if(r && r.pre && r.post && r.pre - r.post >= 3)
          neuSt.push({id:'sprung_' + id + '_' + m.id, cat:'personal', ic:'stepsUp',
            title:`${nameOf(id)} springt von Platz ${r.pre} auf Platz ${r.post}`,
            desc:`${r.pre - r.post} Plätze mit einem Sieg.`,
            when:zeit, prio:STORY_PRIO.tabellensprung,
            dataRef:{type:'tabellensprung', pid:id, pre:r.pre, post:r.post, matchId:m.id, playerIds:[id]}});
      });
      // ── Die sieben Fakten des Katalogs [§C33] ──────────────────────
      // Jeder sagt etwas, das weder eine Meldung noch eine Zeichnung der
      // Partie schon sagt, und hat seine Schwelle, damit er nicht an jeder
      // Partie hängt: gemessen am Entwurf stand jeder höchstens an jeder
      // zehnten Karte. Alles zählt bis zu dieser Partie.
      const delta = id => Number((h.deltas || {})[id]) || 0;
      // (7) Die Bilanz kippt: ab sechzehn Duellen zweier Gegner liegt der
      // Sieger vorn, und davor lag er zehn Duelle nicht vorn oder nie.
      let kippt = null;
      W.forEach(w => L.forEach(l => {
        const k = paarKey(w, l), b = bilanz[k] || (bilanz[k] = {n:0, s:{}, vorn:{}});
        const s = (b.s[w] || 0) + 1, n = b.n + 1, zuletzt = b.vorn[w];
        if(neu && !kippt && zeig(w) && zeig(l) && n >= 16 && (s - 1) * 2 <= b.n && s * 2 > n
           && (zuletzt == null || n - zuletzt >= 10)) kippt = {w, l, s, n, zuletzt};
        b.s[w] = s; b.n = n;
        [w, l].forEach(x => { if((b.s[x] || 0) * 2 > n) b.vorn[x] = n; });
      }));
      if(kippt) neuSt.push({id:'kippt_' + kippt.w + '_' + kippt.l + '_' + m.id, cat:'rivalry', ic:'crossedSwords',
        title:`${nameOf(kippt.w)} geht im Duell gegen ${nameOf(kippt.l)} in Führung, ${kippt.s}:${kippt.n - kippt.s}`,
        desc:kippt.zuletzt == null ? `Zum ersten Mal in ${kippt.n} Duellen liegt ${nameOf(kippt.w)} vorn.`
          : `Zuletzt lag ${nameOf(kippt.w)} vor ${kippt.n - kippt.zuletzt} Duellen vorn.`,
        when:zeit, prio:STORY_PRIO.duell_kippt,
        dataRef:{type:'duell_kippt', pid:kippt.w, gegen:kippt.l, s:kippt.s, n:kippt.n, matchId:m.id, playerIds:[kippt.w, kippt.l]}});
      // (8) Die Woche: ein Sieger übernimmt die beste Siegquote der Woche.
      const wk = _wochenKey(m.created_at), wo = woche[wk] || (woche[wk] = {});
      const wVor = wochenErster(wo);
      W.concat(L).forEach(id => { const z = wo[id] || (wo[id] = {s:0, n:0}); z.n++; if(W.includes(id)) z.s++; });
      const wNach = wochenErster(wo);
      if(neu && wNach && W.includes(wNach.id) && (!wVor || wVor.id !== wNach.id))
        neuSt.push({id:'wochenspitze_' + wNach.id + '_' + m.id, cat:'personal', ic:'calendar',
          title:`${nameOf(wNach.id)} übernimmt die Woche, ${wNach.s} von ${wNach.n} gewonnen`,
          desc:wVor ? `Vorher lag ${nameOf(wVor.id)} mit ${quote(wVor.s, wVor.n)} % vorn.`
            : `${quote(wNach.s, wNach.n)} % der Sätze dieser Woche gewonnen.`,
          when:zeit, prio:STORY_PRIO.woche_spitze,
          dataRef:{type:'woche_spitze', pid:wNach.id, s:wNach.s, n:wNach.n, vorher:wVor ? wVor.id : null,
            matchId:m.id, playerIds:[wNach.id]}});
      // (9) Der Tag: die Elo eines Siegers dreht ab der vierten Partie nach
      // einem Tief von −25 ins Plus, oder kommt zum ersten Mal über +75.
      const tg = tagKey(m.created_at);
      let tagFakt = null;
      W.concat(L).forEach(id => {
        const k = id + '|' + tg, l = tagElo[k] || (tagElo[k] = []);
        const nach = (l.length ? l[l.length - 1] : 0) + delta(id);
        if(neu && !tagFakt && W.includes(id) && zeig(id)){
          if(l.length >= 3 && Math.min(...l) <= -25 && l[l.length - 1] < 0 && nach > 0)
            tagFakt = {art:'plus', id, tief:Math.min(...l), elo:nach, n:l.length + 1};
          else if(nach >= 75 && Math.max(0, ...l) < 75) tagFakt = {art:'hoehe', id, elo:nach, n:l.length + 1};
        }
        l.push(nach);
      });
      if(tagFakt && tagFakt.art === 'plus') neuSt.push({id:'tagplus_' + tagFakt.id + '_' + m.id, cat:'personal', ic:'comeback',
        title:`${nameOf(tagFakt.id)} dreht den Tag ins Plus, nach ${vz(tagFakt.tief)} Elo`,
        desc:`Nach ${tagFakt.n} Sätzen des Tages stehen ${vz(tagFakt.elo)} Elo zu Buche.`,
        when:zeit, prio:STORY_PRIO.tag_plus,
        dataRef:{type:'tag_plus', pid:tagFakt.id, tief:Math.round(tagFakt.tief), elo:Math.round(tagFakt.elo), n:tagFakt.n,
          matchId:m.id, playerIds:[tagFakt.id]}});
      if(tagFakt && tagFakt.art === 'hoehe') neuSt.push({id:'taghoehe_' + tagFakt.id + '_' + m.id, cat:'personal', ic:'trendUp',
        title:`${nameOf(tagFakt.id)} kommt an diesem Tag auf ${vz(tagFakt.elo)} Elo`,
        desc:`Zum ersten Mal an diesem Tag über +75, nach ${tagFakt.n} Sätzen.`,
        when:zeit, prio:STORY_PRIO.tag_hoehe,
        dataRef:{type:'tag_hoehe', pid:tagFakt.id, elo:Math.round(tagFakt.elo), n:tagFakt.n, matchId:m.id, playerIds:[tagFakt.id]}});
      // (10) Der Monat: der größte Gewinn eines Siegers ab der achten Partie
      // und mindestens 22 Elo, oder die Siegquote erreicht ab der fünfzehnten
      // Partie 50 % von unten. Der Monat ist die Saison der Partie.
      const sid = seasonOf(m.created_at).id;
      let monatFakt = null;
      W.concat(L).forEach(id => {
        const k = id + '|' + sid, z = monat[k] || (monat[k] = {s:0, n:0, best:0});
        const sieg = W.includes(id), d = delta(id), vor = {s:z.s, n:z.n, best:z.best};
        z.n++; if(sieg){ z.s++; z.best = Math.max(z.best, d); }
        // Einmal je Monat: wer um die Hälfte pendelt, kam sonst an jeder
        // zweiten Partie wieder darüber, gemessen Julian zweimal im August.
        // Gemerkt auch vor dem Fenster, sonst meldete sich ein zweites Mal,
        // sobald das erste aus dem Fenster fiel.
        const halb = !z.halb && vor.n >= 14 && vor.s * 2 < vor.n && z.s * 2 >= z.n;
        if(halb) z.halb = true;
        if(!neu || monatFakt || !sieg || !zeig(id)) return;
        if(z.n >= 8 && d >= 22 && d > vor.best)
          monatFakt = {art:'gewinn', id, elo:Math.round(d), vorher:Math.round(vor.best), n:z.n};
        else if(halb) monatFakt = {art:'halb', id, s:z.s, n:z.n};
      });
      const monatName = seasonLabel(sid).split(' ')[0];
      if(monatFakt && monatFakt.art === 'gewinn') neuSt.push({id:'monatsbest_' + monatFakt.id + '_' + m.id, cat:'personal', ic:'bolt',
        title:`${nameOf(monatFakt.id)} holt ${vz(monatFakt.elo)} Elo, mehr als mit jedem Sieg davor im ${monatName}`,
        desc:monatFakt.vorher > 0 ? `Der größte Gewinn davor im ${monatName}: ${vz(monatFakt.vorher)} Elo.`
          : `Der erste Sieg im ${monatName} mit so viel Elo.`,
        when:zeit, prio:STORY_PRIO.monat_gewinn,
        dataRef:{type:'monat_gewinn', pid:monatFakt.id, elo:monatFakt.elo, vorher:monatFakt.vorher, n:monatFakt.n,
          matchId:m.id, playerIds:[monatFakt.id]}});
      if(monatFakt && monatFakt.art === 'halb') neuSt.push({id:'monathalb_' + monatFakt.id + '_' + m.id, cat:'personal', ic:'scaleBalance',
        title:`${nameOf(monatFakt.id)} gewinnt im ${monatName} jetzt jeden zweiten Satz`,
        desc:`${monatFakt.s} von ${monatFakt.n} Sätzen gewonnen, vor dieser waren es ${monatFakt.s - 1} von ${monatFakt.n - 1}.`,
        when:zeit, prio:STORY_PRIO.monat_halb,
        dataRef:{type:'monat_halb', pid:monatFakt.id, s:monatFakt.s, n:monatFakt.n, matchId:m.id, playerIds:[monatFakt.id]}});
      // (11) Der beste Partner: mit diesem Partner die beste Quote unter
      // allen ab sechs gemeinsamen Partien, gemeldet jede achte davon.
      [[W, true], [L, false]].forEach(([ids, sieg]) => ids.forEach((id, i) => {
        const mit = ids[1 - i], p = partner[id] || (partner[id] = {}), z = p[mit] || (p[mit] = {s:0, n:0});
        const g = gesamt[id] || (gesamt[id] = {s:0, n:0});
        z.n++; g.n++; if(sieg){ z.s++; g.s++; }
      }));
      if(neu) for(const id of W){
        const mit = W.find(x => x !== id), z = partner[id][mit];
        if(!zeig(id) || !zeig(mit) || z.n < 8 || z.n % 8) continue;
        const liste = Object.keys(partner[id]).filter(x => partner[id][x].n >= 6 && zeig(x))
          .sort((a, b) => partner[id][b].s / partner[id][b].n - partner[id][a].s / partner[id][a].n || partner[id][b].n - partner[id][a].n);
        if(liste[0] !== mit) continue;
        const g = gesamt[id];
        neuSt.push({id:'partner_' + id + '_' + mit + '_' + m.id, cat:'team', ic:'handshake',
          // Der Vergleich gehört in den Satz: „…, mit allen 44 %" machte
          // die Schlagzeile drei Zeilen lang und hieß nicht, mit wem.
          title:`${nameOf(id)} gewinnt mit ${nameOf(mit)} ${quote(z.s, z.n)} % der Sätze`,
          desc:`${z.s} von ${z.n} gemeinsamen Sätzen gewonnen. Mit allen Partnern sind es ${quote(g.s, g.n)} %.`,
          when:zeit, prio:STORY_PRIO.partner_best,
          dataRef:{type:'partner_best', pid:id, mit, s:z.s, n:z.n, allg:quote(g.s, g.n), matchId:m.id, playerIds:[id, mit]}});
        break;
      }
      // (12) Das Ende einer Pleitenserie: der erste Sieg nach mindestens
      // fünf Niederlagen in Folge. Die Serie stand als „Stefan verliert zum
      // 10. Mal in Folge" im Feed, ihr Ende nirgends: unter „Stefan und Leon
      // retten ein 10:9" stand nur, dass Stefan wieder gegen Maxi gewann —
      // dass es sein erster Sieg nach zwölf Niederlagen war, sagte keine
      // Zeile. Fünf ist die erste Marke der Pleitenserie (Abschnitt 5).
      W.forEach(id => {
        const n = pleiten[id] || 0;
        if(neu && n >= 5 && zeig(id)) neuSt.push({id:'pleitenende_' + id + '_' + m.id, cat:'comeback', ic:'comeback',
          title:`${nameOf(id)} beendet eine Serie von ${n} Niederlagen`,
          desc:letzterSieg[id] ? `Der letzte Sieg davor war am ${tagImSatz(letzterSieg[id])}`
            : `Es ist der erste Sieg, nach ${n} Sätzen.`,
          when:zeit, prio:STORY_PRIO.pleiten_ende,
          dataRef:{type:'pleiten_ende', pid:id, n, matchId:m.id, playerIds:[id]}});
      });
      // (13) Dasselbe für ein Duo: der erste gemeinsame Sieg nach mindestens
      // vier gemeinsamen Niederlagen in Folge. Die Pleitenserie eines Duos
      // meldet sich ab drei (`team_loss_streak`), ihr Ende ab vier.
      const dkW = duo(W), dn = duoPleiten[dkW] || 0;
      if(neu && dn >= 4 && W.every(zeig)) neuSt.push({id:'duopleitenende_' + dkW.replace('|', '_') + '_' + m.id, cat:'team', ic:'comeback',
        title:`${nameOf(W[0])} und ${nameOf(W[1])} gewinnen wieder zusammen, nach ${dn} Niederlagen`,
        desc:duoSieg[dkW] ? `Zuletzt gewannen beide zusammen am ${tagImSatz(duoSieg[dkW])}`
          : `Es ist der erste gemeinsame Sieg, nach ${dn} gemeinsamen Sätzen.`,
        when:zeit, prio:STORY_PRIO.duo_pleiten_ende,
        dataRef:{type:'duo_pleiten_ende', a:W[0], b:W[1], n:dn, matchId:m.id, playerIds:W.slice()}});
      // (14) Die Rückkehr: die erste Partie nach mindestens vierzehn Tagen.
      // Sie stand nur als Zeichnung im Fuß („Zurück"), ohne Satz, und nur,
      // wenn der Fuß gerade sie wählte.
      W.concat(L).forEach(id => {
        const vor = zuletzt[id];
        if(neu && vor && t - vor >= 14 * _dayMs && zeig(id)){
          const tage = Math.floor((t - vor) / _dayMs), sieg = W.includes(id);
          neuSt.push({id:'rueckkehr_' + id + '_' + m.id, cat:'personal', ic:'doorReturn',
            title:sieg ? `${nameOf(id)} gewinnt nach ${tage} Tagen Pause` : `${nameOf(id)} spielt nach ${tage} Tagen wieder`,
            desc:`Der letzte Satz davor war am ${tagImSatz(vor)}`,
            when:zeit, prio:STORY_PRIO.rueckkehr,
            dataRef:{type:'rueckkehr', pid:id, tage, sieg, vorher:vor, matchId:m.id, playerIds:[id]}});
        }
      });
      W.forEach(id => { pleiten[id] = 0; letzterSieg[id] = t; });
      L.forEach(id => { pleiten[id] = (pleiten[id] || 0) + 1; });
      duoPleiten[dkW] = 0; duoSieg[dkW] = t;
      duoPleiten[duo(L)] = (duoPleiten[duo(L)] || 0) + 1;
      W.concat(L).forEach(id => { zuletzt[id] = t; });
    });
    neuSt.forEach(x => stories.push(x));
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] partie', e); }

  // ── 9. Stille Woche (Aktivitäts-Fun-Fact) ──
  // Vergleicht Spielzahl letzte 7 Tage mit Schnitt der vorangegangenen 4 Wochen.
  try {
    const wk = 7 * 86400000;
    const tsNow = now.getTime();
    const lastWeek = matches.filter(m => {
      const t = mts(m);
      return t > tsNow - wk && t <= tsNow;
    }).length;
    const prev4w = matches.filter(m => {
      const t = mts(m);
      return t > tsNow - 5*wk && t <= tsNow - wk;
    }).length;
    const avg = prev4w / 4;
    if(avg >= 20 && lastWeek <= avg * 0.5){
      stories.push({
        id: 'quiet_week_'+weekKey,
        cat: 'fun',
        ic: 'clock',
        title: 'Ruhige Woche',
        desc: `Nur ${lastWeek} ${lastWeek === 1 ? 'Satz' : 'Sätze'} in den letzten 7 Tagen. Normal wären ${Math.round(avg)}.`,
        when: now,
        prio: STORY_PRIO.quiet_week,
        dataRef: {type:'quiet_week', lastWeek, avg: Math.round(avg)}
      });
    }
  } catch(e){}

  // ── 10. Der Monatsabschluss ──────────────────────────────────────────
  // EINE Karte für den ganzen Abschluss eines Monats: der Meister auf dem
  // Podest, das Team der Saison, die Chronik mit denen, die zum ersten Mal
  // darin stehen, und wer durch die Titel des Monats ein neues Zeichen trägt.
  // Vorher waren es drei Arten Karten: der Meister am letzten Tag um 23:50,
  // die Chronik am 1. um 00:00 und je Erstling eine Zeile in der Tafel des
  // 1., zwischen den Rekorden eines Spieltags, der mit dem alten Monat nichts
  // zu tun hat. Dazwischen stand der Spieler des letzten Tages. Das Team der
  // Saison und die Zeichen, die erst mit den Titeln kamen, standen auf keiner.
  // Gebildet wird sie nur in den ersten zwei Tagen der neuen Saison — vorher
  // steht der Meister nicht fest —, und NUR für die unmittelbar vorige: wählte
  // der Generator die höchste vorhandene ID, und die gerade beendete Saison
  // war noch nicht synchronisiert, entstand eine dauerhaft falsche Karte für
  // die vorletzte.
  try {
    const sStart = seasonStart();
    const ageDays = (now - sStart) / 86400000;
    const prevId = ageDays <= 2 && seasons && seasons.length ? _prevSeasonId(currentSeason().id) : null;
    const lastArchived = prevId ? seasons.find(s => s.id === prevId) : null;
    const topElo = !lastArchived ? [] : (typeof lastArchived.top_elo === 'string')
      ? JSON.parse(lastArchived.top_elo || '[]') : (lastArchived.top_elo || []);
    if(lastArchived && topElo.length && topElo[0] && topElo[0].id && pm[topElo[0].id]){
      const sid = lastArchived.id, monat = seasonLabel(sid);
      const _sm = matchesInSeason(sid);
      // Die Fakten des Monats aus seinen Partien: Umfang, Games, knappe Partien
      // und die beiden auffälligen Ergebnisse.
      let _tore = 0, _eng = 0, _klar = null, _torreich = null;
      _sm.forEach(m => {
        const a = Number(m.games_a) || 0, b = Number(m.games_b) || 0;
        const diff = Math.abs(a - b), gesamt = a + b;
        _tore += gesamt;
        if(partie(m).knapp) _eng++;
        if(!_klar || diff > _klar.wert) _klar = {wert:diff, matchId:m.id, score:standFuer(m)};
        if(!_torreich || gesamt > _torreich.wert) _torreich = {wert:gesamt, matchId:m.id, score:standFuer(m)};
      });
      const _fakten = {spiele:_sm.length, tore:_tore, engeSpiele:_eng,
        toreJeSpiel:_sm.length ? Math.round(_tore / _sm.length * 10) / 10 : 0,
        klarstes:_klar, torreichstes:_torreich};
      // Das Team der Saison: dieselbe Rechnung wie im Rückblick (`seasonTeamOf`)
      // [§C27]. Ein Duo hat keinen Rang, nur seine Bilanz und seine Elo.
      let team = null;
      try {
        const t = seasonTeamOf(sid);
        if(t && t[0] && t[1] && pm[t[0]] && pm[t[1]]){
          const paar = (x, y) => (x === t[0] && y === t[1]) || (x === t[1] && y === t[0]);
          const zus = _sm.filter(m => paar(m.a1, m.a2) || paar(m.b1, m.b2));
          const w = zus.filter(m => paar(m.a1, m.a2) ? m.winner === 'A' : m.winner === 'B').length;
          const elo = Math.round(((getGlobalSim().seasonTeamElo || {})[sid] || {})[paarKey(t[0], t[1])] || 0);
          team = {pids:[t[0], t[1]], elo, w, l:zus.length - w};
        }
      } catch(e){ team = null; }
      // Die Chronik des Monats: wie viele Einträge an wie viele Spieler, die
      // drei mit den meisten und wer zum ersten Mal überhaupt darin steht —
      // der Moment, den ein Neuling oder ein Spieler aus der unteren Hälfte
      // sonst nie im Feed sieht. Wer zwei Einträge holt, ist einmal Erstling.
      let chronik = null;
      try {
        const T = seasonTitles(sid);
        if(T && T.awarded && T.awarded.length){
          const je = {};
          T.awarded.forEach(x => { je[x.pid] = (je[x.pid] || 0) + 1; });
          const rang = Object.keys(je).sort((x, y) => je[y] - je[x]);
          const erst = [];
          T.awarded.forEach(x => {
            if(erst.some(e => e.pid === x.pid)) return;
            let frueher = 1;
            try { frueher = (seasonTitleHistory(x.pid) || []).filter(r => r.title && r.sid < sid).length; } catch(e){}
            if(!frueher) erst.push({pid:x.pid, titel:x.name});
          });
          chronik = {eintraege:T.awarded.length, traeger:rang.length,
            spitze:rang.slice(0, 3).map(pid => ({pid, n:je[pid]})), erstlinge:erst};
        }
      } catch(e){ chronik = null; }
      // Wer durch die Titel des Monats ein neues Zeichen trägt: der Stand eine
      // Millisekunde vor dem Monatsende gegen den beim Wechsel. Meister, Vize
      // und Team der Saison kommen erst dann [§C34], und gemessen stieg
      // Martin am 1. Juli um 00:00 auf den Volutenkranz III und fiel am
      // Spieltag danach zurück — keine Karte hatte es gesagt. Ein Vergleich
      // über die Laufbahn mit der Liga von heute fragt `ligaAktiv` [§C40].
      // Was der Schluss des Monats an Auszeichnungen vergibt — Meister,
      // Vize, Team der Saison, Untouchable —, steht in der Ehrung des Monats
      // direkt darüber, mit seinem Wert [§11.6f].
      let zeichen = [];
      try {
        const ende = seasonEnd(sid).getTime();
        zeichen = rcpZeichenZuege(rcpLaufbahnDaten(ende, ende + 1))
          .filter(z => pm[z.pid] && ligaAktiv(pm[z.pid]))
          .map(z => ({pid:z.pid, art:z.art, vor:{stufe:z.vor.stufe, grad:z.vor.grad}, nach:{stufe:z.nach.stufe, grad:z.nach.grad}}));
      } catch(e){ zeichen = []; }
      const champ = nameOf(topElo[0].id);
      stories.push({
        id: 'season_recap_' + sid,
        cat: 'season',
        ic: 'crown',
        title: `${champ} ist Meister im ${monat}`,
        // Der Satz nennt, was weder Schlagzeile noch Podest zeigen: Meister,
        // Monat und Elo standen vorher in allen dreien und im Satz darunter.
        desc: `${_fakten.spiele} Sätze und ${_fakten.tore} Games prägten den Monat, ${_fakten.engeSpiele === 1 ? 'ein Satz endete' : _fakten.engeSpiele + ' Sätze endeten'} knapp.`,
        // ── Der Abschluss steht über dem Abend, der ihn beschließt ──
        // Am 1. um 00:00: beim ersten Öffnen nach dem Monatswechsel ist er die
        // jüngste Karte, über dem Spieler des letzten Tages (23:59:00) und
        // der Woche, wenn sie am selben Abend endet (23:59:05). Er stand
        // zuletzt am letzten Tag um 23:50 und damit unter beiden — die Karte
        // des Monats unter der eines einzelnen Tages.
        when: new Date(sStart.getFullYear(), sStart.getMonth(), 1, 0, 0, 0, 0),
        prio: STORY_PRIO.season_recap,
        dataRef: {type:'season_recap', sid, championId:topElo[0].id, championElo:topElo[0].elo,
                  topElo, fakten:_fakten, team, chronik, zeichen}
      });
    }
  } catch(e){}

  // ── Das Karriereende [§C40] ──────────────────────────────────────
  // Die einzige Nachricht über einen Ruheständler, die nach seinem Abschied
  // entsteht — und sie ist Breaking: es gibt sie je Spieler einmal. Die ID
  // trägt den Tag, also bekommt ein zweites Karriereende nach einer
  // Rückkehr eine eigene Karte. Die Zahlen stehen im dataRef, wie bei jeder
  // Story: eine Karte von damals erzählt vom Stand von damals.
  try {
    const nowTs = now.getTime();
    players.forEach(p => {
      const t = ruhestandMs(p);
      if(!t || !sichtbar(p) || t > nowTs || nowTs - t > NEWS_FENSTER_TAGE * _dayMs) return;
      const d = abschiedDaten(p.id);
      if(!d) return;
      const rek = d.rekorde.length;
      stories.push({
        id: 'karriereende_' + p.id + '_' + tagKey(t),
        cat: 'season', ic: 'hourglass',
        title: `${p.name} beendet die Karriere`,
        desc: `${_spZahl(d.spiele)} Sätze, ${_spZahl(d.siege)} Siege und ${Math.round(d.quote * 100)} % Siegquote. `
            + (rek ? `Beim Abschied ${rek === 1 ? 'steht ein Rekord' : 'stehen ' + rek + ' Rekorde'} in der Ewigen Tafel.` : `Die Karriere-Elo steht bei ${d.elo}.`),
        when: new Date(t),
        prio: STORY_PRIO.karriereende,
        dataRef: {type:'karriereende', pid:p.id, playerId:p.id, playerIds:[p.id], retiredAt:p.retired_at,
                  spiele:d.spiele, siege:d.siege, quote:d.quote, elo:d.elo, titel:d.titel,
                  rekorde:rek, prestige:d.prestige.punkte, stufe:d.prestige.stufe}
      });
    });
  } catch(e){}

  // ── 11. Persönliche Sieg-Milestones (Leiter ab 100, jede fünfzigste ab 50) ──
  // Die ID enthält die Marke: stabil und einmalig.
  try {
    // Aus seinen eigenen Partien: auch nach dem Karriereende eine Nachricht
    // über das, was er gespielt hat [§C40].
    // Wie das Jubiläum: jeder Sieg im Fenster, der die Leiter (100, 250,
    // 500 …) oder eine Fünfzigste ab 50 reißt.
    const seit = now.getTime() - NEWS_FENSTER_TAGE * _dayMs;
    players.filter(p => sichtbar(p)).forEach(p => {
      const arr = byPlayer[p.id] || [];
      let wins = 0;
      arr.forEach(last => {
        if(!won(p.id, last)) return;
        wins++;
        const mark = wins;
        if(mts(last) < seit || mts(last) > now.getTime() || !_rundeMarke(mark, 50)) return;
        stories.push({
          id: 'milestone_wins_'+p.id+'_'+mark,
          cat: 'personal',
          ic: 'trophy',
          title: `${nameOf(p.id)}: Sieg Nummer ${mark}`,
          // Der Satz hiess „X feiert den 100. Sieg" und stand damit wortgleich
          // ueber sich selbst. Jeder Text nennt eine Zahl, die die Schlagzeile
          // noch nicht hat [§C33]: hier die Quote, aus der die Marke kommt.
          // Die Partien bis zu der, mit der die Marke fiel — sonst wächst
          // der Nenner mit jeder späteren Partie unter derselben Karte.
          desc: (function(){
            const t = mts(last);
            const ges = (matchesOfPlayer(p.id, matches) || []).filter(m => mts(m) <= t).length;
            return ges
              ? `${mark} Siege aus ${ges} Sätzen, das sind ${Math.round(100 * mark / ges)} %.`
              : `${mark} Siege stehen jetzt in der Bilanz.`;
          })(),
          when: new Date(last.created_at),
          prio: STORY_PRIO.milestone_wins + (mark >= 500 ? 6 : mark >= 250 ? 3 : 0),
          dataRef: {type:'milestone_wins', pid: p.id, milestone: mark+'. Sieg', matchId: last.id}
        });
      });
    });
  } catch(e){}

  // ── 12. Elo-Anstieg der VERGANGENEN Woche (größter Aufsteiger) ──
  // v9.5: abgeschlossene ISO-Woche statt rollende 7 Tage — der „größte
  // Anstieg" steht erst fest, wenn die Woche vorbei ist (belastbar/final).
  try {
    const gains = {};
    for(let i = 0; i < matches.length; i++){
      const m = matches[i];
      const t = mts(m);
      if(t < _wocheStart || t >= _wocheEnde) continue;
      const hist = histMap.get(m.id);
      if(!hist || !hist.deltas) continue;
      for(const pid in hist.deltas){
        gains[pid] = (gains[pid] || 0) + hist.deltas[pid];
      }
    }
    let topPid = null, topGain = 0;
    for(const pid in gains){
      if(!sichtbar(pm[pid])) continue;
      if(gains[pid] > topGain){ topGain = gains[pid]; topPid = pid; }
    }
    if(topPid && topGain >= 50){
      const delta = Math.round(topGain);
      _wochenTeile.push({
        art: 'riser', ic: 'trendUp', label: 'Größter Aufwind',
        pids: [topPid], wert: '+' + delta,
        satz: `${nameOf(topPid)} hat in dieser Woche ${delta} Elo gutgemacht. Das ist der größte Anstieg der Liga.`
      });
    }
  } catch(e){}

  // ── 13. Härtester Elo-Verlust von GESTERN (Pechvogel) ──
  // v9.5: voller Kalendertag „gestern" statt rollende 24 h — nur ein
  // abgeschlossener Tag liefert einen endgültigen „größten Verlust".
  try {
    const losses = {};
    for(let i = 0; i < matches.length; i++){
      const m = matches[i];
      const t = mts(m);
      if(t < _startOfYesterday || t >= _startOfToday) continue;
      const hist = histMap.get(m.id);
      if(!hist || !hist.deltas) continue;
      for(const pid in hist.deltas){
        losses[pid] = (losses[pid] || 0) + hist.deltas[pid];
      }
    }
    let worstPid = null, worstDelta = 0;
    for(const pid in losses){
      if(!sichtbar(pm[pid])) continue;
      if(losses[pid] < worstDelta){ worstDelta = losses[pid]; worstPid = pid; }
    }
    if(worstPid && worstDelta <= -25){ // v8.8: -20→-25 — nur echte Pech-Tage
      const delta = Math.round(worstDelta);
      stories.push({
        id: 'elo_swing_day_'+worstPid+'_'+_yesterdayKey,
        cat: 'misfortune',
        ic: 'dropDouble',
        title: `Harter Tag für ${nameOf(worstPid)}`,
        // „Elo weg an einem Tag. Mehr hat an diesem Tag …" nannte den Tag
        // zweimal in zwei Saetzen.
        desc: `${Math.abs(delta)} Elo verloren, und mehr hat an diesem Spieltag `
            + `niemand abgegeben.`,
        // Die Karte gehoert auf den Tag, von dem sie handelt. Um 00:00 des
        // Folgetages stand sie unter einem Tageskopf, an dem gar nicht
        // gespielt wurde — derselbe Fehler, den der Spieler des Tages hatte.
        // 23:58, damit der Sieger des Tages (23:59) im Feed darueber steht.
        when: (function(){ const d = new Date(_startOfToday); d.setDate(d.getDate() - 1);
          d.setHours(23, 58, 0, 0); return d; })(),
        prio: STORY_PRIO.elo_swing,
        dataRef: {type:'elo_swing', pid: worstPid, delta}
      });
    }
  } catch(e){}

  // ── 14. Größter Kantersieg der VERGANGENEN Woche ──
  // v9.5: abgeschlossene Woche — der „höchste Sieg" steht erst nach Wochenende
  // fest. Tordifferenz ≥ 8, Story verweist aufs Match.
  try {
    let biggest = null;
    for(let i = 0; i < matches.length; i++){
      const m = matches[i];
      const t = mts(m);
      if(t < _wocheStart || t >= _wocheEnde) continue;
      const diff = Math.abs((m.games_a||0) - (m.games_b||0));
      if(!biggest || diff > biggest.diff){
        biggest = {m, diff, t};
      }
    }
    if(biggest && biggest.diff >= 8){
      const _sg = (biggest.m.winner === 'A' ? [biggest.m.a1, biggest.m.a2] : [biggest.m.b1, biggest.m.b2]).filter(Boolean);
      _wochenTeile.push({
        art: 'blowout', ic: 'thriller', label: 'Klarster Sieg',
        pids: _sg, wert: standFuer(biggest.m), matchId: biggest.m.id,
        satz: `${_sg.map(nameOf).join(' und ')} gewinnen mit ${biggest.diff} Games Unterschied. Kein Sieg dieser Woche war deutlicher.`
      });
    }
  } catch(e){}


  // ── 16. Upset der Woche (Underdog schlägt Top-Spieler) ──
  // Sucht in der vergangenen Woche das Match mit dem größten preRank-Vorteil
  // des Verlierers (= Sieger war schwächer rangiert). Nutzt getRankSnapshots.
  // v9.5: abgeschlossene Woche — der „größte Upset" ist erst nach Wochenende final.
  try {
    let bestUpset = null;
    for(let i = 0; i < matches.length; i++){
      const m = matches[i];
      const t = mts(m);
      if(t < _wocheStart || t >= _wocheEnde) continue;
      const snap = snaps[m.id];
      if(!snap || !snap.preRank) continue;
      const winners = m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
      const losers  = m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2];
      // beste preRank der Sieger (niedrigste Zahl = besser)
      // beste preRank der Verlierer
      const winnerBest = Math.min(...winners.map(p => snap.preRank[p] || 99));
      const loserBest  = Math.min(...losers.map(p  => snap.preRank[p] || 99));
      // Upset: Sieger waren SCHLECHTER (höhere Zahl) als Verlierer
      const gap = winnerBest - loserBest;
      if(gap >= 3 && (!bestUpset || gap > bestUpset.gap)){
        bestUpset = {m, gap, t, winners, losers, winnerBest, loserBest};
      }
    }
    if(bestUpset){
      const m = bestUpset.m;
      _wochenTeile.push({
        art: 'upset', ic: 'thriller', label: 'Größte Überraschung',
        pids: bestUpset.winners.slice(0, 2), wert: 'Platz ' + bestUpset.winnerBest, matchId: m.id,
        satz: `${bestUpset.winners.map(nameOf).join(' und ')} stehen auf Platz ${bestUpset.winnerBest} und schlagen Platz ${bestUpset.loserBest}. Der größte Sprung dieser Woche.`
      });
    }
  } catch(e){}

  // ── 16b. Gipfeltreffen: Platz 1 bezwingt Platz 2 (v8.8, v9.3) ──
  // Sucht in den letzten 7 Tagen das JÜNGSTE Match, in dem das Team des
  // Pre-Rank-#1 gegen das Team des #2 antrat und der #1 gewann.
  // v9.3: Am SAISONANFANG unterdrückt — dann haben erst wenige Spieler gespielt
  // und die Ränge sind instabil; ein „Gipfeltreffen" wirkt verfrüht. Solange
  // bleibt der Champion der Vorsaison (season_recap) im Breaking-Rampenlicht.
  try {
    const _clashSeasonAge = (now - seasonStart()) / 86400000;
    const _clashSeasonMs  = matchesInSeason(currentSeason().id);
    const _clashPlayers   = new Set();
    _clashSeasonMs.forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(id => _clashPlayers.add(id)));
    const _seasonMature   = _clashSeasonAge >= 8 && _clashSeasonMs.length >= 12 && _clashPlayers.size >= 5;
    if(_seasonMature){
      const wk = 7 * 86400000;
      const tsNow = now.getTime();
      let best = null;
      for(let i = matches.length - 1; i >= 0; i--){
        const m = matches[i];
        const t = mts(m);
        if(t > tsNow) continue;
        if(t < tsNow - wk) break; // matches asc → ab hier nur noch älter
        const snap = snaps[m.id];
        if(!snap || !snap.preRank) continue;
        const winners = m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
        const losers  = m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2];
        const winnerBest = Math.min(...winners.map(p => snap.preRank[p] || 99));
        const loserBest  = Math.min(...losers.map(p  => snap.preRank[p] || 99));
        if(winnerBest === 1 && loserBest === 2){
          const p1 = winners.find(p => (snap.preRank[p]||99) === 1); // Platz-1-Spieler (Sieger-Team)
          const p2 = losers.find(p  => (snap.preRank[p]||99) === 2); // Platz-2-Spieler (Verlierer-Team)
          if(p1 && p2){
            best = {m, t, winners, losers, p1, p2}; break;
          }
        }
      }
      if(best){
        const m = best.m;
        stories.push({
          id: 'top_clash_'+m.id,
          cat: 'highlight',
          ic: 'kingClass',
          // Der Satz nannte keine Zahl und stand damit gemessen zehnmal
          // wortgleich im Feed [§C33]. Das Ergebnis unterscheidet die
          // Partien, und es steht ohnehin auf der Karte.
          title: `${nameOf(best.p1)} schlägt ${nameOf(best.p2)} im Spitzenspiel`,
          // Das Ergebnis aus der Sicht des Siegers. Es stand in der
          // Reihenfolge der Tabelle („games_a:games_b"), und unter
          // „Leon schlägt Julian im Spitzenspiel" stand damit „9:10" —
          // dieselbe Karte behauptete zwei verschiedene Sieger.
          // Der Stand steht im Kopf der Karte; im Satz stand er ein zweites
          // Mal [§C33].
          desc: `Platz 1 gegen Platz 2, und Platz 1 gewinnt. Der Abstand nach vorn wird größer.`,
          when: new Date(best.t),
          prio: STORY_PRIO.top_clash,
          dataRef: {type:'top_clash', matchId: m.id, winners: best.winners, losers: best.losers, p1: best.p1, p2: best.p2,
                    playerIds:[best.p1, best.p2]}
        });
      }
    }
  } catch(e){}

  // ── 16c. Breaking: All-Time-Rekorde & Giant Slayer (v9.4) ──
  try {
    const rec = _allTimeRecords();
    const RECENT = 14 * 86400000;
    const nowTs = now.getTime();
    const startElo = cfg.start_elo ?? 0;
    const mature = matches.length >= 30; // erst bei genug Liga-Historie

    // Der Elo-Bestwert der Liga hat KEINE eigene Match-Story mehr. Er steht
    // als „Der höchste Gipfel" im Katalog, und damit meldete ihn der
    // Generator zweimal: einmal hier als Breaking aus der Partie und einmal
    // als Rekordwechsel der Ewigen Tafel. Gemessen standen am Saisonstart
    // beide nebeneinander, weil nach einem Reset fast jeder neue Bestwert
    // auch ein Liga-Rekord war. Eine Quelle, eine Karte [§C27].

    // Längste Siegesserie aller Zeiten
    // Ab fuenf: unter fuenf ist eine Serie in dieser Liga keine Seltenheit,
    // und mit sechs blieb der Serien-Rekord einer jungen Liga verschlossen —
    // sie erreicht die fuenf, bevor sie die sechs erreicht, und genau dann
    // ist die laengste Serie ihrer Geschichte eine Nachricht.
    if(mature && rec.streakRec && rec.streakRec.when && rec.streakRec.val >= 5){
      const pid = rec.streakRec.pid;
      if((nowTs - new Date(rec.streakRec.when).getTime()) < RECENT){
        stories.push({
          id: 'streak_record_'+rec.streakRec.matchId,
          cat: 'highlight', ic: 'crownFlame',
          title: `Serien-Rekord: ${nameOf(pid)}`,
          desc: `${rec.streakRec.val} Siege am Stück. Die längste Siegesserie, die die Liga je gesehen hat.`,
          when: new Date(rec.streakRec.when), prio: STORY_PRIO.streak_record,
          dataRef: {type:'streak_record', pid, streak: rec.streakRec.val, matchId: rec.streakRec.matchId}
        });
      }
    }

    // Giant Slayer: jedes wirklich starke Upset (<20 %) ist ein Match-Ereignis
    // und bleibt deshalb auch sichtbar, wenn am Folgetag schon wieder gespielt
    // wurde. Früher entstand nur das EINE extremste Match der letzten sieben
    // Tage; dadurch verschwanden alle übrigen Sensationen aus der Geschichte.
    // Höchstens eine je Spieltag und vier im Fenster halten sie besonders.
    {
      const wk = 14 * 86400000;
      const kandidaten = [];
      for(let i = matches.length - 1; i >= 0; i--){
        const m = matches[i];
        const t = mts(m);
        if(t > nowTs) continue;
        if(t < nowTs - wk) break;
        const expA = (m.exp_a == null) ? 0.5 : m.exp_a;
        const winnerChance = m.winner === 'A' ? expA : (1 - expA);
        if(winnerChance < CHANCE_SENSATION){
          const winners = m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
          const losers  = m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2];
          kandidaten.push({ m, chance: winnerChance, winners, losers, t });
        }
      }
      const jeTag = new Map();
      kandidaten.forEach(gs => {
        const tag = tagKey(gs.t);
        const alt = jeTag.get(tag);
        if(!alt || gs.chance < alt.chance) jeTag.set(tag, gs);
      });
      [...jeTag.values()].sort((a, b) => b.t - a.t)
        .slice(0, NEWS_LIMITS.giantSlayer).forEach(gs => {
        // „und", nicht „&": jede andere Karte der Liga schreibt zwei Namen
        // aus, und das Zeichen stand hier als einziges im Fliesstext.
        const wNames = _namenListe(gs.winners.map(nameOf));
        const lNames = _namenListe(gs.losers.map(nameOf));
        const pct = Math.max(1, Math.round(gs.chance * 100));
        const tore = standFuer(gs.m);
        stories.push({
          id: 'giant_slayer_'+gs.m.id,
          cat: 'highlight', ic: 'giantSlayer',
          // Deutsch und ohne Werbesprache. „Giant Slayer: Maxi & Henry" war
          // der einzige englische Kartentitel der Liga, und „in einer echten
          // Sensation in die Knie" sagte dasselbe wie die Zahl davor, nur
          // lauter [§C33]. Die Schlagzeile nennt jetzt beide Seiten, der Satz
          // die Siegchance und das Ergebnis.
          title: `${wNames} stürzen ${lNames}`,
          desc: `Nur ${pct} % Siegchance vor dem Satz, und am Ende steht ein `
              + `${tore}. Gerechnet war mit einem klaren Sieg für ${lNames}.`,
          when: new Date(gs.m.created_at), prio: STORY_PRIO.giant_slayer,
          dataRef: {type:'giant_slayer', matchId: gs.m.id, winners: gs.winners, losers: gs.losers, chance: gs.chance}
        });
      });
    }
  } catch(e){}

  // ── 16d. Jede Partie bekommt ihre Karte ─────────────────────────────
  // Gebildet wurde nur, was ein auffaelliges Muster traf — ein 10:0, ein
  // Krimi, ein Aussenseitersieg —, und davon hoechstens zwei je Tag.
  // Gemessen ueber das Vierzehn-Tage-Fenster: 52 Partien, und 18 davon kamen
  // in einer sichtbaren Karte ueberhaupt vor. Wer am Abend den Spieltag
  // nachliest, erfuhr von zwei Dritteln der Spiele nichts.
  //
  // Jede Partie bekommt deshalb eine Karte, und sie ist der ANKER ihres
  // Spiels: alles, was in dieser Partie passiert ist — eine Serienmarke, eine
  // Auszeichnung, ein Meilenstein — haengt sich beim Buendeln an sie [§C33].
  // Ohne einen einzigen Fakt bleibt sie das Ergebnis mit den beiden Zahlen,
  // die jede Partie hat: die Siegchance vor dem Anstoss und die Elo danach.
  // Der Deckel je Tag entfaellt fuer sie — eine Karte je Partie IST der
  // Deckel, und eine Partie hoert nicht auf, gespielt worden zu sein.
  try {
    const seit = now.getTime() - NEWS_FENSTER_TAGE * 86400000;
    for(let i = matches.length - 1; i >= 0; i--){
      const m = matches[i], ts = mts(m);
      if(ts > now.getTime()) continue;
      if(ts < seit) break;
      const a = Number(m.games_a) || 0, b = Number(m.games_b) || 0;
      const hoch = Math.max(a, b), tief = Math.min(a, b);
      const diff = hoch - tief;
      const winners = (m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2]).filter(Boolean);
      const losers = (m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2]).filter(Boolean);
      if(!winners.length) continue;
      const h = histMap.get(m.id);
      const expA = h && h.expA != null ? h.expA : (m.exp_a == null ? 0.5 : m.exp_a);
      const chance = m.winner === 'A' ? expA : 1 - expA;
      const wn = _namenListe(winners.map(nameOf));
      const ln = _namenListe(losers.map(nameOf));
      const pct = Math.max(1, Math.round(chance * 100));
      const dl = m.deltas || {};
      // Der groesste Elo-Gewinn der Siegerseite. Er steht auch im `dataRef`,
      // damit die Sammelkarte dieser Partie ihn nennen kann, ohne den Satz
      // dieser Karte abzuschreiben [§C33].
      //
      // ── Und der Gewinn gehoert einem, nicht der Partie ──────────────
      // „Der Sieg bringt +19 Elo" stand da, und die Zahl ist die des
      // STAERKEREN von zwei Siegern: gemessen tragen nur 24 der 466 Partien
      // fuer beide dieselbe Zahl, und der Abstand geht bis 38 Elo. Der Satz
      // nennt deshalb, wem sie gehoert; die Elo je Spieler zeigt das Blatt.
      const _best = winners.map(id => ({id, d: Math.round(dl[id] || 0)}))
        .filter(x => x.d > 0).sort((x, y) => y.d - x.d)[0] || null;
      const plus = _best ? _best.d : 0;
      // Die Anlässe eines Satzes [§1.3]: zu Null, Außenseitersieg, im
      // Tiebreak entschieden, Satzrückstand im Match gedreht, deutlich,
      // umkämpft. Die Schlüssel (`zu_null`, `krimi`, `kanter`, `eng`) stammen
      // aus der Kicker-Liga und stehen in gespeicherten Karten.
      // Eine Karte ist ein Satz, und zu Null ist ein Satz 6:0. Was nur über
      // mehrere Sätze gilt — die Wende, drei umkämpfte Sätze, der Stand 2:1 —
      // erzählt der letzte Satz der Begegnung (`begegnungAm`), und nur,
      // wenn sein Sieger auch die Begegnung gewann; sonst erzählte die Karte
      // eines verlorenen dritten Satzes, wer das Match gewann.
      const pz = partie(m), stand = standFuer(m);
      const bg = begegnungAm(m), bgHier = bg.n > 1 && bg.winner === m.winner;
      const bgStand = bgHier ? `${Math.max(bg.setsA, bg.setsB)}:${Math.min(bg.setsA, bg.setsB)}` : '';
      let art = 'normal', rang = 0, title = '', desc = '', ic = 'padelBall';
      if(pz.zuNull){
        art = 'zu_null'; rang = 10; ic = 'hundred';
        title = `${wn} lassen kein Game zu`;
        desc = `${stand} gegen ${ln}. Ein Satz zu Null.`;
      } else if(chance >= CHANCE_SENSATION && chance < CHANCE_UPSET){
        art = 'upset'; rang = 8; ic = 'giantSlayer';
        title = `${wn} stürzen die Favoriten`;
        desc = `Nur ${pct} % Siegchance vor dem Satz. Trotzdem geht er mit ${stand} an die Außenseiter.`;
      } else if(pz.entscheidTb){
        art = 'krimi'; rang = 6; ic = 'thriller';
        title = `${wn} gewinnen im ${pz.mtb ? 'Match-Tiebreak' : 'Tiebreak'}`;
        desc = `${stand} gegen ${ln}. Entschieden hat der letzte Ballwechsel.`;
      } else if(bgHier && bg.wende){
        art = 'eng'; rang = 5; ic = 'wende';
        title = `${wn} drehen das Match`;
        desc = `Den ersten Satz verloren, am Ende ${bgStand} in Sätzen gegen ${ln}.`;
      } else if(pz.deutlich){
        art = 'kanter'; rang = 4; ic = 'thumbsUp';
        title = `${wn} setzen ein klares Zeichen`;
        desc = `${stand} gegen ${ln}. Mit ${diff} Games Abstand ist das eine klare Angelegenheit.`;
      } else if(bgHier && bg.umkaempft){
        art = 'eng'; rang = 2; ic = 'thriller';
        title = `${wn} gewinnen das Match ${bgStand}`;
        desc = `${ln} holen einen Satz und halten das Match offen, der letzte Satz endet ${stand}.`;
      } else if(bgHier && bg.setsA + bg.setsB >= 2){
        art = 'kanter'; rang = 3; ic = 'zuNull';
        title = `${wn} gewinnen das Match ${bgStand}`;
        desc = `Ohne Satzverlust gegen ${ln}, der letzte Satz endet ${stand}.`;
      } else {
        // Ein Satz ohne Muster hat trotzdem zwei Zahlen, die jeder hat.
        // Das Ergebnis selbst steht im Band darüber und gehört nicht in
        // den Satz [§C33].
        title = `${wn} setzen sich gegen ${ln} durch`;
        desc = `Vor dem Satz lag die Siegchance bei ${pct} %.`
             + (plus ? ` Für ${nameOf(_best.id)} bringt der Satz +${plus} Elo.` : '');
      }
      // ── Die gewöhnliche Partie erzählt ihre Form [§C33] ────────────
      // Sie hieß an jedem Spieltag „X setzen sich gegen Y durch", mit
      // denselben zwei Zahlen darunter, die das Bild ohnehin zeigt. Ihre
      // Form (`_spForm`) findet, was nur diese Partie hat — eine runde
      // Zahl, eine Revanche, einen Lieblingsgegner —, und Schlagzeile und
      // Satz kommen aus derselben Wahl wie der Kopf der Karte. Die Wahl
      // sieht nur Partien bis zu dieser: der Wortlaut bleibt stehen.
      if(art === 'normal' || art === 'eng'){
        let tx = null;
        try { tx = _spScoreText(m) || _spKontext(_spFakten(m)); }
        catch(e){ tx = null; }
        if(tx){ title = tx.t; desc = tx.d; }
      } else {
        // Der Satz unter einem besonderen Ausgang wiederholte ihn: „Nur 1
        // Tor trennt beide Teams" unter dem Herzschlag mit „Ein Tor 10:9",
        // „10:3 gegen Stefan und Julian. Mit 7 Toren Abstand ist das eine
        // klare Angelegenheit." unter dem Stand 10:3. Er sagt jetzt, was
        // der Kopf nicht zeigt (`_spKontext`).
        try { desc = _spKontext(_spFakten(m)).d; } catch(e){}
      }
      stories.push({
        id: 'spiel_' + m.id,
        cat: 'highlight', ic, title, desc,
        when: new Date(ts), prio: STORY_PRIO.spiel + rang,
        dataRef: {type:'spiel', resultKind:art, matchId:m.id,
                  playerIds:winners, winners, losers, margin:diff,
                  stand: hoch + ':' + tief, quote: pct, elo: plus,
                  // Wem der Elo-Gewinn gehoert: die Sammelkarte nennt ihn
                  // im selben Satz, und ohne die ID stuende die Zahl dort
                  // wieder als die der ganzen Partie.
                  eloPid: _best ? _best.id : undefined,
                  chance: art === 'upset' ? chance : undefined,
                  causalKey:_storyGruppeKey('match', m.id)}
      });
    }
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] spiel', e); }

  // ── 17. Serienkiller (Match beendete ≥4er Sieges-Streak des Gegners) ──
  // Nutzt getStreakSnapshots — pro Match {pid: streak_VOR_match}. v9.7: Schwelle
  // von 6 auf 4 gesenkt; zusätzlich merken wir uns das Sieger-Team (wer die
  // Serie gestoppt hat), damit die News zeigt, welches Team welchen Spieler
  // gebremst hat.
  // v9.8: Serien ≥7 werden IMMER als eigene News getriggert (jede einzelne).
  // Für kleinere Unterbrechungen (4–6) bleibt es bei der EINEN prominentesten,
  // damit der Feed bei vielen 4er-Serien nicht zuspammt.
  try {
    const wk = 14 * 86400000;
    const tsNow = now.getTime();
    const streakSnaps = getStreakSnapshots();
    const kills = [];
    for(let i = 0; i < matches.length; i++){
      const m = matches[i];
      const t = mts(m);
      if(t < tsNow - wk || t > tsNow) continue;
      const snap = streakSnaps[m.id];
      if(!snap) continue;
      const losers  = m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2];
      const winners = m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
      // Höchste laufende Streak unter den Verlierern VOR diesem Match
      let maxLoserStreak = 0, victimPid = null;
      losers.forEach(pid => {
        const s = snap[pid] || 0;
        if(s > maxLoserStreak){ maxLoserStreak = s; victimPid = pid; }
      });
      if(maxLoserStreak >= 4){
        kills.push({m, streak: maxLoserStreak, victimPid, winners, t});
      }
    }
    // ≥7 immer (alle), 4–6 nur die prominenteste (falls es keine ≥7 gab bzw.
    // zusätzlich als „ruhige-Phase"-Fallback, wenn gar keine große Serie fiel).
    const big = kills.filter(k => k.streak >= 7);
    const small = kills.filter(k => k.streak < 7).sort((a, b) => b.streak - a.streak || b.t - a.t);
    const chosen = big.slice();
    if(!big.length && small.length) chosen.push(small[0]);
    chosen.forEach(kill => {
      const m = kill.m;
      const breakerIds = (kill.winners || []).filter(Boolean);
      // „Julian und Maxi brechen Martins 6er-Serie" sagt in der Schlagzeile,
      // was passiert ist. Vorher stand dort „Serie gerissen: Martin" und der
      // Satz darunter nannte die Namen — die Schlagzeile trug damit den
      // Verlierer und nicht die Tat.
      const _killNamen = breakerIds.map(nameOf);
      const breakerNames = _killNamen.length > 1
        ? _killNamen.slice(0, -1).join(', ') + ' und ' + _killNamen[_killNamen.length-1]
        : (_killNamen[0] || '');
      stories.push({
        id: 'streak_killer_'+m.id,
        cat: 'highlight',
        ic: 'crossedSwords',
        title: `${breakerNames} brechen ${nameOf(kill.victimPid)}s ${kill.streak}er-Serie`,
        desc: `${nameOf(kill.victimPid)} hatte ${kill.streak} Sätze in Folge gewonnen. Jetzt ist Schluss.`,
        when: new Date(kill.t),
        prio: STORY_PRIO.streak_killer + (kill.streak >= 10 ? 4 : 0),
        dataRef: {type:'streak_killer', matchId: m.id, streak: kill.streak, victimPid: kill.victimPid, breakerIds}
      });
    });
  } catch(e){}

  // ── 18. Krimi der VERGANGENEN Woche (im Tiebreak entschieden, die längste) ──
  // v9.5: abgeschlossene Woche — der „knappste Sieg" ist erst final, wenn die
  // Woche vorbei ist.
  try {
    let thriller = null;
    for(let i = 0; i < matches.length; i++){
      const m = matches[i];
      const t = mts(m);
      if(t < _wocheStart || t >= _wocheEnde) continue;
      // Nur Partien, die der Tiebreak entschied; unter ihnen die längste.
      if(!partie(m).entscheidTb) continue;
      const totalScore = (m.games_a||0) + (m.games_b||0);
      if(!thriller || totalScore > thriller.totalScore){
        thriller = {m, totalScore, t};
      }
    }
    if(thriller){
      const m = thriller.m;
      const _tg = (m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2]).filter(Boolean);
      _wochenTeile.push({
        art: 'thriller', ic: 'thriller', label: 'Krimi der Woche',
        pids: _tg, wert: standFuer(m), matchId: m.id,
        satz: `${_tg.map(nameOf).join(' und ')} entscheiden den Satz im ${partie(m).mtb ? 'Match-Tiebreak' : 'Tiebreak'}. ${thriller.totalScore} Games wurden gespielt, mehr als in jedem anderen solchen Satz dieser Woche.`
      });
    }
  } catch(e){}

  // ── 19. Rivalitäts-Meilenstein (50/100/200/500 H2H-Duelle ERREICHT) ──
  // Im Gegensatz zu Story 7 (Rivalry) triggert das nur, wenn das jüngste
  // Match der Paarung gerade eine Schwelle riss → "100. Aufeinandertreffen!".
  try {
    // Gemeldet wird JEDE ueberschrittene Schwelle, nicht nur die, auf der ein
    // Paar gerade steht. Der Grund ist der Wortlaut: die ID traegt die Zahl
    // (`rivalry_milestone_A|B_50`), und wenn das Paar bei 52 steht, bildet der
    // Generator die 50er-ID nicht mehr. `_newsTexteAuffrischen` kann sie dann
    // nicht auffrischen, und „Historisches 50. Aufeinandertreffen — die
    // Rivalitaet waechst" stand mit Gedankenstrich und leerem Satz im Feed,
    // Monate nachdem der Text ersetzt worden war.
    //
    // Der Zeitpunkt ist der der KREUZENDEN Partie, nicht der letzten: die
    // Karte gehoert an den Tag, an dem das 50. Duell gespielt wurde.
    const pairThresholds = [50, 100, 200, 500];
    const pairCnt = {};
    const gekreuzt = [];
    chronoMatches.forEach(m => {
      const A = [m.a1, m.a2], B = [m.b1, m.b2];
      A.forEach(a => B.forEach(b => {
        if(a === b) return;
        const k = a < b ? a+'|'+b : b+'|'+a;
        if(!pairCnt[k]) pairCnt[k] = {n:0, w:{}};
        pairCnt[k].n++;
        // Der Zwischenstand im selben Durchlauf: „Das 50. Aufeinandertreffen
        // dieser beiden" stand wortgleich unter zwei Karten, weil zwei Paare
        // dieselbe Schwelle rissen — und nannte keine einzige Zahl [§C33].
        const sieger = (m.winner === 'A') ? (A.indexOf(a) >= 0 ? a : b)
                                          : (B.indexOf(a) >= 0 ? a : b);
        pairCnt[k].w[sieger] = (pairCnt[k].w[sieger] || 0) + 1;
        if(pairThresholds.includes(pairCnt[k].n))
          gekreuzt.push({k, n: pairCnt[k].n, ts: mts(m), mid: m.id,
                         wa: pairCnt[k].w[a] || 0, wb: pairCnt[k].w[b] || 0});
      }));
    });
    // Über die ganze Ligageschichte reißen viele Paare eine Schwelle: gemessen
    // sechzehn, von denen zwei im Feed standen. Die anderen vierzehn wurden
    // trotzdem gebildet und persistiert — Zeilen in der Datenbank für Karten,
    // die niemand je sieht. Gemeldet werden die jüngsten; ein Meilenstein von
    // vor drei Monaten ist keine Nachricht mehr.
    gekreuzt.sort((x, y) => y.ts - x.ts);
    gekreuzt.slice(0, NEWS_LIMITS.rivalryMarke).forEach(g => {
      const [a, b] = g.k.split('|');
      stories.push({
        id: 'rivalry_milestone_'+g.k+'_'+g.n,
        cat: 'rivalry',
        ic: 'crossedSwords',
        title: `${g.n}. Duell: ${nameOf(a)} vs ${nameOf(b)}`,
        desc: g.wa === g.wb
          ? `Nach ${g.n} Duellen steht es ${g.wa}:${g.wb}. Keiner liegt vorn.`
          : `Nach ${g.n} Duellen steht es ${Math.max(g.wa, g.wb)}:${Math.min(g.wa, g.wb)} `
            + `für ${nameOf(g.wa > g.wb ? a : b)}.`,
        when: new Date(g.ts),
        prio: STORY_PRIO.rivalry_milestone + (g.n >= 200 ? 4 : g.n >= 100 ? 2 : 0),
        dataRef: {type:'rivalry_milestone', a, b, n: g.n, matchId: g.mid}
      });
    });
  } catch(e){}

  // ── 20. Game-Meilensteine (unbegrenzte Leiter ab 500 gewonnenen Games) ──
  // Der Typ heißt `milestone_goals` aus der Kicker-Liga; gezählt werden die
  // gewonnenen Games.
  try {
    // Aus seinen eigenen Partien: auch nach dem Karriereende eine Nachricht
    // über das, was er gespielt hat [§C40].
    players.filter(p => sichtbar(p)).forEach(p => {
      const arr = byPlayer[p.id] || [];
      if(!arr.length) return;
      let goals = 0;
      for(let i = 0; i < arr.length; i++){
        const m = arr[i];
        const onA = (p.id===m.a1||p.id===m.a2);
        goals += onA ? (m.games_a||0) : (m.games_b||0);
      }
      // Die jüngste Partie liefert die letzten Games → prüfen, ob damit eine
      // Leiter-Marke gerissen wurde (500, 1000, 2500, 5000, 10000, …).
      const last = arr[arr.length-1];
      const lastGoals = (p.id===last.a1||p.id===last.a2) ? (last.games_a||0) : (last.games_b||0);
      const mark = _ladderCrossing(goals - lastGoals, goals, 500);
      if(mark){
        stories.push({
          id: 'milestone_goals_'+p.id+'_'+mark,
          cat: 'personal',
          ic: 'target',
          title: `${nameOf(p.id)}: ${mark}. gewonnenes Game`,
          desc: `${goals} gewonnene Games stehen jetzt in der Karriere-Bilanz von ${nameOf(p.id)}.`,
          when: new Date(last.created_at),
          prio: STORY_PRIO.milestone_goals + (mark >= 1000 ? 4 : 0),
          dataRef: {type:'milestone_goals', pid: p.id, milestone: mark+'. Game', matchId: last.id}
        });
      }
    });
  } catch(e){}

  // ── 20b. Persönliche Elo-Meilensteine (unbegrenzt, v9.5) ──
  // Allzeit-Höchst-Elo überschreitet eine runde 100er-Marke (ab Start-Elo+200).
  // Nur „frische" Marken (Rekord-Match ≤ 14 Tage alt) werden zur News — sonst
  // würde beim ersten Lauf die gesamte Historie nachträglich einfließen.
  try {
    const RECENT = 14 * _dayMs;
    const nowTs = now.getTime();
    _eloMilestones().forEach(e => {
      if(!e.when) return;
      if(nowTs - new Date(e.when).getTime() > RECENT) return;
      stories.push({
        id: 'milestone_elo_'+e.pid+'_'+e.mark,
        cat: 'personal',
        ic: 'peak',
        title: `${nameOf(e.pid)} knackt ${e.mark} Elo`,
        // „X knackt 300 Elo" und darunter „300 Elo zum ersten Mal
        // ueberschritten" ist dieselbe Zeile zweimal.
        desc: `Der Sprung liegt ${e.mark - (cfg.start_elo ?? 1000)} Elo über dem `
            + `Startwert und markiert den höchsten Stand der ganzen Laufbahn.`,
        when: new Date(e.when),
        prio: STORY_PRIO.milestone_elo + (e.mark >= (cfg.start_elo ?? 1000) + 500 ? 4 : 0),
        dataRef: {type:'milestone_elo', pid: e.pid, milestone: e.mark+' Elo', mark: e.mark, matchId: e.matchId}
      });
    });
  } catch(e){}

  // ── 21. Marken einer Sieges-Streak (≥3 in Folge) ──────────────────
  // Eine Serie ist ein Ereignis des Matches, das die Marke vollmacht — kein
  // flüchtiger Live-Zustand. Die alte Fassung betrachtete nur das jüngste
  // Match eines Spielers. Nach der nächsten Niederlage verschwand damit auch
  // seine 5er-Serie rückwirkend, obwohl sie tatsächlich stattgefunden hatte.
  // Der chronologische Walk bildet stabile, idempotente Karten im Fenster.
  try {
    const seit = now.getTime() - 14 * _dayMs;
    const lauf = {}, laufStart = {}, kandidaten = [];
    // Die Leiter beginnt bei drei. Drei Siege in Folge sind das, was die
    // meisten ueberhaupt erreichen [§C26] — dieselbe Schwelle, bei der am
    // Wappen das Feuer angeht; sie stand hier bei fuenf und damit eine Stufe
    // ueber dem, was das Zeichen daneben schon feiert. Danach fuenf, acht,
    // zehn und jede fuenfte: sieben und zehn lagen dicht beieinander, acht
    // ist die Marke, die einen langen Spieltag abschliesst.
    chronoMatches.forEach(m => {
      if(mts(m) > now.getTime()) return;
      const aGewinnt = m.winner === 'A';
      [[m.a1,aGewinnt],[m.a2,aGewinnt],[m.b1,!aGewinnt],[m.b2,!aGewinnt]].forEach(([pid, sieg]) => {
        if(!pid) return;
        lauf[pid] = sieg ? (lauf[pid] || 0) + 1 : 0;
        // Der LAUF ist die Einheit, nicht der Tag: eine Serie, die ueber
        // Nacht weiterlaeuft, ist eine Geschichte. Gemerkt wird deshalb die
        // Partie, mit der sie angefangen hat — daran erkennt die Anzeige,
        // dass die 5er-Marke von gestern in der 8er von heute steckt.
        if(lauf[pid] === 1) laufStart[pid] = m.id;
        const n = lauf[pid];
        const istMarke = istSerienMarke(n);
        if(istMarke && mts(m) >= seit)
          kandidaten.push({pid, streak:n, when:new Date(m.created_at), matchId:m.id,
                           lauf:laufStart[pid]});
      });
    });
    // ── Eine Serie je Spieler und Tag, die laengste ─────────────────
    // An einem Spieltag mit acht Partien fallen die 5er- UND die 7er-Marke
    // desselben Spielers. „Jonas zuendet die 5er-Serie" und „Jonas zuendet
    // die 7er-Serie" untereinander sind eine Nachricht und eine
    // Wiederholung: die laengere enthaelt die kuerzere. Gemessen erzeugte
    // die Probeliga sieben Serienkarten und brachte keine einzige in den
    // Feed — sie deckelten sich gegenseitig weg [§C33].
    const _jeTag = new Map();
    kandidaten.forEach(c => {
      const k = c.pid + '|' + tagKey(c.when);
      const alt = _jeTag.get(k);
      if(!alt || c.streak > alt.streak) _jeTag.set(k, c);
    });
    // ── Dieselbe Marke ist einmal Nachricht ────────────────────────
    // Seit die Leiter bei drei beginnt, erreicht derselbe Spieler dieselbe
    // Marke im Fenster mehrmals: „Alex zuendet die 3er-Serie" stand gemessen
    // zweimal im Feed, einmal als eigene Karte und einmal als Zeile einer
    // Sammelkarte — zwei Laeufe, aber fuer den, der liest, dieselbe Zeile.
    // Es bleibt die juengste; dieselbe Regel wie bei einer wiederholten
    // Auszeichnung [§11.0c].
    const _jeMarke = new Map();
    [..._jeTag.values()].forEach(c => {
      const k = c.pid + '|' + c.streak;
      const alt = _jeMarke.get(k);
      if(!alt || c.when > alt.when) _jeMarke.set(k, c);
    });
    [..._jeMarke.values()].sort((a,b) => b.when - a.when || b.streak - a.streak)
      .slice(0, NEWS_LIMITS.winStreak).forEach(c => {
      stories.push({
        id: 'win_streak_'+c.pid+'_'+c.matchId+'_'+c.streak,
        cat: 'highlight',
        ic: 'flame',
        title: `${nameOf(c.pid)} zündet die ${c.streak}er-Serie`,
        // „kein Stolpern: Mit diesem Schlusspfiff waechst der Lauf zur echten
        // Serie" nannte keine Zahl, die die Schlagzeile nicht schon hat, und
        // stand gemessen fuenfzigmal wortgleich im Feed [§C33].
        // „damit" heißt: bis zu DIESER Partie. Gezählt wurde bis heute —
        // „Martin zündet die 8er-Serie" um 10:56 nannte „134 Siege aus 211
        // Partien", die Zahl nach seiner letzten Partie des Tages, und sie
        // wuchs mit jeder weiteren, unter einer Karte, die stehen bleibt.
        desc: (function(){
          const t = new Date(c.when).getTime();
          const alle = (matchesOfPlayer(c.pid, matches) || []).filter(m => mts(m) <= t);
          const siege = alle.filter(m => won(c.pid, m)).length;
          // Die Länge steht in der Schlagzeile („zündet die 3er-Serie");
          // „Drei Siege in Folge." darunter sagte sie ein zweites Mal.
          return `In der Laufbahn stehen damit ${siege} Siege aus ${alle.length} Sätzen.`;
        })(),
        when: c.when,
        prio: STORY_PRIO.win_streak + (c.streak >= 10 ? 6 : c.streak >= 7 ? 3 : 0),
        dataRef: {type:'win_streak', pid: c.pid, streak: c.streak, matchId:c.matchId,
                  lauf:c.lauf || ''}
      });
      });
  } catch(e){}

  // ── 22. Längste Pause (kein Spielbetrieb in den letzten X Tagen) ──
  // Story zeigt sich erst, wenn die aktuelle Stille fünf Tage andauert. Ab
  // drei Tagen meldete sie jedes Wochenende: gespielt wird werktags, und
  // von Donnerstag bis Montag stand „3 Tage ohne Spiel" im Feed, obwohl
  // nichts Ungewöhnliches geschah.
  // v9.17 FORMULIERUNG: Der Text behauptete pauschal „Längste Pause seit Langem"
  // — ungeprüft und bei einer 3-Tage-Lücke schlicht falsch. Jetzt wird die
  // längste Pause der Liga-Historie mitgerechnet (eine Schleife über die bereits
  // aufsteigend sortierten Matches) und nur dann als Rekord benannt, wenn sie es
  // auch ist. Sonst gibt es die ehrliche Einordnung gegen die Bestmarke.
  try {
    if(matches.length){
      const lastMatchTs = mts(matches[matches.length-1]);
      const sinceLastDays = Math.floor((now.getTime() - lastMatchTs) / 86400000);
      if(sinceLastDays >= NEWS_PAUSE_TAGE){
        let maxGapDays = 0;
        for(let i = 1; i < matches.length; i++){
          const gap = Math.floor((mts(matches[i]) - mts(matches[i-1])) / 86400000);
          if(gap > maxGapDays) maxGapDays = gap;
        }
        const isRecord = sinceLastDays > maxGapDays;
        stories.push({
          // Pro Pause genau 1 Story (lastMatchId bleibt stabil bis zum
          // nächsten Match) — kein täglicher Spam mehr.
          id: 'dry_spell_'+matches[matches.length-1].id,
          cat: 'fun',
          ic: 'clock',
          title: `${sinceLastDays} Tage Pause`,
          desc: isRecord
            ? `So lange blieb der Court noch nie leer.`
            : `Die längste Pause der Liga waren ${maxGapDays} Tage.`,
          when: now,
          prio: STORY_PRIO.dry_spell,
          dataRef: {type:'dry_spell', daysSince: sinceLastDays, lastMatchId: matches[matches.length-1].id, maxGapDays}
        });
      }
    }
  } catch(e){}

  // ── Spieler der Woche (POTW) der Vorwoche (v8.7) ──
  // Persistente News zu Wochenbeginn (Mo früh), analog zum POTW-Recap-Sheet.
  // Deterministische ID pro Woche → kein Doppel, Cross-Device-stabil.
  try {
    {
      const range = _potwLastWeekRange();
      // Derselbe Ausschnitt wie im Rückblick [§C27]: der Filter stand hier
      // ein zweites Mal, Zeile für Zeile dieselbe — und zwei Rechnungen über
      // dieselbe Frage nennen irgendwann zwei verschiedene Beste.
      const wm = _potwMatchesInRange(range.start, range.end);
      const res = _newsPeriodWinner(wm, 'woche');
      if(res){
        const main = res.main;
        const names = res.winners.map(w => nameOf(w.id));
        _wochenTeile.unshift({
          art: 'potw', ic: 'weekKing', label: 'Spieler der Woche', held: true,
          pids: res.winners.map(w => w.id), wert: Math.round(main.wr*100) + ' %',
          satz: `${_namenListe(names)} ${names.length > 1 ? 'gewinnen' : 'gewinnt'} `
              + `${main.wins} von ${main.wins + main.losses} Sätzen und ${names.length > 1 ? 'haben' : 'hat'} damit die beste Quote.`,
          potw: {weekKey: _potwKeyOf(range.start), playerId: main.id,
                 playerIds: res.winners.map(w => w.id), wins: main.wins, wr: main.wr}
        });
      }
    }
  } catch(e){}

  // ── Spieler des Tages, je Spieltag des Fensters ──────────────────────
  // Er entstand nur fuer den LETZTEN Spieltag (`_potdLastDayData` sucht von
  // hinten den ersten Tag mit einem Kandidaten und hoert dann auf). Der Feed
  // reicht aber vierzehn Tage zurueck, und in ihm liegen sechs bis sieben
  // Spieltage: gemessen ueber das Fenster war genau EINE Karte gebildet, und
  // die sechs Tage davor hatten keinen Sieger mehr. Der Spieler des Tages IST
  // die Schlagzeile seines Spieltags [§C33] — wer am Abend nachliest, findet
  // sonst Partien ohne Zusammenfassung. Die ID traegt den Tag, ist also
  // stabil, und ein zweiter Lauf legt keine Zeile dazu.
  try {
    _potdTage.forEach(({rep, res, ehrung, brk, groesser}, dayKey) => {
      const main = res.main;
      const names = res.winners.map(w => nameOf(w.id));
      // Auch hier die Aufzaehlung der App [§C27]: „Leon & Martin holen den
      // Tag" war die letzte Schlagzeile mit „&" im Feed.
      const titleNames = _namenKurz(names);
      const p = dayKey.split('-');
      const dLabel = p[2] + '.' + p[1] + '.';
      stories.push({
        id: 'potd_' + dayKey,
        cat: 'highlight',
        ic: 'dayKing',
        title: names.length > 1 ? `${titleNames}: Spieler des Tages` : `${titleNames} ist Spieler des Tages`,
        // Die Siegquote steht NICHT vorn — der Titel wird ueber die absoluten
        // Tagessiege vergeben (siehe `_newsPeriodWinner`). Die Quote bleibt als
        // Kontext, damit die Zahl einordbar ist. „Am 16.07. hat niemand mehr
        // geholt" — geholt WAS? Der Satz nennt, worum es geht: mehr Siege.
        desc: `${main.wins} von ${main.wins + main.losses} Sätzen gewonnen, `
            + `das sind ${Math.round(main.wr*100)} %. Mehr Siege hat am `
            + `${dLabel} niemand geholt.`,
        when: rep,
        prio: STORY_PRIO.potd,
        dataRef: {type:'potd', dayKey, playerId: main.id,
                  playerIds: res.winners.map(w => w.id),
                  wins: main.wins, games: main.wins + main.losses, wr: main.wr,
                  // Was der Tag an Auszeichnungen brachte, je Geehrtem mit
                  // Posten und Wert: die Ehrung des Tages [§11.6f]. `ehrungVoll`
                  // sagt, dass sie den ganzen Tag trägt (gespeicherte Karten
                  // von vorher nur den Schluss), `ehrungBrk`, ob der Schluss
                  // eine legendäre außer der Schlagzeile vergab, `ehrungIn`,
                  // welche größere Ehrung den Tag trägt (dann ist sie leer).
                  ehrung, ehrungVoll:true, ehrungBrk:brk, ...(groesser ? {ehrungIn:groesser} : {})}
      });
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] potd', e); }

  // ── Die Ehrung eines Tages ohne Spieler des Tages [§11.6f] ───────────
  // Um 23:59 wie der Spieler des Tages; wer am meisten abgab, hängt sich
  // beim Anzeigen an sie (`gegenstueck`).
  try {
    _ehrungTage.forEach(({rep, ehrung, brk}, dayKey) => {
      const st = _ehrungKarte(ehrung, 'tagesehrung_' + dayKey, rep.getTime(), {periode:'tag', tag:dayKey, voll:true, breaking:brk});
      if(st) stories.push(st);
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] tagesehrung', e); }

  // ── Die Runde der Vier [§C33, §11.6c] ────────────────────────────────
  // Eine eigene Story je abgeschlossener Runde, dreißig Minuten nach ihrer
  // letzten Partie. Die Karten der Partien bleiben daneben stehen.
  try { _newsZeitraumEhrungen(now.getTime()).forEach(st => stories.push(st)); }
  catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] ehrung', e); }
  try { _newsRundenStories(now.getTime()).forEach(st => stories.push(st)); }
  catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] runde', e); }

  // Hinweis (v8.6): Die Konsolidierung gegen Match-Event-Spam (mehrere fast
  // identische Karten pro Match) passiert bewusst NICHT hier im Generator,
  // sondern beim Anzeigen (_consolidateStories, §11.2) — siehe Begründung dort.

  // ── Das Team der Woche ───────────────────────────────────────────────
  // Es gab Team-SERIEN („7 Siege am Stück") und ein Team der Saison, aber
  // nichts dazwischen: die beste Paarung einer Woche kam im Feed nicht vor,
  // obwohl der Spieler der Woche seit jeher eine Karte hat. Gerechnet wird
  // mit `teamStatsFromMatches` — derselben Funktion, aus der auch der
  // Teams-Tab seine Zahlen zieht [§C27]; eine zweite Rechnung über dieselbe
  // Frage nennt irgendwann ein anderes Duo als die Ansicht daneben.
  try {
    {
      const wochenMs = matches.filter(m => {
        const t = mts(m); return t >= _wocheStart && t < _wocheEnde;
      });
      if(wochenMs.length){
        const duos = teamStatsFromMatches(wochenMs)
          .filter(t => t.g >= 4 && t.ids.every(id => sichtbar(pm[id])))
          // Quote zuerst, dann die Zahl der Partien: ein 4:0 ist stärker als
          // ein 9:3, aber bei gleicher Quote zählt, wer öfter angetreten ist.
          .sort((a, b) => (b.w/b.g) - (a.w/a.g) || b.g - a.g || (b.gf-b.ga) - (a.gf-a.ga));
        const best = duos[0];
        if(best && best.w > best.g - best.w){
          const q = Math.round(best.w / best.g * 100);
          _wochenTeile.push({
            art: 'team', ic: 'duo', label: 'Team der Woche', duo: true,
            pids: best.ids, wert: q + ' %',
            satz: `${nameOf(best.ids[0])} und ${nameOf(best.ids[1])} gewinnen ${best.w} der ${best.g} gemeinsamen Sätze, bei ${best.gf}:${best.ga} Games.`
                + (duos[1]
                    ? ` Dahinter ${nameOf(duos[1].ids[0])} und ${nameOf(duos[1].ids[1])} mit ${Math.round(duos[1].w/duos[1].g*100)} %.`
                    : ' Kein zweites Duo kam auf vier gemeinsame Sätze.'),
            team: {playerIds:best.ids, wins:best.w, games:best.g, gf:best.gf, ga:best.ga}
          });
        }
      }
    }
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] team der woche', e); }

  // ── Die Woche: sechs Wertungen in einer Karte ────────────────────────
  // Sie steht am Sonntag um 23:59:05, wenn die Woche vorbei ist und der Montag
  // als Spieltag noch nicht angefangen hat. Erscheint gar nicht, wenn die Woche
  // keine Partie hatte: ein Wochenrückblick ohne Woche ist ein Kalendereintrag.
  try {
    if(_wocheDue && _wochenTeile.length >= 2){
      // Die Reihenfolge ist die Wertigkeit, nicht die Reihenfolge, in der die
      // sechs Bloecke im Generator stehen. Das Team der Woche entstand als
      // letztes und stand damit auch als letztes: die zwei Wertungen, die
      // einen Sieger der Woche kueren, standen an Platz eins und Platz sechs.
      const _wRang = ['potw', 'team', 'riser', 'blowout', 'upset', 'thriller'];
      _wochenTeile.sort((a, b) => {
        const ra = _wRang.indexOf(a.art), rb = _wRang.indexOf(b.art);
        return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb);
      });
      const _wHeld = _wochenTeile.find(t => t.held) || _wochenTeile[0];
      const _wSpiele = matches.filter(m => { const t = mts(m); return t >= _wocheStart && t < _wocheEnde; });
      const _wTage = new Set(_wSpiele.map(m => new Date(m.created_at).toDateString())).size;
      const _wName = _namenKurz(_wHeld.pids.map(nameOf));
      const _wSchluss = new Date(_wocheSlotTs);
      stories.push({
        id: 'woche_' + _lastWeekKey,
        cat: 'season',
        ic: 'weekKing',
        title: _wHeld.art === 'potw' ? `Die Woche gehört ${_wName}` : `Die Woche der Liga`,
        desc: `${_wSpiele.length} ${_wSpiele.length === 1 ? 'Satz' : 'Sätze'} an ${_wTage} ${_wTage === 1 ? 'Tag' : 'Tagen'}. `
            + _wHeld.satz,
        when: _wSchluss,
        prio: STORY_PRIO.woche,
        dataRef: {type:'woche', woche:_lastWeekKey, spiele:_wSpiele.length, tage:_wTage,
                  playerIds: _wHeld.pids.slice(0, 2),
                  // Was der Schluss der Woche neben dem Spieler der Woche
                  // vergibt, steht in der Ehrung der Woche [§11.6f].
                  teile: _wochenTeile.map(t => ({art:t.art, ic:t.ic, label:t.label, pids:t.pids,
                                                 wert:t.wert, satz:t.satz, duo:!!t.duo,
                                                 matchId:t.matchId || null}))}
      });
    }
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] wochenkarte', e); }

  // ── §11.1a Die Ewige Tafel meldet sich ────────────────────────────────
  // Der ganze Awards-Reiter kam im Feed nicht vor. Wer einen Liga-Rekord
  // übernahm, eine Monatschronik holte oder eine Insignium-Stufe erreichte,
  // erfuhr davon nur, wenn er selbst nachsah — und genau das hätte eine
  // Liga-Zeitung zu melden.
  //
  // Die Quelle ist ein Zeitschnitt: der Rekordstand VOR dem letzten Spieltag
  // gegen den von heute. `allChronicles(bisMs)` kostet einmal ~18 ms und liegt
  // danach in `_chronCtxBis`; der Generator selbst ist ohnehin memoisiert.
  //
  // Ein Spieltag, EIN Paar von Staenden [§11.0e]. Die drei Bloecke darunter —
  // Liga-Rekord, Monatschronik, Insignium — rechneten sich ihre Tagesgrenze
  // und ihren Zeitschnitt vorher jeder selbst aus, und jeder ein bisschen
  // anders: die Chronik fragte `prestigeTabelle` am Zeitstempel der letzten
  // Partie, also mit einem Schnitt, der nichts abschneidet [§3]. Drei
  // Rechnungen ueber dieselbe Aenderung nennen irgendwann drei Zahlen, und
  // die stehen dann auf drei Karten derselben Minute.
  const _tafelTag = _storyTagGrenzen(matches.length ? mts(matches[matches.length - 1]) : 0);
  const _tafelVor = _tafelTag ? _storyStand(_tafelTag.vorMs) : null;
  const _tafelNach = _tafelTag ? _storyStand(_tafelTag.nachMs) : null;
  // Was eine Aenderung wirklich gebracht hat, steht an EINER Stelle: der
  // Katalogwert ist der Grundwert, nicht der Zuwachs [§C34].
  const _tafelWirkung = pid => _prestigeWirkung(pid, _tafelVor, _tafelNach);
  // Was ein Rekord der Laufbahn WIRKLICH bringt [§C34]. Gespeichert werden
  // die beiden Stände und die Rechnung der Quelle, nie der Grundwert: ein
  // zehnter Rekord gibt nicht 100 Prestige, er wird durch die Zahl seiner
  // Halter geteilt, landet auf einem Rang im Stapel und wird dort durch die
  // Wurzel seiner Staffel geteilt — und weil er die anderen Rekorde mit
  // verschiebt, ist der Nettozuwachs am Ende noch eine dritte Zahl.
  // ── Jede Tafel-Meldung traegt die Wirkung ihrer Beteiligten ──────
  // Im Blatt eines Tafel-Moments steht EIN Bereich „Wirkung auf die
  // Laufbahn", und der liest die Angabe aus den Zeilen. Nur die Rekord-Zeile
  // trug sie: gemessen fehlte Leo dort ganz, obwohl seine Zeile „+80
  // Prestige fuer die Laufbahn" nennt — und die Summe in der Zahlenreihe
  // stand auf +196, dem Zuwachs eines einzigen Spielers. Wer genannt wird,
  // kommt vor.
  // Die Genannten zuerst, dahinter die bisherigen Halter, die nicht mehr
  // allein halten. Vier statt drei, damit ein Vorgaenger neben drei neuen
  // Haltern noch Platz hat.
  const _mitVorgaengern = (wer, vorher) => {
    const o = (wer || []).slice(0, 3);
    (vorher || []).forEach(pid => { if(o.indexOf(pid) < 0) o.push(pid); });
    return o.slice(0, 4);
  };
  const _tafelLaufbahn = pids => {
    const o = {};
    (pids || []).slice(0, 4).forEach(pid => {
      const w = _tafelWirkung(pid);
      // Die Quellen reisen mit: die Zahl ist die Bewegung des ganzen Tages
      // über alle drei Quellen, die Zeilen der Karte nennen nur Rekord- und
      // Chronikwechsel. Ohne Aufschlüsselung stand „übernimmt ‚Der
      // Einzelkämpfer'" neben −33, und niemand konnte sagen, warum [§C34].
      o[pid] = {vor:w.vor, nach:w.nach, delta:w.delta,
                stufeVor:w.stufeVor, stufeNach:w.stufeNach,
                rek:w.rekordDelta, mon:w.monatDelta};
    });
    return o;
  };
  const _rekordWirkung = (pids, rid) => {
    const o = {};
    (pids || []).slice(0, 4).forEach(pid => {
      const w = _tafelWirkung(pid);
      const q = w.quellen['rekord:' + rid] || null;
      o[pid] = {vor:w.vor, nach:w.nach, delta:w.delta,
                rek:w.rekordDelta, mon:w.monatDelta,
                anteilVor:w.rekordVor, anteilNach:w.rekordNach,
                zahl:w.rekordZahl,
                // Die Stufe gehoert dazu: im Blatt eines Tafel-Moments steht
                // EIN zusammengefasster Bereich „Wirkung auf das Insignium",
                // und der braucht die beiden Staende samt Stufe [§C34].
                stufeVor:w.stufeVor, stufeNach:w.stufeNach,
                basis:q ? q.grundwert : 0, halter:q ? q.halter : 0,
                rang:q ? q.rang : 0, staffel:q ? q.staffel : 1,
                wert:q ? q.wert : 0};
    });
    return o;
  };
  // ── Wann ein Wechsel geschah ─────────────────────────────────────
  // Jede Zeile der Tafel trug die Uhrzeit der letzten Partie des Tages:
  // „Leon holt ‚Die Steigerung'" stand im Blatt unter 17:17, obwohl es seit
  // der Partie um 13:54 so war und so blieb. Gesucht wird die Partie, nach
  // der der Stand des Abends erreicht war und nicht mehr wechselte — von
  // hinten, Partie für Partie. Jeder Stand wird einmal geschnitten und von
  // allen Zeilen geteilt.
  const _tafelPartien = _tafelTag ? matches.filter(m => mts(m) > _tafelTag.vorMs
    && mts(m) <= _tafelTag.letzte).sort((a, b) => mts(a) - mts(b)) : [];
  const _tafelSchritte = new Map();
  const _tafelSchritt = i => {
    let s = _tafelSchritte.get(i);
    if(!s){
      const st = i >= _tafelPartien.length - 1 ? _tafelNach : _storyStand(mts(_tafelPartien[i]));
      const memo = {};
      s = {rekorde:() => memo.r || (memo.r = st.rekorde()),
           chronik:sid => memo.c !== undefined ? memo.c : (memo.c = st.chronik(sid))};
      _tafelSchritte.set(i, s);
    }
    return s;
  };
  // `gilt(schritt)` sagt, ob ein Stand den des Abends schon trägt. Zurück
  // kommt die Partie des Wechsels, wenn einer der Genannten darin spielte,
  // sonst ihre erste danach — nach ihr galt es schon, und die Zeile steht
  // bei einer eigenen Partie [§C33]. Erst wenn danach keine mehr kam, ihre
  // letzte davor.
  const _tafelWechsel = (gilt, wer) => {
    if(!_tafelPartien.length) return null;
    let k = _tafelPartien.length - 1;
    while(k > 0 && gilt(_tafelSchritt(k - 1))) k--;
    const dabei = m => (wer || []).some(p => p === m.a1 || p === m.a2 || p === m.b1 || p === m.b2);
    for(let i = k; i < _tafelPartien.length; i++) if(dabei(_tafelPartien[i])) return _tafelPartien[i];
    for(let i = k - 1; i >= 0; i--) if(dabei(_tafelPartien[i])) return _tafelPartien[i];
    return null;
  };
  const _gleicheHalter = (x, y) => (x || []).slice().sort().join(',') === (y || []).slice().sort().join(',');
  try {
    if(_tafelTag){
      const _letzteMs = _tafelTag.letzte;
      // ── Wer nicht gespielt hat, hat nichts getan ────────────────────
      // Ein Halterwechsel entsteht auch, weil ANDERE gespielt haben. „Der
      // makellose Tag" misst einen Anteil: wer den Bestwert haelt, verliert
      // ihn mit dem naechsten schwachen Tag, und der Naechstbeste uebernimmt,
      // ohne selbst angetreten zu sein. Gemessen trugen 23 von 280
      // Tafel-Karten einen Namen, der an diesem Tag keine Partie hatte —
      // „Martin uebernimmt ‚Der komplette Verteidiger'" stand ueber einem
      // Spieltag ohne Martin. Dieselbe Regel wie beim Ausbauen [§C33]: die
      // anderen sind nur nicht vorbeigezogen, und daraus wird keine
      // Schlagzeile ueber jemanden, der zugesehen hat.
      // ── Die Partie muss zu den Namen passen ─────────────────────────
      // Die Karte trug die letzte Partie der DATENBANK, egal von wem sie
      // erzaehlt. Gemessen zeigten 34 von 169 Karten ein Ergebnisband mit
      // vier Wappen, unter denen kein genannter Spieler stand: ueber
      // „Leo und Stefan bewegen die Ewige Tafel" stand „Jane/Johannes
      // 10:8 Maxi/Henry". Gemerkt wird deshalb je Spieler seine LETZTE
      // eigene Partie dieses Tages; sie ist die, nach der der Wechsel
      // galt, und sie ist immer eine, in der er mitgespielt hat. Eine
      // Suche nach der ausloesenden Partie kostete gemessen ~200 ms auf
      // einen Generator von 340 ms — die Antwort waere dieselbe.
      const _amTag = new Map();
      matches.forEach(m => {
        if(mts(m) < _tafelTag.vonMs) return;
        [m.a1, m.a2, m.b1, m.b2].forEach(p => { if(p) _amTag.set(p, m); });
      });
      // Von mehreren Haltern die spaeteste: sie entscheidet den Moment.
      const _partieVon = pids => {
        let best = null;
        (pids || []).forEach(p => {
          const m = _amTag.get(p);
          if(m && (!best || mts(m) > mts(best))) best = m;
        });
        return best ? best.id : null;
      };
      const _jetzt = _tafelNach.rekorde();
      const _vorher = _tafelVor.rekorde();
      const _kammer = k => (CHRON_KINDS[k] && CHRON_KINDS[k].label) || 'Liga-Rekord';
      CHRONICLES.forEach(def => {
        const n = _jetzt[def.id];
        if(!n) return;
        // Schattenseiten meldet der Feed nicht. „Neuer Bestwert im Verlieren"
        // ist keine Nachricht, sondern eine Ohrfeige — und die Liga liest
        // den Feed gemeinsam [§C33].
        if(def.kind === 'shame') return;
        const a = _vorher[def.id];
        const art = _rekordArt(a, n);
        if(!art) return;
        // Ein gleitendes Fenster wird nicht „ausgebaut" [§C33]: sein Wert
        // steigt auch, weil hinten ein altes Ergebnis herausfaellt. Nur der
        // Halterwechsel ist bei ihm eine Nachricht.
        if(art === 'gesteigert' && def.fenster) return;
        // Derselbe Fall wie bei der Chronik, dieselbe Funktion [§C27]. Vorher
        // hiess jeder Halterwechsel „uebernimmt", auch wenn das Feld nur
        // enger oder weiter geworden ist.
        const altPids = ((a && a.pids) || []);
        const fall = art === 'geholt' ? _halterFall(altPids, n.pids) : art;
        // Genannt werden beim Dazukommen die NEUEN [§C33]: „Martin und Julian
        // ziehen bei ‚Der Unaufhaltsame' gleich. Geteilt mit Julian" nannte
        // Julian zweimal, einmal als Neuling und einmal als den, mit dem
        // geteilt wird. Und wer schon Halter war, hat an diesem Tag nichts
        // getan — er darf deshalb auch nicht den Spieltags-Nachweis tragen.
        const wer = (fall === 'dazu' || fall === 'uebernommen')
          ? n.pids.filter(id => altPids.indexOf(id) < 0) : n.pids;
        // Bei einer teilweisen Ablösung bleibt ein alter Mithalter im Feld,
        // er "übernimmt" den Rekord aber nicht von sich selbst.
        if(!wer.length) return;
        if(!wer.some(p => _amTag.has(p))) return;
        const _wechsel = _tafelWechsel(st => { const x = st.rekorde()[def.id];
          return !!x && _gleicheHalter(x.pids, n.pids) && (art !== 'gesteigert' || x.val === n.val); }, wer);
        const _mid = _wechsel ? _wechsel.id : _partieVon(wer);
        const neuN = wer.map(nameOf);
        const namen = _namenListe(neuN);
        // Drei Halter „uebernimmt" nicht, sie uebernehmen.
        const verb = neuN.length > 1 ? 'übernehmen' : 'übernimmt';
        const baut = neuN.length > 1 ? 'bauen' : 'baut';
        // Im Vergleich steht nur die ZAHL, nicht der ganze Beleg. Zwei volle
        // Belege nebeneinander („20 % seiner 25 Siege endeten 10:9 · 5 —
        // Jane stand bei 18 % seiner 55 Siege endeten 10:9 · 10") sind kein
        // Satz mehr. Der Beleg steht dahinter, die Bedingung erklärt ihn.
        const wertNeu = _chronKurz(n.ev), wertAlt = a ? _chronKurz(a.ev) : '';
        const altNamen = _namenListe(altPids.map(nameOf));
        let title, desc;
        // Der Beleg steht hier im Fliesstext, nicht in einer Listenzelle:
        // der Mittelpunkt darin trennte sonst mitten im Satz zwei Spalten,
        // die es gar nicht gibt.
        const belegSatz = _evSatz(n.ev, true);
        // Die Zeile einer Sammelkarte traegt die Bedingung nicht: gemessen
        // ueber die Ligageschichte waren die „Erstmals vergeben"-Zeilen 168
        // bis 175 Zeichen lang, weil `cond` jede Schwelle nennt [§C35]. In
        // einem Buendel von neun Zeilen ist das ein Absatz. Die Bedingung
        // steht auf der einzelnen Karte und im Blatt.
        let zeileText = '';
        if(art === 'erstmals'){
          title = `Erstmals vergeben: ${def.name}`;
          // Kein Pronomen ueber einen Spieler: die Liga kennt kein Geschlecht,
          // und der Satz steht unter jedem Wappen [§C33].
          zeileText = `${belegSatz}. Diesen Rekord hat vorher niemand gehalten.`;
          desc = `${zeileText} Verlangt ist: ${def.cond}.`;
        } else if(fall === 'dazu'){
          // Wer dazukommt, nimmt niemandem etwas weg: der alte Halter haelt
          // den Rekord weiter, sein Wert ist nur eingeholt worden. Die
          // Vorgaenger-Zahl gehoert deshalb nicht in den Satz — sie stand als
          // „Vorher hielt Leo den Rekord mit 70 %" unter einem neuen Bestwert
          // von 67 % und behauptete damit einen Rueckschritt als Uebernahme.
          title = `${namen} ${neuN.length > 1 ? 'ziehen' : 'zieht'} bei „${def.name}“ gleich`;
          desc = `${belegSatz}. Geteilt mit ${_namenListe(
            altPids.filter(id => n.pids.indexOf(id) >= 0).map(nameOf))}.`;
        } else if(fall === 'allein'){
          // Nicht „uebernimmt": die Uebrigen sind nur abgefallen. Genannt
          // werden die, die weg sind — der neue Halter stand vorher selbst
          // mit drin, und „Vorher hielt Leon … den Rekord" nannte ihn damit
          // als seinen eigenen Vorgaenger.
          title = `${namen} ${neuN.length > 1 ? 'halten' : 'hält'} „${def.name}“ jetzt allein`;
          desc = `${belegSatz}. Vorher ${_namenListe(
            altPids.filter(id => n.pids.indexOf(id) < 0).map(nameOf))} auch.`;
        } else if(fall === 'uebernommen'){
          // Genannt wird, wer WEG ist. Aus {A,B} kann {A,C} werden — dann
          // stand „A und C uebernehmen. Vorher hielten A und B" da, und A war
          // sein eigener Vorgaenger. Bleibt niemand uebrig, ist es der ganze
          // alte Stand.
          const weg = altPids.filter(id => n.pids.indexOf(id) < 0);
          const altN = _namenListe(weg.map(nameOf)) || altNamen || 'der bisherige Halter';
          const hielten = weg.length > 1 ? 'hielten' : 'hielt';
          title = `${namen} ${verb} „${def.name}“`;
          // Die Vorgaenger-Zahl nur, wenn sie sichtbar anders ist: „8.9 Tore
          // … Julian stand bei 8.9" nennt zweimal dieselbe Zahl und erklaert
          // damit gar nichts.
          // ── Ein Fenster nennt den alten Wert nicht ──────────────
          // Bei einem gleitenden Fenster gilt der Wert des Vorgaengers nicht
          // mehr: sein Fenster ist weitergerutscht, waehrend der neue Halter
          // sein eigenes gefuellt hat. Gemessen stand „Maxi, Julian, Jane und
          // Johannes uebernehmen ‚Der Hoehenflug'. +10 %-Punkte … Vorher
          // hielt Leon den Rekord mit +20 %" — eine Uebernahme mit dem
          // schlechteren Wert, und der Satz erklaert nicht, wieso. Dieselbe
          // Begruendung wie beim ausgebliebenen „ausgebaut" [§C35]: was am
          // hinteren Ende herausfaellt, ist keine Leistung und kein Vergleich.
          desc = `${belegSatz}. ` + (wertAlt && wertAlt !== wertNeu && !def.fenster
            ? `Vorher ${hielten} ${altN} den Rekord mit ${wertAlt}.`
            : `Vorher gehörte der Rekord ${altN}.`);
        } else {
          title = `${namen} ${baut} „${def.name}“ aus`;
          // „Vorher 71 %." ist kein Satz. Und die Richtung gehoert dazu: die
          // Meldung gibt es nur, wenn der Wert besser geworden ist [§C33].
          desc = `${belegSatz}. Vorher waren es ${wertAlt}.`;
        }
        // ── Wer verliert, steht im Satz ───────────────────────────────
        // Jane zog bei „Der Lauf" mit Leon gleich, und die Karte erzaehlte
        // nur von Jane: dass Leon den Rekord jetzt teilt und dabei Prestige
        // verliert, stand nirgends. Genannt wird der Spieltag als Ganzes —
        // beide Staende gehoeren ihm [§11.0e] —, und faellt das Zeichen unter
        // eine Schwelle, steht auch das da. Die Zeile im Buendel bleibt ohne
        // diesen Satz: dort steht der Verlust einmal in der eigenen Zeile der
        // Karte und nicht in jeder Meldung (`_newsPrestigeBand`).
        const _verlierer = (fall === 'dazu'
            ? altPids.filter(id => n.pids.indexOf(id) >= 0)
            : fall === 'uebernommen' ? altPids.filter(id => n.pids.indexOf(id) < 0) : [])
          .map(pid => ({pid, w:_tafelWirkung(pid)})).filter(x => x.w.delta < 0).slice(0, 2);
        if(_verlierer.length){
          if(!zeileText) zeileText = desc;
          desc += _verlierer.map(x => {
            const sv = insigniumStufeVon(x.w.vor), sn = insigniumStufeVon(x.w.nach);
            return ` Für ${nameOf(x.pid)} heißt der Spieltag ${-x.w.delta} Prestige weniger`
              + (sn < sv ? `, und das Zeichen fällt auf den ${INSIGNIEN[sn].name}.` : '.');
          }).join('');
        }
        stories.push({
          // ── Die ID ist das Ereignis, nicht der Stand des Augenblicks ──
          // Sie trug den angezeigten Wert und die sortierten Halter. Beides
          // bewegt sich im Lauf eines Spieltags: gemessen stand nach der
          // vierten Partie des 26.08. „Maxi uebernimmt ‚Der Hoehenflug'" im
          // Feed, nach der fuenften „Maxi und Johannes uebernehmen" und nach
          // der siebten „Maxi, Julian, Jane und Johannes uebernehmen" — drei
          // IDs, drei Karten, und die gelesene war jedes Mal weg. Der Rekord
          // wechselt an diesem Spieltag aber EINMAL: gerechnet wird gegen den
          // Stand vor dem Spieltag, und ob danach einer oder vier halten, ist
          // derselbe Vorgang. Die ID ist deshalb Rekord und Spieltag, der
          // Wortlaut kommt aus dem Generator und der Zeitpunkt aus der
          // Datenbank [§C33] — die Karte waechst mit, statt ersetzt zu werden.
          // ── Der Spieltag gehoert in die ID ──────────────────────
          // Ohne ihn beschreibt dieselbe ID zwei verschiedene Ereignisse.
          // Ein Halterfeld wird enger und wieder weiter: geht der Rekord
          // weg und kommt mit demselben Wert an dieselben Leute zurueck,
          // bildet der Generator genau diese ID erneut. Die Datenbank hat
          // sie schon, also bleibt der alte Zeitstempel — aber
          // `_newsTexteAuffrischen` uebernimmt den neuen `dataRef`, und
          // damit zeigt eine Karte vom 24. auf die Partie vom 26.
          // Gemessen wanderte so der ganze Tafel-Moment des 24.08. in die
          // Sammelkarte des 26.08., und der 24. hatte keine Tafel-Karte
          // mehr. Eine Wiederkehr ist ein neues Ereignis und bekommt eine
          // eigene Karte [§C33].
          id: `rek_${def.id}_${tagKey(_letzteMs)}`,
          cat: 'tafel',
          ic: def.ic,
          title, desc,
          when: _wechsel ? mts(_wechsel) : _letzteMs,
          prio: art === 'erstmals' ? STORY_PRIO.rekord_erstmals
              : art === 'geholt'   ? STORY_PRIO.rekord_geholt
                                   : STORY_PRIO.rekord_gesteigert,
          dataRef: {type:'rekord_' + art, rekordId:def.id, matchId:_mid, kammer:def.kind,
                    // ── Der Grund steht in der Karte, nicht in der Uhrzeit ──
                    // Gebuendelt wurde nach Partie ODER Minute, und das ist
                    // ein Stellvertreter: ein Rekord, der um 11:40 wechselt,
                    // und eine Insignium-Stufe um 14:12 gehoeren zum selben
                    // Spieltag und standen als zwei Tafel-Karten
                    // untereinander. Der Schluessel sagt jetzt, WARUM zwei
                    // Fakten zusammengehoeren [§11.0e]: die dauerhafte Tafel
                    // dieses Spieltags. Auch ein Rekord auf einem gleitenden
                    // Fenster steht darin — er ist ein Liga-Rekord und
                    // gehoert in die Ewige Tafel; was ihn unterscheidet, ist
                    // allein, dass er kein „ausgebaut" meldet [§C35]. Eine
                    // Ein Rekord auf einem gleitenden Fenster bekommt dabei
                    // seine eigene Achse: sein Wert bewegt sich auch, wenn
                    // hinten ein schwaches Ergebnis herausfaellt, und er
                    // meldet deshalb kein „ausgebaut" [§C35]. In einer Karte
                    // mit den dauerhaften Rekorden war dieser Unterschied
                    // nicht zu sehen; die Karte der kurzen Strecke traegt
                    // dafuer eine eigene Schlagzeile [§C33].
                    causalKey:_storyGruppeKey(def.fenster ? 'form' : 'table', _tafelTag.tag),
                    zufall:def.zufall || '', playerIds:wer.slice(0, 3), zeileText,
                    vorher:(a && a.pids) || [], wert:n.val, ev:n.ev, cond:def.cond,
                    // Was der Feed vorher nicht weitergab: der Name des
                    // Rekords stand nur in der Schlagzeile, die Wechselart
                    // nur im Typ-Praefix, der VOLLE neue Halterstand nur
                    // gekuerzt in `playerIds` (drei Gesichter), der alte
                    // Wert und der Grundwert gar nicht. Wer eine Karte
                    // nachtraeglich lesen will — ein Blatt, eine
                    // Sammelzeile, eine Auffrischung —, hat die Definition
                    // nicht mehr zur Hand: ein gestrichener Rekord steht
                    // gar nicht mehr im Katalog.
                    rekordName:def.name, fall, basis:def.basis,
                    halter:n.pids.slice(), wertVorher:(a ? a.val : null),
                    evVorher:(a ? a.ev : ''), fenster:!!def.fenster,
                    // Die Punktewirkung gehoert zur Karte, nicht in eine
                    // zweite Rechnung im Blatt: sie gilt fuer DIESEN
                    // Tagesabschluss, und morgen sagt dieselbe Rechnung eine
                    // andere Zahl [§C34].
                    // Wer den Rekord abgeben oder teilen musste, steht in der
                    // Wirkung mit: Jane zog bei „Der Lauf" mit Leon gleich,
                    // und Leons Minus stand nirgends [§C25].
                    laufbahn:_rekordWirkung(_mitVorgaengern(wer, a && a.pids), def.id), art:def.art,
                    kammerLabel:_kammer(def.kind)}
        });
      });
    }
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] rekorde', e); }

  // ── Eine Monatschronik wechselt den Halter ───────────────────────────
  // Der ganze laufende Monat kam im Feed nicht vor. Gemessen trug der August
  // dreizehn Chronik-Eintraege, und im Feed stand dazu keine einzige Karte:
  // die Monatskarte entsteht erst am 1. fuer den VORmonat. Wer „Auf dem
  // Thron" holte, erfuhr es nur, wenn er selbst in den Chronik-Tab sah.
  //
  // Quelle ist derselbe Zeitschnitt wie bei den Rekorden: der Halterstand vor
  // dem letzten Spieltag gegen den von heute. Gemeldet wird nur der WECHSEL,
  // nicht der Stand — ein Halter, der seinen Wert verbessert, hat nichts
  // getan, genau wie „ausgebaut" beim Liga-Rekord die schwaechste der drei
  // Meldungen ist.
  try {
    const _sid = currentSeason().id;
    if(_tafelTag){
      const _letzteMs2 = _tafelTag.letzte;
      // Dieselbe Regel wie bei den Rekorden: eine Chronik wechselt auch den
      // Halter, weil ein anderer gespielt und seinen Anteil verschlechtert
      // hat. „Martin holt ‚Der Tagesabschluss'" stand ueber einem Spieltag,
      // an dem Martin nicht angetreten war [§C33].
      // Dieselbe Zuordnung wie bei den Rekorden: die Karte zeigt die letzte
      // eigene Partie eines genannten Spielers, nicht die letzte der
      // Datenbank [§C33].
      const _amTag2 = new Map();
      matches.forEach(m => {
        if(mts(m) < _tafelTag.vonMs) return;
        [m.a1, m.a2, m.b1, m.b2].forEach(p => { if(p) _amTag2.set(p, m); });
      });
      const _partieVon2 = pids => {
        let best = null;
        (pids || []).forEach(p => {
          const m = _amTag2.get(p);
          if(m && (!best || mts(m) > mts(best))) best = m;
        });
        return best ? best.id : null;
      };
      // ── Gemeldet wird vom ersten Spieltag an ─────────────────────────
      // Eine Grenze für den ganzen Monat gibt es nicht mehr: gewertet wird je
      // Spieler ab fünfzehn Partien [§C39]. Vorher ging die Tafel am fünften
      // Spieltag auf, und eine eigene Karte meldete das, damit nicht jeder
      // Eintrag als „holt" im Feed stand. Wer jetzt mit seiner fünfzehnten
      // Partie mehrere Chroniken auf einmal hält, steht in derselben
      // Tafel-Karte des Spieltags wie jeder andere Wechsel [§11.0e]; die
      // gespeicherten Karten „Die Monatstafel ist offen" bleiben, wie sie
      // sind [§C33]. `null` heißt nur noch, dass es den Monat gar nicht gibt.
      const _jetztH = _tafelNach.chronik(_sid) || {};
      const _vorherH = _tafelVor.chronik(_sid) || {};
      // Eine Chronik-Karte darf nicht den Katalogwert als neuen Prestige-
      // Gewinn ausgeben. Pro Monat zaehlt nur der eine Eintrag, der in der
      // Tafel steht; ein besserer Eintrag kann den gerade geholten also
      // vollstaendig verdraengen. Der echte Zuwachs ist die Differenz der
      // beiden Staende vor und nach dem Spieltag — dieselbe Frage, die
      // `_prestigeWirkung` fuer jede Tafel-Meldung beantwortet [§11.0e].
      // Nie negativ: das Monats-Prestige eines Spielers kann zwischen zwei
      // Staenden auch sinken, weil ein Mithalter dazugekommen ist, und ein
      // Minus unter einer Karte, die einen Erfolg meldet, ist keine Antwort.
      const _monatPlus = pid => Math.max(0, _tafelWirkung(pid).monatDelta);
      const _monatTitel = pid => _tafelNach.profil(pid, _sid);
      const _meldungen = [];
      SEASON_TITLES.forEach(t => {
        const n = _jetztH[t.id];
        if(!n) return;
        // Schattenseiten meldet der Feed nicht — die Liga liest ihn
        // gemeinsam [§C33]. Dieselbe Regel wie bei den Rekorden.
        if(t.kunst === 'schatten') return;
        const a = _vorherH[t.id];
        const neuKey = n.pids.join(',');
        // Sortiert verglichen: dieselben Halter in anderer Reihenfolge sind
        // kein Wechsel [§C33].
        if(a && a.pids.join(',') === neuKey) return;
        // Mit dem Wert der Halter: der Bonus über der Schwelle gehört zum
        // Wert des Eintrags [§C39], und nach ihm ordnet die Karte unten.
        const punkte = chronikPunkte(t.id, n.wert);
        const artikel = t.klasse === 'legendaer' ? 'Eine legendäre' :
                        t.klasse === 'selten' ? 'Eine seltene' : 'Eine besondere';
        // Vier Faelle, vier Verben. „Julian holt ‚Der Nachzuegler'. Vorher
        // hielten sie Julian, Martin und Maxi" stand da, als es nur eines
        // gab: er war schon Mithalter, und aus drei Haltern wurde einer.
        const alt = (a && a.pids) || [];
        const drin = id => alt.indexOf(id) >= 0;
        const neuLeute = n.pids.filter(id => !drin(id));
        const art = _halterFall(alt, n.pids);
        // Die Schlagzeile nennt die, um die es geht [§C33]: beim Dazukommen
        // sind das die Neuen, sonst alle Halter.
        const wer = art === 'dazu' ? neuLeute : n.pids;
        if(!wer.some(p => _amTag2.has(p))) return;
        const wechsel = _tafelWechsel(st => { const h = st.chronik(_sid);
          return !!(h && h[t.id]) && _gleicheHalter(h[t.id].pids, n.pids); }, wer);
        // Wem dieser Wechsel Prestige gibt oder nimmt: im Monat zählt je
        // Spieler EIN Eintrag, der wertvollste [§C32]. Holt jemand zehn
        // Chroniken und behält seine stärkere, bewegen die zehn nichts — und
        // standen trotzdem alle als „holt" in der Wirkung auf die Laufbahn.
        const zaehlt = [...new Set(alt.concat(n.pids))].filter(pid => {
          const v = _tafelVor.profil(pid, _sid), w = _tafelNach.profil(pid, _sid);
          const vt = v ? v.titleId : '', wt = w ? w.titleId : '';
          return vt !== wt && (vt === t.id || wt === t.id);
        });
        const namen = _namenKurz(wer.map(nameOf));
        const mz = wer.length > 1;
        const titel = art === 'erstmals'  ? `${namen} ${mz ? 'holen' : 'holt'} „${t.name}“`
                    : art === 'allein'    ? `${namen} ${mz ? 'halten' : 'hält'} „${t.name}“ jetzt allein`
                    : art === 'dazu'      ? `${namen} ${mz ? 'ziehen' : 'zieht'} bei „${t.name}“ gleich`
                    : `${namen} ${mz ? 'übernehmen' : 'übernimmt'} „${t.name}“`;
        // Genannt wird, wer WEG ist — dieselbe Regel wie beim Rekord: aus
        // {A,B} kann {A,C} werden, und dann stand A als sein eigener
        // Vorgaenger im Satz.
        const altWeg = alt.filter(id => n.pids.indexOf(id) < 0);
        const nachsatz = art === 'uebernommen'
            ? ` Vorher ${altWeg.length > 1 ? 'hielten' : 'hielt'} sie `
              + `${_namenKurz((altWeg.length ? altWeg : alt).map(nameOf))}.`
          : art === 'dazu'
            ? ` Geteilt mit ${_namenKurz(alt.map(nameOf))}.`
          : art === 'allein'
            // Nicht „Vorher zu 3. geteilt": eine Ordnungszahl mitten im Satz
            // liest sich als Satzende, und danach ging es klein weiter. Die
            // Karte nennt ohnehin lieber Namen als Zahlen [§C33].
            ? ` Vorher ${_namenKurz(alt.filter(id => n.pids.indexOf(id) < 0).map(nameOf))} auch.`
            : '';
        // Wer im selben Monat mehrere Chroniken hält, erfährt hier, welche
        // davon ihn in der Tafel vertritt — und welche sie dafür überbietet.
        const _zeigt = _chronikZeigtSich(n.pids, _sid, t.id, _letzteMs2);
        // Sagt der Prestige-Satz unten schon, welcher Eintrag den Platz
        // haelt, faellt dieser weg: „In der Chronik steht weiter ‚Der
        // Umschwung'. Fuer die Laufbahn bleibt ‚Der Umschwung' staerker" ist
        // dieselbe Aussage in zwei Saetzen [§C33].
        const _zeigtSatz = !_zeigt ? ''
          : _zeigt.zeigt
            ? ` Steht jetzt in der Chronik${_zeigt.andere.length === 1
                ? `, vor „${_zeigt.andere[0]}“` : ''}.`
            : '';
        // Nur neue Halter koennen hier Prestige hinzugewinnen. Wer bereits
        // Mithalter war und nun allein steht, hat eine staerkere Geschichte,
        // aber keinen zweiten Laufbahn-Eintrag erhalten.
        const prestigeDelta = {}, titelJeSpieler = {};
        n.pids.forEach(pid => {
          const sichtbar = _monatTitel(pid);
          titelJeSpieler[pid] = sichtbar ? sichtbar.name : '';
          prestigeDelta[pid] = neuLeute.indexOf(pid) >= 0 && sichtbar
            && sichtbar.titleId === t.id ? _monatPlus(pid) : 0;
        });
        const mitPlus = Object.keys(prestigeDelta).filter(pid => prestigeDelta[pid] > 0);
        const ohnePlus = neuLeute.filter(pid => !(prestigeDelta[pid] > 0));
        let prestigeSatz = '';
        if(mitPlus.length){
          const teile = mitPlus.map(pid => `${nameOf(pid)} +${prestigeDelta[pid]}`);
          prestigeSatz = ` Für die Laufbahn zählt der Wechsel wirklich: ${_namenListe(teile)} Prestige.`;
        } else if(ohnePlus.length){
          const istSelbst = ohnePlus.some(pid => titelJeSpieler[pid] === t.name);
          const staerker = [...new Set(ohnePlus.map(pid => titelJeSpieler[pid]).filter(Boolean))];
          // Zählt im Monat eine Schattenseite, ist diese Chronik überschattet
          // [§C39]: eine positive mit Prestige stünde sonst vor ihr. „bleibt
          // stärker" passte dazu nicht — eine Schattenseite ist nicht stärker,
          // sie wiegt schwerer.
          const schattenTitel = ohnePlus.length === 1 && (x => x && chronikStufe(x.titleId) === 'schatten' ? x : null)(_monatTitel(ohnePlus[0]));
          prestigeSatz = schattenTitel
            ? ` „${schattenTitel.name}“ überschattet sie in diesem Monat, also kommt für die Laufbahn kein Prestige hinzu.`
            : istSelbst
            // Ohne den Namen: `_zeigtSatz` sagt eine Zeile darueber schon
            // „Steht jetzt in der Chronik", und mit dem Namen stand da
            // „Steht jetzt in der Chronik. ‚Der Endspurt' steht in der
            // Monatschronik, am gerundeten Prestige-Stand aendert sich
            // diesmal nichts" — dieselbe Aussage zweimal, der Name aus der
            // eigenen Schlagzeile dazu ein drittes Mal [§C33 `_ndNeu`].
            ? ' Am gerundeten Prestige-Stand ändert sich damit nichts.'
            // Der staerkere Eintrag gehoert EINEM Spieler, also wird er nur
            // genannt, wenn es auch um einen geht. Bei zwei neuen Haltern
            // sammelte der Satz beide Eintraege ein und behauptete sie fuer
            // beide: „In der Chronik bleibt ‚Der Endspurt' und ‚Die zweite
            // Luft' staerker" — dieselbe Regel, die `_chronikZeigtSich` fuer
            // die Frage „welche steht in der Tafel" schon zieht [§C32].
            : (staerker.length === 1 && ohnePlus.length === 1)
            // Kein Semikolon mitten im Satz: die Karte spricht in Saetzen.
            ? ` In der Chronik bleibt „${staerker[0]}“ stärker,`
              + ` also kommt für die Laufbahn kein Prestige hinzu.`
            : ' Für die Laufbahn kommt durch diesen Wechsel kein Prestige hinzu.';
        } else {
          prestigeSatz = ' Die Halterlage ändert sich, der Prestige-Stand nicht.';
        }
        // ── Die Zeile einer Sammelkarte ist kuerzer als die Karte ─────
        // Im Blatt eines Tafel-Moments steht jede Zeile mit dem ganzen Text
        // der Karte. Gemessen trug eine Zeile bis zu 183 Zeichen und vier
        // Saetze, und neun davon standen untereinander: Beleg, Klasse,
        // Vorbesitz, „steht jetzt in der Chronik" — was die Zeile als Marke
        // ohnehin traegt [§C32] — und dazu die Prestige-Mechanik. Fuenf der
        // neun erklaerten dabei, warum sich NICHTS aendert, und das ist die
        // Bauanleitung des Feeds, nicht die Nachricht [§C33].
        // Die Zeile nennt deshalb den Wert, die Klasse und den Zuwachs, wo es
        // einen gibt. Der ganze Text bleibt an der einzelnen Karte.
        // ── Die Zahl sagt, woher sie kommt, und der Name steht einmal ──
        // Sie hiess „Johannes +67 Prestige fuer die Laufbahn." Zwei Fehler:
        // der Name steht in der Schlagzeile derselben Zeile schon („Johannes
        // holt ‚Der Beidfuessige'"), und „fuer die Laufbahn" ist dieselbe
        // Aufschrift wie die Zahlenreihe der Karte und der Bereich darunter —
        // dort steht aber der Zuwachs des ganzen SPIELTAGS. Gemessen las man
        // „+9 Prestige" in der Zeile und „+2 PRESTIGE" in der Reihe und
        // hielt eines von beidem fuer einen Fehler. Die Zeile nennt deshalb
        // ausdruecklich den Beitrag DIESES Eintrags; steht sie allein, faellt
        // der Name weg [§C33].
        const zeileText = (n.ev ? _evSatz(n.ev, true) + '. ' : '') + `${artikel} Chronik`
          + (mitPlus.length
             ? (mitPlus.length === 1
                 ? `, +${prestigeDelta[mitPlus[0]]} Prestige aus diesem Eintrag.`
                 : `. ${_namenListe(mitPlus.map(pid => `${nameOf(pid)} +${prestigeDelta[pid]}`))}`
                   + ' Prestige aus diesem Eintrag.')
             : '.');
        _meldungen.push({t, n, a, punkte, art, zeigt: _zeigt, wer, wechsel, zaehlt,
          prestigeDelta, titelJeSpieler, zeileText,
          title: titel,
          // Ohne die Punkte: die Karte zeigt sie als grossen Wert, und zweimal
          // dieselbe Zahl untereinander sagt nichts Neues [§C33].
          desc: (n.ev ? _evSatz(n.ev, true) + '. ' : '')
              + `${artikel} Chronik.` + nachsatz + _zeigtSatz + prestigeSatz,
          klasse: t.klasse});
      });
      // Wertvollste zuerst: Die Reihenfolge bestimmt den Kopf des späteren
      // Bundles, nicht mehr, ob eine fachliche Änderung überhaupt vorkommt.
      _meldungen.sort((x, y) => y.punkte - x.punkte);
      _meldungen.forEach(m => {
        stories.push({
          // Die ID traegt Chronik, Monat und Spieltag — nicht die Halter.
          // Ein Halterfeld wird im Lauf eines Tages enger und weiter: am
          // 08.09. stand „Leo holt ‚Ohne Schwachstelle'", neun Minuten
          // spaeter „Leo und Maxi holen" und drei Stunden danach „Maxi holt".
          // Mit den Haltern in der ID waren das drei Karten, von denen zwei
          // wieder verschwanden; es ist ein Vorgang an einem Spieltag, also
          // eine Karte, die mitwaechst [§C33]. Der Spieltag bleibt darin:
          // dieselbe Chronik kann in derselben Woche weggehen und
          // zurueckkommen, und das sind zwei Ereignisse.
          id: `chrget_${m.t.id}_${_sid}_${tagKey(_letzteMs2)}`,
          cat: 'tafel',
          ic: m.t.ic,
          title: m.title,
          desc: m.desc,
          when: m.wechsel ? mts(m.wechsel) : _letzteMs2,
          // Ueber der Insignium-Stufe, unter dem uebernommenen Liga-Rekord:
          // sie ueberlebt damit den Tagesdeckel, ohne die Ewige Tafel zu
          // ueberstimmen [§C33].
          prio: STORY_PRIO.chronik_geholt,
          dataRef: {type:'chronik_geholt', titleId:m.t.id, sid:_sid,
                    matchId:m.wechsel ? m.wechsel.id : _partieVon2(m.wer), zaehlt:m.zaehlt,
                    // Dieselbe dauerhafte Tafel, derselbe Spieltag, dieselbe
                    // Karte [§11.0e].
                    causalKey:_storyGruppeKey('table', _tafelTag.tag),
                    // Die Beteiligten sind die, um die es geht — nicht jeder
                    // Mithalter. „Martin zieht bei ‚Der Nachzuegler' gleich"
                    // trug Martin UND Julian, und in der Tafel-Sammelkarte
                    // stand daraufhin „Julian und Martin bewegen die Ewige
                    // Tafel" ueber zwei Zeilen, die beide von Martin
                    // erzaehlen. Wer schon Halter war, hat an diesem Tag
                    // nichts getan [§C33].
                    playerIds:m.wer.slice(), vorher:(m.a && m.a.pids) || [],
                    // Alle neuen Halter und der Name: daran liest das Blatt,
                    // wer die Chronik geteilt oder verloren hat.
                    alle:m.n.pids.slice(), chronName:m.t.name,
                    // Wer sie abgeben oder teilen musste, steht in der
                    // Wirkung mit — sein Minus gehoert zu diesem Tag.
                    laufbahn:_tafelLaufbahn(_mitVorgaengern(m.wer, m.a && m.a.pids)),
                    ev:m.n.ev, cond:m.t.cond, chronKlasse:m.klasse, chronWie:m.art,
                    zeileText:m.zeileText,
                    chronArt:m.t.kunst, aus:m.t.aus,
                    // `punkte` ist der tatsaechliche neue Beitrag, nicht der
                    // ungedaempfte Wert des Eintrags. Der bleibt fuer das
                    // Detail nachvollziehbar: Grundwert, Bonus und der Wert
                    // der Halter, aus dem der Bonus rechnet [§C39] — am Tag
                    // der Karte, nicht am Tag, an dem sie geoeffnet wird.
                    punkte:Object.values(m.prestigeDelta).reduce((s, x) => s + x, 0),
                    grundwert:CHRONIK_GRUNDWERT, bonus:m.punkte - CHRONIK_GRUNDWERT,
                    wert:m.n.wert, prestigeDelta:m.prestigeDelta,
                    titelJeSpieler:m.titelJeSpieler,
                    // Steht diese Chronik in der Monatstafel? null heisst:
                    // die Frage stellt sich nicht [§C32].
                    zeigt: m.zeigt ? m.zeigt.zeigt : null}
        });
      });
    }
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] chronget', e); }

  // ── Die Insignium-Karte des Tages [§C30, §C33] ───────────────────────
  // Eine Stufe stand als Zeile in der Ewigen Tafel, ein Grad gar nicht und
  // ein Rückfall auch nicht: wer den Volutenkranz wieder verlor, erfuhr es
  // nur aus dem Profil. Die Leiter bekommt deshalb EINE eigene Karte je
  // Spieltag, die wie die Tafel mitläuft: Stand vor dem Spieltag gegen den
  // von jetzt, bei jedem Lauf neu, abends eingefroren [§C33]. Eine Bewegung,
  // die sich im Lauf des Tages wieder aufhebt, steht damit gar nicht erst da.
  //
  // Was gemeldet wird, steht bei `_insZuegeZwischen` (26b-story-fakten.js).
  try {
    if(_tafelTag){
      const tagMs = matches.filter(m => mts(m) > _tafelTag.vorMs && mts(m) <= _tafelTag.letzte)
        .slice().sort((a, b) => mts(a) - mts(b));
      // Der erste Augenblick des Tages, an dem die neue Lage stand. Geprüft
      // an den Partien des Tages, halbiert wie bisher. Steht sie an keiner,
      // kam sie mit dem Schluss des Tages um 23:59 (der Spieler des Tages,
      // was den ganzen Tag beschreibt): die Karte stand sonst bei der letzten
      // Partie, Stunden bevor es so war.
      const schluss = new Date(_tafelTag.vonMs); schluss.setHours(23, 59, 0, 0);
      const wann = (pid, art, pb) => {
        const erreicht = art === 'ab' ? (x => x <= pb) : (x => x >= pb);
        let lo = 0, hi = tagMs.length - 1, t = schluss.getTime();
        while(lo <= hi){
          const mid = (lo + hi) >> 1, ts = mts(tagMs[mid]);
          let P = null; try { P = prestigeOf(pid, ts); } catch(e){}
          if(P && erreicht(insigniumPos(P))){ t = ts; hi = mid - 1; } else lo = mid + 1;
        }
        // Die Partie nur, wenn er darin mitgespielt hat: eine Stufe kann
        // fallen, weil ANDERE gespielt haben [§C34].
        const m = tagMs.find(x => mts(x) === t && [x.a1, x.a2, x.b1, x.b2].includes(pid));
        return {ms:t, matchId:m ? m.id : null};
      };
      const L = _insZuegeZwischen(_tafelVor, _tafelNach, _insBestVor(_tafelTag.vonMs, _cache._stories), wann);
      if(L.zuege.length){
        const t = _insTagTexte(L.zuege);
        const oben = L.zuege.some(z => z.art === 'auf' && !z.wieder && z.nach.stufe >= INSIGNIUM_OBEN);
        stories.push({
          id:'instag_' + _tafelTag.tag, cat:'tafel', ic:'award',
          title:t.title, desc:t.desc,
          // Die Karte steht beim jüngsten Wechsel, wie die Tafel [§C33].
          when:new Date(Math.max(...L.zuege.map(z => z.ms))),
          prio:STORY_PRIO.insignium_tag + (oben ? 34 : 0),
          // Ohne `matchId` oben: die Karte handelt von der Leiter, nicht von
          // einer Partie, und bekäme sonst deren Ergebnisband und Bündel.
          dataRef:{type:'insignium_tag', tag:_tafelTag.tag, zuege:L.zuege, playerIds:L.zuege.map(z => z.pid),
            laufbahn:L.laufbahn, leiter:L.leiter, best:L.best}
        });
      }
    }
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] insignium', e); }

  // ── Das Zeichen beim Schluss der Woche [§C30, §C33] ────────────────
  // Der Spieler der Woche und der Award-Sammler kommen am Montag um 00:00,
  // ohne Partie. Wer durch sie eine Stufe oder einen Grad weiter stand, stand
  // in keiner Karte: die des Sonntags endet davor, die des Montags beginnt
  // danach (`_storyTagGrenzen`). Gemessen stieg Julian so zweimal um einen
  // Grad, am 15.06. mit dem Spieler der Woche und am 03.08. mit ihm und dem
  // Award-Sammler, und das Zeichen im Profil hatte sich still verändert.
  // Dieselbe Karte wie die eines Spieltags,
  // mit `schluss` gekennzeichnet: sie wächst nicht mit, sie ist ein Schnitt.
  // Fällt der Schluss der Woche auf den des Monats, trägt die Karte des
  // Monatsabschlusses beide Zeichen, und diese entsteht nicht.
  try {
    const id = 'instag_woche_' + tagKey(_wocheEnde);
    const bestand = Array.isArray(_cache._stories) ? _cache._stories : [];
    const monat = stories.concat(bestand).some(x => { const d = (x && x.dataRef) || {};
      return d.type === 'season_recap' && d.sid && Array.isArray(d.zeichen)
        && seasonEnd(d.sid).getTime() + 1 === _wocheEnde; });
    // Eine veröffentlichte Karte bleibt, wie sie ist [§C33]; zwei Stände
    // dafür neu zu schneiden kostete jeden Lauf der Woche zwei Rechnungen.
    if(now.getTime() >= _wocheEnde && !monat && !bestand.some(x => x && x.id === id)){
      const L = _insZuegeZwischen(_storyStand(_wocheEnde - 1), _storyStand(_wocheEnde),
        _insBestVor(_wocheEnde, bestand), () => ({ms:_wocheEnde}));
      if(L.zuege.length){
        const t = _insTagTexte(L.zuege, 'woche');
        const oben = L.zuege.some(z => z.art === 'auf' && !z.wieder && z.nach.stufe >= INSIGNIUM_OBEN);
        stories.push({
          id, cat:'tafel', ic:'award', title:t.title, desc:t.desc,
          when:new Date(_wocheEnde),
          prio:STORY_PRIO.insignium_tag + (oben ? 34 : 0),
          dataRef:{type:'insignium_tag', schluss:'woche', tag:tagKey(_wocheEnde), woche:_lastWeekKey,
            zuege:L.zuege, playerIds:L.zuege.map(z => z.pid),
            // Was die Woche zum Schluss vergab, als Grund der Bewegungen —
            // nur bei denen, die sich bewegt haben: die Karte handelt vom
            // Zeichen, nicht von der Woche.
            grund:_abschlussAuszeichnungen(_wocheEnde, ['award_collector', 'potw'])
              .map(a => Object.assign({}, a, {spieler:a.spieler.filter(x => L.zuege.some(z => z.pid === x.pid))}))
              .filter(a => a.spieler.length),
            laufbahn:L.laufbahn, leiter:L.leiter, best:L.best}
        });
      }
    }
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] insignium woche', e); }

  // ── Ambiente Tages-Stories (v8.5) ──
  // Zeitlich verteilte Fun Facts / Nuggets, damit der Feed auch ohne neue
  // Matches lebt. Tages-deterministisch → kein Cross-Device-Spam.
  try {
    const amb = _buildAmbientStories(now, pm, nameOf, stories);
    for(const a of amb) stories.push(a);
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] ambient build failed', e); }

  _ohneDoppeltenGipfel(stories);

  // ── Keine Meldung einer Partie ohne ihre Partie ──
  // Was an einer Partie hängt, steht auf ihrer Karte [§C33]. Ein paar Typen
  // tragen aber kein eigenes Fenster: der Rivalitäts-Meilenstein meldete das
  // 100. Duell einer Partie, deren Karte schon aus dem Fenster gefallen war,
  // und stand allein im Feed — eine Meldung zu einem Spiel, das nirgends
  // mehr zu sehen ist. Hier und nicht je Typ, damit es kein neuer Typ
  // vergessen kann. Die Ewige Tafel bündelt nach Tag, nicht nach Partie, und
  // braucht die Partie-Karte nicht.
  {
    const mitKarte = new Set();
    stories.forEach(s => { const d = s.dataRef || {}; if(d.type === 'spiel' && d.matchId) mitKarte.add(d.matchId); });
    const tafelArt = /^(rekord_|chronik_|insignium_)/;
    for(let i = stories.length; i--;){
      const d = stories[i].dataRef || {};
      if(d.matchId && d.type !== 'spiel' && !tafelArt.test(d.type || '') && !mitKarte.has(d.matchId))
        stories.splice(i, 1);
    }
  }

  // Das visuelle Layout wird beim Publizieren eingefroren. Ergebnisgrafik
  // und Anlassgrafik sind zwei unabhängige Ebenen; eine spätere Partie kann
  // weder die Auswahl noch deren vorberechnete Daten verändern.
  try {
    const jeMatch = new Map();
    stories.forEach(s => { const d = s.dataRef || {}; if(!d.matchId) return;
      const l = jeMatch.get(d.matchId) || []; l.push(s); jeMatch.set(d.matchId, l); });
    // In zeitlicher Folge: der Fuß einer Partie richtet sich nach den Füßen
    // davor (`_spFussSpur`), und die müssen dann schon gewählt sein.
    [...jeMatch.entries()].sort((p, q) => mts(matchVonId.get(p[0]) || {}) - mts(matchVonId.get(q[0]) || {}))
      .forEach(([mid, l]) => {
      const basis = l.find(s => (s.dataRef || {}).type === 'spiel');
      const m = matchVonId.get(mid);
      if(!basis || !m || (basis.dataRef || {}).visual || typeof _spVisualSnapshot !== 'function') return;
      const visual = _spVisualSnapshot(m, l.map(s => s.dataRef || {}));
      basis.dataRef = Object.assign({}, basis.dataRef, {visual,
        scoreVisualKey:visual.score.key,
        occasionVisualKey:visual.occasion ? visual.occasion.key : ''});
    });
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] visual snapshot failed', e); }

  // ── Jede Fassung der Tafel ist eine eigene Zeile ──
  // Die Ewige Tafel und die Insignium-Karte wachsen mit jeder Partie des
  // Tages. Gespeichert wurden sie unter derselben ID per Upsert, aber die
  // Datenbank erlaubt nur Einfügen: jede spätere Fassung scheiterte, und am
  // 19.10. stand dort die Tafel von 13:54, während die Partie um 17:17 sie
  // längst verändert hatte. Bis der Generator lief, zeigte der Feed die alte
  // Karte, danach die neue — und nach Mitternacht für immer die alte. Jede
  // Fassung trägt deshalb den Stand, aus dem sie gerechnet ist, in ID und
  // `fassung`; gezeigt wird je Tag nur die jüngste (`_tafelFassungen`).
  if(_tafelTag){
    const fassung = _tafelFassung(_tafelTag.tag, _tafelTag.letzte);
    stories.forEach(s => {
      const d = s.dataRef || {};
      // Die Karte eines Schlusses ist ein Schnitt, keine Fassung.
      if(!STORY_TAFEL_UPDATE.has(d.type) || d.schluss || tagKey(s.when) !== _tafelTag.tag) return;
      s.id += '~' + fassung;
      s.dataRef = Object.assign({}, d, {fassung});
    });
  }

  // Lange Zahlen mit Tausenderpunkt, hier für jede Story und nicht je Typ:
  // die Sätze setzen ihre Zahlen roh ein, und mit den Jahren standen dort
  // fünfstellige ohne Punkt (`tausender`).
  stories.forEach(s => {
    if(typeof s.title === 'string') s.title = tausender(s.title);
    if(typeof s.desc === 'string') s.desc = tausender(s.desc);
  });

  // ── Final-Sort ──
  // v8.2: PURE Chronologie (User-Wunsch). Neueste Story zuerst, älteste
  // zuletzt — in ALLEN Views (Mini-Popup, Feed, Filter) konsistent.
  // Wichtige Stories landen ohnehin oben, weil ihre `when`-Werte meist
  // "jetzt" sind (saison_endspurt, anniversary, elo_swing*). Bei gleichem
  // Timestamp dient Prio als deterministischer Tiebreaker.
  stories.sort((a,b) => {
    const dt = b.when - a.when;
    if(dt !== 0) return dt;
    return b.prio - a.prio;
  });

  // Der vollständige Snapshot-Satz ist das Generator-Ergebnis. Verdichtung
  // erfolgt danach verlustfrei; hier verwirft kein Mengenlimit ein Ereignis.
  // Das Tor [§C40]: keine Story nach dem Karriereende nennt den, der aufgehört
  // hat. Hier und nicht je Typ, damit es kein neuer Typ vergessen kann.
  const ergebnis = ohneStoriesNachAbschied(stories);
  _cache._buildStoriesKey = _buildStoriesKey;
  _cache._buildStoriesResult = ergebnis;
  return ergebnis;

}

// Gewinner einer Periode (POTW/POTD) — MUSS dieselbe Regel benutzen wie das
// jeweilige Recap-Sheet und der Badge-Zähler, sonst nennt die News einen
// anderen Spieler als Pop-up und Auszeichnung.
//
// v9.17 BUGFIX: Es gab nur EINE Regel (Siegquote zuerst) — die gilt aber nur
// für den Spieler der WOCHE. Der Spieler des TAGES wird sowohl im Pop-up
// (showPotdRecap) als auch im Badge-Zähler (_winnerCountsOf, kind='day') über
// die ABSOLUTEN Tagessiege bestimmt, Tiebreak Elo-Delta — die Siegquote spielt
// keine Rolle. Ergebnis: „Spieler des Tages" in den News konnte jemand anderes
// sein als im Pop-up und im Profil (z.B. 3 Siege bei 100% statt 7 bei 88%).
// Darum jetzt zwei Modi:
//   mode 'wins' (POTD) → Siege ↓, Elo-Delta ↓        (= showPotdRecap / kind 'day')
//   mode 'wr'   (POTW) → Quote ↓, Siege ↓, Elo ↓     (= showPotwRecap / kind 'week')
// Geteilter Sieg nur bei Gleichstand über ALLE Kriterien des Modus.
// Liefert {winners:[…], main} oder null. (v8.7, v9.17)
// Die Reihenfolge kommt aus `_periodeRangliste`, derselben Regel wie
// Auszeichnung und Rückblick; hier kommt nur dazu, wer sich den Titel teilt.
function _newsPeriodWinner(rangeMatches, regel){
  if(!Array.isArray(rangeMatches) || !rangeMatches.length) return null;
  const byWins = regel === 'tag';
  const cand = _periodeRangliste(rangeMatches, regel, true);
  if(!cand.length) return null;
  const top = cand[0];
  const tied = byWins
    ? cand.filter(c => c.wins === top.wins && Math.abs(c.eloDelta - top.eloDelta) < 0.001)
    : cand.filter(c => Math.abs(c.wr - top.wr) < 0.001);
  return { winners: tied, main: top };
}

