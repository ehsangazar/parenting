import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Icon } from '../icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { soundManager } from '../../lib/soundManager.js';
import { RoughBox, RoughButton, RoughHighlight } from '../rough/index.js';

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
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 280, damping: 18, delay: 0.1 } }}
        >
          <Icon name={appAssetIcons.gems} className="h-20 w-20 object-contain" alt="" />
        </motion.div>

        <div>
          <h2 className="celebrate-headline text-2xl">
            <RoughHighlight
              type="underline"
              color="#2F7D6A"
              strokeWidth={2.4}
              padding={[2, 4]}
              animationDuration={750}
              delay={350}
            >
              {t('learning.lessonComplete')}
            </RoughHighlight>
          </h2>
          <p className="mt-1 text-sm text-text-secondary">{t('learning.lessonCompleteSubtitle')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
        >
          <RoughBox
            stroke="#D87749"
            fill="rgba(216, 119, 73, 0.10)"
            strokeWidth={1.6}
            radius={18}
            roughness={1.5}
            seedKey={`lesson-coin-chip-${awarded}`}
            className="px-6 py-4"
            innerClassName="flex items-center gap-2"
          >
            <Icon name={appAssetIcons.gems} className="h-7 w-7 object-contain" alt="" />
            <span className="celebrate-stat text-2xl text-secondary-500">{coinsLabel}</span>
            <span className="text-base font-semibold text-secondary-fg">{t('learning.coinsEarned')}</span>
          </RoughBox>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 w-[calc(100%-3rem)] max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.45 } }}
      >
        <RoughButton variant="sage" fullWidth onClick={onContinue} seedKey="lesson-continue">
          {t('learning.continue')}
        </RoughButton>
      </motion.div>
    </motion.div>
  );
};
