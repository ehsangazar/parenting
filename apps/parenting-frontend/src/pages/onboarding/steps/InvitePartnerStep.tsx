import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../../../components/icons/index.js';
import { uiIcons } from '../../../lib/iconSemantics.js';
import { DuoButton } from '../../../components/ui/DuoButton.js';

interface InvitePartnerStepProps {
  onNext: (email?: string) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export const InvitePartnerStep: React.FC<InvitePartnerStepProps> = ({ onNext, onBack, isSubmitting }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(email || undefined);
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner text-primary-700">
          <Icon name={uiIcons.heart} className="h-10 w-10 shrink-0 opacity-80" alt="" />
        </div>
        <h2 className="text-3xl font-bold text-text-primary mb-2">Invite your partner</h2>
        <p className="text-text-secondary">
          Parenting is a team effort. Invite your partner now so you can share the journey from day one.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="relative">
          <label className="block text-sm font-semibold text-text-primary mb-3">Partner&apos;s Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-tertiary">
              <Icon name={uiIcons.mail} className="h-5 w-5 opacity-60" alt="" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-5 py-4 bg-surface border-2 border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus transition-all placeholder:text-text-tertiary"
              placeholder="partner@example.com"
            />
          </div>
          <p className="mt-2 text-sm text-text-tertiary">
            We&apos;ll send them an invitation to join your family on Raised.
          </p>
        </div>

        <div className="flex gap-4 pt-6">
          <DuoButton type="button" variant="outline" onClick={onBack} className="flex-1 !min-h-[56px]">
            Back
          </DuoButton>
          <DuoButton
            type="submit"
            variant="green"
            className="flex-[2]"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : email ? 'Send Invite' : 'Skip for now'}
          </DuoButton>
        </div>
      </form>

      <div className="mt-12 p-6 bg-primary-50 rounded-2xl border border-primary-100 italic text-center">
        <p className="text-primary-fg text-sm">
          &ldquo;The best thing you can do for your children is to have a strong partnership.&rdquo;
        </p>
      </div>
    </div>
  );
};
