---
title: ether.fi 是什麼？適合誰、成本限制與風險一次看
description: 依官方文件整理 ether.fi 的定位（非託管加密新銀行）、Card／Markets／Borrow／Earn／Stake 各產品在做什麼，以及費用、地區限制與主要風險；並區分官方規則與作者觀點。
series: etherfi
seriesOrder: 2
author: Larry
publishedAt: "2026-10-29"
updatedAt: "2026-10-29"
checkedAt: "2026-10-29"
status: draft
audience:
  - 聽過 ether.fi，想在註冊前先了解它在做什麼的人
  - 想評估質押、Earn 或借款是否適合自己的新手
prerequisites:
  - 已讀過第 1 篇，了解錢包、穩定幣與網路的基本概念
sources:
  - title: ether.fi Docs｜首頁
    url: https://etherfi.gitbook.io/etherfi
  - title: ether.fi Docs｜Crypto Neobank Overview（白皮書介紹）
    url: https://etherfi.gitbook.io/etherfi/resources/ether.fi-whitepaper/introduction
  - title: ether.fi Docs｜Staking
    url: https://etherfi.gitbook.io/etherfi/products/staking
  - title: ether.fi Docs｜Earn（Liquid vaults）
    url: https://etherfi.gitbook.io/etherfi/products/liquid
  - title: ether.fi Docs｜Borrow
    url: https://etherfi.gitbook.io/etherfi/products/borrow
  - title: ether.fi Docs｜Risks
    url: https://etherfi.gitbook.io/etherfi/resources/ether.fi-whitepaper/risks
  - title: ether.fi Docs｜Security & Risks
    url: https://etherfi.gitbook.io/etherfi/security/security-and-risks
recommendationIds:
  - ether-fi
introFor:
  - ether-fi
---

> **閱讀前提醒**：本文不構成投資建議，所有收益、利率皆為變動且**不保證**。ether.fi 官方明確表示「ether.fi 不是受監管的金融機構」。

## 一句話認識 ether.fi

依官方介紹，ether.fi 是「一個帳戶管理你的錢」：資產放在**非託管的智能合約帳戶**，可以從這個帳戶消費、交易、借款、賺取收益、轉帳與質押（Crypto Neobank Overview）。

<div class="image-pair">
<figure>
  <img src="/images/articles/etherfi/m1a-portfolio-overview.webp" alt="ether.fi 投資組合總覽，顯示淨資產、入金與購買入口、已借款及可用餘額" width="864" height="728" loading="lazy" decoding="async" />
  <figcaption>投資組合頁集中顯示淨資產、入金與購買入口、已借款與可用餘額。</figcaption>
</figure>
<figure>
  <img src="/images/articles/etherfi/m1b-portfolio-assets.webp" alt="ether.fi 資產頁，列出 Liquid 金庫的 USD 與 ETH 收益，以及質押的 Staked ETH" width="864" height="866" loading="lazy" decoding="async" class="image-portrait" />
  <figcaption>資產頁分開列出 Liquid 金庫收益與質押中的 Staked ETH，並顯示各自的美元餘額與 APY。</figcaption>
</figure>
</div>

## 官方規則：產品有哪些

| 產品 | 官方說明重點 |
| --- | --- |
| Card | ether.fi Cash 卡消費；Direct Pay 用餘額付款，Borrow Mode 以抵押品借款消費、不必賣幣 |
| Markets | 買賣加密資產、代幣化股票與金屬（官方註明：代幣化股票與金屬不適用於美國及部分市場） |
| Borrow | 用持有的資產賺取收益，並可在不賣出的情況下抵押借款 |
| Earn | 存入 Liquid vaults，由 vault 分散到 DeFi 策略並自動再平衡 |
| Send | 鏈上轉帳，或使用所在地區提供的銀行／支付通道 |
| Stake | 質押 ETH 取得 eETH 或 weETH |
| Business | 團隊卡、角色、消費控管與資金工具 |

官方也說明：app 顯示的才是你帳戶可用的產品，**可用性依地區與帳戶類型而定**。

<div class="image-pair">
<figure>
  <img src="/images/articles/etherfi/m2a-earn-apy.webp" alt="ether.fi 賺取頁，顯示 USD、ETH、BTC、EUR 與黃金的浮動 APY" width="864" height="1157" loading="lazy" decoding="async" class="image-portrait" />
  <figcaption>賺取頁以分類列出各資產的浮動 APY；官方強調收益不保證。</figcaption>
</figure>
<figure>
  <img src="/images/articles/etherfi/m2b-earn-borrow.webp" alt="ether.fi 借款頁預覽，顯示可用抵押資產與 USDC、ETH 借款利率" width="864" height="391" loading="lazy" decoding="async" />
  <figcaption>借款頁可查看以 USDC、ETH 等資產抵押的借款利率，實際額度與利率以 App 為準。</figcaption>
</figure>
</div>

### 市場：代幣化股票與貴金屬

官方文件的 Markets 條目直接連到 App 內的市場頁；App 畫面顯示可買賣加密資產、代幣化股票與貴金屬。部分代幣化資產（如 PAXG、SPYx、QQQx）也可作為借款抵押品，實際可交易項目與可用性以 App 為準（[Lending market parameters](https://etherfi.gitbook.io/etherfi/products/borrow/lending-market-parameters)）。價格波動、脫錨、流動性與發行方風險見官方 [Risks](https://etherfi.gitbook.io/etherfi/resources/ether.fi-whitepaper/risks) 頁。

<figure style="margin: 1.5rem 0;">
  <img src="/images/articles/etherfi/m7-market-all.webp" alt="ether.fi 市場頁「全部」分類，顯示購買、出售並作為抵押品使用的說明，以及黃金、白銀、質押黃金等資產" width="864" height="1110" loading="lazy" decoding="async" class="image-portrait" />
  <figcaption>市場頁「全部」分類可切換貴金屬、股票、質押與加密貨幣；頁首說明資產可購買、出售並作為抵押品使用。</figcaption>
</figure>

<div class="image-pair">
<figure>
  <img src="/images/articles/etherfi/m4-market-precious-metals.webp" alt="ether.fi 市場頁的貴金屬分類，列出黃金、白銀、黃金 ETF、鉑金與質押黃金等代幣化資產" width="864" height="1402" loading="lazy" decoding="async" class="image-portrait" />
  <figcaption>貴金屬分類列出各代幣化金屬資產的價格與漲跌幅。</figcaption>
</figure>
<figure>
  <img src="/images/articles/etherfi/m6-market-stocks.webp" alt="ether.fi 市場頁的股票分類，列出標普 500、那斯達克 100、T-Bill 與特斯拉等代幣化股票" width="864" height="1063" loading="lazy" decoding="async" class="image-portrait" />
  <figcaption>股票分類列出代幣化股票及其價格與漲跌幅；實際可交易項目以 App 顯示為準。</figcaption>
</figure>
</div>

### ether.fi 由哪些部分組成

- **App**：顯示帳戶、建立並核准指令。
- **ether.fi protocol**：執行質押、帳戶權限與 Cash 整合的智能合約。
- **第三方協議與服務商**：負責 Earn、Markets、轉帳、身分驗證與發卡的部分環節。
- **Cash 卡**：由持卡人協議中載明的發卡機構（Issuer）發行，**與 ether.fi protocol 無關聯**。

### Stake：eETH 與 weETH

- 質押 ETH 會拿到 eETH 或 weETH，兩者都累積以太坊質押獎勵。
- eETH 是 rebasing（餘額會變動）代幣；weETH 是包裝後、非 rebasing 的版本，方便在 DeFi 使用。
- 贖回時間取決於協議可用流動性、以太坊驗證者提領與網路狀況。
- weETHs 等再質押產品是**另外選擇**，有各自的獎勵來源與風險。

### Earn：Liquid vaults

- 存入 ETH、eETH、BTC 或穩定幣等資產，由 vault 分散到 DeFi 部位並再平衡。
- 目前 vault 由 Veda（BoringVault 架構）或 Midas（真實世界資產與 reserve vault）提供基礎設施。
- 官方明言：**報酬為浮動、不保證**，每個 vault 都有智能合約、市場、流動性與第三方協議風險。

### Borrow：超額抵押借款

- 借款為超額抵押，抵押品價值必須足以支撐債務。
- **Product LTV** 是 app 允許的借款上限；**Collateral factor（CF）** 是清算門檻，LTV 低於 CF 以保留安全緩衝。
- 借款力 = 各抵押資產美元價值 × Product LTV 加總；**健康因子低於 1.00 即可能被清算**（[Borrowing Power, Health Factor, and Liquidation](https://etherfi.gitbook.io/etherfi/products/borrow/borrowing-power-and-liquidation)）。
- 目前的 Product LTV、健康因子、利率與可借金額，以 **app 顯示為準**。
- 細節（健康因子、清算）在第 3 篇有逐步說明。

## 費用與限制

截至 2026-10-30 已查到的官方數字（都可能變動，使用前請以 app 與最新條款為準）：

- **Cash 卡會員分級**：Luxe US$199／年、Pinnacle US$999／年、VIP 邀請制；Core 為入門等級（[官方 Cashback 頁](https://www.ether.fi/cashback)）。
- **外幣交易手續費**：非美元消費依[持卡人協議（International）](https://etherfi.gitbook.io/etherfi/legal/ether.fi-legal/ether.fi-cash-cardholder-agreement-inc.-international)先按 1% 外幣基本匯率（FX Base Rate）換算；Core 等級最高另加 0.5%（50bps）、Luxe 等級最高另加 0.25%（25bps）附加費。
- **回饋**：Core 等級每月合格消費前 US$2,000 享 3%；Luxe／Pinnacle 日常消費 3%、VIP 4%。訂閱類消費回饋 Luxe 10%、Pinnacle 20%、VIP 30%，並設有每月上限（金額依等級，見[官方 Cashback 頁](https://www.ether.fi/cashback)、[Help Center](https://help.ether.fi/en/articles/304368-what-are-the-benefits-of-a-personal-cash-credit-card)與 [Cashback Rewards Program 條款](https://etherfi.gitbook.io/etherfi/legal/ether.fi-legal/ether.fi-cash-cashback-rewards-program-u.s.-and-international)）。回饋的稅務處理由持卡人自行負責（條款第 5 節）。
- **虛擬卡**：Core 內含 1 張虛擬卡，之後每張加購 US$10；僅在官方指定國家（菲律賓、墨西哥、泰國等，台灣不在名單中）的第一張虛擬卡也收 US$10（[Help Center](https://help.ether.fi/en/articles/833743-why-is-there-a-10-fee-for-my-first-virtual-cash-card)、[Help Center｜卡片權益](https://help.ether.fi/en/articles/304368-what-are-the-benefits-of-a-personal-cash-credit-card)）。
- **實體卡寄送**：地址需使用英文字元、不收 PO Box，送出後不可修改；到貨後在 App 啟用並設定 PIN（[Help Center｜Physical Cards](https://help.ether.fi/en/articles/842973-physical-cards)）。實體卡運費與第二張卡費用：以 App 下單前顯示為準。
- **ATM 提領（個人卡）**：單次上限 US$5,000、24 小時滾動上限 US$25,000，24 小時內最多提領 5 次（[Help Center](https://help.ether.fi/en/articles/303623-what-are-the-atm-withdrawal-limits-for-personal-cash-cards)）。
- Gas 等鏈上手續費會變動，本文不列具體數字。
- 地區限制：部分產品在部分地區不可用。官方 Help Center 列出「實體 Cash 卡目前可申請的國家」清單，台灣在清單中，仍需通過 KYC 與合規審查，清單可能變動（[Help Center](https://help.ether.fi/en/articles/758780-in-which-countries-is-the-cash-card-available)）。Cash 以外的產品在台灣的可用性尚未逐項查證，以 app 顯示為準。

## 主要風險（官方 Risks 頁整理）

- **帳戶存取**：登入方式被盜、遺失簽署裝置、核准惡意指令、復原機制被濫用。
- **智能合約**：漏洞、攻擊、設定錯誤、升級、特權角色、預言機失效。
- **區塊鏈與跨鏈橋**：壅塞、中斷、跨鏈橋失效、存入不支援網路。
- **市場與資產**：價格波動、脫鉤、流動性不足、發行方失敗。
- **Stake**：驗證者懲罰（slashing）、提領延遲、weETH 交易價格低於贖回價值。
- **Earn**：vault 可能虧損、延遲提領或流動性不足；過去或顯示的報酬不代表保證。
- **Borrow**：利率變動；健康因子達清算門檻時，部分或全部抵押品可能被清算。
- **卡片**：受持卡人協議與發卡機構條款約束，費用、回饋、額度與支援地區都可能變動。
- **法規**：ether.fi 不是受監管金融機構；法規、稅務與產品條款可能改變。

## 作者觀點：適合誰、不適合誰

> 以下為作者個人看法，非官方規則。

**可能適合：**

- 已經會自己做鏈上轉帳，想把加密資產用在日常消費或抵押借款的人。
- 能接受資產價格波動，並願意花時間讀懂風險與條款的人。

**可能不適合：**

- 還分不清網路、不會做小額測試的新手（建議先讀第 1 篇並實際練習）。
- 需要保本、或期待「穩定配息」的人——官方明言收益不保證。
- 無法承受清算風險卻想借款的人。

> **待補**：作者 Earn／Stake／Borrow 的實際使用心得。
<!-- TODO(作者後補): 作者 Earn/Stake/Borrow 使用心得（不可捏造數字） -->

## 下一步

如果你想申請 Cash 卡，下一篇會逐步說明開戶流程，以及 Direct Pay 與 Borrow Mode 的差別。
