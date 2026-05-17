/** @type {import('tailwindcss').Config} */
/**
 * Raised · Pastel — lavender-grey canvas, mint primary, peach Growth,
 * dusty periwinkle accent. Matches design-system-proposal.html (canonical spec).
 */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Pastel canvas + surfaces */
        background: '#F8F9FE',
        surface: {
          DEFAULT: '#FFFFFF',
          light: '#F1F4FF',
          warm: '#E8EDFF',
        },
        primary: {
          50: 'rgba(150,230,179,0.12)',
          100: 'rgba(150,230,179,0.25)',
          200: 'rgba(150,230,179,0.35)',
          300: '#B7F0CC',
          400: '#96E6B3',
          500: '#52D68C',
          600: '#5FBF82',
          700: '#3d9e62',
          DEFAULT: '#96E6B3',
          /** Text / strokes on mint fills & light surfaces */
          fg: '#14532d',
        },
        secondary: {
          50: 'rgba(255,216,168,0.14)',
          100: 'rgba(255,216,168,0.22)',
          400: '#FFD8A8',
          500: '#FDBA74',
          DEFAULT: '#FFD8A8',
          fg: '#9a3412',
        },
        brand: {
          green: '#96E6B3',
          /** Interactive blue — darkened to #4F46E5 for WCAG AA compliance (was #7B8FFF, ~2.6:1) */
          blue: '#4F46E5',
          red: '#FF6B6B',
          yellow: '#FFD8A8',
          purple: '#C084FC',
          /** design-system-proposal.html — token table */
          periwinkle: '#D1D8FF',
          energy: '#FEE2E2',
          stars: '#E9D5FF',
          rhythm: '#FFEDD5',
        },
        hub: '#F8F9FE',
        'card-border': '#E0E7FF',
        quest: {
          /** Visible on white / surface — not surface-3 (too low contrast for tracks) */
          track: '#E2E8F0',
          fill: '#D1D8FF',
        },
        /** Top bar StatPills — each metric has its own ink (do not use brand.yellow + secondary.400: both are #FFD8A8) */
        gamification: {
          streak: '#EA580C',
          xp: '#6D28D9',
        },
        /** SUPER badge — only allowed gradient in UI */
        super: {
          from: '#be53f2',
          to: '#4481eb',
        },
        /** Full token reference — design-system-proposal.html #tokens */
        text: {
          primary: '#334155',
          secondary: '#475569',
          /** ≥AA on canvas + surface (avoid slate-300 for UI copy) */
          tertiary: '#475569',
          dimmed: '#475569',
          muted: '#64748B',
          /** Dark text on mint / gold tactile buttons */
          inverse: '#0a1f14',
        },
        border: {
          DEFAULT: '#E0E7FF',
          light: '#EEF2FF',
          medium: '#E0E7FF',
          dark: '#C7D2FE',
          focus: '#3730a3',
        },
        success: '#52D68C',
        warning: '#FDBA74',
        error: '#FF6B6B',
        info: '#4F46E5',
        cream: '#F8F9FE',
        accent: {
          blue: '#4F46E5',
          green: '#52D68C',
          blueHover: '#4338CA',
          greenHover: '#52D68C',
        },
        header: {
          blue: '#FFFFFF',
          background: '#F8F9FE',
        },
        pregnancy: {
          card: '#FFFFFF',
          cardDark: '#F1F4FF',
          progress: '#96E6B3',
          progressBg: 'rgba(150,230,179,0.25)',
          iconPulse: '#F1F4FF',
          iconHeart: '#FEE2E2',
          iconCart: '#FFD8A8',
          iconChart: '#7B8FFF',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '40px',
        '3xl': '48px',
      },
      fontSize: {
        xs: ['12px', { lineHeight: '18px' }],
        sm: ['14px', { lineHeight: '21px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '27px' }],
        xl: ['20px', { lineHeight: '30px' }],
        '2xl': ['24px', { lineHeight: '36px' }],
        '3xl': ['28px', { lineHeight: '42px' }],
        '4xl': ['32px', { lineHeight: '48px' }],
        '5xl': ['40px', { lineHeight: '60px' }],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      fontFamily: {
        /** Default UI + reading — DM Sans (Pastel) */
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        /** Gamification: buttons, badges, nav labels, Fredoka moments */
        game: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'system-ui', 'sans-serif'],
        /** Persian / RTL — Vazirmatn */
        persian: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(15, 23, 42, 0.06)',
        md: '0 4px 12px 0 rgba(15, 23, 42, 0.08)',
        lg: '0 8px 24px 0 rgba(15, 23, 42, 0.1)',
        xl: '0 16px 40px 0 rgba(15, 23, 42, 0.12)',
        none: 'none',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
        slow: '350ms',
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modal: '1040',
        popover: '1050',
        tooltip: '1060',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
  typography: (theme) => ({
    DEFAULT: {
      css: {
        '--tw-prose-body': theme('colors.text.secondary'),
        '--tw-prose-headings': theme('colors.text.primary'),
        '--tw-prose-lead': theme('colors.text.secondary'),
        '--tw-prose-links': theme('colors.brand.blue'),
        '--tw-prose-bold': theme('colors.text.primary'),
        '--tw-prose-counters': theme('colors.text.tertiary'),
        '--tw-prose-bullets': theme('colors.primary.500'),
        '--tw-prose-hr': theme('colors.border.DEFAULT'),
        '--tw-prose-quotes': theme('colors.primary.600'),
        '--tw-prose-quote-borders': theme('colors.primary.200'),
        '--tw-prose-captions': theme('colors.text.tertiary'),
        '--tw-prose-code': theme('colors.text.primary'),
        '--tw-prose-pre-code': theme('colors.text.primary'),
        '--tw-prose-pre-bg': theme('colors.surface.light'),
        '--tw-prose-th-borders': theme('colors.border.DEFAULT'),
        '--tw-prose-td-borders': theme('colors.border.DEFAULT'),
        maxWidth: 'none',
        fontFamily: theme('fontFamily.body').join(', '),
        fontSize: '18px',
        lineHeight: '1.75',
        p: { marginTop: '1.5em', marginBottom: '1.5em' },
        'h1, h2, h3, h4': {
          fontFamily: theme('fontFamily.heading').join(', '),
          fontWeight: '700',
          scrollMarginTop: '100px',
        },
        h2: {
          fontSize: '1.875rem',
          marginTop: '2.5em',
          marginBottom: '1em',
          lineHeight: '1.2',
        },
        h3: {
          fontSize: '1.5rem',
          marginTop: '2em',
          marginBottom: '0.75em',
          lineHeight: '1.3',
        },
        blockquote: {
          fontStyle: 'italic',
          borderLeftWidth: '4px',
          paddingLeft: '1.5rem',
          backgroundColor: theme('colors.surface.light'),
          padding: '1.5rem',
          borderRadius: '1rem',
          quotes: 'none',
        },
      },
    },
    lg: {
      css: {
        fontSize: '1.125rem',
        lineHeight: '1.8',
      },
    },
  }),
};
