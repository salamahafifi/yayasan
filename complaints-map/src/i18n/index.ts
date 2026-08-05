import { t, type Lang } from './strings';

export type { Lang };
export { strings, t } from './strings';

export function formatComplainants(count: number, lang: Lang): string {
  return count === 1
    ? t(lang, 'reportedByOne')
    : t(lang, 'reportedByMany', { count });
}

export function formatCategoryLabel(category: string, lang: Lang): string {
  const key = `category_${category}`;
  const label = t(lang, key);
  return label === key ? category.replace(/_/g, ' ') : label;
}

export function formatStatusLabel(status: string, lang: Lang): string {
  const key = `status_${status}`;
  const label = t(lang, key);
  return label === key ? status.replace(/_/g, ' ') : label;
}
