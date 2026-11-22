export function ProductCardSkeleton() {
  return (
    <article className="product-card product-card--skeleton">
      <div className="skeleton skeleton--media" />
      <div className="product-card__body">
        <div className="skeleton skeleton--line skeleton--short" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--medium" />
        <div className="skeleton skeleton--price" />
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function CatalogueSkeleton() {
  return (
    <main className="catalogue-page" aria-busy="true" aria-label="Chargement du catalogue">
      <section className="catalogue-hero">
        <div className="container">
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--line skeleton--medium" />
        </div>
      </section>
      <section className="container catalogue-layout">
        <div className="filters-skeleton">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton skeleton--block" key={index} />
          ))}
        </div>
        <div>
          <div className="skeleton skeleton--toolbar" />
          <div className="catalogue-grid">
            {Array.from({ length: 9 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function ProductSkeleton() {
  return (
    <main className="product-page" aria-busy="true" aria-label="Chargement du produit">
      <div className="container">
        <div className="skeleton skeleton--line skeleton--short" />
        <div className="product-detail">
          <div className="skeleton skeleton--detail-media" />
          <div className="product-detail__info">
            <div className="skeleton skeleton--line skeleton--short" />
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--line skeleton--medium" />
            <div className="skeleton skeleton--price" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--button" />
          </div>
        </div>
      </div>
    </main>
  );
}
