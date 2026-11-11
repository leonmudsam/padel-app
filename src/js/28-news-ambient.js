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

  const templates = _ambientTemplatePool(now, pm, nameOf);
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
  // einem Slot mehr als AMBIENT_RUHE_TAGE zurück (oder gibt es noch keine),
  // fällt er aus. Sonst erzählte der Feed jeden Tag um 15 Uhr von einer Liga,
  // die gerade niemand spielt.
  const zeiten = (matches || []).map(mts).filter(Number.isFinite).sort((a, b) => a - b);
  const lebt = t => { let lo = 0, hi = zeiten.length - 1, z = null;
    while(lo <= hi){ const mid = (lo + hi) >> 1; if(zeiten[mid] <= t){ z = zeiten[mid]; lo = mid + 1; } else hi = mid - 1; }
    return z != null && t - z <= AMBIENT_RUHE_TAGE * _dayMs; };
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
  // darf ihn via `cooldown` verkürzen (z.B. fun_random_stat, dessen Inhalt bei
  // jedem Lauf variiert → darf früher wiederkommen).
  const cooldownDaysOf = {};
  for(const t of templates) cooldownDaysOf[t.key] = t.cooldown || AMBIENT_COOLDOWN_DAYS;
  const pidsOf = dr => !dr ? [] : (Array.isArray(dr.ambientPids) ? dr.ambientPids : (dr.ambientPid ? [dr.ambientPid] : []));
  const rubrikVon = key => {
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
    for(const t of templates){
      if(typeof t.pflicht !== 'function') continue;
      if(!t.pflicht(slot.dateKey, slot.slotHour)) continue;
      let res = null;
      try { res = t.make(_ambientRng(_ambientHash(slot.dateKey + '_p'))); } catch(e){ res = null; }
      if(res){ chosenPflicht = res; chosenPflichtKey = t.key; break; }
    }

    // Der 15-Uhr-Slot mischt aktuelle Staende und Rueckblicke.
    const rolle = _ambientRolleFuerSlot(slot.slotHour);
    // Vier Durchgaenge. Die Paar-Sperre (derselbe Fakt ueber dieselbe Person
    // hoechstens einmal im Monat) gilt in den ersten dreien; erst der vierte
    // laesst sie fallen, damit ein Slot nie leer bleibt. Vorher galt sie nur in
    // den ersten beiden, und der Notnagel-Durchgang schrieb genau die
    // Wiederholung, die sie verhindern soll.
    // Durchgang −1 ist Durchgang 0 mit einer Bedingung mehr: die Karte zeigt
    // jemanden, der in den drei Tagen davor keine eigene Karte hatte.
    for(let pass = -1; pass < 4 && !chosen; pass++){
      for(const idx of order){
        const t = templates[idx];
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
        // Derselbe Fakt über dieselbe Person nicht zweimal im Monat. Diese
        // Sperre haelt bis in den dritten Durchgang.
        if(pass < 3 && (pids.length
            ? pids.some(p => recentPaare.has(t.key + '|' + p))
            : recentPaare.has(t.key + '|'))) continue;
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
      title: chosen.title,
      desc:  chosen.desc,
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

// Template-Pool: jede make()-Funktion liefert {cat, ic, title, desc, prio?,
// dataRef?} aus ECHTEN Daten — oder null, wenn die Datenlage nicht reicht.
// Icons sind bewusst auf die in NEWS_CATEGORIES bekannten beschränkt.
function _ambientTemplatePool(now, pm, nameOf){
  const stats = allPlayerStats() || {};
  // Ein Fun Fact erzählt von der Liga, wie sie heute antritt [§C40]: ein
  // Ruheständler kommt nicht vor — auch nicht als Paar oder Partner.
  const aktiv = id => ligaAktiv(pm[id]);
  const activePids = Object.keys(pm).filter(aktiv);
  const withStats = activePids.filter(pid => stats[pid] && stats[pid].games > 0);
  const T = [];

  // ── v9.13: Zeitbasierte "Form"-Aggregation der letzten 14 Tage ──
  // EINMALIG (lazy + memoisiert) über nur die jüngsten Matches. `matches` ist
  // aufsteigend nach created_at sortiert → wir laufen von hinten und brechen ab,
  // sobald ein Match älter als das Fenster ist (O(Fenster) statt O(alle)).
  // Seiten (drive/reves), knappe Partien und Tiebreak-Siege werden
  // gleich mitgezählt, damit ALLE Form-Templates diese eine Schleife teilen —
  // pro Pool-Aufbau wird sie höchstens einmal ausgeführt.
  const RECENT_DAYS = 14;
  let _recentMemo;
  const recentAgg = () => {
    if(_recentMemo) return _recentMemo;
    const cutoff = now.getTime() - RECENT_DAYS * 86400000;
    const agg = {};
    let count = 0;
    for(let i = matches.length - 1; i >= 0; i--){
      const m = matches[i];
      if(mts(m) < cutoff) break; // asc-sortiert → alles davor ist älter
      count++;
      const pz = partie(m);
      const aWon = m.winner === 'A';
      const seats = [[m.a1, m.a1_side, true], [m.a2, m.a2_side, true], [m.b1, m.b1_side, false], [m.b2, m.b2_side, false]];
      for(const [id, pos, onA] of seats){
        if(!id || !aktiv(id)) continue;
        const won = onA ? aWon : !aWon;
        let a = agg[id];
        if(!a) a = agg[id] = { g:0, w:0, aG:0, aW:0, dG:0, dW:0, cg:0, cw:0, c1w:0 };
        a.g++; if(won) a.w++;
        if(pos === 'drive'){ a.aG++; if(won) a.aW++; }
        else if(pos === 'reves'){ a.dG++; if(won) a.dW++; }
        // Knapp und im Tiebreak entschieden nach §1.3.
        if(pz.knapp){ a.cg++; if(won) a.cw++; }
        if(won && pz.entscheidTb) a.c1w++;
      }
    }
    _recentMemo = { agg, count };
    return _recentMemo;
  };
  // Deterministischer "Bester nach Metrik"-Picker (Gleichstand → kleinere pid).
  const _formPick = (elig, metric) => {
    let best = null;
    for(const pid of elig){
      const v = metric(pid);
      if(v == null) continue;
      if(!best || v > best.v || (v === best.v && pid < best.pid)) best = { pid, v };
    }
    return best;
  };

  // ── Das Bild eines Fun Facts [§C33] ──────────────────────────────
  // Jede Karte trug dieselbe Form: eine große Zahl links, der Satz rechts —
  // die Pause sah aus wie die Vitrine, das Duell wie das Prestige. Jede
  // Vorlage legt jetzt die Daten ihres Bilds in `bild`, und der Feed zeichnet
  // daraus den Kopf ihres Anlasses (`_faktBild`). Gespeichert wird es mit der
  // Karte: ein Fun Fact ist eine Ziehung und erzählt vom Tag, an dem er stand.
  // Die Breite eines Balkens steht mit dabei, weil ein Wert wie „Ø 6,5
  // Gegentore" kleiner besser ist und das Bild das nicht wissen soll.
  // `kleinerBesser` nur für eine Reihe, die aufsteigend sortiert ist. Die
  // Reihenfolge eines Rekords (`chronicleRang`) ist schon nach dem Wert
  // geordnet, auch wo weniger besser ist — dort steht der Wert negiert.
  const _bRennen = (l, kleinerBesser, form) => {
    const r = l.filter(x => x && pm[x.p]).slice(0, 3);
    if(!r.length) return null;
    const v = r.map(x => Number(x.v) || 0), max = Math.max(...v), min = Math.min(...v);
    return {f:form || 'rennen', r:r.map((x, k) => ({p:x.p, t:String(x.t), n:x.n, w:+(
      kleinerBesser ? (max > 0 ? min / Math.max(v[k], 1e-9) : 1 - k * .2)
      : (max > 0 && min >= 0 ? v[k] / max : 1 - k * .2)).toFixed(3)}))};
  };
  const _bReihe = (pool, val, fmt, kleinerBesser, form) => _bRennen(pool
    .map(pid => ({p:pid, v:val(pid)})).filter(x => x.v != null && isFinite(x.v))
    .sort((a, b) => kleinerBesser ? a.v - b.v : b.v - a.v)
    .map(x => ({p:x.p, v:x.v, t:fmt(x.v), n:x.v})), kleinerBesser, form);
  // Eine große Summe als Zählwerk, dahinter der Zweite und der Abstand.
  const _bZahl = (pool, val) => {
    const r = pool.filter(pid => pm[pid]).map(pid => ({p:pid, v:val(pid)})).sort((a, b) => b.v - a.v);
    return r.length ? {f:'zahl', p:r[0].p, n:r[0].v, zweiter:r[1] ? {p:r[1].p, n:r[1].v} : null} : null;
  };

  // ── Fun Fact: die Games der Liga ──
  // Eine Karte, die zwei Zahlen verbindet: wie viele Games gespielt werden
  // und wie ein Satz meistens ausgeht. Der Schlüssel `fun_goals` stammt aus
  // der Kicker-Liga.
  T.push({ key:'fun_goals', make: () => {
    if(matches.length < 10) return null;
    let g = 0; const cnt = {};
    for(const m of matches){
      g += (m.games_a||0) + (m.games_b||0);
      satzErgebnisse(m).forEach(k => { cnt[k] = (cnt[k] || 0) + 1; });
    }
    let bk = null, bn = 0;
    for(const k in cnt) if(cnt[k] > bn){ bn = cnt[k]; bk = k; }
    if(!bk) return null;
    return { cat:'fun', ic:'thriller', prio:3,
      title:`${g} Games in ${matches.length} Sätzen`,
      desc:`Im Schnitt ${komma(g/matches.length)} Games je Satz. Am häufigsten endet ein Satz ${bk}, das war ${bn} Mal so.`,
      vv: g, vl:'Games',
      dataRef:{ bild:{f:'verteilung', je:FF_SAETZE.map(k => cnt[k] || 0), hl:[FF_SAETZE.indexOf(bk)].filter(i => i >= 0)} } };
  }});

  // ── Persönlich: Siegquoten-Führer (min. 5 Spiele) ──
  T.push({ key:'personal_wr', make: () => {
    const elig = withStats.filter(pid => stats[pid].games >= 5);
    if(!elig.length) return null;
    elig.sort((a,b) => stats[b].wr - stats[a].wr);
    const pid = elig[0], st = stats[pid];
    return { cat:'personal', ic:'crown', prio:4,
      // v9.17: Der Filter ist „ab 5 Spielen" — das gehört auch in den Text,
      // sonst behauptet die News eine Liga-Bestmarke, die sie gar nicht prüft.
      title:`${nameOf(pid)} gewinnt einfach`,
      desc:`Beste Siegquote der Liga (ab 5 Sätzen): ${Math.round(st.wr*100)} % aus ${st.games} Sätzen.`,
      vv: Math.round(st.wr*100)+' %', vl:'Siegquote',
      dataRef:{ ambientPid: pid, bild:_bReihe(elig, p2 => stats[p2].wr, v => Math.round(v * 100) + ' %', false, 'podest') } };
  }});

  // ── Persönlich: Vielspieler ──
  T.push({ key:'personal_grinder', make: () => {
    if(!withStats.length) return null;
    const pid = withStats.slice().sort((a,b) => stats[b].games - stats[a].games)[0];
    if(stats[pid].games < 10) return null;
    return { cat:'personal', ic:'medalTrio', prio:3,
      title:`${nameOf(pid)} ist Dauergast`,
      desc:`Niemand spielt mehr: ${stats[pid].games} Sätze auf dem Konto.`,
      vv: stats[pid].games, vl:'Sätze',
      dataRef:{ ambientPid: pid, bild:_bZahl(withStats, p2 => stats[p2].games) } };
  }});

  // ── Persönlich: heißeste aktuelle Serie ──
  T.push({ key:'personal_streak', make: () => {
    if(!withStats.length) return null;
    const pid = withStats.slice().sort((a,b) => (stats[b].curStreak||0) - (stats[a].curStreak||0))[0];
    const cs = stats[pid].curStreak || 0;
    if(cs < 3) return null;
    return { cat:'personal', ic:'trendUp', prio:5,
      title:`${nameOf(pid)} läuft heiß`,
      desc:`${cs} Siege in Folge. Aktuell die heißeste Serie der Liga.`,
      vv: cs+'×', vl:'in Folge',
      dataRef:{ ambientPid: pid, bild:{f:'lauf', p:pid, n:cs} } };
  }});

  // ── Rivalität: meistgespieltes Duell ──
  T.push({ key:'rivalry_most', make: () => {
    const map = _ensureH2HMap();
    if(!map || !map.size) return null;
    let best = null;
    for(const [k, e] of map){
      const [pa, pb] = k.split('|');
      if(!aktiv(pa) || !aktiv(pb)) continue;
      const wa = e.wins[pa]||0, wb = e.wins[pb]||0, total = wa + wb;
      if(total < 3) continue;
      if(!best || total > best.total) best = { pa, pb, total, wa, wb };
    }
    if(!best) return null;
    return { cat:'rivalry', ic:'crossedSwords', prio:4,
      title:`Duell der Liga: ${nameOf(best.pa)} vs ${nameOf(best.pb)}`,
      desc:`${best.total} direkte Duelle. Siege: ${nameOf(best.pa)} ${best.wa}, ${nameOf(best.pb)} ${best.wb}.`,
      vv: best.total, vl:'Duelle',
      dataRef:{ ambientPids:[best.pa, best.pb], pairKind:'duel', bild:{f:'duell', a:best.pa, b:best.pb, wa:best.wa, wb:best.wb} } };
  }});

  // ── Rivalität: engste Bilanz (min. 4) ──
  T.push({ key:'rivalry_close', make: () => {
    const map = _ensureH2HMap();
    if(!map || !map.size) return null;
    let best = null;
    for(const [k, e] of map){
      const [pa, pb] = k.split('|');
      if(!aktiv(pa) || !aktiv(pb)) continue;
      const wa = e.wins[pa]||0, wb = e.wins[pb]||0, total = wa + wb;
      if(total < 4) continue;
      const diff = Math.abs(wa - wb);
      if(!best || diff < best.diff || (diff === best.diff && total > best.total)) best = { pa, pb, wa, wb, total, diff };
    }
    if(!best) return null;
    return { cat:'rivalry', ic:'crossedSwords', prio:4,
      title:`Kopf-an-Kopf: ${nameOf(best.pa)} und ${nameOf(best.pb)}`,
      // Zwischen den beiden Zahlen stand ein Halbgeviertstrich, und der ist in
      // einem Satz ein Gedankenstrich und kein Bilanzstrich. Die Bilanz steht
      // jetzt als Doppelpunkt-Paar da, wie ueberall sonst in der App.
      desc:`${best.total} direkte Duelle, ${best.diff === 0 ? 'absolut ausgeglichen' : 'nur ' + best.diff + ' Sieg' + (best.diff === 1 ? '' : 'e') + ' Unterschied'}. ${best.diff === 0 ? `Es steht ${best.wa}:${best.wb}.` : `Es steht ${Math.max(best.wa, best.wb)}:${Math.min(best.wa, best.wb)} für ${nameOf(best.wa > best.wb ? best.pa : best.pb)}.`}`,
      vv: best.wa+':'+best.wb, vl:'Bilanz',
      dataRef:{ ambientPids:[best.pa, best.pb], pairKind:'duel', bild:{f:'duell', a:best.pa, b:best.pb, wa:best.wa, wb:best.wb} } };
  }});

  // ── Historie: Liga-Alter ──
  // ── Historie: das Jubiläum ──
  // Hieß „Die Liga lebt" und zählte den Kalender: die Zahl wuchs jeden Tag um
  // eins und war an keinem Tag eine Nachricht. Jetzt meldet sich die Karte nur
  // zu einer runden Zahl, und dann sagt sie, wer sie gespielt hat.
  T.push({ key:'history_age', make: () => {
    if(matches.length < 50) return null;
    const stufe = matches.length >= 1000 ? 500 : matches.length >= 300 ? 100 : 50;
    const marke = Math.floor(matches.length / stufe) * stufe;
    if(matches.length - marke > 5) return null;   // nur frisch nach der Marke
    const mObj = matches[marke - 1];
    if(!mObj) return null;
    const sieger = (mObj.winner === 'A' ? [mObj.a1, mObj.a2] : [mObj.b1, mObj.b2])
      .filter(id => sichtbar(pm[id])).map(nameOf);
    const d = new Date(mObj.created_at);
    const dd = String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.';
    return { cat:'history', ic:'calendar', prio:5,
      title:`Der ${marke}. Satz der Liga`,
      desc: sieger.length
        ? `Gespielt am ${dd}, gewonnen von ${sieger.join(' und ')} mit ${standFuer(mObj)}.`
        : `Gespielt am ${dd}, Endstand ${mObj.games_a}:${mObj.games_b}.`,
      vv: marke, vl:'Sätze',
      dataRef:{ bild:{f:'zaehler', n:marke, sieger:(mObj.winner === 'A' ? [mObj.a1, mObj.a2] : [mObj.b1, mObj.b2]).filter(id => pm[id]),
        stand:standFuer(mObj)} } };
  }});

  // ── Fun Fact: Game-König (meiste gewonnene Games der Laufbahn) ──
  // Ohne Mindestspiele: die Aussage lautet „kein Spieler hat mehr gewonnen"
  // — eine Gesamtsumme braucht keine Mindestanzahl. Schlüssel aus der
  // Kicker-Liga (`fun_top_scorer`).
  T.push({ key:'fun_top_scorer', make: () => {
    const elig = withStats.filter(pid => stats[pid].gf > 0);
    if(!elig.length) return null;
    const sorted = elig.slice().sort((a,b) => stats[b].gf - stats[a].gf);
    const pid = sorted[0];
    const runnerUp = sorted[1] ? stats[pid].gf - stats[sorted[1]].gf : null;
    return { cat:'personal', ic:'thriller', prio:3,
      title:`${nameOf(pid)} ist Game-König`,
      desc: runnerUp != null
        ? `${stats[pid].gf} gewonnene Games insgesamt. ${runnerUp} mehr als ${nameOf(sorted[1])} dahinter.`
        : `${stats[pid].gf} gewonnene Games insgesamt. Kein Spieler hat mehr gewonnen.`,
      vv: stats[pid].gf, vl:'Games',
      dataRef:{ ambientPid: pid, bild:_bZahl(sorted, p2 => stats[p2].gf) } };
  }});

  // ── Fun Fact: aktueller Spitzenreiter (Elo-#1, v8.8) ──
  // v9.17 KONSISTENZ: Der Spitzenreiter kam aus getGlobalSim().elo, gefiltert
  // nach KARRIERE-Spielen ≥3. Die Rangliste (§5.1) zeigt dagegen die
  // SAISON-Tabelle aus periodPlayerStats('season') — wer in der laufenden Saison
  // noch nicht gespielt hat, steht dort gar nicht drin. Direkt nach einem
  // Saison-Reset stehen zudem alle auf dem Startwert, und die News kürte einen
  // beliebigen „Spitzenreiter" mit 0 Punkten Vorsprung. Jetzt dieselbe Quelle
  // und dieselbe Sortierung wie die Rangliste — eine Wahrheit, keine Abweichung.
  T.push({ key:'fun_leader', make: () => {
    if(typeof periodPlayerStats !== 'function') return null;
    const ranked = periodPlayerStats('season')
      .filter(r => aktiv(r.id))
      .slice()
      .sort((a,b) => b.elo - a.elo || b.wins - a.wins);
    if(ranked.length < 2) return null;
    const lead = ranked[0].elo - ranked[1].elo;
    if(lead <= 0) return null; // Gleichstand an der Spitze → kein „thront"
    return { cat:'personal', ic:'crown', prio:4,
      title:`${nameOf(ranked[0].id)} thront an der Spitze`,
      desc:`${ranked[0].elo} Elo in dieser Saison. ${lead} Punkte vor ${nameOf(ranked[1].id)}.`,
      vv: ranked[0].elo, vl:'Elo',
      dataRef:{ ambientPid: ranked[0].id, bild:_bRennen(ranked.map(r => ({p:r.id, v:r.elo, t:r.elo + ' Elo'})), false, 'podest') } };
  }});

  // ── Fun Fact: höchster Sieg aller Zeiten (v8.8) ──
  T.push({ key:'fun_biggest_win', make: () => {
    if(matches.length < 5) return null;
    let best = null;
    for(const m of matches){
      const hi = Math.max(m.games_a||0, m.games_b||0), lo = Math.min(m.games_a||0, m.games_b||0);
      const diff = hi - lo;
      if(!best || diff > best.diff) best = {diff, hi, lo, m};
    }
    if(!best || best.diff < 6) return null;
    const dt = new Date(best.m.created_at);
    return { cat:'fun', ic:'thriller', prio:3,
      title:'Klarste Klatsche der Liga',
      desc:`Höchster Sieg aller Zeiten: ${best.hi}:${best.lo} am ${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.`,
      vv: best.hi+':'+best.lo, vl:'Rekord',
      dataRef:{ bild:{f:'verteilung', je:[0,1,2,3,4,5,6,7,8,9].map(i => matches.filter(m =>
        Math.max(m.games_a||0, m.games_b||0) === 10 && Math.min(m.games_a||0, m.games_b||0) === i).length), hl:[best.lo]} } };
  }});

  // ── Fun Fact: aktivster Spieltag (v8.8) ──
  T.push({ key:'fun_busiest_day', make: () => {
    if(matches.length < 8) return null;
    const byDay = {};
    for(const m of matches){
      const dk = tagKey(m.created_at);
      byDay[dk] = (byDay[dk] || 0) + 1;
    }
    let bk = null, bn = 0;
    for(const dk in byDay){ if(byDay[dk] > bn){ bn = byDay[dk]; bk = dk; } }
    if(bn < 5) return null;
    const p = bk.split('-');
    return { cat:'fun', ic:'calendar', prio:2,
      title:'Rekord-Spieltag',
      desc:`Die meisten Sätze an einem Tag: ${bn} am ${p[2]}.${p[1]}.${p[0]}.`,
      vv: bn, vl:'Sätze',
      dataRef:{ bild:(() => { const ks = Object.keys(byDay).sort().slice(-24);
        if(!ks.includes(bk)){ ks.shift(); ks.push(bk); ks.sort(); }
        return {f:'saeulen', v:ks.map(k => byDay[k]), hl:[ks.indexOf(bk)], l:'Spieltage'}; })() } };
  }});

  // Spielreichste oder ruhigste tatsächlich bespielte Kalenderwoche. Das
  // erklärt den Rhythmus der Liga statt eine beliebige Einzelzahl zu ziehen.
  T.push({ key:'history_week_volume', weight:2, make: rng => {
    if(matches.length < 12) return null;
    const wochen = {};
    for(const m of matches){
      const d = new Date(m.created_at), tag = wochentagMo(d);
      const mo = new Date(d.getFullYear(), d.getMonth(), d.getDate() - tag);
      const k = tagKey(mo);
      if(!wochen[k]) wochen[k] = {n:0, von:mo};
      wochen[k].n++;
    }
    const l = Object.values(wochen).sort((a, b) => b.n - a.n || a.von - b.von);
    if(l.length < 3) return null;
    const laut = l[0], still = l.slice().sort((a, b) => a.n - b.n || a.von - b.von)[0];
    const x = rng() < .55 ? laut : still, istLaut = x === laut;
    const bis = new Date(x.von.getFullYear(), x.von.getMonth(), x.von.getDate() + 6);
    return {cat:'history', ic:istLaut ? 'flame' : 'calendar', prio:4,
      title:istLaut ? 'Die spielreichste Woche bisher' : 'Die ruhigste Spielwoche bisher',
      desc:`${x.n} ${x.n === 1 ? 'Satz' : 'Sätze'} zwischen ${datumFmt(x.von, 'tmx')} und ${tagImSatz(bis)} `
        + (istLaut ? `Der bisherige Wochenrekord.` : `Weniger wurde in keiner Woche mit Spielbetrieb gespielt.`),
      vv:String(x.n), vl:'Sätze',
      dataRef:{ bild:(() => { const ws = Object.values(wochen).sort((a, b) => a.von - b.von).slice(-24);
        if(!ws.includes(x)){ ws.shift(); ws.push(x); ws.sort((a, b) => a.von - b.von); }
        return {f:'saeulen', v:ws.map(w => w.n), hl:[ws.indexOf(x)], l:'Wochen', still:!istLaut}; })() }};
  }});

  // Ein Rekord aus dem echten Awards-Katalog, mit Halter und Beleg. So macht
  // der Funfact zugleich auf eine Funktion der App aufmerksam.
  T.push({ key:'record_spotlight', weight:2, make: rng => {
    let byId = null;
    try { byId = (allChronicles() || {}).byId; } catch(e){ return null; }
    const l = Object.values(byId || {}).filter(r => r && r.pids && r.pids.length
      && r.pids.some(aktiv));
    if(!l.length) return null;
    const r = l[Math.floor(rng() * l.length)], pids = r.pids.filter(aktiv);
    const namen = pids.slice(0, 3).map(nameOf);
    return {cat:'history', ic:r.ic || 'trophy', prio:5,
      title:`Rekord im Fokus: ${r.name}`,
      desc:`${_namenListe(namen)} ${pids.length === 1 ? 'hält' : 'halten'} diese Bestmarke. ${String(r.ev || r.cond || 'Der Beleg steht in der Ewigen Tafel.').replace(/\s*[·•]\s*/g, '. ')}`,
      // Der Wert stand roh da: „0.72" mit englischem Punkt für 72 Prozent.
      // Der Beleg beginnt mit dem Sortierwert [§C35] und trägt seine Einheit.
      vv:_chronKurz(r.ev) || String(r.val), vl:'Bestwert', dataRef:{ambientPids:pids.slice(0, 3), rekordId:r.id,
        bild:_bRennen(_rekRang(r.id).map(x => ({p:x.pid, v:x.wert, t:_chronKurz(x.ev) || komma(x.wert)})), false, 'podest')}};
  }});

  // ══ Neue lebendige Fun Facts (v9.1) ══
  const _gsim = () => getGlobalSim() || {};

  // ── Fun Fact: Random Top-1 eines Awards/Rankings ──
  T.push({ key:'fun_award_leader', make: (rng) => {
    const career = _gsim().careerElo || {};
    const elig = withStats.filter(pid => stats[pid].games >= 5);
    if(elig.length < 2) return null;
    // Kumulative Kennzahlen (Siege, Games, Game-Bilanz) werden über ALLE
    // Spieler mit Spielen ermittelt — eine Gesamtsumme braucht keine
    // Mindestanzahl. Nur die Karriere-Elo (eine Wertung, keine Summe) behält den
    // 5-Spiele-Filter, und der steht dann auch im Text.
    const cats = [
      { noun:'Meiste Siege',         ic:'trophy',  pool:withStats, val: pid => stats[pid].wins,               fmt: v => v+' Siege' },
      { noun:'Beste Game-Bilanz',    ic:'plusMinus', pool:withStats, val: pid => stats[pid].gf - stats[pid].ga, fmt: v => (v>0?'+':'')+v+' Games' },
      { noun:'Meiste Games',         ic:'padelBall', pool:withStats, val: pid => stats[pid].gf,               fmt: v => v+' Games' },
      { noun:'Höchste Karriere-Elo', ic:'crown',   pool:elig,      val: pid => Math.round(career[pid]||0),    fmt: v => v+' Elo', qual:' (ab 5 Sätzen)' },
    ];
    const c = cats[Math.floor(rng()*cats.length)];
    let best = null, second = null;
    for(const pid of c.pool){
      const v = c.val(pid);
      if(best === null || v > best.v){ second = best; best = {pid, v}; }
      else if(second === null || v > second.v){ second = {pid, v}; }
    }
    if(!best) return null;
    // Bei Gleichstand führt niemand allein. Der Vergleich schob den zweiten
    // Spieler mit DEMSELBEN Wert in den Else-Zweig, und die Karte las sich als
    // „221 Siege. Liga-Bestwert, vor Martin mit 221 Siegen" — ein Bestwert und
    // sein Gleichstand in einem Satz.
    if(second && second.v === best.v) return null;
    return { cat:'personal', ic:c.ic, prio:5,
      title:`${c.noun}: ${nameOf(best.pid)} führt`,
      desc: second
        ? `${c.fmt(best.v)}. Liga-Bestwert${c.qual||''}, vor ${nameOf(second.pid)} mit ${c.fmt(second.v)}.`
        : `${nameOf(best.pid)} hält den Liga-Bestwert${c.qual||''}. ${c.fmt(best.v)}.`,
      vv: best.v, vl: c.noun.replace(/^(Meiste|Bestes|Beste|Höchste)\s+/, ''),
      dataRef:{ ambientPid: best.pid, bild:_bReihe(c.pool, c.val, v => (c.fmt(v).match(/^[+-]?\d+/) || [String(v)])[0]) } };
  }});

  // ── Fun Fact: Random Stat zu random Spieler ──
  // v9.11: bewusst höher gewichtet (weight 3) + kürzerer Cooldown (3 statt 7
  // Tage). Dieser Typ hat die größte inhaltliche Variabilität (zufälliger
  // Spieler × zufällige Kennzahl), darf also vergleichsweise öfter kommen, ohne
  // zu langweilen — Standard-Cooldown wäre sonst die harte Frequenz-Obergrenze.
  T.push({ key:'fun_random_stat', weight:3, cooldown:3, make: (rng) => {
    const elig = withStats.filter(pid => stats[pid].games >= 5);
    if(!elig.length) return null;
    const pid = elig[Math.floor(rng()*elig.length)];
    const st = stats[pid];
    // Vorher zog diese Karte eine BELIEBIGE Kennzahl: „Henry gewinnt 39 %
    // seiner Spiele" stand als Nachricht im Feed und sagte ihrem Helden, dass
    // er unterdurchschnittlich ist. Eine Meldung über einen Spieler soll ihn
    // belohnen — gesucht wird deshalb die Kennzahl, in der er am WEITESTEN
    // vorne steht, und genannt wird sein Platz darin.
    const felder = [
      {n:'Sätze',          v:p2 => stats[p2].games,                        fmt:v => `${v} Sätze`},
      {n:'Siegen',           v:p2 => stats[p2].wins,                         fmt:v => `${v} Siege`},
      {n:'gewonnenen Games', v:p2 => stats[p2].gf,                           fmt:v => `${v} Games`},
      {n:'der Siegquote',    v:p2 => stats[p2].games ? stats[p2].wins/stats[p2].games : 0,
                             fmt:v => `${Math.round(v*100)} % Siegquote`},
      {n:'Games je Satz',  v:p2 => stats[p2].games ? stats[p2].gf/stats[p2].games : 0,
                             fmt:v => `${komma(v)} Games je Satz`},
    ];
    let bestes = null;
    felder.forEach(f => {
      const reihe = elig.slice().sort((x, y) => f.v(y) - f.v(x));
      const platz = reihe.indexOf(pid) + 1;
      if(!platz) return;
      if(!bestes || platz < bestes.platz) bestes = {f, platz, wert:f.v(pid), von:reihe.length};
    });
    if(!bestes) return null;
    return { cat:'personal', ic:'chartBar', prio:4,
      title: bestes.platz === 1
        ? `${nameOf(pid)} führt die Liga bei ${bestes.f.n} an`
        : `${nameOf(pid)} ist Nummer ${bestes.platz} bei ${bestes.f.n}`,
      // Der Platz steht in der Schlagzeile („ist Nummer 9", „führt … an");
      // „Platz 9 von 11." darunter sagte ihn ein zweites Mal.
      desc:`${bestes.f.fmt(bestes.wert)}, unter ${bestes.von} Spielern. `
         + (bestes.platz === 1 ? `` : `In keiner anderen Kennzahl steht ${nameOf(pid)} weiter vorn.`),
      // „1 Platz" las sich wie eine Anzahl. Ein Rang heisst „Platz 1".
      vv: 'Platz ' + bestes.platz, vl:'von ' + (bestes.von || ''),
      dataRef:{ ambientPid: pid, bild:{f:'platz', p:pid, platz:bestes.platz, von:bestes.von, t:bestes.f.fmt(bestes.wert)} } };
  }});

  // ── Fun Fact: Platzierung in der ewigen Gesamt-Rangliste (random Spieler) ──
  // ── Gestrichen: „X auf Platz 12 von 12" ──
  // Der Typ zog einen zufälligen Spieler aus der Rangliste und nannte seinen
  // Platz. Bei zwölf Spielern traf das regelmäßig den Letzten, und eine Karte
  // über einen Spieler soll ihn belohnen. Die Kennzahl, in der jemand am
  // weitesten vorne steht, sucht `fun_random_stat`.

  // ── Fun Fact: längste gemeinsame Team-Serie ──
  // v9.17 FORMULIERUNG: Hieß pauschal „Rekord-Duo", zog aber ein ZUFÄLLIGES Duo
  // mit ≥3 gemeinsamen Siegen in Serie — das ist per Definition kein Rekord und
  // „einer der besten Läufe der Liga" war schlicht ungeprüft. Jetzt wird die
  // Bestmarke der Liga mitberechnet: nur das tatsächlich führende Duo heißt
  // „Rekord-Duo", alle anderen bekommen eine ehrliche Einordnung (Platz + Abstand
  // zur Bestmarke). Die Zufallsauswahl bleibt — sie sorgt für die Abwechslung.
  T.push({ key:'fun_team_record', make: (rng) => {
    const rec = {}; // teamKey → {ids, best, cur}
    for(const m of matches){
      const sides = [[m.a1,m.a2,m.winner==='A'],[m.b1,m.b2,m.winner==='B']];
      for(const [x,y,won] of sides){
        if(!x || !y) continue;
        const ids = [x,y].sort(), k = ids.join('|');
        if(!rec[k]) rec[k] = {ids, best:0, cur:0};
        rec[k].cur = won ? rec[k].cur + 1 : 0;
        if(rec[k].cur > rec[k].best) rec[k].best = rec[k].cur;
      }
    }
    const cands = Object.values(rec).filter(t =>
      t.best >= 3 && aktiv(t.ids[0]) && aktiv(t.ids[1]));
    if(!cands.length) return null;
    // Bestmarke + Rang aus derselben Liste — keine zweite Berechnung.
    const ranked = cands.slice().sort((a,b) => b.best - a.best || (a.ids[0] < b.ids[0] ? -1 : 1));
    const topBest = ranked[0].best;
    // Gezogen wird aus dem vorderen Drittel, nicht aus allen. Gleichverteilt
    // ueber das Feld stand „Eingespielt: Martin & Stefan" ueber einem Duo auf
    // Platz 24 von 24 — eine Karte, die einen Spieler feiert und ihm dabei
    // sagt, dass er Letzter ist [§C33].
    const feld = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / 3)));
    const t = feld[Math.floor(rng()*feld.length)] || feld[0];
    const rank = ranked.findIndex(x => x.ids[0] === t.ids[0] && x.ids[1] === t.ids[1]) + 1;
    const isRecord = t.best === topBest;
    const nm = `${nameOf(t.ids[0])} und ${nameOf(t.ids[1])}`;
    return { cat:'team', ic:'unstoppable', prio:isRecord ? 5 : 4,
      title: isRecord ? `Rekord-Duo: ${nm}` : `Eingespielt: ${nm}`,
      desc: isRecord
        ? `${t.best} gemeinsame Siege in Serie. Kein Duo der Liga war je länger unschlagbar.`
        : `${t.best} gemeinsame Siege in Serie. Das ist Platz ${rank} von ${ranked.length} Duos, `
          + `nur ${topBest - t.best} hinter der Bestmarke.`,
      vv: t.best, vl:'in Serie',
      dataRef:{ ambientPids:[t.ids[0], t.ids[1]], pairKind:'team', bild:{f:'duo', a:t.ids[0], b:t.ids[1], lauf:t.best, best:topBest} } };
  }});

  // ══ Zeitbasierte Form-Fakten (v9.13) — Momentaufnahme der letzten 14 Tage ══
  // Diese Typen leben von der aktuellen Form: das Fenster rollt täglich weiter,
  // die Bestenlisten ändern sich also von allein und bringen Abwechslung — ein
  // Mittelfeldspieler kann kurzfristig heiß laufen, auch wenn seine Karriere-Werte
  // unauffällig sind. Alle teilen recentAgg() (eine einzige Schleife, s.o.) und
  // greifen auf bereits vorhandene Konventionen zurück (Seiten drive/reves,
  // enge Spiele Tordiff ≤ 2 = wie Clutch-Award, 1-Tor-Sieg = Zittersieg).

  // ── Beste Siegquote der letzten 14 Tage ──
  T.push({ key:'form_best_wr', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].g >= 4);
    const best = _formPick(elig, id => agg[id].w / agg[id].g);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'trendUp', prio:5,
      title:`${nameOf(best.pid)} ist in Topform`,
      desc:`Beste Siegquote der letzten 14 Tage: ${Math.round(best.v*100)} % aus ${a.g} Sätzen.`,
      vv: Math.round(best.v*100)+'\u00A0%', vl:'14 Tage',
      dataRef:{ ambientPid: best.pid, bild:_bReihe(elig, id => agg[id].w / agg[id].g, v => Math.round(v * 100) + ' %') } };
  }});

  // ── Rechts in Form: beste Siegquote auf der Drive-Seite (14 Tage) ──
  // Schlüssel aus der Kicker-Liga (`form_striker`).
  T.push({ key:'form_striker', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].aG >= 3);
    const best = _formPick(elig, id => agg[id].aW / agg[id].aG);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'posDrive', prio:5,
      title:`${nameOf(best.pid)} glänzt rechts`,
      desc:`Beste Quote auf der Drive-Seite in den letzten 14 Tagen: ${Math.round(best.v*100)} % aus ${a.aG} Sätzen.`,
      vv: Math.round(best.v*100)+'\u00A0%', vl:'rechts',
      dataRef:{ ambientPid: best.pid, bild:_bReihe(elig, id => agg[id].aW / agg[id].aG, v => Math.round(v * 100) + ' %') } };
  }});

  // ── Links in Form: beste Siegquote auf der Revés-Seite (14 Tage) ──
  // Schlüssel aus der Kicker-Liga (`form_defender`).
  T.push({ key:'form_defender', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].dG >= 3);
    const best = _formPick(elig, id => agg[id].dW / agg[id].dG);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'posReves', prio:5,
      title:`${nameOf(best.pid)} glänzt links`,
      desc:`Beste Quote auf der Revés-Seite in den letzten 14 Tagen: ${Math.round(best.v*100)} % aus ${a.dG} Sätzen.`,
      vv: Math.round(best.v*100)+'\u00A0%', vl:'links',
      dataRef:{ ambientPid: best.pid, bild:_bReihe(elig, id => agg[id].dW / agg[id].dG, v => Math.round(v * 100) + ' %') } };
  }});

  // ── Clutch: höchste Siegquote in knappen Partien (14 Tage) ──
  T.push({ key:'form_clutch', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].cg >= 3);
    const best = _formPick(elig, id => agg[id].cw / agg[id].cg);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'target', prio:5,
      title:`${nameOf(best.pid)} hat Nerven aus Stahl`,
      desc:`Gewinnt aktuell ${Math.round(best.v*100)} % der knappen Sätze, ${a.cw} von ${a.cg} in 14 Tagen.`,
      vv: Math.round(best.v*100)+'\u00A0%', vl:'knapp gewonnen',
      dataRef:{ ambientPid: best.pid, bild:_bReihe(elig, id => agg[id].cw / agg[id].cg, v => Math.round(v * 100) + ' %') } };
  }});

  // ── Zittersiege: höchster Anteil im Tiebreak gewonnener Partien (14 Tage) ──
  T.push({ key:'form_close_wins', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].g >= 4 && agg[id].c1w >= 2);
    const best = _formPick(elig, id => agg[id].c1w / agg[id].g);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'nerves', prio:4,
      title:`${nameOf(best.pid)} zittert sich durch`,
      // „12 % ALLER Spiele der letzten 14 Tage" stand da, gerechnet war
      // aber der Anteil an den Partien DIESES Spielers — die Zahl gehoerte
      // dem Helden, der Satz der Liga. Und die Stichprobe gehoert zur
      // Aussage: „x von y", nicht nur der Anteil [§C37].
      desc:`${a.c1w} von ${a.g} Sätzen der letzten 14 Tage gewann `
        + `${nameOf(best.pid)} im Tiebreak, das sind `
        + `${Math.round(best.v*100)} %.`,
      vv: a.c1w, vl:'Zittersiege',
      dataRef:{ ambientPid: best.pid, bild:_bReihe(elig, id => agg[id].c1w / agg[id].g, v => Math.round(v * 100) + ' %') } };
  }});

  // ── Aktivster Spieler der letzten 14 Tage ──
  T.push({ key:'form_most_active', make: () => {
    const { agg, count } = recentAgg();
    if(count < 8) return null;
    const best = _formPick(Object.keys(agg), id => agg[id].g);
    if(!best || best.v < 4) return null;
    return { cat:'personal', ic:'medalTrio', prio:3,
      title:`${nameOf(best.pid)} gibt Vollgas`,
      desc:`Aktivster Spieler der letzten 14 Tage: ${best.v} Sätze in zwei Wochen.`,
      vv: best.v, vl:'Sätze',
      dataRef:{ ambientPid: best.pid, bild:_bReihe(Object.keys(agg), id => agg[id].g, v => String(v)) } };
  }});

  // ══ Award-Fokus (v9.17) ═══════════════════════════════════════════════
  // Wunsch: die Top-1-Spieler der Auszeichnungen sollen in den 10-und-19-Uhr-
  // News deutlich öfter vorkommen. Diese Typen sind darum höher gewichtet
  // (weight 2) — der Spieler-Cooldown (AMBIENT_PLAYER_COOLDOWN_DAYS) sorgt
  // weiterhin dafür, dass nicht tagelang derselbe Kopf gefeiert wird.
  //
  // WICHTIG: Alle Zahlen kommen aus den BESTEHENDEN Zählern (countDayWins,
  // countPeriodWins, getCachedBadges/rarityOf) — exakt die Werte, die auch im
  // Spielerprofil und im Auszeichnungen-Sheet stehen. Keine zweite Berechnung,
  // also auch keine Abweichung.

  // Kleiner Helfer: Rangliste über einen Award-Zähler, absteigend, Gleichstand
  // deterministisch nach pid. Liefert [{pid, v}] ohne Nullwerte.
  const _awardRank = (pids, val) => pids
    .map(pid => ({ pid, v: val(pid) || 0 }))
    .filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v || (a.pid < b.pid ? -1 : 1));
  // Bei Gleichstand an der Spitze darf kein Einzelner als Bestwert-Halter
  // ausgerufen werden („Bestwert, X folgt mit 3" bei 3:3 liest sich falsch).
  // Liefert alle Spieler mit dem Höchstwert.
  const _awardLeaders = rank => rank.filter(x => x.v === rank[0].v);
  // Die Aufzaehlung hat die App schon (`_namenListe`, §C27). Hier stand eine
  // zweite mit „&" dazwischen, und das Zeichen gehoert in eine Tabellenzelle,
  // nicht in einen Satz: „Leon & Martin liegen gleichauf" war die einzige
  // Stelle im Feed, die zwei Namen nicht ausschrieb [§C33].
  const _namesOf = arr => _namenListe(arr.map(x => nameOf(x.pid)));

  // ── Eine Führung ist die des REKORDS, nicht die der Anzahl [§C35] ──
  // „Leon ist der Tageskönig · 17× Spieler des Tages. Mehr als alle anderen"
  // stand im Feed, während der Rekord auf denselben Anteil Julian gehörte:
  // Leon hatte 17 von 54 eigenen Spieltagen gewonnen (31 %), Julian 12 von 23
  // (52 %). Die Karte kürte damit den, der am meisten dabei war, und
  // widersprach dem Rekorde-Reiter derselben App.
  // Gerechnet wird deshalb nicht neu: `chronicleRang` ist die Reihenfolge,
  // die auch das Rekord-Blatt zeigt [§C27]. Zwei Rechnungen über dieselbe
  // Frage nennen irgendwann zwei verschiedene Beste.
  const _rekRang = (cid) => {
    if(typeof chronicleRang !== 'function') return [];
    try { return chronicleRang(cid) || []; } catch(e){ return []; }
  };
  // Alle, die den Bestwert punktgleich halten. Bei Gleichstand darf kein
  // Einzelner als Halter ausgerufen werden.
  const _rekSpitze = (r) => r.filter(x => x.wert === r[0].wert);
  // Wer wie viele Einträge der laufenden Tafel hält, die drei vorn.
  const _tafelTraeger = (aw) => {
    const n = {};
    (aw || []).forEach(a => { if(pm[a.pid]) n[a.pid] = (n[a.pid] || 0) + 1; });
    return Object.keys(n).sort((x, y) => n[y] - n[x] || (x < y ? -1 : 1)).slice(0, 3).map(pid => [pid, n[pid]]);
  };

  // ── Bestmarken gegen das Eigene [§C38] ──
  //    Der Fun Fact nennt den Halter eines Liga-Rekords, der gegen die
  //    eigene Quote misst: den besten Spieltag. Die Partie nach dem
  //    Positionswechsel und die letzten 25 Partien sind als Rekorde
  //    gestrichen und ihre Karten mit ihnen [§C35]. Hier standen vorher die
  //    Anteile gewonnener Spieltage und Wochen und die Tore je Partie rechts —
  //    alle drei zählten die Siegquote noch einmal und zeigten fast immer
  //    dieselben zwei Spieler. Diese drei gehören nicht automatisch dem, der
  //    am meisten gewinnt.
  //    Der Satz kommt aus den Feldern des Halters und nicht aus dem Beleg:
  //    der Beleg ist eine Aufzählung für die Tafel, im Feed steht ein Satz.
  //    Die Vergleichsquote im Satz folgt aus der eigenen Quote und dem
  //    großen Wert daneben (`_ppGegen`), sonst ergab die Rechnung auf der
  //    Karte einen Punkt mehr oder weniger als die Zahl über ihr.
  const _bestmarke = (key, cid, titel, satz) => T.push({ key, weight:2, make: () => {
    const def = CHRONICLE_BY_ID[cid], rank = _rekRang(cid);
    if(!def || !rank.length) return null;
    const lead = _rekSpitze(rank), top = rank[0], nxt = rank[lead.length];
    const p = (_chronicleCtx().P || {})[top.pid];
    if(!p) return null;
    const pkt = x => '+' + Math.round(x.wert * 100);
    const bild = _bRennen(rank.map(x => ({p:x.pid, v:x.wert, t:pkt(x)})));
    if(lead.length > 1) return { cat:'personal', ic:def.ic, prio:4,
      title:`Gleichstand beim ${def.name.replace(/^Der /, '')}`,
      desc:`${_namesOf(lead)} liegen gleichauf, je ${pkt(top)} Prozentpunkte über der eigenen Quote.`,
      vv:pkt(top), vl:'%-Punkte',
      dataRef:{ ambientPids: lead.slice(0, 2).map(x => x.pid), pairKind:'duel', bild } };
    return { cat:'personal', ic:def.ic, prio:4,
      title:titel(nameOf(top.pid)),
      desc:`${satz(p, nameOf(top.pid), top.wert)}. Bestwert der Liga`
        + (nxt ? `, ${nameOf(nxt.pid)} folgt mit ${pkt(nxt)} Prozentpunkten.` : '.'),
      vv:pkt(top), vl:'%-Punkte',
      dataRef:{ ambientPid: top.pid, bild } };
  }});
  _bestmarke('personal_glanztag', 'glanztag', n => `Der Glanztag gehört ${n}`,
    (p, n, v) => `Am ${p.gtLabel} gewann ${n} ${p.gtW} von ${p.gtN} Sätzen, sonst sind es ${_ppGegen(p.gtW / p.gtN, v)} %`);

  // ── Das Kaltblut: wem der letzte Ball gehört ──
  //    Der Rekord misst den Anteil der 10:9 an den eigenen Partien mit 10:9
  //    oder 9:10, nicht den Abstand zur eigenen Quote; deshalb eine eigene
  //    Karte und nicht `_bestmarke`, deren Satz eine zweite Quote verlangt.
  //    Sie steht an der Stelle der beiden gestrichenen Bestmarken-Karten:
  //    ohne sie wiederholte die Rotation über vierzig Tage drei Fakten über
  //    dieselbe Person statt zwei (`tests/ambient`). Gerechnet wird über
  //    `chronicleRang` wie im Rekord-Blatt [§C27], damit die Karte nur den
  //    Halter nennt, den auch der Rekorde-Reiter nennt.
  T.push({ key:'personal_kaltblut', weight:2, make: () => {
    const def = CHRONICLE_BY_ID.kaltblut, rank = _rekRang('kaltblut');
    if(!def || !rank.length) return null;
    const lead = _rekSpitze(rank), top = rank[0], nxt = rank[lead.length];
    const P = _chronicleCtx().P || {}, p = P[top.pid], q = nxt && P[nxt.pid];
    if(!p) return null;
    const pc = x => Math.round(x.wert * 100);
    const bild = _bRennen(rank.map(x => ({p:x.pid, v:x.wert, t:pc(x) + ' %'})));
    if(lead.length > 1) return { cat:'personal', ic:def.ic, prio:4,
      title:'Gleichstand beim Kaltblut',
      desc:`${_namesOf(lead)} gewinnen je ${pc(top)} % der Sätze, die im Tiebreak entschieden wurden.`,
      vv:pc(top) + ' %', vl:'der Zitterpartien',
      dataRef:{ ambientPids: lead.slice(0, 2).map(x => x.pid), pairKind:'duel', bild } };
    return { cat:'personal', ic:def.ic, prio:4,
      title:`Das Kaltblut gehört ${nameOf(top.pid)}`,
      desc:`${nameOf(top.pid)} gewann ${p.nail} von ${p.nail + p.bitter} Sätzen, die im Tiebreak entschieden wurden, das sind ${pc(top)} %. Bestwert der Liga`
        // Der Verfolger mit seinen Partien und nicht mit dem Anteil: 27 von
        // 49 und 23 von 42 runden beide auf 55 %, und „folgt mit 55 %" stand
        // gleichauf neben dem Bestwert.
        + (q ? `, ${nameOf(nxt.pid)} folgt mit ${q.nail} von ${q.nail + q.bitter}.` : '.'),
      vv:pc(top) + ' %', vl:'der Zitterpartien',
      dataRef:{ ambientPid: top.pid, bild } };
  }});

  // ── Der alte Zähler-Weg, nur noch für die Auszeichnungs-Vitrine ──
  T.push({ key:'award_potd_zahl', weight:1, make: () => {
    if(typeof countDayWins !== 'function') return null;
    const rank = _awardRank(activePids, pid => countDayWins(pid, matches));
    if(!rank.length) return null;
    const lead = _awardLeaders(rank), top = rank[0], nxt = rank[lead.length];
    if(lead.length > 1){
      return { cat:'badge', ic:'trophyDay', prio:4,
        title:`Kopf-an-Kopf um die Tagessiege`,
        desc:`${_namesOf(lead)} stehen gleichauf bei je ${top.v}× Spieler des Tages.`,
        vv: top.v + '×', vl:'Tagessiege',
        dataRef:{ ambientPids: lead.slice(0,2).map(x=>x.pid), pairKind:'duel', bild:_bRennen(rank.map(x => ({p:x.pid, v:x.v, n:x.v, t:x.v + '×'})), false, 'sammlung') } };
    }
    // Hier steht bewusst KEIN „Bestwert der Liga": die Anzahl ist eine
    // Sammlung und keine Bestmarke, sie wächst mit jedem Spieltag.
    return { cat:'badge', ic:'trophyDay', prio:4,
      title:`${nameOf(top.pid)} sammelt Tagessiege`,
      desc: nxt
        ? `${top.v}× Spieler des Tages, so oft wie sonst niemand. ${nameOf(nxt.pid)} kommt auf ${nxt.v}.`
        : `${top.v}× Spieler des Tages. Bislang der Einzige mit diesem Titel.`,
      vv: top.v + '×', vl:'Tagessiege',
      dataRef:{ ambientPid: top.pid, bild:_bRennen(rank.map(x => ({p:x.pid, v:x.v, n:x.v, t:x.v + '×'})), false, 'sammlung') } };
  }});

  // ── Der Zähler daneben: eine Sammlung, keine Bestmarke ──
  T.push({ key:'award_potw_zahl', weight:1, make: () => {
    if(typeof countPeriodWins !== 'function') return null;
    const rank = _awardRank(activePids, pid => countPeriodWins(pid, matches, 'week'));
    if(!rank.length) return null;
    const lead = _awardLeaders(rank), top = rank[0], nxt = rank[lead.length];
    if(lead.length > 1){
      return { cat:'badge', ic:'weekKing', prio:4,
        title:`Kopf-an-Kopf um die Wochensiege`,
        desc:`${_namesOf(lead)} stehen gleichauf bei je ${top.v}× Spieler der Woche.`,
        vv: top.v + '×', vl:'Wochensiege',
        dataRef:{ ambientPids: lead.slice(0,2).map(x=>x.pid), pairKind:'duel', bild:_bRennen(rank.map(x => ({p:x.pid, v:x.v, n:x.v, t:x.v + '×'})), false, 'sammlung') } };
    }
    return { cat:'badge', ic:'weekKing', prio:4,
      title:`${nameOf(top.pid)} sammelt Wochensiege`,
      desc: nxt
        ? `${top.v}× Spieler der Woche, so oft wie sonst niemand. ${nameOf(nxt.pid)} kommt auf ${nxt.v}.`
        : `${top.v}× Spieler der Woche. Bisher hat das sonst niemand geschafft.`,
      vv: top.v + '×', vl:'Wochensiege',
      dataRef:{ ambientPid: top.pid, bild:_bRennen(rank.map(x => ({p:x.pid, v:x.v, n:x.v, t:x.v + '×'})), false, 'sammlung') } };
  }});

  // ── Award: meiste goldene Auszeichnungen ──
  // Gezählt wird jedes Mal, das eine goldene Auszeichnung geholt wurde, nicht
  // die verschiedenen. Der Katalog hat nur wenige goldene; wer sie alle hat,
  // stand mit allen anderen gleichauf, und die Karte sagte nichts mehr.
  T.push({ key:'award_gold_leader', weight:2, make: () => {
    if(typeof getCachedBadges !== 'function' || typeof rarityOf !== 'function') return null;
    const gold = pid => getCachedBadges(pid).filter(b => rarityOf(b.id) === 'legendary');
    const summe = l => l.reduce((n, b) => n + (Number(b.count) || 1), 0);
    const rank = _awardRank(activePids, pid => summe(gold(pid)));
    if(!rank.length) return null;
    const lead = _awardLeaders(rank), top = rank[0];
    const wort = n => n === 1 ? 'goldene Auszeichnung' : 'goldene Auszeichnungen';
    if(lead.length > 1){
      return { cat:'badge', ic:'trophyStar', prio:6,
        title:`Gleichstand in Gold`,
        desc:`${_namesOf(lead)} holten je ${top.v} ${wort(top.v)}.`,
        vv: top.v, vl:'Gold',
        dataRef:{ ambientPids: lead.slice(0,2).map(x=>x.pid), pairKind:'duel', bild:_bRennen(rank.map(x => ({p:x.pid, v:x.v, n:x.v, t:String(x.v)})), false, 'sammlung') } };
    }
    const meine = gold(top.pid).slice().sort((a, b) => (b.count || 1) - (a.count || 1));
    const liste = meine.slice(0, 3).map(b => (b.count > 1 ? `${b.count}× ` : '') + `„${b.name}“`);
    return { cat:'badge', ic:'trophyStar', prio:6,
      title:`${nameOf(top.pid)} holt am häufigsten Gold`,
      desc:`${top.v} ${wort(top.v)}, darunter ${liste.join(', ')}.`,
      vv: top.v, vl:'Gold',
      dataRef:{ ambientPid: top.pid, bild:{f:'vitrine', p:top.pid, gold:true, hat:meine.map(b => b.id),
        n:Object.fromEntries(meine.map(b => [b.id, b.count || 1])), gesamt:top.v} } };
  }});

  // ── Award: die zuletzt vergebene goldene Auszeichnung ──
  T.push({ key:'award_latest_gold', weight:2, make: () => {
    if(typeof getBadgeEarnedCache !== 'function' || typeof rarityOf !== 'function') return null;
    const bMap = getBadgeEarnedCache();
    // Match-Index einmal aufbauen statt pro Badge-Event über alle Matches zu
    // suchen (O(Badges × Matches) → O(Matches + Badges)).
    const byId = new Map();
    for(const mm of matches) byId.set(mm.id, mm);
    let latest = null;
    for(const mid in bMap){
      const mObj = byId.get(mid);
      if(!mObj) continue;
      const t = mts(mObj);
      for(const ev of (bMap[mid] || [])){
        if(rarityOf(ev.badge.id) !== 'legendary') continue;
        if(!aktiv(ev.playerId)) continue;
        // ── Ein Fun Fact weiss nichts von einer spaeteren Partie ──
        // `now` ist die Uhrzeit des Slots, `matches` aber die ganze Liste.
        // Die Karte von 10 Uhr sah damit eine Auszeichnung aus einer Partie
        // um 11:39 und rechnete „vor -1 Tagen".
        if(t > now.getTime()) continue;
        if(!latest || t > latest.t) latest = { t, pid: ev.playerId, badge: ev.badge, mid };
      }
    }
    if(!latest) return null;
    const days = Math.floor((now.getTime() - latest.t) / 86400000);
    // Ab dem zweiten Tag in der Einheit, die man sagen würde (`_spSeit`):
    // eine Liga, in der Gold selten geworden ist, schrieb sonst „vor 400
    // Tagen" und darüber „400 Tage her".
    const her = days < 2 ? null : days < 14 ? {n:days, e:'Tagen', nom:'Tage'} : _spSeit(now.getTime() - latest.t);
    return { cat:'badge', ic: latest.badge.ic || 'trophyStar', prio:5,
      title:`${nameOf(latest.pid)} holte zuletzt Gold`,
      desc:`Die Auszeichnung „${latest.badge.name}“ ${days === 0 ? 'heute' : days === 1 ? 'gestern' : 'vor ' + her.n + ' ' + her.e}. ${latest.badge.desc}.`,
      // Ohne Wert blieb der grosse Block der Karte leer [§6].
      vv:String(days === 0 ? 'heute' : days === 1 ? 'gestern' : her.n),
      vl:her ? her.nom + ' her' : 'geholt',
      dataRef:{ ambientPid: latest.pid, bild:{f:'medaille', p:latest.pid, b:latest.badge.id,
        n:activePids.filter(p2 => getCachedBadges(p2).some(b => b.id === latest.badge.id)).length} } };
  }});

  // ── Award: die meisten Auszeichnungen insgesamt ──
  // Gezählt wird jedes Mal, nicht die verschiedenen. „Leon hat die volle
  // Vitrine, 41 verschiedene" hört auf zu stimmen, sobald alle alles haben:
  // der Katalog ist endlich, und nach einigen Jahren stünde jeder bei 50 von
  // 50 und die Karte fiele für immer weg. Die Summe aller Male wächst mit
  // jeder Partie weiter und trennt auch dann noch.
  T.push({ key:'award_total_leader', make: () => {
    if(typeof getCachedBadges !== 'function') return null;
    const summe = pid => getCachedBadges(pid).reduce((n, b) => n + (Number(b.count) || 1), 0);
    const rank = _awardRank(activePids, summe);
    if(rank.length < 2) return null;
    const lead = _awardLeaders(rank), top = rank[0], nxt = rank[lead.length];
    if(lead.length > 1 || !nxt) return null;
    const meine = getCachedBadges(top.pid);
    return { cat:'badge', ic:'medalTrio', prio:4,
      title:`${nameOf(top.pid)} hat die meisten Auszeichnungen`,
      desc:`${top.v} Auszeichnungen, ${meine.length} verschiedene. ${nameOf(nxt.pid)} kommt auf ${nxt.v}.`,
      vv: top.v, vl:'Auszeichnungen',
      dataRef:{ ambientPid: top.pid, bild:{f:'vitrine', p:top.pid, hat:meine.map(b => b.id),
        n:Object.fromEntries(meine.map(b => [b.id, b.count || 1])), gesamt:top.v, zweiter:nxt.v} } };
  }});

  // ══ Persönliche Nuggets (v9.17) ═══════════════════════════════════════
  // Weniger Liga-Superlative, mehr Geschichten über EINEN Kopf — das ist es,
  // was einen Fun Fact persönlich macht. Alle Werte stammen aus allPlayerStats
  // bzw. der H2H-Map, beide bereits gecached.

  // ── Persönlich: Lieblingsgegner (höchste Siegquote im direkten Duell) ──
  T.push({ key:'personal_favourite_opp', weight:2, make: (rng) => {
    const map = _ensureH2HMap();
    if(!map || !map.size) return null;
    const cands = [];
    for(const [k, e] of map){
      const [pa, pb] = k.split('|');
      if(!aktiv(pa) || !aktiv(pb)) continue;
      const wa = e.wins[pa]||0, wb = e.wins[pb]||0, total = wa + wb;
      if(total < 6) continue;
      if(wa >= wb && wa / total >= 0.7) cands.push({ pid: pa, opp: pb, w: wa, l: wb, total });
      if(wb >  wa && wb / total >= 0.7) cands.push({ pid: pb, opp: pa, w: wb, l: wa, total });
    }
    if(!cands.length) return null;
    const c = cands[Math.floor(rng()*cands.length)];
    return { cat:'rivalry', ic:'devilMask', prio:4,
      title:`${nameOf(c.opp)} ist ${nameOf(c.pid)}s Lieblingsgegner`,
      desc:`${c.w}:${c.l} aus ${c.total} direkten Duellen. Diese Paarung geht fast immer gleich aus.`,
      vv: c.w + ':' + c.l, vl:'Duelle',
      dataRef:{ ambientPids:[c.pid, c.opp], pairKind:'duel', bild:{f:'duell', a:c.pid, b:c.opp, wa:c.w, wb:c.l} } };
  }});

  // ── Persönlich: Lieblings-Mate (bestes gemeinsames Team) ──
  T.push({ key:'personal_best_mate', weight:2, make: (rng) => {
    const cands = [];
    for(const pid of withStats){
      const mates = stats[pid].mates || {};
      for(const mid in mates){
        const g = mates[mid].g, w = mates[mid].w;
        if(g < 6 || !aktiv(mid)) continue;
        if(w / g < 0.65) continue;
        // Nur einmal pro Paar (kleinere pid führt), sonst doppelte Kandidaten.
        if(pid > mid) continue;
        cands.push({ pid, mate: mid, g, w, wr: w/g });
      }
    }
    if(!cands.length) return null;
    const c = cands[Math.floor(rng()*cands.length)];
    return { cat:'team', ic:'duo', prio:4,
      title:`Beste Freunde: ${nameOf(c.pid)} und ${nameOf(c.mate)}`,
      desc:`Zusammen ${c.w} von ${c.g} Sätzen gewonnen, ${Math.round(c.wr*100)} %.`,
      vv: Math.round(c.wr*100) + '\u00A0%', vl:'als Duo',
      dataRef:{ ambientPids:[c.pid, c.mate], pairKind:'team', bild:{f:'duo', a:c.pid, b:c.mate, w:c.w, g:c.g} } };
  }});

  // ── Persönlich: Lieblingsseite (Drive vs. Revés) ──
  T.push({ key:'personal_position', weight:2, make: (rng) => {
    const elig = withStats.filter(pid => stats[pid].drvG >= 5 && stats[pid].revG >= 5);
    if(!elig.length) return null;
    const pid = elig[Math.floor(rng()*elig.length)];
    const st = stats[pid];
    const drvWr = st.drvW / st.drvG, revWr = st.revW / st.revG;
    const diff = Math.abs(drvWr - revWr);
    if(diff < 0.1) {
      return { cat:'personal', ic:'refresh', prio:3,
        title:`${nameOf(pid)} spielt auf beiden Seiten`,
        desc:`Rechts ${Math.round(drvWr*100)} %, links ${Math.round(revWr*100)} %. Die Seite spielt keine Rolle.`,
        // Ohne Wert blieb der grosse Block der Karte leer. Die Aussage ist
        // die Quote, die in BEIDEN Rollen gilt — nicht der Abstand, der
        // hier gerade null sein soll.
        vv: Math.round((st.drvW + st.revW) / (st.drvG + st.revG) * 100) + '\u00A0%',
        vl:'auf beiden Seiten',
        dataRef:{ ambientPid: pid, bild:{f:'rolle', p:pid, s:Math.round(drvWr*100), a:Math.round(revWr*100), gs:st.drvG, ga:st.revG} } };
    }
    const strong = drvWr > revWr;
    return { cat:'personal', ic: strong ? 'posDrive' : 'posReves', prio:4,
      title:`${nameOf(pid)} gehört ${strong ? 'nach rechts' : 'nach links'}`,
      desc: strong
        ? `Rechts (Drive) ${Math.round(drvWr*100)} % Siege (${st.drvG} Sätze), links nur ${Math.round(revWr*100)} %.`
        : `Links (Revés) ${Math.round(revWr*100)} % Siege (${st.revG} Sätze), rechts nur ${Math.round(drvWr*100)} %.`,
      vv: Math.round((strong ? drvWr : revWr)*100) + '\u00A0%', vl: strong ? 'rechts' : 'links',
      dataRef:{ ambientPid: pid, bild:{f:'rolle', p:pid, s:Math.round(drvWr*100), a:Math.round(revWr*100), gs:st.drvG, ga:st.revG} } };
  }});

  // ── Fun Fact: häufigstes Endergebnis der Liga ──
  // ── Saison-Titel: das Rennen um die laufende Tafel (§13, v9.18) ──────
  // Die Tafel wird erst am Monatsende vergeben. Damit der Monat trotzdem
  // Spannung hat, greift dieser Fun Fact den aktuellen Stand auf — als
  // normale Karte, NICHT als Breaking News. Der Saisonabschluss selbst
  // bleibt die einzige Breaking-Meldung des Titel-Systems.
  T.push({ key:'season_title_race', weight:2, make: () => {
    if(typeof seasonTitles !== 'function') return null;
    let T2 = null;
    try { T2 = seasonTitles(currentSeason().id); } catch(e){ return null; }
    if(!T2 || !T2.awarded.length) return null;
    const cur = T2.awarded.filter(a => pm[a.pid]);
    if(!cur.length) return null;
    // Bewusst deterministisch (kein Zufall), damit die memoisierte Story bei
    // gleichem Datenstand stabil bleibt. Den Tabellenführer muss hier niemand
    // mehr aussortieren: Platz 1 ist seit v9.18 kein Chronik-Eintrag mehr,
    // die Spitze bespielt die Saison-Endspurt-Story.
    const a = cur[0];
    const held = T2.awarded.length, open = SEASON_TITLES.length - held;
    return { cat:'season', ic:a.ic, prio:5,
      title:`${nameOf(a.pid)} führt bei „${a.name}“`,
      // „Das ist der Stand von heute" sagte nichts: jede Karte im Feed
      // traegt ihr Datum. Und der grosse Wert zaehlte die Eintraege des
      // Katalogs, waehrend die Schlagzeile von EINER Fuehrung erzaehlte —
      // zwei Aussagen auf einer Karte, und die Zahl gehoerte der falschen.
      desc:`${_evSatz(a.ev, true)}. ${held} von ${SEASON_TITLES.length} `
        + `Chronik-Einträgen stehen schon.`,
      // Hier stand die erste Zahl des Belegs unter der Aufschrift „in
      // Führung". Beides war falsch: „in Führung" beschreibt den Spieler und
      // nicht die Zahl, und die erste Zahl eines MONATSBELEGS ist nicht der
      // Sortierwert. „Der makellose Tag" misst einen Anteil und belegt ihn
      // mit „1 von 4 Spieltagen ohne Niederlage" — im Block stand damit die
      // 1, also die Anzahl. Nur beim Liga-Rekord garantiert §C35, dass der
      // Beleg mit dem Sortierwert beginnt; die Monatswertung traegt ihren
      // Zahlenwert gar nicht mit.
      //
      // Die Karte heisst „das Rennen um die laufende Tafel", also traegt der
      // Block die Zahl des Rennens. Der Satz nennt dafuer nur noch die
      // vergebenen — zweimal dieselbe Zahl waere eine zu viel [§C27].
      vv:String(open), vl:'noch offen',
      dataRef:{ ambientPid:a.pid, seasonTable:T2.sid, bild:{f:'tafel', voll:held, alle:SEASON_TITLES.length,
        traeger:_tafelTraeger(T2.awarded)} } };
  }});

  // ── Chronik: ein Liga-Rekord im Rampenlicht (§13.4b) ────────────────
  // Chroniken ändern sich selten — deshalb genau eine ruhige Karte, keine
  // Breaking News. Der Eintrag rotiert über den Tag im Slot, damit über die
  // Wochen alle Rekorde einmal drankommen.
  T.push({ key:'chronicle_spotlight', weight:2, make: () => {
    if(typeof chronicleHolders !== 'function') return null;
    let by = null;
    try { by = chronicleHolders(); } catch(e){ return null; }
    // Keine Schattenseite: der Feed meldet sie nicht [§C35]. Der Topf lief
    // ueber ALLE 56 vergebenen Rekorde, zwoelf davon negativ, und die
    // Rotation haengt am Kalendertag — an jedem fuenften Tag stand damit
    // „Alex haelt ‚Das Scheunentor'" als Fun Fact im Feed.
    const recs = CHRONICLES.filter(d => by[d.id] && pm[by[d.id].pid] && !d.neg);
    if(!recs.length) return null;
    // Deterministisch aus dem Tag gewählt: gleicher Tag → gleiche Karte.
    const day = Math.floor(now.getTime() / 86400000);
    const d = recs[day % recs.length];
    const h = by[d.id];
    return { cat:'fun', ic:d.ic, prio:4,
      title:`${h.shared ? _chronHalterSatz(h) + ' halten' : nameOf(h.pid) + ' hält'} „${d.name}“`,
      // Die Bedingung stand hier im Klartext und machte aus zwei Zeilen
      // fünf. Sie gehört ins Detail, nicht auf die Karte — die Karte sagt,
      // WAS jemand hält, das Detail sagt, wofür.
      // Der Beleg endet mit einem Punkt, und danach stand ein Kleinbuchstabe:
      // „… gewonnen · 9. sonst hält ihn niemand." Der zweite Satz faengt jetzt
      // an, wo ein Satz anfaengt, und der Beleg traegt keinen Listentrenner
      // mehr mitten im Fliesstext.
      desc:`${_evSatz(h.ev, true)}. ${h.shared ? 'Diesen Bestwert halten mehrere punktgleich.' : 'Sonst hält diesen Bestwert niemand.'}`,
      // Der grosse Wert war die Zeichenkette „1" mit der Aufschrift
      // „Rekordhalter" — eine Konstante und eine Aussage ueber den TRAeGER
      // statt ueber die Zahl. „1 Rekordhalter" gilt fuer jeden Rekord und
      // sagt damit nichts; gemessen trug die Vorlage 25 verschiedene Titel
      // und immer denselben Wert.
      //
      // Die Zahl ist der Wert der Bestmarke, und wie sie heisst, sagt die
      // Kammer des Katalogs [§C33] — dieselbe Quelle, aus der `_newsWertBlock`
      // die Aufschrift einer Rekordkarte nimmt [§C27]. Beim Rekord beginnt
      // der Beleg garantiert mit dem Sortierwert [§C35], also trifft
      // `_chronKurz` hier das Richtige.
      vv:_chronKurz(h.ev),
      vl:((CHRON_KINDS[d.kind] || {}).label || 'Bestwert'),
      dataRef:{ ambientPid:h.pid, chronicle:d.id,
        bild:_bRennen(_rekRang(d.id).map(x => ({p:x.pid, v:x.wert, t:_chronKurz(x.ev) || komma(x.wert)})), false, 'podest') } };
  }});


  // ── Prestige & Insignium (§13.8/§13.9) ──────────────────────────────
  // Fünf Karten, die das neue System sichtbar machen. Der gemischte
  // 15-Uhr-Slot rotiert zwischen Stand und Geschichte. `dataRef.prestige` sagt der Karte, dass
  // sie das Insignium des Spielers als Bild zeigen soll [§11.6b].

  T.push({ key:'prestige_fuehrung', weight:2, make: () => {
    if(typeof prestigeTabelle !== 'function') return null;
    let P = null; try { P = prestigeTabelle(); } catch(e){ return null; }
    const rang = P.rang.filter(id => pm[id]);
    if(rang.length < 2) return null;
    const a = P.byPid[rang[0]], b = P.byPid[rang[1]];
    if(!a || !b || a.punkte <= 0) return null;
    const e = prestigeOf(rang[0]);
    return { cat:'highlight', ic:'trophyStar', prio:5,
      title:`${nameOf(rang[0])} führt das Prestige an`,
      desc:`${a.punkte} Punkte, ${a.punkte - b.punkte} mehr als ${nameOf(rang[1])}. `
        + `Am Wappen trägt ${nameOf(rang[0])} damit den ${e.insignie.name}`
        + (e.naechste ? `, bis zum ${e.naechste.name} fehlen ${e.fehlt}.` : `, die letzte Stufe.`),
      vv:String(a.punkte), vl:'Prestige',
      dataRef:{ ambientPid:rang[0], prestige:true,
        bild:Object.assign(_bRennen(rang.map(id => ({p:id, v:P.byPid[id].punkte, t:String(P.byPid[id].punkte)})), false, 'podest') || {}, {ins:true}) } };
  }});

  T.push({ key:'prestige_schwelle', weight:2, make: () => {
    if(typeof prestigeTabelle !== 'function') return null;
    let P = null; try { P = prestigeTabelle(); } catch(e){ return null; }
    // Wer ist der nächsten Stufe am nächsten? Wer schon auf der letzten
    // steht, zählt hier nicht: für ihn gibt es keine nächste Stufe.
    let best = null;
    Object.keys(P.byPid).forEach(pid => {
      if(!pm[pid]) return;
      const e = prestigeOf(pid);
      if(!e.naechste || e.punkte <= 0) return;
      if(!best || e.fehlt < best.fehlt) best = e;
    });
    if(!best) return null;
    const spanne = best.naechste.min - best.insignie.min;
    return { cat:'season', ic:'peak', prio:5,
      title:`${nameOf(best.pid)} steht kurz vor dem ${best.naechste.name}`,
      desc:`Noch ${best.fehlt} Prestige, `
        + `${Math.round((1 - best.fehlt / spanne) * 100)} % der Stufe sind geschafft. `
        + `Dann ändert der Reif um das Wappen seine Form.`,
      vv:String(best.fehlt), vl:'fehlen',
      dataRef:{ ambientPid:best.pid, prestige:true, bild:{f:'stufe', p:best.pid, punkte:best.punkte,
        von:best.insignie.key, vonMin:best.insignie.min, nach:best.naechste.key, nachMin:best.naechste.min} } };
  }});

  T.push({ key:'prestige_schritt', weight:2, make: (rng) => {
    if(typeof prestigeSchritte !== 'function') return null;
    const kandidaten = activePids.filter(pid => {
      try { return prestigeSchritte(pid, 1).length > 0; } catch(e){ return false; }
    });
    if(!kandidaten.length) return null;
    const pid = kandidaten[Math.floor(rng() * kandidaten.length)] || kandidaten[0];
    const s = prestigeSchritte(pid, 1)[0];
    if(!s) return null;
    // „X liegt ‚Das Sonntagskind' am naechsten" sagte nicht, worum es geht,
    // und der Text darunter nannte nur den Halter: was jemand tun muss, um
    // den Rekord zu holen, stand nirgends. Die Karte sagt jetzt die Aufgabe
    // (die Bedingung aus dem Katalog), den Stand des Halters und den Gewinn.
    // „Holt er ihn" stand ausserdem einmal direkt hinter dem Namen des
    // HALTERS und zeigte damit auf den Falschen.
    const _bed = s.cond || '';
    // ── Die Karte nennt den eigenen Stand ───────────────────────────
    // Sie sagte die Schwelle und den Bestwert des Halters, aber nicht, wo
    // der Spieler selbst steht: „Martin & Julian haelt den Bestwert mit
    // 84 %" ist ohne die eigenen 71 % keine Auskunft darueber, wie weit es
    // noch ist. Mehrere Halter bekommen dazu ihr Verb — und „&" gehoert in
    // eine Tabellenzelle, nicht in einen Satz [§C33].
    const _mehr = (s.halterN || 0) > 1;
    const _halter = String(s.halter || '');
    const _stand = _halter && s.stand
      ? `${_halter} ${_mehr ? 'halten' : 'hält'} den Bestwert mit ${s.stand}`
      : String(s.txt || '');
    // „Kein anderer ist gerade so nah dran" behauptete einen Vergleich, den
    // die Karte nie angestellt hat: der Spieler wird unter allen gezogen,
    // die ueberhaupt einen offenen Schritt haben, nicht als der naechste.
    // Eine Monatschronik bringt den Grundwert und dazu, wie weit die
    // Schwelle am Ende ueberboten ist [§C39] — der Gewinn ist hier also
    // eine Untergrenze und steht als solche da.
    return { cat:'personal', ic:s.ic, prio:5,
      title:`${nameOf(pid)} kann „${s.name}“ holen`,
      desc: (_bed ? `Dafür zählt: ${_bed}. ` : '')
        + (_stand ? _stand + '. ' : '')
        + (s.mein ? `${nameOf(pid)} steht bei ${s.mein}. ` : '')
        + `Gelingt es, bringt das ${s.art === 'monat' ? 'mindestens ' : ''}${s.gewinn} Prestige.`,
      // Der grosse Wert war die Aussicht auf Prestige — eine Zahl, die
      // niemand geholt hat, im Goldrahmen einer gehaltenen Bestmarke
      // [§C25]. Er zeigt jetzt den eigenen Stand: das ist die Zahl, mit
      // der man etwas anfangen kann. Fehlt er, steht der zu schlagende
      // Wert dort — auch das ist eine Tatsache und keine Aussicht.
      vv: s.mein || s.stand || ('+' + s.gewinn),
      vl: s.mein ? 'aktuell' : (s.stand ? 'zu schlagen' : 'Prestige'),
      dataRef:{ ambientPid:pid, prestige:true, bild:{f:'ziel', p:pid, ic:s.ic || 'trophy', mein:s.mein || '',
        stand:s.stand || '', gewinn:s.gewinn,
        nah:+Math.max(0, Math.min(1, 1 - (s.rel || 0))).toFixed(3),
        halter:(((allChronicles() || {}).byId || {})[s.id] || {pids:[]}).pids.filter(id => pm[id]).slice(0, 3)} } };
  }});

  // ── Die Leiter der Liga [§C30] ────────────────────────────────────
  //     Die Leiter hat einundzwanzig Zeichen, und die meisten hat nie
  //     jemand gesehen: wer im Zierkranz steht, erfährt vom Kronenreif nur,
  //     wenn er in der Laufbahn zufällig so weit schiebt. Diese Karte zeigt
  //     sie der ganzen Liga — die sieben Stufen mit der Zahl ihrer Träger,
  //     und im Blatt jedes Feld mit den Gesichtern, die es tragen.
  //     Der Stand wird MIT der Karte gespeichert (`leiter`): ein Fun Fact ist
  //     eine Ziehung und erzählt vom Tag, an dem er stand [§C33].
  T.push({ key:'insignium_stand', make: () => {
    if(typeof prestigeTabelle !== 'function' || typeof INSIGNIEN === 'undefined') return null;
    let P = null; try { P = prestigeTabelle(); } catch(e){ return null; }
    const zahl = INSIGNIEN.map(() => 0), felder = [];
    let n = 0, spitze = null;
    Object.keys(P.byPid).forEach(pid => {
      if(!pm[pid]) return;
      const S = prestigeOf(pid);
      zahl[S.stufe]++; n++;
      felder.push([pid, S.stufe, _insBildNr(S.insignie.key, S.grad)]);
      if(!spitze || S.punkte > spitze.punkte) spitze = S;
    });
    if(!n || !spitze) return null;
    const leer = zahl.filter(v => v === 0).length;
    const wort = x => ['keine', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs'][x] || String(x);
    const letzte = INSIGNIEN[INSIGNIEN.length - 1];
    return { cat:'history', ic:'medalTrio', prio:4,
      // Die Schlagzeile nennt, was noch niemand gesehen hat: das ist der
      // Grund, die Karte zu öffnen. „Die Liga trägt drei verschiedene
      // Insignien" zählte, was jeder in der Rangliste ohnehin sieht.
      title: leer === 0 ? 'Jede Stufe der Leiter ist vergeben'
        : leer === 1 ? 'Eine Stufe der Leiter trägt noch niemand'
        : `${wort(leer).replace(/^./, c => c.toUpperCase())} Stufen der Leiter trägt noch niemand`,
      desc: `Die Spitze trägt den ${spitze.insignie.name}`
        + (spitze.naechste
            ? `, bis zum ${spitze.naechste.name} fehlen ${spitze.fehlt} Prestige.`
              + (spitze.insignie.key !== letzte.key && spitze.naechste.key !== letzte.key
                  ? ` Der ${letzte.name} beginnt bei ${letzte.min}.` : '')
            : ` ${INSIGNIUM_GRAD_NAME[spitze.grad] || 'I'}.`),
      // „12 gewertet" sagte nicht, WAS gewertet ist. Die Zahl zaehlt Spieler.
      vv:String(n), vl:'Spieler',
      dataRef:{ ambientPids:[], leiter:{je:zahl, felder} } };
  }});

  T.push({ key:'titelband_stand', make: () => {
    if(typeof meisterTitel !== 'function') return null;
    const mit = activePids.map(pid => ({pid, n:meisterTitel(pid)}))
      .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    if(!mit.length) return null;
    const top = mit[0];
    const gesamt = mit.reduce((a, x) => a + x.n, 0);
    return { cat:'history', ic:'crown', prio:4,
      // Die Karte sprach von der Schwinge, vom Titelband als leerem Umriss
      // und von einer Krone ab fünf Titeln — drei Zeichen, die es seit der
      // Aura nicht mehr gibt [§C36], und „Die hat er" setzte ein Pronomen
      // unter ein Wappen [§6].
      title:`${nameOf(top.pid)} trägt die hellste Aura`,
      desc:`${top.n} Meistertitel von ${gesamt}, die die Liga bisher vergeben hat. `
        + (mit.length === 1
            ? `Sonst hat noch niemand einen Monat gewonnen.`
            : `${mit.length} Spieler haben überhaupt schon einen geholt.`),
      vv:String(top.n), vl:'Titel',
      dataRef:{ ambientPid:top.pid, prestige:true,
        bild:_bRennen(mit.map(x => ({p:x.pid, v:x.n, n:x.n, t:x.n + ' Titel'})), false, 'sterne') } };
  }});


  // ── §11.1c Rückblicke mit festem Termin ─────────────────────────────
  // Woche und Monat hat der Generator schon: der gestaffelte Montags-Block
  // [§11.1] und der season_recap beim Archivieren. Was fehlte, waren die
  // beiden langen Blicke — Monatshalbzeit und Jahreswechsel. Sie hängen
  // NICHT am Losverfahren: `pflicht` belegt den Slot direkt, damit ein
  // Rückblick nie ausfällt, weil an dem Tag zufällig etwas anderes zog.

  T.push({ key:'rueckblick_halbzeit',
    pflicht: (tag, stunde) => stunde >= 15 && Number(tag.slice(8, 10)) === 15,
    make: () => {
      if(typeof seasonTitles !== 'function') return null;
      let T2 = null, sid = null;
      try { sid = currentSeason().id; T2 = seasonTitles(sid); } catch(e){ return null; }
      if(!T2) return null;
      const offen = SEASON_TITLES.length - T2.awarded.length;
      const fuehrend = T2.champ && pm[T2.champ.pid] ? T2.champ : null;
      const ohne = (T2.empty || []).filter(id => pm[id]).length;
      return { cat:'season', ic:'stopwatch', prio:6,
        title:`Der ${seasonLabel(sid)} ist zur Hälfte gespielt`,
        desc: `${T2.matches} Sätze an ${T2.days} Spieltagen. `
          + (fuehrend ? `${nameOf(fuehrend.pid)} führt mit ${fuehrend.elo} Elo aus ${fuehrend.games} Sätzen. ` : '')
          + `${T2.awarded.length} von ${SEASON_TITLES.length} Monatschroniken sind vergeben, ${offen} noch offen`
          + (ohne ? `, ${ohne} Spieler ${ohne === 1 ? 'trägt' : 'tragen'} noch keine.` : '.')
          + ` Die zweite Monatshälfte entscheidet.`,
        vv:String(offen), vl:'noch offen',
        dataRef:{ ambientPid: fuehrend ? fuehrend.pid : null, seasonTable:sid, bild:{f:'tafel', voll:T2.awarded.length,
          alle:SEASON_TITLES.length, traeger:_tafelTraeger(T2.awarded)} } };
    }});

  T.push({ key:'rueckblick_jahr',
    pflicht: (tag, stunde) => stunde >= 10 && tag.slice(5) === '01-01',
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
        title:`${jahr} in Zahlen`,
        desc: `${imJahr.length} Sätze an ${tage} Spieltagen, ${tore} Games. `
          + (bester ? `${nameOf(bester)} holte ${zaehler[bester]} von ${meister.length} Meistertiteln. ` : '')
          + (spitze ? `Im Prestige steht ${nameOf(spitze)} vorn. ${prestigeOf(spitze).punkte} Punkte, ${prestigeOf(spitze).insignie.name}.` : ''),
        vv:String(imJahr.length), vl:'Sätze',
        dataRef:{ ambientPid: spitze || null, prestige: !!spitze } };
    }});

  return T;
}

