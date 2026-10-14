/** Account that is always admin and cannot be demoted via the UI/RPC. */
export const SUPERADMIN_EMAIL = 'flavioangeleu@gmail.com';

export function isSuperadminEmail(email: string | null | undefined): boolean {
  return (email ?? '').toLowerCase() === SUPERADMIN_EMAIL;
}
