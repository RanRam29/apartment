import { create } from 'zustand';
import { contractsV3Api } from '../services/api';

interface ContractState {
  activeContract: any | null;
  isLoading: boolean;
  error: string | null;

  fetchContract: (id: string) => Promise<void>;
  uploadContract: (formData: FormData) => Promise<any>;
  updateContractFields: (id: string, fields: any) => Promise<void>;
  inviteTenant: (id: string, tenantUserId: string) => Promise<void>;
  validateContract: (id: string) => Promise<any>;
  transitionContract: (id: string, targetStatus: string) => Promise<void>;
  signContract: (id: string) => Promise<void>;
  verifyOwnership: (id: string, choice: string) => Promise<void>;
  uploadCheckinPhotos: (id: string, roomId: string, formData: FormData) => Promise<void>;
  completeCheckin: (id: string) => Promise<void>;
  uploadCheckoutPhotos: (id: string, roomId: string, formData: FormData) => Promise<void>;
  reviewCheckout: (id: string, data: any) => Promise<void>;
  completeCheckout: (id: string) => Promise<void>;
  renewContract: (id: string, formData: FormData) => Promise<any>;
  proposeAmendment: (id: string, field: string, newValue: any, reason: string) => Promise<void>;
  approveAmendment: (id: string, aId: string) => Promise<void>;
  rejectAmendment: (id: string, aId: string) => Promise<void>;
}

export const useContractStore = create<ContractState>((set, get) => ({
  activeContract: null,
  isLoading: false,
  error: null,

  fetchContract: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await contractsV3Api.get(id);
      set({ activeContract: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch contract', isLoading: false });
      throw err;
    }
  },

  uploadContract: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await contractsV3Api.upload(formData);
      set({ activeContract: res.data.contract || res.data, isLoading: false });
      return res.data;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to upload contract', isLoading: false });
      throw err;
    }
  },

  updateContractFields: async (id, fields) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.updateFields(id, fields);
      const active = get().activeContract;
      if (active && active.id === id) {
        set({ activeContract: { ...active, ...fields }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update fields', isLoading: false });
      throw err;
    }
  },

  inviteTenant: async (id, tenantUserId) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.inviteTenant(id, tenantUserId);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to invite tenant', isLoading: false });
      throw err;
    }
  },

  validateContract: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await contractsV3Api.validate(id);
      set({ isLoading: false });
      return res.data;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to validate contract', isLoading: false });
      throw err;
    }
  },

  transitionContract: async (id, targetStatus) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.transition(id, targetStatus);
      const active = get().activeContract;
      if (active && active.id === id) {
        set({ activeContract: { ...active, status: targetStatus }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err?.message || 'Failed to transition status', isLoading: false });
      throw err;
    }
  },

  signContract: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.sign(id);
      const active = get().activeContract;
      if (active && active.id === id) {
        set({ activeContract: { ...active, status: 'SIGNED' }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err?.message || 'Failed to sign contract', isLoading: false });
      throw err;
    }
  },

  verifyOwnership: async (id, choice) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.verifyOwnership(id, choice);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to verify ownership', isLoading: false });
      throw err;
    }
  },

  uploadCheckinPhotos: async (id, roomId, formData) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.uploadCheckinPhotos(id, roomId, formData);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to upload check-in photos', isLoading: false });
      throw err;
    }
  },

  completeCheckin: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.completeCheckin(id);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to complete check-in', isLoading: false });
      throw err;
    }
  },

  uploadCheckoutPhotos: async (id, roomId, formData) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.uploadCheckoutPhotos(id, roomId, formData);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to upload check-out photos', isLoading: false });
      throw err;
    }
  },

  reviewCheckout: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.reviewCheckout(id, data);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to review check-out', isLoading: false });
      throw err;
    }
  },

  completeCheckout: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.completeCheckout(id);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to complete check-out', isLoading: false });
      throw err;
    }
  },

  renewContract: async (id, formData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await contractsV3Api.renew(id, formData);
      set({ isLoading: false });
      return res.data;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to renew contract', isLoading: false });
      throw err;
    }
  },

  proposeAmendment: async (id, field, newValue, reason) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.proposeAmendment(id, field, newValue, reason);
      await get().fetchContract(id);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to propose amendment', isLoading: false });
      throw err;
    }
  },

  approveAmendment: async (id, aId) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.approveAmendment(id, aId);
      await get().fetchContract(id);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to approve amendment', isLoading: false });
      throw err;
    }
  },

  rejectAmendment: async (id, aId) => {
    set({ isLoading: true, error: null });
    try {
      await contractsV3Api.rejectAmendment(id, aId);
      await get().fetchContract(id);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject amendment', isLoading: false });
      throw err;
    }
  },
}));
