import { forwardRef, useLayoutEffect, useMemo, type ButtonHTMLAttributes, type ReactNode } from 'react';
import rough from 'roughjs';
import { useElementSize, roundedRectPath, seedFromString } from './useRoughCanvas.js';

export type RoughButtonVariant =
  | 'sage'
  | 'blue'
  | 'sky'
  | 'peach'
  | 'gold'
  | 'outline'
  | 'ghost'
  | 'violet-pill'
  | 'surface-pill';

export type RoughButtonSize = 'sm' | 'default' | 'pill' | 'pill-lg';

type Visual = {
  stroke: string;
  fill: string | 'transparent';
  text: string;
  fillStyle?: 'solid' | 'hachure';
};

const VISUALS: Record<RoughButtonVariant, Visual> = {
  sage: { stroke: '#194038', fill: '#2F7D6A', text: '#FFFFFF' },
  blue: { stroke: '#3A7299', fill: '#4A8AB4', text: '#FFFFFF' },
  sky: { stroke: '#3A7299', fill: '#4A8AB4', text: '#FFFFFF' },
  peach: { stroke: '#864E29', fill: '#D87749', text: '#FFFFFF' },
  gold: { stroke: '#864E29', fill: '#D87749', text: '#FFFFFF' },
  outline: { stroke: '#2F7D6A', fill: 'transparent', text: '#2F7D6A' },
  ghost: { stroke: 'transparent', fill: 'transparent', text: '#2F7D6A' },
  'violet-pill': { stroke: '#864E29', fill: '#D87749', text: '#FFFFFF' },
  'surface-pill': { stroke: '#D7E5DA', fill: '#FFFFFF', text: '#2F7D6A' },
};

const SIZE_CLASSES: Record<RoughButtonSize, string> = {
  sm: 'min-h-10 px-4 py-2 text-sm rounded-xl',
  default: 'min-h-12 px-6 py-3 text-base rounded-2xl',
  pill: 'min-h-11 px-5 py-2 text-sm rounded-full',
  'pill-lg': 'min-h-12 px-7 py-3 text-sm rounded-full',
};

const SIZE_RADIUS: Record<RoughButtonSize, number> = {
  sm: 12,
  default: 18,
  pill: 9999,
  'pill-lg': 9999,
};

export type RoughButtonProps = {
  variant?: RoughButtonVariant;
  size?: RoughButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
  seed?: number;
  seedKey?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const RoughButton = forwardRef<HTMLButtonElement, RoughButtonProps>(function RoughButton(
  {
    variant = 'sage',
    size = 'default',
    fullWidth,
    loading,
    disabled,
    children,
    className = '',
    type = 'button',
    style,
    seed,
    seedKey,
    ...rest
  },
  forwardedRef,
) {
  const [ref, sizeBox] = useElementSize<HTMLButtonElement>();
  const visual = VISUALS[variant];
  const radius = SIZE_RADIUS[size];

  const computedSeed = useMemo(() => {
    if (typeof seed === 'number') return seed;
    if (seedKey) return seedFromString(seedKey);
    return seedFromString(typeof children === 'string' ? children : variant);
  }, [seed, seedKey, children, variant]);

  useLayoutEffect(() => {
    const btn = ref.current;
    if (!btn) return;
    const svg = btn.querySelector<SVGSVGElement>(':scope > svg[data-rough-btn]');
    if (!svg || sizeBox.w < 4 || sizeBox.h < 4) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const inset = 3;
    const w = sizeBox.w - inset * 2;
    const h = sizeBox.h - inset * 2;
    if (w <= 0 || h <= 0) return;
    const r = Math.min(radius, h / 2);
    const d = roundedRectPath(inset, inset, w, h, r);

    const node = rc.path(d, {
      stroke: visual.stroke,
      strokeWidth: variant === 'ghost' ? 0 : 2,
      roughness: 1.4,
      fill: visual.fill === 'transparent' ? undefined : visual.fill,
      fillStyle: visual.fillStyle ?? 'solid',
      seed: computedSeed,
    });
    svg.appendChild(node);
  }, [ref, sizeBox, variant, radius, visual.stroke, visual.fill, visual.fillStyle, computedSeed]);

  const composedRef = (node: HTMLButtonElement | null) => {
    (ref as { current: HTMLButtonElement | null }).current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) (forwardedRef as { current: HTMLButtonElement | null }).current = node;
  };

  return (
    <button
      ref={composedRef}
      type={type}
      disabled={disabled || loading}
      className={[
        'relative inline-flex items-center justify-center gap-2 font-semibold transition-transform active:scale-[0.98]',
        'disabled:opacity-60 disabled:pointer-events-none',
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ color: visual.text, fontFamily: '"DM Sans", system-ui, sans-serif', ...style }}
      {...rest}
    >
      <svg
        data-rough-btn
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {loading ? (
        <>
          <svg
            className="h-5 w-5 shrink-0 animate-spin relative"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
            style={{ color: visual.text }}
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="relative">{children}</span>
        </>
      ) : (
        <span className="relative">{children}</span>
      )}
    </button>
  );
});
