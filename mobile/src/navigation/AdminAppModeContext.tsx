import React, { createContext, useContext } from 'react';
import { useAuthStore } from '../store/useAuthStore';

type AdminPersona = 'tenant' | 'landlord';

const AdminAppModeContext = createContext<AdminPersona | undefined>(undefined);

/** Wraps the full tenant tab navigator so shared screens can detect admin “tenant” persona. */
export function AdminTenantShellProvider({ children }: { children: React.ReactNode }) {
  return (
    <AdminAppModeContext.Provider value="tenant">{children}</AdminAppModeContext.Provider>
  );
}

/** Wraps the full landlord tab navigator so shared screens can detect admin “landlord” persona. */
export function AdminLandlordShellProvider({ children }: { children: React.ReactNode }) {
  return (
    <AdminAppModeContext.Provider value="landlord">{children}</AdminAppModeContext.Provider>
  );
}

/**
 * True when the UI should behave as landlord: real landlords always;
 * admins depend on which admin shell tab they opened (tenant vs landlord).
 */
export function usePersonaIsLandlord(): boolean {
  const user = useAuthStore((s) => s.user);
  const adminPersona = useContext(AdminAppModeContext);

  const role = user?.activeRole || user?.role;
  if (role === 'landlord') return true;
  if (role === 'tenant') return false;
  if (role === 'admin') return adminPersona === 'landlord';
  return false;
}
