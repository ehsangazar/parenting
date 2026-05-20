/** @type {import('tailwindcss').Config} */
/**
 * Raised · Confident Calm (Garden Morning). Pale-mint canvas, sage-teal
 * primary, warm peach reserved for celebration moments. Primary and secondary
 * -500 fills are still dark enough for WCAG AA-Large white-text contrast;
 * brighter peach lives in `secondary.400` for tints + ornament. Pastel tints
 * (-100/-200) live on light surfaces with dark `*-fg` text.
 */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Garden-mint canvas, white surfaces. Cool pastel paper that pairs
         *  with sage-teal primary and warm peach celebration. */
        background: '#EEF6F0',
        surface: {
          DEFAULT: '#FFFFFF',
          light: '#E3EFE6',
          warm: '#D2E5D7',
        },
        /** Sage-teal. -500 fills carry white text (AA-Large). */
        primary: {
          50: 'rgba(47,125,106,0.06)',
          100: 'rgba(47,125,106,0.14)',
          200: 'rgba(47,125,106,0.22)',
          300: '#9CC8BB',
          400: '#6DAA98',
          500: '#2F7D6A',
          600: '#225A4E',
          700: '#194038',
          DEFAULT: '#2F7D6A',
          /** Text / strokes on sage tints */
          fg: '#16332C',
        },
        /** Warm peach. -500 is the AA-Large fill; -400 carries the brighter
         *  "energy peach" used for tints + celebration accents. */
        secondary: {
          50: 'rgba(232,145,99,0.10)',
          100: 'rgba(232,145,99,0.22)',
          400: '#E89163',
          500: '#D87749',
          DEFAULT: '#D87749',
          fg: '#5C3211',
        },
        brand: {
          green: '#2F7D6A',
          /** Sky blue — info / calendar / links / user voice. */
          blue: '#4A8AB4',
          red: '#C75555',
          /** Honey — XP-adjacent accent, distinct from peach. */
          yellow: '#DDA94A',
          'yellow-fg': '#6E4E15',
          purple: '#9B7BBE',
          /** Dusty rose — Academy / Practice / Reminders category accent. */
          pink: '#D88BA0',
          'pink-fg': '#6E2940',
          periwinkle: '#B9C0E8',
          energy: '#F5D5CF',
          stars: '#E4D6E8',
          rhythm: '#F5DDC3',
        },
        hub: '#EEF6F0',
        'card-border': '#D7E5DA',
        quest: {
          track: '#D7E5DA',
          fill: '#2F7D6A',
        },
        /** Top-bar StatPills — each metric has its own ink (no collisions). */
        gamification: {
          streak: '#D77548',
          xp: '#9B7BBE',
        },
        /** SUPER badge — the only sanctioned gradient in the UI. */
        super: {
          from: '#2F7D6A',
          to: '#D87749',
        },
        /** Warm dark text on mint canvas reads less clinical than pure navy. */
        text: {
          primary: '#1F1B16',
          secondary: '#4A453D',
          tertiary: '#677570',
          dimmed: '#9CA29C',
          muted: '#545B53',
          /** Text on filled sage / peach buttons */
          inverse: '#FFFFFF',
        },
        border: {
          DEFAULT: '#D7E5DA',
          light: '#E3EFE6',
          medium: '#D7E5DA',
          dark: '#B8CDBE',
          focus: '#2F7D6A',
        },
        success: '#2F7D6A',
        warning: '#D87749',
        error: '#C75555',
        info: '#4A8AB4',
        cream: '#EEF6F0',
        accent: {
          blue: '#4A8AB4',
          green: '#2F7D6A',
          blueHover: '#3A7299',
          greenHover: '#225A4E',
        },
        header: {
          blue: '#FFFFFF',
          background: '#EEF6F0',
        },
        pregnancy: {
          card: '#FFFFFF',
          cardDark: '#E3EFE6',
          progress: '#2F7D6A',
          progressBg: 'rgba(47,125,106,0.18)',
          iconPulse: '#E3EFE6',
          iconHeart: '#F5D5CF',
          iconCart: '#F5DDC3',
          iconChart: '#4A8AB4',
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
        sm: '0 1px 2px 0 rgba(45, 60, 55, 0.06)',
        md: '0 4px 12px 0 rgba(45, 60, 55, 0.07)',
        lg: '0 8px 24px 0 rgba(45, 60, 55, 0.10)',
        xl: '0 16px 40px 0 rgba(45, 60, 55, 0.12)',
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
