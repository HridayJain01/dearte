import { ArrowRight, CalendarDays, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import brandExpressionImage from '../../assets/Cormorant Garamond.png';
import processImage from '../../assets/process.png';
import { Button, Panel } from '../ui/Primitives';
import { Parallax, Reveal } from '../ui/motion';
import { ProductCard } from '../product/ProductCard';

function getEventStatus(date) {
  return new Date(date) < new Date() ? 'Previous' : 'Upcoming';
}

// Shared editorial section intro — eyebrow with gold hairline, display
// serif title, optional description and trailing action.
function SectionIntro({ eyebrow, title, description, action, align = 'left', className = '' }) {
  const centered = align === 'center';

  return (
    <Reveal className={`mb-6 sm:mb-14 ${centered ? 'text-center' : ''} ${className}`}>
      <div className={`flex flex-col gap-3 sm:gap-4 ${centered ? 'items-center' : 'md:flex-row md:items-end md:justify-between'}`}>
        <div className={`max-w-2xl ${centered ? 'mx-auto' : ''}`}>
          {eyebrow ? (
            <div className={`mb-3 flex items-center gap-3 sm:mb-4 ${centered ? 'justify-center' : ''}`}>
              <span className="gold-hairline w-8" aria-hidden />
              <p className="lux-label">{eyebrow}</p>
            </div>
          ) : null}
          <h2 className="lux-heading text-2xl sm:text-4xl md:text-6xl">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm text-[var(--color-text-muted)] sm:mt-4 md:text-base">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </Reveal>
  );
}

function RailLink({ to, children }) {
  return (
    <Link
      to={to}
      className="hairline-draw inline-flex items-center gap-2 pb-1.5 text-[13px] font-medium uppercase tracking-[0.14em] text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
    >
      {children} <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function ShopCategoryDiamondIcon({ className }) {
  // Strokes inherit currentColor so the icon stays inside the token system.
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M24 6L41 18.5L24 42L7 18.5L24 6Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M7 18.5H41" stroke="currentColor" strokeWidth="1.35" />
      <path d="M13.5 18.5L24 6L34.5 18.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function ShopCategoryCard({ label, categorySlug, imageSrc, className, delay = 0 }) {
  const to = `/products?category=${encodeURIComponent(categorySlug)}`;

  return (
    <Reveal
      as={Link}
      to={to}
      delay={delay}
      className={`group relative isolate block overflow-hidden bg-[var(--color-surface-alt)] ${className ?? ''}`}
    >
      <img
        src={imageSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 [transition-timing-function:var(--ease-lux)] group-hover:scale-[1.06]"
      />
      <div className="scrim-photo pointer-events-none absolute inset-x-0 bottom-0 h-[54%]" aria-hidden />
      <span
        className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l border-t border-[var(--color-accent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b border-r border-[var(--color-accent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      />
      <span className="absolute bottom-4.5 left-4.5 z-10 sm:bottom-5 sm:left-5">
        <span className="block text-lg font-medium leading-tight tracking-[-0.01em] text-white transition-transform duration-500 [transition-timing-function:var(--ease-lux)] group-hover:-translate-y-1 sm:text-xl">
          {label}
        </span>
        <span className="mt-1.5 block h-px w-10 origin-left scale-x-0 bg-[var(--color-accent)] transition-transform duration-500 [transition-timing-function:var(--ease-lux)] group-hover:scale-x-100" aria-hidden />
      </span>
    </Reveal>
  );
}

export function BrandExpressionFrame() {
  return (
    <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden py-6 sm:py-14">
      <Reveal className="page-shell mb-3 text-center sm:mb-8">
        <span className="gold-hairline mx-auto w-16" aria-hidden />
        <p className="lux-label mt-4 sm:mt-5">The DeArte Expression</p>
      </Reveal>
      <Parallax speed={0.07}>
        <Reveal delay={120}>
          <img
            src={brandExpressionImage}
            alt="Origin Emotion Experience Radiance"
            className="mx-auto block h-auto max-h-[15rem] w-full object-contain sm:max-h-[40rem]"
            loading="lazy"
          />
        </Reveal>
      </Parallax>
    </section>
  );
}

export function ProcessImageFrame() {
  return (
    <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden pb-6 pt-2 sm:pb-14 sm:pt-8">
      <Reveal className="page-shell mb-5 sm:mb-12">
        <div className="flex items-center gap-3">
          <span className="gold-hairline w-8" aria-hidden />
          <p className="lux-label">The Atelier</p>
        </div>
        <h2 className="lux-heading mt-3 max-w-3xl text-2xl sm:text-4xl md:text-6xl">
          From rough brilliance to finished radiance.
        </h2>
      </Reveal>
      <Parallax speed={0.05}>
        <Reveal delay={100}>
          <img
            src={processImage}
            alt="Jewellery creation process"
            className="mx-auto block h-auto max-h-[18rem] w-full object-contain sm:max-h-none sm:object-cover"
            loading="lazy"
          />
        </Reveal>
      </Parallax>
    </section>
  );
}

export function CollectionsShowcase() {
  return (
    <section className="page-shell pb-10 pt-6 sm:pb-20 sm:pt-10 md:pb-28 md:pt-12">
      <Reveal as="header" className="mb-6 text-center sm:mb-12 md:mb-14">
        <ShopCategoryDiamondIcon className="mx-auto h-9 w-9 text-[var(--color-accent)] sm:h-12 sm:w-12 md:h-13 md:w-13" />
        <h2 className="lux-heading mt-4 text-2xl sm:text-4xl md:text-5xl">Shop by Category</h2>
        <p className="mx-auto mt-2 max-w-160 text-sm leading-relaxed text-[var(--color-text-muted)] sm:mt-3 sm:text-lg">
          Discover the perfect lab-grown diamond jewellery for everyday and special occasions.
        </p>
      </Reveal>

      <div className="flex flex-col gap-4 sm:gap-4.5 lg:flex-row lg:items-stretch">
        <ShopCategoryCard
          label="Rings"
          categorySlug="Rings"
          imageSrc="/images/shop-category/rings.jpg"
          className="aspect-3/2 min-h-40 w-full sm:aspect-4/5 sm:min-h-70 lg:aspect-auto lg:w-1/2 lg:self-stretch lg:min-h-144"
        />

        <div className="flex w-full min-h-0 flex-col gap-3 sm:gap-4.5 lg:w-1/2 lg:min-h-144">
          <ShopCategoryCard
            label="Earrings"
            categorySlug="Earrings"
            imageSrc="/images/shop-category/earrings.jpg"
            className="aspect-16/9 min-h-32 w-full sm:aspect-16/11 sm:min-h-48 lg:aspect-auto lg:min-h-0 lg:flex-1"
            delay={90}
          />

          <div className="grid grid-cols-2 gap-3 sm:gap-4.5 lg:flex-1 lg:min-h-0">
            <ShopCategoryCard
              label="Bracelets"
              categorySlug="Bracelet"
              imageSrc="/images/shop-category/bracelets.jpg"
              className="aspect-square min-h-32 w-full sm:min-h-42 lg:aspect-auto lg:min-h-0 lg:h-full"
              delay={180}
            />
            <ShopCategoryCard
              label="Pendants"
              categorySlug="Necklaces"
              imageSrc="/images/shop-category/pendants.jpg"
              className="aspect-square min-h-32 w-full sm:min-h-42 lg:aspect-auto lg:min-h-0 lg:h-full"
              delay={270}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroSlider({ banners }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!banners?.length) return undefined;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners?.length) {
    return null;
  }

  const slide = banners[active];

  return (
    <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2">
      <div className="relative h-[58svh] min-h-[22rem] overflow-hidden sm:h-[calc(88svh-6.5rem)]">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            aria-hidden={index !== active}
            className={`hero-slide absolute inset-0 ${index === active ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={banner.image}
              alt={banner.title}
              className={`h-full w-full object-cover ${index === active ? 'animate-ken-burns' : ''}`}
            />
          </div>
        ))}

        <div className="scrim-hero absolute inset-0" aria-hidden />
        <div className="scrim-photo absolute inset-x-0 bottom-0 h-36 opacity-70" aria-hidden />
        <div className="light-sweep" aria-hidden />

        <div className="relative z-10 flex h-full items-center">
          <div className="page-shell w-full">
            <div key={slide.id} className="hero-copy flex max-w-3xl flex-col gap-3 py-6 sm:gap-5 sm:py-10">
              <div className="animate-hero-line flex items-center gap-4" style={{ '--line-delay': '80ms' }}>
                <span className="gold-hairline w-10" aria-hidden />
                <p className="lux-label text-white/75!">Luxury B2B Jewellery Platform</p>
              </div>
              {slide.offerBadge ? (
                <p
                  className="animate-hero-line inline-flex w-fit border border-[var(--color-accent)]/50 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm"
                  style={{ '--line-delay': '180ms' }}
                >
                  {slide.offerBadge}
                </p>
              ) : null}
              <h1
                className="animate-hero-line lux-heading text-3xl text-white! sm:text-6xl md:text-8xl"
                style={{ '--line-delay': '280ms' }}
              >
                {slide.title}
              </h1>
              <p
                className="animate-hero-line max-w-xl text-sm text-white/75 sm:text-base md:text-lg"
                style={{ '--line-delay': '420ms' }}
              >
                {slide.subtitle}
              </p>
              <div
                className="animate-hero-line mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
                style={{ '--line-delay': '540ms' }}
              >
                <Link to={slide.ctaLink}>
                  <Button variant="primary" className="w-full sm:w-auto">{slide.ctaLabel}</Button>
                </Link>
                <Link to="/contact">
                  <Button variant="ghost" className="w-full border-white/30! text-white! hover:bg-white/10! sm:w-auto">Talk to Sales</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-0 right-0 z-10 sm:bottom-7">
          <div className="page-shell flex items-center gap-3 sm:gap-4">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                onClick={() => setActive(index)}
                aria-label={`Go to slide ${index + 1}`}
                className="relative flex h-8 w-10 items-center sm:w-14"
              >
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/30" aria-hidden />
                {index === active ? (
                  <span
                    key={slide.id}
                    className="animate-slide-progress absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--color-accent)]"
                    aria-hidden
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductRail({ title, description, products, link, bgClass = 'bg-transparent' }) {
  return (
    <section className={`py-8 sm:py-20 ${bgClass}`}>
      <div className="page-shell">
        <SectionIntro
          eyebrow="Curated Edit"
          title={title}
          description={description}
          action={<RailLink to={link}>View All</RailLink>}
        />
        <div className="hide-scrollbar snap-rail flex gap-3 overflow-x-auto pb-4 sm:gap-6">
          {products.map((product, index) => (
            <Reveal
              key={product.id}
              delay={Math.min(index, 4) * 80}
              className="min-w-[200px] max-w-[200px] flex-none snap-start sm:min-w-[320px] sm:max-w-[320px]"
            >
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CompanyStrip({ companyInfo }) {
  return (
    <section className="border-t border-border bg-surface-alt py-12 sm:py-20">
      <div className="page-shell editorial-grid items-center">
        <div className="pr-0 md:pr-10">
          <p className="lux-label mb-3">{companyInfo.founded}</p>
          <h3 className="lux-heading mb-6 text-4xl sm:text-5xl">{companyInfo.tagline}</h3>
          <Link to="/about">
            <Button variant="ghost">Read our story &rarr;</Button>
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="lux-label mb-3">Certifications</p>
            <div className="flex flex-wrap gap-2">
              {companyInfo.certifications.map((item) => (
                <span key={item} className="border border-border px-3 py-2 text-sm text-text-muted bg-surface">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="lux-label mb-3">Mission</p>
            <p className="text-sm leading-7 text-text">{companyInfo.mission}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialRail({ testimonials }) {
  const featured = testimonials?.[0];
  const supporting = testimonials?.slice(1, 4) || [];

  if (!featured) return null;

  return (
    <section className="page-shell section-gap">
      <SectionIntro
        eyebrow="Trade Feedback"
        title="Trusted by premium retail partners."
        description="Words from the retailers who build their collections with us."
      />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <Reveal className="relative overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-10">
          <span
            className="pointer-events-none absolute -top-8 right-4 select-none font-serif text-[10rem] leading-none text-[var(--color-primary)]/8 sm:text-[13rem]"
            aria-hidden
          >
            &ldquo;
          </span>
          <p className="lux-label mb-6">Featured testimony</p>
          <div className="mb-6 flex gap-1.5 text-[var(--color-accent)]">
            {Array.from({ length: featured.rating }).map((_, index) => (
              <Star key={`${featured.id}-${index}`} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <blockquote className="max-w-2xl font-serif text-2xl leading-[1.5] text-[var(--color-text)] sm:text-[1.85rem]">
            &ldquo;{featured.review}&rdquo;
          </blockquote>
          <span className="gold-hairline mt-8 w-14" aria-hidden />
          <div className="mt-6 flex items-center gap-4">
            <img
              src={featured.avatar}
              alt={featured.name}
              className="h-14 w-14 border border-[var(--color-border)] object-cover sm:h-16 sm:w-16"
            />
            <div>
              <p className="font-semibold text-[var(--color-text)]">{featured.name}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{featured.company}</p>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4">
          {supporting.map((testimonial, index) => (
            <Reveal key={testimonial.id} delay={index * 90} className="lux-panel flex items-start gap-4 p-5 sm:p-6">
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="h-12 w-12 flex-none border border-[var(--color-border)] object-cover sm:h-14 sm:w-14"
              />
              <div className="min-w-0">
                <div className="mb-3 flex gap-1 text-[var(--color-accent)]">
                  {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
                    <Star key={`${testimonial.id}-${starIndex}`} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-[var(--color-text-muted)]">{testimonial.review}</p>
                <p className="mt-4 font-semibold text-[var(--color-text)]">{testimonial.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{testimonial.company}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EventsRail({ events }) {
  if (!events?.length) return null;

  return (
    <section className="page-shell section-gap">
      <SectionIntro
        eyebrow="Events"
        title="Previous and upcoming events."
        description="Private previews, trunk shows and showroom moments from the house."
        action={<RailLink to="/events">View All</RailLink>}
      />
      <div className="hide-scrollbar snap-rail flex gap-4 overflow-x-auto pb-3 sm:gap-5">
        {events.map((event, index) => {
          const status = getEventStatus(event.date);

          return (
            <Reveal key={event.id} delay={Math.min(index, 3) * 90} className="min-w-[240px] flex-none snap-start sm:min-w-[360px]">
              <article className="group h-full border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-500 [transition-timing-function:var(--ease-lux)] hover:-translate-y-1 hover:border-[var(--color-border-active)] hover:shadow-[var(--shadow-lifted)]">
                <div className="relative overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="h-40 w-full object-cover transition-transform duration-700 [transition-timing-function:var(--ease-lux)] group-hover:scale-[1.05] sm:h-64"
                  />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-2 border border-[var(--color-accent)]/50 bg-[var(--color-primary-bg)]/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                    {status}
                  </span>
                </div>
                <div className="space-y-3 p-4 sm:space-y-4 sm:p-6">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>{new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <h3 className="font-serif text-xl leading-tight text-[var(--color-text)] sm:text-[1.7rem]">{event.title}</h3>
                  <p className="text-sm leading-7 text-[var(--color-text-muted)]">{event.description}</p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function TrustedBrandGrid({ brands }) {
  if (!brands?.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {brands.map((brand, index) => {
        const Card = brand.websiteUrl ? 'a' : 'div';
        const cardProps = brand.websiteUrl
          ? { href: brand.websiteUrl, target: '_blank', rel: 'noreferrer' }
          : {};

        return (
          <Reveal key={brand.id} delay={Math.min(index, 5) * 60}>
            <Card
              {...cardProps}
              className="group flex min-h-[132px] h-full flex-col justify-between border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-500 [transition-timing-function:var(--ease-lux)] hover:-translate-y-1 hover:border-[var(--color-border-active)] hover:shadow-[var(--shadow-lifted)]"
            >
              <div className="flex items-center gap-3">
                {brand.logo ? (
                  <img
                    src={brand.logo?.secureUrl || brand.logo}
                    alt={brand.name}
                    className="h-12 w-12 border border-[var(--color-border)] object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center border border-[var(--color-border)] bg-[var(--color-primary-bg)] font-serif text-base text-[var(--color-primary)]">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="hairline-draw inline-block max-w-full truncate pb-0.5 text-sm font-semibold text-[var(--color-text)]">{brand.name}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{brand.sector || 'Trusted partner'}</p>
                </div>
              </div>
              {brand.websiteUrl ? (
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--color-primary)] transition-colors group-hover:text-[var(--color-accent)]">Visit website</p>
              ) : (
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Brand profile</p>
              )}
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

export function CollectionsRail({ collections }) {
  if (!collections?.length) return null;

  return (
    <section className="page-shell section-gap">
      <SectionIntro
        eyebrow="Curated Collections"
        title="Explore our signature collections."
        description="Handpicked assortments designed for specific occasions and styles."
      />
      <div className="hide-scrollbar snap-rail flex gap-4 overflow-x-auto pb-4 sm:gap-6">
        {collections.map((collection, index) => (
          <Reveal
            key={collection.id}
            delay={Math.min(index, 4) * 80}
            className="min-w-[240px] max-w-[240px] flex-none snap-start sm:min-w-[300px] sm:max-w-[300px]"
          >
            <Link to={`/products?collection=${collection.name}`} className="block h-full">
              <Panel className="group h-full overflow-hidden p-0">
                <div className="relative overflow-hidden bg-[var(--color-surface-alt)]">
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="h-40 w-full object-cover transition-transform duration-700 [transition-timing-function:var(--ease-lux)] group-hover:scale-[1.05] sm:h-48"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-[var(--color-primary-bg)] to-[var(--color-surface)] sm:h-48">
                      <p className="text-sm font-semibold text-[var(--color-text-muted)]">No Image</p>
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="font-serif text-xl text-[var(--color-text)]">{collection.name}</h3>
                  <p className="hairline-draw mt-2 inline-block pb-1 text-xs uppercase tracking-[0.12em] text-[var(--color-primary)]">View Collection &rarr;</p>
                </div>
              </Panel>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function CTABanner() {
  return (
    <section className="relative w-full overflow-hidden bg-[var(--color-primary)] py-10 text-center sm:py-28">
      <div className="cta-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="light-sweep" aria-hidden />
      <Reveal className="page-shell relative mx-auto max-w-3xl">
        <span className="gold-hairline mx-auto w-16" aria-hidden />
        <p className="lux-label mt-5 text-[var(--color-accent)]! sm:mt-6">The atelier awaits</p>
        <h2 className="lux-heading mb-6 mt-3 text-2xl text-white! sm:mb-8 sm:mt-4 sm:text-4xl md:text-6xl">Ready to curate your collection?</h2>
        <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link to="/products">
            <Button variant="secondary" className="w-full sm:w-auto">Explore Collection</Button>
          </Link>
          <Link to="/checkout">
            <Button variant="ghost" className="w-full border-white/30! text-white! hover:bg-white/10! sm:w-auto">Shop Now</Button>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
