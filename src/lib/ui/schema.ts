import type { FieldDef, Schema } from '../io';
import { isListSpec, type FieldSpec, type Spec, type ToolDef } from './types';

const SCENARIO_NAME_MAX = 40;

function fieldDef(spec: FieldSpec): FieldDef {
  if (spec.kind === 'select') {
    return { kind: 'enum', values: (spec.options ?? []).map((o) => o.value) };
  }
  return { kind: 'text', max: 64 };
}

function specSchema(specs: Spec[]): Schema {
  const schema: Schema = {};
  for (const spec of specs) {
    if (isListSpec(spec)) {
      schema[spec.key] = { kind: 'list', maxItems: spec.max, item: specSchema(spec.fields) };
    } else {
      schema[spec.key] = fieldDef(spec);
    }
  }
  return schema;
}

/** JSON import schema for a tool: shared fields plus a bounded list of named scenarios. */
export function schemaOf(def: ToolDef): Schema {
  return {
    ...specSchema(def.topFields),
    scenarios: {
      kind: 'list',
      maxItems: def.maxScenarios,
      item: { name: { kind: 'text', max: SCENARIO_NAME_MAX }, ...specSchema(def.scenarioFields) },
    },
  };
}
