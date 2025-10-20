"""Lightweight news/social sentiment provider for event-driven strategies."""

from __future__ import annotations

import logging
import os
import random
import re
import string
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional

import requests
import time
import random
from collections import deque, defaultdict
from config import settings

logger = logging.getLogger(__name__)

POSITIVE_KEYWORDS = {
    "beat",
    "surge",
    "win",
    "up",
    "gain",
    "growth",
    "bull",
    "record",
    "optimistic",
    "approve",
}

NEGATIVE_KEYWORDS = {
    "down",
    "drop",
    "loss",
    "fall",
    "bear",
    "fear",
    "risk",
    "decline",
    "recession",
    "negative",
}


@dataclass
class SentimentReading:
    score: float
    confidence: float
    source: str
    weight: float = 1.0


class SentimentProvider:
    """Fetch sentiment from external APIs when credentials are present."""

    def __init__(
        self,
        *,
        newsapi_key: Optional[str] = None,
        twitter_token: Optional[str] = None,
        timeout_seconds: float = 3.5,
    ) -> None:
        self.newsapi_key = newsapi_key or os.getenv("NEWSAPI_KEY")
        self.twitter_token = twitter_token or os.getenv("TWITTER_BEARER_TOKEN")
        self.timeout = timeout_seconds
        self._session = requests.Session()
        # Route through proxy if configured
        try:
            proxy_url = getattr(settings, "PROXY_URL", None)
        except Exception:
            proxy_url = None
        if proxy_url:
            try:
                self._session.proxies.update({"http": proxy_url, "https": proxy_url})
                # Respect system env proxies as well
                self._session.trust_env = True
            except Exception:
                logger.debug("Failed to configure proxies for sentiment provider", exc_info=True)
        # Lightweight per-provider rate limiter (sliding 60s window)
        self._rl_window_seconds = float(os.getenv("SENTIMENT_RL_WINDOW_SECONDS", "60"))
        try:
            self._rl_limits = {
                "newsapi": int(os.getenv("SENTIMENT_RL_NEWSAPI_PER_WINDOW", "10")),
                "twitter": int(os.getenv("SENTIMENT_RL_TWITTER_PER_WINDOW", "10")),
            }
        except Exception:
            self._rl_limits = {"newsapi": 10, "twitter": 10}
        self._rl_calls = defaultdict(lambda: deque())

    # -------------------------
    # Backoff + rate limiting
    # -------------------------
    def _rate_limit_allow(self, key: str) -> bool:
        now = time.monotonic()
        dq = self._rl_calls[key]
        win = self._rl_window_seconds or 60.0
        limit = int(self._rl_limits.get(key, 10) or 10)
        # prune old
        while dq and (now - dq[0]) > win:
            dq.popleft()
        if len(dq) >= limit:
            return False
        dq.append(now)
        return True

    def _request_with_backoff(self, method: str, url: str, *, params=None, headers=None, provider_key: str) -> Optional[requests.Response]:
        if not self._rate_limit_allow(provider_key):
            logger.debug("Sentiment rate limit hit for %s", provider_key)
            return None
        attempts = 3
        base = 0.25
        for i in range(attempts):
            try:
                resp = self._session.request(method, url, params=params, headers=headers, timeout=self.timeout)
                if resp.status_code == 200:
                    return resp
                # Backoff on 429/5xx
                if resp.status_code in (429, 500, 502, 503, 504):
                    delay = base * (2 ** i) + random.uniform(0.05, 0.35)
                    time.sleep(min(2.0, delay))
                    continue
                # Other non-200: don't retry
                logger.debug("Sentiment request failed (%s): %s", resp.status_code, resp.text[:200])
                return resp
            except Exception:
                delay = base * (2 ** i) + random.uniform(0.05, 0.35)
                time.sleep(min(2.0, delay))
        return None

    def has_live_sources(self) -> bool:
        return bool(self.newsapi_key or self.twitter_token)

    def shutdown(self) -> None:
        try:
            self._session.close()
        except Exception:
            logger.debug("Failed to close sentiment provider session", exc_info=True)

    def sentiment_for_market(self, market: Dict[str, object]) -> Optional[Dict[str, float]]:
        if os.getenv("POLY_OFFLINE_MODE", "").lower() == "true":
            return None

        query = self._infer_query(market)
        if not query:
            return None

        readings: List[SentimentReading] = []

        if self.newsapi_key:
            readings.extend(self._fetch_newsapi_sentiment(query))
        if self.twitter_token:
            readings.extend(self._fetch_twitter_sentiment(query))

        if not readings:
            return None

        total_weight = sum(r.weight for r in readings) or 1.0
        aggregate_score = sum(r.score * r.weight for r in readings) / total_weight
        aggregate_confidence = min(
            1.0, sum(r.confidence for r in readings) / max(len(readings), 1)
        )
        sources = "+".join(sorted({r.source for r in readings}))

        return {
            "score": max(-1.0, min(1.0, aggregate_score)),
            "confidence": max(0.0, min(1.0, aggregate_confidence)),
            "source": sources,
        }

    # ------------------------------------------------------------------
    # Helpers

    def _infer_query(self, market: Dict[str, object]) -> Optional[str]:
        for key in ("title", "question", "market", "name"):
            value = market.get(key)
            if isinstance(value, str) and value.strip():
                return self._sanitize_query(value)

        tokens = market.get("tokens")
        if isinstance(tokens, list):
            names = [
                token.get("name") or token.get("symbol")
                for token in tokens
                if isinstance(token, dict)
            ]
            for name in names:
                if isinstance(name, str) and name.strip():
                    return self._sanitize_query(name)

        market_id = market.get("market_id") or market.get("id")
        if isinstance(market_id, str) and market_id.strip():
            return market_id.strip()
        return None

    @staticmethod
    def _sanitize_query(text: str) -> str:
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned[:120] if cleaned else None

    def _fetch_newsapi_sentiment(self, query: str) -> List[SentimentReading]:
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query,
            "sortBy": "publishedAt",
            "pageSize": 5,
            "language": "en",
        }
        headers = {"X-Api-Key": self.newsapi_key}
        try:
            response = self._request_with_backoff("GET", url, params=params, headers=headers, provider_key="newsapi")
            if response is None:
                return []
            if response.status_code != 200:
                logger.debug("NewsAPI request failed (%s)", response.status_code)
                return []
            payload = response.json()
            articles = payload.get("articles") or []
            readings: List[SentimentReading] = []
            for article in articles[:5]:
                content = " ".join(
                    filter(
                        None,
                        [
                            article.get("title"),
                            article.get("description"),
                            article.get("content"),
                        ],
                    )
                )
                if not content:
                    continue
                score = self._score_text(content)
                if score is None:
                    continue
                age = self._compute_article_age(article.get("publishedAt"))
                time_weight = max(0.2, 1.0 - (age / 12.0))
                readings.append(
                    SentimentReading(
                        score=score,
                        confidence=min(1.0, abs(score) + 0.3),
                        source="newsapi",
                        weight=time_weight,
                    )
                )
            return readings
        except Exception:
            logger.debug("NewsAPI sentiment fetch failed", exc_info=True)
            return []

    def _fetch_twitter_sentiment(self, query: str) -> List[SentimentReading]:
        url = "https://api.twitter.com/2/tweets/search/recent"
        params = {
            "query": query,
            "max_results": 20,
            "tweet.fields": "created_at,lang",
        }
        headers = {"Authorization": f"Bearer {self.twitter_token}"}
        try:
            response = self._request_with_backoff("GET", url, params=params, headers=headers, provider_key="twitter")
            if response is None:
                return []
            if response.status_code != 200:
                logger.debug("Twitter API request failed (%s)", response.status_code)
                return []
            payload = response.json()
            tweets = payload.get("data") or []
            readings: List[SentimentReading] = []
            for tweet in tweets[:20]:
                if tweet.get("lang") and tweet["lang"] != "en":
                    continue
                text = tweet.get("text") or ""
                score = self._score_text(text)
                if score is None:
                    continue
                readings.append(
                    SentimentReading(
                        score=score,
                        confidence=min(1.0, abs(score) + 0.2),
                        source="twitter",
                        weight=0.8,
                    )
                )
            return readings
        except Exception:
            logger.debug("Twitter sentiment fetch failed", exc_info=True)
            return []

    def _score_text(self, text: str) -> Optional[float]:
        cleaned = text.lower().translate(str.maketrans("", "", string.punctuation))
        tokens = cleaned.split()
        if not tokens:
            return None
        positive_hits = sum(1 for token in tokens if token in POSITIVE_KEYWORDS)
        negative_hits = sum(1 for token in tokens if token in NEGATIVE_KEYWORDS)
        total = positive_hits + negative_hits
        if total == 0:
            return None
        raw_score = (positive_hits - negative_hits) / total
        return max(-1.0, min(1.0, raw_score))

    @staticmethod
    def _compute_article_age(timestamp: Optional[str]) -> float:
        if not timestamp:
            return 999.0
        try:
            published = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except Exception:
            return 999.0
        delta = datetime.now(published.tzinfo or datetime.utcnow().astimezone().tzinfo) - published
        return max(0.0, delta.total_seconds() / 3600.0)

    def __del__(self) -> None:
        self.shutdown()
