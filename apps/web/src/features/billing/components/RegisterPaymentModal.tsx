import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CreditCard, FileText } from 'lucide-react';
import { FormModal } from '../../../shared/ui/modals/FormModal';
import { FormField } from '../../../shared/ui/forms/FormField';
import { FormInput } from '../../../shared/ui/forms/FormInput';
import { FormSelect } from '../../../shared/ui/forms/FormSelect';
import { formTextareaClass } from '../../../shared/ui/forms/form-styles';
import { tenantBillingApi } from '../api/billing.api';
import { formatCents } from '../../../shared/ui/billing/format-billing';
import {
  MANUAL_PAYMENT_METHOD_LABELS,
  MANUAL_PAYMENT_METHOD_VALUES,
  type ManualPaymentMethodValue,
  type RegisterPaymentInput,
} from '@client-manager/shared';

interface RegisterPaymentModalProps {
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (invoiceId: string, payload: RegisterPaymentInput) => void;
}

function todayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  isPending,
  onClose,
  onSubmit,
}) => {
  const [invoiceId, setInvoiceId] = React.useState('');
  const [method, setMethod] = React.useState<ManualPaymentMethodValue>('pix');
  const [notes, setNotes] = React.useState('');
  const [paidAt, setPaidAt] = React.useState('');

  const { data: openInvoices, isLoading } = useQuery({
    queryKey: ['invoices', 'open-for-payment'],
    queryFn: () =>
      tenantBillingApi.listInvoices({
        page: 1,
        pageSize: 100,
        filter: '',
        filters: { status: 'open' },
      }),
    enabled: isOpen,
  });

  React.useEffect(() => {
    if (!isOpen) return;
    setInvoiceId('');
    setMethod('pix');
    setNotes('');
    setPaidAt(todayDateInputValue());
  }, [isOpen]);

  React.useEffect(() => {
    if (!openInvoices?.data.length || invoiceId) return;
    setInvoiceId(openInvoices.data[0].id);
  }, [openInvoices, invoiceId]);

  const selectedInvoice = openInvoices?.data.find((invoice) => invoice.id === invoiceId);

  const handleSave = () => {
    if (!invoiceId) return;
    onSubmit(invoiceId, {
      method,
      notes: notes.trim() || undefined,
      paidAt: new Date(`${paidAt || todayDateInputValue()}T12:00:00`).toISOString(),
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar pagamento"
      size="md"
      isPending={isPending}
      saveLabel="Registrar pagamento"
      pendingLabel="Registrando..."
      saveDisabled={!invoiceId || !openInvoices?.data.length}
      onSave={handleSave}
    >
      {isLoading ? (
        <p className="text-sm text-slate-500">Carregando faturas em aberto...</p>
      ) : !openInvoices?.data.length ? (
        <p className="text-sm text-slate-500">
          Nenhuma fatura em aberto. Crie uma fatura antes de registrar o pagamento.
        </p>
      ) : (
        <div className="space-y-4">
          <FormSelect
            label="Fatura"
            prefixIcon={FileText}
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
          >
            {openInvoices.data.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.customer?.name ?? 'Cliente'} · {invoice.billingCycleKey} ·{' '}
                {formatCents(invoice.amountCents)}
              </option>
            ))}
          </FormSelect>

          {selectedInvoice ? (
            <p className="text-xs text-slate-500">
              Vencimento: {new Date(selectedInvoice.dueDate).toLocaleDateString('pt-BR')}
            </p>
          ) : null}

          <FormSelect
            label="Método"
            prefixIcon={CreditCard}
            value={method}
            onChange={(e) => setMethod(e.target.value as ManualPaymentMethodValue)}
          >
            {MANUAL_PAYMENT_METHOD_VALUES.map((value) => (
              <option key={value} value={value}>
                {MANUAL_PAYMENT_METHOD_LABELS[value]}
              </option>
            ))}
          </FormSelect>

          <FormInput
            label="Data do pagamento"
            prefixIcon={Calendar}
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />

          <FormField label="Observações (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className={formTextareaClass}
            />
          </FormField>
        </div>
      )}
    </FormModal>
  );
};
