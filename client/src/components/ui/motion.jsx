import { useEffect, useRef } from 'react';

// Presentational motion primitives only — no data, no routing, no state
// that any other component depends on. Both fall back to a static render
// when the user prefers reduced motion.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Rise-and-fade scroll reveal. Pairs with the .reveal / .is-visible CSS in
// index.css. Stagger siblings via the `delay` prop (ms).
export function Reveal({
  as = 'div',
  className = '',
  delay = 0,
  style,
  children,
  ...props
}) {
  const Tag = as;
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      node.classList.add('is-visible');
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { '--reveal-delay': `${delay}ms`, ...style } : style}
      {...props}
    >
      {children}
    </Tag>
  );
}

// Gentle scroll parallax. `speed` is the fraction of viewport progress
// translated into vertical drift — keep it between 0.05 and 0.15.
export function Parallax({ as = 'div', speed = 0.1, className = '', children, ...props }) {
  const Tag = as;
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return undefined;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
      node.style.transform = `translate3d(0, ${(-progress * speed * 100).toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [speed]);

  return (
    <Tag ref={ref} className={className} {...props}>
      {children}
    </Tag>
  );
}
