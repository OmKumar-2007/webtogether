import type { Config } from 'tailwindcss';

/**
 * Tailwind config for the WebTogether extension.
 *
 * The content script renders into a Shadow DOM, so Tailwind's class
 * detection must include the overlay source files. We use `cva`-style
 * utilities directly; Tailwind handles the actual CSS generation.
 */
export default {
  content: [
    './src/**/*.{ts,tsx}',
    './popup.html',
    './options.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wt: {
          bg: '#0b0d12',
          surface: '#13161d',
          surface2: '#1a1e27',
          border: '#272b38',
          muted: '#8b93a7',
          text: '#e7eaf3',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          success: '#10b981',
          danger: '#ef4444',
          warn: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-ring': 'pulseRing 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseRing: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '0', transform: 'scale(1.6)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
