import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serversApi } from '../api/servers.api';
import { CardList, EntityCard } from '../../../shared/ui/lists/EntityCard';
import { Plus, ExternalLink } from 'lucide-react';
import { Modal } from '../../../shared/ui/modals/Modal';
import { ServerForm } from './ServerForm';
import { ServerInput } from '@iptv-manager/shared';

export const ServersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { data: servers, isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: serversApi.list,
  });

  const createMutation = useMutation({
    mutationFn: serversApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Erro ao criar servidor');
    }
  });

  const onSubmit = async (data: ServerInput) => {
    await createMutation.mutateAsync(data);
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Servidores</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Novo Servidor
        </button>
      </div>

      <CardList>
        {servers?.map((server: { id: string; name: string; panelUrl: string; status: string }) => (
          <EntityCard
            key={server.id}
            title={server.name}
            subtitle={server.panelUrl}
            status={server.status}
            footer={
              <a 
                href={server.panelUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center text-indigo-600 hover:text-indigo-500 font-medium text-sm"
              >
                Abrir Painel <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            }
          />
        ))}
      </CardList>

      {servers?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nenhum servidor cadastrado.</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Servidor"
      >
        <ServerForm 
          onSubmit={onSubmit} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
};
