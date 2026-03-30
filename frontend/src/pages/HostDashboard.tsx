import { useState, useEffect } from 'react';
import { useRippleStream, type AppState } from '../hooks/useRipple';
import { hostLogin, updateHostState, clearResponses, saveQuestions, getQuestions, createGuestToken, enterAsGuest } from '../api';
import { useTheme, themes, type ThemeName } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

type QuestionType = 'choice' | 'wordcloud' | 'quiz' | 'opentext' | 'slider';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string;
  timerSeconds?: number;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  choice: '📊 選択肢',
  wordcloud: '☁️ ワードクラウド',
  quiz: '🎯 クイズ',
  opentext: '📝 自由記述',
  slider: '🎚️ スライダー',
};

// ---- 問題作成フォーム ----
function QuestionEditor({ onSave, onCancel, theme }: { onSave: (q: Question) => void; onCancel: () => void; theme: any }) {
  const [type, setType] = useState<QuestionType>('choice');
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(30);

  const inputStyle = { backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '12px', padding: '10px 14px', width: '100%', outline: 'none' };
  const labelStyle = { color: theme.textMuted, fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px', display: 'block' };

  const handleSave = () => {
    if (!text.trim()) return;
    const q: Question = {
      id: Date.now().toString(),
      type, text,
      options: (type === 'choice' || type === 'quiz') ? options.filter(o => o.trim()) : undefined,
      correctAnswer: type === 'quiz' ? correctAnswer : undefined,
      timerSeconds,
    };
    onSave(q);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 p-6 rounded-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
      <h3 className="font-black text-xl" style={{ color: theme.text }}>新しい問題を作成</h3>

      {/* タイプ選択 */}
      <div>
        <label style={labelStyle}>問題タイプ</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setType(t)} className="py-2 px-3 rounded-xl text-sm font-bold transition-all"
              style={{ backgroundColor: type === t ? theme.accent1 : 'rgba(255,255,255,0.05)', color: type === t ? 'white' : theme.textMuted, border: `1px solid ${type === t ? theme.accent1 : theme.border}` }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 問題文 */}
      <div>
        <label style={labelStyle}>問題文</label>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="問題を入力..." rows={2}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* 選択肢（choice / quiz） */}
      {(type === 'choice' || type === 'quiz') && (
        <div className="flex flex-col gap-2">
          <label style={labelStyle}>選択肢</label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-lg">{['▲', '◆', '●', '■'][i]}</span>
              <input value={opt} onChange={e => setOptions(options.map((o, j) => j === i ? e.target.value : o))}
                placeholder={`選択肢 ${i + 1}`} style={inputStyle} />
              {type === 'quiz' && (
                <input type="radio" checked={correctAnswer === opt} onChange={() => setCorrectAnswer(opt)}
                  title="正解" className="w-5 h-5 cursor-pointer flex-none" style={{ accentColor: theme.accent1 }} />
              )}
            </div>
          ))}
          {type === 'quiz' && <p className="text-xs" style={{ color: theme.textMuted }}>✅ ラジオボタンで正解を選択してください</p>}
        </div>
      )}

      {/* タイマー */}
      <div>
        <label style={labelStyle}>タイマー（秒）</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={120} step={5} value={timerSeconds}
            onChange={e => setTimerSeconds(Number(e.target.value))} style={{ flex: 1, accentColor: theme.accent1 }} />
          <span className="font-black text-xl w-12 text-right" style={{ color: theme.accent1 }}>{timerSeconds === 0 ? '∞' : `${timerSeconds}s`}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={!text.trim()}
          className="flex-1 py-3 rounded-2xl font-black disabled:opacity-40"
          style={{ backgroundColor: theme.accent1, color: 'white' }}>
          保存 ✅
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onCancel}
          className="px-6 py-3 rounded-2xl font-bold"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: theme.textMuted, border: `1px solid ${theme.border}` }}>
          キャンセル
        </motion.button>
      </div>
    </motion.div>
  );
}

// ---- ホスト画面の結果表示（問題タイプ別） ----
function ResultDisplay({ question, responses, theme, showCorrectAnswer = true }: { question: any; responses: any[]; theme: any; showCorrectAnswer?: boolean }) {
  if (!question) return null;
  const type: QuestionType = question.type ?? 'choice';

  if (type === 'choice' || type === 'quiz') {
    const counts: Record<string, number> = {};
    (question.options ?? []).forEach((o: string) => counts[o] = 0);
    responses.forEach(r => { if (counts[r.answer] !== undefined) counts[r.answer]++; });
    const total = responses.length;
    const data = Object.entries(counts).map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }));
    const neonColors = theme.chartColors;
    const isQuiz = type === 'quiz' && showCorrectAnswer;
    
    return (
      <div className="flex flex-col gap-5 w-full h-full justify-center overflow-y-auto px-4 py-2">
        {data.map((item, i) => {
          const isCorrect = isQuiz && item.name === question.correctAnswer;
          const fill = isQuiz ? (isCorrect ? '#22c55e' : '#ef444480') : neonColors[i % neonColors.length];
          return (
            <div key={i} className="flex flex-col gap-2 w-full">
              <div className="flex justify-between items-end">
                <span className="text-xl font-bold" style={{ color: theme.text }}>{item.name} {isCorrect && '✅'}</span>
                <span className="text-xl font-black" style={{ color: theme.textMuted }}>{item.pct}%</span>
              </div>
              <div className="w-full h-6 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${item.pct}%` }}
                  transition={{ duration: 1, type: 'spring' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: fill, boxShadow: `0 0 16px ${fill}60` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'slider') {
    const values = responses.map(r => Number(r.answer)).filter(v => !isNaN(v));
    const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <p className="text-2xl font-bold" style={{ color: theme.textMuted }}>平均スコア</p>
        <div className="text-[120px] font-black leading-none" style={{ color: theme.accent1, textShadow: `0 0 40px ${theme.accent1}60` }}>{avg}<span className="text-5xl">%</span></div>
        <p className="text-lg" style={{ color: theme.textMuted }}>{responses.length}件の回答</p>
        <div className="w-full max-w-lg h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${avg}%`, backgroundColor: theme.accent1, boxShadow: `0 0 20px ${theme.accent1}` }}></div>
        </div>
      </div>
    );
  }

  if (type === 'wordcloud') {
    const wordSentiments: Record<string, { count: number, sentiment: string }> = {};
    responses.forEach(r => {
      let text = '';
      let sentiment = 'neutral';
      if (typeof r.answer === 'object' && r.answer !== null) {
        text = r.answer.text?.trim() || '';
        sentiment = r.answer.sentiment || 'neutral';
      } else if (typeof r.answer === 'string') {
        text = r.answer.trim();
      }
      
      if (text) {
        if (!wordSentiments[text]) {
          wordSentiments[text] = { count: 0, sentiment };
        }
        wordSentiments[text].count++;
        // 必要に応じて上書き: wordSentiments[text].sentiment = sentiment;
      }
    });
    const words = Object.entries(wordSentiments).sort((a, b) => b[1].count - a[1].count); // 頻出順
    const maxCount = words.length > 0 ? words[0][1].count : 1;

    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-4 overflow-hidden relative">
        {words.length === 0 && <p className="text-xl font-bold opacity-50">回答を待っています...</p>}
        <div className="flex flex-wrap justify-center items-center content-center gap-x-4 gap-y-4 w-full h-full">
          <AnimatePresence>
            {words.map(([text, { count, sentiment }]) => {
              const ratio = count / maxCount;
              // 1rem ~ 6remでサイズを可変
              const size = 1 + ratio * 5; 
              
              let color = theme.accent1;
              let bgColor = `${theme.accent1}20`;
              let borderColor = `${theme.accent1}40`;
              
              if (sentiment === 'positive') {
                color = '#3b82f6';
                bgColor = 'rgba(59, 130, 246, 0.2)';
                borderColor = 'rgba(59, 130, 246, 0.4)';
              } else if (sentiment === 'negative') {
                color = '#ef4444';
                bgColor = 'rgba(239, 68, 68, 0.2)';
                borderColor = 'rgba(239, 68, 68, 0.4)';
              } else if (sentiment === 'neutral') {
                color = theme.text;
                bgColor = 'rgba(255, 255, 255, 0.1)';
                borderColor = 'rgba(255, 255, 255, 0.2)';
              }

              return (
                <motion.div 
                  key={text} 
                  initial={{ scale: 0, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  layout
                  transition={{ type: 'spring', damping: 15 }}
                  className="font-black rounded-xl px-4 py-2 flex items-center justify-center leading-none"
                  style={{ 
                    fontSize: `${size}rem`, 
                    backgroundColor: bgColor,
                    color: color,
                    border: `2px solid ${borderColor}`,
                    boxShadow: `0 0 ${10 * ratio}px ${borderColor}`,
                    textShadow: `0 0 ${5 * ratio}px ${color}80`
                  }}
                >
                  {text}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // opentext (通常の一覧)
  const answers = responses.map(r => r.answer).filter(Boolean);
  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        {answers.map((ans, i) => (
          <motion.div key={i} initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl font-bold text-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}` }}>
            {ans}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---- リアクション演出コンポーネント ----
function ReactionShower({ reactions }: { reactions: any[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ y: '100vh', x: `${20 + Math.random() * 60}vw`, opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{ 
              y: '-10vh', 
              x: `${20 + Math.random() * 60 + (Math.random() - 0.5) * 20}vw`, 
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.5, 1.2, 1],
              rotate: (Math.random() - 0.5) * 45
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3 + Math.random() * 2, ease: "easeOut" }}
            className="absolute text-5xl filter drop-shadow-lg"
            style={{ textShadow: '0 0 20px rgba(255,255,255,0.4)' }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---- メインホストダッシュボード ----
export function HostDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomId = urlParams.get('room') || Math.floor(1000 + Math.random() * 9000).toString();

  const [roomIdInput, setRoomIdInput] = useState(initialRoomId);
  const [roomId, setRoomId] = useState('');
  const [guestLinkUrl, setGuestLinkUrl] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestDays, setGuestDays] = useState(7);
  
  const isGuestAdmin = roomId.startsWith('guest-');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [templates, setTemplates] = useState<{name: string, questions: Question[]}[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<'control' | 'questions'>('control');
  
  const { theme, setTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { state, responses, reactions } = useRippleStream(roomId);

  // テンプレートの読み込み
  useEffect(() => {
    const saved = localStorage.getItem('ripple_templates');
    if (saved) setTemplates(JSON.parse(saved));
  }, []);

  const saveToTemplate = () => {
    const name = prompt('テンプレート名を入力してください', `マイテンプレート ${templates.length + 1}`);
    if (!name || questions.length === 0) return;
    const next = [...templates, { name, questions }];
    setTemplates(next);
    localStorage.setItem('ripple_templates', JSON.stringify(next));
    alert('保存しました！');
  };

  const loadTemplate = (templateQuestions: Question[]) => {
    if (confirm('現在の問題リストを上書きしてテンプレートを読み込みますか？')) {
      setQuestions(templateQuestions);
      saveQuestions(roomId, templateQuestions);
    }
  };

  const deleteTemplate = (idx: number) => {
    if (confirm('このテンプレートを削除しますか？')) {
      const next = templates.filter((_, i) => i !== idx);
      setTemplates(next);
      localStorage.setItem('ripple_templates', JSON.stringify(next));
    }
  };

  // ゲストURL経由のアクセス時: パスワードなしで自動ログイン
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guestToken = params.get('guest');
    if (!guestToken) return;

    const storageKey = `ripple_guest_room_${guestToken}`;
    const savedRoomId = localStorage.getItem(storageKey);

    if (savedRoomId) {
      // 2回目以降: 保存済みルームIDで即ログイン
      setRoomId(savedRoomId);
      setRoomIdInput(savedRoomId);
      setIsAuthenticated(true);
      getQuestions(savedRoomId).then(qs => setQuestions(Array.isArray(qs) ? qs : []));
    } else {
      // 初回: APIでルームID払い出し
      enterAsGuest(guestToken).then(result => {
        if (result?.valid) {
          localStorage.setItem(storageKey, result.roomId);
          setRoomId(result.roomId);
          setRoomIdInput(result.roomId);
          setIsAuthenticated(true);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('room', result.roomId);
          newUrl.searchParams.delete('guest');
          window.history.replaceState({}, '', newUrl);
        }
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return alert('ルーム名を入力してください');
    
    if (await hostLogin(password)) {
      setRoomId(roomIdInput);
      setIsAuthenticated(true);
      
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('room', roomIdInput);
      window.history.replaceState({}, '', newUrl);
      
      const qs = await getQuestions(roomIdInput);
      setQuestions(Array.isArray(qs) ? qs : []);
    } else {
      alert('パスワードが違います');
    }
  };

  const setStatus = async (status: AppState['status'], question?: Question) => {
    const timerEndAt = question?.timerSeconds ? Date.now() + question.timerSeconds * 1000 : undefined;
    await updateHostState(roomId, { status, currentQuestionId: question?.id, currentQuestion: question, timerEndAt });
  };

  const handleSaveQuestion = async (q: Question) => {
    const next = [...questions, q];
    setQuestions(next);
    await saveQuestions(roomId, next);
    setShowEditor(false);
  };

  const handleGoToQuestion = async (idx: number) => {
    setCurrentQIndex(idx);
    await clearResponses(roomId);
    await setStatus('question', questions[idx]);
  };

  const handleNextQuestion = async () => {
    if (currentQIndex === null) return;
    const next = currentQIndex + 1;
    if (next < questions.length) {
      await handleGoToQuestion(next);
    } else {
      await setStatus('end');
    }
  };

  const panelStyle = { backgroundColor: theme.surface, border: `1px solid ${theme.border}`, backdropFilter: 'blur(20px)', borderRadius: '1.25rem' };

  const participantUrl = `${window.location.origin}/?room=${roomId}`;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full relative z-10">
        <div style={{ ...panelStyle, boxShadow: theme.glowAccent }} className="w-[400px] p-8">
          <h2 className="text-3xl font-black mb-8 text-center" style={{ color: theme.accent1 }}>Host Login</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: theme.textMuted }}>ルームID (Room Code)</label>
              <input type="text" value={roomIdInput} onChange={e => setRoomIdInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none font-black"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}`, color: theme.text }} />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: theme.textMuted }}>パスワード (Password)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}`, color: theme.text }}
                placeholder="Enter password (1234)" />
            </div>
            <button type="submit" className="py-4 mt-2 rounded-2xl font-black text-lg" style={{ backgroundColor: theme.accent1, color: 'white' }}>ログイン</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-8 flex flex-col min-h-screen relative z-10">
      {/* リアクション演出 */}
      <ReactionShower reactions={reactions} />

      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-6 p-4 rounded-2xl" style={panelStyle}>
        <h1 className="text-2xl font-black tracking-wider" style={{ color: theme.accent1 }}>🌊 Ripple Host</h1>
        <div className="flex gap-3 items-center flex-wrap">
          {/* テーマ切替 */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${theme.border}` }}>
            {(Object.values(themes) as typeof themes[ThemeName][]).map(t => (
              <button key={t.name} onClick={() => {
                  setTheme(t.name);
                  updateHostState(roomId, { ...state, theme: t.name });
                }} className="px-3 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ backgroundColor: theme.name === t.name ? t.accent1 : 'transparent', color: theme.name === t.name ? 'white' : theme.textMuted }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          {/* ゲスト招待ボタン (本物の管理者のみ表示) */}
          {!isGuestAdmin && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: `1px solid ${theme.border}` }}>
              <select 
                value={guestDays} 
                onChange={(e) => setGuestDays(Number(e.target.value))}
                className="bg-transparent text-xs font-bold px-2 py-1 outline-none cursor-pointer rounded-lg hover:bg-white/5"
                style={{ color: theme.textMuted }}
              >
                <option value={1} className="bg-slate-800">1日</option>
                <option value={7} className="bg-slate-800">7日</option>
                <option value={30} className="bg-slate-800">30日</option>
              </select>
              <button 
                onClick={async () => {
                  const result = await createGuestToken(guestDays);
                  if (result?.url) { setGuestLinkUrl(result.url); setShowGuestModal(true); }
                }} 
                className="px-4 py-2 rounded-xl font-bold text-sm transition-all hover:opacity-80 whitespace-nowrap"
                style={{ backgroundColor: `${theme.accent2}25`, border: `1px solid ${theme.accent2}60`, color: theme.accent2 }}
              >
                ⚡ ゲスト招待リンク発行
              </button>
            </div>
          )}
          <div className="px-4 py-2 rounded-xl flex items-center gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}` }}>
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></span>
            <span className="font-bold">{responses.length}<span className="text-sm opacity-60 ml-1">票</span></span>
          </div>
          <button onClick={() => clearResponses(roomId)} className="px-4 py-2 rounded-xl font-bold text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>Reset</button>
          
          <a href={`/presenter?room=${roomId}`} target="_blank" rel="noopener noreferrer" 
             className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:brightness-110"
             style={{ backgroundColor: theme.accent1, color: 'white', boxShadow: `0 4px 12px ${theme.accent1}40` }}>
            📺 プレゼン画面
          </a>
        </div>
      </header>

      {/* ゲスト招待モーダル */}
      <AnimatePresence>
        {showGuestModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            onClick={() => setShowGuestModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ ...panelStyle, boxShadow: theme.glowAccent }} className="p-8 max-w-lg w-full"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-black mb-2" style={{ color: theme.accent2 }}>⚡ ゲスト招待リンク</h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: theme.textMuted }}>
                このURLをグループに送ってください。アクセスした人それぞれに<br/>専用ルームが自動で割り当てられます。<span className="font-bold" style={{ color: theme.accent1 }}>有効期限: 7日間</span>
              </p>
              <div className="flex gap-2 mb-4">
                <input readOnly value={guestLinkUrl}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-mono"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `1px solid ${theme.border}`, color: theme.text }} />
                <button onClick={() => { navigator.clipboard.writeText(guestLinkUrl); }}
                  className="px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap"
                  style={{ backgroundColor: theme.accent1, color: 'white' }}>コピー 📋</button>
              </div>
              <button onClick={() => setShowGuestModal(false)} className="w-full py-2 rounded-xl text-sm font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: theme.textMuted }}>閉じる</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 flex-1">
        {/* 左サイドバー */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* タブ切替 */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${theme.border}` }}>
            {(['control', 'questions'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ backgroundColor: tab === t ? theme.accent1 : 'transparent', color: tab === t ? 'white' : theme.textMuted }}>
                {t === 'control' ? '🎮 操作' : '📋 問題'}
              </button>
            ))}
          </div>

          {tab === 'control' && (
            <div style={panelStyle} className="flex flex-col gap-3 p-4 flex-1">
              <div className="flex flex-col gap-2">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStatus('waiting')}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-sm"
                  style={{ backgroundColor: state.status === 'waiting' ? theme.accent1 : 'rgba(255,255,255,0.05)', color: state.status === 'waiting' ? 'white' : theme.textMuted, border: `1px solid ${state.status === 'waiting' ? theme.accent1 : theme.border}` }}>
                  ⏸ 待機画面
                </motion.button>
                {currentQIndex !== null && questions[currentQIndex] && (
                  <>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStatus('result', questions[currentQIndex])}
                      className="w-full py-3 px-4 rounded-2xl font-bold text-sm"
                      style={{ backgroundColor: state.status === 'result' ? theme.accent2 : 'rgba(255,255,255,0.05)', color: state.status === 'result' ? 'white' : theme.textMuted, border: `1px solid ${state.status === 'result' ? theme.accent2 : theme.border}` }}>
                      📊 結果発表
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleNextQuestion}
                      className="w-full py-3 px-4 rounded-2xl font-bold text-sm"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: theme.textMuted, border: `1px solid ${theme.border}` }}>
                      ⏭ 次の問題へ
                    </motion.button>
                  </>
                )}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStatus('end')}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-sm"
                  style={{ backgroundColor: state.status === 'end' ? '#ef4444' : 'rgba(255,255,255,0.05)', color: state.status === 'end' ? 'white' : theme.textMuted, border: `1px solid ${state.status === 'end' ? '#ef4444' : theme.border}` }}>
                  🏁 終了
                </motion.button>
              </div>

              {/* QRコード表示 */}
              <div style={panelStyle} className="p-4 mt-2 flex flex-col items-center">
                <div className="mb-4 text-center w-full">
                  <span className="text-[10px] font-bold block mb-1 opacity-50 uppercase tracking-tighter" style={{ color: theme.text }}>ROOM ID</span>
                  <div className="mx-auto inline-flex items-center px-3 py-1.5 rounded-xl whitespace-nowrap overflow-hidden max-w-full" 
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, boxShadow: `0 0 10px ${theme.accent1}15` }}>
                    <span className="text-sm font-mono font-black tracking-tight" style={{ color: theme.accent1 }}>
                      {roomId}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-inner mb-3">
                  <QRCodeSVG value={participantUrl} size={160} level="H" />
                </div>
                <p className="text-center font-black text-xs tracking-widest mb-1" style={{ color: theme.text }}>SCAN TO JOIN</p>
                <p className="text-[10px] opacity-60 font-mono break-all text-center leading-tight" style={{ color: theme.textMuted }}>{participantUrl}</p>
                
                <button onClick={toggleFullscreen} className="mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, color: theme.textMuted }}>
                  📺 フルスクリーン切替
                </button>
              </div>
            </div>
          )}

          {tab === 'questions' && (
            <div style={panelStyle} className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto max-h-[600px]">
              <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5 mb-2">
                <div className="flex flex-col">
                  <h3 className="font-bold text-sm" style={{ color: theme.text }}>問題一覧 ({questions.length})</h3>
                  <p className="text-[10px] opacity-40 uppercase font-black" style={{ color: theme.textMuted }}>Questions List</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveToTemplate} className="px-3 py-1.5 rounded-xl font-bold text-xs"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: theme.text, border: `1px solid ${theme.border}` }}>💾 保存</button>
                  <button onClick={() => setShowEditor(true)} className="px-3 py-1.5 rounded-xl font-bold text-xs"
                    style={{ backgroundColor: theme.accent1, color: 'white' }}>＋ 追加</button>
                </div>
              </div>

              {/* テンプレート読み込みエリア */}
              {templates.length > 0 && (
                <div className="mb-4 flex flex-col gap-2">
                  <p className="text-[10px] font-bold opacity-40" style={{ color: theme.textMuted }}>🚀 保存済みテンプレート</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {templates.map((t, i) => (
                      <div key={i} className="flex-none group relative">
                        <button onClick={() => loadTemplate(t.questions)} className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-125"
                          style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: `1px dotted ${theme.border}`, color: theme.text }}>
                          {t.name}
                        </button>
                        <button onClick={() => deleteTemplate(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questions.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: theme.textMuted }}>まだ問題がありません。「＋ 追加」で作成してください。</p>
              )}
              {questions.map((q, i) => (
                <motion.button key={q.id} whileTap={{ scale: 0.98 }} onClick={() => handleGoToQuestion(i)}
                  className="w-full text-left p-3 rounded-xl transition-all"
                  style={{ backgroundColor: currentQIndex === i ? `${theme.accent1}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${currentQIndex === i ? theme.accent1 : theme.border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: `${theme.accent1}20`, color: theme.accent1 }}>
                      {TYPE_LABELS[q.type]}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: theme.textMuted }}>⏱ {q.timerSeconds === 0 ? '∞' : `${q.timerSeconds}s`}</span>
                  </div>
                  <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{i + 1}. {q.text}</p>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* メインプレビューエリア */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* 問題エディタ */}
          <AnimatePresence>
            {showEditor && (
              <QuestionEditor onSave={handleSaveQuestion} onCancel={() => setShowEditor(false)} theme={theme} />
            )}
          </AnimatePresence>

          {/* プレビューカード */}
          <div style={{ ...panelStyle, boxShadow: theme.glowAccent, flex: 1 }} className="flex flex-col p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold" style={{ color: theme.text }}>
                {state.status === 'result' ? '📊 結果' : state.status === 'question' ? '📡 ライブ' : '📺 プレビュー'}
                {currentQIndex !== null && questions[currentQIndex] && (
                  <span className="text-sm ml-3 font-normal" style={{ color: theme.textMuted }}>
                    ({currentQIndex + 1}/{questions.length}) {TYPE_LABELS[questions[currentQIndex].type]}
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                {(state.status === 'question' || state.status === 'result') && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold"
                    style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    {responses.length} 票
                  </div>
                )}
                <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: `1px solid ${theme.border}`, color: theme.textMuted }}>
                  {state.status}
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-2xl flex flex-col overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${theme.border}40` }}>
              {state.status === 'waiting' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <h1 className="text-7xl font-black tracking-tighter mb-4" style={{ color: theme.accent1, textShadow: `0 0 30px ${theme.accent1}60` }}>Ripple</h1>
                  <p className="text-2xl font-bold" style={{ color: theme.text }}>ただいま準備中...🎉</p>
                </div>
              )}

              {state.status === 'question' && (
                <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col px-8 py-6 gap-4 overflow-hidden">
                  <h3 className="text-3xl font-black leading-tight text-center" style={{ color: theme.text }}>{state.currentQuestion?.text}</h3>
                  <div className="flex-1 min-h-0">
                    <ResultDisplay question={state.currentQuestion} responses={responses} theme={theme} showCorrectAnswer={false} />
                  </div>
                  {(!state.currentQuestion?.type || state.currentQuestion?.type === 'choice' || state.currentQuestion?.type === 'quiz') && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {state.currentQuestion?.options?.map((opt: string, i: number) => {
                        const c = theme.optColors[i % theme.optColors.length];
                        return (
                          <div key={i} className="rounded-2xl py-2 px-3 text-center font-black text-base flex items-center gap-1 justify-center shadow-lg" style={{ backgroundColor: c.bg, color: c.text }}>
                            <span className="drop-shadow-md">{theme.optShapes[i % 4]}</span>
                            <span className="truncate drop-shadow-md">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {state.status === 'result' && (
                <motion.div key="result" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex flex-col px-8 py-6 gap-4 overflow-hidden">
                  <h3 className="text-3xl font-black leading-tight text-center" style={{ color: theme.text }}>{state.currentQuestion?.text}</h3>
                  <div className="flex-1 min-h-0">
                    <ResultDisplay question={state.currentQuestion} responses={responses} theme={theme} showCorrectAnswer={true} />
                  </div>
                </motion.div>
              )}

              {state.status === 'end' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <h3 className="text-6xl font-black mb-4 tracking-widest" style={{ color: theme.accent1, textShadow: `0 0 30px ${theme.accent1}60` }}>THANK YOU</h3>
                  <p className="text-2xl font-bold" style={{ color: theme.text }}>ご参加ありがとうございました</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
