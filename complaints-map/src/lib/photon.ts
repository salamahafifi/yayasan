const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

/** Johor state envelope: minLon, minLat, maxLon, maxLat. */
const JOHOR_BBOX = '102.45,1.20,104.45,2.60';

/** Kempas, so nearby results outrank equally-named places elsewhere in Johor. */
const BIAS_LAT = 1.522;
const BIAS_LON = 103.715;

export const MIN_QUERY_LENGTH = 3;
export const SEARCH_DEBOUNCE_MS = 400;

export type PhotonSuggestion = {
  id: string;
  /** Primary line: the place or street the resident recognises. */
  label: string;
  /** Secondary line: locality, so identical names can be told apart. */
  detail: string;
  lat: number;
  lon: number;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | number | undefined>;
};

function asText(value: string | number | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buildLabel(props: Record<string, string | number | undefined>): string {
  const name = asText(props.name);
  if (name) return name;
  const street = asText(props.street);
  const houseNumber = asText(props.housenumber);
  if (street) return houseNumber ? `${houseNumber} ${street}` : street;
  return asText(props.city) || asText(props.district) || asText(props.state);
}

function buildDetail(
  props: Record<string, string | number | undefined>,
  label: string,
): string {
  const parts = [
    asText(props.district),
    asText(props.city),
    asText(props.county),
    asText(props.state),
    asText(props.postcode),
  ];
  const seen = new Set<string>([label.toLowerCase()]);
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!part || seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }
  return unique.join(', ');
}

/**
 * Photon is used rather than Nominatim because Nominatim's usage policy
 * forbids autocomplete. Nominatim remains the server-side fallback for a
 * typed address the resident never picked a suggestion for.
 */
export async function searchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<PhotonSuggestion[]> {
  const url = new URL(PHOTON_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('lang', 'en');
  url.searchParams.set('limit', '5');
  url.searchParams.set('bbox', JOHOR_BBOX);
  url.searchParams.set('lat', String(BIAS_LAT));
  url.searchParams.set('lon', String(BIAS_LON));

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Photon responded ${res.status}`);

  const json: { features?: PhotonFeature[] } = await res.json();
  const features = Array.isArray(json.features) ? json.features : [];

  const results: PhotonSuggestion[] = [];
  features.forEach((feature, index) => {
    const coords = feature.geometry?.coordinates;
    const props = feature.properties ?? {};
    if (!coords || coords.length < 2) return;
    const [lon, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const label = buildLabel(props);
    if (!label) return;
    results.push({
      id: `${props.osm_type ?? 'x'}${props.osm_id ?? index}-${index}`,
      label,
      detail: buildDetail(props, label),
      lat,
      lon,
    });
  });

  return results;
}

export function suggestionToAddress(suggestion: PhotonSuggestion): string {
  return suggestion.detail
    ? `${suggestion.label}, ${suggestion.detail}`
    : suggestion.label;
}
