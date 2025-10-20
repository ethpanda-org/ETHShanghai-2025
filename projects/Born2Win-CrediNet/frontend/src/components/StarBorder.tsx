import React, { useEffect, useRef, useState } from 'react';

interface StarBorderProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  starCount?: number;
  starColor?: string;
  glowColor?: string;
  borderRadius?: string;
  as?: keyof JSX.IntrinsicElements;
}

interface Star {
  x: number;
  y: number;
  size: number;
  progress: number;
  speed: number;
}

export const StarBorder: React.FC<StarBorderProps> = ({
  children,
  className = '',
  speed = 0.5,
  starCount = 5,
  starColor = '#60a5fa',
  glowColor = '#3b82f6',
  borderRadius = '1rem',
  as: Component = 'div'
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number>();

  // Initialize stars
  useEffect(() => {
    starsRef.current = Array.from({ length: starCount }, (_, i) => ({
      x: 0,
      y: 0,
      size: Math.random() * 2 + 1.5,
      progress: (i / starCount) * 100,
      speed: speed * (0.8 + Math.random() * 0.4)
    }));
  }, [starCount, speed]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate position along border path
  const getPositionOnBorder = (progress: number, width: number, height: number): { x: number; y: number } => {
    const perimeter = 2 * (width + height);
    const distance = (progress / 100) * perimeter;

    if (distance < width) {
      // Top edge
      return { x: distance, y: 0 };
    } else if (distance < width + height) {
      // Right edge
      return { x: width, y: distance - width };
    } else if (distance < 2 * width + height) {
      // Bottom edge
      return { x: width - (distance - width - height), y: height };
    } else {
      // Left edge
      return { x: 0, y: height - (distance - 2 * width - height) };
    }
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      starsRef.current.forEach((star) => {
        // Update progress
        star.progress += star.speed * 0.1;
        if (star.progress >= 100) star.progress = 0;

        // Get position
        const pos = getPositionOnBorder(star.progress, dimensions.width, dimensions.height);
        star.x = pos.x;
        star.y = pos.y;

        // Draw glow
        const gradient = ctx.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          star.size * 4
        );
        gradient.addColorStop(0, glowColor + 'AA');
        gradient.addColorStop(0.5, glowColor + '44');
        gradient.addColorStop(1, glowColor + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw star
        ctx.fillStyle = starColor;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw sparkle
        ctx.strokeStyle = starColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(star.x - star.size * 2, star.y);
        ctx.lineTo(star.x + star.size * 2, star.y);
        ctx.moveTo(star.x, star.y - star.size * 2);
        ctx.lineTo(star.x, star.y + star.size * 2);
        ctx.stroke();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (dimensions.width > 0 && dimensions.height > 0) {
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, starColor, glowColor]);

  const componentProps: any = {
    ref: containerRef,
    className: `relative ${className}`,
    style: { borderRadius }
  };

  return (
    <Component {...componentProps}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          zIndex: 1
        }}
      />
      <div
        className="relative"
        style={{
          borderRadius,
          border: '1px solid rgba(96, 165, 250, 0.2)',
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(8px)'
        }}
      >
        {children}
      </div>
    </Component>
  );
};

