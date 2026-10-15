/* ==========================================================
   Home page scroll
   As you scroll, the big name shrinks and slides into the top
   left of the nav, becoming the home button, and the nav
   buttons slide in to fill the space.
   ========================================================== */
(function () {
  var nav = document.querySelector('.site-nav');
  var links = document.querySelector('.nav-links');
  var toggle = document.querySelector('.site-nav .theme-toggle');
  var name = document.querySelector('.intro-name span');
  var tagline = document.querySelector('.intro-tagline');
  var intro = document.querySelector('.intro');
  var below = [document.querySelector('.work'), document.querySelector('.site-footer')];
  var homeLink = document.querySelector('.home-link');

  var m = null;      // measurements, refreshed on resize
  var ticking = false;
  var pinned = false;   // see the Works-button note at the bottom
  // Once the name has docked, the intro is folded away so the top of the page
  // is the docked view: scrolling back up stops there instead of replaying the intro.
  var folded = false;
  function offset() { return folded && m ? m.distance : 0; }
  function jump(y) { window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }); }

  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t * t * (3 - 2 * t); }

  function measure() {
    var virtualY = window.scrollY + offset();   // scroll position as if nothing were folded
    intro.style.marginTop = '';
    name.style.transform = '';
    below.forEach(function (el) { el.style.transform = ''; });
    var vw = window.innerWidth, vh = window.innerHeight;
    var navH = nav.offsetHeight;

    // Centre the name + tagline on the first screen.
    intro.style.paddingTop = '0px';
    intro.style.paddingTop = Math.max(navH + 16, (vh - intro.offsetHeight) / 2) + 'px';

    var y = window.scrollY;
    var r = name.getBoundingClientRect();
    var gutter = parseFloat(getComputedStyle(nav).paddingLeft) || 24;

    // Size of the name once it's in the nav.
    // Never wider than the space left of the nav buttons.
    var endW = Math.min(Math.max(120, Math.min(260, vw * 0.18)), links.offsetLeft - gutter - 12);
    var scale = endW / r.width;

    m = {
      left: r.left,
      top: r.top + y,                                  // position on the page at the top
      scale: scale,
      endLeft: gutter,
      endTop: navH / 2 - (r.height * scale) / 2,
      // Scroll distance over which the move happens: until the tagline sits just under the nav.
      distance: Math.max(120, tagline.getBoundingClientRect().top + y - navH - 24)
    };

    // Keep the work off the first screen: it starts pushed below the fold and
    // catches up while the name docks, so it ends up just under the tagline.
    var workTop = below[0].getBoundingClientRect().top + y;
    m.push = Math.max(0, vh - workTop + 40);

    // Where Works scrolls to: the "Featured work" heading just under the nav.
    var heading = document.querySelector('.work-heading');
    m.workSpot = Math.max(m.distance, heading.getBoundingClientRect().top + y - navH - 24);

    if (folded) {
      intro.style.marginTop = -m.distance + 'px';
      jump(virtualY - m.distance);
    }
  }

  function fold() {
    folded = true;
    var y = window.scrollY;
    intro.style.marginTop = -m.distance + 'px';
    jump(y - m.distance);
  }

  function update() {
    ticking = false;
    if (!m) return;
    if (!folded && window.scrollY >= m.distance) fold();
    var y = window.scrollY + offset();
    var p = clamp(y / m.distance);
    var e = ease(p);

    var s = lerp(1, m.scale, e);
    var x = lerp(m.left, m.endLeft, e) - m.left;
    var top = lerp(m.top - y, m.endTop, e);          // where it should be on screen
    var dy = top - (m.top - y);                      // offset from where scrolling put it
    name.style.transform = 'translate(' + x + 'px,' + dy + 'px) scale(' + s + ')';

    var push = m.push * (1 - e);
    below.forEach(function (el) { el.style.transform = push ? 'translateY(' + push + 'px)' : ''; });

    // Nav buttons and the light/dark icon fill in during the second half of the move.
    var q = clamp((p - 0.45) / 0.55);
    [links, toggle].forEach(function (el) {
      el.style.opacity = q;
      el.style.transform = 'translateX(' + (1 - q) * 32 + 'px)';
      el.classList.toggle('is-on', q > 0.5);
    });
  }

  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  var landing = document.documentElement.dataset.landing || '';

  function refresh() {
    measure();
    if (pinned) jump(Math.ceil((landing === 'home' ? m.distance : m.workSpot) - offset()));
    update();
  }

  // intro.js fires this whenever it re-sizes the type.
  window.addEventListener('intro:fit', refresh);
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('load', refresh);

  // Clicking the name goes back to the top of the page with the nav
  // still in place: the name stays docked and the tagline sits just under the nav.
  function toDocked(e) {
    e.preventDefault();
    window.scrollTo({ top: m ? Math.ceil(m.distance - offset()) : 0, behavior: 'smooth' });
  }
  homeLink.addEventListener('click', toDocked);

  // Works scrolls to the "Featured work" heading, just under the nav.
  document.querySelectorAll('.nav-links a[href="#work"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: m ? Math.ceil(m.workSpot - offset()) : 0, behavior: 'smooth' });
    });
  });

  // Coming from another page's Works button (index.html#work) or name (index.html#home):
  // skip the intro and go straight to "Featured work" or the docked top of the page.
  // Fonts can finish loading a moment later and shift the layout, so stay
  // pinned there until the visitor scrolls themselves.
  if (landing) {
    pinned = true;
    window.addEventListener('intro:done', refresh);
    // The intro can finish before this script runs, so don't rely on the event alone.
    if (document.body.classList.contains('is-ready')) requestAnimationFrame(refresh);
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
      window.addEventListener(ev, function () { pinned = false; }, { passive: true, once: true });
    });
  }

  // ---------- Copy email button ----------
  var copyBtn = document.querySelector('.copy-email');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.dataset.email;
      var label = copyBtn.textContent;
      var done = function () {
        copyBtn.textContent = 'Copied!';
        setTimeout(function () { copyBtn.textContent = label; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, function () { window.location.href = 'mailto:' + email; });
      } else {
        window.location.href = 'mailto:' + email;
      }
    });
  }
})();
