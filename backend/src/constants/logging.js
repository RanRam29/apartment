const AUDIT_ACTIONS = {
  USER_REGISTER: 'user.register',
  USER_LOGIN_SUCCESS: 'user.login.success',
  USER_LOGIN_FAILED: 'user.login.failed',
  USER_LOGOUT: 'user.logout',
  USER_PROFILE_UPDATE: 'user.profile.update',
  USER_VERIFY_EMAIL: 'user.verify_email',
  APARTMENT_CREATE: 'apartment.create',
  APARTMENT_UPDATE: 'apartment.update',
  APARTMENT_DELETE: 'apartment.delete',
  RESOURCE_MUTATION: 'resource.mutation',
  ADMIN_LOGS_READ: 'admin.logs.read',
  SOCKET_CONNECT: 'socket.connect',
  SOCKET_DISCONNECT: 'socket.disconnect',
  SOCKET_MESSAGE_SEND: 'socket.message.send',
  CLIENT_EVENT: 'client.event',
};

const AUDIT_OUTCOMES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
};

const SYSTEM_SEVERITY = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical',
};

const SYSTEM_CATEGORY = {
  APPLICATION: 'application',
  SECURITY: 'security',
  INTEGRATION: 'integration',
  PERFORMANCE: 'performance',
};

module.exports = {
  AUDIT_ACTIONS,
  AUDIT_OUTCOMES,
  SYSTEM_SEVERITY,
  SYSTEM_CATEGORY,
};
