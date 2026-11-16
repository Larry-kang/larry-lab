# 教學指南與 Agent 閱讀驗收

日期：2026-11-17。工作分支：`feat/guides-agent-reading`；基準 commit：`7a1b5e7`。以下開發階段紀錄以本機工作目錄及靜態建置產物為驗證對象；最新整合驗證見下段。

## 發布前主線整合驗證

使用者已授權 push、PR、merge 與發布。整合主線 `bda336a`，保留四篇既有文章草稿、noindex 規則、工具介面與圖片功能；依現行主線重新安裝依賴並驗證。

- `npm ci`、`npm run check`、`npm run lint`、`npm test`、`npm run build`、`npm run test:e2e`：全部通過。
- 最終整合版：159 項單元測試、156 項桌機／手機 E2E；28 個 HTML 頁面（含四篇草稿、其系列頁與 404）、22 條 sitemap；草稿未進 sitemap／llms。
- `package.json`／`package-lock.json` 相對目前 main 沒有新增變更。`npm audit` 回報既有 10 項 moderate，無 high／critical；未擅自執行 audit fix 或升級套件。這是發布保留事項，不宣稱無弱點。
- 提交者使用 GitHub noreply。公開新增文字的機密格式與本機私人路徑檢查通過；沒有讀取機密檔案。
- PR／CI、合併 SHA 與 Cloudflare 結果以本輪 PR 的發布追蹤及實際正式站驗證為準；不得以本機通過當作已上線證據。

## 後續介面簡化

依作者指示取消公開 `/agents/` 頁面、頁尾／系列的 Agent 入口與文章可見的 Markdown 連結。資料出口與 HTML metadata 保留，技術說明移至 `AGENT_READING.md`。下方 144 項為前一版完整回歸紀錄；這次調整另執行型別、lint、152 單元、建置及八項桌機／手機指南與 SEO 測試，全部通過；建置為 23 個 HTML 頁面（含 404）、22 條 sitemap，並確認 `/agents/` 為 404、公開畫面無技術入口，但 Markdown metadata 與資料出口正常。

## 實際結果

| 指令／檢查 | 結果 |
| --- | --- |
| `npm run check` | PASS：0 errors、0 warnings，1 個既有 ESLint 設定 deprecated hint |
| `npm run lint` | PASS |
| `npm test` | PASS：15 個檔案、152 項測試 |
| `npm run build` | PASS：24 個 HTML 頁面（含 404）；23 條 sitemap；九篇指南 HTML、Markdown、JSON-LD、llms 與公開 JSON 同步 |
| `npm run test:e2e`（最後完整執行） | PASS：144 項，桌機與 360px 手機，約 1.6 分鐘 |
| `git diff --check` | PASS；Git 提示部分既有 CRLF 檔案後續會正規化為 LF，沒有空白錯誤 |
| 額外唯讀程式審查 | 無需立即修正的 finding；已依審查補齊計畫勾選與本紀錄 |

## 覆蓋範圍

- 九篇新手文章各有摘要、閱讀前提、目錄、來源、查核日期、推薦揭露與前後篇。資料來源於本輪以 ether.fi 官方文件 MCP 讀取，未登入或操作金融服務。
- 停用 JavaScript 仍可讀完整正文；所有文章的 Markdown 與 HTML 段落一致，JSON 目錄、Article 日期與 sitemap 同步。
- 推薦 CTA 保留集中資料中的完整 URL，與官方資料引用分開，使用 sponsored／noopener／noreferrer；未更換邀請碼。
- 新導覽、系列列表、閱讀順序、未知文章 404、手機無水平溢出及文章錨點不被導覽列遮擋。
- 回歸既有五工具、方案比較、輸入、CSV、JSON、本機儲存、隱私及十八項推薦呈現。

## 曾發生的失敗及處理

1. 新測試起初因尚未建立指南模組失敗；實作後通過。
2. Playwright 的 Node ESM 載入 JSON 要求 import attribute；補上 `with { type: 'json' }` 後通過。
3. 第一次全站執行為 143／144，有一次 Markdown HTTP 非 200；當時同時啟動 Astro dev 並修改來源。停止 dev、重新建置後，指南 4／4 及凍結來源的全站 144／144 通過。該單次 HTTP 異常根因未獲證實，不宣稱已定位為伺服器缺陷；若再發生需保留 HTTP 狀態與回應內容追查。
4. 手機畫面審閱發現多列導覽可能遮蔽文章錨點，增加手機捲動留白並以標題實際座標驗證。

## 未驗證與交付狀態

- 以下為開發階段的未驗證界線；Git／發布狀態以最新 PR 的交付追蹤為準。
- Cloudflare 正式環境的新增 Markdown MIME header 與路由：尚未部署（NOT_DEPLOYED）。
- 金融帳戶資格、台灣地區核准、即時費率／收益、申請、入金、交易及提領：未執行（NOT RUN），不保證成功或可用。
- 真實外部讀者易用性、原生 200% 縮放與搜尋／AI 索引：未執行（NOT RUN）。
- 公開 MCP：本輪僅研究；無端點部署、無 MCP Inspector 或真實客戶端連接測試。詳見 `PUBLIC_MCP_RESEARCH.md`。
- 不新增分析追蹤、CMS、付費模型或付費服務。

## 後續交付

使用者已同意本輪 push／PR／merge／Cloudflare 發布，依現行部署工作流程驗證 CI、正式路由、Markdown Content-Type 與資料出口。MCP 後端屬後續獨立施工範圍，不能把本次閱讀入口當成已上線的 MCP。
