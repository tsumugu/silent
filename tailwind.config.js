/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      backdropBlur: {
        'apple': '20px',
      }
    }
  },
  plugins: []
}
