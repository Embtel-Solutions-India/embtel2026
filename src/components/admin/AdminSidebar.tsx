'use client';

import { useState } from 'react';
import type { Role } from '@/lib/auth/permissions';
import { AdminNav } from './AdminNav';

// Collapsible on small screens (menu button); always open from 768 px.
export function AdminSidebar({ role, children }: { role: Role; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="adm-side" data-open={open}>
      <div className="adm-row" style={{ justifyContent: 'space-between' }}>
        <span className="adm-brand">Embtel Admin</span>
        <button type="button" className="adm-btn adm-menu-btn" aria-expanded={open} aria-controls="adm-nav" onClick={() => setOpen(!open)}>
          Menu
        </button>
      </div>
      <nav id="adm-nav" aria-label="Admin">
        <AdminNav role={role} />
      </nav>
      {children}
    </div>
  );
}
