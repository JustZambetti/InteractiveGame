import { motion } from 'framer-motion';

interface GoToCurrentButtonProps {
  onClick: () => void;
}

export function GoToCurrentButton({ onClick }: GoToCurrentButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      aria-label="Go to current event"
      className="
        fixed top-20 right-4 z-30
        flex items-center gap-1.5
        px-3 py-2
        bg-[#1a1714]/90 border border-[#5c4a2a] rounded-lg
        font-serif text-xs text-[#c8b896]
        backdrop-blur-sm
        hover:border-[#a07820] hover:text-[#d4b87a]
        transition-colors duration-150
        shadow-[0_4px_16px_rgba(0,0,0,0.5)]
      "
    >
      current
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}
