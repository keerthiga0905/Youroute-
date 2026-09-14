/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
          bg: '#0b0f19',
          card: '#111827',
          panel: '#1f2937',
          border: '#374151'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
