"""
NewsLens — Recommendations Microservice
Stores article embeddings in ChromaDB vector store.
Given any article, finds semantically similar ones
using sentence-transformer cosine similarity search.
"""

from typing import Any, Mapping
from sentence_transformers import SentenceTransformer  # type: ignore
import chromadb

# ── CONFIG ────────────────────────────────────
COLLECTION_NAME = "news_articles"
MODEL_NAME      = "all-MiniLM-L6-v2"  # 80MB, fast, free
TOP_K           = 5                    # recommendations to return


# ── SETUP ─────────────────────────────────────
print("Loading embedding model...")
model      = SentenceTransformer(MODEL_NAME)
client     = chromadb.Client()
collection = client.get_or_create_collection(COLLECTION_NAME)
print("Recommendations microservice ready.\n")


# ═══════════════════════════════════════════════
# FUNCTION 1: store_articles
# Embeds article title+description and stores
# the resulting vectors in ChromaDB
# ═══════════════════════════════════════════════
def store_articles(articles: list[dict[str, Any]]) -> None:
    """
    Embed and store a list of article dicts in ChromaDB.
    Each article is converted to a vector from its
    title + description text combined.
    """
    if not articles:
        return

    ids: list[str] = []
    documents: list[str] = []
    # Explicitly type as Mapping to satisfy Mypy's strict invariance
    metadatas: list[Mapping[str, str | int | float | bool]] = []

    for i, article in enumerate(articles):
        text = (
            f"{article.get('title', '')} "
            f"{article.get('description', '')}"
        ).strip()

        if not text:
            continue

        ids.append(str(i))
        documents.append(text)

        # Safely extract source name
        source = article.get("source")
        source_name = source.get("name", "Unknown") if isinstance(source, dict) else "Unknown"

        metadatas.append({
            "title":  str(article.get("title", "")),
            "url":    str(article.get("url", "")),
            "source": str(source_name),
        })

    if not ids:
        return

    # Encode all documents in one batch (faster than one by one)
    embeddings = model.encode(documents).tolist()

    collection.add(
        ids        = ids,
        documents  = documents,
        embeddings = embeddings,
        metadatas  = metadatas,
    )
    print(f"Stored {len(ids)} articles in vector store.")


# ═══════════════════════════════════════════════
# FUNCTION 2: get_recommendations
# Embeds the query and finds TOP_K nearest
# articles by cosine similarity in ChromaDB
# ═══════════════════════════════════════════════
def get_recommendations(query_text: str, top_k: int = TOP_K) -> list[dict[str, Any]]:
    """
    Find articles semantically similar to query_text.
    Returns list of dicts with title, url, source, score.
    Score closer to 1.0 = more similar.
    """
    if collection.count() == 0:
        return []

    query_embedding = model.encode([query_text]).tolist()

    results = collection.query(
        query_embeddings = query_embedding,
        n_results        = min(top_k, collection.count()),
    )

    recommendations: list[dict[str, Any]] = []

    # Mypy requires us to prove these aren't None before indexing into them
    res_metadatas = results.get("metadatas")
    res_distances = results.get("distances")

    if res_metadatas is None or res_distances is None:
        return recommendations

    if not res_metadatas or not res_distances:
        return recommendations

    for i, metadata in enumerate(res_metadatas[0]):
        # Ensure metadata is not None (ChromaDB typing edge case)
        if metadata is None:
            continue

        recommendations.append({
            "title":  metadata.get("title", "Unknown"),
            "url":    metadata.get("url", ""),
            "source": metadata.get("source", "Unknown"),
            "score":  round(1 - res_distances[0][i], 3),
        })

    return recommendations


# ── DEMO ──────────────────────────────────────
if __name__ == "__main__":
    sample_articles = [
        {
            "title": "Google releases Gemini 2.0 with multimodal capabilities",
            "description": "Google's latest AI model supports text, image, and audio.",
            "url": "https://example.com/1",
            "source": {"name": "TechCrunch"},
        },
        {
            "title": "OpenAI launches GPT-5 with improved reasoning",
            "description": "New model shows major improvements in mathematical reasoning.",
            "url": "https://example.com/2",
            "source": {"name": "The Verge"},
        },
        {
            "title": "India wins Cricket World Cup 2025",
            "description": "Team India defeats Australia in a thrilling final match.",
            "url": "https://example.com/3",
            "source": {"name": "ESPN"},
        },
        {
            "title": "Python 3.14 released with major performance gains",
            "description": "Latest Python release includes improved type hints and speed.",
            "url": "https://example.com/4",
            "source": {"name": "Python.org"},
        },
        {
            "title": "Meta announces AR glasses with built-in AI assistant",
            "description": "Smart glasses feature real-time translation and AI responses.",
            "url": "https://example.com/5",
            "source": {"name": "Wired"},
        },
    ]

    print("--- Storing sample articles ---")
    store_articles(sample_articles)

    print("\n--- Recommendations for: 'AI language models' ---")
    for rec in get_recommendations("AI language models"):
        print(f"  [{rec['score']}] {rec['title']} — {rec['source']}")

    print("\n--- Recommendations for: 'cricket sports' ---")
    for rec in get_recommendations("cricket sports"):
        print(f"  [{rec['score']}] {rec['title']} — {rec['source']}")
        