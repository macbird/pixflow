import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminDashboardApi } from '../api/admin.api';
import { Users, Building2, UserCheck, ShieldAlert } from 'lucide-react';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { StatCard } from '../../../shared/ui/layout/StatCard';
import { LoadingSpinner } from '../../../shared/ui/layout/LoadingSpinner';

export const AdminDashboardPage: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminDashboardApi.getStats,
  });

  if (isLoading) {
    return (
      <PageLayout title="Dashboard">
        <div className="relative h-64">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  const kpiCards = [
    {
      title: 'Total de contas',
      value: stats?.totalAccounts ?? 0,
      subtitle: 'Tenants na plataforma',
      icon: Building2,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      href: '/admin/accounts',
    },
    {
      title: 'Contas ativas',
      value: stats?.activeAccounts ?? 0,
      icon: UserCheck,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      href: '/admin/accounts',
    },
    {
      title: 'Contas suspensas',
      value: stats?.suspendedAccounts ?? 0,
      icon: ShieldAlert,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      href: '/admin/accounts',
    },
    {
      title: 'Total de usuários',
      value: stats?.totalUsers ?? 0,
      subtitle: 'Proprietários e equipe',
      icon: Users,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ];

  return (
    <PageLayout title="Dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpiCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <h2 className="text-base font-semibold text-slate-900 lg:text-lg">Visão geral da plataforma</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Gerencie todos os tenants do Cliente Manager: crie contas, suspenda acessos e acompanhe o
          crescimento global. Use a lista de contas para resetar senhas e editar o status de cada
          revenda.
        </p>
      </div>
    </PageLayout>
  );
};
