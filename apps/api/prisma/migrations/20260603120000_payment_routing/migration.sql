-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "paymentProvider" "PaymentProviderType";

-- CreateTable
CREATE TABLE "tenant_payment_credentials" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "apiKey" TEXT,
    "webhookToken" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_payment_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_payment_routing_rules" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "minAmountCents" INTEGER NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_payment_routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_payment_credentials_accountId_provider_key" ON "tenant_payment_credentials"("accountId", "provider");

-- CreateIndex
CREATE INDEX "tenant_payment_routing_rules_accountId_minAmountCents_idx" ON "tenant_payment_routing_rules"("accountId", "minAmountCents");

-- AddForeignKey
ALTER TABLE "tenant_payment_credentials" ADD CONSTRAINT "tenant_payment_credentials_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payment_routing_rules" ADD CONSTRAINT "tenant_payment_routing_rules_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy tenant_payment_config into tenant_payment_credentials
INSERT INTO "tenant_payment_credentials" ("id", "accountId", "provider", "apiKey", "webhookToken", "active", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    t."accountId",
    t."provider",
    t."apiKey",
    t."webhookToken",
    true,
    NOW(),
    NOW()
FROM "tenant_payment_config" t
WHERE NOT EXISTS (
    SELECT 1 FROM "tenant_payment_credentials" c
    WHERE c."accountId" = t."accountId" AND c."provider" = t."provider"
);
