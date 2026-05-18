import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/auth.js';
import { learningApi } from '../../lib/appApi.js';
import { PageContainer } from '../../components/app/PageContainer.js';
import { Icon } from '../../components/icons/index.js';
import { appAssetIcons } from '../../lib/appAssetIcons.js';
import { uiIcons } from '../../lib/iconSemantics.js';

type Phase = {
  id: string;
  title?: string | null;
  description?: string | null;
};

type Course = {
  id: string;
  title?: string | null;
  description?: string | null;
  phases?: Phase[];
};

export const AcademyPage = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await learningApi.getCourses();
      const list = Array.isArray(data)
        ? (data as Course[])
        : Array.isArray((data as { courses?: Course[] })?.courses)
          ? ((data as { courses: Course[] }).courses)
          : [];
      setCourses(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('academy.error.loadFailed', 'Could not load courses.'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (token) loadCourses();
  }, [token, loadCourses]);

  if (!token) {
    return (
      <PageContainer>
        <div className="rounded-2xl bg-surface-light p-6 text-center">
          <p className="text-[14px] font-semibold text-text-primary">
            {t('academy.signInPrompt', 'Sign in to access the Academy.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?next=/academy')}
            className="mt-3 rounded-xl bg-brand-blue px-4 py-2 text-[14px] font-bold text-white hover:brightness-110"
          >
            {t('home.nav.signIn', 'Sign in')}
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <header className="mb-2">
        <h1 className="text-[20px] font-extrabold text-text-primary">
          {t('academy.title', 'Academy')}
        </h1>
        <p className="mt-1 text-[13px] text-text-secondary">
          {t(
            'academy.subtitle',
            'Courses and lessons curated for your parenting journey.',
          )}
        </p>
      </header>

      {loading && (
        <p className="rounded-2xl bg-surface-light px-4 py-3 text-[13px] text-text-secondary">
          {t('common.loading', 'Loading...')}
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-500">
          {error}
        </p>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-text-primary">
            {t('academy.empty.title', 'No courses yet')}
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            {t(
              'academy.empty.body',
              'New material will appear here as it becomes available.',
            )}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {courses.map((course) => {
          const phaseCount = course.phases?.length ?? 0;
          return (
            <li key={course.id}>
              <Link
                to={`/academy/${course.id}`}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-4 transition-colors hover:border-brand-blue/40 hover:bg-surface-light"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                  <Icon
                    name={appAssetIcons.academy}
                    className="h-5 w-5 object-contain"
                    alt=""
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-text-primary">
                    {course.title || t('academy.untitledCourse', 'Untitled course')}
                  </p>
                  {course.description && (
                    <p className="mt-1 text-[13px] text-text-secondary leading-snug">
                      {course.description}
                    </p>
                  )}
                  {phaseCount > 0 && (
                    <p className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                      {t('academy.phaseCount', '{{count}} phases', { count: phaseCount })}
                    </p>
                  )}
                </div>
                <Icon
                  name={uiIcons.chevronRight}
                  className="mt-1 h-4 w-4 flex-shrink-0 object-contain opacity-60"
                  alt=""
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </PageContainer>
  );
};
