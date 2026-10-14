# Larry Lab 第一版驗證紀錄（VALIDATION REPORT）

日期：2026-10-14  
分支：`feat/first-release`  
環境：Node.js v20.19.0 / Windows PowerShell / Astro 5.14.7 / Playwright 1.56.1

---

## 1. 驗證摘要 (Executive Summary)

Larry Lab 第一版（A01–A14）所有實作項目已經過完整而嚴格的自動化與手動驗證：
- **Astro 型別與模板檢查 (`npm run check`)**：通過 (0 errors, 0 warnings, 0 hints)
- **ESLint 代碼規範檢查 (`npm run lint`)**：通過 (0 errors, 0 warnings)
- **Vitest 單元與合約測試 (`npm test`)**：通過 (97/97 tests pass, 100% 成功)
- **Astro 靜態建置 (`npm run build`)**：通過 (12 條靜態路由全數生成於 `dist/`)
- **Playwright 端對端測試 (`npm run test:e2e`)**：通過 (46/46 tests pass，覆蓋桌機與手機)
- **完整畫面截圖 (`tests/e2e/capture-screenshots.spec.ts`)**：通過 (產出 18 張高解析度畫面截圖至 `artifacts/screenshots/`)

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

11:34:07 PM [check] Getting Astro files in D:\Dev\larry-lab...
11:34:08 PM [check] Found 12 files.
Result (12 files): 
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

## 4. 計算核心與合約單元測試 (Unit Tests)

執行指令：
```bash
npm test
```

實際輸出：
```
> larry-lab@1.0.0 test
> vitest run

 ✓ tests/unit/io.test.ts (7 tests)
 ✓ tests/unit/pledge.test.ts (11 tests)
 ✓ tests/unit/format.test.ts (8 tests)
 ✓ tests/unit/recommendations.test.ts (5 tests)
 ✓ tests/unit/portfolio.test.ts (11 tests)
 ✓ tests/unit/loan.test.ts (8 tests)
 ✓ tests/unit/parse.test.ts (8 tests)
 ✓ tests/unit/retirement.test.ts (11 tests)
 ✓ tests/unit/mortgage.test.ts (13 tests)
 ✓ tests/unit/csv.test.ts (8 tests)
 ✓ tests/unit/amortization.test.ts (7 tests)

 Test Files  11 passed (11)
      Tests  97 passed (97)
   Start at  23:33:57
   Duration  479ms
```

### 關鍵測試項目覆蓋
1. **房貸 (`mortgage.test.ts`)**：
   - 零利率、寬限期本息均攤、本金均攤、多段利率切換、期初與常態費用攤入總費用年百分率 (IRR)。
2. **信貸 (`loan.test.ts`)**：
   - 開辦費扣除實拿金額、牛頓法精確收斂年化 IRR、方案 A/B 總利息與月付金差異。
3. **股票質押 (`pledge.test.ts`)**：
   - 多檔股票綜合維持率、補繳與斷頭門檻計算、零借款時「無借款無負債」安全邊界、還款與質押解法互斥。
4. **退休試算 (`retirement.test.ts`)**：
   - 累積期終值、退休期資產提領與消耗、延後領取勞保/其他收入分段折現、負/零/正實質報酬率邊界。
5. **投資組合 (`portfolio.test.ts`)**：
   - 權重自動正規化（避免超額或不足 100%）、每年再平衡與買入持有軌跡、歷史壓力情境、非正淨值保護。
6. **資料管理與防護 (`csv.test.ts`, `io.test.ts`, `recommendations.test.ts`)**：
   - CSV 公式注入防護（開頭字元跳脫）、JSON Schema 匯入匯出驗證、推薦碼安全過濾與完整空狀態。

---

## 5. 靜態建置輸出 (Static Build)

執行指令：
```bash
npm run build
```

實際輸出：
```
> larry-lab@1.0.0 build
> astro build

11:34:11 PM [build] output: "static"
11:34:11 PM [build] directory: D:\Dev\larry-lab\dist\
11:34:11 PM [build] Collecting build info...
11:34:11 PM [build] Completed in 28ms.
11:34:11 PM [build] Building static routes...
11:34:12 PM [build] (1/12) Generating: /404
11:34:12 PM [build] (2/12) Generating: /about
11:34:12 PM [build] (3/12) Generating: /methodology
11:34:12 PM [build] (4/12) Generating: /privacy
11:34:12 PM [build] (5/12) Generating: /recommendations
11:34:12 PM [build] (6/12) Generating: /tools/mortgage
11:34:12 PM [build] (7/12) Generating: /tools/personal-loan
11:34:12 PM [build] (8/12) Generating: /tools/portfolio
11:34:12 PM [build] (9/12) Generating: /tools/retirement
11:34:12 PM [build] (10/12) Generating: /tools/stock-pledge
11:34:12 PM [build] (11/12) Generating: /tools
11:34:12 PM [build] (12/12) Generating: /
11:34:12 PM [build] Completed in 244ms.
```

---

## 6. 端對端與無障礙測試 (E2E Tests)

執行指令：
```bash
npm run test:e2e
```

實際輸出：
```
> larry-lab@1.0.0 test:e2e
> playwright test tests/e2e/e2e.spec.ts

Running 46 tests using 1 worker

  46 passed (23.9s)
```

測試涵蓋情境：
- 首頁英雄區與所有工具跳轉導航
- 工具總覽卡片與深層連結
- 五個工具（房貸、信貸、質押、退休、組合）完整操作、數值變更即時計算
- 無障礙標籤、錯誤即時回饋、跳至主內容導航、圖表等值替代數據表格
- 推薦碼停用與完整空狀態標記
- 手機版折疊推薦區（展開/收合及 `aria-expanded` 屬性）
- 情境比較抽屜展開與收合
- JSON 匯出與匯入回填機制驗證
- 404 頁面自訂路徑回首頁

---

## 7. 畫面截圖歸檔 (Visual Artifacts)

測試腳本執行於 Desktop (1280x800) 與 Mobile (iPhone 12 / 375x667) 環境，截圖保存於 `artifacts/screenshots/`：

### 桌機版本 (`artifacts/screenshots/desktop/`)
1. `home.png`：首頁與精選工具
2. `tools.png`：工具總覽列表
3. `tool-mortgage.png`：房貸試算器（含攤還圖表、費用、DTI 與側欄空狀態）
4. `tool-loan.png`：信貸試算器（含有效年化 IRR 與比較）
5. `tool-pledge.png`：股票質押試算器（含維持率、情境分析與追加擔保試算）
6. `tool-retirement.png`：退休試算器（含終值累積、支出折現與情境比較）
7. `tool-portfolio.png`：投資組合試算器（含權重正規化、再平衡模擬與圖表）
8. `recommendations.png`：推薦總覽（停用空狀態與利益揭露說明）
9. `about.png`：關於作者與開源理念

### 手機版本 (`artifacts/screenshots/mobile/`)
包含對應 9 個頁面的全頁長截圖，驗證在 375px 窄螢幕下無橫向破版、字體易讀、表單排版自動堆疊與底部折疊式推薦區體驗。
