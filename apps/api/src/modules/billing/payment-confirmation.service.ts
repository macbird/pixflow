import { prisma } from '../../core/database';
import type { BillingScope } from '@prisma/client';
import { ActivationsService } from '../activations/activations.service';
import { PaymentReceivedNotificationService } from './payment-received-notification.service';

const activationsService = new ActivationsService();
const paymentReceivedNotification = new PaymentReceivedNotificationService();

export interface ConfirmPaymentInput {
  invoiceId: string;
  tenantId?: string;
  scope: BillingScope;
  amountCents: number;
  method: string;
  source?: string;
  notes?: string;
  providerPaymentId?: string;
  paidAt?: Date;
}

/**
 * Registers a full payment, marks the invoice as paid, and creates pending activations
 * for tenant-scope customer invoices.
 */
export class PaymentConfirmationService {
  /**
   * Confirms payment for an invoice (manual or webhook entry point).
   */
  async confirm(input: ConfirmPaymentInput) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: input.invoiceId,
        scope: input.scope,
        ...(input.tenantId ? { accountId: input.tenantId } : {}),
      },
      include: { payments: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'canceled') {
      throw new Error('Invoice canceled');
    }

    if (input.amountCents !== invoice.amountCents) {
      throw new Error('Partial payments are not supported');
    }

    const paidAt = input.paidAt ?? new Date();

    if (invoice.status === 'paid') {
      const existingPayment = [...invoice.payments].sort(
        (a, b) => b.paidAt.getTime() - a.paidAt.getTime(),
      )[0];
      if (!existingPayment) {
        throw new Error('Invoice already paid');
      }

      if (invoice.scope === 'tenant' && invoice.customerId) {
        const activationTasks = await activationsService.createTasksForPayment(
          {
            tenantId: invoice.accountId,
            customerId: invoice.customerId,
            paymentId: existingPayment.id,
            invoiceId: invoice.id,
            paidAt: existingPayment.paidAt,
          },
        );

        return {
          paymentId: existingPayment.id,
          invoiceId: invoice.id,
          activationTasksCreated: activationTasks.length,
          activationTasks,
          idempotent: true,
        };
      }

      throw new Error('Invoice already paid');
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amountCents: input.amountCents,
          method: input.method,
          source: input.source ?? 'manual',
          notes: input.notes?.trim() || null,
          providerPaymentId: input.providerPaymentId ?? null,
          paidAt,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'paid', paidAt },
      });

      let activationTasks: Awaited<ReturnType<ActivationsService['createTasksForPayment']>> = [];

      if (invoice.scope === 'tenant' && invoice.customerId) {
        activationTasks = await activationsService.createTasksForPayment(
          {
            tenantId: invoice.accountId,
            customerId: invoice.customerId,
            paymentId: payment.id,
            invoiceId: invoice.id,
            paidAt,
          },
          tx,
        );
      }

      const result = {
        paymentId: payment.id,
        invoiceId: invoice.id,
        activationTasksCreated: activationTasks.length,
        activationTasks,
        idempotent: false as const,
      };

      void paymentReceivedNotification
        .notifyTenant({
          invoiceId: invoice.id,
          paymentId: payment.id,
          method: input.method,
          source: input.source,
          activationTasksCreated: activationTasks.length,
        })
        .catch((error) => {
          console.warn(
            '[payment-confirmation] WhatsApp notify failed',
            error instanceof Error ? error.message : error,
          );
        });

      return result;
    });
  }
}
