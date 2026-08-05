import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { CATEGORY_LABELS, STATUS_LABELS, formatDate } from '../lib/format';
import {
  STAFF_TICKET_COLUMNS,
  VIEWER_TICKET_COLUMNS,
  daysOutstandingFromAgencyReport,
  type CaseNote,
  type SafeTicket,
  type StaffDirectoryEntry,
  type StaffProfile,
  type Ticket,
  type TicketPhoto,
  type TicketStatus,
  type WhatsAppMessage,
} from '../types/database';

const STATUS_OPTIONS: TicketStatus[] = ['baru', 'siasat', 'majlis_perbandaran', 'selesai', 'tangguh'];
const FALLBACK_CENTER: [number, number] = [1.5146529, 103.6854368];

type CaseDrawerProps = {
  ticketId: number;
  profile: StaffProfile;
  onClose: () => void;
  onChanged: () => void;
};

function PinPicker({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function CaseDrawer({ ticketId, profile, onClose, onChanged }: CaseDrawerProps) {
  const canEdit = profile.role === 'staff' || profile.role === 'admin';
  const [ticket, setTicket] = useState<Ticket | SafeTicket | null>(null);
  const [directory, setDirectory] = useState<StaffDirectoryEntry[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [photos, setPhotos] = useState<TicketPhoto[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [noteBody, setNoteBody] = useState('');
  const [pendingPin, setPendingPin] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotoUrls = useCallback(async (rows: TicketPhoto[]) => {
    const signed = await Promise.all(
      rows.map(async (photo) => {
        const { data, error: signError } = await supabase.storage
          .from('ticket-photos')
          .createSignedUrl(photo.storage_path, 60);
        return { ...photo, signed_url: signError ? undefined : data.signedUrl };
      }),
    );
    setPhotos(signed);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ticketResult = canEdit
      ? await supabase.from('tickets').select(STAFF_TICKET_COLUMNS).eq('id', ticketId).single()
      : await supabase.from('staff_tickets_safe').select(VIEWER_TICKET_COLUMNS).eq('id', ticketId).single();

    if (ticketResult.error) {
      setError(ticketResult.error.message);
      setLoading(false);
      return;
    }

    const loadedTicket = ticketResult.data as unknown as Ticket | SafeTicket;
    setTicket(loadedTicket);
    if (loadedTicket.latitude != null && loadedTicket.longitude != null) {
      setPendingPin([loadedTicket.latitude, loadedTicket.longitude]);
    }

    const { data: staffRows } = await supabase
      .from('active_staff_directory')
      .select('user_id, name, role')
      .order('name');
    setDirectory((staffRows ?? []) as StaffDirectoryEntry[]);

    if (canEdit) {
      const fullTicket = loadedTicket as Ticket;
      const [noteResult, photoResult, messageResult] = await Promise.all([
        supabase
          .from('case_notes_with_author')
          .select('id, ticket_id, author_id, author_name, body, created_at')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: false }),
        supabase
          .from('ticket_photos')
          .select('id, ticket_id, storage_path, public_path, is_public, sort_order, created_at')
          .eq('ticket_id', ticketId)
          .order('sort_order')
          .order('created_at'),
        fullTicket.contact_number
          ? supabase
            .from('whatsapp_messages')
            .select('id, direction, body, media_type, created_at')
            .eq('whatsapp_number', fullTicket.contact_number)
            .order('created_at')
          : Promise.resolve({ data: [] as WhatsAppMessage[], error: null }),
      ]);

      if (noteResult.error || photoResult.error || messageResult.error) {
        setError(noteResult.error?.message ?? photoResult.error?.message ?? messageResult.error?.message ?? null);
      }
      setNotes((noteResult.data ?? []) as CaseNote[]);
      await loadPhotoUrls((photoResult.data ?? []) as TicketPhoto[]);
      setMessages((messageResult.data ?? []) as WhatsAppMessage[]);
    }
    setLoading(false);
  }, [canEdit, loadPhotoUrls, ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canEdit || photos.length === 0) return;
    const timer = window.setInterval(() => {
      void loadPhotoUrls(photos);
    }, 50_000);
    return () => window.clearInterval(timer);
  }, [canEdit, loadPhotoUrls, photos]);

  async function updateTicket(patch: Partial<Pick<Ticket, 'status' | 'assigned_to'>>) {
    if (!canEdit || !ticket) return;
    setSaving(true);
    const { error: updateError } = await supabase.from('tickets').update(patch).eq('id', ticket.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTicket({ ...ticket, ...patch });
    onChanged();
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    const body = noteBody.trim();
    if (!canEdit || !body) return;
    setSaving(true);
    const { error: insertError } = await supabase.from('case_notes').insert({
      ticket_id: ticketId,
      author_id: profile.user_id,
      body,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNoteBody('');
    await load();
  }

  async function togglePhoto(photo: TicketPhoto, publish: boolean) {
    if (!canEdit || !ticket) return;
    setSaving(true);
    setError(null);

    if (publish) {
      const fileName = photo.storage_path.split('/').pop() ?? `${photo.id}.jpg`;
      const publicPath = `${ticket.id}/${photo.id}-${fileName}`;
      const { data: signed, error: signError } = await supabase.storage
        .from('ticket-photos')
        .createSignedUrl(photo.storage_path, 60);
      if (signError) {
        setError(signError.message);
        setSaving(false);
        return;
      }

      const response = await fetch(signed.signedUrl);
      if (!response.ok) {
        setError('Unable to read the private photo.');
        setSaving(false);
        return;
      }

      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('ticket-photos-public')
        .upload(publicPath, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }

      const { error: rowError } = await supabase
        .from('ticket_photos')
        .update({ public_path: publicPath, is_public: true })
        .eq('id', photo.id);
      if (rowError) {
        await supabase.storage.from('ticket-photos-public').remove([publicPath]);
        setError(rowError.message);
        setSaving(false);
        return;
      }
    } else if (photo.public_path) {
      const { error: removeError } = await supabase.storage
        .from('ticket-photos-public')
        .remove([photo.public_path]);
      if (removeError) {
        setError(removeError.message);
        setSaving(false);
        return;
      }
      const { error: rowError } = await supabase
        .from('ticket_photos')
        .update({ public_path: null, is_public: false })
        .eq('id', photo.id);
      if (rowError) {
        setError(rowError.message);
        setSaving(false);
        return;
      }
    }

    await load();
    setSaving(false);
    onChanged();
  }

  async function savePin() {
    if (!canEdit || !ticket || !pendingPin) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        latitude: pendingPin[0],
        longitude: pendingPin[1],
        location_source: 'staff',
      })
      .eq('id', ticket.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
    onChanged();
  }

  const days = ticket
    ? ('days_outstanding' in ticket
      ? ticket.days_outstanding
      : daysOutstandingFromAgencyReport(ticket.agency_reported_at))
    : null;
  const mapCenter = pendingPin ?? FALLBACK_CENTER;

  return (
    <aside className="case-drawer" aria-label="Case details">
      <div className="case-drawer__header">
        <div>
          <p>Case detail</p>
          <h2>{ticket?.ticket_number ?? 'Loading…'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close case detail">×</button>
      </div>

      <div className="case-drawer__body">
        {loading && <p className="status-text">Loading…</p>}
        {error && <p className="status-text status-text--error">{error}</p>}
        {ticket && (
          <>
            <section className="case-section">
              <h3>Full case</h3>
              <dl className="case-fields">
                {canEdit && 'name' in ticket && <><dt>Name</dt><dd>{ticket.name ?? '—'}</dd></>}
                {canEdit && 'contact_number' in ticket && <><dt>Phone</dt><dd>{ticket.contact_number ?? '—'}</dd></>}
                {canEdit && 'description' in ticket && <><dt>Description</dt><dd>{ticket.description}</dd></>}
                <dt>Category</dt><dd>{CATEGORY_LABELS[ticket.category]}</dd>
                <dt>Agency</dt><dd>{ticket.agency ?? '—'}</dd>
                <dt>Agency ref</dt><dd>{ticket.agency_ref ?? '—'}</dd>
                <dt>Agency date</dt><dd>{ticket.agency_reported_at ? formatDate(ticket.agency_reported_at) : '—'}</dd>
                <dt>Address</dt><dd>{ticket.address_text ?? '—'}</dd>
                <dt>Coordinates</dt>
                <dd>{ticket.latitude == null ? 'Needs location' : `${ticket.latitude.toFixed(6)}, ${ticket.longitude?.toFixed(6)}`}</dd>
                <dt>Location source</dt><dd>{ticket.location_source ?? '—'}</dd>
                <dt>Days outstanding</dt><dd>{days ?? '—'}</dd>
              </dl>
            </section>

            <section className="case-section case-controls">
              <h3>Case management</h3>
              <label>
                Status
                <select
                  value={ticket.status}
                  disabled={!canEdit || saving}
                  onChange={(event) => void updateTicket({ status: event.target.value as TicketStatus })}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </label>
              <label>
                Assignee
                <select
                  value={ticket.assigned_to ?? ''}
                  disabled={!canEdit || saving}
                  onChange={(event) => void updateTicket({ assigned_to: event.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {directory.map((staff) => (
                    <option key={staff.user_id} value={staff.user_id}>{staff.name}</option>
                  ))}
                </select>
              </label>
            </section>

            {canEdit && (
              <section className="case-section">
                <h3>Place or confirm location</h3>
                {ticket.location_source === 'geocoded' && (
                  <p className="location-flag location-flag--verify">Geocoded location requires staff confirmation.</p>
                )}
                <p className="case-help">Click the map to place the pin, then save.</p>
                <div className="case-location-map">
                  <MapContainer key={ticket.id} center={mapCenter} zoom={16} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <PinPicker onPick={(latitude, longitude) => setPendingPin([latitude, longitude])} />
                    {pendingPin && (
                      <CircleMarker
                        center={pendingPin}
                        radius={8}
                        pathOptions={{ color: '#fff', fillColor: '#1B4332', fillOpacity: 1, weight: 2 }}
                      />
                    )}
                  </MapContainer>
                </div>
                <button type="button" disabled={!pendingPin || saving} onClick={() => void savePin()}>
                  Save staff location
                </button>
              </section>
            )}

            {canEdit && (
              <section className="case-section">
                <h3>Remarks</h3>
                <form className="case-note-form" onSubmit={addNote}>
                  <textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder="Add an append-only remark"
                    rows={3}
                  />
                  <button disabled={saving || !noteBody.trim()}>Add remark</button>
                </form>
                <div className="case-thread">
                  {notes.map((note) => (
                    <article key={note.id}>
                      <p>{note.body}</p>
                      <small>{note.author_name} · {new Date(note.created_at).toLocaleString()}</small>
                    </article>
                  ))}
                  {notes.length === 0 && <p className="status-text">No remarks yet.</p>}
                </div>
              </section>
            )}

            {canEdit && (
              <section className="case-section">
                <h3>Photos</h3>
                <div className="case-photos">
                  {photos.map((photo) => (
                    <figure key={photo.id}>
                      {photo.signed_url
                        ? <img src={photo.signed_url} alt={`Ticket photo ${photo.id}`} />
                        : <div className="case-photo-error">Preview unavailable</div>}
                      <label>
                        <input
                          type="checkbox"
                          checked={photo.is_public}
                          disabled={saving}
                          onChange={(event) => void togglePhoto(photo, event.target.checked)}
                        />
                        Published
                      </label>
                    </figure>
                  ))}
                  {photos.length === 0 && <p className="status-text">No photos.</p>}
                </div>
              </section>
            )}

            {canEdit && (
              <section className="case-section">
                <h3>WhatsApp conversation</h3>
                <div className="conversation-thread">
                  {messages.map((message) => (
                    <article key={message.id} className={`conversation-message conversation-message--${message.direction}`}>
                      <p>{message.body ?? `[${message.media_type ?? 'message'}]`}</p>
                      <small>{new Date(message.created_at).toLocaleString()}</small>
                    </article>
                  ))}
                  {messages.length === 0 && <p className="status-text">No logged messages.</p>}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

export default CaseDrawer;
