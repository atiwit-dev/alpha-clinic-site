/* journal.js — renders ALL articles on the journal index page */
(function () {
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  const grid = document.getElementById('journalGrid');
  if (!grid) return;

  fetch('articles.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => {
      if (!data || !Array.isArray(data.items)) {
        grid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;">ยังไม่มีบทความ</p>';
        return;
      }

      const articles = [...data.items]
        .filter(a => a && a.title)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      if (!articles.length) {
        grid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;">ยังไม่มีบทความ — เพิ่มได้ที่ /admin</p>';
        return;
      }

      grid.innerHTML = articles.map((a, i) => {
        const variant = (i % 3) + 1;
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

      grid.querySelectorAll('.article-card').forEach((el, i) => {
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', (i * 0.06) + 's');
        try { reveal.observe(el); } catch (e) { /* ignore */ }
      });
    })
    .catch(err => {
      console.warn('Failed to load articles.json:', err);
      grid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;">โหลดบทความล้มเหลว</p>';
    });
})();
