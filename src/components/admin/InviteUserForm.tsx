'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteUserAction } from '@/app/admin/(panel)/users/actions';
import { Field } from './Field';
import { OneTimeLink } from './OneTimeLink';

export function InviteUserForm() {
  const router = useRouter();
  const [link, setLink] = useState<{ path: string; who: string } | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError('');
    setFieldErrors({});
    const r = await inviteUserAction({ name: f.get('name'), email: f.get('email'), role: f.get('role') });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setFieldErrors(r.fieldErrors ?? {});
      return;
    }
    setLink({ path: r.data!.path, who: String(f.get('name')) });
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="adm-stack" aria-label="Invite a person">
      <div className="adm-grid">
        <Field label="Name" error={fieldErrors.name}>
          <input name="name" required maxLength={100} />
        </Field>
        <Field label="Email" error={fieldErrors.email}>
          <input name="email" type="email" required maxLength={254} />
        </Field>
        <Field label="Role" hint="Marketing: blog, media, SEO. Admin: everything.">
          <select name="role" defaultValue="marketing">
            <option value="marketing">Marketing</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
      </div>
      <div className="adm-row">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
          Create invite link
        </button>
      </div>
      {error && (
        <p role="alert" className="adm-error">
          {error}
        </p>
      )}
      {link && <OneTimeLink path={link.path} who={link.who} />}
    </form>
  );
}
