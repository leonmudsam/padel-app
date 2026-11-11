// ─── §13.2 Kontext: EIN Pass über die Saison ─────────────────────────
// Alles, was die Titel brauchen, entsteht hier — kein Titel rechnet selbst.
// Der Durchlauf über einen Monat ist der teuerste Teil der Chronik: er geht
// jede Partie der Saison an und baut daraus vierzig Kennzahlen je Spieler.
// Gerufen wird er von seasonTitles, von _chronicleCtx, vom Prestige und
// jetzt auch vom Detail-Blatt einer Disziplin — bis hierher rechnete jeder
// dieser Aufrufe alles noch einmal. Gemerkt wird am selben Schlüssel wie
// überall: Zahl der Partien plus Cache-Stand.
// `bisMs` schneidet den Monat an einem Zeitpunkt ab. Der Feed braucht das,
// um den Halterstand VOR dem letzten Spieltag mit dem von heute zu
// vergleichen — genau wie die Rekordmeldungen es mit `allChronicles(bisMs)`
// tun [§C33]. Ohne den Schnitt gibt es keinen „Stand von gestern", und eine
// Chronik, die im laufenden Monat den Halter wechselt, waere keine Nachricht.
function _seasonTitleCtx(sid, bisMs){
  bisMs = _schnittSaison(sid, bisMs);
  const ck = sid + '_' + matches.length + '_' + _cache.version
           + (bisMs ? '_' + bisMs : '');
  if(!_cache._stCtx) _cache._stCtx = {};
  const hit = _cache._stCtx[ck];
  if(hit) return hit;
  const res = _seasonTitleCtxRechnen(sid, bisMs);
  // Nur die letzten Monate behalten — sonst wächst der Topf mit jeder
  // Saison, die jemand im Wähler durchklickt. Sechzehn, nicht acht: der
  // News-Generator allein fragt sieben verschiedene Schnitte ab, und ein
  // Deckel knapp über der Arbeitsmenge kippt mit dem nächsten Monat.
  _topfDeckel(_cache._stCtx, 16);
  _cache._stCtx[ck] = res;
  return res;
}
// Der Wochenschluessel der Liga, an EINER Stelle: `_periodWinnerMap`, die
// Monatschronik und die Laufbahn-Rekorde muessen dieselbe Woche meinen, sonst
// zaehlt „Die Wochenkrone" Titel in Wochen, die es fuer den Sieger-Ermittler
// gar nicht gibt. Er stand viermal ausgeschrieben. Das Jahr ist das Jahr
// des Donnerstags der Woche, wie bei der ISO-Woche selbst: mit dem
// Kalenderjahr zerfiel die Woche vom 28.12.2026 bis 03.01.2027 in
// „2026-W53" und „2027-W53", zwei halbe Wochen mit je einem Spieler der
// Woche. Gespeichert wird der Schluessel nirgends — der Stand eines
// Ruhestaendlers traegt Zaehlungen, keine Wochen —, und bis dahin hatte die
// Liga keinen Jahreswechsel gespielt. Nimmt einen Zeitstempel oder ein Date. Text und Zahl werden gemerkt wie
// bei `mts`: der Schlüssel fiel je Partie und Aufrufer neu an, mit drei
// Date-Objekten je Aufruf.
const _wochenKeyMemo = new Map();
function _wochenKey(iso){
  const merk = (typeof iso === 'string' || typeof iso === 'number') ? iso : null;
  if(merk !== null){ const hit = _wochenKeyMemo.get(merk); if(hit !== undefined) return hit; }
  const d = new Date(iso);
  const donnerstag = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - wochentagMo(d));
  const k = donnerstag.getFullYear() + '-W' + isoWeek(d);
  if(merk !== null){
    if(_wochenKeyMemo.size > 50000) _wochenKeyMemo.clear(); // Wachstums-Schutz
    _wochenKeyMemo.set(merk, k);
  }
  return k;
}

// Die laengste Pleitenserie gegen EINEN Gegner, die in diesem Monat gebrochen
// wurde. Sie reicht ueber Monatsgrenzen zurueck — genau das macht sie zur
// Geschichte —, also laeuft die Zaehlung ueber alle Partien der Liga bis zum
// Ende des Monats und nicht nur ueber dessen eigene.
function _bannLaufDerLiga(P, ms){
  if(!ms.length) return;
  const bis = Math.max(...ms.map(m => mts(m)));
  const von = Math.min(...ms.map(m => mts(m)));
  const lauf = {};
  (matches || []).slice().sort((a, b) => mts(a) - mts(b)).forEach(m => {
    const t = mts(m);
    if(t > bis) return;
    const imMonat = (t >= von);
    const seiten = [[[m.a1, m.a2], [m.b1, m.b2], m.winner === 'A'],
                    [[m.b1, m.b2], [m.a1, m.a2], m.winner === 'B']];
    seiten.forEach(([eigen, gegner, gewonnen]) => {
      eigen.forEach(id => {
        if(!id) return;
        gegner.forEach(g => {
          if(!g) return;
          const k = id + '|' + g;
          if(gewonnen){
            if(imMonat && P[id] && (lauf[k] || 0) > P[id].bannLauf) P[id].bannLauf = lauf[k] || 0;
            lauf[k] = 0;
          } else {
            lauf[k] = (lauf[k] || 0) + 1;
          }
        });
      });
    });
  });
}

// Der schlechteste Platz, den die Liga-Tabelle am Ende eines Spieltags zeigte.
// Gezaehlt wird JEDER Spieltag des Monats, auch einer ohne eigene Partie: die
// Tabelle fragt nicht, wer dabei war, und wer aussetzt, kann ueberholt werden.
// Damit haengt die Wertung nicht an der Zahl der eigenen Auftritte.
//
// Quelle ist die Elo-Bahn aus `getGlobalSim` [§C27]. Selbst aus den Deltas
// aufsummiert waere es eine zweite Rechnung ueber dieselbe Tabelle — und die
// nennt irgendwann einen anderen Ersten als der Liga-Tab, weil die Simulation
// die Elo an jeder Monatsgrenze zurueckdreht.
//
// Vor der ersten eigenen Partie des Monats steht niemand in der Monatstabelle;
// solche Tage zaehlen deshalb nicht mit. Sonst haette jeder, der spaeter im
// Monat einsteigt, von vornherein den schlechtesten Platz.
function _thronDerLiga(P, ms, offen){
  if(!ms.length) return;
  const hist = {};
  const sim = getGlobalSim();
  ((sim && sim.history) || []).forEach(h => { hist[h.matchId] = h; });
  const stand = {};
  let tag = null;
  const auswerten = () => {
    // Das Ende eines Spieltags, der noch läuft, ist kein Tagesende.
    if(!tag || offen.tag(tag)) return;
    const rang = Object.keys(stand).sort((a, b) => stand[b] - stand[a]);
    rang.forEach((id, i) => {
      const p = P[id];
      if(!p) return;
      if(p.thronRang == null || i + 1 > p.thronRang) p.thronRang = i + 1;
      // „Der Aufstieg" vergleicht den Platz am ersten eigenen Tagesende mit
      // dem am letzten des Monats. Vor der ersten Partie steht niemand in der
      // Monatstabelle, also ist der erste Eintrag genau der Startplatz.
      if(p.platzErst == null) p.platzErst = i + 1;
      p.platzLetzt = i + 1;
    });
  };
  ms.slice().sort((a, b) => mts(a) - mts(b)).forEach(m => {
    const d = String(m.created_at).slice(0, 10);
    if(d !== tag){ auswerten(); tag = d; }
    const h = hist[m.id];
    if(h && h.eloAfter) Object.keys(h.eloAfter).forEach(id => { stand[id] = h.eloAfter[id]; });
  });
  auswerten();
}

// Aus der Rohsicht die Gruppen, nach denen die Chroniken fragen: Spieltage,
// Kalenderwochen, Partner, Gegner. Einmal gebaut, von jeder Wertung gelesen.
// Der Montag ist der Wochenanfang, damit „Woche" heisst, was im Kalender
// steht — dieselbe Rechnung wie in `isoWeek`, nur als Datum statt als Zahl.
function _rohGruppen(pid, p, wochenSieger, offen){
  const grp = (feld) => {
    const o = {};
    p.partien.forEach(s => { const k = feld(s); if(k) (o[k] = o[k] || []).push(s); });
    return o;
  };
  p.pid        = pid;
  // Spieltage nur, wenn sie zu sind: was nach ihnen fragt, fragt nach dem
  // GANZEN Tag — der letzten Partie, der Tagesquote, dem schwächsten
  // Abend —, und die stehen vorher nicht fest. Wochen bleiben, wie sie sind:
  // eine Woche geht erst Tage nach ihrer letzten Partie zu, und ihr Ende
  // stünde dann in der Tafel eines Tages, an dem sie gar nicht endete.
  p.tagGrp     = grp(s => offen.tag(s.tag) ? null : s.tag);
  p.partnerGrp = grp(s => s.mate);
  p.wochGrp    = grp(s => s.wk);
  p.gegnerGrp  = (() => {
    const o = {};
    p.partien.forEach(s => s.geg.forEach(g => { if(g) (o[g] = o[g] || []).push(s); }));
    return o;
  })();
  p.tagN = Object.keys(p.tagGrp).length;
  p.exp  = p.partien.map(s => s.exp);
  p.q    = p.games ? p.wins / p.games : 0;
  p.expQ = p.games ? p.expSum / p.games : 0;
  // Player of the Week: gewertet werden die eigenen Wochen mit mindestens
  // fünf Partien, damit ein Kurzbesuch keine Woche ist. Bei drei zählte
  // eine Woche mit drei Partien so viel wie eine mit dreißig.
  Object.keys(p.wochGrp).forEach(k => {
    if(p.wochGrp[k].length < 5) return;
    p.potwG++;
    if(wochenSieger[k] === pid) p.potw++;
  });
}

function _seasonTitleCtxRechnen(sid, bisMs){
  const cur = currentSeason().id;
  const live = (sid === cur);
  const ms = matchesInSeason(sid).slice().sort((a,b)=>mts(a)-mts(b))
    .filter(m => !bisMs || mts(m) <= bisMs);
  const gSim = getGlobalSim();
  // Was einen ganzen Spieltag beschreibt, fragt nur Tage, die zu sind
  // (`_tagZu`): „Der Schlussstrich" wertete die jüngste Partie als die
  // letzte des Tages, und ein makelloser Nachmittag stand als makelloser Tag
  // in der Tafel, bis die Niederlage am Abend kam. Zu ist ein Tag für den
  // Stand, nach dem gefragt wird, nicht für die Uhr.
  const stand = bisMs || Date.now();
  const offen = {tag: t => !_tagZu(t, stand)};
  // Elo-Quelle: abgeschlossene Saison → archivierter End-Stand aus dem Sim,
  // laufende Saison → aktueller Stand. Beides derselbe Sim wie die Rangliste.
  const eloMap = live ? (gSim.elo || {}) : (gSim.seasonEndElos[sid] || {});
  // Ein Monat ist ein Zeitraum [§C40]: wer darin spielte, steht in seiner
  // Chronik, auch wenn er danach aufgehört hat.
  const P = {};
  const daySet = {};        // pid → Set(dayKey)
  const dayCount = {};      // pid → {dayKey: n}
  const dayWins = {};       // pid → {dayKey: Siege an diesem Tag}
  const allDays = new Set();
  const run = {};           // pid → laufende Siegesserie
  const runStart = {};      // pid → erster Tag der laufenden Serie
  const lrun = {};          // pid → laufende Niederlagenserie
  const lrunStart = {};     // pid → erster Tag der laufenden Pleitenserie
  const lastRes = {};        // pid → letztes Ergebnis (true = Sieg)
  const altRun = {}, altStart = {};   // laufende Wechselserie Sieg/Pleite
  const matesOf = {};        // pid → {mateId: Spiele}
  const gegnerOf = {};       // pid → {gegnerId: {g, w}} — für Bezwinger und Breite
  const bannLauf = {};       // pid|gegner → Niederlagen in Folge gegen diesen
  const nachDebakel = {};    // pid → letzte Partie war ein Debakel?
  const ensure = (id) => P[id] || (P[id] = {
    games:0, wins:0, losses:0, gf:0, ga:0, gd:0,
    drvG:0, drvW:0, revG:0, revW:0,
    // Sätze, Tiebreaks und Bagels des Monats [§1.3].
    sf:0, sa:0, tbW:0, tbL:0, bagelsF:0, bagelsA:0, zuNull:0, wenden:0,
    bestStreak:0, streakSpan:'', nail:0, bitter:0, perfect:0, debacle:0,
    upsets:0, days:0, maxDay:0, maxDayLabel:'', elo:0, growth:null,
    blowouts:0, night:0, morning:0, afterLoss:0, vsTop:0, vsTopGames:0,
    potd:0, posDays:0,           // Player-of-the-Day-Titel / Tage mit positiver Bilanz
    // ── v9.18: Grundlage für quotenbasierte Titel ──
    close:0, closeW:0,           // knappe Partien (§1.3) und die davon gewonnenen
    worstLoss:0, lossSpan:'',    // längste Niederlagenserie der Saison
    afterLossOpp:0,              // Gelegenheiten, direkt nach einer Pleite zu antworten
    alt:0, altSpan:'',           // laengste Serie aus abwechselnd Sieg und Pleite
    flukeExp:null, flukeLabel:'', // der unwahrscheinlichste Sieg des Monats
    firstG:0, firstW:0,          // erstes Match eines Spieltags
    lastG:0, lastW:0,            // letztes Match eines Spieltags
    // ── v9.19: Kennzahlen, die eine Person beschreiben, nicht ihr Pensum ──
    favG:0, favW:0,              // Partien als Außenseiter (unter 50 % Chance)
    favExp:0,
    // ── v9.22: der Erwartungswert als Maßstab für den ganzen Monat ──
    // expSum ist die Summe der Siegwahrscheinlichkeiten aus myExp — dieselbe
    // Zahl, die schon für `upsets` und `favExp` gerechnet wird, nur über alle
    // Partien. Daraus entsteht das Soll eines Monats, gegen das sich das Ist
    // messen lässt.
    expSum:0,
    favoritG:0, favoritW:0,      // Partien als Favorit (ab 60 % Chance)
    gleichG:0, gleichW:0,        // Partien, die die Rechnung offen sah (45–55 %)
    h1G:0, h1W:0, h2G:0, h2W:0,  // erste und zweite Haelfte der Spieltage des Monats
    langG:0, langW:0,            // Partien an Abenden mit 8+ eigenen Spielen
    fruehG:0, fruehW:0,          // die ersten drei Partien eines Abends
    spaetG:0, spaetW:0,          // ab der sechsten Partie eines Abends
    antwortG:0, antwortW:0,      // die Partie direkt nach einem Debakel
    bann:0,                      // Angstgegner nach 12 Pleiten in Folge besiegt
    // favExp ist die Summe der Siegwahrscheinlichkeiten in genau diesen
    // Partien. Ohne sie misst eine Außenseiter-Quote nur, WIE schwach
    // jemand ist: ein starker Spieler ist selten Außenseiter und dann mit
    // 45 % Chance, ein schwacher ständig und mit 25 %. Erst die Differenz
    // zwischen tatsächlicher Quote und erwarteter sagt etwas über den
    // Spieler statt über sein Umfeld — und die kann jeder gewinnen.
    blowL:0,                     // deutliche Niederlagen (§1.3)
    bigDays:0, perfDays:0,       // Spieltage mit 4+ Partien / davon ohne Pleite
    uplift:null, upliftMates:0,  // wie viel besser Partner an seiner Seite sind
    // Elo-Verlauf innerhalb der Saison (aus der Sim-History, kein Nachrechnen)
    eloHigh:null, runHigh:null, runLow:null, maxDD:0, ddLow:null,
    potw:0, potwG:0,             // Player-of-the-Week-Titel / gewertete Wochen
    bannLauf:0,                  // laengste im Monat gebrochene Pleitenserie
    thronRang:null,              // schlechtester Tabellenplatz an einem Tagesende
    platzErst:null, platzLetzt:null, // Tabellenplatz am ersten und letzten Tagesende
    brechG:0, brechW:0,          // Partien gegen eine laufende Serie von 3 Siegen
    // ── Die Rohsicht eines Spielers auf seinen Monat ──────────────────
    // Jede Partie einmal, aus SEINER Perspektive, in der Reihenfolge, in
    // der sie gespielt wurde. Die Chroniken fragen nach dem schwaechsten
    // Spieltag, der schwaechsten Woche, dem unangenehmsten Gegner — solche
    // Fragen lassen sich nicht in vierzig Zaehler aufloesen, ohne fuer jede
    // neue Frage einen neuen Zaehler zu erfinden. Ein Monat traegt keine
    // zweitausend Zeilen, das kostet also nichts.
    partien:[]
  });
  const dLabel = (key) => {
    const [y,m,d] = key.split('-');
    return d + '.' + m + '.';
  };
  // Letztes Match je Spieltag — ms ist chronologisch, also gewinnt der letzte
  // Durchlauf. Wird für „Der Schlussstrich" gebraucht.
  const lastOfDay = {};
  // Wie viele Partien jemand an einem Tag insgesamt macht, steht erst am Ende
  // fest — „Der Marathon" braucht es aber schon beim ersten Spiel des Abends.
  // Deshalb hier gleich mitgezählt, im ohnehin vorhandenen Durchlauf.
  const tagGesamt = {};
  ms.forEach(m => {
    const d = mdayKey(m);
    lastOfDay[d] = m.id;
    [m.a1, m.a2, m.b1, m.b2].forEach(id => {
      if(!id) return;
      const k = id + '|' + d;
      tagGesamt[k] = (tagGesamt[k] || 0) + 1;
    });
  });
  const daySeen = {};
  // Die Mitte des Monats ist der mittlere SPIELTAG, nicht der 15. eines
  // Kalendermonats: gespielt wird an zwei bis drei Tagen die Woche, und ein
  // Monat, dessen Partien in der zweiten Hälfte liegen, haette sonst eine
  // leere erste Haelfte.
  const spielTage = [...new Set(ms.map(m => mdayKey(m)))].sort();
  const mitteTag = spielTage.length >= 4 ? spielTage[Math.floor(spielTage.length / 2)] : null;
  // Elo-Stand nach jedem Match — dieselbe Quelle wie Rangliste und Profil.
  let histById = null;
  try { histById = getHistoryByMatchId(); } catch(e){ histById = null; }

  ms.forEach(m => {
    const day = mdayKey(m);
    allDays.add(day);
    const isFirstOfDay = !daySeen[day];
    daySeen[day] = true;
    const isLastOfDay = (lastOfDay[day] === m.id) && !offen.tag(day);
    const hEntry = histById ? histById.get(m.id) : null;
    const eloAfter = (hEntry && hEntry.eloAfter) || null;
    // Uhrzeit einmal pro Match, nicht pro Spieler.
    const hour = new Date(m.created_at).getHours();
    const mateOf = id => id===m.a1 ? m.a2 : id===m.a2 ? m.a1 : id===m.b1 ? m.b2 : m.b1;
    // Die Serie jedes Beteiligten VOR dem Beginn der Partie. `run` wird innerhalb der
    // Spieler-Schleife nachgezogen und steht damit fuer die A-Seite schon auf
    // dem neuen Stand, wenn die B-Seite dran ist — hier ist er noch alt.
    // „Der Serienbrecher" fragt nach genau diesem Stand.
    const serieVor = {};
    [m.a1, m.a2, m.b1, m.b2].forEach(id => { if(id) serieVor[id] = run[id] || 0; });
    [m.a1, m.a2, m.b1, m.b2].forEach(id => {
      if(!id) return;
      const p = ensure(id);
      const onA = (id===m.a1 || id===m.a2);
      const w = (onA && m.winner==='A') || (!onA && m.winner==='B');
      const gf = onA ? m.games_a : m.games_b;
      const ga = onA ? m.games_b : m.games_a;
      const pos = id===m.a1 ? m.a1_side : id===m.a2 ? m.a2_side : id===m.b1 ? m.b1_side : m.b2_side;
      // Was die Partie im Padel war [§1.3]: an jedem Eintrag der Rohsicht,
      // damit der Katalog nicht selbst Sätze zählt. Die Namen der Felder
      // darunter stammen aus der Kicker-Liga und meinen jetzt: nail/bitter =
      // im Tiebreak gewonnen/verloren, perfect/debacle = zu Null gewonnen/verloren,
      // blowouts/blowL = deutlich, close = knapp.
      const pz = partie(m), fz = partieFuer(m, onA ? 'A' : 'B');
      const knapp = pz.knapp, deutlich = pz.deutlich, zitter = pz.entscheidTb;
      // Zu Null und Wende gehören der Begegnung über mehrere Sätze [§1.3]
      // und zählen nur an ihrem letzten Satz, aus Sicht ihres Siegers.
      const bg = begegnungAm(m), bgW = bg.winner === (onA ? 'A' : 'B');
      // `mid` ist die Partie selbst: „Die Stütze" fragt, ob der Partner die
      // zwei Partien davor verloren hatte, und die stehen in der Liste des
      // Partners, nicht in dieser.
      p.partien.push({win:w, gf, ga, pos, tag:day, wk:_wochenKey(m.created_at), mid:m.id,
                      knapp, deutlich, zitter, zuNull:bg.zuNull, wende:bg.wende && bgW,
                      sf:fz.setsFor, sa:fz.setsAgainst, tbW:fz.tbWon, tbL:fz.tbLost,
                      bF:fz.bagelsFor, bA:fz.bagelsAgainst, erg:standFuer(m, w),
                      mate:mateOf(id),
                      geg: onA ? [m.b1, m.b2] : [m.a1, m.a2], exp:myExp(id, m)});
      p.games++; p.gf += gf; p.ga += ga; p.gd += (gf - ga);
      if(w) p.wins++; else p.losses++;
      if(pos === 'drive'){ p.drvG++; if(w) p.drvW++; }
      else             { p.revG++; if(w) p.revW++; }
      p.sf += fz.setsFor; p.sa += fz.setsAgainst; p.tbW += fz.tbWon; p.tbL += fz.tbLost;
      p.bagelsF += fz.bagelsFor; p.bagelsA += fz.bagelsAgainst;
      if(bgW && bg.zuNull) p.zuNull++;
      if(bgW && bg.wende) p.wenden++;
      // Trug einer der Gegner vor der Partie drei Siege am Stueck, ist das eine
      // Gelegenheit, eine Serie zu brechen — gezaehlt wird der Anteil, nicht
      // die Anzahl: wer viel spielt, trifft oefter auf einen heissen Gegner.
      const gegSerie = (onA ? [m.b1, m.b2] : [m.a1, m.a2])
        .reduce((mx, g) => Math.max(mx, g ? (serieVor[g] || 0) : 0), 0);
      if(gegSerie >= 3){ p.brechG++; if(w) p.brechW++; }
      if(w && zitter)  p.nail++;
      if(!w && zitter) p.bitter++;
      if(bg.zuNull &&  bgW) p.perfect++;
      if(bg.zuNull && !bgW) p.debacle++;
      const exp = myExp(id, m);
      if(w && exp < CHANCE_UPSET) p.upsets++;
      // Außenseiter-Partien: alles, wo die Rechnung gegen ihn stand. Nicht nur
      // die krassen Fälle (das ist `upsets`), sondern jede Partie, in die er
      // als der Schwächere ging.
      if(exp < 0.50){ p.favG++; p.favExp += exp; if(w) p.favW++; }
      p.expSum += exp;
      if(exp >= 0.60){ p.favoritG++; if(w) p.favoritW++; }
      if(_stAugenhoehe({exp})){ p.gleichG++; if(w) p.gleichW++; }
      if(mitteTag){ if(day < mitteTag){ p.h1G++; if(w) p.h1W++; }
                    else { p.h2G++; if(w) p.h2W++; } }
      if(w && deutlich) p.blowouts++;
      if(!w && deutlich) p.blowL++;
      // Die Antwort auf ein Debakel. Erst auswerten, dann die Marke für die
      // nächste Partie setzen — sonst zählte das Debakel sich selbst als
      // Antwort auf sich.
      if(nachDebakel[id]){ p.antwortG++; if(w) p.antwortW++; }
      nachDebakel[id] = (!w && deutlich);
      if(hour >= 22 || hour < 4) p.night++;
      if(hour < 12) p.morning++;
      // Knappe Partien (§1.3), egal in welche Richtung.
      if(knapp){ p.close++; if(w) p.closeW++; }
      // Erstes und letztes Match eines Spieltags.
      if(isFirstOfDay){ p.firstG++; if(w) p.firstW++; }
      if(isLastOfDay){ p.lastG++; if(w) p.lastW++; }
      // Sieg direkt nach einer Niederlage — die Reaktion, nicht der Lauf.
      // afterLossOpp zählt die Gelegenheiten, damit daraus eine QUOTE wird und
      // nicht bloß „wer am meisten spielt, verliert am meisten und antwortet
      // am meisten".
      // Wechselbad: Sieg, Pleite, Sieg, Pleite. Das misst kein Können, nur
      // einen unentschlossenen Abend — und genau deshalb kann es jeder
      // halten, auch wer sonst nichts gewinnt.
      if(lastRes[id] !== undefined && lastRes[id] !== w){ altRun[id] = (altRun[id] || 1) + 1; }
      else { altRun[id] = 1; altStart[id] = day; }
      if(altRun[id] > p.alt){
        p.alt = altRun[id];
        p.altSpan = altStart[id] === day ? dLabel(day) : (dLabel(altStart[id]) + '–' + dLabel(day));
      }
      // Der unwahrscheinlichste Sieg. Eine einzige Partie reicht, und die
      // Rechnung stand gegen ihn — mehr braucht dieser Eintrag nicht.
      if(w && (p.flukeExp == null || exp < p.flukeExp)){
        p.flukeExp = exp; p.flukeLabel = dLabel(day);
      }
      if(lastRes[id] === false){ p.afterLossOpp++; if(w) p.afterLoss++; }
      lastRes[id] = w;
      // Duell-Tabelle je Gegner — dasselbe Muster wie matesOf, nur für die
      // andere Seite des Tisches. Trägt Bezwinger, Breite und den Bann.
      const foes = onA ? [m.b1, m.b2] : [m.a1, m.a2];
      foes.forEach(fid => {
        if(!fid) return;
        if(!gegnerOf[id]) gegnerOf[id] = {};
        if(!gegnerOf[id][fid]) gegnerOf[id][fid] = {g:0, w:0};
        gegnerOf[id][fid].g++;
        const bk = id + '|' + fid;
        if(w){
          gegnerOf[id][fid].w++;
          if((bannLauf[bk] || 0) >= 12) p.bann++;
          bannLauf[bk] = 0;
        } else {
          bannLauf[bk] = (bannLauf[bk] || 0) + 1;
        }
      });
      // Stamm-Partner: mit wem war man am häufigsten in einem Team?
      const mate = mateOf(id);
      if(mate){
        if(!matesOf[id]) matesOf[id] = {};
        if(!matesOf[id][mate]) matesOf[id][mate] = {g:0, w:0};
        matesOf[id][mate].g++;
        if(w) matesOf[id][mate].w++;
      }
      // Spieltage
      if(!daySet[id]) daySet[id] = new Set();
      daySet[id].add(day);
      if(!dayCount[id]) dayCount[id] = {};
      dayCount[id][day] = (dayCount[id][day] || 0) + 1;
      if(dayCount[id][day] > p.maxDay){ p.maxDay = dayCount[id][day]; p.maxDayLabel = dLabel(day); }
      // Der Stand nach dem Hochzählen IST die Nummer der Partie an diesem
      // Abend — kein zweiter Zähler nötig.
      const nrImAbend = dayCount[id][day];
      if(nrImAbend <= 3){ p.fruehG++; if(w) p.fruehW++; }
      if(nrImAbend >= 6){ p.spaetG++; if(w) p.spaetW++; }
      if((tagGesamt[id + '|' + day] || 0) >= 8){ p.langG++; if(w) p.langW++; }
      if(!dayWins[id]) dayWins[id] = {};
      if(w) dayWins[id][day] = (dayWins[id][day] || 0) + 1;
      // Längste Siegesserie inkl. Zeitraum (für den Beleg-Text)
      if(w){
        run[id] = (run[id] || 0) + 1;
        if(run[id] === 1) runStart[id] = day;
        if(run[id] > p.bestStreak){
          p.bestStreak = run[id];
          p.streakSpan = runStart[id] === day ? dLabel(day) : (dLabel(runStart[id]) + '–' + dLabel(day));
        }
      } else {
        run[id] = 0;
      }
      // Längste Niederlagenserie — Spiegelbild, für „Durststrecke" und
      // „Der Unerschütterliche".
      if(!w){
        lrun[id] = (lrun[id] || 0) + 1;
        if(lrun[id] === 1) lrunStart[id] = day;
        if(lrun[id] > p.worstLoss){
          p.worstLoss = lrun[id];
          p.lossSpan = lrunStart[id] === day ? dLabel(day) : (dLabel(lrunStart[id]) + '–' + dLabel(day));
        }
      } else {
        lrun[id] = 0;
      }
      // Elo-Verlauf: Saison-Hoch und der tiefste Rückfall danach. Daraus
      // entstehen „Der Phönix" (Erholung nach dem Einbruch) und „Der Sturzflug"
      // (vom Hoch nicht mehr zurückgekommen).
      if(eloAfter){
        const ea = eloAfter[id];
        if(ea !== undefined && isFinite(ea)){
          if(p.eloHigh === null || ea > p.eloHigh) p.eloHigh = ea;
          if(p.runHigh === null || ea > p.runHigh){ p.runHigh = ea; p.runLow = ea; }
          else if(ea < p.runLow){
            p.runLow = ea;
            const dd = p.runHigh - p.runLow;
            if(dd > p.maxDD){ p.maxDD = dd; p.ddLow = p.runLow; }
          }
        }
      }
    });
  });

  // Elo, Vorsaison-Zuwachs, Spieltage; versteckt oder nicht mehr im Kader → raus.
  //
  // ZWEI FRAGEN, ZWEI LISTEN. „Wer steht wo in der Tabelle" und „wer ist für
  // eine Monatswertung gewertet" sind nicht dieselbe Frage. TITLE_MIN_GAMES
  // beantwortet nur die zweite: wer drei Spiele mitgenommen hat, soll keinen
  // Saisontitel gewinnen. Die Tabellenposition gilt ab der ersten Partie —
  // so steht sie auch im Liga-Tab.
  // Vorher entschied dieselbe Schwelle beides. Am zweiten Tag einer neuen
  // Saison zeigte die Liste vier Spieler mit ihren Plätzen, und im Profil
  // blieb das Schild leer, weil noch niemand acht Partien hatte.
  // Player of the Week: die Sieger-Ermittlung steht genau einmal im Code
  // (`_periodWinnerMap`), damit Chronik und Auszeichnung nicht auseinander-
  // laufen. Sie rechnet ueber ALLE Partien, nicht nur die des Monats — eine
  // Woche kann ueber den Monatswechsel gehen.
  const wochenSieger = _periodWinnerMap(matches || [], 'week');
  const prevId = _prevSeasonId(sid);
  const prevElos = prevId ? (gSim.seasonEndElos[prevId] || {}) : {};
  const prevPlayed = prevId ? (gSim.seasonPlayed[prevId] || {}) : {};
  const roh = [];                       // alle, die diese Saison gespielt haben
  Object.keys(P).forEach(id => {
    const p = P[id];
    if(!sichtbar(id)){ delete P[id]; return; }
    p.days = daySet[id] ? daySet[id].size : 0;
    p.elo = Math.round(eloMap[id] !== undefined ? eloMap[id] : cfg.start_elo);
    // Zuwachs nur, wenn die Vorsaison überhaupt gespielt wurde — sonst wäre
    // „von 0 auf 300" kein Aufstieg, sondern ein Debüt.
    if(prevId && (prevPlayed[id] || 0) >= 10){
      p.growth = p.elo - Math.round(prevElos[id] !== undefined ? prevElos[id] : cfg.start_elo);
    }
    roh.push({id, elo:p.elo, games:p.games, wins:p.wins, losses:p.losses});
    if(p.games < TITLE_MIN_GAMES){ delete P[id]; return; }
    _rohGruppen(id, p, wochenSieger, offen);
  });
  _bannLaufDerLiga(P, ms);
  _thronDerLiga(P, ms, offen);

  // Spieltage mit vollem Programm (4+ Partien) und die makellosen darunter.
  // Ein Tag mit zwei Spielen kann kein „makelloser Tag" sein — sonst hätte ihn
  // jeder, der einmal kurz vorbeischaut und beide gewinnt.
  // Ein Spieltag ist ein Tag, kein Monat: Ein Spieler kann jeden einzelnen
  // davon gewinnen oder verlieren. Die Player-of-the-Day-Titel kommen aus
  // derselben Quelle wie das Badge — Tage liegen nie über einem Monatsende,
  // also ist die Saison-Teilmenge hier deckungsgleich mit der Gesamtrechnung.
  const potdOfSeason = _winnerCountsOf(ms, 'day');
  Object.keys(P).forEach(id => {
    const dc = dayCount[id] || {}, dw = dayWins[id] || {};
    let big = 0, perf = 0, pos = 0, bestPerfTag = 0;
    const quoten = [];
    Object.keys(dc).forEach(day => {
      if(offen.tag(day)) return;
      const w = dw[day] || 0;
      if(w > dc[day] - w) pos++;
      // Ein Abend, an dem nichts schiefging — die Zahl der Partien ist das
      // Maß. Ab drei Partien zählt der Tag außerdem für die Schwankung:
      // darunter ist eine Quote von 0 oder 100 % kein Befund, sondern Zufall.
      if(w === dc[day] && dc[day] > bestPerfTag) bestPerfTag = dc[day];
      if(dc[day] >= 3) quoten.push(w / dc[day]);
      if(dc[day] < 4) return;
      big++;
      if(w === dc[day]) perf++;
    });
    P[id].bestPerfTag = bestPerfTag;
    P[id].tageGewertet = quoten.length;
    // Streuung der Tagesquoten: wie weit liegen die Abende auseinander?
    // Klein heißt gleichmäßig, nicht gut — „Der Gleichmütige" ist eine
    // Eigenart, keine Wertung.
    if(quoten.length >= 4){
      const mw = quoten.reduce((a, b) => a + b, 0) / quoten.length;
      P[id].tagStreuung = Math.sqrt(
        quoten.reduce((a, b) => a + (b - mw) * (b - mw), 0) / quoten.length);
    } else {
      P[id].tagStreuung = null;
    }
    P[id].bigDays = big;
    P[id].perfDays = perf;
    P[id].posDays = pos;
    P[id].potd = potdOfSeason[id] || 0;
  });

  // ── Duelle und Partner: was aus gegnerOf und matesOf folgt ──────────────
  // Beide Tabellen entstehen im Hauptlauf. Hier wird nur zusammengefasst,
  // kein Match noch einmal angefasst.
  Object.keys(P).forEach(id => {
    const gg = gegnerOf[id] || {};
    let sweepG = 0, sweepX = '', breiteN = 0, breiteOk = 0;
    Object.keys(gg).forEach(fid => {
      const q = gg[fid];
      // Der Bezwinger: ein ganzer Monat gegen denselben Gegner ohne Pleite.
      if(q.g >= 8 && q.w === q.g && q.g > sweepG){ sweepG = q.g; sweepX = fid; }
      // Die Breite: gegen wie viele regelmäßige Gegner steht er im Plus?
      if(q.g >= 4){ breiteN++; if(q.w * 2 > q.g) breiteOk++; }
    });
    P[id].sweepG = sweepG;
    P[id].sweepX = sweepX;
    P[id].breiteN = breiteN;
    P[id].breiteOk = breiteOk;

    // Der schwächste Partner. Nicht der Schnitt, sondern der Boden: „auch
    // neben dem, mit dem es am wenigsten lief".
    const mm = matesOf[id] || {};
    let pMin = null, pX = '', pN = 0, pW = 0, pG = 0;
    Object.keys(mm).forEach(mid => {
      const r = mm[mid];
      if(r.g < 5) return;
      pN++;
      const q = r.w / r.g;
      if(pMin === null || q < pMin){ pMin = q; pX = mid; pW = r.w; pG = r.g; }
    });
    P[id].partnerMin = pN >= 3 ? pMin : null;
    P[id].partnerX = pX;
    P[id].partnerN = pN;
    P[id].partnerW = pW;
    P[id].partnerG = pG;
  });

  // ── Uplift: was ändert sich an einem Partner, wenn ER daneben steht? ──
  // Für jeden Partner wird verglichen, wie oft dieser Partner MIT ihm gewinnt
  // und wie oft OHNE ihn — der Abstand in Prozentpunkten, gewichtet nach der
  // Zahl gemeinsamer Spiele. Das ist die persönlichste Zahl im ganzen Katalog:
  // Sie misst nicht das eigene Ergebnis, sondern den Effekt auf andere, und
  // sie lässt sich durch Vielspielen nicht erschleichen.
  Object.keys(P).forEach(id => {
    const mm = matesOf[id] || {};
    let num = 0, den = 0, n = 0;
    Object.keys(mm).forEach(mid => {
      const r = mm[mid], M = P[mid];
      if(!M || r.g < 12) return;
      const soloG = M.games - r.g, soloW = M.wins - r.w;
      if(soloG < 15) return;              // ohne Vergleichsbasis kein Vergleich
      num += (r.w / r.g - soloW / soloG) * r.g;
      den += r.g; n++;
    });
    P[id].uplift = den ? num / den : null;
    P[id].upliftMates = n;
  });

  const ids = Object.keys(P);
  const gamesSorted = ids.map(id => P[id].games).sort((a,b)=>a-b);
  const median = gamesSorted.length
    ? (gamesSorted.length % 2
        ? gamesSorted[(gamesSorted.length-1)/2]
        : (gamesSorted[gamesSorted.length/2 - 1] + gamesSorted[gamesSorted.length/2]) / 2)
    : 0;
  const _nachElo = (a,b) => b.elo - a.elo || b.wins - a.wins || (a.id < b.id ? -1 : 1);
  const rank = ids.map(id => ({
      id, elo:P[id].elo, games:P[id].games, wins:P[id].wins, losses:P[id].losses
    }))
    .sort(_nachElo);
  // Dieselbe Rechnung, nur ohne die Wertungsschwelle: die vollständige
  // Tabelle der Saison. `rank` trägt die Wertung (Meister, Monatstitel),
  // `rankAll` die Position, die im Schild und im Liga-Tab steht.
  const rankAll = roh.slice().sort(_nachElo);

  // Siege gegen den Elo-Ersten der Saison — zweiter, sehr kurzer Durchlauf,
  // weil der Erste erst nach dem Sortieren feststeht.
  const topId = rank[0] ? rank[0].id : null;
  const top3 = new Set(rank.slice(0, 3).map(r => r.id));
  if(topId){
    ids.forEach(id => { P[id].vsTop3Games = 0; P[id].vsTop3 = 0; });
    ms.forEach(m => {
      const aSeite = [m.a1, m.a2], bSeite = [m.b1, m.b2];
      const aTop3 = aSeite.some(x => x && top3.has(x));
      const bTop3 = bSeite.some(x => x && top3.has(x));
      // Gegen die Spitze gespielt hat, wer auf der anderen Seite stand. Auch
      // ein Erster spielt gegen die anderen beiden — er wird nicht
      // ausgenommen, sonst könnte die Spitze diesen Eintrag nie holen.
      if(bTop3) aSeite.forEach(id => { if(P[id]){
        P[id].vsTop3Games++; if(m.winner === 'A') P[id].vsTop3++; } });
      if(aTop3) bSeite.forEach(id => { if(P[id]){
        P[id].vsTop3Games++; if(m.winner === 'B') P[id].vsTop3++; } });
      const onA = (topId===m.a1 || topId===m.a2);
      const onB = (topId===m.b1 || topId===m.b2);
      if(!onA && !onB) return;
      const foes = onA ? bSeite : aSeite;
      const foesWon = onA ? m.winner==='B' : m.winner==='A';
      foes.forEach(id => { if(P[id]){ P[id].vsTopGames++; if(foesWon) P[id].vsTop++; } });
    });
  }

  // Liga-Schnitt für Uhrzeit und Partner: Titel wie „Nachtschwärmer" dürfen
  // nicht davon abhängen, WANN diese Liga generell spielt. Sie messen den
  // Abstand zum Liga-Schnitt, nicht die absolute Uhrzeit.
  let tg = 0, tn = 0, tm = 0;
  ids.forEach(id => { tg += P[id].games; tn += P[id].night; tm += P[id].morning; });
  const nightShare   = tg ? tn / tg : 0;
  const morningShare = tg ? tm / tg : 0;

  // Das Ligamittel des Monats. Mehrere Chroniken stellen den eigenen Wert
  // dagegen, statt gegen eine feste Zahl: damit wandert die Messlatte mit
  // der Liga, und ein Monat mit kurzen Sätzen verschenkt keine Einträge [§C39].
  const L = {
    gameSchnitt: ms.length ? ms.reduce((a, m) => a + m.games_a + m.games_b, 0) / ms.length : 0,
    engAnteil:  ms.length ? ms.filter(m => partie(m).knapp).length / ms.length : 0,
    // Das Gegenstück zu den knappen: wie oft deutlich entschieden wurde
    // („Klare Verhältnisse"), und mit welchem Abstand in Games im Mittel
    // überhaupt („Der Widerstand" im Monat).
    klarAnteil: ms.length ? ms.filter(m => partie(m).deutlich).length / ms.length : 0,
    gameAbstand: ms.length ? ms.reduce((a, m) => a + Math.abs(m.games_a - m.games_b), 0) / ms.length : 0
  };
  return {
    sid, label:seasonLabel(sid), live, P, rank, rankAll, topId, L, ms,
    days: allDays.size,
    matches: ms.length,
    gamesBar: Math.ceil(median * 1.6),
    nightShare, morningShare
  };
}

// Vormonat einer Saison-ID ('2026-07' → '2026-06'). Null bei Unsinn.
function _prevSeasonId(sid){
  const mm = /^(\d{4})-(\d{2})$/.exec(String(sid||''));
  if(!mm) return null;
  let y = +mm[1], m = +mm[2] - 1;
  if(m < 1){ m = 12; y--; }
  return y + '-' + String(m).padStart(2,'0');
}

// ─── §13.3a Einfrieren ───────────────────────────────────────────────
//     Eine abgeschlossene Saison darf sich nicht mehr ändern. Vorher wurde
//     jede vergangene Saison bei jedem Laden neu gerechnet — wer den Katalog
//     anfasst, schrieb damit rückwirkend die Geschichte um: Ein Eintrag, den
//     jemand im Mai geholt hat, konnte im August verschwinden, weil eine
//     Schwelle anders steht.
//
//     Deshalb wandert die fertige Chronik beim Archivieren in seasons.titles.
//     Eingefroren wird ALLES, was zum Rendern nötig ist (name, ic, tone, cond,
//     ev) — nicht nur die IDs. Nur so lässt sich eine alte Saison auch dann noch
//     anzeigen, wenn ihr Eintrag im heutigen Katalog gar nicht mehr existiert.
//
//     `v` ist die Fassung des Katalogs, mit der eingefroren wurde: fehlt sie
//     oder ist sie älter als die heutige, gilt die Saison als nicht
//     eingefroren — sie wird aus den Partien gerechnet, und der nächste
//     Archivlauf friert sie neu ein. Eine Saison ohne einen einzigen Eintrag
//     ist damit unterscheidbar von einer, die noch nie eingefroren wurde.
//     Eine neue Fassung ist ein bewusster Schritt, kein Nachjustieren: die
//     zweite kam mit den Klassen nach dem Ausschlag und den acht Chroniken
//     gegen das Eigene [§C39], die dritte mit achtzehn weiteren: gegen
//     Ligamittel und Laufbahn, die Laufbahnfragen auf der Monatsachse, die
//     Schattenseiten gegen das Eigene und der Anteil an den Partien gegen die
//     Monate davor. Beide Male, damit jeder Monat dieselben Fragen stellt —
//     sonst hätte der Oktober zweiundneunzig Chroniken gehabt und der
//     September vierundsiebzig. Die vierte trägt je Halter seinen Wert
//     (`wert`), aus dem der Bonus über der Schwelle rechnet [§C39]: ohne ihn
//     brächte jeder eingefrorene Monat nur den Grundwert, und dieselbe
//     Chronik zählte im laufenden Monat mehr als nach seinem Abschluss. Die
//     fünfte kam mit sieben weiteren Chroniken (Bannbrecher, Stütze,
//     Zielwasser, Retourkutsche, weiche Knie, Abgesang, Fremdeln), aus
//     demselben Grund wie die zweite und dritte. Die sechste hob die
//     Schwellen von dreiundzwanzig Chroniken, die in drei bis fünf von fünf
//     Monaten vergeben wurden, brachte neunzehn neue und rundete jede
//     Schwelle [§C39]: ein Monat, der mit den alten Schwellen eingefroren
//     bliebe, trüge Einträge, die es heute nicht mehr gäbe. Die siebte
//     setzte die Schwellen von sechsundzwanzig Chroniken so, wie die Liga sie
//     festgelegt hat, und rechnet den unmöglichen Monat als Wahrscheinlichkeit
//     — aus demselben Grund. Die achte zählt eine Chronik je Spieler ab
//     fünfzehn Partien statt für den ganzen Monat ab dem fünften Spieltag
//     und wertet einen Anteil nach seiner Stichprobe [§C39]; sie friert dazu
//     ein, wer nicht gewertet ist (`zuWenig`). Ein Oktober
//     mit der siebten Fassung trüge Chroniken von Spielern mit acht Partien
//     und keine von denen, die sie jetzt halten.
const SEASON_TITLES_FREEZE_V = 8;

// Liest die eingefrorene Chronik einer Saison — aus dem seasons-Eintrag, egal
// ob die Spalte als Objekt oder als JSON-Text ankommt. null = nicht eingefroren.
function _frozenTitlesOf(season){
  if(!season) return null;
  let t = season.titles;
  if(typeof t === 'string'){ try { t = JSON.parse(t); } catch(e){ return null; } }
  if(!t || typeof t !== 'object' || !t.v || !Array.isArray(t.awarded)) return null;
  if(t.v < SEASON_TITLES_FREEZE_V) return null;
  return t;
}

// Baut den einzufrierenden Datensatz. Läuft nur beim Archivieren, also einmal
// pro Saison — der teure Kontext-Pass ist hier kein Thema.
function _freezeSeasonTitles(sid){
  try {
    const T = seasonTitles(sid);
    return {
      v: SEASON_TITLES_FREEZE_V,
      frozen_at: new Date().toISOString(),
      days: T.days, matches: T.matches,
      champ: T.champ || null,
      awarded: T.awarded.map(a => ({titleId:a.titleId, name:a.name, short:a.short,
                                    ic:a.ic, tone:a.tone, cond:a.cond, pid:a.pid, ev:a.ev,
                                    wert:a.wert})),
      empty: T.empty.slice(),
      zuWenig: (T.zuWenig || []).slice()
    };
  } catch(e){ return null; }
}

// ─── §13.3 Vergabe ───────────────────────────────────────────────────
// Liefert [{titleId, name, ic, tone, pid, ev, wert}] in Katalog-Reihenfolge;
// `wert` ist die Größe des Halters, aus der der Bonus rechnet [§C39].
// Memoisiert pro Saison — der Kontext-Pass läuft nur einmal je Cache-Stand.
function seasonTitles(sid, bisMs){
  if(!sid) sid = currentSeason().id;
  bisMs = _schnittSaison(sid, bisMs);
  const key = sid + '_' + matches.length + '_' + _cache.version + (bisMs ? '_' + bisMs : '');
  if(!_cache._seasonTitles) _cache._seasonTitles = {};
  const hit = _cache._seasonTitles[key];
  if(hit) return hit;
  _topfDeckel(_cache._seasonTitles, 60);

  // Eingefrorene Saison → gelesen statt gerechnet. Die laufende Saison ist
  // ausgenommen: sie ändert sich bis zum Monatsende bei jedem Match.
  if(!bisMs && sid !== currentSeason().id){
    const frozen = _frozenTitlesOf((seasons || []).find(x => x && x.id === sid));
    if(frozen){
      const res = {sid, label:seasonLabel(sid), live:false,
                   days:frozen.days || 0, matches:frozen.matches || 0,
                   champ:frozen.champ || null,
                   awarded:frozen.awarded, empty:frozen.empty || [], zuWenig:frozen.zuWenig || [], frozen:true};
      _cache._seasonTitles[key] = res;
      return res;
    }
  }

  const C = _seasonTitleCtx(sid, bisMs);
  const out = [];
  // Gewertet wird vom ersten Spieltag an, je Spieler ab fünfzehn Partien
  // (`CHRONIK_MIN_SPIELE` in `_stWertung`) [§C39].
  if(Object.keys(C.P).length){
    // ─── Die Vergabe [§C32] ────────────────────────────────────────
    // EIN EINTRAG = EIN BESTWERT. Jeder Eintrag geht an den, der ihn in
    // diesem Monat wirklich hält — genau wie bei den Allzeit-Rekorden, und
    // aus demselben Grund. Halten ihn mehrere punktgleich, tragen ihn alle.
    //
    // Vorher galt „ein Eintrag je Spieler" schon bei der VERGABE: wer den
    // Bestwert hielt und schon etwas anderes trug, gab ihn an den
    // Nächstbesten ab. Damit stand „Der Unaufhaltsame" bei zwölf Siegen in
    // Folge, während einer mit dreizehn danebensaß — und in den echten
    // Daten ging ein Drittel aller Einträge an jemanden, der nicht der
    // Beste war. Das macht die Tafel nicht abwechslungsreicher, sondern
    // unwahr.
    //
    // Dass ein Spieler in der Matrix trotzdem nur EINEN Eintrag je Monat
    // zeigt, ist eine reine ANZEIGE-Regel: seasonTitleOf liefert den
    // wertvollsten (`chronikEintragVon`). Die volle Tafel zeigt alles.
    SEASON_TITLES.forEach(t => {
      const r = t.pick(C, new Set());
      if(!r || !r.halter || !r.halter.length) return;
      r.halter.forEach(pid => {
        out.push({titleId:t.id, name:t.name, short:t.short||t.name, ic:t.ic,
                  tone:t.tone, cond:t.cond, pid, ev:r.evVon(pid), wert:r.wert(pid)});
      });
    });
  }
  const res = {sid, label:C.label, live:C.live, days:C.days, matches:C.matches,
               // Der Meister ist KEIN Chronik-Eintrag mehr (er stand per
               // Definition immer dem Ersten zu und sagte nichts, was die
               // Rangliste nicht schon zeigt). Er hängt trotzdem hier mit
               // drin, weil dieser Aufruf ohnehin memoisiert ist und Krone,
               // Avatar-Ring und Saison-Tafel dieselbe Quelle brauchen.
               champ: C.rank[0] ? {pid:C.rank[0].id, elo:C.rank[0].elo,
                                   wins:C.rank[0].wins, games:C.rank[0].games} : null,
               // Ohne Eintrag ist, wer gewertet wurde und nichts hält; wer
               // unter fünfzehn Partien blieb, ist nicht gewertet und steht
               // als `zuWenig` daneben — in der Matrix leer, nicht als Strich.
               awarded:out, empty:Object.keys(C.P).filter(id => C.P[id].games >= CHRONIK_MIN_SPIELE && !out.some(o => o.pid === id)),
               zuWenig:C.rankAll.filter(r => r.games > 0 && r.games < CHRONIK_MIN_SPIELE).map(r => r.id)};
  _cache._seasonTitles[key] = res;
  return res;
}

// Meister einer Saison = Platz 1 der Saison-Elo. Einzige Quelle für die Krone
// neben dem Namen, den Titelverteidiger-Ring und die Saison-Tafel.
function seasonChampion(sid){
  try { const t = seasonTitles(sid); return t.champ ? t.champ.pid : null; }
  catch(e){ return null; }
}

// Alle Saisons mit Titeln, neueste zuerst (inkl. laufender).
function allSeasonTitles(){
  const cur = currentSeason().id;
  const ids = allPastSeasons().slice();
  if(!ids.includes(cur) && matchesInSeason(cur).length) ids.push(cur);
  // Explizit nach Saison-ID sortieren statt der Aufrufer-Reihenfolge zu
  // vertrauen: 'YYYY-MM' sortiert als String korrekt chronologisch.
  ids.sort();
  return ids.map(sid => seasonTitles(sid)).filter(x => x.awarded.length || x.live)
            .sort((a,b) => a.sid < b.sid ? 1 : -1); // neueste zuerst
}

// Titel eines Spielers in einer Saison (oder null).
// Wer haelt die Monatschroniken zu einem Zeitpunkt? Nur die Halter, ohne
// Meister und ohne Leerliste: der Feed vergleicht damit den Stand vor dem
// letzten Spieltag mit dem von heute und meldet, was gewechselt hat.
// `seasonTitles` taugt dafuer nicht — es ist auf HEUTE gemerkt und friert
// abgeschlossene Monate ein.
//
// Dieselbe Vergabe wie `seasonTitles`, mit demselben Tor je Spieler
// (`_stWertung`) [§C39]. Eine Grenze, die nur dort stünde, meldete im Feed
// Chroniken, die es nicht gibt: als es noch eine Grenze für den ganzen
// Monat gab und sie hier fehlte, nannte diese Funktion am 04.08. acht Halter,
// während die Monatstafel keinen zeigte.
//
// Jeder Monat ist vom ersten Spieltag an gewertet, ein Monat ohne Halter ist
// deshalb `{}` und nicht `null`: der Feed meldet damit vom ersten Spieltag an
// jede Chronik, die jemand holt, und kein Aufgehen einer Tafel mehr.
function seasonTitleHalter(sid, bisMs){
  bisMs = _schnittSaison(sid, bisMs);
  const out = {};
  let C = null;
  try { C = _seasonTitleCtx(sid, bisMs); } catch(e){ return out; }
  if(!C) return out;
  SEASON_TITLES.forEach(t => {
    let r = null;
    try { r = t.pick(C, new Set()); } catch(e){ r = null; }
    if(r && r.halter && r.halter.length){
      let ev = '';
      try { ev = r.evVon(r.halter[0]) || ''; } catch(e){ ev = ''; }
      // Alle Halter teilen den Bestwert, also auch den Bonus [§C39].
      out[t.id] = {pids: r.halter.slice().sort(), ev, wert: r.wert(r.halter[0])};
    }
  });
  return out;
}

// Der Eintrag, der für einen Spieler in einem Monat steht — in der Matrix,
// im Prestige und im Banner des Profils [§C32]: der wertvollste, den er
// hält, bei gleichem Wert der erste im Katalog. Vorher war es der erste im
// Katalog, und der Katalog ordnet nach Art und Ausschlag, nicht nach Wert:
// eine Können-Chronik in Grau stand vor einer Fügung in Gold. Seit jede
// Chronik denselben Grundwert hat, entscheidet der Bonus: der Eintrag, in
// dem jemand seine Schwelle am weitesten überbietet [§C39].
// Eine besondere Chronik, die eine Schattenseite überschattet
// (`chronikUeberschattet`), zählt hier mit null; bringt im Monat nichts mehr
// Punkte, steht die Schattenseite, die überschattet: sonst stünde in Matrix
// und Profil ein grauer Eintrag, der nichts zählt, und der Monat sähe aus wie
// einer mit Prestige.
function chronikEintragVon(T, pid){
  let best = null, bw = -1, schatten = null;
  ((T && T.awarded) || []).forEach(a => {
    if(a.pid !== pid) return;
    const s = chronikUeberschattet(T, a);
    if(s && !schatten) schatten = s;
    const w = s ? 0 : chronikPunkte(a.titleId, a.wert);
    if(w > bw){ best = a; bw = w; }
  });
  return bw <= 0 && schatten ? schatten : best;
}
function seasonTitleOf(pid, sid, bisMs){
  return chronikEintragVon(seasonTitles(sid, bisMs), pid);
}

// Die Farbe der Zelle eines Spielers in einem Monat [§C39]: die höchste
// Klasse unter seinen positiven Einträgen, auch wenn der Eintrag, der in der
// Zelle steht und zählt (`chronikEintragVon`), eine niedrigere trägt. Seit
// der Bonus entscheidet, welcher Eintrag zählt, kann eine besondere Chronik
// eine legendäre schlagen — mit der Farbe ihrer eigenen Klasse stand dann
// ein grauer Monat da, in dem jemand eine goldene hielt. Nur Schattenseiten:
// rot. Eine Chronik, die der Katalog nicht mehr kennt, zählt nicht mit, eine
// überschattete auch nicht: sie bringt nichts, und die Zelle zeigt, was zählt.
const _CHRONIK_STUFE_RANG = {legendaer:3, selten:2, besonders:1};
function chronikZellStufe(T, pid){
  let best = '', rang = 0;
  ((T && T.awarded) || []).forEach(a => {
    if(a.pid !== pid || chronikUeberschattet(T, a)) return;
    const st = chronikStufe(a.titleId), r = _CHRONIK_STUFE_RANG[st] || 0;
    if(r > rang){ rang = r; best = st; }
  });
  if(best) return best;
  const e = chronikEintragVon(T, pid);
  return e ? chronikStufe(e.titleId) : '';
}

// Wer in welchem Monat gespielt hat, einmal je Partienliste. Die Historie
// fragte für jeden Spieler jeden Monat mit `quelle.some(...)` über die ganze
// Liga ab — zwölf Spieler, fünf Monate, je Zeitschnitt. `seasonOf` hängt nur
// am Zeitstempel, die Antwort also nur an der Liste; `ids` behält die
// Reihenfolge des ersten Auftretens, wie das `Set` vorher.
const _spielerJeSaisonMemo = new WeakMap();
function _spielerJeSaison(quelle){
  let r = _spielerJeSaisonMemo.get(quelle);
  if(r) return r;
  r = {ids:[], spieler:new Map()};
  quelle.forEach(m => {
    const sid = (seasonOf(m.created_at) || {}).id;
    if(!sid) return;
    let set = r.spieler.get(sid);
    if(!set){ set = new Set(); r.spieler.set(sid, set); r.ids.push(sid); }
    [m.a1, m.a2, m.b1, m.b2].forEach(x => { if(x) set.add(x); });
  });
  _spielerJeSaisonMemo.set(quelle, r);
  return r;
}

// ─── §13.4 Saisontitel-Historie eines Spielers ───────────────────────
// Chronik = ein Eintrag je Saison, in der der Spieler gespielt hat.
// `title` ist null, wenn er leer ausging — die Lücke gehört dazu.
function seasonTitleHistory(pid, bisMs){
  bisMs = _schnitt(bisMs);
  const key = pid + '_' + matches.length + '_' + _cache.version + (bisMs ? '_' + bisMs : '');
  if(!_cache._chronicle) _cache._chronicle = {};
  const hit = _cache._chronicle[key];
  if(hit) return hit;
  _topfDeckel(_cache._chronicle, 80);

  const cur = currentSeason().id;
  const quelle = bisMs ? _partienBis(bisMs) : matches;
  const je = _spielerJeSaison(quelle);
  const ids = je.ids.slice();
  if(!bisMs){
    allPastSeasons().forEach(sid => { if(!ids.includes(sid)) ids.push(sid); });
    if(!ids.includes(cur)) ids.push(cur);
  }
  ids.sort(); // chronologisch, unabhängig davon wie der Aufrufer sortiert hat
  const rows = [];
  ids.forEach(sid => {
    const played = !!(je.spieler.get(sid) && je.spieler.get(sid).has(pid));
    if(!played) return;
    rows.push({sid, label:seasonLabel(sid), live:(sid===cur), title:seasonTitleOf(pid, sid, bisMs)});
  });
  _cache._chronicle[key] = rows;
  return rows;
}

