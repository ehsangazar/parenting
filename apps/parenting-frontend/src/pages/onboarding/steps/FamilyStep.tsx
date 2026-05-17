import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { DuoButton } from '../../../components/ui/DuoButton.js';

interface Child {
  id: string;
  name: string;
  birthday: string;
}

interface FamilyStepProps {
  onNext: (children: Omit<Child, 'id'>[]) => void;
  onBack: () => void;
  initialData?: Omit<Child, 'id'>[];
}

export const FamilyStep: React.FC<FamilyStepProps> = ({ onNext, onBack, initialData }) => {
  const { t } = useTranslation();
  const [children, setChildren] = useState<Omit<Child, 'id'>[]>(initialData || []);
  const [newName, setNewName] = useState('');
  const [newBirthday, setNewBirthday] = useState('');

  const addChild = () => {
    if (newName.trim()) {
      setChildren([...children, { name: newName.trim(), birthday: newBirthday }]);
      setNewName('');
      setNewBirthday('');
    }
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(children);
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-text-primary mb-2">{t('onboarding.familyStepTitle')}</h2>
        <p className="text-text-secondary">{t('onboarding.familyStepSubtitle')}</p>
      </div>

      <div className="space-y-6 mb-10">
        <AnimatePresence mode="popLayout">
          {children.map((child, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-4 p-4 bg-primary-50 rounded-2xl border border-primary-100 group"
            >
              <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center shadow-sm border border-border">
                <Icon name={uiIcons.baby} className="h-7 w-7" alt="" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-text-primary">{child.name}</p>
                <p className="text-sm text-text-secondary">
                  {child.birthday ? new Date(child.birthday).toLocaleDateString() : t('onboarding.noBirthdaySet')}
                </p>
              </div>
              <button
                onClick={() => removeChild(index)}
                className="p-2 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
              >
                <Icon name={uiIcons.trash} className="h-[18px] w-[18px]" alt="" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="bg-surface p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary-300 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-text-tertiary uppercase mb-1 ml-1">{t('onboarding.nameLabel')}</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-border-light rounded-xl focus:outline-none focus:border-primary-400"
                placeholder={t('onboarding.childName')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-tertiary uppercase mb-1 ml-1">{t('onboarding.birthdayDueDateLabel')}</label>
              <input
                type="date"
                value={newBirthday}
                onChange={(e) => setNewBirthday(e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-border-light rounded-xl focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={addChild}
            disabled={!newName.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-50 text-primary-fg rounded-xl font-bold hover:bg-primary-100 disabled:opacity-50 transition-colors"
          >
            <Icon name={uiIcons.plus} className="h-5 w-5" alt="" />
            {t('onboarding.addChildButton')}
          </button>
        </div>
      </div>

      <div className="flex gap-4 pt-6">
        <DuoButton type="button" variant="outline" onClick={onBack} className="flex-1 !min-h-[56px]">
          {t('common.back')}
        </DuoButton>
        <DuoButton variant="green" onClick={handleSubmit} className="flex-1">
          {children.length > 0 ? t('common.continue') : t('onboarding.skip')}
        </DuoButton>
      </div>
    </div>
  );
};
