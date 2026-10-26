'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changePasswordAction, updateProfileAction } from '@/app/admin/(panel)/profile/actions';
import { Field } from './Field';
import { ProfileFields, type ProfileValue } from './ProfileFields';
import { PasswordInput } from './PasswordInput';

export function ProfileForms({ initial }: { initial: ProfileValue }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setErrors({});
    setMsg('');
    const r = await updateProfileAction(v);
    if (!r.ok) {
      setError(r.error);
      setErrors(r.fieldErrors ?? {});
      return;
    }
    setMsg('Saved');
    router.refresh();
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setPwError('');
    setPwMsg('');
    const r = await changePasswordAction({ current: f.get('current'), password: f.get('password'), confirm: f.get('confirm') });
    if (!r.ok) return setPwError(r.fieldErrors ? Object.values(r.fieldErrors).join(' ') : r.error);
    form.reset();
    setPwMsg('Password changed. Other devices have been signed out.');
  }

  return (
    <div className="adm-stack">
      <form onSubmit={save} className="adm-card adm-stack" aria-label="Author profile">
        <h2>Author profile</h2>
        <ProfileFields v={v} set={setV} errors={errors} />
        <div className="adm-row">
          <button type="submit" className="adm-btn adm-btn-primary">
            Save profile
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
      <form onSubmit={changePassword} className="adm-card adm-stack" aria-label="Change password">
        <h2>Change password</h2>
        <div className="adm-grid">
          <Field label="Current password">
            <PasswordInput name="current" autoComplete="current-password" required />
          </Field>
          <Field label="New password" hint="At least 12 characters">
            <PasswordInput name="password" autoComplete="new-password" minLength={12} maxLength={128} required />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput name="confirm" autoComplete="new-password" required />
          </Field>
        </div>
        <div className="adm-row">
          <button type="submit" className="adm-btn">
            Change password
          </button>
          <span role="status" className="adm-ok">
            {pwMsg}
          </span>
        </div>
        {pwError && (
          <p role="alert" className="adm-error">
            {pwError}
          </p>
        )}
      </form>
    </div>
  );
}
