import { useLayoutEffect, useMemo, type CSSProperties, type ElementType, type ReactNode } from 'react';
import rough from 'roughjs';
import { useElementSize, roundedRectPath, seedFromString } from './useRoughCanvas.js';

export type RoughBoxProps = {
  children?: ReactNode;
  as?: ElementType;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillStyle?: 'solid' | 'hachure' | 'zigzag' | 'cross-hatch' | 'dots' | 'sunburst' | 'dashed';
  roughness?: number;
  radius?: number;
  seed?: number;
  seedKey?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  ariaLabel?: string;
  innerClassName?: string;
  /** Render with `data-rough-skip="true"` so the global RoughEnhancer leaves
   * this node alone. Use when the component already paints its own sketch
   * (e.g. inside RoughBox) to avoid double-stroke / double-fill artefacts. */
  skipEnhancer?: boolean;
  /** Optional explicit type passthrough for `<button>` (avoids form submit). */
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  ariaPressed?: boolean;
};

const DEFAULT_STROKE = '#D7E5DA';
const DEFAULT_FILL = '#FFFFFF';

export const RoughBox = ({
  children,
  as: As = 'div',
  stroke = DEFAULT_STROKE,
  strokeWidth = 2,
  fill = DEFAULT_FILL,
  fillStyle = 'solid',
  roughness = 1.4,
  radius = 18,
  seed,
  seedKey,
  className = '',
  style,
  onClick,
  role,
  tabIndex,
  ariaLabel,
  innerClassName = '',
  skipEnhancer = false,
  type,
  disabled,
  ariaPressed,
}: RoughBoxProps) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const computedSeed = useMemo(() => {
    if (typeof seed === 'number') return seed;
    if (seedKey) return seedFromString(seedKey);
    return 42;
  }, [seed, seedKey]);

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper || size.w < 4 || size.h < 4) return;
    const svg = wrapper.querySelector<SVGSVGElement>(':scope > svg[data-rough-box]');
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('width', String(size.w));
    svg.setAttribute('height', String(size.h));
    svg.setAttribute('viewBox', `0 0 ${size.w} ${size.h}`);
    const rc = rough.svg(svg);
    const inset = Math.max(strokeWidth + 1, 3);
    const w = size.w - inset * 2;
    const h = size.h - inset * 2;
    if (w <= 0 || h <= 0) return;
    const d = roundedRectPath(inset, inset, w, h, radius);
    const node = rc.path(d, {
      stroke,
      strokeWidth,
      roughness,
      fill: fill === 'transparent' ? undefined : fill,
      fillStyle,
      fillWeight: 1.1,
      hachureGap: 8,
      seed: computedSeed,
    });
    svg.appendChild(node);
  }, [ref, size, stroke, strokeWidth, fill, fillStyle, roughness, radius, computedSeed]);

  // Hoist onClick to the outer element so it remains a focusable region.
  return (
    <As
      ref={ref}
      onClick={onClick}
      role={role ?? (onClick && As !== 'button' ? 'button' : undefined)}
      tabIndex={onClick && As !== 'button' ? (tabIndex ?? 0) : tabIndex}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      type={As === 'button' ? (type ?? 'button') : undefined}
      disabled={As === 'button' ? disabled : undefined}
      data-rough-skip={skipEnhancer ? 'true' : undefined}
      onKeyDown={
        onClick && As !== 'button'
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative ${className}`}
      style={style}
    >
      <svg
        data-rough-box
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className={`relative ${innerClassName}`}>{children}</div>
    </As>
  );
};
