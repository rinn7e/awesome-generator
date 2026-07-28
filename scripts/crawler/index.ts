import fs from "fs";
import path from "path";
import crypto from "crypto";
import { chromium, Browser } from "playwright";
import { AwesomeList } from "../../src/types";

const STORE_DIR = path.join(__dirname, "cache", "store");
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
const MIN_TELEGRAM_SUBSCRIBERS = 50;

interface NixStoreEntry {
  hash: string;
  url: string;
  status: number | string;
  date: string;
  crawledAt: string;
  expiresAt: string;
}

let sharedBrowser: Browser | null = null;

async function getSharedBrowser(): Promise<Browser> {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({ headless: true });
  }
  return sharedBrowser;
}

async function closeSharedBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

function getUrlHash(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 32);
}

function ensureCacheDirs() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function getCachedEntry(url: string, forceFetch: boolean): NixStoreEntry | null {
  if (forceFetch) return null;
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

  // Save individual content-addressed store file (e.g. cache/store/<hash>.json)
  const entryFile = path.join(STORE_DIR, `${hash}.json`);
  fs.writeFileSync(entryFile, JSON.stringify(entry, null, 2), "utf8");

  return entry;
}

/**
 * Scan Facebook & complex JS web links using Playwright DOM rendering
 */
async function scanPlaywrightDom(url: string) {
  let context = null;
  let page = null;
  try {
    const browser = await getSharedBrowser();
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "en-US",
    });
    page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(1000);

    const bodyText = (await page.innerText("body")).toLowerCase();

    const isUnavailable =
      bodyText.includes("this content isn't available right now") ||
      bodyText.includes("this content isn't available") ||
      bodyText.includes("isn't available right now") ||
      bodyText.includes("this page isn't available") ||
      bodyText.includes("content not found");

    const finalStatus = isUnavailable ? 404 : 200;
    const finalDate = isUnavailable ? "Unreachable" : "Active";
    return { status: finalStatus, date: finalDate };
  } catch {
    return { status: 404, date: "Unreachable" };
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  }
}

/**
 * Parse Telegram subscriber/member count from preview page HTML
 */
function parseTelegramSubscriberCount(html: string): number | null {
  const extraMatch = html.match(/class=["']tgme_page_extra["'][^>]*>([^<]+)</i);
  if (!extraMatch) return null;

  const text = extraMatch[1];
  const countMatch = text.match(/([\d\s.,]+)\s*([KkMm])?\s*(subscribers|members)/i);
  if (!countMatch) return null;

  let numStr = countMatch[1].replace(/[\s,]/g, "");
  let num = parseFloat(numStr);
  const unit = (countMatch[2] || "").toLowerCase();
  if (unit === "k") num *= 1000;
  if (unit === "m") num *= 1000000;

  return Math.round(num);
}

/**
 * Audit Telegram resource for public channel/group existence and credibility
 */
async function auditTelegramUrl(url: string) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const html = await res.text();

    const isPersonalOrNonExistent =
      html.includes("you can contact @") ||
      html.includes("you can contact") ||
      !html.includes("tgme_page_extra");

    if (isPersonalOrNonExistent) {
      return {
        status: 404,
        date: "Unreachable (Not a Public Channel/Group or Non-existent)",
      };
    }

    const count = parseTelegramSubscriberCount(html);

    if (count === null || count < MIN_TELEGRAM_SUBSCRIBERS) {
      return {
        status: 404,
        date: `Unreachable (Low Subscribers: ${count ?? 0} < ${MIN_TELEGRAM_SUBSCRIBERS})`,
      };
    }

    return {
      status: res.status,
      date: `Active (${count} members)`,
    };
  } catch {
    return { status: 404, date: "Unreachable" };
  }
}

async function checkUrl(url: string, forceFetch: boolean, matchPattern?: string) {
  const shouldForce = forceFetch || (Boolean(matchPattern) && url.includes(matchPattern!));
  const cached = getCachedEntry(url, shouldForce);
  if (cached) {
    return {
      status: cached.status,
      date: cached.date,
      fromCache: true,
      hash: cached.hash,
    };
  }

  // RULE 1: Facebook-related links MUST NOT use basic fetch(). Scan DOM via Playwright headless browser!
  if (url.includes("facebook.com") || url.includes("fb.com")) {
    const { status, date } = await scanPlaywrightDom(url);
    const saved = setCachedEntry(url, status, date);
    return {
      status,
      date,
      fromCache: false,
      hash: saved.hash,
    };
  }

  // RULE 2: Telegram links MUST be audited for public channel/group existence & credibility (>= 50 subscribers/members)!
  if (url.includes("t.me/") || url.includes("telegram.me/")) {
    const { status, date } = await auditTelegramUrl(url);
    const saved = setCachedEntry(url, status, date);
    return {
      status,
      date,
      fromCache: false,
      hash: saved.hash,
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
  } catch {
    // Fallback to Playwright DOM rendering if fetch() failed (e.g. SSL/Cloudflare/CORS)
    const { status, date } = await scanPlaywrightDom(url);
    const saved = setCachedEntry(url, status, date);
    return {
      status,
      date,
      fromCache: false,
      hash: saved.hash,
    };
  }
}

async function runAudit() {
  const { inputPath, forceFetch, verbose, matchPattern } = parseCrawlerArgs();

  console.log("=== CRAWLING AND AUDITING AWESOME LIST SOURCE ===");
  console.log(`Input File: ${inputPath}`);
  if (forceFetch) console.log("Cache bypass requested (--force)");
  if (matchPattern) console.log(`Target link filter / targeted force requested: --match "${matchPattern}"`);
  if (verbose) console.log("Verbose output enabled (--verbose)");
  console.log("");

  const rawJson = fs.readFileSync(inputPath, "utf8");
  const dataset: AwesomeList = JSON.parse(rawJson);

  console.log(`Dataset: ${dataset.title} (${dataset.slug})`);
  console.log("");

  let totalCount = 0;
  let cachedCount = 0;
  let crawledCount = 0;
  let unreachableCount = 0;

  for (const section of dataset.sections) {
    let printedSectionHeader = false;

    const processItem = async (title: string, url: string, indent: string = "  ") => {
      totalCount++;
      const result = await checkUrl(url, forceFetch, matchPattern);

      if (result.fromCache) {
        cachedCount++;
      } else {
        crawledCount++;
      }

      const isUnreachable =
        result.status === 404 ||
        result.date.includes("Unreachable") ||
        result.status === "Timeout" ||
        result.status === "Failed" ||
        result.status === "fetch failed";

      if (isUnreachable) {
        unreachableCount++;
      }

      // Print cached entries ONLY if verbose is true; always print newly crawled or error entries
      if (verbose || !result.fromCache || isUnreachable) {
        if (!printedSectionHeader) {
          console.log(`Section: ${section.title}`);
          printedSectionHeader = true;
        }
        const cacheTag = result.fromCache ? " [CACHE]" : " [CRAWLED:" + result.hash.slice(0, 8) + "]";
        console.log(
          `${indent}${cacheTag} ${title} (${url}) -> Status: ${result.status}, Date: ${result.date}`
        );
      }
    };

    if (section.items && section.items.length > 0) {
      for (const item of section.items) {
        await processItem(item.title, item.url, "  ");
      }
    }

    if (section.subsections && section.subsections.length > 0) {
      for (const sub of section.subsections) {
        if (sub.items && sub.items.length > 0) {
          for (const item of sub.items) {
            await processItem(item.title, item.url, "    ");
          }
        }
      }
    }
  }

  await closeSharedBrowser();
  console.log("");
  console.log(
    `=== AUDIT SUMMARY: Total: ${totalCount} | Crawled: ${crawledCount} | Cached: ${cachedCount} | Unreachable: ${unreachableCount} ===`
  );
}

function parseCrawlerArgs() {
  const args = process.argv.slice(2);
  let inputPath = "";
  let forceFetch = false;
  let verbose = false;
  let matchPattern = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === "--force") {
      forceFetch = true;
    } else if (args[i] === "--verbose") {
      verbose = true;
    } else if ((args[i] === "--match" || args[i] === "--url") && args[i + 1]) {
      matchPattern = args[i + 1];
      i++;
    } else if (!inputPath && !args[i].startsWith("-")) {
      inputPath = args[i];
    }
  }

  if (!inputPath) {
    console.error("Error: Please specify input JSON file via --input <path>");
    process.exit(1);
  }

  return { inputPath, forceFetch, verbose, matchPattern };
}

runAudit();
