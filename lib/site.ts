// lib/site.ts
// Centralized site/runtime config & helpers

// --- Site origin -------------------------------------------------------------

// Prefer explicit env var; otherwise infer from Vercel; finally use a hard fallback.
const FALLBACK_DOMAIN =
  'https://client-portal-repo-hs8le17ox-braedons-projects-64bd4c3a.vercel.app';

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  FALLBACK_DOMAIN;

// Common redirect targets
export const DEFAULT_USER_REDIRECT = '/profile';
export const ADMIN_REDIRECT = '/admin';

// Supabase “redirectTo” targets (OAuth & email links)
export const OAUTH_REDIRECT = `${SITE_URL}/auth/callback`;
export const RECOVERY_REDIRECT = `${SITE_URL}/reset-password`;

// --- Admins ------------------------------------------------------------------

// Comma-separated list of admin emails (case-insensitive)
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'braemass22@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Predicate used across server/client
export const isAdmin = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());

// Back-compat alias (some files may import this name)
export const isAdminEmail = isAdmin;

// --- Links -------------------------------------------------------------------

// Build an invite/login link that pre-fills the email and optional next destination
export function inviteLink(email: string, next: string = DEFAULT_USER_REDIRECT) {
  const url = new URL('/login', SITE_URL);
  url.searchParams.set('email', email);
  if (next) url.searchParams.set('next', next);
  url.searchParams.set('mode', 'invite');
  return url.toString();
}

