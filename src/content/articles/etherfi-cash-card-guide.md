---
title: ether.fi Cash 卡申請與付款逐步教學（Direct Pay vs Borrow Mode）
description: 依官方 Quickstart 逐步說明 ether.fi 開戶與 Cash 卡申請，並比較 Direct Pay 與 Borrow Mode：可扣款資產、扣款優先順序、健康因子、清算與還款限制。
series: etherfi
seriesOrder: 3
author: Larry
publishedAt: "2026-10-29"
updatedAt: "2026-10-29"
checkedAt: "2026-10-29"
status: draft
audience:
  - 想申請 ether.fi Cash 卡的新手
  - 想弄清楚 Direct Pay 與 Borrow Mode 差別、避免被清算的人
prerequisites:
  - 已讀過第 1 篇（錢包、穩定幣、網路）
  - 已讀過第 2 篇（ether.fi 產品與風險）
sources:
  - title: ether.fi Docs｜Quickstart
    url: https://etherfi.gitbook.io/etherfi/quickstart
  - title: ether.fi Help Center｜How to open an ether.fi account
    url: https://help.ether.fi/en/articles/602690-how-to-open-an-ether-fi-account
  - title: ether.fi Docs｜Cash Card
    url: https://etherfi.gitbook.io/etherfi/products/cash
  - title: ether.fi Docs｜Cash Technical Documentation
    url: https://etherfi.gitbook.io/etherfi/products/cash/technical-documentation
  - title: ether.fi Docs｜Direct Pay mode
    url: https://etherfi.gitbook.io/etherfi/products/cash/direct-pay
  - title: ether.fi Docs｜Borrowing Power, Health Factor, and Liquidation
    url: https://etherfi.gitbook.io/etherfi/products/borrow/borrowing-power-and-liquidation
  - title: ether.fi Docs｜Repaying a Borrow
    url: https://etherfi.gitbook.io/etherfi/products/borrow/repaying
  - title: ether.fi Docs｜Risks
    url: https://etherfi.gitbook.io/etherfi/resources/ether.fi-whitepaper/risks
  - title: ether.fi Docs｜Account upgrade
    url: https://etherfi.gitbook.io/etherfi/products/cash/account-upgrade
recommendationIds:
  - ether-fi
introFor: []
---

> **閱讀前提醒**：卡片的費用、回饋、額度與支援地區受持卡人協議與發卡機構條款約束，且可能變動。**台灣是否可申請、具體費率、實體卡運費皆未驗證**，請以 app 與官方條款為準。本文不保證任何回饋或收益。

## 官方規則：開戶與申請步驟

依官方 Quickstart：

1. **選擇帳戶類型**：前往官方 sign-up 頁，選 Personal（個人）或 Business（企業）。
2. **驗證 email**：輸入 email，填入收到的驗證碼。
3. **同意使用條款**：閱讀並接受 Terms of Use。
4. **建立 passkey**：用裝置建立 passkey，之後以它登入與核准操作，**沒有密碼**。
5. **依要求完成身分驗證**：Cash 卡與銀行轉帳需要身分驗證；部分地區需先入金才會開始驗證，app 會告訴你需要什麼。
6. **入金並開始使用**：以帳戶顯示的方式入金，再訂購 Cash 卡。

官方提醒：可用的產品、資產、利率與額度依地區不同，以 app 顯示為準。

<figure style="margin: 1.5rem 0;">
  <img src="/images/articles/etherfi/image8.webp" alt="新增卡片頁，提供虛擬與實體分頁，畫面目前選取虛擬卡片" width="937" height="1112" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" />
  <figcaption>新增卡片頁提供「虛擬」與「實體」分頁；目前選取虛擬卡片，並顯示卡片示意圖與選擇按鈕。</figcaption>
</figure>

> **待補**：作者申請流程心得與 KYC 截圖（遮罩個資）。
<!-- TODO(作者後補): 作者申請心得、KYC 截圖（遮罩個資） -->

## 官方規則：Cash 卡是什麼

- Cash 包含一個連到 ether.fi 帳戶的 mobile app，以及一張可用帳戶餘額消費的 **Visa 卡**，也能以加密資產抵押借款消費（Cash Card 頁）。
- 依 Cash Technical Documentation：開戶時會自動部署專屬的 Vault 智能合約、金鑰由 Turnkey 安全飛地（TEE）管理、可自行設定每日／每月消費上限。
- 核心鏈為 **Optimism**，可從 Ethereum、Base、Arbitrum、HyperEVM 儲值（Technical Documentation）；官方「Account upgrade」頁說明 2026 年 4 月起核心鏈更新為 Optimism，原核心鏈改為儲值鏈。實際支援網路與資產仍請以 app 入金畫面為準。

<figure style="margin: 1.5rem 0;">
  <img src="/images/articles/etherfi/image5.webp" alt="ether.fi 官方手機介面示意圖，顯示資產總覽、入金入口與 Borrow Mode 標籤" width="649" height="1287" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" />
  <figcaption>官方行銷示意圖呈現手機版資產總覽、Deposit 等操作入口與 Borrow Mode 標籤。圖片來源：ether.fi</figcaption>
</figure>

## Direct Pay 與 Borrow Mode 比較

| 項目 | Direct Pay | Borrow Mode |
| --- | --- | --- |
| 付款來源 | 帳戶既有餘額 | 以抵押品借款 |
| 是否產生貸款 | 否 | 是，會累積利息 |
| 是否賣出資產 | 從餘額扣款 | 不賣出抵押品 |
| 主要風險 | 穩定幣／vault 本身風險 | 健康因子下降、清算 |

### Direct Pay：用餘額直接付

- 可扣款的餘額：
  - 穩定幣：USDC、USDT、EURC、frxUSD
  - Liquid vault 餘額：Liquid USD、Liquid RWA、Liquid Reserve、Liquid EUR（直接從 vault 付款，不必先提領）
- 在 **Set Spend Priority** 選擇優先扣款的資產；若不足以支付，卡片會改由其他足額的餘額支付。
- 若有未結清貸款，作為擔保的部分不能拿來消費，所以可用金額可能低於總餘額。

### Borrow Mode：抵押借款消費

- 卡片以你的資產作抵押借款，而不是直接花掉資產。
- **Product LTV**：app 執行的借款上限。**Collateral factor（CF）**：清算門檻。每個資產的 Product LTV 都低於自己的 CF，兩者差距就是安全緩衝。
- **健康因子** = 抵押價值 × CF ÷ 總債務（含應計利息）。≥ 1.00 為健康；**< 1.00 即可被清算**，且協議不提供寬限期。
- 就算什麼都不做、價格也沒變，**利息累積也會讓健康因子緩慢下降**。
- 債務超過 Product LTV（例如價格下跌）只會**阻擋新的借款**，不等於清算，但代表緩衝變薄。
- 清算通常是**部分清算**：清算人償還部分債務、取得抵押品加獎勵，讓健康因子回到略高於 1 的目標值；清算獎勵隨健康程度內插，越不健康成本越高，所以越早處理越好。
- 拉高健康因子的方法：**還一部分債**或**追加抵押品**。

<figure style="margin: 1.5rem 0;">
  <img src="/images/articles/etherfi/image9.webp" alt="設定頁顯示借款已啟用，並列出顯示幣種、借貸幣種及現金回饋提領資產" width="1200" height="563" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" />
  <figcaption>設定頁的借款開關顯示「已啟用」，下方列出顯示幣種、借貸幣種、語言、帳戶餘額顯示及現金回饋提領資產。</figcaption>
</figure>

### 還款方式與限制

可隨時部分或全額還款（官方註明數字可能變動，以 app 為準）：

| 還款方式 | 每 24 小時上限 | 注意事項 |
| --- | --- | --- |
| 借入的資產本身 | 無每日上限 | 健康因子低時，app 可提供的金額可能少於餘額 |
| Liquid USD | US$10,000 | 償還 USDC 貸款，即時，不必排提領佇列 |
| Liquid RWA | 已驗證身分 US$10,000；未驗證 US$2,500 | 償還 USDC 貸款；7 天內借的債務不能用它還 |
| Liquid EUR | 已驗證身分 US$10,000；未驗證 US$2,500 | 償還 EURC 貸款 |

三種 Liquid 還款額度分開計算。

## 費用、回饋與地區（未驗證）

- 卡片費用、匯率／外幣手續費、回饋比例：官方文件未列固定數字 → **未驗證**。
- 台灣居民是否可申請 Cash 卡、實體卡運費與寄送時間 → **未驗證**。
- 官方 Risks 頁說明：卡片使用受持卡人協議與發卡機構條款約束，可用性、權益、額度、回饋、費用、爭議處理與支援地區都可能變動；Cash 卡與 ether.fi protocol 無關聯。

<figure style="margin: 1.5rem 0;">
  <img src="/images/articles/etherfi/image10.webp" alt="消費活動紀錄，顯示新台幣消費、美元換算、現金回饋與待處理狀態" width="1185" height="281" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" />
  <figcaption>活動紀錄同列顯示新台幣消費金額、美元換算、現金回饋及「待處理」狀態；商家資訊已遮罩。</figcaption>
</figure>

## 作者觀點

> 以下為作者個人看法，非官方規則。

- 新手先用 Direct Pay、只放打算花的穩定幣，比較容易掌握風險。
- 若使用 Borrow Mode，不要借到上限；定期看健康因子，並預留還款資金。
- 設定每日／每月消費上限，降低卡號外洩時的損失。

> **待補**：作者實際使用 Cash 卡的心得。
<!-- TODO(作者後補): 作者 Cash 卡使用心得（不可捏造回饋或費用數字） -->

## 風險整理

- 帳戶存取風險：passkey 裝置遺失或核准惡意指令。
- 智能合約與第三方支付基礎設施風險。
- Borrow Mode 清算風險：價格下跌或利息累積讓健康因子 < 1.00。
- 穩定幣脫鉤、Liquid vault 虧損或流動性不足。
- 地區與法規：ether.fi 不是受監管金融機構，產品可能不適用於你的所在地。
