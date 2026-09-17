module.exports = {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000024',
          50: '#F5F5F7',
          100: '#DCDCE2',
          200: '#A9A9BC',
          300: '#787895',
          400: '#49496F',
          500: '#1C1C4A',
          600: '#000024',
          700: '#000018',
          800: '#000010',
          900: '#00000A',
        },
        accent: {
          DEFAULT: '#E60012',
          light: '#FF4D5A',
        },
      },
    },
  },
  plugins: [],
};
