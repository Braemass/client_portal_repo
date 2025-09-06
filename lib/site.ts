// lib/site.ts

NEXT_PUBLIC_ADMIN_EMAILS=braemass22@gmail.com

// Public site origin (used for OAuth redirectTo, etc)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window === 'undefined'
    ? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    : window.location.origin);

export const DEFAULT_USER_REDIRECT = '/profile';
export const ADMIN_REDIRECT = '/admin';

// Comma-separated admin emails (lowercased). Default includes your email.
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
  'braemass22@gmail.com')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

export const isAdmin = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

