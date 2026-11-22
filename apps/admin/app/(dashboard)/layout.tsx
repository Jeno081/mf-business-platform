import type { ReactNode } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
