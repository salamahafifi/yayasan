import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { IssueCategory } from '../types/database';
import type { PhotoAttachment } from '../lib/photos';

export type LocationSource = 'pin' | 'geocoded' | null;

export type VoiceNote = {
  blob: Blob;
  mime: string;
  durationMs: number;
  /** Object URL for playback, revoked here when the note is replaced. */
  url: string;
};

export type AduanFormData = {
  category: IssueCategory | null;
  otherCategoryLabel: string;
  description: string;
  /** When true, typed description may be blank if a voice note is attached. */
  preferVoiceNote: boolean;
  voiceNote: VoiceNote | null;
  photos: PhotoAttachment[];
  /** Explicit opt-out: proceed with no photos attached. */
  noPhotos: boolean;
  latitude: number | null;
  longitude: number | null;
  addressText: string;
  locationSource: LocationSource;
  hasReportedBefore: boolean | null;
  name: string;
  contact_number: string;
  agency: string;
  agency_ref: string;
  agency_reported_at: string;
  consentGiven: boolean;
};

const EMPTY_FORM: AduanFormData = {
  category: null,
  otherCategoryLabel: '',
  description: '',
  preferVoiceNote: false,
  voiceNote: null,
  photos: [],
  noPhotos: false,
  latitude: null,
  longitude: null,
  addressText: '',
  locationSource: null,
  hasReportedBefore: null,
  name: '',
  contact_number: '',
  agency: '',
  agency_ref: '',
  agency_reported_at: '',
  consentGiven: false,
};

type AduanFormContextValue = {
  data: AduanFormData;
  update: (patch: Partial<AduanFormData>) => void;
  reset: () => void;
  lastTicketNumber: string | null;
  setLastTicketNumber: (ticket: string | null) => void;
};

const AduanFormContext = createContext<AduanFormContextValue | null>(null);

export function AduanFormProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AduanFormData>(EMPTY_FORM);
  const [lastTicketNumber, setLastTicketNumber] = useState<string | null>(null);

  // Attachments outlive the step that made them, so object URLs are released
  // here when they are actually dropped, not when the step unmounts.
  function update(patch: Partial<AduanFormData>) {
    setData((prev) => {
      if ('voiceNote' in patch && prev.voiceNote && prev.voiceNote !== patch.voiceNote) {
        URL.revokeObjectURL(prev.voiceNote.url);
      }
      if ('photos' in patch && patch.photos) {
        const nextIds = new Set(patch.photos.map((photo) => photo.id));
        for (const photo of prev.photos) {
          if (!nextIds.has(photo.id)) URL.revokeObjectURL(photo.url);
        }
      }
      return { ...prev, ...patch };
    });
  }

  function reset() {
    setData((prev) => {
      if (prev.voiceNote) URL.revokeObjectURL(prev.voiceNote.url);
      for (const photo of prev.photos) URL.revokeObjectURL(photo.url);
      return EMPTY_FORM;
    });
  }

  return (
    <AduanFormContext.Provider
      value={{ data, update, reset, lastTicketNumber, setLastTicketNumber }}
    >
      {children}
    </AduanFormContext.Provider>
  );
}

export function useAduanForm(): AduanFormContextValue {
  const ctx = useContext(AduanFormContext);
  if (!ctx) {
    throw new Error('useAduanForm must be used within AduanFormProvider');
  }
  return ctx;
}
