import { useHomePage } from '../hooks/useProducts';
import { useAuth } from '../hooks/useAuth';
import { Button, EmptyState, LoadingBlock } from '../components/ui/Primitives';
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
import { Seo } from '../components/seo/Seo';
import { routeSeo } from '../utils/seoRoutes';
import { recentlyViewed } from '../utils/recentlyViewed';

export function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, isFetching, refetch } = useHomePage();

  if (isLoading) {
    return (
      <div className="page-shell py-10 sm:py-16">
        <LoadingBlock />
      </div>
    );
  }

  // Offline or API down. This is where the installed app opens, so it has to
  // say something rather than crash to a blank screen on `data.siteSettings`.
  if (!data) {
    return (
      <section className="page-shell section-gap">
        <EmptyState
          title="We couldn't reach the collection."
          description="Check your connection and try again."
          action={<Button onClick={() => refetch()} loading={isFetching}>Try again</Button>}
        />
      </section>
    );
  }

  const guestAccess = data.siteSettings?.guestAccess || {};
  const show = (section) => user || guestAccess[section] !== false;

  return (
    <>
      {/* Organization and WebSite JSON-LD are baked into index.html so they are
          in the served HTML before React boots; only the page-level tags are
          rendered here. */}
      <Seo {...routeSeo('/')} path="/" />
      {show('showPopupPromo') && <PopupPromo ads={data.popupAds} />}
      {show('showHeroSlider') && <HeroSlider banners={data.banners} />}
      {show('showBrandExpression') && <BrandExpressionFrame />}
      {show('showProcessImage') && <ProcessImageFrame />}
      {show('showCollections') && <CollectionsShowcase />}
      {show('showBestSellers') && (
        <ProductRail
          title="Best Sellers"
          description="Curated favorites and everyday classics."
          products={data.bestSellers}
          link="/products?sort=best-sellers"
          bgClass="bg-[var(--color-primary-bg)]"
        />
      )}
      {show('showNewArrivals') && (
        <ProductRail
          title="New Arrivals"
          description="Fresh silhouettes and trending pieces."
          products={data.newArrivals}
          link="/products?sort=new-arrivals"
          bgClass="bg-[var(--color-surface-alt)]"
        />
      )}
      {/* Personal to this browser, so it needs no admin toggle; empty on a first visit. */}
      <ProductRail
        title="Recently Viewed"
        description="Pick up where you left off."
        products={recentlyViewed(user?.id).slice(0, 8)}
      />
      {show('showTestimonials') && <TestimonialRail testimonials={data.testimonials} />}
      {show('showEvents') && <EventsRail events={data.events} />}
      {show('showTrustedBrands') && (
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
      )}
      {show('showCTABanner') && <CTABanner />}
    </>
  );
}
