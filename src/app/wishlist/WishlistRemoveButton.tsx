'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useState } from 'react';

export default function WishlistRemoveButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button type="button" className="wishlist-remove" disabled={busy} onClick={async () => {
    setBusy(true);
    const response = await fetch('/api/wishlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
    if (response.ok) router.refresh();
    setBusy(false);
  }}><Heart size={15} fill="currentColor" /> {busy ? 'Removing…' : 'Remove'}</button>;
}
