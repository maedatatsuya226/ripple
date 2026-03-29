import { useEffect, useState } from 'react';
import { API_BASE } from '../api';

export type QuestionType = 'choice' | 'wordcloud' | 'quiz' | 'opentext' | 'slider';

export interface AppState {
  status: 'waiting' | 'question' | 'result' | 'end';
  currentQuestionId?: string;
  currentQuestion?: any;
  countdown?: number;
  timerEndAt?: number; // Unix ms
}

export interface AppResponse {
  sessionId: string;
  answer: any;
  timestamp: number;
}

export function useRippleStream(roomId: string) {
  const [state, setState] = useState<AppState>({ status: 'waiting' });
  const [responses, setResponses] = useState<AppResponse[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    
    const sse = new EventSource(`${API_BASE}/api/stream?room=${roomId}`);
    
    sse.onopen = () => setIsConnected(true);
    
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.state) setState(data.state);
        if (data.responses) setResponses(data.responses);
      } catch (err) {
        console.error("SSE Parse Error", err);
      }
    };
    
    sse.onerror = (e) => {
      console.error("SSE Error", e);
      setIsConnected(false);
    };

    return () => {
      sse.close();
      setIsConnected(false);
    };
  }, [roomId]);

  return { state, responses, isConnected };
}
