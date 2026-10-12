import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { AppOutletContext } from '../components/AppLayout';
import { LOST_FOOD_MAP_PINS, LOST_FOOD_STOPS, type LostFoodStop } from '../data/lostFoodStops';
import { LOST_FOOD_ROUTE, LOST_FOOD_ROUTE_KM, LOST_FOOD_ROUTE_MINUTES } from '../data/lostFoodRoute';
import { t } from '../i18n';

function pinIcon(stop: LostFoodStop, active: boolean) {
  const variant = stop.kind === 'hq' ? 'hq' : 'pickup';
  const label = stop.kind === 'hq' ? 'HQ' : String(stop.id);
  return L.divIcon({
    className: `lost-food-pin lost-food-pin--${variant}${active ? ' lost-food-pin--active' : ''}`,
    html: `<span>${label}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function FitStops({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  }, [map, positions]);

  return null;
}

function FlyToStop({ stop }: { stop: LostFoodStop | null }) {
  const map = useMap();

  useEffect(() => {
    if (!stop) return;
    map.flyTo([stop.lat, stop.lng], 15, { duration: 0.85 });
  }, [map, stop]);

  return null;
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

export default function LostFoodMapPage() {
  const { lang } = useOutletContext<AppOutletContext>();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const activeStop = useMemo(
    () => LOST_FOOD_STOPS.find((stop) => stop.id === activeId) ?? null,
    [activeId],
  );

  const pinPositions = useMemo(
    () => LOST_FOOD_MAP_PINS.map((stop) => [stop.lat, stop.lng] as [number, number]),
    [],
  );

  const partnerCount = LOST_FOOD_MAP_PINS.filter((stop) => stop.kind === 'pickup').length;

  return (
    <main className="app-main lost-food-page">
      <div className="map-wrapper">
        <MapContainer
          center={[1.52, 103.76]}
          zoom={11}
          minZoom={9}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
        >
          <MapResizeHandler />
          <FitStops positions={pinPositions} />
          <FlyToStop stop={activeStop} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Polyline
            positions={LOST_FOOD_ROUTE}
            pathOptions={{
              color: '#1f7a4d',
              weight: 3.5,
              opacity: 0.95,
              dashArray: '8 10',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          {LOST_FOOD_MAP_PINS.map((stop) => {
            const highlighted = activeId === stop.id || (stop.kind === 'hq' && (activeId === 1 || activeId === 13));
            return (
              <Marker
                key={stop.id}
                position={[stop.lat, stop.lng]}
                icon={pinIcon(stop, highlighted)}
                eventHandlers={{
                  click: () => setActiveId(stop.id),
                }}
                zIndexOffset={highlighted ? 1000 : stop.kind === 'hq' ? 500 : 0}
              >
                <Popup>
                  <div className="lost-food-popup">
                    <p className="lost-food-popup__name">{stop.name}</p>
                    <p className="lost-food-popup__address">{stop.address}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {panelOpen ? (
        <aside className="lost-food-panel" aria-label={t(lang, 'lostFoodTitle')}>
          <div className="lost-food-panel__toolbar">
            <button
              type="button"
              className="map-overlay__toggle"
              onClick={() => setPanelOpen(false)}
              aria-label={t(lang, 'hidePanel')}
              title={t(lang, 'hidePanel')}
            >
              −
            </button>
          </div>
          <p className="lost-food-panel__eyebrow">{t(lang, 'lostFoodEyebrow')}</p>
          <h1 className="lost-food-panel__title">{t(lang, 'lostFoodTitle')}</h1>
          <p className="lost-food-panel__intro">{t(lang, 'lostFoodIntro')}</p>
          <ul className="lost-food-stats">
            <li>
              <strong>{partnerCount}</strong>
              <span>{t(lang, 'lostFoodPartners')}</span>
            </li>
            <li>
              <strong>{LOST_FOOD_ROUTE_KM} km</strong>
              <span>{t(lang, 'lostFoodCircuit')}</span>
            </li>
            <li>
              <strong>~{LOST_FOOD_ROUTE_MINUTES} min</strong>
              <span>{t(lang, 'lostFoodDrive')}</span>
            </li>
          </ul>
          <p className="lost-food-legend">
            <span className="lost-food-legend__line" aria-hidden="true" />
            {t(lang, 'lostFoodLegend')}
          </p>
          <ol className="lost-food-stops">
            {LOST_FOOD_STOPS.map((stop) => (
              <li key={stop.id}>
                <button
                  type="button"
                  className={`lost-food-stop${activeId === stop.id ? ' lost-food-stop--active' : ''}${stop.kind === 'hq' ? ' lost-food-stop--hq' : ''}`}
                  onClick={() => setActiveId(stop.id)}
                >
                  <span className="lost-food-stop__num">{stop.kind === 'hq' ? 'HQ' : stop.id}</span>
                  <span className="lost-food-stop__text">
                    <span className="lost-food-stop__name">{stop.name}</span>
                    <span className="lost-food-stop__address">{stop.address}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
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
