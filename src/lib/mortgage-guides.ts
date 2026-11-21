export const mortgageGuides = [
  { id: 'term', title: '房貸 30 年還是 40 年？比較月付與總利息', summary: '用同一筆本金和利率，看看延長年限會少付多少月付、增加多少總利息。' },
  { id: 'grace', title: '房貸寬限期結束後，月付會增加多少？', summary: '比較無寬限期與前兩年只繳利息，找出第 25 期的月付變化。' },
] as const;
export const mortgageGuideDate = '2026-11-21';
export const mortgageGuidePath = (id: string) => `/guides/mortgage/${id}/`;
