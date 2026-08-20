import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { STATUS_LABELS } from '../lib/format';
import {
  STAFF_TICKET_COLUMNS,
  VIEWER_TICKET_COLUMNS,
  type SafeTicket,
  type StaffRole,
  type Ticket,
  type TicketStatus,
} from '../types/database';
import BoundaryOverlay from './BoundaryOverlay';

const MAP_CENTER: [number, number] = [1.528, 103.705];
const MAP_ZOOM = 14;
const MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [1.485, 103.66],
  [1.57, 103.75],
];

const STATUS_COLORS: Record<TicketStatus, string> = {
  baru: '#2563EB',
  siasat: '#D97706',
  majlis_perbandaran: '#7C3AED',
  selesai: '#15803D',
  tangguh: '#57534E',
  arkib: '#9CA3AF',
};

type AdminMapProps = {
  role: StaffRole;
  refreshKey: number;
  onSelect: (ticketId: number) => void;
};

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timer = window.setTimeout(invalidate, 0);
    window.addEventListener('resize', invalidate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);
  return null;
}

function AdminMap({ role, refreshKey, onSelect }: AdminMapProps) {
  const [tickets, setTickets] = useState<(Ticket | SafeTicket)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canSeePii = role === 'staff' || role === 'admin';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = canSeePii
        ? await supabase.from('tickets').select(STAFF_TICKET_COLUMNS)
        : await supabase.from('staff_tickets_safe').select(VIEWER_TICKET_COLUMNS);
      if (cancelled) return;
      setError(result.error?.message ?? null);
      setTickets(result.error ? [] : ((result.data ?? []) as unknown as (Ticket | SafeTicket)[]));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [canSeePii, refreshKey]);

  const located = tickets.filter(
    (ticket): ticket is (Ticket | SafeTicket) & { latitude: number; longitude: number } =>
      ticket.latitude != null && ticket.longitude != null,
  );

  return (
    <section className="admin-map">
      <div className="admin-map__heading">
        <h2 className="admin-map__title">Peta kes</h2>
        <span>{located.length} located · {tickets.length - located.length} need location</span>
      </div>
      {error && <p className="status-text status-text--error">{error}</p>}
      <div className="admin-map__canvas">
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          minZoom={13}
          maxBounds={MAP_MAX_BOUNDS}
          maxBoundsViscosity={1}
          style={{ height: '100%', width: '100%' }}
        >
          <MapResizeHandler />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <BoundaryOverlay />
          {located.map((ticket) => (
            <CircleMarker
              key={ticket.id}
              center={[ticket.latitude, ticket.longitude]}
              radius={7}
              pathOptions={{
                color: '#FFFFFF',
                fillColor: STATUS_COLORS[ticket.status],
                fillOpacity: 0.9,
                weight: 2,
              }}
              eventHandlers={{ click: () => onSelect(ticket.id) }}
            >
              <Popup>
                <button className="admin-map__popup" type="button" onClick={() => onSelect(ticket.id)}>
                  <strong>{ticket.ticket_number}</strong>
                  <span>{STATUS_LABELS[ticket.status]}</span>
                </button>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <ul className="admin-map__legend">
        {(Object.keys(STATUS_COLORS) as TicketStatus[]).map((status) => (
          <li key={status}>
            <span style={{ background: STATUS_COLORS[status] }} />
            {STATUS_LABELS[status]}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AdminMap;
