import { ProductGridSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <main className="container page-loading" aria-busy="true" aria-label="Chargement de la boutique">
      <div className="skeleton skeleton--hero" />
      <div className="skeleton skeleton--title" />
      <ProductGridSkeleton count={8} />
    </main>
  );
}
