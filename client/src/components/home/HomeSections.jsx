import { ArrowRight, CalendarDays, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import brandExpressionImage from '../../assets/Cormorant Garamond.png';
import processImage from '../../assets/process.png';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryTiles } from '../../hooks/useSiteSettings';
import { Button } from '../ui/Primitives';
import { cdnImage, formatWeight } from '../../utils/formatters';
import { productDisplayName } from '../../utils/productTitle';
import { goldColorSwatch, variantFor, variantImages } from '../../utils/productVariants';
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

function ShopCategoryCard({ label, to, imageSrc, className, delay = 0 }) {

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

// The admin's tiles (Settings > Category tiles): the first runs large on the
// left, the rest share the right in pairs, and an odd one out spans the pair.
export function CollectionsShowcase() {
  const tiles = useCategoryTiles();
  if (!tiles.length) return null;
  const [first, ...rest] = tiles;
  const tile = (item, className, delay = 0) => (
    <ShopCategoryCard
      key={`${item.label}-${item.link}`}
      label={item.label}
      to={item.link}
      imageSrc={cdnImage(item.image?.secureUrl, 1200)}
      className={className}
      delay={delay}
    />
  );

  return (
    <section className="page-shell pb-10 pt-6 sm:pb-20 sm:pt-10 md:pb-28 md:pt-12">
      <SectionIntro
        title="Shop by category"
        description="Lab-grown diamond jewellery for everyday wear and special occasions."
      />

      <div className="flex flex-col gap-4 sm:gap-4.5 lg:flex-row lg:items-stretch">
        {tile(first, `aspect-3/2 min-h-40 w-full sm:aspect-4/5 sm:min-h-70 lg:aspect-auto lg:self-stretch lg:min-h-144 ${rest.length ? 'lg:w-1/2' : 'sm:aspect-16/7'}`)}

        {rest.length ? (
          <div className="grid w-full auto-rows-fr grid-cols-2 gap-3 sm:gap-4.5 lg:min-h-144 lg:w-1/2">
            {rest.map((item, index) => {
              const wide = rest.length % 2 === 1 && index === 0;
              return tile(
                item,
                `min-h-32 w-full sm:min-h-42 lg:aspect-auto lg:min-h-0 ${wide ? 'col-span-2 aspect-16/9 sm:aspect-16/11' : 'aspect-square'}`,
                (index + 1) * 90,
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// A best seller photographed in more than one metal, for the hero to show off.
function pickFeatured(products = []) {
  return products.find((product) => heroMetals(product).length > 1) || null;
}

function heroMetals(product) {
  return (product.customizationOptions?.goldColors || []).filter((color) => variantFor(product, color)?.views?.length);
}

// The hero's moving picture: one real style that turns from metal to metal on
// its own until the visitor picks one. Reduced motion keeps it still.
function MetalPicker({ product }) {
  const metals = heroMetals(product);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  // The name leads with the photographed metal ("Yellow Gold ..."), which is
  // wrong as soon as the picture turns to another one.
  const name = productDisplayName(product).replace(/^(yellow|rose|white)\s+gold\s+/i, '');

  useEffect(() => {
    if (held || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => setActive((current) => (current + 1) % metals.length), 3200);
    return () => clearInterval(timer);
  }, [held, metals.length]);

  return (
    <div className="order-1 flex h-full flex-col bg-white lg:order-2">
      <Link to={`/products/${product.styleCode}`} className="relative block min-h-[15rem] flex-1 overflow-hidden sm:min-h-[24rem]">
        {metals.map((metal, index) => (
          <img
            key={metal}
            src={cdnImage(variantImages(product, metal)[0], 1200)}
            alt={index === active ? `${name} in ${metal}` : ''}
            aria-hidden={index !== active}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-contain p-2 transition duration-700 [transition-timing-function:var(--ease-lux)] sm:p-6 ${index === active ? 'scale-110 opacity-100' : 'scale-100 opacity-0'}`}
          />
        ))}
      </Link>
      <div className="flex flex-col gap-3 px-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:pb-9">
        <div className="min-w-0">
          <Link to={`/products/${product.styleCode}`} className="font-serif text-2xl leading-tight text-[var(--color-text)] hover:text-[var(--color-primary)] sm:text-3xl">
            {name}
          </Link>
          <p className="mt-1 text-[15px] text-[var(--color-text)]">
            Diamond {formatWeight(product.diamondWeight, 'ct')} · Gold {formatWeight(product.goldWeight, 'g')}
          </p>
        </div>
        <div role="group" aria-label="Show it in" className="flex shrink-0 gap-2">
          {metals.map((metal, index) => (
            <button
              key={metal}
              type="button"
              aria-pressed={index === active}
              onClick={() => {
                setActive(index);
                setHeld(true);
              }}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 border px-3 text-[15px] transition sm:flex-none ${
                index === active
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]'
              }`}
            >
              <span className="h-4 w-4 flex-none" style={{ backgroundColor: goldColorSwatch(metal) }} aria-hidden />
              {metal.replace(/\s*gold$/i, '')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSlider({ banners = [], products }) {
  const { isAuthenticated } = useAuth();
  const [active, setActive] = useState(0);
  const featured = pickFeatured(products);

  // Admin banners now rotate as a one-line "new" link under the buttons.
  useEffect(() => {
    if (banners.length < 2) return undefined;
    const timer = setInterval(() => setActive((current) => (current + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const slide = banners[active];

  return (
    <section className="grid lg:min-h-[calc(88svh-6.5rem)] lg:grid-cols-2">
      {/* The left edge lines up with .page-shell. */}
      <div className="order-2 flex flex-col justify-center bg-[var(--color-primary)] px-4 py-10 text-white sm:px-6 sm:py-14 lg:order-1 lg:pl-[max(20px,calc((100vw-var(--container))/2))] lg:pr-12">
        <h1 className="animate-hero-line lux-heading text-[2.1rem] text-white! sm:text-5xl lg:text-[clamp(2.75rem,4.3vw,3.9rem)]">
          Lab-grown diamond jewellery for retailers
        </h1>
        <p className="animate-hero-line mt-4 max-w-xl text-base leading-relaxed text-white sm:mt-6 sm:text-lg" style={{ '--line-delay': '120ms' }}>
          De Arté makes rings, earrings, bracelets and pendants for jewellery retailers and wholesale buyers.
        </p>
        <div className="animate-hero-line mt-6 flex flex-wrap gap-2 sm:mt-9 sm:gap-3" style={{ '--line-delay': '240ms' }}>
          {isAuthenticated ? (
            <Button as={Link} to="/products" variant="secondary">Explore products</Button>
          ) : (
            <Button as={Link} to="/register" variant="secondary">Open a buyer account</Button>
          )}
          <Button
            as={Link}
            to={isAuthenticated ? '/contact' : '/products'}
            variant="ghost"
            className="border-white/40! text-white! hover:bg-white/10!"
          >
            {isAuthenticated ? 'Talk to sales' : 'Browse the catalogue'}
          </Button>
        </div>

        {slide ? (
          <Link
            key={slide.id}
            to={bannerPath(slide.ctaLink)}
            className="animate-hero-line group mt-8 inline-flex max-w-full items-center gap-3 self-start text-base text-white sm:mt-12"
            style={{ '--line-delay': '360ms' }}
          >
            <span className="bg-[var(--color-accent)] px-2 py-0.5 text-[13px] font-medium text-[var(--color-text)]">New</span>
            <span className="truncate underline-offset-4 group-hover:underline">{slide.title}</span>
            <ArrowRight className="h-4 w-4 flex-none transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        ) : null}
      </div>

      {featured ? (
        <MetalPicker product={featured} />
      ) : slide ? (
        <div className="relative order-1 min-h-[17rem] bg-white sm:min-h-[24rem] lg:order-2">
          <img
            src={cdnImage(slide.image, 1600)}
            alt={slide.title}
            fetchPriority="high"
            decoding="async"
            className="animate-ken-burns absolute inset-0 h-full w-full object-contain"
          />
        </div>
      ) : null}
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
