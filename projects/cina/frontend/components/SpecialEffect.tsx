'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function SpecialEffect() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建动态几何图形
    const createGeometricShapes = () => {
      const shapes = [];
      for (let i = 0; i < 20; i++) {
        const shape = document.createElement('div');
        shape.className = 'absolute w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0';
        shape.style.left = `${Math.random() * 100}%`;
        shape.style.top = `${Math.random() * 100}%`;
        containerRef.current?.appendChild(shape);
        shapes.push(shape);
      }
      return shapes;
    };

    const shapes = createGeometricShapes();

    // 设置初始状态
    gsap.set(containerRef.current, {
      opacity: 1
    });

    // 创建时间线动画
    const tl = gsap.timeline();

    // 几何图形动画
    tl.from(shapes, {
      opacity: 0,
      scale: 0,
      rotation: -180,
      duration: 1.5,
      ease: "expo.out",
      stagger: 0.1
    })
    .to(shapes, {
      x: (index) => (Math.random() - 0.5) * 200,
      y: (index) => (Math.random() - 0.5) * 200,
      rotation: 360,
      duration: 3,
      ease: "power2.inOut",
      stagger: 0.05
    }, "-=1")
    .to(shapes, {
      opacity: 0,
      scale: 0,
      rotation: 180,
      duration: 1,
      ease: "expo.in",
      stagger: 0.02
    }, "-=0.5");

    // 点击重新播放动画
    const handleClick = () => {
      tl.timeScale(0.8).restart();
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
      // 清理创建的图形
      shapes.forEach(shape => shape.remove());
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
        willChange: 'transform'
      }}
    />
  );
}
