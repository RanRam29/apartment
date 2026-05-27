import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v3/admin',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from local storage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getConfigs = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const updateConfig = async (key, value) => {
  const response = await api.put(`/config/${key}`, { value });
  return response.data;
};

export const getUsers = async (page = 1) => {
  const response = await api.get(`/users?page=${page}`);
  return response.data;
};

export const unlockUser = async (id) => {
  const response = await api.post(`/users/${id}/unlock`);
  return response.data;
};

export const kycOverride = async (id, status) => {
  const response = await api.post(`/users/${id}/kyc-override`, { status });
  return response.data;
};

export const getContracts = async () => {
  const response = await api.get('/contracts');
  return response.data;
};

export const overrideContractStatus = async (id, status) => {
  const response = await api.post(`/contracts/${id}/override-status`, { status });
  return response.data;
};

export const getLedgers = async () => {
  const response = await api.get('/ledgers');
  return response.data;
};

export const getMaintenanceTickets = async () => {
  const response = await api.get('/maintenance');
  return response.data;
};

export const closeMaintenanceTicket = async (id) => {
  const response = await api.post(`/maintenance/${id}/close`);
  return response.data;
};

export default {
  getConfigs,
  updateConfig,
  getUsers,
  unlockUser,
  kycOverride,
  getContracts,
  overrideContractStatus,
  getLedgers,
  getMaintenanceTickets,
  closeMaintenanceTicket,
};
