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