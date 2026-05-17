import type { ReactNode } from 'react';

type SideDrawerProps = {
  isVisible: boolean;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
  backdropClassName?: string;
  zIndexClassName?: string;
};

export const SideDrawer = ({
  isVisible,
  onClose,
  children,
  header,
  footer,
  maxWidthClassName = 'max-w-lg',
  panelClassName = '',
  bodyClassName = '',
  backdropClassName = 'bg-black/30 backdrop-blur-sm',
  zIndexClassName = 'z-50',
}: SideDrawerProps) => {
  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} flex justify-end overflow-hidden transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className={`absolute inset-0 ${backdropClassName}`} onClick={onClose} />

      <div
        className={`relative flex h-full w-full ${maxWidthClassName} flex-col border-l-2 border-border bg-surface shadow-xl transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        } ${panelClassName}`}
      >
        {header}
        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
        {footer}
      </div>
    </div>
  );
};
