// ─── §13.5 Anzeigen ──────────────────────────────────────────────────
// Eine Plakette. `hero` = die große Meister-Variante ganz oben auf der Tafel.
function _titlePlateHtml(a, opts){
  const o = opts || {};
  const t = chronikTon(a);
  const p = pmap()[a.pid];
  // Die Maße stehen in .tplate-w .av — im style-Attribut waren sie das
  // einzige, was man nicht im CSS fand, wenn die Plakette zu eng aussah.
  const av = p ? avHtml(p) : '';
  const zeig = a.titleId && !o.keinDetail;
  const cls = 'tplate' + (o.hero ? ' hero' : '') + (zeig || a.pid ? ' clickable' : '');
  // Die Klasse sagt, wie schwer der Eintrag zu holen war [§C39], und steht
  // deshalb auf der Plakette. Sie kommt aus dem Katalog von HEUTE und fehlt
  // still, wenn ein eingefrorener Monat eine Chronik zeigt, die es nicht mehr
  // gibt — eine Plakette ohne Klasse ist besser als eine mit falscher.
  const kl = _chronKlasse(a.titleId);
  return `<div class="${cls}" style="--tt:${t.c};--ttr:${t.rgb}"${
    kl ? ` data-kl="${esc(kl)}"` : ''}${
    zeig ? ` data-tdisz="${esc(a.titleId)}" data-tsid="${esc(o.sid || '')}"`
         : (a.pid ? ` data-tplayer="${esc(a.pid)}"` : '')}>
    <div class="tplate-ic">${svgI(a.ic)}</div>
    <div class="tplate-b">
      <div class="tplate-t">${esc(a.name)}${
        kl ? `<span class="tplate-kl">${esc(CHRONIK_KLASSE_NAME[kl])}</span>` : ''}</div>
      <div class="tplate-w">${av}<span>${esc(p ? p.name : '?')}</span></div>
      ${a.ev ? `<div class="tplate-e num">${esc(a.ev)}</div>` : ''}
      ${/* Eine überschattete Chronik steht weiter in der Tafel [§C39], und
            ohne diese Zeile sähe sie aus wie eine, die zählt. */
        o.schatten ? `<div class="tplate-e">überschattet von „${esc(o.schatten.name)}“</div>` : ''}
    </div>
  </div>`;
}

// Die Stufe einer Monatschronik, oder leer. Ein eingefrorener Monat kann
// eine Chronik zeigen, die der Katalog nicht mehr kennt [§13.3a].
function _chronKlasse(tid){ return tid ? chronikStufe(tid) : ''; }

// Klasse, Art, Ausschlag und Prestige einer Monatschronik als Zahlenreihe —
// dasselbe Bauteil wie in den Rückblicken [§C27]. Vorher stand von den vier
// Angaben, die den Wert einer Chronik bestimmen, keine einzige in der App:
// wer ein Chronik-Blatt öffnete, sah die Bedingung und sonst nichts.
//
// `wert` ist die Größe des Halters. Mit ihm steht unter dem Ausschlag der
// Schwelle, wie weit der Halter darüber liegt, und unter dem Prestige die
// Rechnung aus Grundwert und Bonus [§C39]: „+116" allein ließ offen, warum
// dieselbe Chronik im Vormonat 103 brachte. Ohne Halter steht der Grundwert
// da, und dass mehr möglich ist.
// `schatten` ist die Schattenseite, die den Halter in diesem Monat
// überschattet (`chronikUeberschattet`): dann steht die Null da, die er
// bekommt, und nicht der Wert, den die Chronik sonst hätte.
// Eine Schattenseite trägt denselben Abstand (`chronikSchattenGewicht`):
// nach ihm entscheidet sich, ob sie eine besondere Chronik desselben Monats
// überschattet [§C39]. Ihr Blatt zeigte nur den Ausschlag der Schwelle, und
// ob „Der Pechvogel" eine andere Chronik auslöscht, war nicht abzulesen.
function _chronFaktenHtml(def, wert, schatten){
  if(!def || !CHRONIK_KLASSE_NAME[def.klasse]) return '';
  const p = schatten ? 0 : chronikPunkte(def.id, wert);
  const z = chronikUeber(def.id, wert) ?? chronikSchattenGewicht(def.id, wert);
  // Bei einer Schattenseite heißen Klasse und Art gleich: „Schattenseite"
  // stand zweimal nebeneinander und lief bei 390 px aus beiden Kacheln.
  const klasse = CHRONIK_KLASSE_NAME[def.klasse], art = CHRONIK_ART_NAME[def.kunst] || '—';
  return rcpZahlenHtml([
    {v:klasse, l:'Klasse'},
    art !== klasse ? {v:art, l:'Art'} : null,
    {v:chronikSigma(def.aus), l:'Ausschlag', d:z > 0 ? '+' + chronikSigma(z) : null},
    p > 0 ? {v:'+' + p, l:'Prestige', ton:'gold',
             d:z == null ? '+ Bonus' : CHRONIK_GRUNDWERT + ' + ' + chronikBonus(def.id, wert)}
          : {v:'0', l:'Prestige', d:schatten ? 'überschattet' : null},
  ]);
}

// Die Saison-Tafel als Sheet. Öffnet aus der Chronik, der Liga-Chronik und
// aus dem News-Detail des Saison-Abschlusses.
function showSeasonTable(sid){
  if(!sid) sid = currentSeason().id;
  _sheetSetReopen(()=>showSeasonTable(sid));
  const T = seasonTitles(sid);
  if(!T.awarded.length && !T.champ){
    openSheet(`${blattKopfHtml({ic:'scroll', ton:'gold', titel:seasonLabel(sid), unter:'Noch keine Chronik-Einträge'})}
      ${emptyState('trophy', T.live ? 'Die Saison läuft, noch erfüllt niemand eine Bedingung.' : 'Kein Eintrag in dieser Saison')}`);
    return;
  }
  const emptyNames = T.empty.map(pname).filter(Boolean);
  // Wer im Monat gespielt hat, aber unter fünfzehn Partien blieb, ist nicht
  // gewertet [§C39]. In der Matrix steht dort nichts, und ohne diese Zeile
  // läse sich das wie ein Fehler.
  const zuWenigNames = (T.zuWenig || []).filter(id => sichtbar(id)).map(pname).filter(Boolean);
  // „Nicht vergeben" nur für die laufende Saison. Eine eingefrorene Tafel
  // ist gegen den Katalog von DAMALS gelaufen; sie gegen den von heute zu
  // halten würde Einträge als verpasst zeigen, die es damals nicht gab.
  const unawarded = T.live
    ? SEASON_TITLES.filter(t => !T.awarded.some(a => a.titleId === t.id))
    : [];
  // Der Meister steht als eigene Zeile über der Chronik, nicht IN ihr: Platz 1
  // der Elo ist eine Tabellen-Aussage, kein Chronik-Eintrag — und er würde dem
  // Ersten sonst seinen einen Chronik-Platz wegnehmen.
  // Offen steht, was zählt: je Spieler der wertvollste Eintrag
  // (`chronikEintragVon`) [§C32] — der Eintrag, den Matrix, Profil und
  // Prestige zeigen. Die übrigen klappen darunter auf. Alle offen
  // untereinander waren bei Leon zwölf Plaketten, von denen elf nichts
  // zählten; ganz weg, hinter „Alle anzeigen · 9 weitere" auf einem anderen
  // Blatt, fehlte die halbe Tafel.
  const zaehlt = new Set([...new Set(T.awarded.map(a => a.pid))].map(pid => chronikEintragVon(T, pid)));
  // Nicht `sichtbar`: so heißt die Prüfung des Karriereendes [§C40], die
  // weiter oben für die Nicht-Gewerteten gebraucht wird.
  const offen = T.awarded.filter(a => zaehlt.has(a)), weitere = T.awarded.filter(a => !zaehlt.has(a));
  const gt = titleTone('gold');
  const ch = T.champ;
  openSheet(`
    ${blattKopfHtml({ic:'scroll', ton:'gold', titel:'Die Chronik der Saison',
      unter:T.label + ' · ' + T.matches + ' Partien an ' + T.days + ' Spieltag' + (T.days===1?'':'en') + (T.live ? ' · läuft noch' : '')})}
    ${T.live ? `<div class="tnote">Stand von heute, bis zum Monatsende kann sich alles noch ändern.</div>` : ''}
    ${ch ? `<div class="chron-one" style="--tt:${gt.c};--ttr:${gt.rgb}" data-tplayer="${esc(ch.pid)}">
        <span class="ic">${svgI('crown')}</span>
        <span class="tx"><span class="n">${esc(pname(ch.pid))} ${T.live ? 'führt die Saison an' : 'ist Meister'}</span>
          <span class="e num">${ch.elo} Elo · ${ch.wins} Siege aus ${ch.games} Partien</span></span>
      </div><div style="height:14px"></div>` : ''}
    <div class="tplates">${offen.map(a => _titlePlateHtml(a, {sid, schatten:chronikUeberschattet(T, a)})).join('')}</div>
    ${weitere.length ? `<div class="tplates chron-rest">${weitere.map(a => _titlePlateHtml(a, {sid, schatten:chronikUeberschattet(T, a)})).join('')}</div>
    ${_chronMehrKnopf(weitere.length)}` : ''}
    ${emptyNames.length ? `<div class="pp-sec-title" style="margin-top:16px"><div class="l"><h4>Ohne Eintrag</h4></div></div>
      <div class="tempty">${esc(emptyNames.join(', '))}<span>Keine Bedingung erfüllt, die Saison zählt trotzdem.</span></div>` : ''}
    ${zuWenigNames.length ? `<div class="pp-sec-title" style="margin-top:16px"><div class="l"><h4>Nicht gewertet</h4></div></div>
      <div class="tempty">${esc(zuWenigNames.join(', '))}<span>Eine Monatschronik gibt es ab ${CHRONIK_MIN_SPIELE} eigenen Partien im Monat.</span></div>` : ''}
    ${unawarded.length ? `<div class="pp-sec-title" style="margin-top:16px"><div class="l"><h4>Nicht vergeben</h4></div><div class="m">${unawarded.length}</div></div>
      <div class="tunawarded">${unawarded.map(t => {
        // Wer der Bedingung am naechsten kommt. Vorher stand hier nur die
        // Bedingung, und acht der siebenundzwanzig Eintraege ueberhaupt: der
        // Rest war eine Zeile „und 19 weitere". Damit war nicht zu sehen, was
        // in diesem Monat noch zu holen ist und wer davor steht.
        const n = _stNahDef(sid, t.id);
        return `<div class="tun"><span class="i">${svgI(t.ic)}</span>`
          + `<span class="n">${esc(t.name)}</span>`
          + `<span class="c">${esc(t.cond)}</span>`
          + (n ? `<span class="w" data-tplayer="${esc(n.pid)}">Am nächsten dran: `
                 + `<b>${esc(pname(n.pid))}</b> · ${esc(n.ev)}</span>` : '')
          + `</div>`;
      }).join('')}</div>` : ''}
  `);
  _bindChronikClicks(document.getElementById('sheet'));
}

// „zu 3. gehalten" stand da, eine Ordnungszahl, wo ein Zahlwort hingehört.
function _zuMehreren(n){
  const w = {2:'zu zweit', 3:'zu dritt', 4:'zu viert', 5:'zu fünft', 6:'zu sechst'}[n];
  return w || `zu ${n}`;
}

// Chronik fürs Profil: EINE Karte. Nicht mehr eine Liste — genau die eine
// Auszeichnung, die diesen Spieler von allen anderen unterscheidet. Darunter
// der Saison-Streifen: was er Monat für Monat geholt hat.
function _chronStripHtml(pid, teil){
  const rows = seasonTitleHistory(pid);
  const c = chronicleOf(pid);
  if(!rows.length && !c) return '';

  let chronBlock = '';
  if(c){
    // Wer mehr als einen Rekord haelt, soll auch alle sehen koennen. Sichtbar
    // ist der wertvollste; der Rest kommt auf Tippen. Andersherum waere die
    // Karte bei Leon zehn Zeilen lang, bevor irgendetwas anderes im Profil kommt.
    // Was negativ ist, steht hinten und zaehlt nicht mit: „Die bitterste
    // Pleite" stand in Gold zwischen den Titeln und machte aus sechs Rekorden
    // sieben. Gezeigt wird sie weiter — sie gehoert ihm ja —, aber in Rot und
    // ausserhalb der Zahl [§C25].
    const alle = chroniclesOfPlayer(pid);
    const mine = alle.filter(x => !x.neg).concat(alle.filter(x => x.neg));
    const zaehlt = alle.filter(x => !x.neg).length;
    // Wer NUR eine Schattenseite hält, bekommt keine Überschrift „Liga-Rekord"
    // darüber: „Das Scheunentor" ist keiner, und die Zahl daneben wäre null.
    const nurNeg = zaehlt === 0;
    // Ein gehaltener Rekord ist Gold und trägt das Lauflicht [§C25, §C27];
    // es wandert von Karte zu Karte. Eine Schattenseite trägt keins.
    let lauf = 0;
    const card = (x) => {
      const tt = titleTone(x.tone);
      return `<div class="chron-one${x.neg ? ' schatten' : ''}" style="--tt:${tt.c};--ttr:${tt.rgb}" data-chron="${esc(x.id)}">
      <span class="ic">${svgI(x.ic)}</span>
      <span class="tx">
        <span class="n">${esc(x.name)}${x.shared
          ? `<span class="shared">${_zuMehreren(x.pids.length)} gehalten</span>` : ''}</span>
        <span class="e num">${esc(x.ev)}</span>
      </span>
      <span class="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></span>${x.neg ? '' : glanzBahn(2.2 + (lauf++) * .45)}
    </div>`;
    };
    // Zwei Rekorde stehen offen, der Rest klappt an Ort und Stelle auf, und
    // der Knopf nennt die genaue Zahl. Alle offen untereinander waren bei
    // zehn Rekorden zehn Karten, bevor im Profil irgendetwas anderes kam;
    // hinter „Mehr anzeigen · 4 weitere" nach dem ersten verschwieg es
    // dagegen die meisten.
    const liste = mine.length ? mine : [c];
    const rest = liste.slice(2);
    chronBlock = `
    <div class="pp-sec-title">
      <div class="l"><span class="ic svg-ic">${svgI(nurNeg ? 'ghost' : 'trophyStar')}</span>
        <h4>${nurNeg ? (alle.length === 1 ? 'Schattenseite' : 'Schattenseiten')
                     : (zaehlt === 1 ? 'Liga-Rekord' : 'Liga-Rekorde')}</h4></div>
      ${(nurNeg ? alle.length : zaehlt) > 1
        ? `<div class="m num">${nurNeg ? alle.length : zaehlt}</div>` : ''}
    </div>
    <div class="chron-alle">${liste.slice(0, 2).map(card).join('')}</div>${rest.length ? `
    <div class="chron-alle chron-rest">${rest.map(card).join('')}</div>
    ${_chronMehrKnopf(rest.length)}` : ''}`;
  } else {
    // Kein Rekord? Dann zeigt die Karte, welcher am nächsten liegt und was
    // dafür noch fehlt. Eine leere Zeile motiviert niemanden, eine Zahl schon.
    const nx = nextRecordFor(pid);
    if(nx){
      const t = titleTone(nx.tone);
      const pct = nx.target ? Math.max(3, Math.min(100, Math.round(nx.have / nx.target * 100))) : 0;
      chronBlock = `
    <div class="pp-sec-title">
      <div class="l"><span class="ic svg-ic">${svgI('rekord')}</span><h4>Liga-Rekord</h4></div>
      <div class="m">noch keiner</div>
    </div>
    <div class="chron-one next" style="--tt:${t.c};--ttr:${t.rgb}" data-chron="${esc(nx.id)}">
      <span class="ic">${svgI(nx.ic)}</span>
      <span class="tx">
        <span class="n">${esc(nx.name)}</span>
        <span class="e num">${esc(nx.txt)}</span>
        <span class="bar"><i style="width:${pct}%"></i></span>
      </span>
      <span class="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></span>
    </div>`;
    } else {
      chronBlock = `
    <div class="pp-sec-title">
      <div class="l"><span class="ic svg-ic">${svgI('rekord')}</span><h4>Liga-Rekord</h4></div>
    </div>
    <div class="chrows-empty">Noch keiner. Jeder Rekord gehört dem, der ihn
      wirklich hält — und je Spieler steht der wertvollste.</div>`;
    }
  }

  // Nur Monate mit Eintrag. Ein leeres Kästchen mit Strich sagt nichts, was
  // der Zähler daneben nicht schon sagt — es macht den Streifen nur länger
  // und lenkt vom Erreichten ab.
  const earned = rows.filter(r => r.title);
  // Neueste Saison links: der Streifen wird von links gelesen, und was gerade
  // läuft ist interessanter als der erste Monat der Liga-Geschichte.
  const cells = earned.slice(-12).reverse().map(r => {
    const t = r.title;
    // Dieselbe Farbe wie die Zelle der Liga-Chronik: die höchste Klasse des
    // Monats, nicht die des Eintrags, der zählt [§C39].
    const kl = chronikZellStufe(seasonTitles(r.sid), pid);
    const tone = titleTone(CHRONIK_STUFE_TON[kl] || t.tone);
    const mon = String(r.label).split(' ')[0].slice(0,3);
    return `<div class="chron-cell${r.live ? ' live' : ''}"
      style="--tt:${tone.c};--ttr:${tone.rgb}"${kl ? ` data-kl="${esc(kl)}"` : ''}
      data-season-table="${esc(r.sid)}">
      <div class="m">${esc(mon)}</div>
      <div class="i">${svgI(t.ic)}</div>
      <div class="n">${esc(t.short || t.name)}</div>
    </div>`;
  }).join('');
  const stripBlock = rows.length ? `
    <div class="pp-sec-title" style="margin-top:18px">
      <div class="l"><span class="ic svg-ic">${svgI('scroll')}</span><h4>Chronik</h4></div>
      <div class="m num">${earned.length}</div>
    </div>
    ${earned.length
      ? `<div class="chron-strip">${cells}</div>`
      : `<div class="chrows-empty">Noch kein Monat mit Eintrag. Jede Saison
          fängt bei null an — die Chronik auch.</div>`}` : '';

  // Im Profil stehen beide Teile an verschiedenen Stellen: die Chronik
  // unter dem Kopf (jeden Monat neu erreichbar, das ist das Spannende), die
  // Liga-Rekorde bei den Titeln. Direkt unter der Chronik schoben zehn
  // Rekordkarten Statistik, Auszeichnungen und Titel aus dem Bild.
  if(teil === 'chronik') return stripBlock;
  if(teil === 'rekorde') return chronBlock;
  return stripBlock + (stripBlock ? '<div style="height:18px"></div>' : '') + chronBlock;
}

// Eine einzelne Chronik ligaweit: wer hält sie, wer hielte sie sonst.
// ─── §13.5b Eine Monatswertung im Detail ─────────────────────────────
// Ein Klick auf eine Chronik-Karte führte ins Spielerprofil. Dort steht dann
// alles über den Spieler und nichts über die Wertung — nicht, was die Zahl
// daneben bedeutet, und nicht, wer sonst noch nah dran war. Diese Ansicht
// beantwortet genau das: die Bedingung, die Rechnung dahinter und das
// Podest des Monats.
// Das Podest der ersten drei — dasselbe Bauteil im Monats- und im
// Rekord-Blatt [§C27]. Erwartet wird eine Reihenfolge aus {pid, wert, zeit};
// wer weniger als drei hat, bekommt leere Plaetze statt einer Luecke.
// Der Platz kommt aus dem Wert (`v`), nicht aus der Reihenfolge: Martin und
// Julian halten „Der Unaufhaltsame" mit 13 punktgleich, das Blatt sagt es
// darunter, und das Podest zeigte Julian als 02 — die Reihenfolge bricht
// Gleichstand nur, damit sie feststeht. Wer gleich viel hat, steht auf
// demselben Platz und trägt dasselbe Metall.
function _chronPlatz(reihe, r){
  if(r == null || r.v == null) return null;
  return 1 + reihe.filter(x => x.v != null && x.v - r.v > 1e-9).length;
}
function _chronPodestHtml(reihe){
  const METALL = ['gold', 'silber', 'bronze'];
  const platz = (i) => {
    const r = reihe[i];
    const p = r && pmap()[r.pid];
    if(!p) return '<div class="pod-leer"></div>';
    const n = _chronPlatz(reihe, r) || i + 1;
    return `<div class="pod-karte ${METALL[Math.min(n, 3) - 1]}${i === 0 ? ' erster' : ''}" data-tplayer="${esc(r.pid)}">
      <div class="pod-platz num">${String(n).padStart(2, '0')}</div>
      ${avHtml(p, '', {ins:true, px:(i === 0 ? 84 : 70), klasse:'pod-av'})}
      <div class="pod-name">${esc(p.name)}</div>
      <div class="pod-sub"><span>${esc(r.wert || '')}</span>${
        r.zeit ? `<span>${esc(String(r.zeit))}</span>` : ''}</div>
    </div>`;
  };
  return `<div class="podest">${platz(1)}${platz(0)}${platz(2)}</div>`;
}

function showDisziplin(tid, sid){
  const def = SEASON_TITLE_BY_ID[tid];
  if(!def) return;
  if(!sid) sid = currentSeason().id;
  _sheetSetReopen(()=>showDisziplin(tid, sid));
  const t = titleTone(def.tone);
  const T = seasonTitles(sid);
  const eigene = T.awarded.filter(a => a.titleId === tid);

  // Ein eingefrorener Monat wird NICHT nachgerechnet [§13.3a]: er lief gegen
  // den Katalog von damals, und die heutige Bedingung ergäbe dort ein
  // anderes Podest als die Tafel daneben zeigt.
  let rang = [], evFuer = null, wertVon = null;
  if(!T.frozen){
    try {
      const r = def.pick(_seasonTitleCtx(sid), new Set());
      if(r && r.rang){ rang = r.rang; evFuer = r.evFuer; wertVon = r.wert; }
    } catch(e){ rang = []; }
  }

  const reihe = rang.map(pid => {
    let wert = '';
    try { wert = evFuer ? evFuer(pid) : ''; } catch(e){ wert = ''; }
    return {pid, wert, v: wertVon ? wertVon(pid) : null};
  });
  const podest = _chronPodestHtml(reihe);
  // Der Beleg [§C27] aus derselben Reihenfolge wie das Podest. Einen
  // Verlauf hat ein Monat nicht — er ist die Zeitachse selbst.
  const halterM = new Set(eigene.map(a => a.pid));
  // Überschattet wird je Halter; das Blatt nennt es, wenn es einen einzigen
  // Halter gibt und der überschattet ist.
  const schattenM = eigene.length === 1 ? chronikUeberschattet(T, eigene[0]) : null;
  // Und umgekehrt: das Blatt einer Schattenseite nennt, was sie bei ihrem
  // Halter überschattet. Sonst stand das nur im Blatt der anderen Chronik.
  // Ob Schattenseite, steht an der Disziplin (`_chronikMonat`), nicht am
  // Eintrag der Saison: `def.monat` gibt es dort nicht, und der Kopf eines
  // Schattenseiten-Blatts stand deshalb in Gold statt in Rot.
  const mon = _chronikMonat(tid), monatSchatten = !!(mon && mon.art === 'schatten');
  const loescht = eigene.length === 1 && monatSchatten
    ? T.awarded.filter(a => a.pid === eigene[0].pid && chronikUeberschattet(T, a) === eigene[0]) : [];
  const zweitM = reihe.find(r => !halterM.has(r.pid)) || null;
  const zweitMA = zweitM ? belegAnteil(zweitM.wert) : null;
  const beleg = reihe.length ? belegHtml({
    ev: (eigene[0] && eigene[0].ev) || (reihe[0] && reihe[0].wert) || '',
    feld: reihe.map(r => ({v:r.v, t:_chronKurz(r.wert), er:halterM.has(r.pid)})),
    dahinter: zweitM ? `Dahinter: <b>${esc(pname(zweitM.pid))}</b> mit ${esc(_chronKurz(zweitM.wert))}.` : '',
    zweiter: zweitMA && _belegIstQuote(zweitM.wert, zweitMA) ? {name:pname(zweitM.pid), q:zweitMA.k / zweitMA.n} : null
  }) : '';

  // Der Kopf jedes Blatts [§C27]; der Kasten darunter trägt die Bedingung.
  openSheet(`
    ${blattKopfHtml({ic:def.ic, ton:monatSchatten ? 'rot' : 'gold', titel:def.name,
      unter:'Monatschronik · ' + seasonLabel(sid) + (T.live ? ' · läuft noch' : '')})}
    <div class="chron-hero" style="--tt:${t.c};--ttr:${t.rgb}">
      <span class="c">${esc(def.cond)}</span>
      ${/* Der Beiname stand nur im Profilkopf [§C39], und im Blatt der
            Wertung war nicht zu sehen, wie ihr Halter dort heisst: „Der
            Nervenkitzel" macht seinen Traeger zum „Dauerzitterer", und
            beide Namen standen nirgends nebeneinander. Er sitzt IM Kopf
            des Blatts, weil er zur Wertung gehoert und nicht zu ihren
            Zahlen — die Zahlenreihe darunter traegt die vier Angaben,
            die ihren Wert bestimmen [§C39]. Er heisst nie wie die Wertung;
            hiess er so wie bei „Der Beidfuessige", trug das Profil keinen
            Beinamen, sondern den Namen der Wertung. */
        def.beiname ? `<span class="chron-kose"><i>Beiname im Profil</i>`
        + `<b>${esc(def.beiname)}</b></span>` : ''}
    </div>
    ${_chronFaktenHtml(def, eigene.length ? eigene[0].wert : undefined, schattenM)}
    ${schattenM ? `<div class="tnote">„${esc(schattenM.name)}“ wiegt in diesem Monat schwerer. Diese Chronik bleibt in der Tafel, bringt aber kein Prestige.</div>` : ''}
    ${loescht.length ? `<div class="tnote">Wiegt in diesem Monat schwerer als ${esc(_namenListe(loescht.map(a => '„' + a.name + '“')))}. ${
      loescht.length === 1 ? 'Sie bleibt' : loescht.length === 2 ? 'Beide bleiben' : 'Alle bleiben'} in der Tafel, ${esc(pname(eigene[0].pid))} bekommt dafür aber kein Prestige.</div>` : ''}
    ${def.wie ? `<div class="tnote">${esc(def.wie)}</div>` : ''}
    ${beleg}
    ${rang.length
      ? `<div class="pp-sec-title" style="margin-top:14px"><div class="l"><h4>Dieser Monat</h4></div>
           <div class="m num">${rang.length} erfüllt${rang.length === 1 ? '' : 'en'} die Bedingung</div></div>
         ${podest}`
      : (eigene.length
          ? `<div class="tplates">${eigene.map(a => _titlePlateHtml(a, {keinDetail:true})).join('')}</div>`
          : emptyState('scroll', T.live
              ? 'Diese Bedingung erfüllt in diesem Monat noch niemand.'
              : 'Diese Bedingung hat in diesem Monat niemand erfüllt.'))}
  `);
  _bindChronikClicks(document.getElementById('sheet'));
}

function showChronicle(cid){
  const def = CHRONICLE_BY_ID[cid];
  if(!def) return;
  _sheetSetReopen(()=>showChronicle(cid));
  const t = titleTone(def.tone);
  // Ein Rekord ist ein Wettstreit, also zeigt sein Blatt ein Podest —
  // `.podest`/`.pod-karte` wie in der Ewigen Tafel [§C27]. Vorher stand hier
  // nur der Halter, und wer wie nah dran ist, stand nirgends.
  const rang = chronicleRang(cid);
  const h = chronicleHolders()[cid] || null;
  const halterN = h ? (h.pids || [h.pid]).length : 0;
  const verfolger = rang.slice(3);
  // Die vier Angaben, die den Wert eines Rekords bestimmen, standen nirgends:
  // wer ein Blatt oeffnete, sah die Bedingung und sonst nichts. Die
  // Zahlenreihe ist `rcpZahlenHtml`, das Bauteil der Rueckblicke [§C27].
  //
  // Der BEITRAG ist nicht der Grundwert. Ein zehnter Rekord gibt nicht 100
  // Prestige: er wird durch die Zahl seiner Halter geteilt, landet auf einem
  // Rang im Rekordstapel und wird dort durch die Wurzel seiner Staffel
  // geteilt [§C34]. Gezeigt wird deshalb der Stand des ersten Halters aus
  // derselben Rechnung, aus der auch das Laufbahnblatt liest — und darunter
  // die Rechnung selbst, damit die Zahl nachzuvollziehen ist.
  const q = h ? rekordQuelleVon(h.pid, cid) : null;
  const beitrag = q ? Math.round(q.p) : 0;
  const zahlen = rcpZahlenHtml([
    {l:'Bestwert',   v:h ? _chronKurz(h.ev) : '—'},
    {l:'Grundwert',  v:def.basis > 0 ? def.basis + ' P' : '0 P'},
    {l:'Beitrag',    v:def.basis > 0 ? (beitrag > 0 ? '+' + beitrag + ' P' : '—') : '0 P',
     ton:def.neg ? 'neg' : ''}
  ]);
  // Zeitraum und Mindestbasis gehoeren nicht in die Zahlenreihe: es sind
  // Saetze und keine Werte, und „12 Spieltage mit je 3 Partien" laeuft in
  // einer 88-px-Zelle in die Nachbarzelle.
  const fakten = [
    def.zeitraum ? ['Zeitraum', def.zeitraum] : null,
    def.mind     ? ['Mindestbasis', def.mind] : null,
    def.basis > 0
      ? ['Für die Laufbahn', q ? _prestigeQuellSatz(q, true)
          : 'Grundwert ' + def.basis + ' P, geteilt durch die Zahl der Halter']
      : ['Für die Laufbahn', 'Eine Schattenseite zählt nichts und zieht nichts ab']
  ].filter(Boolean);
  // Der Beleg [§C27]: woraus der Bestwert besteht, wo er im Feld liegt, wie
  // knapp der Abstand ist und wie es dazu kam — aus chronicleRang und dem
  // Beleg des Katalogs, ohne zweite Rechnung.
  const halterSet = new Set(h ? (h.pids || [h.pid]) : []);
  const zweit = rang.find(r => !halterSet.has(r.pid)) || null;
  const zweitA = zweit ? belegAnteil(zweit.ev) : null;
  const beleg = rang.length ? belegHtml({
    ev: h ? h.ev : '',
    feld: rang.map(r => ({v:r.wert, t:_chronKurz(r.ev), er:halterSet.has(r.pid)})),
    dahinter: zweit ? `Dahinter: <b>${esc(pname(zweit.pid))}</b> mit ${esc(_chronKurz(zweit.ev))}.` : '',
    zweiter: zweitA && _belegIstQuote(zweit.ev, zweitA) ? {name:pname(zweit.pid), q:zweitA.k / zweitA.n} : null,
    verlauf: cid
  }) : '';
  // Der Weg weiter: ins Profil des Halters, mit seinem Namen auf dem Knopf.
  // Daneben stand „Direkter Vergleich" und öffnete die Bilanz von Halter und
  // Zweitem gegeneinander — eine Frage, die mit dem Rekord nichts zu tun hat,
  // und der Knopf sagte nicht einmal, wer mit wem verglichen wird. Die
  // Verfolger darunter führen ohnehin in ihr Profil.
  const fussRek = h ? blattFussHtml([
    {label:'Profil von ' + pname(h.pid), ic:'user', prim:true, attr:`data-tplayer="${esc(h.pid)}"`}]) : '';
  // Gold für Können, Form und Bestmarke, Metall für die Fügung, Rot für
  // die Kehrseite [§C25].
  const rekTon = def.neg ? 'rot' : def.kind === 'fuegung' ? '' : 'gold';
  openSheet(`
    ${blattKopfHtml({ic:def.ic, ton:rekTon, titel:def.name, unter:'Liga-Rekord · ' + CHRON_KINDS[def.kind].label})}
    <div class="chron-hero" style="--tt:${t.c};--ttr:${t.rgb}">
      <span class="c">${esc(def.cond)}</span>
    </div>
    ${zahlen}
    <div class="rek-def">${fakten.map(([l, v]) =>
      `<div class="rek-df"><span class="l">${esc(l)}</span><span class="v">${esc(v)}</span></div>`
    ).join('')}</div>
    ${halterN > 1 ? `<div class="tnote">${halterN} Spieler halten diesen Rekord gemeinsam und teilen sich sein Prestige,
      bis einer ihn überbietet.</div>` : ''}
    ${def.wie ? `<div class="tnote">${esc(def.wie)}</div>` : ''}
    ${beleg}
    ${rang.length
      ? `<div class="pp-sec-title" style="margin-top:14px"><div class="l"><h4>Die Tafel</h4></div>
           <div class="m num">${rang.length} von ${allChronicles().rated} erfüllen die Mindestbasis</div></div>
         ${_chronPodestHtml(rang.map(r => ({pid:r.pid, wert:_chronKurz(r.ev), zeit:r.zeit, v:r.wert})))}`
      : emptyState('scroll', 'Diesen Rekord hat noch niemand erreicht.')}
    ${verfolger.length ? `<div class="rek-verfolger">${verfolger.map((r, i) => {
      const p = pmap()[r.pid];
      return `<div class="rvf" data-tplayer="${esc(r.pid)}">
        <span class="p num">${_chronPlatz(rang.map(x => ({v:x.wert})), {v:r.wert}) || i + 4}</span>
        ${p ? avHtml(p, 'width:21px;height:21px;font-size:9px;border-radius:7px') : ''}
        <span class="n">${esc(p ? p.name : '?')}</span>
        <span class="w num">${esc(_chronKurz(r.ev))}</span>
      </div>`;
    }).join('')}</div>` : ''}
    ${fussRek}
  `);
  _bindChronikClicks(document.getElementById('sheet'));
  belegVerlaufLaden(document.getElementById('sheet'));
}

// Keine Marken „Neu" und „Ueberarbeitet" mehr. Sie sagten, was sich mit
// dieser FASSUNG DER APP geaendert hat — fuer den Leser einer Rekordkarte ist
// das nichts: er will wissen, was der Rekord misst und wer ihn haelt. Dieselbe
// Regel wie „Das Blatt erklaert nicht die App" [§C33].

// Die Zeile unter dem Beleg: Zeitpunkt, Zeitraum, Grundwert, Stand. Sie stand
// vorher nur als Zeitpunkt da, und damit fehlte auf der Karte das, was die
// Bedingung nicht sagt: ueber welche Strecke gerechnet wird und was der
// Eintrag fuer die Laufbahn wert ist. Der Grundwert steht ausdruecklich als
// „Basis" — er ist NICHT, was jemand bekommt: er wird durch die Halter
// geteilt und danach gedaempft [§C34].
function _rekordMeta(d, h){
  const pillen = [];
  if(h && h.zeit) pillen.push(`<span class="rek-p zeit">${esc(String(h.zeit))}</span>`);
  if(d.zeitraum) pillen.push(`<span class="rek-p">${esc(d.zeitraum)}</span>`);
  if(d.basis > 0) pillen.push(`<span class="rek-p num">${d.basis} P Basis</span>`);
  return pillen.length ? `<div class="rek-meta">${pillen.join('')}</div>` : '';
}

// Der Beleg als Zahl: auf dem Podest ist neben einem 44-px-Wappen kein Platz
// für „27 von 49 Spielen um den letzten Ball · 55 %". Genommen wird das erste
// Zahlwort — dieselbe Zahl, die auch die Karte in der Liste groß zeigt.
// Ein Abstand zwischen zwei Quoten heißt „%-Punkte" und bleibt so stehen:
// gekürzt auf „+12 %" las er sich als zwölf Prozent mehr, und „Vorher waren
// es +58 %" stand unter einem Rekord, der Prozentpunkte zählt.
function _chronKurz(ev){
  const s = String(ev || '').trim();
  const m = s.match(/^([+\u2212-]?\d[^\s]*(?:\s?%(?:-Punkte)?)?)/);
  return m ? m[1] : s;
}

// Titel-Pille unter dem Namen im Profilkopf.
function _titlePillHtml(pid){
  const b = playerTitleBadge(pid);
  if(!b) return '';
  const t = titleTone(b.tone);
  // Ein Banner statt einer Pille: der Beiname ist ein Titel, und die
  // gestrichelte Pille sah aus wie ein Knopf, der noch lädt. Dass der Monat
  // noch läuft, sagt die Zeile darunter („läuft"). Eine Schattenseite steht
  // hier nie (`playerTitleBadge`), das Band ist immer Gold [§C25].
  return `<div class="pp-title-row">
    <span class="pp-banner${b.live ? ' live' : ''}" style="--tt:${t.c};--ttr:${t.rgb}">
      <span class="pp-title-pill"><span class="i">${svgI(b.ic)}</span>${esc(b.name)}</span></span>
    <span class="pp-title-sub num">${esc(b.sub)}</span>
  </div>`;
}

// Liga-Chronik: oben die Rekorde (wer hält was), darunter die Saison-Titel
// als Spieler × Saison-Matrix. Zwei Ebenen derselben Geschichte — Laufbahn
// und Monat — bewusst getrennt statt vermischt.
// ── Chronik-Bausteine ────────────────────────────────────────────────
// Beide Blöcke gab es nur im Chronik-Blatt. Seit der Awards-Tab eigene
// Reiter für Rekorde und Chronik hat, brauchen zwei Orte dasselbe HTML —
// also steht es einmal hier und nicht zweimal fast gleich.

// Die Liga-Rekorde als Liste. `weit` schaltet auf die große Form für den
// Reiter: eigene Kachel je Rekord mit Beleg und Halter statt einer Zeile.
function ligaRekordeHtml(weit){
  const holders = chronicleHolders();
  const recs = CHRONICLES.filter(d => holders[d.id]);
  // Die kleine Form (Profil) entfällt ohne Rekord; der Reiter zeigt die
  // ganze Tafel auch dann, jede Karte noch niemandes. Vorher stand dort nur
  // „Noch hält niemand einen Liga-Rekord." — und keiner wusste, welche es gibt.
  if(!recs.length && !weit) return '';
  if(!weit) return `
    <div class="pp-sec-title" style="margin-top:20px">
      <div class="l"><span class="ic svg-ic">${svgI('rekord')}</span><h4>Liga-Rekorde</h4></div>
      <div class="m">${recs.length} von ${CHRONICLES.length}</div>
    </div>
    <div class="chlist">${recs.map(d => {
      const h = holders[d.id];
      const t = titleTone(d.tone);
      return `<div class="chline" style="--tt:${t.c};--ttr:${t.rgb}" data-chron="${esc(d.id)}">
        <span class="ic">${svgI(d.ic)}</span>
        <span class="n">${esc(d.name)}</span>
        <span class="hd">${esc(_chronHolderNames(h))}</span>
      </div>`;
    }).join('')}</div>
    <div class="tnote">Tippen zeigt, wie ein Rekord gezählt wird.</div>`;
  // Die große Form: ein Rekord ist ein Besitz, also bekommt er eine Karte
  // mit Halter-Gesicht und Beleg — nicht nur einen Namen am Zeilenende.
  //
  // Fünf Kammern statt einer Spalte. Fünfundsechzig Karten sahen alle gleich
  // aus, und „Der Fels" stand neben „Das Scheunentor", als wären es
  // dieselbe Aussage. CHRON_KINDS trennt sie:
  //
  //   BESTMARKEN    Ein Ereignis. Eine Serie, ein Elo-Tag, ein Gipfel —
  //                 an einem Datum passiert, und das steht dabei.
  //   KÖNNEN        Ein Schnitt, eine Quote über die ganze Laufbahn.
  //                 Er hat keinen Zeitpunkt, er gilt heute.
  //   AKTUELLE FORM Ein festes Endfenster: die letzten 20, 25, 40 oder 50
  //                 eigenen Partien. Sie stand vorher im Können, und
  //                 damit stand „Höchste Siegquote in den letzten 20
  //                 Partien" neben einem Laufbahnwert — zwei Zeitachsen in
  //                 einer Kammer, und wer die Tafel liest, kann so nicht
  //                 sehen, was gerade gilt und was für immer.
  //   FÜGUNGEN      Auslosung und letzter Ball [§C35]. Sie zeichnen
  //                 niemanden aus, sie gehören jemandem.
  //   SCHATTENSEITEN Dasselbe, nur andersherum.
  //
  // Deshalb trägt auch nicht jede Karte einen Zeitpunkt: ein Karrieren-
  // schnitt hat keinen. Eine erfundene Jahreszahl unter jedem Rekord wäre
  // schlechter als keine.
  const karte = (d) => {
    const h = holders[d.id];
    // Ein Rekord, den noch niemand geholt hat, wird GESTRICHELT gezeigt und
    // nicht weggelassen: weggelassen ist er unsichtbar, halbdurchsichtig
    // liest er sich als Fehler.
    if(!h) return `<div class="rek offen" data-chron="${esc(d.id)}" data-kammer="${esc(d.kind)}">
      <div class="rek-ic">${svgI(d.ic)}</div>
      <div class="rek-b">
        <div class="rek-z1"><span class="rek-nt">${esc(d.name)}</span>
          <span class="rek-h"><span class="rek-hn">noch niemand</span></span></div>
        <div class="rek-ev">${esc(d.cond)}</div>
        ${_rekordMeta(d, null)}
      </div>
    </div>`;
    const pids = (h.pids || [h.pid]).slice(0, 3);
    // Vier Töne statt der vollen Katalogpalette. Gold gehört Titeln und
    // Rekorden [§C25] — wenn aber fünfunddreißig Karten golden sind, sagt
    // Gold nichts mehr. Eine Fügung trägt deshalb Metall: sie ist kein
    // Können. Eine Schattenseite bleibt rot, die Richtung [§C25].
    const kl = d.neg ? ' schatten' : d.kind === 'fuegung' ? ' fuegung' : '';
    const meta = _rekordMeta(d, h);
    // Der Beleg beginnt fast immer mit seiner Zahl. Sie ist die Aussage der
    // Karte und stand bisher klein und grau unter dem Namen — als Letztes,
    // was man liest. Jetzt trägt sie die Karte, der Rest bleibt Metall.
    const ev = String(h.ev || '');
    const m = ev.match(/^([+\u2212-]?\d[^\s]*(?:\s?%)?)\s+(.*)$/);
    // Der Wert steht groß und links, der Rest des Belegs daneben: „6 %"
    // war fett in 13 px und damit nicht größer als der Name darüber.
    const beleg = m ? `<span class="rek-w num">${esc(m[1])}</span><span class="rek-ev">${esc(m[2])}</span>`
                    : `<span class="rek-ev">${esc(ev)}</span>`;
    // Die Kammer steht als Datum an der Karte, nicht als Farbklasse: eine
    // Fuegung, die von einer Niederlage erzaehlt, traegt Rot und bleibt
    // trotzdem eine Fuegung. Ueber die Klasse waeren Kammer und Farbe
    // dasselbe, und dann kann die eine die andere nicht ueberstimmen.
    return `<div class="rek${kl}" data-chron="${esc(d.id)}" data-kammer="${esc(d.kind)}">
      <div class="rek-ic">${svgI(d.ic)}</div>
      <div class="rek-b">
        <div class="rek-z1"><span class="rek-nt">${esc(d.name)}</span>
          <span class="rek-h">
            ${pids.map(pid => { const p = pmap()[pid];
              return p ? avHtml(p, 'width:21px;height:21px;font-size:9px;border-radius:7px') : ''; }).join('')}
            <span class="rek-hn">${esc(_chronHolderNames(h))}</span>
          </span></div>
        <div class="rek-wz">${beleg}</div>
        ${_rekFeldHtml(d, h)}
        ${meta}
      </div>
    </div>`;
  };

  // ── Wer die Tafel hält ────────────────────────────────────────────
  // Die Frage, für die dieser Reiter da ist — und die er bisher nicht
  // beantwortet hat. Eine Säule je gewertetem Spieler; wer nichts hält,
  // steht gestrichelt da statt zu fehlen.
  const zaehl = rekordZaehlung();
  const maxN = Math.max(1, ...zaehl.map(z => z.n));
  const haltungen = zaehl.reduce((a, z) => a + z.n, 0);
  const leiste = zaehl.length ? `<div class="rek-besitz">
    <div class="rek-bk"><span class="l">Wer die Tafel hält</span>
      <span class="r num">${haltungen} Haltungen · ${recs.length} Rekorde</span></div>
    <div class="rek-saeulen">${zaehl.map(z => {
      const p = pmap()[z.pid];
      return `<span class="rek-sl${z.n ? '' : ' null'}" data-tplayer="${esc(z.pid)}">
        <span class="z num">${z.n}</span>
        <span class="b" style="height:${z.n ? (4 + z.n / maxN * 34).toFixed(1) : 3}px"></span>
        ${p ? avHtml(p, '') : ''}
      </span>`;
    }).join('')}</div>
  </div>` : '';

  const gruppen = Object.keys(CHRON_KINDS)
    .sort((a, b) => CHRON_KINDS[a].ord - CHRON_KINDS[b].ord)
    .map(k => ({k, def:CHRON_KINDS[k], liste:CHRONICLES.filter(d => d.kind === k)}))
    .filter(g => g.liste.length);
  // Jedes Feld nennt seine Zahl. Ohne sie war nicht zu sehen, ob eine Kammer
  // ueberhaupt gefuellt ist, und „Alle" sagte nicht, wie viele Rekorde es
  // gibt — die Frage, mit der jeder auf diesen Reiter kommt.
  const chip = (k, lab, n, an) => `<button data-rekkammer="${esc(k)}"
      class="${an ? 'on' : ''}">${esc(lab)}<span class="n num">${n}</span></button>`;
  // Sechs Felder in zwei Reihen statt einer gescrollten Leiste: dort standen
  // sechs Wörter in 11,5 px eng aneinander, und „Fügungen" und „Schatten"
  // lagen halb hinter dem Rand. Ein Feld je Kammer ist ein Ziel, das man
  // trifft, und alle sechs sind ohne Wischen zu sehen.
  const filter = `<div class="rek-kammern">
    ${chip('', 'Alle', CHRONICLES.length, !rekKammer)}
    ${gruppen.map(g => chip(g.k, g.def.kurz, g.liste.length, rekKammer === g.k)).join('')}
  </div>`;
  const sicht = gruppen.filter(g => !rekKammer || g.k === rekKammer);
  // ── Der Kopf einer Kammer sagt, was sie misst und wem sie gehört ──
  // „Fügungen" stand über zwölf Karten, und warum „Der Rückenwind" dort
  // steht und nicht im Können, sagte erst das Blatt. Darunter die drei, die
  // in der Kammer am meisten halten: die Säulen oben zählen die ganze Tafel,
  // und wer die Form hält, ist nicht zwingend der, der das Können hält.
  const kopfVon = g => {
    const n = {};
    g.liste.forEach(d => { const h = holders[d.id];
      if(h) (h.pids || [h.pid]).forEach(pid => { n[pid] = (n[pid] || 0) + 1; }); });
    const vorn = Object.keys(n).filter(pid => pmap()[pid])
      .sort((a, b) => n[b] - n[a] || pname(a).localeCompare(pname(b))).slice(0, 3);
    const vergeben = g.liste.filter(d => holders[d.id]).length;
    return `<div class="rek-gruppe ${esc(g.k)}">
      <span class="rek-g-ic">${svgI(g.def.ic)}</span>
      <span class="rek-g-n">${esc(g.def.pl)}</span>
      <span class="rek-g-line"></span>
      <span class="rek-g-z num">${g.liste.length}</span>
    </div>
    <div class="rek-g-sub ${esc(g.k)}">
      <span class="rek-g-satz">${esc(g.def.satz || '')}${vergeben < g.liste.length
        ? ` · ${g.liste.length - vergeben} offen` : ''}</span>
      ${vorn.length ? `<span class="rek-g-vorn">${vorn.map(pid =>
        `<span data-tplayer="${esc(pid)}">${avHtml(pmap()[pid], 'width:16px;height:16px;font-size:7px;border-radius:5px')}<b class="num">${n[pid]}</b></span>`).join('')}</span>` : ''}
    </div>`;
  };
  const vorschau = recs.length ? '' : vorschauHtml('rekord', 'Die Liga-Rekorde',
    'Noch hält niemand einen Rekord. Ein Rekord ist der Bestwert über alle Saisons: wer ihn übertrifft, nimmt ihn dem bisherigen Halter ab. Jede Karte nennt ihre Bedingung, getippt zeigt sie, wie gezählt wird.');
  return vorschau + leiste + filter + sicht.map(g => kopfVon(g)
    + `<div class="rek-liste">${g.liste.map(karte).join('')}</div>`).join('');
}

// ── Wo der Halter im Feld steht ─────────────────────────────────────
// Eine Karte nannte den Wert des Halters und sonst nichts: ob der Zweite
// knapp dahinter liegt oder weit weg, stand erst im Blatt. Der Streifen ist
// das Bauteil „Wo im Feld" des Belegs [§C27] — jeder im Rennen ein Punkt,
// der Halter groß am rechten Ende —, daneben der Erste, der ihn nicht hält,
// mit seinem Wert. Gelesen wird dieselbe Reihenfolge, aus der Podest und
// Verfolger des Blatts kommen (`chronicleRang`); keine zweite Rechnung.
function _rekFeldHtml(d, h){
  try {
    const rang = chronicleRang(d.id);
    if(!Array.isArray(rang) || rang.length < 3) return '';
    const halter = new Set(h.pids || [h.pid]);
    const feld = belegFeldHtml(rang.map(r => ({v:r.wert, t:'', er:halter.has(r.pid)})));
    if(!feld) return '';
    const z = rang.find(r => !halter.has(r.pid));
    const p = z && pmap()[z.pid];
    return `<div class="rek-feld">${feld}${p
      ? `<span class="rek-zw">vor ${esc(p.name)} <b class="num">${esc(_chronKurz(z.ev))}</b></span>` : ''}</div>`;
  } catch(e){ return ''; }
}

// Die Saison-Matrix: Zeilen sind Spieler, Spalten Monate, Zellen Titel.
// Zeilen sind die aktive Liga; wer seine Karriere beendet hat, steht in
// einer eigenen Karte am Ende, zu, wie unter Gesamt, Seiten und Teams
// [§C40] — dieselbe Tabelle, nur mit seinen Zeilen. In der Matrix der
// aktiven Liga stand er sonst zwischen denen, die um die nächste Chronik
// spielen, und konnte nie mehr eine Zelle dazubekommen.
// ── Die Chronik vor dem ersten Monat [§C39] ─────────────────────────
// Ohne gewerteten Monat gibt es keine Matrix. Statt eines Satzes auf leerer
// Fläche steht der Katalog: jede Monatschronik mit ihrer Bedingung, nach
// Klasse, noch niemandes — dieselbe Karte wie ein offener Rekord [§C27].
const CHRONIK_VORSCHAU_JE_KLASSE = 3;
function chronikVorschauHtml(){
  const kopf = vorschauHtml('scroll', 'Die Chronik',
    `Jeder Monat bekommt seine Chronik: Einträge für das, worin jemand in diesem Monat besonders war, gegen die Erwartung, über jeden Spieltag, gegen einen bestimmten Gegner. Gefragt wird nicht, wer der Beste war. Gewertet wird, wer im Monat mindestens <b>${CHRONIK_MIN_SPIELE} Partien</b> hat, und jeder Eintrag gehört dem, der den Bestwert hält. Die Tabelle stellt dann die Monate nebeneinander; bis dahin stehen hier alle Einträge, die es gibt.`);
  // Drei je Klasse offen, der Rest klappt auf: alle hundert untereinander
  // waren zehn Bildschirme, und die Klassen darunter sah niemand mehr.
  const karte = t => `<div class="rek offen">
        <div class="rek-ic">${svgI(t.ic)}</div>
        <div class="rek-b">
          <div class="rek-z1"><span class="rek-nt">${esc(t.name)}</span>
            <span class="rek-h"><span class="rek-hn">noch offen</span></span></div>
          <div class="rek-ev">${esc(t.cond)}</div>
        </div>
      </div>`;
  return kopf + LC_STUFEN.map(kl => {
    const liste = SEASON_TITLES.filter(t => t.klasse === kl);
    if(!liste.length) return '';
    const rest = liste.slice(CHRONIK_VORSCHAU_JE_KLASSE);
    return `<div class="vs-kat" data-kl="${kl}">${esc(CHRONIK_KLASSE_NAME[kl])} · ${liste.length}</div>
      <div class="rek-liste">${liste.slice(0, CHRONIK_VORSCHAU_JE_KLASSE).map(karte).join('')}</div>${rest.length
        ? `<details class="vs-mehr"><summary>${rest.length} weitere</summary>
            <div class="rek-liste">${rest.map(karte).join('')}</div></details>` : ''}`;
  }).join('');
}
function ligaChronikMatrixHtml(){
  const all = allSeasonTitles();           // neueste zuerst
  const cols = all.slice(0, 8).reverse();  // älteste links, wie eine Zeitleiste
  if(!cols.length) return '';
  const rows = _lchronZeilen(cols);
  const aktiv = rows.filter(pid => ligaAktiv(pid));
  const ruhe = rows.length - aktiv.length;
  // Die Legende nennt die Stufen [§C39]. Sie nannte daneben ihren Wert, 150,
  // 100 und 50; seit jede Chronik außer einer Schattenseite denselben
  // Grundwert bringt, stünde dreimal dieselbe Zahl da.
  return `${_lchronTabelle(cols, aktiv)}
    <div class="lchron-lg" aria-hidden="true">${LC_STUFEN.map(st =>
      `<span data-kl="${st}">${esc(CHRONIK_KLASSE_NAME[st])}</span>`).join('')}<span class="live">läuft noch</span></div>`
    + (ruhe ? `<div class="ruhe-ende">${einblickHtml('ruhe_chronik', ruhe === 1 ? 'ein Spieler' : ruhe + ' Spieler')}</div>` : '');
}
// Die Zeilen der Matrix: alle, die in einer der Spalten gewertet wurden.
// Sortiert nach dem PRESTIGE der Zellen, dann nach der Zahl aller Einträge,
// dann nach Name. Gezählt wird je Monat der Eintrag, der in der Zelle steht
// und fürs Prestige zählt (`chronikEintragVon`) [§C32], nur in den
// sichtbaren Spalten — die Tabelle soll die Ordnung erklären, die man sieht.
// Vorher zählte jeder Eintrag eines Monats mit; seit jede Chronik denselben
// Grundwert bringt [§C39], war das nur noch ihre Zahl, und neun Einträge in
// einem Monat standen über drei Monaten mit je einem.
function _lchronZeilen(cols){
  const seen = {}, wert = {};
  cols.forEach(T => {
    T.awarded.forEach(a => { seen[a.pid] = (seen[a.pid] || 0) + 1; });
    new Set(T.awarded.map(a => a.pid)).forEach(pid => {
      const a = chronikEintragVon(T, pid);
      wert[pid] = (wert[pid] || 0) + chronikPunkte(a.titleId, a.wert);
    });
    (T.empty || []).forEach(pid => { if(seen[pid] === undefined){ seen[pid] = 0; wert[pid] = 0; } });
  });
  return Object.keys(seen)
    .filter(pid => pmap()[pid])
    .sort((a,b) => (wert[b] || 0) - (wert[a] || 0)
                || seen[b] - seen[a]
                || pname(a).localeCompare(pname(b)));
}
// Die Tabelle selbst. Der Kopf jeder Spalte nennt den Monat, darunter, wie
// viele Einträge er trägt, und als schmales Band, wie sie sich auf die vier
// Stufen verteilen; die laufende Spalte ist getönt, weil ihre Zellen bis zum
// Monatsende noch wechseln können. Eine leere Zelle sagt zweierlei: ein
// Strich heißt gewertet ohne Eintrag, eine leere Zelle heißt in diesem Monat
// nicht gewertet — vorher stand in beiden Fällen derselbe Strich, und wer
// einen Monat ausgesetzt hatte, sah aus wie einer, der leer ausging.
//
// Die Zelle trägt die Farbe ihrer Stufe [§C39] und, wenn der Spieler im
// selben Monat mehr hält, deren Zahl („+2"): die Matrix zeigte je Monat einen
// Eintrag, und dass Martin im August neun hielt, stand nirgends. Unter dem
// Namen steht, wie viele Zellen der Zeile golden, lila, metallen und rot
// sind — „5 Einträge" sagte nicht, welche.
const LC_STUFEN = ['legendaer', 'selten', 'besonders', 'schatten'];
function _lchronTabelle(cols, rows){
  if(!rows.length) return '';
  const gewertet = cols.map(T => new Set((T.awarded || []).map(a => a.pid).concat(T.empty || [])));
  const band = T => {
    const je = {};
    (T.awarded || []).forEach(a => { const st = chronikStufe(a.titleId); if(st) je[st] = (je[st] || 0) + 1; });
    const n = LC_STUFEN.reduce((x, st) => x + (je[st] || 0), 0);
    return n ? `<span class="lc-st">${LC_STUFEN.filter(st => je[st]).map(st =>
      `<i data-kl="${st}" style="width:${(je[st] / n * 100).toFixed(1)}%"></i>`).join('')}</span>` : '';
  };
  let gold = 0;
  return `
    <div class="lchron-wrap">
      <table class="lchron">
        <thead><tr><th>Spieler</th>${cols.map(T =>
          // Der Monat trägt sein Jahr: nach dem zweiten Oktober stünden sonst
          // zwei Spalten „OKT" nebeneinander, und welche welche ist, sagte
          // erst ein Tipp auf den Kopf.
          `<th class="${T.live ? 'live' : ''}" data-season-table="${esc(T.sid)}"><span class="lc-m">${esc(String(T.label).split(' ')[0].slice(0,3))}<span class="lc-j">’${esc(String(T.sid).slice(2, 4))}</span></span>`
          + `<span class="lc-z num">${T.awarded.length}</span>${band(T)}</th>`
        ).join('')}</tr></thead>
        <tbody>
          ${rows.map(pid => {
            // Die Zeile ist Geschichte bis zum Ende des letzten Monats, in dem
            // sie einen Eintrag trägt (`data-bis`, [§C40]): ein Ruheständler
            // darf in ihr stehen, solange dieser Monat vor seinem
            // Karriereende zu war.
            const bis = Math.max(...cols.filter(T => T.awarded.some(x => x.pid === pid)).map(T => seasonEnd(T.sid).getTime()));
            const zellen = cols.map(T => chronikEintragVon(T, pid));
            // Die Stufe der ZELLE, nicht die ihres Eintrags [§C39]: die
            // höchste Klasse, die der Spieler im Monat hält. Die Zahlen unter
            // dem Namen zählen dieselben Farben, die man in der Zeile sieht.
            const stufen = cols.map((T, k) => zellen[k] ? chronikZellStufe(T, pid) : '');
            const je = {};
            stufen.forEach(st => { if(st) je[st] = (je[st] || 0) + 1; });
            const zahl = LC_STUFEN.filter(st => je[st]).map(st => `<b data-kl="${st}">${je[st]}</b>`).join('');
            return `<tr${isFinite(bis) ? ` data-bis="${bis}"` : ''}>
            <td class="who" data-tplayer="${esc(pid)}"><div class="w">${avHtml(pmap()[pid])}`
              + `<span class="wt"><span>${esc(pname(pid))}</span>${zahl ? `<small class="lc-zahl num">${zahl}</small>` : ''}</span></div></td>
            ${cols.map((T, k) => {
              const a = zellen[k];
              if(!a) return `<td class="${T.live ? 'live' : ''}">${gewertet[k].has(pid) ? '<span class="lc-dash">—</span>' : ''}</td>`;
              const kl = stufen[k];
              const t = titleTone(CHRONIK_STUFE_TON[kl] || a.tone);
              const mehr = T.awarded.filter(x => x.pid === pid).length - 1;
              // Gold glänzt, jede Zelle in ihrem eigenen Takt (`--k`), damit
              // nicht alle zugleich aufleuchten.
              const glanz = kl === 'legendaer' ? ` style="--tt:${t.c};--ttr:${t.rgb};--k:${gold++}"` : ` style="--tt:${t.c};--ttr:${t.rgb}"`;
              return `<td class="${T.live ? 'live' : ''}"><span class="lc-cell${T.live?' live':''}"${glanz}${
                kl ? ` data-kl="${esc(kl)}"` : ''}
                data-season-table="${esc(T.sid)}">
                <span class="i">${svgI(a.ic)}</span>
                <span class="n">${esc(a.short || a.name)}</span>${mehr > 0 ? `<i class="lc-mehr num">+${mehr}</i>` : ''}</span></td>`;
            }).join('')}
          </tr>`; }).join('')}
        </tbody>
      </table>
    </div>`;
}
// Die Karte der Ruheständler: dieselben Spalten, nur ihre Zeilen [§C40].
function ruhestandChronikHtml(){
  const cols = allSeasonTitles().slice(0, 8).reverse();
  return _lchronTabelle(cols, _lchronZeilen(cols).filter(pid => !ligaAktiv(pid)));
}

// Ans rechte Ende scrollen: die jüngste Saison interessiert am meisten,
// ältere holt man sich durch Wischen nach rechts. Nur bei echtem Überlauf —
// bei vier Saisons passt alles aufs Handy, und ein halb abgeschnittener
// erster Monat sähe nach Fehler aus statt nach Absicht.
function chronikMatrixScrollen(root){
  (root || document).querySelectorAll('.lchron-wrap').forEach(lw => {
    if(lw.scrollWidth > lw.clientWidth + 24) lw.scrollLeft = lw.scrollWidth;
  });
}

function showLigaChronik(){
  _sheetSetReopen(()=>showLigaChronik());
  const all = allSeasonTitles();
  const cols = all.slice(0, 8);
  const holders = chronicleHolders();
  const recs = CHRONICLES.filter(d => holders[d.id]);
  const recHtml = ligaRekordeHtml(false);
  const matrix = ligaChronikMatrixHtml();

  if(!matrix){
    openSheet(`${blattKopfHtml({ic:'scroll', ton:'gold', titel:'Liga-Chronik',
      unter:recs.length ? recs.length + ' Liga-Rekorde · noch keine Saison mit Chronik' : 'Noch keine Saison mit Chronik'})}
      ${recHtml || emptyState('scroll','Sobald ein Monat gespielt ist, füllt sich die Chronik.')}`);
    _bindChronikClicks(document.getElementById('sheet'));
    return;
  }
  const total = cols.reduce((n,T) => n + T.awarded.length, 0);
  openSheet(`
    ${blattKopfHtml({ic:'scroll', ton:'gold', titel:'Liga-Chronik',
      unter:cols.length + ' Saison' + (cols.length===1?'':'s') + ' · ' + total + ' Einträge · ' + recs.length + ' Rekorde'})}
    ${matrix}
    ${recHtml}
  `);
  chronikMatrixScrollen(document.getElementById('sheet'));
  _bindChronikClicks(document.getElementById('sheet'));
  einblickBinden(document.getElementById('sheet'));
}

// Klick-Verdrahtung für Chronik-Elemente. `data-tplayer` statt `data-detail`,
// damit die globalen [data-detail]-Handler die Zellen nicht doppelt belegen.
function _bindChronikClicks(root){
  if(!root) return;
  root.querySelectorAll('[data-season-table]').forEach(el => {
    el.onclick = (e) => { e.stopPropagation(); sheetNav(()=>showSeasonTable(el.dataset.seasonTable)); };
  });
  root.querySelectorAll('[data-tplayer]').forEach(el => {
    el.onclick = (e) => { e.stopPropagation(); sheetNav(()=>showPlayer(el.dataset.tplayer)); };
  });
  root.querySelectorAll('[data-tdisz]').forEach(el => {
    el.onclick = (e) => { e.stopPropagation();
      sheetNav(()=>showDisziplin(el.dataset.tdisz, el.dataset.tsid || null)); };
  });
  root.querySelectorAll('[data-chron]').forEach(el => {
    el.onclick = (e) => { e.stopPropagation(); sheetNav(()=>showChronicle(el.dataset.chron)); };
  });
  _chronMehrBinden(root);
  // Das Insignium im Profilkopf ist selbst der Knopf zur Laufbahn [§13.10].
  root.querySelectorAll('[data-prestige]').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = (e) => { e.stopPropagation(); sheetNav(()=>showLaufbahn(el.dataset.prestige)); };
  });
}

// Was hinter „N weitere anzeigen" steht, klappt dort auf, wo es steht: die
// Liga-Rekorde im Profil, die Einträge einer Monatstafel, die nicht zählen.
// Der Knopf trägt im Datensatz seine Aufschrift für den geschlossenen Zustand.
function _chronMehrBinden(root){
  root.querySelectorAll('[data-chron-more]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const rest = el.previousElementSibling;
      if(!rest) return;
      const auf = rest.classList.toggle('open');
      el.classList.toggle('open', auf);
      el.setAttribute('aria-expanded', String(auf));
      const tx = el.querySelector('.tx');
      if(tx) tx.textContent = auf ? 'Weniger anzeigen' : el.dataset.chronMore;
    };
  });
}
// Der Knopf dazu. `n` ist die Zahl dessen, was er aufklappt.
function _chronMehrKnopf(n){
  const zu = n === 1 ? '1 weiteren anzeigen' : n + ' weitere anzeigen';
  return `<button class="chron-more" type="button" data-chron-more="${esc(zu)}" aria-expanded="false">
      <span class="tx">${esc(zu)}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>`;
}

// ─── §13.6 Marken neben dem Namen (Rangliste) ────────────────────────
// Genau zwei Dinge stehen neben einem Namen, und beide sagen etwas, das
// sonst nirgends in der Zeile steht:
//   1. Meistertitel mit Anzahl — das Lebenswerk. Gold, massiv.
//   2. Der Saisontitel, den er GERADE in dieser Saison hält — gestrichelt,
//      weil er bis zum Monatsende noch kippen kann.
// Die Chronik kommt hier bewusst NICHT vor: sie steht im Profil, und in
// einer 12er-Liga trüge sonst jeder eine Marke — das unterscheidet nichts.
function _playerRankMarks(pid){
  const out = [];
  let rows = [];
  try { rows = seasonTitleHistory(pid) || []; } catch(e){ rows = []; }
  // Meistertitel kommen seit v9.18 direkt aus der Rangliste (seasonChampion),
  // nicht mehr aus der Chronik: Platz 1 ist keine Chronik-Bedingung mehr.
  const champLabels = [];
  rows.forEach(r => { if(!r.live && seasonChampion(r.sid) === pid) champLabels.push(r.label); });
  if(champLabels.length){
    out.push({ic:'crown', tone:'gold', kind:'champ', n:champLabels.length, live:false,
              label: champLabels.length > 1 ? `${champLabels.length}× Meister` : 'Der Meister',
              sub: champLabels.join(', ')});
  }
  const cur = rows.find(r => r.live && r.title);
  if(cur) out.push({ic:cur.title.ic, tone:cur.title.tone, kind:'season', n:1, live:true,
                    label:cur.title.name, sub:`${cur.label} · Stand heute`});
  return out;
}
// Rendert die Marken: nur Icons im Ton der Auszeichnung, mit leichtem Schein
// und optionaler Anzahl. Kein Kasten, kein Rahmen — neben einem Namen soll das
// wie eine Auszeichnung wirken, nicht wie ein Button. Der laufende Titel
// bekommt einen gestrichelten Ring: noch nicht entschieden.
// opts.ohneChamp — die Meistertitel stehen seit [§C26] als Sterne am Avatar.
// Wo das Zeichen läuft, wäre die Krone daneben dieselbe Aussage zweimal.
// In einer Rangliste steht die Marke ohne Beschriftung neben dem Namen. Dort
// heißt sie nur „hält gerade einen Titel" — und das ist nach dem Farbgesetz
// [§C25] Gold. Der Disziplinton hilft erst dort, wo der Name danebensteht:
// in der Chronik und im Profil. `einfarbig` unterscheidet die beiden Fälle.
function _titleMarkHtml(pid, size, opts){
  let marks = _playerRankMarks(pid);
  if(opts && opts.ohneChamp) marks = marks.filter(b => b.kind !== 'champ');
  if(!marks.length) return '';
  return marks.map(b => {
    // `einfarbig` heißt zwei Töne, nicht einer: in der Rangliste steht kein
    // Name neben der Marke, dort soll sie nur sagen „hält gerade einen
    // Titel". Was für ein Titel, verrät erst das Profil — außer es ist eine
    // Schattenseite. Die trägt Rot, sonst hieße eine Flaute dasselbe wie ein
    // Meistertitel. Der Katalog gibt Schattenseiten durchweg tone:'red'.
    const t = (opts && opts.einfarbig)
      ? (b.tone === 'red' ? TITLE_TONES.red : TITLE_TONES.gold)
      : titleTone(b.tone);
    const cls = 'tmark' + (b.live ? ' live' : '') + (b.n > 2 ? ' honor' : '')
              + (size === 'lg' ? ' lg' : '') + (b.tone === 'red' ? ' schatten' : '');
    const cnt = b.n > 1 ? `<i>${b.n}</i>` : '';
    return `<span class="${cls}" style="--tt:${t.c};--ttr:${t.rgb}" title="${esc(b.label + ' · ' + b.sub)}">${svgI(b.ic)}${cnt}</span>`;
  }).join('');
}

// ─── §13.7 Avatar-Ring: der Zustand von JETZT ────────────────────────
//     Ein farbiger Ring um den Avatar sagt in der Liste sofort, wer gerade
//     brennt, wer abstürzt, wer amtierender Meister ist. Anders als Titel
//     und Chroniken ist er FLÜCHTIG — er kann nächste Woche weg sein, und
//     genau das macht ihn spannend.
//
//     Jeder Spieler hat EINEN Ring, aber so viele Zeichen daran, wie er
//     gerade Zustände trägt — nach Priorität geordnet. Vorher stand nur der
//     erste: wer Player of the Week, Team of the Season und Player of the
//     Day zugleich war, zeigte eins davon, und die anderen beiden gab es im
//     Profil nirgends. Die Liste kommt in einem Rutsch für die ganze Liga
//     und wird gecacht.
// Der Ring hatte fuenf Farben fuer sieben Zustaende — Gold, Orange, Rot,
// Lila, Blau — und damit keine Aussage: man musste die Legende kennen, um
// ihn zu lesen. Nach dem Farbgesetz [§C25] gibt es hier nur drei:
//   Gold  — eine Auszeichnung, die derjenige HEUTE traegt
//   Gruen — ein Lauf, der gerade gut geht
//   Rot   — ein Lauf, der gerade schlecht geht
// Damit sagt schon die Farbe, ob der Ring ein Lob oder eine Warnung ist.
const AV_RINGS = {
  champ: {prio:92, tone:'gold', ic:'crown',       label:'Titelverteidiger'},
  blaze: {prio:88, tone:'acid', ic:'flameTriple', label:'Siegesserie'},
  abyss: {prio:86, tone:'red',  ic:'dropTriple',  label:'Niederlagenserie'},
  potw:  {prio:80, tone:'gold', ic:'weekKing',    label:'Player of the Week'},
  hot:   {prio:74, tone:'acid', ic:'flame',       label:'Siegesserie'},
  cold:  {prio:72, tone:'red',  ic:'drop',        label:'Niederlagenserie'},
  potd:  {prio:68, tone:'gold', ic:'dayKing',     label:'Player of the Day'},
  tots:  {prio:64, tone:'gold', ic:'handshake',         label:'Team of the Season'},
};
function avatarRings(){
  // Woche und Tag gehören in den Schlüssel: um 23:59 wird ein Spieler des
  // Tages fertig, am Montag einer der Woche — ohne neue Partie, und ohne
  // sie hielt der Ring den alten bis zur nächsten.
  const jetzt = new Date(), heute = tagKey(jetzt);
  const key = matches.length + '_' + _cache.version + '_' + _wochenKey(jetzt)
    + '_' + heute + (_tagZu(heute) ? 'z' : '');
  if(_cache._avRingKey === key) return _cache._avRing;
  const out = {};
  const put = (pid, kind, sub) => {
    if(!pid) return;
    const def = AV_RINGS[kind];
    if(!def) return;
    (out[pid] = out[pid] || []).push({kind, prio:def.prio, tone:def.tone, ic:def.ic, label:def.label, sub});
  };
  try {
    const gSim = getGlobalSim();
    const pm = pmap();
    const curSid = currentSeason().id;

    // Amtierender Meister = Meistertitel der letzten abgeschlossenen Saison.
    const prevSid = _prevSeasonId(curSid);
    if(prevSid && matchesInSeason(prevSid).length){
      const champPid = seasonChampion(prevSid);
      if(champPid) put(champPid, 'champ', 'Meister ' + seasonLabel(prevSid));
    }

    // Team of the Season der laufenden Saison — beide Hälften.
    const team = _seasonTeamRanking(matchesInSeason(curSid), curSid)[0];
    if(team) team.ids.forEach(id => put(id, 'tots',
      'mit ' + pname(team.ids.find(x => x !== id) || id)));

    // Player of the Week und Player of the Day: je Spieler aus SEINER
    // letzten abgeschlossenen Woche und SEINEM letzten abgeschlossenen
    // Spieltag mit eigenen Partien. Wer dort gewann, trägt das Zeichen, bis
    // ein Zeitraum zu Ende geht, in dem er wieder gespielt und nicht gewonnen
    // hat. Gezählt wurde der letzte Zeitraum der LIGA: Leon war am 21.10.
    // Spieler des Tages, am 22., 23. und 24. spielte die Liga ohne ihn, und
    // sein Zeichen ging an Spieltage, an denen er gar nicht angetreten war.
    // Mehrere tragen es so zugleich, jeder für seinen letzten Spieltag; der
    // Titelverteidiger bleibt einer, die Vorsaison hat nur einen Meister.
    // Ein Zeitraum ohne Sieger nimmt es auch: wer an seinem letzten Tag nicht
    // gewann, trug sonst den Sieg eines älteren, als wäre er es noch.
    // Nach der Zeit der Partie, nicht nach dem Schlüssel: „2027-W10" steht
    // als Text vor „2027-W9", und so trug im März der Sieger der neunten
    // Woche das Zeichen bis in die dreizehnte.
    const laufendeWoche = _wochenKey(Date.now()), tagZu = {}, letzte = {};
    matches.forEach(m => {
      const t = mts(m), w = _wochenKey(m.created_at), d = mdayKey(m);
      if(tagZu[d] === undefined) tagZu[d] = _tagZu(d);
      [m.a1, m.a2, m.b1, m.b2].forEach(pid => {
        if(!pid) return;
        const l = letzte[pid] || (letzte[pid] = {wkT:-Infinity, tgT:-Infinity, wk:null, tg:null});
        if(w !== laufendeWoche && t > l.wkT){ l.wkT = t; l.wk = w; }
        if(tagZu[d] && t > l.tgT){ l.tgT = t; l.tg = d; }
      });
    });
    const wk = _periodWinnerMap(matches, 'week'), tg = _periodWinnerMap(matches, 'day');
    Object.keys(letzte).forEach(pid => {
      const l = letzte[pid];
      if(l.wk && wk[l.wk] === pid) put(pid, 'potw', 'Woche ' + l.wk.split('-W')[1]);
      if(l.tg && tg[l.tg] === pid) put(pid, 'potd', 'Spieltag ' + datumFmt(new Date(l.tg + 'T12:00:00Z'), 'tm'));
    });

    // Serien zuletzt. Eine Siegesserie und eine Niederlagenserie schließen
    // sich aus, neben allem anderen steht die Serie als eigenes Zeichen.
    Object.keys(pm).forEach(id => {
      if(!ligaAktiv(pm[id])) return;
      const cs = gSim.curStreak[id] || 0;
      if(cs >= 8)      put(id, 'blaze', cs + ' Siege in Folge');
      else if(cs >= 5) put(id, 'hot',   cs + ' Siege in Folge');
      else if(cs <= -8) put(id, 'abyss', (-cs) + ' Niederlagen in Folge');
      else if(cs <= -5) put(id, 'cold',  (-cs) + ' Niederlagen in Folge');
    });
  } catch(e){ /* Ring ist Zierde — er darf die Rangliste nie kippen. */ }
  Object.values(out).forEach(l => l.sort((a, b) => b.prio - a.prio));
  _cache._avRingKey = key;
  _cache._avRing = out;
  return out;
}
// Alle Zustände, die jemand gerade trägt, der wichtigste zuerst.
function avRingeOf(pid){
  if(imRuhestand(pid)) return [];
  try { return avatarRings()[pid] || []; } catch(e){ return []; }
}
// Der wichtigste — er färbt den Avatar in Listen und steht im Profil vorn.
function avRingOf(pid){
  return avRingeOf(pid)[0] || null;
}

// Zusatz-Attribute für einen Avatar mit Ring — von avHtml() eingesetzt.
// Der Ring liegt als box-shadow auf dem Avatar selbst: kein zusätzliches
// Element, kein Einfluss auf das Layout der Zeile.
function _avRingAttrs(pid){
  const r = avRingOf(pid);
  if(!r) return null;
  const t = titleTone(r.tone);
  return {
    cls: ' avring r-' + r.kind,
    style: `--tt:${t.c};--ttr:${t.rgb};`,
    attr: ` title="${esc(r.label + ' · ' + r.sub)}"`
  };
}

// [§C25] Eine Seite, eine Farbe: die Siegesserie trägt im Profil die
// Rangfarbe, weil dort schon die Flamme in ihr brennt. Gold bleibt den
// Titeln, Rot der Niederlagenserie — beides sind eigene Aussagen.
function _avRingTon(r){
  return (r.kind === 'blaze' || r.kind === 'hot')
    ? {c:'var(--ak)', rgb:'var(--ak-rgb)'} : titleTone(r.tone);
}

// Die Plätze der Zeichen am Ring, im Uhrzeigersinn von oben, in Grad. Oben
// rechts steht der wichtigste, wo vorher der einzige stand; der zweite
// spiegelt ihn nach links, die nächsten folgen an den Seiten. Oben in der
// Mitte sitzt die Krone der hohen Stufen, unten der Schild mit dem Platz —
// beide bleiben frei. Fünf Plätze, weil es höchstens fünf Zustände zugleich
// gibt: Titelverteidiger, Woche, Tag, Team und eine Serie.
const AV_RING_PLAETZE = [45, -45, 100, -100, 145];
function _avRingMarkenHtml(pid){
  return avRingeOf(pid).slice(0, AV_RING_PLAETZE.length).map((r, i) => {
    const t = _avRingTon(r), w = AV_RING_PLAETZE[i] * Math.PI / 180;
    const x = Math.round(Math.sin(w) * 58), y = Math.round(-Math.cos(w) * 58);
    return `<span class="pp-av-mark" style="--tt:${t.c};--ttr:${t.rgb};--i:${i};`
      + `left:calc(50% + ${x}px);top:calc(50% + ${y}px)" title="${esc(r.label + ' · ' + r.sub)}"><span class="d">${svgI(r.ic)}</span></span>`;
  }).join('');
}

// Erklär-Zeile für den Profilkopf: welcher Ring, warum. Sie nennt den
// wichtigsten Zustand; trägt jemand mehrere, klappt sie auf und nennt jeden
// in derselben Form. Mehrere Zeilen von Anfang an schoben die Elo-Werte
// unter den Rand des ersten Bilds.
function _avRingChipHtml(pid){
  const l = avRingeOf(pid);
  if(!l.length) return '';
  const chip = (r, tag, attr, stil) => {
    const t = _avRingTon(r);
    return `<${tag} class="pp-ring-chip"${attr} style="--tt:${t.c};--ttr:${t.rgb}${stil}">
    <span class="i">${svgI(r.ic)}</span>
    <b>${esc(r.label)}</b><span class="s num">${esc(r.sub)}</span>`;
  };
  if(l.length === 1) return chip(l[0], 'div', '', '') + '\n  </div>';
  return `<div class="pp-ringe">
    ${chip(l[0], 'button', ' type="button" data-ringe aria-expanded="false"', '')}
    <span class="pp-ring-mehr num">+${l.length - 1}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span>
    </button>
    <div class="pp-ring-rest">${l.slice(1).map((r, i) => chip(r, 'div', '', ';--i:' + i) + '</div>').join('')}</div>
  </div>`;
}
function _avRingBinden(root){
  const b = root.querySelector('[data-ringe]');
  if(!b) return;
  b.onclick = (e) => {
    e.stopPropagation();
    const auf = b.parentNode.classList.toggle('open');
    b.setAttribute('aria-expanded', String(auf));
  };
}

