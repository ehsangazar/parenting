import { useEffect, useRef } from 'react';
import { annotate } from 'rough-notation';
import type { RoughAnnotation, RoughAnnotationConfig } from 'rough-notation/lib/model';

type RoughHighlightProps = {
  children: React.ReactNode;
  type?: RoughAnnotationConfig['type'];
  color?: string;
  strokeWidth?: number;
  padding?: RoughAnnotationConfig['padding'];
  multiline?: boolean;
  iterations?: number;
  brackets?: RoughAnnotationConfig['brackets'];
  animationDuration?: number;
  delay?: number;
  show?: boolean;
  className?: string;
  as?: 'span' | 'div';
  /**
   * Re-trigger annotation when this key changes. Useful when the underlying
   * text or context shifts; defaults to running once on mount.
   */
  redrawKey?: string | number;
};

/**
 * Wraps content with a rough-notation annotation (underline, circle, highlight, box, etc).
 * Use sparingly to call attention to single phrases or numbers; layered annotations get noisy.
 */
export const RoughHighlight = ({
  children,
  type = 'underline',
  color = '#2F7D6A',
  strokeWidth = 2,
  padding,
  multiline = false,
  iterations,
  brackets,
  animationDuration = 700,
  delay = 0,
  show = true,
  className,
  as = 'span',
  redrawKey,
}: RoughHighlightProps) => {
  const elRef = useRef<HTMLElement | null>(null);
  const annotationRef = useRef<RoughAnnotation | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const annotation = annotate(elRef.current, {
      type,
      color,
      strokeWidth,
      padding,
      multiline,
      iterations,
      brackets,
      animationDuration,
    });
    annotationRef.current = annotation;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (show) {
      if (delay > 0) {
        timeoutId = setTimeout(() => annotation.show(), delay);
      } else {
        annotation.show();
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      annotation.remove();
      annotationRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, color, strokeWidth, multiline, animationDuration, redrawKey]);

  useEffect(() => {
    const annotation = annotationRef.current;
    if (!annotation) return;
    if (show) annotation.show();
    else annotation.hide();
  }, [show]);

  const Tag = as as 'span';
  return (
    <Tag
      ref={elRef as React.RefObject<HTMLSpanElement>}
      className={className}
      style={{ position: 'relative' }}
    >
      {children}
    </Tag>
  );
};
