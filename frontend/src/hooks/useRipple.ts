import { useEffect, useState } from 'react';
import { API_BASE } from '../api';
import { type ThemeName } from '../contexts/ThemeContext';

export type QuestionType = 'choice' | 'wordcloud' | 'quiz' | 'opentext' | 'slider';

export interface AppState {
  status: 'waiting' | 'question' | 'result' | 'end' | 'break';
  currentQuestionId?: string;
  currentQuestion?: any;
  countdown?: number;
  timerEndAt?: number; // Unix ms
  theme?: ThemeName;
}

export interface AppResponse {
  sessionId: string;
  answer: any;
  timestamp: number;
}

export interface AppReaction {
  id: string;
  emoji: string;
  timestamp: number;
}

export function useRippleStream(roomId: string) {
  const [state, setState] = useState<AppState>({ status: 'waiting' });
  const [responses, setResponses] = useState<AppResponse[]>([]);
  const [reactions, setReactions] = useState<AppReaction[]>([]);
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
        if (data.reactions && data.reactions.length > 0) {
          setReactions(prev => [...prev, ...data.reactions]);
          // 3秒後にそのグループのリアクションを消去
          setTimeout(() => {
            setReactions(prev => prev.filter(r => !data.reactions.find((dr: any) => dr.id === r.id)));
          }, 3000);
        }
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

  return { state, responses, reactions, isConnected };
}
