# Cloudflare Pages 部署與交付

## 正式設定（2026-10-17）

| 設定 | 值 |
| --- | --- |
| Git 儲存庫 | `Larry-kang/larry-lab` |
| 平台 | Cloudflare Pages，靜態網站 |
| 專案名稱 | `larry-lab` |
| 正式環境分支 | `main` |
| 框架 | Astro 靜態輸出 |
| 建置指令 | `npm run build` |
| 輸出目錄 | `dist` |
| 專案根目錄 | 儲存庫根目錄 |
| 執行環境 | `NODE_VERSION=22`，首次建置為 22.22.0，與 CI 主版本一致 |
| 執行環境機密／資料庫 | 第一版不需要 |
| 正式網址 | <https://larry-lab.pages.dev/> |

目前狀態：已部署（DEPLOYED）。使用者於 2026-10-17 授權免費部署，並在 GitHub 完成身分驗證；官方 Cloudflare Workers and Pages App 僅授權 `Larry-kang/larry-lab`。沒有購買網域或啟用付費服務。

首次正式部署 commit：`08fc5ecc805b24d36a1d40d74c27051428cdf3d0`；Cloudflare deployment：`f609370d-96e3-4b7f-9156-152841e50de3`，Asia/Taipei 2026-10-17 10:31 確認成功。首頁與固定版本網址 HTTP 200，正式回應包含 CSP、nosniff、frame 與 referrer 安全標頭。Cloudflare 紀錄確認靜態輸出、無 Functions。

## 正式網址收尾計畫

依下方發布步驟第 6 點，另以 PR 補上 Astro `site`、不帶查詢參數的 canonical／Open Graph URL、11 條公開路由的 sitemap、robots.txt，以及 404 的 noindex。完成型別檢查、lint、建置與產物檢查後，等待該 PR 的 CI／預覽，再合併與驗證正式版本。公式、推薦內容與個人資訊不在本次網址收尾變更範圍。

內容狀態：正式分支 `main` 已依序部署 `08fc5ec`（首次部署）、`f992e3a`（PR #6 網址收尾）、`e870d1570b88c558f19410b6cccadb1a5ac436b1`（PR #7 推薦資訊整合與正式產品文案整理，Cloudflare Pages deployment `b83ccd5c-c344-49f1-9b0e-cb9028d970ae`）與 `038e939a003a280a5e9dc68fb085a2cf1f34c0be`（PR #8 補上 `bankee` 與 `bybit` 推薦連結，Cloudflare Pages deployment `bf84e301-2351-4a47-98b4-39e2ca5d1be2`）；目前分支 `feat/brand-logos-and-product-polish` 進一步整合 Larry Lab「Geometric L」品牌標誌素材、補齊全部 17 項推薦平台之官方品牌圖示（`/logos/<id>.png`）、調整 `HOYA BIT` 至「台灣交易所」、將桌機側欄與手機可折疊面板升級為完整 17 項高密度分類列表，並整理關於頁與公開產品文案，待本 PR 審查與 CI 通過合併 `main` 後更新至正式站。真人易用性、原生 200% 縮放及外部官方試算器交叉比對維持未驗證（`NOT RUN` / `UNKNOWN`），不以部署成功取代這些驗收。

## 正式站首次煙霧測試（2026-10-17，`08fc5ec`）

- 11 個公開頁面 HTTP 200、錯誤路由 HTTP 404，含深層工具路由；逐頁確認 nosniff 與 DENY，首頁另確認 CSP。
- Edge 實際操作五工具：房貸 120,000 元／1 年／0% 得月付 10,000 元、利息 0 元（保留預設手續費 15,000 元，總支出 135,000 元）；信貸 120,000 元／12 期／0%／0 費用得月付 10,000 元、有效年化成本 0%。
- 質押預設市值 1,000,000 元／借款 600,000 元：警示跌幅 22%、門檻市值 780,000 元；改借款 0 後維持率及跌幅為 N/A、利息 0。
- 退休零報酬案例：59 歲、60 歲退休、61 歲終止，資產 60,000 元、月投 5,000 元、月支 10,000 元、通膨／前後報酬／年金皆 0；目標本金 120,000 元、每月應存 5,000 元、最早退休 60 歲，與手算相符。
- 投資組合配置改股票衝擊為 0%，得到壓力後淨值 785,000 元；累積模式期初 120,000 元、月投 1,000 元、2 年、兩資產報酬 0%，終值及總投入 144,000 元、收益 0 元。
- 正式房貸頁未擷取到 warn／error。線上 CSV 按鈕已操作，但 Edge 分頁控制未收到下載事件，不能宣稱已取得正式站下載檔；此項為 UNKNOWN。CI 與本機 94 項 E2E 已包含五工具真實 CSV 下載解析，兩種證據分開記錄。

## 發布步驟

1. 確认當次使用者是否授權 Cloudflare 串接及正式發布。設定整合前，提供確切的儲存庫存取範圍，由作者核准新增存取。只選本儲存庫，不授權全部儲存庫；不啟用付費服務或購買自訂網域。
2. 在本機驗證 `npm ci`、型別／程式碼檢查、單元／瀏覽器測試、建置及 `dist` 產物。記錄預定發布的明確 commit，查核作者／推薦內容。只有文件的儲存庫不能當成網站程式部署。
3. 從 Workers & Pages 建立 Pages 應用程式，匯入 Git 儲存庫。介面名稱可能變更，須確認為 Pages／靜態模式；採上表設定，發布前檢視可審查的設定結果。
4. 希望使用的名稱不可用時，提供可用選項；不自行預訂會誤導品牌的名稱，也不宣稱原名稱已可用。只在當次授權範圍內完成發布。
5. 確認實際回傳網址已成功部署預定 commit。查核所有深層路由、重新整理、404、以虛構數值操作五工具、推薦狀態、桌機／手機版面、下載及安全標頭。只有建置成功不算部署驗證完成。
6. 若此前未知正式網址，將 canonical／網站來源網址與 sitemap 更新為實際網址，再部署並重新驗證。在 README 及 `docs/VALIDATION.md` 記錄實際部署、commit 與 Asia/Taipei 時間。

## 後續分支行為

Pages Git 串接後，正式分支上的 commit 可能觸發網站發布。PR／分支預覽也可能公開，只使用虛構且可公開的測試資料。分支設定須符合預定發布權限；串接完成後，不得把合併 main 當成只影響本機的動作。

## 參考來源

- https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/custom-domains/

查核日期：2026-10-14。Astro 現行文件可能優先建議新全端專案使用 Workers；本站已選靜態 Pages，不自行轉換至 Workers 或 SSR。
