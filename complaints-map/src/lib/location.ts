/**
 * Either a pin or a typed address is enough to proceed: when only an address
 * is given, the edge function geocodes it server-side on submit.
 */
export function canProceedFromLocation(data: {
  latitude: number | null;
  longitude: number | null;
  addressText: string;
}): boolean {
  const hasCoords = data.latitude != null && data.longitude != null;
  const hasAddress = data.addressText.trim().length > 0;
  return hasCoords || hasAddress;
}
