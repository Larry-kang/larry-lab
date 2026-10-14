# Larry Lab 第一版開發計畫

版本：1.0 · 日期：2026-10-14 · 狀態：全部完成 (COMPLETED)

依據 `SPEC.md`、`docs/CALCULATION_CONTRACT.md` 與使用者指令，本計畫追蹤第一版完整功能（A01–A13）及可部署設定（A14）的交付進度。

## 1. 架構原則與技術基準

- **框架**：Astro 靜態輸出（SSG），TypeScript 嚴格型別。
- **計算模組**：TypeScript 純函式，明確邊界與型別定義，無 DOM 或網路依賴。
- **數值契約**：嚴格依照 `docs/CALCULATION_CONTRACT.md` 規範實作與驗證，所有預期值採獨立公式推導，不依賴正式程式產出。
- **隱私與安全**：本機運算、無外部追蹤或分析 SDK、無後端儲存；設定匯入／匯出採用版本化 JSON 嚴格驗證。
- **推薦系統**：獨立資料源 `src/content/recommendations.json`，初始保持停用／完整空狀態，不捏造優惠與推薦碼。
- **無障礙與響應式**：支援桌機（雙欄+固定推薦側欄）與手機（單欄+結果下方可折疊推薦區），360px、768px、1440px 與 200% 縮放正常運作。

## 2. 階段劃分與執行結果

### 階段一：計算核心與單元測試（已完成）
- [x] 共用計算核心模組與格式化工具（`amortization.ts`, `common.ts`, `csv.ts`, `io.ts`, `parse.ts`, `storage.ts`, `recommendations.ts`）
- [x] 五大試算器計算模型（房貸、信貸、質押、退休、投資組合）
- [x] 完整的單元測試套件與邊界情境驗證（97 個測試全數通過）

### 階段二：共用版面、UI 引擎與工具頁面骨架（已完成）
- [x] UI 引擎（`engine.ts`, `chart.ts`, `schema.ts`, `types.ts`）
- [x] 五大工具規格定義（`mortgage.ts`, `loan.ts`, `pledge.ts`, `retirement.ts`, `portfolio.ts`）
- [x] 共用版面 Layout、樣式、推薦元件、客戶端腳本（`BaseLayout.astro`, `RecommendationPanel.astro`, `global.css`, `site.ts`, `tool.ts`）
- [x] 5 個工具路由頁面（`/tools/mortgage/`, `/tools/personal-loan/`, `/tools/stock-pledge/`, `/tools/retirement/`, `/tools/portfolio/`）
- [x] 補全其餘必要頁面：
  - 首頁 `/`
  - 工具總覽 `/tools/`
  - 推薦總覽 `/recommendations/`
  - 關於 `/about/`
  - 計算方法 `/methodology/`
  - 隱私說明 `/privacy/`
  - 404 頁 `404.astro`

### 階段三：建置、代碼檢查與 E2E 測試驗證（已完成）
- [x] 設定 Playwright 測試與本機預覽伺服器
- [x] 執行 `npm run check`（astro check：0 errors, 0 warnings）
- [x] 執行 `npm run lint`（eslint：0 errors）
- [x] 執行 `npm test`（vitest：97 tests passed）
- [x] 執行 `npm run build` 確認 `dist/` 靜態檔案產生與 12 條路由完整輸出
- [x] 執行 `npm run test:e2e`（Playwright 瀏覽器測試涵蓋 A01–A13 共 46 個測試全數 PASS）
- [x] 截圖保存與無障礙、手機/桌機測試（18 張截圖存放於 `artifacts/screenshots/`）

### 階段四：文件、驗收紀錄與 PR 交付（已完成）
- [x] 建立 `docs/ACCEPTANCE.md`（A01–A14 驗收追蹤表，全數通過 PASS）
- [x] 建立 `docs/VALIDATION.md`（完整測試輸出、覆蓋範圍與截圖清單）
- [x] 更新 `README.md`（第一版功能完整說明、開發指南、操作指令）
- [x] 設定 GitHub Actions CI workflow（`.github/workflows/ci.yml`，唯讀權限、check/lint/test/build/e2e）
- [x] 檢查 Git 提交者資訊（GitHub noreply: `71374076+Larry-kang@users.noreply.github.com`）
- [x] 推送工作分支 `feat/first-release` 並建立 Pull Request
