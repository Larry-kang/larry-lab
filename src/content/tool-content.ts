import data from './tool-content.json';
import { tools } from '../config/site';

export interface ToolContent {
  title: string; updatedAt: string; assumptions: string; formula: string; limitations: string;
  faqs: { question: string; answer: string }[]; related: string[]; reviewNote?: string;
}

export function validateToolContent(content: Record<string, ToolContent>): void {
  const ids = tools.map(tool => tool.id);
  if (Object.keys(content).length !== ids.length) throw new Error('工具內容數量不符');
  for (const id of ids) {
    const item = content[id];
    if (!item || !item.title || !item.assumptions || !item.formula || !item.limitations || !item.faqs.length) throw new Error(`工具內容缺漏：${id}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.updatedAt) || !Number.isFinite(Date.parse(item.updatedAt)) || new Date(item.updatedAt).toISOString().slice(0, 10) !== item.updatedAt) throw new Error(`內容日期無效：${id}`);
    if (item.related.some(other => !ids.includes(other) || other === id)) throw new Error(`相關工具無效：${id}`);
    if (item.faqs.some(faq => !faq.question || !faq.answer)) throw new Error(`問答缺漏：${id}`);
  }
}

export const toolContent: Record<string, ToolContent> = data;
validateToolContent(toolContent);
