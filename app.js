/* ============================================
   NEWSLENS — app.js
   Branch 3: DOM Manipulation + NewsAPI Fetch
   + Real-time Search + OOP Architecture
   ============================================ */

// ── CONFIG ────────────────────────────────────
// In production this would come from a backend
// For now we read it from a global config object
const CONFIG = {
  NEWS_API_KEY: 'b3aa3e7135a44d01851ee63f35c4b800',   
  NEWS_API_URL: 'https://newsapi.org/v2/everything',
  DEFAULT_TOPIC: 'technology',
  PAGE_SIZE: 12,
};

// ═══════════════════════════════════════════════
// CLASS 1: APIClient
// Responsibility: ALL external API communication
// Covers JD requirement: REST APIs + JSON + OOP
// ═══════════════════════════════════════════════
class APIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  // Fetch news articles from NewsAPI
  // Returns: array of article objects
  async fetchNews(topic, pageSize = CONFIG.PAGE_SIZE) {
    const url = `${CONFIG.NEWS_API_URL}?q=${encodeURIComponent(topic)}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${this.apiKey}&language=en`;

    const response = await fetch(url);

    // Handle HTTP errors explicitly — covers JD REST requirement
    if (!response.ok) {
      if (response.status === 401) throw new Error('Invalid API key. Check your NewsAPI key.');
      if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment.');
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();   // parse JSON response

    if (data.status === 'error') throw new Error(data.message);

    return data.articles;
  }
}

// ═══════════════════════════════════════════════
// CLASS 2: ArticleRenderer
// Responsibility: ALL DOM manipulation
// Covers JD requirement: DOM manipulation + HTML
// ═══════════════════════════════════════════════
class ArticleRenderer {
  constructor(gridId, statusId) {
    // Store references to DOM elements
    this.grid   = document.getElementById(gridId);
    this.status = document.getElementById(statusId);
  }

  // Show animated skeleton cards while loading
  showSkeletons(count = 6) {
    this.grid.innerHTML = '';            // clear grid
    for (let i = 0; i < count; i++) {
      // createElement — creates a DOM element in memory
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      // innerHTML sets the inner HTML of the element
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
      // appendChild — adds element to the DOM (this is DOM manipulation)
      this.grid.appendChild(skeleton);
    }
  }

  // Render array of articles as cards
  renderArticles(articles) {
    this.grid.innerHTML = '';           // clear skeletons

    if (!articles || articles.length === 0) {
      this.setStatus('No articles found. Try a different topic.');
      return;
    }

    this.setStatus('');                 // clear status message

    articles.forEach(article => {
      // Skip articles with no title
      if (!article.title || article.title === '[Removed]') return;

      const card = this.createCard(article);
      this.grid.appendChild(card);     // inject each card into the DOM
    });
  }

  // Build a single article card element
  // This is pure DOM manipulation — no innerHTML for the card itself
  createCard(article) {
    const card = document.createElement('div');
    card.className = 'card';
    // Store article data on the element — used for search filtering
    card.dataset.title  = (article.title || '').toLowerCase();
    card.dataset.desc   = (article.description || '').toLowerCase();
    card.dataset.source = (article.source?.name || '').toLowerCase();

    // ── Card Image ──
    if (article.urlToImage) {
      const img = document.createElement('img');
      img.className = 'card-image';
      img.alt       = article.title;
      img.loading   = 'lazy';              // browser loads image only when visible
      // If image fails to load, replace with placeholder
      img.onerror   = () => img.replaceWith(this.imagePlaceholder());
      img.src       = article.urlToImage;
      card.appendChild(img);
    } else {
      card.appendChild(this.imagePlaceholder());
    }

    // ── Card Body ──
    const body = document.createElement('div');
    body.className = 'card-body';

    // Source name
    const source = document.createElement('p');
    source.className   = 'card-source';
    source.textContent = article.source?.name || 'Unknown Source';
    body.appendChild(source);

    // Title
    const title = document.createElement('h2');
    title.className   = 'card-title';
    title.textContent = article.title;
    body.appendChild(title);

    // Description
    const desc = document.createElement('p');
    desc.className   = 'card-desc';
    desc.textContent = article.description || 'No description available.';
    body.appendChild(desc);

    // ── Card Footer ──
    const footer = document.createElement('div');
    footer.className = 'card-footer';

    // Published date
    const date = document.createElement('span');
    date.className   = 'card-date';
    date.textContent = this.formatDate(article.publishedAt);
    footer.appendChild(date);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    // AI Summary button — Gemini integration (Branch 4)
    const summaryBtn = document.createElement('button');
    summaryBtn.className            = 'btn-summary';
    summaryBtn.textContent          = '✨ AI Summary';
    summaryBtn.dataset.title        = article.title;
    summaryBtn.dataset.description  = article.description || '';
    summaryBtn.dataset.url          = article.url;
    actions.appendChild(summaryBtn);

    // Read More link
    const readBtn = document.createElement('a');
    readBtn.className  = 'btn-read';
    readBtn.href       = article.url;
    readBtn.target     = '_blank';             // opens in new tab
    readBtn.rel        = 'noopener noreferrer'; // security best practice
    readBtn.textContent = 'Read →';
    actions.appendChild(readBtn);

    footer.appendChild(actions);
    body.appendChild(footer);
    card.appendChild(body);

    return card;
  }

  // Image fallback placeholder
  imagePlaceholder() {
    const div = document.createElement('div');
    div.className = 'card-image-placeholder';
    return div;
  }

  // Format ISO date string to readable format
  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // Show / clear status message
  setStatus(msg) {
    this.status.textContent = msg;
  }

  // Show error in status
  setError(msg) {
    this.status.textContent = '⚠️ ' + msg;
    this.status.style.color = '#ef4444';
  }
}

// ═══════════════════════════════════════════════
// CLASS 3: SearchController
// Responsibility: real-time search filtering
// Covers JD requirement: DOM traversal + events
// ═══════════════════════════════════════════════
class SearchController {
  constructor(inputId, gridId) {
    this.input = document.getElementById(inputId);
    this.grid  = document.getElementById(gridId);
  }

  // Called once on app init — attaches event listener
  init() {
    // 'input' event fires on every keystroke
    this.input.addEventListener('input', () => this.filter());
  }

  // Filter cards by matching search text against stored data attributes
  filter() {
    const query = this.input.value.toLowerCase().trim();
    // querySelectorAll returns all card elements
    const cards = this.grid.querySelectorAll('.card');

    cards.forEach(card => {
      const titleMatch  = card.dataset.title.includes(query);
      const descMatch   = card.dataset.desc.includes(query);
      const sourceMatch = card.dataset.source.includes(query);

      // Show card if query matches title, desc, or source
      // Otherwise hide it — pure DOM manipulation, no re-fetch needed
      if (titleMatch || descMatch || sourceMatch || query === '') {
        card.style.display = '';          // restore default display
      } else {
        card.style.display = 'none';      // hide from DOM
      }
    });
  }
}

// ═══════════════════════════════════════════════
// CLASS 4: NewsApp
// Responsibility: orchestrate all components
// Covers JD requirement: OOP composition pattern
// ═══════════════════════════════════════════════
class NewsApp {
  constructor() {
    // Compose the app from smaller classes
    this.api      = new APIClient(CONFIG.NEWS_API_KEY);
    this.renderer = new ArticleRenderer('news-grid', 'status-message');
    this.search   = new SearchController('search-input', 'news-grid');

    this.currentTopic  = CONFIG.DEFAULT_TOPIC;
    this.articles      = [];
  }

  // App entry point — called once when page loads
  async init() {
    this.search.init();              // attach search listener
    this.bindEvents();               // attach all other listeners
    await this.loadNews(this.currentTopic);  // fetch initial news
  }

  // Fetch and render news for a topic
  async loadNews(topic) {
    this.currentTopic = topic;
    this.renderer.showSkeletons();   // show loading state immediately
    this.renderer.setStatus('Loading latest news...');

    try {
      this.articles = await this.api.fetchNews(topic);
      this.renderer.renderArticles(this.articles);
    } catch (error) {
      this.renderer.setError(error.message);
      this.renderer.grid.innerHTML = '';  // clear skeletons on error
    }
  }

  // Attach all DOM event listeners
  bindEvents() {

    // ── Search button click ──
    document.getElementById('search-btn')
      .addEventListener('click', () => {
        const query = document.getElementById('search-input').value.trim();
        if (query) this.loadNews(query);
      });

    // ── Search input — Enter key ──
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
        // Remove active class from all pills
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        // Add active class to clicked pill
        pill.classList.add('active');
        // Fetch news for selected topic
        this.loadNews(pill.dataset.topic);
      });
    });

    // ── AI Summary buttons (delegated to grid) ──
    // Event delegation: one listener on parent catches all child button clicks
    // This is more efficient than adding a listener to every card
    document.getElementById('news-grid')
      .addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-summary');
        if (btn) {
          // Gemini summarization — wired up in Branch 4
          window.dispatchEvent(new CustomEvent('summarize-article', {
            detail: {
              title:       btn.dataset.title,
              description: btn.dataset.description,
              url:         btn.dataset.url,
              buttonEl:    btn
            }
          }));
        }
      });

    // ── Modal close button ──
    document.getElementById('close-modal')
      .addEventListener('click', () => this.closeModal());

    // ── Modal overlay click (click outside to close) ──
    document.getElementById('modal-overlay')
      .addEventListener('click', () => this.closeModal());

    // ── Escape key closes modal ──
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  // Open the summary modal
  openModal(title) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('summary-text').textContent = '';
    document.getElementById('summary-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';  // prevent background scroll
  }

  // Close the summary modal
  closeModal() {
    document.getElementById('summary-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// ── BOOT ──────────────────────────────────────
// Wait for DOM to be fully parsed before running JS
document.addEventListener('DOMContentLoaded', () => {
  const app = new NewsApp();
  app.init();
  // Expose app globally so Branch 4 (Gemini) can access it
  window.newsApp = app;
});