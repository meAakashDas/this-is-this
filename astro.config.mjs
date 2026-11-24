// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://aakashdas.live',
  compressHTML: true,

  devToolbar: {
    enabled: false,
  },

  server: {
    host: true,
  },

  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 2500,
    },
  },
});
