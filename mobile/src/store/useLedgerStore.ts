import { create } from 'zustand';
import { ledgerApi } from '../services/api';

interface LedgerState {
  rows: any[];
  isLoading: boolean;
  error: string | null;

  fetchLedgerForAgreement: (agreementId: string) => Promise<void>;
  reportPayment: (id: string, formData?: FormData) => Promise<void>;
  confirmPayment: (id: string) => Promise<void>;
  rejectPayment: (id: string) => Promise<void>;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  rows: [],
  isLoading: false,
  error: null,

  fetchLedgerForAgreement: async (agreementId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await ledgerApi.getForAgreement(agreementId);
      set({ rows: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch ledger rows', isLoading: false });
      throw err;
    }
  },

  reportPayment: async (id, formData) => {
    set({ isLoading: true, error: null });
    try {
      await ledgerApi.reportPayment(id, formData);
      // Re-fetch or update row status locally if we have the agreementId
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to report payment', isLoading: false });
      throw err;
    }
  },

  confirmPayment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await ledgerApi.confirmPayment(id);
      const updatedRows = get().rows.map(row => 
        row.id === id ? { ...row, status: 'PAID' } : row
      );
      set({ rows: updatedRows, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to confirm payment', isLoading: false });
      throw err;
    }
  },

  rejectPayment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await ledgerApi.rejectPayment(id);
      const updatedRows = get().rows.map(row => 
        row.id === id ? { ...row, status: 'UNPAID' } : row
      );
      set({ rows: updatedRows, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reject payment', isLoading: false });
      throw err;
    }
  },
}));
