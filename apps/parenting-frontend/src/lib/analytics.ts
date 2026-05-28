import { OpenPanel } from '@openpanel/web';

const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

const clientId = import.meta.env.VITE_PUBLIC_OPENPANEL_CLIENT_ID as string | undefined;
const apiUrl = (import.meta.env.VITE_PUBLIC_OPENPANEL_API_URL as string | undefined) ?? 'https://openpanel-api.gazar.dev';

const op: OpenPanel | null = clientId && !isLocalhost
  ? new OpenPanel({
      apiUrl,
      clientId,
      trackScreenViews: true,
      trackOutgoingLinks: true,
      trackAttributes: true,
    })
  : null;

type Props = Record<string, unknown> | undefined;

export const analytics = {
  capture(event: string, properties?: Props) {
    op?.track(event, properties);
  },
  identify(profileId: string, properties?: Props) {
    op?.identify({ profileId, ...(properties as Record<string, unknown> | undefined) });
  },
  setPersonProperties(properties: Record<string, unknown>) {
    op?.setGlobalProperties(properties);
  },
  reset() {
    op?.clear();
  },
};

export const useAnalytics = () => analytics;
