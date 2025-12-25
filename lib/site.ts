// lib/site.ts

// Public site origin (used for email links & redirects)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Central place for app routes
export const ROUTES = {
  login: '/login',
  profile: '/profile',
  admin: '/admin',
  signout: '/auth/signout',
  callback: '/auth/callback',
  resetPassword: '/reset-password',
} as const;

// Where to send users after auth
export const DEFAULT_USER_REDIRECT = ROUTES.profile;
export const ADMIN_REDIRECT = ROUTES.admin;

// Admin emails (comma-separated in env). Default includes your address.
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'braemass22@gmail.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Helper to check if an email is an admin
export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

// ---- Invite link helper (fixes your build) ----
// This does NOT create a Supabase invite by itself.
// It generates a deep link to your login with prefilled email and next path.
// Your InviteButton can copy/send this link, or you can swap to a server route
// that calls the Supabase Admin API if you want true email invites.
export function inviteLink(email: string, next: string = DEFAULT_USER_REDIRECT): string {
  const url = new URL(`${SITE_URL}${ROUTES.login}`);
  url.searchParams.set('prefill', email);
  url.searchParams.set('invite', '1');
  url.searchParams.set('next', next);
  return url.toString();
}

