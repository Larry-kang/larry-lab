import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('擷取桌機與手機各功能截圖', async ({ page, isMobile }) => {
  const dir = path.resolve(__dirname, '../../artifacts/screenshots', isMobile ? 'mobile' : 'desktop');
  fs.mkdirSync(dir, { recursive: true });

  const pagesToCapture = [
    { path: '/', name: 'home' },
    { path: '/tools/', name: 'tools' },
    { path: '/tools/mortgage/', name: 'tool-mortgage' },
    { path: '/tools/personal-loan/', name: 'tool-loan' },
    { path: '/tools/stock-pledge/', name: 'tool-pledge' },
    { path: '/tools/retirement/', name: 'tool-retirement' },
    { path: '/tools/portfolio/', name: 'tool-portfolio' },
    { path: '/recommendations/', name: 'recommendations' },
    { path: '/about/', name: 'about' },
  ];

  for (const p of pagesToCapture) {
    await page.goto(p.path);
    if (p.path.startsWith('/tools/') && p.path !== '/tools/') {
      await page.waitForSelector('#tool-root[data-ready="true"]', { timeout: 10000 });
    }
    // 全頁截圖
    await page.screenshot({ path: path.join(dir, `${p.name}.png`), fullPage: true });
    // 首屏截圖
    await page.screenshot({ path: path.join(dir, `${p.name}-fold.png`), fullPage: false });
  }
});
