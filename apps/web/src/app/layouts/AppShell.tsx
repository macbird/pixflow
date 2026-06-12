import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Server, LogOut, Menu, X, UserCog, Settings, FileText, Wallet, CheckCircle2 } from 'lucide-react';
import { APP_VERSION } from '@client-manager/shared';
import { AppLogo } from '../../shared/ui/brand/AppLogo';
import { PwaInstallBanner } from '../pwa/PwaInstallBanner';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Clientes', icon: Users, href: '/customers' },
    { name: 'Planos', icon: CreditCard, href: '/plans' },
    { name: 'Servidores', icon: Server, href: '/servers' },
    { name: 'Faturas', icon: FileText, href: '/invoices' },
    { name: 'Pagamentos', icon: Wallet, href: '/payments' },
    { name: 'Ativações pendentes', icon: CheckCircle2, href: '/activations' },
    { name: 'Configurações', icon: Settings, href: '/settings' },
    { name: 'Perfil', icon: UserCog, href: '/profile' },
  ];

  const NavContent = () => (
    <nav className="flex-1 px-2 py-4 space-y-1">
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <item.icon className="mr-3 h-6 w-6" aria-hidden="true" />
            {item.name}
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        className="w-full text-left flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
      >
        <LogOut className="mr-3 h-6 w-6" aria-hidden="true" />
        Sair
      </button>
    </nav>
  );

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-form-field">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-full bg-gray-800">
            <div className="flex h-16 flex-shrink-0 items-center justify-between gap-2 bg-gray-900 px-3">
              <AppLogo size="sm" />
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wider text-white bg-indigo-600 rounded">
                v{APP_VERSION}
              </span>
            </div>
            <NavContent />
            <p className="px-4 pb-3 text-[11px] text-gray-500">v{APP_VERSION}</p>
          </div>
        </div>
      </aside>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex shrink-0 items-center justify-between gap-2 px-3">
                <AppLogo size="sm" />
                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wider text-white bg-indigo-600 rounded">
                  v{APP_VERSION}
                </span>
              </div>
              <NavContent />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-16 shrink-0 items-center border-b border-slate-200/80 bg-form-field px-4 pt-[max(0px,env(safe-area-inset-top))] md:hidden">
          <button
            className="h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-900 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div id="mobile-header-portal" className="flex-1 flex justify-between items-center ml-2" />
        </header>

        <main className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden focus:outline-none">
          {children}
        </main>
        <PwaInstallBanner />
      </div>
    </div>
  );
};
