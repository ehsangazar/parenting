/** @type {import('tailwindcss').Config} */
/**
 * Raised · Confident Calm (softened pastel) — cream-paper canvas, sage-teal
 * primary, warm-peach accent reserved for celebration moments. Primary and
 * secondary fills are still dark enough for WCAG AA white-text contrast;
 * pastel tints (-100/-200) live on light surfaces with dark `*-fg` text.
 */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Cream-paper canvas, white surfaces. Warmer than the prior #FBFAF7,
         *  pairs better with sage / peach without feeling clinical. */
        background: '#F9F4EC',
        surface: {
          DEFAULT: '#FFFFFF',
          light: '#F2EBDE',
          warm: '#EAE0CC',
        },
        /** Sage-teal — softer than deep teal, still passes white-on-fill AA at -500. */
        primary: {
          50: 'rgba(61,125,110,0.06)',
          100: 'rgba(61,125,110,0.14)',
          200: 'rgba(61,125,110,0.22)',
          300: '#9DC8BC',
          400: '#6FAA98',
          500: '#3D7D6E',
          600: '#2F665A',
          700: '#234D45',
          DEFAULT: '#3D7D6E',
          /** Text / strokes on sage tints */
          fg: '#1A3D37',
        },
        /** Warm peach / marigold — celebration only (streak, XP gain, weekly recap). */
        secondary: {
          50: 'rgba(189,115,56,0.08)',
          100: 'rgba(189,115,56,0.18)',
          400: '#E9A977',
          500: '#BD7338',
          DEFAULT: '#BD7338',
          fg: '#5C3211',
        },
        brand: {
          green: '#3D7D6E',
          /** Dusty blue — info / calendar / links (softer than steel #0369A1). */
          blue: '#5586A8',
          red: '#C75555',
          yellow: '#BD7338',
          'yellow-fg': '#5C3211',
          purple: '#9B7BBE',
          /** Dusty rose — Academy / Practice / Reminders category accent. */
          pink: '#BE7A93',
          'pink-fg': '#6E2940',
          periwinkle: '#B9C0E8',
          energy: '#F5D5CF',
          stars: '#E4D6E8',
          rhythm: '#F5DDC3',
        },
        hub: '#F9F4EC',
        'card-border': '#E8DFCB',
        quest: {
          track: '#E8DFCB',
          fill: '#3D7D6E',
        },
        /** Top-bar StatPills — each metric has its own ink (no collisions). */
        gamification: {
          streak: '#D77548',
          xp: '#9B7BBE',
        },
        /** SUPER badge — the only sanctioned gradient in the UI. */
        super: {
          from: '#3D7D6E',
          to: '#BD7338',
        },
        /** Warm dark text on cream canvas reads less clinical than pure navy. */
        text: {
          primary: '#1F1B16',
          secondary: '#4A453D',
          tertiary: '#736B5C',
          dimmed: '#A3998A',
          muted: '#5C5547',
          /** Text on filled sage / peach buttons */
          inverse: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E8DFCB',
          light: '#F0E8D6',
          medium: '#E8DFCB',
          dark: '#D4C8AE',
          focus: '#3D7D6E',
        },
        success: '#3D7D6E',
        warning: '#BD7338',
        error: '#C75555',
        info: '#5586A8',
        cream: '#F9F4EC',
        accent: {
          blue: '#5586A8',
          green: '#3D7D6E',
          blueHover: '#3F6E8B',
          greenHover: '#2F665A',
        },
        header: {
          blue: '#FFFFFF',
          background: '#F9F4EC',
        },
        pregnancy: {
          card: '#FFFFFF',
          cardDark: '#F2EBDE',
          progress: '#3D7D6E',
          progressBg: 'rgba(61,125,110,0.18)',
          iconPulse: '#F2EBDE',
          iconHeart: '#F5D5CF',
          iconCart: '#F5DDC3',
          iconChart: '#5586A8',
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
        '4xl': ['32px', { lineHeight: '44px' }],
        '5xl': ['40px', { lineHeight: '52px' }],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        /** Fredoka — RESERVED for celebration moments only. Do not use on regular CTAs. */
        game: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'system-ui', 'sans-serif'],
        persian: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        '3xl': '28px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(70, 60, 45, 0.06)',
        md: '0 4px 12px 0 rgba(70, 60, 45, 0.07)',
        lg: '0 8px 24px 0 rgba(70, 60, 45, 0.10)',
        xl: '0 16px 40px 0 rgba(70, 60, 45, 0.12)',
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
