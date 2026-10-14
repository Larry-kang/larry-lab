# 儲存庫設定基準

初始設定日期：2026-10-14。本檔為設定基準，GitHub 即時設定才是實際狀態；修改前須重新查核。

- 儲存庫 `Larry-kang/larry-lab` 為公開，預設分支 `main`。
- 啟用 Issues；關閉 Wiki 與 Projects，文件集中於 Git。
- 啟用 squash merge（壓縮合併），停用 merge commit／rebase merge；合併後自動刪除來源分支。
- 啟用 GitHub secret scanning（機密掃描）與 push protection（推送保護）。啟用 Dependabot 弱點警示／安全更新；加入套件資訊及鎖定檔後，相依關係圖才會有實際用途。
- 不啟用 GitHub Pages；網站部署至 Cloudflare Pages。
- 初始設定未選授權條款，未加入上線網址、協作者、付費功能或安裝 Cloudflare GitHub App。
- 主題標籤涵蓋公開財金試算、個人網站、台灣及 Cloudflare Pages。

## Main 分支規則

初始文件透過已檢視的 squash PR 交付。初始設定後，`main` 要求透過 PR、解決討論、維持線性歷史，禁止強制推送及刪除，管理員同樣適用。單人專案的必要核准數設為 0，但人類／agent 仍須檢視實際差異及證據，不宣稱取得從未發生的獨立核准。

網站 CI 尚未建立前，不設定必要 CI 檢查。首次實作加入穩定且實際通過的檢查後，再更新分支保護。不能因為完成文件設定，就宣稱程式已測試。

GitHub Actions 工作流程憑證預設唯讀，Actions 不得核准 PR。開發 agent 後續建立實際網站 CI；儲存庫的工作流程權限仍須從即時設定查核。
