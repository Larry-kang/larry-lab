// Utility function to map logo filenames to meaningful alt text
export const getLogoAlt = (logo: string): string => {
  if (!logo) return '';
  
  // Extract filename from path
  const filename = logo.split('/').pop();
  
  // Map logo filenames to meaningful alt text
  const logoAltMap: Record<string, string> = {
    'line-bank.png': 'LINE Bank 數位銀行標誌',
    'new-new-bank.png': '聯邦 New New Bank 數位帳戶標誌',
    'sinotrade.png': '永豐金證券標誌',
    'firstrade.png': 'Firstrade 第一證券標誌',
    'richart.png': '台新 Richart 數位帳戶標誌',
    'next-bank.png': '將來銀行標誌',
    'binance.png': 'Binance 國際加密資產交易所標誌',
    'okx.png': 'OKX 國際加密資產交易平台標誌',
    'crypto-com.png': 'Crypto.com 國際加密資產平台標誌',
    'ether-fi.png': 'ether.fi 去中心化質押與應用標誌',
  };
  
  return logoAltMap[filename] || `${filename.replace(/\.(png|jpg|webp)$/, '')} 平台標誌`;
};
