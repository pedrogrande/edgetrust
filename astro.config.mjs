import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://futuresedge.pro',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [
      tailwindcss({
        content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
      }),
    ],
  },
  output: 'server',
  adapter: cloudflare(),
});
