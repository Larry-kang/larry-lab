# Impeccable：文章區（ether.fi 新手系列）

沿用 PR #16 安裝的專案內 Impeccable（`.agents/skills/impeccable`，`.impeccable/config.json` telemetry off），以 `npm run build` + `npm run serve:dist` 的本機靜態產物掃描。

指令：`./.agents/skills/impeccable/scripts/impeccable detect http://localhost:4321/<path>`（另以 regex 掃 `src/pages/articles`、`src/styles/global.css`、`RecommendationPanel.astro`）。

範圍：`/articles/etherfi/`、`/articles/first-crypto-basics/`、`/articles/what-is-etherfi/`、`/articles/etherfi-cash-card-guide/`、`/recommendations/`（只改文章區 CSS，未動既有頁面樣式）。

## Detect：before → after

| 目標 | Before | After |
| --- | --- | --- |
| `/articles/etherfi/` | 0 anti-pattern；advisory `straggler` ×1 | 0 / 0 |
| `/articles/first-crypto-basics/` | 0；`straggler` ×1 | 0 / 0 |
| `/articles/what-is-etherfi/` | 0；`straggler` ×2 | 0 / 0 |
| `/articles/etherfi-cash-card-guide/` | 0；`unbalanced-heading` ×1、`straggler` ×1 | 0 / 0 |
| `/recommendations/` | 0 | 0 |
| `src/styles/global.css`（regex） | `side-tab` ×1（`.article-body blockquote { border-left: 4px solid #c9a227 }`） | 0 |

## Critique（新頁面）

1. 提醒區塊（blockquote）用粗左邊框 = side-tab AI slop，且色碼寫死、不屬於品牌 token。
2. 文章區顏色（徽章、表格框線）寫死 hex，未用 `--warn` / `--warn-bg` / `--line`。
3. 長中英混排標題在 360px 斷行不均；段落末行孤字。
4. 360px 下「作者／適合對象」兩欄 meta 擠壓，右欄每行僅 6–8 字，可讀性差。
5. 正面：麵包屑、目錄、官方來源、利益揭露與不保證收益、上下篇皆存在；無水平溢位；推薦卡「閱讀介紹」僅 ether.fi 一張。
6. 未處理（超出範圍）：行動版主選單換成兩行（全站 header，非本 PR 新頁）。

## Polish（僅文章區 CSS）

- blockquote 改為 `--warn-bg` 底色 + 圓角，移除粗左邊框；首末子元素去外距。
- 徽章改 `--warn-bg`/`--warn`，表格框線改 `--line`。
- `.article h1–h3`、系列卡標題 `text-wrap: balance`；段落／列表 `text-wrap: pretty`。
- `≤480px` 時 meta 改單欄（dt 在上、dd 在下）。
