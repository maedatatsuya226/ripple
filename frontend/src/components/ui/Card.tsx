import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface CardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  glow?: 'blue' | 'pink' | 'purple' | 'none';
}

export function Card({ children, glow = 'none', className, ...props }: CardProps) {
  const glowClasses = {
    none: "",
    blue: "glow-blue border-neonBlue/30",
    pink: "glow-pink border-neonPink/30",
    purple: "border-neonPurple/30 shadow-[0_0_15px_rgba(176,38,255,0.4)] inset-shadow-[0_0_10px_rgba(176,38,255,0.1)]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={twMerge("glass-panel p-6 relative overflow-hidden", glowClasses[glow], className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
