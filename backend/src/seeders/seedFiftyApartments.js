/**
 * Expanded Seeder for 50 Apartments and 10 Contracts.
 * Run: node src/seeders/seedFiftyApartments.js
 * 
 * Sets up a complete, idempotent testing suite:
 * 1. Creates a Landlord (test.landlord50@dirapp.com) and a Tenant (test.tenant50@dirapp.com)
 * 2. Seeds Approved KYC Profiles for both users
 * 3. Seeds 50 realistic apartments across Israel for the landlord
 * 4. Generates 10 Hebrew contract text files under `backend/src/seeders/sample_contracts/`
 * 5. Seeds 10 Rental Agreements in the database representing all states (UPLOAD, PENDING_SIGN, ACTIVE, etc.)
 * 6. Seeds Swipes & Matches (leads) between the tenant and the landlord's apartments
 * 7. Seeds Ledger Rows and Contract Amendments for active leases
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { sequelize, initPostgres } = require('../config/database');
const {
  User,
  Apartment,
  RentalAgreement,
  AgreementParty,
  AgreementRoom,
  UserKycProfile,
  Swipe,
  Match,
  LedgerRow,
  ContractAmendment
} = require('../models');

// Accounts config
const LANDLORD = {
  email: 'test.landlord50@dirapp.com',
  firstName: 'בדיקות',
  lastName: 'חמישים',
  password: 'TestLandlord50!',
  role: 'landlord',
};

const TENANT = {
  email: 'test.tenant50@dirapp.com',
  firstName: 'שוכר',
  lastName: 'בדיקות',
  password: 'TestTenant50!',
  role: 'tenant',
};

// Cities data
const CITIES = [
  { city: 'תל אביב', hoods: ['פלורנטין', 'הצפון הישן', 'נווה צדק', 'דיזנגוף', 'רוטשילד', 'רמת אביב'], basePrice: 6500, baseSize: 45 },
  { city: 'ירושלים', hoods: ['רחביה', 'נחלאות', 'קטמון', 'בקעה', 'הר נוף', 'בית הכרם'], basePrice: 4800, baseSize: 55 },
  { city: 'חיפה', hoods: ['מרכז הכרמל', 'אחוזה', 'בת גלים', 'נווה שאנן', 'הדר הכרמל', 'דניה'], basePrice: 3200, baseSize: 60 },
  { city: 'באר שבע', hoods: ['שכונה ד\'', 'נווה זאב', 'רמות', 'שכונה ב\'', 'נאות לון'], basePrice: 2400, baseSize: 65 },
  { city: 'הרצליה', hoods: ['הרצליה פיתוח', 'הרצליה הירוקה', 'מרכז העיר', 'גליל ים'], basePrice: 5800, baseSize: 55 },
  { city: 'רמת גן', hoods: ['מרום נווה', 'אזור הבורסה', 'שכונת הגפן', 'קריית קריניצי'], basePrice: 4600, baseSize: 50 },
  { city: 'גבעתיים', hoods: ['גבעת רמב"ם', 'שכונת בורוכוב', 'כצנלסון', 'רמב"ם'], basePrice: 4900, baseSize: 48 },
  { city: 'פתח תקווה', hoods: ['כפר גנים ג\'', 'אם המושבות', 'עין גנים', 'נווה גן'], basePrice: 3800, baseSize: 65 },
  { city: 'רעננה', hoods: ['לב הפארק', 'קריית שרת', 'נווה זמר', 'מרכז העיר'], basePrice: 4800, baseSize: 70 },
  { city: 'כפר סבא', hoods: ['השכונה הירוקה', 'מרכז העיר', 'שכונת הפרחים', 'אליעזר'], basePrice: 3900, baseSize: 68 },
];

const AMENITIES = ['parking', 'balcony', 'elevator', 'ac', 'storage', 'furnished', 'sun_boiler'];

const PHOTO_POOL = [
  '1600585154340-be6161a56a0c', '1484154218962-a197022b5858', '1484154218962-a197022b5858',
  '1560448204-e02f11c3d0e2', '1522708323590-d24dbb6b0267', '1493809842364-78817add7ffb',
  '1600585154340-be6161a56a0c', '1580587771525-78b9dba3b914', '1512917774080-9991f1c4c750',
  '1570129477492-45c003edd2be', '1558618666-fcd25c85cd64', '1574362848149-11496d93a7c7'
];

const TITLE_TEMPLATES = [
  (rooms, city, hood) => `דירת ${rooms} חדרים מרווחת ומוארת ב${hood}, ${city}`,
  (rooms, city, hood) => `להשכרה: ${rooms} חדרים משופצת מהיסוד ב${hood} שב${city}`,
  (rooms, city, hood) => `דירת ${rooms} חד׳ במיקום מעולה ב${city} (${hood})`,
  (rooms, city, hood) => `דירה מקסימה ושקטה ${rooms} חדרים למשפחות/זוגות ב${city}`,
  (rooms, city, hood) => `חדש בשוק! דירת ${rooms} חדרים עם מרפסת שמש ב${hood}, ${city}`,
];

const DESCRIPTION_ADDITIONS = [
  'דירה מדהימה ושמורה היטב, מוארת מאוד עם כיווני אוויר מעולים.',
  'מטבח חדיש ומאובזר, אמבטיה משופצת, וסלון רחב ידיים לאירוח.',
  'קרוב לצירי תחבורה מרכזיים, לתחנות אוטובוס/רכבת קלה, פארקים ומרכזי קניות.',
  'ממוקם באזור שקט, שופע ירוק ואיכותי. מתאים לזוגות צעירים או לשותפים.',
  'בניין מטופח מאוד עם דיירים שקטים, לובי מסודר ואינטרקום.',
];

// Physical file generator helper
function generatePhysicalContracts() {
  const dir = path.join(__dirname, 'sample_contracts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`📁 Generating physical text contract files in: ${dir}`);

  for (let i = 1; i <= 10; i++) {
    const rent = 4000 + (i * 250);
    const day = (i * 3) % 28 || 1;
    const cpiText = i % 2 === 0 ? 'יהיו צמודים למדד המחירים לצרכן' : 'לא יהיו צמודים למדד כלשהו';
    
    const contractText = `============================================================
                  חוזה שכירות בלתי מוגנת - קובץ בדיקה ${i}
============================================================

שנערך ונחתם בתל אביב ביום 1 לחודש יוני 2026.

בין:
המשכיר: בדיקות חמישים, ת.ז. 05050505${i}
כתובת למשלוח דואר: תל אביב
טלפון: 050-1234567

לבין:
השוכר: שוכר בדיקות, ת.ז. 09090909${i}
כתובת למשלוח דואר: רעננה
טלפון: 054-7654321

הואיל והמשכיר הינו הבעלים הרשום של דירת מגורים בת ${2 + (i % 3)} חדרים,
הנמצאת ברחוב מושכר מספר ${i}, עיר בדיקות (להלן "המושכר");

והואיל והשוכר מעוניין לשכור את המושכר למטרת מגורים בלבד;

לפיכך הוסכם והותנה בין הצדדים כדלקמן:

1. תקופת השכירות
א. תקופת השכירות הינה למשך שנה שלמה, החל מיום 2026-07-01 ועד ליום 2027-06-30 (להלן "תקופת השכירות").

2. דמי השכירות
א. עבור השכירות מתחייב השוכר לשלם למשכיר סך של ₪${rent} לחודש.
ב. דמי השכירות ישולמו ב-${day} לכל חודש מראש עבור כל חודש שכירות.
ג. הצדדים מסכימים כי דמי השכירות ${cpiText}.

3. שינויים ותיקונים
א. השוכר אינו רשאי לבצע שינויים במושכר ללא הסכמה בכתב ומראש של המשכיר.
ב. השוכר ישמור על ניקיון המושכר ותקינותו ויחזיר אותו צבוע ומסודר בתום התקופה.

ולראיה באו הצדדים על החתום:

_____________________                    _____________________
       המשכיר                                    השוכר
`;

    fs.writeFileSync(path.join(dir, `contract_${i}.txt`), contractText.trim(), 'utf8');
  }
}

// Generate apartment properties array
function generateApartmentListings(landlordId) {
  const listings = [];
  for (let i = 1; i <= 50; i++) {
    const cityData = CITIES[(i - 1) % CITIES.length];
    const city = cityData.city;
    const hood = cityData.hoods[(i - 1) % cityData.hoods.length];
    
    const roomsOptions = [2, 2.5, 3, 3.5, 4];
    const rooms = roomsOptions[(i - 1) % roomsOptions.length];
    
    const multiplier = 1 + (rooms - 2) * 0.25;
    const rawPrice = cityData.basePrice * multiplier + ((i * 127) % 400) - 200;
    const price = Math.round(rawPrice / 100) * 100;
    
    const sizeSqm = Math.round(cityData.baseSize + (rooms * 15) + ((i * 73) % 15));
    const floor = ((i - 1) % 5) + 1;
    const totalFloors = floor + ((i * 2) % 3) + 1;
    
    const streetNum = 5 + (i * 9) % 90;
    const address = `רחוב ${hood} ${streetNum}, ${city}`;
    
    const baseLat = 32.0853 + ((i * 17) % 80 - 40) * 0.004;
    const baseLng = 34.7818 + ((i * 23) % 80 - 40) * 0.004;
    
    const titleFn = TITLE_TEMPLATES[(i - 1) % TITLE_TEMPLATES.length];
    const title = titleFn(rooms, city, hood);
    
    const extra = DESCRIPTION_ADDITIONS[(i - 1) % DESCRIPTION_ADDITIONS.length];
    const petNote = i % 3 === 0 ? 'חיות מחמד מותרות בתיאום.' : 'ללא בעלי חיים.';
    const description = `דירת ${rooms} חדרים בלב ${hood}, ${city}. ${extra} ${petNote} קומה ${floor} מתוך ${totalFloors}. גודל כ-${sizeSqm} מ"ר.`;
    
    const numAmenities = 3 + (i % 3);
    const selectedAmenities = [];
    for (let a = 0; a < numAmenities; a++) {
      const amenity = AMENITIES[(i + a) % AMENITIES.length];
      if (!selectedAmenities.includes(amenity)) selectedAmenities.push(amenity);
    }
    
    const numImages = 3 + (i % 2);
    const images = [];
    for (let imgIdx = 0; imgIdx < numImages; imgIdx++) {
      const photoId = PHOTO_POOL[(i + imgIdx * 2) % PHOTO_POOL.length];
      images.push({
        url: `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=800&h=600&q=80`,
        publicId: `unsplash-${photoId}`,
      });
    }
    
    listings.push({
      title,
      description,
      price,
      rooms,
      floor,
      totalFloors,
      sizeSqm,
      city,
      street: hood,
      address,
      latitude: parseFloat(baseLat.toFixed(6)),
      longitude: parseFloat(baseLng.toFixed(6)),
      images,
      amenities: selectedAmenities,
      availableFrom: new Date(Date.now() + 1000 * 60 * 60 * 24 * (i % 20)).toISOString().split('T')[0],
      minLeasePeriod: 12,
      buildingFee: 150 + ((i * 25) % 200),
      petsAllowed: i % 3 === 0,
      isActive: true,
    });
  }
  return listings;
}

// Master execution block
async function run() {
  console.log('🚀 Starting Testing Suite seeding...');
  
  try {
    // A. Early Database cleanup of orphaned records to prevent ForeignKey sync issues
    await sequelize.authenticate();
    console.log('✅ Database authentication successful.');
    
    const cleanups = [
      { desc: 'ticket invoices without maintenance tickets', sql: 'DELETE FROM ticket_invoices WHERE ticket_id NOT IN (SELECT id FROM maintenance_tickets)' },
      { desc: 'maintenance tickets without agreements', sql: 'DELETE FROM maintenance_tickets WHERE agreement_id NOT IN (SELECT id FROM rental_agreements)' },
      { desc: 'agreement parties without agreements', sql: 'DELETE FROM agreement_parties WHERE agreement_id NOT IN (SELECT id FROM rental_agreements)' },
      { desc: 'agreement rooms without agreements', sql: 'DELETE FROM agreement_rooms WHERE agreement_id NOT IN (SELECT id FROM rental_agreements)' },
      { desc: 'ledger rows without agreements', sql: 'DELETE FROM ledger_rows WHERE agreement_id NOT IN (SELECT id FROM rental_agreements)' },
      { desc: 'contract amendments without agreements', sql: 'DELETE FROM contract_amendments WHERE contract_id NOT IN (SELECT id FROM rental_agreements)' },
      { desc: 'ownership verifications without agreements', sql: 'DELETE FROM ownership_verifications WHERE agreement_id NOT IN (SELECT id FROM rental_agreements)' },
      { desc: 'protocol evidence without agreements', sql: 'DELETE FROM protocol_evidence WHERE agreement_id NOT IN (SELECT id FROM rental_agreements)' },
      { desc: 'agreements without apartments', sql: 'DELETE FROM rental_agreements WHERE property_id NOT IN (SELECT id FROM apartments)' },
      { desc: 'swipes without apartments', sql: 'DELETE FROM swipes WHERE apartment_id NOT IN (SELECT id FROM apartments)' },
      { desc: 'matches without apartments', sql: 'DELETE FROM matches WHERE apartment_id NOT IN (SELECT id FROM apartments)' },
    ];

    console.log('🧹 Running early database cleanups for orphaned records...');
    for (const c of cleanups) {
      try {
        const [result] = await sequelize.query(c.sql);
        // Note: result can be an object with rowCount in postgres
        console.log(`   - Done: ${c.desc}`);
      } catch (err) {
        // Table or columns might not exist yet, skip silently
      }
    }
    console.log('✅ Early cleanups completed.');
  } catch (e) {
    console.error('❌ Early cleanup failed with error:', e.message);
  }

    try {
      // B. Initialize Full Postgres Connection and Sync Tables
      await initPostgres();
      console.log('✅ PostgreSQL Sync Confirmed');

    // 1. Create Landlord & Tenant Users
    const landlordHash = await bcrypt.hash(LANDLORD.password, 12);
    const [landlordUser] = await User.findOrCreate({
      where: { email: LANDLORD.email },
      defaults: {
        email: LANDLORD.email,
        passwordHash: landlordHash,
        firstName: LANDLORD.firstName,
        lastName: LANDLORD.lastName,
        role: LANDLORD.role,
        isVerified: true,
        tosAcceptedAt: new Date(),
        tosVersion: '3.0',
        trustScore: 85,
      },
    });
    await landlordUser.update({ passwordHash: landlordHash, activeRole: 'landlord', trustScore: 85 });
    console.log(`👤 Landlord User ready: ${LANDLORD.email}`);

    const tenantHash = await bcrypt.hash(TENANT.password, 12);
    const [tenantUser] = await User.findOrCreate({
      where: { email: TENANT.email },
      defaults: {
        email: TENANT.email,
        passwordHash: tenantHash,
        firstName: TENANT.firstName,
        lastName: TENANT.lastName,
        role: TENANT.role,
        isVerified: true,
        tosAcceptedAt: new Date(),
        tosVersion: '3.0',
        trustScore: 90,
      },
    });
    await tenantUser.update({ passwordHash: tenantHash, activeRole: 'tenant', trustScore: 90 });
    console.log(`👤 Tenant User ready: ${TENANT.email}`);

    // 2. Approve KYC Profiles for both
    await UserKycProfile.findOrCreate({
      where: { userId: landlordUser.id },
      defaults: { userId: landlordUser.id, status: 'APPROVED', personaInquiryId: 'inq_landlord50' },
    });
    await UserKycProfile.update({ status: 'APPROVED' }, { where: { userId: landlordUser.id } });

    await UserKycProfile.findOrCreate({
      where: { userId: tenantUser.id },
      defaults: { userId: tenantUser.id, status: 'APPROVED', personaInquiryId: 'inq_tenant50' },
    });
    await UserKycProfile.update({ status: 'APPROVED' }, { where: { userId: tenantUser.id } });
    console.log('✅ KYC profiles set to APPROVED for both users.');

    // 3. Clear previous agreements/apartments/swipes/matches for clean rerun
    const deletedAgreements = await RentalAgreement.destroy({ where: { landlordId: landlordUser.id } });
    if (deletedAgreements > 0) console.log(`🧹 Deleted ${deletedAgreements} previous agreements.`);

    const deletedSwipes = await Swipe.destroy({ where: { tenantId: tenantUser.id } });
    const deletedMatches = await Match.destroy({ where: { tenantId: tenantUser.id } });
    console.log(`🧹 Cleared previous swipes (${deletedSwipes}) and matches (${deletedMatches}).`);

    const deletedApartments = await Apartment.destroy({ where: { landlordId: landlordUser.id } });
    if (deletedApartments > 0) console.log(`🧹 Deleted ${deletedApartments} previous apartments.`);

    // 4. Seed 50 apartments
    const listingsData = generateApartmentListings(landlordUser.id);
    const createdApartments = [];
    for (const apt of listingsData) {
      const dbApt = await Apartment.create({ ...apt, landlordId: landlordUser.id });
      createdApartments.push(dbApt);
    }
    console.log(`🏠 Seeded 50 realistic apartments for ${LANDLORD.email}`);

    // 5. Generate physical contract files
    generatePhysicalContracts();

    // 6. Seed 10 Rental Agreements in varying states
    const states = [
      'UPLOAD',              // Contract 1: newly uploaded
      'PENDING_SIGN',        // Contract 2: validated, waiting for signatures
      'ACTIVE',              // Contract 3: fully signed, checkin pending
      'EXPIRING',            // Contract 4: ending soon (in 45 days)
      'PENDING_ACTIVATION',  // Contract 5: renewal copy for Contract 3
      'ENDED',               // Contract 6: past expired contract
      'ACTIVE',              // Contract 7: active with proposed and approved amendments
      'PENDING_SIGN',        // Contract 8: tenant signed, landlord not
      'ACTIVE',              // Contract 9: active, check-in completed
      'ACTIVE',              // Contract 10: active, check-out in progress
    ];

    const agreements = [];
    const BUILTIN_ROOMS = ['סלון', 'מטבח', 'שירותים', 'מקלחת'];

    for (let i = 0; i < 10; i++) {
      const apartment = createdApartments[i];
      const status = states[i];
      const rent = apartment.price;
      const day = (i * 3) % 28 || 1;
      
      let startDate = '2026-07-01';
      let endDate = '2027-06-30';
      
      // Customize dates for specific test states
      if (status === 'EXPIRING') {
        // Ends in 45 days from today
        const end = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
        const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      } else if (status === 'ENDED') {
        // Ended last year
        startDate = '2025-01-01';
        endDate = '2025-12-31';
      } else if (status === 'PENDING_ACTIVATION') {
        // Starts when Contract 3 ends
        startDate = '2027-07-01';
        endDate = '2028-06-30';
      }

      const agreement = await RentalAgreement.create({
        landlordId: landlordUser.id,
        propertyId: apartment.id,
        status: status === 'PENDING_ACTIVATION' ? 'PENDING_ACTIVATION' : (status === 'UPLOAD' ? 'UPLOAD' : status),
        startDate,
        endDate,
        monthlyRentIls: rent,
        paymentDueDay: day,
        cpiLinked: i % 2 === 0,
        r2DocKey: `contracts/contract_${i + 1}.txt`,
        extractedFields: {
          landlordName: landlordUser.firstName + ' ' + landlordUser.lastName,
          landlordId: '05050505' + (i + 1),
          tenantName: tenantUser.firstName + ' ' + tenantUser.lastName,
          tenantId: '09090909' + (i + 1),
          address: apartment.address,
          startDate,
          endDate,
          monthlyRent: rent,
          paymentDay: day,
          cpiLinked: i % 2 === 0,
          warnings: [],
          missingFields: []
        },
        landlordSignedAt: ['ACTIVE', 'EXPIRING', 'ENDED', 'ACTIVE', 'ACTIVE', 'ACTIVE'].includes(status) ? new Date() : null,
        checkinCompletedAt: (status === 'ACTIVE' && i === 8) ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : null,
      });

      agreements.push(agreement);

      // Create parties (tenant)
      const tenantPartySignedAt = ['ACTIVE', 'EXPIRING', 'ENDED', 'ACTIVE', 'ACTIVE', 'ACTIVE'].includes(status) || (status === 'PENDING_SIGN' && i === 7) ? new Date() : null;
      await AgreementParty.create({
        agreementId: agreement.id,
        userId: tenantUser.id,
        role: 'tenant',
        signedAt: tenantPartySignedAt,
        kycStatus: 'APPROVED',
      });

      // Create rooms
      for (const roomName of BUILTIN_ROOMS) {
        const dbRoom = await AgreementRoom.create({
          agreementId: agreement.id,
          name: roomName,
          type: 'builtin',
        });
        
        // Add check-out photos in progress for Contract 10 (room 'סלון')
        if (i === 9 && roomName === 'סלון') {
          await dbRoom.update({
            checkoutPhotos: [`checkout/${agreement.id}/${dbRoom.id}/sofa_damage.jpg`],
            checkoutNotes: 'ישנו שפשוף קל בריפוד הספה בסלון.'
          });
        }
      }

      // 7. Seed Swipe & Match records for these apartments to populate matching/leads flow
      await Swipe.create({
        tenantId: tenantUser.id,
        apartmentId: apartment.id,
        direction: 'like',
      });

      await Match.create({
        tenantId: tenantUser.id,
        landlordId: landlordUser.id,
        apartmentId: apartment.id,
        status: ['UPLOAD', 'PENDING_SIGN'].includes(status) ? 'pending' : 'accepted',
        tenantLikedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        landlordLikedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      });

      // 8. Seed Ledger rows for active leases
      if (['ACTIVE', 'EXPIRING'].includes(status)) {
        for (let m = 0; m < 12; m++) {
          const dueDate = new Date(new Date(startDate).getTime() + m * 30 * 24 * 60 * 60 * 1000);
          const isPast = dueDate.getTime() < Date.now();
          await LedgerRow.create({
            agreementId: agreement.id,
            period: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`,
            dueDate: dueDate.toISOString().split('T')[0],
            amount: rent,
            status: isPast ? 'PAID' : 'PENDING',
            reportedByTenant: isPast ? new Date(dueDate.getTime() + 12 * 60 * 60 * 1000) : null,
            confirmedByLandlord: isPast ? new Date(dueDate.getTime() + 24 * 60 * 60 * 1000) : null,
          });
        }
      }

      // 9. Seed Amendments for Contract 7
      if (i === 6) {
        // Pending amendment
        await ContractAmendment.create({
          contractId: agreement.id,
          proposedBy: 'tenant',
          field: 'monthlyRentIls',
          oldValue: String(rent),
          newValue: String(rent - 300),
          reason: 'תיקון דמי השכירות עקב תקלות מזגן',
          status: 'pending',
        });
        
        // Approved amendment
        await ContractAmendment.create({
          contractId: agreement.id,
          proposedBy: 'landlord',
          field: 'paymentDueDay',
          oldValue: String(day),
          newValue: '10',
          reason: 'שינוי מועד התשלום ל-10 בחודש להתאמה למשכורת',
          status: 'approved',
        });
      }
    }

    // Connect Contract 5 (renewal) to Contract 3 (original)
    const originalContract = agreements[2];
    const renewalContract = agreements[4];
    await renewalContract.update({ renewedFromId: originalContract.id });
    console.log(`🔗 Linked Contract 5 as renewal of Contract 3.`);

    console.log('\n======================================================');
    console.log('🎉 Seeding Completed successfully!');
    console.log('------------------------------------------------------');
    console.log('👥 Landlord Account details:');
    console.log(`   Email:    ${LANDLORD.email}`);
    console.log(`   Password: ${LANDLORD.password}`);
    console.log('👥 Tenant Account details:');
    console.log(`   Email:    ${TENANT.email}`);
    console.log(`   Password: ${TENANT.password}`);
    console.log('\n📊 Seeding Summary:');
    console.log('   - 50 Realistic Apartments created');
    console.log('   - 10 Sample Contract Text Files written to seeders/sample_contracts/');
    console.log('   - 10 Rental Agreements created in DB spanning all states:');
    console.log('     1. UPLOAD (Newly Uploaded)');
    console.log('     2. PENDING_SIGN (Waiting for signatures)');
    console.log('     3. ACTIVE (Lease active)');
    console.log('     4. EXPIRING (Active, ending in 45 days)');
    console.log('     5. PENDING_ACTIVATION (Renewal of Contract 3)');
    console.log('     6. ENDED (Completed lease)');
    console.log('     7. ACTIVE (Has pending/approved amendments)');
    console.log('     8. PENDING_SIGN (Tenant signed, landlord pending)');
    console.log('     9. ACTIVE (Check-in complete)');
    console.log('     10. ACTIVE (Check-out in progress)');
    console.log('   - Swipes & Matches generated to enable matching/leads tests.');
    console.log('   - Financial Ledger rows populated for active contracts.');
    console.log('======================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

run();
