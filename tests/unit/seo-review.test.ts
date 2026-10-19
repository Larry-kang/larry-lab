import { it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

it('CI 實際阻擋未審核的工具變更，允許同日 reviewNote 與無關文件變更', () => {
  const script = resolve('scripts/check-seo-changes.mjs');
  const fixture = mkdtempSync(join(tmpdir(), 'larry-seo-review-'));
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@users.noreply.github.com', ...args], { cwd: fixture, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = () => { git('add', '.'); git('commit', '-m', 'fixture'); return git('rev-parse', 'HEAD'); };
  try {
    mkdirSync(join(fixture, 'src/content'), { recursive: true });
    mkdirSync(join(fixture, 'src/lib/tools'), { recursive: true });
    const content = JSON.parse(readFileSync('src/content/tool-content.json', 'utf8'));
    writeFileSync(join(fixture, 'src/content/tool-content.json'), JSON.stringify(content));
    writeFileSync(join(fixture, 'src/content/page-updates.json'), readFileSync('src/content/page-updates.json'));
    git('init', '--quiet');
    const base = commit();
    writeFileSync(join(fixture, 'src/lib/tools/mortgage.ts'), '// changed\n'); commit();
    const check = () => execFileSync(process.execPath, [script], { cwd: fixture, env: { ...process.env, SEO_BASE_SHA: base }, stdio: ['ignore', 'pipe', 'pipe'] });
    expect(check).toThrow();
    content.mortgage.reviewNote = '本次核對後公式說明維持適用';
    writeFileSync(join(fixture, 'src/content/tool-content.json'), JSON.stringify(content)); commit();
    expect(check).not.toThrow();
    const docsBase = git('rev-parse', 'HEAD');
    writeFileSync(join(fixture, 'README.md'), '文件修訂'); commit();
    expect(() => execFileSync(process.execPath, [script], { cwd: fixture, env: { ...process.env, SEO_BASE_SHA: docsBase }, stdio: ['ignore', 'pipe', 'pipe'] })).not.toThrow();
  } finally {
    // 只清除本測試剛建立且位於系統暫存目錄的專用 fixture。
    if (resolve(fixture).startsWith(resolve(tmpdir()) + '\\larry-seo-review-') || resolve(fixture).startsWith(resolve(tmpdir()) + '/larry-seo-review-')) rmSync(fixture, { recursive: true, force: true });
  }
});
