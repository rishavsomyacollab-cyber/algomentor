const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  getTopics: () => request("/topics"),
  getProgress: () => request("/progress"),
  explain: (topic_id, topic_name) =>
    request("/explain", { method: "POST", body: JSON.stringify({ topic_id, topic_name }) }),
  animate: (topic_id, topic_name, input_array = null, target = null) =>
    request("/animate", { method: "POST", body: JSON.stringify({ topic_id, topic_name, input_array, target }) }),
  getPseudocode: (topic_id) => request(`/pseudocode/${topic_id}`),
  getComplexity: (topic_id) => request(`/complexity/${topic_id}`),
  generateQuiz: (topic_id, topic_name, difficulty = "medium", count = 5) =>
    request("/quiz/generate", { method: "POST", body: JSON.stringify({ topic_id, topic_name, difficulty, count }) }),
  evaluateAnswer: (topic_name, question, options, correct_index, user_index) =>
    request("/quiz/evaluate", { method: "POST", body: JSON.stringify({ topic_name, question, options, correct_index, user_index }) }),
  getHint: (topic_name, question, options, hint_level = 1) =>
    request("/quiz/hint", { method: "POST", body: JSON.stringify({ topic_name, question, options, hint_level }) }),
  saveProgress: (topic_id, completed = false, quiz_score = null) =>
    request("/progress", { method: "POST", body: JSON.stringify({ topic_id, completed, quiz_score }) }),
  chat: (message, topic_name = null) =>
    request("/chat", { method: "POST", body: JSON.stringify({ message, topic_name }) }),
};
