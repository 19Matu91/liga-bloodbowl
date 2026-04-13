/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Rojo Blood Bowl — reservado para danger/acciones destructivas
        dragon: {
          200: '#fca5a5',
          300: '#f87171',
          400: '#ef4444',
          500: '#BB322F',
          600: '#a02a27',
          700: '#852220',
        },
        // REMAPEADO: "parchment" ahora son colores de texto oscuro sobre fondo claro
        parchment: {
          50:  '#ffffff',
          100: '#1a1a1a',   // texto principal (antes crema claro, ahora casi negro)
          200: '#2e2e2e',
          300: '#454545',
          400: '#6b6b6b',   // texto secundario/atenuado
          500: '#909090',
        },
        // REMAPEADO: "carbon" ahora son superficies claras (fondo EDM)
        carbon: {
          800: '#e2e2e2',   // borde/separador sutil
          850: '#ffffff',   // tarjetas (antes gris oscuro, ahora blanco)
          900: '#f3f3f3',   // fondo de página (igual que EDM: rgb(243,243,243))
          950: '#f3f3f3',   // fondo navbar (mismo que página, usa blur)
        },
        // Verde El Dragón de Madera — color principal de marca
        verde: {
          300: '#4da89f',
          400: '#006b65',
          500: '#004c48',   // --primary de dragondemadera.com
          600: '#003532',
          900: '#001a18',
        },
        // Terracota El Dragón de Madera — color secundario/acento
        terracota: {
          300: '#e8885a',
          400: '#d45800',
          500: '#ba4c00',   // --secondary de dragondemadera.com
          600: '#923c00',
        },
      },
      fontFamily: {
        // Gemunu Libre — cuerpo (igual que EDM: --default-font-family)
        sans:     ['"Gemunu Libre"', 'system-ui', 'sans-serif'],
        // Quicksand — headings h1/h2 (igual que EDM: --font-quicksand / font-display)
        display:  ['"Quicksand"', 'sans-serif'],
        // Frank Ruhl Libre — elementos serif especiales (logo wordmark, etc.)
        serif:    ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
