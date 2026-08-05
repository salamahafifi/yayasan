import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { publicTicketPhotoUrl, supabase } from '../lib/supabase';
import { formatDateOrDash, groupMappableTickets, isMappable, type TicketGroup } from '../lib/format';
import {
  formatCategoryLabel,
  formatComplainants,
  formatStatusLabel,
  t,
  type Lang,
} from '../i18n';
import { categoryColor, token } from '../lib/tokens';
import TicketLookup from '../components/TicketLookup';
import PhotoGallery from '../components/PhotoGallery';
import type { AppOutletContext } from '../components/AppLayout';
import { PUBLIC_TICKET_COLUMNS, type IssueCategory, type PublicTicket } from '../types/database';

// Viewport locked to P.161 Pulai (N46 Perling + N47 Kempas) — no pan outside.
const MAP_CENTER: [number, number] = [1.508, 103.702];
const MAP_ZOOM = 13;
const MAP_BOUNDS: [[number, number], [number, number]] = [
  [1.47, 103.655],
  [1.545, 103.745],
];
const MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [1.45, 103.63],
  [1.565, 103.76],
];

const LEGEND_CATEGORIES: IssueCategory[] = [
  'jalan_berlubang',
  'lampu_jalan',
  'semak',
  'sampah',
  'longkang_tersumbat',
  'gangguan_haiwan',
  'lain_lain',
];

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

function markerRadius(complainantCount: number): number {
  if (complainantCount <= 1) return 8;
  return Math.min(8 + complainantCount * 2, 18);
}

function TicketPopup({ group, lang }: { group: TicketGroup; lang: Lang }) {
  return (
    <div className="ticket-popup">
      <p>
        <strong>{t(lang, 'typeOfComplaint')}:</strong> {formatCategoryLabel(group.category, lang)}
      </p>
      {group.agency && (
        <p>
          <strong>{t(lang, 'agencyLabel')}:</strong> {group.agency}
        </p>
      )}
      <p>
        <strong>{t(lang, 'firstDate')}:</strong> {formatDateOrDash(group.firstReportedAt)}
      </p>
      <p>
        <strong>{t(lang, 'daysOutstanding')}:</strong>{' '}
        {group.daysOutstanding == null ? '—' : group.daysOutstanding}
      </p>
      <p>
        <strong>{t(lang, 'status')}:</strong> {formatStatusLabel(group.status, lang)}
      </p>
      <p>
        <strong>{t(lang, 'complainants')}:</strong>{' '}
        {formatComplainants(group.complainantCount, lang)}
      </p>
      {group.photos.length > 0 && (
        <PhotoGallery photos={group.photos} label={t(lang, 'photosShared')} lang={lang} />
      )}
    </div>
  );
}

export default function MapPage() {
  const { lang } = useOutletContext<AppOutletContext>();
  const [tickets, setTickets] = useState<PublicTicket[]>([]);
  const [photosByRootId, setPhotosByRootId] = useState<Map<number, string[]>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  const groups = useMemo(
    () => groupMappableTickets(tickets.filter(isMappable), photosByRootId),
    [tickets, photosByRootId],
  );
  const awaitingLocationCount = useMemo(
    () => tickets.filter((ticket) => ticket.needs_location).length,
    [tickets],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      const { data, error: fetchError } = await supabase
        .from('public_tickets')
        .select(PUBLIC_TICKET_COLUMNS);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setTickets([]);
        setPhotosByRootId(new Map());
        setLoading(false);
        return;
      }

      const rows = ((data ?? []) as PublicTicket[]).filter(
        (row) => (row.category as string) !== 'bantuan_kebajikan',
      );
      setError(null);
      setTickets(rows);

      const ids = rows.map((r) => r.id);
      if (ids.length === 0) {
        setPhotosByRootId(new Map());
        setLoading(false);
        return;
      }

      const { data: photoRows } = await supabase
        .from('public_ticket_photos')
        .select('ticket_id, root_ticket_id, public_path')
        .in('root_ticket_id', ids);

      if (cancelled) return;

      const map = new Map<number, string[]>();
      for (const row of photoRows ?? []) {
        const rootId = row.root_ticket_id as number;
        const url = publicTicketPhotoUrl(row.public_path as string);
        const list = map.get(rootId) ?? [];
        if (!list.includes(url)) list.push(url);
        map.set(rootId, list);
      }
      setPhotosByRootId(map);
      setLoading(false);
    }

    void loadTickets();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-main">
      <div className="map-wrapper">
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          bounds={MAP_BOUNDS}
          minZoom={12}
          maxBounds={MAP_MAX_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
        >
          <MapResizeHandler />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {groups.map((group) => (
            <CircleMarker
              key={group.key}
              center={[group.latitude, group.longitude]}
              radius={markerRadius(group.complainantCount)}
              pathOptions={{
                color: token('--color-marker-stroke'),
                fillColor: categoryColor(group.category),
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <TicketPopup group={group} lang={lang} />
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {panelOpen ? (
        <div className="map-overlay">
          <TicketLookup lang={lang} onMinimize={() => setPanelOpen(false)} />
          {loading && <p className="map-overlay__status">{t(lang, 'loading')}</p>}
          {error && <p className="map-overlay__error">{error}</p>}
          {!loading && !error && (
            <>
              <p className="map-overlay__status">
                {t(lang, 'locationsShown', { count: groups.length })}
              </p>
              {awaitingLocationCount > 0 && (
                <p className="map-overlay__status">
                  {t(lang, 'awaitingLocation', { count: awaitingLocationCount })}
                </p>
              )}
            </>
          )}
          <p className="map-legend__title">{t(lang, 'legendTitle')}</p>
          <ul className="map-legend">
            {LEGEND_CATEGORIES.map((category) => (
              <li key={category}>
                <span
                  className="map-legend__swatch"
                  style={{ backgroundColor: categoryColor(category) }}
                />
                {formatCategoryLabel(category, lang)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          className="map-overlay-reopen"
          onClick={() => setPanelOpen(true)}
          aria-label={t(lang, 'showPanel')}
          aria-expanded={false}
          title={t(lang, 'showPanel')}
        >
          +
        </button>
      )}
    </main>
  );
}
