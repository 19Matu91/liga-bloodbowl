/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blood: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#8B0000',
          600: '#7a0000',
          700: '#6b0000',
          800: '#5c0000',
          900: '#4d0000',
        },
        gold: {
          400: '#d4a017',
          500: '#B8860B',
          600: '#a07808',
        },
        dark: {
          800: '#1a1a1a',
          900: '#0d0d0d',
          950: '#080808',
        },
      },
    },
  },
  plugins: [],
};
