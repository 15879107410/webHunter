import type { AnalysisInputSnapshot, AnalysisResult, AuthUser, BookmarkRecord, ResearchCard } from "./types";

export interface AnalyzeRequest {
  url: string;
  force?: boolean;
}

export interface AnalyzeResponse {
  id: string;
  status: "queued" | "completed";
  reused?: boolean;
}

export interface RecentAnalysisResponse {
  items: ResearchCard[];
}

export interface AnalysisListResponse {
  items: ResearchCard[];
}

export interface BookmarkListResponse {
  items: BookmarkRecord[];
}

export interface AnalysisDetailResponse {
  item: AnalysisResult;
}

export interface AnalysisInputResponse {
  item: AnalysisInputSnapshot;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser | null;
}
