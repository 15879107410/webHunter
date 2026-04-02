"use client";

import Link from "next/link";
import { useState } from "react";
import type { ResearchCard } from "@webhunter/shared";
import { Card, Pill } from "@/src/components/ui";

const filters = ["全部", "AI", "金融科技", "开发工具", "营销增长", "创意工具", "SaaS", "B2B"];

export function ResultsBrowser({ items }: { items: ResearchCard[] }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = items.filter((item) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.domain.toLowerCase().includes(normalizedQuery) ||
      item.summary.toLowerCase().includes(normalizedQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

    const matchesFilter =
      activeFilter === "全部" ||
      item.category === activeFilter ||
      item.tags.includes(activeFilter);

    return matchesQuery && matchesFilter;
  });

  function formatAnalyzedAt(value?: string) {
    if (!value) return "分析时间未记录";

    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function getCoverageLabel(level?: ResearchCard["coverageLevel"]) {
    if (level === "high") return "覆盖高";
    if (level === "medium") return "覆盖中";
    return "覆盖低";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-outline/70 bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索网站名、域名、摘要或标签..."
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-textPrimary outline-none xl:max-w-sm"
          />
          <div className="flex flex-1 gap-2 overflow-auto">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold ${
                  activeFilter === filter ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white text-textMuted"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-400">当前显示 {visibleItems.length} 条结果，退回首页后也可以从这里继续查看。</p>
      </div>

      {visibleItems.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <Card key={item.id} className="flex h-full flex-col rounded-[1.75rem] p-8">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold leading-tight">{item.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{item.domain}</p>
                </div>
                <Pill className="max-w-[7.5rem] truncate px-2.5">{item.category}</Pill>
              </div>

              <p className="flex-1 text-sm leading-relaxed text-textMuted">{item.summary}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Pill key={tag}>{tag}</Pill>
                ))}
                {item.analysisMode ? <Pill tone={item.analysisMode === "llm" ? "positive" : "default"}>{item.analysisMode === "llm" ? "LLM" : "规则"}</Pill> : null}
                {item.coverageLevel ? <Pill tone={item.coverageLevel === "high" ? "positive" : item.coverageLevel === "medium" ? "warning" : "danger"}>{getCoverageLabel(item.coverageLevel)}</Pill> : null}
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-5">
                <div className="text-xs text-zinc-400">
                  <p>结果已保存，可反复查看</p>
                  <p className="mt-1">{formatAnalyzedAt(item.analyzedAt)} · {item.pageCount ? `抓取 ${item.pageCount} 页` : "抓取页数未记录"}</p>
                </div>
                <Link
                  href={`/result/${item.id}`}
                  className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white"
                >
                  打开结果
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex min-h-64 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surfaceAlt text-4xl text-zinc-400">
            ⌕
          </div>
          <h2 className="font-display text-2xl font-bold">没有找到匹配结果</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-textMuted">
            换个关键词试试，或者先去分析一个新网站，结果会自动进入这里。
          </p>
          <Link
            href="/"
            className="mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
          >
            去分析一个网站
          </Link>
        </Card>
      )}
    </div>
  );
}
