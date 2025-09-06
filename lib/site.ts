// lib/site.ts
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const ROUTES = {
  home: '/',
  login: '/login',
  profile: '/profile',
  admin: '/admin',
  resetPassword: '/reset-password',
} as const;

export const ADMIN_REDIRECT = ROUTES.admin;
export const DEFAULT_USER_REDIRECT = ROUTES.profile;

const DEFAULT_ADMINS = ['braemass22@gmail.com'];

const adminsFromEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || DEFAULT_ADMINS.join(','))
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS_ARRAY = adminsFromEnv;
export const ADMIN_EMAILS = new Set<string>(adminsFromEnv);

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}
export const isAdminEmail = (email?: string | null) => isAdmin(email);

export function inviteLink(email: string, next: string = DEFAULT_USER_REDIRECT): string {
  const url = new URL(`${SITE_URL}${ROUTES.login}`);
  url.searchParams.set('email', email);
  url.searchParams.set('next', next);
  return url.toString();
}

export const REDIRECTS = {
  resetPassword: `${SITE_URL}${ROUTES.resetPassword}`,
  afterLoginDefault: `${SITE_URL}${DEFAULT_USER_REDIRECT}`,
} as const;

