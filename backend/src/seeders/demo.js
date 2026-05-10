/**
 * Demo seed — creates landlord accounts + Israeli apartment listings for admin1 (22+ varied listings).
 * Run: node src/seeders/demo.js
 * Safe to run multiple times (skips existing emails / duplicate titles per landlord).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initPostgres } = require('../config/database');
const { User, Apartment } = require('../models');
const { buildAdmin1Apartments, SEED_COUNT } = require('./testApartmentData');

function resolveDemoPassword() {
  if (process.env.DEMO_SEED_PASSWORD) return process.env.DEMO_SEED_PASSWORD;
  return 'Demo1234!';
}

const DEMO_PASSWORD = resolveDemoPassword();
const DEMO_SEED_ENABLED_VALUE = 'true';

const ADMIN_ACCOUNTS = [
  { email: 'admin1@dirapp.com', firstName: 'Admin', lastName: 'One', password: 'Admin1234!', role: 'landlord' },
  { email: 'admin@dirapp.com', firstName: 'Admin', lastName: 'Main', password: 'Admin1234!', role: 'landlord' },
  { email: 'admin2@dirapp.com', firstName: 'Admin', lastName: 'Two', password: 'Admin1234!', role: 'tenant' },
];

const LANDLORDS = [
  { email: 'demo.landlord1@dirapp.test', firstName: 'יוסי', lastName: 'כהן' },
  { email: 'demo.landlord2@dirapp.test', firstName: 'רחל', lastName: 'לוי' },
];

const TENANT = {
  email: 'demo.tenant@dirapp.test',
  firstName: 'דנה',
  lastName: 'מזרחי',
};

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

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

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

  const admin1 = await User.findOne({ where: { email: 'admin1@dirapp.com' } });
  if (!admin1) {
    console.error('Missing admin1@dirapp.com — cannot attach test apartments.');
    process.exit(1);
  }

  const listings = buildAdmin1Apartments();
  let created = 0;
  for (const apt of listings) {
    const [, wasCreated] = await Apartment.findOrCreate({
      where: { title: apt.title, landlordId: admin1.id },
      defaults: { ...apt, landlordId: admin1.id },
    });
    if (wasCreated) created += 1;
  }

  console.log(`\n🏠 ${created} apartments created for admin1 (${SEED_COUNT - created} titles already existed)`);
  console.log('\n📋 Admin accounts (password: Admin1234!):');
  ADMIN_ACCOUNTS.forEach((a) => {
    const label = a.role === 'landlord' ? 'Landlord' : 'Tenant ';
    console.log(`  ${label}: ${a.email}`);
  });
  console.log('\n📌 Test data: ~22 listings with images are under admin1@dirapp.com; admin@dirapp.com has none (for extra CRUD tests).');
  console.log('\n📋 Demo accounts (password:', DEMO_PASSWORD + '):');
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
    if (!shouldAutoSeedOnStartup()) {
      console.log('Auto-seed disabled in production. Set DEMO_SEED_ENABLED=true to enable demo data.');
      return;
    }

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
    const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
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
    const admin1 = await User.findOne({ where: { email: 'admin1@dirapp.com' } });
    if (admin1) {
      for (const apt of buildAdmin1Apartments()) {
        await Apartment.findOrCreate({
          where: { title: apt.title, landlordId: admin1.id },
          defaults: { ...apt, landlordId: admin1.id },
        });
      }
    }
    console.log('Initial seed complete. admin1@dirapp.com / Admin1234! (22 listings); admin@dirapp.com for empty-landlord tests.');
  } catch (err) {
    console.warn('Auto-seed skipped:', err.message);
  }
}

function shouldAutoSeedOnStartup(env = process.env) {
  if (env.DEMO_SEED_ENABLED === DEMO_SEED_ENABLED_VALUE) return true;
  if (env.NODE_ENV === 'production' || env.RENDER === 'true') return false;
  return true;
}

module.exports = { autoSeed, shouldAutoSeedOnStartup };

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
