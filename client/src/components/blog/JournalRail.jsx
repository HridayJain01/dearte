import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../services/aiService';
import { formatDate } from '../../utils/formatters';

// Stock photos are cropped to fill the card; DeArte's own product shots sit on
// white and are shown whole, so a ring is never cut in half.
export function PostImage({ asset, credit, alt, className = '', eager = false }) {
  const src = asset?.secureUrl || '/og-image.png';
  const isPhoto = credit?.source === 'Pexels';
  return (
    <img
      src={src}
      alt={alt || asset?.alt || ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`h-full w-full ${isPhoto ? 'object-cover' : 'object-contain p-4 sm:p-6'} ${className}`}
    />
  );
}

export function PostCard({ post }) {
  const href = `/blog/${post.slug}`;
  return (
    <article className="group flex h-full flex-col border border-[var(--color-border)] bg-[var(--color-surface)] transition duration-500 hover:border-[var(--color-border-active)] hover:shadow-[var(--shadow-lifted)]">
      <Link to={href} className="block aspect-[3/2] overflow-hidden bg-[var(--color-surface)]" tabIndex={-1} aria-hidden>
        <PostImage asset={post.coverImage} credit={post.coverCredit} alt="" className="transition duration-700 group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {post.publishedAt ? (
          <p className="lux-label text-[10px] sm:text-xs">{formatDate(post.publishedAt)}</p>
        ) : null}
        <h3 className="lux-heading mt-2 text-xl leading-snug sm:text-2xl">
          <Link to={href} className="hover:text-[var(--color-primary-hover)]">{post.title}</Link>
        </h3>
        {post.excerpt ? (
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)] sm:text-sm">{post.excerpt}</p>
        ) : null}
        <Link
          to={href}
          className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-primary)] hover:underline"
        >
          Read the article <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

/**
 * The three newest posts, near the foot of the home page. Renders nothing
 * until there are posts, and nothing if the request fails — it is a teaser,
 * never a reason for the home page to show an error.
 */
export function JournalRail() {
  const { data } = useQuery({
    queryKey: ['blog', 'rail'],
    queryFn: () => aiService.blogPosts({ limit: 3 }),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const posts = data?.items || [];
  if (!posts.length) return null;

  return (
    <section className="page-shell section-gap">
      <div className="mb-4 flex flex-col gap-3 sm:mb-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
            <span className="gold-hairline w-6 sm:w-8" aria-hidden />
            <p className="lux-label text-[10px] sm:text-xs">From the journal</p>
          </div>
          <h2 className="lux-heading text-xl sm:text-4xl md:text-5xl">Lab-grown know-how for the trade</h2>
        </div>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-primary)] hover:underline sm:text-[13px]"
        >
          All articles <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}
