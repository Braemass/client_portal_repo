// lib/site.ts

// Public site origin used for redirects (OAuth, email links, etc.)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Centralized app routes
export const ROUTES = {
  login: '/login',
  profile: '/profile',
  admin: '/admin',
  resetPassword: '/reset-password',
} as const;

// Named redirects expected by other modules
export const ADMIN_REDIRECT = ROUTES.admin;
export const DEFAULT_USER_REDIRECT = ROUTES.profile;

// Admin emails are provided via env (comma-separated).
// Example (.env.local or Vercel Project -> Settings -> Env Vars):
// NEXT_PUBLIC_ADMIN_EMAILS="braemass22@gmail.com,another-admin@domain.com"
const adminsFromEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS_ARRAY = adminsFromEnv;
export const ADMIN_EMAILS = new Set<string>(adminsFromEnv);

// Simple checker used in middleware/callback routing
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

// Build an invite link that pre-fills email and optional next path
export function inviteLink(email: string, next: string = DEFAULT_USER_REDIRECT): string {
  const url = new URL(`${SITE_URL}${ROUTES.login}`);
  url.searchParams.set('email', email);
  url.searchParams.set('next', next);
  return url.toString();
}

// Absolute URLs commonly used for Supabase email templates / redirectTo
export const REDIRECTS = {
  resetPassword: `${SITE_URL}${ROUTES.resetPassword}`,
  afterLoginDefault: `${SITE_URL}${DEFAULT_USER_REDIRECT}`,
} as const;

