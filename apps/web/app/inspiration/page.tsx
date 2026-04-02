import Link from "next/link";
import { BookmarksBrowser } from "@/src/components/bookmarks-browser";
import { PageShell, Pill } from "@/src/components/ui";
import { filterOptions } from "@/src/data/mock-data";
import { getBookmarks } from "@/src/lib/api";
import { getEffectiveBookmarkClassification, getClassificationTone } from "@/src/lib/bookmark-classification";

export default async function InspirationPage() {
  const workspaceRecords = await getBookmarks();
  const effectiveClassifications = workspaceRecords.map((item) => getEffectiveBookmarkClassification(item));
  const workspaceStats = [
    { label: `已收藏 ${workspaceRecords.length}`, tone: "default" as const },
    { label: `高潜力 ${effectiveClassifications.filter((label) => getClassificationTone(label) === "positive").length}`, tone: "positive" as const },
    { label: `待补备注 ${workspaceRecords.filter((item) => !item.note || /待补充/.test(item.note)).length}`, tone: "warning" as const }
  ];

  return (
    <PageShell currentPath="/inspiration">
      <header className="border-b border-zinc-100 bg-zinc-50 py-10">
        <div className="section-shell">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-bold">研究工作台</h1>
                {workspaceStats.map((stat) => (
                  <Pill key={stat.label} tone={stat.tone === "warning" ? "warning" : stat.tone === "positive" ? "positive" : "default"}>
                    {stat.label}
                  </Pill>
                ))}
              </div>
            </div>
            <Link href="/" className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white">
              分析新站点
            </Link>
          </div>
        </div>
      </header>

      <div className="section-shell flex flex-col gap-10 py-10 md:flex-row">
        <aside className="w-full space-y-10 md:w-56">
          <div>
            <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.24em] text-zinc-400">库管理</p>
            <div className="space-y-1 text-sm">
              <div className="rounded-xl bg-primary/10 px-4 py-3 font-bold text-primary">主库 {workspaceRecords.length}</div>
              <div className="rounded-xl px-4 py-3 font-medium text-textMuted">我的收藏 {workspaceRecords.length}</div>
              <div className="rounded-xl px-4 py-3 font-medium text-textMuted">归档 0</div>
            </div>
          </div>
          <div>
            <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.24em] text-zinc-400">研究状态</p>
            <div className="space-y-1 text-sm">
              <div className="rounded-xl px-4 py-3 font-medium text-textMuted">高潜力 {effectiveClassifications.filter((label) => getClassificationTone(label) === "positive").length}</div>
              <div className="rounded-xl px-4 py-3 font-medium text-textMuted">待复盘 {effectiveClassifications.filter((label) => getClassificationTone(label) === "warning").length}</div>
              <div className="rounded-xl px-4 py-3 font-medium text-textMuted">已放弃 {effectiveClassifications.filter((label) => getClassificationTone(label) === "danger").length}</div>
            </div>
          </div>
        </aside>

        <BookmarksBrowser items={workspaceRecords} filters={filterOptions} />
      </div>
    </PageShell>
  );
}
