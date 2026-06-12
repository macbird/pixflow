-- AlterTable
ALTER TABLE "tenant_billing_automation_config"
ADD COLUMN "overdueRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "overdueReminderDays" INTEGER[] DEFAULT ARRAY[1, 7, 15],
ADD COLUMN "overdueReminderFailureGraceDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "overdueMessageTemplates" JSONB;

-- AlterTable
ALTER TABLE "invoice_charge_deliveries"
ADD COLUMN "windowDaysAfterDue" INTEGER;

-- CreateIndex
CREATE INDEX "invoice_charge_deliveries_invoiceId_source_windowDaysAfterDue_idx"
ON "invoice_charge_deliveries"("invoiceId", "source", "windowDaysAfterDue");

-- Partial unique index: one successful overdue reminder per invoice/window
CREATE UNIQUE INDEX "invoice_charge_deliveries_overdue_success_unique"
ON "invoice_charge_deliveries"("invoiceId", "source", "windowDaysAfterDue")
WHERE "source" = 'automation_overdue' AND "success" = true;
