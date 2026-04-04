/**
 * Safely converts any value to a renderable string.
 * Logs to console if an object is detected (helps debug React #310).
 */
export function safe(value: unknown, label?: string): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Object detected — this would cause React error #310
  console.error(`[safeRender] Object found${label ? ` in "${label}"` : ''}:`, value);
  try {
    return JSON.stringify(value);
  } catch {
    return '[object]';
  }
}
