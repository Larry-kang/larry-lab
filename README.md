# Larry Lab

公開的個人工具大全網站：財金、工程與生活實用工具，讓計算與決策更清楚。

第一版完整實作五大核心財金試算器（房貸、信貸、股票質押、退休及投資組合），搭配個人介紹、每頁共用的推薦連結區與完整空狀態支援。使用者自行輸入資料，所有計算均在瀏覽器本機執行，絕不上傳或串接任何外部金融帳戶，確保個人資料最高隱私。

---

## 核心功能與頁面

### 1. 財金試算器
- **房貸試算器 (`/tools/mortgage/`)**：
  支援本息均攤與本金均攤、固定與多段利率、寬限期設定、期初開辦費與常態維護費、每月所得房貸負擔比 (DTI)、情境比較抽屜及完整每月攤還表 CSV 匯出。
- **信貸試算器 (`/tools/personal-loan/`)**：
  計算月付金、總利息、開辦費扣除後實拿金額、現金流有效年化成本 (IRR)、方案 A/B 差異即時比較及每月攤還表 CSV 下載。
- **股票質押試算器 (`/tools/stock-pledge/`)**：
  支援多檔持股擔保品市值與借款計算、綜合維持率追蹤、補繳（130%）與斷頭（140%/166%）跌幅門檻、情境模擬；清晰拆解「現金還款降槓桿」與「追加擔保品」兩種解法，並支援零借款無負債安全邊界。
- **退休試算器 (`/tools/retirement/`)**：
  根據今日生活費與通膨率推算退休所需本金、月投入/月支出規劃、其他年金/勞保收入起始年齡折現、負/零/正實質報酬情境敏感度分析，支援名目與實質購買力即時切換。
- **投資組合試算器 (`/tools/portfolio/`)**：
  支援多資產類別配置、自動等比例權重正規化至 100%、歷史與壓力情境分析、每年定期再平衡與買入持有績效走勢模擬、非正淨值保護及試算歷程 CSV 下載。

### 2. 資料管理與使用者體驗
- **一鍵重設與載入範例**：所有工具均提供預設真實合理範例，支援單鍵恢復初始狀態。
- **本機暫存與隱私保證**：支援選擇性本機儲存（LocalStorage），不發送任何資料至後端。
- **JSON 匯入與匯出**：提供完整參數備份與還原功能，內建嚴格 JSON Schema 檢驗，防止格式錯誤或代碼注入。
- **無障礙響應式介面**：相容桌機 (1440px)、平板 (768px) 與手機 (360px+)；所有圖表皆具備等值數據表格替代方案，支援全鍵盤焦點操作。

### 3. 共用推薦區與內容說明
- **共用推薦區**：桌機右側獨立側欄、手機版底部展開面板。針對尚未提供之推薦碼全面維持停用狀態，呈現完整空狀態說明，不造假優惠、不偽造背書。
- **關於我 (`/about/`)**：如實呈現作者背景、建站初衷與利益衝突揭露。
- **計算方法 (`/methodology/`)**：透明公開所有公式、時間約定與四捨五入邏輯。
- **隱私說明 (`/privacy/`)**：明訂純前端運算、零追蹤腳本與本機資料存放規則。
- **自訂 404 頁面 (`/404/`)**：提供友善的導航連結回首頁與工具總覽。

---

## 技術架構

- **框架**：[Astro 5](https://astro.build/) (純靜態 SSG 輸出，適合 Cloudflare Pages 全球 CDN)
- **語言**：TypeScript (嚴格型別定義與純函數計算核心)
- **樣式**：純 CSS 原生現代樣式 (CSS Custom Properties、Flexbox、Grid，極輕量載入無 Runtime 負擔)
- **測試**：
  - [Vitest](https://vitest.dev/)：97 項單元測試，嚴格比對 `docs/CALCULATION_CONTRACT.md` 獨立計算結果。
  - [Playwright](https://playwright.dev/)：46 項端對端整合測試，涵蓋 Desktop 與 Mobile 瀏覽體驗。
- **代碼規範**：ESLint (flat config) 與 Astro Check。

---

## 本地開發與驗證指令

專案環境建議使用 Node.js v20+。

```bash
# 1. 安裝依賴套件
npm install

# 2. 啟動本機開發伺服器
npm run dev

# 3. 執行 Astro 型別與模板檢查
npm run check

# 4. 執行 ESLint 語法與代碼規範檢查
npm run lint

# 5. 執行計算核心單元測試
npm test

# 6. 執行端對端 (E2E) 瀏覽器測試
npm run test:e2e

# 7. 靜態建置輸出 (產物將存於 dist/)
npm run build

# 8. 預覽靜態建置產物
npm run preview
```

---

## 驗收與規範文件

- [規格說明書 (SPEC.md)](SPEC.md)：第一版範圍、架構與 A01–A14 驗收標準。
- [計算契約 (docs/CALCULATION_CONTRACT.md)](docs/CALCULATION_CONTRACT.md)：所有財務與統計公式、牛頓法精度約定與獨立驗證範例。
- [驗收追蹤表 (docs/ACCEPTANCE.md)](docs/ACCEPTANCE.md)：A01–A14 完成狀態與證據摘要（已全部通過 PASS）。
- [驗證紀錄 (docs/VALIDATION.md)](docs/VALIDATION.md)：完整執行之型別檢查、代碼檢查、單元測試、E2E 測試與截圖日誌。
- [開發實作計畫 (docs/IMPLEMENTATION_PLAN.md)](docs/IMPLEMENTATION_PLAN.md)：六階段實作架構與進度追蹤。
- [Cloudflare Pages 部署流程 (docs/DEPLOYMENT.md)](docs/DEPLOYMENT.md)：正式環境部署操作指引。

---

## 發布與後續設定事項

本儲存庫已完成第一版所有功能開發與驗證。目前產物存放於工作分支，尚未合併至 `main`。

**待專案作者提供之項目**：
1. **正式推薦碼與專屬連結**：於 `src/lib/recommendations.ts` 中填入正式優惠碼並啟用（`enabled: true`）。
2. **自訂網域或 Cloudflare Pages 專案綁定**：在 Cloudflare Pages 後台建立專案並連結 GitHub 儲存庫（建置指令：`npm run build`，輸出目錄：`dist`）。
3. **作者個人專屬社群連結**：於 `src/layouts/BaseLayout.astro` 及 `/about/` 中更新個人公開社群帳號。
