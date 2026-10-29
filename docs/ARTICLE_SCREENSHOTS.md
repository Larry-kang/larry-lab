# ether.fi 文章截圖計畫與驗收

日期：2026-10-29。基準 commit：`6b13eec`。範圍僅限文章插圖與相關驗證；保留草稿與搜尋引擎規則。

## 實作計畫

1. 僅使用提供的 clean 正式圖片，轉為最大寬度 1200、品質 80 的 WebP，存入 `public/images/articles/etherfi/`，沿用本機靜態資產網址。
2. 依畫面內容插入三篇文章，提供台灣繁體中文 alt 與 figcaption；官方行銷圖標示來源。替換已涵蓋的截圖待補項目，保留心得、交易所與 KYC 待補。
3. 執行型別檢查、lint、單元測試、建置及文章桌機／手機瀏覽器驗證，記錄結果後建立單一 commit，不推送。

## 驗收追蹤

| 項目 | 驗收方式 | 狀態 |
| --- | --- | --- |
| 10 張圖的來源、尺寸與壓縮 | 檔案清單與影像尺寸檢查 | 通過（PASS） |
| 圖片位置、替代文字、圖說與官方來源 | 原始檔及建置後 HTML | 通過（PASS） |
| 保留心得待補與草稿／索引邏輯 | Git 差異檢查 | 通過（PASS） |
| check、lint、test、build | npm 指令 | 通過（PASS） |
| 桌機／手機文章與圖片載入、無水平溢位 | Playwright | 通過（PASS）：審查輪補跑 152 passed |

## 圖片位置

| 原圖 | 文章檔名（位於 `src/content/articles/`） | 段落 |
| --- | --- | --- |
| image | what-is-etherfi.md | 一句話認識 ether.fi |
| image2 | first-crypto-basics.md | 小額測試轉帳步驟 |
| image3 | first-crypto-basics.md | 小額測試轉帳步驟 |
| image4 | first-crypto-basics.md | 小額測試轉帳步驟 |
| image5 | etherfi-cash-card-guide.md | 官方規則：Cash 卡是什麼 |
| image6 | what-is-etherfi.md | 官方規則：產品有哪些 |
| image7 | what-is-etherfi.md | Borrow：超額抵押借款 |
| image8 | etherfi-cash-card-guide.md | 官方規則：開戶與申請步驟 |
| image9 | etherfi-cash-card-guide.md | Borrow Mode：抵押借款消費 |
| image10 | etherfi-cash-card-guide.md | 費用、回饋與地區（未驗證） |

## 審查輪（2026-10-29）

- 隱私：10 張逐張檢視，QR 碼、存款地址、交易地址、商家名稱皆已遮罩；無姓名、Email、地址、卡號。畫面含帳戶金額（淨資產、借款額）為作者預先清理後保留。image5 為官方行銷圖（示意人名「Cesar」屬官方素材）。
- 來源：與 `clean/` 像素比對最接近（遮罩圖 image3、image10 與 raw 差異明顯），未使用 raw。
