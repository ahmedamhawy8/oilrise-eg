/* OilRise Petroleum Services: site behaviours (no dependencies) */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var all = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var shown = function (el) { var r = el.getBoundingClientRect(); return r.width > 0 || r.height > 0; };
  var feet = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

  /* One scroll loop for everything that follows the reader's position ------- */
  var tasks = [];
  var queued = false;
  function run() {
    queued = false;
    var vh = window.innerHeight;
    var y = window.pageYOffset || root.scrollTop || 0;
    for (var i = 0; i < tasks.length; i++) tasks[i](vh, y);
  }
  function queue() { if (!queued) { queued = true; window.requestAnimationFrame(run); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
  window.OilRiseRefresh = queue;

  /* Header: solid once the page moves, full-screen menu on small screens ---- */
  var headers = all('.hdr');
  function closeMenus() {
    headers.forEach(function (h) {
      h.classList.remove('is-open');
      var b = h.querySelector('.burger');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    root.classList.remove('nav-open');
  }
  headers.forEach(function (h) {
    var burger = h.querySelector('.burger');
    var nav = h.querySelector('.nav');
    if (!burger || !nav) return;
    burger.addEventListener('click', function () {
      var open = !h.classList.contains('is-open');
      closeMenus();
      if (open) {
        h.classList.add('is-open');
        burger.setAttribute('aria-expanded', 'true');
        root.classList.add('nav-open');
      }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) closeMenus(); });
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });
  window.OilRiseCloseMenus = closeMenus;
  tasks.push(function (vh, y) {
    for (var i = 0; i < headers.length; i++) headers[i].classList.toggle('is-stuck', y > 24);
  });

  /* In-page links scroll instead of changing the address -------------------- */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-scroll]') : null;
    if (!a) return;
    var smooth = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    var key = a.getAttribute('data-scroll');
    if (key === 'top') { e.preventDefault(); window.scrollTo({ top: 0, behavior: smooth }); return; }
    var id = (a.getAttribute('href') || '').split('#')[1];
    var target = id ? doc.getElementById(id) : null;
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: smooth, block: 'start' }); }
  });

  /* Hero rings turn as the page is scrolled, like making up a connection ---- */
  all('[data-hero]').forEach(function (hero) {
    var art = hero.querySelector('.hero-art');
    tasks.push(function (vh, y) {
      if (!shown(hero)) return;
      var r = hero.getBoundingClientRect();
      var near = r.bottom > -100 && r.top < vh;
      hero.classList.toggle('is-near', near);
      if (near && art) art.style.setProperty('--rot', (y / 9).toFixed(2));
    });
  });

  /* The well: each stage the reader passes adds its part to the schematic --- */
  var stageName = { casing: 'Casing', wellhead: 'Wellhead', tubing: 'Tubing', pump: 'Rod pump', rods: 'Sucker rods', unit: 'Pumping unit' };
  all('[data-well]').forEach(function (well) {
    var svg = well.querySelector('.schem');
    if (!svg) return;
    var stations = all('.stn', well);
    var parts = {};
    all('[data-part]', svg).forEach(function (g) { parts[g.getAttribute('data-part')] = g; });
    var clips = {};
    all('[data-clip]', svg).forEach(function (r) { clips[r.getAttribute('data-clip')] = r; });
    var outStage = well.querySelector('[data-stage]');
    var outDepth = well.querySelector('[data-depth]');
    var lastActive = null;

    tasks.push(function (vh) {
      if (!shown(well)) return;
      var box = well.getBoundingClientRect();
      if (box.bottom < -vh || box.top > vh * 2) return;

      var t = { casing: 0, wellhead: 0, tubing: 0, pump: 0, rods: 0, unit: 0 };
      var focus = vh * 0.6;
      var active = null;
      stations.forEach(function (s) {
        var b = s.getBoundingClientRect();
        var key = s.getAttribute('data-stn');
        if (key) t[key] = clamp((vh * 0.74 - b.top) / (b.height * 0.7), 0, 1);
        var on = b.top <= focus && b.bottom > focus;
        s.classList.toggle('is-active', on);
        if (on) { s.classList.add('is-seen'); active = key || 'end'; }
      });

      // Hole is drilled and cased from the top down
      clips.hole.setAttribute('height', (800 * t.casing).toFixed(1));
      svg.style.setProperty('--wh', t.wellhead.toFixed(3));
      clips.tbg.setAttribute('height', (716 * t.tubing).toFixed(1));
      svg.style.setProperty('--pm', clamp(t.pump * 1.6, 0, 1).toFixed(3));
      clips.rod.setAttribute('height', (724 * t.rods).toFixed(1));
      svg.style.setProperty('--un', clamp(t.unit / 0.5, 0, 1).toFixed(3));

      // Unit starts: the beam nods and oil rises up the tubing
      var live = t.unit > 0.55;
      var oil = clamp((t.unit - 0.55) / 0.45, 0, 1);
      svg.classList.toggle('is-live', live);
      var h = 744 * oil;
      clips.oil.setAttribute('y', (864 - h).toFixed(1));
      clips.oil.setAttribute('height', h.toFixed(1));

      // Highlight the part being run, and move the depth marker with it
      var partKey = active === 'end' ? 'unit' : active;
      if (partKey !== lastActive) {
        Object.keys(parts).forEach(function (k) { parts[k].classList.toggle('on', k === partKey); });
        lastActive = partKey;
      }
      var stage = 'Ground level';
      var depth = 0;
      var cy = 150;
      var cursor = 0;
      if (active === 'casing') { stage = stageName.casing; depth = 8000 * t.casing; cy = 150 + 800 * t.casing; cursor = 1; }
      else if (active === 'wellhead') { stage = stageName.wellhead; depth = 0; }
      else if (active === 'tubing') { stage = stageName.tubing; depth = 7150 * t.tubing; cy = 150 + 716 * t.tubing; cursor = 1; }
      else if (active === 'pump') { stage = stageName.pump; depth = 7000; cy = 834; cursor = 1; }
      else if (active === 'rods') { stage = stageName.rods; depth = 7000 * t.rods; cy = 86 + 724 * t.rods; cursor = t.rods > 0.1 ? 1 : 0; }
      else if (active === 'unit' || active === 'end') {
        stage = live ? (oil >= 1 ? 'On production' : 'Oil rising') : stageName.unit;
        depth = live ? 7000 * (1 - oil) : 0;
      } else if (stations.length && stations[0].getBoundingClientRect().top < focus) {
        stage = 'On production';
      }
      svg.style.setProperty('--cy', cy.toFixed(1));
      svg.style.setProperty('--co', cursor);
      if (outStage && outStage.textContent !== stage) outStage.textContent = stage;
      var d = feet(depth);
      if (outDepth && outDepth.textContent !== d) outDepth.textContent = d;
    });
  });

  /* On production: a beam pumping unit drawn as a true four-bar linkage ------
     crank -> pitman -> walking beam -> horsehead -> polished rod. The sun comes
     up behind it as the reader arrives; oil moves down the flowline on the
     upstroke only, as it does on a real well. */
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  all('[data-live]').forEach(function (live) {
    var svg = live.querySelector('.unit');
    if (!svg) return;
    var beam = svg.querySelector('.u-beam'), crank = svg.querySelector('.u-crank'), pit = svg.querySelector('.u-pit');
    var wire = svg.querySelector('.u-wire'), mv = svg.querySelector('.u-mv'), flow = svg.querySelector('.u-flow'), sun = svg.querySelector('.u-sun');
    var out = live.querySelector('[data-spm-out]');
    var S = { x: 240, y: 150 }, C = { x: 140, y: 256 }, R = 30, L = 106, A = 110, B = 140;
    var spm = 8, th = -1.2, last = 0, prev = null, off = 0, running = false, raf = 0;

    function pose(dt) {
      th += dt * spm * 2 * Math.PI / 60;
      var px = C.x + R * Math.cos(th), py = C.y + R * Math.sin(th);
      var dx = px - S.x, dy = py - S.y, dist = Math.sqrt(dx * dx + dy * dy);
      var k = (A * A - L * L + dist * dist) / (2 * dist);
      var h = Math.sqrt(Math.max(0, A * A - k * k));
      var ux = dx / dist, uy = dy / dist;
      var bx = S.x + k * ux, by = S.y + k * uy;
      var t1x = bx - h * uy, t1y = by + h * ux, t2x = bx + h * uy, t2y = by - h * ux;
      var tx = t1x < t2x ? t1x : t2x, ty = t1x < t2x ? t1y : t2y;   // equalizer end of the beam
      var phi = Math.atan2(S.y - ty, S.x - tx);                      // beam angle
      var d = B * phi;                                               // polished rod travel
      beam.setAttribute('transform', 'rotate(' + (phi * 180 / Math.PI).toFixed(3) + ' 240 150)');
      crank.setAttribute('transform', 'rotate(' + (th * 180 / Math.PI).toFixed(2) + ' 140 256)');
      pit.setAttribute('x1', px.toFixed(2)); pit.setAttribute('y1', py.toFixed(2));
      pit.setAttribute('x2', tx.toFixed(2)); pit.setAttribute('y2', ty.toFixed(2));
      wire.setAttribute('y2', (210 + d).toFixed(2));
      mv.setAttribute('transform', 'translate(0 ' + d.toFixed(2) + ')');
      if (prev !== null && d < prev) { off -= (prev - d) * 2.2; flow.style.strokeDashoffset = off.toFixed(1); }
      prev = d;
    }
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      pose(dt);
      raf = window.requestAnimationFrame(frame);
    }
    function start() { if (running || still) return; running = true; last = window.performance.now(); raf = window.requestAnimationFrame(frame); }
    function stop() { if (!running) return; running = false; window.cancelAnimationFrame(raf); }
    pose(0);

    all('[data-spm]', live).forEach(function (b) {
      b.addEventListener('click', function () {
        spm = clamp(spm + Number(b.getAttribute('data-spm')), 4, 12);
        if (out) out.textContent = spm;
        all('[data-spm]', live).forEach(function (x) { x.disabled = (Number(x.getAttribute('data-spm')) < 0 ? spm <= 4 : spm >= 12); });
      });
    });

    tasks.push(function (vh) {
      if (!shown(live)) { stop(); return; }
      var r = live.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) start(); else stop();
      var p = still ? 1 : clamp((vh * 0.98 - r.top) / (Math.min(r.height, vh) * 0.85), 0, 1);
      p = 1 - Math.pow(1 - p, 3);
      if (sun) sun.setAttribute('transform', 'translate(0 ' + ((1 - p) * 236).toFixed(1) + ')');
    });
  });

  /* Product photographs open once, the first time they are reached ----------- */
  all('[data-seen]').forEach(function (el) {
    tasks.push(function (vh) {
      if (el.classList.contains('is-seen') || !shown(el)) return;
      if (el.getBoundingClientRect().top < vh * 0.82) el.classList.add('is-seen');
    });
  });

  /* Pipe band rolls with the scroll ----------------------------------------- */
  all('[data-pipe]').forEach(function (band) {
    var track = band.querySelector('.pipe-track');
    if (!track) return;
    tasks.push(function (vh, y) {
      if (!shown(band)) return;
      var r = band.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var half = track.scrollWidth / 2;
      if (half > 0) track.style.setProperty('--x', (-((y * 0.45) % half)).toFixed(1));
    });
  });

  /* How we work: the flow line fills as the steps are read ------------------- */
  all('[data-flow]').forEach(function (list) {
    var steps = all('li', list);
    tasks.push(function (vh) {
      if (!shown(list)) return;
      var r = list.getBoundingClientRect();
      var p = clamp((vh * 0.78 - r.top) / (r.height + vh * 0.18), 0, 1);
      list.style.setProperty('--fill', p.toFixed(3));
      steps.forEach(function (li, i) { li.classList.toggle('on', p > (i + 0.02) / steps.length); });
    });
  });

  /* Footer wordmark fills from the bottom: oil, rising ------------------------ */
  all('.ftr-word').forEach(function (word) {
    tasks.push(function (vh) {
      if (!shown(word)) return;
      var r = word.getBoundingClientRect();
      var p = clamp((vh - r.top) / (r.height * 1.25), 0, 1);
      word.style.setProperty('--fill', (p * 100).toFixed(1));
    });
  });

  /* Year in the footer -------------------------------------------------------- */
  all('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Quotation form: confirm after the form service sends the reader back ----- */
  all('#form-next').forEach(function (next) {
    next.value = window.location.origin + window.location.pathname + '#sent';
  });
  if (window.location.hash === '#sent') {
    all('.sent').forEach(function (el) { el.classList.add('show'); el.focus(); });
  }

  queue();
})();
