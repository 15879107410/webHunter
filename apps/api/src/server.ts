import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import type {
  AnalysisInputResponse,
  AnalysisListResponse,
  AnalysisDetailResponse,
  AnalyzeResponse,
  AuthResponse,
  BookmarkListResponse,
  MeResponse,
  RecentAnalysisResponse,
  SimilarProduct
} from "@webhunter/shared";
import { analyzeWebsite } from "./analyze-site.js";
import {
  createSession,
  createUser,
  deleteSession,
  findAnalysisBySiteUrl,
  findAnalysisBySiteUrlForUser,
  findUserByEmail,
  getAnalysisInput,
  getAnalysisInputForUser,
  getAnalysisResults,
  getAnalysisResultsForUser,
  addBookmark,
  getBookmarks,
  getBookmarksForUser,
  getRecentAnalysis,
  getRecentAnalysisForUser,
  getUserById,
  getUserBySessionToken,
  verifyPassword,
  pushRecentAnalysis,
  removeBookmark,
  updateBookmark,
  upsertAnalysisInput,
  upsertAnalysis
} from "./file-store.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envPathCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(currentDir, "../../../.env"),
  path.resolve(currentDir, "../../../../../../.env")
];
const envPath = envPathCandidates.find((candidate) => existsSync(candidate));

if (envPath) {
  process.loadEnvFile?.(envPath);
}

const app = express();
const port = Number(process.env.PORT ?? 3001);
const sessionCookieName = "webhunter_session";
const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
const cookieSecure = process.env.NODE_ENV === "production";
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const publicOwnerId = "";

function normalizeUrl(input: string) {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withProtocol);
  url.hash = "";
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  return url.toString().replace(/\/$/, "");
}

function canonicalizeUrl(input: string) {
  const url = new URL(input);
  url.hash = "";
  url.hostname = url.hostname.replace(/^www\./i, "");
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  return url.toString().replace(/\/$/, "");
}

function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader.split(";").map((part) => {
      const [rawKey, ...rest] = part.trim().split("=");
      return [decodeURIComponent(rawKey ?? ""), decodeURIComponent(rest.join("=") ?? "")] as const;
    })
  );
}

function serializeCookie(name: string, value: string, maxAgeSeconds?: number) {
  const sameSite = cookieSecure ? "None" : "Lax";
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, "Path=/", `SameSite=${sameSite}`];
  if (typeof maxAgeSeconds === "number") {
    parts.push(`Max-Age=${Math.floor(maxAgeSeconds)}`);
  }
  if (cookieDomain) {
    parts.push(`Domain=${cookieDomain}`);
  }
  if (cookieSecure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function setSessionCookie(res: Response, token: string) {
  res.setHeader("Set-Cookie", serializeCookie(sessionCookieName, token, 60 * 60 * 24 * 30));
}

function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", serializeCookie(sessionCookieName, "", 0));
}

async function getCurrentUser(req: Request) {
  const cookieToken = parseCookieHeader(req.headers.cookie).get(sessionCookieName);
  if (!cookieToken) {
    return null;
  }

  return getUserBySessionToken(cookieToken);
}

function toResearchCard(item: AnalysisDetailResponse["item"]) {
  return {
    id: item.id,
    ownerId: item.ownerId,
    name: item.siteName,
    domain: new URL(item.siteUrl).hostname.replace(/^www\./, ""),
    category: item.categories[0] ?? "工具型产品",
    summary: item.summary,
    tags: [item.pricing.model, ...(item.categories.slice(1, 3) ?? [])].filter(Boolean),
    analyzedAt: item.meta?.analyzedAt,
    pageCount: item.meta?.pageCount,
    analysisMode: item.meta?.analysisMode,
    coverageLevel: item.meta?.coverageLevel
  };
}

function dedupeResearchCards(items: AnalysisListResponse["items"]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = canonicalizeUrl(`https://${item.domain}`);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function scoreSimilarProduct(base: AnalysisDetailResponse["item"], candidate: AnalysisDetailResponse["item"]) {
  let score = 0;

  if (base.categories.some((category) => candidate.categories.includes(category))) score += 4;
  if (base.pricing.model === candidate.pricing.model) score += 3;
  if (base.targetUsers.some((user) => candidate.targetUsers.includes(user))) score += 2;
  if (base.meta?.analysisMode === "llm" && candidate.meta?.analysisMode === "llm") score += 1;

  return score;
}

function buildSimilarProducts(
  current: AnalysisDetailResponse["item"],
  allResults: Record<string, AnalysisDetailResponse["item"]>
): SimilarProduct[] {
  const candidates = Object.values(allResults)
    .filter((item) => item.id !== current.id)
    .map((item) => ({
      id: item.id,
      name: item.siteName,
      status: "ready" as const,
      category: item.categories[0],
      summary: item.summary,
      score: scoreSimilarProduct(current, item)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score: _score, ...item }) => item);

  if (candidates.length > 0) {
    return candidates;
  }

  return current.similarProducts;
}

function buildMarkdownReport(item: AnalysisDetailResponse["item"]) {
  const lines: string[] = [
    `# ${item.siteName} 分析报告`,
    "",
    `- 网站地址: ${item.siteUrl}`,
    `- 分析状态: ${item.statusLabel}`,
    `- 导出时间: ${new Date().toISOString()}`,
    `- 分析时间: ${item.meta?.analyzedAt ?? "页面未记录"}`,
    `- 抓取页面数: ${item.meta?.pageCount ?? "页面未记录"}`,
    `- 分析模式: ${item.meta?.analysisMode === "llm" ? "LLM 深度分析" : "规则分析"}`,
    "",
    "## 一句话看懂",
    "",
    item.summary,
    "",
    "## 核心判断",
    ""
  ];

  for (const card of item.decisionCards) {
    lines.push(`- ${card.label}: ${card.value}`);
  }

  lines.push("", "## 产品定位", "", `- 本质上卖的是: ${item.coreValue}`, "");
  for (const feature of item.coreFeatures) {
    lines.push(`- ${feature}`);
  }

  lines.push("", "## 目标用户", "");
  for (const user of item.targetUsers) {
    lines.push(`- ${user}`);
  }

  lines.push("", "## 收费与商业模式", "");
  lines.push(`- 起步价格: ${item.pricing.startingPrice}`);
  if (item.pricing.plans?.length) {
    lines.push(`- 套餐明细: ${item.pricing.plans.map((plan) => `${plan.label} ${plan.price}`).join(" / ")}`);
  }
  if (item.pricing.pricePoints?.length) {
    lines.push(`- 完整价格构成: ${item.pricing.pricePoints.join(" / ")}`);
  }
  lines.push(`- 计费周期: ${item.pricing.billingCycle}`);
  lines.push(`- 免费版/试用: ${item.pricing.trial}`);
  lines.push(`- 商业模式: ${item.pricing.model}`);
  lines.push(`- 为什么这个定价成立: ${item.pricing.whyPricingWorks}`);

  lines.push("", "## 市场机会判断", "");
  for (const insight of item.marketOpportunity) {
    lines.push(`- ${insight.title}: ${insight.content}`);
  }

  lines.push("", "## 增长逻辑", "");
  for (const insight of item.growthInsights) {
    lines.push(`### ${insight.title}`, "", insight.content, "");
  }

  lines.push("## 创业切入建议", "");
  for (const insight of item.buildAdvice) {
    lines.push(`### ${insight.title}`, "", insight.content, "");
  }

  lines.push("## 分析依据", "");
  for (const group of item.evidenceGroups) {
    lines.push(`### ${group.title}`, "");
    for (const evidence of group.items) {
      lines.push(`- ${evidence.title}: ${evidence.detail}`);
      if (evidence.snippet) {
        lines.push(`  - 证据片段: ${evidence.snippet}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    llmReady: Boolean(process.env.LLM_MODEL),
    analysisFallback: "rules"
  });
});

app.get("/api/auth/me", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const payload: MeResponse = { user };
  res.json(payload);
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "请输入有效邮箱和至少 8 位密码" });
    return;
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    res.status(409).json({ message: "这个邮箱已经注册过了" });
    return;
  }

  const user = await createUser(parsed.data.email, parsed.data.password);
  if (!user) {
    res.status(409).json({ message: "这个邮箱已经注册过了" });
    return;
  }

  const session = await createSession(user.id);
  setSessionCookie(res, session.token);

  const payload: AuthResponse = { user };
  res.status(201).json(payload);
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1).max(128)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "请输入有效邮箱和密码" });
    return;
  }

  const userRecord = await findUserByEmail(parsed.data.email);
  if (!userRecord || !verifyPassword(parsed.data.password, userRecord.passwordSalt, userRecord.passwordHash)) {
    res.status(401).json({ message: "邮箱或密码不正确" });
    return;
  }

  const user = await getUserById(userRecord.id);
  if (!user) {
    res.status(401).json({ message: "邮箱或密码不正确" });
    return;
  }

  const session = await createSession(user.id);
  setSessionCookie(res, session.token);

  const payload: AuthResponse = { user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt } };
  res.json(payload);
});

app.post("/api/auth/logout", async (req: Request, res: Response) => {
  const token = parseCookieHeader(req.headers.cookie).get(sessionCookieName);
  if (token) {
    await deleteSession(token);
  }

  clearSessionCookie(res);
  res.status(204).send();
});

app.get("/api/analysis/recent", async (_req: Request, res: Response) => {
  const user = await getCurrentUser(_req);
  const items = user ? await getRecentAnalysisForUser(user.id) : await getRecentAnalysis();
  const payload: RecentAnalysisResponse = { items: dedupeResearchCards(items) };
  res.json(payload);
});

app.get("/api/analysis", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const analysisResults = user ? await getAnalysisResultsForUser(user.id) : await getAnalysisResults();
  const recent = user ? await getRecentAnalysisForUser(user.id) : await getRecentAnalysis();
  const recentMap = new Map(recent.map((item, index) => [item.id, index]));

  const items = dedupeResearchCards(
    Object.values(analysisResults)
    .map((item) => toResearchCard(item))
    .sort((a, b) => {
      const aRecentIndex = recentMap.get(a.id);
      const bRecentIndex = recentMap.get(b.id);

      if (aRecentIndex !== undefined && bRecentIndex !== undefined) {
        return aRecentIndex - bRecentIndex;
      }

      if (aRecentIndex !== undefined) return -1;
      if (bRecentIndex !== undefined) return 1;
      return 0;
    })
  );

  const payload: AnalysisListResponse = { items };
  res.json(payload);
});

app.get("/api/analysis/:id", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const analysisId = String(req.params.id);
  const analysisResults = user ? await getAnalysisResultsForUser(user.id) : await getAnalysisResults();
  const item = analysisResults[analysisId];

  if (!item) {
    res.status(404).json({ message: "Analysis not found" });
    return;
  }

  const payload: AnalysisDetailResponse = {
    item: {
      ...item,
      similarProducts: buildSimilarProducts(item, analysisResults)
    }
  };
  res.json(payload);
});

app.get("/api/analysis/:id/export.md", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const analysisId = String(req.params.id);
  const analysisResults = user ? await getAnalysisResultsForUser(user.id) : await getAnalysisResults();
  const item = analysisResults[analysisId];

  if (!item) {
    res.status(404).json({ message: "Analysis not found" });
    return;
  }

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${analysisId}-report.md"`);
  res.send(buildMarkdownReport(item));
});

app.get("/api/analysis/:id/input", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const analysisId = String(req.params.id);
  const item = user ? await getAnalysisInputForUser(user.id, analysisId) : await getAnalysisInput(analysisId);

  if (!item) {
    res.status(404).json({ message: "Analysis input not found" });
    return;
  }

  const payload: AnalysisInputResponse = { item };
  res.json(payload);
});

app.get("/api/bookmarks", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const payload: BookmarkListResponse = { items: user ? await getBookmarksForUser(user.id) : await getBookmarks() };
  res.json(payload);
});

app.post("/api/bookmarks", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const schema = z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string(),
    label: z.string(),
    manualLabel: z.string().nullable().optional(),
    oneLiner: z.string(),
    pricingModel: z.string(),
    targetUsers: z.string(),
    opportunityLevel: z.string(),
    note: z.string()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid bookmark payload" });
    return;
  }

  await addBookmark({ ...parsed.data, ownerId: user?.id ?? publicOwnerId });
  res.status(201).json({ ok: true });
});

app.delete("/api/bookmarks/:id", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const bookmarkId = String(req.params.id);
  const bookmarkItems = user ? await getBookmarksForUser(user.id) : await getBookmarks();
  if (!bookmarkItems.some((item) => item.id === bookmarkId)) {
    res.status(404).json({ message: "Bookmark not found" });
    return;
  }

  const removed = await removeBookmark(bookmarkId);
  if (!removed) {
    res.status(404).json({ message: "Bookmark not found" });
    return;
  }

  res.status(204).send();
});

app.patch("/api/bookmarks/:id", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const bookmarkId = String(req.params.id);
  const schema = z.object({
    label: z.string().optional(),
    manualLabel: z.string().nullable().optional(),
    opportunityLevel: z.string().optional(),
    note: z.string().min(1).max(1000).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid bookmark update payload" });
    return;
  }

  const bookmarkItems = user ? await getBookmarksForUser(user.id) : await getBookmarks();
  if (!bookmarkItems.some((item) => item.id === bookmarkId)) {
    res.status(404).json({ message: "Bookmark not found" });
    return;
  }

  const item = await updateBookmark(bookmarkId, parsed.data);
  if (!item) {
    res.status(404).json({ message: "Bookmark not found" });
    return;
  }

  res.json({ item });
});

app.post("/api/analyze", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const schema = z.object({
    url: z.string().min(1),
    force: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid url" });
    return;
  }

  try {
    const normalizedUrl = normalizeUrl(parsed.data.url);
    const ownerId = user?.id ?? publicOwnerId;
    const existing = user
      ? await findAnalysisBySiteUrlForUser(user.id, normalizedUrl)
      : await findAnalysisBySiteUrl(normalizedUrl);

    if (existing && !parsed.data.force) {
      await pushRecentAnalysis({ ...toResearchCard(existing), ownerId });
      const payload: AnalyzeResponse = {
        id: existing.id,
        status: "completed",
        reused: true
      };
      res.status(200).json(payload);
      return;
    }

    const { snapshot, result, recentItem } = await analyzeWebsite(normalizedUrl);
    const storedResult = existing ? { ...result, id: existing.id, ownerId } : { ...result, ownerId };
    const storedRecentItem = existing ? { ...toResearchCard(storedResult), ownerId } : { ...recentItem, ownerId };
    const storedSnapshot = { ...snapshot, ownerId };

    await upsertAnalysisInput(storedResult.id, storedSnapshot);
    await upsertAnalysis(storedResult);
    await pushRecentAnalysis(storedRecentItem);

    const payload: AnalyzeResponse = {
      id: storedResult.id,
      status: "completed",
      reused: false
    };
    res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze target website";
    res.status(502).json({ message });
  }
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
