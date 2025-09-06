// lib/site.ts

/**
 * Canonical site URL used in redirects and email templates.
 * Priority: NEXT_PUBLIC_SITE_URL → VERCEL_URL → localhost
 */
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

/**
 * Comma-separated list of admin emails. Defaults to your email.
 * Example env: NEXT_PUBLIC_ADMIN_EMAILS="you@domain.com,other@domain.com"
 */
export const ADMIN_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'braemass22@gmail.com'
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** Utility to check if an email is admin */
export const isAdminEmail = (email?: string | null): boolean =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

/** Where regular users should land after sign-in */
export const DEFAULT_USER_REDIRECT = '/profile';

/** Build an invite link that pre-fills the email and optional next path */
export function inviteLink(email: string, next: string = DEFAULT_USER_REDIRECT): string {
  const url = new URL(`${SITE_URL}/login`);
  url.searchParams.set('prefill', email);
  url.searchParams.set('mode', 'invite');
  url.searchParams.set('next', next);
  return url.toString();
}

