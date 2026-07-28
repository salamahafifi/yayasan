import type { IssueCategory, PublicTicket, TicketStatus } from '../types/database';

export type MappableTicket = PublicTicket & { latitude: number; longitude: number };

export function isMappable(ticket: PublicTicket): ticket is MappableTicket {
  return ticket.latitude != null && ticket.longitude != null;
}

export type TicketGroup = {
  key: string;
  category: IssueCategory;
  latitude: number;
  longitude: number;
  firstReportedAt: string;
  latestReportedAt: string;
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
  }).format(new Date(iso));
}

export function formatComplainants(count: number): string {
  return count === 1 ? 'Reported by 1 person' : `Reported by ${count} people`;
}

export function getTicketPhotos(ticket: PublicTicket): string[] {
  if (ticket.photo_url) return [ticket.photo_url];
  return [];
}

function locationCategoryKey(ticket: MappableTicket): string {
  return `${ticket.latitude.toFixed(6)}|${ticket.longitude.toFixed(6)}|${ticket.category}`;
}

export function groupMappableTickets(tickets: MappableTicket[]): TicketGroup[] {
  const grouped = new Map<string, MappableTicket[]>();

  for (const ticket of tickets) {
    const key = locationCategoryKey(ticket);
    const existing = grouped.get(key) ?? [];
    existing.push(ticket);
    grouped.set(key, existing);
  }

  return [...grouped.entries()].map(([key, groupTickets]) => {
    const sorted = [...groupTickets].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const parent = sorted.find((ticket) => ticket.parent_ticket_id === null) ?? sorted[0];

    const photos: string[] = [];
    const seenPhotos = new Set<string>();
    for (const ticket of sorted) {
      for (const url of getTicketPhotos(ticket)) {
        if (!seenPhotos.has(url)) {
          seenPhotos.add(url);
          photos.push(url);
        }
      }
    }

    const complainantCount =
      parent.upvote_count > 1
        ? parent.upvote_count
        : sorted.reduce((sum, ticket) => sum + ticket.upvote_count, 0);

    const latestReportedAt = sorted.reduce(
      (latest, ticket) => (new Date(ticket.updated_at) > new Date(latest) ? ticket.updated_at : latest),
      sorted[0].updated_at,
    );

    return {
      key,
      category: parent.category,
      latitude: parent.latitude,
      longitude: parent.longitude,
      firstReportedAt: sorted[0].created_at,
      latestReportedAt,
      status: parent.status,
      complainantCount,
      photos,
    };
  });
}