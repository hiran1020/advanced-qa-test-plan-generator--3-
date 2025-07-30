export interface AnalysisFinding {
  category: string;
  description: string;
  source_story_id?: string;
}

export interface Analysis {
  findings: AnalysisFinding[];
}

export interface TestPlan {
  markdown: string;
  gherkin: string;
}

export enum Step {
  PRD_INPUT,
  ANALYSIS_COMPLETE,
  ENHANCE_PRD,
  GENERATING_PLAN,
  PRIORITIZING_PLAN,
  GENERATING_TRACEABILITY,
  PLAN_GENERATED,
  GENERATING_QA_DOCS,
  QA_DOCS_GENERATED,
}

export interface TestCase {
    id: string;
    type: string;
    summary: string;
    preconditions: string;
    steps: string;
    expectedResult: string;
    storyId: string;
    risk: string;
    priority: string;
    priority_reasoning: string;
}

export interface FileData {
    tempId: string;
    name: string;
    type: string;
    size: number;
    dataUrl: string; // For images, or serves as a placeholder for videos initially
    isProcessing: boolean;
    error?: string | null;
    frames?: string[]; // For base64 video frames
}

export interface InputData {
    prdText: string;
    files: FileData[];
    figmaUrl: string;
}

export interface TraceabilityEntry {
    story_id: string;
    test_case_ids: string[];
}

export interface TraceabilityMatrix {
    matrix: TraceabilityEntry[];
}
