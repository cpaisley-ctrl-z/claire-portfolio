/* ==========================================================
   Shared behaviour for pages other than home:
   light/dark toggle, nav name sizing, copy email button.
   ========================================================== */
(function () {
  var root = document.documentElement;

  // ---------- Light / dark toggle ----------
  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (err) {}
    });
  }

  // ---------- Name in the nav: same size as on the home page ----------
  var logo = document.querySelector('.nav-logo');
  var links = document.querySelector('.nav-links');
  var nav = document.querySelector('.site-nav');
  function fitLogo() {
    if (!logo) return;
    var span = logo.firstElementChild;
    var gutter = parseFloat(getComputedStyle(nav).paddingLeft) || 24;
    logo.style.fontSize = '100px';
    var w = span.offsetWidth || 1;
    var target = Math.min(Math.max(120, Math.min(260, window.innerWidth * 0.18)), links.offsetLeft - gutter - 12);
    logo.style.fontSize = (100 * target / w) + 'px';
  }
  fitLogo();
  window.addEventListener('resize', fitLogo);
  if (document.fonts) {
    document.fonts.ready.then(fitLogo);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitLogo);
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
