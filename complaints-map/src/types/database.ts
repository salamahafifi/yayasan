export type TicketStatus = 'baru' | 'siasat' | 'majlis_perbandaran' | 'selesai' | 'tangguh';

export type IssueCategory =
  | 'jalan_berlubang'
  | 'banjir'
  | 'lampu_jalan'
  | 'sampah'
  | 'bantuan_kebajikan'
  | 'lain_lain';

/** Row from public_tickets (map pins). No ticket_number, description, or photos. */
export type PublicTicket = {
  id: number;
  category: IssueCategory;
  status: TicketStatus;
  latitude: number | null;
  longitude: number | null;
  agency: string | null;
  report_count: number;
  first_reported_at: string | null;
  days_outstanding: number | null;
  parent_ticket_id: number | null;
};

/** Row from get_ticket_status RPC (Semak). */
export type TicketStatusResult = {
  category: IssueCategory;
  status: TicketStatus;
  first_reported_at: string | null;
  days_outstanding: number | null;
};

/** Row from public_ticket_photos (staff-approved only). */
export type PublicTicketPhoto = {
  ticket_id: number;
  root_ticket_id: number;
  photo_url: string;
};

export const PUBLIC_TICKET_COLUMNS =
  'id, category, status, latitude, longitude, agency, report_count, first_reported_at, days_outstanding, parent_ticket_id';
