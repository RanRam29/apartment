import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v3/guarantor',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getGuarantorFlowDetails = async (token) => {
  const response = await api.get(`/flow/${token}`);
  return response.data;
};

export const declineInvitation = async (token) => {
  const response = await api.post(`/flow/${token}/decline`);
  return response.data;
};

export const completeVerificationAndSign = async (token, signatureData) => {
  const response = await api.post(`/flow/${token}/complete`, { signatureData });
  return response.data;
};

export default {
  getGuarantorFlowDetails,
  declineInvitation,
  completeVerificationAndSign,
};
