'use client';

import { useEffect, useState } from 'react';
import type { Role } from '@/lib/auth/permissions';
import { AdminIcon } from './AdminIcon';
import { AdminNav } from './AdminNav';

// Fixed sidebar on wide screens; a slide-in drawer (with backdrop, Esc to close) under 960 px.
export function AdminSidebar({ role, footer }: { role: Role; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="adm-menu-btn" aria-expanded={open} aria-controls="adm-side" onClick={() => setOpen(true)}>
        <AdminIcon name="menu" />
        <span className="sr-only">Open menu</span>
      </button>
      {open && <div className="adm-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside id="adm-side" className="adm-side" data-open={open}>
        <div className="adm-side-head">
          <span className="adm-brand">
            Embtel<span className="adm-brand-sub">Admin</span>
          </span>
          <button type="button" className="adm-icon-btn adm-close-btn" onClick={() => setOpen(false)}>
            <AdminIcon name="close" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <nav aria-label="Admin" className="adm-side-nav">
          <AdminNav role={role} onNavigate={() => setOpen(false)} />
        </nav>
        <div className="adm-side-foot">{footer}</div>
      </aside>
    </>
  );
}
