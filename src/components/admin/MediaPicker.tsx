'use client';

import { Field } from './Field';

// Image URL field. The media library browser is added with the S3 media screen.
export function MediaPicker({ label, value, onChange, error }: { label: string; value: string; onChange: (url: string) => void; error?: string }) {
  return (
    <Field label={label} error={error}>
      <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" />
    </Field>
  );
}
