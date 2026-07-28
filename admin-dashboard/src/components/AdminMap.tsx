import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import BoundaryOverlay from './BoundaryOverlay';

const MAP_CENTER: [number, number] = [1.528, 103.705];
const MAP_ZOOM = 14;
const MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [1.485, 103.66],
  [1.57, 103.75],
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

function AdminMap() {
  return (
    <div className="admin-map">
      <h2 className="admin-map__title">Peta sempadan kawasan</h2>
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
        </MapContainer>
      </div>
    </div>
  );
}

export default AdminMap;
