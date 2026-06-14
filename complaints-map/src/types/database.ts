export type TicketStatus = 'baru' | 'siasat' | 'majlis_perbandaran' | 'selesai' | 'tangguh';

export type IssueCategory =
  | 'jalan_berlubang'
  | 'banjir'
  | 'lampu_jalan'
  | 'sampah'
  | 'bantuan_kebajikan'
  | 'lain_lain';

export type PublicTicket = {
  id: number;
  ticket_number: string;
  category: IssueCategory;
  description: string;
  status: TicketStatus;
  adun_priority: string;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  parent_ticket_id: number | null;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  photo_url: string | null;
  photo_urls?: string[];
};
