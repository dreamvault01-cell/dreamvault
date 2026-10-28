import prisma from './prisma';
import { Prisma } from '@prisma/client';

export interface ProductVariantData {
  id: string;
  size: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number;
}

export interface ProductImageData {
  id: string;
  url: string;
  alt: string | null;
  isRoomPreview: boolean;
  position: number;
}

export interface ProductTagData {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  images: ProductImageData[];
  badge?: string;
  status: string;
  description: string;
  shortDescription?: string;
  variants: ProductVariantData[];
  tags: ProductTagData[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount?: number;
}

// Include images and tags in all product queries
const productInclude = {
  category: true,
  variants: { orderBy: { size: 'asc' as const } },
  images: { orderBy: { position: 'asc' as const } },
  tags: true,
};

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

const mapProduct = (p: ProductWithRelations): Product => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  category: p.category.name,
  categorySlug: p.category.slug,
  price: p.price,
  compareAtPrice: p.compareAtPrice,
  image: p.image,
  images: (p.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    alt: img.alt,
    isRoomPreview: img.isRoomPreview,
    position: img.position,
  })),
  badge: p.badge || undefined,
  status: p.status,
  description: p.description,
  shortDescription: p.shortDescription || undefined,
  variants: p.variants.map((v) => ({
    id: v.id,
    size: v.size,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    sku: v.sku,
    stock: v.stock,
  })),
  tags: (p.tags || []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  })),
});

export async function getProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: productInclude,
  });
  return products.map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
  if (!product) return undefined;
  return mapProduct(product);
}

export async function getCategories(): Promise<Category[]> {
  const cats = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || '',
    image: c.image || '',
    productCount: c._count.products,
  }));
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { category: { slug }, status: 'ACTIVE' },
    include: productInclude,
  });
  return products.map(mapProduct);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    take: 8,
    include: productInclude,
  });
  return products.map(mapProduct);
}
