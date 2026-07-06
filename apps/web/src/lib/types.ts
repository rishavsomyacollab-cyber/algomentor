// ── Core domain types ─────────────────────────────────────────────────────────

export interface TopicProgress {
  completed: boolean;
  quiz_best_score: number;
  last_visited: string | null;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  progress?: TopicProgress;
}

export interface ProgressMap {
  [topicId: string]: TopicProgress;
}

// ── AI response types ─────────────────────────────────────────────────────────

export interface WorkedExample {
  label?: string;
  steps: string[];
  result?: string;
}

export interface TimeComplexity {
  best?: string;
  average?: string;
  worst?: string;
  note?: string;
  best_reasoning?: string;
  average_reasoning?: string;
  worst_reasoning?: string;
}

export interface SpaceComplexity {
  value?: string;
  note?: string;
  reasoning?: string;
}

export interface CommonMistake {
  title: string;
  description: string;
}

export interface ExplainData {
  concept?: string;
  tagline?: string;
  introduction?: string;
  summary?: string;
  intuition?: string;
  how_it_works?: string[];
  worked_example?: WorkedExample;
  code?: string;
  time_complexity?: TimeComplexity;
  space_complexity?: SpaceComplexity;
  advantages?: string[];
  when_to_use?: string[];
  disadvantages?: string[];
  when_not_to_use?: string[];
  applications?: string[];
  common_mistakes?: (CommonMistake | string)[];
  tips?: string[];
  fun_fact?: string;
  prerequisites?: string[];
}

export interface AnimationStep {
  step_number: number;
  description?: string;
  array_state: number[];
  colors?: Record<string, string>;
  pointers?: Record<string, number>;
  comparison?: string;
  decision?: string;
  variables?: Record<string, unknown>;
}

export interface AnimationData {
  steps: AnimationStep[];
  result: string;
  simulation_available?: boolean;
  algorithm?: string;
}

export interface PseudocodeData {
  pseudocode: string;
  python?: string;
  java?: string;
  key_lines?: { python?: number[]; java?: number[] };
  line_notes?: { python?: Record<string, string>; java?: Record<string, string> };
}

export interface ComplexityData {
  time_complexity: TimeComplexity;
  space_complexity: SpaceComplexity;
  recurrence_relation?: string;
  comparison_to_alternatives?: Array<{
    algorithm: string;
    time: string;
    notes: string;
  }>;
  practical_notes?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface EvaluationResult {
  correct: boolean;
  score: number;
  feedback?: string;
  explanation?: string;
}

export interface HintResult {
  hint: string;
}

export interface ChatResult {
  response: string;
}

// ── Agent types ───────────────────────────────────────────────────────────────

export type AgentName = "tutor" | "quiz" | "visualization" | "complexity" | "code";

export interface AgentEvent {
  agent: AgentName;
  event: "start" | "chunk" | "done" | "error";
  data?: string;
}

// ── Stream types ──────────────────────────────────────────────────────────────

export interface StreamChunk {
  chunk?: string;
  done?: boolean;
  error?: string;
}

// ── Vector search & recommendation types ─────────────────────────────────────

export interface SearchResult {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  score: number;
  match_type?: "exact" | "semantic";
}

export type Recommendation = SearchResult;

export interface RecommendationItem {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  score: number;
  reason: string;
  bookmarked: boolean;
}

export interface TopicNeighborhood {
  prerequisites: Topic[];
  next: Topic[];
  related: Topic[];
}

export interface LearningPath {
  path: Topic[];
}

// ── Dashboard types ───────────────────────────────────────────────────────────

export interface CategoryStat {
  category: string;
  total: number;
  completed: number;
  avg_score: number;
}

export interface UserStats {
  total_completed: number;
  avg_quiz_score: number;
  total_time_sec: number;
  streak_days: number;
  categories: CategoryStat[];
  heatmap: Record<string, number>;
}

export interface ActivityEvent {
  id: number;
  user_id: string;
  topic_id: string | null;
  topic_name: string | null;
  category: string | null;
  event_type: string;
  event_data: string | null;
  created_at: string;
}

// ── Onboarding / preferences types ───────────────────────────────────────────

export interface UserPreferences {
  user_id: string;
  experience_level: string;
  goal: string;
  interested_categories: string[];
  weekly_hours: string;
  onboarding_completed: boolean;
}

// ── Auth types ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
