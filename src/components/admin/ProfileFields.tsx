'use client';

import { Field } from './Field';
import { MediaPicker } from './MediaPicker';

export type ProfileValue = { name: string; slug: string; jobTitle: string; bio: string; avatar: string; sameAs: string[]; expertise: string[] };

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

// Author-profile fields, shared by the Users edit screen and the own-profile screen.
export function ProfileFields({ v, set, errors }: { v: ProfileValue; set: (v: ProfileValue) => void; errors: Record<string, string> }) {
  return (
    <>
      <div className="adm-grid">
        <Field label="Name" error={errors.name}>
          <input value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} required maxLength={100} />
        </Field>
        <Field label="Job title" error={errors.jobTitle}>
          <input value={v.jobTitle} onChange={(e) => set({ ...v, jobTitle: e.target.value })} maxLength={100} />
        </Field>
        <Field label="Author slug" hint="Public author page: /authors/your-slug" error={errors.slug}>
          <input value={v.slug} onChange={(e) => set({ ...v, slug: e.target.value.toLowerCase() })} maxLength={100} />
        </Field>
      </div>
      <Field label="Bio" hint="Shown on posts and the author page" error={errors.bio}>
        <textarea value={v.bio} onChange={(e) => set({ ...v, bio: e.target.value })} maxLength={1000} rows={4} />
      </Field>
      <MediaPicker label="Photo" value={v.avatar} onChange={(avatar) => set({ ...v, avatar })} error={errors.avatar} />
      <Field label="Profile links" hint="One https:// link per line (LinkedIn, X…)" error={Object.entries(errors).find(([k]) => k.startsWith('sameAs'))?.[1]}>
        <textarea defaultValue={v.sameAs.join('\n')} onChange={(e) => set({ ...v, sameAs: lines(e.target.value) })} rows={3} />
      </Field>
      <Field label="Expertise" hint="Separate with commas">
        <input defaultValue={v.expertise.join(', ')} onChange={(e) => set({ ...v, expertise: list(e.target.value) })} />
      </Field>
    </>
  );
}
