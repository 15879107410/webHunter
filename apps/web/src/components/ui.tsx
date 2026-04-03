import clsx from "clsx";
import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";

export function TopNav({ currentPath }: { currentPath: string }) {
  const items = [
    { label: "探索", href: "/" },
    { label: "结果", href: "/results" },
    { label: "灵感", href: "/inspiration" },
    { label: "定价", href: "/pricing" }
  ];

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
      <div className="section-shell flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-primary">
          AI Website Analyzer
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {items.map((item) => {
            const active = item.href === "/" ? currentPath === "/" : currentPath.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={clsx(
                  "font-display text-sm font-semibold tracking-tight",
                  active ? "border-b-2 border-primary pb-1 text-primary" : "text-textMuted hover:text-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-full bg-zinc-100 p-1 sm:flex">
            <button className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-primary shadow-sm">中</button>
            <button className="rounded-full px-3 py-1 text-[10px] font-bold text-zinc-500">EN</button>
          </div>
          <Link href="/" className="rounded-xl bg-gradient-to-r from-primary to-primaryContainer px-5 py-2.5 text-sm font-bold text-white shadow-soft">
            开始分析
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function PageShell({
  currentPath,
  children,
  className
}: PropsWithChildren<{ currentPath: string; className?: string }>) {
  return (
    <div className={clsx("min-h-screen bg-background", className)}>
      <TopNav currentPath={currentPath} />
      <main className="pt-16">{children}</main>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">{eyebrow}</p> : null}
        <h2 className="font-display text-3xl font-extrabold tracking-tight">{title}</h2>
        {description ? <p className="mt-2 text-sm text-textMuted md:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className
}: PropsWithChildren<{
  className?: string;
}>) {
  return <div className={clsx("rounded-[1.75rem] border border-outline/70 bg-surface p-6 shadow-sm", className)}>{children}</div>;
}

export function Pill({
  children,
  tone = "default",
  className
}: PropsWithChildren<{ tone?: "default" | "positive" | "warning" | "danger"; className?: string }>) {
  const tones = {
    default: "bg-zinc-100 text-zinc-700",
    positive: "bg-primary/10 text-primary",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700"
  };

  return <span className={clsx("inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold", tones[tone], className)}>{children}</span>;
}

export function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-textMuted">{value}</span>
    </div>
  );
}
