// ─── §11.2 — Story-Cache (DB-basiert, v8.3) + Display-Konsolidierung ──
// Stories werden in der Supabase-Tabelle `stories` persistiert. Der
// Generator (_buildStories) läuft weiterhin clientseitig und produziert
// Story-Objekte aus Live-Daten. Die werden idempotent in die DB geschrieben
// (ON CONFLICT DO NOTHING) — erste INSERT-Zeit gewinnt also den Timestamp.
//
// Lese-Pfad ist ausschließlich aus der DB:
//   syncStoriesViaDb() läuft in loadAll → befüllt _cache._stories
//   getStoriesCache() returns _cache._stories synchron
//
// Vorteile:
//   - Story-Timestamps stabil über Geräte und App-Starts
//     ("Heute, 02:10" bleibt "Heute, 02:10", nicht "Heute, 14:30" beim Reload)
//   - Cross-Device-Konsistenz (alle Spieler sehen dieselben Stories)
//   - Alle Stories des 14-Tage-Feedfensters vollständig erhalten
//
// Fallback: wenn DB-Calls fehlschlagen (Migration noch nicht eingespielt,
// Netzwerk down etc.), läuft _buildStories als rein in-memory Generator
// weiter. Die App ist somit auch OHNE Migration sofort funktional.
function getStoriesCache(){
  // Veröffentlichte Stories sind Snapshots. Der Lesepfad darf weder Texte
  // regenerieren noch alte Meldungen wegen neuerer Ereignisse entfernen.
  const base = Array.isArray(_cache._stories) ? _cache._stories : [];
  return _consolidateStories(_newsTexteAuffrischen(base));
}

// Persistierte Story-Zeilen sind Veröffentlichungssnapshots. Der alte
// Auffrischungsname bleibt als Kompatibilitäts-API bestehen; Text, Zeitpunkt,
// Priorität und dataRef werden beim Lesen nicht neu abgeleitet.
function _newsTexteAuffrischen(list){
  if(!Array.isArray(list)) return [];
  if(_cache._ambientZeitFrom === list) return _cache._ambientZeitList;
  let geaendert = false;
  const aus = list.map(st => {
    const m = /^ambient_(\d{4})-(\d{2})-(\d{2})_15$/.exec(String(st && st.id || ''));
    if(!m) return st;
    // Aeltere Generatorfassungen verwendeten trotz korrekter Slot-ID den
    // Zeitpunkt des naechsten Oeffnens. Inhalt und ID sind unveraenderliche
    // Snapshots; nur die sichtbare Einsortierung gehoert fest auf 15:00 Uhr.
    const slot = new Date(+m[1], +m[2] - 1, +m[3], 15, 0, 0, 0);
    if(!Number.isFinite(slot.getTime()) || new Date(st.when).getTime() === slot.getTime()) return st;
    geaendert = true;
    return Object.assign({}, st, {when:slot});
  });
  _cache._ambientZeitFrom = list;
  _cache._ambientZeitList = geaendert ? aus : list;
  return _cache._ambientZeitList;
}

// ── Was der Generator nicht mehr erzeugt, verschwindet auch ──────────
// Der Wochenrückblick war einmal SECHS eigene Karten, über den Montag
// verteilt. Er ist jetzt EINE Karte am Sonntag um 23:59 [§C33] — aber die
// sechs alten liegen persistiert in der Datenbank, und nichts hat sie je
// wieder angefasst: am Montag danach stand „der größte Sprung der Woche"
// neben dem Spieltag, der gerade lief. `_newsTexteAuffrischen` konnte sie
// nicht einmal umschreiben, weil der Generator ihre ID gar nicht mehr bildet.
// Sie sind deshalb hier namentlich abgemeldet. Der Zeitpunkt einer Karte
// gehört der Datenbank, ihre Existenzberechtigung dem Generator.
//
// Abgemeldet wird am ID-PRÄFIX, nicht am Typ. Der wöchentliche Elo-Sprung
// hieß `elo_swing_week_…` und trug den Typ `elo_swing` — denselben, den der
// TÄGLICHE Sprung heute noch trägt. Über den Typ war er nicht zu fassen, und
// „+203 Elo in der vergangenen Woche" stand weiter im Feed.
//
// Auf die Liste gehört NUR, was der Generator nicht mehr bildet: ein Präfix,
// das es noch gibt, wäre damit stumm geschaltet. `tests/ambient` misst beides.
const STORY_ABGEMELDET = [
  'upset_match_', 'thriller_', 'biggest_blowout_', 'potw_', 'team_woche_',
  'anniversary_', 'elo_swing_week_',
  // ── Der Spitzenwechsel hiess einmal anders ───────────────────────
  // Es gab eine Karte je Wechsel (`lead_change_<Saison>_<Partie>`), und der
  // Vergleich lief nur ueber die letzte Partie. Heute ist es EINE Karte je
  // Tag mit dem Endstand (`lead_day_<Saison>_<Tag>`). Die alten Zeilen
  // liegen persistiert daneben und erzaehlen dasselbe ein zweites Mal:
  // gemessen am 21.09. stand „Neuer Spitzenreiter: Martin · 11 vor Maxi"
  // in derselben Minute wie „Martin fuehrt die Tabelle · 28 vor Maxi" —
  // zwei Karten, ein Ereignis, und zwei verschiedene Zahlen, weil die alte
  // ihren Vorsprung eingefroren traegt. Umschreiben kann sie niemand, den
  // Praefix bildet der Generator nicht mehr.
  'lead_change_',
  // Der Elo-Bestwert steht als „Der hoechste Gipfel" in der Ewigen Tafel,
  // und der Generator bildet die Karte deshalb nicht mehr. Die persistierte
  // Zeile blieb: dieselbe Bestmarke, zweimal gemeldet. Ihr Breaking war ihr
  // schon genommen [§C33] — die Doppelung damit nicht.
  'elo_record_',
  // Elf Liga-Rekorde sind aus dem Katalog gefallen. Ihre Karten liegen
  // persistiert in der Datenbank und behaupten einen Rekord, den es nicht
  // mehr gibt: „Leon uebernimmt ‚Der Gigantentoeter'" stand im Feed, und im
  // Rekorde-Reiter gibt es den Eintrag nicht. Umschreiben kann sie niemand,
  // weil der Generator diese IDs gar nicht mehr bildet — also werden sie
  // abgemeldet. Das Blatt einer solchen Karte stuerzt nicht ab (die
  // Definition wird ueberall mit `?` abgefragt), sie ist nur falsch.
  'rek_giant_slayer_', 'rek_thriller_', 'rek_unbowed_', 'rek_homefield_',
  'rek_sundaychild_', 'rek_strongphase_', 'rek_steigerung_', 'rek_upswing_',
  'rek_coldshower_', 'rek_torbilanz_', 'rek_striker_u_',
  // Einundzwanzig weitere fielen, weil sie dieselbe Antwort gaben wie die
  // Siegquote, nur anders verpackt: gemessen ordneten sie die Liga mit einer
  // Korrelation von 0,76 bis 0,99 genau wie die Siegquote der Laufbahn, und
  // die zwei Besten hielten zusammen 31 Einträge [§C35]. Der Platzhirsch
  // und der Wochenherr zählten dazu noch einmal, was POTD und POTW schon als
  // Auszeichnung bringen [§C34].
  'rek_daylord_', 'rek_weeklord_', 'rek_unbeugsam_', 'rek_eloday_', 'rek_kopfhoch_',
  'rek_breitenwirkung_', 'rek_retourkutsche_', 'rek_rueckschlag_', 'rek_metronom_',
  'rek_gegenwind_', 'rek_entscheider_', 'rek_laufstopper_', 'rek_sovereign_', 'rek_rock_',
  'rek_sniper_', 'rek_densephase_', 'rek_torrausch_', 'rek_bitterloss_', 'rek_uebersoll_',
  'rek_deutlich_', 'rek_ausgleich_',
  // Drei fielen, weil sie sich mit anderen überschnitten: „Der Umsteiger"
  // neben dem Wandler und den Positionsrekorden, „Der Aufschwung" neben dem
  // Höhenflug, „Neuland" über die Laufbahn neben der Monatschronik gleichen
  // Namens, die bleibt. Gespeichert standen noch „Leon übernimmt ‚Der
  // Aufschwung'" und „Stefan übernimmt ‚Neuland'" im Feed.
  'rek_umsteiger_', 'rek_aufschwung_', 'rek_neuland_',
  // „Der Ausbruch" über die Laufbahn heißt jetzt „Der Stammkunde" und steht
  // unter den Schattenseiten [§C35]; die Monatschronik behält den Namen.
  // Eine Karte „X übernimmt ‚Der Ausbruch'" feierte als Rekord, was eine
  // Kehrseite ist, und eine Schattenseite meldet der Feed nicht.
  'rek_ausbruch_',
  // ── Die Ehrung einer Woche und eines Monats hieß einmal anders ─────
  // Je Woche und Monat stand eine Ehrung dessen, was die letzte
  // Millisekunde vergab (`ehrung_woche_…`, `ehrung_monat_…`). Jetzt nennen
  // sie alles, was im Zeitraum geholt wurde (`ehrung_der_woche_…`,
  // `ehrung_des_monats_…`) [§11.6f]. Die alten Zeilen liegen gespeichert
  // daneben und nannten neben dem Rückblick des Oktobers vier Auszeichnungen
  // statt aller. Die alte Ehrung eines Tages (`ehrung_tag_…`) und die einer
  // Runde stehen nicht hier: sie gehen in die Karte ihres Tages auf
  // (`_consolidateStories`), abgemeldet stünden sie nirgends mehr.
  'ehrung_woche_', 'ehrung_monat_',
  // ── Das Ergebnis hiess einmal anders ─────────────────────────────
  // Eine Ergebnis-Karte entstand nur fuer ein auffaelliges Muster und
  // hoechstens zweimal je Tag (`match_result_<Partie>`). Heute bekommt jede
  // Partie ihre Karte (`spiel_<Partie>`), und die alte Zeile liegt daneben:
  // dieselbe Partie, dasselbe Ergebnisband, zwei Karten untereinander.
  // Umschreiben kann sie niemand, den Praefix bildet der Generator nicht mehr.
  'match_result_',
  // ── Der Monat hatte drei Arten Karten ────────────────────────────
  // Die Chronik eines Monats (`chronik_<Saison>`, am 1. um 00:00) und je
  // Erstling eine Zeile (`chronik_erst_…`) stehen jetzt auf der einen Karte
  // des Monatsabschlusses [§C33]. Jede Saison beginnt mit ihrem Jahr, daher
  // `chronik_2`: die gespeicherten `chronik_frei_…` bleiben. Der Generator
  // bildet sie nicht mehr, seit eine Chronik je Spieler ab fünfzehn Partien
  // zählt [§C39], aber sie waren an ihrem Tag richtig.
  'chronik_2', 'chronik_erst_'
];
// ── Ein zurückgenommenes Karriereende [§C40] ─────────────────────────
// Die Karte bleibt in der Datenbank wie jede andere, sie gilt aber nur,
// solange genau dieses Karriereende gilt: wer versehentlich verabschiedet
// und gleich zurückgeholt wurde, stünde sonst für immer als Breaking im
// Feed. Ein zweites Karriereende trägt einen anderen Zeitpunkt und eine
// eigene Karte.
function _storyWiderrufen(s){
  const d = (s && s.dataRef) || {};
  if(d.type !== 'karriereende') return false;
  const p = pmap()[d.pid];
  return !p || !p.retired_at || ruhestandMs(p) !== Date.parse(d.retiredAt);
}
// Eine Hinweiskarte trägt die ID ihres Zeitfensters (`ambient_<Tag>_<Stunde>`)
// und nicht die ihres Inhalts; abgemeldet wird sie deshalb an ihrer Sorte
// (`dataRef.sub`). „Johannes im Aufschwung" stand als Bestwert der Liga im
// Feed, nachdem es den Rekord nicht mehr gab.
const AMBIENT_ABGEMELDET = ['personal_umsteiger', 'personal_aufschwung'];
function _storyAbgemeldet(s){
  const t = String((s && s.id) || '');
  for(let i = 0; i < STORY_ABGEMELDET.length; i++){
    if(t.indexOf(STORY_ABGEMELDET[i]) === 0) return true;
  }
  const sub = s && s.dataRef && s.dataRef.sub;
  return !!sub && AMBIENT_ABGEMELDET.indexOf(sub) >= 0;
}

// Display-seitige Konsolidierung gegen Match-Event-Spam (v8.6).
// Bewusst beim ANZEIGEN, nicht beim Erzeugen — Gründe:
//   • Stories sind in der DB persistiert (ON CONFLICT DO NOTHING). Würde man im
//     Generator zusammenfassen, blieben bereits gespeicherte Doppel-Rows im
//     Feed. Display-seitig wirkt es auf bestehende UND neue Rows.
//   • "Welches Match ist DER Upset der Woche" ist zeitabhängig (wandert
//     wöchentlich) und darf nicht fix in die DB gebrannt werden.
// Gleicher Badge im selben Match wird zuerst zur gemeinsamen Verleihungszeile.
// Verschiedene Badges bleiben eigene Zeilen derselben Matchkarte. Kein
// publiziertes Ereignis entfaellt wegen eines anderen Highlights.
// Memoisiert je Eingabeliste, Matchreferenz und Cacheversion.
function _consolidateStories(list){
  if(!Array.isArray(list)) return [];
  if(_cache._snapshotConsolFrom === list && _cache._snapshotConsolVersion === _cache.version
     && _cache._snapshotConsolMatches === matches && Array.isArray(_cache._snapshotConsolList))
    return _cache._snapshotConsolList;

  // Die Ewige Tafel ist eine rollende Tageskarte. Alle zugehörigen
  // Rohmeldungen desselben Kalendertags teilen deshalb bewusst eine Achse.
  // Andere Stories behalten ihren bei der Veröffentlichung gespeicherten
  // Anlass und werden durch diesen Schritt nicht verändert. Die Stufen des
  // Insigniums stehen nicht mehr darin: sie haben ihre eigene Karte je Tag
  // (`insignium_tag`), und alte Einzelzeilen werden zu ihr (`_insAltZuTag`).
  const tafelTypen = new Set(['rekord_erstmals','rekord_geholt','rekord_gesteigert',
    'chronik_geholt']);
  const matchById = new Map((matches || []).map(m => [m.id, m]));
  const duellMoment = new Map(), duellAnzahl = new Map();
  _spBasis().chrono.forEach(m => [m.a1,m.a2].forEach(a => [m.b1,m.b2].forEach(b => {
    const paar = paarKey(a, b), n = (duellAnzahl.get(paar) || 0) + 1;
    duellAnzahl.set(paar, n);
    const key = paar + '|' + mts(m);
    let l = duellMoment.get(key);
    if(!l){ l = new Map(); duellMoment.set(key, l); }
    l.set(n, m);
  })));
  const quelle = _insAltZuTag(_tafelFassungen(ohneStoriesNachAbschied(list).filter(s => !_storyAbgemeldet(s) && !_storyWiderrufen(s))));
  const marken = new Map(), normal = [];
  // Alte kleine Marken wurden je Tag gespeichert, neue je Partie. Die alten
  // Snapshots bleiben erhalten: nur ihre Anzeige wird an den gespeicherten
  // Ausloesern aufgeteilt. Identische alte/neue Marken werden einmal gezeigt
  // und tragen alle Quell-IDs, statt beim Umstieg doppelt im Feed zu stehen.
  quelle.forEach(s => {
    const d = s.dataRef || {}, l = d.marken || [];
    if(d.type !== 'badge_marken' || !l.length
       || l.some(x => !(x.matchId || d.matchId))){ normal.push(s); return; }
    l.forEach(x => {
      const mid = x.matchId || d.matchId;
      let g = marken.get(mid);
      if(!g){ g = {mid, rep:s, werte:new Map(), ids:new Set()}; marken.set(mid, g); }
      g.ids.add(s.id);
      g.werte.set([x.pid,x.badgeId,x.rang].join('|'), Object.assign({}, x, {matchId:mid}));
    });
  });
  marken.forEach(g => {
    const s = g.rep, d = s.dataRef || {}, l = [...g.werte.values()];
    const unveraendert = g.ids.size === 1 && l.length === (d.marken || []).length;
    const ids = [...new Set(l.map(x => x.pid))];
    const namen = ids.map(id => ((pmap()[id] || {}).name || '?'));
    const mid = matchById.get(g.mid);
    const zeit = mid ? new Date(mts(mid)) : s.when;
    normal.push(Object.assign({}, s, {
      id:unveraendert ? s.id : 'badgemarken_match_' + g.mid,
      title:unveraendert ? s.title : l.length === 1
        ? `${namen[0]} holt „${l[0].name}“ zum ${l[0].rang}. Mal`
        : `${_namenKurz(namen)} ${namen.length > 1 ? 'erreichen' : 'erreicht'} runde Marken`,
      desc:unveraendert ? s.desc : l.map(x =>
        `${(pmap()[x.pid] || {}).name || '?'}: „${x.name}“, ${x.rang}. Verleihung`).join('. ') + '.',
      when:zeit,
      dataRef:Object.assign({}, d, {matchId:g.mid, playerIds:ids, marken:l,
        sourceStoryIds:[...g.ids], causalKey:_storyGruppeKey('match', g.mid)})
    }));
  });
  const vorbereitet = normal.map(s => {
    const d = (s && s.dataRef) || {};
    // Alte Rivalitaets-Snapshots hatten nur eine Uhrzeit. Die Zahl blieb zwar
    // im Text stehen, die Minuten-Buendelung heftete sie beim naechsten Laden
    // aber an eine andere Partie. Aus ihrem eigenen Zeitpunkt die damalige
    // Partie ableiten; Titel, Zahl und Zeitpunkt bleiben unveraendert.
    if(d.type === 'rivalry' && !d.matchId && d.a && d.b && Number(d.n) > 0){
      const zeit = new Date(s.when).getTime();
      const l = duellMoment.get(paarKey(d.a, d.b) + '|' + zeit);
      // Gleiche Sekunde ist nicht dieselbe Partie. Bei mehreren Kandidaten
      // identifiziert nur der damalige Duellstand den urspruenglichen Match.
      const m = l && (l.get(Number(d.n)) || (l.size === 1 ? l.values().next().value : null));
      if(m) return Object.assign({}, s, {dataRef:Object.assign({}, d, {matchId:m.id})});
    }
    if(!tafelTypen.has(d.type)) return s;
    return Object.assign({}, s, {dataRef:Object.assign({}, d,
      {causalKey:'tafel:' + tagKey(s.when)})});
  });
  let aus = _consolidateStoriesLegacy(vorbereitet);

  // ── Die Karte, die den Tag zusammenfasst ──────────────────────────
  // Der Spieler des Tages; an einem Tag ohne ihn die Ehrung des Tages
  // (`tagesehrung_<Tag>`, `voll`). Was den Tag sonst noch zusammenfasst,
  // steht auf ihr und reist mit (`memberIds`), verloren geht nichts [§C33].
  const tagKarte = () => {
    const je = new Map();
    aus.forEach(s => { const d = s.dataRef || {};
      if(d.type === 'potd') je.set(d.dayKey || tagKey(s.when), s); });
    aus.forEach(s => { const d = s.dataRef || {};
      if(d.type === 'ehrung' && d.periode === 'tag' && d.voll && d.tag && !je.has(d.tag)) je.set(d.tag, s); });
    return je;
  };
  const aufKarte = (dazu, weg) => {
    if(weg.size) aus = aus.filter(s => !weg.has(s.id)).map(s => {
      const z = dazu.get(s.id);
      if(!z) return s;
      const d = s.dataRef || {};
      return Object.assign({}, s, {dataRef:Object.assign({}, d, z.felder,
        {memberIds:[...new Set((d.memberIds || [s.id]).concat(z.ids))]})});
    });
  };

  // ── Der härteste Tag gehört zu der Karte des Tages ────────────────
  // „Harter Tag für Leo" stand als eigene rote Karte eine Minute unter dem
  // Spieler des Tages: dieselbe Frage, wer den Tag geprägt hat, einmal von
  // oben und einmal von unten, auf zwei Karten. Er steht als Gegenstück auf
  // der Karte des Tages und in deren Blatt. Gibt es keine, bleibt er, wie er
  // war.
  {
    const ziel = tagKarte();
    const weg = new Set(), dazu = new Map();
    aus.forEach(s => {
      const d = s.dataRef || {};
      if(d.type !== 'elo_swing' || !d.pid) return;
      const p = ziel.get(tagKey(s.when));
      if(!p || dazu.has(p.id)) return;
      const pd = p.dataRef || {};
      // Ist der Verlierer selbst der Spieler des Tages, ist es kein Gegenstück.
      if(pd.type === 'potd' && (pd.playerId === d.pid || (pd.playerIds || []).includes(d.pid))) return;
      weg.add(s.id);
      dazu.set(p.id, {ids:[s.id], felder:{gegenstueck:{id:s.id, pid:d.pid, delta:d.delta, title:s.title, desc:s.desc}}});
    });
    aufKarte(dazu, weg);
  }

  // ── Die Ehrungen eines Tages gehören zu der Karte des Tages ───────
  // Gespeichert liegen Ehrungen, die es so nicht mehr gibt: je Runde eine,
  // zwei Stunden nach ihrer letzten Partie, und je Tag eine dessen, was sein
  // Schluss vergab (`ehrung_tag_<Tag>`). Eine Zeile ändert sich nicht
  // [§C33]; abgemeldet stünden diese Auszeichnungen nirgends mehr. Sie gehen
  // deshalb hier in die Karte ihres Tages auf. Trägt die den ganzen Tag
  // (`ehrungVoll`, `voll`), reisen sie nur mit; ein gespeicherter Spieler des
  // Tages von vorher trägt höchstens den Schluss, und dann wird vereinigt
  // (`_ehrungVereint`). Ohne Karte des Tages bleiben sie, wie sie waren:
  // ihre Schlagzeile zählt, was sie zählen. Trägt eine größere Ehrung den
  // Tag (`_ehrungGroessere`) und steht sie da, zeigt auch ein gespeicherter
  // Spieler des Tages keine.
  {
    const ziel = tagKarte();
    const zeitraum = new Set(aus.filter(s => (s.dataRef || {}).type === 'ehrung' && /^ehrung_de[rs]_/.test(String(s.id)))
      .map(s => s.dataRef.periode + '|' + tagKey(new Date(s.when).getTime() - 3600000)));
    const quellen = new Map();
    aus.forEach(s => {
      const d = s.dataRef || {};
      if(d.type !== 'ehrung' || !Array.isArray(d.spieler) || (d.periode && d.periode !== 'tag')) return;
      const k = d.periode === 'tag' ? d.tag : tagKey(d.bis || s.when);
      const p = ziel.get(k);
      if(!p || p.id === s.id) return;
      (quellen.get(p.id) || quellen.set(p.id, []).get(p.id)).push(s);
    });
    const weg = new Set(), dazu = new Map();
    aus.forEach(p => {
      const l = quellen.get(p.id);
      if(!l) return;
      l.forEach(s => weg.add(s.id));
      const d = p.dataRef || {};
      const felder = {};
      if(d.type === 'potd' && !d.ehrungVoll){
        const tag = d.dayKey || tagKey(p.when), groesser = _ehrungGroessere(new Date(tag + 'T12:00:00').getTime());
        const schluss = Array.isArray(d.ehrung) ? d.ehrung
          : ((l.find(s => s.dataRef.periode === 'tag') || {}).dataRef || {}).spieler || [];
        felder.ehrung = groesser && zeitraum.has(groesser + '|' + tag) ? []
          : _ehrungVereint([schluss].concat(l.filter(s => !s.dataRef.periode).map(s => s.dataRef.spieler)));
      }
      dazu.set(p.id, {ids:l.map(s => s.id), felder});
    });
    aufKarte(dazu, weg);
  }

  // Der sichtbare Tages-Tafel-Eintrag sitzt immer beim neuesten enthaltenen
  // Wechsel. So ersetzt eine Aktualisierung die heutige Karte an der richtigen
  // Stelle im Feed; historische Tage bleiben unangetastet.
  aus = aus.map(s => {
    const d = (s && s.dataRef) || {};
    if(d.type !== 'sammel' || d.quelle !== 'tafel' || !Array.isArray(d.teile)) return s;
    const neu = d.teile.reduce((mx, t) => Math.max(mx, Number(t && t.ms) || 0), 0);
    return neu ? Object.assign({}, s, {when:new Date(neu)}) : s;
  }).sort(_storyFolge);
  _cache._snapshotConsolFrom = list;
  _cache._snapshotConsolVersion = _cache.version;
  _cache._snapshotConsolMatches = matches;
  _cache._snapshotConsolList = aus;
  return aus;
}

// Trotz des Namens der AKTIVE Hauptweg der Konsolidierung: _consolidateStories
// ruft ihn für jeden Bestand. „Legacy" meint, dass er auch Zeilen aus älteren
// Läufen ohne causalKey, matchId oder visual verstehen muss [§C33].
function _consolidateStoriesLegacy(list){
  if(!Array.isArray(list)) return [];
  if(_cache._consolFrom === list && Array.isArray(_cache._consolList)) return _cache._consolList;
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const fmtNames = arr => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' & ' + arr[arr.length - 1];
  // ── Was es genau EINMAL gibt ──────────────────────────────────────
  // Der Spieler des Tages, die Wochenkarte, die Monatschronik und der
  // Saison-Rückblick entstehen je Tag, Woche oder Monat genau einmal. Sie
  // können sich damit nicht wiederholen, und alle drei Regeln gegen
  // Wiederholung lassen sie deshalb in Ruhe: der Deckel je Sorte, der
  // Vergleich der Schlagzeilen und der Tagesdeckel [§C33]. Der Feed reicht
  // vierzehn Tage zurück; darin liegen sechs bis sieben Spieltage, und von
  // ihren Siegern standen gemessen zwei im Feed — vier Spieltage verloren
  // genau die Karte, die ihre Schlagzeile ist. Solange das Fenster sieben
  // Tage breit war, fiel das nicht auf: da passten zwei Sieger hinein.
  const TAG_PFLICHT = new Set(['potd', 'woche', 'season_recap',
    'chronik_frei', 'karriereende']);

  // ── Was eine Auszeichnung erzaehlt, erzaehlt das Ergebnis nicht ──
  // Der Generator laesst die Ergebnis-Karte weg, wenn eine Auszeichnung aus
  // genau dieser Partie denselben Fakt schon traegt: „Absoluter Sieger" IST
  // das 10:0. Die Regel stand nur dort, und damit galt sie nur fuer neue
  // Karten. Gemessen am 15.09. lag „Maxi und Henry gewinnen ohne Gegentor"
  // aus einem aelteren Lauf in der Datenbank, und weil der Generator diese
  // ID nicht mehr bildet, konnte sie auch niemand umschreiben: neben der
  // Breaking-Karte mit dem Band 10:0 stand eine zweite Karte mit demselben
  // Band, denselben vier Wappen und demselben Stand.
  //
  // Gefragt wird nach dem BESTAND, nicht nach dem Lauf: liegt die
  // Auszeichnung im Stapel, faellt das Ergebnis — liegt sie nicht darin
  // (eine gewoehnliche Auszeichnung bekommt nur an runden Marken eine eigene
  // Karte [§C33]), bleibt das Ergebnis die einzige Nachricht darueber.
  //
  // Gefallen ist dabei die KARTE. Seit jede Partie eine hat, fallen Ergebnis
  // und Auszeichnung ohnehin in dasselbe Buendel, und die Karte darf nicht
  // wegfallen — eine Partie hoert nicht auf, gespielt worden zu sein. Was
  // faellt, ist der ANLASS in der Schlagzeile: „Sieg ohne Gegentor und
  // Auszeichnung in einer Partie" nennt dasselbe zweimal, denn „Absoluter
  // Sieger" IST das 10:0.
  // „Zittersieg" heisst im Katalog `nail_biter` und ist auf „10:9 Sieg"
  // definiert — dasselbe wie der Ein-Tor-Krimi, nur mit anderem Namen. Er
  // fehlte in der Liste, und gemessen am 25.08. hiess die Karte damit
  // „Ein-Tor-Krimi und Auszeichnung in einer Partie", waehrend ihre Zeile
  // „Johannes holt ‚Zittersieg' zum 5. Mal · 10:9 Sieg" trug.
  const BADGE_DECKT = {zu_null:['perfect_win'], upset:['upset_king'],
                       krimi:['krimi', 'nerves_of_steel', 'nail_biter'],
                       eng:['krimi', 'nerves_of_steel']};
  const _badgeJeMatch = new Map();
  // ── Eine gewoehnliche Auszeichnung deckt genauso ──────────────────
  // Gesammelt wurde nur aus `badge_unlocked`, und eine gewoehnliche
  // Auszeichnung bekommt gar keine eigene Karte: sie steht in der
  // gemeinsamen Tageskarte `badge_marken` [§C33]. Genau ihre Marken sind es
  // aber, die das Ergebnis erzaehlen — „Zittersieg" ist das 10:9.
  const _merk = (mid, bid) => {
    if(!mid || !bid) return;
    const set = _badgeJeMatch.get(mid) || new Set();
    set.add(bid); _badgeJeMatch.set(mid, set);
  };
  list.forEach(s => {
    const d = (s && s.dataRef) || {};
    if(_storyAbgemeldet(s)) return;
    if(d.type === 'badge_unlocked') return _merk(d.matchId, d.badgeId);
    if(d.type === 'badge_marken')
      (d.marken || []).forEach(m => _merk(d.matchId || (m && m.matchId), m && m.badgeId));
  });
  const _ergebnisGedeckt = d => {
    const liste = BADGE_DECKT[d.resultKind];
    if(!liste || !d.matchId) return false;
    const set = _badgeJeMatch.get(d.matchId);
    return !!set && liste.some(b => set.has(b));
  };
  // Historische Fakten bleiben wahr. Spätere Zustände oder weitere Partien
  // dürfen einen bereits publizierten Snapshot nicht wieder entfernen.
  const src = ohneStoriesNachAbschied(list).filter(s => !_storyAbgemeldet(s) && !_storyWiderrufen(s));

  // Frühere Anzeige-Suppressions bleiben bewusst leer: veröffentlichte
  // Snapshot-Ereignisse werden weder durch ähnliche Badges noch durch spätere
  // Serien-, Rivalitäts- oder Matchzustände entfernt.
  const suppressMatch = new Set(), suppressPlayer = new Set();
  const rivalryMsPairs = new Set();
  const winStreakPids = new Set(), _serieMax = new Map();

  // Gruppierbare Typen (v8.8): mehrere gleichartige Per-Spieler-Stories werden
  // zu EINER Karte zusammengefasst ("3 Pechvögel: Maxi, Alex & Tom") statt
  // einzeln den Feed zu fluten. frag() liefert den Pro-Spieler-Schnipsel.
  const GROUPABLE = {
    loss_streak:     { label:'Pechvögel',           ic:'dropDouble', frag:s=>`${nameOf(s.dataRef.pid)} (${s.dataRef.streak})`, desc:f=>`Niederlagen nacheinander: ${f}.` },
    top_form:        { label:'über dem eigenen Schnitt', ic:'flame',  frag:s=>`${nameOf(s.dataRef.pid)} (+${s.dataRef.vorsprung ?? 0} Punkte)`, desc:f=>`Weiter vorn als sonst: ${f}.` },
    win_streak:      { label:'Serien im Gleichschritt', ic:'flame', frag:s=>`${nameOf(s.dataRef.pid)} (${s.dataRef.streak})`, desc:f=>`Siege in Folge: ${f}.` },
    jubilee:         { label:'Jubiläen',            ic:'calendar',   frag:s=>`${nameOf(s.dataRef.pid)} (${s.dataRef.total}.)`, desc:f=>`Runde Partien: ${f}.` },
    milestone_wins:  { label:'Sieg-Meilensteine',   ic:'medalTrio',  frag:s=>`${nameOf(s.dataRef.pid)} (${s.dataRef.milestone})`, desc:f=>`Erreicht: ${f}.` },
    milestone_goals: { label:'Game-Meilensteine',    ic:'thriller',   frag:s=>`${nameOf(s.dataRef.pid)} (${s.dataRef.milestone})`, desc:f=>`Erreicht: ${f}.` },
    milestone_elo:   { label:'Elo-Meilensteine',    ic:'peak',       frag:s=>`${nameOf(s.dataRef.pid)} (${s.dataRef.milestone})`, desc:f=>`Neue Bestwerte: ${f}.` },
  };

  const badgeGroups = new Map();
  const typeGroups = new Map();
  const slots = [];
  // Historische Doublettenlogik. Ambiente Fun Facts werden heute einmal um
  // 15:00 tageweise persistiert;
  // greift der Typ-Cooldown bei kaltem _cache._stories nicht (Generator läuft in
  // syncStoriesViaDb vor dem DB-Load), landet derselbe Fun Fact an mehreren
  // Slots/Tagen mit IDENTISCHEM Inhalt (z.B. „Leon thront an der Spitze", solange
  // die Elo gleich bleibt). Da Stories persistiert sind, hilft nur Display-seitige
  // Deduplizierung — sie wirkt auf bestehende UND neue Rows. list ist newest-first
  // → die JÜNGSTE Karte bleibt, ältere inhaltsgleiche entfallen. Gilt für
  // ungruppierte Stories (Gruppen dedupen bereits per Spieler/Match).
  // §C33 sagt: keine zwei Karten tragen dieselbe SCHLAGZEILE oder denselben
  // TEXT. Gemessen wurde bisher nur das Paar aus beidem, und damit rutschte
  // durch, was sich nur in einer Zahl im Fliesstext unterscheidet: „Martin
  // baut ‚Der Fels' aus" stand zweimal untereinander, einmal mit 151 und
  // einmal mit 152 Spielen. Zwei gleiche Schlagzeilen sind fuer den, der
  // scrollt, dieselbe Karte.
  // ── Eine Partie ist keine Aussage, sie wurde gespielt ──────────────
  // Jede der drei Sperren unten fragt, ob DIESELBE Nachricht schon dastand.
  // Fuer eine Partie gibt es die Frage nicht: sie hat stattgefunden, und wer
  // am Abend nachliest, will sie sehen. Gemessen trugen zwei Partien desselben
  // Tages wortgleich „X und Y setzen sich gegen A und B durch" — dieselben
  // vier Leute, dieselbe Siegchance, zwei Spiele —, und die zweite fiel am
  // Vergleich der Schlagzeilen weg. Von 52 Partien des Fensters standen
  // dadurch 24 in einer sichtbaren Karte.
  // Eine Sammelkarte ist eine Partie, sobald die Karte einer Partie darin
  // steckt — nicht erst, wenn das ganze Bündel eine `matchId` trägt. Bündelt
  // die Partie mit einer Meldung ohne Partie (eine Rivalität, der Countdown),
  // entsteht ein Bündel nach Minute ohne `matchId`; es zählte dann gegen den
  // Deckel je Sorte, der je Tag nur die ersten zwei behält, und die Partie
  // darin verschwand mit. Gemessen am 01.10.: fünf Partien von Leon, Leo,
  // Maxi und Jannik, und die um 15:08 stand nirgends im Feed, obwohl ihre
  // Karte in der Datenbank lag. Eine Partie hört nicht auf, gespielt worden
  // zu sein [§C33].
  const _istPartie = st => {
    const d = (st && st.dataRef) || {};
    if(d.type === 'spiel') return true;
    if(d.type !== 'sammel' || d.quelle !== 'spiel') return false;
    return !!d.matchId || (d.teile || []).some(t =>
      String((t && t.id) || '').indexOf('spiel_') === 0);
  };
  const seenContent = new Set();
  const seenTitel = new Set();
  // ── Dieselbe Aussage nicht dreimal in einer Woche ──────────────────
  // Zwei gleiche Schlagzeilen fängt `seenTitel` ab. Eine Aussage, deren ZAHL
  // sich mitbewegt, entkommt ihm: „Martin baut ‚Der Maßstab' aus" heißt nach
  // dem nächsten Sieg genauso, nur mit 74 statt 73 Prozent, und bekommt damit
  // eine eigene ID, einen eigenen Titel und eine eigene Karte. Gemessen
  // standen so vier davon nebeneinander im Feed.
  // Der Schlüssel ist die Aussage selbst: Was für ein Ereignis, über wen, und
  // worum es geht (Rekord, Auszeichnung, Duell). Wer den Rekord übernimmt,
  // trägt andere Spieler im Schlüssel — eine Übernahme bleibt also Nachricht,
  // auch am Tag nach einer anderen.
  // ── Wer zuerst dastand, bleibt ─────────────────────────────────────
  // `src` steht von neu nach alt, und die Schleife lief so: damit ueberlebte
  // die JUENGSTE Karte, und eine aeltere gleiche fiel weg. Eine Karte, die
  // um 11 Uhr im Feed stand, verschwand dadurch um 14 Uhr, weil nach der
  // naechsten Partie dieselbe Aussage noch einmal entstand — gemessen
  // ersetzte ein Spieltag so nach jeder Partie einen Teil seiner Meldungen.
  // Eine Nachricht ist aber kein Zustand: sie gehoert ihrem Zeitpunkt.
  // Entschieden wird deshalb in der Reihenfolge, in der die Nachrichten
  // entstanden sind — die erste bleibt, die spaetere Wiederholung faellt —,
  // und am Ende steht die Liste wieder von neu nach alt.
  const _sperreMs = 0;
  // Was es je Tag, Woche oder Monat genau einmal gibt, kann sich gar nicht
  // wiederholen — und Breaking darf an keiner Sperre scheitern [§C33]. Die
  // ambienten Karten hängen ohnehin an ihrem Slot.
  // `spiel` gehoert dazu: eine Partie ist kein Satz, den man schon gelesen
  // hat, sondern ein Ereignis mit eigener Uhrzeit.
  // Die Runde fasst ihre Partien zusammen wie der Spieler des Tages seinen
  // Tag: es gibt sie je Runde genau einmal, also wiederholt sie nichts.
  const _OHNE_SPERRE = new Set(['ambient', 'sammel', 'season_endgame', 'spiel',
                                'potd', 'woche', 'season_recap', 'runde',
                                'ehrung', 'karriereende']);
  const _aussage = st => {
    const d = (st && st.dataRef) || {};
    const typ = d.type || '';
    if(!typ || _OHNE_SPERRE.has(typ)) return null;
    // ── Breaking scheitert an keiner Sperre ──────────────────────────
    // Der Schluessel sortiert die Beteiligten, damit dieselben zwei Halter
    // in anderer Reihenfolge nicht als Wechsel gelten. Bei einem gerichteten
    // Ereignis dreht das die Aussage um: „Maxi verdraengt Martin" und
    // „Martin verdraengt Maxi" tragen dieselben zwei Namen. Gemessen wechselte
    // die Spitze am 14.09. zweimal und am 15.09. erneut, und von den drei
    // Breaking-Karten blieb genau eine stehen — die Sperrfrist hielt die
    // anderen fuer Wiederholungen derselben Aussage.
    try { if(_isBreaking(st)) return null; } catch(e){}
    let ids = [];
    try { ids = _newsPids(st) || []; } catch(e){}
    const sache = d.rekordId || d.badgeId || d.disziplinId || d.titleId || d.titel || '';
    return typ + '|' + ids.slice().sort().join(',') + '|' + sache;
  };
  const _zuletzt = new Map();
  // Was der Vergleich der Schlagzeilen wegwirft. Ein Tag, an dem gespielt
  // wurde und der danach keine einzige Karte mehr traegt, holt daraus seine
  // staerkste zurueck: dieselbe Schlagzeile unter zwei verschiedenen
  // Tagesköpfen ist erlaubt — jede nennt im Text ihr eigenes Datum, und die
  // Ausnahme gilt fuer die Pflichtkarten schon lange [§C33]. Ein leerer
  // Spieltag ist nicht erlaubt: gemessen stand der 13.08. mit einer einzigen
  // Karte im Feed und der 19.08. mit keiner, obwohl an beiden gespielt wurde.
  const verworfen = [];
  // Von alt nach neu: nur so haengt die Entscheidung ueber eine Karte allein
  // an dem, was VOR ihr dastand, und eine spaetere Partie kann sie nicht
  // mehr aus dem Feed nehmen. Bei gleichem Zeitpunkt bleibt die Reihenfolge
  // der Liste — die Liste umzudrehen vertauschte auch die Karten derselben
  // Minute, und damit nannte eine Sammelkarte ihre drei Namen verkehrt.
  const _srcAlt = src;
  for(const s of _srcAlt){
    const d = s.dataRef || {};
    // v9.4: allgemeine Rivalitäts-Story entfällt, wenn dasselbe Paar bereits
    // eine (spezifischere) Meilenstein-Story hat.
    if(d.type === 'rivalry' && d.a && d.b && rivalryMsPairs.has(paarKey(d.a, d.b))) continue;
    // v9.5: Top-Form-Story entfällt für Spieler, die ohnehin schon eine
    // (konkretere) „Siege in Folge"-Story haben — sonst steht dieselbe heiße
    // Phase doppelt im Feed.
    if(d.type === 'top_form' && d.pid && winStreakPids.has(d.pid + '|' + tagKey(s.when))) continue;
    // Nur die laengste Marke des Tages: die kuerzere ist in ihr enthalten,
    // und die Gruppe „Serien im Gleichschritt" entsteht aus genau diesen
    // Mitgliedern — eine Grenze hier raeumt Einzelkarte und Gruppe zugleich.
    if(d.type === 'win_streak' && d.pid
       && (Number(d.streak) || 0)
          < (_serieMax.get(d.pid + '|' + (d.lauf || tagKey(s.when))) || 0)) continue;
    if(d.type === 'badge_unlocked' && d.badgeId){
      if(d.matchId && suppressMatch.has(d.badgeId + '|' + d.matchId)) continue;
      if(d.playerId && suppressPlayer.has(d.badgeId + '|' + d.playerId)) continue;
      const gk = d.badgeId + '|' + (d.matchId || '');
      let g = badgeGroups.get(gk);
      if(!g){ g = { rep: s, pids: [], seen: new Set(), members:[] }; badgeGroups.set(gk, g); slots.push({ b: gk }); }
      g.members.push(s);
      if(!g.seen.has(d.playerId)){ g.seen.add(d.playerId); g.pids.push(d.playerId); }
    } else if(GROUPABLE[d.type] && d.pid){
      // Ereignisse verschiedener Tage sind verschiedene Geschichten. Die
      // alte globale Gruppe machte aus allen Serienmarken des 14-Tage-Fensters
      // eine einzige Karte und ließ historische 5er-Serien so verschwinden.
      // Trägt die Story eine Partie, gruppieren nur Auslöser dieser Partie;
      // Live-Zustände ohne Matchbezug bleiben je Tag zusammen.
      const gk = d.type + '|' + (d.matchId || tagKey(s.when));
      let g = typeGroups.get(gk);
      if(!g){ g = { type:d.type, rep: s, members: [], seen: new Set() }; typeGroups.set(gk, g); slots.push({ t: gk }); }
      // Pro Spieler nur EINMAL. Gelesen wird von alt nach neu, also bleibt
      // der erste Stand — dieselbe Regel wie fuer die drei Sperren darunter:
      // was einmal dastand, bleibt stehen. Verhindert Duplikate wie
      // „Maxi, Maxi, Alex … Alex".
      g.seen.add(d.pid); g.members.push(s);
    } else {
      // Breaking scheitert an keiner Sperre [§C33] — auch nicht am
      // Doublettenfilter. Zwei Wechsel der Tabellenspitze sind zwei
      // Ereignisse, selbst wenn der Text derselbe waere.
      // Gleicher Wortlaut ist bei zwei verschiedenen IDs kein Duplikat:
      // beide Ereignisse haben stattgefunden und bleiben im Snapshot-Feed.
      let _brkFrei = true;
      if(_istPartie(s)) _brkFrei = true;
      const ck = (s.title || '') + '\u0000' + (s.desc || '');
      if(!_brkFrei && seenContent.has(ck)){ verworfen.push(s); continue; }
      const tk = String(s.title || '').trim();
      // Was es je Tag, Woche oder Monat genau einmal gibt, darf dieselbe
      // Schlagzeile zweimal tragen: sie steht unter zwei verschiedenen
      // Tagesköpfen und nennt im Text ihr eigenes Datum. Gemessen gewann
      // Martin den 02.09. mit 3 von 3 und den 08.09. mit 5 von 7 — zwei
      // Spieltage, zwei Ergebnisse, und die ältere Karte fiel weg, weil
      // beide „Martin ist Spieler des Tages" heißen. Eine echte Doublette
      // fängt der volle Vergleich aus Schlagzeile UND Text weiter ab.
      // Dasselbe gilt fuer die gleiche Schlagzeile: die Tabellenspitze
      // wechselte am 14.09. zu Martin und am 15.09. zurueck zu Maxi, und
      // beide Karten heissen „Neuer Spitzenreiter: Maxi". Zwei Wechsel sind
      // zwei Ereignisse, und sie stehen unter zwei Tageskoepfen.
      if(tk && !_brkFrei && !TAG_PFLICHT.has(d.type) && seenTitel.has(tk)){ verworfen.push(s); continue; }
      const ak = _sperreMs ? _aussage(s) : null;
      if(ak){
        const vorherMs = _zuletzt.get(ak);
        const msJetzt = new Date(s.when).getTime();
        // Die Sperrfrist gehoert NICHT in die Rueckholung: sie sagt gerade,
        // dass diese Aussage gestern schon erzaehlt wurde, und ein Tag ohne
        // neue Aussage ist ein Tag ohne Nachricht.
        if(vorherMs != null && Math.abs(vorherMs - msJetzt) < _sperreMs) continue;
        _zuletzt.set(ak, msJetzt);
      }
      seenContent.add(ck);
      seenTitel.add(tk);
      slots.push({ s });
    }
  }

  const result = [];
  for(const slot of slots){
    if(slot.s){ result.push(slot.s); continue; }
    if(slot.b){
      const g = badgeGroups.get(slot.b);
      if(g.pids.length <= 1){ result.push(g.rep); continue; }
      const rep = g.rep, d = rep.dataRef || {};
      const names = g.pids.map(nameOf).sort((a, b) => a.localeCompare(b, 'de'));
      const bn = d.badgeName || (rep.title.includes(': ') ? rep.title.split(': ').slice(1).join(': ') : 'Badge');
      result.push(Object.assign({}, rep, {
        id: 'badgegrp_' + d.badgeId + '_' + (d.matchId || ''),
        title: `${fmtNames(names)}: ${bn}`,
        dataRef: Object.assign({}, d, { playerIds: g.pids, memberIds:g.members.map(m => m.id) })
      }));
      continue;
    }
    if(slot.t){
      const g = typeGroups.get(slot.t);
      if(g.members.length <= 1){ result.push(g.rep); continue; } // Einzel: Original unverändert
      const cfg = GROUPABLE[g.type], rep = g.rep;
      const members = g.members.slice().sort((a, b) => (b.prio||0) - (a.prio||0));
      const pids = members.map(m => (m.dataRef||{}).pid).filter(Boolean);
      const names = pids.map(nameOf);
      const frags = members.map(m => cfg.frag(m));
      const when = members.reduce((mx, m) => (m.when > mx ? m.when : mx), members[0].when);
      const prio = members.reduce((mx, m) => ((m.prio||0) > mx ? (m.prio||0) : mx), 0);
      result.push({
        id: 'grp_' + slot.t.replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + pids.slice().sort().join('-'),
        cat: rep.cat,
        ic: cfg.ic || rep.ic,
        title: `${members.length} ${cfg.label}: ${fmtNames(names)}`,
        desc: cfg.desc(frags.join(', ')),
        when, prio,
         dataRef: { type:'group', sub: g.type,
                    matchId:(rep.dataRef||{}).matchId || null,
                    playerIds: pids, frags,
                    memberIds: members.map(m => m.id),
                    members: members.map(m => Object.assign({}, m.dataRef || {}, {
                      id: m.id,
                      type: (m.dataRef || {}).type,
                      pid: (m.dataRef || {}).pid || null,
                      playerIds: (m.dataRef || {}).playerIds || [],
                      streak: (m.dataRef || {}).streak,
                      title: m.title,
                      desc: m.desc
                    })) }
       });
      continue;
    }
  }
  // ── Was im selben Moment passiert, kommt in eine Karte ────────────
  // Gemessen trug ein Spieltag zehn Karten, vier davon in derselben Minute:
  // ein Rekordwechsel, eine Insignium-Stufe und zwei Rivalitäten standen als
  // Fremde nebeneinander, und zwei Spieler bekamen im selben Spiel dieselbe
  // Auszeichnung auf zwei Karten. Zusammengelegt wird nur, wenn alle drei
  // Bedingungen zutreffen:
  //   1. derselbe Moment — dieselbe Partie oder dieselbe Minute,
  //   2. dieselbe Art — Spieltags-Ereignisse untereinander, Tafel-Ereignisse
  //      untereinander; ein Fun Fact gehört nie dazu, der stand gestern
  //      genauso da,
  //   3. ein gemeinsamer Satz — er wird aus allen Teilen formuliert; keine
  //      Einzelmeldung wird zum Kopf des gesamten Bundles.
  // Eine verbundene Kette bleibt vollständig. Die Karte darf länger werden,
  // aber kein fünftes Ereignis fällt wieder als scheinbar unabhängige Karte
  // daneben. Breaking bleibt bei Spieltagsmeldungen einzeln; an der Ewigen
  // Tafel reist seine Dringlichkeit mit dem vollständigen Bundle.
  // Gebuendelt wird nach der MINUTE, nicht nach der Partie-ID. Die Regel hiess
  // „dieselbe Partie", und genau ein Story-Typ trug ueberhaupt eine
  // `matchId`: `badge_unlocked`. Alles andere, was im selben Moment entsteht
  // — eine Pleitenserie, eine Duo-Serie, ein Rivalitaets-Meilenstein — fiel
  // durch und stand als eigene Karte daneben. Gemessen: vier Minuten mit je
  // zwei bis drei Karten, die nichts zusammenhielt. „Anton findet gerade kein
  // Mittel" und „Anton: Angstgegner" standen um 16:21 untereinander.
  //
  // Genau eine Minute der ganzen Ligageschichte traegt zwei Partien; dort
  // bedeutet die Minute dasselbe wie der Moment.
  const SAMMEL_SPIEL = new Set(['badge_unlocked','badge_marken','streak_killer',
    'giant_slayer','group',
    'top_clash','milestone_wins','milestone_goals','milestone_elo','jubilee',
    'loss_streak','win_streak','top_form','team_streak','team_loss_streak',
    'rivalry','rivalry_milestone','spiel',
    // Der Spitzenwechsel und der Serien-Rekord der Liga tragen eine Partie und
    // gehoeren damit zu ihr: „Neuer Spitzenreiter" stand mit dem Band 10:0 im
    // Feed und „Absoluter Sieger" fuer genau dieses 10:0 als zweite Karte
    // daneben — dasselbe Spiel, dieselben Wappen, derselbe Stand [§C33].
    'lead_change','streak_record',
    // Was in einer einzelnen Partie passiert, gehört an ihre Karte und
    // nirgends sonst hin.
    'fluch','duo_jubilaeum','revanche','tagesmarathon','elo_hoch','tabellensprung',
    'duell_kippt','woche_spitze','tag_plus','tag_hoehe','monat_gewinn','monat_halb','partner_best',
    'pleiten_ende','duo_pleiten_ende','rueckkehr']);
  const SAMMEL_TAFEL = new Set(['rekord_erstmals','rekord_geholt','rekord_gesteigert',
    'chronik_geholt']);
  const _minKey = w => { const d = new Date(w); return tagKey(w)+'-'+d.getHours()+'-'+d.getMinutes(); };
  // ── Was ein Spieler holen kann ─────────────────────────────────────
  // Die Bündelung nach Moment und Subjekt kannte den INHALT nicht: sie legte
  // zusammen, was denselben Zeitstempel und einen gemeinsamen Namen trug, und
  // borgte sich Rubrik und Schlagzeile der stärksten Zeile. An der Ewigen
  // Tafel gruppierte sie sogar den ganzen TAG ohne jedes Subjekt — gemessen
  // standen dort vier Rekordwechsel dreier Spieler in einer Karte, und die
  // drei, die im selben Moment dieselbe Insignium-Stufe erreichten, fielen
  // über die vier Zeilen hinaus und standen einzeln daneben.
  //
  // Zwei Fragen kommen deshalb VOR der alten Bündelung: Hat EIN Spieler
  // mehreres auf einmal geholt? Haben MEHRERE dasselbe geholt? Beides ist
  // eine eigene Nachricht mit eigener Kartenform, und beides trägt jede
  // beteiligte Meldung — gebündelt, aber vollständig [§C33].
  //
  // `art` ist die Sorte des Erfolgs (drei Rekordmeldungen sind eine Sorte),
  // die Wendung dahinter baut die Schlagzeile. Sie steht je Sorte mit ihrem
  // eigenen VERB da: „holt einen Liga-Rekord und feiert ein Jubiläum" liest
  // sich richtig, „holt einen Liga-Rekord und ein Jubiläum" nicht.
  // `rekord_gesteigert` fehlt nur auf der persönlichen Erfolgsachse: Ein
  // Ausbau gehört weiterhin vollständig in den Tafel-Moment, ist aber kein
  // eigener, mehrfach „geholter" Laufbahnerfolg.
  const ERFOLG_ART = {
    rekord_erstmals:  'rekord',   rekord_geholt:    'rekord',
    chronik_geholt:   'chronik',
    insignium_stufe:  'ins',      badge_unlocked:   'badge',
    milestone_wins:   'marke',    milestone_goals:  'marke',
    milestone_elo:    'marke',    jubilee:          'jubilaeum'
  };
  // Verb und Gegenstand stehen getrennt, weil zwei Sorten mit demselben Verb
  // es nur EINMAL nennen: „holt einen Liga-Rekord und eine Auszeichnung" ist
  // die Zeile, „holt einen Liga-Rekord und holt eine Auszeichnung" war sie.
  const ERFOLG_WORT = {
    rekord:    {verb:'holt',     ein:'einen Liga-Rekord',           viele:n => `${n} Liga-Rekorde`},
    chronik:   {verb:'holt',     ein:'eine Monatschronik',          viele:n => `${n} Monatschroniken`},
    badge:     {verb:'holt',     ein:'eine Auszeichnung',           viele:n => `${n} Auszeichnungen`},
    ins:       {verb:'erreicht', ein:'die nächste Insignium-Stufe', viele:n => `${n} Insignium-Stufen`},
    marke:     {verb:'erreicht', ein:'einen Meilenstein',           viele:n => `${n} Meilensteine`},
    jubilaeum: {verb:'feiert',   ein:'ein Jubiläum',                viele:n => `${n} Jubiläen`}
  };
  // ── Mehrere Spieler, derselbe Erfolg ───────────────────────────────
  // Nur die Typen, die überhaupt kollidieren können: einer je Spieler, und
  // die Sache ist dieselbe. Liga-Rekord und Monatschronik fehlen hier, weil
  // sie ihre Mithalter schon in EINER Karte tragen („Maxi, Leo und Julian
  // übernehmen") — eine zweite Bündelung darüber wäre ein zweites Bauteil
  // für dieselbe Aussage [§C27]. Die Auszeichnung fehlt aus demselben Grund:
  // dieselbe Auszeichnung in derselben Partie fasst `badgeGroups` zusammen.
  //
  // Die Schlagzeile nennt ALLE Beteiligten und die Sache; der Satz sagt, wie
  // viele es zugleich sind. Ihn vom Kopf zu borgen wäre falsch: „385 Prestige
  // zusammen" gehört einem der drei, und die Karte handelt von allen.
  // Der Satz sagt schlicht, dass es dieselbe Partie war. Er hieß „Ein Sieg
  // mit mehrfachem Nachhall" und „Dieser Treffer hallt in drei Laufbahnen
  // nach" — Werbesprache, und „alle zwei" ist kein Deutsch [§7].
  const _alleN = n => n === 2 ? 'Beide' : 'Alle ' + _zahlwortDe(n);
  const SAMMEL_ERFOLG = {
    insignium_stufe: {
      sache: d => 'ins|' + d.stufe,
      titel: (nm, d) => `${nm} tragen jetzt den ${d.stufeName || 'Reif'}`,
      satz:  n => `${_alleN(n)} steigen zugleich auf.`,
      zeile: (nm, d) => `${nm}: ${d.punkte} Prestige`
    },
    jubilee: {
      sache: d => 'jub|' + (d.total || ''),
      titel: (nm, d) => `${nm} feiern die ${d.total}. Partie`,
      satz:  (n, d) => `${_alleN(n)} erreichen die ${d.total} in derselben Partie.`,
      zeile: nm => nm
    },
    milestone_wins: {
      sache: d => 'mw|' + (d.milestone || ''),
      titel: (nm, d) => `${nm} feiern den ${parseInt(d.milestone, 10)}. Sieg`,
      satz:  n => `${_alleN(n)} erreichen die Marke mit demselben Sieg.`,
      zeile: nm => nm
    },
    milestone_goals: {
      sache: d => 'mg|' + (d.milestone || ''),
      titel: (nm, d) => `${nm} feiern das ${parseInt(d.milestone, 10)}. gewonnene Game`,
      satz:  n => `${_alleN(n)} erreichen die Marke in derselben Partie.`,
      zeile: nm => nm
    },
    milestone_elo: {
      sache: d => 'me|' + (d.mark || d.milestone || ''),
      titel: (nm, d) => `${nm} knacken ${d.mark || parseInt(d.milestone, 10)} Elo`,
      satz:  n => `${_alleN(n)} erreichen die Marke in derselben Partie.`,
      zeile: nm => nm
    }
  };
  // Die Schlagzeile der Spieler-Karte. Sie nennt jede Sorte mit ihrer Zahl,
  // in der Reihenfolge der Wertigkeit — „Maxi holt zwei Monatschroniken",
  // „Jonas holt einen Liga-Rekord und erreicht die nächste Insignium-Stufe".
  // Vorher borgte die Karte die Schlagzeile ihrer stärksten Zeile, und damit
  // stand über einer Karte mit zwei Chroniken der Name der einen.
  const _spielerTitel = (name, teile) => {
    const zahl = {}, folge = [];
    teile.forEach(t => {
      const a = ERFOLG_ART[(t.dataRef || {}).type];
      if(!a) return;
      if(zahl[a] == null){ zahl[a] = 0; folge.push(a); }
      zahl[a]++;
    });
    // Die Gegenstände stehen in EINER Aufzählung, und das Verb nur da, wo es
    // wechselt: „holt einen Liga-Rekord, eine Auszeichnung und feiert ein
    // Jubiläum". Je Verb eine eigene Aufzählung ergab zwei „und" in einer
    // Zeile („holt einen Liga-Rekord und eine Auszeichnung und feiert ein
    // Jubiläum"). Die Reihenfolge ist die Wertigkeit: `teile` steht nach
    // `prio` sortiert.
    const stuecke = []; let zuletzt = '';
    folge.forEach(a => {
      const w = ERFOLG_WORT[a];
      if(!w) return;
      const gegenstand = zahl[a] === 1 ? w.ein : w.viele(_zahlwortDe(zahl[a]));
      stuecke.push(w.verb === zuletzt ? gegenstand : w.verb + ' ' + gegenstand);
      zuletzt = w.verb;
    });
    return name + ' ' + _namenListe(stuecke);
  };
  // Keine zwei Zeilen mit derselben Schlagzeile. „Martin baut ‚Der Fels' aus"
  // stand VIERMAL untereinander in einer Sammelkarte, jedes Mal mit demselben
  // Wert und nur einer anderen Spielzahl im Fliesstext. Die Buendelung soll
  // den Moment zusammenfassen, nicht dieselbe Meldung vervierfachen.
  const _sammelZeile = (g, st) => {
    const tk = String(st.title || '').trim();
    if(tk) g.titel.add(tk);
    // Vollständigkeit ist die Aussage des Bundles. Eine fünfte Spur zu
    // verschweigen hieße, dieselbe Partie wieder auf zwei Karten zu zerlegen.
    if(g.teile.length < (g.max || Infinity)) g.teile.push(st);
  };
  // ── Wer einzeln bleibt ─────────────────────────────────────────────
  // Zwei Sorten gehen nie in ein Buendel: Breaking, weil ein erstmals
  // vergebener Liga-Rekord nicht als vierte Zeile enden soll, und ein
  // SELTENES oder LEGENDAERES Badge. „Nerven aus Stahl" (drei Zittersiege
  // in Folge) stand als Zeile unter „Johannes und Anton verlieren zusammen
  // alles" — zwei fremde Spieler, und das Seltenere von beiden im
  // Kleingedruckten.
  const _sammelEinzeln = (st, d) => {
    try { if(_isBreaking(st)) return true; } catch(e){}
    // Eine LEGENDAERE Monatschronik bleibt aus demselben Grund einzeln wie
    // eine legendaere Auszeichnung: „Auf dem Thron" ist der Grund, warum
    // jemand die App oeffnet, und steht nicht als vierte Zeile unter dem
    // Rekord-Ausbau zweier anderer [§C33].
    if(d.type === 'chronik_geholt' && d.chronKlasse === 'legendaer') return true;
    return d.type === 'badge_unlocked'
        && (d.rarity === 'rare' || d.rarity === 'legendary');
  };
  const sammelGruppen = new Map();
  // Die Minute allein reicht nicht. Gebuendelt wird, was denselben Moment UND
  // dasselbe SUBJEKT teilt: „Leon und Maxi gewinnen zusammen alles" trug
  // „Leo: Angstgegner" als zweite Zeile, und Leo spielte in dieser Partie gar
  // nicht mit. Eine Karte, die von zwei fremden Ereignissen erzaehlt, ist
  // keine Zusammenfassung, sondern eine Verwechslung.
  //
  // Innerhalb einer Minute bilden die Beteiligten die Gruppen: wer einen
  // Spieler mit einer bestehenden Gruppe teilt, kommt dazu und zieht die
  // Gruppen zusammen, die er verbindet. Mehr als vier Karten hat eine Minute
  // nie, die Verschmelzung kostet also nichts.
  const spielMinuten = new Map();
  const _pidsVon = st => { try { return _newsPids(st) || []; } catch(e){ return []; } };
  // Die Ewige Tafel wird zuerst als eigener Ereignisstrom gebündelt. Alle
  // Änderungen mit derselben Partie ODER derselben Minute gehören in eine
  // Karte, auch wenn darunter ein erstmals vergebener Rekord oder eine
  // legendäre Chronik liegt. Diese Ausnahmen blieben bisher einzeln stehen
  // und erzeugten genau die Tafel-Kaskaden neben der Sammelkarte.
  //
  // Zwei Schlüssel können eine Kette bilden (A teilt die Partie mit B, B die
  // Minute mit C). Union-Find macht daraus zuverlässig ein Ereignis, ohne
  // den ganzen Tag künstlich zusammenzukleben. Alte DB-Zeilen ohne matchId
  // werden weiterhin über ihren fachlichen Zeitpunkt korrekt erfasst.
  const _tafelAchse = new Set();
  const _tafelKandidaten = result.map((st, idx) => ({st, idx, d:(st && st.dataRef) || {}}))
    .filter(x => SAMMEL_TAFEL.has(x.d.type));
  if(_tafelKandidaten.length > 1){
    const eltern = _tafelKandidaten.map((_, i) => i);
    const finde = i => { while(eltern[i] !== i){ eltern[i] = eltern[eltern[i]]; i = eltern[i]; } return i; };
    const vereinige = (a, b) => { a = finde(a); b = finde(b); if(a !== b) eltern[b] = a; };
    // ── Der Grund steht in der Karte, nicht in der Uhrzeit ──────────
    // Partie und Minute sind Stellvertreter fuer „gehoert zusammen", und als
    // Stellvertreter sind sie beides: zu fein und zu grob. Zu fein, weil ein
    // Rekord um 11:40 und eine Insignium-Stufe um 14:12 zum selben Spieltag
    // gehoeren und trotzdem als zwei Tafel-Karten untereinander standen. Zu
    // grob, weil alle Rekord-Karten eines Tages denselben Zeitstempel tragen
    // und damit auch die der gleitenden Fenster mit hineinfielen — die
    // erzaehlen etwas anderes, ihr Wert bewegt sich auch, wenn hinten ein
    // Ergebnis herausfaellt [§C35]. Wo der Generator den Grund mitgibt
    // (`causalKey`, [§11.0e]), entscheidet er allein; nur Zeilen aus
    // aelteren Laeufen ohne diese Angabe finden weiter ueber Partie oder
    // Minute zusammen.
    const jeMinute = new Map(), jeMatch = new Map(), jeGrund = new Map();
    _tafelKandidaten.forEach((x, i) => {
      if(x.d.causalKey){
        if(jeGrund.has(x.d.causalKey)) vereinige(i, jeGrund.get(x.d.causalKey));
        else jeGrund.set(x.d.causalKey, i);
        return;
      }
      const mk = _minKey(x.st.when);
      if(jeMinute.has(mk)) vereinige(i, jeMinute.get(mk)); else jeMinute.set(mk, i);
      if(x.d.matchId){
        if(jeMatch.has(x.d.matchId)) vereinige(i, jeMatch.get(x.d.matchId));
        else jeMatch.set(x.d.matchId, i);
      }
    });
    const komponenten = new Map();
    _tafelKandidaten.forEach((x, i) => {
      const k = finde(i), l = komponenten.get(k) || [];
      l.push(x); komponenten.set(k, l);
    });
    komponenten.forEach(l => {
      if(l.length < 2) return;
      // ── Der Schluessel ist der Grund, nicht das erste Mitglied ──
      // Er war die alphabetisch erste Mitglieds-ID, und damit wechselte die
      // Karte ihre Identitaet, sobald im naechsten Spiel eine Aenderung mit
      // kleinerer ID dazukam: der Leser sah nicht dieselbe Karte wachsen,
      // sondern eine neue an ihrer Stelle — und die gelesene war weg.
      // Gemessen am 28.09. ergaben drei Partien drei verschiedene
      // Tafel-Karten. Der Grund (`causalKey`) gilt fuer den ganzen Spieltag
      // [§11.0e]; nur Zeilen aus aelteren Laeufen haben keinen.
      const gruende = [...new Set(l.map(x => String(x.d.causalKey || '')))];
      const ident = (gruende.length === 1 && gruende[0])
        ? gruende[0] : l.map(x => String(x.st.id || '')).sort()[0];
      const key = 'tafel|moment|' + ident;
      // ── Die dauerhafte Tafel und die kurze Strecke sind zwei Karten ──
      // Ein Rekord auf einem gleitenden Fenster erzaehlt etwas anderes als
      // eine Laufbahn: sein Wert bewegt sich auch, wenn hinten ein schwaches
      // Ergebnis herausfaellt, und deshalb meldet er kein „ausgebaut"
      // [§C35]. In einer Karte mit den dauerhaften Rekorden verschwand
      // dieser Unterschied. Welche Achse eine Gruppe traegt, sagt ihr Grund;
      // eine Gruppe ohne Grund (Zeilen aus aelteren Laeufen) bleibt die
      // dauerhafte Tafel.
      const istFormGruppe = l.every(x => String(x.d.causalKey || '').indexOf('form:') === 0);
      const g = {key, art: istFormGruppe ? 'form' : 'tafel',
                 teile:[], titel:new Set(), max:Infinity,
                 erster:l.reduce((n, x) => Math.min(n, x.idx), l[0].idx)};
      sammelGruppen.set(key, g);
      l.slice().sort((a, b) => a.idx - b.idx).forEach(x => {
        _tafelAchse.add(x.st.id);
        _sammelZeile(g, x.st);
      });
    });
  }
  // ── Zuerst der Erfolg, dann der Spieler, dann der Rest ─────────────
  // Die Reihenfolge ist nicht beliebig. Ein Erfolg, den mehrere zugleich
  // erreichen, ist EINE Nachricht der Liga und darf nicht zerrissen werden:
  // liefe die Spieler-Achse zuerst, stünde „der Schildring" auf zwei Karten
  // — auf der gemeinsamen der beiden anderen und auf der persönlichen des
  // einen, der im selben Moment noch einen Rekord geholt hat. Genau diese
  // Doppelung verhindert §C33. Sein Rekord fällt dann in die alte Bündelung,
  // und dort gehören Rekorde ohnehin hin.
  //
  // Beide Achsen fassen nur, was ALLEIN dasteht (genau ein Beteiligter). Eine
  // Duo-Serie oder ein Duell gehört keinem Einzelnen und wäre auf einer Karte
  // über einen Spieler eine Behauptung über zwei.
  const einzel = [];
  result.forEach((st, idx) => {
    const d = (st && st.dataRef) || {};
    if(_tafelAchse.has(st.id)) return;
    if(_sammelEinzeln(st, d)) return;
    const pids = _pidsVon(st);
    // Was aus einer konkreten Partie kommt, gehoert zuerst und vollstaendig
    // an die Karte dieser Partie. Die persoenliche Erfolgsachse zog bisher
    // mehrere Meilensteine desselben Spielers vorher heraus; dadurch standen
    // sie auf einer zweiten Karte oder fehlten im Sammelband des Ergebnisses.
    // Nur Erfolge ohne Partie (etwa ein Monatsabschluss) brauchen diese Achse.
    if(pids.length === 1 && ERFOLG_ART[d.type] && !d.matchId)
      einzel.push({st, idx, d, pids});
  });
  const _achse = new Map();          // st.id → Gruppenschlüssel
  const _achseBauen = (praefix, schluessel, art) => {
    const topf = new Map();
    einzel.forEach(k => {
      if(_achse.has(k.st.id)) return;
      const sl = schluessel(k);
      if(sl == null) return;
      const key = praefix + '|' + _minKey(k.st.when) + '|' + sl;
      let l = topf.get(key);
      if(!l){ l = []; topf.set(key, l); }
      l.push(k);
    });
    topf.forEach((l, key) => {
      if(l.length < 2) return;
      const g = {key, art, teile:[], titel:new Set(), max: Infinity,
                 erster: l.reduce((mn, k) => Math.min(mn, k.idx), l[0].idx),
                 pid: l[0].pids[0]};
      sammelGruppen.set(key, g);
      l.slice().sort((a, b) => a.idx - b.idx).forEach(k => {
        _achse.set(k.st.id, key);
        _sammelZeile(g, k.st);
      });
    });
  };
  _achseBauen('erfolg', k => {
    const cfg = SAMMEL_ERFOLG[k.d.type];
    return cfg ? cfg.sache(k.d) : null;
  }, 'erfolg');
  _achseBauen('spieler', k => k.pids[0], 'spieler');
  // Zwei oder mehr Breaking-Meldungen einer Partie werden eine Karte. Sie
  // laeuft vor der Minuten-Buendelung, weil `_sammelEinzeln` genau diese
  // Meldungen dort heraushaelt — und nach den beiden Erfolgs-Achsen, damit
  // ein gemeinsam geholter Erfolg seine eigene Karte behaelt [§C33].
  // ── Eine Partie, eine Karte ────────────────────────────────────────
  // Gebuendelt wurde nach der MINUTE und den Beteiligten, und Breaking sowie
  // jede seltene Auszeichnung blieben ganz aussen vor. Damit zerfiel ein
  // Spiel in mehrere Karten, und der Tagesdeckel warf danach die meisten
  // weg: gemessen kamen von 52 Partien des Fensters 18 ueberhaupt in einer
  // sichtbaren Karte vor.
  //
  // Die Partie ist jetzt die Einheit. Alles, was in ihr passiert ist, haengt
  // sich an ihre Karte — auch Breaking, auch eine legendaere Auszeichnung,
  // auch eine Pleite: das Subjekt IST die Partie, und wer sie nachliest,
  // will wissen, was darin geschah. „Nicht als Kleingedrucktes unter einer
  // FREMDEN Schlagzeile" bleibt damit erfuellt, denn die Schlagzeile der
  // Karte ist die ihres staerksten Fakts.
  const _matchAchse = new Set();
  {
    const jeMatch = new Map();
    // Rot ist die Richtung einer Zeile, kein Grund fuer eine zweite Karte.
    // Durststrecke, Rivalitaet, Serie und Ergebnis derselben Partie reisen
    // gemeinsam; der Score steht einmal, jeder Anlass darunter einmal.
    result.forEach((st, idx) => {
      const d = (st && st.dataRef) || {};
      if(_tafelAchse.has(st.id) || _achse.has(st.id)) return;
      if(!d.matchId || !SAMMEL_SPIEL.has(d.type)) return;
      // ── Eine Partie, eine Karte ──────────────────────────────────
      // Eine seltene Auszeichnung blieb hier einzeln stehen, damit sie nicht
      // als Kleingedrucktes unter einer fremden Schlagzeile endet. Seit jede
      // Partie ihre Karte hat, steht sie damit aber NEBEN der Karte desselben
      // Spiels — gemessen zweimal dasselbe 10:4 mit denselben vier Wappen
      // untereinander, und wer scrollt, liest zwei Partien statt einer. Sie
      // reist deshalb mit und wird in der Zeile gekennzeichnet: die
      // Schlagzeile nennt ihre Klasse, das Sammelband traegt die Marke, und
      // im Blatt steht ihr Medaillon [§C33].
      let l = jeMatch.get(d.matchId);
      if(!l){ l = []; jeMatch.set(d.matchId, l); }
      l.push({st, idx});
    });
    jeMatch.forEach((l, mid) => {
      // Eine Partie ohne einen einzigen Fakt bleibt ihre eigene Karte: das
      // Ergebnis ist dann die ganze Nachricht.
      if(l.length < 2) return;
      const key = 'spiel|match|' + mid;
      const g = {key, art:'spiel', teile:[], titel:new Set(), max:Infinity,
                 erster: l.reduce((mn, k) => Math.min(mn, k.idx), l[0].idx)};
      sammelGruppen.set(key, g);
      l.slice().sort((a, b) => a.idx - b.idx).forEach(k => {
        _matchAchse.add(k.st.id);
        _sammelZeile(g, k.st);
      });
    });
  }
  // Was keine Partie nennt, findet weiter ueber die Minute und die
  // Beteiligten zusammen: Zeilen aus aelteren Laeufen tragen keine `matchId`,
  // und ein Formlauf oder ein Duell-Zaehler gehoert zu keinem einzelnen Spiel.
  result.forEach((st, idx) => {
    const d = (st && st.dataRef) || {};
    if(_tafelAchse.has(st.id)) return;
    if(_matchAchse.has(st.id)) return;
    if(_sammelEinzeln(st, d)) return;
    if(_achse.has(st.id)) return;    // steht schon auf einer der neuen Karten
    if(!SAMMEL_SPIEL.has(d.type)) return;
    // Zwei verschiedene Partien koennen denselben Minutenstempel haben.
    // Eine bekannte Match-ID darf nie wieder auf die Minutenachse fallen,
    // auch wenn die Partie nur genau eine Meldung besitzt.
    if(d.matchId) return;
    const mk = _minKey(st.when);
    let liste = spielMinuten.get(mk);
    if(!liste){ liste = []; spielMinuten.set(mk, liste); }
    liste.push({st, idx, pids: _pidsVon(st)});
  });
  spielMinuten.forEach((liste, mk) => {
    const gruppen = [];
    liste.forEach(k => {
      const treffer = gruppen.filter(g => k.pids.some(p => g.pids.has(p)));
      let ziel = treffer[0];
      if(!ziel){ ziel = {pids:new Set(), eintraege:[], erster:k.idx}; gruppen.push(ziel); }
      // Verbindet er zwei bestehende Gruppen, werden sie eine.
      treffer.slice(1).forEach(g => {
        g.pids.forEach(p => ziel.pids.add(p));
        g.eintraege.forEach(e => ziel.eintraege.push(e));
        if(g.erster < ziel.erster) ziel.erster = g.erster;
        gruppen.splice(gruppen.indexOf(g), 1);
      });
      k.pids.forEach(p => ziel.pids.add(p));
      ziel.eintraege.push(k);
    });
    gruppen.forEach(gr => {
      if(gr.eintraege.length < 2) return;
      // Der Schluessel kommt aus dem Inhalt, nicht aus der Position der
      // Gruppe in der Schleife: die verschiebt sich, sobald zwei Gruppen
      // verschmelzen, und dieselbe Karte bekam damit eine andere ID.
      const key = 'spiel|' + mk + '|'
        + gr.eintraege.map(e => String(e.st.id || '')).sort()[0];
      const g = {key, art:'spiel', teile:[], titel:new Set(), max:Infinity, erster: gr.erster};
      sammelGruppen.set(key, g);
      gr.eintraege.sort((a, b) => a.idx - b.idx).forEach(e => _sammelZeile(g, e.st));
    });
  });
  const inSammel = new Set();
  sammelGruppen.forEach(g => { if(g.teile.length >= 2) g.teile.forEach(st => inSammel.add(st.id)); });
  const gesammelt = [];
  const gesetzt = new Set();
  result.forEach(st => {
    if(!inSammel.has(st.id)){ gesammelt.push(st); return; }
    let g = null;
    sammelGruppen.forEach(x => { if(!g && x.teile.length >= 2 && x.teile.indexOf(st) >= 0) g = x; });
    if(!g){ gesammelt.push(st); return; }
    if(gesetzt.has(g.key)) return;
    gesetzt.add(g.key);
    // Sortiert nach `prio`: Bestmarke vor Monatschronik vor Insignium-Stufe
    // [§C33]. Und wenn die Karte BREAKING ist, steht der Anlass zuerst.
    // Gemessen erbte der Tafel-Moment des 17.09. sein Breaking von Martins
    // erstem Lorbeerreif — und genau diese Zeile stand als LETZTE von sechs
    // im Sammelband, weil die Insignium-Stufe die niedrigste `prio` der
    // Tafel-Familie hat. Die Karte brach damit die Spalte, trug einen roten
    // Balken und liess den Leser raten, wofuer. Eine Behauptung, die die
    // Karte selbst nicht belegt, ist keine Nachricht.
    const _brkT = t => { try { return !!_isBreaking(t); } catch(e){ return false; } };
    // ── Zuerst, was Wirkung hat ──────────────────────────────────────
    // Sortiert war nur nach `prio`, also nach der Familie: Bestmarke,
    // Monatschronik, Insignium. Bei achtzehn Zeilen sagt das nichts mehr —
    // gemessen am 28.09. standen elf Ausbauten in der Liste, und der eine
    // Monatseintrag, der wirklich in der Chronik landet und fuers Prestige
    // zaehlt [§C32], lag dahinter. Drei Stufen: der gekennzeichnete
    // Chronik-Eintrag, dann jeder Halterwechsel, dann das Ausbauen — bei dem
    // niemand gewechselt hat.
    const _wirkung = t => {
      const dt = (t && t.dataRef) || {};
      if(dt.type === 'chronik_geholt' && dt.zeigt === true) return 0;
      if(dt.type === 'rekord_gesteigert') return 2;
      return 1;
    };
    // ── Die Reihenfolge der Zeilen wiegt die Karte nicht ─────────────
    // `kopf` traegt Rang, Rubrik und Zeichen der Sammelkarte, und `kopf` war
    // die erste ANGEZEIGTE Zeile. Damit sank der Rang der Karte, sobald die
    // Anzeige umsortierte: gemessen fiel der Tafel-Moment des 26.08. von 84
    // auf 70, weil vorne jetzt die Monatschronik steht und nicht die
    // Bestmarke — und damit unter den Tagesdeckel. Der Kopf ist der
    // staerkste Teil, die Reihenfolge eine Frage der Lesbarkeit.
    const _nachPrio = g.teile.slice().sort((a, b) => (b.prio||0) - (a.prio||0));
    const _prioOrd = _nachPrio.filter(_brkT).concat(_nachPrio.filter(t => !_brkT(t)));
    const kopf = _prioOrd[0];
    // Auf der Karte einer Partie steht eine Pleite unter den Siegen, wie in
    // der Schlagzeile: gemessen stand „Leo findet gerade kein Mittel" über
    // „Leon und Maxi gewinnen zusammen alles", während die Schlagzeile mit der
    // Teamserie begann [§C25].
    const _negT = t => { try { return g.key.indexOf('spiel|') === 0 && _newsIstNegativ(t) ? 1 : 0; } catch(e){ return 0; } };
    const teile = _prioOrd.slice().sort((a, b) =>
      ((_brkT(b) ? 1 : 0) - (_brkT(a) ? 1 : 0))
      || (_negT(a) - _negT(b))
      || (_wirkung(a) - _wirkung(b))
      || ((b.prio||0) - (a.prio||0)));
    const art = g.art || (g.key.indexOf('tafel|') === 0 ? 'tafel' : 'spiel');
    // Die kurze Strecke gehoert zur Ewigen Tafel: dieselbe Kammer, dieselbe
    // Farbfamilie, derselbe Filter [§C25]. Verschieden ist nur, wovon die
    // Karte erzaehlt — und damit ihre Schlagzeile.
    const istForm = art === 'form';
    const istTafel = art === 'tafel' || istForm;
    const pids = [];
    teile.forEach(t => {
      let ids = [];
      try { ids = _newsPids(t); } catch(e){}
      ids.forEach(id => { if(pids.indexOf(id) < 0) pids.push(id); });
    });
    // ── Die Schlagzeile der beiden neuen Karten ──────────────────────
    // Sie borgen sie NICHT vom Kopf: über einer Karte mit zwei Chroniken
    // stand sonst der Name der einen, und über einer, auf der drei Spieler
    // dieselbe Stufe erreichen, der Name des ersten.
    // ── Die Zeile im Sammelband ──────────────────────────────────────
    // Auf der Spieler-Karte faellt der Name vorne weg: er steht schon in der
    // Schlagzeile, und dreimal „Tobi" untereinander ist zweimal zu viel
    // [§C33]. Auf der Erfolgs-Karte bleibt er stehen und bekommt den Wert
    // dazu, der die Traeger unterscheidet — dreimal „traegt den Schildring"
    // unter „Sina, Mira und Jonas tragen jetzt den Schildring" waere die
    // Schlagzeile in drei Wiederholungen. Wo nur der Name unterscheidet
    // (Jubilaeum, Meilenstein), steht er allein: die Liste IST dann die
    // Aufzaehlung, und ab dem vierten Namen ist sie die einzige Stelle, an
    // der alle vorkommen.
    // ── Auf der Karte einer Partie ist jede Zeile ein Satz ───────────
    // Einige Meldungen tragen ein Etikett mit Doppelpunkt als Titel („Leo:
    // Krimi-Versager", „50. Duell: Leo vs Martin", „2 Pechvögel: Anton und
    // Maxi"). Als eigene Karte stand darunter ihr Satz; als Zeile und erst
    // recht als Schlagzeile eines Bündels stehen sie allein, und dort gilt,
    // was für jede Zeile der Liga gilt: kein Etikett mit Doppelpunkt [§C33].
    // Gebaut aus dem `dataRef`, nicht aus dem gespeicherten Titel — der
    // bleibt, wie er veröffentlicht wurde.
    const _satzZeile = t => {
      const dt = (t && t.dataRef) || {}, ti = String(t.title || '').trim();
      const nm = id => nameOf(id), und = ids => _namenListe(ids.map(nm));
      const ids = (dt.playerIds || []).filter(Boolean);
      const bn = dt.badgeName || ((typeof BADGES !== 'undefined'
        && BADGES.find(b => b.id === dt.badgeId)) || {}).name;
      const zahl = x => parseInt(String(x || ''), 10);
      if(dt.type === 'badge_unlocked' && bn){
        if(ids.length > 1) return `${und(ids)} ${dt.rarity === 'negative' ? 'bekommen' : 'holen'} „${bn}“`;
        if(!dt.playerId) return ti;
        if(dt.rarity === 'negative') return `${nm(dt.playerId)} bekommt „${bn}“`;
        const klasse = dt.rarity === 'legendary' ? 'die legendäre Auszeichnung '
          : dt.rarity === 'rare' ? 'die seltene Auszeichnung ' : '';
        return `${nm(dt.playerId)} holt ${klasse}„${bn}“`;
      }
      // ── Die Zeile sagt, was genau passiert ist ──────────────────────
      // „Stefan erreicht runde Marken", „Leo findet gerade kein Mittel",
      // „Leon und Maxi gewinnen zusammen alles": jeder Satz verlangte das
      // Blatt, um zu erfahren, welche Marken, wie viele Pleiten, wie lange
      // die Serie. Die Zeile nennt es jetzt kurz, das Blatt erklärt es.
      if(dt.type === 'badge_marken' && (dt.marken || []).length > 1){
        const l = dt.marken, eins = [...new Set(l.map(x => x.pid))].length === 1;
        const q = x => `„${x.name}“`;
        if(eins && l.length <= 3){
          const gleich = l.every(x => x.rang === l[0].rang);
          return gleich
            ? `${nm(l[0].pid)} holt ${_namenListe(l.map(q))}, ${l.length === 2 ? 'beide' : 'alle'} zum ${l[0].rang}. Mal`
            : `${nm(l[0].pid)} holt ${_namenListe(l.map(x => `${q(x)} zum ${x.rang}. Mal`))}`;
        }
        if(l.length === 2) return `${nm(l[0].pid)} holt ${q(l[0])} zum ${l[0].rang}. Mal, ${nm(l[1].pid)} ${q(l[1])} zum ${l[1].rang}. Mal`;
        return ti;
      }
      if(dt.type === 'loss_streak' && dt.pid && dt.streak) return `${nm(dt.pid)} verliert zum ${dt.streak}. Mal in Folge`;
      if(dt.type === 'team_streak' && dt.a && dt.b && dt.streak) return `${und([dt.a, dt.b])} gewinnen zusammen zum ${dt.streak}. Mal in Folge`;
      if(dt.type === 'team_loss_streak' && dt.a && dt.b && dt.streak) return `${und([dt.a, dt.b])} verlieren zusammen zum ${dt.streak}. Mal in Folge`;
      if(dt.type === 'top_form' && dt.pid && dt.wins != null) return `${nm(dt.pid)} gewinnt ${dt.wins} der letzten ${FORM_FENSTER} Partien`;
      if((dt.type === 'rivalry_milestone' || dt.type === 'rivalry') && dt.a && dt.b && dt.n)
        return `${nm(dt.a)} und ${nm(dt.b)} treffen zum ${dt.n}. Mal aufeinander`;
      if(dt.type === 'milestone_wins' && dt.pid && zahl(dt.milestone)) return `${nm(dt.pid)} feiert den ${zahl(dt.milestone)}. Sieg`;
      if(dt.type === 'milestone_goals' && dt.pid && zahl(dt.milestone)) return `${nm(dt.pid)} gewinnt das ${zahl(dt.milestone)}. Game`;
      if(dt.type === 'streak_record' && dt.pid)
        return `${nm(dt.pid)} stellt ${dt.streak ? 'mit ' + dt.streak + ' Siegen ' : ''}den Serien-Rekord der Liga auf`;
      if(dt.type === 'group' && ids.length > 1){
        const verb = {loss_streak:'stecken beide in einer Durststrecke', top_form:'spielen über dem eigenen Schnitt',
          win_streak:'setzen beide eine Siegesserie fort', jubilee:'feiern ein Jubiläum',
          milestone_wins:'erreichen eine Siegmarke', milestone_goals:'erreichen eine Gamemarke',
          milestone_elo:'knacken eine Elo-Marke'}[dt.sub];
        // Ohne „ihre": seit die Gruppe auch Schlagzeile ist, stand „ziehen
        // ihre Serien gemeinsam weiter" groß über der Karte, und über einen
        // Spieler steht kein Possessivpronomen.
        if(verb) return `${und(ids)} ${ids.length > 2 ? verb.replace('beide ', 'alle ') : verb}`;
      }
      return ti;
    };
    const _achseZeile = t => {
      const ti = String(t.title || '').trim();
      if(art === 'spiel') return _satzZeile(t);
      if(art !== 'spieler' && art !== 'erfolg') return ti;
      const nm = nameOf(_pidsVon(t)[0]);
      if(art === 'spieler'){
        const ohne = ti.replace(new RegExp('^'
          + String(nm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:?\\s*'), '');
        return ohne || ti;
      }
      const cfg = SAMMEL_ERFOLG[(t.dataRef || {}).type];
      return (cfg && cfg.zeile) ? cfg.zeile(nm, t.dataRef || {}) : ti;
    };
    let neuTitel = '', neuText = '';
    if(art === 'spieler'){
      neuTitel = _spielerTitel(nameOf(g.pid), teile);
      neuText = `Für ${nameOf(g.pid)} ändert sich die Laufbahn an ${_zahlwortDe(teile.length)} Stellen.`;
    } else if(art === 'erfolg'){
      const cfg = SAMMEL_ERFOLG[(kopf.dataRef || {}).type] || {};
      const namen = pids.map(nameOf);
      neuTitel = cfg.titel ? cfg.titel(_namenKurz(namen), kopf.dataRef || {}) : kopf.title;
      neuText = cfg.satz ? cfg.satz(teile.length, kopf.dataRef || {}) : _ersterSatz(kopf.desc);
    } else if(istForm){
      // Gemessen an den 19 Spieltagen vom 28.07. bis 26.08. trugen 13 von
      // ihnen sonst zwei Karten mit derselben Schlagzeile [§C33].
      const mz = teile.length > 1;
      neuTitel = pids.length
        ? `${_namenKurz(pids.map(nameOf))} `
          + `${pids.length > 1 ? 'setzen' : 'setzt'} Marken auf kurzer Strecke`
        : `${_zahlwortDe(teile.length, true)} Marken auf kurzer Strecke`;
      neuText = `${_zahlwortDe(teile.length, true)} `
        + `${mz ? 'Bestmarken' : 'Bestmarke'} aus den letzten Partien. `
        + `${mz ? 'Sie halten' : 'Sie hält'}, solange das Fenster reicht.`;
    } else if(istTafel){
      const bilder = [];
      // Ein Ausbau ist keine gewechselte Bestmarke. Gezaehlt waren beide
      // zusammen, und damit stand „elf Bestmarken" ueber einem Moment, in
      // dem zwei den Halter wechselten und neun von ihrem eigenen Halter
      // verbessert wurden — wer nichts abgegeben hat, hat nichts abgegeben
      // [§C33].
      const nr = teile.filter(t => ((t.dataRef || {}).type || '').indexOf('rekord_') === 0
        && (t.dataRef || {}).type !== 'rekord_gesteigert').length;
      const na = teile.filter(t => (t.dataRef || {}).type === 'rekord_gesteigert').length;
      const nc = teile.filter(t => ((t.dataRef || {}).type || '').indexOf('chronik_') === 0).length;
      // Zahlwort, nicht Ziffer: „Eine Bestmarke und 2 Monatschroniken"
      // mischte beides in einem Satz.
      if(nr) bilder.push(nr === 1 ? 'eine Bestmarke' : `${_zahlwortDe(nr)} Bestmarken`);
      if(na) bilder.push(na === 1 ? 'ein Ausbau' : `${_zahlwortDe(na)} Ausbauten`);
      if(nc) bilder.push(nc === 1 ? 'eine Monatschronik' : `${_zahlwortDe(nc)} Monatschroniken`);
      const bild = _namenListe(bilder.length ? bilder : ['mehrere Laufbahnen']);
      // ── Der Satz zaehlt nicht dreimal und behauptet keinen Moment ──
      // Er hiess „Ein Moment, 8 Spuren: 5 Ausbauten und drei Monatschroniken
      // ordnen die Ewige Tafel neu." Drei Fehler in einer Zeile: „Ein
      // Moment" ist falsch, weil ein Tafel-Moment den ganzen Spieltag
      // umfasst und seine Zeilen gemessen 14:09 und 14:32 tragen; „8 Spuren"
      // ist eine Floskel und zaehlt dasselbe wie die Aufzaehlung dahinter;
      // und „8" als Ziffer neben „drei" als Wort mischt beide Schreibweisen
      // im selben Satz [§C27]. Uebrig bleibt, was passiert ist, und der
      // Zeitraum, fuer den es gilt.
      // ── Und er nennt, was am Ende haengenblieb ────────────────────
      // Die Aufzaehlung bleibt: der grosse Wert zaehlt nur die Wechsel, und
      // ein Ausbau steht sonst nirgends auf der Karte [§C33]. Dazu kommt die
      // eine Zahl, die die Karte bisher nicht nannte — was der Spieltag fuer
      // die Laufbahn wirklich gebracht hat.
      const plusTafel = (function(){
        let p = 0; const gez = {};
        teile.forEach(t => {
          const lb = (t.dataRef || {}).laufbahn || {};
          Object.keys(lb).forEach(pid => {
            if(gez[pid]) return; gez[pid] = 1;
            p += Math.max(0, Math.round(Number(lb[pid].nach) || 0)
                            - Math.round(Number(lb[pid].vor) || 0));
          });
        });
        return p;
      })();
      neuText = `${bild.charAt(0).toUpperCase() + bild.slice(1)}: `
        + (plusTafel
            ? `für die Laufbahn bleiben ${plusTafel} Prestige.`
            : `der Spieltag ordnet die Ewige Tafel neu.`);
    } else {
      const namen = pids.map(nameOf);
      const wer = namen.length ? _namenKurz(namen, 3) : 'die Beteiligten';
      // Ob die Karte Breaking IST, nicht ob zwei ihrer Zeilen es sind: seit
      // die uebrigen Meldungen derselben Partie mitreisen, traegt ein Buendel
      // oft genau EINE Breaking-Zeile [§C33].
      let brkBundle = false;
      try {
        brkBundle = teile.some(t => _isBreaking(t));
      } catch(e){}
      // ── Die Schlagzeile fasst die Anlässe zusammen ─────────────────
      // Sie nennt die Höhepunkte der Partie als Reihe: „Serienbruch gegen
      // Martin, Elo-Marke für Maxi und Schande ‚Krimi-Versager‘ für Leo im
      // Ein-Tor-Krimi". So sieht man auf einen Blick, was alles passiert ist.
      // Die Reihe hatte drei Fehler, und an ihnen hängt der Bau:
      // - Sie verlor Namen: „Siegesserie für Maxi und Durststrecke" sagte
      //   nicht, wessen Durststrecke, und „Durststrecke und Teamserie für
      //   Leon und Maxi" gab Leos Pleiten den beiden Siegern. Jeder Anlass
      //   trägt jetzt genau seine Leute (`_eigene`, aus dem `dataRef`), mit
      //   dem Wort, das ihre Rolle sagt: der Serienbruch GEGEN den, der die
      //   Serie trug, die Rivalität ZWISCHEN zweien, alles andere FÜR den,
      //   dem es zählt.
      // - Sie wurde lang: höchstens drei Anlässe, weniger, sobald die Zeile
      //   über 96 Zeichen käme (drei Zeilen auf dem Telefon). Der Rest
      //   steht im Sammelband.
      // - Sie begann mit irgendeinem Anlass. Jetzt zuerst der stärkste
      //   (`_leitWert`): Breaking vorn, eine Pleite hinten — über einem Sieg
      //   steht zuerst der Sieg [§C25].
      // Dasselbe für zwei steht einmal in der Mehrzahl („Siegesserien für
      // Leon und Maxi"). Das Ergebnis gehört allen vier und hängt sich als
      // Ort dahinter („im Ein-Tor-Krimi"), außer eine Auszeichnung derselben
      // Partie erzählt es schon (`BADGE_DECKT`).
      const _leitWert = t => {
        const dt = (t && t.dataRef) || {};
        const typ = dt.type === 'group' ? (dt.sub || '') : (dt.type || '');
        let neg = false;
        try { neg = _newsIstNegativ(t); } catch(e){}
        if(neg) return -100 + (t.prio || 0) / 100;
        let w = anlassGewicht(typ, dt);
        // Was eine Auszeichnung derselben Partie schon erzählt, führt nicht:
        // „Absoluter Sieger" IST das 10:0, und die Schlagzeile nennt es einmal.
        if(typ === 'spiel' || typ === 'match_result')
          w = (_ergebnisGedeckt(dt) ? null : {zu_null:78, upset:74, krimi:58, kanter:52, eng:44}[dt.resultKind]) || 30;
        if(dt.type === 'group') w = (w || 40) + 10;
        if(w == null) w = 40;
        let brk = false;
        try { brk = _isBreaking(t); } catch(e){}
        return (brk ? 1000 : 0) + w + (t.prio || 0) / 1000;
      };
      const ETIKETT = {lead_change:'neue Tabellenspitze', streak_record:'Rekordserie',
        top_clash:'Spitzenduell', giant_slayer:'Favoritensturz', streak_killer:'Serienbruch',
        win_streak:'Siegesserie', team_streak:'Teamserie', loss_streak:'Durststrecke',
        team_loss_streak:'gemeinsame Durststrecke', top_form:'Formlauf', jubilee:'Jubiläum',
        milestone_wins:'Siegmarke', milestone_goals:'Gamemarke', milestone_elo:'Elo-Marke',
        rivalry_milestone:'Rivalitätsmarke', rivalry:'Rivalität',
        fluch:'gebrochener Fluch', duo_jubilaeum:'Duo-Jubiläum', revanche:'Revanche',
        tagesmarathon:'langer Tag', elo_hoch:'Elo-Höchststand', tabellensprung:'Tabellensprung',
        pleiten_ende:'Ende der Durststrecke', duo_pleiten_ende:'Ende der gemeinsamen Durststrecke',
        rueckkehr:'Rückkehr'};
      const MEHRZAHL = {Siegesserie:'Siegesserien', Teamserie:'Teamserien', Durststrecke:'Durststrecken',
        'gemeinsame Durststrecke':'gemeinsame Durststrecken', Formlauf:'Formläufe', 'Jubiläum':'Jubiläen',
        Siegmarke:'Siegmarken', Gamemarke:'Gamemarken', 'Elo-Marke':'Elo-Marken', Serienbruch:'Serienbrüche'};
      const ERGEBNIS_ORT = {zu_null:'mit einem Doppel-Bagel', upset:'im Favoritensturz',
        krimi:'im Tiebreak-Krimi', kanter:'mit einem klaren Sieg', eng:'in der umkämpften Partie'};
      const _etikett = t => {
        const dt = (t && t.dataRef) || {};
        const typ = dt.type === 'group' ? (dt.sub || '') : (dt.type || '');
        // Mehrere kleine Marken einer Partie sind keine „Auszeichnung für
        // Maxi und Leon": das war Einzahl ohne Namen für zwei verschiedene
        // Marken. Sie heißen wie in ihrer eigenen Zeile.
        if(typ === 'badge_marken' && (dt.marken || []).length > 1){
          const l = dt.marken;
          // Zwei Marken eines Spielers nennt die Schlagzeile beim Namen:
          // „Auszeichnung für Stefan" verschwieg, welche.
          return l.length === 2 && l[0].pid === l[1].pid && l[0].name && l[1].name
            ? `Marken „${l[0].name}“ und „${l[1].name}“` : 'runde Marken';
        }
        if(typ === 'badge_unlocked' || typ === 'badge_marken'){
          const mk = typ === 'badge_marken' && (dt.marken || []).length === 1 ? dt.marken[0] : null;
          const bn = (mk && mk.name) || dt.badgeName || ((typeof BADGES !== 'undefined'
            && BADGES.find(b => b.id === dt.badgeId)) || {}).name;
          const art = dt.rarity === 'negative' ? 'Schande'
            : dt.rarity === 'legendary' ? 'legendäre Auszeichnung'
            : dt.rarity === 'rare' ? 'seltene Auszeichnung' : 'Auszeichnung';
          return bn ? `${art} „${bn}“` : art;
        }
        return ETIKETT[typ] || null;
      };
      const _eigene = t => {
        const dt = (t && t.dataRef) || {};
        if(dt.type === 'streak_killer' && dt.victimPid) return {wort:'gegen', pids:[dt.victimPid]};
        if((dt.type === 'rivalry_milestone' || dt.type === 'rivalry') && dt.a && dt.b) return {wort:'zwischen', pids:[dt.a, dt.b]};
        if(dt.type === 'top_clash' && dt.p1 && dt.p2) return {wort:'zwischen', pids:[dt.p1, dt.p2]};
        if(dt.type === 'duo_jubilaeum' && dt.a && dt.b) return {wort:'für', pids:[dt.a, dt.b]};
        if(dt.type === 'revanche' && Array.isArray(dt.W)) return {wort:'für', pids:dt.W.slice()};
        if(dt.type === 'lead_change' && dt.newLeader) return {wort:'für', pids:[dt.newLeader]};
        if((dt.type === 'team_streak' || dt.type === 'team_loss_streak' || dt.type === 'duo_pleiten_ende') && dt.a && dt.b) return {wort:'für', pids:[dt.a, dt.b]};
        if(dt.playerId) return {wort:'für', pids:[dt.playerId]};
        if(dt.pid) return {wort:'für', pids:[dt.pid]};
        return {wort:'für', pids:(dt.playerIds || t.playerIds || []).filter(Boolean)};
      };
      // Nur die Karte EINER Partie hat einen Hauptanlass; ein Bündel über eine
      // Minute ohne gemeinsame Partie fasst seine Anlässe als Reihe zusammen,
      // und nur dafür wird sie gebaut.
      const einePartie = g.key.indexOf('spiel|match|') === 0;
      const phrasen = [];
      if(!einePartie) teile.slice().sort((a, b) => _leitWert(b) - _leitWert(a)).forEach(t => {
        const dt = t.dataRef || {};
        if(dt.type === 'spiel' || dt.type === 'match_result') return;
        const et = _etikett(t);
        if(!et) return;
        const e = _eigene(t);
        const da = phrasen.find(x => x.et === et && x.wort === e.wort);
        if(da){ da.n++; e.pids.forEach(id => { if(da.pids.indexOf(id) < 0) da.pids.push(id); }); return; }
        // Eine Gruppe ist schon mehrere: zwei Serien im Gleichschritt.
        const pids = [...new Set(e.pids)];
        phrasen.push({et, wort:e.wort, pids, n:dt.type === 'group' ? Math.max(1, pids.length) : 1,
          neg:_leitWert(t) < 0});
      });
      // Zwei Anlässe derselben Leute stehen unter EINEM Namen: „Elo-Höchststand
      // für Maxi und Elo-Marke für Maxi" nannte ihn zweimal hintereinander.
      // Gebündelt wird nur in derselben Richtung (die Pleite steht nie vor dem
      // Sieg) und nur zwei Etiketten, die selbst kein „und" tragen; die Reihe
      // trennt dann mit Komma, sonst stünden zwei „und" hintereinander.
      const _gruppen = l => {
        const out = [];
        l.forEach(x => {
          const et = x.n > 1 && MEHRZAHL[x.et] ? MEHRZAHL[x.et] : x.et;
          const k = x.wort + '|' + x.pids.slice().sort().join(',');
          const da = x.pids.length && x.pids.length <= 3 && !/ und /.test(et)
            && out.find(g => g.k === k && g.neg === x.neg && g.ets.length === 1 && !/ und /.test(g.ets[0]));
          if(da) da.ets.push(et);
          else out.push({k, ets:[et], wort:x.wort, pids:x.pids, neg:x.neg});
        });
        return out;
      };
      const _phrase = g => {
        const et = g.ets.join(' und ');
        return g.pids.length && g.pids.length <= 3
          ? `${et} ${g.wort} ${_namenListe(g.pids.map(nameOf))}` : et;
      };
      const _reihe = l => { const g = _gruppen(l), t = g.map(_phrase);
        return g.some(x => x.ets.length > 1) ? t.join(', ') : _namenListe(t); };
      const spT = teile.find(t => ((t.dataRef || {}).type === 'spiel' || (t.dataRef || {}).type === 'match_result'));
      const spD = (spT && spT.dataRef) || {};
      const ort = spT && !_ergebnisGedeckt(spD) ? (ERGEBNIS_ORT[spD.resultKind] || '') : '';
      // ── Auf der Achse der Partie ist die Schlagzeile ihr Hauptanlass ──
      // Die Reihe stand über denselben Anlässen als Zeilen: „Teamserie für
      // Leon und Maxi und Durststrecke für Leo" über „Leon und Maxi gewinnen
      // zusammen zum 5. Mal in Folge" und „Leo verliert zum 5. Mal in Folge"
      // — jeder Anlass zweimal auf derselben Karte. Jetzt ist der schwerste,
      // der keine Pleite ist, die Schlagzeile, in seinem eigenen Satz
      // (`_achseZeile`), und jeder andere steht einmal darunter [§C33]. Gibt
      // es nur Pleiten, erzählt das Ergebnis: über einem Sieg stand sonst
      // „Jane bekommt ‚Absoluter Verlierer‘".
      const haupt = einePartie ? teile
        .filter(t => { const ty = (t.dataRef || {}).type; return ty !== 'spiel' && ty !== 'match_result'; })
        .map(t => ({t, w:_leitWert(t)})).filter(x => x.w >= 0)
        .sort((a, b) => b.w - a.w)[0] : null;
      if(einePartie){
        neuTitel = haupt ? _achseZeile(haupt.t) : String((spT && spT.title) || '').trim();
      } else if(phrasen.length){
        // Ein Anlass wiegt mehr als der Ort: zu lang, fällt zuerst der Ort.
        let bild = '';
        for(let zahl = Math.min(3, phrasen.length); zahl >= 1 && !bild; zahl--){
          const kern = _reihe(phrasen.slice(0, zahl));
          if(ort && (kern + ' ' + ort).length <= 96) bild = kern + ' ' + ort;
          else if(kern.length <= 96 || zahl === 1) bild = kern;
        }
        neuTitel = bild.charAt(0).toUpperCase() + bild.slice(1);
      } else if(spT){
        // Nur das Ergebnis: dann ist sein eigener Satz die Schlagzeile.
        neuTitel = String(spT.title || '').trim();
      }
      // ── Der Text erzaehlt die Partie, nicht die Kartenstruktur ─────
      // „Aus einer Partie wachsen zwei Geschichten" beschreibt den Bau des
      // Feeds und nennt keine Zahl aus dem Spiel. Der Stand steht im Band
      // darueber, die Siegchance und die Elo-Wirkung nirgends sonst — sie
      // sagen, wie erwartbar das Ergebnis war und was es bewegt hat.
      // ── Der Text ist der Satz der Partie ────────────────────────────
      // Er hiess „Die Siegchance lag vor der Partie bei 50 %, für Leo bringt
      // der Sieg +31 Elo. Eine Meldung hängt daran." — unter jedem Bündel
      // dieselben zwei Zahlen, die die Zeichnung darüber zeigt, und ein Satz
      // über den Bau der Karte. Die Partie-Karte hat ihren eigenen Satz aus
      // ihrer Form oder ihrem Anlass [§C33], und der gehört auch dem Bündel.
      const spTeil = teile.find(t => (t.dataRef || {}).type === 'spiel');
      const ds = (spTeil || {}).dataRef || {};
      const nf = Math.max(1, teile.length - (spTeil ? 1 : 0));
      const folge = nf === 1
        ? 'Eine Meldung hängt daran'
        : `${_zahlwortDe(nf, true)} Meldungen hängen daran`;
      // Trägt die Karte einer Partie einen Hauptanlass, erklärt ihr Satz
      // ihn. Unter „Stefan holt die seltene Auszeichnung ‚Nerven aus Stahl‘"
      // stand „Nur 1 Tor trennt beide Teams" — der Satz der Partie, den ihr
      // Kopf schon zeigt —, und unter „Johannes übernimmt die
      // Tabellenspitze" stand „Die Liga sieht ein 10:6 zum 75. Mal", der
      // Satz einer Form, die gar nicht gezeichnet war.
      if(einePartie && haupt && String(haupt.t.desc || '').trim()){
        neuText = String(haupt.t.desc).trim();
      } else if(ds.quote != null){
        neuText = spTeil.desc || '';
      } else if(brkBundle){
        neuText = `${folge}, und jede davon kommt nur wenige Male je Saison.`;
      } else {
        neuText = `${folge}. Für ${wer} wirkt der Schlusspfiff damit über die Partie hinaus.`;
      }
    }
    gesammelt.push({
      id: 'sammel_' + g.key.replace(/\|/g, '_'),
      cat: istTafel ? 'tafel' : kopf.cat,
      ic: kopf.ic,
      // Der Titel muss den Tag benennen, an dem es passiert ist. „Zwei Wechsel
      // an der Ewigen Tafel" stand sonst wortgleich über zwei Karten aus zwei
      // Monaten, und keine der beiden nannte einen Namen.
      // Einer bewegt, mehrere bewegen. „Martin bewegen die Ewige Tafel"
      // stand ueber einer Karte mit einem einzigen Namen.
      // Und die Ueberschrift nennt ALLE: sie zeigte zwei von drei Namen, und
      // der dritte kam nur in der Liste darunter vor, obwohl die Karte
      // genauso von ihm handelt [§C33].
      title: neuTitel ? neuTitel : (istTafel
        ? (pids.length
            ? `${_namenKurz(pids.map(nameOf))} `
              + `${pids.length > 1 ? 'bewegen' : 'bewegt'} die Ewige Tafel`
            : `${_zahlwortDe(teile.length)} Wechsel an der Ewigen Tafel`)
        : kopf.title),
      // Die Karte spricht nur ueber das Ganze. Kein Einzelereignis wird im
      // Kopf wiederholt oder durch eine Hervorhebung wichtiger gemacht.
      desc: neuText,
      // ── Die Karte traegt den Zeitpunkt dessen, was sie ZEIGT ─────
      // Er war der aelteste Teil ueberhaupt, damit die Karte im Feed nicht
      // wandert. Gemessen stand darueber „Heute, 15:19" und darunter, in
      // jeder einzelnen Zeile und im Ergebnisband, „15:37": die aelteste
      // Zeile eines Tafel-Moments ist fast immer ein Ausbau, und ein Ausbau
      // steht gar nicht auf der Karte [§C33]. Sie nannte damit eine Uhrzeit,
      // zu der nichts von dem passiert ist, was sie zeigt.
      //
      // Den juengsten Teil zu nehmen loest das, kostet die Karte aber ihren
      // Platz: der Tagesdeckel vergibt chronologisch, und der reservierte
      // Platz der Ewigen Tafel geht an die FRUEHESTE Tafel-Karte des Tages —
      // gemessen fiel der ganze Tafel-Moment damit aus dem Feed. Also die
      // frueheste Zeile, die auch auf der Karte stehen kann: sie bleibt
      // stehen, weil eine frueher gespielte Partie nicht nachtraeglich
      // dazukommt, und ein Ausbau wird nie ein Wechsel.
      when: (function(){
        const zeigt = teile.filter(t => ((t.dataRef || {}).type || '') !== 'rekord_gesteigert');
        const l = zeigt.length ? zeigt : teile;
        return l.reduce((mn, t) => (new Date(t.when) < new Date(mn) ? t.when : mn), l[0].when);
      })(),
      // Die Sammelkarte trägt, was sie zusammenfasst: den stärksten Teil und
      // einen Schritt je weiterem. Mit `+1` wog eine Karte, die drei
      // Insignium-Stufen bündelt, kaum mehr als eine einzelne davon — und
      // fiel damit unter den Tagesdeckel, obwohl sie drei Meldungen trägt.
      // Eine einzelne Karte zu deckeln kostet eine Meldung, diese zu deckeln
      // kostet alle: bündeln darf nichts verstecken [§C33].
      //
      // Die Karte über EINEN Spieler und die über EINEN Erfolg erben ihren
      // Rang gar nicht erst: sie fassen nicht einen Moment zusammen, sie
      // sind eine eigene Nachricht mit eigener Kartenform [§C33]. Geerbt vom
      // Kopf stand „Jannik und Stefan tragen jetzt den Schildring" auf dem
      // Rang einer einzelnen Insignium-Stufe und fiel an ihrem eigenen
      // Spieltag heraus — der einzigen Karte, auf der die beiden standen.
      // Sie waechst mit jeder Zeile um zwei — und sprengte damit die Skala:
      // achtzehn Zeilen ergaben 110 und standen ueber dem Breaking-Band, ohne
      // Breaking zu sein. Ihren Platz haelt sie auch ohne das (die Tafel hat
      // je Tag einen reservierten), also bleibt sie im Band des Spieltags.
      prio: Math.min(PRIO_SPIELTAG_MAX,
                     Math.max((kopf.prio || 0) + 2 * Math.max(1, teile.length - 1),
                              STORY_PRIO['sammel_' + art] || 0)),
      dataRef: {type:'sammel', quelle: art,
                // ── Eine Partie oder keine ──────────────────────────
                // Die Karte borgte die matchId ihres Kopfes. Ein
                // Tafel-Moment entsteht aber ueber die MINUTE und umfasst
                // damit mehrere Partien: ueber „Leo und Stefan bewegen die
                // Ewige Tafel" stand das Ergebnis einer Partie, an der nur
                // einer der beiden beteiligt war. Ein Band gibt es deshalb
                // nur, wenn alle Teile dieselbe Partie nennen — dann ist
                // es wirklich eine Partie, ein Moment [§C33].
                // Auf der Achse der Partie zählt dazu die Karte der Partie
                // selbst: steckt genau eine darin und nennt kein Teil eine
                // ANDERE Partie, ist es ihr Bündel, auch wenn eine Rivalität
                // oder der Countdown gar keine Partie nennt. Ohne das bekam
                // das Bündel keine `matchId`, fiel unter den Deckel je Sorte
                // und nahm die Partie mit [§C33].
                matchId: (function(){
                  const ids = teile.map(t => (t.dataRef || {}).matchId || '');
                  const erste = ids[0];
                  if(erste && ids.every(x => x === erste)) return erste;
                  if(art !== 'spiel') return null;
                  const spiele = teile.filter(t => (t.dataRef || {}).type === 'spiel');
                  const mid = spiele.length === 1 ? (spiele[0].dataRef || {}).matchId : '';
                  return (mid && ids.every(x => !x || x === mid)) ? mid : null;
                })(), playerIds: pids,
                kopfTyp: (kopf.dataRef||{}).type || '',
                breaking: teile.some(t => { try { return _isBreaking(t); } catch(e){ return false; } }),
                // Die Stufe reist mit: ohne sie kann die Karte das Zeichen
                // nicht zeigen, um das sie geht [§C30].
                stufe: (kopf.dataRef||{}).stufe,
                // Die Beteiligten je Zeile: die Buendelung haengt an ihnen
                // [§C33], und im Blatt fuehrt die Zeile damit zu dem, von dem
                // sie handelt.
                // Eine Zeile darf kuerzer sein als die Karte, von der sie
                // kommt: `zeileText` ist die kurze Fassung, die der
                // Generator dafuer mitgibt. Ohne sie stand im Blatt eines
                // Tafel-Moments neunmal der volle Kartentext untereinander,
                // bis zu 183 Zeichen je Zeile [§C33].
                teile: teile.map(t => ({ic: t.ic, titel: _achseZeile(t),
                                         // Jede Zeile nennt die Karte, aus
                                         // der sie kommt. Ohne das ist nicht
                                         // nachzumessen, ob eine Karte, die
                                         // im Buendel aufgeht, ihren Inhalt
                                         // behaelt — und genau das ist die
                                         // Zusage: was einmal dastand, bleibt
                                         // stehen [§C33].
                                        id: t.id,
                                        sourceIds: (t.dataRef||{}).memberIds
                                          || (t.dataRef||{}).sourceStoryIds || [t.id],
                                        ref: t.dataRef || {},
                                         // ── Das Ergebnis steht nicht dreimal ──
                                         // Die Zeile der Partie hiess „Leon
                                         // und Maxi setzen sich gegen Leo und
                                         // Anton durch" und darunter „Vor dem
                                         // Anstoss lag die Siegchance bei
                                         // 81 %. Der Sieg bringt +7 Elo." Das
                                         // Band zeigt dieselben vier Namen und
                                         // den Stand, und der Kartentext
                                         // nennt wortgleich dieselben zwei
                                         // Zahlen [§C33 `_ndNeu`]. Der Anlass
                                         // bleibt als Zeile stehen, sein Text
                                         // faellt weg.
                                        text: (art === 'spiel'
                                               && (t.dataRef || {}).type === 'spiel')
                                          ? '' : ((t.dataRef || {}).zeileText || t.desc),
                                        typ: (t.dataRef||{}).type || '',
                                        kammer: (t.dataRef||{}).kammer || '',
                                         // Jede Aenderung mit ihrer eigenen
                                         // Uhrzeit und ihrer eigenen Partie:
                                         // ein Tafel-Moment umfasst mehrere
                                         // Partien, und ohne beides stand im
                                         // Blatt eine Liste ohne jeden
                                         // Zeitbezug.
                                        ms: new Date(t.when).getTime(),
                                        matchId: (t.dataRef||{}).matchId || '',
                                         // Die Punktewirkung des Spieltags,
                                         // wie sie an der Rekord-Karte steht
                                         // [§C34]. Sie ist je Spieler
                                         // dieselbe, egal aus welcher Zeile
                                         // sie kommt — das Blatt zeigt sie
                                         // deshalb EINMAL je Spieler.
                                        lb: (t.dataRef||{}).laufbahn || null,
                                         // Halter vor und nach dem Tag: daran
                                         // liest das Blatt, wer einen Rekord
                                         // geteilt oder verloren hat.
                                        halter: Array.isArray((t.dataRef||{}).halter)
                                                ? t.dataRef.halter : ((t.dataRef||{}).alle || []),
                                        vorher: (t.dataRef||{}).vorher || [],
                                         // Wem eine Chronik wirklich Prestige
                                         // gibt oder nimmt [§C32]; fehlt es,
                                         // stammt die Zeile von vorher.
                                        zaehlt: Array.isArray((t.dataRef||{}).zaehlt)
                                                ? t.dataRef.zaehlt : null,
                                        rname: (t.dataRef||{}).rekordName
                                               || (t.dataRef||{}).chronName || '',
                                         // Ein Spieler zeigt je Monat nur EINE
                                         // Chronik [§C32]. Auch in einer großen
                                         // Tafel muss sichtbar bleiben, welche
                                         // davon das ist.
                                        marke: (t.dataRef||{}).zeigt === true
                                               ? 'in der Chronik' : '',
                                         // ── Eine seltene Auszeichnung geht
                                         // nicht unter ──────────────────────
                                         // Sie blieb einmal einzeln stehen und
                                         // damit neben der Karte desselben
                                         // Spiels: zweimal dasselbe 10:4 mit
                                         // denselben vier Wappen. Sie reist
                                         // jetzt mit, und ihre Zeile traegt
                                         // ihre Klasse — sonst waere sie
                                         // genau das Kleingedruckte, das die
                                         // alte Regel verhindern wollte.
                                        klasse: ((t.dataRef||{}).type === 'badge_unlocked'
                                          && ((t.dataRef||{}).rarity === 'rare'
                                              || (t.dataRef||{}).rarity === 'legendary'))
                                          ? ((t.dataRef||{}).rarity === 'legendary'
                                             ? 'Legendär' : 'Selten') : '',
                                         // Negative Ereignisse bleiben Teil
                                         // derselben Partie, tragen in Karte
                                         // und Blatt aber ihre rote Richtung.
                                         neg: (function(){
                                           try { return _newsIstNegativ(t); }
                                           catch(e){ return false; } })(),
                                         // Der Anlass des Breaking. Ohne ihn
                                         // ist auf der lautesten Karte des
                                         // Feeds nicht zu sehen, warum sie
                                         // die Spalte bricht [§C33].
                                         brk: (function(){
                                           try { return _isBreaking(t); }
                                           catch(e){ return false; } })(),
                                         pids: _pidsVon(t)}))}
    });
  });

  // ── Die dritte Kachel derselben Sorte erzählt nichts mehr ──────────
  // Drei „X & Y kommen als Team nicht in Tritt" am selben Tag sind keine
  // drei Nachrichten, sondern eine Nachricht und zwei Wiederholungen. Der
  // Deckel gilt deshalb pro Tag, nicht mehr für das gesamte 14-Tage-Fenster:
  // sonst verschwanden ältere 5er-Serien, Serienbrüche und Upsets allein,
  // weil derselbe Typ Tage später noch einmal vorkam.
  //
  // Ausgenommen sind die seltenen Ereignisse: einen zweiten Elo-Rekord in
  // derselben Woche zu unterschlagen wäre genau der Fehler, den die Regel
  // verhindern soll. Und `ambient`/`group` sind ohnehin je Slot einzeln.
  const OHNE_DECKEL = new Set(['lead_change','elo_record','streak_record',
                               'season_endgame','ambient','group','runde','ehrung']);
  const NF_DECKEL = Number.POSITIVE_INFINITY;
  // Eine Sammelkarte zaehlt nach ihrer ACHSE mit, nicht als „sammel". Sie war
  // ganz ausgenommen, und gemessen standen am 26.08. vier Karten „Ein Spiel,
  // N Geschichten fuer …" untereinander — vier Partien desselben Tages, aber
  // fuer den, der scrollt, viermal dieselbe Schlagzeile. Die Achse ist die
  // Sorte: ein Spiel-Bundle, ein Tafel-Bundle, eine Karte ueber einen Spieler
  // und eine ueber einen Erfolg sind vier verschiedene Nachrichten und duerfen
  // nebeneinander stehen.
  const _deckelSorte = s => {
    const d = (s && s.dataRef) || {};
    const t = d.type || '';
    return t === 'sammel' ? 'sammel/' + (d.quelle || 'spiel') : t;
  };
  // ── Der Deckel behaelt die ERSTEN, nicht die staerksten ────────────
  // Er entschied nach `prio`, und damit hing das Ergebnis am ganzen Tag: die
  // Karte, die um 11 Uhr im Feed stand, fiel um 14 Uhr heraus, weil nach der
  // naechsten Partie eine staerkere derselben Sorte dazukam. Gemessen
  // verschwand so am 26.08. „Leo und Maxi verlieren zusammen alles" zwischen
  // der fuenften und der sechsten Partie — der Spieltag schrieb seine eigene
  // Tafel nach jeder Partie um. Eine Nachricht gehoert ihrem Zeitpunkt: die
  // ersten zwei einer Sorte bleiben, alles Spaetere wartet auf morgen. Nach
  // dem staerksten auszuwaehlen hiess frueher auch, eine Partie zu opfern —
  // die zaehlt hier ohnehin nicht mehr mit.
  const _deckelBleibt = new Map();
  {
    const proKey = new Map();
    gesammelt.forEach(s => {
      const t = (s && s.dataRef && s.dataRef.type) || '';
      if(!t || OHNE_DECKEL.has(t) || TAG_PFLICHT.has(t)) return;
      if(_istPartie(s)) return;
      const k = _deckelSorte(s) + '|' + tagKey(s.when);
      const l = proKey.get(k) || [];
      l.push(s); proKey.set(k, l);
    });
    proKey.forEach((l, k) => {
      _deckelBleibt.set(k, new Set(l.slice()
        .sort((a, b) => new Date(a.when) - new Date(b.when))
        .slice(0, NF_DECKEL).map(s => s.id)));
    });
  }
  const behalten = gesammelt.filter(s => {
    const t = (s && s.dataRef && s.dataRef.type) || '';
    if(!t || OHNE_DECKEL.has(t) || TAG_PFLICHT.has(t)) return true;
    // Der Deckel je Sorte ist ein Deckel auf WIEDERHOLUNGEN. Neun Partien an
    // einem Tag sind neun Ereignisse, nicht eine Nachricht und acht
    // Wiederholungen — gemessen liess er zwei davon stehen.
    if(_istPartie(s)) return true;
    const bleibt = _deckelBleibt.get(_deckelSorte(s) + '|' + tagKey(s.when));
    return !bleibt || bleibt.has(s.id);
  });
  // ── Der Deckel darf niemanden ganz verschwinden lassen ─────────────
  // Im Feed hat jeder ein Gesicht, und jeder gewertete Spieler kommt vor
  // [§C33]. Der Deckel je Sorte kannte diese Regel nicht: die dritte
  // Duo-Pleitenserie fiel weg, und mit ihr die einzige Karte, auf der die
  // beiden Beteiligten in dieser Woche ueberhaupt standen. Gemessen fehlten
  // danach drei von zwoelf Spielern im Feed, obwohl der Generator fuer jeden
  // etwas gebildet hatte. Wer sonst nirgends vorkommt, holt seine Karte
  // deshalb zurueck — die juengste, und nur diese eine.
  const gesicht = st => { try { return _newsPids(st) || []; } catch(e){ return []; } };
  const schonDa = new Set();
  behalten.forEach(s => gesicht(s).forEach(p => schonDa.add(p)));
  const nachgeholt = new Set();
  gesammelt.forEach(s => {
    if(behalten.indexOf(s) >= 0) return;
    const neu = gesicht(s).filter(p => !schonDa.has(p));
    if(!neu.length) return;
    neu.forEach(p => schonDa.add(p));
    nachgeholt.add(s);
  });
  const entdoppelt = nachgeholt.size
    ? gesammelt.filter(s => behalten.indexOf(s) >= 0 || nachgeholt.has(s))
    : behalten;
  // ── Die Reihenfolge ist die Zeit ───────────────────────────────────
  // Vorher tauschte hier ein Durchgang zwei gleichartige Nachbarn, damit sich
  // nicht zweimal dieselbe Sorte untereinander liest. Das kostete genau eine
  // Position Chronologie, und die Tafel ist nach Tagen gegliedert: eine Karte,
  // die dabei den Tag wechselt, steht unter dem falschen Kopf. Gemessen ergab
  // das acht Tagesköpfe für sieben Tage.
  // Die Auflockerung leisten jetzt der Tageskopf und die Kartenformen,
  // gegen die Häufung wirken der Deckel je Sorte und die Sammelkarte. Der Feed
  // steht dafür wieder streng von neu nach alt.
  const entzerrt = entdoppelt;

  // Hier rutschte bis zuletzt jede Karte nach hinten, deren Gesichter schon
  // vier Mal im Feed standen. Das verschob die Reihenfolge innerhalb eines
  // Tages und brach damit die Chronologie, ohne die Zahl der Karten je Spieler
  // zu ändern — verschoben ist nicht weniger. Die Verteilung trägt jetzt allein
  // der Generator (PER_PLAYER_LIMIT und NEBENROLLEN_LIMIT, §11.1), und die
  // Reihenfolge ist wieder die Zeit. Gemessen steht danach kein Spieler auf
  // mehr als einem Drittel der Karten, und jeder gewertete Spieler kommt vor.
  // Ein Tagesdeckel stand hier: vier Karten je Tag, die Ewige Tafel mit
  // eigenem Platz, Partien, Breaking und Pflichtkarten ausgenommen. Seit
  // dem Snapshot-Vertrag [§C33] nimmt kein Kontingent eine veröffentlichte
  // Story mehr weg, und die Rechnung lief ins Leere: sie bestimmte, was
  // bleibt, und danach blieb alles. Die Gründe für den Deckel stehen in der
  // Herleitung von docs/gesetze/C33-feed.md. `NEWS_LIMITS.proTag` und
  // `tafelProTagMin` liest die App seitdem nicht mehr; tests/ambient misst
  // daran weiter, wie voll ein Spieltag im Feed steht.
  const fertig = entzerrt;

  // Kein Spieltag ohne Karte. Der Deckel je Sorte, der Vergleich der
  // Schlagzeilen und die Sperrfrist raeumen vor dieser Stelle auf, und
  // gemessen blieb dabei am 13.08. genau eine Karte uebrig und am 19.08.
  // gar keine. Ein Tag, an dem gespielt wurde, hat eine Nachricht: bleibt
  // keine uebrig, kommt die staerkste seiner Kandidaten zurueck. Eine
  // Doublette ist das nicht — was hier zurueckkommt, steht sonst nirgends.
  let ausbalanciert = fertig;
  {
    const hatKarte = new Set(fertig.map(s => tagKey(s.when)));
    const zurueck = new Map();
    entzerrt.concat(verworfen).forEach(s => {
      const k = tagKey(s.when);
      if(hatKarte.has(k)) return;
      if(!_newsTagMs(k).length) return;
      const alt = zurueck.get(k);
      if(!alt || (s.prio || 0) > (alt.prio || 0)) zurueck.set(k, s);
    });
    if(zurueck.size){
      const dazu = [...zurueck.values()].filter(s => fertig.indexOf(s) < 0);
      ausbalanciert = fertig.concat(dazu);
    }
  }
  // ── Die Reihenfolge ist die Zeit ───────────────────────────────────
  // Entschieden wird von alt nach neu, damit eine spaetere Partie keine Karte
  // mehr verdraengen kann; gelesen wird von neu nach alt. Der Feed sortiert
  // nicht mehr um [§C33], also steht die Reihenfolge hier — einmal, nach dem
  // Zeitpunkt und nach nichts anderem. Eine Karte bleibt damit da, wo sie
  // entstanden ist: am Anfang eines Tages, zwischen zwei Partien oder an
  // seinem Ende.
  ausbalanciert = ausbalanciert.slice()
    .sort(_storyFolge);
  // ── Eine Partie zeigt ihr Ergebnis einmal ─────────────────────────
  // Jede Geschichte mit einer `matchId` zeigt das Ergebnisband — vier Wappen
  // und den Endstand [§C33]. Stehen zwei Karten derselben Partie im Feed,
  // steht dasselbe Band zweimal untereinander: gemessen ein 10:4 als
  // Spieltags-Sammelkarte und daneben die seltene Auszeichnung derselben
  // Partie, mit denselben vier Wappen und demselben Stand. Wer scrollt, liest
  // zwei Partien statt einer.
  //
  // Matchmeldungen werden vollstaendig zusammengelegt. Nur alte oder nicht
  // matchbezogene Kartenformen, die daneben bleiben, verzichten auf das Band. Damit
  // ist die Trennung eindeutig: eine Partie, ein Band. Die Karte behaelt ihr
  // Gesicht und im Blatt steht die Partie weiterhin.
  //
  // Wer das Band behaelt, entscheidet nicht die Reihenfolge, sondern der
  // Inhalt: die Partie-Karte und ihr Buendel gehoeren dem Spiel, alles andere
  // haengt nur daran.
  {
    const besitzer = new Map();
    ausbalanciert.forEach(s => {
      const d = (s && s.dataRef) || {};
      if(!d.matchId) return;
      const alt = besitzer.get(d.matchId);
      const rang = _istPartie(s) ? 2 : 1;
      if(!alt || rang > alt.rang) besitzer.set(d.matchId, {id:s.id, rang});
    });
    ausbalanciert = ausbalanciert.map(s => {
      const d = (s && s.dataRef) || {};
      if(!d.matchId) return s;
      const b = besitzer.get(d.matchId);
      if(!b || b.id === s.id) return s;
      return Object.assign({}, s, {dataRef: Object.assign({}, d, {bandFremd:true})});
    });
  }
  _cache._consolFrom = list;
  _cache._consolList = ausbalanciert;
  return ausbalanciert;
}

// Wird in loadAll() aufgerufen. DB-Read → Generator → DB-Upsert → DB-Read.
// Vollständig in try/catch gewrappt — Failures degradieren auf Fallback.
function _leerlauf(ms){
  return new Promise(fertig => {
    if(typeof requestIdleCallback === 'function') requestIdleCallback(() => fertig(), {timeout: ms});
    else setTimeout(fertig, 0);
  });
}

// Nur diese Rohereignisse dürfen am laufenden Kalendertag wachsen. Sie
// bilden zusammen die eine rollende Karte "Ewige Tafel". Alle anderen IDs
// sind unveränderliche Publikations-Snapshots.
const STORY_TAFEL_UPDATE = new Set(['rekord_erstmals','rekord_geholt','rekord_gesteigert',
  'insignium_stufe','insignium_tag','chronik_geholt']);
function _storyIstTafelUpdate(s, jetzt){
  if(!s) return false;
  const d = s.dataRef || s.data_ref || {};
  const w = s.when || s.event_at;
  if(!STORY_TAFEL_UPDATE.has(d.type) || d.schluss || !w) return false;
  return tagKey(w) === tagKey(jetzt || new Date());
}
// Der Stand, aus dem eine Fassung der Tafel gerechnet ist: die letzte
// Partie ihres Tages und, ob der Tag zu ist (`_tagZu`) — um 23:59 ändert
// sich die Tafel auch ohne Partie [§C35]. Als Zeichenkette sortierbar.
function _tafelFassung(tag, letzteMs){
  return String(letzteMs) + (_tagZu(tag) ? 'z' : '');
}
// Von jeder wachsenden Tageskarte gilt eine Fassung, die jüngste [§C33].
// Eine Fassung ist der ganze Stand des Tages: was in einer älteren stand und
// in der jüngsten fehlt, ist am selben Tag zurückgedreht worden. Gilt eine
// Fassung zu den Partien, die da sind, gewinnt sie auch gegen eine spätere —
// nach dem Löschen der letzten Partie eines Tages wäre die spätere falsch.
// Zeilen ohne `fassung` stammen aus der Zeit vor den Fassungen und gelten nur,
// wenn es für ihren Tag keine andere gibt.
// Die Zeichen-Karte eines Schlusses (`schluss`, die Woche) wächst nicht und
// hat keine Fassung: sie stand sonst mit der Karte des Montags in einer
// Gruppe und fiel gegen deren Fassung heraus.
function _tafelFassungen(list){
  if(!Array.isArray(list)) return list;
  const art = d => !STORY_TAFEL_UPDATE.has(d.type) || d.schluss ? '' : /^insignium_/.test(d.type) ? 'ins' : 'tafel';
  const gruppen = new Map();
  list.forEach(s => {
    const d = (s && s.dataRef) || {}, a = art(d);
    if(!a) return;
    const k = a + '|' + tagKey(s.when);
    const g = gruppen.get(k) || {max:'', alle:new Set()};
    const f = String(d.fassung || '');
    g.alle.add(f);
    if(f > g.max) g.max = f;
    gruppen.set(k, g);
  });
  if(!gruppen.size) return list;
  const letzte = new Map();
  (matches || []).forEach(m => { const t = mts(m), k = tagKey(t); if(t > (letzte.get(k) || 0)) letzte.set(k, t); });
  const gilt = new Map();
  gruppen.forEach((g, k) => {
    const tag = k.slice(k.indexOf('|') + 1);
    const soll = letzte.has(tag) ? _tafelFassung(tag, letzte.get(tag)) : '';
    gilt.set(k, g.alle.has(soll) ? soll : g.max);
  });
  return list.filter(s => {
    const d = (s && s.dataRef) || {}, a = art(d);
    return !a || String(d.fassung || '') === gilt.get(a + '|' + tagKey(s.when));
  });
}
function _mergeStorySnapshots(bestand, neu, jetzt){
  // Was vor dem Fenster des Feeds liegt, fällt hier heraus [§11.0d]: der Stand
  // des Geräts trägt jede Karte, die je geladen wurde, und ohne diesen Schnitt
  // bliebe eine Karte stehen, die die Datenbank längst nicht mehr liefert.
  const ab = newsAnzeigeAb(new Date(jetzt || Date.now()).getTime());
  const byId = new Map();
  (Array.isArray(bestand) ? bestand : []).forEach(s => { if(s && s.id) byId.set(s.id, s); });
  (Array.isArray(neu) ? neu : []).forEach(s => {
    if(!s || !s.id) return;
    if(!byId.has(s.id) || _storyIstTafelUpdate(s, jetzt)) byId.set(s.id, s);
  });
  return [...byId.values()].filter(s => new Date(s.when).getTime() >= ab)
    .sort(_storyFolge);
}

async function syncStoriesViaDb(){
  // ── Erst den Bestand kennen, dann ziehen ──────────────────────────
  // Der Generator lief zuerst, und der Upload danach: die Ziehung des
  // Fun Facts geschah damit BLIND. `_buildAmbientStories` liest aus
  // `_cache._stories`, welcher Slot schon existiert und welche Typen, Rubriken
  // und Koepfe die Tage davor belegt haben — ohne Bestand greift keine dieser
  // Sperren, und wer als Erster am Tag die App oeffnete, schrieb genau diese
  // blinde Ziehung in die Datenbank. Gemessen zog derselbe Slot mit Bestand
  // „Julian ist der Tageskoenig" und ohne „Leon gibt Vollgas".
  //
  // Der Vorlauf ist zugleich der eine reguläre SELECT dieses Syncs. Dadurch
  // kennt der Upload neue IDs und vermeidet periodische Komplett-Upserts.
  // Was dieses Gerät schon gerechnet hat, bleibt dabei stehen: der Bestand
  // der Datenbank kann eine ältere Fassung der Tafel tragen, und bis der
  // Generator fertig war, sprang der Feed auf sie zurück.
  let dbBestand = null;
  try {
    dbBestand = await _loadStoriesFromDb();
    if(Array.isArray(dbBestand)) _cache._stories = _mergeStorySnapshots(dbBestand, _cache._stories, new Date());
  } catch(e){}
  // ── Erst zeichnen, dann rechnen ───────────────────────────────────
  // Der Generator kostet kalt rund 370 ms am Stück. `loadAll` ruft diese
  // Funktion direkt nach `render()`, und ohne Pause dazwischen lief beides in
  // derselben Aufgabe: die neue Rangliste stand erst nach dem Generator auf
  // dem Bildschirm, und ein Tippen in dieser Zeit blieb liegen. Gewartet wird
  // auf einen ruhigen Moment, höchstens anderthalb Sekunden.
  // Gerechnet wird im Worker [§11.8b]; der Hauptthread nur, wenn der nicht
  // kann. Der ruhige Moment davor bleibt für diesen Rückfall.
  let generated = await _storiesImWorker();
  if(!generated){
    await _leerlauf(1500);
    try { generated = _buildStories() || []; }
    catch(e){ generated = []; if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] generator failed', e); }
  }

  // Versuch 1: DB-Pfad. Veröffentlicht und aufgeräumt wird nur von einem
  // Gerät mit der Uhr der Liga und nur aus den Partien von eben [§C42]; jedes
  // andere zeigt seine Stories nur sich selbst.
  try {
    if(ligaSchreibtAbgeleitet() && _datenFrisch()){
      await _cleanupExpiredStoriesInDb();      // 1× pro Sync, idempotent
      await _uploadNewStoriesToDb(generated, dbBestand);
    }
    if(!Array.isArray(dbBestand)) dbBestand = await _loadStoriesFromDb();
    if(Array.isArray(dbBestand)){
      _cache._stories = _mergeStorySnapshots(dbBestand, generated, new Date());
      _ensureStoriesRealtime(); // v8.4: Realtime erst nach erstem erfolgreichen DB-Sync
      _startNewsAutoSync();     // v8.5: ambiente Tages-Stories ohne Reload erscheinen lassen
      return;
    }
  } catch(e){
    // Migration evtl. noch nicht eingespielt → Tabelle fehlt → 42P01
    // oder Netzfehler. Defensiv: in-memory Fallback nutzen, App bleibt nutzbar.
    if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] DB sync failed, falling back to in-memory', e?.message || e);
  }

  // Versuch 2: in-memory Fallback (alter Zustand)
  _cache._stories = _mergeStorySnapshots(_cache._stories, generated, new Date());
}
window.syncStoriesViaDb = syncStoriesViaDb;

// ── DB-Helper ──
// Storage-Form ⇄ Runtime-Form Konversion. Story-Objekte des Generators
// haben `when` als Date; in der DB lebt das als `event_at` TIMESTAMPTZ.
function _storyToRow(s){
  return {
    id:          s.id,
    type:        (s.dataRef && s.dataRef.type) || s.id.split('_')[0] || 'unknown',
    category:    s.cat,
    icon:        s.ic || null,
    title:       s.title,
    description: s.desc,
    data_ref:    s.dataRef || {},
    priority:    s.prio | 0,
    event_at:    (s.when instanceof Date ? s.when : new Date(s.when)).toISOString(),
    // Ab dem Ereignis, nicht ab dem Einfügen [§11.0d]: der Feed zeigt einen
    // Monat, und eine Karte, die um 18 Uhr für 23:59 entstand, lief sonst
    // sechs Stunden zu früh ab.
    expires_at:  new Date((s.when instanceof Date ? s.when : new Date(s.when)).getTime()
                   + NEWS_HALTEN_TAGE * 86400000).toISOString(),
  };
}
function _rowToStory(r){
  return {
    id:       r.id,
    cat:      r.category,
    ic:       r.icon || undefined,
    title:    r.title,
    desc:     r.description,
    dataRef:  r.data_ref || {},
    prio:     r.priority | 0,
    when:     new Date(r.event_at),
  };
}

// Stories werden nur eingefügt (ON CONFLICT DO NOTHING): die Datenbank
// erlaubt kein Ändern einer Zeile, und eine veröffentlichte bleibt, wie sie
// ist [§C33]. Was wächst, wächst als neue Fassung (`_tafelFassung`).
function _storyStableJson(v){
  if(Array.isArray(v)) return '[' + v.map(_storyStableJson).join(',') + ']';
  if(v && typeof v === 'object'){
    if(v instanceof Date) return JSON.stringify(v.toISOString());
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + _storyStableJson(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
async function _uploadNewStoriesToDb(stories, bestand){
  if(!stories || !stories.length) return;
  const bekannt = new Set((Array.isArray(bestand) ? bestand : []).map(s => s.id));
  const neu = stories.filter(s => !bekannt.has(s.id)).map(_storyToRow);
  // In Batches → schützt vor Payload-Limits bei großen Datensätzen. (v8.4)
  // Realistisch sind ~30 Stories pro Sync → ein einziger Batch. 200 deckt auch
  // den Erststart nach langer Pause ab (Postgres erlaubt 1000+ Rows/INSERT).
  const BATCH_SIZE = 200;
  for(let i = 0; i < neu.length; i += BATCH_SIZE){
    const chunk = neu.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from('stories').upsert(chunk, {
      onConflict: 'id', ignoreDuplicates: true,
    });
    if(error) throw error;
  }
}

// Read: alle nicht-abgelaufenen Stories im Datumsfenster, newest first. Die
// hohe technische Reserve ist kein fachlicher Anzeigedeckel.
async function _loadStoriesFromDb(){
  // Geschnitten wird am DATUM [§11.0d]. Mit `.limit(100)` hing die
  // Fensterbreite daran, wie viel gerade los war: an einem starken Spieltag
  // entstehen sechsundzwanzig Karten, an einem stillen zwei. Gelesen wird der
  // ganze Monat zurück, nicht nur das Fenster des Generators: was dort steht,
  // ist eingefroren und kommt nur noch von hier.
  const _ab = new Date(newsAnzeigeAb(Date.now())).toISOString();
  const rows = [];
  for(let von = 0; ; von += NEWS_DB_SEITENGROESSE){
    const { data, error } = await sb.from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .gte('event_at', _ab)
      .order('event_at', { ascending: false })
      .range(von, von + NEWS_DB_SEITENGROESSE - 1);
    if(error) throw error;
    const seite = data || [];
    rows.push(...seite);
    if(seite.length < NEWS_DB_SEITENGROESSE) break;
  }
  return rows.map(_rowToStory);
}

// Cleanup: löscht alle abgelaufenen Stories. Idempotent, 1× pro Sync.
// Die RLS-Policy "stories_delete_old" erlaubt nur DELETE WHERE expires_at < NOW().
async function _cleanupExpiredStoriesInDb(){
  const { error } = await sb.from('stories')
    .delete()
    .lt('expires_at', new Date().toISOString());
  if(error){
    // 42P01 = Tabelle existiert nicht → Migration nicht eingespielt
    // → bubblen, syncStoriesViaDb fällt auf in-memory zurück
    throw error;
  }
}

