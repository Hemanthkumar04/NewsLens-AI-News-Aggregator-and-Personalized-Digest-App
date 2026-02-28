# 📰 NewsLens — AI News Aggregator & Personalized Digest App

> Live news aggregation powered by REST APIs, on-demand AI summarization via Google Gemini API, and personalized recommendations using sentence-transformer embeddings.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_API-Google-4285F4?style=flat&logo=google&logoColor=white)

---

## 🚀 Features

- 🔍 **Live News Feed** — fetches real-time articles via NewsAPI REST endpoint with JSON parsing
- 🎨 **Responsive UI** — mobile-first CSS Grid/Flexbox layout, tested across all screen sizes
- ⚡ **Real-time Search** — instant DOM-based article filtering on every keystroke
- 🤖 **AI Summarization** — on-demand one-paragraph summaries powered by Google Gemini API
- 📌 **Skeleton Loading States** — professional UX with loading placeholders before content arrives
- 🔗 **Personalized Recommendations** *(coming soon)* — sentence-transformer embeddings + ChromaDB vector store

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 (semantic), CSS3 (Flexbox, Grid, Media Queries), JavaScript ES6+ |
| APIs | NewsAPI (live articles), Google Gemini API (AI summarization) |
| DOM | Vanilla JS — createElement, appendChild, event listeners, Fetch API |
| AI/ML | Gemini 1.5 Flash (prompt engineering), sentence-transformers, ChromaDB |
| Dev Tools | Git (feature branching, PRs), VS Code |

---

## 📁 Project Structure

```
NewsLens-AI-News-Aggregator---Personalized-Digest-App/
├── index.html              # Semantic HTML5 structure
├── style.css               # Responsive CSS3 — mobile-first
├── app.js                  # Core JS — DOM manipulation, Fetch API, OOP classes
├── recommendations.py      # Python microservice — embeddings + ChromaDB
├── requirements.txt        # Python dependencies
├── .env.example            # API key template (never commit real keys)
├── .gitignore              # Ignores .env and cache files
├── LICENSE                 # MIT License
└── README.md               # You are here
```

---

## ⚙️ Setup & Running Locally

### Prerequisites
- A modern browser (Chrome / Firefox / Edge)
- [NewsAPI key](https://newsapi.org/register) — free tier, no credit card
- [Google Gemini API key](https://aistudio.google.com/app/apikey) — free tier, just a Google account
- Python 3.10+ *(only for recommendations microservice)*

### 1. Clone the repo
```bash
git clone git@github.com:Hemanthkumar04/NewsLens-AI-News-Aggregator---Personalized-Digest-App.git
cd NewsLens-AI-News-Aggregator---Personalized-Digest-App
```

### 2. Set up API keys
```bash
cp .env.example .env
# Open .env in VS Code and fill in your keys
```

### 3. Open the app
```bash
# Open index.html directly in your browser
xdg-open index.html
# OR right-click index.html in VS Code → Open with Live Server
```

### 4. (Optional) Run recommendations microservice
```bash
pip install -r requirements.txt
python recommendations.py
```

---

## 🧠 How It Works

### News Feed (REST API + DOM Manipulation)
1. On load, `fetchNews()` sends a `GET` request to NewsAPI endpoint
2. Response JSON is parsed — each article rendered as a card via `createElement()`
3. Search input fires `keyup` event → filters rendered cards in real-time via DOM traversal

### AI Summarization (Gemini API)
1. User clicks **"AI Summary"** on any article card
2. `APIClient.summarize()` sends a `POST` request to Gemini's `generateContent` endpoint
3. Engineered prompt ensures consistent tone, length, and factual grounding
4. Response text is rendered into a modal via DOM manipulation

### Architecture (OOP — ES6 Classes)
```
APIClient          → handles all external API calls (NewsAPI + Gemini)
ArticleRenderer    → handles all DOM rendering logic
SearchController   → manages search state and real-time filtering
NewsApp            → orchestrates all components (composition over inheritance)
```

---

## 📸 Screenshots

> *Screenshots will be added after UI is complete*

---

## 🗂️ Git Workflow

This project was built using a feature-branch workflow — one branch per feature, merged via pull request, simulating a real agile sprint:

```
main
├── feat/html-structure          → semantic HTML skeleton
├── feat/responsive-css          → mobile-first CSS layout
├── feat/news-api-integration    → REST API fetch + DOM rendering + search
└── feat/gemini-ai-summarization → Gemini API integration + modal UI
```

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Hemanth Kumar Yanda**
- GitHub: [@Hemanthkumar04](https://github.com/Hemanthkumar04)
- LinkedIn: [y-hemanth-kumar](https://linkedin.com/in/y-hemanth-kumar)
- Email: hemanthkumar.yanda@gmail.com