import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const query = `
[out:json][timeout:60];
area["ISO3166-1"="SE"][admin_level=2];
(
  node["leisure"="bathing_place"](area);
  node["leisure"="beach"](area);
  way["leisure"="bathing_place"](area);
  way["leisure"="beach"](area);
);
out center;
`;

console.log('Hämtar badplatser från OpenStreetMap...');

const res = await fetch('https://overpass.kumi.systems/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'HundApp/1.0'
  },
  body: 'data=' + encodeURIComponent(query)
});

const json = await res.json();
const elements = json.elements;

console.log(`Hittade ${elements.length} platser.`);

const existing = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/lib/data/dogBeaches.json'), 'utf-8')
);

const existingIds = new Set(existing.map(b => b.id));
let nextId = Math.max(...existing.map(b => b.id)) + 1;

const imported = [];

for (const el of elements) {
  const tags = el.tags ?? {};
  const name = tags.name;
  if (!name) continue;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) continue;

  const dogTag = tags['dog'] ?? tags['dogs'] ?? tags['dog_swimming'];
  const dogAllowed = dogTag === 'yes' || dogTag === 'designated'
    ? true
    : dogTag === 'no' || dogTag === 'leashed'
    ? false
    : true; // default: tillåtet om okänt

  const city = tags['addr:city'] ?? tags['addr:municipality'] ?? tags['operator'] ?? '';

  imported.push({
    id: nextId++,
    name: name.trim(),
    city: city.trim(),
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lng * 100000) / 100000,
    dogAllowed,
    parking: tags.parking === 'yes' || tags['parking'] ? true : undefined,
    kiosk: tags.amenity === 'cafe' || tags.kiosk === 'yes' ? true : undefined,
    notes: tags.description ?? undefined
  });
}

const merged = [...existing, ...imported];

fs.writeFileSync(
  path.join(__dirname, '../src/lib/data/dogBeaches.json'),
  JSON.stringify(merged, null, 2)
);

console.log(`✅ Lade till ${imported.length} nya badplatser. Totalt: ${merged.length}`);
