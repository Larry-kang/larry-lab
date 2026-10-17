import { mountTool } from '../lib/ui/engine';
import type { ToolDef } from '../lib/ui/types';

const loaders: Record<string, () => Promise<ToolDef>> = {
  mortgage: async () => (await import('../lib/tools/mortgage')).mortgageTool,
  'personal-loan': async () => (await import('../lib/tools/loan')).loanTool,
  'stock-pledge': async () => (await import('../lib/tools/pledge')).pledgeTool,
  retirement: async () => (await import('../lib/tools/retirement')).retirementTool,
  portfolio: async () => (await import('../lib/tools/portfolio')).portfolioTool,
};

const root = document.getElementById('tool-root');
const id = root?.dataset.tool ?? '';
const load = loaders[id];
if (root && load) {
  load()
    .then((def) => {
      mountTool(def, root);
      root.dataset.ready = 'true';
    })
    .catch(() => {
      root.textContent = '工具載入失敗，請重新整理頁面。';
    });
}
