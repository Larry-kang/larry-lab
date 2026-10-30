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

## 草稿 noindex（無 UI 變更）

- 僅在 `<head>` 為 `status: draft` 文章輸出 `<meta name="robots" content="noindex, follow">`，並自 sitemap／llms.txt 排除（依 frontmatter 狀態判斷，非 slug 清單）。
- 系列索引 `/articles/etherfi/`：系列內無任何已發布文章時同樣 noindex 並排除；有一篇發布即自動恢復。頁面仍可連入（推薦頁「閱讀介紹」保留）。
- 無可見 UI／CSS 變動，故未重跑 Impeccable detect。

## 插圖輪（PR #21，2026-10-29）

Detect（`impeccable detect --json`，本機 `serve:dist`）：

| 目標 | Before | After |
| --- | --- | --- |
| `/articles/what-is-etherfi/` | 0 / 0 | 0 / 0 |
| `/articles/first-crypto-basics/` | 0 / 0 | 0 / 0 |
| `/articles/etherfi-cash-card-guide/` | 0 / 0 | 0 / 0 |
| `src/styles/global.css` | 0 | 0 |

Critique：
1. figcaption 無樣式，與正文同字級同色，圖說與正文難區分。
2. 深色截圖直接貼在淺色底，無邊框，邊界模糊。
3. 直式長截圖（image3/5/6/7/8）在桌機滿版寬，單張高達 1,600px 以上，閱讀節奏被打斷。
4. 正面：皆有寬高屬性（無 CLS）、`loading="lazy"`、alt；360px 無水平溢位。

Polish（僅 `.article-body figure` 範圍）：圖片置中、`--line` 細邊框與 `--radius` 圓角、`max-height: min(80vh, 900px)` 等比例縮放；figcaption 改 `--muted`、0.875rem、置中、`text-wrap: pretty`。桌機直式圖高度由 >1,600px 降為 720px；手機寬度不變。

## 第 0 篇：加密貨幣與 BTC（2026-10-31）

Detect（`impeccable detect --json`，本機 `serve:dist`）：`/articles/crypto-and-btc-basics/` 0 findings；`/articles/etherfi/`（系列索引，新增第 0 篇）0 findings。

Critique（⚠️ DEGRADED: single-context，Playwright 量測）：320／375／1280px 皆無水平捲動（scrollWidth = clientWidth）；正文 16px／行高 1.65，桌機行寬約 627px；閱讀前提醒、免責聲明、作者觀點 TODO 皆以既有提醒區塊樣式呈現；無阻擋問題。唯一修正：標題中英間距與內文不一致（「加密貨幣與BTC」→「加密貨幣與 BTC」）。未改 CSS。
