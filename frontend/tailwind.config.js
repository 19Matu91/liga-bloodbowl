/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dragon: {
          50:  '#fdf2f2',
          100: '#fce4e4',
          200: '#f9c0c0',
          300: '#f49090',
          400: '#ec5c5c',
          500: '#BB322F',  // rojo_dragon
          600: '#a02a27',
          700: '#852220',
          800: '#6b1b19',
          900: '#521413',
        },
        parchment: {
          50:  '#fdfcfb',
          100: '#F4F1EA',  // arena_pergamino
          200: '#e8e3d6',
          300: '#d9d2c0',
          400: '#c5bba6',
          500: '#a89e87',
        },
        carbon: {
          800: '#2a2a2a',
          850: '#222222',
          900: '#1A1A1A',  // negro_carbon
          950: '#111111',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
