export type Lang = 'en' | 'ms';

export const STRINGS: Record<
  Lang,
  {
    trackReport: string;
    check: string;
    notFound: string;
    error: string;
    loading: string;
    locationsShown: (count: number) => string;
    legendTitle: string;
    ticket: string;
    typeOfComplaint: string;
    status: string;
    firstDate: string;
    latestDate: string;
    complainants: string;
    photosShared: string;
    reportedByOne: string;
    reportedByMany: (count: number) => string;
    statusLabels: Record<string, string>;
    categories: Record<string, string>;
  }
> = {
  en: {
    trackReport: 'Track your report',
    check: 'Check',
    notFound: 'No report found with that ticket number. Please check and try again.',
    error: 'Something went wrong, please try again in a moment.',
    loading: 'Loading reports…',
    locationsShown: (count) => `${count} report location${count === 1 ? '' : 's'} shown`,
    legendTitle: 'Type of Complaint',
    ticket: 'Ticket',
    typeOfComplaint: 'Type of Complaint',
    status: 'Status',
    firstDate: 'First Date Complained',
    latestDate: 'Latest Date Complained',
    complainants: 'Number of Complainants',
    photosShared: 'Photos shared',
    reportedByOne: 'Reported by 1 person',
    reportedByMany: (count) => `Reported by ${count} people`,
    statusLabels: {
      baru: 'New',
      siasat: 'Under investigation',
      majlis_perbandaran: 'Municipal council',
      selesai: 'Resolved',
      tangguh: 'Deferred',
    },
    categories: {
      jalan_berlubang: 'Pothole',
      banjir: 'Flooding',
      lampu_jalan: 'Streetlight',
      sampah: 'Rubbish',
      bantuan_kebajikan: 'Welfare assistance',
      lain_lain: 'Other',
    },
  },
  ms: {
    trackReport: 'Semak status laporan',
    check: 'Semak',
    notFound: 'Tiada laporan dijumpai. Sila semak nombor tiket dan cuba lagi.',
    error: 'Ralat berlaku. Sila cuba sebentar lagi.',
    loading: 'Memuatkan aduan…',
    locationsShown: (count) => `${count} lokasi aduan dipaparkan`,
    legendTitle: 'Jenis Aduan',
    ticket: 'Tiket',
    typeOfComplaint: 'Jenis Aduan',
    status: 'Status',
    firstDate: 'Tarikh Aduan Pertama',
    latestDate: 'Tarikh Aduan Terkini',
    complainants: 'Bilangan Pengadu',
    photosShared: 'Foto dikongsi',
    reportedByOne: 'Dilaporkan oleh 1 orang',
    reportedByMany: (count) => `Dilaporkan oleh ${count} orang`,
    statusLabels: {
      baru: 'Baru',
      siasat: 'Siasatan',
      majlis_perbandaran: 'Majlis Perbandaran',
      selesai: 'Selesai',
      tangguh: 'Tangguh',
    },
    categories: {
      jalan_berlubang: 'Jalan berlubang',
      banjir: 'Banjir',
      lampu_jalan: 'Lampu jalan',
      sampah: 'Sampah',
      bantuan_kebajikan: 'Bantuan kebajikan',
      lain_lain: 'Lain-lain',
    },
  },
};

export function formatComplainants(count: number, lang: Lang): string {
  const t = STRINGS[lang];
  return count === 1 ? t.reportedByOne : t.reportedByMany(count);
}

export function formatCategoryLabel(category: string, lang: Lang): string {
  return STRINGS[lang].categories[category] ?? category.replace(/_/g, ' ');
}

export function formatStatusLabel(status: string, lang: Lang): string {
  return STRINGS[lang].statusLabels[status] ?? status.replace(/_/g, ' ');
}
