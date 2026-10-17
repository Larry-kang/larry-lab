import { clearAllTools } from '../lib/storage';

// Copy buttons for referral codes. If the clipboard is unavailable the code stays selectable text.
document.addEventListener('click', async (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-copy]');
  if (target) {
    const code = target.dataset.copy ?? '';
    try {
      await navigator.clipboard.writeText(code);
      target.textContent = '已複製';
    } catch {
      const holder = target.closest('li');
      const codeEl = holder?.querySelector('code');
      if (codeEl) {
        const range = document.createRange();
        range.selectNodeContents(codeEl);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      target.textContent = '請手動複製（已選取）';
    }
    return;
  }
  const clear = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-clear-all]');
  if (clear) {
    const removed = clearAllTools();
    const status = document.getElementById('clear-status');
    if (status) status.textContent = removed > 0 ? `已清除 ${removed} 筆本機儲存的工具設定。` : '目前瀏覽器內沒有儲存任何 Larry Lab 設定。';
  }
});

// Offers are removed once their stated end date has passed (Asia/Taipei end of day).
const now = Date.now();
document.querySelectorAll<HTMLElement>('[data-offer-expires]').forEach((el) => {
  const date = el.dataset.offerExpires;
  if (date && now > new Date(`${date}T23:59:59+08:00`).getTime()) el.remove();
});
