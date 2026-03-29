export type EvidenceLevel = "explicit" | "inferred" | "strategy";

export interface DecisionCard {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "danger";
}

export interface InsightItem {
  title: string;
  content: string;
}

export interface PricingPlan {
  label: string;
  price: string;
  description?: string;
  features?: string[];
  cta?: string;
  highlighted?: boolean;
}

export interface EvidenceItem {
  title: string;
  detail: string;
  snippet?: string;
}

export interface EvidenceGroup {
  level: EvidenceLevel;
  title: string;
  items: EvidenceItem[];
}

export interface SimilarProduct {
  id?: string;
  name: string;
  status: "ready" | "planned";
  category?: string;
  summary?: string;
}

export interface AnalysisMeta {
  analyzedAt: string;
  pageCount: number;
  pageTypes: string[];
  missingPageTypes?: string[];
  coverageLevel?: "low" | "medium" | "high";
  crawlMode?: "fast" | "deep";
  analysisMode: "rules" | "llm";
}

export interface AnalysisResult {
  id: string;
  siteName: string;
  siteUrl: string;
  statusLabel: string;
  meta?: AnalysisMeta;
  summary: string;
  categories: string[];
  decisionCards: DecisionCard[];
  coreFeatures: string[];
  coreValue: string;
  targetUsers: string[];
  marketOpportunity: InsightItem[];
  pricing: {
    startingPrice: string;
    pricePoints?: string[];
    plans?: PricingPlan[];
    billingCycle: string;
    trial: string;
    model: string;
    whyPricingWorks: string;
  };
  growthInsights: InsightItem[];
  buildAdvice: InsightItem[];
  similarProducts: SimilarProduct[];
  evidenceGroups: EvidenceGroup[];
  evidenceSnapshots: {
    title: string;
    detail: string;
  }[];
}

export interface ResearchCard {
  id: string;
  name: string;
  domain: string;
  category: string;
  summary: string;
  tags: string[];
  analyzedAt?: string;
  pageCount?: number;
  analysisMode?: "rules" | "llm";
  coverageLevel?: "low" | "medium" | "high";
}

export interface FavoriteItem {
  id: string;
  name: string;
  summary: string;
  opportunityLevel: string;
  pricingModel: string;
  savedAt: string;
}

export interface WorkspaceStat {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning";
}

export interface BookmarkRecord {
  id: string;
  name: string;
  domain: string;
  label: string;
  oneLiner: string;
  pricingModel: string;
  targetUsers: string;
  opportunityLevel: string;
  note: string;
}

export interface FilterOption {
  label: string;
  active?: boolean;
}

export interface CrawledPageSummary {
  url: string;
  pageType: string;
  title: string;
  description: string;
  headings: string[];
  ctas: string[];
  signals?: {
    kind: "link" | "button" | "tab" | "dropdown" | "form" | "summary";
    label: string;
  }[];
  excerpt: string;
}

export interface AnalysisInputSnapshot {
  siteUrl: string;
  siteName: string;
  crawlMode?: "fast" | "deep";
  pages: CrawledPageSummary[];
  combinedText: string;
}
