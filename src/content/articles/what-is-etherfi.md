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

<figure style="margin: 1.5rem 0;">
  <img src="/images/articles/etherfi/image.webp" alt="ether.fi 首頁儀表板，顯示淨資產、可用消費額度、借款能力與市場清單" width="1200" height="716" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" />
  <figcaption>首頁儀表板集中顯示淨資產、入金與轉帳入口、可用消費額度、借款能力及市場清單。</figcaption>
</figure>

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

<div class="image-side-by-side">
  <figure style="margin: 1.5rem 0;">
    <img src="/images/articles/etherfi/image6.webp" alt="產品總覽頁，依序顯示賺取收益、借款與質押資產區塊" width="1200" height="1665" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" class="image-width-limited image-portrait" />
    <figcaption>產品總覽將賺取收益、借款與質押分區呈現，並列出資產卡片及畫面當下的利率或收益率。</figcaption>
  </figure>
  <figure style="margin: 1.5rem 0;">
    <img src="/images/articles/etherfi/image7.webp" alt="Borrow 借款頁，顯示已借款、剩餘額度、還款按鈕、借款選項與風險入口" width="869" height="1647" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" class="image-width-limited image-portrait" />
    <figcaption>Borrow 頁列出已借款、剩餘額度與還款入口，下方包含使用中及可用的借款選項、風險與清算詳情及抵押品入口。</figcaption>
  </figure>
</div>

## 費用與限制

截至 2026-10-30 已查到的官方數字（都可能變動，使用前請以 app 與最新條款為準）：

- **Cash 卡會員分級**：Luxe US$199／年、Pinnacle US$999／年、VIP 邀請制；Core 為入門等級（[官方 Cashback 頁](https://www.ether.fi/cashback)）。
- **外幣交易手續費**：非美元消費依[持卡人協議（International）](https://etherfi.gitbook.io/etherfi/legal/ether.fi-legal/ether.fi-cash-cardholder-agreement-inc.-international)先按 1% 外幣基本匯率（FX Base Rate）換算；Core 等級最高另加 0.5%（50bps）、Luxe 等級最高另加 0.25%（25bps）附加費。
- **回饋**：官方顯示日常消費回饋 Luxe／Pinnacle 3%、VIP 4%（Core 等級回饋率：未驗證）；訂閱類消費回饋 Luxe 10%、Pinnacle 20%、VIP 30%，並設有每月上限（金額依等級，見[官方 Cashback 頁](https://www.ether.fi/cashback)與 [Cashback Rewards Program 條款](https://etherfi.gitbook.io/etherfi/legal/ether.fi-legal/ether.fi-cash-cashback-rewards-program-u.s.-and-international)）。回饋的稅務處理由持卡人自行負責（條款第 5 節）。
- **虛擬卡首卡費用**：Core 帳戶第一張虛擬卡通常免費；僅在官方指定國家（菲律賓、墨西哥、泰國等，台灣不在名單中）的第一張虛擬卡收 US$10（[Help Center](https://help.ether.fi/en/articles/833743-why-is-there-a-10-fee-for-my-first-virtual-cash-card)）。
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
