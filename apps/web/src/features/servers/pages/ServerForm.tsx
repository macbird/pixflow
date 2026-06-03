import React from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { serverSchema, type ServerInput } from '@client-manager/shared';
import { TagInputChips } from '../../../shared/ui/forms/TagInputChips';
import { FormPasswordInput } from '../../../shared/ui/forms/FormPasswordInput';
import type { TagDto } from '../../tags/api/tags.api';
import { showToast } from '../../../shared/utils/toast';
import { Globe, Server, ToggleLeft, User } from 'lucide-react';
import { FormField } from '../../../shared/ui/forms/FormField';
import { FormInput } from '../../../shared/ui/forms/FormInput';
import { FormNumberStepper } from '../../../shared/ui/forms/FormNumberStepper';
import { FormSelect } from '../../../shared/ui/forms/FormSelect';
import { formRootClass, formSectionClass, formTextareaClass } from '../../../shared/ui/forms/form-styles';

const serverFormSchema = serverSchema.extend({
  tags: z.array(z.custom<TagDto>()).default([]),
  panelUsername: z.string().optional(),
  panelPassword: z.string().optional(),
});

type ServerFormValues = z.infer<typeof serverFormSchema>;

export type ServerFormPayload = ServerInput & { tagIds?: string[] };

type ServerDetail = Partial<ServerFormValues & { tags?: TagDto[]; id?: string }>;

interface ServerFormProps {
  formId: string;
  onSubmit: (data: ServerFormPayload) => Promise<void>;
  onCancel: () => void;
  initialData?: ServerDetail;
}

const emptyFormValues: ServerFormValues = {
  status: 'active',
  tags: [],
  name: '',
  panelUrl: '',
  panelUsername: '',
  panelPassword: '',
  panelNotes: '',
};

function sanitizeServerForForm(server: ServerDetail): ServerFormValues {
  return {
    ...emptyFormValues,
    name: server.name ?? '',
    panelUrl: server.panelUrl ?? '',
    panelUsername: server.panelUsername ?? '',
    panelPassword: server.panelPassword ?? '',
    panelNotes: server.panelNotes ?? '',
    maxConnections:
      server.maxConnections != null && Number.isFinite(Number(server.maxConnections))
        ? Number(server.maxConnections)
        : undefined,
    status: server.status ?? 'active',
    tags: server.tags ?? [],
  };
}

function toPayload(data: ServerFormValues, keepPasswordIfBlank: boolean): ServerFormPayload {
  const { tags, panelPassword, panelUsername, ...serverData } = data;
  const trimmedUsername = panelUsername?.trim() ?? '';
  const payload: ServerFormPayload = {
    ...serverData,
    name: serverData.name.trim(),
    panelNotes: serverData.panelNotes?.trim() || undefined,
    tagIds: tags.map((tag) => tag.id),
  };

  payload.panelUsername = trimmedUsername.length > 0 ? trimmedUsername : undefined;

  if (panelPassword && panelPassword.length > 0) {
    payload.panelPassword = panelPassword;
  } else if (!keepPasswordIfBlank) {
    payload.panelPassword = '';
  }

  return payload;
}

export const ServerForm = React.forwardRef<HTMLFormElement, ServerFormProps>(
  ({ formId, onSubmit, onCancel, initialData }, ref) => {
    const isEditing = Boolean(initialData?.id);
    const formValues = React.useMemo(
      () => (initialData ? sanitizeServerForForm(initialData) : undefined),
      [initialData],
    );

    const {
      register,
      handleSubmit,
      control,
      formState: { errors },
    } = useForm<ServerFormValues>({
      resolver: zodResolver(serverFormSchema),
      defaultValues: emptyFormValues,
      values: formValues,
    });

    const onSubmitWrapper = async (data: ServerFormValues) => {
      await onSubmit(toPayload(data, isEditing));
    };

    const onInvalid = (fieldErrors: FieldErrors<ServerFormValues>) => {
      const firstError = Object.values(fieldErrors)[0];
      showToast.error(
        firstError?.message?.toString() ?? 'Verifique os campos do formulário.',
      );
    };

    return (
      <form
        ref={ref}
        id={formId}
        noValidate
        onSubmit={handleSubmit(onSubmitWrapper, onInvalid)}
        className={`${formSectionClass} ${formRootClass}`}
      >
        <FormInput
          label="Nome"
          prefixIcon={Server}
          error={errors.name?.message}
          placeholder="Nome do servidor"
          {...register('name')}
        />

        <FormInput
          label="URL do painel"
          type="url"
          prefixIcon={Globe}
          error={errors.panelUrl?.message}
          placeholder="https://exemplo.com"
          {...register('panelUrl')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="panelUsername"
            control={control}
            render={({ field }) => (
              <FormInput
                label="Usuário do painel"
                prefixIcon={User}
                error={errors.panelUsername?.message}
                ref={field.ref}
                name={field.name}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                autoComplete="off"
                onFocus={(e) => e.target.select()}
              />
            )}
          />

          <Controller
            name="panelPassword"
            control={control}
            render={({ field }) => (
              <FormPasswordInput
                label="Senha do painel"
                placeholder={isEditing ? 'Deixe em branco para manter' : 'Senha de acesso'}
                error={errors.panelPassword?.message}
                name={field.name}
                ref={field.ref}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>

        <FormField label="Notas do painel">
          <textarea {...register('panelNotes')} rows={3} className={formTextareaClass} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="maxConnections"
            control={control}
            render={({ field }) => (
              <FormNumberStepper
                label="Conexões máx."
                min={1}
                error={errors.maxConnections?.message}
                name={field.name}
                value={field.value ?? 1}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          <FormSelect label="Status" prefixIcon={ToggleLeft} error={errors.status?.message} {...register('status')}>
            <option value="active">Ativo</option>
            <option value="maintenance">Manutenção</option>
            <option value="full">Lotado</option>
            <option value="inactive">Desativado</option>
          </FormSelect>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagInputChips
                scope="server"
                label="Tags"
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </form>
    );
  },
);

ServerForm.displayName = 'ServerForm';
