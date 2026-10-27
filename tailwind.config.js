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
        band: {
          green: '#15803d',
          yellow: '#ca8a04',
          orange: '#ea580c',
          red: '#dc2626',
          black: '#171717'
        }
      }
    },
  },
  plugins: [],
}
