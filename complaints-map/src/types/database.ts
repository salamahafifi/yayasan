export type TicketStatus = 'baru' | 'siasat' | 'majlis_perbandaran' | 'selesai' | 'tangguh';

export type IssueCategory =
  | 'jalan_berlubang'
  | 'lampu_jalan'
  | 'semak'
  | 'sampah'
  | 'longkang_tersumbat'
  | 'gangguan_haiwan'
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
  needs_location: boolean;
};

/** Row from get_ticket_status RPC (Semak). */
export type TicketStatusResult = {
  category: IssueCategory;
  status: TicketStatus;
  first_reported_at: string | null;
  days_outstanding: number | null;
  /** Rounded like public_tickets; null when the case still needs a pin. */
  latitude: number | null;
  longitude: number | null;
  root_ticket_id: number;
};

/** Row from public_ticket_photos (staff-approved only). */
export type PublicTicketPhoto = {
  ticket_id: number;
  root_ticket_id: number;
  public_path: string;
};

export const PUBLIC_TICKET_COLUMNS =
  'id, category, status, latitude, longitude, agency, report_count, first_reported_at, days_outstanding, parent_ticket_id, needs_location';
