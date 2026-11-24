'use client';

import { useEffect, useState } from 'react';
import { imageUrl } from '@/lib/api';

export interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  position?: number;
}

export function ProductGallery({
  images,
  name,
  fallback,
}: {
  images: GalleryImage[];
  name: string;
  fallback?: string | null;
}) {
  const [active, setActive] = useState(0);
  const normalized = images
    .map((image) => ({ ...image, src: imageUrl(image.url) }))
    .filter((image): image is GalleryImage & { src: string } => Boolean(image.src));

  useEffect(() => {
    setActive(0);
  }, [images]);

  if (normalized.length === 0) {
    return (
      <div className="product-gallery">
        <div className="product-gallery__main">
          {fallback ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fallback} alt={name} width={900} height={900} />
          ) : (
            <span className="product-detail__placeholder" />
          )}
        </div>
      </div>
    );
  }

  const current = normalized[Math.min(active, normalized.length - 1)];

  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.alt ?? name}
          width={1200}
          height={1200}
          loading="eager"
        />
      </div>

      {normalized.length > 1 && (
        <div className="product-gallery__thumbs" role="list" aria-label={`Images de ${name}`}>
          {normalized.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={index === active ? 'is-active' : undefined}
              onClick={() => setActive(index)}
              aria-label={`Voir l’image ${index + 1} sur ${normalized.length}`}
              aria-pressed={index === active}
              role="listitem"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt="" width={220} height={220} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
