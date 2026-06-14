#!/usr/bin/env node
/**
 * One-off: persist repaired Unsplash URLs into apartments.images JSONB.
 * API normalize fixes reads; this fixes stored data + clears stale feed cache keys.
 *
 * Usage (from backend/):
 *   node scripts/repair-apartment-images.js
 *   node scripts/repair-apartment-images.js --dry-run
 */
require('dotenv').config();
const { sequelize, initPostgres } = require('../src/config/database');
const { Apartment } = require('../src/models');
const { normalizeApartmentImages } = require('../src/utils/apartmentImages');

const DRY_RUN = process.argv.includes('--dry-run');

function imagesChanged(before, after) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

async function main() {
  await initPostgres();

  const apartments = await Apartment.findAll({ attributes: ['id', 'title', 'images'] });
  let updated = 0;
  let imagesRepaired = 0;

  for (const apt of apartments) {
    const before = apt.images || [];
    const after = normalizeApartmentImages(before);

    const repairCount = before.filter((entry, idx) => {
      const b = typeof entry === 'string' ? entry : entry?.url;
      const a = after[idx]?.url;
      return b && a && b !== a;
    }).length;

    if (!imagesChanged(before, after)) continue;

    imagesRepaired += repairCount || 1;
    updated += 1;

    if (DRY_RUN) {
      console.log(`[dry-run] ${apt.id} — ${apt.title} (${repairCount || 1} url(s))`);
      continue;
    }

    apt.images = after;
    await apt.save({ fields: ['images'] });
    console.log(`✓ ${apt.id} — ${apt.title}`);
  }

  if (!DRY_RUN && updated > 0) {
    console.log('ℹ Feed cache (feed:v2:*) expires in ~5 min — or restart backend to force refresh');
  }

  console.log(
    DRY_RUN
      ? `Dry run: ${updated} listing(s) would update (~${imagesRepaired} image URL(s))`
      : `Done: ${updated} listing(s) updated (~${imagesRepaired} image URL(s))`
  );

  await sequelize.close();
}

main().catch((err) => {
  console.error('Repair failed:', err.message);
  process.exit(1);
});
