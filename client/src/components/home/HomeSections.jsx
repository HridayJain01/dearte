import { ArrowRight, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Panel, SectionHeading } from '../ui/Primitives';
import { ProductCard } from '../product/ProductCard';
import { SUPPORT_PAGES } from '../../utils/constants';

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
    <section className="page-shell py-8">
      <div className="relative min-h-[100vh] overflow-hidden">
        <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[rgba(107,15,46,0.25)]" />
        <div className="relative z-10 flex min-h-[100vh] max-w-3xl flex-col justify-center gap-6 px-8 py-16 md:px-16 animate-hero-entry">
          <p className="lux-label !text-white/80">Luxury B2B Jewellery Platform</p>
          {slide.offerBadge ? (
            <p className="inline-flex w-fit border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              {slide.offerBadge}
            </p>
          ) : null}
          <h1 key={slide.id} className="lux-heading text-6xl md:text-8xl !text-white">
            {slide.title}
          </h1>
          <p className="max-w-xl text-base text-white/70 md:text-lg">{slide.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Link to={slide.ctaLink}>
              <Button variant="primary">{slide.ctaLabel}</Button>
            </Link>
            <Link to="/contact">
              <Button variant="ghost" className="!border-white/30 !text-white hover:!bg-white/10">Talk to Sales</Button>
            </Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-8 flex items-center gap-3">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              onClick={() => setActive(index)}
              className={`h-2.5 transition ${index === active ? 'w-12 bg-[var(--color-accent)]' : 'w-2.5 bg-white/50'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductRail({ title, description, products, link, bgClass = 'bg-transparent' }) {
  return (
    <section className={`py-16 ${bgClass}`}>
      <div className="page-shell">
        <SectionHeading
          eyebrow="Curated Edit"
          title={title}
          description={description}
          action={
            <Link to={link} className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-primary)] hover:underline uppercase tracking-[0.12em]">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <div className="hide-scrollbar flex gap-6 overflow-x-auto pb-4">
        {products.map((product) => (
          <div key={product.id} className="min-w-[320px] max-w-[320px] flex-none">
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
    <section className="bg-[var(--color-surface-alt)] py-20 border-t border-[var(--color-border)]">
      <div className="page-shell editorial-grid items-center">
        <div className="pr-10">
          <p className="lux-label mb-3">{companyInfo.founded}</p>
          <h3 className="lux-heading text-5xl mb-6">{companyInfo.tagline}</h3>
          <Link to="/about">
            <Button variant="ghost">Read our story &rarr;</Button>
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="lux-label mb-3">Certifications</p>
            <div className="flex flex-wrap gap-2">
              {companyInfo.certifications.map((item) => (
                <span key={item} className="border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)]">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="lux-label mb-3">Mission</p>
            <p className="text-sm leading-7 text-[var(--color-text)]">{companyInfo.mission}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialRail({ testimonials }) {
  return (
    <section className="page-shell section-gap">
      <SectionHeading
        eyebrow="Trade Feedback"
        title="Trusted by premium retail partners."
        description="Approved buyer reviews and showroom-facing testimonials moderated through the admin panel."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {testimonials.map((testimonial) => (
          <Panel key={testimonial.id} className="flex gap-5">
            <img src={testimonial.avatar} alt={testimonial.name} className="h-20 w-20 object-cover" />
            <div>
              <div className="mb-4 flex gap-1 text-[var(--color-accent)]">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={`${testimonial.id}-${index}`} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm leading-7 text-[var(--color-text-muted)]">{testimonial.review}</p>
              <p className="mt-4 font-semibold text-[var(--color-text)]">{testimonial.name}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{testimonial.company}</p>
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function SupportStrip() {
  return (
    <section className="bg-[var(--color-surface-alt)] py-16">
      <div className="page-shell grid gap-8 md:grid-cols-4">
        {SUPPORT_PAGES.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="flex flex-col items-center text-center gap-2">
              <div className="p-4 bg-[var(--color-primary)] text-white inline-flex mb-3 hover:bg-[var(--color-primary-hover)] transition duration-300">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-primary)]">{item.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{item.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CTABanner() {
  return (
    <section className="w-full bg-[var(--color-primary)] py-24 text-center">
      <div className="page-shell max-w-3xl mx-auto">
        <h2 className="lux-heading !text-white text-4xl md:text-5xl mb-8">Ready to curate your collection?</h2>
        <div className="flex justify-center gap-4">
          <Link to="/products">
            <Button variant="secondary">Explore Collection</Button>
          </Link>
          <Link to="/checkout">
            <Button variant="ghost" className="!border-white/30 !text-white hover:!bg-white/10">Shop Now</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
