import { AuthForm } from "@/src/components/auth-form";
import { PageShell, Pill } from "@/src/components/ui";
import { getCurrentUser } from "@/src/lib/api";
import { LogoutButton } from "@/src/components/logout-button";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  return (
    <PageShell currentPath="/login">
      <section className="hero-gradient px-6 py-16 md:py-24">
        <div className="section-shell grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-2xl">
            <Pill tone="positive" className="mb-6">
              账号登录
            </Pill>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              用邮箱注册登录，收藏和历史就能按账号隔离
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-textMuted">
              先不做验证码，注册后就能直接使用。每个账号都会有自己的灵感库、分析历史和使用统计，避免不同人数据串在一起。
            </p>

            {currentUser ? (
              <div className="mt-8 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-white/80 px-4 py-3 text-sm text-textMuted">
                <span>
                  当前已登录：<span className="font-bold text-textPrimary">{currentUser.displayName}</span> · {currentUser.email}
                </span>
                <LogoutButton />
              </div>
            ) : null}

            <div className="mt-8 grid gap-3 text-sm text-textMuted md:grid-cols-2">
              <div className="rounded-2xl border border-outline/60 bg-white/70 p-4">
                <p className="font-bold text-textPrimary">邮箱唯一</p>
                <p className="mt-1">同一个邮箱只会对应一个账号。</p>
              </div>
              <div className="rounded-2xl border border-outline/60 bg-white/70 p-4">
                <p className="font-bold text-textPrimary">密码加密</p>
                <p className="mt-1">密码只会哈希存储，不会明文保存。</p>
              </div>
            </div>
          </div>

          <div className="flex justify-start lg:justify-end">
            <AuthForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
