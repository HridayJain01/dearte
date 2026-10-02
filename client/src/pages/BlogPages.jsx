import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Seo } from '../components/seo/Seo';
import { EmptyState, LoadingBlock, PageError, Panel, SectionHeading } from '../components/ui/Primitives';
import { ProductCard } from '../components/product/ProductCard';
import { PostCard, PostImage } from '../components/blog/JournalRail';
import { aiService } from '../services/aiService';
import { routeSeo } from '../utils/seoRoutes';
import { SITE_NAME, SITE_URL, absoluteUrl, breadcrumbSchema, faqSchema, itemListSchema } from '../utils/seo';
import { formatDate } from '../utils/formatters';

const isNotFound = (error) => error?.response?.status === 404;

// The build writes the post's JSON into its static page (scripts/blogShell.mjs),
// so a visitor arriving from search sees the article without waiting on the API.
function prerenderedPost(slug) {
  try {
    const node = document.getElementById('prerendered-post');
    const post = node ? JSON.parse(node.textContent) : null;
    return post?.slug === slug ? post : undefined;
  } catch {
    return undefined;
  }
}

export function BlogListPage() {
  const seo = routeSeo('/blog');
  const { data, isLoading, isLoadingError, error, refetch, isFetching } = useQuery({
    queryKey: ['blog', 'list'],
    queryFn: () => aiService.blogPosts({ limit: 48 }),
  });

  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading articles..." /></div>;
  // An API from before the blog existed answers 404; that is "no articles yet".
  if (isLoadingError && !isNotFound(error)) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  const posts = data?.items || [];

  return (
    <section className="page-shell section-gap">
      <Seo
        title={seo.title}
        description={seo.description}
        path="/blog"
        schema={itemListSchema(posts.map((post) => ({ name: post.title, path: `/blog/${post.slug}` })), { name: 'DeArte journal' })}
      />
      <SectionHeading
        as="h1"
        eyebrow="Journal"
        title="The DeArte journal"
        description="Lab-grown diamond know-how, styling ideas and retail advice for jewellery buyers."
      />
      {posts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      ) : (
        <EmptyState title="The first articles are on their way" description="New guides and styling notes for jewellery retailers appear here every week." />
      )}
    </section>
  );
}

function Credit({ credit }) {
  if (!credit?.name) return null;
  return (
    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
      Photo by{' '}
      <a href={credit.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-primary)]">
        {credit.name}
      </a>
      {credit.source ? ` on ${credit.source}` : ''}
    </p>
  );
}

function ArticleSection({ section }) {
  return (
    <section className="mt-8 sm:mt-12">
      <h2 className="lux-heading text-2xl sm:text-4xl">{section.heading}</h2>
      {section.paragraphs.map((paragraph, index) => (
        <p key={index} className="mt-3 text-[15px] leading-7 text-[var(--color-text)] sm:mt-4 sm:text-base sm:leading-8">{paragraph}</p>
      ))}
      {section.bullets.length ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-7 text-[var(--color-text)] marker:text-[var(--color-accent)] sm:mt-4 sm:text-base">
          {section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const { data: post, isLoading, isLoadingError, error, refetch, isFetching } = useQuery({
    queryKey: ['blog', 'post', slug],
    queryFn: () => aiService.blogPost(slug),
    initialData: () => prerenderedPost(slug),
    // Build-time data: show it at once, then refresh it in the background.
    initialDataUpdatedAt: 0,
  });

  if (isLoading) return <div className="page-shell py-10 sm:py-16"><LoadingBlock label="Loading article..." /></div>;
  if (isLoadingError && isNotFound(error)) {
    return (
      <section className="page-shell section-gap">
        <Seo title="Article not found" noindex />
        <EmptyState
          title="This article isn't available"
          description="It may have been taken down or the link is wrong."
          action={<Link to="/blog" className="text-sm uppercase tracking-[0.12em] text-[var(--color-primary)] hover:underline">Back to the journal</Link>}
        />
      </section>
    );
  }
  if (isLoadingError) return <PageError error={error} onRetry={refetch} retrying={isFetching} />;

  const path = `/blog/${post.slug}`;
  const minutes = Math.max(1, Math.round((post.wordCount || 0) / 200));
  const categories = [...new Set(post.products.map((product) => product.category).filter(Boolean))];
  const usesPexels = [post.coverCredit, post.inlineCredit].some((credit) => credit?.source === 'Pexels');
  const cover = post.coverImage?.secureUrl ? post.coverImage : null;

  return (
    <article className="section-gap">
      <Seo
        title={post.title}
        description={post.metaDescription || post.excerpt}
        path={path}
        type="article"
        image={cover?.secureUrl}
        imageAlt={cover?.alt}
        schema={[
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.metaDescription || post.excerpt,
            ...(cover ? { image: [cover.secureUrl] } : {}),
            datePublished: post.publishedAt,
            dateModified: post.updatedAt || post.publishedAt,
            mainEntityOfPage: absoluteUrl(path),
            author: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
            publisher: { '@id': `${SITE_URL}/#organization` },
            ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
          },
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Journal', path: '/blog' },
            { name: post.title, path },
          ]),
          faqSchema(post.faq),
        ]}
      />

      <div className="page-shell">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="lux-label text-[11px] sm:text-xs">
            <Link to="/blog" className="hover:text-[var(--color-primary)]">Journal</Link>
          </nav>
          <h1 className="lux-heading mt-3 text-3xl leading-tight sm:text-5xl md:text-6xl">{post.title}</h1>
          <p className="mt-3 text-[12px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] sm:text-xs">
            {post.publishedAt ? formatDate(post.publishedAt) : ''} · {minutes} min read
          </p>
        </div>

        {cover ? (
          <figure className="mx-auto mt-6 max-w-4xl sm:mt-10">
            <div className="aspect-[16/9] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
              <PostImage asset={cover} credit={post.coverCredit} alt={cover.alt || post.title} eager />
            </div>
            <Credit credit={post.coverCredit} />
          </figure>
        ) : null}

        <div className="mx-auto max-w-3xl">
          {post.excerpt ? (
            <p className="mt-6 text-lg leading-8 text-[var(--color-text)] sm:mt-10 sm:text-xl sm:leading-9">{post.excerpt}</p>
          ) : null}

          {post.sections.map((section, index) => (
            <Fragment key={index}>
              <ArticleSection section={section} />
              {index === 1 && post.inlineImage?.secureUrl ? (
                <figure className="mt-8 sm:mt-12">
                  <div className="aspect-[3/2] overflow-hidden border border-[var(--color-border)]">
                    <PostImage asset={post.inlineImage} credit={post.inlineCredit} alt={post.inlineImage.alt} />
                  </div>
                  <Credit credit={post.inlineCredit} />
                </figure>
              ) : null}
            </Fragment>
          ))}

          {post.faq.length ? (
            <section className="mt-10 sm:mt-14">
              <h2 className="lux-heading text-2xl sm:text-4xl">Questions retailers ask</h2>
              <dl className="mt-4 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {post.faq.map((entry, index) => (
                  <div key={index} className="py-4">
                    <dt className="font-medium text-[var(--color-text)]">{entry.question}</dt>
                    <dd className="mt-2 text-[15px] leading-7 text-[var(--color-text-muted)]">{entry.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        {post.products.length ? (
          <section className="mt-12 sm:mt-16">
            <div className="mb-4 flex items-center gap-2 sm:mb-8 sm:gap-3">
              <span className="gold-hairline w-6 sm:w-8" aria-hidden />
              <h2 className="lux-label text-[11px] sm:text-xs">Pieces from this story</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
              {post.products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {categories.length ? (
              <p className="mt-5 text-sm text-[var(--color-text-muted)]">
                Explore:{' '}
                {categories.map((name, index) => (
                  <Fragment key={name}>
                    {index ? ' · ' : ''}
                    <Link to={`/products?category=${encodeURIComponent(name)}`} className="text-[var(--color-primary)] hover:underline">{name}</Link>
                  </Fragment>
                ))}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="mx-auto mt-12 max-w-3xl sm:mt-16">
          <Panel className="bg-[var(--color-primary)] text-white sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/70 sm:text-xs">For retailers</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-3xl">Stock DeArte lab-grown diamond jewellery</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Browse the full trade catalogue, request custom pieces or start a private label range.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.14em] sm:text-xs">
              <Link to="/register" className="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline">
                Open a trade account <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-1.5 text-white hover:underline">
                Talk to the trade desk <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </Panel>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Prepared by the DeArte editorial desk with AI assistance.
            {usesPexels ? (
              <>
                {' '}Photos provided by{' '}
                <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-primary)]">Pexels</a>.
              </>
            ) : null}
          </p>
        </div>

        {post.related?.length ? (
          <section className="mt-12 sm:mt-16">
            <div className="mb-4 flex items-center justify-between gap-3 sm:mb-8">
              <h2 className="lux-heading text-xl sm:text-3xl">More from the journal</h2>
              <Link to="/blog" className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-primary)] hover:underline sm:text-xs">All articles</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {post.related.map((item) => <PostCard key={item.id} post={item} />)}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
