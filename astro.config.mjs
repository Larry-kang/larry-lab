import { defineConfig } from 'astro/config';

// Static output for Cloudflare Pages. `site` is intentionally unset until the real URL is confirmed,
// so no fake canonical URL, sitemap or robots.txt is generated.
export default defineConfig({
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
