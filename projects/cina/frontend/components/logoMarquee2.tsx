import React, { CSSProperties, useMemo, useState } from "react";

// TypeScript interfaces for better type safety
interface GroupItem {
  /** Default (non-hover) logo image URL. Supports http(s) and data: URIs */
  normalSrc: string;
  /** Optional hover-state logo image URL */
  hoverSrc?: string;
  /** Accessible alt text for the logo */
  alt?: string;
  /** Optional link to wrap the logo */
  href?: string;
}

interface GroupsMarqueeProps {
  /** Section title shown above the marquee */
  title?: string;
  /** Array of logos (normal & hover src, optional href) */
  items: GroupItem[];
  /** Seconds to complete one full loop */
  speed?: number;
  /** Spacing between logos (e.g. 24, '1.5rem', '12px'). Defaults to '2.5rem' */
  gap?: number | string;
  /** Logo height in px. Width auto-scales to preserve aspect ratio. */
  logoHeight?: number;
  /** Pause animation on hover/focus (default: true) */
  pauseOnHover?: boolean;
  /** Scroll direction */
  direction?: "left" | "right";
  /** Extra class names for the root container */
  className?: string;
  /** Inline styles for the root container */
  style?: CSSProperties;
  /** aria-label for the logos scroller */
  ariaLabel?: string;
}

const cls = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

/**
 * Infinite marquee of partner logos with hover-swap images and optional links.
 * - Tailwind-first styling; works without external CSS besides Tailwind.
 * - Duplicates the items to create a seamless loop.
 * - Uses a dynamic @keyframes name per instance to avoid collisions.
 */
export default function GroupsMarquee({
  title,
  items,
  speed = 40,
  gap = "2.5rem",
  logoHeight = 56,
  pauseOnHover = true,
  direction = "left",
  className,
  style,
  ariaLabel,
}: GroupsMarqueeProps) {
  const [isPaused, setPaused] = useState(false);

  // Ensure we have at least one item to render
  const safeItems = Array.isArray(items) && items.length > 0 ? items : [];

  // Duplicate items for seamless looping
  const doubled = useMemo(() => [...safeItems, ...safeItems], [safeItems]);

  // Unique keyframes name so multiple components won't clash
  const animationName = useMemo(() => {
    const id = Math.random().toString(36).slice(2, 8);
    return `gm-marquee-${direction}-${id}`;
  }, [direction]);

  // Build the keyframes CSS for the given direction
  const keyframes = useMemo(() => {
    // Translate half the width since we render two copies in a row
    const fromX = direction === "left" ? "0%" : "-50%";
    const toX = direction === "left" ? "-50%" : "0%";
    return `@keyframes ${animationName} { from { transform: translateX(${fromX}); } to { transform: translateX(${toX}); } }`;
  }, [animationName, direction]);

  const trackStyle: CSSProperties = {
    gap: typeof gap === "number" ? `${gap}px` : gap,
    animation: `${animationName} ${Math.max(1, speed)}s linear infinite`,
    animationPlayState: isPaused && pauseOnHover ? "paused" : "running",
  };

  const logoBoxStyle: CSSProperties = {
    height: `${logoHeight}px`,
  };

  return (
    <section
      className={cls("w-full", className)}
      style={style}
      aria-label={ariaLabel || title || "Partners logos"}
    >
      {/* Inject dynamic keyframes */}
      <style>{keyframes}</style>

      {title ? (
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      ) : null}

      <div
        className={cls(
          "relative w-full overflow-hidden rounded-2xl bg-white/40 p-3 shadow-sm ring-1 ring-black/5",
          "dark:bg-white/5 dark:ring-white/10"
        )}
        onMouseEnter={() => pauseOnHover && setPaused(true)}
        onMouseLeave={() => pauseOnHover && setPaused(false)}
        onFocusCapture={() => pauseOnHover && setPaused(true)}
        onBlurCapture={() => pauseOnHover && setPaused(false)}
      >
        {/* Visually-hidden padding guards to fade edges (optional):
            Add gradient masks on left/right for nicer cut-off */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white/80 to-transparent dark:from-gray-950/70" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/80 to-transparent dark:from-gray-950/70" />

        {/* Track: two copies of items for seamless loop */}
        <div
          role="list"
          aria-label={ariaLabel || "logos scroller"}
          className={cls(
            "flex w-max min-w-full items-center",
            "[backface-visibility:hidden] will-change-transform"
          )}
          style={trackStyle}
        >
          {doubled.map((item, idx) => (
            <LogoCell key={`${idx}-${item.normalSrc}`} item={item} logoBoxStyle={logoBoxStyle} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LogoCell({
  item,
  logoBoxStyle,
}: {
  item: GroupItem;
  logoBoxStyle: CSSProperties;
}) {
  const Box = (
    <div
      role="listitem"
      className={cls(
        "group relative grid place-items-center",
        "shrink-0 rounded-xl bg-white/70 px-5 py-3 backdrop-blur-sm",
        "ring-1 ring-black/5 transition-shadow hover:shadow-sm dark:bg-white/10 dark:ring-white/10"
      )}
      style={logoBoxStyle}
    >
      {/* Normal logo */}
      <img
        src={item.normalSrc}
        alt={item.alt || ""}
        className={cls(
          "h-full w-auto object-contain",
          item.hoverSrc ? "opacity-100 transition-opacity duration-200 group-hover:opacity-0" : ""
        )}
        draggable={false}
        loading="lazy"
        decoding="async"
      />

      {/* Hover logo (if provided) */}
      {item.hoverSrc ? (
        <img
          src={item.hoverSrc}
          alt={item.alt || ""}
          className="pointer-events-none absolute inset-0 m-auto h-full w-auto object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
          draggable={false}
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </div>
  );

  return item.href ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
      title={item.alt}
    >
      {Box}
    </a>
  ) : (
    Box
  );
}
