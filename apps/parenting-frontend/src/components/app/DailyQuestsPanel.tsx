import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gamificationApi } from '../../lib/appApi.js';

type QuestItem = {
  key: string;
  label: string;
  icon: string;
  current: number;
  target: number;
  xpReward: number;
  completed: boolean;
};

type DailyQuestsPanelProps = {
  className?: string;
};

export const DailyQuestsPanel = ({ className }: DailyQuestsPanelProps) => {
  const { t } = useTranslation();
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamificationApi.getQuests()
      .then((data) => setQuests(data.quests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={className}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 animate-pulse">
            <div className="mb-1.5 h-3 w-3/4 rounded bg-[#E8EDFF]" />
            <div className="h-1.5 rounded-full bg-[#E8EDFF]" />
          </div>
        ))}
      </div>
    );
  }

  const allDone = quests.length > 0 && quests.every((q) => q.completed);

  return (
    <div className={className}>
      {allDone && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-primary-500/10 px-3 py-2 text-xs font-bold text-primary-500">
          <span>🎉</span> {t('gamification.allQuestsComplete')}
        </div>
      )}

      <div className="space-y-3">
        {quests.map((q) => {
          const pct = q.target > 0 ? Math.min(100, Math.round((q.current / q.target) * 100)) : 0;
          return (
            <div key={q.key}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{q.icon}</span>
                  <span className={`text-xs font-semibold ${q.completed ? 'text-primary-500' : 'text-text-secondary'}`}>
                    {q.label}
                  </span>
                  {q.completed && <span className="text-xs text-primary-500">✓</span>}
                </div>
                <span className="text-[10px] tabular-nums text-text-tertiary">
                  {q.current}/{q.target}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EDFF]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${q.completed ? 'bg-primary-500' : 'bg-primary-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
