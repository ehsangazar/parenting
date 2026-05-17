/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        hub: '#131f24',
        'hub-card': '#1a2b33',
        'hub-border': '#37464f',
        'hub-accent': '#3db47b',
        'hub-accent-dim': '#2a7f56',
        'hub-muted': '#8fa4af',
        'hub-text': '#e8f0f3',
      },
    },
  },
  plugins: [],
};
