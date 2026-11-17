"""Generate a curated, labelled support-ticket dataset.

Public ticket datasets use inconsistent label sets, so we generate a curated
dataset whose labels match our domain (5 categories x 4 priorities). Templates
are combined with slot values, urgency modifiers and light noise so the model
has to learn vocabulary rather than memorise sentences.

To train on a real dataset instead, produce a CSV with the same columns
(text, category, priority) and pass it to train.py with --data.
"""
from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

CATEGORIES: dict[str, list[str]] = {
    "ACCOUNT": [
        "I can't log in to my account",
        "password reset email never arrives",
        "my account got locked after too many login attempts",
        "two-factor authentication code is not accepted",
        "I lost access to my authenticator app and need to disable 2FA",
        "how do I change the email address on my profile",
        "the login page keeps redirecting me back to sign in",
        "my session expires every few minutes and logs me out",
        "I want to delete my account and all my data",
        "SSO login with Google fails with an invalid account error",
        "can't verify my email address, the verification link has expired",
        "someone else may have access to my account, I see unknown logins",
        "I need to transfer account ownership to a colleague",
        "username already taken but I never registered",
        "reset password link says token invalid",
    ],
    "BILLING": [
        "I was charged twice for my subscription this month",
        "my payment failed but the money was deducted from my bank",
        "I need a refund for the annual plan I bought by mistake",
        "invoice shows the wrong amount and wrong company name",
        "how do I update my credit card details",
        "card declined when trying to upgrade my plan",
        "I cancelled my subscription but was still billed",
        "where can I download invoices for the last quarter",
        "the checkout page shows an error after entering my card",
        "promo code is not being applied at checkout",
        "UPI payment is stuck in pending state",
        "I want to switch from monthly to yearly billing",
        "tax is calculated incorrectly on my invoice",
        "payment gateway timeout but my order was not confirmed",
        "refund was approved but I have not received it yet",
    ],
    "TECHNICAL": [
        "the dashboard takes forever to load and then times out",
        "API returns 500 internal server error on the orders endpoint",
        "the mobile app crashes when I open the reports screen",
        "webhooks stopped being delivered to our endpoint",
        "file upload fails for files larger than 10MB",
        "data export to CSV produces an empty file",
        "the integration with Slack stopped syncing messages",
        "we get rate limit errors even though we are under the quota",
        "search results are not showing recently added items",
        "the app shows a blank white screen after the latest update",
        "notifications are not being sent to users",
        "API authentication fails with 401 using a valid key",
        "report generation is stuck at processing",
        "the page throws a JavaScript error in the console and buttons do nothing",
        "sync between the desktop and web app is not working",
    ],
    "FEATURE_REQUEST": [
        "it would be great to have a dark mode",
        "please add the ability to export reports as PDF",
        "can you add support for multiple currencies",
        "we would like bulk editing for records",
        "please consider adding keyboard shortcuts",
        "a calendar view for tasks would be really helpful",
        "could you add an integration with Microsoft Teams",
        "suggestion: let us customise the dashboard widgets",
        "we need role based permissions for our team members",
        "please allow scheduling reports to be emailed weekly",
        "it would help to have an audit log of user actions",
        "could the mobile app support offline mode",
        "please add Hindi language support",
        "feature idea: saved filters on the tickets page",
        "would love an API endpoint for bulk imports",
    ],
    "GENERAL": [
        "how do I get started with the platform",
        "what are your support hours",
        "where can I find the documentation for beginners",
        "do you offer discounts for students or non-profits",
        "I just wanted to say the new update is great",
        "how do I contact the sales team",
        "is there a community forum or user group",
        "what is the difference between the pro and business plans",
        "do you have any training webinars",
        "where is your privacy policy",
        "can I invite my team to try the product",
        "general question about how the product works",
        "is my data stored in India or abroad",
        "thank you for the quick help last week",
        "who should I talk to about a partnership",
    ],
}

# Domain vocabulary per category, combined with generic sentence frames below.
SUBJECTS: dict[str, list[str]] = {
    "ACCOUNT": ["login", "password reset", "2FA code", "SSO sign-in", "email verification",
                "account lock", "authenticator app", "profile email change", "session timeout",
                "account access"],
    "BILLING": ["payment", "refund", "invoice", "subscription charge", "credit card update",
                "checkout", "promo code", "UPI payment", "billing cycle", "double charge"],
    "TECHNICAL": ["API", "dashboard loading", "webhook delivery", "file upload", "CSV export",
                  "Slack integration", "mobile app", "search index", "report generation", "data sync"],
    "FEATURE_REQUEST": ["dark mode", "PDF export option", "bulk editing", "keyboard shortcuts",
                        "calendar view", "Teams integration", "custom dashboard widgets",
                        "audit log feature", "offline mode", "saved filters"],
    "GENERAL": ["getting started guide", "support hours", "pricing plans", "student discount",
                "sales contact", "community forum", "training webinar", "privacy policy",
                "data residency", "partnership"],
}

FRAMES: dict[str, list[str]] = {
    "problem": ["{s} is not working", "I'm having trouble with {s}", "{s} keeps failing",
                "problem with {s} since this morning", "{s} broke after the update",
                "can someone check the {s} issue", "issue regarding {s}", "{s} gives an error"],
    "request": ["please add {s}", "would love to see {s}", "any plans for {s}?",
                "request: {s}", "can you build {s}", "suggestion regarding {s}",
                "we really need {s}", "is {s} on the roadmap"],
    "question": ["question about {s}", "where can I find info on {s}", "can you tell me about {s}",
                 "what's the policy on {s}", "need details on {s}", "quick question on {s}",
                 "looking for information about {s}", "how does {s} work"],
}
CATEGORY_FRAMES = {"ACCOUNT": "problem", "BILLING": "problem", "TECHNICAL": "problem",
                   "FEATURE_REQUEST": "request", "GENERAL": "question"}

URGENCY: dict[str, list[str]] = {
    "CRITICAL": ["outage", "production down", "security breach", "data loss", "all users affected",
                 "emergency"],
    "HIGH": ["urgent", "blocking", "asap", "need it fixed today", "very frustrating",
             "multiple users affected"],
    "MEDIUM": ["when you can", "there is a workaround", "intermittent", "could you help",
               "not sure why", "affecting me"],
    "LOW": ["no rush", "just curious", "minor thing", "whenever convenient", "low priority",
            "small suggestion"],
}
URGENCY_FRAMES = ["{u}.", "this is {u}.", "note: {u}.", "{u}, please respond.", "status: {u}.",
                  "honestly {u}.", "({u})", "flagging as {u}."]

# Category-specific priority priors: feature requests and general questions
# are rarely critical; billing and technical issues skew higher.
PRIORITY_PRIORS: dict[str, dict[str, float]] = {
    "ACCOUNT": {"CRITICAL": 0.1, "HIGH": 0.35, "MEDIUM": 0.4, "LOW": 0.15},
    "BILLING": {"CRITICAL": 0.12, "HIGH": 0.38, "MEDIUM": 0.35, "LOW": 0.15},
    "TECHNICAL": {"CRITICAL": 0.2, "HIGH": 0.35, "MEDIUM": 0.33, "LOW": 0.12},
    "FEATURE_REQUEST": {"CRITICAL": 0.0, "HIGH": 0.07, "MEDIUM": 0.33, "LOW": 0.6},
    "GENERAL": {"CRITICAL": 0.0, "HIGH": 0.05, "MEDIUM": 0.4, "LOW": 0.55},
}

OPENERS = ["", "Hi team,", "Hello,", "Hey support,", "Good morning,", "Hi there,"]
CONTEXTS = [
    "",
    "This started yesterday.",
    "I'm on the business plan.",
    "Using Chrome on Windows.",
    "Happens on both web and mobile.",
    "Order id is #{n}.",
    "My workspace is acme-{n}.",
    "I already tried clearing cache.",
]
CLOSERS = ["", "Thanks.", "Thank you!", "Regards.", "Please advise."]


def _noise(text: str, rng: random.Random) -> str:
    if rng.random() < 0.25:
        text = text.lower()
    if rng.random() < 0.15:
        text = text.replace(",", "").replace(".", "")
    return " ".join(text.split())


def generate(n: int, seed: int, label_noise: float = 0.04) -> list[dict[str, str]]:
    rng = random.Random(seed)
    rows: list[dict[str, str]] = []
    categories = list(CATEGORIES)
    for _ in range(n):
        category = rng.choice(categories)
        priors = PRIORITY_PRIORS[category]
        priority = rng.choices(list(priors), weights=list(priors.values()))[0]
        use_template = rng.random() < 0.35
        if use_template:
            body, c_frame = rng.choice(CATEGORIES[category]), "template"
        else:
            frames = FRAMES[CATEGORY_FRAMES[category]]
            f_idx = rng.randrange(len(frames))
            body, c_frame = frames[f_idx].format(s=rng.choice(SUBJECTS[category])), f"f{f_idx}"
        u_idx = rng.randrange(len(URGENCY_FRAMES))
        urgency = URGENCY_FRAMES[u_idx].format(u=rng.choice(URGENCY[priority]))
        # ~30% of real tickets carry no urgency cue: label them with the category default
        # so the model learns a calm baseline instead of guessing from unrelated words.
        if rng.random() < 0.3:
            urgency, u_idx = "", -1
            priority = "LOW" if category in ("FEATURE_REQUEST", "GENERAL") else "MEDIUM"
        parts = [
            rng.choice(OPENERS),
            body[0].upper() + body[1:] + ".",
            rng.choice(CONTEXTS).format(n=rng.randint(1000, 99999)),
            urgency[:1].upper() + urgency[1:],
            rng.choice(CLOSERS),
        ]
        text = _noise(" ".join(p for p in parts if p), rng)
        true_category, true_priority = category, priority
        # Simulate real-world annotation noise so metrics are not unrealistically perfect.
        if rng.random() < label_noise:
            category = rng.choice(categories)
        if rng.random() < label_noise:
            priority = rng.choice(list(URGENCY))
        rows.append(
            {
                "text": text,
                "category": category,
                "priority": priority,
                # Groups are sentence *frames*: the trainer holds out whole frames so the
                # score reflects new phrasings of known problems, not memorised rows.
                "category_group": f"{true_category}-{c_frame}",
                "priority_group": f"u{u_idx}",
            }
        )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=3000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", type=Path, default=Path(__file__).parent.parent / "data" / "tickets.csv")
    args = parser.parse_args()
    rows = generate(args.n, args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {args.out}")


if __name__ == "__main__":
    main()
