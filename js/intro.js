/* ==========================================================
   ASCII loader
   Renders the name screen as ASCII characters that start as
   noise, sharpen through a few resolutions like an image
   loading, then dissolve into the real typography.
   Click or press any key to skip.
   ========================================================== */
(function () {
  var root = document.documentElement;
  var body = document.body;
  var canvas = document.querySelector('.ascii');
  var ctx = canvas.getContext('2d');
  var nameEl = document.querySelector('.intro-name span');
  var tagEl = document.querySelector('.intro-tagline span');
  var toggle = document.querySelector('.theme-toggle');

  // ---- Tweak the feel here ----------------------------------------------
  var RAMP = ' .:-=+*#%@';        // dark → bright
  var SCRAMBLE = '!<>-_\\/[]{}=+*^?#%@&$01';
  var STEPS = [                    // when each resolution starts (s) and its cell height (px)
    { at: 0.0, cell: 34 },
    { at: 1.2, cell: 22 },
    { at: 2.3, cell: 14 },
    { at: 3.2, cell: 9 }
  ];
  var REVEAL_AT = 4.1;             // ASCII starts fading into the real type
  var DONE_AT = 5.0;               // total length of the intro
  var CHAR_ASPECT = 0.6;           // monospace character width / height
  // -----------------------------------------------------------------------

  var W = 0, H = 0, dpr = 1;
  var source = null;               // brightness of the target screen, 1 value per CSS px
  var grids = [];                  // one sampled grid per step
  var start = 0, skipped = false, finished = false, revealed = false;

  // ---------- Light / dark toggle ----------
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    var next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (err) {}
  });

  // ---------- Size the type to match the design ----------
  function fitType() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var name = nameEl.parentNode, tag = tagEl.parentNode;

    // Name: fill ~89% of the width, never taller than ~42% of the screen.
    name.style.fontSize = '100px';
    var nameW = nameEl.offsetWidth || 1;   // offsetWidth ignores the scroll transform
    var nameSize = Math.min(100 * vw * (vw <= 700 ? 0.92 : 0.89) / nameW, vh * 0.42);
    name.style.fontSize = nameSize + 'px';

    // Tagline: one line at ~79% of the width, like the design. If that
    // would make it too small to read, let it wrap at a readable size.
    tag.style.whiteSpace = 'nowrap';
    tag.style.fontSize = '100px';
    var tagW = tagEl.getBoundingClientRect().width || 1;
    var tagSize = Math.min(100 * vw * 0.79 / tagW, nameSize * 0.24);
    if (tagSize < 20) {
      tagSize = Math.min(24, Math.max(17, vw * 0.055));
      tag.style.whiteSpace = 'normal';
    }
    tag.style.fontSize = tagSize + 'px';
    window.dispatchEvent(new Event('intro:fit'));
  }

  // ---------- Paint the target screen offscreen and read its brightness ----------
  function wrapLines(c, text, maxW) {
    var words = text.split(' '), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (line && c.measureText(test).width > maxW) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawEl(c, el) {
    var cs = getComputedStyle(el.parentNode);
    var size = parseFloat(cs.fontSize);
    c.font = cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    var m = c.measureText(el.textContent);
    var asc = m.fontBoundingBoxAscent || size * 0.8;
    var desc = m.fontBoundingBoxDescent || size * 0.2;
    var rects = el.getClientRects();
    var box = el.parentNode.getBoundingClientRect();
    var lines = rects.length > 1 ? wrapLines(c, el.textContent, box.width) : [el.textContent];
    for (var i = 0; i < lines.length; i++) {
      var r = rects[Math.min(i, rects.length - 1)];
      // Line boxes are font-ascent + descent tall, so this lands on the real baseline.
      c.fillText(lines[i], box.left + box.width / 2, r.top + (r.height - asc - desc) / 2 + asc);
    }
  }

  function sampleSource() {
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    var c = off.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff';
    drawEl(c, nameEl);
    drawEl(c, tagEl);
    var data = c.getImageData(0, 0, W, H).data;
    source = new Uint8Array(W * H);
    for (var i = 0, j = 0; j < source.length; i += 4, j++) source[j] = data[i];
  }

  // Average brightness of a cell, from a 4x4 set of sample points.
  function cellValue(x0, y0, cw, ch) {
    var sum = 0, n = 0;
    for (var sy = 0; sy < 4; sy++) {
      var y = Math.min(H - 1, Math.floor(y0 + (sy + 0.5) * ch / 4));
      for (var sx = 0; sx < 4; sx++) {
        var x = Math.min(W - 1, Math.floor(x0 + (sx + 0.5) * cw / 4));
        sum += source[y * W + x]; n++;
      }
    }
    return sum / n / 255;
  }

  function buildGrids() {
    // Smaller screens get finer characters so the name stays readable.
    var scale = Math.max(0.45, Math.min(1.2, W / 1440));
    grids = STEPS.map(function (step, s) {
      var ch = step.cell * scale, cw = ch * CHAR_ASPECT;
      var cols = Math.ceil(W / cw), rows = Math.ceil(H / ch);
      var end = s + 1 < STEPS.length ? STEPS[s + 1].at : REVEAL_AT;
      var cells = [];
      for (var r = 0; r < rows; r++) {
        for (var col = 0; col < cols; col++) {
          var v = cellValue(col * cw, r * ch, cw, ch);
          var target = v < 0.04 ? 0 : Math.min(RAMP.length - 1, 1 + Math.floor(v * (RAMP.length - 1)));
          // Cells settle in a soft left-to-right sweep with some randomness.
          var span = (end - step.at) * 0.7;
          var lock = step.at + 0.1 + (col / cols) * span * 0.6 + Math.random() * span * 0.4;
          cells.push({ x: col * cw, y: r * ch, target: target, lock: lock, rnd: Math.random() });
        }
      }
      return { cell: ch, cw: cw, cells: cells };
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fitType();
    if (!finished) { sampleSource(); buildGrids(); }
  }

  // ---------- Animation ----------
  function stepIndex(t) {
    var i = 0;
    while (i + 1 < STEPS.length && t >= STEPS[i + 1].at) i++;
    return i;
  }

  function frame(now) {
    if (finished) return;
    var t = (now - start) / 1000;
    if (skipped) t = Math.max(t, REVEAL_AT);

    var grid = grids[stepIndex(t)];
    var fg = getComputedStyle(root).getPropertyValue('--fg').trim() || '#fff';
    var tick = Math.floor(t * 18);          // how often scrambled characters change
    var noise = Math.max(0, 0.06 * (1 - t / 2.5)); // sparse static that clears over time

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = fg;
    ctx.font = grid.cell + 'px "SFMono-Regular", Menlo, Consolas, monospace';
    ctx.textBaseline = 'top';

    var cells = grid.cells;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i], ch;
      if (t >= c.lock) {
        if (!c.target) continue;
        ch = RAMP[c.target];
      } else {
        var r = Math.sin(i * 12.9898 + tick * 78.233 + c.rnd * 43.1) * 43758.5453;
        r = r - Math.floor(r);
        if (c.target) ch = SCRAMBLE[Math.floor(r * SCRAMBLE.length)];
        else if (r < noise) ch = RAMP[1 + Math.floor(r / noise * 3)];
        else continue;
      }
      ctx.fillText(ch, c.x, c.y);
    }

    if (t >= REVEAL_AT && !revealed) {
      revealed = true;
      body.classList.add('is-revealing');
      body.classList.remove('is-loading');
    }
    if (t >= (skipped ? REVEAL_AT + 0.9 : DONE_AT)) return finish();
    requestAnimationFrame(frame);
  }

  function finish() {
    finished = true;
    body.classList.remove('is-loading', 'is-revealing');
    body.classList.add('is-ready');
    canvas.remove();
    window.dispatchEvent(new Event('intro:done'));
  }

  function skip() { if (!revealed) { skipped = true; start = performance.now() - REVEAL_AT * 1000; } }

  // ---------- Start once fonts are ready ----------
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fontsReady = document.fonts && document.fonts.load
    ? Promise.all([
        document.fonts.load('900 100px "Respira"'),
        document.fonts.load('700 40px "Publico Text"', 'I do all things')
      ]).catch(function () {})
    : Promise.resolve();
  // Never wait more than 1.5s on fonts.
  var timeout = new Promise(function (res) { setTimeout(res, 1500); });

  // Arriving from another page's Works button (index.html#work) or name (index.html#home)?
  // Remember where to land and drop the hash so the browser doesn't jump;
  // home.js scrolls there instead.
  var landing = location.hash === '#work' ? 'work' : location.hash === '#home' ? 'home' : '';
  var fromWorks = !!landing;
  if (landing) {
    root.dataset.landing = landing;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  // Always start at the top so the ASCII lines up with the name.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  Promise.race([fontsReady, timeout]).then(function () {
    var refit = function () { if (!finished) resize(); else fitType(); };
    window.addEventListener('resize', refit);
    // If a font finishes loading late, re-measure so nothing overflows.
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refit);
    // Skip the ASCII for reduced motion, or when arriving from another page's nav.
    if (reduced || fromWorks) { fitType(); finish(); return; }
    resize();
    window.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });
    start = performance.now();
    requestAnimationFrame(frame);
  });
})();
