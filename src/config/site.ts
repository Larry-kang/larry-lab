export const site = {
  name: 'Larry Lab',
  tagline: '把假設算清楚，再做決定',
  subtitle: '免登入，財金試算在你的瀏覽器完成',
  description: 'Larry Lab 是公開的個人財金試算工具箱，提供房貸、信貸、股票質押、退休與投資組合試算，所有計算均在瀏覽器本機完成，無後端儲存與第三方追蹤。',
  author: 'Larry｜C#／.NET 後端工程師，關注系統整合、交易可靠性與 AI 協作。',
  githubProfile: 'https://github.com/Larry-kang',
  githubRepo: 'https://github.com/Larry-kang/larry-lab',
  referralNotice: '透過部分推薦連結註冊或使用服務，我可能獲得獎勵；不影響試算結果，優惠與適用條件請以平台公告為準。',
} as const;

export interface ToolMeta {
  id: string;
  path: string;
  name: string;
  category: '買房與借貸' | '投資與退休';
  intentQuestion: string;
  problemSolved: string;
  mainOutputs: string;
  summary: string;
  synonyms: string[];
}

export const tools: ToolMeta[] = [
  {
    id: 'mortgage',
    path: '/tools/mortgage/',
    name: '房貸試算',
    category: '買房與借貸',
    intentQuestion: '買房月付多少？',
    problemSolved: '評估購屋負擔、寬限期後月付暴增壓力與不同貸款年限之總利息支出。',
    mainOutputs: '首期與一般月付、總利息支出、含費用總支出、收支負擔比 (DTI)。',
    summary: '固定或分段利率、本息或本金平均攤還、寬限期與費用，附逐月攤還表與方案比較。',
    synonyms: ['房貸', '購屋', '頭期款', '月付', '買房', '房屋貸款', '本息均攤', '本金均攤', '寬限期', '成數', 'dti'],
  },
  {
    id: 'personal-loan',
    path: '/tools/personal-loan/',
    name: '信貸試算',
    category: '買房與借貸',
    intentQuestion: '借款成本差多少？',
    problemSolved: '看清開辦費等手續費對實質借款成本的影響，比較不同銀行方案之真正年化利率。',
    mainOutputs: '每月還款金額、總利息支出、扣除費用後可用金額、估算有效年化成本。',
    summary: '月付金、總利息與依現金流估算的有效年化成本，費用也一併納入比較。',
    synonyms: ['信貸', '借款', '開辦費', '借貸', '信用貸款', '年化成本', '有效年化', 'irr', '手續費'],
  },
  {
    id: 'stock-pledge',
    path: '/tools/stock-pledge/',
    name: '股票質押試算',
    category: '買房與借貸',
    intentQuestion: '質押跌多少要注意？',
    problemSolved: '掌握持股市值變動對擔保維持率的影響，計算追繳跌幅門檻與補足目標之所需金額。',
    mainOutputs: '目前維持率、到警示門檻跌幅、期間利息、還款或追加擔保品金額。',
    summary: '維持率、期間利息與擔保品漲跌壓力情境，分開說明還款與追加擔保品。',
    synonyms: ['質押', '維持率', '追繳', '股票質押', '擔保品', '斷頭', '質借', '借券', '擔保借款'],
  },
  {
    id: 'retirement',
    path: '/tools/retirement/',
    name: '退休試算',
    category: '投資與退休',
    intentQuestion: '還要存多少才能退休？',
    problemSolved: '依通膨、投資報酬與生活支出，推算達成目標退休所需的資產規模與每月儲蓄金額。',
    mainOutputs: '目標退休所需本金、每月應存金額、最早可退休年齡、預估資產消耗年齡。',
    summary: '所需本金、最早可退休年齡與資金不足年齡，三組情境並排比較。',
    synonyms: ['退休', 'fire', '財務自由', '退休金', '養老', '4%法則', '生活費', '通膨', '年金'],
  },
  {
    id: 'portfolio',
    path: '/tools/portfolio/',
    name: '投資組合試算',
    category: '投資與退休',
    intentQuestion: '配置改變會有什麼影響？',
    problemSolved: '試算多資產配置之負債槓桿與市場下跌衝擊，或推估定期定額年度再平衡之長期複利累積。',
    mainOutputs: '總資產與淨值、負債槓桿倍數、壓力後淨值變動、長期累積資產總值與總收益。',
    summary: '資產配置與漲跌壓力、負債槓桿，以及無槓桿的年度再平衡累積推估。',
    synonyms: ['配置', '組合', '再平衡', '投資組合', '資產配置', '槓桿', '壓力測試', '股債配置', '累積'],
  },
];

export const navItems = [
  { key: 'home', href: '/', label: '首頁' },
  { key: 'tools', href: '/tools/', label: '工具大全' },
  { key: 'recommendations', href: '/recommendations/', label: '推薦優惠' },
  { key: 'about', href: '/about/', label: '關於 Larry' },
] as const;

/**
 * 依據關鍵字與分類篩選工具（純記憶體字串比對，不外傳，忽略前後空白，英文不分大小寫）
 */
export function filterTools(query: string, category: string = '全部'): ToolMeta[] {
  const trimmed = query.trim().toLowerCase();
  return tools.filter((tool) => {
    const matchCategory = category === '全部' || tool.category === category;
    if (!matchCategory) return false;
    if (!trimmed) return true;

    // 比對名稱、問題、輸出、摘要與同義詞
    const nameMatch = tool.name.toLowerCase().includes(trimmed);
    const questionMatch = tool.intentQuestion.toLowerCase().includes(trimmed);
    const summaryMatch = tool.summary.toLowerCase().includes(trimmed);
    const problemMatch = tool.problemSolved.toLowerCase().includes(trimmed);
    const synonymMatch = tool.synonyms.some((syn) => syn.toLowerCase().includes(trimmed));

    return nameMatch || questionMatch || summaryMatch || problemMatch || synonymMatch;
  });
}
