'use client';

import { useState } from 'react';
import { inviteLink } from '@/lib/site';

export default function InviteButton({
  email,
  next = '/projects', // or '/profile'
  label = 'Copy invite link',
}: {
  email: string;
  next?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const link = inviteLink(email, next);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      title={inviteLink(email, next)}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

