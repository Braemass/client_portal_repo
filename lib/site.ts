// lib/site.ts

/** Public site origin (used for OAuth redirectTo, invite links, etc.) */
const FALLBACK_DOMAIN =
  'https://client-portal-repo-hs8le17ox-braedons-projects-64bd4c3a.vercel.app';

export const SITE_URL: string =
  (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  FALLBACK_DOMAIN;

/** Comma-separated admin emails, case-insensitive */
export const ADMIN_EMAILS: string[] = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
  'braemass22@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const DEFAULT_USER_REDIRECT = '/profile';
export const ADMIN_REDIRECT = '/admin';

/** Route helpers referenced around the app/middleware */
export const ROUTES = {
  login: '/login',
  profile: '/profile',
  admin: '/admin',
  signout: '/auth/signout',
  callback: '/auth/callback',
  resetPassword: '/reset-password',
} as const;

/** Check if an email is an admin */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
// Back-compat alias (some files import { isAdmin } from '@/lib/site')
export const isAdmin = isAdminEmail;

/**
 * Build a client invite link.
 * This pre-fills the email on the login page and passes an intent + next redirect.
 * Example output: https://…/login?email=user%40mail.com&intent=invite&next=/profile
 */
export function inviteLink(
  email: string,
  next: string = DEFAULT_USER_REDIRECT
): string {
  const url = new URL(ROUTES.login, SITE_URL);
  url.searchParams.set('email', email);
  url.searchParams.set('intent', 'invite');
  url.searchParams.set('next', next);
  return url.toString();
}

