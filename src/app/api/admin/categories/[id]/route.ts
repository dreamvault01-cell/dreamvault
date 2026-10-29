import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';
import { hasSameOrigin } from '@/lib/request-origin';

// PUT /api/admin/categories/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: 'Please perform this action from the DreamVault dashboard.' }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const { name, slug, description, image } = body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: 'Please perform this action from the DreamVault dashboard.' }, { status: 403 });
    const { id } = await params;

    // Check if any products are using this category
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${productCount} products are in this category. Move them first.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
