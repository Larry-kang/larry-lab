# 教學指南與 Agent 閱讀驗收

日期：2026-11-17。工作分支：`feat/guides-agent-reading`。初始工作由 `7a1b5e7` 開始；發布前已整合主線 `bda336a`。程式驗證版本為 `6bd92f25d9dd9243865ec0277e575bdba2fe71dd`，其後修訂本驗收文件，不修改已驗證的程式與文章。

正式交付與即時 CI／Cloudflare／合併 SHA 追蹤：[PR #27](https://github.com/Larry-kang/larry-lab/pull/27)。本機驗證、GitHub CI 與正式部署是三種不同證據，不以其中一種代替其他。

## 最終整合版實際驗證

| 指令／檢查 | 結果 |
| --- | --- |
| `npm ci` | PASS；依主線 lockfile 安裝，未新增或升級依賴 |
| `npm run check` | PASS：0 errors、0 warnings，1 個既有 ESLint deprecated hint |
| `npm run lint` | PASS |
| `npm test` | PASS：16 個檔案、159 項單元測試 |
| `npm run build` | PASS：28 個 HTML（27 個 index.html 與 404）；22 條 sitemap；九篇指南 HTML／Markdown／JSON-LD／內容目錄／llms 同步 |
| `npm run test:e2e` | PASS：156 項桌機與 360px 手機測試，約 1.6 分鐘 |
| `SEO_BASE_SHA=origin/main node scripts/check-seo-changes.mjs` | PASS：以整合時的主線為基準審核內容 |
| `git diff --check origin/main` | PASS：本輪差異無空白錯誤；主線原有的技能文件格式不屬本輪變更 |
| 公開新增文字檢查 | PASS：未發現機密格式、私人聯絡資訊或本機絕對路徑；未讀取機密檔案 |
| 唯讀程式審查 | 沒有程式發布阻擋項；已依建議統一最新驗收數字與交付版本 |

## 功能與回歸範圍

- 九篇指南具摘要、閱讀前提、目錄、來源、查核日期、前後篇、集中推薦連結與利益揭露。
- 停用 JavaScript 仍可閱讀；HTML 與 Markdown 正文一致；metadata、JSON、Article 日期與 sitemap 同源生成。
- 作者已要求隱藏公開技術入口：無 `/agents/` 頁面、頁尾／系列 Agent 入口及文章 Markdown 按鈕；保留程式閱讀所需資料與 metadata。技術說明位於 `AGENT_READING.md`。
- 保留主線四篇既有 `/articles/` 草稿、圖片功能、noindex／索引排除及工具介面修正；新 `/guides/` 提供公開的基礎短篇。沒有把既有草稿改成已發布。
- 手機第五個導覽項目仍採雙列且無橫向溢出；文章錨點標題不被 sticky header 遮擋。
- 既有五工具、方案比較、輸入、CSV、JSON、本機儲存、隱私與十八項推薦均完成回歸。公式與推薦碼未修改。

## 開發階段曾發生的問題

1. 新模組未建立時測試失敗；實作後通過。Node ESM 的 JSON 載入補上 import attribute 後通過。
2. 早期曾有一次 Markdown HTTP 非 200，當時並行啟動 Astro dev 且修改來源。停止 dev、重建並凍結來源後，focused 與最終完整回歸通過。單次 HTTP 異常根因未獲證實，若復發需保留狀態與回應內容追查。
3. 手機錨點可能遭多列導覽遮擋，已增加捲動留白並驗證實際座標。主線整合後另調整第五項導覽的字級與左右留白。

## 保留事項

- `npm audit` 回報主線既有 10 項 moderate，無 high／critical；本輪 package.json 與 lockfile 對主線無差異，未擅自執行 audit fix。不宣稱依賴完全無弱點。
- 金融帳戶資格、台灣地區核准、即時費率／收益、申請、入金、交易與提領：未執行（NOT RUN）。官方文件整理不能替代操作實測。
- 真人易用性、原生 200% 縮放及搜尋／AI 索引效果：未執行（NOT RUN）。
- 公開 MCP 僅完成研究，沒有啟用伺服器或遠端計算 API，也沒有 MCP 客戶端連接驗證。
- 不新增追蹤、CMS、付費模型、付費服務或金融帳戶操作。

## 發布核對

使用者已明確授權推送、PR、合併與 Cloudflare 發布。需在 PR 通過檢查後合併，並核對正式部署 SHA、公開路由、Markdown MIME、安全標頭與桌機／手機 smoke test。完成後將實際部署與正式站驗證證據記入 PR 的發布追蹤；未取得實際證據前不宣稱上線。
