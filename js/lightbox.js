// Click any case study photo to see it large, with its caption.
(function () {
  const images = document.querySelectorAll('.case-figure img, .case-hero-media img');
  if (!images.length) return;

  const box = document.createElement('dialog');
  box.className = 'lightbox';
  box.setAttribute('aria-label', 'Enlarged image');
  box.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">&times;</button><img alt=""><p></p>';
  document.body.appendChild(box);
  const big = box.querySelector('img');
  const caption = box.querySelector('p');

  function open(img) {
    const fig = img.closest('figure');
    const cap = fig && fig.querySelector('figcaption');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    caption.textContent = cap ? cap.textContent.trim() : '';
    box.showModal();
  }

  images.forEach((img) => {
    img.tabIndex = 0;
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  });

  // Any click closes it; Esc is handled by the dialog itself.
  box.addEventListener('click', () => box.close());
  box.addEventListener('close', () => { big.removeAttribute('src'); });
})();
