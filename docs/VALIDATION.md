# Larry Lab 第二版驗證紀錄（VALIDATION REPORT）

日期：2026-10-15  
分支：`feat/next-version-spec`  
基礎 Commit：`f71f82a`（基於 PR #3 最新內容）  
環境：Node.js v24.11.1 / Windows PowerShell / Astro 7.3.8 / Playwright 1.64.1 / Vitest 5.0.4

---

## 1. 驗證總結 (Executive Summary)

Larry Lab 第二版（涵蓋第一版基準 A01–A14 與第二版增量規格 V11-01–V11-14）已完成完整的自動化測試與工程驗證：
- **Astro 型別與模板檢查 (`npm run check`)**：通過 (0 errors, 0 warnings, 0 hints)
- **ESLint 代碼規範檢查 (`npm run lint`)**：通過 (0 errors, 0 warnings)
- **Vitest 單元與合約測試 (`npm test`)**：通過 (111/111 tests pass, 100% 成功，包含獨立數值推導)
- **Astro 靜態建置 (`npm run build`)**：通過 (12 條靜態路由全數生成於 `dist/`，包含 `dist/_headers`)
- **Playwright 端對端測試 (`npm run test:e2e`)**：通過 (56/56 tests pass，涵蓋 Desktop 1440x900 與 Mobile 360x740)
- **畫面與首屏截圖歸檔**：通過 (產出 36 張高解析度截圖至 `artifacts/screenshots/`，包含全頁與首屏 viewport)
- **真人易用性探索測試**：誠實標記為 **未執行 (NOT RUN)**，不假冒或捏造受測者數據。

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
19:18:51 [check] Getting diagnostics for Astro files in D:\Dev\larry-lab-v2...
Result (57 files): 
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

 ✓ tests/unit/tools-meta.test.ts (5 tests) 9ms
 ✓ tests/unit/loan.test.ts (9 tests) 31ms
 ✓ tests/unit/pledge.test.ts (12 tests) 32ms
 ✓ tests/unit/v11-independent-math.test.ts (9 tests) 30ms
 ✓ tests/unit/portfolio.test.ts (13 tests) 38ms
 ✓ tests/unit/mortgage.test.ts (24 tests) 53ms
 ✓ tests/unit/retirement.test.ts (18 tests) 50ms
 ✓ tests/unit/lib.test.ts (21 tests) 20ms

 Test Files  8 passed (8)
      Tests  111 passed (111)
   Duration  473ms
```

### 關鍵獨立數值推導驗證摘要 (`v11-independent-math.test.ts`)
1. **房貸 (V11-04)**：
   - P=120,000, 12期, 0%, 費用0：月付金 = 10,000，總利息 = 0，期末餘額 = 0，各期償還本金加總誤差 <= 0.01 元。
   - 3期寬限：前 3 期月付 = 0，後 9 期月付 = 13,333.333333 元，總本金加總 = 120,000 元。
2. **信貸 (V11-05)**：
   - P=100,000, 12期, 6%, 費用0：月付 = 8,606.642970708 元，總利息 = 3,279.715648499 元，有效年化成本 = (1.005)^12 - 1。
   - 費用提高時：可用金額減少且有效年化成本上升。
3. **股票質押 (V11-06)**：
   - V=1,000,000, L=600,000, 警示130%, 目標166%：門檻市值 = 780,000 元，可跌 22%；下跌 30% 後市值 700,000 元，現金還款 178,313.253012 元或追加合格證券 296,000 元均能精確回復至 166% 維持率。
   - 借款為 0 時呈現無負債安全邊界，維持率與跌幅門檻為 N/A，不發生除以零。
4. **退休試算 (V11-07)**：
   - 59歲、60歲退休、終止61歲、資產60,000、月投5,000、月支10,000、利率與通膨0%：今天退休本金 240,000 元，目標年齡退休本金 120,000 元，預估資產 120,000 元，每月應存 5,000 元，最早可退休年齡 60 歲。
5. **投資組合 (V11-09)**：
   - 資產60,000跌20%、40,000跌10%、負債30,000：壓力後總資產 84,000 元，淨值 54,000 元。
   - 累積模式目標權重相加 60% + 30% = 90%：系統拒絕計算並顯示 `目標權重總和須等於 100%`，絕不進行擅自修改權重的自動正規化。

---

## 5. 靜態建置輸出與安全標頭 (Build & Headers)

執行指令：
```bash
npm run build
```

實際輸出：
```
19:18:25 [build] output: "static"
19:18:25 [build] directory: D:\Dev\larry-lab-v2\dist\
19:18:25 [build] Building static routes...
19:18:25   ├─ /404.html
19:18:25   ├─ /about/index.html
19:18:25   ├─ /methodology/index.html
19:18:25   ├─ /privacy/index.html
19:18:25   ├─ /recommendations/index.html
19:18:25   ├─ /tools/mortgage/index.html
19:18:25   ├─ /tools/personal-loan/index.html
19:18:25   ├─ /tools/portfolio/index.html
19:18:25   ├─ /tools/retirement/index.html
19:18:25   ├─ /tools/stock-pledge/index.html
19:18:25   ├─ /tools/index.html
19:18:25   ├─ /index.html
19:18:25 Complete!
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
Running 56 tests using 1 worker
  56 passed (18.8s)
```

測試涵蓋情境：
1. **找工具 (V11-01)**：首頁與工具大全之同義詞搜尋（房貸/購屋、FIRE、質押、再平衡）、清除按鈕、零結果狀態處理與分類按鈕聯動。
2. **首屏可見性 (V11-02)**：手機尺寸 (360x740) 驗證標題、用途、方案切換與第一個基本輸入在首屏內 (`toBeInViewport()`)；桌機尺寸 (1440x900) 驗證基本輸入與三項核心指標卡片可見。
3. **欄位層級與互動 (V11-03)**：進階設定折疊預設收合、展開後不丟失輸入值、輸入無效時標示「輸入待修正，以下結果已失效」且進階區塊自動展開。
4. **五大工具互動 (V11-04–V11-09)**：房貸月付金與利息支出、信貸有效年化成本、股票質押維持率與追加擔保品明細、退休所需本金與最早退休年齡、投資組合雙模式切換。
5. **情境比較契約 (V11-08)**：複製目前方案深複製、動態徽章顯示實際利率/報酬、三組報酬範例載入、基本條件不同警示與套用 A 條件按鈕。
6. **資料管理與 Undo (V11-10)**：清空重設後顯示 8 秒 Undo 復原按鈕並成功還原；複製工具網址為純網址不含金額；未加密 LocalStorage 純文字說明。
7. **無障礙與安全標頭 (V11-12 & V11-13)**：全鍵盤 Skip Link 跳轉、圖表替代表格、伺服器標頭來自 `dist/_headers`、隱私頁面確認無加密不實宣稱。
8. **全部路由與 404 (V11-14)**：12 條路由正常造訪、自訂 404 頁面回首頁連結。

---

## 7. 畫面截圖歸檔 (Visual Artifacts)

測試腳本執行於 Desktop (1440x900) 與 Mobile (360x740) 環境，截圖保存於 `artifacts/screenshots/`：
- 全頁截圖：`home.png`, `tools.png`, `tool-mortgage.png`, `tool-loan.png`, `tool-pledge.png`, `tool-retirement.png`, `tool-portfolio.png`, `recommendations.png`, `about.png`。
- 首屏 Viewport 截圖：`home-fold.png`, `tools-fold.png`, `tool-mortgage-fold.png`, `tool-loan-fold.png`, `tool-pledge-fold.png`, `tool-retirement-fold.png`, `tool-portfolio-fold.png`, `recommendations-fold.png`, `about-fold.png`。

---

## 8. 未驗證項目與外部待完成事項

1. **真人易用性測試 (Usability Testing)**：
   - 狀態：**未執行 (NOT RUN)**。
   - 原因：執行環境無法取得 3 位真實受測者。本報告不捏造受測者數據，候選版本將提交專案擁有者親自測試。
2. **正式線上 Cloudflare Pages 標頭**：
   - 狀態：**尚未部署 (NOT_DEPLOYED)**。
   - 原因：本次未獲授權合併 `main` 或部署 Cloudflare Pages。建置產物 `dist/_headers` 已符合 Cloudflare Pages 規格，待擁有者發布後另行驗證線上 HTTP 標頭。
3. **正式推薦碼與商業合作連結**：
   - 狀態：**停用空狀態中 (DISABLED_EMPTY_STATE)**。
   - 原因：作者尚未提供真實推薦碼，網站全站維持完整空狀態「推薦資訊整理中」與利益揭露說明。
