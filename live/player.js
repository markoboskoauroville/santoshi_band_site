// The Santoshi Band's own live player (15.11.2026, Marko: "one stream to somewhere ... Frankfurt delay, without YouTube branding").
// The camera sends ONE stream to the Santoshi relay (MediaMTX on chromium-vm in Frankfurt); every viewer reads it here:
//   1. LL-HLS (a few seconds behind the stage), the DEFAULT for every viewer since 15.11.2026 (Marko: "Let's switch everything to
//      HLS right now."): native on Safari, hls.js elsewhere. HLS segments are the same bytes for every viewer, so they can be cached.
//   2. WHEP (WebRTC, about 1 s behind) only as the fallback when HLS fails or shows no picture in 15 s, or by choice: the LOW DELAY
//      pill in the sound bar (full view, kept per viewer as sb.low) or ?low in the address.
// The relay addresses come from /api/live (never written in this public file).
// Shown inside the live banner's iframe (/live/?p=santoshi&muted). &muted plays silent (the banner's sound button reloads this page
// without it). When the band goes back to VDO.Ninja or stops, the page follows. ?stats shows fps, size, delay for tests;
// window.sbStats() returns them as an object.
(function () {
  var v = document.getElementById('v'), msg = document.getElementById('msg'), sndB = document.getElementById('snd'), stB = document.getElementById('st');
  var q = location.search, embedded = window.top !== window, showStats = /[?&]stats/.test(q);
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // &switch: an open page of the old player was moved to this one by /api/live (15.11.2026, the switch to HLS); the viewer had already
  // tapped for sound, so the full view tries to keep the sound (the browser may refuse: then the TAP FOR SOUND overlay comes back).
  var switched = /[?&]switch/.test(q);
  var muted = embedded ? /[?&]muted/.test(q) : !(switched && load('sb.muted') !== '1');
  if (switched) try { history.replaceState(null, '', location.pathname + q.replace(/[?&]switch\b/, function (m) { return m[0] === '?' ? '?' : ''; }).replace(/\?&/, '?').replace(/\?$/, '')); } catch (e) {}
  var low = /[?&]low/.test(q) || (!embedded && load('sb.low') === '1');   // the viewer chose LOW DELAY (WebRTC)
  // Full view (opened by itself, not inside the banner): always starts silent, ui.js shows the centre TAP FOR SOUND, the round buttons and the exit.
  var pc = null, hls = null, mode = '', cfg = null, retry = null, gotFrames = false, sess = null, hlsWatch = null, fellBack = 0;
  function setMode(m) { mode = m; try { window.dispatchEvent(new CustomEvent('sb-mode', { detail: m })); } catch (e) {} }
  function say(t) { msg.textContent = t || ''; msg.hidden = !t; }
  function stereo(sdp) {
    var m = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i); if (!m) return sdp;
    return sdp.replace(new RegExp('a=fmtp:' + m[1] + ' ([^\\r\\n]*)'), function (l, p) { return 'a=fmtp:' + m[1] + ' ' + p + (/stereo=1/.test(p) ? '' : ';stereo=1;sprop-stereo=1'); });
  }
  function play() {
    v.muted = muted;
    var p = v.play();
    if (p && p.catch) p.catch(function () { if (!v.muted) { v.muted = true; muted = true; v.play().catch(function () {}); if (embedded) sndB.hidden = false; else window.dispatchEvent(new Event('sb-sound-blocked')); } });
  }
  sndB.onclick = function () { v.muted = false; muted = false; v.play().catch(function () {}); sndB.hidden = true; };
  function stop() {
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    if (sess) { fetch(sess, { method: 'DELETE' }).catch(function () {}); sess = null; }
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    clearTimeout(hlsWatch);
    if (window.sbStudio) window.sbStudio.stop();   // the Studio ladder (studio.js)
    v.removeAttribute('src'); v.srcObject = null; mode = '';
    if (v.load && v.readyState) try { v.load(); } catch (e) {}
  }
  function later(fn, ms) { clearTimeout(retry); retry = setTimeout(fn, ms); }
  function gather(c) {
    return new Promise(function (ok) {
      if (c.iceGatheringState === 'complete') return ok();
      var t = setTimeout(ok, 1500);
      c.addEventListener('icegatheringstatechange', function () { if (c.iceGatheringState === 'complete') { clearTimeout(t); ok(); } });
    });
  }
  function whep() {
    stop(); setMode('webrtc'); gotFrames = false;
    var c = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }], bundlePolicy: 'max-bundle' }); pc = c;
    c.addTransceiver('video', { direction: 'recvonly' }); c.addTransceiver('audio', { direction: 'recvonly' });
    var ms = new MediaStream();
    // 15.11.2026 (audio fix): a viewer on a mobile line got packets in bursts (11 to 85 a second) and the browser's buffer
    // started at about 100 ms, so the first 15 s had holes of up to 0.6 s. Both tracks wait at least 400 ms from the start.
    c.ontrack = function (e) { try { e.receiver.jitterBufferTarget = 400; } catch (x) {} ms.addTrack(e.track); if (v.srcObject !== ms) { v.srcObject = ms; play(); } };
    var deadline = setTimeout(function () { if (pc === c && !gotFrames) { console.warn('WHEP: no picture in 8 s'); fallback('webrtc no picture'); } }, 8000);
    c.onconnectionstatechange = function () {
      if (pc !== c) return;
      if (c.connectionState === 'failed') { clearTimeout(deadline); fallback('webrtc failed'); }
      if (c.connectionState === 'disconnected') later(function () { if (pc === c && c.connectionState !== 'connected') whep(); }, 4000);
    };
    c.createOffer().then(function (o) { o = { type: 'offer', sdp: stereo(o.sdp) }; return c.setLocalDescription(o); })
      .then(function () { return gather(c); })
      .then(function () { return fetch(cfg.whep, { method: 'POST', headers: { 'content-type': 'application/sdp' }, body: c.localDescription.sdp }); })
      .then(function (r) {
        if (r.status === 404) { clearTimeout(deadline); throw new Error('waiting'); }
        if (r.status !== 201) throw new Error('WHEP ' + r.status);
        var loc = r.headers.get('location'); if (loc) sess = new URL(loc, cfg.whep).href;
        return r.text();
      })
      .then(function (sdp) { if (pc === c) return c.setRemoteDescription({ type: 'answer', sdp: stereo(sdp) }); })
      .catch(function (e) {
        if (pc !== c) return;
        clearTimeout(deadline);
        if (e.message === 'waiting') { stop(); say('Waiting for the band’s camera…'); later(start, 3000); return; }
        console.warn(e); fallback('webrtc ' + e.message);
      });
  }
  // One path failed: try the other once; when both failed in a row, wait 3 s and start again from the default (HLS).
  function fallback(why) {
    var other = mode === 'webrtc' ? 'hls' : 'webrtc';
    console.warn('player: ' + why + (fellBack ? ', both failed, again in 3 s' : ', trying ' + other));
    if (fellBack++) { fellBack = 0; stop(); say('Reconnecting…'); later(start, 3000); return; }
    other === 'hls' ? toHls() : whep();
  }
  function toHls() {
    stop(); setMode('hls'); gotFrames = false;
    hlsWatch = setTimeout(function () { if (mode === 'hls' && !gotFrames) fallback('hls no picture in 15 s'); }, 15000);
    // Safari (and any browser without Media Source) plays HLS itself; every other browser through hls.js
    var hasMse = !!(window.MediaSource || window.ManagedMediaSource), apple = /Apple/.test(navigator.vendor || '');
    if (v.canPlayType('application/vnd.apple.mpegurl') && (apple || !hasMse)) { v.src = cfg.hls; play(); return; }
    function go() {
      if (mode !== 'hls') return;
      if (!window.Hls || !Hls.isSupported()) { if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = cfg.hls; play(); return; } fallback('no HLS in this browser'); return; }
      hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2, backBufferLength: 10 });
      var media = 0;
      hls.on(Hls.Events.ERROR, function (e, d) {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && media++ < 2) { hls.recoverMediaError(); return; }
        if (d.response && d.response.code === 404) { stop(); say('Waiting for the band’s camera…'); later(start, 3000); return; }
        fallback('hls ' + d.details);
      });
      hls.loadSource(cfg.hls); hls.attachMedia(v); play();
    }
    if (window.Hls) return go();
    var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js'; s.onload = go; s.onerror = function () { if (mode === 'hls') fallback('hls.js did not load'); }; document.head.appendChild(s);
  }
  // Safari's own HLS player reports a failure on the element
  v.addEventListener('error', function () { if (mode === 'hls' && !hls && v.getAttribute('src')) fallback('native hls error ' + (v.error ? v.error.code : '')); });
  v.addEventListener('playing', function () { gotFrames = true; fellBack = 0; say(''); });
  v.addEventListener('loadeddata', function () { gotFrames = true; say(''); });
  var force = /[?&]force/.test(q);   // tests: play the relay whatever the site's live flag says
  function check() {
    // c=hls: this page is the HLS player (an open page of the old player gets moved here, functions/api/live.js)
    return fetch('/api/live?c=hls', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (force && j.relay) return { live: true, via: 'relay', whep: j.relay.whep, hls: j.relay.hls };
      if (/[?&]studio/.test(q) && j.studio) return { live: true, via: 'studio', studio: j.studio };   // tests: the Studio ladder
      if (!j.live) { stop(); if (!embedded) { location.replace('/live/closed/'); return null; } say('The stream has ended. Thank you for watching.'); return null; }
      if (j.via !== 'relay' && j.via !== 'studio') { location.replace(j.view.replace(/&muted/g, '') + (muted ? '&muted' : '')); return null; }
      return j;
    });
  }
  function start() {
    check().then(function (j) {
      if (!j) return; cfg = j;
      // 15.11.2026, the Studio route: the Mac's master, the VM's quality ladder (HLS, 10-15 s), the gear (studio.js)
      if (j.via === 'studio' && window.sbStudio) { stop(); setMode('studio'); if (window.sbStudio.play(j, play)) return; }
      low ? whep() : toHls();
    }).catch(function () { say('Reconnecting…'); later(start, 3000); });
  }
  setInterval(function () { check().catch(function () {}); }, 20000);
  // numbers for tests and the curious (?stats)
  var last = null;
  window.sbStats = function () {
    if (mode === 'studio' && window.sbStudio) return Promise.resolve(window.sbStudio.stats());
    var o = { mode: mode, width: v.videoWidth, height: v.videoHeight, muted: v.muted, time: v.currentTime };
    if (mode === 'hls') { o.behindLive = hls && hls.latency != null ? hls.latency : (v.seekable.length ? v.seekable.end(v.seekable.length - 1) - v.currentTime : null); return Promise.resolve(o); }
    if (!pc) return Promise.resolve(o);
    return pc.getStats().then(function (r) {
      r.forEach(function (s) {
        if (s.type === 'inbound-rtp' && s.kind === 'video') {
          o.fps = s.framesPerSecond; o.framesDecoded = s.framesDecoded; o.framesDropped = s.framesDropped; o.videoBytes = s.bytesReceived; o.codecId = s.codecId;
          o.jitterBufferMs = s.jitterBufferEmittedCount ? Math.round(1000 * s.jitterBufferDelay / s.jitterBufferEmittedCount) : null;
          o.packetsLost = s.packetsLost;
          if (last && last.t) o.kbps = Math.round(8 * (s.bytesReceived - last.b) / (s.timestamp - last.t)); last = { b: s.bytesReceived, t: s.timestamp };
        }
        if (s.type === 'inbound-rtp' && s.kind === 'audio') { o.audioLevel = s.audioLevel; o.audioEnergy = s.totalAudioEnergy; o.audioChannels = null; o.audioBytes = s.bytesReceived; }
        if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') o.rttMs = s.currentRoundTripTime != null ? Math.round(s.currentRoundTripTime * 1000) : null;
        if (s.type === 'codec' && s.mimeType) (o.codecs = o.codecs || []).push(s.mimeType + (s.channels ? '/' + s.channels : ''));
      });
      return o;
    });
  };
  if (showStats) { stB.hidden = false; setInterval(function () { window.sbStats().then(function (o) { stB.textContent = o.mode + ' ' + o.width + 'x' + o.height + (o.fps != null ? ' ' + o.fps + ' fps' : '') + (o.kbps ? ' ' + o.kbps + ' kb/s' : '') + (o.jitterBufferMs != null ? '\nbuffer ' + o.jitterBufferMs + ' ms' : '') + (o.rttMs != null ? ' rtt ' + o.rttMs + ' ms' : '') + (o.behindLive != null ? '\nbehind live ' + o.behindLive.toFixed(1) + ' s' : ''); }); }, 1000); }
  // hooks for ui.js (full view only)
  window.sbPlayer = { video: v, setMuted: function (m) { muted = !!m; v.muted = muted; if (!muted) v.play().catch(function () {}); }, embedded: embedded,
    mode: function () { return mode; }, low: function () { return low; }, switched: switched,
    // LOW DELAY on/off: WebRTC (about 1 s) or HLS (a few seconds, the default); switches the running picture at once
    setLow: function (on) { low = !!on; try { localStorage.setItem('sb.low', low ? '1' : '0'); } catch (e) {} if (cfg && (mode === 'hls' || mode === 'webrtc')) { fellBack = 0; muted = v.muted; low ? whep() : toHls(); } } };
  // LOW DELAY pill (full view only; kept here, not in ui.js, so the sound controls stay ui.js's): top right, shown and hidden with
  // ui.js's round buttons (#bar), gone with Hide (body.clean) and the small window; not shown for the Studio ladder (own Delay menu).
  if (!embedded) {
    var css = document.createElement('style');
    css.textContent = '#lowd{position:absolute;z-index:4;top:calc(8px + env(safe-area-inset-top));right:calc(8px + env(safe-area-inset-right));min-height:44px;padding:0 14px;border-radius:22px;border:1px solid var(--edge,rgba(255,255,255,.38));background:var(--disc,rgba(11,13,16,.62));color:#fff;font:700 11px system-ui,sans-serif;letter-spacing:.1em;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:opacity .3s}' +
      '#lowd.off{opacity:0;pointer-events:none}#lowd[aria-pressed="true"]{background:var(--amber,#e8a33d);border-color:var(--amber,#e8a33d);color:#0B0D10}body.clean #lowd,body.mini #lowd{display:none!important}';
    document.head.appendChild(css);
    var lowB = document.createElement('button'); lowB.type = 'button'; lowB.id = 'lowd'; lowB.className = 'off'; lowB.textContent = 'LOW DELAY';
    lowB.title = 'Low delay: WebRTC, about 1 s behind the stage (the default is HLS, a few seconds behind)';
    var syncLow = function () { lowB.hidden = !(mode === 'hls' || mode === 'webrtc'); lowB.setAttribute('aria-pressed', low ? 'true' : 'false'); };
    lowB.onclick = function () { window.sbPlayer.setLow(!low); syncLow(); };
    window.addEventListener('sb-mode', syncLow); syncLow();
    var follow = function () {
      var bar = document.getElementById('bar'); if (!bar) return false;
      document.getElementById('stage').appendChild(lowB);
      var mirror = function () { lowB.classList.toggle('off', bar.classList.contains('off')); };
      new MutationObserver(mirror).observe(bar, { attributes: true, attributeFilter: ['class'] }); mirror(); return true;
    };
    if (!follow()) document.addEventListener('DOMContentLoaded', follow);
    // came from the old player with the sound on (&switch): when the browser lets the sound play, skip TAP FOR SOUND (ui.js's overlay)
    if (switched) v.addEventListener('playing', function once() { v.removeEventListener('playing', once); var ov = document.getElementById('ov'); if (!v.muted && ov && !ov.hidden) ov.click(); });
  }
  window.addEventListener('pagehide', stop);
  start();
})();
