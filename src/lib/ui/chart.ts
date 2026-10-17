import type { ChartSpec } from './types';
import { formatPercent } from '../format';

const SVG_NS = 'http://www.w3.org/2000/svg';
const W = 720;
const H = 320;
const M = { left: 84, right: 20, top: 20, bottom: 48 };

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Nice axis ticks covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= pad;
    max += pad;
  }
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.5; v += step) {
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return ticks;
}

export function formatCompactTwd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e8) return `${sign}${trim(abs / 1e8)} 億`;
  if (abs >= 1e4) return `${sign}${trim(abs / 1e4)} 萬`;
  return `${sign}${Math.round(abs)}`;
}

function trim(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '');
}

function sample<T>(points: T[], limit = 300): T[] {
  if (points.length <= limit) return points;
  const stride = Math.ceil(points.length / limit);
  const out = points.filter((_, i) => i % stride === 0);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}

/** Accessible SVG line chart with a legend and an equivalent data table. */
export function renderChart(spec: ChartSpec, idPrefix: string): HTMLElement {
  const figure = el('figure', 'chart');
  const allX = spec.series.flatMap((s) => s.points.map((p) => p[0]));
  const allY = spec.series.flatMap((s) => s.points.map((p) => p[1]));
  (spec.hLines ?? []).forEach((l) => allY.push(l.y));
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  let yMin = Math.min(...allY, 0);
  let yMax = Math.max(...allY, 0);
  if (spec.yKind === 'percent') {
    yMin = Math.min(...allY);
    yMax = Math.max(...allY);
  }
  const yTicks = niceTicks(yMin, yMax);
  const yLo = yTicks[0];
  const yHi = yTicks[yTicks.length - 1];
  const xTicks = niceTicks(xMin, xMax, 6).filter((t) => t >= xMin - 1e-9 && t <= xMax + 1e-9);
  const sx = (x: number) => M.left + ((x - xMin) / (xMax - xMin || 1)) * (W - M.left - M.right);
  const sy = (y: number) => H - M.bottom - ((y - yLo) / (yHi - yLo || 1)) * (H - M.top - M.bottom);
  const yFormat = (v: number) => (spec.yKind === 'twd' ? formatCompactTwd(v) : formatPercent(v, 0));

  const titleId = `${idPrefix}-title`;
  const descId = `${idPrefix}-desc`;
  const root = svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-labelledby': `${titleId} ${descId}`,
    class: 'chart-svg',
    focusable: 'false',
  });
  root.append(svg('title', { id: titleId }, spec.title), svg('desc', { id: descId }, spec.description));

  yTicks.forEach((t) => {
    root.append(svg('line', { x1: M.left, x2: W - M.right, y1: sy(t), y2: sy(t), class: 'grid' }));
    root.append(svg('text', { x: M.left - 8, y: sy(t) + 4, 'text-anchor': 'end', class: 'tick' }, yFormat(t)));
  });
  xTicks.forEach((t) => {
    root.append(svg('line', { x1: sx(t), x2: sx(t), y1: H - M.bottom, y2: H - M.bottom + 4, class: 'axis' }));
    root.append(svg('text', { x: sx(t), y: H - M.bottom + 18, 'text-anchor': 'middle', class: 'tick' }, String(Math.round(t * 100) / 100)));
  });
  root.append(svg('line', { x1: M.left, x2: M.left, y1: M.top, y2: H - M.bottom, class: 'axis' }));
  root.append(svg('line', { x1: M.left, x2: W - M.right, y1: H - M.bottom, y2: H - M.bottom, class: 'axis' }));
  root.append(svg('text', { x: (M.left + W - M.right) / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-label' }, spec.xLabel));
  root.append(svg('text', { x: 14, y: (M.top + H - M.bottom) / 2, 'text-anchor': 'middle', transform: `rotate(-90 14 ${(M.top + H - M.bottom) / 2})`, class: 'axis-label' }, spec.yLabel));

  (spec.hLines ?? []).forEach((line) => {
    root.append(svg('line', { x1: M.left, x2: W - M.right, y1: sy(line.y), y2: sy(line.y), class: 'ref-line' }));
    root.append(svg('text', { x: W - M.right - 4, y: sy(line.y) - 5, 'text-anchor': 'end', class: 'ref-label' }, line.label));
  });
  (spec.vLines ?? []).forEach((line, i) => {
    if (line.x < xMin || line.x > xMax) return;
    root.append(svg('line', { x1: sx(line.x), x2: sx(line.x), y1: M.top, y2: H - M.bottom, class: 'ref-line v' }));
    root.append(svg('text', { x: sx(line.x) + 4, y: M.top + 12 + i * 14, class: 'ref-label' }, line.label));
  });
  spec.series.forEach((series, i) => {
    const d = sample(series.points)
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`)
      .join(' ');
    root.append(svg('path', { d, class: `series s${i % 4}`, fill: 'none' }));
  });
  figure.append(root);

  const legend = el('ul', 'chart-legend');
  spec.series.forEach((series, i) => {
    const li = el('li');
    const sw = svg('svg', { width: 28, height: 10, 'aria-hidden': 'true', viewBox: '0 0 28 10' });
    sw.append(svg('line', { x1: 0, x2: 28, y1: 5, y2: 5, class: `series s${i % 4}` }));
    li.append(sw, document.createTextNode(` ${series.name}`));
    legend.append(li);
  });
  figure.append(legend);

  // Table alternative (same data as the chart).
  const details = el('details', 'chart-table');
  details.append(el('summary', undefined, '檢視圖表資料表'));
  const wrap = el('div', 'table-scroll');
  const table = el('table');
  table.append(el('caption', 'sr-only', `${spec.title}的資料表`));
  const thead = el('thead');
  const hr = el('tr');
  [spec.xLabel, ...spec.series.map((s) => s.name)].forEach((c) => {
    const th = el('th', undefined, c);
    th.scope = 'col';
    hr.append(th);
  });
  thead.append(hr);
  const tbody = el('tbody');
  const xs = spec.series[0]?.points.map((p) => p[0]) ?? [];
  xs.forEach((x, idx) => {
    const tr = el('tr');
    const th = el('th', undefined, String(Math.round(x * 100) / 100));
    th.scope = 'row';
    tr.append(th);
    spec.series.forEach((s) => {
      const y = s.points[idx]?.[1];
      tr.append(el('td', 'num', y === undefined ? '—' : spec.yKind === 'twd' ? Math.round(y).toLocaleString('en-US') : formatPercent(y, 2)));
    });
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  details.append(wrap);
  figure.append(details);
  return figure;
}
