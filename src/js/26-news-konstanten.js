// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  §11  LIGA NEWS / STORY-SYSTEM                                        ║
// ║  ───────────────────────────────────────────────────────────────────  ║
// ║  Erzeugt redaktionelle "Schlagzeilen" aus bestehenden Liga-Daten.     ║
// ║  KEINE neuen Berechnungen — nur Interpretation existierender Caches.  ║
// ║                                                                       ║
// ║  Die Abschnitte §11.x verteilen sich auf 26- bis 31-…; welcher wo     ║
// ║  liegt, steht in docs/anker.md (erzeugt, von Wächter 8 geprüft).      ║
// ║  Die Regeln des Feeds stehen in docs/gesetze/C33-feed.md.             ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── §11.0 — Konstanten ──────────────────────────────────────────────
// News-Debug-Flag (v8.4): hält console-Logs des News-Systems aus der
// Produktiv-Konsole heraus. Standard: aus. Zur Laufzeit aktivierbar über
// DevTools — KEIN Reload nötig:  window.NEWS_DEBUG = true
// Alle News-Logs laufen über `if(NEWS_DEBUG || window.NEWS_DEBUG) console…`.
const NEWS_DEBUG = false;

// Kategorien (Filter-Pills + CSS-Klassen über `nv-cat-${cat}`).
// label = Anzeige im Filter; descLabel = im Detail- und Story-Header.
const NEWS_CATEGORIES = {
  // v9: „Breaking" ist KEIN eigener Generator-Typ, sondern eine ANZEIGE-Kategorie.
  // _isBreaking() promotet die ultra-seltenen, liga-relevanten Ereignisse
  // (neuer Spitzenreiter, Platz-1-Duell, legendäres Badge, Saison-Klimax)
  // display-seitig hierher — wirkt auf bestehende UND neue persistierte Rows.
  breaking:   {label:'Breaking',    descLabel:'Breaking News',    ic:'sirene'},
  highlight:  {label:'Highlights',  descLabel:'Highlight',        ic:'funkeln'},
  season:     {label:'Saison',      descLabel:'Saison',           ic:'saisonKal'},
  badge:      {label:'Awards',      descLabel:'Badge & Awards',   ic:'abzeichen'},
  fun:        {label:'Fun Facts',   descLabel:'Fun Fact',         ic:'idee'},
  rivalry:    {label:'Rivalität',   descLabel:'Rivalität',        ic:'crossedSwords'},
  team:       {label:'Teams',       descLabel:'Team',             ic:'users'},
  comeback:   {label:'Comebacks',   descLabel:'Comeback',         ic:'comeback'},
  // „Persönlich" hieß nie „deins" — die App kennt keine Spielerzuordnung,
  // jeder sieht alles. Die Kategorie sammelt, was ein Einzelner erreicht hat:
  // 300 Elo geknackt, eine Bestmarke gesetzt. „Spielerzahl" stand als
  // Kartenaufschrift über „Maxi knackt 300 Elo" und las sich, als ginge es
  // um die Anzahl der Spieler.
  personal:   {label:'Spieler',     descLabel:'Meilenstein',      ic:'user'},
  history:    {label:'Historie',    descLabel:'Historie',         ic:'verlauf'},
  // Alles, was auf der Ewigen Tafel steht: Liga-Rekorde, Fügungen [§C35],
  // Monatschroniken und die Insignium-Stufen. Der ganze Awards-Reiter kam im
  // Feed nicht vor — wer einen Rekord übernahm, erfuhr es nur, wenn er
  // selbst nachsah.
  tafel:      {label:'Tafel',       descLabel:'Ewige Tafel',      ic:'tafelStein'},
  misfortune: {label:'Pechvogel',   descLabel:'Pechvogel',        ic:'rainCloud'},
};

// LocalStorage-Keys (versioniert für künftige Migrations)
// Ambient-Stories sind weiterhin eine ruhige Kartenform, aber nicht mehr ein
// einziger grauer Block. Ihre bereits persistierte `ambientRubrik` steuert
// Rubrikname und Farbschnitt: vier vertraute Familien statt sieben neuer
// Vollfarben. So unterscheiden sich Liga-Zahl, Form, Duell und Laufbahn schon
// beim Ueberfliegen, ohne den Feed bunt oder eine Zahl faelschlich golden zu
// machen [§C25]. `ton` ist zugleich der kontrollierte CSS-Klassensuffix.
const NEWS_AMBIENT_STIL = {
  liga:         {label:'LIGA IN ZAHLEN',    ton:'liga'},
  persoenlich:  {label:'SPIELER IM FOKUS',  ton:'persoenlich'},
  form:         {label:'DIE FORMKURVE',     ton:'form'},
  duell:        {label:'DUELL IN ZAHLEN',   ton:'duell'},
  laufbahn:     {label:'AUS DER LAUFBAHN',  ton:'laufbahn'},
  chronik:      {label:'AUS DER CHRONIK',   ton:'chronik'},
  auszeichnung: {label:'AUSZEICHNUNGEN',    ton:'auszeichnung'},
};

const NEWS_LS_SEEN  = 'padel_news_seen_v1';
// ── Der Lesestand ───────────────────────────────────────────────────
// Der Zeitpunkt der neuesten Karte, die beim letzten „Alles gelesen" im
// Feed stand. Ohne ihn zaehlte die App als neu, was sie noch nicht in der
// Liste der gelesenen IDs findet — und das ist nicht dasselbe: eine Karte
// faellt unter einen Deckel, eine Schlagzeile verdraengt eine gleichlautende,
// eine Sperrfrist laeuft ab. Gemessen ueber fuenfundvierzig Tage trugen 81
// von 267 neu auftauchenden Karten (30 %) einen Zeitpunkt, der laenger
// zurueckliegt als alles, was der Leser schon gesehen hat: „Martin und Alex
// brechen Julians 7er-Serie" vom 09.07. kam am 14.07. und am 20.07. erneut
// als neu hoch. Neu ist, was SEIT dem letzten Blick dazugekommen ist.
const NEWS_LS_STAND = 'padel_news_stand_v1';
const NEWS_LS_TOAST = 'padel_news_toast_v1';  // v8.1: zeitstempel + count des letzten Toasts
const NEWS_LS_MAX_SEEN = 600; // Ring-Buffer-Limit (deckt das ganze Fenster)
const NEWS_TOAST_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h zwischen identischen Toast-Counts
// Wie lange der Hinweis „x neue Stories" steht. Beim Start länger: wer die
// App öffnet, sieht zuerst der Liga beim Aufbauen zu, und in vier Sekunden
// war der Hinweis oft schon fort, bevor der Blick nach oben ging.
const NEWS_TOAST_MS = 4000;
const NEWS_TOAST_START_MS = 7000;

// Generator-Limits — Schutz gegen zu viele Stories pro Typ
// Ab so vielen Tagen ohne Partie meldet sich die Pause. Drei Tage sind ein
// gewöhnliches Wochenende, gespielt wird werktags.
const NEWS_PAUSE_TAGE = 5;
const NEWS_LIMITS = {
  // v9.4: bewusst kleiner → weniger News-Flut direkt nach Matches.
  topForm: 2,       // max Spieler "in Top-Form" gleichzeitig
  lossStreak: 2,
  winStreak: 8,     // jüngste echte Serienmarken im 14-Tage-Fenster
  giantSlayer: 4,   // starke Upsets: höchstens einer je Spieltag
  badgeUnlocked: 6, // letzte N freigeschalteten Badges
  // Zwei Rivalitätskarten mit derselben Schlagzeile und einer anderen Zahl
  // sind kein Paar, sondern eine Wiederholung. Es bleibt die mit den meisten
  // Duellen.
  rivalry: 1,
  // Meilensteine eines Paares (50., 100., …). Über die Ligageschichte reißen
  // viele Paare eine Schwelle; gemeldet werden die jüngsten. Gemessen wurden
  // sechzehn gebildet und persistiert, von denen zwei im Feed standen.
  rivalryMarke: 4,
  // Ein Tag trägt fünf Karten. Gemessen trug ein Spieltag neun, und die
  // schwächsten vier waren Wiederholungen bereits erzählter Entwicklungen.
  // Breaking zählt nicht mit [§C33].
  // Ein starker Spieltag kann viele Rekorde und Monatschroniken zugleich
  // verschieben. Sie werden vor der Bündelung nicht mehr abgeschnitten:
  // dieselbe Partie bzw. Minute ergibt später eine einzige vollständige
  // Tafel-Karte. So sinkt die Kartenzahl, nicht der fachliche Inhalt.
  // Vier, nicht fuenf: der Deckel zaehlt seit der Korrektur nur, was er auch
  // wegnehmen kann, und Breaking und die Pflichtkarte kommen dazu. Bei fuenf
  // trug ein Spieltag damit gemessen sieben Karten — das ist wieder ein
  // Protokoll. Vier eigene Plaetze plus der Sieger des Tages plus, wenn es
  // eines gibt, ein Breaking: gemessen drei bis sechs Karten je Spieltag.
  proTag: 4,
  // So viele Plätze eines Tages gehören der Ewigen Tafel, wenn sie sich an
  // diesem Tag bewegt hat. Die Mischung war vorher eine Quote über das ganze
  // Fenster, und erfüllt wurde sie, indem Spieltagskarten wegfielen: gemessen
  // schnitt das den Feed von 42 auf 23 Karten und leerte zwei von sieben
  // Spieltagen vollständig, ohne der Tafel eine einzige Karte hinzuzufügen.
  // Reserviert statt quotiert, und je Tag statt je Fenster [§C33].
  tafelProTagMin: 1,
  // Wie viele Zeilen eine Sammelkarte im Band zeigt. „Bündeln darf nichts
  // verstecken" war fuer zwei bis vier Teile geschrieben; gemessen trug ein
  // Tafel-Moment neunzehn — fuenf Bestmarken, dreizehn Monatschroniken und
  // ein Insignium —, und die Karte bedeckte den ganzen Bildschirm. Damit
  // versteckt gerade die vollstaendige Liste alles andere. Die staerksten
  // sechs stehen auf der Karte (`teile` ist nach `prio` sortiert, also
  // Bestmarke vor Monatschronik vor Insignium), die Zahl dahinter fuehrt
  // ins Blatt, und dort steht weiterhin jede Zeile [§C33].
  // Sechs waren zu viele, sobald ein Spieltag die Tafel wirklich bewegt:
  // gemessen am 28.09. trug ein Tafel-Moment achtzehn Zeilen, davon elf
  // Ausbauten, und die Karte war ein Block aus Namen. Vier stehen auf der
  // Karte — zuerst, was Wirkung hat [§C33] —, die Zahl dahinter fuehrt ins
  // Blatt, und dort steht weiterhin jede Zeile.
  sammelZeilen: 4,
  // Ab wann die Karte des Tages steht [§C33]: mit der dritten Partie. Sie
  // stand erst mit der fuenften, kuerzere Tage bekamen sie um 19 Uhr — das
  // Band kam damit, wenn der Spieltag laengst vorbei war, und wer mittags
  // nach drei Partien in den Feed sah, fand keins. Die Wahl bleibt offen,
  // bis der Tag endet: was spaeter am Tag passiert und spannender ist,
  // uebernimmt das Band. Bei ein oder zwei Partien keins — es zeichnet aus,
  // was sich gegen andere Karten durchgesetzt hat, und zwei Partien sind
  // kein Feld, aus dem man waehlt.
  tagKartePartien: 3,
  // ── Und nur fuer eine Geschichte, die etwas hergibt ──────────────
  // Das Band ging an die staerkste Karte des Tages, auch wenn die staerkste
  // der schwaechste Bau des Generators war: gemessen trug ein Spieltag es auf
  // „Der groesste Ausschlag des Tages" mit 564 Punkten — unter dem Wert einer
  // Tagesbilanz (620). Ein Band, das eine beliebige Karte auszeichnet,
  // zeichnet nichts aus. Bleibt niemand darueber, traegt an diesem Tag keine
  // Karte das Band [§C33].
  tagKarteSpannung: 620,
  // Dieselbe Aussage über dieselben Leute kommt drei Tage lang nur einmal.
  // „Martin baut ‚Der Maßstab' aus" gilt nach jedem gewonnenen Spiel aufs
  // Neue, jedes Mal mit einem Prozentpunkt mehr: die ID ist damit eine andere,
  // die Karte für den, der scrollt, dieselbe. Gemessen standen an vier
  // aufeinanderfolgenden Spieltagen vier davon im Feed. Drei Tage, weil die
  // Liga an zwei bis drei Tagen der Woche spielt und die Meldung damit
  // höchstens einmal je Spielwoche wiederkommt.
  sperreTage: 3,
};

// ─── §11.0d — Wie weit der Feed zurueckreicht ────────────────────────
// Vierzehn Tage. Vorher stand die Zahl nirgends: der Feed las die 100
// juengsten Zeilen der Datenbank und zeigte davon 50 — bei achtzehn bis
// sechsundzwanzig Karten je Spieltag reichte das rund acht Tage weit, und
// wer nach einer Woche Pause hineinsah, fand seinen eigenen Spieltag nicht
// mehr. Eine Zeilenzahl ist keine Fensterbreite: sie haengt daran, wie viel
// gerade los war.
//
// Der Schnitt liegt jetzt am DATUM und nicht an der Zeilenzahl. Gelesen wird
// in Seiten, bis das komplette Fenster im Speicher steht.
//
// Vierzehn Tage sind das Fenster des GENERATORS: nur so weit zurück bildet er
// Karten. Gezeigt wird ein Monat (`newsAnzeigeAb`), und was älter als vierzehn
// Tage ist, kommt allein aus der Datenbank, so wie es veröffentlicht wurde
// [§C33]. Den Generator weiter zurückzuschicken hieße, für längst vergangene
// Tage Karten aus dem Stand von heute zu bilden: eine Tafel-Fassung oder ein
// Fun Fact, den es damals nicht gab.
const NEWS_FENSTER_TAGE = 14;
const NEWS_DB_SEITENGROESSE = 500;
// So lange hält eine Zeile in der Datenbank, gerechnet ab ihrem Ereignis. Ohne
// Angabe galt die Vorgabe der Tabelle, dreißig Tage ab dem Einfügen, und der
// Monat zurück hat einunddreißig Tage, wenn der Vormonat einunddreißig hat.
const NEWS_HALTEN_TAGE = 40;

// Der Feed reicht bis zum selben Tag des Vormonats, 00:00 — am 20. Oktober
// bis zum 20. September. Gab es den Tag dort nicht (31. März), gilt der
// letzte des Vormonats.
function newsAnzeigeAb(jetztMs){
  const d = new Date(jetztMs);
  const letzter = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), letzter)).getTime();
}

// ─── §11.0c — Wie oft dieselbe Auszeichnung Nachricht ist ────────────
// Die Karte entstand jedes Mal neu, wenn jemand ein Badge wieder holte.
// Gemessen über die ganze Ligageschichte stand „Martin: Mauer" damit
// vierzehnmal im Feed, wortgleich — der Text ist die Bedingung aus dem
// Katalog und ändert sich nie. Insgesamt gingen 93 der 866 je gebildeten
// Karten auf wiederholte Auszeichnungen zurück, mehr als auf jede andere
// Quelle.
//
// Gemeldet wird deshalb das ERSTE Mal und danach nur noch runde Marken —
// Anders als das Prestige muss die Zeitung aber nicht jedes Erreichen
// melden: Dort wächst der Wert gedämpft weiter [§C34], hier ist der
// dreißigste Zittersieg keine neue Geschichte; der fünfundzwanzigste ist
// eine Zahl, über die man redet.
// ─── Der Schlusssprint einer Saison ──────────────────────────────────
// „Noch fünf Tage" entstand an jedem der letzten sieben Tage, egal wie klar
// die Sache war: gemessen lag der Vorsprung dabei auch schon bei 91 Elo, und
// die Karte hieß trotzdem so. Eine Entscheidung ist offen, wenn die beiden
// vorn dicht beieinander liegen — 25 Elo sind an den echten Partien
// gemessen etwa zwei gewonnene Spitzenspiele.
const SAISON_ENDSPURT_ELO = 25;

// Die seltene Wiederholung bleibt auch oberhalb der hundertsten sichtbar.
// 25 bleibt eine Marke alter Verleihungen; ab 150 geht es je 25 weiter.
const NEWS_BADGE_MARKEN = [1, 5, 10, 20, 25, 50, 75, 100, 125];
// Und die Klasse entscheidet mit, wie oft. Eine Liste fuer alle drei war zu
// grob in beide Richtungen: eine LEGENDAERE Auszeichnung ist das Seltenste,
// was der Katalog hergibt — „Absoluter Sieger" ist der Grund, warum jemand
// die App oeffnet, und das gilt beim zweiten Mal genauso; sie fiel nach der
// Liste zwischen dem zehnten und dem fuenfundzwanzigsten Mal vierzehnmal
// weg. Eine GEWOEHNLICHE dagegen ist beim ersten Mal keine Nachricht: einen
// Zittersieg holt in der Liga jeder, der lange genug dabei ist. Der fuenfte
// ist eine Zahl, ueber die man redet.
const NEWS_BADGE_MARKEN_KLEIN = [5, 10, 25, 50, 100];
function _badgeTakt(rar, rang){
  if(rar === 'legendary') return true;
  if(rar === 'rare') return NEWS_BADGE_MARKEN.indexOf(rang) >= 0
    || (Number.isInteger(rang) && rang >= 150 && rang % 25 === 0);
  // Die neue Leiter betrifft Seltenes, nicht den bisherigen Takt kleiner
  // oder negativer Meldungen.
  return NEWS_BADGE_MARKEN_KLEIN.indexOf(rang) >= 0 || (rar !== 'common' && rang === 1);
}
function _badgeNaechsteMarke(rang){
  const n = Math.max(0, Math.floor(Number(rang) || 0));
  return NEWS_BADGE_MARKEN.find(k => k > n) || Math.max(150, (Math.floor(n / 25) + 1) * 25);
}

// ─── §11.0b — Wann jemand über sich hinauswächst ─────────────────────
// Die Form-Karte maß das NIVEAU: neun von zehn gewonnen. Gemessen über die
// ganze Ligageschichte traf sie damit vier Spieler, und einer davon zehn der
// siebzehn Male — wer die Quote gewinnt, gewinnt sie eben immer wieder. Für
// alle anderen war die Karte unerreichbar, und eine Nachricht, die nur die
// besten Vier je nennen kann, ist eine Bestenliste [§C38].
//
// Gemessen wird deshalb der ABSTAND ZUM EIGENEN Schnitt — dieselbe Frage,
// mit der die Monatschronik die Mitte des Feldes erreicht [§C38]. Dieselbe
// Schwelle trifft damit sieben Spieler statt vier, darunter die untere
// Hälfte der Siegquote.
//
// Das Fenster sind zehn Partien — dasselbe, das `_newsRecentForm` und der
// Formstreifen im Profil zeigen [§C27]. Der Vergleichswert ist die Laufbahn
// DAVOR: nähme man die ganze Laufbahn einschließlich der zehn, verglichen
// sich die Partien mit sich selbst und der Abstand schrumpfte, je weniger
// jemand gespielt hat.
//
// 25 Prozentpunkte sind an den echten Partien geeicht, nicht geschätzt:
// gemessen fällt die Karte 0,46 mal je Spieltag. Bei 20 wären es 0,63 und
// bei 30 nur noch 0,25 — dann steht sie an drei von vier Spieltagen nicht.
const FORM_FENSTER = 10;
const FORM_BASIS_MIN = 8;    // so viele Partien braucht der Vergleichswert
const FORM_VORSPRUNG = 0.25; // Anteilspunkte über dem eigenen Schnitt

// ─── §11.0a — Die eine Rangfolge ─────────────────────────────────────
// `prio` sagt, wie stark eine Karte ist. Der Tagesdeckel behält danach die
// stärksten sechs [§C33], und die Sammelkarte wählt danach ihren Kopf —
// beides sind VERGLEICHE, und ein Vergleich braucht EINE Skala.
//
// Es waren zwei. Die Spieltags-Karten standen seit jeher auf 1 bis 10, und
// als die Ewige Tafel dazukam, bekam sie 70 bis 95 — jede für sich richtig
// einsortiert, nur nie gegeneinander. Damit gewann jede Tafel-Karte gegen
// jede Spieltags-Karte, bevor der Deckel überhaupt hinsah. Gemessen über
// 56 Spieltage: die Ewige Tafel bekam 66 % aller Tagesplätze, und von den
// Karten, die der Generator zum Spieltag selbst bildete, fielen 70 % der
// laufenden Siegesserien, 83 % der Pleitenserien, 83 % der Serienbrecher
// und 67 % der Top-Form-Karten weg — während jede einzelne Insignium-Stufe
// (183 Stück), jeder Rekordwechsel (88) und jede Monatschronik (98) durchkam.
// Wer die App nach einem Spieltag öffnete, las von allem außer vom Spieltag.
//
// Die Zahlen stehen deshalb hier an EINER Stelle und nicht mehr als Literal
// im Generator. Verteilt über 1900 Zeilen ist die zweite Skala genau der
// Fehler, den niemand sieht.
//
// Drei Bänder, und die Grenze dazwischen ist eine Frage:
//
//   90+   BREAKING — das gab es so noch nie [§C33]. Zählt ohnehin nicht
//         gegen den Tagesdeckel, steht aber auch oben.
//   38-89 DER SPIELTAG — das haben DIESE Partien hergegeben. Gestern hätte
//         es die Karte nicht gegeben: eine Serie, die heute weitergewachsen
//         ist, ein Meilenstein, der heute gerissen wurde, ein Rekord, der
//         heute den Halter gewechselt hat.
//   10-37 DER HINTERGRUND — gilt heute und galt gestern schon: ein Zähler,
//         der schon lange steht, ein Countdown, eine Bilanz über Monate.
//
// Die Grenze ist bewusst diese Frage und nicht „positiv oder negativ": eine
// laufende Pleitenserie ist genauso ein Ergebnis dieses Spieltags wie eine
// Siegesserie, und als Hintergrund einsortiert fiel sie an JEDEM ihrer zwölf
// Tage aus dem Feed. Dass die Siegesserie trotzdem darüber steht, ist die
// Rangfolge innerhalb des Bandes, nicht ein eigenes Band.
//
//
// Abstufungen INNERHALB eines Typs (eine 12er-Serie wiegt schwerer als eine
// 5er) bleiben ein Zuschlag auf den Grundwert. Der Zuschlag darf sein Band
// verlassen, wo der Typ das auch darf: eine legendäre Auszeichnung und die
// beiden obersten Insignium-Stufen sind Breaking [§C33].
// Die Obergrenze des Spieltagsbandes [§C33]. Breaking beginnt bei 90, der
// Spieltag reicht bis 89 — und eine Sammelkarte waechst mit jeder Zeile um
// zwei. Gemessen am 28.09. bundelte ein Tafel-Moment achtzehn Aenderungen
// und stand damit bei 110: ueber dem Breaking-Band, ohne Breaking zu sein.
// Damit gab es die zweite Skala wieder, gegen die `STORY_PRIO` gebaut ist.
const PRIO_SPIELTAG_MAX = 89;

// ── Die Leiter der Serienmarken [§C33] ───────────────────────────────
// Drei, fünf, acht, zehn und danach jede fünfte. Sie stand als Menge im
// Generator; die Karte einer Serie zeigt jetzt auch die NÄCHSTE Marke als
// leere Felder, und zwei Kopien der Leiter nennen irgendwann zwei Ziele.
function istSerienMarke(n){
  return n === 3 || n === 5 || n === 8 || n === 10 || (n > 10 && n % 5 === 0);
}
function naechsteSerienMarke(n){
  let z = Math.max(1, (n | 0) + 1);
  while(!istSerienMarke(z)) z++;
  return z;
}

// ── Was ein Anlass einer Partie wiegt [§C33] ─────────────────────────
// Eine Tabelle für die Schlagzeile (`_leitWert`) und den Fuß
// (`_spFussFakten`): der Fuß zeichnet, was die Schlagzeile trägt. Die Zahlen
// standen zweimal, je Stelle eine Tabelle, und mussten von Hand gleich
// bleiben. Eine Serie wiegt mit ihrer Länge, eine Auszeichnung nach ihrer
// Klasse (`anlassGewicht`).
const ANLASS_GEWICHT = {lead_change:96, streak_record:95, top_clash:86, giant_slayer:84, streak_killer:80,
  fluch:64, milestone_wins:62, milestone_elo:60, elo_hoch:60, duell_kippt:60, tabellensprung:59,
  milestone_goals:58, jubilee:56, rivalry_milestone:54, revanche:52, duo_jubilaeum:50, woche_spitze:50,
  tag_plus:48, top_form:44, tag_hoehe:42, tagesmarathon:40, monat_gewinn:40, monat_halb:38,
  partner_best:36, rivalry:34, badge_marken:24};
function anlassGewicht(typ, dt){
  dt = dt || {};
  if(typ === 'win_streak' || typ === 'team_streak') return 46 + 2 * Math.min(17, Number(dt.streak) || 0);
  if(typ === 'badge_unlocked') return dt.rarity === 'legendary' ? 92 : dt.rarity === 'rare' ? 66 : 50;
  // Das Ende einer Pleitenserie wiegt mit ihrer Länge: nach zwölf
  // Niederlagen ist der erste Sieg die Nachricht der Partie, nach fünf eine
  // Zeile unter ihr.
  if(typ === 'pleiten_ende') return 58 + Math.min(20, Number(dt.n) || 0);
  if(typ === 'duo_pleiten_ende') return 44 + Math.min(16, Number(dt.n) || 0);
  if(typ === 'rueckkehr') return 42 + Math.min(14, Math.floor((Number(dt.tage) || 0) / 7));
  return ANLASS_GEWICHT[typ];
}
const STORY_PRIO = {
  // ── Breaking ──
  rekord_erstmals:   96,   // ein Liga-Rekord wird zum ersten Mal vergeben
  elo_record:        95,
  streak_record:     94,
  lead_change:       93,
  season_recap:      92,   // der Meister steht fest
  karriereende:      92,   // ein Spieler beendet die Karriere [§C40]
  // badge_unlocked und insignium_stufe erreichen das Band über ihren
  // Zuschlag, weil nur ein Teil ihrer Fälle Breaking ist.

  // ── Der Spieltag ──
  // Die Reihenfolge darin: erst, was die ganze Liga betrifft, dann die
  // Seltenheit. Gemessen an den echten Partien fällt eine Insignium-Stufe
  // 3,3 mal je Spieltag und eine Auszeichnung 2,8 mal, ein Serienbrecher
  // 0,3 mal und ein Sprung über den eigenen Schnitt 0,4 mal — die seltene
  // Karte steht deshalb über der häufigen. Drei Plätze sind davon
  // ausgenommen und stehen fest: der Sieger des Spieltags oben, und an der
  // Ewigen Tafel der übernommene Liga-Rekord über der Monatschronik über
  // der Insignium-Stufe [§C33].
  // Die beiden zusammenführenden Karten sind eine eigene Nachricht und keine
  // Zusammenfassung [§C33] — sie erben deshalb nicht den Rang ihres Kopfs.
  // „Zwei Spieler erreichen dieselbe Stufe im selben Moment" wiegt mehr als
  // eine einzelne Stufe, und mit dem geerbten Rang fiel die Karte an ihrem
  // eigenen Spieltag unter den Deckel.
  sammel_erfolg:     66,
  sammel_spieler:    66,
  potd:              88,   // der Sieger des Spieltags IST seine Schlagzeile
  // Der Tag, an dem die Monatstafel aufgeht: eine Karte je Monat, und sie
  // betrifft die ganze Liga. Sie steht ueber dem einzelnen Chronik-Wechsel,
  // weil es an diesem Tag gar keinen gibt [§C32], und unter dem Rueckblick
  // des Vormonats, der von einem abgeschlossenen Monat erzaehlt.
  chronik_frei:      82,
  woche:             84,
  rekord_geholt:     76,
  giant_slayer:      74,
  top_clash:         72,
  streak_killer:     70,
  win_streak:        68,
  loss_streak:       66,
  top_form:          64,   // weiter vorn als sonst [§11.0b]
  // Die Karte einer Partie ist der Anker ihres Spiels: alles, was darin
  // passiert ist, haengt sich beim Buendeln an sie, und das Buendel traegt
  // danach den Rang seines staerksten Teils [§C33]. Allein steht sie fuer
  // das Ergebnis, und das ist die leiseste Nachricht des Spieltagsbandes.
  spiel:             41,
  // Die Runde der Vier fasst Partien zusammen, die jede schon ihre Karte
  // haben [§11.6c]: sie steht knapp unter der einzelnen Partie.
  runde:             40,
  // Die Ehrung nach einer Runde [§11.6f]: über der Runde, unter dem Zeichen.
  ehrung:            41,
  match_result:      63,   // ein außergewöhnliches, exakt belegtes Ergebnis
  chronik_geholt:    62,
  team_streak:       60,
  insignium_stufe:   58,
  insignium_tag:     58,
  badge_unlocked:    54,
  team_loss_streak:  52,
  milestone_wins:    48,
  milestone_elo:     48,
  milestone_goals:   46,
  jubilee:           44,
  rivalry_milestone: 42,
  // Was in einer einzelnen Partie passiert [§C33]: es hängt an ihrer Karte,
  // also wiegt es dort, wo es die Schlagzeile mitbestimmt.
  fluch:             56,
  elo_hoch:          55,
  tabellensprung:    53,
  revanche:          51,
  duo_jubilaeum:     45,
  tagesmarathon:     43,
  // Die sieben Fakten des Katalogs: sie stehen nie allein, ihr Rang zählt
  // nur für die Reihenfolge der Zeilen ihrer Karte.
  duell_kippt:       52,
  pleiten_ende:      54,
  duo_pleiten_ende:  46,
  rueckkehr:         45,
  woche_spitze:      48,
  tag_plus:          47,
  tag_hoehe:         44,
  monat_gewinn:      42,
  monat_halb:        41,
  partner_best:      40,
  // Die gesammelten kleinen Marken eines Tages: eine Karte, und die
  // schwaechste des Spieltagsbandes. Sie sollen vorkommen, aber keinen
  // Platz von einer Geschichte nehmen, die von diesem Tag erzaehlt.
  badge_marken:      39,
  rekord_gesteigert: 40,   // ausbauen ist die schwächste der drei Meldungen
  elo_swing:         38,

  // ── Der Hintergrund ──
  rivalry:           30,   // ein Zähler, der seit fünfzig Duellen steht
  // ── Der Schlusssprint ──
  // Er stand mit 22 im Hintergrundband, als „Noch 5 Tage" an jedem Tag der
  // Saison entstand — ein Countdown ist kein Ereignis. Mit der Elo-Grenze
  // unten ist er etwas anderes: höchstens eine Karte je Saison, und nur,
  // wenn die Entscheidung wirklich offen ist. Damit gehört er ins
  // Breaking-Band [§C33].
  season_endgame:    91,
  season_start:      20,
  dry_spell:         16,
  quiet_week:        14,
  // Der Fun Fact fällt an einem lauten Tag ohnehin weg [§C33]; steht er,
  // dann weil sonst nichts da ist.
  ambient:            8,
};
// Der Zuschlag eines ambienten Templates liegt bei 2 bis 7 und ist nur
// INNERHALB des Fun-Fact-Topfs eine Rangfolge — er darf das Band nicht
// verlassen, sonst stünde ein Fun Fact über einer Pleitenserie.
const AMBIENT_PRIO_SPANNE = 7;
// Die Reihenfolge des Feeds ist die Zeit; bei gleicher Zeit steht die
// wichtigere Karte oben. Der Generator sortierte schon so, der Bestand und
// die Realtime-Zeilen nicht: dort entschied bei gleicher Zeit die
// Reihenfolge des Einlesens, und die Ehrung des Monats, die zur selben
// Sekunde wie sein Rückblick steht, landete mal darüber, mal darunter
// [§11.6f].
function _storyFolge(a, b){
  return (new Date(b.when) - new Date(a.when)) || ((b.prio || 0) - (a.prio || 0));
}

// Ambiente Fun-Fact-Stories (v8.5, v9.5) — Fun Facts / persönliche Nuggets,
// damit der Feed auch ohne neue Matches lebt.
//   RHYTHMUS (v9.7): TÄGLICH zwei Fun Facts — um 10:00 (Vormittag) und um
//                    19:00 (Feierabend). Früher (v9.6) nur abends einer.
//                    _isAmbientDay ist immer true → jeder Tag hat die Slots.
//   AMBIENT_SLOTS  = die eine Slot-Stunde; je Tag erscheint hoechstens eine Story,
//                    jeweils erst ab dieser Uhrzeit.
//   Anti-Spam:     IDs sind tages+stunden-deterministisch (`ambient_<datum>_<stunde>`)
//                  → ON CONFLICT DO NOTHING → keine Doppel über Geräte/Syncs.
//                  Die beiden Slots eines Tages zeigen nie denselben Typ.
//   Auswahl:       tages-seeded gezogen (Pseudo-Zufall, überall identisch) plus
//                  COOLDOWN: zuletzt (letzte AMBIENT_COOLDOWN_DAYS Tage)
//                  verwendete Fun-Fact-Typen werden gesperrt → Rotation statt
//                  vorhersehbarer Reihenfolge, keine schnellen Wiederholungen.
const AMBIENT_SLOTS = [15];
// Der einzelne 15-Uhr-Slot mischt Stand und Geschichte. Die Rotation darunter
// sorgt fuer den Themenwechsel zwischen Form, Laufbahn, Rekorden und Liga.
//
//   10:00 „Der Stand"      — nach vorn: was gerade offen ist, wer wie weit
//                            weg ist, was man heute noch holen kann.
//   19:00 „Die Geschichte" — zurück: Langzeitdaten, Jahrestage, Rekorde,
//                            Rivalitäten, was einmal war.
//
// Ohne Eintrag darf ein Template in beide Slots. Die Zuordnung ist ein
// Vorzug, kein Verbot: findet ein Slot nichts Passendes, greift er im
// letzten Durchgang auf den ganzen Topf zurück, statt leer auszugehen.
const AMBIENT_SLOT_ROLLE = {
  // Der Stand — nach vorn
  form_best_wr:'stand', form_striker:'stand', form_defender:'stand',
  form_clutch:'stand', form_close_wins:'stand', form_most_active:'stand',
  award_gold_leader:'stand',
  award_total_leader:'stand', fun_award_leader:'stand', fun_leader:'stand',
  fun_top_scorer:'stand', season_title_race:'stand',
  personal_wr:'stand', personal_streak:'stand',
  prestige_fuehrung:'stand', prestige_schwelle:'stand', prestige_schritt:'stand',

  // Die Geschichte — zurück
  history_age:'geschichte', fun_biggest_win:'geschichte', fun_busiest_day:'geschichte',
  fun_team_record:'geschichte', fun_goals:'geschichte', rivalry_most:'geschichte',
  rivalry_close:'geschichte', chronicle_spotlight:'geschichte',
  award_latest_gold:'geschichte', personal_favourite_opp:'geschichte',
  personal_best_mate:'geschichte', personal_position:'geschichte',
  personal_grinder:'geschichte', personal_glanztag:'geschichte', personal_kaltblut:'geschichte',
  insignium_stand:'geschichte', titelband_stand:'geschichte',
};
function _ambientRolleVon(key){ return AMBIENT_SLOT_ROLLE[key] || null; }
function _ambientRolleFuerSlot(){ return 'mix'; }
// Cooldown-Fenster (Tage): so lange wird ein bereits gezeigter Fun-Fact-Typ
// nicht erneut gewählt.
const AMBIENT_COOLDOWN_DAYS = 7;
// Auch verschiedene Templates koennen dieselbe Erzaehlrichtung haben. Diese
// Rubriken-Sperre mischt Fuehrung, Form, Duelle, Laufbahn und Geschichte, ohne
// kleine Datenbestaende leer laufen zu lassen (der Notnagel lockert sie).
const AMBIENT_RUBRIK_COOLDOWN_DAYS = 2;
// v9.14: Spieler-Cooldown (Tage). Der Typ-Cooldown verhindert nur gleiche
// TYPEN — bei einem dominanten Spieler zeigen aber viele VERSCHIEDENE
// Superlative (Sturm-Chef, Elo-Leader, Torschützenkönig …) auf denselben Kopf,
// sodass tagelang derselbe Name erscheint. Ein zuletzt gefeierter Spieler wird
// darum für dieses Fenster gemieden (Notnagel-Pass erlaubt ihn nur, wenn sonst
// kein Template Daten liefert) → echte Namens-Rotation.
const AMBIENT_PLAYER_COOLDOWN_DAYS = 2;
// Derselbe Fun Fact über dieselbe Person höchstens einmal im Monat. Der
// Typ-Cooldown (7 Tage) und der Spieler-Cooldown (2 Tage) verhindern diese
// Kombination nicht: gemessen über 40 Tage wiederholten sich elf Typ-Person-
// Paare, „kurz vor dem Schildring: Johannes" allein fünfmal. Die Führungs-
// Typen zeigen strukturell immer auf denselben Kopf, deshalb muss das Paar
// gesperrt werden und nicht nur der Typ.
const AMBIENT_PAAR_COOLDOWN_DAYS = 30;
// Auto-Sync-Intervall, damit neue Slots ohne Reload auftauchen (ms).
const NEWS_AUTOSYNC_MS = 10 * 60 * 1000;

// ─── §11.0h — Badge-Whitelist (v8.1) ─────────────────────────────────
// Nur seltene & besondere Badges erzeugen News. Common-Badges sind in der
// Liga zu häufig und würden den Feed verstopfen ("Achievement-Spam").
// Negative: nur die wirklich krassen (perfect_loss, mr_disaster, nemesis),
// nicht die alltäglichen wie bitter_loss/krimi_loser.
//
// PFLEGEHINWEIS: bei neuen Badges (§7.1) hier ergänzen, wenn sie als News
// auftauchen sollen. Default: nicht-newsworthy (bewusste Entscheidung).
const NEWS_BADGE_WHITELIST = new Set([
  // Legendary — alle 10 sind News-würdig
  'dynasty_600','dominator_400','award_collector','perfect_win','streak15','streak20',
  'untouchable','mr_perfect','allwetter','godly_streak',
  // Rare — kuratierte Auswahl: nur die mit besonderer Story
  'wall_badge','upset_king','unbeatable','streak10','vice_champion','potw','krimi',
  'games150', // "Dauerbrenner" (150 Matches) — Karriere-Meilenstein, v8.6 ergänzt
  // Negative — nur die seltenen, "krassen" Niederlagen
  'mr_disaster','nemesis','perfect_loss',
  // v9.5: explizit als News gewünscht (negativ, aber „immer newsworthy")
  'krimi_loser', // Krimi-Versager — 3 knappe Niederlagen in Folge
  'losing5',     // Losing Streak — 5 Niederlagen in Folge
  // Hinweis: Die gewünschten POSITIVEN Auszeichnungen (Nerven aus Stahl,
  // Wiederholungstäter, Krimi-Reihe, 10er Serie) sind bereits 'rare' und
  // laufen daher ohnehin über die generische Badge-News-Regel unten.
]);

