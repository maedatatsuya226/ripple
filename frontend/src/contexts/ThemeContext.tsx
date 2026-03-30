import { createContext, useContext, useState, type ReactNode } from 'react';

export type ThemeName = 'neon' | 'medical' | 'hospital';

export interface Theme {
  name: ThemeName;
  label: string;
  emoji: string;
  // 背景・テキスト
  bg: string;         // body background
  surface: string;    // card surface
  border: string;     // card border
  text: string;       // primary text
  textMuted: string;  // muted text
  // アクセントカラー
  accent1: string;    // primary action / header glow
  accent2: string;    // secondary
  // オプションボタン (4択)
  optColors: { bg: string; text: string; shadow: string; border: string }[];
  optShapes: string[];
  // バーチャートの色 (4本)
  chartColors: string[];
  // CSS classの上書きマップ
  glass: string;
  glowAccent: string;
  neonTitle: string;
}

export const themes: Record<ThemeName, Theme> = {
  neon: {
    name: 'neon',
    label: 'ネオン',
    emoji: '⚡',
    bg: '#0b0b14',
    surface: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.1)',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.6)',
    accent1: '#ff007f',
    accent2: '#00d2ff',
    optColors: [
      { bg: '#ff007f', text: 'white',  shadow: 'rgba(255,0,127,0.6)',   border: '#99004d' },
      { bg: '#00f0ff', text: 'black',  shadow: 'rgba(0,240,255,0.6)',   border: '#009099' },
      { bg: '#b026ff', text: 'white',  shadow: 'rgba(176,38,255,0.6)',  border: '#6a1799' },
      { bg: '#ccff00', text: 'black',  shadow: 'rgba(204,255,0,0.6)',   border: '#7a9900' },
    ],
    optShapes: ['▲', '◆', '●', '■'],
    chartColors: ['#ff007f', '#00f0ff', '#b026ff', '#ccff00'],
    glass: 'rgba(255,255,255,0.05)',
    glowAccent: '0 0 30px rgba(255,0,127,0.4)',
    neonTitle: 'text-shadow: 0 0 10px #ff007f, 0 0 20px rgba(255,0,127,0.5)',
  },

  medical: {
    name: 'medical',
    label: '医療',
    emoji: '🏥',
    bg: '#0d1b2a',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(148,180,220,0.18)',
    text: '#e8f0fe',
    textMuted: 'rgba(180,210,240,0.6)',
    accent1: '#38bdf8',
    accent2: '#2dd4bf',
    optColors: [
      { bg: '#1d4ed8', text: 'white', shadow: 'rgba(29,78,216,0.4)',  border: '#1e3a8a' },
      { bg: '#0d9488', text: 'white', shadow: 'rgba(13,148,136,0.4)', border: '#065f52' },
      { bg: '#7c3aed', text: 'white', shadow: 'rgba(124,58,237,0.4)', border: '#4c1d95' },
      { bg: '#0e7490', text: 'white', shadow: 'rgba(14,116,144,0.4)', border: '#0c4a6e' },
    ],
    optShapes: ['①', '②', '③', '④'],
    chartColors: ['#38bdf8', '#2dd4bf', '#818cf8', '#34d399'],
    glass: 'rgba(13,27,42,0.7)',
    glowAccent: '0 0 20px rgba(56,189,248,0.2)',
    neonTitle: 'text-shadow: 0 0 8px rgba(56,189,248,0.6)',
  },

  hospital: {
    name: 'hospital',
    label: '病院',
    emoji: '🚑',
    bg: '#fafaf9',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    accent1: '#f97316',
    accent2: '#0ea5e9',
    optColors: [
      { bg: '#f97316', text: 'white', shadow: 'rgba(249,115,22,0.3)',  border: '#ea580c' },
      { bg: '#0ea5e9', text: 'white', shadow: 'rgba(14,165,233,0.3)', border: '#0284c7' },
      { bg: '#8b5cf6', text: 'white', shadow: 'rgba(139,92,246,0.3)', border: '#7c3aed' },
      { bg: '#10b981', text: 'white', shadow: 'rgba(16,185,129,0.3)', border: '#059669' },
    ],
    optShapes: ['A', 'B', 'C', 'D'],
    chartColors: ['#f97316', '#0ea5e9', '#8b5cf6', '#10b981'],
    glass: 'rgba(255,255,255,0.95)',
    glowAccent: '0 10px 30px rgba(249,115,22,0.1)',
    neonTitle: 'font-weight: 900; color: #f97316',
  },
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.neon,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('neon');

  return (
    <ThemeContext.Provider value={{ theme: themes[themeName], setTheme: setThemeName }}>
      <div style={{
        '--theme-bg': themes[themeName].bg,
        '--theme-surface': themes[themeName].surface,
        '--theme-border': themes[themeName].border,
        '--theme-accent1': themes[themeName].accent1,
        '--theme-accent2': themes[themeName].accent2,
        minHeight: '100vh',
        width: '100%',
        backgroundColor: themes[themeName].bg,
        color: themes[themeName].text,
        fontFamily: "'Inter','Outfit','Noto Sans JP', sans-serif",
        transition: 'background-color 0.5s ease, color 0.3s ease',
      } as React.CSSProperties}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
