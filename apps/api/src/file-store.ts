import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AnalysisInputSnapshot, AnalysisResult, BookmarkRecord, ResearchCard } from "@webhunter/shared";

type StoreShape = {
  analysisResults: Record<string, AnalysisResult>;
  analysisInputs: Record<string, AnalysisInputSnapshot>;
  recentAnalysis: ResearchCard[];
  bookmarks: BookmarkRecord[];
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const storePathCandidates = [
  path.resolve(process.cwd(), "data/store.json"),
  path.resolve(process.cwd(), "apps/api/data/store.json"),
  path.resolve(currentDir, "../data/store.json"),
  path.resolve(currentDir, "../../../../data/store.json")
];
const storePath = storePathCandidates.find((candidate) => existsSync(candidate)) ?? storePathCandidates[0];

let writeChain = Promise.resolve();

function canonicalizeSiteUrl(siteUrl: string) {
  try {
    const url = new URL(siteUrl);
    url.hash = "";
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
      url.port = "";
    }
    url.hostname = url.hostname.replace(/^www\./i, "");
    const normalized = url.toString().replace(/\/$/, "");
    return normalized;
  } catch {
    return siteUrl;
  }
}

function canonicalizeDomain(domain: string) {
  return domain.replace(/^www\./i, "").toLowerCase();
}

async function readStore(): Promise<StoreShape> {
  const raw = await fs.readFile(storePath, "utf8");
  return JSON.parse(raw) as StoreShape;
}

async function writeStore(store: StoreShape) {
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

async function updateStore(mutator: (store: StoreShape) => void | StoreShape) {
  writeChain = writeChain.then(async () => {
    const current = await readStore();
    const next = (mutator(current) as StoreShape | void) ?? current;
    await writeStore(next);
  });

  await writeChain;
}

export async function getAnalysisResults() {
  return (await readStore()).analysisResults;
}

export async function findAnalysisBySiteUrl(siteUrl: string) {
  const target = canonicalizeSiteUrl(siteUrl);
  const items = Object.values((await readStore()).analysisResults);
  return items.find((item) => canonicalizeSiteUrl(item.siteUrl) === target) ?? null;
}

export async function getRecentAnalysis() {
  return (await readStore()).recentAnalysis;
}

export async function getAnalysisInput(id: string) {
  return (await readStore()).analysisInputs[id] ?? null;
}

export async function getBookmarks() {
  return (await readStore()).bookmarks;
}

export async function upsertAnalysis(result: AnalysisResult) {
  await updateStore((store) => {
    store.analysisResults[result.id] = result;
  });
}

export async function upsertAnalysisInput(id: string, input: AnalysisInputSnapshot) {
  await updateStore((store) => {
    store.analysisInputs[id] = input;
  });
}

export async function pushRecentAnalysis(item: ResearchCard) {
  await updateStore((store) => {
    store.recentAnalysis = store.recentAnalysis.filter(
      (record) => record.id !== item.id && canonicalizeDomain(record.domain) !== canonicalizeDomain(item.domain)
    );
    store.recentAnalysis.unshift(item);
    store.recentAnalysis = store.recentAnalysis.slice(0, 20);
  });
}

export async function addBookmark(bookmark: BookmarkRecord) {
  await updateStore((store) => {
    const existingIndex = store.bookmarks.findIndex((item) => item.id === bookmark.id);
    if (existingIndex !== -1) {
      store.bookmarks.splice(existingIndex, 1);
    }
    store.bookmarks.unshift(bookmark);
  });
}

export async function updateBookmark(id: string, patch: Partial<BookmarkRecord>) {
  let updated: BookmarkRecord | null = null;

  await updateStore((store) => {
    const existingIndex = store.bookmarks.findIndex((item) => item.id === id);
    if (existingIndex !== -1) {
      store.bookmarks[existingIndex] = {
        ...store.bookmarks[existingIndex],
        ...patch,
        id: store.bookmarks[existingIndex].id
      };
      updated = store.bookmarks[existingIndex];
    }
  });

  return updated;
}

export async function removeBookmark(id: string) {
  let removed = false;

  await updateStore((store) => {
    const existingIndex = store.bookmarks.findIndex((item) => item.id === id);
    if (existingIndex !== -1) {
      store.bookmarks.splice(existingIndex, 1);
      removed = true;
    }
  });

  return removed;
}
