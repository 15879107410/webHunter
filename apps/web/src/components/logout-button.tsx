"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);

    try {
      await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      router.refresh();
      router.push("/login");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={isPending}
      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-bold text-textMuted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? "退出中..." : "退出登录"}
    </button>
  );
}
