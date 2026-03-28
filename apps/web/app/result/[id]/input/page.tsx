import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageShell, Pill, SectionTitle } from "@/src/components/ui";
import { getAnalysisInput, getAnalysisResult } from "@/src/lib/api";

export default async function ResultInputPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [snapshot, result] = await Promise.all([getAnalysisInput(id), getAnalysisResult(id)]);

  if (!snapshot || !result) {
    notFound();
  }

  const lowCoverage = snapshot.pages.length <= 1;

  return (
    <PageShell currentPath="/results">
      <header className="border-b border-zinc-100 bg-zinc-50 py-10">
        <div className="section-shell">
          <SectionTitle
            eyebrow="Input Snapshot"
            title="原始抓取输入"
            description="这里展示分析时抓到了哪些页面、标题、CTA 和正文摘要。后面排查分析质量时，这一页会很有用。"
            action={
              <Link
                href={`/result/${id}`}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                返回结果页
              </Link>
            }
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="rounded-3xl bg-white p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">网站</p>
              <p className="text-lg font-bold text-textPrimary">{snapshot.siteName}</p>
              <p className="mt-1 text-sm text-zinc-500">{snapshot.siteUrl}</p>
            </Card>
            <Card className="rounded-3xl bg-white p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">抓取页面数</p>
              <p className="text-lg font-bold text-textPrimary">{snapshot.pages.length}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {result.meta?.pageTypes?.length ? result.meta.pageTypes.join(" / ") : "首页 + 关键页面自动发现"}
              </p>
              {result.meta?.missingPageTypes?.length ? (
                <p className="mt-2 text-xs text-amber-600">未抓到：{result.meta.missingPageTypes.join(" / ")}</p>
              ) : null}
            </Card>
            <Card className="rounded-3xl bg-white p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">分析元信息</p>
              <p className="text-sm font-bold leading-relaxed text-textPrimary">
                {result.meta?.analysisMode === "llm" ? "LLM 深度分析" : "规则分析"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{result.meta?.analyzedAt ?? "分析时间未记录"}</p>
            </Card>
          </div>
        </div>
      </header>

      <section className="section-shell space-y-10 py-10">
        {lowCoverage ? (
          <Card className="border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-bold text-amber-800">当前抓取覆盖较低</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-700">
              这次只抓到首页内容，所以结果页里的收费、市场机会和用户判断会更偏保守。后面如果抓到 pricing / faq / about，结论会更完整。
            </p>
          </Card>
        ) : null}

        <section>
          <SectionTitle title="页面快照" description="每个页面会保留标题、描述、主要标题、CTA 和正文摘要。" />
          <div className="grid gap-6 lg:grid-cols-2">
            {snapshot.pages.map((page) => (
              <Card key={`${page.pageType}-${page.url}`} className="p-8">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <Pill>{page.pageType}</Pill>
                  <a href={page.url} target="_blank" className="text-sm text-primary underline underline-offset-4">
                    {page.url}
                  </a>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">标题</p>
                    <p className="text-sm font-semibold text-textPrimary">{page.title || "未抓到标题"}</p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">描述</p>
                    <p className="text-sm leading-relaxed text-textMuted">{page.description || "未抓到描述"}</p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">主要标题</p>
                    <div className="flex flex-wrap gap-2">
                      {page.headings.length > 0 ? (
                        page.headings.map((heading) => <Pill key={heading}>{heading}</Pill>)
                      ) : (
                        <span className="text-sm text-zinc-400">未抓到明显标题</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">CTA</p>
                    <div className="flex flex-wrap gap-2">
                      {page.ctas.length > 0 ? (
                        page.ctas.map((cta) => <Pill key={cta}>{cta}</Pill>)
                      ) : (
                        <span className="text-sm text-zinc-400">未抓到明显 CTA</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">正文摘要</p>
                    <p className="rounded-2xl bg-surfaceAlt p-4 text-sm leading-relaxed text-textMuted">{page.excerpt}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="组合文本预览" description="这是送去规则分析或 LLM 分析前的合并文本预览。" />
          <Card className="p-8">
            <pre className="overflow-auto whitespace-pre-wrap rounded-2xl bg-surfaceAlt p-5 text-xs leading-relaxed text-textMuted">
              {snapshot.combinedText}
            </pre>
          </Card>
        </section>
      </section>
    </PageShell>
  );
}
