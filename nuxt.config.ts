import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export default defineNuxtConfig({
  compatibilityDate: '2026-02-26',
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  ssr: true, // 確保開啟 SSR
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      dev: {
        persistDir: '.wrangler/state/v3',
      },
    },
  },
  hooks: {
    'nitro:init'(nitro) {
      nitro.hooks.hook('compiled', async () => {
        // Workers applies every matching _headers rule, so reset earlier cache values.
        const base = nitro.options.baseURL.replace(/\/$/, '');
        const rules = Object.entries(nitro.options.routeRules)
          .filter(([, rule]) => rule.headers)
          .sort(([a], [b]) => a.split('/').length - b.split('/').length)
          .map(([path, rule]) =>
            [
              base + path.replace('/**', '/*'),
              ...Object.entries(rule.headers!).flatMap(([name, value]) => [
                `  ! ${name}`,
                `  ${name}: ${value}`,
              ]),
            ].join('\n'),
          );

        await writeFile(join(nitro.options.output.publicDir, '_headers'), `${rules.join('\n')}\n`);
      });
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
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        {
          rel: 'apple-touch-icon',
          type: 'image/png',
          href: '/apple-touch-icon.png',
          sizes: '180x180',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/site-logo/square-logo.svg' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },
});
