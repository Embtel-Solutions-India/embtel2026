'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { passwordLinkAction, updateUserAction } from '@/app/admin/(panel)/users/actions';
import type { UserDetail } from '@/lib/admin/users';
import { Field } from './Field';
import { OneTimeLink } from './OneTimeLink';
import { ProfileFields, type ProfileValue } from './ProfileFields';

export function UserEditForm({ user }: { user: UserDetail }) {
  const router = useRouter();
  const [v, setV] = useState<ProfileValue>({ name: user.name, slug: user.slug, jobTitle: user.jobTitle, bio: user.bio, avatar: user.avatar, sameAs: user.sameAs, expertise: user.expertise });
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [link, setLink] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setErrors({});
    setMsg('');
    const r = await updateUserAction({ id: user.id, ...v, role, active });
    if (!r.ok) {
      setError(r.error);
      setErrors(r.fieldErrors ?? {});
      return;
    }
    setMsg('Saved');
    router.refresh();
  }

  async function newLink() {
    setError('');
    const r = await passwordLinkAction({ id: user.id });
    if (!r.ok) return setError(r.error);
    setLink(r.data!.path);
  }

  return (
    <div className="adm-stack">
      <form onSubmit={submit} className="adm-card adm-stack" aria-label="Edit user">
        <p className="adm-hint">{user.email}</p>
        <div className="adm-grid">
          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="marketing">Marketing</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </div>
        <label className="adm-check">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active (can sign in)
        </label>
        <h2>Author profile</h2>
        <ProfileFields v={v} set={setV} errors={errors} />
        <div className="adm-row">
          <button type="submit" className="adm-btn adm-btn-primary">
            Save
          </button>
          <span role="status" className="adm-ok">
            {msg}
          </span>
        </div>
        {error && (
          <p role="alert" className="adm-error">
            {error}
          </p>
        )}
      </form>
      <section className="adm-card adm-stack" aria-labelledby="pw-link">
        <h2 id="pw-link">Password</h2>
        <p className="adm-hint">Create a one-time link (valid 30 minutes) so {user.name} can set a new password.</p>
        <div>
          <button type="button" className="adm-btn" onClick={newLink}>
            Create password link
          </button>
        </div>
        {link && <OneTimeLink path={link} who={user.name} />}
      </section>
    </div>
  );
}
