import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, formatDate } from '../lib/format';
import { normalizeTicketPhotoPath } from '../lib/photos';
import {
  STAFF_TICKET_COLUMNS,
  VIEWER_TICKET_COLUMNS,
  daysOutstandingFromAgencyReport,
  type CaseNote,
  type IssueCategory,
  type PriorityLevel,
  type SafeTicket,
  type StaffDirectoryEntry,
  type StaffProfile,
  type Ticket,
  type TicketPhoto,
  type TicketStatus,
  type WhatsAppMessage,
} from '../types/database';

const STATUS_OPTIONS: TicketStatus[] = ['baru', 'siasat', 'majlis_perbandaran', 'selesai', 'tangguh'];
const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS) as IssueCategory[];
const PRIORITY_OPTIONS = Object.keys(PRIORITY_LABELS) as PriorityLevel[];
const FALLBACK_CENTER: [number, number] = [1.5146529, 103.6854368];

type CaseDrawerProps = {
  ticketId: number;
  profile: StaffProfile;
  onClose: () => void;
  onChanged: () => void;
};

type AdminDraft = {
  name: string;
  contact_number: string;
  description: string;
  category: IssueCategory;
  adun_priority: PriorityLevel;
  agency: string;
  agency_ref: string;
  agency_reported_at: string;
  address_text: string;
  is_public: boolean;
};

function PinPicker({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function draftFromTicket(ticket: Ticket): AdminDraft {
  return {
    name: ticket.name ?? '',
    contact_number: ticket.contact_number ?? '',
    description: ticket.description ?? '',
    category: ticket.category,
    adun_priority: ticket.adun_priority,
    agency: ticket.agency ?? '',
    agency_ref: ticket.agency_ref ?? '',
    agency_reported_at: ticket.agency_reported_at ?? '',
    address_text: ticket.address_text ?? '',
    is_public: ticket.is_public,
  };
}

function CaseDrawer({ ticketId, profile, onClose, onChanged }: CaseDrawerProps) {
  const canEdit = profile.role === 'staff' || profile.role === 'admin';
  const canAdmin = profile.role === 'admin';
  const [ticket, setTicket] = useState<Ticket | SafeTicket | null>(null);
  const [directory, setDirectory] = useState<StaffDirectoryEntry[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [photos, setPhotos] = useState<TicketPhoto[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [noteBody, setNoteBody] = useState('');
  const [pendingPin, setPendingPin] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusyId, setPhotoBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminDraft | null>(null);

  const loadPhotoUrls = useCallback(async (rows: TicketPhoto[]) => {
    const signed = await Promise.all(
      rows.map(async (photo) => {
        const storagePath = normalizeTicketPhotoPath(photo.storage_path);
        const { data, error: signError } = await supabase.storage
          .from('ticket-photos')
          .createSignedUrl(storagePath, 60);

        if (!signError && data?.signedUrl) {
          return { ...photo, storage_path: storagePath, signed_url: data.signedUrl };
        }

        // Approved copies can still preview from the public bucket if the
        // private object path is stale or unreadable.
        if (photo.public_path) {
          const { data: pub } = supabase.storage
            .from('ticket-photos-public')
            .getPublicUrl(photo.public_path);
          return { ...photo, storage_path: storagePath, signed_url: pub.publicUrl };
        }

        return { ...photo, storage_path: storagePath, signed_url: undefined };
      }),
    );
    setPhotos(signed);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPhotoHint(null);
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
    if (canAdmin && 'description' in loadedTicket) {
      setDraft(draftFromTicket(loadedTicket as Ticket));
    }

    const { data: staffRows } = await supabase
      .from('active_staff_directory')
      .select('user_id, name, role')
      .order('name');
    setDirectory((staffRows ?? []) as StaffDirectoryEntry[]);

    if (canEdit) {
      const fullTicket = loadedTicket as Ticket;
      const rootId = fullTicket.parent_ticket_id ?? fullTicket.id;

      // Photos may sit on a linked child report while the table shows the parent.
      const { data: familyRows, error: familyError } = await supabase
        .from('tickets')
        .select('id, photo_url')
        .or(`id.eq.${rootId},parent_ticket_id.eq.${rootId}`);

      if (familyError) {
        setError(familyError.message);
      }

      const family = (familyRows ?? [{ id: fullTicket.id, photo_url: fullTicket.photo_url }]) as {
        id: number;
        photo_url: string | null;
      }[];
      const familyIds = family.map((row) => row.id);

      const [noteResult, photoResult, messageResult] = await Promise.all([
        supabase
          .from('case_notes_with_author')
          .select('id, ticket_id, author_id, author_name, body, created_at')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: false }),
        supabase
          .from('ticket_photos')
          .select('id, ticket_id, storage_path, public_path, is_public, sort_order, created_at')
          .in('ticket_id', familyIds)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        fullTicket.contact_number
          ? supabase
            .from('whatsapp_messages')
            .select('id, direction, body, media_type, created_at')
            .eq('whatsapp_number', fullTicket.contact_number)
            .order('created_at')
          : Promise.resolve({ data: [] as WhatsAppMessage[], error: null }),
      ]);

      if (noteResult.error || photoResult.error || messageResult.error) {
        setError(
          noteResult.error?.message
            ?? photoResult.error?.message
            ?? messageResult.error?.message
            ?? null,
        );
      }

      let photoRows = (photoResult.data ?? []) as TicketPhoto[];

      // Legacy tickets.photo_url with no ticket_photos row — still previewable.
      if (photoRows.length === 0) {
        const legacy: TicketPhoto[] = [];
        for (const row of family) {
          if (!row.photo_url) continue;
          const path = normalizeTicketPhotoPath(row.photo_url);
          if (!path) continue;
          legacy.push({
            id: -row.id,
            ticket_id: row.id,
            storage_path: path,
            public_path: null,
            is_public: false,
            sort_order: 0,
            created_at: fullTicket.created_at,
          });
        }
        photoRows = legacy;
        if (legacy.length > 0) {
          setPhotoHint('Showing legacy photo_url. Publish will register it in ticket_photos.');
        }
      }

      if (photoRows.length === 0) {
        setPhotoHint(
          'No rows in ticket_photos for this case family. Web uploads need the submit-web-complaint function deployed; WhatsApp photos need a successful media save.',
        );
      }

      setNotes((noteResult.data ?? []) as CaseNote[]);
      await loadPhotoUrls(photoRows);
      setMessages((messageResult.data ?? []) as WhatsAppMessage[]);
    }
    setLoading(false);
  }, [canAdmin, canEdit, loadPhotoUrls, ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    if (!canEdit) return;
    const timer = window.setInterval(() => {
      if (photosRef.current.length === 0) return;
      void loadPhotoUrls(photosRef.current);
    }, 50_000);
    return () => window.clearInterval(timer);
  }, [canEdit, loadPhotoUrls]);

  async function updateTicket(
    patch: Partial<
      Pick<
        Ticket,
        | 'status'
        | 'assigned_to'
        | 'name'
        | 'contact_number'
        | 'description'
        | 'category'
        | 'adun_priority'
        | 'agency'
        | 'agency_ref'
        | 'agency_reported_at'
        | 'address_text'
        | 'is_public'
      >
    >,
  ) {
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

  async function saveAdminEdits(event: FormEvent) {
    event.preventDefault();
    if (!canAdmin || !ticket || !draft || !('description' in ticket)) return;
    setSaving(true);
    setError(null);
    const patch = {
      name: draft.name.trim() || null,
      contact_number: draft.contact_number.trim() || null,
      description: draft.description.trim() || null,
      category: draft.category,
      adun_priority: draft.adun_priority,
      agency: draft.agency.trim() || null,
      agency_ref: draft.agency_ref.trim() || null,
      agency_reported_at: draft.agency_reported_at || null,
      address_text: draft.address_text.trim() || null,
      is_public: draft.is_public,
    };
    const { error: updateError } = await supabase.from('tickets').update(patch).eq('id', ticket.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTicket({ ...ticket, ...patch });
    onChanged();
  }

  async function deleteCase() {
    if (!canAdmin || !ticket) return;
    const ok = window.confirm(
      `Padam kes ${ticket.ticket_number}? Ini tidak boleh dibuat asal semula.`,
    );
    if (!ok) return;
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase.from('tickets').delete().eq('id', ticket.id);
    setSaving(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onChanged();
    onClose();
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
    if (!canEdit || !ticket || photoBusyId != null) return;
    if (publish === photo.is_public && photo.id > 0) return;

    setPhotoBusyId(photo.id);
    setError(null);

    let working = photo;

    // Legacy photo_url rows use a negative id until registered in ticket_photos.
    if (working.id < 0 && publish) {
      const path = normalizeTicketPhotoPath(working.storage_path);
      const { data: inserted, error: insertError } = await supabase
        .from('ticket_photos')
        .insert({
          ticket_id: working.ticket_id,
          storage_path: path,
          sort_order: 0,
        })
        .select('id, ticket_id, storage_path, public_path, is_public, sort_order, created_at')
        .single();
      if (insertError || !inserted) {
        setError(insertError?.message ?? 'Unable to register legacy photo.');
        setPhotoBusyId(null);
        return;
      }
      working = inserted as TicketPhoto;
    }

    if (publish) {
      const fileName = working.storage_path.split('/').pop() ?? `${working.id}.jpg`;
      const publicPath = `${working.ticket_id}/${working.id}-${fileName}`;
      const { data: signed, error: signError } = await supabase.storage
        .from('ticket-photos')
        .createSignedUrl(normalizeTicketPhotoPath(working.storage_path), 60);
      if (signError) {
        setError(signError.message);
        setPhotoBusyId(null);
        return;
      }

      const response = await fetch(signed.signedUrl);
      if (!response.ok) {
        setError('Unable to read the private photo.');
        setPhotoBusyId(null);
        return;
      }

      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('ticket-photos-public')
        .upload(publicPath, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
      if (uploadError) {
        setError(uploadError.message);
        setPhotoBusyId(null);
        return;
      }

      const { error: rowError } = await supabase
        .from('ticket_photos')
        .update({ public_path: publicPath, is_public: true })
        .eq('id', working.id);
      if (rowError) {
        await supabase.storage.from('ticket-photos-public').remove([publicPath]);
        setError(rowError.message);
        setPhotoBusyId(null);
        return;
      }
    } else if (working.id > 0) {
      if (working.public_path) {
        const { error: removeError } = await supabase.storage
          .from('ticket-photos-public')
          .remove([working.public_path]);
        if (removeError) {
          setError(removeError.message);
          setPhotoBusyId(null);
          return;
        }
      }
      const { error: rowError } = await supabase
        .from('ticket_photos')
        .update({ public_path: null, is_public: false })
        .eq('id', working.id);
      if (rowError) {
        setError(rowError.message);
        setPhotoBusyId(null);
        return;
      }
    }

    await load();
    setPhotoBusyId(null);
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
            <section className="case-section case-controls">
              <h3>Status &amp; assignment</h3>
              <p className="case-controls__hint">
                Update status when the case moves (baru → siasat → majlis → selesai), or mark tangguh if paused.
              </p>
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
                <h3>Resident photos</h3>
                <p className="case-help">
                  Choose which photos appear on the public map. Unpublished photos stay staff-only.
                  Photos from linked reports in this case are included.
                </p>
                {photoHint && <p className="case-help">{photoHint}</p>}
                <div className="case-photos">
                  {photos.map((photo) => {
                    const busy = photoBusyId === photo.id;
                    return (
                      <figure
                        key={`${photo.ticket_id}-${photo.id}`}
                        className={`case-photo${photo.is_public ? ' case-photo--published' : ''}`}
                      >
                        {photo.signed_url
                          ? <img src={photo.signed_url} alt={`Ticket photo ${photo.id}`} />
                          : <div className="case-photo-error">Preview unavailable</div>}
                        <div className="case-photo__meta">
                          <span
                            className={`case-photo__badge case-photo__badge--${photo.is_public ? 'public' : 'private'}`}
                          >
                            {photo.is_public ? 'On public map' : 'Staff only'}
                          </span>
                          <div className="case-photo__actions">
                            {photo.is_public ? (
                              <button
                                type="button"
                                className="btn btn--secondary"
                                disabled={photoBusyId != null}
                                onClick={() => void togglePhoto(photo, false)}
                              >
                                {busy ? 'Updating…' : 'Unpublish'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn--primary"
                                disabled={photoBusyId != null}
                                onClick={() => void togglePhoto(photo, true)}
                              >
                                {busy ? 'Publishing…' : 'Publish on map'}
                              </button>
                            )}
                          </div>
                        </div>
                      </figure>
                    );
                  })}
                  {photos.length === 0 && <p className="status-text">No photos attached.</p>}
                </div>
              </section>
            )}

            {canAdmin && draft && (
              <section className="case-section">
                <h3>Edit case</h3>
                <p className="case-help">Admin only. Changes save to the live ticket record.</p>
                <form className="case-edit-form" onSubmit={(event) => void saveAdminEdits(event)}>
                  <label>
                    Name
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      value={draft.contact_number}
                      onChange={(event) => setDraft({ ...draft, contact_number: event.target.value })}
                    />
                  </label>
                  <label className="case-edit-form__full">
                    Description
                    <textarea
                      rows={4}
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        setDraft({ ...draft, category: event.target.value as IssueCategory })
                      }
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Priority
                    <select
                      value={draft.adun_priority}
                      onChange={(event) =>
                        setDraft({ ...draft, adun_priority: event.target.value as PriorityLevel })
                      }
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Agency
                    <input
                      value={draft.agency}
                      onChange={(event) => setDraft({ ...draft, agency: event.target.value })}
                    />
                  </label>
                  <label>
                    Agency ref
                    <input
                      value={draft.agency_ref}
                      onChange={(event) => setDraft({ ...draft, agency_ref: event.target.value })}
                    />
                  </label>
                  <label>
                    Agency date
                    <input
                      type="date"
                      value={draft.agency_reported_at}
                      onChange={(event) =>
                        setDraft({ ...draft, agency_reported_at: event.target.value })
                      }
                    />
                  </label>
                  <label className="case-edit-form__full">
                    Address
                    <input
                      value={draft.address_text}
                      onChange={(event) => setDraft({ ...draft, address_text: event.target.value })}
                    />
                  </label>
                  <label className="case-edit-form__check">
                    <input
                      type="checkbox"
                      checked={draft.is_public}
                      onChange={(event) => setDraft({ ...draft, is_public: event.target.checked })}
                    />
                    Show on public map
                  </label>
                  <div className="case-edit-form__actions">
                    <button type="submit" className="btn btn--primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      disabled={saving}
                      onClick={() => void deleteCase()}
                    >
                      Delete case
                    </button>
                  </div>
                </form>
              </section>
            )}

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
                <dt>Public map</dt><dd>{ticket.is_public ? 'Yes' : 'No'}</dd>
              </dl>
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
                        pathOptions={{ color: '#fff', fillColor: '#202070', fillOpacity: 1, weight: 2 }}
                      />
                    )}
                  </MapContainer>
                </div>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!pendingPin || saving}
                  onClick={() => void savePin()}
                >
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
                  <button className="btn btn--primary" disabled={saving || !noteBody.trim()}>
                    Add remark
                  </button>
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
