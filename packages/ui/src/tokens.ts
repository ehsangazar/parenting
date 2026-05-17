export const colors = {
  hub: '#131f24',
  hubCard: '#1a2b33',
  hubBorder: '#37464f',
  hubAccent: '#3db47b',
  hubAccentDim: '#2a7f56',
  hubMuted: '#8fa4af',
  hubText: '#e8f0f3',
  white: '#ffffff',
  errorRed: '#f87171',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// Tailwind class equivalents for web — keeps tokens in sync with CSS classes
export const tw = {
  bg: {
    hub: 'bg-hub',
    card: 'bg-hub-card',
    accent: 'bg-hub-accent',
  },
  text: {
    primary: 'text-hub-text',
    muted: 'text-hub-muted',
    accent: 'text-hub-accent',
    white: 'text-white',
  },
  border: 'border-hub-border',
} as const;
