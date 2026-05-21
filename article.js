/* article.js — loads and renders a single article based on ?slug=... or ?i=... */
(function () {
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');
  const idxParam = params.get('i');

  const $meta = document.getElementById('articleMeta');
  const $title = document.getElementById('articleTitle');
  const $date = document.getElementById('articleDate');
  const $hero = document.getElementById('articleHero');
  const $content = document.getElementById('articleContent');
  const $desc = document.getElementById('metaDescription');

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function show404() {
    document.title = 'ไม่พบบทความ · Alpha Medical Clinic';
    $meta.textContent = '404';
    $title.textContent = 'ไม่พบบทความ';
    $date.textContent = '';
    $hero.innerHTML = '';
    $content.innerHTML = '<p>ขออภัย หาบทความที่ขอไม่เจอ — บางทีอาจถูกย้ายหรือลบไปแล้ว</p>';
  }

  fetch('articles.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => {
      if (!data || !Array.isArray(data.items)) return show404();

      let article = null;
      if (slug) {
        article = data.items.find(a => a && a.slug === slug);
      }
      if (!article && idxParam !== null) {
        const i = parseInt(idxParam, 10);
        if (!isNaN(i) && i >= 0 && i < data.items.length) article = data.items[i];
      }
      if (!article) return show404();

      // Update meta
      document.title = `${article.title} · Alpha Medical Clinic`;
      if ($desc) $desc.setAttribute('content', article.excerpt || '');

      // Header
      const metaParts = [];
      if (article.category) metaParts.push(article.category);
      if (article.read_time) metaParts.push(article.read_time);
      $meta.textContent = metaParts.join(' · ');
      $title.textContent = article.title;

      if (article.date) {
        try {
          const d = new Date(article.date);
          $date.textContent = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) { $date.textContent = ''; }
      }

      // Hero image — detect aspect ratio and fit appropriately
      if (article.image) {
        const probe = new Image();
        probe.onload = () => {
          const ratio = probe.naturalWidth / probe.naturalHeight;
          // 1.3 ≈ 4:3, 1.78 ≈ 16:9, 2.0 = wide. Anything else (portrait/square/QR) gets "contain"
          if (ratio < 1.4 || ratio > 2.6) {
            $hero.classList.add('article-hero-contain');
          }
        };
        probe.onerror = () => { /* still render, default cover */ };
        probe.src = article.image;
        $hero.innerHTML = `<img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" />`;
      } else {
        const variant = (Math.abs(hashCode(article.slug || article.title || '')) % 3) + 1;
        $hero.classList.add('article-media', 'article-media-' + variant);
        $hero.innerHTML = `<span class="article-media-letter">${escapeHtml(article.letter || 'A')}</span>`;
      }

      // Body — render markdown if available, else fallback to excerpt
      const bodyText = (article.body || '').trim();
      if (bodyText) {
        try {
          $content.innerHTML = window.marked ? window.marked.parse(bodyText) : `<p>${escapeHtml(bodyText)}</p>`;
        } catch (e) {
          $content.textContent = bodyText;
        }
      } else {
        $content.innerHTML = `<p class="lead">${escapeHtml(article.excerpt || '')}</p>
          <p class="muted"><em>เนื้อหาบทความเต็มกำลังจะมา — ติดตามได้เร็วๆ นี้</em></p>`;
      }
    })
    .catch(err => {
      console.warn('Failed to load article:', err);
      show404();
    });

  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }
})();
