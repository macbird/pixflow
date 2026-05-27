import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../api/tags.api';
import { CardList, EntityCard } from '../../../shared/ui/lists/EntityCard';
import { Plus, Tag as TagIcon } from 'lucide-react';
import { Modal } from '../../../shared/ui/modals/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tagSchema, TagInput } from '@iptv-manager/shared';

export const TagsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: tagsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setIsModalOpen(false);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TagInput>({
    resolver: zodResolver(tagSchema),
    defaultValues: { color: '#4F46E5' }
  });

  const onSubmit = async (data: TagInput) => {
    await createMutation.mutateAsync(data);
    reset();
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tags</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nova Tag
        </button>
      </div>

      <CardList>
        {tags?.map((tag: any) => (
          <EntityCard
            key={tag.id}
            title={tag.name}
            footer={
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: tag.color || '#ccc' }}
                ></div>
                <span className="text-sm text-gray-500">{tag.color || 'Sem cor'}</span>
              </div>
            }
          />
        ))}
      </CardList>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Tag"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              {...register('name')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cor (Hex)</label>
            <div className="flex items-center mt-1">
              <input
                type="color"
                {...register('color')}
                className="h-10 w-10 border border-gray-300 rounded-md mr-2"
              />
              <input
                {...register('color')}
                placeholder="#000000"
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            {errors.color && <p className="text-red-500 text-xs mt-1">{errors.color.message}</p>}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
