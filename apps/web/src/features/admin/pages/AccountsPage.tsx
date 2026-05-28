import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '../api/admin.api';
import { CardList, EntityCard } from '../../../shared/ui/lists/EntityCard';
import { showToast } from '../../../shared/utils/toast';
import { Users, Plus } from 'lucide-react';
import { BottomSheet } from '../../../shared/ui/modals/BottomSheet';
import { useNavigate, Link } from 'react-router-dom';

export const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

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
        <h1 className="text-2xl font-bold">Gerenciar Contas</h1>
        <Link 
          to="/admin/accounts/new"
          className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
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
              <button 
                onClick={() => toggleMutation.mutate({ id: account.id, status: account.status === 'active' ? 'suspended' : 'active' })}
                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
              >
                {account.status === 'active' ? 'Suspender' : 'Ativar'}
              </button>
            }
            onEdit={() => navigate(`/admin/accounts/${account.id}/edit`)}
            onDelete={() => setDeleteId(account.id)}
          />
        ))}
      </CardList>

      {accounts?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nenhuma conta cadastrada.</p>
        </div>
      )}

      <BottomSheet 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Conta"
        description="Tem certeza que deseja excluir esta conta? Esta ação não poderá ser desfeita."
      />
    </div>
  );
};
