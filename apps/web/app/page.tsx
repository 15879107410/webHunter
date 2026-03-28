import Link from "next/link";
import { AnalyzeUrlForm } from "@/src/components/analyze-url-form";
import { PageShell, Card, SectionTitle, Pill } from "@/src/components/ui";
import { searchSuggestions } from "@/src/data/mock-data";
import { getBookmarks, getRecentResearch } from "@/src/lib/api";

export default async function HomePage() {
  const [researchItems, bookmarks] = await Promise.all([getRecentResearch(), getBookmarks()]);
  const recentFavorites = bookmarks.slice(0, 3);

  return (
    <PageShell currentPath="/">
      <section className="hero-gradient px-6 py-20 md:py-28">
        <div className="section-shell text-center">
          <span className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            V2.0 版本已上线
          </span>
          <h1 className="mx-auto max-w-5xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            <span className="text-primary italic">秒级理解</span>任何网站的业务逻辑
          </h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-textMuted md:text-xl">
            输入一个网址，马上看懂它卖什么、卖给谁、怎么收费、为什么有人付费。帮你把陌生网站快速翻译成创业判断，而不是一堆看不懂的页面信息。
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500">
            试用阶段默认使用平台内置模型进行深度分析；如果模型暂时不可用，会自动回退为规则分析。
          </p>
          <AnalyzeUrlForm />

          <div className="mx-auto mt-8 max-w-3xl">
            <p className="mb-6 flex items-center justify-center gap-3 text-sm font-bold text-primary">
              <span className="h-px w-8 bg-primary/30" />
              你会得到什么
              <span className="h-px w-8 bg-primary/30" />
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {searchSuggestions.map((item) => (
                <div key={item} className="rounded-2xl border border-outline/50 bg-white/70 p-4 text-center text-xs font-medium text-textMuted">
                  {item}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <section className="section-shell py-24">
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="p-10">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary">📊</div>
            <h3 className="font-display text-2xl font-bold">商业拆解</h3>
            <p className="mt-4 leading-relaxed text-textMuted">看懂它卖什么、卖给谁、靠什么赚钱。</p>
          </Card>
          <Card className="p-10">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary">💡</div>
            <h3 className="font-display text-2xl font-bold">创业判断</h3>
            <p className="mt-4 leading-relaxed text-textMuted">不只总结网站内容，还告诉你这个方向还能不能做。</p>
          </Card>
          <Card className="p-10">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary">🔖</div>
            <h3 className="font-display text-2xl font-bold">收藏沉淀</h3>
            <p className="mt-4 leading-relaxed text-textMuted">把值得研究的网站存进灵感库，后面统一回看和筛选。</p>
          </Card>
        </div>
      </section>

      <section className="bg-surfaceAlt py-24">
        <div className="section-shell space-y-24">
          <div>
            <SectionTitle
              title="最近研究"
              description="你最近分析过的网站，方便继续判断和复盘"
              action={
                <Link href="/results" className="text-sm font-bold text-primary hover:underline">查看完整历史</Link>
              }
            />
            {researchItems.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {researchItems.map((item) => (
                  <Link key={item.id} href={`/result/${item.id}`} className="block">
                    <Card className="rounded-3xl transition hover:-translate-y-0.5 hover:shadow-soft">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">◎</div>
                        <div>
                          <h4 className="font-display text-sm font-bold">{item.name}</h4>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{item.category}</p>
                        </div>
                      </div>
                      <p className="mb-4 text-sm leading-relaxed text-textMuted">{item.summary}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <Pill key={tag}>{tag}</Pill>
                        ))}
                        {item.analysisMode ? (
                          <Pill tone={item.analysisMode === "llm" ? "positive" : "default"}>
                            {item.analysisMode === "llm" ? "LLM" : "规则"}
                          </Pill>
                        ) : null}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="rounded-3xl border-dashed bg-white/70 p-8 text-center">
                <h4 className="font-display text-xl font-bold">还没有真实分析结果</h4>
                <p className="mt-3 text-sm leading-relaxed text-textMuted">
                  先分析一个真实网站，这里就会展示最近跑出来的结果，不再使用演示数据占位。
                </p>
              </Card>
            )}
          </div>

          <div>
            <SectionTitle title="最近收藏" description="被你标记为高价值的灵感库内容" />
            {recentFavorites.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {recentFavorites.map((item) => (
                  <Card key={item.id} className="relative">
                    <div className="absolute right-6 top-6 text-primary">★</div>
                    <h4 className="font-display text-lg font-bold">{item.name}</h4>
                    <p className="mt-2 text-sm text-textMuted">{item.oneLiner}</p>
                    <div className="mt-5 space-y-3 border-t border-zinc-100 pt-5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">机会等级</span>
                        <Pill tone="positive">{item.opportunityLevel}</Pill>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-400">收费模式</span>
                        <span className="font-medium text-textPrimary">{item.pricingModel}</span>
                      </div>
                    </div>
                    <p className="mt-4 text-right text-[11px] text-zinc-400">域名 {item.domain}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="rounded-3xl border-dashed bg-white/70 p-8 text-center">
                <h4 className="font-display text-xl font-bold">还没有真实收藏</h4>
                <p className="mt-3 text-sm leading-relaxed text-textMuted">
                  当你在结果页点击“收藏到灵感库”后，这里会展示真实保存下来的站点。
                </p>
              </Card>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
