"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BookmarkRecord } from "@webhunter/shared";
import { Card, MetaRow, Pill } from "@/src/components/ui";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function BookmarkCard({ item }: { item: BookmarkRecord }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(item.note);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function saveNote() {
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/bookmarks/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ note })
      });

      if (!response.ok) {
        throw new Error("save failed");
      }

      startTransition(() => {
        setIsEditing(false);
        setMessage("备注已保存");
        router.refresh();
      });
    } catch {
      startTransition(() => {
        setMessage("备注保存失败，请稍后再试");
      });
    }
  }

  async function deleteBookmark() {
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/bookmarks/${item.id}`, {
        method: "DELETE"
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("delete failed");
      }

      startTransition(() => {
        setMessage("已从灵感库移除");
        router.refresh();
      });
    } catch {
      startTransition(() => {
        setMessage("删除失败，请稍后再试");
      });
    }
  }

  return (
    <Card className="overflow-hidden rounded-[1.5rem] p-0">
      <div className="relative h-32 bg-gradient-to-br from-zinc-900 via-zinc-800 to-primary p-5 text-white">
        <p className="absolute left-5 top-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">{item.domain}</p>
        <div className="absolute bottom-5 left-5">
          <h3 className="font-display text-xl font-bold">{item.name}</h3>
        </div>
        <div className="absolute right-5 top-5">
          <Pill tone={item.label === "高潜力" ? "positive" : item.label === "待复盘" ? "warning" : "default"}>{item.label}</Pill>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-3">
          <MetaRow label="一句话定位" value={item.oneLiner} />
          <MetaRow label="收费方式" value={item.pricingModel} />
          <MetaRow label="目标用户" value={item.targetUsers} />
          <MetaRow label="机会等级" value={item.opportunityLevel} />
        </div>

        <div className="mt-5 rounded-xl bg-surfaceAlt p-4 text-xs text-textMuted">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-primary">备注</span>
            {message ? <span className="text-[11px] text-primary">{message}</span> : null}
          </div>

          {isEditing ? (
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-textPrimary outline-none"
            />
          ) : (
            <p className="leading-relaxed">{note}</p>
          )}
        </div>

        <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-5 sm:grid-cols-2">
          <Link href={`/result/${item.id}`} className="rounded-xl bg-zinc-900 py-2.5 text-center text-xs font-bold text-white">
            查看分析
          </Link>

          {isEditing ? (
            <button
              onClick={saveNote}
              disabled={isPending}
              className="rounded-xl border border-primary py-2.5 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "保存中..." : "保存备注"}
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-xl border border-zinc-200 py-2.5 text-xs font-bold text-textMuted"
            >
              写备注
            </button>
          )}
        </div>

        <button
          onClick={deleteBookmark}
          disabled={isPending}
          className="mt-3 w-full rounded-xl bg-rose-50 py-2.5 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          删除收藏
        </button>
      </div>
    </Card>
  );
}
