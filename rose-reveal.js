(() => {
  const section = document.getElementById('roseReveal');
  const holder = document.getElementById('roseRevealCards');
  if (!section || !holder) return;

  const palette = [
    ['#d84a4b', -3], ['#bbc7d2', -2], ['#d4a84e', -1],
    ['#f35b22', 0], ['#328df3', 1], ['#24b976', 2], ['#9653d7', 3]
  ];
  palette.forEach(([tone, slot]) => {
    const card = document.createElement('div');
    card.className = `rose-variant${slot === 0 ? ' rose-variant--hero' : ''}`;
    card.style.setProperty('--tone', tone);
    card.style.setProperty('--slot', slot);
    card.style.setProperty('--order', Math.abs(slot));
    card.style.setProperty('--depth', Math.abs(slot));
    card.innerHTML = `<div class="rose-variant__head"><span class="rose-variant__mark"><img src="https://wildroseautomations.ca/logos/wildrose.png" alt=""></span><span class="rose-variant__identity"><strong>Rose</strong><small>AI intake assistant</small></span></div>
      <div class="rose-variant__tabs"><span>Chat</span><span>Voice</span></div>
      <div class="rose-variant__body"><div class="rose-variant__orb"></div>
      <p class="rose-variant__copy">Ready when you are</p>
      <span class="rose-variant__sub">Tap start and speak naturally.</span>
      <span class="rose-variant__cta">Start talking</span></div>`;
    holder.append(card);
  });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let revealTimer;
  let inView = false;
  function onView(entries) {
    const entry = entries[0];
    if (!entry.isIntersecting) {
      inView = false;
      clearTimeout(revealTimer);
      section.classList.remove('expanded');
    } else if (entry.intersectionRatio >= 0.25 && !inView) {
      inView = true;
      if (reduced.matches) section.classList.add('expanded');
      else revealTimer = setTimeout(() => section.classList.add('expanded'), 420);
    }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(onView, {threshold: [0, 0.25]}).observe(section);
  } else section.classList.add('expanded');
})();
