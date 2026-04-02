"use client";

import { useMemo, useState } from "react";
import type { BookmarkRecord, FilterOption } from "@webhunter/shared";
import { BookmarkCard } from "@/src/components/bookmark-card";
import { Card } from "@/src/components/ui";
import Link from "next/link";
import { getEffectiveBookmarkClassification } from "@/src/lib/bookmark-classification";

function matchesFilter(item: BookmarkRecord, filter: string) {
  if (filter === "全部") return true;

  const haystack = [
    getEffectiveBookmarkClassification(item),
    item.label,
    item.oneLiner,
    item.pricingModel,
    item.targetUsers,
    item.opportunityLevel,
    item.note
  ].join(" ");
  return haystack.includes(filter);
}

export function BookmarksBrowser({
  items,
  filters
}: {
  items: BookmarkRecord[];
  filters: FilterOption[];
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(filters.find((item) => item.active)?.label ?? "全部");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [
            item.name,
            item.domain,
            getEffectiveBookmarkClassification(item),
            item.oneLiner,
            item.pricingModel,
            item.targetUsers,
            item.opportunityLevel,
            item.note
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        return matchesQuery && matchesFilter(item, activeFilter);
      }),
    [items, normalizedQuery, activeFilter]
  );

  return (
    <div className="flex-1">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索已保存的分析..."
          className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-textPrimary outline-none"
        />
        <div className="flex flex-1 gap-2 overflow-auto">
          {filters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter.label)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold ${
                activeFilter === filter.label ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white text-textMuted"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="text-xs font-bold text-primary">显示 {visibleItems.length} 条</div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {visibleItems.map((item) => (
          <BookmarkCard key={item.id} item={item} />
        ))}

        <Card className="flex min-h-[410px] flex-col items-center justify-center border-dashed text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 text-4xl text-zinc-400">
            ⌕
          </div>
          <h3 className="font-display text-xl font-bold">
            {visibleItems.length === 0 ? "没有筛到匹配内容" : "还没有新的研究对象？"}
          </h3>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-textMuted">
            {visibleItems.length === 0
              ? "换个关键词或者筛选条件试试，或者去分析一个新网站。"
              : "去分析一个网站，把值得跟进的方向存进灵感库。"}
          </p>
          <Link href="/" className="mt-8 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white">
            开始分析
          </Link>
        </Card>
      </div>
    </div>
  );
}
