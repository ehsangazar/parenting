# Raised Mobile (iOS + Android)

React Native app built with Expo, sharing business logic with the web frontend via `@parenting/shared`.

## Stack

- **Expo SDK 55** with New Architecture enabled
- **Expo Router** (file-based routing, similar to Next.js)
- **NativeWind v4** (Tailwind CSS utility classes in React Native)
- **expo-secure-store** (encrypted token storage on device)
- **@parenting/shared** (shared types, API client factory, Zustand store)

## Local development

```bash
# From repo root
pnpm dev:mobile

# Or directly
cd raised-mobile
pnpm start

# Open on device
pnpm ios      # requires Xcode
pnpm android  # requires Android Studio
```

## First-time EAS setup

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Link project: `eas init --id YOUR_PROJECT_ID`
4. Update `app.config.ts` with the project ID from the output above
5. Update `eas.json` submit section with your Apple ID, team ID, and ASC app ID

## Building

### Development build (for testing on real device)
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Preview build (TestFlight / internal track)
```bash
eas build --profile preview --platform all
```

### Production build
```bash
eas build --profile production --platform all
```

## Submitting to stores

### App Store (iOS)
```bash
eas submit --platform ios --latest
```
Requires:
- Apple Developer account ($99/yr)
- App created in App Store Connect
- `ascAppId` and `appleTeamId` in `eas.json`

### Google Play (Android)
```bash
eas submit --platform android --latest
```
Requires:
- Google Play Console account ($25 one-time)
- App created in Google Play Console
- Service account JSON key at `./google-play-service-account.json`

## Over-the-air updates (EAS Update)

Push JS updates without a full store release:
```bash
eas update --channel production --message "Fix login crash"
```

## App structure

```
app/
  _layout.tsx          Root layout — hydrates auth token on startup
  index.tsx            Redirect guard (login / onboarding / dashboard)
  (auth)/
    login.tsx          Email + password login
    register.tsx       New account creation
    onboarding.tsx     Post-signup feature intro
  (app)/
    _layout.tsx        Tab bar (guards: must be authenticated)
    dashboard.tsx      Home hub with streak, XP, next lesson
    learning.tsx       Course list
    family.tsx         Family profile and children
    community.tsx      Village posts
    profile.tsx        User profile and sign-out

lib/
  api.ts               Configured API client + all endpoint functions
  store.ts             Zustand auth store (backed by SecureStore)

components/            Shared UI primitives
hooks/                 Custom hooks
```
