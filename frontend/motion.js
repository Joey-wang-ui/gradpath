/* Progressive decoration: readable without animation, quiet when requested. */
const VisualMotion = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const animations = new Set();
  let paused = false;
  let observer;
  let frame = 0;
  let currentCard;
  let currentHero;
  let control;
  try { paused = localStorage.getItem('gradpath-motion') === 'paused'; } catch { /* Opaque previews have no storage. */ }

  const enabled = () => !paused && !reduced.matches;
  function resetPointer() {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const [element, properties] of [
      [currentCard, ['--tilt-x', '--tilt-y']],
      [currentHero, ['--scene-x', '--scene-y']],
    ]) properties.forEach(property => element?.style.removeProperty(property));
    currentCard = currentHero = null;
  }
  function sync() {
    document.documentElement.dataset.motion = enabled() ? 'playing' : 'paused';
    control.disabled = reduced.matches;
    control.setAttribute('aria-pressed', String(!enabled()));
    const label = reduced.matches ? '已跟随系统减少动效' : paused ? '开启动效' : '暂停动效';
    control.setAttribute('aria-label', label);
    control.title = label;
    control.querySelector('span').textContent = reduced.matches ? '静态' : paused ? '动效已暂停' : '动效开启';
    if (!enabled()) {
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      resetPointer();
    }
  }
  function reveal(root) {
    observer?.disconnect();
    animations.forEach(animation => animation.cancel());
    resetPointer();
    if (!enabled() || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      if (!enabled()) return;
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // No hidden CSS state: a failed script can never hide application content.
        const animation = entry.target.animate?.([
          { opacity: .35, translate: '0 18px' },
          { opacity: 1, translate: '0 0' },
        ], { duration: 560, delay: Math.min(index++ * 55, 220), easing: 'cubic-bezier(.16,1,.3,1)' });
        if (animation) {
          animations.add(animation);
          const cleanup = () => animations.delete(animation);
          animation.addEventListener('finish', cleanup, { once: true });
          animation.addEventListener('cancel', cleanup, { once: true });
        }
        observer.unobserve(entry.target);
      }
    }, { threshold: .08 });
    root.querySelectorAll('.stat-card, .school-card, .assistant-card, .deadline-card, .journey-note, .catalog-hero, .profile-card, .profile-aside').forEach(element => observer.observe(element));
  }
  function init() {
    control = document.createElement('button');
    control.className = 'motion-control';
    control.type = 'button';
    control.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path class="motion-pause" d="M7 5v10M13 5v10"/><path class="motion-play" d="m7 4 9 6-9 6Z"/></svg><span></span>';
    document.querySelector('.topbar-actions').prepend(control);
    control.addEventListener('click', () => {
      paused = !paused;
      try { localStorage.setItem('gradpath-motion', paused ? 'paused' : 'playing'); } catch { /* Session-only preference. */ }
      sync();
    });
    reduced.addEventListener('change', sync);
    pointer.addEventListener('change', resetPointer);
    sync();

    document.addEventListener('pointermove', event => {
      if (!enabled() || !pointer.matches || event.pointerType === 'touch') return;
      const card = event.target.closest('.stat-card, .school-card');
      const hero = event.target.closest('.hero');
      if (card !== currentCard || hero !== currentHero) resetPointer();
      currentCard = card;
      currentHero = hero;
      cancelAnimationFrame(frame);
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const element = card || hero;
        if (!element?.isConnected) return;
        const bounds = element.getBoundingClientRect();
        const x = Math.max(-.5, Math.min(.5, (clientX - bounds.left) / bounds.width - .5));
        const y = Math.max(-.5, Math.min(.5, (clientY - bounds.top) / bounds.height - .5));
        if (card) {
          card.style.setProperty('--tilt-x', `${-y * 4}deg`);
          card.style.setProperty('--tilt-y', `${x * 4}deg`);
        } else {
          hero.style.setProperty('--scene-x', `${x * 12}px`);
          hero.style.setProperty('--scene-y', `${y * 10}px`);
        }
      });
    }, { passive: true });
    document.addEventListener('pointerout', event => {
      const element = currentCard || currentHero;
      if (element && !element.contains(event.relatedTarget)) resetPointer();
    }, { passive: true });
    window.addEventListener('blur', resetPointer);
    document.addEventListener('visibilitychange', () => {
      document.documentElement.classList.toggle('motion-sleeping', document.hidden);
      if (document.hidden) resetPointer();
    });
  }
  return { init, reveal };
})();
