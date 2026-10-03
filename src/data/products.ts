export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  category: string;
  categorySlug: string;
  image: string;
  images: string[];
  description: string;
  sizes: string[];
  paperType: string;
  rating: number;
  reviews: number;
  tags: string[];
  badge?: string;
  inStock: boolean;
}

export interface Category {
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}

export const categories: Category[] = [
  {
    name: 'Abstract Art',
    slug: 'abstract-art',
    description: 'Bold geometric and fluid abstract compositions',
    image: '/images/products/abstract.jpg',
    productCount: 24,
  },
  {
    name: 'Nature & Landscapes',
    slug: 'nature-landscapes',
    description: 'Breathtaking vistas and serene natural beauty',
    image: '/images/products/nature.jpg',
    productCount: 32,
  },
  {
    name: 'Minimalist',
    slug: 'minimalist',
    description: 'Clean lines and elegant simplicity',
    image: '/images/products/minimal.jpg',
    productCount: 18,
  },
  {
    name: 'Movies & Cinema',
    slug: 'movies-cinema',
    description: 'Iconic movie posters and cinematic art',
    image: '/images/products/movie.jpg',
    productCount: 28,
  },
  {
    name: 'Anime & Manga',
    slug: 'anime-manga',
    description: 'Vibrant Japanese animation art prints',
    image: '/images/products/anime.jpg',
    productCount: 22,
  },
  {
    name: 'Wall Setup Packs',
    slug: 'wall-setup-packs',
    description: 'Curated poster sets for the perfect gallery wall',
    image: '/images/banners/hero.jpg',
    productCount: 15,
  },
];

export const products: Product[] = [
  {
    id: 'p1',
    name: 'Cosmic Geometry — Blue & Gold Abstract',
    slug: 'cosmic-geometry-blue-gold-abstract',
    price: 199,
    originalPrice: 499,
    category: 'Abstract Art',
    categorySlug: 'abstract-art',
    image: '/images/products/abstract.jpg',
    images: ['/images/products/abstract.jpg'],
    description:
      'A mesmerizing composition of deep blue and gold geometric shapes, inspired by sacred geometry and cosmic structures. Printed on premium 300 GSM matte art paper with archival-quality inks for vivid, long-lasting color. Each piece is hand-inspected before shipping.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.8,
    reviews: 142,
    tags: ['abstract', 'geometric', 'blue', 'gold', 'premium'],
    badge: 'Bestseller',
    inStock: true,
  },
  {
    id: 'p2',
    name: 'Golden Peaks — Dolomites Landscape',
    slug: 'golden-peaks-dolomites-landscape',
    price: 249,
    originalPrice: 599,
    category: 'Nature & Landscapes',
    categorySlug: 'nature-landscapes',
    image: '/images/products/nature.jpg',
    images: ['/images/products/nature.jpg'],
    description:
      'Capture the breathtaking beauty of the Dolomites at golden hour. This stunning landscape print features dramatic mountain peaks bathed in warm sunset light, reflected in crystal-clear alpine waters. A statement piece for any nature lover.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.9,
    reviews: 98,
    tags: ['nature', 'mountains', 'sunset', 'landscape', 'photography'],
    badge: 'New',
    inStock: true,
  },
  {
    id: 'p3',
    name: 'Silhouette — Minimalist Line Art',
    slug: 'silhouette-minimalist-line-art',
    price: 149,
    originalPrice: 399,
    category: 'Minimalist',
    categorySlug: 'minimalist',
    image: '/images/products/minimal.jpg',
    images: ['/images/products/minimal.jpg'],
    description:
      'An elegant single continuous line drawing capturing the graceful profile of a woman. This Scandinavian-inspired minimalist art piece brings sophistication and calm to any space. Printed on warm-toned premium paper.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.7,
    reviews: 76,
    tags: ['minimalist', 'line-art', 'scandinavian', 'elegant'],
    inStock: true,
  },
  {
    id: 'p4',
    name: "Danger's Edge — Retro Cinema Poster",
    slug: 'dangers-edge-retro-cinema-poster',
    price: 199,
    originalPrice: 499,
    category: 'Movies & Cinema',
    categorySlug: 'movies-cinema',
    image: '/images/products/movie.jpg',
    images: ['/images/products/movie.jpg'],
    description:
      'A stunning vintage-style cinematic movie poster featuring bold typography and dramatic character illustrations in a classic red, black, and gold color scheme. Perfect for film enthusiasts and collectors.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.6,
    reviews: 64,
    tags: ['movie', 'retro', 'vintage', 'cinema', 'action'],
    badge: 'Trending',
    inStock: true,
  },
  {
    id: 'p5',
    name: 'Neo-Kyoto Nights — Cyberpunk Anime',
    slug: 'neo-kyoto-nights-cyberpunk-anime',
    price: 179,
    originalPrice: 449,
    category: 'Anime & Manga',
    categorySlug: 'anime-manga',
    image: '/images/products/anime.jpg',
    images: ['/images/products/anime.jpg'],
    description:
      'Immerse yourself in the neon-drenched streets of Neo-Kyoto with this vibrant cyberpunk anime poster. Featuring stunning detail in vivid pink, cyan, and purple, this print brings the energy of Japanese animation to your walls.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.9,
    reviews: 112,
    tags: ['anime', 'cyberpunk', 'neon', 'japanese', 'manga'],
    badge: 'Hot',
    inStock: true,
  },
  {
    id: 'p6',
    name: 'Midnight Bloom — Dark Floral Abstract',
    slug: 'midnight-bloom-dark-floral-abstract',
    price: 219,
    originalPrice: 549,
    category: 'Abstract Art',
    categorySlug: 'abstract-art',
    image: '/images/products/abstract.jpg',
    images: ['/images/products/abstract.jpg'],
    description:
      'Dark moody floral abstract with deep purple, burgundy, and midnight blue tones. A sophisticated piece that adds depth and mystery to any room.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.5,
    reviews: 53,
    tags: ['abstract', 'floral', 'dark', 'moody'],
    inStock: true,
  },
  {
    id: 'p7',
    name: 'Aurora Dreams — Northern Lights',
    slug: 'aurora-dreams-northern-lights',
    price: 279,
    originalPrice: 649,
    category: 'Nature & Landscapes',
    categorySlug: 'nature-landscapes',
    image: '/images/products/nature.jpg',
    images: ['/images/products/nature.jpg'],
    description:
      'Witness the magical dance of the Aurora Borealis in this stunning landscape photograph. Vivid greens and purples sweep across a star-filled arctic sky.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.8,
    reviews: 87,
    tags: ['nature', 'aurora', 'night-sky', 'landscape'],
    badge: 'Staff Pick',
    inStock: true,
  },
  {
    id: 'p8',
    name: 'Zen Circle — Japanese Minimalism',
    slug: 'zen-circle-japanese-minimalism',
    price: 169,
    originalPrice: 429,
    category: 'Minimalist',
    categorySlug: 'minimalist',
    image: '/images/products/minimal.jpg',
    images: ['/images/products/minimal.jpg'],
    description:
      'A perfect enso circle in bold black ink on crisp white paper. This Japanese-inspired minimalist piece embodies the beauty of imperfection and the zen philosophy.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.7,
    reviews: 45,
    tags: ['minimalist', 'japanese', 'zen', 'ink'],
    inStock: true,
  },
  {
    id: 'p9',
    name: 'Gallery Wall Pack — Essentials Collection',
    slug: 'gallery-wall-pack-essentials',
    price: 599,
    originalPrice: 1499,
    category: 'Wall Setup Packs',
    categorySlug: 'wall-setup-packs',
    image: '/images/banners/hero.jpg',
    images: ['/images/banners/hero.jpg'],
    description:
      'Transform your space with our curated Essentials Gallery Wall Pack. Includes 8 perfectly coordinated posters in a mix of abstract, photography, and typography — everything you need for a stunning gallery wall.',
    sizes: ['8-Piece A4 Set', '8-Piece A3 Set'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.9,
    reviews: 203,
    tags: ['wall-setup', 'pack', 'gallery-wall', 'collection'],
    badge: 'Best Value',
    inStock: true,
  },
  {
    id: 'p10',
    name: 'Neon Samurai — Anime Warrior',
    slug: 'neon-samurai-anime-warrior',
    price: 189,
    originalPrice: 479,
    category: 'Anime & Manga',
    categorySlug: 'anime-manga',
    image: '/images/products/anime.jpg',
    images: ['/images/products/anime.jpg'],
    description:
      'A fierce samurai warrior in neon-lit rain, blending traditional Japanese aesthetics with modern cyberpunk style. Dynamic pose and vivid colors make this a standout piece.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.8,
    reviews: 91,
    tags: ['anime', 'samurai', 'neon', 'warrior'],
    inStock: true,
  },
  {
    id: 'p11',
    name: 'The Godfather — Classic Movie Art',
    slug: 'the-godfather-classic-movie-art',
    price: 229,
    originalPrice: 549,
    category: 'Movies & Cinema',
    categorySlug: 'movies-cinema',
    image: '/images/products/movie.jpg',
    images: ['/images/products/movie.jpg'],
    description:
      'A beautifully reimagined classic cinema poster with dramatic shadows and iconic typography. A must-have for any cinephile collection.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.7,
    reviews: 78,
    tags: ['movie', 'classic', 'cinema'],
    inStock: true,
  },
  {
    id: 'p12',
    name: 'Ocean Serenity — Coastal Sunset',
    slug: 'ocean-serenity-coastal-sunset',
    price: 199,
    originalPrice: 499,
    category: 'Nature & Landscapes',
    categorySlug: 'nature-landscapes',
    image: '/images/products/nature.jpg',
    images: ['/images/products/nature.jpg'],
    description:
      'A serene coastal sunset photograph with warm golden hues reflecting on calm ocean waters. This peaceful landscape brings tranquility to any space.',
    sizes: ['A4 (8.3" × 11.7")', 'A3 (11.7" × 16.5")', 'A2 (16.5" × 23.4")'],
    paperType: '300 GSM Matte Art Paper',
    rating: 4.6,
    reviews: 62,
    tags: ['nature', 'ocean', 'sunset', 'coastal'],
    badge: 'New',
    inStock: true,
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.categorySlug === categorySlug);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.badge);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
  );
}
