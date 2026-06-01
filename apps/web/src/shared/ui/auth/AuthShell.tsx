import React from 'react';
import { LayoutDashboard, Shield } from 'lucide-react';

type AuthVariant = 'tenant' | 'admin';

interface AuthShellProps {
  variant: AuthVariant;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const branding: Record<
  AuthVariant,
  {
    productName: string;
    tagline: string;
    panelClass: string;
    accentClass: string;
    Icon: typeof LayoutDashboard;
  }
> = {
  tenant: {
    productName: 'Cliente Manager',
    tagline: 'Gestão de clientes, planos e servidores em um só lugar.',
    panelClass:
      'bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white',
    accentClass: 'text-indigo-100',
    Icon: LayoutDashboard,
  },
  admin: {
    productName: 'Painel da Plataforma',
    tagline: 'Administração de contas e acesso dos revendedores.',
    panelClass: 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white',
    accentClass: 'text-slate-300',
    Icon: Shield,
  },
};

export const AuthShell: React.FC<AuthShellProps> = ({
  variant,
  title,
  subtitle,
  children,
  footer,
}) => {
  const brand = branding[variant];
  const Icon = brand.Icon;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside
        className={`relative hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 overflow-hidden ${brand.panelClass}`}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-black/10 blur-2xl"
          aria-hidden
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Icon className="h-6 w-6" strokeWidth={2} />
            </div>
            <span className="text-lg font-semibold tracking-tight">{brand.productName}</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className={`text-sm font-medium uppercase tracking-widest ${brand.accentClass} mb-3`}>
            {variant === 'admin' ? 'Acesso restrito' : 'Área do revendedor'}
          </p>
          <p className="text-2xl xl:text-3xl font-bold leading-snug text-white">
            {brand.tagline}
          </p>
        </div>

        <p className={`relative z-10 text-xs ${brand.accentClass}`}>
          © {new Date().getFullYear()} Cliente Manager
        </p>
      </aside>

      <main className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:px-12 xl:px-16 bg-slate-50">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                variant === 'admin' ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold text-slate-900">{brand.productName}</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-slate-200/50">
            {children}
          </div>

          {footer ? <div className="mt-6 text-center text-sm text-slate-500">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
};
