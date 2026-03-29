// Cloudflare Workerのローカル・本番URL
const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE = import.meta.env.DEV 
  ? `http://${currentHost}:8787` 
  : ''; // Pages Functionsの場合は空（同一ドメイン）でOK

export const hostLogin = async (password: string) => {
  // 簡易認証（ハードコード）
  return password === '1234';
};

export const updateHostState = async (roomId: string, state: any) => {
  await fetch(`${API_BASE}/api/host/state?room=${roomId}`, {
    method: 'POST',
    body: JSON.stringify(state)
  });
};

export const saveQuestions = async (roomId: string, questions: any[]) => {
  await fetch(`${API_BASE}/api/host/questions?room=${roomId}`, {
    method: 'POST',
    body: JSON.stringify(questions)
  });
};

export const getQuestions = async (roomId: string) => {
  const res = await fetch(`${API_BASE}/api/questions?room=${roomId}`);
  if (!res.ok) return [];
  return res.json();
};

export const submitVote = async (roomId: string, sessionId: string, answer: any) => {
  await fetch(`${API_BASE}/api/vote?room=${roomId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, answer })
  });
};

export const clearResponses = async (roomId: string) => {
  await fetch(`${API_BASE}/api/host/clear_responses?room=${roomId}`, { method: 'POST' });
};
