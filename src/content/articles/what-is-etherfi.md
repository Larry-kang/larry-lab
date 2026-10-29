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

<figure style="margin: 1.5rem 0;">
  <img src="/images/articles/etherfi/image6.webp" alt="產品總覽頁，依序顯示賺取收益、借款與質押資產區塊" width="1200" height="1665" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" />
  <figcaption>產品總覽將賺取收益、借款與質押分區呈現，並列出資產卡片及畫面當下的利率或收益率。</figcaption>
</figure>

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
- 目前的 Product LTV、健康因子、利率與可借金額，以 **app 顯示為準**。
- 細節（健康因子、清算）在第 3 篇有逐步說明。

<figure style="margin: 1.5rem 0;">
  <img src="/images/articles/etherfi/image7.webp" alt="Borrow 借款頁，顯示已借款、剩餘額度、還款按鈕、借款選項與風險入口" width="869" height="1647" loading="lazy" decoding="async" style="max-width: 100%; height: auto;" />
  <figcaption>Borrow 頁列出已借款、剩餘額度與還款入口，下方包含使用中及可用的借款選項、風險與清算詳情及抵押品入口。</figcaption>
</figure>

## 費用與限制

- 官方文件未列出卡片、兌換或各產品的固定費率 → **未驗證**，請以 app 與持卡人協議為準。
- Gas、跨鏈與兌換滑價等成本會變動，本文不列具體數字。
- 地區限制：部分產品在部分地區不可用；台灣是否可使用各項產品 → **未驗證**，以 app 顯示為準。

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
