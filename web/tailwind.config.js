/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#E3F2FD', 100: '#BBDEFB', 500: '#2196F3', 700: '#1976D2', 900: '#0D47A1' },
      },
    },
  },
  plugins: [],
};
