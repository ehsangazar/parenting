import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAnalytics } from '../lib/analytics';
import { api } from '../lib/api.js';
import { toast } from 'sonner';
import { LogoBrand } from '../components/ui/LogoBrand';
import { useNotificationStore } from '../state/notification.js';
import {
  ScaleQuestion,
  RadioQuestion,
  CheckboxQuestion,
  TextQuestion,
} from '../components/survey';

type SurveyResponses = Record<string, string | number | string[] | undefined>;

// Store audio blobs separately (not in localStorage - too large)
const audioRecordings = new Map<string, Blob>();

const STORAGE_KEY = 'raised-survey-responses';

function loadResponsesFromStorage(): SurveyResponses {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SurveyResponses;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveResponsesToStorage(responses: SurveyResponses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
  } catch {
    // ignore quota / private mode
  }
}

const PARTS = [
  { id: 'part1', title: 'Family Profile', icon: '👨‍👩‍👧‍👦' },
  { id: 'part2', title: 'Finding Parenting Answers', icon: '🔍' },
  { id: 'part3', title: 'Tools You Currently Use', icon: '📱' },
  { id: 'part4', title: 'Product Value & Features', icon: '⭐' },
  { id: 'part5', title: 'Development & Learning', icon: '📚' },
  { id: 'part6', title: 'Mission', icon: '💡' },
  { id: 'part7', title: 'Closing', icon: '✨' },
];

/** Required response keys per step. Many questions are optional so people can skip when they don't have an answer yet. */
const REQUIRED_BY_STEP: string[][] = [
  ['q1_familyStructure', 'q1_roleInHousehold', 'q2_children', 'q3_childAges'],
  ['q6_adviceSources'],
  ['q8_currentApps'],
  [],
  [],
  [],
  [],
];

function isFilled(
  key: string,
  value: string | number | string[] | undefined
): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function keyToLabel(key: string): string {
  const match = key.match(/^q(\d+)_/);
  return match ? match[1] : key;
}

function getFirstIncompleteStep(responses: SurveyResponses): number {
  for (let s = 0; s < REQUIRED_BY_STEP.length; s++) {
    const required = REQUIRED_BY_STEP[s] ?? [];
    const missing = required.some((key) => !isFilled(key, responses[key]));
    if (missing) return s;
  }
  return 0;
}

export const SurveyPage = () => {
  const navigate = useNavigate();
  const analytics = useAnalytics();
  const [searchParams, setSearchParams] = useSearchParams();
  const [responses, setResponses] = useState<SurveyResponses>(loadResponsesFromStorage);
  const [step, setStep] = useState(() => {
    const pageParam = searchParams.get('page');
    const num = pageParam ? parseInt(pageParam, 10) : 0;
    if (num >= 1 && num <= PARTS.length) return num - 1;
    return getFirstIncompleteStep(loadResponsesFromStorage());
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    saveResponsesToStorage(responses);
  }, [responses]);

  useEffect(() => {
    setSearchParams({ page: String(step + 1) }, { replace: true });
  }, [step, setSearchParams]);

  const pageParam = searchParams.get('page');
  useEffect(() => {
    const num = pageParam ? parseInt(pageParam, 10) : 0;
    if (num >= 1 && num <= PARTS.length) setStep(num - 1);
  }, [pageParam]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const set = (key: string, value: string | number | string[] | undefined) => {
    setResponses((r) => ({ ...r, [key]: value }));
  };

  const get = (key: string) => responses[key];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // If there are audio recordings, upload them first and get URLs
      const audioUrls: Record<string, string> = {};
      
      if (audioRecordings.size > 0) {
        for (const [key, blob] of audioRecordings.entries()) {
          try {
            const formData = new FormData();
            formData.append('file', blob, `${key}.webm`);
            
            // type is a query parameter, not form data
            const uploadRes = await api.post<{ url: string }>('/api/upload?type=survey-audio', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            
            audioUrls[key] = uploadRes.data.url;
          } catch (err) {
            console.error(`Failed to upload audio for ${key}:`, err);
            toast.error(`Failed to upload voice recording for ${key.replace('_audio', '')}`);
            // Continue with other uploads
          }
        }
      }

      // Submit survey with text responses + audio URLs
      await api.post('/api/surveys', { ...responses, ...audioUrls });

      analytics.capture('survey_completed', { steps_count: PARTS.length });
      localStorage.removeItem(STORAGE_KEY);
      audioRecordings.clear();


      useNotificationStore.getState().addNotification({
        type: 'success',
        title: 'Feedback Received',
        message: 'Your survey has been successfully submitted. Thank you for helping us grow!',
      });

      toast.success('Survey submitted! Thank you for your feedback.');
      navigate('/');
    } catch (error) {
      console.error('Survey submission error:', error);
      toast.error('Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const requiredKeys = REQUIRED_BY_STEP[step] ?? [];
  const missingKeys = requiredKeys.filter((key) => !isFilled(key, responses[key]));
  const missingLabels = missingKeys.map(keyToLabel);

  const next = () => {
    if (missingKeys.length > 0) {
      toast.error(`Please answer question${missingLabels.length === 1 ? '' : 's'} ${missingLabels.join(', ')} before continuing.`);
      return;
    }
    setStep((s) => Math.min(s + 1, PARTS.length));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const isLast = step === PARTS.length - 1;
  const progress = ((step + 1) / PARTS.length) * 100;

  const handleSubmitClick = () => {
    if (missingKeys.length > 0) {
      toast.error(`Please answer question${missingLabels.length === 1 ? '' : 's'} ${missingLabels.join(', ')} before submitting.`);
      return;
    }
    handleSubmit();
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Modern Header with Progress */}
      <nav className="bg-surface/80 backdrop-blur-lg border-b border-border-light sticky top-0 z-sticky">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <LogoBrand tagline="" size="compact" onClick={() => navigate('/')} />
            <div className="flex items-center gap-3">
              <span className="text-2xl">{PARTS[step].icon}</span>
              <span className="text-sm font-medium text-text-secondary">
                {step + 1} / {PARTS.length}
              </span>
            </div>
          </div>
          {/* Animated Progress Bar */}
          <div className="h-1 bg-border-light -mb-px">
            <div 
              className="h-full bg-primary-400 transition-all duration-slow ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </nav>

      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-w-0">
        {/* Hero Section */}
        <header className="mb-8 sm:mb-12 text-center min-w-0">
          <div className="inline-block mb-4 px-3 sm:px-4 py-1.5 bg-primary-50 rounded-full border border-primary-200">
            <span className="text-xs sm:text-sm font-medium text-primary-600">
              Survey · {PARTS[step].title}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary mb-4 leading-tight">
            The Future of Family
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto break-words">
            Your answers help us build tools that families actually need.
          </p>
        </header>

        {/* Question Card */}
        <div className="bg-surface rounded-2xl shadow-lg shadow-md border border-border-light p-4 sm:p-6 md:p-10 mb-8 transition-all duration-normal hover:shadow-xl min-w-0">
          <div className="flex items-center gap-3 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-border-light min-w-0">
            <span className="text-3xl sm:text-4xl flex-shrink-0">{PARTS[step].icon}</span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary truncate">{PARTS[step].title}</h2>
          </div>

          <div className="space-y-6 sm:space-y-8 min-w-0">
            {/* Part 1: Family Profile */}
            {step === 0 && (
              <>
                <RadioQuestion
                  label="1"
                  question="Which of the following best describes your family structure?"
                  options={[
                    'Two-parent household',
                    'Single-parent household',
                    'Co-parenting (parents live in separate households)',
                    'Guardian / Other'
                  ]}
                  value={get('q1_familyStructure') as string}
                  onChange={(val) => set('q1_familyStructure', val)}
                  otherOptionValue="Guardian / Other"
                  otherDescription={{
                    value: (get('q1_familyStructure_other') as string) ?? '',
                    onChange: (val) => set('q1_familyStructure_other', val),
                  }}
                />

                <RadioQuestion
                  label="1b"
                  question="What is your role in the household?"
                  options={[
                    'Mother',
                    'Father',
                    'Stepmother',
                    'Stepfather',
                    'Guardian',
                    'Other'
                  ]}
                  value={get('q1_roleInHousehold') as string}
                  onChange={(val) => set('q1_roleInHousehold', val)}
                  otherOptionValue="Other"
                  otherDescription={{
                    value: (get('q1_roleInHousehold_other') as string) ?? '',
                    onChange: (val) => set('q1_roleInHousehold_other', val),
                  }}
                />

                <RadioQuestion
                  label="2"
                  question="How many children do you have?"
                  options={['1', '2', '3 or more']}
                  value={get('q2_children') as string}
                  onChange={(val) => set('q2_children', val)}
                />

                <CheckboxQuestion
                  label="3"
                  question="Ages of your children (select all that apply)"
                  hint="Select all stages that apply to your family."
                  options={[
                    'Pregnancy',
                    '0–12 months',
                    '1–3 years',
                    '4–5 years',
                    '6–12 years',
                    '13–18 years',
                    '18+ years'
                  ]}
                  value={(get('q3_childAges') as string[]) || []}
                  onChange={(val) => set('q3_childAges', val)}
                />
              </>
            )}

            {/* Part 2: Finding Parenting Answers */}
            {step === 1 && (
              <>
                <ScaleQuestion
                  label="4"
                  question="When you have a worrying parenting question, how difficult is it to find an answer you trust?"
                  lowLabel="Very easy / I have a trusted source"
                  highLabel="Extremely difficult or stressful"
                  value={get('q4_trustDifficulty') as number}
                  onChange={(val) => set('q4_trustDifficulty', val)}
                />

                <ScaleQuestion
                  label="5"
                  question="How often do you feel overwhelmed by conflicting parenting advice?"
                  lowLabel="Never / Rarely"
                  highLabel="All the time"
                  value={get('q5_overwhelmed') as number}
                  onChange={(val) => set('q5_overwhelmed', val)}
                />

                <CheckboxQuestion
                  label="6"
                  question="Where do you currently go for parenting advice? (Select all that apply)"
                  options={[
                    'Google / Web search',
                    'Parenting apps or sites (e.g., Common Sense Media, Understood, BabyCenter)',
                    'Social media (Facebook groups, Instagram, TikTok)',
                    'Friends or family',
                    'Other parents from nursery, school, local community',
                    'Pediatrician / Healthcare provider',
                    'Books or blogs',
                    'Other'
                  ]}
                  value={(get('q6_adviceSources') as string[]) || []}
                  onChange={(val) => set('q6_adviceSources', val)}
                  otherDescription={{
                    value: (get('q6_adviceSources_other') as string) ?? '',
                    onChange: (val) => set('q6_adviceSources_other', val),
                  }}
                />

                <TextQuestion
                  label="7"
                  question="What's the most frustrating part of finding parenting advice online?"
                  value={(get('q7_frustration') as string) || ''}
                  onChange={(val) => set('q7_frustration', val)}
                  multiline
                  rows={4}
                  placeholder="Share your experience..."
                  enableVoiceRecording
                  onVoiceRecording={(blob) => {
                    if (blob) audioRecordings.set('q7_frustration_audio', blob);
                    else audioRecordings.delete('q7_frustration_audio');
                  }}
                />
              </>
            )}

            {/* Part 3: Tools You Currently Use */}
            {step === 2 && (
              <>
                <CheckboxQuestion
                  label="8"
                  question="Which of the following parenting-related apps or tools do you currently use? (Select all that apply)"
                  options={[
                    'Feeding, sleep, or diaper tracker',
                    'Milestone or development tracker',
                    'Pregnancy tracker',
                    'Parenting community / forum app',
                    'Educational or learning apps for kids',
                    'Family calendar / organizer',
                    'None',
                    'Other'
                  ]}
                  value={(get('q8_currentApps') as string[]) || []}
                  onChange={(val) => set('q8_currentApps', val)}
                  otherDescription={{
                    value: (get('q8_currentApps_other') as string) ?? '',
                    onChange: (val) => set('q8_currentApps_other', val),
                  }}
                />

                {!(get('q8_currentApps') as string[])?.includes('None') && (
                  <ScaleQuestion
                    label="9"
                    question="How satisfied are you with the parenting apps you currently use?"
                    lowLabel="Not satisfied at all"
                    highLabel="Very satisfied"
                    value={get('q9_appSatisfaction') as number}
                    onChange={(val) => set('q9_appSatisfaction', val)}
                  />
                )}

                {!(get('q8_currentApps') as string[])?.includes('None') && (
                  <TextQuestion
                    label="10"
                    question="What's missing from the parenting apps you've tried?"
                    value={(get('q10_appsMissing') as string) || ''}
                    onChange={(val) => set('q10_appsMissing', val)}
                    multiline
                    rows={4}
                    placeholder="Tell us what you wish existed..."
                    enableVoiceRecording
                    onVoiceRecording={(blob) => {
                      if (blob) audioRecordings.set('q10_appsMissing_audio', blob);
                      else audioRecordings.delete('q10_appsMissing_audio');
                    }}
                  />
                )}
              </>
            )}

            {/* Part 4: Product Value & Features */}
            {step === 3 && (
              <>
                <ScaleQuestion
                  label="11"
                  question="How valuable would a unified app be that combines tracking, advice, and community in one place?"
                  lowLabel="Not valuable"
                  highLabel="Extremely valuable"
                  value={get('q11_unifiedValue') as number}
                  onChange={(val) => set('q11_unifiedValue', val)}
                />

                <ScaleQuestion
                  label="12"
                  question="How important is it that the app grows with your child (from pregnancy through school age and beyond)?"
                  lowLabel="Not important"
                  highLabel="Very important"
                  value={get('q12_modularity') as number}
                  onChange={(val) => set('q12_modularity', val)}
                />

                <ScaleQuestion
                  label="13"
                  question="How interested would you be in an audio/video logging feature (voice or video notes for memories, milestones, or questions)?"
                  lowLabel="Not interested"
                  highLabel="Very interested"
                  value={get('q13_audioLogging') as number}
                  onChange={(val) => set('q13_audioLogging', val)}
                />

                <CheckboxQuestion
                  label="14"
                  question="Which features would be most valuable to you? (Select your top 3)"
                  options={[
                    'Personalized, evidence-based answers to parenting questions',
                    'Milestone tracking with developmental insights',
                    'Community of parents with children of similar ages',
                    'Expert-reviewed content (pediatricians, child psychologists)',
                    "Daily tips tailored to my child's age",
                    'Family calendar and task management',
                    'Audio/video journaling for memories',
                    'None / No specific features',
                    'Other'
                  ]}
                  value={(get('q14_topFeatures') as string[]) || []}
                  onChange={(val) => set('q14_topFeatures', val)}
                  otherDescription={{
                    value: (get('q14_topFeatures_other') as string) ?? '',
                    onChange: (val) => set('q14_topFeatures_other', val),
                  }}
                />
              </>
            )}

            {/* Part 5: Development & Learning */}
            {step === 4 && (
              <>
                <ScaleQuestion
                  label="15"
                  question="How concerned are you about your child's developmental milestones?"
                  lowLabel="Not concerned"
                  highLabel="Very concerned"
                  value={get('q15_milestoneConcern') as number}
                  onChange={(val) => set('q15_milestoneConcern', val)}
                />

                <RadioQuestion
                  label="16"
                  question="How often do you look up information about child development?"
                  options={[
                    'Daily',
                    'A few times a week',
                    'Once a week',
                    'A few times a month',
                    'Rarely'
                  ]}
                  value={get('q16_developmentFrequency') as string}
                  onChange={(val) => set('q16_developmentFrequency', val)}
                />

                <CheckboxQuestion
                  label="17"
                  question="What topics do you research most? (Select all that apply)"
                  options={[
                    'Education and learning activities',
                    'Social and emotional development',
                    'Behavior and discipline',
                    'Developmental milestones',
                    'Health and safety',
                    'Screen time / digital wellness',
                    'Sleep',
                    'Feeding / Nutrition',
                    'Other'
                  ]}
                  value={(get('q17_researchTopics') as string[]) || []}
                  onChange={(val) => set('q17_researchTopics', val)}
                  otherDescription={{
                    value: (get('q17_researchTopics_other') as string) ?? '',
                    onChange: (val) => set('q17_researchTopics_other', val),
                  }}
                />
              </>
            )}

            {/* Part 6: Mission */}
            {step === 5 && (
              <>
                <ScaleQuestion
                  label="18"
                  question="How important is it that the app is built by parents, for parents?"
                  lowLabel="Not important"
                  highLabel="Very important"
                  value={get('q20_parentBuilt') as number}
                  onChange={(val) => set('q20_parentBuilt', val)}
                />
              </>
            )}

            {/* Part 7: Closing */}
            {step === 6 && (
              <>
                <TextQuestion
                  label="21"
                  question="If you could ask one question to a parenting expert right now, what would it be?"
                  value={(get('q21_expertQuestion') as string) || ''}
                  onChange={(val) => set('q21_expertQuestion', val)}
                  multiline
                  rows={4}
                  placeholder="Your question..."
                  enableVoiceRecording
                  onVoiceRecording={(blob) => {
                    if (blob) audioRecordings.set('q21_expertQuestion_audio', blob);
                    else audioRecordings.delete('q21_expertQuestion_audio');
                  }}
                />

                <TextQuestion
                  label="22"
                  question="Any other thoughts, ideas, or feedback you'd like to share?"
                  value={(get('q22_additionalFeedback') as string) || ''}
                  onChange={(val) => set('q22_additionalFeedback', val)}
                  multiline
                  rows={4}
                  placeholder="We'd love to hear from you..."
                  enableVoiceRecording
                  onVoiceRecording={(blob) => {
                    if (blob) audioRecordings.set('q22_additionalFeedback_audio', blob);
                    else audioRecordings.delete('q22_additionalFeedback_audio');
                  }}
                />

                <TextQuestion
                  label="23"
                  question="Email (optional - if you'd like early access or updates)"
                  value={(get('q23_email') as string) || ''}
                  onChange={(val) => set('q23_email', val)}
                  placeholder="your@email.com"
                />

                <TextQuestion
                  label="24"
                  question="Know other parents who might want to share their input? Share their emails or a parent group/community (optional)"
                  value={(get('q24_referrals') as string) || ''}
                  onChange={(val) => set('q24_referrals', val)}
                  multiline
                  rows={3}
                  placeholder="friend@example.com, Parent WhatsApp group, School parent community..."
                  hint="Help us reach more parents to build something that truly serves families."
                />
              </>
            )}
          </div>
        </div>

        {/* Required-fields message */}
        {missingKeys.length > 0 && (
          <div className="mb-6 p-3 sm:p-4 rounded-xl bg-primary-50 border-2 border-primary-200 flex items-start gap-3 min-w-0">
            <span className="text-xl sm:text-2xl flex-shrink-0" aria-hidden>📋</span>
            <div className="min-w-0">
              <p className="font-semibold text-text-primary text-sm sm:text-base break-words">
                Please answer all questions on this page before continuing.
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mt-1 break-words">
                Missing: question{missingLabels.length === 1 ? '' : 's'} {missingLabels.join(', ')}.
              </p>
            </div>
          </div>
        )}

        {/* Modern Navigation */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-8 sm:pt-10 mt-8 sm:mt-10 border-t-2 border-border-light">
          <button 
            type="button" 
            onClick={prev} 
            disabled={step === 0} 
            className="btn-duo-outline-sm group flex items-center justify-center gap-2 !px-4 sm:!px-6 disabled:cursor-not-allowed disabled:opacity-40 !text-sm sm:!text-base !font-semibold !normal-case !tracking-normal"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          {!isLast ? (
            <button 
              type="button" 
              onClick={next} 
              className="btn-duo-green group flex items-center justify-center gap-2 !min-h-12 !rounded-xl !px-6 sm:!px-8 !py-3 sm:!py-3.5 !text-sm sm:!text-base !font-semibold hover:scale-105"
            >
              Next
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmitClick} 
              disabled={submitting} 
              className="btn-duo-green flex items-center justify-center gap-2 !min-h-12 !rounded-xl !px-6 sm:!px-8 !py-3 sm:!py-3.5 !text-sm sm:!text-base disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit Survey
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};
