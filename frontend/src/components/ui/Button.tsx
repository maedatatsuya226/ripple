import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'opt1' | 'opt2' | 'opt3' | 'opt4';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className,
  ...props 
}: ButtonProps) {
  
  // 極厚(12px)で押した時にガッツリ沈む物理的なボタンスタイル
  const baseStyle = "font-black uppercase tracking-widest rounded-3xl transition-all flex items-center justify-center gap-3 relative overflow-hidden active:translate-y-[12px] active:border-b-0 active:mb-[12px]";
  
  const variants: Record<string, string> = {
    primary: "bg-gradient-to-br from-[#ff007f] to-[#b026ff] border-b-[12px] border-[#7200b3] text-white shadow-[0_0_30px_rgba(255,0,127,0.5)]",
    secondary: "bg-glass border-[3px] border-white/20 border-b-[8px] text-white backdrop-blur-md active:translate-y-[8px] active:mb-[8px] hover:bg-white/10",
    danger: "bg-gradient-to-br from-[#ff3366] to-[#cc0000] border-b-[12px] border-[#800000] text-white shadow-[0_0_20px_rgba(255,51,102,0.5)]",
    
    // TikTokネオンカラー × Kahootの大ブロックデザイン
    opt1: "bg-[#ff007f] border-b-[12px] border-[#99004d] text-white shadow-[0_0_25px_rgba(255,0,127,0.6)]", // ネオンピンク
    opt2: "bg-[#00f0ff] border-b-[12px] border-[#009099] text-black shadow-[0_0_25px_rgba(0,240,255,0.6)]", // ネオンシアン
    opt3: "bg-[#b026ff] border-b-[12px] border-[#6a1799] text-white shadow-[0_0_25px_rgba(176,38,255,0.6)]", // ネオンパープル
    opt4: "bg-[#ccff00] border-b-[12px] border-[#7a9900] text-black shadow-[0_0_25px_rgba(204,255,0,0.6)]", // ネオンライム

    ghost: "bg-transparent text-white border-[3px] border-white/20 active:translate-y-0 active:border-b-[3px] active:mb-0 hover:bg-white/10"
  };

  const sizes = {
    sm: "px-4 py-3 text-sm rounded-2xl",
    md: "px-8 py-5 text-xl",
    lg: "px-6 py-8 text-2xl min-h-[140px] leading-tight flex-col", // 選択肢用の巨大ブロック
    xl: "px-6 py-12 text-3xl min-h-[200px] leading-tight flex-col"  
  };

  const isGhost = variant === 'ghost';

  return (
    <motion.button
      whileHover={isGhost ? {} : { filter: 'brightness(1.15)', scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      // styles override for pushing effect
      className={twMerge(baseStyle, variants[variant], sizes[size], fullWidth ? "w-full" : "", className)}
      {...props}
    >
      <span className="relative z-10 flex flex-col items-center justify-center gap-2 drop-shadow-md w-full h-full">{children}</span>
    </motion.button>
  );
}
