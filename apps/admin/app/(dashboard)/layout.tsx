import type { ReactNode } from 'react';
import { AdminChatProvider } from '@/components/AdminChatProvider';
import { AdminShell } from '@/components/AdminShell';
import { RequireAuth } from '@/components/RequireAuth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminChatProvider>
        <AdminShell>{children}</AdminShell>
      </AdminChatProvider>
    </RequireAuth>
  );
}
