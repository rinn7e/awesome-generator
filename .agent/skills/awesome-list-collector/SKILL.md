---
name: awesome-list-collector
description: >-
  Gather, research, and curate high-quality entries for Awesome list JSON datasets.
  Enforces strict live external URL verification, official domain preference,
  Telegram community credibility checks, and prevents hallucinated URLs or dummy data.
---

# Awesome List Collector & Dataset Curator Skill

Use this skill whenever gathering new entries or creating an initial JSON dataset file (e.g., `cambodia-housing.json`, `cambodia-jobs.json`) for an Awesome list.

---

## ⚠️ MANDATORY RULE: Strict Live Verification (NO HALLUCINATIONS)

1. **NO HALLUCINATED OR GUESSED URLS**:
   - You MUST NOT guess, assume, or synthesize URLs, Facebook handles, or Telegram usernames from memory or intuition.
   - Every single URL, handle, domain, and title MUST be explicitly verified against live external sources using Web Search (`search_web`), HTTP inspection (`run_command`), or Playwright DOM scanning.
2. **VERIFY OFFICIAL ORGANIZATIONAL DOMAINS**:
   - Always prefer official corporate, NGO, or state web domains (`.org`, `.com`, `.gov.kh`) over social media profile pages whenever available.
   - Never use personal user profile links (e.g. Facebook profiles displaying an `+ Add friend` button instead of a public Page, or Telegram personal user handles displaying `If you have Telegram, you can contact @...`).
3. **TELEGRAM COMMUNITY CREDIBILITY AUDIT**:
   - Telegram links (`t.me/*`) MUST represent active public channels or groups.
   - You MUST verify that the Telegram resource has **at least 50 subscribers or members**. Any channel with fewer than 50 members or displaying personal contact prompts MUST be excluded.

---

## 📋 Step-by-Step Workflow for Initial Dataset Creation

### 1. External Research & Gathering
- Perform targeted web searches to discover legitimate, established real-world portals, organizations, services, and developers for the topic.
- Verify that each target entity's URL loads properly and represents an active, reachable website or public page.

### 2. Format JSON Dataset
Construct the initial JSON dataset file following the `awesome-generator` `io-ts` schema contract:

```json
{
  "slug": "awesome-<topic>",
  "title": "<Topic Name>",
  "description": "Comprehensive curated list of <topic> resources.",
  "sections": [
    {
      "title": "<General Category Name>",
      "items": [
        {
          "title": "<Verified Item Title>",
          "url": "https://www.verified-domain.com",
          "description": "<Concise non-promotional 1-sentence description>",
          "lastUpdated": "2026-07"
        }
      ]
    }
  ]
}
```

### 3. Apply Dataset Sorting Rules
- **Sections (Categories)**: Order sections logically from **General / Common** resources down to **Specific / Specialized** resources.
- **Entries (Items)**: Sort items within each section **Alphabetically** by title (A to Z).

### 4. Run Schema Validation & Generator
Run `awesome-generator` to validate schema compliance and render the initial `README.md`:

```bash
pnpm run generate -- --input /path/to/dataset.json --output /path/to/README.md
```

### 5. Execute Nix-Store Crawler Audit
Run the crawler to verify HTTP reachability across all entries:

```bash
pnpm run crawl -- --input /path/to/dataset.json
```

- Ensure **`Unreachable: 0`**. If any link reports status `404` or `Unreachable`, locate the correct live URL or remove the item before finalizing.
