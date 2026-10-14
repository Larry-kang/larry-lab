# Larry Lab

公開的個人工具大全網站：財金、工程與生活實用工具，讓計算與決策更清楚。

第一版提供房貸、信貸、股票質押、退休及投資組合試算，搭配個人介紹與每頁共用的推薦連結區。使用者自行輸入資料；不串接作者的 Finance、銀行、券商或交易所帳戶。

## 目前狀態

2026-10-14：repository 與第一版規格已建立；尚無網站程式、CI 執行紀錄或 Cloudflare 部署。規格內的技術與 UX 選擇為可直接執行的設計基準，後續使用者指示可以修訂。

- [SPEC：第一版範圍、架構與驗收](SPEC.md)
- [計算契約：公式、時間約定與測試案例](docs/CALCULATION_CONTRACT.md)
- [Agent 工作規則](AGENTS.md)
- [交接：目標模式提示詞與完成條件](docs/AGENT_HANDOFF.md)
- [Cloudflare Pages 部署流程](docs/DEPLOYMENT.md)
- [Repository 設定基準](docs/REPOSITORY_SETTINGS.md)

## 第一版路由

首頁、工具總覽、房貸、信貸、股票質押、退休、投資組合、推薦總覽、關於我、計算方法、隱私說明，以及 404 頁。

## 開發基準

Astro 靜態輸出、TypeScript、npm lockfile；計算在瀏覽器執行。計算核心與畫面分開，使用 Vitest 驗證數值、Playwright 驗證使用流程。實作時確認相容版本，建立 README 開發指令與 GitHub Actions。

## 發布與內容

原始碼存於 GitHub，目標託管為 Cloudflare Pages。`larry-lab.pages.dev` 是希望使用的網址，尚未在 Cloudflare 預訂或確認可用；不宣稱已上線。

推薦碼尚未提供，第一版必須支援停用／空狀態，實際連結由作者提供後啟用。公開職涯文案只使用作者確認或公開資料，不包含公司內部內容。未指定開源授權，公開 repository 不代表已授予任意再利用權利。
