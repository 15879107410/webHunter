import { z } from "zod";
import type { AnalysisInputSnapshot, AnalysisResult, DecisionCard, InsightItem } from "@webhunter/shared";

const insightSchema = z.union([
  z.string(),
  z.object({
    title: z.string(),
    content: z.string()
  })
]);

const llmEnhancementSchema = z.object({
  summary: z.string().optional(),
  categories: z.array(z.string()).min(1).max(5).optional(),
  coreFeatures: z.array(z.string()).min(1).max(6).optional(),
  coreValue: z.string().optional(),
  targetUsers: z.array(z.string()).min(1).max(5).optional(),
  marketOpportunity: z.unknown().optional(),
  pricingWhyWorks: z.string().optional(),
  decisionCards: z.unknown().optional(),
  growthInsights: z.array(insightSchema).min(1).max(4).optional(),
  buildAdvice: z.array(insightSchema).min(1).max(4).optional()
});

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

type ChatCompletionRequest = {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: Array<{
    role: "user";
    content: string;
  }>;
  response_format?: {
    type: "json_object";
  };
};

type MessageContent = string | Array<{ type?: string; text?: string }> | undefined;

export type LlmEnhancement = {
  summary?: string;
  categories?: string[];
  coreFeatures?: string[];
  coreValue?: string;
  targetUsers?: string[];
  marketOpportunity?: InsightItem[];
  pricingWhyWorks?: string;
  decisionCards?: DecisionCard[];
  growthInsights?: InsightItem[];
  buildAdvice?: InsightItem[];
};

function stringifyContent(content: MessageContent) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("\n")
      .trim();
  }

  return "";
}

function extractJsonObject(raw: string) {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = raw.match(/\{[\s\S]*\}/);
  return objectMatch?.[0]?.trim() ?? raw.trim();
}

function getNextMeaningfulCharacter(text: string, startIndex: number) {
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (!/\s/.test(char)) {
      return char;
    }
  }

  return "";
}

function repairJsonLikeString(input: string) {
  let output = "";
  let inString = false;
  let escapeNext = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (!inString) {
      if (char === "\"") {
        inString = true;
      }

      output += char;
      continue;
    }

    if (escapeNext) {
      output += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      escapeNext = true;
      continue;
    }

    if (char === "\"") {
      const nextChar = getNextMeaningfulCharacter(input, index + 1);
      const shouldCloseString = nextChar === "" || nextChar === "," || nextChar === "}" || nextChar === "]" || nextChar === ":";

      if (shouldCloseString) {
        inString = false;
        output += char;
      } else {
        output += "\\\"";
      }
      continue;
    }

    if (char === "\n") {
      output += "\\n";
      continue;
    }

    if (char === "\r") {
      output += "\\r";
      continue;
    }

    if (char === "\t") {
      output += "\\t";
      continue;
    }

    output += char;
  }

  return output.replace(/,\s*([}\]])/g, "$1");
}

function parsePossiblyMalformedJson(raw: string) {
  try {
    return {
      value: JSON.parse(raw) as unknown,
      repaired: false
    };
  } catch (error) {
    const repaired = repairJsonLikeString(raw);
    return {
      value: JSON.parse(repaired) as unknown,
      repaired: true,
      error
    };
  }
}

function cleanSentence(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function sanitizeTextArray(items: string[] | undefined, limit: number) {
  return (items ?? [])
    .map(cleanSentence)
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, limit);
}

function sanitizeDecisionCards(cards: DecisionCard[] | undefined) {
  return (cards ?? [])
    .map((card) => ({
      label: cleanSentence(card.label),
      value: cleanSentence(card.value),
      tone: card.tone
    }))
    .filter((card) => card.label && card.value)
    .filter((card, index, array) => array.findIndex((item) => item.label === card.label) === index)
    .slice(0, 4);
}

function normalizeDecisionCards(cards: unknown): DecisionCard[] {
  if (!cards) return [];

  if (Array.isArray(cards)) {
    const normalized = cards
      .map((card) => {
        if (!card || typeof card !== "object") return null;
        const item = card as { label?: unknown; value?: unknown; tone?: DecisionCard["tone"] };
        if (typeof item.label !== "string" || typeof item.value !== "string") return null;
        return {
          label: item.label,
          value: item.value,
          tone: item.tone
        };
      })
      .filter(Boolean) as DecisionCard[];
    return sanitizeDecisionCards(normalized);
  }

  if (typeof cards === "object") {
    return sanitizeDecisionCards(
      Object.entries(cards as Record<string, unknown>)
        .map(([label, value]) => {
          if (typeof value === "string") {
            return { label, value };
          }

          if (value && typeof value === "object") {
            const record = value as { value?: unknown; content?: unknown; tone?: DecisionCard["tone"] };
            const text = typeof record.value === "string" ? record.value : typeof record.content === "string" ? record.content : null;
            if (text) {
              return {
                label,
                value: text,
                tone: record.tone
              };
            }
          }

          return null;
        })
        .filter((item): item is DecisionCard => Boolean(item))
    );
  }

  return [];
}

function sanitizeInsights(items: InsightItem[] | undefined, limit: number) {
  return (items ?? [])
    .map((item) => ({
      title: cleanSentence(item.title),
      content: cleanSentence(item.content)
    }))
    .filter((item) => item.title && item.content)
    .slice(0, limit);
}

function normalizeInsightTitle(prefix: string, index: number, content: string) {
  const firstSentence = cleanSentence(content).slice(0, 16);
  return firstSentence || `${prefix} ${index + 1}`;
}

function normalizeInsights(
  items: z.infer<typeof llmEnhancementSchema>["growthInsights"] | z.infer<typeof llmEnhancementSchema>["buildAdvice"],
  prefix: string,
  limit: number
) {
  if (!items?.length) {
    return [];
  }

  const normalized = items.map((item, index) => {
    if (typeof item === "string") {
      const content = cleanSentence(item);
      return {
        title: normalizeInsightTitle(prefix, index, content),
        content
      };
    }

    return {
      title: cleanSentence(item.title),
      content: cleanSentence(item.content)
    };
  });

  return sanitizeInsights(normalized, limit);
}

function normalizeMarketOpportunity(items: unknown) {
  const defaultTitles = ["市场大小", "竞争强度", "细分机会", "风险提示"];
  if (!items) {
    return [];
  }

  const sourceItems = Array.isArray(items)
    ? items
    : typeof items === "object"
      ? Object.entries(items as Record<string, unknown>).map(([title, content]) => ({ title, content }))
      : [];

  const normalized = sourceItems
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          title: defaultTitles[index] ?? `市场判断 ${index + 1}`,
          content: cleanSentence(item)
        };
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as { title?: unknown; content?: unknown };
      const title = typeof record.title === "string" ? record.title : defaultTitles[index] ?? `市场判断 ${index + 1}`;
      const content = typeof record.content === "string" ? record.content : null;

      if (!content) {
        return null;
      }

      return {
        title: cleanSentence(title),
        content: cleanSentence(content)
      };
    })
    .filter((item): item is InsightItem => Boolean(item));

  return sanitizeInsights(normalized, 4);
}

function findInsightContent(items: InsightItem[] | undefined, keyword: RegExp, fallbackIndex: number) {
  const direct = (items ?? []).find((item) => keyword.test(item.title) || keyword.test(item.content));
  if (direct?.content) {
    return cleanSentence(direct.content);
  }

  return items?.[fallbackIndex]?.content ? cleanSentence(items[fallbackIndex].content) : undefined;
}

function buildDecisionCardsFromEnhancement(enhancement: {
  marketOpportunity?: InsightItem[];
  buildAdvice?: InsightItem[];
}) {
  const market = findInsightContent(enhancement.marketOpportunity, /市场|机会|增长|空间/, 0);
  const competition = findInsightContent(enhancement.marketOpportunity, /竞争/, 1);
  const advice = findInsightContent(enhancement.buildAdvice, /建议|切入|先做|聚焦|不要/, 0);

  const cards: DecisionCard[] = [];

  if (market) {
    cards.push({
      label: "市场机会",
      value: market,
      tone: /大|高|明确|强|机会/.test(market) ? "positive" : "default"
    });
  }

  if (competition) {
    cards.push({
      label: "竞争强度",
      value: competition,
      tone: /高|激烈|红海/.test(competition) ? "warning" : "default"
    });
  }

  if (advice) {
    cards.push({
      label: "是否建议做",
      value: advice,
      tone: /建议|可以|适合|优先/.test(advice) ? "positive" : "default"
    });
  }

  return sanitizeDecisionCards(cards);
}

function isTemplateDecisionCards(cards: DecisionCard[] | undefined) {
  if (!cards?.length) return true;

  const values = cards.map((card) => cleanSentence(card.value));
  const templates = [
    "需要进一步验证，但已有明确需求信号",
    "中等，建议先找垂直切口",
    "建议先从细分用户或工作流切入"
  ];

  return templates.every((template) => values.includes(template));
}

function buildPrompt(input: AnalysisInputSnapshot, fallback: AnalysisResult) {
  const compactInput = {
    siteUrl: input.siteUrl,
    siteName: input.siteName,
    pages: input.pages.map((page) => ({
      pageType: page.pageType,
      title: page.title,
      description: page.description,
      excerpt: page.excerpt
    }))
  };

  const currentAnalysis = {
    summary: fallback.summary,
    categories: fallback.categories,
    coreValue: fallback.coreValue,
    targetUsers: fallback.targetUsers
  };

  return `你是一个帮独立开发者拆解网站生意的中文分析助手。
只返回一个 JSON 对象，不要 markdown，不要解释，不要代码块。
所有字符串里的双引号请转义，禁止输出不合法 JSON。
字段只允许这些：summary, categories, coreFeatures, coreValue, targetUsers, marketOpportunity, pricingWhyWorks, decisionCards, growthInsights, buildAdvice。
用中文，大白话，不要编造页面里没有的信息。
如果你决定返回某个字段，就用你自己的分析重写它，不要照抄当前规则分析的措辞。
请尽量把所有字段都返回完整，尤其是 summary、coreFeatures、targetUsers、marketOpportunity、decisionCards、growthInsights、buildAdvice。
summary 用 2 句话以内说明“它卖什么、谁会买”。
categories 最多 5 个，尽量具体，别只写很空的词。
coreFeatures 最多 5 个，写具体能力，不要写空话。
targetUsers 最多 5 个，写成人话。
marketOpportunity 最多 4 项，对应市场大小、竞争强度、细分机会、风险提示。
pricingWhyWorks 用 1 到 2 句话解释别人为什么愿意付费。
decisionCards 必须返回 3 项，而且 label 必须严格是：市场机会、竞争强度、是否建议做。
decisionCards 的 value 必须写成结论，不要写模糊空话，不要沿用“需要进一步验证，但已有明确需求信号”这类模板句。
growthInsights 和 buildAdvice 各最多 3 项。
如果页面同时出现多个模型品牌（例如 Kling、Sora、Veo、Runway、SeeDance 等），并且强调 one platform / single dashboard / switch between models / no more juggling multiple subscriptions，这类产品优先判断为“多模型聚合平台 / 工作台”，而不是单一模型工具。
如果页面强调 largest directory / tools directory / 收录 / 榜单 / 导航 / GPT store，这类产品优先判断为“目录站 / 流量聚合平台”，而不是普通 SaaS 工具。
网站页面信息：${JSON.stringify(compactInput)}
当前规则分析：${JSON.stringify(currentAnalysis)}`;
}

export async function analyzeWithLlm(input: AnalysisInputSnapshot, fallback: AnalysisResult): Promise<LlmEnhancement | null> {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!model) {
    return null;
  }

  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const endpoint = process.env.LLM_ENDPOINT ?? `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 45000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const requestBody: ChatCompletionRequest = {
    model,
    temperature: 0,
    max_tokens: 1600,
    messages: [
      {
        role: "user",
        content: buildPrompt(input, fallback)
      }
    ]
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        ...requestBody,
        response_format: {
          type: "json_object"
        }
      })
    });

    if (!response.ok && response.status === 400) {
      console.warn("[llm] provider rejected json response_format, retrying without it");
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(requestBody)
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("[llm] completion request failed", response.status, errorText.slice(0, 300));
      return null;
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const rawContent = stringifyContent(data.choices?.[0]?.message?.content);
    if (!rawContent) {
      console.warn("[llm] empty content");
      return null;
    }
    const jsonText = extractJsonObject(rawContent);
    let parsedJson: unknown;
    let repairedJson = false;

    try {
      const parsedResult = parsePossiblyMalformedJson(jsonText);
      parsedJson = parsedResult.value;
      repairedJson = parsedResult.repaired;
    } catch {
      console.warn("[llm] json parse failed", jsonText.slice(0, 300));
      return null;
    }

    if (repairedJson) {
      console.warn("[llm] repaired malformed json response");
    }

    const parsed = llmEnhancementSchema.safeParse(parsedJson);

    if (!parsed.success) {
      console.warn("[llm] schema parse failed", JSON.stringify(parsed.error.flatten()).slice(0, 500));
      return null;
    }

    const enhancement = {
      summary: parsed.data.summary ? cleanSentence(parsed.data.summary) : undefined,
      categories: sanitizeTextArray(parsed.data.categories, 5),
      coreFeatures: sanitizeTextArray(parsed.data.coreFeatures, 5),
      coreValue: parsed.data.coreValue ? cleanSentence(parsed.data.coreValue) : undefined,
      targetUsers: sanitizeTextArray(parsed.data.targetUsers, 5),
      marketOpportunity: normalizeMarketOpportunity(parsed.data.marketOpportunity),
      pricingWhyWorks: parsed.data.pricingWhyWorks ? cleanSentence(parsed.data.pricingWhyWorks) : undefined,
      decisionCards: normalizeDecisionCards(parsed.data.decisionCards),
      growthInsights: normalizeInsights(parsed.data.growthInsights, "增长判断", 3),
      buildAdvice: normalizeInsights(parsed.data.buildAdvice, "切入建议", 3)
    };

    if (enhancement.decisionCards.length === 0 || isTemplateDecisionCards(enhancement.decisionCards)) {
      enhancement.decisionCards = buildDecisionCardsFromEnhancement(enhancement);
    }

    return enhancement;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      console.warn("[llm] request failed", message);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
}
