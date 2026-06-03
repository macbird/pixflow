import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserCog, LogOut, Menu, X, Settings, FileText, Wallet } from 'lucide-react';

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { name: 'Contas', icon: Users, href: '/admin/accounts' },
    { name: 'Faturas SaaS', icon: FileText, href: '/admin/invoices' },
    { name: 'Pagamentos', icon: Wallet, href: '/admin/payments' },
    { name: 'Configurações', icon: Settings, href: '/admin/settings' },
    { name: 'Perfil', icon: UserCog, href: '/admin/profile' },
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
    <div className="h-screen flex bg-form-field">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-full bg-slate-800">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-slate-900 text-white font-bold text-xl">
              Admin Panel
            </div>
            <NavContent />
          </div>
        </div>
      </aside>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4 text-white font-bold text-xl">
                Admin Panel
              </div>
              <NavContent />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col w-0 flex-1 overflow-hidden min-h-0">
        <header className="md:hidden flex h-16 shrink-0 items-center border-b border-slate-200/80 bg-form-field px-4">
          <button
            type="button"
            className="h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-900 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div
            id="mobile-header-portal"
            className="flex-1 flex justify-between items-center ml-2 min-w-0"
          />
        </header>

        <main className="flex-1 relative z-0 overflow-hidden focus:outline-none min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};
