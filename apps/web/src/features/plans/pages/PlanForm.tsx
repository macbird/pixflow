import React from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { planSchema, type PlanInput } from '@client-manager/shared';
import { showToast } from '../../../shared/utils/toast';
import { CurrencyInput } from '../../../shared/ui/forms/CurrencyInput';
import { Banknote, CalendarClock, Package, ToggleLeft } from 'lucide-react';
import { FormField } from '../../../shared/ui/forms/FormField';
import { FormInput } from '../../../shared/ui/forms/FormInput';
import { FormNumberStepper } from '../../../shared/ui/forms/FormNumberStepper';
import { FormSelect } from '../../../shared/ui/forms/FormSelect';
import {
  formInputClass,
  formInputPaddingWithPrefix,
  formRootClass,
  formSectionClass,
  formTextareaClass,
} from '../../../shared/ui/forms/form-styles';

interface PlanFormProps {
  formId: string;
  onSubmit: (data: PlanInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<PlanInput>;
}

function sanitizePlanForForm(plan: Partial<PlanInput>): PlanInput {
  return {
    name: plan.name ?? '',
    description: plan.description ?? '',
    price: Number(plan.price) || 0,
    billingCycle: plan.billingCycle ?? 'monthly',
    maxConnections: Number(plan.maxConnections) || 1,
    extraConnectionPrice:
      plan.extraConnectionPrice != null ? Number(plan.extraConnectionPrice) : 0,
    status: plan.status ?? 'active',
  };
}

export const PlanForm = React.forwardRef<HTMLFormElement, PlanFormProps>(
  ({ formId, onSubmit, onCancel, initialData }, ref) => {
    const {
      register,
      control,
      handleSubmit,
      reset,
      formState: { errors },
    } = useForm<PlanInput>({
      resolver: zodResolver(planSchema),
      defaultValues: {
        billingCycle: 'monthly',
        maxConnections: 1,
        status: 'active',
        name: '',
        description: '',
        price: 0,
        extraConnectionPrice: 0,
      },
    });

    React.useEffect(() => {
      if (initialData) {
        reset(sanitizePlanForForm(initialData));
      }
    }, [initialData, reset]);

    const onSubmitWrapper = async (data: PlanInput) => {
      await onSubmit({
        ...data,
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        extraConnectionPrice: data.extraConnectionPrice ?? 0,
      });
    };

    const onInvalid = (fieldErrors: FieldErrors<PlanInput>) => {
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
          prefixIcon={Package}
          error={errors.name?.message}
          placeholder="Nome do plano"
          {...register('name')}
        />

        <FormField label="Descrição">
          <textarea {...register('description')} className={formTextareaClass} rows={3} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Preço" prefixIcon={Banknote} error={errors.price?.message}>
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  className={`${formInputClass} ${formInputPaddingWithPrefix}`}
                  placeholder="R$ 0,00"
                />
              )}
            />
          </FormField>

          <FormSelect
            label="Ciclo"
            prefixIcon={CalendarClock}
            error={errors.billingCycle?.message}
            {...register('billingCycle')}
          >
            <option value="monthly">Mensal</option>
            <option value="quarterly">Trimestral</option>
            <option value="yearly">Anual</option>
          </FormSelect>

          <Controller
            name="maxConnections"
            control={control}
            render={({ field }) => (
              <FormNumberStepper
                label="Conexões"
                min={1}
                error={errors.maxConnections?.message}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
          <FormSelect label="Status" prefixIcon={ToggleLeft} {...register('status')}>
            <option value="active">Ativo</option>
            <option value="inactive">Desativado</option>
          </FormSelect>
        </div>
      </form>
    );
  },
);

PlanForm.displayName = 'PlanForm';
