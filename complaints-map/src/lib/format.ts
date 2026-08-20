import type { IssueCategory, PublicTicket, TicketStatus } from '../types/database';

export type MappableTicket = PublicTicket & { latitude: number; longitude: number };

export function isMappable(ticket: PublicTicket): ticket is MappableTicket {
  return ticket.latitude != null && ticket.longitude != null;
}

export type TicketGroup = {
  key: string;
  ticketId: number;
  category: IssueCategory;
  latitude: number;
  longitude: number;
  agency: string | null;
  firstReportedAt: string | null;
  daysOutstanding: number | null;
  status: TicketStatus;
  complainantCount: number;
  photos: string[];
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  baru: 'Baru',
  siasat: 'Siasatan',
  majlis_perbandaran: 'Majlis Perbandaran',
  selesai: 'Selesai',
  tangguh: 'Tangguh',
  arkib: 'Arkib',
};

export function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso));
}

export function formatDateOrDash(iso: string | null | undefined): string {
  if (!iso) return '—';
  return formatDate(iso);
}

export function formatComplainants(count: number): string {
  return count === 1 ? 'Reported by 1 person' : `Reported by ${count} people`;
}

function locationCategoryKey(ticket: MappableTicket): string {
  return `${ticket.latitude.toFixed(4)}|${ticket.longitude.toFixed(4)}|${ticket.category}`;
}

/** Parents-only public_tickets: one pin per location+category cluster; report_count from parent. */
export function groupMappableTickets(
  tickets: MappableTicket[],
  photosByRootId: Map<number, string[]> = new Map(),
): TicketGroup[] {
  const grouped = new Map<string, MappableTicket[]>();

  for (const ticket of tickets) {
    const key = locationCategoryKey(ticket);
    const existing = grouped.get(key) ?? [];
    existing.push(ticket);
    grouped.set(key, existing);
  }

  return [...grouped.entries()].map(([key, groupTickets]) => {
    // Prefer highest report_count as the pin representative
    const parent = [...groupTickets].sort((a, b) => b.report_count - a.report_count)[0];
    const photos = photosByRootId.get(parent.id) ?? [];

    return {
      key,
      ticketId: parent.id,
      category: parent.category,
      latitude: parent.latitude,
      longitude: parent.longitude,
      agency: parent.agency,
      firstReportedAt: parent.first_reported_at,
      daysOutstanding: parent.days_outstanding,
      status: parent.status,
      complainantCount: parent.report_count,
      photos,
    };
  });
}
