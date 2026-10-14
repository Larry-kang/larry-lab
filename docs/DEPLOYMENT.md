# Cloudflare Pages 部署與交付

## 預定設定

| 設定 | 值 |
| --- | --- |
| Git 儲存庫 | `Larry-kang/larry-lab` |
| 平台 | Cloudflare Pages，靜態網站 |
| 希望使用的專案名稱 | `larry-lab`，建立時才能確認是否可用 |
| 正式環境分支 | `main` |
| 框架 | Astro 靜態輸出 |
| 建置指令 | `npm run build` |
| 輸出目錄 | `dist` |
| 專案根目錄 | 儲存庫根目錄 |
| 執行環境 | 實作時鎖定仍受支援的 Node LTS，與 CI 一致 |
| 執行環境機密／資料庫 | 第一版不需要 |
| 希望使用的網址 | `larry-lab.pages.dev`，尚未確認或上線 |

目前狀態：「尚未部署（NOT_DEPLOYED）」。初始設定任務沒有設定 Cloudflare 帳號／專案／整合。僅開啟 Cloudflare 分頁，不代表已核准串接或專案名稱可用。

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
