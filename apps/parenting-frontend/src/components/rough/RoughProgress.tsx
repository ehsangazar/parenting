import { useLayoutEffect, useMemo } from 'react';
import rough from 'roughjs';
import { useElementSize, seedFromString } from './useRoughCanvas.js';

export type RoughProgressProps = {
  value: number;
  max?: number;
  color?: string;
  trackColor?: string;
  height?: number;
  className?: string;
  seed?: number;
  seedKey?: string;
  ariaLabel?: string;
};

const DEFAULT_FILL = '#2F7D6A';
const DEFAULT_TRACK = '#D7E5DA';

function pillPath(x: number, y: number, w: number, h: number): string {
  const r = h / 2;
  if (w <= h) {
    const cx = x + w / 2;
    const cy = y + r;
    return `M ${cx - 0.01} ${y} A ${r} ${r} 0 1 0 ${cx + 0.01} ${y} Z`;
  }
  return [
    `M ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

export const RoughProgress = ({
  value,
  max = 100,
  color = DEFAULT_FILL,
  trackColor = DEFAULT_TRACK,
  height = 14,
  className = '',
  seed,
  seedKey,
  ariaLabel,
}: RoughProgressProps) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const computedSeed = useMemo(() => {
    if (typeof seed === 'number') return seed;
    if (seedKey) return seedFromString(seedKey);
    return 11;
  }, [seed, seedKey]);

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;
    const svg = wrapper.querySelector<SVGSVGElement>(':scope > svg[data-rough-progress]');
    if (!svg || size.w < 4) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('width', String(size.w));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${size.w} ${height}`);
    const rc = rough.svg(svg);
    const inset = 2;
    const w = size.w - inset * 2;
    const h = height - inset * 2;
    if (w <= 0 || h <= 0) return;

    svg.appendChild(
      rc.path(pillPath(inset, inset, w, h), {
        stroke: trackColor,
        strokeWidth: 1.4,
        roughness: 1.2,
        seed: computedSeed,
      }),
    );

    const pct = Math.max(0, Math.min(1, value / max));
    const fillW = Math.max(h, w * pct);
    if (pct > 0) {
      svg.appendChild(
        rc.path(pillPath(inset, inset, fillW, h), {
          stroke: color,
          strokeWidth: 1.4,
          roughness: 1.4,
          fill: color,
          fillStyle: 'solid',
          seed: computedSeed + 1,
        }),
      );
    }
  }, [ref, size, value, max, color, trackColor, height, computedSeed]);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel}
      className={`relative w-full ${className}`}
      style={{ height }}
    >
      <svg
        data-rough-progress
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
};
