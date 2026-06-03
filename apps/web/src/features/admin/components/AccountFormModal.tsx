import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '../api/admin.api';
import { AccountForm, type AccountCreateInput, type AccountEditInput } from '../pages/AccountForm';
import { FormModal } from '../../../shared/ui/modals/FormModal';
import { LoadingSpinner } from '../../../shared/ui/layout/LoadingSpinner';
import { showToast } from '../../../shared/utils/toast';

interface AccountFormModalProps {
  isOpen: boolean;
  editId: string | null;
  onClose: () => void;
}

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  editId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const formId = editId ? `account-form-edit-${editId}` : 'account-form-create';

  const { data: account, isLoading } = useQuery({
    queryKey: ['accounts', editId],
    queryFn: () => tenantsApi.getById(editId!),
    enabled: isOpen && Boolean(editId),
  });

  const createMutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast.success('Conta criada com sucesso!');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast.error(err.response?.data?.message ?? 'Erro ao criar conta');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; data: AccountEditInput }) =>
      tenantsApi.update(args.id, args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast.success('Conta atualizada com sucesso!');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast.error(err.response?.data?.message ?? 'Erro ao atualizar conta');
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editId ? 'Editar conta' : 'Nova conta'}
      size="xl"
      formId={!editId || account ? formId : undefined}
      isPending={isPending}
      saveLabel={editId ? 'Salvar' : 'Criar'}
    >
      {!editId ? (
        <AccountForm
          key="create"
          formId={formId}
          mode="create"
          onSubmit={async (data) => {
            await createMutation.mutateAsync(data as AccountCreateInput);
          }}
        />
      ) : isLoading || !account ? (
        <div className="relative h-32">
          <LoadingSpinner />
        </div>
      ) : (
        <AccountForm
          key={editId}
          formId={formId}
          mode="edit"
          initialData={account}
          onSubmit={async (data) => {
            await updateMutation.mutateAsync({ id: editId, data });
          }}
        />
      )}
    </FormModal>
  );
};
