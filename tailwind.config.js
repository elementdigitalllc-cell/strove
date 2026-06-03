/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        card: '#111113',
        border: '#27272a',
        ring: '#f97316',
        orange: {
          DEFAULT: '#f97316',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        amber: {
          DEFAULT: '#f59e0b',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        muted: '#71717a',
        fg: '#fafafa',
        violet: {
          DEFAULT: '#8b5cf6',
          300: '#c4b5fd',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(249,115,22,0.6)' },
          '70%': { boxShadow: '0 0 0 8px rgba(249,115,22,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(249,115,22,0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s infinite',
        marquee: 'marquee 28s linear infinite',
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
      },
      backgroundImage: {
        'orange-grad': 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
      },
    },
  },
  plugins: [],
};
