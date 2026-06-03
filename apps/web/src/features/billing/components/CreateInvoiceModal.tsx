import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CalendarRange, CreditCard, DollarSign, User } from 'lucide-react';
import { customersApi } from '../../customers/api/customers.api';
import { tenantBillingApi } from '../api/billing.api';
import { FormModal } from '../../../shared/ui/modals/FormModal';
import { FormField } from '../../../shared/ui/forms/FormField';
import { FormInput } from '../../../shared/ui/forms/FormInput';
import { FormSelect } from '../../../shared/ui/forms/FormSelect';
import { formTextareaClass } from '../../../shared/ui/forms/form-styles';
import {
  MANUAL_PAYMENT_METHOD_LABELS,
  MANUAL_PAYMENT_METHOD_VALUES,
  type CreateManualInvoiceInput,
  type ManualPaymentMethodValue,
} from '@client-manager/shared';
import { showToast } from '../../../shared/utils/toast';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const formRef = React.useRef<HTMLFormElement>(null);

  const [customerId, setCustomerId] = React.useState('');
  const [amountReais, setAmountReais] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [billingCycleKey, setBillingCycleKey] = React.useState('');
  const [registerPayment, setRegisterPayment] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<ManualPaymentMethodValue>('pix');
  const [paymentNotes, setPaymentNotes] = React.useState('');

  const { data: customersPage, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers', 'invoice-form'],
    queryFn: () =>
      customersApi.list({ page: 1, pageSize: 100, filter: '', selectableOnly: true }),
    enabled: isOpen,
  });

  React.useEffect(() => {
    if (!isOpen) return;
    setCustomerId('');
    setAmountReais('');
    setDueDate('');
    setBillingCycleKey('');
    setRegisterPayment(false);
    setPaymentMethod('pix');
    setPaymentNotes('');
  }, [isOpen]);

  React.useEffect(() => {
    if (!customersPage?.data.length || customerId) return;
    setCustomerId(customersPage.data[0].id);
  }, [customersPage, customerId]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateManualInvoiceInput) => tenantBillingApi.createManualInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['activations'] });
      showToast.success('Fatura criada');
      onClose();
    },
    onError: (err: Error) => showToast.error(err.message || 'Erro ao criar fatura'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast.error('Selecione um cliente');
      return;
    }
    const parsed = Number(amountReais.replace(',', '.'));
    if (!amountReais.trim()) {
      showToast.error('Informe o valor');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast.error('Informe um valor válido');
      return;
    }
    if (!dueDate) {
      showToast.error('Informe o vencimento');
      return;
    }

    createMutation.mutate({
      customerId,
      amountCents: Math.round(parsed * 100),
      dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
      billingCycleKey: billingCycleKey.trim() || undefined,
      registerPayment,
      paymentMethod: registerPayment ? paymentMethod : undefined,
      paymentNotes: registerPayment ? paymentNotes.trim() || undefined : undefined,
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova fatura"
      size="lg"
      isPending={createMutation.isPending}
      saveLabel="Criar fatura"
      onSave={() => formRef.current?.requestSubmit()}
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <FormSelect
          label="Cliente"
          prefixIcon={User}
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          disabled={loadingCustomers}
        >
          {customersPage?.data.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </FormSelect>

        <FormInput
          label="Valor (R$)"
          prefixIcon={DollarSign}
          type="text"
          inputMode="decimal"
          value={amountReais}
          onChange={(e) => setAmountReais(e.target.value)}
          placeholder="0,00"
        />

        <FormInput
          label="Vencimento"
          prefixIcon={Calendar}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <FormInput
          label="Ciclo (YYYY-MM, opcional)"
          prefixIcon={CalendarRange}
          type="text"
          value={billingCycleKey}
          onChange={(e) => setBillingCycleKey(e.target.value)}
          placeholder="2026-06"
        />

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={registerPayment}
            onChange={(e) => setRegisterPayment(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-form-primary focus:ring-form-primary/30"
          />
          Registrar pagamento antecipado/manual agora
        </label>

        {registerPayment ? (
          <div className="space-y-4 rounded-[10px] bg-form-field/60 p-4">
            <FormSelect
              label="Método"
              prefixIcon={CreditCard}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as ManualPaymentMethodValue)}
            >
              {MANUAL_PAYMENT_METHOD_VALUES.map((value) => (
                <option key={value} value={value}>
                  {MANUAL_PAYMENT_METHOD_LABELS[value]}
                </option>
              ))}
            </FormSelect>
            <FormField label="Observações do pagamento">
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                maxLength={500}
                className={formTextareaClass}
              />
            </FormField>
          </div>
        ) : null}
      </form>
    </FormModal>
  );
};
