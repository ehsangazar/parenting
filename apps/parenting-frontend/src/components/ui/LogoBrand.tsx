import { Link } from 'react-router-dom';

type LogoBrandProps = {
  tagline?: string;
  size?: 'default' | 'compact' | 'icon' | 'hero' | 'app';
  hideTagline?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
};

export const LogoBrand = ({
  tagline = '',
  size = 'default',
  hideTagline = false,
  href,
  onClick,
  className = '',
}: LogoBrandProps) => {
  const logoSize =
    size === 'icon'
      ? 'h-11 w-11'
      : size === 'compact'
        ? 'h-10 w-10'
        : size === 'hero'
          ? 'h-14 w-14 sm:h-[4.25rem] sm:w-[4.25rem]'
          : size === 'app'
            ? 'h-14 w-14'
            : 'h-12 w-12';
  const textSize =
    size === 'compact' || size === 'icon'
      ? 'text-base'
      : size === 'hero'
        ? 'text-2xl sm:text-[1.75rem] tracking-tight'
        : 'text-xl';
  const taglineMargin =
    size === 'hero' ? '-mt-1 sm:-mt-1.5' : size === 'compact' ? '-mt-2.5' : '-mt-2.5';
  const taglineClass =
    size === 'hero'
      ? 'text-[10px] sm:text-xs md:text-sm'
      : size === 'compact'
        ? 'text-[10px] sm:text-xs'
        : size === 'app'
          ? 'text-[11px] sm:text-xs'
          : 'text-sm';
  const rowGap =
    size === 'hero' ? 'gap-3 sm:gap-4' : size === 'app' ? 'gap-3' : 'gap-2.5 sm:gap-3';
  const showText = size !== 'icon';
  const showTagline = tagline && !hideTagline && size !== 'icon';

  const isInteractive = Boolean(href || onClick);
  const content = (
    <div
      className={`flex items-center ${rowGap} group ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
      onClick={!href ? onClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          if (!href) onClick?.();
        }
      }}
    >
      <img
        src="/logo.jpg"
        alt="Raised"
        className={`${logoSize} flex-shrink-0 rounded-full object-contain transition-opacity duration-150 ${href || onClick ? 'group-hover:opacity-90' : ''}`}
      />
      {showText && (
        <div className="min-w-0 flex-1 flex flex-col gap-0 leading-none">
          <p className={`font-display font-semibold text-text-primary truncate ${textSize}`}>
            Raised
          </p>
          {showTagline && (
            <p
              className={`text-text-tertiary truncate leading-snug ${taglineMargin} ${taglineClass}`}
            >
              {tagline}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
};
