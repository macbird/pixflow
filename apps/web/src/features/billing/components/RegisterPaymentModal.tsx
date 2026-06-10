import React from 'react';
import { Calendar, CreditCard, FileText } from 'lucide-react';
import { FormModal } from '../../../shared/ui/modals/FormModal';
import { FormField } from '../../../shared/ui/forms/FormField';
import { FormInput } from '../../../shared/ui/forms/FormInput';
import { FormSelect } from '../../../shared/ui/forms/FormSelect';
import { AsyncSearchSelect } from '../../../shared/ui/forms/AsyncSearchSelect';
import type { AsyncSearchSelectOption } from '../../../shared/ui/forms/AsyncSearchSelect';
import { formTextareaClass } from '../../../shared/ui/forms/form-styles';
import { tenantBillingApi } from '../api/billing.api';
import { formatCents } from '../../../shared/ui/billing/format-billing';
import {
  BILLING_INVOICE_STATUS_LABELS,
  MANUAL_PAYMENT_METHOD_LABELS,
  MANUAL_PAYMENT_METHOD_VALUES,
  type BillingInvoiceStatusValue,
  type InvoiceListItem,
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

function mapPayableInvoicesToSearchOptions(invoices: InvoiceListItem[]): AsyncSearchSelectOption[] {
  return invoices.map((invoice) => {
    const customerName = invoice.customer?.name ?? 'Sem cliente';
    const statusLabel =
      BILLING_INVOICE_STATUS_LABELS[invoice.status as BillingInvoiceStatusValue] ?? invoice.status;
    const dueLabel = new Date(invoice.dueDate).toLocaleDateString('pt-BR');

    return {
      value: invoice.id,
      label: `${customerName} · ${invoice.billingCycleKey} · ${formatCents(invoice.amountCents)}`,
      hint: `${statusLabel} · venc. ${dueLabel}`,
      meta: { invoice },
    };
  });
}

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  isPending,
  onClose,
  onSubmit,
}) => {
  const [invoiceId, setInvoiceId] = React.useState('');
  const [invoiceLabel, setInvoiceLabel] = React.useState('');
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceListItem | null>(null);
  const [method, setMethod] = React.useState<ManualPaymentMethodValue>('pix');
  const [notes, setNotes] = React.useState('');
  const [paidAt, setPaidAt] = React.useState('');

  const searchPayableInvoices = React.useCallback(async (query: string) => {
    const page = await tenantBillingApi.listInvoices({
      page: 1,
      pageSize: 20,
      filter: query,
      payableOnly: true,
    });
    return mapPayableInvoicesToSearchOptions(page.data);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    setInvoiceId('');
    setInvoiceLabel('');
    setSelectedInvoice(null);
    setMethod('pix');
    setNotes('');
    setPaidAt(todayDateInputValue());
  }, [isOpen]);

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
      saveDisabled={!invoiceId}
      onSave={handleSave}
    >
      <div className="space-y-4">
        <AsyncSearchSelect
          label="Fatura"
          prefixIcon={FileText}
          value={invoiceId}
          selectedLabel={invoiceLabel}
          onChange={(id, option) => {
            setInvoiceId(id);
            setInvoiceLabel(option?.label ?? '');
            setSelectedInvoice((option?.meta?.invoice as InvoiceListItem | undefined) ?? null);
          }}
          onSearch={searchPayableInvoices}
          placeholder="Buscar fatura por nome do cliente, ciclo..."
          emptyMessage="Nenhuma fatura pendente encontrada"
          hint="Somente faturas em aberto ou vencidas"
        />

        {selectedInvoice ? (
          <p className="text-xs text-slate-500">
            Cliente: {selectedInvoice.customer?.name ?? '—'} · Vencimento:{' '}
            {new Date(selectedInvoice.dueDate).toLocaleDateString('pt-BR')} ·{' '}
            {BILLING_INVOICE_STATUS_LABELS[selectedInvoice.status as BillingInvoiceStatusValue] ??
              selectedInvoice.status}
          </p>
        ) : null}

        {invoiceId ? (
          <>
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
          </>
        ) : null}
      </div>
    </FormModal>
  );
};
