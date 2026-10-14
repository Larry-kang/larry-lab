import { sanitize, type Schema } from './io';
import type { Values } from './parse';

const PREFIX = 'larry-lab:v1:tool:';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Persist a tool's inputs. Returns false (and never throws) when storage is unavailable. */
export function saveTool(toolId: string, inputs: Values): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(PREFIX + toolId, JSON.stringify({ schemaVersion: 1, toolId, inputs }));
    return true;
  } catch {
    return false;
  }
}

/** Load stored inputs; corrupt or incompatible data is discarded. */
export function loadTool(toolId: string, schema: Schema): Values | null {
  const s = storage();
  if (!s) return null;
  try {
    const text = s.getItem(PREFIX + toolId);
    if (!text) return null;
    const data = JSON.parse(text) as { schemaVersion?: unknown; toolId?: unknown; inputs?: unknown };
    if (data.schemaVersion !== 1 || data.toolId !== toolId) return null;
    const result = sanitize(schema, data.inputs);
    return result.ok ? result.value : null;
  } catch {
    return null;
  }
}

export function clearTool(toolId: string): void {
  try {
    storage()?.removeItem(PREFIX + toolId);
  } catch {
    // Storage may be blocked; nothing else to clean up.
  }
}

/** Remove every Larry Lab key; returns how many were removed. */
export function clearAllTools(): number {
  const s = storage();
  if (!s) return 0;
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i += 1) {
      const key = s.key(i);
      if (key?.startsWith('larry-lab:')) keys.push(key);
    }
    keys.forEach((key) => {
      s.removeItem(key);
      removed += 1;
    });
  } catch {
    // ignore
  }
  return removed;
}

export function hasStoredTool(toolId: string): boolean {
  try {
    return storage()?.getItem(PREFIX + toolId) != null;
  } catch {
    return false;
  }
}
