'use client';

import { useState } from 'react';
import { AdminIcon } from './AdminIcon';
import { Modal } from './Dialog';
import { InviteUserForm } from './InviteUserForm';

// "Invite a person" opens the invite form in a pop-up; the one-time link is shown there after creating it.
export function InviteDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="adm-btn adm-btn-primary" onClick={() => setOpen(true)}>
        <AdminIcon name="plus" size={16} />
        Invite a person
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite a person">
        <InviteUserForm />
      </Modal>
    </>
  );
}
