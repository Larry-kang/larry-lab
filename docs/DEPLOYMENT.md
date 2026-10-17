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

內容狀態：五項工具已上線；推薦區仍為空狀態，作者已提供的 17 項推薦資料尚待整合與連結查核。真人易用性、原生 200% 縮放及外部官方試算器交叉比對維持未驗證，不以部署成功取代這些驗收。

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
