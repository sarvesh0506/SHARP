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
          950: '#090C12',
          900: '#121821',
          850: '#192230',
          800: '#192230',
          750: '#1E293B',
          700: '#1E293B',
          600: '#334155',
        },
        aurora: {
          main: 'var(--bg-main)',
          sidebar: 'var(--bg-sidebar)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          emerald: 'var(--accent-primary)',
          'emerald-hover': 'var(--accent-primary-hover)',
          cyan: 'var(--accent-secondary)',
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          critical: 'var(--status-critical)',
          text: 'var(--text-main)',
          muted: 'var(--text-muted)',
          border: 'var(--border-subtle)',
        },
        sharp: {
          emerald: '#10B981',
          blue: '#38BDF8',
          cyan: '#22D3EE',
          amber: '#F59E0B',
          rose: '#F43F5E',
          violet: '#7C3AED',
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
