import { useEffect, useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import type { GeoJSON as LeafletGeoJSON, PathOptions } from 'leaflet';
import { kempasBoundary } from '../data/dun-kempas-boundary';
import { perlingBoundary } from '../data/dun-perling-boundary';

/** DUN Kempas (N.47) — matches public site --color-primary-blue */
export const KEMPAS_BOUNDARY_COLOR = '#202070';
/** DUN Perling (N.46) — accent so the two DUN outlines stay distinct */
export const PERLING_BOUNDARY_COLOR = '#e0006e';

/** @deprecated Use KEMPAS_BOUNDARY_COLOR */
export const BOUNDARY_COLOR = KEMPAS_BOUNDARY_COLOR;

type BoundaryLayerProps = {
  data: FeatureCollection;
  color: string;
};

function boundaryWeight(zoom: number): number {
  return Math.min(10, Math.max(5, zoom - 7));
}

function boundaryStyle(zoom: number, color: string): PathOptions {
  return {
    color,
    weight: boundaryWeight(zoom),
    opacity: 1,
    fill: false,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

function BoundaryLayer({ data, color }: BoundaryLayerProps) {
  const map = useMap();
  const layerRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    const updateStyle = () => {
      layerRef.current?.setStyle(boundaryStyle(map.getZoom(), color));
    };

    updateStyle();
    map.on('zoom zoomend', updateStyle);

    return () => {
      map.off('zoom zoomend', updateStyle);
    };
  }, [map, color]);

  return (
    <GeoJSON
      ref={layerRef}
      data={data}
      pathOptions={boundaryStyle(map.getZoom(), color)}
    />
  );
}

function BoundaryOverlay() {
  return (
    <>
      <BoundaryLayer data={kempasBoundary} color={KEMPAS_BOUNDARY_COLOR} />
      <BoundaryLayer data={perlingBoundary} color={PERLING_BOUNDARY_COLOR} />
    </>
  );
}

export default BoundaryOverlay;
