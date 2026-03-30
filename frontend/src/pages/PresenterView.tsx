import { useEffect } from 'react';
import { useRippleStream } from '../hooks/useRipple';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

// ---- リアクション演出コンポーネント (再利用) ----
function ReactionShower({ reactions }: { reactions: any[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ y: '100vh', x: `${10 + Math.random() * 80}vw`, opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{ 
              y: '-10vh', 
              x: `${10 + Math.random() * 80 + (Math.random() - 0.5) * 20}vw`, 
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.8, 1.5, 1],
              rotate: (Math.random() - 0.5) * 90
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 4 + Math.random() * 2, ease: "easeOut" }}
            className="absolute text-6xl filter drop-shadow-xl"
            style={{ textShadow: '0 0 30px rgba(255,255,255,0.6)' }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---- 結果表示部分 (プレゼン用に巨大化) ----
function PresenterDisplay({ state, responses, theme }: any) {
  const q = state.currentQuestion;
  if (!q) return null;
  const type = q.type;

  if (type === 'choice' || type === 'quiz') {
    const counts: Record<string, number> = {};
    (q.options ?? []).forEach((o: string) => counts[o] = 0);
    responses.forEach((r: any) => { if (counts[r.answer] !== undefined) counts[r.answer]++; });
    const total = responses.length;
    const data = Object.entries(counts).map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }));
    
    return (
      <div className="flex flex-col gap-8 w-full max-w-5xl">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <span className="text-4xl font-black">{item.name}</span>
              <span className="text-4xl font-black opacity-60">{item.pct}%</span>
            </div>
            <div className="w-full h-12 rounded-2xl bg-black/10 overflow-hidden border border-white/10 shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 1.5, type: 'spring' }}
                className="h-full rounded-2xl"
                style={{ backgroundColor: theme.chartColors[i % theme.chartColors.length], boxShadow: `0 0 30px ${theme.chartColors[i % theme.chartColors.length]}40` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'wordcloud') {
    const wordCounts: Record<string, number> = {};
    responses.forEach((r: any) => {
      const text = typeof r.answer === 'string' ? r.answer.trim() : r.answer?.text?.trim();
      if (text) wordCounts[text] = (wordCounts[text] || 0) + 1;
    });
    const words = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = words.length > 0 ? words[0][1] : 1;

    return (
      <div className="flex flex-wrap justify-center items-center content-center gap-8 w-full p-4">
        <AnimatePresence>
          {words.map(([text, count]) => {
            const ratio = count / maxCount;
            const size = 2 + ratio * 8; 
            return (
              <motion.div key={text} initial={{ scale: 0 }} animate={{ scale: 1 }} layout className="font-black"
                style={{ fontSize: `${size}rem`, color: theme.accent1, textShadow: `0 0 20px ${theme.accent1}40` }}>
                {text}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="text-4xl font-bold opacity-50">
      現在、回答収集中です...
    </div>
  );
}

export function PresenterView() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || '';
  const { state, responses, reactions } = useRippleStream(roomId);
  const { theme, setTheme } = useTheme();

  // テーマの同期
  useEffect(() => {
    if (state.theme && state.theme !== theme.name) {
      setTheme(state.theme);
    }
  }, [state.theme, theme.name, setTheme]);

  const participantUrl = `${window.location.origin}/?room=${roomId}`;

  if (!roomId) {
    return <div className="p-10 text-2xl font-bold">Error: Room ID not found in URL (?room=xxxx)</div>;
  }

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center p-12 overflow-hidden" 
      style={{ backgroundColor: theme.bg, color: theme.text }}>
      
      {/* 背景の装飾 */}
      <div className="fixed top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full filter blur-[200px] opacity-10 pointer-events-none" style={{ backgroundColor: theme.accent1 }}></div>
      
      <ReactionShower reactions={reactions} />

      <AnimatePresence mode="wait">
        {state.status === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center flex flex-col items-center gap-10">
            <div className="flex flex-col items-center gap-4">
              <h1 className="text-8xl font-black tracking-tighter" style={{ color: theme.accent1 }}>Ripple</h1>
              <p className="text-2xl font-bold tracking-[0.5em] opacity-40">Ready to Start</p>
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6">
              <QRCodeSVG value={participantUrl} size={400} level="H" />
              <div className="bg-black/5 px-8 py-3 rounded-2xl flex flex-col items-center">
                <span className="text-sm font-bold opacity-40 uppercase">Room ID</span>
                <span className="text-5xl font-mono font-black tracking-widest">{roomId}</span>
              </div>
            </div>
            <p className="text-2xl font-medium opacity-60">スマホでスキャンして参加してください</p>
          </motion.div>
        )}

        {state.status === 'question' || state.status === 'result' ? (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col items-center">
            {/* 上部: 質問文 */}
            <div className="mb-12 text-center max-w-6xl">
               <h2 className="text-6xl font-black leading-tight" style={{ color: theme.text }}>
                 {state.currentQuestion?.text || '質問を待っています'}
               </h2>
            </div>

            {/* 中央: 結果表示 */}
            <div className="flex-1 w-full flex items-center justify-center">
               <PresenterDisplay state={state} responses={responses} theme={theme} />
            </div>

            {/* 下部/隅: 参加案内 */}
            <div className="absolute bottom-10 right-10 flex items-center gap-6 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-xl">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={participantUrl} size={100} level="H" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold opacity-60 uppercase">Join Now</span>
                <span className="text-2xl font-mono font-black">{roomId}</span>
              </div>
            </div>
            
            <div className="absolute bottom-10 left-10 flex items-center gap-3 opacity-60">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-current">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="font-bold text-xl">{responses.length} responses</span>
              </div>
            </div>
          </motion.div>
        ) : null}

        {state.status === 'end' && (
          <motion.div key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <h1 className="text-9xl font-black mb-8" style={{ color: theme.accent1 }}>FIN</h1>
            <p className="text-4xl font-bold opacity-60">ご参加ありがとうございました！</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
