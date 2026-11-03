/** Replace {placeholders} with values; unknown placeholders are left as typed. */
export function fill(template: string, vars: Partial<Record<string, string>>) {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? (vars[k] ?? "") : m));
}
