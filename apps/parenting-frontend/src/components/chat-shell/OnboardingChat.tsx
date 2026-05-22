import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { usePostHog } from '@posthog/react';
import { api } from '../../lib/api.js';
import { familiesApi } from '../../lib/appApi.js';
import { useAuth } from '../../state/auth.js';
import { useAppContext } from '../app/AppContext.js';
import { RoughBox } from '../rough/index.js';

type Step = 'name' | 'role' | 'kids' | 'concerns' | 'partner' | 'suggestions';

type Kid = { name: string; ageLabel: string; ageYears: number };

const STEP_ORDER: Step[] = ['name', 'role', 'kids', 'concerns', 'partner', 'suggestions'];

type OnboardingChatProps = {
  onComplete: (firstQuestion?: string) => void;
};

export const OnboardingChat = ({ onComplete }: OnboardingChatProps) => {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const { refreshFamilies, setActiveFamilyId } = useAppContext();
  const posthog = usePostHog();

  useEffect(() => {
    posthog.capture('onboarding_started');
  }, [posthog]);

  const ROLES = useMemo(
    () => [
      { id: 'mom', label: t('onboardingChat.roles.mom', 'Mom') },
      { id: 'dad', label: t('onboardingChat.roles.dad', 'Dad') },
      { id: 'step', label: t('onboardingChat.roles.stepParent', 'Step-parent') },
      { id: 'grandparent', label: t('onboardingChat.roles.grandparent', 'Grandparent') },
      { id: 'caregiver', label: t('onboardingChat.roles.caregiver', 'Caregiver') },
      { id: 'other', label: t('onboardingChat.roles.other', 'Other') },
    ],
    [t],
  );

  const AGE_OPTIONS = useMemo(
    () => [
      { label: t('onboardingChat.age.expecting', 'Expecting'), years: -0.5 },
      { label: t('onboardingChat.age.under1', 'Under 1'), years: 0.5 },
      ...Array.from({ length: 18 }, (_, i) => ({
        label: t('onboardingChat.age.years', '{{count}} years', { count: i + 1 }),
        years: i + 1,
      })),
    ],
    [t],
  );

  const CONCERNS = useMemo(
    () => [
      { id: 'sleep', label: t('onboardingChat.concerns.sleep', 'Sleep') },
      { id: 'behavior', label: t('onboardingChat.concerns.tantrums', 'Tantrums') },
      { id: 'screens', label: t('onboardingChat.concerns.screens', 'Screens') },
      { id: 'milestones', label: t('onboardingChat.concerns.milestones', 'Milestones') },
      { id: 'school', label: t('onboardingChat.concerns.school', 'School') },
      { id: 'wellness', label: t('onboardingChat.concerns.stress', 'My stress') },
    ],
    [t],
  );

  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [role, setRole] = useState<{ id: string; label: string } | null>(null);
  const [kids, setKids] = useState<Kid[]>([]);
  const [newKidName, setNewKidName] = useState('');
  const [newKidAge, setNewKidAge] = useState(AGE_OPTIONS[1].label);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [step, kids.length, concerns.length]);

  const isPast = (s: Step) => STEP_ORDER.indexOf(step) > STEP_ORDER.indexOf(s);

  const advance = (next: Step) => {
    posthog.capture('onboarding_step_completed', {
      from_step: step,
      to_step: next,
    });
    setStep(next);
  };

  const addKid = () => {
    const trimmed = newKidName.trim();
    if (!trimmed) return;
    const option = AGE_OPTIONS.find((o) => o.label === newKidAge) ?? AGE_OPTIONS[1];
    setKids((prev) => [...prev, { name: trimmed, ageLabel: option.label, ageYears: option.years }]);
    setNewKidName('');
  };

  const removeKid = (idx: number) => {
    setKids((prev) => prev.filter((_, i) => i !== idx));
  };

  const persistAndComplete = async (firstQuestion?: string) => {
    if (saving) return;
    setSaving(true);
    try {
      if (firstQuestion) {
        localStorage.setItem('pendingChatMessage', firstQuestion);
      }

      const profileRes = await api.put('/api/identity/me', {
        name: name.trim() || undefined,
        roleInHousehold: role?.label || undefined,
        interests: concerns,
        onboarded: true,
      });
      setUser(profileRes.data.user);

      const familiesRes = await familiesApi.list();
      let family = familiesRes.families?.[0] ?? familiesRes?.[0];

      if (!family && kids.length > 0) {
        const created = await familiesApi.create(
          name.trim() ? `${name.trim()}'s family` : t('onboardingChat.defaultFamilyName', 'My family'),
        );
        family = created.family ?? created;
      }

      if (family && kids.length > 0) {
        for (const kid of kids) {
          const birthday = ageYearsToBirthdayIso(kid.ageYears);
          await familiesApi.addChild(family.id, {
            name: kid.name,
            ...(birthday ? { birthday } : {}),
          });
        }
      }

      if (family && partnerEmail.trim()) {
        try {
          await familiesApi.inviteMember(family.id, partnerEmail.trim());
        } catch {
          toast.message(
            t('onboardingChat.partnerInviteFailed', "We saved everything else, but couldn't send the partner invite. Try again from Settings."),
          );
        }
      }

      // Without this, ChatShell's families list is still the empty snapshot
      // from initial load, so ChatPanel can't find an activeFamily and the
      // child chips don't appear until a manual refresh.
      if (family) {
        setActiveFamilyId(family.id);
        await refreshFamilies();
      }

      // Person-level properties so funnels and cohorts can filter on these.
      // Never send names; only counts and age buckets.
      posthog.setPersonProperties({
        role_in_household: role?.id ?? null,
        kids_count: kids.length,
        kids_age_buckets: kids.map((k) => ageBucket(k.ageYears)),
        top_concerns: concerns,
        partner_invited: !!partnerEmail.trim(),
      });
      posthog.capture('onboarding_completed', {
        kids_count: kids.length,
        concerns_count: concerns.length,
        partner_invited: !!partnerEmail.trim(),
        with_first_question: !!firstQuestion,
      });

      onComplete(firstQuestion);
    } catch {
      toast.error(t('onboardingChat.toastError', 'Could not save. You can finish setup in Settings.'));
    } finally {
      setSaving(false);
    }
  };

  const suggestions = useMemo(() => buildSuggestions(kids, t), [kids, t]);

  return (
    <div
      ref={scrollRef}
      className="flex h-full w-full flex-col overflow-y-auto bg-background px-4 py-6 sm:px-6"
    >
      {/* mt-auto glues the conversation to the bottom of the viewport when it's
          short, so the active input/CTA sits where the user expects in a chat
          UI. As bubbles accumulate, the column grows upward and scrolls. */}
      <div className="mx-auto mt-auto flex w-full max-w-2xl flex-col gap-3 pb-6">
        <AssistantBubble>
          {t(
            'onboardingChat.intro',
            "Hi! I'm Raised. Four quick questions so I can give advice that fits your family. Skip anything, no wrong answers.",
          )}
        </AssistantBubble>

        <AssistantBubble>{t('onboardingChat.askName', 'What should I call you?')}</AssistantBubble>
        {step === 'name' ? (
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  e.preventDefault();
                  advance('role');
                }
              }}
              placeholder={t('onboardingChat.namePlaceholder', 'Your name')}
              autoFocus
              className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
            />
            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => advance('role')}
              className="rounded-2xl bg-brand-blue px-5 py-3 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
            >
              {t('common.continue', 'Continue')}
            </button>
          </div>
        ) : name ? (
          <UserBubble>{name}</UserBubble>
        ) : null}

        {isPast('name') && (
          <>
            <AssistantBubble>
              {t('onboardingChat.askRole', 'Nice to meet you, {{name}}. Which best fits you?', { name })}
            </AssistantBubble>
            {step === 'role' ? (
              <ChipGroup
                options={ROLES}
                onSelect={(opt) => {
                  setRole(opt);
                  advance('kids');
                }}
              />
            ) : role ? (
              <UserBubble>{role.label}</UserBubble>
            ) : null}
          </>
        )}

        {isPast('role') && (
          <>
            <AssistantBubble>
              {t('onboardingChat.askKids', 'Tell me about your kids. Add as many as you like.')}
            </AssistantBubble>
            {step === 'kids' ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3">
                {kids.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {kids.map((kid, idx) => (
                      <li
                        key={`${kid.name}-${idx}`}
                        className="flex items-center justify-between rounded-xl bg-surface-light px-3 py-2 text-[14px]"
                      >
                        <span className="font-semibold text-text-primary">{kid.name}</span>
                        <span className="text-text-secondary">{kid.ageLabel}</span>
                        <button
                          type="button"
                          onClick={() => removeKid(idx)}
                          aria-label={t('onboardingChat.removeKid', 'Remove')}
                          className="text-[12px] font-semibold text-error hover:underline"
                        >
                          {t('onboardingChat.remove', 'Remove')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={newKidName}
                    onChange={(e) => setNewKidName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newKidName.trim()) {
                        e.preventDefault();
                        addKid();
                      }
                    }}
                    placeholder={t('onboardingChat.kidNamePlaceholder', "Child's name")}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] outline-none focus:border-brand-blue"
                  />
                  <select
                    value={newKidAge}
                    onChange={(e) => setNewKidAge(e.target.value)}
                    aria-label={t('onboardingChat.kidAgeLabel', "Child's age")}
                    className="rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] outline-none focus:border-brand-blue"
                  >
                    {AGE_OPTIONS.map((o) => (
                      <option key={o.label} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addKid}
                    disabled={!newKidName.trim()}
                    className="rounded-xl bg-brand-blue/15 px-4 py-2.5 text-[14px] font-bold text-brand-blue disabled:opacity-40"
                  >
                    {t('onboardingChat.addKid', '+ Add')}
                  </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => advance('concerns')}
                    className="rounded-xl px-4 py-2.5 text-[14px] font-semibold text-text-secondary hover:text-text-primary"
                  >
                    {t('onboardingChat.skip', 'Skip')}
                  </button>
                  <button
                    type="button"
                    disabled={kids.length === 0}
                    onClick={() => advance('concerns')}
                    className="rounded-xl bg-brand-blue px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-40"
                  >
                    {t('common.continue', 'Continue')}
                  </button>
                </div>
              </div>
            ) : kids.length > 0 ? (
              <UserBubble>
                {kids.map((k) => `${k.name} (${k.ageLabel})`).join(', ')}
              </UserBubble>
            ) : (
              <UserBubble subdued>{t('onboardingChat.skipped', 'Skipped')}</UserBubble>
            )}
          </>
        )}

        {isPast('kids') && (
          <>
            <AssistantBubble>
              {t('onboardingChat.askConcerns', "What's on your mind this week? Pick anything that feels true.")}
            </AssistantBubble>
            {step === 'concerns' ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {CONCERNS.map((c) => {
                    const selected = concerns.includes(c.id);
                    return (
                      <RoughBox
                        key={c.id}
                        as="button"
                        type="button"
                        skipEnhancer
                        ariaPressed={selected}
                        onClick={() =>
                          setConcerns((prev) =>
                            prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                          )
                        }
                        stroke={selected ? '#194038' : '#D7E5DA'}
                        fill={selected ? '#2F7D6A' : '#FFFFFF'}
                        strokeWidth={selected ? 2.2 : 1.6}
                        radius={9999}
                        seedKey={`concern-${c.id}-${selected ? 'on' : 'off'}`}
                        className="px-4 py-2 text-[14px] font-semibold cursor-pointer transition-transform active:scale-95"
                        innerClassName="flex items-center gap-1.5"
                        style={{ color: selected ? '#FFFFFF' : '#2F2A26' }}
                      >
                        {selected ? <span aria-hidden>✓</span> : null}
                        {c.label}
                      </RoughBox>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => advance('partner')}
                    className="rounded-xl px-4 py-2.5 text-[14px] font-semibold text-text-secondary hover:text-text-primary"
                  >
                    {t('onboardingChat.skip', 'Skip')}
                  </button>
                  <button
                    type="button"
                    onClick={() => advance('partner')}
                    className="rounded-xl bg-brand-blue px-5 py-2.5 text-[14px] font-bold text-white"
                  >
                    {t('common.continue', 'Continue')}
                  </button>
                </div>
              </div>
            ) : concerns.length > 0 ? (
              <UserBubble>
                {concerns
                  .map((id) => CONCERNS.find((c) => c.id === id)?.label)
                  .filter(Boolean)
                  .join(', ')}
              </UserBubble>
            ) : (
              <UserBubble subdued>{t('onboardingChat.skipped', 'Skipped')}</UserBubble>
            )}
          </>
        )}

        {isPast('concerns') && (
          <>
            <AssistantBubble>
              {t(
                'onboardingChat.askPartner',
                'Want to bring your co-parent in? They can see family insights too.',
              )}
            </AssistantBubble>
            {step === 'partner' ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && partnerEmail.trim()) {
                      e.preventDefault();
                      advance('suggestions');
                    }
                  }}
                  placeholder={t('onboardingChat.partnerPlaceholder', "Partner's email (optional)")}
                  className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => advance('suggestions')}
                  className="rounded-2xl bg-brand-blue px-5 py-3 text-[15px] font-bold text-white"
                >
                  {partnerEmail.trim()
                    ? t('onboardingChat.invite', 'Invite')
                    : t('onboardingChat.skip', 'Skip')}
                </button>
              </div>
            ) : partnerEmail.trim() ? (
              <UserBubble>
                {t('onboardingChat.inviteSummary', 'Invite to {{email}}', { email: partnerEmail.trim() })}
              </UserBubble>
            ) : (
              <UserBubble subdued>{t('onboardingChat.skipped', 'Skipped')}</UserBubble>
            )}
          </>
        )}

        {step === 'suggestions' && (
          <>
            <AssistantBubble>
              {kids.length > 0
                ? t('onboardingChat.closing', "Got it, {{name}}. Here's something for you and {{firstKid}}:", {
                    name: name || t('onboardingChat.thereFallback', 'there'),
                    firstKid: kids[0].name,
                  })
                : t('onboardingChat.closingNoKids', 'Got it, {{name}}. Here are a few places to start:', {
                    name: name || t('onboardingChat.thereFallback', 'there'),
                  })}
            </AssistantBubble>
            <div className="flex flex-col gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    posthog.capture('onboarding_suggestion_clicked', {
                      suggestion_index: idx,
                      kids_age_bucket: kids[0] ? ageBucket(kids[0].ageYears) : 'none',
                    });
                    persistAndComplete(s);
                  }}
                  className="rounded-2xl border border-brand-blue/40 bg-brand-blue/5 px-4 py-3 text-left text-[15px] font-semibold text-text-primary transition-colors hover:bg-brand-blue/10 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  posthog.capture('onboarding_no_suggestion_picked');
                  persistAndComplete();
                }}
                className="rounded-2xl px-4 py-3 text-center text-[14px] font-semibold text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                {saving
                  ? t('onboardingChat.saving', 'Saving...')
                  : t('onboardingChat.startChat', 'Or just take me to the chat')}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

const AssistantBubble = ({ children }: { children: ReactNode }) => (
  <div className="flex items-end gap-2 animate-slide-up">
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
      R
    </span>
    <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-light px-4 py-3 text-[15px] leading-relaxed text-text-primary">
      {children}
    </div>
  </div>
);

const UserBubble = ({ children, subdued }: { children: ReactNode; subdued?: boolean }) => (
  <div className="flex justify-end">
    <div
      className={`max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] leading-snug ${
        subdued
          ? 'border border-border bg-surface text-text-secondary italic'
          : 'bg-brand-blue text-white'
      }`}
    >
      {children}
    </div>
  </div>
);

type ChipOption = { id: string; label: string };

const ChipGroup = ({
  options,
  onSelect,
}: {
  options: ChipOption[];
  onSelect: (opt: ChipOption) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <RoughBox
        key={opt.id}
        as="button"
        type="button"
        skipEnhancer
        onClick={() => onSelect(opt)}
        stroke="#D7E5DA"
        fill="#FFFFFF"
        strokeWidth={1.6}
        radius={9999}
        seedKey={`chip-${opt.id}`}
        className="px-4 py-2 text-[14px] font-semibold cursor-pointer text-text-primary transition-transform hover:scale-[1.02] active:scale-95"
      >
        {opt.label}
      </RoughBox>
    ))}
  </div>
);

function ageBucket(years: number): string {
  if (years < 0) return 'expecting';
  if (years < 1) return 'baby';
  if (years < 3) return 'toddler';
  if (years < 6) return 'preschool';
  if (years < 12) return 'school';
  return 'teen';
}

function ageYearsToBirthdayIso(years: number): string | null {
  if (years < 0) return null;
  const now = new Date();
  if (years < 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    return d.toISOString().slice(0, 10);
  }
  const wholeYears = Math.round(years);
  const d = new Date(now.getFullYear() - wholeYears, now.getMonth(), now.getDate());
  return d.toISOString().slice(0, 10);
}

function buildSuggestions(kids: Kid[], t: TFunction): string[] {
  if (kids.length === 0) {
    return [
      t('onboardingChat.suggestions.generic.tantrum', 'How do I respond to a public tantrum?'),
      t('onboardingChat.suggestions.generic.screens', 'Evidence-based screen time guidance for young kids'),
      t('onboardingChat.suggestions.generic.stress', 'How to stay calm when my kid is melting down'),
    ];
  }
  const first = kids[0];
  const age = first.ageYears;
  if (age < 0) {
    return [
      t('onboardingChat.suggestions.expecting.prep', 'What should we set up before baby arrives?'),
      t('onboardingChat.suggestions.expecting.sleep', 'Realistic newborn sleep expectations'),
      t('onboardingChat.suggestions.expecting.partner', 'How to share the newborn load with a partner'),
    ];
  }
  if (age < 1) {
    return [
      t('onboardingChat.suggestions.baby.sleep', 'Sleep tips for {{name}} (under 1)', { name: first.name }),
      t('onboardingChat.suggestions.baby.soothing', 'Soothing techniques that actually work'),
      t('onboardingChat.suggestions.baby.milestones', 'Milestones to look for by 12 months'),
    ];
  }
  if (age < 3) {
    return [
      t('onboardingChat.suggestions.toddler.tantrum', 'Tantrum cooldown script for {{name}}', { name: first.name }),
      t('onboardingChat.suggestions.toddler.bedtime', 'Bedtime routine for a toddler'),
      t('onboardingChat.suggestions.toddler.speech', 'Encouraging speech without pressure'),
    ];
  }
  if (age < 6) {
    return [
      t('onboardingChat.suggestions.preschool.sharing', 'Helping {{name}} share with siblings', { name: first.name }),
      t('onboardingChat.suggestions.preschool.school', 'Getting {{name}} ready for school', { name: first.name }),
      t('onboardingChat.suggestions.preschool.snacks', 'Healthy snack ideas kids actually eat'),
    ];
  }
  if (age < 12) {
    return [
      t('onboardingChat.suggestions.school.screens', 'A screen-time approach for school-age kids'),
      t('onboardingChat.suggestions.school.homework', 'Homework battles, what helps'),
      t('onboardingChat.suggestions.school.feelings', 'Talking to {{name}} about big feelings', { name: first.name }),
    ];
  }
  return [
    t('onboardingChat.suggestions.teen.connect', 'Staying connected with a teenager who pulls away'),
    t('onboardingChat.suggestions.teen.phones', 'Phones, social media, and ground rules'),
    t('onboardingChat.suggestions.teen.anxiety', 'When normal teen mood becomes anxiety'),
  ];
}
