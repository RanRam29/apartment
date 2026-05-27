const { v4: uuidv4 } = require('uuid');
const { RentalAgreement, AgreementParty, AgreementRoom, UserKycProfile } = require('../models');
const { uploadFile, BUCKETS } = require('./r2Service');
const { extractContractFields } = require('./geminiService');

const BUILTIN_ROOMS = ['סלון', 'מטבח', 'שירותים', 'מקלחת'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

async function uploadAndExtract(file, landlordId, propertyId) {
  if (file.size > MAX_FILE_SIZE) {
    throw Object.assign(new Error('File exceeds 10MB limit'), { status: 413 });
  }
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    throw Object.assign(new Error('Only PDF and DOCX files are allowed'), { status: 422 });
  }

  const key = `contracts/${uuidv4()}-${file.originalname}`;
  await uploadFile(BUCKETS.CONTRACT_DOCS, key, file.buffer, file.mimetype);

  const extracted = await extractContractFields(file.buffer);

  const agreement = await RentalAgreement.create({
    landlordId,
    propertyId,
    status: 'UPLOAD',
    r2DocKey: key,
    extractedFields: extracted,
    startDate: extracted.startDate || null,
    endDate: extracted.endDate || null,
    monthlyRentIls: extracted.monthlyRent || null,
    paymentDueDay: extracted.paymentDay || null,
    cpiLinked: extracted.cpiLinked || false,
  });

  for (const roomName of BUILTIN_ROOMS) {
    await AgreementRoom.create({
      agreementId: agreement.id,
      name: roomName,
      type: 'builtin',
    });
  }

  return { agreement, extracted };
}

async function validateGate(agreementId) {
  const agreement = await RentalAgreement.findByPk(agreementId, {
    include: [{ model: AgreementParty, as: 'parties' }],
  });
  if (!agreement) throw Object.assign(new Error('Agreement not found'), { status: 404 });

  const errors = [];

  if (!agreement.startDate) errors.push('startDate is required');
  if (!agreement.endDate) errors.push('endDate is required');
  if (!agreement.monthlyRentIls) errors.push('monthlyRentIls is required');
  if (!agreement.paymentDueDay) errors.push('paymentDueDay is required');

  const landlordKyc = await UserKycProfile.findOne({ where: { userId: agreement.landlordId } });
  if (!landlordKyc || landlordKyc.status !== 'APPROVED') {
    errors.push('Landlord KYC not approved');
  }

  const tenants = (agreement.parties || []).filter(p => p.role === 'tenant');
  if (tenants.length === 0) errors.push('No tenant assigned');

  for (const tenant of tenants) {
    const tenantKyc = await UserKycProfile.findOne({ where: { userId: tenant.userId } });
    if (!tenantKyc || tenantKyc.status !== 'APPROVED') {
      errors.push(`Tenant ${tenant.userId} KYC not approved`);
    }
  }

  return { valid: errors.length === 0, errors };
}

const VALID_TRANSITIONS = {
  UPLOAD: ['PENDING_SIGN'],
  PENDING_SIGN: ['ACTIVE'],
  ACTIVE: ['EXPIRING'],
  EXPIRING: ['ENDED'],
  PENDING_ACTIVATION: ['ACTIVE'],
};

async function transitionState(agreementId, newState) {
  const agreement = await RentalAgreement.findByPk(agreementId);
  if (!agreement) throw Object.assign(new Error('Agreement not found'), { status: 404 });

  const allowed = VALID_TRANSITIONS[agreement.status] || [];
  if (!allowed.includes(newState)) {
    throw Object.assign(
      new Error(`Invalid transition from ${agreement.status} to ${newState}`),
      { status: 422 }
    );
  }

  if (newState === 'PENDING_SIGN') {
    const gate = await validateGate(agreementId);
    if (!gate.valid) {
      throw Object.assign(new Error('Validation gate failed'), { status: 422, reasons: gate.errors });
    }
  }

  await agreement.update({ status: newState });
  return agreement;
}

module.exports = { uploadAndExtract, validateGate, transitionState, VALID_TRANSITIONS };
