"""Model pipeline definition, shared by training and tests."""
from __future__ import annotations

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


def build_text_classifier(c: float = 4.0) -> Pipeline:
    """TF-IDF (word uni+bi-grams) + multinomial Logistic Regression.

    Chosen for being fast, small and explainable: predict_proba gives a
    confidence score that drives the human-review threshold in the backend.
    """
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                    min_df=2,
                    strip_accents="unicode",
                    lowercase=True,
                ),
            ),
            ("clf", LogisticRegression(C=c, max_iter=2000, class_weight="balanced")),
        ]
    )
