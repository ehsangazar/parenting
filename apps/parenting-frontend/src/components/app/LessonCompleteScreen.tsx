import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { soundManager } from '../../lib/soundManager.js';

type LessonCompleteScreenProps = {
  coinsAwarded: number;
  onContinue: () => void;
  // legacy props kept for callers that haven't been updated yet
  xpAwarded?: number;
  gemsAwarded?: number;
  xpBefore?: number;
  leveledUp?: boolean;
  newAchievements?: unknown[];
};

export const LessonCompleteScreen = ({ coinsAwarded, xpAwarded, onContinue }: LessonCompleteScreenProps) => {
  const { t } = useTranslation();
  const awarded = coinsAwarded || xpAwarded || 0;

  useEffect(() => {
    soundManager.play('lessonComplete');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coinsLabel = awarded >= 1000
    ? `${(awarded / 1000).toFixed(1)}k`
    : `+${awarded}`;

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-[#F8F9FE]/95 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-6 text-center">
        {/* Coin burst */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 280, damping: 18, delay: 0.1 } }}
        >
          <Coins size={80} weight="fill" className="text-amber-400" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-black text-text-primary">{t('learning.lessonComplete')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('learning.lessonCompleteSubtitle')}</p>
        </div>

        {/* Coins awarded */}
        <motion.div
          className="flex items-center gap-2 rounded-2xl bg-amber-50 px-6 py-4 border border-amber-200"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
        >
          <Coins size={28} weight="fill" className="text-amber-400" />
          <span className="text-2xl font-black text-amber-500">{coinsLabel}</span>
          <span className="text-base font-semibold text-amber-600">{t('learning.coinsEarned')}</span>
        </motion.div>
      </div>

      {/* Continue button */}
      <motion.button
        onClick={onContinue}
        className="absolute bottom-8 w-[calc(100%-3rem)] max-w-sm rounded-2xl bg-primary-500 py-4 text-base font-black uppercase tracking-wide text-text-inverse shadow-lg transition-transform active:scale-95"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.45 } }}
      >
        {t('learning.continue')}
      </motion.button>
    </motion.div>
  );
};
