// ═══════════════════════════════════════════════════════════════════════
// [§C40] DAS KARRIEREENDE
// ═══════════════════════════════════════════════════════════════════════
// Wer die Gruppe verlässt, spielt keine Partie mehr. Gelöscht wäre seine
// Geschichte weg, ausgeblendet (`hidden`) auch. Das Karriereende hält beides
// auseinander, mit vier Regeln, und mehr gibt es nicht:
//
//   1. ZEITRÄUME brauchen keine Abfrage. Ein Tag, eine Woche, ein Monat:
//      wer darin gespielt hat, steht darin — Tabelle, Awards, Player of the
//      Day und Week, Meister, Monatschronik, Rückblick —, auch wenn er danach
//      aufhört. Nach dem Karriereende spielt er nicht mehr, also kommt er in
//      späteren Zeiträumen von selbst nicht vor. Das ist `sichtbar`.
//   2. LAUFBAHN-VERGLEICHE sind ohne ihn, ab dem Karriereende: Ewige Tafel
//      und Gesamt, Rangstufen, Liga-Rekorde, Prestige-Rang, die Teams und
//      Seiten über die ganze Laufbahn, die Spielerwahl und die Fun
//      Facts. Er hält dort keinen Platz mehr fest, den andere erspielen
//      könnten. Das ist `ligaAktiv` — ohne Zeitpunkt, auch in einem
//      Zeitschnitt: ein Laufbahn-Vergleich vergleicht mit der Liga von heute.
//   3. SEIN PROFIL steht im gespeicherten Stand (`players.retired_stand`),
//      in zwei Teilen:
//      - KARRIERE, beim Klick: was ein Vergleich mit der Liga war — die
//        Rekorde, die er hielt, Rangstufe, Perzentil, Prestige-Platz.
//      - ABSCHLUSS, sobald jeder Zeitraum zu ist, in dem er noch gespielt
//        hat (`ruhestandAbschlussMs`: Ende der Woche und des Monats seines
//        Karriereendes, dazu der Tag, an dem deren Rückblicke erscheinen):
//        was er selbst gespielt hat — Auszeichnungen und ihr Katalog,
//        Prestige mit Insignium, Fingerabdruck. Bis dahin wird es gerechnet
//        wie für jeden, mit den Rekorden aus dem Karriere-Teil.
//      Danach rechnet für ihn nichts mehr: eine neue Fassung der App, ein
//      neuer Katalogeintrag, ein anderer Startwert ändern sein Profil nicht.
//   4. DER FEED nennt ihn nach dem Abschluss nicht mehr, außer in der Karte
//      seines Karriereendes (`ohneStoriesNachAbschied`, ein Tor für alles).
//
// Eine Partie nach dem Karriereende gibt es nicht: Eingabe und Bearbeiten
// bieten ihn dafür nicht an (`imRuhestandAm`). Alles Übrige folgt daraus.
// Eine rohe `.hidden`-Abfrage lässt `tests/ruhestand` nicht zu: jede Stelle
// wählt zwischen `sichtbar` und `ligaAktiv`.

function _spielerVon(x){ return typeof x === 'string' ? pmap()[x] : x; }

// Der Zeitpunkt des Karriereendes in Millisekunden, sonst 0.
function ruhestandMs(x){
  const p = _spielerVon(x);
  if(!p || !p.retired_at) return 0;
  const t = Date.parse(p.retired_at);
  return isFinite(t) ? t : 0;
}
function imRuhestand(x){ return ruhestandMs(x) > 0; }

// Hatte er zum Zeitpunkt `ms` schon aufgehört? Nur für die Eingabe einer
// Partie: danach gibt es keine mit ihm.
function imRuhestandAm(x, ms){
  const t = ruhestandMs(x);
  return t > 0 && ms > t;
}

// Regel 1: nicht ausgeblendet. Für alles, was gespielt wurde.
function sichtbar(x){ const p = _spielerVon(x); return !!p && !p.hidden; }

// Regel 2: tritt in der Liga an. Für jeden Vergleich über die Laufbahn.
function ligaAktiv(x){
  const p = _spielerVon(x);
  return !!p && !p.hidden && !imRuhestand(p);
}

// Die Ruheständler, der jüngste Abschied zuerst.
function ruhestandSpieler(){
  return players.filter(p => sichtbar(p) && imRuhestand(p))
    .sort((a, b) => ruhestandMs(b) - ruhestandMs(a));
}

// Der Abschluss: wann der letzte Zeitraum zu ist, in dem er gespielt haben
// kann, und die Rückblicke darauf erschienen sind. Der Player of the Week
// steht am Sonntag um 23 Uhr, die Monatschronik am 1. um Mitternacht — ein
// Tag nach dem Ende von Woche und Monat ist beides da.
function ruhestandAbschlussMs(x){
  const t = ruhestandMs(x);
  if(!t) return 0;
  const monat = seasonEnd(seasonOf(new Date(t)).id).getTime();
  const woche = new Date(t);
  woche.setHours(0, 0, 0, 0);
  woche.setDate(woche.getDate() + 7 - wochentagMo(woche));
  return Math.max(monat, woche.getTime() - 1) + 864e5;
}

// Ein Stück Geschichte, das bei `bisMs` endet: die Ansicht eines
// abgeschlossenen Monats oder einer vergangenen Woche. `data-bis` sagt es dem
// Markup, damit `tests/ruheliga` einen Ruheständler dort nicht sucht — und
// überall sonst schon. Ohne Ende bleibt das Markup, wie es ist.
function geschichteHtml(html, bisMs){
  return bisMs != null && isFinite(bisMs) ? `<div class="geschichte" data-bis="${bisMs}">${html}</div>` : html;
}

// ── Regel 4: das Tor des Feeds ──────────────────────────────────────────
// Eine Story nach seinem Abschluss, die ihn irgendwo nennt — als Halter,
// Verfolger, Vorgänger oder in einer Liste —, fällt. Bis zum Abschluss
// erzählt der Feed noch von den Zeiträumen, in denen er gespielt hat: sein
// letzter Spieltag, seine letzte Woche, sein letzter Monat. Hier und nicht je
// Story-Typ, damit es kein neuer Typ vergessen kann; aus dem Generator, bevor
// gespeichert wird, und aus der Datenbank in `_consolidateStories`. Ohne
// Ruheständler kommt die Liste unverändert zurück, die Merker dahinter hängen
// an ihrer Identität.
const _storyText = new WeakMap();
function ohneStoriesNachAbschied(list){
  if(!Array.isArray(list)) return list;
  const weg = ruhestandSpieler().map(p => ({id:p.id, ab:ruhestandAbschlussMs(p)}));
  if(!weg.length) return list;
  // Gesucht wird in dem, was die Story sagt, nicht in ihrer Zeichnung
  // (`visual`). Die Zeichnung einer Partie trägt Ranglisten anderer Spieler
  // — Monatstabelle, Träger einer Medaille, Partner —, und stand darin
  // jemand, der aufgehört hatte, fiel die ganze Karte der Partie weg:
  // gemessen fehlten nach Janes Abschied zwei Partien vom 04. und 09.11.
  // ganz im Feed, weil ihr Fuß Jane unter den Trägern von „Mauer" und
  // Martin unter Alex' Partnern zeigte. Was die Zeichnung über ihn zeigt,
  // filtert der Fuß selbst (`_spNoch`).
  const text = s => {
    let x = _storyText.get(s);
    if(x == null){
      const d = s.dataRef || {};
      x = JSON.stringify(d.visual ? Object.assign({}, d, {visual:null}) : d);
      _storyText.set(s, x);
    }
    return x;
  };
  const bleibt = list.filter(s => {
    if(!s || (s.dataRef || {}).type === 'karriereende') return true;
    const t = +new Date(s.when);
    return !weg.some(w => t > w.ab && text(s).indexOf(w.id) >= 0);
  });
  return bleibt.length === list.length ? list : bleibt;
}

// ── Regel 3: der gespeicherte Stand ─────────────────────────────────────
//   {v, t, karriere:{rekorde, rang, platz, von}, abschluss:null | {badges,
//    katalog, prestige, finger}}
// Gültig nur mit dieser Fassung und für genau dieses Karriereende: wird
// `retired_at` von Hand geändert, gehört der Stand zu einem anderen
// Zeitpunkt. Gemerkt je Spieler, Text und Zeitpunkt, damit nicht jedes Lesen
// den JSON-Text neu zerlegt. Ohne Stand (nur bei einem von Hand gesetzten
// Zeitpunkt) zeigt das Profil keine Rekorde und keinen Rang.
const RUHE_STAND_FASSUNG = 2;
const _ruheGespeichertMemo = new Map();
function _ruheGespeichert(pid){
  const p = _spielerVon(pid);
  if(!p || !p.retired_stand || !imRuhestand(p)) return null;
  const roh = p.retired_stand, t = ruhestandMs(p);
  const merk = _ruheGespeichertMemo.get(p.id);
  if(merk && merk.roh === roh && merk.t === t) return merk.wert;
  let o = roh;
  if(typeof roh === 'string'){ try { o = JSON.parse(roh); } catch(e){ o = null; } }
  const wert = (o && o.v === RUHE_STAND_FASSUNG && o.t === t && o.karriere) ? _ruheStufeNachName(o) : null;
  _ruheGespeichertMemo.set(p.id, {roh, t, wert});
  return wert;
}

// Die Stufe steht im Prestige als Zahl, und eine Zahl zeigt nach dem
// Einfügen einer Stufe auf die falsche: aus dem Zierkranz würde der
// Lorbeerreif. Der Schlüssel (`insignie.key`) bleibt, also gilt er.
function _ruheStufeNachName(o){
  const pr = o.abschluss && o.abschluss.prestige, key = pr && pr.insignie && pr.insignie.key;
  const j = key ? INSIGNIEN.findIndex(x => x.key === key) : -1;
  if(j < 0) return o;
  const prestige = Object.assign({}, pr, {stufe:j, insignie:INSIGNIEN[j], naechste:INSIGNIEN[j + 1] || null});
  return Object.assign({}, o, {abschluss:Object.assign({}, o.abschluss, {prestige})});
}

const _RUHE_LEER = {rekorde:[], rang:null, platz:0, von:0};
// Der Karriere-Teil: Rekorde, Rangstufe, Prestige-Platz beim Klick.
function ruhestandStand(pid){
  const g = _ruheGespeichert(pid);
  return (g && g.karriere) || _RUHE_LEER;
}
// Der Abschluss-Teil, sobald er gespeichert ist, sonst null.
function ruhestandAbschluss(pid){
  const g = _ruheGespeichert(pid);
  return (g && g.abschluss) || null;
}
function ruhestandAuszeichnungen(pid){
  const a = ruhestandAbschluss(pid);
  return a && Array.isArray(a.badges) ? a.badges : null;
}

// Der Katalog der Auszeichnungen, gegen den ein Profil zählt: für einen
// abgeschlossenen Ruheständler der von damals, mit der Klasse von damals.
// Mit dem von heute stand im Blatt zwei Jahre später „37 von 51" statt „37
// von 50" und darunter eine gesperrte Auszeichnung, die es damals nicht gab.
function badgeKatalog(pid){
  const a = imRuhestand(pid) ? ruhestandAbschluss(pid) : null;
  if(!a || !Array.isArray(a.katalog)) return BADGES.map(b => ({b, r:rarityOf(b.id)}));
  const jetzt = new Map(BADGES.map(b => [b.id, b]));
  const geholt = new Map((a.badges || []).map(b => [b.id, b]));
  return a.katalog.map(k => ({b:jetzt.get(k.id) || geholt.get(k.id) || null, r:k.r})).filter(x => x.b);
}

// Der Karriere-Teil wird VOR dem Setzen gerechnet: in diesem Moment ist er
// noch ein Spieler wie jeder, und die gewöhnliche Rechnung ist genau die Liga
// beim Karriereende. Keine zweite Rechnung, kein Zeitschnitt.
function _ruheKarriereBauen(pid){
  let rekorde = [], rang = null, T = null;
  try { rekorde = chroniclesOfPlayer(pid); } catch(e){ rekorde = []; }
  try { rang = getPlayerRank(pid); } catch(e){ rang = null; }
  try { T = prestigeTabelle(); } catch(e){ T = null; }
  return {rekorde, rang, platz:T ? T.rang.indexOf(pid) + 1 : 0, von:T ? T.rang.length : 0};
}

// Der Abschluss-Teil: was bis hierher gerechnet wurde, festgehalten.
function _ruheAbschlussBauen(pid){
  const badges = computeBadges(pid)
    .map(b => ({id:b.id, em:b.em, ic:b.ic, name:b.name, desc:b.desc, count:b.count}));
  let finger = null;
  try { finger = fingerabdruck(pid); } catch(e){ finger = null; }
  return {badges, katalog:BADGES.map(b => ({id:b.id, r:rarityOf(b.id)})),
          prestige:prestigeOf(pid), finger};
}

// Nach dem Laden: wer seinen Abschluss erreicht hat und ihn noch nicht
// gespeichert hat, bekommt ihn — einmal je Sitzung und Karriereende, und nur,
// solange dasselbe Karriereende gilt (ein anderes Gerät kann es inzwischen
// zurückgenommen haben).
const _ruheAbgeschlossen = new Set();
function _ruheAbschliessen(){
  const jetzt = Date.now();
  for(const p of ruhestandSpieler()){
    const g = _ruheGespeichert(p.id);
    const merk = p.id + '_' + p.retired_at;
    if(!g || g.abschluss || jetzt < ruhestandAbschlussMs(p) || _ruheAbgeschlossen.has(merk)) continue;
    _ruheAbgeschlossen.add(merk);
    let wert = null;
    try { wert = JSON.parse(JSON.stringify(Object.assign({}, g, {abschluss:_ruheAbschlussBauen(p.id)}))); }
    catch(e){ wert = null; }
    if(!wert) continue;
    const bei = p.retired_at;
    Promise.resolve(sb.from('players').update({retired_stand: wert}).eq('id', p.id).eq('retired_at', bei))
      .then(r => { if(r && !r.error && p.retired_at === bei){ p.retired_stand = wert; invalidateCache(); } })
      .catch(() => {});
  }
}

// ── Speichern ───────────────────────────────────────────────────────────
// Zeitpunkt und Karriere-Teil gehen in EINEM Schreiben: ein Karriereende
// ohne seine Rekorde gibt es nicht. Fehlt die Spalte, wird nichts gesetzt und
// der Hinweis nennt datenbank/karriereende.sql. Die Rückkehr leert beides.
async function karriereSetzen(pid, beenden){
  const t = beenden ? new Date().toISOString() : null;
  const stand = beenden
    ? {v:RUHE_STAND_FASSUNG, t:Date.parse(t), karriere:JSON.parse(JSON.stringify(_ruheKarriereBauen(pid))), abschluss:null}
    : null;
  const {error} = await sb.from('players').update({retired_at: t, retired_stand: stand}).eq('id', pid);
  if(error){
    // 42703: eine Spalte gibt es nicht — die Migration in datenbank/ fehlt.
    const fehlt = /retired_|42703|column/i.test(String(error.message || error.code || ''));
    return {ok:false, fehlt, error};
  }
  return {ok:true, wert:t};
}

// ── Gelöscht wird nur, wer nie gespielt hat ────────────────────────────
// Ohne Partie gibt es nichts, das bleiben müsste: Name und Bild sind alles.
// Wer gespielt hat, ist Teil der Geschichte der anderen — jede seiner
// Partien trägt drei weitere Namen, deren Elo, Serien und Rekorde gegen ihn
// gerechnet sind. Für jemanden, der aufhört, gibt es das Karriereende, für
// einen Fehlgriff das Ausblenden. Gefragt wird die DATENBANK, nicht die
// geladene Liste: die ist leer, solange der erste Abruf läuft oder wenn er
// fehlschlug.
async function spielerLoeschen(pid){
  const {count, error} = await sb.from('matches').select('id', {count:'exact', head:true})
    .or(['a1', 'a2', 'b1', 'b2'].map(k => k + '.eq.' + pid).join(','));
  if(error || typeof count !== 'number') return {ok:false, grund:'netz'};
  if(count > 0) return {ok:false, grund:'partien', zahl:count};
  const {error:e2} = await sb.from('players').delete().eq('id', pid);
  if(e2) return {ok:false, grund:'netz'};
  return {ok:true};
}
