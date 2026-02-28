/* ============================================
   NEWSLENS — app.js
   Full app: DOM Manipulation + NewsAPI via
   Flask proxy + Real-time Search + Gemini AI
   ============================================ */

// ── CONFIG ────────────────────────────────────
// NO API keys here — all keys live in .env on
// the Flask server. Browser never sees them.
const CONFIG = {
  NEWS_API_URL:    '/api/news',       // Flask proxy route
  SUMMARIZE_URL:   '/api/summarize',  // Flask proxy route
  DEFAULT_TOPIC:   'technology',
  PAGE_SIZE:       12,
};

// ═══════════════════════════════════════════════
// CLASS 1: APIClient
// Responsibility: fetch news via Flask proxy
// Covers JD: REST APIs + JSON + OOP
// ═══════════════════════════════════════════════
class APIClient {
  constructor() {
    // No API key — key lives in server .env
  }

  async fetchNews(topic, pageSize = CONFIG.PAGE_SIZE) {
    const url = `${CONFIG.NEWS_API_URL}?q=${encodeURIComponent(topic)}&pageSize=${pageSize}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) throw new Error('Invalid API key. Contact admin.');
      if (response.status === 429) throw new Error('Rate limit reached. Please wait.');
      if (response.status === 500) throw new Error('Server error. Try again later.');
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') throw new Error(data.error);

    return data.articles;
  }
}

// ═══════════════════════════════════════════════
// CLASS 2: ArticleRenderer
// Responsibility: ALL DOM manipulation
// Covers JD: DOM manipulation + HTML5
// ═══════════════════════════════════════════════
class ArticleRenderer {
  constructor(gridId, statusId) {
    this.grid   = document.getElementById(gridId);
    this.status = document.getElementById(statusId);
  }

  showSkeletons(count = 6) {
    this.grid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      skeleton.innerHTML = `
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line full"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line full"></div>
          <div class="skeleton-line short"></div>
        </div>
      `;
      this.grid.appendChild(skeleton);
    }
  }

  renderArticles(articles) {
    this.grid.innerHTML = '';

    if (!articles || articles.length === 0) {
      this.setStatus('No articles found. Try a different topic.');
      return;
    }

    this.setStatus('');

    articles.forEach(article => {
      if (!article.title || article.title === '[Removed]') return;
      const card = this.createCard(article);
      this.grid.appendChild(card);
    });
  }

  createCard(article) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.title  = (article.title || '').toLowerCase();
    card.dataset.desc   = (article.description || '').toLowerCase();
    card.dataset.source = (article.source?.name || '').toLowerCase();

    // ── Image ──
    if (article.urlToImage) {
      const img     = document.createElement('img');
      img.className = 'card-image';
      img.alt       = article.title;
      img.loading   = 'lazy';
      img.onerror   = () => img.replaceWith(this.imagePlaceholder());
      img.src       = article.urlToImage;
      card.appendChild(img);
    } else {
      card.appendChild(this.imagePlaceholder());
    }

    // ── Body ──
    const body     = document.createElement('div');
    body.className = 'card-body';

    const source         = document.createElement('p');
    source.className     = 'card-source';
    source.textContent   = article.source?.name || 'Unknown Source';
    body.appendChild(source);

    const title        = document.createElement('h2');
    title.className    = 'card-title';
    title.textContent  = article.title;
    body.appendChild(title);

    const desc        = document.createElement('p');
    desc.className    = 'card-desc';
    desc.textContent  = article.description || 'No description available.';
    body.appendChild(desc);

    // ── Footer ──
    const footer     = document.createElement('div');
    footer.className = 'card-footer';

    const date        = document.createElement('span');
    date.className    = 'card-date';
    date.textContent  = this.formatDate(article.publishedAt);
    footer.appendChild(date);

    const actions     = document.createElement('div');
    actions.className = 'card-actions';

    const summaryBtn                   = document.createElement('button');
    summaryBtn.className               = 'btn-summary';
    summaryBtn.textContent             = '✨ AI Summary';
    summaryBtn.dataset.title           = article.title;
    summaryBtn.dataset.description     = article.description || '';
    summaryBtn.dataset.url             = article.url;
    actions.appendChild(summaryBtn);

    const readBtn       = document.createElement('a');
    readBtn.className   = 'btn-read';
    readBtn.href        = article.url;
    readBtn.target      = '_blank';
    readBtn.rel         = 'noopener noreferrer';
    readBtn.textContent = 'Read →';
    actions.appendChild(readBtn);

    footer.appendChild(actions);
    body.appendChild(footer);
    card.appendChild(body);

    return card;
  }

  imagePlaceholder() {
    const div     = document.createElement('div');
    div.className = 'card-image-placeholder';
    return div;
  }

  formatDate(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  setStatus(msg) {
    this.status.textContent  = msg;
    this.status.style.color  = '';
  }

  setError(msg) {
    this.status.textContent = '⚠️ ' + msg;
    this.status.style.color = '#ef4444';
  }
}

// ═══════════════════════════════════════════════
// CLASS 3: SearchController
// Responsibility: real-time DOM search filtering
// Covers JD: DOM traversal + event handling
// ═══════════════════════════════════════════════
class SearchController {
  constructor(inputId, gridId) {
    this.input = document.getElementById(inputId);
    this.grid  = document.getElementById(gridId);
  }

  init() {
    this.input.addEventListener('input', () => this.filter());
  }

  filter() {
    const query = this.input.value.toLowerCase().trim();
    const cards = this.grid.querySelectorAll('.card');

    cards.forEach(card => {
      const match =
        card.dataset.title.includes(query)  ||
        card.dataset.desc.includes(query)   ||
        card.dataset.source.includes(query) ||
        query === '';

      card.style.display = match ? '' : 'none';
    });
  }
}

// ═══════════════════════════════════════════════
// CLASS 4: GeminiClient
// Responsibility: AI summarization via Flask proxy
// Covers JD: AI/ML API integration + OOP
// ═══════════════════════════════════════════════
class GeminiClient {
  constructor() {
    this.endpoint = CONFIG.SUMMARIZE_URL;  // Flask proxy — key in .env
  }

  async summarize(title, description, url) {
    const response = await fetch(this.endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, description, url }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.summary;
  }
}

// ═══════════════════════════════════════════════
// CLASS 5: NewsApp
// Responsibility: orchestrate all components
// Covers JD: OOP composition pattern
// ═══════════════════════════════════════════════
class NewsApp {
  constructor() {
    this.api      = new APIClient();
    this.renderer = new ArticleRenderer('news-grid', 'status-message');
    this.search   = new SearchController('search-input', 'news-grid');
    this.gemini   = new GeminiClient();

    this.currentTopic = CONFIG.DEFAULT_TOPIC;
    this.articles     = [];
  }

  async init() {
    this.search.init();
    this.bindEvents();
    await this.loadNews(this.currentTopic);
  }

  async loadNews(topic) {
    this.currentTopic = topic;
    this.renderer.showSkeletons();
    this.renderer.setStatus('Loading latest news...');

    try {
      this.articles = await this.api.fetchNews(topic);
      this.renderer.renderArticles(this.articles);
    } catch (error) {
      this.renderer.setError(error.message);
      this.renderer.grid.innerHTML = '';
    }
  }

  bindEvents() {

    // ── Search button ──
    document.getElementById('search-btn')
      .addEventListener('click', () => {
        const query = document.getElementById('search-input').value.trim();
        if (query) this.loadNews(query);
      });

    // ── Search Enter key ──
    document.getElementById('search-input')
      .addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = e.target.value.trim();
          if (query) this.loadNews(query);
        }
      });

    // ── Category pills ──
    document.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.pill')
          .forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.loadNews(pill.dataset.topic);
      });
    });

    // ── AI Summary buttons — event delegation ──
    document.getElementById('news-grid')
      .addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-summary');
        if (!btn) return;

        const title       = btn.dataset.title;
        const description = btn.dataset.description;
        const url         = btn.dataset.url;

        // Disable button and show spinner immediately
        btn.disabled    = true;
        btn.textContent = '⏳ Loading...';

        // Open modal with spinner — no summary-text yet
        this.openModal(title);

        try {
          const summary = await this.gemini.summarize(title, description, url);

          // Render summary text into modal body
          const modalBody = document.getElementById('modal-body');
          modalBody.innerHTML = '';

          const p       = document.createElement('p');
          p.id          = 'summary-text';
          p.className   = 'summary-text';
          p.textContent = summary;
          modalBody.appendChild(p);

        } catch (error) {
          document.getElementById('modal-body').innerHTML = `
            <p class="summary-error">⚠️ ${error.message}</p>
          `;
        } finally {
          btn.disabled    = false;
          btn.textContent = '✨ AI Summary';
        }
      });

    // ── Modal close button ──
    document.getElementById('close-modal')
      .addEventListener('click', () => this.closeModal());

    // ── Click overlay to close ──
    document.getElementById('modal-overlay')
      .addEventListener('click', () => this.closeModal());

    // ── Escape key to close ──
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  // Open modal with spinner — summary rendered async after
  openModal(title) {
    document.getElementById('modal-title').textContent = title;

    // Show spinner immediately — summary replaces it when ready
    document.getElementById('modal-body').innerHTML = `
      <div class="summary-loading">
        <div class="summary-spinner"></div>
        <p>Generating AI summary...</p>
      </div>
    `;

    document.getElementById('summary-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    document.getElementById('summary-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// ── BOOT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const app = new NewsApp();
  app.init();
  window.newsApp = app;
});