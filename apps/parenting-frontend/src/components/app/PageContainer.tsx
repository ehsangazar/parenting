import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Optional vertical spacing. 
   * 'none': no vertical padding (default for pages with custom layout needs)
   * 'normal': standard vertical padding (py-4 sm:py-6)
   * 'lg': large vertical padding (py-8 sm:py-12)
   */
  verticalSpacing?: 'none' | 'normal' | 'lg';
  /**
   * Optional spacing between child sections.
   * 'none': no gap between children
   * 'normal': standard gap (default)
   * 'lg': large gap
   */
  contentSpacing?: 'none' | 'normal' | 'lg';
  /**
   * Whether to include the max-width container. 
   * Defaults to true.
   */
  constrained?: boolean;
}

export const PageContainer = ({ 
  children, 
  className = '', 
  verticalSpacing = 'normal',
  contentSpacing = 'normal',
  constrained = true
}: PageContainerProps) => {
  const spacingStyles = {
    none: '',
    normal: 'py-4 sm:py-6 lg:pt-6',
    lg: 'py-8 sm:py-12',
  }[verticalSpacing];

  const contentSpacingStyles = {
    none: 'gap-0',
    normal: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
  }[contentSpacing];

  const baseStyles = 'w-full flex-1 flex flex-col';
  const containerStyles = constrained ? 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8' : 'px-4 sm:px-6 lg:px-8';

  return (
    <div className={`${baseStyles} ${spacingStyles} ${contentSpacingStyles} ${containerStyles} ${className}`}>
      {children}
    </div>
  );
};
