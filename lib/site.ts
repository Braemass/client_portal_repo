export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
}

export function inviteLink(email: string, next = '/profile') {
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://client-portal-repo-hs8le17ox-braedons-projects-64bd4c3a.vercel.app';

export const AUTH_CALLBACK = `${SITE_URL}/auth/callback`;
export const RESET_PASSWORD_URL = `${SITE_URL}/reset-password`;

  const base = siteUrl();
  const u = new URL('/login', base);
  u.searchParams.set('mode', 'signup');
  u.searchParams.set('email', email);
  u.searchParams.set('next', next);
  return u.toString();
}

