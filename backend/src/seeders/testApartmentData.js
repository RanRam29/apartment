/**
 * Data for admin1 test apartment bulk seed — 22+ varied listings (cities, prices, images).
 * Images use deterministic Picsum seeds (no upload); clients read .url like Cloudinary objects.
 */

const SEED_COUNT = 22;

const CITIES = [
  { city: 'תל אביב', hoods: ['פלורנטין', 'רמת אביב', 'נווה צדק', 'הצפון הישן'] },
  { city: 'ירושלים', hoods: ['הר נוף', 'בקעה', 'קטמון', 'מאה שערים'] },
  { city: 'חיפה', hoods: ['הכרמל', 'אחוזה', 'דניה'] },
  { city: 'באר שבע', hoods: ['רמב"ם', 'נווה זאב', 'אלוף בן גוריון'] },
  { city: 'הרצליה', hoods: ['הרצליה פיתוח', 'שבעת הכוכבים'] },
  { city: 'רמת גן', hoods: ['בורסה', 'קרית בורוכוב', 'תל בנימין'] },
  { city: 'גבעתיים', hoods: ['הכרם', 'שכונת בורלא'] },
  { city: 'פתח תקווה', hoods: ['כפר גנים', 'עמישב', 'סגולה'] },
  { city: 'נתניה', hoods: ['העיר הלבנה', 'נווה עמל', 'רמת פולג'] },
  { city: 'ראשון לציון', hoods: ['המושבה', 'נווה דקלים', 'הרצל'] },
  { city: 'אשדוד', hoods: ['י"א', 'רובע י"ב', 'הרצל'] },
  { city: 'רחובות', hoods: ['נווה ים', 'רמות', 'נווה רחל'] },
  { city: 'כפר סבא', hoods: ['רעננה לצמוד', 'תל יצחק', 'החשמונאים'] },
  { city: 'הוד השרון', hoods: ['רחוב הברוש', 'לכיש', 'רחוב הדקל'] },
  { city: 'אילת', hoods: ['רובע א', 'המלכים', 'התיירות'] },
  { city: 'נצרת', hoods: ['העיר העתיקה', 'הר יונה', 'נוף הגליל'] },
  { city: 'עכו', hoods: ['העיר העתיקה', 'וולפסון', 'הנמל'] },
  { city: 'קריית אתא', hoods: ['הנשיא', 'אלמוג', 'הרב קוק'] },
  { city: 'אשקלון', hoods: ['הנמל', 'רמות', 'אפרידר'] },
  { city: 'רעננה', hoods: ['רח\' ויצמן', 'הרצל', 'לכיש'] },
  { city: 'רמלה', hoods: ['המוסכים', 'רמות', 'מערב'] },
  { city: 'לוד', hoods: ['רמלה-לוד', 'הנשיא', 'השבעה'] },
];

const AMENITY_POOL = ['parking', 'balcony', 'elevator', 'ac', 'storage', 'furnished', 'sun_boiler'];

function pick(i, mod) {
  return i % mod;
}

function pickAmenities(i) {
  const n = 2 + pick(i, 4);
  const out = new Set();
  let j = 0;
  while (out.size < n && j < 20) {
    out.add(AMENITY_POOL[(i + j * 3) % AMENITY_POOL.length]);
    j += 1;
  }
  return [...out];
}

function makeImages(aptIndex) {
  const k = 2 + (aptIndex % 3);
  const images = [];
  for (let s = 0; s < k; s += 1) {
    const seed = `dirapp-admin1-apt${aptIndex}-img${s}`;
    images.push({
      url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`,
      publicId: `seed-${seed}`,
      width: 800,
      height: 600,
    });
  }
  return images;
}

/**
 * @returns {Array<object>} apartment field objects (no landlordId) for Apartment.create / findOrCreate defaults
 */
function buildAdmin1Apartments() {
  const out = [];
  for (let i = 0; i < SEED_COUNT; i += 1) {
    const n = i + 1;
    const { city, hoods } = CITIES[i % CITIES.length];
    const neighborhood = hoods[pick(i, hoods.length)];

    const rooms = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5][i % 9];
    const base = 2200 + (i * 631) % 13000;
    const price = Math.max(1500, Math.round(base / 100) * 100);

    const floor = 1 + pick(i, 12);
    const totalFloors = Math.max(floor + pick(i, 5), floor + 1);
    const sizeSqm = Math.round(rooms * 22 + (i % 7) * 5);

    const title = `דירת בדיקות #${String(n).padStart(2, '0')} — ${city}`;

    const petNote = pick(i, 3) === 0 ? 'מותרות חיות מחמד בכפוף לפרט.' : 'ללא חיות מחמד.';
    const description = [
      `דירה להדגמה ובדיקות — ${neighborhood}, ${city}.`,
      `חדרים: ${rooms}, קומה ${floor} מתוך ${totalFloors}, כ-${sizeSqm} מ״ר.`,
      pick(i, 2) === 0 ? 'מתאימה לזוגות ומשפחות קטנות.' : 'מיקום נוח לתחבורה ושירותים.',
      petNote,
    ].join(' ');

    out.push({
      title,
      description,
      price,
      rooms,
      floor,
      totalFloors,
      sizeSqm,
      city,
      neighborhood,
      address: `רחוב הדגמה ${10 + (i % 90)}`,
      latitude: 31.5 + (i % 50) * 0.01,
      longitude: 34.8 + (i % 40) * 0.01,
      amenities: pickAmenities(i),
      availableFrom: null,
      minLeasePeriod: pick(i, 2) === 0 ? 12 : 6,
      petsAllowed: pick(i, 3) === 0,
      isActive: true,
      images: makeImages(n),
    });
  }
  return out;
}

module.exports = {
  SEED_COUNT,
  buildAdmin1Apartments,
};
