"use client";

import { useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function ReanalyzeButton({ siteUrl }: { siteUrl: string }) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isWorking = isSubmitting;

  useEffect(() => {
    if (!isSubmitting) {
      setElapsedSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isSubmitting]);

  function getLoadingMessage() {
    if (elapsedSeconds >= 12) {
      return "正在调用大模型重新生成分析，复杂网站通常会更久一点。";
    }

    if (elapsedSeconds >= 6) {
      return "已经拿到页面内容，正在重新整理用户、收费和市场判断。";
    }

    if (elapsedSeconds >= 2) {
      return "正在重新抓取关键页面，请稍等。";
    }

    return "已开始重新生成，你不用重复点击。";
  }

  async function handleClick() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ url: siteUrl, force: true })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "重新分析失败，请稍后再试");
      }

      const data = (await response.json()) as { id: string };
      window.location.assign(`/result/${data.id}?refresh=${Date.now()}`);
    } catch {
      setError("重新分析失败，请稍后再试");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          disabled={isWorking}
          className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-textPrimary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isWorking ? "重新生成中..." : "重新分析"}
        </button>
        {isWorking ? (
          <div className="absolute right-0 top-full z-20 mt-3 w-72 rounded-2xl border border-primary/15 bg-white/95 px-4 py-3 text-left shadow-xl backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
              <p className="text-xs font-bold text-primary">正在重新生成当前结果</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-textMuted">{getLoadingMessage()}</p>
            <p className="mt-2 text-[11px] text-zinc-500">
              {elapsedSeconds > 0 ? `已等待 ${elapsedSeconds} 秒` : "刚刚开始"}
              {elapsedSeconds >= 8 ? "，请保持当前页面打开。" : "。"}
            </p>
          </div>
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
