import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import WishlistRemoveButton from './WishlistRemoveButton';

export default async function WishlistPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect('/sign-in?redirect_url=/wishlist');
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id }, select: { id: true } });
  const items = user ? await prisma.wishlistItem.findMany({
    where: { userId: user.id, product: { status: 'ACTIVE' } },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { id: true, name: true, slug: true, image: true, price: true, compareAtPrice: true, category: { select: { name: true } } } } },
  }) : [];

  return <main className="container wishlist-page">
    <header className="wishlist-header"><span className="eyebrow">Your saved collection</span><h1>Save for <em>later.</em></h1><p>Keep the pieces you love close while you decide what belongs on your wall.</p></header>
    {items.length === 0 ? <section className="wishlist-empty"><Heart size={40} strokeWidth={1.2} /><h2>Your wishlist is empty</h2><p>Save a print from any collection and it will appear here.</p><Link href="/collections" className="btn btn-primary">Explore prints</Link></section> : <div className="wishlist-grid">{items.map(({ product }) => <article className="wishlist-card" key={product.id}><Link href={`/product/${product.slug}`} className="wishlist-card-image"><Image src={product.image} alt={product.name} width={400} height={400} /></Link><div className="wishlist-card-body"><span>{product.category.name}</span><Link href={`/product/${product.slug}`}><h2>{product.name}</h2></Link><strong>₹{product.price}</strong><WishlistRemoveButton productId={product.id} /></div></article>)}</div>}
  </main>;
}
