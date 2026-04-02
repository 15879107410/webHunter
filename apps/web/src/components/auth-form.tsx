"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }

    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | { user?: unknown } | null;

      if (!response.ok) {
        throw new Error((payload as { message?: string } | null)?.message ?? "登录失败，请稍后再试");
      }

      startTransition(() => {
        setMessage(mode === "login" ? "登录成功，正在进入工作台..." : "注册成功，正在进入工作台...");
        router.push("/");
        router.refresh();
      });
    } catch (cause) {
      const nextMessage = cause instanceof Error ? cause.message : "登录失败，请稍后再试";
      setError(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-lg rounded-[2rem] border border-outline/70 bg-white p-8 shadow-soft">
      <div className="flex gap-2 rounded-full bg-zinc-100 p-1 text-sm font-bold">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-full px-4 py-2 transition ${mode === "register" ? "bg-white text-primary shadow-sm" : "text-zinc-500"}`}
        >
          注册
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-full px-4 py-2 transition ${mode === "login" ? "bg-white text-primary shadow-sm" : "text-zinc-500"}`}
        >
          登录
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-textPrimary">邮箱</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-textPrimary">密码</span>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary"
          />
        </label>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        先不做邮箱验证码，注册后可以直接使用。后面如果要正式开放，我们再加邮箱验证和找回密码。
      </p>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting || isPending}
        className="mt-6 w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white transition hover:bg-primaryContainer disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isPending ? "处理中..." : mode === "login" ? "登录并进入" : "注册并进入"}
      </button>
    </form>
  );
}
