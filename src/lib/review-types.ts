import 'server-only';

import prisma from './prisma';

const PHOTO_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*dreamvault\/reviews\//i;

export type PublicProductReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photoUrls: string[];
  displayName: string;
  createdAt: string;
  verifiedBuyer: true;
};

export type ReviewSummary = {
  count: number;
  average: number;
};

function safePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((photo): photo is string => typeof photo === 'string' && PHOTO_URL_PATTERN.test(photo)).slice(0, 5);
}

function displayName(firstName: string | null, lastName: string | null) {
  const first = firstName?.trim();
  const lastInitial = lastName?.trim().charAt(0);
  if (first && lastInitial) return `${first} ${lastInitial}.`;
  return first || 'Verified customer';
}

export async function getApprovedProductReviews(productId: string): Promise<{ reviews: PublicProductReview[]; summary: ReviewSummary }> {
  const rows = await prisma.productReview.findMany({
    where: { productId, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      photoUrls: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  const reviews = rows.map((review) => ({
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    photoUrls: safePhotoUrls(review.photoUrls),
    displayName: displayName(review.user.firstName, review.user.lastName),
    createdAt: review.createdAt.toISOString(),
    verifiedBuyer: true as const,
  }));
  const count = reviews.length;
  const average = count ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / count) * 10) / 10 : 0;
  return { reviews, summary: { count, average } };
}

export async function findEligibleReviewOrder(userId: string, productId: string) {
  return prisma.order.findFirst({
    where: {
      userId,
      paymentStatus: { in: ['PAID', 'REFUNDED'] },
      items: { some: { productId } },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
}
