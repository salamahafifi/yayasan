export type LostFoodStopKind = 'hq' | 'pickup';

export type LostFoodStop = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  kind: LostFoodStopKind;
};

/** Partner sites in run order. Stops 1 and 13 are the same HQ. */
export const LOST_FOOD_STOPS: LostFoodStop[] = [
  {
    id: 1,
    name: 'Yayasan Suria Office (Start)',
    address: '51, Jalan Seroja 1, Taman Johor Jaya, 81100 Johor Bahru, Johor',
    lat: 1.53493,
    lng: 103.81078,
    kind: 'hq',
  },
  {
    id: 2,
    name: 'Mall of Medini',
    address: '4, Lebuh Medini Utara, 79200 Iskandar Puteri, Johor',
    lat: 1.42844,
    lng: 103.63382,
    kind: 'pickup',
  },
  {
    id: 3,
    name: 'PanKobo Japanese Bakery',
    address: '5, Jalan Hijauan 3, Horizon Hills, 79100 Iskandar Puteri, Johor',
    lat: 1.45763,
    lng: 103.64425,
    kind: 'pickup',
  },
  {
    id: 4,
    name: 'Paradigm Mall',
    address: 'Skudai Hwy, Taman Bukit Mewah, 81200 Johor Bahru, Johor',
    lat: 1.51618,
    lng: 103.68526,
    kind: 'pickup',
  },
  {
    id: 5,
    name: 'Village Grocer @ Mid Valley Southkey',
    address: '1, Persiaran Southkey 1, Southkey, 80150 Johor Bahru, Johor',
    lat: 1.50218,
    lng: 103.77617,
    kind: 'pickup',
  },
  {
    id: 6,
    name: 'Village Grocer @ SKS Mall JBCC',
    address: 'Jalan Storey, Bukit Senyum, 80300 Johor Bahru, Johor',
    lat: 1.4711,
    lng: 103.76387,
    kind: 'pickup',
  },
  {
    id: 7,
    name: 'Kenjo Bakery @ Austin Crest',
    address: '29, Jalan Jaya Putra 7/4, Bandar Jaya Putra, 81100 Johor Bahru, Johor',
    lat: 1.57766,
    lng: 103.76866,
    kind: 'pickup',
  },
  {
    id: 8,
    name: 'Shoku-ya Sushi',
    address: '18, Jalan Jaya Putra 7/2, Taman JP Perdana, 81100 Johor Bahru, Johor',
    lat: 1.57706,
    lng: 103.7683,
    kind: 'pickup',
  },
  {
    id: 9,
    name: "Nando's @ AEON Tebrau City",
    address: 'Lot S51, AEON Mall Tebrau City, 81100 Johor Bahru, Johor',
    lat: 1.54952,
    lng: 103.79578,
    kind: 'pickup',
  },
  {
    id: 10,
    name: 'KFC Kota Tinggi',
    address: '37, Jalan Mawai, 81900 Kota Tinggi, Johor',
    lat: 1.73098,
    lng: 103.90142,
    kind: 'pickup',
  },
  {
    id: 11,
    name: 'KFC Molek',
    address: 'Jalan Molek 1/29, Taman Molek, 80150 Johor Bahru, Johor',
    lat: 1.52418,
    lng: 103.78603,
    kind: 'pickup',
  },
  {
    id: 12,
    name: 'Lavender Confectionery',
    address: '5, Jalan Mutiara 7, Taman Perindustrian Plentong, 81750 Masai, Johor',
    lat: 1.52647,
    lng: 103.8169,
    kind: 'pickup',
  },
  {
    id: 13,
    name: 'Yayasan Suria Office (End)',
    address: '51, Jalan Seroja 1, Taman Johor Jaya, 81100 Johor Bahru, Johor',
    lat: 1.53493,
    lng: 103.81078,
    kind: 'hq',
  },
];

/** Unique map pins — HQ is drawn once even though it is start and end. */
export const LOST_FOOD_MAP_PINS = LOST_FOOD_STOPS.filter((stop) => stop.id !== 13);
