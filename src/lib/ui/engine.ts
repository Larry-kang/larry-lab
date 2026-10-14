import { toCsv } from '../csv';
import { MAX_IMPORT_BYTES, buildExport, parseImport } from '../io';
import type { Values } from '../parse';
import { clearTool, hasStoredTool, loadTool, saveTool } from '../storage';
import { renderChart } from './chart';
import { schemaOf } from './schema';
import {
  isListSpec,
  type Card,
  type Evaluation,
  type FieldSpec,
  type ListSpec,
  type Spec,
  type ToolDef,
} from './types';

type Attrs = Record<string, string | boolean | undefined>;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Array<Node | string | null | undefined>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setPath(root: Values, path: string[], value: string): void {
  let cursor: unknown = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    cursor = Array.isArray(cursor) ? cursor[Number(key)] : (cursor as Values)[key];
    if (cursor === undefined || cursor === null) return;
  }
  const last = path[path.length - 1];
  if (Array.isArray(cursor)) (cursor as unknown as string[])[Number(last)] = value;
  else (cursor as Values)[last] = value;
}

const idFor = (path: string) => `f-${path.replace(/\./g, '-')}`;

export function mountTool(def: ToolDef, container: HTMLElement): void {
  const schema = schemaOf(def);
  const clone = <T,>(v: T): T => structuredClone(v);
  let root: Values = clone(def.example());
  let active = 0;
  let remember = false;
  let submitted = false;
  const touched = new Set<string>();
  let evals: Evaluation[] = [];
  let storageWarning = '';

  const stored = loadTool(def.id, schema);
  if (stored && Array.isArray(stored.scenarios) && stored.scenarios.length > 0) {
    root = stored;
    remember = true;
  }

  const scenarios = () => root.scenarios as Values[];

  function normalize(): void {
    if (!Array.isArray(root.scenarios) || root.scenarios.length === 0) root.scenarios = clone(def.blank().scenarios as Values[]);
    if (scenarios().length > def.maxScenarios) root.scenarios = scenarios().slice(0, def.maxScenarios);
    scenarios().forEach((s, i) => {
      if (typeof s.name !== 'string' || s.name.trim() === '') s.name = `${def.scenarioNoun} ${i + 1}`;
    });
    if (active >= scenarios().length) active = 0;
  }
  normalize();

  // ---- static skeleton ----
  const statusEl = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
  const barEl = h('section', { class: 'tool-bar', 'aria-label': '工具操作' });
  const topEl = h('div', { class: 'tool-top' });
  const tabsEl = h('div', { class: 'scenario-tabs', role: 'group', 'aria-label': `${def.scenarioNoun}切換` });
  const formEl = h('form', { class: 'tool-form', novalidate: true, 'aria-label': '輸入欄位' });
  const resultsEl = h('section', { class: 'tool-results', 'aria-labelledby': 'results-heading' });
  const compareEl = h('section', { class: 'tool-compare', 'aria-label': `${def.scenarioNoun}比較` });
  container.replaceChildren(barEl, statusEl, tabsEl, topEl, formEl, resultsEl, compareEl);

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
  });

  function setStatus(message: string, tone: 'ok' | 'error' = 'ok'): void {
    statusEl.textContent = message;
    statusEl.className = `status ${tone === 'error' ? 'status-error' : ''}`;
  }

  // ---- toolbar ----
  function renderBar(): void {
    const calcBtn = h('button', { type: 'button', class: 'btn primary' }, '計算／更新結果');
    calcBtn.addEventListener('click', calculate);
    const exampleBtn = h('button', { type: 'button', class: 'btn' }, '載入範例');
    exampleBtn.addEventListener('click', () => {
      root = clone(def.example());
      resetView();
      setStatus('已載入虛構範例資料。');
    });
    const resetBtn = h('button', { type: 'button', class: 'btn' }, '重設');
    resetBtn.addEventListener('click', () => {
      root = clone(def.blank());
      resetView();
      setStatus('已清空所有欄位。必要欄位請自行輸入，空白不會被當成 0。');
    });
    const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'sr-only', id: 'import-file', tabindex: '-1' });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES) {
        setStatus('匯入失敗：檔案超過 100 KB 上限，目前設定未變更。', 'error');
        return;
      }
      const result = parseImport(await file.text(), def.id, schema);
      if (!result.ok) {
        setStatus(`匯入失敗：${result.error}。目前設定未變更。`, 'error');
        return;
      }
      if (!Array.isArray(result.value.scenarios) || result.value.scenarios.length === 0) {
        setStatus(`匯入失敗：檔案內沒有任何${def.scenarioNoun}。目前設定未變更。`, 'error');
        return;
      }
      root = result.value;
      resetView();
      setStatus(`已匯入 ${scenarios().length} 組${def.scenarioNoun}。`);
    });
    const importBtn = h('button', { type: 'button', class: 'btn' }, '匯入設定（JSON）');
    importBtn.addEventListener('click', () => fileInput.click());
    const exportBtn = h('button', { type: 'button', class: 'btn' }, '匯出設定（JSON）');
    exportBtn.addEventListener('click', () => {
      download(`larry-lab-${def.id}.json`, buildExport(def.id, root), 'application/json');
      setStatus('已在本機產生設定檔，只包含你輸入的試算假設。');
    });
    const shareBtn = h('button', { type: 'button', class: 'btn' }, '複製工具網址');
    shareBtn.addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}`;
      try {
        await navigator.clipboard.writeText(url);
        setStatus('已複製工具網址（不含任何輸入金額）。');
      } catch {
        showManualCopy(url);
      }
    });
    const rememberBox = h('input', { type: 'checkbox', id: 'remember-toggle' });
    rememberBox.checked = remember;
    rememberBox.addEventListener('change', () => {
      remember = rememberBox.checked;
      if (remember) {
        if (!saveTool(def.id, root)) {
          storageWarning = '此瀏覽器無法儲存設定，但仍可正常試算。';
          remember = false;
          rememberBox.checked = false;
          setStatus(storageWarning, 'error');
        } else {
          setStatus('已將此工具設定保存在這個瀏覽器；共用裝置請記得刪除。');
        }
      } else {
        clearTool(def.id);
        setStatus('已刪除此工具在瀏覽器內保存的設定。');
      }
    });
    const rememberLabel = h('label', { for: 'remember-toggle', class: 'remember' }, rememberBox, ' 記住此工具設定（僅存在本機瀏覽器）');
    const clearBtn = h('button', { type: 'button', class: 'btn subtle' }, '刪除已儲存設定');
    clearBtn.addEventListener('click', () => {
      clearTool(def.id);
      remember = false;
      rememberBox.checked = false;
      setStatus(hasStoredTool(def.id) ? '無法刪除已儲存設定。' : '已刪除此工具在瀏覽器內保存的設定。');
    });
    barEl.replaceChildren(
      h('div', { class: 'btn-row' }, calcBtn, exampleBtn, resetBtn),
      h('div', { class: 'btn-row' }, importBtn, exportBtn, shareBtn, fileInput),
      h('div', { class: 'btn-row remember-row' }, rememberLabel, clearBtn),
      h('p', { class: 'hint' }, '勾選「記住」前，所有輸入只存在目前頁面記憶體；共用電腦請勿勾選。'),
    );
  }

  function showManualCopy(url: string): void {
    const input = h('input', { type: 'text', readonly: true, value: url, class: 'copy-input', 'aria-label': '工具網址，請手動複製' });
    statusEl.replaceChildren('無法自動複製，請手動複製下列網址：', input);
    input.focus();
    input.select();
  }

  // ---- tabs ----
  function renderTabs(): void {
    const buttons: Node[] = scenarios().map((s, i) => {
      const b = h('button', { type: 'button', class: `tab${i === active ? ' active' : ''}`, 'aria-pressed': String(i === active) }, String(s.name));
      b.addEventListener('click', () => {
        active = i;
        renderForm();
        refresh();
        renderTabs();
      });
      return b;
    });
    const add = h('button', { type: 'button', class: 'btn' }, `新增${def.scenarioNoun}（複製目前）`);
    if (scenarios().length >= def.maxScenarios) add.disabled = true;
    add.addEventListener('click', () => {
      const copy = clone(scenarios()[active]);
      copy.name = `${def.scenarioNoun} ${scenarios().length + 1}`;
      scenarios().push(copy);
      active = scenarios().length - 1;
      renderTabs();
      renderForm();
      refresh();
      setStatus(`已新增「${copy.name}」，內容複製自上一個${def.scenarioNoun}。`);
    });
    const remove = h('button', { type: 'button', class: 'btn subtle' }, `刪除目前${def.scenarioNoun}`);
    if (scenarios().length <= 1) remove.disabled = true;
    remove.addEventListener('click', () => {
      const [gone] = scenarios().splice(active, 1);
      active = Math.max(0, active - 1);
      renderTabs();
      renderForm();
      refresh();
      setStatus(`已刪除「${String(gone.name)}」。`);
    });
    tabsEl.replaceChildren(
      h('span', { class: 'tabs-label' }, `${def.scenarioNoun}：`),
      ...buttons,
      add,
      remove,
    );
  }

  // ---- form ----
  const visibility: Array<{ el: HTMLElement; test: () => boolean }> = [];

  function selectSpecs(specs: Spec[]): FieldSpec[] {
    return specs.filter((s): s is FieldSpec => !isListSpec(s));
  }

  function renderField(spec: FieldSpec, path: string, values: Values, scenario: Values | null): HTMLElement {
    const id = idFor(path);
    const label = h('label', { for: id }, spec.label, spec.unit ? h('span', { class: 'unit' }, `（${spec.unit}）`) : null);
    let control: HTMLElement;
    const current = values[spec.key];
    if (spec.kind === 'select') {
      const select = h('select', { id, 'data-path': path, 'data-kind': 'select' });
      for (const option of spec.options ?? []) {
        const o = h('option', { value: option.value }, option.label);
        if (current === option.value) o.selected = true;
        select.append(o);
      }
      select.addEventListener('change', () => {
        onValue(path, select.value, spec, scenario);
      });
      control = select;
    } else {
      const input = h('input', {
        id,
        type: 'text',
        'data-path': path,
        'data-kind': spec.kind,
        inputmode: spec.kind === 'integer' ? 'numeric' : spec.kind === 'text' ? 'text' : 'decimal',
        autocomplete: 'off',
        placeholder: spec.placeholder,
        maxlength: spec.kind === 'text' ? '40' : '40',
      });
      input.value = typeof current === 'string' ? current : '';
      input.addEventListener('input', () => onValue(path, input.value, spec, scenario));
      input.addEventListener('blur', () => {
        touched.add(path);
        updateErrors();
      });
      control = input;
    }
    const wrapper = h('div', { class: 'field', 'data-field': path }, label, control);
    if (spec.hint) wrapper.append(h('p', { class: 'hint', id: `${id}-hint` }, spec.hint));
    wrapper.append(h('p', { class: 'field-error', id: `${id}-error`, hidden: true }));
    if (spec.visibleIf && scenario) {
      const test = () => spec.visibleIf!(scenario, root);
      visibility.push({ el: wrapper, test });
    }
    return wrapper;
  }

  function renderList(spec: ListSpec, basePath: string, scenario: Values): HTMLElement {
    const fieldset = h('fieldset', { class: 'list' }, h('legend', {}, spec.label));
    if (spec.hint) fieldset.append(h('p', { class: 'hint' }, spec.hint));
    const items = scenario[spec.key] as Values[];
    items.forEach((item, index) => {
      const itemPath = `${basePath}.${spec.key}.${index}`;
      const box = h('fieldset', { class: 'list-item' }, h('legend', {}, `${spec.itemLabel} ${index + 1}`));
      const grid = h('div', { class: 'fields' });
      for (const f of spec.fields) grid.append(renderField(f, `${itemPath}.${f.key}`, item, null));
      box.append(grid);
      if (items.length > spec.min) {
        const rm = h('button', { type: 'button', class: 'btn subtle' }, `刪除${spec.itemLabel} ${index + 1}`);
        rm.addEventListener('click', () => {
          items.splice(index, 1);
          renderForm();
          refresh();
          setStatus(`已刪除${spec.itemLabel} ${index + 1}。`);
        });
        box.append(rm);
      }
      fieldset.append(box);
    });
    if (items.length < spec.max) {
      const add = h('button', { type: 'button', class: 'btn' }, spec.addLabel);
      add.addEventListener('click', () => {
        items.push(spec.defaultItem());
        renderForm();
        refresh();
      });
      fieldset.append(add);
    }
    if (spec.visibleIf) visibility.push({ el: fieldset, test: () => spec.visibleIf!(scenario, root) });
    return fieldset;
  }

  function renderForm(): void {
    visibility.length = 0;
    const scenario = scenarios()[active];
    topEl.replaceChildren();
    if (def.topFields.length > 0) {
      const grid = h('div', { class: 'fields' });
      for (const f of def.topFields) grid.append(renderField(f, f.key, root, null));
      topEl.append(grid);
    }
    const base = `scenarios.${active}`;
    const nameField = renderField({ key: 'name', label: `${def.scenarioNoun}名稱`, kind: 'text' }, `${base}.name`, scenario, null);
    const grid = h('div', { class: 'fields' }, nameField);
    const children: HTMLElement[] = [grid];
    for (const spec of def.scenarioFields) {
      if (isListSpec(spec)) {
        children.push(renderList(spec, base, scenario));
      } else {
        grid.append(renderField(spec, `${base}.${spec.key}`, scenario, scenario));
      }
    }
    formEl.replaceChildren(...children);
    applyVisibility();
  }

  function applyVisibility(): void {
    for (const { el, test } of visibility) el.hidden = !test();
  }

  function onValue(path: string, value: string, spec: FieldSpec, scenario: Values | null): void {
    setPath(root, path.split('.'), value);
    touched.add(path);
    if (spec.kind === 'select' && spec.clearsHidden && scenario) {
      for (const other of selectSpecs(def.scenarioFields)) {
        if (other.visibleIf && !other.visibleIf(scenario, root) && other.kind !== 'select') scenario[other.key] = '';
      }
      renderForm();
      const el = document.getElementById(idFor(path));
      el?.focus();
    }
    if (path.endsWith('.name') && path.startsWith('scenarios.')) renderTabs();
    refresh();
  }

  // ---- errors ----
  function labelFor(rel: string): string {
    const parts = rel.split('.');
    if (parts.length === 1) {
      const spec = selectSpecs(def.scenarioFields).find((s) => s.key === parts[0]);
      return spec?.label ?? parts[0];
    }
    const list = def.scenarioFields.find((s): s is ListSpec => isListSpec(s) && s.key === parts[0]);
    if (!list) return parts[0];
    const field = list.fields.find((f) => f.key === parts[2]);
    return `${list.itemLabel} ${Number(parts[1]) + 1}${field ? `：${field.label}` : ''}`;
  }

  function updateErrors(): void {
    const errors = evals[active]?.errors ?? {};
    const prefix = `scenarios.${active}.`;
    formEl.querySelectorAll<HTMLElement>('[data-path]').forEach((control) => {
      const path = control.dataset.path ?? '';
      const rel = path.startsWith(prefix) ? path.slice(prefix.length) : path;
      const message = errors[rel];
      const show = Boolean(message) && (submitted || touched.has(path));
      const errEl = document.getElementById(`${control.id}-error`);
      if (errEl) {
        errEl.textContent = show ? message : '';
        errEl.hidden = !show;
      }
      const describedBy = [`${control.id}-hint`, `${control.id}-error`].filter((id) => {
        if (id.endsWith('-error')) return show;
        return document.getElementById(id) !== null;
      });
      if (describedBy.length > 0) control.setAttribute('aria-describedby', describedBy.join(' '));
      else control.removeAttribute('aria-describedby');
      if (show) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    });
  }

  // ---- results ----
  function renderCards(cards: Card[]): HTMLElement {
    const grid = h('div', { class: 'cards' });
    for (const card of cards) {
      grid.append(
        h(
          'div',
          { class: `card tone-${card.tone ?? 'neutral'}` },
          h('div', { class: 'card-label' }, card.label),
          h('div', { class: 'card-value' }, card.value),
          card.note ? h('div', { class: 'card-note' }, card.note) : null,
        ),
      );
    }
    return grid;
  }

  function renderResults(): void {
    const ev = evals[active];
    const name = String(scenarios()[active].name);
    const heading = h('h2', { id: 'results-heading', tabindex: '-1' }, `試算結果：${name}`);
    const parts: Node[] = [heading];
    const errorKeys = Object.keys(ev.errors);
    if (errorKeys.length > 0) {
      const list = h('ul');
      for (const key of errorKeys) list.append(h('li', {}, `${labelFor(key)}：${ev.errors[key]}`));
      parts.push(
        h('div', { class: 'notice notice-bad', role: 'alert' }, h('strong', {}, '目前的輸入無法計算，先前的結果已清除。請修正下列欄位：'), list),
      );
    } else {
      for (const notice of ev.notices) {
        parts.push(h('div', { class: `notice notice-${notice.tone}` }, `${noticePrefix(notice.tone)}${notice.text}`));
      }
      if (ev.cards.length > 0) parts.push(renderCards(ev.cards));
      ev.charts.forEach((chart, i) => parts.push(renderChart(chart, `chart-${i}`)));
      for (const table of ev.tables) {
        const wrap = h('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': table.caption });
        const t = h('table');
        t.append(h('caption', {}, table.caption));
        const head = h('tr');
        table.columns.forEach((c) => head.append(h('th', { scope: 'col' }, c)));
        t.append(h('thead', {}, head));
        const body = h('tbody');
        for (const row of table.rows) {
          const tr = h('tr');
          row.forEach((cell, ci) => tr.append(ci === 0 ? h('th', { scope: 'row' }, cell) : h('td', { class: 'num' }, cell)));
          body.append(tr);
        }
        t.append(body);
        wrap.append(t);
        parts.push(wrap);
        if (table.note) parts.push(h('p', { class: 'hint' }, table.note));
      }
      const csv = ev.csv;
      if (csv) {
        const btn = h('button', { type: 'button', class: 'btn' }, `下載 CSV（${csv.filename}）`);
        btn.addEventListener('click', () => {
          download(csv.filename, toCsv(csv.rows), 'text/csv;charset=utf-8');
          setStatus('已在本機產生 CSV，未上傳任何資料。');
        });
        parts.push(h('p', {}, btn));
      }
      if (ev.assumptions.length > 0) {
        const list = h('ul', { class: 'assumptions' });
        ev.assumptions.forEach((a) => list.append(h('li', {}, a)));
        parts.push(h('details', { class: 'assumption-box', open: true }, h('summary', {}, '假設與未計入項目'), list));
      }
    }
    resultsEl.replaceChildren(...parts);
  }

  function noticePrefix(tone: string): string {
    return tone === 'bad' ? '【警示】' : tone === 'warn' ? '【注意】' : '';
  }

  function renderCompare(): void {
    if (scenarios().length < 2) {
      compareEl.replaceChildren();
      return;
    }
    const labels: string[] = [];
    evals.forEach((ev) => {
      if (Object.keys(ev.errors).length === 0) {
        ev.cards.filter((c) => c.compare).forEach((c) => {
          if (!labels.includes(c.label)) labels.push(c.label);
        });
      }
    });
    const table = h('table');
    table.append(h('caption', {}, `${def.scenarioNoun}比較（各${def.scenarioNoun}的輸入完全獨立）`));
    const head = h('tr', {}, h('th', { scope: 'col' }, '指標'));
    scenarios().forEach((s) => head.append(h('th', { scope: 'col' }, String(s.name))));
    table.append(h('thead', {}, head));
    const body = h('tbody');
    for (const label of labels) {
      const tr = h('tr', {}, h('th', { scope: 'row' }, label));
      evals.forEach((ev) => {
        const invalid = Object.keys(ev.errors).length > 0;
        const card = invalid ? undefined : ev.cards.find((c) => c.label === label);
        tr.append(h('td', { class: 'num' }, invalid ? '輸入無效' : (card?.value ?? '—')));
      });
      body.append(tr);
    }
    if (labels.length === 0) {
      body.append(h('tr', {}, h('td', { colspan: String(scenarios().length + 1) }, `尚無可比較的有效${def.scenarioNoun}，請先修正輸入。`)));
    }
    table.append(body);
    compareEl.replaceChildren(
      h('h2', {}, `${def.scenarioNoun}比較`),
      h('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': `${def.scenarioNoun}比較表` }, table),
    );
  }

  // ---- orchestration ----
  function refresh(): void {
    evals = scenarios().map((s) => def.evaluate(s, root));
    applyVisibility();
    updateErrors();
    renderResults();
    renderCompare();
    if (remember) {
      if (!saveTool(def.id, root)) {
        remember = false;
        const box = document.getElementById('remember-toggle') as HTMLInputElement | null;
        if (box) box.checked = false;
        setStatus('此瀏覽器無法儲存設定，但仍可正常試算。', 'error');
      }
    }
  }

  function calculate(): void {
    submitted = true;
    refresh();
    document.getElementById('results-heading')?.focus();
  }

  function resetView(): void {
    normalize();
    active = 0;
    submitted = false;
    touched.clear();
    renderTabs();
    renderForm();
    refresh();
  }

  renderBar();
  renderTabs();
  renderForm();
  refresh();
  if (remember) setStatus('已載入你先前在此瀏覽器保存的設定。');
}
