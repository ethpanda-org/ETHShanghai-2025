'use client';

import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline/next'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" />
});

interface SplineSceneProps {
  scene: string;
  style?: React.CSSProperties;
}

export default function SplineScene({ scene, style }: SplineSceneProps) {
  return (
    <Spline
      style={style}
      scene={scene}
    />
  );
}
