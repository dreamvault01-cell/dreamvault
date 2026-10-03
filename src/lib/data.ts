import prisma from './prisma';

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  price: number;
  originalPrice: number;
  image: string;
  badge?: string;
  rating: number;
  reviews: number;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount?: number;
}

const mapProduct = (p: any): Product => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  category: p.category.name,
  categorySlug: p.category.slug,
  price: p.price,
  originalPrice: p.price + 500, // mock original price
  image: p.image,
  badge: p.badge || undefined,
  rating: 4.8, // mock rating
  reviews: 124, // mock reviews
  description: p.description,
});

export async function getProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({ include: { category: true } });
  return products.map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true }
  });
  if (!product) return undefined;
  return mapProduct(product);
}

export async function getCategories(): Promise<Category[]> {
  const cats = await prisma.category.findMany({
    include: { _count: { select: { products: true } } }
  });
  return cats.map(c => ({
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
    where: { category: { slug } },
    include: { category: true }
  });
  return products.map(mapProduct);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    take: 8,
    include: { category: true }
  });
  return products.map(mapProduct);
}
