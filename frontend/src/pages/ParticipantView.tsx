import { useState, useEffect } from 'react';
import { useRippleStream } from '../hooks/useRipple';
import { submitVote } from '../api';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const sessionId = Math.random().toString(36).substring(2, 10);

// ---- 問題タイプ別コンポーネント ----

// 1. 選択肢
function ChoiceInput({ question, onVote, theme }: any) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {question.options?.map((opt: string, i: number) => {
        const c = theme.optColors[i % theme.optColors.length];
        return (
          <motion.button key={i} whileTap={{ scale: 0.94, y: 8 }} onClick={() => onVote(opt)}
            className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-3xl font-black text-base leading-tight cursor-pointer"
            style={{ backgroundColor: c.bg, color: c.text, borderBottom: `10px solid ${c.border}`, boxShadow: `0 0 20px ${c.shadow}` }}>
            <span className="text-4xl drop-shadow-md">{theme.optShapes[i % 4]}</span>
            <span className="text-center">{opt}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// 2. ワードクラウド・自由記述（テキスト入力）
function TextInput({ placeholder, onVote, theme }: any) {
  const [text, setText] = useState('');
  return (
    <div className="flex flex-col gap-4">
      <textarea
        className="w-full rounded-2xl p-4 text-lg resize-none focus:outline-none transition-colors"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: `2px solid ${theme.accent1}40`, color: theme.text, minHeight: '120px' }}
        placeholder={placeholder}
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={80}
      />
      <span className="text-right text-xs" style={{ color: theme.textMuted }}>{text.length}/80</span>
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => onVote(text)} disabled={!text.trim()}
        className="py-4 rounded-2xl font-black text-xl disabled:opacity-40"
        style={{ backgroundColor: theme.accent1, color: 'white', boxShadow: `0 0 20px ${theme.accent1}50` }}>
        送信 ✈️
      </motion.button>
    </div>
  );
}

// 3. クイズ（選択肢＋正誤フィードバック）
function QuizInput({ question, onVote, theme }: any) {
  const [selected, setSelected] = useState<string | null>(null);
  const isCorrect = selected === question.correctAnswer;

  const handleSelect = (opt: string) => {
    setSelected(opt);
    onVote(opt);
  };

  if (selected) {
    return (
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-10 flex flex-col items-center">
        <div className="text-8xl mb-4">{isCorrect ? '🎉' : '😢'}</div>
        <p className="text-2xl font-black" style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>
          {isCorrect ? '正解！' : '不正解...'}
        </p>
        {!isCorrect && <p className="mt-3 text-base" style={{ color: theme.textMuted }}>正解: <b style={{ color: theme.text }}>{question.correctAnswer}</b></p>}
      </motion.div>
    );
  }

  return <ChoiceInput question={question} onVote={handleSelect} theme={theme} />;
}

// 4. スライダー
function SliderInput({ onVote, theme }: any) {
  const [value, setValue] = useState(50);
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center">
        <span className="text-6xl font-black" style={{ color: theme.accent1 }}>{value}</span>
        <span className="text-xl ml-1" style={{ color: theme.textMuted }}>%</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={e => setValue(Number(e.target.value))}
        className="w-full h-3 rounded-full cursor-pointer appearance-none"
        style={{ accentColor: theme.accent1 }}
      />
      <div className="flex justify-between text-sm" style={{ color: theme.textMuted }}>
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => onVote(value)}
        className="py-4 rounded-2xl font-black text-xl"
        style={{ backgroundColor: theme.accent1, color: 'white', boxShadow: `0 0 20px ${theme.accent1}50` }}>
        送信 ✈️
      </motion.button>
    </div>
  );
}

// ---- メインコンポーネント ----
export function ParticipantView() {
  const { state, isConnected } = useRippleStream();
  const { theme } = useTheme();
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    setVoted(false);
  }, [state.currentQuestionId]);

  const handleVote = async (answer: any) => {
    setVoted(true);
    await submitVote(sessionId, answer);
  };

  // カウントダウン
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!state.timerEndAt) { setTimeLeft(null); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((state.timerEndAt! - Date.now()) / 1000));
      setTimeLeft(left);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state.timerEndAt]);

  const panelStyle = {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    backdropFilter: 'blur(20px)',
    borderRadius: '1.25rem',
  };

  const q = state.currentQuestion;
  const qType: string = q?.type ?? 'choice';

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center min-h-[90vh] relative z-10">
      {!isConnected && (
        <div className="absolute top-4 right-4 text-xs animate-pulse px-3 py-1 rounded-full font-bold"
          style={{ color: theme.accent1, border: `1px solid ${theme.accent1}40`, backgroundColor: `${theme.accent1}10` }}>
          Offline
        </div>
      )}

      <AnimatePresence mode="wait">
        {state.status === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center w-full">
            <div className="mb-8">
              <h1 className="text-6xl font-black mb-2 tracking-tighter" style={{ color: theme.accent1, textShadow: `0 0 20px ${theme.accent1}80` }}>Ripple</h1>
              <p className="text-sm opacity-60 tracking-widest uppercase" style={{ color: theme.textMuted }}>Realtime Polling</p>
            </div>
            <div style={panelStyle} className="py-12 px-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 animate-spin"
                style={{ borderTopColor: theme.accent1, borderRightColor: 'transparent', borderBottomColor: theme.accent2, borderLeftColor: 'transparent' }}></div>
              <p className="text-2xl font-bold">ただいま準備中...🎉</p>
              <p className="mt-4 text-sm" style={{ color: theme.textMuted }}>ホストが開始するまでこのままお待ちください</p>
            </div>
          </motion.div>
        )}

        {state.status === 'question' && (
          <motion.div key={`q-${state.currentQuestionId}`} initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '-100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full">
            <div style={panelStyle} className="p-5 flex flex-col gap-5">
              {/* タイマー */}
              {timeLeft !== null && (
                <div className="flex justify-end">
                  <div className="px-4 py-1 rounded-full font-black text-2xl" style={{ backgroundColor: timeLeft <= 5 ? '#ef4444' : `${theme.accent1}20`, color: timeLeft <= 5 ? 'white' : theme.accent1, border: `2px solid ${timeLeft <= 5 ? '#ef4444' : theme.accent1}` }}>
                    ⏱ {timeLeft}
                  </div>
                </div>
              )}
              {/* 問題タイプバッジ */}
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ backgroundColor: `${theme.accent1}20`, color: theme.accent1 }}>
                  {{ choice: '選択肢', wordcloud: 'ワードクラウド', quiz: 'クイズ', opentext: '自由記述', slider: 'スライダー' }[qType]}
                </span>
              </div>
              <h2 className="text-xl font-bold leading-tight" style={{ color: theme.text }}>{q?.text || '質問がありません'}</h2>

              {!voted ? (
                <>
                  {(qType === 'choice') && <ChoiceInput question={q} onVote={handleVote} theme={theme} />}
                  {(qType === 'wordcloud') && <TextInput placeholder="ワードを入力してください..." onVote={handleVote} theme={theme} />}
                  {(qType === 'quiz') && <QuizInput question={q} onVote={handleVote} theme={theme} />}
                  {(qType === 'opentext') && <TextInput placeholder="自由に回答してください..." onVote={handleVote} theme={theme} />}
                  {(qType === 'slider') && <SliderInput onVote={handleVote} theme={theme} />}
                </>
              ) : (
                <div className="text-center font-bold py-10 flex flex-col items-center">
                  {qType !== 'quiz' && (
                    <>
                      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }} className="text-7xl mb-4">✨</motion.div>
                      <p className="text-2xl" style={{ color: theme.accent2 }}>回答を受け付けました！</p>
                      <p className="text-sm mt-2 font-normal" style={{ color: theme.textMuted }}>画面が切り替わるまでお待ちください</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {state.status === 'result' && (
          <motion.div key="result" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full text-center">
            <h2 className="text-3xl font-bold mb-6 tracking-widest" style={{ color: theme.accent1 }}>RESULT</h2>
            <div style={panelStyle} className="py-12 px-8">
              <p className="text-xl">前のスクリーンをご覧ください👀</p>
            </div>
          </motion.div>
        )}

        {state.status === 'end' && (
          <motion.div key="end" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <div style={panelStyle} className="text-center py-12 px-8">
              <h2 className="text-4xl font-black mb-6" style={{ color: theme.accent1 }}>Thank You!</h2>
              <p className="text-xl font-bold mb-2">ご参加ありがとうございました！</p>
              <p style={{ color: theme.textMuted }}>アウトブレイクルームへ移動してください。</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
