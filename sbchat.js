// Live chat + watching count for the Santoshi Band live viewer (Marko, 14.11.2026: "show how many people are watching it at this
// moment ... open the side panel with chat ... enter his name ... while we are streaming they can also chat").
// One WebSocket to /api/room (a Durable Object, room/worker.js) per open viewer page: the open sockets are the count, the same socket
// carries the chat. Reconnects by itself. Every user text goes in with textContent, never innerHTML.
//   SBChat(wrap)              viewer: badge "N watching" on the picture, CHAT button in the overlay bar, side panel
//   SBChat.connect(onEvent)   the socket (also used by the admin sender page), returns {send(obj), close(), up()}
//   SBChat.badge(wrap)        the badge alone, returns set(n)
//   SBChat.row(m)             one message as an element
(function () {
  var CSS = '.sbc-badge{position:absolute;top:8px;left:8px;z-index:8;display:flex;align-items:center;gap:6px;padding:4px 10px 4px 8px;border-radius:14px;background:#0B0D10b0;border:1px solid #ffffff40;color:#fff;font:600 13px/1.2 system-ui,sans-serif;letter-spacing:.02em;backdrop-filter:blur(6px);pointer-events:none;white-space:nowrap}' +
    '.sbc-badge svg{width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
    '.sbw.mini .sbc-badge{top:4px;left:4px;padding:2px 7px;font-size:11px}.sbw.mini .sbc-badge svg{width:12px;height:12px}' +
    '.sbo .b.ch{position:relative;font:700 12px system-ui,sans-serif;color:#fff;letter-spacing:.04em}.sbo .b.ch.on{color:#0B0D10}' +
    '.sbo .b.ch i{position:absolute;top:3px;right:3px;width:11px;height:11px;border-radius:50%;background:#ff4d3d;border:2px solid #0B0D10;display:none}.sbo .b.ch.new i{display:block}' +
    '.sbc{position:fixed;top:0;right:0;bottom:0;width:min(380px,100%);height:100%;height:100dvh;z-index:100003;background:#14110e;color:#f1e8d8;border-left:1px solid #3a3128;display:flex;flex-direction:column;font:15px/1.4 system-ui,sans-serif;text-align:left;box-shadow:-6px 0 24px #000a;box-sizing:border-box}' +
    '.sbc *{box-sizing:border-box}.sbc[hidden],.sbc [hidden]{display:none!important}' +
    '.sbc .hd{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 14px;border-bottom:1px solid #3a3128;padding-top:max(8px,env(safe-area-inset-top))}' +
    '.sbc .hd b{font-size:13px;letter-spacing:.14em;color:#e8a33d;flex:none}.sbc .hd .n{color:#a39a8a;font-size:13px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sbc .x{width:44px;height:44px;border-radius:50%;border:1px solid #ffffff40;background:#0B0D10;color:#fff;font:400 20px system-ui;cursor:pointer;flex:none;padding:0}' +
    '.sbc .lk{background:none;border:0;color:#a39a8a;font:13px system-ui;text-decoration:underline;cursor:pointer;padding:6px;flex:none}' +
    '.sbc .list{flex:1;overflow-y:auto;padding:10px 14px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}' +
    '.sbc-m{margin:0 0 8px;overflow-wrap:anywhere;word-break:break-word;font:15px/1.4 system-ui,sans-serif;color:#f1e8d8;text-align:left}' +
    '.sbc-m time{color:#a39a8a;font-size:12px;margin-right:6px}.sbc-m b{margin-right:6px}.sbc-m.band b{color:#e8a33d}' +
    '.sbc-m .tag{font-size:10px;letter-spacing:.1em;background:#e8a33d;color:#14110e;border-radius:4px;padding:1px 4px;margin-right:6px;vertical-align:1px}' +
    '.sbc .empty{color:#a39a8a;font-size:14px}' +
    '.sbc form{display:flex;gap:8px;padding:10px;border-top:1px solid #3a3128;padding-bottom:max(10px,env(safe-area-inset-bottom));margin:0}' +
    '.sbc input{flex:1;min-width:0;padding:12px;border-radius:10px;border:1px solid #3a3128;background:#201b16;color:#f1e8d8;font:16px system-ui,sans-serif}' +
    '.sbc input:focus{outline:none;border-color:#e8a33d}' +
    '.sbc .s{flex:none;padding:0 16px;min-height:44px;border-radius:10px;border:0;background:#e8a33d;color:#14110e;font:700 14px system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}' +
    '.sbc .st{color:#ff7b6b;font-size:13px;padding:0 14px}.sbc .st:empty{display:none}' +
    '.sbc .nm{padding:20px 14px;display:flex;flex-direction:column;gap:12px}.sbc .nm p{margin:0;color:#a39a8a;font-size:14px}.sbc .nm form{border:0;padding:0}' +
    '.sbc .nm label{font-weight:600}';
  var EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ERR = { slow: 'Slow down a little, one message at a time.', name: 'Please enter your name first.', 'name-taken': 'That name is for the band. Please choose another one.', 'not-live': 'The chat is open only while the band is live.' };
  function css() { if (!document.getElementById('sbc-css')) { var s = document.createElement('style'); s.id = 'sbc-css'; s.textContent = CSS; document.head.appendChild(s); } }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem('sb.' + k); localStorage.setItem('sb.' + k, v); } catch (e) { return null; } }
  function two(x) { return String(x).padStart(2, '0'); }
  function hm(ts) { var d = new Date(ts); return two(d.getHours()) + ':' + two(d.getMinutes()); }
  function watching(n) { return n + ' watching'; }

  function connect(on) {
    var ws = null, dead = false, tries = 0, ping = null;
    function open() {
      if (dead) return;
      try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/api/room'); } catch (e) { return later(); }
      ws.onopen = function () { tries = 0; clearInterval(ping); ping = setInterval(function () { try { ws.send('ping'); } catch (e) {} }, 25000); on({ t: 'open' }); };
      ws.onmessage = function (e) { if (e.data === 'pong') return; var j; try { j = JSON.parse(e.data); } catch (x) { return; } if (j.t === 'end') dead = true; on(j); };
      ws.onclose = function () { clearInterval(ping); if (!dead) on({ t: 'down' }); later(); };
      ws.onerror = function () {};
    }
    function later() { if (dead) return; setTimeout(open, Math.min(15000, 1000 * Math.pow(2, tries++)) + Math.random() * 500); }
    open();
    return {
      send: function (o) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } return false; },
      close: function () { dead = true; clearInterval(ping); try { ws && ws.close(); } catch (e) {} },
      up: function () { return !!ws && ws.readyState === 1; }
    };
  }
  function badge(wrap) {
    css(); var b = el('div', 'sbc-badge'); b.innerHTML = EYE; var t = el('span', '', ''); b.appendChild(t); b.hidden = true; wrap.appendChild(b);
    return function (n) { b.hidden = n == null; t.textContent = watching(n || 0); };
  }
  function row(m) {
    var d = el('div', 'sbc-m' + (m.band ? ' band' : ''));
    d.appendChild(el('time', '', hm(m.ts)));
    if (m.band) d.appendChild(el('span', 'tag', 'BAND'));
    d.appendChild(el('b', '', m.name));
    d.appendChild(el('span', '', m.text));
    return d;
  }

  function SBChat(wrap) {
    css();
    var setCount = badge(wrap), count = 0, msgs = {}, open = false;
    // the side panel lives in <body>, and inside the picture while the picture is in real full screen
    var pn = el('aside', 'sbc'); pn.hidden = true; pn.setAttribute('aria-label', 'Live chat'); document.body.appendChild(pn);
    var hd = el('div', 'hd'); hd.appendChild(el('b', '', 'LIVE CHAT')); var hn = el('span', 'n', ''); hd.appendChild(hn);
    var chg = el('button', 'lk', 'Name'); chg.type = 'button'; chg.title = 'Change your name'; hd.appendChild(chg);
    var x = el('button', 'x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Close the chat'); hd.appendChild(x); pn.appendChild(hd);
    // step 1: the name
    var nm = el('div', 'nm'), nf = el('form'), ni = el('input'), nl = el('label', '', 'Your name');
    nl.htmlFor = ni.id = 'sbc-name'; ni.maxLength = 30; ni.autocomplete = 'nickname'; ni.placeholder = 'Name shown in the chat'; ni.enterKeyHint = 'go';
    var nb = el('button', 's', 'JOIN'); nb.type = 'submit'; nf.appendChild(ni); nf.appendChild(nb);
    nm.appendChild(nl); nm.appendChild(nf); nm.appendChild(el('p', '', 'Everyone watching sees your name and messages. The chat is cleared when the stream ends.'));
    var ne = el('div', 'st', ''); nm.appendChild(ne); pn.appendChild(nm);
    // step 2: the chat
    var list = el('div', 'list'), empty = el('div', 'empty', 'No messages yet. Say hello to the band.'); list.appendChild(empty);
    var st = el('div', 'st', ''), mf = el('form'), mi = el('input'), mb = el('button', 's', 'SEND');
    mi.maxLength = 300; mi.placeholder = 'Write a message'; mi.autocomplete = 'off'; mi.enterKeyHint = 'send'; mi.setAttribute('aria-label', 'Message'); mb.type = 'submit';
    mf.appendChild(mi); mf.appendChild(mb); pn.appendChild(list); pn.appendChild(st); pn.appendChild(mf);
    var name = (ls('chatname') || '').trim();
    function step() { var has = !!name; nm.hidden = has; list.hidden = st.hidden = mf.hidden = !has; chg.hidden = !has; if (!has) ni.value = ''; head(); }
    function head() { hn.textContent = (name ? name + ' · ' : '') + watching(count); }
    step();
    // the CHAT button in the overlay bar (next to the Overlay switch), a red dot for new messages while the panel is shut
    var bar = wrap.querySelector('.sbo'), cb = el('button', 'b ch', 'CHAT'); cb.type = 'button'; cb.appendChild(el('i'));
    cb.setAttribute('aria-label', 'Open the live chat'); cb.title = 'Live chat';
    if (bar) bar.insertBefore(cb, bar.querySelector('.sw')); else { cb.style.cssText = 'position:absolute;right:8px;bottom:8px;z-index:9'; wrap.appendChild(cb); }
    function show(on) {
      open = on; pn.hidden = !on; cb.classList.toggle('on', on); if (on) cb.classList.remove('new');
      if (on) { list.scrollTop = list.scrollHeight; setTimeout(function () { (name ? mi : ni).focus({ preventScroll: true }); }, 50); }
    }
    cb.onclick = function (e) { e.stopPropagation(); show(!open); };
    x.onclick = function () { show(false); };
    chg.onclick = function () { name = ''; step(); ni.focus(); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) show(false); });
    document.addEventListener('fullscreenchange', function () { var h = document.fullscreenElement === wrap ? wrap : document.body; if (pn.parentNode !== h) h.appendChild(pn); });
    nf.onsubmit = function (e) {
      e.preventDefault(); var v = ni.value.replace(/\s+/g, ' ').trim();
      if (!v) { ne.textContent = ERR.name; return; }
      if (/santoshi\s*band|^admin$|moderator/i.test(v)) { ne.textContent = ERR['name-taken']; return; }
      ne.textContent = ''; name = v.slice(0, 30); ls('chatname', name); step(); mi.focus();
    };
    mf.onsubmit = function (e) {
      e.preventDefault(); var v = mi.value.trim(); if (!v) return;
      if (conn.send({ t: 'msg', name: name, text: v.slice(0, 300) })) { mi.value = ''; st.textContent = ''; } else st.textContent = 'Reconnecting… try again in a moment.';
    };
    function add(m) {
      if (msgs[m.id]) return; msgs[m.id] = 1; empty.hidden = true;
      var near = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
      list.appendChild(row(m)); if (near || m.name === name) list.scrollTop = list.scrollHeight;
      if (!open) cb.classList.add('new');
    }
    var conn = connect(function (j) {
      if (j.t === 'hist') { var any = false; j.msgs.forEach(function (m) { if (!msgs[m.id]) { any = true; } add(m); }); if (!any) cb.classList.remove('new'); st.textContent = ''; }
      else if (j.t === 'msg') add(j.m);
      else if (j.t === 'count') { count = j.n; setCount(count); head(); }
      else if (j.t === 'reset') { msgs = {}; [].slice.call(list.querySelectorAll('.sbc-m')).forEach(function (d) { d.remove(); }); empty.hidden = false; }
      else if (j.t === 'err') { if (j.e === 'name-taken') { name = ''; step(); ne.textContent = ERR[j.e]; } else st.textContent = ERR[j.e] || 'Not sent.'; }
      else if (j.t === 'down') st.textContent = open ? 'Connection lost, reconnecting…' : '';
      else if (j.t === 'end') gone();
    });
    function gone() { conn.close(); pn.remove(); var b = document.getElementById('sb-live'); if (b) b.remove(); }
    // the banner's own 30 s check removes the banner when the stream ends: take the panel and the socket with it
    if (location.hash === '#chat') show(true);   // a link straight into the chat: https://santoshi-band.pages.dev/#chat
    var watch = setInterval(function () { if (!wrap.isConnected) { clearInterval(watch); conn.close(); pn.remove(); } }, 3000);
    return { conn: conn, show: show };
  }
  SBChat.connect = connect; SBChat.badge = badge; SBChat.row = row; SBChat.css = css;
  window.SBChat = SBChat;
})();
