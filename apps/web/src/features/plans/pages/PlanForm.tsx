import React from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { planSchema, type PlanInput } from '@client-manager/shared';
import { showToast } from '../../../shared/utils/toast';
import { CurrencyInput } from '../../../shared/ui/forms/CurrencyInput';
import { formInputClass, formLabelClass, formSelectClass, formTextareaClass } from '../../../shared/ui/forms/form-styles';

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
        className="space-y-4"
      >
        <div>
          <label className="block">
            <span className={formLabelClass}>Nome</span>
            <input {...register('name')} className={formInputClass} />
          </label>
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block">
            <span className={formLabelClass}>Descrição</span>
            <textarea {...register('description')} className={formTextareaClass} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block">
              <span className={formLabelClass}>Preço</span>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className={formInputClass}
                    placeholder="R$ 0,00"
                  />
                )}
              />
            </label>
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
          </div>

          <div>
            <label className="block">
              <span className={formLabelClass}>Ciclo</span>
              <select {...register('billingCycle')} className={formSelectClass}>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </label>
            {errors.billingCycle && (
              <p className="text-red-500 text-xs mt-1">{errors.billingCycle.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block">
              <span className={formLabelClass}>Conexões</span>
              <input
                type="number"
                {...register('maxConnections', { valueAsNumber: true })}
                className={formInputClass}
                onFocus={(e) => e.target.select()}
              />
            </label>
            {errors.maxConnections && (
              <p className="text-red-500 text-xs mt-1">{errors.maxConnections.message}</p>
            )}
          </div>

          <div>
            <label className="block">
              <span className={formLabelClass}>Status</span>
              <select {...register('status')} className={formSelectClass}>
                <option value="active">Ativo</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>
          </div>
        </div>
      </form>
    );
  },
);

PlanForm.displayName = 'PlanForm';
