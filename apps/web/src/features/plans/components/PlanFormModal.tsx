import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '../api/plans.api';
import { PlanForm } from '../pages/PlanForm';
import { FormModal } from '../../../shared/ui/modals/FormModal';
import { LoadingSpinner } from '../../../shared/ui/layout/LoadingSpinner';
import { showToast } from '../../../shared/utils/toast';
import type { PlanInput } from '@client-manager/shared';

interface PlanFormModalProps {
  isOpen: boolean;
  editId: string | null;
  onClose: () => void;
}

export const PlanFormModal: React.FC<PlanFormModalProps> = ({ isOpen, editId, onClose }) => {
  const queryClient = useQueryClient();
  const formId = editId ? `plan-form-edit-${editId}` : 'plan-form-create';

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plans', editId],
    queryFn: () => plansApi.getById(editId!),
    enabled: isOpen && Boolean(editId),
  });

  const createMutation = useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      showToast.success('Plano criado com sucesso!');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast.error(err.response?.data?.message ?? 'Erro ao criar plano');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; data: PlanInput }) => plansApi.update(args.id, args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      showToast.success('Plano atualizado com sucesso!');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast.error(err.response?.data?.message ?? 'Erro ao atualizar plano');
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editId ? 'Editar plano' : 'Novo plano'}
      size="lg"
      formId={!editId || plan ? formId : undefined}
      isPending={isPending}
      saveLabel={editId ? 'Salvar' : 'Criar'}
    >
      {!editId ? (
        <PlanForm
          key="create"
          formId={formId}
          onSubmit={async (data) => {
            await createMutation.mutateAsync(data);
          }}
          onCancel={onClose}
        />
      ) : isLoading || !plan ? (
        <div className="relative h-32">
          <LoadingSpinner />
        </div>
      ) : (
        <PlanForm
          key={editId}
          formId={formId}
          initialData={plan}
          onSubmit={async (data) => {
            await updateMutation.mutateAsync({ id: editId, data });
          }}
          onCancel={onClose}
        />
      )}
    </FormModal>
  );
};
