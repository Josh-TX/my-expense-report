/** @type {import('tailwindcss').Config} */
module.exports = {
  important: true,
  darkMode: 'class',
  content: [
	"./src/app/**/*.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  prefix: "t-",
  experimental: {
    optimizeUniversalDefaults: true
  }
}

