import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { showToast } from '../../../shared/utils/toast';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { LoadingSpinner } from '../../../shared/ui/layout/LoadingSpinner';
import { UserProfileForm } from './UserProfileForm';

export const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formRef = React.useRef<HTMLFormElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  });

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      showToast.success('Perfil atualizado com sucesso!');
    },
    onError: () => {
      showToast.error('Erro ao atualizar perfil');
    },
  });

  if (isLoading) {
    return (
      <div className="relative h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <PageLayout
      title="Meu Perfil"
      footer={
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={updateMutation.isPending}
            onClick={() => formRef.current?.requestSubmit()}
            className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      <UserProfileForm
        ref={formRef}
        initialData={profile}
        onSubmit={async (data) => {
          await updateMutation.mutateAsync(data);
        }}
      />
    </PageLayout>
  );
};
