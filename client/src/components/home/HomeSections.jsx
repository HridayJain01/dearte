import { ArrowRight, CalendarDays, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import brandExpressionImage from '../../assets/Cormorant Garamond.png';
import processImage from '../../assets/process.png';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Primitives';
import { cdnImage } from '../../utils/formatters';
import { Parallax, Reveal } from '../ui/motion';
import { ProductCard } from '../product/ProductCard';

function getEventStatus(date) {
  return new Date(date) < new Date() ? 'Previous' : 'Upcoming';
}

// Banner links are typed by hand in the admin, and <Link> treats anything without
// a leading slash as a path on this site: "www.google.com" became a 404. Our own
// full URLs are reduced to their path; anything else lands on the catalogue.
function bannerPath(link = '') {
  if (link.startsWith('/')) return link;
  try {
    const url = new URL(link);
    if (url.hostname.endsWith('deartejewels.com')) return `${url.pathname}${url.search}`;
  } catch {
    // Not a full URL, so not a destination we can trust.
  }
  return '/products';
}

// Shared section intro: display serif title, optional description and trailing action.
function SectionIntro({ title, description, action, className = '' }) {
  return (
    <Reveal className={`mb-5 sm:mb-12 ${className}`}>
      <div className="flex flex-col gap-2.5 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h2 className="lux-heading text-[1.75rem] sm:text-4xl md:text-5xl">{title}</h2>
          {description ? (
            <p className="mt-2 text-base leading-relaxed text-[var(--color-text)] sm:mt-4">{description}</p>
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
      className="hairline-draw tap-area inline-flex items-center gap-1.5 whitespace-nowrap pb-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)] sm:gap-2 sm:pb-1.5 sm:text-[13px] sm:tracking-[0.14em]"
    >
      {children} <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
    </Link>
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
        loading="lazy"
        decoding="async"
      />
      {/* A flat label, not a scrim: a dark fade over these pale pink photos turned
          the bottom half of every tile grey. */}
      <span className="absolute bottom-0 left-0 z-10 bg-[var(--color-primary)] px-4 py-2 text-base font-medium leading-tight text-white transition-colors duration-300 group-hover:bg-[var(--color-primary-hover)] sm:px-5 sm:py-3 sm:text-lg">
        {label}
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
    // Heading and diagram share one crimson field, so they read as one section;
    // the diagram is drawn on the same crimson and carries its own top margin.
    <section className="bg-[var(--color-primary)] pt-10 sm:pt-16">
      <Reveal className="page-shell text-center">
        <h2 className="lux-heading mx-auto max-w-4xl text-[1.75rem] text-white! sm:text-4xl md:text-5xl">
          From rough brilliance to finished radiance.
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <img
          src={processImage}
          alt="How a piece is made: your vision, responsible materials, the atelier, your creation."
          className="mx-auto block h-auto w-full max-w-[var(--container)] lg:max-h-[34rem] lg:object-contain"
          loading="lazy"
        />
      </Reveal>
    </section>
  );
}

export function CollectionsShowcase() {
  return (
    <section className="page-shell pb-10 pt-6 sm:pb-20 sm:pt-10 md:pb-28 md:pt-12">
      <SectionIntro
        title="Shop by category"
        description="Lab-grown diamond rings, earrings, bracelets and pendants, for everyday wear and special occasions."
      />

      <div className="flex flex-col gap-4 sm:gap-4.5 lg:flex-row lg:items-stretch">
        <ShopCategoryCard
          label="Rings"
          categorySlug="Rings"
          imageSrc="/images/shop-category/rings.jpg"
          className="aspect-3/2 min-h-40 w-full sm:aspect-4/5 sm:min-h-70 lg:aspect-auto lg:w-1/2 lg:self-stretch lg:min-h-144"
        />

        <div className="flex w-full min-h-0 flex-col gap-3 sm:gap-4.5 lg:w-1/2 lg:min-h-144">
          <ShopCategoryCard
            label="Earring"
            categorySlug="Earring"
            imageSrc="/images/shop-category/earrings.jpg"
            className="aspect-16/9 min-h-32 w-full sm:aspect-16/11 sm:min-h-48 lg:aspect-auto lg:min-h-0 lg:flex-1"
            delay={90}
          />

          <div className="grid grid-cols-2 gap-3 sm:gap-4.5 lg:flex-1 lg:min-h-0">
            <ShopCategoryCard
              label="Bracelet"
              categorySlug="Bracelet"
              imageSrc="/images/shop-category/bracelets.jpg"
              className="aspect-square min-h-32 w-full sm:min-h-42 lg:aspect-auto lg:min-h-0 lg:h-full"
              delay={180}
            />
            <ShopCategoryCard
              label="Pendant"
              categorySlug="Pendant"
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
    // The copy gets its own flat crimson field beside the photo. Banners are shot on
    // white, so laying type over them needed a scrim that turned the jewellery mauve.
    <section className="grid lg:min-h-[calc(88svh-6.5rem)] lg:grid-cols-2">
      <div className="relative h-[34svh] min-h-[14rem] overflow-hidden bg-white sm:h-[46svh] lg:order-2 lg:h-auto">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            aria-hidden={index !== active}
            className={`hero-slide absolute inset-0 ${index === active ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={cdnImage(banner.image, 1920)}
              srcSet={`${cdnImage(banner.image, 828)} 828w, ${cdnImage(banner.image, 1920)} 1920w`}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={banner.title}
              // The first slide is the home page's LCP element. Lazy-loading it
              // would push the largest paint behind layout for no benefit; the
              // slides behind it are off-screen and can wait.
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'low'}
              decoding="async"
              className={`h-full w-full object-contain ${index === active ? 'animate-ken-burns' : ''}`}
            />
          </div>
        ))}
      </div>

      {/* The left edge lines up with .page-shell. */}
      <div className="flex flex-col justify-center bg-[var(--color-primary)] px-4 py-8 text-white sm:px-6 sm:py-12 lg:order-1 lg:pl-[max(20px,calc((100vw-var(--container))/2))] lg:pr-12">
        <h1 className="lux-heading text-[1.875rem] text-white! sm:text-5xl lg:text-[clamp(2.5rem,4.2vw,3.75rem)]">
          Lab-grown diamond jewellery for retailers
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-white sm:mt-5 sm:text-lg">
          De Arté makes rings, earrings, bracelets and pendants for jewellery retailers and wholesale buyers.
        </p>

        <div key={slide.id} className="animate-hero-line mt-6 sm:mt-10">
          {slide.offerBadge ? (
            <p className="mb-2 text-[13px] font-medium text-[var(--color-accent)]">{slide.offerBadge}</p>
          ) : null}
          <p className="font-serif text-2xl leading-tight sm:text-3xl">{slide.title}</p>
          {slide.subtitle ? <p className="mt-1 text-base text-white/85">{slide.subtitle}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
            <Button as={Link} to={bannerPath(slide.ctaLink)} variant="secondary">{slide.ctaLabel}</Button>
            <Button as={Link} to="/contact" variant="ghost" className="border-white/40! text-white! hover:bg-white/10!">Talk to Sales</Button>
          </div>
        </div>

        {banners.length > 1 ? (
          <div className="mt-4 flex items-center gap-3 sm:mt-8 sm:gap-4">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                onClick={() => setActive(index)}
                aria-label={`Go to slide ${index + 1}`}
                className="relative flex h-10 w-10 items-center sm:w-14"
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
        ) : null}
      </div>
    </section>
  );
}

export function ProductRail({ title, description, products, link, bgClass = 'bg-transparent' }) {
  // A guest-scoped catalogue can leave a rail with nothing in it; a heading over
  // an empty strip reads as broken, so drop the whole section instead.
  if (!products?.length) return null;
  return (
    <section className={`py-8 sm:py-20 ${bgClass}`}>
      <div className="page-shell">
        <SectionIntro
          title={title}
          description={description}
          action={link ? <RailLink to={link}>View All</RailLink> : null}
        />
        {/* A swipeable rail on touch screens; on desktop a clean row of four, since
            a card cut off at the edge reads as clipped. View All has the rest. */}
        <div className="hide-scrollbar snap-rail flex gap-3 overflow-x-auto pb-4 sm:gap-6 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0 lg:[&>*:nth-child(n+5)]:hidden">
          {products.map((product, index) => (
            <Reveal
              key={product.id}
              delay={Math.min(index, 4) * 80}
              className="min-w-[160px] max-w-[160px] flex-none snap-start sm:min-w-[320px] sm:max-w-[320px] lg:min-w-0 lg:max-w-none"
            >
              <ProductCard product={product} />
            </Reveal>
          ))}
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
        title="Trusted by premium retail partners."
        description="Words from the retailers who build their collections with us."
      />
      {/* The single-column form runs the full width, so one review doesn't leave half the page empty. */}
      <div className={`grid gap-6 lg:gap-10 ${supporting.length ? 'lg:grid-cols-[1.15fr_0.85fr]' : ''}`}>
        <Reveal className="bg-[var(--color-surface)] p-4 sm:p-10">
          <div className="mb-3 flex gap-1 text-[var(--color-accent)] sm:mb-6 sm:gap-1.5">
            {Array.from({ length: featured.rating }).map((_, index) => (
              <Star key={`${featured.id}-${index}`} className="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
            ))}
          </div>
          <blockquote className="max-w-3xl font-serif text-xl leading-[1.4] text-[var(--color-text)] sm:text-[2rem]">
            &ldquo;{featured.review}&rdquo;
          </blockquote>
          <div className="mt-4 flex items-center gap-3 sm:mt-8 sm:gap-4">
            <img
              src={cdnImage(featured.avatar, 128)}
              alt={featured.name}
              className="h-10 w-10 border border-[var(--color-border)] object-cover sm:h-16 sm:w-16"
              loading="lazy"
              decoding="async"
            />
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-text)] sm:text-base">{featured.name}</p>
              <p className="text-[13px] text-[var(--color-text-muted)] sm:text-sm">{featured.company}</p>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:gap-4">
          {supporting.map((testimonial, index) => (
            <Reveal key={testimonial.id} delay={index * 90} className="lux-panel flex items-start gap-3 p-3 sm:gap-4 sm:p-6">
              <img
                src={cdnImage(testimonial.avatar, 128)}
                alt={testimonial.name}
                className="h-10 w-10 flex-none border border-[var(--color-border)] object-cover sm:h-14 sm:w-14"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0">
                <div className="mb-1.5 flex gap-1 text-[var(--color-accent)] sm:mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
                    <Star key={`${testimonial.id}-${starIndex}`} className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" />
                  ))}
                </div>
                <p className="text-[15px] leading-relaxed text-[var(--color-text)] sm:text-base sm:leading-7">{testimonial.review}</p>
                <p className="mt-2 text-[13px] font-semibold text-[var(--color-text)] sm:mt-4 sm:text-base">{testimonial.name}</p>
                <p className="text-[13px] text-[var(--color-text-muted)] sm:text-sm">{testimonial.company}</p>
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
  // One or two events can't fill a rail: they run full width, photo beside text.
  const wide = events.length < 3;

  return (
    <section className="page-shell section-gap">
      <SectionIntro
        title="Previous and upcoming events."
        description="Private previews, trunk shows and showroom moments from the house."
        action={<RailLink to="/events">View All</RailLink>}
      />
      <div className={wide ? 'grid gap-4 sm:gap-5' : 'hide-scrollbar snap-rail flex gap-4 overflow-x-auto pb-3 sm:gap-5'}>
        {events.map((event, index) => {
          const status = getEventStatus(event.date);

          return (
            <Reveal key={event.id} delay={Math.min(index, 3) * 90} className={wide ? '' : 'min-w-[210px] flex-none snap-start sm:min-w-[360px]'}>
              <article className={`group h-full bg-[var(--color-surface)] ${wide ? 'md:grid md:grid-cols-2 md:items-center' : ''}`}>
                <div className="relative overflow-hidden">
                  <img
                    src={cdnImage(event.image, wide ? 1200 : 720)}
                    alt={event.title}
                    className={`w-full object-cover transition-transform duration-700 [transition-timing-function:var(--ease-lux)] group-hover:scale-[1.05] ${wide ? 'h-52 sm:h-80' : 'h-28 sm:h-64'}`}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-2 border border-[var(--color-accent)]/50 bg-[var(--color-primary-bg)]/95 px-2 py-0.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)] sm:left-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[13px] sm:tracking-[0.16em]">
                    {status}
                  </span>
                </div>
                <div className="space-y-1.5 p-2.5 sm:space-y-4 sm:p-6">
                  <div className="flex items-center gap-1.5 text-[13px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] sm:gap-2 sm:text-[13px] sm:tracking-[0.14em]">
                    <CalendarDays className="h-3.5 w-3.5 text-[var(--color-accent)] sm:h-4 sm:w-4" />
                    <span>{new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <h3 className="font-serif text-base leading-tight text-[var(--color-text)] sm:text-[1.7rem]">{event.title}</h3>
                  <p className="line-clamp-3 text-[15px] leading-relaxed text-[var(--color-text)] sm:line-clamp-none sm:text-base sm:leading-7">{event.description}</p>
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {brands.map((brand, index) => {
        const Card = brand.websiteUrl ? 'a' : 'div';
        const cardProps = brand.websiteUrl
          ? { href: brand.websiteUrl, target: '_blank', rel: 'noreferrer' }
          : {};

        return (
          <Reveal key={brand.id} delay={Math.min(index, 5) * 60}>
            <Card
              {...cardProps}
              className="group flex h-full flex-col justify-center border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 transition-all duration-500 [transition-timing-function:var(--ease-lux)] hover:-translate-y-1 hover:border-[var(--color-border-active)] hover:shadow-[var(--shadow-lifted)] sm:p-4"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                {brand.logo ? (
                  <img
                    src={cdnImage(brand.logo?.secureUrl || brand.logo, 96)}
                    alt={brand.name}
                    className="h-9 w-9 border border-[var(--color-border)] object-cover sm:h-12 sm:w-12"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center border border-[var(--color-border)] bg-[var(--color-primary-bg)] font-serif text-[13px] text-[var(--color-primary)] sm:h-12 sm:w-12 sm:text-base">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="hairline-draw inline-block max-w-full truncate pb-0.5 text-[13px] font-semibold text-[var(--color-text)] sm:text-sm">{brand.name}</p>
                  <p className="text-[13px] text-[var(--color-text-muted)]">{brand.sector || 'Trusted partner'}</p>
                </div>
              </div>
              {brand.websiteUrl ? (
                <p className="mt-2.5 text-[13px] uppercase tracking-[0.12em] text-[var(--color-primary)] transition-colors group-hover:text-[var(--color-accent)] sm:mt-4 sm:text-[13px] sm:tracking-[0.16em]">Visit website</p>
              ) : null}
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

export function CTABanner() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="w-full bg-[var(--color-primary)] py-12 text-center sm:py-24">
      <Reveal className="page-shell mx-auto max-w-3xl">
        <h2 className="lux-heading mb-3 text-[1.75rem] text-white! sm:text-4xl md:text-5xl">Ready to curate your collection?</h2>
        {/* Guests only see a preview of the catalogue, so the next step for them is an account. */}
        {isAuthenticated ? null : (
          <p className="mb-6 text-base text-white sm:mb-8">Open a buyer account to see the full catalogue and place orders.</p>
        )}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
          {isAuthenticated ? null : <Button as={Link} to="/register" variant="secondary">Open a buyer account</Button>}
          <Button
            as={Link}
            to="/products"
            variant={isAuthenticated ? 'secondary' : 'ghost'}
            className={isAuthenticated ? '' : 'border-white/40! text-white! hover:bg-white/10!'}
          >
            Explore products
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
