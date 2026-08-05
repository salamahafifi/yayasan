/** Strip a full storage URL down to the object path the signed-URL API expects. */
export function normalizeTicketPhotoPath(path: string): string {
  const trimmed = path.trim();
  const marker = '/ticket-photos/';
  const idx = trimmed.indexOf(marker);
  if (idx !== -1) {
    return trimmed.slice(idx + marker.length).split('?')[0];
  }
  return trimmed.split('?')[0];
}
