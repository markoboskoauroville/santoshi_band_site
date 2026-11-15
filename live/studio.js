// The Studio stream and its gear (Marko, 15.11.2026: "Let's copy YouTube system, the gear icon, quality, etc." ... "By default
// 160 AAC stereo" ... "We can have 10 to 15 seconds delay, like YouTube has").
// The Mac sends ONE master (1080p25 + AAC 160 stereo) to chromium-vm; the VM makes the ladder as HLS with separate audio
// renditions: video 1080/720/480/360, audio Q:160 S (default), Q:80 S, Q:40 S, Q:160 M, Q:80 M, Q:40 M (M = mono: more
// quality per channel, no space). This file plays it (hls.js; Safari's own player when the browser has no Media Source)
// and puts a round ⚙ button into the full view's control row (ui.js) with three menus: Quality, Audio, Delay.
// The choice is kept per viewer (localStorage, in try/catch). player.js calls sbStudio.play(cfg) when /api/live says via "studio",
// or when the page is opened with ?studio (tests). ?stats shows the level, audio and how far behind live.
(function () {
  var HLSJS = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
  var KEY = 'sb-studio-choice';
  var QUAL = [['auto', 'Auto'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p']];
  var AUD = [['Q:160 S', 'Q:160 S', 'stereo, best'], ['Q:80 S', 'Q:80 S', 'stereo, half'], ['Q:40 S', 'Q:40 S', 'stereo, a quarter'],
             ['Q:160 M', 'Q:160 M', 'mono, best'], ['Q:80 M', 'Q:80 M', 'mono, half'], ['Q:40 M', 'Q:40 M', 'mono, a quarter']];
  var DELAY = [['normal', 'Normal', 'about 10 s, smooth'], ['low', 'Low', 'about 5 s']];
  var choice = { q: 'auto', a: 'Q:160 S', d: 'normal' };
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') { for (var k in choice) if (typeof s[k] === 'string') choice[k] = s[k]; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (e) {} }

  var v = document.getElementById('v'), hls = null, src = '', native = false, onState = null;

  function levelIndex(q) {
    if (!hls || q === 'auto') return -1;
    for (var i = 0; i < hls.levels.length; i++) if (String(hls.levels[i].height) === q) return i;
    return -1;
  }
  function audioIndex(name) {
    var t = hls ? hls.audioTracks : null; if (!t) return -1;
    for (var i = 0; i < t.length; i++) if (t[i].name === name) return i;
    return -1;
  }
  function applyChoice() {
    if (hls) {
      var li = levelIndex(choice.q);
      if (hls.currentLevel !== li || (li === -1 && !hls.autoLevelEnabled)) hls.currentLevel = li;
      var ai = audioIndex(choice.a); if (ai >= 0 && hls.audioTrack !== ai) hls.audioTrack = ai;
    } else if (native && v.audioTracks) {
      for (var i = 0; i < v.audioTracks.length; i++) v.audioTracks[i].enabled = (v.audioTracks[i].label === choice.a);
    }
    if (onState) onState();
  }
  function build() {
    var low = choice.d === 'low';
    hls = new Hls({ lowLatencyMode: false, liveSyncDurationCount: low ? 2 : 4, liveMaxLatencyDurationCount: low ? 5 : 8,
                    maxLiveSyncPlaybackRate: 1.05, backBufferLength: 30, capLevelToPlayerSize: false, startLevel: -1 });
    hls.on(Hls.Events.MANIFEST_PARSED, applyChoice);
    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, applyChoice);
    hls.on(Hls.Events.LEVEL_SWITCHED, function () { if (onState) onState(); });
    var fails = 0;
    hls.on(Hls.Events.ERROR, function (e, d) {
      if (!d.fatal) return;
      if (d.type === Hls.ErrorTypes.MEDIA_ERROR && fails++ < 3) { hls.recoverMediaError(); return; }
      api.stop(); var m = document.getElementById('msg'); if (m) { m.textContent = 'Reconnecting…'; m.hidden = false; }
      setTimeout(function () { if (src) api.play({ studio: { hls: src } }); }, 3000);
    });
    hls.loadSource(src); hls.attachMedia(v);
  }
  function load(cb) {
    if (window.Hls) return cb();
    var s = document.createElement('script'); s.src = HLSJS; s.onload = cb;
    s.onerror = function () { var m = document.getElementById('msg'); if (m) { m.textContent = 'The player did not load.'; m.hidden = false; } };
    document.head.appendChild(s);
  }
  var api = window.sbStudio = {
    play: function (cfg, played) {
      src = cfg.studio && cfg.studio.hls; if (!src) return false;
      api.stop();
      load(function () {
        if (window.Hls && Hls.isSupported()) { native = false; build(); }
        else if (v.canPlayType('application/vnd.apple.mpegurl')) { native = true; v.src = src; if (v.audioTracks) v.audioTracks.onaddtrack = applyChoice; }
        else { var m = document.getElementById('msg'); if (m) { m.textContent = 'This browser cannot play the stream.'; m.hidden = false; } return; }
        if (played) played();
        showGear();
      });
      return true;
    },
    stop: function () { if (hls) { try { hls.destroy(); } catch (e) {} hls = null; } if (native) { v.removeAttribute('src'); v.load(); native = false; } },
    active: function () { return !!(hls || native); },
    stats: function () {
      var o = { mode: 'studio', width: v.videoWidth, height: v.videoHeight, choice: choice };
      if (hls) {
        var L = hls.levels[hls.currentLevel]; o.level = L ? L.height + 'p' : null; o.auto = hls.autoLevelEnabled;
        var A = hls.audioTracks[hls.audioTrack]; o.audio = A ? A.name : null;
        o.behindLive = hls.latency; o.kbpsEstimate = hls.bandwidthEstimate ? Math.round(hls.bandwidthEstimate / 1000) : null;
      }
      return o;
    }
  };

  // ---------- the gear (full view only: the banner's iframe has its own small controls) ----------
  var gear = null, panel = null;
  function css() {
    var st = document.createElement('style');
    st.textContent =
      '#gm{position:absolute;z-index:6;right:calc(16px + env(safe-area-inset-right));bottom:calc(84px + env(safe-area-inset-bottom));width:min(300px,calc(100vw - 32px));' +
      'max-height:calc(100% - 120px);overflow:auto;background:rgba(11,13,16,.92);border:1px solid var(--edge);border-radius:14px;padding:6px 0;' +
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 30px rgba(0,0,0,.6);font:600 15px system-ui,sans-serif;color:var(--fg)}' +
      '#gm button{display:flex;width:100%;align-items:center;gap:10px;background:none;border:0;color:inherit;font:inherit;text-align:left;padding:11px 16px;cursor:pointer}' +
      '#gm button:hover,#gm button:focus-visible{background:rgba(255,255,255,.08);outline:none}' +
      '#gm .k{flex:1}#gm .val{color:#a39a8a;font-weight:500}#gm .chev{color:#a39a8a}' +
      '#gm .tick{width:18px;color:var(--amber)}#gm .sub{display:block;color:#a39a8a;font-weight:500;font-size:13px}' +
      '#gm .hd{border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:4px}' +
      '#b-gear svg{transition:transform .3s}#b-gear[aria-expanded="true"] svg{transform:rotate(45deg)}' +
      // six round buttons must fit a 390 px phone inside the 16 px gutters
      '@media (max-width:440px){#bar{gap:8px}#bar .rb{width:48px;height:48px}#bar .rb svg{width:24px;height:24px}#gm{bottom:calc(76px + env(safe-area-inset-bottom))}}';
    document.head.appendChild(st);
  }
  var GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  function label(list, key) { for (var i = 0; i < list.length; i++) if (list[i][0] === key) return list[i][1]; return key; }
  function qualNow() {
    if (choice.q !== 'auto' || !hls) return label(QUAL, choice.q);
    var L = hls.levels[hls.currentLevel]; return 'Auto' + (L ? ' (' + L.height + 'p)' : '');
  }
  function row(html, fn) { var b = document.createElement('button'); b.type = 'button'; b.innerHTML = html; b.onclick = function (e) { e.stopPropagation(); fn(); }; panel.appendChild(b); return b; }
  function main() {
    panel.innerHTML = '';
    row('<span class="k">Quality</span><span class="val">' + qualNow() + '</span><span class="chev">›</span>', function () { sub('Quality', QUAL, 'q'); });
    row('<span class="k">Audio</span><span class="val">' + label(AUD, choice.a) + '</span><span class="chev">›</span>', function () { sub('Audio', AUD, 'a'); });
    row('<span class="k">Delay</span><span class="val">' + label(DELAY, choice.d) + '</span><span class="chev">›</span>', function () { sub('Delay', DELAY, 'd'); });
    focusFirst();
  }
  function sub(title, list, key) {
    panel.innerHTML = '';
    row('<span class="chev">‹</span><span class="k">' + title + '</span>', main).className = 'hd';
    list.forEach(function (it) {
      row('<span class="tick">' + (choice[key] === it[0] ? '✓' : '') + '</span><span class="k">' + it[1] + (it[2] ? '<span class="sub">' + it[2] + '</span>' : '') + '</span>', function () {
        var was = choice[key]; choice[key] = it[0]; save();
        if (key === 'd' && was !== it[0] && hls) { api.play({ studio: { hls: src } }); }
        else applyChoice();
        main();
      });
    });
    focusFirst();
  }
  function focusFirst() { var b = panel.querySelector('button'); if (b && panel.contains(document.activeElement) === false && gear === document.activeElement) b.focus(); }
  function open(on) {
    if (!panel) return;
    panel.hidden = !on; gear.setAttribute('aria-expanded', on ? 'true' : 'false'); gear.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) { main(); var bar = document.getElementById('bar'); if (bar) bar.classList.remove('off'); }
  }
  function showGear() {
    if ((window.top !== window && !/[?&]ui/.test(location.search)) || gear) return;   // the home page's frame (&ui) has the same gear
    var bar = document.getElementById('bar'), stage = document.getElementById('stage'); if (!bar || !stage) return;
    css();
    gear = document.createElement('button'); gear.type = 'button'; gear.className = 'rb'; gear.id = 'b-gear'; gear.title = 'Settings';
    gear.setAttribute('aria-label', 'Settings: quality, audio, delay'); gear.setAttribute('aria-haspopup', 'true'); gear.setAttribute('aria-expanded', 'false');
    gear.innerHTML = GEAR;
    bar.insertBefore(gear, document.getElementById('b-exit') || null);   // before the exit door
    panel = document.createElement('div'); panel.id = 'gm'; panel.hidden = true; panel.setAttribute('role', 'menu'); stage.appendChild(panel);
    gear.onclick = function (e) { e.stopPropagation(); open(panel.hidden); };
    panel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    document.addEventListener('pointerdown', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== gear && !gear.contains(e.target)) open(false); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { e.stopPropagation(); open(false); gear.focus(); } }, true);
    // the bar hides itself after 4 s: while the menu is open it stays
    new MutationObserver(function () { if (!panel.hidden && bar.classList.contains('off')) bar.classList.remove('off'); }).observe(bar, { attributes: true, attributeFilter: ['class'] });
    onState = function () { if (!panel.hidden && panel.querySelector('.hd') === null) main(); };
  }
})();
