/* ============================================================
   Hero slideshow — cycle through clinic photos
   Slide list editable via Decap CMS (_data/hero_slides.json)
   ============================================================ */
window.addEventListener('DOMContentLoaded', async () => {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;

  // Default hardcoded list as fallback (matches /images/hero/clinic-01.jpg … clinic-28.png)
  const fallbackSlides = Array.from({ length: 28 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    const ext = i < 21 ? 'jpg' : 'png';
    return `images/hero/clinic-${n}.${ext}`;
  });

  // Try to load slide list from CMS-managed JSON
  let heroSlides = fallbackSlides;
  try {
    const r = await fetch('_data/hero_slides.json', { cache: 'no-cache' });
    if (r.ok) {
      const data = await r.json();
      if (data && Array.isArray(data.items) && data.items.length) {
        const fromJson = data.items
          .map(it => (it && it.image) ? String(it.image).replace(/^\//, '') : null)
          .filter(Boolean);
        if (fromJson.length) heroSlides = fromJson;
        // Store labels for accessibility / debugging
        window._heroLabels = data.items.map(it => (it && (it.label || it.alt)) || '');
      }
    }
  } catch (e) { /* fallback already set */ }

  const SLIDE_MS = 4000;
  const FADE_MS = 1500;

  const slides = heroSlides.map((src, i) => {
    const div = document.createElement('div');
    div.className = 'hero-slide';
    if (i < 3) {
      div.style.backgroundImage = `url('${src}')`;
    } else {
      div.dataset.src = src;
    }
    heroBg.appendChild(div);
    return div;
  });

  if (!slides.length) return;

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
    ensureLoaded((next + 1) % slides.length);
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
   Site content loader — Hero / Doctor / Reviews from JSON
   ============================================================ */
function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
function _nl2br(s) { return _esc(s).replace(/\n/g, '<br/>'); }
function _setText(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.textContent = value;
}
function _setHtml(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.innerHTML = value;
}
function _setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.setAttribute(attr, value);
}

// Hero
fetch('_data/hero.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null)
  .then(d => {
    if (!d) return;
    _setText('heroEyebrow', d.eyebrow);
    if (d.headline_line1 || d.headline_line2) {
      _setHtml('heroHeadline', `${_esc(d.headline_line1 || '')}<br/><em>${_esc(d.headline_line2 || '')}</em>`);
    }
    if (d.lead) _setHtml('heroLead', _nl2br(d.lead));
    _setText('heroCtaPrimary', d.cta_primary_text);
    _setAttr('heroCtaPrimary', 'href', d.cta_primary_url);
    _setText('heroCtaSecondary', d.cta_secondary_text);
  })
  .catch(() => { /* ignore — fallback HTML remains */ });

// Doctors — multi-card grid with popup modal
let _doctorsData = null;
fetch('_data/doctors.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null)
  .then(d => {
    if (!d) return;
    _doctorsData = d;

    _setText('doctorsEyebrow', d.section_eyebrow);
    if (d.section_title_line1 || d.section_title_line2) {
      _setHtml('doctorsTitle', `${_esc(d.section_title_line1 || '')}<br/><em>${_esc(d.section_title_line2 || '')}</em>`);
    }
    _setText('doctorsLead', d.section_lead);

    const grid = document.getElementById('doctorGrid');
    if (!grid || !Array.isArray(d.items)) return;

    grid.innerHTML = d.items.map((doc, i) => `
      <article class="doctor-card" data-doc-index="${i}" role="button" tabindex="0" aria-label="ดูรายละเอียด ${_esc(doc.name_th || doc.name_en || '')}">
        <div class="doctor-card-photo">
          ${doc.photo ? `<img src="${_esc(doc.photo)}" alt="${_esc(doc.name_th || doc.name_en || '')}" loading="lazy" />` : ''}
        </div>
        <div class="doctor-card-body">
          <p class="doctor-card-title">${_esc(doc.title || '')}</p>
          <h3 class="doctor-card-name">${_esc(doc.name_th || '')}</h3>
          <p class="doctor-card-name-en">${_esc(doc.name_en || '')}</p>
          ${doc.bio_short ? `<p class="doctor-card-bio">${_esc(doc.bio_short)}</p>` : ''}
          <span class="link-arrow">View Profile →</span>
        </div>
      </article>
    `).join('');

    // Card click → open modal
    grid.addEventListener('click', e => {
      const card = e.target.closest('.doctor-card');
      if (!card) return;
      const idx = parseInt(card.dataset.docIndex, 10);
      if (!isNaN(idx)) openDoctorModal(_doctorsData.items[idx]);
    });
    grid.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.doctor-card');
      if (!card) return;
      e.preventDefault();
      const idx = parseInt(card.dataset.docIndex, 10);
      if (!isNaN(idx)) openDoctorModal(_doctorsData.items[idx]);
    });

    // Stagger reveal on cards
    grid.querySelectorAll('.doctor-card').forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', (i * 0.08) + 's');
      try { reveal.observe(el); } catch (e) {}
    });
  })
  .catch(() => { /* ignore */ });

// Doctor modal — open/close
function openDoctorModal(doc) {
  if (!doc) return;
  const modal = document.getElementById('doctorModal');
  const body = document.getElementById('modalBody');
  if (!modal || !body) return;

  const renderList = (arr, title) => {
    if (!Array.isArray(arr) || !arr.length) return '';
    return `
      <div class="modal-list-block">
        <p class="modal-list-title">${_esc(title)}</p>
        <ul class="modal-list">
          ${arr.map(x => `<li>${_esc(x.text || x)}</li>`).join('')}
        </ul>
      </div>
    `;
  };

  let bodyHtml = '';
  try {
    bodyHtml = window.marked ? window.marked.parse(doc.bio_full || '') : `<p>${_esc(doc.bio_full || '')}</p>`;
  } catch (e) { bodyHtml = `<p>${_esc(doc.bio_full || '')}</p>`; }

  body.innerHTML = `
    <div class="modal-header">
      <div class="modal-portrait">
        ${doc.photo ? `<img src="${_esc(doc.photo)}" alt="${_esc(doc.name_th)}" />` : ''}
      </div>
      <div class="modal-headings">
        <p class="modal-title-tag">${_esc(doc.title || '')}</p>
        <h2 class="modal-title">${_esc(doc.name_th || '')}</h2>
        <p class="modal-subtitle">${_esc(doc.name_en || '')}</p>
        ${Array.isArray(doc.specialties) && doc.specialties.length
          ? `<div class="modal-chips">${doc.specialties.map(s => `<span class="modal-chip">${_esc(s.text || s)}</span>`).join('')}</div>`
          : ''}
      </div>
    </div>

    <div class="modal-content">${bodyHtml}</div>

    ${renderList(doc.credentials, 'Credentials')}
    ${renderList(doc.education, 'Education')}
    ${renderList(doc.languages, 'Languages')}

    <div class="modal-footer">
      <a href="https://lin.ee/1i7Qgpv" target="_blank" rel="noopener noreferrer" class="btn btn-primary">นัดหมายปรึกษาผ่าน LINE</a>
    </div>
  `;

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // Focus close button for keyboard users
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.focus();
}

function closeDoctorModal() {
  const modal = document.getElementById('doctorModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Modal close handlers (delegate)
const _modal = document.getElementById('doctorModal');
if (_modal) {
  _modal.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeDoctorModal();
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDoctorModal();
});

// About section
fetch('_data/about.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null)
  .then(d => {
    if (!d) return;
    _setText('aboutEyebrow', d.eyebrow);
    if (d.title_line1 || d.title_line2) {
      _setHtml('aboutTitle', `${_esc(d.title_line1 || '')} <em>${_esc(d.title_line2 || '')}</em>.`);
    }
    _setText('aboutLead', d.lead);
    _setText('aboutBody', d.body);
    if (Array.isArray(d.pills) && d.pills.length) {
      const ul = document.getElementById('aboutPills');
      if (ul) ul.innerHTML = d.pills.map(p => `<li>${_esc(p.text || p)}</li>`).join('');
    }
  })
  .catch(() => { /* ignore */ });

// Services section
fetch('_data/services.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null)
  .then(d => {
    if (!d) return;
    _setText('servicesEyebrow', d.eyebrow);
    if (d.title_line1 || d.title_line2) {
      _setHtml('servicesTitle', `${_esc(d.title_line1 || '')}<br/><em>${_esc(d.title_line2 || '')}</em>`);
    }
    if (Array.isArray(d.items) && d.items.length) {
      const grid = document.getElementById('servicesGrid');
      if (grid) {
        grid.innerHTML = d.items.map(s => {
          const list = Array.isArray(s.list) ? s.list.map(i => `<li>${_esc(i.name || i)}</li>`).join('') : '';
          return `
            <article class="service-card">
              <p class="service-tag">${_esc(s.tag || '')}</p>
              <h3>${_esc(s.title || '')}</h3>
              <ul>${list}</ul>
              <a href="#contact" class="link-arrow">ปรึกษาแพทย์ →</a>
            </article>
          `;
        }).join('');
      }
    }
  })
  .catch(() => { /* ignore */ });

// Programs grid (brand/treatment logos)
fetch('_data/programs.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null)
  .then(d => {
    if (!d) return;
    _setText('programsEyebrow', d.section_eyebrow);
    if (d.section_title_line1 || d.section_title_line2) {
      _setHtml('programsTitle', `${_esc(d.section_title_line1 || '')}<br/><em>${_esc(d.section_title_line2 || '')}</em>`);
    }
    _setText('programsLead', d.section_lead);

    const grid = document.getElementById('programsGrid');
    if (!grid || !Array.isArray(d.items)) return;

    grid.innerHTML = d.items.map((p, i) => `
      <article class="program-tile" style="--i:${i}">
        <div class="program-logo">
          ${p.image ? `<img src="${_esc(p.image)}" alt="${_esc(p.name || '')}" loading="lazy" />` : ''}
        </div>
        <div class="program-info">
          <p class="program-name">${_esc(p.name || '')}</p>
          ${p.category ? `<p class="program-category">${_esc(p.category)}</p>` : ''}
        </div>
      </article>
    `).join('');

    // Staggered reveal
    grid.querySelectorAll('.program-tile').forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', (i * 0.05) + 's');
      try { reveal.observe(el); } catch (e) {}
    });
  })
  .catch(() => { /* ignore */ });

// Reviews
fetch('_data/reviews.json', { cache: 'no-cache' })
  .then(r => r.ok ? r.json() : null)
  .then(d => {
    if (!d || !Array.isArray(d.items) || !d.items.length) return;
    const grid = document.getElementById('reviewGrid');
    if (!grid) return;
    grid.innerHTML = d.items.map(r => `
      <figure class="review">
        <blockquote>"${_esc(r.quote || '')}"</blockquote>
        <figcaption>— ${_esc(r.author || '')}${r.location ? ' · ' + _esc(r.location) : ''}</figcaption>
      </figure>
    `).join('');
  })
  .catch(() => { /* ignore */ });

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
      const href = a.slug
        ? `article.html?slug=${encodeURIComponent(a.slug)}`
        : `article.html?i=${i}`;
      return `
        <article class="article-card">
          <a class="article-card-link" href="${href}">
            <div class="article-media article-media-${variant}" aria-hidden="true">${media}</div>
            <div class="article-body">
              <p class="article-meta">${escapeHtml(a.category || '')}${a.read_time ? ' · ' + escapeHtml(a.read_time) : ''}</p>
              <h3>${escapeHtml(a.title)}</h3>
              <p>${escapeHtml(a.excerpt || '')}</p>
              <span class="link-arrow">Read article →</span>
            </div>
          </a>
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
