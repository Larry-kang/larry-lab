# SEO／GEO 維護方式

## 日常修改位置

| 內容 | 來源 | 自動同步結果 |
| --- | --- | --- |
| 工具名稱、分類、用途、產出、路由 | `src/config/site.ts` | 頁面入口、description、結構化資料、llms.txt、sitemap |
| SEO 標題、假設、公式摘要、限制、問答、關聯工具、審核日期 | `src/content/tool-content.json` | 工具靜態正文、方法論快速摘要、title、JSON-LD 日期、llms 導覽、sitemap |
| 其他頁面的內容日期與審核備註 | `src/content/page-updates.json` | sitemap lastmod |
| 詳細數學定義與完整方法 | `docs/CALCULATION_CONTRACT.md`、`src/pages/methodology/index.astro` | 詳細內容仍須人工審核；方法論固定錨點提供各工具引用 |

`npm run build` 會在 Astro 建置後執行 `scripts/check-seo-output.mjs`。公開檔案是建置產物，不應另外手改 `dist/llms.txt` 或 sitemap。

新增工具時，同步新增工具清單、集中內容、頁面與方法論錨點。缺少內容、路由、日期或錨點會使測試／建置失敗。JSON-LD 由純函式產生並安全序列化，不新增評分、使用者評論或優惠保證。

## 日期與審核

`updatedAt` 表示可引用內容的實際更新／審核日期，不是部署時間。僅改 CSS、跑測試或重建網站，不應刷新全站日期。首頁、工具總覽及方法論的 sitemap 日期會納入最新工具內容日期。

GitHub CI 以事件的基礎 SHA 比較變更：修改工具頁、工具模組或共用計算模組時，要求對應集中內容有審核更新；共用模組及方法論變更會要求五工具一併確認。若公式與說明仍相符，同一天可保留日期並更新該工具 `reviewNote` 記錄核對原因。一般頁面同日修改可更新 `page-updates.json` 的 reviewNote。

這是防漏提醒，不是自動證明公式正確。新增模組時仍須維護檔案對應及測試；外部政策、優惠或官方來源變更不會由建置程式自動判斷，也不在部署時呼叫 AI 改寫金融內容。

## 驗證與限制

- `npm test`：缺漏、日期、相關工具、JSON-LD 序列化及 CI 審核阻擋行為。
- `npm run build`：五工具靜態正文／問答、方法論錨點、JSON-LD、llms.txt 與 11 個公開頁面的 sitemap 一致性。
- `npm run test:e2e`：關閉 JavaScript 的可讀性、問答展開、重新整理後的互動工具，以及既有五工具／推薦回歸。
- 正式發布後查核實際 HTTP 回應，不能以建置完成推論已索引或會被 AI 引用。

本輪維持共用 OG 圖。專屬分享圖、Search Console 帳號驗證／提交、Google 索引及使用者 Core Web Vitals 資料尚未處理。llms.txt 是輔助導覽文件，不是權限控制或排名保證；存取規則由 robots.txt／主機政策管理。

## 官方參考

- [Google AI 搜尋與網站](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Sitemap 指引](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google 軟體應用程式結構化資料](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Schema.org WebApplication](https://schema.org/WebApplication)
- [llms.txt 提案](https://llmstxt.org/)
