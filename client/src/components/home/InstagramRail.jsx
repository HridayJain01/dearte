import { useQuery } from '@tanstack/react-query';
import api, { unwrap } from '../../services/api';

// lucide dropped brand marks, so the Instagram glyph is drawn inline.
function InstagramGlyph({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Tile({ post, feature = false }) {
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block overflow-hidden bg-[var(--color-surface)] ${
        feature ? 'md:col-span-2 md:row-span-2' : ''
      } aspect-square w-[72vw] shrink-0 snap-start sm:w-[44vw] md:w-auto`}
    >
      <img
        src={post.image}
        alt={post.caption || 'DeArte on Instagram'}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[rgba(40,6,18,0.82)] via-[rgba(40,6,18,0.15)] to-transparent p-5 opacity-0 transition duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
        <InstagramGlyph className="mb-3 h-5 w-5 text-[var(--color-accent)]" />
        {post.caption ? (
          <p style={{ fontFamily: "var(--font-serif)" }} className={`text-white/90 ${feature ? 'line-clamp-4 text-xl' : 'line-clamp-3 text-base'} italic leading-snug`}>
            {post.caption}
          </p>
        ) : null}
      </div>
    </a>
  );
}

/** Latest Instagram posts as an editorial grid. Renders nothing until there are posts. */
export function InstagramRail({ profileUrl }) {
  const { data } = useQuery({
    queryKey: ['instagram'],
    queryFn: () => unwrap(api.get('/instagram')),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const posts = (data || []).slice(0, 5);
  if (!posts.length) return null;
  const handle = profileUrl?.match(/instagram\.com\/([^/?#]+)/i)?.[1];

  return (
    <section className="page-shell section-gap">
      <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-14">
        <div className="mb-4 flex items-center justify-center gap-4 text-[var(--color-accent)]">
          <span className="h-px w-10 bg-current opacity-60" />
          <InstagramGlyph className="h-5 w-5" />
          <span className="h-px w-10 bg-current opacity-60" />
        </div>
        <h2 className="lux-heading text-[2rem] sm:text-5xl md:text-6xl">From the Atelier</h2>
        {handle ? (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[13px] uppercase tracking-[0.28em] text-[var(--color-primary)] transition hover:text-[var(--color-accent)]"
          >
            @{handle}
          </a>
        ) : null}
      </header>

      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        {posts.map((post, i) => <Tile key={post.id} post={post} feature={i === 0} />)}
      </div>

      {profileUrl ? (
        <div className="mt-10 text-center sm:mt-14">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 border border-[var(--color-primary)] px-8 py-3.5 text-[13px] font-medium uppercase tracking-[0.2em] text-[var(--color-primary)] transition duration-500 hover:bg-[var(--color-primary)] hover:text-white"
          >
            <InstagramGlyph className="h-4 w-4" />
            Follow our journey
          </a>
        </div>
      ) : null}
    </section>
  );
}
