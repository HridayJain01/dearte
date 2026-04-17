import { useHomePage } from '../hooks/useProducts';
import { LoadingBlock } from '../components/ui/Primitives';
import { CompanyStrip, HeroSlider, ProductRail, SupportStrip, TestimonialRail, CTABanner } from '../components/home/HomeSections';
import { PopupPromo } from '../components/home/PopupPromo';

export function HomePage() {
  const { data, isLoading } = useHomePage();

  if (isLoading) {
    return (
      <div className="page-shell py-16">
        <LoadingBlock />
      </div>
    );
  }

  return (
    <>
      <PopupPromo ads={data.popupAds} />
      <HeroSlider banners={data.banners} />
      <CompanyStrip companyInfo={data.companyInfo} />
      <ProductRail
        title="Best Sellers"
        description="Curated favorites and everyday classics."
        products={data.bestSellers}
        link="/products?sort=best-sellers"
        bgClass="bg-[var(--color-primary-bg)]"
      />
      <SupportStrip />
      <ProductRail
        title="New Arrivals"
        description="Fresh silhouettes and trending pieces."
        products={data.newArrivals}
        link="/products?sort=new-arrivals"
        bgClass="bg-[var(--color-surface-alt)]"
      />
      <CTABanner />
    </>
  );
}
