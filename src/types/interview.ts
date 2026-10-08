export type CompetencyMetric = {
  name: string;
  score: number; // 0 - 100
  benchmark: number; // industry standard (e.g. 80)
  summary: string;
  feedback: string;
};

export type FillerWordInstance = {
  word: string;
  count: number;
};

export type StarBreakdown = {
  situation: { text: string; score: number; tip: string };
  task: { text: string; score: number; tip: string };
  action: { text: string; score: number; tip: string };
  result: { text: string; score: number; tip: string };
};

export type TurnTranscript = {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  wpm?: number;
  fillerWords?: string[];
  aiSuggestion?: {
    summary: string;
    executiveRewrite: string;
    strengths: string[];
    improvements: string[];
  };
};

export type InterviewQuestion = {
  id: string;
  question: string;
  context: string;
  competencyFocus: string[];
  difficulty: 'Standard' | 'Executive' | 'Hostile Drill';
  hints: string[];
  starGuide: {
    situationPrompt: string;
    taskPrompt: string;
    actionPrompt: string;
    resultPrompt: string;
  };
  sampleAnswer?: string;
};

export type InterviewerPersona = {
  id: string;
  name: string;
  title: string;
  company: string;
  avatarUrl: string;
  style: string;
  focusArea: string;
  voicePitch?: number;
  voiceRate?: number;
};

export type InterviewScenario = {
  id: string;
  title: string;
  track: string;
  companyTarget: string;
  description: string;
  interviewer: InterviewerPersona;
  questions: InterviewQuestion[];
  targetWpmMin: number;
  targetWpmMax: number;
};

export type SessionEvaluation = {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  completedAt: string;
  durationSeconds: number;
  overallScore: number; // 0 - 100
  readinessLabel: 'Executive Ready' | 'Near Ready' | 'Needs Structure' | 'Foundational';
  competencies: {
    clarity: CompetencyMetric;
    executivePresence: CompetencyMetric;
    relevance: CompetencyMetric;
    vocabulary: CompetencyMetric;
  };
  delivery: {
    averageWpm: number;
    wpmStatus: 'Too Slow' | 'Optimal' | 'Rushed';
    totalFillerWords: number;
    fillerBreakdown: FillerWordInstance[];
    pausePacing: string;
  };
  transcripts: TurnTranscript[];
  starOverall: StarBreakdown;
  keyStrengths: string[];
  growthOpportunities: string[];
};

export type StarStory = {
  id: string;
  title: string;
  category: string;
  company: string;
  metrics: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  updatedAt: string;
};
