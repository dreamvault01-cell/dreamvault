'use client';

import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WishlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: { items?: string[] } | null) => { if (active) setSaved(Boolean(data?.items?.includes(productId))); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [productId]);

  const toggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    const response = await fetch('/api/wishlist', {
      method: saved ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    }).catch(() => null);
    if (response?.status === 401) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`);
    } else if (response?.ok) {
      setSaved(!saved);
    }
    setBusy(false);
  };

  return <button className={`product-card-action-btn ${saved ? 'is-saved' : ''}`} title={saved ? 'Remove from wishlist' : 'Add to wishlist'} aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={saved} disabled={busy} onClick={toggle}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>;
}
