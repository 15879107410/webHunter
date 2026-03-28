import type {
  AnalysisListResponse,
  AnalysisInputResponse,
  AnalysisDetailResponse,
  AnalysisInputSnapshot,
  AnalysisResult,
  BookmarkListResponse,
  BookmarkRecord,
  RecentAnalysisResponse,
  ResearchCard
} from "@webhunter/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getAnalysisResult(id: string): Promise<AnalysisResult | null> {
  const payload = await safeFetch<AnalysisDetailResponse>(`/api/analysis/${id}`);
  return payload?.item ?? null;
}

export async function getAnalysisInput(id: string): Promise<AnalysisInputSnapshot | null> {
  const payload = await safeFetch<AnalysisInputResponse>(`/api/analysis/${id}/input`);
  return payload?.item ?? null;
}

export async function getRecentResearch(): Promise<ResearchCard[]> {
  const payload = await safeFetch<RecentAnalysisResponse>("/api/analysis/recent");
  return payload?.items ?? [];
}

export async function getAllResearch(): Promise<ResearchCard[]> {
  const payload = await safeFetch<AnalysisListResponse>("/api/analysis");
  return payload?.items ?? [];
}

export async function getBookmarks(): Promise<BookmarkRecord[]> {
  const payload = await safeFetch<BookmarkListResponse>("/api/bookmarks");
  return payload?.items ?? [];
}
