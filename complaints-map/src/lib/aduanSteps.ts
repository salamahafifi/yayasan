export const ADUAN_SLUGS = [
  'kategori',
  'lokasi',
  'butiran',
  'laporan',
  'maklumat',
  'semak-hantar',
] as const;

export type AduanSlug = (typeof ADUAN_SLUGS)[number];

export const ADUAN_STEP_COUNT = ADUAN_SLUGS.length;

/** Step numbers are 1-based to match the "Langkah 1 daripada 6" wording. */
export function aduanPath(step: number): string {
  const slug = ADUAN_SLUGS[step - 1] ?? ADUAN_SLUGS[0];
  return `/aduan/${slug}`;
}

export function stepForSlug(slug: string): number | null {
  const index = ADUAN_SLUGS.indexOf(slug as AduanSlug);
  return index === -1 ? null : index + 1;
}

/** Old numeric URLs stay shareable; anything else is not a step. */
export function stepForLegacyParam(param: string): number | null {
  if (!/^[1-9][0-9]*$/.test(param)) return null;
  const step = Number(param);
  return step >= 1 && step <= ADUAN_STEP_COUNT ? step : null;
}
