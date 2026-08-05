export type Lang = 'ms' | 'en' | 'zh' | 'ta';

type StringTable = Record<string, string>;

const ms: StringTable = {
  brandTitle: 'Peta Aduan',
  brandName: 'Salamahafifi',
  buatAduan: 'Buat Aduan',
  language: 'Language',
  managedBy: 'Diuruskan oleh Salamahafifi Solutions',
  privacy: 'Dasar Privasi',
  terms: 'Terma Perkhidmatan',
  dataDeletion: 'Padam Data Saya',
  footerMeta: 'Salamahafifi Solutions · SSM 202603191790 (PG0590830-U) · admin@sahkan.my',

  trackReport: 'Semak status laporan',
  check: 'Semak',
  notFound: 'Tiada laporan dijumpai. Sila semak nombor tiket dan cuba lagi.',
  error: 'Ralat berlaku. Sila cuba sebentar lagi.',
  loading: 'Memuatkan aduan…',
  locationsShown: '{count} lokasi aduan dipaparkan',
  awaitingLocation: '{count} aduan menunggu lokasi',
  legendTitle: 'Jenis Aduan',
  ticket: 'Tiket',
  typeOfComplaint: 'Jenis Aduan',
  status: 'Status',
  firstDate: 'Tarikh lapor kepada agensi',
  latestDate: 'Tarikh Aduan Terkini',
  daysOutstanding: 'Hari sejak lapor',
  complainants: 'Bilangan Pengadu',
  photosShared: 'Foto dikongsi',
  galleryPrev: 'Sebelum',
  galleryNext: 'Seterusnya',
  galleryClose: 'Tutup',
  galleryCounter: '{current} / {total}',
  hidePanel: 'Sembunyi',
  showPanel: 'Tunjuk panel',
  reportedByOne: 'Dilaporkan oleh 1 orang',
  reportedByMany: 'Dilaporkan oleh {count} orang',
  agencyLabel: 'Agensi',

  status_baru: 'Baru',
  status_siasat: 'Siasatan',
  status_majlis_perbandaran: 'Majlis Perbandaran',
  status_selesai: 'Selesai',
  status_tangguh: 'Tangguh',

  category_longkang_tersumbat: 'Longkang tersumbat',
  category_jalan_berlubang: 'Jalan berlubang',
  category_lampu_jalan: 'Lampu jalan rosak',
  category_sampah: 'Sampah tidak dikutip',
  category_semak: 'Semak panjang',
  category_lain_lain: 'Lain-lain',

  progressLabel: 'Kemajuan borang aduan',
  progressText: 'Langkah {step} daripada 6',
  next: 'Seterusnya',
  back: 'Kembali',
  cancel: 'Batal',
  submitLater: 'Hantar (kemudian)',
  stepNav: 'Navigasi langkah',

  step1Heading: 'Apa masalahnya?',
  step1NeedCategory: 'Sila pilih kategori masalah dahulu.',
  otherCategoryLabel: 'Nyatakan jenis masalah',
  otherCategoryPlaceholder: 'Contoh: longkang bocor',

  step2Heading: 'Di mana masalah ini?',
  step2NeedLocation:
    'Sila berikan lokasi: guna lokasi anda, taip alamat, atau pilih pada peta.',
  useMyLocation: 'Guna lokasi saya',
  gettingLocation: 'Mendapatkan lokasi…',
  locationDenied: 'Akses lokasi ditolak. Sila guna salah satu pilihan di bawah.',
  locationUnsupported:
    'Peranti ini tidak menyokong lokasi. Sila guna salah satu pilihan di bawah.',
  addressLabel: 'Taip alamat atau nama tempat',
  addressPlaceholder: 'cth: Taman Perling, Johor Bahru',
  pickOnMap: 'Pilih pada peta',
  dragMarkerHint: 'Seret penanda untuk ubah lokasi',

  step3Heading: 'Ceritakan masalah ini',
  step3Label: 'Apa yang berlaku?',
  step3Placeholder:
    'Contoh: Longkang di hadapan rumah No. 12, Jalan Meranti, Taman Perling tersumbat sejak seminggu. Air bertakung dan berbau.',
  step3NeedDescription: 'Sila ceritakan masalah ini dahulu.',
  charCounter: '{count}/2000',

  step4Heading: 'Pernah lapor kepada pihak berkuasa?',
  step4No: 'Belum pernah',
  step4Yes: 'Ya, pernah',
  step4NeedChoice: 'Sila pilih sama ada anda pernah melapor atau belum.',
  agencyNameLabel: 'Nama agensi',
  agencyNamePlaceholder: 'cth: MBJB',
  agencyRefLabel: 'Nombor rujukan',
  agencyRefPlaceholder: 'cth: MBJB-2026-1234',
  agencyDateLabel: 'Tarikh dilapor',
  agencyQuickPick: 'Pilihan pantas',

  step5Heading: 'Maklumat anda',
  nameLabel: 'Nama',
  nameOptional: 'pilihan',
  namePlaceholder: 'Nama anda',
  phoneLabel: 'Nombor telefon',
  phonePlaceholder: 'cth: 012-3456789',
  phoneNote:
    'Hanya digunakan jika staf perlu menghubungi anda. Tidak akan dipaparkan secara awam.',
  phoneInvalid: 'Nombor telefon nampak tidak betul. Sila betulkan atau kosongkan medan ini.',
  consentLabel:
    'Saya faham dan bersetuju data saya diproses mengikut {privacyLink}.',
  consentPrivacyLink: 'Dasar Privasi',
  step5NeedConsent: 'Sila tandakan kotak persetujuan untuk teruskan.',
  step5NeedPhoneFix: 'Sila betulkan atau kosongkan nombor telefon dahulu.',

  step6Heading: 'Semak sebelum hantar',
  reviewEdit: 'Ubah',
  reviewCategory: 'Kategori',
  reviewOtherCategory: 'Jenis lain',
  reviewLocation: 'Lokasi',
  reviewCoordinates: 'Pin peta',
  reviewAddress: 'Alamat',
  reviewDescription: 'Butiran',
  reviewReported: 'Laporan sedia ada',
  reviewReportedYes: 'Ya, pernah',
  reviewReportedNo: 'Belum pernah',
  reviewAgency: 'Agensi',
  reviewAgencyRef: 'Nombor rujukan',
  reviewAgencyDate: 'Tarikh dilapor',
  reviewName: 'Nama',
  reviewPhone: 'Telefon',
  reviewConsent: 'Persetujuan',
  reviewConsentYes: 'Diberi',
  reviewEmpty: '—',
  submitAduan: 'Hantar Aduan',
  submitting: 'Menghantar…',
  honeypotLabel: 'Jangan isi medan ini',
  turnstileRequired: 'Sila lengkapkan pengesahan keselamatan dahulu.',
  submitError:
    'Aduan tidak dapat dihantar. Sila cuba lagi. Maklumat anda masih tersimpan.',
  submitErrorNetwork:
    'Ralat rangkaian. Sila semak sambungan internet dan cuba lagi.',

  successHeading: 'Aduan berjaya dihantar',
  successTicketLabel: 'Nombor tiket anda',
  successSaveHint:
    'Sila simpan atau ambil tangkapan skrin nombor ini. Anda memerlukannya untuk semak status.',
  successPrivateHint:
    'Nombor tiket ini adalah sulit. Jangan kongsi secara awam.',
  successSemakLink: 'Semak status aduan',
  successHomeLink: 'Kembali ke peta',
};

const en: StringTable = {
  brandTitle: 'Peta Aduan',
  brandName: 'Salamahafifi',
  buatAduan: 'File a complaint',
  language: 'Language',
  managedBy: 'Managed by Salamahafifi Solutions',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  dataDeletion: 'Delete My Data',
  footerMeta: 'Salamahafifi Solutions · SSM 202603191790 (PG0590830-U) · admin@sahkan.my',

  trackReport: 'Track your report',
  check: 'Check',
  notFound: 'No report found with that ticket number. Please check and try again.',
  error: 'Something went wrong, please try again in a moment.',
  loading: 'Loading reports…',
  locationsShown: '{count} report location(s) shown',
  awaitingLocation: '{count} report(s) awaiting location',
  legendTitle: 'Complaint type',
  ticket: 'Ticket',
  typeOfComplaint: 'Complaint type',
  status: 'Status',
  firstDate: 'First reported to agency',
  latestDate: 'Latest date complained',
  daysOutstanding: 'Days outstanding',
  complainants: 'Number of complainants',
  photosShared: 'Photos shared',
  galleryPrev: 'Previous',
  galleryNext: 'Next',
  galleryClose: 'Close',
  galleryCounter: '{current} / {total}',
  hidePanel: 'Hide',
  showPanel: 'Show panel',
  reportedByOne: 'Reported by 1 person',
  reportedByMany: 'Reported by {count} people',
  agencyLabel: 'Agency',

  status_baru: 'New',
  status_siasat: 'Under investigation',
  status_majlis_perbandaran: 'Municipal council',
  status_selesai: 'Resolved',
  status_tangguh: 'Deferred',

  category_longkang_tersumbat: 'Blocked drain',
  category_jalan_berlubang: 'Pothole',
  category_lampu_jalan: 'Broken street light',
  category_sampah: 'Uncollected rubbish',
  category_semak: 'Overgrown bushes',
  category_lain_lain: 'Other',

  progressLabel: 'Complaint form progress',
  progressText: 'Step {step} of 6',
  next: 'Next',
  back: 'Back',
  cancel: 'Cancel',
  submitLater: 'Submit (later)',
  stepNav: 'Step navigation',

  step1Heading: 'What is the problem?',
  step1NeedCategory: 'Please choose a category first.',
  otherCategoryLabel: 'Describe the problem type',
  otherCategoryPlaceholder: 'Example: leaking drain',

  step2Heading: 'Where is the problem?',
  step2NeedLocation:
    'Please provide a location: use your location, type an address, or pick on the map.',
  useMyLocation: 'Use my location',
  gettingLocation: 'Getting location…',
  locationDenied: 'Location access was refused. Please use one of the options below.',
  locationUnsupported:
    'This device does not support location. Please use one of the options below.',
  addressLabel: 'Type an address or place name',
  addressPlaceholder: 'e.g. Taman Perling, Johor Bahru',
  pickOnMap: 'Pick on map',
  dragMarkerHint: 'Drag the marker to change the location',

  step3Heading: 'Describe this problem',
  step3Label: 'What happened?',
  step3Placeholder:
    'Example: The drain in front of No. 12, Jalan Meranti, Taman Perling has been blocked for a week. Water is pooling and smells.',
  step3NeedDescription: 'Please describe the problem first.',
  charCounter: '{count}/2000',

  step4Heading: 'Have you reported this to an authority?',
  step4No: 'Not yet',
  step4Yes: 'Yes, I have',
  step4NeedChoice: 'Please choose whether you have reported this before.',
  agencyNameLabel: 'Agency name',
  agencyNamePlaceholder: 'e.g. MBJB',
  agencyRefLabel: 'Reference number',
  agencyRefPlaceholder: 'e.g. MBJB-2026-1234',
  agencyDateLabel: 'Date reported',
  agencyQuickPick: 'Quick picks',

  step5Heading: 'Your details',
  nameLabel: 'Name',
  nameOptional: 'optional',
  namePlaceholder: 'Your name',
  phoneLabel: 'Phone number',
  phonePlaceholder: 'e.g. 012-3456789',
  phoneNote:
    'Only used if staff need to follow up. Never shown publicly.',
  phoneInvalid: 'This phone number looks incorrect. Please fix it or clear the field.',
  consentLabel:
    'I understand and agree that my data will be processed under the {privacyLink}.',
  consentPrivacyLink: 'Privacy Policy',
  step5NeedConsent: 'Please tick the consent box to continue.',
  step5NeedPhoneFix: 'Please fix or clear the phone number first.',

  step6Heading: 'Review before submitting',
  reviewEdit: 'Edit',
  reviewCategory: 'Category',
  reviewOtherCategory: 'Other type',
  reviewLocation: 'Location',
  reviewCoordinates: 'Map pin',
  reviewAddress: 'Address',
  reviewDescription: 'Details',
  reviewReported: 'Prior report',
  reviewReportedYes: 'Yes, reported',
  reviewReportedNo: 'Not yet',
  reviewAgency: 'Agency',
  reviewAgencyRef: 'Reference number',
  reviewAgencyDate: 'Date reported',
  reviewName: 'Name',
  reviewPhone: 'Phone',
  reviewConsent: 'Consent',
  reviewConsentYes: 'Given',
  reviewEmpty: '—',
  submitAduan: 'Submit complaint',
  submitting: 'Submitting…',
  honeypotLabel: 'Do not fill this field',
  turnstileRequired: 'Please complete the security check first.',
  submitError:
    'Could not submit the complaint. Please try again. Your answers are still saved.',
  submitErrorNetwork:
    'Network error. Please check your connection and try again.',

  successHeading: 'Complaint submitted',
  successTicketLabel: 'Your ticket number',
  successSaveHint:
    'Please save or screenshot this number. You will need it to check status.',
  successPrivateHint:
    'This ticket number is private. Do not share it publicly.',
  successSemakLink: 'Check complaint status',
  successHomeLink: 'Back to map',
};

export const strings: Record<Lang, StringTable> = {
  ms,
  en,
  zh: {},
  ta: {},
};

export function t(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const table = strings[lang];
  const raw =
    (table && table[key]) ||
    strings.en[key] ||
    key;
  if (!vars) return raw;
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{${k}}`, String(v)),
    raw,
  );
}
