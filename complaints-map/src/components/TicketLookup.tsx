import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, getTicketPhotos } from '../lib/format';
import { STRINGS, formatCategoryLabel, formatComplainants, formatStatusLabel, type Lang } from '../lib/i18n';
import PhotoGallery from './PhotoGallery';
import type { PublicTicket } from '../types/database';

type LookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

type TicketLookupProps = {
  lang: Lang;
};

function TicketLookup({ lang }: TicketLookupProps) {
  const [input, setInput] = useState('');
  const [state, setState] = useState<LookupState>('idle');
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const t = STRINGS[lang];

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const ticketNumber = input.trim().toUpperCase();
    if (!ticketNumber) return;

    setState('loading');
    const { data, error } = await supabase
      .from('public_tickets')
      .select('*')
      .eq('ticket_number', ticketNumber)
      .maybeSingle();

    if (error) {
      setState('error');
      return;
    }
    if (!data) {
      setTicket(null);
      setState('not_found');
      return;
    }
    setTicket(data as PublicTicket);
    setState('found');
  }

  const photos = ticket ? getTicketPhotos(ticket) : [];

  return (
    <div className="ticket-lookup">
      <p className="ticket-lookup__title">{t.trackReport}</p>
      <form onSubmit={handleSearch} className="ticket-lookup__form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ADUN-2606-0001"
          className="ticket-lookup__input"
        />
        <button type="submit" className="ticket-lookup__button">
          {t.check}
        </button>
      </form>

      {state === 'not_found' && <p className="ticket-lookup__message">{t.notFound}</p>}
      {state === 'error' && <p className="ticket-lookup__message">{t.error}</p>}

      {state === 'found' && ticket && (
        <div className="ticket-lookup__result">
          <p>
            <strong>{t.ticket}:</strong> {ticket.ticket_number}
          </p>
          <p>
            <strong>{t.typeOfComplaint}:</strong> {formatCategoryLabel(ticket.category, lang)}
          </p>
          <p>
            <strong>{t.status}:</strong> {formatStatusLabel(ticket.status, lang)}
          </p>
          <p>
            <strong>{t.firstDate}:</strong> {formatDate(ticket.created_at)}
          </p>
          <p>
            <strong>{t.latestDate}:</strong> {formatDate(ticket.updated_at)}
          </p>
          <p>
            <strong>{t.complainants}:</strong> {formatComplainants(ticket.upvote_count, lang)}
          </p>
          {photos.length > 0 && (
            <PhotoGallery photos={photos} label={t.photosShared} lang={lang} />
          )}
        </div>
      )}
    </div>
  );
}

export default TicketLookup;
