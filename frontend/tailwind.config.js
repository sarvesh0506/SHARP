/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0D1311',
          900: '#16211D',
          850: '#1D2B26',
          800: '#1D2B26',
          750: '#24352F',
          700: '#2A3D36',
          600: '#3D544B',
        },
        sharp: {
          'deep-sage': '#5D7B6F',
          'soft-sage': '#A4C3A2',
          mint: '#B0D4B8',
          'warm-cream': '#EAE7D6',
          'ice-cyan': '#D7F9FA',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        surface: 'var(--shadow-surface)',
        elevated: 'var(--shadow-elevated)',
      }
    },
  },
  plugins: [],
}
