import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Raised',
  slug: 'raised',
  extra: {
    apiUrl: process.env.API_URL ?? 'http://localhost:4000',
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',
    },
  },
  updates: {
    url: 'https://u.expo.dev/YOUR_EAS_PROJECT_ID',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
});
