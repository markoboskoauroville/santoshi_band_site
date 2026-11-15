// Full-view controls of /live/ (Marko, 15.11.2026): a big round TAP FOR SOUND in the centre on the first visit, then a row of round buttons at the
// bottom (sound drawer, chat, small window, full screen in a frame, exit). There is NO hide button (Marko, 15.11.2026): the buttons appear on a tap, click,
// mouse move or key and fade out by themselves 5 s after the last one; a tap on the picture while they are hidden just shows them.
// ONE module for both viewers: /live/ itself and the home page's banner, which loads this page in an iframe as /live/?p=santoshi&ui (the
// iframe shows the same buttons plus FULL SCREEN, no exit door). Without &ui an iframe gets no controls (old open pages). Keys: M sound, C chat.
// All icons are inline SVG on a 24 box, centred on 12,12.
(function () {
  var framed = window.top !== window;
  if (!window.sbPlayer || (framed && !/[?&]ui/.test(location.search))) return;
  var P = window.sbPlayer, v = P.video, stage = document.getElementById('stage'), body = document.body;
  body.classList.add('top');
  var IC = {
    snd: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="6.5" height="4.5" rx="1"/>',
    move: '<circle cx="12" cy="12" r="10"/><path d="M12 4.5l-2 2.6h4zM12 19.5l-2-2.6h4zM4.5 12l2.6-2v4zM19.5 12l-2.6-2v4z" fill="#fff" stroke="none"/><rect x="10" y="10" width="4" height="4" rx="1" fill="#fff" stroke="none"/>',
    fs: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    exit: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4M19 12H9"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[k] + '</svg>'; }

  // 1. the centre overlay
  var ov = document.createElement('div'); ov.id = 'ov';
  ov.innerHTML = '<button id="big" type="button" aria-label="Tap for sound">' + svg('snd') + '<span>TAP FOR<br>SOUND</span></button>';
  stage.appendChild(ov);
  var hit = document.createElement('div'); hit.id = 'hit'; stage.insertBefore(hit, ov);

  // 2. the round buttons
  var bar = document.createElement('div'); bar.id = 'bar'; bar.className = 'off'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Stream controls');
  function mk(id, icon, label) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'rb'; b.id = id; b.title = label; b.setAttribute('aria-label', label); b.innerHTML = svg(icon); bar.appendChild(b); return b;
  }
  var bChat = mk('b-chat', 'chat', 'Chat'), bPip = mk('b-pip', 'pip', 'Small window'), bMute = mk('b-mute', 'snd', 'Sound'), bPan = mk('b-pan', 'move', 'Zoom and move'), bFs = framed ? mk('b-fs', 'fs', 'Full screen') : null, bExit = framed ? null : mk('b-exit', 'exit', 'Exit');
  bChat.appendChild(document.createElement('i'));
  stage.appendChild(bar);

  // 2b. TWO drawers that slide UP from their round buttons (Marko, 15.11.2026): the speaker (first) holds VOLUME and MUTE; the move icon (second,
  // "Zoom and move") holds ZOOM 1-3x, PAN X, PAN Y and RESET. One #v element serves HLS and the Studio ladder, so everything goes straight onto it.
  function store(k, val) { try { localStorage.setItem(k, val); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var timer = null, entered = false;
  var drawers = [];
  function mkDrawer(btn, id, label, after) {
    var w = document.createElement('div'); w.className = 'sw'; bar.insertBefore(w, after ? after.nextSibling : bar.firstChild); w.appendChild(btn);
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    var d = document.createElement('div'); d.id = id; d.className = 'dr'; d.hidden = true; d.setAttribute('role', 'group'); d.setAttribute('aria-label', label);
    d.innerHTML = '<div class="fr"></div><div class="ac"></div>'; w.appendChild(d);
    var o = { w: w, d: d, btn: btn, fr: d.querySelector('.fr'), ac: d.querySelector('.ac') };
    var done = document.createElement('button'); done.type = 'button'; done.className = 'vm dn'; done.textContent = 'DONE'; done.setAttribute('aria-label', 'Close'); done.onclick = function () { closeDrawers(); }; o.ac.appendChild(done);   // only shown in a small picture (the drawer then fills the frame)
    d.addEventListener('pointerdown', function () { clearTimeout(timer); }); d.addEventListener('pointerup', function () { showBar(); });
    drawers.push(o); return o;
  }
  var sd = mkDrawer(bMute, 'sd', 'Volume'), zd = mkDrawer(bPan, 'zd', 'Zoom and move', sd.w);
  function closeDrawers(except) {
    drawers.forEach(function (o) { if (o === except) return; o.d.hidden = true; o.btn.setAttribute('aria-expanded', 'false'); o.btn.classList.remove('open'); });
  }
  function toggleDrawer(o) {
    var on = o.d.hidden; closeDrawers(on ? o : null); if (on && !entered) return;
    o.d.hidden = !on; o.btn.setAttribute('aria-expanded', on ? 'true' : 'false'); o.btn.classList.toggle('open', on);
    if (on) { o.d.style.left = '0px'; syncVol(); syncView(); var r = o.d.getBoundingClientRect(), over = r.right - (stage.clientWidth - 12); if (over > 0 && !compact()) o.d.style.left = -Math.min(over, r.left - 12) + 'px'; showBar(); }
  }
  function compact() { return stage.clientHeight <= 360; }
  // a vertical fader on pointer events (the same on every browser; the track is 44 px wide, 110 to 180 px tall)
  function fader(o, label, min, max, step, get, set, fmt) {
    var col = document.createElement('div'); col.className = 'fc';
    var tx = document.createElement('div'); tx.className = 'fv'; var tr = document.createElement('div'); tr.className = 'ft'; tr.tabIndex = 0;
    tr.setAttribute('role', 'slider'); tr.setAttribute('aria-label', label); tr.setAttribute('aria-orientation', 'vertical'); tr.setAttribute('aria-valuemin', min); tr.setAttribute('aria-valuemax', max);
    var fl = document.createElement('i'); var th = document.createElement('b'); tr.appendChild(fl); tr.appendChild(th);
    var cap = document.createElement('div'); cap.className = 'fl'; cap.textContent = label.toUpperCase();
    col.appendChild(tx); col.appendChild(tr); col.appendChild(cap); o.fr.appendChild(col);
    function draw() { var x = get(), f = (x - min) / (max - min); fl.style.height = (f * 100) + '%'; th.style.bottom = 'calc(' + (f * 100) + '% - 9px)'; tx.textContent = fmt(x); tr.setAttribute('aria-valuenow', x); tr.setAttribute('aria-valuetext', fmt(x)); }
    function at(e) { var r = tr.getBoundingClientRect(), f = 1 - (e.clientY - r.top) / r.height; f = Math.max(0, Math.min(1, f)); var x = min + f * (max - min); return Math.round(x / step) * step; }
    var dragging = false;
    tr.addEventListener('pointerdown', function (e) { if (tr.getAttribute('aria-disabled') === 'true') return; e.preventDefault(); e.stopPropagation(); clearTimeout(timer); try { tr.setPointerCapture(e.pointerId); } catch (x) {} dragging = true; set(at(e)); draw(); });
    tr.addEventListener('pointermove', function (e) { if (dragging) { set(at(e)); draw(); } });
    function up() { if (dragging) { dragging = false; showBar(); } }
    tr.addEventListener('pointerup', up); tr.addEventListener('pointercancel', up);
    tr.addEventListener('keydown', function (e) {
      if (tr.getAttribute('aria-disabled') === 'true') return;
      var d = (e.key === 'ArrowUp' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowDown' || e.key === 'ArrowLeft') ? -1 : 0; if (!d) return;
      e.preventDefault(); e.stopPropagation(); set(Math.max(min, Math.min(max, get() + d * (max - min) / 20))); draw(); showBar();
    });
    return { draw: draw, tr: tr };
  }
  // --- sound drawer: VOLUME + MUTE ---
  var vMute = document.createElement('button'); vMute.type = 'button'; vMute.id = 'vb-mute'; vMute.className = 'vm'; sd.ac.insertBefore(vMute, sd.ac.firstChild);
  var savedVol = parseFloat(load('sb.vol')); if (!(savedVol >= 0 && savedVol <= 1)) savedVol = 1;
  var userMuted = load('sb.muted') === '1';
  var volOk = true;   // iOS Safari ignores video.volume (always 1): there the fader is not offered, MUTE still works
  try { v.volume = 0.5; volOk = Math.abs(v.volume - 0.5) < 0.01; v.volume = savedVol; } catch (e) { volOk = false; }
  var drawVol = volOk ? fader(sd, 'Volume', 0, 100, 1, function () { return Math.round((v.muted ? 0 : v.volume) * 100); }, function (x) {
    try { v.volume = x / 100; } catch (e) {} store('sb.vol', x / 100);
    if (x > 0 && v.muted) setSound(true, true); else if (x === 0) { userMuted = true; store('sb.muted', '1'); }
  }, function (x) { return x + '%'; }).draw : function () {};
  function syncVol() {
    var m = v.muted || v.volume === 0;
    vMute.innerHTML = svg(m ? 'mute' : 'snd') + '<span>' + (m ? 'UNMUTE' : 'MUTE') + '</span>';
    vMute.setAttribute('aria-label', m ? 'Unmute' : 'Mute'); vMute.setAttribute('aria-pressed', m ? 'true' : 'false');
    drawVol();
  }
  v.addEventListener('volumechange', syncVol);
  // --- zoom and move drawer: ZOOM 1-3x, PAN X, PAN Y, RESET. The picture is scaled about its centre and shifted; the shift is a FRACTION (-1..1) of the
  // room the zoom leaves, so it can never leave the frame, whatever the window size (recomputed on resize). At 1x pan is off.
  function num(k, d, lo, hi) { var x = parseFloat(load(k)); return x >= lo && x <= hi ? x : d; }
  var zoom = num('sb.zoom', 1, 1, 3), fx = num('sb.panx', 0, -1, 1), fy = num('sb.pany', 0, -1, 1);
  function applyView() {
    if (zoom <= 1.0001) { zoom = 1; fx = fy = 0; }
    fx = Math.max(-1, Math.min(1, fx)); fy = Math.max(-1, Math.min(1, fy));
    var mx = (zoom - 1) * stage.clientWidth / 2, my = (zoom - 1) * stage.clientHeight / 2;
    v.style.setProperty('--z', zoom); v.style.setProperty('--tx', (-fx * mx) + 'px'); v.style.setProperty('--ty', (-fy * my) + 'px');
    hit.classList.toggle('pan', zoom > 1);
    store('sb.zoom', zoom); store('sb.panx', fx); store('sb.pany', fy);
  }
  var zf = fader(zd, 'Zoom', 1, 3, 0.05, function () { return zoom; }, function (x) { zoom = Math.round(x * 100) / 100; applyView(); syncView(); }, function (x) { return (Math.round(x * 100) / 100).toFixed(1) + 'x'; });
  var pxf = fader(zd, 'Pan X', -100, 100, 1, function () { return Math.round(fx * 100); }, function (x) { fx = x / 100; applyView(); }, function (x) { return x + ''; });
  var pyf = fader(zd, 'Pan Y', -100, 100, 1, function () { return Math.round(fy * 100); }, function (x) { fy = x / 100; applyView(); }, function (x) { return x + ''; });
  var vReset = document.createElement('button'); vReset.type = 'button'; vReset.id = 'vb-reset'; vReset.className = 'vm'; vReset.textContent = 'RESET'; vReset.setAttribute('aria-label', 'Reset zoom and move');
  vReset.onclick = function () { zoom = 1; fx = fy = 0; applyView(); syncView(); showBar(); }; zd.ac.insertBefore(vReset, zd.ac.firstChild);
  function syncView() {
    var off = zoom <= 1;
    [pxf, pyf].forEach(function (f) { f.tr.setAttribute('aria-disabled', off ? 'true' : 'false'); f.tr.parentNode.classList.toggle('dis', off); });
    zf.draw(); pxf.draw(); pyf.draw(); bPan.classList.toggle('on', zoom > 1);
  }
  applyView(); syncView(); window.addEventListener('resize', function () { applyView(); });
  // drag the zoomed picture with a finger or the mouse (a tap that is not a drag only shows the buttons)
  (function () {
    var st = null;
    hit.addEventListener('pointerdown', function (e) { if (zoom > 1 && e.isPrimary) { st = { x: e.clientX, y: e.clientY, fx: fx, fy: fy, drag: false }; try { hit.setPointerCapture(e.pointerId); } catch (x) {} } });
    hit.addEventListener('pointermove', function (e) {
      if (!st) return; var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.drag && Math.hypot(dx, dy) < 6) return; st.drag = true; dragged = true;
      var mx = (zoom - 1) * stage.clientWidth / 2, my = (zoom - 1) * stage.clientHeight / 2;
      fx = st.fx - dx / mx; fy = st.fy - dy / my; applyView(); pxf.draw(); pyf.draw(); showBar();
    });
    function end() { st = null; } hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', end);
  })();
  document.addEventListener('pointerdown', function (e) { if (!drawers.some(function (o) { return o.w.contains(e.target); })) closeDrawers(); }, true);   // a tap outside closes
  window.addEventListener('blur', function () { closeDrawers(); });   // in the home page's frame a tap outside the frame blurs it

  // the buttons come and go by themselves: 5 s after the last tap, click, mouse move or key (Marko, 15.11.2026). They only OVERLAY the picture: it never resizes.
  function showBar() { if (!entered) return; bar.classList.remove('off'); clearTimeout(timer); timer = setTimeout(hideBar, 5000); }
  function hideBar() { clearTimeout(timer); bar.classList.add('off'); closeDrawers(); if (bar.contains(document.activeElement)) document.activeElement.blur(); }
  function chatOpen() { var p = document.querySelector('.sbc'); return !!p && !p.hidden; }

  // sound state on the button
  function syncMute() {
    var m = v.muted || v.volume === 0; bMute.innerHTML = svg(m ? 'mute' : 'snd');
    bMute.title = m ? 'Sound (muted)' : 'Sound'; bMute.setAttribute('aria-label', bMute.title);
  }
  v.addEventListener('volumechange', syncMute); syncMute();
  function setSound(on, byUser) { if (byUser) { userMuted = !on; store('sb.muted', userMuted ? '1' : '0'); } if (on && v.volume === 0) { try { v.volume = 0.5; } catch (e) {} store('sb.vol', v.volume); } P.setMuted(!on); syncMute(); syncVol(); }

  function enter() {
    entered = true; ov.classList.add('gone'); setTimeout(function () { ov.hidden = true; }, 500);
    setSound(!userMuted); showBar();   // TAP FOR SOUND gives sound, unless this viewer last chose MUTE
  }
  ov.addEventListener('click', enter);
  // the browser refused sound later (a reconnect): ask again in the middle
  window.addEventListener('sb-sound-blocked', function () { ov.hidden = false; ov.classList.remove('gone'); entered = false; hideBar(); syncMute(); });

  bMute.onclick = function () { toggleDrawer(sd); showBar(); };
  bPan.onclick = function () { toggleDrawer(zd); showBar(); };
  vMute.onclick = function () { setSound(v.muted || v.volume === 0, true); showBar(); };
  syncVol();
  // a tap or click on the PICTURE toggles the buttons (Marko, 15.11.2026): hidden -> shown (gone again 5 s after the last interaction), shown -> hidden at
  // once with any open drawer. A drag-to-pan is not a tap. Taps on the buttons or drawers never get here (they are separate elements above the picture).
  var dragged = false, quietUntil = 0;
  hit.addEventListener('pointerdown', function () { dragged = false; });
  function tapPicture() {
    if (dragged) { dragged = false; return; }
    if (!entered) return;
    if (!bar.classList.contains('off')) { hideBar(); quietUntil = Date.now() + 1200; return; }
    if (v.muted && !userMuted) setSound(true);   // the first tap also gives sound when the page started muted and the viewer did not choose MUTE
    showBar();
  }
  hit.addEventListener('click', tapPicture);
  var lastMove = 0;
  function moved() { var n = Date.now(); if (n < quietUntil) return; if (n - lastMove > 250) { lastMove = n; showBar(); } }
  document.addEventListener('mousemove', moved, true);
  bar.addEventListener('pointerdown', function () { clearTimeout(timer); });
  bar.addEventListener('pointerup', showBar);
  bar.addEventListener('focusin', function () { clearTimeout(timer); });

  // 3. chat: the site's own live chat (sbchat.js), its panel and badge; its own CHAT button is hidden, ours opens it
  var chat = null;
  function loadChat(cb) {
    if (chat) return cb(); if (window.SBChat) { chat = SBChat(stage); watchChat(); return cb(); }
    var s = document.createElement('script'); s.src = '/sbchat.js?v=3'; s.onload = function () { chat = SBChat(stage); watchDot(); watchChat(); cb(); }; document.head.appendChild(s);
  }
  function watchDot() {
    var cb = stage.querySelector(':scope > .b.ch'); if (!cb) return;
    new MutationObserver(function () { bChat.classList.toggle('new', cb.classList.contains('new')); }).observe(cb, { attributes: true, attributeFilter: ['class'] });
  }
  bChat.onclick = function () { loadChat(function () { var open = chatOpen(); chat.show(!open); bChat.setAttribute('aria-pressed', !open ? 'true' : 'false'); if (!open) bChat.classList.remove('new'); }); showBar(); };
  // chat layout (the YouTube way): beside the picture when the page is wide, below it when narrow; the picture is never covered. In the home page's
  // frame the page around it grows (postMessage to the banner, functions/_middleware.js) so the picture keeps its size.
  function wideScreen() { var w = window.innerWidth; try { if (framed) w = window.parent.innerWidth; } catch (e) {} return w >= 900; }
  function chatLayout() {
    var open = chatOpen(), wide = wideScreen();
    body.classList.toggle('cw', open && wide); body.classList.toggle('cn', open && !wide);
    try { if (framed) window.parent.postMessage({ sbChat: open ? (wide ? 'wide' : 'narrow') : 'closed' }, location.origin); } catch (e) {}
    applyView(); bChat.setAttribute('aria-pressed', open ? 'true' : 'false');
  }
  function watchChat() { var pn = document.querySelector('.sbc'); if (pn && !pn._w) { pn._w = 1; new MutationObserver(chatLayout).observe(pn, { attributes: true, attributeFilter: ['hidden'] }); chatLayout(); } }
  window.addEventListener('resize', chatLayout);
  loadChat(function () {});   // connects at once: the "N watching" badge and the red dot for new messages
  document.addEventListener('click', function () { setTimeout(function () { bChat.setAttribute('aria-pressed', chatOpen() ? 'true' : 'false'); }, 0); }, true);

  // 4. small window: native picture in picture, Safari's presentation mode, else the corner fallback
  var pipOn = false;
  v.disablePictureInPicture = true;   // no browser hover button: the small window opens ONLY from our PiP button
  function pipState(on) { pipOn = on; bPip.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  v.addEventListener('enterpictureinpicture', function () { pipState(true); });
  v.addEventListener('leavepictureinpicture', function () { pipState(false); v.disablePictureInPicture = true; });
  v.addEventListener('webkitpresentationmodechanged', function () { pipState(v.webkitPresentationMode === 'picture-in-picture'); });
  function mini(on) {
    body.classList.toggle('mini', on); pipState(on);
    var h = document.getElementById('minihint');
    if (on && !h) { h = document.createElement('div'); h.id = 'minihint'; h.textContent = 'The stream plays in the small window. Tap it to make it big again.'; stage.appendChild(h); }
    if (!on && h) h.remove();
  }
  v.addEventListener('click', function () { if (body.classList.contains('mini')) mini(false); });
  bPip.onclick = function () {
    v.disablePictureInPicture = false;
    if (body.classList.contains('mini')) return mini(false);
    if (document.pictureInPictureElement) return document.exitPictureInPicture().catch(function () {});
    if (v.webkitPresentationMode === 'picture-in-picture') { v.webkitSetPresentationMode('inline'); return; }
    if (document.pictureInPictureEnabled && v.requestPictureInPicture && !v.disablePictureInPicture) {
      v.requestPictureInPicture().catch(function () { mini(true); });
    } else if (v.webkitSupportsPresentationMode && v.webkitSupportsPresentationMode('picture-in-picture')) {
      v.webkitSetPresentationMode('picture-in-picture');
    } else mini(true);
    showBar();
  };

  // 4b. full screen (the home page's frame only; /live/ already fills the window): the stage, so the buttons and the chat go with it
  if (bFs) bFs.onclick = function () {
    var d = document, on = d.fullscreenElement || d.webkitFullscreenElement;
    if (on) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();   // iPhone: only the video can go full screen
    showBar();
  };
  document.addEventListener('fullscreenchange', function () {
    if (bFs) bFs.setAttribute('aria-pressed', document.fullscreenElement ? 'true' : 'false');
    if (document.fullscreenElement && chat && chatOpen() && window.innerWidth < window.innerHeight) chat.show(false);   // full screen upright: no chat, the picture only
    applyView();
  });

  // 5. exit door: the page for when nobody streams (not in the frame)
  if (bExit) bExit.onclick = function () { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} location.href = '/live/closed/'; };

  // 6. keys (not while typing in the chat; Speechify's keys are not loaded on this page, so Space and the arrows stay free)
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) showBar();   // any key brings the buttons
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === 'Escape') { if (typing || chatOpen() || ov.hidden === false) return; if (body.classList.contains('mini')) mini(false); return; }
    if (typing) return;
    var k = e.key.toLowerCase();
    if (k === 'm' && entered) { setSound(v.muted || v.volume === 0, true); showBar(); }
    else if (k === 'c' && entered) bChat.click();
  }, true);
})();
