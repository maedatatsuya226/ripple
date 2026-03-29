// Cloudflare Workerのローカル・本番URL
const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE = import.meta.env.DEV 
  ? `http://${currentHost}:8787` 
  : ''; // Pages Functionsの場合は空（同一ドメイン）でOK

export const hostLogin = async (password: string) => {
  const res = await fetch(`${API_BASE}/api/host/login`, {
    method: 'POST',
    body: JSON.stringify({ password })
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success;
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

// ---- ゲスト招待リンク機能 ----

export const createGuestToken = async (days: number): Promise<{ url: string } | null> => {
  const res = await fetch(`${API_BASE}/api/host/create_guest`, {
    method: 'POST',
    body: JSON.stringify({ days })
  });
  if (!res.ok) return null;
  return res.json();
};

export const enterAsGuest = async (token: string): Promise<{ valid: boolean; roomId: string } | null> => {
  const res = await fetch(`${API_BASE}/api/guest/enter?guest=${token}`);
  if (!res.ok) return null;
  return res.json();
};
