# 初始設定驗證紀錄 — 2026-10-14

範圍只包含儲存庫建立／設定與文件。本紀錄不代表網站程式已驗證；開發 agent 須在 `docs/VALIDATION.md` 記錄實際軟體檢查。

## 已執行檢查

- GitHub API 回讀：公開儲存庫、預設 `main`、Issues 啟用、Wiki／Projects 停用、只允許 squash merge、合併後自動刪除來源分支。
- 安全設定回讀：secret scanning 與 push protection 啟用；vulnerability-alerts GET 回傳 204；automated-security-fixes 回報 enabled=true。
- Actions 權限回讀：default_workflow_permissions=read；can_approve_pull_request_reviews=false。
- Main 保護回讀：須透過 PR，必要核准數 0，須解決討論並維持線性歷史，管理員同樣適用，禁止強制推送／刪除。不要求不存在的 CI 檢查名稱。
- 文件連結／編碼／程式碼區塊／驗收掃描：首次檢查 8 份 Markdown 與 7 個相對連結皆通過，包含 A01–A14；提交前加入本紀錄再次完整掃描。
- `git diff --cached --check`：初始文件變更通過。
- 文字掃描：查核未解決的 TBD／TODO／FIXME，以及敏感資料、token 或私鑰格式。這是限定範圍的文字檢查，不是完整安全認證。
- 獨立檢查 10 項計算契約算術：貸款月付金／利息、本金平均利息、質押門檻／補足、零利率退休資金及投資組合壓力／累積皆通過。此為規格抽查，不是網站單元測試。
- 依 code-review-and-quality 技能面向自行檢視：範圍符合公開工具，數值單位／時間明確，內容及發布權限分開，未加入程式套件或網路服務。

## 未執行項目與外部狀態

- 網站型別／程式碼檢查、單元測試、建置、瀏覽器測試與 CI：未執行（NOT RUN），尚無網站程式。
- Cloudflare 名稱是否可用、Git 串接、部署、自訂網域：未設定／未知（NOT CONFIGURED／UNKNOWN）。
- 真實推薦連結／推薦碼、選填擴充簡介及授權條款：待作者提供；停用及預設行為已定義，不妨礙實作。
- 不宣稱經過獨立的第二 agent 審查；本次為作者 agent 對初始文件的自行檢視。

## 初始交付

交付以目前 main 的文件基準為準；重新使用本紀錄時確認即時狀態。儲存庫設定屬當日回讀，不可覆蓋未來使用者指示。

## 台灣繁體中文文件調整

依作者要求，將 9 份 Markdown 文件及 PR 範本的說明改為台灣繁體中文，並在工作規則、SPEC 及交接提示詞加入後續文件的語言要求。保留技術識別名稱、指令、路徑及網址。

實際檢查：9 份文件、7 個相對連結、UTF-8 編碼及程式碼區塊完整；參考網址未變更；計算契約 7 個公式區塊與原版逐字一致；A01–A14 皆保留；台灣用語文字檢查與 `git diff --check` 通過。本次為文件調整，未執行網站建置或程式測試。
