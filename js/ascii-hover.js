/* ==========================================================
   ASCII hover on the About photo
   Wherever the mouse moves over the photo, a small circle of it
   turns into ASCII characters, which fade back after a moment.
   ========================================================== */
(function () {
  var box = document.querySelector('.about-photo');
  var img = box && box.querySelector('img');
  if (!img) return;

  // ---- Tweak the feel here ----------------------------------------------
  var RADIUS = 40;          // circle radius around the mouse, in px
  var CELL = 7;             // character height in px
  var CHAR_ASPECT = 0.6;    // character width / height
  var FADE = 650;           // ms for the trail to fade back once the mouse moves on
  var RAMP = ' .:-=+*#%@';  // dark → bright
  // -----------------------------------------------------------------------

  var canvas = document.createElement('canvas');
  canvas.className = 'about-photo-ascii';
  canvas.setAttribute('aria-hidden', 'true');
  box.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var tones = null, toneSize = 0, lo = 0, hi = 255;
  var W = 0, H = 0, cw = 0, cols = 0, rows = 0;
  var active = new Map();   // cell index → time it was last touched
  var running = false;
  var mouse = null;         // mouse position over the photo, or null when it's elsewhere

  // ---------- Brightness of the photo ----------
  function loadTones() {
    // Online: read the photo itself (picks up any new photo automatically).
    try {
      var n = 200, off = document.createElement('canvas');
      off.width = n; off.height = n;
      var c = off.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, 0, 0, n, n);
      var d = c.getImageData(0, 0, n, n).data;
      tones = new Uint8Array(n * n);
      for (var i = 0; i < tones.length; i++) {
        tones[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      }
      toneSize = n;
    } catch (e) {
      // Opened from the folder: browsers block reading pixels, so use the saved copy.
      var saved = window.HEADSHOT_TONES;
      if (!saved) return;
      var bin = atob(saved.data);
      tones = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) tones[j] = bin.charCodeAt(j);
      toneSize = saved.size;
    }
    // Stretch to the full range so the darkest/brightest parts use the whole ramp.
    lo = 255; hi = 0;
    for (var k = 0; k < tones.length; k++) { if (tones[k] < lo) lo = tones[k]; if (tones[k] > hi) hi = tones[k]; }
    if (hi <= lo) hi = lo + 1;
  }

  // The photo is zoomed in a little (--photo-zoom in about.css), so map to match.
  var zoom = parseFloat(getComputedStyle(box).getPropertyValue('--photo-zoom')) || 1;
  function charAt(x, y) {
    var u = 0.5 + (x / W - 0.5) / zoom, v = 0.5 + (y / H - 0.5) / zoom;
    var tx = Math.max(0, Math.min(toneSize - 1, Math.floor(u * toneSize)));
    var ty = Math.max(0, Math.min(toneSize - 1, Math.floor(v * toneSize)));
    var v = (tones[ty * toneSize + tx] - lo) / (hi - lo);
    return RAMP[Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1)))];
  }

  // ---------- Sizing ----------
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.clientWidth; H = box.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cw = CELL * CHAR_ASPECT;
    cols = Math.ceil(W / cw); rows = Math.ceil(H / CELL);
    active.clear();
    ctx.clearRect(0, 0, W, H);
  }

  // ---------- Mouse ----------
  // Mark every cell inside the circle around (mx, my) as freshly touched.
  function touch(mx, my, now) {
    var c0 = Math.max(0, Math.floor((mx - RADIUS) / cw)), c1 = Math.min(cols - 1, Math.floor((mx + RADIUS) / cw));
    var r0 = Math.max(0, Math.floor((my - RADIUS) / CELL)), r1 = Math.min(rows - 1, Math.floor((my + RADIUS) / CELL));
    for (var row = r0; row <= r1; row++) {
      for (var col = c0; col <= c1; col++) {
        var dx = (col + 0.5) * cw - mx, dy = (row + 0.5) * CELL - my;
        if (dx * dx + dy * dy <= RADIUS * RADIUS) active.set(row * cols + col, now);
      }
    }
  }

  function onMove(e) {
    if (!tones) return;
    var r = box.getBoundingClientRect();
    mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    touch(mouse.x, mouse.y, performance.now());
    if (!running) { running = true; requestAnimationFrame(draw); }
  }

  function draw(now) {
    // The circle under a resting mouse stays; only the trail behind it fades.
    if (mouse) touch(mouse.x, mouse.y, now);
    var styles = getComputedStyle(document.documentElement);
    var bg = styles.getPropertyValue('--bg').trim() || '#000';
    var fg = styles.getPropertyValue('--fg').trim() || '#fff';
    ctx.clearRect(0, 0, W, H);
    ctx.font = CELL + 'px "SFMono-Regular", Menlo, Consolas, monospace';
    ctx.textBaseline = 'top';
    active.forEach(function (t, idx) {
      var age = now - t;
      if (age >= FADE) { active.delete(idx); return; }
      var col = idx % cols, row = (idx - col) / cols;
      var x = col * cw, y = row * CELL;
      ctx.globalAlpha = 1 - age / FADE;
      ctx.fillStyle = bg;
      ctx.fillRect(x, y, cw + 0.5, CELL + 0.5);
      ctx.fillStyle = fg;
      ctx.fillText(charAt(x + cw / 2, y + CELL / 2), x, y);
    });
    ctx.globalAlpha = 1;
    if (active.size) requestAnimationFrame(draw);
    else running = false;
  }

  function start() { loadTones(); resize(); }
  if (img.complete && img.naturalWidth) start();
  else img.addEventListener('load', start);
  window.addEventListener('resize', resize);
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerleave', function () { mouse = null; });
})();
