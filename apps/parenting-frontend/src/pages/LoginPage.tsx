import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

/**
 * /login and /register are no longer real pages. They redirect into the chat
 * shell with an auth query param so AuthChat opens inline over ChatPanel.
 * Preserves the original `?next=...` so post-auth navigation still works for
 * deep links like /login?next=/calendar.
 */
export const LoginPage = ({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const next = searchParams.get('next') || '';

  const params = new URLSearchParams();
  params.set('auth', initialMode);
  if (next) params.set('next', next);

  return <Navigate to={`/?${params.toString()}`} replace state={location.state} />;
};
