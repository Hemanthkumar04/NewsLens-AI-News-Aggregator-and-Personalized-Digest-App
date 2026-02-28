"""
NewsLens — Flask Backend Proxy Server
Keeps API keys off the frontend by proxying
NewsAPI requests server-side using .env secrets.
"""

import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env file into os.environ
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

NEWS_API_KEY = os.getenv('NEWS_API_KEY')
NEWS_API_URL = 'https://newsapi.org/v2/everything'


# ── Serve index.html at root ──────────────────
@app.route('/')
def index():
    """Serve the frontend SPA."""
    return app.send_static_file('index.html')


# ── News proxy endpoint ───────────────────────
@app.route('/api/news')
def get_news():
    """
    Proxy route — frontend calls this.
    We call NewsAPI with the real key from .env.
    Key is never exposed to the browser.
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
            return jsonify({'error': 'Invalid API key'}), 401
        if response.status_code == 429:
            return jsonify({'error': 'Rate limit reached'}), 429

        data = response.json()
        return jsonify({
            'status':   data.get('status'),
            'articles': data.get('articles', []),
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'NewsAPI request timed out'}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Could not reach NewsAPI'}), 503


# ── Health check ──────────────────────────────
@app.route('/api/health')
def health():
    """Simple health check endpoint."""
    return jsonify({'status': 'ok'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
