// ╔═══ §1.1 ─── ICON LIBRARY (SVG line-icons) ──────────────────────────╗
//     ⚑ HOTSPOT — Wer hier ein Icon hinzufügt, sollte es ggf. auch im
//     AW_IC-Mapping (§5.3) und/oder im BADGES-Array (§7.1)
//     referenzieren.
//     Konvention: Path-Strings ohne viewBox/svg-Wrapper. Wrapper kommt
//     von svgI() / ic() Helper-Funktionen.
// ╚═════════════════════════════════════════════════════════════════════════╝
// ⚑ HOTSPOT — ICONS-Library (SVG-Paths). Wer hier ergänzt, sollte das Icon
// dann auch verwenden — sonst tote Definition. Konventionen:
//   - 24x24 viewBox (vom Wrapper svgI/ic gesetzt, hier NICHT setzen)
//   - stroke-basiert; Wrapper setzt stroke="currentColor", fill="none"
//   - Keine viewBox/svg-Tags hier — nur die Path-/Circle-/Polygon-Strings.
//   - Die Zeichnung steht in der Mitte des 24er-Felds: die Mitte ihrer
//     Geometrie auf (12, 12), auf eine halbe Einheit genau. 141 der 272
//     Zeichen lagen daneben, die Flamme 2,5 Einheiten zu hoch, die doppelten
//     Flammen und Tropfen bis 4,5, und der Bannbruch ragte oben aus dem Feld
//     und war abgeschnitten — in jeder Zeichenkachel, jedem Kreis und jedem
//     Chip saß das Zeichen sichtbar schief. Wer verschieben muss, legt ein
//     `<g transform="translate(…)">` darum; `tests/zeichen` misst jedes.
const ICONS = {
  // Trophäen / Rang
  trophy:    `<g transform="translate(0 -0.5)"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM5 9a2 2 0 01-2-2V5h4M19 9a2 2 0 002-2V5h-4"/></g>`,
  crown:     `<g transform="translate(0 -0.5)"><path d="M2 8l4 6 6-9 6 9 4-6v11a1 1 0 01-1 1H3a1 1 0 01-1-1z"/></g>`,
  star:      `<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>`,
  medal:     `<circle cx="12" cy="15" r="6"/><path d="M9 9L7 3h10l-2 6"/>`,
  // Sport / Performance
  ball:      `<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>`,
  target:    `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>`,
  flame:     `<g transform="translate(0 2.5)"><path d="M12 2s5 5 5 10a5 5 0 01-10 0c0-2 1-3 1-3s.5 2 2 2c-1-3 2-4 2-9z"/></g>`,
  bolt:      `<polygon points="13,2 4,14 11,14 9,22 20,10 13,10"/>`,
  shield:    `<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/>`,
  // Trends / Stats
  chartBar:  `<path d="M3 3v18h18M7 14v4M12 9v9M17 5v13"/>`,
  // Soziale Symbole
  handshake: `<g transform="translate(0 -1.5)"><circle cx="6" cy="10" r="3"/><circle cx="18" cy="10" r="3"/><path d="M9 10h6"/><path d="M3 20a4 4 0 014-4h2M21 20a4 4 0 00-4-4h-2"/></g>`,
  users:     `<g transform="translate(0.5 0)"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1a6 6 0 0112 0v1M15 20v-1a5 5 0 015-1"/></g>`,
  user:      `<g transform="translate(0 -0.5)"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0114 0v1"/></g>`,
  // Status
  check:     `<polyline points="4,12 10,18 20,6"/>`,
  // Spezielle Awards
  hundred:   `<g transform="translate(-0.5 0)"><path d="M4 7v10M4 7l-1.5 1.5"/><circle cx="11" cy="12" r="3.5"/><circle cx="19" cy="12" r="3.5"/></g>`,
  cycle:     `<path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/>`,
  // Empty-States
  calendar:  `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>`,
  search:    `<g transform="translate(-0.5 -0.5)"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></g>`,
  scroll:    `<g transform="translate(0.5 0)"><path d="M8 3h10a2 2 0 012 2v14a2 2 0 01-2 2H8M8 3a2 2 0 00-2 2v3M8 3v18M6 8H4a1 1 0 00-1 1v8a2 2 0 002 2h11"/></g>`,
  edit:      `<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4z"/>`,
  trendUp:   `<polyline points="3,17 9,11 13,15 21,7"/><polyline points="14,7 21,7 21,14"/>`,
  trendDown: `<polyline points="3,7 9,13 13,9 21,17"/><polyline points="14,17 21,17 21,10"/>`,
  // Badge-spezifisch
  egg:       `<g transform="translate(0 1)"><path d="M12 3c-3.5 0-6 5-6 10a6 6 0 0012 0c0-5-2.5-10-6-10z"/></g>`,
  controller:`<g transform="translate(0 -1)"><rect x="2" y="8" width="20" height="10" rx="5"/><path d="M7 13h2M8 12v2M16 12h.01M14 14h.01"/></g>`,
  diamond:   `<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3l-2 6 3 12 3-12-2-6M2 9h20"/>`,
  pinch:     `<path d="M2 12h4l2-5 3 10 3-7 2 4 2-2h4"/>`,
  brick:     `<g transform="translate(0 -0.5)"><rect x="3" y="4" width="18" height="5" rx="1"/><rect x="3" y="10" width="18" height="5" rx="1"/><rect x="3" y="16" width="18" height="5" rx="1"/></g>`,
  tornado:   `<g transform="translate(0 -0.5)"><path d="M3 5h18M5 10h14M7 15h10M10 20h4"/></g>`,
  lock:      `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>`,
  dizzy:     `<circle cx="12" cy="12" r="9"/><path d="M8 9l2 2M10 9l-2 2M14 9l2 2M16 9l-2 2M8 16s1-2 4-2 4 2 4 2"/>`,
  // ─── Erweiterungen: einzigartiges Symbol je Award/Badge ───
  // Awards
  trophyStar:    `<g transform="translate(0 -0.5)"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM5 9a2 2 0 01-2-2V5h4M19 9a2 2 0 002-2V5h-4"/><circle cx="12" cy="7" r="1.2"/></g>`, // Award „Meiste Siege": Trophy mit Punkt
  award:         `<g transform="translate(0 -0.5)"><circle cx="12" cy="9" r="5"/><path d="M8.5 13l-2.5 8 6-3 6 3-2.5-8"/></g>`, // Showmaster: Award-Rosette
  duo:           `<g transform="translate(0 -1)"><circle cx="9" cy="9" r="3"/><circle cx="15" cy="9" r="3"/><path d="M3 19a6 6 0 016-6M21 19a6 6 0 00-6-6"/><path d="M9 18l3 2 3-2"/></g>`, // Unzertrennlich (Duo)
  shieldCheck:   `<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/><polyline points="8.5,12 11,14.5 15.5,10"/>`, // Eiserne Abwehr
  snowflake:     `<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19M9 4l3 2 3-2M9 20l3-2 3 2M4 9l2 3-2 3M20 9l-2 3 2 3"/>`, // Eiskalt (Ice)
  skull:         `<g transform="translate(0 1)"><path d="M12 2a8 8 0 00-8 8v4l2 2v4h2v-2h2v2h4v-2h2v2h2v-4l2-2v-4a8 8 0 00-8-8z"/><circle cx="9" cy="11" r="1.2"/><circle cx="15" cy="11" r="1.2"/><path d="M11 16h2"/></g>`, // Endgegner & WorstWr
  weight:        `<path d="M3 10v4M21 10v4M6 7v10M18 7v10M6 12h12"/>`, // Carry-King
  lonewolf:      `<g transform="translate(0 -1)"><circle cx="12" cy="9" r="4"/><path d="M4 21v-2a5 5 0 015-5h6a5 5 0 015 5v2"/><path d="M9 7l-1-2M15 7l1-2"/></g>`, // Einzelkämpfer (User mit Ohren)
  surprise:      `<g transform="translate(0 0.5)"><path d="M12 3l3 6 6 1-4.5 4 1 6L12 17l-5.5 3 1-6L3 10l6-1z"/><circle cx="12" cy="12" r="1.2"/></g>`, // Upset (Stern mit Punkt)
  explosion:     `<g transform="translate(1 1)"><path d="M12 2l2 5 5-1-3 4 4 3-5 1 1 5-4-3-3 4-1-5-5-1 3-4-4-3 5-1z"/></g>`, // Höchster Sieg
  gamepad:       `<g transform="translate(0 -1)"><rect x="2" y="7" width="20" height="12" rx="4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M6 10v2M5 11h2"/></g>`, // Vielspieler
  // Negativ-Awards (jeder eigen)
  trendCrash:    `<g transform="translate(0 2)"><path d="M3 5l5 5 4-4 9 9"/><polyline points="14,15 21,15 21,8"/></g>`, // Längste Niederlagenserie
  meltDown:      `<g transform="translate(0 -0.5)"><circle cx="12" cy="10" r="6"/><path d="M6 16c0 3 2 5 6 5s6-2 6-5M9 9h.01M15 9h.01M9 13s1 1 3 1 3-1 3-1"/></g>`, // Formtief
  blockedShot:   `<circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/>`, // Zahnloser Stürmer
  hole:          `<g transform="translate(0 0.5)"><ellipse cx="12" cy="16" rx="9" ry="3"/><path d="M3 16C3 10 6 4 12 4s9 6 9 12"/></g>`, // Löchrigste Abwehr
  circus:        `<g transform="translate(0 0.5)"><path d="M3 7L12 3l9 4M5 7v13h14V7M12 7v13M8 10h8M8 14h8M8 18h8"/></g>`, // Zirkus
  brokenHeart:   `<g transform="translate(0 -0.5)"><path d="M12 21s-7-4-9-9c-1.5-4 2-8 5-8 2 0 3 1 4 3 1-2 2-3 4-3 3 0 6.5 4 5 8-2 5-9 9-9 9z"/><path d="M12 7l-2 4 3 2-2 4"/></g>`, // Schlechtestes Team
  cone:          `<g transform="translate(0 1)"><path d="M12 3l-7 16h14z"/><path d="M7 9h10M6 13h12M5 17h14"/></g>`, // Baustelle
  // Badges (zusätzlich)
  stopwatch:     `<g transform="translate(0 0.5)"><circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6M12 5V2"/></g>`, // Stammgast (Zeit) — alternativ falls Controller doppelt
  refresh:       `<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/><polygon points="13,8 9,14 12,14 11,18 15,12 12,12"/>`, // Allrounder: Shield mit Bolt drin
  bolt2:         `<polygon points="13,2 4,14 11,14 9,22 20,10 13,10"/><circle cx="13" cy="14" r="1.5"/>`, // Mittelstürmer (Bolt+Punkt)
  flameDouble:   `<g transform="translate(0 4.5)"><path d="M7 3s3 3 3 6a3 3 0 11-6 0c0-1.2.6-1.8.6-1.8s.3 1.2 1.2 1.2c-.6-1.8 1.2-2.4 1.2-5.4z"/><path d="M17 3s3 3 3 6a3 3 0 11-6 0c0-1.2.6-1.8.6-1.8s.3 1.2 1.2 1.2c-.6-1.8 1.2-2.4 1.2-5.4z"/></g>`, // 10er Serie
  flameTriple:   `<g transform="translate(0 4.5)"><path d="M5 6s2 2 2 4a2 2 0 11-4 0c0-.8.4-1.2.4-1.2s.2.8.8.8c-.4-1.2.8-1.6.8-3.6z"/><path d="M12 3s3 3 3 6a3 3 0 11-6 0c0-1.2.6-1.8.6-1.8s.3 1.2 1.2 1.2c-.6-1.8 1.2-2.4 1.2-5.4z"/><path d="M19 6s2 2 2 4a2 2 0 11-4 0c0-.8.4-1.2.4-1.2s.2.8.8.8c-.4-1.2.8-1.6.8-3.6z"/></g>`, // 15er Serie
  crownFlame:    `<g transform="translate(0 -2)"><path d="M2 8l4 6 6-9 6 9 4-6v8H2z"/><path d="M12 17s2 2 2 4a2 2 0 01-4 0c0-1 .5-1.5.5-1.5"/></g>`, // 30er Serie (Crown+Flame)
  crownPlus:     `<path d="M2 8l4 6 6-9 6 9 4-6v11H2z"/><path d="M9 16h6M12 13v6"/>`, // Unschlagbar
  weekly:        `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/><circle cx="12" cy="14" r="2"/>`, // Player of the Week
  trophyDay:     `<g transform="translate(0 -0.5)"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM5 9a2 2 0 01-2-2V5h4M19 9a2 2 0 002-2V5h-4"/><path d="M12 11l1 2-2 1 1 2"/></g>`, // Player of the Day (Trophy mit Blitz)
  // Niederlagen-Tropfen (1/2/3) für Loss-Streaks
  drop:          `<g transform="translate(0 1)"><path d="M12 3s5 6 5 11a5 5 0 01-10 0c0-5 5-11 5-11z"/></g>`,
  dropDouble:    `<g transform="translate(0 3.75)"><path d="M7 3s3 4 3 7.5a3 3 0 11-6 0c0-3.5 3-7.5 3-7.5z"/><path d="M17 3s3 4 3 7.5a3 3 0 11-6 0c0-3.5 3-7.5 3-7.5z"/></g>`,
  dropTriple:    `<g transform="translate(0 3.75)"><path d="M5 6s2 3 2 5a2 2 0 11-4 0c0-2 2-5 2-5z"/><path d="M12 3s3 4 3 7.5a3 3 0 11-6 0c0-3.5 3-7.5 3-7.5z"/><path d="M19 6s2 3 2 5a2 2 0 11-4 0c0-2 2-5 2-5z"/></g>`,
  info:          `<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.5"/>`,
  // Peak Elo: zwei Berggipfel mit Stern oben am höchsten
  peak:          `<path d="M3 20h18M5 20l5-10 3 6 2-3 4 7"/><polygon points="10,4 11,6 13,6.2 11.6,7.5 12,9.5 10,8.5 8,9.5 8.4,7.5 7,6.2 9,6"/>`,
  // ─── Neue Badge-Icons (keine Dopplung zu bestehenden) ───
  // Vize-Meister: Medaille mit nach-oben-Pfeil (so nah am Gold, aber nicht ganz)
  medal2:        `<g transform="translate(0 0.5)"><circle cx="12" cy="14" r="6"/><path d="M9 8L7 3h10l-2 5"/><polyline points="10,15 12,12 14,15"/></g>`,
  // Aufsteiger: Bergprofil mit Aufwärts-Pfeil oben rechts
  climb:         `<g transform="translate(0 0.5)"><path d="M3 20h18M3 20l5-8 4 4 5-7 4 4"/><polyline points="15,7 19,3 21,7"/><path d="M19 3v6"/></g>`,
  // Dominator: 5-zackige große Krone mit Stein in der Mitte
  dominator:     `<g transform="translate(0 -0.5)"><path d="M2 7l3 5 4-7 3 7 4-7 3 7 3-5v13H2z"/><circle cx="12" cy="15" r="1.6"/></g>`,
  // Dynastie: antiker Tempel — Dach, Architrav, vier Säulen, Stufe
  temple:        `<g transform="translate(0 -0.5)"><path d="M3 21h18M2 18h20M5 18L12 4l7 14M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/></g>`,
  // Frühschicht: aufgehende Sonne mit Strahlen über Horizont
  sunrise:       `<circle cx="12" cy="17" r="4"/><path d="M2 21h20M12 11V8M5.6 14.4L4 12.8M18.4 14.4L20 12.8M3 18h2M19 18h2M9 6l3-3 3 3"/>`,
  // Nerven aus Stahl: Herz mit EKG-Linie quer durch
  nerves:        `<g transform="translate(0 -0.5)"><path d="M12 21s-7-4-9-9c-1.5-4 2-8 5-8 2 0 3 1 4 3 1-2 2-3 4-3 3 0 6.5 4 5 8-2 5-9 9-9 9z"/><polyline points="4,13 8,13 10,10 12,16 14,11 16,13 20,13"/></g>`,
  // Award: Meiste POTW-Auszeichnungen (Kalender mit Krone) — saison-/all-time Sammler-Award
  weekKing:      `<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M8 7v4M16 7v4"/><polygon points="5,7 8,3 12,6 16,3 19,7" fill="none" stroke-linejoin="round"/>`,
  // Award: Meiste POTD-Auszeichnungen (Trophäe mit Krone) — saison-/all-time Sammler-Award
  dayKing:       `<g transform="translate(0 0.5)"><path d="M8 21h8M12 17v4M7 8h10v4a5 5 0 01-10 0zM5 11a2 2 0 01-2-2V7h4M19 11a2 2 0 002-2V7h-4"/><polygon points="5,5 8,2 12,4 16,2 19,5" fill="none" stroke-linejoin="round"/></g>`,
  // ── NEUE AWARDS v3 ──
  // Plus-Minus (Saldofürst): klassisches ± Symbol in Kreis — Plus oben, Minus unten
  plusMinus:     `<circle cx="12" cy="12" r="9"/><path d="M12 7v4M10 9h4"/><path d="M10 16h4"/>`,
  // Underdog-Held (David): Aufwärtspfeil mit Krone darüber — Außenseiter mit Königskrönung
  underdog:      `<g transform="translate(0 -1)"><path d="M12 21v-9"/><path d="M8 16l4-4 4 4"/><path d="M7 8l5-3 5 3v2H7z"/></g>`,
  // Pechvogel: Regenwolke mit drei schräg fallenden Tropfen
  // ── Fügungen [§C35]: vier Zeichen, die es sonst nirgends gibt ──
  // Waage im Gleichgewicht — das Torkonto eines Abends geht exakt auf.
  scaleBalance:  `<g transform="translate(0 0.65)"><path d="M12 4v16M7 20h10M4 8h16"/><path d="M4 8l-2.5 5a2.5 2.5 0 005 0z"/><path d="M20 8l-2.5 5a2.5 2.5 0 005 0z"/><circle cx="12" cy="4" r="1.3"/></g>`,
  // Achterbahn — erst ganz oben, dann ganz unten, am selben Abend.
  coasterDip:    `<g transform="translate(0 0.7)"><path d="M3 5c4 0 4 14 8 14s5-11 10-11"/><circle cx="3" cy="5" r="1.4"/><circle cx="21" cy="8" r="1.4"/></g>`,
  // Nadelöhr — jede Partie ging durch eine Öse von einem Tor.
  needleEye:     `<g transform="translate(0 0.5)"><ellipse cx="12" cy="6" rx="3" ry="4"/><path d="M12 10v11"/><path d="M9.6 20.5h4.8"/></g>`,
  // Brausekopf — auf ein 10:0 folgt unmittelbar ein 0:10.
  // Seitenwechsler: zwei Pfeile, die die Seiten tauschen — Sturm und Abwehr
  // im Wechsel. `refresh` ist der Kreis ohne Richtung, hier geht es hin und
  // zurueck zwischen zwei festen Plaetzen.
  sideSwap:      `<path d="M4 8h13l-3-3M20 16H7l3 3"/><path d="M4 8v-3M20 16v3"/>`,
  rainCloud:     `<g transform="translate(1.5 0.41)"><path d="M6 14a4 4 0 010-8 5 5 0 019 0 4 4 0 010 8z"/><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3"/></g>`,
  // ── NEUE TEAM-AWARDS v4 ──
  // Unaufhaltsam: Loderndes Feuer mit Aufwärts-Pfeil — Team-Siegesserie
  unstoppable:   `<g transform="translate(0 1.5)"><path d="M12 3s5 5 5 10a5 5 0 01-10 0c0-2 1-3 1-3s.5 2 2 2c-1-3 2-4 2-9z"/><polyline points="10,15 12,12 14,15"/></g>`,
  // Glückspilze: Vierblättriges Kleeblatt — Glück bei knappen Siegen
  clover:        `<g transform="translate(0 -1.38)"><path d="M12 12s-3-1-3-4 3-3 3 0c0-3 3-3 3 0s-3 4-3 4z"/><path d="M12 12s-1 3-4 3-3-3 0-3c-3 0-3-3 0-3s4 3 4 3z"/><path d="M12 12s3 1 3 4-3 3-3 0c0 3-3 3-3 0s3-4 3-4z"/><path d="M12 12s1-3 4-3 3 3 0 3c3 0 3 3 0 3s-4-3-4-3z"/><path d="M12 16v5"/></g>`,
  // Giant Slayer: Schwert kreuzt sich mit Krone — Underdog-Sieg gegen Favoriten als Team
  giantSlayer:   `<g transform="translate(0 1.5)"><path d="M5 19l8-8M5 19l3 0M5 19l0-3M13 11l6-6M13 11l3 0M13 11l0-3"/><polygon points="9,4 12,2 15,4 14,7 10,7" fill="none" stroke-linejoin="round"/></g>`,
  // Favoritenschreck: Teufelsmaske mit Hörnern — Schock-Sieg gegen weit stärkere Gegner
  devilMask:     `<g transform="translate(0 -1)"><path d="M5 8l2-4 3 2M19 8l-2-4-3 2"/><path d="M4 11a8 8 0 0116 0v4a8 8 0 01-16 0z"/><circle cx="9" cy="13" r="1.3"/><circle cx="15" cy="13" r="1.3"/><path d="M9 18c1 .8 2 1 3 1s2-.2 3-1"/></g>`,
  // Erzfeinde: Zwei gekreuzte Schwerter — Team-Rivalität
  crossedSwords: `<path d="M3 3l9 9M3 8V3h5M14.5 14.5L21 21M16 21h5v-5"/><path d="M21 3l-9 9M21 8V3h-5M9.5 14.5L3 21M8 21H3v-5"/>`,
  // ── NEUE BADGES v5 ──
  // Pflichterfüller: Trophäe mit Häkchen unten — Sieg gegen Bottom-3 zum Match-Zeitpunkt
  trophyCheck:   `<g transform="translate(0 -0.5)"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM5 9a2 2 0 01-2-2V5h4M19 9a2 2 0 002-2V5h-4"/><polyline points="9,11 11,13 15,8"/></g>`,
  // Serienbrecher: brennende Flamme von horizontaler Linie durchgestrichen — Streak gestoppt
  flameBreak:    `<g transform="translate(0 2.5)"><path d="M12 2s5 5 5 10a5 5 0 01-10 0c0-2 1-3 1-3s.5 2 2 2c-1-3 2-4 2-9z"/><line x1="3" y1="13" x2="21" y2="13" stroke-width="2.5" stroke-linecap="round"/></g>`,
  // ── NEUE NEGATIV-AWARDS/BADGES v6 ──
  // Käseteller: Kreis mit drei "Löchern" — symbolisiert löchrige Defensive
  cheese:        `<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="11" r="1.7"/><circle cx="10" cy="15" r="1.4"/><circle cx="15.5" cy="15.5" r="0.9"/>`,
  // Favoriten-Versager: gestürzte Krone (Zacken nach unten)
  crownFallen:   `<g transform="translate(0 -3)"><path d="M2 16l4-6 6 9 6-9 4 6v0a1 1 0 01-1 1H3a1 1 0 01-1-1z"/><line x1="3" y1="20" x2="21" y2="20"/></g>`,
  // Krimi-Versager: Theatermaske mit Träne — Drama mit Pech-Note
  dramaTear:     `<g transform="translate(0 0.5)"><path d="M12 3c4 0 7 3 7 7v3c0 4-3 7-7 7s-7-3-7-7v-3c0-4 3-7 7-7z"/><circle cx="9.5" cy="11" r="0.9"/><circle cx="14.5" cy="11" r="0.9"/><path d="M9 15.5c1 1 2 1.3 3 1.3s2-.3 3-1.3"/><path d="M15 12.5l0.6 2.5"/></g>`,
  // ── NEUE LEGENDARY-BADGES v7 ──
  shieldStar:    `<path d="M12 2l8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/><polygon points="12,7.5 13.5,11 17,11.3 14.3,13.6 15.1,17 12,15.1 8.9,17 9.7,13.6 7,11.3 10.5,11"/>`,
  // Mr. Perfect: drei kleine Pokale nebeneinander — dreifach perfekt in einer Saison
  tripleCup:     `<path d="M3 4h4v3a2 2 0 01-4 0zM10 4h4v3a2 2 0 01-4 0zM17 4h4v3a2 2 0 01-4 0z"/><line x1="5" y1="7" x2="5" y2="10"/><line x1="12" y1="7" x2="12" y2="10"/><line x1="19" y1="7" x2="19" y2="10"/><line x1="3" y1="10" x2="7" y2="10"/><line x1="10" y1="10" x2="14" y2="10"/><line x1="17" y1="10" x2="21" y2="10"/><line x1="4" y1="20" x2="20" y2="20"/><path d="M5 14l-1 6M19 14l1 6M12 14v6"/>`,
  // Allwetter: Sonne + Wolke + Regen kombiniert — alle Wochentage abgedeckt
  weatherMix:    `<circle cx="7" cy="7" r="2.5"/><line x1="7" y1="2.5" x2="7" y2="3.5"/><line x1="2.5" y1="7" x2="3.5" y2="7"/><line x1="4" y1="4" x2="4.5" y2="4.5"/><line x1="10" y1="4" x2="9.5" y2="4.5"/><path d="M14 14a3.5 3.5 0 010-7 4.5 4.5 0 014.5 3.5 2.5 2.5 0 010 5h-4.5z"/><line x1="10" y1="18" x2="9" y2="21"/><line x1="14" y1="18" x2="13" y2="21"/><line x1="18" y1="18" x2="17" y2="21"/>`,
  // Tag der Götter: Sonne mit Stern im Zentrum + Strahlen — göttliche Dominanz
  godRay:        `<g transform="translate(0 0.75)"><circle cx="12" cy="13" r="3.5"/><polygon points="12,10.5 12.8,12.5 12,14.5 11.2,12.5" fill="currentColor" fill-opacity="0.6"/><line x1="12" y1="3" x2="12" y2="5.5"/><line x1="21" y1="13" x2="18.5" y2="13"/><line x1="3" y1="13" x2="5.5" y2="13"/><line x1="18.5" y1="6.5" x2="16.7" y2="8.3"/><line x1="5.5" y1="6.5" x2="7.3" y2="8.3"/><line x1="18.5" y1="19.5" x2="16.7" y2="17.7"/><line x1="5.5" y1="19.5" x2="7.3" y2="17.7"/></g>`,
  // ── NEUE BADGES v4 ──
  // Thronfäller: Krone mit "X" durchgestrichen — Sieg gegen den Top-1 Spieler der Saison
  kingFall:      `<path d="M5 9l3-3 4 2 4-2 3 3v9H5z"/><path d="M8 13l8 4M16 13l-8 4"/>`,
  // ── Neue Badge-Icons ──
  // Krimi-Reihe: zackige Achterbahn-Linie (viele knappe, dramatische Spiele)
  thriller:      `<g transform="translate(0 -1)"><polyline points="3 18 6 8 9 16 12 10 15 17 18 8 21 14"/></g>`,
  // Klares Ding: Daumen hoch (eindeutiger, deutlicher Sieg)
  thumbsUp:      `<g transform="translate(1.48 -1.15)"><rect x="3" y="11" width="4" height="10" rx="1"/><path d="M7 11l3-5c.2-.5.7-.7 1.2-.7 1.1 0 1.8 1 1.5 2L12 10h4.5c1 0 1.7.7 1.5 1.7l-1.3 5c-.2.8-.9 1.3-1.7 1.3H7z"/></g>`,
  // Wiederholungstäter: zwei überlappende Karten (Duplikat-Score)
  duplicate:     `<g transform="translate(-0.5 -0.5)"><rect x="4" y="4" width="13" height="13" rx="2"/><rect x="8" y="8" width="13" height="13" rx="2"/></g>`,
  // Comeback-Tag: V-Kurve mit Endpunkt oben (Talsohle → Wiederaufstieg)
  comeback:      `<g transform="translate(-0.75 1.25)"><polyline points="3 4 9 19 21 4"/><circle cx="21" cy="4" r="1.5"/></g>`,
  // Revanchist: zwei gegenläufige Refresh-Bögen (Rück-Match gewonnen)
  rematch:       `<polyline points="4 4 4 10 10 10"/><path d="M4 10a8 8 0 0114-3"/><polyline points="20 20 20 14 14 14"/><path d="M20 14a8 8 0 01-14 3"/>`,
  // Königsklasse: Krone mit drei Edelsteinen darunter (Top-3 der Liga)
  kingClass:     `<g transform="translate(0 1)"><polygon points="3,9 6,5 9,9 12,5 15,9 18,5 21,9 21,17 3,17" fill="none" stroke-linejoin="round"/><circle cx="7" cy="14" r="1.3"/><circle cx="12" cy="14" r="1.3"/><circle cx="17" cy="14" r="1.3"/></g>`,
  // Pflichtaufgabe: Klemmbrett mit Häkchen (Pflicht erfüllt)
  // Award-Sammler: drei Medaillen mit Bändern (Sammlung von Auszeichnungen)
  medalTrio:     `<g transform="translate(0 0.75)"><circle cx="7" cy="15" r="3.5"/><circle cx="12" cy="10" r="3.5"/><circle cx="17" cy="15" r="3.5"/><path d="M6 12l-1-3M11 7l-1-3M16 12l1-3M18 7l-1-3M13 7l-1-3M8 12l-1-3"/></g>`,
  // ── NEUE NEGATIV-BADGES v8 ──
  // Mr. Disaster: drei umgekehrte Pokale (Stiel nach oben) — verlorene/gestürzte Trophäen
  tripleCrash:   `<path d="M3 20h4v-3a2 2 0 00-4 0zM10 20h4v-3a2 2 0 00-4 0zM17 20h4v-3a2 2 0 00-4 0z"/><line x1="5" y1="17" x2="5" y2="14"/><line x1="12" y1="17" x2="12" y2="14"/><line x1="19" y1="17" x2="19" y2="14"/><line x1="4" y1="4" x2="20" y2="4"/><line x1="5" y1="14" x2="4" y2="4"/><line x1="19" y1="14" x2="20" y2="4"/><line x1="12" y1="14" x2="12" y2="4"/>`,
  // Zusammenbruch: invertierte V-Kurve (Höhenflug → Absturz) mit Crash-Punkt unten rechts
  crashDay:      `<g transform="translate(-0.75 -0.25)"><polyline points="3 19 12 4 21 19"/><circle cx="21" cy="19" r="1.5"/></g>`,
  // Angstgegner / Nemesis: klassischer Geist (welliger Unterrand, zwei Augen) — bedrohliche Präsenz
  ghost:         `<g transform="translate(0 0.5)"><path d="M5 10a7 7 0 0114 0v10l-2.3-1.7L14 20l-2-1.7L10 20l-2.3-1.7L5 20z"/><circle cx="10" cy="11" r="1.2"/><circle cx="14" cy="11" r="1.2"/></g>`,
  // ── NEWS / STORY SYSTEM v9 ──
  // Newspaper (Header-Button + leere News-Liste)
  newspaper:     `<rect x="3" y="4" width="15" height="16" rx="2"/><line x1="18" y1="8" x2="21" y2="8"/><path d="M18 8v9a2 2 0 002 2 1 1 0 001-1V8"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="6" y1="11" x2="14" y2="11"/><line x1="6" y1="14" x2="11" y2="14"/>`,
  // Clock (Quiet-Week, Prime-Time)
  clock:         `<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>`,
  // Sort (News-Feed „Neueste zuerst")
  sort:          `<g transform="translate(-1 0)"><path d="M3 6h12M3 12h8M3 18h5"/><path d="M17 9l3-3 3 3M20 6v12"/></g>`,
  // Der Winkel sagt „hier geht es weiter". Ohne ihn sah eine Feed-Karte wie
  // ein Aushang aus, und die Haelfte wurde nie angetippt.
  chevron:       `<g transform="translate(-0.5 0)"><path d="M9 5l7 7-7 7"/></g>`,
  // ── LIGA-REKORDE DER ZWEI KAMMERN [§C35] ──
  // Acht Zeichen, die es sonst nirgends gibt. Ein Rekord zeigt in der Zelle
  // zuerst seine Zeichnung, und zwei gleiche sind dort nicht zu
  // unterscheiden — deshalb nimmt kein neuer Eintrag ein vorhandenes Zeichen.
  // Hochform: drei Balken, die steigen, mit einer Welle darüber — der
  // laufende Abschnitt, nicht die ganze Laufbahn.
  formPeak:      `<g transform="translate(0.5 0)"><path d="M4 20v-5M9 20v-8M14 20v-11M19 20v-6"/><path d="M4 11l5-4 5-3 5 4"/></g>`,
  // Höhenflug: eine flache Linie, aus der am RECHTEN Ende eine Spitze
  // ausbricht — der laufende Abschnitt gegen alles davor. Bewusst anders als
  // `climb` (Treppe mit Pfeil) und `stepsUp` (Stufen): dort geht es stetig
  // nach oben, hier bricht es an einer Stelle aus.
  hochSpitze:    `<g transform="translate(0.5 0.65)"><path d="M3 19h9"/><path d="M12 19l4-13 4 13"/><circle cx="16" cy="5" r="1.3"/></g>`,
  // Der letzte Ball: eine Pfeife mit Schallbogen — der Schlusspfiff eines
  // Spieltags. Die Partie, an die man sich erinnert.
  whistle:       `<g transform="translate(0.5 1.5)"><path d="M3 10h9l1-2h3a3 3 0 010 6h-3l-1 2H6a3 3 0 01-3-3z"/><circle cx="7" cy="13" r="1.4"/><path d="M17 5c2 1 3 2.5 3 4.5"/></g>`,
  // Rückenwind: zwei Böen, die von hinten schieben, mit einer Spitze voran.
  // Wen die Auslosung zuteilt, entscheidet niemand selbst [§C35].
  windBack:      `<g transform="translate(0 0.5)"><path d="M3 9h10a3 3 0 10-3-3"/><path d="M3 15h7a2.5 2.5 0 11-2.5 2.5"/><path d="M15 12h6l-3-3M18 15l3-3"/></g>`,
  // Einzelkämpfer: eine Figur, neben der zwei leere Plätze gestrichelt
  // stehen — die Seite, auf der niemand mitträgt.
  soloPath:      `<g transform="translate(1.4 -0.6)"><circle cx="8" cy="7" r="3"/><path d="M3 20v-2a4 4 0 014-4h2a4 4 0 014 4v2"/><path d="M17 8v3M17 14v3" stroke-dasharray="2 2"/><circle cx="17" cy="20" r="1.2"/></g>`,
  // ── DER EIGENE SCHNITT UND DAS FENSTER ──
  // Uebersoll: eine gestrichelte Erwartungslinie und eine Bahn, die darueber
  // laeuft. Bewusst anders als `trendUp` (nur die Bahn) und `sollMinus` (das
  // Untersoll, dieselbe Frage andersherum) — hier ist die LINIE die Aussage.
  sollPlus:      `<path d="M3 18h18" stroke-dasharray="3 3"/><path d="M4 15l4-4 4 2 4-7 4 3"/>`,
  // Stammplatz: eine Figur auf einem festen Platz, mit Lehne. Anders als
  // `soloPath` (Figur mit leeren Plaetzen daneben) und `refresh` (der
  // Wandler, der die Rolle tauscht): hier bewegt sich nichts.
  roleFix:       `<circle cx="12" cy="6" r="2.6"/><path d="M7 20v-5a3 3 0 013-3h4a3 3 0 013 3v5"/><path d="M4 20h16"/>`,
  // Allrounder: zwei Haelften, beide gefuellt — vorne wie hinten ueber der
  // Erwartung. `switcher` fragt nach dem Gleichmass der Aufstellung, dieses
  // Zeichen nach der Leistung auf beiden Seiten.
  bothSides:     `<path d="M12 3v18"/><path d="M4 7h5M4 12h5M4 17h5"/><path d="M15 7h5M15 12h5M15 17h5"/>`,
  // Abwehrchef: Schild mit Rangwinkeln darin — die Ansage in der Abwehr.
  shieldRank:    `<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/><path d="M9 10l3-2 3 2M9 14l3-2 3 2"/>`,
  // Auftrieb: eine Treppe mit Pfeil — zwei Abschnitte, der zweite höher.
  stepsUp:       `<g transform="translate(-0.5 -0.5)"><path d="M3 20h5v-5h5v-5h5V5"/><path d="M16 8l3-3 3 3"/></g>`,
  // Zwei Monate als Säulen, der Bogen springt von der kurzen zur hohen.
  vormonatSprung:`<g transform="translate(0 -0.75)"><path d="M3 21h18M7 21v-4M17 21V10"/><path d="M6 13c2-6 8-8 11-6"/><path d="M14.5 4.5L17 7l-2.5 2.5"/></g>`,
  // Eine Leiter, daneben der Pfeil nach oben: Plätze gegenüber dem Vormonat.
  leiterAuf:     `<g transform="translate(-1.75 0)"><path d="M6 21V3M13 21V3M6 7h7M6 12h7M6 17h7"/><path d="M19 13V5M16.5 7.5L19 5l2.5 2.5"/></g>`,
  // Angreifer: ein Schuh am Ball — die eigenen Tore, nicht das Ergebnis.
  strikeBoot:    `<g transform="translate(0 0.5)"><path d="M4 8h7l3 4h4a2 2 0 012 2v3H6a2 2 0 01-2-2z"/><path d="M4 20h16"/><circle cx="8" cy="5" r="2"/></g>`,
  // Handschrift: ein Federstrich, der in einer Schlaufe ausläuft — dieselbe
  // Linie in jeder Partie.
  penLine:       `<g transform="translate(0 -0.5)"><path d="M3 17c4-9 7-13 9-13s1 4-1 8-4 6-2 6 4-3 6-6"/><path d="M3 21h18"/></g>`,
  // Fundament: zwei Lagen auf einer Grundlinie — das Gegenstück zur
  // Handschrift, und es liegt unten.
  baseLine:      `<g transform="translate(0 -2)"><path d="M3 21h18"/><rect x="5" y="13" width="14" height="5" rx="1"/><rect x="8" y="7" width="8" height="5" rx="1"/></g>`,
  // Unaufgeregt: eine Linie, die kaum ausschlägt, zwischen zwei Marken —
  // Gleichmäßigkeit als Bild, nicht als Zahl.
  flatWave:      `<path d="M3 12h3l2-2 2 4 2-3 2 2 2-2h3"/><path d="M3 6v12M21 6v12"/>`,
  // ── Die vier neuen Schanden [§C35] ──────────────────────────────
  // Ladehemmung: ein Ball vor dem Tor und ein Strich davor — er kommt
  // nicht durch. Nicht `strikeBoot` gespiegelt: zwei Rubriken tragen nie
  // dieselbe Zeichnung [§C27].
  misfireBall:   `<g transform="translate(0 -1)"><circle cx="9" cy="14" r="4"/><path d="M16 5v14"/><path d="M4 21h16"/><path d="M13 9l6 6M19 9l-6 6"/></g>`,
  // Die acht Monatschroniken, die eine Besonderheit gegen das Eigene oder
  // gegen die Spitze messen [§C39]: je ein eigenes Bild [§C41].
  // Der Ball fliegt ins Tor: vorne mehr als sonst.
  knipser:       `<g transform="translate(-0.5 -1.5)"><circle cx="6.5" cy="15.5" r="3.5"/><path d="M10 13.5l6.5-4.5"/><path d="M13.6 8.6l2.9.4-.4 2.9"/><path d="M14 20h8V7"/></g>`,
  // Ein Riegel vor der Tür: hinten weniger als sonst.
  riegel:        `<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M7 12h12"/><rect x="5.5" y="10" width="4" height="4" rx="1"/><path d="M15 9v6"/>`,
  // Zwei Glieder, die sich zum ersten Mal fassen.
  neuland:       `<g transform="translate(0 2.45)"><path d="M10.5 13.5l-3 3a3 3 0 01-4.2-4.2l3-3a3 3 0 014.2 0"/><path d="M13.5 10.5l3-3a3 3 0 014.2 4.2l-3 3a3 3 0 01-4.2 0"/><path d="M19 2v4M17 4h4"/></g>`,
  // Der Pfeil kehrt zum selben Gegner zurück.
  revanche:      `<g transform="translate(0 -1.5)"><path d="M4 9h11a5 5 0 010 10H9"/><path d="M8 5L4 9l4 4"/><path d="M9 16l-3 3 3 3"/></g>`,
  // Eine Krone mit einem Riss: Partien gegen die beiden Ersten.
  kroneRiss:     `<g transform="translate(0 0.5)"><path d="M3 18l1.6-10 4.4 4.4L12 5l3 7.4L19.4 8 21 18z"/><path d="M12 9l-1.5 3.5 2.5 1.5-1.5 4"/></g>`,
  // Eine Kurve, die mit jedem Wiedersehen steiler wird.
  lernkurve:     `<path d="M3 20h18"/><path d="M4 17c5 0 6-1.5 8-5s3-7 8-7"/><circle cx="8" cy="16.2" r="1.3"/><circle cx="13" cy="10.6" r="1.3"/><circle cx="18" cy="5.4" r="1.3"/>`,
  // Zwei Winkel übereinander: nach dem Sieg gleich der nächste.
  nachlegen:     `<g transform="translate(0 -2)"><path d="M6 12l6-6 6 6"/><path d="M6 19l6-6 6 6"/><path d="M4 22h16"/></g>`,
  // Die Kurve bricht ab: der Monat unter dem Vormonat.
  absturz:       `<path d="M3 4v16h18"/><path d="M6 7h5l2.5 3 2-1 4.5 8"/><path d="M20 13v4.5h-4.5"/>`,
  // Stumme Antwort: eine Sprechblase, durchgestrichen — es kommt nichts
  // zurück.
  mutedReply:    `<g transform="translate(0 1)"><path d="M4 5h16v10H12l-5 4v-4H4z"/><path d="M8 3l12 14"/></g>`,
  // Wackelkandidat: eine Stufe, die unter dem Fuß nachgibt — der Favorit,
  // der einbricht.
  wobbleStep:    `<g transform="translate(0 -2.5)"><path d="M3 8h7v5h7v5h4"/><path d="M6 18l3 3M10 18l3 3"/></g>`,
  // Klotz am Bein: ein Gewicht an einer Kette — was die Mitspieler
  // mitziehen.
  dragWeight:    `<path d="M12 3v6"/><path d="M9 9h6l2 12H7z"/><path d="M10 6h4"/>`,
  // ── Zeichen der Liga-Rekorde [§C35] ────────────────────────────────
  // Jedes muss sich von jedem anderen unterscheiden: in einer Zelle von 62
  // Pixeln ist die Zeichnung das Erste, was man sieht, und zwei gleiche sind
  // dort nicht auseinanderzuhalten.
  //
  // Elo-Transfer: ein Bumerang als geschlossene Klinge — zwei gebogene
  // Kanten, die sich an den Enden treffen. Zwei einzelne Striche im Winkel
  // waren bei 62 px nicht von einem Knick zu unterscheiden, und die Kontur
  // allein sah aus wie ein Telefonhoerer.
  boomerang:     `<g transform="translate(1.5 0.5)"><path d="M4 4c1 6 5 12 11 15l2-4c-4-2-7-6-8-11z"/></g>`,
  // Rollencoup: zwei Felder und ein Pfeil, der von einem ins andere fuehrt —
  // Sturm und Abwehr, und die Seite, auf der es geklappt hat.
  posSwap:       `<rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="13" width="7" height="7" rx="1"/><path d="M10 7h7v6"/><polyline points="14 10 17 13 20 10"/>`,
  // Wiedereinstieg: eine Tuer und ein Pfeil hinein — die erste Partie nach
  // der Pause.
  doorReturn:    `<g transform="translate(-0.5 0)"><path d="M4 3h9v18H4z"/><circle cx="10" cy="12" r="1"/><path d="M21 12h-5"/><polyline points="19 9 16 12 19 15"/></g>`,
  // Umsteiger: die Position wechselt, hinauf in den Sturm, hinunter in die
  // Abwehr.
  // Aufschwung: die Kurve steigt aus der Grundlinie und bleibt oben.
  // Glanztag: ein Tag im Kalender mit einem Stern.
  glanztag:      `<g transform="translate(0 0.5)"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M12 12.4l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z"/></g>`,
  // Abschwung: die Kurve fällt aus der Höhe und bleibt unten, das
  // Gegenstück zum Aufschwung.
  abschwung:     `<g transform="translate(0 -1)"><path d="M3 21h18"/><path d="M3 5c4 0 6 1 9 5s5 6 9 7"/><polyline points="16 17 21 17 20 12"/></g>`,
  // Rost: ein Zahnrad, an dem Flocken haften — nach der Pause nicht in Gang.
  rost:          `<g transform="translate(-0.01 0.5)"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><path d="M19.5 3.5h.01M21 6h.01M18 2h.01"/></g>`,
  // Wanderpass: ein Gesicht oben, und der Weg gabelt sich zu zwei
  // verschiedenen Partnern — nie zweimal derselbe hintereinander.
  partnerWalk:   `<circle cx="12" cy="5.5" r="2.5"/><path d="M12 8v4l-6 5M12 12l6 5"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>`,
  // Pendler: ein Pendel an seinem Aufhaengepunkt und der Bogen, den es
  // schlaegt — Sturm, Abwehr, Sturm.
  pendulum:      `<g transform="translate(0.15 -1.67)"><path d="M8 3h8M12 3l-4 12"/><circle cx="7.2" cy="17.5" r="2.5"/><path d="M5 21a9 9 0 0014 0"/></g>`,
  // Spurwechsel: zwei Fahrbahnraender und eine Linie, die von einer Spur in
  // die andere springt — Favorit, Aussenseiter, Favorit.
  laneSwap:      `<path d="M4 3v18M20 3v18"/><path d="M9 20l6-4-6-4 6-4"/><polyline points="12 4 15 4 15 7"/>`,
  // Serienstopp: eine erhobene Hand. Ein Feuer wie bei `flameBreak` waere
  // bei 62 px dieselbe Zeichnung gewesen.
  handStop:      `<path d="M8 12V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V5.5a1.5 1.5 0 013 0V13M17 13v-2.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a6 6 0 01-4.8-2.4L4.4 15a1.5 1.5 0 012.3-1.9L8 14.5"/>`,
  // Quertreiber: zwei Pfeile, die sich kreuzen — der eine steigt, wo der
  // andere fallen muesste.
  crossFlip:     `<g transform="translate(1 0)"><path d="M4 19L18 5"/><polyline points="13 5 18 5 18 10"/><path d="M4 5l5 5M13 14l5 5"/><polyline points="13 19 18 19 18 14"/></g>`,
  // Tagesumkehr: ein Pfeil, der umkehrt — der Tag endet anders, als er
  // begann.
  uTurn:         `<g transform="translate(-1.75 -1)"><path d="M7 21V10a5 5 0 0110 0v7"/><polyline points="13.5 14 17 17.5 20.5 14"/></g>`,
  // Staffellauf: ein Stab und zwei Haende an seinen Enden — die Uebergabe
  // an einen neuen Partner.
  baton:         `<path d="M6 18L18 6"/><path d="M4.5 15.5l4 4M15.5 4.5l4 4"/><circle cx="5" cy="5" r="1.6"/><circle cx="19" cy="19" r="1.6"/>`,
  // Seitenbuendnis: zwei Gesichter, die eben noch gegenueberstanden, und ein
  // Plus dazwischen — wer Gegner war, steht jetzt daneben.
  sideJoin:      `<circle cx="6.5" cy="7" r="2.5"/><circle cx="17.5" cy="7" r="2.5"/><path d="M3 20v-2a3.5 3.5 0 013.5-3.5M21 20v-2a3.5 3.5 0 00-3.5-3.5"/><path d="M12 13v6M9 16h6"/>`,
  // Bedienung: Schließen, Warten, Warnen, Löschen — der Hinweis und die
  // Bestätigung tragen ihre Rolle als Zeichen [§C27].
  x:             `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`,
  hourglass:     `<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4.5 4 5.5 4 8.5s-4 4-4 8.5M16 3.5c0 4.5-4 5.5-4 8.5s4 4 4 8.5"/>`,
  alert:         `<path d="M12 4.2l8.6 15a1 1 0 01-.9 1.5H4.3a1 1 0 01-.9-1.5z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.4" r=".6" fill="currentColor"/>`,
  trash:         `<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>`,
  hochladen:     `<path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"/><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/>`,
  // Zwei Kettenglieder: der Faden einer Karte zu der, die sie fortsetzt [§C33].
  faden:         `<path d="M9.5 14.5l5-5"/><path d="M11 6.5l1.4-1.4a4 4 0 015.6 5.6L16.5 12M13 17.5l-1.4 1.4a4 4 0 01-5.6-5.6L7.5 12"/>`,
  // ═══ Ein Zeichen, eine Bedeutung [§C41] ═══════════════════════════════
  // Die Zeichen ab hier kamen aus dem Entwurf mockup/aufwertung-6. Vorher
  // trug ein Zeichen oft mehrere Sachen: die Krone stand für Meistertitel,
  // Traummonat, Highlights, Legende, Titelverteidiger und Spitzenwechsel,
  // der Blitz für Stürmer, Sturm-Flex, den kompletten Stürmer und die
  // Eilmeldung. Jetzt hat jede Bedeutung ihr Zeichen; dieselbe Sache in
  // mehreren Systemen teilt eins (tests/disziplinen führt die Familien).
  // ── Ränge: eine Leiter aus Winkeln, damit die fünf Stufen sich als Folge
  // lesen. Heute waren es Person, Schild, Medaille, Stern und Krone — fünf
  // Zeichen, die in anderen Systemen schon anderes bedeuten.
  rang1:  `<g transform="translate(0 -0.75)"><path d="M6 15l6-4.5 6 4.5"/></g>`,
  rang2:  `<g transform="translate(0 -0.75)"><path d="M6 12.5l6-4.5 6 4.5M6 17.5l6-4.5 6 4.5"/></g>`,
  rang3:  `<path d="M6 9.5L12 5l6 4.5M6 14l6-4.5 6 4.5M6 18.5l6-4.5 6 4.5"/>`,
  rang4:  `<path d="M12 2.2l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/><path d="M6 13l6-4 6 4M6 17l6-4 6 4M6 21l6-4 6 4"/>`,
  rang5:  `<path d="M7 8.2L6.2 3.5l3 2.1L12 2.2l2.8 3.4 3-2.1L17 8.2z"/><path d="M6 13l6-4 6 4M6 17l6-4 6 4M6 21l6-4 6 4"/>`,

  // ── Positionen: der Tisch von oben, halbiert. Der Punkt steht, wo der
  // Spieler steht; Flex trägt beide Hälften. Heute teilten sich Stürmer,
  // Sturm-Flex, der komplette Stürmer und die Eilmeldung einen Blitz.
  posSturm:      `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="2" fill="currentColor"/>`,
  posSturmFlex:  `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="2" fill="currentColor"/><circle cx="12" cy="16.5" r="1.3"/>`,
  posFlex:       `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="1.8"/><circle cx="12" cy="16.5" r="1.8"/>`,
  posAbwehrFlex: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="12" cy="16.5" r="2" fill="currentColor"/>`,
  posAbwehr:     `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="16.5" r="2" fill="currentColor"/>`,
  posReinSturm:  `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12V5a2 2 0 012-2h10a2 2 0 012 2v7z" fill="currentColor" fill-opacity=".3"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="2" fill="currentColor"/>`,
  posReinAbwehr: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7z" fill="currentColor" fill-opacity=".3"/><path d="M5 12h14"/><circle cx="12" cy="16.5" r="2" fill="currentColor"/>`,
  // Der Spezialist: auf einer Hälfte weit besser als auf der anderen.
  spezialist:    `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><path d="M9 8l2 1.8 4-3.8"/>`,

  // ── Die Liga und ihre Rubriken
  tafelStein:    `<path d="M5 21V8.5a7 5.5 0 0114 0V21z"/><path d="M9 11h6M9 14.5h6M9 18h4"/>`,
  verlauf:       `<path d="M3.5 12a8.5 8.5 0 102.5-6"/><path d="M3.5 3.5V8H8"/><path d="M12 7.5V12l3 2"/>`,
  saisonKal:     `<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M10 19v-6.5h5l-1.3 1.8L15 16h-5"/>`,
  idee:          `<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>`,
  sirene:        `<g transform="translate(0 0.5)"><path d="M7 17v-5a5 5 0 0110 0v5"/><rect x="5" y="17" width="14" height="3.5" rx="1"/><path d="M12 2.5v2M4.3 5.8l1.4 1.4M19.7 5.8l-1.4 1.4M10 12a2 2 0 012-2"/></g>`,
  funkeln:       `<g transform="translate(0 0.5)"><path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8z"/><path d="M18 14l.9 2.1 2.1.9-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z"/></g>`,
  abzeichen:     `<path d="M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z"/><path d="M12 8.2l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 14.2l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z"/>`,
  spielfeld:     `<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/><path d="M3 9.5h1.8v5H3M21 9.5h-1.8v5H21"/>`,

  // ── Partie und Spieltag
  premiere:      `<circle cx="8" cy="12" r="2.6"/><circle cx="16" cy="12" r="2.6"/><path d="M3.2 21a4.8 4.8 0 019.6 0M11.2 21a4.8 4.8 0 019.6 0"/><path d="M12 2.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 4.3l2-.3z"/>`,
  spitzenwechsel:`<path d="M10.5 8.5l2-1.5V17"/><path d="M4 9a8.5 8.5 0 0114.5-3.5M20 15a8.5 8.5 0 01-14.5 3.5"/><path d="M18.8 2.5v3.3h-3.3M5.2 21.5v-3.3h3.3"/>`,
  rollencoup:    `<g transform="translate(-0.5 0)"><rect x="4" y="7" width="11" height="14" rx="2"/><path d="M4 14h11"/><path d="M13 3h8v8"/><path d="M21 3l-8 8"/></g>`,

  // ── Duos und Partner
  partnerHebel:  `<g transform="translate(0 -1)"><circle cx="12" cy="9" r="3"/><path d="M7 20a5 5 0 0110 0"/><path d="M4 14V7M2 9l2-2 2 2M20 14V7M18 9l2-2 2 2"/></g>`,
  jederPartner:  `<g transform="translate(0 -0.75)"><circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="5.5" r="2"/><circle cx="19" cy="5.5" r="2"/><circle cx="12" cy="20" r="2"/><path d="M10.1 10.3L6.5 7M13.9 10.3L17.5 7M12 14.6V18"/></g>`,
  augenhoehe:    `<g transform="translate(0 -1.2)"><circle cx="7" cy="9" r="2.6"/><circle cx="17" cy="9" r="2.6"/><path d="M2 9h2.4M9.6 9h4.8M19.6 9H22"/><path d="M2.5 20a4.5 4.5 0 019 0M12.5 20a4.5 4.5 0 019 0"/></g>`,
  schattenmann:  `<g transform="translate(0 -0.6)"><circle cx="9" cy="7.5" r="3.3"/><path d="M3 21v-1a6 6 0 0112 0v1"/><path d="M15.5 4.3a3.3 3.3 0 010 6.4M18 14.6c1.8 1 3 3 3 5.4v1" stroke-dasharray="1.8 2.2"/></g>`,

  // ── Gegner und Rechnung
  geistBann:     `<path d="M6 20V10.5a6 6 0 0112 0V20l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z"/><path d="M10 11h.01M14 11h.01"/><path d="M3 3l18 18"/>`,
  jederGegner:   `<circle cx="12" cy="12" r="8"/><path d="M8.6 12.2l2.3 2.2 4.5-4.6"/><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5"/>`,
  bilanzTief:    `<circle cx="12" cy="12" r="9"/><path d="M12 12V3a9 9 0 013.8.84z" fill="currentColor" fill-opacity=".45"/><path d="M12 12V3"/>`,
  ausreisser:    `<path d="M3.5 3.5v17h17"/><circle cx="7.5" cy="16.5" r="1"/><circle cx="10.5" cy="15" r="1"/><circle cx="8.5" cy="13" r="1"/><circle cx="12" cy="17" r="1"/><circle cx="17.5" cy="7" r="2.2"/>`,
  wunderWoche:   `<g transform="translate(0 -0.5)"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18"/><path d="M12 11.8l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/></g>`,
  schwererTag:   `<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M10 14a2 2 0 014 0"/><path d="M8.8 14.5h6.4l.9 4H7.9z"/>`,

  // ── Serien, Form und Verlauf
  sturzflug:     `<g transform="translate(0.5 -0.5)"><circle cx="16" cy="17" r="3.5"/><path d="M13.4 14.6L4.5 5.7M15.2 13.6L10 4.5M12.4 16.4L3.5 11"/></g>`,
  zweiteLuft:    `<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M12 8.8L9.3 12.4h3.4L10 15.6"/>`,
  steigerung:    `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor" fill-opacity=".35"/><path d="M12 3v18"/>`,
  umschwung:     `<rect x="3" y="13" width="6" height="7.5" rx="1"/><rect x="15" y="5.5" width="6" height="15" rx="1"/><path d="M6 10c1.5-3.5 4-5 7.5-5"/><path d="M11.5 3l2 2-2 2"/>`,
  wechselhaft:   `<path d="M2 12h20" stroke-dasharray="1.5 2.5"/><path d="M2 12c2.5-9 5-9 7.5 0s5 9 7.5 0c1.2-4 2.5-6 5-6"/>`,
  formGipfel:    `<path d="M3 20h18"/><path d="M3 16.5l4.5-3.5 3.5 2 4.5-8.5L21 16"/><circle cx="15.5" cy="6.5" r="1.8" fill="currentColor"/>`,
  sollMinus:     `<path d="M3 6h18" stroke-dasharray="3 3"/><path d="M4 9l4 4 4-2 4 7 4-3"/>`,
  schwaechsterTag:`<g transform="translate(0 -1)"><path d="M3 20.5h18"/><path d="M3 11h18" stroke-dasharray="1.5 2.5"/><path d="M6.5 20.5V8M10.5 20.5V10M14.5 20.5V5.5M18.5 20.5V9"/></g>`,
  wochenschluss: `<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.3 8v8M10.1 8v8M13.9 8v8M17.7 8v8"/><path d="M17.7 8h2.3a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-2.3z" fill="currentColor" fill-opacity=".45"/>`,
  tagesabschluss:`<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/><path d="M9.5 13l2 2 3.5-4"/>`,
  thron:         `<path d="M7 21v-3.5M17 21v-3.5"/><path d="M5.5 17.5h13v-4h-13z"/><path d="M8 13.5V5l4-2.5L16 5v8.5"/>`,
  sturmfuehrer:  `<path d="M5.5 21.5V3"/><path d="M5.5 3.5H18l-3 4.25L18 12H5.5"/>`,

  // ── Tore und Abwehr
  weisseWeste:   `<path d="M8.5 3L3.5 6l2 4.2L8 9.2V21h8V9.2l2.5 1L20.5 6l-5-3a3.5 3.5 0 01-7 0z"/>`,
  widerstand:    `<path d="M3 12h9.5M9.5 8.5L13 12l-3.5 3.5"/><path d="M16.5 4v16M20.5 6.5v11"/>`,
  abrissbirne:   `<path d="M3.5 3h10"/><path d="M8.5 3v6.5"/><circle cx="8.5" cy="15" r="5"/><path d="M16.5 10.5l3.5-1.3M17 15h4M16.5 19.3l3.5 1.4"/>`,
  torhagel:      `<path d="M7 14.5a4 4 0 01-.4-8A5.5 5.5 0 0117 7a3.7 3.7 0 01.4 7.5z"/><circle cx="8" cy="18.6" r="1.3"/><circle cx="12.4" cy="20.4" r="1.3"/><circle cx="16.6" cy="18" r="1.3"/>`,
  dreiSaisons:   `<path d="M12 2.5l7.5 3.4v5.6c0 4.7-3.2 8.6-7.5 10-4.3-1.4-7.5-5.3-7.5-10V5.9z"/><path d="M9 9v6M12 9v6M15 9v6"/>`,
  nulldiaet:     `<circle cx="12.5" cy="12" r="6.5"/><circle cx="12.5" cy="12" r="3.5"/><path d="M2.5 4v4.5a1.5 1.5 0 003 0V4M4 9v11M21.5 4v16M21.5 4c-1.8 1-2.3 4-2.3 6h2.3"/>`,

  // ── Zählstände und Leitern
  dauerbrenner:  `<path d="M8.5 21h7M10 21V10h4v11"/><path d="M12 10V8.2"/><path d="M12 2.8c1.4 1.5 1.9 2.8 0 4.3-1.9-1.5-1.4-2.8 0-4.3z"/>`,
  urgestein:     `<g transform="translate(0 -1)"><path d="M3 20.5h18l-2.5-6.5-3-2.5L13 5.5 9.5 8.5 6 13z"/><path d="M5.3 15.5h13.5M7.6 11.5h8"/></g>`,
  siegermaschine:`<g transform="translate(0 -0.6)"><path d="M10.3 2.5h3.4l.5 2.4 1.6.7 2.1-1.3 2.4 2.4-1.3 2.1.7 1.6 2.4.5v3.4l-2.4.5-.7 1.6 1.3 2.1-2.4 2.4-2.1-1.3-1.6.7-.5 2.4h-3.4l-.5-2.4-1.6-.7-2.1 1.3-2.4-2.4 1.3-2.1-.7-1.6-2.4-.5v-3.4l2.4-.5.7-1.6-1.3-2.1 2.4-2.4 2.1 1.3 1.6-.7z"/><path d="M9.3 12.2l1.9 1.9 3.5-3.8"/></g>`,
  gleichmass:    `<g transform="translate(0 -1)"><path d="M3 19.5h18"/><path d="M4.5 19.5c3.5 0 4.5-13 7.5-13s4 13 7.5 13"/><path d="M8.5 13h7" stroke-dasharray="1.5 2"/></g>`,
  zitterkrone:   `<g transform="translate(0 -0.5)"><path d="M6 18l-1-9 4 3 3-5 3 5 4-3-1 9z"/><path d="M2.5 9.5l1 1.5-1 1.5M21.5 9.5l-1 1.5 1 1.5"/></g>`,
  kaltblut:      `<g transform="translate(-2 -0.08)"><path d="M10 4.2a2 2 0 014 0v10.3a4 4 0 11-4 0z"/><path d="M12 15.5V12"/><path d="M17 5h3M17 8.5h2"/></g>`,

  // ── Neu gezeichnet, weil zwei Zeichnungen Zwillinge waren (der alte
  //    Name steht in ZEICHEN_ALT und zeigt hierher)
  pille:         `<path d="M4.7 13.6l8.9-8.9a4 4 0 015.7 5.7l-8.9 8.9a4 4 0 01-5.7-5.7z"/><path d="M9.2 9.1l5.7 5.7"/>`,
  // Zwei Beine, deren Knie zueinander einknicken, daneben das Zittern:
  // „Die weichen Knie" verlieren die Partie, die der letzte Ball entscheidet.
  weicheKnie:    `<path d="M9 3v6l3 4-3 4v4M15 3v6l-3 4 3 4v4"/><path d="M5.5 10.5l-2 1M5.5 15.5l-2-1M18.5 10.5l2 1M18.5 15.5l2-1"/>`,
  // ── Sechs Monatschroniken: Gegner der Laufbahn, Partner, Sturm, Schluss
  // Ein Kreis, der nicht schließt, und ein Pfeil, der aus ihm herausführt:
  // „Der Bannbrecher" kommt gegen den schwierigsten Gegner heraus.
  bannbruch:     `<g transform="translate(1.15 6.31)"><path d="M17.7 6.3A8 8 0 104 12"/><path d="M11 13l9-9"/><path d="M15 4h5v5"/></g>`,
  // Eine Hand, die von unten hält: „Die Stütze" neben dem, der gerade fällt.
  stuetze:       `<g transform="translate(1 0)"><circle cx="14" cy="6" r="3"/><path d="M3 14h4l3.5 3H17a2 2 0 000-4h-3.5"/><path d="M7 14v7H3"/></g>`,
  // Ein Tropfen und ein getroffenes Ziel: „Das Zielwasser".
  zielwasser:    `<g transform="translate(-0.5 0.5)"><path d="M8 3c2.6 3 4 5.2 4 7a4 4 0 01-8 0c0-1.8 1.4-4 4-7z"/><circle cx="17" cy="16" r="4"/><circle cx="17" cy="16" r="1" fill="currentColor"/></g>`,
  // Ein Pfeil, der zurückkommt und dorthin trifft, woher er kam:
  // „Die Retourkutsche" des liebsten Gegners.
  retourkutsche: `<g transform="translate(0 0.98)"><path d="M20 12a8 8 0 11-3-6.2"/><path d="M17 2v4h-4"/><path d="M8.5 12h7"/></g>`,
  // Eine Note und ein Pfeil nach unten: „Der Abgesang" in der letzten Partie.
  abgesang:      `<g transform="translate(-1 -0.5)"><path d="M9 18V6l8-2v9"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="14.5" cy="13" r="2.5"/><path d="M20 15v6M18 19l2 2 2-2"/></g>`,
  // Einer allein und eine Frage daneben: „Das Fremdeln" neben neuen Partnern.
  fremdeln:      `<circle cx="7" cy="8" r="2.5"/><path d="M2.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5"/><path d="M15 6.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5"/><circle cx="17.5" cy="15" r=".7" fill="currentColor"/><path d="M14 20h7"/>`,
  // ── Die sechste Fassung der Monatschronik [§C39] ────────────────
  // Zwei Figuren und ein Hin und Her: „Das Stammduell" gegen den Gegner,
  // den der Monat am häufigsten gegenüberstellte. Keine gekreuzten
  // Schwerter — die gehören der Rivalität zweier Teams.
  stammduell:    `<circle cx="5" cy="7" r="2.5"/><circle cx="19" cy="7" r="2.5"/><path d="M2 20c0-3 1.3-5 3-5s3 2 3 5M16 20c0-3 1.3-5 3-5s3 2 3 5"/><path d="M9 9.5h6M13 7.5l2 2-2 2M15 14H9M11 12l-2 2 2 2"/>`,
  // Ein Großer über einem Kleinen: „Die Übermacht" desselben Gegners.
  uebermacht:    `<g transform="translate(0.5 0.5)"><circle cx="15" cy="5" r="3"/><path d="M9 21v-6a6 6 0 0112 0v6"/><circle cx="5" cy="13" r="1.8"/><path d="M2 21v-2.5a3 3 0 016 0V21"/></g>`,
  // Ein Stern auf dem Podest: „Die Favoritenrolle", getragen.
  favoritenrolle:`<path d="M4 21h16"/><path d="M8 21v-7h8v7"/><path d="M12 3.5l1.4 2.8 3.1.5-2.2 2.2.5 3.1-2.8-1.5-2.8 1.5.5-3.1-2.2-2.2 3.1-.5z"/>`,
  // Drei Stufen hinauf: „Der Siegeszug", eine Serie gegen die Rechnung.
  siegeszug:     `<g transform="translate(0 -1.5)"><path d="M3 17l3-3 3 3M9 13l3-3 3 3M15 9l3-3 3 3"/><path d="M3 21h18"/></g>`,
  // Drei Luftzüge, der unterste reicht am weitesten: „Der lange Atem".
  langerAtem:    `<g transform="translate(0 2)"><path d="M3 8h9a3 3 0 10-3-3"/><path d="M3 12h15a3 3 0 11-3 3"/><path d="M3 16h7"/></g>`,
  // Ein Tor und ein Ball davor: „Die Torgefahr" im Sturm.
  torgefahr:     `<g transform="translate(-0.15 -1)"><path d="M3 20V6h11v14"/><path d="M3 10h11"/><circle cx="18.5" cy="15" r="2.8"/><path d="M15.5 15H12"/></g>`,
  // Ein Schild über einer Mauer: „Der Abwehrwall".
  abwehrwall:    `<path d="M12 2.5l5 2v3.5c0 2.8-2.2 4.3-5 5.2-2.8-.9-5-2.4-5-5.2V4.5z"/><rect x="3" y="14" width="18" height="7" rx="1"/><path d="M3 17.5h18M9 14v3.5M15 14v3.5M12 17.5V21"/>`,
  // Ein Pfeil von hinten nach vorn zum Ball: „Der Aufbauspieler".
  aufbau:        `<circle cx="17.5" cy="6.5" r="3"/><path d="M4 20l9-9"/><path d="M8 11h5v5"/><path d="M3 20h4"/>`,
  // Ein Mond und ein Pfeil zurück: „Die späte Revanche", eine Nacht danach.
  spaeteRevanche:`<g transform="translate(-1.38 -0.75)"><path d="M10 3.5a6 6 0 107.5 7.5 7 7 0 01-7.5-7.5z"/><path d="M21 19h-9"/><path d="M15 16l-3 3 3 3"/></g>`,
  // Eine Krone auf der hohen Stufe, die niedrige weit daneben: „Der
  // Souverän" an der Spitze, mit Abstand.
  souveraen:     `<g transform="translate(0 -0.5)"><path d="M2 21h20"/><path d="M14 21V11h7v10"/><path d="M3 21v-4h6v4"/><path d="M14 8l1.5-4 2 2.5 2-2.5L21 8z"/></g>`,
  // Ein Platz, ein Bogen, ein anderer Platz: „Der Platztausch".
  platztausch:   `<rect x="3" y="14" width="6" height="6" rx="1"/><rect x="15" y="4" width="6" height="6" rx="1"/><path d="M6 11c0-3.5 3.5-4.5 8.5-4.5"/><path d="M12 4l2.5 2.5L12 9"/>`,
  // Eine Nadel in einem Feld: „Das Festhalten" an der Position.
  festhalten:    `<g transform="translate(0 0.6)"><rect x="4" y="12" width="16" height="8" rx="1"/><path d="M12 15V7"/><circle cx="12" cy="5" r="2.2"/><path d="M8 20v-2M16 20v-2"/></g>`,
  // Stufen hinab und ein Pfeil: „Der Abrutsch" in der Tabelle.
  abrutsch:      `<g transform="translate(1.5 0)"><path d="M3 4h5v5h5v5h5v6"/><path d="M8 4l9 9"/><path d="M17 8v5h-5"/></g>`,
  // Ein leeres Tor und ein Pfeil nach unten: „Die Torflaute".
  torflaute:     `<g transform="translate(0 -1)"><path d="M4 20V6h16v14"/><path d="M4 10h16"/><path d="M12 12.5v5.5M9.5 15.5l2.5 2.5 2.5-2.5"/></g>`,
  // Ein Schild mit einem Riss: „Das Leck" in der Abwehr.
  leck:          `<g transform="translate(0 1)"><path d="M12 3l7 3v5c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6z"/><path d="M12.5 6l-2.5 4 3 2-2.5 4.5"/></g>`,
  // Eine Tafel mit minus sieben: „Die Klatsche".
  klatsche:      `<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M6 12h4"/><path d="M13 9h5l-3.5 6"/>`,
  // Ein Kalenderblatt, durchgestrichen: „Der Tag zum Vergessen". Nicht das
  // Zeichen des schwarzen Tages — der zählt Niederlagen, dieser die Rechnung.
  tagVergessen:  `<g transform="translate(0 0.5)"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"/></g>`,
  // Eine Stempelkarte, fünf Felder gestempelt, im sechsten der Haken: „Der
  // Stammkunde" verliert gegen denselben Gegner, bis ein Sieg gelingt.
  // Nicht das Schloss des Ausbruchs — der zählt den Bruch, dieser die Serie.
  stammkunde:    `<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="7" cy="9.5" r="1.6" fill="currentColor" fill-opacity=".45"/><circle cx="12" cy="9.5" r="1.6" fill="currentColor" fill-opacity=".45"/><circle cx="17" cy="9.5" r="1.6" fill="currentColor" fill-opacity=".45"/><circle cx="7" cy="14.5" r="1.6" fill="currentColor" fill-opacity=".45"/><circle cx="12" cy="14.5" r="1.6" fill="currentColor" fill-opacity=".45"/><path d="M15.4 14.6l1.2 1.2 2.4-2.6"/>`,
  // Ein Bündel Stroh: „Das Strohfeuer" brennt hell und kurz. Bewusst keine
  // Flamme — die steht für die laufende Siegesserie [§C41].
  strohfeuer:    `<path d="M12 21V10"/><path d="M12 10L7 3M12 10l5-7M12 10L9.5 3M12 10l2.5-7"/><path d="M8 21h8"/><path d="M9 14h6"/>`,
  schwarzerTag:  `<circle cx="12" cy="12" r="4.8" fill="currentColor" fill-opacity=".55"/><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M5.1 18.9l1.8-1.8M17.1 6.9l1.8-1.8"/>`,
  ueberholen:    `<circle cx="12" cy="16" r="2.4"/><path d="M3.5 18c0-6.5 4.2-10 10.5-10h6"/><path d="M17 5l3 3-3 3"/>`,
  rakete:        `<path d="M12 2.5c3 2 4.5 5.5 4.5 9.5l-2 3h-5l-2-3c0-4 1.5-7.5 4.5-9.5z"/><circle cx="12" cy="9" r="1.6"/><path d="M9.5 15l-2.5 2.5V20l2.5-1.5M14.5 15l2.5 2.5V20l-2.5-1.5M12 17.5V21"/>`,
  betonmauer:    `<circle cx="8" cy="5" r="2.2"/><circle cx="16" cy="5" r="2.2"/><path d="M4.5 11a3.5 3.5 0 017 0M12.5 11a3.5 3.5 0 017 0"/><rect x="3" y="11" width="18" height="10" rx="1"/><path d="M3 16h18M9 11v5M15 11v5M12 16v5"/>`,
  // ── Die Bedienung und die letzten Doppelungen
  rekord:        `<path d="M12 2.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L12 9l-2.6 1.4.5-2.9-2.1-2 2.9-.4z"/><path d="M3.5 21v-5h5v-3h7v5h5v3z"/>`,
  sichern:       `<path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"/><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/>`,
  neuRechnen:    `<path d="M19.5 10.5A7.8 7.8 0 005.6 7L4 8.6"/><path d="M4 3.8v4.8h4.8"/><path d="M4.5 13.5A7.8 7.8 0 0018.4 17l1.6-1.6"/><path d="M20 20.2v-4.8h-4.8"/>`,
  wippe:         `<g transform="translate(0 -2.5)"><path d="M3 14h18"/><path d="M12 14l-3 6.5h6z"/><circle cx="6.5" cy="10.8" r="2.3"/><rect x="15.3" y="8.6" width="4.4" height="4.4" rx=".6"/></g>`,
  marke:         `<g transform="translate(0 -0.5)"><path d="M5 21.5V3.5"/><path d="M5 4h14v9H5"/><path d="M5 4h4.7v4.5H5zM14.3 4H19v4.5h-4.7zM9.7 8.5h4.6V13H9.7z" fill="currentColor" fill-opacity=".45"/></g>`,
  kontrast:      `<path d="M3 20.5h18"/><rect x="5" y="4" width="5" height="16.5" rx="1"/><rect x="14" y="16" width="5" height="4.5" rx="1"/><path d="M16.5 5v7.5M14.8 10.8l1.7 1.7 1.7-1.7"/>`,
  spaetStart:    `<g transform="translate(-0.15 -1.85)"><path d="M3 17.5h9.5c3.2 0 5.3-3.6 6.5-10"/><path d="M16.2 9.3l2.8-2.6 2.3 3"/><path d="M3 21h18" stroke-dasharray="1.5 2.5"/></g>`,
  // ── Disziplinen, die nebeneinander in der Chronik stehen: dort braucht
  //    jede ihr eigenes Bild, auch wo sie mit einem Award dieselbe Sache meint
  massstab:       `<path d="M3.5 15.5L15.5 3.5l5 5-12 12z"/><path d="M7 12l2 2M9.5 9.5l1.5 1.5M12 7l2 2M14.5 4.5l1.5 1.5"/>`,
  zepter:         `<g transform="translate(-1.25 1.25)"><path d="M4.5 19.5L14 10"/><circle cx="16.5" cy="7.5" r="3"/><path d="M16.5 2v2M22 7.5h-2.2M19.4 3.6l-.9.9"/><path d="M6.2 15.2l2.6 2.6"/></g>`,
  wochenkrone:    `<g transform="translate(-0.01 -0.85)"><path d="M6.5 12l-1.2-6 3.4 2.4L12 4.5l3.3 3.9 3.4-2.4-1.2 6z"/><path d="M3 19h.01M6 20.3h.01M9 21h.01M12 21.2h.01M15 21h.01M18 20.3h.01M21 19h.01"/></g>`,
  bollwerk:       `<g transform="translate(0 -1.25)"><path d="M4 21.5V8h3V5h3v3h4V5h3v3h3v13.5z"/><path d="M10 21.5v-5a2 2 0 014 0v5"/></g>`,
  antwort:        `<g transform="translate(1.3 -1.2)"><path d="M4 7h9.5a5.5 5.5 0 010 11H8"/><path d="M11 15l-3 3 3 3"/><circle cx="4" cy="7" r="1.6" fill="currentColor"/></g>`,
  aufstehen:      `<path d="M3 21h18"/><circle cx="12" cy="5" r="2.4"/><path d="M12 8.5V16M8.5 12L12 8.5l3.5 3.5"/><path d="M8 21l4-4 4 4"/>`,
  abwehrFenster:  `<rect x="5" y="3" width="14" height="18" rx="2" stroke-dasharray="2.4 2.2"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7z" fill="currentColor" fill-opacity=".3"/><path d="M5 12h14"/><circle cx="12" cy="16.5" r="2" fill="currentColor"/>`,
  lieblingszahl:  `<path d="M9.5 3L7.5 21M16.5 3l-2 18M4 8.5h16.5M3.5 15.5h16.5"/>`,
  eiskalt:        `<g transform="translate(0.25 0.5)"><path d="M12 3v10M7.7 5.5l8.6 5M7.7 10.5l8.6-5"/><path d="M3 18.5l1.5 1.5 3-3M9.5 18.5l1.5 1.5 3-3M16 18.5l1.5 1.5 3-3"/></g>`,
  fehlstart:      `<g transform="translate(0 0.5)"><circle cx="12" cy="13" r="7.5"/><path d="M12 2.5v3M9.5 2.5h5"/><path d="M9.5 10.5l5 5M14.5 10.5l-5 5"/></g>`,
  kraefteverfall: `<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M5.5 10v4" stroke-width="2.4"/>`,
  einbruch:       `<path d="M3 4v16h18"/><path d="M6 8h6l2 2 2 6 3 1"/><path d="M12 5v14" stroke-dasharray="1.5 2"/>`,
  sattheit:       `<g transform="translate(0 -0.75)"><path d="M3 12h18a9 9 0 01-18 0z"/><path d="M8 8c0-1.5 1.5-1.5 1.5-3.5M12.5 8c0-1.5 1.5-1.5 1.5-3.5"/></g>`,
  ehrfurcht:      `<path d="M6 10l-1.5-6 4 3L12 3l3.5 4 4-3L18 10z"/><path d="M12 13v8M9 18l3 3 3-3"/>`,
  rueckfall:      `<g transform="translate(0 0.5)"><path d="M3 17c3-9 6-11 9-11s5 6 9 11"/><path d="M21 13v4h-4"/></g>`,
  wochenloch:     `<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><rect x="6.5" y="12" width="11" height="5.5" rx="1" fill="currentColor" fill-opacity=".55"/>`,
  aufdreher:      `<g transform="translate(0 -3)"><path d="M4 17a8 8 0 1116 0"/><path d="M12 17l4.5-5.5"/><circle cx="12" cy="17" r="1.3" fill="currentColor"/><path d="M4 21h16"/></g>`,
  rueckzug:       `<g transform="translate(1 0)"><path d="M14 4h5v16h-5"/><path d="M14 12H3M7 8l-4 4 4 4"/></g>`,
  sollstrecke:    `<g transform="translate(0 -2.5)"><path d="M3 11.5h18" stroke-dasharray="1.5 2"/><path d="M5.5 20.5v-10M10 20.5v-11.5M14.5 20.5v-10.5M19 20.5v-12"/><path d="M3 20.5h18"/></g>`,
  ausnahmemonat:  `<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><path d="M6 18h12" stroke-dasharray="1.5 2"/><path d="M12 17.5v-6M9.5 14l2.5-2.5 2.5 2.5"/>`,
  klartext:       `<g transform="translate(0 0.5)"><path d="M4 4h16v11H9l-5 4z"/><path d="M12 7.5v3.5M12 13.2h.01"/></g>`,
  rollentausch:   `<g transform="translate(-0.75 -0.75)"><circle cx="9" cy="7.5" r="3"/><path d="M3.5 20.5a5.5 5.5 0 0111 0"/><path d="M15.5 6.5a4 4 0 016.5 3"/><path d="M22 6.5v3h-3"/><path d="M22 15a4 4 0 01-6.5 3"/><path d="M15.5 21v-3h3"/></g>`,
};
// Alte Namen, deren Zeichnung ersetzt ist [§C41]. Gespeicherte Stories
// tragen ihren Zeichenschlüssel (`_storyToRow`), und der Snapshot-Vertrag
// [§C33] verbietet, sie umzuschreiben: ohne diesen Verweis stünde in einer
// Karte vom Juni eine Lücke, wo vorher die Hantel oder das gebrochene Herz
// war. Der alte Name zeigt auf die Zeichnung, die seine Sache jetzt trägt.
const ZEICHEN_ALT = {
  weightSmall:'weight', heartBroken:'pille', concreteWall:'betonmauer', blackDay:'schwarzerTag',
  overtake:'ueberholen', rocket:'rakete', chartUp:'trendUp', chartDown:'trendDown', swords:'crossedSwords',
  iceCube:'dropTriple',
};
// Die Zeichnung zu einem Namen, auch zu einem alten. Jeder Zugriff auf den
// Katalog geht hierüber — ein direktes `ICONS[name]` sähe die alten Namen
// nicht.
function icPfad(name, rueckfall){
  return ICONS[name] || ICONS[ZEICHEN_ALT[name]] || (rueckfall ? ICONS[rueckfall] || '' : '');
}
function svgI(name, opts){
  const o = opts || {};
  const cls = o.cls ? ' '+o.cls : '';
  const path = icPfad(name);
  return `<span class="ic svg-ic${cls}"><svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg></span>`;
}
// Die Zeichenkachel [§C27]. Ein Zeichen, das eine Fläche braucht, steht in
// DIESER Kachel: drei Größen (k 28 px für Zeile und Band, ohne Zusatz 36 px
// für Kachel und Karte, g 48 px für den Blattkopf) und sechs Töne nach den
// Rollen des Farbgesetzes [§C25] — ohne Ton ist sie Metall. Vorher baute
// jede Ansicht ihren eigenen Kasten: die Award-Kachel ein nacktes Zeichen
// von 14 px, das Award-Blatt einen leuchtenden Kreis, der Rückblick ein
// Quadrat mit 11 px Rundung, das Rubrikband der Stories ein viertes.
const ZK_TON = {gold:1, rot:1, gruen:1, blau:1, viol:1, bronze:1};
function zkHtml(name, groesse, ton){
  return `<span class="zk${groesse ? ' '+groesse : ''}${ZK_TON[ton] ? ' '+ton : ''}">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true">${icPfad(name, 'trophy')}</svg></span>`;
}
// Medaillen-Badge (1/2/3) statt 🥇🥈🥉
function medalB(i){
  if(i<0||i>2) return '';
  return `<span class="medal-b m${i+1}">${i+1}</span>`;
}
// Neben dem Namen steht die Niederlagenserie — und nur sie. Die Siegesserie
// brennt am Avatar [§C26], in jeder Ansicht und in jeder Größe; ein
// Flammensymbol daneben sagte dieselbe Zahl ein zweites Mal, in einer
// zweiten Bildsprache. Für Niederlagen gibt es am Avatar kein Zeichen,
// also braucht sie hier eines. Drei Tropfen, dieselben Schwellen wie beim
// Feuer: ab 3, ab 5, ab 7.
function lossStreakInline(cs){
  if(cs > -3) return '';
  const drops = cs<=-7 ? 'dropTriple' : cs<=-5 ? 'dropDouble' : 'drop';
  return `<span class="streak-badge fire" title="${-cs}er Niederlagenserie">${svgI(drops)}</span>`;
}


