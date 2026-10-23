import 'server-only';
import type { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { can, normalizeRole, type Permission } from '@/lib/auth/permissions';
import type { UserDoc } from '@/lib/db/models/User';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Thrown by services for problems the user can fix ("slug taken"); its message is shown as-is.
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export const NO_PERMISSION = 'You do not have permission to do that.';

function allowed(role: string, p: Permission): boolean {
  try {
    return can(normalizeRole(role), p);
  } catch {
    return false; // unknown role: deny
  }
}

// Every admin server action goes through this: session → permission → Zod → run.
// The proxy does not guard server actions, so this is the authorisation boundary.
export function adminAction<S extends z.ZodTypeAny, T>(
  permission: Permission,
  schema: S,
  run: (input: z.infer<S>, user: UserDoc) => Promise<T>,
): (input: unknown) => Promise<ActionResult<T>> {
  return async (input) => {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'Your session has expired. Sign in again.' };
    if (!allowed(user.role, permission)) return { ok: false, error: NO_PERMISSION };
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[i.path.join('.') || '_'] ??= i.message;
      return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
    }
    try {
      return { ok: true, data: await run(parsed.data, user) };
    } catch (e) {
      if (e instanceof UserFacingError) return { ok: false, error: e.message };
      if (e instanceof Error && e.name === 'ForbiddenError') return { ok: false, error: NO_PERMISSION };
      // Message only: input may hold personal data.
      console.error(`[admin:${permission}] action failed:`, e instanceof Error ? e.message : 'unknown error');
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  };
}

export const userCan = (user: Pick<UserDoc, 'role'>, p: Permission) => allowed(user.role, p);
