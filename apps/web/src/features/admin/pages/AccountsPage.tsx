import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '../api/admin.api';
import { CardList, EntityCard } from '../../../shared/ui/lists/EntityCard';
import { showToast } from '../../../shared/utils/toast';
import { Users, Plus, Key } from 'lucide-react';
import { BottomSheet } from '../../../shared/ui/modals/BottomSheet';
import { useNavigate, Link } from 'react-router-dom';

import { ResetPasswordModal } from './ResetPasswordModal';

export const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [resetUser, setResetUser] = React.useState<{ id: string, name: string, email: string } | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: tenantsApi.list,
  });

  const toggleMutation = useMutation({
    mutationFn: (args: { id: string, status: 'active' | 'suspended' }) => tenantsApi.toggleStatus(args.id, args.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast.success('Status atualizado');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.toggleStatus(id, 'suspended'),
    onSuccess: () => {
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast.success('Conta suspensa');
    }
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gerenciar Contas</h1>
        <Link 
          to="/admin/accounts/new"
          className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nova Conta
        </Link>
      </div>
      
      <CardList>
        {accounts?.map((account: any) => (
          <EntityCard
            key={account.id}
            icon={<Users className="h-5 w-5" />}
            title={account.name}
            status={account.status}
            footer={
              <div className="w-full space-y-4">
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Usuários do Tenant</p>
                  {account.users?.map((user: any) => (
                    <div key={user.id} className="flex justify-between items-center text-sm mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="overflow-hidden">
                        <p className="font-semibold text-slate-700 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => setResetUser({ id: user.id, name: user.name, email: user.email })}
                        className="ml-2 p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                        title="Resetar Senha"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button 
                    onClick={() => toggleMutation.mutate({ id: account.id, status: account.status === 'active' ? 'suspended' : 'active' })}
                    className={`text-sm font-semibold transition-colors ${account.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                  >
                    {account.status === 'active' ? 'Suspender Conta' : 'Reativar Conta'}
                  </button>
                </div>
              </div>
            }
            onEdit={() => navigate(`/admin/accounts/${account.id}/edit`)}
            onDelete={() => setDeleteId(account.id)}
          />
        ))}
      </CardList>

      <ResetPasswordModal 
        userId={resetUser?.id || null}
        userName={resetUser?.name || null}
        userEmail={resetUser?.email || null}
        onClose={() => setResetUser(null)}
        onSuccess={() => {}}
      />

      {accounts?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500">Nenhuma conta cadastrada.</p>
        </div>
      )}

      <BottomSheet 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Suspender Conta"
        description="Tem certeza que deseja suspender esta conta? O revendedor perderá o acesso imediatamente."
      />
    </div>
  );
};
