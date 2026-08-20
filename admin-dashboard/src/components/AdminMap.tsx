import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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
import BoundaryOverlay, {
  KEMPAS_BOUNDARY_COLOR,
  PERLING_BOUNDARY_COLOR,
  PULAI_BOUNDARY_COLOR,
} from './BoundaryOverlay';

const MAP_CENTER: [number, number] = [1.50, 103.70];
const MAP_ZOOM = 12;
const MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [1.44, 103.61],
  [1.57, 103.78],
];

const MAP_HEIGHT_KEY = 'admin.mapHeight';
const MAP_HEIGHT_DEFAULT = 420;
const MAP_HEIGHT_MIN = 220;
const MAP_HEIGHT_MAX = 900;

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

function readStoredHeight(): number {
  try {
    const raw = window.localStorage.getItem(MAP_HEIGHT_KEY);
    const value = raw ? Number(raw) : MAP_HEIGHT_DEFAULT;
    if (!Number.isFinite(value)) return MAP_HEIGHT_DEFAULT;
    return Math.min(MAP_HEIGHT_MAX, Math.max(MAP_HEIGHT_MIN, value));
  } catch {
    return MAP_HEIGHT_DEFAULT;
  }
}

function MapResizeHandler({ height }: { height: number }) {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timer = window.setTimeout(invalidate, 0);
    window.addEventListener('resize', invalidate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', invalidate);
    };
  }, [map, height]);
  return null;
}

function AdminMap({ role, refreshKey, onSelect }: AdminMapProps) {
  const [tickets, setTickets] = useState<(Ticket | SafeTicket)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapHeight, setMapHeight] = useState(readStoredHeight);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
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

  useEffect(() => {
    try {
      window.localStorage.setItem(MAP_HEIGHT_KEY, String(mapHeight));
    } catch {
      // Private browsing can block localStorage; height still works for this session.
    }
  }, [mapHeight]);

  const onResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startHeight: mapHeight };

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = drag.startHeight + (moveEvent.clientY - drag.startY);
      setMapHeight(Math.min(MAP_HEIGHT_MAX, Math.max(MAP_HEIGHT_MIN, next)));
    };

    const onUp = (upEvent: PointerEvent) => {
      dragRef.current = null;
      handle.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [mapHeight]);

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
      <div className="admin-map__canvas" style={{ height: mapHeight }}>
        <MapContainer
          key="admin-pulai-map"
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          minZoom={11}
          maxBounds={MAP_MAX_BOUNDS}
          maxBoundsViscosity={1}
          style={{ height: '100%', width: '100%' }}
        >
          <MapResizeHandler height={mapHeight} />
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
                fillColor: STATUS_COLORS[ticket.status] ?? '#64748B',
                fillOpacity: 0.9,
                weight: 2,
              }}
              eventHandlers={{ click: () => onSelect(ticket.id) }}
            >
              <Popup>
                <button className="admin-map__popup" type="button" onClick={() => onSelect(ticket.id)}>
                  <strong>{ticket.ticket_number}</strong>
                  <span>{STATUS_LABELS[ticket.status] ?? ticket.status}</span>
                </button>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <button
        type="button"
        className="admin-map__resize"
        aria-label="Drag to resize map height"
        title="Drag up or down to resize"
        onPointerDown={onResizePointerDown}
      >
        <span className="admin-map__resize-grip" aria-hidden />
      </button>
      <ul className="admin-map__legend">
        <li>
          <span style={{ background: PULAI_BOUNDARY_COLOR }} />
          P.161 Pulai
        </li>
        <li>
          <span style={{ background: KEMPAS_BOUNDARY_COLOR }} />
          DUN Kempas (N.47)
        </li>
        <li>
          <span style={{ background: PERLING_BOUNDARY_COLOR }} />
          DUN Perling (N.46)
        </li>
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
