"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function AnalyzeUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();

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

  const isWorking = isSubmitting || isPending;

  function getLoadingMessage() {
    if (elapsedSeconds >= 12) {
      return "正在调用大模型做深度分析，复杂网站通常会更久一点。";
    }

    if (elapsedSeconds >= 6) {
      return "已经拿到页面内容，正在整理定价、用户和市场判断。";
    }

    if (elapsedSeconds >= 2) {
      return "正在抓取网站首页和关键页面，请稍等。";
    }

    return "已开始分析，你不用重复点击。";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitUrl(url);
  }

  async function submitUrl(nextUrl: string) {
    if (!nextUrl.trim()) {
      setError("请输入要分析的网站 URL");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ url: nextUrl })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "分析失败，请稍后再试");
      }

      const data = (await response.json()) as { id: string; reused?: boolean };
      startTransition(() => {
        router.push(`/result/${data.id}`);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "分析失败，请稍后再试";
      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-12 max-w-3xl">
      <div className="flex flex-col gap-2 rounded-[1.5rem] bg-surface p-2 shadow-soft md:flex-row">
        <div className="flex flex-1 items-center gap-3 px-4">
          <span className="text-zinc-400">🌐</span>
          <input
            value={url}
            disabled={isWorking}
            onChange={(event) => setUrl(event.target.value)}
            className="w-full border-none bg-transparent text-base outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="输入网站 URL (例如 stripe.com)"
          />
        </div>
        <button
          type="submit"
          disabled={isWorking}
          className="rounded-xl bg-primary px-8 py-4 text-sm font-bold text-white transition hover:bg-primaryContainer disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isWorking ? "分析中..." : "立即分析"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {isWorking ? (
        <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-left shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            <p className="text-sm font-bold text-primary">正在分析 {url.trim() || "当前网站"}</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-textMuted">{getLoadingMessage()}</p>
          <p className="mt-2 text-xs text-zinc-500">
            {elapsedSeconds > 0 ? `已等待 ${elapsedSeconds} 秒` : "刚刚开始"}
            {elapsedSeconds >= 8 ? "，请保持当前页面打开。" : "。"}
          </p>
        </div>
      ) : null}
      <div className="mt-3 space-y-1 text-center text-xs text-zinc-500">
        <p>同一个网址如果已经分析过，会直接打开已有结果。</p>
        <p>试用阶段默认使用平台内置模型；模型不可用时会自动回退到规则分析。</p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4 text-xs text-zinc-500">
        <span>试试这些：</span>
        {["gumroad.com", "notion.so", "linear.app"].map((site) => (
          <button
            key={site}
            type="button"
            disabled={isWorking}
            onClick={() => {
              setUrl(site);
              void submitUrl(site);
            }}
            className="underline decoration-primary/20 underline-offset-4 hover:text-primary disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
          >
            {site}
          </button>
        ))}
      </div>
    </form>
  );
}
