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

  return (
    <div className={`h-full flex flex-col ${className} ${pageCanvasClass}`}>
      {/* Mobile Portal for Top Bar */}
      {portalNode && createPortal(headerContent, portalNode)}

      {/* Header for Desktop */}
      {(title || actions) && (
        <header className="hidden md:block flex-none p-6">
          {headerContent}
        </header>
      )}

      {/* Main Content (Scrollable) */}
      <main className="flex-1 overflow-y-auto">
        <div className={`${noPadding ? 'px-0 py-4 md:p-4' : 'p-4'}`}>
          {children}
        </div>
      </main>

      {/* Footer */}
      {footer && (
        <footer className={`flex-none border-t border-slate-200/80 p-4 ${pageCanvasClass}`}>
          {footer}
        </footer>
      )}
    </div>
  );
};
