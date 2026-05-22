import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { usePostHog } from '@posthog/react';
import { useAuth } from '../../state/auth.js';
import { useAppContext, type Family } from '../../components/app/AppContext.js';
import { familiesApi } from '../../lib/appApi.js';
import { Icon, type AnyIconName } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';

type FamilyMember = {
  id: string;
  userId?: string | null;
  name?: string | null;
  role?: string | null;
  birthday?: string | null;
  user?: { id?: string; email?: string };
};

type FamilyChild = {
  id: string;
  name: string;
  birthday?: string | null;
  isUnborn?: boolean;
  dueDate?: string | null;
  pregnancyType?: string | null;
};

type FamilyWithDetails = Family & {
  ownerId?: string;
  owner?: { id: string; email?: string };
  members?: FamilyMember[];
  children?: FamilyChild[];
};

const IconBox = ({ name, tone = 'neutral' }: { name: AnyIconName; tone?: 'neutral' | 'brand' | 'danger' }) => {
  const toneClass =
    tone === 'brand' ? 'bg-primary-100 text-primary-fg'
    : tone === 'danger' ? 'bg-red-500/10 text-red-500'
    : 'bg-surface-light text-text-secondary';
  return (
    <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClass)}>
      <Icon name={name} className="h-5 w-5 object-contain opacity-80" alt="" />
    </div>
  );
};

const SubHeader = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-text-secondary">{children}</p>
);

function formatAge(t: ReturnType<typeof useTranslation>['t'], child: FamilyChild): string {
  if (child.isUnborn) return t('settingsPage.unborn');
  if (!child.birthday) return '';
  const birth = new Date(child.birthday);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0);
  if (months < 24) return t('settingsPage.ageMonths', { count: Math.max(months, 0) });
  return t('settingsPage.ageYears', { count: Math.floor(months / 12) });
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// ─── Confirm dialog ────────────────────────────────────────────────────────

const ConfirmDialog = ({
  title, body, confirmLabel, cancelLabel,
  destructive, busy, onConfirm, onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
      <h2 className="text-[18px] font-bold text-text-primary">{title}</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">{body}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={clsx(
            'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-blue hover:brightness-110',
          )}
        >
          {busy && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── Child editor (add or edit) ────────────────────────────────────────────

type ChildDraft = {
  name: string;
  birthday: string;
  isUnborn: boolean;
  dueDate: string;
};

const ChildEditor = ({
  initial, onCancel, onSave, busy,
}: {
  initial: ChildDraft;
  onCancel: () => void;
  onSave: (draft: ChildDraft) => void;
  busy?: boolean;
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ChildDraft>(initial);

  const canSave = draft.name.trim().length > 0 && (draft.isUnborn ? true : true);

  return (
    <div className="rounded-2xl border border-border bg-surface-light p-4 space-y-3">
      <div>
        <label className="mb-1 block text-[12px] font-semibold text-text-secondary" htmlFor="child-name">
          {t('settingsPage.childName')}
        </label>
        <input
          id="child-name"
          autoFocus
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder={t('settingsPage.childNamePlaceholder')}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] font-semibold text-text-primary placeholder:font-normal placeholder:text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <label className="flex items-center gap-2 text-[14px] font-medium text-text-primary">
        <input
          type="checkbox"
          checked={draft.isUnborn}
          onChange={(e) => setDraft({ ...draft, isUnborn: e.target.checked })}
          className="h-4 w-4"
        />
        {t('settingsPage.childUnborn')}
      </label>

      {!draft.isUnborn ? (
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-text-secondary" htmlFor="child-birthday">
            {t('settingsPage.childBirthday')}
          </label>
          <input
            id="child-birthday"
            type="date"
            value={draft.birthday}
            onChange={(e) => setDraft({ ...draft, birthday: e.target.value })}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] font-semibold text-text-primary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-text-secondary" htmlFor="child-due">
            {t('settingsPage.childDueDate')}
          </label>
          <input
            id="child-due"
            type="date"
            value={draft.dueDate}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] font-semibold text-text-primary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light disabled:opacity-50"
        >
          {t('settingsPage.deleteAccountCancel')}
        </button>
        <button
          type="button"
          disabled={!canSave || busy}
          onClick={() => onSave(draft)}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-3 py-2.5 text-[14px] font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {t('settingsPage.saveChild')}
        </button>
      </div>
    </div>
  );
};

// ─── Family card ───────────────────────────────────────────────────────────

type ConfirmState =
  | { kind: 'deleteFamily' }
  | { kind: 'removeMember'; memberId: string; memberName: string }
  | { kind: 'removeChild'; childId: string; childName: string };

const FamilyCard = ({
  family, isExpanded, onToggle,
}: {
  family: FamilyWithDetails;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const posthog = usePostHog();
  const { user } = useAuth();
  const { activeFamilyId, setActiveFamilyId, refreshFamilies } = useAppContext();
  const isActive = family.id === activeFamilyId;
  const isOwner = (family.ownerId ?? family.owner?.id) === user?.id;

  const members = (family.members ?? []) as FamilyMember[];
  const children = (family.children ?? []) as FamilyChild[];

  const [renameValue, setRenameValue] = useState(family.name);
  const [renaming, setRenaming] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [savingChild, setSavingChild] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setRenameValue(family.name); }, [family.name]);

  const handleRename = async () => {
    const next = renameValue.trim();
    if (!next || next === family.name) return;
    setRenaming(true);
    try {
      await familiesApi.update(family.id, { name: next });
      await refreshFamilies();
      toast.success(t('settings.changesSaved'));
    } catch {
      toast.error(t('settingsPage.familyError'));
      setRenameValue(family.name);
    } finally {
      setRenaming(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    try {
      const res = await familiesApi.addMember(family.id, { email });
      await refreshFamilies();
      posthog.capture('family_member_invited', { family_id: family.id });
      if (res?.invited || res?.invite) toast.success(t('settingsPage.inviteSent'));
      else toast.success(t('settingsPage.memberAdded'));
      setInviteEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : null;
      toast.error(msg || t('settingsPage.familyError'));
    } finally {
      setInviting(false);
    }
  };

  const handleAddChild = async (draft: ChildDraft) => {
    setSavingChild(true);
    try {
      await familiesApi.addChild(family.id, {
        name: draft.name.trim(),
        isUnborn: draft.isUnborn,
        birthday: draft.isUnborn ? undefined : (draft.birthday || undefined),
        dueDate: draft.isUnborn ? (draft.dueDate || undefined) : undefined,
      });
      await refreshFamilies();
      posthog.capture('child_added', { family_id: family.id, is_unborn: draft.isUnborn });
      toast.success(t('settingsPage.childAdded'));
      setAddingChild(false);
    } catch {
      toast.error(t('settingsPage.familyError'));
    } finally {
      setSavingChild(false);
    }
  };

  const handleUpdateChild = async (childId: string, draft: ChildDraft) => {
    setSavingChild(true);
    try {
      await familiesApi.updateChild(family.id, childId, {
        name: draft.name.trim(),
        isUnborn: draft.isUnborn,
        birthday: draft.isUnborn ? undefined : (draft.birthday || undefined),
        dueDate: draft.isUnborn ? (draft.dueDate || undefined) : undefined,
      });
      await refreshFamilies();
      toast.success(t('settingsPage.childUpdated'));
      setEditingChildId(null);
    } catch {
      toast.error(t('settingsPage.familyError'));
    } finally {
      setSavingChild(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'deleteFamily') {
        await familiesApi.delete(family.id);
        await refreshFamilies();
      } else if (confirm.kind === 'removeMember') {
        await familiesApi.removeMember(family.id, confirm.memberId);
        await refreshFamilies();
        toast.success(t('settingsPage.memberRemoved'));
      } else if (confirm.kind === 'removeChild') {
        await familiesApi.deleteChild(family.id, confirm.childId);
        await refreshFamilies();
        toast.success(t('settingsPage.childRemoved'));
      }
      setConfirm(null);
    } catch {
      toast.error(t('settingsPage.familyError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Header — the whole bar is the expand/collapse trigger so users can't miss it. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={clsx(
          'flex w-full items-center gap-3 px-4 py-4 text-start transition-colors',
          isActive ? 'bg-primary-100/30' : 'hover:bg-surface-light',
        )}
      >
        <IconBox name={uiIcons.users} tone={isActive ? 'brand' : 'neutral'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[16px] font-bold text-text-primary">{family.name}</p>
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[12px] font-bold text-primary-fg">
                <Icon name={uiIcons.checkOk} className="h-3 w-3 object-contain" alt="" />
                {t('settingsPage.activeBadge')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {t('settingsPage.memberCount', { count: members.length })}
            {children.length > 0 ? `  ·  ${t('settingsPage.childCount', { count: children.length })}` : ''}
          </p>
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-text-primary">
          {isExpanded ? t('settingsPage.collapse') : t('settingsPage.expand')}
          <Icon
            name={isExpanded ? uiIcons.chevronUp : uiIcons.chevronDown}
            className="h-4 w-4 object-contain"
            alt=""
          />
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-5 border-t border-border px-4 py-4">
          {/* Use-this-family CTA, shown only when not currently active */}
          {!isActive && (
            <button
              type="button"
              onClick={() => setActiveFamilyId(family.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 text-[14px] font-bold text-white hover:brightness-110"
            >
              <Icon name={uiIcons.checkOk} className="h-4 w-4 object-contain brightness-0 invert" alt="" />
              {t('settingsPage.useThisFamily')}
            </button>
          )}

          {/* Members */}
          <section>
            <SubHeader>{t('settingsPage.familyMembers')}</SubHeader>
            {members.length === 0 ? (
              <p className="rounded-xl bg-surface-light px-3 py-3 text-[13px] text-text-secondary">
                {t('settingsPage.noMembersYet')}
              </p>
            ) : (
              <ul className="space-y-1">
                {members.map((m) => {
                  const isFamilyOwner = m.userId === (family.ownerId ?? family.owner?.id);
                  const isYou = m.userId === user?.id;
                  const displayName = m.name || m.user?.email || t('settingsPage.userRole');
                  const canRemove = !isFamilyOwner && isOwner;
                  return (
                    <li key={m.id} className="rounded-xl border border-border bg-surface p-3">
                      <div className="flex items-center gap-3">
                        <IconBox name={uiIcons.user} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-text-primary">{displayName}</p>
                          {m.user?.email && m.user.email !== displayName && (
                            <p className="truncate text-[12px] text-text-secondary">{m.user.email}</p>
                          )}
                        </div>
                        {isFamilyOwner && (
                          <span className="rounded-full bg-surface-light px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-text-secondary">
                            {isYou ? t('settingsPage.familyOwnerYou') : t('settingsPage.familyOwner')}
                          </span>
                        )}
                      </div>
                      {canRemove && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setConfirm({ kind: 'removeMember', memberId: m.id, memberName: displayName })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[13px] font-bold text-red-500 hover:bg-red-500/10 min-h-[40px]"
                          >
                            <Icon name={uiIcons.trash} className="h-4 w-4 object-contain" alt="" />
                            {t('settingsPage.removeMember')}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {isOwner && (
              <form onSubmit={handleInvite} className="mt-3 rounded-xl border border-border bg-surface-light p-3">
                <p className="text-[13px] font-semibold text-text-primary">{t('settingsPage.inviteMember')}</p>
                <p className="mt-0.5 text-[12px] text-text-secondary">{t('settingsPage.inviteMemberHint')}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t('settingsPage.inviteEmailPlaceholder')}
                    required
                    className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-[14px] font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {inviting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                    {t('settingsPage.sendInvite')}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Children */}
          <section>
            <SubHeader>{t('settingsPage.familyChildren')}</SubHeader>
            {children.length === 0 && !addingChild ? (
              <p className="rounded-xl bg-surface-light px-3 py-3 text-[13px] text-text-secondary">
                {t('settingsPage.noChildrenYet')}
              </p>
            ) : (
              <ul className="space-y-2">
                {children.map((c) => {
                  if (editingChildId === c.id) {
                    return (
                      <li key={c.id}>
                        <ChildEditor
                          initial={{
                            name: c.name,
                            birthday: toDateInputValue(c.birthday),
                            isUnborn: !!c.isUnborn,
                            dueDate: toDateInputValue(c.dueDate),
                          }}
                          onCancel={() => setEditingChildId(null)}
                          onSave={(draft) => handleUpdateChild(c.id, draft)}
                          busy={savingChild}
                        />
                      </li>
                    );
                  }
                  return (
                    <li key={c.id} className="rounded-xl border border-border bg-surface p-3">
                      <div className="flex items-center gap-3">
                        <IconBox name={uiIcons.cake} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-text-primary">{c.name}</p>
                          <p className="mt-0.5 text-[12px] text-text-secondary">
                            {c.isUnborn
                              ? `${t('settingsPage.unborn')}${c.dueDate ? ` · ${formatDate(c.dueDate, i18n.language)}` : ''}`
                              : [formatAge(t, c), formatDate(c.birthday, i18n.language)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingChildId(c.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-light px-3 py-2 text-[13px] font-semibold text-text-primary hover:bg-surface min-h-[40px]"
                        >
                          <Icon name={uiIcons.edit} className="h-4 w-4 object-contain" alt="" />
                          {t('settingsPage.editChild')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirm({ kind: 'removeChild', childId: c.id, childName: c.name })}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[13px] font-bold text-red-500 hover:bg-red-500/10 min-h-[40px]"
                        >
                          <Icon name={uiIcons.trash} className="h-4 w-4 object-contain" alt="" />
                          {t('settingsPage.removeChild')}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {addingChild ? (
              <div className="mt-3">
                <ChildEditor
                  initial={{ name: '', birthday: '', isUnborn: false, dueDate: '' }}
                  onCancel={() => setAddingChild(false)}
                  onSave={handleAddChild}
                  busy={savingChild}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingChild(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-light px-3 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface"
              >
                <Icon name={uiIcons.plus} className="h-4 w-4 object-contain" alt="" />
                {t('settingsPage.addChild')}
              </button>
            )}
          </section>

          {/* Owner-only management */}
          {isOwner && (
            <section className="border-t border-border pt-4">
              <SubHeader>{t('settingsPage.renameFamily')}</SubHeader>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder={t('settingsPage.familyNamePlaceholder')}
                  className="flex-1 rounded-xl border border-border bg-surface-light px-3 py-2.5 text-[14px] font-semibold text-text-primary placeholder:font-normal placeholder:text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={renaming || !renameValue.trim() || renameValue === family.name}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-[14px] font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {renaming && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  {t('settings.saveChanges')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setConfirm({ kind: 'deleteFamily' })}
                className="mt-4 flex w-full items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-start hover:bg-red-500/10"
              >
                <IconBox name={uiIcons.trash} tone="danger" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-red-500">{t('settingsPage.deleteFamily')}</p>
                  <p className="mt-0.5 text-[12px] text-text-secondary">{t('settingsPage.deleteFamilyConfirmBody')}</p>
                </div>
              </button>
            </section>
          )}
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === 'deleteFamily'
              ? t('settingsPage.deleteFamilyConfirmTitle', { name: family.name })
              : confirm.kind === 'removeMember'
                ? t('settingsPage.removeMemberConfirmTitle', { name: confirm.memberName })
                : t('settingsPage.removeChildConfirmTitle', { name: confirm.childName })
          }
          body={
            confirm.kind === 'deleteFamily'
              ? t('settingsPage.deleteFamilyConfirmBody')
              : confirm.kind === 'removeMember'
                ? t('settingsPage.removeMemberConfirmBody')
                : t('settingsPage.removeChildConfirmBody')
          }
          confirmLabel={
            confirm.kind === 'deleteFamily'
              ? t('settingsPage.deleteFamilyConfirm')
              : confirm.kind === 'removeMember'
                ? t('settingsPage.removeMemberConfirm')
                : t('settingsPage.removeChildConfirm')
          }
          cancelLabel={t('settingsPage.deleteAccountCancel')}
          destructive
          busy={busy}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

// ─── New family form ───────────────────────────────────────────────────────

const NewFamilyForm = () => {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const { refreshFamilies } = useAppContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = name.trim();
    if (!next) return;
    setBusy(true);
    try {
      await familiesApi.create(next);
      await refreshFamilies();
      posthog.capture('family_created');
      toast.success(t('settings.changesSaved'));
      setName('');
      setOpen(false);
    } catch {
      toast.error(t('settingsPage.familyError'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-3.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light"
      >
        <Icon name={uiIcons.plus} className="h-4 w-4 object-contain" alt="" />
        {t('settingsPage.newFamily')}
      </button>
    );
  }

  return (
    <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[14px] font-bold text-text-primary">{t('settingsPage.newFamily')}</p>
      <p className="mt-0.5 text-[13px] text-text-secondary">{t('settingsPage.newFamilyHint')}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('settingsPage.familyNamePlaceholder')}
          required
          className="flex-1 rounded-xl border border-border bg-surface-light px-3 py-2.5 text-[14px] font-semibold text-text-primary placeholder:font-normal placeholder:text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => { setOpen(false); setName(''); }}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] font-semibold text-text-primary hover:bg-surface-light disabled:opacity-50"
        >
          {t('settingsPage.deleteAccountCancel')}
        </button>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-[14px] font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {t('settingsPage.createFamily')}
        </button>
      </div>
    </form>
  );
};

// ─── Top-level component ───────────────────────────────────────────────────

export const FamilyManagement = () => {
  const { t } = useTranslation();
  const { families } = useAppContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // When a single family exists, default it to expanded for friction-free access.
  useEffect(() => {
    if (!expandedId && families.length === 1) setExpandedId(families[0].id);
  }, [families, expandedId]);

  const familiesWithDetails = useMemo(
    () => families as FamilyWithDetails[],
    [families],
  );

  return (
    <section className="space-y-3">
      <p className="ml-1 text-[13px] font-bold uppercase tracking-wider text-text-secondary">
        {t('settingsPage.family')}
      </p>
      <div className="space-y-3">
        {familiesWithDetails.map((family) => (
          <FamilyCard
            key={family.id}
            family={family}
            isExpanded={expandedId === family.id}
            onToggle={() => setExpandedId((cur) => (cur === family.id ? null : family.id))}
          />
        ))}
        <NewFamilyForm />
      </div>
    </section>
  );
};
