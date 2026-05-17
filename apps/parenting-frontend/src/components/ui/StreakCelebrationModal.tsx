import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { soundManager } from '../../lib/soundManager.js';

type StreakCelebrationModalProps = {
  streak: number;
  coinsBonus: number;
  onDismiss: () => void;
  // legacy props kept for backward compat
  xpBonus?: number;
  gemsBonus?: number;
};

const STREAK_TITLE_KEYS: Record<number, string> = {
  7: 'streakCelebration.title7',
  14: 'streakCelebration.title14',
  30: 'streakCelebration.title30',
  60: 'streakCelebration.title60',
  100: 'streakCelebration.title100',
};

export const StreakCelebrationModal = ({ streak, coinsBonus, onDismiss }: StreakCelebrationModalProps) => {
  const { t } = useTranslation();
  const titleKey = STREAK_TITLE_KEYS[streak];
  const title = titleKey ? t(titleKey) : t('streakCelebration.titleFallback', { count: streak });

  useEffect(() => {
    soundManager.play('streakMilestone');
    const t = setTimeout(() => soundManager.speakPhrase(`${streak} day streak! You're on fire!`), 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coinsLabel = coinsBonus >= 1000 ? `${(coinsBonus / 1000).toFixed(1)}k` : `${coinsBonus}`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[190] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      >
        <motion.div
          className="relative mx-4 w-full max-w-sm rounded-3xl border-2 border-orange-500/30 bg-surface p-8 text-center shadow-2xl"
          initial={{ scale: 0.7, y: 40 }}
          animate={{ scale: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-orange-400">
            {t('streakCelebration.milestone')}
          </div>

          <motion.div
            className="my-4 text-7xl"
            animate={{ scale: [1, 1.12, 1], rotate: [-4, 4, -4, 0] }}
            transition={{ duration: 0.8, repeat: 2, ease: 'easeInOut' }}
          >
            🔥
          </motion.div>

          <h2 className="mb-1 text-2xl font-black text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary">{t('streakCelebration.keepGoingMessage', { count: streak })}</p>

          {coinsBonus > 0 && (
            <div className="mt-4 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-4 py-1.5 text-sm font-bold text-amber-400">
                <Coins size={16} weight="fill" />
                {t('streakCelebration.coinsBonus', { amount: coinsLabel })}
              </span>
            </div>
          )}

          <button
            onClick={onDismiss}
            className="mt-6 w-full rounded-2xl bg-orange-500 py-3 text-base font-black uppercase tracking-wide text-white transition-transform active:scale-95"
          >
            {t('streakCelebration.keepGoing')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
