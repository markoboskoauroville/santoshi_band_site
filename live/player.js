// The Santoshi Band's own live player (15.11.2026). HLS ONLY for viewers (Marko, 15.11.2026: "I don't want to have low delay mode. Only HLS and
// high quality, nothing real time."): the relay's HLS plays through hls.js (native on Safari without Media Source), always the TOP rendition,
// a deep buffer (30 s) and a live edge 4 segments back, so quality and smoothness win over delay. No WebRTC/WHEP in the viewer.
// A failure only reloads HLS (retry 3 s, then 5, 8, 10 s). The relay address comes from /api/live (never written in this public file).
// Shown full view at /live/ and in the home page's / admin's iframe as /live/?p=santoshi&ui (ONE module, live/ui.js draws the controls).
// ?stats shows size and delay for tests; window.sbStats() returns them.
(function () {
  var v = document.getElementById('v'), msg = document.getElementById('msg'), sndB = document.getElementById('snd'), stB = document.getElementById('st');
  var q = location.search, framed = window.top !== window, embedded = framed && !/[?&]ui/.test(q), showStats = /[?&]stats/.test(q);
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // &switch: an open page of the old player was moved to this one by /api/live (15.11.2026, the switch to HLS); the viewer had already
  // tapped for sound, so the full view tries to keep the sound (the browser may refuse: then the TAP FOR SOUND overlay comes back).
  var switched = /[?&]switch/.test(q);
  var muted = embedded ? /[?&]muted/.test(q) : !(switched && load('sb.muted') !== '1');
  if (switched) try { history.replaceState(null, '', location.pathname + q.replace(/[?&]switch\b/, function (m) { return m[0] === '?' ? '?' : ''; }).replace(/\?&/, '?').replace(/\?$/, '')); } catch (e) {}
    // Full view (opened by itself, not inside the banner): always starts silent, ui.js shows the centre TAP FOR SOUND, the round buttons and the exit.
  var chosen = null, hls = null, mode = '', cfg = null, retry = null, gotFrames = false, hlsWatch = null, fails = 0, stalls = [];
  function announce() { try { window.dispatchEvent(new Event('sb-levels')); } catch (e) {} }
  function setMode(m) { mode = m; try { window.dispatchEvent(new CustomEvent('sb-mode', { detail: m })); } catch (e) {} }
  function say(t) { msg.textContent = t || ''; msg.hidden = !t; }
  function play() {
    v.muted = muted;
    var p = v.play();
    if (p && p.catch) p.catch(function (err) { if (err && err.name && err.name !== 'NotAllowedError') return;   // only a refused sound counts (a load in progress is not a refusal)
      if (!v.muted) { v.muted = true; muted = true; v.play().catch(function () {}); if (embedded) sndB.hidden = false; else window.dispatchEvent(new Event('sb-sound-blocked')); } });
  }
  sndB.onclick = function () { v.muted = false; muted = false; v.play().catch(function () {}); sndB.hidden = true; };
  function stop() {
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    clearTimeout(hlsWatch);
    if (window.sbStudio) window.sbStudio.stop();   // the Studio ladder (studio.js)
    v.removeAttribute('src'); v.srcObject = null; mode = '';
    if (v.load && v.readyState) try { v.load(); } catch (e) {}
  }
  function later(fn, ms) { clearTimeout(retry); retry = setTimeout(fn, ms); }
  // A failed or silent HLS only reloads HLS: retry after 3 s, then 5, 8, 10 s (never another transport).
  function retryHls(why) {
    console.warn('player: ' + why + ', HLS again');
    stop(); say('Reconnecting…'); later(start, [3000, 5000, 8000, 10000][Math.min(fails++, 3)]);
  }
  function toHls() {
    stop(); setMode('hls'); gotFrames = false; chosen = null;
    hlsWatch = setTimeout(function () { if (mode === 'hls' && !gotFrames) retryHls('hls no picture in 20 s'); }, 20000);
    // Safari (and any browser without Media Source) plays HLS itself; every other browser through hls.js
    var hasMse = !!(window.MediaSource || window.ManagedMediaSource), apple = /Apple/.test(navigator.vendor || '');
    if (v.canPlayType('application/vnd.apple.mpegurl') && (apple || !hasMse)) { v.src = cfg.hls; play(); return; }
    function go() {
      if (mode !== 'hls') return;
      if (!window.Hls || !Hls.isSupported()) { if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = cfg.hls; play(); return; } retryHls('no HLS in this browser'); return; }
      // QUALITY FIRST: the top rendition from the first segment (capLevelToPlayerSize off), locked until the picture stalls 3 times in a minute,
      // then automatic switching takes over; 30 s of buffer ahead; the live edge 4 segments back (about 8 s) instead of 2.
      hls = new Hls({ lowLatencyMode: false, startLevel: 99, capLevelToPlayerSize: false, maxBufferLength: 30, maxMaxBufferLength: 60,
        liveSyncDurationCount: 4, liveMaxLatencyDurationCount: 10, backBufferLength: 10 });
      var media = 0, locked = false;
      // the viewer's choice (QUALITY in the gear, sb.q): 'auto' or a height; the default is the top rendition, locked
      hls.on(Hls.Events.MANIFEST_PARSED, function (e, d) {
        var top = d.levels.length - 1, pref = load('sb.q'), i = top;
        if (pref === 'auto') i = -1; else if (pref) { for (var k = 0; k < d.levels.length; k++) if (String(d.levels[k].height) === pref) i = k; }
        hls.startLevel = i < 0 ? top : i; hls.currentLevel = i; chosen = i; locked = i === top; announce();
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, announce);
      hls.on(Hls.Events.ERROR, function (e, d) {
        if (d.details === 'bufferStalledError' && locked) {
          var n = Date.now(); stalls = stalls.filter(function (t) { return n - t < 60000; }); stalls.push(n);
          if (stalls.length >= 3 && hls.levels.length > 1) { locked = false; hls.currentLevel = -1; chosen = -1; announce(); console.warn('player: 3 stalls in a minute, automatic quality'); }
        }
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && media++ < 2) { hls.recoverMediaError(); return; }
        if (d.response && d.response.code === 404) { stop(); say('Waiting for the band’s camera…'); later(start, 3000); return; }
        retryHls('hls ' + d.details);
      });
      hls.loadSource(cfg.hls); hls.attachMedia(v); play();
    }
    if (window.Hls) return go();
    var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js'; s.onload = go; s.onerror = function () { if (mode === 'hls') retryHls('hls.js did not load'); }; document.head.appendChild(s);
  }
  // Safari's own HLS player reports a failure on the element
  v.addEventListener('error', function () { if (mode === 'hls' && !hls && v.getAttribute('src')) retryHls('native hls error ' + (v.error ? v.error.code : '')); });
  v.addEventListener('playing', function () { gotFrames = true; fails = 0; say(''); });
  v.addEventListener('loadeddata', function () { gotFrames = true; say(''); });
  var force = /[?&]force/.test(q);   // tests: play the relay whatever the site's live flag says
  function check() {
    // c=hls: this page is the HLS player (an open page of the old player gets moved here, functions/api/live.js)
    return fetch('/api/live?c=hls', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (force && j.relay) return { live: true, via: 'relay', whep: j.relay.whep, hls: j.relay.hls };
      if (/[?&]studio/.test(q) && j.studio) return { live: true, via: 'studio', studio: j.studio };   // tests: the Studio ladder
      if (!j.live) { stop(); if (!framed) { location.replace('/live/closed/'); return null; } say('The stream has ended. Thank you for watching.'); return null; }
      if (j.via !== 'relay' && j.via !== 'studio') { location.replace(j.view.replace(/&muted/g, '') + (muted ? '&muted' : '')); return null; }
      return j;
    });
  }
  function start() {
    check().then(function (j) {
      if (!j) return; cfg = j;
      // 15.11.2026, the Studio route: the Mac's master, the VM's quality ladder (HLS, 10-15 s), the gear (studio.js)
      if (j.via === 'studio' && window.sbStudio) { stop(); setMode('studio'); if (window.sbStudio.play(j, play)) return; }
      toHls();
    }).catch(function () { say('Reconnecting…'); later(start, 3000); });
  }
  setInterval(function () { check().catch(function () {}); }, 20000);
  // numbers for tests and the curious (?stats)
  var last = null;
  window.sbStats = function () {
    if (mode === 'studio' && window.sbStudio) return Promise.resolve(window.sbStudio.stats());
    var o = { mode: mode, width: v.videoWidth, height: v.videoHeight, muted: v.muted, time: v.currentTime };
    if (mode === 'hls') { o.behindLive = hls && hls.latency != null ? hls.latency : (v.seekable.length ? v.seekable.end(v.seekable.length - 1) - v.currentTime : null); return Promise.resolve(o); }
    return Promise.resolve(o);
  };
  if (showStats) { stB.hidden = false; setInterval(function () { window.sbStats().then(function (o) { stB.textContent = o.mode + ' ' + o.width + 'x' + o.height + (o.fps != null ? ' ' + o.fps + ' fps' : '') + (o.kbps ? ' ' + o.kbps + ' kb/s' : '') + (o.jitterBufferMs != null ? '\nbuffer ' + o.jitterBufferMs + ' ms' : '') + (o.rttMs != null ? ' rtt ' + o.rttMs + ' ms' : '') + (o.behindLive != null ? '\nbehind live ' + o.behindLive.toFixed(1) + ' s' : ''); }); }, 1000); }
  // hooks for ui.js (full view only)
  window.sbPlayer = { video: v, setMuted: function (m) { muted = !!m; v.muted = muted; if (!muted) v.play().catch(function () {}); }, embedded: embedded,
    mode: function () { return mode; }, switched: switched,
    // the gear (ui.js): the renditions the relay really sends and the audio tracks; setLevel(-1) = Auto
    levels: function () { return hls ? hls.levels.map(function (l, i) { return { i: i, h: l.height, kbps: Math.round((l.bitrate || 0) / 1000) }; }) : []; },
    level: function () { return hls ? (chosen !== null ? chosen : hls.levels.length - 1) : -2; },   // the viewer's setting: -1 Auto, else a level index (the top one until chosen)
    setLevel: function (i) { if (!hls) return; hls.currentLevel = i; chosen = i; try { localStorage.setItem('sb.q', i < 0 ? 'auto' : String(hls.levels[i].height)); } catch (e) {} announce(); },
    audioTracks: function () { return hls && hls.audioTracks ? hls.audioTracks.map(function (t, i) { return { i: i, name: t.name || t.lang || ('Audio ' + (i + 1)) }; }) : []; },
    audio: function () { return hls ? hls.audioTrack : -1; },
    setAudio: function (i) { if (hls) { hls.audioTrack = i; announce(); } } };
  window.addEventListener('pagehide', stop);
  start();
})();
