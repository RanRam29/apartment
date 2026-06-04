const axios = require('axios');
const crypto = require('crypto');
const readline = require('readline');

const PRODUCTION_URL = 'https://apartment-backend-v24y.onrender.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runProductionTest() {
  console.log('🌍 Starting Production KYC End-to-End Test...');
  console.log(`📡 Targeting Backend: ${PRODUCTION_URL}\n`);

  // Ask for Webhook Secret
  let webhookSecret = await askQuestion('🔑 Enter PERSONA_WEBHOOK_SECRET (leave empty to default to "test-webhook-secret"): ');
  if (!webhookSecret) {
    webhookSecret = 'test-webhook-secret';
  }

  const uniqueId = Math.floor(100000 + Math.random() * 900000);
  const email = `kyc-prod-test-${uniqueId}@dirapp.com`;
  const password = 'ProdPassword123!';

  try {
    // Step 1: Register a new tenant in production
    console.log(`\n👤 Step 1: Registering new user in production: ${email}...`);
    const registerRes = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
      email,
      password,
      firstName: 'ישראל',
      lastName: 'ישראלי',
      role: 'tenant'
    });
    
    const token = registerRes.data.token;
    console.log('✅ User registered successfully. JWT Token acquired.');

    // Step 2: Initiate KYC verification
    console.log('\n🔒 Step 2: Initiating KYC verification on production...');
    const initRes = await axios.post(`${PRODUCTION_URL}/api/v3/kyc/initiate`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📝 Result from /api/v3/kyc/initiate:', initRes.data);
    const inquiryId = initRes.data.inquiryId;
    if (!inquiryId) {
      throw new Error('Failed to get inquiryId from production server.');
    }
    console.log(`📡 Inquiry ID created on production: ${inquiryId}`);

    // Step 3: Simulate Completed Webhook payload
    console.log('\n🔔 Step 3: Preparing webhook payload and generating HMAC signature...');
    const payload = {
      data: {
        id: inquiryId,
        attributes: {
          status: 'completed',
          inquiry_id: inquiryId,
        }
      }
    };
    
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    console.log('🔑 HMAC Signature generated:', signature);

    console.log('📡 Sending simulated webhook to production /api/v3/kyc/webhook...');
    const webhookRes = await axios.post(`${PRODUCTION_URL}/api/v3/kyc/webhook`, rawBody, {
      headers: {
        'persona-signature': signature,
        'Content-Type': 'application/json'
      }
    });

    console.log('📝 Response from webhook endpoint:', webhookRes.data);

    // Step 4: Verify KYC is APPROVED in production
    console.log('\n🔍 Step 4: Verifying user KYC status in production...');
    const verifyRes = await axios.post(`${PRODUCTION_URL}/api/v3/kyc/initiate`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📝 Verification check response:', verifyRes.data);
    
    if (verifyRes.data.status === 'already_approved') {
      console.log('\n🎉 SUCCESS! The user KYC status is now APPROVED on the production server!');
    } else {
      console.log('\n⚠️ The user KYC status is still PENDING. This could mean the webhook secret was incorrect.');
    }

  } catch (error) {
    console.error('\n❌ Production test failed with error:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

runProductionTest();
