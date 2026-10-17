import { defineConfig } from 'astro/config';

// Cloudflare Pages 正式網址；預覽環境也使用正式網址作為 canonical。
export default defineConfig({
  site: 'https://larry-lab.pages.dev',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Keep scripts and styles as external files so the CSP can use `'self'` without inline allowances.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
