"""Train category and priority classifiers and save them with metrics.

Usage (from ml-service/):
    python -m training.generate_dataset
    python -m training.train [--data data/tickets.csv]
"""
from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
from sklearn.metrics import classification_report
from sklearn.model_selection import GroupShuffleSplit

from app.config import load_settings
from app.pipeline import build_text_classifier

TARGETS = ("category", "priority")


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def train_target(rows: list[dict[str, str]], target: str, seed: int) -> tuple[object, dict]:
    texts = [r["text"] for r in rows]
    labels = [r[target] for r in rows]
    # Hold out whole template groups so the score reflects unseen phrasings,
    # not memorised sentences. Falls back to row-level split for plain CSVs.
    groups = [r.get(f"{target}_group") or str(i) for i, r in enumerate(rows)]
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=seed)
    train_idx, test_idx = next(splitter.split(texts, labels, groups))
    model = build_text_classifier()
    model.fit([texts[i] for i in train_idx], [labels[i] for i in train_idx])
    y_test = [labels[i] for i in test_idx]
    y_pred = model.predict([texts[i] for i in test_idx])
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    # Held-out metrics are reported; the shipped model is refit on all data.
    model.fit(texts, labels)
    return model, report


def main() -> None:
    settings = load_settings()
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path(__file__).parent.parent / "data" / "tickets.csv")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = load_rows(args.data)
    settings.models_dir.mkdir(parents=True, exist_ok=True)
    version = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    metrics: dict[str, object] = {"version": version, "samples": len(rows)}

    for target in TARGETS:
        model, report = train_target(rows, target, args.seed)
        joblib.dump(model, settings.models_dir / f"{target}.joblib")
        metrics[target] = {
            "accuracy": round(report["accuracy"], 4),
            "macro_f1": round(report["macro avg"]["f1-score"], 4),
            "per_class_f1": {
                k: round(v["f1-score"], 4)
                for k, v in report.items()
                if isinstance(v, dict) and k not in ("macro avg", "weighted avg")
            },
        }
        print(f"[{target}] accuracy={metrics[target]['accuracy']} macro_f1={metrics[target]['macro_f1']}")

    (settings.models_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"Saved models v{version} to {settings.models_dir}")


if __name__ == "__main__":
    main()
