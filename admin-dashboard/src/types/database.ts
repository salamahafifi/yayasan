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