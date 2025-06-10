/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'rgb(229 231 235)', // gray-200
        'border-dark': 'rgb(75 85 99)', // gray-600
        background: 'rgb(255 255 255)', // white
        'background-dark': 'rgb(17 24 39)', // gray-900
        primary: {
          DEFAULT: 'rgb(37 99 235)', // blue-600
          dark: 'rgb(59 130 246)', // blue-500
        },
        secondary: {
          DEFAULT: 'rgb(107 114 128)', // gray-500
          dark: 'rgb(156 163 175)', // gray-400
        },
        card: {
          DEFAULT: 'rgb(255 255 255)', // white
          dark: 'rgb(31 41 55)', // gray-800
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} 