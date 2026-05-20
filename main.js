/* ============================================================
   Hero slideshow — cycle through clinic photos
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;

  // Build the slide list. First 21 are .jpg, last 7 are .png.
  const heroSlides = Array.from({ length: 28 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    const ext = i < 21 ? 'jpg' : 'png';
    return `images/hero/clinic-${n}.${ext}`;
  });

  const SLIDE_MS = 4000;  // how long each slide is shown
  const FADE_MS = 1500;   // crossfade duration (matches CSS transition)

  const slides = heroSlides.map((src, i) => {
    const div = document.createElement('div');
    div.className = 'hero-slide';
    if (i < 3) {
      // Eagerly load the first 3 to avoid flash on initial cycles
      div.style.backgroundImage = `url('${src}')`;
    } else {
      div.dataset.src = src;
    }
    heroBg.appendChild(div);
    return div;
  });

  const ensureLoaded = (i) => {
    const s = slides[i];
    if (s && s.dataset.src) {
      s.style.backgroundImage = `url('${s.dataset.src}')`;
      delete s.dataset.src;
    }
  };

  let current = 0;
  slides[0].classList.add('is-active');

  setInterval(() => {
    const next = (current + 1) % slides.length;
    ensureLoaded(next);
    ensureLoaded((next + 1) % slides.length); // pre-warm the one after
    slides[next].classList.add('is-active');
    const previous = current;
    setTimeout(() => slides[previous].classList.remove('is-active'), FADE_MS + 100);
    current = next;
  }, SLIDE_MS);
});

// Sticky nav: switch to solid on scroll
const nav = document.getElementById('nav');
const onScroll = () => {
  if (window.scrollY > 40) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => navLinks.classList.remove('open'))
  );
}

/* ============================================================
   Glassmorphism interactions: cursor glow + click ripple
   ============================================================ */

const isFinePointer = window.matchMedia('(pointer: fine)').matches;

if (isFinePointer) {
  // Soft gold spotlight that lags behind the cursor
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let gx = mx, gy = my;
  let active = false;

  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    if (!active) { active = true; glow.classList.add('is-visible'); }
  });
  window.addEventListener('mouseleave', () => { active = false; glow.classList.remove('is-visible'); });

  const tick = () => {
    gx += (mx - gx) * 0.14;
    gy += (my - gy) * 0.14;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    requestAnimationFrame(tick);
  };
  tick();

  // Press feedback
  window.addEventListener('mousedown', () => glow.classList.add('is-pressed'));
  window.addEventListener('mouseup', () => glow.classList.remove('is-pressed'));
}

// Click ripple — soft gold concentric burst at the click point
window.addEventListener('click', e => {
  if (e.target.closest('input, textarea, select')) return;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = e.pageX + 'px';
  ripple.style.top = e.pageY + 'px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 900);
});

/* Scroll-in reveal — per-element with staggered delays */
const reveal = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in-view');
      reveal.unobserve(en.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });

const revealSelector = [
  '.section-head',
  '.eyebrow', 'h2', 'h3', '.lead', '.doc-en',
  '.pill-list', '.credential-list', '.kv-grid',
  '.service-card', '.review',
  '.contact-grid > div', '.contact-form',
  '.doctor-portrait', '.signature-visual',
  '.col > .btn', '.col > p', '.link-arrow',
  '.article-card', '.journal-more'
].join(', ');

document.querySelectorAll('.section').forEach(section => {
  const all = Array.from(section.querySelectorAll(revealSelector));
  // Drop matches that live inside another matched element (avoid double reveal)
  const top = all.filter(el => !all.some(other => other !== el && other.contains(el)));
  top.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', (i * 0.08) + 's');
    reveal.observe(el);
  });
});

/* Footer reveal too */
document.querySelectorAll('.footer-col, .footer-bottom').forEach((el, i) => {
  el.classList.add('reveal');
  el.style.setProperty('--reveal-delay', (i * 0.06) + 's');
  reveal.observe(el);
});

/* Hero parallax — content drifts up + fades as you scroll past the hero */
const heroContent = document.querySelector('.hero-content');
const heroSection = document.querySelector('.hero');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (heroContent && heroSection && !reduceMotion) {
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    const h = heroSection.offsetHeight;
    if (y < h * 1.2) {
      const shift = y * 0.28;
      const fade = Math.max(0, 1 - y / (h * 0.85));
      heroContent.style.setProperty('--hero-shift', shift + 'px');
      heroContent.style.setProperty('--hero-fade', fade);
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}

/* Active nav link based on current section in view */
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      const id = '#' + en.target.id;
      navItems.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === id);
      });
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => sectionObserver.observe(s));

/* ============================================================
   Journal — load articles from articles.json (managed by Decap CMS)
   ============================================================ */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

fetch('articles.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(data => {
    const grid = document.getElementById('articleGrid');
    if (!grid || !data || !Array.isArray(data.items)) return;

    const articles = [...data.items]
      .filter(a => a && a.title)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 6);

    if (!articles.length) {
      grid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;">ยังไม่มีบทความ — เพิ่มได้ที่ /admin</p>';
      return;
    }

    grid.innerHTML = articles.map((a, i) => {
      const variant = ((i % 3) + 1);
      const media = a.image
        ? `<img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" loading="lazy" />`
        : `<span class="article-media-letter">${escapeHtml(a.letter || 'A')}</span>`;
      return `
        <article class="article-card">
          <div class="article-media article-media-${variant}" aria-hidden="true">${media}</div>
          <div class="article-body">
            <p class="article-meta">${escapeHtml(a.category || '')}${a.read_time ? ' · ' + escapeHtml(a.read_time) : ''}</p>
            <h3>${escapeHtml(a.title)}</h3>
            <p>${escapeHtml(a.excerpt || '')}</p>
            <a href="#" class="link-arrow">Read article →</a>
          </div>
        </article>
      `;
    }).join('');

    // Apply staggered reveal to the freshly-rendered cards
    grid.querySelectorAll('.article-card').forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', (i * 0.08) + 's');
      try { reveal.observe(el); } catch (e) { /* observer not in scope */ }
    });
  })
  .catch(err => console.warn('Failed to load articles.json:', err));

/* Floating quick-contact buttons — fade in after scrolling past hero */
const fab = document.getElementById('fab');
if (fab) {
  const toggleFab = () => {
    if (window.scrollY > window.innerHeight * 0.6) fab.classList.add('is-visible');
    else fab.classList.remove('is-visible');
  };
  window.addEventListener('scroll', toggleFab, { passive: true });
  toggleFab();
}
