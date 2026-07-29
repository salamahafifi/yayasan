export type IssueCategory =
  | 'jalan_berlubang'
  | 'banjir'
  | 'lampu_jalan'
  | 'sampah'
  | 'bantuan_kebajikan'
  | 'lain_lain';

export type TicketStatus = 'baru' | 'siasat' | 'majlis_perbandaran' | 'selesai' | 'tangguh';

export type PriorityLevel = 'rendah' | 'biasa' | 'tinggi' | 'kritikal';

export type InputLanguage = 'ms' | 'en' | 'zh' | 'ta';

export type StaffRole = 'viewer' | 'staff' | 'admin';

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
  whatsapp_number: string;
  name: string | null;
  language: InputLanguage;
  category: IssueCategory;
  description: string | null;
  photo_url: string | null;
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
  created_at: string;
  updated_at: string;
};

/** Safe ticket row for viewers (no name / WhatsApp). */
export type SafeTicket = {
  id: number;
  ticket_number: string;
  language: InputLanguage;
  category: IssueCategory;
  description: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  status: TicketStatus;
  adun_priority: PriorityLevel;
  is_public: boolean;
  parent_ticket_id: number | null;
  upvote_count: number;
  created_at: string;
  updated_at: string;
};

export const STAFF_TICKET_COLUMNS =
  'id, ticket_number, whatsapp_number, name, language, category, description, photo_url, voice_note_url, latitude, longitude, address_text, status, adun_priority, is_public, parent_ticket_id, upvote_count, contactable, created_at, updated_at';

export const VIEWER_TICKET_COLUMNS =
  'id, ticket_number, language, category, description, photo_url, latitude, longitude, address_text, status, adun_priority, is_public, parent_ticket_id, upvote_count, created_at, updated_at';
