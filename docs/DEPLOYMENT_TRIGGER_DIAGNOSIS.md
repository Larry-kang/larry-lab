# Git 自動部署延遲與初始化失敗查核

日期：2026-10-22。基準：main `5f7430d`。本輪僅修復與驗證既有免費 Pages Git 部署，不修改網站功能、帳號權限或方案。

## 計畫與驗收

1. 對照 GitHub 合併時間、Cloudflare `github:push` 事件及建置階段，區分事件延遲、初始化與程式建置錯誤。
2. 確認目前 main、路徑與 Git 儲存庫 ID 相符；不因暫時異常重新安裝 GitHub App。
3. 重試失敗的既有部署，確認初始化、clone、build、deploy 的實際結果。
4. 以本文件修正歷史誤判並提交 PR；檢查該分支與合併 main 是否自然產生 `github:push` 部署，不手動觸發這兩個驗收提交。
5. 核對正式 canonical deployment 的完整 commit、網站 HTTP 與安全標頭，記錄結果與仍未知的提供者內部原因。

## 已確認證據

| Git 提交 | GitHub 時間（UTC） | Pages 建立時間（UTC） | 部署 ID／結果 |
| --- | --- | --- | --- |
| `17bad81` 分支 | 2026-10-21 約 15:18:38 | 15:37:27 | `16d56663-bfaa-4a4f-b2a1-a7b90ea26f4e` 成功 |
| `4a35c12` main | 2026-10-21 15:22:47 | 15:37:52 | `a0d788b6-1a13-4a55-a0a6-075b5fe0a041` 成功 |
| `65abde7` 分支 | 2026-10-21 約 15:31:00 | 15:43:12 | `06575f85-c045-49b5-bffd-11ccb3d06863` 成功 |
| `5f7430d` main | 2026-10-21 15:33:21 | 15:51:21 | `7c891e89-99e3-4908-8b65-e8ec83046ac4` 初始化失敗 |

四筆均為 `deployment_trigger.type = github:push`，因此不能再判定「Git 事件沒有建立部署」。先前觀察期間不足，事件之後約延遲 12–19 分鐘才出現；main 兩筆確切差距分別約 15 分及 18 分。

失敗紀錄為 `build failed to initialize in time`：初始化從 15:51:21 到 16:03:59，約 12 分 38 秒；clone、build、deploy 尚未開始，不能歸因於 Astro 或財務試算程式。

Cloudflare UI 確認生產分支 main、自動部署已啟用、路徑 `*`、建置命令 `npm run build`、輸出 `dist`、Node 22；GitHub 儲存庫 ID 與 Pages 設定相符。其他同時期自動部署能成功，尚無證據顯示 App 整體授權失效。

Cloudflare 內部事件排程延遲及單次初始化逾時的底層原因為 UNKNOWN。不得把一般機房維護公告直接當成本專案事故原因。官方 [Pages 除錯文件](https://developers.cloudflare.com/pages/configuration/debugging-pages/) 提供初始化與 Git 整合排查方法；本輪不在缺乏證據時採取重新授權或變更權限。

## 驗證結果

重試、分支預覽、main 自動部署與正式站核對：執行後補充於本輪 PR。只有重試成功不能證明新的合併可自動部署，兩者分開驗證。
