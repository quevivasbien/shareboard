/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      cursor: {
        pencil: "url('/pencil.svg') 4 20, crosshair",
        eraser: "url('/eraser.svg') 8 20, crosshair",
        line: "crosshair",
      }
    },
  },
  plugins: [],
}

