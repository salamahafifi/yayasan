import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { IssueCategory } from '../types/database';

export type LocationSource = 'pin' | 'geocoded' | null;

export type AduanFormData = {
  category: IssueCategory | null;
  otherCategoryLabel: string;
  description: string;
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

  function update(patch: Partial<AduanFormData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setData(EMPTY_FORM);
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
