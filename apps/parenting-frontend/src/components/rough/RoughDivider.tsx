import { useLayoutEffect, useMemo } from 'react';
import rough from 'roughjs';
import { useElementSize, seedFromString } from './useRoughCanvas.js';

export type RoughDividerProps = {
  color?: string;
  thickness?: number;
  roughness?: number;
  className?: string;
  seed?: number;
  seedKey?: string;
};

export const RoughDivider = ({
  color = '#D7E5DA',
  thickness = 1.6,
  roughness = 2.4,
  className = '',
  seed,
  seedKey,
}: RoughDividerProps) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const computedSeed = useMemo(() => {
    if (typeof seed === 'number') return seed;
    if (seedKey) return seedFromString(seedKey);
    return 19;
  }, [seed, seedKey]);

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;
    const svg = wrapper.querySelector<SVGSVGElement>(':scope > svg[data-rough-divider]');
    if (!svg || size.w < 4) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('width', String(size.w));
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', `0 0 ${size.w} 12`);
    const rc = rough.svg(svg);
    svg.appendChild(
      rc.line(4, 6, size.w - 4, 6, {
        stroke: color,
        strokeWidth: thickness,
        roughness,
        seed: computedSeed,
      }),
    );
  }, [ref, size, color, thickness, roughness, computedSeed]);

  return (
    <div ref={ref} className={`relative h-3 w-full ${className}`}>
      <svg
        data-rough-divider
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
};
