/* ==========================================================
   Light / dark theme, kept the same on every page.
   Loaded in <head> so the page never flashes the wrong theme.
   The choice is saved in localStorage. When the site is opened
   straight from disk (file://), some browsers like Safari keep
   localStorage separate per file, so links to other pages also
   carry the theme in the address (?theme=light).
   ========================================================== */
(function () {
  var root = document.documentElement;
  var t = null;
  try { t = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') {
    try { t = localStorage.getItem('theme'); } catch (e) {}
  }
  if (t === 'light' || t === 'dark') root.dataset.theme = t;

  if (location.protocol !== 'file:') return;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    var href = a.getAttribute('href');
    if (/^(?:[a-z]+:|\/\/|#)/i.test(href)) return;   // other sites, email, same page
    var url = new URL(a.href);
    url.searchParams.set('theme', root.dataset.theme);
    a.href = url.href;
  }, true);
})();
