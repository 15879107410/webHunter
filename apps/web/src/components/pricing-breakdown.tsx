"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult } from "@webhunter/shared";
import { Card, Pill } from "@/src/components/ui";

type PricingBreakdownProps = {
  pricing: AnalysisResult["pricing"];
};

export function PricingBreakdown({ pricing }: PricingBreakdownProps) {
  const [open, setOpen] = useState(false);
  const pricePoints = (pricing.pricePoints ?? []).filter(Boolean);
  const pricingPlans = (pricing.plans ?? []).map((plan) => ({
    ...plan,
    label: plan.label.replace(/月度 计划/g, "月度计划").replace(/年度 计划/g, "年度计划")
  }));
  const previewPoints = pricePoints.slice(0, 2);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {previewPoints.length > 0 ? (
        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">价格预览</p>
          <div className="flex flex-wrap gap-3">
            {previewPoints.map((point, index) => (
              <div
                key={`${point}-${index}`}
                className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-bold text-primary"
              >
                {point}
              </div>
            ))}
          </div>
          {pricePoints.length > 2 ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-4 text-sm font-bold text-primary underline underline-offset-4"
            >
              查看完整价格构成
            </button>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 md:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">完整价格构成</p>
                <h4 className="mt-2 font-display text-2xl font-bold text-textPrimary">检测到的价格点</h4>
                <p className="mt-2 text-sm leading-relaxed text-textMuted">
                  这里展示当前抓到的完整价格列表。结果页主区域只展示前两个，避免信息过长。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-bold text-zinc-500"
              >
                关闭
              </button>
            </div>

            <div className="space-y-6 px-6 py-6 md:px-8">
              {pricingPlans.length > 0 ? (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">套餐明细</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {pricingPlans.map((plan) => (
                      <Card key={`${plan.label}-${plan.price}`} className="rounded-3xl p-5">
                        <p className="mb-2 text-sm font-bold text-textPrimary">{plan.label}</p>
                        <p className="text-lg font-extrabold text-primary">{plan.price}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {pricePoints.map((point, index) => (
                  <Pill key={`${point}-${index}`} tone={index === 0 ? "positive" : "default"}>
                    {point}
                  </Pill>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-3xl p-5">
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">起步价格</p>
                  <p className="text-xl font-extrabold text-primary">{pricing.startingPrice}</p>
                </Card>
                <Card className="rounded-3xl p-5">
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">定价模型</p>
                  <p className="text-sm font-bold leading-relaxed text-textPrimary">{pricing.model}</p>
                </Card>
                <Card className="rounded-3xl p-5">
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">计费周期</p>
                  <p className="text-sm font-bold leading-relaxed text-textPrimary">{pricing.billingCycle}</p>
                </Card>
                <Card className="rounded-3xl p-5">
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">免费版 / 试用</p>
                  <p className="text-sm font-bold leading-relaxed text-textPrimary">{pricing.trial}</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
