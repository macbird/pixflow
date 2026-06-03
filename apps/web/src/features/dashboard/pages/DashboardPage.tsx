import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  CalendarClock,
  AlertTriangle,
  CreditCard,
  Server,
  Plug,
  DollarSign,
  Plus,
  ArrowRight,
  Receipt,
  Wallet,
  FileWarning,
  TrendingUp,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard.api';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { surfaceCardClass } from '../../../shared/ui/layout/surface-styles';
import { StatCard } from '../../../shared/ui/layout/StatCard';
import { LoadingSpinner } from '../../../shared/ui/layout/LoadingSpinner';
import { isApiAuthError, isApiNetworkError } from '../../../shared/api/api-error';
import { BillingMonthlyBars } from '../../../shared/ui/billing/BillingMonthlyBars';
import { RecentPaymentsList } from '../../../shared/ui/billing/RecentPaymentsList';
import { formatCents } from '../../../shared/ui/billing/format-billing';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR');
}

export const DashboardPage: React.FC = () => {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsHasError,
    error: statsQueryError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: expirations, isLoading: expirationsLoading } = useQuery({
    queryKey: ['dashboard-expirations'],
    queryFn: () => dashboardApi.getUpcomingExpirations(5),
    enabled: !statsHasError,
  });

  if (statsLoading) {
    return (
      <PageLayout title="Dashboard">
        <div className="relative h-64">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (statsHasError) {
    const isNetworkError = isApiNetworkError(statsQueryError);
    const isAuthError = isApiAuthError(statsQueryError);

    return (
      <PageLayout title="Dashboard">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center max-w-lg mx-auto mt-8">
          <p className="text-sm font-medium text-amber-900">
            {isNetworkError
              ? 'Não foi possível conectar à API.'
              : isAuthError
                ? 'Sessão expirada ou inválida.'
                : 'Erro ao carregar o dashboard.'}
          </p>
          <p className="text-xs text-amber-800 mt-2">
            {isNetworkError ? (
              <>
                Verifique se o servidor está rodando em{' '}
                <code className="bg-amber-100 px-1 rounded">npm run api:dev</code> (porta 3001).
              </>
            ) : isAuthError ? (
              <>Faça login novamente com sua conta de revendedor (não use o painel admin).</>
            ) : (
              <>
                Confira os logs da API. Se alterou o banco, rode{' '}
                <code className="bg-amber-100 px-1">npx prisma migrate deploy</code> em{' '}
                <code className="bg-amber-100 px-1">apps/api</code>.
              </>
            )}
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            {isAuthError ? (
              <Link
                to="/login"
                onClick={() => localStorage.removeItem('token')}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Ir para o login
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => refetchStats()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }

  const kpiCards = [
    {
      title: 'Total de clientes',
      value: stats?.totalCustomers ?? 0,
      subtitle: 'Base cadastrada',
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      href: '/customers',
    },
    {
      title: 'Clientes ativos',
      value: stats?.activeCustomers ?? 0,
      subtitle: `${stats?.inactiveCustomers ?? 0} inativos`,
      icon: UserCheck,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      href: '/customers',
    },
    {
      title: 'Vencendo em 7 dias',
      value: stats?.expiringSoon ?? 0,
      subtitle: 'Renovar em breve',
      icon: CalendarClock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      href: '/customers',
    },
    {
      title: 'Vencidos',
      value: stats?.expired ?? 0,
      subtitle: 'Ação necessária',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      href: '/customers',
    },
  ];

  const billing = stats?.billing;
  const billingCards = [
    {
      title: 'Recebido no mês',
      value: formatCents(billing?.receivedCurrentMonthCents ?? 0),
      subtitle: 'Pagamentos confirmados',
      icon: Wallet,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      href: '/payments',
    },
    {
      title: 'Faturas em aberto',
      value: billing?.openInvoices ?? 0,
      subtitle: formatCents(billing?.openAmountCents ?? 0),
      icon: Receipt,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      href: '/invoices',
    },
    {
      title: 'Faturas vencidas',
      value: billing?.overdueInvoices ?? 0,
      subtitle: 'Requer cobrança',
      icon: FileWarning,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      href: '/invoices',
    },
    {
      title: 'Taxa de cobrança',
      value: `${billing?.collectionRate ?? 0}%`,
      subtitle: 'Ciclo atual',
      icon: TrendingUp,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-100',
      href: '/invoices',
    },
  ];

  const infraCards = [
    {
      title: 'Planos',
      value: stats?.totalPlans ?? 0,
      icon: CreditCard,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-100',
      href: '/plans',
    },
    {
      title: 'Servidores',
      value: stats?.totalServers ?? 0,
      icon: Server,
      iconColor: 'text-slate-600',
      iconBg: 'bg-slate-100',
      href: '/servers',
    },
    {
      title: 'Conexões',
      value: stats?.totalConnections ?? 0,
      subtitle: 'MACs cadastrados',
      icon: Plug,
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-100',
      href: '/customers',
    },
    {
      title: 'Receita mensal estimada',
      value: formatCurrency(stats?.estimatedMrr ?? 0),
      subtitle: 'Soma dos planos dos ativos',
      icon: DollarSign,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
  ];

  return (
    <PageLayout title="Dashboard" noPadding>
      <div className="w-full px-4 py-4 lg:px-6 lg:py-6">
        <p className="text-slate-600 mb-6">
          Visão geral da sua operação — clientes, cobrança, pagamentos e infraestrutura.
        </p>

        {/* Mobile: 2 colunas por seção */}
        <div className="space-y-8 lg:hidden">
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Cobrança e pagamentos
            </h2>
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              {billingCards.map((card) => (
                <StatCard key={card.title} {...card} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Clientes e vencimentos
            </h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              {kpiCards.map((card) => (
                <StatCard key={card.title} {...card} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Infraestrutura e receita
            </h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              {infraCards.map((card) => (
                <StatCard key={card.title} {...card} />
              ))}
            </div>
          </section>
        </div>

        {/* Desktop: 6 colunas ocupando toda a largura (última linha com 2 cards em col-span-3) */}
        <div className="hidden lg:block space-y-10 mb-10">
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Cobrança e pagamentos
            </h2>
            <div className="grid grid-cols-6 gap-4 w-full mb-10">
              {billingCards.map((card, index) => (
                <div
                  key={card.title}
                  className={`min-w-0 ${index < 2 ? 'col-span-2' : 'col-span-1'}`}
                >
                  <StatCard {...card} />
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Clientes e vencimentos
            </h2>
            <div className="grid grid-cols-6 gap-4 w-full">
              {kpiCards.map((card, index) => (
                <div
                  key={card.title}
                  className={`min-w-0 ${index < 2 ? 'col-span-2' : 'col-span-1'}`}
                >
                  <StatCard {...card} />
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Infraestrutura e receita
            </h2>
            <div className="grid grid-cols-6 gap-4 w-full">
              {infraCards.map((card, index) => (
                <div
                  key={card.title}
                  className={`min-w-0 ${index < 2 ? 'col-span-2' : 'col-span-1'}`}
                >
                  <StatCard {...card} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {stats?.monthlyBilling && stats.monthlyBilling.length > 0 && (
          <div className="mb-6 w-full">
            <BillingMonthlyBars
              data={stats.monthlyBilling}
              title="Cobrança dos clientes — últimos 6 meses"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {stats?.recentPayments && (
          <div className="lg:col-span-1 order-2 lg:order-none">
            <RecentPaymentsList
              payments={stats.recentPayments}
              paymentsHref="/payments"
            />
          </div>
        )}
        <section className={`order-1 lg:col-span-2 ${surfaceCardClass}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Próximos vencimentos</h2>
            <Link
              to="/customers"
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {expirationsLoading ? (
            <div className="relative h-32">
              <LoadingSpinner />
            </div>
          ) : expirations && expirations.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {expirations.map((customer) => (
                <li key={customer.id}>
                  <Link
                    to="/customers"
                    state={{ form: 'edit', id: customer.id }}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{customer.name}</p>
                      <p className="text-xs text-slate-500">
                        {customer.plan?.name ?? 'Sem plano'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-semibold text-amber-700">
                        {formatDate(customer.expiresAt)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        {customer.status}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-slate-500 text-center">
              Nenhum vencimento futuro cadastrado.
            </p>
          )}
        </section>

        <section className={`order-3 p-5 ${surfaceCardClass}`}>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Ações rápidas</h2>
          <div className="space-y-2">
            <Link
              to="/customers"
              state={{ form: 'create' }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo cliente
            </Link>
            <Link
              to="/customers"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Users className="w-4 h-4" />
              Gerenciar clientes
            </Link>
            <Link
              to="/plans"
              state={{ form: 'create' }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Novo plano
            </Link>
            <Link
              to="/servers"
              state={{ form: 'create' }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Server className="w-4 h-4" />
              Novo servidor
            </Link>
            <Link
              to="/invoices"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              Faturas
            </Link>
            <Link
              to="/payments"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Pagamentos
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">
              Cards clicáveis levam às listas correspondentes. A receita estimada soma o
              preço mensal dos planos dos clientes com status ativo.
            </p>
          </div>
        </section>
        </div>
      </div>
    </PageLayout>
  );
};
