import React, { useState } from 'react';
import { DuoButton } from '../../../components/ui/DuoButton.js';

interface GoalsStepProps {
  onFinish: (goals: string[]) => void;
  onBack: () => void;
  initialData?: string[];
  isSubmitting?: boolean;
}

export const GoalsStep: React.FC<GoalsStepProps> = ({ onFinish, onBack, initialData, isSubmitting }) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialData || []);

  const goals = [
    { id: 'sleep', label: 'Better Sleep', icon: '😴' },
    { id: 'nutrition', label: 'Healthy Eating', icon: '🥑' },
    { id: 'milestones', label: 'Milestones', icon: '📈' },
    { id: 'behavior', label: 'Positive Behavior', icon: '🌟' },
    { id: 'learning', label: 'Early Learning', icon: '📚' },
    { id: 'play', label: 'Creative Play', icon: '🎨' },
    { id: 'wellness', label: 'Self Care', icon: '🧘' },
    { id: 'community', label: 'Connect with Parents', icon: '🤝' },
  ];

  const toggleGoal = (id: string) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== id));
    } else {
      setSelectedGoals([...selectedGoals, id]);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-text-primary mb-2">What are your goals?</h2>
        <p className="text-text-secondary">Select topics you&apos;re most interested in.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        {goals.map((g) => {
          const isSelected = selectedGoals.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGoal(g.id)}
              className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
                  : 'border-border bg-surface hover:border-primary-200 shadow-sm'
              }`}
            >
              <span className="text-3xl">{g.icon}</span>
              <span className={`text-[15px] font-bold ${isSelected ? 'text-primary-fg' : 'text-text-primary'}`}>
                {g.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 pt-6">
        <DuoButton
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 !min-h-[56px]"
        >
          Back
        </DuoButton>
        <DuoButton
          variant="green"
          className="flex-1"
          loading={isSubmitting}
          disabled={isSubmitting}
          onClick={() => onFinish(selectedGoals)}
        >
          {isSubmitting ? 'Saving...' : 'Complete Setup'}
        </DuoButton>
      </div>

      <button
        type="button"
        onClick={() => onFinish([])}
        disabled={isSubmitting}
        className="w-full mt-4 text-text-tertiary hover:text-text-secondary transition-colors text-sm font-medium"
      >
        Skip for now
      </button>
    </div>
  );
};
