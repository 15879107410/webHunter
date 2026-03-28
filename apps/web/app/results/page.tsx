import Link from "next/link";
import { ResultsBrowser } from "@/src/components/results-browser";
import { Card, PageShell, SectionTitle } from "@/src/components/ui";
import { getAllResearch } from "@/src/lib/api";

export default async function ResultsPage() {
  const items = await getAllResearch();

  return (
    <PageShell currentPath="/results">
      <header className="border-b border-zinc-100 bg-zinc-50 py-10">
        <div className="section-shell">
          <SectionTitle
            eyebrow="Results"
            title="最近分析结果"
            description="这里保留你最近分析过的网站。哪怕退回首页，也可以直接回来继续看，不用重新分析。"
            action={
              <Link
                href="/"
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                分析新网站
              </Link>
            }
          />
        </div>
      </header>

      <section className="section-shell py-10">
        {items.length > 0 ? (
          <ResultsBrowser items={items} />
        ) : (
          <Card className="flex min-h-64 flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surfaceAlt text-4xl text-zinc-400">
              ⌕
            </div>
            <h2 className="font-display text-2xl font-bold">还没有分析结果</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-textMuted">
              先去分析一个网站，结果会自动出现在这里。后面你从首页退回来，也不用重新跑一遍。
            </p>
            <Link
              href="/"
              className="mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
            >
              去分析一个网站
            </Link>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
