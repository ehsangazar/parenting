import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../state/auth.js';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { token, user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (!user) {
      api.get('/api/identity/me')
        .then((res) => {
          setUser(res.data.user);
        })
        .catch(() => {
          navigate('/login');
        });
    }

    setLoading(false);
  }, [token, user, navigate, setUser]);

  if (loading || !user) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const displayName = user.email?.split('@')[0] || 'Parent';

  return (
    <div className="p-8 text-text-primary">
      <div className="max-w-6xl mx-auto">
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-text-secondary">{todayLabel}</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-text-primary mt-2">
              Welcome back, {displayName}
            </h2>
            <p className="text-text-secondary mt-2 max-w-xl">
              Here is a gentle overview of your family wellness space. We keep everything calm, organized, and easy to act on.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary-50 text-secondary-700 px-3 py-1 text-sm border border-secondary-100">
              <span className="h-2 w-2 rounded-full bg-secondary-400"></span>
              3 open
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm text-text-secondary border border-border-light">
              Today
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-6">
            <div className="bg-surface rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Daily Overview</h3>
                <span className="text-xs text-text-secondary">Updated just now</span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border-light p-4 bg-background">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Check-ins</p>
                      <p className="text-xl font-semibold text-text-primary">2 today</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border-light p-4 bg-background">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6m8 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Tasks</p>
                      <p className="text-xl font-semibold text-text-primary">3 open</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border-light p-4 bg-background">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17l4 4 4-4m0-5a4 4 0 10-8 0" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary">Mood trend</p>
                      <p className="text-xl font-semibold text-text-primary">Steady</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Care Plan</h3>
                <span className="text-xs text-text-secondary">Week 12</span>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-start gap-4 rounded-xl border border-border-light p-4 bg-background">
                  <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2m0 14v2m-7-9h2m12 0h2m-2.879-6.121l1.414-1.414M7.465 16.95l-1.414 1.414m0-11.314l1.414 1.414m9.192 9.192l1.414 1.414" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">Morning routine</p>
                    <p className="text-sm text-text-secondary">Gentle start checklist for you and the kids.</p>
                  </div>
                  <span className="text-xs text-secondary-700 bg-secondary-50 px-2 py-1 rounded-full border border-secondary-100">Today</span>
                </div>
                <div className="flex items-start gap-4 rounded-xl border border-border-light p-4 bg-background">
                  <div className="h-10 w-10 rounded-xl bg-secondary-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">Family meal plan</p>
                    <p className="text-sm text-text-secondary">Two quick, balanced dinners with prep support.</p>
                  </div>
                  <span className="text-xs text-text-secondary bg-surface px-2 py-1 rounded-full border border-border-light">2 open</span>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Messages</h3>
                <button className="text-sm text-primary-700 hover:text-primary-600">View all</button>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-4 rounded-xl border border-border-light p-4 bg-background">
                  <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h8m-8 4h5m-3 6l-6-6V4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">Care team check-in</p>
                    <p className="text-sm text-text-secondary">We drafted a gentle bedtime reset based on last week.</p>
                  </div>
                  <span className="text-xs text-secondary-700 bg-secondary-50 px-2 py-1 rounded-full border border-secondary-100">New</span>
                </div>
                <div className="flex items-start gap-4 rounded-xl border border-border-light p-4 bg-background">
                  <div className="h-10 w-10 rounded-full bg-secondary-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">Sleep notes saved</p>
                    <p className="text-sm text-text-secondary">Your reflection was added to the family log.</p>
                  </div>
                  <span className="text-xs text-text-secondary bg-surface px-2 py-1 rounded-full border border-border-light">Done</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 grid gap-6">
            <div className="bg-surface rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Family Snapshot</h3>
                <span className="text-xs text-text-secondary">This week</span>
              </div>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Daily routine</span>
                  <span className="font-medium text-text-primary">On track</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Energy levels</span>
                  <span className="font-medium text-text-primary">Balanced</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Support network</span>
                  <span className="font-medium text-text-primary">Strong</span>
                </div>
              </div>
              <button type="button" className="btn-duo-green-pill mt-6 w-full">
                Start a check-in
              </button>
            </div>

            <div className="bg-surface rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Upcoming</h3>
                <span className="text-xs text-text-secondary">Next 7 days</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border-light p-3 bg-background">
                  <p className="text-sm font-medium text-text-primary">Parent coaching call</p>
                  <p className="text-xs text-text-secondary">Thursday · 10:00 AM</p>
                </div>
                <div className="rounded-xl border border-border-light p-3 bg-background">
                  <p className="text-sm font-medium text-text-primary">Wellness survey</p>
                  <p className="text-xs text-text-secondary">Saturday · 9:00 AM</p>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border-light shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Account</h3>
                <span className="text-xs text-text-secondary">Profile</span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-text-secondary">Email</p>
                  <p className="font-medium text-text-primary">{user.email}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Role</p>
                  <p className="font-medium text-text-primary capitalize">{user.role || 'User'}</p>
                </div>
                {user.createdAt && (
                  <div>
                    <p className="text-text-secondary">Member since</p>
                    <p className="font-medium text-text-primary">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  useAuth.getState().setToken(null);
                  useAuth.getState().setUser(null);
                  navigate('/login');
                }}
                className="btn-duo-outline-pill mt-6 w-full"
              >
                Sign out
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
