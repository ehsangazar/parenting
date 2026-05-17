import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppBase } from '../../hooks/useAppBase.js';
import { api } from '../../lib/api.js';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { soundManager } from '../../lib/soundManager.js';

const HUB_BG = '#F8F9FE';
const DOMAIN_COLORS: Record<string, string> = {
  'visual': '#7B8FFF',
  'motor': '#52D68C',
  'social-emotional': '#C084FC',
  'language': '#FF9600',
  'cognitive': '#FF6B6B',
  'adaptive': '#8eb4f8',
};

const DOMAIN_LABEL_KEYS: Record<string, string> = {
  'visual': 'playbooks.domainVisual',
  'motor': 'playbooks.domainMotor',
  'social-emotional': 'playbooks.domainSocial',
  'language': 'playbooks.domainLanguage',
  'cognitive': 'playbooks.domainCognitive',
  'adaptive': 'playbooks.domainAdaptive',
};

const ZPD_LEVELS = [
  { id: 'down', labelKey: 'playbooks.zpdStepDown', pattern: /\[Level 1\] Step Down/i },
  { id: 'standard', labelKey: 'playbooks.zpdStandard', pattern: /\[Level 2\] Standard/i },
  { id: 'up', labelKey: 'playbooks.zpdStepUp', pattern: /\[Level 3\] Step Up/i },
] as const;

type ZpdLevel = (typeof ZPD_LEVELS)[number]['id'];

interface Playbook {
  id: string;
  leapNumber: number;
  groupNumber: number;
  sequence: number;
  title: string;
  content: string;
  domains: string[];
  triedCount: number;
  lastTriedAt: string | null;
}

/**
 * Strips the ZPD dial section from the markdown and returns just the level-specific text.
 * Falls back to the full content if parsing fails.
 */
function extractZpdContent(content: string, level: ZpdLevel): string {
  // Find the ZPD Dial section
  const zpdMatch = content.match(/###\s+\*\*III\. The ZPD Dial[\s\S]*?(?=###\s+\*\*IV\.)/i);
  if (!zpdMatch) return '';

  const zpdBlock = zpdMatch[0];
  const levelPat = ZPD_LEVELS.find((l) => l.id === level)!.pattern;

  // Find this level's content, up to the next level marker or end
  const match = zpdBlock.match(new RegExp(`\\[Level \\d\\] ${level === 'down' ? 'Step Down' : level === 'standard' ? 'Standard' : 'Step Up'}:\\s*([\\s\\S]*?)(?=- \\[Level|$)`, 'i'));
  return match ? match[1].trim() : '';
}

/**
 * Returns the main content without the ZPD section (for display alongside the dial).
 */
function stripZpdSection(content: string): string {
  return content.replace(/###\s+\*\*III\. The ZPD Dial[\s\S]*?(?=###\s+\*\*IV\.)/i, '');
}

function DomainBadge({ domain }: { domain: string }) {
  const { t } = useTranslation();
  const color = DOMAIN_COLORS[domain];
  if (!color) return null;
  const labelKey = DOMAIN_LABEL_KEYS[domain];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {labelKey ? t(labelKey) : domain}
    </span>
  );
}

export const PlaybookViewerPage = () => {
  const { t } = useTranslation();
  const { leapNumber, id } = useParams<{ leapNumber: string; id: string }>();
  const leap = parseInt(leapNumber ?? '1', 10);
  const navigate = useNavigate();
  const { toApp } = useAppBase();

  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [zpdLevel, setZpdLevel] = useState<ZpdLevel>('standard');
  const [submitting, setSubmitting] = useState(false);
  const [triedCount, setTriedCount] = useState(0);

  useEffect(() => {
    const fetchPlaybook = async () => {
      try {
        const res = await api.get(`/api/leaps/${leap}/playbooks/${id}`);
        const pb: Playbook = res.data.playbook;
        setPlaybook(pb);
        setTriedCount(pb.triedCount);
      } catch {
        toast.error(t('playbooks.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };
    fetchPlaybook();
  }, [leap, id]);

  const handleTried = async () => {
    if (!playbook || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/api/leaps/${leap}/playbooks/${playbook.id}/tried`);
      const { triedCount: newCount, isFirstTry, xpAwarded, groupBonusAwarded } = res.data;
      setTriedCount(newCount);

      if (isFirstTry) {
        soundManager.play('playbookTry');
        toast.success(`+${xpAwarded} XP`, { description: t('playbooks.firstTryDesc') });
      } else {
        soundManager.play('buttonSecondary');
        toast.success(t('playbooks.logged'), { description: t('playbooks.keepItUp') });
      }

      if (groupBonusAwarded) {
        toast.success(t('playbooks.groupComplete'), {
          description: t('playbooks.groupCompleteDesc'),
        });
      }
    } catch {
      // api interceptor already shows error toast
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full" style={{ backgroundColor: HUB_BG }}>
        <div className="mx-auto max-w-2xl animate-pulse space-y-4 px-4 pb-32 pt-8 lg:px-6">
          <div className="h-6 w-32 rounded-lg bg-surface-light/30" />
          <div className="h-10 w-3/4 rounded-lg bg-surface-light/30" />
          <div className="h-80 rounded-2xl bg-surface-light/30" />
        </div>
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className="min-h-full" style={{ backgroundColor: HUB_BG }}>
        <div className="mx-auto max-w-2xl px-4 pt-12 text-center">
          <p className="text-[#8a9399]">{t('playbooks.notFound')}</p>
        </div>
      </div>
    );
  }

  const mainContent = stripZpdSection(playbook.content);
  const zpdContent = extractZpdContent(playbook.content, zpdLevel);

  return (
    <div className="min-h-full" style={{ backgroundColor: HUB_BG }}>
      <div className="mx-auto max-w-2xl px-4 pb-36 pt-6 lg:px-6 lg:pb-24 lg:pt-8">

        {/* Back nav */}
        <button
          type="button"
          onClick={() => navigate(toApp(`/app/leaps/${leap}/playbooks`))}
          className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-[#8a9399] hover:text-white transition-colors"
        >
          <span>←</span>
          <span>{t('playbooks.allPlays')}</span>
        </button>

        {/* Title row */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-mono text-text-tertiary">
            {playbook.groupNumber}.{playbook.sequence}
          </span>
          {triedCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: '#7B8FFF' }}
            >
              {t('playbooks.triedCount', { count: triedCount })}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-extrabold text-white leading-tight">{playbook.title}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {playbook.domains.map((d) => (
            <DomainBadge key={d} domain={d} />
          ))}
        </div>

        {/* Main content */}
        <div
          className="font-body lesson-content prose prose-invert mt-6 max-w-none
            prose-p:my-4 prose-p:text-[1rem] prose-p:leading-[1.8] prose-p:text-text-secondary
            sm:prose-p:text-[1.0625rem]
            prose-strong:font-semibold prose-strong:text-text-primary
            prose-em:text-text-secondary
            prose-ul:my-4 prose-ol:my-4 prose-li:my-1.5 prose-li:marker:text-text-tertiary
            prose-headings:font-heading prose-headings:mt-7 prose-headings:mb-2 prose-headings:font-bold prose-headings:text-text-primary
            prose-h2:text-xl prose-h3:text-lg
            prose-blockquote:my-4 prose-blockquote:border-l-4 prose-blockquote:border-brand-blue/60
            prose-blockquote:bg-surface prose-blockquote:py-2.5 prose-blockquote:pl-4 prose-blockquote:pr-3
            prose-blockquote:not-italic prose-blockquote:text-text-secondary prose-blockquote:rounded-r-xl
            prose-a:font-medium prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline
            prose-hr:border-border"
        >
          <ReactMarkdown>{mainContent}</ReactMarkdown>
        </div>

        {/* ZPD Dial */}
        <div
          className="mt-8 rounded-2xl border border-card-border bg-surface p-5"
        >
          <div className="mb-4">
            <h3 className="font-heading text-sm font-bold text-text-primary">{t('playbooks.difficultyDial')}</h3>
            <p className="mt-0.5 text-xs text-text-tertiary">{t('playbooks.difficultyDialSub')}</p>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-1.5 rounded-xl bg-background p-1">
            {ZPD_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => setZpdLevel(level.id)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                  zpdLevel === level.id
                    ? 'bg-brand-blue text-white'
                    : 'bg-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {t(level.labelKey)}
              </button>
            ))}
          </div>

          {/* Level content */}
          <div className="font-body text-sm leading-relaxed text-text-secondary">
            {zpdContent || (
              <span className="text-xs text-text-tertiary">{t('playbooks.noContent')}</span>
            )}
          </div>
        </div>

      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background px-4 py-3 lg:left-[256px]">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={submitting}
            onClick={handleTried}
            className="w-full rounded-2xl bg-brand-blue py-3.5 text-sm font-extrabold text-white shadow-[0_4px_0_0_#5A6FD4] transition-all active:translate-y-1 active:shadow-[0_1px_0_0_#5A6FD4] disabled:opacity-60"
          >
            {submitting ? t('playbooks.logging') : triedCount === 0 ? t('playbooks.triedToday') : t('playbooks.triedAgain', { count: triedCount })}
          </button>
        </div>
      </div>
    </div>
  );
};
