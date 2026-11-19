/* =====================================================================
   наши полгода — script.js
   всё, что можно менять, лежит в config.js
   ===================================================================== */
(function () {
  'use strict';

  var C = window.CONFIG || {};
  var T = C.text || {};
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function $(s) { return document.querySelector(s); }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  var state = { choice: null, time: null };

  /* мягкая голубая заглушка, если какое-то фото не найдётся */
  var FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#eaf6ff"/><stop offset="1" stop-color="#cfe6ff"/>' +
    '</linearGradient></defs><rect width="300" height="400" fill="url(#g)"/>' +
    '<path d="M150 236c-30-21-36-39-26-51 9-10 21-7 26 3 5-10 17-13 26-3 10 12 4 30-26 51z" fill="#9ed8ff"/>' +
    '</svg>');

  /* ===================================================================
     фон: летающие сердечки и искры + взрывы на каждое касание
     =================================================================== */
  var cv = $('#bg'), cx = cv.getContext('2d');
  var W = 0, H = 0, tick = 0, last = 0;
  var COLORS = ['#8fd0fb', '#b9e3ff', '#ffc3dd', '#ffd9ea', '#ffffff'];
  var floaters = [], bits = [];

  function newFloater(spread) {
    return {
      x: Math.random() * W,
      y: spread ? Math.random() * H : H + 24,
      s: 5 + Math.random() * 11,
      v: (0.18 + Math.random() * 0.4) * (reduced ? 0.45 : 1),
      sway: 0.3 + Math.random() * 1.1,
      phase: Math.random() * 400,
      rot: (Math.random() - 0.5) * 0.7,
      rv: (Math.random() - 0.5) * 0.01,
      a: 0.24 + Math.random() * 0.4,
      heart: Math.random() < 0.55,
      c: COLORS[(Math.random() * COLORS.length) | 0]
    };
  }

  function seed() {
    var n = reduced ? 9 : (W < 540 ? 20 : 32);
    floaters.length = 0;
    for (var i = 0; i < n; i++) floaters.push(newFloater(true));
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth || window.innerWidth;
    H = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function heartPath(x, y, s, rot, a, c) {
    cx.save(); cx.globalAlpha = a; cx.translate(x, y); cx.rotate(rot); cx.scale(s, s);
    cx.fillStyle = c; cx.beginPath();
    cx.moveTo(0, 0.36);
    cx.bezierCurveTo(-0.58, -0.14, -0.32, -0.78, 0, -0.34);
    cx.bezierCurveTo(0.32, -0.78, 0.58, -0.14, 0, 0.36);
    cx.closePath(); cx.fill(); cx.restore();
  }

  function sparkPath(x, y, s, rot, a, c) {
    cx.save(); cx.globalAlpha = a; cx.translate(x, y); cx.rotate(rot); cx.scale(s * 0.5, s * 0.5);
    cx.fillStyle = c; cx.beginPath();
    cx.moveTo(0, -1); cx.lineTo(0.22, -0.22); cx.lineTo(1, 0); cx.lineTo(0.22, 0.22);
    cx.lineTo(0, 1); cx.lineTo(-0.22, 0.22); cx.lineTo(-1, 0); cx.lineTo(-0.22, -0.22);
    cx.closePath(); cx.fill(); cx.restore();
  }

  function shape(isHeart, x, y, s, rot, a, c) {
    if (isHeart) heartPath(x, y, s, rot, a, c); else sparkPath(x, y, s, rot, a, c);
  }

  function burst(x, y, o) {
    o = o || {};
    if (x == null || isNaN(x)) { x = W / 2; y = H / 2; }
    var count = Math.max(1, Math.round((o.count || 10) * (reduced ? 0.5 : 1)));
    var hearts = o.hearts == null ? 0.5 : o.hearts;
    for (var i = 0; i < count; i++) {
      var ang = o.up ? (-Math.PI / 2 + (Math.random() - 0.5) * 1.8) : Math.random() * Math.PI * 2;
      var sp = (o.power || 4) * (0.4 + Math.random() * 0.8);
      bits.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - (o.up ? Math.random() * 3.5 : 0),
        g: o.gravity == null ? 0.085 : o.gravity,
        life: 0, max: (o.life || 62) * (0.7 + Math.random() * 0.7),
        s: (o.size || 0.85) * (7 + Math.random() * 9),
        rot: Math.random() * 6.28,
        rv: (Math.random() - 0.5) * 0.18,
        heart: Math.random() < hearts,
        c: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }
    if (bits.length > 460) bits.splice(0, bits.length - 460);
  }

  function frame(now) {
    var dt = last ? Math.min((now - last) / 16.667, 3) : 1;
    last = now; tick += dt;
    cx.clearRect(0, 0, W, H);

    for (var i = 0; i < floaters.length; i++) {
      var p = floaters[i];
      p.y -= p.v * dt;
      p.x += Math.sin((tick + p.phase) / 95) * p.sway * 0.22 * dt;
      p.rot += p.rv * dt;
      if (p.y < -30) { floaters[i] = newFloater(false); continue; }
      shape(p.heart, p.x, p.y, p.s, p.rot, p.a, p.c);
    }

    for (var j = bits.length - 1; j >= 0; j--) {
      var b = bits[j];
      b.life += dt;
      if (b.life >= b.max) { bits.splice(j, 1); continue; }
      b.vy += b.g * dt;
      b.vx *= (1 - 0.006 * dt);
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.rv * dt;
      var k = 1 - b.life / b.max;
      shape(b.heart, b.x, b.y, b.s * (0.6 + 0.4 * k), b.rot, Math.min(1, k * 1.7), b.c);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  /* ===================================================================
     мелкая механика: вибрация, нажатия, печать, экраны
     =================================================================== */
  function buzz(pattern) {
    if (reduced || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* ничего */ }
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    burst(e.clientX, e.clientY, { count: 5, power: 3, hearts: 0.3, size: 0.5, gravity: 0.03, life: 46 });
  }, { passive: true });

  function tactile(node, opt) {
    opt = opt || {};
    node.addEventListener('pointerdown', function () {
      node.classList.remove('bounce');
      buzz(opt.big ? 15 : 8);
    }, { passive: true });
    node.addEventListener('pointerup', function (e) {
      node.classList.add('bounce');
      if (opt.big) burst(e.clientX, e.clientY, { count: 16, power: 5.5, hearts: 0.8 });
    }, { passive: true });
    node.addEventListener('animationend', function (e) {
      if (e.animationName === 'bounceBack') node.classList.remove('bounce');
    });
  }

  function typeText(node, text, done) {
    var speed = reduced ? 14 : 52, i = 0;
    node.textContent = '';
    node.classList.add('typing');
    (function step() {
      node.textContent = text.slice(0, i);
      if (i >= text.length) {
        node.classList.remove('typing');
        if (done) done();
        return;
      }
      var ch = text.charAt(i);
      i++;
      var d = speed;
      if (ch === ' ') d = speed * 0.6;
      else if (',:'.indexOf(ch) >= 0) d = speed * 3;
      else if ('.!?'.indexOf(ch) >= 0) d = speed * 4;
      setTimeout(step, d);
    })();
  }

  function popText(t) {
    var p = $('#pop');
    p.textContent = t;
    p.classList.remove('show');
    void p.offsetWidth;
    p.classList.add('show');
    setTimeout(function () { p.classList.remove('show'); }, 1400);
  }

  var scr = {
    boot: $('#s-boot'), gallery: $('#s-gallery'),
    choice: $('#s-choice'), time: $('#s-time'), final: $('#s-final')
  };
  var current = scr.boot;

  function show(next, after) {
    if (current === next) return;
    var prev = current;
    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    setTimeout(function () { prev.classList.remove('is-leaving'); }, 680);
    current = next;
    setTimeout(function () {
      next.classList.add('is-active');
      next.scrollTop = 0;
      if (after) after();
    }, 280);
  }

  function center(node, ky) {
    var r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * (ky == null ? 0.5 : ky) };
  }

  /* ===================================================================
     музыка: play() строго внутри клика по «yes»
     =================================================================== */
  var audio = $('#song'), muteBtn = $('#mute');
  var VOL = C.audioVolume == null ? 0.75 : C.audioVolume;
  var FADE = C.audioFadeSeconds == null ? 2.6 : C.audioFadeSeconds;
  var audioOk = true, musicOn = false, muted = false, actx = null, gain = null;

  audio.loop = true;
  if (C.audio) audio.src = C.audio;
  audio.addEventListener('error', function () { audioOk = false; muteBtn.hidden = true; });

  function startMusic() {
    if (musicOn || !audioOk || !C.audio) return;
    musicOn = true;
    var web = false;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        actx = new AC();
        var src = actx.createMediaElementSource(audio);
        gain = actx.createGain();
        gain.gain.setValueAtTime(0.0001, actx.currentTime);
        src.connect(gain);
        gain.connect(actx.destination);
        if (actx.state === 'suspended' && actx.resume) actx.resume();
        web = true;
      }
    } catch (e) { actx = null; gain = null; }

    audio.volume = web ? 1 : 0;
    var p = audio.play();
    if (p && p.then) {
      p.then(function () { muteBtn.hidden = false; })
       .catch(function () { audioOk = false; muteBtn.hidden = true; });
    } else {
      muteBtn.hidden = false;
    }

    if (web) {
      gain.gain.exponentialRampToValueAtTime(Math.max(VOL, 0.02), actx.currentTime + FADE);
    } else {
      var t0 = Date.now();
      (function ramp() {
        var k = Math.min((Date.now() - t0) / (FADE * 1000), 1);
        audio.volume = VOL * k;
        if (k < 1) requestAnimationFrame(ramp);
      })();
    }
  }

  muteBtn.addEventListener('click', function () {
    muted = !muted;
    audio.muted = muted;
    if (gain && actx) {
      gain.gain.cancelScheduledValues(actx.currentTime);
      gain.gain.linearRampToValueAtTime(muted ? 0.0001 : VOL, actx.currentTime + 0.25);
    }
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', muted ? 'включить музыку' : 'выключить музыку');
    buzz(8);
  });
  tactile(muteBtn, {});

  /* ===================================================================
     экран 1 — загрузка, вопрос, убегающее «no»
     =================================================================== */
  var yesBtn = $('#btn-yes'), noBtn = $('#btn-no'), tease = $('#no-tease');
  var bootDone = false, escapes = 0, loose = false, lastEscape = 0;

  $('#loading-line').textContent = T.loading || '';
  yesBtn.textContent = T.yes || 'yes';
  noBtn.textContent = T.no || 'no';

  setTimeout(function () {
    var load = $('#boot-loading'), ask = $('#boot-ask');
    load.classList.add('fade-out');
    setTimeout(function () {
      load.hidden = true;
      ask.hidden = false;
      ask.classList.add('fade-in');
      typeText($('#ask-line'), T.ask || '', function () {
        $('#ask-buttons').classList.add('show');
        buzz(10);
      });
    }, 380);
  }, reduced ? 1500 : 2550);

  function overlaps(x, y, w, h, r, pad) {
    return x < r.right + pad && x + w > r.left - pad && y < r.bottom + pad && y + h > r.top - pad;
  }

  function runAway() {
    if (bootDone) return;
    var now = Date.now();
    if (now - lastEscape < 240) return;
    lastEscape = now;

    var r = noBtn.getBoundingClientRect();
    if (!loose) {
      loose = true;
      noBtn.style.width = r.width + 'px';
      noBtn.style.left = r.left + 'px';
      noBtn.style.top = r.top + 'px';
      noBtn.classList.add('loose');
    }
    var safe = yesBtn.getBoundingClientRect();
    var pad = 14, x = 0, y = 0, tries = 0;
    do {
      x = pad + Math.random() * Math.max(10, window.innerWidth - r.width - pad * 2);
      y = pad + Math.random() * Math.max(10, window.innerHeight - r.height - pad * 2);
      tries++;
    } while (tries < 16 && overlaps(x, y, r.width, r.height, safe, 52));

    noBtn.style.left = x + 'px';
    noBtn.style.top = y + 'px';
    noBtn.style.transform = 'rotate(' + (Math.random() * 26 - 13).toFixed(1) + 'deg)';
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: 6, power: 3.4, hearts: 0.2, size: 0.55, life: 44 });
    buzz(6);

    escapes++;
    if (escapes >= 3 && T.noTease) {
      tease.textContent = T.noTease;
      tease.classList.add('show');
    }
  }

  noBtn.addEventListener('pointerenter', runAway);
  noBtn.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') { e.preventDefault(); runAway(); }
  });
  noBtn.addEventListener('click', function (e) { e.preventDefault(); runAway(); });
  document.addEventListener('mousemove', function (e) {
    if (bootDone || noBtn.style.display === 'none') return;
    var r = noBtn.getBoundingClientRect();
    if (!r.width) return;
    var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (dx * dx + dy * dy < 9600) runAway();
  }, { passive: true });

  tactile(yesBtn, { big: true });
  yesBtn.addEventListener('click', function () {
    if (bootDone) return;
    bootDone = true;
    startMusic();                     /* ровно внутри клика — iOS/Chrome */
    buzz([22, 40, 26]);
    var c = center(yesBtn);
    burst(c.x, c.y, { count: 48, power: 9, hearts: 0.85, size: 1.25, gravity: 0.05 });
    popText(T.yesBurst || '');
    noBtn.style.display = 'none';
    setTimeout(function () { show(scr.gallery, startGallery); }, 1050);
  });

  /* ===================================================================
     экран 2 — галерея-полароиды
     =================================================================== */
  var PHOTOS = (C.photos || []).slice();
  var CAPS = ['💙', '✨', '💙', '🫶', '💙', '💫'];
  var stack = $('#stack'), dotsBox = $('#dots'), hint = $('#gallery-hint');
  var gi = -1, gTimer = null, gEnded = false, gRunning = false;
  var HOLD = Math.max(250, (C.photoSeconds == null ? 0.8 : C.photoSeconds) * 1000);

  function preload(i) {
    if (i < 0 || i >= PHOTOS.length) return;
    var im = new Image();
    im.src = PHOTOS[i];
  }

  function startGallery() {
    hint.textContent = T.galleryHint || '';
    $('#gallery-end-line').textContent = T.galleryEnd || '';
    $('#btn-next').textContent = T.galleryNext || '';
    dotsBox.innerHTML = '';
    if (PHOTOS.length > 14) dotsBox.classList.add('many');
    for (var i = 0; i < PHOTOS.length; i++) dotsBox.appendChild(el('span', 'dot'));
    preload(0); preload(1); preload(2); preload(3);
    typeText($('#gallery-line'), T.galleryLine || '', function () {
      gRunning = true;
      nextPhoto(false);
    });
  }

  function markDots(i) {
    var all = dotsBox.children;
    for (var k = 0; k < all.length; k++) all[k].className = 'dot' + (k === i ? ' on' : '');
  }

  function addPolaroid(i) {
    var prev = stack.lastElementChild;
    if (prev && prev.firstElementChild) {
      var pf = prev.firstElementChild;
      pf.classList.remove('settle');
      void pf.offsetWidth;
      pf.classList.add('settle');
    }

    var frame = el('div', 'frame');
    frame.style.zIndex = String(10 + i);

    var fig = el('figure', 'polaroid in');
    var dir = (i % 2) ? 1 : -1;
    fig.style.setProperty('--rot', (dir * (2 + (i * 2.7) % 4.8)).toFixed(2) + 'deg');
    fig.style.setProperty('--fx', (dir * (24 + (i * 11) % 26)).toFixed(0) + '%');

    var img = el('img');
    img.alt = '';
    img.decoding = 'async';
    img.addEventListener('error', function () { if (img.src !== FALLBACK) img.src = FALLBACK; });
    img.src = PHOTOS[i];

    var cap = el('figcaption');
    cap.textContent = CAPS[i % CAPS.length];

    fig.appendChild(img);
    fig.appendChild(cap);
    frame.appendChild(fig);
    stack.appendChild(frame);

    var c = center(stack, 0.78);
    burst(c.x, c.y, { count: 4, power: 2.6, hearts: 0.45, size: 0.5, gravity: 0.02, life: 44 });

    while (stack.children.length > 7) stack.removeChild(stack.firstElementChild);
  }

  function nextPhoto(manual) {
    clearTimeout(gTimer);
    if (gEnded) return;
    if (gi >= PHOTOS.length - 1) { endGallery(); return; }
    gi++;
    addPolaroid(gi);
    markDots(gi);
    if (manual) buzz(9);
    preload(gi + 2); preload(gi + 3);
    if (gi >= PHOTOS.length - 1) {
      gTimer = setTimeout(endGallery, HOLD + 900);
    } else {
      gTimer = setTimeout(function () { nextPhoto(false); }, HOLD);
    }
  }

  function endGallery() {
    if (gEnded) return;
    gEnded = true;
    clearTimeout(gTimer);
    hint.classList.add('gone');
    $('#gallery-end').hidden = false;
    var c = center(stack);
    burst(c.x, c.y, { count: 32, power: 7, hearts: 0.85, size: 1.1 });
    buzz([14, 50, 18]);
  }

  function manualNext() {
    if (!gRunning || gEnded) return;
    hint.classList.add('gone');
    nextPhoto(true);
  }

  var sx = 0, sy = 0, tracking = false;
  stack.addEventListener('pointerdown', function (e) {
    tracking = true; sx = e.clientX; sy = e.clientY;
  }, { passive: true });
  stack.addEventListener('pointerup', function (e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dy) > 72 && Math.abs(dy) > Math.abs(dx)) return;   /* это была прокрутка */
    manualNext();
  }, { passive: true });
  stack.addEventListener('pointercancel', function () { tracking = false; });
  stack.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      manualNext();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimeout(gTimer);
    } else if (gRunning && !gEnded) {
      clearTimeout(gTimer);
      gTimer = setTimeout(function () { nextPhoto(false); }, 500);
    }
  });

  var nextBtn = $('#btn-next');
  tactile(nextBtn, { big: true });
  nextBtn.addEventListener('click', function () {
    clearTimeout(gTimer);
    show(scr.choice);
  });

  /* ===================================================================
     экран 3 — чем займёмся
     =================================================================== */
  var cards = $('#cards'), reaction = $('#choice-reaction'), locked = false;

  $('#choice-title').textContent = T.choiceTitle || '';
  $('#choice-hint').textContent = T.choiceHint || '';

  (C.choices || []).forEach(function (ch) {
    var card = cards.querySelector('.card[data-id="' + ch.id + '"]');
    if (!card) return;
    card.querySelector('.card-label').textContent = ch.label;
    card.setAttribute('aria-label', ch.label);

    card.addEventListener('pointerdown', function () {
      card.classList.add('awake');
      buzz(9);
    }, { passive: true });
    card.addEventListener('focus', function () { card.classList.add('awake'); });
    card.addEventListener('blur', function () { if (!locked) card.classList.remove('awake'); });

    card.addEventListener('click', function () {
      if (locked) return;
      locked = true;
      state.choice = ch;
      cards.classList.add('locked');
      card.classList.add('picked');
      var c = center(card);
      burst(c.x, c.y, { count: 36, power: 7.5, hearts: 0.8, size: 1.15 });
      buzz([18, 40, 28]);
      reaction.textContent = ch.reaction || '';
      reaction.classList.add('show');
      setTimeout(function () { show(scr.time, startTime); }, 1900);
    });
  });

  /* ===================================================================
     экран 4 — во сколько
     =================================================================== */
  var grid = $('#time-grid'), picked = $('#time-picked'), doneBtn = $('#btn-done');
  var dateLabel = (C.time && C.time.dateLabel) || '';
  var timeBuilt = false;

  function hm(s) {
    var m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(String(s || ''));
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }
  function fmt(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function startTime() {
    $('#time-title').textContent = (T.timeTitle || '').replace('{date}', dateLabel);
    $('#time-hint').textContent = T.timeHint || '';
    doneBtn.textContent = T.timeDone || '';
    if (timeBuilt) return;
    timeBuilt = true;

    var cfg = C.time || {};
    var from = hm(cfg.from); if (from === null) from = 12 * 60;
    var to = hm(cfg.to); if (to === null) to = 23 * 60 + 30;
    var step = +cfg.stepMinutes || 30;
    if (to < from) to = from;

    for (var t = from; t <= to; t += step) {
      (function (label) {
        var b = el('button', 'slot');
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', function (e) {
          var on = grid.querySelectorAll('.slot.on');
          for (var k = 0; k < on.length; k++) on[k].classList.remove('on');
          b.classList.add('on');
          state.time = label;
          picked.textContent = (T.timePicked || '{time}').replace('{time}', label);
          picked.classList.remove('show');
          void picked.offsetWidth;
          picked.classList.add('show');
          doneBtn.disabled = false;
          burst(e.clientX, e.clientY, { count: 12, power: 4.5, hearts: 0.75 });
          buzz(11);
        });
        tactile(b, {});
        grid.appendChild(b);
      })(fmt(t));
    }
  }

  tactile(doneBtn, { big: true });
  doneBtn.addEventListener('click', function () {
    if (doneBtn.disabled || !state.time) return;
    show(scr.final, startFinal);
  });

  /* ===================================================================
     экран 5 — финал
     =================================================================== */
  var finalDone = false;

  function startFinal() {
    if (finalDone) return;
    finalDone = true;

    $('#final-title').textContent = T.finalTitle || '';
    $('#final-sub').textContent = T.finalSub || '';
    $('#summary-title').textContent = T.summaryTitle || '';
    $('#sum-what-label').textContent = T.summaryWhat || '';
    $('#sum-when-label').textContent = T.summaryWhen || '';
    $('#sum-what').textContent = state.choice ? state.choice.label : '—';
    $('#sum-when').textContent = (dateLabel ? dateLabel + ', ' : '') + (state.time || '—');

    var img = $('#final-photo');
    img.addEventListener('error', function () { if (img.src !== FALLBACK) img.src = FALLBACK; });
    img.src = C.finalPhoto || FALLBACK;
    var shot = img.parentNode;
    shot.classList.remove('reveal');
    void shot.offsetWidth;
    shot.classList.add('reveal');

    var share = (C.share || {});
    var msg = (share.message || '')
      .replace('{choice}', state.choice ? state.choice.label : '')
      .replace('{time}', state.time || '')
      .replace('{date}', dateLabel);
    var send = $('#btn-send');
    send.textContent = T.send || '';
    send.href = (share.base || 'https://t.me/share/url') +
      '?url=' + encodeURIComponent(share.url || window.location.href) +
      '&text=' + encodeURIComponent(msg);
    tactile(send, { big: true });

    buzz([20, 50, 20, 50, 40]);
    var shots = [[0.5, 0.66], [0.22, 0.6], [0.78, 0.6]];
    shots.forEach(function (s, i) {
      setTimeout(function () {
        burst(W * s[0], H * s[1], {
          count: reduced ? 16 : 46, power: 13, hearts: 0.9,
          size: 1.3, gravity: 0.13, life: 110, up: true
        });
      }, i * 190);
    });
    setTimeout(function () {
      burst(W * 0.5, H * 0.3, { count: reduced ? 10 : 30, power: 9, hearts: 0.95, size: 1.1, gravity: 0.1, life: 100 });
    }, 700);
  }

})();
