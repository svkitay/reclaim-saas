/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          900: '#0B1120',
          500: '#0EA5E9',
        }
      }
    }
  },
  plugins: []
};
