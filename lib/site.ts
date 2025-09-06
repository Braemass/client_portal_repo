// lib/site.ts

// Fallback to your deployed URL if nothing else is set
const fallbackDomain =
  'https://client-portal-repo-hs8le17ox-braedons-projects-64bd4c3a.vercel.app';

// Prefer NEXT_PUBLIC_SITE_URL, then VERCEL_URL, then localhost, then fallback
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000') ||
  fallbackDomain;

const ensureLeadingSlash = (p: string) => (p.startsWith('/') ? p : `/${p}`);

export const absoluteUrl = (path: string) =>
  new URL(ensureLeadingSlash(path), SITE_URL).toString();

export const AUTH_CALLBACK_URL = absoluteUrl('/auth/callback');
export const RESET_PASSWORD_URL = absoluteUrl('/reset-password');

export const DEFAULT_CLIENT_LANDING = '/profile';
export const DEFAULT_ADMIN_LANDING = '/admin';

export function loginUrl(params?: { email?: string; next?: string }) {
  const url = new URL(absoluteUrl('/login'));
  if (params?.email) url.searchParams.set('email', params.email);
  if (params?.next) url.searchParams.set('next', params.next);
  return url.toString();
}

export function inviteLink(email: string, next = DEFAULT_CLIENT_LANDING) {
  return loginUrl({ email, next });
}
