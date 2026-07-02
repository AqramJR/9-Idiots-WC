/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pitch: {
          950: '#04120b',
          900: '#071a10',
          800: '#0c2818',
          700: '#123a22',
          600: '#194c2c',
        },
        turf: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        gold: {
          400: '#facc15',
          500: '#eab308',
        },
        chalk: {
          100: '#f4f7f5',
          300: '#c9d4cd',
          500: '#8ea297',
        },
      },
      fontFamily: {
        display: ['"Rajdhani"', '"Oswald"', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'pitch-lines': "repeating-linear-gradient(90deg, rgba(74,222,128,0.06) 0px, rgba(74,222,128,0.06) 1px, transparent 1px, transparent 80px)",
        'stadium-glow': 'radial-gradient(ellipse at top, rgba(34,197,94,0.18), transparent 60%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 24px rgba(74, 222, 128, 0.35)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out both',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
    },
  },
  plugins: [],
};
