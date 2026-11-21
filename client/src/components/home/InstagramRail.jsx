import { useQuery } from '@tanstack/react-query';
import api, { unwrap } from '../../services/api';

// Latest Instagram posts. Renders nothing until the API has a token and posts.
export function InstagramRail({ profileUrl }) {
  const { data } = useQuery({
    queryKey: ['instagram'],
    queryFn: () => unwrap(api.get('/instagram')),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const posts = (data || []).slice(0, 8);
  if (!posts.length) return null;

  return (
    <section className="page-shell section-gap">
      <div className="mb-4 flex flex-col gap-3 sm:mb-10 md:flex-row md:items-end md:justify-between">
        <h2 className="lux-heading text-[1.75rem] sm:text-4xl md:text-5xl">On Instagram</h2>
        {profileUrl ? (
          <a href={profileUrl} target="_blank" rel="noopener noreferrer"
            className="text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--color-primary)] hover:underline">
            Follow us
          </a>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        {posts.map((p) => (
          <a key={p.id} href={p.permalink} target="_blank" rel="noopener noreferrer"
            className="group block aspect-square overflow-hidden bg-[var(--color-surface)]">
            <img src={p.image} alt={p.caption || 'Instagram post'} loading="lazy" decoding="async"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
          </a>
        ))}
      </div>
    </section>
  );
}
