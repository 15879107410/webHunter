"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult } from "@webhunter/shared";
import { Card } from "@/src/components/ui";

type PricingBreakdownProps = {
  pricing: AnalysisResult["pricing"];
  hasPricingPage: boolean;
};

export function PricingBreakdown({ pricing, hasPricingPage }: PricingBreakdownProps) {
  const [open, setOpen] = useState(false);
  const pricePoints = (pricing.pricePoints ?? []).filter(Boolean);
  const pricingPlans = (pricing.plans ?? []).map((plan) => ({
    ...plan,
    label: plan.label.replace(/月度 计划/g, "月度计划").replace(/年度 计划/g, "年度计划")
  }));
  const structuredPricing = pricingPlans.length > 0;
  const pricingMode = pricing.presentationMode ?? (structuredPricing ? "static" : "unknown");
  const pricingPageUrl = pricing.pricingPageUrl?.trim();
  const useExternalPricingPage = pricingMode === "calculator" && Boolean(pricingPageUrl);
  const canOpenModal = structuredPricing && !useExternalPricingPage;
  const hasDetailsAction = canOpenModal || useExternalPricingPage || pricePoints.length > 2;
  const previewPlans = structuredPricing && !useExternalPricingPage ? pricingPlans.slice(0, 2) : [];
  const previewPoints = structuredPricing || useExternalPricingPage
    ? []
    : ([
        pricing.startingPrice && pricing.startingPrice !== "未明确" ? pricing.startingPrice : null,
        pricing.model,
        pricing.billingCycle !== "页面未明确" ? pricing.billingCycle : null
      ].filter(Boolean) as string[]);

  function explainPricing() {
    if (!hasPricingPage) {
      return "没有抓到价格页，所以这里展示的是基于首页和其它页面推断出来的收费判断，可能不完整。";
    }

    if (useExternalPricingPage) {
      return "这是一个可配置价格页，价格会随着人数、额度或套餐配置变化。结果页只展示两个常用价格，完整价格建议直接去原站查看。";
    }

    if (structuredPricing) {
      return "已经抓到完整价格页，这里先展示两个最重要的套餐，点开可看完整价格结构。";
    }

    if (pricing.model.includes("按用量")) {
      return "这个站的收费更像按用量计费，常见于 API、生成次数、任务额度这类产品。";
    }

    if (pricing.model.includes("订阅") || pricing.model.includes("席位")) {
      return "这个站的收费更像订阅制或分层套餐，常见于按月/按年付费的 SaaS。";
    }

    if (pricePoints.length > 1) {
      return "这里抓到多个价格线索，说明它大概率不是单一价格，而是分层套餐或多个档位并存。";
    }

    return "这里先展示抓到的价格结论和原始线索，方便你快速判断它是怎么卖的。";
  }

  function compactText(text: string, maxLength = 96) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

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
      {!hasPricingPage ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          没有抓到价格页，所以这里展示的是基于首页和其它页面推断出来的收费判断，可能不完整。
        </div>
      ) : null}

      {(useExternalPricingPage && pricingPageUrl) || (structuredPricing && previewPlans.length > 0) || previewPoints.length > 0 ? (
        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">价格预览</p>
          {useExternalPricingPage ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="rounded-3xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-sm font-bold text-textPrimary">起步价格</p>
                <p className="mt-2 text-2xl font-extrabold text-primary">
                  {pricing.startingPrice && pricing.startingPrice !== "未明确" ? pricing.startingPrice : "未明确"}
                </p>
              </Card>
              <Card className="rounded-3xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-sm font-bold text-textPrimary">价格模式</p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-textMuted">按人数 / 配置变化，建议直接查看原站完整价格页</p>
              </Card>
            </div>
          ) : structuredPricing ? (
            <div className="grid gap-3 md:grid-cols-2">
              {previewPlans.map((plan) => (
                <Card key={`${plan.label}-${plan.price}`} className="rounded-3xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-sm font-bold text-textPrimary">{plan.label}</p>
                  <p className="mt-2 text-2xl font-extrabold text-primary">{plan.price}</p>
                  {plan.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-textMuted">{compactText(plan.description, 56)}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : (
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
          )}
          {hasDetailsAction ? (
            useExternalPricingPage && pricingPageUrl ? (
              <a
                href={pricingPageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-bold text-primary underline underline-offset-4"
              >
                去原站查看完整价格页
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-4 text-sm font-bold text-primary underline underline-offset-4"
              >
                查看完整价格详情
              </button>
            )
          ) : null}
        </div>
      ) : null}

      {canOpenModal && open ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-4 md:items-center md:py-8" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 md:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">完整价格构成</p>
                <h4 className="mt-2 font-display text-2xl font-bold text-textPrimary">价格怎么收费</h4>
                <p className="mt-2 text-sm leading-relaxed text-textMuted">{explainPricing()}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-bold text-zinc-500"
              >
                关闭
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 md:px-8">
              <div className="grid gap-3 md:grid-cols-2">
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

              {structuredPricing ? (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">完整价格表</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {pricingPlans.map((plan) => (
                      <Card
                        key={`${plan.label}-${plan.price}`}
                        className={`rounded-3xl p-5 ${plan.highlighted ? "border-primary/30 bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-bold text-textPrimary">{plan.label}</p>
                          {plan.highlighted ? (
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                              推荐
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-primary">{plan.price}</p>
                        {plan.description ? (
                          <p className="mt-2 text-sm leading-relaxed text-textMuted">{compactText(plan.description, 56)}</p>
                        ) : null}
                        {plan.features && plan.features.length > 0 ? (
                          <ul className="mt-3 space-y-2 text-sm text-textMuted">
                            {plan.features.slice(0, 2).map((feature, index) => (
                              <li key={`${feature}-${index}`} className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                                <span className="break-words">{compactText(feature, 52)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {plan.features && plan.features.length > 2 ? (
                          <p className="mt-3 text-xs font-bold text-primary/80">+{plan.features.length - 2} 条权益</p>
                        ) : null}
                        {plan.cta ? (
                          <div className="mt-4 inline-flex rounded-full bg-surfaceAlt px-3 py-1 text-xs font-bold text-textMuted">
                            {plan.cta}
                          </div>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}

              {!structuredPricing && pricePoints.length > 0 ? (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                    原始价格线索
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {pricePoints.map((point, index) => (
                      <Card key={`${point}-${index}`} className="rounded-3xl border-primary/10 bg-surfaceAlt px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">线索 {index + 1}</p>
                        <p className="mt-1 text-sm font-bold text-textPrimary">{point}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
