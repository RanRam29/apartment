const TEMPLATES = {
  PAYMENT_REMINDER_3D: {
    name: 'dirapp_payment_reminder_3d',
    language: 'he',
    buildComponents: (tenantName, amount, dueDate) => ([{
      type: 'body',
      parameters: [
        { type: 'text', text: tenantName },
        { type: 'text', text: amount },
        { type: 'text', text: dueDate },
      ],
    }]),
  },

  PAYMENT_REMINDER_TODAY: {
    name: 'dirapp_payment_reminder_today',
    language: 'he',
    buildComponents: (tenantName, amount) => ([{
      type: 'body',
      parameters: [
        { type: 'text', text: tenantName },
        { type: 'text', text: amount },
      ],
    }]),
  },

  PAYMENT_OVERDUE: {
    name: 'dirapp_payment_overdue',
    language: 'he',
    buildComponents: (tenantName, amount, daysOverdue) => ([{
      type: 'body',
      parameters: [
        { type: 'text', text: tenantName },
        { type: 'text', text: amount },
        { type: 'text', text: String(daysOverdue) },
      ],
    }]),
  },

  MAINTENANCE_OPENED: {
    name: 'dirapp_maintenance_opened',
    language: 'he',
    buildComponents: (ticketNumber, address) => ([{
      type: 'body',
      parameters: [
        { type: 'text', text: ticketNumber },
        { type: 'text', text: address },
      ],
    }]),
  },

  MAINTENANCE_ASSIGNED: {
    name: 'dirapp_maintenance_assigned',
    language: 'he',
    buildComponents: (technicianName, estimatedDate) => ([{
      type: 'body',
      parameters: [
        { type: 'text', text: technicianName },
        { type: 'text', text: estimatedDate },
      ],
    }]),
  },

  MAINTENANCE_RESOLVED: {
    name: 'dirapp_maintenance_resolved',
    language: 'he',
    buildComponents: (ticketNumber) => ([{
      type: 'body',
      parameters: [{ type: 'text', text: ticketNumber }],
    }]),
  },

  TENANT_INVITE: {
    name: 'dirapp_tenant_invite',
    language: 'he',
    buildComponents: (tenantName, landlordName, address) => ([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: tenantName },
          { type: 'text', text: landlordName },
          { type: 'text', text: address },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: '' }],
      },
    ]),
  },

  CONTRACT_RENEWAL_60D: {
    name: 'dirapp_contract_renewal_60d',
    language: 'he',
    buildComponents: (recipientName, expiryDate, address) => ([{
      type: 'body',
      parameters: [
        { type: 'text', text: recipientName },
        { type: 'text', text: expiryDate },
        { type: 'text', text: address },
      ],
    }]),
  },
};

module.exports = { TEMPLATES };
