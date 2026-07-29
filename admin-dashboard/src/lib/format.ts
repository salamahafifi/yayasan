import type { IssueCategory, PriorityLevel, TicketStatus } from '../types/database';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  baru: 'Baru',
  siasat: 'Siasatan',
  majlis_perbandaran: 'Majlis Perbandaran',
  selesai: 'Selesai',
  tangguh: 'Tangguh',
};

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  longkang_tersumbat: 'Longkang tersumbat',
  jalan_berlubang: 'Jalan berlubang',
  lampu_jalan: 'Lampu jalan rosak',
  sampah: 'Sampah tidak dikutip',
  semak: 'Semak panjang',
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
