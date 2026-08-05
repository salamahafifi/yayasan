import type { IssueCategory } from '../types/database';

/** Read a CSS custom property from :root (hex / colour values for Leaflet, etc.). */
export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function categoryColor(category: IssueCategory): string {
  return token(`--color-category-${category}`);
}
