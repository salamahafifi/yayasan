import type { FeatureCollection } from 'geojson';
import { kempasBoundary } from './dun-kempas-boundary';

/** @deprecated Prefer kempasBoundary — kept for older imports. */
export const dunBoundary: FeatureCollection = kempasBoundary;
