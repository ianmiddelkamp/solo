/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        // A brief indigo pulse at the start of each 20s cycle, otherwise idle — draws the eye to
        // help buttons periodically without a constant, distracting animation.
        'help-shimmer': {
          '0%': { boxShadow: '0 0 0 5px rgba(99, 102, 241, 0.3)', borderColor: '#818cf8' },
          '4%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)', borderColor: '#d1d5db' },
        },
      },
      animation: {
        'help-shimmer': 'help-shimmer 20s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

