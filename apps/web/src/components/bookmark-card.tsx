"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BookmarkRecord } from "@webhunter/shared";
import { Card, Pill } from "@/src/components/ui";
import { ExpandableValue } from "@/src/components/expandable-value";
import {
  getClassificationTone,
  getEffectiveBookmarkClassification,
  manualClassificationOptions
} from "@/src/lib/bookmark-classification";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function BookmarkCard({ item }: { item: BookmarkRecord }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(item.note);
  const [manualLabel, setManualLabel] = useState(item.manualLabel ?? "");
  const [message, setMessage] = useState("");
  const [isSavingClassification, setIsSavingClassification] = useState(false);
  const [isPending, startTransition] = useTransition();
  const effectiveLabel = getEffectiveBookmarkClassification({ label: item.label, manualLabel });
  const isBusy = isPending || isSavingClassification;

  function ExpandableMetaRow({ label, value }: { label: string; value: string }) {
    return (
      <div className="grid grid-cols-[88px_1fr] items-start gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{label}</span>
        <div className="min-w-0">
          <ExpandableValue label={label} value={value} align="left" className="text-sm font-semibold text-textMuted" />
        </div>
      </div>
    );
  }

  async function saveManualLabel(nextLabel: string) {
    setMessage("");
    setIsSavingClassification(true);
    const previousLabel = manualLabel;
    setManualLabel(nextLabel);

    try {
      const response = await fetch(`${apiBaseUrl}/api/bookmarks/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ manualLabel: nextLabel || null })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "分类保存失败，请稍后再试");
      }

      startTransition(() => {
        setMessage(nextLabel ? "人工分类已更新" : "已恢复 AI 归类");
        router.refresh();
      });
    } catch {
      setManualLabel(previousLabel);
      startTransition(() => {
        setMessage("分类保存失败，请稍后再试");
      });
    } finally {
      setIsSavingClassification(false);
    }
  }

  async function saveNote() {
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/bookmarks/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ note })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "备注保存失败，请稍后再试");
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
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok && response.status !== 204) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "删除失败，请稍后再试");
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
          <Pill tone={getClassificationTone(effectiveLabel)}>{effectiveLabel}</Pill>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-3">
          <ExpandableMetaRow label="一句话定位" value={item.oneLiner} />
          <ExpandableMetaRow label="收费方式" value={item.pricingModel} />
          <ExpandableMetaRow label="目标用户" value={item.targetUsers} />
          <ExpandableMetaRow label="AI 归类" value={item.opportunityLevel} />
          <div className="grid grid-cols-[88px_1fr] items-start gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">人工归类</span>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void saveManualLabel("")}
                  disabled={isBusy}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                    manualLabel.trim()
                      ? "border-zinc-200 bg-white text-textMuted hover:border-primary/30 hover:text-primary"
                      : "border-primary bg-primary/10 text-primary"
                  }`}
                >
                  沿用 AI
                </button>
                {manualClassificationOptions.map((option) => {
                  const active = manualLabel === option;
                  return (
                    <button
                      key={option}
                      onClick={() => void saveManualLabel(active ? "" : option)}
                      disabled={isBusy}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-zinc-200 bg-white text-textMuted hover:border-primary/30 hover:text-primary"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-relaxed text-textMuted">人工选择会覆盖 AI 建议，并同步到统计与筛选。</p>
            </div>
          </div>
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
            <ExpandableValue label="备注" value={note} align="left" className="text-xs leading-relaxed text-textMuted" />
          )}
        </div>

        <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-5 sm:grid-cols-2">
          <Link href={`/result/${item.id}`} className="rounded-xl bg-zinc-900 py-2.5 text-center text-xs font-bold text-white">
            查看分析
          </Link>

          {isEditing ? (
            <button
              onClick={saveNote}
              disabled={isBusy}
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
          disabled={isBusy}
          className="mt-3 w-full rounded-xl bg-rose-50 py-2.5 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          删除收藏
        </button>
      </div>
    </Card>
  );
}
