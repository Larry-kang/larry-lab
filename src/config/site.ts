export const site = {
  name: 'Larry Lab',
  tagline: '財金、工程與生活實用工具，讓計算與決策更清楚。',
  description: 'Larry Lab 是公開的個人工具網站，第一版提供房貸、信貸、股票質押、退休與投資組合試算，所有計算都在你的瀏覽器本機完成。',
  author: 'Larry｜C#／.NET 後端工程師，關注系統整合、交易可靠性與 AI 協作。',
  githubProfile: 'https://github.com/Larry-kang',
  githubRepo: 'https://github.com/Larry-kang/larry-lab',
  referralNotice: '透過部分連結註冊，我可能獲得推薦獎勵；請自行確認平台條件。',
} as const;

export interface ToolMeta {
  id: string;
  path: string;
  name: string;
  category: '買房與借貸' | '投資與退休';
  summary: string;
}

export const tools: ToolMeta[] = [
  {
    id: 'mortgage',
    path: '/tools/mortgage/',
    name: '房貸試算',
    category: '買房與借貸',
    summary: '固定或分段利率、本息或本金平均攤還、寬限期與費用，附逐月攤還表與方案比較。',
  },
  {
    id: 'personal-loan',
    path: '/tools/personal-loan/',
    name: '信貸試算',
    category: '買房與借貸',
    summary: '月付金、總利息與依現金流估算的有效年化成本，費用也一併納入比較。',
  },
  {
    id: 'stock-pledge',
    path: '/tools/stock-pledge/',
    name: '股票質押試算',
    category: '買房與借貸',
    summary: '維持率、期間利息與擔保品漲跌壓力情境，分開說明還款與追加擔保品。',
  },
  {
    id: 'retirement',
    path: '/tools/retirement/',
    name: '退休試算',
    category: '投資與退休',
    summary: '所需本金、最早可退休年齡與資金不足年齡，三組情境並排比較。',
  },
  {
    id: 'portfolio',
    path: '/tools/portfolio/',
    name: '投資組合試算',
    category: '投資與退休',
    summary: '資產配置與漲跌壓力、負債槓桿，以及無槓桿的年度再平衡累積推估。',
  },
];

export const navItems = [
  { key: 'home', href: '/', label: '首頁' },
  { key: 'tools', href: '/tools/', label: '工具' },
  { key: 'recommendations', href: '/recommendations/', label: '推薦' },
  { key: 'about', href: '/about/', label: '關於' },
] as const;
