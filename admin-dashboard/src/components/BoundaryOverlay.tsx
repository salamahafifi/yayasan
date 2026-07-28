import { useEffect, useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import type { GeoJSON as LeafletGeoJSON, PathOptions } from 'leaflet';
import { dunBoundary } from '../data/dun-boundary';

/** Matches sahkan.my --color-brand-primary */
export const BOUNDARY_COLOR = '#1B4332';

function boundaryWeight(zoom: number): number {
  return Math.min(10, Math.max(5, zoom - 7));
}

function boundaryStyle(zoom: number): PathOptions {
  return {
    color: BOUNDARY_COLOR,
    weight: boundaryWeight(zoom),
    opacity: 1,
    fill: false,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

function BoundaryOverlay() {
  const map = useMap();
  const layerRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    const updateStyle = () => {
      layerRef.current?.setStyle(boundaryStyle(map.getZoom()));
    };

    updateStyle();
    map.on('zoom zoomend', updateStyle);

    return () => {
      map.off('zoom zoomend', updateStyle);
    };
  }, [map]);

  return (
    <GeoJSON
      ref={layerRef}
      data={dunBoundary}
      pathOptions={boundaryStyle(map.getZoom())}
    />
  );
}

export default BoundaryOverlay;
