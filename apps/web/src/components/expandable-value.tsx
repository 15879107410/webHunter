"use client";

import clsx from "clsx";
import { useState } from "react";

export function ExpandableValue({
  label,
  value,
  align = "right",
  className
}: {
  label: string;
  value: string;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!value) {
    return <span className="text-textMuted">—</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={value}
        className={clsx(
          "block max-w-full cursor-pointer truncate text-sm font-medium text-textPrimary transition hover:text-primary",
          align === "right" ? "text-right" : "text-left",
          className
        )}
      >
        {value}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{label}</p>
                <h4 className="mt-2 font-display text-2xl font-bold text-textPrimary">完整内容</h4>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-bold text-zinc-500"
              >
                关闭
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-surfaceAlt p-4 text-sm leading-relaxed text-textPrimary break-words">
              {value}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
