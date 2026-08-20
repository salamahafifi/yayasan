import { useEffect, useRef } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import type { GeoJSON as LeafletGeoJSON, PathOptions } from 'leaflet';
import { kempasBoundary } from '../data/dun-kempas-boundary';
import { perlingBoundary } from '../data/dun-perling-boundary';
import { pulaiBoundary } from '../data/parlimen-pulai-boundary';

/** DUN Kempas (N.47) — primary blue */
export const KEMPAS_BOUNDARY_COLOR = '#202070';
/** DUN Perling (N.46) — pink accent */
export const PERLING_BOUNDARY_COLOR = '#e0006e';
/** Parlimen Pulai (P.161) — gold outer outline */
export const PULAI_BOUNDARY_COLOR = '#c9a227';

/** @deprecated Use KEMPAS_BOUNDARY_COLOR */
export const BOUNDARY_COLOR = KEMPAS_BOUNDARY_COLOR;

const BOUNDARIES_PANE = 'boundaries';

type BoundaryLayerProps = {
  data: FeatureCollection;
  color: string;
  weightBoost?: number;
  dashArray?: string;
};

function boundaryWeight(zoom: number, boost = 0): number {
  return Math.min(12, Math.max(4, zoom - 7 + boost));
}

function boundaryStyle(
  zoom: number,
  color: string,
  options: { weightBoost?: number; dashArray?: string } = {},
): PathOptions {
  return {
    color,
    weight: boundaryWeight(zoom, options.weightBoost ?? 0),
    opacity: 1,
    fillOpacity: 0,
    fillColor: color,
    dashArray: options.dashArray,
    lineCap: 'round',
    lineJoin: 'round',
    interactive: false,
  };
}

function ensureBoundariesPane(map: ReturnType<typeof useMap>) {
  // Must exist before any GeoJSON mounts with pane="boundaries".
  let pane = map.getPane(BOUNDARIES_PANE);
  if (!pane) {
    pane = map.createPane(BOUNDARIES_PANE);
    pane.style.zIndex = '450';
    pane.style.pointerEvents = 'none';
  }
  return pane;
}

function BoundaryLayer({ data, color, weightBoost = 0, dashArray }: BoundaryLayerProps) {
  const map = useMap();
  const layerRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    const apply = () => {
      layerRef.current?.setStyle(
        boundaryStyle(map.getZoom(), color, { weightBoost, dashArray }),
      );
    };
    apply();
    map.on('zoom zoomend', apply);
    return () => {
      map.off('zoom zoomend', apply);
    };
  }, [map, color, weightBoost, dashArray]);

  return (
    <GeoJSON
      ref={layerRef}
      data={data}
      pane={BOUNDARIES_PANE}
      pathOptions={boundaryStyle(map.getZoom(), color, { weightBoost, dashArray })}
    />
  );
}

function BoundaryOverlay() {
  const map = useMap();
  ensureBoundariesPane(map);

  return (
    <>
      <BoundaryLayer
        data={pulaiBoundary}
        color={PULAI_BOUNDARY_COLOR}
        weightBoost={1}
        dashArray="10 6"
      />
      <BoundaryLayer data={kempasBoundary} color={KEMPAS_BOUNDARY_COLOR} weightBoost={1} />
      <BoundaryLayer data={perlingBoundary} color={PERLING_BOUNDARY_COLOR} weightBoost={1} />
    </>
  );
}

export default BoundaryOverlay;
