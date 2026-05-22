import * as Sentry from "@sentry/react";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import posthog from 'posthog-js';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';
import App from './App.js';
import { RoughEnhancer } from './components/rough/index.js';
import './i18n.js';
import './index.css';

// GlitchTip is Sentry-protocol compatible but doesn't support sessions or replay,
// so we only enable tracing + error capture. Production-only so dev noise stays out.
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
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

// Read prior analytics consent so PostHog stays opted-out until accepted.
// The CookieConsentBanner calls window.__initPostHog__() on accept to flip
// the switch; same lifecycle as GTM below.
const hasAnalyticsConsent: boolean = (() => {
  try {
    const stored = localStorage.getItem('cookie_consent');
    if (!stored) return false;
    const consent = JSON.parse(stored) as { analytics?: boolean };
    return consent.analytics === true;
  } catch {
    return false;
  }
})();

if (import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30',
    opt_out_capturing_by_default: !hasAnalyticsConsent,
    respect_dnt: true,
    // Autocapture: limit to high-signal elements only. We don't want every
    // keystroke or focus event flowing to PostHog, especially in chat inputs.
    autocapture: {
      element_allowlist: ['button', 'a'],
      dom_event_allowlist: ['click', 'submit'],
    },
    // Session replay: parenting questions are sensitive. Mask all input values
    // and any element tagged with data-ph-mask, including the chat conversation.
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: { password: true, email: true },
      maskTextSelector: '[data-ph-mask], textarea, .chat-message, .markdown-content',
    },
  });

  // Exposed to the cookie banner so it can opt the user in without importing
  // the SDK directly. Mirrors window.__initGTM__ below.
  (window as Window & { __initPostHog__?: () => void }).__initPostHog__ = () => {
    posthog.opt_in_capturing();
  };
}

// Only fire GTM on load if the user has already given analytics consent
if (hasAnalyticsConsent) initGTM();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <HelmetProvider>
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <RoughEnhancer />
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

