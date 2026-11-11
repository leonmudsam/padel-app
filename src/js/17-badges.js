// ╔═══ §7 ─── BADGE-SYSTEM (permanente Auszeichnungen) ─────────────────╗
//     ⚑ HOTSPOT — neue Badges benötigen Updates an MEHREREN Stellen.
//
//     Architektur:
//       BADGES[]              — Definitionen [§7.1]
//       BADGE_RARITY{}        — Klassen-Map  [§7.2]
//       RARITY_META{}         — Anzeige-Map  [§7.2]
//       count*-Funktionen     — Aggregat-Counter (für Profil) [§7.3]
//       getBadgeEarnedCache() — Match-Trigger fire() [§7.4]
//
//     Pro Match werden im Cache-Walk inkrementelle States pro Spieler
//     geführt; fire('badge_id') schreibt einen Eintrag. Ohne fire() taucht
//     das Badge NICHT im Match-Review/Achievement-Toast auf — nur im Profil.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Badges sind dauerhafte Achievements, die ein Spieler einmal freischaltet und für immer behält.
// Berechnet clientseitig aus der Match-Historie — kein DB-Umbau nötig.
// Reihenfolge im Array = Anzeige-Reihenfolge im Badge-Sheet (Grid mit 2 Spalten).
// Paare unten: jede Zeile hier = eine Zeile im 2-Spalten-Grid (links/rechts).
// ⚑ HOTSPOT — BADGES-Array. Die vollständige Liste steht in docs/erweitern.md §10.1;
//   eine Auszeichnung hängt an mehr als dieser einen Datei:
//   - Eintrag hier (mit ic/name/desc/count), Icon in §1.1
//   - Eintrag in BADGE_RARITY (§7.2) — ohne ihn gilt still `common`, die
//     billigste Klasse, und das Badge zählt fürs Prestige wie ein Zittersieg
//   - RARITY_META.<rarity>.total nachziehen — sonst lügt der Zähler im Blatt
//   - BADGE_WUERDE nur dann, wenn jeder Saisonerfolg auch eine neue
//     Nachricht auslösen soll [§11.0c]
//   - ggf. fire('badge_id') in getBadgeEarnedCache (§7.4) — sonst kein
//     Match-Trigger / kein Achievement-Toast / kein Chip im Match-Review
// ─── §7.0 Die Schwellen der Auszeichnungen ───────────────────────────
// Eine Stelle für jede Zahl, die der Katalog und der Auslöser (§7.4) beide
// brauchen: standen sie doppelt, zählte das Profil eine andere Serie als
// der Toast. Gezählt wird in Sätzen: eine Zeile ist ein Satz, ein Sieg ist
// ein gewonnener Satz, eine Serie sind Sätze in Folge. Ein Spieler kommt an
// einem Spieltag auf sechs bis zehn Sätze, im Monat auf dreißig bis sechzig.
// Die Zahlen sind rund (5, 10, 15, 20 — kein „11er Serie"), und jede Stufe
// liegt deutlich über der davor: vorher standen 8er und 11er Serien
// nebeneinander, und Urgestein und Dauerbrenner trennte kaum etwas.
const BG = {
  stammgast: 25, dauerbrenner: 100, urgestein: 250, siegermaschine: 150,
  seite: 50, allrounder: 25,
  serien: [5, 10, 15, 20],     // streak5, streak10, streak15, streak20
  talfahrt: 5,
  krimi: 5, krimiNied: 3, wiederholung: 3, tbSerie: 3, bagelSaison: 5,
  angstgegner: 5, serienbrecher: 5,
  tag: 5,                       // Sätze an einem Tag für die Tagesmuster
  // Saison-Elo für Aufsteiger, Dominator und Dynastie, von der Liga
  // vorgegeben: 150 und 300 für die beiden legendären, die Hälfte davon
  // für den Aufsteiger.
  elo: [75, 150, 300],
};
// Die Mindestzahl an Satzsiegen für den Spieler des Tages, der Woche und
// des Monats [§7.3], und was der Award-Sammler davon in einer Saison
// braucht. Ein Spieltag hat je Spieler sechs bis zehn Sätze: mit zwei
// Siegen wäre schon ein einziges gewonnenes Match genug gewesen.
const PERIODE_MIN_SIEGE = {tag:3, woche:5, monat:10};
const PERIODE_SAMMLER = {tag:3, woche:1};
// Was ein Satz für einen Spieler war, an einer Stelle für Katalog und
// Auslöser [§C27]. Die Begriffe stehen in §1.3.
// Zu Null ist ein Satz ohne abgegebenes Game (6:0). Vorher hieß es zwei
// Sätze ohne Satzverlust und hing an der Begegnung; die Liga zählt aber
// alles je Satz.
function bgZuNull(m){ return partie(m).zuNull; }
// Nur die Wende reicht über mehrere Sätze: die Begegnung, die an diesem
// Satz endet, und wer sie gewann — nicht der Sieger des letzten Satzes.
function bgBegegnungSieg(id, m){ return begegnungGewonnen(m, id) === true; }
function bgZitter(m){ return partie(m).entscheidTb; }
function bgKlar(id, m){ return won(id, m) && partie(m).deutlich; }
function bgKnapp(m){ return partie(m).knapp; }
function bgWende(id, m){ return begegnungAm(m).wende && bgBegegnungSieg(id, m); }
function bgBagels(id, m){ const t = teamVon(m, id); return t ? partieFuer(m, t) : {bagelsFor:0, bagelsAgainst:0}; }
// Die Tiebreaks eines Spielers in einer Partie, in Spielreihenfolge, als
// true (gewonnen) und false (verloren).
function bgTiebreaks(id, m){ const t = teamVon(m, id); return partie(m).tiebreaks.map(x => x.sieger === t); }

// ─── §7.1 Der Katalog der Auszeichnungen ─────────────────────────────
const BADGES=[
  // ══ EINMALIGE BADGES (Karriere-Meilensteine) ══
  {id:'first_match',ic:'egg',name:'Debütant',desc:'Ersten Satz gespielt',
    multi:true,count:(id,ms)=>countGames(id,ms)>=1?1:0},
  {id:'games25',ic:'racket',name:'Stammgast',desc:BG.stammgast+' Sätze gespielt',
    multi:true,count:(id,ms)=>countGames(id,ms)>=BG.stammgast?1:0},
  // Nicht „Legende": so heißt die oberste Stufe des Karriere-Rangs.
  {id:'games150',ic:'dauerbrenner',name:'Dauerbrenner',desc:BG.dauerbrenner+' Sätze gespielt',
    multi:true,count:(id,ms)=>countGames(id,ms)>=BG.dauerbrenner?1:0},
  {id:'allrounder',ic:'bothSides',name:'Allrounder',desc:BG.allrounder+' Sätze auf jeder Seite gewonnen',
    multi:true,count:(id,ms)=>{const s=playerStats(id,ms);return(s.drvW>=BG.allrounder&&s.revW>=BG.allrounder)?1:0;}},
  // Die IDs stammen aus der Kicker-Liga und nennen andere Zahlen; sie stecken
  // in News-, Toast- und Popover-Zuordnungen. Maßgeblich ist BG.
  {id:'games250',ic:'urgestein',name:'Urgestein',desc:BG.urgestein+' Sätze gespielt',
    multi:true,count:(id,ms)=>countGames(id,ms)>=BG.urgestein?1:0},
  {id:'wins200',ic:'siegermaschine',name:'Siegermaschine',desc:BG.siegermaschine+' Sätze gewonnen',
    multi:true,count:(id,ms)=>countWins(id,ms)>=BG.siegermaschine?1:0},
  {id:'reves50',ic:'posReves',name:'Revés-Spezialist',desc:BG.seite+' Sätze auf der Revés-Seite gespielt',
    multi:true,count:(id,ms)=>{const s=playerStats(id,ms);return s.revG>=BG.seite?1:0;}},
  {id:'drive50',ic:'posDrive',name:'Drive-Spezialist',desc:BG.seite+' Sätze auf der Drive-Seite gespielt',
    multi:true,count:(id,ms)=>{const s=playerStats(id,ms);return s.drvG>=BG.seite?1:0;}},
  // JEDE SAISON neu erreichbar: gezählt werden die Saisons, in denen jemand
  // die Marke geknackt hat, nicht wie oft er die Grenze überquert.
  {id:'climber_100',ic:'climb',name:'Aufsteiger',desc:'In einer Saison '+BG.elo[0]+' Elo erreicht (je Saison zählbar)',
    multi:true,count:(id,ms)=>countSeasonsAtElo(id,BG.elo[0],ms)},
  {id:'dominator_400',ic:'dominator',name:'Dominator',desc:'In einer Saison '+BG.elo[1]+' Elo erreicht (je Saison zählbar)',
    multi:true,count:(id,ms)=>countSeasonsAtElo(id,BG.elo[1],ms)},
  {id:'dynasty_600',ic:'temple',name:'Dynastie',desc:'In einer Saison '+BG.elo[2]+' Elo erreicht (je Saison zählbar)',
    multi:true,count:(id,ms)=>countSeasonsAtElo(id,BG.elo[2],ms)},

  // ══ MEHRFACH-BADGES — gruppiert nach Thema ══
  {id:'upset_king',ic:'underdog',name:'Außenseiterkönig',desc:'Satz als Außenseiter gewonnen (unter 35 % Siegchance)',
    multi:true,count:(id,ms)=>matchesOfPlayer(id,ms).filter(m=>won(id,m)&&myExp(id,m)<0.35).length},
  // Tages-Muster
  {id:'early_bird',ic:'sunrise',name:'Frühschicht',desc:'Ersten Satz des Spieltags gewonnen',
    multi:true,count:(id,ms)=>countEarlyBirdDays(id,ms)},
  {id:'unbeatable',ic:'crownPlus',name:'Unschlagbar',desc:'Spieltag ohne verlorenen Satz (ab '+BG.tag+' Sätzen)',
    multi:true,count:(id,ms,bis)=>countUnbeatableDays(id,ms,bis)},
  {id:'comeback_day',ic:'comeback',name:'Comeback-Tag',desc:'Spieltag mit einem verlorenen Satz begonnen und mit einem gewonnenen beendet (ab '+BG.tag+' Sätzen)',
    multi:true,count:(id,ms,bis)=>countComebackDays(id,ms,bis)},
  {id:'revanchist',ic:'rematch',name:'Revanchist',desc:'Match gegen ein Paar verloren und das nächste Match gegen dasselbe Paar gewonnen',
    multi:true,count:(id,ms)=>countRevenge(id,ms)},
  // Ergebnis-Muster
  {id:'clear_win',ic:'thumbsUp',name:'Klares Ding',desc:'Satz mit höchstens einem Viertel der Games für den Gegner gewonnen (6:2 oder klarer)',
    multi:true,count:(id,ms)=>countClearWins(id,ms)},
  {id:'krimi',ic:'thriller',name:'Krimi-Reihe',desc:BG.krimi+' knappe Sätze in Folge, gewonnen oder verloren (Tiebreak, 6:4 oder 7:5)',
    multi:true,count:(id,ms)=>countKrimiStreaks(id,ms)},
  {id:'repeat_score',ic:'duplicate',name:'Wiederholungstäter',desc:BG.wiederholung+' Sätze in Folge mit demselben Ergebnis gewonnen',
    multi:true,count:(id,ms)=>countRepeatScoreStreaks(id,ms)},
  {id:'losing5',ic:'trendCrash',name:'Die Talfahrt',desc:BG.talfahrt+' Sätze in Folge verloren',
    multi:true,count:(id,ms)=>countLossStreakOccurrences(id,ms,BG.talfahrt)},
  // Zu Null heißt: ein Satz ohne abgegebenes Game, 6:0 [§1.3].
  {id:'perfect_loss',ic:'dizzy',name:'Bagel kassiert',desc:'Satz 0:6 verloren, ohne ein einziges Game',
    multi:true,count:(id,ms)=>matchesOfPlayer(id,ms).filter(m=>bgZuNull(m)&&!won(id,m)).length},
  {id:'perfect_win',ic:'bagel',name:'Bagel serviert',desc:'Satz zu Null gewonnen (6:0)',
    multi:true,count:(id,ms)=>matchesOfPlayer(id,ms).filter(m=>bgZuNull(m)&&won(id,m)).length},
  {id:'nerves_of_steel',ic:'nerves',name:'Nerven aus Stahl',desc:BG.tbSerie+' Tiebreaks in Folge gewonnen',
    multi:true,count:(id,ms)=>countNailBiterStreaks(id,ms,BG.tbSerie)},
  {id:'nail_biter',ic:'pinch',name:'Zittersieg',desc:'Satz im Tiebreak oder Match-Tiebreak gewonnen',
    multi:true,count:(id,ms)=>matchesOfPlayer(id,ms).filter(m=>won(id,m)&&bgZitter(m)).length},
  // Serien
  {id:'streak5',ic:'flame',name:BG.serien[0]+'er Serie',desc:BG.serien[0]+' Sätze in Folge gewonnen',
    multi:true,count:(id,ms)=>countStreakOccurrences(id,ms,BG.serien[0])},
  {id:'streak10',ic:'flameDouble',name:BG.serien[1]+'er Serie',desc:BG.serien[1]+' Sätze in Folge gewonnen',
    multi:true,count:(id,ms)=>countStreakOccurrences(id,ms,BG.serien[1])},
  {id:'streak15',ic:'flameTriple',name:BG.serien[2]+'er Serie',desc:BG.serien[2]+' Sätze in Folge gewonnen',
    multi:true,count:(id,ms)=>countStreakOccurrences(id,ms,BG.serien[2])},
  {id:'streak20',ic:'crownFlame',name:BG.serien[3]+'er Serie',desc:BG.serien[3]+' Sätze in Folge gewonnen',
    multi:true,count:(id,ms)=>countStreakOccurrences(id,ms,BG.serien[3])},
  // Die einzige Auszeichnung über mehrere Sätze: sie gibt es nur im Match.
  {id:'wall_badge',ic:'wende',name:'Die Wende',desc:'Ersten Satz eines Matches verloren und das Match gewonnen',
    multi:true,count:(id,ms)=>matchesOfPlayer(id,ms).filter(m=>bgWende(id,m)).length},
  {id:'carry',ic:'weight',name:'Carry',desc:'Satz mit dem schwächsten der vier Spieler als Partner gewonnen',
    multi:true,count:(id,ms)=>countCarries(id,ms)},
  // Würden der Saison
  {id:'champion',ic:'crown',name:'Meister der Saison',desc:'Saison auf Platz 1 beendet',
    multi:true,count:(id,ms,bis)=>countChampion(id,bis)},
  {id:'vice_champion',ic:'medal2',name:'Vize-Meister',desc:'Saison auf Platz 2 beendet',
    multi:true,count:(id,ms,bis)=>countViceChampion(id,bis)},
  {id:'team_of_season',ic:'handshake',name:'Team der Saison',desc:'Bestes Duo einer Saison',
    multi:true,count:(id,ms,bis)=>countTeamOfSeason(id,bis)},
  {id:'award_collector',ic:'medalTrio',name:'Award-Sammler',desc:'In einer Saison mindestens '+PERIODE_SAMMLER.tag+'-mal Player of the Day und '+PERIODE_SAMMLER.woche+'-mal Player of the Week',
    multi:true,count:(id,ms,bis)=>countAwardCollector(id,ms,bis)},
  {id:'potw',ic:'weekKing',name:'Player of the Week',desc:'Höchste Satzquote einer Kalenderwoche (ab '+PERIODE_MIN_SIEGE.woche+' gewonnenen Sätzen)',
    multi:true,count:(id,ms,bis)=>countPeriodWins(id,ms,'week',bis)},
  {id:'potd',ic:'dayKing',name:'Player of the Day',desc:'Die meisten gewonnenen Sätze eines Spieltags (ab '+PERIODE_MIN_SIEGE.tag+')',
    multi:true,count:(id,ms,bis)=>countDayWins(id,ms,bis)},
  // Gegen die Tabelle
  {id:'kingslayer',ic:'kingFall',name:'Thronfäller',desc:'Satz gegen den Ersten der Saison-Rangliste gewonnen, gemessen vor dem Satz',
    multi:true,count:(id,ms)=>countKingslayer(id,ms)},
  {id:'overtake',ic:'ueberholen',name:'Überholmanöver',desc:'Satz gewonnen und dabei einen der Gegner in der Saison-Rangliste überholt',
    multi:true,count:(id,ms)=>countOvertake(id,ms)},
  {id:'duty_done',ic:'trophyCheck',name:'Pflichterfüller',desc:'Satz gegen einen der beiden Letzten der Saison-Rangliste gewonnen, gemessen vor dem Satz',
    multi:true,count:(id,ms)=>countBottomTwoMatchWins(id,ms)},
  {id:'streak_breaker',ic:'flameBreak',name:'Serienbrecher',desc:'Die Serie eines Gegners (ab '+BG.serienbrecher+' gewonnenen Sätzen) mit einem Satzgewinn beendet',
    multi:true,count:(id,ms)=>countStreakBreaker(id,ms)},
  {id:'black_day',ic:'schwarzerTag',name:'Schwarzer Tag',desc:'Spieltag mit mindestens '+BG.tag+' Sätzen, alle verloren',
    multi:true,count:(id,ms,bis)=>countBlackDays(id,ms,bis)},
  {id:'krimi_loser',ic:'dramaTear',name:'Krimi-Versager',desc:BG.krimiNied+' knappe Sätze in Folge verloren',
    multi:true,count:(id,ms)=>countCloseLossStreaks(id,ms,BG.krimiNied)},
  {id:'untouchable',ic:'dreiSaisons',name:'Untouchable',desc:'3 Saisons in Folge unter den Top-3 abgeschlossen',
    multi:true,count:(id,ms,bis)=>countUntouchable(id,bis)},
  {id:'mr_perfect',ic:'bagel',name:'Bagel-Bäcker',desc:BG.bagelSaison+' Sätze zu Null (6:0) in einer Saison gewonnen',
    multi:true,count:(id,ms)=>countMrPerfect(id,ms)},
  {id:'allwetter',ic:'weatherMix',name:'Allwetter',desc:'An 4 verschiedenen Wochentagen Player of the Day geworden',
    multi:true,count:(id,ms,bis)=>countAllwetter(id,ms,bis)},
  {id:'godly_streak',ic:'godRay',name:'Tag der Götter',desc:'An 3 eigenen Spieltagen in Folge Player of the Day geworden',
    multi:true,count:(id,ms,bis)=>countGodlyStreak(id,ms,bis)},
  {id:'bitter_loss',ic:'pille',name:'Bittere Pille',desc:'Satz im Tiebreak oder Match-Tiebreak verloren',
    multi:true,count:(id,ms)=>matchesOfPlayer(id,ms).filter(m=>!won(id,m)&&bgZitter(m)).length},
  {id:'mr_disaster',ic:'tripleCrash',name:'Mr. Disaster',desc:BG.bagelSaison+' Sätze 0:6 in einer Saison verloren',
    multi:true,count:(id,ms)=>countMrDisaster(id,ms)},
  {id:'crash_day',ic:'crashDay',name:'Zusammenbruch',desc:'Spieltag mit einem gewonnenen Satz begonnen und mit einem verlorenen beendet (ab '+BG.tag+' Sätzen)',
    multi:true,count:(id,ms,bis)=>countCrashDays(id,ms,bis)},
  {id:'nemesis',ic:'ghost',name:'Angstgegner',desc:BG.angstgegner+' Sätze in Folge gegen denselben Gegner verloren',
    multi:true,count:(id,ms)=>countNemesis(id,ms)},
];
// ════════════════════════════════════════════════════════════════════
// BADGE-RARITY-SYSTEM — vier Stufen + Negative eigenständig
// ════════════════════════════════════════════════════════════════════
//   • LEGENDARY (10) — extrem selten, Karriere-Highlight
//   • RARE      (14) — schwer, brauchen Skill/Konstanz
//   • COMMON    (18) — bei aktivem Spiel oft erreicht
//   • NEGATIVE  (8)  — „Schande", eigenständig (rot, abgesetzt)
// Jeder Bucket hat eine GERADE Anzahl, damit das 2-Spalten-Grid im Sheet
// sauber aufgeht. Total = 50 Badges (= BADGES-Array-Länge).
//
// WAS DIE KLASSE SAGT: wie schwer eine Auszeichnung zu HOLEN ist. Nicht,
// wie viele sie gerade halten — danach richtete sich früher der Prestige-
// Wert, und weil die Halterzahl mit der Liga wächst, lief der Fortschritt
// rückwärts [§C34]. Die Halterzahl ist trotzdem die Gegenprobe: über die
// 466 echten Partien halten die zehn legendären null bis fünf der zwölf
// Spieler, die vierzehn seltenen null bis neun, die achtzehn gewöhnlichen
// sechs bis zwölf. Legendär und selten überlappen oben, weil eine Würde
// je Saison neu zu holen ist: „Team der Saison" haben in vier Monaten fünf
// Spieler getragen und ist trotzdem das Schwerste, was die Liga vergibt.
//
// GOLD GEHÖRT NICHT DER ANWESENHEIT. „Urgestein" (300 Matches) und
// „Siegermaschine" (300 Siege) standen als legendär im Katalog und trugen
// damit den goldenen Rahmen im Blatt — neben „20er Serie" und „Meister der
// Saison". Sie hängen aber an nichts als der Spielzahl: wer lange genug
// dabei ist, bekommt sie, ohne je besser geworden zu sein. Sie sind jetzt
// selten; ihr violetter Rang bestimmt transparent Startwert und Abnahme.
// Sechs weitere Einträge standen davor in der falschen Klasse — „Player of
// the Day" (9 Halter, 52 mal vergeben) galt als selten, „Klares Ding"
// (10 Halter, 136 mal) ebenfalls.
//
// ⚑ Wer eine Klasse ändert, zieht RARITY_META.total nach — die Anzeige
// „3 / 14" im Blatt zählt aus dieser Zahl, nicht aus dem Bucket.
// ═════════════════════════════════════════════════════════════════════
// ─── §7.2 Die Klassen ─────────────────────────────────────────────────
// ⚑ HOTSPOT — BADGE_RARITY: ordnet jeder Badge-ID eine Rarity-Klasse zu.
// MUSS alle IDs aus BADGES (§7.1) abdecken — fehlt eine, fliegt die Badge
// aus der UI (kein Bucket, kein Icon-Wrapper).
const BADGE_RARITY = {
  // -- LEGENDARY (10) -- 0 bis 5 der zwoelf Spieler halten sie --
  champion:        'legendary', // Meister der Saison — einer je Monat
  team_of_season:  'legendary', // Team der Saison — ein Duo je Monat
  dynasty_600:     'legendary', // Dynastie (BG.elo[2] Saison-Elo, je Saison zählbar)
  dominator_400:   'legendary', // Dominator (BG.elo[1] Saison-Elo, je Saison zählbar)
  award_collector: 'legendary', // Award-Sammler (PERIODE_SAMMLER)
  streak15:        'legendary', // 15 Sätze in Folge
  streak20:        'legendary', // 20 Sätze in Folge
  untouchable:     'legendary', // Untouchable — 3 Saisons in Folge Top-3
  mr_perfect:      'legendary', // Bagel-Bäcker — BG.bagelSaison Sätze zu Null in einer Saison
  godly_streak:    'legendary', // Tag der Götter — drei Spieltage in Folge Player of the Day
  // -- RARE (14) -- 0 bis 9 Halter --
  drive50:         'rare',      // Drive-Spezialist — BG.seite Sätze rechts
  reves50:         'rare',      // Revés-Spezialist — BG.seite Sätze links
  games250:        'rare',      // Urgestein (BG.urgestein Sätze) — zählt Anwesenheit
  wins200:         'rare',      // Siegermaschine (BG.siegermaschine Satzsiege) — zählt Anwesenheit
  vice_champion:   'rare',      // Vize-Meister
  perfect_win:     'rare',      // Bagel serviert — ein Satz zu Null; fünf in einer Saison sind legendär
  repeat_score:    'rare',      // Wiederholungstäter
  streak10:        'rare',      // 10er Serie
  krimi:           'rare',      // Krimi-Reihe
  allrounder:      'rare',      // Allrounder
  unbeatable:      'rare',      // Unschlagbar
  nerves_of_steel: 'rare',      // Nerven aus Stahl
  potw:            'rare',      // Player of the Week
  allwetter:       'rare',      // Allwetter — einmalige POTD-Wochentagsbreite
  // -- COMMON (18) -- 6 bis 12 Halter --
  first_match:     'common',    // Debütant
  games25:         'common',    // Stammgast
  games150:        'common',    // Dauerbrenner (BG.dauerbrenner Sätze) — reine Wegmarke
  potd:            'common',    // Player of the Day — fast jeder Spieltag hat einen
  wall_badge:      'common',    // Die Wende — Satzrückstand im Match gedreht
  climber_100:     'common',    // Aufsteiger (BG.elo[0] Saison-Elo, je Saison zählbar)
  early_bird:      'common',    // Frühschicht
  comeback_day:    'common',    // Comeback-Tag
  revanchist:      'common',    // Revanchist
  nail_biter:      'common',    // Zittersieg
  carry:           'common',    // Carry
  kingslayer:      'common',    // Thronfäller — Sieg gegen Top-1
  overtake:        'common',    // Überholmanöver — Spieler in Rangliste überholt
  duty_done:       'common',    // Pflichterfüller — Satz gegen einen der beiden Letzten
  streak_breaker:  'common',    // Serienbrecher — Serie eines Gegners ab BG.serienbrecher gestoppt
  upset_king:      'common',    // Außenseiterkönig
  clear_win:       'common',    // Klares Ding — 6:2 oder klarer
  streak5:         'common',    // 5 Sätze in Folge
  // -- NEGATIVE (8) --
  losing5:         'negative',  // Die Talfahrt — BG.talfahrt Sätze in Folge verloren
  perfect_loss:    'negative',  // Bagel kassiert — Satz 0:6
  black_day:       'negative',  // Schwarzer Tag — ab BG.tag Sätzen, alle verloren
  krimi_loser:     'negative',  // Krimi-Versager — BG.krimiNied knappe Sätze in Folge verloren
  bitter_loss:     'negative',  // Bittere Pille — Satz im Tiebreak verloren
  mr_disaster:     'negative',  // Mr. Disaster — BG.bagelSaison Sätze 0:6 in einer Saison
  crash_day:       'negative',  // Zusammenbruch — Spieltag mit Satzgewinn begonnen, mit Satzverlust beendet
  nemesis:         'negative',  // Angstgegner — BG.angstgegner Sätze in Folge gegen denselben Gegner verloren
};


// Die Würden markieren hier ausschließlich saisonweise News: jeder neue
// Titel soll eine neue Karte auslösen, während andere Auszeichnungen nur an
// festen Marken melden. Für Prestige zählt unabhängig davon jede positive
// Auszeichnung nach ihrer Seltenheitsklasse und Anzahl [§13.8].
//
// `untouchable` (drei Saisons in Folge Top-3) steht bewusst nicht hier: sie
// zählt Saisons, aber überlappend — die vierte Saison in Folge wäre eine
// zweite Auszeichnung für dasselbe.
const BADGE_WUERDE = new Set([
  'champion', 'team_of_season', 'vice_champion',
  'climber_100', 'dominator_400', 'dynasty_600',
  'award_collector', 'mr_perfect',
]);

// Die Namen der Klassen auf Deutsch, wie in den Stories (`_newsRarityLabel`):
// in der Detailansicht einer Auszeichnung stand „RARE", im Blatt darunter
// „Selten" für dieselbe Klasse; die Oberfläche spricht Deutsch.
const RARITY_META = {
  legendary: {label:'Legendär',   color:'var(--gold)',   total:10},
  rare:      {label:'Selten',     color:'var(--purple)', total:14},
  common:    {label:'Gewöhnlich', color:'var(--acid)',   total:18},
  negative:  {label:'Schande',   color:'var(--red)',    total:8},
};
const RARITY_ORDER = ['legendary','rare','common','negative'];

// Die ersten fünf Reihen des Spielerprofils sind die goldene Vitrine. Ihre
// Reihenfolge folgt der sportlichen Wertigkeit, nicht dem Zeitpunkt, zu dem
// eine Definition einmal in BADGES ergänzt wurde. Danach bleibt die
// Katalogreihenfolge stabil. Ein eigener Anzeige-Schlüssel verhindert, dass
// die Berechnung oder bestehende Badge-IDs dafür umgebaut werden müssen.
const BADGE_PROFIL_ORDER = [
  'dynasty_600', 'dominator_400',
  'streak20', 'streak15',
  'champion', 'team_of_season',
  'untouchable', 'award_collector',
  'godly_streak', 'mr_perfect',
];
const _BADGE_PROFIL_RANG = new Map(BADGE_PROFIL_ORDER.map((id, i) => [id, i]));
function badgeProfilRang(id){
  return _BADGE_PROFIL_RANG.has(id) ? _BADGE_PROFIL_RANG.get(id) : BADGE_PROFIL_ORDER.length + BADGES.findIndex(b => b.id === id);
}

// Liefert die Rarity eines Badges (Default: common falls jemand neu hinzukommt
// und vergisst BADGE_RARITY zu erweitern — verhindert undefined-Bugs).
function rarityOf(badgeId){ return BADGE_RARITY[badgeId] || 'common'; }

// ─── §7.3 Count-Funktionen für die neuen Badges ──────────────────────
// Höchststand je Saison und Spieler: {sid → {pid → Elo}}. Leitet sich aus dem
// vorhandenen Sim-Verlauf ab (eloAfter je Match) — keine zweite Rechenquelle,
// und weil die Elo bei jedem Monatswechsel zurückgesetzt wird, ist der
// Höchststand innerhalb einer Saison genau das, was „400 Elo in einer Saison
// erreicht" meint. Memoisiert am selben Schlüssel wie der Sim.
const _seasonPeakSubsetMemo = new WeakMap();
function seasonPeakElos(matchSubset){
  const quelle = Array.isArray(matchSubset) ? matchSubset : matches;
  const hit = quelle !== matches ? _seasonPeakSubsetMemo.get(quelle) : null;
  if(hit && hit.version === _cache.version && hit.liga === matches) return hit.wert;
  const key='speak_'+matches.length+'_'+_cache.version;
  if(quelle === matches && _cache._seasonPeakKey===key) return _cache._seasonPeak;
  const hist = quelle === matches
    ? getHistoryByMatchId()
    : new Map((getSimForMatches(quelle).history || []).map(h => [h.matchId, h]));
  const out={};
  quelle.forEach(m=>{
    const h=hist.get(m.id);
    if(!h||!h.eloAfter) return;
    const sid=(seasonOf(m.created_at)||{}).id;
    if(!sid) return;
    const s=out[sid]||(out[sid]={});
    [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
      if(!id) return;
      const e=h.eloAfter[id];
      if(e===undefined) return;
      if(s[id]===undefined||e>s[id]) s[id]=e;
    });
  });
  if(quelle === matches){ _cache._seasonPeakKey=key; _cache._seasonPeak=out; }
  else _seasonPeakSubsetMemo.set(quelle, {version:_cache.version, liga:matches, wert:out});
  return out;
}

// In wie vielen Saisons hat der Spieler die Marke erreicht? Einmal pro Saison —
// wer innerhalb einer Saison unter die Marke fällt und wieder darüber klettert,
// zählt trotzdem nur einmal.
function countSeasonsAtElo(id, mark, matchSubset){
  try {
    const sp=seasonPeakElos(matchSubset);
    let n=0;
    Object.keys(sp).forEach(sid=>{ if((sp[sid][id]??-Infinity)>=mark) n++; });
    return n;
  } catch(e){ return 0; }
}

// Anzahl abgeschlossener Saisons, in denen der Spieler Meister wurde.
// Quelle ist seasonChampion — dieselbe wie Krone, Titelband und Saison-Tafel,
// damit die Auszeichnung dem Zeichen nie widerspricht.
function countChampion(id, bisMs){
  try {
    const cur = currentSeason().id;
    const stand = Number.isFinite(bisMs) ? bisMs : Infinity;
    let n = 0;
    (allPastSeasons() || []).forEach(sid => {
      if(sid === cur || seasonEnd(sid).getTime() > stand) return;
      if(seasonChampion(sid) === id) n++;
    });
    return n;
  } catch(e){ return 0; }
}

// Das beste Duo einer Saison: höchster gemeinsamer Elo-Zuwachs, mindestens
// zwei gemeinsame Spiele — dieselbe Regel, nach der die Saison archiviert
// wird [§4.1b]. Die archivierte Zeile hat Vorrang, damit ein abgeschlossener
// Monat sein Duo behält, auch wenn sich die Rechnung später ändert; ohne sie
// wird es aus dem Sim abgeleitet.
function seasonTeamOf(sid){
  // Das beste Duo einer Saison hängt an der Saison, nicht am Spieler. Gefragt
  // wurde es aber aus einem Badge-Zähler heraus — also je Spieler neu, und
  // jedes Mal mit einem vollen Durchlauf durch die Partien des Monats.
  // Gemessen war das der teuerste Posten im Badge-Durchlauf.
  const key = 'teamOf_' + sid + '_' + matches.length + '_' + _cache.version;
  if(!_cache._seasonTeam) _cache._seasonTeam = {};
  if(key in _cache._seasonTeam) return _cache._seasonTeam[key];
  const wert = _seasonTeamOfBerechnet(sid);
  _topfDeckel(_cache._seasonTeam, 60);
  _cache._seasonTeam[key] = wert;
  return wert;
}
function _seasonTeamOfBerechnet(sid){
  const row = (seasons || []).find(s => s.id === sid);
  if(row && row.team_p1 && row.team_p2) return [row.team_p1, row.team_p2];
  try {
    const gSim = getGlobalSim();
    const map = (gSim.seasonTeamElo || {})[sid] || {};
    const spiele = {};
    matchesInSeason(sid).forEach(m => {
      [[m.a1,m.a2],[m.b1,m.b2]].forEach(([x,y]) => {
        if(!x || !y) return;
        const k = paarKey(x, y);
        spiele[k] = (spiele[k] || 0) + 1;
      });
    });
    const best = Object.entries(map).filter(([k,v]) => v > 0 && (spiele[k]||0) >= 2)
      .sort((a,b) => b[1] - a[1])[0];
    return best ? best[0].split('|') : null;
  } catch(e){ return null; }
}

// In wie vielen abgeschlossenen Saisons war der Spieler Teil des besten Duos?
function countTeamOfSeason(id, bisMs){
  try {
    const cur = currentSeason().id;
    const stand = Number.isFinite(bisMs) ? bisMs : Infinity;
    let n = 0;
    (allPastSeasons() || []).forEach(sid => {
      if(sid === cur || seasonEnd(sid).getTime() > stand) return;
      const t = seasonTeamOf(sid);
      if(t && (t[0] === id || t[1] === id)) n++;
    });
    return n;
  } catch(e){ return 0; }
}

// Anzahl abgeschlossener Saisons, in denen der Spieler auf Platz 2 endete.
// Nutzt die archivierten seasons (top_elo enthält die Top-3 als JSON-Array).
function countViceChampion(id, bisMs){
  if(!seasons||!seasons.length) return 0;
  const curId=currentSeason().id;
  const stand=Number.isFinite(bisMs) ? bisMs : Infinity;
  let c=0;
  seasons.forEach(s=>{
    if(s.id===curId || seasonEnd(s.id).getTime() > stand) return; // laufende/zukünftige Saison zählt nicht
    let top=s.top_elo;
    if(typeof top==='string'){ try{ top=JSON.parse(top); }catch(e){ top=[]; } }
    if(Array.isArray(top) && top[1] && top[1].id===id) c++;
  });
  return c;
}

// Tage, an denen der Spieler beim chronologisch ersten Match des Tages
// dabei war und es gewonnen hat. Max. 1 pro Tag (durch die Logik garantiert).
function countEarlyBirdDays(id,ms){
  // Nur an Tagen, an denen jemand ueberhaupt gespielt hat, kann er der Erste
  // gewesen sein. Vorher gruppierte jeder Spieler alle Partien nach Tag neu;
  // die Gruppierung haengt aber am Match-Array, nicht am Spieler, und liegt
  // als `matchesByDay` schon vor.
  const tage=matchesByDay(ms);
  const meine=matchesOfPlayer(id,ms);
  const gesehen=Object.create(null);
  let c=0;
  for(let i=0;i<meine.length;i++){
    const day=mdayKey(meine[i]);
    if(gesehen[day]) continue;
    gesehen[day]=true;
    const amTag=tage[day]||[];
    let erste=amTag[0];
    for(let j=1;j<amTag.length;j++) if(mts(amTag[j])<mts(erste)) erste=amTag[j];
    if(erste&&matchOf(id,erste)&&won(id,erste)) c++;
  }
  return c;
}

// Wie oft n gewonnene Tiebreaks in Folge erreicht wurden. Gezählt wird je
// Tiebreak, über die Partien hinweg; Sätze ohne Tiebreak ändern die Serie
// nicht, nur ein verlorener Tiebreak bricht sie. Nach dem Erreichen beginnt
// die Serie neu (wie countStreakOccurrences).
function countNailBiterStreaks(id,ms,n){
  let cur=0,count=0;
  matchesOfPlayer(id,ms).forEach(m=>{
    bgTiebreaks(id,m).forEach(sieg=>{
      if(sieg){ cur++; if(cur>=n){count++;cur=0;} }
      else cur=0;
    });
  });
  return count;
}

// Hilfsfunktion: Badge → SVG-Icon-HTML (mit Fallback auf Emoji)
function badgeIc(b, size){
  size = size || 'inherit';
  if(!b) return '';
  const key = b.ic || null;
  if(key && icPfad(key)) {
    return `<span class="ic svg-ic" style="font-size:${size}"><svg viewBox="0 0 24 24">${icPfad(key)}</svg></span>`;
  }
  return '';
}

// Badge-Hilfsfunktionen
function matchOf(id,m){return [m.a1,m.a2,m.b1,m.b2].includes(id);}
function won(id,m){const onA=(id===m.a1||id===m.a2);return (onA&&m.winner==='A')||(!onA&&m.winner==='B');}
function myExp(id,m){const onA=(id===m.a1||id===m.a2);return onA?(m.exp_a??0.5):(1-(m.exp_a??0.5));}
// Die Partien eines Spielers, in ihrer Reihenfolge. Zwanzig Zähler bauten
// dieselbe Liste jedes Mal neu: ein Filter über ALLE Partien der Liga und ein
// Sort obendrauf, je Zähler und je Spieler. Gemessen war das der größte Posten
// im Badge-Durchlauf, der nach jeder eingetragenen Partie neu läuft.
//
// Gemerkt wird an der IDENTITÄT des Match-Arrays — dieselbe WeakMap-Regel wie
// bei `_winnerCountsOf`. Ein Aufruf mit einem Saison-Ausschnitt bekommt damit
// nicht die Liste der ganzen Liga, und ein frisches Array nach `loadAll`
// verwirft den Memo von selbst.
//
// Die zurückgegebene Liste gehört dem Cache: wer sie sortiert oder umdreht,
// verdreht sie für alle. Gelesen wird sie überall, verändert nirgends.
const _tagMsMemo = new WeakMap();
// Die Partien eines Tages. Drei Stellen gruppierten dafür ALLE Partien neu,
// zwei davon je Spieler — dieselbe Schleife zwölfmal für dieselbe Antwort.
function matchesByDay(ms){
  let map = _tagMsMemo.get(ms);
  if(map) return map;
  map = Object.create(null);
  for(let i = 0; i < ms.length; i++){
    const d = mdayKey(ms[i]);
    (map[d] || (map[d] = [])).push(ms[i]);
  }
  _tagMsMemo.set(ms, map);
  return map;
}
const _spielerMsMemo = new WeakMap();
function matchesOfPlayer(id, ms){
  let slot = _spielerMsMemo.get(ms);
  if(!slot){ slot = Object.create(null); _spielerMsMemo.set(ms, slot); }
  let liste = slot[id];
  if(!liste){
    liste = ms.filter(m => matchOf(id, m)).sort((a, b) => mts(a) - mts(b));
    slot[id] = liste;
  }
  return liste;
}
function countGames(id,ms){return matchesOfPlayer(id,ms).length;}
function countWins(id,ms){return matchesOfPlayer(id,ms).filter(m=>won(id,m)).length;}

// v9.15 PERF: countPeriodWins/countDayWins wurden PRO SPIELER aufgerufen,
// rechneten aber jedes Mal die komplette spielerUNabhängige Perioden-Sieger-
// Aggregation neu (O(Spieler × Matches)). Jetzt: EINE Aggregation pro
// Match-Array — als {pid → Titel-Anzahl}-Map an der Array-IDENTITÄT memoisiert
// (WeakMap). Die Aufrufer mappen über dasselbe gecachte Array → ab dem zweiten
// Spieler nur noch ein Lookup. Frische Arrays (nach invalidateCache/loadAll)
// invalidieren die Memo automatisch, curKey im Slot-Key fängt Tages-/Wochen-
// Rollover innerhalb einer Session ab. Logik & Tiebreaks unverändert.
const _winnerCountsMemo = new WeakMap(); // msArray → { '<kind>_<curKey>': {pid: count} }
// Roh-Ergebnis: {Perioden-Key → Sieger-ID}. Die Zählung (_winnerCountsOf)
// leitet sich daraus ab, und der Avatar-Ring (§13.7) fragt hier gezielt nach
// dem Sieger EINER Periode — deshalb steht die Sieger-Ermittlung genau einmal
// im Code und kann zwischen Zählung und Ring nicht auseinanderlaufen.
// Wer einen Zeitraum gewinnt, an EINER Stelle. Die Regel stand viermal im
// Code — hier, im Wochen- und im Tagesrückblick und im Feed —, und eine
// Fassung verglich die Quote ohne die Toleranz der anderen.
//   'tag'    mindestens 3 Siege; mehr Siege, dann mehr Elo am Tag
//   'woche'  mindestens 5 Siege; höchste Quote (bis 0,001 gilt gleich),
//            dann mehr Siege, dann mehr Elo
//   'monat'  wie die Woche, mindestens 10 Siege
// Liefert jeden, der die Mindestzahl erreicht, in dieser Reihenfolge, als
// {id, wins, losses, eloDelta, wr}. Bei Gleichstand in allem bleibt die
// Reihenfolge der ersten Partie, in der jemand auftaucht. `nurSichtbar`
// lässt ausgeblendete Spieler weg; der Zähler der Auszeichnung fragt ohne.
function _periodeRangliste(ms, regel, nurSichtbar){
  const ps={};
  ms.forEach(m=>[m.a1,m.a2,m.b1,m.b2].forEach(pid=>{
    const s=ps[pid]||(ps[pid]={id:pid,wins:0,losses:0,eloDelta:0,wr:0});
    const onA=(pid===m.a1||pid===m.a2);
    if((onA&&m.winner==='A')||(!onA&&m.winner==='B')) s.wins++; else s.losses++;
    s.eloDelta += (m.deltas && m.deltas[pid]) || 0;
  }));
  const minW = PERIODE_MIN_SIEGE[regel];
  const pm = nurSichtbar ? pmap() : null;
  return Object.values(ps)
    .filter(s=>s.wins>=minW && (!pm || sichtbar(pm[s.id])))
    .map(s=>{ s.wr=s.wins/((s.wins+s.losses)||1); return s; })
    .sort(regel==='tag'
      ? (a,b)=> b.wins!==a.wins ? b.wins-a.wins : b.eloDelta-a.eloDelta
      : (a,b)=> Math.abs(a.wr-b.wr)>0.001 ? b.wr-a.wr
             : a.wins!==b.wins ? b.wins-a.wins : b.eloDelta-a.eloDelta);
}

// Welcher Tag, welche Woche, welcher Monat zum Zeitpunkt `bisMs` noch offen
// ist — ohne ihn die Uhr. Der laufende Tag ist offen, bis er zu ist
// (`_tagZu`): der Spieler des Tages zählte um 14 Uhr schon im Profil und im
// Prestige, während seine Karte erst um 23:59 erscheint und am Abend ein
// anderer vorbeiziehen kann. Gefragt wurde dabei immer die Uhr, auch für
// einen Schnitt in der Vergangenheit: der Stand eine Millisekunde vor dem
// Wochenschluss trug den Spieler der Woche schon, sobald die Woche heute
// vorbei war, und wer durch ihn aufstieg, stand in keinem Vergleich.
function _periodeOffen(kind, bisMs){
  const t = Number.isFinite(bisMs) ? new Date(bisMs) : new Date();
  if(kind==='week')  return _wochenKey(t.getTime());
  if(kind==='month') return t.getFullYear()+'-'+t.getMonth();
  const tag=t.toISOString().slice(0,10);
  return _tagZu(tag, t.getTime()) ? '' : tag;
}
function _periodWinnerMap(allMs, kind, bisMs){
  const curKey=_periodeOffen(kind, bisMs);
  let slot=_winnerCountsMemo.get(allMs);
  if(!slot){ slot={}; _winnerCountsMemo.set(allMs, slot); }
  const slotKey='win_'+kind+'_'+curKey;
  if(slot[slotKey]) return slot[slotKey];

  // Buckets bilden (Woche / Monat / Tag). Ein Zeitraum kennt keinen
  // Ruhestand [§C40]: wer darin gespielt hat, kann ihn gewinnen.
  const buckets={};
  allMs.forEach(m=>{
    let key;
    if(kind==='week'){
      key=_wochenKey(m.created_at);
    } else if(kind==='month'){
      const d=new Date(m.created_at);
      key=d.getFullYear()+'-'+d.getMonth();
    } else {
      key=mdayKey(m);
    }
    if(!buckets[key])buckets[key]=[];
    buckets[key].push(m);
  });

  // Nur der Erste bekommt die Auszeichnung — derselbe, den der Rückblick
  // als Haupt-Sieger zeigt (`_periodeRangliste`).
  const regel={day:'tag', week:'woche', month:'monat'}[kind];
  const winners={};
  Object.entries(buckets).forEach(([key,ms])=>{
    if(key===curKey)return; // laufender Tag, laufende Woche, laufender Monat: noch offen
    const erster=_periodeRangliste(ms, regel, false)[0];
    if(erster) winners[key]=erster.id;
  });
  slot[slotKey]=winners;
  return winners;
}
// Zählt, wie oft jeder Spieler eine Periode gewonnen hat.
function _winnerCountsOf(allMs, kind, bisMs){
  const winners=_periodWinnerMap(allMs, kind, bisMs);
  let slot=_winnerCountsMemo.get(allMs);
  if(!slot){ slot={}; _winnerCountsMemo.set(allMs, slot); }
  // Der offene Zeitraum gehört in den Schlüssel, nicht die Zahl der Sieger:
  // zwei Schnitte, die je einen anderen Zeitraum offen lassen, haben gleich
  // viele Sieger und trotzdem andere.
  const slotKey='cnt_'+kind+'_'+_periodeOffen(kind, bisMs);
  if(slot[slotKey]) return slot[slotKey];
  const counts={};
  Object.values(winners).forEach(pid=>{ counts[pid]=(counts[pid]||0)+1; });
  slot[slotKey]=counts;
  return counts;
}
// Zählt in wie vielen abgeschlossenen Wochen/Monaten der Spieler die meisten Siege hatte
function countPeriodWins(id,allMs,periodType,bisMs){
  return _winnerCountsOf(allMs, periodType==='week'?'week':'month', bisMs)[id]||0;
}
// Player of the Day: zählt Tage an denen dieser Spieler den POTD-Titel
// erringen würde (analog zur Recap-Pop-Up-Logik in showPotdRecap).
// ⚠ Tiebreak-Konsistenz: Bei gleichem Maximum von Tagessiegen gewinnt
// das höhere Elo-Delta des Tages — exakt wie das Pop-Up sortiert. Nur DIESER
// Spieler bekommt das Badge (vorher: alle Spieler mit max wins → mehrfach).
function countDayWins(id,allMs,bisMs){
  return _winnerCountsOf(allMs,'day',bisMs)[id]||0;
}

// ─── Krimi-Reihe: BG.krimi knappe Partien in Folge (Sieg ODER Niederlage) ───
// Knapp nach §1.3. Sobald erreicht, beginnt die Serie neu → mehrfach erreichbar.
function countKrimiStreaks(id,ms){
  const ordered=matchesOfPlayer(id,ms);
  let cur=0,count=0;
  ordered.forEach(m=>{
    if(bgKnapp(m)){
      cur++;
      if(cur>=BG.krimi){count++; cur=0;}
    } else {
      cur=0;
    }
  });
  return count;
}

// ─── Klares Ding: deutlicher Sieg nach §1.3 ───
function countClearWins(id,ms){
  return matchesOfPlayer(id,ms).filter(m=>bgKlar(id,m)).length;
}

// ─── Wiederholungstäter: BG.wiederholung Siege in Folge, identisches Ergebnis ───
// Niederlagen oder Siege mit anderem Ergebnis brechen die Serie. Verglichen
// wird Satz für Satz aus Sicht des Siegers („6:4 6:3").
function countRepeatScoreStreaks(id,ms){
  const ordered=matchesOfPlayer(id,ms);
  let lastScore=null,cur=0,count=0;
  ordered.forEach(m=>{
    if(!won(id,m)){cur=0; lastScore=null; return;}
    const score=standFuer(m);
    if(score===lastScore){
      cur++;
      if(cur>=BG.wiederholung){count++; cur=0; lastScore=null;}
    } else {
      cur=1; lastScore=score;
    }
  });
  return count;
}

// ─── Comeback-Tag: Tag mit Niederlage gestartet, mit Sieg beendet, min. 3 Matches ───
// Beendet ist ein Tag erst, wenn er zu ist (`_tagZu`).
function countComebackDays(id,ms,bis){
  const mine=matchesOfPlayer(id,ms);
  const byDay={};
  mine.forEach(m=>{
    const d=mdayKey(m);
    if(!byDay[d]) byDay[d]=[];
    byDay[d].push(m);
  });
  let count=0;
  Object.entries(byDay).forEach(([k,dayMs])=>{
    if(dayMs.length<BG.tag || !_tagZu(k,bis)) return;
    const first=dayMs[0], last=dayMs[dayMs.length-1];
    if(!won(id,first) && won(id,last)) count++;
  });
  return count;
}

// ─── Revanchist: nach Niederlage gegen Team X im direkt folgenden Match Sieg gegen X ───
// Strikt: das unmittelbar nächste Match muss gegen das gleiche Gegner-Team sein.
// Gezählt wird Match gegen Match, nicht Satz gegen Satz: je Satz feierte
// jedes 1:1 eine Revanche, und die Auszeichnung fiel fast in jedem Match.
function countRevenge(id,ms){
  const mine=matchesOfPlayer(id,ms).filter(m=>begegnungGewonnen(m,id)!==null);
  const won=(pid,m)=>begegnungGewonnen(m,pid)===true;
  const oppKey=(m)=>{
    const onA=(id===m.a1||id===m.a2);
    return (onA?[m.b1,m.b2]:[m.a1,m.a2]).slice().sort().join('|');
  };
  let count=0;
  for(let i=0;i<mine.length-1;i++){
    if(won(id,mine[i])) continue; // M_i muss Niederlage sein
    if(!won(id,mine[i+1])) continue; // M_{i+1} muss Sieg sein
    if(oppKey(mine[i])===oppKey(mine[i+1])) count++;
  }
  return count;
}

// ─── Königsklasse: Sieg gegen mind. 1 Gegner aus den Top 3 der Saison-Endrangliste ───

// ─── Pflichtaufgabe: Sieg gegen mind. 1 Gegner aus den Bottom 3 der Saison-Endrangliste ───

// ─── Thronfäller: Sieg gegen den Top-1 der laufenden Saison-Rangliste ───
// Top-1 = der Spieler mit dem höchsten Saison-Elo zum Zeitpunkt VOR dem Match
// (aus getRankSnapshots, das den live-Stand pro Match aus den Sim-Deltas
// aufbaut). Pflicht: Top-1 darf nicht der Spieler selbst sein und muss im
// gegnerischen Team stehen. Hidden-Spieler werden NICHT ausgeschlossen,
// weil der Match selbst stattfand — die Rangliste-Logik basiert auf realem
// Elo-Stand, nicht auf Visibility.
function countKingslayer(id,ms){
  const snaps = getRankSnapshots();
  const mine = matchesOfPlayer(id, ms);
  let count = 0;
  for(let i=0; i<mine.length; i++){
    const m = mine[i];
    if(!won(id,m)) continue;
    const snap = snaps[m.id]; if(!snap) continue;
    // Wer war Top-1 in der Saison-Rangliste VOR dem Match? Die Antwort steht
    // im Schnappschuss — dort ist die Tabelle ohnehin schon sortiert.
    const top1 = snap.preTop1;
    if(!top1 || top1 === id) continue;
    // War Top-1 ein direkter Gegner?
    const onA = (id===m.a1||id===m.a2);
    const opps = onA ? [m.b1,m.b2] : [m.a1,m.a2];
    if(opps.includes(top1)) count++;
  }
  return count;
}

// ─── Überholmanöver: Sieg gegen einen Spieler, der dadurch in der ───
// ─── Saison-Rangliste überholt wurde ─────────────────────────────────
// Pro überholtem Gegner zählt 1× (also wenn man im 2v2 beide Gegner
// überholt, zählt das als 2 Treffer für dieses Match).
// Bedingungen pro Gegner Y:
//   • X war vor Match unter Y in der Rangliste (rank_X > rank_Y)
//   • X ist nach Match über Y (rank_X < rank_Y)
//   • → +1 für X
function countOvertake(id,ms){
  const snaps = getRankSnapshots();
  const mine = matchesOfPlayer(id, ms);
  let count = 0;
  for(let i=0; i<mine.length; i++){
    const m = mine[i];
    if(!won(id,m)) continue;
    const snap = snaps[m.id]; if(!snap) continue;
    const preX = snap.preRank[id], postX = snap.postRank[id];
    if(!preX || !postX) continue; // X muss schon einen Rang gehabt haben
    const onA = (id===m.a1||id===m.a2);
    const opps = onA ? [m.b1,m.b2] : [m.a1,m.a2];
    for(const opId of opps){
      const preY = snap.preRank[opId], postY = snap.postRank[opId];
      if(!preY || !postY) continue;
      // X war unter Y (höherer Rangzahl = schlechter), jetzt drüber
      if(preX > preY && postX < postY) count++;
    }
  }
  return count;
}

// ─── Award-Sammler: in einer Saison min. 5 POTD UND min. 2 POTW Auszeichnungen ───
// Pro qualifizierter Saison vergeben (mehrfach über Karriere).
function countAwardCollector(id, matchSubset, bisMs){
  const quelle = Array.isArray(matchSubset) ? matchSubset : matches;
  // Stabile Saison-Arrays fuer alle Spieler: die Perioden-Sieger haengen
  // per WeakMap an deren Identitaet und brauchen je Monat nur einen Lauf.
  const bySeason = getMatchesBySeason(quelle);
  let count=0;
  Object.values(bySeason).forEach(seasonMs=>{
    const potd=countDayWins(id,seasonMs,bisMs);
    if(potd<PERIODE_SAMMLER.tag) return; // billiger Vorab-Filter
    const potw=countPeriodWins(id,seasonMs,'week',bisMs);
    if(potw>=PERIODE_SAMMLER.woche) count++;
  });
  return count;
}

// ═══ LEGENDARY-BADGES v7 ════════════════════════════════════════════════════
// Saison-/Karriere-aggregierte Counter. Werden in computeBadges() pro Profil
// lazy berechnet — kein Match-Trigger, weil sie nicht an einen Einzelmatch
// gebunden sind (analog award_collector / potd / potw).
// ═══════════════════════════════════════════════════════════════════════════

// Untouchable: 3 Saisons IN FOLGE Top-3 abgeschlossen.
// "In Folge" bezieht sich auf chronologische Reihenfolge ABGESCHLOSSENER
// Saisons. Die laufende Saison wird ausgeschlossen. Sids haben das Format
// "YYYY-MM" und sind damit lexikographisch chronologisch sortierbar.
// Counter steigt um 1 pro überlappungsfreier Drei-Saisons-Strecke (also bei
// 6 Saisons in Folge in Top-3 → counter = 2). Implementation analog zu
// countStreakOccurrences (separate Serien).
function countUntouchable(id, bisMs){
  const rk = getSeasonRankingsCache();
  const curId = currentSeason().id;
  const stand = Number.isFinite(bisMs) ? bisMs : Infinity;
  const sids = Object.keys(rk).filter(s => s !== curId && seasonEnd(s).getTime() <= stand).sort();
  let cur = 0, count = 0;
  for(const sid of sids){
    if(rk[sid] && rk[sid].top3 && rk[sid].top3.has(id)){
      cur++;
      if(cur >= 3){ count++; cur = 0; }  // separate Drei-Strecken
    } else {
      cur = 0;
    }
  }
  return count;
}

// Bagel-Bäcker (id mr_perfect): BG.bagelSaison gewonnene Bagel-Sätze (6:0)
// in EINER Saison. Gezählt werden Sätze, nicht Partien: ein 6:0 6:0 sind
// zwei. Auch die laufende Saison zählt (wie der Auslöser in §7.4).
function countMrPerfect(id, matchSubset){
  return _bagelSaisons(id, matchSubset, 'bagelsFor');
}
function _bagelSaisons(id, matchSubset, feld){
  const quelle = Array.isArray(matchSubset) ? matchSubset : matches;
  const proSaison = Object.create(null);
  matchesOfPlayer(id, quelle).forEach(m => {
    const n = bgBagels(id, m)[feld];
    if(!n) return;
    const sid = (seasonOf(m.created_at)||{}).id;
    if(sid) proSaison[sid] = (proSaison[sid]||0) + n;
  });
  let count = 0;
  for(const sid in proSaison) if(proSaison[sid] >= BG.bagelSaison) count++;
  return count;
}

// Allwetter: an mind. 5 verschiedenen Wochentagen je mind. 1× POTD geworden.
// Karriere-Stat — sobald 5 erreicht, bleibt das Badge dauerhaft erreicht.
// Counter ist deshalb max. 1 (entweder erreicht oder nicht).
function countAllwetter(id, matchSubset, bisMs){
  return _allwetterTage(id, matchSubset, bisMs).size >= 4 ? 1 : 0;
}
// Die Wochentage, an denen ein Spieler Player of the Day war. Auszeichnung
// und Fortschritt im Popover lesen beide hier: das Popover zählte den Tag
// selbst nach und ohne den Tiebreak über die Elo, und bei Gleichstand an
// Siegen markierte es Wochentage, die die Auszeichnung nicht zählt.
function _allwetterTage(id, matchSubset, bisMs){
  const quelle = Array.isArray(matchSubset) ? matchSubset : matches;
  // „Player of the Day" gibt es genau einmal im Code: `_periodWinnerMap`
  // bestimmt den Sieger eines Tages, mit Tiebreak über das Elo-Delta. Hier
  // stand dieselbe Rechnung ein zweites Mal — und ohne den Tiebreak, also mit
  // einer anderen Antwort: gemessen sind 12 der 51 entschiedenen Tage
  // punktgleich, und dort trugen beide Spieler den Tag. Die Beschreibung sagt
  // „Player of the Day geworden"; dann muss es auch derselbe sein [§C27].
  // Der laufende Tag fehlt in `sieger`, bis er zu ist. Er stand hier noch
  // einmal nach der Uhr in UTC ausgeschlossen: um 23:59 zählte der Spieler
  // des Tages, sein Wochentag aber erst ab ein oder zwei Uhr nachts.
  const sieger = _periodWinnerMap(quelle, 'day', bisMs);
  const wochentage = new Set();
  for(const tag in sieger){
    if(sieger[tag] !== id) continue;
    // Der Schlüssel ist 'YYYY-MM-DD' — daraus den Wochentag, ohne Zeitzone.
    const [y, mo, d] = tag.split('-').map(Number);
    wochentage.add(new Date(y, mo - 1, d).getDay());
  }
  return wochentage;
}

// Tag der Götter: 3 aufeinanderfolgende EIGENE Spieltage als POTD gewonnen.
// "Eigene Spieltage" = Tage, an denen der Spieler beteiligt war. Tage, an
// denen die Liga ohne ihn spielte, BRECHEN die Serie NICHT — sie werden
// übersprungen. Karriere-aggregiert (separate Drei-Strecken zählen einzeln).
function countGodlyStreak(id, matchSubset, bisMs){
  const quelle = Array.isArray(matchSubset) ? matchSubset : matches;
  // Dieselbe eine Quelle wie beim Allwetter [§C27]: wer den Tag gewonnen hat,
  // sagt `_periodWinnerMap`. Gebraucht wird hier zusätzlich, an welchen Tagen
  // der Spieler überhaupt gespielt hat — Tage ohne ihn brechen die Serie nicht.
  // Der offene Tag zählt nicht mit, nach demselben Schnitt wie der Sieger.
  const sieger = _periodWinnerMap(quelle, 'day', bisMs);
  const proTag = matchesByDay(quelle);
  const offen = _periodeOffen('day', bisMs);
  const tage = Object.keys(proTag).filter(d => d !== offen).sort();
  let cur = 0, count = 0;
  for(const tag of tage){
    const dayMs = proTag[tag];
    if(!dayMs.some(m => matchOf(id, m))) continue;   // Tag ohne ihn → kein Reset
    if(sieger[tag] === id){
      cur++;
      if(cur >= 3){ count++; cur = 0; }              // separate Drei-Strecken zählen einzeln
    } else {
      cur = 0;
    }
  }
  return count;
}

// Die Länge allein; die Rechnung steht einmal, in longestPlayerStreakInfo.
// `longestStreaks` im Awards-Tab bleibt eine eigene Rechnung über alle
// Spieler zugleich, und tests/tafel hält beide aneinander [§C27].
function longestPlayerStreak(id,ms){
  return longestPlayerStreakInfo(id,ms).best;
}
// Erweiterte Variante: liefert auch das Datum des Match, das die längste
// Siegesserie abgeschlossen hat (also den Peak-Match). Bei mehreren Serien
// mit demselben Maximum wird die NEUESTE genommen — analog zum Verhalten
// im Awards-Tab (jüngere Leistungen sind salient).
function longestPlayerStreakInfo(id,ms){
  const ordered=matchesOfPlayer(id,ms);
  let cur=0,best=0,peakMatch=null;
  ordered.forEach(m=>{
    if(won(id,m)){
      cur++;
      if(cur>=best){ best=cur; peakMatch=m; } // ≥ → neueste gleichlange Serie gewinnt
    } else {
      cur=0;
    }
  });
  return {best, peakDate: peakMatch ? peakMatch.created_at : null};
}
// Zählt wie oft eine Siegesserie der Länge >= n erreicht wurde (separate Serien)
function countStreakOccurrences(id,ms,n){
  const ordered=matchesOfPlayer(id,ms);
  let cur=0,count=0,awarded=false;
  ordered.forEach(m=>{
    if(won(id,m)){cur++;if(cur>=n&&!awarded){count++;awarded=true;}}
    else {cur=0;awarded=false;}
  });
  return count;
}
// Zählt wie oft eine Niederlagenserie >= n erreicht wurde
function countLossStreakOccurrences(id,ms,n){
  const ordered=matchesOfPlayer(id,ms);
  let cur=0,count=0,awarded=false;
  ordered.forEach(m=>{if(!won(id,m)){cur++;if(cur>=n&&!awarded){count++;awarded=true;}}else{cur=0;awarded=false;}});
  return count;
}
// Carry: Sieg wenn dein Mate der schwächste der 4 Spieler im Match war
// Nutzt globalen Elo-History-Cache für historische Elo-Stände
function countCarries(id,ms){
  const snapMap=getSnapMap();
  return matchesOfPlayer(id,ms).filter(m=>{
    if(!won(id,m))return false;
    const snap=snapMap[m.id]; if(!snap)return false;
    const allFour=[m.a1,m.a2,m.b1,m.b2];
    if(allFour.some(x=>snap[x]===undefined))return false;
    const weakest=allFour.reduce((a,b)=>(snap[a] ?? cfg.start_elo)<=(snap[b] ?? cfg.start_elo)?a:b);
    const onA=(id===m.a1||id===m.a2);
    const mate=onA?(id===m.a1?m.a2:m.a1):(id===m.b1?m.b2:m.b1);
    return mate===weakest;
  }).length;
}
// Ein Tag ist zu, wenn seine Uhr 23:59 zeigt — derselbe Augenblick, zu dem
// der Spieler des Tages erscheint [§C33]; bis dahin kann noch eine Partie
// kommen. `jetzt` ist der Stand, für den gezählt wird, sonst die Uhr.
function _tagZu(dk, jetzt){
  const ende = new Date(dk + 'T00:00:00'); ende.setHours(23, 59, 0, 0);
  return (Number.isFinite(jetzt) ? jetzt : Date.now()) >= ende.getTime();
}
// Zählt Tage an denen der Spieler min. 3 Spiele hatte und keines verloren hat
// — nur Tage, die zu sind (`_tagZu`): „Ganzer Tag ohne Niederlage" stand nach
// dem dritten Sieg schon im Profil, und eine Niederlage am Abend nahm sie
// wieder weg.
function countUnbeatableDays(id,ms,bis){
  const mine=matchesOfPlayer(id,ms);
  const byDay={};
  mine.forEach(m=>{const d=mdayKey(m);
    if(!byDay[d])byDay[d]={games:0,losses:0}; byDay[d].games++; if(!won(id,m))byDay[d].losses++;});
  return Object.entries(byDay).filter(([k,d])=>d.games>=BG.tag&&d.losses===0&&_tagZu(k,bis)).length;
}
// ─── Pflichterfüller: Sieg gegen mind. 1 Gegner aus Bottom-2 der ─────
// ─── Saison-Rangliste zum Zeitpunkt des Matches ──────────────────────
// Unterschied zur bestehenden countBottomThreeWins-Funktion (Saison-END-
// Rangliste): hier wird der live-Stand der Saison-Rangliste VOR dem Match
// verwendet (getRankSnapshots → preRank). Bottom-2 = die letzten zwei Plätze.
// Erst sinnvoll ab 5 Spielern in der Rangliste — sonst überlappt Top und
// Bottom (und der Award würde trivial fallen). Hidden-Spieler werden NICHT
// ausgeschlossen, weil das Match stattfand und der Rangzeitpunkt real ist.
function countBottomTwoMatchWins(id,ms){
  const snaps = getRankSnapshots();
  const meine = matchesOfPlayer(id,ms);
  let count = 0;
  for(let i=0; i<meine.length; i++){
    const m = meine[i];
    if(!won(id,m)) continue;
    const snap = snaps[m.id]; if(!snap || !snap.preRank) continue;
    const ranks = snap.preRank;
    const N = Object.keys(ranks).length;
    if(N < 5) continue; // Bottom-2 ist erst ab 5 Spielern in der Rangliste sinnvoll
    const onA = (id===m.a1||id===m.a2);
    const opps = onA ? [m.b1,m.b2] : [m.a1,m.a2];
    // Mind. ein Gegner mit Rang im Bottom-2 (rank >= N-1)
    const hit = opps.some(oId => ranks[oId] && ranks[oId] >= N-1);
    if(hit) count++;
  }
  return count;
}

// ─── Serienbrecher: Sieg, der eine laufende Siegesserie (≥4) eines ───
// ─── Gegners gestoppt hat ────────────────────────────────────────────
// Nutzt getStreakSnapshots, das pro Match den live-Streak-Stand aller
// 4 Spieler liefert. Ein Sieg zählt pro Match nur EINMAL — auch wenn beide
// Gegner gerade eine 4er+ Serie laufen hatten (kommt praktisch kaum vor,
// vermeidet aber doppelte Belohnung).
function countStreakBreaker(id,ms){
  const snaps = getStreakSnapshots();
  const meine = matchesOfPlayer(id,ms);
  let count = 0;
  for(let i=0; i<meine.length; i++){
    const m = meine[i];
    if(!won(id,m)) continue;
    const snap = snaps[m.id]; if(!snap) continue;
    const onA = (id===m.a1||id===m.a2);
    const opps = onA ? [m.b1,m.b2] : [m.a1,m.a2];
    if(opps.some(oId => (snap[oId]||0) >= BG.serienbrecher)) count++;
  }
  return count;
}

// ─── Schwarzer Tag: Tag mit mind. 3 Spielen, alle verloren ───────────
// Gruppiert die Matches eines Spielers nach Datum (YYYY-MM-DD) und zählt,
// an wie vielen Tagen mind. 3 Matches stattfanden, die ALLE verloren wurden.
function countBlackDays(id,ms,bis){
  const byDay={}; // day → {g, l}
  const meine=matchesOfPlayer(id,ms);
  for(let i=0; i<meine.length; i++){
    const m=meine[i];
    const day=mdayKey(m);
    if(!byDay[day]) byDay[day]={g:0, l:0};
    byDay[day].g++;
    if(!won(id,m)) byDay[day].l++;
  }
  let count=0;
  for(const day in byDay){
    const d=byDay[day];
    if(d.g >= BG.tag && d.l === d.g && _tagZu(day, bis)) count++;
  }
  return count;
}

// ─── Krimi-Versager: n knappe Niederlagen in Folge ──────────────────
// Spiegel zu countLossStreakOccurrences, gefiltert auf knappe Niederlagen
// (§1.3). Ein Sieg ODER eine deutliche Niederlage bricht die Serie.
function countCloseLossStreaks(id,ms,n){
  const ordered=matchesOfPlayer(id,ms);
  let cur=0, count=0, awarded=false;
  ordered.forEach(m=>{
    const isLoss = !won(id,m);
    if(isLoss && bgKnapp(m)){
      cur++;
      if(cur>=n && !awarded){ count++; awarded=true; }
    } else {
      cur=0; awarded=false;
    }
  });
  return count;
}

// ─── Mr. Disaster: BG.bagelSaison kassierte Bagels in einer Saison ───
// Spiegel zum Bagel-Bäcker, mit derselben Zählung.
function countMrDisaster(id, matchSubset){
  return _bagelSaisons(id, matchSubset, 'bagelsAgainst');
}

// ─── Zusammenbruch: Tag mit Sieg gestartet, mit Niederlage beendet, ──
// ─── min. 3 Matches ──────────────────────────────────────────────────
// Spiegel zu countComebackDays. Strikt: erstes Match Sieg, letztes Niederlage,
// ≥3 Matches an dem Tag. Pro Tag max. 1 Eintrag (siehe Match-Trigger).
function countCrashDays(id,ms,bis){
  const mine=matchesOfPlayer(id,ms);
  const byDay={};
  mine.forEach(m=>{
    const d=mdayKey(m);
    if(!byDay[d]) byDay[d]=[];
    byDay[d].push(m);
  });
  let count=0;
  Object.entries(byDay).forEach(([k,dayMs])=>{
    if(dayMs.length<BG.tag || !_tagZu(k,bis)) return;
    const first=dayMs[0], last=dayMs[dayMs.length-1];
    if(won(id,first) && !won(id,last)) count++;
  });
  return count;
}

// ─── Angstgegner: 5× in Folge gegen denselben Gegner-SPIELER verloren ─
// Jeder Gegner wird einzeln getrackt (Mate-Wechsel egal). Bei Sieg gegen
// einen Gegner → dessen Counter wird zurückgesetzt; bei Niederlage gegen
// ihn → Counter +1. Erreicht der Counter 5 → +1 zum Gesamt-Count, danach
// muss erst ein Sieg gegen diesen Gegner kommen, bevor erneut gezählt wird.
// Konsistent zum Match-Trigger: pro Match max. 1 Eintrag, selbst wenn
// beide Gegner gleichzeitig die Schwelle erreichen (selten).
function countNemesis(id,ms){
  const mine=matchesOfPlayer(id,ms);
  const vsStreak={};  // opponentId → aktueller Niederlagen-Streak
  const fired={};     // opponentId → schon gefeuert (wartet auf Reset durch Sieg)
  let count=0;
  mine.forEach(m=>{
    const onA=(id===m.a1||id===m.a2);
    const w=(onA && m.winner==='A')||(!onA && m.winner==='B');
    const opps=onA?[m.b1,m.b2]:[m.a1,m.a2];
    if(w){
      opps.forEach(oId=>{ vsStreak[oId]=0; fired[oId]=false; });
    } else {
      let firedThisMatch=false;
      opps.forEach(oId=>{
        vsStreak[oId]=(vsStreak[oId]||0)+1;
        if(vsStreak[oId]>=BG.angstgegner && !fired[oId]){
          fired[oId]=true;
          if(!firedThisMatch){ count++; firedThisMatch=true; }
        }
      });
    }
  });
  return count;
}

function getCachedBadges(id){
  // Ein Ruheständler trägt, was er beim Karriereende trug [§C40]: ein
  // neuer Katalog liest seine Partien sonst anders als damals.
  const ruhe = imRuhestand(id) ? ruhestandAuszeichnungen(id) : null;
  if(ruhe) return ruhe;
  const key='badges_'+id+'_'+matches.length+'_'+_cache.version;
  if(!_cache._badges) _cache._badges={};
  if(_cache._badges[key]) return _cache._badges[key];
  // Mit der Version im Schluessel waechst der Topf sonst ueber jede Version mit.
  _topfDeckel(_cache._badges, 60);
  const r=computeBadges(id);
  _cache._badges[key]=r;
  return r;
}

// Berechnet alle freigeschalteten Badges für einen Spieler (mit Anzahl für multi-Badges)
function computeBadges(id, matchSubset, bisMs){
  const quelle = Array.isArray(matchSubset) ? matchSubset : matches;
  const result=[];
  BADGES.forEach(b=>{
    const c=b.count(id,quelle,bisMs);
    if(c>0) result.push({id:b.id,em:b.em,ic:b.ic,name:b.name,desc:b.desc,count:c});
  });
  return result;
}

// ─── §7.4 Wer in welcher Partie was geholt hat ────────────────────────
// Ermittelt welche Badges durch ein bestimmtes Match NEU freigeschaltet / erneut erreicht wurden
//
// Was einen ganzen Tag beschreibt — Unschlagbar, Comeback-Tag,
// Zusammenbruch, Schwarzer Tag —, wird erst vergeben, wenn der Tag zu ist
// (`_tagZu`), an der letzten Partie des Spielers an diesem Tag und mit
// `tagEnde` als Kennzeichen. „Unschlagbar" kam nach dem dritten Sieg um
// 14:26, mit Karte und Hinweis, obwohl am Abend noch eine Niederlage kommen
// konnte; Comeback-Tag und Zusammenbruch fragten nach dem „letzten" Spiel,
// bevor es das letzte war. Ein Tag geht auch ohne neue Partie zu; dann
// leert `loadAll` die Töpfe (`_tagZu` im Tagesschlüssel).
function getBadgeEarnedCache(){
  const key='badgeEarned_'+matches.length+'_'+_cache.version;
  if(_cache._badgeEarnedKey===key) return _cache._badgeEarnedMap;

  const map={};
  const ordered=[...matches].sort((a,b)=>mts(a)-mts(b));
  // Die letzte Partie jedes Spielers an jedem Tag: an ihr hängt, was den Tag
  // beschreibt.
  const letzteDesTages={};
  ordered.forEach(m=>{ const dk=mdayKey(m);
    [m.a1,m.a2,m.b1,m.b2].forEach(pid=>{ if(pid) letzteDesTages[pid+'|'+dk]=m.id; }); });
  // `fire` suchte das Badge bei jeder Vergabe mit `BADGES.find` — bei
  // fünfzig Badges und jeder Partie der Liga die meiste Zeit dieser Schleife
  // im Suchen. Die erste Fundstelle gewinnt wie bei `find`.
  const badgeVonId=new Map();
  BADGES.forEach(b=>{ if(!badgeVonId.has(b.id)) badgeVonId.set(b.id,b); });

  // Globale Sim für Carry (historische Elo-Stände vor jedem Match) — gecached
  const snapMap=getSnapMap();
  // History-Map für eloAfter-Lookup (Saison-Peak-Tracking pro Match)
  const histById=getHistoryByMatchId();
  // Rangliste-Snapshots pro Match (für Thronfäller + Überholmanöver + Pflichterfüller)
  const rankSnaps=getRankSnapshots();
  // Siegesserien-Snapshots pro Match (für Serienbrecher — Streak des Gegners VOR dem Match)
  const streakSnaps=getStreakSnapshots();
  // Tages-Tracker (global, nicht per-player): welcher Tag hatte schon sein erstes Match?
  const firstOfDaySeen={};

  // Inkrementeller State pro Spieler
  const st={};
  players.forEach(p=>{
    st[p.id]={
      games:0, wins:0,
      drvG:0, drvW:0,
      revG:0, revW:0,
      curStreak:0, curLoss:0,
      // Streak-Awards: werden zurückgesetzt wenn Serie bricht
      sa5:false, sa10:false, sa15:false, sa20:false,
      // Loss-Streak-Award: wird zurückgesetzt wenn Sieg kommt
      la5:false,
      // Tages-Tracker für Unbeatable
      days:{}, // "YYYY-MM-DD" → { g, l }
      // ── Neue Badges ──
      // Elo-Schwellen — seit v9.18 JE SAISON erreichbar. Deshalb wird der Peak
      // pro Saison geführt und beim Saisonwechsel zurückgesetzt; die Fired-Maps
      // sind nach sid geschlüsselt, damit ein Rückfall und erneutes Überschreiten
      // INNERHALB derselben Saison nicht doppelt zählt.
      eloSeason: null, seasonPeakElo: cfg.start_elo,
      eloFired: {},           // "climber_100:2026-06" → true
      // Tiebreak-Serie (gewonnene Tiebreaks in Folge)
      nailStreak: 0,
      // Krimi-Reihe: aufeinanderfolgende knappe Partien
      krimiCur: 0,
      // ── NEUE NEGATIV-BADGES v6 ──
      // Krimi-Versager: aufeinanderfolgende knappe Niederlagen (Diff ≤ 2)
      krimiLossCur: 0, krimiLossFired: false,
      // ── NEUE LEGENDARY-BADGES v7 ──
      // Bagel-Bäcker: pro Saison gewonnene Bagels zählen, einmal feuern
      mrPerfectPerSeason: {}, // sid → Bagels in dieser Saison
      mrPerfectFired: {},     // sid → true (schon gefeuert)
      // ── NEUE NEGATIV-BADGES v8 ──
      // Mr. Disaster: pro Saison 0:10-Niederlagen zählen + bei ≥3 einmalig feuern
      // (Spiegel zu mrPerfect — Saison-Reset implizit durch sid-Wechsel)
      mrDisasterPerSeason: {},
      mrDisasterFired: {},
      // Angstgegner: pro Gegner-Spieler aktueller Niederlagen-Streak + Fired-Flag
      // Reset des Counters bei Sieg gegen denselben Gegner; Fired-Flag wird
      // ebenfalls zurückgesetzt, sobald wieder ein Sieg gegen X gelingt.
      nemesisVs: {},          // oppId → Streak
      nemesisFired: {},       // oppId → schon gefeuert (wartet auf Reset)
      // Wiederholungstäter: letzter Sieg-Score und aktueller Counter
      lastWinScore: null, wtCur: 0,
      // Comeback-Tag und Zusammenbruch: erstes Ergebnis pro Tag
      firstResOfDay: {},   // "YYYY-MM-DD" → 'W' | 'L'
      // Revanchist: letztes verlorenes Gegner-Team (sortierter String "p1|p2")
      lastLossOpp: null,
    };
  });

  ordered.forEach(m=>{
    const earned=[];
    const ids=[m.a1,m.a2,m.b1,m.b2];
    const day=mdayKey(m);
    // Ist dies das erste Match dieses Tages? (Global, eine Frage pro Match)
    const isFirstOfDay = !firstOfDaySeen[day];
    if(isFirstOfDay) firstOfDaySeen[day]=true;
    // Saison-Peak-Tracking nutzt die Sim-History (Elo-Stand nach diesem Match)
    const hist=histById.get(m.id);
    const eloAfter=(hist&&hist.eloAfter)||{};

    ids.forEach(id=>{
      if(!st[id]) return;
      const s=st[id];
      const onA=(id===m.a1||id===m.a2);
      const w=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
      const pos=id===m.a1?m.a1_side:id===m.a2?m.a2_side:id===m.b1?m.b1_side:m.b2_side;
      const siegChance=myExp(id,m);

      // Werte VOR diesem Match sichern (für Schwellen-Checks)
      const pg=s.games, pw=s.wins, pDrvW=s.drvW, pRevW=s.revW, pDrvG=s.drvG, pRevG=s.revG;
      const prevAllrounder=pDrvW>=BG.allrounder&&pRevW>=BG.allrounder;

      // ── State updaten ──
      s.games++;
      if(w) s.wins++;
      if(pos==='drive'){s.drvG++;if(w)s.drvW++;}
      else            {s.revG++;if(w)s.revW++;}

      if(w){
        s.curStreak=s.curStreak>0?s.curStreak+1:1;
        s.curLoss=0;
        s.la5=false;
      } else {
        s.curLoss=s.curLoss>0?s.curLoss+1:1;
        s.curStreak=0;
        s.sa5=false; s.sa10=false; s.sa15=false; s.sa20=false;
      }

      if(!s.days[day]) s.days[day]={g:0,l:0};
      s.days[day].g++;
      if(!w) s.days[day].l++;
      if(s.days[day].g===1) s.firstResOfDay[day] = w ? 'W' : 'L';

      // ── Helper ──
      const fire=(bid, meta)=>{
        const b=badgeVonId.get(bid);
        if(b) earned.push(meta ? {playerId:id,badge:b,meta} : {playerId:id,badge:b});
      };

      // ── Einfache Schwellen-Badges ──
      if(pg===0)                                    fire('first_match');
      if(pg<BG.stammgast    && s.games>=BG.stammgast)    fire('games25');
      if(pg<BG.dauerbrenner && s.games>=BG.dauerbrenner) fire('games150');
      // v9.17: goldene Langzeit-Meilensteine. Gleiches Schwellen-Muster wie oben
      // (Wert VOR dem Match < Ziel, danach ≥ Ziel) → feuert genau einmal, in dem
      // Match, das die Marke reißt. pw ist der Siegzähler vor diesem Match.
      if(pg<BG.urgestein && s.games>=BG.urgestein)  fire('games250');
      if(pw<BG.siegermaschine && s.wins>=BG.siegermaschine) fire('wins200');
      if(!prevAllrounder && s.drvW>=BG.allrounder && s.revW>=BG.allrounder) fire('allrounder');
      if(pRevG<BG.seite && s.revG>=BG.seite)        fire('reves50');
      if(pDrvG<BG.seite && s.drvG>=BG.seite)        fire('drive50');

      // ── Match-Ergebnis-Badges ──
      if(w  && bgZuNull(m))                         fire('perfect_win');
      if(!w && bgZuNull(m))                         fire('perfect_loss');
      if(w  && bgZitter(m))                         fire('nail_biter');
      if(!w && bgZitter(m))                         fire('bitter_loss');
      if(bgWende(id,m))                             fire('wall_badge');
      if(w  && siegChance<CHANCE_UPSET)                      fire('upset_king');

      // ── Bagel-Bäcker / Mr. Disaster: Bagel-Sätze in DERSELBEN Saison ──
      // Counter pro Saison (sid YYYY-MM); einmal gefeuert, kein weiterer
      // Toast für dieselbe Saison — der count() sieht alle Saisons.
      const bagel=bgBagels(id,m);
      if(bagel.bagelsFor){
        const sid = seasonOf(m.created_at).id;
        s.mrPerfectPerSeason[sid] = (s.mrPerfectPerSeason[sid]||0) + bagel.bagelsFor;
        if(s.mrPerfectPerSeason[sid] >= BG.bagelSaison && !s.mrPerfectFired[sid]){
          s.mrPerfectFired[sid] = true;
          fire('mr_perfect');
        }
      }

      if(bagel.bagelsAgainst){
        const sid = seasonOf(m.created_at).id;
        s.mrDisasterPerSeason[sid] = (s.mrDisasterPerSeason[sid]||0) + bagel.bagelsAgainst;
        if(s.mrDisasterPerSeason[sid] >= BG.bagelSaison && !s.mrDisasterFired[sid]){
          s.mrDisasterFired[sid] = true;
          fire('mr_disaster');
        }
      }

      // ── Streak-Badges (nur wenn Schwelle NEU in dieser Serie) ──
      if(w && s.curStreak>=BG.serien[0] && !s.sa5)  { s.sa5=true;  fire('streak5');  }
      if(w && s.curStreak>=BG.serien[1] && !s.sa10) { s.sa10=true; fire('streak10'); }
      if(w && s.curStreak>=BG.serien[2] && !s.sa15) { s.sa15=true; fire('streak15'); }
      if(w && s.curStreak>=BG.serien[3] && !s.sa20) { s.sa20=true; fire('streak20'); }

      // ── Loss-Streak-Badge ──
      if(!w && s.curLoss>=BG.talfahrt && !s.la5)   { s.la5=true;  fire('losing5');  }

      // ── Carry ──
      const snap=snapMap[m.id];
      if(w && snap){
        const allFour=[m.a1,m.a2,m.b1,m.b2];
        if(allFour.every(x=>snap[x]!==undefined)){
          const weakest=allFour.reduce((a,b)=>
            (snap[a]??cfg.start_elo)<=(snap[b]??cfg.start_elo)?a:b);
          const mate=onA?(id===m.a1?m.a2:m.a1):(id===m.b1?m.b2:m.b1);
          if(mate===weakest) fire('carry');
        }
      }

      // ── Was den ganzen Tag beschreibt, an seiner letzten Partie ──
      // Nur wenn der Tag zu ist; davor kann jede dieser vier Aussagen noch
      // kippen (siehe oben).
      const d=s.days[day];
      if(letzteDesTages[id+'|'+day]===m.id && d.g>=BG.tag && _tagZu(day)){
        const ende={tagEnde:day};
        if(d.l===0)                                   fire('unbeatable', ende);
        if(d.l===d.g)                                 fire('black_day', ende);
        if(s.firstResOfDay[day]==='L' && w)           fire('comeback_day', ende);
        if(s.firstResOfDay[day]==='W' && !w)          fire('crash_day', ende);
      }

      // ── Frühschicht: Sieg im chronologisch ersten Match des Tages ──
      // isFirstOfDay ist für ALLE 4 Spieler dieses Matches identisch true,
      // garantiert max. 1 Trigger pro Spieler+Tag (mehr als 1 erstes Match gibt's nicht).
      if(isFirstOfDay && w) fire('early_bird');

      // ── Nerven aus Stahl: BG.tbSerie gewonnene Tiebreaks in Folge ──
      // Je Tiebreak, über Partien hinweg (wie countNailBiterStreaks). Sätze
      // ohne Tiebreak ändern die Serie nicht; ein verlorener bricht sie.
      bgTiebreaks(id,m).forEach(sieg=>{
        if(sieg){ s.nailStreak++; if(s.nailStreak>=BG.tbSerie){ fire('nerves_of_steel'); s.nailStreak=0; } }
        else s.nailStreak=0;
      });

      // ── Saison-Elo-Schwellen (je Saison einmal) ──
      // Nutzt den Elo-Stand nach diesem Match aus der zentralen Sim-History.
      // Die Elo wird zum Monatswechsel ohnehin auf start_elo zurückgesetzt —
      // der Peak wird hier genauso zurückgesetzt, damit „400 Elo in einer
      // Saison" wirklich diese Saison meint. Die Fired-Map je sid verhindert,
      // dass ein Zickzack um die Marke mehrfach zählt.
      const myEloAfter=eloAfter[id];
      if(myEloAfter!==undefined){
        const esid=seasonOf(m.created_at).id;
        if(s.eloSeason!==esid){ s.eloSeason=esid; s.seasonPeakElo=cfg.start_elo; }
        if(myEloAfter>s.seasonPeakElo){
          s.seasonPeakElo=myEloAfter;
          [['climber_100',BG.elo[0]],['dominator_400',BG.elo[1]],['dynasty_600',BG.elo[2]]].forEach(([bid,mark])=>{
            const k=bid+':'+esid;
            if(s.seasonPeakElo>=mark && !s.eloFired[k]){ s.eloFired[k]=true; fire(bid); }
          });
        }
      }

      // ── Klares Ding: deutlicher Sieg (§1.3) ──
      if(bgKlar(id,m)) fire('clear_win');

      // ── Krimi-Reihe: BG.krimi knappe Partien in Folge ──
      // Egal ob Sieg oder Niederlage; sobald erreicht → Counter-Reset.
      const knapp=bgKnapp(m);
      if(knapp){
        s.krimiCur++;
        if(s.krimiCur>=BG.krimi){ fire('krimi'); s.krimiCur=0; }
      } else {
        s.krimiCur=0;
      }

      // ── NEUE NEGATIV-BADGES v6 ──
      // ── Krimi-Versager: BG.krimiNied knappe Niederlagen in Folge ──
      // Sieg ODER deutliche Niederlage bricht die Serie. Feuert beim Erreichen,
      // dann erst wieder nach Reset (krimiLossFired-Flag).
      if(!w && knapp){
        s.krimiLossCur++;
        if(s.krimiLossCur>=BG.krimiNied && !s.krimiLossFired){
          fire('krimi_loser');
          s.krimiLossFired=true;
        }
      } else {
        s.krimiLossCur=0;
        s.krimiLossFired=false;
      }


      // ── Wiederholungstäter: identisches Ergebnis, Satz für Satz ──
      // Niederlagen oder Siege mit anderem Ergebnis brechen die Serie.
      if(w){
        const score=standFuer(m);
        if(score===s.lastWinScore){
          s.wtCur++;
          if(s.wtCur>=BG.wiederholung){ fire('repeat_score'); s.wtCur=0; s.lastWinScore=null; }
        } else {
          s.wtCur=1; s.lastWinScore=score;
        }
      } else {
        s.wtCur=0; s.lastWinScore=null;
      }


      // ── Angstgegner: 5× in Folge gegen denselben Gegner-SPIELER verloren ──
      // Pro Gegner-Spieler aus diesem Match: bei Niederlage Counter +1, bei
      // Sieg Reset. Max. 1 fire pro Match (analog streak_breaker), auch wenn
      // beide Gegner gleichzeitig die Schwelle erreichen sollten.
      const oppPair = onA?[m.b1,m.b2]:[m.a1,m.a2];
      if(w){
        oppPair.forEach(oId=>{ s.nemesisVs[oId]=0; s.nemesisFired[oId]=false; });
      } else {
        let nemFired=false;
        oppPair.forEach(oId=>{
          s.nemesisVs[oId] = (s.nemesisVs[oId]||0) + 1;
          if(s.nemesisVs[oId]>=BG.angstgegner && !s.nemesisFired[oId]){
            s.nemesisFired[oId]=true;
            // oId = der Gegner-Spieler, gegen den zum 5. Mal in Folge verloren
            // wurde → als Meta mitgeben, damit die News den Angstgegner benennt.
            if(!nemFired){ fire('nemesis', {oppId: oId}); nemFired=true; }
          }
        });
      }

      // ── Revanchist: ein Match gewonnen gegen das Paar, gegen das man das
      // Match davor verloren hat. Nur am letzten Satz eines Matches [§1.3]:
      // je Satz war jedes 1:1 eine Revanche.
      const mGew=begegnungGewonnen(m,id);
      if(mGew!==null){
        const currentOpp=(onA?[m.b1,m.b2]:[m.a1,m.a2]).slice().sort().join('|');
        if(s.lastLossOpp){
          if(currentOpp===s.lastLossOpp && mGew) fire('revanchist');
          s.lastLossOpp=null;
        }
        if(!mGew) s.lastLossOpp=currentOpp;
      }

      // ── Königsklasse / Pflichtaufgabe: Sieg gegen Top-3 / Bottom-3 der Saison-Endrangliste ──
      // Cache ist nach erstem Aufruf für alle weiteren Matches verfügbar.
      if(w){
        const rk=getSeasonRankingsCache();
        const r=rk[seasonOf(m.created_at).id];
        if(r){
          const opps=onA?[m.b1,m.b2]:[m.a1,m.a2];
          if(r.top3.size && opps.some(oId=>r.top3.has(oId))) fire('koenigsklasse');
          if(r.bottom3.size && opps.some(oId=>r.bottom3.has(oId))) fire('pflichtaufgabe');
        }
      }

      // ── Thronfäller: Sieg gegen den Top-1 der Saison-Rangliste (Stand vor Match) ──
      // ── Überholmanöver: Sieg gegen Gegner, der dadurch in der Rangliste überholt wurde ──
      // ── Pflichterfüller: Sieg gegen mind. einen Bottom-2-Gegner (preRank-Stand vor Match) ──
      // Alle drei nutzen rankSnaps (preRank/postRank pro Match aus globalSim-Deltas).
      // Match-Trigger feuert je Badge maximal 1× pro Spieler pro Match — auch wenn
      // 2 Gegner überholt werden, gibts nur 1 Toast/Eintrag im Match-Review.
      // Der Counter (countOvertake) zählt die tatsächlichen 2 Überholungen für
      // das Profil-Aggregat — die beiden Pfade sind absichtlich getrennt.
      if(w){
        const rs=rankSnaps[m.id];
        if(rs && rs.preRank && rs.postRank){
          const opps=onA?[m.b1,m.b2]:[m.a1,m.a2];
          // Thronfäller: Wer war Top-1 in der Saison vor dem Match?
          let top1=null;
          for(const pid in rs.preRank){
            if(rs.preRank[pid]===1){ top1=pid; break; }
          }
          if(top1 && top1!==id && opps.includes(top1)) fire('kingslayer');
          // Überholmanöver: Hat X mindestens einen Gegner überholt?
          const preX=rs.preRank[id], postX=rs.postRank[id];
          if(preX && postX){
            const overtook=opps.some(oId=>{
              const preY=rs.preRank[oId], postY=rs.postRank[oId];
              return preY && postY && preX>preY && postX<postY;
            });
            if(overtook) fire('overtake');
          }
          // Pflichterfüller: Bottom-2-Gegner (rank >= N-1), ab 5 Spielern in der Saison
          const N = Object.keys(rs.preRank).length;
          if(N >= 5){
            const hit = opps.some(oId => rs.preRank[oId] && rs.preRank[oId] >= N-1);
            if(hit) fire('duty_done');
          }
        }
      }

      // ── Serienbrecher: Sieg, der eine Siegesserie (≥4) eines Gegners beendet hat ──
      // Nutzt den globalen streakSnaps-Cache (Stand der Streaks VOR dem Match) —
      // damit ist die Logik konsistent mit countStreakBreaker im Profil und unabhängig
      // davon, in welcher Reihenfolge die 4 Spieler im inneren Loop verarbeitet werden.
      if(w){
        const ss=streakSnaps[m.id];
        if(ss){
          const opps=onA?[m.b1,m.b2]:[m.a1,m.a2];
          if(opps.some(oId=>(ss[oId]||0)>=BG.serienbrecher)) fire('streak_breaker');
        }
      }

      // potw / potd / award_collector: erfordern Vergleich aller Spieler am Periodenende →
      // zu komplex für inkrementell, werden in computeBadges() lazy berechnet
      // vice_champion: Saison-End-Event, nicht an ein einzelnes Match gebunden →
      // wird ebenfalls in computeBadges() aus dem seasons-Archiv ermittelt
      // untouchable / allwetter / godly_streak: Saison-/Karriere-aggregiert →
      // ebenfalls nur via count-Funktion (kein Live-Trigger, kein Toast).
    });

    map[m.id]=earned;
  });

  _cache._badgeEarnedKey=key;
  _cache._badgeEarnedMap=map;
  return map;
}

function badgesEarnedInMatch(matchId){
  return getBadgeEarnedCache()[matchId]||[];
}

