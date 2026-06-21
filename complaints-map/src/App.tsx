import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase';
import { formatDate, groupMappableTickets, isMappable, type TicketGroup } from './lib/format';
import {
  STRINGS,
  formatCategoryLabel,
  formatComplainants,
  formatStatusLabel,
  type Lang,
} from './lib/i18n';
import TicketLookup from './components/TicketLookup';
import PhotoGallery from './components/PhotoGallery';
import type { IssueCategory, PublicTicket } from './types/database';

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

const LEGEND_CATEGORIES: IssueCategory[] = [
  'jalan_berlubang',
  'banjir',
  'lampu_jalan',
  'sampah',
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
  const t = STRINGS[lang];

  return (
    <div className="ticket-popup">
      <p>
        <strong>{t.typeOfComplaint}:</strong> {formatCategoryLabel(group.category, lang)}
      </p>
      <p>
        <strong>{t.firstDate}:</strong> {formatDate(group.firstReportedAt)}
      </p>
      <p>
        <strong>{t.latestDate}:</strong> {formatDate(group.latestReportedAt)}
      </p>
      <p>
        <strong>{t.status}:</strong> {formatStatusLabel(group.status, lang)}
      </p>
      <p>
        <strong>{t.complainants}:</strong> {formatComplainants(group.complainantCount, lang)}
      </p>
      {group.photos.length > 0 && (
        <PhotoGallery photos={group.photos} label={t.photosShared} lang={lang} />
      )}
    </div>
  );
}

function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [tickets, setTickets] = useState<PublicTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const groups = useMemo(
    () => groupMappableTickets(tickets.filter(isMappable)),
    [tickets],
  );

  const t = STRINGS[lang];

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
        setTickets((data ?? []) as PublicTicket[]);
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
        <div className="lang-toggle" role="group" aria-label="Language">
          <button
            type="button"
            className={`lang-toggle__btn${lang === 'en' ? ' lang-toggle__btn--active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-toggle__btn${lang === 'ms' ? ' lang-toggle__btn--active' : ''}`}
            onClick={() => setLang('ms')}
          >
            BM
          </button>
        </div>
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
            {groups.map((group) => (
              <CircleMarker
                key={group.key}
                center={[group.latitude, group.longitude]}
                radius={markerRadius(group.complainantCount)}
                pathOptions={{
                  color: CATEGORY_COLORS[group.category],
                  fillColor: CATEGORY_COLORS[group.category],
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

        <div className="map-overlay">
          <TicketLookup lang={lang} />
          {loading && <p className="map-overlay__status">{t.loading}</p>}
          {error && <p className="map-overlay__error">{error}</p>}
          {!loading && !error && (
            <p className="map-overlay__status">{t.locationsShown(groups.length)}</p>
          )}
          <p className="map-legend__title">{t.legendTitle}</p>
          <ul className="map-legend">
            {LEGEND_CATEGORIES.map((category) => (
              <li key={category}>
                <span
                  className="map-legend__swatch"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                />
                {formatCategoryLabel(category, lang)}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
