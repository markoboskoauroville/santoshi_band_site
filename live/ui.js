// Full-view controls of /live/ (Marko, 15.11.2026): a big round TAP FOR SOUND in the centre on the first visit, then a row of round buttons at the
// bottom (chat, small window, sound on/off, hide, exit). The buttons hide by themselves after 4 s; a tap anywhere on the picture brings them back
// (that tap never touches the sound). Keys: M sound, C chat, Esc hides the buttons (it first closes the chat, which sbchat.js does itself).
// Does nothing inside the live banner's iframe (there sbctl.js has the controls). All icons are inline SVG on a 24 box, centred on 12,12.
(function () {
  if (window.top !== window || !window.sbPlayer) return;
  var P = window.sbPlayer, v = P.video, stage = document.getElementById('stage'), body = document.body;
  body.classList.add('top');
  var IC = {
    snd: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="6.5" height="4.5" rx="1"/>',
    hide: '<path d="M6 9.5l6 6 6-6"/>',
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
  var bChat = mk('b-chat', 'chat', 'Chat'), bPip = mk('b-pip', 'pip', 'Small window'), bMute = mk('b-mute', 'snd', 'Mute'), bHide = mk('b-hide', 'hide', 'Hide everything'), bExit = mk('b-exit', 'exit', 'Exit');
  bChat.appendChild(document.createElement('i'));
  stage.appendChild(bar);

  // 2b. the sound bar above the round buttons (Marko, 15.11.2026): MUTE/UNMUTE + volume slider, one #v element serves WHEP, HLS and the Studio ladder
  function store(k, val) { try { localStorage.setItem(k, val); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var vol = document.createElement('div'); vol.id = 'vol'; vol.className = 'off'; vol.setAttribute('role', 'group'); vol.setAttribute('aria-label', 'Sound');
  vol.innerHTML = '<button type="button" id="vb-mute" class="vm"></button><input id="vb-range" type="range" min="0" max="100" step="1" aria-label="Volume">';
  stage.appendChild(vol);
  var vMute = vol.querySelector('#vb-mute'), vRange = vol.querySelector('#vb-range');
  var savedVol = parseFloat(load('sb.vol')); if (!(savedVol >= 0 && savedVol <= 1)) savedVol = 1;
  var userMuted = load('sb.muted') === '1';
  try { v.volume = savedVol; } catch (e) {}
  function syncVol() {
    var m = v.muted || v.volume === 0;
    vMute.innerHTML = svg(m ? 'mute' : 'snd') + '<span>' + (m ? 'UNMUTE' : 'MUTE') + '</span>';
    vMute.setAttribute('aria-label', m ? 'Unmute' : 'Mute'); vMute.setAttribute('aria-pressed', m ? 'true' : 'false');
    vRange.value = Math.round((v.muted ? 0 : v.volume) * 100); vRange.setAttribute('aria-valuetext', vRange.value + ' percent');
  }
  v.addEventListener('volumechange', syncVol);

  var timer = null, entered = false;
  function showBar() { if (!entered) return; bar.classList.remove('off'); vol.classList.remove('off'); clearTimeout(timer); timer = setTimeout(hideBar, 4000); }
  function hideBar() { clearTimeout(timer); bar.classList.add('off'); vol.classList.add('off'); if (bar.contains(document.activeElement) || vol.contains(document.activeElement)) document.activeElement.blur(); }
  // CLEAN (Marko, 15.11.2026): the Hide button removes EVERYTHING drawn over the picture (round buttons, chat panel, watching badge, studio menu,
  // stats); a tap/click on the picture or any key brings it back. Pure CSS: body.clean hides them, nothing is removed from the page.
  function clean(on) {
    if (on === body.classList.contains('clean')) return;
    if (on) { if (chat && chatOpen()) chat.show(false); var g = document.getElementById('gm'); if (g) g.hidden = true; clearTimeout(timer); if (document.activeElement && document.activeElement !== body) document.activeElement.blur(); bar.classList.add('off'); vol.classList.add('off'); }
    body.classList.toggle('clean', on);
  }
  function chatOpen() { var p = document.querySelector('.sbc'); return !!p && !p.hidden; }

  // sound state on the button
  function syncMute() {
    var m = v.muted; bMute.innerHTML = svg(m ? 'mute' : 'snd');
    bMute.title = m ? 'Sound on' : 'Mute'; bMute.setAttribute('aria-label', bMute.title); bMute.setAttribute('aria-pressed', m ? 'true' : 'false');
  }
  v.addEventListener('volumechange', syncMute); syncMute();
  function setSound(on, byUser) { if (byUser) { userMuted = !on; store('sb.muted', userMuted ? '1' : '0'); } if (on && v.volume === 0) { try { v.volume = 0.5; } catch (e) {} store('sb.vol', v.volume); } P.setMuted(!on); syncMute(); syncVol(); }

  function enter() {
    entered = true; ov.classList.add('gone'); setTimeout(function () { ov.hidden = true; }, 500);
    setSound(!userMuted); showBar();   // TAP FOR SOUND gives sound, unless this viewer last chose MUTE
  }
  ov.addEventListener('click', enter);
  // the browser refused sound later (a reconnect): ask again in the middle
  window.addEventListener('sb-sound-blocked', function () { clean(false); ov.hidden = false; ov.classList.remove('gone'); entered = false; hideBar(); syncMute(); });

  bMute.onclick = function () { setSound(v.muted, true); showBar(); };
  vMute.onclick = function () { setSound(v.muted || v.volume === 0, true); showBar(); };
  vRange.addEventListener('input', function () {
    var x = vRange.value / 100; try { v.volume = x; } catch (e) {} store('sb.vol', x);
    if (x > 0 && v.muted) setSound(true, true); else if (x === 0) { userMuted = true; store('sb.muted', '1'); }
    showBar();
  });
  ['pointerdown', 'touchstart', 'focusin'].forEach(function (t) { vol.addEventListener(t, function () { clearTimeout(timer); }, { passive: true }); });
  vol.addEventListener('pointerup', showBar); vol.addEventListener('change', showBar);
  syncVol();
  bHide.onclick = function () { clean(true); };
  function tapPicture() { clean(false); if (entered && v.muted && !userMuted) setSound(true); showBar(); }   // a tap also gives sound when the page started muted and the viewer did not choose MUTE
  hit.addEventListener('pointerdown', tapPicture); hit.addEventListener('click', tapPicture);   // brings the buttons back; never touches the sound
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

  // 5. exit door: the page for when nobody streams
  bExit.onclick = function () { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} location.href = '/live/closed/'; };

  // 6. keys (not while typing in the chat; Speechify's keys are not loaded on this page, so Space and the arrows stay free)
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (body.classList.contains('clean')) { if (/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) return; clean(false); showBar(); e.stopPropagation(); e.preventDefault(); return; }
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === 'Escape') { if (typing || chatOpen() || ov.hidden === false) return; if (body.classList.contains('mini')) mini(false); else if (bar.classList.contains('off')) showBar(); else hideBar(); return; }
    if (typing) return;
    var k = e.key.toLowerCase();
    if (k === 'm' && entered) { setSound(v.muted, true); showBar(); }
    else if (k === 'c' && entered) bChat.click();
  }, true);
})();
