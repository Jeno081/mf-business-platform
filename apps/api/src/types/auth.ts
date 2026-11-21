export const ADMIN_ROLES = ['SUPPORT', 'STOCK', 'MANAGER', 'SUPER_ADMIN'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}
