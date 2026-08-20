import type { IssueCategory, PriorityLevel, TicketStatus } from '../types/database';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  baru: 'Baru',
  siasat: 'Siasatan',
  majlis_perbandaran: 'Majlis Perbandaran',
  selesai: 'Selesai',
  tangguh: 'Tangguh',
  arkib: 'Arkib',
};

export const EDIT_FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  assigned_to: 'Assignee',
  name: 'Name',
  contact_number: 'Phone',
  description: 'Description',
  category: 'Category',
  adun_priority: 'Priority',
  agency: 'Agency',
  agency_ref: 'Agency ref',
  agency_reported_at: 'Agency date',
  address_text: 'Address',
  is_public: 'On public map',
  location: 'Map pin',
  location_source: 'Location source',
};

export function formatEditValue(value: string | null): string {
  if (value == null || value === '') return '—';
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';
  return value;
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  jalan_berlubang: 'Jalan & perabot jalan',
  lampu_jalan: 'Lampu jalan & lampu isyarat',
  semak: 'Pokok & landskap',
  sampah: 'Sampah & pembersihan',
  longkang_tersumbat: 'Saliran & perparitan',
  gangguan_haiwan: 'Gangguan haiwan',
  lain_lain: 'Lain-lain',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  rendah: 'Rendah',
  biasa: 'Biasa',
  tinggi: 'Tinggi',
  kritikal: 'Kritikal',
};

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
