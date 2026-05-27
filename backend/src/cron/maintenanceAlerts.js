const { Op } = require('sequelize');
const { MaintenanceTicket, RentalAgreement } = require('../models');

async function runMaintenanceAlerts() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // First alert: 24h with no response
  const staleTickets = await MaintenanceTicket.findAll({
    where: {
      status: 'OPEN',
      createdAt: { [Op.lte]: twentyFourHoursAgo },
    },
    include: [{ model: RentalAgreement, as: 'agreement' }],
  });

  for (const ticket of staleTickets) {
    console.log(`MAINTENANCE ALERT (24h): Ticket ${ticket.id} has no response — landlord ${ticket.agreement?.landlordId}`);
  }

  // Escalation: 3 days with no response
  const escalatedTickets = await MaintenanceTicket.findAll({
    where: {
      status: 'OPEN',
      createdAt: { [Op.lte]: threeDaysAgo },
    },
  });

  for (const ticket of escalatedTickets) {
    console.log(`MAINTENANCE ESCALATION (3d): Ticket ${ticket.id} still open`);
  }
}

module.exports = { runMaintenanceAlerts };
