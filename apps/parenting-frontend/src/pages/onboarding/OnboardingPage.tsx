import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppBase } from '../../hooks/useAppBase.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '../../lib/api.js';
import { familiesApi } from '../../lib/appApi.js';
import { useAuth } from '../../state/auth.js';
import { WelcomeStep } from './steps/WelcomeStep';
import { ProfileStep } from './steps/ProfileStep';
import { FamilyStep } from './steps/FamilyStep';
import { InvitePartnerStep } from './steps/InvitePartnerStep';
import { GoalsStep } from './steps/GoalsStep';
import { LogoBrand } from '../../components/ui/LogoBrand';

type Step = 'welcome' | 'profile' | 'family' | 'invite' | 'goals';

export const OnboardingPage = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('welcome');
  const [profileData, setProfileData] = useState<{ name: string; role: string } | null>(null);
  const [familyData, setFamilyData] = useState<{ name: string; birthday: string }[]>([]);
  const [partnerEmail, setPartnerEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { toApp } = useAppBase();

  const handleProfileNext = (data: { name: string; role: string }) => {
    setProfileData(data);
    setStep('family');
  };

  const handleFamilyNext = (data: { name: string; birthday: string }[]) => {
    setFamilyData(data);
    setStep('invite');
  };

  const handleInviteNext = (email?: string) => {
    if (email) setPartnerEmail(email);
    setStep('goals');
  };

  const handleFinish = async (goals: string[]) => {
    setIsSubmitting(true);
    try {
      // 1. Update user profile
      const profileUpdate = await api.put('/api/auth/me', {
        name: profileData?.name,
        roleInHousehold: profileData?.role,
        interests: goals,
        onboarded: true
      });

      setUser(profileUpdate.data.user);

      // 2. Add children to default family if any
      // Assuming user has at least one family created by default on signup
      await api.get('/api/auth/me'); // Get full user info including families if needed
      // Actually we need the active family. 
      // For simplicity, let's try to add to the first family we find for this user
      const familiesRes = await familiesApi.list();
      const defaultFamily = familiesRes.families?.[0];

      if (defaultFamily && familyData.length > 0) {
        for (const child of familyData) {
          await familiesApi.addChild(defaultFamily.id, {
            name: child.name,
            birthday: child.birthday || undefined
          });
        }
      }

      // 3. Invite partner if any
      if (defaultFamily && partnerEmail) {
        await familiesApi.inviteMember(defaultFamily.id, partnerEmail);
      }

      toast.success(t('onboarding.toastComplete'));
      navigate(toApp('/app'));
    } catch (err) {
      toast.error(t('onboarding.toastError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 md:p-8 flex justify-between items-center bg-surface/95 border-b-2 border-border backdrop-blur-md sticky top-0 z-10">
        <LogoBrand tagline="" size="compact" />
        <div className="flex gap-2">
          {['welcome', 'profile', 'family', 'invite', 'goals'].map((s, i) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                ['welcome', 'profile', 'family', 'invite', 'goals'].indexOf(step) >= i
                  ? 'bg-primary-500'
                  : 'bg-primary-100'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {step === 'welcome' && <WelcomeStep onNext={() => setStep('profile')} />}
            {step === 'profile' && (
              <ProfileStep
                onNext={handleProfileNext}
                onBack={() => setStep('welcome')}
                initialData={profileData || undefined}
              />
            )}
            {step === 'family' && (
              <FamilyStep
                onNext={handleFamilyNext}
                onBack={() => setStep('profile')}
                initialData={familyData}
              />
            )}
            {step === 'invite' && (
              <InvitePartnerStep
                onNext={handleInviteNext}
                onBack={() => setStep('family')}
              />
            )}
            {step === 'goals' && (
              <GoalsStep
                onFinish={handleFinish}
                onBack={() => setStep('invite')}
                isSubmitting={isSubmitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="p-8 text-center text-text-tertiary text-sm">
        &copy; {new Date().getFullYear()} Raised. All family data is encrypted and secure.
      </footer>
    </div>
  );
};
