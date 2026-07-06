import type {
  Topic,
  ExplainData,
  AnimationData,
  PseudocodeData,
  ComplexityData,
  QuizData,
  EvaluationResult,
  HintResult,
  ChatResult,
  ProgressMap,
  StreamChunk,
  SearchResult,
  Recommendation,
  RecommendationItem,
  TopicNeighborhood,
  LearningPath,
  UserStats,
  ActivityEvent,
  User,
  AuthResponse,
  UserPreferences,
} from "./types";

const BASE = "/api";

// Access token held in memory — survives re-renders, cleared on page refresh (auto-refresh via cookie)
let _accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { _accessToken = t; };
export const getAccessToken = () => _accessToken;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  const res = await fetch(BASE + path, {
    headers,
    credentials: "include",   // needed for HttpOnly refresh token cookie
    ...options,
  });

  // Auto-refresh on 401 (expired access token)
  if (res.status === 401 && _accessToken) {
    const refreshed = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) {
      const data = await refreshed.json() as { access_token: string };
      _accessToken = data.access_token;
      // Retry original request with new token
      const retry = await fetch(BASE + path, {
        headers: { ...headers, Authorization: `Bearer ${_accessToken}` },
        credentials: "include",
        ...options,
      });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ detail: retry.statusText }));
        throw new Error((err as { detail?: string }).detail || "Request failed");
      }
      return retry.json() as Promise<T>;
    } else {
      _accessToken = null;
      throw new Error("Session expired — please log in again");
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail || "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  getTopics: () => request<Topic[]>("/topics"),

  getProgress: () => request<ProgressMap>("/progress"),

  explain: (topic_id: string, topic_name: string) =>
    request<ExplainData>("/explain", {
      method: "POST",
      body: JSON.stringify({ topic_id, topic_name }),
    }),

  animate: (
    topic_id: string,
    topic_name: string,
    input_array: number[] | null = null,
    target: number | null = null
  ) =>
    request<AnimationData>("/animate", {
      method: "POST",
      body: JSON.stringify({ topic_id, topic_name, input_array, target }),
    }),

  getPseudocode: (topic_id: string) =>
    request<PseudocodeData>(`/pseudocode/${topic_id}`),

  getComplexity: (topic_id: string) =>
    request<ComplexityData>(`/complexity/${topic_id}`),

  generateQuiz: (
    topic_id: string,
    topic_name: string,
    difficulty = "medium",
    count = 5,
    variant = 0
  ) =>
    request<QuizData>("/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ topic_id, topic_name, difficulty, count, variant }),
    }),

  evaluateAnswer: (
    topic_name: string,
    question: string,
    options: string[],
    correct_index: number,
    user_index: number
  ) =>
    request<EvaluationResult>("/quiz/evaluate", {
      method: "POST",
      body: JSON.stringify({
        topic_name,
        question,
        options,
        correct_index,
        user_index,
      }),
    }),

  getHint: (
    topic_name: string,
    question: string,
    options: string[],
    hint_level = 1
  ) =>
    request<HintResult>("/quiz/hint", {
      method: "POST",
      body: JSON.stringify({ topic_name, question, options, hint_level }),
    }),

  saveProgress: (
    topic_id: string,
    completed = false,
    quiz_score: number | null = null
  ) =>
    request<{ status: string }>("/progress", {
      method: "POST",
      body: JSON.stringify({ topic_id, completed, quiz_score }),
    }),

  chat: (message: string, topic_name: string | null = null) =>
    request<ChatResult>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, topic_name }),
    }),

  searchQuick: (q: string, n = 6) =>
    request<SearchResult[]>(`/search/quick?q=${encodeURIComponent(q)}&n=${n}`),

  search: (q: string, n = 4) =>
    request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}&n=${n}`),

  // Per-topic sidebar recommendations (Qdrant + graph neighbors)
  getRecommendations: (topic_id: string, n = 6) =>
    request<RecommendationItem[]>(`/recommend/${encodeURIComponent(topic_id)}?n=${n}`),

  // Personalised "what to learn next" feed (auth optional)
  getPersonalisedFeed: (limit = 8) =>
    request<RecommendationItem[]>(`/recommendations?limit=${limit}`),

  // Graph endpoints
  getTopicNeighborhood: (topic_id: string) =>
    request<TopicNeighborhood>(`/graph/topic/${encodeURIComponent(topic_id)}`),

  getLearningPath: (from_id: string, to_id: string) =>
    request<LearningPath>(`/graph/path?from_id=${encodeURIComponent(from_id)}&to_id=${encodeURIComponent(to_id)}`),

  getCategorySubgraph: (category: string) =>
    request<{ nodes: Topic[]; edges: { source: string; target: string; rel_type: string }[] }>(
      `/graph/category/${encodeURIComponent(category)}`
    ),

  graphStatus: () => request<{ available: boolean }>("/graph/status"),

  getAllGraphEdges: () =>
    request<{ source: string; target: string; rel_type: string }[]>("/graph/edges"),

  createTopic: (name: string, category = "user_added", difficulty = "intermediate") =>
    request<Topic>("/topics/create", {
      method: "POST",
      body: JSON.stringify({ name, category, difficulty }),
    }),

  streamExplain: (
    topic_id: string,
    topic_name: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ): (() => void) => {
    const controller = new AbortController();

    fetch(`${BASE}/stream/explain?topic_id=${encodeURIComponent(topic_id)}&topic_name=${encodeURIComponent(topic_name)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Stream failed");
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") { onDone(); return; }
              try {
                const parsed: StreamChunk = JSON.parse(raw);
                if (parsed.chunk) onChunk(parsed.chunk);
                if (parsed.done) { onDone(); return; }
                if (parsed.error) { onError(parsed.error); return; }
              } catch { /* ignore parse errors */ }
            }
          }
        }
        onDone();
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          onError((err as Error).message ?? "Stream error");
        }
      });

    return () => controller.abort();
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  signup: (email: string, username: string, password: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ status: string }>("/auth/logout", { method: "POST" }),

  refreshToken: () =>
    fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ access_token: string }> : Promise.reject()),

  getMe: () => request<User>("/auth/me"),

  // ── Password reset ────────────────────────────────────────────────────────
  forgotPassword: (email: string) =>
    request<{ message: string; dev_reset_url?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    }),

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getUserStats: () => request<UserStats>("/user/stats"),
  getUserActivity: (limit = 30) => request<ActivityEvent[]>(`/user/activity?limit=${limit}`),

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  getBookmarks: () => request<Topic[]>("/bookmarks"),
  toggleBookmark: (topic_id: string) =>
    request<{ bookmarked: boolean }>(`/bookmarks/${encodeURIComponent(topic_id)}`, { method: "POST" }),

  // ── Activity ──────────────────────────────────────────────────────────────
  logActivity: (event_type: string, topic_id?: string, event_data?: string) =>
    request<{ status: string }>("/activity", {
      method: "POST",
      body: JSON.stringify({ event_type, topic_id, event_data }),
    }),

  // ── Onboarding preferences ────────────────────────────────────────────────
  getPreferences: () => request<UserPreferences>("/user/preferences"),

  savePreferences: (prefs: {
    experience_level: string;
    goal: string;
    interested_categories: string[];
    weekly_hours: string;
  }) =>
    request<{ status: string }>("/user/preferences", {
      method: "POST",
      body: JSON.stringify(prefs),
    }),

  // ── Feedback ──────────────────────────────────────────────────────────────
  submitFeedback: (data: {
    message: string;
    rating?: number;
    category?: string;
    name?: string;
    email?: string;
    topic_id?: string;
  }) =>
    request<{ status: string; id: number }>("/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
