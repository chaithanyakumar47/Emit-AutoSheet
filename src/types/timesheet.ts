export type Category =
  | 'RequirementGathering'
  | 'ProjectManagement'
  | 'BusinessManagement'
  | 'ClientMeeting'
  | 'ClientCall'
  | 'SprintPlanning'
  | 'StandupCall'
  | 'TechnicalDocumentation'
  | 'Wireframing'
  | 'JiraEntries'
  | 'FunctionalTesting'
  | 'BugReporting'
  | 'CodeReview'
  | 'BackendDevelopment'
  | 'FrontendDevelopment'
  | (string & {});

export interface SentenceItem {
  id: string;
  text: string;
  category: Category;
  defaultDurationMinutes: number;
  isActive: boolean;
  tags: string[];
  projectId?: string;
  activityId?: string;
}

export interface GeneratedActivity {
  id: string;
  sentenceId: string;
  rawText: string;
  polishedText: string;
  category: Category;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  durationMinutes: number;
  isAiPolished: boolean;
  status: 'pending' | 'success' | 'failed' | 'simulated';
  errorDetails?: string;
  projectId?: string;
  activityId?: string;
  emitActivityId?: string; // MongoDB ObjectId returned by Emit upon creation
}

export interface GeneratorConfig {
  targetHours: number; // e.g. 7.5 or 8
  startTimeStr: string; // e.g. "09:30"
  lunchBreakMinutes: number; // e.g. 45
  lunchStartTimeStr: string; // e.g. "13:00"
  randomizeOrder: boolean;
  dateStr: string; // YYYY-MM-DD
  maxDurationPerTask: number;
  defaultProjectTag: string; // Default: "#BLS"
  targetTaskCount?: number | 'auto'; // Number of tasks per day (e.g. 3, 4, 5, 6, 7, 8, 'auto')
}

export interface EmitSettings {
  token: string;
  cookie?: string;
  teamId: string;
  projectId?: string;
  activityId?: string;
  profileJson?: string;
  autoFetchUrl?: string;
  apiBaseUrl: string;
  saveHistoryLocally: boolean;
  projects?: string[];
  activities?: string[];
  teamObj?: any;
  userObj?: any;
}

export interface AiSettings {
  provider: 'built-in' | 'openai' | 'groq' | 'openrouter';
  apiKey: string;
  customEndpoint?: string;
  model: string;
  tone: 'professional' | 'concise' | 'technical' | 'detailed';
  autoPolishOnGenerate: boolean;
}

export interface BitbucketSettings {
  email: string;
  apiToken: string;
  workspaces: string;
  displayName: string;
  commitEmails: string;
  scanAllBranches: boolean;
  selectedRepos: string[];
}

export interface BitbucketCommit {
  hash: string;
  author: string;
  dateStr: string; // YYYY-MM-DD
  epochMs: number;
  rawMessage: string;
  cleanMessage: string;
  ticketId?: string;
  repoSlug: string;
  branchName?: string;
}

export interface AppState {
  sentences: SentenceItem[];
  generatedActivities: GeneratedActivity[];
  config: GeneratorConfig;
  emitSettings: EmitSettings;
  aiSettings: AiSettings;
  bitbucketSettings?: BitbucketSettings;
}
