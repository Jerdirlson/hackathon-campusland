/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  // Forzamos modo claro — Ionic auto-detect rompe el diseño.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ml: {
          green:        '#6FBA2C',
          'green-dark': '#3F7A14',
          'green-light':'#D9F0C4',
          lime:         '#96BD0D',
          surface:      '#FFFFFF',
          bg:           '#F4F6F4',
          ink:          '#1B2A1A',
          'ink-2':      '#5C6B5A',
          'ink-3':      '#9AA89A',
          divider:      '#E4E8E2',
          tint:         '#EAF3DC',
          warn:         '#F4B400',
          danger:       '#D43A1F',
          info:         '#0E6BA8',
        },
      },
      fontFamily: {
        body:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'ml':    '16px',
        'ml-lg': '22px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
        hero: '0 14px 30px -10px rgba(63,122,20,0.55)',
        tab:  '0 16px 36px -10px rgba(15,26,12,0.6)',
      },
    },
  },
  plugins: [],
}
