// Single source of truth for brand identity strings used across the app.
// Replace placeholder once final name + logo are decided (per CLAUDE_REFERENCE/brand.md).

export const APP_NAME = '[App Name]'

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'company'
}
