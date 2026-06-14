import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase';
import type { IssueCategory, PublicTicket, TicketStatus } from './types/database';

const MAP_CENTER: [number, number] = [1.4236, 103.6500];
const MAP_ZOOM = 15;

const CATEGORY_COLORS: Record<IssueCategory, string> = {
  jalan_berlubang: '#dc2626',
  banjir: '#2563eb',
  lampu_jalan: '#f59e0b',
  sampah: '#16a34a',
  bantuan_kebajikan: '#7c3aed',
  lain_lain: '#6b7280',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  baru: 'Baru',
  siasat: 'Siasatan',
  majlis_perbandaran: 'Majlis Perbandaran',
  selesai: 'Selesai',
  tangguh: 'Tangguh',
};

type MappableTicket = PublicTicket & { latitude: number; longitude: number };

function isMappable(ticket: PublicTicket): ticket is MappableTicket {
  return ticket.latitude != null && ticket.longitude != null;
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatComplainants(count: number): string {
  return count === 1 ? 'Reported by 1 person' : `Reported by ${count} people`;
}

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

function TicketPopup({ ticket }: { ticket: MappableTicket }) {
  return (
    <div className="ticket-popup">
      <p>
        <strong>Type of Complaint:</strong> {formatCategory(ticket.category)}
      </p>
      <p>
        <strong>First Date Complained:</strong> {formatDate(ticket.created_at)}
      </p>
      <p>
        <strong>Latest Date Complained:</strong> {formatDate(ticket.updated_at)}
      </p>
      <p>
        <strong>Status:</strong> {STATUS_LABELS[ticket.status]}
      </p>
      <p>
        <strong>Number of Complainants:</strong> {formatComplainants(ticket.upvote_count)}
      </p>
      {ticket.photo_urls.length > 0 && (
        <div className="ticket-popup__photos">
          <p className="ticket-popup__photos-label">
            <strong>Photos shared:</strong>
          </p>
          {ticket.photo_urls.map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={`Complaint photo ${index + 1}`}
              className="ticket-popup__photo"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [tickets, setTickets] = useState<MappableTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      const { data, error: fetchError } = await supabase
        .from('public_tickets')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setTickets([]);
      } else {
        setError(null);
        setTickets(((data ?? []) as PublicTicket[]).filter(isMappable));
      }

      setLoading(false);
    }

    void loadTickets();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__logo">Salamahafifi</div>
      </header>

      <main className="app-main">
        <div className="map-wrapper">
          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            style={{ height: '100%', width: '100%' }}
          >
            <MapResizeHandler />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {tickets.map((ticket) => (
              <CircleMarker
                key={ticket.id}
                center={[ticket.latitude, ticket.longitude]}
                radius={ticket.upvote_count > 1 ? 10 : 8}
                pathOptions={{
                  color: CATEGORY_COLORS[ticket.category],
                  fillColor: CATEGORY_COLORS[ticket.category],
                  fillOpacity: 0.85,
                  weight: 2,
                }}
              >
                <Popup>
                  <TicketPopup ticket={ticket} />
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="map-overlay">
          {loading && <p className="map-overlay__status">Memuatkan aduan…</p>}
          {error && <p className="map-overlay__error">{error}</p>}
          {!loading && !error && (
            <p className="map-overlay__status">{tickets.length} aduan dipaparkan</p>
          )}
          <p className="map-legend__title">Type of Complaint</p>
          <ul className="map-legend">
            {(Object.keys(CATEGORY_COLORS) as IssueCategory[]).map((category) => (
              <li key={category}>
                <span
                  className="map-legend__swatch"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                />
                {formatCategory(category)}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
