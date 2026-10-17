import { describe, expect, it } from 'vitest';
import { filterTools, tools } from '../../src/config/site';

describe('工具清單與同義詞搜尋', () => {
  it('空白或全形空白回傳全部 5 項工具', () => {
    expect(filterTools('')).toHaveLength(5);
    expect(filterTools('   ')).toHaveLength(5);
  });

  it('同義詞正確篩選對應工具', () => {
    // 房貸
    expect(filterTools('購屋').map((t) => t.id)).toContain('mortgage');
    expect(filterTools('頭期款').map((t) => t.id)).toContain('mortgage');
    expect(filterTools('月付').map((t) => t.id)).toContain('mortgage');

    // 信貸
    expect(filterTools('借款').map((t) => t.id)).toContain('personal-loan');
    expect(filterTools('開辦費').map((t) => t.id)).toContain('personal-loan');

    // 質押
    expect(filterTools('維持率').map((t) => t.id)).toContain('stock-pledge');
    expect(filterTools('追繳').map((t) => t.id)).toContain('stock-pledge');

    // 退休
    expect(filterTools('fire').map((t) => t.id)).toContain('retirement');
    expect(filterTools('FIRE').map((t) => t.id)).toContain('retirement');
    expect(filterTools('財務自由').map((t) => t.id)).toContain('retirement');

    // 投資組合
    expect(filterTools('配置').map((t) => t.id)).toContain('portfolio');
    expect(filterTools('再平衡').map((t) => t.id)).toContain('portfolio');
  });

  it('不存在的詞彙回傳空陣列（零結果）', () => {
    expect(filterTools('比特幣挖礦機器人')).toEqual([]);
    expect(filterTools('xyzabc999')).toEqual([]);
  });

  it('分類篩選與關鍵字可共同作用', () => {
    expect(filterTools('', '買房與借貸')).toHaveLength(3);
    expect(filterTools('', '投資與退休')).toHaveLength(2);
    expect(filterTools('退休', '買房與借貸')).toHaveLength(0);
    expect(filterTools('退休', '投資與退休')).toHaveLength(1);
  });

  it('五工具均具備目的問句與主要輸出說明', () => {
    for (const tool of tools) {
      expect(tool.intentQuestion).toBeTruthy();
      expect(tool.problemSolved).toBeTruthy();
      expect(tool.mainOutputs).toBeTruthy();
      expect(tool.synonyms.length).toBeGreaterThan(0);
    }
  });
});
