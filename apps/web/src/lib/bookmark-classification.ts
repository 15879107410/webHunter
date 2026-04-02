import type { BookmarkRecord } from "@webhunter/shared";

export const manualClassificationOptions = ["高潜力", "待复盘", "已放弃"] as const;

export type ManualClassification = (typeof manualClassificationOptions)[number];

export function getEffectiveBookmarkClassification(item: Pick<BookmarkRecord, "label" | "manualLabel">) {
  const manualLabel = item.manualLabel?.trim();
  return manualLabel ? manualLabel : item.label;
}

export function getClassificationTone(label: string) {
  if (/高潜力|爆发|建议/i.test(label)) {
    return "positive" as const;
  }

  if (/待复盘|待研究|待观察/i.test(label)) {
    return "warning" as const;
  }

  if (/已放弃|放弃/i.test(label)) {
    return "danger" as const;
  }

  return "default" as const;
}
