import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { useAppBase } from '../../hooks/useAppBase.js';
import { Icon, type IconName } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { familiesApi } from '../../lib/appApi.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { useAuth } from '../../state/auth.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
}

function getAgeShort(birthday: string, t: TFunction) {
  const diff = Date.now() - new Date(birthday).getTime();
  if (diff <= 0) return t('family.ageMonths', { count: 0 });
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  const months = Math.floor((diff / (1000 * 60 * 60 * 24 * 30.44)) % 12);
  if (years === 0) return t('family.ageMonths', { count: months });
  if (months === 0) return t('family.ageYears', { count: years });
  return t('family.ageYearsMonths', { years, months });
}

function getDevStageKey(birthday: string): { key: string; emoji: string; color: string } {
  const diffMs = Date.now() - new Date(birthday).getTime();
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.44);
  if (months < 3)   return { key: 'family.stageNewborn',     emoji: '🐣', color: 'bg-rose-50 text-rose-600'   };
  if (months < 12)  return { key: 'family.stageBaby',        emoji: '👶', color: 'bg-amber-50 text-amber-600' };
  if (months < 36)  return { key: 'family.stageToddler',     emoji: '🚶', color: 'bg-sky-50 text-sky-600'     };
  if (months < 72)  return { key: 'family.stagePreschooler', emoji: '🎨', color: 'bg-violet-50 text-violet-600' };
  if (months < 144) return { key: 'family.stageSchoolAge',   emoji: '📚', color: 'bg-green-50 text-green-600'  };
  return               { key: 'family.stageTeen',         emoji: '🌟', color: 'bg-primary-50 text-primary-400' };
}

const CHILD_AVATAR_COLORS = [
  'bg-primary-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-sky-500',
];

const ROLE_COLORS: Record<string, string> = {
  owner:       'bg-primary-100 text-primary-fg',
  admin:       'bg-amber-100 text-amber-700',
  parent:      'bg-primary-100 text-primary-fg',
  caregiver:   'bg-sky-100 text-sky-700',
  grandparent: 'bg-violet-100 text-violet-700',
};

const ROLE_ICON_NAMES: Record<string, IconName> = {
  owner: uiIcons.shield,
  admin: uiIcons.shield,
  parent: uiIcons.heart,
  caregiver: uiIcons.user,
  grandparent: uiIcons.heart,
};

// ── ConfirmInline ─────────────────────────────────────────────────────────────
// Tiny inline confirmation bar — avoids full modals for destructive actions
function ConfirmInline({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px]">
      <span className="text-red-600 font-medium">{message}</span>
      <div className="flex items-center gap-2 ml-3">
        <button
          onClick={onCancel}
          className="rounded-lg px-2.5 py-1 text-text-secondary hover:bg-surface transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-red-500 px-2.5 py-1 font-semibold text-white hover:bg-red-600 transition-colors"
        >
          {confirmLabel ?? t('family.removeCta')}
        </button>
      </div>
    </div>
  );
}

// ── ChildCard ─────────────────────────────────────────────────────────────────
function ChildCard({
  child,
  colorIdx,
  onRemove,
  onEdit,
  onViewProfile,
}: {
  child: { id: string; name: string; birthday?: string };
  colorIdx: number;
  onRemove: () => void;
  onEdit: () => void;
  onViewProfile: () => void;
}) {
  const { t, i18n } = useTranslation();
  const gradientColor = CHILD_AVATAR_COLORS[colorIdx % CHILD_AVATAR_COLORS.length];
  const stageData = child.birthday ? getDevStageKey(child.birthday) : null;
  const stage = stageData ? { label: t(stageData.key), emoji: stageData.emoji, color: stageData.color } : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className="relative flex flex-col rounded-2xl border border-border bg-surface shadow-sm transition-all hover:shadow-md hover:border-primary-200 overflow-hidden cursor-pointer"
      onClick={() => {
        if (menuOpen) { setMenuOpen(false); return; }
        if (confirming) return;
        onViewProfile();
      }}
    >
      {/* Top gradient strip */}
      <div className={`h-1.5 w-full ${gradientColor}`} />

      <div className="flex flex-col items-center gap-3 p-4 sm:p-5">
        {/* ··· action menu */}
        <div className="absolute right-3 top-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setMenuOpen(!menuOpen); setConfirming(false); }}
            className="flex h-7 w-7 min-h-0 items-center justify-center rounded-full p-0 text-text-tertiary transition-colors hover:bg-surface-light hover:text-text-secondary"
          >
            <Icon name={uiIcons.moreVertical} className="h-4 w-4 flex-none" alt="" />
          </button>
          {menuOpen && !confirming && (
            <div className="absolute right-0 top-8 z-20 min-w-[150px] rounded-xl border border-border bg-surface shadow-lg py-1">
              <button
                onClick={() => { setMenuOpen(false); onEdit(); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-text-secondary hover:bg-surface-light transition-colors"
              >
                <Icon name={uiIcons.pencil} className="h-3.5 w-3.5" alt="" />
                {t('common.edit')}
              </button>
              <button
                onClick={() => { setMenuOpen(false); onViewProfile(); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-text-secondary hover:bg-surface-light transition-colors"
              >
                <Icon name={uiIcons.externalLink} className="h-3.5 w-3.5" alt="" />
                {t('family.menuViewProfile')}
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => { setMenuOpen(false); setConfirming(true); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
              >
                <Icon name={uiIcons.trash} className="h-3.5 w-3.5 shrink-0" alt="" />
                {t('family.menuRemove')}
              </button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full ${gradientColor} text-xl font-bold text-white shadow-md`}
        >
          {getInitials(child.name)}
        </div>

        {/* Name + age */}
        <div className="text-center">
          <p className="text-[15px] font-bold text-text-primary leading-snug">{child.name}</p>
          {child.birthday && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-fg">
              {getAgeShort(child.birthday, t)}
            </span>
          )}
        </div>

        {/* Developmental stage */}
        {stage && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${stage.color}`}>
            <span>{stage.emoji}</span>
            {stage.label}
          </span>
        )}

        {/* Birthday */}
        {child.birthday && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <Icon name={uiIcons.cake} className="h-3.5 w-3.5" alt="" />
            <span>{t('family.bornOn', { date: new Date(child.birthday).toLocaleDateString(i18n.language === 'fa' ? 'fa-IR' : 'en-GB', { day: 'numeric', month: 'long' }) })}</span>
          </div>
        )}
      </div>

      {/* Inline confirmation */}
      {confirming && (
        <div className="border-t border-border px-4 pb-4" onClick={(e) => e.stopPropagation()}>
          <ConfirmInline
            message={t('family.removeChildConfirm', { name: child.name })}
            onConfirm={onRemove}
            onCancel={() => setConfirming(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── MemberRow ─────────────────────────────────────────────────────────────────
function MemberRow({
  member,
  isMe,
  onRemove,
}: {
  member: { name?: string; role?: string; user?: { email?: string } };
  isMe: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const displayName = member.name || member.user?.email || '—';
  const role = member.role?.toLowerCase() ?? 'member';
  const roleColor = ROLE_COLORS[role] ?? 'bg-surface-light text-text-secondary';
  const roleIconName = ROLE_ICON_NAMES[role] ?? uiIcons.user;
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="group py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-fg">
          {getInitials(displayName)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate text-[14px] font-semibold text-text-primary">{displayName}</p>
            {isMe && (
              <span className="rounded-full bg-surface-light px-2 py-0.5 text-[10px] font-semibold text-text-secondary">{t('page.youLabel')}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${roleColor}`}>
              <Icon name={roleIconName} className="h-3 w-3" alt="" />
              {member.role || t('family.members')}
            </span>
            {member.user?.email && member.name && (
              <span className="text-[11px] text-text-tertiary truncate">{member.user.email}</span>
            )}
          </div>
        </div>

        {/* Remove button */}
        {!isMe && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="flex-shrink-0 rounded-lg p-1.5 text-text-dimmed hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title={t('family.removeMember')}
          >
            <Icon name={uiIcons.close} className="h-4 w-4" alt="" />
          </button>
        )}
      </div>

      {/* Inline confirmation */}
      {confirming && (
        <ConfirmInline
          message={t('page.removeMemberConfirm', { name: displayName })}
          onConfirm={onRemove}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function SideDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <aside
        className={`absolute inset-y-0 right-0 w-full max-w-[520px] bg-surface shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-bold text-text-primary">{title}</h3>
                {subtitle && (
                  <p className="mt-1 text-[13px] text-text-secondary">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-text-tertiary hover:bg-surface-light hover:text-text-secondary transition-colors"
              >
                <Icon name={uiIcons.close} className="h-4 w-4" alt="" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </aside>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export const FamilyPage = () => {
  const { t } = useTranslation();
  const {
    families,
    activeFamily,
    activeFamilyId,
    setActiveFamilyId,
    refreshFamilies,
  } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toApp } = useAppBase();
  const [members, setMembers]   = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);

  // Child form (add + edit)
  const [childFormId, setChildFormId]         = useState<string | null>(null); // null = add
  const [childFormName, setChildFormName]     = useState('');
  const [childFormBirthday, setChildFormBirthday] = useState('');
  const [savingChild, setSavingChild]         = useState(false);

  // Invite member form
  const [memberEmail, setMemberEmail]   = useState('');
  const [memberName, setMemberName]     = useState('');
  const [inviting, setInviting]         = useState(false);

  // Family name editing
  const [editingName, setEditingName]   = useState(false);
  const [nameValue, setNameValue]       = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [confirmingDeleteFamilyId, setConfirmingDeleteFamilyId] = useState<string | null>(null);
  const [deletingFamilyId, setDeletingFamilyId] = useState<string | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'childForm' | 'invite' | 'families' | null>(null);

  const loadFamilyData = useCallback(async () => {
    if (!activeFamily) return;
    setLoading(true);
    const [membersRes, childrenRes] = await Promise.all([
      familiesApi.listMembers(activeFamily.id).catch(() => ({ members: [] })),
      familiesApi.listChildren(activeFamily.id).catch(() => ({ children: [] })),
    ]);
    setMembers(membersRes.members ?? []);
    setChildren(childrenRes.children ?? []);
    setLoading(false);
  }, [activeFamily]);

  useEffect(() => {
    if (activeFamily) {
      loadFamilyData();
    }
  }, [activeFamily, loadFamilyData]);

  useEffect(() => { if (activeFamily) setNameValue(activeFamily.name); }, [activeFamily?.name]);

  if (!activeFamily) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title={t('family.title')} iconName="organization" />
        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface p-12 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <Icon name={uiIcons.users} className="h-8 w-8 text-primary-700" alt="" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-text-primary">{t('page.noFamilyYet')}</p>
            <p className="mt-1 text-[13px] text-text-tertiary">{t('page.noFamilyYetBody')}</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue === activeFamily.name) { setEditingName(false); return; }
    await familiesApi.update(activeFamily.id, { name: nameValue.trim() });
    setEditingName(false);
    await refreshFamilies();
  };

  const openAddChild = () => {
    setChildFormId(null);
    setChildFormName('');
    setChildFormBirthday('');
    setActiveDrawer('childForm');
  };

  const openEditChild = (child: { id: string; name: string; birthday?: string }) => {
    setChildFormId(child.id);
    setChildFormName(child.name);
    setChildFormBirthday(
      child.birthday ? new Date(child.birthday).toISOString().split('T')[0] : ''
    );
    setActiveDrawer('childForm');
  };

  const handleSaveChild = async () => {
    if (!childFormName.trim()) return;
    setSavingChild(true);
    if (childFormId) {
      await familiesApi.updateChild(activeFamily.id, childFormId, {
        name: childFormName.trim(),
        birthday: childFormBirthday ? new Date(childFormBirthday).toISOString() : undefined,
      });
    } else {
      await familiesApi.addChild(activeFamily.id, {
        name: childFormName.trim(),
        birthday: childFormBirthday ? new Date(childFormBirthday).toISOString() : undefined,
      });
    }
    setChildFormName('');
    setChildFormBirthday('');
    setChildFormId(null);
    setSavingChild(false);
    setActiveDrawer(null);
    await loadFamilyData();
    await refreshFamilies();
  };

  const handleInvite = async () => {
    if (!memberEmail.trim()) return;
    setInviting(true);
    await familiesApi.addMember(activeFamily.id, {
      email: memberEmail.trim(),
      name: memberName.trim() || undefined,
    });
    setMemberEmail(''); setMemberName('');
    setInviting(false);
    await loadFamilyData();
  };

  const handleCreateFamily = async () => {
    const trimmedName = newFamilyName.trim();
    if (!trimmedName) return;
    setCreatingFamily(true);
    try {
      const res = await familiesApi.create(trimmedName);
      setNewFamilyName('');
      await refreshFamilies();
      if (res?.family?.id) {
        setActiveFamilyId(res.family.id);
      }
    } finally {
      setCreatingFamily(false);
    }
  };

  const handleDeleteFamily = async (familyId: string) => {
    setDeletingFamilyId(familyId);
    try {
      await familiesApi.delete(familyId);
      setConfirmingDeleteFamilyId(null);
      await refreshFamilies();
    } finally {
      setDeletingFamilyId(null);
    }
  };

  return (
    <>
    <PageContainer verticalSpacing="normal">
      <PageHeader title={t('family.title')} subtitle={activeFamily.name} iconName="organization" />

      <div className="mt-4 space-y-5">

        {/* ── Hero banner ──────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-primary-600 p-6 text-white shadow-lg">
          {/* Background decoration */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-surface/10" />
          <div className="pointer-events-none absolute -bottom-10 -left-4 h-32 w-32 rounded-full bg-surface/5" />

          <div className="relative flex items-center gap-5">
            {/* Family avatar */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-light/20 text-2xl font-bold text-white shadow-inner backdrop-blur-sm">
              {getInitials(activeFamily.name)}
            </div>

            <div className="flex-1 min-w-0">
              <button
                onClick={() => { setNameValue(activeFamily.name); setEditingName(true); }}
                className="group flex items-center gap-2 rounded-lg -mx-1 px-1 py-0.5 transition-colors hover:bg-surface/10 active:bg-surface/20"
              >
                <h1 className="truncate text-xl font-bold text-white">{activeFamily.name}</h1>
                <Icon name={uiIcons.pencil} className="h-3.5 w-3.5 flex-shrink-0 text-white/50 group-hover:text-white/80 transition-colors" alt="" />
              </button>
              <div className="mt-1 flex items-center gap-3 text-[13px] text-white/80">
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-light/20">
                    <Icon name={uiIcons.baby} className="h-3.5 w-3.5 text-white" alt="" />
                  </span>
                  {loading ? '…' : t('family.childCount', { count: children.length })}
                </span>
                <span className="text-white/40">·</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-light/20">
                    <Icon name={uiIcons.users} className="h-3.5 w-3.5 text-white" alt="" />
                  </span>
                  {loading ? '…' : t('family.caregiverCount', { count: members.length })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick actions ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={openAddChild}
              className="btn-duo-outline-sm flex items-center justify-center gap-2 !border-primary-200 !bg-primary-50 !py-2.5 !text-[13px] !font-semibold !text-primary-fg hover:!bg-primary-100 !normal-case !tracking-normal"
            >
              <Icon name={uiIcons.baby} className="h-4 w-4" alt="" />
              {t('family.addChild')}
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawer('invite')}
              className="btn-duo-blue-sm flex items-center justify-center gap-2 !py-2.5 !text-[13px] !font-semibold !normal-case !tracking-normal"
            >
              <Icon name={uiIcons.userPlus} className="h-4 w-4" alt="" />
              {t('page.inviteCaregiverButton')}
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawer('families')}
              className="btn-duo-ghost-sm flex items-center justify-center gap-2 !border-border !bg-surface-light !py-2.5 !text-[13px] !font-semibold !normal-case !tracking-normal"
            >
              <Icon name={uiIcons.users} className="h-4 w-4" alt="" />
              {t('family.manageFamiliesButton')}
            </button>
          </div>
        </section>

        {/* ── Children ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Icon name={uiIcons.baby} className="h-5 w-5 text-primary-500" alt="" />
            <h2 className="text-[15px] font-bold text-text-primary">{t('family.children')}</h2>
            {children.length > 0 && (
              <span className="ml-auto rounded-full bg-surface-light px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary">
                {t('family.profileCount', { count: children.length })}
              </span>
            )}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl bg-surface-light" />
              ))}
            </div>
          )}

          {/* Child grid */}
          {!loading && children.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {children.map((child, idx) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  colorIdx={idx}
                  onViewProfile={() => navigate(toApp(`/app/child/${child.id}`))}
                  onEdit={() => openEditChild(child)}
                  onRemove={async () => {
                    await familiesApi.deleteChild(activeFamily.id, child.id);
                    await loadFamilyData();
                    await refreshFamilies();
                  }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && children.length === 0 && (
            <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
              <div className="text-3xl">👶</div>
              <p className="text-[14px] font-semibold text-text-secondary">{t('family.noChildren')}</p>
              <p className="text-[12px] text-text-tertiary">{t('family.noChildrenYetBody')}</p>
            </div>
          )}

          <button
            type="button"
            onClick={openAddChild}
            className="btn-duo-outline-sm mt-4 flex w-full items-center justify-center gap-2 !border-dashed !border-primary-300 !bg-primary-50 !py-3 !text-[13px] !font-semibold !text-primary-fg hover:!bg-primary-100 !normal-case !tracking-normal"
          >
            <Icon name={uiIcons.baby} className="h-4 w-4" alt="" />
            {t('family.addChildCta')}
          </button>
        </section>

        {/* ── Family Members ───────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Icon name={uiIcons.users} className="h-5 w-5 text-primary-500" alt="" />
            <h2 className="text-[15px] font-bold text-text-primary">{t('family.caregiversHeading')}</h2>
            {members.length > 0 && (
              <span className="ml-auto rounded-full bg-surface-light px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary">
                {t('family.memberCount', { count: members.length })}
              </span>
            )}
          </div>

          <div className="divide-y divide-border">
            {loading && [1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-surface-light" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-surface-light" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-surface-light" />
                </div>
              </div>
            ))}

            {!loading && members.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="text-2xl">👥</div>
                <p className="text-[13px] font-semibold text-text-secondary">{t('family.noMembersYetHeading')}</p>
                <p className="text-[12px] text-text-tertiary">{t('family.noMembersYetBody')}</p>
              </div>
            )}

            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isMe={member.user?.email === user?.email}
                onRemove={async () => {
                  await familiesApi.removeMember(activeFamily.id, member.id);
                  await loadFamilyData();
                  await refreshFamilies();
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActiveDrawer('invite')}
            className="btn-duo-outline-sm mt-4 flex w-full items-center justify-center gap-2 !border-dashed !border-brand-blue/40 !bg-brand-blue/10 !py-3 !text-[13px] !font-semibold !text-brand-blue hover:!bg-brand-blue/15 !normal-case !tracking-normal"
          >
            <Icon name={uiIcons.userPlus} className="h-4 w-4" alt="" />
            {t('page.inviteCaregiverButton')}
          </button>
        </section>

      </div>

      <SideDrawer
        open={activeDrawer === 'childForm'}
        onClose={() => setActiveDrawer(null)}
        title={childFormId ? t('family.editChildTitle', { name: childFormName || t('family.children') }) : t('page.familyAddChildTitle')}
        subtitle={childFormId ? t('family.editChildSubtitle') : t('page.familyAddChildSubtitle')}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-text-secondary">{t('family.childNameLabel')}</label>
            <input
              value={childFormName}
              onChange={(e) => setChildFormName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveChild(); }}
              placeholder={t('onboarding.childName')}
              autoFocus
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-text-secondary">
              {t('family.childBirthdayLabel')} <span className="font-normal text-text-tertiary">{t('family.childBirthdayOptional')}</span>
            </label>
            <input
              type="date"
              value={childFormBirthday}
              onChange={(e) => setChildFormBirthday(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveChild}
            disabled={savingChild || !childFormName.trim()}
            className="btn-duo-green-sm w-full disabled:opacity-40 !text-[13px] !font-semibold !normal-case !tracking-normal"
          >
            {savingChild ? t('family.savingEllipsis') : childFormId ? t('family.saveChangesCta') : t('page.addChildCta')}
          </button>
        </div>
      </SideDrawer>

      <SideDrawer
        open={activeDrawer === 'invite'}
        onClose={() => setActiveDrawer(null)}
        title={t('page.familyInviteTitle')}
        subtitle={t('page.familyInviteSubtitle')}
      >
        <div className="rounded-xl border border-border bg-surface-light p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name={uiIcons.sparkles} className="h-4 w-4 text-sky-500" alt="" />
            <p className="text-[12px] font-bold uppercase tracking-wider text-text-tertiary">{t('family.inviteByEmail')}</p>
          </div>
          <div className="space-y-2">
            <input
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
              placeholder={t('auth.email')}
              type="email"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            <input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder={t('page.inviteNameOptional')}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              await handleInvite();
              setActiveDrawer(null);
            }}
            disabled={inviting || !memberEmail.trim()}
            className="btn-duo-blue-sm mt-3 w-full disabled:opacity-40 !text-[13px] !font-semibold !normal-case !tracking-normal"
          >
            <Icon name={uiIcons.mail} className="h-4 w-4" alt="" />
            {inviting ? t('page.inviting') : t('page.inviteCaregiverCta')}
          </button>
        </div>
      </SideDrawer>

      <SideDrawer
        open={activeDrawer === 'families'}
        onClose={() => setActiveDrawer(null)}
        title={t('page.familyManageTitle')}
        subtitle={t('page.familyManageSubtitle')}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {families.map((family) => {
              const isActive = family.id === activeFamilyId;
              const isDeleting = deletingFamilyId === family.id;
              const memberCount = family._count?.members ?? family.members?.length ?? 0;
              const childCount = family._count?.children ?? family.children?.length ?? 0;

              return (
                <div
                  key={family.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    isActive ? 'border-primary-300 bg-primary-50' : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                        isActive ? 'bg-primary-600 text-white' : 'bg-surface-light text-text-secondary'
                      }`}
                    >
                      {getInitials(family.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-text-primary">{family.name}</p>
                      <p className="text-[11px] text-text-tertiary">
                        {t('family.childCount', { count: childCount })} · {t('family.memberCount', { count: memberCount })}
                      </p>
                    </div>
                    {!isActive ? (
                      <button
                        onClick={() => {
                          setActiveFamilyId(family.id);
                          setActiveDrawer(null);
                        }}
                        className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-semibold text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-300 transition-colors"
                      >
                        {t('family.switchFamily')}
                      </button>
                    ) : (
                      <span className="rounded-lg bg-primary-100 px-2.5 py-1 text-[11px] font-semibold text-primary-fg">
                        {t('family.activeLabel')}
                      </span>
                    )}
                  </div>

                  {families.length > 1 && (
                    <div className="mt-3 border-t border-border pt-2">
                      {confirmingDeleteFamilyId === family.id ? (
                        <ConfirmInline
                          message={t('family.deleteFamilyConfirm', { name: family.name })}
                          onConfirm={() => handleDeleteFamily(family.id)}
                          onCancel={() => setConfirmingDeleteFamilyId(null)}
                          confirmLabel={t('common.delete')}
                        />
                      ) : (
                        <button
                          onClick={() => setConfirmingDeleteFamilyId(family.id)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          <Icon name={uiIcons.trash} className="h-3.5 w-3.5 shrink-0" alt="" />
                          {isDeleting ? t('family.deletingEllipsis') : t('family.deleteFamilyCta')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-dashed border-primary-300 bg-primary-50 p-3">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-primary-fg">{t('family.createNewFamily')}</p>
            <div className="space-y-2">
              <input
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFamily(); }}
                placeholder={t('family.familyName')}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="button"
                onClick={handleCreateFamily}
                disabled={creatingFamily || !newFamilyName.trim()}
                className="btn-duo-green-sm inline-flex w-full items-center justify-center gap-2 disabled:opacity-40 !text-[13px] !font-semibold !normal-case !tracking-normal"
              >
                <Icon name={uiIcons.plus} className="h-4 w-4" alt="" />
                {creatingFamily ? t('page.creatingFamily') : t('page.createFamilyCta')}
              </button>
            </div>
          </div>
        </div>
      </SideDrawer>
    </PageContainer>

    {editingName && createPortal(
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          onClick={() => setEditingName(false)}
          aria-label={t('common.close')}
        />
        <div className="relative w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl">
          <h2 className="mb-1 text-[17px] font-semibold text-text-primary">{t('family.renameFamilyTitle')}</h2>
          <p className="mb-4 text-[13px] text-text-secondary">{t('family.renameFamilySubtitle')}</p>
          <input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
            autoFocus
            placeholder={t('family.renameFamilyPlaceholder')}
            className="w-full rounded-xl border border-border bg-surface-light px-4 py-3 text-[16px] font-medium text-text-primary placeholder-text-tertiary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setEditingName(false)}
              className="flex-1 rounded-xl border border-border px-4 py-3 text-[15px] font-medium text-text-secondary transition-colors hover:bg-surface-light"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveName}
              className="flex-1 rounded-xl bg-primary-500 px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-primary-600"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};
