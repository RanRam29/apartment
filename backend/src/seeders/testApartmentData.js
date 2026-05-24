/**
 * Demo apartment data — 22 realistic Israeli rental listings for admin1.
 * Images use curated Unsplash apartment/interior photos.
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

// Curated Unsplash apartment/interior photos — stable IDs, no auth required
const PHOTO_POOL = [
  '1502672023488-203a3bb6e526', // bright living room
  '1555041469-db819a8be170',   // modern sofa living room
  '1484154218962-a197022b5858', // open kitchen
  '1560448204-e02f11c3d0e2',   // airy bedroom
  '1522708323590-d24dbb6b0267', // kitchen dining
  '1493809842364-78817add7ffb', // cozy living room
  '1600585154340-be6161a56a0c', // modern apartment exterior
  '1580587771525-78b9dba3b914', // villa / house
  '1512917774080-9991f1c4c750', // house facade
  '1570129477492-45c003edd2be', // apartment building
  '1558618666-fcd25c85cd64',   // balcony view city
  '1574362848149-11496d93a7c7', // minimalist bedroom
];

const TITLE_TEMPLATES = [
  (rooms, city, hood) => `דירת ${rooms} חדרים מרווחת ב${hood}, ${city}`,
  (rooms, city, hood) => `דירה יפה ומוארת — ${rooms} חד׳ ב${city}`,
  (rooms, city, hood) => `${rooms} חדרים בלב ${hood} — ${city}`,
  (rooms, city, hood) => `דירה משופצת ${rooms} חדרים, ${city} — ${hood}`,
  (rooms, city, hood) => `להשכרה: ${rooms} חד׳ + מרפסת ב${city}`,
  (rooms, city, hood) => `דירה חדשה ב${hood} — ${rooms} חדרים, ${city}`,
];

const DESC_EXTRAS = [
  'הדירה ממוקמת בבניין מטופח עם לובי.',
  'נוף פתוח ושקט — מתאים לזוג או לגר יחיד.',
  'קרוב לתחבורה ציבורית, מרכזי קניות ובתי קפה.',
  'חניה פרטית מובטחת בחוזה השכירות.',
  'בניין עם ממ"ד ומחסן בקומת קרקע.',
  'שכונה שקטה ובטוחה, מתאים למשפחות.',
  'אחרי שיפוץ מלא — מטבח ואמבטיה חדשים.',
  'גג משותף עם נוף לים / לעיר.',
];

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
    const photoId = PHOTO_POOL[(aptIndex + s) % PHOTO_POOL.length];
    images.push({
      url: `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=800&h=600&q=80`,
      publicId: `unsplash-${photoId}`,
      width: 800,
      height: 600,
    });
  }
  return images;
}

function buildAdmin1Apartments() {
  const out = [];
  for (let i = 0; i < SEED_COUNT; i += 1) {
    const { city, hoods } = CITIES[i % CITIES.length];
    const hood = hoods[pick(i, hoods.length)];

    const rooms = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5][i % 9];
    const base = 2200 + (i * 631) % 13000;
    const price = Math.max(1500, Math.round(base / 100) * 100);

    const floor = 1 + pick(i, 12);
    const totalFloors = Math.max(floor + pick(i, 5), floor + 1);
    const sizeSqm = Math.round(rooms * 22 + (i % 7) * 5);

    const titleFn = TITLE_TEMPLATES[i % TITLE_TEMPLATES.length];
    const title = titleFn(rooms, city, hood);

    const petNote = pick(i, 3) === 0 ? 'מותרות חיות מחמד בכפוף לאישור.' : 'ללא חיות מחמד.';
    const extra = DESC_EXTRAS[i % DESC_EXTRAS.length];
    const description = [
      `דירה ב${hood}, ${city} — ${rooms} חדרים, קומה ${floor} מתוך ${totalFloors}, כ-${sizeSqm} מ"ר.`,
      extra,
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
      street: hood,
      address: `רחוב ${hood} ${10 + (i % 90)}`,
      latitude: 31.5 + (i % 50) * 0.01,
      longitude: 34.8 + (i % 40) * 0.01,
      amenities: pickAmenities(i),
      availableFrom: null,
      minLeasePeriod: pick(i, 2) === 0 ? 12 : 6,
      petsAllowed: pick(i, 3) === 0,
      isActive: true,
      images: makeImages(i),
    });
  }
  return out;
}

module.exports = {
  SEED_COUNT,
  buildAdmin1Apartments,
};
