/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#071C14',
          900: '#0B2A1E',
          800: '#103526',
          700: '#0D2E21',
          600: '#064E3B',
          500: '#047857',
        },
        gold: {
          100: '#FDF8E2',
          200: '#F9EAAB',
          300: '#F4D06F',
          400: '#E5C158',
          500: '#D4AF37',
          600: '#B8860B',
          700: '#996515',
          800: '#754C00',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        risk: {
          verylow: '#10b981',
          low: '#22c55e',
          moderate: '#f59e0b',
          high: '#f97316',
          veryhigh: '#ef4444'
        },
        dark: {
          bg: '#071C14',
          card: '#0B2A1E',
          panel: '#103526',
          border: '#064E3B'
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'serif'],
        display: ['Cinzel', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
