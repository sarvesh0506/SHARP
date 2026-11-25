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
          950: '#0B1020',
          900: '#151D32',
          850: '#1B2540',
          800: '#1B2540',
          750: '#26324A',
          700: '#26324A',
          600: '#334155',
        },
        aurora: {
          main: 'var(--bg-main)',
          sidebar: 'var(--bg-sidebar)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          violet: 'var(--accent-primary)',
          'violet-hover': 'var(--accent-primary-hover)',
          cyan: 'var(--accent-secondary)',
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          critical: 'var(--status-critical)',
          text: 'var(--text-main)',
          muted: 'var(--text-muted)',
          border: 'var(--border-subtle)',
        },
        sharp: {
          blue: '#7C3AED',
          violet: '#7C3AED',
          cyan: '#22D3EE',
          emerald: '#34D399',
          amber: '#F59E0B',
          rose: '#F43F5E',
          indigo: '#7C3AED',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
