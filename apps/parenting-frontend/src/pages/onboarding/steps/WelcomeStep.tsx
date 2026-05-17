import React from 'react';
import { motion } from 'framer-motion';
import { DuoButton } from '../../../components/ui/DuoButton.js';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-48 h-48 mx-auto mb-6 overflow-hidden rounded-3xl shadow-lg">
          <img
            src="/images/onboarding-welcome.png"
            alt="Welcome to Raised"
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4 tracking-tight">
          Welcome to <span className="text-primary-700">Raised</span>
        </h1>
        <p className="text-xl text-text-secondary leading-relaxed">
          The science-backed parenting partner that grows with your family.
          Let&apos;s get your profile set up so we can give you the best experience.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full"
      >
        {[
          { icon: '🧬', title: 'Science-Backed', desc: 'Advice you can trust' },
          { icon: '📱', title: 'Personalized', desc: 'Tailored to your child' },
          { icon: '💗', title: 'Supportive', desc: 'Expert guidance 24/7' }
        ].map((feat, i) => (
          <div key={i} className="bg-surface p-6 rounded-2xl border-2 border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{feat.icon}</div>
            <h3 className="font-bold text-text-primary mb-1">{feat.title}</h3>
            <p className="text-sm text-text-secondary">{feat.desc}</p>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <DuoButton
          variant="green"
          onClick={onNext}
          className="px-10 !text-lg !normal-case !tracking-normal hover:scale-105"
        >
          Get Started
        </DuoButton>
      </motion.div>
    </div>
  );
};
