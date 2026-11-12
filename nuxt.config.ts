export default defineNuxtConfig({
  compatibilityDate: '2026-02-26',
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  ssr: true, // 確保開啟 SSR
  nitro: {
    preset: 'cloudflare-pages',
    cloudflare: {
      dev: {
        persistDir: '.wrangler/state/v3',
      },
    },
  },
  app: {
    head: {
      title: '政大學生議會議案系統',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '國立政治大學學生議會議事資訊網站。' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/site-icon/favicon.ico' },
        {
          rel: 'apple-touch-icon',
          type: 'image/png',
          href: '/site-icon/apple-touch-icon.png',
          sizes: '180x180',
        },
        { rel: 'icon', type: 'image/png', href: '/site-icon/favicon-32x32.png', sizes: '32x32' },
        { rel: 'icon', type: 'image/png', href: '/site-icon/favicon-16x16.png', sizes: '16x16' },
        { rel: 'icon', type: 'image/svg+xml', href: '/site-logo/square-logo.svg' },
        { rel: 'manifest', href: '/site-icon/site.webmanifest' },
      ],
    },
  },
});
