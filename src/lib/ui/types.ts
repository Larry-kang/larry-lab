import type { CsvCell } from '../csv';
import type { Values } from '../parse';

export interface Option {
  value: string;
  label: string;
}

export interface FieldSpec {
  key: string;
  label: string;
  kind: 'amount' | 'percent' | 'integer' | 'decimal' | 'text' | 'select';
  unit?: string;
  hint?: string;
  options?: Option[];
  monthPresets?: number[];
  placeholder?: string;
  visibleIf?: (scenario: Values, root: Values) => boolean;
  /** For select fields: when changed, clear the values of fields that become hidden. */
  clearsHidden?: boolean;
  /** 是否歸類為進階設定 */
  isAdvanced?: boolean;
  /** 提供年/月等單位切換輸入便利控制，底層仍保存整數月 */
  unitToggle?: {
    type: 'year-month';
    defaultUnit?: 'year' | 'month';
  };
}

export interface ListSpec {
  key: string;
  label: string;
  itemLabel: string;
  addLabel: string;
  min: number;
  max: number;
  hint?: string;
  fields: FieldSpec[];
  summary?: (scenario: Values) => string;
  defaultItem: () => Values;
  visibleIf?: (scenario: Values, root: Values) => boolean;
  /** 是否歸類為進階設定 */
  isAdvanced?: boolean;
}

export type Spec = FieldSpec | ListSpec;

export function isListSpec(spec: Spec): spec is ListSpec {
  return 'fields' in spec;
}

export interface Card {
  label: string;
  value: string;
  note?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  /** Included in the scenario comparison table. */
  compare?: boolean;
  /** 跨方案穩定對齊的指標識別鍵（例如 'firstPayment', 'totalInterest' 等） */
  compareKey?: string;
  /** 比較表中使用的欄位標題，若未提供則使用 label */
  compareLabel?: string;
  /** 是否為前三項核心重點指標 */
  isCore?: boolean;
}

export interface Notice {
  tone: 'info' | 'good' | 'warn' | 'bad';
  text: string;
}

export interface ChartSeries {
  name: string;
  points: Array<[number, number]>;
}

export interface ChartSpec {
  title: string;
  description: string;
  xLabel: string;
  yLabel: string;
  yKind: 'twd' | 'percent';
  xKind?: 'integer';
  series: ChartSeries[];
  hLines?: Array<{ y: number; label: string }>;
  vLines?: Array<{ x: number; label: string }>;
}

export interface TableSpec {
  caption: string;
  columns: string[];
  rows: string[][];
  note?: string;
  collapsed?: boolean;
}

export interface Evaluation {
  /** Field errors keyed by path, e.g. `principal` or `segments.1.annualRate`. */
  errors: Record<string, string>;
  notices: Notice[];
  cards: Card[];
  charts: ChartSpec[];
  tables: TableSpec[];
  csv?: { filename: string; rows: CsvCell[][] };
  assumptions: string[];
}

export interface SyncFromAConfig {
  /** 操作按鈕標籤，如「以 A 的基本條件套用至其他情境」 */
  buttonLabel: string;
  /** 會被同步覆寫的欄位中文名稱說明清單，供確認對話框顯示 */
  description: string;
  /** 具體執行同步（深拷貝指定欄位由 sourceA 至 target） */
  apply: (target: Values, sourceA: Values) => void;
}

export interface PresetActionConfig {
  label: string;
  description: string;
  load: () => Values[];
}

export interface ToolDef {
  id: string;
  /** Shown in compare/CSV messages, e.g. "方案" or "情境". */
  scenarioNoun: string;
  maxScenarios: number;
  /** Fields shared by all scenarios (stored at the root of the JSON inputs). */
  topFields: FieldSpec[];
  /** Fields edited per scenario. */
  scenarioFields: Spec[];
  /** Fresh, fully empty state. */
  blank: () => Values;
  /** Fictional example data. */
  example: () => Values;
  evaluate: (scenario: Values, root: Values) => Evaluation;
  /** 動態產生情境徽章文字（如「年利率 2.15%」或「年報酬 6%」），非寫死固定字樣 */
  scenarioBadge?: (scenario: Values, root?: Values) => string;
  /** 進階折疊按鈕旁顯示的即時摘要文字（如「通膨 3%、退休後報酬 5%」） */
  advancedSummary?: (scenario: Values, root: Values) => string;
  /** 以 A 基本條件套用至其他情境之設定 */
  syncFromA?: SyncFromAConfig;
  /** 額外預設情境載入操作（例如退休工具的「載入三組報酬範例」） */
  presetScenariosAction?: PresetActionConfig;
  /** 自訂方案比較表格中的輸入欄位項目與摘要 */
  comparisonBasis?: (scenario: Values, root: Values) => Record<string, unknown>;
  compareInputs?: (scenario: Values, evaluation: Evaluation, root?: Values) => Array<{ label: string; value: string }>;
}

export function emptyEvaluation(): Evaluation {
  return { errors: {}, notices: [], cards: [], charts: [], tables: [], assumptions: [] };
}
