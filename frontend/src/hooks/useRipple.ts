import { useEffect, useRef, useState } from 'react';
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

export function useRippleStream(roomId: string, wantResults = true) {
  const [state, setState] = useState<AppState>({ status: 'waiting' });
  const [responses, setResponses] = useState<AppResponse[]>([]);
  const [reactions, setReactions] = useState<AppReaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const connect = () => {
      // 既存接続を閉じる
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }

      // 画面が隠れている場合は接続しない
      if (document.hidden) return;

      const url = `${API_BASE}/api/stream?room=${roomId}&wantResults=${wantResults}`;
      const sse = new EventSource(url);
      sseRef.current = sse;

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
          console.error('SSE Parse Error', err);
        }
      };

      sse.onerror = () => {
        setIsConnected(false);
        sseRef.current = null;
      };
    };

    // Visibility API: 画面の表示/非表示を監視
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 画面が隠れたら切断（KV読み取りゼロに）
        sseRef.current?.close();
        sseRef.current = null;
        setIsConnected(false);
      } else {
        // 画面が戻ったら再接続
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    connect(); // 初回接続

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sseRef.current?.close();
      sseRef.current = null;
      setIsConnected(false);
    };
  }, [roomId, wantResults]);

  return { state, responses, reactions, isConnected };
}
