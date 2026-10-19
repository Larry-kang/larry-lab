# SEO／GEO 自動同步計畫

使用者已核准既有網站的集中內容及靜態產生方案；本輪不改計算公式。

1. 新增型別化工具內容來源（標題、摘要、假設、公式、限制、問答、相關工具、內容日期）。使用現有工具清單作路由與名稱來源。
2. 先建立缺漏／錯誤日期／未知相關工具的測試，再實作純函式產生 JSON-LD、llms.txt 與 sitemap；建立產物測試驗證靜態 HTML、錨點與安全序列化。
3. 工具頁下方靜態呈現說明及問答，方法論提供固定錨點；首頁與工具頁加入符合可見內容的結構化資料，不建立評分或 FAQ／HowTo 複合式結果承諾。
4. 每次 Astro build 自動產生公開資料；CI 檢查未同步內容、錯誤連結與產物。lastmod 使用內容審核日期，不使用建置時間。
5. 完成 check、lint、unit、build、E2E、程式碼審查，再依既有 GitHub／Cloudflare 流程交付。

## 驗收

- 五工具關閉 JavaScript 仍能讀取用途、假設、公式、限制及問答；原互動工具及首屏不回歸。
- 首頁 WebSite、工具 WebApplication／BreadcrumbList 合法且無虛構評分，JSON-LD 安全序列化，不放寬 CSP 為 unsafe-inline。
- llms.txt 工具清單及方法論入口與集中內容一致；sitemap 排除 404 且日期合法，不加入 priority／changefreq。
- 異動工具／公式相關檔案時，CI 要求維護者檢查集中內容及更新日期；未取得正確日期不捏造。
- 不修改推薦連結、不新增追蹤、後端、付費 API 或搜尋帳號權限。

專屬 OG 圖、Search Console 驗證／提交、實際索引與 Core Web Vitals 現場資料屬第二階段，本輪不宣稱完成。llms.txt 為輔助導覽，不保證搜尋排名或 AI 引用。

參考：Google Search Central 的 AI features、Software app、sitemap 文件，Schema.org WebApplication 與 llmstxt.org 提案（2026-10-19 查核）。
