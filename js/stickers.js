/* ==========================================================
   Footer sticker sheet
   Pick a sticker up off the paper and drop it anywhere on the page.
   The paper keeps a white outline where it was. Reset sends every
   sticker back. Hovering a sticker peels up its bottom-right corner.
   ========================================================== */
(function () {
  var sheet = document.querySelector('.sticker-sheet');
  if (!sheet) return;

  // ---- Tweak the feel here ----------------------------------------------
  var PEEL = 0.2;          // how far the corner peels, as a share of the sticker's size
  var PEEL_MS = 180;       // peel animation length
  var RETURN_MS = 550;     // how long Reset takes to fly stickers home
  var SNAP = 28;           // drop this close to its spot and it sticks back on the paper
  // -----------------------------------------------------------------------

  // Stickers that leave the paper live in this layer, which spans the whole page.
  var layer = document.createElement('div');
  layer.className = 'sticker-layer';
  document.body.appendChild(layer);

  var stickers = Array.prototype.slice.call(sheet.querySelectorAll('.sticker'));
  var topZ = 1;

  // ---------- Peeling corner ----------
  // The art loses a triangle off its bottom-right corner, and a white
  // "back of the sticker" flap is folded over the cut. data-e is how far
  // the artwork reaches towards that corner (max x + y of its opaque
  // pixels, at its natural size), so round stickers peel too.
  stickers.forEach(function (s) {
    var art = s.querySelector('.sticker-art');
    var flap = document.createElement('span');
    flap.className = 'sticker-flap';
    var back = art.cloneNode();
    back.className = 'sticker-back';
    back.alt = '';
    flap.appendChild(back);
    s.appendChild(flap);
    // White die-cut outline behind the art, seen once the corner lifts.
    var under = art.cloneNode();
    under.className = 'sticker-under';
    under.alt = '';
    s.insertBefore(under, art);
    s._peel = 0;
    s._target = 0;
  });

  function drawPeel(s) {
    var art = s.querySelector('.sticker-art');
    var back = s.querySelector('.sticker-back');
    if (s._peel <= 0.001) {
      art.style.webkitMaskImage = art.style.maskImage = '';
      back.style.visibility = 'hidden';
      back.style.transform = '';
      s.classList.remove('is-peeling');
      return;
    }
    var w = s.offsetWidth, h = s.offsetHeight;
    var scale = w / parseFloat(s.dataset.w);
    var edge = parseFloat(s.dataset.e) * scale;          // furthest reach of the art along x + y
    var depth = s._peel * PEEL * Math.min(w, h) * 1.4;   // how much of that is folded back
    var c = edge - depth;                                // fold line: x + y = c
    var stop = (c / Math.SQRT2) + 'px';
    var keep = 'linear-gradient(135deg, #000 ' + stop + ', transparent ' + stop + ')';
    var cut = 'linear-gradient(135deg, transparent ' + stop + ', #000 ' + stop + ')';
    art.style.webkitMaskImage = art.style.maskImage = keep;
    back.style.webkitMaskImage = back.style.maskImage = cut;
    // Mirror the cut-off corner across the fold line.
    back.style.transform = 'translate(' + c + 'px,' + c + 'px) matrix(0,-1,-1,0,0,0)';
    back.style.visibility = 'visible';
    s.classList.add('is-peeling');
  }

  function animatePeel(s, to) {
    s._target = to;
    if (s._anim) return;
    var last = performance.now();
    s._anim = true;
    (function step(now) {
      var dt = (now - last) / PEEL_MS; last = now;
      s._peel += (s._target > s._peel ? 1 : -1) * dt;
      if ((s._target === 1 && s._peel >= 1) || (s._target === 0 && s._peel <= 0)) {
        s._peel = s._target; s._anim = false; drawPeel(s); return;
      }
      drawPeel(s);
      requestAnimationFrame(step);
    })(last);
  }

  stickers.forEach(function (s) {
    s.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && !s.classList.contains('is-dragging')) animatePeel(s, 1); });
    s.addEventListener('pointerleave', function () { animatePeel(s, 0); });
  });

  // ---------- Picking up and dropping ----------
  function slotRect(s) {
    var r = s._slot.getBoundingClientRect();
    return { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height };
  }

  function onSheet(s) { return s.parentNode === s._slot; }

  function liftOff(s) {
    var r = s.getBoundingClientRect();
    s.style.width = r.width + 'px';
    s.style.left = (r.left + window.scrollX) + 'px';
    s.style.top = (r.top + window.scrollY) + 'px';
    layer.appendChild(s);
    s._slot.classList.add('is-empty');      // shows the white outline left on the paper
  }

  function putBack(s) {
    s._slot.appendChild(s);
    s.style.left = s.style.top = s.style.width = s.style.transform = s.style.zIndex = '';
    s.style.setProperty('--tilt', '0deg');
    s._slot.classList.remove('is-empty');
  }

  stickers.forEach(function (s) {
    s._slot = s.parentNode;
    var start = null;

    s.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      if (onSheet(s)) liftOff(s);
      s.style.zIndex = ++topZ;
      start = { x: e.pageX, y: e.pageY, left: parseFloat(s.style.left), top: parseFloat(s.style.top) };
      s.classList.add('is-dragging');
      animatePeel(s, 0);
      s.setPointerCapture(e.pointerId);
    });

    s.addEventListener('pointermove', function (e) {
      if (!start) return;
      // Keep stickers on the page so they never cause sideways scrolling.
      var maxX = document.documentElement.clientWidth - s.offsetWidth - 8;
      var maxY = document.documentElement.scrollHeight - s.offsetHeight;
      s.style.left = Math.max(0, Math.min(maxX, start.left + e.pageX - start.x)) + 'px';
      s.style.top = Math.max(0, Math.min(maxY, start.top + e.pageY - start.y)) + 'px';
    });

    function drop() {
      if (!start) return;
      start = null;
      s.classList.remove('is-dragging');
      var home = slotRect(s);
      if (Math.abs(parseFloat(s.style.left) - home.left) < SNAP && Math.abs(parseFloat(s.style.top) - home.top) < SNAP) {
        putBack(s);
      } else {
        s.style.setProperty('--tilt', (Math.random() * 12 - 6).toFixed(1) + 'deg');
      }
    }
    s.addEventListener('pointerup', drop);
    s.addEventListener('pointercancel', drop);
  });

  // ---------- Reset: every sticker flies back to its spot ----------
  var reset = sheet.querySelector('.sticker-reset');
  reset.addEventListener('click', function () {
    stickers.forEach(function (s) {
      if (onSheet(s)) return;
      var home = slotRect(s);
      s.classList.add('is-returning');
      s.style.setProperty('--tilt', '0deg');
      s.style.left = home.left + 'px';
      s.style.top = home.top + 'px';
      setTimeout(function () { s.classList.remove('is-returning'); putBack(s); }, RETURN_MS);
    });
  });
})();
