import { useHomePage } from '../hooks/useProducts';
import { LoadingBlock } from '../components/ui/Primitives';
import {
  BrandExpressionFrame,
  CollectionsShowcase,
  CTABanner,
  EventsRail,
  HeroSlider,
  ProcessImageFrame,
  ProductRail,
  TestimonialRail,
  TrustedBrandGrid,
} from '../components/home/HomeSections';
import { PopupPromo } from '../components/home/PopupPromo';

export function HomePage() {
  const { data, isLoading } = useHomePage();

  if (isLoading) {
    return (
      <div className="page-shell py-10 sm:py-16">
        <LoadingBlock />
      </div>
    );
  }

  return (
    <>
      <PopupPromo ads={data.popupAds} />
      <HeroSlider banners={data.banners} />
      <BrandExpressionFrame />
      <ProcessImageFrame />
      <CollectionsShowcase />
      <ProductRail
        title="Best Sellers"
        description="Curated favorites and everyday classics."
        products={data.bestSellers}
        link="/products?sort=best-sellers"
        bgClass="bg-[var(--color-primary-bg)]"
      />
      <ProductRail
        title="New Arrivals"
        description="Fresh silhouettes and trending pieces."
        products={data.newArrivals}
        link="/products?sort=new-arrivals"
        bgClass="bg-[var(--color-surface-alt)]"
      />
      <TestimonialRail testimonials={data.testimonials} />
      <EventsRail events={data.events} />
      <section className="page-shell section-gap">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="gold-hairline w-8" aria-hidden />
              <p className="lux-label">Trusted by</p>
            </div>
            <h2 className="lux-heading text-3xl sm:text-4xl md:text-6xl">Brands that keep coming back.</h2>
            <p className="mt-4 text-sm text-text-muted md:text-base">The houses and retail partners who return to DeArte, season after season.</p>
          </div>
        </div>
        <div className="mt-8">
          <TrustedBrandGrid brands={data.trustedBrands} />
        </div>
      </section>
      <CTABanner />
    </>
  );
}
