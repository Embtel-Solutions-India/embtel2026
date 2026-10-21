import type mongoose from 'mongoose';
import { toSlug } from '@/lib/slug';

export const MIGRATION_001 = '001-roles-and-authors';

// Raw collection ops on purpose: legacy docs may not satisfy the current model enum.
export async function runMigration001(
  db: mongoose.Connection,
): Promise<{ rolesUpdated: number; slugsAdded: number }> {
  const users = db.collection('users');

  const roles = await users.updateMany({ role: 'editor' }, { $set: { role: 'marketing' } });

  const taken = new Set<string>(
    (await users.find({ slug: { $type: 'string' } }, { projection: { slug: 1 } }).toArray()).map(
      (u) => u.slug as string,
    ),
  );
  const missing = await users
    .find({ slug: { $not: { $type: 'string' } } }, { projection: { name: 1 } })
    .sort({ _id: 1 })
    .toArray();

  for (const u of missing) {
    const base = toSlug(typeof u.name === 'string' ? u.name : '') || 'user';
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    taken.add(slug);
    await users.updateOne({ _id: u._id }, { $set: { slug } });
  }

  return { rolesUpdated: roles.modifiedCount, slugsAdded: missing.length };
}
