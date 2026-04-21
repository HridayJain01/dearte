import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, Sparkles, Gem, Ruler, BookOpenCheck } from 'lucide-react';
import { productService } from '../services/productService';
import { EDUCATION_ROUTES } from '../utils/constants';
import { Button, EmptyState, LoadingBlock, Panel, SectionHeading } from '../components/ui/Primitives';
import { TrustedBrandGrid } from '../components/home/HomeSections';
import brandExpressionImage from '../assets/Cormorant Garamond.png';
import processImage from '../assets/process.png';

const ABOUT_PILLARS = [
  {
    title: 'Material Integrity',
    copy: 'Every piece begins with traceable materials and a quality-first sourcing checklist.',
    icon: ShieldCheck,
  },
  {
    title: 'Craft as Culture',
    copy: 'We blend old-world handwork with modern product direction for enduring forms.',
    icon: Sparkles,
  },
  {
    title: 'Responsible Growth',
    copy: 'Design, packaging, and operations are continuously refined to reduce waste.',
    icon: Leaf,
  },
];

const ABOUT_STATS = [
  { label: 'Design-to-approval cycles', value: '72h' },
  { label: 'Retail partners onboarded', value: '250+' },
  { label: 'Average QC pass consistency', value: '99%' },
  { label: 'Cities with active buyers', value: '42' },
];

export function ContactPage() {
  const { data, isLoading } = useQuery({ queryKey: ['contact'], queryFn: productService.contact });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Contact" title="Help desk and trade support" description="Reach De Arté for catalogue assignments, account activation, and event planning." />
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <div className="grid gap-4">
            <input className="border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none" placeholder="Name" />
            <input className="border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none" placeholder="Email" />
            <input className="border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none" placeholder="Mobile" />
            <select className="border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none">
              <option>Buyer Enquiry</option>
              <option>Catalogue Support</option>
              <option>Logistics</option>
            </select>
            <textarea className="min-h-[160px] border border-[var(--color-border)] bg-surface p-4 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none" placeholder="Message" />
            <Button>Submit Enquiry</Button>
          </div>
        </Panel>
        <Panel>
          <p className="lux-label mb-4">Contact Details</p>
          <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>{data.address}</p>
            <p>{data.phone}</p>
            <p>{data.email}</p>
            <p>{data.hours}</p>
          </div>
          <iframe title="DeArte map" src={data.mapsEmbed} className="mt-6 h-[320px] w-full border-0" />
        </Panel>
      </div>
    </section>
  );
}

export function AboutPage() {
  return (
    <div className="pb-10 sm:pb-16">
      <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[radial-gradient(circle_at_15%_20%,rgba(212,168,42,0.18),transparent_35%),radial-gradient(circle_at_82%_12%,rgba(107,15,46,0.14),transparent_38%),linear-gradient(180deg,#fff9f6,#f9eef1)] py-12 sm:py-20">
        <div className="page-shell grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="lux-label mb-4">About De Arté</p>
            <h1 className="lux-heading text-4xl sm:text-6xl md:text-7xl">Modern jewellery, rooted in timeless craft.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">
              De Arté is a B2B fine-jewellery house built for retail partners who value clarity, beauty, and reliability.
              We design with emotional depth, engineer for scale, and deliver collections that feel both elevated and sellable.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/products">
                <Button variant="primary" className="w-full sm:w-auto">Explore Collection</Button>
              </Link>
              <Link to="/contact">
                <Button variant="ghost" className="w-full sm:w-auto">Talk to Sales</Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-3 -top-3 h-16 w-16 border border-[var(--color-accent)]/40 bg-[var(--color-surface)]/70 sm:-left-4 sm:-top-4 sm:h-24 sm:w-24" />
            <img
              src={brandExpressionImage}
              alt="De Arté brand expression"
              className="relative z-10 w-full border border-[var(--color-border)] object-cover shadow-[0_25px_60px_rgba(58,26,40,0.18)]"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="page-shell mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
        {ABOUT_STATS.map((stat) => (
          <Panel key={stat.label} className="border-[var(--color-border-active)]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(250,240,243,0.8))]">
            <p className="lux-label mb-4">{stat.label}</p>
            <p className="text-4xl font-semibold text-[var(--color-primary)] sm:text-5xl">{stat.value}</p>
          </Panel>
        ))}
      </section>

      <section className="page-shell mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <img
          src={processImage}
          alt="De Arté jewellery process"
          className="h-full min-h-[260px] w-full border border-[var(--color-border)] object-cover sm:min-h-[340px]"
          loading="lazy"
        />
        <div>
          <p className="lux-label mb-3">How We Build</p>
          <h2 className="lux-heading text-3xl sm:text-5xl">From concept sketch to showcase-ready pieces.</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">
            Our workflow combines in-house creative direction, disciplined sampling, and quality control at every touchpoint.
            That gives wholesale partners confidence in consistency, finish quality, and delivery timelines.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {ABOUT_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Panel key={pillar.title} className="bg-[var(--color-surface-alt)] p-4">
                  <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                  <h3 className="mt-3 text-base font-semibold text-[var(--color-text)]">{pillar.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-[var(--color-text-muted)]">{pillar.copy}</p>
                </Panel>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export function EducationPage() {
  const { slug = 'diamond' } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['education', slug],
    queryFn: () => productService.education(slug),
  });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  }

  return (
    <section className="section-gap">
      <div className="page-shell">
        <div className="overflow-hidden border border-[var(--color-border)] bg-[linear-gradient(145deg,#fff8f4_0%,#f8ebef_52%,#fff_100%)]">
          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:p-10">
            <div>
              <p className="lux-label mb-3">Education Studio</p>
              <h1 className="lux-heading text-4xl sm:text-6xl">{data.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-muted)] sm:text-base">{data.intro}</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Panel className="bg-[var(--color-surface)] p-3 text-center sm:p-4">
                <Gem className="mx-auto h-5 w-5 text-[var(--color-primary)]" />
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Modules</p>
                <p className="text-2xl font-semibold text-[var(--color-primary)]">{data.sections.length}</p>
              </Panel>
              <Panel className="bg-[var(--color-surface)] p-3 text-center sm:p-4">
                <Ruler className="mx-auto h-5 w-5 text-[var(--color-primary)]" />
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Depth</p>
                <p className="text-2xl font-semibold text-[var(--color-primary)]">Pro</p>
              </Panel>
              <Panel className="bg-[var(--color-surface)] p-3 text-center sm:p-4">
                <BookOpenCheck className="mx-auto h-5 w-5 text-[var(--color-primary)]" />
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Format</p>
                <p className="text-2xl font-semibold text-[var(--color-primary)]">Guide</p>
              </Panel>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
          {EDUCATION_ROUTES.map((item) => (
            <Link
              key={item.slug}
              to={`/education/${item.slug}`}
              className={`px-4 py-3 text-sm tracking-[0.08em] uppercase border transition ${item.slug === slug
                ? 'border-[var(--color-border-active)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-active)] hover:text-[var(--color-primary)]'}`}
            >
              {item.title}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-4 md:grid-cols-2">
            {data.sections.map((section, index) => (
              <Panel key={section.title} className="relative overflow-hidden border-[var(--color-border)]/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(250,240,243,0.9))]">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">Module {String(index + 1).padStart(2, '0')}</p>
                <h3 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">{section.title}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-text-muted)]">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2.5">
                      <span className="mt-[10px] h-1.5 w-1.5 flex-none bg-[var(--color-primary)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>

          <Panel className="h-fit border-[var(--color-border-active)]/30 bg-[var(--color-primary)] p-5 text-white sm:p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/70">Learning Path</p>
            <h3 className="mt-3 text-2xl font-semibold">Use this guide for faster buyer conversations.</h3>
            <p className="mt-4 text-sm leading-7 text-white/80">
              Pair these modules with your product walkthrough to explain quality, value, and care with confidence.
            </p>
            <Link to="/contact" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-accent)] hover:underline">
              Request training support <ArrowRight className="h-4 w-4" />
            </Link>
          </Panel>
        </div>
      </div>
    </section>
  );
}

export function StaticPage({ slug: slugOverride }) {
  const { slug: routeSlug } = useParams();
  const slug = slugOverride || routeSlug;
  const { data, isLoading } = useQuery({
    queryKey: ['static-page', slug],
    queryFn: () => productService.staticPage(slug),
  });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Policy" title={data.title} />
      <Panel>
        <div className="space-y-4 text-sm leading-7 text-[var(--color-text-muted)]">
          {data.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </Panel>
    </section>
  );
}

export function FAQPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['faq'], queryFn: productService.faq });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="FAQ" title="Answers for wholesale buyers" />
      <div className="space-y-4">
        {data.map((faq) => (
          <Panel key={faq.id}>
            <h3 className="text-xl font-semibold text-text">{faq.question}</h3>
            <p className="mt-3 text-sm text-text-muted">{faq.answer}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function EventsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['events'], queryFn: productService.events });
  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Events" title="Upcoming showcases and private previews" />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((event) => (
          <Panel key={event.id}>
            <img src={event.image} alt={event.title} className="h-56 w-full object-cover sm:h-72" />
            <h3 className="mt-5 text-xl font-semibold text-[var(--color-text)] sm:text-2xl">{event.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-accent)]">{event.date}</p>
            <p className="mt-3 text-sm text-text-muted">{event.description}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['testimonials'], queryFn: productService.testimonials });
  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Testimonials" title="Approved retailer feedback" />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((item) => (
          <Panel key={item.id}>
            <div className="flex items-center gap-4">
              <img src={item.avatar} alt={item.name} className="h-14 w-14 object-cover sm:h-16 sm:w-16" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] sm:text-xl">{item.name}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">{item.company}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">{item.review}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function TrustedByPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['trusted-by'], queryFn: productService.trustedBy });

  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;

  return (
    <section className="page-shell section-gap">
      <SectionHeading
        eyebrow="Trusted By"
        title="Brands and retailers that work with us"
        description="This page is powered by the database, so you can maintain the live brand roster from the admin configuration screen."
      />
      <TrustedBrandGrid brands={data} />
      <Panel className="mt-6 bg-[var(--color-surface-alt)]">
        <p className="text-sm leading-7 text-[var(--color-text-muted)]">
          To add or update brands, go to Admin Configuration and manage the Trusted By section.
        </p>
      </Panel>
    </section>
  );
}

export function CareersPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['careers'], queryFn: productService.careers });
  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Careers" title="Join the De Arté team" />
      <div className="space-y-4">
        {data.map((job) => (
          <Panel key={job.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">{job.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{job.location} • {job.type}</p>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">{job.description}</p>
            </div>
            <Button>Apply Now</Button>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <section className="page-shell section-gap">
      <EmptyState
        title="This route isn't part of the De Arté collection."
        description="Try heading back to the home page or explore the main product library."
        action={<Link to="/"><Button>Return Home</Button></Link>}
      />
    </section>
  );
}
