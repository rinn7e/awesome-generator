# Source Crawler & Health Auditor

This tool crawls all URLs defined in the structured data files (such as `src/data/cambodia-jobs.ts`), checks HTTP reachability, follows redirects, and extracts recent content update timestamps.

---

## Features

- **Reachability Auditing**: Detects HTTP status codes (200, 403, 404, etc.) and dead/unreachable domains.
- **Timestamp Extraction**: Scans page headers (`Last-Modified`) and HTML body content for `YYYY-MM` date stamps to verify entry recency.
- **Nix-like Content Store Cache**: Caches audit records indexed by SHA-256 URL hashes in `scripts/crawler/cache/` (TTL: 24 hours).
- **JSON Audit Export**: Prints a clean JSON summary of all audited sources.

---

## How Update Detection Works

The crawler uses a multi-layered strategy to determine the most recent content update:

1. **HTML Body Regex Scanning (Primary)**:
   - Scans the raw fetched HTML using the pattern `/\b(202[0-6])[-/](0[1-9]|1[0-2])\b/g`.
   - Extracts date stamps embedded in `<meta>` tags (e.g. `article:published_time`), job post headers, and copyright footers.
2. **Deduplication & Chronological Sorting**:
   - Deduplicates all matched dates and sorts them in descending order (`.sort().reverse()`) to pick the newest `YYYY-MM` timestamp.
3. **HTTP `Last-Modified` Header (Fallback)**:
   - If no inline dates exist in the HTML body, it inspects the HTTP response `Last-Modified` header sent by the web server.
4. **Live Status Fallback**:
   - If a site responds with `HTTP 200` or `403` but uses client-side rendering (SPA) without raw dates in initial HTML, it marks the status as `Active`.

---

## Nix-Store JSON Caching

Audit results are cached under `scripts/crawler/cache/` using SHA-256 content hashes:
- `scripts/crawler/cache/nix-store.json` - Consolidated cache index.
- `scripts/crawler/cache/store/<hash>.json` - Individual content-addressed cache object.

### Cache Entry Schema:
```json
{
  "hash": "540f51d74fe4db27cf57f4da83a5e111",
  "url": "https://www.bongthom.com",
  "status": 200,
  "date": "Active",
  "crawledAt": "2026-07-28T10:26:45.000Z",
  "expiresAt": "2026-07-29T10:26:45.000Z"
}
```

---

## Usage

### Run with cache (Default):
```bash
npm run crawl
```

### Bypass cache & force re-crawl:
```bash
npm run crawl -- --force
```

---

## Sample Output

```text
=== CRAWLING AND AUDITING ALL AWESOME LIST SOURCES ===
Nix-store JSON cache enabled (TTL 24h)

Section: Job Portals
 - [CACHE HIT:540f51d7] BongThom (https://www.bongthom.com) -> Status: 200, Date: Active
 - [CACHE HIT:912331f4] CamHR (https://www.camhr.com) -> Status: 200, Date: Active
```

---

## Maintenance Workflow

1. Run `npm run crawl` to audit dataset health.
2. If any link returns `Unreachable` or `404`, update or remove the item in `src/data/*.ts`.
3. Re-run generator to produce updated markdown:
   ```bash
   npm run generate
   ```
