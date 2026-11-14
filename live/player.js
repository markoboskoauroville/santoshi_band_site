// The Santoshi Band's own live player (15.11.2026, Marko: "one stream to somewhere ... Frankfurt delay, without YouTube branding").
// The camera sends ONE stream to the Santoshi relay (MediaMTX on chromium-vm in Frankfurt); every viewer reads it here:
//   1. WHEP (WebRTC, about 1 s behind the stage), from the relay address /api/live names (never written in this public file),
//   2. LL-HLS (a few seconds behind) when WebRTC does not connect in 8 s or is refused, native on Safari, hls.js elsewhere.
// Shown inside the live banner's iframe (/live/?p=santoshi&muted). &muted plays silent (the banner's sound button reloads this page
// without it). When the band goes back to VDO.Ninja or stops, the page follows. ?stats shows fps, size, delay for tests;
// window.sbStats() returns them as an object.
(function () {
  var v = document.getElementById('v'), msg = document.getElementById('msg'), sndB = document.getElementById('snd'), stB = document.getElementById('st');
  var q = location.search, muted = /[?&]muted/.test(q), showStats = /[?&]stats/.test(q);
  var pc = null, hls = null, mode = '', cfg = null, retry = null, gotFrames = false, sess = null;
  function say(t) { msg.textContent = t || ''; msg.hidden = !t; }
  function stereo(sdp) {
    var m = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i); if (!m) return sdp;
    return sdp.replace(new RegExp('a=fmtp:' + m[1] + ' ([^\\r\\n]*)'), function (l, p) { return 'a=fmtp:' + m[1] + ' ' + p + (/stereo=1/.test(p) ? '' : ';stereo=1;sprop-stereo=1'); });
  }
  function play() {
    v.muted = muted;
    var p = v.play();
    if (p && p.catch) p.catch(function () { if (!v.muted) { v.muted = true; v.play().catch(function () {}); sndB.hidden = false; } });
  }
  sndB.onclick = function () { v.muted = false; muted = false; v.play().catch(function () {}); sndB.hidden = true; };
  function stop() {
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    if (sess) { fetch(sess, { method: 'DELETE' }).catch(function () {}); sess = null; }
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    v.removeAttribute('src'); v.srcObject = null; mode = '';
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
    stop(); mode = 'webrtc'; gotFrames = false;
    var c = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }], bundlePolicy: 'max-bundle' }); pc = c;
    c.addTransceiver('video', { direction: 'recvonly' }); c.addTransceiver('audio', { direction: 'recvonly' });
    var ms = new MediaStream();
    c.ontrack = function (e) { ms.addTrack(e.track); if (v.srcObject !== ms) { v.srcObject = ms; play(); } };
    var deadline = setTimeout(function () { if (pc === c && !gotFrames) { console.warn('WHEP: no picture in 8 s, HLS'); toHls(); } }, 8000);
    c.onconnectionstatechange = function () {
      if (pc !== c) return;
      if (c.connectionState === 'failed') { clearTimeout(deadline); toHls(); }
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
        if (e.message === 'waiting') { stop(); say('Waiting for the band’s camera…'); later(whep, 3000); return; }
        console.warn(e); toHls();
      });
  }
  function toHls() {
    stop(); mode = 'hls';
    if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = cfg.hls; play(); return; }
    function go() {
      if (!window.Hls || !Hls.isSupported()) { say('This browser cannot play the stream.'); return; }
      hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2, backBufferLength: 10 });
      hls.on(Hls.Events.ERROR, function (e, d) { if (d.fatal) { stop(); say('Reconnecting…'); later(start, 3000); } });
      hls.loadSource(cfg.hls); hls.attachMedia(v); play();
    }
    if (window.Hls) return go();
    var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js'; s.onload = go; s.onerror = function () { say('The fallback player did not load.'); }; document.head.appendChild(s);
  }
  v.addEventListener('playing', function () { gotFrames = true; say(''); });
  v.addEventListener('loadeddata', function () { gotFrames = true; say(''); });
  var force = /[?&]force/.test(q);   // tests: play the relay whatever the site's live flag says
  function check() {
    return fetch('/api/live', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (force && j.relay) return { live: true, via: 'relay', whep: j.relay.whep, hls: j.relay.hls };
      if (!j.live) { stop(); say('The stream has ended. Thank you for watching.'); return null; }
      if (j.via !== 'relay') { location.replace(j.view.replace(/&muted/g, '') + (muted ? '&muted' : '')); return null; }
      return j;
    });
  }
  function start() {
    check().then(function (j) { if (!j) return; cfg = j; /[?&]hls/.test(q) ? toHls() : whep(); }).catch(function () { say('Reconnecting…'); later(start, 3000); });
  }
  setInterval(function () { check().catch(function () {}); }, 20000);
  // numbers for tests and the curious (?stats)
  var last = null;
  window.sbStats = function () {
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
  window.addEventListener('pagehide', stop);
  start();
})();
