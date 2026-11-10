// Realtime und Auto-Sync der Stories: wie neue Karten von anderen Geräten
// und aus dem Hintergrund in den Feed kommen. Lag in 29-news-cache.js.
// ─── §11.8 — Realtime-Subscription auf `stories` (v8.4) ──────────────
// Wenn ein ANDERES Gerät neue Stories inserted (via syncStoriesViaDb auf der
// Gegenstelle), bekommt dieses Gerät das ohne App-Reload mit. Der Channel wird
// EINMAL beim ersten erfolgreichen DB-Sync aufgebaut und danach
// wiederverwendet — loadAll re-subscribed NICHT (Guard über _storiesChannel).
//
// VORAUSSETZUNG (Dashboard, einmalig): Replication muss für `stories` aktiv
// sein — Database → Replication → supabase_realtime → stories. Ist sie NICHT
// aktiv, liefert subscribe() trotzdem 'SUBSCRIBED', es kommen aber keine
// Events. Das ist clientseitig nicht erkennbar → hier nur dokumentiert.
//
// Graceful degradation: schlägt der Channel fehl (CHANNEL_ERROR/TIMED_OUT),
// läuft die App mit dem bestehenden loadAll-basierten Sync normal weiter —
// kein UI-Block, nur console.warn (hinter NEWS_DEBUG).
let _storiesChannel = null;

function _ensureStoriesRealtime(){
  if(_storiesChannel) return;                       // bereits abonniert
  if(typeof sb === 'undefined' || !sb || !sb.channel) return;
  try {
    // Sofort referenzieren → verhindert doppeltes subscribe bei zwei schnell
    // aufeinanderfolgenden loadAll, bevor der async subscribe-Callback feuert.
    _storiesChannel = sb.channel('stories_changes')
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'stories' },
          (payload) => { try { _onStoryRealtimeInsert(payload.new); }
                         catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] realtime insert failed', e); } })
      .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'stories' },
          (payload) => { try { _onStoryRealtimeUpdate(payload.new); }
                         catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] realtime update failed', e); } })
      .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'stories' },
          (payload) => { try { _onStoryRealtimeDelete(payload.old); }
                         catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] realtime delete failed', e); } })
      .subscribe((status) => {
        if(NEWS_DEBUG || window.NEWS_DEBUG) console.log('[news] realtime status:', status);
        if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
          // Channel verwerfen → ein späterer syncStoriesViaDb darf neu versuchen.
          if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] realtime inactive ('+status+'). LoadAll-Sync bleibt aktiv');
          _storiesChannel = null;
        }
      });
  } catch(e){
    if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] realtime subscribe failed', e);
    _storiesChannel = null;
  }
}

// INSERT: neue Story eines anderen Geräts in den Memory-Cache übernehmen.
function _onStoryRealtimeInsert(row){
  if(!row || !row.id) return;
  if(!Array.isArray(_cache._stories)) _cache._stories = [];
  // Eigener Insert / Duplikat → ignorieren.
  if(_cache._stories.some(s => s.id === row.id)) return;
  const story = _rowToStory(row);
  // Einsortieren (newest-first nach event_at) + auf 100 kürzen (Reserve, §11.2).
  // NEUE Array-Referenz → Konsolidierungs-Memo (§11.2) bricht sauber.
  const next = _cache._stories.concat([story]);
  next.sort(_storyFolge);
  _cache._stories = next;
  // Badge + Toast + offene Views aktualisieren (Story-Detail #ndBg bleibt unberührt).
  _refreshOpenNewsViews();
}

// UPDATEs werden ausschließlich für die heutige Ewige Tafel akzeptiert.
// Ein versehentliches Update einer normalen oder historischen Story kann so
// keinen bereits gelesenen Snapshot umschreiben.
function _onStoryRealtimeUpdate(row){
  if(!row || !row.id) return;
  const story = _rowToStory(row);
  if(!_storyIstTafelUpdate(story, new Date())) return;
  if(!Array.isArray(_cache._stories)) _cache._stories = [];
  const alt = _cache._stories.findIndex(s => s.id === story.id);
  const next = _cache._stories.slice();
  if(alt >= 0) next[alt] = story; else next.push(story);
  next.sort(_storyFolge);
  _cache._stories = next;
  _refreshOpenNewsViews();
}

// DELETE: abgelaufene/gelöschte Story aus dem Memory-Cache entfernen.
function _onStoryRealtimeDelete(row){
  if(!row || !row.id) return;
  if(!Array.isArray(_cache._stories)) return;
  const before = _cache._stories.length;
  _cache._stories = _cache._stories.filter(s => s.id !== row.id);
  if(_cache._stories.length === before) return; // war nicht im Cache → nichts tun
  // Feed re-rendern (Karte verschwindet). Badge NICHT anfassen — newsBadgeRefresh
  // zählt beim nächsten Lauf ohnehin nur noch vorhandene Stories.
  try { if(_isNewsFeedOpen()) _renderNewsFeed(); } catch(e){}
}

// Offen-Zustand (DOM): der Feed lebt im #sheet und ist an `.nf-wrap`
// erkennbar. Gefragt war hier `.nv-list-flat` — eine Klasse aus dem alten
// Mini-Popup, die der Feed seit dem Umbau nicht mehr setzt. Damit war er nie
// „offen", und eine Story, die per Realtime hereinkam, erschien erst beim
// nächsten Öffnen. Story-Detail (#ndBg) wird bewusst nicht live verändert.
function _isNewsFeedOpen(){
  const sheet = document.getElementById('sheet');
  return !!(sheet && sheet.classList.contains('show') && sheet.querySelector('.nf-wrap'));
}
// Cleanup beim App-Close: sauberer Realtime-Disconnect.
window.addEventListener('beforeunload', () => {
  try { if(_storiesChannel) _storiesChannel.unsubscribe(); } catch(e){}
});

// Offene News-Views konsistent aktualisieren (Badge/Toast + Feed).
// Story-Detail (#ndBg) wird bewusst NICHT angefasst (User liest gerade etwas).
function _refreshOpenNewsViews(){
  try { newsBadgeRefresh(); } catch(e){}
  try { if(_isNewsFeedOpen()) _renderNewsFeed(); } catch(e){}
}

// ─── §11.9 — Periodischer News-Auto-Sync (v8.5) ──────────────────────
// Lässt ambiente Fun-Fact-Stories (§11.1b) OHNE Reload erscheinen: alle paar
// Minuten neu synchronisieren. Pausiert bei verstecktem Tab (spart Requests)
// und holt beim Wieder-Sichtbarwerden nach (verpasster 15-Uhr-Slot), sobald
// die Partien von jetzt da sind.
// Spamfrei: IDs sind tages-deterministisch und normale Inserts unveraenderlich.
let _newsAutoSyncTimer = null;
let _newsAutoSyncRunning = false;
async function _newsAutoSyncTick(){
  if(_newsAutoSyncRunning) return;                       // kein Overlap
  if(typeof document !== 'undefined' && document.hidden) return; // Tab im Hintergrund
  if(typeof syncStoriesViaDb !== 'function') return;
  _newsAutoSyncRunning = true;
  try {
    // Nur aus den Partien von eben [§C42]: wer aus dem Hintergrund kommt,
    // hält noch die von vorher, und ein Fun Fact daraus kennt die Partien des
    // Tages nicht. Gewartet wird auf den Abruf, den das Zurückkommen schon
    // gestartet hat; läuft keiner — ein Blatt ist offen —, rechnet der Takt
    // nicht.
    if(!_datenFrisch() && _loadAllPromise) await _loadAllPromise;
    if(!_datenFrisch()) return;
    await syncStoriesViaDb();   // Generator (memo) → ggf. neuer Slot → Upload → Reload
    _refreshOpenNewsViews();
  } catch(e){ if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] auto-sync failed', e); }
  finally { _newsAutoSyncRunning = false; }
}
function _startNewsAutoSync(){
  if(_newsAutoSyncTimer) return;                         // nur einmal starten
  if(typeof setInterval !== 'function') return;
  _newsAutoSyncTimer = setInterval(_newsAutoSyncTick, NEWS_AUTOSYNC_MS);
  if(typeof document !== 'undefined'){
    document.addEventListener('visibilitychange', () => { if(!document.hidden) _newsAutoSyncTick(); });
  }
}

