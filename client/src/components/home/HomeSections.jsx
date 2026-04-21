import { ArrowRight, CalendarDays, Quote, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import brandExpressionImage from '../../assets/Cormorant Garamond.png';
import processImage from '../../assets/process.png';
import { Button, Panel, SectionHeading } from '../ui/Primitives';
import { ProductCard } from '../product/ProductCard';

function getEventStatus(date) {
  return new Date(date) < new Date() ? 'Previous' : 'Upcoming';
}

export function BrandExpressionFrame() {
  return (
    <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 pb-4 pt-3 sm:pb-8 sm:pt-6">
      <img
        src={brandExpressionImage}
        alt="Origin Emotion Experience Radiance"
        className="block h-auto w-full"
        loading="lazy"
      />
    </section>
  );
}

export function ProcessImageFrame() {
  return (
    <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 pb-6 pt-2 sm:pb-10 sm:pt-4">
      <img
        src={processImage}
        alt="Jewellery creation process"
        className="block h-auto w-full"
        loading="lazy"
      />
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
    <section className="page-shell py-2 sm:py-8">
      <div className="relative min-h-[78svh] overflow-hidden sm:min-h-screen">
        <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[rgba(107,15,46,0.25)]" />
        <div className="animate-hero-entry relative z-10 flex min-h-[78svh] max-w-3xl flex-col justify-center gap-4 px-4 py-10 sm:min-h-screen sm:gap-5 sm:px-8 sm:py-16 md:px-16">
          <p className="lux-label text-white/80!">Luxury B2B Jewellery Platform</p>
          {slide.offerBadge ? (
            <p className="inline-flex w-fit border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              {slide.offerBadge}
            </p>
          ) : null}
          <h1 key={slide.id} className="lux-heading text-3xl text-white! sm:text-6xl md:text-8xl">
            {slide.title}
          </h1>
          <p className="max-w-xl text-sm text-white/70 sm:text-base md:text-lg">{slide.subtitle}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to={slide.ctaLink}>
              <Button variant="primary" className="w-full sm:w-auto">{slide.ctaLabel}</Button>
            </Link>
            <Link to="/contact">
              <Button variant="ghost" className="w-full border-white/30! text-white! hover:bg-white/10! sm:w-auto">Talk to Sales</Button>
            </Link>
          </div>
        </div>
        <div className="absolute bottom-3 left-4 flex items-center gap-2.5 sm:bottom-8 sm:left-8 sm:gap-3">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              onClick={() => setActive(index)}
              className={`h-2.5 transition ${index === active ? 'w-12 bg-accent' : 'w-2.5 bg-white/50'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductRail({ title, description, products, link, bgClass = 'bg-transparent' }) {
  return (
    <section className={`py-10 sm:py-16 ${bgClass}`}>
      <div className="page-shell">
        <SectionHeading
          eyebrow="Curated Edit"
          title={title}
          description={description}
          action={
            <Link to={link} className="inline-flex items-center gap-2 text-[13px] font-medium text-primary hover:underline uppercase tracking-[0.12em]">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-4 sm:gap-6">
          {products.map((product) => (
            <div key={product.id} className="min-w-[236px] max-w-[236px] flex-none sm:min-w-[320px] sm:max-w-[320px]">
              <ProductCard product={product} />
            </div>
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
      <SectionHeading
        eyebrow="Trade Feedback"
        title="Trusted by premium retail partners."
        description="Approved buyer reviews are curated from the database and presented in a more editorial, less list-like format."
      />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="relative overflow-hidden border-[var(--color-border-active)] bg-[linear-gradient(180deg,rgba(255,248,245,0.96),rgba(255,255,255,0.96))] p-5 sm:p-8">
          <Quote className="absolute right-4 top-4 h-16 w-16 text-[var(--color-primary)]/10 sm:h-20 sm:w-20" />
          <p className="lux-label mb-5">Featured testimony</p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <img src={featured.avatar} alt={featured.name} className="h-20 w-20 rounded-full object-cover ring-1 ring-[var(--color-border)] sm:h-24 sm:w-24" />
            <div className="max-w-2xl">
              <div className="mb-4 flex gap-1 text-accent">
                {Array.from({ length: featured.rating }).map((_, index) => (
                  <Star key={`${featured.id}-${index}`} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-base leading-8 text-[var(--color-text)] sm:text-lg">{featured.review}</p>
              <div className="mt-6">
                <p className="font-semibold text-[var(--color-text)]">{featured.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{featured.company}</p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4">
          {supporting.map((testimonial) => (
            <Panel key={testimonial.id} className="flex items-start gap-4">
              <img src={testimonial.avatar} alt={testimonial.name} className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16" />
              <div className="min-w-0">
                <div className="mb-3 flex gap-1 text-accent">
                  {Array.from({ length: testimonial.rating }).map((_, index) => (
                    <Star key={`${testimonial.id}-${index}`} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-[var(--color-text-muted)]">{testimonial.review}</p>
                <p className="mt-4 font-semibold text-[var(--color-text)]">{testimonial.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{testimonial.company}</p>
              </div>
            </Panel>
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
      <SectionHeading
        eyebrow="Events"
        title="Previous and upcoming events."
        description="A sliding, card-led view of private previews and showroom moments pulled from the database."
        action={<Link to="/events" className="inline-flex items-center gap-2 text-[13px] font-medium text-primary hover:underline uppercase tracking-[0.12em]">View All <ArrowRight className="h-4 w-4" /></Link>}
      />
      <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-3 sm:gap-5">
        {events.map((event) => {
          const status = getEventStatus(event.date);

          return (
            <Panel key={event.id} className="min-w-[280px] snap-start overflow-hidden p-0 sm:min-w-[360px]">
              <div className="relative">
                <img src={event.image} alt={event.title} className="h-52 w-full object-cover sm:h-64" />
                <span className="absolute left-4 top-4 inline-flex bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                  {status}
                </span>
              </div>
              <div className="space-y-4 p-4 sm:p-6">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" />
                  <span>{new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <h3 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">{event.title}</h3>
                <p className="text-sm leading-7 text-[var(--color-text-muted)]">{event.description}</p>
              </div>
            </Panel>
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
      {brands.map((brand) => {
        const Card = brand.websiteUrl ? 'a' : 'div';
        const cardProps = brand.websiteUrl
          ? { href: brand.websiteUrl, target: '_blank', rel: 'noreferrer' }
          : {};

        return (
          <Card key={brand.id} {...cardProps} className="group flex min-h-[132px] flex-col justify-between border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border-active)] hover:shadow-lg">
            <div className="flex items-center gap-3">
              {brand.logo ? (
                <img src={brand.logo?.secureUrl || brand.logo} alt={brand.name} className="h-12 w-12 rounded-full object-cover ring-1 ring-[var(--color-border)]" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-bg)] text-sm font-semibold text-[var(--color-primary)]">
                  {brand.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text)]">{brand.name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{brand.sector || 'Trusted partner'}</p>
              </div>
            </div>
            {brand.websiteUrl ? (
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--color-primary)]">Visit website</p>
            ) : (
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Brand profile</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function CTABanner() {
  return (
    <section className="w-full bg-primary py-12 text-center sm:py-24">
      <div className="page-shell mx-auto max-w-3xl">
        <h2 className="lux-heading mb-6 text-3xl text-white! sm:mb-8 sm:text-4xl md:text-5xl">Ready to curate your collection?</h2>
        <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link to="/products">
            <Button variant="secondary" className="w-full sm:w-auto">Explore Collection</Button>
          </Link>
          <Link to="/checkout">
            <Button variant="ghost" className="w-full border-white/30! text-white! hover:bg-white/10! sm:w-auto">Shop Now</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
