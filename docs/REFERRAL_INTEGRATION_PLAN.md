# 推薦資訊整合計畫與正式產品文案整理

日期：2026-10-17｜狀態：已完成（17 項推薦資料整合、真實瀏覽器連結查核、正式產品文案整理與自動化測試通過）。

## 範圍與資料來源

作者本次明確提供17項推薦資料，要求納入下一步計畫。配套資料檔為 [referrals.owner-provided.json](referrals.owner-provided.json)。這些推薦連結／邀請碼是作者授權供網站推薦使用的內容，不是金融帳戶串接資訊。僅整理本次提供資料，不讀取私人帳戶或其他檔案。

網址保留原參數與片段；僅將貼上格式的跳脫ampersand還原成正常URL。不得任意移除utm、ref、uid、ID或hash，避免破壞推薦歸屬。

推薦主分類：數位銀行（6項）、證券開戶（1項）、台灣交易所（2項）、國際交易所（5項）、其他加密服務（3項）。分類已依官方服務定位調整為中性描述，避免未經查核的支付牌照、地區資格或服務能力宣稱。

## 必要行為

1. 整合至當前版本集中管理的推薦資料（`src/content/recommendations.json`），維持每頁共用側欄及推薦總覽，計算器不得讀取或受推薦排序影響。
2. 每項區分：作者提供日期（`providedAt: "2026-10-15"`）、連結檢查日期（`linkCheckedAt: "2026-10-17"` 或純推薦碼為 `null`）、優惠查核日期（`offerCheckedAt: null`）與狀態。未檢查日期使用 `null`，不把本次整理日期當成優惠已查核。
3. 未驗證優惠時顯示中性平台名稱與「作者提供的推薦連結／推薦碼；優惠與適用資格請以平台公告為準」。不杜撰返利、減費、開戶獎金或期限。
4. 將來銀行（`HCPGD`）、樂天國際銀行（`YCB0Y6`）目前只有碼：顯示複製碼，不提供假的註冊按鈕；不猜測官方網址。其他URL參數中的字串不自動當成可手動填入的推薦碼。
5. 作者提到的Bybit／Crypto.com卡片與AP／GP／LP支援僅保存在待查核備註；未經當期官方資料確認，不放成公開功能或優惠標籤。
6. RedotPay、Bitget與ether.fi等分享／短網址已透過真實瀏覽器導覽查核最終目的地，確認仍屬預期官方服務；無法確認之連結（遠銀 Bankee HTTP 404、Bybit HTTP 403 / HTTP2 協定阻擋）標記為 `UNKNOWN` 並停用外連，顯示「連結待確認」。
7. 檢查HTTPS、允許的hostname（`ALLOWED_REFERRAL_HOSTNAMES` 白名單）、大小寫敏感參數與完整href；只允許明確官方來源或已查核分享域名。
8. 共用側欄初始最多3項，附「查看全部 17 項推薦與利益揭露 →」通往推薦頁，不把17項完整堆到每個工具旁。手機推薦在主要結果後可折疊。
9. 外連明確標示「前往官方推薦頁（另開新分頁）」，採 `rel="sponsored noopener noreferrer"`。利益揭露：「透過部分推薦連結註冊或使用服務，我可能獲得獎勵；不影響試算結果，優惠與適用條件請以平台公告為準。」
10. 複製功能只寫入使用者點選的碼，提供成功／失敗回饋與手動選取備援。

## 17 項推薦資料連結查核紀錄（2026-10-17）

| 排序 | ID | 平台名稱 | 網站分類 | 原始提供連結／推薦碼 | 查核狀態 (`linkStatus`) | 外連啟用 (`enabled`) | 瀏覽器導覽查核結果與最終目的地 |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | `line-bank` | LINE Bank 連線商業銀行 | 數位銀行 | `https://www.linebank.com.tw/R/mgm-portal?campaignId=2&uid=bfQnUx` | `VERIFIED` | 是 | HTTP 200，正常載入官方推薦開戶活動頁 |
| 2 | `new-new-bank` | 聯邦銀行 New New Bank | 數位銀行 | `https://newnewbank.ubot.com.tw/web/#/S0101001?pm=3&ID=ANIDEZI` | `VERIFIED` | 是 | HTTP 200，正常載入聯邦 New New Bank 申辦頁（保留 hash 內 `pm=3&ID=ANIDEZI`） |
| 3 | `richart` | 台新銀行 Richart | 數位銀行 | `https://richart.tw/TSDIB_RichartWeb/RC07/RC070100?sn=IPE2U&utm_source=richart&utm_medium=app&utm_campaign=richart_mgm_20230701` | `VERIFIED` | 是 | HTTP 200，正常載入台新 Richart 好友分享開戶頁 |
| 4 | `next-bank` | 將來商業銀行 NEXT BANK | 數位銀行 | 推薦碼：`HCPGD`（無網址） | `CODE_ONLY` | 是（僅複製碼） | 僅提供推薦碼複製與手動選取備援，不猜測網址 |
| 5 | `rakuten-bank` | 樂天國際商業銀行 | 數位銀行 | 推薦碼：`YCB0Y6`（無網址） | `CODE_ONLY` | 是（僅複製碼） | 僅提供推薦碼複製與手動選取備援，不猜測網址 |
| 6 | `bankee` | 遠東商銀 Bankee 社群銀行 | 數位銀行 | `https://www.bankee.tw/webview/app2/M00300/JLG12` | `UNKNOWN` | **否（停用外連）** | 伺服器回傳 HTTP 404 Not Found；標記 `UNKNOWN` 並停用外連，顯示「連結待確認」 |
| 7 | `sinotrade` | 永豐金證券 大戶投 | 證券開戶 | `https://www.sinotrade.com.tw/richclub/join/openact?invt=95DT7` | `VERIFIED` | 是 | HTTP 200，轉址至 `https://www.sinotrade.com.tw/openact?invt=95DT7&invt_src=b21dea68c71c69ef2b1814eecf7b5c53&strProd=0129&strWeb=0248&utm_campaign=MGM_inchannel&utm_medium=share_1126&utm_source=dawhotouAPP` 線上開戶頁 |
| 8 | `bitopro` | BitoPro 幣託交易所 | 台灣交易所 | `https://www.bitopro.com/users/sign_up?referrer=1637741422` | `VERIFIED` | 是 | HTTP 200，正常載入 `https://www.bitopro.com/users/sign_up?referrer=1637741422` 官方推薦註冊頁 |
| 9 | `max` | MAX 數位資產交易所 | 台灣交易所 | `https://max.maicoin.com/signup?r=4705d2fe` | `VERIFIED` | 是 | HTTP 200，正常載入 `https://max.maicoin.com/signup?r=4705d2fe` 官方推薦註冊頁 |
| 10 | `binance` | Binance | 國際交易所 | `https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00TNLH8TXZ` | `VERIFIED` | 是 | HTTP 200，轉址至 `https://www.binance.com/zh-TC/activity/referral/offers/claim?ref=CPA_00TNLH8TXZ` 官方邀請註冊頁 |
| 11 | `okx` | OKX | 國際交易所 | `https://okx.com/join/66386555` | `VERIFIED` | 是 | HTTP 200，導向 `https://www.okx.com/zh-hant/join/66386555` 官方註冊頁 |
| 12 | `crypto-com` | Crypto.com | 國際交易所 | `https://crypto.com/app/my9m72jntc` | `VERIFIED` | 是 | HTTP 200，導向 `https://accounts.crypto.com/zh-TW/signup?...&referral_code=my9m72jntc` 官方註冊頁 |
| 13 | `bitget` | Bitget | 國際交易所 | `https://share.bitget.com/u/T1X2F2SE` | `VERIFIED` | 是 | 短網址經真實瀏覽器導覽 HTTP 200 轉址至官方目的地：`https://www.bitget.com/zh-TC/referral/register?clacCode=7E3PSW6K&from=%2Fzh-TC%2Fevents%2Freferral&source=events` |
| 14 | `bybit` | Bybit | 國際交易所 | `https://www.bybit.com/invite?ref=Z6KMRD3` | `UNKNOWN` | **否（停用外連）** | 受反自動化／CDN 防護阻擋（HTTP 403 / `ERR_HTTP2_PROTOCOL_ERROR`）；標記 `UNKNOWN` 並停用外連，顯示「連結待確認」 |
| 15 | `redotpay` | RedotPay | 其他加密服務 | `https://url.hk/i/tw/ig6sj` | `VERIFIED` | 是 | 短網址經真實瀏覽器導覽 HTTP 200 轉址至官方目的地：`https://wap.redotpay.com/tw/invite/?referralId=ig6sj&poster_id=3` |
| 16 | `hoyabit` | HOYA BIT | 其他加密服務 | `https://hoyabit.com/signup?refCode=CjJH8Sgd` | `VERIFIED` | 是 | HTTP 200，正常載入 HOYA BIT 官方註冊頁 |
| 17 | `ether-fi` | ether.fi | 其他加密服務 | `https://www.ether.fi/@65a6f169` | `VERIFIED` | 是 | 分享網址經真實瀏覽器導覽 HTTP 200 轉址至官方目的地：`https://www.ether.fi/app/cash/referral?ref_code=65a6f169` |

## 驗收清單（RF-01 – RF-08）

| ID | 預期與必要證據 | 狀態 | 驗證證據 |
| --- | --- | :---: | --- |
| RF-01 | 17項來源逐筆對照，6銀行／1證券／2台灣交易所／5國際交易所／3其他加密服務；15個URL、2個碼，不遺漏或混用 | **PASS** | `tests/unit/lib.test.ts` 逐筆比對 `docs/referrals.owner-provided.json` 與 `src/content/recommendations.json` 共 17 項、5 大分類筆數（6/1/2/5/3）、15 個 URL 與 2 個推薦碼完全吻合。 |
| RF-02 | LINE Bank的campaignId及uid、New New Bank的hash內pm及ID、Richart完整query均保留；實際DOM href與來源一致 | **PASS** | `tests/unit/lib.test.ts` 與 Playwright `tests/e2e/all.spec.ts` 驗證實際渲染之 DOM `a[href]` 完整保留大小寫、query 與 hash 片段。 |
| RF-03 | 複製HCPGD及YCB0Y6大小寫正確；只有碼的卡片沒有假網址；失敗備援可操作 | **PASS** | Playwright `tests/e2e/all.spec.ts` 驗證點擊複製按鈕後剪貼簿內容精確為 `HCPGD` 與 `YCB0Y6`，卡片無外連 `a[href]`，且在剪貼簿權限拒絕時自動選取 `<code>` 推薦碼文字並將按鈕更新為「請手動複製（已選取）」。 |
| RF-04 | 15個URL逐筆查核，短網址最終目的地另外記錄；不可用／需登入／反自動化為UNKNOWN，不捏造成功 | **PASS** | 如上表完整記錄 15 個 URL 查核結果與 3 個短網址／分享網址之最終目的地；`bankee`（HTTP 404）與 `bybit`（HTTP 403）標記為 `UNKNOWN` 並停用外連按鈕。 |
| RF-05 | 全部卡片不含未核實優惠／卡片支付支援；提供日期與查核日期分離；利益揭露可達 | **PASS** | 全部 17 項均未設定 `offerText`，不含卡片或 AP/GP/LP 宣稱；明確分離顯示 `提供日期：2026-10-15`、`連結查核：2026-10-17 / 僅推薦碼`、`優惠查核：依平台公告`；利益揭露於側欄與推薦總覽清楚可達。 |
| RF-06 | 桌機／手機每頁有共用入口，側欄最多3項，推薦頁可找到全部項目；折疊／鍵盤／焦點正常，不擋試算 | **PASS** | Playwright `tests/e2e/all.spec.ts` 驗證桌機側欄與手機可折疊面板初始最多顯示 3 項並提供「查看全部 17 項推薦與利益揭露 →」連結；推薦總覽顯示全部 17 項；360px 手機與 1440px 桌機無全頁橫向溢位。 |
| RF-07 | URL輸入／文字顯示安全；未查核域名不自動放行；外連屬性與新分頁提示正確 | **PASS** | `src/lib/recommendations.ts` 實作 `ALLOWED_REFERRAL_HOSTNAMES` 白名單與 HTTPS 驗證；所有外連均具 `target="_blank" rel="sponsored noopener noreferrer"` 並標明「前往官方推薦頁（另開新分頁）」。 |
| RF-08 | 必要check／lint／build／focused tests／真實瀏覽器通過；試算數值與無第三方追蹤界線未改變 | **PASS** | `npm run check`（0 errors）、`npm run lint`（0 errors）、`npm test`（133 passed）、`npm run build`（12 pages）、`npm run test:e2e`（102 passed）全數通過，五項試算工具數值零變動。 |

