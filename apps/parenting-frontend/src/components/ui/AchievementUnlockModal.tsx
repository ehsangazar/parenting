import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../../lib/soundManager.js';

export type Achievement = {
  key: string;
  title: string;
  icon: string;
  xpReward: number;
  gemsReward: number;
};

type AchievementUnlockModalProps = {
  achievements: Achievement[];
  onDismiss: () => void;
};

export const AchievementUnlockModal = ({ achievements, onDismiss }: AchievementUnlockModalProps) => {
  const [index, setIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = achievements[index];

  useEffect(() => {
    soundManager.play('achievementUnlock');
    const t = setTimeout(() => soundManager.speakPhrase('Achievement unlocked!'), 400);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    if (!current) return;
    // Simple CSS confetti burst via canvas, no dep needed
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 14,
      vy: -(Math.random() * 10 + 4),
      // Confetti hex literals must stay inline (canvas API), but the palette
      // is the Garden Morning brand inks: sage, energy peach, dusty rose, sky blue, lilac.
      color: ['#2F7D6A', '#E89163', '#D88BA0', '#4A8AB4', '#9B7BBE'][Math.floor(Math.random() * 5)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      alpha: 1,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.rotation += p.rotationSpeed;
        p.alpha -= 0.012;
        if (p.alpha <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [index, current]);

  const handleNext = () => {
    if (index < achievements.length - 1) {
      setIndex(index + 1);
    } else {
      onDismiss();
    }
  };

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={current.key}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleNext}
      >
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />

        <motion.div
          className="relative mx-4 w-full max-w-sm rounded-3xl border-2 border-primary-500/35 bg-surface p-8 text-center shadow-2xl"
          initial={{ scale: 0.7, y: 40 }}
          animate={{ scale: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {achievements.length > 1 && (
            <div className="mb-3 flex justify-center gap-1">
              {achievements.map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full ${i === index ? 'bg-primary-500' : 'bg-card-border'}`} />
              ))}
            </div>
          )}

          <div className="celebrate-eyebrow mb-2">
            Achievement Unlocked!
          </div>

          <motion.div
            className="my-4 text-7xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1, transition: { delay: 0.15, type: 'spring', stiffness: 300, damping: 15 } }}
          >
            {current.icon}
          </motion.div>

          <h2 className="celebrate-headline mb-1 text-2xl">{current.title}</h2>

          <div className="mt-3 flex justify-center gap-3">
            {current.xpReward > 0 && (
              <span className="rounded-full bg-gamification-xp/10 px-3 py-1 text-sm font-bold text-gamification-xp">
                +{current.xpReward} XP
              </span>
            )}
            {current.gemsReward > 0 && (
              <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-sm font-bold text-brand-blue">
                +{current.gemsReward} 💎
              </span>
            )}
          </div>

          <button
            onClick={handleNext}
            className="btn-duo-green mt-6 w-full"
          >
            {index < achievements.length - 1 ? 'Next' : 'Awesome!'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
