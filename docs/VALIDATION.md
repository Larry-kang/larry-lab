# Larry Lab 本輪缺陷收尾與驗收補強驗證紀錄（VALIDATION REPORT）

> 2026-10-17 品牌識別、17 項官方推薦 Logo、高密度側欄與正式產品文案整理更新：PR #7（`e870d1570b88c558f19410b6cccadb1a5ac436b1`）與 PR #8（合併至 `main` 為 `038e939a003a280a5e9dc68fb085a2cf1f34c0be`，Cloudflare Pages 正式部署 `bf84e301-2351-4a47-98b4-39e2ca5d1be2`）已依序完成 17 項推薦資料整合與 `bankee`／`bybit` 新版連結啟用。後續分支 `feat/brand-logos-and-product-polish`（驗證 commit `b71fa1a4a0ce2f7da2b17c4126af66104e013eab`）進一步整合 Larry Lab「Geometric L」品牌素材（Header SVG 標誌、Favicon、Apple Touch Icon 與 `1200x630` Open Graph 預覽圖 `/og-image.png`）、補齊全部 17 項推薦平台之本機官方品牌圖示（`/logos/<id>.png`）、將 `HOYA BIT` 歸入「台灣交易所」（五大分類筆數為 6／1／3／5／2）、將桌機側欄與手機可折疊面板升級為依分類完整呈現全部 17 項之高密度單行列表（且按鈕維持 `>= 44px` 觸控高度），並移除關於頁與公開卡片中之內部開發技術架構與 AI 協作說明段落（於關於頁作者簡介保留精簡規格與 AI 協作分工單句）。於本分支重新執行 `npm run check`（64 檔 0 錯誤）、`npm run lint`（0 錯誤）、`npm test`（11 檔 133 項單元測試通過）、`npm run build`（12 頁靜態輸出）、`npm run test:e2e`（102 項 E2E 測試通過）。詳細連結查核結果見 `docs/REFERRAL_INTEGRATION_PLAN.md`，正式部署與線上驗證見 `docs/DEPLOYMENT.md`。
>
> 2026-10-17 首次部署更新：使用者已授權合併及免費部署；PR #5 → #4 → #3 已依序合併，各層最新 CI 通過。正式網站為 <https://larry-lab.pages.dev/>，首次部署 `08fc5ec`，網址收尾部署 `f992e3a`（PR #6）。以下 2026-10-16「未授權／尚未部署／UNKNOWN」為當時的歷史紀錄，現況以 `docs/DEPLOYMENT.md` 為準。

日期：2026-10-16
分支：`feat/mortgage-ux-accuracy`
基礎 Commit：`64865a0852af2e77b33b9a04c04178993098ac46`（含本輪交付整理修改）
環境：Node.js v24.11.1 / Windows PowerShell / Astro 7.3.8 / Playwright 1.64.1 / Vitest 5.0.4

---

## 1. 驗證總結 (Executive Summary)

狀態維度判定：
- **已實作 (Implemented)**：全數完成（A01–A14, V11-01–V11-14, M12-01–M12-11 程式碼已完整實作）
- **已驗證 (Verified)**：工程與自動化驗收全數通過（62 檔型別檢查、代碼風格檢查、133 項單元測試、12 頁靜態建置、94 項端對端測試全數 PASS）
- **可合併 (Merge-Ready)**：**判定為可合併候選 (MERGE-READY CANDIDATE)**，所有缺陷與回歸已關閉，測試與文件齊備，無阻擋性問題
- **已部署 (Deployed)**：**尚未部署 (NOT_DEPLOYED)**，未獲正式部署授權，未串接 Cloudflare Pages

執行結果：
- **Astro 型別與模板檢查 (`npm run check`)**：通過 (62 files, 0 errors, 0 warnings, 1 hint)
- **ESLint 代碼規範檢查 (`npm run lint`)**：通過 (0 errors, 0 warnings)
- **Vitest 單元與合約測試 (`npm test`)**：通過 (11 檔 133/133 tests pass, 100% 成功，包含房貸等值利率、投資組合累積獨立手算/正報酬推導、退休零報酬逐月現金流核算)
- **Astro 靜態建置 (`npm run build`)**：通過 (12 條靜態路由全數生成於 `dist/`，包含 `dist/_headers`)
- **Playwright 端對端測試 (`npm run test:e2e`)**：通過 (94/94 tests pass，涵蓋 Desktop 1440x900 與 Mobile 360x740，實測五工具真實 CSV 下載與解析比對)
- **畫面與首屏截圖歸檔**：通過 (產出桌機 1440x900 初始未捲動首屏截圖 `tool-mortgage-initial-fold.png` 及全頁截圖存於 `artifacts/screenshots/`)
- **真人易用性探索測試**：誠實標記為 **未執行 (NOT RUN)**，不假冒或捏造受測者數據。
- **真實 200% 原生瀏覽器縮放**：誠實標記為 **未執行 (NOT RUN)**。
- **外部官方網站交叉比對**：標記為 **外部未知 (UNKNOWN)**。

---

## 2. 靜態型別與模板檢查 (Type Check)

執行指令：
```bash
npm run check
```

實際輸出：
```
> larry-lab@1.0.0 check
> astro check

19:18:51 [types] Generated 95ms
19:18:51 [check] Getting diagnostics for Astro files in [repo-root]...
Result (62 files):
- 0 errors
- 0 warnings
- 0 hints
```

---

## 3. 代碼風格與語法檢查 (Lint)

執行指令：
```bash
npm run lint
```

實際輸出：
```
> larry-lab@1.0.0 lint
> eslint .

(Exit code: 0, 無任何錯誤或警告)
```

---

## 4. 計算核心與獨立數學推導單元測試 (Unit Tests)

執行指令：
```bash
npm test
```

實際輸出：
```
> larry-lab@1.0.0 test
> vitest run

 ✓ tests/unit/portfolio.test.ts (13 tests)
 ✓ tests/unit/retirement.test.ts (18 tests)
 ✓ tests/unit/pledge.test.ts (12 tests)
 ✓ tests/unit/v11-independent-math.test.ts (12 tests)
 ✓ tests/unit/loan.test.ts (9 tests)
 ✓ tests/unit/tools-meta.test.ts (5 tests)
 ✓ tests/unit/mortgage.test.ts (24 tests)
 ✓ tests/unit/lib.test.ts (21 tests)
 ✓ tests/unit/mortgage-p0.test.ts (1 test)
 ✓ tests/unit/reproduce-defects.test.ts (8 tests)
 ✓ tests/unit/m12-mortgage-acceptance.test.ts (10 tests)

 Test Files  11 passed (11)
      Tests  133 passed (133)
   Duration  605ms
```

### 關鍵獨立數值推導驗證摘要 (`v11-independent-math.test.ts` & `reproduce-defects.test.ts`)
1. **房貸 (V11-04 & M12)**：
   - P=120,000, 12期, 0%, 費用0：月付金 = 10,000，總利息 = 0，期末餘額 = 0，各期償還本金加總誤差 <= 0.01 元。
   - 3期寬限：前 3 期月付 = 0，後 9 期月付 = 13,333.333333 元，總本金加總 = 120,000 元。
   - P0 首期修復：120,000/12期/12% 本金均攤首期為 NT$11,200（非中段 10,600）。
   - 雙向利率同步：fixedRate 與 segments[0].annualRate 同步連動，頁籤徽章與比較表即時反映 5%。
   - 真正首期對齊：預設方案 2 寬限期首期嚴格顯示 NT$16,000，寬限後首期 NT$37,337，最高月付 NT$39,203。
   - 等值利率判等：`fixedRate="2.20"` 與 `segments[0].annualRate="2.2"`、`0` 與 `0.0` 依嚴格數字解析規則成功匯入；`2.2` 與 `5` 判定衝突拒絕；非法字串（`2.2abc`、`NaN`、`Infinity`）及超出範圍（`-1`、`101`）嚴格拒絕。
2. **信貸 (V11-05)**：
   - P=100,000, 12期, 6%, 費用0：月付 = 8,606.642970708 元，總利息 = 3,279.715648499 元，有效年化成本 = (1.005)^12 - 1。
   - 費用提高時：可用金額減少且有效年化成本上升。
3. **股票質押 (V11-06)**：
   - V=1,000,000, L=600,000, 警示130%, 目標166%：門檻市值 = 780,000 元，可跌 22%；下跌 30% 後市值 700,000 元，現金還款 178,313.253012 元或追加合格證券 296,000 元均能精確回復至 166% 維持率。
   - 借款為 0 時呈現無負債安全邊界，維持率與跌幅門檻為 N/A，不發生除以零。
4. **退休試算 (V11-07 & 計算契約第 134 行)**：
   - 59歲、60歲退休、終止61歲、資產 60,000 元（非 600,000 元）、月投 5,000 元、月支 10,000 元、利率與通膨 0%：今天退休本金 240,000 元，目標年齡退休本金 120,000 元，預估資產 120,000 元，每月應存 5,000 元，最早可退休年齡 60 歲。
   - 逐月現金流與資產獨立核算：0月 (60,000 元) -> 6月 (90,000 元) -> 12月 (120,000 元) -> 13月 (110,000 元) -> 18月 (60,000 元) -> 24月 (0 元)，手算與模型數值完全閉合。
5. **投資組合 (V11-09 & 計算契約第 175 行)**：
   - 配置模式：資產60,000跌20%、40,000跌10%、負債30,000：壓力後總資產 84,000 元，淨值 54,000 元。
   - 累積模式權重：目標權重相加 60% + 30% = 90%：系統拒絕計算並顯示 `目標權重總和須等於 100%`，絕不進行擅自修改權重的自動正規化。
   - 累積模式零報酬手算：期初 120,000 元（W=120k，非 10 萬元）、每月投入 1,000 元（C=1k，非 1 萬元）、期間 2 年 (Y=2)、兩資產各 50% 且報酬率 0%：第 0 年 120,000 元 / 第 1 年 132,000 元 / 第 2 年 144,000 元，累計收益均為 0 元。
   - 累積模式正報酬契約獨立推導：期初 100,000 元 (W=100k)、每月投入 0 元 (C=0)、期間 2 年 (Y=2)、單一資產年化 12% (r=12%)：第 1 年期末 112,000 元 (收益 12,000 元)，第 2 年期末 125,440 元 (收益 25,440 元)，年化複利終值精確吻合。

---

## 5. 靜態建置輸出與安全標頭 (Build & Headers)

執行指令：
```bash
npm run build
```

實際輸出：
```
> larry-lab@1.0.0 build
> astro build

22:24:20 [build] output: "static"
22:24:20 [build] directory: ./dist/
22:24:20 [build] Building static routes...
22:24:20   ├─ /404.html
22:24:20   ├─ /about/index.html
22:24:20   ├─ /methodology/index.html
22:24:20   ├─ /privacy/index.html
22:24:20   ├─ /recommendations/index.html
22:24:20   ├─ /tools/mortgage/index.html
22:24:20   ├─ /tools/personal-loan/index.html
22:24:20   ├─ /tools/portfolio/index.html
22:24:20   ├─ /tools/retirement/index.html
22:24:20   ├─ /tools/stock-pledge/index.html
22:24:20   ├─ /tools/index.html
22:24:20   ├─ /index.html
22:24:20 ✓ Completed in 88ms.
22:24:20 12 page(s) built in 528ms
22:24:20 Complete!
```

### 安全標頭檔案查核
- 原始設定檔：`public/_headers`
- 建置產物：`dist/_headers`
- 規則內容：
  ```
  /*
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
    Referrer-Policy: strict-origin-when-cross-origin
    Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none';
  ```
- 本機預覽測試透過 `scripts/serve-dist.mjs` 解析此規則套用標頭，與 Cloudflare Pages 部署行為一致。

---

## 6. 端對端與無障礙測試 (E2E Tests)

執行指令：
```bash
npm run test:e2e
```

實際輸出：
```
Running 94 tests using 1 worker
  94 passed (1.0m)
```

測試涵蓋情境與驗證證據：
1. **桌機初始首屏物理視口可見 (`FOLD-CORE-VERIFY`)**：
   - 1440x900 解析度下，在任何點擊、聚焦或捲動之前，嚴格驗證 `scrollY === 0`。
   - 表單採用雙欄響應式網格 (`.tool-workspace`)，基本輸入（本金計算模式 select）與三項核心結果卡片 (`.card-featured`) 及其標籤、數值物理位於視口內 (`toBeInViewport()`)。
   - 手機 360x800 解析度下維持單欄堆疊，未捲動前首個基本輸入物理位於視口內。
2. **「查看結果」按鈕獨立捲動驗證 (`CALC-BUTTON-SCROLL-VERIFY`)**：
   - 在堆疊版型下點擊「查看試算結果 ↓」，驗證頁面產生實質捲動 (`scrollY > 0`) 且 `#results-heading` 獲得焦點並進入視口。
3. **五大工具 CSV 深度數值驗收 (`CSV-DEEP-ALL5`)**：
   - 嚴格遵循 RFC 4180 解析雙引號、逗號與換行，且正確處理防公式注入之轉義單引號。
   - **房貸 CSV**：361 列，本金加總 9,600,000 元、利息加總 3,522,461 元、末期剩餘本金嚴格為 0。
   - **信貸 CSV**：61 列，本金加總 500,000 元、末期剩餘本金嚴格為 0。
   - **質押 CSV**：6 列，核對 5 種情境（-10%, -20%, -30%, -50%, 自訂 -40%）之維持率（1.5, 1.3333, 1.1667, 0.8333, 1.0）、市值、淨值與追加擔保品金額。
   - **投資組合 CSV（配置模式）**：4 列，股票 600k 權重 0.6 衝擊後 480k；債券 300k 權重 0.3 衝擊後 285k；現金 100k 權重 0.1 衝擊後 100k。
   - **投資組合 CSV（累積模式預設）**：22 列，第 0 年 500,000 至第 20 年 5,300,000 投入與複利終值獨立核對。
   - **投資組合 CSV（累積模式零報酬手算補強）**：4 列，期初 120,000 元、每月投入 1,000 元、期間 2 年、報酬 0%：第 0 年 120,000 元 / 第 1 年 132,000 元 / 第 2 年 144,000 元，累計收益均為 0 元，真實下載檔案與手算值完全一致。
   - **投資組合 CSV（累積模式正報酬契約推導補強）**：4 列，期初 100,000 元、每月投入 0 元、期間 2 年、年化 12%：Year 0 100,000 元 / Year 1 112,000 元（收益 12,000 元）/ Year 2 125,440 元（收益 25,440 元），真實下載檔案與複利終值推導完全一致。
   - **退休 CSV（預設情境）**：662 列，完整驗證第 0 個月至第 660 個月模擬點之年齡、階段與資產數值。
   - **退休 CSV（既有零報酬案例補強）**：26 列，契約第 134 行案例 (A=59, R=60, H=61, 資產 60,000 元, 月投 5,000 元, 月支 10,000 元, r=0, p=0)：關鍵月份與資產值（0月 60,000 元、6月 90,000 元、12月 120,000 元、13月 110,000 元、18月 60,000 元、24月 0 元，非 600,000 元），真實下載檔案與手算現金流完全一致。
4. **退休工具多方案條件揭露 (`RETIREMENT-COMPARE-01`)**：
   - 方案比較表完整呈現終止年齡、通膨率、年金收入等條件，修改後精確標記「不同」diff tag。
5. **窄視口無橫向溢位檢核 (`ZOOM-VIEWPORT-VERIFY` & `M12-10`)**：
   - 360x800, 390x844, 768x1024, 1440x900 與 640px 視窗寬度檢核，驗證全頁無水平捲軸溢出 (`scrollWidth <= innerWidth`)。
   - 真實 200% 原生 UI 縮放維持標記為 NOT RUN。

---

## 7. 畫面截圖歸檔 (Visual Artifacts)

測試腳本執行於 Desktop (1440x900) 與 Mobile (360x740 / 360x800) 環境，截圖保存於 `artifacts/screenshots/`：
- **未捲動首屏截圖**：`desktop/tool-mortgage-initial-fold.png` (1440x900 初始雙欄首屏)、`mobile/tool-mortgage-initial-fold.png` (360x800 初始手機首屏)。
- **缺陷修正證據截圖**：`m12-fix-01-rate-sync.png` (利率雙向同步)、`m12-fix-02-compare-keys.png` (方案2首期 16,000 獨立呈現)、`retirement-compare-disclosure.png` (退休條件揭露)。
- **各解析度首屏與全頁截圖**：`mortgage-desktop-1440x900-fold.png`、`mortgage-desktop-1440x900-full.png`、`mortgage-mobile-360x800-fold.png`、`mortgage-mobile-360x800-full.png`、`mortgage-tablet-768x1024-fold.png`、`mortgage-tablet-768x1024-full.png`。

---

## 8. 未驗證項目與外部待完成事項

1. **真人易用性測試 (Usability Testing)**：
   - 狀態：**未執行 (NOT RUN)**。
   - 原因：本機執行環境無法取得真實外部受測者。嚴格禁止 agent 假冒受測者或捏造易用性結論，維持標記為 NOT RUN，交付候選版本供專案擁有者親自測試。
2. **真實 200% 原生瀏覽器縮放**：
   - 狀態：**未執行 (NOT RUN)**。
   - 原因：Playwright 自動化無原生 UI 介面縮放 (Ctrl + '+') API；本輪已完成 640px 窄視口無溢位自動化測試，真實 200% 縮放誠實維持標記為 NOT RUN，更正測試名稱避免與報告矛盾。
3. **外部官方網站交叉比對**：
   - 狀態：**外部未知 (UNKNOWN)**。
   - 原因：內政部不動產資訊平台等外部網站阻擋連線或具備 alert 限制，以本機獨立推導公式完成所有數值與合約驗證。
4. **正式線上 Cloudflare Pages 標頭**：
   - 狀態：**尚未部署 (NOT_DEPLOYED)**。
   - 原因：本次未獲授權合併 `main` 或部署 Cloudflare Pages。建置產物 `dist/_headers` 已符合 Cloudflare Pages 規格。
5. **正式推薦碼與商業合作連結**：
   - 狀態：**停用空狀態中 (DISABLED_EMPTY_STATE)**。
   - 原因：作者已提供 17 項推薦資訊，尚未整合與查核；網站全站維持完整空狀態「推薦資訊整理中」與利益揭露說明，本輪不整合推薦碼，不讓這項後續功能阻擋修復交付。
6. **Cloudflare 自動部署影響查核**：
   - 狀態：**未知 (UNKNOWN，無法完全排除外部 GitHub App 串接)**。
   - 事實依據：
     - 本機已登入之 Cloudflare 帳號 經 `wrangler pages project list` 查核，目前 Pages 專案清單為空 (`[]`)，尚未建立 `larry-lab` Pages 專案。
     - 儲存庫無 `wrangler.toml`，`.github/workflows/ci.yml` 僅有測試與建置檢查（`permissions: contents: read`），無部署步驟與部署密鑰。
     - GitHub Deployments / Environments / Webhooks 均為 0 筆，所有歷史 commit check runs 僅有 GitHub Actions。
   - 限制宣告：
     - 因目前 gh token 權限無法讀取使用者的 GitHub App 安裝列表（HTTP 403），且無法排除擁有者是否在其他 Cloudflare 帳號或組織層級安裝了 Cloudflare Pages GitHub App 並啟用預覽建置。
     - 正式撤回先前「絕不觸發部署」之宣稱。在未向擁有者確認 Cloudflare 外部串接狀態前，維持 UNKNOWN，且不向遠端執行非必要之推送。
