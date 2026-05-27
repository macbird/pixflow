import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '../api/plans.api';
import { CardList, EntityCard } from '../../../shared/ui/lists/EntityCard';
import { Plus } from 'lucide-react';
import { Modal } from '../../../shared/ui/modals/Modal';
import { PlanForm } from './PlanForm';
import { PlanInput } from '@iptv-manager/shared';

export const PlansPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

  const createMutation = useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Erro ao criar plano');
    }
  });

  const onSubmit = async (data: PlanInput) => {
    await createMutation.mutateAsync(data);
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Planos</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Novo Plano
        </button>
      </div>

      <CardList>
        {plans?.map((plan: any) => (
          <EntityCard
            key={plan.id}
            title={plan.name}
            subtitle={`${plan.maxConnections} conexões · R$ ${plan.price}`}
            status={plan.status}
            footer={
              <div className="text-xs text-gray-500 uppercase font-bold">
                Ciclo: {plan.billingCycle}
              </div>
            }
          />
        ))}
      </CardList>
      
      {plans?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nenhum plano cadastrado.</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Plano"
      >
        <PlanForm 
          onSubmit={onSubmit} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
};
