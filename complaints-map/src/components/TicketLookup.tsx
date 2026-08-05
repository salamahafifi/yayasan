import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateOrDash } from '../lib/format';
import { formatCategoryLabel, formatStatusLabel, t, type Lang } from '../i18n';
import type { TicketStatusResult } from '../types/database';

type LookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

export type TicketLocateTarget = {
  latitude: number;
  longitude: number;
  rootTicketId: number;
  ticketNumber: string;
};

type TicketLookupProps = {
  lang: Lang;
  onMinimize?: () => void;
  /** Fired after a successful Semak search so the map can focus the pin. */
  onLocate?: (target: TicketLocateTarget | null) => void;
};

function TicketLookup({ lang, onMinimize, onLocate }: TicketLookupProps) {
  const [input, setInput] = useState('');
  const [state, setState] = useState<LookupState>('idle');
  const [result, setResult] = useState<TicketStatusResult | null>(null);
  const [queriedNumber, setQueriedNumber] = useState('');

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const ticketNumber = input.trim().toUpperCase();
    if (!ticketNumber) return;

    setState('loading');
    setQueriedNumber(ticketNumber);
    onLocate?.(null);

    const { data, error } = await supabase.rpc('get_ticket_status', {
      p_ticket_number: ticketNumber,
    });

    if (error) {
      setState('error');
      setResult(null);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setResult(null);
      setState('not_found');
      return;
    }

    const found = row as TicketStatusResult;
    setResult(found);
    setState('found');

    if (
      found.latitude != null &&
      found.longitude != null &&
      Number.isFinite(found.latitude) &&
      Number.isFinite(found.longitude)
    ) {
      onLocate?.({
        latitude: found.latitude,
        longitude: found.longitude,
        rootTicketId: found.root_ticket_id,
        ticketNumber,
      });
    } else {
      onLocate?.(null);
    }
  }

  return (
    <div className="ticket-lookup">
      <div className="ticket-lookup__header">
        <p className="ticket-lookup__title">{t(lang, 'trackReport')}</p>
        {onMinimize && (
          <button
            type="button"
            className="map-overlay__toggle"
            onClick={onMinimize}
            aria-label={t(lang, 'hidePanel')}
            aria-expanded={true}
            title={t(lang, 'hidePanel')}
          >
            −
          </button>
        )}
      </div>
      <form onSubmit={handleSearch} className="ticket-lookup__form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ADU-2607-0001"
          className="ticket-lookup__input"
        />
        <button type="submit" className="ticket-lookup__button">
          {t(lang, 'check')}
        </button>
      </form>

      {state === 'not_found' && (
        <p className="ticket-lookup__message">{t(lang, 'notFound')}</p>
      )}
      {state === 'error' && (
        <p className="ticket-lookup__message">{t(lang, 'error')}</p>
      )}

      {state === 'found' && result && (
        <div className="ticket-lookup__result">
          <p>
            <strong>{t(lang, 'ticket')}:</strong> {queriedNumber}
          </p>
          <p>
            <strong>{t(lang, 'typeOfComplaint')}:</strong>{' '}
            {formatCategoryLabel(result.category, lang)}
          </p>
          <p>
            <strong>{t(lang, 'status')}:</strong>{' '}
            {formatStatusLabel(result.status, lang)}
          </p>
          <p>
            <strong>{t(lang, 'firstDate')}:</strong>{' '}
            {formatDateOrDash(result.first_reported_at)}
          </p>
          <p>
            <strong>{t(lang, 'daysOutstanding')}:</strong>{' '}
            {result.days_outstanding == null ? '—' : result.days_outstanding}
          </p>
          {result.latitude == null || result.longitude == null ? (
            <p className="ticket-lookup__message">{t(lang, 'lookupNoMapPin')}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default TicketLookup;
