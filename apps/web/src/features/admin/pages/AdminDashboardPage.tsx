import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminDashboardApi } from '../api/admin.api';
import { Users, Building2, UserCheck, ShieldAlert } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminDashboardApi.getStats,
  });

  if (isLoading) return <div>Carregando métricas...</div>;

  const cards = [
    {
      title: 'Total de Contas',
      value: stats?.totalAccounts || 0,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Contas Ativas',
      value: stats?.activeAccounts || 0,
      icon: UserCheck,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Contas Suspensas',
      value: stats?.suspendedAccounts || 0,
      icon: ShieldAlert,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    {
      title: 'Total de Usuários',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard Admin</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.bg} p-3 rounded-full`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Visão Geral da Plataforma</h2>
        <p className="text-slate-600">
          Este painel permite gerenciar todos os tenants da plataforma IPTV Manager. 
          Você pode criar novas contas, suspender acessos e monitorar o crescimento global.
        </p>
      </div>
    </div>
  );
};
