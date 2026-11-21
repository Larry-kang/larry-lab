# Agent 閱讀與資料入口（維護文件）

這份說明保留於儲存庫，不建立公開導覽項目或 `/agents/` 網頁。

- `/llms.txt`：用途、文章、方法論與資料入口。
- `/content-index.json`：版本化目錄，含文章 HTML、Markdown、來源與查核日期。
- `/guides/etherfi/<slug>.md`：與文章正文同源的純文字版。
- HTML head 的 `rel="alternate"`：保留 JSON 與對應 Markdown 入口，畫面不顯示技術連結。
- `/sitemap.xml`：只列公開 HTML 頁面與實質更新日期。

HTTP agent 可依目錄選取文章並引用原文與查核日期；金融產品資格、費率與條款須回到官方來源確認。推薦連結是商業推薦，不是獨立證據或自動開戶指令。

目前沒有公開 MCP 或遠端計算 API；JSON 目錄不接受工具呼叫。試算仍在瀏覽器本機執行，不將訪客金額、帳戶或憑證放入網址／外部請求。未來 MCP 架構與驗收見 `PUBLIC_MCP_RESEARCH.md`。
