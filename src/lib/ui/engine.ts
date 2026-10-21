import { formatAmountEdit, monthsFromParts, monthDescription } from './input-edit';
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
  const monthDrafts = new WeakMap<Values, Map<string, { years: string; extra: string }>>();
  let evals: Evaluation[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let undoState: Values | null = null;
  let undoTimer: ReturnType<typeof setTimeout> | null = null;

  const stored = loadTool(def.id, schema);
  if (stored && Array.isArray(stored.scenarios) && stored.scenarios.length > 0) {
    root = stored;
    remember = true;
  }

  const scenarios = () => root.scenarios as Values[];

  function normalize(): void {
    if (!Array.isArray(root.scenarios) || root.scenarios.length === 0) {
      root.scenarios = clone(def.blank().scenarios as Values[]);
    }
    if (scenarios().length > def.maxScenarios) {
      root.scenarios = scenarios().slice(0, def.maxScenarios);
    }
    scenarios().forEach((s, i) => {
      if (typeof s.name !== 'string' || s.name.trim() === '') {
        s.name = `${def.scenarioNoun} ${i + 1}`;
      }
    });
    if (def.id === 'mortgage') {
      scenarios().forEach((s) => {
        if (!Array.isArray(s.segments) || s.segments.length === 0) {
          s.segments = [{ startMonth: '1', annualRate: typeof s.fixedRate === 'string' ? s.fixedRate : '' }];
        }
        if (s.fixedRate === undefined || s.fixedRate === '') {
          s.fixedRate = (s.segments[0] as Values)?.annualRate || '';
        }
      });
    }
    if (active >= scenarios().length) active = 0;
  }
  normalize();

  // ---- static skeleton ----
  const statusEl = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
  const tabsEl = h('div', { class: 'scenario-tabs', role: 'group', 'aria-label': `${def.scenarioNoun}切換` });
  const topEl = h('div', { class: 'tool-top' });
  const formEl = h('form', { class: 'tool-form', novalidate: true, 'aria-label': '輸入欄位' });
  const resultsEl = h('section', { class: 'tool-results', 'aria-labelledby': 'results-heading' });
  const workspaceEl = h('div', { class: 'tool-workspace' }, formEl, resultsEl);
  const compareEl = h('section', { class: 'tool-compare', 'aria-label': `${def.scenarioNoun}比較` });
  const storageEl = h('details', { class: 'storage-management' });

  container.replaceChildren(statusEl, tabsEl, topEl, workspaceEl, compareEl, storageEl);

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
  });

  function setStatus(message: string | Node, tone: 'ok' | 'error' = 'ok'): void {
    statusEl.replaceChildren(message);
    statusEl.className = `status ${tone === 'error' ? 'status-error' : ''}`;
  }

  // ---- tabs & comparison actions ----
  function renderTabs(): void {
    const buttons: Node[] = scenarios().map((s, i) => {
      const badgeText = def.scenarioBadge ? def.scenarioBadge(s, root) : '';
      const b = h(
        'button',
        {
          type: 'button',
          class: `tab${i === active ? ' active' : ''}`,
          role: 'radio',
          'aria-checked': String(i === active),
          tabindex: i === active ? '0' : '-1',
        },
        h('span', { class: 'tab-name' }, String(s.name)),
        badgeText ? h('span', { class: 'tab-badge' }, badgeText) : null,
      );
      b.addEventListener('keydown', (event) => {
        const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const count = scenarios().length;
        active = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (i + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + count) % count;
        renderTabs(); renderForm(); refresh();
        tabsEl.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
      });
      b.addEventListener('click', () => {
        active = i;
        renderTabs();
        renderForm();
        refresh();
        tabsEl.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
      });
      return b;
    });

    const addBtn = h('button', { type: 'button', class: 'btn' }, `＋ 複製目前${def.scenarioNoun}`);
    if (scenarios().length >= def.maxScenarios) addBtn.disabled = true;
    addBtn.addEventListener('click', () => {
      const copy = clone(scenarios()[active]);
      copy.name = `${def.scenarioNoun} ${scenarios().length + 1}`;
      scenarios().push(copy);
      active = scenarios().length - 1;
      renderTabs();
      renderForm();
      refresh();
      setStatus(`已複製新增「${copy.name}」，修改此${def.scenarioNoun}不會影響原設定。`);
    });

    const removeBtn = h('button', { type: 'button', class: 'btn subtle' }, `刪除目前${def.scenarioNoun}`);
    if (scenarios().length <= 1) removeBtn.disabled = true;
    removeBtn.addEventListener('click', () => {
      const [gone] = scenarios().splice(active, 1);
      active = Math.max(0, active - 1);
      renderTabs();
      renderForm();
      refresh();
      setStatus(`已刪除「${String(gone.name)}」。`);
    });

    const actionRow = h('div', { class: 'tabs-actions' }, addBtn, removeBtn);
    if (addBtn.disabled) actionRow.append(h('span', { class: 'hint' }, `最多 ${def.maxScenarios} 個${def.scenarioNoun}；請先刪除一個再複製。`));
    if (removeBtn.disabled) actionRow.append(h('span', { class: 'hint' }, `至少保留 1 個${def.scenarioNoun}，無法刪除最後一個。`));

    // 退休三組範例載入按鈕
    if (def.presetScenariosAction) {
      const preset = def.presetScenariosAction;
      const presetBtn = h('button', { type: 'button', class: 'btn subtle' }, preset.label);
      presetBtn.addEventListener('click', () => {
        root.scenarios = preset.load();
        active = 0;
        renderTabs();
        renderForm();
        refresh();
        setStatus(`已${preset.label}。`);
      });
      actionRow.append(presetBtn);
    }

    // 以 A 基本條件套用至其他方案
    if (def.syncFromA && scenarios().length >= 2) {
      const syncConfig = def.syncFromA;
      const syncBtn = h('button', { type: 'button', class: 'btn subtle' }, syncConfig.buttonLabel);
      syncBtn.addEventListener('click', () => {
        const confirmed = window.confirm(
          `${syncConfig.description}\n\n確定要以 ${scenarios()[0].name} 的基本條件同步至其他${def.scenarioNoun}嗎？`,
        );
        if (confirmed) {
          const sourceA = scenarios()[0];
          for (let i = 1; i < scenarios().length; i += 1) {
            syncConfig.apply(scenarios()[i], sourceA);
          }
          renderForm();
          refresh();
          setStatus(`已成功將 ${sourceA.name} 的基本條件同步套用至其他${def.scenarioNoun}。`);
        }
      });
      actionRow.append(syncBtn);
    }

    tabsEl.replaceChildren(
      h('div', { class: 'tabs-header', role: 'radiogroup', 'aria-label': `${def.scenarioNoun}切換` }, h('span', { class: 'tabs-label' }, `${def.scenarioNoun}切換：`), ...buttons),
      actionRow,
    );
  }

  // ---- form rendering ----
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
    } else if (spec.unitToggle?.type === 'year-month') {
      const unitKey = `_unit_${spec.key}`;
      const targetObj = scenario ?? values;
      if (!targetObj[unitKey]) targetObj[unitKey] = spec.unitToggle.defaultUnit || 'year';

      const input = h('input', {
        id,
        type: 'text',
        'data-path': path,
        'data-kind': 'integer',
        inputmode: 'numeric',
        autocomplete: 'off',
        placeholder: spec.placeholder,
        maxlength: '40',
      });

      const extraInput = h('input', { id: `${id}-extra`, type: 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: '2', 'aria-label': `${spec.label}額外月份` });
      const extraWrap = h('span', { class: 'extra-month-wrap' }, extraInput, h('span', {}, '個月'));
      if (!monthDrafts.has(targetObj)) monthDrafts.set(targetObj, new Map());
      const drafts = monthDrafts.get(targetObj)!;
      const equivEl = h('span', { class: 'unit-equiv' });
      const yearBtn = h('button', { type: 'button', class: 'btn-unit' }, '年');
      const monthBtn = h('button', { type: 'button', class: 'btn-unit' }, '個月');
      const updateEquiv = () => { equivEl.textContent = monthDescription(String(values[spec.key] ?? '')); };
      const showUnit = () => {
        const raw = String(values[spec.key] ?? '');
        const valid = /^\d+$/.test(raw);
        const inYears = targetObj[unitKey] === 'year';
        const draft = drafts.get(spec.key);
        input.value = draft && inYears ? draft.years : inYears && valid ? String(Math.floor(Number(raw) / 12)) : raw;
        extraInput.value = draft && inYears ? draft.extra : valid ? String(Number(raw) % 12) : '0';
        extraWrap.hidden = !inYears;
        yearBtn.classList.toggle('active', inYears);
        monthBtn.classList.toggle('active', !inYears);
        yearBtn.setAttribute('aria-pressed', String(inYears));
        monthBtn.setAttribute('aria-pressed', String(!inYears));
        input.setAttribute('aria-label', `${spec.label}（${inYears ? '年' : '個月'}）`);
        updateEquiv();
      };
      const changeUnit = (unit: 'year' | 'month') => {
        const raw = String(values[spec.key] ?? '');
        if (raw !== '' && !/^\d+$/.test(raw)) { setStatus('請先修正年與月份欄位，再切換顯示單位。', 'error'); return; }
        targetObj[unitKey] = unit; drafts.delete(spec.key); showUnit();
      };
      yearBtn.addEventListener('click', () => changeUnit('year'));
      monthBtn.addEventListener('click', () => changeUnit('month'));
      const updateMonthValue = () => {
        const text = input.value.trim();
        const value = targetObj[unitKey] === 'year' ? monthsFromParts(text, extraInput.value.trim()) : text;
        if (targetObj[unitKey] === 'year') drafts.set(spec.key, { years: text, extra: extraInput.value });
        onValue(path, value, spec, scenario); updateEquiv();
      };
      input.addEventListener('input', updateMonthValue);
      extraInput.addEventListener('input', updateMonthValue);
      for (const field of [input, extraInput]) field.addEventListener('blur', () => { touched.add(path); updateErrors(); });
      showUnit();
      const toggleGroup = h('span', { class: 'unit-toggle-group', role: 'group', 'aria-label': `${spec.label}顯示單位` }, yearBtn, monthBtn);
      const inputWrap = h('div', { class: 'field-input-unit-wrap' }, input, extraWrap, toggleGroup);
      label.append(equivEl);
      control = inputWrap;
    } else {
      const input = h('input', {
        id,
        type: 'text',
        'data-path': path,
        'data-kind': spec.kind,
        inputmode: spec.kind === 'integer' ? 'numeric' : spec.kind === 'text' ? 'text' : 'decimal',
        autocomplete: 'off',
        placeholder: spec.placeholder,
        maxlength: '40',
      });
      input.value = typeof current === 'string' ? current : '';
      let priorValid = false;
      if (spec.kind === 'amount') {
        input.value = formatAmountEdit(input.value, 0, 0).text;
        values[spec.key] = input.value;
        priorValid = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d*)?$/.test(input.value);
        input.addEventListener('beforeinput', (event) => {
          const at = input.selectionStart ?? 0;
          if (input.selectionStart !== input.selectionEnd) return;
          // 刪除分隔符時連同相鄰數字刪除，避免逗號自動補回而無法刪字。
          if (event.inputType === 'deleteContentBackward' && input.value[at - 1] === ',') input.setSelectionRange(Math.max(0, at - 2), at);
          if (event.inputType === 'deleteContentForward' && input.value[at] === ',') input.setSelectionRange(at, at + 2);
        });
      }
      const applyEdit = (event: Event) => {
        if (event instanceof InputEvent && event.isComposing) return;
        if (spec.kind === 'amount') {
          const e = event as InputEvent;
          const regroup = priorValid && /^(insertText|delete)/.test(e.inputType ?? '') && !e.data?.includes(',');
          const formatted = formatAmountEdit(input.value, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length, regroup);
          input.value = formatted.text;
          input.setSelectionRange(formatted.start, formatted.end);
          priorValid = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d*)?$/.test(input.value);
        }
        onValue(path, input.value, spec, scenario);
      };
      input.addEventListener('input', applyEdit);
      input.addEventListener('compositionend', applyEdit);
      input.addEventListener('blur', () => {
        touched.add(path);
        updateErrors();
      });
      control = input;
    }
    const wrapper = h('div', { class: 'field', 'data-field': path }, label, control);
    if (spec.hint) wrapper.append(h('p', { class: 'hint', id: `${id}-hint` }, spec.hint));
    if (spec.monthPresets) {
      const hint = h('p', { class: 'hint', 'data-month-hint': path });
      const update = () => { hint.textContent = monthDescription(String(values[spec.key] ?? '')); };
      update();
      control.addEventListener('input', update);
      const presets = spec.monthPresets.map(months => {
        const button = h('button', { type: 'button', class: 'btn small' }, `${months} 個月`);
        button.addEventListener('click', () => {
          (control as HTMLInputElement).value = String(months);
          onValue(path, String(months), spec, scenario); update();
        });
        return button;
      });
      wrapper.append(hint, h('div', { class: 'btn-row term-presets' }, ...presets));
    }
    wrapper.append(h('p', { class: 'field-error', id: `${id}-error`, hidden: true }));
    if (spec.visibleIf && scenario) {
      const test = () => spec.visibleIf!(scenario, root);
      visibility.push({ el: wrapper, test });
    }
    return wrapper;
  }

  function renderList(spec: ListSpec, basePath: string, scenario: Values): HTMLElement {
    const fieldset = h('fieldset', { class: 'list', 'data-list': spec.key }, h('legend', {}, spec.label));
    if (spec.summary) fieldset.append(h('p', { class: 'hint weight-summary', 'data-weight-summary': spec.key, role: 'status' }, spec.summary(scenario)));
    if (spec.hint) fieldset.append(h('p', { class: 'hint' }, spec.hint));
    const items = scenario[spec.key] as Values[];
    items.forEach((item, index) => {
      const itemPath = `${basePath}.${spec.key}.${index}`;
      const box = h('fieldset', { class: 'list-item' }, h('legend', {}, `${spec.itemLabel} ${index + 1}`));
      const grid = h('div', { class: 'fields' });
      for (const f of spec.fields) grid.append(renderField(f, `${itemPath}.${f.key}`, item, null));
      box.append(grid);
      if (items.length > spec.min) {
        const rm = h('button', { type: 'button', class: 'btn subtle small' }, `刪除${spec.itemLabel} ${index + 1}`);
        rm.addEventListener('click', () => {
          items.splice(index, 1);
          if (def.id === 'mortgage' && spec.key === 'segments' && items.length === 1) {
            scenario.fixedRate = (items[0] as Values).annualRate || '';
          }
          renderForm();
          refresh();
          setStatus(`已刪除${spec.itemLabel} ${index + 1}。`);
        });
        box.append(rm);
      }
      fieldset.append(box);
    });
    if (items.length < spec.max) {
      const add = h('button', { type: 'button', class: 'btn small' }, spec.addLabel);
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

    // 分流基本欄位與進階欄位
    const basicSpecs: Spec[] = [];
    const advancedSpecs: Spec[] = [];

    for (const spec of def.scenarioFields) {
      if (spec.isAdvanced) {
        advancedSpecs.push(spec);
      } else {
        basicSpecs.push(spec);
      }
    }

    // 基本設定區域
    const basicGrid = h('div', { class: 'fields' }, nameField);
    const basicChildren: HTMLElement[] = [basicGrid];
    for (const spec of basicSpecs) {
      if (isListSpec(spec)) {
        basicChildren.push(renderList(spec, base, scenario));
      } else {
        basicGrid.append(renderField(spec, `${base}.${spec.key}`, scenario, scenario));
      }
    }

    const formChildren: HTMLElement[] = [
      h('div', { class: 'form-section basic-section' }, ...basicChildren),
    ];

    // 進階設定區域 (折疊 details)
    if (advancedSpecs.length > 0) {
      const advGrid = h('div', { class: 'fields' });
      const advChildren: HTMLElement[] = [advGrid];
      for (const spec of advancedSpecs) {
        if (isListSpec(spec)) {
          advChildren.push(renderList(spec, base, scenario));
        } else {
          advGrid.append(renderField(spec, `${base}.${spec.key}`, scenario, scenario));
        }
      }

      const advSummaryText = def.advancedSummary ? def.advancedSummary(scenario, root) : '';
      const summaryEl = h(
        'summary',
        { class: 'advanced-summary-btn' },
        h('span', { class: 'adv-title' }, '進階設定'),
        advSummaryText ? h('span', { class: 'adv-pill' }, advSummaryText) : null,
      );

      const advDetails = h('details', { class: 'advanced-box', id: 'advanced-settings-box' }, summaryEl, ...advChildren);
      formChildren.push(advDetails);
    }

    // 查看結果按鈕（全頁唯一主色按鈕）
    const calcBtn = h('button', { type: 'button', class: 'btn primary btn-calc' }, '查看試算結果 ↓');
    calcBtn.addEventListener('click', calculate);
    formChildren.push(h('div', { class: 'calc-action-row' }, calcBtn));

    formEl.replaceChildren(...formChildren);
    applyVisibility();
  }

  function applyVisibility(): void {
    for (const { el, test } of visibility) el.hidden = !test();
  }

  function onValue(path: string, value: string, spec: FieldSpec, scenario: Values | null): void {
    setPath(root, path.split('.'), value);
    touched.add(path);

    const currentScenario = scenario || scenarios()[active];
    if (def.id === 'mortgage' && currentScenario) {
      if (path.endsWith('.fixedRate')) {
        if (!Array.isArray(currentScenario.segments) || currentScenario.segments.length === 0) {
          currentScenario.segments = [{ startMonth: '1', annualRate: value }];
        } else {
          (currentScenario.segments[0] as Values).annualRate = value;
        }
        const partnerPath = path.replace(/\.fixedRate$/, '.segments.0.annualRate');
        const partnerInput = formEl.querySelector<HTMLInputElement>(`input[data-path="${partnerPath}"]`);
        if (partnerInput && partnerInput.value !== value) {
          partnerInput.value = value;
        }
      } else if (path.endsWith('.segments.0.annualRate')) {
        currentScenario.fixedRate = value;
        const partnerPath = path.replace(/\.segments\.0\.annualRate$/, '.fixedRate');
        const partnerInput = formEl.querySelector<HTMLInputElement>(`input[data-path="${partnerPath}"]`);
        if (partnerInput && partnerInput.value !== value) {
          partnerInput.value = value;
        }
      }
    }

    if (spec.kind === 'select' && spec.clearsHidden && scenario) {
      for (const other of selectSpecs(def.scenarioFields)) {
        if (other.visibleIf && !other.visibleIf(scenario, root) && other.kind !== 'select') scenario[other.key] = '';
      }
      renderForm();
      const el = document.getElementById(idFor(path));
      el?.focus();
    }

    if (path.endsWith('.name') && path.startsWith('scenarios.')) {
      renderTabs();
    }

    // 防抖 250ms 自動重算
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      refresh();
    }, 250);
  }

  // ---- error display ----
  function labelFor(rel: string): string {
    const parts = rel.split('.');
    if (parts.length === 1) {
      const spec = selectSpecs(def.scenarioFields).find((s) => s.key === parts[0]);
      const list = def.scenarioFields.find(s => isListSpec(s) && s.key === parts[0]);
      return spec?.label ?? list?.label ?? parts[0];
    }
    const list = def.scenarioFields.find((s): s is ListSpec => isListSpec(s) && s.key === parts[0]);
    if (!list) return parts[0];
    const field = list.fields.find((f) => f.key === parts[2]);
    return `${list.itemLabel} ${Number(parts[1]) + 1}${field ? `：${field.label}` : ''}`;
  }

  function updateErrors(): void {
    const errors = evals[active]?.errors ?? {};
    const prefix = `scenarios.${active}.`;
    let hasAdvancedError = false;

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
      if (show) {
        control.setAttribute('aria-invalid', 'true');
        // 若該錯誤欄位在進階設定中，標記需自動展開
        const advParent = control.closest('#advanced-settings-box');
        if (advParent) hasAdvancedError = true;
      } else {
        control.removeAttribute('aria-invalid');
      }
    });

    formEl.querySelectorAll<HTMLInputElement>('input[id$="-extra"]').forEach(extra => {
      const main = document.getElementById(extra.id.replace(/-extra$/, ''));
      for (const attr of ['aria-invalid', 'aria-describedby']) {
        const value = main?.getAttribute(attr);
        if (value) extra.setAttribute(attr, value); else extra.removeAttribute(attr);
      }
    });
    if (hasAdvancedError) {
      const advBox = document.getElementById('advanced-settings-box') as HTMLDetailsElement | null;
      if (advBox && !advBox.open) advBox.open = true;
    }
  }

  // ---- results rendering ----
  function renderCards(cards: Card[]): HTMLElement {
    const coreCards = cards.filter((c) => c.isCore);
    const secondaryCards = cards.filter((c) => !c.isCore);

    const root = h('div', { class: 'cards-container' });

    if (coreCards.length > 0) {
      const coreGrid = h('div', { class: 'cards cards-core' });
      for (const card of coreCards) {
        coreGrid.append(
          h(
            'div',
            { class: `card card-featured tone-${card.tone ?? 'neutral'}` },
            h('div', { class: 'card-label' }, card.label),
            h('div', { class: 'card-value' }, card.value),
            card.note ? h('div', { class: 'card-note' }, card.note) : null,
          ),
        );
      }
      root.append(coreGrid);
    }

    if (secondaryCards.length > 0) {
      const secGrid = h('div', { class: 'cards cards-secondary' });
      for (const card of secondaryCards) {
        secGrid.append(
          h(
            'div',
            { class: `card tone-${card.tone ?? 'neutral'}` },
            h('div', { class: 'card-label' }, card.label),
            h('div', { class: 'card-value' }, card.value),
            card.note ? h('div', { class: 'card-note' }, card.note) : null,
          ),
        );
      }
      root.append(secGrid);
    }

    return root;
  }

  function renderResults(): void {
    const scheduleOpen = resultsEl.querySelector<HTMLDetailsElement>('.schedule-details')?.open ?? false;
    const ev = evals[active];
    const name = String(scenarios()[active].name);
    const heading = h('h2', { id: 'results-heading', tabindex: '-1' }, `試算結果：${name}`);
    const sampleBadge = h('span', { class: 'sample-tag' }, '示範情境（虛構範例）');
    const parts: Node[] = [h('div', { class: 'results-title-row' }, heading, sampleBadge)];

    const errorKeys = Object.keys(ev.errors);
    if (errorKeys.length > 0) {
      const list = h('ul');
      for (const key of errorKeys) list.append(h('li', {}, `${labelFor(key)}：${ev.errors[key]}`));
      parts.push(
        h(
          'div',
          { class: 'notice notice-bad', role: 'alert' },
          h('strong', {}, '輸入待修正，以下結果已失效。請修正下列欄位：'),
          list,
        ),
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
        if (table.collapsed) {
          const details = h('details', { class: 'schedule-details', open: scheduleOpen }, h('summary', {}, `逐月攤還明細（共 ${table.rows.length} 期，點此展開／收合）`), wrap);
          if (table.note) details.append(h('p', { class: 'hint' }, table.note));
          parts.push(details);
        } else {
          parts.push(wrap);
          if (table.note) parts.push(h('p', { class: 'hint' }, table.note));
        }
      }

      // 下載 CSV 按鈕：只要結果具有 CSV 即必定渲染，保證無表格工具（如退休試算）亦正常具備
      const csv = ev.csv;
      if (csv) {
        const csvBtn = h('button', { type: 'button', class: 'btn small btn-csv-download' }, `下載 CSV 明細（${csv.filename}）`);
        csvBtn.addEventListener('click', () => {
          download(csv.filename, toCsv(csv.rows), 'text/csv;charset=utf-8');
          setStatus('已在你的本機產生 CSV 檔案，未上傳任何資料。');
        });
        parts.push(h('div', { class: 'table-action-row' }, csvBtn));
      }

      if (ev.assumptions.length > 0) {
        const list = h('ul', { class: 'assumptions' });
        ev.assumptions.forEach((a) => list.append(h('li', {}, a)));
        parts.push(h('details', { class: 'assumption-box', open: false }, h('summary', {}, '本次假設與完整方法限制'), list));
      }
    }

    resultsEl.replaceChildren(...parts);
  }

  function noticePrefix(tone: string): string {
    return tone === 'bad' ? '【警示】' : tone === 'warn' ? '【注意】' : '';
  }

  // ---- compare rendering ----
  function renderCompare(): void {
    if (scenarios().length < 2) {
      compareEl.replaceChildren();
      return;
    }

    // 檢查基本條件是否不同
    const baseDifferences: string[] = [];
    const first = scenarios()[0];
    const checkKeys: Record<string, string> = {
      principal: '貸款本金',
      price: '房屋總價',
      downPayment: '頭期款',
      ltv: '貸款成數',
      currentAge: '目前年齡',
      retireAge: '退休年齡',
      endAge: '終止年齡',
      monthlyContribution: '每月投入',
      monthlySpending: '每月支出',
      assets: '可投資資產',
      collateralValue: '擔保品市值',
      loanAmount: '借款金額',
      monthlyIncome: '每月收入',
      otherMonthlyDebt: '其他債務',
      inflation: '通膨率',
    };

    if (def.comparisonBasis) {
      const baseline = def.comparisonBasis(first, root);
      for (const [label, value] of Object.entries(baseline)) {
        if (scenarios().slice(1).some(s => JSON.stringify(def.comparisonBasis!(s, root)[label]) !== JSON.stringify(value))) baseDifferences.push(label);
      }
    }
    for (const [k, label] of Object.entries(def.comparisonBasis ? {} : checkKeys)) {
      if (k in first) {
        for (let i = 1; i < scenarios().length; i += 1) {
          if (scenarios()[i][k] !== first[k]) {
            if (!baseDifferences.includes(label)) baseDifferences.push(label);
          }
        }
      }
    }

    // 針對房貸工具檢查衍生貸款本金
    if (def.id === 'mortgage') {
      const p0 = evals[0]?.cards.find((c) => c.compareKey === 'principal')?.value;
      for (let i = 1; i < evals.length; i += 1) {
        const pi = evals[i]?.cards.find((c) => c.compareKey === 'principal')?.value;
        if (p0 && pi && p0 !== pi) {
          if (!baseDifferences.includes('貸款本金')) baseDifferences.push('貸款本金');
        }
      }
    }

    const table = h('table');
    table.append(h('caption', {}, `${def.scenarioNoun}比較（各${def.scenarioNoun}輸入完全獨立）`));
    const head = h('tr', {}, h('th', { scope: 'col' }, '項目'));
    scenarios().forEach((s) => {
      const badge = def.scenarioBadge ? def.scenarioBadge(s, root) : '';
      head.append(
        h(
          'th',
          { scope: 'col' },
          String(s.name),
          badge ? h('span', { class: 'compare-badge' }, badge) : null,
        ),
      );
    });
    table.append(h('thead', {}, head));
    const body = h('tbody');

    // 1. 輸入條件與假設區塊 (Inputs & Assumptions)
    if (def.compareInputs) {
      const baseInputs = def.compareInputs(scenarios()[0], evals[0], root);
      for (let rowIdx = 0; rowIdx < baseInputs.length; rowIdx += 1) {
        const itemLabel = baseInputs[rowIdx].label;
        const vals = scenarios().map((s, idx) => {
          const list = def.compareInputs!(s, evals[idx], root);
          return list[rowIdx]?.value ?? '—';
        });
        const isDiff = vals.some((v) => v !== vals[0]);
        const tr = h('tr', { class: isDiff ? 'compare-row-diff' : '' });
        tr.append(h('th', { scope: 'row' }, itemLabel, isDiff ? h('span', { class: 'diff-tag' }, '（不同）') : null));
        vals.forEach((v) => tr.append(h('td', { class: 'num' }, v)));
        body.append(tr);
      }
    }

    // 2. 試算結果指標區塊 (Results & Metrics)
    interface MetricItem {
      key: string;
      label: string;
    }
    const metricItems: MetricItem[] = [];
    evals.forEach((ev) => {
      if (Object.keys(ev.errors).length === 0) {
        ev.cards.filter((c) => c.compare).forEach((c) => {
          const key = c.compareKey || c.label;
          if (!metricItems.some((m) => m.key === key)) {
            metricItems.push({ key, label: c.compareLabel || c.label });
          }
        });
      }
    });

    for (const item of metricItems) {
      const tr = h('tr');
      tr.append(h('th', { scope: 'row' }, item.label));
      evals.forEach((ev) => {
        const invalid = Object.keys(ev.errors).length > 0;
        const card = invalid ? undefined : ev.cards.find((c) => (c.compareKey || c.label) === item.key);
        tr.append(h('td', { class: 'num' }, invalid ? '輸入無效' : (card?.value ?? '—')));
      });
      body.append(tr);
    }

    if (metricItems.length === 0 && (!def.compareInputs || def.compareInputs(scenarios()[0], evals[0], root).length === 0)) {
      body.append(h('tr', {}, h('td', { colspan: String(scenarios().length + 1) }, `尚無可比較的有效${def.scenarioNoun}，請先修正輸入。`)));
    }
    table.append(body);

    const compareHeader = h('div', { class: 'compare-header' }, h('h2', {}, `${def.scenarioNoun}比較`));
    if (baseDifferences.length > 0) {
      compareHeader.append(
        h(
          'div',
          { class: 'notice notice-warn' },
          `⚠ 注意：各${def.scenarioNoun}的基本條件不同（${baseDifferences.join('、')}）。${def.syncFromA ? `可使用上方「${def.syncFromA.buttonLabel}」對齊指定條件；請先確認覆寫範圍。` : '請核對下方各方案的輸入條件，再比較結果；各方案可獨立編輯。'}`,
        ),
      );
    }

    compareEl.replaceChildren(
      compareHeader,
      h('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': `${def.scenarioNoun}比較表` }, table),
    );
  }

  // ---- storage & management (收進 details) ----
  function renderStorage(): void {
    const summary = h('summary', {}, '儲存與設定管理（進階備份／還原／重設）');

    const exampleBtn = h('button', { type: 'button', class: 'btn' }, '載入範例資料');
    exampleBtn.addEventListener('click', () => {
      root = clone(def.example());
      resetView();
      setStatus('已載入示範情境範例。');
    });

    const resetBtn = h('button', { type: 'button', class: 'btn' }, '清空重設');
    resetBtn.addEventListener('click', () => {
      undoState = clone(root);
      root = clone(def.blank());
      resetView();

      const undoBtn = h('button', { type: 'button', class: 'btn small' }, '復原重設 (Undo)');
      undoBtn.addEventListener('click', () => {
        if (undoState) {
          root = clone(undoState);
          undoState = null;
          resetView();
          setStatus('已復原清空前的設定。');
        }
      });

      setStatus(h('span', {}, '已清空所有欄位。', undoBtn));
      if (undoTimer) clearTimeout(undoTimer);
      undoTimer = setTimeout(() => {
        undoState = null;
      }, 8000);
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
      setStatus(`已成功匯入 ${scenarios().length} 組${def.scenarioNoun}設定。`);
    });

    const importBtn = h('button', { type: 'button', class: 'btn' }, '匯入設定檔（JSON）');
    importBtn.addEventListener('click', () => fileInput.click());

    const exportBtn = h('button', { type: 'button', class: 'btn' }, '匯出設定檔（JSON）');
    exportBtn.addEventListener('click', () => {
      download(`larry-lab-${def.id}.json`, buildExport(def.id, root), 'application/json');
      setStatus('已在你的本機產生設定檔，僅包含手動輸入的試算假設。');
    });

    const shareBtn = h('button', { type: 'button', class: 'btn' }, '複製工具網址');
    shareBtn.addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}`;
      try {
        await navigator.clipboard.writeText(url);
        setStatus('已複製工具網址（網址完全不含任何金額或個人參數）。');
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
          remember = false;
          rememberBox.checked = false;
          setStatus('此瀏覽器無法儲存設定，但仍可正常試算。', 'error');
        } else {
          setStatus('已將此工具設定保存在本機瀏覽器 LocalStorage（純文字儲存，未經加密；共用裝置請記得刪除）。');
        }
      } else {
        clearTool(def.id);
        setStatus('已刪除此工具在本機瀏覽器保存的設定。');
      }
    });

    const rememberLabel = h('label', { for: 'remember-toggle', class: 'remember' }, rememberBox, ' 記住此工具設定（未加密純文字儲存於此瀏覽器）');

    const clearBtn = h('button', { type: 'button', class: 'btn subtle' }, '刪除已儲存設定');
    clearBtn.addEventListener('click', () => {
      clearTool(def.id);
      remember = false;
      rememberBox.checked = false;
      setStatus(hasStoredTool(def.id) ? '無法刪除已儲存設定。' : '已刪除此工具在本機瀏覽器保存的設定。');
    });

    const content = h(
      'div',
      { class: 'storage-content' },
      h('div', { class: 'btn-row' }, exampleBtn, resetBtn, importBtn, exportBtn, shareBtn, fileInput),
      h('div', { class: 'btn-row remember-row' }, rememberLabel, clearBtn),
      h(
        'p',
        { class: 'hint' },
        '所有輸入預設只存在網頁記憶體中；勾選「記住」將以未經加密純文字存放於本機 LocalStorage。共用電腦或公共裝置切勿勾選。',
      ),
    );

    storageEl.replaceChildren(summary, content);
  }

  function showManualCopy(url: string): void {
    const input = h('input', { type: 'text', readonly: true, value: url, class: 'copy-input', 'aria-label': '工具網址，請手動複製' });
    setStatus(h('div', {}, '無法自動寫入剪貼簿，請手動複製網址：', input));
    input.focus();
    input.select();
  }

  // ---- orchestration ----
  function refresh(): void {
    evals = scenarios().map((s) => def.evaluate(s, root));
    applyVisibility();
    updateErrors();
    if (def.advancedSummary) {
      const pill = formEl.querySelector('.adv-pill');
      if (pill) pill.textContent = def.advancedSummary(scenarios()[active], root);
    }
    for (const spec of def.scenarioFields) {
      if (isListSpec(spec) && spec.summary) {
        const summary = formEl.querySelector(`[data-weight-summary="${spec.key}"]`);
        if (summary) summary.textContent = spec.summary(scenarios()[active]);
      }
    }
    renderResults();
    renderCompare();
    renderTabs();
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
    document.getElementById('results-heading')?.scrollIntoView({ behavior: 'smooth' });
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

  renderTabs();
  renderForm();
  renderStorage();
  refresh();
  if (remember) setStatus('已載入你先前在此瀏覽器保存的本機設定。');
}
