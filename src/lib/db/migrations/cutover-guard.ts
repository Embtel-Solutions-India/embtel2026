// Migration 001 renames editor -> marketing, which locks Marketing users out of the legacy
// blog-admin. Only run at cutover: require the flag AND the operator typing the DB name.
export function assertCutoverConfirmed(args: string[], typed: string, dbName: string): void {
  if (!args.includes('--cutover')) {
    throw new Error('Refusing to migrate: cutover only. Re-run with --cutover (see README "Database migrations").');
  }
  if (!dbName || typed.trim() !== dbName) {
    throw new Error('Refusing to migrate: typed database name does not match.');
  }
}
