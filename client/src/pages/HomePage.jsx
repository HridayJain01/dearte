import { useHomePage } from '../hooks/useProducts';
import { LoadingBlock } from '../components/ui/Primitives';
import {
  BrandExpressionFrame,
  CompanyStrip,
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
      <CompanyStrip companyInfo={data.companyInfo} />
      <TestimonialRail testimonials={data.testimonials} />
      <EventsRail events={data.events} />
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
      <section className="page-shell section-gap">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="lux-label mb-3">Trusted by</p>
            <h2 className="lux-heading text-3xl sm:text-4xl md:text-6xl">Brands that keep coming back.</h2>
            <p className="mt-3 text-sm text-text-muted md:text-base">A live brand wall backed by the database so your social proof stays current as the admin list changes.</p>
          </div>
        </div>
        <div className="mt-6">
          <TrustedBrandGrid brands={data.trustedBrands} />
        </div>
      </section>
      <CTABanner />
    </>
  );
}
