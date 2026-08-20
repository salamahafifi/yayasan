import fs from 'fs';
import path from 'path';

const dun = JSON.parse(fs.readFileSync('tmp-geo/electoral_1_dun.geojson', 'utf8'));
const parl = JSON.parse(fs.readFileSync('tmp-geo/electoral_0_parlimen.geojson', 'utf8'));

const perling = dun.features.find(
  (f) => f.properties.state === 'Johor' && f.properties.code_dun === 'N.46',
);
const kempas = dun.features.find(
  (f) => f.properties.state === 'Johor' && f.properties.code_dun === 'N.47',
);
const pulai = parl.features.find((f) => f.properties.code_parlimen === 'P.161');

if (!perling || !kempas || !pulai) throw new Error('Missing features');

function roundCoords(coords) {
  return coords.map((c) =>
    typeof c[0] === 'number'
      ? [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5]
      : roundCoords(c),
  );
}

function bbox(geom) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]);
      maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]);
      maxY = Math.max(maxY, c[1]);
      return;
    }
    c.forEach(walk);
  };
  walk(geom.coordinates);
  return { minX, minY, maxX, maxY };
}

function fc(code, name, feature) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          code,
          name,
          parlimen: feature.properties.parlimen || feature.properties.code_parlimen,
        },
        geometry: {
          type: feature.geometry.type,
          coordinates: roundCoords(feature.geometry.coordinates),
        },
      },
    ],
  };
}

function writeTs(filename, exportName, source, data) {
  const body =
    `import type { FeatureCollection } from 'geojson';\n\n` +
    `// Source: DOSM open geodata (${source})\n` +
    `export const ${exportName}: FeatureCollection = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(path.join('admin-dashboard/src/data', filename), body);
}

const outDir = 'admin-dashboard/src/data';
if (!fs.existsSync('tmp-geo/electoral_1_dun.geojson')) {
  console.error('Re-download DOSM files first');
  process.exit(1);
}

writeTs('dun-kempas-boundary.ts', 'kempasBoundary', 'electoral_1_dun.geojson', fc('N.47', 'Kempas', kempas));
writeTs('dun-perling-boundary.ts', 'perlingBoundary', 'electoral_1_dun.geojson', fc('N.46', 'Perling', perling));
writeTs('parlimen-pulai-boundary.ts', 'pulaiBoundary', 'electoral_0_parlimen.geojson', fc('P.161', 'Pulai', pulai));

console.log({
  kempas: bbox(kempas.geometry),
  perling: bbox(perling.geometry),
  pulai: bbox(pulai.geometry),
  ringPts: {
    kempas: kempas.geometry.coordinates[0][0].length,
    perling: perling.geometry.coordinates[0][0].length,
    pulai: pulai.geometry.coordinates[0][0].length,
  },
});
