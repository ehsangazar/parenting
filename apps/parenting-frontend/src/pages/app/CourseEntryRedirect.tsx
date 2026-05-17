import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppBase } from '../../hooks/useAppBase.js';
import { api } from '../../lib/api.js';
import {
  getFirstActionableModuleId,
  type OrderedModuleLike,
} from '../../lib/learningCourseOrder.js';

/** Old `/learning/course/:id` links redirect to the first module the user should work on. */
export const CourseEntryRedirect = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toApp } = useAppBase();

  useEffect(() => {
    if (!courseId) {
      navigate(toApp('/app/learning'), { replace: true });
      return;
    }
    (async () => {
      try {
        const res = await api.get('/api/learning/modules');
        const modules = (res.data.modules || []) as OrderedModuleLike[];
        const target = getFirstActionableModuleId(modules, courseId);
        if (target) navigate(toApp(`/app/learning/${target}`), { replace: true });
        else navigate(toApp('/app/learning'), { replace: true });
      } catch {
        navigate(toApp('/app/learning'), { replace: true });
      }
    })();
  }, [courseId, navigate]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center text-sm text-text-secondary">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      <p className="mt-4">Opening your lesson…</p>
    </div>
  );
};
