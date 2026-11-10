// ╔═══ §11.0e ─── DIE FAKTEN EINER STORY ───────────────────────────────╗
//     Karte, Sammelband, Detailblatt und Punktewirkung entstanden bisher an
//     drei verschiedenen Stellen aus drei verschiedenen Rechnungen. Deshalb
//     stand auf einer Karte „Julian holt einen Liga-Rekord: +100 Prestige",
//     im Blatt daneben eine andere Zahl und in der Laufbahn eine dritte: 100
//     ist der GRUNDWERT, und was ankommt, entscheidet erst die Halterzahl und
//     die Wurzeldämpfung über alle heute gehaltenen Rekorde [§C34].
//
//     Diese Datei ist die eine Wahrheit dazwischen. Sie rechnet selbst
//     nichts nach: sie fragt `allChronicles`, `seasonTitleHalter`,
//     `seasonTitleOf` und `prestigeTabelle` — und zwar mit EINEM Zeitschnitt
//     je Stand. Zwei sichtbare Sätze aus zwei verschiedenen Zeitschnitten
//     sind der Fehler, den die ganze Datei verhindert.
//
//     Sechs Dinge stehen hier:
//       _storyStand(bisMs)      ein Stand der Liga zu EINEM Zeitpunkt
//       _storyTagGrenzen(ms)    der Spieltag als Paar aus Vorher und Nachher
//       _prestigeWirkung(…)     was eine Änderung wirklich gebracht hat
//       _abschlussAuszeichnungen(…)  was ein Schluss vergibt, als Grund eines Zeichens
//       _insZuegeZwischen(…)    die Bewegungen auf der Leiter dazwischen
//       _storyRangFrei(sid)     ist die Rangliste dieser Saison belastbar
// ╚═════════════════════════════════════════════════════════════════════════╝

// ─── Ein Stand der Liga ──────────────────────────────────────────────
// Kein eigener Zwischenspeicher: die vier zentralen Funktionen merken ihr
// Ergebnis selbst, und ein zweiter Topf daneben wäre eine zweite Wahrheit.
// Der Stand ist nur die Klammer, die den Zeitschnitt festhält — wer ihn
// weiterreicht, kann ihn nicht mehr verwechseln.
//
// `bisMs === 0` heißt „jetzt". Das ist wichtig für die Kosten: ohne Schnitt
// treffen alle vier Funktionen ihren heißen Cache, mit Schnitt rechnen sie
// (gemessen ~60 ms für `prestigeTabelle`). Ein Generatorlauf braucht genau
// zwei Stände, und `_schnitt` wirft einen Schnitt hinter der letzten Partie
// ohnehin weg [§3].
function _storyStand(bisMs){
  const ms = bisMs || 0;
  const schnitt = ms || undefined;
  return {
    bisMs: ms,
    // Die Liga-Rekorde als {id: {pids, val, ev}}.
    rekorde(){
      try { return (allChronicles(schnitt) || {}).byId || {}; } catch(e){ return {}; }
    },
    // Die vollständige Monatstafel: ein Spieler kann mehrere Disziplinen
    // anführen. `null` heißt „dieser Monat ist noch nicht gewertet" und ist
    // etwas anderes als „gewertet, aber niemand hält sie" [§C32].
    chronik(sid){
      try { return seasonTitleHalter(sid, schnitt); } catch(e){ return null; }
    },
    // Der EINE Monatseintrag, der im Profil steht und fürs Prestige zählt.
    // Wer drei Disziplinen anführt, hat trotzdem genau einen [§C32].
    profil(pid, sid){
      try { return seasonTitleOf(pid, sid, schnitt) || null; } catch(e){ return null; }
    },
    // Punkte, Stufe, Grad und jede einzelne Quelle mit Rang und Staffel.
    prestige(pid){
      try { return prestigeOf(pid, schnitt) || null; } catch(e){ return null; }
    }
  };
}

// ─── Der Spieltag als Paar ───────────────────────────────────────────
// Für eine Match-Geschichte ist der Vergleich die Partie. Für die Ewige
// Tafel, die Monatstafel und das Insignium ist er der TAG: ein Halterfeld
// wird im Lauf eines Nachmittags enger und wieder weiter, und wer am Abend
// nachsieht, will nicht drei Karten über denselben Rekord lesen. Verglichen
// wird deshalb der Stand vor der ersten Partie des Tages mit dem nach der
// letzten — ein Wechsel, der am selben Abend zurückgedreht wurde, ist keine
// Nachricht mehr. Welche Partie die endgültige Änderung ausgelöst hat, steht
// trotzdem im Detail.
//
// `nachMs` ist das Ende des Tages — nicht seine letzte Partie: zu deren
// Zeit war der Tag noch offen, und was ihn als Ganzes beschreibt (`_tagZu`),
// fiele zwischen ihn und den nächsten und stünde in keiner Karte. Auch für
// den jüngsten Tag: dort stand 0, also „jetzt", und nach dem Wechsel der
// Woche oder des Monats trug die Karte des letzten Spieltags den Spieler der
// Woche und die Titel des Monats mit, die ihre eigenen Karten haben. Solange
// danach nichts zugegangen ist, wirft `_schnitt` das Ende ohnehin weg, und
// alle zentralen Funktionen treffen ihren heißen Cache.
//
// Beide Grenzen lassen die Abschlüsse draußen, die nicht dem Tag gehören.
// Der Monat schließt in der letzten Millisekunde (`seasonEnd`), deshalb endet
// der Tag eine Sekunde davor; die Woche schließt am Montag um 00:00, deshalb
// beginnt der Tag dort und nicht eine Millisekunde davor. Gemessen trug die
// Karte des 30.06. sonst Martins neuen Grad, den erst Vize-Titel und Team
// der Saison brachten, und die des 15.06. Julians Grad aus dem Spieler der
// Woche davor, an seiner ersten Partie des Montags — beide gehören in die
// Karte ihres Abschlusses. Eine Partie um Punkt Mitternacht zählte damit zum
// Tag davor; die späteste der Liga hat um 18 Uhr begonnen.
function _storyTagGrenzen(ms){
  if(!ms) return null;
  const d = new Date(ms); d.setHours(0, 0, 0, 0);
  // Das Ende ist die nächste Mitternacht des Kalenders: an den Tagen der
  // Zeitumstellung hat ein Tag 23 oder 25 Stunden, und mit 24 endete der
  // 25. Oktober um 23 Uhr — sein Spieler des Tages um 23:59 fiel aus der
  // Karte —, und der 29. März reichte in den Montag und nahm den Abschluss
  // der Woche mit.
  const von = d.getTime(), bis = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
  let letzte = 0, erste = 0, n = 0;
  (matches || []).forEach(m => {
    const t = mts(m);
    if(t < von || t > bis) return;
    n++;
    if(!erste || t < erste) erste = t;
    if(t > letzte) letzte = t;
  });
  if(!n) return null;
  const juengste = matches.length ? mts(matches[matches.length - 1]) : 0;
  return {tag: tagKey(von), vonMs: von, erste, letzte, partien: n,
          vorMs: von,
          nachMs: bis - 1000,
          istHeute: letzte >= juengste};
}

// ─── Was eine Änderung wirklich gebracht hat ─────────────────────────
// Nie den rohen Grundwert als erhaltene Punkte zeigen. Ein zehnter Rekord
// gibt nicht 100 Prestige: er wird durch die Zahl seiner Halter geteilt,
// landet auf einem Rang im Rekordstapel und wird dort durch die Wurzel
// seiner Staffel geteilt — und weil er die anderen Rekorde mit verschiebt,
// ist der Nettozuwachs am Ende noch eine dritte Zahl. Gemessen stand auf
// einer Karte „+100", während die Laufbahn um 34 Punkte stieg.
//
// Gefragt werden deshalb zwei Stände, und der Unterschied IST die Antwort.
// `quellen` nennt für jede Rekord- und Monatsquelle des NEUEN Stands, was
// sie im Stapel wirklich wiegt; damit kann das Blatt die Rechnung zeigen,
// ohne sie ein zweites Mal aufzuschreiben.
function _prestigeWirkung(pid, vorStand, nachStand){
  const a = (vorStand && vorStand.prestige(pid)) || null;
  const b = (nachStand && nachStand.prestige(pid)) || null;
  const p = x => (x && isFinite(x.punkte)) ? x.punkte : 0;
  const t = (x, k) => (x && x.teile && isFinite(x.teile[k])) ? x.teile[k] : 0;
  const quellen = {};
  ((b && b.quellen) || []).forEach(q => {
    if(q.q !== 'rekord' && q.q !== 'monat') return;
    quellen[q.q + ':' + q.id] = {
      art: q.q, id: q.id, name: q.name || '',
      grundwert: Math.round(q.basis || q.grundwert || q.voll || 0),
      halter: q.halter || 1,
      rang: q.rang || 0,
      staffel: q.staffel || 1,
      wert: Math.round((q.p || 0) * 10) / 10
    };
  });
  const zahl = k => ((b && b.quellen) || []).filter(q => q.q === k).length;
  return {
    vor: Math.round(p(a)), nach: Math.round(p(b)),
    delta: Math.round(p(b) - p(a)),
    stufeVor: a ? a.stufe : 0, stufeNach: b ? b.stufe : 0,
    gradVor: a ? a.grad : 0,   gradNach: b ? b.grad : 0,
    rekordVor: Math.round(t(a, 'rekord')), rekordNach: Math.round(t(b, 'rekord')),
    rekordDelta: Math.round(t(b, 'rekord') - t(a, 'rekord')),
    monatVor: Math.round(t(a, 'monat')),   monatNach: Math.round(t(b, 'monat')),
    monatDelta: Math.round(t(b, 'monat') - t(a, 'monat')),
    rekordZahl: zahl('rekord'), monatZahl: zahl('monat'),
    quellen
  };
}

// ─── Der höchste Platz auf der Leiter vor einem Tag ──────────────────
// Die Leiter schwankt: Rekord-Prestige wird unter den Haltern geteilt und
// fällt mit einem verlorenen Rekord [§C34]. Gemessen pendelte ein Spieler
// drei Spieltage in Folge zwischen Zierkranz III und Lorbeerreif I, und an
// fast jedem Spieltag gingen zwei bis sechs Grade hin und her. Ob ein Grad
// eine Nachricht ist und ob eine Stufe „wieder" erreicht wird, sagt deshalb
// der höchste Platz davor (`insigniumPos`).
//
// Er kommt nur aus dem Bestand: aus dem `best` der letzten Insignium-Karte
// und aus alten Stufen-Zeilen (`insignium_stufe`). Die Stände jedes
// Spieltags davor nachzurechnen kostete rund anderthalb Sekunden und
// verdrängte die Rechnungen, die das Vorwärmen für die Awards bereitgelegt
// hatte. Ohne Beleg weiß die Karte nichts über früher und behauptet nichts:
// sie schreibt „erreicht", nie „zum ersten Mal".
//
// Nur wer in der Liga antritt [§C40 Regel 2]: ein Ruheständler in `best`
// hielte jede spätere Karte an seinem Namen fest, und das Tor nach dem
// Abschied nähme sie aus dem Feed.
function _insBestVor(vonMs, bestand){
  const tag = tagKey(vonMs);
  const aktiv = new Set((players || []).filter(p => ligaAktiv(p)).map(p => p.id));
  const best = {};
  const merk = (pid, pos) => { if(aktiv.has(pid) && isFinite(pos) && (best[pid] == null || pos > best[pid])) best[pid] = pos; };
  // Von einem Tag nur seine jüngste Fassung: der höchste Platz wächst über
  // den Tag, und eine ältere kennt den Abend noch nicht. Gelesen wird jede
  // Karte davor, nicht nur die letzte: die Karte des Wochenschlusses trägt
  // den Tag, an dem er kam, wie die Karte dieses Tages, und welche von
  // beiden „die letzte" war, entschied die Sortierung.
  const l = Array.isArray(bestand) ? _tafelFassungen(bestand) : [];
  l.forEach(x => {
    const d = (x && x.dataRef) || {};
    if(d.type === 'insignium_tag' && d.best && String(d.tag) < tag)
      Object.keys(d.best).forEach(pid => merk(pid, Number(d.best[pid])));
  });
  l.forEach(x => {
    const d = (x && x.dataRef) || {};
    if(d.type !== 'insignium_stufe' || !d.pid || tagKey(x.when) >= tag) return;
    merk(d.pid, (Number(d.punkte) ? insigniumStufeVon(Number(d.punkte)) : (d.stufe | 0)) * INSIGNIUM_GRADE);
  });
  return best;
}

// ─── Was der Schluss eines Zeitraums vergibt, als Grund ──────────────
// Steigt jemand mit dem Schluss der Woche auf einen neuen Grad, nennt die
// Zeichen-Karte den Grund: den Spieler der Woche, den Award-Sammler [§C30].
// Alles, was ein Schluss vergibt, steht in seiner Ehrung — der des Tages
// unter dem Spieler des Tages, der der Woche und des Monats [§11.6f]; hier
// nur Seltenes und Legendäres, je
// Auszeichnung mit ihren Spielern, so wie die Zeile unter der Karte es
// zeigt (`_newsAbschlussHtml`).
//
// Gezählt wird mit der Auszeichnung selbst (`count` mit Schnitt), eine
// Millisekunde vor dem Schluss gegen den Schluss: was dazwischen dazukam,
// hat er gebracht. Der Wert ist derselbe wie in der Ehrung, der Teilwert
// beim wievielten Mal [§C34]. Ein Zeitraum: wer darin stand, steht darin
// [§C40].
const ABSCHLUSS_KLASSEN = {legendary:0, rare:1};
function _abschlussAuszeichnungen(schlussMs, ids){
  const vor = schlussMs - 1;
  const msA = _partienBis(vor), msB = _partienBis(schlussMs);
  const out = [];
  BADGES.forEach(b => {
    const klasse = rarityOf(b.id);
    if(!ids.includes(b.id) || !(klasse in ABSCHLUSS_KLASSEN)) return;
    const spieler = [];
    (players || []).forEach(p => {
      if(!sichtbar(p)) return;
      let a = 0, n = 0;
      try { a = b.count(p.id, msA, vor) || 0; n = b.count(p.id, msB, schlussMs) || 0; } catch(e){ return; }
      let wert = 0;
      for(let i = a + 1; i <= n; i++) wert += auszeichnungsTeilwert(b.id, i);
      if(wert > 0) spieler.push({pid:p.id, mal:n, p:Math.round(wert * 10) / 10});
    });
    if(spieler.length) out.push({id:b.id, name:b.name, ic:b.ic, klasse, spieler});
  });
  return out.sort((x, y) => ABSCHLUSS_KLASSEN[x.klasse] - ABSCHLUSS_KLASSEN[y.klasse]
    || ids.indexOf(x.id) - ids.indexOf(y.id));
}

// ─── Die Bewegungen auf der Leiter zwischen zwei Ständen ─────────────
// Die Karte eines Spieltags und die des Wochenschlusses [§C30, §C33] fragen
// dieselbe Rechnung; eine zweite daneben hätte irgendwann einen Grad anders
// gezählt als die erste. Gemeldet wird, was sich am Zeichen ablesen lässt,
// ohne Spam: jede neue Stufe (neu oder, mit Beleg, wieder), jeder Rückfall
// auf eine tiefere Stufe und ein Grad nur, wenn der Spieler über seinem
// höchsten bekannten Platz steht (`best`, aus `_insBestVor`). Ein Grad, der
// innerhalb derselben Stufe zurückkommt oder wieder geht, ist das Hin und
// Her geteilter Rekorde; das Prestige dazu zeigt die Tafel.
//
// `wann(pid, art, platz)` sagt, wann und an welcher Partie die neue Lage
// stand. Laufbahn mit der Liga von heute: nur, wer antritt [§C40].
function _insZuegeZwischen(vor, nach, best, wann){
  const aktiv = (players || []).filter(p => ligaAktiv(p));
  const lage = P => ({stufe:P.stufe | 0, grad:P.grad | 0, punkte:Math.round(P.punkte || 0)});
  const zuege = [], bestNeu = {};
  aktiv.forEach(p => {
    const a = vor.prestige(p.id), b = nach.prestige(p.id);
    if(!a || !b) return;
    const pa = insigniumPos(a), pb = insigniumPos(b);
    const bp = best[p.id] != null ? best[p.id] : pa;
    bestNeu[p.id] = Math.max(bp, pa, pb);
    let art = '';
    if(b.stufe > a.stufe) art = 'auf';
    else if(b.stufe < a.stufe) art = 'ab';
    else if(pb > pa && pb > bp) art = 'grad';
    if(!art) return;
    const w = wann(p.id, art, pb) || {};
    // „wieder" nur mit Beleg: der höchste bekannte Platz lag schon in
    // dieser Stufe. Ohne Beleg heißt es „erreicht", nie „zum ersten Mal".
    zuege.push({pid:p.id, art, vor:lage(a), nach:lage(b), ms:w.ms, matchId:w.matchId || null,
      wieder:art === 'auf' && best[p.id] != null && best[p.id] >= b.stufe * INSIGNIUM_GRADE,
      // Wie viele jetzt so hoch oder höher stehen: das sagt, was die
      // Stufe in dieser Liga bedeutet.
      traeger:aktiv.filter(q => { const x = nach.prestige(q.id); return x && x.stufe >= b.stufe; }).length,
      von:aktiv.length});
  });
  zuege.sort(_insZugVor);
  return {zuege, best:bestNeu,
    // Die Wirkung je Beteiligtem, für das Blatt [§C34] — für alle, nicht
    // nur vier wie in der Tafel.
    laufbahn:zuege.reduce((o, z) => { const w = _prestigeWirkung(z.pid, vor, nach);
      o[z.pid] = {vor:w.vor, nach:w.nach, delta:w.delta, stufeVor:w.stufeVor, stufeNach:w.stufeNach,
        rek:w.rekordDelta, mon:w.monatDelta}; return o; }, {}),
    // Die Leiter der Liga danach: wie viele je Stufe stehen.
    leiter:INSIGNIEN.map((_, i) => aktiv.filter(q => { const x = nach.prestige(q.id);
      return x && x.stufe === i; }).length)};
}

// ─── Ist die Rangliste belastbar? ────────────────────────────────────
// Am ersten Tag einer Saison steht jeder bei null, und die erste Partie
// macht ihren Sieger zum Tabellenführer. Gemessen ergab das nach jedem
// Monatswechsel eine Kette von Breaking-Karten über eine Tabelle, die es
// noch gar nicht gibt: „Neuer Spitzenreiter" dreimal an einem Vormittag,
// dazu jeder neue Elo-Bestwert als eigene Meldung.
//
// Belastbar heißt deshalb: genug Partien UND genug Spieler, die wirklich
// dabei waren. Die gebrauchte Spielerzahl wächst mit der Liga, bleibt aber
// zwischen vier und sechs — in einer Liga aus zwölf Leuten sind sechs
// regelmäßige Spieler eine Tabelle, in einer aus fünf sind es vier.
const STORY_RANG_MIN_PARTIEN = 15;
const STORY_RANG_MIN_EINSAETZE = 4;
function _storyRangFrei(sid, bisMs){
  let ms = [];
  try { ms = matchesInSeason(sid) || []; } catch(e){ ms = []; }
  if(bisMs) ms = ms.filter(m => mts(m) <= bisMs);
  const je = {};
  ms.forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(x => {
    if(x) je[x] = (je[x] || 0) + 1; }));
  const aktiv = Object.keys(je).length;
  const gebraucht = Math.max(4, Math.min(6, Math.ceil(aktiv * 0.75)));
  const genug = Object.keys(je).filter(x => je[x] >= STORY_RANG_MIN_EINSAETZE).length;
  return {frei: ms.length >= STORY_RANG_MIN_PARTIEN && genug >= gebraucht,
          partien: ms.length, aktiv, genug, gebraucht};
}

// ─── Die Gruppe entsteht vor dem Breaking ────────────────────────────
// Breaking war einmal eine Eigenschaft der einzelnen Meldung, und damit riss
// es zusammen, was zusammengehört: „Neuer Spitzenreiter: Maxi" stand als
// eigene Karte neben „Maxi und Henry: Absoluter Sieger" aus demselben 10:0.
// Die Reihenfolge ist deshalb verbindlich — erst der Gruppenschlüssel, dann
// die Darstellungsstufe [§C33].
//
// Der Schlüssel sagt, WARUM zwei Fakten zusammengehören. Nur zeitliche Nähe
// reicht nicht: „Johannes und Anton verlieren zusammen alles" trug einmal
// „Maxi: Nerven aus Stahl" als zweite Zeile, weil beide in derselben Minute
// entstanden sind.
const STORY_GRUPPE = {
  match:  'match',    // dieselbe Partie, Ursache und Wirkung
  leader: 'leader',   // derselbe Rangverlauf an einem Tag
  table:  'table',    // dieselbe dauerhafte Tafel am Tagesabschluss
  form:   'form',     // dieselbe Formtafel am Tagesabschluss
  awards: 'awards',   // niedrige Auszeichnungen ohne eigene Matchgeschichte
  recap:  'recap'     // feste Rückblicke
};
function _storyGruppeKey(art, schluessel){
  if(!STORY_GRUPPE[art] || !schluessel) return '';
  return art + ':' + schluessel;
}

// Ein einzelner belegbarer Fakt. Die ID ist deterministisch: dieselbe Lage
// ergibt auf jedem Gerät dieselbe ID, sonst legen zwei Telefone zwei Zeilen
// für dasselbe Ereignis an. Gespeichert werden die IDs und die WERTE, nicht
// nur der fertige Satz — Karte und Blatt bauen daraus dieselbe Aussage.
function _storyEreignis(o){
  const akt = (o.actorIds || []).filter(Boolean).slice().sort();
  return {
    id: [o.type, o.matchId || tagKey(o.occurredAt || Date.now()),
         o.subjectKey || '', akt.join('-')].join('|'),
    type: o.type,
    occurredAt: o.occurredAt || null,
    matchId: o.matchId || null,
    actorIds: (o.actorIds || []).filter(Boolean),
    subjectKey: o.subjectKey || '',
    title: o.title || '',
    text: o.text || '',
    evidence: o.evidence || '',
    importance: o.importance || 0,
    detail: o.detail || null
  };
}
