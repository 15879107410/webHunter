import * as cheerio from "cheerio";
import type {
  AnalysisInputSnapshot,
  AnalysisResult,
  CrawledPageSummary,
  InsightItem,
  PricingPlan,
  ResearchCard
} from "@webhunter/shared";
import { loadRenderedPage } from "./browser-crawl.js";
import { analyzeWithLlm } from "./llm-analyzer.js";

type CrawlPage = {
  url: string;
  pageType: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  links: { href: string; text: string }[];
  ctas: string[];
  signals: {
    kind: "link" | "button" | "tab" | "dropdown" | "form" | "summary";
    label: string;
  }[];
  bodyText: string;
  rawHtml: string;
};

const PRICE_TOKEN_REGEX = /[$€£]\s*\d+(?:[.,]\d+)?(?:\s*\/\s*(?:month|year|mo|yr|月|年))?|\d+(?:[.,]\d+)?\s*(?:USD|usd|美元|元)(?:\s*\/\s*(?:month|year|月|年))?/g;

const KEY_PAGE_PATTERNS = [
  {
    type: "pricing",
    pattern: /pricing|plans|plan/i,
    pathPattern: /(^|\/)(pricing(?:-[^/]+)?|plans?|fees?)(\/|$)/i
  },
  {
    type: "about",
    pattern: /about|company/i,
    pathPattern: /(^|\/)(about|company)(\/|$)/i
  },
  {
    type: "features",
    pattern: /features|product/i,
    pathPattern: /(^|\/)(features|product)(\/|$)/i
  },
  {
    type: "faq",
    pattern: /faq|faqs|questions/i,
    pathPattern: /(^|\/)(faq|faqs|questions)(\/|$)/i
  }
];

const KEY_PAGE_FALLBACK_PATHS: Record<string, string[]> = {
  pricing: ["/pricing", "/pricing-for-pro", "/plans", "/plan"],
  about: ["/about", "/company"],
  features: ["/features", "/product"],
  faq: ["/faq", "/questions"]
};

const DOMAIN_SIGNAL_GROUPS = [
  {
    key: "fintech",
    labels: ["金融科技", "B2B"],
    summary: "这是一个面向商家或企业的支付与金融基础设施产品，核心是在收款、计费、资金流转或金融能力集成上替代复杂人工流程。",
    users: ["支付团队 / 金融团队", "开发者 / 工程团队", "企业管理者"],
    keywords: [
      "payment",
      "payments",
      "billing",
      "invoice",
      "checkout",
      "financial",
      "fintech",
      "merchant",
      "merchants",
      "payout",
      "bank",
      "banking",
      "card issuing",
      "fraud"
    ]
  },
  {
    key: "developer",
    labels: ["开发工具", "B2B", "SaaS"],
    summary: "这是一个面向开发者和技术团队的工具，核心是在研发流程、基础设施、集成或协作效率上省时间。",
    users: ["开发者 / 工程团队", "DevOps / 平台团队", "技术负责人"],
    keywords: [
      "developer",
      "developers",
      "engineering",
      "engineers",
      "devops",
      "api",
      "sdk",
      "github",
      "gitlab",
      "backend",
      "frontend",
      "deployment",
      "infrastructure",
      "environment",
      "database"
    ]
  },
  {
    key: "creative",
    labels: ["创意工具", "AI", "SaaS"],
    summary: "这是一个面向创作者、内容团队或营销团队的 AI 创作工具，核心是在视频、图片、文案或品牌素材生产上更快出结果。",
    users: ["创作者 / 内容团队", "营销与增长团队", "独立开发者 / 个人创作者"],
    keywords: [
      "video",
      "videos",
      "image",
      "images",
      "avatar",
      "animation",
      "creative",
      "creator",
      "creators",
      "design",
      "brand",
      "ugc",
      "cinematic",
      "photo",
      "content",
      "template"
    ]
  },
  {
    key: "agent",
    labels: ["AI Agent", "生产力", "AI"],
    summary: "这是一个面向知识工作者、个人创作者或小团队的 AI agent 工具，核心是把原本需要自己拆解和执行的一串任务交给系统自动完成。",
    users: ["知识工作者 / 运营人员", "独立开发者 / 个人创作者", "小团队负责人"],
    keywords: [
      "agent",
      "agents",
      "plan",
      "execute",
      "task",
      "tasks",
      "workflow",
      "automation",
      "automate",
      "research",
      "report",
      "reports",
      "slides",
      "website",
      "websites",
      "browsercomp",
      "gaia"
    ]
  },
  {
    key: "marketing",
    labels: ["营销增长", "SaaS", "B2B"],
    summary: "这是一个面向营销或增长团队的工具，核心是更快拿流量、产内容、管理投放或提升转化效率。",
    users: ["营销与增长团队", "品牌团队", "中小企业经营者"],
    keywords: [
      "marketing",
      "growth",
      "seo",
      "campaign",
      "ads",
      "advertising",
      "social media",
      "lead",
      "conversion",
      "ugc ad"
    ]
  },
  {
    key: "ecommerce",
    labels: ["电商工具", "B2B", "SaaS"],
    summary: "这是一个面向卖家或电商品牌的工具，核心是提升经营效率、转化率或商品内容生产效率。",
    users: ["电商卖家", "DTC 品牌团队", "运营团队"],
    keywords: [
      "shopify",
      "ecommerce",
      "e-commerce",
      "store",
      "seller",
      "amazon",
      "product showcase",
      "product image"
    ]
  }
] as const;

const MODEL_BRAND_KEYWORDS = ["kling", "sora", "veo", "seedance", "wan", "hailuo", "runway", "minimax", "pika", "luma"];

function normalizeUrl(input: string) {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  return new URL(withProtocol).toString();
}

function textSample(items: string[], fallback: string) {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  return cleaned[0] ?? fallback;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function normalizeDisplayText(text: string) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPriceToken(token: string) {
  const normalized = token.replace(/\s+/g, "");

  if (/[$€£]\d/.test(normalized) && normalized.length > 1) {
    return normalized;
  }

  if (/\d(?:[.,]\d+)?(?:USD|usd|美元|元)/.test(normalized)) {
    return normalized;
  }

  return null;
}

function parsePriceValue(token: string) {
  const numeric = token.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
  const value = Number.parseFloat(numeric);
  return Number.isFinite(value) ? value : null;
}

function normalizePriceIdentity(token: string) {
  return token.replace(/\/(?:month|year|mo|yr|月|年)$/i, "");
}

function normalizePlanLabel(label: string) {
  return label
    .replace(/_/g, " ")
    .replace(/\bmembership\b/gi, "")
    .replace(/\bpackage\b/gi, "")
    .replace(/\bmonthly\b/gi, "月度")
    .replace(/\bannual\b/gi, "年度")
    .replace(/\bplan\b/gi, "计划")
    .replace(/\b([A-E])\b/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/月度 计划/g, "月度计划")
    .replace(/年度 计划/g, "年度计划")
    .trim();
}

function extractPricePoints(pricingText: string) {
  const matches = Array.from(pricingText.matchAll(PRICE_TOKEN_REGEX));
  const scored = new Map<string, { token: string; score: number; index: number }>();

  for (const match of matches) {
    const rawToken = match[0];
    const token = cleanPriceToken(rawToken);
    const index = match.index ?? 0;
    if (!token) continue;

    const context = pricingText.slice(Math.max(0, index - 96), index + rawToken.length + 96).toLowerCase();
    const value = parsePriceValue(token);
    let score = 0;

    if (/(monthly|annual|yearly|month|year|subscription|subscribe|plan|package|membership|monthly plan|年度计划|月度计划|订阅|月|年)/i.test(context)) {
      score += 8;
    }
    if (/(pricing|price|desk|desktop|pro|starter|team|enterprise|most popular|最受欢迎|购买)/i.test(context)) {
      score += 4;
    }
    if (/(image|credit|token|request|usage|per image|按量|每张|每次|每个)/i.test(context)) {
      score -= 5;
    }
    if (value !== null && value < 1) {
      score -= 3;
    }
    if (/[$€£]\d+(?:[.,]\d+)?(?:\/(?:month|year|mo|yr|月|年))?$/i.test(token)) {
      score += 1;
    }

    const identity = normalizePriceIdentity(token);
    const existing = scored.get(identity);
    const tokenHasCycle = /\/(?:month|year|mo|yr|月|年)$/i.test(token);
    const existingHasCycle = existing ? /\/(?:month|year|mo|yr|月|年)$/i.test(existing.token) : false;

    if (
      !existing
      || score > existing.score
      || (score === existing.score && tokenHasCycle && !existingHasCycle)
      || (score === existing.score && tokenHasCycle === existingHasCycle && index < existing.index)
    ) {
      scored.set(identity, { token, score, index });
    }
  }

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.token)
    .slice(0, 12);
}

function extractPricingPlans(pricingText: string) {
  const plans: PricingPlan[] = [];
  const regex = /"(monthly_membership_package|annual_membership_package_[a-z])":"([^"]+)".{0,420}?(\$\d+(?:\.\d+)?(?:\/(?:month|year|mo|yr|月|年))?)/gi;

  for (const match of pricingText.matchAll(regex)) {
    const rawKey = match[1] ?? "";
    const rawLabel = match[2] ?? "";
    const rawPrice = match[3] ?? "";
    const label = normalizePlanLabel(rawLabel || rawKey);
    const price = cleanPriceToken(rawPrice);

    if (!label || !price) continue;

    const existingIndex = plans.findIndex((item) => item.label === label);
    const nextPlan = { label, price };

    if (existingIndex >= 0) {
      plans[existingIndex] = nextPlan;
    } else {
      plans.push(nextPlan);
    }
  }

  return plans.slice(0, 8);
}

function countMatches(text: string, keywords: readonly string[]) {
  const normalized = text.toLowerCase();
  return keywords.reduce((score, keyword) => score + (normalized.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

function rankSignals(text: string) {
  return DOMAIN_SIGNAL_GROUPS
    .map((group) => ({
      ...group,
      score: countMatches(text, group.keywords)
    }))
    .sort((a, b) => b.score - a.score);
}

function countDistinctModelBrands(text: string) {
  const normalized = text.toLowerCase();
  return MODEL_BRAND_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length;
}

function detectArchetype(text: string) {
  const normalized = text.toLowerCase();
  const modelBrandCount = countDistinctModelBrands(normalized);
  const hasAggregatorSignals =
    modelBrandCount >= 3
    && /(one platform|single dashboard|switch between|multiple subscriptions|all within a single|all-in-one|all in one|different top-tier ai models|choose from multiple models|多个模型|统一面板|统一工作台|切换模型)/i.test(normalized);

  if (hasAggregatorSignals) {
    return {
      key: "model-hub",
      categories: ["多模型聚合平台", "AI 视频工作台", "创意工具"],
      coreValue: "把多个视频生成模型整合进一个统一工作台，让用户不用来回切平台、重复买订阅或分别研究每个模型的使用方式。",
      summary: "这不是单一的视频生成模型，而是一个把多个 AI 视频模型整合到同一个工作台里的聚合平台。用户买单不是为了某一个模型本身，而是为了更方便地比较、切换和调用不同模型。",
      users: ["重度视频创作者", "广告投放与社媒团队", "电商卖家 / 独立站运营者", "需要反复测试不同模型效果的个人用户"]
    } as const;
  }

  if (/directory|tools directory|ai tools directory|gpt store|largest ai tools directory|收录|目录站|导航站|榜单/i.test(normalized)) {
    return {
      key: "directory",
      categories: ["AI 工具目录", "流量聚合", "内容平台"],
      coreValue: "帮用户发现和筛选 AI 工具，同时为被收录产品提供曝光、流量和分发入口。",
      summary: "这类网站本质上不是单个 AI 工具，而是 AI 工具目录和流量聚合平台。它卖的是发现效率、收录曝光和搜索流量。",
      users: ["寻找 AI 工具的普通用户", "想获得曝光的 AI 创业者", "做内容分发和 SEO 的运营者"]
    } as const;
  }

  return null;
}

function isActionableCta(text: string) {
  return /^(start|get|book|try|sign|contact|create|launch|join|request|talk|watch|see|explore|use|generate)\b/i.test(text)
    || /(free trial|start free|book demo|contact sales|talk to sales|create free)/i.test(text);
}

function isNoisyCta(text: string) {
  return /vs\.|compare|pricing plans|frequently asked questions|trusted by/i.test(text);
}

function isUsefulHeading(text: string) {
  return text.length >= 4
    && text.length <= 90
    && !/(frequently asked questions|choose your plan|trusted by|what is|why choose|customer stories|pricing|plans?|features?|ai tools?|desktop plans?|blog|download|overview|contact us|login|sign in|start free|try now|more)$/i.test(text);
}

function extractCoreFeatures(pages: CrawlPage[]) {
  return unique(
    pages
      .flatMap((page) => page.headings)
      .map(normalizeDisplayText)
      .filter(isUsefulHeading)
  ).slice(0, 3);
}

function normalizeSignalLabel(text: string) {
  return normalizeDisplayText(text)
    .replace(/\s+/g, " ")
    .trim();
}

function extractSignalsFromHtml(html: string) {
  const $ = cheerio.load(html);
  const signals = new Map<string, { kind: "link" | "button" | "tab" | "dropdown" | "form" | "summary"; label: string }>();

  const addSignal = (kind: "link" | "button" | "tab" | "dropdown" | "form" | "summary", label: string) => {
    const cleaned = normalizeSignalLabel(label);
    if (!cleaned || cleaned.length > 80) {
      return;
    }

    const key = `${kind}:${cleaned.toLowerCase()}`;
    if (!signals.has(key)) {
      signals.set(key, { kind, label: cleaned });
    }
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
    if (!text) return;

    const role = (node.attr("role") ?? "").toLowerCase();
    const tag = (node[0]?.tagName ?? "").toLowerCase();
    const ariaHasPopup = (node.attr("aria-haspopup") ?? "").toLowerCase();
    const isTab = role === "tab" || node.attr("aria-controls") || node.attr("data-state") === "active" || node.attr("data-tab");
    const isDropdown = ariaHasPopup === "menu" || ariaHasPopup === "listbox" || /more|更多|menu|dropdown|filter/i.test(text);
    const isForm = tag === "input";

    if (isTab) {
      addSignal("tab", text);
    } else if (isDropdown) {
      addSignal("dropdown", text);
    } else if (isForm) {
      addSignal("form", text);
    } else if (tag === "summary") {
      addSignal("summary", text);
    } else {
      addSignal("button", text);
    }
  });

  return Array.from(signals.values()).slice(0, 40);
}

function extractCtasFromSignals(signals: CrawlPage["signals"]) {
  return unique(
    (signals ?? [])
      .map((signal) => signal.label)
      .map(normalizeDisplayText)
      .filter(Boolean)
      .filter(isActionableCta)
      .filter((text) => !isNoisyCta(text))
      .filter((text) => text.length <= 80)
  ).slice(0, 8);
}

function buildAnalysisText(pages: CrawlPage[]) {
  return pages
    .flatMap((page) => [
      page.title,
      page.description,
      ...page.headings,
      ...page.ctas,
      ...page.signals.map((signal) => `${signal.kind}: ${signal.label}`),
      ...page.paragraphs.slice(0, 8),
      page.bodyText
    ])
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
}

function getCoverageLevel(pageTypes: string[]) {
  const discovered = new Set(pageTypes);
  const matched = KEY_PAGE_PATTERNS.filter((item) => discovered.has(item.type)).length;

  if (matched >= 3) return "high" as const;
  if (matched >= 1) return "medium" as const;
  return "low" as const;
}

function pageFingerprint(page: CrawlPage) {
  return [
    page.title,
    page.description,
    page.headings.slice(0, 4).join("|"),
    page.bodyText.slice(0, 400)
  ]
    .map((item) => item.trim())
    .join("||");
}

function scoreSitemapMatch(loc: string, type: string) {
  const url = loc.toLowerCase();
  let score = 0;

  if (new RegExp(`/${type}([/?#-]|$)`).test(url)) score += 8;
  if (new RegExp(`\\b${type}\\b`).test(url)) score += 4;
  if (/\/(legal|docs|doc|blog|guides|guide|news|press)\//.test(url)) score -= 6;
  if (/\?/.test(url)) score -= 1;
  if ((url.match(/\//g) ?? []).length <= 4) score += 2;

  return score;
}

function scoreDiscoveredLink(resolved: string, text: string, type: string) {
  const normalizedText = text.toLowerCase();
  const normalizedUrl = resolved.toLowerCase();
  let score = 0;

  if (type === "pricing") {
    if (/\/pricing(?:-[^/]+)?(\/|$)/i.test(normalizedUrl)) score += 12;
    if (/\/plans?(\/|$)/i.test(normalizedUrl)) score += 8;
    if (/pricing/.test(normalizedText)) score += 6;
    if (/plans?|desktop plans/.test(normalizedText)) score += 3;
    if (/\/download(\/|$)/i.test(normalizedUrl)) score -= 8;
    if (/free|trial|download/.test(normalizedText)) score -= 4;
  } else {
    if (KEY_PAGE_PATTERNS.find((item) => item.type === type)?.pathPattern.test(normalizedUrl)) score += 8;
  }

  return score;
}

function matchesPathPattern(loc: string, pattern: RegExp) {
  try {
    const { pathname } = new URL(loc);
    return pattern.test(pathname);
  } catch {
    return pattern.test(loc);
  }
}

async function fetchSitemapLocs(baseUrl: string) {
  const defaultCandidates = ["/sitemap.xml", "/sitemap_index.xml"]
    .map((path) => resolveLink(baseUrl, path))
    .filter((item): item is string => Boolean(item));
  const sitemapUrls = new Set(defaultCandidates);

  try {
    const robotsUrl = resolveLink(baseUrl, "/robots.txt");
    if (robotsUrl) {
      const response = await fetch(robotsUrl, {
        headers: {
          "User-Agent": "webHunterBot/0.1 (+https://webhunter.local)"
        }
      });

      if (response.ok) {
        const text = await response.text();
        for (const match of text.matchAll(/^sitemap:\s*(.+)$/gim)) {
          const loc = match[1]?.trim();
          if (loc) sitemapUrls.add(loc);
        }
      }
    }
  } catch {
    // ignore robots fetch failures
  }

  const discovered = new Set<string>();
  const visited = new Set<string>();
  const queue = Array.from(sitemapUrls).map((url) => ({ url, depth: 0 }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.url)) continue;
    visited.add(current.url);

    try {
      const response = await fetch(current.url, {
        headers: {
          "User-Agent": "webHunterBot/0.1 (+https://webhunter.local)"
        }
      });

      if (!response.ok) continue;

      const text = await response.text();
      if (!/<loc>/i.test(text)) continue;

      for (const match of text.matchAll(/<loc>(.*?)<\/loc>/gi)) {
        const loc = match[1]?.trim();
        if (!loc) continue;

        if (/\.xml($|\?)/i.test(loc) && current.depth < 1) {
          queue.push({ url: loc, depth: current.depth + 1 });
          continue;
        }

        discovered.add(loc);
      }
    } catch {
      continue;
    }
  }

  return Array.from(discovered);
}

async function fetchPage(url: string, pageType: string, options?: { strict?: boolean }): Promise<CrawlPage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "webHunterBot/0.1 (+https://webhunter.local)"
      }
    });

    if (!response.ok) {
      if (options?.strict) {
        const body = await response.text().catch(() => "");
        if (response.status === 403 && /just a moment|cf-mitigated|cloudflare/i.test(body)) {
          throw new Error("目标网站启用了 Cloudflare 防护，当前版本还抓不到这个站点");
        }
        if (response.status === 403) {
          throw new Error("目标网站拒绝了抓取请求");
        }
        if (response.status === 401) {
          throw new Error("目标网站需要登录或授权，当前版本还无法直接分析");
        }
        if (response.status === 429) {
          throw new Error("目标网站触发了访问频率限制，请稍后再试");
        }
      }
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    const title = $("title").first().text().trim();
    const description = $('meta[name="description"]').attr("content")?.trim() ?? "";
    const headings = $("h1, h2, h3")
      .map((_, el) => normalizeDisplayText($(el).text().trim()))
      .get()
      .filter(Boolean)
      .slice(0, 12);
    const paragraphs = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 40)
      .slice(0, 24);
    const links = $("a[href]")
      .map((_, el) => {
        const href = $(el).attr("href") ?? "";
        const text = $(el).text().trim();
        return { href, text };
      })
      .get()
      .filter((item) => item.href);
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const signals = extractSignalsFromHtml(html);
    const ctas = extractCtasFromSignals(signals);

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
      rawHtml: html
    };
  } catch {
    return null;
  }
}

function resolveLink(baseUrl: string, href: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

async function discoverKeyPages(homePage: CrawlPage): Promise<CrawlPage[]> {
  return discoverKeyPagesWithLoader(homePage, fetchPage);
}

function mergeCrawlPages(...pages: CrawlPage[]) {
  const seen = new Set<string>();
  const merged: CrawlPage[] = [];

  for (const page of pages) {
    const fingerprint = pageFingerprint(page);
    if (seen.has(fingerprint)) {
      continue;
    }
    seen.add(fingerprint);
    merged.push(page);
  }

  return merged;
}

function needsDeepCrawl(homePage: CrawlPage, secondaryPages: CrawlPage[]) {
  const discoveredTypes = new Set([homePage.pageType, ...secondaryPages.map((page) => page.pageType)]);
  const missingCount = KEY_PAGE_PATTERNS.filter((item) => !discoveredTypes.has(item.type)).length;
  const hasVeryFewSignals = homePage.ctas.length <= 1 && homePage.signals.length <= 4;
  const isLikelySPA =
    /__NEXT_DATA__|data-reactroot|window\.__NUXT__|id=["']root["']|id=["']app["']|vite/i.test(homePage.rawHtml)
    || /javascript|required to enable javascript|please enable javascript/i.test(homePage.bodyText)
    || homePage.bodyText.length < 500;

  return missingCount >= 2 || (hasVeryFewSignals && isLikelySPA) || (secondaryPages.length <= 1 && homePage.signals.length <= 6);
}

async function discoverKeyPagesWithLoader(
  homePage: CrawlPage,
  loader: (url: string, pageType: string, options?: { strict?: boolean }) => Promise<CrawlPage | null>
): Promise<CrawlPage[]> {
  const discovered = new Map<string, { url: string; score: number }>();

  for (const link of homePage.links) {
    const resolved = resolveLink(homePage.url, link.href);
    if (!resolved) continue;

    for (const item of KEY_PAGE_PATTERNS) {
      if (matchesPathPattern(resolved, item.pathPattern) || item.pattern.test(link.text)) {
        const score = scoreDiscoveredLink(resolved, link.text, item.type);
        const current = discovered.get(item.type);
        if (!current || score > current.score) {
          discovered.set(item.type, { url: resolved, score });
        }
      }
    }
  }

  const sitemapLocs = await fetchSitemapLocs(homePage.url);
  for (const item of KEY_PAGE_PATTERNS) {
    if (discovered.has(item.type)) continue;

    const sitemapMatch = sitemapLocs
      .filter((loc) => matchesPathPattern(loc, item.pathPattern))
      .map((loc) => ({ loc, score: scoreSitemapMatch(loc, item.type) }))
      .sort((a, b) => b.score - a.score)[0]?.loc;
    if (sitemapMatch) {
      discovered.set(item.type, { url: sitemapMatch, score: scoreSitemapMatch(sitemapMatch, item.type) });
    }
  }

  for (const item of KEY_PAGE_PATTERNS) {
    if (discovered.has(item.type)) continue;

    for (const fallbackPath of KEY_PAGE_FALLBACK_PATHS[item.type] ?? []) {
      const resolved = resolveLink(homePage.url, fallbackPath);
      if (!resolved) continue;
      discovered.set(item.type, { url: resolved, score: 0 });
      break;
    }
  }

  const pages = await Promise.all(
    Array.from(discovered.entries()).map(([type, item]) => loader(item.url, type))
  );

  const homeFingerprint = pageFingerprint(homePage);
  const seenFingerprints = new Set<string>([homeFingerprint]);

  return pages
    .filter((page): page is CrawlPage => Boolean(page))
    .filter((page) => {
      const fingerprint = pageFingerprint(page);
      if (seenFingerprints.has(fingerprint)) {
        return false;
      }
      seenFingerprints.add(fingerprint);
      return true;
    });
}

function detectCategories(text: string) {
  const archetype = detectArchetype(text);
  if (archetype) {
    return archetype.categories.slice(0, 3);
  }

  const ranked = rankSignals(text);
  const categories = new Set<string>();
  const aiMatches = text.match(/\bai\b|artificial intelligence|llm|gpt|veo|sora|kling/gi) ?? [];

  if (ranked[0]?.score > 0) {
    for (const label of ranked[0].labels) {
      categories.add(label);
    }
  }

  if (aiMatches.length > 0) categories.add("AI");
  if (/(consumer|creator|individual|personal)/i.test(text)) categories.add("B2C");
  if (categories.size === 0) categories.add("工具型产品");

  return Array.from(categories).slice(0, 3);
}

function buildChineseSummary(text: string, siteName: string, fallback: string) {
  const archetype = detectArchetype(text);
  if (archetype) {
    return archetype.summary;
  }

  const ranked = rankSignals(text);
  if (ranked[0]?.score > 0) {
    return ranked[0].summary;
  }

  if (fallback) {
    return `这是一个以“${fallback.slice(0, 40)}”为核心卖点的网站，主打提升效率或降低现有流程中的复杂度。`;
  }

  return `这是一个围绕 ${siteName} 提供服务的网站，具体定位还需要结合更多页面信息继续判断。`;
}

function detectTargetUsers(text: string, pages: CrawlPage[]) {
  const archetype = detectArchetype(text);
  if (archetype) {
    return archetype.users.slice(0, 4);
  }

  const prioritizedText = [pages[0]?.title ?? "", pages[0]?.description ?? "", ...pages.flatMap((page) => page.headings.slice(0, 3)), text]
    .filter(Boolean)
    .join(" ");
  const ranked = rankSignals(prioritizedText);
  const users = new Set<string>();

  if (ranked[0]?.score > 0) {
    for (const user of ranked[0].users) {
      users.add(user);
    }
  }

  if (/(founder|cto|manager|executive|team lead|enterprise)/i.test(prioritizedText)) users.add("企业管理者");
  if (/(creator|influencer|youtube|tiktok|content creator)/i.test(prioritizedText)) users.add("创作者 / 内容团队");
  if (/(marketing|seo|growth|campaign|brand)/i.test(prioritizedText)) users.add("营销与增长团队");

  return users.size > 0 ? Array.from(users).slice(0, 3) : ["潜在购买者需要进一步判断"];
}

function detectPricing(pages: CrawlPage[], ctas: string[]) {
  const pricingPage = pages.find((page) => page.pageType === "pricing");
  const pricingSignals = (pricingPage ? [pricingPage] : pages).flatMap((page) => [
    page.title,
    page.description,
    ...page.headings,
    ...page.paragraphs.slice(0, 8),
    page.bodyText,
    page.rawHtml
  ]);
  const pricingText = pricingSignals.join(" ");
  const allTexts = `${pricingText} ${ctas.join(" ")}`;
  const priceMatches = extractPricePoints(pricingText);
  const pricingPlans = extractPricingPlans(pricingText);
  const priceMatch = priceMatches[0];
  const billingCycle = /(annual|yearly|monthly|month|year|per month|per year|月付|年付)/i.test(pricingText)
    ? "月付 / 年付"
    : "页面未明确";
  const trial = /(free trial|start free|免费试用|免费开始|free plan|無料トライアル|free credits?|start with free credits?)/i.test(allTexts)
    ? /(free credits?|start with free credits?)/i.test(allTexts)
      ? "存在免费额度 / 试用入口"
      : "存在免费试用"
    : "未明确看到试用";
  const model = /(transaction|payment processing|payout|per transaction|platform fee)/i.test(pricingText)
    ? "按交易 / 支付规模收费"
    : /(per user|per seat|seat-based|workspace members|members included|up to \d+ members)/i.test(pricingText)
    ? "按席位 / 团队定价"
    : /(credit|usage|token|request|volume|transaction|pay as you go)/i.test(pricingText)
      ? "按用量收费"
      : /(contact sales|enterprise|custom pricing|talk to sales)/i.test(pricingText)
        ? "企业定制定价"
      : "订阅制";

  return {
    startingPrice: priceMatch && priceMatch.length > 1 ? priceMatch : "未明确",
    pricePoints: priceMatches,
    plans: pricingPlans,
    billingCycle,
    trial,
    model
  };
}

function buildMarketOpportunity(text: string): InsightItem[] {
  const archetype = detectArchetype(text);
  const ranked = rankSignals(text);
  const top = ranked[0]?.key;

  return [
    {
      title: "市场大小",
      content:
        archetype?.key === "directory"
          ? "大，AI 工具还在持续爆发，用户筛选和发现成本很高，目录型流量平台仍有空间"
          : archetype?.key === "model-hub"
            ? "大，视频生成需求和模型数量都在快速增长，统一工作台和聚合入口有明确需求"
        : top === "fintech"
          ? "大，但门槛高，适合从更窄更具体的流程切入"
          : top === "agent"
            ? "大，且仍在快速变化，适合从更明确的任务类型或角色切入"
          : top === "creative"
            ? "大，但偏红海，需要更明确的人群和场景差异化"
            : /(enterprise|platform|developer|automation)/i.test(text)
              ? "中到大，属于可长期经营的工具赛道"
              : "中等，需要看细分场景"
    },
    {
      title: "竞争强度",
      content:
        archetype?.key === "directory"
          ? "竞争激烈但高度分散，核心比拼是收录速度、SEO 和内容组织能力"
          : archetype?.key === "model-hub"
            ? "竞争中高，既要和单模型产品竞争，也要和更强的平台型工作台竞争"
        : top === "creative" || top === "agent" || /(ai|automation|developer|design)/i.test(text)
          ? "中等偏高，已经有成熟玩家"
          : "中等，可进一步验证"
    },
    {
      title: "红海/细分机会",
      content:
        archetype?.key === "directory"
          ? "机会在更垂直的目录、评测深度、工作流分类，或者更强的转化链路，而不是简单复制大而全目录站"
          : archetype?.key === "model-hub"
            ? "机会在于围绕某个视频场景做模型聚合和工作流整合，比如电商主图视频、UGC 广告或长视频故事"
        : top === "creative"
          ? "建议优先找垂直内容类型、垂直行业或特定素材工作流切口"
          : top === "agent"
            ? "建议优先找垂直任务链、特定角色或固定输出物切口"
          : "建议优先找垂直场景、特定人群、特定工作流切口"
    },
    {
      title: "风险提示",
      content:
        archetype?.key === "directory"
          ? "目录站护城河偏弱，容易被更强 SEO 团队或社区型平台复制，单纯靠收录数量很难长期领先"
          : archetype?.key === "model-hub"
            ? "如果只是把模型摆在一起，没有更深的工作流、模板和统一体验，用户很容易回到原模型官方平台"
        : top === "fintech"
          ? "合规、支付网络和信任门槛很高，不能只靠页面体验切入"
          : "若卖点只停留在“更快更便宜”，容易被大平台或同类工具替代"
    }
  ];
}

function slugFromUrl(url: string) {
  const { hostname } = new URL(url);
  return hostname.replace(/^www\./, "").replace(/\./g, "-");
}

function toSnapshotPage(page: CrawlPage): CrawledPageSummary {
  return {
    url: page.url,
    pageType: page.pageType,
    title: page.title,
    description: page.description,
    headings: page.headings.slice(0, 6),
    ctas: page.ctas.slice(0, 5),
    signals: page.signals.slice(0, 10),
    excerpt: textSample(page.paragraphs, page.description || page.title || page.url)
  };
}

export async function analyzeWebsite(inputUrl: string): Promise<{
  snapshot: AnalysisInputSnapshot;
  result: AnalysisResult;
  recentItem: ResearchCard;
}> {
  const normalizedUrl = normalizeUrl(inputUrl);
  const fastHomePage = await fetchPage(normalizedUrl, "home", { strict: true });

  if (!fastHomePage) {
    throw new Error("目标网站当前无法抓取，可能启用了反爬、防护挑战或登录限制");
  }

  let homePage = fastHomePage;
  let secondaryPages = await discoverKeyPages(homePage);
  let crawlMode: "fast" | "deep" = "fast";

  if (needsDeepCrawl(homePage, secondaryPages)) {
    const browserHomePage = await loadRenderedPage(normalizedUrl, "home");
    if (browserHomePage) {
      const browserSecondaryPages = await discoverKeyPagesWithLoader(browserHomePage, loadRenderedPage);
      homePage = browserHomePage;
      secondaryPages = mergeCrawlPages(...secondaryPages, ...browserSecondaryPages);
      crawlMode = "deep";
    }
  }

  const allPages = mergeCrawlPages(homePage, ...secondaryPages);
  const allText = buildAnalysisText(allPages);
  const allCtas = allPages.flatMap((page) => page.ctas);

  const siteName = new URL(normalizedUrl).hostname.replace(/^www\./, "");
  const siteDescription = textSample(homePage.paragraphs, homePage.description || homePage.title);
  const archetype = detectArchetype(allText);
  const categories = detectCategories(allText);
  const targetUsers = detectTargetUsers(allText, allPages);
  const pricing = detectPricing(allPages, allCtas);
  const id = slugFromUrl(normalizedUrl);
  const snapshot: AnalysisInputSnapshot = {
    siteUrl: normalizedUrl,
    siteName,
    crawlMode,
    pages: allPages.map(toSnapshotPage),
    combinedText: allText.slice(0, 12000)
  };

  const summary = buildChineseSummary(allText, siteName, homePage.description || siteDescription);
  const discoveredPageTypes = allPages.map((page) => page.pageType);
  const meta = {
    analyzedAt: new Date().toISOString(),
    pageCount: allPages.length,
    pageTypes: discoveredPageTypes,
    missingPageTypes: KEY_PAGE_PATTERNS.map((item) => item.type).filter((type) => !discoveredPageTypes.includes(type)),
    coverageLevel: getCoverageLevel(discoveredPageTypes),
    crawlMode,
    analysisMode: "rules" as const
  };

  const result: AnalysisResult = {
    id,
    siteName,
    siteUrl: normalizedUrl,
    statusLabel: "已完成分析",
    meta,
    summary,
    categories,
    decisionCards: [
      { label: "市场机会", value: "需要进一步验证，但已有明确需求信号", tone: "positive" },
      { label: "竞争强度", value: "中等，建议先找垂直切口", tone: "warning" },
      { label: "是否建议做", value: "建议先从细分用户或工作流切入", tone: "positive" }
    ],
    coreFeatures: extractCoreFeatures(allPages),
    coreValue: archetype?.coreValue ?? "帮目标用户更快完成关键任务，并降低原有流程中的时间、人力或复杂度成本",
    targetUsers,
    marketOpportunity: buildMarketOpportunity(allText),
    pricing: {
      ...pricing,
      whyPricingWorks: "如果这个工具能直接省时间、省人力或缩短关键流程，它就具备稳定收费基础。"
    },
    growthInsights: [
      {
        title: "为什么用户付费？",
        content: "用户通常不会为“技术本身”付费，而是为省时间、省人工、降低门槛、或者更稳定地拿到结果付费。"
      },
      {
        title: "市场切入点建议",
        content: "优先观察它是不是在解决一个高频、刚需、重复出现的问题。如果是，就优先找更小的人群和更深的场景切入。"
      }
    ],
    buildAdvice: [
      {
        title: "先切一个更窄的人群",
        content: "不要直接和大盘工具正面打，先把某个更具体的用户群和工作流吃透。"
      },
      {
        title: "先做高频动作，不做大而全",
        content: "围绕用户最常执行、最痛的一步做成轻量工具，更容易验证是否真的有人愿意买。"
      }
    ],
    similarProducts: [
      { name: "同类竞品待补充", status: "planned" },
      { name: "替代方案待补充", status: "planned" },
      { name: "上下游工具待补充", status: "planned" },
      { name: "垂直切口案例待补充", status: "planned" }
    ],
    evidenceGroups: [
      {
        level: "explicit",
        title: "明确可见",
        items: allPages.slice(0, 3).map((page) => ({
          title: `${page.pageType} 页面`,
          detail: page.title || page.description || "已抓取到公开页面",
          snippet: page.ctas[0]
        }))
      },
      {
        level: "inferred",
        title: "高概率判断",
        items: [
          {
            title: "用户与场景推断",
            detail: `从页面文案、导航结构和 CTA 推断，这个网站主要面向：${targetUsers.join("、")}`
          },
          ...(archetype
            ? [
                {
                  title: "产品形态推断",
                  detail: `当前更像“${archetype.categories[0]}”而不是单点工具，核心卖点是：${archetype.coreValue}`
                }
              ]
            : [])
        ]
      },
      {
        level: "strategy",
        title: "策略建议",
        items: [
          {
            title: "切入建议",
            detail: "系统建议优先从垂直用户、垂直行业或单一高频动作切入。"
          }
        ]
      }
    ],
    evidenceSnapshots: allPages.slice(0, 3).map((page) => ({
      title: `${page.pageType} 快照`,
      detail: textSample(page.paragraphs, page.description || page.title || page.url)
    }))
  };

  const llmEnhancement = await analyzeWithLlm(snapshot, result);
  if (llmEnhancement) {
    if (llmEnhancement.summary) result.summary = llmEnhancement.summary;
    if (llmEnhancement.categories?.length) result.categories = llmEnhancement.categories;
    if (llmEnhancement.coreFeatures?.length) result.coreFeatures = llmEnhancement.coreFeatures;
    if (llmEnhancement.coreValue) result.coreValue = llmEnhancement.coreValue;
    if (llmEnhancement.targetUsers?.length) result.targetUsers = llmEnhancement.targetUsers;
    if (llmEnhancement.marketOpportunity?.length) result.marketOpportunity = llmEnhancement.marketOpportunity;
    if (llmEnhancement.pricingWhyWorks) {
      result.pricing = {
        ...result.pricing,
        whyPricingWorks: llmEnhancement.pricingWhyWorks
      };
    }
    if (llmEnhancement.decisionCards?.length) result.decisionCards = llmEnhancement.decisionCards;
    if (llmEnhancement.growthInsights?.length) result.growthInsights = llmEnhancement.growthInsights;
    if (llmEnhancement.buildAdvice?.length) result.buildAdvice = llmEnhancement.buildAdvice;
    result.statusLabel = "LLM 深度分析";
    result.meta = {
      ...meta,
      analysisMode: "llm"
    };
  }

  return {
    snapshot,
    result,
    recentItem: {
      id,
      name: siteName,
      domain: siteName,
      category: result.categories[0] ?? "网站",
      summary: result.summary,
      tags: [result.pricing.model, ...result.categories.slice(1, 3)].filter(Boolean)
    }
  };
}
