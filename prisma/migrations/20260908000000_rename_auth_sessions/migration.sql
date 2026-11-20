-- Đổi tên tại chỗ để bảo toàn toàn bộ hash, phiên, khóa ngoại và thời hạn hiện có.
BEGIN;
ALTER TABLE "refresh_tokens" RENAME TO "auth_sessions";
ALTER TABLE "auth_sessions" RENAME CONSTRAINT "refresh_tokens_pkey" TO "auth_sessions_pkey";
ALTER TABLE "auth_sessions" RENAME CONSTRAINT "refresh_tokens_userId_fkey" TO "auth_sessions_userId_fkey";
ALTER INDEX "refresh_tokens_tokenHash_key" RENAME TO "auth_sessions_tokenHash_key";
ALTER INDEX "refresh_tokens_userId_idx" RENAME TO "auth_sessions_userId_idx";
ALTER INDEX "refresh_tokens_expiresAt_idx" RENAME TO "auth_sessions_expiresAt_idx";
ALTER TABLE "auth_sessions" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
COMMIT;
