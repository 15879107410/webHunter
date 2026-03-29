import * as cheerio from "cheerio";
import { chromium } from "playwright";

type BrowserSignal = {
  kind: "link" | "button" | "tab" | "dropdown" | "form" | "summary";
  label: string;
};

export type BrowserPageSnapshot = {
  url: string;
  pageType: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  links: { href: string; text: string }[];
  ctas: string[];
  signals: BrowserSignal[];
  bodyText: string;
  rawHtml: string;
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function dedupeSignals(signals: BrowserSignal[]) {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.kind}:${signal.label.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function extractSignalsFromHtml(html: string) {
  const $ = cheerio.load(html);
  const signals: BrowserSignal[] = [];
  const seen = new Set<string>();

  const addSignal = (kind: BrowserSignal["kind"], label: string) => {
    const cleaned = normalizeText(label);
    if (!cleaned || cleaned.length > 80) {
      return;
    }

    const key = `${kind}:${cleaned.toLowerCase()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    signals.push({ kind, label: cleaned });
  };

  $("a[href]").each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      addSignal("link", text);
    }
  });

  $("button,[role='button'],input[type='button'],input[type='submit'],summary").each((_, el) => {
    const node = $(el);
    const text = node.text().trim() || node.attr("aria-label")?.trim() || node.attr("value")?.trim() || "";
    if (!text) {
      return;
    }

    const role = (node.attr("role") ?? "").toLowerCase();
    const tag = (node[0]?.tagName ?? "").toLowerCase();
    const ariaHasPopup = (node.attr("aria-haspopup") ?? "").toLowerCase();
    const isTab = role === "tab" || node.attr("aria-controls") || node.attr("data-state") === "active" || node.attr("data-tab");
    const isDropdown = ariaHasPopup === "menu" || ariaHasPopup === "listbox" || /more|更多|menu|dropdown|filter/i.test(text);

    if (isTab) {
      addSignal("tab", text);
    } else if (isDropdown) {
      addSignal("dropdown", text);
    } else if (tag === "input") {
      addSignal("form", text);
    } else if (tag === "summary") {
      addSignal("summary", text);
    } else {
      addSignal("button", text);
    }
  });

  return signals;
}

function isActionableCta(text: string) {
  return /^(start|get|book|try|sign|contact|create|launch|join|request|talk|watch|see|explore|use|generate)\b/i.test(text)
    || /(free trial|start free|book demo|contact sales|talk to sales|create free)/i.test(text);
}

export async function loadRenderedPage(url: string, pageType: string): Promise<BrowserPageSnapshot | null> {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 1800 },
      userAgent: "webHunterBot/0.2 (+https://webhunter.local)"
    });
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    const rawHtml = await page.content();
    const $ = cheerio.load(rawHtml);
    $("script, style, noscript, svg").remove();

    const title = $("title").first().text().trim();
    const description = $('meta[name="description"]').attr("content")?.trim() ?? "";
    const headings = $("h1, h2, h3")
      .map((_, el) => normalizeText($(el).text().trim()))
      .get()
      .filter(Boolean)
      .slice(0, 12);
    const paragraphs = $("p")
      .map((_, el) => normalizeText($(el).text().trim()))
      .get()
      .filter((text) => text.length > 40)
      .slice(0, 24);
    const links = $("a[href]")
      .map((_, el) => {
        const href = $(el).attr("href") ?? "";
        const text = normalizeText($(el).text().trim());
        return { href, text };
      })
      .get()
      .filter((item) => item.href);
    const signals = extractSignalsFromHtml(rawHtml);
    const ctas = dedupeSignals(signals)
      .map((signal) => signal.label)
      .filter(Boolean)
      .filter(isActionableCta)
      .slice(0, 8);
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();

    await context.close();
    await browser.close();

    return {
      url,
      pageType,
      title,
      description,
      headings,
      paragraphs,
      links,
      ctas,
      signals,
      bodyText,
      rawHtml
    };
  } catch (error) {
    // Keep the deep-crawl path soft-failing, but log the reason for debugging.
    // eslint-disable-next-line no-console
    console.warn("[crawl] rendered page failed", error instanceof Error ? error.message : String(error));
    try {
      await browser?.close();
    } catch {
      // ignore close errors
    }

    return null;
  }
}
