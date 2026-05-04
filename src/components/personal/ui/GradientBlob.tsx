import React from 'react';

interface Props {
  className?: string;
  // colores del gradiente (al menos 2)
  colors?: [string, string, ...string[]];
  // tamaño en px del blob (default 320)
  size?: number;
  // blur en px (default 80)
  blur?: number;
  // opacidad (0..1)
  opacity?: number;
}

const DEFAULT_COLORS: [string, string, string] = ['#FB923C', '#A855F7', '#3B82F6'];

export const GradientBlob: React.FC<Props> = ({
  className = '',
  colors = DEFAULT_COLORS,
  size = 320,
  blur = 80,
  opacity = 0.7,
}) => {
  const stops = colors.map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`).join(', ');
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at center, ${stops})`,
        filter: `blur(${blur}px)`,
        opacity,
        borderRadius: '9999px',
      }}
    />
  );
};
