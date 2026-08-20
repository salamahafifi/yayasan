/** Build phone variants so WhatsApp logs match web (+60…) and WA (60…) formats. */
export function phoneLookupVariants(phone: string): string[] {
  const trimmed = phone.trim();
  if (!trimmed) return [];

  const digits = trimmed.replace(/\D/g, '');
  const variants = new Set<string>([trimmed]);
  if (digits) variants.add(digits);

  if (digits.startsWith('60') && digits.length >= 10) {
    variants.add(`+${digits}`);
    variants.add(`0${digits.slice(2)}`);
  } else if (digits.startsWith('0') && digits.length >= 9) {
    variants.add(`60${digits.slice(1)}`);
    variants.add(`+60${digits.slice(1)}`);
  }

  return [...variants];
}
