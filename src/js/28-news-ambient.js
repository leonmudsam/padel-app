// ─── §11.1b — Ambiente Fun-Fact-Stories (v8.5, v9.5) ─────────────────
// Erzeugt Fun Facts / persönliche Nuggets / Rivalitäten / Historie, damit der
// Feed auch OHNE neue Matches lebendig wirkt.
//
// KERNPRINZIP (kein Spam, Cross-Device-konsistent):
//   - RHYTHMUS: hoechstens ein Fun Fact pro Tag, fest um 15:00 Uhr.
//     Verpasste stille Tage im Feed-Fenster werden beim naechsten Oeffnen gefuellt.
//   - Story-ID ist tages+stunden-deterministisch: `ambient_<datum>_<stunde>`.
//     → ON CONFLICT DO NOTHING beim Upload: der erste Insert gewinnt den
//       Timestamp, alle Geräte sehen exakt dieselbe Story.
//   - Welchen Fun Fact der Slot zeigt, entscheidet ein aus dem Datum geseedeter
//     Pseudo-Zufall (mulberry32) — „random" fürs Gefühl, aber überall identisch.
//   - COOLDOWN: Fun-Fact-Typen, die in den letzten AMBIENT_COOLDOWN_DAYS Tagen
//     schon liefen, werden gesperrt → Rotation statt vorhersehbarer Reihenfolge,
//     keine schnellen Wiederholungen. Ist alles gesperrt, wird die Sperre gelöst.
//   - Die Inhalte stammen aus echten Daten (allPlayerStats, H2H-Map, Scores) —
//     nichts wird erfunden. Liefert ein Template kein Ergebnis (zu wenig Daten),
//     wird deterministisch das nächste genommen.
function _buildAmbientStories(now, pm, nameOf, tagesStories){
  const out = [];
  if(!Array.isArray(AMBIENT_SLOTS) || !AMBIENT_SLOTS.length) return out;
  // Taeglich; _isAmbientDay ist derzeit immer true.
  if(!_isAmbientDay(now)) return out;

  // Der Topf entsteht je Slot mit dessen Uhr (`poolAm`): jede Vorlage zählt
  // nur die Sätze bis 15:00 ihres Tages. Er stand einmal für alle Slots mit
  // der Uhr des Öffnens, und ein nachgetragener Tag erzählte von Sätzen,
  // die erst danach gespielt wurden. Die Schlüssel sind dieselben.
  const poolAm = when => _ambientTemplatePool(when, pm, nameOf);
  const templates = poolAm(now);
  if(!templates.length) return out;

  // ── Fällige Slots samt Nachlauf ──────────────────────────────────────
  // Ein Slot entsteht beim ersten Öffnen nach 15 Uhr. Wurde die Liga mehrere
  // Tage nicht geöffnet, werden stille vergangene Tage des Feed-Fensters
  // deterministisch nachgetragen. Tage mit Partien oder Saisonabschluss
  // bleiben frei. Ein persistierter Slot wird nie neu gezogen.
  //
  // Der Zeitstempel ist die SLOT-STUNDE und nicht der Moment des Entstehens.
  // Er war einmal `now`; damit nannte die Karte die Uhrzeit ihres Lesers und
  // nicht 15:00. Schlimmer: `event_at` gewinnt beim ersten Insert
  // und gilt dann für alle Geräte, also hing die Stelle der Karte im Feed
  // daran, wer die App zuerst geöffnet hat. Die Slot-Stunde ist dagegen aus
  // der ID ableitbar und auf jedem Gerät dieselbe. Dass die Karte damit unter
  // spätere Partien rutscht, ist richtig: der Feed ist chronologisch [§C33]
  // und eine Partie nach 15 Uhr darf den publizierten Funfact nicht entfernen.
  //
  // Datum und Uhrzeit kommen aus DERSELBEN lokalen Zeit. Vorher stand im
  // Schlüssel das UTC-Datum, in `when` aber die lokale Slot-Zeit — zwischen
  // Mitternacht und der UTC-Grenze trug eine Story deshalb ein Datum, das nicht
  // zu ihrem Zeitstempel passte.
  const _dayMs = 86400000;
  const dueSlots = [];
  const slotHours = AMBIENT_SLOTS.slice().sort((a, b) => a - b);
  const tageMitMatch = new Set((matches || []).map(m => tagKey(m.created_at)));
  // Eine ruhende Liga bekommt keine Fun Facts: liegt die letzte Partie vor
  // einem Slot AMBIENT_RUHE_TAGE oder länger zurück (oder gibt es noch keine),
  // fällt er aus. Sonst erzählte der Feed jeden Tag um 15 Uhr von einer Liga,
  // die gerade niemand spielt.
  const zeiten = (matches || []).map(mts).filter(Number.isFinite).sort((a, b) => a - b);
  const lebt = t => { let lo = 0, hi = zeiten.length - 1, z = null;
    while(lo <= hi){ const mid = (lo + hi) >> 1; if(zeiten[mid] <= t){ z = zeiten[mid]; lo = mid + 1; } else hi = mid - 1; }
    return z != null && t - z < AMBIENT_RUHE_TAGE * _dayMs; };
  const generation = Array.isArray(tagesStories) ? tagesStories : [];
  // Fehlende stille Tage werden innerhalb des Feed-Fensters nachgetragen.
  // Vergangene Tage sind nur still, wenn an ihnen gar nicht gespielt wurde.
  // Heute entscheidet dagegen der Stand um exakt 15 Uhr: ein Match danach
  // darf den zu diesem Zeitpunkt bereits publizierten Funfact nicht löschen.
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - NEWS_FENSTER_TAGE + 1);
  for(let tag = new Date(start); tag <= now; tag.setDate(tag.getDate() + 1)){
    const dk = tagKey(tag), istHeute = dk === tagKey(now);
    for(const slotHour of slotHours){
      const faellig = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate(), slotHour, 0, 0, 0);
      if(faellig.getTime() > now.getTime()) continue;
      if(!lebt(faellig.getTime())) continue;
      if(!istHeute && tageMitMatch.has(dk)) continue;
      if(istHeute && (matches || []).some(m => tagKey(m.created_at) === dk && mts(m) <= faellig.getTime())) continue;
      const saisonEnde = generation.some(s => (s.dataRef || {}).type === 'season_recap'
        && tagKey(s.when) === dk && new Date(s.when).getTime() <= faellig.getTime());
      if(saisonEnde) continue;
      dueSlots.push({dateKey: dk, slotHour, when: faellig});
    }
  }
  if(!dueSlots.length) return out;

  // Bereits persistierte Ambient-Stories: (a) ein Slot, der schon existiert, wird
  // nicht neu abgeleitet (Daten-Drift-Schutz, er kommt ohnehin aus dem DB-Cache);
  // (b) die der letzten Tage sperren ihren Fun-Fact-Typ bzw. ihre Köpfe.
  const known = (Array.isArray(_cache._stories) ? _cache._stories : [])
    .filter(s => s && typeof s.id === 'string' && s.id.indexOf('ambient_') === 0);
  const knownById = new Map(known.map(s => [s.id, s]));
  // Wer in den drei Tagen vor einem Slot keine eigene Karte hatte — Spieler
  // des Tages, Woche, Runde, Tafel —, wird im ersten Durchgang bevorzugt.
  // Die Sperren darunter kennen nur die Fun Facts; gemessen standen damit
  // sieben von elf Spielern auf den ausgewählten Karten einer Woche und die
  // übrigen nur auf ihren Partien [§C33]. Eine Partie-Karte zählt nicht: wer
  // oft spielt, steht oft darauf, und das ist der Spielplan. Eine Karte ohne
  // Person bevorzugt niemanden und kommt erst im nächsten Durchgang.
  const feedPidsZwischen = (vonMs, bisMs) => {
    const set = new Set();
    if(typeof _newsPids !== 'function') return set;
    generation.forEach(s => {
      const t = new Date(s.when).getTime(), d = s.dataRef || {};
      if(!(t >= vonMs && t <= bisMs) || d.type === 'spiel' || d.type === 'ambient') return;
      try { (_newsPids(s) || []).forEach(p => set.add(p)); } catch(e){}
    });
    return set;
  };

  // v9.11: Cooldown ist PRO Typ. Standard = AMBIENT_COOLDOWN_DAYS; ein Template
  // darf ihn via `cooldown` verkürzen, wenn sein Inhalt bei jedem Lauf ein
  // anderer ist und deshalb früher wiederkommen darf.
  const cooldownDaysOf = {};
  for(const t of templates) cooldownDaysOf[t.key] = t.cooldown || AMBIENT_COOLDOWN_DAYS;
  const pidsOf = dr => !dr ? [] : (Array.isArray(dr.ambientPids) ? dr.ambientPids : (dr.ambientPid ? [dr.ambientPid] : []));
  // Jede Frage hat ihre Rubrik fest; die Muster darunter lesen die
  // Schlüssel gespeicherter Karten, die ihre Rubrik noch nicht trugen. Die
  // Duos stehen unter einer eigenen: unter „Spieler im Fokus“ las sich ein
  // Paar wie ein Spieler, und die Sperre der Rubrik hielt Duo und Seite
  // auseinander, obwohl sie nichts miteinander zu tun haben. Gespeicherte
  // Karten tragen ihre Rubrik selbst (`ambientRubrik`) und bleiben, wie sie
  // sind.
  const RUBRIK = {form_aufwind:'form', form_erwartung:'form', form_laufbahn:'form',
    form_serie:'form', form_wende:'form',
    laufbahn_marke:'laufbahn', gesamt_tafel:'laufbahn', gesamt_wettlauf:'laufbahn',
    chronik_reihe:'chronik', rekord_reichweite:'chronik',
    duo_chemie:'duo', duo_spitze:'duo', duo_neu:'duo',
    rolle_seite:'persoenlich', spieler_knapp:'persoenlich', seite_spitze:'persoenlich',
    duell_gleichauf:'duell', duell_wende:'duell',
    gesamt_prestige:'auszeichnung', auszeichnung_monat:'auszeichnung',
    saison_stand:'saison', saison_vormonat:'saison',
    liga_marke:'liga', liga_ergebnisse:'liga', liga_tempo:'liga'};
  const rubrikVon = key => {
    if(RUBRIK[key]) return RUBRIK[key];
    if(/^award_/.test(key)) return 'auszeichnung';
    if(/^rivalry_/.test(key)) return 'duell';
    if(/^personal_/.test(key)) return 'persoenlich';
    if(/^(insignium_|titelband_)/.test(key)) return 'laufbahn';
    if(/^(chronicle_|season_|history_)/.test(key)) return 'chronik';
    if(/^(form_|fun_streak|fun_comeback)/.test(key)) return 'form';
    return 'liga';
  };

  // Die Rotation der letzten Tage, aus dem was in der DB liegt. Steht der
  // Bestand noch nicht bereit — `loadAll` zeichnet, bevor `syncStoriesViaDb`
  // gelaufen ist —, zieht der Lauf ohne Sperren und damit eine andere Karte als
  // der Lauf mit Bestand. Fuer den Slot von heute ist das die erste und einzige
  // Ziehung; alles Aeltere steht schon in der DB. Damit der Bestand ueberhaupt
  // gesehen wird, traegt der Memo-Schluessel des Generators die Zahl der
  // gespeicherten Fun Facts, und `syncStoriesViaDb` laedt sie, bevor es zieht.
  const history = [];
  for(const s of known){
    const md = /^ambient_(\d{4}-\d{2}-\d{2})_/.exec(s.id);
    if(!md) continue;
    const sub = (s.dataRef && s.dataRef.sub) || null;
    history.push({day: md[1], ts: new Date(md[1] + 'T00:00:00').getTime(), sub,
                  rubrik:(s.dataRef && s.dataRef.ambientRubrik) || rubrikVon(sub || ''),
                  pids: pidsOf(s.dataRef)});
  }

  for(const slot of dueSlots){
    // Steht der Slot schon in der DB, ist nichts nachzutragen — es sei denn,
    // die Karte dort ist abgemeldet (`_storyAbgemeldet`): dann gibt sie den
    // Slot frei, und der Ersatz bekommt die nächste freie ID (`_2`, `_3`, …),
    // weil die Datenbank keine Zeile ändert [§C33]. Am 28.10. schrieb ein
    // Gerät mit der Fassung vor dem Streichen des Umsteigers um 15:19 dessen
    // Karte in den Slot; die neue Fassung blendete sie aus und fand den Slot
    // belegt, und der Tag blieb ohne Fun Fact.
    let slotId = 'ambient_' + slot.dateKey + '_' + slot.slotHour, belegt = false;
    for(let n = 2; knownById.has(slotId); n++){
      if(!_storyAbgemeldet(knownById.get(slotId))){ belegt = true; break; }
      slotId = 'ambient_' + slot.dateKey + '_' + slot.slotHour + '_' + n;
    }
    if(belegt) continue;

    // Sperren immer aus Sicht des SLOT-TAGES, nicht aus Sicht von jetzt.
    const refMs = new Date(slot.dateKey + 'T00:00:00').getTime();
    // v9.11: Typ-Cooldown — was zuletzt lief, kommt nicht sofort wieder.
    const cooldownKeys = new Set();
    // Innerhalb desselben Tages bleibt der Typ eindeutig.
    const usedToday = new Set();
    const usedRubriken = new Set();
    const recentRubriken = new Set();
    // v9.10 + v9.14: Same-Player-Sperre, heute (usedPids) und über die letzten
    // AMBIENT_PLAYER_COOLDOWN_DAYS (recentPids). Viele Templates sind „Wer führt
    // bei Stat X?"-Superlative und zeigen bei einem dominanten Spieler alle auf
    // denselben Kopf — ohne die Sperre feiert der Feed tagelang den Platzhirsch.
    const usedPids = new Set();
    const recentPids = new Set();
    // Typ und Kopf zusammen: `sub|pid` der letzten AMBIENT_PAAR_COOLDOWN_DAYS Tage.
    const recentPaare = new Set();
    for(const h of history){
      if(h.day === slot.dateKey){
        if(h.sub) usedToday.add(h.sub);
        if(h.rubrik) usedRubriken.add(h.rubrik);
        for(const pid of h.pids) usedPids.add(pid);
      }
      const age = refMs - h.ts;
      if(age < 0) continue;   // liegt nach diesem Slot — zählt hier nicht
      if(h.sub && age <= (cooldownDaysOf[h.sub] || AMBIENT_COOLDOWN_DAYS) * _dayMs) cooldownKeys.add(h.sub);
      if(h.rubrik && age <= AMBIENT_RUBRIK_COOLDOWN_DAYS * _dayMs) recentRubriken.add(h.rubrik);
      if(age <= AMBIENT_PLAYER_COOLDOWN_DAYS * _dayMs){ for(const pid of h.pids) recentPids.add(pid); }
      if(h.sub && age <= AMBIENT_PAAR_COOLDOWN_DAYS * _dayMs){
        // Eine These OHNE Person ist der Typ selbst. Gemerkt wurde sie nicht,
        // weil die Schleife ueber die Koepfe lief und es dort keinen gibt:
        // „2 tragen den Reif, 7 den Schildring" haengt an der ganzen Liga.
        // Gemessen ueber vierzig nachgespielte Tage stand `insignium_stand`
        // damit nach drei, vier und sechs Tagen wieder da — der Typ-Cooldown
        // von sieben Tagen faellt ab dem zweiten Durchgang, und ein
        // personenloses Template liefert immer ein Ergebnis.
        if(!h.pids.length) recentPaare.add(h.sub + '|');
        for(const pid of h.pids) recentPaare.add(h.sub + '|' + pid);
      }
    }

    // Die Rubrik des Fun Facts davor ist immer gesperrt, egal wie lange er
    // her ist. Zwischen zwei stillen Tagen liegen oft Spieltage ohne Slot,
    // und die Sperre ueber zwei Tage liess nach vier Tagen „Auszeichnung"
    // unter „Auszeichnung" stehen — im Feed direkt untereinander.
    let letzte = null;
    for(const h of history){ if(h.ts < refMs && h.rubrik && (!letzte || h.ts > letzte.ts)) letzte = h; }
    if(letzte) recentRubriken.add(letzte.rubrik);
    const feedPids = feedPidsZwischen(refMs - 3 * _dayMs, slot.when.getTime());

    const rng = _ambientRng(_ambientHash(slot.dateKey + '_' + slot.slotHour));
    const topf = poolAm(slot.when);
    // Templates in geseedeter Reihenfolge prüfen; erstes passende mit Ergebnis
    // gewinnt → variiert pro Slot/Tag, bleibt aber deterministisch.
    // v9.11: GEWICHTETE Reihenfolge — ein Template mit `weight` > 1 kommt
    // `weight`-fach in den Lostopf und landet dadurch statistisch früher, wird
    // also bei gleicher Eignung öfter gewählt (mehr „Mischung", kein Monopol).
    const bag = [];
    templates.forEach((t, i) => { const w = Math.max(1, t.weight || 1); for(let k = 0; k < w; k++) bag.push(i); });
    const seenIdx = new Set();
    const order = [];
    for(const i of _ambientShuffle(bag, rng)){ if(!seenIdx.has(i)){ seenIdx.add(i); order.push(i); } }
    let chosen = null, chosenKey = null;
    // Pass 0: Typ-Cooldown + heute-schon-genutzter Typ + Same-Player (heute UND
    //         letzte Tage) meiden → ideal frisch.
    // Pass 1: Typ-Cooldown gelockert, Same-Player (heute + letzte Tage) bleibt
    //         gesperrt → Namens-Rotation hat Vorrang vor Typ-Frische.
    // Pass 2: Notnagel — auch Same-Player erlaubt (falls nur der Platzhirsch
    //         überhaupt Templates befüllt), Typ-Sperre des Tages bleibt.
    // PFLICHT-SLOTS gehen vor: Ein Rückblick, der auf ein Datum gehört,
    // darf nicht vom Losverfahren abhängen. Trifft eine Pflicht-Bedingung
    // zu und liefert das Template ein Ergebnis, ist der Slot vergeben.
    let chosenPflicht = null, chosenPflichtKey = null;
    for(const t of topf){
      if(typeof t.pflicht !== 'function') continue;
      if(!t.pflicht(slot.dateKey, slot.slotHour)) continue;
      let res = null;
      try { res = t.make(_ambientRng(_ambientHash(slot.dateKey + '_p'))); } catch(e){ res = null; }
      if(res){ chosenPflicht = res; chosenPflichtKey = t.key; break; }
    }

    // Der 15-Uhr-Slot mischt aktuelle Staende und Rueckblicke.
    const rolle = _ambientRolleFuerSlot(slot.slotHour);
    // Vier Durchgaenge. Die Paar-Sperre (derselbe Fakt ueber dieselbe Person
    // hoechstens einmal im Monat) gilt in jedem: findet keiner etwas Frisches,
    // bleibt der Slot leer — ein Fun Fact entsteht nur, wenn er etwas Neues
    // sagt. Seit ein Fun Fact eine von acht Fragen beantwortet [§C33], liess
    // der letzte Durchgang sie fallen und schrieb dieselbe These ueber
    // dieselbe Person nach wenigen Tagen wieder.
    // Durchgang −1 ist Durchgang 0 mit einer Bedingung mehr: die Karte zeigt
    // jemanden, der in den drei Tagen davor keine eigene Karte hatte.
    for(let pass = -1; pass < 4 && !chosen; pass++){
      for(const idx of order){
        const t = topf[idx];
        // Ein Rückblick mit festem Termin gehört nur seinem Tag. Er lag mit im
        // Lostopf und zog an jedem anderen: gemessen stand „Der August ist
        // zur Hälfte gespielt" am 6. März, am 6. April und am 24. Juni, mit
        // dem Monat des Lesers statt dem des Slots.
        if(typeof t.pflicht === 'function') continue;
        if(usedToday.has(t.key)) continue;
        if(pass <= 0 && cooldownKeys.has(t.key)) continue;
        if(pass < 2 && (usedRubriken.has(rubrikVon(t.key)) || recentRubriken.has(rubrikVon(t.key)))) continue;
        if(pass < 2){
          const r = _ambientRolleVon(t.key);
          if(rolle !== 'mix' && r && r !== rolle) continue;
        }
        let res = null;
        try { res = t.make(rng); } catch(e){ res = null; }
        if(!res) continue;
        const pids = pidsOf(res.dataRef);
        if(pass < 2){
          // Sowohl heute schon gefeierte (usedPids) als auch in den letzten
          // AMBIENT_PLAYER_COOLDOWN_DAYS Tagen gefeierte (recentPids) Köpfe meiden.
          if(pids.length && pids.some(p => usedPids.has(p) || recentPids.has(p))) continue;
        }
        if(pass < 0 && (!pids.length || pids.some(p => feedPids.has(p)))) continue;
        // Derselbe Fakt über dieselbe Person nicht zweimal im Monat, in
        // keinem Durchgang.
        if(pids.length
            ? pids.some(p => recentPaare.has(t.key + '|' + p))
            : recentPaare.has(t.key + '|')) continue;
        chosen = res; chosenKey = t.key; break;
      }
    }
    if(chosenPflicht){ chosen = chosenPflicht; chosenKey = chosenPflichtKey; }
    if(!chosen) continue;
    // Sofort in die Historie eintragen: ein nachfolgender Backfill-Tag sieht
    // diesen Eintrag bereits und meidet Typ und Kopf.
    history.push({day: slot.dateKey, ts: refMs, sub: chosenKey,
                  rubrik:rubrikVon(chosenKey), pids: pidsOf(chosen.dataRef)});

    out.push({
      id:    slotId,
      cat:   chosen.cat,
      ic:    chosen.ic,
      // Eine Zahl ab fünf Stellen mit Tausenderpunkt, wie in jeder Story [§C27].
      title: tausender(chosen.title),
      desc:  tausender(chosen.desc),
      when:  slot.when,
      // Niedrige Prio + KEIN limitierender dataRef.pid (nur ambientPid/-Pids),
      // damit ambiente Stories nicht vom Per-Player-Limit geschluckt werden.
      // Der Rang eines Templates (2 bis 7) ordnet nur den Fun-Fact-Topf
      // untereinander. Als blanke Zahl stand er auf derselben Skala wie eine
      // Pleitenserie und damit im falschen Band [§11.0a]; er wird deshalb
      // auf das Fun-Fact-Band abgebildet.
      prio:  STORY_PRIO.ambient
             + Math.max(0, Math.min(AMBIENT_PRIO_SPANNE, (chosen.prio || 4))),
      // v9.17: vv/vl = optionale Kennzahl für den Mini-Chip rechts auf der Karte
      // (_newsVisual). Fun Facts standen bisher als reiner Text im Feed, während
      // jede andere Story ihre Zahl groß anzeigt — die Kennzahl macht sie auf
      // einen Blick lesbar. Wandert in dataRef, damit sie mitpersistiert wird.
      dataRef: Object.assign({type:'ambient', sub: chosenKey, ambientRubrik:rubrikVon(chosenKey)},
                             chosen.dataRef || {},
                             // Der große Wert wie der Satz: lange Zahlen mit Tausenderpunkt.
                             chosen.vv != null ? {vv: tausender(chosen.vv), vl: chosen.vl || ''} : {})
    });
  }
  return out;
}

// FNV-1a-Hash → 32-bit Seed (deterministisch, schnell).
function _ambientHash(str){
  let h = 2166136261 >>> 0;
  for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// mulberry32 PRNG → reproduzierbare Pseudo-Zufallszahlen [0,1).
function _ambientRng(seed){
  let a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Fisher-Yates mit geseedetem rng (verändert das Original nicht).
function _ambientShuffle(arr, rng){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ── Was ein Fun Fact braucht, damit seine Daten tragen [§C33] ──────────
// Die Schwellen aller Fragen an einer Stelle. Gesetzt sind sie nach dem,
// wie die Liga spielt — etwa fünf Spieltage im Monat, zwei bis drei Sätze
// je Spieler und Tag, zehn bis fünfzehn im Monat —, und nicht nach der
// Testliga, die erfunden ist. Mit weniger als fünf Sätzen ist eine Quote
// ein Zufall (aus fünf Sätzen sind 80 % ein einziger Sieg mehr als 60 %).
// Eine Marke ist „in Sicht", wenn ein Spieltag sie holen kann.
const FF_MIN = {
  tage:14,            // das Fenster der Form, wie im Rest des Feeds
  saetze14:10,        // Sätze im Fenster, damit eine Form eine Form ist
  aufwind:100,        // Elo in vierzehn Tagen, damit es ein Aufwind ist
  ueberSiege:3,       // Siege über der Erwartung in vierzehn Tagen
  laufbahn:30,        // Sätze der Laufbahn davor, damit sie ein Maßstab ist
  abweichung:.20,     // Siegquote der vierzehn Tage über der Laufbahn
  markeSaetze:10,     // so viele Sätze vor einer runden Zahl
  markeSiege:5,       // so viele Siege
  markeGames:50,      // so viele gewonnene Games
  markePrestige:50,   // so viel Prestige vor der nächsten Schwelle der Leiter
  chronikMonate:3,    // Monate in der Chronik für eine Reihe
  duoSaetze:15,       // gemeinsame Sätze für die Chemie, zwei Spieltage zusammen
  duoUeber:.05,       // Leistung über der Erwartung, 5 Prozentpunkte
  duoMehr:2,          // so viele Siege mehr als erwartet, damit der Satz stimmt
  rolleSaetze:30,     // Sätze für ein Seitenprofil, das trägt
  rolleMeist:.60,     // Anteil der Sätze auf der schwächeren Seite
  wechsel:.40,        // so weit verschiebt sich der Anteil einer Seite
  wechselVor:20,      // Sätze davor, gegen die ein Wechsel misst
  ligaSaetze:100,     // die runde Zahl der Sätze der Liga (ab 1000 je 500)
  ligaGames:1000,     // die runde Zahl der Games (ab 10.000 je 5000)
  ligaRestSaetze:20,  // so viele Sätze vor der Marke der Liga
  ligaRestGames:200,  // so viele Games
  serie:4,            // Siege in Folge, mindestens zwei Spieltage
  serieRest:2,        // so viele Siege vor der eigenen Bestmarke
  wenden:2,           // gedrehte Matches in dreißig Tagen
  knapp:10,           // knappe und übrige Sätze, je gut ein Monat
  knappPlus:.15,      // so viel höher die Quote in den knappen Sätzen
  seiteSaetze:10,     // Sätze auf der Seite für jeden auf ihrem Podest
  duoRang:10,         // gemeinsame Sätze des erfolgreichsten Duos
  duoNeu:4,           // gemeinsame Sätze in vierzehn Tagen, zwei Spieltage
  duoNeuVor:1,        // höchstens so viele davor
  duellSaetze:20,     // Sätze gegeneinander, damit eine Bilanz trägt
  duellGleich:.10,    // so nah beieinander heißt gleichauf
  duellLetzte:6,      // die letzten Sätze gegeneinander für eine Wende
  wettlauf:{siege:3, saetze:5, games:25},  // so nah liegen die ersten zwei
  standTag:8,         // ab diesem Tag hat ein Monat eine Spitze
  standSaetze:5,      // Sätze des Führenden im Monat, wie `ST_TEIL`
  vormonatSaetze:8,   // Sätze in beiden Monaten
  vormonatPlaetze:3,  // so viele Plätze besser als im Vormonat
  ergebnisMonat:20,   // Sätze der Liga im Monat, drei Spieltage
  ergebnisVor:60,     // Sätze davor, gegen die sie misst
  ergebnisPlus:.08,   // so viel häufiger ein Ergebnis
  tempoMonate:3,      // so viele Monate davor schlägt das Tempo
  awMonat:5,          // Auszeichnungen im Monat für eine Spitze
  rekordNah:.15       // so nah am Rekord, gemessen an seinem Wert
};

// ── Der Topf der Fun Facts [§C33] ─────────────────────────────────────
// Jede Vorlage beantwortet genau eine Frage und legt die Daten ihres Bilds
// in `bild` (`_faktBild`, 30c-news-fakt.js): Aufwind, über der Erwartung,
// Form gegen Laufbahn, Marke in Sicht, Chronik einer Laufbahn, Duo-Chemie,
// Rolle und die Gesamtwerte der Liga. Dazu die beiden Rückblicke mit
// festem Termin.
// Vorher standen hier sechsunddreißig Vorlagen, und die meisten nannten
// einen Einzeleintrag oder einen Stand: „Aus der Chronik: 29 von 118
// vergeben", „holte zuletzt Gold", wer bei den Siegen führt, eine zufällige
// Kennzahl eines zufälligen Spielers, die Zahl der Spieltage. Sie sahen
// einander ähnlich, und keiner erzählte, was sich bewegt. Was bleibt, hat
// eine Entwicklung, einen Vergleich oder ein Ziel.
//
// `now` ist die Uhr des Slots. Gezählt wird nur, was bis dahin gespielt
// war: ein nachgetragener Slot sah sonst die Sätze der Tage danach, und die
// Karte erzählte vom Tag ihres Lesers statt vom Tag, an dem sie stand.
function _ambientTemplatePool(now, pm, nameOf){
  // Ein Fun Fact erzählt von der Liga, wie sie heute antritt [§C40]: ein
  // Ruheständler kommt nicht vor — auch nicht als Partner oder im Feld.
  const aktiv = id => ligaAktiv(pm[id]);
  const activePids = Object.keys(pm).filter(aktiv);
  const T = [];
  const jetzt = now.getTime(), TAG = 86400000;
  const ab = jetzt - FF_MIN.tage * TAG, ab90 = ab - 90 * TAG;
  const pct = x => Math.round(x * 100);
  const vz = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(Math.round(v));
  const wort = (n, eins, viele) => n === 1 ? eins : n + ' ' + viele;

  // ── Ein Gang durch die Sätze bis zum Slot, für alle Vorlagen ───────
  // Je Spieler Laufbahn, die vierzehn Tage und die neunzig davor, je Duo
  // Leistung gegen die Erwartung, dazu das Seitenprofil und die Liga.
  // Leistung heißt wie im Positionsprofil und im Netz der Duos [§C44]: je
  // Satz Sieg und Games gegen die Erwartung aus der Elo aller vier
  // (`m.exp_a`), je zur Hälfte (`posGameLeistung`). Das Profil schreiben
  // dieselben Zähler fort wie die Elo-Rechnung (`posZaehlenPartie`), damit
  // die Karte dieselbe Lage zeigt wie die Seiten-Landkarte.
  let _basis = null;
  const basis = () => {
    if(_basis) return _basis;
    const liste = (matches || []).filter(m => mts(m) <= jetzt).sort((a, b) => mts(a) - mts(b));
    const je = {}, pos = {}, duo = {}, geg = {};
    const liga = {n:0, games:0, saetze:[], monate:{}, tage:{}, erg:{}, je:{}};
    const leer = pid => ({pid, n:0, w:0, gf:0, first:null, verlauf:[],
      n14:0, w14:0, e14:0, gf14:0, ge14:0, gt14:0, perf14:0, d14:0, dr14:0,
      nVor:0, wVor:0, drVor:0, n90:0, d90:0,
      // Je Saison Sätze, Siege und Elo (die Summe der Deltas, die Elo
      // beginnt jeden Monat neu), dazu derselbe Stand vor vierzehn und vor
      // sieben Tagen. Daraus die Monatstabelle und die Karriere-Elo zum
      // Slot, wie `saisonRang` und `getGlobalSim` sie rechnen — die beiden
      // kennen nur den Stand von jetzt, und ein nachgetragener Slot hätte die
      // Sätze der Tage danach gezählt.
      sz:{}, lauf:0, laufAb:null, bestVor:0, kn:0, kw:0, on:0, ow:0, mon:{}, beg:0, begW:0, wenden:[]});
    const sidVon = {}, sidOf = m => { const k = String(m.created_at).slice(0, 10);
      return sidVon[k] || (sidVon[k] = seasonOf(m.created_at).id); };
    const woche = jetzt - 7 * TAG, monat30 = jetzt - 30 * TAG;
    for(const m of liste){
      const p = partie(m);
      if(p.winner !== 'A' && p.winner !== 'B') continue;
      const t = mts(m), e = m.exp_a != null ? m.exp_a : .5, d = m.deltas || {};
      const g = (p.gamesA || 0) + (p.gamesB || 0);
      liga.n++; liga.games += g;
      liga.saetze.push({m, t, n:liga.n, games:liga.games});
      const mk = String(m.created_at).slice(0, 7), sid = sidOf(m);
      liga.monate[mk] = {n:liga.n, games:liga.games};
      (liga.tage[mk] || (liga.tage[mk] = new Set())).add(tagKey(t));
      liga.je[mk] = (liga.je[mk] || 0) + 1;
      // Das Ergebnis eines Satzes in der Reihe der Verteilung (6:0 bis 7:6,
      // `FF_SAETZE`); ein Match-Tiebreak und ein offener Satz zählen nicht.
      const s0 = partieSaetze(m)[0];
      if(s0 && s0.art !== 'mtb' && s0.art !== 'open'){
        const i = FF_SAETZE.indexOf(Math.max(s0.a, s0.b) + ':' + Math.min(s0.a, s0.b));
        const z = liga.erg[mk] || (liga.erg[mk] = FF_SAETZE.map(() => 0));
        if(i >= 0) z[i]++;
      }
      // Das Match, das an diesem Satz endet (`begegnungAm`), aus Sicht von
      // Team A dieses Satzes: gedreht heißt, der erste Satz ging verloren.
      const bg = t > monat30 ? begegnungAm(m) : null;
      const bgOk = bg && bg.winner && bg.n > 1;
      [m.a1, m.a2, m.b1, m.b2].forEach(id => { if(id && !pos[id]) pos[id] = posZaehler(); });
      posZaehlenPartie(pos, m, p.winner === 'A', e);
      [[m.a1, m.a1_side, true], [m.a2, m.a2_side, true], [m.b1, m.b1_side, false], [m.b2, m.b2_side, false]].forEach(([id, seite, onA]) => {
        if(!id) return;
        const x = je[id] || (je[id] = leer(id));
        const won = (p.winner === 'A') === onA, exp = onA ? e : 1 - e;
        const gf = onA ? p.gamesA : p.gamesB, ga = onA ? p.gamesB : p.gamesA;
        const delta = Number(d[id]) || 0, drive = seite === 'drive' ? 1 : 0;
        x.n++; if(won) x.w++; x.gf += gf || 0; if(x.first == null) x.first = t;
        x.verlauf.push({t, d:delta});
        const sz = x.sz[sid] || (x.sz[sid] = {n:0, w:0, d:0, nAb:0, dAb:0, nW:0, dW:0});
        sz.n++; if(won) sz.w++; sz.d += delta;
        if(t <= ab){ sz.nAb++; sz.dAb += delta; }
        if(t <= woche){ sz.nW++; sz.dW += delta; }
        if(won){ if(!x.lauf) x.laufAb = t; x.lauf++; }
        else { x.bestVor = Math.max(x.bestVor, x.lauf); x.lauf = 0; }
        // Knapp wie überall [§1.3]: höchstens zwei Games Abstand oder im
        // Tiebreak entschieden (`partie(m).knapp`).
        if(p.knapp){ x.kn++; if(won) x.kw++; } else { x.on++; if(won) x.ow++; }
        x.mon[mk] = {n:x.n, w:x.w, g:x.gf};
        if(bgOk){
          const bw = (bg.winner === 'A') === onA;
          x.beg++; if(bw) x.begW++;
          if(bw && bg.wende) x.wenden.push({t, m, saetze:bg.saetze.map(z => onA ? [z.a, z.b] : [z.b, z.a])});
        }
        if(t > ab){
          x.n14++; if(won) x.w14++; x.e14 += exp; x.gf14 += gf || 0; x.gt14 += (gf || 0) + (ga || 0);
          // Erwartet ist ein Vorsprung in Games wie die Siegchance über
          // 50 %: bei 75 % ein Viertel mehr Games, also 62,5 % der Games.
          x.ge14 += ((gf || 0) + (ga || 0)) * (exp + .5) / 2;
          x.perf14 += ((won ? 1 : 0) - exp + posGameLeistung(gf || 0, ga || 0, exp)) / 2;
          x.d14 += delta; x.dr14 += drive;
        } else {
          x.nVor++; if(won) x.wVor++; x.drVor += drive;
          if(t > ab90){ x.n90++; x.d90 += delta; }
        }
      });
      [[m.a1, m.a2, p.winner === 'A', e, p.gamesA, p.gamesB], [m.b1, m.b2, p.winner === 'B', 1 - e, p.gamesB, p.gamesA]]
        .forEach(([x, y, w, exp, gf, ga]) => {
          if(!x || !y) return;
          const k = paarKey(x, y), z = duo[k] || (duo[k] = {g:0, w:0, e:0, s:0, n14:0, w14:0, nVor:0, t:[]});
          z.g++; if(w) z.w++; z.e += exp;
          z.s += ((w ? 1 : 0) - exp + posGameLeistung(gf || 0, ga || 0, exp)) / 2;
          z.gf = (z.gf || 0) + (gf || 0); z.ga = (z.ga || 0) + (ga || 0);
          if(t > ab){ z.n14++; if(w) z.w14++; } else z.nVor++;
          z.t.push(t);
          // Derselbe Stand vor vierzehn Tagen, für die Spitze der Duos.
          if(t <= ab){ z.gAb = (z.gAb || 0) + 1; if(w) z.wAb = (z.wAb || 0) + 1; }
        });
      // Sätze gegeneinander: je Paar von Gegnern, wer den Satz holte.
      [m.a1, m.a2].forEach(x => [m.b1, m.b2].forEach(y => {
        if(!x || !y) return;
        const k = paarKey(x, y), o = geg[k] || (geg[k] = {k, n:0, folge:[]});
        o.n++; o.folge.push({m, t, s:p.winner === 'A' ? x : y});
      }));
    }
    return (_basis = {liste, je, pos, duo, geg, liga});
  };
  const feld = () => { const B = basis(); return activePids.map(pid => B.je[pid]).filter(Boolean); };

  // ── 1. Aufwind: wer in vierzehn Tagen am meisten Elo holt ──────────
  // Gezählt wird, was die Sätze an Elo gebracht haben, nicht der Stand:
  // die Elo beginnt jeden Monat neu, und ein Fenster über den Monatswechsel
  // hätte sonst einen Absturz gezeigt, wo nur der Monat endete. Die Linie
  // ist dieselbe Summe Satz für Satz, die Wochen davor leise, die vierzehn
  // Tage hell.
  T.push({key:'form_aufwind', make: () => {
    const x = feld().filter(y => y.n14 >= FF_MIN.saetze14 && y.nVor >= FF_MIN.saetze14 && y.d14 >= FF_MIN.aufwind)
      .sort((a, b) => b.d14 - a.d14 || (a.pid < b.pid ? -1 : 1))[0];
    if(!x) return null;
    const ver = x.verlauf, i14 = ver.findIndex(v => v.t > ab);
    // Höchstens dreißig Punkte davor und vierzig im Fenster: mehr sind auf
    // 250 Pixeln Breite nur Rauschen. Gekürzt wird gleichmäßig, die Summe
    // bleibt die ganze.
    const davor = ver.slice(Math.max(0, i14 - Math.max(FF_MIN.saetze14, x.n14 * 2)), i14);
    const auswahl = (l, n) => l.length <= n ? l.map((_, i) => i) : Array.from({length:n}, (_, k) => Math.round((k + 1) * l.length / n) - 1);
    let s = 0;
    const vorVals = davor.map(v => (s += v.d)), fenVals = ver.slice(i14).map(v => (s += v.d));
    const v = [0].concat(auswahl(vorVals, 30).map(k => vorVals[k]));
    const abIdx = v.length - 1;
    auswahl(fenVals, 40).forEach(k => v.push(fenVals[k]));
    const N = nameOf(x.pid), seitErst = x.first > ab90;
    return {cat:'personal', ic:'trendUp', prio:5,
      title:`${N} holt in 14 Tagen ${Math.round(x.d14)} Elo`,
      desc:`${N} gewann ${x.w14} von ${x.n14} Sätzen. `
        + (seitErst ? `Davor kamen seit dem ersten Satz am ${datumFmt(x.first, 'tmx')} ${vz(x.d90)} Elo zusammen.`
                    : `In den drei Monaten davor kamen ${vz(x.d90)} Elo zusammen.`),
      dataRef:{ambientPid:x.pid, bild:{f:'aufwind', p:x.pid, v:v.map(y => Math.round(y)), ab:abIdx,
        plus:Math.round(x.d14), n:x.n14, w:x.w14, vor:Math.round(x.d90), nVor:seitErst ? x.nVor : x.n90, seit:seitErst ? x.first : null}}};
  }});

  // ── 2. Über der Erwartung: wer mehr gewinnt, als die Elo sagt ──────
  // Gereiht nach der Leistung je Satz, mit POS_SCHRUMPF Sätzen zur Mitte
  // gezogen wie im Netz der Duos: zwölf Sätze sagen mehr als zehn. Das Bild
  // zeigt beide Hälften der Leistung, Siege und Games, je gegen ihre
  // Erwartung.
  T.push({key:'form_erwartung', make: () => {
    const x = feld().filter(y => y.n14 >= FF_MIN.saetze14 && y.w14 - y.e14 >= FF_MIN.ueberSiege)
      .sort((a, b) => b.perf14 / (b.n14 + POS_SCHRUMPF) - a.perf14 / (a.n14 + POS_SCHRUMPF) || (a.pid < b.pid ? -1 : 1))[0];
    if(!x) return null;
    const N = nameOf(x.pid);
    return {cat:'personal', ic:'target', prio:5,
      // Erwartete Siege ganz, wie man sie sagt: „erwartet waren 10,3"
      // und „gewinnt mehr, als die Elo erwarten lässt" las niemand beim
      // ersten Mal [§C33].
      title:`${N} gewinnt ${Math.round(x.w14 - x.e14)} Sätze mehr als erwartet`,
      desc:`${x.w14} Siege aus ${x.n14} Sätzen in 14 Tagen. Nach Elo waren ${Math.round(x.e14)} zu erwarten.`,
      dataRef:{ambientPid:x.pid, bild:{f:'erwartung', p:x.pid, n:x.n14, s:x.w14, e:+x.e14.toFixed(1),
        g:x.gt14, gf:x.gf14, ge:+x.ge14.toFixed(1),
        l:+(x.perf14 / x.n14 * 100).toFixed(1)}}};
  }});

  // ── 3. Form gegen Laufbahn: wer weit über der eigenen Quote spielt ─
  // Nur nach oben. Ein Formtief über einen Spieler als Nachricht sagt ihm,
  // dass er schlechter geworden ist, und die Karte soll niemanden vorführen.
  // Gemessen wird gegen die Laufbahn VOR dem Fenster: sonst zöge die gute
  // Form ihren eigenen Maßstab mit nach oben.
  T.push({key:'form_laufbahn', make: () => {
    const l = feld().filter(y => y.n14 >= FF_MIN.saetze14 && y.nVor >= FF_MIN.laufbahn)
      .map(y => ({y, d:y.w14 / y.n14 - y.wVor / y.nVor})).filter(z => z.d > 0)
      .sort((a, b) => b.d - a.d || (a.y.pid < b.y.pid ? -1 : 1));
    if(!l.length || l[0].d < FF_MIN.abweichung) return null;
    const x = l[0].y, N = nameOf(x.pid);
    return {cat:'personal', ic:'chartBar', prio:5,
      title:`${N} gewinnt in 14 Tagen ${pct(x.w14 / x.n14)}\u00a0% der Sätze`,
      desc:`Das sind ${x.w14} von ${x.n14}. Davor gewann ${N} ${pct(x.wVor / x.nVor)}\u00a0% von ${x.nVor} Sätzen.`,
      dataRef:{ambientPid:x.pid, bild:{f:'hantel',
        r:l.slice(0, 3).map(z => [z.y.pid, pct(z.y.wVor / z.y.nVor), pct(z.y.w14 / z.y.n14), z.y.n14, z.y.nVor])}}};
  }});

  // ── 4. Marke in Sicht: wem wenig bis zu einer runden Zahl fehlt ────
  // Die Marken sind die, die der Feed feiert, wenn sie fallen [§C27]: jeder
  // fünfzigste Satz und Sieg (`_rundeMarke`), die Leiter der Games ab 500
  // (`_ladderCrossing`), die Schwellen der Insignium-Leiter. „In Sicht"
  // heißt, ein Spieltag kann sie holen. Das Prestige zählt nur, wenn nach
  // dem Slot kein Satz kam: es steht nur für jetzt bereit, und für einen
  // nachgetragenen Tag hätte es eine spätere Leiter gezeigt.
  T.push({key:'laufbahn_marke', make: rng => {
    const nachher = (matches || []).some(m => mts(m) > jetzt);
    const naechste = (ist, bis, ok) => { for(let k = ist + 1; k <= ist + bis; k++) if(ok(k)) return k; return null; };
    const vorige = (ziel, ok) => { for(let k = ziel - 1; k > 0; k--) if(ok(k)) return k; return 0; };
    const satzM = k => _rundeMarke(k, JUBILAEUM_AB), siegM = k => _rundeMarke(k, 50);
    const kand = [];
    feld().forEach(x => {
      let z = naechste(x.n, FF_MIN.markeSaetze, satzM);
      if(z) kand.push({x, art:'saetze', ist:x.n, ziel:z, von:vorige(z, satzM), r:(z - x.n) / FF_MIN.markeSaetze});
      z = naechste(x.w, FF_MIN.markeSiege, siegM);
      if(z) kand.push({x, art:'siege', ist:x.w, ziel:z, von:vorige(z, siegM), r:(z - x.w) / FF_MIN.markeSiege});
      z = _ladderCrossing(x.gf, x.gf + FF_MIN.markeGames, 500);
      if(z) kand.push({x, art:'games', ist:x.gf, ziel:z, von:_ladderCrossing(0, z - 1, 500) || 0, r:(z - x.gf) / FF_MIN.markeGames});
      if(nachher || typeof prestigeOf !== 'function') return;
      let P = null; try { P = prestigeOf(x.pid); } catch(e){ P = null; }
      if(!P || !(P.punkte > 0)) return;
      const schw = insigniumGradSchwellen(P.stufe).concat(P.naechste ? [P.naechste.min] : []);
      const z2 = schw.find(v => v > P.punkte);
      if(z2 == null || z2 - P.punkte > FF_MIN.markePrestige) return;
      const stufe = P.naechste && z2 === P.naechste.min;
      kand.push({x, art:'prestige', ist:Math.round(P.punkte), ziel:z2, von:schw.filter(v => v <= P.punkte).pop() || 0,
        r:(z2 - P.punkte) / FF_MIN.markePrestige, name:stufe ? P.naechste.name
          : `${P.insignie.name} ${INSIGNIUM_GRAD_NAME[schw.indexOf(z2)] || ''}`.trim(), stufe:!!stufe,
        st:stufe ? P.naechste.key : P.insignie.key, grad:stufe ? 0 : schw.indexOf(z2)});
    });
    if(!kand.length) return null;
    // Gezogen wird unter den drei nächsten: die eine nächste Marke stünde
    // sonst Tag für Tag über demselben Spieler.
    kand.sort((a, b) => a.r - b.r || (a.x.pid < b.x.pid ? -1 : 1));
    const k = kand[Math.floor(rng() * Math.min(3, kand.length))] || kand[0];
    const N = nameOf(k.x.pid), rest = Math.round(k.ziel - k.ist);
    const satz = {
      saetze:[`${N} steht vor dem ${k.ziel}. Satz`, `Es ${rest === 1 ? 'fehlt ein Satz' : 'fehlen ' + rest + ' Sätze'}. Der erste war am ${tagImSatz(k.x.first)}`],
      siege:[`${N} steht vor dem ${k.ziel}. Sieg`, `Es ${rest === 1 ? 'fehlt ein Sieg' : 'fehlen ' + rest + ' Siege'}. ${k.ist} sind es aus ${k.x.n} Sätzen.`],
      games:[`${N} steht vor dem ${k.ziel}. gewonnenen Game`, `Es ${rest === 1 ? 'fehlt ein Game' : 'fehlen ' + rest + ' Games'}. ${k.ist} sind es aus ${k.x.n} Sätzen.`],
      prestige:[`${N} steht kurz vor dem ${k.name}`, `Es fehlen ${rest} Prestige. ${k.stufe ? 'Dann trägt das Wappen die nächste Stufe der Leiter.' : 'Dann steigt das Wappen um einen Grad.'}`]
    }[k.art];
    return {cat:'personal', ic:k.art === 'prestige' ? 'leiterAuf' : 'peak', prio:5,
      title:satz[0], desc:satz[1],
      dataRef:{ambientPid:k.x.pid, ...(k.art === 'prestige' ? {prestige:true} : {}), bild:{f:'marke', p:k.x.pid, art:k.art,
        ist:k.ist, ziel:k.ziel, von:k.von, name:k.name || '', s:k.x.n, w:k.x.w, g:k.x.gf,
        ...(k.art === 'prestige' ? {st:k.st, grad:k.grad} : {})}}};
  }});

  // ── 5. Chronik einer Laufbahn: die Monate eines Spielers ───────────
  // Gezählt werden nur geschlossene Monate: der laufende kann bis zu seinem
  // Ende jeden Eintrag noch wechseln. Ein Monat zählt mit einem Eintrag, der
  // keine Schattenseite ist — „steht in der Chronik" ist hier ein Lob, und
  // die Schattenseite meldet der Feed nicht [§C35]. Die Reihe zeigt jeden
  // Monat in der Farbe seiner Stufe wie die Chronik-Tabelle [§C25]; ein
  // Strich heißt gewertet ohne Eintrag, ein leeres Feld nicht gewertet.
  T.push({key:'chronik_reihe', make: rng => {
    if(typeof seasonTitles !== 'function' || typeof allPastSeasons !== 'function') return null;
    let sids = [];
    try { sids = allPastSeasons().filter(sid => seasonEnd(sid).getTime() <= jetzt).sort(); } catch(e){ return null; }
    if(sids.length < FF_MIN.chronikMonate) return null;
    const TT = sids.map(sid => { try { return seasonTitles(sid); } catch(e){ return null; } });
    const zelle = (T2, pid) => {
      if(!T2) return null;
      const st = chronikZellStufe(T2, pid);
      if(st && st !== 'schatten'){ const a = chronikEintragVon(T2, pid) || {}; return [T2.sid, st, a.ic || 'scroll', a.name || '', a.titleId || '']; }
      const gew = (T2.awarded || []).some(a => a.pid === pid) || (T2.empty || []).includes(pid);
      return [T2.sid, gew ? '-' : '', '', '', ''];
    };
    const kand = [];
    activePids.forEach(pid => {
      const z = TT.map(T2 => zelle(T2, pid) || ['', '', '', '', '']);
      const mit = z.filter(c => c[1] && c[1] !== '-');
      if(!mit.length) return;
      let serie = 0; for(let i = z.length - 1; i >= 0 && z[i][1] && z[i][1] !== '-'; i--) serie++;
      const letzte = z[z.length - 1];
      if(serie >= FF_MIN.chronikMonate) kand.push({pid, art:'serie', k:serie, z, letzte});
      if(mit.length === 1 && letzte[1] && letzte[1] !== '-') kand.push({pid, art:'neu', k:1, z, letzte,
        vorher:z.slice(0, -1).filter(c => c[1] === '-').length});
      if(mit.length >= FF_MIN.chronikMonate) kand.push({pid, art:'meiste', k:mit.length, z, letzte});
    });
    // „Die meisten" nur für den einen, der vorn liegt.
    const meiste = kand.filter(c => c.art === 'meiste').sort((a, b) => b.k - a.k);
    const top = meiste[0] && (!meiste[1] || meiste[1].k < meiste[0].k) ? meiste[0] : null;
    const l = kand.filter(c => c.art !== 'meiste').concat(top ? [top] : []);
    if(!l.length) return null;
    l.sort((a, b) => (a.pid + a.art < b.pid + b.art ? -1 : 1));
    const c = l[Math.floor(rng() * l.length)] || l[0], N = nameOf(c.pid);
    const zweiter = c.art === 'meiste' ? meiste[1] : null;
    const zuletzt = c.z.slice().reverse().find(x => x[1] && x[1] !== '-');
    const text = {
      serie:[`${N} steht seit ${c.k} Monaten ohne Pause in der Chronik`,
        `Seit ${seasonLabel(c.z[c.z.length - c.k][0])} hat ${N} jeden Monat einen Eintrag. Zuletzt kam „${zuletzt[3]}“ dazu.`],
      neu:[`${N} steht zum ersten Mal in der Chronik`,
        `Im ${seasonLabel(c.letzte[0])} kam „${c.letzte[3]}“ dazu.`
          + (c.vorher ? ` ${N} spielte schon ${wort(c.vorher, 'einen Monat', 'Monate')} davor ohne Eintrag.` : '')],
      meiste:[`${N} steht in ${c.k} Monaten in der Chronik`,
        zweiter ? `Das sind die meisten der Liga. ${nameOf(zweiter.pid)} folgt mit ${zweiter.k}.` : 'Das sind die meisten der Liga.']
    }[c.art];
    return {cat:'history', ic:'scroll', prio:5, title:text[0], desc:text[1],
      dataRef:{ambientPid:c.pid, bild:{f:'reihe', p:c.pid, art:c.art, n:c.k,
        z:c.z.slice(-12)}}};
  }});

  // ── 6. Duo-Chemie: welches Duo zusammen über der Erwartung spielt ──
  // Dieselbe Rechnung wie die Farbe im Netz der Duos (`_einblickNetz`):
  // je Satz Sieg und Games gegen die Erwartung, über die gemeinsamen Sätze
  // mit POS_SCHRUMPF zu null gezogen. Nicht die Siegquote: zwei Starke
  // gewinnen zusammen immer viel, und die Karte nannte dann immer dieselben.
  T.push({key:'duo_chemie', make: () => {
    const B = basis();
    const l = Object.keys(B.duo).map(k => { const [a, b] = k.split('|'), z = B.duo[k];
      return {a, b, z, v:z.s / (z.g + POS_SCHRUMPF)}; })
      .filter(x => aktiv(x.a) && aktiv(x.b) && x.z.g >= DUO_MIN)
      .sort((p, q) => q.v - p.v || (p.a + p.b < q.a + q.b ? -1 : 1));
    // Gesagt wird es in Siegen: „sechs Sätze mehr als erwartet" liest man
    // beim ersten Mal, „spielen zusammen über der Erwartung" nicht. Gereiht
    // wird weiter nach der Leistung; die Karte steht nur, wenn auch die
    // Siege es sagen (`duoMehr`), sonst stimmte der Satz nicht.
    const mehr = y => Math.round(y.z.w - y.z.e);
    // Geordnet nach dem, was die Karte sagt: nach der Leistung geordnet stand
    // im Bild ein Nachbar mit mehr Siegen über der Erwartung als das Duo im
    // Titel, und „Kein anderes Duo liegt so weit vorn" stimmte nicht.
    const gut = l.filter(y => y.z.g >= FF_MIN.duoSaetze && y.v >= FF_MIN.duoUeber && mehr(y) >= FF_MIN.duoMehr)
      .sort((p, q) => (q.z.w - q.z.e) - (p.z.w - p.z.e) || q.v - p.v);
    const x = gut[0];
    if(!x) return null;
    const spitze = l.filter(y => y.z.g >= FF_MIN.duoSaetze).every(y => y === x || (y.z.w - y.z.e) < (x.z.w - x.z.e));
    const A = nameOf(x.a), Bn = nameOf(x.b);
    return {cat:'team', ic:'duo', prio:5,
      title:`${A} und ${Bn} gewinnen zusammen ${mehr(x)} Sätze mehr als erwartet`,
      // Die Zahlen stehen in der Bahn darunter; der Satz sagt, woher die
      // Erwartung kommt. „Die Elo der vier ließ 43,7 erwarten" warf die
      // Frage auf, was die Gegner damit zu tun haben.
      desc:`Erwartet ist, was die Elo beider Duos vor jedem Satz voraussagt.`
        + (spitze ? ' Kein anderes Duo liegt so weit vorn.' : ''),
      dataRef:{ambientPids:[x.a, x.b], pairKind:'team', bild:{f:'chemie', a:x.a, b:x.b, g:x.z.g, w:x.z.w,
        e:+x.z.e.toFixed(1), v:Math.round(x.v * 100)}}};
  }});

  // ── 7. Rolle: wer meist auf der schwächeren Seite steht oder wechselt
  // Das Profil ist das der Seiten-Landkarte [§C44]: waagerecht der Anteil
  // der Sätze rechts, senkrecht, auf welcher Seite die Leistung gegen den
  // eigenen Schnitt höher ist. Ein Wechsel geht vor: er ist neu, die
  // schwächere Seite ist ein Zustand.
  T.push({key:'rolle_seite', make: () => {
    const B = basis();
    const lage = pid => positionsLage(B.pos[pid] || posZaehler());
    const andere = activePids.filter(pid => B.pos[pid]).map(pid => { const L = lage(pid);
      return [pid, +L.anteil.toFixed(3), +(L.rA - L.rD).toFixed(4)]; }).filter(o => B.pos[o[0]].aG + B.pos[o[0]].dG > 0);
    const S = Math.max(.10, ...andere.map(o => Math.abs(o[2])));
    const seite = d => d ? 'Drive' : 'Revés';
    const wechsel = feld().filter(y => y.n14 >= FF_MIN.saetze14 && y.nVor >= FF_MIN.wechselVor)
      .map(y => ({y, a14:y.dr14 / y.n14, aV:y.drVor / y.nVor})).filter(z => Math.abs(z.a14 - z.aV) >= FF_MIN.wechsel)
      .sort((p, q) => Math.abs(q.a14 - q.aV) - Math.abs(p.a14 - p.aV) || (p.y.pid < q.y.pid ? -1 : 1))[0];
    if(wechsel){
      const x = wechsel.y, N = nameOf(x.pid), L = lage(x.pid), nachDrive = wechsel.a14 > wechsel.aV;
      const k = nachDrive ? x.dr14 : x.n14 - x.dr14, qv = pct(nachDrive ? wechsel.aV : 1 - wechsel.aV);
      return {cat:'personal', ic:'sideSwap', prio:5, title:`${N} wechselt die Seite`,
        desc:`In den letzten 14 Tagen spielte ${N} ${k} von ${x.n14} Sätzen auf der ${seite(nachDrive)}-Seite. ${qv === 0 ? `Davor spielte ${N} dort keinen Satz.` : `Davor waren es ${qv}\u00a0% der Sätze.`}`,
        dataRef:{ambientPid:x.pid, bild:{f:'landkarte', p:x.pid, art:'wechsel', x:+L.anteil.toFixed(3), y:+(L.rA - L.rD).toFixed(4),
          xv:+wechsel.aV.toFixed(3), x14:+wechsel.a14.toFixed(3), n14:x.n14, nVor:x.nVor, S:+S.toFixed(4), o:andere.filter(o => o[0] !== x.pid).map(o => [o[1], o[2]])}}};
    }
    const schwach = activePids.map(pid => ({pid, L:lage(pid)})).filter(({L}) => {
      if(L.staerker === 'beide' || L.aG + L.dG < FF_MIN.rolleSaetze || Math.min(L.aG, L.dG) < 5) return false;
      const meistDrive = L.anteil >= .5;
      return (meistDrive ? 'drive' : 'reves') !== L.staerker && Math.max(L.anteil, 1 - L.anteil) >= FF_MIN.rolleMeist;
    }).sort((p, q) => Math.abs(q.L.rA - q.L.rD) - Math.abs(p.L.rA - p.L.rD) || (p.pid < q.pid ? -1 : 1))[0];
    if(!schwach) return null;
    const L = schwach.L, N = nameOf(schwach.pid), meistDrive = L.anteil >= .5;
    return {cat:'personal', ic:'sideSwap', prio:4, title:`${N} spielt meist auf der schwächeren Seite`,
      desc:`${N} spielt ${pct(meistDrive ? L.anteil : 1 - L.anteil)}\u00a0% der Sätze auf der ${seite(meistDrive)}-Seite. `
        + `Auf der ${seite(!meistDrive)}-Seite gewinnt ${N} mehr Sätze als erwartet.`,
      dataRef:{ambientPid:schwach.pid, bild:{f:'landkarte', p:schwach.pid, art:'schwach', x:+L.anteil.toFixed(3),
        y:+(L.rA - L.rD).toFixed(4), aG:L.aG, dG:L.dG, S:+S.toFixed(4), o:andere.filter(o => o[0] !== schwach.pid).map(o => [o[1], o[2]])}}};
  }});

  // ── 8. Die Gesamtwerte der Liga: eine runde Zahl und ihr Weg ───────
  // Jeder hundertste Satz und jedes tausendste Game, ab 1000 Sätzen und
  // 10.000 Games in größeren Schritten: sonst stünde jeden Monat eine Marke
  // da. Gezählt wird jeder Satz der Liga, auch der eines Ruheständlers; nur
  // genannt wird er nicht [§C40]. Die Säulen sind der Stand am Ende jedes
  // Monats, damit man sieht, wie die Liga auf die Zahl zugelaufen ist.
  T.push({key:'liga_marke', make: () => {
    const B = basis(), L2 = B.liga;
    if(!L2.n) return null;
    const schritt = (art, v) => art === 'saetze' ? (v >= 1000 ? 500 : FF_MIN.ligaSaetze) : (v >= 10000 ? 5000 : FF_MIN.ligaGames);
    const wert = (art, x) => art === 'saetze' ? x.n : x.games;
    const ergebnis = art => {
      const ist = art === 'saetze' ? L2.n : L2.games;
      const st = schritt(art, ist), marke = Math.floor(ist / st) * st;
      if(marke > 0){
        const s = L2.saetze.find(x => wert(art, x) >= marke);
        if(s && s.t > ab) return {art, marke, ist, erreicht:true, s};
      }
      const nx = (Math.floor(ist / schritt(art, ist + 1)) + 1) * schritt(art, ist + 1);
      if(nx - ist <= (art === 'saetze' ? FF_MIN.ligaRestSaetze : FF_MIN.ligaRestGames)) return {art, marke:nx, ist, erreicht:false};
      return null;
    };
    const r = ergebnis('saetze') || ergebnis('games');
    if(!r) return null;
    const mon = Object.keys(L2.monate).sort().slice(-12);
    const hl = r.erreicht ? mon.indexOf(String(r.s.m.created_at).slice(0, 7)) : mon.length - 1;
    const sieger = r.erreicht && r.art === 'saetze' ? _spSieger(r.s.m) : [];
    const mitNamen = sieger.length && sieger.every(aktiv);
    const M = tausender(String(r.marke)), wo = tagImSatz(new Date(L2.saetze[0].t));
    const schnitt = komma(L2.games / L2.n);
    const text = r.art === 'saetze'
      ? (r.erreicht
        ? [`Die Liga hat ihren ${M}. Satz gespielt`, mitNamen
            ? `Am ${tagImSatz(r.s.m.created_at)} gewannen ihn ${_namenListe(sieger.map(nameOf))} mit ${standFuer(r.s.m)}.`
            : `Gespielt wurde er am ${tagImSatz(r.s.m.created_at)}`]
        : [`Die Liga steht vor dem ${M}. Satz`, `Es ${r.marke - r.ist === 1 ? 'fehlt ein Satz' : 'fehlen ' + (r.marke - r.ist) + ' Sätze'}. Der erste war am ${wo}`])
      : (r.erreicht
        ? [`Die Liga hat ${M} Games gespielt`, `Die Marke fiel am ${tagImSatz(r.s.m.created_at)} Ein Satz hat im Schnitt ${schnitt} Games.`]
        : [`Die Liga steht vor dem ${M}. Game`, `Es fehlen ${r.marke - r.ist} Games. Ein Satz hat im Schnitt ${schnitt} Games.`]);
    return {cat:'history', ic:'padelBall', prio:6, title:text[0], desc:tausender(text[1]),
      dataRef:{ambientPids:mitNamen ? sieger : [], bild:{f:'ligaband', art:r.art, m:r.marke, n:r.ist, erreicht:r.erreicht,
        mon:mon.map(k => [k, L2.monate[k][r.art === 'saetze' ? 'n' : 'games']]), hl, sieger:mitNamen ? sieger : [],
        jeMonat:Math.round(r.ist / Object.keys(L2.monate).length)}}};
  }});

  // ═══ Die zweite Reihe der Fragen [§C33] ═══════════════════════════
  // Mit acht Fragen blieb der Slot an jedem zweiten stillen Tag leer: die
  // Paar-Sperre (dieselbe These über dieselbe Person einmal in dreißig
  // Tagen) liess nichts Frisches übrig, und „Marke in Sicht" stand an jedem
  // vierten Tag. Jede Frage hier hat ihre eigene Aussage: keine zwei fragen
  // nach demselben Wert über dieselbe Strecke. Alles zählt bis zur Uhr des
  // Slots (`basis`), ausser Prestige und Rekord: deren Rechnungen kennen
  // nur den Stand von jetzt, und sie ziehen nur, wenn nach dem Slot kein
  // Satz kam.
  const startElo = (typeof cfg === 'object' && cfg && cfg.start_elo) || 0;
  const sidJetzt = seasonOf(now).id;
  const nachher = (matches || []).some(m => mts(m) > jetzt);
  // Die Karriere-Elo zum Slot, wie die Ewige Tafel sie rechnet
  // (`_eloErgebnis`): der Schnitt der Saison-Endstände, gewichtet nach
  // Sätzen. `vorher` ist derselbe Stand vor vierzehn Tagen.
  const karriere = (x, vorher) => { let se = 0, sn = 0;
    Object.keys(x.sz).forEach(sid => { const z = x.sz[sid], n = vorher ? z.nAb : z.n;
      if(n){ se += (startElo + (vorher ? z.dAb : z.d)) * n; sn += n; } });
    return sn ? se / sn : null; };
  // Die Tabelle eines Monats zum Slot (`saisonRang`), `woche` eine Woche davor.
  const monatsTabelle = (sid, woche) => feld().map(x => { const z = x.sz[sid];
    const n = z ? (woche ? z.nW : z.n) : 0;
    return n ? {pid:x.pid, n, w:woche ? null : z.w, elo:Math.round(startElo + (woche ? z.dW : z.d))} : null; })
    .filter(Boolean).sort((a, b) => b.elo - a.elo || (a.pid < b.pid ? -1 : 1));
  const monatsTag = now.getDate();
  // Der Monat im Satz ohne Jahr, wenn es das Jahr des Slots ist: „im
  // August 2026" stand zweimal in einem Satz von zwölf Wörtern.
  const monatWort = sid => sid.slice(0, 4) === String(now.getFullYear()) ? seasonLabel(sid).replace(/\s*\d{4}$/, '') : seasonLabel(sid);
  const MON = monatWort(sidJetzt);
  const ordnung = ['zweite', 'dritte', 'vierte', 'fünfte'];

  // ── 9. Die Serie: wer der eigenen Bestmarke nahekommt ──────────────
  // Eine laufende Serie meldet die Karte des Satzes, mit dem sie wächst.
  // Der Fun Fact fragt etwas anderes: wie weit es bis zur längsten eigenen
  // ist — ein Ziel für den nächsten Spieltag.
  T.push({key:'form_serie', make: () => {
    const alle = Object.values(basis().je);
    // Mit einer Laufbahn davor: am dritten Tag der Liga ist jede Serie die
    // längste, und „die längste Serie davor waren 0" sagt nichts.
    const l = feld().filter(x => x.lauf >= FF_MIN.serie && x.bestVor - x.lauf <= FF_MIN.serieRest && x.n - x.lauf >= FF_MIN.laufbahn)
      .sort((a, b) => (a.bestVor - a.lauf) - (b.bestVor - b.lauf) || b.lauf - a.lauf || (a.pid < b.pid ? -1 : 1));
    const x = l[0];
    if(!x) return null;
    const N = nameOf(x.pid), k = x.lauf, rest = x.bestVor - k, seit = tagImSatz(x.laufAb);
    const liga = Math.max(...alle.map(y => Math.max(y.bestVor, y.lauf)));
    const text = rest < 0
      ? [`${N} gewinnt ${k} Sätze in Folge, so viele wie nie`, `Seit dem ${seit} ging kein Satz verloren. Die beste Serie davor waren ${x.bestVor}.`]
      : rest === 0
        ? [`${N} gewinnt ${k} Sätze in Folge und erreicht die eigene Bestmarke`, `Seit dem ${seit} ging kein Satz verloren. Der nächste Sieg wäre ein neuer Bestwert.`]
        : [`${N} braucht noch ${rest === 1 ? 'einen Sieg' : rest + ' Siege'} zur eigenen Bestmarke`, `${N} gewann seit dem ${seit} ${k} Sätze in Folge. Die beste Serie bisher sind ${x.bestVor}.`];
    // Die Serie der Liga steht im Blatt: als dritter Satz war der Text
    // länger als die Aussage [§C33].
    return {cat:'personal', ic:'flame', prio:5, title:text[0], desc:text[1],
      dataRef:{ambientPid:x.pid, bild:{f:'serie', p:x.pid, k, best:x.bestVor, liga, ab:x.laufAb, n:x.n, w:x.w}}};
  }});

  // ── 10. Die Wende: wer Matches nach verlorenem ersten Satz dreht ────
  // Das Match ist die Begegnung (`begegnungAm`), gewertet an ihrem letzten
  // Satz; gedreht heißt, der erste Satz ging verloren. Nur der eine, der
  // es in dreißig Tagen am häufigsten tat.
  T.push({key:'form_wende', make: () => {
    const l = feld().filter(x => x.wenden.length >= FF_MIN.wenden)
      .sort((a, b) => b.wenden.length - a.wenden.length || b.begW - a.begW || (a.pid < b.pid ? -1 : 1));
    const x = l[0];
    if(!x || (l[1] && l[1].wenden.length === x.wenden.length)) return null;
    const N = nameOf(x.pid), k = x.wenden.length;
    return {cat:'personal', ic:'comeback', prio:5,
      title:`${N} dreht ${k} Matches nach verlorenem ersten Satz`,
      desc:`${N} gewann in den letzten 30 Tagen ${x.begW} von ${x.beg} Matches. Kein anderer Spieler drehte so viele.`,
      dataRef:{ambientPid:x.pid, bild:{f:'wende', p:x.pid, k, beg:x.beg, begW:x.begW,
        l:x.wenden.slice(-4).map(w => [w.t, w.saetze])}}};
  }});

  // ── 11. Knappe Sätze: wer sie öfter gewinnt als die übrigen ─────────
  // Knapp wie überall (`partie(m).knapp`). Nur nach oben: wer die knappen
  // verliert, soll keine Karte darüber lesen.
  T.push({key:'spieler_knapp', make: () => {
    const l = feld().filter(x => x.kn >= FF_MIN.knapp && x.on >= FF_MIN.knapp)
      .map(x => ({x, d:x.kw / x.kn - x.ow / x.on})).filter(z => z.d >= FF_MIN.knappPlus)
      .sort((a, b) => b.d - a.d || (a.x.pid < b.x.pid ? -1 : 1));
    if(!l.length) return null;
    const x = l[0].x, N = nameOf(x.pid);
    return {cat:'personal', ic:'target', prio:4, title:`${N} gewinnt die knappen Sätze`,
      desc:`${N} gewann ${x.kw} von ${x.kn} knappen Sätzen. Von den übrigen gewann ${N} ${pct(x.ow / x.on)}\u00a0%.`,
      dataRef:{ambientPid:x.pid, bild:{f:'knapp', p:x.pid, kn:x.kn, kw:x.kw, on:x.on, ow:x.ow}}};
  }});

  // ── 12. Die Spitze einer Seite: die Seiten-Rangliste [§C44] ─────────
  // Dieselbe Rechnung wie die Rangliste der Seite (`positionsListe`,
  // `posWert`), über die Sätze bis zum Slot. Gezeigt wird das Podest nur,
  // wenn jeder darauf genug Sätze auf der Seite hat; vor vierzehn Tagen
  // dieselbe Rechnung, damit der Satz einen Wechsel an der Spitze nennt.
  T.push({key:'seite_spitze', make: rng => {
    const B = basis(), vorher = B.liste.filter(m => mts(m) <= ab);
    const rang = (side, ms) => activePids.map(pid => {
      const st = playerStats(pid, ms), pf = posPerfFrom(pid, ms), d = side === 'drive';
      const g = d ? st.drvG : st.revG, w = d ? st.drvW : st.revW;
      return {pid, g, w, score:posWert(side, g, w, d ? st.drvAnteil : st.revAnteil, (d ? pf.aPerfAvg : pf.dPerfAvg) || 0)};
    }).filter(z => z.g > 0).sort((a, b) => b.score - a.score || (a.pid < b.pid ? -1 : 1));
    const seiten = ['drive', 'reves'].map(side => ({side, r:rang(side, B.liste)}))
      .filter(o => o.r.length >= 3 && o.r.slice(0, 3).every(z => z.g >= FF_MIN.seiteSaetze));
    if(!seiten.length) return null;
    const o = seiten[Math.floor(rng() * seiten.length)] || seiten[0], x = o.r[0];
    const alt = (rang(o.side, vorher)[0] || {}).pid;
    const N = nameOf(x.pid), S = o.side === 'drive' ? 'Drive' : 'Revés';
    return {cat:'personal', ic:o.side === 'drive' ? 'posDrive' : 'posReves', prio:5,
      title:`${N} führt die Rangliste der ${S}-Seite an`,
      desc:`${N} gewann dort ${x.w} von ${x.g} Sätzen.` + (alt && alt !== x.pid && aktiv(alt) ? ` Vor 14 Tagen stand ${nameOf(alt)} vorn.` : ''),
      dataRef:{ambientPid:x.pid, bild:{f:'seite', s:o.side, r:o.r.slice(0, 3).map(z => [z.pid, Math.round(z.score * 100), z.w, z.g])}}};
  }});

  // ── 13. Das erfolgreichste Duo: die Spitze der Teams-Liste ──────────
  // Dieselbe Ordnung wie die Liste der Duos (`vTeams`: Siegquote, dann
  // Games je Satz, dann Sätze, ab `DUO_MIN`). Das Podest steht nur, wenn
  // das erste Duo genug zusammen gespielt hat; ein 5:0 ist kein Duo der
  // Liga, sondern ein guter Abend.
  T.push({key:'duo_spitze', make: () => {
    const B = basis();
    const rang = vor => Object.keys(B.duo).map(k => { const [a, b] = k.split('|'), z = B.duo[k];
      const g = vor ? (z.gAb || 0) : z.g, w = vor ? (z.wAb || 0) : z.w;
      return {k, a, b, g, w, gd:vor ? 0 : (z.gf - z.ga) / Math.max(1, z.g)}; })
      .filter(x => aktiv(x.a) && aktiv(x.b) && x.g >= DUO_MIN)
      .sort((p, q) => q.w / q.g - p.w / p.g || q.gd - p.gd || q.g - p.g || (p.k < q.k ? -1 : 1));
    const r = rang(false);
    if(r.length < 3 || r[0].g < FF_MIN.duoRang) return null;
    const x = r[0], alt = rang(true)[0], A = nameOf(x.a), Bn = nameOf(x.b);
    return {cat:'team', ic:'duo', prio:5, title:`${A} und ${Bn} sind das erfolgreichste Duo der Liga`,
      desc:`Zusammen gewannen sie ${x.w} von ${x.g} Sätzen.`
        + (alt && alt.k !== x.k ? ` Vor 14 Tagen lagen ${nameOf(alt.a)} und ${nameOf(alt.b)} vorn.` : ''),
      dataRef:{ambientPids:[x.a, x.b], pairKind:'team', bild:{f:'duos',
        r:r.slice(0, 3).map(z => [z.a, z.b, pct(z.w / z.g), z.w, z.g])}}};
  }});

  // ── 14. Ein neues Duo: zwei, die neuerdings zusammen spielen ───────
  // Die Säulen sind die gemeinsamen Sätze je Woche, die letzten zwei hell.
  T.push({key:'duo_neu', make: () => {
    const B = basis();
    const o = Object.keys(B.duo).map(k => ({k, z:B.duo[k], p:k.split('|')}))
      .filter(y => aktiv(y.p[0]) && aktiv(y.p[1]) && y.z.n14 >= FF_MIN.duoNeu && y.z.nVor <= FF_MIN.duoNeuVor)
      .sort((p, q) => q.z.n14 - p.z.n14 || (p.k < q.k ? -1 : 1))[0];
    if(!o) return null;
    const A = nameOf(o.p[0]), Bn = nameOf(o.p[1]), z = o.z;
    const wochen = Array.from({length:10}, (_, i) => z.t.filter(t => t <= jetzt - (9 - i) * 7 * TAG && t > jetzt - (10 - i) * 7 * TAG).length);
    return {cat:'team', ic:'duo', prio:5, title:`${A} und ${Bn} bilden ein neues Duo`,
      desc:`Sie spielten in 14 Tagen ${z.n14} Sätze zusammen und gewannen ${z.w14 === 1 ? 'einen' : z.w14}.`
        + (z.nVor ? ` Davor spielten sie einen einzigen Satz zusammen.` : ' Davor spielten sie nie zusammen.'),
      dataRef:{ambientPids:o.p, pairKind:'team', bild:{f:'duoneu', a:o.p[0], b:o.p[1], v:wochen, n:z.n14, w:z.w14}}};
  }});

  // ── 15. Gleichauf: zwei, die sich oft gegenüberstanden ─────────────
  // Sätze gegeneinander, nicht Matches: jeder Satz zählt einmal je Paar von
  // Gegnern. Die Linie im Bild ist der Abstand Satz für Satz.
  const gegner = () => { const B = basis();
    return Object.values(B.geg).map(o => { const [a, b] = o.k.split('|');
      const wa = o.folge.filter(f => f.s === a).length;
      return {a, b, n:o.n, wa, wb:o.n - wa, folge:o.folge}; })
      // Nur ein Paar, das sich zuletzt gegenüberstand: ohne neuen Satz
      // stand nach der Sperre dieselbe Karte Wort für Wort wieder da.
      .filter(o => aktiv(o.a) && aktiv(o.b) && o.n >= FF_MIN.duellSaetze && o.folge[o.folge.length - 1].t > jetzt - 30 * TAG); };
  const verlauf = (o, wer) => { let s = 0; const v = [0].concat(o.folge.map(f => (s += f.s === wer ? 1 : -1)));
    return v.length <= 41 ? v : Array.from({length:41}, (_, k) => v[Math.round(k * (v.length - 1) / 40)]); };
  T.push({key:'duell_gleichauf', make: () => {
    const l = gegner().sort((p, q) => q.n - p.n || (p.a + p.b < q.a + q.b ? -1 : 1));
    const o = l.find(y => Math.abs(y.wa - y.wb) <= Math.max(1, Math.round(y.n * FF_MIN.duellGleich)));
    if(!o) return null;
    const vorn = o.wa >= o.wb ? o.a : o.b, hinten = vorn === o.a ? o.b : o.a;
    const wv = Math.max(o.wa, o.wb), wh = Math.min(o.wa, o.wb), letzte = o.folge[o.folge.length - 1];
    const A = nameOf(vorn), Bn = nameOf(hinten);
    return {cat:'team', ic:'swords', prio:5,
      title:wv === wh ? `${A} und ${Bn} stehen gegeneinander bei ${wv}:${wh} Sätzen`
        : `${A} führt gegen ${Bn} knapp mit ${wv}:${wh} Sätzen`,
      desc:`Zuletzt gewann ${nameOf(letzte.s)} am ${tagImSatz(letzte.m.created_at)} mit ${standFuer(letzte.m)}.`
        + (l[0] === o ? ' Kein anderes Paar stand sich so oft gegenüber.' : ''),
      dataRef:{ambientPids:[vorn, hinten], pairKind:'duell', bild:{f:'rivalen', art:'gleich', a:vorn, b:hinten, wa:wv, wb:wh, v:verlauf(o, vorn)}}};
  }});

  // ── 16. Die Wende gegeneinander: wer die letzten Sätze holt ─────────
  // Wer davor hinten lag und die letzten `duellLetzte` Sätze gegeneinander
  // fast alle gewann. Die Folge im Bild ist dieselbe Linie, die letzten
  // Sätze hell.
  T.push({key:'duell_wende', make: () => {
    const L = FF_MIN.duellLetzte;
    const l = gegner().map(o => {
      const vor = o.folge.slice(0, -L), zuletzt = o.folge.slice(-L);
      const va = vor.filter(f => f.s === o.a).length, vb = vor.length - va;
      const hinten = va < vb ? o.a : vb < va ? o.b : null;
      const k = hinten ? zuletzt.filter(f => f.s === hinten).length : 0;
      return {o, hinten, k, va, vb};
    }).filter(z => z.hinten && z.k >= L - 1)
      .sort((p, q) => q.k - p.k || Math.abs(q.va - q.vb) - Math.abs(p.va - p.vb) || (p.o.a + p.o.b < q.o.a + q.o.b ? -1 : 1));
    const z = l[0];
    if(!z) return null;
    const o = z.o, X = z.hinten, Y = X === o.a ? o.b : o.a, xv = X === o.a ? z.va : z.vb, yv = X === o.a ? z.vb : z.va;
    const N = nameOf(X), M = nameOf(Y);
    return {cat:'team', ic:'swords', prio:5,
      title:`${N} gewinnt ${z.k} der letzten ${L} Sätze gegen ${M}`,
      desc:`Davor stand es ${yv}:${xv} für ${M}.`,
      dataRef:{ambientPids:[X, Y], pairKind:'duell', bild:{f:'rivalen', art:'wende', a:X, b:Y,
        wa:o.folge.filter(f => f.s === X).length, wb:o.folge.filter(f => f.s === Y).length, v:verlauf(o, X), l:Math.min(L, o.folge.length)}}};
  }});

  // ── 17. Die Ewige Tafel: das Podest der Karriere-Elo ────────────────
  // Ein Wechsel an der Spitze oder auf dem Podest in vierzehn Tagen geht
  // vor; sonst der Erste und sein Abstand. Erst ab zwei Monaten: davor ist
  // die Karriere-Elo die Elo des einen Monats.
  T.push({key:'gesamt_tafel', make: () => {
    const B = basis();
    if(new Set(B.liste.map(m => String(m.created_at).slice(0, 7))).size < 2) return null;
    const r = feld().map(x => ({pid:x.pid, e:karriere(x, false), e0:karriere(x, true)})).filter(z => z.e != null);
    const jetztR = r.slice().sort((a, b) => b.e - a.e || (a.pid < b.pid ? -1 : 1));
    const vorR = r.filter(z => z.e0 != null).sort((a, b) => b.e0 - a.e0 || (a.pid < b.pid ? -1 : 1));
    if(jetztR.length < 3 || vorR.length < 3) return null;
    const top = jetztR.slice(0, 3), alt = vorR.slice(0, 3).map(z => z.pid);
    const neu = top.find(z => alt.indexOf(z.pid) < 0);
    const E = z => Math.round(z.e);
    let x = top[0], text;
    if(alt[0] !== top[0].pid)
      text = [`${nameOf(x.pid)} übernimmt die Spitze der Ewigen Tafel`,
        `${nameOf(x.pid)} hat ${E(x)} Karriere-Elo. Vor 14 Tagen führte ${nameOf(alt[0])}.`];
    else if(neu){
      x = neu; const raus = alt.find(pid => !top.some(z => z.pid === pid));
      text = [`${nameOf(x.pid)} steht neu auf dem Podest der Ewigen Tafel`,
        `${nameOf(x.pid)} hat ${E(x)} Karriere-Elo und steht auf Platz ${top.indexOf(x) + 1}. Vor 14 Tagen stand noch ${nameOf(raus)} auf dem Podest.`];
    } else if(E(x) === E(top[1])) return null;
    else
      text = [`${nameOf(x.pid)} führt die Ewige Tafel an`,
        `${nameOf(x.pid)} hat ${E(x)} Karriere-Elo, ${E(x) - E(top[1])} mehr als ${nameOf(top[1].pid)}.`];
    return {cat:'personal', ic:'crown', prio:5, title:text[0], desc:text[1],
      dataRef:{ambientPid:x.pid, bild:{f:'ewig', r:top.map(z => [z.pid, E(z), alt.indexOf(z.pid) < 0 ? 0 : alt.indexOf(z.pid) + 1])}}};
  }});

  // ── 18. Der Wettlauf der Laufbahn: Siege, Sätze, Games ──────────────
  // Die ersten zwei liegen nah beieinander, oder einer hat den anderen in
  // vierzehn Tagen überholt. Die Linien sind der Stand am Ende jedes Monats.
  T.push({key:'gesamt_wettlauf', make: () => {
    const F = feld();
    const ARTEN = {siege:['w', 'w14', 'Siegen der Laufbahn'], saetze:['n', 'n14', 'Sätzen der Laufbahn'], games:['gf', 'gf14', 'gewonnenen Games der Laufbahn']};
    const kand = Object.keys(ARTEN).map(art => {
      const [k, k14] = ARTEN[art];
      const r = F.slice().sort((a, b) => b[k] - a[k] || (a.pid < b.pid ? -1 : 1));
      if(r.length < 2) return null;
      const [x, y] = r, gap = x[k] - y[k], vorher = (x[k] - x[k14]) - (y[k] - y[k14]);
      // Eine Laufbahn, die vierzehn Tage alt ist, hat keinen Wettlauf.
      if(x.nVor < FF_MIN.laufbahn || y.nVor < FF_MIN.laufbahn) return null;
      const ueber = vorher < 0;
      if(!ueber && gap > FF_MIN.wettlauf[art]) return null;
      return {art, x, y, gap, ueber, k, k14, rel:gap / Math.max(1, x[k])};
    }).filter(Boolean).sort((a, b) => (b.ueber - a.ueber) || a.rel - b.rel);
    const c = kand[0];
    if(!c) return null;
    const N = nameOf(c.x.pid), M = nameOf(c.y.pid), W = ARTEN[c.art][2];
    const title = c.ueber ? `${N} überholt ${M} bei den ${W}`
      : c.gap === 0 ? `${N} und ${M} liegen bei den ${W} gleichauf` : `${N} liegt bei den ${W} knapp vor ${M}`;
    const mon = Object.keys(basis().liga.monate).sort().slice(-12);
    const reihe = x => { let v = 0; return mon.map(mk => (v = x.mon[mk] ? x.mon[mk][{w:'w', n:'n', gf:'g'}[c.k]] : v)); };
    return {cat:'personal', ic:'chartBar', prio:5, title,
      desc:(c.gap === 0 ? `Beide haben ${c.x[c.k]}.` : `Es steht ${c.x[c.k]} zu ${c.y[c.k]}.`)
        + (c.x[c.k14] || c.y[c.k14] ? ` In 14 Tagen kamen bei ${N} ${c.x[c.k14]} dazu, bei ${M} ${c.y[c.k14]}.` : ''),
      dataRef:{ambientPids:[c.x.pid, c.y.pid], bild:{f:'wettlauf', art:c.art, mon, r:[[c.x.pid, reihe(c.x)], [c.y.pid, reihe(c.y)]]}}};
  }});

  // ── 19. Das Prestige: das Podest mit den Wappen [§C34] ──────────────
  // Das Prestige kennt nur den Stand von jetzt; für einen nachgetragenen Tag
  // hätte es eine spätere Leiter gezeigt.
  T.push({key:'gesamt_prestige', make: () => {
    if(nachher || typeof prestigeTabelle !== 'function') return null;
    let P = null; try { P = prestigeTabelle(); } catch(e){ return null; }
    const r = ((P && P.rang) || []).filter(aktiv).map(pid => [pid, Math.round((P.byPid[pid] || {}).punkte || 0)]).filter(z => z[1] > 0);
    if(r.length < 3) return null;
    const N = nameOf(r[0][0]);
    return {cat:'personal', ic:'leiterAuf', prio:5, title:`${N} führt die Prestige-Rangliste an`,
      desc:`${N} hat ${r[0][1]} Prestige, ${r[0][1] - r[1][1]} mehr als ${nameOf(r[1][0])}.`,
      dataRef:{ambientPid:r[0][0], prestige:true, bild:{f:'prestige', r:r.slice(0, 3)}}};
  }});

  // ── 20. Die Spitze des Monats: die Tabelle und ihre Woche ──────────
  // Ab dem achten Tag bis zur Halbzeit am 15.; danach nur, wenn die Spitze
  // in der Woche gewechselt hat — sonst sagte die Karte, was die Halbzeit
  // ein paar Tage vorher über denselben Führenden gesagt hat. Die Pfeile
  // sind die Plätze gegen den Stand vor einer Woche.
  T.push({key:'saison_stand', make: () => {
    if(monatsTag < FF_MIN.standTag) return null;
    const r = monatsTabelle(sidJetzt, false), w = monatsTabelle(sidJetzt, true);
    if(r.length < 4 || r[0].n < FF_MIN.standSaetze) return null;
    const x = r[0], N = nameOf(x.pid), alt = w[0], gap = x.elo - r[1].elo;
    if(monatsTag > 15 && (!alt || alt.pid === x.pid)) return null;
    const altGap = alt && alt.pid === x.pid && w[1] && w[1].pid === r[1].pid ? alt.elo - w[1].elo : null;
    const desc = alt && alt.pid !== x.pid ? `Vor einer Woche stand ${nameOf(alt.pid)} vorn.`
      : altGap != null && altGap !== gap ? `${nameOf(r[1].pid)} liegt ${gap} Elo dahinter. Vor einer Woche waren es ${altGap}.`
      : `${nameOf(r[1].pid)} folgt mit ${r[1].elo} Elo.`;
    return {cat:'season', ic:'chartBar', prio:5, title:`${N} führt den ${MON} mit ${x.elo} Elo an`, desc,
      dataRef:{ambientPid:x.pid, bild:{f:'monat', sid:sidJetzt, r:r.slice(0, 5).map((z, i) => {
        const j = w.findIndex(y => y.pid === z.pid); return [z.pid, z.elo, j < 0 ? null : j - i]; })}}};
  }});

  // ── 21. Gegen den Vormonat: wer sich aufs Podest gespielt hat ───────
  // Ein Platz zählt nur auf dem Podest [§C33]: der von jetzt muss darauf
  // stehen, der im Vormonat ist der Vergleich.
  T.push({key:'saison_vormonat', make: () => {
    if(monatsTag < FF_MIN.standTag) return null;
    const sids = [...new Set(basis().liste.map(m => seasonOf(m.created_at).id))].sort().filter(sid => sid < sidJetzt);
    const sid0 = sids[sids.length - 1];
    if(!sid0) return null;
    const r = monatsTabelle(sidJetzt, false), r0 = monatsTabelle(sid0, false);
    const platz0 = pid => r0.findIndex(z => z.pid === pid) + 1;
    const l = r.slice(0, 3).map((z, i) => ({z, i:i + 1, i0:platz0(z.pid), z0:r0.find(y => y.pid === z.pid)}))
      .filter(c => c.z0 && c.z.n >= FF_MIN.vormonatSaetze && c.z0.n >= FF_MIN.vormonatSaetze && c.i0 - c.i >= FF_MIN.vormonatPlaetze)
      .sort((a, b) => (b.i0 - b.i) - (a.i0 - a.i) || a.i - b.i);
    const c = l[0];
    if(!c) return null;
    const N = nameOf(c.z.pid), V = monatWort(sid0);
    const beide = r.filter(z => r0.some(y => y.pid === z.pid));
    return {cat:'season', ic:'trendUp', prio:5, title:`${N} verbessert sich von Platz ${c.i0} im ${V} auf Platz ${c.i}`,
      // Die Quote nur, wenn sie sich bewegt hat; sonst die Elo, die den
      // Platz macht: „42 % im Mai, 42 % im April" erklärte nichts.
      desc:Math.abs(c.z.w / c.z.n - c.z0.w / c.z0.n) >= .10
        ? `Im ${MON} gewann ${N} ${pct(c.z.w / c.z.n)}\u00a0% der Sätze, im ${V} ${pct(c.z0.w / c.z0.n)}\u00a0%.`
        : `Im ${MON} hat ${N} ${c.z.elo} Elo. Der ${V} endete bei ${c.z0.elo}.`,
      dataRef:{ambientPid:c.z.pid, bild:{f:'vormonat', p:c.z.pid, v:sid0, m:sidJetzt,
        r:beide.map(z => [z.pid, platz0(z.pid), r.indexOf(z) + 1])}}};
  }});

  // ── 22. Die Ergebnisse des Monats gegen die Monate davor ────────────
  // Eine Karte ohne Person kommt erst im zweiten Durchgang an die Reihe
  // (Durchgang −1 bevorzugt, wer drei Tage keine Karte hatte) und lag dort
  // hinter zwanzig Fragen über Spieler: doppelt im Lostopf (`weight`).
  T.push({key:'liga_ergebnisse', weight:2, make: () => {
    const L2 = basis().liga, mk = sidJetzt, jetztE = L2.erg[mk];
    if(!jetztE) return null;
    const n = jetztE.reduce((a, b) => a + b, 0);
    const vor = FF_SAETZE.map((_, i) => Object.keys(L2.erg).filter(k => k < mk).reduce((a, k) => a + L2.erg[k][i], 0));
    const nVor = vor.reduce((a, b) => a + b, 0);
    if(n < FF_MIN.ergebnisMonat || nVor < FF_MIN.ergebnisVor) return null;
    const d = jetztE.map((x, i) => x / n - vor[i] / nVor);
    const i = d.indexOf(Math.max(...d));
    if(d[i] < FF_MIN.ergebnisPlus) return null;
    // „Jeder dritte" nur, wenn es einer von dreien ist (bis zwei Punkte
    // daneben), sonst der Anteil: 29 % als „jeder vierte" war geschönt.
    const q = jetztE[i] / n, k = Math.round(1 / q), E = FF_SAETZE[i];
    const bruch = k >= 2 && k <= 5 && Math.abs(q - 1 / k) <= .02;
    return {cat:'history', ic:'padelBall', prio:4,
      title:bruch ? `Im ${MON} endet jeder ${ordnung[k - 2]} Satz ${E}` : `Im ${MON} enden ${pct(q)}\u00a0% der Sätze ${E}`,
      desc:`Das sind ${jetztE[i]} von ${n} Sätzen. In den Monaten davor waren es ${pct(vor[i] / nVor)}\u00a0%.`,
      dataRef:{ambientPids:[], bild:{f:'ergebnisse', mk, je:jetztE, vor:vor.map(x => Math.round(x / nVor * 1000)), hl:i}}};
  }});

  // ── 23. Das Tempo: mehr Sätze je Spieltag als in den Monaten davor ──
  // Gemessen gegen die letzten `tempoMonate` Monate, nicht gegen alle: der
  // erste Monat einer Liga ist oft ihr dichtester, und „so viele wie nie"
  // hätte danach nie mehr gezogen.
  T.push({key:'liga_tempo', weight:2, make: () => {
    const L2 = basis().liga, mk = sidJetzt;
    const mon = Object.keys(L2.je).sort();
    const je = k => L2.je[k] / L2.tage[k].size;
    if(!L2.je[mk] || L2.tage[mk].size < 2) return null;
    const davor = mon.filter(k => k < mk), zuletzt = davor.slice(-FF_MIN.tempoMonate);
    if(zuletzt.length < FF_MIN.tempoMonate || je(mk) <= Math.max(...zuletzt.map(je))) return null;
    const hoeher = davor.filter(k => je(k) >= je(mk)).pop();
    const zeig = mon.filter(k => k <= mk).slice(-12);
    return {cat:'history', ic:'calendar', prio:4,
      title:`Die Liga spielt im ${MON} ${komma(je(mk))} Sätze je Spieltag`,
      desc:hoeher ? `So viele waren es zuletzt im ${monatWort(hoeher)}.`
        : `So viele waren es in keinem Monat davor.`,
      dataRef:{ambientPids:[], bild:{f:'tempo', mon:zeig.map(k => [k, Math.round(je(k) * 10)]), hl:zeig.length - 1}}};
  }});

  // ── 24. Die Auszeichnungen des Monats ───────────────────────────────
  // Gezählt wird jedes Erreichen bis zum Slot (`getBadgeEarnedCache`, in
  // der Folge der Sätze gerechnet), ohne die Schande. Die Felder tragen die
  // Farbe der Klasse [§C25].
  T.push({key:'auszeichnung_monat', make: () => {
    if(monatsTag < FF_MIN.standTag || typeof getBadgeEarnedCache !== 'function') return null;
    const von = seasonStart(sidJetzt).getTime(), map = getBadgeEarnedCache(), n = {};
    basis().liste.forEach(m => { const t = mts(m); if(t < von) return;
      (map[m.id] || []).forEach(e => { const kl = rarityOf(e.badge.id);
        if(kl === 'negative' || !aktiv(e.playerId)) return;
        const z = n[e.playerId] || (n[e.playerId] = {pid:e.playerId, n:0, l:0, r:0});
        z.n++; if(kl === 'legendary') z.l++; else if(kl === 'rare') z.r++; }); });
    const r = Object.values(n).sort((a, b) => b.n - a.n || b.l - a.l || (a.pid < b.pid ? -1 : 1));
    if(r.length < 2 || r[0].n < FF_MIN.awMonat || r[1].n === r[0].n) return null;
    const N = nameOf(r[0].pid);
    return {cat:'personal', ic:'medal', prio:5, title:`${N} holt im ${MON} die meisten Auszeichnungen`,
      desc:`${N} hat ${r[0].n}, ${nameOf(r[1].pid)} folgt mit ${r[1].n}.`
        + (r[0].l ? ` ${r[0].l === 1 ? 'Eine davon ist' : r[0].l + ' davon sind'} legendär.` : ''),
      dataRef:{ambientPid:r[0].pid, bild:{f:'awmonat', r:r.slice(0, 3).map(z => [z.pid, z.n, z.l, z.r])}}};
  }});

  // ── 25. Ein Rekord in Reichweite ────────────────────────────────────
  // Dieselbe Rechnung wie `nextRecordFor` (Wert des Rekords, eigener Wert,
  // was fehlt), aber auch für den, der schon einen anderen hält:
  // `nextRecordFor` fragt nur, wer noch keinen hat, und in einer Liga, in
  // der jeder einen hält, zog die Frage nie. Nah heißt, der Rest ist
  // höchstens `rekordNah` des Werts. Wie das Prestige nur für jetzt.
  T.push({key:'rekord_reichweite', make: () => {
    if(nachher || typeof allChronicles !== 'function' || typeof _chronicleCtx !== 'function') return null;
    let A = null, C = null; try { A = allChronicles(); C = _chronicleCtx(); } catch(e){ return null; }
    const l = [];
    activePids.forEach(pid => { const p = C.P[pid]; if(!p) return;
      CHRONICLES.forEach(def => {
        if(!def.unit || def.neg) return;
        const lead = A.byId[def.id];
        if(lead && (lead.pids || []).indexOf(pid) >= 0) return;
        let mine = null; try { mine = def.raw(p, C); } catch(e){ mine = null; }
        if(mine == null || !isFinite(mine)) return;
        const target = lead ? lead.val : (def.min || 0);
        const need = lead ? Math.floor(target - mine) + 1 : Math.ceil(target - mine);
        if(need <= 0 || !(target > 0) || need / target > FF_MIN.rekordNah) return;
        l.push({pid, r:{id:def.id, name:def.name, ic:def.ic, unit:def.unit, need, have:Math.round(mine), target:Math.round(target)}});
      }); });
    l.sort((a, b) => a.r.need / a.r.target - b.r.need / b.r.target || (a.pid + a.r.id < b.pid + b.r.id ? -1 : 1));
    const c = l[0];
    if(!c) return null;
    const N = nameOf(c.pid), r = c.r, halter = ((A.byId[r.id] || {}).pids || []).filter(aktiv);
    return {cat:'history', ic:r.ic || 'trophy', prio:5, title:`${N} steht kurz vor dem Rekord „${r.name}“`,
      desc:halter.length ? `${N} kommt auf ${r.have} ${r.unit}. Den Rekord ${halter.length === 1 ? 'hält' : 'halten'} ${_namenListe(halter.map(nameOf))} mit ${r.target}.`
        : `${N} kommt auf ${r.have} ${r.unit}. Der Rekord beginnt bei ${r.target}.`,
      // Ohne `chronicle`: damit zeichnete das Blatt den Spieler als Halter
      // des Rekords, den er erst holen will.
      dataRef:{ambientPid:c.pid, bild:{f:'rekordziel', p:c.pid, id:r.id, ic:r.ic || 'trophy', name:r.name,
        mein:String(r.have), stand:String(r.target), nah:Math.min(1, r.have / r.target), halter, need:r.need, unit:r.unit}}};
  }});

  // Wer wie viele Einträge der laufenden Tafel hält, die drei vorn. Für das
  // Bild der Halbzeit, wenn eine Seite noch zu wenig Sätze hat.
  const _tafelTraeger = (aw) => {
    const n = {};
    (aw || []).forEach(a => { if(pm[a.pid]) n[a.pid] = (n[a.pid] || 0) + 1; });
    return Object.keys(n).sort((x, y) => n[y] - n[x] || (x < y ? -1 : 1)).slice(0, 3).map(pid => [pid, n[pid]]);
  };



  // ── §11.1c Rückblicke mit festem Termin ─────────────────────────────
  // Woche und Monat hat der Generator schon: der gestaffelte Montags-Block
  // [§11.1] und der season_recap beim Archivieren. Was fehlte, waren die
  // beiden langen Blicke — Monatshalbzeit und Jahreswechsel. Sie hängen
  // NICHT am Losverfahren: `pflicht` belegt den Slot direkt, damit ein
  // Rückblick nie ausfällt, weil an dem Tag zufällig etwas anderes zog.

  // ── Die Halbzeit: die beiden Seiten des Monats ────────────────────
  // Die Karte zeigte das Raster der vergebenen Monatschroniken, und ihr
  // Blatt „Die letzten zehn Sätze" — die des Tabellenführers, ohne dass sein
  // Name darüberstand. Zur Halbzeit fragt man, wer im Monat vorne liegt und
  // wo: das Bild zeigt je Seite die drei mit der besten Siegquote im Monat
  // (ab `HALBZEIT_MIN_SAETZE` auf der Seite), Revés links und Drive rechts
  // wie auf dem Court [§C44], das Blatt darunter die Spitze der Tabelle und
  // die Monatschroniken. Ein Monat ist ein Zeitraum [§C40]: wer in ihm
  // spielte, steht darin.
  T.push({ key:'rueckblick_halbzeit',
    pflicht: (tag, stunde) => stunde >= 15 && AMBIENT_TERMIN.rueckblick_halbzeit(tag),
    make: () => {
      if(typeof seasonTitles !== 'function') return null;
      let T2 = null, sid = null;
      // Der Monat des Slots, nicht der des Lesers: ein nachgetragener 15.
      // erzählte sonst vom Monat, in dem die App geöffnet wurde.
      try { sid = seasonOf(now).id; T2 = seasonTitles(sid); } catch(e){ return null; }
      if(!T2) return null;
      const offen = SEASON_TITLES.length - T2.awarded.length;
      const fuehrend = T2.champ && pm[T2.champ.pid] ? T2.champ : null;
      // Je Seite die Sätze und Siege des Monats bis zum Slot, aus der
      // Aufstellung jedes Satzes (`a1_side` …) [§C44].
      const je = {reves:{}, drive:{}};
      (matchesInSeason(sid) || []).filter(m => mts(m) <= now.getTime()).forEach(m => {
        const a = m.winner === 'A';
        [[m.a1, m.a1_side, a], [m.a2, m.a2_side, a], [m.b1, m.b1_side, !a], [m.b2, m.b2_side, !a]].forEach(([pid, seite, w]) => {
          if(!pid || !pm[pid] || !sichtbar(pid)) return;
          const o = je[seite === 'reves' ? 'reves' : 'drive'], x = o[pid] || (o[pid] = {g:0, w:0});
          x.g++; if(w) x.w++;
        });
      });
      const drei = o => Object.keys(o).filter(pid => o[pid].g >= HALBZEIT_MIN_SAETZE)
        .sort((x, y) => (o[y].w / o[y].g) - (o[x].w / o[x].g) || o[y].g - o[x].g || nameOf(x).localeCompare(nameOf(y), 'de'))
        .slice(0, 3).map(pid => [pid, o[pid].w, o[pid].g]);
      const reves = drei(je.reves), drive = drei(je.drive);
      const q = x => Math.round(x[1] / x[2] * 100);
      let tab = [];
      try { tab = saisonRang(sid).filter(e => pm[e.id]).slice(0, 5).map(e => [e.id, Math.round(e.elo), e.wins + e.losses]); } catch(e){ tab = []; }
      return { cat:'season', ic:'stopwatch', prio:6,
        title:`Der ${monatWort(sid)} ist zur Hälfte gespielt`,
        // Kurz genug für die Karte: mit den Sätzen des Führenden, den
        // vergebenen Chroniken und „Die zweite Monatshälfte entscheidet" war
        // der Satz auf 288 px abgeschnitten. Die Chroniken stehen im Blatt,
        // im Satz nur, wenn die Karte sie statt der Seiten zeigt. Vor „%" ein
        // fester Abstand, sonst stand es allein am Anfang einer Zeile.
        // Zwei Sätze, nicht drei: Menge und Spitze in einem, die Seiten im
        // zweiten [§C33].
        desc: `${T2.matches} Sätze an ${T2.days} Spieltagen` + (fuehrend ? `, ${nameOf(fuehrend.pid)} führt mit ${fuehrend.elo} Elo. ` : '. ')
          + (reves.length && drive.length
            ? `Auf Revés gewinnt ${nameOf(reves[0][0])} ${q(reves[0])} %, auf Drive ${nameOf(drive[0][0])} ${q(drive[0])} %.`
            : `${T2.awarded.length} von ${SEASON_TITLES.length} Monatschroniken sind vergeben.`),
        vv:String(offen), vl:'noch offen',
        dataRef:{ ambientPid: fuehrend ? fuehrend.pid : null, seasonTable:sid,
          bild:reves.length && drive.length
            ? {f:'halbzeit', reves, drive, tab, tafel:{voll:T2.awarded.length, alle:SEASON_TITLES.length, traeger:_tafelTraeger(T2.awarded)}}
            : {f:'tafel', voll:T2.awarded.length, alle:SEASON_TITLES.length, traeger:_tafelTraeger(T2.awarded)} } };
    }});

  T.push({ key:'rueckblick_jahr',
    pflicht: (tag, stunde) => stunde >= 10 && AMBIENT_TERMIN.rueckblick_jahr(tag),
    make: () => {
      if(typeof prestigeTabelle !== 'function') return null;
      const jahr = now.getFullYear() - 1;
      const imJahr = matches.filter(m => new Date(m.created_at).getFullYear() === jahr);
      if(!imJahr.length) return null;
      const tage = new Set(imJahr.map(m => String(m.created_at).slice(0, 10))).size;
      const tore = imJahr.reduce((a, m) => a + (m.games_a || 0) + (m.games_b || 0), 0);
      let P = null; try { P = prestigeTabelle(); } catch(e){ P = null; }
      const spitze = P && P.rang.find(id => pm[id]);
      let meister = [];
      try {
        meister = (allPastSeasons() || []).filter(sid => sid.slice(0, 4) === String(jahr))
          .map(sid => seasonChampion(sid)).filter(pid => pid && pm[pid]);
      } catch(e){ /* dann eben ohne */ }
      const zaehler = {};
      meister.forEach(pid => { zaehler[pid] = (zaehler[pid] || 0) + 1; });
      const bester = Object.keys(zaehler).sort((a, b) => zaehler[b] - zaehler[a])[0];
      return { cat:'history', ic:'calendar', prio:7,
        // Ein Hauptsatz statt „2026 in Zahlen", darunter höchstens zwei
        // Sätze: vorher standen dort vier, einer davon „1527 Punkte, Zierkranz."
        title:`${imJahr.length} Sätze spielte die Liga im Jahr ${jahr}`,
        desc: `${tage} Spieltage mit ${tore} Games.`
          + (bester ? ` ${nameOf(bester)} holte ${zaehler[bester]} von ${meister.length} Meistertiteln.`
            : spitze ? ` Im Prestige liegt ${nameOf(spitze)} vorn.` : ''),
        vv:String(imJahr.length), vl:'Sätze',
        dataRef:{ ambientPid: spitze || null, prestige: !!spitze } };
    }});

  return T;
}

