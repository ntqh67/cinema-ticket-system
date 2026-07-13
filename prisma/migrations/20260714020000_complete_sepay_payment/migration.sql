-- Hoàn thiện trạng thái thanh toán và log webhook cho luồng SePay.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REVIEW_REQUIRED';

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "payments_provider_providerRef_idx"
  ON "payments"("provider", "providerRef");

CREATE INDEX IF NOT EXISTS "payments_provider_status_idx"
  ON "payments"("provider", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_providerRef_unique"
  ON "payments"("provider", "providerRef")
  WHERE "providerRef" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "transactionId" TEXT,
  "providerRef" TEXT,
  "amount" DECIMAL(10,2),
  "direction" TEXT,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "errorMessage" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_webhook_events_provider_transactionId_idx"
  ON "payment_webhook_events"("provider", "transactionId");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_provider_providerRef_idx"
  ON "payment_webhook_events"("provider", "providerRef");

CREATE INDEX IF NOT EXISTS "payment_webhook_events_status_receivedAt_idx"
  ON "payment_webhook_events"("status", "receivedAt");
