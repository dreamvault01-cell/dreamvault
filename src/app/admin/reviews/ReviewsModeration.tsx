'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photoUrls: unknown;
  status: string;
  createdAt: string;
  product: { name: string; slug: string; image: string };
  user: { firstName: string | null; lastName: string | null; email: string };
};

function photos(value: unknown) { return Array.isArray(value) ? value.filter((url): url is string => typeof url === 'string') : []; }

export default function ReviewsModeration() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => fetch('/api/admin/reviews').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load reviews.'); setReviews(data); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load reviews.'));
  useEffect(() => { load(); }, []);
  const moderate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setBusy(id); setError('');
    const response = await fetch('/api/admin/reviews', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    if (!response.ok) { const data = await response.json().catch(() => null); setError(data?.error || 'Could not update review.'); } else await load();
    setBusy(null);
  };
  const pending = reviews.filter((review) => review.status === 'PENDING');
  return <>
    <div className="admin-page-header"><div><h1 className="admin-page-title">Reviews</h1><p className="admin-page-subtitle">{pending.length} awaiting moderation · approved reviews appear publicly</p></div></div>
    {error && <p className="admin-order-error">{error}</p>}
    {reviews.length === 0 ? <div className="admin-empty"><p>No reviews submitted yet.</p></div> : <div className="admin-review-list">{reviews.map((review) => <article className="admin-card admin-review-card" key={review.id}><div className="admin-review-top"><div><strong>{review.product.name}</strong><span>{review.user.firstName || 'Customer'} {review.user.lastName || ''} · {review.user.email}</span></div><span className={`admin-status ${review.status === 'APPROVED' ? 'admin-status-delivered' : review.status === 'REJECTED' ? 'admin-status-cancelled' : 'admin-status-pending'}`}>{review.status}</span></div><div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></div>{review.title && <h2>{review.title}</h2>}<p>{review.body}</p>{photos(review.photoUrls).length > 0 && <div className="admin-review-photos">{photos(review.photoUrls).map((url) => <Image key={url} src={url} alt="Customer wall photo" width={100} height={100} />)}</div>}{review.status === 'PENDING' && <div className="admin-review-actions"><button className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy === review.id} onClick={() => moderate(review.id, 'APPROVED')}>Approve</button><button className="admin-btn admin-btn-danger admin-btn-sm" disabled={busy === review.id} onClick={() => moderate(review.id, 'REJECTED')}>Reject</button></div>}</article>)}</div>}
  </>;
}
