// lib/site.ts

// Public site origin used for redirects (OAuth, email links, etc.)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Centralized app routes
export const ROUTES = {
  home: '/',
  login: '/login',
  profile: '/profile',
  admin: '/admin',
  resetPassword: '/reset-password',
} as const;

// Named redirects used elsewhere
export const ADMIN_REDIRECT = ROUTES.admin;
export const DEFAULT_USER_REDIRECT = ROUTES.profile;

// Default admin(s) if env is missing — includes your email so you always get admin in preprod
const DEFAULT_ADMINS = ['braemass22@gmail.com'];

// Admin emails via env (comma-separated). Example:
// NEXT_PUBLIC_ADMIN_EMAILS="braemass22@gmail.com,another@domain.com"
const adminsFromEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || DEFAULT_ADMINS.join(','))
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS_ARRAY = adminsFromEnv;
export const ADMIN_EMAILS = new Set<string>(adminsFromEnv);

// Primary checker
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

// Alias to satisfy existing imports elsewhere (e.g., UserBarServer.tsx)
export const isAdminEmail = (email?: string | null) => isAdmin(email);

// Build an invite/sign-in link that pre-fills email and optional next path
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

