import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'var(--font-inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
        jakarta: ['var(--font-plus-jakarta)', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(168, 85, 247, 0.18)',
        'glow-bright': '0 0 30px rgba(168, 85, 247, 0.45)',
        glass: '0 24px 80px rgba(0,0,0,0.24)',
        'glass-dark': '0 8px 32px rgba(0,0,0,0.55), 0 0 40px rgba(168,85,247,0.12)',
        panel: '0 0 0 1px rgba(168,85,247,0.08), 0 8px 32px rgba(0,0,0,0.55), 0 0 40px rgba(168,85,247,0.12)',
        'neon-sm': '0 0 12px rgba(168, 85, 247, 0.3)',
        'neon-md': '0 0 24px rgba(168, 85, 247, 0.4)',
        'neon-lg': '0 0 40px rgba(168, 85, 247, 0.5)',
      },
      colors: {
        surface: 'var(--bg-primary)',
        panel: 'var(--panel-bg)',
        'panel-card': 'var(--card-bg)',
        border: 'var(--glass-border)',
        accent: 'var(--purple-primary)',
        'accent-bright': 'var(--purple-bright)',
        'accent-soft': 'var(--purple-soft)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        purple: {
          deep: '#05010A',
          dark: '#0B0714',
          panel: 'rgba(15, 10, 30, 0.92)',
          card: 'rgba(18, 12, 35, 0.95)',
          primary: 'var(--purple-primary)',
          bright: 'var(--purple-bright)',
          soft: 'var(--purple-soft)',
          glow: 'rgba(168, 85, 247, 0.45)',
        },
        status: {
          critical: 'var(--status-critical)',
          active: 'var(--status-active)',
          pending: 'var(--status-pending)',
          done: 'var(--status-done)',
        },
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(circle at top left, rgba(168,85,247,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(124,58,237,0.12), transparent 35%)',
        'purple-glow': 'radial-gradient(circle at 50% 0%, rgba(168,85,247,0.25), transparent 60%)',
        'purple-radial': 'radial-gradient(circle at top left, rgba(168,85,247,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(124,58,237,0.12), transparent 35%)',
        'glass-gradient': 'var(--gradient-card)',
        'nav-gradient': 'linear-gradient(180deg, rgba(15,10,30,0.95) 0%, rgba(15,10,30,0.85) 100%)',
        'card-gradient': 'var(--gradient-card)',
        'active-tab': 'var(--gradient-active-tab)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '18px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;