import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DuoButton } from '../../../components/ui/DuoButton.js';

interface ProfileStepProps {
  onNext: (data: { name: string; role: string }) => void;
  onBack: () => void;
  initialData?: { name?: string; role?: string };
}

export const ProfileStep: React.FC<ProfileStepProps> = ({ onNext, onBack, initialData }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialData?.name || '');
  const [role, setRole] = useState(initialData?.role || '');

  const roles = [
    { id: 'mother', label: t('onboarding.roleMother'), icon: '👩' },
    { id: 'father', label: t('onboarding.roleFather'), icon: '👨' },
    { id: 'stepmother', label: t('onboarding.roleStepmother'), icon: '👩‍🦱' },
    { id: 'stepfather', label: t('onboarding.roleStepfather'), icon: '👨‍🦱' },
    { id: 'guardian', label: t('onboarding.roleGuardian'), icon: '👪' },
    { id: 'other', label: t('onboarding.roleOther'), icon: '👤' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && role) {
      onNext({ name, role });
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-text-primary mb-2">{t('onboarding.profileStepTitle')}</h2>
        <p className="text-text-secondary">{t('onboarding.profileStepSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-3">{t('onboarding.yourNameLabel')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-4 bg-surface border-2 border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus transition-all placeholder:text-text-tertiary"
            placeholder={t('onboarding.namePlaceholder')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-3">{t('onboarding.yourRoleLabel')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  role === r.id
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
                    : 'border-border bg-surface hover:border-primary-200'
                }`}
              >
                <span className="text-2xl">{r.icon}</span>
                <span className={`text-sm font-medium ${role === r.id ? 'text-primary-fg' : 'text-text-secondary'}`}>
                  {r.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <DuoButton type="button" variant="outline" onClick={onBack} className="flex-1 !min-h-[56px]">
            {t('common.back')}
          </DuoButton>
          <DuoButton type="submit" variant="green" disabled={!name || !role} className="flex-1">
            {t('common.continue')}
          </DuoButton>
        </div>

        <button
          type="button"
          onClick={() => onNext({ name: '', role: '' })}
          className="w-full text-text-tertiary hover:text-text-secondary transition-colors text-sm font-medium"
        >
          {t('onboarding.skip')}
        </button>
      </form>
    </div>
  );
};
