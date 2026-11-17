# 公開 MCP 與 Agent 閱讀研究

查核日期：2026-11-17。

## 結論與本次交付

可以讓其他人的 agent 閱讀 Larry Lab，也可以未來提供真正的遠端 MCP。兩者是不同的交付：靜態網站已適合提供公開 HTML、Markdown 與 JSON；可呼叫的 MCP 則需要處理協定請求的後端。本次先完成閱讀優化，沒有啟用 MCP 後端或對外部署。

閱讀說明保留於 `docs/AGENT_READING.md`，新增`/content-index.json` 版本化目錄，以及九篇指南的 `.md` 入口。`llms.txt`、sitemap、Article 結構化資料由相同來源生成；建置檢查正文與索引同步。這有助 agent 找到可引用內容，不保證搜尋收錄、AI 引用或自動發現。各客戶端仍須具備 HTTP 閱讀或 MCP 連接能力。

## 可行方案

| 方案 | 能力 | 代價與適用情境 |
| --- | --- | --- |
| 靜態內容入口（本次實作） | 搜尋引擎與 HTTP agent 可讀文章、來源、日期、計算方法 | 沿用 Pages；不接受遠端計算；沒有新增執行請求的後端 |
| 獨立 Workers MCP（建議後續） | MCP 客戶端可連接公開閱讀工具，之後可增加純計算 | 網站保持靜態；Worker 需要額度、防濫用、協定測試與發布授權 |
| Pages Functions MCP | 與網站共用網域的 MCP 路由 | 改變現有純靜態部署及資料處理界線，需要重新評估隱私與測試 |

建議先觀察文章閱讀與實際 agent 需求，再以獨立 Worker 提供唯讀 MCP。Cloudflare 官方文件提供無須登入的遠端 MCP 範本；目前範本以無狀態 handler 處理請求，不必使用 Durable Objects。這是可行性依據，不代表本專案已完成相容性驗證。

## 建議第一版 MCP 契約（研究提案，尚未實作）

- `search_content(query, limit)`：搜尋已公開文章與工具用途，回傳標題、摘要、來源 URL、查核日期；query 上限 200 字元，limit 1–10，預設 5。
- `read_guide(slug)`：只接受公開指南 slug，回傳 Markdown、原文 URL、官方來源與查核日期；未知 slug 回傳可理解的工具錯誤。
- `list_tools()`：列出五個本機試算工具的用途、網址與模型限制，明示這不是執行計算。
- 第一版不提供註冊、入金、交易、帳戶、查詢私人資料或任意 URL 抓取；推薦只作附帶揭露資訊，不當成排名或搜尋權重。
- 同次建置從網站公開資料產生 MCP 所需內容包，避免 Worker 在請求時抓取未驗證網址或維護第二份文章。
- 遠端計算後續另立範圍：重用現有純函式與嚴格驗證，明示輸入會送到伺服器，不能沿用「所有輸入只在本機」說明。未決定前不新增此工具。

## 安全、成本與隱私

MCP 不需要在伺服器呼叫付費模型。使用者的 agent 在客戶端選擇模型，伺服器只提供確定性資料或計算。公開 MCP 可不要求登入，但不等於無限免費；Workers 免費方案有請求與 CPU 限制，部署前應核對官方限額及帳戶方案，且不得自動升級付費。

必須限制請求大小、搜尋長度、回傳量與執行成本；設計超額拒絕與限流，不存取私人資料、不執行模型產生的程式、不接受任意抓取 URL。對有 Origin 的連線做白名單檢查，不能以 CORS 代替 Origin 驗證；無 Origin 的伺服器客戶端仍受相同驗證與限額。請求內容不寫入應用程式紀錄，平台層日誌政策需另行確認。

對外 Streamable HTTP 以 JSON-RPC 處理握手與工具呼叫，GET／POST 等方法依協定處理；不把一份 `mcp.json` 或靜態 JSON 目錄當成實際 MCP。應使用官方支援的 SDK，鎖定版本並以對應版本協定與客戶端測試，不自行拼出不完整的協定實作。

## 後續驗收與發布門檻

1. MCP Inspector 及至少一種實際遠端客戶端完成 initialize、tools/list、tools/call。
2. 測試錯誤 slug、空搜尋、長字串、非法 JSON／方法、Origin 拒絕、輸入／輸出上限與高併發拒絕。
3. 同一 slug 的 MCP、HTML、Markdown 與來源日期一致；草稿不可被搜尋或讀取。
4. 未提供計算工具時不得回覆已完成試算；不得回傳憑證、任意外部抓取或帳戶資料。
5. 維持免費方案、不呼叫付費模型；確認部署與隱私說明後，另取得 push／merge／部署同意。

## 官方研究來源

- [遠端 MCP 連接概念](https://modelcontextprotocol.io/docs/develop/connect-remote-servers)
- [Streamable HTTP 協定與 Origin 安全要求](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Cloudflare 公開遠端 MCP 與無狀態 handler](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)
- [Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)

上述來源用於架構研究；沒有建立 Worker、調整帳戶設定、啟用排程或公開 MCP。
