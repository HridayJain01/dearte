import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { productService } from '../services/productService';
import { EDUCATION_ROUTES } from '../utils/constants';
import { Button, EmptyState, LoadingBlock, Panel, SectionHeading } from '../components/ui/Primitives';

export function ContactPage() {
  const { data, isLoading } = useQuery({ queryKey: ['contact'], queryFn: productService.contact });

  if (isLoading) {
    return <div className="page-shell py-16"><LoadingBlock /></div>;
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
            <textarea className="min-h-[160px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text)] focus:border-[var(--color-border-active)] outline-none" placeholder="Message" />
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

export function EducationPage() {
  const { slug = 'diamond' } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['education', slug],
    queryFn: () => productService.education(slug),
  });

  if (isLoading) {
    return <div className="page-shell py-16"><LoadingBlock /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <div className="mb-8 flex flex-wrap gap-3">
        {EDUCATION_ROUTES.map((item) => (
          <Link key={item.slug} to={`/education/${item.slug}`} className={`px-4 py-3 text-sm border ${item.slug === slug ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-active)]'}`}>
            {item.title}
          </Link>
        ))}
      </div>
      <SectionHeading eyebrow="Education" title={data.title} description={data.intro} />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.sections.map((section) => (
          <Panel key={section.title}>
            <h3 className="text-2xl font-semibold text-[var(--color-text)]">{section.title}</h3>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-text-muted)]">
              {section.bullets.map((bullet) => <li key={bullet}>• {bullet}</li>)}
            </ul>
          </Panel>
        ))}
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
    return <div className="page-shell py-16"><LoadingBlock /></div>;
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
    return <div className="page-shell py-16"><LoadingBlock /></div>;
  }

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="FAQ" title="Answers for wholesale buyers" />
      <div className="space-y-4">
        {data.map((faq) => (
          <Panel key={faq.id}>
            <h3 className="text-xl font-semibold text-[var(--color-text)]">{faq.question}</h3>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">{faq.answer}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function EventsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['events'], queryFn: productService.events });
  if (isLoading) return <div className="page-shell py-16"><LoadingBlock /></div>;

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Events" title="Upcoming showcases and private previews" />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((event) => (
          <Panel key={event.id}>
            <img src={event.image} alt={event.title} className="h-72 w-full object-cover" />
            <h3 className="mt-5 text-2xl font-semibold text-[var(--color-text)]">{event.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-accent)]">{event.date}</p>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">{event.description}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['testimonials'], queryFn: productService.testimonials });
  if (isLoading) return <div className="page-shell py-16"><LoadingBlock /></div>;

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Testimonials" title="Approved retailer feedback" />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((item) => (
          <Panel key={item.id}>
            <div className="flex items-center gap-4">
              <img src={item.avatar} alt={item.name} className="h-16 w-16 object-cover" />
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-text)]">{item.name}</h3>
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

export function CareersPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['careers'], queryFn: productService.careers });
  if (isLoading) return <div className="page-shell py-16"><LoadingBlock /></div>;

  return (
    <section className="page-shell section-gap">
      <SectionHeading eyebrow="Careers" title="Join the De Arté team" />
      <div className="space-y-4">
        {data.map((job) => (
          <Panel key={job.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-[var(--color-text)]">{job.title}</h3>
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
