import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Gem, Ruler, BookOpenCheck } from 'lucide-react';
import { productService } from '../services/productService';
import { EDUCATION_ROUTES } from '../utils/constants';
import { Button, EmptyState, Input, LoadingBlock, PageError, Panel, SectionHeading } from '../components/ui/Primitives';
import { Select } from '../components/ui/Select';
import { TrustedBrandGrid } from '../components/home/HomeSections';
import { Seo } from '../components/seo/Seo';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { routeSeo } from '../utils/seoRoutes';
import { cdnImage } from '../utils/formatters';
import { breadcrumbSchema, faqSchema, itemListSchema } from '../utils/seo';
import brandExpressionImage from '../assets/Cormorant Garamond.png';
import processImage from '../assets/process.png';

const ABOUT_PILLARS = [
  {
    title: 'Material Integrity',
    copy: 'Every piece begins with traceable materials and a quality-first sourcing checklist.',
  },
  {
    title: 'Craft as Culture',
    copy: 'We blend old-world handwork with modern product direction for enduring forms.',
  },
  {
    title: 'Responsible Growth',
    copy: 'Design, packaging, and operations are continuously refined to reduce waste.',
  },
];

const ABOUT_STATS = [
  { label: 'Design-to-approval cycles', value: '72h' },
  { label: 'Retail partners onboarded', value: '250+' },
  { label: 'Average QC pass consistency', value: '99%' },
  { label: 'Cities with active buyers', value: '42' },
];

export function ContactPage() {
  const [enquiryType, setEnquiryType] = useState('Buyer Enquiry');
  const { data, isLoading, isLoadingError, error, refetch, isFetching } = useQuery({ queryKey: ['contact'], queryFn: productService.contact });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  }
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  // ponytail: no enquiries endpoint exists, so this opens the buyer's email app, addressed
  // and filled in. Post it to the API instead if enquiries should land in the admin.
  const sendEnquiry = (event) => {
    event.preventDefault();
    const { name, email, mobile, message } = Object.fromEntries(new FormData(event.currentTarget));
    const body = `${message}\n\nName: ${name}\nEmail: ${email}\nMobile: ${mobile}`;
    window.location.href = `mailto:${data.email}?subject=${encodeURIComponent(`${enquiryType} from ${name}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="page-shell section-gap">
      <Seo
        {...routeSeo('/contact')}
        path="/contact"
        schema={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
      <SectionHeading as="h1" title="Help desk and trade support" description="Reach De Arté for catalogue assignments, account activation, and event planning." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start lg:gap-12">
        <Panel>
          <form onSubmit={sendEnquiry} className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <Input label="Name" name="name" autoComplete="name" required />
            <Input label="Email" name="email" type="email" autoComplete="email" required />
            <Input label="Mobile" name="mobile" type="tel" autoComplete="tel" />
            <div className="flex flex-col gap-1.5 text-[13px] sm:gap-2 sm:text-sm">
              <span className="text-[var(--color-text-muted)]">Enquiry about</span>
              <Select
                value={enquiryType}
                onChange={setEnquiryType}
                options={['Buyer Enquiry', 'Catalogue Support', 'Logistics']}
              />
            </div>
            <div className="sm:col-span-2">
              <Input as="textarea" label="Message" name="message" className="min-h-[110px] w-full sm:min-h-[160px]" required />
            </div>
            <div>
              <Button type="submit">Send enquiry</Button>
            </div>
          </form>
        </Panel>
        <div>
          <h2 className="lux-heading text-2xl sm:text-3xl">Reach us directly</h2>
          <div className="mt-3 space-y-3 text-base text-[var(--color-text)]">
            <p>{data.address}</p>
            {data.phone ? <p><a href={`tel:${data.phone.replace(/[^\d+]/g, '')}`} className="underline underline-offset-4 hover:text-[var(--color-primary)]">{data.phone}</a></p> : null}
            {data.email ? <p><a href={`mailto:${data.email}`} className="break-words underline underline-offset-4 hover:text-[var(--color-primary)]">{data.email}</a></p> : null}
            {data.hours ? <p>{data.hours}</p> : null}
          </div>
          {/^https:\/\//i.test(data.mapsEmbed || '') && (
            <iframe title="De Arté map" src={data.mapsEmbed} className="mt-3 h-[200px] w-full border-0 sm:mt-6 sm:h-[320px]" />
          )}
        </div>
      </div>
    </section>
  );
}

export function AboutPage() {
  return (
    <div className="pb-10 sm:pb-16">
      <Seo
        {...routeSeo('/about')}
        path="/about"
        schema={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <section className="bg-[var(--color-surface-alt)] py-12 sm:py-20">
        <div className="page-shell grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="lux-heading text-[2rem] sm:text-5xl lg:text-6xl">Modern jewellery, rooted in timeless craft.</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-text)] sm:mt-5 sm:text-lg">
              De Arté is a B2B fine-jewellery house built for retail partners who value clarity, beauty, and reliability.
              We design with emotional depth, engineer for scale, and deliver collections that feel both elevated and sellable.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
              <Button as={Link} to="/collections" variant="primary">Explore Collection</Button>
              <Button as={Link} to="/contact" variant="ghost">Talk to Sales</Button>
            </div>
          </div>

          <img
            src={brandExpressionImage}
            alt="De Arté brand expression"
            className="block w-full"
            loading="lazy"
          />
        </div>
      </section>

      <section className="page-shell mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:mt-14 lg:grid-cols-4">
        {ABOUT_STATS.map((stat) => (
          <div key={stat.label}>
            <p className="font-serif text-5xl leading-none text-[var(--color-primary)] sm:text-6xl">{stat.value}</p>
            <p className="mt-2 text-base leading-snug text-[var(--color-text)]">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="page-shell mt-10 sm:mt-20">
        <h2 className="lux-heading max-w-3xl text-[1.75rem] sm:text-4xl md:text-5xl">From concept sketch to showcase-ready pieces.</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--color-text)] sm:mt-4">
          Our workflow combines in-house creative direction, disciplined sampling, and quality control at every touchpoint.
          That gives wholesale partners confidence in consistency, finish quality, and delivery timelines.
        </p>
        {/* The whole diagram has to show: it is labelled, so a cover crop cut words off. */}
        <div className="mt-6 bg-[var(--color-primary)] sm:mt-10">
          <img
            src={processImage}
            alt="How a piece is made: your vision, responsible materials, the atelier, your creation."
            className="mx-auto block h-auto w-full max-w-5xl"
            loading="lazy"
          />
        </div>
        <div className="mt-6 grid gap-5 sm:mt-10 sm:grid-cols-3 sm:gap-8">
          {ABOUT_PILLARS.map((pillar) => (
            <div key={pillar.title}>
              <h3 className="font-serif text-2xl leading-tight text-[var(--color-primary)]">{pillar.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-[var(--color-text)]">{pillar.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function EducationPage() {
  const { slug = 'diamond' } = useParams();
  const { data, isLoading, isLoadingError, error, refetch, isFetching } = useQuery({
    queryKey: ['education', slug],
    queryFn: () => productService.education(slug),
  });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  }
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  const educationPath = `/education/${slug}`;
  const educationSeo = routeSeo(educationPath);

  return (
    <section className="section-gap">
      {/* The education guides are the only pages here that answer a question a
          buyer types into a search box rather than a brand they already know,
          so they carry Article markup and a full breadcrumb trail. */}
      <Seo
        title={educationSeo.title || data.title}
        description={educationSeo.description || data.intro}
        path={educationPath}
        type="article"
        schema={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: data.title,
            description: data.intro,
            author: { '@type': 'Organization', name: 'DeArte Jewellery' },
            publisher: { '@type': 'Organization', name: 'DeArte Jewellery' },
          },
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Education', path: '/education/diamond' },
            { name: data.title, path: educationPath },
          ]),
        ]}
      />
      <div className="page-shell">
        <div className="overflow-hidden border border-[var(--color-border)] bg-[linear-gradient(145deg,#fff8f4_0%,#f8ebef_52%,#fff_100%)]">
          <div className="grid gap-4 p-3 sm:gap-8 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:p-10">
            <div>
              <p className="lux-label mb-2 text-[13px] sm:mb-3 sm:text-[13px]">Education Studio</p>
              <h1 className="lux-heading text-2xl sm:text-6xl">{data.title}</h1>
              <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text)] sm:mt-4 sm:text-base sm:leading-7">{data.intro}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              <Panel className="bg-[var(--color-surface)] p-2 text-center sm:p-4">
                <Gem className="mx-auto h-4 w-4 text-[var(--color-primary)] sm:h-5 sm:w-5" />
                <p className="mt-1.5 text-[13px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] sm:mt-2 sm:text-[13px] sm:tracking-[0.14em]">Modules</p>
                <p className="text-lg font-semibold text-[var(--color-primary)] sm:text-2xl">{data.sections.length}</p>
              </Panel>
              <Panel className="bg-[var(--color-surface)] p-2 text-center sm:p-4">
                <Ruler className="mx-auto h-4 w-4 text-[var(--color-primary)] sm:h-5 sm:w-5" />
                <p className="mt-1.5 text-[13px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] sm:mt-2 sm:text-[13px] sm:tracking-[0.14em]">Depth</p>
                <p className="text-lg font-semibold text-[var(--color-primary)] sm:text-2xl">Pro</p>
              </Panel>
              <Panel className="bg-[var(--color-surface)] p-2 text-center sm:p-4">
                <BookOpenCheck className="mx-auto h-4 w-4 text-[var(--color-primary)] sm:h-5 sm:w-5" />
                <p className="mt-1.5 text-[13px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] sm:mt-2 sm:text-[13px] sm:tracking-[0.14em]">Format</p>
                <p className="text-lg font-semibold text-[var(--color-primary)] sm:text-2xl">Guide</p>
              </Panel>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-8 sm:gap-3">
          {EDUCATION_ROUTES.map((item) => (
            <Link
              key={item.slug}
              to={`/education/${item.slug}`}
              className={`whitespace-nowrap border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.06em] transition sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.08em] ${item.slug === slug
                ? 'border-[var(--color-border-active)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-active)] hover:text-[var(--color-primary)]'}`}
            >
              {item.title}
            </Link>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {data.sections.map((section, index) => (
              <Panel key={section.title} className="relative overflow-hidden border-[var(--color-border)]/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(250,240,243,0.9))]">
                <p className="mb-2 text-[13px] uppercase tracking-[0.14em] text-[var(--color-primary)] sm:mb-3 sm:text-[13px] sm:tracking-[0.2em]">Module {String(index + 1).padStart(2, '0')}</p>
                <h3 className="text-base font-semibold text-[var(--color-text)] sm:text-2xl">{section.title}</h3>
                <ul className="mt-2.5 space-y-1.5 text-[15px] leading-relaxed text-[var(--color-text)] sm:mt-4 sm:space-y-3 sm:text-base sm:leading-7">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 sm:gap-2.5">
                      <span className="mt-[7px] h-1 w-1 flex-none bg-[var(--color-primary)] sm:mt-[10px] sm:h-1.5 sm:w-1.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>

          <Panel className="h-fit border-[var(--color-border-active)]/30 bg-[var(--color-primary)] text-white sm:p-6">
            <p className="text-[13px] uppercase tracking-[0.12em] text-white/70 sm:text-[13px] sm:tracking-[0.16em]">Learning Path</p>
            <h3 className="mt-2 text-base font-semibold sm:mt-3 sm:text-2xl">Use this guide for faster buyer conversations.</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/80 sm:mt-4 sm:text-sm sm:leading-7">
              Pair these modules with your product walkthrough to explain quality, value, and care with confidence.
            </p>
            <Link to="/contact" className="mt-3 inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.12em] text-[var(--color-accent)] hover:underline sm:mt-6 sm:gap-2 sm:text-[13px] sm:tracking-[0.16em]">
              Request training support <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
  const { data, isLoading, isLoadingError, error, refetch, isFetching } = useQuery({
    queryKey: ['static-page', slug],
    queryFn: () => productService.staticPage(slug),
  });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  }
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  return (
    <section className="page-shell section-gap">
      <Seo {...routeSeo(`/${slug}`)} title={routeSeo(`/${slug}`).title || data.title} path={`/${slug}`} />
      <SectionHeading as="h1" eyebrow="Policy" title={data.title} />
      <Panel>
        <div className="space-y-3 text-[15px] leading-relaxed text-[var(--color-text)] sm:space-y-4 sm:text-base sm:leading-7">
          {data.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </Panel>
    </section>
  );
}

export function FAQPage() {
  const { data = [], isLoading, isLoadingError, error, refetch, isFetching } = useQuery({ queryKey: ['faq'], queryFn: productService.faq });

  if (isLoading) {
    return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  }
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  return (
    <section className="page-shell section-gap">
      {/* The one rich result this catalogue can win outright: an FAQ block
          expands straight into the SERP, so the Q&A is marked up verbatim. */}
      <Seo
        {...routeSeo('/faq')}
        path="/faq"
        schema={[
          faqSchema(data),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'FAQ', path: '/faq' },
          ]),
        ]}
      />
      <SectionHeading as="h1" eyebrow="FAQ" title="Answers for wholesale buyers" />
      <div className="space-y-2.5 sm:space-y-4">
        {data.map((faq) => (
          <Panel key={faq.id}>
            <h3 className="text-[14px] font-semibold text-text sm:text-xl">{faq.question}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-text)] sm:mt-3 sm:text-base">{faq.answer}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function EventsPage() {
  const { data = [], isLoading, isLoadingError, error, refetch, isFetching } = useQuery({ queryKey: ['events'], queryFn: productService.events });
  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  return (
    <section className="page-shell section-gap">
      <Seo {...routeSeo('/events')} path="/events" />
      <SectionHeading as="h1" eyebrow="Events" title="Upcoming showcases and private previews" />
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-2">
        {data.map((event) => (
          <Panel key={event.id}>
            <img src={cdnImage(event.image, 1200)} alt={event.title} className="h-40 w-full object-cover sm:h-72" loading="lazy" decoding="async" />
            <h3 className="mt-2.5 text-base font-semibold text-[var(--color-text)] sm:mt-5 sm:text-2xl">{event.title}</h3>
            <p className="mt-1 text-[13px] text-[var(--color-primary)] sm:mt-2 sm:text-sm">{event.date}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-text)] sm:mt-3 sm:text-base">{event.description}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsPage() {
  const { data = [], isLoading, isLoadingError, error, refetch, isFetching } = useQuery({ queryKey: ['testimonials'], queryFn: productService.testimonials });
  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  return (
    <section className="page-shell section-gap">
      <Seo {...routeSeo('/testimonials')} path="/testimonials" />
      <SectionHeading as="h1" eyebrow="Testimonials" title="Approved retailer feedback" />
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-2">
        {data.map((item) => (
          <Panel key={item.id}>
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={cdnImage(item.avatar, 128)} alt={item.name} className="h-10 w-10 object-cover sm:h-16 sm:w-16" loading="lazy" decoding="async" />
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--color-text)] sm:text-xl">{item.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)] sm:text-sm">{item.company}</p>
              </div>
            </div>
            <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--color-text)] sm:mt-4 sm:text-base">{item.review}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function TrustedByPage() {
  const { data = [], isLoading, isLoadingError, error, refetch, isFetching } = useQuery({ queryKey: ['trusted-by'], queryFn: productService.trustedBy });

  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  return (
    <section className="page-shell section-gap">
      <Seo {...routeSeo('/trusted-by')} path="/trusted-by" />
      <SectionHeading
        as="h1"
        eyebrow="Trusted By"
        title="Brands and retailers that work with us"
        description="The jewellery houses, retail chains and independent boutiques that source their lab-grown diamond ranges from the De Arté atelier."
      />
      <TrustedBrandGrid brands={data} />
      <Panel className="mt-6 bg-[var(--color-surface-alt)]">
        <p className="text-[15px] leading-7 text-[var(--color-text)]">
          Interested in stocking De Arté? <Link to="/contact" className="text-[var(--color-primary)] underline underline-offset-4">Talk to the trade desk</Link> about
          wholesale terms, private-label manufacturing and catalogue access.
        </p>
      </Panel>
    </section>
  );
}

export function CareersPage() {
  const { email } = useSiteSettings();
  const { data = [], isLoading, isLoadingError, error, refetch, isFetching } = useQuery({ queryKey: ['careers'], queryFn: productService.careers });
  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock /></div>;
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  return (
    <section className="page-shell section-gap">
      <Seo
        {...routeSeo('/careers')}
        path="/careers"
        schema={itemListSchema(
          data.map((job) => ({ name: job.title, path: '/careers' })),
          { name: 'Open roles at DeArte Jewellery' },
        )}
      />
      <SectionHeading as="h1" eyebrow="Careers" title="Join the De Arté team" />
      <div className="space-y-2.5 sm:space-y-4">
        {data.map((job) => (
          <Panel key={job.id} className="flex flex-col gap-2.5 sm:gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text)] sm:text-2xl">{job.title}</h3>
              <p className="mt-1 text-[13px] text-[var(--color-text-muted)] sm:mt-2 sm:text-sm">{job.location} • {job.type}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-text)] sm:mt-3 sm:text-base">{job.description}</p>
            </div>
            <div className="flex md:shrink-0">
              <Button as="a" href={`mailto:${email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}>Apply Now</Button>
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <section className="page-shell section-gap">
      {/* A SPA cannot return a real 404 status from a static host, so the miss
          is signalled the only other way a crawler understands: noindex. Without
          it every mistyped URL becomes an indexable soft 404. */}
      <Seo title="Page not found" noindex />
      <EmptyState
        title="This route isn't part of the De Arté collection."
        description="Try heading back to the home page or explore the main product library."
        action={<Button as={Link} to="/">Return Home</Button>}
      />
    </section>
  );
}
