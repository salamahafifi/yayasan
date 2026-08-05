import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import type { LeafletEvent, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAduanForm } from '../../context/AduanFormContext';
import { ensureLeafletDefaultIcon } from '../../lib/leafletIcon';
import { useStepHeadingFocus } from '../../lib/useStepHeadingFocus';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { suggestionToAddress, type PhotonSuggestion } from '../../lib/photon';
import { t, type Lang } from '../../i18n';

ensureLeafletDefaultIcon();

const KEMPAS_CENTER: [number, number] = [1.522, 103.715];
const PULAI_MAX_BOUNDS: [[number, number], [number, number]] = [
  [1.45, 103.63],
  [1.565, 103.76],
];

function MapInvalidate() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 50);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

/** MapContainer only reads `center` on mount, so picking a suggestion after
 *  the map is already open needs an explicit move. */
function RecenterOnChange({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [map, lat, lng]);
  return null;
}

function DraggableMarker({
  position,
  onMove,
}: {
  position: [number, number];
  onMove: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);

  return (
    <Marker
      draggable
      position={position}
      ref={markerRef}
      eventHandlers={{
        dragend(e: LeafletEvent) {
          const marker = e.target as LeafletMarker;
          const { lat, lng } = marker.getLatLng();
          onMove(lat, lng);
        },
      }}
    />
  );
}

type StepLocationProps = {
  lang: Lang;
  errorId?: string;
  hasError?: boolean;
};

export default function StepLocation({ lang, errorId, hasError }: StepLocationProps) {
  const { data, update } = useAduanForm();
  const headingRef = useStepHeadingFocus<HTMLHeadingElement>(2);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const hasCoords = data.latitude != null && data.longitude != null;
  const pinPosition: [number, number] = hasCoords
    ? [data.latitude!, data.longitude!]
    : KEMPAS_CENTER;

  const geoErrorId = 'location-geo-error';

  function requestMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(t(lang, 'locationUnsupported'));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        update({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          locationSource: 'pin',
        });
      },
      () => {
        setGeoLoading(false);
        setGeoError(t(lang, 'locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  function pickOnMap() {
    setGeoError(null);
    update({
      latitude: KEMPAS_CENTER[0],
      longitude: KEMPAS_CENTER[1],
      locationSource: 'pin',
    });
  }

  function onMarkerMove(lat: number, lng: number) {
    update({ latitude: lat, longitude: lng, locationSource: 'pin' });
  }

  function onSuggestionSelect(suggestion: PhotonSuggestion) {
    setGeoError(null);
    update({
      latitude: suggestion.lat,
      longitude: suggestion.lon,
      addressText: suggestionToAddress(suggestion),
      locationSource: 'geocoded',
    });
  }

  const describedBy = [
    hasError && errorId ? errorId : null,
    geoError ? geoErrorId : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="aduan-step__content">
      <h2 ref={headingRef} tabIndex={-1} className="aduan-step__heading">
        {t(lang, 'step2Heading')}
      </h2>

      <div className="location-options" aria-describedby={describedBy}>
        <button
          type="button"
          className="location-option"
          onClick={() => {
            if (geoLoading) return;
            requestMyLocation();
          }}
          aria-disabled={geoLoading || undefined}
          aria-describedby={geoError ? geoErrorId : undefined}
          onKeyDown={(e) => {
            if (geoLoading && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
          }}
        >
          {geoLoading ? t(lang, 'gettingLocation') : t(lang, 'useMyLocation')}
        </button>

        <p id={geoErrorId} className="field__error" aria-live="polite">
          {geoError ?? ''}
        </p>

        <AddressAutocomplete
          lang={lang}
          value={data.addressText}
          onValueChange={(addressText) => update({ addressText })}
          onSelect={onSuggestionSelect}
          describedBy={hasError && errorId ? errorId : undefined}
        />

        {!hasCoords && (
          <button type="button" className="location-option" onClick={pickOnMap}>
            {t(lang, 'pickOnMap')}
          </button>
        )}
      </div>

      {hasCoords && (
        <div className="location-map location-map--editor">
          <p className="location-map__hint">{t(lang, 'dragMarkerHint')}</p>
          <MapContainer
            center={pinPosition}
            zoom={16}
            minZoom={12}
            maxBounds={PULAI_MAX_BOUNDS}
            maxBoundsViscosity={1}
            style={{ height: '100%', width: '100%' }}
          >
            <MapInvalidate />
            <RecenterOnChange lat={pinPosition[0]} lng={pinPosition[1]} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />
            <DraggableMarker position={pinPosition} onMove={onMarkerMove} />
          </MapContainer>
        </div>
      )}
    </div>
  );
}
