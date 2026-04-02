"use client";

import { useState, useTransition } from "react";
import type { AnalysisResult } from "@webhunter/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function BookmarkButton({ result }: { result: AnalysisResult }) {
  const [isSaved, setIsSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    setMessage("");

    const payload = {
      id: result.id,
      name: result.siteName,
      domain: new URL(result.siteUrl).hostname,
      label: result.decisionCards[0]?.value ?? "研究中",
      oneLiner: result.summary,
      pricingModel: `${result.pricing.model} / ${result.pricing.startingPrice}`,
      targetUsers: result.targetUsers.join("、"),
      opportunityLevel: result.decisionCards[0]?.value ?? "待判断",
      note: result.buildAdvice[0]?.content ?? "待补充备注"
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "收藏失败，请稍后再试");
      }

      startTransition(() => {
        setIsSaved(true);
        setMessage("已加入灵感库，稍后可以继续比较和写备注");
      });
    } catch {
      startTransition(() => {
        setMessage("收藏失败，请稍后再试");
      });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isPending || isSaved}
        className="rounded-xl bg-primary/10 px-6 py-3 text-sm font-bold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaved ? "已收藏" : isPending ? "收藏中..." : "收藏到灵感库"}
      </button>
      {message ? (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg bg-zinc-800 p-3 text-xs text-white shadow-xl">
          {message}
        </div>
      ) : null}
    </div>
  );
}
