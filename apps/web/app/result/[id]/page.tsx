import { notFound } from "next/navigation";
import Link from "next/link";
import { BookmarkButton } from "@/src/components/bookmark-button";
import { PricingBreakdown } from "@/src/components/pricing-breakdown";
import { ReanalyzeButton } from "@/src/components/reanalyze-button";
import { Card, PageShell, Pill, SectionTitle } from "@/src/components/ui";
import { getAllResearch, getAnalysisResult } from "@/src/lib/api";

function UserGroupIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7.5 10.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
      <path d="M16.5 10.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
      <path d="M12 8.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" />
      <path d="M3.75 17.75c0-2.1 2.02-3.8 4.5-3.8s4.5 1.7 4.5 3.8" />
      <path d="M11.25 17.75c0-2.55 2.35-4.6 5.25-4.6s5.25 2.05 5.25 4.6" />
    </svg>
  );
}

function CodeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
    </svg>
  );
}

function ScreenIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="11" rx="2" />
      <path d="M8 19h8" />
      <path d="M12 16v3" />
      <path d="m7.5 9 2.5 2.5L7.5 14" />
    </svg>
  );
}

function RocketIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M14 4c3.5 0 6 2.5 6 6-3.5 0-6-2.5-6-6Z" />
      <path d="M13 5 7 11c-1.5 1.5-1.5 4 0 5.5L7.5 17c1.5 1.5 4 1.5 5.5 0l6-6" />
      <path d="m6 18-2 2" />
      <path d="m8 20-1 1" />
      <circle cx="14.5" cy="9.5" r="1.2" />
    </svg>
  );
}

function compactTargetUserLabel(user: string) {
  return user
    .replace(/\s+/g, " ")
    .trim()
    .split(/[，,:：]/)[0]
    ?.replace(/\s*\/\s*/g, "和")
    .replace(/^需要/, "")
    .trim() ?? user;
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, allResearch] = await Promise.all([getAnalysisResult(id), getAllResearch()]);

  if (!data) {
    notFound();
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
  const exportHref = `${apiBaseUrl}/api/analysis/${data.id}/export.md`;
  const lowCoverage = (data.meta?.pageCount ?? 0) <= 1;
  const partialCoverage = !lowCoverage && (data.meta?.missingPageTypes?.length ?? 0) > 0;
  const analyzedAt = data.meta?.analyzedAt
    ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(data.meta.analyzedAt))
    : "分析时间未记录";
  const relatedItems = allResearch
    .filter((item) => item.id !== data.id)
    .filter(
      (item) =>
        item.category === data.categories[0] ||
        item.tags.some((tag) => data.categories.includes(tag) || tag === data.pricing.model)
    )
    .slice(0, 4);
  const priceSuffix = data.pricing.model.includes("按用量")
    ? "起步价 / 检测到的主要价格点"
    : data.pricing.billingCycle !== "页面未明确"
      ? `起步价 / ${data.pricing.billingCycle}`
      : "起步价";
  const compactTargetUsers = data.targetUsers.slice(0, 3).map(compactTargetUserLabel);
  const targetUserIcons = [
    <CodeIcon key="code" className="h-5 w-5" />,
    <ScreenIcon key="screen" className="h-5 w-5" />,
    <RocketIcon key="rocket" className="h-5 w-5" />
  ];

  return (
    <PageShell currentPath="/results">
      <header className="bg-zinc-50 pb-8 pt-10">
        <div className="section-shell">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{data.siteName}</h1>
                <Pill tone={data.meta?.analysisMode === "llm" ? "positive" : "default"}>
                  {data.meta?.analysisMode === "llm" ? "LLM 深度分析" : data.statusLabel}
                </Pill>
                {data.meta?.analysisMode && data.statusLabel !== "LLM 深度分析" ? (
                  <Pill tone={data.meta.analysisMode === "llm" ? "positive" : "default"}>
                    {data.meta.analysisMode === "llm" ? "LLM 深度分析" : "规则分析"}
                  </Pill>
                ) : null}
              </div>
              <p className="text-sm font-medium text-zinc-500">{data.siteUrl}</p>
              <p className="mt-2 text-xs text-zinc-400">
                {analyzedAt}
                {data.meta?.pageCount ? ` · 抓取 ${data.meta.pageCount} 个页面` : ""}
                {data.meta?.pageTypes?.length ? ` · 页面类型：${data.meta.pageTypes.join(" / ")}` : ""}
              </p>
              {data.meta?.missingPageTypes?.length ? (
                <p className="mt-1 text-xs text-amber-600">未抓到关键页：{data.meta.missingPageTypes.join(" / ")}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-3">
              <p className="text-[11px] text-zinc-500">当前结果 ID：{data.id}</p>
              <div className="flex flex-wrap justify-end gap-3">
                <Link
                  href={`/result/${data.id}/input`}
                  className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-textPrimary"
                >
                  查看原始抓取
                </Link>
                <BookmarkButton result={data} />
                <Link
                  href={exportHref}
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
                  target="_blank"
                >
                  导出完整报告
                </Link>
                <ReanalyzeButton siteUrl={data.siteUrl} />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {data.decisionCards.map((item) => (
              <Card key={item.label} className="rounded-3xl bg-white p-5">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">{item.label}</p>
                <p className="text-lg font-bold text-textPrimary">{item.value}</p>
              </Card>
            ))}
          </div>
        </div>
      </header>

      <div className="section-shell space-y-12 py-10">
        <Card className="border-primary/10 bg-primary/5 p-5">
          <p className="text-sm font-bold text-primary">试用阶段提示</p>
          <p className="mt-2 text-sm leading-relaxed text-textMuted">
            {data.meta?.analysisMode === "llm"
              ? "本次结果使用平台内置模型生成。后续正式收费后，将按平台统一模型能力提供深度分析。"
              : "本次结果已回退为规则分析，说明当前平台内置模型没有参与本次生成。"}
          </p>
        </Card>

        {lowCoverage ? (
          <Card className="border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-bold text-amber-800">当前只抓到首页，结论偏保守</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-700">
              这次分析主要基于首页公开信息，像定价、FAQ、场景细分这些判断可能不够完整。后面我会继续增强深层抓取能力。
            </p>
          </Card>
        ) : null}

        {partialCoverage ? (
          <Card className="border-sky-200 bg-sky-50 p-6">
            <p className="text-sm font-bold text-sky-800">当前已经抓到部分关键页，但证据还不算完整</p>
            <p className="mt-2 text-sm leading-relaxed text-sky-700">
              这次已经抓到 {data.meta?.pageTypes?.join(" / ")}，但还缺 {data.meta?.missingPageTypes?.join(" / ")}，
              所以结果页里的市场判断、用户细分或收费逻辑仍然可能偏保守。
            </p>
          </Card>
        ) : null}

        <Card className="overflow-hidden p-8 md:p-12">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-primary">一句话看懂</p>
          <p className="max-w-4xl font-display text-2xl font-semibold leading-tight md:text-3xl">{data.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {data.categories.map((category) => (
              <Pill key={category}>{category}</Pill>
            ))}
          </div>
        </Card>

        <section className="grid gap-6 md:grid-cols-12">
          <Card className="md:col-span-8 p-8">
            <h3 className="mb-8 font-display text-xl font-bold">产品定位分析</h3>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">核心功能</p>
                {data.coreFeatures.length > 0 ? (
                  <ul className="space-y-3 text-sm font-medium text-textMuted">
                    {data.coreFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="text-primary">✔</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-zinc-400">
                    当前可抓到的页面较少，核心功能还不够完整。后续抓到更多页面后，这里会更具体。
                  </p>
                )}
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">本质上卖的是</p>
                <p className="text-sm font-bold leading-relaxed text-textMuted">{data.coreValue}</p>
              </div>
            </div>
          </Card>

          <div className="md:col-span-4">
            <section className="rounded-[2rem] bg-primary px-10 py-10 text-white shadow-soft">
              <div className="mb-8 flex items-center gap-4">
                <div className="inline-flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-white/18 text-[#dcfff5]">
                  <UserGroupIcon className="h-8 w-8" />
                </div>
                <h3 className="font-display text-[2rem] font-bold tracking-tight text-white">目标用户分析</h3>
              </div>
              {compactTargetUsers.length > 0 ? (
                <div className="space-y-4">
                  {compactTargetUsers.map((user, index) => (
                    <div
                      key={`${user}-${index}`}
                      className="flex min-h-[4.3rem] items-center gap-4 rounded-[1.2rem] bg-[rgba(103,162,145,0.5)] px-6 py-3.5"
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[#8ef6da]">
                        {targetUserIcons[index] ?? <CodeIcon className="h-5 w-5" />}
                      </span>
                      <span className="text-[0.95rem] font-semibold leading-tight text-white">{user}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.55rem] bg-[rgba(103,162,145,0.5)] px-7 py-6 text-base leading-relaxed text-white/85">
                  当前没有提取到明确的目标用户信息。
                </div>
              )}
            </section>
          </div>

          <Card className="bg-surfaceAlt p-8 md:col-span-6">
            <h3 className="mb-8 font-display text-xl font-bold">市场机会判断</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {data.marketOpportunity.map((item) => (
                <div key={item.title}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{item.title}</p>
                  <p className="text-sm font-bold leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8 md:col-span-6">
            <h3 className="mb-8 font-display text-xl font-bold">收费与商业模式分析</h3>
            <div className="mb-2 flex items-end gap-2">
              <span className="font-display text-4xl font-extrabold text-primary">{data.pricing.startingPrice}</span>
              <span className="pb-1 text-sm font-medium text-textMuted">{priceSuffix}</span>
            </div>
            <p className="mb-6 text-xs italic text-zinc-500">{data.pricing.whyPricingWorks}</p>
            <PricingBreakdown pricing={data.pricing} />
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 py-3">
                <span className="text-sm text-textMuted">商业模式</span>
                <span className="text-sm font-bold text-primary">{data.pricing.model}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-100 py-3">
                <span className="text-sm text-textMuted">计费周期</span>
                <span className="text-sm font-bold text-primary">{data.pricing.billingCycle}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-textMuted">免费版/试用</span>
                <span className="text-sm font-bold text-primary">{data.pricing.trial}</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle title="核心增长逻辑" />
            <div className="space-y-6">
              {data.growthInsights.map((item) => (
                <div key={item.title}>
                  <h4 className="mb-2 font-bold">{item.title}</h4>
                  <p className="border-l-2 border-zinc-200 pl-4 leading-relaxed text-textMuted">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
          <Card className="relative border-primary/20 bg-white p-8 shadow-soft">
            <div className="absolute left-0 top-10 h-24 w-1 rounded-r-full bg-gradient-to-b from-primary to-primaryContainer" />
            <h3 className="mb-6 font-display text-xl font-bold text-primary">创业切入建议</h3>
            <div className="space-y-5">
              {data.buildAdvice.map((item) => (
                <div key={item.title} className="rounded-2xl bg-zinc-50 p-5">
                  <h4 className="text-sm font-bold">{item.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-textMuted">{item.content}</p>
                </div>
              ))}
              <p className="text-xs italic text-zinc-500">AI 建议主要基于当前抓到的页面文案和公开定位信息生成，覆盖较低时请把它当成方向参考，不要当成绝对结论。</p>
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle title="相似产品 / 可继续研究" />
          {relatedItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-4">
              {relatedItems.map((item) => (
                <Link key={item.id} href={`/result/${item.id}`} className="block">
                  <Card className="flex min-h-32 flex-col justify-between rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{item.category}</p>
                      <h4 className="font-display text-lg font-bold">{item.name}</h4>
                      <p className="mt-3 text-sm leading-relaxed text-textMuted">{item.summary}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Pill key={tag}>{tag}</Pill>
                      ))}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              {data.similarProducts.map((item) => (
                item.status === "ready" && item.id ? (
                  <Link key={item.id} href={`/result/${item.id}`} className="block">
                    <Card className="flex min-h-32 flex-col justify-between rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
                      <div>
                        {item.category ? (
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{item.category}</p>
                        ) : null}
                        <h4 className="font-display text-lg font-bold">{item.name}</h4>
                        {item.summary ? (
                          <p className="mt-3 text-sm leading-relaxed text-textMuted">{item.summary}</p>
                        ) : null}
                      </div>
                      <div className="mt-4">
                        <Pill tone="positive">可继续研究</Pill>
                      </div>
                    </Card>
                  </Link>
                ) : (
                  <Card key={item.name} className="flex min-h-32 flex-col items-center justify-center gap-2 border-dashed bg-surfaceAlt text-center opacity-80">
                    <span className="text-3xl">＋</span>
                    <span className="text-sm font-bold">待添加 {item.name}</span>
                  </Card>
                )
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-zinc-100 pt-12">
          <SectionTitle title="分析依据 (这份结论基于什么)" />
          <div className="grid gap-8 md:grid-cols-3">
            {data.evidenceGroups.map((group) => (
              <div key={group.level}>
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">{group.title}</p>
                <div className="space-y-4">
                  {group.items.map((item) => (
                    <Card key={item.title} className="rounded-2xl p-4">
                      <h4 className="text-sm font-bold">{item.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-textMuted">{item.detail}</p>
                      {item.snippet ? (
                        <div className="mt-3 rounded-lg bg-surfaceAlt px-2 py-1 font-mono text-[10px] text-primary">{item.snippet}</div>
                      ) : null}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="证据快照" description="已分析 3 个数据源" />
          <div className="grid gap-6 md:grid-cols-3">
            {data.evidenceSnapshots.map((item) => (
              <div key={item.title} className="aspect-video rounded-2xl bg-zinc-200 p-5 text-white shadow-soft">
                <div className="flex h-full flex-col justify-end rounded-xl bg-gradient-to-t from-zinc-900 to-zinc-800 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{item.title}</p>
                  <p className="mt-2 text-sm font-medium">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
