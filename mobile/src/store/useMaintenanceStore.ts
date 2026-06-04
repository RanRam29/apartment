import { create } from 'zustand';
import { maintenanceApi } from '../services/api';

interface MaintenanceState {
  tickets: any[];
  isLoading: boolean;
  error: string | null;

  fetchTicketsForAgreement: (agreementId: string) => Promise<void>;
  createTicket: (formData: FormData) => Promise<void>;
  respondToTicket: (id: string, data: any) => Promise<void>;
  closeTicket: (id: string) => Promise<void>;
  uploadInvoice: (id: string, formData: FormData) => Promise<void>;
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  tickets: [],
  isLoading: false,
  error: null,

  fetchTicketsForAgreement: async (agreementId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await maintenanceApi.getForAgreement(agreementId);
      set({ tickets: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch maintenance tickets', isLoading: false });
      throw err;
    }
  },

  createTicket: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      await maintenanceApi.create(formData);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to create ticket', isLoading: false });
      throw err;
    }
  },

  respondToTicket: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await maintenanceApi.respond(id, data);
      const updatedTickets = get().tickets.map(t => 
        t.id === id ? { ...t, ...res.data } : t
      );
      set({ tickets: updatedTickets, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to respond to ticket', isLoading: false });
      throw err;
    }
  },

  closeTicket: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await maintenanceApi.close(id);
      const updatedTickets = get().tickets.map(t => 
        t.id === id ? { ...t, ...res.data } : t
      );
      set({ tickets: updatedTickets, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to close ticket', isLoading: false });
      throw err;
    }
  },

  uploadInvoice: async (id, formData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await maintenanceApi.uploadInvoice(id, formData);
      // Wait, uploadInvoice returns the invoice or updated ticket. Let's refresh tickets for the agreement
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to upload invoice', isLoading: false });
      throw err;
    }
  },
}));
