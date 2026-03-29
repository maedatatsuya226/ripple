// Cloudflare Workerのローカル・本番URL
export const API_BASE = import.meta.env.DEV ? 'http://localhost:8787' : 'https://ripple-worker.reha-mobileuser.workers.dev';

export const hostLogin = async (password: string) => {
  // 簡易認証（ハードコード）
  return password === '1234';
};

export const updateHostState = async (state: any) => {
  await fetch(`${API_BASE}/api/host/state`, {
    method: 'POST',
    body: JSON.stringify(state)
  });
};

export const saveQuestions = async (questions: any[]) => {
  await fetch(`${API_BASE}/api/host/questions`, {
    method: 'POST',
    body: JSON.stringify(questions)
  });
};

export const getQuestions = async () => {
  const res = await fetch(`${API_BASE}/api/questions`);
  if (!res.ok) return [];
  return res.json();
};

export const submitVote = async (sessionId: string, answer: any) => {
  await fetch(`${API_BASE}/api/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, answer })
  });
};

export const clearResponses = async () => {
  await fetch(`${API_BASE}/api/host/clear_responses`, { method: 'POST' });
};
