export enum MessageRole {
  User = 'user',
  Model = 'model',
  System = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  isError?: boolean;
  citations?: string[];
  isLoading?: boolean;
  simplifiedText?: string;
  isSimplifying?: boolean;
  showSimplified?: boolean;
  actionPlanText?: string;
  isGeneratingPlan?: boolean;
  showActionPlan?: boolean;
  jurisdictionText?: string;
  isGeneratingJurisdiction?: boolean;
  showJurisdiction?: boolean;
}

export enum ComplexityLevel {
  Standard = 'Standard',
  ELI5 = 'ELI5 (Simple)',
  Professional = 'Professional (Legal)'
}

export interface LegalDocument {
  name: string;
  type: string;
  content: string; // Base64 or Text
  summary?: string;
}

export interface ComparisonRequest {
  topic1: string;
  topic2: string;
}

export type AppView = 'landing' | 'chat' | 'analyzer' | 'explorer' | 'architecture';

// ── Judgment Analysis types ────────────────────────────────────────
export interface JudgmentStatute {
  section: string;
  act: string;
  explanation: string;
}

export interface JudgmentCitedCase {
  case_name: string;
  citation: string;
  context: string;
}

export interface JudgmentCaseFlow {
  step: number;
  stage: string;
  description: string;
}

export interface JudgmentAnalysis {
  catchwords: string[];
  summary: string;
  case_flow: JudgmentCaseFlow[];
  statutes: JudgmentStatute[];
  cited_cases: JudgmentCitedCase[];
  court: string;
  date: string;
  judges: string[];
  parties: {
    petitioner: string;
    respondent: string;
  };
  decision: string;
  case_type: string;
}

export interface CaseIndexEntry {
  id: string;
  caseNo: string;
  year: number | null;
  court: string;
  type: string;
  date: string | null;
  language: string | null;
  source: string;
  filename: string;
  isVernacular?: boolean;
}

export interface CaseIndex {
  generatedAt: string;
  totalCases: number;
  years: number[];
  types: string[];
  cases: CaseIndexEntry[];
}