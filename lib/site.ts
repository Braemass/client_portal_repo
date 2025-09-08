// lib/site.ts
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const ROUTES = {
  login: '/login',
  profile: '/profile',
  admin: '/admin',
  callback: '/auth/callback',
  signout: '/auth/signout',
  resetPassword: '/reset-password',
} as const;

const rawAdmins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS = new Set(rawAdmins);
export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.has(email.toLowerCase());

export const DEFAULT_USER_REDIRECT = ROUTES.profile;
export const ADMIN_REDIRECT = ROUTES.admin;

