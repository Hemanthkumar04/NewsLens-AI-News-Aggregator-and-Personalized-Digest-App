"""
NewsLens — Flask Backend Proxy Server
Proxies both NewsAPI and Gemini API requests
so API keys never reach the browser.
"""

"""
NewsLens — Flask Backend Proxy Server
Proxies both NewsAPI and Gemini API requests
so API keys never reach the browser.
"""

import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_caching import Cache
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# ── Configure Cache ───────────────────────────
cache = Cache(app, config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 900})

NEWS_API_KEY = os.getenv('NEWS_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

NEWS_API_URL    = 'https://newsapi.org/v2/everything'
GEMINI_API_URL  = (
    'https://generativelanguage.googleapis.com/v1beta/models/'
    'gemini-2.5-flash:generateContent'
)


# ── Serve frontend ────────────────────────────
@app.route('/')
def index():
    """Serve the frontend SPA."""
    return app.send_static_file('index.html')


# ── News proxy ────────────────────────────────
@app.route('/api/news')
@cache.cached(timeout=900, query_string=True)
def get_news():
    """
    Proxy route for NewsAPI.
    Frontend calls /api/news → Flask calls NewsAPI
    with real key from .env → returns articles JSON.
    Cached for 15 minutes based on the query string.
    """
    topic     = request.args.get('q', 'technology')
    page_size = request.args.get('pageSize', 12)

    if not NEWS_API_KEY:
        return jsonify({'error': 'NEWS_API_KEY not set in .env'}), 500

    try:
        response = requests.get(NEWS_API_URL, params={
            'q':        topic,
            'pageSize': page_size,
            'sortBy':   'publishedAt',
            'language': 'en',
            'apiKey':   NEWS_API_KEY,
        }, timeout=10)

        if response.status_code == 401:
            return jsonify({'error': 'Invalid NewsAPI key'}), 401
        if response.status_code == 429:
            return jsonify({'error': 'NewsAPI rate limit reached'}), 429

        data = response.json()
        return jsonify({
            'status':   data.get('status'),
            'articles': data.get('articles', []),
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'NewsAPI request timed out'}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Could not reach NewsAPI'}), 503


# ── Gemini summarization proxy ────────────────
@app.route('/api/summarize', methods=['POST'])
def summarize():
    """
    Proxy route for Gemini API summarization.
    Frontend sends article title + description →
    Flask builds prompt → calls Gemini with key
    from .env → returns one-paragraph summary.
    Key never reaches the browser.
    """
    if not GEMINI_API_KEY:
        return jsonify({'error': 'GEMINI_API_KEY not set in .env'}), 500

    # Parse JSON safely (fallback to empty dict if body is missing)
    body        = request.get_json() or {}
    title       = body.get('title', '')
    description = body.get('description', '')
    url         = body.get('url', '')

    if not title:
        return jsonify({'error': 'Article title is required'}), 400

    # Engineered prompt — controls tone, length, format
    prompt = (
        f"Summarize the following news article in exactly one clear, "
        f"concise paragraph of 3-4 sentences. Focus on the key facts. "
        f"Do not include opinions or filler phrases like 'This article discusses'.\n\n"
        f"Title: {title}\n"
        f"Description: {description}\n"
        f"Source URL: {url}"
    )

    try:
        response = requests.post(
            GEMINI_API_URL,
            params  = {'key': GEMINI_API_KEY},
            json    = {
                'contents': [{
                    'parts': [{'text': prompt}]
                }],
                # Lower safety thresholds for news topics to prevent empty responses
                'safetySettings': [
                    {'category': 'HARM_CATEGORY_HARASSMENT',        'threshold': 'BLOCK_NONE'},
                    {'category': 'HARM_CATEGORY_HATE_SPEECH',       'threshold': 'BLOCK_NONE'},
                    {'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold': 'BLOCK_NONE'},
                    {'category': 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold': 'BLOCK_NONE'}
                ],
                'generationConfig': {
                    'temperature':     0.3,   # low = more factual, less creative
                    'maxOutputTokens': 200,   # keeps summary concise
                }
            },
            timeout = 15
        )

        # Error handling including the new 404 check
        if response.status_code == 400:
            return jsonify({'error': 'Bad request to Gemini API'}), 400
        if response.status_code == 403:
            return jsonify({'error': 'Invalid Gemini API key'}), 403
        if response.status_code == 404:
            return jsonify({'error': 'Gemini model not found. Check the model name in server.py.'}), 404
        if response.status_code == 429:
            return jsonify({'error': 'Gemini rate limit reached. Try again shortly.'}), 429

        data = response.json()

        # SAFELY EXTRACT SUMMARY
        candidates = data.get('candidates', [])
        
        # If Gemini returns an empty array (often due to safety blocks)
        if not candidates:
            return jsonify({'error': 'Summary blocked by AI safety filters or unavailable.'}), 400

        # Now we know candidates[0] is safe to access
        summary = (
            candidates[0]
            .get('content', {})
            .get('parts', [{}])[0]
            .get('text', 'Could not generate summary.')
        )

        return jsonify({'summary': summary.strip()}), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Gemini request timed out'}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Could not reach Gemini API'}), 503


# ── Health check ──────────────────────────────
@app.route('/api/health')
def health():
    """Simple health check endpoint."""
    return jsonify({'status': 'ok'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)