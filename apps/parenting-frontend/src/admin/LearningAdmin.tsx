import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { api } from '../lib/api.js';
import { learningApi } from '../lib/appApi.js';
import { useAuth } from '../state/auth.js';
import { SideDrawer } from '../components/app/SideDrawer.js';

interface LearningCourse {
  id: string;
  title: string;
  description: string | null;
  order: number;
}

interface LearningPhase {
  id: string;
  title: string;
  description: string | null;
  order: number;
  _count?: { modules: number };
}

interface LearningModule {
  id: string;
  title: string;
  description: string | null;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  isGeneral: boolean;
  order: number;
  _count?: { lessons: number };
}

interface LearningLesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'audio' | null;
  order: number;
}

export const LearningAdmin = () => {
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<LearningCourse | null>(null);
  const [phases, setPhases] = useState<LearningPhase[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<LearningPhase | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState<LearningLesson | null>(null);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [isEditingPhase, setIsEditingPhase] = useState<LearningPhase | null>(null);

  // Form states
  const [phaseForm, setPhaseForm] = useState({
    title: '',
    description: '',
    order: 0,
  });
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    minAgeMonths: 0,
    maxAgeMonths: 12,
    isGeneral: false,
  });

  const [lessonForm, setLessonForm] = useState<{
    title: string;
    content: string;
    mediaType: 'image' | 'video' | 'audio';
    mediaUrl: string;
  }>({
    title: '',
    content: '',
    mediaType: 'image',
    mediaUrl: '',
  });

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/learning/courses');
      const fetchedCourses = res.data.courses || [];
      setCourses(fetchedCourses);
      setSelectedCourse(null); // Force selection on load
      setPhases([]);
      setModules([]);
    } catch (error) {
      toast.error('Failed to load learning courses');
    } finally {
      setLoading(false);
    }
  };

  const loadPhases = async (courseId: string) => {
    try {
      const res = await api.get(`/api/admin/learning/courses/${courseId}/phases`);
      const fetchedPhases = res.data.phases || [];
      setPhases(fetchedPhases);
      const nextPhase =
        fetchedPhases.find((p: LearningPhase) => p.id === selectedPhase?.id) ??
        fetchedPhases[0] ??
        null;
      setSelectedPhase(nextPhase);
      if (nextPhase) {
        await loadModules(nextPhase.id);
      } else {
        setModules([]);
        setSelectedModule(null);
      }
    } catch (error) {
      toast.error('Failed to load phases');
    }
  };

  const loadModules = async (phaseId: string) => {
    try {
      const res = await api.get(`/api/admin/learning/phases/${phaseId}/modules`);
      setModules(res.data.modules || []);
      setSelectedModule(null);
      setLessons([]);
    } catch (error) {
      toast.error('Failed to load learning modules');
    }
  };

  const loadLessons = async (moduleId: string) => {
    try {
      const res = await api.get(`/api/admin/learning/modules/${moduleId}/lessons`);
      setLessons(res.data.lessons || []);
    } catch (error) {
      toast.error('Failed to load lessons');
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreatePhase = async () => {
    if (!selectedCourse) return;
    try {
      await api.post(`/api/admin/learning/courses/${selectedCourse.id}/phases`, phaseForm);
      toast.success('Phase created successfully');
      setIsAddingPhase(false);
      setPhaseForm({ title: '', description: '', order: 0 });
      await loadPhases(selectedCourse.id);
    } catch (error) {
      toast.error('Failed to create phase');
    }
  };

  const handleUpdatePhase = async (id: string) => {
    if (!selectedCourse) return;
    try {
      await api.put(`/api/admin/learning/phases/${id}`, phaseForm);
      toast.success('Phase updated successfully');
      setIsEditingPhase(null);
      setPhaseForm({ title: '', description: '', order: 0 });
      await loadPhases(selectedCourse.id);
    } catch (error) {
      toast.error('Failed to update phase');
    }
  };

  const handleDeletePhase = async (id: string) => {
    if (!selectedCourse) return;
    if (!confirm('Are you sure? This will delete all modules and lessons in this phase.')) return;
    try {
      await api.delete(`/api/admin/learning/phases/${id}`);
      toast.success('Phase deleted');
      await loadPhases(selectedCourse.id);
    } catch (error) {
      toast.error('Failed to delete phase');
    }
  };

  const handleCreateModule = async () => {
    if (!selectedPhase) return;
    try {
      await api.post(`/api/admin/learning/phases/${selectedPhase.id}/modules`, moduleForm);
      toast.success('Module created successfully');
      setIsAddingModule(false);
      await loadModules(selectedPhase.id);
    } catch (error) {
      toast.error('Failed to create module');
    }
  };

  const handleUpdateModule = async (id: string) => {
    try {
      await api.put(`/api/admin/learning/modules/${id}`, moduleForm);
      toast.success('Module updated successfully');
      setIsEditingModule(false);
      if (selectedPhase) {
        await loadModules(selectedPhase.id);
      }
    } catch (error) {
      toast.error('Failed to update module');
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm('Are you sure? This will delete all lessons in this module.')) return;
    try {
      await api.delete(`/api/admin/learning/modules/${id}`);
      toast.success('Module deleted');
      if (selectedPhase) {
        await loadModules(selectedPhase.id);
      }
      if (selectedModule?.id === id) setSelectedModule(null);
    } catch (error) {
      toast.error('Failed to delete module');
    }
  };

  const handleCreateLesson = async () => {
    if (!selectedModule) return;
    try {
      await api.post(`/api/admin/learning/modules/${selectedModule.id}/lessons`, lessonForm);
      toast.success('Lesson added');
      setIsAddingLesson(false);
      loadLessons(selectedModule.id);
    } catch (error) {
      toast.error('Failed to add lesson');
    }
  };

  const handleUpdateLesson = async (id: string) => {
    try {
      await api.put(`/api/admin/learning/lessons/${id}`, lessonForm);
      toast.success('Lesson updated');
      setIsEditingLesson(null);
      if (selectedModule) loadLessons(selectedModule.id);
    } catch (error) {
      toast.error('Failed to update lesson');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await api.delete(`/api/admin/learning/lessons/${id}`);
      toast.success('Lesson deleted');
      if (selectedModule) loadLessons(selectedModule.id);
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const presignRes = await api.post('/api/admin/presign', {
        contentType: file.type,
        contentLength: file.size,
      });

      const { url, key } = presignRes.data;
      
      await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      setLessonForm(prev => ({ ...prev, mediaUrl: key, mediaType: type }));
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            Learning Studio
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary flex items-center gap-2">
            <Icon name={uiIcons.book} className="text-primary-500" alt="" /> Learning Management
          </h1>
          <p className="text-text-secondary font-medium">Create and manage courses, phases, modules, and lessons.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                const result = await learningApi.translateAll('fa');
                toast.success(`Queued ${result.queued} learning item(s) for FA translation`);
              } catch {
                toast.error('Translation queue failed');
              }
            }}
            className="btn-duo-outline-sm !px-4 !text-xs"
          >
            <Icon name={uiIcons.globe} className="h-4 w-4" alt="" /> Translate All (FA)
          </button>
        {selectedCourse && (
          <div className="flex items-center gap-3">
            <button
               onClick={() => {
                 setSelectedCourse(null);
                 setPhases([]);
                 setModules([]);
                 setSelectedPhase(null);
                 setSelectedModule(null);
                 setLessons([]);
               }}
               className="btn-duo-outline-sm flex items-center gap-2 !border-border !px-4 !font-semibold !normal-case !tracking-normal"
            >
               <Icon name={uiIcons.chevronRight} className="h-4 w-4 rotate-180" alt="" /> All Courses
            </button>
            <button
              onClick={() => {
                setIsAddingPhase(true);
                setPhaseForm({ title: '', description: '', order: phases.length + 1 });
              }}
              className="btn-duo-surface-pill flex items-center gap-2 !rounded-xl !px-4 !py-2.5 !font-semibold"
            >
              <Icon name={uiIcons.plus} className="h-5 w-5" alt="" /> New Phase
            </button>
            <button
              onClick={() => {
                if (!selectedPhase) return;
                setIsAddingModule(true);
                setModuleForm({ title: '', description: '', minAgeMonths: 0, maxAgeMonths: 12, isGeneral: false });
              }}
              className="btn-duo-blue-sm flex items-center gap-2 !font-semibold !normal-case !tracking-normal"
            >
              <Icon name={uiIcons.plus} className="h-5 w-5" alt="" /> New Module
            </button>
          </div>
        )}
        </div>
      </div>

      {!selectedCourse ? (
        <div className="space-y-6">
           <h2 className="text-xl font-bold text-text-primary">Select a Course</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                 <div 
                   key={course.id}
                   onClick={() => {
                      setSelectedCourse(course);
                      loadPhases(course.id);
                   }}
                   className="group p-8 bg-surface border-2 border-border rounded-[32px] hover:border-primary-500 hover:shadow-2xl hover:shadow-primary-100 transition-all cursor-pointer relative overflow-hidden"
                 >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="relative">
                       <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600 mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                          <Icon name={uiIcons.book} className="h-8 w-8" alt="" />
                       </div>
                       <h3 className="text-2xl font-black text-text-primary mb-3 tracking-tight group-hover:text-primary-600 transition-colors">{course.title}</h3>
                       <p className="text-text-secondary font-medium leading-relaxed line-clamp-2">{course.description || 'Manage curriculum, lessons and educational content for this course.'}</p>
                       <div className="mt-8 flex items-center gap-2 text-primary-600 font-bold uppercase tracking-wider text-xs">
                          Enter Course Studio{' '}
                          <Icon
                            name={uiIcons.chevronRight}
                            className="h-4 w-4 transition-transform group-hover:translate-x-1"
                            alt=""
                          />
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      ) : (

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Phases + Modules */}
        <div className="lg:col-span-1 border border-border rounded-3xl bg-surface shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-border bg-surface-light/50">
            <div>
              <h2 className="font-black text-text-primary uppercase tracking-tighter text-xs flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-primary-500 rounded-full" /> {selectedCourse?.title} Phases
              </h2>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-text-tertiary">Loading...</div>
          ) : phases.length === 0 ? (
            <div className="p-8 text-center text-text-tertiary">No phases yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {phases.map((phase) => (
                <div key={phase.id} className={`transition-all duration-300 ${selectedPhase?.id === phase.id ? 'bg-surface-light' : ''}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedPhase(phase);
                          loadModules(phase.id);
                        }}
                        className={`group flex items-center gap-3 text-left transition-all ${
                          selectedPhase?.id === phase.id ? 'translate-x-1' : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                          selectedPhase?.id === phase.id 
                            ? 'bg-background text-white' 
                            : 'bg-surface-light text-text-tertiary group-hover:bg-surface-warm'
                        }`}>
                          {phase.order}
                        </div>
                        <div>
                          <h3 className={`font-black text-sm tracking-tight transition-colors ${
                            selectedPhase?.id === phase.id ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                          }`}>
                            {phase.title}
                          </h3>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setIsEditingPhase(phase);
                            setPhaseForm({
                              title: phase.title,
                              description: phase.description || '',
                              order: phase.order,
                            });
                          }}
                          className="p-1.5 text-text-tertiary hover:text-primary-600 hover:bg-surface rounded-lg transition-all"
                        >
                          <Icon name={uiIcons.pencil} className="h-3.5 w-3.5" alt="" />
                        </button>
                        <button
                          onClick={() => handleDeletePhase(phase.id)}
                          className="p-1.5 text-text-tertiary hover:text-error hover:bg-surface rounded-lg transition-all"
                        >
                          <Icon name={uiIcons.trash} className="h-3.5 w-3.5" alt="" />
                        </button>
                      </div>
                    </div>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-text-tertiary ml-11 -mt-1 opacity-70">
                    {phase._count?.modules ?? 0} modules
                  </p>
                  {selectedPhase?.id === phase.id && (
                    <div className="mt-4 ml-4 mr-4 mb-2 rounded-2xl border-2 border-border bg-surface shadow-sm divide-y divide-border overflow-hidden">
                      {modules.length === 0 ? (
                        <div className="p-4 text-center">
                           <div className="text-[10px] font-black uppercase text-text-dimmed">No modules</div>
                        </div>
                      ) : (
                        modules.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedModule(m);
                              loadLessons(m.id);
                            }}
                            className={`px-3 py-2 cursor-pointer transition-all duration-200 group border-l-4 ${
                              selectedModule?.id === m.id 
                                ? 'bg-primary-50/50 border-primary-500' 
                                : 'hover:bg-surface-light border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold transition-colors ${
                                selectedModule?.id === m.id ? 'text-primary-700' : 'text-text-secondary group-hover:text-text-primary'
                              }`}>{m.title}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModuleForm({
                                      title: m.title,
                                      description: m.description || '',
                                      minAgeMonths: m.minAgeMonths || 0,
                                      maxAgeMonths: m.maxAgeMonths || 0,
                                      isGeneral: m.isGeneral,
                                    });
                                    setSelectedModule(m);
                                    setIsEditingModule(true);
                                  }}
                                  className="p-1 text-text-tertiary hover:text-primary-600 bg-surface shadow-sm border border-border rounded-md"
                                >
                                  <Icon name={uiIcons.pencil} className="h-3.5 w-3.5" alt="" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteModule(m.id);
                                  }}
                                  className="p-1 text-text-tertiary hover:text-error600 bg-surface shadow-sm border border-border rounded-md"
                                >
                                  <Icon name={uiIcons.trash} className="h-3.5 w-3.5" alt="" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-[10px] font-bold text-text-tertiary">
                              <span className="flex items-center gap-1 opacity-60">
                                <Icon name={uiIcons.book} className="h-2.5 w-2.5" alt="" /> {m._count?.lessons}
                              </span>
                              {m.isGeneral ? (
                                <span className="text-primary-600/60 uppercase tracking-tighter">Foundational</span>
                              ) : (
                                <span>{m.minAgeMonths}-{m.maxAgeMonths} mos</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lessons List/Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedModule ? (
            <div className="border border-border rounded-3xl bg-surface shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between bg-surface-light/50">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{selectedModule.title} Lessons</h2>
                  <p className="text-sm text-text-secondary">Manage sequence and content for this module.</p>
                </div>
                <button
                  onClick={() => {
                    setLessonForm({ title: '', content: '', mediaType: 'image', mediaUrl: '' });
                    setIsAddingLesson(true);
                  }}
                  className="px-4 py-2 border border-border rounded-xl hover:bg-surface-light transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  <Icon name={uiIcons.plus} className="h-4 w-4" alt="" /> Add Lesson
                </button>
              </div>

              <div className="p-6">
                {lessons.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                    <Icon name={uiIcons.book} className="mx-auto mb-3 h-12 w-12 text-text-dimmed" alt="" />
                    <p className="text-text-tertiary font-medium">No lessons in this module yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lessons.map((l, index) => (
                      <div 
                        key={l.id} 
                        onClick={() => {
                          setLessonForm({
                            title: l.title,
                            content: l.content,
                            mediaType: l.mediaType || 'image',
                            mediaUrl: l.mediaUrl || '',
                          });
                          setIsEditingLesson(l);
                        }}
                        className="flex items-center gap-4 p-5 border-2 border-border rounded-3xl hover:border-primary-200 hover:bg-primary-50/20 cursor-pointer transition-all group"
                      >
                        {l.mediaType === 'image' && l.mediaUrl ? (
                          <div className="relative flex h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-border bg-surface">
                            <img
                              src={l.mediaUrl.startsWith('http') ? l.mediaUrl : `/images/articles/${l.mediaUrl}`}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-0.5 right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded bg-black/55 px-1 text-[10px] font-black text-white">
                              {index + 1}
                            </span>
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-surface border-2 border-border text-text-tertiary font-black text-lg group-hover:border-primary-100 group-hover:text-primary-500 transition-all">
                            {index + 1}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-text-primary flex items-center gap-2 text-lg">
                            {l.title}
                            {l.mediaType === 'image' && <Icon name={uiIcons.image} className="h-4 w-4 text-primary-400" alt="" />}
                            {l.mediaType === 'video' && <Icon name={uiIcons.video} className="h-4 w-4 text-orange-400" alt="" />}
                            {l.mediaType === 'audio' && <Icon name={uiIcons.music} className="h-4 w-4 text-blue-400" alt="" />}
                          </h4>
                          <p className="text-sm text-text-secondary line-clamp-2 mt-1 font-medium leading-relaxed">
                            {l.content.substring(0, 160)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <div className="p-3 bg-surface border-2 border-border rounded-2xl text-primary-500 shadow-sm">
                            <Icon name={uiIcons.pencil} className="h-5 w-5" alt="" />
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLesson(l.id);
                            }}
                            className="p-3 bg-surface border-2 border-border rounded-2xl text-text-dimmed hover:text-error hover:border-red-100 shadow-sm transition-all"
                          >
                            <Icon name={uiIcons.trash} className="h-5 w-5" alt="" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-3xl bg-surface-light/30">
              <Icon name={uiIcons.book} className="mb-4 h-16 w-16 text-text-dimmed" alt="" />
              <h3 className="text-xl font-bold text-text-tertiary">Select a module</h3>
              <p className="text-text-tertiary text-center mt-2 max-w-xs">
                Choose a module from the left to manage its lessons and educational content.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Phase Drawer */}
      <SideDrawer
        isVisible={isAddingPhase || !!isEditingPhase}
        onClose={() => {
          setIsAddingPhase(false);
          setIsEditingPhase(null);
        }}
        header={
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface-light/50">
            <h3 className="text-xl font-black text-text-primary tracking-tight">
              {isEditingPhase ? 'Edit Phase' : 'New Phase'}
            </h3>
            <button
              onClick={() => {
                setIsAddingPhase(false);
                setIsEditingPhase(null);
              }}
              className="p-2 hover:bg-surface-warm rounded-full transition-colors"
            >
              <Icon name={uiIcons.close} className="h-5 w-5 text-text-secondary" alt="" />
            </button>
          </div>
        }
        footer={
          <div className="p-6 border-t border-border bg-surface-light/50 flex justify-end gap-3">
            <button
              onClick={() => {
                setIsAddingPhase(false);
                setIsEditingPhase(null);
              }}
              className="btn-duo-outline-sm !px-6"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                isEditingPhase ? handleUpdatePhase(isEditingPhase.id) : handleCreatePhase()
              }
              className="btn-duo-green-sm !px-6 flex items-center gap-2"
            >
              <Icon name={uiIcons.save} className="h-4 w-4" alt="" />
              Save Phase
            </button>
          </div>
        }
      >
        <div className="p-8 space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-text-tertiary">Phase Title</label>
            <input
              type="text"
              value={phaseForm.title}
              onChange={(e) => setPhaseForm({ ...phaseForm, title: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-surface-light/30 focus:bg-surface focus:outline-none focus:border-primary-500/50 transition-all font-bold text-text-primary placeholder:text-text-dimmed"
              placeholder="e.g. Building the Ecosystem"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-text-tertiary">Description</label>
            <textarea
              value={phaseForm.description}
              onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-surface-light/30 focus:bg-surface focus:outline-none focus:border-primary-500/50 transition-all font-medium text-text-secondary leading-relaxed placeholder:text-text-dimmed min-h-[120px]"
              placeholder="What should parents learn during this phase?"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-text-tertiary">Ordering</label>
            <div className="flex items-center gap-4 p-4 bg-surface-light rounded-2xl">
              <Icon name={uiIcons.grip} className="text-text-dimmed" alt="" />
              <input
                type="number"
                value={phaseForm.order}
                onChange={(e) => setPhaseForm({ ...phaseForm, order: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-transparent border-none focus:ring-0 font-black text-text-secondary p-0 text-lg"
              />
            </div>
            <p className="text-[10px] text-text-tertiary pl-1">Phases are displayed in ascending order of this value.</p>
          </div>
        </div>
      </SideDrawer>

      {/* Module Drawer */}
      <SideDrawer
        isVisible={isAddingModule || isEditingModule}
        onClose={() => {
          setIsAddingModule(false);
          setIsEditingModule(false);
        }}
        header={
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface-light/50">
            <h3 className="text-xl font-black text-text-primary tracking-tight">
              {isEditingModule ? 'Edit Module' : 'New Module'}
            </h3>
            <button
              onClick={() => {
                setIsAddingModule(false);
                setIsEditingModule(false);
              }}
              className="p-2 hover:bg-surface-warm rounded-full transition-colors"
            >
              <Icon name={uiIcons.close} className="h-5 w-5 text-text-secondary" alt="" />
            </button>
          </div>
        }
        footer={
          <div className="p-6 border-t border-border bg-surface-light/50 flex gap-3">
            <button
              onClick={() => {
                setIsAddingModule(false);
                setIsEditingModule(false);
              }}
              className="btn-duo-outline-sm flex-1 !py-3"
            >
              Cancel
            </button>
            <button
              onClick={() => (isEditingModule && selectedModule ? handleUpdateModule(selectedModule.id) : handleCreateModule())}
              className="btn-duo-blue-sm flex-1 !py-3"
            >
              <Icon name={uiIcons.save} className="h-4 w-4" alt="" />
              {isEditingModule ? 'Save Module' : 'Create Module'}
            </button>
          </div>
        }
      >
        <div className="p-8 space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-text-tertiary">Module Title</label>
            <input
              type="text"
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-surface-light/30 focus:bg-surface focus:outline-none focus:border-border-focus/50 transition-all font-bold text-text-primary placeholder:text-text-dimmed"
              placeholder="e.g. Cognitive Milestones"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-text-tertiary">Description</label>
            <textarea
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-surface-light/30 focus:bg-surface focus:outline-none focus:border-border-focus/50 transition-all font-medium text-text-secondary leading-relaxed placeholder:text-text-dimmed min-h-[100px]"
              placeholder="What is this module about?"
            />
          </div>

          <div className="p-5 border-2 border-border rounded-2xl bg-surface-light/30 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isGeneral-drawer"
                checked={moduleForm.isGeneral}
                onChange={(e) => setModuleForm({ ...moduleForm, isGeneral: e.target.checked })}
                className="h-6 w-6 rounded-lg border-2 border-border text-brand-blue focus:ring-border-focus transition-all cursor-pointer"
              />
              <label htmlFor="isGeneral-drawer" className="font-bold text-text-secondary cursor-pointer">General / Foundational Module</label>
            </div>
            
            {!moduleForm.isGeneral && (
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-tertiary">Min Age (months)</label>
                  <input
                    type="number"
                    value={moduleForm.minAgeMonths}
                    onChange={(e) => setModuleForm({ ...moduleForm, minAgeMonths: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-xl border-2 border-border bg-surface focus:outline-none focus:border-brand-blue/50 font-bold text-brand-blue"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-tertiary">Max Age (months)</label>
                  <input
                    type="number"
                    value={moduleForm.maxAgeMonths}
                    onChange={(e) => setModuleForm({ ...moduleForm, maxAgeMonths: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-xl border-2 border-border bg-surface focus:outline-none focus:border-brand-blue/50 font-bold text-brand-blue"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SideDrawer>

      {/* Lesson Drawer */}
      <SideDrawer
        isVisible={isAddingLesson || !!isEditingLesson}
        onClose={() => {
          setIsAddingLesson(false);
          setIsEditingLesson(null);
        }}
        maxWidthClassName="max-w-3xl"
        header={
          <div className="p-6 border-b border-border flex items-center justify-between bg-surface-light/50">
            <h3 className="text-xl font-black text-text-primary tracking-tight">
              {isEditingLesson ? 'Edit Lesson' : 'Add New Lesson'}
            </h3>
            <button
              onClick={() => {
                setIsAddingLesson(false);
                setIsEditingLesson(null);
              }}
              className="p-2 hover:bg-surface-warm rounded-full transition-colors"
            >
              <Icon name={uiIcons.close} className="h-5 w-5 text-text-secondary" alt="" />
            </button>
          </div>
        }
        footer={
          <div className="p-6 border-t border-border bg-surface-light/50 flex gap-4">
            <button
              onClick={() => {
                setIsAddingLesson(false);
                setIsEditingLesson(null);
              }}
              className="btn-duo-outline-sm flex-1 !py-3.5 !font-black"
            >
              Discard Changes
            </button>
            <button
              onClick={() => isEditingLesson ? handleUpdateLesson(isEditingLesson.id) : handleCreateLesson()}
              className="btn-duo-green flex flex-[2] items-center justify-center gap-2 !min-h-[52px] !rounded-xl !px-4 !py-3.5 !text-sm !font-black"
            >
              <Icon name={uiIcons.save} className="h-5 w-5" alt="" />
              {isEditingLesson ? 'Save Changes' : 'Publish Lesson'}
            </button>
          </div>
        }
      >
        <div className="p-8 space-y-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-text-tertiary">Lesson Title</label>
              <input
                type="text"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                className="w-full px-6 py-5 rounded-3xl border-2 border-border bg-surface-light/30 focus:bg-surface focus:outline-none focus:border-primary-500 transition-all font-black text-xl text-text-primary placeholder:text-text-dimmed"
                placeholder="Hook them with a great title..."
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-text-tertiary">Educational Content</label>
                <textarea
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  className="w-full px-6 py-5 rounded-3xl border-2 border-border bg-surface-light/30 focus:bg-surface focus:outline-none focus:border-primary-500 transition-all font-medium text-text-secondary leading-relaxed placeholder:text-text-dimmed min-h-[400px] resize-none"
                  placeholder="Share the developmental science and tips..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-xs font-black uppercase tracking-wider text-text-tertiary">Visual Meta (AI Proof)</label>
                   <div className="p-6 rounded-3xl border-2 border-border bg-surface-light/20 space-y-6">
                    <div className="flex gap-2">
                      {(['image', 'video', 'audio'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setLessonForm(prev => ({ ...prev, mediaType: type }))}
                          className={`flex-1 flex flex-col items-center py-4 rounded-2xl border-2 transition-all ${
                            lessonForm.mediaType === type 
                              ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-sm' 
                              : 'border-border bg-surface text-text-tertiary hover:border-border-medium'
                          }`}
                        >
                          {type === 'image' && <Icon name={uiIcons.image} className="mb-1 h-6 w-6" alt="" />}
                          {type === 'video' && <Icon name={uiIcons.video} className="mb-1 h-6 w-6" alt="" />}
                          {type === 'audio' && <Icon name={uiIcons.music} className="mb-1 h-6 w-6" alt="" />}
                          <span className="text-[10px] font-black uppercase tracking-tighter">{type}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <input
                        type="file"
                        id="lessonFile-drawer"
                        className="hidden"
                        accept={lessonForm.mediaType === 'image' ? 'image/*' : lessonForm.mediaType === 'video' ? 'video/*' : 'audio/*'}
                        onChange={(e) => handleFileUpload(e, lessonForm.mediaType)}
                      />
                      <label 
                        htmlFor="lessonFile-drawer" 
                        className="block w-full px-4 py-4 border-2 border-dashed border-border rounded-2xl text-text-tertiary flex flex-col items-center gap-2 cursor-pointer hover:border-primary-300 hover:text-primary-500 transition-all bg-surface"
                      >
                        <Icon name={uiIcons.plus} className="h-6 w-6" alt="" />
                        <span className="text-xs font-bold">Replace {lessonForm.mediaType} asset</span>
                      </label>

                      {lessonForm.mediaUrl && (
                        <div className="p-4 bg-surface rounded-2xl border border-border overflow-hidden">
                          <div className="flex items-center gap-3 font-mono text-[10px] text-text-tertiary truncate">
                            <span className="shrink-0 font-bold text-primary-500 uppercase">Key:</span>
                            {lessonForm.mediaUrl}
                          </div>
                          {lessonForm.mediaType === 'image' && (
                             <div className="mt-3 aspect-video rounded-xl bg-surface-light overflow-hidden relative group">
                                <img 
                                  src={lessonForm.mediaUrl.startsWith('http') ? lessonForm.mediaUrl : `/images/articles/${lessonForm.mediaUrl}`} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                />
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-brand-blue/10 p-6 border-2 border-brand-blue/25">
                  <h4 className="text-brand-blue font-black text-sm mb-2">Writer&apos;s Tip</h4>
                  <p className="text-xs text-brand-blue/80 leading-relaxed font-medium">
                    Break down complex developmental concepts into actionable &quot;Gardener&apos;s Tasks&quot;. Use narrative examples to make the science feel personal and accessible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SideDrawer>
    </div>
  );
};
