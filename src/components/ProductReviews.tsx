'use client';

import Image from 'next/image';
import { Camera, CheckCircle2, Star, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SignInButton, useUser } from '@clerk/nextjs';
import type { PublicProductReview, ReviewSummary } from '@/lib/review-types';

type ReviewResponse = {
  reviews: PublicProductReview[];
  summary: ReviewSummary;
  authenticated: boolean;
  canReview: boolean;
  existingReview: { status: string } | null;
};

export default function ProductReviews({ productId, initialReviews, initialSummary }: { productId: string; initialReviews: PublicProductReview[]; initialSummary: ReviewSummary }) {
  const { isSignedIn } = useUser();
  const [data, setData] = useState<ReviewResponse>({ reviews: initialReviews, summary: initialSummary, authenticated: Boolean(isSignedIn), canReview: false, existingReview: null });
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((next: ReviewResponse | null) => { if (next) setData(next); })
      .catch(() => undefined);
  }, [productId, isSignedIn]);

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    if (photoUrls.length + files.length > 5) { setMessage('You can add up to five photos.'); return; }
    setUploading(true); setMessage('');
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData(); form.append('file', file);
        const response = await fetch('/api/reviews/upload', { method: 'POST', body: form });
        const result = await response.json().catch(() => null);
        if (!response.ok || typeof result?.url !== 'string') throw new Error(result?.error || 'Photo upload failed.');
        uploaded.push(result.url);
      }
      setPhotoUrls((current) => [...current, ...uploaded]);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Photo upload failed.'); }
    finally { setUploading(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage('');
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, rating, title, body, photoUrls }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) setMessage(result?.error || 'Could not submit your review.');
    else { setMessage('Thanks — your review is waiting for moderation.'); setData((current) => ({ ...current, canReview: false, existingReview: { status: 'PENDING' } })); setTitle(''); setBody(''); setPhotoUrls([]); }
    setSaving(false);
  };

  return <section className="product-reviews" aria-labelledby="reviews-heading"><div className="product-reviews-header"><div><span className="section-eyebrow">From our collectors</span><h2 id="reviews-heading">Customer <span className="accent">reviews.</span></h2></div><div className="review-summary"><strong>{data.summary.average ? data.summary.average.toFixed(1) : '—'}</strong><span className="review-stars">{data.summary.count ? `${'★'.repeat(Math.round(data.summary.average))}${'☆'.repeat(5 - Math.round(data.summary.average))}` : 'No ratings yet'}</span><small>{data.summary.count} verified review{data.summary.count === 1 ? '' : 's'}</small></div></div>
    <div className="product-reviews-grid"><div className="review-list">{data.reviews.length === 0 ? <p className="review-empty">Be the first collector to share how this piece looks in your space.</p> : data.reviews.map((review) => <article className="review-card" key={review.id}><div className="review-card-top"><div><strong>{review.displayName}</strong><span><CheckCircle2 size={14} /> Verified buyer</span></div><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</time></div><div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></div>{review.title && <h3>{review.title}</h3>}<p>{review.body}</p>{review.photoUrls.length > 0 && <div className="review-photo-grid">{review.photoUrls.map((url) => <Image key={url} src={url} alt={`Wall photo shared by ${review.displayName}`} width={160} height={160} />)}</div>}</article>)}</div><aside className="review-form-card"><h3>Share your wall</h3><p>Reviews are available to verified buyers and are published after a quick moderation check.</p>{!isSignedIn ? <SignInButton mode="modal"><button type="button" className="btn btn-primary">Sign in to review</button></SignInButton> : data.existingReview ? <p className="review-form-note">{data.existingReview.status === 'APPROVED' ? 'Your review is published.' : 'Your review is waiting for moderation.'}</p> : !data.canReview ? <p className="review-form-note">Purchase this print to unlock a verified review.</p> : <form onSubmit={submit}><label>Rating<div className="review-rating-input">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} aria-pressed={rating === value} onClick={() => setRating(value)}><Star size={20} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div></label><label>Title <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="What stood out?" /></label><label>Your review <textarea value={body} minLength={10} maxLength={4000} required onChange={(event) => setBody(event.target.value)} placeholder="Tell other collectors about the print and your space." /></label><label className="review-upload"><span><Camera size={16} /> Wall photos <small>(optional, up to 5)</small></span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={(event) => { void uploadPhotos(event.target.files); event.currentTarget.value = ''; }} /><span className="btn btn-secondary"><Upload size={15} /> {uploading ? 'Uploading…' : 'Add photos'}</span></label>{photoUrls.length > 0 && <div className="review-upload-list">{photoUrls.map((url) => <Image key={url} src={url} alt="Selected wall photo" width={56} height={56} />)}</div>}{message && <p className="review-form-message">{message}</p>}<button type="submit" className="btn btn-primary" disabled={saving || uploading}>{saving ? 'Submitting…' : 'Submit for review'}</button></form>}</aside></div></section>;
}
