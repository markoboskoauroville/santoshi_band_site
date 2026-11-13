// Overlay controls for the Santoshi Band live viewer and the admin sender (Marko, 13.11.2026: "the same overlay controls as I have
// in my MPA Academy"). Same look as MPA Academy portal/room.html (requests 202-211): round 56 px buttons (48 on a phone) in ONE row
// at the bottom of the picture, amber when on, a crossed red mark when a thing is off, an Overlay switch in the same place that
// shows/hides the others (the buttons never move when something toggles). Viewer: sound, picture in picture, full screen.
// Sender: microphone, camera, No noise, picture in picture of the own preview, full screen.
(function () {
  var CSS = '.sbo{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:8;display:flex;gap:12px;align-items:center}' +
    '.sbo .b{width:56px;height:56px;border-radius:50%;border:1px solid #ffffff40;background:#0B0D10b0;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;backdrop-filter:blur(6px);flex:none}' +
    '.sbo .b svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.sbo .b svg .x{stroke:#ef4444;stroke-width:2.6}' +
    '.sbo .b.on{background:#e8a33d;border-color:#e8a33d}.sbo .b.on svg{stroke:#0B0D10}.sbo .b.on svg .x{display:none}' +
    '.sbo .b.nn{font:700 13px system-ui,sans-serif;color:#fff;letter-spacing:.04em;text-transform:uppercase}.sbo .b.nn.on{color:#0B0D10}' +
    '.sbo .sw{width:auto;border-radius:28px;padding:0 16px 0 12px;gap:8px;font:600 14px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff;white-space:nowrap;height:56px}' +
    '.sbo .sw::before{content:"";flex:none;width:38px;height:21px;border-radius:11px;background:#3a4048;background-image:radial-gradient(circle at 10.5px 10.5px,#9aa0a6 7.5px,transparent 8px)}' +
    '.sbo .sw.on{background:#0B0D10b0;border-color:#ffffff40;color:#fff}.sbo .sw.on::before{background-color:#e8a33d;background-image:radial-gradient(circle at 27.5px 10.5px,#0B0D10 7.5px,transparent 8px)}' +
    '.sbo.hid .b:not(.sw){display:none}' +
    '.sbv{position:absolute;left:50%;bottom:78px;transform:translateX(-50%);z-index:9;background:#0B0D10e6;border:1px solid #ffffff40;border-radius:14px;padding:10px 14px;width:min(92%,320px);font:13px system-ui,sans-serif;color:#fff;text-align:left}' +
    '.sbv[hidden]{display:none}.sbv label{display:flex;align-items:center;gap:8px;margin:6px 0;text-transform:uppercase;letter-spacing:.06em;font-size:12px}.sbv label span{width:84px;flex:none}.sbv input{flex:1;accent-color:#e8a33d;min-width:0}.sbv p{margin:6px 0 0;color:#a39a8a;font-size:12px}' +
    '.sbo .b.vd{font:700 12px system-ui,sans-serif;color:#fff;letter-spacing:.04em}.sbo .b.vd.on{color:#0B0D10}' +
    '@media (max-width:640px){.sbo{gap:7px;bottom:8px}.sbo .b{width:44px;height:44px}.sbo .b svg{width:22px;height:22px}.sbo .sw{height:44px;padding:0 10px 0 8px;font-size:11px;gap:5px}.sbo .sw::before{width:30px;height:17px;background-image:radial-gradient(circle at 8.5px 8.5px,#9aa0a6 6px,transparent 6.5px)}.sbo .sw.on::before{background-image:radial-gradient(circle at 21.5px 8.5px,#0B0D10 6px,transparent 6.5px)}}' +
    '.sbw.mini{position:fixed!important;top:10px;right:10px;width:min(40vw,320px)!important;max-width:none!important;margin:0!important;z-index:100000;border-radius:10px;overflow:hidden;box-shadow:0 4px 18px #000c;border:1px solid #e8a33d}' +
    '.sbw.mini .sbo{gap:5px;bottom:5px}.sbw.mini .sbo .b{width:30px;height:30px}.sbw.mini .sbo .b svg{width:15px;height:15px}.sbw.mini .sbo .sw{height:30px;padding:0 6px;font-size:0}.sbw.mini .sbo .sw::before{width:26px;height:15px;background-image:radial-gradient(circle at 7.5px 7.5px,#9aa0a6 5px,transparent 5.5px)}.sbw.mini .sbo .sw.on::before{background-image:radial-gradient(circle at 18.5px 7.5px,#0B0D10 5px,transparent 5.5px)}' +
    '.sbw.full{position:fixed!important;inset:0;width:100%!important;max-width:none!important;height:100%!important;margin:0!important;z-index:100001;aspect-ratio:auto!important;background:#000}' +
    '@media (max-width:640px){.sbw.mini{width:58vw!important}}';
  var P = {
    mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/><path class="x" d="M3 3l18 18"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/><path class="x" d="M3 3l18 18"/>',
    snd: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/><path class="x" d="M3 3l18 18"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5" rx="1"/>',
    fs: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24">' + P[k] + '</svg>'; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem('sb.' + k); localStorage.setItem('sb.' + k, v); } catch (e) {} }
  // mode 'view' | 'send'; wrap = the positioned box around the iframe; opts.frame = the iframe; opts.onNoise(on) for the sender
  window.SBCtl = function (mode, wrap, opts) {
    if (!document.getElementById('sbo-css')) { var s = document.createElement('style'); s.id = 'sbo-css'; s.textContent = CSS; document.head.appendChild(s); }
    opts = opts || {}; var f = opts.frame;
    wrap.classList.add('sbw'); wrap.style.position = wrap.style.position || 'relative';
    var bar = document.createElement('div'); bar.className = 'sbo'; wrap.appendChild(bar);
    var st = { snd: !(f && /[?&]muted/.test(f.src)), mic: true, cam: true, nn: ls('nn') === '1' };
    function btn(id, ic, label, on, fn, cls) {
      var b = document.createElement('button'); b.className = 'b ' + (cls || '') + (on ? ' on' : ''); b.id = 'sbo-' + id; b.setAttribute('aria-label', label); b.title = label;
      b.innerHTML = ic; b.onclick = function (e) { e.stopPropagation(); fn(b); }; bar.appendChild(b); return b;
    }
    function post(o) { try { f.contentWindow.postMessage(o, '*'); } catch (e) {} }
    if (mode === 'view') {
      btn('snd', svg('snd'), 'Sound on / off', st.snd, function (b) {
        st.snd = !st.snd; b.classList.toggle('on', st.snd);
        f.src = st.snd ? f.src.replace(/&muted/g, '') : (/[?&]muted/.test(f.src) ? f.src : f.src + '&muted');
      });
    } else {
      btn('mic', svg('mic'), 'Microphone', true, function (b) { st.mic = !st.mic; b.classList.toggle('on', st.mic); post({ mic: st.mic }); });
      btn('cam', svg('cam'), 'Camera', true, function (b) { st.cam = !st.cam; b.classList.toggle('on', st.cam); post({ camera: st.cam }); });
      btn('nn', 'No<br>noise', 'No noise (noise suppression and echo cancellation)', st.nn, function (b) {
        st.nn = !st.nn; b.classList.toggle('on', st.nn); ls('nn', st.nn ? '1' : '0'); opts.onNoise && opts.onNoise(st.nn);
      }, 'nn');
    }
    if (mode === 'send') {
      // VIDEO: ONE chain on/off + an expandable panel. Only what VDO.Ninja really applies: the camera's own settings (brightness,
      // contrast, saturation, sharpness, white balance) passed as &brightness= &contrast= &saturation= &sharpness= &wb= on the push
      // link (VDO.Ninja applies them with track.applyConstraints). The sliders appear ONLY for what this camera reports in
      // getCapabilities(); a camera that reports none (a virtual camera, many phones' front cameras) says so. Remembered per camera.
      var caps = {}, dev = 'default', vs = {}, panel = document.createElement('div'); panel.className = 'sbv'; panel.hidden = true; wrap.appendChild(panel);
      try { var tr = opts.stream && opts.stream.getVideoTracks()[0]; if (tr) { caps = tr.getCapabilities ? tr.getCapabilities() : {}; dev = (tr.label || 'default'); } } catch (e) {}
      var KEYS = [['brightness', 'Brightness', 'brightness'], ['contrast', 'Contrast', 'contrast'], ['colorTemperature', 'Warmth', 'wb'], ['saturation', 'Saturation', 'saturation'], ['sharpness', 'Sharpness', 'sharpness']];
      var PRE = { brightness: 0.52, contrast: 0.62, colorTemperature: 0.35, saturation: 0.62, sharpness: 0.6 };   // fractions of the camera's own range; low colour temperature = corrects orange tungsten light
      var saved = {}; try { saved = JSON.parse(ls('vid.' + dev) || '{}'); } catch (e) {}
      var vOn = saved.on === true; vs = saved.v || {};
      function have(k) { var c = caps[k]; return c && typeof c.min === 'number' && c.max > c.min; }
      function val(k) { var c = caps[k]; return Math.round(c.min + (vs[k] !== undefined ? vs[k] : PRE[k]) * (c.max - c.min)); }
      function applyVideo() {
        ls('vid.' + dev, JSON.stringify({ on: vOn, v: vs }));
        if (!f) return; var u = f.src.replace(/&(brightness|contrast|saturation|sharpness|wb)=[^&]*/g, '');
        if (vOn) KEYS.forEach(function (a) { if (have(a[0])) u += '&' + a[2] + '=' + val(a[0]); });
        if (u !== f.src) f.src = u;
      }
      var any = KEYS.some(function (a) { return have(a[0]); });
      panel.innerHTML = any ? KEYS.filter(function (a) { return have(a[0]); }).map(function (a) { return '<label><span>' + a[1] + '</span><input type="range" min="0" max="100" data-k="' + a[0] + '"></label>'; }).join('') + '<p>One chain: VIDEO on applies these to the camera; off = the camera as it is.</p>'
        : '<p>This camera does not report brightness, contrast, saturation or white balance controls, so there is nothing real to change here. With a Sony or other camera into OBS, the same chain is an OBS filter on the Mac.</p>';
      [].forEach.call(panel.querySelectorAll('input'), function (i) { var k = i.dataset.k; i.value = Math.round((vs[k] !== undefined ? vs[k] : PRE[k]) * 100); i.onchange = function () { vs[k] = i.value / 100; if (vOn) applyVideo(); else ls('vid.' + dev, JSON.stringify({ on: vOn, v: vs })); }; });
      btn('vid', 'VIDEO', 'Video chain on / off (tap again after it is on: settings)', vOn, function (b) {
        if (vOn && panel.hidden) { panel.hidden = false; return; }
        if (vOn) { vOn = false; panel.hidden = true; b.classList.remove('on'); } else { vOn = true; b.classList.add('on'); panel.hidden = false; }
        applyVideo();
      }, 'vd');
    }
    btn('pip', svg('pip'), 'Picture in picture (small window, top right)', false, function (b) {
      wrap.classList.remove('full'); b.classList.toggle('on', wrap.classList.toggle('mini'));
    });
    btn('fs', svg('fs'), 'Full screen', false, function (b) {
      var d = document, on = wrap.classList.contains('full') || d.fullscreenElement;
      if (on) { if (d.fullscreenElement) d.exitFullscreen(); wrap.classList.remove('full'); b.classList.remove('on'); return; }
      wrap.classList.remove('mini'); document.getElementById('sbo-pip').classList.remove('on');
      if (wrap.requestFullscreen) wrap.requestFullscreen().catch(function () { wrap.classList.add('full'); });
      else wrap.classList.add('full');
      b.classList.add('on');
    });
    document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement) { var b = document.getElementById('sbo-fs'); b && b.classList.remove('on'); } });
    var ov = ls('ov') !== '0';
    var sw = btn('ov', 'Overlay', 'Overlay on / off', ov, function (b) { ov = !ov; ls('ov', ov ? '1' : '0'); b.classList.toggle('on', ov); bar.classList.toggle('hid', !ov); }, 'sw');
    bar.classList.toggle('hid', !ov);
    return st;
  };
})();
