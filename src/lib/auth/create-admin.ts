import { z } from 'zod';
import { User } from '@/lib/db/models/User';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export async function createAdmin(input: { name: string; email: string; password: string }): Promise<{ id: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));

  await User.init(); // ensure the unique email index exists before relying on E11000
  try {
    const u = await User.create({ ...parsed.data, role: 'admin' });
    return { id: String(u._id) };
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new Error('A user with that email already exists');
    throw e;
  }
}
