# SEO／GEO 第一階段驗證

日期：2026-10-19。原始基準：`9e4d52c7da7410e1592f45ae4e88a700a8940761`。

## 實作與版本

- `dd4304e402a2559f382accb00c0a34e9d86afdf4`：集中工具內容、靜態說明、方法論摘要與固定錨點、WebSite／WebApplication／BreadcrumbList、llms.txt、內容審核日期與 CI 防漏檢查。
- `61c53bf5cb38e9193fc92319eda2460752fc3f30`：產物檢查依工具數量擴充；此版本重跑 SEO 6 項單元、建置／產物檢查與桌機／手機 4 項 SEO E2E 通過。
- 最終 CI、合併 commit 與 Cloudflare 正式部署結果記錄於本次 PR，避免以分支名稱代替不可變版本證據。

## 本機證據

| 項目 | 實際結果 |
| --- | --- |
| 型別檢查 | 73 檔、0 錯誤、0 警告、1 個既有 deprecated API 提示 |
| lint | PASS |
| 完整單元測試 | 13 檔、139 項 PASS（包含真實 Git fixture 的 CI 防漏案例） |
| 完整 E2E | 106 項 PASS；其後方法論摘要與檢查計數整理重跑 4 項 SEO E2E PASS，完整最新版本仍由 PR CI 再跑 |
| build | 12 個 HTML 頁面及靜態文字／XML endpoints；產物檢查 PASS |
| JSON-LD | 可解析、安全序列化、無虛構評分；404 不加入應用程式標記 |
| 關閉 JavaScript | 五工具用途、假設、公式、限制、問答均可讀，問答可展開 |
| 自動同步 | llms 清單、工具 metadata、方法論摘要及 sitemap 來自集中來源；錨點／路由缺漏會阻擋建置 |
| 時間資料 | 明確內容更新日，不使用 build 時間；同日可用 reviewNote 留下審核紀錄 |

新增說明位於互動工具下方；原本首屏、試算、推薦與 CSV 測試已納入完整 E2E。未修改公式、推薦資料、CSP 或新增後端／追蹤／付費依賴。

## 驗收界線

未執行（NOT RUN）：Google Rich Results Test／Search Console 帳號操作、原生 200% 縮放、真人探索性測試、現場 Core Web Vitals。

未知（UNKNOWN）：實際搜尋索引、排名變化、AI 搜尋是否引用。schema 與 llms.txt 成功產生不代表被搜尋引擎採用；沒有為滿足複合式結果檢測而建立假評分。專屬 OG 圖保留第二階段。

未來維護方式見 [SEO_MAINTENANCE.md](SEO_MAINTENANCE.md)。詳細公式仍需人工依計算契約核對；CI 防漏提醒不等於自動證明金融模型正確。
