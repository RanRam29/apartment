/**
 * Demo seed — creates landlord accounts + realistic Israeli apartment listings.
 * Run: node src/seeders/demo.js
 * Safe to run multiple times (skips existing emails).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initPostgres } = require('../config/database');
const { User, Apartment } = require('../models');

const ADMIN_ACCOUNTS = [
  { email: 'admin1@dirapp.com', firstName: 'Admin', lastName: 'One', password: 'Admin1234!', role: 'landlord' },
  { email: 'admin2@dirapp.com', firstName: 'Admin', lastName: 'Two', password: 'Admin1234!', role: 'tenant' },
];

const LANDLORDS = [
  { email: 'demo.landlord1@dirapp.test', firstName: 'יוסי', lastName: 'כהן', password: 'Demo1234!' },
  { email: 'demo.landlord2@dirapp.test', firstName: 'רחל', lastName: 'לוי', password: 'Demo1234!' },
];

const TENANT = {
  email: 'demo.tenant@dirapp.test',
  firstName: 'דנה',
  lastName: 'מזרחי',
  password: 'Demo1234!',
};

const APARTMENTS = [
  {
    title: 'דירת 3 חדרות מרוהטת בלב תל אביב',
    description: 'דירה מעוצבת ומרוהטת ברמה גבוהה בשכונת פלורנטין. קרובה לתחבורה ציבורית, מסעדות וברים. קומה 4 עם מעלית.',
    price: 7500, rooms: 3, floor: 4, totalFloors: 6, sizeSqm: 72,
    city: 'תל אביב', neighborhood: 'פלורנטין',
    amenities: ['ac', 'elevator', 'balcony', 'furnished'], petsAllowed: false,
    landlordIndex: 0,
  },
  {
    title: 'סטודיו מודרני ביפו העתיקה',
    description: 'סטודיו חדש עם תקרות גבוהות וחלונות גדולים בלב יפו העתיקה. מרפסת עם נוף לים.',
    price: 4800, rooms: 1, floor: 2, totalFloors: 3, sizeSqm: 38,
    city: 'תל אביב', neighborhood: 'יפו',
    amenities: ['ac', 'balcony'], petsAllowed: true,
    landlordIndex: 0,
  },
  {
    title: '4 חדרות שקטה בצפון תל אביב',
    description: 'דירה מרווחת ומאירה בשכונת רמת אביב. קרובה לאוניברסיטה, פארקים ומרכז מסחרי.',
    price: 10500, rooms: 4, floor: 3, totalFloors: 8, sizeSqm: 105,
    city: 'תל אביב', neighborhood: 'רמת אביב',
    amenities: ['parking', 'elevator', 'ac', 'storage', 'balcony'], petsAllowed: false,
    landlordIndex: 1,
  },
  {
    title: 'דירת 2 חדרות בירושלים — הר חומה',
    description: 'דירה חדשה עם גישה נוחה לירושלים ולצירים מרכזיים. חניה פרטית כולל.',
    price: 5200, rooms: 2, floor: 1, totalFloors: 5, sizeSqm: 60,
    city: 'ירושלים', neighborhood: 'הר חומה',
    amenities: ['parking', 'ac', 'sun_boiler'], petsAllowed: false,
    landlordIndex: 1,
  },
  {
    title: 'דירת גן 3.5 חדרות ברחובות',
    description: 'דירת גן עם חצר פרטית של 40 מ"ר. מתאימה למשפחות עם ילדים וחיות מחמד.',
    price: 5800, rooms: 3.5, floor: 0, totalFloors: 3, sizeSqm: 85,
    city: 'רחובות', neighborhood: 'נווה ים',
    amenities: ['parking', 'storage'], petsAllowed: true,
    landlordIndex: 0,
  },
  {
    title: 'פנטהאוז 5 חדרות עם נוף לים — הרצליה',
    description: 'דירת יוקרה בפנטהאוז עם טרסה ענקית ונוף פנורמי לים התיכון. חניה כפולה ומחסן.',
    price: 18000, rooms: 5, floor: 12, totalFloors: 12, sizeSqm: 180,
    city: 'הרצליה', neighborhood: 'הרצליה פיתוח',
    amenities: ['parking', 'elevator', 'ac', 'balcony', 'storage', 'furnished'], petsAllowed: false,
    landlordIndex: 1,
  },
  {
    title: 'דירת 2 חדרות חדשה בבאר שבע — הנגב',
    description: 'דירה חדשה בבניין יוקרה ליד אוניברסיטת בן גוריון. מתאימה לסטודנטים וזוגות.',
    price: 3400, rooms: 2, floor: 5, totalFloors: 10, sizeSqm: 55,
    city: 'באר שבע', neighborhood: 'גילה',
    amenities: ['elevator', 'ac'], petsAllowed: true,
    landlordIndex: 0,
  },
  {
    title: '3 חדרות מרווחת בחיפה — הכרמל',
    description: 'דירה מוארת בשכונת הדר הכרמל עם נוף עצום לנמל ולים. קרובה לתחנות מטרונית.',
    price: 4200, rooms: 3, floor: 6, totalFloors: 9, sizeSqm: 78,
    city: 'חיפה', neighborhood: 'הכרמל',
    amenities: ['balcony', 'ac', 'elevator'], petsAllowed: false,
    landlordIndex: 1,
  },
  {
    title: 'דירת 1.5 חדרות בנתניה קרוב לים',
    description: 'דירה קסומה 200 מטר מהחוף. מושלמת לזוג או יחיד. מרפסת עם רוח ים.',
    price: 4600, rooms: 1.5, floor: 3, totalFloors: 5, sizeSqm: 45,
    city: 'נתניה', neighborhood: 'העיר הלבנה',
    amenities: ['ac', 'balcony'], petsAllowed: true,
    landlordIndex: 0,
  },
  {
    title: '4 חדרות עם חניה בפתח תקווה',
    description: 'דירה גדולה ומרווחת עם חניה מקורה ומחסן. שכונה שקטה קרוב לכל השירותים.',
    price: 6200, rooms: 4, floor: 2, totalFloors: 6, sizeSqm: 95,
    city: 'פתח תקווה', neighborhood: 'כפר גנים',
    amenities: ['parking', 'storage', 'ac', 'sun_boiler'], petsAllowed: false,
    landlordIndex: 1,
  },
  {
    title: 'סטודיו עיצובי בגבעתיים',
    description: 'סטודיו בוטיק בשכונת הכרם עם עיצוב תעשייתי. תקרות גבוהות, חלונות ענקיים, פינת עבודה.',
    price: 5000, rooms: 1, floor: 1, totalFloors: 4, sizeSqm: 40,
    city: 'גבעתיים', neighborhood: 'הכרם',
    amenities: ['ac', 'furnished'], petsAllowed: false,
    landlordIndex: 0,
  },
  {
    title: '3.5 חדרות ברמת גן — מרכז',
    description: 'דירה מטופחת ואוורירית ליד בורסת היהלומים. 5 דקות הליכה לתחנת הרכבת.',
    price: 7200, rooms: 3.5, floor: 7, totalFloors: 15, sizeSqm: 82,
    city: 'רמת גן', neighborhood: 'בורסה',
    amenities: ['elevator', 'parking', 'ac', 'balcony'], petsAllowed: true,
    landlordIndex: 1,
  },
];

async function seed() {
  await initPostgres();
  console.log('✅ Connected to PostgreSQL');

  // Create admin accounts (always, idempotent)
  for (const a of ADMIN_ACCOUNTS) {
    const adminHash = await bcrypt.hash(a.password, 12);
    const [, created] = await User.findOrCreate({
      where: { email: a.email },
      defaults: { email: a.email, passwordHash: adminHash, firstName: a.firstName, lastName: a.lastName, role: a.role, isVerified: true },
    });
    console.log(`${created ? '➕' : '⏩'} Admin: ${a.email}`);
  }

  const hash = await bcrypt.hash('Demo1234!', 12);

  // Create landlords
  const landlordIds = [];
  for (const l of LANDLORDS) {
    const [user, created] = await User.findOrCreate({
      where: { email: l.email },
      defaults: { email: l.email, passwordHash: hash, firstName: l.firstName, lastName: l.lastName, role: 'landlord', isVerified: true },
    });
    landlordIds.push(user.id);
    console.log(`${created ? '➕' : '⏩'} Landlord: ${l.email}`);
  }

  // Create demo tenant
  const [, tenantCreated] = await User.findOrCreate({
    where: { email: TENANT.email },
    defaults: { email: TENANT.email, passwordHash: hash, firstName: TENANT.firstName, lastName: TENANT.lastName, role: 'tenant' },
  });
  console.log(`${tenantCreated ? '➕' : '⏩'} Tenant: ${TENANT.email}`);

  // Create apartments
  let created = 0;
  for (const apt of APARTMENTS) {
    const { landlordIndex, ...fields } = apt;
    const [, wasCreated] = await Apartment.findOrCreate({
      where: { title: fields.title, landlordId: landlordIds[landlordIndex] },
      defaults: { ...fields, landlordId: landlordIds[landlordIndex], isActive: true, images: [] },
    });
    if (wasCreated) created++;
  }

  console.log(`\n🏠 ${created} apartments created (${APARTMENTS.length - created} already existed)`);
  console.log('\n📋 Admin accounts (password: Admin1234!):');
  ADMIN_ACCOUNTS.forEach((a) => console.log(`  ${a.role === 'landlord' ? 'Landlord' : 'Tenant '}: ${a.email}`));
  console.log('\n📋 Demo accounts (password: Demo1234!):');
  console.log('  Landlord 1:', LANDLORDS[0].email);
  console.log('  Landlord 2:', LANDLORDS[1].email);
  console.log('  Tenant:    ', TENANT.email);
  process.exit(0);
}

/**
 * Auto-seed: called at server startup. Always ensures admin accounts exist,
 * and seeds demo data only on a fresh (empty) database.
 */
async function autoSeed(queryInterface) {
  try {
    // Always ensure admin accounts exist (upsert regardless of DB state)
    const adminHash = await bcrypt.hash('Admin1234!', 12);
    for (const a of ADMIN_ACCOUNTS) {
      await User.findOrCreate({
        where: { email: a.email },
        defaults: { email: a.email, passwordHash: adminHash, firstName: a.firstName, lastName: a.lastName, role: a.role, isVerified: true },
      });
    }

    const count = await User.count();
    if (count > ADMIN_ACCOUNTS.length) return;
    console.log('Empty database detected — running initial seed…');
    const demoHash = await bcrypt.hash('Demo1234!', 12);
    const landlordIds = [];
    for (const l of LANDLORDS) {
      const [user] = await User.findOrCreate({
        where: { email: l.email },
        defaults: { email: l.email, passwordHash: demoHash, firstName: l.firstName, lastName: l.lastName, role: 'landlord', isVerified: true },
      });
      landlordIds.push(user.id);
    }
    await User.findOrCreate({
      where: { email: TENANT.email },
      defaults: { email: TENANT.email, passwordHash: demoHash, firstName: TENANT.firstName, lastName: TENANT.lastName, role: 'tenant' },
    });
    for (const apt of APARTMENTS) {
      const { landlordIndex, ...fields } = apt;
      await Apartment.findOrCreate({
        where: { title: fields.title, landlordId: landlordIds[landlordIndex] },
        defaults: { ...fields, landlordId: landlordIds[landlordIndex], isActive: true, images: [] },
      });
    }
    console.log('Initial seed complete. admin1@dirapp.com / Admin1234!');
  } catch (err) {
    console.warn('Auto-seed skipped:', err.message);
  }
}

module.exports = { autoSeed };

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
