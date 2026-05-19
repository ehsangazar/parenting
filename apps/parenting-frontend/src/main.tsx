import * as Sentry from "@sentry/react";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import posthog from 'posthog-js';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';
import App from './App.js';
import './i18n.js';
import './index.css';

// GlitchTip is Sentry-protocol compatible but doesn't support sessions or replay,
// so we only enable tracing + error capture. Init only when a DSN is configured.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/raised\.info/, /^https:\/\/parenting-frontend\.gazar\.dev/],
    sendDefaultPii: true,
  });
}

function initGTM() {
  if (!import.meta.env.VITE_GOOGLE_TAG_ID || !import.meta.env.PROD) return;
  const scriptroot = document.createElement("script");
  scriptroot.async = true;
  scriptroot.src = `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GOOGLE_TAG_ID}`;
  document.head.appendChild(scriptroot);

  const script = document.createElement("script");
  script.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${import.meta.env.VITE_GOOGLE_TAG_ID}');
  `;
  document.head.appendChild(script);
}

// Expose so the consent banner can call it post-acceptance without a module import
(window as Window & { __initGTM__?: () => void }).__initGTM__ = initGTM;

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
});

// Only fire on load if the user has already given analytics consent
try {
  const stored = localStorage.getItem('cookie_consent');
  if (stored) {
    const consent = JSON.parse(stored) as { analytics?: boolean };
    if (consent.analytics === true) initGTM();
  }
} catch {
  // corrupted storage — leave GTM uninitialised
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <HelmetProvider>
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <App />
          </BrowserRouter>
        </HelmetProvider>
      </PostHogErrorBoundary>
    </PostHogProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Manual registration with error handling to prevent unhandled rejections.
  // Skip in dev: Vite serves HTML for /sw.js so registration fails with wrong MIME type.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  });

  let hasRefreshed = false;

  const applyUpdateIfWaiting = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  let lastCheck = 0;
  const CHECK_INTERVAL = 1000 * 60 * 5; // 5 minutes

  const checkForUpdates = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheck < CHECK_INTERVAL) {
      return;
    }
    lastCheck = now;
    
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return;
    }

    try {
      await registration.update();
      await applyUpdateIfWaiting();
    } catch (err) {
      console.debug('SW update check failed:', err);
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdates();
    }
  };

  // When the app is opened or brought back to foreground, check for fresh deploys.
  window.addEventListener('pageshow', () => void checkForUpdates());
  window.addEventListener('focus', () => void checkForUpdates());
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Reload once when a new SW takes control so users see the latest version.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasRefreshed) {
      return;
    }
    hasRefreshed = true;
    window.location.reload();
  });

  void checkForUpdates();
}

