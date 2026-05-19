import { useState } from 'react';
import { clsx } from 'clsx';

type LazyImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  containerClassName?: string;
};

export const LazyImage = ({ src, alt, className, containerClassName, ...rest }: LazyImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div className={clsx('relative overflow-hidden', containerClassName)}>
      {/* Shimmer shown until image loads */}
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-shimmer" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={clsx(
          'transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
        {...rest}
      />
    </div>
  );
};
