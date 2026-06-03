/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Inter', ...require('tailwindcss/defaultTheme').fontFamily.sans],
        form: ['Poppins', 'Inter', ...require('tailwindcss/defaultTheme').fontFamily.sans],
      },
      colors: {
        slate: colors.slate,
        form: {
          field: '#F3F3F3',
          primary: '#2B80EA',
          'primary-hover': '#2470D2',
        },
      },
      borderRadius: {
        'lg': '0.75rem', // 12px
        'md': '0.5rem',   // 8px
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
