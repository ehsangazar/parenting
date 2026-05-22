import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Icon } from '../icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { soundManager } from '../../lib/soundManager.js';
import { RoughBox, RoughButton, RoughHighlight } from '../rough/index.js';

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
          initial={{ scale: 0.7, y: 40 }}
          animate={{ scale: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-4 w-full max-w-sm"
        >
          <RoughBox
            stroke="#D77548"
            fill="#FFFFFF"
            strokeWidth={2.4}
            radius={24}
            roughness={1.8}
            seedKey={`streak-modal-${streak}`}
            className="p-8 text-center shadow-2xl"
          >
            <div className="celebrate-eyebrow mb-2">
              {t('streakCelebration.milestone')}
            </div>

            <motion.div
              className="my-4 text-7xl"
              animate={{ scale: [1, 1.12, 1], rotate: [-4, 4, -4, 0] }}
              transition={{ duration: 0.8, repeat: 2, ease: 'easeInOut' }}
            >
              🔥
            </motion.div>

            <h2 className="celebrate-headline mb-1 text-2xl">
              <RoughHighlight
                type="circle"
                color="#D77548"
                strokeWidth={2.2}
                padding={[6, 12]}
                animationDuration={900}
                delay={500}
                redrawKey={streak}
              >
                {title}
              </RoughHighlight>
            </h2>
            <p className="text-sm text-text-secondary">{t('streakCelebration.keepGoingMessage', { count: streak })}</p>

            {coinsBonus > 0 && (
              <div className="mt-4 flex justify-center">
                <RoughBox
                  stroke="#D77548"
                  fill="rgba(215, 117, 72, 0.10)"
                  strokeWidth={1.4}
                  radius={9999}
                  roughness={1.2}
                  seedKey={`streak-coins-${coinsBonus}`}
                  className="inline-flex items-center px-4 py-1.5 text-sm font-bold"
                  style={{ color: '#D77548' }}
                  innerClassName="inline-flex items-center gap-1.5"
                >
                  <Icon name={appAssetIcons.gems} className="h-4 w-4 object-contain" alt="" />
                  {t('streakCelebration.coinsBonus', { amount: coinsLabel })}
                </RoughBox>
              </div>
            )}

            <div className="mt-6">
              <RoughButton
                variant="peach"
                fullWidth
                onClick={onDismiss}
                seedKey={`streak-cta-${streak}`}
              >
                {t('streakCelebration.keepGoing')}
              </RoughButton>
            </div>
          </RoughBox>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
