import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';
import { hasSameOrigin } from '@/lib/request-origin';

// GET /api/admin/categories — List all categories
export async function GET() {
  try {
    await requireAdminApi();
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/admin/categories — Create a category
export async function POST(req: Request) {
  try {
    await requireAdminApi();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: 'Please perform this action from the DreamVault dashboard.' }, { status: 403 });
    const body = await req.json();
    const { name, slug, description, image } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name, slug, description: description || null, image: image || null },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
