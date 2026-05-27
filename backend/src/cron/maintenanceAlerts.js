const { Op } = require('sequelize');
const { MaintenanceTicket, RentalAgreement } = require('../models');
const { notify } = require('../services/notificationService');

async function runMaintenanceAlerts() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const staleTickets = await MaintenanceTicket.findAll({
    where: {
      status: 'OPEN',
      createdAt: { [Op.lte]: twentyFourHoursAgo },
    },
    include: [{ model: RentalAgreement, as: 'agreement' }],
  });

  for (const ticket of staleTickets) {
    if (ticket.agreement) {
      await notify(ticket.agreement.landlordId, {
        title: 'תקלה ממתינה למענה',
        body: 'תקלה שדווחה ממתינה לטיפול שלך',
      });
    }
  }
}

module.exports = { runMaintenanceAlerts };
