import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from '../../components/icons/index.js';
import { uiIcons } from '../../lib/iconSemantics.js';
import { momentsApi } from '../../lib/appApi.js';
import { useAppContext } from '../../components/app/AppContext.js';
import { PageHeader } from '../../components/app/PageHeader.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { Drawer } from '../../components/Drawer.js';
import { toast } from 'sonner';
import { useNotificationStore } from '../../state/notification.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';

type MomentType = 'everyday' | 'milestone' | 'celebration' | 'firsts';
type Moment = {
  id: string;
  title?: string;
  description?: string;
  momentType?: MomentType;
  location?: string;
  createdAt?: string;
  media?: Array<{ id: string; url?: string | null; fileName?: string; mimeType?: string }>;
};

type ApiErrorShape = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const momentTypeConfig: Record<MomentType, { iconName: IconName; color: string; bg: string; border: string }> = {
  everyday: { iconName: uiIcons.leaf, color: 'text-primary-fg', bg: 'bg-primary-100', border: 'border-primary-200' },
  milestone: { iconName: uiIcons.star, color: 'text-secondary-700', bg: 'bg-secondary-100', border: 'border-secondary-200' },
  celebration: { iconName: uiIcons.partyPopper, color: 'text-pink-700', bg: 'bg-pink-100', border: 'border-pink-200' },
  firsts: { iconName: uiIcons.gift, color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
};

export const MomentsPage = () => {
  const { t } = useTranslation();
  const { activeFamily } = useAppContext();
  const getTodayDateInputValue = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toMomentIso = (dateValue: string) => new Date(`${dateValue}T00:00:00`).toISOString();

  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [momentType, setMomentType] = useState<MomentType>('everyday');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(getTodayDateInputValue());
  const [files, setFiles] = useState<File[]>([]);
  const [draggingOver, setDraggingOver] = useState(false);
  const [typeFilter, setTypeFilter] = useState<MomentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [previews, setPreviews] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toDateInputValue = (value?: string) => {
    if (!value) return getTodayDateInputValue();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return getTodayDateInputValue();
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatMomentDate = (value?: string) => {
    if (!value) return 'Date unavailable';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimelineMonth = (value?: string) => {
    if (!value) return 'Unknown date';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    const shapedError = error as ApiErrorShape;
    return shapedError.response?.data?.message || shapedError.message || fallback;
  };

  const loadMoments = useCallback(async () => {
    if (!activeFamily) return;
    setLoading(true);
    const data = await momentsApi.list(activeFamily.id, { limit: 24, offset: 0 });
    setMoments(data.moments ?? []);
    setLoading(false);
  }, [activeFamily]);

  useEffect(() => { loadMoments(); }, [loadMoments]);

  const createMoment = async () => {
    if (!activeFamily) return;
    setLoading(true);
    try {
      let res;
      const payload = { 
        title, 
        description, 
        momentType, 
        location, 
        createdAt: toMomentIso(date),
      };

      if (editingMoment) {
        res = await momentsApi.update(activeFamily.id, editingMoment.id, payload);
      } else {
        res = await momentsApi.create(activeFamily.id, payload);
      }

      for (const file of files) {
        const presign = await momentsApi.presign(activeFamily.id, { contentType: file.type, contentLength: file.size });
        await fetch(presign.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        await momentsApi.addMedia(activeFamily.id, editingMoment ? editingMoment.id : res.moment.id, { s3Key: presign.key, mimeType: file.type, fileName: file.name, fileSize: file.size, position: 0 });
      }

      resetForm();
      await loadMoments();

      const typeLabel = momentType.charAt(0).toUpperCase() + momentType.slice(1);
      const displayTitle = title || `${typeLabel} Moment`;
      useNotificationStore.getState().addNotification({
        type: 'success',
        title: editingMoment ? 'Moment Updated' : 'New Moment Captured!',
        message: `${typeLabel} moment "${displayTitle}" has been saved to your family vault.`,
      });

      toast.success(editingMoment ? 'Moment updated!' : 'Moment captured!', {
        description: `Successfully saved "${displayTitle}"`,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save this moment right now.'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setMomentType('everyday');
    setLocation('');
    setDate(getTodayDateInputValue());
    setFiles([]);
    setPreviews([]);
    setEditingMoment(null);
    setConfirmingDelete(false);
    setIsDrawerOpen(false);
    setStep(1);
  };

  const deleteMoment = async () => {
    if (!activeFamily || !editingMoment) return;
    setLoading(true);
    try {
      await momentsApi.delete(activeFamily.id, editingMoment.id);
      resetForm();
      await loadMoments();
      toast.success('Moment deleted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete this moment.'));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (moment: Moment) => {
    setIsDetailsDrawerOpen(false);
    setEditingMoment(moment);
    setTitle(moment.title || '');
    setDescription(moment.description || '');
    setMomentType(moment.momentType || 'everyday');
    setLocation(moment.location || '');
    setDate(toDateInputValue(moment.createdAt));
    if (moment.media?.[0]?.url) {
      setPreviews([moment.media[0].url]);
    } else {
      setPreviews([]);
    }
    setStep(2);
    setIsDrawerOpen(true);
  };

  const viewMomentDetails = async (moment: Moment) => {
    setSelectedMoment(moment);
    setIsDetailsDrawerOpen(true);

    if (!activeFamily) return;
    try {
      const response = await momentsApi.get(activeFamily.id, moment.id);
      if (response?.moment) {
        setSelectedMoment(response.moment);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load moment details.'));
    }
  };

  const filteredMoments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return moments
      .filter((moment) => (typeFilter === 'all' ? true : moment.momentType === typeFilter))
      .filter((moment) => {
        if (!query) return true;
        const searchBlob = [moment.title, moment.description, moment.location, moment.momentType].join(' ').toLowerCase();
        return searchBlob.includes(query);
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [moments, typeFilter, searchQuery]);


  if (!activeFamily) {
    return <div className="rounded-[28px] border border-border-light bg-surface p-6 shadow-sm"><p className="text-text-secondary">Create a family first to capture moments.</p></div>;
  }

  const momentSecondaryActions = (
    <button
      type="button"
      onClick={() => setIsDrawerOpen(true)}
      className="flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition-all hover:scale-[1.02] hover:bg-primary-700 active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-sm"
    >
      <Icon name={uiIcons.plus} className="h-4 w-4 sm:h-5 sm:w-5" alt="" /> {t('page.momentsCapture')}
    </button>
  );

  const momentTypeFilters: Array<MomentType | 'all'> = ['all', 'everyday', 'milestone', 'celebration', 'firsts'];

  return (
    <PageContainer verticalSpacing="normal" contentSpacing="none">
      <PageHeader title={t('moments.title')} subtitle={t('page.momentsSubtitle')} iconName={appAssetIcons.moments} className="!mb-1">
        {momentSecondaryActions}
      </PageHeader>
      <div className="pt-1">
        <div className="mb-4 w-full min-w-0 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex w-max min-w-full items-center gap-2 pr-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border-light bg-surface text-text-tertiary">
              <Icon name={uiIcons.filter} className="h-4 w-4" alt="" />
            </div>
            {momentTypeFilters.map((filterKey) => {
              const cfg = filterKey === 'all' ? null : momentTypeConfig[filterKey];
              const isActive = typeFilter === filterKey;
              return (
                <button
                  key={filterKey}
                  onClick={() => setTypeFilter(filterKey)}
                  className={`flex-shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? filterKey === 'all'
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20 translate-y-[-1px]'
                        : `${cfg?.bg ?? 'bg-primary-100'} ${cfg?.color ?? 'text-primary-300'} border ${cfg?.border ?? 'border-primary-200'}`
                      : 'border border-border-light bg-surface text-text-secondary hover:border-primary-300 hover:text-primary-400'
                  }`}
                >
                  {filterKey === 'all' ? t('common.all') : t(`moments.types.${filterKey}`)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="relative flex-1 max-w-sm">
            <Icon name={uiIcons.search} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" alt="" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('page.momentsSearchPlaceholder')}
              className="w-full rounded-xl border border-border-light bg-surface py-2 pl-9 pr-3 text-sm text-text-primary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200/60"
            />
          </div>
          
          <div className="flex items-center rounded-xl border border-border-light bg-surface p-1 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-10 items-center justify-center rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-primary-50 text-primary-700' : 'text-text-tertiary hover:text-text-secondary'
              }`}
              title={t('page.momentsGridView')}
            >
              <Icon name={uiIcons.grid} className="h-5 w-5 shrink-0" alt="" />
            </button>
            <button
              onClick={() => setViewMode('feed')}
              className={`flex h-8 w-10 items-center justify-center rounded-lg transition-all ${
                viewMode === 'feed' ? 'bg-primary-50 text-primary-700' : 'text-text-tertiary hover:text-text-secondary'
              }`}
              title={t('page.momentsFeedView')}
            >
              <Icon name={uiIcons.list} className="h-5 w-5 shrink-0" alt="" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-6 grid grid-cols-3 gap-1 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square animate-shimmer rounded-xl" />
            ))}
          </div>
        )}

        {!loading && filteredMoments.length === 0 && (
          <div className="mt-8 rounded-3xl border-2 border-dashed border-primary-100 bg-primary-50/30 p-12 text-center">
            <h3 className="mt-4 font-display text-2xl font-bold text-text-primary">No moments yet</h3>
            <p className="mx-auto mt-2 max-w-[280px] text-sm text-text-secondary">
              Capture your first family moment to start building your gallery.
            </p>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="btn-duo-green-sm mt-6 !font-semibold !normal-case !tracking-normal"
            >
              <Icon name={uiIcons.plus} className="h-4 w-4" alt="" />
              Capture moment
            </button>
          </div>
        )}

        {!loading && filteredMoments.length > 0 && (
          <div className="mt-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 gap-1 sm:gap-4">
                {filteredMoments.map((moment) => {
                  const cfg = momentTypeConfig[moment.momentType as MomentType] ?? momentTypeConfig.everyday;
                  return (
                    <div
                      key={moment.id}
                      onClick={() => viewMomentDetails(moment)}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-surface-light"
                    >
                      {moment.media?.[0]?.url ? (
                        <img
                          src={moment.media[0].url}
                          alt={moment.title || 'Moment'}
                          className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-90"
                        />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center ${cfg.bg}`}>
                          <Icon name={cfg.iconName} className={`h-8 w-8 ${cfg.color} opacity-40`} alt="" />
                        </div>
                      )}
                      
                      {/* Overlay info */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <div className="flex gap-4 text-white">
                          <div className="flex items-center gap-1.5">
                            <Icon name={uiIcons.star} className="h-5 w-5 brightness-0 invert" alt="" />
                            <span className="text-sm font-bold capitalize">{moment.momentType}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Type badge (visible) */}
                      {moment.momentType && moment.momentType !== 'everyday' && (
                        <div className="absolute right-2 top-2">
                          <div className={`rounded-lg p-1.5 backdrop-blur-md bg-surface-light/20 shadow-sm border border-surface-light/40`}>
                             <Icon name={cfg.iconName} className={`h-3 w-3 text-white`} alt="" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mx-auto max-w-lg space-y-8">
                {filteredMoments.map((moment) => {
                  const cfg = momentTypeConfig[moment.momentType as MomentType] ?? momentTypeConfig.everyday;
                  return (
                    <div
                      key={moment.id}
                      className="overflow-hidden rounded-3xl border border-border-light bg-surface shadow-sm"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${cfg.bg} border border-border-medium shadow-sm`}>
                            <Icon name={cfg.iconName} className={`h-5 w-5 ${cfg.color}`} alt="" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-text-primary capitalize">{moment.momentType}</h4>
                            <p className="text-[11px] font-medium text-text-tertiary">
                              {formatMomentDate(moment.createdAt)} {moment.location && `• ${moment.location}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(moment)}
                            className="rounded-full p-2 text-text-tertiary transition-colors hover:bg-primary-50 hover:text-primary-700"
                          >
                            <Icon name={uiIcons.plus} className="h-4 w-4 rotate-45" alt="" />
                          </button>
                        </div>
                      </div>

                      {/* Main Image */}
                      <div 
                        onClick={() => viewMomentDetails(moment)}
                        className="aspect-square cursor-pointer overflow-hidden bg-surface-light"
                      >
                        {moment.media?.[0]?.url ? (
                          <img
                            src={moment.media[0].url}
                            alt={moment.title || 'Moment'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className={`flex h-full w-full flex-col items-center justify-center gap-3 ${cfg.bg}`}>
                            <Icon name={cfg.iconName} className={`h-12 w-12 ${cfg.color} opacity-20`} alt="" />
                            <p className={`text-sm font-semibold ${cfg.color} opacity-60`}>Capture the moment</p>
                          </div>
                        )}
                      </div>

                      {/* Info Footer */}
                      <div className="p-4 pt-3">
                        {moment.title && (
                          <h3 className="mb-1 text-sm font-bold text-text-primary">{moment.title}</h3>
                        )}
                        {moment.description && (
                          <p className="text-sm leading-relaxed text-text-secondary line-clamp-2">
                             {moment.description}
                          </p>
                        )}
                        
                        <button 
                          onClick={() => viewMomentDetails(moment)}
                          className="mt-3 text-[11px] font-bold uppercase tracking-wider text-primary-400 hover:text-primary-300"
                        >
                          View full story
                        </button>
                      </div>
</div>
                    );
                  })}
                </div>
              )}
          </div>
        )}
      </div>

        {/* Capture Form in Drawer */}
        <Drawer
          open={isDrawerOpen}
          onClose={resetForm}
          title={editingMoment ? 'Edit moment' : step === 1 ? 'Choose an image' : 'Details'}
        >
          <div className="flex h-full flex-col">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-1 flex-col space-y-6"
                >
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
                    onDragLeave={() => setDraggingOver(false)}
                    onDrop={(e) => { 
                      e.preventDefault(); 
                      setDraggingOver(false); 
                      const droppedFiles = Array.from(e.dataTransfer.files);
                      setFiles(droppedFiles);
                      const newPreviews = droppedFiles.map(f => URL.createObjectURL(f));
                      setPreviews(newPreviews);
                    }}
                    className={`relative flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
                      draggingOver ? 'border-primary-400 bg-primary-50/50 scale-[0.99]' : 'border-border-light bg-surface hover:border-primary-300'
                    }`}
                  >
                    <input 
                      type="file" 
                      multiple 
                      ref={fileInputRef}
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files ?? []);
                        setFiles(selectedFiles);
                        const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
                        setPreviews(newPreviews);
                      }} 
                      className="absolute inset-0 cursor-pointer opacity-0" 
                    />
                    
                    {previews.length > 0 ? (
                      <div className="relative group w-full aspect-square max-w-[280px] mx-auto">
                        <img 
                          src={previews[0]} 
                          className="w-full h-full object-cover rounded-2xl shadow-lg border-4 border-border-medium" 
                          alt="Preview" 
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                          <p className="text-white text-sm font-bold">Change Image</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center text-primary-700 shadow-inner">
                          <Icon name={uiIcons.cloudUpload} className="h-10 w-10" alt="" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-text-primary">Upload your moment</p>
                          <p className="mt-1 text-sm text-text-tertiary">Drag & drop or click to browse</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <button 
                      onClick={resetForm}
                      className="flex-1 rounded-2xl border border-border-light py-4 text-sm font-bold text-text-secondary hover:bg-surface-light transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => setStep(2)}
                      disabled={files.length === 0 && !editingMoment}
                      className={`flex flex-[2] items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold text-white shadow-lg transition-all ${
                        files.length === 0 && !editingMoment ? 'bg-border-dark cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 active:scale-[0.98]'
                      }`}
                    >
                      Next <Icon name={uiIcons.arrowRight} className="h-4 w-4" alt="" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-1 flex-col space-y-6"
                >
                  {/* Media Preview on top */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-surface-light shadow-inner border-b border-border-light">
                    {previews.length > 0 ? (
                      <img src={previews[0]} className="h-full w-full object-cover" alt="Moment selection" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary-50">
                        <Icon name={uiIcons.camera} className="h-12 w-12 text-primary-200" alt="" />
                      </div>
                    )}
                    <button 
                      onClick={() => setStep(1)}
                      className="absolute top-4 left-4 p-2 bg-surface-light/90 backdrop-blur-sm rounded-xl text-text-primary shadow-sm hover:bg-surface transition-colors"
                    >
                      <Icon name={uiIcons.chevronLeft} className="h-5 w-5" alt="" />
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 space-y-6 pb-40 no-scrollbar overflow-y-auto">
                    <div className="space-y-4 px-1">
                      <div>
                        <input 
                          value={title} 
                          onChange={(e) => setTitle(e.target.value)} 
                          placeholder="Write a title (optional)"
                          className="w-full bg-transparent text-xl font-bold placeholder:text-text-tertiary focus:outline-none" 
                        />
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 border-b border-border-light pb-3">
                          <Icon name={uiIcons.leaf} className="h-5 w-5 text-primary-500" alt="" />
                          <input 
                            value={location} 
                            onChange={(e) => setLocation(e.target.value)} 
                            placeholder="Add location"
                            className="flex-1 bg-transparent text-sm focus:outline-none" 
                          />
                        </div>

                        <div className="flex items-center gap-3 border-b border-border-light pb-3">
                          <Icon name={uiIcons.calendar} className="h-5 w-5 text-secondary-500" alt="" />
                          <input 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)}
                            className="flex-1 bg-transparent text-sm focus:outline-none" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-tertiary">Select Type</label>
                        <div className="flex flex-wrap gap-2">
                          {(Object.entries(momentTypeConfig) as [MomentType, typeof momentTypeConfig[MomentType]][]).map(([value, cfg]) => (
                            <button 
                              key={value} 
                              onClick={() => setMomentType(value)}
                              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                momentType === value ? `${cfg.bg} ${cfg.color} border-current ring-2 ring-current ring-offset-2 ring-offset-background` : 'border-border-light bg-surface text-text-secondary hover:border-primary-200'
                              }`}
                            >
                              <Icon name={cfg.iconName} className="h-3.5 w-3.5" alt="" />
                              {value.charAt(0).toUpperCase() + value.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-surface p-4">
                        <textarea 
                          value={description} 
                          onChange={(e) => setDescription(e.target.value)} 
                          placeholder="What makes this moment special?"
                          className="w-full bg-transparent text-sm focus:outline-none" 
                          rows={4} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-surface border-t border-border-light rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    {confirmingDelete ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                        <span className="text-[13px] font-medium text-red-700">Delete this moment?</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmingDelete(false)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={deleteMoment}
                            disabled={loading}
                            className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {loading ? '…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={createMoment}
                          disabled={loading}
                          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-xl transition-all ${
                            loading ? 'bg-border-dark cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 active:scale-[0.98]'
                          }`}
                        >
                          {loading ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-primary/35 border-t-text-primary" />
                          ) : (
                            <>{editingMoment ? 'Update Moment' : 'Share Moment'}</>
                          )}
                        </button>
                        {editingMoment && (
                          <button
                            onClick={() => setConfirmingDelete(true)}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Icon name={uiIcons.trash} className="h-4 w-4 shrink-0" alt="" />
                            Delete moment
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Drawer>

        <Drawer
          open={isDetailsDrawerOpen}
          onClose={() => setIsDetailsDrawerOpen(false)}
          title={selectedMoment?.title || 'Moment details'}
        >
          {selectedMoment ? (
            <div className="space-y-4">
              {selectedMoment && selectedMoment.media?.[0]?.url && (
                <img
                  src={selectedMoment.media[0].url ?? ''}
                  alt={selectedMoment.title || 'Moment media'}
                  className="h-52 w-full rounded-xl object-cover"
                />
              )}
              <div className="rounded-xl border border-border-light bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {selectedMoment?.momentType || 'everyday'}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{formatMomentDate(selectedMoment?.createdAt)}</p>
                {selectedMoment?.location && <p className="mt-2 text-sm text-text-secondary">Location: {selectedMoment.location}</p>}
                {selectedMoment?.description && <p className="mt-3 text-sm leading-relaxed text-text-secondary">{selectedMoment.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => selectedMoment && startEdit(selectedMoment)}
                className="btn-duo-green w-full !min-h-11 !rounded-xl !px-4 !py-3 !text-sm !font-semibold !normal-case !tracking-normal"
              >
                Edit this moment
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedMoment || !activeFamily) return;
                  if (!window.confirm('Delete this moment? This cannot be undone.')) return;
                  try {
                    await momentsApi.delete(activeFamily.id, selectedMoment.id);
                    setIsDetailsDrawerOpen(false);
                    setSelectedMoment(null);
                    await loadMoments();
                    toast.success('Moment deleted');
                  } catch (error) {
                    toast.error(getErrorMessage(error, 'Unable to delete this moment.'));
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Icon name={uiIcons.trash} className="h-4 w-4 shrink-0" alt="" />
                Delete moment
              </button>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No details available for this moment.</p>
          )}
        </Drawer>
      </PageContainer>
    );
  };
