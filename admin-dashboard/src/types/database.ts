export type IssueCategory =
  | 'jalan_berlubang'
  | 'lampu_jalan'
  | 'semak'
  | 'sampah'
  | 'longkang_tersumbat'
  | 'gangguan_haiwan'
  | 'lain_lain';

export type TicketStatus = 'baru' | 'siasat' | 'majlis_perbandaran' | 'selesai' | 'tangguh';

export type PriorityLevel = 'rendah' | 'biasa' | 'tinggi' | 'kritikal';

export type InputLanguage = 'ms' | 'en' | 'zh' | 'ta';

export type StaffRole = 'viewer' | 'staff' | 'admin';
export type LocationSource = 'pin' | 'geocoded' | 'staff' | null;

export type StaffProfile = {
  user_id: string;
  name: string;
  email: string | null;
  role: StaffRole;
  active: boolean;
  created_at: string;
};

/** Full ticket row for staff/admin (includes PII). */
export type Ticket = {
  id: number;
  ticket_number: string;
  contact_number: string | null;
  name: string | null;
  language: InputLanguage;
  category: IssueCategory;
  description: string | null;
  voice_note_url: string | null;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  status: TicketStatus;
  adun_priority: PriorityLevel;
  is_public: boolean;
  parent_ticket_id: number | null;
  upvote_count: number;
  contactable: boolean;
  agency: string | null;
  agency_ref: string | null;
  agency_reported_at: string | null;
  publish_agency_ref: boolean;
  public_display_opt_out: boolean;
  messaging_opted_out: boolean;
  consent_given_at: string | null;
  consent_version: string | null;
  assigned_to: string | null;
  location_source: LocationSource;
  needs_location: boolean;
  created_at: string;
  updated_at: string;
};

/** Safe ticket row for viewers (no name / WhatsApp). */
export type SafeTicket = {
  id: number;
  ticket_number: string;
  language: InputLanguage;
  category: IssueCategory;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  status: TicketStatus;
  adun_priority: PriorityLevel;
  is_public: boolean;
  parent_ticket_id: number | null;
  upvote_count: number;
  agency: string | null;
  agency_ref: string | null;
  agency_reported_at: string | null;
  days_outstanding: number | null;
  assigned_to: string | null;
  location_source: LocationSource;
  needs_location: boolean;
  created_at: string;
  updated_at: string;
};

export const STAFF_TICKET_COLUMNS =
  'id, ticket_number, contact_number, name, language, category, description, voice_note_url, latitude, longitude, address_text, location_source, needs_location, status, adun_priority, is_public, parent_ticket_id, upvote_count, contactable, agency, agency_ref, agency_reported_at, publish_agency_ref, public_display_opt_out, messaging_opted_out, consent_given_at, consent_version, assigned_to, source, source_message_id, created_at, updated_at';

export const VIEWER_TICKET_COLUMNS =
  'id, ticket_number, language, category, latitude, longitude, address_text, location_source, needs_location, status, adun_priority, is_public, parent_ticket_id, upvote_count, agency, agency_ref, agency_reported_at, days_outstanding, assigned_to, created_at, updated_at';

export type StaffDirectoryEntry = Pick<StaffProfile, 'user_id' | 'name' | 'role'>;

export type CaseNote = {
  id: number;
  ticket_id: number;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export type TicketPhoto = {
  id: number;
  ticket_id: number;
  storage_path: string;
  public_path: string | null;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  signed_url?: string;
};

export type WhatsAppMessage = {
  id: number;
  direction: 'inbound' | 'outbound';
  body: string | null;
  media_type: string | null;
  created_at: string;
};

/** Days since agency_reported_at (local calendar), or null if missing. */
export function daysOutstandingFromAgencyReport(agencyReportedAt: string | null | undefined): number | null {
  if (!agencyReportedAt) return null;
  const reported = new Date(`${agencyReportedAt.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(reported.getTime())) return null;
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((startToday.getTime() - reported.getTime()) / 86_400_000);
}
