import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { validateAwesomeList, AwesomeList } from "../../src/types";

const CACHE_DIR = path.resolve(__dirname, "cache");
const STORE_DIR = path.join(CACHE_DIR, "store");
const NIX_STORE_FILE = path.join(CACHE_DIR, "nix-store.json");
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

interface NixStoreEntry {
  hash: string;
  url: string;
  status: number | string;
  date: string;
  crawledAt: string;
  expiresAt: string;
}

interface NixStore {
  version: number;
  updatedAt: string;
  store: Record<string, NixStoreEntry>;
}

function parseCrawlerArgs(): { inputPath: string; forceFetch: boolean } {
  const args = process.argv.slice(2);
  let inputPath = "";
  let forceFetch = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--input" || arg === "-i") {
      inputPath = args[++i];
    } else if (arg === "--force" || arg === "--no-cache") {
      forceFetch = true;
    } else if (!inputPath && !arg.startsWith("-")) {
      inputPath = arg;
    }
  }

  if (!inputPath) {
    console.error("Error: Missing required input file path.\n");
    console.log("Usage:");
    console.log("  npm run crawl -- --input <path/to/input.json> [--force]");
    console.log("  npx ts-node scripts/crawler/index.ts <path/to/input.json> [--force]\n");
    process.exit(1);
  }

  return {
    inputPath: path.resolve(inputPath),
    forceFetch,
  };
}

function loadAndValidateDataset(inputPath: string): AwesomeList {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input JSON file not found: ${inputPath}`);
  }

  const rawContent = fs.readFileSync(inputPath, "utf8");
  const rawJson = JSON.parse(rawContent);
  return validateAwesomeList(rawJson);
}

function getUrlHash(url: string): string {
  return crypto.createHash("sha256").update(url.trim()).digest("hex").slice(0, 32);
}

function ensureCacheDirs() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function loadNixStore(): NixStore {
  ensureCacheDirs();
  if (fs.existsSync(NIX_STORE_FILE)) {
    try {
      const content = fs.readFileSync(NIX_STORE_FILE, "utf8");
      return JSON.parse(content);
    } catch {
      // Fallback on corrupt file
    }
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    store: {},
  };
}

function saveNixStore(store: NixStore) {
  ensureCacheDirs();
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(NIX_STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function getCachedEntry(url: string, forceFetch: boolean): NixStoreEntry | null {
  const hash = getUrlHash(url);
  const entryFile = path.join(STORE_DIR, `${hash}.json`);

  if (!forceFetch && fs.existsSync(entryFile)) {
    try {
      const entry: NixStoreEntry = JSON.parse(fs.readFileSync(entryFile, "utf8"));
      const now = new Date().getTime();
      const expires = new Date(entry.expiresAt).getTime();
      if (now < expires) {
        return entry;
      }
    } catch {
      // Cache invalid or corrupt, proceed to crawl
    }
  }
  return null;
}

function setCachedEntry(url: string, status: number | string, date: string): NixStoreEntry {
  ensureCacheDirs();
  const hash = getUrlHash(url);
  const now = new Date();
  const expires = new Date(now.getTime() + DEFAULT_TTL_MS);

  const entry: NixStoreEntry = {
    hash,
    url,
    status,
    date,
    crawledAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  // Save individual store object
  const entryFile = path.join(STORE_DIR, `${hash}.json`);
  fs.writeFileSync(entryFile, JSON.stringify(entry, null, 2), "utf8");

  // Save in main nix-store.json
  const nixStore = loadNixStore();
  nixStore.store[hash] = entry;
  saveNixStore(nixStore);

  return entry;
}

async function checkUrl(url: string, forceFetch: boolean) {
  const cached = getCachedEntry(url, forceFetch);
  if (cached) {
    return {
      status: cached.status,
      date: cached.date,
      fromCache: true,
      hash: cached.hash,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const html = await res.text();
    const lastModifiedHeader = res.headers.get("last-modified");

    // Look for copyright / post date in HTML
    const dates = html.match(/\b(202[0-6])[-/](0[1-9]|1[0-2])\b/g);
    let detected = "";
    if (dates && dates.length > 0) {
      const sorted = Array.from(new Set(dates)).sort().reverse();
      detected = sorted[0];
    } else if (lastModifiedHeader) {
      const d = new Date(lastModifiedHeader);
      if (!isNaN(d.getTime())) {
        detected = d.toISOString().slice(0, 7);
      }
    }

    const finalStatus = res.status;
    const finalDate = detected || "Active";

    const saved = setCachedEntry(url, finalStatus, finalDate);

    return {
      status: finalStatus,
      date: finalDate,
      fromCache: false,
      hash: saved.hash,
    };
  } catch (err: any) {
    const statusStr = err?.name === "AbortError" ? "Timeout" : err?.message || "Failed";
    const dateStr = "Unreachable";
    const saved = setCachedEntry(url, statusStr, dateStr);
    return {
      status: statusStr,
      date: dateStr,
      fromCache: false,
      hash: saved.hash,
    };
  }
}

async function runAudit() {
  const { inputPath, forceFetch } = parseCrawlerArgs();

  console.log("=== CRAWLING AND AUDITING AWESOME LIST SOURCE ===");
  console.log(`Input File: ${inputPath}`);
  if (forceFetch) {
    console.log("Cache bypass requested (--force)\n");
  } else {
    console.log("Nix-store JSON cache enabled (TTL 24h)\n");
  }

  const list = loadAndValidateDataset(inputPath);
  const auditResults: any[] = [];

  console.log(`Dataset: ${list.title} (${list.slug})`);
  for (const section of list.sections) {
    console.log(`\nSection: ${section.title}`);
    if (section.items && section.items.length > 0) {
      for (const item of section.items) {
        const info = await checkUrl(item.url, forceFetch);
        const cacheTag = info.fromCache ? `[CACHE HIT:${info.hash.slice(0, 8)}]` : `[CRAWLED:${info.hash.slice(0, 8)}]`;
        console.log(` ${cacheTag} ${item.title} (${item.url}) -> Status: ${info.status}, Date: ${info.date}`);
        auditResults.push({
          list: list.slug,
          section: section.title,
          title: item.title,
          url: item.url,
          status: info.status,
          date: info.date,
          fromCache: info.fromCache,
          nixHash: info.hash,
        });
      }
    }
  }

  console.log("\n=== AUDIT SUMMARY JSON ===");
  console.log(JSON.stringify(auditResults, null, 2));
}

runAudit();
