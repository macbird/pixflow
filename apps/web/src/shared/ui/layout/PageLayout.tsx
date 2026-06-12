import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { pageCanvasClass } from './surface-styles';

interface PageLayoutProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ 
  title, 
  actions, 
  children, 
  footer, 
  className = "",
  noPadding = false
}) => {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.getElementById('mobile-header-portal'));
  }, []);

  const headerContent = (
    <div className="flex justify-between items-center w-full">
      <h1 className="text-xl font-bold truncate pr-2">{title}</h1>
      <div className="flex shrink-0">{actions}</div>
    </div>
  );

  const footerBandClass = `border-t border-slate-200/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4 ${pageCanvasClass}`;

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className} ${pageCanvasClass}`}>
      {/* Mobile Portal for Top Bar */}
      {portalNode && createPortal(headerContent, portalNode)}

      {/* Header for Desktop */}
      {(title || actions) && (
        <header className="hidden md:block flex-none p-6">
          {headerContent}
        </header>
      )}

      {/* Main Content (Scrollable) */}
      <main
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
          footer ? 'max-md:pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : ''
        }`}
      >
        <div className={`${noPadding ? 'px-0 py-4 md:p-4' : 'p-4'}`}>
          {children}
        </div>
      </main>

      {/* Footer — pinned on mobile PWA; flex band on desktop */}
      {footer && (
        <footer
          className={`z-30 shrink-0 md:relative ${footerBandClass} max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:shadow-[0_-4px_12px_rgba(15,23,42,0.08)]`}
        >
          {footer}
        </footer>
      )}
    </div>
  );
};
