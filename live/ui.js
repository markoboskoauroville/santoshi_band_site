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
  var bChat = mk('b-chat', 'chat', 'Chat'), bPip = mk('b-pip', 'pip', 'Small window'), bMute = mk('b-mute', 'snd', 'Sound'), bFs = framed ? mk('b-fs', 'fs', 'Full screen') : null, bExit = framed ? null : mk('b-exit', 'exit', 'Exit');
  bChat.appendChild(document.createElement('i'));
  stage.appendChild(bar);

  // 2b. ONE sound drawer (Marko, 15.11.2026: "The speaker icon should open this fader ... goes up vertically ... first in the row on the left ... One drawer please"):
  // the speaker is the first round button; it slides a drawer UP with a vertical VOLUME fader, a vertical ZOOM fader, MUTE at the base.
  // One #v element serves HLS, WHEP and the Studio ladder, so volume/mute/zoom go straight onto it.
  function store(k, val) { try { localStorage.setItem(k, val); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var sw = document.createElement('div'); sw.className = 'sw'; bar.insertBefore(sw, bar.firstChild); sw.appendChild(bMute);
  bMute.setAttribute('aria-haspopup', 'true'); bMute.setAttribute('aria-expanded', 'false');
  var drawer = document.createElement('div'); drawer.id = 'sd'; drawer.hidden = true; drawer.setAttribute('role', 'group'); drawer.setAttribute('aria-label', 'Sound and zoom');
  drawer.innerHTML = '<div class="fr"></div><button type="button" id="vb-mute" class="vm"></button><button type="button" id="vb-done" class="vm dn" aria-label="Close the sound drawer">DONE</button>';
  sw.appendChild(drawer);
  var vMute = drawer.querySelector('#vb-mute'), fr = drawer.querySelector('.fr');
  // a vertical fader on pointer events (the same on every browser; the track is 44 px wide, up to 180 px tall)
  function fader(label, min, max, step, get, set, fmt) {
    var col = document.createElement('div'); col.className = 'fc';
    var tx = document.createElement('div'); tx.className = 'fv'; var tr = document.createElement('div'); tr.className = 'ft'; tr.tabIndex = 0;
    tr.setAttribute('role', 'slider'); tr.setAttribute('aria-label', label); tr.setAttribute('aria-orientation', 'vertical'); tr.setAttribute('aria-valuemin', min); tr.setAttribute('aria-valuemax', max);
    var fl = document.createElement('i'); var th = document.createElement('b'); tr.appendChild(fl); tr.appendChild(th);
    var cap = document.createElement('div'); cap.className = 'fl'; cap.textContent = label.toUpperCase();
    col.appendChild(tx); col.appendChild(tr); col.appendChild(cap); fr.appendChild(col);
    function draw() { var x = get(), f = (x - min) / (max - min); fl.style.height = (f * 100) + '%'; th.style.bottom = 'calc(' + (f * 100) + '% - 9px)'; tx.textContent = fmt(x); tr.setAttribute('aria-valuenow', x); tr.setAttribute('aria-valuetext', fmt(x)); }
    function at(e) { var r = tr.getBoundingClientRect(), f = 1 - (e.clientY - r.top) / r.height; f = Math.max(0, Math.min(1, f)); var x = min + f * (max - min); return Math.round(x / step) * step; }
    var dragging = false;
    tr.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); clearTimeout(timer); try { tr.setPointerCapture(e.pointerId); } catch (x) {} dragging = true; set(at(e)); draw(); });
    tr.addEventListener('pointermove', function (e) { if (dragging) { set(at(e)); draw(); } });
    function up() { if (dragging) { dragging = false; showBar(); } }
    tr.addEventListener('pointerup', up); tr.addEventListener('pointercancel', up);
    tr.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowUp' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowDown' || e.key === 'ArrowLeft') ? -1 : 0; if (!d) return;
      e.preventDefault(); e.stopPropagation(); set(Math.max(min, Math.min(max, get() + d * (max - min) / 20))); draw(); showBar();
    });
    return draw;
  }
  var savedVol = parseFloat(load('sb.vol')); if (!(savedVol >= 0 && savedVol <= 1)) savedVol = 1;
  var savedZoom = parseFloat(load('sb.zoom')); if (!(savedZoom >= 1 && savedZoom <= 3)) savedZoom = 1;
  var userMuted = load('sb.muted') === '1';
  var volOk = true;   // iOS Safari ignores video.volume (always 1): there the fader is not offered, MUTE still works
  try { v.volume = 0.5; volOk = Math.abs(v.volume - 0.5) < 0.01; v.volume = savedVol; } catch (e) { volOk = false; }
  function setZoom(z) { z = Math.max(1, Math.min(3, Math.round(z * 100) / 100)); v.style.setProperty('--z', z); store('sb.zoom', z); }
  v.style.setProperty('--z', savedZoom);
  var drawVol = volOk ? fader('Volume', 0, 100, 1, function () { return Math.round((v.muted ? 0 : v.volume) * 100); }, function (x) {
    try { v.volume = x / 100; } catch (e) {} store('sb.vol', x / 100);
    if (x > 0 && v.muted) setSound(true, true); else if (x === 0) { userMuted = true; store('sb.muted', '1'); }
  }, function (x) { return x + '%'; }) : function () {};
  var drawZoom = fader('Zoom', 1, 3, 0.05, function () { return parseFloat(v.style.getPropertyValue('--z')) || 1; }, setZoom, function (x) { return (Math.round(x * 100) / 100).toFixed(1) + 'x'; });
  function syncVol() {
    var m = v.muted || v.volume === 0;
    vMute.innerHTML = svg(m ? 'mute' : 'snd') + '<span>' + (m ? 'UNMUTE' : 'MUTE') + '</span>';
    vMute.setAttribute('aria-label', m ? 'Unmute' : 'Mute'); vMute.setAttribute('aria-pressed', m ? 'true' : 'false');
    drawVol(); drawZoom();
  }
  v.addEventListener('volumechange', syncVol);
  function openDrawer(on) {
    if (on && !entered) return; drawer.hidden = !on; bMute.setAttribute('aria-expanded', on ? 'true' : 'false'); bMute.classList.toggle('open', on);
    if (on) { syncVol(); showBar(); }
  }
  drawer.querySelector('#vb-done').onclick = function () { openDrawer(false); };   // only shown when the picture is small (compact drawer fills the frame)
  // closes on a tap outside it
  document.addEventListener('pointerdown', function (e) { if (!drawer.hidden && !sw.contains(e.target)) openDrawer(false); }, true);
  window.addEventListener('blur', function () { openDrawer(false); });   // in the home page's frame a tap outside the frame blurs it

  var timer = null, entered = false;
  // the buttons come and go by themselves: 5 s after the last tap, click, mouse move or key (Marko, 15.11.2026). While they show, the picture
  // gives up a strip at the bottom (stage.ctl, CSS), so a caption burned into the picture's lower edge never sits under the buttons.
  function showBar() { if (!entered) return; bar.classList.remove('off'); stage.classList.add('ctl'); clearTimeout(timer); timer = setTimeout(hideBar, 5000); }
  function hideBar() { clearTimeout(timer); bar.classList.add('off'); stage.classList.remove('ctl'); openDrawer(false); if (bar.contains(document.activeElement)) document.activeElement.blur(); }
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

  bMute.onclick = function () { openDrawer(drawer.hidden); showBar(); };
  vMute.onclick = function () { setSound(v.muted || v.volume === 0, true); showBar(); };
  drawer.addEventListener('pointerdown', function () { clearTimeout(timer); });
  drawer.addEventListener('pointerup', showBar);
  syncVol();
  function tapPicture() { openDrawer(false); if (entered && v.muted && !userMuted) setSound(true); showBar(); }   // a tap also gives sound when the page started muted and the viewer did not choose MUTE
  hit.addEventListener('pointerdown', tapPicture); hit.addEventListener('click', tapPicture);   // brings the buttons back; never touches the sound
  var lastMove = 0;
  function moved() { var n = Date.now(); if (n - lastMove > 250) { lastMove = n; showBar(); } }
  document.addEventListener('mousemove', moved, true); document.addEventListener('touchstart', function () { showBar(); }, { capture: true, passive: true });
  bar.addEventListener('pointerdown', function () { clearTimeout(timer); });
  bar.addEventListener('pointerup', showBar);
  bar.addEventListener('focusin', function () { clearTimeout(timer); });

  // 3. chat: the site's own live chat (sbchat.js), its panel and badge; its own CHAT button is hidden, ours opens it
  var chat = null;
  function loadChat(cb) {
    if (chat) return cb(); if (window.SBChat) { chat = SBChat(stage); return cb(); }
    var s = document.createElement('script'); s.src = '/sbchat.js?v=3'; s.onload = function () { chat = SBChat(stage); watchDot(); cb(); }; document.head.appendChild(s);
  }
  function watchDot() {
    var cb = stage.querySelector(':scope > .b.ch'); if (!cb) return;
    new MutationObserver(function () { bChat.classList.toggle('new', cb.classList.contains('new')); }).observe(cb, { attributes: true, attributeFilter: ['class'] });
  }
  bChat.onclick = function () { loadChat(function () { var open = chatOpen(); chat.show(!open); bChat.setAttribute('aria-pressed', !open ? 'true' : 'false'); if (!open) bChat.classList.remove('new'); }); showBar(); };
  loadChat(function () {});   // connects at once: the "N watching" badge and the red dot for new messages
  document.addEventListener('click', function () { setTimeout(function () { bChat.setAttribute('aria-pressed', chatOpen() ? 'true' : 'false'); }, 0); }, true);

  // 4. small window: native picture in picture, Safari's presentation mode, else the corner fallback
  var pipOn = false;
  function pipState(on) { pipOn = on; bPip.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  v.addEventListener('enterpictureinpicture', function () { pipState(true); });
  v.addEventListener('leavepictureinpicture', function () { pipState(false); });
  v.addEventListener('webkitpresentationmodechanged', function () { pipState(v.webkitPresentationMode === 'picture-in-picture'); });
  function mini(on) {
    body.classList.toggle('mini', on); pipState(on);
    var h = document.getElementById('minihint');
    if (on && !h) { h = document.createElement('div'); h.id = 'minihint'; h.textContent = 'The stream plays in the small window. Tap it to make it big again.'; stage.appendChild(h); }
    if (!on && h) h.remove();
  }
  v.addEventListener('click', function () { if (body.classList.contains('mini')) mini(false); });
  bPip.onclick = function () {
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
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
    else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();   // iPhone: only the video can go full screen
    showBar();
  };
  document.addEventListener('fullscreenchange', function () { if (bFs) bFs.setAttribute('aria-pressed', document.fullscreenElement ? 'true' : 'false'); });

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
