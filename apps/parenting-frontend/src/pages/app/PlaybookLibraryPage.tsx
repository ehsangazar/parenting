import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppBase } from '../../hooks/useAppBase.js';
import { Fire, Coins } from '@phosphor-icons/react';
import { api } from '../../lib/api.js';
import { familiesApi } from '../../lib/appApi.js';
import { toast } from 'sonner';
import { useAuth } from '../../state/auth.js';
import { Icon, type IconName } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { StatPill } from '../../components/ui/StatPill.js';
import { useAppContext } from '../../components/app/AppContext.js';

// Matches CoursePath PHASE_COLORS palette
const GROUP_PALETTE = [
  { bg: '#96E6B3', shadow: '#52D68C' },
  { bg: '#7B8FFF', shadow: '#5A6FD4' },
  { bg: '#FDBA74', shadow: '#EA580C' },
  { bg: '#C084FC', shadow: '#a362d4' },
  { bg: '#FF6B6B', shadow: '#c93535' },
];

const DOMAIN_COLORS: Record<string, string> = {
  'visual': '#7B8FFF', 'motor': '#52D68C', 'social-emotional': '#C084FC',
  'language': '#FF9600', 'cognitive': '#FF6B6B', 'adaptive': '#8eb4f8',
};
const DOMAIN_LABELS: Record<string, string> = {
  'visual': 'Visual', 'motor': 'Motor', 'social-emotional': 'Social',
  'language': 'Language', 'cognitive': 'Cognitive', 'adaptive': 'Adaptive',
};
const DOMAIN_ICONS: Record<string, IconName> = {
  'visual': 'view_details', 'motor': 'advance', 'social-emotional': 'organization',
  'language': 'voice_presentation', 'cognitive': 'idea', 'adaptive': 'biotech',
};
const ALL_DOMAINS = Object.keys(DOMAIN_COLORS);

interface Playbook {
  id: string; leapNumber: number; groupNumber: number; sequence: number;
  title: string; domains: string[]; triedCount: number; lastTriedAt: string | null;
}
interface EligibleChild { name: string; birthday: string; }

function ageInMonths(bd: string) {
  return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}
function dominantDomain(plays: Playbook[]) {
  const c: Record<string, number> = {};
  for (const p of plays) for (const d of p.domains) c[d] = (c[d] ?? 0) + 1;
  return Object.entries(c).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'cognitive';
}

const ORB_W = 80;

function PlayOrb({
  play, palette, isSuggested, onTap,
}: {
  play: Playbook;
  palette: typeof GROUP_PALETTE[0];
  isSuggested: boolean;
  onTap: () => void;
}) {
  const tried = play.triedCount > 0;
  const domain = play.domains[0] ?? 'cognitive';
  const icon: IconName = DOMAIN_ICONS[domain] ?? 'idea';

  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        type="button"
        onClick={onTap}
        className={[
          'relative flex select-none items-center justify-center rounded-full text-white transition-transform active:scale-95',
          !tried && !isSuggested ? 'opacity-70' : '',
        ].join(' ')}
        style={{
          width: ORB_W,
          height: ORB_W,
          backgroundColor: tried ? palette.bg : '#FFFFFF',
          boxShadow: tried
            ? `0 4px 0 0 ${palette.shadow}`
            : isSuggested
              ? `0 4px 0 0 #CBD5E1`
              : `0 3px 0 0 #E2E8F0`,
          outline: isSuggested && !tried ? `6px solid ${palette.bg}35` : undefined,
          outlineOffset: isSuggested && !tried ? '2px' : undefined,
          border: !tried ? `2px solid ${palette.bg}50` : 'none',
        }}
      >
        {tried ? (
          <Icon name={uiIcons.check} className="h-9 w-9 brightness-0 invert" alt="Tried" />
        ) : (
          <Icon
            name={icon}
            className="h-9 w-9"
            style={{ filter: `drop-shadow(0 0 3px ${DOMAIN_COLORS[domain]}60)` } as React.CSSProperties}
            alt=""
          />
        )}

        {tried && play.triedCount > 1 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white"
            style={{ backgroundColor: palette.shadow, border: '2px solid #F8F9FE' }}
          >
            {play.triedCount}
          </span>
        )}

        {tried && (
          <span
            className="pointer-events-none absolute left-[22%] top-[14%] h-[28%] w-[22%] -rotate-[30deg] rounded-full opacity-35"
            style={{ background: 'linear-gradient(to bottom, white, transparent)' }}
          />
        )}
      </button>

      <p
        className={`w-[88px] text-center text-[10px] font-bold leading-snug ${tried ? 'text-text-secondary' : 'text-text-tertiary'}`}
      >
        {play.title.length > 30 ? play.title.slice(0, 28) + '…' : play.title}
      </p>

      <span
        className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
        style={{
          backgroundColor: `${DOMAIN_COLORS[domain] ?? '#888'}${tried ? '22' : '14'}`,
          color: DOMAIN_COLORS[domain] ?? '#888',
        }}
      >
        {DOMAIN_LABELS[domain] ?? domain}
      </span>
    </div>
  );
}

export const PlaybookLibraryPage = () => {
  const { leapNumber } = useParams<{ leapNumber: string }>();
  const leap = parseInt(leapNumber ?? '1', 10);
  const navigate = useNavigate();
  const { toApp } = useAppBase();
  const { user } = useAuth();
  const { activeFamily } = useAppContext();

  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [eligibleChild, setEligibleChild] = useState<EligibleChild | null>(null);

  const streak = user?.gamification?.streak ?? 0;
  const coins = user?.gamification?.coins ?? 0;
  const coinsLabel = coins >= 1000000 ? `${(coins / 1000000).toFixed(1)}M` : coins >= 1000 ? `${(coins / 1000).toFixed(1)}k` : `${coins}`;

  useEffect(() => {
    api.get(`/api/leaps/${leap}/playbooks`)
      .then((r) => setPlaybooks(r.data.playbooks ?? []))
      .catch(() => toast.error('Failed to load playbooks'))
      .finally(() => setLoading(false));
  }, [leap]);

  useEffect(() => {
    if (!activeFamily?.id) return;
    familiesApi.listChildren(activeFamily.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        const child = (res.children ?? []).find(
          (c: { name: string; birthday?: string; isUnborn?: boolean }) => {
            if (!c.birthday || c.isUnborn) return false;
            const m = ageInMonths(c.birthday);
            return m >= 0 && m <= 3;
          },
        );
        if (child?.birthday) setEligibleChild({ name: child.name, birthday: child.birthday });
      })
      .catch(() => {});
  }, [activeFamily?.id]);

  const allGroups = useMemo(() => {
    const map = new Map<number, Playbook[]>();
    for (const pb of playbooks) {
      const arr = map.get(pb.groupNumber) ?? [];
      arr.push(pb);
      map.set(pb.groupNumber, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([groupNumber, plays]) => ({
        groupNumber,
        plays: plays.sort((a, b) => a.sequence - b.sequence),
        domain: dominantDomain(plays),
      }));
  }, [playbooks]);

  const visibleGroups = useMemo(() => {
    if (activeFilter === 'all') return allGroups;
    return allGroups.filter((g) => g.plays.some((p) => p.domains.includes(activeFilter)));
  }, [allGroups, activeFilter]);

  const triedTotal = playbooks.filter((p) => p.triedCount > 0).length;
  const pct = playbooks.length > 0 ? Math.round((triedTotal / playbooks.length) * 100) : 0;

  const suggestedId = useMemo(
    () => visibleGroups.flatMap((g) => g.plays).find((p) => p.triedCount === 0)?.id ?? null,
    [visibleGroups],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F8F9FE' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  // ── Header — matches CoursePath header exactly ────────────────────────────────
  const Header = (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ backgroundColor: 'rgba(248,249,254,0.88)', backdropFilter: 'blur(12px)', borderColor: '#E0E7FF' }}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(toApp('/app/learning'))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface"
        >
          <Icon name={uiIcons.chevronLeft} className="h-5 w-5 opacity-80" alt="" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-text-primary">
            {eligibleChild ? `Plays for ${eligibleChild.name}` : 'The Plays'}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E8EDFF]">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: '#7B8FFF' }} />
            </div>
            <span className="text-[10px] font-bold text-text-tertiary">{triedTotal}/{playbooks.length}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1">
            <Fire size={16} weight={streak > 0 ? 'fill' : 'regular'} className={streak > 0 ? 'text-gamification-streak' : 'text-text-tertiary'} aria-hidden />
            <span className={`text-sm font-black tabular-nums ${streak > 0 ? 'text-gamification-streak' : 'text-text-tertiary'}`}>{streak}</span>
          </span>
          <span className="flex items-center gap-1">
            <Coins size={16} weight="fill" className="text-amber-400" aria-hidden />
            <span className="text-sm font-black tabular-nums text-amber-400">{coinsLabel}</span>
          </span>
        </div>
      </div>

      {/* Domain filter chips */}
      <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
        {['all', ...ALL_DOMAINS].map((d) => {
          const active = activeFilter === d;
          const fill = DOMAIN_COLORS[d];
          return (
            <button
              key={d}
              type="button"
              onClick={() => setActiveFilter(d)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: active ? (fill ? `${fill}25` : 'rgba(255,255,255,0.15)') : '#FFFFFF',
                color: active ? (fill ?? '#fff') : '#64748b',
              }}
            >
              {d === 'all' ? 'All' : DOMAIN_LABELS[d]}
            </button>
          );
        })}
      </div>
    </header>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FE' }}>
      {Header}

      <div className="mx-auto flex max-w-5xl gap-8 px-4 pb-28 pt-6 lg:px-6">
        {/* ── Main content ── */}
        <div className="flex-1">

          {visibleGroups.length === 0 && (
            <p className="mt-12 text-center text-sm text-text-tertiary">No plays match this filter.</p>
          )}

          {visibleGroups.map((group, gi) => {
            const palette = GROUP_PALETTE[gi % GROUP_PALETTE.length];
            const triedInGroup = group.plays.filter((p) => p.triedCount > 0).length;
            const groupComplete = triedInGroup === group.plays.length;
            const groupPct = group.plays.length > 0 ? Math.round((triedInGroup / group.plays.length) * 100) : 0;
            const domainLabel = DOMAIN_LABELS[group.domain] ?? group.domain;

            return (
              <div key={group.groupNumber}>
                {/* Between-group connector — matches CoursePath between-phase dots */}
                {gi > 0 && (
                  <div className="relative mx-auto flex flex-col items-center gap-2.5 py-6">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          backgroundColor: '#DDE3F0',
                          opacity: 0.35 + i * 0.13,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Chapter banner — matches CoursePath phase banner exactly */}
                <div
                  className="relative mb-8 overflow-hidden rounded-3xl px-5 py-5"
                  style={{
                    background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.shadow} 100%)`,
                    boxShadow: `0 12px 32px ${palette.bg}30`,
                  }}
                >
                  {/* Decorative circles */}
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 rounded-full opacity-20"
                    style={{ width: 88, height: 88, backgroundColor: 'white' }}
                  />
                  <div
                    className="pointer-events-none absolute -right-2 -top-2 rounded-full opacity-10"
                    style={{ width: 56, height: 56, backgroundColor: 'white' }}
                  />

                  <div className="relative flex items-start justify-between">
                    <div className="flex-1">
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.16em]"
                        style={{ color: 'rgba(255,255,255,0.82)' }}
                      >
                        Group {group.groupNumber}
                      </p>
                      <p className="mt-1 text-base font-extrabold leading-snug text-white">
                        {domainLabel} Activities
                      </p>
                    </div>

                    {groupComplete ? (
                      <div className="ml-3 flex shrink-0 flex-col items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        <Icon name={uiIcons.trophy} className="h-7 w-7 brightness-0 invert" alt="" />
                        <span className="text-[9px] font-black uppercase tracking-wide text-white/70">Done</span>
                      </div>
                    ) : (
                      <div
                        className="ml-3 flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1"
                        style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                      >
                        <span className="text-xs font-black tabular-nums text-white">{triedInGroup}</span>
                        <span className="text-xs text-white/50">/</span>
                        <span className="text-xs font-bold tabular-nums text-white/70">{group.plays.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar inside banner */}
                  <div
                    className="relative mt-3 h-1.5 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${groupPct}%`, backgroundColor: 'white' }}
                    />
                  </div>
                </div>

                {/* Orbs — float on page background, no card wrapper */}
                <div className="flex justify-center gap-8 py-2 sm:gap-14">
                  {group.plays.map((play) => (
                    <PlayOrb
                      key={play.id}
                      play={play}
                      palette={palette}
                      isSuggested={play.id === suggestedId}
                      onTap={() => navigate(toApp(`/app/leaps/${leap}/playbooks/${play.id}`))}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* End state */}
          {visibleGroups.length > 0 && (
            <div className="py-16 text-center">
              {triedTotal === playbooks.length && playbooks.length > 0 ? (
                <>
                  <Icon name={uiIcons.partyPopper} className="mx-auto h-14 w-14" alt="" />
                  <p className="mt-3 text-sm font-bold text-text-secondary">All {playbooks.length} plays explored!</p>
                  <p className="mt-1 text-xs text-text-tertiary">You&apos;ve tried every activity in this leap.</p>
                </>
              ) : (
                <p className="text-xs text-text-tertiary">
                  {playbooks.length - triedTotal} more to discover — no rush
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate(toApp('/app/learning'))}
                className="mt-6 text-xs font-extrabold uppercase tracking-wide text-text-secondary underline underline-offset-2 hover:text-text-primary"
              >
                Back to Academy
              </button>
            </div>
          )}
        </div>

        {/* ── Desktop sidebar — matches CoursePath sidebar ── */}
        <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border p-5" style={{ borderColor: '#E0E7FF', backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-around gap-2">
              <StatPill PhosphorIcon={Fire} phosphorClassName="text-gamification-streak" value={streak} label="Streak" showLabel active={streak > 0} className="flex-col !items-center gap-1 !px-0" />
              <div className="h-10 w-px bg-[#E0E7FF]" />
              <StatPill PhosphorIcon={Coins} phosphorClassName="text-amber-400" value={coinsLabel} label="Coins" showLabel active={coins > 0} className="flex-col !items-center gap-1 !px-0" />
            </div>
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: '#E0E7FF', backgroundColor: '#FFFFFF' }}>
            <div className="mb-3 flex items-end justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-tertiary">Explored</p>
              <span className="text-xs font-black text-[#7B8FFF]">{pct}%</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#E8EDFF]">
              <div className="h-full rounded-full bg-[#7B8FFF] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-2">
              {allGroups.map((g, i) => {
                const pal = GROUP_PALETTE[i % GROUP_PALETTE.length];
                const done = g.plays.filter((p) => p.triedCount > 0).length;
                return (
                  <div key={g.groupNumber} className="flex items-center gap-2">
                    <div
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: done === g.plays.length ? pal.bg : done > 0 ? `${pal.bg}30` : '#E8EDFF' }}
                    >
                      {done === g.plays.length && (
                        <Icon name={uiIcons.check} className="h-2.5 w-2.5 brightness-0 invert" alt="" />
                      )}
                    </div>
                    <span className="flex-1 truncate text-xs text-text-secondary">
                      {DOMAIN_LABELS[g.domain] ?? g.domain}
                    </span>
                    <span
                      className="text-[10px] font-bold tabular-nums"
                      style={{ color: done === g.plays.length ? pal.bg : '#7EAEC4' }}
                    >
                      {done}/{g.plays.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
