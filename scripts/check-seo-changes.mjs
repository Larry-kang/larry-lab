import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// CI 傳入事件的基礎 SHA；首次 push／本機無比較基準時由產物檢查負責。
const base = process.env.SEO_BASE_SHA;
if (!base || /^0+$/.test(base)) {
  console.log('SEO 變更審核：無基礎版本，略過 Git 差異檢查；仍需執行產物驗證。');
} else {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const files = git('diff', '--name-only', base, 'HEAD').trim().split('\n');
  const contentPath = 'src/content/tool-content.json';
  const current = JSON.parse(readFileSync(contentPath, 'utf8'));
  let old;
  try { old = JSON.parse(git('show', `${base}:${contentPath}`)); } catch { old = null; }
  if (old) {
    const shared = files.some(path => /^src\/lib\/calculators\//.test(path) || path === 'src/components/ToolPage.astro' || path === 'src/pages/methodology/index.astro');
    for (const id of Object.keys(current)) {
      const affected = shared || files.some(path => path === 'src/config/site.ts' || path === `src/pages/tools/${id}/index.astro` || path === `src/lib/tools/${id === 'personal-loan' ? 'loan' : id === 'stock-pledge' ? 'pledge' : id}.ts`);
      if (affected && JSON.stringify(current[id]) === JSON.stringify(old[id])) throw new Error(`${id} 相關程式已修改，請審核工具內容並更新 updatedAt 或 reviewNote（同日可保留日期）。`);
    }
    const datePath = 'src/content/page-updates.json';
    const dates = JSON.parse(readFileSync(datePath, 'utf8'));
    const oldDates = JSON.parse(git('show', `${base}:${datePath}`));
    for (const route of Object.keys(dates)) {
      if (files.includes(`src/pages${route}index.astro`) && JSON.stringify(dates[route]) === JSON.stringify(oldDates[route])) throw new Error(`${route} 內容已變更，請審核 page-updates.json 的 updatedAt／reviewNote（同日可保留日期）。`);
    }
  }
  console.log('SEO 變更審核：PASS');
}
