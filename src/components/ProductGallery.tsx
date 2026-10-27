'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ProductImageData } from '@/lib/data';

interface ProductGalleryProps {
  mainImage: string;
  images: ProductImageData[];
  productName: string;
}

export default function ProductGallery({ mainImage, images, productName }: ProductGalleryProps) {
  // Build gallery: if images array is empty, just use the mainImage
  const galleryImages = images.length > 0
    ? images.map((img) => ({ url: img.url, alt: img.alt || productName }))
    : [{ url: mainImage, alt: productName }];

  const [activeIndex, setActiveIndex] = useState(0);

  if (galleryImages.length === 1) {
    // Single image — simple display
    return (
      <div className="pdp-gallery">
        <div className="pdp-main-image">
          <Image src={galleryImages[0].url} alt={galleryImages[0].alt} width={600} height={600} priority />
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-gallery pdp-gallery-multi">
      {/* Hero Image */}
      <div className="pdp-main-image">
        <Image
          src={galleryImages[activeIndex].url}
          alt={galleryImages[activeIndex].alt}
          width={600}
          height={600}
          priority
          key={activeIndex}
        />
      </div>

      {/* Thumbnail Strip */}
      <div className="pdp-thumbnails">
        {galleryImages.map((img, index) => (
          <button
            key={`thumb-${index}`}
            className={`pdp-thumb ${index === activeIndex ? 'pdp-thumb-active' : ''}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`View image ${index + 1}`}
          >
            <Image
              src={img.url}
              alt={img.alt}
              width={80}
              height={100}
              style={{ objectFit: 'cover' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
