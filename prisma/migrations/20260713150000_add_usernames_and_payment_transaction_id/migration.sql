ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "payments" ADD COLUMN "providerTransactionId" TEXT;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "payments_providerTransactionId_key" ON "payments"("providerTransactionId");
