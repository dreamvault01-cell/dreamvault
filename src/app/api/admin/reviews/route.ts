import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';
import { hasSameOrigin } from '@/lib/request-origin';

export async function GET() {
  try {
    await requireAdminApi();
    const reviews = await prisma.productReview.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        product: { select: { name: true, slug: true, image: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return NextResponse.json(reviews);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminApi();
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Please perform this action from the admin dashboard.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const status = body?.status === 'APPROVED' || body?.status === 'REJECTED' ? body.status : null;
    if (!id || !status) return NextResponse.json({ error: 'A review and moderation status are required.' }, { status: 400 });
    const review = await prisma.productReview.update({ where: { id }, data: { status, moderatedAt: new Date(), moderatedBy: admin.id, moderationNote: typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null }, select: { product: { select: { slug: true } } } });
    revalidatePath(`/product/${review.product.slug}`);
    return NextResponse.json({ updated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 });
  }
}
