import React from "react";

interface LogoMarqueeItem {
  alt: string;
  normalSrc: string;
  hoverSrc?: string;
  href?: string;
  width?: number;
  height?: number;
}

const DEFAULT_ITEMS: LogoMarqueeItem[] = [
  {
    alt: "Partner 1",
    normalSrc: "https://www.cryptoracle.network/assets/1-dxbTWLu8.png",
    hoverSrc: "https://www.cryptoracle.network/assets/1-on-D4Em46xj.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 2",
    normalSrc: "/support/2_1.png",
    hoverSrc: "/support/2_2.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 3",
    normalSrc: "/support/3_1.png",
    hoverSrc: "/support/3_2.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 4",
    normalSrc: "/support/4_1.png",
    hoverSrc: "/support/4_2.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 5",
    normalSrc: "/support/5_1.png",
    hoverSrc: "/support/5_2.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 6",
    normalSrc: "/support/6_1.png",
    hoverSrc: "/support/6_2.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 7",
    normalSrc: "/support/7_1.png",
    hoverSrc: "/support/7_2.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 8",
    normalSrc: "/support/8_1.png",
    hoverSrc: "/support/8_2.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 9",
    normalSrc: "/support/9_1.png",
    hoverSrc: "/support/9_2.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 10",
    normalSrc: "https://www.cryptoracle.network/assets/5-BzS7BxG0.png",
    hoverSrc: "https://www.cryptoracle.network/assets/5-on-CfWcRZXE.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  {
    alt: "Partner 11",
    normalSrc: "https://www.cryptoracle.network/assets/6-BcTh1SUt.png",
    hoverSrc: "https://www.cryptoracle.network/assets/6-on-1yiVmXUc.png",
    href: "https://www.cryptoracle.network/",
    width: 180,
    height: 64,
  },
  // 重复项以实现滚动效果 - 简化版本只保留11个基础项
].concat(
  // 复制多次以填充足够的内容
  Array(9).fill(null).flatMap(() => [
    {
      alt: "Partner 2",
      normalSrc: "/support/2_1.png",
      hoverSrc: "/support/2_2.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 3",
      normalSrc: "/support/3_1.png",
      hoverSrc: "/support/3_2.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 4",
      normalSrc: "/support/4_1.png",
      hoverSrc: "/support/4_2.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 5",
      normalSrc: "/support/5_1.png",
      hoverSrc: "/support/5_2.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 6",
      normalSrc: "/support/6_1.png",
      hoverSrc: "/support/6_2.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 7",
      normalSrc: "/support/7_1.png",
      hoverSrc: "/support/7_2.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 8",
      normalSrc: "/support/8_1.png",
      hoverSrc: "/support/8_2.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 9",
      normalSrc: "/support/9_1.png",
      hoverSrc: "/support/9_2.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 10",
      normalSrc: "https://www.cryptoracle.network/assets/5-BzS7BxG0.png",
      hoverSrc: "https://www.cryptoracle.network/assets/5-on-CfWcRZXE.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
    {
      alt: "Partner 11",
      normalSrc: "https://www.cryptoracle.network/assets/6-BcTh1SUt.png",
      hoverSrc: "https://www.cryptoracle.network/assets/6-on-1yiVmXUc.png",
      href: "https://www.cryptoracle.network/",
      width: 180,
      height: 64,
    },
  ])
);

interface LogoItemProps {
  item: LogoMarqueeItem;
  itemWidth: number;
  itemHeight: number;
}

function LogoItem({ item, itemWidth, itemHeight }: LogoItemProps) {
  const w = item.width || itemWidth;
  const h = item.height || itemHeight;
  const boxStyle: React.CSSProperties = { width: `${w}px`, height: `${h}px` };

  const content = (
    <span className="logo-box" style={boxStyle}>
      <img
        className="normal"
        src={item.normalSrc}
        alt={item.alt}
        width={w}
        height={h}
        loading="lazy"
        decoding="async"
      />
      {item.hoverSrc ? (
        <img
          className="hover"
          src={item.hoverSrc}
          alt=""
          width={w}
          height={h}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      ) : null}
    </span>
  );

  return (
    <li className="logo">
      {item.href ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.alt}
        >
          {content}
        </a>
      ) : (
        content
      )}
    </li>
  );
}

interface LogoMarqueeProps {
  items?: LogoMarqueeItem[];
  speed?: number;
  gap?: string;
  pauseOnHover?: boolean;
  className?: string;
  itemWidth?: number;
  itemHeight?: number;
  ariaLabel?: string;
}

export default function LogoMarquee({
  items = DEFAULT_ITEMS,
  speed = 500,
  gap = "2.5rem",
  pauseOnHover = true,
  className = "",
  itemWidth = 180,
  itemHeight = 64,
  ariaLabel = "Our partners",
}: LogoMarqueeProps) {
  // 使用 CSS 变量传递动态参数
  const rootStyle: React.CSSProperties = {
    // @ts-ignore - CSS variables
    "--gap": gap,
    "--speed": `${speed}s`,
  };

  return (
    <div className={`logo-marquee ${className}`} style={rootStyle} aria-label={ariaLabel}>
      {/* 主轨道 */}
      <ul className="track">
        {items.map((item, idx) => (
          <LogoItem
            key={`a-${idx}`}
            item={item}
            itemWidth={itemWidth}
            itemHeight={itemHeight}
          />
        ))}
      </ul>

      {/* 克隆一份实现无缝循环 */}
      <ul className="track clone" aria-hidden="true">
        {items.map((item, idx) => (
          <LogoItem
            key={`b-${idx}`}
            item={item}
            itemWidth={itemWidth}
            itemHeight={itemHeight}
          />
        ))}
      </ul>

      {/* 组件内联样式：便于"一文件拷贝即用" */}
      <style>{`
        .logo-marquee{position:relative;overflow:hidden;width:100%;padding-block:1rem;background:transparent}
        .logo-marquee .track{display:inline-flex;gap:var(--gap);align-items:center;white-space:nowrap;will-change:transform;animation:marquee var(--speed) linear infinite;padding:0;margin:0;list-style:none}
        .logo-marquee .track.clone{position:absolute;inset:0 auto 0 0;transform:translateX(100%)}
        .logo-marquee .logo{display:inline-flex;align-items:center}
        .logo-marquee .logo .logo-box{position:relative;display:inline-block}
        .logo-marquee img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .18s ease-out,transform .18s ease-out;backface-visibility:hidden}
        .logo-marquee img.hover{opacity:0}
        .logo-marquee .logo:hover img.hover{opacity:1;transform:translateY(-2px)}
        .logo-marquee .logo:hover img.normal{opacity:0;transform:translateY(-2px)}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-100%)}}
        @media(hover:none){.logo-marquee .logo:hover img{transform:none}}
      `}</style>

      {pauseOnHover && (
        <style>{`
          .logo-marquee:hover .track, .logo-marquee:focus-within .track { animation-play-state: paused; }
        `}</style>
      )}
    </div>
  );
}

