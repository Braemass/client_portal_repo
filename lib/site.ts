// lib/site.ts

// --- Base URL detection (works on Vercel + locally) ---
const fallbackDomain =
  'https://client-portal-repo-hs8le17ox-braedons-projects-64bd4c3a.vercel.app';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL
    // If running on Vercel without NEXT_PUBLIC_SITE_URL set, infer from VERCEL_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    // Extremely defensive fallback
    ?? fallbackDomain;

const ensureLeadingSlash = (p: string) => (p.startsWith('/') ? p : `/${p}`);

export const absoluteUrl = (path: string) =>
  new URL(ensureLeadingSlash(path), SITE_URL).toString();

export const AUTH_CALLBACK_URL = absoluteUrl('/auth/callback');
export const RESET_PASSWORD_URL = absoluteUrl('/reset-password');

// Optional: centralize where non-admin users should land after auth
export const DEFAULT_CLIENT_LANDING = '/profile';
export const DEFAULT_ADMIN_LANDING = '/admin';

// Build a login URL with optional prefilled email & next redirect
export function loginUrl(params?: { email?: string; next?: string }) {
  const url = new URL(absoluteUrl('/login'));
  if (params?.email) url.searchParams.set('email', params.email);
  if (params?.next) url.searchParams.set('next', params.next);
  return url.toString();
}

// For invite buttons/components (prefill email + send them to /profile after auth)
export function inviteLink(email: string, next = DEFAULT_CLIENT_LANDING) {
  return loginUrl({ email, next });
}

