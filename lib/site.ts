export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
}

export function inviteLink(email: string, next = '/projects') {
  const base = siteUrl();
  const u = new URL('/login', base);
  u.searchParams.set('mode', 'signup');
  u.searchParams.set('email', email);
  u.searchParams.set('next', next);
  return u.toString();
}

