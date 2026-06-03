-- Add next SaaS billing due date for platform invoice generation
ALTER TABLE "account_subscriptions" ADD COLUMN "nextDueDate" TIMESTAMP(3);

UPDATE "account_subscriptions"
SET "nextDueDate" = (
  CASE
    WHEN EXTRACT(DAY FROM CURRENT_TIMESTAMP) <= LEAST("dueDay", 28)
    THEN DATE_TRUNC('month', CURRENT_TIMESTAMP)
      + ((LEAST("dueDay", 28) - 1) || ' days')::INTERVAL
    ELSE DATE_TRUNC('month', CURRENT_TIMESTAMP)
      + INTERVAL '1 month'
      + ((LEAST("dueDay", 28) - 1) || ' days')::INTERVAL
  END
);

ALTER TABLE "account_subscriptions" ALTER COLUMN "nextDueDate" SET NOT NULL;
