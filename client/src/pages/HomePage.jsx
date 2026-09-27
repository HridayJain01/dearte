import { useQuery } from '@tanstack/react-query';
import { useHomePage } from '../hooks/useProducts';
import { siteSettingsQuery } from '../hooks/useSiteSettings';
import { useAuth } from '../hooks/useAuth';
import { LoadingBlock, PageError } from '../components/ui/Primitives';
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

// Stand-ins for the data-driven sections, sized like what replaces them so the
// sections below don't jump when /site/home lands. Same pulse blocks as the
// product grid skeleton.
function HeroSkeleton() {
  return (
    <div
      aria-hidden
      className="relative left-1/2 right-1/2 h-[58svh] min-h-[22rem] w-screen -translate-x-1/2 animate-pulse bg-[var(--color-surface-alt)] sm:h-[calc(88svh-6.5rem)]"
    />
  );
}

function RailSkeleton() {
  return (
    <div className="page-shell py-8 sm:py-20" aria-busy="true" aria-label="Loading products">
      <div className="mb-4 h-7 w-48 animate-pulse bg-[var(--color-surface-alt)] sm:mb-14 sm:h-12 sm:w-80" />
      <div className="flex gap-3 overflow-hidden sm:gap-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="min-w-[160px] flex-none animate-pulse sm:min-w-[320px]">
            <div className="h-40 bg-[var(--color-surface-alt)] sm:h-72" />
            <div className="mt-3 h-2.5 w-1/3 bg-[var(--color-surface-alt)]" />
            <div className="mt-2 h-3.5 w-3/4 bg-[var(--color-surface-alt)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, isFetching, refetch, error } = useHomePage();
  // Which sections show is decided by site settings. /site/home carries a copy,
  // but the header has already started the much lighter settings request, so
  // the sections that need no data can render before the product rails do.
  const { data: settings } = useQuery(siteSettingsQuery);
  const siteSettings = data?.siteSettings ?? settings;

  // Offline, API down or erroring. This is where the installed app opens, so it
  // has to say which, rather than crash to a blank screen on `data.siteSettings`.
  // (A query paused for being offline has no error; describeError reads
  // navigator.onLine for that case.)
  if (!data && !isLoading) {
    return <PageError error={error} onRetry={() => refetch()} retrying={isFetching} />;
  }

  // Neither request has answered yet, so there is nothing to lay out.
  if (!siteSettings) {
    return (
      <div className="page-shell py-10 sm:py-16">
        <LoadingBlock />
      </div>
    );
  }

  const guestAccess = siteSettings.guestAccess || {};
  const show = (section) => user || guestAccess[section] !== false;

  return (
    <>
      {/* Organization and WebSite JSON-LD are baked into index.html so they are
          in the served HTML before React boots; only the page-level tags are
          rendered here. */}
      <Seo {...routeSeo('/')} path="/" />
      {data && show('showPopupPromo') && <PopupPromo ads={data.popupAds} />}
      {show('showHeroSlider') && (data ? <HeroSlider banners={data.banners} /> : <HeroSkeleton />)}
      {show('showBrandExpression') && <BrandExpressionFrame />}
      {show('showProcessImage') && <ProcessImageFrame />}
      {show('showCollections') && <CollectionsShowcase />}
      {show('showBestSellers') &&
        (data ? (
          <ProductRail
            title="Best Sellers"
            description="Curated favorites and everyday classics."
            products={data.bestSellers}
            link="/products?sort=best-sellers"
            bgClass="bg-[var(--color-primary-bg)]"
          />
        ) : (
          <RailSkeleton />
        ))}
      {show('showNewArrivals') &&
        (data ? (
          <ProductRail
            title="New Arrivals"
            description="Fresh silhouettes and trending pieces."
            products={data.newArrivals}
            link="/products?sort=new-arrivals"
            bgClass="bg-[var(--color-surface-alt)]"
          />
        ) : (
          <RailSkeleton />
        ))}
      {/* Personal to this browser, so it needs no admin toggle; empty on a first visit. */}
      <ProductRail
        title="Recently Viewed"
        description="Pick up where you left off."
        products={recentlyViewed(user?.id).slice(0, 8)}
      />
      {data && show('showTestimonials') && <TestimonialRail testimonials={data.testimonials} />}
      {data && show('showEvents') && <EventsRail events={data.events} />}
      {data && show('showTrustedBrands') && (
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
