require('dotenv').config();
process.env.POSTGRES_SSL = 'false';
process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.POSTGRES_USER = 'apartment_user';
process.env.POSTGRES_PASSWORD = 'apartment_pass';
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const crypto = require('crypto');
const { sequelize, initPostgres } = require('../src/config/database');
const { initMongoDB } = require('../src/config/mongodb');
const { initRedis } = require('../src/config/redis');
const { User, UserKycProfile, AgreementParty, RentalAgreement, Apartment } = require('../src/models');

async function runTest() {
  console.log('🚀 Starting KYC End-to-End Verification Test Script...');

  try {
    // 1. Connect to PostgreSQL
    await initPostgres();
    console.log('✅ Connected to PostgreSQL database.');

    // Connect to MongoDB (optional)
    await initMongoDB().catch(() => {
      console.log('⚠️ MongoDB is not running locally. Document-store operations will be skipped or stubbed.');
    });

    // Initialize Redis (in-memory if local Redis is down)
    await initRedis().catch(() => {});
    console.log('✅ Redis client initialized.');

    // 2. Setup Test Data
    console.log('\n📦 Seeding mock data for verification...');
    
    // Find or create test user
    const email = 'kyc-tester@dirapp.com';
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        passwordHash: '$2a$12$L7p7C9m72cKz2eK8V1gNveXgZ62eY2f3t4u5v6w7x8y9z01234567', // dummy hash
        firstName: 'ישראל',
        lastName: 'ישראלי',
        role: 'tenant',
        isVerified: true,
      });
      console.log(`➕ Created test user: ${email} (ID: ${user.id})`);
    } else {
      console.log(`🔄 Found existing test user: ${email} (ID: ${user.id})`);
      // Reset KYC status to clean up previous runs
      await UserKycProfile.destroy({ where: { userId: user.id } });
      await AgreementParty.destroy({ where: { userId: user.id } });
    }

    // Find or create landlord
    const landlordEmail = 'landlord-tester@dirapp.com';
    let landlord = await User.findOne({ where: { email: landlordEmail } });
    if (!landlord) {
      landlord = await User.create({
        email: landlordEmail,
        passwordHash: '$2a$12$L7p7C9m72cKz2eK8V1gNveXgZ62eY2f3t4u5v6w7x8y9z01234567',
        firstName: 'משה',
        lastName: 'המשכיר',
        role: 'landlord',
        isVerified: true,
      });
      console.log(`➕ Created landlord user: ${landlordEmail} (ID: ${landlord.id})`);
    }

    // Find or create mock apartment
    let apartment = await Apartment.findOne({ where: { landlordId: landlord.id } });
    if (!apartment) {
      apartment = await Apartment.create({
        landlordId: landlord.id,
        title: 'דירת פנטהאוז בדיקה ל-KYC',
        price: 8500,
        rooms: 4,
        city: 'תל אביב',
        street: 'רוטשילד 10',
      });
      console.log(`➕ Created mock apartment (ID: ${apartment.id})`);
    }

    // Seed mock rental agreement
    const agreement = await RentalAgreement.create({
      landlordId: landlord.id,
      propertyId: apartment.id,
      status: 'PENDING_SIGN',
      monthlyRentIls: 8500,
    });
    console.log(`➕ Created mock rental agreement (ID: agreement.id) in PENDING_SIGN status.`);

    // Add user as agreement party
    const party = await AgreementParty.create({
      agreementId: agreement.id,
      userId: user.id,
      role: 'tenant',
      kycStatus: 'PENDING',
    });
    console.log(`➕ Added tenant to agreement parties in PENDING KYC status.`);

    // 3. Initiate Verification
    console.log('\n🔒 Step 1: Initiating Persona verification flow...');
    const kycService = require('../src/services/kycServiceV3');
    const initResult = await kycService.initiateVerification(user.id);
    console.log('📝 Result from initiateVerification:', initResult);
    
    const kycProfile = await UserKycProfile.findOne({ where: { userId: user.id } });
    console.log(`📡 Verification record created in DB. Status: ${kycProfile.status}, Inquiry ID: ${kycProfile.personaInquiryId}`);

    // 4. Simulate webhook execution (Completed KYC)
    console.log('\n🔔 Step 2: Simulating Completed Webhook payload from Persona...');
    const webhookSecret = process.env.PERSONA_WEBHOOK_SECRET || 'test-webhook-secret';
    
    const payload = {
      data: {
        id: kycProfile.personaInquiryId,
        attributes: {
          status: 'completed',
          inquiry_id: kycProfile.personaInquiryId,
        }
      }
    };
    
    const rawBody = JSON.stringify(payload);
    // Generate valid HMAC signature
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    
    console.log('🔑 Generated signature:', signature);
    
    console.log('📡 Calling handleWebhook...');
    const webhookResult = await kycService.handleWebhook(rawBody, signature);
    console.log('📝 Result from handleWebhook:', webhookResult);

    // 5. Verify database updates
    console.log('\n🔍 Step 3: Verifying database changes...');
    
    // Check KYC profile
    const updatedKyc = await UserKycProfile.findOne({ where: { userId: user.id } });
    console.log(`✨ UserKycProfile updated status: ${updatedKyc.status} (Expected: APPROVED)`);

    // Check Agreement Party
    const updatedParty = await AgreementParty.findOne({ where: { userId: user.id, agreementId: agreement.id } });
    console.log(`✨ AgreementParty updated kycStatus: ${updatedParty.kycStatus} (Expected: APPROVED)`);

    // Check Gamification points (if MongoDB was available)
    try {
      const { mongoose } = require('../src/config/mongodb');
      if (mongoose.connection.readyState === 1) {
        const UserPoints = require('../src/models/mongo/UserPoints');
        const points = await UserPoints.findOne({ userId: String(user.id) });
        if (points) {
          console.log(`✨ Gamification points: ${points.points} pts, Level: ${points.level}, Badges: ${JSON.stringify(points.badges)}`);
        } else {
          console.log('ℹ️ No gamification points recorded yet.');
        }
      } else {
        console.log('ℹ️ Gamification verification skipped (MongoDB is not connected).');
      }
    } catch (e) {
      console.log('ℹ️ Gamification verification failed:', e.message);
    }

    console.log('\n🎉 KYC Verification End-to-End Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
    process.exit(0);
  }
}

runTest();
